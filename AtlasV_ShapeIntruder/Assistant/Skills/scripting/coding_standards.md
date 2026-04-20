---
name: coding_standards
summary: TypeScript coding conventions for Shape Intruder scripts
include: always
---

# Coding Standards

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `RoundService`, `ShapeIntruderDisplayComponent` |
| Interface | `I` prefix | `IShapeInstance`, `IOption` |
| Enum | PascalCase, explicit values | `GameState { Idle = 0, Playing = 1 }` |
| Private field | `_` prefix | `_round`, `_score` |
| `@property()` field | camelCase, no prefix | `defId`, `spawnDelay` |
| Event string ID | `Ev` prefix, globally unique | `'EvRoundStarted'` |
| Module constant | UPPER_SNAKE_CASE | `SHAPE_COUNT_BASE`, `ZONE_SIZE` |

## Key rules

- `const` by default; `let` only when reassignment is needed
- Never use `any` — use `unknown` with narrowing, or a typed interface
- Use `import type` for compile-time-only types
- Every `Component.onStart()` must guard: `if (NetworkingService.get().isServerContext()) return;`
- `@subscribe`-decorated handlers must not be `private` (TS6133 "declared but never read")
- Unused handler parameters: prefix with `_` — `onReset(_p: Events.ResetPayload): void`
- No default values needed on `LocalEvent` payload fields (unlike `NetworkEvent` payloads which require defaults)

## File layout

- One class per file; file name matches class name
- `Types.ts` and `Constants.ts` must have zero local imports
- All `TemplateAsset` and `TextureAsset` declarations in `Assets.ts` only — never via `@property()`

## Comments

Write no comments by default. Only add one when the WHY is non-obvious (hidden constraint, subtle invariant, SDK quirk). Never describe what the code does — well-named identifiers do that.

## Common pitfalls

| Pitfall | Correct approach |
|---------|-----------------|
| `t.position.set(...)` | `t.localPosition = new Vec3(...)` |
| Modifying service state from a constructor | Wait for `OnServiceReadyEvent` |
| Sending events in `OnEntityCreateEvent` | Wait for `OnEntityStartEvent` |
| Magic numbers in gameplay code | Named constants in `Constants.ts` |
| Adding events/interfaces upfront | Only add what the current feature needs |
