/**
 * FrenzyService — Tap counter → timed all-gain multiplier.
 * Self-registers its unlock and manages its own upgrade chain via ActionService.
 */
import { EventService, Service, OnServiceReadyEvent, service, subscribe } from 'meta/worlds';
import { FRENZY_TAP_THRESHOLD, FRENZY_DURATION, FRENZY_MULTIPLIER } from '../Constants';
import { Events } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { ProgressionService } from './ProgressionService';

const FEATURE_ID = 'frenzy';

const THRESHOLD_UPGRADES = [
  { id: 'frenzy.threshold.1', label: 'Hair Trigger I',  detail: '-2 taps to frenzy', cost: 300   },
  { id: 'frenzy.threshold.2', label: 'Hair Trigger II', detail: '-2 taps to frenzy', cost: 900   },
  { id: 'frenzy.threshold.3', label: 'Hair Trigger III',detail: '-2 taps to frenzy', cost: 2_500 },
] as const;

const DURATION_UPGRADES = [
  { id: 'frenzy.duration.1', label: 'Frenzy Duration I',  detail: '+5s frenzy',  cost: 800   },
  { id: 'frenzy.duration.2', label: 'Frenzy Duration II', detail: '+5s frenzy',  cost: 2_400 },
  { id: 'frenzy.duration.3', label: 'Frenzy Duration III',detail: '+5s frenzy',  cost: 6_000 },
] as const;

const POWER_UPGRADES = [
  { id: 'frenzy.power.1', label: 'Frenzy Power I',  detail: '+1× frenzy multiplier', cost: 1_500 },
  { id: 'frenzy.power.2', label: 'Frenzy Power II', detail: '+1× frenzy multiplier', cost: 5_000 },
] as const;

@service()
export class FrenzyService extends Service {

  private _threshold  : number  = FRENZY_TAP_THRESHOLD;
  private _duration   : number  = FRENZY_DURATION;
  private _multiplier : number  = FRENZY_MULTIPLIER;

  private _tapCount   : number  = 0;
  private _active     : boolean = false;
  private _timeLeft   : number  = 0;

  private _threshIdx  : number = 0;
  private _durIdx     : number = 0;
  private _powIdx     : number = 0;
  private _gold       : number = 0;

  private readonly _resources = Service.injectWeak(ResourceService);

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    ProgressionService.get().register(FEATURE_ID, () => true);
    ResourceService.get().registerModifier((amount, _source) => {
      return this._active ? amount * this._multiplier : amount;
    }, 0);
  }

  // ── Unlock ────────────────────────────────────────────────────────────────────

  @subscribe(Events.FeatureUnlocked)
  onFeatureUnlocked(p: Events.FeatureUnlockedPayload): void {
    if (p.featureId !== FEATURE_ID) return;
    this._registerCurrentUpgrades();
  }

  // ── Tap counter ───────────────────────────────────────────────────────────────

  @subscribe(Events.PlayerTap)
  onPlayerTap(): void {
    if (this._active) return;
    this._tapCount++;
    if (this._tapCount >= this._threshold) {
      this._tapCount = 0;
      this._activate();
    } else {
      EventService.sendLocally(Events.FrenzyProgress, {
        current: this._tapCount, threshold: this._threshold,
      });
    }
  }

  // ── Timer ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (!this._active) return;
    this._timeLeft -= p.dt;
    if (this._timeLeft <= 0) {
      this._active   = false;
      this._timeLeft = 0;
      EventService.sendLocally(Events.FrenzyEnded, {});
    }
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('frenzy.')) return;

    const thresh = THRESHOLD_UPGRADES[this._threshIdx];
    if (thresh && p.id === thresh.id) {
      if (!this._resources?.spend(thresh.cost)) return;
      this._threshold = Math.max(5, this._threshold - 2);
      ActionService.get().unregister(thresh.id);
      this._threshIdx++;
      this._registerCurrentUpgrades();
      return;
    }

    const dur = DURATION_UPGRADES[this._durIdx];
    if (dur && p.id === dur.id) {
      if (!this._resources?.spend(dur.cost)) return;
      this._duration += 5;
      ActionService.get().unregister(dur.id);
      this._durIdx++;
      this._registerCurrentUpgrades();
      return;
    }

    const pow = POWER_UPGRADES[this._powIdx];
    if (pow && p.id === pow.id) {
      if (!this._resources?.spend(pow.cost)) return;
      this._multiplier += 1;
      ActionService.get().unregister(pow.id);
      this._powIdx++;
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

  isActive()     : boolean { return this._active; }
  getTimeLeft()  : number  { return this._timeLeft; }
  getTapCount()  : number  { return this._tapCount; }
  getThreshold() : number  { return this._threshold; }
  getMultiplier(): number  { return this._multiplier; }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    this._unregisterAll();
    this._threshold  = FRENZY_TAP_THRESHOLD;
    this._duration   = FRENZY_DURATION;
    this._multiplier = FRENZY_MULTIPLIER;
    this._tapCount   = 0;
    this._active     = false;
    this._timeLeft   = 0;
    this._threshIdx  = 0;
    this._durIdx     = 0;
    this._powIdx     = 0;
    this._gold       = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _activate(): void {
    this._active   = true;
    this._timeLeft = this._duration;
    EventService.sendLocally(Events.FrenzyStarted, {
      duration: this._duration, multiplier: this._multiplier,
    });
  }

  private _registerCurrentUpgrades(): void {
    const t = THRESHOLD_UPGRADES[this._threshIdx];
    if (t) ActionService.get().register({ id: t.id, label: t.label, detail: t.detail, cost: t.cost, isEnabled: this._gold >= t.cost });
    const d = DURATION_UPGRADES[this._durIdx];
    if (d) ActionService.get().register({ id: d.id, label: d.label, detail: d.detail, cost: d.cost, isEnabled: this._gold >= d.cost });
    const p = POWER_UPGRADES[this._powIdx];
    if (p) ActionService.get().register({ id: p.id, label: p.label, detail: p.detail, cost: p.cost, isEnabled: this._gold >= p.cost });
  }

  private _refreshEnabled(): void {
    const t = THRESHOLD_UPGRADES[this._threshIdx];
    if (t) ActionService.get().update(t.id, { isEnabled: this._gold >= t.cost });
    const d = DURATION_UPGRADES[this._durIdx];
    if (d) ActionService.get().update(d.id, { isEnabled: this._gold >= d.cost });
    const p = POWER_UPGRADES[this._powIdx];
    if (p) ActionService.get().update(p.id, { isEnabled: this._gold >= p.cost });
  }

  private _unregisterAll(): void {
    for (const u of [...THRESHOLD_UPGRADES, ...DURATION_UPGRADES, ...POWER_UPGRADES]) {
      ActionService.get().unregister(u.id);
    }
  }
}
