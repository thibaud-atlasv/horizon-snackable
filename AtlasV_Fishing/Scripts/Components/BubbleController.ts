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
  WorldService,
} from 'meta/worlds';

import {
  COLOR_BUBBLE,
  WATER_SURFACE_Y,
  BUBBLE_RISE_SPEED_MIN, BUBBLE_RISE_SPEED_MAX,
  BUBBLE_SCALE_MIN, BUBBLE_SCALE_MAX,
  BUBBLE_DRIFT_FREQ_MIN, BUBBLE_DRIFT_FREQ_MAX,
  BUBBLE_DRIFT_AMP_MIN, BUBBLE_DRIFT_AMP_MAX,
  BUBBLE_BREATH_FREQ_MIN, BUBBLE_BREATH_FREQ_MAX,
  BUBBLE_ALPHA_FREQ_MIN, BUBBLE_ALPHA_FREQ_MAX,
  HALF_SCREEN_WORLD_HEIGHT,
  FISH_LEFT, FISH_RIGHT,
} from '../Constants';
import { Events } from '../Types';
import { BubblePool } from '../Services/BubblePool';
import { GameCameraService } from '../Services/GameCameraService';

// =============================================================================
//  BubbleController
//
//  Pooled bubble: activated by Events.InitBubble (targeted), rises until it
//  hits WATER_SURFACE_Y, then returns itself to BubblePool.
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Place on the Bubble.hstf template entity.
//  The entity needs a ColorComponent for the alpha animation.
// =============================================================================

@component()
export class BubbleController extends Component {

  private _tc!: TransformComponent;
  private _cc: Maybe<ColorComponent> = null;

  private _active     = false;
  private _riseSpeed  = 0.3;
  private _elapsed    = 0;

  private _baseScale   = 0;
  private _spawnX      = 0;
  private _driftFreq   = 0;
  private _driftAmp    = 0;
  private _driftPhase  = 0;
  private _breathFreq  = 0;
  private _alphaFreq   = 0;
  private _alphaPhase  = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._tc = this.entity.getComponent(TransformComponent)!;
    this._cc = this.entity.getComponent(ColorComponent);
  }

  @subscribe(Events.InitBubble)
  private _onInit(p: Events.InitBubblePayload): void {
    const scale      = BUBBLE_SCALE_MIN + Math.random() * (BUBBLE_SCALE_MAX - BUBBLE_SCALE_MIN);
    this._riseSpeed  = BUBBLE_RISE_SPEED_MIN + Math.random() * (BUBBLE_RISE_SPEED_MAX - BUBBLE_RISE_SPEED_MIN);
    this._baseScale  = scale;
    this._spawnX     = p.x;
    this._elapsed    = 0;
    this._driftFreq  = BUBBLE_DRIFT_FREQ_MIN  + Math.random() * (BUBBLE_DRIFT_FREQ_MAX  - BUBBLE_DRIFT_FREQ_MIN);
    this._driftAmp   = BUBBLE_DRIFT_AMP_MIN   + Math.random() * (BUBBLE_DRIFT_AMP_MAX   - BUBBLE_DRIFT_AMP_MIN);
    this._driftPhase = Math.random() * Math.PI * 2;
    this._breathFreq = BUBBLE_BREATH_FREQ_MIN + Math.random() * (BUBBLE_BREATH_FREQ_MAX - BUBBLE_BREATH_FREQ_MIN);
    this._alphaFreq  = BUBBLE_ALPHA_FREQ_MIN  + Math.random() * (BUBBLE_ALPHA_FREQ_MAX  - BUBBLE_ALPHA_FREQ_MIN);
    this._alphaPhase = Math.random() * Math.PI * 2;

    if (this._tc) {
      this._tc.worldPosition = new Vec3(p.x, p.y, 0);
      this._tc.localScale    = new Vec3(scale, scale, scale);
    }
    if (this._cc) this._cc.color = new Color(COLOR_BUBBLE.r, COLOR_BUBBLE.g, COLOR_BUBBLE.b, 0.8);

    this._active = true;
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._active) return;

    const dt = p.deltaTime;
    this._elapsed += dt;

    const pos  = this._tc.worldPosition;
    const newY = pos.y + this._riseSpeed * dt;

    // Release if bubble reached the water surface
    if (newY >= (WATER_SURFACE_Y - 0.5)) {
      this._active = false;
      BubblePool.get().release(this.entity);
      return;
    }

    // Release if bubble drifted off-screen (above camera top or outside X bounds)
    const camCenterY = GameCameraService.get().getCameraCenterY();
    const driftX = Math.sin(this._elapsed * this._driftFreq + this._driftPhase) * this._driftAmp;
    const currentX = this._spawnX + driftX;
    if (newY > camCenterY + HALF_SCREEN_WORLD_HEIGHT + 2
        || currentX < FISH_LEFT - 2
        || currentX > FISH_RIGHT + 2) {
      this._active = false;
      BubblePool.get().release(this.entity);
      return;
    }

    // Horizontal wobble — absolute offset from spawn X
    this._tc.worldPosition = new Vec3(currentX, newY, pos.z);

    // Scale breathing
    const s = this._baseScale * (1 + 0.08 * Math.sin(this._elapsed * this._breathFreq));
    this._tc.localScale = new Vec3(s, s, s);

    // Alpha oscillation
    if (this._cc) {
      const alpha = 0.75 + 0.20 * Math.sin(this._elapsed * this._alphaFreq + this._alphaPhase);
      this._cc.color = new Color(COLOR_BUBBLE.r, COLOR_BUBBLE.g, COLOR_BUBBLE.b, alpha);
    }
  }
}
