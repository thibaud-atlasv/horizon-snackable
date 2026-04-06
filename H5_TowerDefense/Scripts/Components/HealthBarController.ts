/**
 * HealthBarController — Animates a pooled health bar entity above an enemy.
 *
 * Attached to: pooled health bar entities (managed by HealthBarService).
 * onUpdateHealthBar (UpdateHealthBar event targeted to this entity): positions the bar
 *   at worldX/Y/Z + HEALTHBAR_OFFSET_X ahead of enemy, scales fill width by hp/maxHp.
 *   Green → yellow → red color gradient based on remaining HP ratio.
 * onParkHealthBar (ParkHealthBar event targeted to this entity): moves bar off-screen.
 * Health bars are assigned and released by HealthBarService via targeted events.
 */
import { Component, TransformComponent, ColorComponent, Color, Vec3 } from 'meta/worlds';
import { component, property, subscribe } from 'meta/worlds';
import { OnEntityStartEvent } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { Events } from '../Types';
import { PROJECTILE_POOL_Y } from '../Constants';

const COLOR_HIGH       = new Color(0.2,  0.85, 0.2,  1);
const COLOR_MED        = new Color(1.0,  0.55, 0.0,  1);
const COLOR_LOW        = new Color(0.9,  0.15, 0.15, 1);

@component()
export class HealthBarController extends Component {
  @property() fillEntity:       Entity | null = null;

  private _fillTransform!:  TransformComponent;
  private _fillColor!:      ColorComponent;
  private _barTransform!:   TransformComponent;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this.fillEntity) {
      this._barTransform = this.entity.getComponent(TransformComponent)!;
      this._fillTransform = this.fillEntity.getComponent(TransformComponent)!;
      this._fillColor     = this.fillEntity.getComponent(ColorComponent)!;
      this._fillTransform.localPosition = new Vec3(0, 0.01, 0);
    }
  }

  @subscribe(Events.UpdateHealthBar)
  onUpdate(p: Events.UpdateHealthBarPayload): void {
    if (this._barTransform) this._barTransform.worldPosition = new Vec3(p.worldX, p.worldY, p.worldZ);

    const ratio = p.maxHp > 0 ? Math.max(0, p.hp / p.maxHp) : 0;
    if (this._fillTransform) {
      this._fillTransform.localScale    = new Vec3(1, 1, ratio);
      this._fillTransform.localPosition = new Vec3(0, 0.02, (ratio - 1) * 0.5);
    }
    if (this._fillColor) {
      this._fillColor.color = ratio > 0.6 ? COLOR_HIGH : ratio > 0.3 ? COLOR_MED : COLOR_LOW;
    }
  }

  @subscribe(Events.ParkHealthBar)
  onPark(_p: Events.ParkHealthBarPayload): void {
    if (this._barTransform) this._barTransform.worldPosition = new Vec3(0, PROJECTILE_POOL_Y, 0);
  }
}
