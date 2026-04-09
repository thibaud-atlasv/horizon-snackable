---
name: fishing-extensibility
summary: How to add fish, zones, gameplay mechanics, and new HUD elements without touching existing files
include: on-demand
---

# Fishing Game — Extensibility Guide

## 1. Add a new fish species

Open `Scripts/Fish/FishDefs.ts` and add an entry to `FISH_DEFS`:

```typescript
{ id: 19, name: 'Moonfish', zone: 2, rarity: 'rare',
  sizeMin: 1.2, sizeMax: 1.8, speedMin: 1.0, speedMax: 1.8,
  template: Assets.MyNewFish },
```

Then add the template reference in `Scripts/Assets.ts`:

```typescript
export const MyNewFish = new TemplateAsset('../Templates/Fish/MyNewFish.hstf');
```

IDs must be unique. Use the next available integer after 18.

---

## 2. Add a new zone

1. Extend `ZONE_FLOOR_Y`, `ZONE_SPAWN_TOP_Y`, `ZONE_SPAWN_BOT_Y` in `Constants.ts`
2. Update `ZONE_COUNT`
3. Add fish defs with `zone: 4` in `FishDefs.ts`
4. Set a new `UNLOCK_ZONE_4_UNIQUE` threshold in `Constants.ts`
5. Add the unlock check in `ZoneProgressionService._checkUnlocks()`
6. Recompute zones in `PlayerProgressService.loadForPlayer()`

No other files need changes — `FishSpawnService` reads `ZONE_COUNT` directly.

---

## 3. Add a new gameplay mechanic

Subscribe to existing events from any new Component or Service. No existing file changes needed.

```typescript
// Example: combo tracker
@component()
export class ComboTracker extends Component {
  private _combo = 0;

  @subscribe(Events.FishCaught)
  onCaught(_p: Events.FishCaughtPayload): void {
    this._combo++;
  }

  @subscribe(Events.BaitHitBottom)
  onMiss(_p: Events.BaitHitBottomPayload): void {
    this._combo = 0;
  }
}
```

Key hooks:

| Event | When |
|-------|------|
| `Events.PhaseChanged` | Every phase transition |
| `Events.FishHooked` | Bait touches fish → start reeling |
| `Events.FishCaught` | Fish reaches surface → catch confirmed |
| `Events.BaitHitBottom` | Bait hits floor → miss |
| `Events.ZoneUnlocked` | Player unlocks a deeper zone |
| `Events.ProgressLoaded` | Save data received from server |

---

## 4. Add a new HUD element

1. Add properties to `FishingHUDData` (or create a new `@uiViewModel()` class)
2. Subscribe to relevant events and update the vm
3. Bind in XAML

```typescript
// In FishingHUDData:
comboCount: number = 0;

// In FishingHUDViewModel:
@subscribe(Events.FishCaught)
private _onCaught(_p: Events.FishCaughtPayload): void {
  this._vm.comboCount++;
}
```

---

## 5. Modify reel difficulty

All reel tuning lives in `Constants.ts`:

| Constant | Effect |
|----------|--------|
| `REEL_TAP_JUMP_RATIO` | % of total distance per tap (default 0.08 = ~13 taps) |
| `REEL_BURST_MAX` | Maximum upward velocity from tapping |
| `REEL_BURST_DECAY` | How fast the burst fades between taps |
| `REEL_SINK_SPEED` | Base downward resistance (scaled by fish size) |
| `REEL_FATIGUE_MIN` | Fish resistance at surface (0.3 = 30% of base sink) |
| `REEL_SMOOTH_SPEED` | Visual smoothing of bait position (higher = snappier) |

Fish size multiplies `_reelSinkSpeed` at hook time — larger fish resist more.

---

## 6. Zone unlock thresholds

Thresholds are unique species counts, defined in `Constants.ts`:

```typescript
export const UNLOCK_ZONE_2_UNIQUE = 4;   // zone 1: 3 commons + 1 rare
export const UNLOCK_ZONE_3_UNIQUE = 10;  // zone 1 complete + 4 from zone 2
```

`ZoneProgressionService` checks these on every new unique catch.
`PlayerProgressService` recomputes the zone from the persisted catch list on session start.

All zones spawn fish at all times regardless of unlock state — the unlock only extends the bait floor Y (how deep the player can fish).

---

## 7. Persistence shape

`PlayerProgressService` saves a `SaveData` to `PlayerVariablesService` under key `'fishCollection'`:

```typescript
{ catchDefIds: number[], catchCounts: number[] }
```

No XP is stored. Zone unlock is recomputed from `catchDefIds.length` (unique species count) each session. To add a new persisted field: extend `SaveData`, update `loadForPlayer`, and pass it through `NetworkEvents.ProgressData` → `Events.ProgressLoaded`.

---

## 8. 3D fish display in catch screen

`CatchDisplayViewModel` spawns the caught fish's template at `fishAnchor` (scene entity in front of camera). The fish auto-rotates and scales in with an `easeOutBack` bounce.

To customize per-species display scale, set a different `localScale` on the anchor or apply a post-spawn scale override using the def's `sizeMax`.
