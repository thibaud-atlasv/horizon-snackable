# Arena Vermin — Game Design Document

## Game Overview
Arena Vermin is a 2D top-down action game rendered on a 390×844 portrait canvas using the DrawingSurface API. The player controls a hero in a bounded tile arena, automatically attacking nearby enemies with a sword while dodging contact damage. The game uses a flat top-down projection (1 world unit = 64 screen pixels), touch-joystick movement, and a real-time combat loop.

## Controls
- **Touch & Drag Joystick**: Touch anywhere to place a virtual joystick. Drag to move the hero. Release to stop.
- **Auto-Attack**: The hero automatically attacks the nearest enemy within range — no manual input needed.

## Game Objects

### Hero
- 48×48px sprite with idle bob and walk bob animations
- Sword weapon with idle sway animation and attack swing (3-phase: anticipation → strike → settle)
- 100 HP, takes contact damage from enemies
- Red tint flash when hurt

### Grunt Rat (Enemy)
- 32×32px sprite with 3 variants: idle, hurt, dead
- 18 HP, moves at 2.8 units/sec
- AI: 3 states (IDLE → CHASE → ATTACK based on aggro radius)
- Deals 6 contact damage per 0.5s tick
- Spawn drop-in animation (fall + squash/stretch/settle)
- Death animation (rotation + fade out)
- White flash on hit, recoil offset

## Game Flow / States
1. **Title Screen** — XAML overlay with START button, dark canvas background
2. **Playing** — Full combat loop with enemies, auto-attack, particles, damage numbers

## Scoring & Progression
- Milestone 2 focuses on the combat loop mechanics (enemies, damage, effects)
- Future milestones will add scoring, waves, and progression

## Visual Style
- Dark fantasy dungeon aesthetic with flat top-down rectangular arena
- Pixel-art influenced sprites with code-driven animations (bob, sway, squash/stretch)
- Bright particle effects: gold/orange/white hit sparks, expanding rings on crits
- Floating pixel-art damage numbers (white normal, orange crit)

## Canvas Dimensions
- **390×844** portrait orientation (optimized for mobile VR overlay)

## UI Layout
- **XAML**: Title screen overlay with START button
- **DrawingSurface**: Game world, hero, enemies, particles, damage numbers, joystick
