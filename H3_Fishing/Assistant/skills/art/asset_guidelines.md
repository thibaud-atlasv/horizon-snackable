---
name: asset-guidelines
summary: How to add fish templates, scene entities, and UI assets to H3_Fishing
include: on-demand
---

# Asset Guidelines — H3_Fishing

## Fish templates

Each fish species needs one `.hstf` template in `Templates/Fish/`. The template must have:

- A mesh entity (the visual)
- `SimpleFishController` component attached (or a custom fish component)
- No physics — fish movement is fully code-driven via `TransformComponent`

Template path convention: `Templates/Fish/MyFishName.hstf` and `Templates/Fish/MyFishName_v2.hstf` for color variants.

After creating the template, register it in `Scripts/Assets.ts`:

```typescript
export const MyFish    = new TemplateAsset('../Templates/Fish/MyFish.hstf');
export const MyFishV2  = new TemplateAsset('../Templates/Fish/MyFish_v2.hstf');
```

Then add the def in `Scripts/Fish/FishDefs.ts`.

## Fish 3D models — scale

Fish `sizeMin`/`sizeMax` in `FishDefs.ts` map directly to the entity's `Vec3` uniform scale at spawn time. `size = 1.0` means the model's native scale. Design meshes so that `size ≈ 1.0` looks correct in gameplay — tuning is done via `sizeMin`/`sizeMax`, not by scaling the mesh in the editor.

For the catch display, the model is re-spawned at the `fishAnchor` entity's `worldPosition` with `localScale` inherited from the anchor. Set the anchor scale in the scene to control display size independently of gameplay size.

## Catch display anchor

The `fishAnchor` entity (assigned in the inspector on `CatchDisplayViewModel`) should be:

- A child of the fixed camera entity (or positioned manually in front of it)
- Positioned at approximately `Z = -2` relative to the camera (forward)
- Scale set to the desired display size (e.g. `Vec3(1.5, 1.5, 1.5)` for a prominently sized fish)

## Spawnable templates

All spawnable templates (fish, bubbles, etc.) are referenced only through `Assets.ts`. Never use `@property()` for template assets — the path-based `TemplateAsset` in `Assets.ts` is the single source of truth.

## Play area

Portrait mobile: **9 × 16 world units**, centered at origin.

| Constant | Value | Meaning |
|----------|-------|---------|
| `HALF_W` | 4.5 | Half play area width |
| `WATER_SURFACE_Y` | 4.5 | Water surface world Y |
| `FISH_LEFT` / `FISH_RIGHT` | -5.5 / 5.5 | Fish spawn horizontal bounds |
| `ZONE_FLOOR_Y` | [-8, -24, -38.5] | Floor per zone |

## UI / XAML

CustomUiComponent XAML lives in the Horizon Studio scene as an asset. ViewModel bindings use `{Binding propertyName}` syntax. All data properties must be declared in the `@uiViewModel()` class with default values. Animation triggers use `boolean` fields toggled `false → true` to fire `DataTrigger` animations.
