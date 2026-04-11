/**
 * ComboManager — Tracks combo and heat, drives the combo HUD and BallPowerService.
 *
 * combo : bricks destroyed in a single launch (resets on ResetRound / BallLost / Restart)
 * heat  : bricks destroyed since last BallLost / Restart (survives paddle hits)
 *
 * - BrickDestroyed → combo++, heat++
 * - ResetRound     → combo resets (paddle hit / new launch)
 * - BallLost       → combo resets, heat resets
 * - Restart        → combo resets, heat resets
 */
import { component, Component, EventService, NetworkingService, OnEntityStartEvent, subscribe } from 'meta/worlds';
import { Events, ComboHUDEvents, HeatEvents } from '../Types';

@component()
export class ComboManager extends Component {
  private _combo = 0;
  private _heat = 0;
  private _isClient = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._isClient = !NetworkingService.get().isServerContext();
  }

  @subscribe(Events.BrickDestroyed)
  private _onBrickDestroyed(): void {
    if (!this._isClient) return;
    this._combo++;
    this._heat++;
    EventService.sendLocally(ComboHUDEvents.IncrementCombo, {});
    EventService.sendLocally(HeatEvents.IncrementHeat, {});
  }

  @subscribe(Events.ResetRound)
  private _onResetRound(): void {
    if (!this._isClient) return;
    if (this._combo === 0) return;
    EventService.sendLocally(ComboHUDEvents.ResetCombo, {});
    this._combo = 0;
    // heat intentionally not reset here — survives between launches
  }

  @subscribe(Events.BallLost)
  private _onBallLost(): void {
    if (!this._isClient) return;
    if (this._combo > 0) {
      EventService.sendLocally(ComboHUDEvents.ResetCombo, {});
      this._combo = 0;
    }
    if (this._heat > 0) {
      EventService.sendLocally(HeatEvents.ResetHeat, {});
      this._heat = 0;
    }
  }

  @subscribe(Events.Restart)
  private _onRestart(): void {
    if (!this._isClient) return;
    if (this._combo > 0) {
      EventService.sendLocally(ComboHUDEvents.ResetCombo, {});
      this._combo = 0;
    }
    if (this._heat > 0) {
      EventService.sendLocally(HeatEvents.ResetHeat, {});
      this._heat = 0;
    }
  }
}
