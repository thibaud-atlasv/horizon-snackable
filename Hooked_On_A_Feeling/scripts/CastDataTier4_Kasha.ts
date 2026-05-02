/**
 * CastDataTier4_Kasha — Casts 8-9 (Tier 4: The Trophy)
 * Cast 8: The Offer (2 beats). Cast 9: The Trophy Refused (2 beats).
 */

import { ActionId } from './Constants';
import type { CastData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const KASHA_TIER4_CASTS: CastData[] = [
  // === Cast 8: The Offer ===
  {
    id: 'kasha_t4_c8',
    tier: AffectionTier.Trusting,
    name: 'The Offer',
    beats: [
      {
        beatId: 'kasha_t4_c8_b1',
        fishLines: [
          'Okay.',
          'Listen.',
          "I've been thinking.",
          "Don't comment on that. I do think. Sometimes.",
          '...',
          'I want to offer you something.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Me.',
              '...',
              "I'm offering you me.",
              '...',
              "Don't make that face. Hear me out.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.kasha.offering_self'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Fine. Fine.',
              "I'm offering me. As a— prize. Or something.",
              "Don't make that face.",
              "I knew you'd make a face.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Stop being patient at me.',
              "It's working and I hate it.",
              '...',
              "I want to offer you me. As — yeah. As something.",
              "I haven't worked out what.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              "I'm offering myself.",
              'To you.',
              '...',
              "Don't say anything yet.",
              'I am not done explaining.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
        },
        seen: false,
      },
      {
        beatId: 'kasha_t4_c8_b2',
        fishLines: [
          'Here is the thing.',
          "I've been the champion of this corner because nobody has ever bothered to take it from me.",
          'I told you that already.',
          "I'm telling you again because it matters for what I'm about to say.",
          '...',
          'If you wanted to. You could take it.',
          "I'm telling you that you could.",
          "I'm — I'm saying.",
          'I would let you.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 4,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              "I knew you'd do that.",
              'Just sit there. Quietly. Like she would.',
              '...',
              'I hate that you understood what I meant.',
              '...',
              'Thank you.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.offer_understood'],
          },
          [ActionId.Twitch]: {
            affectionDelta: -1,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              'Wow.',
              'Wow, baka.',
              'You took me literally.',
              '...',
              "You — actually, fine. That's on me. I framed it badly.",
              "Move on. We're moving on.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['mood.kasha.framing_failed'],
          },
          [ActionId.Drift]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'I know.',
              '...',
              'I wanted to.',
              '...',
              "It's the first time I've wanted to give somebody something.",
              "Don't make me explain it more than that.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.first_gift'],
          },
          [ActionId.Reel]: {
            affectionDelta: 4,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              '...',
              'Oh.',
              '...',
              "That's — okay.",
              "That's a lot.",
              '...',
              'Say it again. Slower.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.want_you_received'],
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
          'Same time. Same corner.',
          "I'll be — I'll be here.",
          'Be on time, baka.',
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Opened]: {
        dialogue: [
          'Tomorrow.',
          '...',
          'I need to think about today.',
          "Don't worry. It was good thinking.",
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          'Mm.',
          'Tomorrow, I guess.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          "I shouldn't have offered.",
          'Forget I did.',
        ],
        icon: EmotionIconType.Hesitation,
        flagsToSet: ['mood.kasha.offer_retracted'],
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
          'I made a mistake.',
          "Don't come back tomorrow.",
        ],
        icon: EmotionIconType.Shock,
        flagsToSet: ['mood.kasha.shame_deep'],
      },
    },
  },

  // === Cast 9: The Trophy Refused ===
  {
    id: 'kasha_t4_c9',
    tier: AffectionTier.Trusting,
    name: 'The Trophy Refused',
    beats: [
      {
        beatId: 'kasha_t4_c9_b1',
        fishLines: [
          'Hey.',
          '...',
          "I'm going to do something today.",
          "I'm going to be quiet.",
          'Just for a minute.',
          "Don't panic. I'll be loud again. I just want to try it.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 4,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Thank you.',
              '...',
              'I think I want to keep being quiet for a while.',
              'Sit with me.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.shared_silence'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              'Yeah.',
              'I am.',
              '...',
              "It's okay. I'll be normal again in a second.",
              "Just — don't make it harder.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Stop.',
              '...',
              "Stop being good at this. It's annoying.",
              '...',
              "Don't stop.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              '...',
              'You said that to me on the first day.',
              'I almost left.',
              '...',
              "I'm glad I didn't.",
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.callback_first_day'],
          },
        },
        seen: false,
      },
      {
        beatId: 'kasha_t4_c9_b2',
        fishLines: [
          'Here is a fact.',
          'When I came here.',
          'I came here because somewhere else, I was second.',
          '...',
          'I was second to a memory.',
          "Of someone who wasn't there anymore.",
          "And I couldn't compete with a memory because memories don't have flaws.",
          "I could only ever be a worse version of someone who wasn't there.",
          '...',
          'So I left.',
          'I came here. And I made up a championship I could win.',
          'Because here, there was nobody to be second to.',
          '...',
          'Until you showed up.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 5,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              '...',
              'Yeah.',
              "I knew you wouldn't say anything.",
              "That's why I told you.",
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['secret.kasha.told_the_truth'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              'Pff.',
              'Yeah.',
              'I know.',
              '...',
              "Don't make me say more.",
              "I'm done for today.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 4,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'I know.',
              '...',
              'I knew before you said it.',
              'But — yeah.',
              "It's still nice to hear.",
              '...',
              'Thank you, baka.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.thanked_softly'],
          },
          [ActionId.Reel]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              "Don't say 'here' like that.",
              "Like there's a 'here' and an 'elsewhere.'",
              '...',
              "Just say I'm not second.",
              'Say it without the qualifier.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['mood.kasha.no_qualifier'],
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: {
        dialogue: [
          '...',
          'Tomorrow.',
          'I want to tell you my real name.',
          'Not tonight. Tomorrow.',
          'Be on time.',
          'Baka.',
        ],
        icon: EmotionIconType.Warmth,
        flagsToSet: ['tier.kasha.5.approaching', 'secret.kasha.real_name_intent'],
      },
      [DriftState.Opened]: {
        dialogue: [
          '...',
          'Tomorrow.',
          'I have one more thing I want to say.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          'Mm.',
          'Tomorrow. Maybe.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          'I told you too much.',
          'Again.',
          'I keep doing that with you.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
          "I think I'm going to leave.",
          'Not tomorrow. Soon.',
          '...',
          "I told someone the truth and they didn't know what to do with it.",
        ],
        icon: EmotionIconType.Shock,
      },
    },
  },
];
