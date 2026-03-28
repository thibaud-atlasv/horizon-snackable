import { component, Component, EventService, NetworkingService, NetworkMode, OnEntityStartEvent, subscribe, Quaternion, TransformComponent, Vec3, WorldService, type Entity, property, ColorComponent, type Maybe, Color } from 'meta/worlds';
import { Events, type BrickColorPalette } from './Types';
import { LEVELS, LEVEL_DEFAULTS, type LevelConfig } from './LevelConfig';

@component()
export class LevelLayout extends Component {
  @property()
  private background?: Entity;

  private _spawnedBricks: Entity[] = [];
  private _z: number = 0;
  private _backgroundColor? : Maybe<ColorComponent>;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._z = this.entity.getComponent(TransformComponent)!.worldPosition.z;
    this._backgroundColor = this.background?.getComponent(ColorComponent);

    this._spawnLayout(LEVELS[0]);
  }

  @subscribe(Events.LoadLevel)
  private onLoadLevel(payload: Events.LoadLevelPayload): void {
    this._clearBricks();
    setTimeout(() => {
      this._spawnLayout(LEVELS[payload.levelIndex]);
    }, 200);
  }

  private async _spawnLayout(config: LevelConfig): Promise<void> {
    this._clearBricks();

    const brickWidth  = config.brickWidth  ?? LEVEL_DEFAULTS.brickWidth;
    const brickHeight = config.brickHeight ?? LEVEL_DEFAULTS.brickHeight;
    const paddingX    = config.paddingX    ?? LEVEL_DEFAULTS.paddingX;
    const paddingY    = config.paddingY    ?? LEVEL_DEFAULTS.paddingY;
    const startY      = config.startY      ?? LEVEL_DEFAULTS.startY;

    const grid = config.grid.split('\n').map(row => [...row]);
    const cols = Math.max(...grid.map(row => row.length));
    const totalW = cols * brickWidth + (cols - 1) * paddingX;
    const originX = -totalW / 2 + brickWidth / 2;

    const spawns: Promise<Entity>[] = [];
    const spawnMeta: Array<{ hits: number; indestructible: boolean; colors?: BrickColorPalette }> = [];

    if (this._backgroundColor && config.palette?.background)
      this._backgroundColor.color = new Color(...config.palette.background);

    for (let r = 0; r < grid.length; r++) {
      const y = startY - r * (brickHeight + paddingY);
      for (let c = 0; c < grid[r].length; c++) {
        const char = grid[r][c];
        if (char === '0' || char === ' ') continue;

        const template = config.brickTemplates[char];
        if (!template) continue;

        const x = originX + c * (brickWidth + paddingX);
        spawns.push(
          WorldService.get().spawnTemplate({
            templateAsset: template.asset,
            networkMode: NetworkMode.LocalOnly,
            position: new Vec3(x, y, this._z),
            scale: new Vec3(brickWidth, brickHeight, 1),
            rotation: Quaternion.identity,
          })
        );
        spawnMeta.push({
          hits: template.hits ?? 1,
          indestructible: template.indestructible ?? false,
          colors: template.colors,
        });
      }
    }

    const entities = await Promise.all(spawns);
    this._spawnedBricks = entities;

    for (let i = 0; i < entities.length; i++) {
      EventService.sendLocally(Events.InitBrick, {
        hits: spawnMeta[i].hits,
        indestructible: spawnMeta[i].indestructible,
        colors: spawnMeta[i].colors,
      }, { eventTarget: entities[i] });
    }
  }

  private _clearBricks(): void {
    for (const entity of this._spawnedBricks) {
      entity.destroy();
    }
    this._spawnedBricks = [];
  }
}
