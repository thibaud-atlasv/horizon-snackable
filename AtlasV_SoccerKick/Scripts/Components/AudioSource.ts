import { Component, OnEntityStartEvent, NetworkingService, component, property, subscribe, type Maybe } from 'meta/worlds';
import { AudioManager } from '../Services/AudioManager';

/**
 * Attach to any scene entity that has a SoundComponent.
 * Set soundId to one of the SFX constants from AudioManager.
 */
@component()
export class AudioSource extends Component {

  @property() soundId: Maybe<string> = null;

  private _networkingService = NetworkingService.get();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._networkingService.isServerContext()) return;
    AudioManager.get().register(this.soundId ?? this.entity.name, this.entity);
  }
}
