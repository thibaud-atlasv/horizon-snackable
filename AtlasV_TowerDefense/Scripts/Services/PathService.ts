/**
 * PathService — Waypoint path management, world coordinate conversion, and path tile spawning.
 *
 * Reads PATH_WAYPOINTS_LEVEL_0 from LevelDefs in onReady(). Builds ISubPath segments.
 * prewarm(): spawns one tile per path cell using directional tile templates (straight/curve/grass).
 * getWorldPositionInSubPath(wpIndex, subT): interpolates world position along a segment.
 * getGlobalT(wpIndex, subT): converts segment position to global path progress (used for targeting).
 * isPathCell(col, row): checks if a grid cell is occupied by the path (blocks tower placement).
 * cellToWorld(col, row) / worldToCell(x, z): converts between grid coords and world coords.
 * Note: col → Z axis, row → X axis (row 0 = top of screen).
 *
 * Tile conventions (Y-up right-hand, col=Z, row=X):
 *   LeftToRight — straight tile, default open along Z axis (col direction).
 *                 Rotate Y=90° to open along X axis (row direction).
 *   DownToRight — curve tile, default: entry from down (+X), exit to right (+Z).
 *                 Rotations (Y, degrees): TBD once new tiles are tested in-game.
 *   End cap     — uses LeftToRight as placeholder.
 *   Grass       — filler tile for all non-path cells.
 */
import { Service, Vec3, WorldService, NetworkMode, Quaternion, NetworkingService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, GRID_ORIGIN_X, GRID_ORIGIN_Z, GROUND_Y } from '../Constants';
import { NewTiles } from '../Assets';
import { LEVEL_DEFS } from '../Defs/LevelDefs';

interface IPathSegment {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  length: number;
  cumLength: number;
}

interface ISubPath {
  segments: IPathSegment[];
  length: number;
}

@service()
export class PathService extends Service {
  private _waypoints: ReadonlyArray<readonly [number, number]> = [];
  private _subPaths:   ISubPath[] = [];
  private _segments:   IPathSegment[] = [];
  private _totalLength: number = 0;
  private _pathCells:  Set<number> = new Set();
  private _worldService: WorldService = Service.inject(WorldService);

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._waypoints = LEVEL_DEFS[0].pathWaypoints;
    this._buildPath();
  }

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    const spawns: Array<Promise<void>> = [];

    // Spawn decoration tiles for every non-path cell (weighted random)
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.isPathCell(col, row)) continue;
        const pos = this.cellToWorld(col, row);
        spawns.push(
          this._worldService.spawnTemplate({
            templateAsset: this._pickDecoTile(),
            position: new Vec3(pos.x, GROUND_Y, pos.z),
            rotation: Quaternion.identity,
            scale: Vec3.one.mul(CELL_SIZE),
            networkMode: NetworkMode.LocalOnly,
          }).catch((e: unknown) => { console.error(e); }) as Promise<void>,
        );
      }
    }

    // Spawn directional path tiles cell by cell
    // Build a map from cell key → [inDir, outDir] for each path cell
    // Directions: 0=+row(down-screen), 1=+col(right), 2=-row(up-screen), 3=-col(left)
    const cellDirs = new Map<number, [number, number]>();
    for (let i = 0; i < this._waypoints.length - 1; i++) {
      const [c0, r0] = this._waypoints[i];
      const [c1, r1] = this._waypoints[i + 1];
      const dc = Math.sign(c1 - c0);
      const dr = Math.sign(r1 - r0);
      // outDir for this segment: dr>0 → 0 (down), dc>0 → 1 (right), dr<0 → 2 (up), dc<0 → 3 (left)
      const outDir = dr > 0 ? 0 : dc > 0 ? 1 : dr < 0 ? 2 : 3;
      const inDir  = (outDir + 2) % 4; // opposite

      const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
      for (let step = 0; step <= steps; step++) {
        const col = Math.round(c0 + (c1 - c0) * (step / steps));
        const row = Math.round(r0 + (r1 - r0) * (step / steps));
        const key = col * 100 + row;
        const existing = cellDirs.get(key);
        if (!existing) {
          // First time seeing this cell — store incoming/outgoing from this segment
          // For intermediate cells both in and out are the same direction pair
          cellDirs.set(key, [inDir, outDir]);
        } else {
          // Corner cell: it was the endpoint of the previous segment (outDir recorded)
          // and now it's the start of this segment — update outDir
          cellDirs.set(key, [existing[0], outDir]);
        }
      }
    }

    // Identify entry/exit cells: first and last in-bounds cells of the path
    const firstWp = this._waypoints[0];
    const lastWp  = this._waypoints[this._waypoints.length - 1];
    const entryKey = firstWp[0] * 100 + Math.max(0, firstWp[1]);
    const exitKey  = lastWp[0]  * 100 + Math.min(GRID_ROWS - 1, lastWp[1]);

    for (const [key, [inDir, outDir]] of cellDirs) {
      const col = Math.floor(key / 100);
      const row = key % 100;
      // Skip out-of-bounds cells (entry/exit waypoints outside grid)
      if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) continue;
      const pos = this.cellToWorld(col, row);

      // End-cap tiles: open toward the path, closed away from grid
      // RightToLeftEnd default: open +Z (right), closed -Z (left)
      // Entry row=0: path exits downward (+row = +X), cap closes upward → rotY=90
      // Exit row=GRID_ROWS-1: path enters from above (-row = -X), cap closes downward → rotY=270
      if (key === entryKey) {
        spawns.push(
          this._worldService.spawnTemplate({
            templateAsset: NewTiles.LeftToRight,
            position: new Vec3(pos.x, GROUND_Y, pos.z),
            rotation: Quaternion.fromEuler(new Vec3(0, -90, 0)),
            scale: Vec3.one.mul(CELL_SIZE),
            networkMode: NetworkMode.LocalOnly,
          }).catch((e: unknown) => { console.error(e); }) as Promise<void>,
        );
        continue;
      }
      if (key === exitKey) {
        spawns.push(
          this._worldService.spawnTemplate({
            templateAsset: NewTiles.LeftToRight,
            position: new Vec3(pos.x, GROUND_Y, pos.z),
            rotation: Quaternion.fromEuler(new Vec3(0, 90, 0)),
            scale: Vec3.one.mul(CELL_SIZE),
            networkMode: NetworkMode.LocalOnly,
          }).catch((e: unknown) => { console.error(e); }) as Promise<void>,
        );
        continue;
      }

      const isCurve = inDir !== outDir && (inDir + 2) % 4 !== outDir;
      const { template, rotY } = isCurve
        ? this._curveRotation(inDir, outDir)
        : { template: NewTiles.LeftToRight, rotY: (inDir === 0 || inDir === 2) ? 90 : 0 };

      spawns.push(
        this._worldService.spawnTemplate({
          templateAsset: template,
          position: new Vec3(pos.x, GROUND_Y, pos.z),
          rotation: Quaternion.fromEuler(new Vec3(0, rotY, 0)),
          scale: Vec3.one.mul(CELL_SIZE),
          networkMode: NetworkMode.LocalOnly,
        }).catch((e: unknown) => { console.error(e); }) as Promise<void>,
      );
    }

    await Promise.all(spawns);
  }

  // Returns the DownToRight template + Y rotation for a curve cell.
  // Directions: 0=down(+row), 1=right(+col), 2=up(-row), 3=left(-col)
  // DownToRight default: entry from down (0), exit to right (1) → rotY=0
  private _curveRotation(inDir: number, outDir: number): { template: typeof NewTiles.DownToRight; rotY: number } {
    const key = `${inDir},${outDir}`;
    const rotMap: Record<string, number> = {
      '2,1': 90,   // top→right    ✅
      '2,3': 180,  // top→left     ✅
      '1,0': 0,    // right→bottom ✅
      '3,0': 270,  // left→bottom  (corrected)
      // Reversed traversal
      '1,2': 270,
      '3,2': 180,  // left→top     (swapped with 0,1)
      '0,1': 0,    // bottom→right (swapped with 3,2)
      '0,3': 270,
    };
    return { template: NewTiles.DownToRight, rotY: rotMap[key] ?? 0 };
  }

  // Decoration tile for non-path cells — all grass with new tiles.
  private _pickDecoTile(): typeof NewTiles.Grass {
    return NewTiles.Grass;
  }

  get totalLength(): number { return this._totalLength; }

  getWaypointCount(): number { return this._waypoints.length; }

  getSubPathLength(wpIndex: number): number {
    return this._subPaths[wpIndex]?.length ?? 0;
  }

  getWorldPositionInSubPath(wpIndex: number, subT: number): Vec3 {
    const sub = this._subPaths[wpIndex];
    if (!sub || sub.segments.length === 0) {
      const [c, r] = this._waypoints[Math.min(wpIndex, this._waypoints.length - 1)];
      return this.cellToWorld(c, r);
    }
    const t = Math.max(0, Math.min(subT, sub.length));
    for (const seg of sub.segments) {
      const localT = t - seg.cumLength;
      if (localT <= seg.length) {
        const alpha = seg.length > 0 ? localT / seg.length : 0;
        return new Vec3(
          seg.startX + (seg.endX - seg.startX) * alpha,
          GROUND_Y,
          seg.startZ + (seg.endZ - seg.startZ) * alpha,
        );
      }
    }
    const last = sub.segments[sub.segments.length - 1];
    return new Vec3(last.endX, GROUND_Y, last.endZ);
  }

  getGlobalT(wpIndex: number, subT: number): number {
    let total = 0;
    for (let i = 0; i < wpIndex && i < this._subPaths.length; i++) {
      total += this._subPaths[i].length;
    }
    return total + subT;
  }

  isPathCell(col: number, row: number): boolean {
    return this._pathCells.has(col * 100 + row);
  }

  // col → Z axis, row → X axis (row 0 = top)
  cellToWorld(col: number, row: number): Vec3 {
    return new Vec3(
      GRID_ORIGIN_X + (GRID_ROWS - 1 - row) * CELL_SIZE,
      GROUND_Y,
      GRID_ORIGIN_Z + col * CELL_SIZE,
    );
  }

  worldToCell(worldX: number, worldZ: number): readonly [number, number] {
    const col = Math.round((worldZ - GRID_ORIGIN_Z) / CELL_SIZE);
    const row = GRID_ROWS - 1 - Math.round((worldX - GRID_ORIGIN_X) / CELL_SIZE);
    return [col, row] as const;
  }

  getWorldPositionAtT(pathT: number): Vec3 {
    const t = Math.max(0, Math.min(pathT, this._totalLength));
    for (const seg of this._segments) {
      const localT = t - seg.cumLength;
      if (localT <= seg.length) {
        const alpha = seg.length > 0 ? localT / seg.length : 0;
        return new Vec3(
          seg.startX + (seg.endX - seg.startX) * alpha,
          GROUND_Y,
          seg.startZ + (seg.endZ - seg.startZ) * alpha,
        );
      }
    }
    const last = this._segments[this._segments.length - 1];
    return new Vec3(last.endX, GROUND_Y, last.endZ);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _buildPath(): void {
    this._subPaths  = [];
    this._segments  = [];
    this._pathCells = new Set();
    let globalCum   = 0;

    for (let i = 0; i < this._waypoints.length - 1; i++) {
      const [c0, r0] = this._waypoints[i];
      const [c1, r1] = this._waypoints[i + 1];

      const start = this.cellToWorld(c0, r0);
      const end   = this.cellToWorld(c1, r1);
      const dx     = end.x - start.x;
      const dz     = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      const subSeg: IPathSegment = { startX: start.x, startZ: start.z, endX: end.x, endZ: end.z, length, cumLength: 0 };
      this._subPaths.push({ segments: [subSeg], length });
      this._segments.push({ ...subSeg, cumLength: globalCum });
      globalCum += length;

      // Mark all cells along this waypoint segment
      const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
      for (let step = 0; step <= steps; step++) {
        const col = Math.round(c0 + (c1 - c0) * (step / steps));
        const row = Math.round(r0 + (r1 - r0) * (step / steps));
        this._pathCells.add(col * 100 + row);
      }
    }

    this._totalLength = globalCum;
  }
}
