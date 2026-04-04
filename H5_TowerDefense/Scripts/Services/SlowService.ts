import { Service, Color, ColorComponent, subscribe } from 'meta/worlds';
import { service } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { OnWorldUpdateEvent } from 'meta/worlds';
import { Events } from '../Types';
import { EnemyService } from './EnemyService';

const TINT_SLOW = new Color(0.4, 0.85, 1.0, 1.0); // icy cyan

interface ISlowState {
  factor: number;
  expiresAt: number;
  originalColors: Map<ColorComponent, Color>;
}

@service()
export class SlowService extends Service {
  private _slows: Map<number, ISlowState> = new Map();
  private _enemyService = Service.inject(EnemyService);

  @subscribe(Events.TakeDamage)
  onTakeDamage(p: Events.TakeDamagePayload): void {
    const factor   = p.props['slowFactor']   as number | undefined;
    const duration = p.props['slowDuration'] as number | undefined;
    if (factor === undefined || duration === undefined || factor >= 1) return;

    const expiresAt = Date.now() + duration * 1000;
    const existing  = this._slows.get(p.enemyId);

    if (!existing || factor <= existing.factor || expiresAt > existing.expiresAt) {
      const rec = this._enemyService.get(p.enemyId);
      const originalColors = existing?.originalColors ?? (rec ? this._captureColors(rec.entity) : new Map());
      this._slows.set(p.enemyId, { factor, expiresAt, originalColors });
      this._enemyService.setSpeedFactor(p.enemyId, factor);
      if (rec) this._applyTint(rec.entity, TINT_SLOW);
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_p: unknown): void {
    const now = Date.now();
    for (const [id, slow] of this._slows) {
      if (now >= slow.expiresAt) {
        this._restoreColors(slow.originalColors);
        this._slows.delete(id);
        this._enemyService.setSpeedFactor(id, 1);
      }
    }
  }

  @subscribe(Events.EnemyDied)
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    this._slows.delete(p.enemyId);
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._slows.clear(); // enemy entities are already destroyed by EnemyService
  }

  @subscribe(Events.EnemyReachedEnd)
  onEnemyReachedEnd(p: Events.EnemyReachedEndPayload): void {
    const slow = this._slows.get(p.enemyId);
    if (slow) this._restoreColors(slow.originalColors);
    this._slows.delete(p.enemyId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _captureColors(entity: Entity): Map<ColorComponent, Color> {
    const map = new Map<ColorComponent, Color>();
    for (const child of entity.getChildren()) {
      const c = child.getComponent(ColorComponent);
      if (c) map.set(c, new Color(c.color.r, c.color.g, c.color.b, c.color.a));
      for (const [cc, col] of this._captureColors(child)) map.set(cc, col);
    }
    return map;
  }

  private _applyTint(entity: Entity, tint: Color): void {
    for (const child of entity.getChildren()) {
      const c = child.getComponent(ColorComponent);
      if (c) {
        const L = c.color.r * 0.2126 + c.color.g * 0.7152 + c.color.b * 0.0722;
        c.color = new Color(tint.r * L, tint.g * L, tint.b * L, c.color.a);
      }
      this._applyTint(child, tint);
    }
  }

  private _restoreColors(map: Map<ColorComponent, Color>): void {
    for (const [c, orig] of map) c.color = orig;
  }
}
