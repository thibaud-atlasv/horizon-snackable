---
name: custom-bricks
summary: Procedure for creating a brick with a custom asset or custom behavior logic
include: on-demand
---

# Creating a Custom Brick

The built-in `Brick` component covers HP, color, and destruction. For anything beyond that (explosion, split, teleport, shield, etc.) you need a custom component backed by its own template.

---

## Architecture overview

`LevelLayout` spawns bricks using `template.asset`, then looks for a `Brick` component to call `init()`. If the entity has no `Brick` component, `init()` is simply skipped — the custom component is fully responsible for its own initialization.

Collision detection is handled by `CollisionManager`, which operates on any object implementing `ICollider`. A custom brick registers itself at start and unregisters itself when destroyed.

---

## Step 1 — Create the template file

Duplicate `Templates/GameplayObjects/Brick.hstf` and rename it (e.g. `BrickExplosive.hstf`). Attach your new component to it in place of (or alongside) `Brick`.

---

## Step 2 — Register the asset in Assets.ts

```typescript
// Scripts/Assets.ts
export const BrickAssets = {
  Normal:    new TemplateAsset('../../Templates/GameplayObjects/Brick.hstf'),
  Explosive: new TemplateAsset('../../Templates/GameplayObjects/BrickExplosive.hstf'),
} as const;
```

---

## Step 3 — Write the component

The component must implement `ICollider` and manage its own `CollisionManager` lifecycle.

```typescript
import { component, Component, EventService, NetworkingService, OnEntityStartEvent, subscribe, TransformComponent } from 'meta/worlds';
import { Events, type ICollider, type Rect } from '../Types';
import { CollisionManager } from '../CollisionManager';

@component()
export class BrickExplosive extends Component implements ICollider {
  private _transform!: TransformComponent;

  readonly colliderTag = 'brick';

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
    CollisionManager.get().register(this);
  }

  getColliderBounds(): Rect {
    const pos = this._transform.worldPosition;
    const hw = this._transform.localScale.x * 0.5;
    const hh = this._transform.localScale.y * 0.5;
    return { x: pos.x - hw, y: pos.y - hh, w: hw * 2, h: hh * 2 };
  }

  onCollision(other: ICollider): void {
    if (other.colliderTag !== 'ball') return;

    CollisionManager.get().unregister(this);

    // Custom logic here — e.g. destroy neighbors, trigger effects, etc.

    EventService.sendLocally(Events.BrickDestroyed, {
      position: this._transform.worldPosition,
    });
    this.entity.destroy();
  }
}
```

### Key rules

| Rule | Reason |
|---|---|
| Use `colliderTag = 'brick'` | `Ball.onCollision` checks for `'brick'` to resolve the bounce axis. |
| Always call `CollisionManager.get().unregister(this)` before `entity.destroy()` | Prevents stale collider references. |
| Always fire `Events.BrickDestroyed` on destruction | `GameManager` uses it to track victory conditions and lives. |
| Skip server context in `onStart` | All collision logic is client-only. |
| **If the object moves**, call `CollisionManager.get().checkAgainst(this)` at the end of `onUpdate` | The global interval-based check no longer exists. Each moving object drives its own collision detection. Stationary objects (bricks) don't need this — the ball drives detection against them. |

---

## Step 4 — Use the asset in LevelConfig.ts

```typescript
import { BrickAssets } from './Assets';

brickTemplates: {
  'E': { asset: BrickAssets.Explosive, hits: 1 },
},
```

> `hits`, `indestructible`, and `colors` from `BrickTemplate` are only read by the built-in `Brick` component. For a fully custom component, manage those properties internally.

---

## Step 5 — Attach the component to the template

Open `BrickExplosive.hstf` in the Horizon editor and attach `BrickExplosive` as a component. Remove the `Brick` component if the custom logic fully replaces it.

---

## Coexistence with Brick

If you only need different visuals (new asset, same HP/color logic), keep the `Brick` component on the template and omit a custom component entirely. `LevelLayout` will call `init()` as usual.

If you need **both** the standard HP system **and** extra behavior, keep `Brick` on the template and add your component alongside it. Listen to `Events.BrickDestroyed` or override `onCollision` via a separate component that does not re-register with `CollisionManager`.
