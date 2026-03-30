/**
 * InterestService — % of current gold paid on a timer. Self-managing upgrades.
 */
import { EventService, Service, OnServiceReadyEvent, service, subscribe } from 'meta/worlds';
import { BASE_INTEREST_RATE, BASE_INTEREST_INTERVAL } from '../Constants';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { ProgressionService } from './ProgressionService';

const FEATURE_ID = 'interest';

const RATE_UPGRADES = [
  { id: 'interest.rate.1', label: 'Better Rates I',  detail: '+0.5% interest rate', cost: 2_000 },
  { id: 'interest.rate.2', label: 'Better Rates II', detail: '+0.5% interest rate', cost: 6_000 },
  { id: 'interest.rate.3', label: 'Better Rates III',detail: '+0.5% interest rate', cost: 15_000 },
] as const;

const INTERVAL_UPGRADES = [
  { id: 'interest.interval.1', label: 'Faster Returns I',  detail: '-10s between payouts', cost: 3_000  },
  { id: 'interest.interval.2', label: 'Faster Returns II', detail: '-10s between payouts', cost: 8_000  },
  { id: 'interest.interval.3', label: 'Faster Returns III',detail: '-10s between payouts', cost: 20_000 },
] as const;

@service()
export class InterestService extends Service {

  private _rate    : number = BASE_INTEREST_RATE;
  private _interval: number = BASE_INTEREST_INTERVAL;
  private _accum   : number = 0;

  private _rateIdx    : number = 0;
  private _intervalIdx: number = 0;
  private _gold       : number = 0;

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
    this._registerCurrentUpgrades();
  }

  // ── Passive payout ────────────────────────────────────────────────────────────

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    this._accum += p.dt;
    if (this._accum < this._interval) return;
    this._accum -= this._interval;
    const gold = this._resources?.getGold() ?? 0;
    if (gold <= 0) return;
    const amount = gold * this._rate;
    this._resources?.addGain(amount, GainSource.Interest);
    EventService.sendLocally(Events.InterestPaid, { amount, rate: this._rate });
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('interest.')) return;

    const rate = RATE_UPGRADES[this._rateIdx];
    if (rate && p.id === rate.id) {
      if (!this._resources?.spend(rate.cost)) return;
      this._rate = Math.round((this._rate + 0.005) * 1_000) / 1_000;
      ActionService.get().unregister(rate.id);
      this._rateIdx++;
      this._registerCurrentUpgrades();
      return;
    }

    const intv = INTERVAL_UPGRADES[this._intervalIdx];
    if (intv && p.id === intv.id) {
      if (!this._resources?.spend(intv.cost)) return;
      this._interval = Math.max(10, this._interval - 10);
      ActionService.get().unregister(intv.id);
      this._intervalIdx++;
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

  getRate()          : number { return this._rate; }
  getInterval()      : number { return this._interval; }
  getTimeUntilNext() : number { return Math.max(0, this._interval - this._accum); }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    this._unregisterAll();
    this._rate         = BASE_INTEREST_RATE;
    this._interval     = BASE_INTEREST_INTERVAL;
    this._accum        = 0;
    this._rateIdx      = 0;
    this._intervalIdx  = 0;
    this._gold         = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _registerCurrentUpgrades(): void {
    const r = RATE_UPGRADES[this._rateIdx];
    if (r) ActionService.get().register({ id: r.id, label: r.label, detail: r.detail, cost: r.cost, isEnabled: this._gold >= r.cost });
    const i = INTERVAL_UPGRADES[this._intervalIdx];
    if (i) ActionService.get().register({ id: i.id, label: i.label, detail: i.detail, cost: i.cost, isEnabled: this._gold >= i.cost });
  }

  private _refreshEnabled(): void {
    const r = RATE_UPGRADES[this._rateIdx];
    if (r) ActionService.get().update(r.id, { isEnabled: this._gold >= r.cost });
    const i = INTERVAL_UPGRADES[this._intervalIdx];
    if (i) ActionService.get().update(i.id, { isEnabled: this._gold >= i.cost });
  }

  private _unregisterAll(): void {
    for (const u of [...RATE_UPGRADES, ...INTERVAL_UPGRADES]) {
      ActionService.get().unregister(u.id);
    }
  }
}
