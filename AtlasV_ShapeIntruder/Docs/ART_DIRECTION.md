# Shape Intruder — Art Direction

## Purpose of this document

This document defines the rules an AI must follow when creating or replacing the color palette, shape library, and visual assets for a Shape Intruder variant. The constraints are not aesthetic preferences — they are functional requirements. A bad palette or a poorly designed shape will break the game's readability and fairness.

---

## Visual Style

**Style: Puffy Cartoon / Mobile Casual**

All shapes and UI elements use a **sprite-based rendering approach** — no SVG paths or canvas-drawn geometry. Each shape is a pre-rendered PNG sprite with:
- **Puffy, inflated 3D volume** — shapes look like soft balloons or marshmallows
- Exaggerated highlights (large white specular on top-left) and soft shadows (bottom-right)
- **Rounded, bouncy silhouettes** — even angular shapes have softened edges
- A "squishy toy" or "gummy candy" material feel

Reference: *Candy Crush*, *Homescapes*, *Gardenscapes*, *Fishdom* — bright, child-friendly mobile casual games with maximum visual appeal.

The overall feel is **bright, cheerful, playful, and tactile** — colors pop, shapes feel touchable, everything looks fun and inviting.

---

## Background & Surface Colors

| Role | Color | Usage |
|---|---|---|
| App background | `#7dd3fc` (sky blue) | Full screen background — bright and cheerful |
| Shape canvas panel | `#fef9c3` (soft yellow) | Rounded-corner card holding the shape grid |
| Canvas panel border | `#fbbf24` (golden yellow) | 4–5px puffy border around the shape canvas card |
| Option button resting | `#e0f2fe` (light sky) | Default fill for the 4 answer choice cards |
| Option button border | `#38bdf8` (bright blue) | Playful border on resting button cards |
| Option button — correct | bg `#bbf7d0` · border `#22c55e` · checkmark icon | Feedback when player picks the right answer |
| Option button — wrong | bg `#fecaca` · border `#ef4444` · X icon | Feedback when player picks the wrong answer |
| HUD banner | `#fef9c3` (soft yellow) | Top bar holding score, level, timer |
| HUD banner border | `#fbbf24` (golden yellow) | Border around the HUD card |

---

## Sprite Asset Requirements

### Shape sprites

Each shape+color combination is one **pre-colored PNG sprite**:
- Transparent background
- Dimensions: **128×128 px** (or 256×256 for high-DPI export)
- **Puffy 3D rendering**: large bright highlight blob in top-left quadrant, soft gradient shadow in bottom-right
- Exaggerated volume — shapes should look inflated/pillowy
- Soft inner glow effect for extra depth
- No hard outline stroke — the 3D shading and soft edges define the silhouette
- Color baked in — one PNG per shape+color pair (e.g. `heartBlue.png`, `squareRed.png`)

Sprites are displayed via XAML `<Image>` elements. Color tinting at runtime is not used — the color is part of the asset.

### UI card sprites

- **Shape canvas card**: rounded rectangle with extra-rounded corners (puffy look), soft yellow background, golden border, pronounced drop shadow
- **Answer button card (resting)**: rounded rectangle, light sky fill, bright blue border, soft drop shadow
- **Answer button card (correct)**: same shape with green tint overlay + bouncy green checkmark badge
- **Answer button card (wrong)**: same shape with red tint overlay + wobbly red X badge
- **HUD card**: same puffy rounded-rectangle style as canvas card

All cards use generous corner radius (≈ 28–32px on a 480px-wide layout) for that soft, friendly feel.

---

## Color Palette Rules

### Hard constraints

**Minimum 4 colors, maximum 10.**
Below 4, combinatorial variety collapses and rounds repeat too quickly. Above 10, colors become hard to distinguish at small canvas sizes.

**Every color must be immediately distinguishable from every other color at a glance.**
The player has under 10 seconds to scan the canvas. There is no time to compare shades carefully. Colors that are close in hue, lightness, or saturation will cause unfair confusion.

**No two colors may share the same hue family.**
Forbidden combinations: two blues, two greens, two reds, two purples, etc. Each color must own its hue category unambiguously.

**Colors must work on a light soft-yellow canvas background (`#fef9c3`).**
Sprites are placed on a light canvas. Avoid very light, washed-out, or near-white colors — they will disappear against the yellow background. Prefer saturated mid-tone and deep colors.

**No near-white, near-cream, or near-yellow colors** — they blend with the canvas background. This is why the Yellow color variants are commented out in `Assets.ts`.

**Saturation floor: 65% (HSL) with brightness between 45–75%.**
Colors should feel vivid, candy-like, and fun. The palette should feel like a bag of colorful gummy bears — bright but not harsh.

### Recommended hue slots (one color per slot)

Use these as a guide — one pick per slot, no doubling up:

| Slot | Hue range | Example |
|---|---|---|
| Red | 0–10° | `#ef4444` |
| Orange | 20–35° | `#f97316` |
| Green | 120–150° | `#22c55e` |
| Teal | 170–190° | `#14b8a6` |
| Blue | 210–230° | `#3b82f6` |
| Purple/Violet | 260–280° | `#a855f7` |
| Pink | 320–345° | `#ec4899` |

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

### Silhouette clarity test

For each shape, ask: if this shape were a black silhouette on a white background at 40×40px, would a stranger immediately name it correctly? If not, the shape is too ambiguous.

### Current shape categories (active in Assets.ts)

| Key prefix | Description | Notes |
|---|---|---|
| `circle` | Perfect puffy sphere | Only green variant active (round, rotation-agnostic) |
| `triangle` | Equilateral with rounded corners | Filled + empty outline variants |
| `square` | Axis-aligned, pillow-like | Filled variants |
| `squareTilted` | Square rotated 45° | Visually distinct from `square` |
| `pentagon` | 5-sided, gem-like | 8 color variants |
| `hexagon` | 6-sided, gem-like with soft edges | 8 color variants |
| `starEmpty` | 5-pointed outline star | 8 color variants |
| `starFill` | 5-pointed solid star | 8 color variants |
| `heart` | Iconic puffy heart | Filled + empty outline variants |
| `triangleEmpty` | Outlined triangle | See triangle |
| `heartEmpty` | Outlined heart | See heart |

### Shapes to avoid

- **Ellipse / oval** — too similar to circle
- **Rectangle (non-square)** — loses aspect identity when placed at angles
- **Crescent / moon** — complex silhouette, poor 3D readability
- **Arrow** — asymmetric, difficult to render as a friendly toy shape
- **Letter / number shapes** — too culturally specific

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

## XAML Layout Guidelines

When generating the UI (`shape_display.xaml` or equivalent), follow these structural rules consistent with the sprite-based art direction:

### Layout structure (480×800 portrait)

```
┌─────────────────────────────┐
│   HUD card (score / level)  │  ~80px tall, soft yellow card, golden border
├─────────────────────────────┤
│                             │
│  Shape canvas card          │  ~380px tall, soft yellow bg, grid of sprite shapes
│  (grid of shape sprites)    │
│                             │
├─────────────────────────────┤
│  2×2 answer button grid     │  ~320px, 4 cards with shape sprites centered
│  [ shape ] [ shape ]        │
│  [ shape ] [ shape ]        │
└─────────────────────────────┘
```

### Card styling

- Corner radius: `28–32` on all cards (extra puffy)
- Drop shadow: `BlurRadius=16, ShadowDepth=6, Opacity=0.20, Color=#000000`
- Card margin/padding: `10` between cards, `16` internal padding

### Shape sprites in UI

Shapes inside the canvas and answer buttons are displayed via `<Image Source="{Binding spriteTexture}">` with a `TransformGroup` for position, rotation, and scale. Colors are baked into the sprite — no runtime tinting is applied.

Answer buttons each show:
- One centered shape Image (≈ 80×80px inside a ~140×130px card)
- No label text — the shape sprite is the sole identifier
- A green checkmark badge (top-right corner) on correct answer, red X badge on wrong answer

---

## Theming a variant

When creating a themed variant (e.g. "jungle", "space", "underwater"), the rules above still apply in full. The theme affects:

- Background and card colors (while keeping light/warm contrast logic)
- Which specific hues are chosen within each slot
- Shape selection (a nature theme might include leaf or cloud; a space theme might include rocket silhouettes if they pass the silhouette clarity test)
- Sprite surface texture (glossy candy, matte rubber, metallic) — the puffy 3D volume model stays the same

The rules do **not** bend for a theme. All sprite colors must remain readable against the light canvas background, and every shape sprite must pass the 40×40px silhouette clarity test.
