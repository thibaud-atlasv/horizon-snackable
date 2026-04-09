---
name: fish-behavior
summary: How fish AI works and how to add new fish behaviors in H3_Fishing
include: on-demand
---

# Fish Behavior — H3_Fishing

## Current AI: SimpleFishController

Each fish is a spawned template entity with `SimpleFishController` attached. On `Events.InitFish` (targeted to the entity), it:

1. Registers itself in `FishRegistry` as an `IFishInstance`
2. Swims horizontally back and forth within `[FISH_LEFT, FISH_RIGHT]`
3. Bobs vertically around its `baseY`
4. On `setCaught(true)` — stops swimming, follows the bait via `setPosition()`

Fish do not know about zones or the player. They are fully self-contained.

## IFishInstance interface

```typescript
interface IFishInstance {
  readonly fishId : number;  // unique runtime ID
  readonly defId  : number;  // links to IFishDef in FISH_DEFS
  readonly worldX : number;
  readonly worldY : number;
  readonly size   : number;  // used by RodController to scale sink speed
  setCaught(v: boolean): void;
  setPosition(x: number, y: number): void;
}
```

`FishRegistry.findHit(baitX, baitY)` iterates all registered instances and returns the first within collision radius (`size * 0.5`).

## Adding a new behavior variant

Create a new component that implements `IFishInstance` and registers itself:

```typescript
@component()
export class DivingFishController extends Component implements IFishInstance {
  // ... implement interface fields

  @subscribe(Events.InitFish)
  onInit(p: Events.InitFishPayload): void {
    if (/* this is not my entity */) return;
    FishRegistry.get().register(this);
    // custom init: dive down periodically, etc.
  }
}
```

Then assign a template that uses `DivingFishController` instead of `SimpleFishController`. No changes to `FishSpawnService`, `FishRegistry`, or `RodController`.

## Bubble system

`BubbleController` is attached to a `Bubble.hstf` template. It rises at a random speed from `[BUBBLE_RISE_SPEED_MIN, BUBBLE_RISE_SPEED_MAX]` and self-destructs when it crosses `WATER_SURFACE_Y`. `SimpleFishController` spawns bubbles at random intervals `[BUBBLE_INTERVAL_MIN, BUBBLE_INTERVAL_MAX]` by calling `WorldService.spawnTemplate` with `Assets.BubbleTemplate`.

## Collision detection

`RodController._tickFalling()` calls `FishRegistry.get().findHit(baitX, baitY)` every frame during the `Falling` phase. Hit radius = `fish.size * 0.5`. The first hit wins — no multi-hook support currently.

## Fish size effect on gameplay

`_reelSinkSpeed = REEL_SINK_SPEED * hit.size` — larger fish resist the reel more. Combined with the fatigue system (`REEL_FATIGUE_MIN`), big fish are hardest at the start and easier near the surface.
