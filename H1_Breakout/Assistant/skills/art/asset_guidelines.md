---
name: asset-guidelines
summary: Rules for creating and registering template assets (.hstf) for use in scripts
include: on-demand
---

# Asset Guidelines

## Template registration in Assets.ts

Every `.hstf` template created for the project must be registered in `Scripts/Assets.ts` before it can be referenced from code. This file is the single source of truth for all `TemplateAsset` paths.

```typescript
// Scripts/Assets.ts
import { TemplateAsset } from 'meta/worlds';

export const BrickAssets = {
  Normal:    new TemplateAsset('../../Templates/GameplayObjects/Brick.hstf'),
  Explosive: new TemplateAsset('../../Templates/GameplayObjects/ExplosiveBrick.hstf'),
} as const;

export const PowerUpAssets = {
  BigPaddle:    new TemplateAsset('../../Templates/GameplayObjects/BigPaddle.hstf'),
  StickyPaddle: new TemplateAsset('../../Templates/GameplayObjects/StickyPaddle.hstf'),
} as const;
```

### Rules

| Rule | Reason |
|---|---|
| Group by object family (`BrickAssets`, `PowerUpAssets`, …) | Makes imports explicit and keeps the file scannable. |
| Key name must match the enum or type name exactly | `PowerUpManager` and `LevelConfig` use the key as a lookup index — a mismatch causes a silent `undefined` at runtime. |
| Paths relative to `Assets.ts` — always `../../Templates/…` | Horizon resolves template paths from the script file location. |
| Never hardcode a `TemplateAsset` path inside a component | Scattering paths makes renames and audits fragile. |

### Adding a new template

1. Create the `.hstf` file in `Templates/GameplayObjects/` (or a relevant subfolder)
2. Add an entry to the appropriate group in `Assets.ts`
3. Reference it from the relevant config or manager — never from the component itself

```typescript
// New brick type
export const BrickAssets = {
  Normal:    new TemplateAsset('...'),
  Explosive: new TemplateAsset('...'),
  Armored:   new TemplateAsset('../../Templates/GameplayObjects/ArmoredBrick.hstf'), // ← new
} as const;

// New power-up type
export const PowerUpAssets = {
  BigPaddle:    new TemplateAsset('...'),
  StickyPaddle: new TemplateAsset('...'),
  SlowBall:     new TemplateAsset('../../Templates/GameplayObjects/PowerUpSlowBall.hstf'), // ← new
} as const;
```

---

## Collision constraints (AABB)

The collision system uses **Axis-Aligned Bounding Boxes derived from `localScale`**. The visual footprint of a mesh must not significantly exceed the entity's `localScale`.

- Keep the readable shape of the object within its **1×1×1 unit cube**
- Glow, outline, or subtle shadow bleed is acceptable
- Oversized meshes (wide wings, large decorations) must be scaled down inside their entity

| Object | Collider derived from |
|---|---|
| Brick | `localScale.x` (width), `localScale.y` (height) |
| Ball | `localScale.x * 0.5` as radius |
| Paddle | `localScale.x` (width), `localScale.y` (height) |
| Power-up | `localScale.x` (width), `localScale.y` (height) |

---

## Color system

Colors are driven by `ColorComponent` on a **`Visuals` child entity**, not on the root entity. Scripts look for it with:

```typescript
const children = this.entity.getChildrenWithComponent(ColorComponent);
this._colorComponent = children.length > 0
  ? children[0].getComponent(ColorComponent)
  : this.entity.getComponent(ColorComponent);
```

- The root entity handles transform and collision
- The `Visuals` child handles appearance
- Palette colors are set at runtime via `LevelConfig` — do not bake final colors into the template
