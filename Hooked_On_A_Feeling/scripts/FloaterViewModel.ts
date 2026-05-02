import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import { DrawingCommandData } from 'meta/custom_ui';
import { serializable } from 'meta/platform_api';

// === Event Payloads ===
@serializable()
export class FloaterActionSelectedPayload {
  readonly parameter: string = "";
}

@serializable()
export class FloaterTabSelectedPayload {
  readonly parameter: string = "";
}

@serializable()
export class FloaterLureSelectedPayload {
  readonly parameter: string = "";
}

@serializable()
export class FloaterCatchChoicePayload {
  readonly parameter: string = "";
}

// === Events ===
export const onFloaterStartGame = new UiEvent('onFloaterStartGame');
export const onFloaterActionSelected = new UiEvent('onFloaterActionSelected', FloaterActionSelectedPayload);
export const onFloaterNewCast = new UiEvent('onFloaterNewCast');
export const onFloaterSkipBeat = new UiEvent('onFloaterSkipBeat');
export const onFloaterCastStart = new UiEvent('onFloaterCastStart');
export const onFloaterCatchChoice = new UiEvent('onFloaterCatchChoice', FloaterCatchChoicePayload);

// Journal events
export const onJournalOpen = new UiEvent('onJournalOpen');
export const onJournalClose = new UiEvent('onJournalClose');
export const onJournalTabSwitch = new UiEvent('onJournalTabSwitch', FloaterTabSelectedPayload);

// Inventory events
export const onInventoryOpen = new UiEvent('onInventoryOpen');
export const onInventoryClose = new UiEvent('onInventoryClose');
export const onInventoryEquip = new UiEvent('onInventoryEquip', FloaterLureSelectedPayload);

// === ViewModel ===
@uiViewModel()
export class FloaterViewModel extends UiViewModel {
  // DrawingSurface commands
  drawCommands: DrawingCommandData = new DrawingCommandData();

  // UI state
  titleVisible: boolean = true;
  actionMenuVisible: boolean = false;
  hudVisible: boolean = false;
  departureVisible: boolean = false;
  idleVisible: boolean = false;
  skipButtonVisible: boolean = false;
  skipButtonOpacity: number = 0;
  castButtonVisible: boolean = false;

  // Dialogue panel (XAML-based)
  dialogueVisible: boolean = false;
  speakerName: string = '';
  speakerColor: string = '#9B7FCC';
  dialogueText: string = '';
  showContinue: boolean = false;
  tapIndicatorVisible: boolean = false;
  speakerNameVisible: boolean = true;
  dialogueTextAlignment: string = 'Left';
  dialogueTextFontStyle: string = 'Normal';

  // HUD data
  fishNameText: string = '';
  tierText: string = '';
  affectionText: string = '';

  // Affection bar (replaces mood icons)
  affectionBarWidth: number = 0; // 0-200 pixels (mapped from 0-100%)
  emotionName: string = 'Unaware';

  // Tier transition notification
  tierTransitionVisible: boolean = false;
  tierTransitionText: string = '';

  // Departure / idle text
  departureText: string = '';
  idlePromptText: string = 'Tap to Cast again';

  // Catch Sequence
  catchChoiceVisible: boolean = false;
  catchChoiceReleaseLabel: string = 'Release';

  // Ending overlay
  endingVisible: boolean = false;
  endingText: string = '';

  // Events
  override readonly events = {
    onFloaterStartGame,
    onFloaterActionSelected,
    onFloaterNewCast,
    onFloaterSkipBeat,
    onFloaterCastStart,
    onFloaterCatchChoice,
    onJournalOpen,
    onJournalClose,
    onJournalTabSwitch,
    onInventoryOpen,
    onInventoryClose,
    onInventoryEquip,
  };

  // === Journal State ===
  journalVisible: boolean = false;
  journalTab1Visible: boolean = true;
  journalTab2Visible: boolean = false;
  journalTab3Visible: boolean = false;
  journalPondNotesText: string = '';
  journalLureBoxText: string = '';
  journalKeepsakesText: string = '';

  // === Inventory (Tackle Box) State ===
  inventoryVisible: boolean = false;
  inventoryButtonVisible: boolean = false;
  equippedLureName: string = 'None';
  equippedLureDesc: string = '';
  lure1Equipped: boolean = false;
  lure2Equipped: boolean = false;
  lure3Equipped: boolean = false;

  // No-lure warning overlay
  noLureWarningVisible: boolean = false;

  // Action button enable/disable (for silent beat mechanic)
  actionWaitEnabled: boolean = true;
  actionTwitchEnabled: boolean = true;
  actionDriftEnabled: boolean = true;
  actionReelEnabled: boolean = true;

  // === Journal Button ===
  journalButtonVisible: boolean = false;

  /** Switch journal tab by index (0-2). */
  setJournalTab(tabIndex: number): void {
    this.journalTab1Visible = tabIndex === 0;
    this.journalTab2Visible = tabIndex === 1;
    this.journalTab3Visible = tabIndex === 2;
  }

  /** Update equipped lure indicators from display list */
  updateEquippedIndicators(lures: Array<{ id: string; isEquipped: boolean }>): void {
    this.lure1Equipped = lures[0]?.isEquipped ?? false;
    this.lure2Equipped = lures[1]?.isEquipped ?? false;
    this.lure3Equipped = lures[2]?.isEquipped ?? false;
  }
}

export const floaterVM = new FloaterViewModel();
