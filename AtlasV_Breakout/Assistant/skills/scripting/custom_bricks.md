---
name: custom-bricks
summary: Procedure for creating a brick with a custom asset or custom behavior logic
include: on-demand
---

# Creating a Custom Brick

The built-in `Brick` component covers HP, color, reveal animation, death animation, and pool recycling. For anything beyond that (explosion, split, teleport, shield, etc.) you create a **subclass** of `Brick`.

---

## Architecture overview

`LevelLayout` spawns all bricks from a shared pool of `BrickAssets.Normal` entities. Each entity carries a `Brick` component. For custom behavior, create a subclass that `extends Brick` and override the template methods.

Bricks are **never destroyed** — they are pooled. On death, the brick plays its death animation, then calls `_park()` which moves it off-screen and fires `Events.BrickRecycle` so `LevelLayout` can reclaim it.

Collision detection is handled by `CollisionManager`. Bricks register after their reveal animation completes and unregister on destruction.

---

## Option A — Different visuals, same logic

If you only need a different mesh or material but the same HP/color/destruction behavior, keep the `Brick` component and use a separate template:

1. Create a new `.hstf` in `Templates/GameplayObjects/`
2. Attach the `Brick` component to it
3. Register it in `Assets.ts`:
   ```typescript
   export const BrickAssets = {
     Normal:    new TemplateAsset('@Templates/GameplayObjects/Brick.hstf'),
     Explosive: new TemplateAsset('@Templates/GameplayObjects/ExplosiveBrick.hstf'),
     Armored:   new TemplateAsset('@Templates/GameplayObjects/ArmoredBrick.hstf'),
   } as const;
   ```
4. Use it in `LevelConfig.ts`:
   ```typescript
   'A': { asset: BrickAssets.Armored, hits: 3 },
   ```

---

## Option B — Custom behavior (subclass)

For bricks with custom logic, create a subclass of `Brick`. This is the pattern used by `ExplosiveBrick`.

### Step 1 — Create the component

Create `Scripts/Components/MyBrick.ts`:

```typescript
import { component, EventService, property } from 'meta/worlds';
import { Events, type IBrick } from '../Types';
import { CollisionManager } from '../CollisionManager';
import { Brick } from './Brick';

@component()
export class MyBrick extends Brick {

  @property()
  myParam: number = 1.0;

  /**
   * Override triggerDestruction for external destruction triggers
   * (e.g. chain explosions). Add guards here if needed.
   */
  override triggerDestruction(): void {
    CollisionManager.get().unregister(this);
    this.onDestroyBrick();
  }

  /**
   * Override onDestroyBrick for custom destruction behavior.
   * CollisionManager is already unregistered before this is called.
   * MUST fire Events.BrickDestroyed and end with _park().
   */
  protected override onDestroyBrick(): void {
    const pos = this._transform.worldPosition;

    // Custom logic here — e.g. spawn projectiles, trigger effects, etc.

    // Fire event so scoring/VFX/GameManager react
    EventService.sendLocally(Events.BrickDestroyed, {
      position: pos,
      color: this._baseColor,
    });

    // Start death animation (inherited), which calls _park() when done
    this._deathScale = this._transform.localScale;
    this._deathAge = 0;
    this._dying = true;
    this._flash(() => {});
  }

  /**
   * Override onHit for custom non-lethal hit behavior (optional).
   */
  protected override onHit(): void {
    super.onHit(); // fires BrickHit event + flash + color update
    // Additional logic on non-lethal hit
  }
}
```

### Key rules

| Rule | Reason |
|---|---|
| **Extend `Brick`**, don't write a standalone component | HP, color, reveal, death animation, and pool recycling are all inherited. Duplicating this logic is fragile. |
| Use `override triggerDestruction()` | Entry point for external forced destruction (explosion chains). Add loop guards here if needed. |
| Use `override onDestroyBrick()` | Called after `CollisionManager.unregister`. Custom destruction logic goes here. |
| Always fire `Events.BrickDestroyed` on destruction | `GameManager` uses it to track victory conditions. `CoinService`, `JuiceService`, `ComboManager` all subscribe. |
| Never call `entity.destroy()` | Bricks are pooled. Call `this._park()` to recycle, or let the inherited death animation do it automatically. |
| `colliderTag` is always `'brick'` | Inherited from `Brick`. `Ball.onCollision` checks for `'brick'` to resolve bounce axis. |

### Available protected members from Brick

| Member | Type | Description |
|---|---|---|
| `_transform` | `TransformComponent` | Entity transform, set in `onStart` |
| `_baseColor` | `Color` | Current brick color (for event payloads) |
| `_park()` | method | Move off-screen, reset state, fire `BrickRecycle` |
| `_flash(callback)` | method | White flash for 50ms, then call callback |
| `onHit()` | method | Called on non-lethal hit (fires `BrickHit` + flash) |
| `onDestroyBrick()` | method | Called on destruction (fires `BrickDestroyed` + death anim) |
| `triggerDestruction()` | method | External entry point (unregisters collider + calls `onDestroyBrick`) |

---

### Step 2 — Register the asset in Assets.ts

```typescript
export const BrickAssets = {
  Normal:    new TemplateAsset('@Templates/GameplayObjects/Brick.hstf'),
  Explosive: new TemplateAsset('@Templates/GameplayObjects/ExplosiveBrick.hstf'),
  MyBrick:   new TemplateAsset('@Templates/GameplayObjects/MyBrick.hstf'),
} as const;
```

---

### Step 3 — Use in LevelConfig.ts

```typescript
'M': { asset: BrickAssets.MyBrick, hits: 2 },
```

---

### Step 4 — Create the template

1. Duplicate `Templates/GameplayObjects/Brick.hstf`
2. Replace the `Brick` component with `MyBrick`
3. Customize visuals as needed (the `Visuals` child carries the `ColorComponent`)

---

## Reference: ExplosiveBrick

`ExplosiveBrick` is the canonical example of a custom brick subclass:

- Extends `Brick`
- `override triggerDestruction()` — adds a loop guard via a module-level `Set` to prevent infinite chain recursion
- `override onDestroyBrick()` — queries adjacent bricks via `CollisionManager.query()`, fires `Events.ExplosionChain`, then triggers their destruction before self-parking

---

## Checklist

- [ ] Subclass extends `Brick` (not standalone `Component`)
- [ ] `override triggerDestruction()` with any needed guards
- [ ] `override onDestroyBrick()` with custom logic
- [ ] `Events.BrickDestroyed` fired on destruction
- [ ] No `entity.destroy()` — uses `_park()` or inherited death animation
- [ ] Asset registered in `Assets.ts` with matching key
- [ ] Template `.hstf` created with the custom component attached
- [ ] Level config references the new brick type
