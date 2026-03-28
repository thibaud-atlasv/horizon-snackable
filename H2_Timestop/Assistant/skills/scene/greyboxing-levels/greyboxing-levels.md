---
name: greyboxing-levels
summary: Design and iterate on levels/environments using greybox/blockout methodology. Covers the process of building untextured prototype environments to validate gameplay, flow, scale, and spatial relationships before art investment. Use when designing levels, discussing level design process, or evaluating spatial gameplay systems across any game genre.
include: always
local_tools:
  - editor_raycast
  - create_structure
  - get_structure
  - add_to_structure_grid
  - remove_from_structure_grid
  - create_entity_from_template_asset
  - get_entity_context
  - search_for_entity_context
  - set_entity_context
  - delete_entity_context
  - get_root_entity
---

# Greyboxing Levels

Greyboxing (blockout) builds levels with simple untextured geometry to prove gameplay works before committing art resources.

## Core Process

### 1. Define Intentions
Before building, establish:
- **Core experience**: What emotion/feeling? (tension, exploration, mastery)
- **Key beats**: Sequence of gameplay moments (encounter → rest → discovery)
- **Hard constraints**: Player metrics (speed, jump height, weapon ranges)

### 2. Block Primary Geometry
Using primitives (cubes, ramps, cylinders) from the Templates/Primitives directory to:
- Establish macro layout: paths, rooms, elevation
- Build to real scale using player-height reference capsule
- Mark critical points: spawns, objectives, chokepoints
- See [genres/action-adventure.md](genres/action-adventure.md)

### 3. Playtest Movement
Run through with locomotion only:
- Does traversal feel good?
- Are distances appropriate for movement speed?
- Can players read the space intuitively?

## Scale Reference

Always use a player reference capsule. Common metrics:

| Element | Typical Value |
|---------|---------------|
| Player height | 1.8m |
| Doorway height | 2.2m |
| Cover height (crouch) | 1.0m |
| Cover height (stand) | 1.4m |
| Comfortable jump gap | 2-3m |
| Sprint cover-to-cover | 2-3 seconds |

## Greyboxing Tools
You have a set of structure and grid layout tools you can use to greybox levels, areas, individual buildings, and more in a structured, grid-based fashion.

### Creating structures and grid layouts
1. Use editor_raycast to find the height of the ground's surface at which to place the structure's root position or place at y=0 if no ground exists yet.
2. Create a new structure with create_structure.
3. Add template assets to your structure using add_to_structure_grid to build out your structure.
- CRITICAL add_to_structure_grid guidance:
  - Even though MHS's coordinate system uses -Z forward, the add_to_structure_grid tool's span argument fills the span to the +Z of the input position.
    - e.g. adding at 0, 0, 0 with span 3, 1, 5 would fill the bounds 0, 0, 0 through 3, 1, 5 in world space.
  - The spans are min inclusive, max exclusive, so if you want to make things contiguous the next span needs to start where the previous one ended.
    - Ex: to place contiguous blocks along the z-axis you might do:
      - add position 0, 0, 0 span 1, 1, 4
      - add position 0, 0, 4 span 1, 1, 4
      - add position 0, 0, 8 span 1, 1, 4

### Modifying existing structures and grid layouts
When asked to extend an existing structure or grid, you should append the new objects to the existing structure instead of making a new one.

1. Use get_root_entity to identify the current template/scene's root entity.
2. Use search_for_entity_context to search under the root entity for key="structure:name" to find all structures in the template/scene.
3. If needed, get more details about a specific structure using get_structure.
4. Add additional template assets to the structure using add_to_structure_grid.

### Greybox assets

#### Template assets
- Use the primitive template assets located in Templates/Primitives to create the initial greybox for your structures. Do not generate meshes during greyboxing.
- Use add_to_structure_grid's color parameter to color your template assets as you place them.

### Adding template assets to the grid with correct rotation
When you need to place the same template asset along different axis (ex: a wall along the z-axis and then along the x-axis) you MUST use place_grid_object's optional yRotation parameter to rotate it accordingly.
- Ex: when placing four corners, you should place one with yRotation=0, one with yRotation=90, one with yRotation=180 and one with yRotation=180.
- When placing walls of a building in a square, the walls along the z-axis should have yRotation = 0 and the walls along the x-axis should have yRotation=90.

### Other Rules
- You are NOT allowed to use add_to_structure_grid's allowOverlap parameter.
 - You must always use the default false value for that parameter to make sure you don't place overlapping objects.
- When creating a structure, you MUST build from the ground up. Think about its floor plan first.
  - Which parts of the building need flooring? (interior carpets, outdoor cobblestone, etc.)
  - Which parts (if any) should have natural terrain? (outdoor courtyard areas, gardens, etc.)
  - Start your building process with any floors that need to be placed and build up from there.
  - Add any stairs that are required next using wedge primitives.
  - Add the next floor if required but leave a hole above the stairs so that players can walk up to the next floor via the stairs.
  - At the end of your building process, consider which parts of the structure require a ceiling and add them.
  - If the scene has not been modified yet, a "Floor" entity will already exist with scale 50, 1, 50 at position 0, -0.5, 0 so in that case you can either delete it and start from scratch or build on top of it.

## Genre-Specific Guidance
Select the relevant genre for specialized greyboxing priorities:
- **First-Person Shooter**: See [genres/fps.md](genres/fps.md)
- **Action-Adventure**: See [genres/action-adventure.md](genres/action-adventure.md)
- **Horror/Survival Horror**: See [genres/horror.md](genres/horror.md)
- **Open World**: See [genres/open-world.md](genres/open-world.md)
- **Racing**: See [genres/racing.md](genres/racing.md)
- **2D Side-Scrolling Platformer**: See [genres/platformer-2d.md](genres/platformer-2d.md)
- **3D Adventure Platformer**: See [genres/platformer-3d.md](genres/platformer-3d.md)
- **Puzzle Games**: See [genres/puzzle.md](genres/puzzle.md)

## Validation Checklist

Before locking greybox, run through: [checklists/validation.md](checklists/validation.md)
