/**
 * SYS-10-SAVE: AUTO_ONLY save model.
 * Saves after every Beat resolution within 1 second.
 * Uses simple JSON serialization to local state (in-memory for now,
 * PlayerVariablesService can be added later for persistence).
 */

import type { SaveData } from './Types';

const SAVE_KEY = 'floater_save_v1';

export class SaveSystem {
  private pendingSave: boolean = false;
  private saveTimer: number = 0;
  private readonly SAVE_DELAY = 0.5; // seconds after Beat resolution

  /** Mark that a save is needed (call after Beat resolution) */
  requestSave(): void {
    this.pendingSave = true;
    this.saveTimer = this.SAVE_DELAY;
    console.log('[SaveSystem] Save requested');
  }

  /** Update timer, execute save when ready. Returns true if save was executed. */
  update(dt: number, getData: () => SaveData): boolean {
    if (!this.pendingSave) return false;

    this.saveTimer -= dt;
    if (this.saveTimer <= 0) {
      this.pendingSave = false;
      const data = getData();
      this.writeSave(data);
      return true;
    }
    return false;
  }

  /** Write save data to storage */
  private writeSave(data: SaveData): void {
    try {
      const json = JSON.stringify(data);
      // Store in module-level variable (persisted via hot-reload hooks)
      _savedState = json;
      console.log('[SaveSystem] Save complete');
    } catch (e) {
      console.log('[SaveSystem] ERROR: Failed to save');
    }
  }

  /** Load save data from storage. Returns null if no save exists. */
  loadSave(): SaveData | null {
    try {
      if (_savedState) {
        const data = JSON.parse(_savedState) as SaveData;
        console.log('[SaveSystem] Load complete');
        return data;
      }
    } catch (e) {
      console.log('[SaveSystem] ERROR: Failed to load');
    }
    return null;
  }

  /** Clear save data */
  clearSave(): void {
    _savedState = null;
    console.log('[SaveSystem] Save cleared');
  }

  /** Check if a save exists */
  hasSave(): boolean {
    return _savedState !== null;
  }
}

// Module-level storage (will be managed by component hot-reload hooks)
let _savedState: string | null = null;
