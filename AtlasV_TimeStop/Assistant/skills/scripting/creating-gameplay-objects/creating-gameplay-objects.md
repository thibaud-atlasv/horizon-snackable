---
name: creating-gameplay-objects
summary: Contains critical information for creating any type of gameplay object that will be spawned into the world with mesh/visuals and scripting logic. Use alongside other skills pertaining to more specialized gameplay objects (e.g. collectibles, doors, etc.).
include: as_needed
local_tools:
  - analyze_mesh_geometry
  - template_gameplay_object
---

# Project-Specific Rules (H2_Timestop)

> **⚠️ READ FIRST — This overrides generic rules below**
>
> - This game is **client-only**. Always use `NetworkMode.LocalOnly` when spawning. Never use `NetworkMode.Networked`.
> - There is **no server-owned object pattern** in this game — all objects are local.
> - New **falling objects** (the core gameplay objects) must follow the 5-file extension checklist in `Assistant/skills/scripting/falling-objects/falling-objects.md`. Do not use `template_gameplay_object` for falling objects.
> - All template assets must be registered in `Assets.ts`. No hardcoded `.hstf` paths in components.
> - Visual-only spawned objects (freeze line, floating text) use `NetworkMode.LocalOnly` and self-destroy after their animation.

---

# Creating Gameplay Objects

This contains essential guidelines to apply when creating any gameplay object that you want to add to the world. It should be used to compliment other skills that provide expert guidance on more specific gameplay object types (hazards, collectibles, etc.)

> **⚠️ CRITICAL: Dynamic Spawning Only if the object needs to be destructible**
> MHS does not support destroying entities that are placed at edit-time. Gameplay objects that need to be destroyable MUST be spawned dynamically using `WorldService.spawnTemplate()`. Statically placed gameplay objects will not work because they cannot be destroyed when collected.

## Key Rules

- **Dynamic spawning for destructible objects:** Gameplay objects must be spawned at runtime if you want to be able to destroy them. Edit-time placed entities cannot be destroyed
- **NetworkMode.Networked:** Use for multiplayer visibility; `LocalOnly` for client-only effects
- **Ownership:** Server-spawned gameplay objects are server-owned; use events to communicate effects to clients

---

## Setup

### Step 1: Identify mesh or VFX for gameplay object visuals

You should already have a mesh or VFX in mind for the gameplay object you are trying to create.

If you don't, you'll need to create or find one.

### Step 2: (If mesh) Check if the mesh requires corrective rotation.
Meshes are imported from various 3D software with different coordinate systems. You may need to apply a corrective rotation so the mesh's "forward" aligns with the gameplay object's +Z forward axis.

**CRITICAL: See [determining-corrective-rotation.md](determining-corrective-rotation.md) for the full process.**

Pass the calculated rotation to `template_gameplay_object` via the `visuals_local_rotation` parameter.

### Step 3: Create the gameplay object
Use `template_gameplay_object` to create the gameplay object.

`template_gameplay_object` creates gameplay objects with the following structure:
- Root Entity (e.g., `Car`)
  - Visuals Entity (e.g., `Visuals`)
  - Collider Entity (e.g., `Collider`)

If the object has an irregular rotation, you may need to pass in the visuals_local_rotation parameter to adjust the Visual child object's local rotation so that the part of the mesh you want facing forward is aligned with the gameplay object root's Z+ forward.

`template_gameplay_object` automatically creates a script file and attaches it to the template.

---

## Troubleshooting

**Trigger events not firing:**

- Verify gameplay object has `PhysicsBodyType.Trigger`
- Verify player has `PhysicsBodyType.DynamicCollider`
- Verify gameplay object uses primitive collider (sphere/box/capsule), not mesh collider

**Collision events not firing:**

- Verify gameplay object has `PhysicsBodyType.DynamicCollider`
- Verify player has `PhysicsBodyType.DynamicCollider`

**Duplicate server/client event handling:**

- Use `ExecuteOn.Owner` or ownership checks to prevent both client and server processing events that should only be handled by one side

**Effects not syncing in multiplayer:**

- Use `NetworkMode.Networked` when spawning gameplay objects
- Use events to communicate effects from server-owned gameplay objects to clients

**Can't modify player from server-side gameplay objects:**

- Server-owned gameplay objects can't directly modify client-owned player
- Use events to request changes on the owning client
