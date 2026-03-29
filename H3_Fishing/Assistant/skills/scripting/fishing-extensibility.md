---
name: fishing-extensibility
summary: How to add fish, families, gameplay variants, and new mechanics without touching existing files
include: on-demand
---

# Fishing Game — Extensibility Guide

## 1. Add a new fish species (one line)

Open `Scripts/Fish/FishDefs.ts` and add a `FishRegistry.register()` call:

```typescript
FishRegistry.register({
  id: 201, name: 'Starglint', family: 'Crystals',
  bodyColor: { r: 0.92, g: 0.98, b: 1.00 },
  tailColor: { r: 0.55, g: 0.78, b: 0.95 },
  finColor:  { r: 0.98, g: 0.88, b: 0.22 },
  sizeMin: 0.60, sizeMax: 0.80,
  speedMin: 1.5, speedMax: 2.2,
  waterLayerMin: 0, waterLayerMax: 3,
  rarity: 'rare',
});
```

IDs must be unique. Use the next available integer.

---

## 2. Add a new fish family (new file, zero changes elsewhere)

Create `Scripts/Fish/Defs/MyFamilyDefs.ts`:

```typescript
import { FishRegistry } from '../FishRegistry';

FishRegistry.register({ id: 301, name: 'Emberfin', family: 'Volcanics', ... });
FishRegistry.register({ id: 302, name: 'Magmaback', family: 'Volcanics', ... });
```

Then import this file once in `GameManager.ts` (or any entry point):

```typescript
import './Fish/Defs/MyFamilyDefs'; // side-effect import — registers the defs
```

Add `'Volcanics'` to the `FishFamily` union type in `Types.ts`.

---

## 3. Add a new gameplay mechanic

Subscribe to existing events from any new Component or Service. No existing file changes needed.

```typescript
// Example: combo multiplier that tracks successive catches
@component()
export class ComboTracker extends Component {
  private _combo = 0;

  @subscribe(Events.FishCaught)
  onCaught(_p: Events.FishCaughtPayload): void {
    this._combo++;
    // fire your own event, update HUD, etc.
  }

  @subscribe(Events.BaitHitBottom)
  onMiss(_p: Events.BaitHitBottomPayload): void {
    this._combo = 0;
  }
}
```

---

## 4. Scripted / themed waves

Edit `Scripts/LevelConfig.ts` — add entries to `WAVE_CONFIGS`:

```typescript
// Wave 5 — deep hunt: only Deeps and Abyssals, below layer 4
{ count: 5, speedMultiplier: 1.3, familyFilter: ['Deeps', 'Abyssals'], layerOverride: { min: 4, max: 7 } },
```

For fully custom logic, override `getWaveConfig()` in `LevelConfig.ts`.

---

## 5. New environmental effect

Create a new `@component()` that subscribes to phase/wave events:

```typescript
@component()
export class StormEffect extends Component {
  @subscribe(Events.WaveStart)
  onWave(p: Events.WaveStartPayload): void {
    if (p.waveIndex % 5 === 0) {
      // activate storm visuals on WaterLayerController, etc.
    }
  }
}
```

Attach it to a scene entity. No existing file modified.

---

## 6. Catch persistence

In `FishCollectionService.ts`, the `recordCatch()` and `onReady()` methods have
`// TODO` comments where PlayerVariables calls should go:

```typescript
// onReady — load:
const saved = await PlayerVariablesService.get().getVariable<string>('fishCollection');
if (saved) this._counts = new Map(JSON.parse(saved));

// recordCatch — save:
await PlayerVariablesService.get().setVariable('fishCollection',
  JSON.stringify([...this._counts.entries()]));
```

---

## 7. 3D animated fish (future)

Replace the `Fish.hstf` template with a 3D rigged model.
`FishController` already calls `applyDef()` which sets colors via `ColorComponent`.
For animation state (swim, caught, idle), add `AnimationComponent` calls in
`FishController._applyDef()` and `FishController.setCaught()` without
changing any other file.

---

## Water Layers

8 gameplay layers, 0 = surface, 7 = sand. Y positions (portrait 9×16):

| Layer | World Y | Description |
|-------|---------|-------------|
| 0 | 4.0 | Surface |
| 1 | 2.8 | Shallow |
| 2 | 1.4 | Mid-shallow |
| 3 | 0.0 | Mid |
| 4 | -1.4 | Mid-deep |
| 5 | -2.8 | Deep |
| 6 | -5.0 | Abyss |
| 7 | -6.5 | Sand |

Use `layerToWorldY(n)` and `randomYForLayers(min, max)` from `Constants.ts`.
