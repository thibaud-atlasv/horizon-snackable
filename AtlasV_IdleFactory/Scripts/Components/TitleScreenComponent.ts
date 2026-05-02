/**
 * TitleScreenComponent — Controls the title screen overlay.
 *
 * Component Attachment: Scene Entity (TitleScreenUI entity with CustomUiComponent)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Not Networked
 *
 * On start: hides UpgradePanel and PlayerStatsBarUI, shows itself.
 * On "PLAY" click: hides itself, shows UpgradePanel and PlayerStatsBarUI.
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  ExecuteOn,
  NetworkingService,
  CustomUiComponent,
} from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import {
  TitleScreenViewModel,
  titleScreenPlayClickEvent,
} from '../UI/TitleScreenViewModel';

@component()
export class TitleScreenComponent extends Component {
  private viewModel: Maybe<TitleScreenViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private playerStatsBarUi: Maybe<CustomUiComponent> = null;
  private upgradePanelUi: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    console.log('[TitleScreenComponent] Initializing...');

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) {
      console.error('[TitleScreenComponent] CustomUiComponent not found on entity');
      return;
    }

    // Create and bind ViewModel
    this.viewModel = new TitleScreenViewModel();
    this.uiComponent.dataContext = this.viewModel;

    // Find sibling UI entities through parent
    const parent = this.entity.parent;
    if (parent) {
      const statsBarEntities = parent.findChildrenWithName('PlayerStatsBarUI', false);
      if (statsBarEntities.length > 0) {
        this.playerStatsBarUi = statsBarEntities[0].getComponent(CustomUiComponent);
        console.log('[TitleScreenComponent] Found PlayerStatsBarUI');
      } else {
        console.warn('[TitleScreenComponent] PlayerStatsBarUI not found');
      }

      const upgradePanelEntities = parent.findChildrenWithName('UpgradePanel', false);
      if (upgradePanelEntities.length > 0) {
        this.upgradePanelUi = upgradePanelEntities[0].getComponent(CustomUiComponent);
        console.log('[TitleScreenComponent] Found UpgradePanel');
      } else {
        console.warn('[TitleScreenComponent] UpgradePanel not found');
      }
    }

    // Hide game UI while title screen is visible
    if (this.playerStatsBarUi) {
      this.playerStatsBarUi.isVisible = false;
    }
    if (this.upgradePanelUi) {
      this.upgradePanelUi.isVisible = false;
    }

    console.log('[TitleScreenComponent] Initialized — title screen visible, game UI hidden');
  }

  @subscribe(titleScreenPlayClickEvent)
  onPlayClick(): void {
    console.log('[TitleScreenComponent] Play button clicked');

    // Hide title screen
    if (this.uiComponent) {
      this.uiComponent.isVisible = false;
    }

    // Show game UI
    if (this.playerStatsBarUi) {
      this.playerStatsBarUi.isVisible = true;
    }
    if (this.upgradePanelUi) {
      this.upgradePanelUi.isVisible = true;
    }

    console.log('[TitleScreenComponent] Title screen hidden, game UI shown');
  }
}
