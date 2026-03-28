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
  BALL_GRAVITY,
  BALL_RADIUS_MAX,
  BALL_RADIUS_MIN,
  BALL_VX_MAX,
  BALL_VX_MIN,
  BALL_VY_INIT,
  BOUNDS,
  CX_WALL_MARGIN,
  START_Y,
  LOG_H,
  LOG_W_MAX,
  LOG_W_MIN,
  MAX_ANGLE_DEG,
  MAX_PIVOT,
  MAX_TORQUE_DEG,
  SPEED_BASE,
  SPEED_INC_PER_ROUND,
  TOTAL_ROUNDS,
  VX_INIT_MAX,
  VX_INIT_MIN,
} from './Constants';
import { ROUND_DEFS, totalObjCount, type WaveObjDef } from './LevelConfig';
import { FallingObjTemplates } from './Assets';
import { Events, FallingObjType } from './Types';

type ObjConfigBuilder = (
  waveDef: WaveObjDef,
  cx:      number,
  speed:   number,
  vxScale: number,
) => Events.InitFallingObjPayload;

/**
 * SpawnManager — generates round layouts and spawns FallingObj entities.
 *
 * On Events.PrepareRound:
 *   1. Computes a random configuration for each object in the round (all types).
 *   2. Spawns them all immediately (ghost=true — visible but inactive).
 *   3. Dispatches AllObjsSpawned when all entities are live.
 *
 * Activation (starting the fall) is handled by GameManager via FallingObjActivate.
 *
 * To add a new object type:
 *   1. Add an entry to _builders — no switch-case needed anywhere.
 *   2. FallingObj.ts handles per-frame behaviour for the new type.
 */
@component()
export class SpawnManager extends Component {

  private _pendingConfigs: Array<{ config: Events.InitFallingObjPayload }> = [];
  private _currentRound:   number = 0;
  private _nextObjId:      number = 0;
  private _spawnGen:       number = 0;

  /** Registry of per-type config builders. Add one entry per FallingObjType. */
  private readonly _builders: Record<FallingObjType, ObjConfigBuilder> = {
    [FallingObjType.Log]:  (w, cx, speed, vxScale) => this._buildLogConfig(w, cx, speed, vxScale),
    [FallingObjType.Ball]: (w, cx, _speed, vxScale) => this._buildBallConfig(w, cx, vxScale),
  };

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
  }

  @subscribe(Events.PrepareRound)
  onPrepareRound(p: Events.PrepareRoundPayload): void {
    this._spawnGen++;
    this._currentRound  = p.roundIndex;
    this._pendingConfigs = this._buildRoundLayout(p.roundIndex);
    void this._spawnAll(this._spawnGen);
  }

  @subscribe(Events.Restart)
  onRestart(): void {
    this._spawnGen++;
    this._pendingConfigs = [];
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async _spawnAll(gen: number): Promise<void> {
    const configs = [...this._pendingConfigs];
    let spawned   = 0;

    for (const { config } of configs) {
      if (this._spawnGen !== gen) return;

      const template = FallingObjTemplates[config.objType];
      const entity   = await WorldService.get().spawnTemplate({
        templateAsset: template,
        position:      new Vec3(config.cx, START_Y, 0),
        rotation:      Quaternion.identity,
        scale:         Vec3.one,
        networkMode:   NetworkMode.LocalOnly,
      });

      if (this._spawnGen !== gen) return;

      EventService.sendLocally(Events.InitFallingObj, config, { eventTarget: entity });
      spawned++;
    }

    if (this._spawnGen === gen) {
      EventService.sendLocally(Events.AllObjsSpawned, {
        roundIndex: this._currentRound,
        objCount:   spawned,
      });
    }
  }

  private _buildRoundLayout(roundIndex: number): Array<{ config: Events.InitFallingObjPayload }> {
    const def      = ROUND_DEFS[roundIndex];
    const total    = totalObjCount(def);
    const speed    = SPEED_BASE + roundIndex * SPEED_INC_PER_ROUND;
    const vxScale  = 0.6 + (roundIndex / (TOTAL_ROUNDS - 1)) * 0.4;
    const configs: Array<{ config: Events.InitFallingObjPayload }> = [];
    let   slot     = 0;

    for (const waveDef of def.objects) {
      for (let i = 0; i < waveDef.count; i++) {
        const cx = this._pickCx(slot, total);
        configs.push({ config: this._builders[waveDef.type](waveDef, cx, speed, vxScale) });
        slot++;
      }
    }

    return configs;
  }

  /** Evenly-distributed horizontal position with small jitter. */
  private _pickCx(slot: number, total: number): number {
    const halfDiag = Math.sqrt((LOG_W_MAX / 2) ** 2 + (LOG_H / 2) ** 2);
    const minCx    = BOUNDS.x + halfDiag + CX_WALL_MARGIN;
    const maxCx    = BOUNDS.x + BOUNDS.w - halfDiag - CX_WALL_MARGIN;
    const t        = total === 1 ? 0.5 : slot / (total - 1);
    const jitter   = (Math.random() - 0.5) * (maxCx - minCx) * 0.18;
    return Math.max(minCx, Math.min(maxCx, minCx + t * (maxCx - minCx) + jitter));
  }

  private _buildLogConfig(
    waveDef:  WaveObjDef,
    cx:       number,
    speed:    number,
    vxScale:  number,
  ): Events.InitFallingObjPayload {
    const logW       = LOG_W_MIN + Math.random() * (LOG_W_MAX - LOG_W_MIN);
    const angleSign  = Math.random() < 0.5 ? 1 : -1;
    const torqueSign = Math.random() < 0.5 ? 1 : -1;
    const angleDeg   = angleSign  * (Math.random() * MAX_ANGLE_DEG  * 0.8 + 8);
    const torqueDeg  = torqueSign * (Math.random() * (MAX_TORQUE_DEG - 40) + 40);
    const pivotShift = waveDef.pivot ? (Math.random() * 2 - 1) * MAX_PIVOT : 0;
    const vxSign     = Math.random() < 0.5 ? 1 : -1;
    const vx         = vxSign * (VX_INIT_MIN + Math.random() * (VX_INIT_MAX - VX_INIT_MIN)) * vxScale;

    return {
      objId:      this._nextObjId++,
      objType:    FallingObjType.Log,
      cx,
      startY:     START_Y,
      ghost:      true,
      angle:      angleDeg  * (Math.PI / 180),
      torque:     torqueDeg * (Math.PI / 180),
      pivotShift,
      logW,
      speed,
      vx,
      bounce:     waveDef.bounce,
      colorIdx:   0,
      ballRadius: 0,
      ballVx:     0,
      ballVy:     0,
      ballAy:     0,
    };
  }

  private _buildBallConfig(
    _waveDef: WaveObjDef,
    cx:       number,
    vxScale:  number,
  ): Events.InitFallingObjPayload {
    const ballRadius = BALL_RADIUS_MIN + Math.random() * (BALL_RADIUS_MAX - BALL_RADIUS_MIN);
    const vxSign     = Math.random() < 0.5 ? 1 : -1;
    const ballVx     = vxSign * (BALL_VX_MIN + Math.random() * (BALL_VX_MAX - BALL_VX_MIN)) * vxScale;

    return {
      objId:      this._nextObjId++,
      objType:    FallingObjType.Ball,
      cx,
      startY:     START_Y,
      ghost:      true,
      ballRadius,
      ballVx,
      ballVy:     BALL_VY_INIT,
      ballAy:     -BALL_GRAVITY,
      colorIdx:   0,
      angle:      0,
      torque:     0,
      pivotShift: 0,
      logW:       1,
      speed:      0,
      vx:         ballVx,
      bounce:     false,
    };
  }
}
