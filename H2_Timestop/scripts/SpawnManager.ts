import {
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  Quaternion,
  Vec3,
  WorldService,
  NetworkMode,
  component,
  subscribe,
} from 'meta/worlds';
import {
  BOUNDS,
  CX_WALL_MARGIN,
  LOG_H,
  LOG_W_MAX,
  START_Y,
} from './Constants';
import { ROUND_DEFS, totalObjCount, } from './LevelConfig';
import { Assets } from './Assets';
import { Events } from './Types';

/**
 * SpawnManager — generates round layouts and spawns FallingObj entities.
 *
 * Responsibilities:
 *   - Distribute object slots evenly across the play area (cx per slot).
 *   - Spawn template entities for each object type.
 *   - Send Events.InitFallingObj with structural config only (objId, cx,
 *     roundIndex, bounce, pivot). Each FallingObj component randomizes its
 *     own physics — SpawnManager knows nothing about per-type physics.
 *
 * To add a new object type: add an entry in Assets.FallingObjTemplates and
 * a WaveObjDef in LevelConfig. No changes needed here.
 */
@component()
export class SpawnManager extends Component {
  private _currentRound: number = 0;
  private _nextObjId: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
  }

  @subscribe(Events.PrepareRound)
  onPrepareRound(p: Events.PrepareRoundPayload): void {
    this._currentRound = p.roundIndex;
    void this._spawnAll();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async _spawnAll(): Promise<void> {
    const def = ROUND_DEFS[this._currentRound];
    const total = totalObjCount(def);
    let spawned = 0;
    let slot = 0;

    for (const waveDef of def.objects) {
      for (let i = 0, n = waveDef.count; i < n; i++) {
        const template = Assets.FallingObjTemplates[waveDef.type];
        const entity = await WorldService.get().spawnTemplate({
          templateAsset: template,
          position: new Vec3(this._pickCx(slot++, total), START_Y, 0),
          rotation: Quaternion.identity,
          scale: Vec3.one,
          networkMode: NetworkMode.LocalOnly,
        });
        EventService.sendLocally(Events.InitFallingObj, {
          objId: this._nextObjId++,
          config: waveDef,
          roundIndex: this._currentRound,
        }, { eventTarget: entity });
        spawned++;
      }
    }
    EventService.sendLocally(Events.AllObjsSpawned, {
      roundIndex: this._currentRound,
      objCount: spawned,
    });
  }

  /**
   * Evenly-distributed horizontal spawn position with small random jitter.
   * Uses Log max diagonal as worst-case margin — valid for all current types.
   */
  private _pickCx(slot: number, total: number): number {
    const halfDiag = Math.sqrt((LOG_W_MAX / 2) ** 2 + (LOG_H / 2) ** 2);
    const minCx = BOUNDS.x + halfDiag + CX_WALL_MARGIN;
    const maxCx = BOUNDS.x + BOUNDS.w - halfDiag - CX_WALL_MARGIN;
    const t = total === 1 ? 0.5 : slot / (total - 1);
    const jitter = (Math.random() - 0.5) * (maxCx - minCx) * 0.18;
    return Math.max(minCx, Math.min(maxCx, minCx + t * (maxCx - minCx) + jitter));
  }
}
