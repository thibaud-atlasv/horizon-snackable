---
name: coding-standards
summary: Coding conventions and patterns for Soccer Kick 3D TypeScript codebase
include: always
---

# Coding Standards

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `BallService`, `GameManager` |
| Interface | `I` prefix | `IKeeperDef`, `IGameSnapshot` |
| Enum | PascalCase, explicit values | `ShotOutcome { Goal = 0, Save = 1 }` |
| Private field | `_` prefix | `_score`, `_velocity` |
| `@property()` field | camelCase, no prefix | `defId`, `soundId` |
| Event string ID | `Ev` prefix | `'EvShotFired'`, `'EvGameReset'` |
| Module constant | UPPER_SNAKE_CASE | `TOTAL_SHOTS`, `BALL_GRAVITY` |

## File Organization

- One class per file, file name matches class name
- `Types.ts` has zero local imports — enums and interfaces only
- `Constants.ts` has zero local imports — numeric tuning values only
- `Assets.ts` is the single source for all `new TemplateAsset(...)` calls
- Def files (`Defs/`) contain static data arrays, never call `register()`

## Event Rules

- All payload fields must have default values
- Event string IDs must be globally unique with `Ev` prefix
- No `@serializable()` on LocalEvent payloads
- `@subscribe` handlers must NOT be `private` (framework calls them externally)
- Unused parameters: prefix with `_` (e.g. `_p: GameResetPayload`)

## Component Rules

- Every `onStart()` must guard: `if (this._networkingService.isServerContext()) return;`
- All spawns use `NetworkMode.LocalOnly`
- Never reference another component directly — use events
- Exception: API components (TransformComponent, ColorComponent, CustomUiComponent)

## General

- `const` by default; `let` only when reassigned
- Never use `any` — use `unknown` or typed interface
- Use `import type` for compile-time-only types
- Use `Maybe<T>` (SDK alias for `T | null`) for fields set after construction
- Comments only for non-obvious logic
- No magic numbers in gameplay code — use named constants from `Constants.ts`
