/**
 * EnemyController — Path-following, damage handling, and death animation for enemy entities.
 *
 * Attached to: every spawned enemy entity template.
 * onInit (InitEnemy event): reads IEnemyDef, registers with EnemyService, sets HP and color.
 * onUpdate: advances along the waypoint path using _wpIndex + _subT. Calls PathService
 *   for world positions, applies speedFactor from EnemyService (slow debuffs). Calls
 *   lookAt() toward movement direction so the entity faces forward. Calls _reachEnd()
 *   when past the last waypoint.
 * onTakeDamage: reduces _hp, updates EnemyService registry, triggers _die() at 0 HP.
 * _die(): unregisters from EnemyService, rewards gold, fires EnemyDied, starts death anim.
 * Death animation: squash Y scale to 0 over DEATH_DURATION seconds, then destroys entity.
 */
import { Component, EventService, TransformComponent, Color, ColorComponent, Vec3, Quaternion } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { component, property, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events } from '../Types';
import { HP_SCALE_PER_WAVE } from '../Constants';
import { PathService } from '../Services/PathService';
import { EnemyService } from '../Services/EnemyService';
import { ResourceService } from '../Services/ResourceService';

@component()
export class EnemyController extends Component {
  // Drag the body pivot entity here — it will be tilted toward the camera at tiltAngle degrees.
  @property() bodyPivot: Entity | null = null;
  // Drag the left/right arm pivot entities here for walk cycle animation.
  @property() leftArm: Entity | null = null;
  @property() rightArm: Entity | null = null;
  // Drag the left/right leg pivot entities here for walk cycle animation.
  @property() leftLeg: Entity | null = null;
  @property() rightLeg: Entity | null = null;
  // Body tilt toward the camera in degrees (positive = lean forward/toward cam).
  @property() tiltAngle: number = 45;
  // Walk animation swing amplitude in degrees.
  @property() limbSwingDeg: number = 30;
  // Walk animation speed multiplier.
  @property() limbSwingSpeed: number = 6;

  private _transform!: TransformComponent;
  private _enemyId: number = -1;
  private _defId: string = '';

  private _hp: number = 0;
  private _speed: number = 0;
  private _reward: number = 0;
  private _alive: boolean = false;
  private _dying: boolean = false;
  private _deathTimer: number = 0;
  private _baseScale: number = 1;

  private static readonly DEATH_DURATION = 0.35; // seconds

  // Waypoint-segment tracking — enemies re-read the path at each waypoint boundary.
  private _wpIndex: number = 0; // current sub-path index (0 = wp[0]→wp[1], …)
  private _subT: number = 0;    // distance traveled within the current sub-path

  // Accumulated time used for the walk cycle sine wave.
  private _animTime: number = 0;

  // Rest poses captured from the template — animation is applied additively on top.
  private _restLeftLeg:  Quaternion = Quaternion.identity;
  private _restRightLeg: Quaternion = Quaternion.identity;
  private _restLeftArm:  Quaternion = Quaternion.identity;
  private _restRightArm: Quaternion = Quaternion.identity;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;

    const restOf = (e: Entity | null) =>
      e?.getComponent(TransformComponent)?.localRotation ?? Quaternion.identity;

    this._restLeftLeg  = restOf(this.leftLeg);
    this._restRightLeg = restOf(this.rightLeg);
    this._restLeftArm  = restOf(this.leftArm);
    this._restRightArm = restOf(this.rightArm);
  }

  @subscribe(Events.InitEnemy)
  onInit(p: Events.InitEnemyPayload): void {
    const def = EnemyService.get().find(p.defId);
    if (!def) return;

    const hpMult = 1 + p.waveIndex * HP_SCALE_PER_WAVE;

    this._defId   = p.defId;
    this._hp      = Math.round(def.hp * hpMult);
    this._speed   = def.speed;
    this._reward  = def.reward;
    this._wpIndex = 0;
    this._subT    = 0;
    this._alive   = true;

    this._baseScale = this._transform.localScale.x;
    const startPos = PathService.get().getWorldPositionInSubPath(0, 0);
    this._transform.worldPosition = startPos;
    this._enemyId = EnemyService.get().register(this.entity, this._defId, this._hp, startPos.x, startPos.z);

    const col = def.color;
    const color = new Color(col.r, col.g, col.b, 1);
    const child = this.entity.getChildrenWithComponent(ColorComponent);
    if (child.length > 0) {
        //for (const child of this.entity.getChildrenWithComponent(ColorComponent)) {
      const c = child[0].getComponent(ColorComponent);
      if (c) c.color = color;
    }
  }

  @subscribe(Events.TakeDamage)
  onTakeDamage(p: Events.TakeDamagePayload): void {
    if (!this._alive || p.enemyId !== this._enemyId) return;

    this._hp -= p.damage;
    const pos = this._transform.worldPosition;
    EnemyService.get().update(this._enemyId, pos.x, pos.z, PathService.get().getGlobalT(this._wpIndex, this._subT), this._hp);


    if (this._hp <= 0) this._die();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (this._dying) {
      this._deathTimer += p.deltaTime;
      const t = Math.min(this._deathTimer / EnemyController.DEATH_DURATION, 1.0);
      this._transform.localScale = new Vec3(this._baseScale * (1 - t), this._baseScale * (1 - t), this._baseScale * (1 - t));
      if (t >= 1.0) this._finishDie();
      return;
    }
    if (!this._alive) return;

    const dt = p.deltaTime;
    const pathService = PathService.get();
    this._subT += this._speed * (EnemyService.get().get(this._enemyId)?.speedFactor ?? 1) * dt;

    // Advance through completed sub-paths — this is where the enemy reads the updated path.
    const waypointCount = pathService.getWaypointCount();
    while (this._wpIndex < waypointCount - 1) {
      const subLen = pathService.getSubPathLength(this._wpIndex);
      if (this._subT < subLen) break;
      this._subT -= subLen;
      this._wpIndex++;
    }

    if (this._wpIndex >= waypointCount - 1) {
      this._reachEnd();
      return;
    }

    const pos = pathService.getWorldPositionInSubPath(this._wpIndex, this._subT);
    this._transform.worldPosition = pos;
    const ahead = pathService.getWorldPositionInSubPath(this._wpIndex, this._subT + 0.1);
    this._transform.lookAt(ahead, Vec3.up);
    EnemyService.get().update(this._enemyId, pos.x, pos.z, pathService.getGlobalT(this._wpIndex, this._subT), this._hp);

    // dx/dz give the travel direction; used to compute parent yaw for pivot compensation.
    const dx = ahead.x - pos.x;
    const dz = ahead.z - pos.z;
    this._updateBodyPivot(dx, dz);
    this._animateLimbs(dt);
  }

  private _die(): void {
    this._alive = false;
    this._dying = true;
    this._deathTimer = 0;
    EnemyService.get().unregister(this._enemyId);
    ResourceService.get().earn(this._reward);

    const pos = this._transform.worldPosition;
    const p = new Events.EnemyDiedPayload();
    p.enemyId = this._enemyId;
    p.reward  = this._reward;
    p.worldX  = pos.x;
    p.worldZ  = pos.z;
    EventService.sendLocally(Events.EnemyDied, p);
  }

  private _finishDie(): void {
    this._dying = false;
    this.entity.destroy();
  }

  // Keeps bodyPivot tilted toward the camera regardless of travel direction.
  // Strategy: set worldRotation directly = pure X-world tilt, which stays
  // camera-facing no matter how the parent yaws with lookAt.
  // Tilts bodyPivot toward the camera (world +X axis) regardless of parent yaw.
  // After lookAt, parent yaw θ satisfies: forward_world = (-sinθ, 0, -cosθ).
  // lookAt points -Z toward target, so yaw = atan2(-dx, -dz).
  // World X axis expressed in parent local space = (cosθ, 0, -sinθ).
  // We rotate the pivot around that local axis by tiltAngle.
  private _updateBodyPivot(dx: number, dz: number): void {
    if (!this.bodyPivot) return;
    const pivot = this.bodyPivot.getComponent(TransformComponent);
    if (!pivot) return;

    const yaw = Math.atan2(-dx, -dz); // parent yaw after lookAt
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const tiltRad = (this.tiltAngle * Math.PI) / 180;
    // Local axis corresponding to world X, then rotate pivot around it.
    
    let Angle = new Vec3(0,0,0);
    if (dx > 0)
      Angle = new Vec3(-30,0,0);
    else if (dx < 0)
      Angle = new Vec3(30,0,0);
    else if (dz > 0)
      Angle = new Vec3(0,0,45);
    else if (dz < 0)
      Angle = new Vec3(0,0,-45);
    pivot.localRotation = Quaternion.fromEuler(Angle);
    //Quaternion.fromAxisAngle(new Vec3(cosY, 0, -sinY), tiltRad);
  }

  private _animateLimbs(dt: number): void {
    this._animTime += dt * this.limbSwingSpeed;
    const swing = Math.sin(this._animTime) * this.limbSwingDeg;

    const apply = (entity: Entity | null, rest: Quaternion, angleDeg: number) => {
      const t = entity?.getComponent(TransformComponent);
      if (!t) return;
      const delta = Quaternion.fromEuler(new Vec3(0, 0, angleDeg));
      t.localRotation = Quaternion.mul(rest, delta);
    };

    apply(this.leftLeg,   this._restLeftLeg,   swing);
    apply(this.rightLeg,  this._restRightLeg,  -swing);
    apply(this.leftArm,   this._restLeftArm,   -swing);
    apply(this.rightArm,  this._restRightArm,   swing);
  }

  private _reachEnd(): void {
    this._alive = false;
    EnemyService.get().unregister(this._enemyId);
    ResourceService.get().loseLife();

    const p = new Events.EnemyReachedEndPayload();
    p.enemyId = this._enemyId;
    EventService.sendLocally(Events.EnemyReachedEnd, p);
    this.entity.destroy();
  }
}
