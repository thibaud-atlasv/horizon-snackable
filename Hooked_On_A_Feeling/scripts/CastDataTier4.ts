/**
 * CastDataTier4 — Casts 8-9 (Tier 4: The Inheritance)
 * "She is leaving. She decides what to leave behind."
 */

import { ActionId } from './Constants';
import type { CastData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const NEREIA_TIER4_CASTS: CastData[] = [
  // === Cast 8: What Must Be Known ===
  {
    id: 'nereia_t4_c8',
    tier: AffectionTier.Trusting,
    name: 'What Must Be Known',
    beats: [
      {
        beatId: 'nereia_t4_c8_b1',
        fishLines: [
          'First contact.',
          '7:00.',
          '...',
          'You are 15 minutes early.',
          'I am 30.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'Yes.',
              '...',
              'Be here at 6:35.',
              'Not before.',
              'I want to see you arrive.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'That would be acceptable.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'I know.',
              '...',
              'So am I.',
              'I just learned this.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.nereia.first_admitted'],
          },
          [ActionId.Reel]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Not yet.',
              '...',
              'Not before you know everything.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
        },
        seen: false,
      },
      {
        beatId: 'nereia_t4_c8_b2',
        fishLines: [
          'November 14th.',
          'At 7:14 exactly.',
          'The lake stops.',
          'For 4 minutes.',
          '...',
          'No current. No movement.',
          'As if the lake were breathing.',
          '...',
          'I have observed it 340 times.',
          'You will be the only one to know why.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'The lake remembers.',
              '...',
              'It will remember me.',
              'November 14th is when I arrived.',
              '340 years ago.',
              '...',
              'The lake breathes at my arrival.',
              'It will continue to breathe after I leave.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.nereia.november_14'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'So that someone will know.',
              '...',
              'When I am gone no one will know.',
              'Except you.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.nereia.november_14', 'secret.nereia.legacy'],
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'I know.',
              '...',
              'The file confirms it.',
              '...',
              'But I wanted to hear you say it.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.nereia.november_14', 'secret.nereia.legacy'],
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              'I will not be here.',
              'That is why I am giving it to you.',
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
          '6:35.',
          '...',
          'I have other things to give you.',
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: ['Tomorrow.', 'The inheritance continues.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Satisfied]: {
        dialogue: ['Return.', 'There is more.'],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: ['...', 'The data waits.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: ['...', 'The inheritance is revoked.'],
        icon: EmotionIconType.Shock,
      },
    },
  },

  // === Cast 9: What She Wanted To Say ===
  {
    id: 'nereia_t4_c9',
    tier: AffectionTier.Trusting,
    name: 'What She Wanted To Say',
    beats: [
      {
        beatId: 'nereia_t4_c9_b1',
        fishLines: [
          '...',
          'Five minutes of silence.',
          'It was the calculation.',
          '...',
          'The silence was part of the gift.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'No.',
              '...',
              'Thank you.',
              'For having understood.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Once is enough.',
              'You will remember it always.',
              '...',
              'It is in the file.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'You will speak.',
              '...',
              'Soon.',
              'I will let you speak.',
              'That is also a gift.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'For me.',
              'For the file.',
              '...',
              'I needed five minutes.',
              'Of you. Silent. Beside me.',
              'Without explanation.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
        },
        seen: false,
      },
      {
        beatId: 'nereia_t4_c9_b2',
        fishLines: [
          'I have one last thing to give you.',
          '...',
          'It is not in the file.',
          'It will not be in the file.',
          '...',
          'In 340 years of data.',
          '2847 subjects observed.',
          'I have never wanted to stay.',
          '...',
          'Until now.',
          '...',
          'That is the data.',
          'That is what I am giving you.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'You said nothing.',
              '...',
              'It is the only correct response.',
              '...',
              'I will remember that you said nothing.',
              'It will be the last thing I take with me.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.nereia.final_approach', 'mood.nereia.last_silence'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'I cannot.',
              '...',
              'If I could I would have done so by now.',
              '...',
              'But I will note that you asked.',
              'Always.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'I know.',
              '...',
              'It is the most precise data I have.',
              'I will take it with me.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.nereia.final_approach'],
          },
          [ActionId.Reel]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'If I could.',
              'If there were any version of this.',
              'Where I could.',
              '...',
              'I would.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['mood.nereia.would_have'],
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
          'I do not know the time.',
          'It will be early.',
          '...',
          'Be there.',
        ],
        icon: EmotionIconType.Warmth,
        flagsToSet: ['tier.nereia.5.unlocked', 'nereia.catch_available'],
      },
      [DriftState.Warm]: {
        dialogue: ['Tomorrow.', '...', 'Early.', 'Be there.'],
        icon: EmotionIconType.Hesitation,
        flagsToSet: ['tier.nereia.5.unlocked', 'nereia.catch_available'],
      },
      [DriftState.Satisfied]: {
        dialogue: ['Return.', 'One more time.'],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: ['...', 'Return.', 'If you wish.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: ['...', 'The last entry is deleted.'],
        icon: EmotionIconType.Shock,
      },
    },
  },
];
