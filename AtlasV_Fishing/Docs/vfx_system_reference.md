# H3_Fishing VFX System Reference

## Overview
The H3_Fishing project contains **3 visual effect systems**: Bubbles, Impact FX (camera shake + flash), and Camera Scroll. All VFX run client-side only and use `NetworkMode.LocalOnly` for spawned entities.

---

## 1. Bubble System

### Files
- **`Scripts/Fish/BubbleController.ts`** — Individual bubble behavior (rise, wobble, fade)
- **`Scripts/Fish/BubblePool.ts`** — Object pool service (pre-spawns 40 bubbles)
- **`Scripts/Fish/SimpleFishController.ts`** — Spawns bubbles from fish periodically
- **`Scripts/Constants.ts`** — Tuning constants (lines 51-61)
- **`Templates/Bubble.hstf`** — Bubble template entity

### What It Does
Each fish emits bubbles at random intervals (8-15 seconds). Bubbles rise from the fish's mouth position toward the water surface, then despawn and return to the pool.

### Visual Appearance
- **Shape**: Small sphere (scale 0.04 - 0.15)
- **Color**: Light blue-white `(0.85, 0.95, 1.00)` with 75-95% alpha
- **Motion**:
  - Rises at 0.22 - 0.65 units/sec
  - Horizontal wobble (sine wave drift, amplitude 0.04-0.06)
  - Scale breathing (±8% pulsing)
  - Alpha oscillation (subtle shimmer)
- **Lifetime**: 2.5 - 6.5 seconds (or until reaching surface Y = 4.5)

### Trigger
- **Automatic**: Each fish has an internal timer (`_bubbleTimer`) that fires every 8-15 seconds
- **Event**: `Events.InitBubble` (targeted to specific bubble entity)
- **Spawn Position**: Fish position + forward offset (0.35) + upward offset (0.10)

### Technical Details
- **Pooling**: 40 pre-spawned bubbles (`POOL_SIZE = 40`)
- **Activation**: `BubblePool.acquire(x, y)` enables a bubble and sends `InitBubble` event
- **Deactivation**: `BubbleController` detects surface collision, calls `BubblePool.release(entity)`
- **Components Required**: `TransformComponent`, `ColorComponent` (for alpha animation)

### Tuning Constants (Constants.ts)
```typescript
BUBBLE_RISE_SPEED_MIN  = 0.22
BUBBLE_RISE_SPEED_MAX  = 0.65
BUBBLE_SCALE_MIN       = 0.04
BUBBLE_SCALE_MAX       = 0.15
BUBBLE_INTERVAL_MIN    = 8.0   // seconds between spawns per fish
BUBBLE_INTERVAL_MAX    = 15.0
BUBBLE_LIFETIME_MIN    = 2.5   // unused (surface collision ends lifetime)
BUBBLE_LIFETIME_MAX    = 6.5   // unused
BUBBLE_SPAWN_OFFSET_X  = 0.35  // forward offset from fish
BUBBLE_SPAWN_OFFSET_Y  = 0.10  // upward offset from fish center
COLOR_BUBBLE           = { r: 0.85, g: 0.95, b: 1.00 }
```

---

## 2. Impact FX System (Camera Shake + Flash)

### Files
- **`Scripts/Fishing/ImpactFxController.ts`** — Shake + flash sequencer
- **`Scripts/Fishing/GameCameraService.ts`** — Camera shake implementation
- **`Scripts/Constants.ts`** — No constants (tuned via @property in editor)

### What It Does
When the bait hits the ocean floor, plays a **camera shake** followed by a **white screen flash** to emphasize the impact.

### Visual Appearance
- **Camera Shake**:
  - Duration: 0.35 seconds (default)
  - Amplitude: 0.08 units (default)
  - Random XY offset each frame, linearly fades to zero
- **Flash**:
  - Starts after shake ends
  - White plane (`Color(1, 1, 1, alpha)`) in front of camera
  - Alpha fades from 1.0 → 0.0 over 0.25 seconds (default)

### Trigger
- **Event**: `Events.BaitHitBottom` (fired by `RodController._tickFalling()`)
- **Sequence**:
  1. `ImpactFxController` receives `BaitHitBottom`
  2. Calls `GameCameraService.startShake(duration, amplitude)`
  3. Starts `_flashDelayTimer = shakeDuration`
  4. When timer hits 0, flash plane alpha = 1.0, then fades out

### Technical Details
- **Camera Shake**: Implemented in `GameCameraService._onUpdate()` — adds random XY offset to camera position each frame
- **Flash Plane**: Requires a 3D plane entity with `ColorComponent` placed in front of the camera
- **Editor Setup**:
  - Attach `ImpactFxController` to any persistent entity
  - Set `flashPlaneEntity` property to reference the flash plane
  - Flash plane must have `ColorComponent` with base color white

### Tuning Properties (ImpactFxController @property)
```typescript
shakeDuration  = 0.35  // seconds
shakeAmplitude = 0.08  // world units
flashDuration  = 0.25  // seconds
```

---

## 3. Camera Scroll System

### Files
- **`Scripts/Fishing/GameCameraService.ts`** — Centralized camera controller
- **`Scripts/ClientSetup.ts`** — Registers camera entity on start

### What It Does
Smoothly scrolls the camera vertically to follow the bait as it descends through the water zones. Camera stays locked to the bait's Y position (clamped to zone floor).

### Visual Appearance
- **Motion**: Smooth vertical lerp (speed = 3.0 units/sec)
- **Clamping**: Camera never goes below `floorY + HALF_SCREEN_WORLD_HEIGHT` (prevents showing below unlocked zones)
- **Reset**: When bait surfaces (Y >= base camera Y), scroll offset returns to 0

### Trigger
- **Event**: `Events.BaitMoved` (fired every frame by `RodController` during FALLING and REELING phases)
- **Payload**: `{ x, y }` — bait world position
- **Logic**:
  - If `bait.y >= baseCameraY` → scroll target = 0 (surface)
  - Else → scroll target = `max(floorY + halfScreenHeight, bait.y) - baseCameraY`

### Technical Details
- **Composition**: `GameCameraService` combines 3 offsets:
  1. **Base pose** (set once by `registerCamera()`)
  2. **Scroll offset** (driven by bait Y)
  3. **Shake offset** (driven by `startShake()`)
- **Final Position**: `basePosX + shakeOffsetX, basePosY + scrollOffsetY + shakeOffsetY, basePosZ`
- **Camera Lock**: Uses `CameraService.setCameraMode(CameraMode.Fixed, {...})` every frame

### Tuning Constants (GameCameraService)
```typescript
_scrollLerpSpeed = 3.0  // units/sec (higher = snappier)
```

---

## Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ BUBBLE SYSTEM                                                   │
├─────────────────────────────────────────────────────────────────┤
│ SimpleFishController._updateBubble(dt)                          │
│   └─> _bubbleTimer -= dt                                        │
│   └─> if timer <= 0:                                            │
│       └─> BubblePool.acquire(spawnX, spawnY)                    │
│           └─> EventService.sendLocally(Events.InitBubble, ...)  │
│               └─> BubbleController._onInit(payload)             │
│                   └─> Set position, scale, rise speed           │
│                   └─> _active = true                            │
│                                                                  │
│ BubbleController.onUpdate(dt)                                   │
│   └─> if _active:                                               │
│       └─> newY = pos.y + _riseSpeed * dt                        │
│       └─> if newY >= WATER_SURFACE_Y:                           │
│           └─> BubblePool.release(entity)                        │
│               └─> entity.enabledSelf = false                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ IMPACT FX SYSTEM                                                │
├─────────────────────────────────────────────────────────────────┤
│ RodController._tickFalling()                                    │
│   └─> if bait.y <= floorY:                                      │
│       └─> EventService.sendLocally(Events.BaitHitBottom)        │
│           └─> ImpactFxController._onBaitHitBottom()             │
│               ├─> GameCameraService.startShake(duration, amp)   │
│               │   └─> _shakeTimer = duration                    │
│               └─> _flashDelayTimer = shakeDuration              │
│                                                                  │
│ GameCameraService._onUpdate(dt)                                 │
│   └─> if _shakeTimer > 0:                                       │
│       └─> _shakeOffsetX/Y = random * amplitude * (timer/dur)   │
│       └─> _applyCamera() → CameraService.setCameraMode(...)     │
│                                                                  │
│ ImpactFxController._tickFlash(dt)                               │
│   └─> if _flashDelayTimer > 0:                                  │
│       └─> _flashDelayTimer -= dt                                │
│       └─> if timer <= 0:                                        │
│           └─> _flashCc.color = Color(1, 1, 1, 1)  // full white │
│           └─> _flashTimer = flashDuration                       │
│   └─> if _flashTimer > 0:                                       │
│       └─> alpha = _flashTimer / flashDuration                   │
│       └─> _flashCc.color = Color(1, 1, 1, alpha)  // fade out   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CAMERA SCROLL SYSTEM                                            │
├─────────────────────────────────────────────────────────────────┤
│ RodController._tickFalling() / _tickReeling()                   │
│   └─> EventService.sendLocally(Events.BaitMoved, { x, y })     │
│       └─> GameCameraService._onBaitMoved(payload)               │
│           └─> if bait.y >= baseCameraY:                         │
│               └─> _scrollTargetY = 0                            │
│           └─> else:                                             │
│               └─> floorY = ZoneProgressionService.getFloorY()   │
│               └─> minCamY = floorY + HALF_SCREEN_WORLD_HEIGHT  │
│               └─> targetY = max(minCamY, bait.y)                │
│               └─> _scrollTargetY = targetY - basePosY           │
│                                                                  │
│ GameCameraService._onUpdate(dt)                                 │
│   └─> scrollDiff = _scrollTargetY - _scrollOffsetY             │
│   └─> _scrollOffsetY += scrollDiff * min(1, lerpSpeed * dt)    │
│   └─> _applyCamera() → CameraService.setCameraMode(...)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Extension Hooks

To add new VFX without modifying existing code, subscribe to these events:

| Event | When Fired | Use Case |
|-------|-----------|----------|
| `Events.BaitMoved` | Every frame during FALLING/REELING | Trail particles, water ripples |
| `Events.BaitHitBottom` | Bait touches floor | Dust clouds, splash FX |
| `Events.FishHooked` | Bait touches fish | Hook sparkle, fish flash |
| `Events.BaitSurfaced` | Bait reaches surface | Water splash, droplets |
| `Events.FishCaught` | Fish confirmed caught | Celebration particles, confetti |
| `Events.ZoneUnlocked` | New zone accessible | Zone reveal animation, light beam |

---

## Performance Notes

- **Bubble Pool**: Pre-spawning 40 bubbles avoids runtime allocation stutter
- **LocalOnly Spawning**: All VFX use `NetworkMode.LocalOnly` (no network overhead)
- **Client-Side Only**: All VFX scripts check `isServerContext()` and early-return
- **No Garbage**: Bubbles are recycled, not destroyed/respawned each time

---

## Missing VFX Opportunities

Based on the architecture, these VFX are **not yet implemented** but would fit naturally:

1. **Water Splash** — When bait enters water (subscribe to `Events.CastReleased` + check Y crossing)
2. **Hook Sparkle** — When fish is hooked (subscribe to `Events.FishHooked`)
3. **Reel Trail** — Particle trail behind bait during REELING (subscribe to `Events.BaitMoved` + phase check)
4. **Catch Celebration** — Fireworks/confetti when fish caught (subscribe to `Events.FishCaught`)
5. **Zone Unlock Reveal** — Light beam or glow when new zone unlocked (subscribe to `Events.ZoneUnlocked`)
6. **Fish Glow** — Highlight legendary fish (modify `SimpleFishController` to add glow component)

All of these can be added as **new components** without modifying existing scripts — just subscribe to the relevant events and spawn VFX entities.
