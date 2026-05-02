/**
 * CharacterData_Nereia — Complete character configuration for Nereia.
 * Contains: metadata, portrait assets, lure preferences, quest hints,
 * tier dialogue references, catch sequence, and initial state factory.
 *
 * To add a new character, copy this file as CharacterData_<Name>.ts,
 * update all fields, and register in CharacterRegistry.ts.
 */

import type { CharacterConfig, CastData, FishCharacter, CatchSequenceData } from './Types';
import { AffectionTier, ExpressionState, DriftState } from './Types';
import { NEREIA_TIER1_CASTS } from './CastDataTier1';
import { NEREIA_TIER2_CASTS } from './CastDataTier2';
import { NEREIA_TIER3_CASTS } from './CastDataTier3';
import { NEREIA_TIER4_CASTS } from './CastDataTier4';
import { NEREIA_TIER5_CASTS, CATCH_SEQUENCE_DATA, DRIFT_AWAY_JOURNAL_TEXT } from './CastDataTier5';

// === Cast data lookup ===
const CASTS_BY_TIER: Record<AffectionTier, CastData[]> = {
  [AffectionTier.Unaware]: NEREIA_TIER1_CASTS,
  [AffectionTier.Curious]: NEREIA_TIER2_CASTS,
  [AffectionTier.Familiar]: NEREIA_TIER3_CASTS,
  [AffectionTier.Trusting]: NEREIA_TIER4_CASTS,
  [AffectionTier.Bonded]: NEREIA_TIER5_CASTS,
};

// === Character Configuration ===
export const NEREIA_CHARACTER: CharacterConfig = {
  id: 'nereia',
  name: 'Nereia',
  species: 'Koi',
  accentColor: '#9B7FCC',

  portraitAssets: {
    neutral: '@sprites/nereia_neutral.png',
    curious: '@sprites/nereia_curious.png',
    warm: '@sprites/nereia_warm.png',
    alarmed: '@sprites/nereia_alarmed.png',
  },

  preferredLures: ['gold_teardrop', 'shell_hook'],
  dislikedLures: ['red_spinner'],

  lakeZones: ['near', 'mid'],

  unlockCondition: () => true, // Always available (starter character)

  encounterRate: 1.0,

  arcTiers: 5,

  questName: 'The Patient Offering',
  questHints: [
    {
      tier: AffectionTier.Unaware,
      text: 'She notices beauty that stays still. Perhaps what you bring matters as much as what you do.',
    },
    {
      tier: AffectionTier.Curious,
      text: 'Gold catches her eye. Patience holds her gaze. Try offering something precious and waiting.',
    },
    {
      tier: AffectionTier.Familiar,
      text: 'Equip the Gold Teardrop. Choose Wait repeatedly. She remembers consistency.',
    },
    {
      tier: AffectionTier.Trusting,
      text: 'Gold Teardrop + Wait three times consecutively in a single Cast. She will show you something new.',
    },
    {
      tier: AffectionTier.Bonded,
      text: 'You know her now. The gold and the patience were never about the fish — they were about proving you could stay.',
    },
  ],

  getCastsForTier: (tier: AffectionTier): CastData[] => {
    return CASTS_BY_TIER[tier] || NEREIA_TIER1_CASTS;
  },

  initialState: (): FishCharacter => ({
    id: 'nereia',
    name: 'Nereia',
    species: 'Koi',
    accentColor: '#9B7FCC',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    tier: AffectionTier.Unaware,
    currentDrift: DriftState.None,
    tierFloor: 0,
  }),

  catchSequenceData: CATCH_SEQUENCE_DATA,
  driftAwayJournalText: DRIFT_AWAY_JOURNAL_TEXT,

  staticFacts: [
    'Ancient resident of the pond.',
    'Ornamental scales that shimmer purple and gold.',
    'Speaks with formal precision.',
  ],
};
