---
name: level-design
summary: Complete guide for creating and configuring a Breakout level in LevelConfig.ts
include: on-demand
---

# Creating a Breakout Level

All levels are declared in the `LEVELS` array in `Scripts/LevelConfig.ts`.
Each entry is a `LevelConfig` object. The index in the array **is** the level index.

---

## Minimal structure

```typescript
{
  brickTemplates: {
    'A': { asset: BrickAssets.Normal, hits: 1 },
  },
  grid: [
    'AAAAAAAAA',
    'AAAAAAAAA',
  ].join('\n'),
}
```

---

## brickTemplates

Mapping `char → BrickTemplate`. Every character used in the grid must have an entry.

| Field | Type | Default | Description |
|---|---|---|---|
| `asset` | `TemplateAsset` | — | **Required.** Use `BrickAssets.Normal`. |
| `hits` | `number` | `1` | Number of hits to destroy the brick. |
| `indestructible` | `boolean` | `false` | If `true`, the brick can never be destroyed. |
| `colors` | `BrickColorPalette` | level palette | Colors keyed by remaining HP, override the level palette. |

`BrickColorPalette` is a mapping `{ [hp: number]: RGB, indestructible?: RGB }`.
`RGB` = `[r, g, b]` with values **0–1**.

```typescript
// 3-hit brick with its own colors
'X': {
  asset: BrickAssets.Normal,
  hits: 3,
  colors: {
    3: [1.00, 0.20, 0.20], // red at full health
    2: [1.00, 0.60, 0.00], // orange damaged
    1: [1.00, 1.00, 0.00], // yellow almost destroyed
  },
},

// Indestructible brick
'W': { asset: BrickAssets.Normal, indestructible: true },
```

---

## grid

ASCII string, rows separated by `'\n'`. Rules:

- `'0'` or `' '` = empty cell.
- Any other letter/digit = a key in `brickTemplates`.
- All rows must have the **same length** (uniform width).
- The first row is at the top of the screen.

```typescript
grid: [
  '000A0000A000',
  '00AAA00AAA00',
  '0AAAAAAAAAAA',
  '00AAA00AAA00',
  '000A0000A000',
].join('\n'),
```

---

## Layout (optional)

| Field | Default | Description |
|---|---|---|
| `brickWidth` | `1.2` | Width of a cell (world units). |
| `brickHeight` | `0.4` | Height of a cell. |
| `paddingX` | `0.1` | Horizontal gap between bricks. |
| `paddingY` | `0.1` | Vertical gap between bricks. |
| `startY` | `4` | Y center of the first row. |

To compute the total occupied width:
`cols * (brickWidth + paddingX) - paddingX`

The playfield is `9` units wide (`BOUNDS.w`). Aim for a total width ≤ 9.

---

## palette (optional)

Global colors for the level. Missing fields fall back to `DEFAULT_PALETTE`.

```typescript
palette: {
  background: [0.04, 0.04, 0.08], // RGB 0–1
  ball:       [1.00, 1.00, 1.00],
  paddle:     [0.00, 0.96, 1.00],
  brick: {
    1: [0.20, 0.95, 0.20], // default color for 1 HP bricks without their own colors
    2: [0.10, 0.50, 1.00],
    3: [0.65, 0.00, 1.00],
    indestructible: [0.55, 0.55, 0.55],
  },
},
```

> Brick color resolution priority:
> `brickTemplate.colors[hp]` → `palette.brick[hp]` → `DEFAULT_PALETTE.brick[hp]`

---

## physics (optional)

| Field | Default | Description |
|---|---|---|
| `ballSpeedMultiplier` | `1` | Multiplier on the base ball speed. |
| `gravity` | `0` | Downward acceleration (units/s²). |
| `bounceRandomness` | `0` | Angular variance on bounces (0–1). `0.1` = slight chaos. |
| `paddleLerpFactor` | `1` | Smoothness of paddle movement (0 = still, 1 = snap). `0.85`–`0.95` for a sliding feel. |
| `ballSpeedIncrementPerBrick` | `0` | Speed added to the ball per brick destroyed. |

---

## gameplay (optional)

| Field | Default | Description |
|---|---|---|
| `ballSizeMultiplier` | `1` | Ball scale. `0.8` = small, `1.3` = large. |
| `paddleWidthMultiplier` | `1` | Paddle width. `0.7` = narrow, `1.4` = wide. |

---

## power-ups (optional)

| Field | Default | Description |
|---|---|---|
| `powerUpSpawnChance` | `0.2` | Probability (0–1) that a brick drops a power-up. |
| `powerUps` | equal weights | List of power-ups and their selection weights. |

Available types (`PowerUpType`):

| Value | Effect |
|---|---|
| `PowerUpType.BigPaddle` | Temporarily enlarges the paddle. |
| `PowerUpType.StickyPaddle` | Ball sticks to the paddle on contact. |

```typescript
powerUps: [
  { type: PowerUpType.BigPaddle,    weight: 2, powerUpDuration: 10 },
  { type: PowerUpType.StickyPaddle, weight: 1, powerUpDuration: 8  },
],
```

`weight` is relative: `BigPaddle` at `2` + `StickyPaddle` at `1` = 2/3 chance BigPaddle.

---

## victory (optional)

| Kind | Fields | Description |
|---|---|---|
| `allBricksDestroyed` | — | **Default.** All destructible bricks destroyed. |
| `bricksDestroyed` | `count: number` | Destroy N bricks (useful when indestructible bricks block the grid). |
| `survivalTime` | `seconds: number` | Survive for N seconds. |

```typescript
victory: { kind: 'bricksDestroyed', count: 30 },
```

---

## livesOverride (optional)

Overrides the life count for this level only.
```typescript
livesOverride: 5,
```

---

## Custom brick types

`BrickAssets.Normal` is the only built-in asset. To use a brick with different visuals or behavior, you can register additional assets in `Assets.ts` and reference them in `brickTemplates`:

```typescript
// Assets.ts
export const BrickAssets = {
  Normal:    new TemplateAsset('...'),
  Explosive: new TemplateAsset('../../Templates/GameplayObjects/BrickExplosive.hstf'),
} as const;

// LevelConfig.ts
'X': { asset: BrickAssets.Explosive, hits: 1 },
```

For bricks with custom logic (beyond HP/color), a dedicated component is required.
See [custom_bricks.md](custom_bricks.md) for the full procedure.

---

## Pre-submission checklist

- [ ] All grid rows have the same length.
- [ ] Every character in the grid (except `0` / space) has an entry in `brickTemplates`.
- [ ] `brickTemplates` uses one of the available `BrickAssets`.
- [ ] All RGB values are in `[0, 1]`.
- [ ] Total grid width fits within the playfield bounds (`BOUNDS.w = 9`).
- [ ] If `victory: bricksDestroyed`, `count` ≤ number of destructible bricks in the grid.
- [ ] The level is appended in the `LEVELS` array (index = level number).
