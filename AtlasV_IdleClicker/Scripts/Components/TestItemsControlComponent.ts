/**
 * TestItemsControlComponent — Experimental test for ItemsControl functionality.
 *
 * Component Attachment: Scene Entity with CustomUiComponent (TestItemsControl.xaml)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Not Networked
 *
 * Purpose:
 *   - Test if ItemsControl + ItemsSource + DataTemplate work in MHS XAML
 *   - If the test shows a list of items, the feature works
 *   - If it shows nothing or errors, the feature isn't supported
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  CustomUiComponent,
  UiViewModel,
  uiViewModel,
  component,
  subscribe,
} from 'meta/worlds';

// ─── Item ViewModel (for each item in the list) ─────────────────────────────
@uiViewModel()
export class TestItemViewModel extends UiViewModel {
  public Name: string = '';
}

// ─── Main ViewModel ─────────────────────────────────────────────────────────
@uiViewModel()
export class TestItemsControlViewModel extends UiViewModel {
  public StatusText: string = 'Loading...';
  public ItemCountText: string = '';
  public Items: readonly TestItemViewModel[] = [];
}

// ─── Component ──────────────────────────────────────────────────────────────
@component()
export class TestItemsControlComponent extends Component {
  private _viewModel = new TestItemsControlViewModel();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    // Only run on client
    if (NetworkingService.get().isServerContext()) return;

    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) {
      ui.dataContext = this._viewModel;
      console.log('[TestItemsControl] ViewModel bound to CustomUiComponent');
    } else {
      console.warn('[TestItemsControl] No CustomUiComponent found on entity');
      return;
    }

    // Populate test items
    this._populateTestItems();
  }

  private _populateTestItems(): void {
    // Create test item ViewModels
    const item1 = new TestItemViewModel();
    item1.Name = 'Item 1 - Apple';

    const item2 = new TestItemViewModel();
    item2.Name = 'Item 2 - Banana';

    const item3 = new TestItemViewModel();
    item3.Name = 'Item 3 - Cherry';

    const item4 = new TestItemViewModel();
    item4.Name = 'Item 4 - Date';

    const item5 = new TestItemViewModel();
    item5.Name = 'Item 5 - Elderberry';

    // Assign to ViewModel (must create new array for binding to detect change)
    this._viewModel.Items = [item1, item2, item3, item4, item5];
    this._viewModel.StatusText = 'ItemsControl Test Active';
    this._viewModel.ItemCountText = `Total items: ${this._viewModel.Items.length}`;

    console.log(`[TestItemsControl] Populated ${this._viewModel.Items.length} test items`);
  }
}
