/**
 * CastDataTier3_Kasha — Casts 5-7 (Tier 3: The Slip)
 * Cast 5: The Thing About Before (2 beats).
 * Cast 6: The Day After (2 beats).
 * Cast 7: The Question She Asks (2 beats).
 */

import { ActionId } from './Constants';
import type { CastData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const KASHA_TIER3_CASTS: CastData[] = [
  // === Cast 5: The Thing About Before ===
  {
    id: 'kasha_t3_c5',
    tier: AffectionTier.Familiar,
    name: 'The Thing About Before',
    beats: [
      {
        beatId: 'kasha_t3_c5_b1',
        fishLines: [
          'Okay. So.',
          'There was this time— no.',
          'Forget that. There was a— no, also bad.',
          '...',
          'Why is this hard.',
          "It shouldn't be hard. It's a story.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              "Don't say that.",
              'When people say that I take longer.',
              '...',
              'Thank you.',
              "...Don't react to that.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.first_thank_you'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Hah. Bossy.',
              'Fine.',
              'Story one. Once. Before.',
              'There was somebody who was better at me at everything I did.',
              'End of story.',
              '...',
              "Wait. That's a bad story. Forget that one too.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.kasha.somebody_better'],
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'I want to.',
              '...',
              "I want to and I don't want to.",
              "Stop being kind. It's making it worse.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.wants_to_tell'],
          },
          [ActionId.Reel]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'I came from somewhere else.',
              'Before here.',
              'I left it.',
              'The end.',
              "...Don't ask follow-up questions, baka.",
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['secret.kasha.came_from_elsewhere'],
          },
        },
        seen: false,
      },
      {
        beatId: 'kasha_t3_c5_b2',
        fishLines: [
          'There was a person.',
          "I'm not going to say who.",
          'And there was another person, and the second person liked the first person more than they liked me.',
          "It wasn't a fair fight.",
          '...',
          "It wasn't a fight at all, actually.",
          'I just lost. Without playing.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Yeah.',
              '...',
              "That's how I felt about it too.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.silence_understood'],
          },
          [ActionId.Twitch]: {
            affectionDelta: -2,
            resultExpression: ExpressionState.Alarmed,
            responseLines: [
              '...',
              'Wow.',
              "Tell me how it works, then.",
              'Since you know.',
              '...',
              "Tch. Forget it. I shouldn't have said anything.",
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['mood.kasha.shut_down'],
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Yeah.',
              '...',
              'Yeah, it did.',
              "Don't make me say more about it.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.acknowledged_hurt'],
          },
          [ActionId.Reel]: {
            affectionDelta: -1,
            resultExpression: ExpressionState.Alarmed,
            responseLines: [
              '...',
              "Don't.",
              "Don't do that.",
              "Don't compare me to them. Don't measure me against them.",
              "That's the whole — that's exactly the —",
              'Forget it.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['mood.kasha.do_not_measure'],
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Opened]: {
        dialogue: [
          '...',
          'Tomorrow.',
          "Don't bring it up.",
          '...',
          "Don't not bring it up either.",
          "Just — be normal. Be a baka. The way you usually are.",
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Raw]: {
        dialogue: [
          '...',
          'Tomorrow.',
          "I'll be here.",
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          '...',
          'Whatever.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          'I told you too much.',
          "I'm not doing that again.",
        ],
        icon: EmotionIconType.Surprise,
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
          "Don't come back.",
          'I mean it this time.',
        ],
        icon: EmotionIconType.Shock,
        flagsToSet: ['mood.kasha.shame_spiral'],
      },
    },
  },

  // === Cast 6: The Day After ===
  {
    id: 'kasha_t3_c6',
    tier: AffectionTier.Familiar,
    name: 'The Day After',
    beats: [
      {
        beatId: 'kasha_t3_c6_b1',
        fishLines: [
          'Hey.',
          '...',
          "Don't say anything.",
          'About yesterday.',
          "I'm pretending I didn't say it.",
          'Help me pretend.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Thank you.',
              '...',
              "I said it again. I'm doing it more now. Stop me.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.thank_you_recurring'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Tch.',
              "You're cruel.",
              '...',
              'Fine. It happened.',
              'But we are not doing that again. Not today.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Good.',
              '...',
              'Sit down. Be loud about something else.',
              'I need noise.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.needs_noise'],
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '—',
              'Stop.',
              'Stop right there.',
              'We agreed.',
              '...',
              '...Thank you.',
              'But stop.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['mood.kasha.thanked_under_protest'],
          },
        },
        seen: false,
      },
      {
        beatId: 'kasha_t3_c6_b2',
        fishLines: [
          'Question.',
          "If you had to pick one of the three idiots around the corner — not me, three other idiots — to fight you in a duel, who would you pick.",
          "Don't say a name. Describe them.",
          'I want to test your judgment.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'That is the worst answer.',
              'That is the best worst answer.',
              '...',
              'How do you do that.',
              'How do you say something so stupid that it works.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.melted_briefly'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Hah—',
              'Wrong answer. There is no match for me.',
              'Try again.',
              '...',
              "Actually, don't try again. That answer is fine. I was being dramatic.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: -1,
            resultExpression: ExpressionState.Alarmed,
            responseLines: [
              '...',
              "You're really committed to making me jealous of her, huh.",
              '...',
              'Fine. Pick her. See if I care.',
              "I don't.",
              "...I do. A little. Stop.",
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['mood.kasha.nereia_jealousy'],
          },
          [ActionId.Reel]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              '...',
              "You can't just say things like that.",
              'There are rules.',
              '...',
              'Say it again.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.demanded_repeat'],
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
          "Bring nothing again. I don't need anything except— just come.",
          'Just you, baka.',
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: [
          'Tomorrow.',
          'Be on time.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          'Mm. Tomorrow.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          "I don't know if I'll be here.",
          "Don't count on it.",
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
        ],
        icon: EmotionIconType.Shock,
      },
    },
  },

  // === Cast 7: The Question She Asks ===
  {
    id: 'kasha_t3_c7',
    tier: AffectionTier.Familiar,
    name: 'The Question She Asks',
    beats: [
      {
        beatId: 'kasha_t3_c7_b1',
        fishLines: [
          'I have a question.',
          "Don't make a thing about it.",
          "It's a small question.",
          '...',
          "It's not a small question.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Why do you keep coming back.',
              '...',
              "Don't say something cute. Don't say 'because of you.' I will lose my mind.",
              'Tell me actually.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.real_question_asked'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Why do you keep coming back.',
              "And don't be cute.",
              'I am asking actually.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              "Don't be generous.",
              "I'm trying to ask a specific thing.",
              '...',
              'Why do you keep coming back.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Why.',
              'Why me.',
              '...',
              'And not — you know. Not anyone else.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['mood.kasha.why_me'],
          },
        },
        seen: false,
      },
      {
        beatId: 'kasha_t3_c7_b2',
        fishLines: [
          '...',
          "Tell me why you're here.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 4,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              '...',
              'That is.',
              '...',
              "That is the worst possible thing you could have said and also the only acceptable thing.",
              'Get out.',
              "Don't get out. Stay.",
              '...',
              'I hate you.',
              "(I don't.)",
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.alive_compliment_received'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Pff.',
              'Acceptable.',
              'True.',
              'I am very interesting.',
              '...Thanks.',
              "Did I just— forget that. Forget I said that.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              '...',
              "That's not.",
              "That's not how I would have phrased it.",
              '...',
              'But yeah.',
              'I do let you.',
              '...',
              "I've never let anyone before.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.kasha.first_let'],
          },
          [ActionId.Reel]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Want is a strong word.',
              '...',
              'I like that word.',
              'Use it more.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.want_word'],
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
          "Bring whatever you want. Or nothing.",
          'Just come.',
          "Don't be late, baka.",
        ],
        icon: EmotionIconType.Warmth,
        flagsToSet: ['tier.kasha.4.approaching'],
      },
      [DriftState.Warm]: {
        dialogue: [
          'Tomorrow.',
          '...',
          "I won't keep asking why you come.",
          '...For now.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          'Whatever.',
          'Tomorrow.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          "Maybe don't come tomorrow.",
          'Give me a day.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
          'I asked. You answered wrong.',
          "I don't want to see you for a while.",
        ],
        icon: EmotionIconType.Shock,
      },
    },
  },
];
