import { Color, ColorComponent, component, Component, EventService, NetworkingService, OnEntityStartEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload, ExecuteOn, property, subscribe, TransformComponent, Vec3, Quaternion, type Maybe } from 'meta/worlds';
import { Events, RevealStyle, type IBrick, type ICollider, type Rect, type BrickColorPalette } from '../Types';
import { CollisionManager } from '../CollisionManager';
import { DEFAULT_PALETTE } from '../LevelConfig';
import { DEATH_DURATION, DEATH_SPIN_SPEED, REVEAL_DURATION, REVEAL_DROP_DURATION, REVEAL_OVERSHOOT } from '../Constants';

@component()
export class Brick extends Component implements IBrick {
  protected _transform!: TransformComponent;
  private _colorComponent: Maybe<ColorComponent> = null;

  readonly colliderTag = 'brick';

  @property()
  hits: number = 1;

  @property()
  indestructible: boolean = false;

  private _hitsRemaining: number = -1;
  private _brickColors: BrickColorPalette | undefined;
  private _baseColor: Color = Color.white;

  // Reveal animation state
  private _revealing = false;
  private _revealAge = 0;
  private _revealDelay = 0;
  private _revealStyle: RevealStyle = RevealStyle.Pop;
  private _targetScale: Vec3 = Vec3.one;
  private _targetPosition: Vec3 = Vec3.zero;

  // Death animation state
  private _dying = false;
  private _deathAge = 0;
  private _deathScale: Vec3 = Vec3.one;
  private _deathCallback: (() => void) | null = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;

    // Look for ColorComponent on children first, then on the entity itself
    const children = this.entity.getChildrenWithComponent(ColorComponent);
    this._colorComponent = children.length > 0
      ? children[0].getComponent(ColorComponent)
      : this.entity.getComponent(ColorComponent);

    // Don't register yet — wait until reveal finishes so the ball can't hit invisible bricks
  }

  @subscribe(Events.InitBrick)
  private _onInit(payload: Events.InitBrickPayload): void {
    this.hits = payload.hits;
    this.indestructible = payload.indestructible;
    this._hitsRemaining = payload.hits;
    this._brickColors = payload.colors;
    this._updateColor();

    // Start reveal animation
    this._targetScale = this._transform.localScale;
    this._targetPosition = this._transform.localPosition;
    this._revealStyle = payload.revealStyle ?? RevealStyle.Pop;
    this._revealDelay = payload.revealDelay ?? 0;
    this._revealAge = 0;
    this._revealing = true;

    // Initial state depends on style
    if (this._revealStyle === RevealStyle.DropIn) {
      // Start above final position, at full scale
      this._transform.localPosition = new Vec3(
        this._transform.localPosition.x,
        this._transform.localPosition.y + 3,
        this._transform.localPosition.z,
      );
      this._transform.localScale = this._targetScale;
    } else if (this._revealStyle === RevealStyle.Stretch) {
      // Start as a flat horizontal line
      this._transform.localScale = new Vec3(this._targetScale.x, 0, this._targetScale.z);
    } else {
      // Pop & Spin: start at scale 0
      this._transform.localScale = Vec3.zero;
    }
  }

  getColliderBounds(): Rect {
    const pos = this._transform.worldPosition;
    const hw = this._transform.localScale.x * 0.5;
    const hh = this._transform.localScale.y * 0.5;
    return { x: pos.x - hw, y: pos.y - hh, w: hw * 2, h: hh * 2 };
  }

  onCollision(other: ICollider): void {
    if (other.colliderTag !== 'ball') return;
    if (this.indestructible) return;

    if (this._hitsRemaining < 0) this._hitsRemaining = this.hits;

    this._hitsRemaining--;

    if (this._hitsRemaining <= 0) {
      this.triggerDestruction();
    } else {
      this.onHit();
    }
  }

  /**
   * External entry point for forced destruction (e.g. explosion chain).
   * Subclasses can override to add guards (e.g. anti-loop) before calling super.
   */
  triggerDestruction(): void {
    CollisionManager.get().unregister(this);
    this.onDestroyBrick();
  }

  // ── Template Method hooks ─────────────────────────────────────────────────

  /** Called on a non-lethal hit. Override to add custom reactions. */
  protected onHit(): void {
    EventService.sendLocally(Events.BrickHit, {
      position: this._transform.worldPosition,
      color: this._baseColor,
    });
    this._flash(() => this._updateColor());
  }

  /**
   * Called when this brick should be destroyed (HP=0 or external trigger).
   * CollisionManager is already unregistered before this is called.
   * Override to replace or extend the destruction sequence.
   */
  protected onDestroyBrick(): void {
    console.log("[Brick] Destroyed");
    // Fire event immediately so scoring/VFX react instantly
    EventService.sendLocally(Events.BrickDestroyed, {
      position: this._transform.worldPosition,
      color: this._baseColor,
    });
    // Start death animation: flash white then shrink+spin
    this._deathScale = this._transform.localScale;
    this._deathAge = 0;
    this._dying = true;
    this._flash(() => {}); // white flash at start
  }

  // ── Reveal animation update ───────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  private _onRevealUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._revealing) return;

    // Wait for the staggered delay
    if (this._revealDelay > 0) {
      this._revealDelay -= p.deltaTime;
      return;
    }

    this._revealAge += p.deltaTime;
    const dur = this._revealStyle === RevealStyle.DropIn ? REVEAL_DROP_DURATION : REVEAL_DURATION;
    const t = Math.min(this._revealAge / dur, 1);

    switch (this._revealStyle) {
      case RevealStyle.Pop:
        this._revealPop(t);
        break;
      case RevealStyle.DropIn:
        this._revealDropIn(t);
        break;
      case RevealStyle.Spin:
        this._revealSpin(t);
        break;
      case RevealStyle.Stretch:
        this._revealStretch(t);
        break;
    }

    if (t >= 1) {
      this._revealing = false;
      this._transform.localScale = this._targetScale;
      this._transform.localRotation = Quaternion.identity;
      CollisionManager.get().register(this);
    }
  }

  /** Scale 0 → overshoot → 1 with back-out easing */
  private _revealPop(t: number): void {
    const backOut = 1 + (REVEAL_OVERSHOOT - 1) * Math.sin(t * Math.PI);
    const s = t >= 1 ? 1 : t * t * backOut;
    this._transform.localScale = new Vec3(
      this._targetScale.x * s,
      this._targetScale.y * s,
      this._targetScale.z * s,
    );
  }

  /** Fall from above with a bounce at landing */
  private _revealDropIn(t: number): void {
    // Bounce-out easing
    let b: number;
    if (t < 0.36) {
      b = 7.5625 * t * t;
    } else if (t < 0.73) {
      const t2 = t - 0.545;
      b = 7.5625 * t2 * t2 + 0.75;
    } else {
      const t2 = t - 0.9;
      b = 7.5625 * t2 * t2 + 0.9375;
    }
    const offsetY = 3 * (1 - Math.min(b, 1));
    this._transform.localPosition = new Vec3(
      this._transform.localPosition.x,
      this._targetPosition.y + offsetY,
      this._transform.localPosition.z,
    );
  }

  /** Spin 360° on Z while scaling up */
  private _revealSpin(t: number): void {
    const s = t * t * (3 - 2 * t); // smoothstep
    this._transform.localScale = new Vec3(
      this._targetScale.x * s,
      this._targetScale.y * s,
      this._targetScale.z * s,
    );
    const angle = (1 - t) * 360;
    this._transform.localRotation = Quaternion.fromEuler(new Vec3(0, 0, angle));
  }

  /** Stretch X first then Y (like a rubber band snap) */
  private _revealStretch(t: number): void {
    const half = 0.5;
    let sx: number, sy: number;
    if (t < half) {
      // First half: X stretches to overshoot, Y stays 0
      const p = t / half;
      sx = p * REVEAL_OVERSHOOT;
      sy = 0;
    } else {
      // Second half: X settles to 1, Y pops up with overshoot
      const p = (t - half) / half;
      sx = REVEAL_OVERSHOOT + (1 - REVEAL_OVERSHOOT) * p;
      const backOut = 1 + (REVEAL_OVERSHOOT - 1) * Math.sin(p * Math.PI);
      sy = p * p * backOut;
    }
    this._transform.localScale = new Vec3(
      this._targetScale.x * Math.min(sx, REVEAL_OVERSHOOT),
      this._targetScale.y * Math.min(sy, REVEAL_OVERSHOOT),
      this._targetScale.z,
    );
  }

  // ── Death animation update ────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  private _onDeathUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._dying) return;

    this._deathAge += p.deltaTime;
    const t = Math.min(this._deathAge / DEATH_DURATION, 1);

    // Ease-in: accelerating shrink
    const scale = 1 - t * t;
    this._transform.localScale = new Vec3(
      this._deathScale.x * scale,
      this._deathScale.y * scale,
      this._deathScale.z * scale,
    );

    // Spin on z-axis
    const rotDeg = this._deathAge * DEATH_SPIN_SPEED * (180 / Math.PI);
    this._transform.localRotation = Quaternion.fromEuler(new Vec3(0, 0, rotDeg));

    if (t >= 1) {
      this._dying = false;
      this._park();
    }
  }

  // ── Pool recycling ────────────────────────────────────────────────────────

  /** Move off-screen and notify pool for reuse. */
  protected _park(): void {
    this._transform.worldPosition = new Vec3(0, -100, 0);
    this._transform.localScale = Vec3.zero;
    this._transform.localRotation = Quaternion.identity;
    this._revealing = false;
    this._dying = false;
    EventService.sendLocally(Events.BrickRecycle, { entity: this.entity });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  protected _flash(callback: () => void): void {
    if (this._colorComponent) {
      this._colorComponent.color = new Color(1, 1, 1, 1);
    }
    setTimeout(callback, 50);
  }

  private _updateColor(): void {
    if (!this._colorComponent) return;

    if (this.indestructible && this._brickColors?.indestructible) {
      const [r, g, b] = this._brickColors?.indestructible;
      const c = new Color(r, g, b, 1);
      this._colorComponent.color = c;
      this._baseColor = c;
      return;
    }

    const hp = this._hitsRemaining;
    if (this._brickColors?.[hp])
    {
      const [r, g, b] = this._brickColors?.[hp];
      const c = new Color(r, g, b, 1);
      this._colorComponent.color = c;
      this._baseColor = c;
    }
  }
}
