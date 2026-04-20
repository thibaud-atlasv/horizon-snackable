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
  @property() bodyPivot: Entity | null = null;
  @property() leftArm: Entity | null = null;
  @property() rightArm: Entity | null = null;
  @property() leftLeg: Entity | null = null;
  @property() rightLeg: Entity | null = null;
  @property() shadow: Entity | null = null;
  @property() tiltAngle: number = 45;
  @property() limbSwingDeg: number = 30;
  @property() limbSwingSpeed: number = 6;
  @property() walkByTranslation: boolean = false;
  // Y translation amplitude when walkByTranslation is true
  @property() walkTranslateY: number = 0.15;

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

  private _colorComponents: ColorComponent[] = [];
  private _baseColor: Color = new Color(1, 1, 1, 1);
  private _persistentTint: Color | null = null; // e.g. slow tint, survives hit flash
  private _hitFlashTimer: number = 0;
  private static readonly HIT_FLASH_DURATION = 0.12;
  private static readonly HIT_COLOR = new Color(1.0, 0.1, 0.1, 1.0);

  private _squashTimer: number = 0;
  private static readonly SQUASH_DURATION = 0.12;
  private static readonly SQUASH_XZ = 1.12;
  private static readonly SQUASH_Y  = 0.88;

  private static readonly DEATH_DURATION = 0.35;

  private _wpIndex: number = 0;
  private _subT: number = 0;
  private _animTime: number = 0;

  private _restLeftLeg:  Quaternion = Quaternion.identity;
  private _restRightLeg: Quaternion = Quaternion.identity;
  private _restLeftArm:  Quaternion = Quaternion.identity;
  private _restRightArm: Quaternion = Quaternion.identity;
  private _restLeftLegPos:  Vec3 = Vec3.zero;
  private _restRightLegPos: Vec3 = Vec3.zero;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;

    const restRot = (e: Entity | null) =>
      e?.getComponent(TransformComponent)?.localRotation ?? Quaternion.identity;
    const restPos = (e: Entity | null) =>
      e?.getComponent(TransformComponent)?.localPosition ?? Vec3.zero;

    this._restLeftLeg  = restRot(this.leftLeg);
    this._restRightLeg = restRot(this.rightLeg);
    this._restLeftArm  = restRot(this.leftArm);
    this._restRightArm = restRot(this.rightArm);
    this._restLeftLegPos  = restPos(this.leftLeg);
    this._restRightLegPos = restPos(this.rightLeg);
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

    this._colorComponents = [];
    this._collectColorComponents(this.entity);
    this._baseColor = this._colorComponents[0]?.color ?? new Color(1, 1, 1, 1);
    this.resetTint();
  }

  @subscribe(Events.TakeDamage)
  onTakeDamage(p: Events.TakeDamagePayload): void {
    if (!this._alive || p.enemyId !== this._enemyId) return;

    this._hitFlashTimer = EnemyController.HIT_FLASH_DURATION;
    this._squashTimer = EnemyController.SQUASH_DURATION;
    this._applyColor(EnemyController.HIT_COLOR);

    this._hp -= p.damage;
    const pos = this._transform.worldPosition;
    EnemyService.get().update(this._enemyId, pos.x, pos.z, PathService.get().getGlobalT(this._wpIndex, this._subT), this._hp);

    if (this._hp <= 0) this._die();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (this._hitFlashTimer > 0) {
      this._hitFlashTimer -= p.deltaTime;
      if (this._hitFlashTimer <= 0) this._applyColor(this._persistentTint ?? this._baseColor);
    }

    if (this._squashTimer > 0) {
      this._squashTimer -= p.deltaTime;
      if (this._squashTimer <= 0) {
        this._transform.localScale = new Vec3(this._baseScale, this._baseScale, this._baseScale);
      } else {
        const t = this._squashTimer / EnemyController.SQUASH_DURATION;
        const s = t * t * (3 - 2 * t);
        const xz = this._baseScale * (1 + (EnemyController.SQUASH_XZ - 1) * s);
        const y  = this._baseScale * (1 + (EnemyController.SQUASH_Y  - 1) * s);
        this._transform.localScale = new Vec3(xz, y, xz);
      }
    }

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

    const dx = ahead.x - pos.x;
    const dz = ahead.z - pos.z;
    this._updateBodyPivot(dx, dz);
    const speedFactor = EnemyService.get().get(this._enemyId)?.speedFactor ?? 1;
    this._animateLimbs(dt, this._speed * speedFactor);
  }

  public applyTint(color: Color): void {
    this._persistentTint = color;
    if (this._hitFlashTimer <= 0) this._applyColor(color);
  }

  public resetTint(): void {
    this._persistentTint = null;
    if (this._hitFlashTimer <= 0) this._applyColor(this._baseColor);
  }

  private _collectColorComponents(entity: Entity): void {
    if (entity === this.shadow) return;
    const cc = entity.getComponent(ColorComponent);
    if (cc) this._colorComponents.push(cc);
    for (const child of entity.getChildren()) {
      this._collectColorComponents(child);
    }
  }

  private _applyColor(color: Color): void {
    for (const cc of this._colorComponents) {
      cc.color = color;
    }
  }

  private _die(): void {
    this._alive = false;
    this._dying = true;
    this._deathTimer = 0;
    EnemyService.get().unregister(this._enemyId);

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

  private _updateBodyPivot(dx: number, dz: number): void {
    if (!this.bodyPivot) return;
    const pivot = this.bodyPivot.getComponent(TransformComponent);
    if (!pivot) return;

    let Angle = new Vec3(0, 0, 0);
    if (dx > 0)       Angle = new Vec3(-30, 0, 0);
    else if (dx < 0)  Angle = new Vec3(30, 0, 0);
    else if (dz > 0)  Angle = new Vec3(0, 0, 45);
    else if (dz < 0)  Angle = new Vec3(0, 0, -45);
    pivot.localRotation = Quaternion.fromEuler(Angle);
  }

  private _animateLimbs(dt: number, currentSpeed: number): void {
    this._animTime += currentSpeed * dt * this.limbSwingSpeed;
    const swing = Math.sin(this._animTime) * this.limbSwingDeg;

    if (this.walkByTranslation) {
      // Y translation mode: legs bob up/down in opposition, arms still rotate
      const applyLegTranslate = (entity: Entity | null, restPos: Vec3, phase: number) => {
        const t = entity?.getComponent(TransformComponent);
        if (!t) return;
        const offsetY = Math.sin(this._animTime* 2 + phase) * this.walkTranslateY;
        t.localPosition = new Vec3(restPos.x, restPos.y + offsetY, restPos.z);
      };
      applyLegTranslate(this.leftLeg,  this._restLeftLegPos,  0);
      applyLegTranslate(this.rightLeg, this._restRightLegPos, Math.PI);
    } else {
      const applyRot = (entity: Entity | null, rest: Quaternion, angleDeg: number) => {
        const t = entity?.getComponent(TransformComponent);
        if (!t) return;
        t.localRotation = Quaternion.mul(rest, Quaternion.fromEuler(new Vec3(0, 0, angleDeg)));
      };
      applyRot(this.leftLeg,  this._restLeftLeg,   swing);
      applyRot(this.rightLeg, this._restRightLeg,  -swing);
    }

    // Arms always rotate
    const applyArm = (entity: Entity | null, rest: Quaternion, angleDeg: number) => {
      const t = entity?.getComponent(TransformComponent);
      if (!t) return;
      t.localRotation = Quaternion.mul(rest, Quaternion.fromEuler(new Vec3(0, 0, angleDeg)));
    };
    applyArm(this.leftArm,  this._restLeftArm,  -swing);
    applyArm(this.rightArm, this._restRightArm,  swing);
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
