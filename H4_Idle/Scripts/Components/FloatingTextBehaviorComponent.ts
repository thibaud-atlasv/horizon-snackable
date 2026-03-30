/**
 * FloatingTextBehaviorComponent.ts — Animates floating text (float up + fade out).
 *
 * Component Attachment: Spawned FloatingText template entity
 * Component Networking: Local (spawned with NetworkMode.LocalOnly)
 * Component Ownership: Not Networked (client-only visual feedback)
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  TransformComponent,
  WorldTextComponent,
  Color,
  Vec3,
  clamp,
  NetworkingService,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

/** How fast the text floats upward (world units per second). */
const FLOAT_SPEED = 2.5;
/** How long the animation lasts (seconds). */
const ANIM_DURATION = 1.0;

@component()
export class FloatingTextBehaviorComponent extends Component {
  private _transform: Maybe<TransformComponent> = null;
  private _worldText: Maybe<WorldTextComponent> = null;
  private _elapsed: number = 0;
  private _startY: number = 0;
  private _baseColor: Color = Color.white;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    // Client-only component — skip on server
    if (NetworkingService.get().isServerContext()) return;

    this._transform = this.entity.getComponent(TransformComponent);
    this._worldText = this.entity.getComponent(WorldTextComponent);

    if (this._worldText) {
      this._baseColor = this._worldText.color;
    }

    if (this._transform) {
      this._startY = this._transform.localPosition.y;
    }

    console.log(`[FloatingTextBehavior] Started`);
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    // Client-only component — skip on server
    if (NetworkingService.get().isServerContext()) return;
    if (!this._transform || !this._worldText) return;

    this._elapsed += payload.deltaTime;
    const t = clamp(this._elapsed / ANIM_DURATION, 0, 1);

    // Float upward
    const newY = this._startY + FLOAT_SPEED * this._elapsed;
    const pos = this._transform.localPosition;
    this._transform.localPosition = new Vec3(pos.x, newY, pos.z);

    // Fade out (alpha from 1 to 0)
    const alpha = 1 - t;
    this._worldText.color = new Color(
      this._baseColor.r,
      this._baseColor.g,
      this._baseColor.b,
      alpha,
    );

    // Destroy when animation completes
    if (t >= 1) {
      console.log('[FloatingTextBehavior] Animation complete, destroying entity');
      this.entity.destroy();
    }
  }
}
