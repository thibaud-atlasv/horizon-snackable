/**
 * TapService — Player tap input, tap upgrades, and cursor auto-clicker.
 *
 * The Cursor is a tap-simulating auto-clicker: each cycle it fires PlayerTap,
 * so tap upgrades naturally boost cursor output too.
 */
import { OnServiceReadyEvent, EventService, Service, service, subscribe } from 'meta/worlds';
import { BASE_CLICK_VALUE } from '../Constants';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

const CURSOR_CYCLE_TIME = 2; // seconds per auto-click cycle

@service()
export class TapService extends Service {

  private readonly _resources = Service.injectWeak(ResourceService);

  private _multiplier  : number = 1;
  private _cursorCount : number = 0;
  private _cursorAccum : number = 0;

  // ── Startup: declare all actions ──────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    const buyDef = getActionDef('tap.buy');
    ActionService.get().declare('tap.buy', () => ({
      label    : buyDef.label,
      detail   : `${buyDef.description} [${this._cursorCount} -> ${this._cursorCount + 1}]`,
      cost     : getScaledCost('tap.buy'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('tap.buy')),
    }));

    const upgDef = getActionDef('tap.upgrade');
    ActionService.get().declare('tap.upgrade', () => ({
      label    : upgDef.label,
      detail   : `${upgDef.description} [x${this._multiplier} -> x${this._multiplier + 1}]`,
      cost     : getScaledCost('tap.upgrade'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('tap.upgrade')),
    }));
  }

  // ── Tap ───────────────────────────────────────────────────────────────────────

  @subscribe(Events.PlayerTap)
  onPlayerTap(): void {
    StatsService.get().increment('taps');
    this._resources?.addGain(BASE_CLICK_VALUE * this._multiplier, GainSource.Tap);
  }

  // ── Cursor production ─────────────────────────────────────────────────────────

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (this._cursorCount === 0) return;
    this._cursorAccum += p.dt;
    if (this._cursorAccum < CURSOR_CYCLE_TIME / this._cursorCount) return;
    this._cursorAccum -= CURSOR_CYCLE_TIME / this._cursorCount;
    EventService.sendLocally(Events.PlayerTap, {});
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (p.id === 'tap.buy') {
      if (!ResourceService.get().buy('tap.buy')) return;
      this._cursorCount++;
      ActionService.get().refreshDeclared();
      return;
    }

    if (p.id === 'tap.upgrade') {
      if (!ResourceService.get().buy('tap.upgrade')) return;
      this._multiplier += 1;
      ActionService.get().refreshDeclared();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  getClickValue()  : number { return BASE_CLICK_VALUE * this._multiplier; }
  getCursorCount() : number { return this._cursorCount; }
}
