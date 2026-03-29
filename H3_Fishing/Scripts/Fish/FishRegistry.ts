import { Service, service, subscribe } from 'meta/worlds';
import type { IFishInstance } from '../Types';
import { Events } from '../Types';

/**
 * FishRegistry — registre des instances vivantes dans le monde.
 *
 * Responsabilité unique : suivre les poissons actuellement dans le pool
 * (position, taille) pour la détection de collision et le cycle de vie.
 * Les définitions statiques (rareté, template, couleurs) vivent dans FishDefs.ts.
 */
@service()
export class FishRegistry extends Service {

  private _instances = new Map<number, IFishInstance>();

  addFish(inst: IFishInstance): void {
    this._instances.set(inst.fishId, inst);
  }

  getInstance(fishId: number): IFishInstance | undefined {
    return this._instances.get(fishId);
  }

  destroyFish(fishId: number): void {
    this._instances.delete(fishId);
  }

  get activeCount(): number {
    return this._instances.size;
  }

  /** Bait collision check — returns first fish hit or null. */
  findHit(bx: number, by: number): IFishInstance | null {
    for (const inst of this._instances.values()) {
      const dx = bx - inst.worldX;
      const dy = by - inst.worldY;
      if (Math.sqrt(dx * dx + dy * dy) < 0.6 * inst.size) return inst;
    }
    return null;
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    this._instances.clear();
  }
}
