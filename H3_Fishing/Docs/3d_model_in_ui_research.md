# Research: Displaying 3D Models Inside Custom UI in Meta Horizon Studio

## Question
Can you render/display a 3D mesh or model within a XAML UI panel in Meta Horizon Studio? Is there a viewport or 3D preview component available for UI?

## Answer: **No, not directly supported**

Based on the available documentation, **Meta Horizon Studio does not support rendering 3D models directly inside XAML UI panels**. There is no viewport, 3D preview, or render texture component available for the Custom UI system.

---

## What IS Supported in XAML UI

The Custom UI system in MHS uses XAML with a limited set of 2D UI elements:

### Available XAML Elements
- **Canvas** - Container for absolute positioning
- **StackPanel** - Container for vertical/horizontal layout
- **Border** - Decorative border with background and corner radius
- **TextBlock** - Text display with font styling
- **Image** - 2D image display from file paths
- **Button** - Interactive button elements (via UiEvent system)

### What's Missing
- ❌ No 3D viewport control
- ❌ No render texture/RenderTarget support
- ❌ No camera-to-texture rendering
- ❌ No 3D model preview component
- ❌ No WebView or embedded 3D canvas

---

## Alternative Approaches

While you cannot embed 3D models **inside** XAML UI, here are workarounds:

### 1. **Camera-Space 3D Meshes (Overlay Approach)**
Render 3D meshes in camera space to create HUD-like 3D overlays that appear "on top" of the UI:

```typescript
import { Component, component, subscribe, OnEntityStartEvent, 
         MeshComponent, CoordinateSpace, LightingParams, 
         ShadowParams, DiffuseGISource } from 'meta/worlds';

@component()
export class CameraSpace3DOverlay extends Component {
  @subscribe(OnEntityStartEvent)
  onStart() {
    const mesh = this.entity.getComponent(MeshComponent);
    if (mesh === null) return;
    
    // Render in camera space (HUD-like)
    mesh.renderCoordinateSpace = CoordinateSpace.Camera;
    mesh.lightingParams = new LightingParams(DiffuseGISource.Unlit, false, null);
    mesh.shadowParams = new ShadowParams(false);
    mesh.renderOrderOffset = 3; // Render on top
  }
}
```

**Use case:** Display a 3D weapon icon, character preview, or rotating item next to your UI panel
**Limitation:** Not truly "inside" the UI - it's a separate 3D entity positioned in camera space

### 2. **Pre-Rendered Images**
Render 3D models to images externally (Blender, Unity, etc.) and use the `<Image>` XAML element:

```xaml
<Image Source="UI/fish_preview.png" Stretch="uniform" Width="200" Height="200"/>
```

**Use case:** Static item icons, character portraits, equipment previews
**Limitation:** Not dynamic - cannot rotate or animate the 3D model in real-time

### 3. **World-Space 3D Display + UI Overlay**
Place a 3D model in world space and position your XAML UI panel nearby:

- Spawn a 3D entity at a fixed world position
- Show XAML UI panel that appears to "frame" the 3D object
- Use `renderOrderOffset` to control layering

**Use case:** Character customization screen, item inspection, museum-style displays
**Limitation:** Requires careful positioning; 3D object is in world space, not truly embedded

### 4. **Dynamic Mesh Swapping**
If you need to show different 3D models, use runtime mesh swapping with camera-space rendering:

```typescript
@component()
export class DynamicModelDisplay extends Component {
  @property() private modelA: Maybe<MeshAsset> = null;
  @property() private modelB: Maybe<MeshAsset> = null;

  public switchModel(modelName: string): void {
    const mesh = this.entity.getComponent(MeshComponent);
    if (mesh === null) return;
    
    mesh.mesh = (modelName === 'A') ? this.modelA : this.modelB;
  }
}
```

**Use case:** Inventory UI showing different items, character equipment preview
**Limitation:** Still requires camera-space positioning, not embedded in XAML

---

## Technical Explanation

### Why This Limitation Exists

1. **XAML is 2D-Only**: The Custom UI system uses a subset of WPF/Silverlight XAML, which is fundamentally a 2D rendering system
2. **No Render Texture API**: MHS does not expose a RenderTexture or RenderTarget API that would allow rendering a 3D scene to a texture that could be displayed in UI
3. **Separate Rendering Pipelines**: 3D mesh rendering (via `MeshComponent`) and UI rendering (via `CustomUiComponent`) are separate systems with no bridge between them

### What Would Be Needed (Not Currently Available)

To truly embed 3D models in UI, MHS would need:
- A `RenderTexture` or `RenderTarget` component
- A XAML `<Viewport3D>` or `<ModelViewer>` control
- An API to render a camera's view to a texture
- A way to bind that texture to a XAML `<Image>` element

None of these exist in the current MHS API.

---

## Recommendation

**For the H3_Fishing project specifically:**

If you want to show a 3D fish preview in the catch display UI:

1. **Best approach**: Use pre-rendered fish images in the XAML UI
   - Export fish models as PNG images from Blender/Unity
   - Display via `<Image Source="UI/fish_angelfish.png"/>`
   - Fast, reliable, works perfectly with the existing `CatchDisplayViewModel`

2. **Alternative**: Camera-space 3D fish overlay
   - Spawn a 3D fish entity in camera space when catch screen appears
   - Position it next to the XAML UI panel
   - Rotate it slowly for visual interest
   - Destroy it when the catch screen closes

The pre-rendered image approach is simpler and more performant for this use case.

---

## Summary

- ❌ **Cannot** render 3D models inside XAML UI panels
- ✅ **Can** use camera-space 3D meshes as overlays near UI
- ✅ **Can** use pre-rendered images of 3D models in UI
- ✅ **Can** position world-space 3D objects near UI panels

For most use cases requiring "3D in UI", pre-rendered images or camera-space overlays are the recommended solutions.
