---
name: asset-guidelines
summary: How to add generator templates, icons, and UI assets to H4_Idle
include: on-demand
---

# Asset Guidelines — H4_Idle

## Generator Templates

Each generator type can have an optional `.hstf` template in `Templates/Generators/`. The template is for visual representation in the scene (idle animation, floating numbers, etc.) — not required for gameplay logic.

Register in `Assets.ts`:
```typescript
export const CursorTemplate = new TemplateAsset('../Templates/Generators/Cursor.hstf');
```

## Play Area

Portrait mobile: **9 × 16 world units**, centered at origin.

| Constant | Value |
|----------|-------|
| `HALF_W` | 4.5 |
| `HALF_H` | 8.0 |

## UI / XAML

- `CustomUiComponent` XAML is authored in Horizon Studio
- All ViewModel properties must be declared in the `@uiViewModel()` class with default values
- Use `boolean` fields toggled `false → true` to fire `DataTrigger` animations
- For full-screen overlays: `UiService.get().focus(entity, { fillPercentage: 3 })`

## Floating Text (optional)

For "+X gold" popups on tap, spawn a template at the tap world position, animate upward, self-destruct. Use an object pool (same pattern as H3_Fishing BubblePool) if frequency is high.

## Number Formatting

Large numbers should be formatted with suffixes in the ViewModel, never raw:
```typescript
function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}
```
Keep this helper in a `Utils.ts` file (not in `Types.ts` or `Constants.ts`).
