/**
 * CharacterData_Kasha — Complete character configuration for Kasha.
 * A Siamese Fighting Fish (betta splendens). Loud, competitive, performative.
 * Hides vulnerability behind bravado. Calls Floater "baka."
 * Real name: Aki (revealed in Tier 5).
 */

import type { CharacterConfig, CastData, FishCharacter } from './Types';
import { AffectionTier, ExpressionState, DriftState } from './Types';
import { KASHA_TIER1_CASTS } from './CastDataTier1_Kasha';
import { KASHA_TIER2_CASTS } from './CastDataTier2_Kasha';
import { KASHA_TIER3_CASTS } from './CastDataTier3_Kasha';
import { KASHA_TIER4_CASTS } from './CastDataTier4_Kasha';
import { KASHA_TIER5_CASTS, KASHA_CATCH_SEQUENCE_DATA, KASHA_DRIFT_AWAY_JOURNAL_TEXT } from './CastDataTier5_Kasha';

// === Cast data lookup ===
const KASHA_CASTS_BY_TIER: Record<AffectionTier, CastData[]> = {
  [AffectionTier.Unaware]: KASHA_TIER1_CASTS,
  [AffectionTier.Curious]: KASHA_TIER2_CASTS,
  [AffectionTier.Familiar]: KASHA_TIER3_CASTS,
  [AffectionTier.Trusting]: KASHA_TIER4_CASTS,
  [AffectionTier.Bonded]: KASHA_TIER5_CASTS,
};

// === Character Configuration ===
export const KASHA_CHARACTER: CharacterConfig = {
  id: 'kasha',
  name: 'Kasha',
  species: 'Siamese Fighting Fish (Betta)',
  accentColor: '#D33A2C',

  portraitAssets: {
    neutral: '@sprites/char_veiltail_neutral.png',
  },

  preferredLures: ['red_spinner', 'bone_whistle'],
  dislikedLures: ['gold_teardrop'],

  lakeZones: ['mid', 'far'],

  unlockCondition: () => true, // Available from start

  encounterRate: 1.0,

  arcTiers: 5,

  questName: 'The Championship',
  questHints: [
    {
      tier: AffectionTier.Unaware,
      text: 'She likes being noticed. Things that move and shine catch her eye. Try something bold.',
    },
    {
      tier: AffectionTier.Curious,
      text: "She tests everyone. Pass the test by staying when she tells you to leave. Don't be afraid to push back.",
    },
    {
      tier: AffectionTier.Familiar,
      text: "She's trying to tell you something. Listen when she goes quiet — that's when it matters most.",
    },
    {
      tier: AffectionTier.Trusting,
      text: "She offered herself as a prize. She wants you to see her as a person instead. Don't take what she offers — see what she means.",
    },
    {
      tier: AffectionTier.Bonded,
      text: "She gave you her name. She gave you a name. The championship was never real. You were.",
    },
  ],

  getCastsForTier: (tier: AffectionTier): CastData[] => {
    return KASHA_CASTS_BY_TIER[tier] || KASHA_TIER1_CASTS;
  },

  initialState: (): FishCharacter => ({
    id: 'kasha',
    name: 'Kasha',
    species: 'Siamese Fighting Fish (Betta)',
    accentColor: '#D33A2C',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    tier: AffectionTier.Unaware,
    currentDrift: DriftState.None,
    tierFloor: 0,
  }),

  catchSequenceData: KASHA_CATCH_SEQUENCE_DATA,
  driftAwayJournalText: KASHA_DRIFT_AWAY_JOURNAL_TEXT,

  staticFacts: [
    'A vivid red betta with orange-gold fin tips.',
    'Claims to be the champion of her corner.',
    'Calls Floater "baka" as a term of endearment.',
    'Refers to herself in third person when stressed.',
    'Came from somewhere else. Left because she was second.',
  ],
};
