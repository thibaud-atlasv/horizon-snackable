---
name: implementing-health-system
description: Implements health/damage system with HealthComponent, damage events, invulnerability, modifiers, and HUD UI (health bar or hearts). Use when implementing damageable entities, player health, enemy health, or destructibles.
include: as_needed
---

# Health System

A complete, project-agnostic health/damage system for any entity that can take damage, heal, die, and revive.

| .skill File | Purpose |
|-------------|---------|
| `Assistant/skills/scripting/health-system/HealthComponent.ts.skill` | Core health component with damage, healing, death, revival, invulnerability, and modifiers |
| `Assistant/skills/scripting/health-system/HealthEvents.ts.skill` | All health-related events (local and network) |
| `Assistant/skills/scripting/health-system/HealthBarViewModel.ts.skill` | ViewModel for continuous health bar UI |
| `Assistant/skills/scripting/health-system/HealthBar.xaml.skill` | XAML for continuous health bar with damage animation |
| `Assistant/skills/scripting/health-system/HealthHeartsViewModel.ts.skill` | ViewModel for discrete hearts/chunks UI |
| `Assistant/skills/scripting/health-system/HealthHearts.xaml.skill` | XAML for discrete hearts display |
| `Assistant/skills/scripting/health-system/HealthHUD.ts.skill` | Controller that connects HealthComponent to UI |

## Setup Workflow

- [ ] Step 1: Copy core files
- [ ] Step 2: Choose UI style (bar or hearts)
- [ ] Step 3: Attach HealthComponent to entities
- [ ] Step 4: Set up HUD (if player health)
- [ ] Step 5: Connect damage sources

---

## Step 1: Copy Core Files (Required)

Copy these files to your project:

```
copy_local_file: Assistant/skills/scripting/health-system/HealthEvents.ts.skill → scripts/Health/HealthEvents.ts
copy_local_file: Assistant/skills/scripting/health-system/HealthComponent.ts.skill → scripts/Health/HealthComponent.ts
```

Run `wait_for_asset_build` after copying.

---

## Step 2: Choose UI Style

### Option A: Health Bar (Continuous Fill)
For percentage-based health display with smooth animations.

```
copy_local_file: Assistant/skills/scripting/health-system/HealthBarViewModel.ts.skill → scripts/Health/HealthBarViewModel.ts
copy_local_file: Assistant/skills/scripting/health-system/HealthBar.xaml.skill → UI/HealthBar.xaml
copy_local_file: Assistant/skills/scripting/health-system/HealthHUD.ts.skill → scripts/Health/HealthHUD.ts
```

### Option B: Health Hearts (Discrete Chunks)
For games with discrete health units (hearts, shields, etc.).

```
copy_local_file: Assistant/skills/scripting/health-system/HealthHeartsViewModel.ts.skill → scripts/Health/HealthHeartsViewModel.ts
copy_local_file: Assistant/skills/scripting/health-system/HealthHearts.xaml.skill → UI/HealthHearts.xaml
copy_local_file: Assistant/skills/scripting/health-system/HealthHUD.ts.skill → scripts/Health/HealthHUD.ts
```

Modify `HealthHUD.ts` to use the appropriate ViewModel after copying.

---

## Step 3: Attach HealthComponent to Entities

Add `HealthComponent` to any entity that should be damageable:

**For Players** (client-owned):
1. Open player template
2. Add `HealthComponent` to root entity
3. Set `maxHealthValue` property
4. Set `invulnerabilityDuration` if desired (seconds of i-frames after damage)

**For Enemies/Destructibles** (server-owned):
1. Open enemy/object template
2. Add `HealthComponent` to root entity
3. Configure properties as needed

---

## Step 4: Set Up HUD (Player Health Only)

1. Create a HUD entity in your scene with `CustomUiComponent`
2. Set the XAML asset to `UI/HealthBar.xaml` or `UI/HealthHearts.xaml`
3. Add `HealthHUD` component to the HUD entity
4. Set the `playerEntity` property to reference the player

---

## Step 5: Connect Damage Sources

### Dealing Damage

```typescript
import { HealthComponent, DamageInfo } from './Health/HealthComponent';

// Get health component from target
const health = targetEntity.getComponent(HealthComponent);
if (health) {
  const damageInfo: DamageInfo = {
    baseDamage: 10,
    damageType: 'physical',  // optional
    source: projectileEntity, // optional: what dealt damage
    attacker: playerEntity,   // optional: who initiated
  };
  const result = health.takeDamage(damageInfo);
  
  if (result.wasFatal) {
    // Target died
  }
}
```

### Healing

```typescript
const actualHealed = health.heal(25);
```

### Subscribing to Health Events

**Instance callbacks** (on the entity with HealthComponent):
```typescript
// In a component on the same entity
const health = this.entity.getComponent(HealthComponent);

health.onDamageTaken((damageInfo, actualDamage) => {
  // React to damage (knockback, sound, etc.)
});

health.onDeath((damageInfo) => {
  // Handle death (spawn loot, play animation)
});

health.onHealthChanged((current, max) => {
  // Update UI or other systems
});

health.onHealed((amount) => {
  // Play heal effect
});

health.onRevived(() => {
  // Reset entity state
});
```

**Global events** (from any script):
```typescript
import { OnHealthDamagedLocalEvent, OnHealthDamagedNetworkEvent } from './Health/HealthEvents';

// Client-side only (for UI, VFX)
@subscribe(OnHealthDamagedLocalEvent)
onLocalDamage(payload: HealthDamagedEventPayload) {
  // Show damage numbers, play hit sound
}

// Network-synced (for game logic)
@subscribe(OnHealthDamagedNetworkEvent, { execution: ExecuteOn.Everywhere })
onNetworkDamage(payload: HealthDamagedEventPayload) {
  // Track damage for scoring, achievements
}
```

---

## API Reference

### HealthComponent Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxHealthValue` | number | 100 | Maximum health |
| `invulnerabilityDuration` | number | 0 | Seconds of invulnerability after taking damage |
| `showDamageText` | boolean | false | Whether to show floating damage numbers |

### HealthComponent Read-Only Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentHealth` | number | Current health value |
| `maxHealth` | number | Maximum health value |
| `isDead` | boolean | Whether entity is dead |
| `isAlive` | boolean | Whether entity is alive |
| `isInvulnerable` | boolean | Whether currently invulnerable |

### HealthComponent Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `takeDamage(damageInfo)` | DamageResult | Apply damage, returns result |
| `heal(amount)` | number | Heal entity, returns actual amount healed |
| `setMaxHealth(value, healToFull?)` | void | Set max health, optionally heal to full |
| `setCurrentHealth(value, suppressEvents?)` | void | Force set current health |
| `die(damageInfo?)` | void | Instantly kill entity |
| `revive(healthAmount?)` | void | Revive dead entity |
| `setInvulnerable(duration)` | void | Set temporary invulnerability |
| `addDamageModifier(modifier)` | number | Add damage modifier, returns ID |
| `removeDamageModifier(id)` | boolean | Remove modifier by ID |

### DamageInfo Interface

```typescript
interface DamageInfo {
  baseDamage: number;           // Required: base damage amount
  damageType?: string;          // Optional: "fire", "poison", "physical", etc.
  source?: Entity;              // Optional: entity that dealt damage (projectile)
  attacker?: Entity;            // Optional: entity that initiated (player/enemy)
  ignoreInvulnerability?: boolean; // Optional: bypass i-frames
  isCritical?: boolean;         // Optional: critical hit flag
  [key: string]: any;           // Extensible for custom data
}
```

### DamageResult Class

```typescript
class DamageResult {
  actualDamage: number;     // Final damage after modifiers
  baseDamage: number;       // Original damage before modifiers
  wasFatal: boolean;        // Whether this killed the target
  wasBlocked: boolean;      // Whether damage was blocked (invuln/dead)
  wasCritical: boolean;     // Whether this was a critical hit
  shouldDisplayText: boolean; // Whether to show damage text
}
```

---

## Damage Modifiers

Create custom damage modifiers for armor, resistances, or buffs:

```typescript
import { IDamageModifier, DamageInfo } from './Health/HealthComponent';

class ArmorModifier implements IDamageModifier {
  constructor(private armorValue: number) {}
  
  modifyIncomingDamage(damage: number, damageInfo: DamageInfo): number {
    // Reduce damage by armor, minimum 1
    return Math.max(1, damage - this.armorValue);
  }
}

// Add to health component
const modifierId = health.addDamageModifier(new ArmorModifier(5));

// Remove later
health.removeDamageModifier(modifierId);
```

---

## Networking Considerations

**HealthComponent ownership follows entity ownership:**
- Player health → client-owned (only that client can modify)
- Enemy/object health → server-owned (only server can modify)

**Cross-ownership damage:**
When a client-owned weapon hits a server-owned enemy, `takeDamage()` automatically sends a `TakeDamageEvent` to the owner. No manual networking required.

**Events:**
- `OnHealthDamagedLocalEvent` - Client-only, for UI/VFX
- `OnHealthDamagedNetworkEvent` - Broadcast to all, for game logic

---

## Customization

### Custom Heart Icons
Edit `HealthHearts.xaml.skill` to change heart images:
- Replace `UI/heart_full.png` with your full heart image
- Replace `UI/heart_empty.png` with your empty heart image

### Health Bar Colors
Edit `HealthBar.xaml.skill` gradient colors:
- Change `#FFBD2D2D` / `#FFD93333` for health fill color
- Change `#FF6600` for damage animation color

### Hearts Per Row
In `HealthHeartsViewModel.ts.skill`, modify `heartsPerRow` to change layout.

---

## Validation

- [ ] `wait_for_asset_build` completes without errors for all copied files
- [ ] HealthComponent can be added to entities in templates
- [ ] `takeDamage()` reduces health and fires callbacks
- [ ] `heal()` increases health up to max
- [ ] Death callbacks fire when health reaches 0
- [ ] UI updates when health changes (if HUD set up)

---

## Troubleshooting

**"Cannot modify health from this context"**
- Check entity ownership. Only the owner can modify `@property()` fields.
- For cross-ownership damage, `takeDamage()` handles this automatically via events.

**UI not updating**
- Ensure `HealthHUD` component is attached to the HUD entity
- Verify `playerEntity` property is set correctly
- Check that `CustomUiComponent.dataContext` is assigned

**Damage not applying**
- Verify target has `HealthComponent`
- Check `isInvulnerable` and `isDead` states
- Ensure `baseDamage` > 0 in DamageInfo

**Events not firing**
- For `OnHealthDamagedLocalEvent`: only fires on clients
- For `OnHealthDamagedNetworkEvent`: check `execution: ExecuteOn.Everywhere`
- Instance callbacks only fire on the owning side
