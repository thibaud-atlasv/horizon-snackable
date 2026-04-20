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
  DEBUG_EDGE_TEST,
} from '../Constants';
import { SHAPE_KEYS } from '../Defs/ShapeDefs';
import type { ShapeKey } from '../Defs/ShapeDefs';

/**
 * Generates round data: shape instances placed on the canvas and the 4 answer options.
 *
 * Algorithm:
 *   1. Shuffle all ShapeKeys
 *   2. The first key is the ABSENT one (= correct answer)
 *   3. Fill the canvas with the remaining keys (cycled)
 *   4. Collect 3 keys confirmed present in the canvas as distractors
 *   5. Shuffle [absentKey, ...distractors] → options[]
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

    const keys = [...SHAPE_KEYS];
    shuffle(keys);

    const absentKey   = keys[0];
    const presentKeys = keys.slice(1);

    const shapes = buildShapes(shapeCount, presentKeys);

    const uniquePresent = uniqueKeysInShapes(shapes);
    shuffle(uniquePresent);
    const distractors = uniquePresent.slice(0, OPTION_COUNT - 1);

    const options: IOption[] = [{ typeKey: absentKey }, ...distractors.map(k => ({ typeKey: k }))];
    shuffle(options);

    const correctIndex = options.findIndex(o => o.typeKey === absentKey);

    EventService.sendLocally(Events.RoundStarted, {
      round: this._round,
      shapes,
      options,
      correctIndex,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildShapes(count: number, presentKeys: ShapeKey[]): IShapeInstance[] {
  if (DEBUG_EDGE_TEST) return buildEdgeTestShapes(presentKeys);

  const areaW = SHAPES_X_MAX - SHAPES_X_MIN;
  const areaH = SHAPES_Y_MAX - SHAPES_Y_MIN;
  const cols  = Math.ceil(Math.sqrt(count));
  const rows  = Math.ceil(count / cols);
  const cellW = areaW / cols;
  const cellH = areaH / rows;

  const cellIndices = Array.from({ length: cols * rows }, (_, i) => i);
  shuffle(cellIndices);

  const shapes: IShapeInstance[] = [];
  for (let i = 0; i < count; i++) {
    const typeKey = presentKeys[i % presentKeys.length];
    const cell    = cellIndices[i];
    const col     = cell % cols;
    const row     = Math.floor(cell / cols);
    const size    = cellW * (SHAPE_SIZE_MIN + Math.random() * (SHAPE_SIZE_MAX - SHAPE_SIZE_MIN));
    const rawX    = SHAPES_X_MIN + cellW * (col + 0.5 + (Math.random() - 0.5) * SHAPE_JITTER);
    const rawY    = SHAPES_Y_MIN + cellH * (row + 0.5 + (Math.random() - 0.5) * SHAPE_JITTER);
    shapes.push({
      typeKey,
      rotation: (Math.random() * 2 - 1) * SHAPE_ROTATION_MAX_DEG * (Math.PI / 180),
      x: Math.max(SHAPES_X_MIN + size / 2, Math.min(SHAPES_X_MAX - size / 2, rawX)),
      y: Math.max(SHAPES_Y_MIN + size / 2, Math.min(SHAPES_Y_MAX - size / 2, rawY)),
      size,
    });
  }
  return shapes;
}

function buildEdgeTestShapes(presentKeys: ShapeKey[]): IShapeInstance[] {
  const size = 0.15;
  const xMin = SHAPES_X_MIN + size / 2;
  const xMax = SHAPES_X_MAX - size / 2;
  const xMid = (SHAPES_X_MIN + SHAPES_X_MAX) / 2;
  const yMin = SHAPES_Y_MIN + size / 2;
  const yMax = SHAPES_Y_MAX - size / 2;
  const yMid = (SHAPES_Y_MIN + SHAPES_Y_MAX) / 2;

  const positions = [
    { x: xMin, y: yMin },
    { x: xMid, y: yMin },
    { x: xMax, y: yMin },
    { x: xMin, y: yMid },
    { x: xMax, y: yMid },
    { x: xMin, y: yMax },
    { x: xMid, y: yMax },
    { x: xMax, y: yMax },
  ];

  return positions.map((pos, i) => ({
    typeKey:  presentKeys[i % presentKeys.length],
    rotation: 0,
    x:        pos.x,
    y:        pos.y,
    size,
  }));
}

function uniqueKeysInShapes(shapes: IShapeInstance[]): ShapeKey[] {
  const seen  = new Set<string>();
  const unique: ShapeKey[] = [];
  for (const s of shapes) {
    if (!seen.has(s.typeKey)) {
      seen.add(s.typeKey);
      unique.push(s.typeKey as ShapeKey);
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
