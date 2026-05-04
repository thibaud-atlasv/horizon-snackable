---
name: xaml_sprite_rendering
summary: Rendering character sprites as XAML elements with OpacityMask for pixel-perfect flash effects, transforms, and layering — alternative to DrawingSurface drawImage for entities that need color overlays
include: always
agents: [global]
---

# XAML Sprite Rendering

This skill describes a hybrid rendering technique where **character sprites are rendered as XAML elements** (layered on top of or alongside the DrawingSurface) instead of being drawn via `drawImage()` / `ImageBrush`. This gives you native XAML transforms, opacity control, and — critically — **pixel-perfect OpacityMask support** for flash effects.

## When to Use This vs DrawingSurface

| Use Case | Recommended Approach |
|----------|---------------------|
| Characters, enemies, NPCs that need flash/tint effects | **XAML Sprite Rendering** (this skill) |
| Characters with layered body + weapon sprites | **XAML Sprite Rendering** |
| Ground tiles, backgrounds, terrain | DrawingSurface `drawImage()` / `ImageBrush` |
| Particles, damage numbers, VFX | DrawingSurface vector primitives |
| Attack range rings, ground indicators | DrawingSurface |
| Pickups and collectibles (no flash needed) | Either approach works |

**Rule of thumb:** Use XAML sprites for any entity that needs color overlay effects (hurt flash, tint, highlight). Use DrawingSurface for everything else (bulk rendering, particles, tiles, effects).

## The Core Technique

Each game entity (hero, enemy) is represented by one or more XAML `<Rectangle>` elements. Each rectangle:

1. Has an `ImageBrush` fill bound to the sprite's `TextureAsset`
2. Has position, size, scale, rotation, and opacity bound to ViewModel properties
3. Can have an **OpacityMask** bound to the same sprite texture — this allows drawing a solid-color rectangle that is masked to the sprite's silhouette (pixel-perfect flash effects)

### Why OpacityMask Works

In XAML/Noesis, `OpacityMask` uses the alpha channel of a brush to determine which pixels of an element are visible. When you:

1. Fill a `<Rectangle>` with a solid color (e.g., white)
2. Set the rectangle's `OpacityMask` to an `ImageBrush` of the sprite texture

...the result is the sprite's silhouette filled with the solid color. This is pixel-perfect — every transparent pixel in the sprite is also transparent in the flash overlay. No elliptical approximations needed.

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│ XAML Layout (inside Viewbox)                │
│                                             │
│  ┌─ DrawingSurface ──────────────────────┐  │
│  │  Ground tiles, particles, VFX,        │  │
│  │  damage numbers, range ring           │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ Sprite Layer (Canvas) ───────────────┐  │
│  │  Enemy body rectangles                │  │
│  │  Enemy weapon rectangles              │  │
│  │  Hero body rectangle                  │  │
│  │  Hero weapon rectangle                │  │
│  │  Flash overlay rectangles             │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ HUD / UI Layer ─────────────────────┐  │
│  │  Score, health, wave bar, menus       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

The sprite layer sits **between** the DrawingSurface (game world) and the HUD (UI). Sprites render above ground effects but below UI.

## Implementation

### Step 1: ViewModel Properties

For each sprite element, you need ViewModel properties for position, size, scale, rotation, opacity, and texture. For a pooled system with multiple enemies, use indexed properties.

```typescript
import { UiViewModel, uiViewModel } from 'meta/custom_ui';
import { TextureAsset } from 'meta/worlds';

// Maximum number of sprite slots (enemies + hero + flash overlays)
const MAX_ENEMY_SPRITES = 20;

@uiViewModel()
export class GameViewModel extends UiViewModel {
  // DrawingSurface commands (for tiles, particles, etc.)
  drawCommands: string = '';

  // --- Hero sprite properties ---
  heroBodyVisible: boolean = false;
  heroBodyX: number = 0;        // Canvas-space X (left edge)
  heroBodyY: number = 0;        // Canvas-space Y (top edge)
  heroBodyW: number = 48;       // Width in canvas pixels
  heroBodyH: number = 48;       // Height in canvas pixels
  heroBodyScaleX: number = 1;   // Horizontal scale (use -1 for flip)
  heroBodyScaleY: number = 1;   // Vertical scale
  heroBodyRotation: number = 0; // Rotation in degrees
  heroBodyOpacity: number = 1;  // 0-1 opacity
  heroBodyTexture: TextureAsset | null = null;

  // Hero weapon (separate layer)
  heroWeaponVisible: boolean = false;
  heroWeaponX: number = 0;
  heroWeaponY: number = 0;
  heroWeaponW: number = 32;
  heroWeaponH: number = 32;
  heroWeaponScaleX: number = 1;
  heroWeaponScaleY: number = 1;
  heroWeaponRotation: number = 0;
  heroWeaponOpacity: number = 1;
  heroWeaponTexture: TextureAsset | null = null;

  // Hero flash overlay
  heroFlashVisible: boolean = false;
  heroFlashX: number = 0;
  heroFlashY: number = 0;
  heroFlashW: number = 48;
  heroFlashH: number = 48;
  heroFlashScaleX: number = 1;
  heroFlashScaleY: number = 1;
  heroFlashOpacity: number = 0.7;
  heroFlashColor: string = '#FFFFFF';     // Flash fill color
  heroFlashMaskTexture: TextureAsset | null = null;  // Same as body texture

  // --- Enemy sprite properties (pooled) ---
  // For a pool of N enemies, create indexed properties.
  // Each enemy needs: visible, x, y, w, h, scaleX, scaleY, rotation, opacity, texture
  // Plus a flash overlay with: flashVisible, flashX, flashY, flashW, flashH, flashScaleX, flashScaleY, flashOpacity, flashMaskTexture

  // Example for enemy slot 0:
  enemy0Visible: boolean = false;
  enemy0X: number = 0;
  enemy0Y: number = 0;
  enemy0W: number = 32;
  enemy0H: number = 32;
  enemy0ScaleX: number = 1;
  enemy0ScaleY: number = 1;
  enemy0Rotation: number = 0;
  enemy0Opacity: number = 1;
  enemy0Texture: TextureAsset | null = null;

  enemy0FlashVisible: boolean = false;
  enemy0FlashX: number = 0;
  enemy0FlashY: number = 0;
  enemy0FlashW: number = 32;
  enemy0FlashH: number = 32;
  enemy0FlashScaleX: number = 1;
  enemy0FlashScaleY: number = 1;
  enemy0FlashOpacity: number = 0.7;
  enemy0FlashMaskTexture: TextureAsset | null = null;

  // Repeat for enemy1, enemy2, ... enemyN
  // Or use a helper to generate these programmatically
}
```

**⚠️ TextureAsset Binding:** ViewModel properties of type `TextureAsset` can be bound to XAML `ImageBrush.ImageSource`. The XAML binding system handles the conversion automatically.

### Step 2: XAML Layout

Place a `<Canvas>` element between the DrawingSurface and HUD layers. Each sprite is a `<Rectangle>` with transforms and an optional flash overlay rectangle.

```xml
<Grid Background="Black"
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis">

  <Grid.Resources>
    <BooleanToVisibilityConverter x:Key="BoolToVis" />
  </Grid.Resources>

  <Viewbox Stretch="Uniform">
    <Grid Width="390" Height="844">

      <!-- Layer 1: DrawingSurface (tiles, particles, VFX, range ring) -->
      <local:DrawingSurface Width="390" Height="844"
                            Commands="{Binding drawCommands}" />

      <!-- Layer 2: Sprite Canvas (characters rendered as XAML elements) -->
      <Canvas Width="390" Height="844" IsHitTestVisible="False">

        <!-- Enemy 0 - Body -->
        <Rectangle
          Visibility="{Binding enemy0Visible, Converter={StaticResource BoolToVis}}"
          Canvas.Left="{Binding enemy0X}"
          Canvas.Top="{Binding enemy0Y}"
          Width="{Binding enemy0W}"
          Height="{Binding enemy0H}"
          Opacity="{Binding enemy0Opacity}"
          IsHitTestVisible="False"
          RenderTransformOrigin="0.5,1">
          <Rectangle.Fill>
            <ImageBrush ImageSource="{Binding enemy0Texture}" Stretch="Uniform" />
          </Rectangle.Fill>
          <Rectangle.RenderTransform>
            <TransformGroup>
              <ScaleTransform ScaleX="{Binding enemy0ScaleX}"
                              ScaleY="{Binding enemy0ScaleY}" />
              <RotateTransform Angle="{Binding enemy0Rotation}" />
            </TransformGroup>
          </Rectangle.RenderTransform>
        </Rectangle>

        <!-- Enemy 0 - Flash Overlay -->
        <Rectangle
          Visibility="{Binding enemy0FlashVisible, Converter={StaticResource BoolToVis}}"
          Canvas.Left="{Binding enemy0FlashX}"
          Canvas.Top="{Binding enemy0FlashY}"
          Width="{Binding enemy0FlashW}"
          Height="{Binding enemy0FlashH}"
          Opacity="{Binding enemy0FlashOpacity}"
          Fill="White"
          IsHitTestVisible="False"
          RenderTransformOrigin="0.5,1">
          <Rectangle.OpacityMask>
            <ImageBrush ImageSource="{Binding enemy0FlashMaskTexture}" Stretch="Uniform" />
          </Rectangle.OpacityMask>
          <Rectangle.RenderTransform>
            <TransformGroup>
              <ScaleTransform ScaleX="{Binding enemy0FlashScaleX}"
                              ScaleY="{Binding enemy0FlashScaleY}" />
            </TransformGroup>
          </Rectangle.RenderTransform>
        </Rectangle>

        <!-- Repeat for enemy1, enemy2, ... -->

        <!-- Hero Body -->
        <Rectangle
          Visibility="{Binding heroBodyVisible, Converter={StaticResource BoolToVis}}"
          Canvas.Left="{Binding heroBodyX}"
          Canvas.Top="{Binding heroBodyY}"
          Width="{Binding heroBodyW}"
          Height="{Binding heroBodyH}"
          Opacity="{Binding heroBodyOpacity}"
          IsHitTestVisible="False"
          RenderTransformOrigin="0.5,1">
          <Rectangle.Fill>
            <ImageBrush ImageSource="{Binding heroBodyTexture}" Stretch="Uniform" />
          </Rectangle.Fill>
          <Rectangle.RenderTransform>
            <TransformGroup>
              <ScaleTransform ScaleX="{Binding heroBodyScaleX}"
                              ScaleY="{Binding heroBodyScaleY}" />
              <RotateTransform Angle="{Binding heroBodyRotation}" />
            </TransformGroup>
          </Rectangle.RenderTransform>
        </Rectangle>

        <!-- Hero Weapon -->
        <Rectangle
          Visibility="{Binding heroWeaponVisible, Converter={StaticResource BoolToVis}}"
          Canvas.Left="{Binding heroWeaponX}"
          Canvas.Top="{Binding heroWeaponY}"
          Width="{Binding heroWeaponW}"
          Height="{Binding heroWeaponH}"
          Opacity="{Binding heroWeaponOpacity}"
          IsHitTestVisible="False"
          RenderTransformOrigin="0.5,0.5">
          <Rectangle.Fill>
            <ImageBrush ImageSource="{Binding heroWeaponTexture}" Stretch="Uniform" />
          </Rectangle.Fill>
          <Rectangle.RenderTransform>
            <TransformGroup>
              <ScaleTransform ScaleX="{Binding heroWeaponScaleX}"
                              ScaleY="{Binding heroWeaponScaleY}" />
              <RotateTransform Angle="{Binding heroWeaponRotation}" />
            </TransformGroup>
          </Rectangle.RenderTransform>
        </Rectangle>

        <!-- Hero Flash Overlay -->
        <Rectangle
          Visibility="{Binding heroFlashVisible, Converter={StaticResource BoolToVis}}"
          Canvas.Left="{Binding heroFlashX}"
          Canvas.Top="{Binding heroFlashY}"
          Width="{Binding heroFlashW}"
          Height="{Binding heroFlashH}"
          Opacity="{Binding heroFlashOpacity}"
          Fill="White"
          IsHitTestVisible="False"
          RenderTransformOrigin="0.5,1">
          <Rectangle.OpacityMask>
            <ImageBrush ImageSource="{Binding heroFlashMaskTexture}" Stretch="Uniform" />
          </Rectangle.OpacityMask>
          <Rectangle.RenderTransform>
            <TransformGroup>
              <ScaleTransform ScaleX="{Binding heroFlashScaleX}"
                              ScaleY="{Binding heroFlashScaleY}" />
            </TransformGroup>
          </Rectangle.RenderTransform>
        </Rectangle>

      </Canvas>

      <!-- Layer 3: HUD and UI overlays -->
      <!-- ... score, health, menus, etc. ... -->

    </Grid>
  </Viewbox>
</Grid>
```

### Step 3: Updating Sprite Positions from Code

Each frame, compute the screen-space position of every entity and update the ViewModel properties. The game logic operates in world space; you convert to canvas (screen) space when updating the ViewModel.

```typescript
private updateSpritePositions(): void {
  const vm = this.viewModel;

  // Convert hero world position to canvas screen position
  const heroScreen = this.worldToScreen(this.hero.worldX, this.hero.worldY);

  // Account for camera offset, bob animations, hurt recoil, etc.
  const bobOffsetY = this.getHeroBobOffset();
  const recoilOffsetX = this.getHeroRecoilOffset();

  // Body sprite — anchor at base center
  vm.heroBodyX = heroScreen.x - HERO_BODY_W / 2 + recoilOffsetX;
  vm.heroBodyY = heroScreen.y - HERO_BODY_H + bobOffsetY;
  vm.heroBodyW = HERO_BODY_W;
  vm.heroBodyH = HERO_BODY_H;
  vm.heroBodyScaleX = this.hero.facingLeft ? -1 : 1;
  vm.heroBodyScaleY = this.hero.squashScaleY;  // For squash/stretch effects
  vm.heroBodyRotation = this.hero.bodyRotation;
  vm.heroBodyOpacity = this.hero.opacity;
  vm.heroBodyTexture = heroBodyTexture;  // TextureAsset from Assets.ts
  vm.heroBodyVisible = true;

  // Weapon sprite — positioned relative to hand anchor on body
  const handPos = this.getHeroHandPosition(heroScreen);
  vm.heroWeaponX = handPos.x - WEAPON_GRIP_X;
  vm.heroWeaponY = handPos.y - WEAPON_GRIP_Y;
  vm.heroWeaponRotation = this.hero.weaponRotation;  // Attack swing angle
  vm.heroWeaponScaleX = this.hero.facingLeft ? -1 : 1;
  vm.heroWeaponTexture = heroWeaponTexture;
  vm.heroWeaponVisible = true;

  // Flash overlay — mirrors body position exactly
  if (this.hero.flashTimer > 0) {
    vm.heroFlashVisible = true;
    vm.heroFlashX = vm.heroBodyX;
    vm.heroFlashY = vm.heroBodyY;
    vm.heroFlashW = vm.heroBodyW;
    vm.heroFlashH = vm.heroBodyH;
    vm.heroFlashScaleX = vm.heroBodyScaleX;
    vm.heroFlashScaleY = vm.heroBodyScaleY;
    vm.heroFlashOpacity = 0.7;
    vm.heroFlashMaskTexture = heroBodyTexture;  // Same texture as body
  } else {
    vm.heroFlashVisible = false;
  }

  // Update enemy sprites similarly...
  this.updateEnemySprites();
}
```

### Step 4: Flash Effect Colors

The flash overlay rectangle's `Fill` determines the flash color:

- **White flash (enemy hurt):** `Fill="White"` with `Opacity="0.7"`
- **Red flash (hero hurt):** `Fill="#FF3319"` with `Opacity="0.4"`
- **Blue flash (shield):** `Fill="#4090FF"` with `Opacity="0.5"`
- **Any tint:** Change the `Fill` color and `Opacity` as needed

For dynamic flash colors, bind `Fill` to a ViewModel `string` property:

```xml
<Rectangle Fill="{Binding heroFlashColor}" ... >
```

```typescript
vm.heroFlashColor = '#FFFFFF';  // White flash
// or
vm.heroFlashColor = '#FF3319';  // Red flash
```

## Key Design Decisions

### RenderTransformOrigin

- **Body sprites:** Use `RenderTransformOrigin="0.5,1"` (center-bottom). This means scale and rotation pivot from the character's feet — squash compresses downward, rotation tilts from the base.
- **Weapon sprites:** Use `RenderTransformOrigin="0.5,0.5"` or set it to match the grip anchor point. Weapon rotation should pivot from the hand position.
- **Flash overlays:** Must match the body sprite's `RenderTransformOrigin` exactly.

### Facing Direction (Horizontal Flip)

Use `ScaleX = -1` to flip a sprite horizontally. The `RenderTransformOrigin` determines the flip axis:
- With `RenderTransformOrigin="0.5,1"`, `ScaleX=-1` flips around the center-bottom — the feet stay in place.
- You do NOT need separate left-facing sprites.

### Z-Ordering

Elements in XAML render in document order (later elements render on top). Within the Canvas:

1. Enemy body sprites (back to front, sorted by Y position for depth)
2. Enemy weapon sprites
3. Enemy flash overlays
4. Hero body sprite (always above enemies)
5. Hero weapon sprite
6. Hero flash overlay

For proper Y-sorting of enemies, reorder the enemy rectangles in the Canvas each frame by updating which enemy slot maps to which rectangle, or use `Canvas.ZIndex` bindings.

### Performance Considerations

- **Pool size:** Pre-define a fixed number of sprite slots (e.g., 20 enemies). Hide unused slots with `Visibility="Collapsed"`.
- **Don't create/destroy XAML elements at runtime.** Use a fixed pool and show/hide.
- **Minimize property updates:** Only update ViewModel properties that actually changed.
- **Keep DrawingSurface for bulk rendering:** Tiles, particles, and damage numbers are still faster on DrawingSurface.

## Common Pitfalls

### Flash Appears as Rectangle

The flash overlay `<Rectangle>` has no `OpacityMask`, or the mask texture isn't bound correctly. Always set:

```xml
<Rectangle.OpacityMask>
  <ImageBrush ImageSource="{Binding flashMaskTexture}" Stretch="Uniform" />
</Rectangle.OpacityMask>
```

The `flashMaskTexture` must be the same `TextureAsset` as the body sprite.

### Flash Position Doesn't Match Sprite

The flash overlay must use the **exact same** position, size, scale, and rotation as the body sprite. Copy all transform properties from body to flash each frame.

### Sprite Jitters or Lags Behind DrawingSurface Content

XAML property updates happen on a different cycle than DrawingSurface rendering. Update all ViewModel sprite properties in the same `OnWorldUpdateEvent` handler, **before** calling `builder.applyTo()`. This keeps both systems in sync.

### Missing BooleanToVisibilityConverter

Boolean `Visible` bindings fail silently without the converter. Always define it:

```xml
<Grid.Resources>
  <BooleanToVisibilityConverter x:Key="BoolToVis" />
</Grid.Resources>
```

### Premultiply Alpha on Sprite Textures

Sprite textures used with XAML `ImageBrush` still need `premultiplyAlpha: true` in their `.assetmeta` file, same as DrawingSurface sprites. Without it, you'll see fringing around edges.

### TextureAsset Must Use Static String Literals

The `TextureAsset` constructor requires a static string literal. This rule applies regardless of whether the texture is used in DrawingSurface or XAML:

```typescript
// ✅ CORRECT
export const heroBodyTexture = new TextureAsset("@sprites/hero_body.png");

// ❌ WRONG
const path = "@sprites/hero_body.png";
export const heroBodyTexture = new TextureAsset(path);
```

## Summary: When to Use Each Approach

| Rendering Need | Approach | Why |
|---------------|----------|-----|
| Character body + weapon layers | XAML sprites | Native transforms, layering, OpacityMask for flash |
| Color flash/tint on characters | XAML OpacityMask | Pixel-perfect silhouette matching |
| Ground tiles, arena floor | DrawingSurface | Bulk tile rendering, efficient |
| Particles (hit sparks, death, etc.) | DrawingSurface | Many short-lived small objects |
| Damage numbers, floating text | DrawingSurface | Many short-lived text objects |
| Attack range ring, ground indicators | DrawingSurface | Procedural shapes on ground plane |
| Slash VFX, expanding rings | DrawingSurface | Short-lived procedural effects |
| HUD, menus, buttons | Standard XAML UI | Built-in interaction, accessibility |
