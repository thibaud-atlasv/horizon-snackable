/**
 * AudioSource — Component à placer sur chaque entité porteuse d'un SoundComponent.
 *
 * Rôle : enregistrer automatiquement le SoundComponent de l'entité dans l'AudioManager
 * sous un ID défini dans l'éditeur.
 *
 * Setup dans l'éditeur :
 *   1. Créer une entité (ex. "SFX_PaddleHit").
 *   2. Ajouter un SoundComponent : assigner l'asset audio, autoStart=false, loop=false.
 *   3. Ajouter ce component AudioSource et renseigner soundId = 'sfx_paddle_hit'
 *      (utiliser les constantes de SFX dans AudioManager.ts).
 *
 * Ne rien faire côté serveur.
 */
import {
  Component,
  component,
  NetworkingService,
  OnEntityStartEvent,
  property,
  subscribe,
} from 'meta/worlds';
import { AudioManager } from '../Services/AudioManager';

@component()
export class AudioSource extends Component {

  /** ID correspondant à une clé de SFX dans AudioManager. Assigné dans l'éditeur. */
  @property()
  soundId: string = '';

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.soundId) {
      console.warn('[AudioSource] soundId is empty — asset non enregistré');
      return;
    }
    AudioManager.get().register(this.soundId, this.entity);
  }


}
