/**
 * CastDataTier1 — Casts 1-2 (Tier 1: First Contact)
 * Nereia Arc v2.2 — Nagato Yuki voice.
 * Cast 1: First Contact (3 beats). Cast 2: The Compliment (2 beats).
 */

import { ActionId } from './Constants';
import type { CastData } from './Types';
import { ExpressionState, AffectionTier, DriftState, EmotionIconType } from './Types';

export const NEREIA_TIER1_CASTS: CastData[] = [
  // === Cast 1: First Contact ===
  {
    id: 'nereia_t1_c1',
    tier: AffectionTier.Unaware,
    name: 'First Contact',
    beats: [
      // --- Beat 1 ---
      {
        beatId: 'nereia_t1_c1_b1',
        fishLines: [
          'First contact.',
          'T-2313.',
          '...',
          'The mist will lift in eleven minutes.',
          'You will want to remember this light.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'I was already here.',
              '...',
              'That is a different statement.',
              'I will let you decide which is true.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Apologies.',
              '...',
              'In 1847 a heron landed on my back.',
              'I did not move.',
              'I am told this was unsettling.',
              'I am told I am unsettling in general.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Calculation.',
              '...',
              'And the wind.',
              'And the temperature of the third stone from the bank.',
              'And one variable I am not naming.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.nereia.first_anomaly'],
          },
          [ActionId.Reel]: {
            affectionDelta: -1,
            resultExpression: ExpressionState.Alarmed,
            responseLines: [
              'Direct.',
              '...',
              'Most subjects ask within the first six interactions.',
              'You asked in the first thirty seconds.',
              '...',
              'I am not answering.',
              'I am noting that you would have made an excellent interrogator.',
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
        },
        seen: false,
      },
      // --- Beat 2 ---
      {
        beatId: 'nereia_t1_c1_b2',
        fishLines: [
          'My name is Nereia.',
          '...',
          'It is the name I give.',
          'Nereia.',
          'Use that one.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'You pronounced it correctly.',
              '...',
              'That is rare.',
              'Most distort it.',
              '...',
              'You are the fourth person in 340 years to pronounce it correctly on the first attempt.',
              'I am noting.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.nereia.fourth_person'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Thank you.',
              '...',
              'I chose it.',
              '...',
              'Not at first.',
              'It took time.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.nereia.chosen_name'],
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Nereia.',
              '...',
              'In this space-time.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              'Interesting question.',
              '...',
              'I am not answering that one either.',
              '...',
              'You keep your momentum.',
              'I am noting that as well.',
            ],
            emotionIcon: EmotionIconType.Surprise,
          },
        },
        seen: false,
      },
      // --- Beat 3 ---
      {
        beatId: 'nereia_t1_c1_b3',
        fishLines: [
          'I have a file on you.',
          'It existed before your arrival.',
          '...',
          'Fourteen pages.',
          'I am told this is unusual for someone who did not yet exist.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'No.',
              '...',
              'I will read you one line.',
              '...',
              '\'Subject 2848 will not behave as predicted.\'',
              '...',
              'It is the only line that matters.',
              'Everything else is mass.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['secret.nereia.file'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 1,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Neither.',
              '...',
              'Both.',
              '...',
              'I had not considered the third option.',
              'I am considering it now.',
              '...',
              'It will take some time.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.nereia.file'],
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Because you are the only one who would believe me.',
              '...',
              'I have been wrong about that before.',
              'I calculate that I am not wrong this time.',
              '...',
              'The file disagrees with my calculation.',
              'I am siding with myself.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.nereia.file', 'mood.nereia.disagrees_with_file'],
          },
          [ActionId.Reel]: {
            affectionDelta: -1,
            resultExpression: ExpressionState.Alarmed,
            responseLines: [
              'It is not a thing you can see.',
              '...',
              'But.',
              '...',
              'Page seven contains a sketch of you made before your arrival.',
              'Approximately accurate.',
              'The nose is wrong.',
              '...',
              'I am updating it.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['secret.nereia.sketched_him'],
          },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: {
        dialogue: [
          '...',
          'The mist is heavy this morning.',
          'Heavier than it should be.',
          '...',
          'It weighs 0.4% above my prediction.',
          '...',
          'That is also your fault.',
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: [
          '...',
          'A dragonfly will pass in ten seconds.',
          '...',
          'Watch.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Satisfied]: {
        dialogue: [
          '...',
          'T-2313 remains T-2313.',
          'I did not move the counter this morning.',
          '...',
          'I am permitting myself.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          'You asked the wrong question first.',
          'Most do.',
          '...',
          'I have learned to be indifferent to that variable.',
          'I am told this is sad.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
          'Noted.',
          '...',
          'The file did not predict you.',
          'It predicted me.',
          'I will adjust.',
        ],
        icon: EmotionIconType.Shock,
      },
    },
  },

  // === Cast 2: The Compliment ===
  {
    id: 'nereia_t1_c2',
    tier: AffectionTier.Unaware,
    name: 'The Compliment',
    beats: [
      // --- Beat 1 ---
      {
        beatId: 'nereia_t1_c2_b1',
        fishLines: [
          'First contact.',
          'T-2287.',
          '...',
          'I considered not surfacing.',
          '...',
          'For approximately 1.8 seconds.',
          'I had never considered that.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              '...',
              'Curiosity is younger than I am.',
              'It catches me off guard.',
              '...',
              'I am 340 years old and something younger than me is still teaching me.',
              'It is undignified.',
              '...',
              'I do not mind.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'Humour.',
              '...',
              'I am mastering this concept.',
              '...',
              'A copper coin from a country that no longer exists.',
              'Your grandmother gave it to you.',
              'You have not removed it from that pocket in four years.',
              '...',
              'Was that the wrong answer?',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['secret.nereia.knows_him'],
          },
          [ActionId.Drift]: {
            affectionDelta: 3,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'You are the most interesting person I have encountered.',
              '...',
              'The mist is denser to the south.',
              'It will pass in four minutes.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.nereia.casual_compliment'],
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              'You have asked twice now.',
              '...',
              'I am beginning to believe you mean it.',
              '...',
              'Page one is empty.',
              '...',
              'It always has been.',
              'I do not know why.',
              'I am the one who started the file.',
            ],
            emotionIcon: EmotionIconType.Surprise,
            flagsToSet: ['secret.nereia.empty_first_page'],
          },
        },
        seen: false,
      },
      // --- Beat 2 ---
      {
        beatId: 'nereia_t1_c2_b2',
        fishLines: [
          'The file has a new section.',
          'It was not predicted.',
          '...',
          'Uncategorised section.',
          '...',
          'The other sections are titled by year, by phenomenon, by subject number.',
          'This one is titled with a question mark.',
          '...',
          'It is your fault.',
        ],
        actionEffects: {
          [ActionId.Wait]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Warm,
            responseLines: [
              'No.',
              '...',
              'It is the right answer regardless.',
              '...',
              'It is also the answer the file predicted.',
              '...',
              'You said it slowly.',
              'The file did not predict the slowness.',
              'I am keeping it.',
            ],
            emotionIcon: EmotionIconType.Hesitation,
            flagsToSet: ['mood.nereia.first_crack'],
          },
          [ActionId.Twitch]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'You.',
              '...',
              'Also: the morning of November 14th, 1923.',
              '...',
              'Also: a sound the lake made in 1991, never repeated.',
              '...',
              'Also: the exact reason I keep returning here.',
              '...',
              'Four entries.',
              'I am noticing for the first time that you make the fourth.',
              '...',
              'Three I cannot explain.',
              'The fourth is you.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
            flagsToSet: ['mood.nereia.first_crack', 'secret.nereia.november_14_seed'],
          },
          [ActionId.Drift]: {
            affectionDelta: 2,
            resultExpression: ExpressionState.Curious,
            responseLines: [
              'No.',
              '...',
              'But you can be it.',
              '...',
              'You are being it.',
              'Right now.',
              '...',
              'That is sufficient access.',
            ],
            emotionIcon: EmotionIconType.Curiosity,
          },
          [ActionId.Reel]: {
            affectionDelta: 0,
            resultExpression: ExpressionState.Neutral,
            responseLines: [
              '...',
              'Yes.',
              '...',
              'I just told you.',
              '...',
              'I told you because you would notice.',
              'Most do not notice.',
              '...',
              'I file this as data point one in your favour.',
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
          '...',
          'The dragonfly came back.',
          'Three days later than predicted.',
          '...',
          'It had never done that.',
        ],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: [
          '...',
          'Bring me a question I cannot predict.',
          'I will award points.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Satisfied]: {
        dialogue: [
          '...',
          'The file is updated.',
          'Return when you wish.',
        ],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: [
          '...',
          'The file requires corrections.',
          'Return.',
          'Or do not.',
        ],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: [
          '...',
          'The file will be closed.',
        ],
        icon: EmotionIconType.Shock,
      },
    },
  },
];
