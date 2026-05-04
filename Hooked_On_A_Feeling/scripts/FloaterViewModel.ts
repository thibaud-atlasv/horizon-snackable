import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import { DrawingCommandData } from 'meta/custom_ui';
import { serializable } from 'meta/platform_api';
import type { TextureAsset } from 'meta/worlds';

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
export const onCGViewerDismiss = new UiEvent('onCGViewerDismiss');
export const onCGItemTapped = new UiEvent('onCGItemTapped', FloaterTabSelectedPayload);

// Inventory events
export const onInventoryOpen = new UiEvent('onInventoryOpen');
export const onInventoryClose = new UiEvent('onInventoryClose');
export const onInventoryEquip = new UiEvent('onInventoryEquip', FloaterLureSelectedPayload);

// Character detail events
export const onCharacterDetailOpen = new UiEvent('onCharacterDetailOpen', FloaterTabSelectedPayload);
export const onCharacterDetailClose = new UiEvent('onCharacterDetailClose');

// Reset save events
export const onResetSavePressed = new UiEvent('onResetSavePressed');
export const onResetSaveConfirm = new UiEvent('onResetSaveConfirm');
export const onResetSaveCancel = new UiEvent('onResetSaveCancel');


@uiViewModel()
export class DotViewModel extends UiViewModel {
  color: string = ""
}

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

  // Redesigned HUD: portrait icon + name/mood + progress dots
  hudPortrait?: TextureAsset;
  hudShowNereia: boolean = true;
  hudShowKasha: boolean = false;
  hudNameMoodText: string = '';
  hudNameText: string = '';
  hudMoodText: string = '';
  hudNameColor: string = '#9B7FCC';
  hudMoodColor: string = '#8A9AB0';
  progressDotsText: string = '';

  // Progress dots — dynamic collection bound to ItemsControl
  progressDots: readonly DotViewModel[] = [];

  /** Update progress dots from total and filled counts */
  setProgressDots(total: number, filled: number): void {
    const filledColor = '#9B7FCC';
    const emptyColor = '#3D2E66';
    const dots: DotViewModel[] = [];
    for (let i = 0; i < total; i++) {
      const item = new DotViewModel();
      item.color = i < filled ? filledColor : emptyColor;
      dots.push(item);
    }
    this.progressDots = dots;
  }

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
    onCGViewerDismiss,
    onCGItemTapped,
    onResetSavePressed,
    onResetSaveConfirm,
    onResetSaveCancel,
    onCharacterDetailOpen,
    onCharacterDetailClose,
  };

  // === Journal State ===
  journalVisible: boolean = false;
  journalTab1Visible: boolean = true;
  journalTab2Visible: boolean = false;
  journalTab3Visible: boolean = false;
  journalTab4Visible: boolean = false;
  journalTab5Visible: boolean = false;
  journalPondNotesText: string = '';
  journalLureBoxText: string = '';
  journalKeepsakesText: string = '';
  journalCollectionText: string = '';
  journalCharactersText: string = '';
  journalStatsText: string = '';
  journalBadgesText: string = '';
  journalMetCounter: string = '';

  // === Reset Save Confirmation ===
  resetConfirmVisible: boolean = false;

  // === CG Viewer State ===
  cgViewerVisible: boolean = false;
  cgViewerImagePath: string = 'sprites/nereia_love_end.png';

  // === Character Detail Overlay ===
  charDetailVisible: boolean = false;
  charDetailName: string = '';
  charDetailSpecies: string = '';
  charDetailTierName: string = '';
  charDetailCasts: string = '0';
  charDetailObservations: string = '';
  charDetailQuestName: string = '';
  charDetailQuestHint: string = '';
  charDetailAccentColor: string = '#9B7FCC';
  charDetailPortrait: string = 'sprites/nereia_neutral.png';
  charDetailShowNereia: boolean = false;
  charDetailShowKasha: boolean = false;

  // === Character Cards (Fish tab) ===
  // Nereia card
  nereiaCardVisible: boolean = false;
  nereiaCardName: string = '???';
  nereiaCardSpecies: string = 'Unknown';
  nereiaCardTier: string = '';
  nereiaCardCasts: string = '0';
  nereiaCardUnlocked: boolean = false;
  // Kasha card
  kashaCardVisible: boolean = true;
  kashaCardName: string = '???';
  kashaCardSpecies: string = 'Unknown';
  kashaCardTier: string = '';
  kashaCardCasts: string = '0';
  kashaCardUnlocked: boolean = false;

  // === CG Gallery Cards (Collection tab grid) ===
  // Portrait CGs
  cgPortraitNereiaUnlocked: boolean = false;
  cgPortraitNereiaName: string = '???';
  cgPortraitKashaUnlocked: boolean = false;
  cgPortraitKashaName: string = '???';
  // Ending CGs
  cgEndingNereiaReelUnlocked: boolean = false;
  cgEndingNereiaReelName: string = '???';
  // Collection progress text
  cgCollectionProgress: string = 'Collection (0/3)';

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

  // Action button animation state (driven from game loop)
  actionMenuOpacity: number = 0;
  actionMenuScale: number = 0.8;
  actionMenuTranslateY: number = 30;
  actionWaitBtnOpacity: number = 1;
  actionTwitchBtnOpacity: number = 1;
  actionDriftBtnOpacity: number = 1;
  actionReelBtnOpacity: number = 1;
  actionWaitBtnScale: number = 1;
  actionTwitchBtnScale: number = 1;
  actionDriftBtnScale: number = 1;
  actionReelBtnScale: number = 1;
  actionWaitBtnTranslateY: number = 0;
  actionTwitchBtnTranslateY: number = 0;
  actionDriftBtnTranslateY: number = 0;
  actionReelBtnTranslateY: number = 0;

  // === Idle Button Bar (Bait / Cast / Journal) ===
  idleBarVisible: boolean = false;
  idleBarOpacity: number = 0;
  idleBarTranslateY: number = 40;
  // Per-button animation
  idleBaitBtnOpacity: number = 1;
  idleBaitBtnTranslateY: number = 0;
  idleCastBtnOpacity: number = 1;
  idleCastBtnTranslateY: number = 0;
  idleJournalBtnOpacity: number = 1;
  idleJournalBtnTranslateY: number = 0;
  // Per-button enabled state (disabled during cast sequence)
  idleBaitBtnEnabled: boolean = true;
  idleCastBtnEnabled: boolean = true;
  idleJournalBtnEnabled: boolean = true;

  // === Journal Button (legacy, kept for backward compat) ===
  journalButtonVisible: boolean = false;

  /** Switch journal tab by index (0-4). */
  setJournalTab(tabIndex: number): void {
    this.journalTab1Visible = tabIndex === 0;
    this.journalTab2Visible = tabIndex === 1;
    this.journalTab3Visible = tabIndex === 2;
    this.journalTab4Visible = tabIndex === 3;
    this.journalTab5Visible = tabIndex === 4;
  }

  /** Update equipped lure indicators from display list */
  updateEquippedIndicators(lures: Array<{ id: string; isEquipped: boolean }>): void {
    this.lure1Equipped = lures[0]?.isEquipped ?? false;
    this.lure2Equipped = lures[1]?.isEquipped ?? false;
    this.lure3Equipped = lures[2]?.isEquipped ?? false;
  }
}

export const floaterVM = new FloaterViewModel();
