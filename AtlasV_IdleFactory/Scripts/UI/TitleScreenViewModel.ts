/**
 * TitleScreenViewModel — ViewModel for the title screen UI.
 *
 * Simple ViewModel with a PlayButtonClick UiEvent for the "PLAY" button.
 */
import {
  UiViewModel,
  uiViewModel,
  UiEvent,
  serializable,
} from 'meta/worlds';

@serializable()
export class TitleScreenPlayClickPayload {
  readonly parameter: string = '';
}

export const titleScreenPlayClickEvent = new UiEvent(
  'TitleScreenViewModel-onPlayClick',
  TitleScreenPlayClickPayload,
);

@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  override readonly events = {
    PlayButtonClick: titleScreenPlayClickEvent,
  };
}
