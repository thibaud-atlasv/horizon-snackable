/**
 * FallingObjUtils — pure scoring utilities shared by all falling object components.
 *
 * No SDK imports. No state. Safe to import from any component.
 *
 * Usage:
 *   const precision = getPrecision(this.getLowestY());
 *   const { pts, grade } = calcScore(precision);
 */

import {
  BONUS_START_Y,
  EARLY_DIST,
  FLOOR_Y,
  GOOD_DIST,
  GREAT_DIST,
  PERFECT_DIST,
  SCORE_BONUS_MAX,
  SCORE_EARLY,
  SCORE_GOOD,
  SCORE_GREAT,
  SCORE_MISS,
  SCORE_PERFECT,
} from './Constants';
import { ScoreGrade } from './Types';

/**
 * Returns how far the object has fallen through the scoring zone.
 * 0 = at PLAY_TOP (no score), 1 = at FLOOR_Y (perfect).
 */
export function getPrecision(lowestY: number): number {
  return Math.max(0, Math.min(1, (BONUS_START_Y - lowestY) / (BONUS_START_Y - FLOOR_Y)));
}

/**
 * Converts a precision value [0..1] into a grade + point total.
 * d = distance from perfect (1 - precision).
 */
export function calcScore(precision: number): { pts: number; grade: ScoreGrade } {
  const d = 1 - precision;

  let grade: ScoreGrade;
  let gradeBonus: number;
  if      (d <= PERFECT_DIST) { grade = ScoreGrade.Perfect; gradeBonus = SCORE_PERFECT; }
  else if (d <= GREAT_DIST)   { grade = ScoreGrade.Great;   gradeBonus = SCORE_GREAT;   }
  else if (d <= GOOD_DIST)    { grade = ScoreGrade.Good;    gradeBonus = SCORE_GOOD;    }
  else if (d <= EARLY_DIST)   { grade = ScoreGrade.Early;   gradeBonus = SCORE_EARLY;   }
  else                        { grade = ScoreGrade.Miss;    gradeBonus = SCORE_MISS;    }

  return { pts: gradeBonus + Math.round(precision * SCORE_BONUS_MAX), grade };
}
