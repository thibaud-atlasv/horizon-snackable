Mobile portrait idle/clicker game. **Triple S** design philosophy: **Short, Simple, Satisfying**.
Everything is done in UI in xaml, the scene is only there to setup the custom UI entities

---

## Color Palettes

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Gold | `#FFD700` | Primary accent, prices, gold counter, panel borders |
| White | `#FFFFFF` | Primary text, button text |
| Black | `#000000` | Background |

### Tap Button (Cyan-Blue Gradient)

| Name | Hex | Usage |
|------|-----|-------|
| ButtonGradientStart | `#1AB8C3` | Gradient start (cyan) |
| ButtonGradientEnd | `#1792EA` | Gradient end (blue) |
| ButtonBorder | `#DBF3F4` | Button border ring |
| ButtonShadow | `#40000000` | Drop shadow (40% black) |
| ButtonHighlight | `#80FFFFFF` | Inner highlight (50% white) |
| GlowColor | `#801AB8C3` | Animated glow ring |

### Shop Buttons (Gold & Glow Theme)

| Name | Hex | Usage |
|------|-----|-------|
| ActiveButtonBg | `#25354A` | Active button background (blue-gray) |
| ButtonBorder | `#FFD700` | Active button border (gold) |
| ButtonText | `#FFFFFF` | Title text |
| DescriptionText | `#A0D4E4` | Description text (cyan-light) |
| DisabledButtonBg | `#1A1A1A` | Disabled button background |
| DisabledButtonBorder | `#404040` | Disabled button border |
| DisabledText | `#666666` | Disabled text |
| PriceBoxBackground | `#40000000` | Price box background |

### Panels

| Name | Hex | Usage |
|------|-----|-------|
| PanelBackground | `#60000000` | Panel background (60% black) |
| PanelBorder | `#80FFD700` | Panel border (50% gold) |
| TextShadow | `#80000000` | Text shadow offset |

### Floating Text (by GainSource)

| Source | Hex | Color Name |
|--------|-----|------------|
| Tap (normal) | `#FFD700` | Gold |
| Tap (crit) | `#FF6600` | Orange |
| Generator | `#90EE90` | Light Green |
| Interest | `#00BFFF` | Cyan |
| Vault | `#DA70D6` | Orchid |

### Progress Bars

| Feature | Hex | Color Name |
|---------|-----|------------|
| Generator | `#3498DB` | Blue |
| Frenzy | `#F39C12` | Orange |
| Interest | `#27AE60` | Green |
| Vault | `#9B59B6` | Purple |
| Track Background | `#40313131` | Dark gray (40%) |

---

## General UI Guidelines

### Readability

- Minimum 4.5:1 contrast ratio between text and background (WCAG AA).
- 3-level hierarchy max: primary value (large/bright), label (small/muted), disabled state (very muted).
- Frequently changing numbers (gold, counters) must use a fixed-width or tabular-nums font to prevent layout jitter.
- Large values use abbreviated notation (K, M, B) — never more than 5 digits on screen at once.

### Visual Intent

- Interactive elements must be visually distinct from informational ones at a glance (shape, border, or brightness difference).
- Disabled buttons (insufficient funds) must be recognizable without relying on color alone.
- Locked features do not appear — no empty slots or "???" placeholders.
- Each visual feedback must map to exactly one action: tap, purchase, crit, frenzy. No mixed signals.

### Reactivity

- Every tap must produce visible feedback within one frame (immediate scale or flash, no delay).
- Feedback animations last 100–250ms max. Longer animations disrupt the clicker rhythm.
- Floating gain text (+N) must never block or overlap the main tap button.
- Active states (frenzy, vault running) must remain readable passively — looping animations must not cause eye fatigue.

### Visual Priority

1. Tap button — dominant element on screen
2. Gold counter — always visible, never obscured
3. Action list — secondary, consulted on demand
4. Feedback (floating text, animations) — temporary, never persistent

### Avoid

- Text on a background of the same hue (even if different colors).
- Animations that shift layout (push other elements around).
- More than 3 accent colors visible simultaneously.
