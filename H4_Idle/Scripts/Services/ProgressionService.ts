/**
 * ProgressionService — Tracks session milestones and fires FeatureUnlocked.
 *
 * Systems call register(featureId, condition) from their onReady() to declare
 * when they should become visible. No central defs file needed — each system
 * owns its unlock condition.
 *
 * ── Adding a new system ────────────────────────────────────────────────────────
 *   Call ProgressionService.get().register('my-feature', { taps: 50 }) in onReady().
 *   No changes needed here.
 *
 * ── Condition types ───────────────────────────────────────────────────────────
 *   { taps: N }            — total taps this session
 *   { goldEarned: N }      — cumulative gold earned (not current balance)
 *   { generatorsOwned: N } — total generators owned across all types
 */
import { EventService, Service, service, subscribe } from 'meta/worlds';
import { Events, type UnlockCondition } from '../Types';
import { GeneratorService } from './GeneratorService';

@service()
export class ProgressionService extends Service {

  private _registry   : Map<string, UnlockCondition> = new Map();
  private _unlocked   : Set<string> = new Set();

  private _totalTaps  : number = 0;
  private _goldEarned : number = 0;
  private _genOwned   : number = 0;

  private readonly _generators = Service.injectWeak(GeneratorService);

  // ── Registration API ──────────────────────────────────────────────────────────

  /**
   * Called by a system in its onReady() to declare its unlock condition.
   * Checks immediately in case the condition is already met (e.g. after restart).
   */
  register(featureId: string, condition: UnlockCondition): void {
    this._registry.set(featureId, condition);
    this._checkOne(featureId, condition);
  }

  isUnlocked(featureId: string): boolean {
    return this._unlocked.has(featureId);
  }

  // ── Milestone trackers ────────────────────────────────────────────────────────

  @subscribe(Events.PlayerTap)
  onPlayerTap(): void {
    this._totalTaps++;
    this._checkAll();
  }

  @subscribe(Events.GainApplied)
  onGainApplied(p: Events.GainAppliedPayload): void {
    this._goldEarned += p.amount;
    this._checkAll();
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _checkAll(): void {
    for (const [featureId, condition] of this._registry) {
      this._checkOne(featureId, condition);
    }
  }

  private _checkOne(featureId: string, condition: UnlockCondition): void {
    if (this._unlocked.has(featureId)) return;
    if (!this._isMet(condition)) return;
    this._unlocked.add(featureId);
    EventService.sendLocally(Events.FeatureUnlocked, { featureId });
  }

  private _isMet(c: UnlockCondition): boolean {
    return c();
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    // _registry is kept — systems only call register() once in onReady()
    this._unlocked.clear();
    this._totalTaps  = 0;
    this._goldEarned = 0;
    this._genOwned   = 0;
  }
}
