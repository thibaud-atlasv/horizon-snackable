---
name: custom-powerups
summary: Step-by-step procedure for adding a new power-up type with its own effect, template asset, and level configuration
include: on-demand
---

# Creating a Custom Power-Up

A power-up involves four coordinated pieces: the **type enum**, the **paddle effect**, the **pickup template**, and the **level config**. Follow the steps in order.

---

## Step 1 — Declare the type in Types.ts

Add a new entry to `PowerUpType`. Values must be **explicit and sequential** (no gaps).

```typescript
// Scripts/Types.ts
export enum PowerUpType {
  BigPaddle    = 0,
  StickyPaddle = 1,
  SlowBall     = 2,  // ← new
}
```

---

## Step 2 — Implement the paddle effect in PaddleEffects.ts

Create a class implementing `IPowerUpEffect` and register it in the factory.

```typescript
// Scripts/Components/PaddleEffects.ts

export class SlowBallEffect implements IPowerUpEffect {
  readonly stackable = false;
  readonly color = new Color(0.2, 0.6, 1, 1); // blue tint on paddle

  onStart(_ctx: PaddleContext): void {
    // Fire an event so Ball (or any subscriber) can react.
    // Add the corresponding event + payload to Types.ts if needed.
    EventService.sendLocally(Events.SlowBallActivated, {});
  }

  onEnd(_ctx: PaddleContext): void {
    EventService.sendLocally(Events.SlowBallDeactivated, {});
  }
}

// Add a case to the factory at the bottom of the file:
export function createPaddleEffect(type: PowerUpType): IPowerUpEffect {
  switch (type) {
    case PowerUpType.BigPaddle:    return new BigPaddleEffect();
    case PowerUpType.StickyPaddle: return new StickyPaddleEffect();
    case PowerUpType.SlowBall:     return new SlowBallEffect();   // ← new
  }
  return null as never;
}
```

### IPowerUpEffect contract

| Member | Type | Description |
|---|---|---|
| `stackable` | `boolean` | `true` → multiple pickups coexist with independent timers (e.g. `BigPaddleEffect`: each stack adds +20% width via `onStackChanged`). `false` → picking up again resets the timer (e.g. `StickyPaddleEffect`). |
| `color` | `Color` | Paddle tint displayed while this effect is active. |
| `onStart(ctx)` | method | Called when the effect activates. |
| `onEnd(ctx)` | method | Called when the timer expires or on round reset. |
| `onStackChanged?(ctx, count)` | optional method | Only called when `stackable=true`, each time the stack count changes. Use for incremental effects (e.g. scale = `normalScale.x * (1 + count * 0.2)`). |

`PaddleContext` exposes `transform`, `colorComponent`, and `normalScale` — use these for direct paddle manipulation (scale, color). Fire events for anything else (ball speed, etc.).

### Existing effects reference

| Effect | `stackable` | Behavior |
|---|---|---|
| `BigPaddleEffect` | `true` | Each stack adds +20% paddle width via `onStackChanged`. Green tint. |
| `StickyPaddleEffect` | `false` | Ball sticks to paddle on contact. Yellow tint. Fires `StickyPaddleActivated/Deactivated` events. |

---

## Step 3 — Register the template asset in Assets.ts

Add an entry to `PowerUpAssets` whose key **exactly matches the enum member name**.
`PowerUpManager` resolves the template at runtime using `PowerUpType[type]` as the key.

```typescript
// Scripts/Assets.ts
export const PowerUpAssets = {
  BigPaddle:    new TemplateAsset('@Templates/GameplayObjects/PowerUp.hstf'),
  StickyPaddle: new TemplateAsset('@Templates/GameplayObjects/PowerUp.hstf'),
  SlowBall:     new TemplateAsset('@Templates/GameplayObjects/PowerUpSlowBall.hstf'),  // ← new
} as const;
```

Each entry points to a `.hstf` template that can have its own visuals, VFX, and audio.
All pickup templates must have a `PowerUp` component attached.

---

## Step 4 — Use it in LevelConfig.ts

Add the new type to the `powerUps` array of any level that should spawn it.

```typescript
// Scripts/LevelConfig.ts
import { PowerUpType } from './Types';

powerUps: [
  { type: PowerUpType.BigPaddle,    weight: 2, powerUpDuration: 10 },
  { type: PowerUpType.StickyPaddle, weight: 1, powerUpDuration: 8  },
  { type: PowerUpType.SlowBall,     weight: 1, powerUpDuration: 6  },  // ← new
],
```

`weight` is relative — here SlowBall has a 1-in-4 (25%) chance of being selected.

---

## Template setup (Horizon editor)

Each power-up type can use a distinct `.hstf` template:

1. Duplicate `Templates/GameplayObjects/PowerUp.hstf`
2. Rename it (e.g. `PowerUpSlowBall.hstf`)
3. Customize visuals, particle VFX, and audio clips inside the template
4. Make sure the `PowerUp` component is attached (it carries `powerUpType` and `powerUpDuration`)
5. Update the path in `Assets.ts` → `PowerUpAssets.SlowBall` to point to the new template

The `PowerUp` component's `powerUpType` is set at runtime by `PowerUpManager`, so you don't need to set it in the template editor.

---

## Effects that act on the Ball

Effects that need to influence ball speed or behavior should fire events. Add the event pair to `Types.ts` and subscribe in `Ball.ts`.

```typescript
// Types.ts — inside Events namespace
export class SlowBallActivatedPayload {}
export const SlowBallActivated = new LocalEvent<SlowBallActivatedPayload>('EvSlowBallActivated', SlowBallActivatedPayload);

export class SlowBallDeactivatedPayload {}
export const SlowBallDeactivated = new LocalEvent<SlowBallDeactivatedPayload>('EvSlowBallDeactivated', SlowBallDeactivatedPayload);

// Ball.ts
@subscribe(Events.SlowBallActivated)
private onSlowBallActivated(): void {
  this._speedMultiplier *= 0.5;
}

@subscribe(Events.SlowBallDeactivated)
private onSlowBallDeactivated(): void {
  this._speedMultiplier /= 0.5;
}
```

---

## Checklist

- [ ] New value added to `PowerUpType` enum with an explicit integer.
- [ ] `IPowerUpEffect` class implemented and registered in `createPaddleEffect`.
- [ ] Entry added to `PowerUpAssets` in `Assets.ts` with a key matching the enum member name.
- [ ] Template `.hstf` created, customized, and assigned in the inspector.
- [ ] Type added to `powerUps` array in the relevant levels in `LevelConfig.ts`.
- [ ] If the effect acts on the ball: event pair added to `Types.ts`, subscribed in `Ball.ts`.
