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
| [scripting/falling-objects/falling-objects.md](scripting/falling-objects/falling-objects.md) | Core game mechanic — adding new falling object types (5-file extension checklist) |
| [scripting/playing-audio/playing-audio.md](scripting/playing-audio/playing-audio.md) | AudioManager setup and API — one-shot, music, looping sounds |
| [scripting/creating-gameplay-objects/creating-gameplay-objects.md](scripting/creating-gameplay-objects/creating-gameplay-objects.md) | Template creation, mesh setup, dynamic spawning — read project-specific notes first |

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

## NOT applicable to this project

These generic skills exist in the Assistant library but describe architectures that conflict with this game. Do not use them without adaptation:

| File | Why not applicable |
|---|---|
| `scripting/game-loop/game-loop.md` | Describes a separate MainMenu/Pause/GameOver state machine with its own script files. This game uses `GameManager.ts` + `GamePhase` enum directly — do not install the generic game loop. |
| `scripting/health-system/` | This game has no health. Game over is triggered by `Events.FallingObjHitFloor`. |
| `scripting/third-person-controller-input-aligned/` | This game has no player movement. Input is a single tap via `Events.PlayerTap`. |
| `scripting/moving-platforms/` | Not applicable — objects fall by custom physics in `FallingObj`, not platform components. |
| `scripting/collectibles/` | Not applicable — objects are frozen by tap, not collected. |
| `scripting/environmental-hazards/` | Not applicable. |
| `scripting/cameras/top-down-camera.md` | Camera is fixed in `ClientSetup.ts`. Do not add a camera follow component. |
