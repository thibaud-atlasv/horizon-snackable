import { Color, ColorComponent, component, Component, EventService, NetworkingService, OnEntityDestroyEvent, OnEntityStartEvent, property, subscribe, TransformComponent, type Maybe } from 'meta/worlds';
import { Events, type IBrick, type ICollider, type Rect, type BrickColorPalette } from '../Types';
import { CollisionManager } from '../CollisionManager';
import { DEFAULT_PALETTE } from '../LevelConfig';

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

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;

    // Look for ColorComponent on children first, then on the entity itself
    const children = this.entity.getChildrenWithComponent(ColorComponent);
    this._colorComponent = children.length > 0
      ? children[0].getComponent(ColorComponent)
      : this.entity.getComponent(ColorComponent);

    CollisionManager.get().register(this);
  }

  @subscribe(OnEntityDestroyEvent)
  onDestroy(): void {
    CollisionManager.get().unregister(this);
  }

  @subscribe(Events.InitBrick)
  private _onInit(payload: Events.InitBrickPayload): void {
    this.hits = payload.hits;
    this.indestructible = payload.indestructible;
    this._hitsRemaining = payload.hits;
    this._brickColors = payload.colors;
    this._updateColor();
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
    this._flash(() => this._updateColor());
  }

  /**
   * Called when this brick should be destroyed (HP=0 or external trigger).
   * CollisionManager is already unregistered before this is called.
   * Override to replace or extend the destruction sequence.
   */
  protected onDestroyBrick(): void {
    this._flash(() => {
      EventService.sendLocally(Events.BrickDestroyed, {
        position: this._transform.worldPosition,
      });
      this.entity.destroy();
    });
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
      this._colorComponent.color = new Color(r, g, b, 1);
      return;
    }

    const hp = this._hitsRemaining;
    if (this._brickColors?.[hp])
    {
      const [r, g, b] = this._brickColors?.[hp];
      this._colorComponent.color = new Color(r, g, b, 1);
    }
  }
}
