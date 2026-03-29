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
200 species across 8 families: Solars, Corals, Greens, Crystals, Deeps, Violets, Ghosts, Abyssals.
Rarity tiers: common / rare / legendary — affect spawn weight and visual flair.
Currently only seed entries are in `FishDefs.ts` — full data to be populated by the team.

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
GaugeController   → visual: cast/reel gauge entity
FishingLineRenderer → visual: line from rod to bait
WaterLayerController → 10-layer animated water with caustics
AmbientFXController  → god rays, floating particles, seaweed
BubbleController  → single rising bubble entity (self-destructs)
BubbleSpawner     → ambient bubble emitter
FishingHUDViewModel  → main HUD XAML data context
CatchDisplayViewModel → catch reveal screen + journal navigation
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
