import {
  EventService,
  NetworkMode,
  OnServiceReadyEvent,
  Quaternion,
  Service,
  Vec3,
  WorldService,
  service,
  subscribe,
} from 'meta/worlds';
import {
  BOUNDS,
  CX_WALL_MARGIN,
  LOG_H,
  LOG_W_MAX,
  START_Y,
} from '../Constants';
import { ROUND_DEFS, totalObjCount } from '../LevelConfig';
import { Assets } from '../Assets';
import { Events } from '../Types';

@service()
export class SpawnManager extends Service {
  private _currentRound: number = 0;
  private _nextObjId: number = 0;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {}

  @subscribe(Events.PrepareRound)
  onPrepareRound(p: Events.PrepareRoundPayload): void {
    this._currentRound = p.roundIndex;
    this._nextObjId = 0;
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
        const cx = this._pickCx(slot++, total);

        // Both Logs and Balls are simulated by FallingObjService.
        // The config carries the type so the service can branch accordingly.
        EventService.sendLocally(Events.InitFallingObj, {
          objId: this._nextObjId++,
          cx,
          config: waveDef,
          roundIndex: this._currentRound,
        });
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
