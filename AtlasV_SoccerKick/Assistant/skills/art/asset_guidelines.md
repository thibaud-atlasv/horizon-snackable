---
name: asset-guidelines
summary: Guidelines for creating and importing 3D models and visual assets for Soccer Kick 3D
include: always
---

# Asset Guidelines

## 3D Models

### Style
- Modern sporty 3D style with clean textures and vivid colors
- Goal uses a voxel/blocky aesthetic for a distinctive look
- Ball is realistic with classic black/white pattern
- Goalkeeper models should have distinct silhouettes matching their gameplay archetype

### Import Workflow
1. Create or acquire the 3D model (GLB format preferred)
2. Import into Meta Horizon Studio as a template
3. Register the template path in `Scripts/Assets.ts`
4. Reference from def files or spawn logic via `Assets.MyAsset`

### Scale Reference
- Ball: 0.56 world units diameter (radius 0.28)
- Goal: 6.2m wide x 2.4m tall x 1.4m deep
- Keepers: ~1.65m to 1.85m standing height
- Play area: 9 x 16 world units (portrait mobile)

## Templates

All templates must be registered in `Assets.ts`:
```typescript
export const MyModel = new TemplateAsset('@Templates/MyFolder/MyModel.hstf');
```

Never use `@property()` to pass templates. Asset paths live in code, not in the editor.

## Scene Entities

Static geometry (field, goal posts) lives directly in `space.hstf`.
Dynamic entities (ball, keeper, particles) are spawned at runtime with `NetworkMode.LocalOnly`.

## Color

Use `ColorComponent` for runtime color changes:
```typescript
const c = entity.getComponent(ColorComponent)!;
c.color = new Color(r, g, b, a); // values in [0, 1]
```

VFX particles and trail dots use ColorComponent for per-instance coloring.
