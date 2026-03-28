# Determining Corrective Rotation

When a mesh's forward direction doesn't align with +Z (the engine's forward axis), calculate a corrective rotation for the `visuals_local_rotation` parameter.

---

## Step A: Analyze the Mesh

Call `analyze_mesh_geometry` with the mesh file path:

```
analyze_mesh_geometry(mesh_path: "<project-relative-path-to-mesh>")
```

Key fields in the response:

| Field | Description |
|-------|-------------|
| **primary_axis** | Unit vector along the mesh's longest dimension. This is an axis, not a direction—it can point either way. |
| **primary_axis_distribution** | Array of `{ position, density }` samples along the primary axis (0.0 to 1.0). Use to identify which end is which. |
| **shape_hint** | Shape classification (see below). |
| **centroid_offset** | Offset from geometric center to center of mass. Values > 0.05 indicate asymmetry. |

### Interpreting Shape Hints

| Shape Hint | Meaning | Strategy |
|------------|---------|----------|
| `"elongated"` | One dominant axis (swords, poles, vehicles) | Orient the primary axis based on object type |
| `"flat"` | Two similar axes, one thin (shields, cards) | Orient the flat face forward (+Z) |
| `"cubic"` | Roughly equal dimensions | Requires semantic context to determine orientation |

---

## Step B: Determine Target Orientation

Look up the canonical orientation for your object type:

| Object Type | Primary Axis → | Notes |
|-------------|----------------|-------|
| **Vehicles (cars, trucks)** | +Z (forward) | Front of vehicle points forward |
| **Swords/Blades** | +Y (up) | Blade points up |
| **Guns/Ranged** | +Z (forward) | Barrel points forward |
| **Shields** | +Z (forward) | Face points forward |
| **Tools (axes, hammers)** | +Y (up) | Handle down, head up |
| **Poles/Spears** | +Y (up) | Tip points up |

---

## Step C: Resolve Axis Direction Ambiguity

The `primary_axis` vector can point either direction along the axis. Use `primary_axis_distribution` density to determine which end is which:

| Object Type | Dense End (high density) | Sparse End (low density) | Orient So That... |
|-------------|--------------------------|--------------------------|-------------------|
| **Sedan** | Center/back (engine, cabin) | Front hood | Sparse end → +Z |
| **Sword** | Hilt | Blade tip | Sparse end → +Y |
| **Gun** | Stock/grip | Barrel | Sparse end → +Z |
| **Hammer** | Head | Handle | Dense end → +Y |

**Skip the flip if:**
- Distribution is roughly symmetrical (similar density at both ends)
- `centroid_offset` along primary axis is < 0.02
- Object is semantically symmetrical (e.g., a pole)

**Apply a 180° flip if:**
- Distribution is asymmetrical (density ratio > 2.0 between ends)
- `centroid_offset` is significant (> 0.05)
- The dense/sparse end is currently pointing the wrong direction

---

## Step D: Calculate the Rotation

1. **Resolve direction**: If needed, flip `primary_axis` so it points toward the correct end
2. **Compute rotation**: Calculate the quaternion/euler angles that rotate `primary_axis` to the target direction (e.g., +Z for vehicles)
3. **Pass to template**: Use the calculated rotation for `visuals_local_rotation` in `template_gameplay_object`

**Example — Car mesh with primary axis pointing -X:**
- `primary_axis = (-0.98, 0.01, 0.02)`
- Distribution shows dense end at 1.0 (back of car), sparse at 0.0 (front hood)
- Target: front should point +Z
- Since sparse end (front) is at position 0.0, the `-X` direction is the front
- Rotation needed: 90° around Y to rotate -X to +Z → `visuals_local_rotation = { x: 0, y: 90, z: 0 }`
