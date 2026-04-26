import {
  EventService,
  NetworkMode,
  OnServiceReadyEvent,
  Quaternion,
  Service,
  TransformComponent,
  Vec3,
  WorldService,
  service,
  subscribe,
  type Entity,
} from 'meta/worlds';

import { Assets } from '../Assets';
import { FISH_LEFT, FISH_RIGHT, WATER_SURFACE_Y, ZONE_FLOOR_Y } from '../Constants';
import { Events } from '../Types';

const POOL_SIZE = 40;

// =============================================================================
//  BubblePool
//
//  Pre-instantiates POOL_SIZE bubble entities at service start. Keeps inactive
//  bubbles disabled. SimpleFishController calls acquire(x, y) to activate one,
//  BubbleController calls release(entity) when it reaches the surface.
// =============================================================================

@service()
export class BubblePool extends Service {

  private _free: Entity[] = [];
  private _ready = false;
  private _poolPosition = new Vec3(0, 1000, 0);

  @subscribe(OnServiceReadyEvent)
  async onReady(): Promise<void> {
    for (let i = 0; i < POOL_SIZE; i++) {
      const entity = await WorldService.get().spawnTemplate({
        templateAsset: Assets.BubbleTemplate,
        position:      this._poolPosition,
        rotation:      Quaternion.identity,
        scale:         Vec3.one,
        networkMode:   NetworkMode.LocalOnly,
      });
      const x = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT);
      const y = ZONE_FLOOR_Y[2] + Math.random() * (WATER_SURFACE_Y - ZONE_FLOOR_Y[2]);
      EventService.sendLocally(Events.InitBubble, { x, y }, { eventTarget: entity });
    }
    this._ready = true;
  }

  /** Activate a pooled bubble at world position (x, y). No-op if pool is empty. */
  acquire(x: number, y: number): void {
    if (!this._ready || this._free.length === 0) return;
    const entity = this._free.pop()!;
    EventService.sendLocally(Events.InitBubble, { x, y }, { eventTarget: entity });
  }

  /** Return a bubble to the pool and disable it. Called by BubbleController. */
  release(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (tc) tc.worldPosition = this._poolPosition;
    this._free.push(entity);
  }
}
