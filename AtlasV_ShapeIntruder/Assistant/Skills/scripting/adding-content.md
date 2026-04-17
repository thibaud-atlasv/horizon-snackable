---
name: adding-content
summary: How to add or remove shapes and colors in Shape Intruder via Assets.ts
include: always
---

# Adding Content (Shapes & Colors)

**Single source of truth:** `Scripts/Assets.ts`.  
`ShapeKey` and `SHAPE_KEYS` are derived automatically from `SHAPE_TEXTURE_MAP`. No other file changes required.

**Minimum pool:** At least 30 distinct shape-color sprite keys must be active (uncommented) to ensure the round generator can always find 3 valid distractors.

---

## How the system works

Each entry in `SHAPE_TEXTURE_MAP` is one shape+color sprite — for example `heartBlue` maps to `@shape/heartBlue.png`. The key is the sprite's identifier used throughout the game.

There is no separate color or shape table. A "color" is just a naming convention in the key (e.g. `…Blue`, `…Red`). A "shape" is a visual category of sprites (e.g. all `heart…` entries).

---

## Adding a new sprite

1. Place the PNG file in the `shape/` folder (e.g. `shape/circleGold.png`)
2. Set `premultiplyAlpha: true` in its `.assetmeta` file
3. Add one line to `SHAPE_TEXTURE_MAP` in `Scripts/Assets.ts`:

```typescript
export const SHAPE_TEXTURE_MAP: Record<string, TextureAsset> = {
  // existing entries…
  circleGold: new TextureAsset('@shape/circleGold.png'),  // ← new entry
};
```

`ShapeKey` and `SHAPE_KEYS` update automatically — no other file changes needed.

---

## Removing a sprite

Comment out or delete the entry in `SHAPE_TEXTURE_MAP`. Ensure the remaining active entries still total ≥ 30.

---

## Sprite requirements

| Property | Requirement |
|----------|-------------|
| Format | PNG with transparent background |
| Dimensions | 128×128 px (or 256×256 for high-DPI) |
| Style | Puffy cartoon 3D — see `Docs/ART_DIRECTION.md` |
| Alpha | `premultiplyAlpha: true` in `.assetmeta` — mandatory |
| Naming | `{shapeName}{ColorName}.png` (PascalCase color suffix) |

---

## Current palette (active color suffixes)

| Suffix | Approximate hue |
|--------|----------------|
| Blue   | Mid blue        |
| Blue2  | Alternate blue  |
| Cyan   | Teal/cyan       |
| Green  | Mid green       |
| Orange | Warm orange     |
| Pink   | Hot pink        |
| Purple | Violet/purple   |
| Red    | Bright red      |

Yellow variants exist as files but are commented out — the yellow hue is too close to the canvas background (`#fef9c3`) and fails the contrast requirement.

---

## Current shape categories (active)

| Category key prefix | Variants |
|---------------------|----------|
| `circle`            | 1 (green only — round, no rotation confusion) |
| `triangle`          | 8 colors × filled + 8 colors × empty outline |
| `square`            | 8 colors × axis-aligned + 8 colors × tilted 45° |
| `pentagon`          | 8 colors |
| `hexagon`           | 8 colors |
| `starEmpty`         | 8 colors (outline star) |
| `starFill`          | 8 colors (solid star) |
| `heart`             | 8 colors × filled + 8 colors × empty outline |

---

## Design rules

- Every sprite must be recognizable at 20–30 px radius
- Sprites must stay recognizable when rotated at any angle
- No two shape categories may be confusable with each other (e.g. square vs. tilted square are treated as distinct — they look different enough)
- Avoid shapes that lose identity under rotation (rectangles, asymmetric forms)
- No near-white or near-yellow colors — they disappear against the canvas background
- See `Docs/ART_DIRECTION.md` for full style and palette rules
