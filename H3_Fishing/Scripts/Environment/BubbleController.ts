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
  property,
  subscribe,
} from 'meta/worlds';

import {
  BUBBLE_RISE_SPEED_MIN, BUBBLE_RISE_SPEED_MAX,
  BUBBLE_SCALE_MIN, BUBBLE_SCALE_MAX,
  WATER_SURFACE_Y, COLOR_BUBBLE,
} from '../Constants';

/**
 * BubbleController — self-contained bubble particle.
 *
 * Spawned by BubbleSpawner (ambient) or FishController (fish-pause bubbles).
 * Self-destructs when it reaches the water surface.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────────
 * Attach to the bubble template entity (Bubble.hstf).
 * Entity must have TransformComponent and ColorComponent.
 *
 * @property spawnY   — starting depth (set by spawner before EvInitBubble, or via init())
 * @property spawnX   — horizontal spawn position
 */
@component()
export class BubbleController extends Component {

  @property() spawnX: number = 0;
  @property() spawnY: number = 0;

  private _x        = 0;
  private _y        = 0;
  private _riseSpeed = 0;
  private _baseScale = 0;
  private _wobblePhase = 0;
  private _wobbleFreq  = 0;
  private _alpha       = 0;
  private _tc?: TransformComponent | null;
  private _cc?: ColorComponent | null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._tc = this.entity.getComponent(TransformComponent);
    this._cc = this.entity.getComponent(ColorComponent);

    this._x          = this.spawnX;
    this._y          = this.spawnY;
    this._riseSpeed  = BUBBLE_RISE_SPEED_MIN + Math.random() * (BUBBLE_RISE_SPEED_MAX - BUBBLE_RISE_SPEED_MIN);
    this._baseScale  = BUBBLE_SCALE_MIN      + Math.random() * (BUBBLE_SCALE_MAX      - BUBBLE_SCALE_MIN);
    this._wobblePhase = Math.random() * Math.PI * 2;
    this._wobbleFreq  = 0.8 + Math.random() * 0.8;
    this._alpha       = 0;

    if (this._tc) this._tc.localPosition = new Vec3(this._x, this._y, 0.2);
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = p.deltaTime;

    this._y += this._riseSpeed * dt;
    this._wobblePhase += this._wobbleFreq * dt;
    this._x += Math.sin(this._wobblePhase) * 0.06 * dt;

    // Scale grows slightly as bubble approaches surface
    const distToSurface = Math.max(0, WATER_SURFACE_Y - this._y);
    const surfaceProximity = 1 - Math.min(1, distToSurface / 2);
    const scale = this._baseScale * (1 + surfaceProximity * 0.6);

    // Alpha fade-in then fade-out near surface
    if (this._alpha < 0.55) this._alpha = Math.min(0.55, this._alpha + dt / 1.5);
    if (surfaceProximity > 0.8) this._alpha = Math.max(0, 0.55 * (1 - (surfaceProximity - 0.8) / 0.2));

    if (this._tc) {
      this._tc.localPosition = new Vec3(this._x, this._y, 0.2);
      this._tc.localScale    = new Vec3(scale, scale, scale);
    }
    if (this._cc) {
      this._cc.color = new Color(COLOR_BUBBLE.r, COLOR_BUBBLE.g, COLOR_BUBBLE.b, this._alpha);
    }

    // Self-destruct at surface
    if (this._alpha <= 0.01 && this._y >= WATER_SURFACE_Y - 0.5) {
      this.entity.destroy();
    }
  }
}
