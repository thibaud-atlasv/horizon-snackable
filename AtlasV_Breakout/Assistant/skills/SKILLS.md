# Skills Index

Reference guide for all available skill files in this project.
Each file contains guidelines, procedures, or standards for a specific domain.

---

## Global

| File | Summary |
|---|---|
| [global/architecture.md](global/architecture.md) | Project structure, feature organization, execution model, communication pattern, services vs components |
| [global/coordinate-system.md](global/coordinate-system.md) | MHE coordinate system — Y-Up, Forward is -Z |

---

## Scripting

| File | Summary |
|---|---|
| [scripting/coding_standards.md](scripting/coding_standards.md) | TypeScript guidelines: naming, types, modularity, code style |
| [scripting/events.md](scripting/events.md) | How to declare, dispatch, and subscribe to typed events (LocalEvent / NetworkEvent) |
| [scripting/level_design.md](scripting/level_design.md) | How to create and configure a Breakout level in `LevelConfig.ts` |
| [scripting/custom_bricks.md](scripting/custom_bricks.md) | How to create a brick with a custom asset or custom behavior logic |
| [scripting/custom_powerups.md](scripting/custom_powerups.md) | How to add a new power-up type with its own effect, template asset, and level config |
| [scripting/new_service.md](scripting/new_service.md) | How to create a new singleton `@service()` manager (pool, tracker, etc.) |
| [scripting/new_hud.md](scripting/new_hud.md) | How to create a new HUD/UI overlay component with bindings and animations |

---

## Art

| File | Summary |
|---|---|
| [art/asset_guidelines.md](art/asset_guidelines.md) | Asset creation, `@Templates/` registration, AABB collision constraints, color system |

---

## Audio

| File | Summary |
|---|---|
| [audio/sound_design.md](audio/sound_design.md) | How to add sound effects and music via the AudioManager service |
