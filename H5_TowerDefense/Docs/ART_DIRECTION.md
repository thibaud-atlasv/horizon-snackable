# H5 Tower Defense — Art Direction

## Style

Clean, readable mobile UI. Dark background panels with high-contrast text.
Inspired by modern mobile tower defense games (Bloons TD, Kingdom Rush) — functional first, decorative second.
No excessive gradients or textures. Clarity at small screen sizes is the priority.

---

## Color Palette

### UI Base

| Token | Hex | Use |
|-------|-----|-----|
| `bg-panel` | `#1a1a2e` | Panel backgrounds |
| `bg-panel-light` | `#2a2a4a` | Buttons, cards |
| `bg-overlay` | `#000000` @ 60% alpha | Modal overlays |
| `border` | `#3a3a5a` | Panel/button borders |

### Game State

| Token | Hex | Use |
|-------|-----|-----|
| `gold` | `#f5c518` | Gold resource, costs, economy |
| `lives` | `#e74c3c` | Lives / hearts |
| `wave-build` | `#3498db` | Build phase indicator |
| `wave-active` | `#e67e22` | Wave in progress indicator |
| `victory` | `#2ecc71` | Victory screen accent |
| `defeat` | `#e74c3c` | Defeat screen accent |

### Towers

| Tower | Hex | Notes |
|-------|-----|-------|
| Arrow | `#2ecc71` | Green — fast, precise |
| Cannon | `#e67e22` | Orange — heavy, slow AoE |
| Frost | `#00bcd4` | Cyan — support, slows |
| Laser | `#9b59b6` | Purple — long range, high DPS |

### Text

| Token | Hex | Use |
|-------|-----|-----|
| `text-primary` | `#ffffff` | Headings, values |
| `text-secondary` | `#a0a0c0` | Labels, captions |
| `text-disabled` | `#555577` | Unaffordable towers |

---

## Typography

All text uses the default MHS UI font. No custom fonts.

### HUD Typography (scaled for mobile)

| Role | Size | Weight | Color |
|------|------|--------|-------|
| HUD values (gold, lives, wave) | 90px | Bold | `text-primary` |
| HUD labels ("WAVE") | 50px | Normal | `text-secondary` |

### Shop Typography (scaled for mobile)

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Tower name | 54px | Bold | `text-primary` |
| Tower cost | 48px | Normal | `gold` (affordable) / `text-disabled` (not) |
| Icons | 72px | — | — |

### Other UI

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Wave banner | 32px | Bold | `text-primary` |
| Game over title | 40px | Bold | `defeat` / `victory` |
| Button text | 16px | Bold | `text-primary` |

---

## Layout — Portrait 9:16

The screen is divided into three distinct zones — no overlay, no occlusion.

```
┌─────────────────────────────────┐
│ ❤️ 20       WAVE        💰 150  │  ← HUD bar (top)
│              1/10               │
├─────────────────────────────────┤
│                                 │
│                                 │
│          PLAY AREA              │  ← 9×12 grid (center)
│      (towers, path, enemies)    │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [Arrow] [Cannon] [Frost] [Laser]│  ← Shop bar (bottom)
└─────────────────────────────────┘
```

The grid is 9×12 (not 9×16) — the 9:16 screen ratio is filled by grid + HUD + shop combined.
Camera must be positioned and FOV-tuned so the 9×12 world grid fills exactly the center 70% of the screen.

---

## Panels

### HUD Bar (top) — `UI/GameHud.xaml`
- Full width, `bg-panel` background (80% opacity)
- 3-column layout:
  - **Left:** Red heart SVG icon (#e74c3c) + lives count (white)
  - **Center:** "WAVE" label (secondary color) + wave number "X/10" (white, stacked vertically)
  - **Right:** gold_icon.png image + gold count (gold color #f5c518)
- Large text (~90px) for mobile visibility
- Updates reactively via `GameHudViewModel`
- Hosted in `space.hstf` (scene-level)

### Shop Bar (bottom) — `UI/TowerShop.xaml`
- Full width, 600px tall, `bg-panel` background
- 4 tower buttons (360x360px each) in horizontal scroll
- Each button:
  - Tower icon (72px)
  - Tower name (54px bold)
  - Cost with gold icon (48px, gold color; grey if unaffordable)
  - Selected state: `bg-panel-light` background + border in tower color
- Tapping a button calls `TowerService.get().selectTower(id)`
- Hosted in `space.hstf` (scene-level)

### Wave Banner (center overlay, transient)
- Centered, short duration (~1.5s)
- Large text: "WAVE N"
- Appears on `WaveStarted` event, fades out

### Game Over / Victory (full overlay)
- Full screen overlay, `bg-overlay`
- Title: "DEFEAT" (red) or "VICTORY" (green), 40px bold
- Subtitle: wave reached or "All waves cleared!"
- Single button: "PLAY AGAIN" — restarts game

---

## Placement Preview

Handled in code (not XAML) — spawned 3D entities:
- **Valid cell**: preview tower entity tinted `Color(0.5, 1.0, 0.5, 0.75)` (semi-transparent green)
- **Invalid cell**: preview tinted `Color(1.0, 0.4, 0.4, 0.75)` (semi-transparent red)
- **Range indicator**: flat disc entity (`RangeIndicator.hstf`), scaled to tower range diameter, no tint

---

## Accessibility

- All interactive tap targets ≥ 48px
- Cost text grey (not hidden) when unaffordable — player can see what is coming
- No color-only distinction for critical info (lives text always shown alongside icon)

---

## 3D Mesh Specifications

Optimized for mobile performance.

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Polycount** | 1,000-1,500 triangles | Per tower/object |
| **Texture Resolution** | 512x512 | Max for small objects |
| **Height** | 1 meter | Normalized for grid |
| **Format** | GLB + FBX | Both exported |

Priority: Performance over detail. Towers are viewed from above at distance.

### Export Preferences

- **NO embedded textures** in GLB/FBX — textures must be external files only
- Use FBX format for MHS import (avoids embedded texture issues)
- Link textures via MHS material system, not embedded in mesh files
- Delete any auto-generated embedded textures to avoid double storage
