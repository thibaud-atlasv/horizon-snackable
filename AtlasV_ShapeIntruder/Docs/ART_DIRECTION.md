# Shape Intruder — Art Direction

## Purpose of this document

This document defines the rules an AI must follow when creating or replacing the color palette and shape library for a Shape Intruder variant. The constraints are not aesthetic preferences — they are functional requirements. A bad palette or a poorly designed shape will break the game's readability and fairness.

---

## Background & Surface Colors

Extracted from the HTML prototype — these are the reference values for the default theme.

| Role | Hex | Usage |
|---|---|---|
| App background | `#0a0a0f` | Full screen background |
| Shape canvas background | `#1a1a2e` | Background fill behind the shapes grid |
| Option button resting | `#1e1e2e` | Default fill for the 4 answer buttons |
| Option button border | `rgba(255,255,255,0.06)` | Subtle border on resting buttons |
| Option button — correct | bg `rgba(34,197,94,0.1)` · border `#22c55e` | Feedback when player picks the right answer |
| Option button — wrong | bg `rgba(239,68,68,0.1)` · border `#ef4444` | Feedback when player picks the wrong answer |

---

## Color Palette Rules

### Hard constraints

**Minimum 4 colors, maximum 10.**
Below 4, combinatorial variety collapses and rounds repeat too quickly. Above 10, colors become hard to distinguish at small canvas sizes.

**Every color must be immediately distinguishable from every other color at a glance.**
The player has under 10 seconds to scan the canvas. There is no time to compare shades carefully. Colors that are close in hue, lightness, or saturation will cause unfair confusion.

**No two colors may share the same hue family.**
Forbidden combinations: two blues, two greens, two reds, two purples, etc. Each color must own its hue category unambiguously.

**Minimum contrast between any two palette colors: high.**
Test by squinting. If two colors blend or could be confused when shapes overlap, remove one.

**No desaturated or neutral colors** — no grey, no beige, no off-white, no black, no brown.
These read poorly on a dark canvas background and lose their identity when shapes overlap.

**All colors must work on a dark background (near-black, #0a0a0f to #1a1a2e range).**
The canvas background is always dark. Pastel or very light colors are acceptable only if they remain vivid. Dark colors (navy, dark green, maroon) are forbidden — they vanish against the background.

**Saturation floor: 70% (HSL).**
Muted or earthy tones are out. Colors should feel electric or vivid, not natural or organic.

### Recommended hue slots (one color per slot)

Use these as a guide — one pick per slot, no doubling up:

| Slot | Hue range | Example |
|---|---|---|
| Red | 0–10° | `#ef4444` |
| Orange | 20–35° | `#f97316` |
| Yellow | 45–60° | `#eab308` |
| Green | 130–160° | `#22c55e` |
| Cyan | 180–195° | `#06b6d4` |
| Blue | 210–230° | `#3b82f6` |
| Purple/Violet | 260–280° | `#8b5cf6` |
| Pink/Magenta | 320–345° | `#ec4899` |

### Each color needs a name

Every color in the palette must have a short, unambiguous human-readable name in the game's language. The name is used internally and may surface in future UI variants.

- One word only
- No compound names ("light blue", "dark red") — each color must be singular and self-contained
- The name must be instantly understood by a 13-year-old

---

## Shape Library Rules

### Hard constraints

**Minimum 5 shapes, maximum 12.**
Below 5, combinatorial variety with colors is too limited. Above 12, shapes become too similar and indistinguishable at small render sizes.

**Every shape must be immediately recognizable at 20–30px radius.**
Shapes are rendered small and at random rotations. A shape that is only recognizable when large or upright fails this requirement.

**Every shape must remain recognizable when rotated at any angle.**
Shapes are drawn with random rotation. A shape that loses its identity when tilted (e.g. a very elongated shape) is not suitable.
Exception: shapes with rotational symmetry (circle, star, hexagon) are ideal because rotation is irrelevant.

**No two shapes may be confusable with each other.**
Common failure: square vs diamond (same shape, 45° rotation). In this game they are treated as distinct shapes, so they must look distinct enough that a player can tell them apart under time pressure. If two shapes could be confused due to rotation, remove one or redesign it.

**Shapes must be filled, not outlined.**
All shapes are drawn filled (solid color). Outline-only or wireframe shapes are not supported by the renderer.

**Shapes must be definable as a closed 2D path (canvas `ctx.beginPath()` compatible).**
The renderer uses canvas 2D API. Any shape expressible as a series of lines, arcs, or bezier curves on a unit circle is valid.

### Silhouette clarity test

For each shape, ask: if this shape were a black silhouette on a white background at 40×40px, would a stranger immediately name it correctly? If not, the shape is too ambiguous.

### Current default shape set (reference)

| ID | Name | Notes |
|---|---|---|
| `circle` | Cercle | Perfect rotational symmetry — always readable |
| `triangle` | Triangle | Equilateral — clear at all sizes |
| `square` | Carré | Axis-aligned rectangle — distinct from diamond |
| `diamond` | Losange | Square rotated 45° — must coexist with square carefully |
| `hexagon` | Hexagone | 6-sided, rotationally robust |
| `star` | Étoile | 5-pointed, iconic silhouette |
| `cross` | Croix | Plus sign — unique silhouette |
| `arrow` | Flèche | Directional — readable even rotated |

### Shapes to avoid

- **Ellipse / oval** — too similar to circle
- **Rectangle (non-square)** — loses aspect ratio identity when rotated
- **Pentagon** — too similar to hexagon at small sizes
- **Crescent / moon** — complex silhouette, loses clarity when small
- **Heart** — loses shape when rotated past 90°
- **Letter / number shapes** — too culturally specific, rotation breaks readability

---

## Palette × Shape interaction

The combination space is `colors × shapes`. This is the game's total non-repeating content pool per session. As a rule of thumb:

```
pool size = number of colors × number of shapes
minimum recommended pool: 30 combinations
```

With 8 colors × 8 shapes = 64 combinations — enough for many rounds without repetition.

If reducing either dimension (fewer colors or fewer shapes), compensate by increasing the other to maintain a pool of at least 30.

---

## Theming a variant

When creating a themed variant (e.g. "neon arcade", "pastel kawaii", "dark sci-fi"), the rules above still apply in full. The theme affects:

- Which specific hues are chosen within each slot
- The overall vibe of the palette (cool vs warm dominant, soft vs harsh)
- Shape selection (a kawaii theme might exclude cross and arrow; a sci-fi theme might add custom geometric shapes)

The rules do **not** bend for a theme. A pastel theme must still meet the saturation floor and dark-background contrast requirements — pastel colors are acceptable only when they remain vivid enough on a near-black background.