import { component, Component, ExecuteOn, NetworkingService, NetworkMode, OnEntityStartEvent, Quaternion, subscribe, TransformComponent, type Maybe, Vec3, WorldService } from 'meta/worlds';
import { Events, PowerUpType } from '../Types';
import { LEVELS, LEVEL_DEFAULTS, type PowerUpConfig } from '../LevelConfig';
import { PowerUpAssets } from '../Assets';
import { PowerUp } from './PowerUp';

@component()
export class PowerUpManager extends Component {
  private _transform: Maybe<TransformComponent> = null;

  private _spawnChance: number = LEVEL_DEFAULTS.powerUpSpawnChance;
  private _powerUps: PowerUpConfig[] = [
    { type: PowerUpType.BigPaddle,    weight: 1, powerUpDuration: LEVEL_DEFAULTS.powerUpDuration },
    { type: PowerUpType.StickyPaddle, weight: 1, powerUpDuration: LEVEL_DEFAULTS.powerUpDuration },
  ];

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent);
    this._applyConfig(LEVELS[0]);
  }

  @subscribe(Events.LoadLevel)
  private onLoadLevel(payload: Events.LoadLevelPayload): void {
    this._applyConfig(LEVELS[payload.levelIndex]);
  }

  private _applyConfig(config: typeof LEVELS[number]): void {
    this._spawnChance = config.powerUpSpawnChance ?? LEVEL_DEFAULTS.powerUpSpawnChance;

    if (config.powerUps && config.powerUps.length > 0) {
      this._powerUps = config.powerUps;
    } else {
      this._powerUps = [
        { type: PowerUpType.BigPaddle,    weight: 1, powerUpDuration: LEVEL_DEFAULTS.powerUpDuration },
        { type: PowerUpType.StickyPaddle, weight: 1, powerUpDuration: LEVEL_DEFAULTS.powerUpDuration },
      ];
    }
  }

  @subscribe(Events.BrickDestroyed)
  private onBrickDestroyed(_payload: Events.BrickDestroyedPayload): void {
    // Power-ups disabled — coin + combo system replaces them.
    return;
  }

  private _selectRandom(): PowerUpConfig {
    const total = this._powerUps.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    for (const p of this._powerUps) {
      r -= p.weight;
      if (r <= 0) return p;
    }
    return this._powerUps[this._powerUps.length - 1];
  }

  private async _spawnPowerUp(position: Vec3): Promise<void> {
    const spawnPosition = new Vec3(position.x, position.y, this._transform?.worldPosition.z ?? 0);
    const selected = this._selectRandom();
    const template = PowerUpAssets[PowerUpType[selected.type] as keyof typeof PowerUpAssets];

    if (!template) return;

    try {
      const entity = await WorldService.get().spawnTemplate({
        templateAsset: template,
        networkMode: NetworkMode.LocalOnly,
        position: spawnPosition,
        rotation: Quaternion.identity,
      });

      if (entity) {
        const powerUp = entity.getComponent(PowerUp);
        if (powerUp) {
          powerUp.powerUpType = selected.type;
          powerUp.powerUpDuration = selected.powerUpDuration ?? LEVEL_DEFAULTS.powerUpDuration;
        }
      }
    } catch {
      // spawn failure is non-fatal
    }
  }
}
