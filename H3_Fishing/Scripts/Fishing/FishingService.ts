import { Service, service, subscribe, OnServiceReadyEvent } from 'meta/worlds';
import { TIP_X, TIP_Y, BAIT_IDLE_X, BAIT_IDLE_Y } from '../Constants';

/**
 * FishingService — source de vérité pour la pose idle de la canne à pêche.
 *
 * N'importe quel component (FishingLineRenderer, une canne alternative, un debug rig)
 * peut appeler setIdlePose() pour définir où se trouve le tip de la canne et la
 * position de repos du bait. GameManager et BaitController lisent depuis ici.
 *
 * Les constantes de Constants.ts servent de fallback si aucun component ne s'enregistre.
 */
@service()
export class FishingService extends Service {

  private _tipX  = TIP_X;
  private _tipY  = TIP_Y;
  private _idleX = BAIT_IDLE_X;
  private _idleY = BAIT_IDLE_Y;

  get tipX():  number { return this._tipX; }
  get tipY():  number { return this._tipY; }
  get idleX(): number { return this._idleX; }
  get idleY(): number { return this._idleY; }

  @subscribe(OnServiceReadyEvent)
  onReady(): void {}

  /**
   * Appelé au start par le component qui représente la canne active dans la scène.
   * tipX/Y    — position du bout de la canne (point de lancer et d'ancrage du reel).
   * idleX/Y   — position de repos du bait (bait accroché, jeu en attente).
   */
  setIdlePose(tipX: number, tipY: number, idleX: number, idleY: number): void {
    this._tipX  = tipX;
    this._tipY  = tipY;
    this._idleX = idleX;
    this._idleY = idleY;
  }
}
