import { type IEnemyDef } from '../Types';
import { Assets } from '../Assets';

export const ENEMY_DEFS: IEnemyDef[] = [
  { id: 'basic', name: 'Basic', hp: 60,  speed: 1.8, reward: 5,  size: 0.35, color: { r: 0.85, g: 0.33, b: 0.33 }, template: Assets.EnemyBasic },
  { id: 'fast',  name: 'Fast',  hp: 35,  speed: 3.5, reward: 8,  size: 0.28, color: { r: 0.95, g: 0.77, b: 0.06 }, template: Assets.EnemyFast  },
  { id: 'tank',  name: 'Tank',  hp: 220, speed: 1.1, reward: 15, size: 0.46, color: { r: 0.40, g: 0.40, b: 0.90 }, template: Assets.EnemyTank  },
  { id: 'boss',  name: 'Boss',  hp: 600, speed: 0.9, reward: 50, size: 0.55, color: { r: 0.60, g: 0.10, b: 0.10 }, template: Assets.EnemyBoss  },
];
