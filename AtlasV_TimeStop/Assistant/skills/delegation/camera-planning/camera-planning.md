---
name: camera-planning
summary: Ensures camera setup is considered when planning new games or major features.
include: always
---

# Camera Planning

When planning a new game, ensure tasks exist for:

1. **Camera** - must support transforming user input direction to world direction
2. **Movement script** - if present, must route user directional input through camera

Task order: Camera first, then movement (so movement can integrate immediately).

If directional movement is added or changed later, it must route input through the camera.
