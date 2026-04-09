import { LocalEvent } from 'meta/worlds';

/**
 * Payload for ShotFeedbackResultEvent.
 * outcome matches ShotOutcome const enum:
 *   0 = Goal, 1 = Save, 2 = PostHit, 3 = Miss
 */
export class ShotFeedbackResultPayload {
  outcome: number = 0;
  pointsEarned: number = 0;
}

export const ShotFeedbackResultEvent = new LocalEvent<ShotFeedbackResultPayload>(
  'EvShotFeedbackResult',
  ShotFeedbackResultPayload,
);
