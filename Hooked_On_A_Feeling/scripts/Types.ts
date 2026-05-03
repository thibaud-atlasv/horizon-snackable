import { ActionId } from './Constants';

// === Game States ===
export enum GamePhase {
  Title = 'title',
  LakeIdle = 'lake_idle',
  CastCharging = 'cast_charging',
  RodCasting = 'rod_casting',
  CastFlying = 'cast_flying',
  FloatLanded = 'float_landed',
  FloatBounce = 'float_bounce',
  Approach = 'approach',
  Exchange = 'exchange',
  ActionSelect = 'action_select',
  FishReaction = 'fish_reaction',
  Departure = 'departure',
  Idle = 'idle',
  CatchSequence = 'catch_sequence',
  Ending = 'ending',
  NothingBites = 'nothing_bites',
}

// === Emotion Icon Types ===
export enum EmotionIconType {
  Curiosity = 'curiosity',     // ?
  Surprise = 'surprise',       // !
  Warmth = 'warmth',           // ♥
  Shock = 'shock',             // !!
  Hesitation = 'hesitation',   // …
  Contentment = 'contentment', // ♪
  Sadness = 'sadness',         // 💔
  Boredom = 'boredom',         // 💤
  Delight = 'delight',         // ✦
  None = 'none',               // no icon (dash)
}

// === Floating Emotion Icon (for DrawingSurface rendering) ===
export type EmotionIconAnchor = 'portrait' | 'float';

export interface FloatingEmotionIcon {
  type: EmotionIconType;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  timer: number;
  maxDuration: number;
  anchor: EmotionIconAnchor;
}

// === Catch Choice ===
export enum CatchChoice {
  Reel = 'reel',
  Release = 'release',
}

// === Ending Types ===
export enum EndingType {
  Reel = 'reel',
  Release = 'release',
  DriftAway = 'drift_away',
}

// === Splash Ripple ===
export interface SplashRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

// === Drift States ===
export enum DriftState {
  None = 'none',
  Warm = 'DRIFT_WARM',
  Troubled = 'DRIFT_TROUBLED',
  Wary = 'DRIFT_WARY',
  Charmed = 'DRIFT_CHARMED',
  Scared = 'DRIFT_SCARED',
  Angry = 'DRIFT_ANGRY',
  Satisfied = 'DRIFT_SATISFIED',
  Neutral = 'DRIFT_NEUTRAL',
  Intrigued = 'DRIFT_INTRIGUED',
  Guarded = 'DRIFT_GUARDED',
  Raw = 'DRIFT_RAW',
  Opened = 'DRIFT_OPENED',
  Destabilised = 'DRIFT_DESTABILISED',
}

// === Expression States ===
export enum ExpressionState {
  Neutral = 'EXPR_NEUTRAL',
  Curious = 'EXPR_CURIOUS',
  Warm = 'EXPR_WARM',
  Alarmed = 'EXPR_ALARMED',
}

// === Affection Tiers ===
export enum AffectionTier {
  Unaware = 1,
  Curious = 2,
  Familiar = 3,
  Trusting = 4,
  Bonded = 5,
}

export const TIER_NAMES: Record<AffectionTier, string> = {
  [AffectionTier.Unaware]: 'Unaware',
  [AffectionTier.Curious]: 'Curious',
  [AffectionTier.Familiar]: 'Familiar',
  [AffectionTier.Trusting]: 'Trusting',
  [AffectionTier.Bonded]: 'Bonded',
};

// === Action Effect ===
export interface ActionEffect {
  affectionDelta: number;
  resultExpression: ExpressionState;
  responseLines: string[];
  resultDrift?: DriftState;
  emotionIcon?: EmotionIconType;
  flagsToSet?: string[];
}

// === Beat ===
export interface Beat {
  beatId: string;
  fishLines: string[];
  actionEffects: Record<ActionId, ActionEffect>;
  seen: boolean;
  silentBeat?: boolean;
  silentBeatDurationSec?: number;
}

// === Departure Data ===
export interface DepartureData {
  dialogue: string[];
  icon: EmotionIconType;
  flagsToSet?: string[];
}

// === Cast ===
export interface CastData {
  id: string;
  tier: AffectionTier;
  name: string;
  beats: Beat[];
  departures: Partial<Record<DriftState, DepartureData>>;
}

// === Catch Sequence Data ===
export interface CatchSequenceData {
  silenceDialogue: string[];
  reelEndingDialogue: string[];
  releaseDialogue: string[];
  reelEpitaph: string;
  releaseEpitaph: string;
  releaseChoiceLabel: string;
}

// === Fish Character ===
export interface FishCharacter {
  id: string;
  name: string;
  species: string;
  accentColor: string;
  currentExpression: ExpressionState;
  affection: number;
  tier: AffectionTier;
  currentDrift: DriftState;
  tierFloor: number;
}

// === Cast State ===
export interface CastState {
  fishId: string;
  currentBeatIndex: number;
  totalBeats: number;
  phase: GamePhase;
  currentDialogueLines: string[];
  currentDialogueIndex: number;
  displayedText: string;
  textProgress: number;
  isTextComplete: boolean;
  phaseTimer: number;
}

// === Fish Affection (SYS-01-AFFECTION) ===
export interface FishAffection {
  characterId: string;
  value: number;
  tier: AffectionTier;
  floor: number;
  ceiling: number;
  lastChangeSessionId: string;
  lastChangeDelta: number;
  peakValue: number;
  visibilityMode: string;
}

// === Tier Transition Info ===
export interface TierTransitionInfo {
  characterId: string;
  oldTier: AffectionTier;
  newTier: AffectionTier;
  oldTierName: string;
  newTierName: string;
  isPromotion: boolean;
}

// === Lure Types (SYS-23-GIFTS) ===
export interface LureDefinition {
  id: string;
  name: string;
  description: string;
  attractedFish: string[];
  initialDrift: DriftState;
  driftModifiers: Record<string, DriftState>;
  isGifted: boolean;
  giftedBy?: string;
}

export interface LureReaction {
  lureId: string;
  fishId: string;
  castCount: number;
  lastExpression: ExpressionState;
  positiveActions: number;
  negativeActions: number;
}

// === Journal Types (SYS-05-JOURNAL) ===
export interface JournalFishEntry {
  fishId: string;
  unlocked: boolean;
  species: string;
  knownFacts: string[];
  expressionsSeen: ExpressionState[];
  castsMade: number;
  currentQuestHintTier: number;
}

export interface Keepsake {
  id: string;
  name: string;
  giftedBy: string;
  fishPerspective: string;
  fishermanPerspective: string;
  obtainedOnCast: number;
}

// === Lake Zones ===
export type LakeZone = 'near' | 'mid' | 'far';

// === Quest Requirement Types ===
export type QuestRequirement =
  | { type: 'use_lure'; lureId: string }
  | { type: 'talk_to_fish'; fishId: string }
  | { type: 'talk_to_x_fish'; count: number }
  | { type: 'make_fish_leave'; fishId: string }
  | { type: 'custom'; flagKey: string };

// === Quest Save Data ===
export interface QuestSaveData {
  completedQuests: string[];   // character IDs with completed quests
  fishTalkedTo: string[];      // fish IDs the player has talked to
  fishMadeLeave: string[];     // fish IDs that have departed
  luresUsed: string[];         // lure IDs that have been used in a cast
}

// === Character Configuration (Modular Character System) ===
export interface CharacterPortraitAssets {
  neutral: string;
  curious?: string;
  warm?: string;
  alarmed?: string;
}

export interface CharacterConfig {
  id: string;
  name: string;
  species: string;
  accentColor: string;
  portraitAssets: CharacterPortraitAssets;
  preferredLures: string[];
  dislikedLures: string[];
  lakeZones: LakeZone[];
  questRequirement?: QuestRequirement;
  unlockCondition: (flags: Record<string, boolean | number>) => boolean;
  encounterRate: number;
  arcTiers: number;
  questName: string;
  questHints: { tier: AffectionTier; text: string }[];
  getCastsForTier: (tier: AffectionTier) => CastData[];
  initialState: () => FishCharacter;
  catchSequenceData?: CatchSequenceData;
  driftAwayJournalText?: string;
  staticFacts: string[];
}

// === CG (Computer Graphics) Gallery ===
export interface CGData {
  id: string;
  characterId: string;
  name: string;
  description: string;
  unlockCondition: string;
}

// === Save Data ===
export interface SaveData {
  fish: Record<string, FishSaveData>;
  flags: Record<string, boolean | number>;
  seenBeats: string[];
  castCount: number;
  castIndexWithinTier: number;
  lures?: LureSaveData;
  journal?: JournalSaveData;
  quests?: QuestSaveData;
  perFishCastIndex?: Record<string, number>;
  cgUnlocks?: string[];
}

export interface LureSaveData {
  owned: string[];
  selected?: string;
  equippedLureId: string | null;
  reactions: LureReaction[];
}

export interface JournalSaveData {
  fishEntries: Record<string, JournalFishEntry>;
  keepsakes: Keepsake[];
}

export interface FishSaveData {
  affection: number;
  tier: AffectionTier;
  drift: DriftState;
  tierFloor: number;
  peakValue: number;
  lastChangeSessionId: string;
  lastChangeDelta: number;
  floor: number;
}
