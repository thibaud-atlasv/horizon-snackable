/**
 * ComboManager — Tracks consecutive brick hits and drives the combo HUD.
 *
 * - BrickDestroyed → increments combo, sends IncrementCombo to HUD
 * - BallLost → resets combo, sends ResetCombo to HUD
 * - Restart → resets combo
 *
 * The combo count resets when the ball is lost. Explosive chain reactions
 * count each brick individually, so a 4-brick chain gives +4 combo.
 *
 * Force-instantiated via GameManager reference.
 */
import { component, Component, EventService, NetworkingService, OnEntityStartEvent, subscribe } from 'meta/worlds';
import { Events, ComboHUDEvents } from '../Types';

@component()
export class ComboManager extends Component {
  private _combo = 0;
  private _isClient = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._isClient = !NetworkingService.get().isServerContext();
  }

  @subscribe(Events.BrickDestroyed)
  private _onBrickDestroyed(): void {
    console.log("DESTROYDED");
    if (!this._isClient) return;
    this._combo++;
    EventService.sendLocally(ComboHUDEvents.IncrementCombo, {});
  }

  @subscribe(Events.BallLost)
  private _onBallLost(): void {
    if (!this._isClient) return;
    if (this._combo === 0) return;
    EventService.sendLocally(ComboHUDEvents.ResetCombo, {});
    this._combo = 0;
  }

  @subscribe(Events.Restart)
  private _onRestart(): void {
    if (!this._isClient) return;
    if (this._combo === 0) return;
    EventService.sendLocally(ComboHUDEvents.ResetCombo, {});
    this._combo = 0;
  }

  @subscribe(Events.ResetRound)
  private _onResetRound(): void {
    if (!this._isClient) return;
    if (this._combo === 0) return;
    EventService.sendLocally(ComboHUDEvents.ResetCombo, {});
    this._combo = 0;
  }
}
