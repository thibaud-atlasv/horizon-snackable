/**
 * ActionService — Central registry of all player-facing actions.
 *
 * Any system can register, update, or unregister actions at any time.
 * The UI subscribes to Events.ActionRegistryChanged and re-renders from getAll().
 * When the player taps a button, the UI calls trigger(id) which fires
 * Events.ActionTriggered — the registering system handles everything from there.
 *
 * ── Contract ──────────────────────────────────────────────────────────────────
 *   - cost and isEnabled are display-only; the registering system owns all logic
 *   - register when visible; unregister when no longer relevant (maxed, locked, etc.)
 *   - Actions are ordered by registration time (Map insertion order)
 *
 * ── Adding a new system ────────────────────────────────────────────────────────
 *   No changes needed here. Systems self-register on unlock/onReady.
 */
import { EventService, Service, service, subscribe } from 'meta/worlds';
import { Events, type IAction } from '../Types';

@service()
export class ActionService extends Service {

  private _actions: Map<string, IAction> = new Map();

  // ── Registry API (called by systems) ─────────────────────────────────────────

  register(action: IAction): void {
    this._actions.set(action.id, { ...action });
    this._notify();
  }

  /** Patch one or more display fields of an existing action. No-op if id not found. */
  update(id: string, patch: Partial<Omit<IAction, 'id'>>): void {
    const action = this._actions.get(id);
    if (!action) return;
    Object.assign(action, patch);
    this._notify();
  }

  unregister(id: string): void {
    if (!this._actions.delete(id)) return;
    this._notify();
  }

  // ── UI API ────────────────────────────────────────────────────────────────────

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

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    this._actions.clear();
    this._notify();
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _notify(): void {
    EventService.sendLocally(Events.ActionRegistryChanged, {});
  }
}
