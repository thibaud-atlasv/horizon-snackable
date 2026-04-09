# World Overview Report

## Summary
This world contains a **classic Breakout/Arkanoid arcade game** implemented in Meta Horizon Studio. The game features a paddle controlled by touch input, a ball that bounces around the play area, and destructible bricks arranged in a grid pattern. The game includes lives system, level completion detection, and automatic restart mechanics.

---

## Scene Structure (space.hstf)

### Main Entities
1. **StartingWorld** (Root) - Position: (0, 0, 0)
   - **SpawnPoint** - Position: (0, -100, -2)
   - **ClientSetup** - Position: (0, 0, 100)
     - Handles camera setup and focused interaction mode
   - **Background** - Position: (0, 0, 0)
   - **Paddle** - Position: (0, -7, 0)
     - Child: Cube (visual mesh)
     - Scale: (1, 0.2, 0.2) - horizontal bar shape
   - **Ball** - Position: (0, -6.5, 0)
     - Child: Sphere (visual mesh)
     - Scale: (0.2, 0.2, 0.2) - small sphere
   - **Manager** - Position: (-3.45, 5.35, 0)
     - Contains game management components

---

## Game Systems

### 1. **GameManager Component**
**Location:** `scripts/GameManager.ts`
**Attached to:** Manager entity

**Responsibilities:**
- Tracks player lives (default: 3 lives)
- Handles ball lost events (decrements lives, triggers reset)
- Detects level completion (when all bricks destroyed)
- Triggers game restart when lives run out or level complete

**Key Properties:**
- `maxLives: number = 3` - Maximum lives per game

**Events Handled:**
- `Events.BallLost` - Decrements lives, resets round
- `Events.BrickDestroyed` - Checks if all bricks cleared

---

### 2. **Paddle Component**
**Location:** `scripts/Paddle.ts`
**Attached to:** Paddle entity

**Responsibilities:**
- Player-controlled paddle movement via touch/ray input
- Collision detection with ball
- Boundary clamping to keep paddle in play area
- Reset to starting position on round reset

**Key Properties:**
- `paddleSpeed: number = 15` - Movement speed (currently set to 15)
- Implements `ICollider` interface with tag `'paddle'`

**Movement System:**
- Uses raycasting from touch input to determine target position
- Smoothly interpolates to target position
- Clamps position within game bounds (±4.5 units horizontally)

---

### 3. **Ball Component**
**Location:** `scripts/Ball.ts`
**Attached to:** Ball entity

**Responsibilities:**
- Ball physics and movement
- Collision detection and response (walls, paddle, bricks)
- Launch on touch input
- Boundary detection (ball lost at bottom)

**Key Properties:**
- `ballSpeed: number = 5` - Base speed (currently set to 0, likely needs configuration)
- Implements `ICollider` interface with tag `'ball'`

**Physics Behavior:**
- Starts idle, launches on first touch with velocity (0.6x, 0.8y) * speed
- Bounces off left/right/top walls
- Reflects off paddle with angle based on hit position (±60° range)
- Bounces off bricks (determines side hit for proper reflection)
- Triggers `BallLost` event when falling below bottom boundary

---

### 4. **Brick Component**
**Location:** `scripts/Brick.ts`
**Attached to:** Brick template instances

**Responsibilities:**
- Collision detection with ball
- Self-destruction on hit
- Unregisters from collision system on destruction

**Key Properties:**
- Implements `ICollider` interface with tag `'brick'`

---

### 5. **LevelLayout Component**
**Location:** `scripts/LevelLayout.ts`
**Attached to:** Manager entity

**Responsibilities:**
- Spawns brick grid based on pattern string
- Manages brick lifecycle (spawn/destroy)
- Handles level restart

**Key Properties:**
- `brickTemplate: TemplateAsset` - Reference to Brick.hstf template
- `gridPattern: string = "111111\n111111\n111111"` - Grid layout (1=brick, 0=empty)
- `brickWidth: number = 1.2` - Individual brick width
- `brickHeight: number = 0.4` - Individual brick height
- `paddingX: number = 0.1` - Horizontal spacing
- `paddingY: number = 0.1` - Vertical spacing
- `startY: number = 4` - Top row Y position

**Current Configuration:**
- Default pattern: 3 rows of 6 bricks each (18 total bricks)
- Currently set to spawn only 1 brick (pattern = "1")
- Bricks spawn as `NetworkMode.LocalOnly` (client-side only)

---

### 6. **CollisionManager (Singleton)**
**Location:** `scripts/CollisionManager.ts`

**Responsibilities:**
- Central collision detection system
- Registers/unregisters colliders
- Performs AABB (Axis-Aligned Bounding Box) overlap checks
- Runs collision checks every 33ms (~30 FPS)

**Key Methods:**
- `register(collider)` - Add collider to system
- `unregister(collider)` - Remove collider from system
- `checkCollisions()` - Performs pairwise collision checks
- `countByTag(tag)` - Counts colliders by tag (used for brick counting)

---

### 7. **ClientSetup Component**
**Location:** `scripts/ClientSetup.ts`
**Attached to:** ClientSetup entity

**Responsibilities:**
- Sets up fixed camera view
- Enables focused interaction mode (disables emotes/exit buttons)

**Key Properties:**
- `camera?: Entity` - Optional camera entity reference
- `initDelay: number = 0` - Delay before setup (in seconds)

---

## Game Constants

**Location:** `scripts/Constants.ts`

```typescript
HEIGHT = 16
WIDTH = 9
BOUNDS = { x: -4.5, y: -8, w: 9, h: 16 }
```

Play area spans from -4.5 to +4.5 horizontally and -8 to +8 vertically.

---

## Event System

**Location:** `scripts/Types.ts`

### Network Events:
1. **Restart** - Triggers full game restart (resets lives, respawns bricks)
2. **ResetRound** - Resets ball and paddle positions
3. **BallLost** - Fired when ball falls below bottom boundary
4. **BrickDestroyed** - Fired when a brick is destroyed

---

## Game Flow

1. **Initialization:**
   - Camera set to fixed view
   - Focused interaction enabled
   - Paddle, ball, and bricks register with CollisionManager
   - Bricks spawn based on grid pattern

2. **Gameplay Loop:**
   - Player touches screen to launch ball
   - Player drags to move paddle horizontally
   - Ball bounces off walls, paddle, and bricks
   - Bricks destroyed on contact
   - Ball lost triggers life decrement

3. **Win Condition:**
   - All bricks destroyed → Restart event → New level spawns

4. **Lose Condition:**
   - Lives reach 0 → Restart event → Lives reset to max

---

## Current Configuration Issues

### Potential Problems:
1. **Ball speed set to 0** - Ball won't move (needs to be set to ~5)
2. **Brick grid pattern = "1"** - Only spawns 1 brick instead of full grid
3. **Brick dimensions = 0** - Bricks may not render properly (width/height/padding all 0)
4. **LevelLayout startY = 0** - Bricks may spawn at wrong position

### Recommended Fixes:
- Set `Ball.ballSpeed` to 5 or higher
- Set `LevelLayout.gridPattern` to proper pattern (e.g., "111111\n111111\n111111")
- Set `LevelLayout.brickWidth` to 1.2
- Set `LevelLayout.brickHeight` to 0.4
- Set `LevelLayout.paddingX` and `paddingY` to 0.1
- Set `LevelLayout.startY` to 4

---

## Technical Architecture

### Networking:
- Game runs **client-side only** (all components check `isServerContext()` and return early)
- Bricks spawn as `NetworkMode.LocalOnly`
- Uses `NetworkEvent` for internal event communication (though could use `LocalEvent`)

### Collision System:
- Custom AABB collision detection (not using physics engine)
- Interface-based design (`ICollider`)
- Tag-based collision filtering
- Polling-based at 30 FPS

### Input:
- Uses `FocusedInteractionService` for touch input
- Raycasting from touch position to game plane (Z=0)
- Touch-to-launch mechanic for ball

---

## Templates

1. **space.hstf** - Main game scene
2. **Brick.hstf** - Individual brick template (spawned dynamically)
3. **player.hstf** - Player template (not used in current game)

---

## Summary of What Works

✅ **Implemented:**
- Touch-controlled paddle movement
- Ball physics and bouncing
- Collision detection system
- Brick destruction
- Lives system
- Level completion detection
- Automatic restart mechanics
- Fixed camera view

⚠️ **Needs Configuration:**
- Ball speed property
- Brick grid layout
- Brick dimensions and spacing
- Starting Y position for bricks

This is a fully functional Breakout game that just needs proper property configuration to work correctly!
