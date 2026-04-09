# Explosive Brick Mesh Task List

## Tasks

1. [x] **mesh_gen_agent** - Generate a 3D mesh of an explosive brick with the following specifications:
   - Rectangular brick shape with danger/explosive visual elements (cracks, warning symbols, glowing edges)
   - Red/orange color scheme
   - Must fit within a 1×1×1 unit cube (for AABB collision system)
   - Front-facing 3D object with depth and shading, designed to be viewed from the front (XY plane, camera looks toward -Z)
   - Usage context: Environment/Brick for a breakout game - this brick explodes and destroys adjacent bricks when hit

2. [x] **scene** - Apply the generated explosive brick mesh to the existing template at `Templates/GameplayObjects/ExplosiveBrick.hstf`

3. [x] **Feedback Point** - Request feedback on the explosive brick mesh and its application to the template
