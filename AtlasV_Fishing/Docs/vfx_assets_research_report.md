# VFX Assets Research Report — H3_Fishing

**Date:** 2024  
**Purpose:** Identify available VFX assets for underwater fishing game enhancement

---

## Executive Summary

The H3_Fishing project currently has **minimal VFX implementation** — only programmatic effects (camera shake, color flash, bubble spawning). There are **no PopcornFX particle assets** in the project. To add professional VFX for key gameplay moments, you will need to either:

1. **Create custom PopcornFX effects** using PopcornFX editor (.pkfx files)
2. **Import VFX packages** from external sources (if marketplace exists)
3. **Extend existing programmatic effects** with more sophisticated code-based visuals

---

## Current VFX Implementation

### ✅ Existing Effects (Code-Based)

| Effect | Implementation | File | Quality |
|--------|---------------|------|---------|
| **Bubbles** | Spawned sphere entities with rising motion + fade | `BubbleController.ts` | ⭐⭐⭐ Good |
| **Camera Shake** | Procedural camera offset on bait impact | `ImpactFxController.ts` | ⭐⭐⭐ Good |
| **White Flash** | ColorComponent alpha fade on plane | `ImpactFxController.ts` | ⭐⭐ Basic |

**Strengths:**
- Bubbles are self-contained, randomized, and performant
- Camera shake adds impact to bottom hits
- All effects are mobile-optimized (no particle systems)

**Weaknesses:**
- No particle systems for splashes, sparkles, or celebration
- Flash effect is primitive (single plane fade)
- Missing VFX for key moments: fish hooked, catch celebration, zone unlock

---

## VFX Technology: PopcornFX

Meta Horizon Studio uses **PopcornFX** for particle effects via `VfxComponent`.

### Key Facts:
- **File format:** `.pkfx` (PopcornFX asset files)
- **Component:** `VfxComponent` (attach to entities)
- **Control:** `play()`, `stop()`, `destroy()`, `setCustomParam()`
- **Parameters:** Supports `number`, `boolean`, `Vec2`, `Vec3`, `Vec4`, `Color`, `Quaternion`
- **Performance:** Distance-based LOD, throttled updates recommended

### Usage Pattern:
```typescript
import { VfxComponent, Color } from 'meta/worlds';

const vfx = entity.getComponent(VfxComponent);
vfx.setCustomParams({
  'intensity': 0.75,
  'color': new Color(0, 0.5, 1, 1), // Underwater blue
  'particleCount': 50,
});
vfx.play();
```

---

## Missing VFX Assets

### 🎯 High-Priority Effects for H3_Fishing

| Moment | Effect Needed | Visual Style | Priority |
|--------|--------------|--------------|----------|
| **Fish Hooked** | Hook impact burst | Orange/yellow sparkles, small splash | 🔴 Critical |
| **Bait Splash** | Water entry splash | White foam, blue droplets, ripples | 🔴 Critical |
| **Catch Celebration** | Confetti/sparkles | Colorful, tropical (coral, turquoise, gold) | 🟡 High |
| **Zone Unlock** | Radial burst | Glowing particles, expanding ring | 🟡 High |
| **Bait Trail** | Underwater trail | Subtle bubbles, light streak | 🟢 Medium |
| **Legendary Fish** | Aura/glow | Shimmering particles, golden hue | 🟢 Medium |

### Style Requirements:
- **Cartoon/stylized** (not realistic)
- **Bright, saturated colors** (blues, oranges, turquoise, coral pink, gold)
- **Mobile-optimized** (low particle count, simple shapes)
- **Underwater theme** (bubbles, ripples, light rays)

---

## Recommended VFX Packages (Hypothetical)

*Note: Marketplace availability unknown — these are ideal packages if they exist:*

### 1. **Underwater FX Pack**
- Water splashes (entry/exit)
- Bubble streams
- Ripple effects
- Light rays/caustics
- **Best for:** Bait splash, ambient bubbles

### 2. **Cartoon Celebration Pack**
- Confetti bursts
- Star sparkles
- Radial explosions
- Glitter trails
- **Best for:** Catch celebration, zone unlock

### 3. **Impact & Hit Effects**
- Small burst particles
- Flash rings
- Shockwave ripples
- **Best for:** Fish hooked, bait impact

### 4. **Stylized Magic/Fantasy Pack**
- Glowing auras
- Shimmering particles
- Radial bursts
- **Best for:** Legendary fish, zone unlock

---

## Integration Points (Architecture)

### Where to Add VFX:

| Event | Current Handler | VFX Hook | Implementation |
|-------|----------------|----------|----------------|
| `Events.FishHooked` | `ImpactFxController`, `GameCameraService` | ✅ Ready | Subscribe to event, spawn VFX at bait position |
| `Events.BaitHitBottom` | `ImpactFxController` | ✅ Ready | Already has shake/flash, add splash VFX |
| `Events.FishCaught` | `GameManager`, `CatchDisplayViewModel` | ⚠️ Needs hook | Add VFX spawn in `_triggerCatch()` |
| `Events.ZoneUnlocked` | `ZoneProgressionService` | ⚠️ Needs hook | Add VFX spawn in unlock handler |
| `Events.BaitMoved` | `RodController` | 🔧 Complex | Continuous trail requires VFX entity parenting |

### Example: Fish Hooked VFX
```typescript
// New component: FishHookedVfxController.ts
@component()
export class FishHookedVfxController extends Component {
  @property() hookImpactVfx!: TemplateAsset; // VFX template with VfxComponent

  @subscribe(Events.FishHooked)
  private async _onFishHooked(p: Events.FishHookedPayload): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    const vfxEntity = await WorldService.get().spawnTemplate({
      templateAsset: this.hookImpactVfx,
      position: p.position, // Bait position from payload
      networkMode: NetworkMode.LocalOnly,
    });

    // VFX auto-plays, self-destructs after duration
  }
}
```

---

## Alternatives to PopcornFX

If PopcornFX assets are unavailable, consider:

### 1. **Enhanced Programmatic Effects**
- Spawn multiple colored spheres in burst patterns (fake particles)
- Use `ColorComponent` + `TransformComponent` animation
- Pros: No external assets needed, full control
- Cons: Limited visual quality, more code complexity

### 2. **Animated Sprite Sheets**
- Use texture atlases with frame animation
- Attach to planes with alpha blending
- Pros: Lightweight, mobile-friendly
- Cons: 2D only, less dynamic

### 3. **Mesh-Based Effects**
- Spawn/scale/fade simple meshes (rings, stars, etc.)
- Use `MeshComponent` + `ColorComponent`
- Pros: 3D depth, no particle system overhead
- Cons: Higher draw calls if many instances

---

## Action Items

### Immediate (No Assets Required):
1. ✅ **Enhance bubble spawning** — add color variation, spawn bursts on events
2. ✅ **Add splash rings** — spawn expanding ring meshes on `BaitHitBottom`
3. ✅ **Improve flash effect** — add color tint (blue for water, orange for hook)

### Short-Term (Requires Assets):
1. 🔍 **Search for PopcornFX marketplace** — check if Meta provides asset store
2. 📦 **Import VFX pack** — prioritize underwater/celebration themes
3. 🎨 **Create custom .pkfx** — if no marketplace, use PopcornFX editor

### Long-Term (Polish):
1. 🌟 **Legendary fish aura** — persistent glow effect on rare catches
2. 🎆 **Zone unlock cinematic** — camera pan + radial burst VFX
3. 🌊 **Ambient underwater particles** — floating plankton, light rays

---

## Technical Constraints

### Mobile Optimization:
- **Max particles per effect:** 50-100 (avoid 500+ particle bursts)
- **Particle lifetime:** 1-3 seconds (short-lived effects)
- **Simultaneous effects:** Limit to 2-3 active VFX at once
- **Distance culling:** Stop VFX beyond 30-50 units from camera

### Performance Budget:
```typescript
// Example: Distance-based VFX quality
const distance = camera.worldPosition.distance(vfxPosition);
let particleCount: number;
if (distance < 10) particleCount = 100;      // Close: full quality
else if (distance < 25) particleCount = 50;  // Mid: reduced
else particleCount = 0;                       // Far: disabled
```

---

## Color Palette for VFX

Match the game's tropical underwater theme:

| Color | Hex | Use Case |
|-------|-----|----------|
| **Turquoise** | `#40E0D0` | Water splashes, ambient particles |
| **Coral Orange** | `#FF7F50` | Hook impact, celebration accents |
| **Deep Blue** | `#1E90FF` | Underwater trails, zone unlock |
| **Golden Yellow** | `#FFD700` | Legendary fish, rare catch sparkles |
| **White Foam** | `#F0F8FF` | Splash highlights, bubble cores |
| **Pink Coral** | `#FF69B4` | Celebration confetti, zone unlock |

### Example Color Setup:
```typescript
const UNDERWATER_BLUE = new Color(0.12, 0.56, 1.0, 1.0);   // #1E90FF
const CORAL_ORANGE = new Color(1.0, 0.5, 0.31, 1.0);       // #FF7F50
const GOLDEN_SPARKLE = new Color(1.0, 0.84, 0.0, 1.0);     // #FFD700

vfx.setCustomParam('color', CORAL_ORANGE);
```

---

## Conclusion

**Current State:** Minimal VFX (code-based only), no PopcornFX assets.

**Recommended Path:**
1. **Immediate:** Enhance existing programmatic effects (bubbles, flashes)
2. **Short-term:** Acquire/create PopcornFX assets for key moments (hook, splash, celebration)
3. **Long-term:** Polish with ambient effects and legendary fish VFX

**Critical Need:** Water splash and hook impact VFX are essential for game feel. Prioritize these first.

**Marketplace Status:** Unknown — requires manual search or Meta support inquiry.
