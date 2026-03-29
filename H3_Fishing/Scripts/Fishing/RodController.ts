import {
  Color,
  ColorComponent,
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  OnFocusedInteractionInputStartedEvent,
  type OnFocusedInteractionInputEventPayload,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  TransformComponent,
  Vec3,
  WorldService,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';

import {
  WATER_SURFACE_Y, WATER_BOTTOM_Y, HALF_W,
  GRAVITY, MAX_LAUNCH_VX, MAX_LAUNCH_VY, WATER_DRAG,
  REEL_BURST_ADD, REEL_BURST_MAX, REEL_BURST_DECAY,
  REEL_HOLD_DUR, REEL_TAP_JUMP, REEL_SINK_SPEED,
  COLOR_LINE, COLOR_LINE_WATER,
} from '../Constants';
import { Events, GamePhase, HUDEvents } from '../Types';
import { FishingService } from './FishingService';
import { FishRegistry } from '../Fish/FishRegistry';

// =============================================================================
//  RodController
//
//  Single component that owns all rod visuals + bait physics.
//  Replaces BaitController + FishingLineRenderer.
//
//  Reads FishingService for tip/idle positions (set from scene at start).
//  Handles Falling and Reeling physics, including reel tap input.
//
//  ── Listens ──────────────────────────────────────────────────────────────────
//  Events.CastReleased    → init bait velocity
//  Events.PhaseChanged    → track phase, show/hide visuals
//  Events.PlayerTouchStart → reel tap (only during Reeling)
//  Events.Restart         → reset bait state
//
//  ── Emits ────────────────────────────────────────────────────────────────────
//  Events.BaitMoved       → every bait position update
//  Events.FishHooked      → bait collides with fish (during Falling)
//  Events.BaitHitBottom   → bait reaches floor (during Falling)
//  Events.BaitSurfaced    → reel complete, fish at surface
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Place on the rod entity (its world position = rod tip).
//  Assign baitEntity, lineAbove, lineBelow in inspector.
// =============================================================================

@component()
export class RodController extends Component {

  @property() baitEntity?: Entity;
  @property() lineAbove ?: Entity;
  @property() lineBelow ?: Entity;

  // ── Scene refs ────────────────────────────────────────────────────────────────
  private _baitTc!: TransformComponent;
  private _tipX = 0;
  private _tipY = 0;

  // ── Phase (local copy) ────────────────────────────────────────────────────────
  private _phase: GamePhase = GamePhase.Idle;

  // ── Bait physics ──────────────────────────────────────────────────────────────
  private _baitX  = 0;
  private _baitY  = 0;
  private _baitVX = 0;
  private _baitVY = 0;

  // ── Reel physics ──────────────────────────────────────────────────────────────
  private _reelBurstVel  = 0;
  private _reelHoldTimer = 0;
  private _reelTotalDist = 1.0;
  private _reelSinkSpeed = REEL_SINK_SPEED;
  private _hookedFishId  = -1;

  // ── Init ──────────────────────────────────────────────────────────────────────
  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    const tipTc = this.entity.getComponent(TransformComponent)!;
    this._tipX  = tipTc.worldPosition.x;
    this._tipY  = tipTc.worldPosition.y;

    const baitTc = this.baitEntity?.getComponent(TransformComponent);
    this._baitTc = baitTc!;
    const idleX  = baitTc?.worldPosition.x ?? this._tipX;
    const idleY  = baitTc?.worldPosition.y ?? this._tipY;

    FishingService.get().setIdlePose(this._tipX, this._tipY, idleX, idleY);

    this._baitX = idleX;
    this._baitY = idleY;

    const baitCc = this.baitEntity?.getComponent(ColorComponent);
    this._applyColor(this.lineAbove, COLOR_LINE);
    this._applyColor(this.lineBelow, COLOR_LINE_WATER);

    this._updateLines(idleX, idleY);
    this._moveBait(idleX, idleY);
  }

  // ── Input ─────────────────────────────────────────────────────────────────────
  @subscribe(OnFocusedInteractionInputStartedEvent)
  private _onTouchStart(_p: OnFocusedInteractionInputEventPayload): void {
    if (this._phase !== GamePhase.Reeling) return;
    this._reelBurstVel  = Math.min(this._reelBurstVel + REEL_BURST_ADD, REEL_BURST_MAX);
    this._baitY         = Math.min(WATER_SURFACE_Y + 0.2, this._baitY + REEL_TAP_JUMP);
    this._reelHoldTimer = REEL_HOLD_DUR;
  }

  // ── Phase sync ────────────────────────────────────────────────────────────────
  @subscribe(Events.PhaseChanged)
  private _onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._phase = p.phase;

    if (p.phase === GamePhase.CatchDisplay) {
      // Snap bait to idle so the dangling animation starts from the correct position
      const s = FishingService.get();
      this._moveBait(s.idleX, s.idleY);
    }
  }

  // ── Cast ─────────────────────────────────────────────────────────────────────
  @subscribe(Events.CastReleased)
  private _onCastReleased(p: Events.CastReleasedPayload): void {
    this._baitVX = p.chargeLevel * MAX_LAUNCH_VX;
    this._baitVY = MAX_LAUNCH_VY;
    this._baitX  = FishingService.get().tipX;
    this._baitY  = FishingService.get().tipY;
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = p.deltaTime;
    const t  = WorldService.get().getWorldTime();

    switch (this._phase) {
      case GamePhase.Idle:
      case GamePhase.CatchDisplay:
      case GamePhase.Reset: {
        const s = FishingService.get();
        this._moveBait(s.idleX, s.idleY + Math.sin(t * 1.0) * 0.035);
        break;
      }
      case GamePhase.Falling:
        this._tickFalling(dt);
        break;
      case GamePhase.Reeling:
        this._tickReeling(dt);
        break;
    }
  }

  // ── Falling ───────────────────────────────────────────────────────────────────
  private _tickFalling(dt: number): void {
    this._baitVY += GRAVITY * dt;
    this._baitX  += this._baitVX * dt;
    this._baitY  += this._baitVY * dt;

    if (this._baitY <= WATER_SURFACE_Y && Math.abs(this._baitVX) > 0.01) {
      this._baitVX *= Math.max(0, 1 - WATER_DRAG * dt);
    }
    this._baitX = Math.max(-HALF_W + 0.3, Math.min(HALF_W - 0.3, this._baitX));
    this._moveBait(this._baitX, this._baitY);

    const hit = FishRegistry.get().findHit(this._baitX, this._baitY);
    if (hit) {
      // Init reel state before notifying external systems
      const targetY = WATER_SURFACE_Y + 0.2;
      this._hookedFishId  = hit.fishId;
      this._reelBurstVel  = 0;
      this._reelHoldTimer = 0;
      this._baitVX        = 0;
      this._baitVY        = 0;
      this._baitX         = hit.worldX;
      this._baitY         = hit.worldY + 0.2;
      this._reelTotalDist = Math.max(0.1, targetY - this._baitY);
      this._reelSinkSpeed = REEL_SINK_SPEED * hit.size;
      EventService.sendLocally(Events.FishHooked, {
        fishId:   hit.fishId,
        fishX:    hit.worldX,
        fishY:    hit.worldY,
        fishSize: hit.size,
      });
      return;
    }

    if (this._baitY <= WATER_BOTTOM_Y) {
      this._baitVX = 0;
      this._baitVY = 0;
      this._moveBait(this._baitX, WATER_BOTTOM_Y);
      EventService.sendLocally(Events.BaitHitBottom, {});
    }
  }

  // ── Reeling ───────────────────────────────────────────────────────────────────
  private _tickReeling(dt: number): void {
    const targetY = WATER_SURFACE_Y + 0.2;

    if (this._reelHoldTimer > 0) {
      this._reelHoldTimer -= dt;
    } else {
      this._reelBurstVel *= Math.max(0, 1 - REEL_BURST_DECAY * dt);
    }

    const netVel = this._reelBurstVel - this._reelSinkSpeed;
    this._baitY  = Math.max(WATER_BOTTOM_Y + 0.1, Math.min(targetY, this._baitY + netVel * dt));
    this._baitX += (FishingService.get().tipX - this._baitX) * 0.012;
    this._moveBait(this._baitX, this._baitY);

    const inst = FishRegistry.get().getInstance(this._hookedFishId);
    if (inst) inst.setPosition(this._baitX, this._baitY - 0.3 * inst.size);

    const remaining = targetY - this._baitY;
    const ratio = 1.0 - Math.max(0, remaining) / Math.max(0.01, this._reelTotalDist);
    EventService.sendLocally(HUDEvents.UpdateGauge, { value: Math.max(0, ratio), mode: 'reel' });

    if (this._baitY >= targetY - 0.1) {
      EventService.sendLocally(Events.BaitSurfaced, { fishId: this._hookedFishId });
    }
  }

  // ── Restart ───────────────────────────────────────────────────────────────────
  @subscribe(Events.Restart)
  private _onRestart(_p: Events.RestartPayload): void {
    const s = FishingService.get();
    this._baitX        = s.idleX;
    this._baitY        = s.idleY;
    this._baitVX       = 0;
    this._baitVY       = 0;
    this._reelBurstVel = 0;
    this._hookedFishId = -1;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  private _moveBait(x: number, y: number): void {
    this._baitX = x;
    this._baitY = y;
    if (this._baitTc) this._baitTc.worldPosition = new Vec3(x, y, 0);
    this._updateLines(x, y);
    EventService.sendLocally(Events.BaitMoved, { x, y });
  }

  private _updateLines(bx: number, by: number): void {
    const aboveEndY = Math.max(by, WATER_SURFACE_Y);
    this._stretchLine(this.lineAbove, this._tipX, this._tipY, bx, aboveEndY);

    const submerged = by < WATER_SURFACE_Y;
    const showBelow = submerged;
    if (this.lineBelow) this.lineBelow.enabledSelf = showBelow;
    if (showBelow) this._stretchLine(this.lineBelow, bx, WATER_SURFACE_Y, bx, by);
  }

  private _stretchLine(e: Entity | undefined, x1: number, y1: number, x2: number, y2: number): void {
    if (!e) return;
    const tc = e.getComponent(TransformComponent);
    if (!tc) return;
    const dx  = x2 - x1;
    const dy  = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;
    const angDeg = Math.atan2(-dx, dy) * (180 / Math.PI);
    tc.worldPosition = new Vec3((x1 + x2) / 2, (y1 + y2) / 2, 0);
    tc.localScale    = new Vec3(0.04, len, 0.04);
    tc.worldRotation = Quaternion.fromEuler(new Vec3(0, 0, angDeg));
  }

  private _applyColor(e: Entity | undefined, c: { r: number; g: number; b: number }): void {
    const cc = e?.getComponent(ColorComponent);
    if (cc) cc.color = new Color(c.r, c.g, c.b, 1);
  }
}
