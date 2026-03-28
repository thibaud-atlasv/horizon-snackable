---
name: master-coordinator-extra-context
summary: Game-specific context for H2_Timestop — TIME STOP arcade game
include: always
---

# Game Context — TIME STOP

Single-player mobile portrait arcade game. Objects fall from the top, the player taps to freeze them. The closer to the floor at freeze time, the higher the score. 10 rounds, increasing difficulty.

**Platform:** Meta Horizon Worlds SDK · **Language:** TypeScript ES2022
**Execution:** Client-only — ALL logic runs on the client. Server context is never used.
**Input:** Single tap anywhere on screen → `Events.PlayerTap`
**Camera:** Fixed, facing -Z. Gameplay is in the XY plane only.

---

# Art Direction

- All meshes MUST be 3D
- Gameplay objects fall in the **XY plane** viewed face-on along **-Z**
- Play area: **9 × 16 world units**, centered at origin
- Falling objects must fit in a **1 × 1 × 1 unit cube** centered at origin — the code scales them dynamically
- Silhouette must be readable at any rotation angle (objects spin 0–360°)
- Bottom edge must be visually distinct — the player reads it to time the tap
- See `Docs/ART_DIRECTION.md` for full asset constraints and per-shape guidance

---

# Adding a New Falling Object Type

This is the primary extension point of the game. Requires exactly **5 file changes**:

1. **`Types.ts`** — add value to `FallingObjType` enum
2. **`Assets.ts`** — add `TemplateAsset` entry to `FallingObjTemplates`
3. **`LevelConfig.ts`** — use the new type in a `WaveObjDef`
4. **`SpawnManager.ts`** — add a builder function + entry in `_builders`
5. **`GameplayObjects/[TypeName].ts`** — implement `IFallingObj`: `waiting()`, `getLowestY()`, physics tick, freeze/destroy lifecycle

The `IFallingObj` interface:
```typescript
export interface IFallingObj {
  readonly objId:   number;
  readonly objType: FallingObjType;
  waiting(): boolean;
  getLowestY(): number;   // minimum Y of the object's bounding volume (world space)
}
```

The object must:
- Register itself in `FallingObjRegistry` on `Events.InitFallingObj` (with `ghost: false`)
- Unregister itself on freeze or destroy
- Send `Events.FallingObjHitFloor` if its lowest Y reaches `FLOOR_Y`
- Send `Events.FallingObjFrozen` (with `pts`, `grade`, `lowestY`) when frozen

---

# Adding Audio

Audio is not yet implemented in this project. When adding sounds:
- Use `AudioManager.ts` from `Assistant/skills/scripting/playing-audio/`
- All audio is **client-side only** — never play sounds in server context
- Use `playSound2D` for UI/grade feedback sounds (no position needed)
- Use `playSoundAtPosition` for spatially placed sounds (freeze position, floor hit)
- Subscribe to existing events — no new events needed for audio:
  - Freeze sound → `Events.FallingObjFrozen`
  - Floor hit sound → `Events.FallingObjHitFloor`
  - Grade fanfare → `HUDEvents.ShowGrade` (has `grade` and `worldY`)

---

# Building Levels and Environments

This game has no level environment to build — it is a pure UI/gameplay experience with a fixed background. New "level" content means:
- New round definitions in `LevelConfig.ts` (wave counts, bounce, pivot)
- New falling object types (see extension checklist above)

The greyboxing/level-building agent skills are **not applicable** to this game.

---

# Key Events Reference

| Event | Sender | Listeners |
|---|---|---|
| `Events.PlayerTap` | `ClientSetup` | `GameManager`, `InputManager` |
| `Events.PhaseChanged` | `GameManager`, `InputManager` | All components |
| `Events.PrepareRound` | `GameManager` | `SpawnManager`, `InputManager`, `GameHUDViewModel` |
| `Events.InitFallingObj` | `SpawnManager` | `FallingObj` (the spawned entity) |
| `Events.FallingObjActivate` | `GameManager` | `FallingObj` |
| `Events.FallingObjFreeze` | `InputManager` | `FallingObj` |
| `Events.FallingObjFrozen` | `FallingObj` | `GameManager`, `FreezeLineVisual`, `FloatingScoreText` |
| `Events.FallingObjHitFloor` | `FallingObj` | `GameManager` |
| `Events.Restart` | `GameManager`, `LeaderboardHUDViewModel` | All components |
| `HUDEvents.UpdateScore` | `GameManager` | `GameHUDViewModel` |
| `HUDEvents.ShowGrade` | `InputManager` | `FloatingScoreText` |
| `LeaderboardEvents.ShowLeaderboard` | `GameManager` | `LeaderboardHUDViewModel` |
