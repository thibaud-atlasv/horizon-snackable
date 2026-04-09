---
name: coordinate-system
summary: MHE coordinate system - Y-Up, Forward is -Z
include: always
---

# Coordinate System

MHE uses **Right-Handed, Y-Up (RUB)**:
- `Vec3.right` = +X `(1,0,0)` / `Vec3.left` = -X `(-1,0,0)`
- `Vec3.up` = +Y `(0,1,0)` / `Vec3.down` = -Y `(0,-1,0)`
- `Vec3.backward` = +Z `(0,0,1)` / `Vec3.forward` = -Z `(0,0,-1)`
