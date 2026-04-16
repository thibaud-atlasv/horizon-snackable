import { Service, service, subscribe, EventService } from 'meta/worlds';
import { Events } from '../Types';
import type { IShapeInstance, IOption } from '../Types';
import {
  SHAPE_COUNT_BASE,
  SHAPE_COUNT_MAX,
  DIFFICULTY_SCALE,
  OPTION_COUNT,
  SHAPES_X_MIN,
  SHAPES_X_MAX,
  SHAPES_Y_MIN,
  SHAPES_Y_MAX,
  SHAPE_SIZE_MIN,
  SHAPE_SIZE_MAX,
  SHAPE_ROTATION_MAX_DEG,
  SHAPE_JITTER,
  DEBUG_COLOR_FILTER,
  DEBUG_EDGE_TEST,
} from '../Constants';
import { COLOR_KEYS, SHAPE_KEYS } from '../Defs/ShapeDefs';
import type { ColorKey, ShapeKey } from '../Defs/ShapeDefs';

/**
 * Generates round data: shape instances placed on the canvas and the 4 answer options.
 *
 * Algorithm:
 *   1. Build all ShapeKey × ColorKey pairs, shuffle them
 *   2. The first pair is the ABSENT one (= correct answer)
 *   3. Fill the canvas with the remaining pairs (cycled)
 *   4. Collect 3 pairs confirmed present in the canvas as distractors
 *   5. Shuffle [absentPair, ...distractors] → options[]
 */
@service()
export class RoundService extends Service {
  private _round: number = 0;

  @subscribe(Events.GameStarted)
  onGameStarted(_p: Events.GameStartedPayload): void {
    this._round = 0;
    this._generateAndSend();
  }

  @subscribe(Events.NextRoundRequested)
  onNextRoundRequested(_p: Events.NextRoundRequestedPayload): void {
    this._generateAndSend();
  }

  private _generateAndSend(): void {
    this._round++;

    const difficulty = 1 + this._round * DIFFICULTY_SCALE;
    const shapeCount = Math.min(
      Math.floor(SHAPE_COUNT_BASE * difficulty),
      SHAPE_COUNT_MAX,
    );

    const activeColors = DEBUG_COLOR_FILTER.length > 0
      ? COLOR_KEYS.filter(c => DEBUG_COLOR_FILTER.includes(c))
      : COLOR_KEYS;

    const allPairs: IOption[] = [];
    for (const typeKey of SHAPE_KEYS) {
      for (const colorKey of activeColors) {
        allPairs.push({ typeKey, colorKey });
      }
    }
    shuffle(allPairs);

    const absentPair   = allPairs[0];
    const presentPairs = allPairs.slice(1);

    const shapes = buildShapes(shapeCount, presentPairs);

    const uniquePresent = uniquePairsInShapes(shapes);
    shuffle(uniquePresent);
    const distractors = uniquePresent.slice(0, OPTION_COUNT - 1);

    const options: IOption[] = [absentPair, ...distractors];
    shuffle(options);

    const correctIndex = options.findIndex(
      o => o.typeKey === absentPair.typeKey && o.colorKey === absentPair.colorKey,
    );

    EventService.sendLocally(Events.RoundStarted, {
      round: this._round,
      shapes,
      options,
      correctIndex,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildShapes(count: number, presentPairs: IOption[]): IShapeInstance[] {
  if (DEBUG_EDGE_TEST) return buildEdgeTestShapes(presentPairs);

  const areaW = SHAPES_X_MAX - SHAPES_X_MIN;
  const areaH = SHAPES_Y_MAX - SHAPES_Y_MIN;
  const cols  = Math.ceil(Math.sqrt(count));
  const rows  = Math.ceil(count / cols);
  const cellW = areaW / cols;
  const cellH = areaH / rows;

  // Shuffle cell indices to break the visual row/column pattern
  const cellIndices = Array.from({ length: cols * rows }, (_, i) => i);
  shuffle(cellIndices);

  const shapes: IShapeInstance[] = [];
  for (let i = 0; i < count; i++) {
    const base = presentPairs[i % presentPairs.length];
    const cell = cellIndices[i];
    const col  = cell % cols;
    const row  = Math.floor(cell / cols);
    const size = cellW * (SHAPE_SIZE_MIN + Math.random() * (SHAPE_SIZE_MAX - SHAPE_SIZE_MIN));
    // rawX/rawY are the desired center of the shape
    const rawX = SHAPES_X_MIN + cellW * (col + 0.5 + (Math.random() - 0.5) * SHAPE_JITTER);
    const rawY = SHAPES_Y_MIN + cellH * (row + 0.5 + (Math.random() - 0.5) * SHAPE_JITTER);
    shapes.push({
      typeKey:  base.typeKey  as ShapeKey,
      colorKey: base.colorKey as ColorKey,
      rotation: (Math.random() * 2 - 1) * SHAPE_ROTATION_MAX_DEG * (Math.PI / 180),
      x: Math.max(SHAPES_X_MIN + size / 2, Math.min(SHAPES_X_MAX - size / 2, rawX)),
      y: Math.max(SHAPES_Y_MIN + size / 2, Math.min(SHAPES_Y_MAX - size / 2, rawY)),
      size,
    });
  }
  return shapes;
}

function buildEdgeTestShapes(presentPairs: IOption[]): IShapeInstance[] {
  // size as fraction of canvas [0..1]; x/y are centers
  const size = 0.15;
  const xMin = SHAPES_X_MIN + size / 2;
  const xMax = SHAPES_X_MAX - size / 2;
  const xMid = (SHAPES_X_MIN + SHAPES_X_MAX) / 2;
  const yMin = SHAPES_Y_MIN + size / 2;
  const yMax = SHAPES_Y_MAX - size / 2;
  const yMid = (SHAPES_Y_MIN + SHAPES_Y_MAX) / 2;

  const positions = [
    { x: xMin, y: yMin },  // top-left
    { x: xMid, y: yMin },  // top-center
    { x: xMax, y: yMin },  // top-right
    { x: xMin, y: yMid },  // middle-left
    { x: xMax, y: yMid },  // middle-right
    { x: xMin, y: yMax },  // bottom-left
    { x: xMid, y: yMax },  // bottom-center
    { x: xMax, y: yMax },  // bottom-right
  ];

  return positions.map((pos, i) => ({
    typeKey:  presentPairs[0].typeKey  as ShapeKey,
    colorKey: presentPairs[i % presentPairs.length].colorKey as ColorKey,
    rotation: 0,
    x:        pos.x,
    y:        pos.y,
    size,
  }));
}

function uniquePairsInShapes(shapes: IShapeInstance[]): IOption[] {
  const seen   = new Set<string>();
  const unique: IOption[] = [];
  for (const s of shapes) {
    const key = `${s.typeKey}|${s.colorKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ typeKey: s.typeKey, colorKey: s.colorKey });
    }
  }
  return unique;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
