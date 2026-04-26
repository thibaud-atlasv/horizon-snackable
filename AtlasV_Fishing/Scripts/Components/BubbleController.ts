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
} from '../Constants';
import { Events } from '../Types';
import { BubblePool } from '../Services/BubblePool';

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
    this._driftFreq  = 1.2 + Math.random() * 1.6;
    this._driftAmp   = 0.04 + Math.random() * 0.06;
    this._driftPhase = Math.random() * Math.PI * 2;
    this._breathFreq = 1.8 + Math.random() * 1.4;
    this._alphaFreq  = 0.8 + Math.random() * 0.8;
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

    if (newY >= (WATER_SURFACE_Y - 0.5)) {
      this._active = false;
      BubblePool.get().release(this.entity);
      return;
    }

    // Horizontal wobble — absolute offset from spawn X
    const driftX = Math.sin(this._elapsed * this._driftFreq + this._driftPhase) * this._driftAmp;
    this._tc.worldPosition = new Vec3(this._spawnX + driftX, newY, pos.z);

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
