# Art Direction — Idle Factory

> **Language rule:** All code, comments, documentation, and files in this project must be written in **English**.

## Visual Style
3D industrial aesthetic, colorful, inspired by mobile idle/tycoon games. The overall read is bold and legible at a glance on a portrait phone screen.

## Color Palette

### Environment (industrial base tones)
- Asphalt / road: dark gray
- Metal surfaces: medium gray
- Warehouse floor: light gray
- Rails, structural details: silver

### Production Modules (machine color per module)
| Module | Color | Hex |
|--------|-------|-----|
| Production 1 | Blue | `#148FD5` |
| Production 2 | Green | `#58A31E` |
| Production 3 | Red | `#EB1B04` |

The machine color is applied via `ColorComponent` override at runtime — the `ProductionModule` template is color-neutral.

### UI
- Backgrounds: dark semi-transparent gray (`#CC1A1A1A`)
- Borders: thick, colored per button (matches module color palette above)
- Text: white (`#FFFFFFFF`) for labels; gold (`#FFFFCC80`) for currency values
- Affordability indicator: green outline (`#FF4CAF50`) = can afford, dark gray (`#FF424242`) = too expensive

## 3D Construction Approach
All 3D objects are built from assembled cube/cylinder primitives — no imported meshes. This keeps the art pipeline fast and the style consistent.

Key assemblies:
- **Warehouse**: floor slab, roof slab, 4 perimeter walls with entrance gaps, 8 storage platform slots in a 2×4 grid
- **Conveyor Belt**: base slab, 2 lateral rails, 8 evenly-spaced slot markers
- **Production Module**: platform body, angled exit ramp (-11° Z rotation), lateral rails, machine block (color-overridable), chimney, crane arm (yellow/orange)
- **Truck**: chassis, cab, 4 wheels
- **Product**: brown cardboard box with tape strip and fold lines

## Camera
Fixed top-down view. Camera at (0, 8, 0), looking straight down, 60° FOV. No player camera control — the full play area is always visible.

## Play Area
Portrait 9×16 world units, centered on origin. All gameplay elements fit within this footprint.
