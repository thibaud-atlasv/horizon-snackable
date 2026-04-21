import {
  Service, service, subscribe,
  TransformComponent, Vec3, WorldService,
  OnWorldUpdateEvent,
} from 'meta/worlds';
import type { Entity, Maybe, OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';

@service()
export class CameraShakeService extends Service {

  private _transform: Maybe<TransformComponent> = null;
  private _originalPos: Vec3 = Vec3.zero;

  private _shaking: boolean = false;
  private _shakeIntensity: number = 0;
  private _shakeDuration: number = 0;
  private _shakeEnd: number = 0;

  init(cameraEntity: Entity): void {
    this._transform = cameraEntity.getComponent(TransformComponent);
    if (!this._transform) return;
    this._originalPos = this._transform.localPosition;
  }

  shake(intensity: number, duration: number): void {
    if (!this._transform) return;
    // Capture rest position only when not already mid-shake to avoid drift
    if (!this._shaking) {
      this._originalPos = this._transform.localPosition;
    }
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeEnd = WorldService.get().getWorldTime() + duration;
    this._shaking = true;
  }

  @subscribe(Events.EnemyReachedEnd)
  onEnemyReachedEnd(_p: Events.EnemyReachedEndPayload): void {
    this.shake(0.15, 0.3);
  }

  @subscribe(Events.EnemyDied)
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    if (p.reward >= 50) this.shake(0.12, 0.25);
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_p: OnWorldUpdateEventPayload): void {
    if (!this._shaking || !this._transform) return;

    const now = WorldService.get().getWorldTime();
    const remaining = this._shakeEnd - now;

    if (remaining <= 0) {
      this._transform.localPosition = this._originalPos;
      this._shaking = false;
      return;
    }

    const factor = remaining / this._shakeDuration;
    const range = this._shakeIntensity * factor;
    const offsetX = (Math.random() * 2 - 1) * range;
    const offsetY = (Math.random() * 2 - 1) * range;
    this._transform.localPosition = this._originalPos.add(new Vec3(offsetX, offsetY, 0));
  }
}
