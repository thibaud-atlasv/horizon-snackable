---
name: coding-standards
summary: TypeScript guidelines for modular, event-driven Horizon scripts
include: always
---

# TypeScript Coding Standards

## Naming

| Element | Convention | Example |
|---|---|---|
| Class | PascalCase, no feature prefix | `GameManager`, `Ball`, `LevelLayout` |
| Interface | PascalCase, prefix `I` | `ICollider` |
| Enum | PascalCase | `PowerUpType` |
| Events namespace | `Events` | `Events.BallLost` |
| Private field | camelCase, prefix `_` | `_velocity`, `_isIdle` |
| `@property()` field | camelCase, no prefix | `ballSpeed`, `maxLives` |
| Event string ID | prefix `Ev` | `'EvBallLost'`, `'EvRestart'` |
| Module-level constant | UPPER_SNAKE_CASE | `BOUNDS`, `MAX_SPEED` |

---

## Types.ts

All of the following belong in `Types.ts` at the feature root — never scattered across component files:

- Interfaces (e.g. `ICollider`, `Rect`)
- Enums (e.g. `PowerUpType`)
- The `Events` namespace: event constants, payload classes

Payload classes must have default values on all fields. Enums must have explicit numeric values starting at 0.

```typescript
export namespace Events {
  @serializable()
  export class BallLostPayload {}
  export const BallLost = new LocalEvent<BallLostPayload>('EvBallLost', BallLostPayload);
}

export enum PowerUpType {
  BigPaddle = 0,
  MultiBall  = 1,
}
```

---

## Constants

- **Shared constants** (bounds, grid size, colors, timing, themes): export from `Constants.ts`.
- **Feature-specific tuning values** (speed, health, scale): declare as `@property()` on the component so they are editable in the inspector. Do not put them in `Constants.ts`.

```typescript
// Constants.ts — shared geometry
export const BOUNDS: Rect = { x: -4.5, y: -8, w: 9, h: 16 };

// Ball.ts — tunable per instance
@property()
private ballSpeed: number = 5;
```

---

## Modularity Rules

1. **No direct component references.** Components communicate only through `EventService`. If component A needs to trigger behavior in component B, it fires an event.
2. **Generic code.** Write logic to be reusable. Avoid assumptions about the surrounding game — a `CollisionManager` should work for any collider, not just bricks and balls.
3. **No circular imports.** `Types.ts` and `Constants.ts` never import from sibling files in the same feature.
4. **Single responsibility.** A manager orchestrates. A gameplay object handles its own behavior. Neither does the other's job.

---

## Code Style

- All internal fields and methods are `private`. Expose only what an interface or the inspector requires.
- Prefix unused parameters with `_`: `onReset(_payload: Events.ResetPayload)`.
- Fields guaranteed to be set in `onStart` use the definite assignment assertion: `private _transform!: TransformComponent`.
- Never use `any`. Use `unknown` and narrow if the type is genuinely unknown.
- Use `import type` for types only needed at compile time.
- `const` by default; `let` only when reassignment is needed.
- Do not add comments that restate what the code does. Only comment non-obvious logic.
