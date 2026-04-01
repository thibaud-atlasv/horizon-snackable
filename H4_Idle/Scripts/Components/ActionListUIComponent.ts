/**
 * ActionListUIComponent — Drives the ActionList shop panel UI using ItemsControl.
 *
 * Component Attachment: Scene Entity with CustomUiComponent (ActionList.xaml)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Not Networked
 *
 * Responsibilities:
 *   - Bind ViewModel with dynamic Actions collection to CustomUiComponent
 *   - Listen to ActionRegistryChanged to rebuild the Actions array
 *   - Listen to ResourceChanged to update IsEnabled/affordability states
 *   - Handle ActionItemClick event with ActionId from CommandParameter
 *   - Track affordability changes to trigger pulse animations
 *
 * —— Does NOT own ————————————————————————————————————————————————————
 *   - Action logic → owning system handles ActionTriggered
 *   - Gold balance → ResourceService
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  CustomUiComponent,
  UiEvent,
  UiViewModel,
  uiViewModel,
  serializable,
  component,
  subscribe,
} from 'meta/worlds';
import { Events } from '../Types';
import { ActionService } from '../Services/ActionService';

// ——— UiEvent with payload for button clicks ———————————————————————————
@serializable()
class ActionListItemClickPayload {
  readonly parameter: string = ''; // Auto-populated from XAML CommandParameter (ActionId)
}

const actionItemClickEvent = new UiEvent('ActionItemClick', ActionListItemClickPayload);

// ——— Item ViewModel (for each action in the list) ——————————————————————
@uiViewModel()
export class ActionListItemUIViewModel extends UiViewModel {
  /** Unique action identifier — also used as CommandParameter for click */
  public ActionId: string = '';
  /** Display title (bold, left side) */
  public Title: string = '';
  /** Description text (smaller, below title) */
  public Description: string = '';
  /** Formatted price string (right side box) */
  public Price: string = '';
  /** Whether button is enabled (affordability check) */
  public IsEnabled: boolean = false;
  /** Set to 1 to trigger XAML animation, then reset to 0 */
  public AnimationTrigger: number = 0;
}

// ——— Main ViewModel ———————————————————————————————————————————————————
@uiViewModel()
export class ActionListUIViewModel extends UiViewModel {
  /** Dynamic collection of action items bound to ItemsControl */
  public Actions: readonly ActionListItemUIViewModel[] = [];
  
  /** Whether the panel is visible (false when empty) */
  public IsVisible: boolean = false;
  
  /** Dynamic height of the panel based on item count (header + items, max 5 items before scroll) */
  public PanelHeight: number = 0;

  override readonly events = {
    ActionItemClick: actionItemClickEvent,
  };
}

// ——— Helpers —————————————————————————————————————————————————————————

function formatCost(cost: number, isEnabled: boolean): string {
  if (cost <= 0) return isEnabled ? 'FREE' : 'Locked';
  if (cost >= 1_000_000) return `${(cost / 1_000_000).toFixed(1)}M`;
  if (cost >= 1_000) return `${(cost / 1_000).toFixed(1)}K`;
  return `${Math.floor(cost)}`;
}

// ——— Component ————————————————————————————————————————————————————————

@component()
export class ActionListUIComponent extends Component {
  private _viewModel = new ActionListUIViewModel();

  /** Previous enabled state per action ID — used to detect affordability transitions */
  private _previousEnabledState: Map<string, boolean> = new Map();

  // ——— Lifecycle ———————————————————————————————————————————————————————

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) {
      ui.dataContext = this._viewModel;
    } else {
      console.warn('[ActionListUIComponent] No CustomUiComponent found on entity');
    }

    // Initial render (registry may already have items)
    this._rebuild();
  }

  // ——— Event Handlers ——————————————————————————————————————————————————

  @subscribe(Events.ActionRegistryChanged)
  onRegistryChanged(_p: Events.ActionRegistryChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._rebuild();
  }

  // ——— Buy button handler (from ItemsControl items via CommandParameter) ———
  @subscribe(actionItemClickEvent)
  onActionItemClick(payload: ActionListItemClickPayload): void {
    const actionId = payload.parameter;
    if (!actionId) {
      console.warn('[ActionListUIComponent] ActionItemClick received without actionId');
      return;
    }
    ActionService.get().trigger(actionId);
  }

  // ——— Private ——————————————————————————————————————————————————————————
  private _shouldAnimate(id : string, isEnabled : boolean) : boolean
  {
    const prevEnabled = this._previousEnabledState.get(id);
    return prevEnabled === undefined || (!prevEnabled && isEnabled);
  }

  private _updateCache()
  {
    this._previousEnabledState.clear();
    this._previousEnabledState = new Map(this._viewModel.Actions.map(a => [a.ActionId, a.IsEnabled]));
  }

  /** Rebuild: replace array if count changed, otherwise update items in place. */
  private _rebuild(): void {
    const actions      = ActionService.get().getAll();
    const currentItems = this._viewModel.Actions;

    if (actions.length !== currentItems.length) {
      // Count changed — allocate a new array and reassign to trigger binding
      const newItems = actions.map(action => {
        const item       = new ActionListItemUIViewModel();
        item.ActionId    = action.id;
        item.Title       = action.label;
        item.Description = action.detail;
        item.Price       = formatCost(action.cost, action.isEnabled);
        item.IsEnabled   = action.isEnabled;
        if (this._shouldAnimate(action.id, action.isEnabled))
          item.AnimationTrigger++;
        this._previousEnabledState.set(action.id, item.IsEnabled);
        this._updateCache();
        return item;
      });

      this._viewModel.Actions = newItems;
      this._updatePanelSize(newItems.length);
      return;
    }

    // Same count — update existing items in place, no array reassignment
    for (let i = 0; i < actions.length; i++) {
      const action     = actions[i];
      const item       = currentItems[i] as ActionListItemUIViewModel;
      item.ActionId    = action.id;
      item.Title       = action.label;
      item.Description = action.detail;
      item.Price       = formatCost(action.cost, item.IsEnabled);
      item.IsEnabled   = action.isEnabled;
        if (this._shouldAnimate(action.id, action.isEnabled))
          item.AnimationTrigger++;
      this._updateCache();
    }
    this._updatePanelSize(actions.length);
  }

  /** Update panel visibility and height based on item count */
  private _updatePanelSize(itemCount: number): void {
    // Hide panel when empty
    this._viewModel.IsVisible = itemCount > 0;
    
    if (itemCount === 0) {
      this._viewModel.PanelHeight = 0;
      return;
    }
    
    // Constants for height calculation (must match XAML values)
    const HEADER_HEIGHT = 60;
    const ITEM_HEIGHT = 95;  // Approximate height per item (button + margin)
    const PADDING = 30;      // Top + bottom padding
    const MAX_VISIBLE_ITEMS = 5;
    
    // Calculate height: header + visible items + padding
    const visibleItems = Math.min(itemCount, MAX_VISIBLE_ITEMS);
    this._viewModel.PanelHeight = HEADER_HEIGHT + (visibleItems * ITEM_HEIGHT) + PADDING;
  }
}
