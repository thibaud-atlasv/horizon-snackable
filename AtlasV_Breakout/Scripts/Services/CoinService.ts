/**
 * CoinService — Spawns coins from destroyed bricks, vacuums them toward the paddle.
 *
 * Coins are virtual particles rendered through the VfxService particle pool.
 * They are purely visual + scoring — no collision with the ball.
 *
 * Vacuum style: shmup-like direct pull toward paddle center.
 * No orbiting — tangential velocity is aggressively damped.
 *
 * Collection: instant burst at paddle + score fires immediately. No fly-through.
 */
import {
  Service, service, subscribe,
  OnWorldUpdateEvent, ExecuteOn,
  Vec3,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { ComboHUDEvents, Events } from '../Types';
import {
  BOUNDS,
  COINS_PER_BRICK, COIN_MIN, COIN_SCATTER, COIN_INITIAL_VY, COIN_GRAVITY, COIN_Z,
  VACUUM_RADIUS, VACUUM_FORCE, VACUUM_MAX_SPEED, VACUUM_MIN_SPEED, TANGENT_DAMPING, COLLECT_RADIUS,
  SUPER_VACUUM_FORCE, SUPER_VACUUM_MAX,
  COIN_COLOR, COIN_SCALE, COIN_MAX_LIFE, COIN_VALUE, COIN_BURST_COUNT,
} from '../Constants';
import { CollisionManager } from '../CollisionManager';
import { VfxService } from './VfxService';
import { EventService } from 'meta/worlds';

interface ICoin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

@service()
export class CoinService extends Service {
  private _coins: ICoin[] = [];
  private _paddleX = 0;
  private _paddleY = -7;
  private _superVacuum = false;

  /** Number of coins currently alive. */
  get activeCoinCount(): number { return this._coins.length; }

  /** Activate full-screen vacuum — all coins get sucked to paddle. */
  activateSuperVacuum(): void { this._superVacuum = true; }

  /** Deactivate super vacuum (called automatically on reset). */
  private _deactivateSuperVacuum(): void { this._superVacuum = false; }

  // ── Spawn ──────────────────────────────────────────────────────────────

  @subscribe(Events.BrickDestroyed, { execution: ExecuteOn.Owner })
  private _onBrickDestroyed(p: Events.BrickDestroyedPayload): void {
    const count = COIN_MIN + Math.floor(Math.random() * COINS_PER_BRICK);
    for (let i = 0; i < count; i++) {
      this._coins.push({
        x: p.position.x + (Math.random() - 0.5) * COIN_SCATTER,
        y: p.position.y - Math.random() * 0.3,
        vx: (Math.random() - 0.5) * 3,
        vy: COIN_INITIAL_VY - Math.random() * 1.5,
        age: 0,
      });
    }
  }

  // ── Clean up ───────────────────────────────────────────────────────────

  @subscribe(Events.BallLost)
  private _onBallLost(): void { this._coins.length = 0; }

  @subscribe(Events.ResetRound)
  private _onReset(): void { this._coins.length = 0; this._deactivateSuperVacuum(); }

  @subscribe(Events.Restart)
  private _onRestart(): void { this._coins.length = 0; this._deactivateSuperVacuum(); }

  // ── Update ─────────────────────────────────────────────────────────────

  private _comboCount = 0;
  @subscribe(Events.PaddleHit)
  onPaddleHit(p: Events.PaddleHitPayload): void {
    if (p.ballVelocityY === 0) return;
    this._comboCount = 0;
  }

  @subscribe(ComboHUDEvents.IncrementCombo)
  onIncrementCombo(_payload: ComboHUDEvents.IncrementComboPayload): void {
    this._comboCount++;
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    const dt = p.deltaTime;
    this._updatePaddlePosition();
    const vfx = VfxService.get();

    for (let i = this._coins.length - 1; i >= 0; i--) {
      const coin = this._coins[i];
      coin.age += dt;

      if (!this._superVacuum && coin.age >= COIN_MAX_LIFE) {
        this._coins.splice(i, 1);
        continue;
      }

      const dx = this._paddleX - coin.x;
      const dy = this._paddleY - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // ── Collect: instant burst + score ─────────────────────────────
      if (dist < COLLECT_RADIUS) {
        const value = Math.floor(COIN_VALUE * (1 + this._comboCount * 0.5));
        EventService.sendLocally(Events.CoinCollected, { value: value });

        // Golden burst at collection point
        for (let b = 0; b < COIN_BURST_COUNT; b++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 2;
          vfx.spawnParticle(
            coin.x, coin.y, COIN_Z,
            Math.cos(angle) * speed, Math.sin(angle) * speed, 0,
            COIN_COLOR[0], COIN_COLOR[1], COIN_COLOR[2], COIN_COLOR[3],
            0.15, 0.08,
          );
        }

        // Paddle flash on collect
        EventService.sendLocally(Events.PaddleHit, {
          position: new Vec3(this._paddleX, this._paddleY, 0),
          ballVelocityX: 0,
          ballVelocityY: 0,
        });

        this._coins.splice(i, 1);
        continue;
      }

      // ── Vacuum: shmup-style direct pull ────────────────────────────
      const inRange = this._superVacuum || (dist < VACUUM_RADIUS);
      if (inRange && dist > 0.01) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Decompose velocity into radial + tangential
        const radialSpeed = coin.vx * nx + coin.vy * ny;
        const tangentX = coin.vx - radialSpeed * nx;
        const tangentY = coin.vy - radialSpeed * ny;

        // Kill tangential velocity → straight line, no orbit
        coin.vx = radialSpeed * nx + tangentX * (1 - TANGENT_DAMPING);
        coin.vy = radialSpeed * ny + tangentY * (1 - TANGENT_DAMPING);

        // Pull force — super vacuum uses stronger constant pull
        if (this._superVacuum) {
          const pull = SUPER_VACUUM_FORCE;
          coin.vx += nx * pull * dt;
          coin.vy += ny * pull * dt;
        } else {
          const t = 1 - dist / VACUUM_RADIUS;
          const pull = VACUUM_FORCE * (t * t + 0.3);
          coin.vx += nx * pull * dt;
          coin.vy += ny * pull * dt;
        }

        // Speed clamp
        const maxSpd = this._superVacuum ? SUPER_VACUUM_MAX : VACUUM_MAX_SPEED;
        let speed = Math.sqrt(coin.vx * coin.vx + coin.vy * coin.vy);
        if (speed < VACUUM_MIN_SPEED) {
          coin.vx = nx * VACUUM_MIN_SPEED;
          coin.vy = ny * VACUUM_MIN_SPEED;
        } else if (speed > maxSpd) {
          coin.vx = (coin.vx / speed) * maxSpd;
          coin.vy = (coin.vy / speed) * maxSpd;
        }
      } else {
        coin.vy -= COIN_GRAVITY * dt;
      }

      // Move
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;

      if (!this._superVacuum && coin.y < BOUNDS.y - 1) {
        this._coins.splice(i, 1);
        continue;
      }

      // Render
      const fadeIn = Math.min(coin.age / 0.15, 1);
      vfx.spawnParticle(
        coin.x, coin.y, COIN_Z,
        0, 0, 0,
        COIN_COLOR[0], COIN_COLOR[1], COIN_COLOR[2], COIN_COLOR[3],
        0.02,
        COIN_SCALE * fadeIn,
      );
    }
  }

  // ── Find paddle ────────────────────────────────────────────────────────

  private _updatePaddlePosition(): void {
    for (const collider of CollisionManager.get().query(0, this._paddleY, 20)) {
      if (collider.colliderTag === 'paddle') {
        const b = collider.getColliderBounds();
        this._paddleX = b.x + b.w * 0.5;
        this._paddleY = b.y + b.h * 0.5;
        return;
      }
    }
  }
}
