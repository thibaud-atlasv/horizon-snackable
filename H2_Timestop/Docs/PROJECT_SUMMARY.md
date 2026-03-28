# H2_Timestop — Project Summary

## Concept

**TIME STOP** is a mobile portrait arcade game (Meta Horizon Worlds) for a single player.

Objects fall from the top of the screen with rotation, lateral drift, and wall bounces. The player **taps the screen** to freeze them mid-air just before they hit the floor. The closer the object is to the floor at the moment of the tap, the higher the score. If an object reaches the floor without being frozen, it is **Game Over**.

| Attribute | Value |
|---|---|
| Feel | Precision tension — timing under pressure, satisfaction of the "perfect freeze" |
| Session | ~3–5 minutes (10 rounds) |
| Platform | Mobile portrait, solo, Meta Horizon Worlds |
| Execution | Client-only (`isServerContext()` guard everywhere) |

---

## Game Loop

```
[Start]
  → TAP → [Intro] (round banner + ghost preview)
         → objects activated one by one (1s interval)
         → [Falling] TAP → scores the lowest object → [Clearing] (280ms)
                       └── all frozen? → [RoundEnd] → next round
                                       else → [Falling]
  → last round complete → [End] → TAP → restart
  → object touches FLOOR_Y → [GameOver] → TAP → restart
```

### Phases (`GamePhase`)

| Phase | Description |
|---|---|
| `Start` | Title screen, "Tap to start". Round 0 objects already pre-spawned as ghosts. |
| `Intro` | "Round N" banner, objects visible but inactive (ghost). Duration: 1050 ms. |
| `Falling` | Objects actively falling. Tap accepted. Objects are activated one by one (1s apart). |
| `Clearing` | 280 ms pause after a freeze (objects physically stopped). |
| `RoundEnd` | Transition between rounds. |
| `GameOver` | An object reached `FLOOR_Y`. Displays final score. |
| `End` | All 10 rounds complete. Displays final score. |

---

## Scoring System

The freeze score is based on **precision** = fraction of the `PLAY_TOP → FLOOR_Y` distance traveled (0 = above the zone, 1 = at the floor).

| Grade | Threshold (distance from perfect) | Base Points | Max Bonus |
|---|---|---|---|
| Perfect | ≤ 3.5 % | 1000 | +250 |
| Great | ≤ 13 % | 650 | +250 |
| Good | ≤ 32 % | 350 | +250 |
| Early | ≤ 60 % | 150 | +250 |
| Miss | > 60 % | 30 | +250 |

The bonus is `precision × 250` (rounded), added to the base score. Total score accumulates over all 10 rounds.

---

## Play Area (Y-up, world units)

```
 6.68  ──  START_Y   (spawn / ghost preview)
 5.49  ──  PLAY_TOP  (start of scoring zone)
  ...     [active play zone]
-6.47  ──  FLOOR_Y   (game-over if any corner of an object goes below)
```

Play area: **9 × 16 world units**, centered at the origin.

---

## Round Progression

10 rounds with increasing difficulty. Three mechanics are introduced progressively:

| Round | Objects | Wall Bounce | Off-center Pivot |
|---|---|---|---|
| 1 | 1 | — | — |
| 2 | 2 | — | — |
| 3 | 2 | ✓ (hard) | — |
| 4 | 3 | ✓ | — |
| 5 | 3 | ✓ | ✓ |
| 6–7 | 4 | ✓ | ✓ |
| 8–10 | 5 | ✓ | ✓ |

Fall speed increases by ~0.34 wu/s per round (base ~3.61 wu/s).

---

## Object Physics (Log type)

Each Log object is a flat rectangle (`logW × LOG_H × 0.1` world units), dynamically resized via `TransformComponent.localScale`.

| Parameter | Range | Details |
|---|---|---|
| Width | 2.06 – 3.89 wu | Random at each spawn |
| Fall speed | 3.61 – 6.67 wu/s | Constant per object, increases per round |
| Horizontal drift (vx) | 1.03 – 2.74 wu/s | Sign independent from angle |
| Initial angle | ±8 – 48 ° | Sign independent from torque |
| Torque | ±40 – 220 °/s | Drives rotation during fall |
| Off-center pivot | ±0 – 50 % of half-width | Rotation around a shifted point (rounds 5+) |

**Wall bounce:** position correction + `vx` inversion with damping + torque kick.
- Hard bounce (rounds 3+): `BOUNCE_KICK_FULL ≈ 1.03 wu/s`, `BOUNCE_TORQUE_ADD = 2.0 rad/s`
- Soft deflection (rounds 1–2): `BOUNCE_KICK_SOFT ≈ 0.57 wu/s`, `BOUNCE_TORQUE_ADD_SOFT = 0.8 rad/s`

**Freeze → fade out:** 240 ms at full opacity, then 460 ms fade via `ColorComponent` alpha → `entity.destroy()`.

---

## Ghost System (Preview)

At the start of each round, **all objects are spawned simultaneously** in ghost mode:
- Visible at `START_Y`, in their starting position/angle/scale
- Inactive (not registered in `FallingObjRegistry`, physics disabled)
- When the `Falling` phase begins, `GameManager` sends `FallingObjActivate` one by one every 1 second

The player can therefore **see all upcoming objects** before the fall begins.

---

## Architecture

### Communication

All components communicate exclusively via `LocalEvent`. **No direct references between components.** Shared state goes through `FallingObjRegistry` (singleton) or events.

### Key Files

| File | Class | Role |
|---|---|---|
| `Scripts/Types.ts` | — | Enums, interfaces, all events and payloads |
| `Scripts/Constants.ts` | — | All numeric gameplay constants |
| `Scripts/LevelConfig.ts` | — | Round definitions (`ROUND_DEFS`) |
| `Scripts/Assets.ts` | — | `FallingObjTemplates`: template per `FallingObjType` — **all template assets must be referenced here by path** |
| `Scripts/GameManager.ts` | `GameManager` | Phase orchestration, score, restart, sequential activation |
| `Scripts/InputManager.ts` | `InputManager` | Tap → score → freeze → Clearing/RoundComplete phase |
| `Scripts/SpawnManager.ts` | `SpawnManager` | Ghost spawn + `InitFallingObj` + `AllObjsSpawned` dispatch |
| `Scripts/LogRegistry.ts` | `FallingObjRegistry` | Singleton: tracks active (non-waiting) objects |
| `Scripts/GameplayObjects/Log.ts` | `FallingObj` | Physics + lifecycle for each object (dispatched by type) |
| `Scripts/ClientSetup.ts` | `ClientSetup` | Fixed camera + `FocusedInteraction` → `Events.PlayerTap` |
| `Scripts/GameHUD/GameHUDViewModel.ts` | `GameHUDViewModel` | Manages the 2D HUD: score, central announcements (phases, "3→2→1" countdown, "GAME OVER", "VICTORY!") |
| `Scripts/LeaderboardHUD/LeaderboardHUDViewModel.ts` | `LeaderboardHUDViewModel` | Manages the leaderboard overlay: top 5 with current player highlight, score submission to `LeaderboardsService`, integrated restart button |
| `assets/UI/GameHUD.xaml` | — | Arcade-style mobile HUD: top score with pulse animation, dynamic central text with pop-in animations |
| `assets/UI/LeaderboardHUD.xaml` | — | Arcade-style leaderboard overlay: "VICTORY!" or "GAME OVER" with dynamic color, player score and rank, top 5 leaderboard with player highlight and gold/silver/bronze medals |
| `Scripts/CollisionManager.ts` | `CollisionManager` | Generic AABB (available, not used by main physics) |
| `Scripts/GameplayObjects/FreezeLineVisual.ts` | `FreezeLineVisual` | Visual feedback: colored horizontal line at freeze Y position |
| `Scripts/GameplayObjects/FloatingScoreText.ts` | `FloatingScoreText` | Visual feedback: grade + score text, animated upward with fade out |

### Main Event Flow

```
ClientSetup.onTouchStarted → Events.PlayerTap
  → GameManager.onPlayerTap  (Start/GameOver/End: phase transition)
  → InputManager.onPlayerTap (Falling: score + freeze)

SpawnManager.onPrepareRound → spawnTemplate × N → Events.InitFallingObj (ghost)
  → Events.AllObjsSpawned → GameManager.onAllObjsSpawned → startRound()

GameManager._setPhase(Falling) → Events.PhaseChanged
  → FallingObj.onPhaseChanged (unlocks physics)
  → GameManager._scheduleNextActivation → Events.FallingObjActivate (×N, 1s apart)
  → FallingObj.onActivate (sets _launched = true)

InputManager._handleTap → Events.FallingObjFreeze → FallingObj.onFreeze
  → Events.FallingObjFrozen → GameManager.onFallingObjFrozen (score)
                            → FreezeLineVisual.onFallingObjFrozen (spawn line)
  → (after RESUME_DELAY) → Events.PhaseChanged(Falling) or RoundComplete

GameManager._showEnd/_onFallingObjHitFloor → HUDEvents.ShowLeaderboard
  → LeaderboardHUDViewModel.onShowLeaderboard → fetch + display leaderboard
```

---

## Leaderboard System

The leaderboard is displayed automatically at the end of each game (GameOver or End/Victory).

### Features

| Feature | Description |
|---|---|
| Auto submission | Score submitted via `LeaderboardsService.updateEntryForPlayer()` |
| Top 5 | Displays the top 5 scores with rank, name, and score |
| Player highlight | Current player's row is highlighted in gold |
| Medals | Top 3 colored: gold (1st), silver (2nd), bronze (3rd) |
| Loading/Error | Loading and error states handled gracefully |
| Restart button | Integrated "Tap to restart" button in the leaderboard overlay |

### Events

| Event | Payload | Role |
|---|---|---|
| `HUDEvents.ShowLeaderboard` | `playerScore`, `isVictory` | Triggers leaderboard display |
| `HUDEvents.HideLeaderboard` | — | Hides the leaderboard |

### Configuration

The leaderboard API name is defined in `Constants.ts` as `LEADERBOARD_API_NAME` (default: `timestop_highscores`). This leaderboard must be configured in the Meta Horizon world settings.

---

## Templates

All template assets **must be registered in `Scripts/Assets.ts`** using a `TemplateAsset` with the relative path to the `.hstf` file. No component should reference a template path directly.

```typescript
// Scripts/Assets.ts
export const FallingObjTemplates = {
  [FallingObjType.Log]: new TemplateAsset('../Templates/GameplayObjects/Log.hstf'),
} as const;
```

| Template | Asset reference | Description |
|---|---|---|
| `Templates/GameplayObjects/Log.hstf` | `FallingObjTemplates[FallingObjType.Log]` | Cube scale 1 — dynamically resized by `FallingObj` |
| `Templates/GameplayObjects/FloatingText.hstf` | `FloatingScoreText._textTemplate` | WorldTextComponent for animated floating text |
| `Templates/GameplayObjects/HorizontalLine.hstf` | `FreezeLineVisual` template asset | Horizontal line for freeze visual feedback |

---

## Extension Points

`FallingObjType` (enum in `Types.ts`) identifies each object variant. Adding a new type requires changes in **5 places only**:

1. **`Types.ts`** — new value in `FallingObjType`
2. **`Assets.ts`** — new entry in `FallingObjTemplates` with the `.hstf` path
3. **`LevelConfig.ts`** — use the new type in a `WaveObjDef`
4. **`SpawnManager._buildObjConfig()`** — new `case` for parameter generation
5. **`FallingObj` (Log.ts)** — new `case` in `_initTypePhysics`, `_tickTypePhysics`, `_applyTypeTransform`, and `getLowestY()` if the bounding volume differs

| Feature | Where to intervene |
|---|---|
| New falling object (e.g. ball, spike) | `FallingObjType` + `Assets` + `LevelConfig` + `SpawnManager` + `FallingObj` |
| New round / wave configuration | `LevelConfig.ts → ROUND_DEFS` |
| Grade visual feedback (floating text) | `FloatingScoreText` subscribed to `Events.FallingObjFrozen` |
| Freeze line (active) | `FreezeLineVisual` subscribed to `Events.FallingObjFrozen` |
| Sound / audio | New component subscribed to `FallingObjFrozen`, `FallingObjHitFloor`, etc. |
| Colors per object type | `colorIdx` in `InitFallingObjPayload` → apply in `FallingObj._initTypePhysics` |
| Special effects on freeze | Subscribe a VFX component to `Events.FallingObjFrozen` (payload contains `lowestY`) |
| Extended HUD (combo, timer) | New payload in `HUDEvents` + handler in `GameHUDViewModel` |
| Static obstacles | New component + `ICollider` + `CollisionManager` |
