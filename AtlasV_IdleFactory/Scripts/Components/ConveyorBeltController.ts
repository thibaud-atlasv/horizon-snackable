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
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { Vec3 } from 'meta/worlds';
import { ConveyorService } from '../Services/ConveyorService';
import type { IBeltProduct } from '../Services/ConveyorService';
import { ProductPoolService } from '../Services/ProductPoolService';
import { CONVEYOR_SLOT_COUNT } from '../Constants';

const LOG_TAG = '[ConveyorBeltController]';

// Visual belt markers = logical slots + 1 wrap-around.
const VISUAL_SLOT_COUNT = CONVEYOR_SLOT_COUNT + 1;

const SPAWN_BOUNCE_DURATION = 0.4;

// Maps a service-side IBeltProduct to its visual pool entity.
interface VisualProduct {
  source:     IBeltProduct;        // reference to the service product (identity match)
  t:          TransformComponent;  // pool entity transform
  spawnTimer: number;              // elapsed time since spawn (for bounce animation)
}

@component({ description: 'Visual controller for conveyor belt animation and product pool' })
export class ConveyorBeltController extends Component {
  @property() slotsEntity: Maybe<Entity> = null;

  private _networkingService: NetworkingService = NetworkingService.get();
  private _conveyorService:   ConveyorService   = ConveyorService.get();
  private _poolService:       ProductPoolService = ProductPoolService.get();

  private _slotTransforms: Maybe<TransformComponent>[] = [];
  private _visuals: VisualProduct[] = [];

  private _lastDt:          number = 0;
  private _animationOffset: number = 0;
  private _beltLength:      number = 0;
  private _transitionZone:  number = 0.3; // fraction of slot spacing for belt marker scale ramp

  // Belt world calibration: worldPos(distance) = _beltOrigin + _beltDir * distance
  private _beltOrigin: Vec3 = new Vec3(0, 0, 0);
  private _beltDir:    Vec3 = new Vec3(0, 0, 1);

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (this._networkingService.isServerContext()) return;

    this._beltLength = this._conveyorService.getBeltLength();

    if (!this.slotsEntity) {
      console.error(`${LOG_TAG} slotsEntity property not set!`);
      return;
    }

    // Collect visual belt marker transforms.
    const children = this.slotsEntity.getChildren() as Entity[];
    this._slotTransforms = children.map((child: Entity) =>
      child.getComponent(TransformComponent),
    );
    if (this._slotTransforms.length !== VISUAL_SLOT_COUNT) {
      console.warn(`${LOG_TAG} Expected ${VISUAL_SLOT_COUNT} slot transforms, got ${this._slotTransforms.length}`);
    }

    // Calibrate belt distance → world-position mapping from the first marker.
    const ref = this._slotTransforms[0];
    if (ref) {
      const lx = ref.localPosition.x;
      const ly = ref.localPosition.y;

      ref.localPosition = new Vec3(lx, ly, 0);
      const wp0 = ref.worldPosition;
      this._beltOrigin = new Vec3(wp0.x, wp0.y, wp0.z);

      ref.localPosition = new Vec3(lx, ly, 1);
      const wp1 = ref.worldPosition;
      this._beltDir = new Vec3(wp1.x - wp0.x, wp1.y - wp0.y, wp1.z - wp0.z);
    }

    this._updateBeltMarkers();
  }

  // ---------------------------------------------------------------------------

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this.slotsEntity || this._slotTransforms.length === 0) return;

    const dt = payload.deltaTime;
    this._lastDt = dt;

    if (!this._conveyorService.isPaused()) {
      // Advance markers in sync with product speed.
      // Products move at `speed` world-units/s; markers cycle over CONVEYOR_SLOT_COUNT
      // slots spanning beltLength, so convert world-unit advance to slot advance.
      const slotSpacing = this._beltLength / CONVEYOR_SLOT_COUNT;
      this._animationOffset += dt * this._conveyorService.getSpeed() / slotSpacing;
      this._updateBeltMarkers();
    }

    this._syncVisuals();
  }

  // ---------------------------------------------------------------------------
  // Belt marker animation (cosmetic looping texture)
  // ---------------------------------------------------------------------------

  private _updateBeltMarkers(): void {
    const slotSpacing = this._beltLength / CONVEYOR_SLOT_COUNT;
    const rampSize    = this._transitionZone * slotSpacing;

    for (let i = 0; i < this._slotTransforms.length; i++) {
      const t = this._slotTransforms[i];
      if (!t) continue;

      const raw     = i - this._animationOffset;
      const wrapped = raw - Math.floor(raw / CONVEYOR_SLOT_COUNT) * CONVEYOR_SLOT_COUNT;
      const localZ  = wrapped * slotSpacing;

      t.localPosition = new Vec3(t.localPosition.x, t.localPosition.y, localZ);
      t.localScale    = new Vec3(1, 1, this._rampScale(localZ, rampSize));
    }
  }

  // ---------------------------------------------------------------------------
  // Sync pool entities with service products (single source of truth)
  // ---------------------------------------------------------------------------

  private _syncVisuals(): void {
    const products = this._conveyorService.getProducts();

    // Release visuals whose source product no longer exists in the service
    for (let i = this._visuals.length - 1; i >= 0; i--) {
      if (!products.includes(this._visuals[i].source)) {
        this._poolService.release(this._visuals[i].t);
        this._visuals.splice(i, 1);
      }
    }

    // Claim visuals for new products
    for (const p of products) {
      if (this._visuals.some(v => v.source === p)) continue;
      const t = this._poolService.claim();
      if (!t) {
        console.warn(`${LOG_TAG} product pool empty`);
        break;
      }
      this._visuals.push({ source: p, t, spawnTimer: 0 });
    }

    // Position all visuals
    const dt = this._lastDt;
    for (const v of this._visuals) {
      v.spawnTimer += dt;
      const d = v.source.distance;

      let scale = 1.0;
      if (v.source.delivering) {
        const t = Math.min(v.source.shrinkTimer / 0.3, 1);
        scale = 1.0 - t * 0.9;
      } else if (v.spawnTimer < SPAWN_BOUNCE_DURATION) {
        scale = this._elasticOut(v.spawnTimer / SPAWN_BOUNCE_DURATION);
      }

      v.t.localScale = new Vec3(scale, scale, scale);
      v.t.worldPosition = new Vec3(
        this._beltOrigin.x + this._beltDir.x * d,
        this._beltOrigin.y + this._beltDir.y * d,
        this._beltOrigin.z + this._beltDir.z * d,
      );
    }
  }

  private _elasticOut(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const period = 0.4;
    const shift  = period / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - shift) * (2 * Math.PI) / period) + 1;
  }

  private _rampScale(localZ: number, rampSize: number): number {
    if (localZ > this._beltLength - rampSize) {
      return Math.max(0.1, (this._beltLength - localZ) / rampSize);
    }
    if (localZ < rampSize) {
      return Math.max(0.1, localZ / rampSize);
    }
    return 1.0;
  }
}
