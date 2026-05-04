# Arena Vermin — Execution Plan

## Milestone 1 (Core Movement + Arena) — COMPLETE

- [x] 1. Generate sprites (hero body, hero weapon, arena floor tile)
- [x] 2. Create Assets.ts, Constants.ts, Types.ts
- [x] 3. Create IsoRenderer.ts (tile grid, isometric projection)
- [x] 4. Create ArenaVerminViewModel.ts (ViewModel + DrawingSurface binding)
- [x] 5. Create ArenaVerminComponent.ts (game loop, joystick, camera, hero movement)
- [x] 6. Create game.xaml (fullscreen layout, title screen)
- [x] 7. Build and verify

## Milestone 2 (Combat Loop) — COMPLETE

- [x] 1. Update Assets.ts with grunt rat sprite declarations
- [x] 2. Rewrite Types.ts with M2 interfaces (EnemyState, Particle, ExpandingRing, FloatingTextEntry, AttackSwingState, CameraShakeState)
- [x] 3. Rewrite Constants.ts with all M2 constants (combat stats, enemy stats, animation timings, particle specs)
- [x] 4. Create scripts/ParticleSystem.ts (hit sparks, crit sparks, death explosion, update, draw)
- [x] 5. Create scripts/FloatingText.ts (pixel-art damage numbers, crit label, update, draw)
- [x] 6. Create scripts/CombatSystem.ts (target finding, auto-attack, contact damage)
- [x] 7. Create scripts/AnimationSystem.ts (attack swing, spawn transform, death transform, hurt transform, camera shake, easing)
- [x] 8. Create scripts/EnemySystem.ts (spawn, AI state machine, timers, cleanup)
- [x] 9. Rewrite scripts/IsoRenderer.ts (add attack range ring with pulsing outer ellipse)
- [x] 10. Rewrite scripts/ArenaVerminComponent.ts (integrate all systems: combat loop, effect spawning, enemy rendering, hit pause)
- [x] 11. Create docs/game_design.md and docs/execution_plan.md
- [x] 12. Build and verify all scripts compile

## Milestone 3 (Wave System + HUD + Pickups) — COMPLETE

- [x] 1. Update Types.ts with M3 interfaces (PickupType, PickupState, WaveState, GameStats, WaveData)
- [x] 2. Update Constants.ts with wave data table (20 waves), pickup specs, XP formula, HUD layout constants
- [x] 3. Create scripts/WaveSystem.ts (wave state machine, burst spawning, breather periods, timer management)
- [x] 4. Create scripts/PickupSystem.ts (pickup spawning, lifetime/flash/collection, DrawingSurface rendering)
- [x] 5. Create scripts/SpriteUpdater.ts (XAML sprite transform computation for hero + enemy pool)
- [x] 6. Rewrite scripts/ArenaVerminViewModel.ts (add XAML sprite properties for hero/enemy pool, HUD state bindings, pause/restart UiEvents)
- [x] 7. Rewrite xaml/game.xaml (DrawingSurface layer, Canvas sprite layer with enemy pool, HUD layer with level/timer/wave bars, pause menu, title screen)
- [x] 8. Rewrite scripts/EnemySystem.ts (HP scaling per wave, despawn with dissolve, reduced loot on timer expire)
- [x] 9. Rewrite scripts/ArenaVerminComponent.ts (integrate wave system, pickup collection, HUD updates, pause/restart, sprite updater calls)
- [x] 10. Build and verify all scripts compile
- [x] 11. Update PROJECT_SUMMARY.md

## Milestone 4 (New Enemy Types + Custom Art) — COMPLETE

- [x] 1. Generate custom art sprites (hero, enemies, weapons, map, HUD elements)
- [x] 2. Create ProjectileSystem.ts (ranged enemy projectiles)
- [x] 3. Create GasCloudSystem.ts (gas cloud hazards)
- [x] 4. Update EnemySystem.ts with new enemy types (Bruiser, Drone Rat, Gas Rat)
- [x] 5. Update Assets.ts with all new sprite declarations
- [x] 6. Update game.xaml with elite glow slots and expanded enemy pool
- [x] 7. Integrate new systems into ArenaVerminComponent.ts
- [x] 8. Build and verify

## Milestone 5 (Upgrade System + Drone Weapon) — COMPLETE

- [x] 1. Create scripts/UpgradeSystem.ts (weapon level tracking, random option generation, upgrade application)
- [x] 2. Create scripts/DroneWeapon.ts (orbit physics, projectile firing, collision detection, rendering)
- [x] 3. Update Types.ts with upgrade/drone interfaces
- [x] 4. Update Constants.ts with upgrade/drone constants
- [x] 5. Update ArenaVerminViewModel.ts with upgrade screen properties and UiEvents
- [x] 6. Update game.xaml with upgrade selection overlay (3 upgrade cards)
- [x] 7. Integrate upgrade system into ArenaVerminComponent.ts (level-up detection, upgrade screen show/hide, choice application, drone init/update/draw)
- [x] 8. Build and verify all scripts compile

## Milestone 4 (New Enemy Types + Custom Art) — COMPLETE

- [x] 1. Generate custom art sprites (hero, enemies, weapons, pickups, HUD, map)
- [x] 2. Update Assets.ts with new sprite declarations and legacy aliases
- [x] 3. Create ProjectileSystem.ts (missile projectile logic for ranged enemies)
- [x] 4. Create GasCloudSystem.ts (gas cloud hazards from gas rat enemies)
- [x] 5. Update EnemySystem.ts with new enemy types (Drone Rat, Bruiser, Gas Rat) and elite variants
- [x] 6. Update game.xaml with elite glow slots and expanded enemy pool (25 slots + 5 elite glow)
- [x] 7. Update ArenaVerminComponent.ts with projectile/gas integration and new enemy rendering
- [x] 8. Update ArenaVerminViewModel.ts with elite sprite properties
- [x] 9. Build and verify all scripts compile
- [x] 10. Update PROJECT_SUMMARY.md

## Milestone 5 (Upgrade System + Drone Weapon) — COMPLETE

- [x] 1. Update Types.ts with upgrade/drone interfaces (WeaponType, WeaponLevel, UpgradeOption, DroneState, DroneProjectile)
- [x] 2. Update Constants.ts with upgrade/drone constants (weapon definitions, drone stats per level)
- [x] 3. Create scripts/UpgradeSystem.ts (weapon level tracking, random option generation, upgrade application)
- [x] 4. Create scripts/DroneWeapon.ts (drone orbit physics, projectile firing, enemy collision, DrawingSurface rendering)
- [x] 5. Update ArenaVerminViewModel.ts with upgrade screen properties (upgradeScreenVisible, upgrade card bindings, UiEvents)
- [x] 6. Update game.xaml with upgrade selection overlay (3 card buttons with name/desc/level bindings)
- [x] 7. Update ArenaVerminComponent.ts (level-up detection, upgrade screen flow, drone integration, reset logic)
- [x] 8. Build and verify all scripts compile

## File Plan

| File | Purpose | Lines |
|------|---------|-------|
| scripts/Assets.ts | TextureAsset declarations | ~12 |
| scripts/Types.ts | All interfaces and enums | ~150 |
| scripts/Constants.ts | All game constants (incl. wave table, pickups, HUD) | ~250 |
| scripts/ParticleSystem.ts | Particle spawning, update, draw | ~130 |
| scripts/FloatingText.ts | Damage number spawning, pixel rendering | ~150 |
| scripts/CombatSystem.ts | Combat logic (target, attack, contact) | ~120 |
| scripts/AnimationSystem.ts | Code-driven animation transforms | ~220 |
| scripts/EnemySystem.ts | Enemy AI, spawning, HP scaling, despawn | ~250 |
| scripts/WaveSystem.ts | Wave state machine, burst spawning, timers | ~180 |
| scripts/PickupSystem.ts | Pickup spawning, collection, rendering | ~200 |
| scripts/SpriteUpdater.ts | XAML sprite transform computation | ~150 |
| scripts/IsoRenderer.ts | Isometric tile grid + attack ring | ~145 |
| scripts/ArenaVerminComponent.ts | Main game component | ~500 |
| scripts/ArenaVerminViewModel.ts | ViewModel (sprites, HUD, events) | ~120 |
| xaml/game.xaml | Full XAML layout (sprites, HUD, menus) | ~300 |

## Rendering Strategy
- **DrawingSurface**: Ground tiles, pickups (gems/coins), attack range ring, slash VFX, particles, floating text, joystick
- **XAML Canvas**: Hero sprite (body + weapon + flash), enemy sprite pool (15 slots, Y-sorted)
- **XAML HUD**: Level bar, wave timer, wave progress, enemy/coin counts, pause button, wave announcement
- **XAML Overlays**: Title screen, pause menu

## Architecture Notes
- CombatSystem returns `AttackResult` structs; main component handles effect spawning (avoids circular deps)
- All animations are frame-rate independent using dt (seconds)
- Enemy rendering uses XAML Canvas with pooled Rectangle slots, Y-sorted each frame
- Camera shake applied via pushTranslate wrapper around world rendering
- Hit pause freezes game logic but keeps particles/text updating
- Wave system controls enemy spawning; EnemySystem handles individual AI
- Pickups rendered on DrawingSurface (below sprites) with float/spin animations
