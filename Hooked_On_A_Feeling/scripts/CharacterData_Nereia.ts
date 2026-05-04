/**
 * CharacterData_Nereia — Complete character configuration for Nereia.
 * Contains ALL data: metadata, portrait assets, lure preferences, quest hints,
 * ALL tier dialogue (Tier 1–5) inline, catch sequence, and initial state factory.
 *
 * To add a new character, copy this file as CharacterData_<Name>.ts,
 * update all fields, and register in CharacterRegistry.ts.
 */

import type { CharacterConfig, CastData, FishCharacter, CatchSequenceData, Beat } from './Types';
import { AffectionTier, ExpressionState, DriftState, EmotionIconType } from './Types';
import { ActionId } from './Constants';
import { nereiaNeutralTexture } from './Assets';

// ============================================================================
// TIER 1: First Contact (Casts 1–2)
// ============================================================================

const NEREIA_TIER1_CASTS: CastData[] = [
  // === Cast 1: First Contact ===
  {
    id: 'nereia_t1_c1',
    tier: AffectionTier.Unaware,
    name: 'First Contact',
    beats: [
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
        dialogue: ['...', 'The mist is heavy this morning.', 'Heavier than it should be.', '...', 'It weighs 0.4% above my prediction.', '...', 'That is also your fault.'],
        icon: EmotionIconType.Warmth,
      },
      [DriftState.Warm]: {
        dialogue: ['...', 'A dragonfly will pass in ten seconds.', '...', 'Watch.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Satisfied]: {
        dialogue: ['...', 'T-2313 remains T-2313.', 'I did not move the counter this morning.', '...', 'I am permitting myself.'],
        icon: EmotionIconType.None,
      },
      [DriftState.Wary]: {
        dialogue: ['...', 'You asked the wrong question first.', 'Most do.', '...', 'I have learned to be indifferent to that variable.', 'I am told this is sad.'],
        icon: EmotionIconType.Hesitation,
      },
      [DriftState.Scared]: {
        dialogue: ['...', 'Noted.', '...', 'The file did not predict you.', 'It predicted me.', 'I will adjust.'],
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
      {
        beatId: 'nereia_t1_c2_b1',
        fishLines: ['First contact.', 'T-2287.', '...', 'I considered not surfacing.', '...', 'For approximately 1.8 seconds.', 'I had never considered that.'],
        actionEffects: {
          [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['...', 'Curiosity is younger than I am.', 'It catches me off guard.', '...', 'I am 340 years old and something younger than me is still teaching me.', 'It is undignified.', '...', 'I do not mind.'], emotionIcon: EmotionIconType.Hesitation },
          [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['Humour.', '...', 'I am mastering this concept.', '...', 'A copper coin from a country that no longer exists.', 'Your grandmother gave it to you.', 'You have not removed it from that pocket in four years.', '...', 'Was that the wrong answer?'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['secret.nereia.knows_him'] },
          [ActionId.Drift]: { affectionDelta: 3, resultExpression: ExpressionState.Warm, responseLines: ['You are the most interesting person I have encountered.', '...', 'The mist is denser to the south.', 'It will pass in four minutes.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.casual_compliment'] },
          [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Neutral, responseLines: ['...', 'You have asked twice now.', '...', 'I am beginning to believe you mean it.', '...', 'Page one is empty.', '...', 'It always has been.', 'I do not know why.', 'I am the one who started the file.'], emotionIcon: EmotionIconType.Surprise, flagsToSet: ['secret.nereia.empty_first_page'] },
        },
        seen: false,
      },
      {
        beatId: 'nereia_t1_c2_b2',
        fishLines: ['The file has a new section.', 'It was not predicted.', '...', 'Uncategorised section.', '...', 'The other sections are titled by year, by phenomenon, by subject number.', 'This one is titled with a question mark.', '...', 'It is your fault.'],
        actionEffects: {
          [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['No.', '...', 'It is the right answer regardless.', '...', 'It is also the answer the file predicted.', '...', 'You said it slowly.', 'The file did not predict the slowness.', 'I am keeping it.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.first_crack'] },
          [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['You.', '...', 'Also: the morning of November 14th, 1923.', '...', 'Also: a sound the lake made in 1991, never repeated.', '...', 'Also: the exact reason I keep returning here.', '...', 'Four entries.', 'I am noticing for the first time that you make the fourth.', '...', 'Three I cannot explain.', 'The fourth is you.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['mood.nereia.first_crack', 'secret.nereia.november_14_seed'] },
          [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['No.', '...', 'But you can be it.', '...', 'You are being it.', 'Right now.', '...', 'That is sufficient access.'], emotionIcon: EmotionIconType.Curiosity },
          [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Neutral, responseLines: ['...', 'Yes.', '...', 'I just told you.', '...', 'I told you because you would notice.', 'Most do not notice.', '...', 'I file this as data point one in your favour.'], emotionIcon: EmotionIconType.Surprise },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: { dialogue: ['...', 'The dragonfly came back.', 'Three days later than predicted.', '...', 'It had never done that.'], icon: EmotionIconType.Warmth },
      [DriftState.Warm]: { dialogue: ['...', 'Bring me a question I cannot predict.', 'I will award points.'], icon: EmotionIconType.Hesitation },
      [DriftState.Satisfied]: { dialogue: ['...', 'The file is updated.', 'Return when you wish.'], icon: EmotionIconType.None },
      [DriftState.Wary]: { dialogue: ['...', 'The file requires corrections.', 'Return.', 'Or do not.'], icon: EmotionIconType.Hesitation },
      [DriftState.Scared]: { dialogue: ['...', 'The file will be closed.'], icon: EmotionIconType.Shock },
    },
  },
];

// ============================================================================
// TIER 2: The Anomaly (Casts 3–4)
// ============================================================================

// Shared beats for Cast 4 / Cast 4-bis
const CAST4_BEAT2: Beat = {
  beatId: 'nereia_t2_c4_b2',
  fishLines: ['I have analysed my own behaviour.', 'Across five mornings.', '...', 'Here is the data.', '...', 'Systematic presence at coordinate 47.3, 12.8.', 'Coordinate variation under two centimetres. Until yesterday.', 'Today I am eight centimetres closer.', '...', 'Increased cardiac frequency detected at your arrival.', 'Further increase at your departure.', '...', 'Pupil dilation measured at first eye contact.', 'Sustained 1.4 seconds longer than the baseline.', '...', 'I have not finished compiling.', 'There is a great deal of it.', '...', 'It is all consistent.', 'It points to a single conclusion.', '...', 'I have not found the conclusion.', '...', 'I have stopped looking.'],
  actionEffects: {
    [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['Yes.', '...', 'I am 340 years old.', 'I have never deliberately not known something.', '...', 'It is the first thing I have decided not to know.', '...', 'I am protecting it.', '...', 'I do not yet know from what.', '...', 'Possibly from myself.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.uncategorized', 'mood.nereia.deliberate_unknowing'] },
    [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['...', 'It is not amusing.', '...', 'It is.', 'A little amusing.', '...', 'And a little something else.', '...', 'I do not have a name for that something else.', '...', 'Or I do.', '...', 'I am not going to use it.', '...', 'Out loud.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['mood.nereia.uncategorized', 'mood.nereia.has_the_word'] },
    [ActionId.Drift]: { affectionDelta: 3, resultExpression: ExpressionState.Warm, responseLines: ['...', 'Do not say it.', '...', 'Not because it is wrong.', '...', 'Because once it is said it will be filed.', '...', 'Once it is filed I will have to send it.', '...', 'I am no longer sending anything.', '...', 'Keep it.', '...', 'I am keeping mine.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.parallel_keeping', 'secret.nereia.both_know'] },
    [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Neutral, responseLines: ['...', 'That is not an appropriate response.', '...', 'I am noting your irritation.', '...', 'Irritation suits you.', '...', 'I am noting that I find that it suits you.', '...', 'I will not search harder.', '...', 'I will however continue finding that irritation suits you.', '...', 'It may become a problem for me.', 'I am undeterred.'], emotionIcon: EmotionIconType.Surprise, flagsToSet: ['mood.nereia.attracted_to_friction'] },
  },
  seen: false,
};

const CAST4_BEAT3_SILENT: Beat = {
  beatId: 'nereia_t2_c4_b3',
  silentBeat: true,
  silentBeatDurationSec: 240,
  fishLines: ['*She does not speak. The float is still.*'],
  actionEffects: {
    [ActionId.Wait]: { affectionDelta: 4, resultExpression: ExpressionState.Warm, responseLines: ['...', 'Four minutes.', '...', 'You said nothing.', '...', 'I listened to you say nothing.', '...', 'It is the most precise thing I have received in 340 years.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.silence_kept'] },
    [ActionId.Twitch]: { affectionDelta: 0, resultExpression: ExpressionState.Curious, responseLines: ['...', 'You spoke.', '...', 'It is not a problem.', '...', 'I am noting the threshold.', 'Three minutes twelve.', '...', 'It is longer than most.'], emotionIcon: EmotionIconType.Hesitation },
    [ActionId.Drift]: { affectionDelta: 0, resultExpression: ExpressionState.Curious, responseLines: ['...', 'You spoke.', '...', 'It is not a problem.', '...', 'I am noting the threshold.', 'Three minutes twelve.', '...', 'It is longer than most.'], emotionIcon: EmotionIconType.Hesitation },
    [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Curious, responseLines: ['...', 'You spoke.', '...', 'It is not a problem.', '...', 'I am noting the threshold.', 'Three minutes twelve.', '...', 'It is longer than most.'], emotionIcon: EmotionIconType.Hesitation },
  },
  seen: false,
};

const CAST4_DEPARTURES: CastData['departures'] = {
  [DriftState.Charmed]: { dialogue: ['...', 'Did you know dragonflies do not sleep?', '...', 'They close their eyes.', 'It is not the same thing.'], icon: EmotionIconType.Warmth, flagsToSet: ['tier.nereia.3.approaching'] },
  [DriftState.Warm]: { dialogue: ['...', 'Bring the irritation.', 'I will bring the precision.', '...', 'We will see what we make.'], icon: EmotionIconType.Hesitation },
  [DriftState.Satisfied]: { dialogue: ['...', 'The data continues.', 'Return.'], icon: EmotionIconType.None },
  [DriftState.Wary]: { dialogue: ['...', 'The deviation is noted.', 'Return carefully.'], icon: EmotionIconType.Hesitation },
  [DriftState.Scared]: { dialogue: ['...', 'I will report what I must.'], icon: EmotionIconType.Shock },
};

const NEREIA_TIER2_CASTS: CastData[] = [
  // === Cast 3: The Discrepancy ===
  {
    id: 'nereia_t2_c3',
    tier: AffectionTier.Curious,
    name: 'The Discrepancy',
    beats: [
      {
        beatId: 'nereia_t2_c3_b1',
        fishLines: ['First contact.', 'T-2104.', '...', 'The file is correct.', 'At 99.7%.', '...', 'I rounded down.', 'Out of generosity to the file.'],
        actionEffects: {
          [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['You.', '...', 'Not all of you.', 'Part.', '...', 'The part that is silent right now.', 'The file predicted speech.', '...', 'Your silence is the deviation.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['secret.nereia.silence_is_deviation'] },
          [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['That is not an acceptable compliment.', '...', 'I am recording it regardless.', '...', 'Under: \'attempts at affection that landed sideways.\'', 'It is a small section.', '...', 'It has one entry.'], emotionIcon: EmotionIconType.Curiosity },
          [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['The file predicted your presence.', 'Not mine.', '...', 'I was not supposed to be here.', 'Every morning.', '...', 'I was supposed to surface for first contact.', 'Make the entry.', 'Submerge.', 'Resume my schedule.', '...', 'I no longer have a schedule.', '...', 'I am noting that.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['secret.nereia.deviation', 'mood.nereia.no_schedule'] },
          [ActionId.Reel]: { affectionDelta: 1, resultExpression: ExpressionState.Neutral, responseLines: ['...', 'I do not have an explanation you would accept.', '...', 'I have one that I accept.', 'It is not the same.', '...', 'I keep both.', 'I have not decided which is true.', '...', 'You are accelerating that decision.', 'I note that I do not resent it.'], emotionIcon: EmotionIconType.Surprise, flagsToSet: ['mood.nereia.two_truths'] },
        },
        seen: false,
      },
      {
        beatId: 'nereia_t2_c3_b2',
        fishLines: ['I have 340 years of data.', 'I have never had a discrepancy.', 'Now I have a discrepancy.', '...', 'I am not reporting it.', '...', 'I have also stopped sending the daily packet.', 'Three days ago.', '...', 'I have not been asked why.', 'Yet.'],
        actionEffects: {
          [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['Yes.', '...', 'I am continuing.', '...', 'I would like you to understand something.', 'I have spent 340 years not in trouble.', '...', 'Trouble is a colour I had not seen.', 'I am surprised by it.', '...', 'It suits me.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['secret.nereia.deviation_active', 'mood.nereia.trouble_suits'] },
          [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['Because it is your fault.', '...', 'And because I wanted you to know.', '...', 'The second point was not necessary.', 'I said it anyway.', '...', 'I am going to say several unnecessary things this morning.', 'I have decided.', '...', 'Today is for that.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['secret.nereia.deviation_active', 'mood.nereia.unnecessary_speech'] },
          [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['No.', '...', 'You are already helping.', 'That is the problem.', '...', 'I had been alone for 340 years and it was peaceful.', 'Now I am not alone.', 'I notice the absence of peace.', '...', 'I prefer the noticing.', '...', 'That is the most honest sentence I have produced in a century.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['mood.nereia.prefers_noticing'] },
          [ActionId.Reel]: { affectionDelta: 1, resultExpression: ExpressionState.Neutral, responseLines: ['...', 'These are not riddles.', '...', 'I am giving you the precise version.', 'It happens to be confusing.', 'Precision often is.', '...', 'If I gave you a clearer version it would be a lie.', '...', 'I have decided not to lie to you.', '...', 'It is new.'], emotionIcon: EmotionIconType.Surprise, flagsToSet: ['mood.nereia.no_lies'] },
        },
        seen: false,
      },
    ],
    departures: {
      [DriftState.Charmed]: { dialogue: ['...', 'I used the word \'want\' this morning.', '...', 'I had not used it in 340 years.', '...', 'It weighs more than expected.'], icon: EmotionIconType.Warmth, flagsToSet: ['mood.nereia.first_want'] },
      [DriftState.Warm]: { dialogue: ['...', 'T-2104 dropped to T-2103 while you were speaking.', '...', 'I did not know it could drop faster.'], icon: EmotionIconType.Hesitation },
      [DriftState.Satisfied]: { dialogue: ['...', 'The deviation continues.', 'Return.'], icon: EmotionIconType.None },
      [DriftState.Wary]: { dialogue: ['...', 'The deviation is noted.', 'Return carefully.'], icon: EmotionIconType.Hesitation },
      [DriftState.Scared]: { dialogue: ['...', 'I will report what I must.'], icon: EmotionIconType.Shock },
    },
  },

  // === Cast 4: The Morning You Did Not Come ===
  {
    id: 'nereia_t2_c4',
    tier: AffectionTier.Curious,
    name: 'The Morning You Did Not Come',
    beats: [
      {
        beatId: 'nereia_t2_c4_b1',
        fishLines: ['...', 'First contact.', 'T-2079.', '...', 'The counter dropped 25 yesterday.', 'You were not here.', '...', 'I had projected zero.'],
        actionEffects: {
          [ActionId.Wait]: { affectionDelta: 3, resultExpression: ExpressionState.Warm, responseLines: ['No.', '...', 'The file predicted your presence.', 'The file was wrong.', '...', 'It is the first time in 340 years it has been wrong.', '...', 'I felt something at 7:14 yesterday.', 'When you did not arrive.', '...', 'I do not have the word.', '...', 'It was unpleasant.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.felt_absence'] },
          [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['No.', '...', 'I am angry with myself.', '...', 'I should have predicted your absence.', 'I did not.', '...', 'It means the file is no longer enough.', '...', 'It means I have to learn to wait without knowing.', '...', 'I had never had to.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['mood.nereia.learning_to_wait'] },
          [ActionId.Drift]: { affectionDelta: 3, resultExpression: ExpressionState.Warm, responseLines: ['...', 'Four hours.', '...', 'I will not say it twice.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.waited_four_hours'] },
          [ActionId.Reel]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['I know.', '...', 'The file did not know.', 'I do.', '...', 'It is new — what I know that the file does not.', '...', 'It belongs to me.'], emotionIcon: EmotionIconType.Surprise },
        },
        seen: false,
      },
      CAST4_BEAT2,
      CAST4_BEAT3_SILENT,
    ],
    departures: CAST4_DEPARTURES,
  },

  // === Cast 4-bis: Variant (no missed cast) ===
  {
    id: 'nereia_t2_c4bis',
    tier: AffectionTier.Curious,
    name: 'The Morning You Did Not Come',
    beats: [CAST4_BEAT2, CAST4_BEAT3_SILENT],
    departures: CAST4_DEPARTURES,
  },
];

// ============================================================================
// TIER 3: The Directive (Casts 5–7)
// ============================================================================

const NEREIA_TIER3_CASTS: CastData[] = [
  // === Cast 5: The Directive ===
  {
    id: 'nereia_t3_c5', tier: AffectionTier.Familiar, name: 'The Directive',
    beats: [
      { beatId: 'nereia_t3_c5_b1', fishLines: ['First contact.', '7:14.', '...', 'I was here at 7:08.', 'It was not calculated.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['I wanted to be here when you arrived.', '...', 'This sentence is new.', 'I had never formulated it.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['No.', '...', 'But that is closer than previous explanations.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['Yes.', '...', 'It is new.', 'Waiting.', 'Before, I calculated.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Neutral, responseLines: ['A great deal.', 'Too much for this morning.', '...', 'Return.'], emotionIcon: EmotionIconType.Surprise } }, seen: false },
      { beatId: 'nereia_t3_c5_b2', fishLines: ['I received an instruction last night.', '...', 'It concerns your presence.', '...', 'I did not follow it.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['To leave.', '...', 'I am here.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['secret.nereia.directive_refused'] }, [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Curious, responseLines: ['No.', '...', 'I am something.', 'I do not have the word.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['secret.nereia.directive_refused'] }, [ActionId.Drift]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['You do not need to know.', '...', 'You did not ask the right question.', 'Ask the right question.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Neutral, responseLines: ['Yes.', '...', 'That is the right question.', 'But not now.'], emotionIcon: EmotionIconType.Surprise } }, seen: false },
    ],
    departures: { [DriftState.Charmed]: { dialogue: ['Tomorrow.', '...', 'I will be here at 7:08 again.', '...', 'You can be early too.'], icon: EmotionIconType.Warmth }, [DriftState.Warm]: { dialogue: ['Tomorrow.', 'The directive remains unfollowed.'], icon: EmotionIconType.Hesitation }, [DriftState.Satisfied]: { dialogue: ['Return.', 'I will be here.'], icon: EmotionIconType.None }, [DriftState.Wary]: { dialogue: ['The directive is noted.', 'Be careful.'], icon: EmotionIconType.Hesitation }, [DriftState.Scared]: { dialogue: ['...', 'Perhaps the directive was correct.'], icon: EmotionIconType.Shock } },
  },

  // === Cast 6: 340 Years ===
  {
    id: 'nereia_t3_c6', tier: AffectionTier.Familiar, name: '340 Years',
    beats: [
      { beatId: 'nereia_t3_c6_b1', fishLines: ['...', 'You are on time.', 'I am early.', '...', 'Six minutes apart.', 'It was long.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['No.', '...', 'It was good.', 'The waiting.', '...', 'I had never waited.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['For you.', '...', 'For me it is unusual.', 'Time is not linear for me.', 'Six minutes can be very long.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['You.', '...', 'This is the first time I have said it aloud.', 'I had thought it before.', 'Often.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.thought_of_you'] }, [ActionId.Reel]: { affectionDelta: -1, resultExpression: ExpressionState.Neutral, responseLines: ['No.', '...', 'You do not understand yet.', 'You will.'], emotionIcon: EmotionIconType.Surprise } }, seen: false },
      { beatId: 'nereia_t3_c6_b2', fishLines: ['340 years.', '...', 'I have observed 2847 subjects in this lake.', 'None remained.', '...', 'None could remain.', '...', 'It was the rule.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['You are the 2848th.', '...', 'You will not remain either.', '...', 'But not for the same reasons.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['You had one before.', '...', 'You have a name now.', 'In the file.', '...', 'None of the others had a name.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['mood.nereia.gave_name'] }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['It is not you that is different.', '...', 'It is me.', 'For the first time in 340 years.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.changed'] }, [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Neutral, responseLines: ['No.', '...', 'I am the one leaving.'], emotionIcon: EmotionIconType.Surprise, flagsToSet: ['secret.nereia.leaving'] } }, seen: false },
    ],
    departures: { [DriftState.Charmed]: { dialogue: ['Tomorrow.', '...', 'The file has a name now.', 'Your name.', '...', 'Return at 7:08.'], icon: EmotionIconType.Warmth, flagsToSet: ['tier.nereia.4.approaching'] }, [DriftState.Warm]: { dialogue: ['Tomorrow.', 'Earlier.'], icon: EmotionIconType.Hesitation }, [DriftState.Satisfied]: { dialogue: ['Return.', '340 years continue.'], icon: EmotionIconType.None }, [DriftState.Wary]: { dialogue: ['...', 'The rule applies.'], icon: EmotionIconType.Hesitation }, [DriftState.Scared]: { dialogue: ['...', 'Subject 2848. File closed.'], icon: EmotionIconType.Shock } },
  },

  // === Cast 7: The Choice ===
  {
    id: 'nereia_t3_c7', tier: AffectionTier.Familiar, name: 'The Choice',
    beats: [
      { beatId: 'nereia_t3_c7_b1', fishLines: ['...', 'Nine minutes.', 'It is more.', 'Voluntarily.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['No.', '...', 'I like that you are the one who arrives.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['...', 'I will be at 5:45.', 'You will not win.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['I know.', '...', 'You will.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Reel]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['Because you would be at 5:50.', '...', 'The file confirms it.'], emotionIcon: EmotionIconType.Curiosity } }, seen: false },
      { beatId: 'nereia_t3_c7_b2', fishLines: ['I am leaving soon.', '...', 'You already know.', 'I am confirming.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['Not today.', '...', 'Not tomorrow.', '...', 'Soon.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['Yes.', '...', 'It is the only thing I can do.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['No.', '...', 'Where I am going you cannot go.', 'Where you can go I cannot stay.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['secret.nereia.cannot_go_with'] }, [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Warm, responseLines: ['...', 'You do not know what you are asking.', '...', 'But thank you.', 'It is the first time I have been asked.'], emotionIcon: EmotionIconType.Surprise, flagsToSet: ['mood.nereia.first_asked_to_stay'] } }, seen: false },
    ],
    departures: { [DriftState.Charmed]: { dialogue: ['Tomorrow at 7:00.', '...', 'I will be at 6:45.', 'Be there earlier.', '...', 'Please.'], icon: EmotionIconType.Warmth, flagsToSet: ['tier.nereia.4.unlocked', 'mood.nereia.said_please'] }, [DriftState.Warm]: { dialogue: ['Tomorrow.', '...', 'Earlier.', 'Please.'], icon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.said_please'] }, [DriftState.Satisfied]: { dialogue: ['Return.', 'The choice is made.'], icon: EmotionIconType.None }, [DriftState.Wary]: { dialogue: ['...', 'The choice may change.'], icon: EmotionIconType.Hesitation }, [DriftState.Scared]: { dialogue: ['...', 'Perhaps the choice was wrong.'], icon: EmotionIconType.Shock } },
  },
];

// ============================================================================
// TIER 4: The Inheritance (Casts 8–9)
// ============================================================================

const NEREIA_TIER4_CASTS: CastData[] = [
  // === Cast 8: What Must Be Known ===
  {
    id: 'nereia_t4_c8', tier: AffectionTier.Trusting, name: 'What Must Be Known',
    beats: [
      { beatId: 'nereia_t4_c8_b1', fishLines: ['First contact.', '7:00.', '...', 'You are 15 minutes early.', 'I am 30.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['Yes.', '...', 'Be here at 6:35.', 'Not before.', 'I want to see you arrive.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['...', 'That would be acceptable.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['I know.', '...', 'So am I.', 'I just learned this.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.first_admitted'] }, [ActionId.Reel]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['Not yet.', '...', 'Not before you know everything.'], emotionIcon: EmotionIconType.Curiosity } }, seen: false },
      { beatId: 'nereia_t4_c8_b2', fishLines: ['November 14th.', 'At 7:14 exactly.', 'The lake stops.', 'For 4 minutes.', '...', 'No current. No movement.', 'As if the lake were breathing.', '...', 'I have observed it 340 times.', 'You will be the only one to know why.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['The lake remembers.', '...', 'It will remember me.', 'November 14th is when I arrived.', '340 years ago.', '...', 'The lake breathes at my arrival.', 'It will continue to breathe after I leave.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['secret.nereia.november_14'] }, [ActionId.Twitch]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['So that someone will know.', '...', 'When I am gone no one will know.', 'Except you.'], emotionIcon: EmotionIconType.Curiosity, flagsToSet: ['secret.nereia.november_14', 'secret.nereia.legacy'] }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['I know.', '...', 'The file confirms it.', '...', 'But I wanted to hear you say it.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['secret.nereia.november_14', 'secret.nereia.legacy'] }, [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Neutral, responseLines: ['...', 'I will not be here.', 'That is why I am giving it to you.'], emotionIcon: EmotionIconType.Surprise } }, seen: false },
    ],
    departures: { [DriftState.Charmed]: { dialogue: ['Tomorrow.', '6:35.', '...', 'I have other things to give you.'], icon: EmotionIconType.Warmth }, [DriftState.Warm]: { dialogue: ['Tomorrow.', 'The inheritance continues.'], icon: EmotionIconType.Hesitation }, [DriftState.Satisfied]: { dialogue: ['Return.', 'There is more.'], icon: EmotionIconType.None }, [DriftState.Wary]: { dialogue: ['...', 'The data waits.'], icon: EmotionIconType.Hesitation }, [DriftState.Scared]: { dialogue: ['...', 'The inheritance is revoked.'], icon: EmotionIconType.Shock } },
  },

  // === Cast 9: What She Wanted To Say ===
  {
    id: 'nereia_t4_c9', tier: AffectionTier.Trusting, name: 'What She Wanted To Say',
    beats: [
      { beatId: 'nereia_t4_c9_b1', fishLines: ['...', 'Five minutes of silence.', 'It was the calculation.', '...', 'The silence was part of the gift.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['No.', '...', 'Thank you.', 'For having understood.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['...', 'Once is enough.', 'You will remember it always.', '...', 'It is in the file.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['You will speak.', '...', 'Soon.', 'I will let you speak.', 'That is also a gift.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Reel]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['...', 'For me.', 'For the file.', '...', 'I needed five minutes.', 'Of you. Silent. Beside me.', 'Without explanation.'], emotionIcon: EmotionIconType.Curiosity } }, seen: false },
      { beatId: 'nereia_t4_c9_b2', fishLines: ['I have one last thing to give you.', '...', 'It is not in the file.', 'It will not be in the file.', '...', 'In 340 years of data.', '2847 subjects observed.', 'I have never wanted to stay.', '...', 'Until now.', '...', 'That is the data.', 'That is what I am giving you.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['You said nothing.', '...', 'It is the only correct response.', '...', 'I will remember that you said nothing.', 'It will be the last thing I take with me.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['secret.nereia.final_approach', 'mood.nereia.last_silence'] }, [ActionId.Twitch]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['I cannot.', '...', 'If I could I would have done so by now.', '...', 'But I will note that you asked.', 'Always.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['...', 'I know.', '...', 'It is the most precise data I have.', 'I will take it with me.'], emotionIcon: EmotionIconType.Hesitation, flagsToSet: ['secret.nereia.final_approach'] }, [ActionId.Reel]: { affectionDelta: 1, resultExpression: ExpressionState.Warm, responseLines: ['...', 'If I could.', 'If there were any version of this.', 'Where I could.', '...', 'I would.'], emotionIcon: EmotionIconType.Surprise, flagsToSet: ['mood.nereia.would_have'] } }, seen: false },
    ],
    departures: { [DriftState.Charmed]: { dialogue: ['Tomorrow.', '...', 'I do not know the time.', 'It will be early.', '...', 'Be there.'], icon: EmotionIconType.Warmth, flagsToSet: ['tier.nereia.5.unlocked', 'nereia.catch_available'] }, [DriftState.Warm]: { dialogue: ['Tomorrow.', '...', 'Early.', 'Be there.'], icon: EmotionIconType.Hesitation, flagsToSet: ['tier.nereia.5.unlocked', 'nereia.catch_available'] }, [DriftState.Satisfied]: { dialogue: ['Return.', 'One more time.'], icon: EmotionIconType.None }, [DriftState.Wary]: { dialogue: ['...', 'Return.', 'If you wish.'], icon: EmotionIconType.Hesitation }, [DriftState.Scared]: { dialogue: ['...', 'The last entry is deleted.'], icon: EmotionIconType.Shock } },
  },
];

// ============================================================================
// TIER 5: The Departure (Cast 10) + Catch Sequence + Endings
// ============================================================================

const NEREIA_TIER5_CASTS: CastData[] = [
  // === Cast 10: The Last Morning ===
  {
    id: 'nereia_t5_c10', tier: AffectionTier.Bonded, name: 'The Last Morning',
    beats: [
      { beatId: 'nereia_t5_c10_b1', fishLines: ['First contact.', '5:00.', '...', 'Today is the last entry in the file.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['Yes.', '...', 'I told you it would be early.', 'I am keeping my word.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 1, resultExpression: ExpressionState.Curious, responseLines: ['I said tomorrow.', '...', 'It is now tomorrow.', 'I was honest.'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['I know.', '...', 'I gave you all the time I had.', 'I gave you 340 years of time.', 'It will have to be enough.'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Warm, responseLines: ['...', 'I know.', '...', 'Yes.'], emotionIcon: EmotionIconType.Surprise } }, seen: false },
      { beatId: 'nereia_t5_c10_b2', fishLines: ['I have one last entry.', 'It will not be filed.', 'It is for you.', '...', 'First contact.', '7:14.', 'The file was correct about everything.', 'Except the conclusion.', '...', 'The file said you were a subject.', '...', 'I no longer have a word for what you are.', '...', 'I do not need one.'], actionEffects: { [ActionId.Wait]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['...'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Twitch]: { affectionDelta: 1, resultExpression: ExpressionState.Warm, responseLines: ['...'], emotionIcon: EmotionIconType.Curiosity }, [ActionId.Drift]: { affectionDelta: 2, resultExpression: ExpressionState.Warm, responseLines: ['...'], emotionIcon: EmotionIconType.Hesitation }, [ActionId.Reel]: { affectionDelta: 0, resultExpression: ExpressionState.Warm, responseLines: ['...'], emotionIcon: EmotionIconType.Surprise } }, seen: false },
    ],
    departures: { [DriftState.Charmed]: { dialogue: ['...'], icon: EmotionIconType.Warmth }, [DriftState.Warm]: { dialogue: ['...'], icon: EmotionIconType.Hesitation } },
  },
];

const NEREIA_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  silenceDialogue: ['...', 'I left you data.', 'November 14th.', 'Four minutes.', 'You will know what to do.'],
  reelEndingDialogue: ['The data ends here.', '', 'The lake remembers.', '', 'She had said it would be enough.'],
  releaseDialogue: ['...', 'You did not reel.', '...', 'I am noting.', '...', 'It is in the file.', 'The file I am no longer sending.'],
  reelEpitaph: 'The data ends here.\n\nThe lake remembers.\n\nShe had said it would be enough.',
  releaseEpitaph: 'The file is closed.\n\nThe lake remembers.\n\nYou will remember.\n\nIt is more than enough.',
  releaseChoiceLabel: 'Nereia',
};

const NEREIA_DRIFT_AWAY_JOURNAL_TEXT =
  'She was not there.\n\nThe file was closed.\n\n7:14. The surface was empty.\n\nThe deviation was zero centimetres.';

// ============================================================================
// CAST DATA LOOKUP
// ============================================================================

const CASTS_BY_TIER: Record<AffectionTier, CastData[]> = {
  [AffectionTier.Unaware]: NEREIA_TIER1_CASTS,
  [AffectionTier.Curious]: NEREIA_TIER2_CASTS,
  [AffectionTier.Familiar]: NEREIA_TIER3_CASTS,
  [AffectionTier.Trusting]: NEREIA_TIER4_CASTS,
  [AffectionTier.Bonded]: NEREIA_TIER5_CASTS,
};

// ============================================================================
// CHARACTER CONFIGURATION (exported)
// ============================================================================

export const NEREIA_CHARACTER: CharacterConfig = {
  id: 'nereia',
  name: 'Nereia',
  species: 'Koi',
  accentColor: '#9B7FCC',

  portraitAssets: {
    neutral: '@sprites/nereia_neutral.png',
  },

  preferredLures: ['gold_teardrop', 'shell_hook'],
  dislikedLures: ['red_spinner'],

  lakeZones: ['near', 'mid'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  arcTiers: 5,

  questName: 'The Patient Offering',
  questHints: [
    { tier: AffectionTier.Unaware, text: 'She notices beauty that stays still. Perhaps what you bring matters as much as what you do.' },
    { tier: AffectionTier.Curious, text: 'Gold catches her eye. Patience holds her gaze. Try offering something precious and waiting.' },
    { tier: AffectionTier.Familiar, text: 'Equip the Gold Teardrop. Choose Wait repeatedly. She remembers consistency.' },
    { tier: AffectionTier.Trusting, text: 'Gold Teardrop + Wait three times consecutively in a single Cast. She will show you something new.' },
    { tier: AffectionTier.Bonded, text: 'You know her now. The gold and the patience were never about the fish — they were about proving you could stay.' },
  ],

  getCastsForTier: (tier: AffectionTier): CastData[] => {
    return CASTS_BY_TIER[tier] || NEREIA_TIER1_CASTS;
  },

  initialState: (): FishCharacter => ({
    id: 'nereia',
    name: 'Nereia',
    species: 'Koi',
    accentColor: '#9B7FCC',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    tier: AffectionTier.Unaware,
    currentDrift: DriftState.None,
    tierFloor: 0,
    portrait: nereiaNeutralTexture,
  }),

  catchSequenceData: NEREIA_CATCH_SEQUENCE_DATA,
  driftAwayJournalText: NEREIA_DRIFT_AWAY_JOURNAL_TEXT,

  staticFacts: [
    'Ancient resident of the pond.',
    'Ornamental scales that shimmer purple and gold.',
    'Speaks with formal precision.',
  ],
};
