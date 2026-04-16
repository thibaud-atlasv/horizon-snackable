# Art Direction

## Overview

The visual theme is fully customizable — objects can be styled, colored, and decorated freely. The only hard constraints come from the 2D gameplay plane and the AABB collision system.

---

## Viewing Plane

All gameplay happens on the **XY plane**, viewed straight-on along the **-Z axis** (camera looks toward -Z, objects face +Z).

- X = horizontal, Y = vertical, Z = depth (unused for gameplay)
- Art is effectively **front-facing 3D objects** — they can have depth and shading, but gameplay never uses the Z axis
- Objects should be designed to read clearly from the front; side/top views are never seen

---

## Collision Constraints (AABB)

The collision system uses **Axis-Aligned Bounding Boxes derived from `localScale`**. The collider bounds are computed as:

```
halfW = localScale.x * 0.5
halfH = localScale.y * 0.5
bounds = { x: pos.x - halfW, y: pos.y - halfH, w: halfW * 2, h: halfH * 2 }
```

This means:

- The **visual footprint must not significantly exceed the `localScale` cube** (default: 1×1×1)
- Decorative elements that extend beyond the scale bounds will visually overlap neighboring objects or the play area edge without triggering collision — which looks wrong
- A small amount of visual bleed (glow, outline, shadow) is acceptable, but the **readable shape of the object should fit within the 1×1×1 unit cube**

### In practice

| Object | Scale used as collider |
|---|---|
| Brick | `localScale.x` (width), `localScale.y` (height) |
| Ball | `localScale.x * 0.5` as radius |
| Paddle | `localScale.x` (width), `localScale.y` (height) |
| Power-up | `localScale.x` (width), `localScale.y` (height) |

If a mesh is larger than its unit cube (e.g. a stylized object with wide wings), scale it down within its entity so the visible shape fits the collider.

---

## Asset Registration

Every `.hstf` template created for the project **must be registered in `Scripts/Assets.ts`** before it can be referenced from code.

```typescript
// Scripts/Assets.ts
export const BrickAssets = {
  Normal:    new TemplateAsset('@Templates/GameplayObjects/Brick.hstf'),
  Explosive: new TemplateAsset('@Templates/GameplayObjects/ExplosiveBrick.hstf'),
} as const;

export const PowerUpAssets = {
  BigPaddle:    new TemplateAsset('@Templates/GameplayObjects/BigPaddle.hstf'),
  StickyPaddle: new TemplateAsset('@Templates/GameplayObjects/StickyPaddle.hstf'),
} as const;
```

**Rules:**
- Group assets by object family (`BrickAssets`, `PowerUpAssets`, etc.)
- The key name must match the corresponding enum or type name exactly (e.g. `PowerUpType.BigPaddle` → key `BigPaddle`)
- Paths use the `@Templates/…` alias (resolved by the Horizon bundler)
- Never hardcode a `TemplateAsset` path directly inside a component or manager

---

## Theme Customization

Everything visual is fair game to change: colors, materials, meshes, particles, lighting. The theme can be remixed independently of gameplay logic.

- Colors are exposed via `ColorComponent` on a `Visuals` child entity
- Tunable values (glow intensity, color, scale) should be added as `@property` on the component
- The play area background, paddle shape, brick style, and ball design are all independent — changing one does not affect others
