---
name: adding-content
summary: How to add or remove colors and shapes in Shape Intruder via ShapeDefs.ts
include: always
---

# Adding Content (Colors & Shapes)

**Single source of truth:** `Scripts/Defs/ShapeDefs.ts`.  
`ColorKey`, `ShapeKey`, `COLOR_KEYS`, `SHAPE_KEYS` are derived automatically. No other file changes required.

**Minimum pool:** (colors × shapes) ≥ 30 distinct pairs — otherwise the round generator cannot pick 3 valid distractors.

---

## Colors

Append one entry to `COLOR_DEFS`:

```typescript
export const COLOR_DEFS = {
  // existing entries…
  cyan: { hex: '#06b6d4' },   // ← new entry
} as const satisfies Record<string, IColorDef>;
```

### Design Rules

- No two colors share the same hue family
- High contrast on dark background (`#1e1e2e`)
- Saturation floor 70% HSL — no pastels or muddy mixes
- Recommended hues not yet used: cyan, rose, gold

### Current Palette (9 colors)

| Key     | Hex       |
|---------|-----------|
| white   | #fef3c7   |
| red     | #ef4444   |
| orange  | #fb923c   |
| yellow  | #eab308   |
| lime    | #84cc16   |
| teal    | #14b8a6   |
| blue    | #3b82f6   |
| purple  | #8b5cf6   |
| pink    | #ec4899   |

---

## Shapes

Append one entry to `SHAPE_DEFS`:

```typescript
export const SHAPE_DEFS = {
  // existing entries…
  diamond: { path: 'M 0 -1 L 0.6 0 L 0 1 L -0.6 0 Z' },   // ← new entry
} as const satisfies Record<string, IShapeDef>;
```

### SVG Path Convention

Paths must be **unit-radius, centered at origin** — the renderer handles scaling and translation.

```
M x y              — move to (start, no draw)
L x y              — line to
C cx1 cy1 cx2 cy2 x y  — cubic bezier
Z                  — close path
```

Bounding box roughly fits inside `[-1, 1]` on both axes. Always close with `Z`.

### Design Rules

- Recognizable at 20–30 px radius — silhouette must be immediately nameable
- Readable when rotated at any angle
- No two shapes confusable (e.g. square vs. diamond must be visually distinct)
- Filled only — shapes are solid fills, no outlines
- Avoid: ellipse, non-square rectangle, crescent, heart, letter/number shapes

### Current Shapes (11 shapes)

| Key        | Description                  |
|------------|------------------------------|
| circle     | Full circle                  |
| semicircle | Half circle (flat at bottom) |
| triangle   | Equilateral, point up        |
| square     | Axis-aligned square          |
| pentagon   | 5 sides                      |
| hexagon    | 6 sides                      |
| star4      | 4-point star                 |
| star       | 5-point star                 |
| teardrop   | Rounded drop, point up       |
| cross      | Plus / health cross          |
| arrow      | Up-pointing arrow            |
