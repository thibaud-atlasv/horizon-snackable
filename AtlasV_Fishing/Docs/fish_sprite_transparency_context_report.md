# Fish Sprite Transparency Issue - Context Report

## Issue Summary
The generated fish sprite at `Textures/Fish/ButterflyFish_Sprite.png` does not have a transparent background as expected. The user wants to generate fish spritesheets with transparent backgrounds for use on 3D planes in the fishing game.

---

## Current State Analysis

### 1. File Existence & Structure
- **File exists**: `Textures/Fish/ButterflyFish_Sprite.png` ✅
- **Asset ID**: `26220234944285836:1459791720904721587`
- **Material**: `Materials/Fish/ButterflyFish_Sprite.material` (Asset ID: `26220234944285836:4242585779623988743`)

### 2. Current Fish Template Architecture

#### ButterflyFish Template Structure (`Templates/ButterflyFish.hstf`)
```
ButterflyFish (root entity)
├─ SimpleFishController component
│  ├─ sizeMin: 0.6
│  ├─ sizeMax: 1.2
│  ├─ speedMin: 0.7
│  └─ speedMax: 1.8
└─ SpritePlane (child entity)
   ├─ TransformComponent (rotated 90° on X-axis to face camera)
   ├─ MeshComponent (plane mesh from engine)
   └─ MaterialComponent
      └─ Material: ButterflyFish_Sprite.material
```

#### How Fish Sprites Are Used
1. **3D Plane Mesh**: Each fish uses a plane mesh (from engine assets) as a billboard
2. **Material System**: The sprite texture is applied via a material asset
3. **Rotation**: The plane is rotated 90° on X-axis (`localRotation.x = 1.5707963705062869`) to face the camera in the Y-up coordinate system
4. **Scaling**: The `SimpleFishController` dynamically scales the entire entity based on `sizeMin`/`sizeMax` properties

### 3. Fish Species Configuration

From `Scripts/Fish/FishDefs.ts`:
```typescript
export const FISH_DEFS: IFishDef[] = [
  { id: 1, name: 'ClownFish',     family: 'Corals', waterLayerMin: 0, waterLayerMax: 7, rarity: 'common', template: Assets.ClownFish },
  { id: 3, name: 'ButterflyFish', family: 'Corals', waterLayerMin: 1, waterLayerMax: 5, rarity: 'common', template: Assets.ButterflyFish },
  { id: 2, name: 'AngelFish',     family: 'Solars', waterLayerMin: 0, waterLayerMax: 7, rarity: 'common', template: Assets.AngelFish },
];
```

**Current fish templates**:
- `Templates/ClownFish.hstf`
- `Templates/ButterflyFish.hstf`
- `Templates/AngelFish.hstf`

### 4. Rendering Configuration

From the `MeshComponent` on SpritePlane:
- **Shadows**: `castsShadows: false` ✅ (good for sprites)
- **Visibility**: `isVisibleSelf: true`
- **Coordinate Space**: `World`
- **Lighting**: Uses default diffuse GI source

---

## Problem Analysis

### Why Transparency Matters
1. **Visual Quality**: Fish sprites need transparent backgrounds to blend naturally with the underwater environment
2. **Overlapping**: Multiple fish swim at different depths; opaque backgrounds would create ugly rectangles
3. **Aesthetic**: The game has a stylized underwater scene with water layers, bubbles, and ambient FX - opaque sprites would break immersion

### Transparency Requirements for MHS
1. **PNG Format**: Must be PNG with alpha channel (not JPG)
2. **Material Shader**: Material must support alpha blending/transparency
3. **Render Order**: May need proper render order for transparent objects
4. **Alpha Testing vs Blending**: Need to determine if hard cutout (alpha test) or soft edges (alpha blend) is desired

### Current Material Configuration
The material at `Materials/Fish/ButterflyFish_Sprite.material` is referenced but we don't have visibility into:
- Whether it's configured for transparency
- What shader it uses
- Whether alpha blending is enabled

---

## Image Generation Capabilities

### MHS Image Generation System
Based on the MHS architecture, image generation is typically handled through:
1. **External tools**: AI image generators (DALL-E, Midjourney, Stable Diffusion, etc.)
2. **Manual creation**: Artists create sprites in tools like Photoshop, Procreate, etc.
3. **Import process**: Images are imported into MHS as texture assets

### Transparency in Generated Images
- **PNG with Alpha**: Most AI image generators support PNG output with transparency
- **Prompt Engineering**: Need to explicitly request "transparent background" or "no background" in prompts
- **Post-Processing**: May need to manually remove backgrounds using tools like:
  - Photoshop (Magic Wand, Select Subject, etc.)
  - Online tools (remove.bg, etc.)
  - GIMP (free alternative)

---

## Recommended Solutions

### Option 1: Regenerate with Transparent Background (Preferred)
**Steps**:
1. Use an AI image generator that supports transparency (e.g., DALL-E 3, Midjourney with background removal)
2. Prompt: "A colorful butterfly fish, side view, cartoon style, transparent background, PNG"
3. If generator doesn't support transparency, use remove.bg or similar tool
4. Save as PNG with alpha channel
5. Replace `Textures/Fish/ButterflyFish_Sprite.png`
6. Verify material shader supports alpha blending

**Pros**: Clean, professional result; no artifacts
**Cons**: Requires regeneration or post-processing

### Option 2: Material Configuration Fix
**Steps**:
1. Check if `ButterflyFish_Sprite.material` is configured for transparency
2. Ensure the shader supports alpha blending
3. Set blend mode to "Transparent" or "Alpha Blend"
4. Adjust render order if needed (transparent objects render after opaque)

**Pros**: May work with existing texture if it has alpha
**Cons**: Won't help if the PNG itself has an opaque background

### Option 3: Spritesheet Approach (Future Enhancement)
**For multiple fish variants**:
1. Create a single spritesheet with multiple fish sprites (all with transparency)
2. Use UV coordinates to select different fish from the same texture
3. Reduces texture memory and draw calls
4. Example: 4x4 grid = 16 different fish in one texture

**Pros**: Efficient, scalable for many species
**Cons**: More complex setup; requires UV manipulation

---

## Files to Modify

### If Regenerating Sprites
1. **Replace**: `Textures/Fish/ButterflyFish_Sprite.png`
2. **Verify**: `Materials/Fish/ButterflyFish_Sprite.material` (check transparency settings)
3. **Test**: Preview in MHS to confirm transparency works

### If Creating New Fish Species
1. **Create**: `Textures/Fish/{FishName}_Sprite.png` (with transparency)
2. **Create**: `Materials/Fish/{FishName}_Sprite.material` (configure for alpha blend)
3. **Create**: `Templates/{FishName}.hstf` (copy ButterflyFish structure)
4. **Update**: `Scripts/Assets.ts` (add new template reference)
5. **Update**: `Scripts/Fish/FishDefs.ts` (add new fish definition)

---

## Technical Specifications

### PNG Transparency Requirements
- **Format**: PNG-24 or PNG-32 (supports full alpha channel)
- **Color Mode**: RGBA (Red, Green, Blue, Alpha)
- **Alpha Channel**: 8-bit (256 levels of transparency)
- **File Size**: Keep under 2MB for performance (typical sprite: 512x512 or 1024x1024)

### Material Shader Requirements (MHS)
- **Blend Mode**: Transparent or Alpha Blend
- **Cull Mode**: None (render both sides) or Back (render front only)
- **Depth Write**: Typically disabled for transparent objects
- **Render Queue**: Transparent queue (renders after opaque geometry)

### Recommended Sprite Dimensions
- **Single Fish**: 512x512 or 1024x1024 (power of 2 for GPU efficiency)
- **Spritesheet**: 2048x2048 or 4096x4096 (if using atlas approach)
- **Aspect Ratio**: 1:1 (square) for flexibility, or match fish proportions

---

## Testing Checklist

After implementing transparency:
- [ ] Fish sprite has no visible background rectangle
- [ ] Fish edges blend smoothly with environment
- [ ] Multiple overlapping fish render correctly (no z-fighting)
- [ ] Fish visibility at different water depths (layers 0-7)
- [ ] Performance is acceptable (transparent rendering is more expensive)
- [ ] Fish flipping (left/right) works correctly with transparency

---

## Related Code References

### Fish Rendering
- **Controller**: `Scripts/Fish/SimpleFishController.ts` (handles scaling, flipping, movement)
- **Spawning**: `Scripts/Fish/FishSpawnService.ts` (spawns fish templates)
- **Definitions**: `Scripts/Fish/FishDefs.ts` (fish species catalog)

### Key Methods
- `SimpleFishController._flipScale()`: Handles left/right facing (uses Y-rotation, not scale flip)
- `SimpleFishController.onUpdate()`: Updates position and bobbing animation

### Coordinate System
- **Y-Up**: Vertical axis (0 = surface, negative = deeper)
- **X-Axis**: Horizontal movement (FISH_LEFT to FISH_RIGHT from `Constants.ts`)
- **Z-Axis**: Forward/backward (fish face camera, so Z is depth into scene)

---

## Next Steps

1. **Immediate**: Determine if current PNG has alpha channel (check in image editor)
2. **If no alpha**: Regenerate or post-process to add transparency
3. **Verify material**: Ensure material shader supports alpha blending
4. **Test in preview**: Spawn fish and verify transparency works
5. **Expand**: Apply same process to ClownFish and AngelFish templates

---

## Additional Notes

### Performance Considerations
- Transparent rendering is more expensive than opaque (requires sorting, blending)
- Keep sprite resolution reasonable (1024x1024 max for mobile)
- Consider using alpha test (hard cutout) instead of alpha blend if soft edges aren't needed

### Art Direction
- Current game has stylized underwater aesthetic with:
  - Water layers with caustic animation
  - Ambient bubbles and particles
  - God rays and seaweed
  - Soft, dreamy color palette
- Fish sprites should match this style (cartoon/stylized, not photorealistic)

### Future Enhancements
- Animated sprite sheets (swimming animation frames)
- Particle effects on fish (bubbles, sparkles for rare fish)
- Glow/emission for legendary fish
- Shadow sprites (fake shadows on water layers below fish)
