import {
  component,
  Component,
  Material,
  MaterialComponent,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  subscribe,
  Vec4,
  type OnWorldUpdateEventPayload,
} from 'meta/worlds';

@component()
export class AnimateSharedMaterial extends Component {
  private sharedMaterial: Material | null = null;
  private timeAccumulator = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    // Get the shared material from the mesh
    this.sharedMaterial = this.entity.getComponent(MaterialComponent)?.getPartMaterials()[0] ?? null;
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(params: OnWorldUpdateEventPayload): void {
    this.timeAccumulator += params.deltaTime;
    if (this.timeAccumulator > 2) return; // log once

    const mc = this.entity.getComponent(MaterialComponent);
    if (!mc) { console.log('[DEBUG] no MaterialComponent'); return; }

    const parts = mc.getPartMaterials();
    console.log('[DEBUG] parts count:', parts.length);

    for (let i = 0; i < parts.length; i++) {
      const mat = parts[i];
      // @ts-ignore
      const matHostReport = mat['nativeMaterial']?.reportAvailableParameters?.()
        // @ts-ignore
        ?? mat['hostObject']?.reportAvailableParameters?.()
        // @ts-ignore
        ?? mat['_native']?.reportAvailableParameters?.();
      console.log(`[DEBUG] mat[${i}] reportAvailableParameters:`, matHostReport);
      //console.log(`[DEBUG] mat[${i}] isInstance:`, mat.isInstance(), 'isDefault:', mat.isDefault());

      // Try setConstantValue directly on MaterialComponent (no bufferName)
      // @ts-ignore — deprecated but potentially functional
      mc.setConstantValue('tintColor', new Vec4(1, 0, 0, 1));
      console.log('[DEBUG] setConstantValue tintColor called on mc');
    }
  }
}
