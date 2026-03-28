---
name: scene-shadow-control
summary: How to adjust shadow resolution, distance, and density via the Scene Shadow Provisional component.
include: always
---

# Scene Shadow Control

The **Scene Shadow Provisional** component on the scene's **root entity** controls all shadow settings.

## Key Properties

| Property | Default | Safe Range | Unit |
|----------|---------|------------|------|
| `ShadowmapDimension` | 1024 | 1024–4096 | pixels |
| `ShadowmapWorldSize` | 7.5 | **20–30 minimum** | meters |
| `ShadowStrengthDiffuse` | 0.7 | **0.5–0.85** | 0.0–1.0 |

## Decision Guide

### ShadowmapWorldSize (Distance)
- **This is how far from the camera shadows render** (in meters)
- Camera farther than this value = **no shadows visible**
- **Always use 20–25m minimum** to avoid shadows cutting off at distance
- Larger values spread resolution thinner—increase `ShadowmapDimension` to compensate

### ShadowmapDimension (Resolution)
- Higher = sharper shadows, more GPU cost
- When increasing world size, scale dimension proportionally:
  - World size 20m → use 2048
  - World size 30m+ → use 4096

### ShadowStrengthDiffuse (Density)
- 0.0 = invisible, 1.0 = black
- **Never go below 0.5** (too light, looks washed out)
- 0.6–0.7 is typical; 0.8+ for dramatic lighting

### Quick Reference
// Recommended baseline settings
- ShadowmapWorldSize = 25.0;
- ShadowmapDimension = 2048;
- ShadowStrengthDiffuse = 0.65;
