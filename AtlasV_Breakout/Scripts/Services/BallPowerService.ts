/**
 * BallPowerService — Heat-driven ball speed + pierce.
 *
 * Heat = total bricks destroyed since last BallLost / Restart.
 * Unlike combo, heat survives paddle hits, so power builds across the whole life.
 *
 * Pierce is consumable: each brick pierced costs heat points.
 * This creates natural balance — pierce devours the heat,
 * so bulldozer mode is powerful but self-limiting.
 *
 * Resets on BallLost / Restart (heat resets → power resets).
 */
import { Service, service, subscribe, ExecuteOn } from 'meta/worlds';
import { HeatEvents } from '../Types';
import {
  POWER_SPEED_SCALE, POWER_SPEED_RATE, POWER_MAX_SPEED_BASE, POWER_PIERCE_SPEED_BONUS,
  PIERCE_THRESHOLDS, PIERCE_COMBO_COST,
} from '../Constants';

@service()
export class BallPowerService extends Service {
  private _heat = 0;

  /** Current speed multiplier (1.0 = base). Read by Ball each frame. */
  speedMultiplier = 1.0;

  /** How many bricks the ball can pass through this frame. 0 = normal. */
  pierceCount = 0;

  /**
   * Called by Ball when a pierce is actually used (brick passed through).
   * Drains heat points — pierce is powerful but self-limiting.
   */
  consumePierce(): void {
    this._heat = Math.max(0, this._heat - PIERCE_COMBO_COST);
    this._recalc();
  }

  // ── Heat tracking ──────────────────────────────────────────────────────

  @subscribe(HeatEvents.IncrementHeat, { execution: ExecuteOn.Owner })
  private _onHeatIncrement(): void {
    this._heat++;
    this._recalc();
  }

  @subscribe(HeatEvents.ResetHeat, { execution: ExecuteOn.Owner })
  private _onHeatReset(): void {
    this._heat = 0;
    this._recalc();
  }

  // ── Math ───────────────────────────────────────────────────────────────

  private _recalc(): void {
    const h = this._heat;

    // Pierce level (based on heat)
    this.pierceCount = 0;
    for (const [threshold, pierce] of PIERCE_THRESHOLDS) {
      if (h >= threshold) {
        this.pierceCount = pierce;
        break;
      }
    }

    // Speed: gentle curve capped at base max, then bonus per pierce level
    const baseSpeed = Math.min(
      POWER_MAX_SPEED_BASE,
      1 + POWER_SPEED_SCALE * Math.log(1 + h * POWER_SPEED_RATE),
    );
    this.speedMultiplier = baseSpeed + this.pierceCount * POWER_PIERCE_SPEED_BONUS;
  }
}
