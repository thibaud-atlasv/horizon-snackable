import {
  Component,
  NetworkingService,
  NetworkMode,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  TransformComponent,
  Vec3,
  WorldService,
  component,
  property,
  subscribe,
} from 'meta/worlds';

import { FISH_LEFT, FISH_RIGHT, WATER_SURFACE_Y, WATER_BOTTOM_Y } from '../Constants';
import { Assets } from '../Assets';

/**
 * BubbleSpawner — ambient bubble emitter.
 *
 * Spawns bubbles at random positions throughout the water column.
 * Each spawned entity has BubbleController attached (via template).
 *
 * ── Editor setup ────────────────────────────────────────────────────────────────
 * Attach to any persistent scene entity.
 * @property spawnInterval  — average seconds between bubbles (default 10.5)
 * @property spawnVariance  — ± randomness in interval (default 1.2)
 */
@component()
export class BubbleSpawner extends Component {

  @property() spawnInterval: number = 10.5;
  @property() spawnVariance: number = 1.2;

  private _timer = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._resetTimer();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._timer -= p.deltaTime;
    if (this._timer <= 0) {
      void this._spawnBubble();
      this._resetTimer();
    }
  }

  private async _spawnBubble(): Promise<void> {
    const x = FISH_LEFT  + Math.random() * (FISH_RIGHT - FISH_LEFT);
    const y = WATER_BOTTOM_Y + Math.random() * (WATER_SURFACE_Y - WATER_BOTTOM_Y) * 0.8;

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: Assets.BubbleTemplate,
      position:      new Vec3(x, y, 0.2),
      rotation:      Quaternion.identity,
      scale:         Vec3.one,
      networkMode:   NetworkMode.LocalOnly,
    });

    // Position is baked into the template spawn — BubbleController reads its
    // own TransformComponent.worldPosition in onStart.
    void entity; // entity holds itself via component subscription
  }

  private _resetTimer(): void {
    this._timer = this.spawnInterval + (Math.random() * 2 - 1) * this.spawnVariance;
  }
}
