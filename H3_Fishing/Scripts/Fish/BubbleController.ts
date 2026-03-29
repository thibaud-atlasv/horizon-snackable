import {
  Color,
  ColorComponent,
  Component,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  TransformComponent,
  Vec3,
  component,
  subscribe,
  type Maybe,
} from 'meta/worlds';

import {
  COLOR_BUBBLE,
  BUBBLE_RISE_SPEED_MIN, BUBBLE_RISE_SPEED_MAX,
  BUBBLE_SCALE_MIN, BUBBLE_SCALE_MAX,
  BUBBLE_LIFETIME_MIN, BUBBLE_LIFETIME_MAX,
} from '../Constants';

// =============================================================================
//  BubbleController
//
//  Self-contained bubble: randomises its own scale, rise speed and lifetime
//  on start, then rises upward and fades out before destroying itself.
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Place on the bubble template entity.
//  The entity needs a ColorComponent for the alpha fade.
// =============================================================================

@component()
export class BubbleController extends Component {

  private _tc!: TransformComponent;
  private _cc: Maybe<ColorComponent> = null;

  private _riseSpeed   = 0.3;
  private _lifetime    = 3.0;
  private _maxLifetime = 3.0;
  private _destroyed   = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this._tc = this.entity.getComponent(TransformComponent)!;
    this._cc = this.entity.getComponent(ColorComponent);

    const scale      = BUBBLE_SCALE_MIN + Math.random() * (BUBBLE_SCALE_MAX - BUBBLE_SCALE_MIN);
    this._riseSpeed  = BUBBLE_RISE_SPEED_MIN + Math.random() * (BUBBLE_RISE_SPEED_MAX - BUBBLE_RISE_SPEED_MIN);
    this._lifetime   = BUBBLE_LIFETIME_MIN + Math.random() * (BUBBLE_LIFETIME_MAX - BUBBLE_LIFETIME_MIN);
    this._maxLifetime = this._lifetime;

    this._tc.localScale = new Vec3(scale, scale, scale);
    if (this._cc) this._cc.color = new Color(COLOR_BUBBLE.r, COLOR_BUBBLE.g, COLOR_BUBBLE.b, 1);
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._destroyed) return;

    const dt = p.deltaTime;
    this._lifetime -= dt;

    if (this._lifetime <= 0) {
      this._destroyed = true;
      this.entity.destroy();
      return;
    }

    // Rise
    const pos = this._tc.worldPosition;
    this._tc.worldPosition = new Vec3(pos.x, pos.y + this._riseSpeed * dt, pos.z);

    // Fade out over the last 40% of lifetime
    if (this._cc) {
      const fadeStart = this._maxLifetime * 0.4;
      if (this._lifetime < fadeStart) {
        const alpha = this._lifetime / fadeStart;
        this._cc.color = new Color(COLOR_BUBBLE.r, COLOR_BUBBLE.g, COLOR_BUBBLE.b, alpha);
      }
    }
  }
}
