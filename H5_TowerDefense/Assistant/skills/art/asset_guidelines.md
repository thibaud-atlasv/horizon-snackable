---
name: asset-guidelines
summary: 3D mesh and texture specifications for H5 TowerDefense tower and enemy assets.
include: as_needed
---

# Asset Guidelines

## 3D Mesh Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| Polycount | 1,000–1,500 triangles | Per tower/enemy |
| Texture resolution | 512×512 px | Max for small objects |
| Normalized height | 1 meter | All towers and enemies |
| Export format | FBX | GLB has embedded texture issues in MHS |

Priority: performance over detail. Towers are viewed from above at distance on mobile.

## Export Rules

- **NO embedded textures** in GLB/FBX — external files only
- Use FBX for MHS import to avoid embedded texture issues
- Link textures via MHS material system
- Delete any auto-generated embedded textures before import

## Template Setup

After importing the mesh in MHS:
1. Create a `.hstf` template in `Templates/Towers/` or `Templates/Enemies/`
2. Attach the appropriate controller component (`TowerController` or `EnemyController`)
3. Add `ColorComponent` to mesh children for runtime tinting (enemies use this for color variety)
4. Register the asset in `Assets.ts` with `new TemplateAsset(path)`

## Tower Color Identity

| Tower | Hex | Notes |
|-------|-----|-------|
| Arrow | `#2ecc71` | Green |
| Cannon | `#e67e22` | Orange |
| Frost | `#00bcd4` | Cyan |
| Laser | `#9b59b6` | Purple |

Used in: projectile tint, shop UI accent, placement preview range indicator.
