/**
 * InterestService — % of current gold paid on a timer.
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import { BASE_INTEREST_RATE, BASE_INTEREST_INTERVAL } from '../Constants';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

@service()
export class InterestService extends Service {

  private _rate     : number = BASE_INTEREST_RATE;
  private _interval : number = BASE_INTEREST_INTERVAL;
  private _accum    : number = 0;

  private readonly _resources = Service.injectWeak(ResourceService);

  // ── Startup: declare all actions ──────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    const unlockDef = getActionDef('interest.unlock');
    ActionService.get().declare('interest.unlock', () => ({
      label    : unlockDef.label,
      detail   : `${unlockDef.description} [${BASE_INTEREST_RATE * 100}% / ${BASE_INTEREST_INTERVAL}s]`,
      cost     : unlockDef.cost,
      isEnabled: ResourceService.get().canAfford(unlockDef.cost),
    }));

    const rateDef = getActionDef('interest.rate');
    ActionService.get().declare('interest.rate', () => ({
      label    : rateDef.label,
      detail   : `${rateDef.description} [${Math.round(this._rate * 1000) / 10}% -> ${Math.round((this._rate + 0.005) * 1000) / 10}%]`,
      cost     : getScaledCost('interest.rate'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('interest.rate')),
    }));

    const intDef = getActionDef('interest.interval');
    ActionService.get().declare('interest.interval', () => ({
      label    : intDef.label,
      detail   : `${intDef.description} [${this._interval}s -> ${Math.max(10, this._interval - 10)}s]`,
      cost     : getScaledCost('interest.interval'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('interest.interval')),
    }));
  }

  // ── Passive payout ────────────────────────────────────────────────────────────

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (!this._isPurchased()) return;
    this._accum += p.dt;
    if (this._accum < this._interval) return;
    this._accum -= this._interval;
    const gold = this._resources?.getGold() ?? 0;
    if (gold <= 0) return;
    this._resources?.addGain(gold * this._rate, GainSource.Interest);
    StatsService.get().increment('interest.payout');
    // StatsChanged → ActionService.refreshDeclared() reveals upgrades when payout threshold met
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('interest.')) return;

    if (p.id === 'interest.unlock') {
      if (!ResourceService.get().buy(p.id)) return;
      return;
    }

    if (p.id === 'interest.rate') {
      if (!ResourceService.get().buy(p.id)) return;
      this._rate = Math.round((this._rate + 0.005) * 1_000) / 1_000;
      ActionService.get().refreshDeclared();
      return;
    }

    if (p.id === 'interest.interval') {
      if (!ResourceService.get().buy(p.id)) return;
      this._interval = Math.max(10, this._interval - 10);
      ActionService.get().refreshDeclared();
    }
  }

  // ── Public queries ────────────────────────────────────────────────────────────

  isPurchased()      : boolean { return this._isPurchased(); }
  getRate()          : number  { return this._rate; }
  getInterval()      : number  { return this._interval; }
  getTimeUntilNext() : number  { return Math.max(0, this._interval - this._accum); }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _isPurchased(): boolean {
    return StatsService.get().get('interest.unlock') > 0;
  }
}
