/**
 * ActionService — Central registry of all player-facing actions.
 *
 * Systems declare their actions once at startup via declare(). ActionService
 * automatically re-evaluates visibility and data on every ResourceChanged and
 * StatsChanged event — no per-service refresh calls needed.
 *
 * For live patches that don't need full re-evaluation (e.g. vault countdown),
 * systems can still call update() directly.
 *
 * ── Adding a new system ────────────────────────────────────────────────────────
 *   No changes needed here. Systems declare their actions in onReady().
 */
import { EventService, Service, service, subscribe } from 'meta/worlds';
import { Events, type IAction } from '../Types';
import { getActionDef } from '../Defs/ActionDefs';
import { isUnlocked } from '../Utils/checkUnlock';
import { StatsService } from './StatsService';

@service()
export class ActionService extends Service {

  private _actions     : Map<string, IAction>                   = new Map();
  private _declarations: Map<string, () => Omit<IAction, 'id'>> = new Map();

  // ── Declaration API (called by systems at startup) ────────────────────────────

  /**
   * Declare an action with a factory function.
   * The factory is called whenever the action's data needs to be recomputed.
   * ActionService calls it automatically on ResourceChanged and StatsChanged.
   */
  declare(id: string, factory: () => Omit<IAction, 'id'>): void {
    this._declarations.set(id, factory);
  }

  /**
   * Re-evaluate all declared actions:
   *   - canReveal(id) → register/update via factory
   *   - !canReveal(id) and in registry → remove
   * Fires at most one ActionRegistryChanged, batching all changes.
   */
  refreshDeclared(): void {
    let changed = false;
    for (const [id, factory] of this._declarations) {
      if (this.canReveal(id)) {
        const next = { id, ...factory() };
        const prev = this._actions.get(id);
        this._actions.set(id, next);
        if (!prev || prev.label !== next.label || prev.detail !== next.detail
            || prev.cost !== next.cost || prev.isEnabled !== next.isEnabled) {
          changed = true;
        }
      } else if (this._actions.delete(id)) {
        changed = true;
      }
    }
    if (changed) this._notify();
  }

  // ── Auto-refresh on state changes ─────────────────────────────────────────────

  @subscribe(Events.ResourceChanged)
  onResourceChanged(): void { this.refreshDeclared(); }

  @subscribe(Events.StatsChanged)
  onStatsChanged(): void { this.refreshDeclared(); }

  // ── Registry API (for non-declared / special-case actions) ────────────────────

  /** Upsert: adds or updates in place. Auto-unregisters if maxed. No-op if nothing changed. */
  register(action: IAction): void {
    if (this._isMaxed(action.id)) {
      if (this._actions.delete(action.id)) this._notify();
      return;
    }
    const existing = this._actions.get(action.id);
    this._actions.set(action.id, { ...action });
    if (existing && existing.label === action.label && existing.detail === action.detail
        && existing.cost === action.cost && existing.isEnabled === action.isEnabled) return;
    this._notify();
  }

  /** Patch one or more display fields of an existing action. No-op if id not found or nothing changed. */
  update(id: string, patch: Partial<Omit<IAction, 'id'>>): void {
    const action = this._actions.get(id);
    if (!action) return;
    const keys = Object.keys(patch) as Array<keyof typeof patch>;
    if (!keys.some(k => patch[k] !== action[k])) return;
    Object.assign(action, patch);
    this._notify();
  }

  /** Returns true if an action with this id is currently in the registry. */
  isRegistered(id: string): boolean {
    return this._actions.has(id);
  }

  /**
   * Returns true if this action should be shown or refreshed.
   * = not maxed AND (already in registry OR unlock conditions now met).
   */
  canReveal(id: string): boolean {
    if (this._isMaxed(id)) return false;
    return this._actions.has(id) || isUnlocked(getActionDef(id).unlock);
  }

  unregister(id: string): void {
    if (!this._actions.delete(id)) return;
    this._notify();
  }

  /**
   * Called by the UI when the player taps a button.
   * Fires Events.ActionTriggered — the registering system handles the rest.
   */
  trigger(id: string): void {
    if (!this._actions.has(id)) return;
    EventService.sendLocally(Events.ActionTriggered, { id });
  }

  /** Returns current registry snapshot in registration order. */
  getAll(): readonly IAction[] {
    return Array.from(this._actions.values());
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  /** Returns true if maxCount > 0 and the action has been purchased at least maxCount times. */
  private _isMaxed(id: string): boolean {
    const def = getActionDef(id);
    const max = def.maxCount ?? 1;
    return max > 0 && StatsService.get().get(id) >= max;
  }

  private _notify(): void {
    EventService.sendLocally(Events.ActionRegistryChanged, {});
  }
}
