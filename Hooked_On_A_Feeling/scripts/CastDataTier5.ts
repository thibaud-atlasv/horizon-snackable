/**
 * CastDataTier5 — Cast 10 (Tier 5: The Departure) + Catch Sequence + Ending Data
 * "She is leaving today. The lake is ready to forget her. Floater remembers."
 */

import { ActionId } from './Constants';
import type { CastData, CatchSequenceData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const NEREIA_TIER5_CASTS: CastData[] = [
  // === Cast 10: The Last Morning ===
  {
    id: 'nereia_t5_c10',
    tier: AffectionTier.Bonded,
    name: 'The Last Morning',
    beats: [
      {
        beatId: 'nereia_t5_c10_b1',
        fishLines: [
          'First contact.',
          '5:00.',
          '...',
          'Today is the last entry in the file.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'Yes.',
              '...',
              'I told you it would be early.',
              'I am keeping my word.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'I said tomorrow.',
              '...',
              'It is now tomorrow.',
              'I was honest.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'I know.',
              '...',
              'I gave you all the time I had.',
              'I gave you 340 years of time.',
              'It will have to be enough.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'I know.',
              '...',
              'Yes.',
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
        },
        seen: false,
      },
      {
        beatId: 'nereia_t5_c10_b2',
        fishLines: [
          'I have one last entry.',
          'It will not be filed.',
          'It is for you.',
          '...',
          'First contact.',
          '7:14.',
          'The file was correct about everything.',
          'Except the conclusion.',
          '...',
          'The file said you were a subject.',
          '...',
          'I no longer have a word for what you are.',
          '...',
          'I do not need one.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
        },
        seen: false,
      },
    ],
    departures: {
      // Departures not used for Cast 10 — goes straight to Catch Sequence
      [DriftState.Charmed]: {
        dialogue: ['...'],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: ['...'],
        icon: EmotionIconType.Hesitation,
      },
    },
  },
];

// === Catch Sequence Data ===
export const CATCH_SEQUENCE_DATA: CatchSequenceData = {
  silenceDialogue: [
    '...',
    'I left you data.',
    'November 14th.',
    'Four minutes.',
    'You will know what to do.',
  ],
  reelEndingDialogue: [
    // Shown during REEL ending sequence
    'The data ends here.',
    '',
    'The lake remembers.',
    '',
    'She had said it would be enough.',
  ],
  releaseDialogue: [
    // Nereia speaks before fade
    '...',
    'You did not reel.',
    '...',
    'I am noting.',
    '...',
    'It is in the file.',
    'The file I am no longer sending.',
  ],
  reelEpitaph: 'The data ends here.\n\nThe lake remembers.\n\nShe had said it would be enough.',
  releaseEpitaph: 'The file is closed.\n\nThe lake remembers.\n\nYou will remember.\n\nIt is more than enough.',
  releaseChoiceLabel: 'Nereia',
};

// === Drift-Away Ending Data ===
export const DRIFT_AWAY_JOURNAL_TEXT =
  'She was not there.\n\nThe file was closed.\n\n7:14. The surface was empty.\n\nThe deviation was zero centimetres.';
