/**
 * VaultService — Locks gold for a duration, returns it with a bonus.
 *
 * Two actions in the registry at different times:
 *   'vault.lock'    — visible when vault is idle; triggers lock()
 *   'vault.collect' — visible only when timer has expired; free (cost 0)
 *
 * The lock action's cost is display-only. The actual amount locked is decided
 * by the service (e.g. 50% of current gold). The service handles the spend.
 */
import { EventService, Service, OnServiceReadyEvent, service, subscribe } from 'meta/worlds';
import { BASE_VAULT_DURATION, BASE_VAULT_BONUS } from '../Constants';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { ProgressionService } from './ProgressionService';

const FEATURE_ID = 'vault';

const DURATION_UPGRADES = [
  { id: 'vault.duration.1', label: 'Quick Lock I',  detail: '-15s vault duration', cost: 1_000 },
  { id: 'vault.duration.2', label: 'Quick Lock II', detail: '-15s vault duration', cost: 3_000 },
  { id: 'vault.duration.3', label: 'Quick Lock III',detail: '-15s vault duration', cost: 7_500 },
] as const;

const BONUS_UPGRADES = [
  { id: 'vault.bonus.1', label: 'Vault Bonus I',  detail: '+20% vault return', cost: 2_500  },
  { id: 'vault.bonus.2', label: 'Vault Bonus II', detail: '+20% vault return', cost: 7_000  },
  { id: 'vault.bonus.3', label: 'Vault Bonus III',detail: '+20% vault return', cost: 18_000 },
] as const;

@service()
export class VaultService extends Service {

  private _duration       : number  = BASE_VAULT_DURATION;
  private _bonusMultiplier: number  = BASE_VAULT_BONUS;

  private _locked        : boolean = false;
  private _ready         : boolean = false;
  private _lockedAmount  : number  = 0;
  private _timeLeft      : number  = 0;

  private _durIdx  : number = 0;
  private _bonusIdx: number = 0;
  private _gold    : number = 0;

  private readonly _resources = Service.injectWeak(ResourceService);

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    ProgressionService.get().register(FEATURE_ID, () => true);
  }

  // ── Unlock ────────────────────────────────────────────────────────────────────

  @subscribe(Events.FeatureUnlocked)
  onFeatureUnlocked(p: Events.FeatureUnlockedPayload): void {
    if (p.featureId !== FEATURE_ID) return;
    this._registerLockAction();
    this._registerCurrentUpgrades();
  }

  // ── Timer ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (!this._locked || this._ready) return;
    this._timeLeft -= p.dt;
    if (this._timeLeft <= 0) {
      this._timeLeft = 0;
      this._ready    = true;
      // Replace lock action with collect action
      ActionService.get().unregister('vault.lock');
      ActionService.get().register({
        id: 'vault.collect', label: 'Collect Vault',
        detail: `+${Math.round((this._bonusMultiplier - 1) * 100)}% bonus`,
        cost: 0, isEnabled: true,
      });
      EventService.sendLocally(Events.VaultReady, {
        lockedAmount: this._lockedAmount, bonusMultiplier: this._bonusMultiplier,
      });
    }
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('vault.')) return;

    if (p.id === 'vault.lock')    { this._handleLock();    return; }
    if (p.id === 'vault.collect') { this._handleCollect(); return; }

    const dur = DURATION_UPGRADES[this._durIdx];
    if (dur && p.id === dur.id) {
      if (!this._resources?.spend(dur.cost)) return;
      this._duration = Math.max(10, this._duration - 15);
      ActionService.get().unregister(dur.id);
      this._durIdx++;
      this._registerCurrentUpgrades();
      return;
    }

    const bon = BONUS_UPGRADES[this._bonusIdx];
    if (bon && p.id === bon.id) {
      if (!this._resources?.spend(bon.cost)) return;
      this._bonusMultiplier = Math.round((this._bonusMultiplier + 0.2) * 10) / 10;
      ActionService.get().unregister(bon.id);
      this._bonusIdx++;
      this._registerCurrentUpgrades();
    }
  }

  // ── Affordability refresh ─────────────────────────────────────────────────────

  @subscribe(Events.ResourceChanged)
  onResourceChanged(p: Events.ResourceChangedPayload): void {
    this._gold = p.amount;
    this._refreshEnabled();
  }

  // ── Public queries ────────────────────────────────────────────────────────────

  isLocked()          : boolean { return this._locked; }
  isReady()           : boolean { return this._ready; }
  getTimeLeft()       : number  { return this._timeLeft; }
  getLockedAmount()   : number  { return this._lockedAmount; }
  getDuration()       : number  { return this._duration; }
  getBonusMultiplier(): number  { return this._bonusMultiplier; }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    ActionService.get().unregister('vault.lock');
    ActionService.get().unregister('vault.collect');
    for (const u of [...DURATION_UPGRADES, ...BONUS_UPGRADES]) ActionService.get().unregister(u.id);
    this._duration        = BASE_VAULT_DURATION;
    this._bonusMultiplier = BASE_VAULT_BONUS;
    this._locked          = false;
    this._ready           = false;
    this._lockedAmount    = 0;
    this._timeLeft        = 0;
    this._durIdx          = 0;
    this._bonusIdx        = 0;
    this._gold            = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _handleLock(): void {
    if (this._locked) return;
    // Lock 50% of current gold (minimum 1)
    const amount = Math.max(1, Math.floor(this._gold * 0.5));
    if (!this._resources?.spend(amount)) return;
    this._locked       = true;
    this._ready        = false;
    this._lockedAmount = amount;
    this._timeLeft     = this._duration;
    ActionService.get().update('vault.lock', { isEnabled: false, detail: `Locked: ${amount}g` });
    EventService.sendLocally(Events.VaultLocked, { amount, duration: this._duration });
  }

  private _handleCollect(): void {
    if (!this._locked || !this._ready) return;
    const total = this._lockedAmount * this._bonusMultiplier;
    this._resources?.addGain(total, GainSource.VaultPayout);
    EventService.sendLocally(Events.VaultCollected, {
      principal: this._lockedAmount,
      bonus:     total - this._lockedAmount,
      total,
    });
    this._locked       = false;
    this._ready        = false;
    this._lockedAmount = 0;
    ActionService.get().unregister('vault.collect');
    this._registerLockAction();
  }

  private _registerLockAction(): void {
    ActionService.get().register({
      id: 'vault.lock', label: 'Lock Vault',
      detail: `Lock 50% gold for ${this._duration}s (+${Math.round((this._bonusMultiplier - 1) * 100)}% return)`,
      cost: 0, isEnabled: this._gold > 0,
    });
  }

  private _registerCurrentUpgrades(): void {
    const d = DURATION_UPGRADES[this._durIdx];
    if (d) ActionService.get().register({ id: d.id, label: d.label, detail: d.detail, cost: d.cost, isEnabled: this._gold >= d.cost });
    const b = BONUS_UPGRADES[this._bonusIdx];
    if (b) ActionService.get().register({ id: b.id, label: b.label, detail: b.detail, cost: b.cost, isEnabled: this._gold >= b.cost });
  }

  private _refreshEnabled(): void {
    if (!this._locked) {
      ActionService.get().update('vault.lock', { isEnabled: this._gold > 0 });
    }
    const d = DURATION_UPGRADES[this._durIdx];
    if (d) ActionService.get().update(d.id, { isEnabled: this._gold >= d.cost });
    const b = BONUS_UPGRADES[this._bonusIdx];
    if (b) ActionService.get().update(b.id, { isEnabled: this._gold >= b.cost });
  }
}
