/**
 * UpgradePanelViewModel — ViewModel-only file for the Upgrade Panel UI.
 * 
 * This file contains ONLY ViewModels and UiEvent definitions.
 * The UpgradePanelComponent (in Scripts/Components/UpgradePanelComponent.ts)
 * connects these to the entity's CustomUiComponent.
 */
import {
  UiViewModel,
  uiViewModel,
  UiEvent,
  serializable,
} from 'meta/worlds';

// ——— UiEvent with payload for upgrade button clicks ————————————————————————
@serializable()
export class UpgradePanelItemClickPayload {
  /** Reserved field — auto-populated from XAML CommandParameter (UpgradeId) */
  readonly parameter: string = '';
}

/** Module-level event constant for upgrade item clicks */
export const upgradeItemClickEvent = new UiEvent('UpgradePanelViewModel-onUpgradeItemClick', UpgradePanelItemClickPayload);

// ——— Item ViewModel (for each upgrade in the list) ————————————————————————
@uiViewModel()
export class UpgradeItemViewModel extends UiViewModel {
  /** Unique upgrade identifier — also used as CommandParameter for click */
  public UpgradeId: string = '';
  /** Display title (bold, left side) */
  public Title: string = '';
  /** Description text (smaller, below title) */
  public Description: string = '';
  /** Formatted price string (right side box) */
  public Price: string = '';
  /** Whether button is enabled (affordability/availability check) */
  public IsEnabled: boolean = false;
  /** Increment to trigger XAML animation (DataTrigger watches for > 0) */
  public AnimationTrigger: number = 0;
  /** X position offset for Canvas-based absolute positioning */
  public PositionX: number = 0;
  /** Y position offset for Canvas-based absolute positioning */
  public PositionY: number = 0;

  // --- 3D Relief Button Colors ---
  /** Outer outline border color (ARGB hex string) */
  public OutlineColor: string = '#FF2E7D32';
  /** Top-left highlight border color for 3D relief effect */
  public HighlightBorderColor: string = '#FF4CAF50';
  /** Bottom-right shadow border color for 3D relief effect */
  public ShadowBorderColor: string = '#FF0D1A0D';
  /** Button background fill color */
  public ButtonBackgroundColor: string = '#CC1A1A1A';
  /** Button label text color */
  public ButtonTextColor: string = '#FFFFFFFF';

  // --- Element Visibility Flags ---
  /** Whether the outer outline border is visible */
  public OutlineVisible: boolean = true;
  /** Whether the top-left highlight relief border is visible */
  public HighlightBorderVisible: boolean = true;
  /** Whether the bottom-right shadow relief border is visible */
  public ShadowBorderVisible: boolean = true;
  /** Whether the button background is visible */
  public ButtonVisible: boolean = true;
}

// ——— Main ViewModel ————————————————————————————————————————————————————————
@uiViewModel()
export class UpgradePanelViewModel extends UiViewModel {
  /** Dynamic collection of upgrade items bound to ItemsControl */
  public Items: readonly UpgradeItemViewModel[] = [];
  
  /** Whether the panel is visible (false when empty) */
  public IsVisible: boolean = false;
  
  /** Dynamic height of the panel based on item count */
  public PanelHeight: number = 0;

  /** Events exposed to XAML for command binding */
  override readonly events = {
    UpgradeItemClick: upgradeItemClickEvent,
  };

  // ——— Helper Methods ————————————————————————————————————————————————————

  /**
   * Add a new upgrade item to the panel with explicit XY positioning.
   * Optionally accepts color/visibility overrides for 3D relief styling.
   * Reassigns the array to trigger UI binding update.
   */
  addUpgrade(
    id: string,
    title: string,
    description: string,
    price: string,
    isEnabled: boolean,
    positionX: number,
    positionY: number,
    style?: Partial<{
      OutlineColor: string;
      HighlightBorderColor: string;
      ShadowBorderColor: string;
      ButtonBackgroundColor: string;
      ButtonTextColor: string;
      OutlineVisible: boolean;
      HighlightBorderVisible: boolean;
      ShadowBorderVisible: boolean;
      ButtonVisible: boolean;
    }>,
  ): void {
    const item = new UpgradeItemViewModel();
    item.UpgradeId = id;
    item.Title = title;
    item.Description = description;
    item.Price = price;
    item.IsEnabled = isEnabled;
    item.PositionX = positionX;
    item.PositionY = positionY;

    // Apply optional style overrides (defaults stay if not provided)
    if (style) {
      if (style.OutlineColor !== undefined) item.OutlineColor = style.OutlineColor;
      if (style.HighlightBorderColor !== undefined) item.HighlightBorderColor = style.HighlightBorderColor;
      if (style.ShadowBorderColor !== undefined) item.ShadowBorderColor = style.ShadowBorderColor;
      if (style.ButtonBackgroundColor !== undefined) item.ButtonBackgroundColor = style.ButtonBackgroundColor;
      if (style.ButtonTextColor !== undefined) item.ButtonTextColor = style.ButtonTextColor;
      if (style.OutlineVisible !== undefined) item.OutlineVisible = style.OutlineVisible;
      if (style.HighlightBorderVisible !== undefined) item.HighlightBorderVisible = style.HighlightBorderVisible;
      if (style.ShadowBorderVisible !== undefined) item.ShadowBorderVisible = style.ShadowBorderVisible;
      if (style.ButtonVisible !== undefined) item.ButtonVisible = style.ButtonVisible;
    }
    
    // Create new array to trigger binding update
    this.Items = [...this.Items, item];
    this.updatePanelSize();
  }

  /**
   * Remove an upgrade item by ID.
   * Reassigns the array to trigger UI binding update.
   */
  removeUpgrade(id: string): void {
    this.Items = this.Items.filter(item => item.UpgradeId !== id);
    this.updatePanelSize();
  }

  /**
   * Update fields on an existing upgrade item.
   * @param id - The UpgradeId to find
   * @param partial - Object with fields to update
   */
  updateUpgrade(
    id: string,
    partial: Partial<{
      Title: string;
      Description: string;
      Price: string;
      IsEnabled: boolean;
      AnimationTrigger: number;
      PositionX: number;
      PositionY: number;
      OutlineColor: string;
      HighlightBorderColor: string;
      ShadowBorderColor: string;
      ButtonBackgroundColor: string;
      ButtonTextColor: string;
      OutlineVisible: boolean;
      HighlightBorderVisible: boolean;
      ShadowBorderVisible: boolean;
      ButtonVisible: boolean;
    }>
  ): void {
    const item = this.Items.find(i => i.UpgradeId === id) as UpgradeItemViewModel | undefined;
    if (!item) {
      console.warn(`[UpgradePanelViewModel] Upgrade not found: ${id}`);
      return;
    }

    if (partial.Title !== undefined) item.Title = partial.Title;
    if (partial.Description !== undefined) item.Description = partial.Description;
    if (partial.Price !== undefined) item.Price = partial.Price;
    if (partial.IsEnabled !== undefined) item.IsEnabled = partial.IsEnabled;
    if (partial.AnimationTrigger !== undefined) item.AnimationTrigger = partial.AnimationTrigger;
    if (partial.PositionX !== undefined) item.PositionX = partial.PositionX;
    if (partial.PositionY !== undefined) item.PositionY = partial.PositionY;
    if (partial.OutlineColor !== undefined) item.OutlineColor = partial.OutlineColor;
    if (partial.HighlightBorderColor !== undefined) item.HighlightBorderColor = partial.HighlightBorderColor;
    if (partial.ShadowBorderColor !== undefined) item.ShadowBorderColor = partial.ShadowBorderColor;
    if (partial.ButtonBackgroundColor !== undefined) item.ButtonBackgroundColor = partial.ButtonBackgroundColor;
    if (partial.ButtonTextColor !== undefined) item.ButtonTextColor = partial.ButtonTextColor;
    if (partial.OutlineVisible !== undefined) item.OutlineVisible = partial.OutlineVisible;
    if (partial.HighlightBorderVisible !== undefined) item.HighlightBorderVisible = partial.HighlightBorderVisible;
    if (partial.ShadowBorderVisible !== undefined) item.ShadowBorderVisible = partial.ShadowBorderVisible;
    if (partial.ButtonVisible !== undefined) item.ButtonVisible = partial.ButtonVisible;
  }

  /**
   * Clear all upgrade items from the panel.
   * Reassigns the array to trigger UI binding update.
   */
  clearUpgrades(): void {
    this.Items = [];
    this.updatePanelSize();
  }

  /**
   * Recalculate PanelHeight and IsVisible based on current item count.
   * Call this after modifying Items if not using helper methods.
   */
  updatePanelSize(): void {
    const itemCount = this.Items.length;
    
    // Hide panel when empty
    this.IsVisible = itemCount > 0;
    
    if (itemCount === 0) {
      this.PanelHeight = 0;
      return;
    }
    
    // Constants for height calculation (must match XAML values)
    const HEADER_HEIGHT = 70;    // Header bar height
    const ITEM_HEIGHT = 100;     // Approximate height per item (button + margin)
    const PADDING = 30;          // Top + bottom padding
    const MAX_VISIBLE_ITEMS = 5; // Max items before scrolling
    
    // Calculate height: header + visible items + padding
    const visibleItems = Math.min(itemCount, MAX_VISIBLE_ITEMS);
    this.PanelHeight = HEADER_HEIGHT + (visibleItems * ITEM_HEIGHT) + PADDING;
  }
}
