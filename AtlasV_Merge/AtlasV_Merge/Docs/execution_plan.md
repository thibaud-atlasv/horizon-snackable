# Suika Merge Game — Execution Plan

## Tasks

- [x] 1. Create docs/game_design.md
- [x] 2. Create docs/execution_plan.md
- [x] 3. Create data/MergeLadder.ts — Tier definitions (11 tiers), colors, radii, score values, spawn weights
- [x] 4. Create scripts/Constants.ts — Canvas size, container bounds, physics constants, gameplay constants
- [x] 5. Create scripts/Types.ts — GameItem interface, GameState enum, ContainerBounds
- [x] 6. Create scripts/GameViewModel.ts — ViewModel with DrawingCommandData, score text, game over visibility, restart event
- [x] 7. Create xaml/game.xaml — Fullscreen layout with DrawingSurface + XAML score HUD + game over overlay
- [x] 8. Create scripts/Physics.ts — 2D circle physics: gravity, circle-circle collision, wall collision, damping
- [x] 9. Create scripts/GameRenderer.ts — Draw background, container, items with faces, held item, next-up preview
- [x] 10. Create scripts/GameComponent.ts — Main game loop, input handling, drop/merge logic, state management
- [x] 11. Update scripts/Assets.ts — Remove old texture references (no new sprites needed)
- [x] 12. Delete old files — Remove TitleScreenComponent.ts and TitleScreenViewModel.ts
- [x] 13. Build, attach to template, verify — Build TS, update entity components in space.hstf
- [x] 14. Generate background sprite — Warm candy confectionery background (480×800)
- [x] 15. Generate jar frame sprite — Glass jar frame with transparent interior
- [x] 16. Update Assets.ts — Add backgroundTexture and jarFrameTexture declarations
- [x] 17. Update GameRenderer.ts — Sprite background, jar frame overlay, restructured draw order with squash/stretch support
- [x] 18. UI overhaul — game.xaml with themed containers, rounded panels, candy aesthetic
- [x] 19. Create scripts/VisualEffects.ts — Particles, screen shake, chain tracking, danger shimmer, squash/stretch, idle motion
- [x] 20. Update Types.ts — Add squash/stretch and idle motion fields to GameItem
- [x] 21. Integrate visual effects into GameComponent.ts — Wire up particles, shake, chain, squash/stretch, danger
- [x] 22. Build and verify all TS + XAML

## File Plan

| File | Contents | Est. Lines |
|------|----------|------------|
| `data/MergeLadder.ts` | Tier data array, spawn weight table | ~80 |
| `scripts/Constants.ts` | All game constants | ~60 |
| `scripts/Types.ts` | Interfaces, enums (incl. squash/stretch fields) | ~60 |
| `scripts/GameViewModel.ts` | ViewModel class | ~30 |
| `xaml/game.xaml` | XAML layout with themed containers | ~100 |
| `scripts/Physics.ts` | 2D physics engine | ~200 |
| `scripts/GameRenderer.ts` | All draw functions with sprite bg, jar overlay, squash/stretch | ~250 |
| `scripts/GameComponent.ts` | Game logic, input, loop, VFX integration | ~350 |
| `scripts/VisualEffects.ts` | Particles, shake, chain, danger, squash, idle | ~280 |
| `scripts/Assets.ts` | Asset declarations (tiers + bg + jar) | ~30 |

## Rendering Strategy
- **DrawingSurface**: Sprite background, dark jar interior, items with squash/stretch + idle animation, jar frame sprite overlay, particles, danger shimmer, floating tags, held item + next preview
- **XAML**: Score panel (themed container), best score panel, game over overlay (themed panel with rounded corners)

## Sprite Generation Plan
- `sprites/background.png` — Warm candy confectionery illustrated background
- `sprites/jar_frame.png` — Glass candy jar frame with transparent interior
