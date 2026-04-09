import {component, Component, OnEntityStartEvent, subscribe} from 'meta/worlds';

@component()
export class Script extends Component {
  // Use the @property decorator to expose a data type in the Studio property
  // panel.
  // @property()
  // exampleValue: string = 'default';

  // Called when the owning entity of this component is started.
  // All entities in the owning template have been created and it is now safe to
  // make cross entity references or send events.
  @subscribe(OnEntityStartEvent)
  onStart() {
    console.log('onStart');
  }
}
