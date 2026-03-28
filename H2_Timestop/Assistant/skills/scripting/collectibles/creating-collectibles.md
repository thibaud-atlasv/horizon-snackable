---
name: collectibles
summary: Contains critical information on creating collectible items that spawn dynamically with mesh/visuals, collision, and pickup detection.
include: as_needed
---

# Creating Collectibles

Collectibles are entities players can pick up for effects (coins, health, power-ups). They must be spawned dynamically at runtime.

> **⚠️ CRITICAL: Dynamic Spawning Only**
> MHS does not support destroying entities that are placed at edit-time. Collectibles MUST be spawned dynamically using `WorldService.spawnTemplate()`. Statically placed collectibles will not work because they cannot be destroyed when collected.

| File | Purpose |
|------|---------|
| `Collectible.ts.skill` | Base collectible component with trigger detection, client-side visual hiding, and pickup logic |
| `CollectibleSpawner.ts.skill` | Spawner component for dynamically creating collectibles |

---

## Network Optimization

The collectible system uses **client-predictive collection** for responsive gameplay:

1. **Trigger detection runs EVERYWHERE** (`ExecuteOn.Everywhere`) - all clients detect collection instantly
2. **Collecting client hides visuals immediately** - no waiting for server round-trip
3. **Collection effects run on collector's client** - responsive feedback for the player who collected
4. **Collecting client sends `RequestCollectEvent` to owner** - explicit request for destruction
5. **Owner (server) handles authoritative destruction** - only destroys upon receiving the event

This eliminates the "laggy pickup" feel where collectibles persist visually after the player touches them.

The event-based destruction ensures the server only destroys when explicitly requested by a collecting client, preventing race conditions and making the ownership model airtight.

---

## Key Rules

- **Dynamic Spawning Required:** Collectibles must be spawned at runtime—edit-time placed entities cannot be destroyed
- **Trigger + DynamicCollider Required:** Pickup detection only works when collectible is `Trigger` and collector is `DynamicCollider`
- **Primitive Colliders Only:** Triggers require sphere/box/capsule colliders, not mesh colliders
- **Immediate Effects:** `onCollected()` runs on the collector's client—apply effects immediately, don't defer
- **NetworkMode.Networked:** Use for multiplayer visibility; `LocalOnly` for client-only effects
- **Ownership:** Server-spawned collectibles are server-owned; the server handles destruction

---

## Setup

### Step 1: Copy Base Scripts

> **⚠️ IMPORTANT**: You **MUST** use `copy_local_file` to copy these files. Do NOT attempt to create them from scratch or use any other method.

| Source | Destination |
|--------|-------------|
| `Assistant/skills/scripting/collectibles/Collectible.ts.skill` | `scripts/Collectible.ts` |
| `Assistant/skills/scripting/collectibles/CollectibleSpawner.ts.skill` | `scripts/CollectibleSpawner.ts` |

### Step 2: Create Collectible Template

`template_gameplay_object` automatically creates a script file and attaches it to the template. We'll modify that script in the next step to extend from the base `Collectible` class.

1. `template_gameplay_object` with:
   - `template_name` = `"CoinCollectible"` (or your collectible name)
   - `mesh_asset_id` = your mesh asset ID (from `generate_mesh_from_image` or existing)
   - `physics_body_type` = `"Trigger"` (REQUIRED for pickup detection)
   - `use_gravity` = `false` (collectibles typically float)
   - `scale` = appropriate size (see Scale Guidelines below)

This creates:
- A template at `assets/templates/CoinCollectible.template`
- A script at `scripts/CoinCollectible.ts` (auto-attached to the template)

**Scale Guidelines:**

| Size | Scale Range | Examples |
|------|-------------|----------|
| Small | 0.3–0.5 | Coins, gems |
| Medium | 0.8–1.2 | Potions, keys |
| Large | 1.5–2.5 | Treasure chests |

### Step 3: Modify Auto-Generated Script


#### Step 3.1 Extend Collectible
The auto-generated script needs to be modified to extend the base `Collectible` class and implement the `onCollected()` method.

Modify the auto-generated script (e.g., `scripts/CoinCollectible.ts`) to extend from `Collectible` (WITHOUT modifying its name, to preserve the template):

```typescript
import { component, property } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { Collectible } from './Collectible';

@component()
export class CoinCollectible extends Collectible {
  @property()
  coinValue: number = 10;

  protected override onCollected(collector: Entity): void {
    // Apply effect here (add score, heal player, grant power-up, etc.)
    // NOTE: This runs on the collector's client for immediate feedback
    console.log(`Collected coin worth ${this.coinValue}!`);

    // For server-authoritative effects, send an event to the server:
    // EventService.sendGlobally(CoinCollectedEvent, {
    //   coinValue: this.coinValue,
    //   collectorId: collector.ownerId,
    // });
  }
}
```

#### Step 3.2 Configure Collision Detection

Override `isValidCollector()` in your new class to define what can collect items:

```typescript
// By component
protected override isValidCollector(entity: Entity): boolean {
  return entity.getComponent(BasePlayerComponent) !== null; // CRITICAL: NEVER use `PlayerComponent` here or anywhere else
}

// By name
protected override isValidCollector(entity: Entity): boolean {
  return entity.name === 'Ball';
}

// By tag
protected override isValidCollector(entity: Entity): boolean {
  return entity.getComponent(PlayerTag) !== null;
}
```

If not overridden, any entity can collect.

### Step 4: Verify Script Compilation

1. `wait_for_asset_build` with:
   - `directoryPaths` = `scripts/`
2. If there are any failures, fix the scripts and call `wait_for_asset_build` again to verify compilation. Repeat until successful, using `server_rag_tool` to query for API information as needed.

### Step 5: Set Up Dynamic Spawning

> **⚠️ REMINDER:** Do NOT place collectibles directly in the scene at edit-time. They must be spawned dynamically.

Use `CollectibleSpawner` to spawn at runtime:

```typescript
import { WorldService, NetworkMode, Vec3, TemplateAsset, property, component, Component } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

@component()
export class CollectibleSpawner extends Component {
  @property()
  collectibleTemplate: Maybe<TemplateAsset> = null;

  async spawnCollectible(position: Vec3): Promise<void> {
    if (!this.collectibleTemplate) return;

    await WorldService.get().spawnTemplate({
      templateAsset: this.collectibleTemplate,
      networkMode: NetworkMode.Networked,  // Server-owned, visible to all
      position: position,
    });
  }
}
```

**Common Spawn Patterns:**

- **Spawn on game start:** Call `spawnCollectible()` in `OnEntityStartEvent` handler
- **Spawn at intervals:** Use a timer to periodically spawn collectibles
- **Spawn on trigger:** Spawn when player enters an area or completes an action
- **Spawn at predefined positions:** Store an array of `Vec3` positions and iterate through them

---

## How Collection Works (Network Flow)

Understanding the network flow helps when debugging or extending collectibles:

```
Player touches collectible
        │
        ▼
┌─────────────────────────────────────────────┐
│  OnTriggerEnterEvent (ExecuteOn.Everywhere) │
│  - Runs on ALL clients simultaneously       │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  isValidCollector() check                   │
│  - Each client validates locally            │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  Collecting client (isLocalCollector)       │
│  1. hideVisuals() - INSTANT                 │
│  2. onCollected() - immediate effects       │
│  3. EventService.sendTo(RequestCollectEvent)│
│     → Sends to collectible's owner (server) │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  Owner (server) receives RequestCollectEvent│
│  - onRequestCollect() handler runs          │
│  - entity.destroy() called authoritatively  │
│  - Destruction replicates to all clients    │
└─────────────────────────────────────────────┘
```

**Key points:**
- The collecting player sees the collectible disappear instantly (visual hide)
- The server only destroys when it receives `RequestCollectEvent` from a collecting client
- Other players see it disappear when the server destruction replicates (slight delay, but doesn't affect their gameplay)
- This event-based flow prevents race conditions and ensures airtight ownership

---

## Troubleshooting

**Collectible won't disappear when collected:**

- **MOST LIKELY CAUSE:** Collectible was placed at edit-time instead of spawned dynamically
- MHS cannot destroy edit-time placed entities—you MUST spawn collectibles dynamically

**Pickup not triggering:**

- Verify collectible has `PhysicsBodyType.Trigger`
- Verify collector (player) has `PhysicsBodyType.DynamicCollider`
- Verify collectible uses primitive collider (sphere/box/capsule), not mesh collider

**Collectible invisible:**

- Verify `MeshComponent` and `MaterialComponent` are attached to visual entity
- Check mesh asset ID is valid

**Pickup feels laggy (collectible persists after touch):**

- Ensure the base `Collectible.ts` uses `ExecuteOn.Everywhere` for trigger detection
- Ensure `hideVisuals()` is called for the local collector
- Check that `isLocalCollector()` correctly identifies the collecting client

**Duplicate effects (effect applied multiple times):**

- The `hasBeenCollected` flag prevents duplicate processing
- If you override `onTriggerEnter`, ensure you call the parent or check `hasBeenCollected`

**Effects not syncing in multiplayer:**

- `onCollected()` runs on the collector's client only
- For server-authoritative effects, send a global event from `onCollected()` to notify the server
- Use `NetworkMode.Networked` when spawning collectibles

**Can't modify collector from collectible:**

- `onCollected()` runs on the collector's client, so you CAN modify the collector directly
- If you need to modify other clients' state, use events to communicate

**Other players see collectible briefly after I collect it:**

- This is expected—other clients see destruction when the server replicates it
- The collecting player sees instant feedback; slight delay for others is acceptable
