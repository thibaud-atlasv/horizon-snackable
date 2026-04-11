/**
 * BallPowerService — Combo-driven ball speed + pierce.
 *
 * Pierce is consumable: each brick pierced costs combo points.
 * This creates natural balance — pierce devours the combo,
 * so bulldozer mode is powerful but self-limiting.
 *
 * Resets on BallLost / ResetRound (combo resets → power resets).
 */
import { Service, service, subscribe, ExecuteOn } from 'meta/worlds';
import { Events, ComboHUDEvents } from '../Types';
import {
  POWER_SPEED_SCALE, POWER_SPEED_RATE, POWER_MAX_SPEED_BASE, POWER_PIERCE_SPEED_BONUS,
  PIERCE_THRESHOLDS, PIERCE_COMBO_COST,
} from '../Constants';

@service()
export class BallPowerService extends Service {
  private _combo = 0;

  /** Current speed multiplier (1.0 = base). Read by Ball each frame. */
  speedMultiplier = 1.0;

  /** How many bricks the ball can pass through this frame. 0 = normal. */
  pierceCount = 0;

  /**
   * Called by Ball when a pierce is actually used (brick passed through).
   * Drains combo points — pierce is powerful but self-limiting.
   */
  consumePierce(): void {
    this._combo = Math.max(0, this._combo - PIERCE_COMBO_COST);
    this._recalc();
  }

  // ── Combo tracking ─────────────────────────────────────────────────────

  @subscribe(ComboHUDEvents.IncrementCombo, { execution: ExecuteOn.Owner })
  private _onComboIncrement(): void {
    this._combo++;
    this._recalc();
  }

  @subscribe(ComboHUDEvents.ResetCombo, { execution: ExecuteOn.Owner })
  private _onComboReset(): void {
    this._combo = 0;
    this._recalc();
  }

  @subscribe(Events.Restart, { execution: ExecuteOn.Owner })
  private _onRestart(): void {
    this._combo = 0;
    this._recalc();
  }

  // ── Math ───────────────────────────────────────────────────────────────

  private _recalc(): void {
    const c = this._combo;

    // Pierce level
    this.pierceCount = 0;
    for (const [threshold, pierce] of PIERCE_THRESHOLDS) {
      if (c >= threshold) {
        this.pierceCount = pierce;
        break;
      }
    }

    // Speed: gentle curve capped at base max, then bonus per pierce level
    const baseSpeed = Math.min(
      POWER_MAX_SPEED_BASE,
      1 + POWER_SPEED_SCALE * Math.log(1 + c * POWER_SPEED_RATE),
    );
    this.speedMultiplier = baseSpeed + this.pierceCount * POWER_PIERCE_SPEED_BONUS;
  }
}
