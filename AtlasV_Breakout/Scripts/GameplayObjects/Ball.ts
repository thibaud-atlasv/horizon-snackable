import { Color, ColorComponent, component, Component, EventService, ExecuteOn, NetworkingService, OnEntityStartEvent, OnFocusedInteractionInputEventPayload, OnFocusedInteractionInputStartedEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload, property, subscribe, TransformComponent, Vec3, type Maybe } from 'meta/worlds';
import { Events, type ICollider, type Rect } from '../Types';
import { BOUNDS } from '../Constants';
import { CollisionManager } from '../CollisionManager';
import { StickyBallState } from './StickyBallState';
import { LEVELS, LEVEL_DEFAULTS, DEFAULT_PALETTE, type ColorPalette, type GameplaySettings, type PhysicsSettings } from '../LevelConfig';
import { VfxService } from '../Services/VfxService';

@component()
export class Ball extends Component implements ICollider {
  private _resetPosition: Vec3 = Vec3.zero;
  private _transform!: TransformComponent;
  private _colorComponent: Maybe<ColorComponent> = null;
  private _velocity: Vec3 = Vec3.zero;
  private _sticky = new StickyBallState();
  private _baseScale: Vec3 = Vec3.one;

  readonly colliderTag = 'ball';

  private _isIdle = true;

  // ── Per-level physics ────────────────────────────────────────────────────
  private _speedMultiplier: number = LEVEL_DEFAULTS.ballSpeedMultiplier;
  private _gravity: number = LEVEL_DEFAULTS.gravity;
  private _bounceRandomness: number = LEVEL_DEFAULTS.bounceRandomness;
  private _speedBonus: number = 0;
  private _speedIncrementPerBrick: number = LEVEL_DEFAULTS.ballSpeedIncrementPerBrick;

  private get _effectiveSpeed(): number {
    return this.ballSpeed * this._speedMultiplier + this._speedBonus;
  }

  @property()
  private ballSpeed: number = 10.5;

  private _isClient = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._isClient = !NetworkingService.get().isServerContext();
    if (!this._isClient) return;
    this.entity.requestOwnership();
    this._transform = this.entity.getComponent(TransformComponent)!;
    this._resetPosition = this._transform.worldPosition;
    this._baseScale = this._transform.localScale;

    const children = this.entity.getChildrenWithComponent(ColorComponent);
    this._colorComponent = children.length > 0
      ? children[0].getComponent(ColorComponent)
      : this.entity.getComponent(ColorComponent);

    CollisionManager.get().register(this);
    this._applyPhysics(LEVELS[0].physics ?? {});
    this._applyPalette(LEVELS[0].palette);
    this._applyGameplay(LEVELS[0].gameplay);
  }

  @subscribe(Events.LoadLevel)
  private onLoadLevel(payload: Events.LoadLevelPayload): void {
    const config = LEVELS[payload.levelIndex];
    this._applyPhysics(config.physics ?? {});
    this._applyPalette(config.palette);
    this._applyGameplay(config.gameplay);
  }

  private _applyPalette(palette: ColorPalette | undefined): void {
    if (!this._colorComponent) return;
    const [r, g, b] = palette?.ball ?? DEFAULT_PALETTE.ball;
    this._colorComponent.color = new Color(r, g, b, 1);
  }

  private _applyPhysics(p: PhysicsSettings): void {
    this._speedMultiplier        = p.ballSpeedMultiplier        ?? LEVEL_DEFAULTS.ballSpeedMultiplier;
    this._gravity                = p.gravity                    ?? LEVEL_DEFAULTS.gravity;
    this._bounceRandomness       = p.bounceRandomness           ?? LEVEL_DEFAULTS.bounceRandomness;
    this._speedIncrementPerBrick = p.ballSpeedIncrementPerBrick ?? LEVEL_DEFAULTS.ballSpeedIncrementPerBrick;
  }

  private _applyGameplay(g: GameplaySettings | undefined): void {
    const m = g?.ballSizeMultiplier ?? LEVEL_DEFAULTS.ballSizeMultiplier;
    this._transform.localScale = new Vec3(
      this._baseScale.x * m,
      this._baseScale.y * m,
      this._baseScale.z,
    );
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(_payload: OnFocusedInteractionInputEventPayload): void {
    if (this._sticky.isStuck || this._isIdle) {
      this._launch();
      return;
    }
  }

  // ── Sticky ────────────────────────────────────────────────────────────────

  @subscribe(Events.StickyPaddleActivated)
  private onStickyPaddleActivated(): void {
    this._sticky.activate();
  }

  @subscribe(Events.StickyPaddleDeactivated)
  private onStickyPaddleDeactivated(): void {
    if (this._sticky.deactivate()) this._launch();
  }

  @subscribe(Events.BallLost)
  private onBallLost(): void {
    this._sticky.reset();
  }

  @subscribe(Events.BrickDestroyed)
  private onBrickDestroyed(): void {
    this._speedBonus += this._speedIncrementPerBrick;
  }

  private _launch(): void {
    this._isIdle = false;
    EventService.sendLocally(Events.ReleaseBall, {});
    const pos = this._transform.worldPosition;
    const v = this._sticky.getLaunchVelocity(this._effectiveSpeed, pos.x);
    if (v) this._velocity = v;
  }

  // ── Collision ─────────────────────────────────────────────────────────────

  getColliderBounds(): Rect {
    const pos = this._transform.worldPosition;
    const r = this._transform.localScale.x * 0.5;
    return { x: pos.x - r, y: pos.y - r, w: r * 2, h: r * 2 };
  }

  onCollision(other: ICollider): void {
    if (other.colliderTag === 'paddle' && this._velocity.y < 0) {
      const paddleBounds = other.getColliderBounds();
      const pos = this._transform.worldPosition;
      const r = this._transform.localScale.x * 0.5;

      this._transform.worldPosition = new Vec3(pos.x, paddleBounds.y + paddleBounds.h + r, pos.z);

      if (this._sticky.tryStick(other, pos.x)) return;

      this._bounceOffPaddle(paddleBounds, pos.x);
      return;
    }

    if (other.colliderTag === 'brick') {
      const brickBounds = other.getColliderBounds();
      const pos = this._transform.worldPosition;
      const r = this._transform.localScale.x * 0.5;

      const overlapX = Math.min(pos.x + r, brickBounds.x + brickBounds.w) - Math.max(pos.x - r, brickBounds.x);
      const overlapY = Math.min(pos.y + r, brickBounds.y + brickBounds.h) - Math.max(pos.y - r, brickBounds.y);

      const brickCx = brickBounds.x + brickBounds.w * 0.5;
      const brickCy = brickBounds.y + brickBounds.h * 0.5;

      let vx = this._velocity.x;
      let vy = this._velocity.y;

      if (overlapX < overlapY) {
        // Side collision — only flip if the ball is actually moving toward the brick horizontally.
        // This prevents a double-bounce when the ball is already exiting (e.g. after a lag spike).
        if ((vx > 0 && pos.x < brickCx) || (vx < 0 && pos.x > brickCx)) vx = -vx;
      } else {
        // Top/bottom collision — only flip if moving toward the brick vertically.
        if ((vy > 0 && pos.y < brickCy) || (vy < 0 && pos.y > brickCy)) vy = -vy;
      }
      [vx, vy] = this._withBounceRandomness(vx, vy);
      this._velocity = new Vec3(vx, vy, 0);
    }
  }

  private _bounceOffPaddle(paddleBounds: Rect, ballX: number): void {
    const paddleCenterX = paddleBounds.x + paddleBounds.w / 2;
    const hitFactor = (ballX - paddleCenterX) / (paddleBounds.w / 2);
    const angle = hitFactor * (Math.PI / 3);
    this._velocity = new Vec3(
      this._effectiveSpeed * Math.sin(angle),
      this._effectiveSpeed * Math.cos(angle),
      0
    );
  }

  /** Applies a slight angular variance to break repetitive bounce patterns. */
  private _withBounceRandomness(vx: number, vy: number): [number, number] {
    if (this._bounceRandomness === 0) return [vx, vy];
    const speed = Math.sqrt(vx * vx + vy * vy);
    const angle = Math.atan2(vy, vx) + (Math.random() - 0.5) * this._bounceRandomness * Math.PI;
    return [speed * Math.cos(angle), speed * Math.sin(angle)];
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  @subscribe(Events.ResetRound)
  private onResetRound(): void {
    this._velocity = Vec3.zero;
    setTimeout(() => { this._reset(); }, 200);
  }

  private _reset(): void {
    this._transform.worldPosition = this._resetPosition;
    this._velocity = Vec3.zero;
    this._isIdle = true;
    this._sticky.reset();
    this._speedBonus = 0;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._isClient) return;

    const initPos = this._transform.worldPosition;
    const r = this._transform.localScale.x * 0.5;

    const stuck = this._sticky.getConstrainedPosition(r, initPos.z);
    if (stuck) {
      this._transform.worldPosition = stuck;
      return;
    }

    if (this._isIdle) return;

    const dt = payload.deltaTime;

    // Split movement into substeps so the ball never travels more than one radius per step.
    // This prevents tunneling through bricks and ensures checkAgainst fires at intermediate positions.
    const speed = Math.sqrt(this._velocity.x ** 2 + this._velocity.y ** 2);
    const steps = Math.min(8, Math.max(1, Math.ceil((speed * dt) / r)));
    const subDt = dt / steps;

    const color = this._colorComponent?.color ?? Color.white;
    VfxService.get().spawnTrail(initPos.x, initPos.y, initPos.z, color.r, color.g, color.b);

    for (let s = 0; s < steps; s++) {
      let vx = this._velocity.x;
      let vy = this._velocity.y - this._gravity * subDt;

      const cur = this._transform.worldPosition;
      let nx = cur.x + vx * subDt;
      let ny = cur.y + vy * subDt;

      if (nx - r <= BOUNDS.x) {
        nx = BOUNDS.x + r;
        vx = Math.abs(vx);
        [vx, vy] = this._withBounceRandomness(vx, vy);
      } else if (nx + r >= BOUNDS.x + BOUNDS.w) {
        nx = BOUNDS.x + BOUNDS.w - r;
        vx = -Math.abs(vx);
        [vx, vy] = this._withBounceRandomness(vx, vy);
      }

      if (ny + r >= BOUNDS.y + BOUNDS.h) {
        ny = BOUNDS.y + BOUNDS.h - r;
        vy = -Math.abs(vy);
        [vx, vy] = this._withBounceRandomness(vx, vy);
      }

      if (ny - r <= BOUNDS.y) {
        EventService.sendLocally(Events.BallLost, {});
        return;
      }

      this._velocity = new Vec3(vx, vy, 0);
      this._transform.worldPosition = new Vec3(nx, ny, cur.z);

      // Check collisions at this substep position. onCollision may update this._velocity.
      CollisionManager.get().checkAgainst(this);
    }
  }
}
