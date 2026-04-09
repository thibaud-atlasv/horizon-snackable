import {
  Color,
  ColorComponent,
  component,
  Component,
  FocusedInteractionService,
  NetworkMode,
  OnEntityStartEvent,
  OnFocusedInteractionInputEventPayload,
  OnFocusedInteractionInputMovedEvent,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputEndedEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  property,
  Quaternion,
  subscribe,
  TemplateAsset,
  TransformComponent,
  Vec3,
  WorldService,
  type Entity,
} from 'meta/worlds';

// ---------------------------------------------------------------------------
// Color Constants
// ---------------------------------------------------------------------------
const C_CURSOR_NO = new Color(1.0,0.2,0.2,0.7);
const C_GOLD    = new Color(1.0,0.85,0.1,1);
const C_LIVES   = new Color(1.0,0.4,0.4,1);
const C_WAVE    = new Color(0.4,0.8,1.0,1);
const C_TEXT    = new Color(0.4,0.8,1.0,1);

// Terrain
const C_GRASS  = new Color(0.18, 0.55, 0.22, 1);
const C_PATH   = new Color(0.45, 0.36, 0.24, 1);
const C_BORDER = new Color(0.15, 0.15, 0.15, 1);

// Cursor
const C_CURSOR_OK   = new Color(0.3, 1.0, 0.3, 0.8);
const C_CURSOR_BAD  = new Color(1.0, 0.2, 0.2, 0.8);

// UI
const C_UI_TEXT     = new Color(1.0, 1.0, 1.0, 1);
const C_UI_TEXT_OFF = new Color(1.0, 1.0, 1.0, 1);
const C_UI_BG       = new Color(0.05,0.05,0.08,0.88);
const C_UI_BG_OFF   = new Color(0.18,0.04,0.04,0.88);

// HP Bars
const C_HP_FULL = new Color(0.1, 1.0, 0.1, 1);
const C_HP_MID  = new Color(1.0, 0.8, 0.1, 1);
const C_HP_LOW  = new Color(1.0, 0.1, 0.1, 1);

// Range ring
const C_RANGE_RING = new Color(1.0, 1.0, 0.3, 0.55);

// Tower projectiles
const C_PROJ_ARROW  = new Color(1.0, 0.9, 0.3, 1);
const C_PROJ_CANNON = new Color(1.0, 0.5, 0.1, 1);
const C_PROJ_FROST  = new Color(0.5, 0.8, 1.0, 1);
const C_PROJ_LASER  = new Color(1.0, 0.1, 0.8, 1);

// Tower bases
const C_TOWER_ARROW_BASE  = new Color(0.3, 0.8, 0.15, 1);
const C_TOWER_ARROW_TOP   = new Color(1, 1.0, 0.2, 1);

const C_TOWER_CANNON_BASE = new Color(0.45, 0.25, 0.08, 1);
const C_TOWER_CANNON_TOP  = new Color(0.7, 0.4, 0.15, 1);

const C_TOWER_FROST_BASE  = new Color(0.15, 0.4, 0.75, 1);
const C_TOWER_FROST_TOP   = new Color(0.5, 0.85, 1.0, 1);

const C_TOWER_LASER_BASE  = new Color(0.35, 0.0, 0.45, 1);
const C_TOWER_LASER_TOP   = new Color(0.85, 0.15, 1.0, 1);

// Enemy colors
const C_ENEMY_BASIC = new Color(0.9, 0.2, 0.2, 1);
const C_ENEMY_FAST  = new Color(1.0, 0.7, 0.1, 1);
const C_ENEMY_TANK  = new Color(0.3, 0.3, 0.9, 1);
const C_ENEMY_BOSS  = new Color(0.7, 0.0, 0.7, 1);
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_W         = 18;
const GRID_H         = 18;
const S              = 0.06;   // CELL_SPACING
const PARK_POS       = new Vec3(0, 999, 0);
const HALF_W         = (GRID_W - 1) * S / 2;
const HALF_H         = (GRID_H - 1) * S / 2;

const POOL_CUBES     = 500;
const POOL_SPHERES   = 100;
const POOL_CYLINDERS = 80;

// Z layers (negative = toward viewer)
const Z_GROUND       =  0.000;
const Z_PATH         = -0.002;
const Z_TOWER_BASE   = -0.012;
const Z_TOWER_TOP    = -0.022;
const Z_TIER_GEM     = -0.030;  // tier indicator gems above barrel
const Z_ENEMY        = -0.016;
const Z_PROJ         = -0.028;
const Z_RANGE        = -0.008;  // range ring — just above path
const Z_UI           = -0.040;
const Z_BACKDROP     = -0.034;

const LIVES_START    = 20;
const GOLD_START     = 150;
const WAVE_PAUSE     = 5.0;
const ENEMY_SPACING  = 0.35;
const BORDER_WAVE    = 1.8;
const RAINBOW_SPEED  = 2.5;

const Z_BG   = Z_UI+0.04;   // background
const Z_TXT  = Z_UI-0.04;   // text/pixels well in front

// Income: % of remaining gold awarded at wave end
const INCOME_RATE    = 0.10;  // 10% of gold on hand → bonus

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

const PATH_WAYPOINTS: Array<[number,number]> = [
  [0,3],[4,3],[4,7],[2,7],[2,12],
  [6,12],[6,8],[10,8],[10,14],[14,14],
  [14,5],[17,5],
];

interface PathPoint { wx: number; wy: number; cumLen: number; }

function buildPathPoints(): PathPoint[] {
  const pts: PathPoint[] = [];
  let cum = 0;
  for (let i = 0; i < PATH_WAYPOINTS.length; i++) {
    const [c,r] = PATH_WAYPOINTS[i];
    if (i > 0) {
      const [pc,pr] = PATH_WAYPOINTS[i-1];
      cum += Math.sqrt((c-pc)**2+(r-pr)**2);
    }
    pts.push({ wx: c*S, wy: r*S, cumLen: cum });
  }
  return pts;
}
const PATH_POINTS = buildPathPoints();
const PATH_LENGTH = PATH_POINTS[PATH_POINTS.length-1].cumLen;

function pathPosAt(t: number): {wx:number;wy:number} {
  if (t <= 0) return {wx:PATH_POINTS[0].wx, wy:PATH_POINTS[0].wy};
  if (t >= PATH_LENGTH) return {wx:PATH_POINTS[PATH_POINTS.length-1].wx, wy:PATH_POINTS[PATH_POINTS.length-1].wy};
  for (let i=1;i<PATH_POINTS.length;i++) {
    if (PATH_POINTS[i].cumLen >= t) {
      const a=PATH_POINTS[i-1], b=PATH_POINTS[i];
      const f=(t-a.cumLen)/(b.cumLen-a.cumLen);
      return {wx:a.wx+(b.wx-a.wx)*f, wy:a.wy+(b.wy-a.wy)*f};
    }
  }
  return {wx:PATH_POINTS[PATH_POINTS.length-1].wx, wy:PATH_POINTS[PATH_POINTS.length-1].wy};
}

function buildPathCells(): Set<string> {
  const s = new Set<string>();
  for (let i=0;i<PATH_WAYPOINTS.length-1;i++) {
    const [c0,r0]=PATH_WAYPOINTS[i],[c1,r1]=PATH_WAYPOINTS[i+1];
    const steps=Math.max(Math.abs(c1-c0),Math.abs(r1-r0));
    for (let k=0;k<=steps;k++) {
      s.add(`${Math.round(c0+(c1-c0)*k/steps)},${Math.round(r0+(r1-r0)*k/steps)}`);
    }
  }
  return s;
}
const PATH_CELLS = buildPathCells();

// ---------------------------------------------------------------------------
// Upgrade tree
// ---------------------------------------------------------------------------

type TowerType = 'ARROW'|'CANNON'|'FROST'|'LASER';

interface UpgradeDef {
  label: string;     // short 4-char label for display
  cost:  number;
  // stat deltas applied on top of current tower stats
  dmgMult:    number;  // multiplier on damage
  rangeMult:  number;
  rateMult:   number;
  splashAdd:  number;
  slowAdd:    number;
}

// Each tower has tier1 base, then chooses branch A or B at tier2, then A or B at tier3
// upgrades[0] = tier2-A, [1] = tier2-B, [2] = tier3-A (from T2A), [3] = tier3-B (from T2A),
//               [4] = tier3-A (from T2B), [5] = tier3-B (from T2B)
const UPGRADE_TREE: Record<TowerType, UpgradeDef[]> = {
  ARROW: [
    {label:'DMG', cost:60,  dmgMult:1.8, rangeMult:1.0, rateMult:1.0, splashAdd:0,   slowAdd:0},
    {label:'SPD', cost:60,  dmgMult:1.0, rangeMult:1.0, rateMult:1.6, splashAdd:0,   slowAdd:0},
    {label:'DMG', cost:120, dmgMult:2.0, rangeMult:1.0, rateMult:1.0, splashAdd:0,   slowAdd:0},
    {label:'RAD', cost:120, dmgMult:1.0, rangeMult:1.0, rateMult:1.0, splashAdd:0.6, slowAdd:0},
    {label:'SPD', cost:120, dmgMult:1.0, rangeMult:1.0, rateMult:2.0, splashAdd:0,   slowAdd:0},
    {label:'RNG', cost:120, dmgMult:1.0, rangeMult:1.8, rateMult:1.0, splashAdd:0,   slowAdd:0},
  ],
  CANNON: [
    {label:'RAD', cost:80,  dmgMult:1.0, rangeMult:1.0, rateMult:1.0, splashAdd:0.8, slowAdd:0},
    {label:'DMG', cost:80,  dmgMult:2.2, rangeMult:1.0, rateMult:1.0, splashAdd:0,   slowAdd:0},
    {label:'RAD', cost:160, dmgMult:1.0, rangeMult:1.0, rateMult:1.0, splashAdd:1.5, slowAdd:0},
    {label:'SPD', cost:160, dmgMult:1.0, rangeMult:1.3, rateMult:1.5, splashAdd:0,   slowAdd:0},
    {label:'DMG', cost:160, dmgMult:3.0, rangeMult:1.0, rateMult:1.0, splashAdd:0,   slowAdd:0},
    {label:'SPD', cost:160, dmgMult:1.0, rangeMult:1.0, rateMult:1.8, splashAdd:0,   slowAdd:0},
  ],
  FROST: [
    {label:'SLW', cost:70,  dmgMult:1.0, rangeMult:1.0, rateMult:1.0, splashAdd:0,   slowAdd:0.25},
    {label:'RAD', cost:70,  dmgMult:1.0, rangeMult:1.0, rateMult:1.0, splashAdd:0.65, slowAdd:0},
    {label:'RNG', cost:140, dmgMult:1.0, rangeMult:1.3, rateMult:1.0, splashAdd:0, slowAdd:0},
    {label:'SLW', cost:140, dmgMult:1.0, rangeMult:1.0, rateMult:1.0, splashAdd:0,   slowAdd:0.2},
    {label:'SPD', cost:140, dmgMult:1.0, rangeMult:1.0, rateMult:1.5, splashAdd:0, slowAdd:0},
    {label:'DMG', cost:140, dmgMult:5.0, rangeMult:1.0, rateMult:1.0, splashAdd:0, slowAdd:0},
  ],
  LASER: [
    {label:'RNG', cost:120, dmgMult:1.0, rangeMult:1.3, rateMult:1.0, splashAdd:0,   slowAdd:0},
    {label:'SPD', cost:120, dmgMult:1.0, rangeMult:1.0, rateMult:2.0, splashAdd:0,   slowAdd:0},
    {label:'DMG', cost:240, dmgMult:2.0, rangeMult:1.0, rateMult:1.0, splashAdd:0,   slowAdd:0},
    {label:'RAD', cost:240, dmgMult:1.0, rangeMult:1.0, rateMult:1.0, splashAdd:0.8, slowAdd:0},
    {label:'SPD', cost:240, dmgMult:1.0, rangeMult:1.0, rateMult:2.0, splashAdd:0,   slowAdd:0},
    {label:'DMG', cost:240, dmgMult:3.0, rangeMult:1.0, rateMult:1.0, splashAdd:0,   slowAdd:0},
  ],
};

interface TowerBaseDef {
  name:       TowerType;
  cost:       number;
  damage:     number;
  range:      number;
  fireRate:   number;
  projSpeed:  number;
  projColor:  Color;
  baseColor:  Color;
  topColor:   Color;
  splash:     number;
  slow:       number;
}

const TOWER_BASES: Record<TowerType, TowerBaseDef> = {
  ARROW: {name:'ARROW', cost:50,  damage:12, range:4.5, fireRate:1.5, projSpeed:14,
    projColor:C_PROJ_ARROW, baseColor:C_TOWER_ARROW_BASE, topColor:C_TOWER_ARROW_TOP, splash:0, slow:0},
  CANNON:{name:'CANNON',cost:100, damage:40, range:3.5, fireRate:0.6, projSpeed:9,
    projColor:C_PROJ_CANNON, baseColor:C_TOWER_CANNON_BASE, topColor:C_TOWER_CANNON_TOP, splash:1.2,slow:0},
  FROST: {name:'FROST', cost:80,  damage:5,  range:3.8, fireRate:1.0, projSpeed:11,
    projColor:C_PROJ_FROST, baseColor:C_TOWER_FROST_BASE, topColor:C_TOWER_FROST_TOP, splash:0.8,slow:0.5},
  LASER: {name:'LASER', cost:200, damage:8,  range:6.0, fireRate:5.0, projSpeed:25,
    projColor:C_PROJ_LASER, baseColor:C_TOWER_LASER_BASE, topColor:C_TOWER_LASER_TOP, splash:0, slow:0},
};

const TOWER_ORDER: TowerType[] = ['ARROW','CANNON','FROST','LASER'];

// ---------------------------------------------------------------------------
// Runtime tower stats (base + applied upgrades)
// ---------------------------------------------------------------------------

interface TowerStats {
  damage:    number;
  range:     number;
  fireRate:  number;
  projSpeed: number;
  splash:    number;
  slow:      number;
}

function applyUpgrade(stats: TowerStats, u: UpgradeDef): TowerStats {
  return {
    damage:    stats.damage    * u.dmgMult,
    range:     stats.range     * u.rangeMult,
    fireRate:  stats.fireRate  * u.rateMult,
    projSpeed: stats.projSpeed,
    splash:    stats.splash    + u.splashAdd,
    slow:      Math.min(0.9, stats.slow + u.slowAdd),
  };
}

// ---------------------------------------------------------------------------
// Enemy definitions
// ---------------------------------------------------------------------------

type EnemyType = 'BASIC'|'FAST'|'TANK'|'BOSS';

interface EnemyDef {
  hp: number; speed: number; reward: number; size: number; color: Color;
}

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  BASIC:{hp:60,  speed:2.5,reward:5,  size:0.75,color:C_ENEMY_BASIC},
  FAST: {hp:35,  speed:5.0,reward:8,  size:0.55,color:C_ENEMY_FAST},
  TANK: {hp:220, speed:1.5,reward:15, size:0.92,color:C_ENEMY_TANK},
  BOSS: {hp:600, speed:1.2,reward:50, size:1.10,color:C_ENEMY_BOSS},
};

interface WaveSegment { type: EnemyType; count: number; }
const WAVES: WaveSegment[][] = [
  [{type:'BASIC',count:8}],
  [{type:'BASIC',count:10},{type:'FAST',count:4}],
  [{type:'FAST',count:8},{type:'TANK',count:3}],
  [{type:'BASIC',count:12},{type:'FAST',count:6},{type:'TANK',count:4}],
  [{type:'TANK',count:6},{type:'FAST',count:10}],
  [{type:'BOSS',count:1},{type:'BASIC',count:15}],
  [{type:'BOSS',count:2},{type:'TANK',count:8},{type:'FAST',count:12}],
  [{type:'BOSS',count:3},{type:'TANK',count:10},{type:'FAST',count:15}],

  // Nouvelles vagues
  [{type:'BOSS',count:3},{type:'TANK',count:12},{type:'FAST',count:12},{type:'BASIC',count:15}], // 50
  [{type:'BOSS',count:4},{type:'TANK',count:12},{type:'FAST',count:18},{type:'BASIC',count:10}], // 50
  [{type:'BOSS',count:5},{type:'TANK',count:14},{type:'FAST',count:16},{type:'BASIC',count:15}], // 50
  [{type:'BOSS',count:6},{type:'TANK',count:15},{type:'FAST',count:14},{type:'BASIC',count:15}], // 50
  [{type:'BOSS',count:7},{type:'TANK',count:16},{type:'FAST',count:15},{type:'BASIC',count:12}], // 50
  [{type:'BOSS',count:8},{type:'TANK',count:17},{type:'FAST',count:15},{type:'BASIC',count:10}], // 50
  [{type:'BOSS',count:9},{type:'TANK',count:18},{type:'FAST',count:13},{type:'BASIC',count:10}], // 50
  [{type:'BOSS',count:10},{type:'TANK',count:18},{type:'FAST',count:12},{type:'BASIC',count:10}], // 50
  [{type:'BOSS',count:11},{type:'TANK',count:19},{type:'FAST',count:10},{type:'BASIC',count:10}], // 50
  [{type:'BOSS',count:12},{type:'TANK',count:20},{type:'FAST',count:10},{type:'BASIC',count:8}],  // 50
];

// ---------------------------------------------------------------------------
// Runtime types
// ---------------------------------------------------------------------------

// upgrade branch: -1=none, 0=T2-A, 1=T2-B, then 2/3 from A, 4/5 from B
interface Tower {
  col: number; row: number;
  base:        TowerBaseDef;
  stats:       TowerStats;
  tier:        number;
  branch:      number;
  appliedLabels: string[];   // labels of upgrades applied (for gem colors)
  cooldown:    number;
  baseEntity:  Entity;
  barrelEntity:Entity|null;
  gemEntities: Entity[];
  rangeAngle:  number;
}

interface Enemy {
  id: number; def: EnemyDef;
  hp: number; maxHp: number; pathT: number;
  slowTimer: number; slowFactor: number;
  entity: Entity; hpBarEntity: Entity|null;
}

interface Projectile {
  tx: number; ty: number; targetId: number;
  stats: TowerStats; projColor: Color;
  x: number; y: number; entity: Entity;
}

interface Particle {
  entity: Entity; vx: number; vy: number; vz: number;
  age: number; life: number; color: Color;
}

type UIMode = 'build'|'upgrade';  // left panel mode
type Phase  = 'build'|'wave'|'waveclear'|'gameover'|'win';

// ---------------------------------------------------------------------------
// Pixel font
// ---------------------------------------------------------------------------

const GLYPHS: Record<string,number[]> = {
  '0':[1,1,1,1,0,1,1,0,1,1,0,1,1,1,1],'1':[0,1,0,1,1,0,0,1,0,0,1,0,1,1,1],
  '2':[1,1,1,0,0,1,1,1,1,1,0,0,1,1,1],'3':[1,1,1,0,0,1,0,1,1,0,0,1,1,1,1],
  '4':[1,0,1,1,0,1,1,1,1,0,0,1,0,0,1],'5':[1,1,1,1,0,0,1,1,1,0,0,1,1,1,1],
  '6':[1,1,1,1,0,0,1,1,1,1,0,1,1,1,1],'7':[1,1,1,0,0,1,0,1,0,0,1,0,0,1,0],
  '8':[1,1,1,1,0,1,1,1,1,1,0,1,1,1,1],'9':[1,1,1,1,0,1,1,1,1,0,0,1,1,1,1],
  'A':[0,1,0,1,0,1,1,1,1,1,0,1,1,0,1],'B':[1,1,0,1,0,1,1,1,0,1,0,1,1,1,0],
  'C':[1,1,1,1,0,0,1,0,0,1,0,0,1,1,1],'D':[1,1,0,1,0,1,1,0,1,1,0,1,1,1,0],
  'E':[1,1,1,1,0,0,1,1,0,1,0,0,1,1,1],'F':[1,1,1,1,0,0,1,1,0,1,0,0,1,0,0],
  'G':[1,1,1,1,0,0,1,0,1,1,0,1,1,1,1],'H':[1,0,1,1,0,1,1,1,1,1,0,1,1,0,1],
  'I':[1,1,1,0,1,0,0,1,0,0,1,0,1,1,1],'L':[1,0,0,1,0,0,1,0,0,1,0,0,1,1,1],
  'M':[1,0,1,1,1,1,1,0,1,1,0,1,1,0,1],'N':[1,0,1,1,1,1,1,1,1,1,0,1,1,0,1],
  'O':[1,1,1,1,0,1,1,0,1,1,0,1,1,1,1],'P':[1,1,0,1,0,1,1,1,0,1,0,0,1,0,0],
  'R':[1,1,0,1,0,1,1,1,0,1,0,1,1,0,1],'S':[1,1,1,1,0,0,1,1,1,0,0,1,1,1,1],
  'T':[1,1,1,0,1,0,0,1,0,0,1,0,0,1,0],'U':[1,0,1,1,0,1,1,0,1,1,0,1,1,1,1],
  'V':[1,0,1,1,0,1,1,0,1,1,0,1,0,1,0],'W':[1,0,1,1,0,1,1,0,1,1,1,1,1,0,1],
  'X':[1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],'Y':[1,0,1,1,0,1,0,1,0,0,1,0,0,1,0],
  ':':[0,0,0,0,1,0,0,0,0,0,1,0,0,0,0],' ':[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hsvToColor(h:number,s:number,v:number,a:number):Color {
  const i=Math.floor(h*6)%6,f=h*6-Math.floor(h*6);
  const p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);
  switch(i){case 0:return new Color(v,t,p,a);case 1:return new Color(q,v,p,a);
    case 2:return new Color(p,v,t,a);case 3:return new Color(p,q,v,a);
    case 4:return new Color(t,p,v,a);default:return new Color(v,p,q,a);}
}

// Stat type → color (used on gems and upgrade button labels)
function statColor(label: string): Color {
  switch(label) {
    case 'DMG': return new Color(1.0, 0.25, 0.25, 1);  // red
    case 'RNG': return new Color(0.25, 0.7,  1.0,  1);  // blue
    case 'SPD': return new Color(1.0, 0.85, 0.1,  1);  // yellow
    case 'RAD': return new Color(1.0, 0.5,  0.1,  1);  // orange
    case 'SLW': return new Color(0.5, 0.9,  1.0,  1);  // cyan
    default:    return new Color(1.0, 1.0,  1.0,  1);
  }
}

function d2(ax:number,ay:number,bx:number,by:number):number {
  return Math.sqrt((ax-bx)**2+(ay-by)**2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@component()
export class TowerDefenseGame extends Component {

  @property() cubeTemplate?:     TemplateAsset;
  @property() sphereTemplate?:   TemplateAsset;
  @property() cylinderTemplate?: TemplateAsset;
  @property() root?: Entity;

  // Pools
  private cubes:     Entity[] = [];
  private spheres:   Entity[] = [];
  private cylinders: Entity[] = [];
  private poolReady            = false;

  // Static geometry
  private borderCubes: Entity[] = [];
  private borderBase:  Vec3[]   = [];
  private borderReady           = false;
  private groundTiles: Entity[] = [];
  private pathTiles:   Entity[] = [];

  // UI cubes (pre-spawned)
  private goldCubes:    Entity[] = [];
  private livesCubes:   Entity[] = [];
  private waveCubes:    Entity[] = [];
  private leftPanelCubes: Entity[] = [];   // build selector OR upgrade menu
  private panelsReady               = false;
  private lastGold  = -1;
  private lastLives = -1;
  private lastWave  = -1;

  // Range preview
  private rangeCubes:  Entity[] = [];      // pre-spawned ring cubes
  private rangeTarget: Tower|null = null;  // currently previewed tower

  // Cursor
  private cursorEntity: Entity|null = null;
  private cursorCol = -1;
  private cursorRow = -1;

  // Game state
  private towers:      Tower[]       = [];
  private enemies:     Enemy[]       = [];
  private projectiles: Projectile[]  = [];
  private particles:   Particle[]    = [];

  private gold       = GOLD_START;
  private lives      = LIVES_START;
  private waveIndex  = 0;
  private phase: Phase  = 'build';
  private phaseTimer    = 0;
  private globalTime    = 0;
  private enemyIdGen    = 0;
  private spawnQueue:   EnemyType[] = [];
  private spawnTimer    = 0;

  // Left panel state
  private uiMode: UIMode        = 'build';
  private selectedTower: TowerType = 'ARROW';
  private selectedTowerObj: Tower|null = null;  // tower selected for upgrade

  // Text / effects
  private rainbowCubes:   Entity[] = [];
  private textPoolCubes:  Entity[] = [];

  // Input
  private touchStart: {x:number;y:number;rayO:Vec3;rayD:Vec3}|null = null;
  private totalDist   = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  @subscribe(OnEntityStartEvent)
  async onStart() {
    FocusedInteractionService.get().enableFocusedInteraction({
      disableEmotesButton: true, disableFocusExitButton: true,
    });
    await Promise.all([this.buildPools(), this.buildBorder(), this.buildPanelCubes()]);
    this.initGame();
  }

  // ---------------------------------------------------------------------------
  // Pool helpers
  // ---------------------------------------------------------------------------

  private async buildPools() {
    const id = new Quaternion(0,0,0,1);
    const mk = (tmpl:TemplateAsset, n:number) =>
      Promise.all(Array.from({length:n}, ()=>
        WorldService.get().spawnTemplate({networkMode:NetworkMode.LocalOnly, templateAsset:tmpl, position:PARK_POS, rotation:id})
      ));
    [this.cubes, this.spheres, this.cylinders] = await Promise.all([
      mk(this.cubeTemplate!,     POOL_CUBES),
      mk(this.sphereTemplate!,   POOL_SPHERES),
      mk(this.cylinderTemplate!, POOL_CYLINDERS),
    ]);
    this.poolReady = true;
  }

  private popCube():     Entity|null { return this.cubes.pop()     ?? null; }
  private popSphere():   Entity|null { return this.spheres.pop()   ?? null; }
  private popCylinder(): Entity|null { return this.cylinders.pop() ?? null; }

  private park(e:Entity, pool:'cube'|'sphere'|'cylinder'='cube') {
    const tc = e.getComponent(TransformComponent);
    if (tc) tc.worldPosition = PARK_POS;
    if (pool==='cube')     this.cubes.push(e);
    else if (pool==='sphere')   this.spheres.push(e);
    else if (pool==='cylinder') this.cylinders.push(e);
  }

  private place(e:Entity, pos:Vec3, color:Color, scale:number|Vec3) {
    const tc = e.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = pos;
      tc.localScale = typeof scale==='number' ? new Vec3(scale,scale,scale) : scale;
    }
    this.applyColor(e, color);
  }

  private applyColor(e:Entity, c:Color) { const cc=e.getComponent(ColorComponent); if(cc) cc.color=c; }
  private applyScale(e:Entity, s:number|Vec3) {
    const tc=e.getComponent(TransformComponent);
    if (tc) tc.localScale = typeof s==='number' ? new Vec3(s,s,s) : s;
  }

  // ---------------------------------------------------------------------------
  // Border
  // ---------------------------------------------------------------------------

  private async buildBorder() {
    const id  = new Quaternion(0,0,0,1);
    const o   = this.origin();
    const pos: Vec3[] = [];
    const minX=o.x+HALF_W+S, maxX=o.x-HALF_W-S, minY=o.y-HALF_H-S, maxY=o.y+HALF_H+S;
    for(let i=0;i<=GRID_W+1;i++) { pos.push(new Vec3(minX-i*S,minY,o.z)); pos.push(new Vec3(minX-i*S,maxY,o.z)); }
    for(let i=1;i<=GRID_H;  i++) { pos.push(new Vec3(minX,minY+i*S,o.z)); pos.push(new Vec3(maxX,minY+i*S,o.z)); }
    this.borderBase  = pos;
    this.borderCubes = await Promise.all(pos.map(p=>WorldService.get().spawnTemplate(
      {networkMode:NetworkMode.LocalOnly,templateAsset:this.cubeTemplate!,position:p,rotation:id}
    )));
    for (const c of this.borderCubes) { this.applyColor(c,C_BORDER); this.applyScale(c,S); }
    this.borderReady = true;
  }

  // ---------------------------------------------------------------------------
  // Panel cube pools
  // ---------------------------------------------------------------------------

  private async buildPanelCubes() {
    const id = new Quaternion(0,0,0,1);
    const mk = (n:number) => Promise.all(Array.from({length:n},()=>
      WorldService.get().spawnTemplate({networkMode:NetworkMode.LocalOnly,templateAsset:this.cubeTemplate!,position:PARK_POS,rotation:id})
    ));
    // Range ring: max range ≈ 6 cells radius → circumference ≈ 2π*6 ≈ 38 → use 48 cubes
    const [g,l,w,lp,rr] = await Promise.all([mk(45),mk(45),mk(45),mk(200),mk(64)]);
    this.goldCubes       = g;
    this.livesCubes      = l;
    this.waveCubes       = w;
    this.leftPanelCubes  = lp;
    this.rangeCubes      = rr;
    this.panelsReady     = true;
  }

  // ---------------------------------------------------------------------------
  // Game init
  // ---------------------------------------------------------------------------

  private initGame() {
    this.clearAll();
    this.gold       = GOLD_START;
    this.lives      = LIVES_START;
    this.waveIndex  = 0;
    this.phase      = 'build';
    this.phaseTimer = WAVE_PAUSE;
    this.globalTime = 0;
    this.enemyIdGen = 0;
    this.spawnQueue = [];
    this.rainbowCubes     = [];
    this.lastGold         = -1;
    this.lastLives        = -1;
    this.lastWave         = -1;
    this.uiMode           = 'build';
    this.selectedTower    = 'ARROW';
    this.selectedTowerObj = null;
    for (const c of this.borderCubes) { this.applyColor(c,C_BORDER); this.applyScale(c,S); }
    this.buildTerrain();
    this.buildCursor();
    this.refreshAllPanels();
    this.refreshLeftPanel();
    this.hideRangeRing();
  }

  private clearAll() {
    for (const e of this.groundTiles) this.park(e); this.groundTiles=[];
    for (const e of this.pathTiles)   this.park(e); this.pathTiles=[];
    for (const t of this.towers) {
      this.park(t.baseEntity);
      if (t.barrelEntity) this.park(t.barrelEntity,'cylinder');
      for (const g of t.gemEntities) this.park(g);
    }
    this.towers=[];
    for (const e of this.enemies) { this.park(e.entity,'sphere'); if(e.hpBarEntity) this.park(e.hpBarEntity); }
    this.enemies=[];
    for (const p of this.projectiles) this.park(p.entity,'sphere');
    this.projectiles=[];
    for (const p of this.particles) this.park(p.entity);
    this.particles=[];
    if (this.cursorEntity) { this.park(this.cursorEntity); this.cursorEntity=null; }
    this.clearTextCubes();
    this.hideRangeRing();
  }

  // ---------------------------------------------------------------------------
  // Terrain
  // ---------------------------------------------------------------------------

  private buildTerrain() {
    for (let row=0;row<GRID_H;row++) {
      for (let col=0;col<GRID_W;col++) {
        const isPath = PATH_CELLS.has(`${col},${row}`);
        const e = this.popCube(); if(!e) continue;
        this.place(e, this.cellToWorld(col,row,isPath?Z_PATH:Z_GROUND), isPath?C_PATH:C_GRASS, S*0.98);
        (isPath ? this.pathTiles : this.groundTiles).push(e);
      }
    }
  }

  private buildCursor() {
    const e = this.popCube(); if(!e) return;
    this.place(e, PARK_POS, C_CURSOR_OK, S*1.02);
    this.cursorEntity = e;
  }

  // ---------------------------------------------------------------------------
  // Range ring
  // ---------------------------------------------------------------------------

  private showRangeRing(col:number, row:number, rangeCells:number) {
    this.hideRangeRing();
    const o   = this.origin();
    const cx  = this.cellToWorld(col,row,0).x;
    const cy  = this.cellToWorld(col,row,0).y;
    const r   = rangeCells * S;
    const n   = this.rangeCubes.length;
    for (let i=0;i<n;i++) {
      const angle = (i/n) * Math.PI * 2;
      const wx    = cx + Math.cos(angle) * r;
      const wy    = cy + Math.sin(angle) * r;
      const e     = this.rangeCubes[i];
      const tc    = e.getComponent(TransformComponent);
      if (tc) { tc.worldPosition = new Vec3(wx,wy,o.z+Z_RANGE); tc.localScale = new Vec3(S*0.22,S*0.22,S*0.22); }
      this.applyColor(e, C_RANGE_RING);
    }
  }

  private hideRangeRing() {
    for (const e of this.rangeCubes) {
      const tc = e.getComponent(TransformComponent);
      if (tc) tc.worldPosition = PARK_POS;
    }
  }

  // ---------------------------------------------------------------------------
  // Tower placement
  // ---------------------------------------------------------------------------

  private tryPlaceTower(col:number, row:number) {
    const key = `${col},${row}`;
    if (PATH_CELLS.has(key)) return;
    if (col<0||col>=GRID_W||row<0||row>=GRID_H) return;
    if (this.towers.some(t=>t.col===col&&t.row===row)) return;

    const base = TOWER_BASES[this.selectedTower];
    if (this.gold < base.cost) { this.flashNoCash(); return; }
    this.gold -= base.cost;

    const baseEnt = this.popCube(); if(!baseEnt) return;
    this.place(baseEnt, this.cellToWorld(col,row,Z_TOWER_BASE), base.baseColor, S*0.95);

    const barrel = this.popCylinder();
    if (barrel) this.place(barrel, this.cellToWorld(col,row,Z_TOWER_TOP), base.topColor, S*0.4);

    const stats: TowerStats = {
      damage:base.damage, range:base.range, fireRate:base.fireRate,
      projSpeed:base.projSpeed, splash:base.splash, slow:base.slow,
    };

    const tower: Tower = {col, row, base, stats, tier:1, branch:-1,
      appliedLabels:[],
      cooldown:0, baseEntity:baseEnt, barrelEntity:barrel, gemEntities:[], rangeAngle:0};
    this.towers.push(tower);
    this.updateTierVisual(tower);

    this.lastGold = -1;
    this.refreshAllPanels();
    this.refreshLeftPanel();
  }

  // ---------------------------------------------------------------------------
  // Upgrade
  // ---------------------------------------------------------------------------

  private tryUpgrade(tower:Tower, upgradeIdx:number) {
    const upg = UPGRADE_TREE[tower.base.name][upgradeIdx];
    if (!upg || this.gold < upg.cost) { this.flashNoCash(); return; }
    this.gold -= upg.cost;

    tower.stats  = applyUpgrade(tower.stats, upg);
    tower.appliedLabels.push(upg.label);

    // Track branch chosen at T2 (before incrementing tier)
    if (tower.tier === 1) tower.branch = upgradeIdx < 2 ? upgradeIdx : 0;
    tower.tier++;

    this.updateTierVisual(tower);
    this.lastGold = -1;
    this.refreshAllPanels();
    this.refreshLeftPanel();
    // Refresh range ring if this tower is selected
    if (this.selectedTowerObj === tower)
      this.showRangeRing(tower.col, tower.row, tower.stats.range);
  }

  // Tier visual: small gem cubes above the barrel
  // T1: no gems   T2: 1 bright gem   T3: 2 bright gems
  private updateTierVisual(tower:Tower) {
    for (const g of tower.gemEntities) this.park(g);
    tower.gemEntities = [];
    if (tower.tier < 2) return;
    // One gem per applied upgrade, colored by its stat type
    const count = tower.tier - 1;  // 1 at T2, 2 at T3
    for (let i=0;i<count;i++) {
      const e = this.popCube(); if(!e) continue;
      const wx  = this.cellToWorld(tower.col, tower.row, Z_TIER_GEM);
      const off = (i - (count-1)/2) * S * 0.3;
      const tc  = e.getComponent(TransformComponent);
      if (tc) { tc.worldPosition = new Vec3(wx.x+off, wx.y+S*0.58, wx.z); tc.localScale = new Vec3(S*0.22,S*0.22,S*0.22); }
      this.applyColor(e, statColor(tower.appliedLabels[i] ?? 'DMG'));
      tower.gemEntities.push(e);
    }
  }

  private flashNoCash() {
    for (const e of this.goldCubes) this.applyColor(e, C_UI_BG_OFF);
    setTimeout(()=>{ this.lastGold=-1; this.refreshGold(); },300);
  }

  // ---------------------------------------------------------------------------
  // Waves
  // ---------------------------------------------------------------------------

  private startWave() {
    if (this.waveIndex >= WAVES.length) { this.triggerWin(); return; }
    this.phase      = 'wave';
    this.spawnTimer = 0;
    this.spawnQueue = [];
    for (const seg of WAVES[this.waveIndex])
      for (let i=0;i<seg.count;i++) this.spawnQueue.push(seg.type);
    for (let i=this.spawnQueue.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [this.spawnQueue[i],this.spawnQueue[j]]=[this.spawnQueue[j],this.spawnQueue[i]];
    }
    this.lastWave = -1;
    this.refreshAllPanels();
  }

  private spawnEnemy(type:EnemyType) {
    const def  = ENEMY_DEFS[type];
    const e    = this.popSphere(); if(!e) return;
    const hp   = def.hp * (1 + this.waveIndex * 0.15);
    this.place(e, this.pathCellToWorld(0), def.color, S*def.size);
    const hpBar = this.popCube();
    if (hpBar) this.place(hpBar, PARK_POS, C_HP_FULL, S*0.5);
    this.enemies.push({
      id:this.enemyIdGen++, def, hp, maxHp:hp,
      pathT:0, slowTimer:0, slowFactor:1,
      entity:e, hpBarEntity:hpBar??null,
    });
  }

  // ---------------------------------------------------------------------------
  // Tower logic
  // ---------------------------------------------------------------------------

  private updateTowers(dt:number) {
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;
      let target:Enemy|null = null, bestT=-1;
      for (const en of this.enemies) {
        const ep = this.pathCellToWorld(en.pathT);
        const tw = this.cellToWorld(tower.col, tower.row, 0);
        if (d2(ep.x,ep.y,tw.x,tw.y)/S <= tower.stats.range && en.pathT > bestT) {
          bestT=en.pathT; target=en;
        }
      }
      if (!target) continue;
      tower.cooldown = 1/tower.stats.fireRate;
      const ep=this.pathCellToWorld(target.pathT), tw=this.cellToWorld(tower.col,tower.row,0);
      tower.rangeAngle = Math.atan2(ep.y-tw.y, tw.x-ep.x);
      const proj = this.popSphere(); if(!proj) continue;
      this.place(proj, this.cellToWorld(tower.col,tower.row,Z_PROJ), tower.base.projColor, S*0.3);
      this.projectiles.push({tx:ep.x,ty:ep.y,targetId:target.id,
        stats:tower.stats, projColor:tower.base.projColor,
        x:tw.x, y:tw.y, entity:proj});
    }
  }

  // ---------------------------------------------------------------------------
  // Projectiles
  // ---------------------------------------------------------------------------

  private updateProjectiles(dt:number) {
    const dead:number[]=[];
    for (let i=0;i<this.projectiles.length;i++) {
      const p=this.projectiles[i];
      const en=this.enemies.find(e=>e.id===p.targetId);
      if (en) { const ep=this.pathCellToWorld(en.pathT); p.tx=ep.x; p.ty=ep.y; }
      const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.sqrt(dx*dx+dy*dy);
      const step=p.stats.projSpeed*S*dt;
      if (dist<=step+0.001) {
        this.onHit(p); this.park(p.entity,'sphere'); dead.push(i);
      } else {
        p.x+=dx/dist*step; p.y+=dy/dist*step;
        const tc=p.entity.getComponent(TransformComponent);
        if (tc) tc.worldPosition=new Vec3(p.x,p.y,this.origin().z+Z_PROJ);
      }
    }
    for (let i=dead.length-1;i>=0;i--) this.projectiles.splice(dead[i],1);
  }

  private onHit(p:Projectile) {
    this.spawnImpactParticles(p.x,p.y,p.projColor);
    if (p.stats.splash > 0) {
      const sr=p.stats.splash*S;
      for (const en of this.enemies) {
        const ep=this.pathCellToWorld(en.pathT);
        if (d2(ep.x,ep.y,p.x,p.y)<=sr) this.damageEnemy(en,p.stats.damage,p.stats.slow);
      }
    } else {
      const en=this.enemies.find(e=>e.id===p.targetId);
      if (en) this.damageEnemy(en,p.stats.damage,p.stats.slow);
    }
  }

  private damageEnemy(en:Enemy, dmg:number, slow:number) {
    en.hp -= dmg;
    if (slow>0) { en.slowFactor=1-slow; en.slowTimer=1.5; }
    this.applyColor(en.entity, C_UI_TEXT);
    setTimeout(()=>{ if(en.hp>0) this.applyColor(en.entity,en.def.color); },80);
    if (en.hp<=0) this.killEnemy(en); else this.updateHpBar(en);
  }

  private killEnemy(en:Enemy) {
    this.gold += en.def.reward; this.lastGold=-1;
    this.spawnDeathParticles(en);
    this.removeEnemy(en);
    this.refreshAllPanels();
    this.refreshLeftPanel();
  }

  private removeEnemy(en:Enemy) {
    this.park(en.entity,'sphere');
    if (en.hpBarEntity) this.park(en.hpBarEntity);
    const idx=this.enemies.indexOf(en);
    if (idx>=0) this.enemies.splice(idx,1);
  }

  // ---------------------------------------------------------------------------
  // Enemy movement + animation
  // ---------------------------------------------------------------------------

  private updateEnemies(dt:number) {
    const reached:Enemy[]=[];
    for (const en of this.enemies) {
      if (en.slowTimer>0) { en.slowTimer-=dt; if(en.slowTimer<=0) en.slowFactor=1; }
      en.pathT += en.def.speed * en.slowFactor * dt;
      if (en.pathT >= PATH_LENGTH) { reached.push(en); continue; }

      const pos = this.pathCellToWorld(en.pathT);
      const tc  = en.entity.getComponent(TransformComponent);
      if (tc) {
        tc.worldPosition = new Vec3(pos.x, pos.y, this.origin().z + Z_ENEMY);
      }
      // Slow tint
      if (en.slowTimer > 0) {
        const c=en.def.color, m=0.5;
        this.applyColor(en.entity, new Color(c.r*m+0.3*(1-m),c.g*m+0.7*(1-m),c.b*m+1*(1-m),1));
      }
      this.updateHpBar(en);
    }
    for (const en of reached) {
      this.lives--; this.lastLives=-1;
      this.spawnDeathParticles(en);
      this.removeEnemy(en);
      this.refreshAllPanels();
      if (this.lives<=0) { this.triggerGameOver(); return; }
    }
  }

  private updateHpBar(en:Enemy) {
    if (!en.hpBarEntity) return;
    const frac = Math.max(0, en.hp/en.maxHp);
    const pos  = this.pathCellToWorld(en.pathT);
    const o    = this.origin();
    const tc   = en.hpBarEntity.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = new Vec3(pos.x, pos.y+S*0.62, o.z+Z_TXT);
      tc.localScale    = new Vec3(S*0.55*frac+0.0001, S*0.12, S*0.12);
    }
    this.applyColor(en.hpBarEntity, frac>0.5?C_HP_FULL:frac>0.25?C_HP_MID:C_HP_LOW);
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------

  private spawnImpactParticles(wx:number, wy:number, color:Color) {
    const o=this.origin();
    for (let i=0;i<3;i++) {
      const e=this.popCube(); if(!e) break;
      const tc=e.getComponent(TransformComponent);
      if(tc){tc.worldPosition=new Vec3(wx,wy,o.z+Z_PROJ);tc.localScale=new Vec3(S*0.2,S*0.2,S*0.2);}
      this.applyColor(e,color);
      const a=Math.random()*Math.PI*2;
      this.particles.push({entity:e,vx:Math.cos(a)*2,vy:Math.sin(a)*2,vz:3+Math.random()*2,age:0,life:0.35,color});
    }
  }

  private spawnDeathParticles(en:Enemy) {
    const pos=this.pathCellToWorld(en.pathT), o=this.origin();
    for (let i=0;i<6;i++) {
      const e=this.popCube(); if(!e) break;
      const tc=e.getComponent(TransformComponent);
      if(tc){tc.worldPosition=new Vec3(pos.x,pos.y,o.z+Z_ENEMY);tc.localScale=new Vec3(S*0.3,S*0.3,S*0.3);}
      this.applyColor(e,en.def.color);
      const a=(i/6)*Math.PI*2+Math.random()*0.5;
      this.particles.push({entity:e,vx:Math.cos(a)*3,vy:Math.sin(a)*3,vz:4+Math.random()*3,age:0,life:0.55,color:en.def.color});
    }
  }

  private updateParticles(dt:number) {
    const dead:number[]=[];
    for (let i=0;i<this.particles.length;i++) {
      const p=this.particles[i]; p.age+=dt; p.vz-=12*dt;
      const tc=p.entity.getComponent(TransformComponent);
      if(tc){
        const pos=tc.worldPosition;
        tc.worldPosition=new Vec3(pos.x+p.vx*dt*S,pos.y+p.vy*dt*S,pos.z+p.vz*dt*S);
        const sc=S*0.3*(1-p.age/p.life);
        tc.localScale=new Vec3(sc,sc,sc);
      }
      const a=Math.max(0,1-p.age/p.life);
      this.applyColor(p.entity,new Color(p.color.r,p.color.g,p.color.b,a));
      if (p.age>=p.life){this.park(p.entity);dead.push(i);}
    }
    for(let i=dead.length-1;i>=0;i--) this.particles.splice(dead[i],1);
  }

  // ---------------------------------------------------------------------------
  // Tower barrel animation
  // ---------------------------------------------------------------------------

  private animateTowers(t:number) {
    for (const tower of this.towers) {
      if (!tower.barrelEntity) continue;
      const tc=tower.barrelEntity.getComponent(TransformComponent); if(!tc) continue;
      const base=this.cellToWorld(tower.col,tower.row,Z_TOWER_TOP);
      const ax=Math.cos(tower.rangeAngle)*S*0.15;
      const ay=Math.sin(tower.rangeAngle)*S*0.15;
      const wobble=0.003*Math.sin(t*3+tower.col);
      tc.worldPosition=new Vec3(base.x+ax,base.y+ay,base.z+wobble);
    }
  }

  // ---------------------------------------------------------------------------
  // Win / Lose
  // ---------------------------------------------------------------------------

  private triggerGameOver() {
    this.phase='gameover'; this.phaseTimer=0;
    this.clearTextCubes(); this.rainbowCubes=[];
    this.hideRangeRing();
    for(const c of this.borderCubes) this.applyColor(c,new Color(1,0.15,0.15,1));
    const o=this.origin();
    this.spawnBackdrop(7,13);
    const tc=(text:string,row:number)=>new Vec3(o.x+(this.textWidth(text)/2)*S,o.y-HALF_H+row*S,o.z+Z_TXT);
    this.renderTextWorld('GAME',tc('GAME',12),this.rangeCubes,C_TEXT,S*0.43,true);
    this.renderTextWorld('OVER',tc('OVER', 6),this.leftPanelCubes,C_TEXT,S*0.43,true);
  }

  private triggerWin() {
    this.phase='win'; this.phaseTimer=0;
    this.clearTextCubes(); this.rainbowCubes=[];
    this.hideRangeRing();
    const o=this.origin();
    this.spawnBackdrop(7,13);
    const tc=(text:string,row:number)=>new Vec3(o.x+(this.textWidth(text)/2)*S,o.y-HALF_H+row*S,o.z+Z_TXT);
    this.renderTextWorld('YOU',tc('YOU',12),this.rangeCubes,C_TEXT,S*0.43,true);
    this.renderTextWorld('WIN',tc('WIN', 6),this.leftPanelCubes,C_TEXT,S*0.43,true);
  }

  private spawnBackdrop(r0:number,r1:number) {
    const o = this.origin();
    const mid=Math.floor(GRID_H/2);
    for(let dr=r0-mid;dr<=r1-mid;dr++)
      for(let dc=0;dc<GRID_W;dc++){
        const e=this.popCube(); if(!e) continue;
        this.place(e,this.cellToWorld(dc,mid+dr,o.z+ Z_BG),new Color(0,0,0,0.9),S*1.0);
        this.textPoolCubes.push(e);
      }
  }

  // ---------------------------------------------------------------------------
  // Income system
  // ---------------------------------------------------------------------------

  private applyIncome() {
    const bonus = Math.floor(this.gold * INCOME_RATE);
    if (bonus <= 0) return;
    this.gold      += bonus;
    this.lastGold   = -1;
    this.refreshGold();
    // Brief flash to indicate income
    this.showIncomeFlash();
  }

  private showIncomeFlash() {
    // Flash gold panel bright then fade
    for(const e of this.goldCubes) this.applyColor(e,Color.white);
    setTimeout(()=>{this.lastGold=-1;this.refreshGold();},400);
  }

  // ---------------------------------------------------------------------------
  // Main update loop
  // ---------------------------------------------------------------------------

  @subscribe(OnWorldUpdateEvent)
  update(payload:OnWorldUpdateEventPayload) {
    if (!this.poolReady) return;
    const dt=payload.deltaTime;
    this.globalTime+=dt;
    this.animateBorder(this.globalTime);
    this.updateParticles(dt);
    this.updateProjectiles(dt);

    if (this.phase==='gameover'||this.phase==='win') {
      this.phaseTimer+=dt; this.animateRainbow(this.globalTime);
      if(this.phaseTimer>=5.0) this.initGame();
      return;
    }

    if (this.phase==='build') {
      this.phaseTimer-=dt;
      this.animateCursor(this.globalTime);
      this.animateRangeRing(this.globalTime);
      if(this.phaseTimer<=0) this.startWave();
      return;
    }

    if (this.phase==='wave') {
      this.spawnTimer-=dt;
      if(this.spawnTimer<=0&&this.spawnQueue.length>0){
        this.spawnEnemy(this.spawnQueue.shift()!);
        this.spawnTimer=ENEMY_SPACING;
      }
      this.updateEnemies(dt);
      this.updateTowers(dt);
      this.animateTowers(this.globalTime);
      this.animateCursor(this.globalTime);
      this.animateRangeRing(this.globalTime);

      if(this.spawnQueue.length===0&&this.enemies.length===0){
        this.phase='waveclear';
        this.phaseTimer=WAVE_PAUSE;
        this.waveIndex++;
        this.gold+=25;              // base end-of-wave bonus
        this.applyIncome();         // interest on remaining gold
        this.refreshAllPanels();
        this.refreshLeftPanel();
      }
      return;
    }

    if (this.phase==='waveclear') {
      this.phaseTimer-=dt;
      this.animateCursor(this.globalTime);
      this.animateRangeRing(this.globalTime);
      if(this.phaseTimer<=0){
        if(this.waveIndex>=WAVES.length) this.triggerWin();
        else this.startWave();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Animations
  // ---------------------------------------------------------------------------

  private animateCursor(t:number) {
    if(!this.cursorEntity)return;
    if (this.cursorCol<0)
      {
        this.applyColor(this.cursorEntity, new Color(0,0,0,0));
        return;
      }
    const blocked = PATH_CELLS.has(`${this.cursorCol},${this.cursorRow}`) ||
      this.towers.some(tr=>tr.col===this.cursorCol&&tr.row===this.cursorRow);
    const color = blocked ? C_CURSOR_NO : C_CURSOR_OK;
    const pulse = 0.5+0.5*Math.sin(t*8);
    this.applyColor(this.cursorEntity, new Color(color.r,color.g,color.b,0.5+0.4*pulse));
    const tc=this.cursorEntity.getComponent(TransformComponent);
    if(tc) tc.worldPosition=this.cellToWorld(this.cursorCol,this.cursorRow,Z_TOWER_BASE+0.002*pulse);
  }

  private animateRangeRing(t:number) {
    if(!this.rangeTarget) return;
    const pulse=0.45+0.3*Math.sin(t*4);
    for(const e of this.rangeCubes) this.applyColor(e,new Color(C_RANGE_RING.r,C_RANGE_RING.g,C_RANGE_RING.b,pulse));
  }

  private animateBorder(t:number) {
    if(!this.borderReady) return;
    for(let i=0;i<this.borderCubes.length;i++){
      const phase=(i/this.borderCubes.length)*Math.PI*2;
      const zOff=0.003*Math.sin(t*BORDER_WAVE+phase);
      const base=this.borderBase[i];
      const tc=this.borderCubes[i].getComponent(TransformComponent);
      if(tc) tc.worldPosition=new Vec3(base.x,base.y,base.z+zOff);
    }
  }

  private animateRainbow(t:number) {
    for(let i=0;i<this.rainbowCubes.length;i++){
      const hue=((t*RAINBOW_SPEED)+i/this.rainbowCubes.length)%1.0;
      this.applyColor(this.rainbowCubes[i],hsvToColor(hue,0.85,1.0,1.0));
    }
  }

  // ---------------------------------------------------------------------------
  // UI Panels (right side)
  // ---------------------------------------------------------------------------

  private refreshAllPanels() {
    this.refreshGold(); this.refreshLives(); this.refreshWave();
  }

  private panelOrigin(rowFromTop:number):Vec3 {
    const o=this.origin();
    return new Vec3(o.x-HALF_W-S*3, o.y+HALF_H-rowFromTop*S, o.z+Z_UI);
  }

  private refreshGold() {
    if(this.gold===this.lastGold) return;
    console.log('Refreshing gold display: ', this.gold, this.lastGold);
    this.lastGold=this.gold;
    this.renderTextWorld(String(this.gold), this.panelOrigin(1), this.goldCubes, C_GOLD, S*0.34);
    this.refreshLeftPanel();
  }

  private refreshLives() {
    if(this.lives===this.lastLives) return;
    this.lastLives=this.lives;
    this.renderTextWorld(String(this.lives), this.panelOrigin(3), this.livesCubes, C_LIVES, S*0.34);
  }

  private refreshWave() {
    const w=this.waveIndex+1;
    if(w===this.lastWave) return;
    this.lastWave=w;
    this.renderTextWorld(String(w), this.panelOrigin(5), this.waveCubes, C_WAVE, S*0.34);
  }

  // ---------------------------------------------------------------------------
  // Left panel (build selector OR upgrade menu)
  // ---------------------------------------------------------------------------

  private leftPanelX():number { return this.origin().x+HALF_W+S*4.5; }

  private refreshLeftPanel() {
    if (!this.panelsReady) return;
    // Park all panel cubes
    for(const e of this.leftPanelCubes){
      const tc=e.getComponent(TransformComponent);
      if(tc) tc.worldPosition=PARK_POS;
    }
    if (this.uiMode==='build') this.drawBuildPanel();
    else                        this.drawUpgradePanel();
  }

  // ---- BUILD MODE: 4 tower type buttons ----

  private drawBuildPanel() {
    const o=this.origin(), lx=this.leftPanelX(), px=S*0.22;
    let ci=0;

    for(let i=0;i<TOWER_ORDER.length;i++){
      const type       = TOWER_ORDER[i];
      const base       = TOWER_BASES[type];
      const isSelected = type===this.selectedTower;
      const canAfford  = this.gold>=base.cost;
      const slotCY     = o.y+HALF_H-(2.5+i*4.5)*S;

      // Background
      const bg=this.leftPanelCubes[ci++];
      if(bg) this.place(bg, new Vec3(lx,slotCY,o.z+Z_BG),
        canAfford ? C_UI_BG : C_UI_BG_OFF,
        new Vec3(S*4.8,S*3.6,S*0.3));

      // Selection accent bar
      if(isSelected){
        const acc=this.leftPanelCubes[ci++];
        if(acc) this.place(acc, new Vec3(lx+S*2.2,slotCY,o.z+Z_UI),
          base.topColor, new Vec3(S*0.18,S*3.6,S*0.35));
      }

      // Base swatch
      const eb=this.leftPanelCubes[ci++];
      if(eb) this.place(eb, new Vec3(lx+S*1.5,slotCY+S*0.25,o.z+Z_TXT),
        base.baseColor, new Vec3(S*0.85,S*0.85,S*0.85));

      // Top swatch
      const et=this.leftPanelCubes[ci++];
      if(et) this.place(et, new Vec3(lx+S*1.5,slotCY+S*0.9,o.z+Z_TXT),
        base.topColor, new Vec3(S*0.42,S*0.42,S*0.42));

      // Cost digits
      const cx=lx+S*0.2, cy=slotCY+S*0.5;
      const cc=canAfford?C_UI_TEXT:C_UI_TEXT_OFF;
      for(const{col,row}of this.glyphPixelOffsets(String(base.cost))){
        const e=this.leftPanelCubes[ci++]; if(!e) break;
        const tc=e.getComponent(TransformComponent);
        if(tc){tc.worldPosition=new Vec3(cx-col*px,cy-row*px,o.z+Z_TXT);tc.localScale=new Vec3(px,px,px);}
        this.applyColor(e,cc);
      }
    }
  }

  // ---- UPGRADE MODE: 2 upgrade buttons with stat labels ----

  private drawUpgradePanel() {
    const tower=this.selectedTowerObj; if(!tower) return;
    const o=this.origin(), lx=this.leftPanelX(), px=S*0.22;
    let ci=0;

    if(tower.tier>=3){
      // MAX — single green slab
      const mb=this.leftPanelCubes[ci++];
      if(mb) this.place(mb, new Vec3(lx,o.y+HALF_H-S*4,o.z+Z_BG),
        new Color(0.1,0.3,0.1,0.92), new Vec3(S*4.8,S*7,S*0.3));
      const mOx=lx+S*1.2, mOy=o.y+HALF_H-S*2.8;
      for(const{col,row}of this.glyphPixelOffsets('MAX')){
        const e=this.leftPanelCubes[ci++]; if(!e) break;
        const tc=e.getComponent(TransformComponent);
        if(tc){tc.worldPosition=new Vec3(mOx-col*px,mOy-row*px,o.z+Z_TXT);tc.localScale=new Vec3(px,px,px);}
        this.applyColor(e,C_UI_TEXT);
      }
      return;
    }

    // Determine which upgrades to show
    const upgIndices:[number,number] =
      tower.tier===1 ? [0,1] :
      tower.branch===0 ? [2,3] : [4,5];

    for(let bi=0;bi<2;bi++){
      const uIdx   = upgIndices[bi];
      const upg    = UPGRADE_TREE[tower.base.name][uIdx];
      const afford = this.gold>=upg.cost;
      const slotY  = o.y+HALF_H-(2.5+bi*7)*S;

      // Button slab — tinted with stat color
      const sc = statColor(upg.label);
      const bbg=this.leftPanelCubes[ci++];
      if(bbg) this.place(bbg, new Vec3(lx,slotY,o.z+Z_BG),
        afford ? C_UI_BG : C_UI_BG_OFF,
        new Vec3(S*4.8,S*5.5,S*0.3));

      // Stat label colored by stat type (dimmed if can't afford)
      const labOx=lx+S, labOy=slotY+S*1.2;
      const baseStatColor = statColor(upg.label);
      const labColor = baseStatColor;
      for(const{col,row}of this.glyphPixelOffsets(upg.label)){
        const e=this.leftPanelCubes[ci++]; if(!e) break;
        const tc=e.getComponent(TransformComponent);
        if(tc){tc.worldPosition=new Vec3(labOx-col*px,labOy-row*px,o.z+Z_TXT);tc.localScale=new Vec3(px,px,px);}
        this.applyColor(e,labColor);
      }

      // Cost digits below label
      const costOx=lx+S*0.8, costOy=slotY-S*0.4;
      for(const{col,row}of this.glyphPixelOffsets(String(upg.cost))){
        const e=this.leftPanelCubes[ci++]; if(!e) break;
        const tc=e.getComponent(TransformComponent);
        if(tc){tc.worldPosition=new Vec3(costOx-col*px,costOy-row*px,o.z+Z_TXT);tc.localScale=new Vec3(px,px,px);}
        this.applyColor(e,afford ? C_UI_TEXT : C_UI_TEXT_OFF);
      }
    }
  }

  // ---- Hit-test for left panel taps ----

  private leftPanelTapResult(rayO:Vec3, rayD:Vec3): {mode:'build';slot:number}|{mode:'upgrade';btn:number}|null {
    if(Math.abs(rayD.z)<0.0001) return null;
    const o=this.origin(), t=(o.z-rayO.z)/rayD.z;
    if(t<0) return null;
    const wx=rayO.x+rayD.x*t, wy=rayO.y+rayD.y*t;
    const lx=this.leftPanelX();
    if(wx<lx-S*3.5||wx>lx+S*3.0) return null;

    if(this.uiMode==='build'){
      for(let i=0;i<TOWER_ORDER.length;i++){
        const slotCY=o.y+HALF_H-(2.5+i*4.5)*S;
        if(Math.abs(wy-slotCY)<S*2.0) return {mode:'build',slot:i};
      }
    } else {
      const tower=this.selectedTowerObj;
      if(tower&&tower.tier<3){
        const upgIndices:[number,number]=tower.tier===1?[0,1]:tower.branch===0?[2,3]:[4,5];
        for(let bi=0;bi<2;bi++){
          const slotY=o.y+HALF_H-(2.5+bi*7)*S;
          if(Math.abs(wy-slotY)<S*2.8) return {mode:'upgrade',btn:upgIndices[bi]};
        }
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Text rendering
  // ---------------------------------------------------------------------------

  private textWidth(text:string):number { return text.length>0?text.length*4-1:0; }

  private *glyphPixelOffsets(text:string):Generator<{col:number;row:number}> {
    for(let ci=0;ci<text.length;ci++){
      const g=GLYPHS[text[ci].toUpperCase()]??GLYPHS[' '];
      for(let r=0;r<5;r++) for(let c=0;c<3;c++)
        if(g[r*3+c]) yield{col:ci*4+c,row:r};
    }
  }

  private renderTextWorld(text:string, origin:Vec3, cubes:Entity[]|null, color:Color, scale:number, rainbow=false):void {
    if(cubes) for(const c of cubes){const tc=c.getComponent(TransformComponent);if(tc)tc.worldPosition=PARK_POS;}
    let i=0;
    for(const{col,row}of this.glyphPixelOffsets(text)){
      let cube:Entity|null=null;
      if(cubes){if(i>=cubes.length)break;cube=cubes[i];}
      else{cube=this.popCube();if(!cube)break;this.textPoolCubes.push(cube);}
      i++;
      const tc=cube.getComponent(TransformComponent);
      if(tc){tc.worldPosition=new Vec3(origin.x-col*scale,origin.y-row*scale,origin.z);tc.localScale=new Vec3(scale,scale,scale);}
      this.applyColor(cube,color);
      if(rainbow)this.rainbowCubes.push(cube);
    }
  }

  private clearTextCubes(){for(const e of this.textPoolCubes)this.park(e);this.textPoolCubes=[];}

  // ---------------------------------------------------------------------------
  // Coordinates
  // ---------------------------------------------------------------------------

  private origin():Vec3 {
    return this.root?.getComponent(TransformComponent)?.worldPosition??new Vec3(0,0,0);
  }

  private cellToWorld(col:number,row:number,z=0):Vec3 {
    const o=this.origin();
    return new Vec3(o.x+HALF_W-col*S, o.y-HALF_H+row*S, o.z+z);
  }

  private pathCellToWorld(t:number):Vec3 {
    const{wx,wy}=pathPosAt(t),o=this.origin();
    return new Vec3(o.x+HALF_W-wx, o.y-HALF_H+wy, o.z);
  }

  private raycastGrid(rayO:Vec3,rayD:Vec3):{col:number;row:number}|null {
    if(Math.abs(rayD.z)<0.0001) return null;
    const o=this.origin(),t=(o.z-rayO.z)/rayD.z;
    if(t<0) return null;
    const wx=rayO.x+rayD.x*t,wy=rayO.y+rayD.y*t;
    const col=Math.round((o.x+HALF_W-wx)/S),row=Math.round((wy-(o.y-HALF_H))/S);
    if(col<0||col>=GRID_W||row<0||row>=GRID_H) return null;
    return{col,row};
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(payload:OnFocusedInteractionInputEventPayload) {
    this.touchStart={x:payload.screenPosition.x,y:payload.screenPosition.y,
      rayO:payload.worldRayOrigin,rayD:payload.worldRayDirection};
    this.totalDist=0;
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMove(payload:OnFocusedInteractionInputEventPayload) {
    if(!this.touchStart) return;
    const dx=payload.screenPosition.x-this.touchStart.x;
    const dy=payload.screenPosition.y-this.touchStart.y;
    this.totalDist+=Math.sqrt(dx*dx+dy*dy);
    const cell=this.raycastGrid(payload.worldRayOrigin,payload.worldRayDirection);
    if(cell){
      this.cursorCol=cell.col; this.cursorRow=cell.row;
      // Show range preview only in build mode, can afford, valid cell
      if(this.uiMode==='build'){
        const base  = TOWER_BASES[this.selectedTower];
        const key   = `${cell.col},${cell.row}`;
        const valid = !PATH_CELLS.has(key) && !this.towers.some(t=>t.col===cell.col&&t.row===cell.row);
        if(valid && this.gold >= base.cost)
          this.showRangeRing(cell.col, cell.row, base.range);
        else
          this.hideRangeRing();
      }
      // In upgrade mode the ring stays on the selected tower, don't move it
    }
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  onTouchEnd(payload:OnFocusedInteractionInputEventPayload) {
    if(this.totalDist<0.03){
      const result=this.leftPanelTapResult(payload.worldRayOrigin,payload.worldRayDirection);

      if(result){
        if(result.mode==='build'){
          this.selectedTower=TOWER_ORDER[result.slot];
          this.refreshLeftPanel();
        } else if(result.mode==='upgrade'){
          if(this.selectedTowerObj) this.tryUpgrade(this.selectedTowerObj,result.btn);
        }
      } else {
        // Tap on grid
        const cell=this.raycastGrid(payload.worldRayOrigin,payload.worldRayDirection);
        const col=cell?.col??this.cursorCol, row=cell?.row??this.cursorRow;
        if(col>=0&&row>=0&&(this.phase==='build'||this.phase==='wave'||this.phase==='waveclear')){
          const existing=this.towers.find(t=>t.col===col&&t.row===row);
          if(existing){
            // Tap on tower → upgrade mode
            this.uiMode='upgrade';
            this.selectedTowerObj=existing;
            this.rangeTarget=existing;
            this.showRangeRing(col,row,existing.stats.range);
            this.refreshLeftPanel();
          } else if(this.uiMode==='build'){
            // Place new tower
            this.tryPlaceTower(col,row);
            this.hideRangeRing();
            this.refreshLeftPanel();
          } else {
            // Tap on empty cell while in upgrade mode → back to build
            this.uiMode='build';
            this.selectedTowerObj=null;
            this.rangeTarget=null;
            this.hideRangeRing();
            this.refreshLeftPanel();
          }
        } else if(this.uiMode==='upgrade'){
          // Tap outside grid while in upgrade mode → back to build
          this.uiMode='build';
          this.selectedTowerObj=null;
          this.rangeTarget=null;
          this.hideRangeRing();
          this.refreshLeftPanel();
        }
      }
    }
    else
    {
      this.uiMode='build';
      this.selectedTowerObj=null;
      this.rangeTarget=null;
      this.hideRangeRing();
      this.refreshLeftPanel();
    }
    this.cursorCol=-1; this.cursorRow=-1;
    this.touchStart=null; this.totalDist=0;
  }
}
