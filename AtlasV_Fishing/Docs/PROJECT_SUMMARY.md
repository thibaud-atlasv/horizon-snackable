# H3_Fishing — Project Summary

## Concept
Mobile portrait fishing game (9×16 world units). The player casts a bait, hooks a fish, reels it up, and builds a collection journal across sessions. Future scope: 3D animated fish with families, new gameplay mechanics (multiple hooks, time trials, seasonal events), and a full UI overhaul.

## Prototype Reference
Ported from `../../fish` (landscape prototype). Core mechanics preserved, architecture rewritten for extensibility.

## Gameplay Loop
1. **Idle** — Bait hangs from rod, fish swim at depth.
2. **Charging** — Player holds screen → gauge oscillates.
3. **Casting** — Release → bait flies under gravity, enters water.
4. **Reeling** — Bait hits fish → tap rapidly to reel up against resistance.
5. **Catch Display** — Fish zooms to center, journal shows name/rarity/count.
6. **Wave Reset** — Caught fish removed, new wave spawns (slightly faster).

## Fish Database
18 species across 3 zones. Rarity tiers: common / rare / legendary — affect spawn weight and visual flair.

| Zone | Depth | Species |
|------|-------|---------|
| 1 — Surface | Y 4.5 → -8.0 | Clownfish, Koi, Blue Discus, Butterflyfish, Angelfish, Rainbow Fish |
| 2 — Mid-depth | Y -8.0 → -24.0 | Silver Carp, Green Discus, Dolphin, Flame Angelfish, Sand Flounder, Sea Turtle |
| 3 — Abyss | Y -24.0 → -38.5 | Violet Barracuda, Blue Flounder, Reef Shark, Pink Dolphin, Barracuda, Pink Shark |

All zones spawn fish independently of unlock state (fish exist at depth even before the player can reach them).

## Zone Progression
Zones are unlocked by catching unique species — no XP system.

| Unlock | Threshold |
|--------|-----------|
| Zone 2 | 4 unique species (zone 1: 3 commons + 1 rare) |
| Zone 3 | 10 unique species (all of zone 1 + 4 from zone 2) |

`ZoneProgressionService` tracks the unlocked zone count and bait floor Y. `PlayerProgressService` recomputes the zone on each session load from the persisted catch list.

### Fish Visual Types
- **3D Models**: All 18 species use imported 3D meshes.

## Architecture At a Glance

```
ClientSetup       → camera lock, touch → Events.PlayerTouchStart/End
GameManager       → state machine, physics, collision via FishRegistry
FishRegistry      → fish def database + live IFishInstance refs
FishDefs          → auto-registers defs at module load (Pattern B)
FishController    → per-fish AI, implements IFishInstance
FishSpawnService  → spawns wave entities, sends Events.InitFish
FishCollectionService → catch journal (in-memory, persistence-ready)
BaitController    → visual: moves bait entity on Events.BaitMoved
GaugeController   → visual: power/reel gauge with FishingGaugeData ViewModel (UI/FishingGauge.xaml)
CatchDisplayViewModel → catch reveal screen with CatchDisplayData ViewModel (UI/CatchDisplay.xaml)
FishingLineRenderer → visual: line from rod to bait
WaterLayerController → 10-layer animated water with caustics
AmbientFXController  → god rays, floating particles, seaweed
BubbleController  → single rising bubble entity (self-destructs)
BubbleSpawner     → ambient bubble emitter
FishingHUDViewModel  → main HUD XAML data context (UI/FishingHUD.xaml)
  - Cast/Reel gauge with dynamic color gradient
  - Progress Bar: Shows unique species discovery progress (X/18) with fade in/out animation
    - Appears on catch, auto-hides after 3.5 seconds
    - Two depth threshold cursors marking zone unlock milestones (4/18 and 10/18)
    - Positions controlled via `cursor1Position` and `cursor2Position` (0-100%)
  - Zone Unlocked Message: Celebratory "NEW ZONE UNLOCKED!" notification
    - Positioned above the XP progress bar
    - Impactful elastic scale pop-in animation (BackEase overshoot 0→1.25→1.0)
    - Golden gradient text with shadow outline for visibility
    - Semi-transparent dark background with golden gradient border
    - Auto-hides after 3.5 seconds with fade-out and scale-down
    - Triggered via `showZoneUnlocked()` method on FishingHUDViewModel
CatchDisplayViewModel → WorldSpace UI centered in front of camera with satisfying cascade reward animations:
  - Animations triggered programmatically via `playAnimation()` method (not auto-play on load)
  - Elastic "pop" panel with overshoot (BackEase)
  - 5-point star shapes (Path geometry) with golden fill and stroke, animate sequentially by rarity
  - NEW! badge pop animation for first catches
  - Fish ID journal number slide-in (#001, #002...)
  - Catch count pop with elastic bounce
  - Pulsing "tap to continue" indicator
  - Large centered empty space for 3D fish model display
  - Navigation arrows (◀ ▶) to browse caught fish collection:
    - Circular turquoise buttons positioned outside main panel
    - Touch-friendly 70px size with press animation (scale down effect)
    - Visible only when multiple fish have been caught
    - Fires HUDEvents.NavigateCatch to cycle through journal
```

## Key Extensibility Points
See `Assistant/skills/scripting/fishing-extensibility.md` for the full guide.

| Goal | Where to change |
|------|----------------|
| Add a fish species | One line in `FishDefs.ts` (or a new file) |
| Add a fish family | New file, call `FishRegistry.register()` |
| New gameplay mechanic | Subscribe to `Events.PhaseChanged` + inject logic |
| New scoring rule | Add `IScoringRule` to a new `ScoringService` (Pattern C) |
| Environmental variant | New `@component()` subscribing to phase/wave events |
| Custom wave | Add entry to `LevelConfig.WAVE_CONFIGS` |
