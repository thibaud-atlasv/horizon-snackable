# Skills Index

Reference guide for all available skill files in this project.

---

## Global — always loaded

| File | Summary |
|---|---|
| [global/architecture.md](global/architecture.md) | Folder structure, execution model, event communication, singleton pattern |
| [global/coordinate-system.md](global/coordinate-system.md) | Y-Up RUB coordinate system — forward is -Z |

---

## Scripting

| File | Summary |
|---|---|
| [scripting/coding_standards.md](scripting/coding_standards.md) | TypeScript naming, types, modularity, HUD/ViewModel pattern, code style |
| [scripting/falling-objects/falling-objects.md](scripting/falling-objects/falling-objects.md) | Core game mechanic — adding new falling object types (4-file checklist for entity-based, or simulated) |
| [scripting/playing-audio/playing-audio.md](scripting/playing-audio/playing-audio.md) | AudioManager setup and API — one-shot, music, looping sounds |
| [scripting/creating-gameplay-objects/creating-gameplay-objects.md](scripting/creating-gameplay-objects/creating-gameplay-objects.md) | Template creation, mesh setup, dynamic spawning |

---

## Art

| File | Summary |
|---|---|
| [Docs/ART_DIRECTION.md](../../Docs/ART_DIRECTION.md) | Asset constraints: mesh scale, bounding volumes, readability, ghost mode, freeze fade |

---

## Audio

| File | Summary |
|---|---|
| [scripting/playing-audio/playing-audio.md](scripting/playing-audio/playing-audio.md) | AudioManager API reference |

---

## Project Structure (current)

```
scripts/
  Types.ts / Constants.ts / Assets.ts / LevelConfig.ts
  Shared/FallingObjUtils.ts
  services/          ← @service() — no scene entity, auto-init
    FallingObjService.ts   physics sim + render emit
    InputManager.ts        tap handling + scoring
    SpawnManager.ts        round spawning
  components/        ← @component() — must be on a scene entity
    GameManager.ts         entry point, forces all services .get()
    ClientSetup.ts         camera + touch
    GameHUD/
      FallingObjCanvas.ts
      GameHUDViewModel.ts
      LeaderboardHUDViewModel.ts
      FreezeFeedbackHUDViewModel.ts
    GameplayObjects/
      BallObj.ts            (unused until Ball rounds in LevelConfig)
      FloatingScoreText.ts
      FreezeLineVisual.ts
```

**Service vs Component rule:**
- Use `@service()` when the class has no `@property()` fields and no `getComponent()` calls on `this.entity`. Services need no scene entity.
- Use `@component()` for anything that binds to a specific entity, reads inspector properties, or manages a `CustomUiComponent`.
- `GameManager` is always `@component()` — it is the mandatory scene entry point that guarantees services are registered.

---

## NOT applicable to this project

These generic skills exist in the Assistant library but describe architectures that conflict with this game:

| File | Why not applicable |
|---|---|
| `scripting/game-loop/game-loop.md` | This game uses `GameManager.ts` + `GamePhase` enum directly — do not install the generic game loop. |
| `scripting/health-system/` | No health. Game over is triggered by `Events.FallingObjHitFloor`. |
| `scripting/third-person-controller-input-aligned/` | No player movement. Input is a single tap via `Events.PlayerTap`. |
| `scripting/moving-platforms/` | Objects fall by custom physics in `FallingObjService`, not platform components. |
| `scripting/collectibles/` | Objects are frozen by tap, not collected. |
| `scripting/environmental-hazards/` | Not applicable. |
| `scripting/cameras/top-down-camera.md` | Camera is fixed in `ClientSetup.ts`. Do not add a camera follow component. |
