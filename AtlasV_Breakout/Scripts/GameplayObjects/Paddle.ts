import { Color, component, Component, ExecuteOn, NetworkingService, OnEntityStartEvent, OnFocusedInteractionInputEventPayload, OnFocusedInteractionInputMovedEvent, OnFocusedInteractionInputStartedEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload, subscribe, TransformComponent, Vec3, ColorComponent, type Maybe } from 'meta/worlds';
import { Events, PowerUpType, type ICollider, type Rect } from '../Types';
import { BOUNDS } from '../Constants';
import { CollisionManager } from '../CollisionManager';
import { createPaddleEffect, type IPowerUpEffect, type PaddleContext } from './PaddleEffects';
import { LEVELS, LEVEL_DEFAULTS, DEFAULT_PALETTE, type ColorPalette } from '../LevelConfig';

type ActiveEffect = { effect: IPowerUpEffect; timers: number[]; };

/**
 * Paddle Component
 *
 * Component Attachment: Scene Entity (Paddle object in space.hstf)
 * Component Networking: Local (runs on client only)
 * Component Ownership: Client owns this local entity
 *
 * Controls the paddle movement and dispatches power-up effects generically.
 */
@component()
export class Paddle extends Component implements ICollider {
  private _transform!: TransformComponent;
  private _colorComponent: Maybe<ColorComponent> = null;
  private _targetPosition: Vec3 = Vec3.zero;
  private _resetPosition: Vec3 = Vec3.zero;
  private _normalScale: Vec3 = Vec3.one;

  readonly colliderTag = 'paddle';

  private _isActive = true;
  private _activeEffects = new Map<PowerUpType, ActiveEffect>();
  private _paddleCtx!: PaddleContext;
  private _baseColor: Color = new Color(1, 1, 1, 1);

  private _colorSlot = 0;
  private _colorSlotTimer = 0;
  private static readonly COLOR_SLOT_DURATION = 0.5;
  private _flashUntil = 0;
  private _lerpFactor: number = LEVEL_DEFAULTS.paddleLerpFactor;
  private _isClient = false;

  @subscribe(OnEntityStartEvent)
  onStart() {
    this._isClient = !NetworkingService.get().isServerContext();
    if (!this._isClient) return;
    this.entity.requestOwnership();

    this._transform = this.entity.getComponent(TransformComponent)!;
    const color = this.entity.getChildrenWithComponent(ColorComponent);
    if (color.length > 0) {
      this._colorComponent = color[0].getComponent(ColorComponent);
    }

    this._targetPosition = this._transform.worldPosition;
    this._resetPosition = this._transform.worldPosition;
    this._normalScale = this._transform.localScale;

    CollisionManager.get().register(this);
    this._lerpFactor = LEVELS[0].physics?.paddleLerpFactor ?? LEVEL_DEFAULTS.paddleLerpFactor;
    this._applyPalette(LEVELS[0].palette);
  }

  @subscribe(Events.LoadLevel)
  private onLoadLevel(payload: Events.LoadLevelPayload): void {
    const config = LEVELS[payload.levelIndex];
    this._lerpFactor = config.physics?.paddleLerpFactor ?? LEVEL_DEFAULTS.paddleLerpFactor;
    this._applyPalette(config.palette);
  }

  private _applyPalette(palette: ColorPalette | undefined): void {
    const [r, g, b] = palette?.paddle ?? DEFAULT_PALETTE.paddle;
    this._baseColor = new Color(r, g, b, 1);
    if (this._colorComponent) this._colorComponent.color = this._baseColor;
    this._paddleCtx = {
      transform: this._transform,
      colorComponent: this._colorComponent,
      normalScale: this._normalScale,
    };
  }

  getColliderBounds(): Rect {
    const pos = this._transform.worldPosition;
    const hw = this._transform.localScale.x * 0.5;
    const hh = this._transform.localScale.y * 0.5;
    return { x: pos.x - hw, y: pos.y - hh, w: hw * 2, h: hh * 2 };
  }

  onCollision(other: ICollider): void {
    if (other.colliderTag !== 'ball') return;
    if (this._colorComponent) {
      this._colorComponent.color = new Color(1, 1, 1, 1);
      this._flashUntil = Date.now() + 50;
    }
  }

  @subscribe(Events.ResetRound)
  private onResetRound(): void {
    this.reset();
  }

  private reset(): void {
    this._isActive = false;
    this._targetPosition = this._resetPosition;
    this._transform.worldPosition = this._resetPosition;

    for (const { effect } of this._activeEffects.values()) {
      effect.onEnd(this._paddleCtx);
    }
    this._activeEffects.clear();
  }

  @subscribe(Events.PowerUpCollected)
  private onPowerUpCollected(payload: Events.PowerUpCollectedPayload): void {
    const type = payload.powerUpType;
    const existing = this._activeEffects.get(type);

    if (existing) {
      if (existing.effect.stackable) {
        // Stack: new instance with its own timer
        existing.timers.push(payload.duration);
        existing.effect.onStackChanged?.(this._paddleCtx, existing.timers.length);
      } else {
        // Refresh: restart from the new timer duration
        existing.timers[0] = payload.duration;
      }
    } else {
      const effect = createPaddleEffect(type);
      effect.onStart(this._paddleCtx);
      if (effect.stackable) effect.onStackChanged?.(this._paddleCtx, 1);
      this._activeEffects.set(type, { effect, timers: [payload.duration] });
    }
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(_payload: OnFocusedInteractionInputEventPayload): void {
    this._isActive = true;
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMoved(payload: OnFocusedInteractionInputEventPayload): void {
    if (!this._isActive) return;
    if (payload.interactionIndex !== 0) return;
    const origin = payload.worldRayOrigin;
    const direction = payload.worldRayDirection;

    const planeZ = this._transform.worldPosition.z;
    const t = (planeZ - origin.z) / direction.z;
    this._targetPosition = new Vec3(
      origin.x + t * direction.x,
      this._transform.worldPosition.y,
      planeZ
    );
  }

  updatePowerups(deltaTime: number): void {
    // ── Tick timers ──────────────────────────────────────────────────────────
    for (const [type, active] of this._activeEffects) {
      const { effect, timers } = active;

      if (!effect.stackable) {
        timers[0] -= deltaTime;
        if (timers[0] <= 0) {
          effect.onEnd(this._paddleCtx);
          this._activeEffects.delete(type);
        }
      } else {
        const before = timers.length;
        for (let i = timers.length - 1; i >= 0; i--) {
          timers[i] -= deltaTime;
          if (timers[i] <= 0) timers.splice(i, 1);
        }
        if (timers.length === 0) {
          effect.onEnd(this._paddleCtx);
          this._activeEffects.delete(type);
        } else if (timers.length !== before) {
          effect.onStackChanged?.(this._paddleCtx, timers.length);
        }
      }
    }

    // ── Color cycling ─────────────────────────────────────────────────────
    if (this._colorComponent && Date.now() >= this._flashUntil) {
      const effects = [...this._activeEffects.values()];
      if (effects.length === 0) {
        this._colorComponent.color = this._baseColor;
      } else {
        this._colorSlotTimer -= deltaTime;
        if (this._colorSlotTimer <= 0) {
          this._colorSlot = (this._colorSlot + 1) % effects.length;
          this._colorSlotTimer = Paddle.COLOR_SLOT_DURATION;
        }
        this._colorSlot = Math.min(this._colorSlot, effects.length - 1);
        this._colorComponent.color = effects[this._colorSlot].effect.color;
      }
    }
  }


  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._isClient) return;
    this.updatePowerups(payload.deltaTime);

    // Move paddle
    const current = this._transform.worldPosition;
    const dx = this._targetPosition.x - current.x;
    const newX = current.x + dx * this._lerpFactor;
    const halfwidth = this._transform.localScale.x * 0.5;
    const clampedX = Math.max(BOUNDS.x + halfwidth, Math.min(BOUNDS.x + BOUNDS.w - halfwidth, newX));
    this._transform.worldPosition = new Vec3(clampedX, current.y, current.z);
  }
}
