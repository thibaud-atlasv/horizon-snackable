import { Service } from 'meta/worlds';
import { service } from 'meta/worlds';
import { EnemyService } from './EnemyService';

@service()
export class TargetingService extends Service {
  // Returns the id of the enemy with the highest pathT within range,
  // or -1 if none found. "Furthest along path" is the standard TD priority.
  getBestTarget(worldX: number, worldZ: number, range: number): number {
    const registry = EnemyService.get();
    let bestId = -1;
    let bestPathT = -1;

    for (const [id, rec] of registry.getAll()) {
      const dx = rec.worldX - worldX;
      const dz = rec.worldZ - worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= range && rec.pathT > bestPathT) {
        bestPathT = rec.pathT;
        bestId = id;
      }
    }

    return bestId;
  }

  // Returns all enemy ids within a radius of a world position.
  // Used by projectile controllers for AoE hit detection.
  getEnemiesInRadius(worldX: number, worldZ: number, radius: number): number[] {
    const registry = EnemyService.get();
    const result: number[] = [];

    for (const [id, rec] of registry.getAll()) {
      const dx = rec.worldX - worldX;
      const dz = rec.worldZ - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) <= radius) {
        result.push(id);
      }
    }

    return result;
  }
}
