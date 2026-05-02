/**
 * CastDataTier3 — Casts 5-7 (Tier 3: The Directive)
 * "She received an instruction. She did not follow it."
 */

import { ActionId } from './Constants';
import type { CastData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const NEREIA_TIER3_CASTS: CastData[] = [
  // === Cast 5: The Directive ===
  {
    id: 'nereia_t3_c5',
    tier: AffectionTier.Familiar,
    name: 'The Directive',
    beats: [
      {
        beatId: 'nereia_t3_c5_b1',
        fishLines: [
          'First contact.',
          '7:14.',
          '...',
          'I was here at 7:08.',
          'It was not calculated.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'I wanted to be here when you arrived.',
              '...',
              'This sentence is new.',
              'I had never formulated it.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'No.',
              '...',
              'But that is closer than previous explanations.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'Yes.',
              '...',
              'It is new.',
              'Waiting.',
              'Before, I calculated.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              'A great deal.',
              'Too much for this morning.',
              '...',
              'Return.',
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
        },
        seen: false,
      },
      {
        beatId: 'nereia_t3_c5_b2',
        fishLines: [
          'I received an instruction last night.',
          '...',
          'It concerns your presence.',
          '...',
          'I did not follow it.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'To leave.',
              '...',
              'I am here.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.nereia.directive_refused'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'No.',
              '...',
              'I am something.',
              'I do not have the word.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.nereia.directive_refused'],
          },
          [ActionId.Drift]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'You do not need to know.',
              '...',
              'You did not ask the right question.',
              'Ask the right question.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              'Yes.',
              '...',
              'That is the right question.',
              'But not now.',
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: {
        dialogue: [
          'Tomorrow.',
          '...',
          'I will be here at 7:08 again.',
          '...',
          'You can be early too.',
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: [
          'Tomorrow.',
          'The directive remains unfollowed.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Satisfied]: {
        dialogue: ['Return.', 'I will be here.'],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: ['The directive is noted.', 'Be careful.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: ['...', 'Perhaps the directive was correct.'],
        icon: EmotionIconType.Shock,
      },
    },
  },

  // === Cast 6: 340 Years ===
  {
    id: 'nereia_t3_c6',
    tier: AffectionTier.Familiar,
    name: '340 Years',
    beats: [
      {
        beatId: 'nereia_t3_c6_b1',
        fishLines: [
          '...',
          'You are on time.',
          'I am early.',
          '...',
          'Six minutes apart.',
          'It was long.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'No.',
              '...',
              'It was good.',
              'The waiting.',
              '...',
              'I had never waited.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'For you.',
              '...',
              'For me it is unusual.',
              'Time is not linear for me.',
              'Six minutes can be very long.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'You.',
              '...',
              'This is the first time I have said it aloud.',
              'I had thought it before.',
              'Often.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.nereia.thought_of_you'],
          },
          [ActionId.Reel]: {
            affectionDelta: -1,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              'No.',
              '...',
              'You do not understand yet.',
              'You will.',
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
        },
        seen: false,
      },
      {
        beatId: 'nereia_t3_c6_b2',
        fishLines: [
          '340 years.',
          '...',
          'I have observed 2847 subjects in this lake.',
          'None remained.',
          '...',
          'None could remain.',
          '...',
          'It was the rule.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'You are the 2848th.',
              '...',
              'You will not remain either.',
              '...',
              'But not for the same reasons.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'You had one before.',
              '...',
              'You have a name now.',
              'In the file.',
              '...',
              'None of the others had a name.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['mood.nereia.gave_name'],
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'It is not you that is different.',
              '...',
              'It is me.',
              'For the first time in 340 years.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.nereia.changed'],
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              'No.',
              '...',
              'I am the one leaving.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['secret.nereia.leaving'],
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: {
        dialogue: [
          'Tomorrow.',
          '...',
          'The file has a name now.',
          'Your name.',
          '...',
          'Return at 7:08.',
        ],
        icon: EmotionIconType.Warmth,
        flagsToSet: ['tier.nereia.4.approaching'],
      },
      [DriftState.Warm]: {
        dialogue: ['Tomorrow.', 'Earlier.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Satisfied]: {
        dialogue: ['Return.', '340 years continue.'],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: ['...', 'The rule applies.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: ['...', 'Subject 2848. File closed.'],
        icon: EmotionIconType.Shock,
      },
    },
  },

  // === Cast 7: The Choice ===
  {
    id: 'nereia_t3_c7',
    tier: AffectionTier.Familiar,
    name: 'The Choice',
    beats: [
      {
        beatId: 'nereia_t3_c7_b1',
        fishLines: [
          '...',
          'Nine minutes.',
          'It is more.',
          'Voluntarily.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'No.',
              '...',
              'I like that you are the one who arrives.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'I will be at 5:45.',
              'You will not win.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'I know.',
              '...',
              'You will.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Because you would be at 5:50.',
              '...',
              'The file confirms it.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
        },
        seen: false,
      },
      {
        beatId: 'nereia_t3_c7_b2',
        fishLines: [
          'I am leaving soon.',
          '...',
          'You already know.',
          'I am confirming.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'Not today.',
              '...',
              'Not tomorrow.',
              '...',
              'Soon.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Yes.',
              '...',
              'It is the only thing I can do.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'No.',
              '...',
              'Where I am going you cannot go.',
              'Where you can go I cannot stay.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.nereia.cannot_go_with'],
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'You do not know what you are asking.',
              '...',
              'But thank you.',
              'It is the first time I have been asked.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['mood.nereia.first_asked_to_stay'],
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: {
        dialogue: [
          'Tomorrow at 7:00.',
          '...',
          'I will be at 6:45.',
          'Be there earlier.',
          '...',
          'Please.',
        ],
        icon: EmotionIconType.Warmth,
        flagsToSet: ['tier.nereia.4.unlocked', 'mood.nereia.said_please'],
      },
      [DriftState.Warm]: {
        dialogue: ['Tomorrow.', '...', 'Earlier.', 'Please.'],
        icon: EmotionIconType.Hesitation,
        flagsToSet: ['mood.nereia.said_please'],
      },
      [DriftState.Satisfied]: {
        dialogue: ['Return.', 'The choice is made.'],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: ['...', 'The choice may change.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: ['...', 'Perhaps the choice was wrong.'],
        icon: EmotionIconType.Shock,
      },
    },
  },
];
