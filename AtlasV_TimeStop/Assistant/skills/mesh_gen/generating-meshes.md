---
name: generating-meshes
summary: Generates 3D meshes for environments, characters, weapons, and items using meshy-6. Use when creating 3D assets, generating meshes, or when the user mentions models, props, scenery, weapons, collectibles, or NPCs.
---

# Mesh Generation

## Quick reference

| Usage Context | Polycount | Remesh | Prefer FBX |
|--------------|-----------|--------|------------|
| Environment | 10000 | No | Yes |
| Character | 10000 | No | No |
| Weapon | 5000 | Yes | Yes |
| Item (small: coin, apple) | 500 | Yes | Yes |
| Item (medium: chair, table) | 5000 | Yes | Yes |
| Item (large: car, wall) | 15000 | Yes | Yes |
| Item (detailed: house, tree) | 25000 | Yes | Yes |

## Workflow selection

**Marketplace asset selected (Tier 1/2)?** → Follow [Marketplace Asset Workflow](#marketplace-asset-workflow)
**Generating new mesh?** → Follow [Generation Workflow](#generation-workflow)

---

## Generation Workflow

Copy this checklist:

```
Mesh Generation Progress:
- [ ] Step 1: Determine usage context and parameters
- [ ] Step 2: Generate mesh with meshy-6
- [ ] Step 3: Apply remesh if required
- [ ] Step 4: Configure material with edit_material
- [ ] Step 5: Preview or hand off to scene_management
```

### Step 1: Determine usage context

Infer from request if not explicit:
- Statues, decorations, props, scenery, terrain, buildings → **Environment**
- Enemies, NPCs, player characters → **Character**
- Collectibles, pickups, power-ups → **Item**
- Projectiles, thrown objects → **Weapon**

Set parameters from quick reference table above.

**Sizing for meshy-6:** Use `target_width: 1.0`, `target_height: 1.0`, `target_depth: 1.0`

Player visuals default to 1.8 meters tall.

### Step 2: Generate mesh

Use `meshy-6` with parameters from Step 1.

### Step 3: Apply remesh (weapons/items only)

Do not use remesh unless specifically asked.
Remeshing is used to avoid ultra tiny objects and resizes them to a more realistic size.

### Step 4: Configure material

After mesh creation, configure the `.material` file:

1. Get asset IDs:
   ```
   bulk_get_asset_id([
     { filePath: "<shader_file>", targetType: "shader" },
     { filePath: "<texture.png>", targetType: "tex" }
   ])
   ```

2. Apply with `edit_material`:
   ```
   edit_material({
     material_file_path: "<mesh>.material",
     shader_asset_id: <shader_id>,
     attributes: [{
       name: "layer0ColorAndAlpha",
       value: {
         type: "assetId",
         assetIdValue: { packageOrRemoteId, ingestionId, targetId }
       }
     }]
   })
   ```

### Step 5: Output

**Environment meshes:** Return summary with asset name, package info, and file path. State placement will be handled by `scene_management`. Do not call `preview_mesh`.

**Other meshes:** Call `preview_mesh` or proceed to next workflow step.

---

## Marketplace Asset Workflow

When user selects a Tier 1/2 marketplace asset:

**For Environment meshes:**
1. Run `integrate_meta_wand_asset`
2. Return summary with asset name, package info, and file path
3. If `.hstf` template found: state it has materials configured and should be used directly
4. State asset is added and placement handled by `scene_management`
5. Done — do not call `preview_mesh`

**For Weapons/Items:**
1. Run `integrate_meta_wand_asset`
2. Continue to Step 3 (remesh) of Generation Workflow using the copied folder as destination

---

## Asset placement paths

| Type | Path |
|------|------|
| Environment | `Environment/` |
| Weapon | `Meshes/Weapons/{weaponName}` |
| Character Animations | `Models/Characters/{characterName}/Animations/` |
| Generic Animations | `Animations/` |
| Other | `Meshes/{area}/{areaName}` |
