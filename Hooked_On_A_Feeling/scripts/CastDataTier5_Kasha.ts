/**
 * CastDataTier5_Kasha — Cast 10 (Tier 5: The Name) + Catch Sequence + Endings
 * She gives him her real name: Aki. She gives him a name: Hikaru.
 * The catch choice is "Reel" or "Aki" — her real name IS the release.
 */

import { ActionId } from './Constants';
import type { CastData, CatchSequenceData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const KASHA_TIER5_CASTS: CastData[] = [
  // === Cast 10: The Name ===
  {
    id: 'kasha_t5_c10',
    tier: AffectionTier.Bonded,
    name: 'The Name',
    beats: [
      // --- Beat 1: The real name ---
      {
        beatId: 'kasha_t5_c10_b1',
        fishLines: [
          'Okay.',
          "I've been thinking about this all day.",
          "Don't comment on that.",
          "I'm going to say a thing. And then another thing. And then a third thing.",
          "Don't interrupt me. Please.",
          "...Yeah, I said please. We are past that, you and I.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 5,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Good.',
              'Thank you.',
              '...',
              'First thing.',
              'My name is not Kasha.',
              '...',
              'Kasha is a thing I called myself when I came here.',
              "It means 'fire-cart.' I thought it sounded fierce.",
              "It does sound fierce. But it isn't my name.",
              '...',
              'My name is Aki.',
              "It just means 'autumn.'",
              'I have always thought it was too soft.',
              '...',
              'I am telling it to you anyway.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['secret.kasha.real_name_given'],
          },
          [ActionId.Twitch]: {
            affectionDelta: -2,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              '...',
              "Don't do that to me. Not today.",
              '...',
              'Fine. Skipping.',
              "I'm Aki.",
              "That's the first thing.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['mood.kasha.real_name_rushed'],
          },
          [ActionId.Drift]: {
            affectionDelta: 5,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'I will.',
              'Thank you.',
              '...',
              'First thing.',
              'My name is Aki.',
              'Kasha is a thing I called myself.',
              'Aki is what I was first.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['secret.kasha.real_name_given'],
          },
          [ActionId.Reel]: {
            affectionDelta: 5,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Aki.',
              "That's my name.",
              '...',
              "Don't say it back yet.",
              "Wait till I'm done.",
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['secret.kasha.real_name_given'],
          },
        },
        seen: false,
      },
      // --- Beat 2: The name she gives him ---
      {
        beatId: 'kasha_t5_c10_b2',
        fishLines: [
          'Second thing.',
          "I've been calling you 'baka' since the first day.",
          'I never picked a real name for you.',
          '...',
          "I'm going to.",
          '...',
          "I'm going to call you Hikaru.",
          "It means 'light.'",
          "Don't say anything yet.",
          "I picked it because the first time I ever caught myself smiling about you, you weren't there.",
          'It was morning.',
          'Light through the leaves.',
          'I thought of you.',
          '...',
          'That is the most embarrassing thing I have ever said.',
          'We are not going to talk about it.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 4,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Thank you for not saying anything.',
              '...',
              'Hikaru.',
              "I'm going to use that now.",
              'Get used to it.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.named_him'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              "DON'T.",
              "Don't make fun of it.",
              "I picked it. It's mine. It's yours. Don't make it weird.",
              '...',
              "Ugh. Now I'm second-guessing it.",
              'Too late. Decision made. You are Hikaru.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 4,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              '...',
              "Don't say my name back yet.",
              'Just — Hikaru. Yes. That.',
              'Good.',
            ],
            emotionIcon: EmotionIconType.Warmth,
          },
          [ActionId.Reel]: {
            affectionDelta: 4,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Yes.',
              '...',
              'Yes you will.',
            ],
            emotionIcon: EmotionIconType.Warmth,
          },
        },
        seen: false,
      },
      // --- Beat 3: The quiet admission (triggers catch sequence) ---
      {
        beatId: 'kasha_t5_c10_b3',
        fishLines: [
          'Third thing.',
          '...',
          'I never wanted to be the champion of this corner.',
          "I wanted to be somebody's favourite person.",
          '...',
          'I am yours.',
          "Aren't I.",
          '...',
          "Don't answer.",
          'I know.',
        ],
        actionEffects: {
          // Beat 3 triggers catch sequence after all lines are shown.
          // Actions here are structural — the real choice happens in the catch menu.
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: ['...'],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['kasha.catch_available'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: ['...'],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['kasha.catch_available'],
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: ['...'],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['kasha.catch_available'],
          },
          [ActionId.Reel]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: ['...'],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['kasha.catch_available'],
          },
        },
        seen: false,
      },
    ],
    departures: {
      // Cast 10 goes straight to Catch Sequence — departures are structural only
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
export const KASHA_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  silenceDialogue: [
    '...',
    'Whatever you choose.',
    'I picked you.',
    "Don't forget that.",
    'Hikaru.',
  ],
  reelEndingDialogue: [
    'She wanted to be chosen.',
    '',
    'Chosen is not the same as taken.',
    '',
    'She had told you the difference.',
  ],
  releaseDialogue: [
    '...',
    'Hah.',
    '...',
    'Took you long enough.',
    'Baka.',
    '...',
    'Hikaru.',
  ],
  reelEpitaph: 'She wanted to be chosen.\n\nChosen is not the same as taken.\n\nShe had told you the difference.',
  releaseEpitaph: 'She wanted to be a person.\n\nNot a prize.\n\nYou let her be the person she was.\n\nShe comes back tomorrow.\n\nShe will keep coming back.',
  releaseChoiceLabel: 'Aki',
};

// === Drift-Away Ending Data ===
export const KASHA_DRIFT_AWAY_JOURNAL_TEXT =
  'The corner is empty.\n\nOther voices, briefly, mention that she talked about you a lot.\n\nThey are surprised that you are not surprised.';
