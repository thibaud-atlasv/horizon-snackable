/**
 * VaultService — Locks gold for a duration, returns it with a bonus.
 * Gold is automatically collected when the timer expires.
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import { BASE_VAULT_DURATION, BASE_VAULT_BONUS } from '../Constants';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

@service()
export class VaultService extends Service {

  private _duration        : number = BASE_VAULT_DURATION;
  private _bonusMultiplier : number = BASE_VAULT_BONUS;

  private _locked      : boolean = false;
  private _lockedAmount: number  = 0;
  private _timeLeft    : number  = 0;

  private readonly _resources = Service.injectWeak(ResourceService);

  // ── Startup: declare all actions ──────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    const unlockDef = getActionDef('vault.unlock');
    ActionService.get().declare('vault.unlock', () => ({
      label    : unlockDef.label,
      detail   : `${unlockDef.description} [+${Math.round((BASE_VAULT_BONUS - 1) * 100)}% / ${BASE_VAULT_DURATION}s]`,
      cost     : unlockDef.cost,
      isEnabled: ResourceService.get().canAfford(unlockDef.cost),
    }));

    const lockDef = getActionDef('vault.lock');
    ActionService.get().declare('vault.lock', () => {
      if (this._locked) {
        return {
          label    : lockDef.label,
          detail   : `Vault locked — ${Math.ceil(this._timeLeft)}s remaining. [${this._lockedAmount}g]`,
          cost     : 0,
          isEnabled: false,
        };
      }
      return {
        label    : lockDef.label,
        detail   : `${lockDef.description} [+${Math.round((this._bonusMultiplier - 1) * 100)}% / ${this._duration}s]`,
        cost     : Math.floor(ResourceService.get().getGold() * 0.5),
        isEnabled: ResourceService.get().getGold() > 0,
      };
    });

    const durDef = getActionDef('vault.duration');
    ActionService.get().declare('vault.duration', () => ({
      label    : durDef.label,
      detail   : `${durDef.description} [${this._duration}s -> ${Math.max(10, this._duration - 15)}s]`,
      cost     : getScaledCost('vault.duration'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('vault.duration')),
    }));

    const bonusDef = getActionDef('vault.bonus');
    ActionService.get().declare('vault.bonus', () => ({
      label    : bonusDef.label,
      detail   : `${bonusDef.description} [+${Math.round((this._bonusMultiplier - 1) * 100)}% -> +${Math.round((this._bonusMultiplier - 0.8) * 100)}%]`,
      cost     : getScaledCost('vault.bonus'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('vault.bonus')),
    }));
  }

  // ── Timer ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (!this._locked) return;
    this._timeLeft -= p.dt;
    if (this._timeLeft <= 0) {
      this._timeLeft = 0;
      this._handleCollect();
    } else {
      // Lightweight patch — avoids iterating all declarations on every tick
      ActionService.get().update('vault.lock', {
        detail: `Vault locked — ${Math.ceil(this._timeLeft)}s remaining. [${this._lockedAmount}g]`,
      });
    }
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('vault.')) return;

    if (p.id === 'vault.unlock') {
      if (!ResourceService.get().buy(p.id)) return;
      return;
    }

    if (p.id === 'vault.lock') { this._handleLock(); return; }

    if (p.id === 'vault.duration') {
      if (!ResourceService.get().buy(p.id)) return;
      this._duration = Math.max(10, this._duration - 15);
      ActionService.get().refreshDeclared();
      return;
    }

    if (p.id === 'vault.bonus') {
      if (!ResourceService.get().buy(p.id)) return;
      this._bonusMultiplier = Math.round((this._bonusMultiplier + 0.2) * 10) / 10;
      ActionService.get().refreshDeclared();
    }
  }

  // ── Public queries ────────────────────────────────────────────────────────────

  isPurchased()        : boolean { return StatsService.get().get('vault.unlock') > 0; }
  isLocked()           : boolean { return this._locked; }
  getTimeLeft()        : number  { return this._timeLeft; }
  getLockedAmount()    : number  { return this._lockedAmount; }
  getDuration()        : number  { return this._duration; }
  getBonusMultiplier() : number  { return this._bonusMultiplier; }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _handleLock(): void {
    if (this._locked) return;
    const gold   = ResourceService.get().getGold();
    const amount = Math.max(1, Math.floor(gold * 0.5));
    if (!this._resources?.spend(amount)) return;
    this._locked       = true;
    this._lockedAmount = amount;
    this._timeLeft     = this._duration;
    StatsService.get().increment('vault.lock');
    // StatsChanged → refreshDeclared() → factory reads _locked=true → shows locked state
  }

  private _handleCollect(): void {
    if (!this._locked) return;
    const total        = this._lockedAmount * this._bonusMultiplier;
    this._locked       = false;
    this._lockedAmount = 0;
    this._resources?.addGain(total, GainSource.VaultPayout);
    // ResourceChanged → refreshDeclared() → factory reads _locked=false → shows ready state
  }
}
