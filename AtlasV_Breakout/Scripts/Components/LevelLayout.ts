import { component, Component, EventService, NetworkingService, NetworkMode, OnEntityStartEvent, subscribe, Quaternion, TransformComponent, Vec3, WorldService, type Entity, property, ColorComponent, type Maybe, Color } from 'meta/worlds';
import { Events, RevealStyle } from '../Types';
import { LEVELS, LEVEL_DEFAULTS, type LevelConfig } from '../LevelConfig';
import { BrickAssets } from '../Assets';
import { BRICK_POOL_SIZE } from '../Constants';

const PARK_POS = new Vec3(0, -100, 0);

@component()
export class LevelLayout extends Component {
  @property()
  private background?: Entity;

  private _pool: Entity[] = [];
  private _activeBricks: Entity[] = [];
  private _z: number = 0;
  private _backgroundColor?: Maybe<ColorComponent>;
  private _poolReady = false;

  @subscribe(OnEntityStartEvent)
  async onStart(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    this._z = this.entity.getComponent(TransformComponent)!.worldPosition.z;
    this._backgroundColor = this.background?.getComponent(ColorComponent);

    await this._prewarmPool();
    this._layoutLevel(LEVELS[0]);
  }

  @subscribe(Events.LoadLevel)
  private onLoadLevel(payload: Events.LoadLevelPayload): void {
    this._parkAll();
    setTimeout(() => {
      this._layoutLevel(LEVELS[payload.levelIndex]);
    }, 200);
  }

  // ── Pool management ───────────────────────────────────────────────────────

  private async _prewarmPool(): Promise<void> {
    const entities = await Promise.all(
      Array.from({ length: BRICK_POOL_SIZE }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: BrickAssets.Normal,
          networkMode: NetworkMode.LocalOnly,
          position: PARK_POS,
          scale: Vec3.zero,
          rotation: Quaternion.identity,
        }).catch((e: unknown) => { console.error('[LevelLayout] Pool spawn error', e); return null; }),
      ),
    );
    for (const e of entities) {
      if (e) this._pool.push(e);
    }
    this._poolReady = true;
    console.log(`[LevelLayout] Brick pool ready: ${this._pool.length} entities`);
  }

  private _acquire(): Entity | null {
    return this._pool.pop() ?? null;
  }

  private _release(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = PARK_POS;
      tc.localScale = Vec3.zero;
      tc.localRotation = Quaternion.identity;
    }
    this._pool.push(entity);
  }

  /** Listen for bricks finishing their death animation — recycle them. */
  @subscribe(Events.BrickRecycle)
  private _onBrickRecycle(p: Events.BrickRecyclePayload): void {
    const entity = p.entity;
    if (!entity) return;
    const idx = this._activeBricks.indexOf(entity);
    if (idx >= 0) this._activeBricks.splice(idx, 1);
    this._release(entity);
  }

  private _parkAll(): void {
    for (const entity of this._activeBricks) {
      this._release(entity);
    }
    this._activeBricks = [];
  }

  // ── Level layout ──────────────────────────────────────────────────────────

  private _layoutLevel(config: LevelConfig): void {
    if (!this._poolReady) return;
    this._parkAll();

    const brickWidth  = config.brickWidth  ?? LEVEL_DEFAULTS.brickWidth;
    const brickHeight = config.brickHeight ?? LEVEL_DEFAULTS.brickHeight;
    const paddingX    = config.paddingX    ?? LEVEL_DEFAULTS.paddingX;
    const paddingY    = config.paddingY    ?? LEVEL_DEFAULTS.paddingY;
    const startY      = config.startY      ?? LEVEL_DEFAULTS.startY;

    const grid = config.grid.split('\n').map(row => [...row]);
    const cols = Math.max(...grid.map(row => row.length));
    const totalW = cols * brickWidth + (cols - 1) * paddingX;
    const originX = -totalW / 2 + brickWidth / 2;

    if (this._backgroundColor && config.palette?.background)
      this._backgroundColor.color = new Color(...config.palette.background);

    // Pick a random reveal pattern and style for this level
    const rows = grid.length;
    const revealStyle = this._randomRevealStyle();
    const delayFn = this._randomDelayPattern(rows, cols);

    for (let r = 0; r < grid.length; r++) {
      const y = startY - r * (brickHeight + paddingY);
      for (let c = 0; c < grid[r].length; c++) {
        const char = grid[r][c];
        if (char === '0' || char === ' ') continue;

        const template = config.brickTemplates[char];
        if (!template) continue;

        const entity = this._acquire();
        if (!entity) {
          console.warn('[LevelLayout] Brick pool exhausted!');
          return;
        }

        const x = originX + c * (brickWidth + paddingX);
        const tc = entity.getComponent(TransformComponent);
        if (tc) {
          tc.worldPosition = new Vec3(x, y, this._z);
          tc.localScale = new Vec3(brickWidth, brickHeight, 1);
          tc.localRotation = Quaternion.identity;
        }

        this._activeBricks.push(entity);

        const delay = delayFn(r, c);
        EventService.sendLocally(Events.InitBrick, {
          hits: template.hits ?? 1,
          indestructible: template.indestructible ?? false,
          colors: template.colors,
          revealDelay: delay,
          revealStyle,
        }, { eventTarget: entity });
      }
    }
  }

  // ── Reveal randomization ──────────────────────────────────────────────────

  private _randomRevealStyle(): RevealStyle {
    const styles = [RevealStyle.Pop, RevealStyle.DropIn, RevealStyle.Spin, RevealStyle.Stretch];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  private _randomDelayPattern(rows: number, cols: number): (row: number, col: number) => number {
    const pattern = Math.floor(Math.random() * 5);

    switch (pattern) {
      case 0: // Diagonal wave: top-left → bottom-right
        return (r, c) => r * 0.06 + c * 0.02;

      case 1: // Spiral from center outward
      {
        const cr = (rows - 1) / 2;
        const cc = (cols - 1) / 2;
        return (r, c) => {
          const dist = Math.max(Math.abs(r - cr), Math.abs(c - cc));
          return dist * 0.07;
        };
      }

      case 2: // Row by row (top → bottom)
        return (r, _c) => r * 0.08;

      case 3: // Random scatter
      {
        const cache = new Map<string, number>();
        const maxDelay = (rows + cols) * 0.03;
        return (r, c) => {
          const key = `${r},${c}`;
          if (!cache.has(key)) cache.set(key, Math.random() * maxDelay);
          return cache.get(key)!;
        };
      }

      case 4: // Column sweep (left → right)
      default:
        return (_r, c) => c * 0.05;
    }
  }
}
