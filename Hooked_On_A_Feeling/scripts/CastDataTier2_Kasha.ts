/**
 * CastDataTier2_Kasha — Casts 3-4 (Tier 2: The Test)
 * Cast 3: The Test (2 beats). Cast 4: The Lie She Told (2 beats).
 */

import { ActionId } from './Constants';
import type { CastData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const KASHA_TIER2_CASTS: CastData[] = [
  // === Cast 3: The Test ===
  {
    id: 'kasha_t2_c3',
    tier: AffectionTier.Curious,
    name: 'The Test',
    beats: [
      {
        beatId: 'kasha_t2_c3_b1',
        fishLines: [
          'Okay.',
          'New rules.',
          'If you want to keep showing up, you have to earn it.',
          "I'm raising the standard.",
          "Don't look at me like that. This is good for you.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              "I— haven't decided yet.",
              'It will reveal itself.',
              'Stay alert.',
              "...Don't laugh. I am being serious.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Hah—!',
              "That's the right energy.",
              'Wrong attitude, but right energy.',
              "I'll allow it.",
              '...',
              "...You're enjoying this. Aren't you.",
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
          [ActionId.Drift]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              'Yes I do.',
              '...',
              'Yes I do, baka.',
              "You wouldn't understand.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['mood.kasha.fissure_widen'],
          },
          [ActionId.Reel]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Why would you ask that.',
              'What — what kind of question is that.',
              "You don't get anything. You get to keep showing up. That's the prize.",
              "...That's a real prize.",
              'Stop smirking.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.prize_admitted'],
          },
        },
        seen: false,
      },
      {
        beatId: 'kasha_t2_c3_b2',
        fishLines: [
          'Question one: who is the most important person around here.',
          'Answer carefully.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              '...',
              "Don't say it like that.",
              'Say it like you\'re joking. Say it like a joke.',
              "Don't just say it.",
              '...',
              'Pass. You pass.',
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.unmasked_briefly'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Pff.',
              'Correct answer. Acceptable delivery.',
              'B+.',
              "I'm a hard grader.",
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
          [ActionId.Drift]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              'Yes.',
              '...',
              'No.',
              "I don't know. Move on. Next question.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: -2,
            resultExpression: ExpressionState.Alarmed,
            responseLines: [
              '...',
              'Wow.',
              'Get out.',
              'Get out of my corner.',
              '...',
              "I'm joking. ...Mostly. Sit back down.",
              'But also — wow.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['mood.kasha.wounded_pride'],
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: {
        dialogue: [
          'You passed.',
          '...Some of it.',
          'Come back tomorrow. New test.',
          "Don't get cocky, baka.",
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: [
          'Mm.',
          'Acceptable performance.',
          'Tomorrow.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          "We'll see.",
          'Maybe.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          'I expected better.',
          'From you specifically.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          "Don't bother coming back.",
          '...',
          'I mean it.',
        ],
        icon: EmotionIconType.Shock,
      },
    },
  },

  // === Cast 4: The Lie She Told ===
  {
    id: 'kasha_t2_c4',
    tier: AffectionTier.Curious,
    name: 'The Lie She Told',
    beats: [
      {
        beatId: 'kasha_t2_c4_b1',
        fishLines: [
          'Took you long enough.',
          'I was about to leave.',
          "You're lucky I'm patient.",
          "...Don't laugh. I AM patient.",
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Yeah.',
              'I noticed.',
              '...',
              'Took you a minute. I was about to whistle.',
              'I would not have whistled.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.would_have_whistled'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '—',
              'I did not.',
              "I was bored. I move when I'm bored.",
              "Don't read into it.",
              "...Stop smirking. That was not an admission.",
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              "Don't say things like that.",
              "Just — don't.",
              '...',
              'Sit down.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.kasha.tender_hit'],
          },
          [ActionId.Reel]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'Hah—',
              'Listen to him.',
              "'Stay where I can find you.' Bossy.",
              '...',
              'Maybe.',
            ],
            emotionIcon: EmotionIconType.Warmth,
          },
        },
        seen: false,
      },
      {
        beatId: 'kasha_t2_c4_b2',
        fishLines: [
          'About what I said. Last time.',
          'About people challenging me constantly.',
          '...',
          'That was a slight exaggeration.',
          'Slight.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'Significantly slight.',
              '...',
              'Nobody challenges me, baka.',
              'Nobody bothers.',
              '...',
              "I'm the champion because I'm the only one playing.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.kasha.never_challenged_truth'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'EXCUSE me. It is not bluffing.',
              'It is — strategic positioning.',
              'I am a strategist.',
              '...I am a very lonely strategist.',
              'Tch.',
              'Forget I said that last part.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.kasha.lonely'],
          },
          [ActionId.Drift]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              "Don't.",
              "Don't apologise for things that aren't yours.",
              "It's annoying.",
              '...',
              "It's nice. But it's annoying.",
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              '...',
              'You said that already.',
              'Last time.',
              '...',
              'Are you actually going to.',
              "Or are you just going to keep saying it.",
            ],
            emotionIcon: EmotionIconType.Warmth,
            flagsToSet: ['mood.kasha.first_real_challenge'],
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
          'Bring something.',
          "I don't know what. Surprise me.",
          "Don't bring nothing, baka.",
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: [
          'Tomorrow, then.',
          '...',
          'Same corner.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Neutral]: {
        dialogue: [
          'Mm.',
          'Maybe.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          "Don't push it.",
          "I told you something. Don't make me regret it.",
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
          "I shouldn't have told you that.",
          "Don't come back.",
        ],
        icon: EmotionIconType.Shock,
        flagsToSet: ['mood.kasha.regret_admission'],
      },
    },
  },
];
