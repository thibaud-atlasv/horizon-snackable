/**
 * CastDataTier1_Kasha — Casts 1-2 (Tier 1: The Champion)
 * Kasha Arc v1.0 — Asuka-coded betta. Loud, competitive, performs for an audience of one.
 * Cast 1: The Champion (2 beats). Cast 2: The Audience (2 beats).
 */

import { ActionId } from './Constants';
import type { CastData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const KASHA_TIER1_CASTS: CastData[] = [
  // === Cast 1: The Champion ===
  {
    id: 'kasha_t1_c1',
    tier: AffectionTier.Unaware,
    name: 'The Champion',
    beats: [
      // --- Beat 1 ---
      {
        beatId: 'kasha_t1_c1_b1',
        fishLines: [
          'Tch.',
          'Another one.',
          'You picked the wrong corner, you know.',
          'This one is taken.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...What.',
              'What is that. That face.',
              "Don't just stand there looking— ugh, whatever. Stay if you want.",
              'Not like I care.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Hah—',
              "Oh, you've got a mouth. Good.",
              'I was getting bored.',
              "Don't disappoint me, baka.",
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['kasha.first_nickname'],
          },
          [ActionId.Drift]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              "Wait— no, wait.",
              "I didn't say leave.",
              "I said it was taken. That's different.",
              '...Tch. Forget it. Stay.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Heh.',
              "You're either brave or you're stupid.",
              "I'll figure out which.",
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['kasha.first_test_passed'],
          },
        },
        seen: false,
      },
      // --- Beat 2 ---
      {
        beatId: 'kasha_t1_c1_b2',
        fishLines: [
          "So you're the new face.",
          "Everyone's been whispering about it.",
          "'Someone new is around. Someone who stays.'",
          "Pff. As if that's interesting.",
          "...It's a little interesting.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'The usual ones.',
              "The silent one keeps a— she's got a list or something. Files, whatever.",
              "Creepy. Don't talk to her.",
              'Actually, do. See if she even answers.',
              "...She'll answer you. She doesn't answer me.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['kasha.knows_nereia'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'HAH—',
              'Of who. The walking statue?',
              'Please.',
              "Kasha doesn't get jealous.",
              "...I just said my own name in third person, didn't I.",
              'Forget that.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['mood.kasha.third_person_slip'],
          },
          [ActionId.Drift]: {
            affectionDelta: -1,
            resultExpression: ExpressionState.Alarmed,
            responseLines: [
              '—',
              '...',
              'What is that supposed to mean.',
              "Don't say weird things to people you just met, baka.",
              'Tch.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['mood.kasha.fissure_first'],
          },
          [ActionId.Reel]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Wow. Direct.',
              'I like that.',
              '...Wait, no. Bad. Boring question.',
              'Ask me something specific. Anything specific.',
              "I'll consider answering.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: {
        dialogue: [
          'Oi.',
          'Come back.',
          "I'm not done with you.",
          '...Tomorrow.',
          "Don't be late, baka.",
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: [
          'Tch.',
          "You're alright.",
          'Maybe.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          'Whatever.',
          "I'll see if you come back or not.",
          "Doesn't matter to me.",
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          "...You're weird.",
          'Not in the good way.',
          'Maybe try again.',
          "Or don't. Whatever.",
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
          "Don't come back tomorrow.",
        ],
        icon: EmotionIconType.Shock,
      },
    },
  },

  // === Cast 2: The Audience ===
  {
    id: 'kasha_t1_c2',
    tier: AffectionTier.Unaware,
    name: 'The Audience',
    beats: [
      // --- Beat 1 ---
      {
        beatId: 'kasha_t1_c2_b1',
        fishLines: [
          'You came back.',
          'Hah. Of course you did.',
          "I told you I wasn't done.",
          "...Don't read into that.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Yeah.',
              'Yeah, you are.',
              '...',
              "Stop looking at me like that. I'm thinking.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.first_quiet'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'I MISSED— no.',
              "I observed your continued absence. That's different.",
              "Pff. 'Missed me.' Listen to yourself.",
              "...You're insufferable, baka.",
              'Stay.',
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
          [ActionId.Drift]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              'I— no. I did not.',
              'I was going to be here regardless.',
              'Whether you came or not.',
              '...That is not the same thing as wanting you to come.',
              'Stop trying to read me.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Reel]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              "You're really pushing it today.",
              '...',
              'Stay.',
              "Don't make me say it twice.",
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.told_him_stay'],
          },
        },
        seen: false,
      },
      // --- Beat 2 ---
      {
        beatId: 'kasha_t1_c2_b2',
        fishLines: [
          'So. Things you should know.',
          "Rule one: I'm the loudest person around here. That's not up for debate. That's a fact.",
          "Rule two: nobody — and I mean nobody — has ever bested me.",
          'I am the champion. Of this corner. By right.',
          "Rule three: don't bother trying. You'll embarrass yourself.",
          "Rule four: if you do try, do it well, because if you embarrass yourself I'll have to mock you and I'm tired today.",
          '...',
          'Why are you smiling.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              "That's the wrong answer.",
              '...',
              'But fine.',
              'Keep your reasons.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Of— shut up.',
              'Of everything that matters.',
              "Don't make me list them. The list is long.",
              'Trust me.',
              "...There's a list. There is.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              'What kind of question is that.',
              'Of course they have. People challenge me constantly.',
              '...Constantly.',
              'Next question.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.kasha.never_challenged'],
          },
          [ActionId.Reel]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'To what.',
              "Don't say something stupid. Be specific.",
              'I am — I\'m listening.',
              'Specifically.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.challenge_accepted'],
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: {
        dialogue: [
          'Tomorrow.',
          'Same corner.',
          "Don't bring anyone else.",
          '...Just you.',
          'Baka.',
        ],
        icon: EmotionIconType.Warmth,
        flagsToSet: ['tier.kasha.2.approaching'],
      },
      [DriftState.Warm]: {
        dialogue: [
          'Maybe tomorrow.',
          "I haven't decided.",
          "...I've decided. Tomorrow.",
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          "Whatever. I'll be here.",
          'If you come, you come.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          'Maybe think about whether you actually want to come back.',
          "I'm not begging.",
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          'Just go.',
          '...',
          'Just go, baka.',
        ],
        icon: EmotionIconType.Shock,
      },
    },
  },
];
