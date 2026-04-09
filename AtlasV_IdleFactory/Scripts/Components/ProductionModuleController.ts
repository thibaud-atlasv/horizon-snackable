import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  ExecuteOn,
  NetworkingService,
  TransformComponent,
  property,
} from 'meta/worlds';
import type { Maybe, Entity, OnWorldUpdateEventPayload } from 'meta/worlds';
import { Vec3, Quaternion } from 'meta/worlds';
import { ProductionService } from '../Services/ProductionService';

// ---------------------------------------------------------------------------
// ProductionModuleController — visual animation for a single production module.
//
// Uses the service timer directly to drive a continuous animation:
//
//   [0, BOUNCE]           → cargo spawn bounce on spawnLocator
//   [BOUNCE, midpoint]    → crane pivots from belt to spawn (CranePick)
//   [midpoint, interval]  → crane pivots from spawn to belt, cargo follows grab locator
//   timer resets           → cargo hidden, crane at belt (idle), restart
// ---------------------------------------------------------------------------

const BOUNCE_DURATION = 0.3;

@component({ description: 'Visual controller for a production module (cargo + crane animation)' })
export class ProductionModuleController extends Component {
  @property() moduleIndex: number = 0;

  @property() spawnLocator:     Maybe<Entity> = null;
  @property() craneEntity:      Maybe<Entity> = null;
  @property() craneGrabLocator: Maybe<Entity> = null;
  @property() cargoEntity:      Maybe<Entity> = null;

  @property() craneRestAngle: number = 0;   // Y degrees — crane pointing at spawn
  @property() craneDropAngle: number = 90;  // Y degrees — crane pointing at belt

  private _networkingService: NetworkingService = NetworkingService.get();
  private _productionService: ProductionService = ProductionService.get();

  private _craneTransform: Maybe<TransformComponent> = null;
  private _cargoTransform: Maybe<TransformComponent> = null;
  private _grabTransform:  Maybe<TransformComponent> = null;
  private _spawnPos: Vec3 = Vec3.zero;

  private static readonly HIDDEN = new Vec3(0.001, 0.001, 0.001);

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (this._networkingService.isServerContext()) return;

    if (this.craneEntity) {
      this._craneTransform = this.craneEntity.getComponent(TransformComponent) ?? null;
    }
    if (this.cargoEntity) {
      this._cargoTransform = this.cargoEntity.getComponent(TransformComponent) ?? null;
    }
    if (this.craneGrabLocator) {
      this._grabTransform = this.craneGrabLocator.getComponent(TransformComponent) ?? null;
    }
    if (this.spawnLocator) {
      const t = this.spawnLocator.getComponent(TransformComponent);
      if (t) this._spawnPos = t.worldPosition;
    }

    if (this._cargoTransform) {
      this._cargoTransform.localScale = ProductionModuleController.HIDDEN;
    }
    if (this._craneTransform) {
      this._craneTransform.localScale = ProductionModuleController.HIDDEN;
    }
    this._setCraneAngle(this.craneDropAngle);
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(_payload: OnWorldUpdateEventPayload): void {
    const modules = this._productionService.getModules();
    const mod = modules[this.moduleIndex];
    if (!mod || !isFinite(mod.interval)) {
      if (this._cargoTransform) {
        this._cargoTransform.localScale = ProductionModuleController.HIDDEN;
      }
      if (this._craneTransform) {
        this._craneTransform.localScale = ProductionModuleController.HIDDEN;
      }
      return;
    }

    // Ensure crane is visible once module is active
    if (this._craneTransform && this._craneTransform.localScale.x < 0.5) {
      this._craneTransform.localScale = Vec3.one;
    }

    const timer    = mod.timer;
    const interval = mod.interval;

    // Time budget for the crane animation (after bounce)
    const craneTotal = Math.max(interval - BOUNCE_DURATION, 0.2);
    const craneMid   = BOUNCE_DURATION + craneTotal * 0.5;

    if (timer < BOUNCE_DURATION) {
      // --- Spawn bounce: crane idle at belt side ---
      this._setCraneAngle(this.craneDropAngle);
      if (this._cargoTransform) {
        const t = timer / BOUNCE_DURATION;
        const scale = this._elasticOut(t);
        this._cargoTransform.localScale = new Vec3(scale, scale, scale);
        this._cargoTransform.worldPosition = this._spawnPos;
      }
    } else if (timer < craneMid) {
      // --- Crane pick: pivot from belt to spawn ---
      const t = this._easeInOut((timer - BOUNCE_DURATION) / (craneMid - BOUNCE_DURATION));
      this._setCraneAngle(this._lerp(this.craneDropAngle, this.craneRestAngle, t));
      if (this._cargoTransform) {
        this._cargoTransform.localScale = Vec3.one;
        this._cargoTransform.worldPosition = this._spawnPos;
      }
    } else {
      // --- Crane drop: pivot from spawn to belt, cargo follows grab locator ---
      const dropDuration = BOUNCE_DURATION + craneTotal - craneMid;
      const t = this._easeInOut(Math.min((timer - craneMid) / dropDuration, 1));
      this._setCraneAngle(this._lerp(this.craneRestAngle, this.craneDropAngle, t));
      if (this._cargoTransform) {
        this._cargoTransform.localScale = Vec3.one;
        if (this._grabTransform) {
          this._cargoTransform.worldPosition = this._grabTransform.worldPosition;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------

  private _setCraneAngle(deg: number): void {
    if (!this._craneTransform) return;
    this._craneTransform.localRotation = Quaternion.fromEuler(new Vec3(0, deg, 0));
  }

  private _lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private _easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private _elasticOut(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const period = 0.4;
    const shift  = period / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - shift) * (2 * Math.PI) / period) + 1;
  }
}
