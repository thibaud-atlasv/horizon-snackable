import {
  EventService,
  NetworkMode,
  Quaternion,
  Service,
  Vec3,
  WorldService,
  service,
  subscribe,
  OnServiceReadyEvent,
} from 'meta/worlds';

import { FISH_LEFT, FISH_RIGHT, randomYForLayers } from '../Constants';
import { Events, type IFishDef } from '../Types';
import { randomDef } from './FishDefs';
import { getWaveConfig } from '../LevelConfig';

/**
 * FishSpawnService — spawns fish waves via WorldService.spawnTemplate.
 *
 * Choisit le def via randomDef(), calcule la position de spawn (X aléatoire,
 * Y selon la profondeur du def), puis spawne le template du def à cette position.
 * Le composant sur le template reçoit EvInitFish pour appliquer ses réglages internes.
 */
@service()
export class FishSpawnService extends Service {

  private _currentWaveIndex = 0;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {}

  async spawnWave(count: number, speedMultiplier: number): Promise<void> {
    const config  = getWaveConfig(this._currentWaveIndex, speedMultiplier);
    this._currentWaveIndex++;
    const families = config.familyFilter === 'all' ? undefined : config.familyFilter as string[];

    for (let i = 0; i < count; i++) {
      const def = randomDef({ families });
      await this._spawnFish(def, config.speedMultiplier);
    }
  }

  private async _spawnFish(def: IFishDef, speedMultiplier: number): Promise<void> {
    const spawnX = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT);
    const baseY  = randomYForLayers(def.waterLayerMin, def.waterLayerMax);

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: def.template,
      position:      new Vec3(spawnX, baseY, 0),
      rotation:      Quaternion.identity,
      scale:         Vec3.one,
      networkMode:   NetworkMode.LocalOnly,
    });

    EventService.sendLocally(
      Events.InitFish,
      { defId: def.id, speedMultiplier, spawnX, baseY },
      { eventTarget: entity },
    );
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    this._currentWaveIndex = 0;
  }
}
