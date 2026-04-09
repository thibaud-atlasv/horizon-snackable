# Dynamic List Binding Research Report

## Question
Can MHS XAML replace the 10 hardcoded button slots in `UI/ActionList.xaml` with a dynamic list that binds to a collection in the ViewModel?

---

## Current Implementation Analysis

### Current XAML Structure (`UI/ActionList.xaml`)
- **10 hardcoded `<Border>` elements** (Slot0 through Slot9)
- Each slot has:
  - Individual bindings: `{Binding Title0}`, `{Binding Desc0}`, `{Binding Price0}`, etc.
  - Individual visibility: `{Binding Visible0, Converter={StaticResource BoolToVisibility}}`
  - Individual button command: `{Binding Path=events.buyClick0}`
  - Individual slide-in animation storyboard: `SlideInAnim0` through `SlideInAnim9`

### Current TypeScript Component (`Scripts/Components/ActionListUIComponent.ts`)
- **ViewModel with 50 individual properties** (10 slots × 5 properties each):
  - `Title0` through `Title9`
  - `Desc0` through `Desc9`
  - `Price0` through `Price9`
  - `Visible0` through `Visible9`
  - `Enabled0` through `Enabled9`
- **10 individual UiEvent handlers**: `buyClick0` through `buyClick9`
- **Manual slot mapping**: `_slotActionIds` array tracks which action ID is in which slot
- **Rebuild logic**: Loops through actions and manually sets properties for each slot index

---

## MHS XAML Dynamic List Capabilities

### ✅ SUPPORTED: Collection ViewModels

MHS XAML **DOES support** binding to collections via the **Collection ViewModel Pattern**:

```typescript
@uiViewModel()
export class ItemViewModel extends UiViewModel {
    public name: string = "";
    public description: string = "";
    public icon: string = "CustomUI/TutorialResources/icon.png";
    public value: number = 0;
    public isCompleted: boolean = false;
}

@uiViewModel()
export class CollectionViewModel extends UiViewModel {
    public items: readonly ItemViewModel[] = [];
}
```

**Key Requirements:**
- Arrays must be `readonly` (enforced by TypeScript)
- Array elements can be:
  - Primitives (`string`, `number`, `boolean`)
  - `UiViewModel` subclasses (for complex items)
- Arrays must be **immutable** — create new arrays to trigger UI updates:
  ```typescript
  // ✅ CORRECT: Creates new array reference
  this.viewModel.items = [...this.viewModel.items, newItem];
  
  // ❌ WRONG: Mutates existing array (UI won't update)
  this.viewModel.items.push(newItem);
  ```

### ❌ NOT DOCUMENTED: XAML ItemsControl/ListBox Usage

**CRITICAL FINDING:** The MHS documentation shows:
- ✅ How to create collection ViewModels in TypeScript
- ✅ That `ComboBox` can bind to `readonly string[]` arrays
- ❌ **NO examples** of how to use `ItemsControl`, `ListBox`, or any repeater control in XAML
- ❌ **NO examples** of `ItemsSource` binding in XAML
- ❌ **NO examples** of `DataTemplate` usage

**Documentation Search Results:**
- Searched for: `ItemsControl`, `ItemsSource`, `DataTemplate`, `ListBox`, `ListView`, `repeater`
- Found: **Zero XAML examples** showing how to display collection items
- Found: **Zero existing XAML files** in the project using these controls

---

## Conclusion

### Can It Be Done?

**UNCERTAIN** — The evidence is mixed:

**Evidence FOR:**
1. ✅ MHS explicitly documents the "Collection ViewModel Pattern"
2. ✅ `ComboBox` is confirmed to work with `readonly string[]` arrays
3. ✅ The pattern exists for a reason — likely intended for dynamic lists

**Evidence AGAINST:**
1. ❌ Zero XAML examples showing `ItemsControl` or `ItemsSource` usage
2. ❌ Zero documentation on `DataTemplate` or item templating
3. ❌ No existing project files demonstrate this pattern
4. ❌ MHS uses NoesisGUI (a WPF/XAML subset) — may not support all WPF controls

### Recommended Approach

**Option 1: Attempt ItemsControl (Experimental)**
Try using standard WPF `ItemsControl` syntax and see if it works:

```xaml
<ItemsControl ItemsSource="{Binding items}">
    <ItemsControl.ItemTemplate>
        <DataTemplate>
            <Border Background="#30000000" Margin="0,0,0,12">
                <Grid>
                    <TextBlock Text="{Binding name}" FontSize="26"/>
                    <TextBlock Text="{Binding description}" FontSize="18"/>
                    <Button Content="{Binding price}" Command="{Binding buyCommand}"/>
                </Grid>
            </Border>
        </DataTemplate>
    </ItemsControl.ItemTemplate>
</ItemsControl>
```

**Risks:**
- May not be supported by NoesisGUI subset
- No documentation means no official support
- Could fail silently or cause runtime errors

**Option 2: Keep Current Hardcoded Approach (Safe)**
- ✅ Known to work
- ✅ Animations already implemented
- ✅ No risk of breaking existing functionality
- ❌ Verbose and inflexible
- ❌ Hard to extend beyond 10 slots

**Option 3: Hybrid Approach**
- Keep hardcoded slots but generate them programmatically in TypeScript
- Use a fixed pool of slots (e.g., 20) but only show what's needed
- Reduces ViewModel property count while maintaining XAML compatibility

---

## Recommendation

**DO NOT attempt dynamic list binding** without first:
1. Consulting MHS documentation or support for explicit `ItemsControl` examples
2. Creating a minimal test case to verify `ItemsControl` + `ItemsSource` works
3. Confirming `DataTemplate` and item templating are supported

**If dynamic lists are confirmed to work**, the refactor would:
- ✅ Reduce ViewModel from 50 properties to 1 array
- ✅ Eliminate 10 individual UiEvent handlers
- ✅ Simplify rebuild logic significantly
- ✅ Make the system infinitely extensible (no hardcoded slot limit)

**Until then**, the current hardcoded approach is the **safest and most maintainable** solution given the available documentation.

---

## Files Analyzed
- `UI/ActionList.xaml` — 10 hardcoded slot definitions with individual bindings
- `Scripts/Components/ActionListUIComponent.ts` — Manual slot management with 50 ViewModel properties

## Documentation Sources
- `custom-ui-patterns/collection-viewmodel-pattern.md` — Collection ViewModel TypeScript pattern
- `custom-ui-patterns/array-immutability-pattern.md` — Array update requirements
- `custom-ui-definitions/data-type-restrictions-runtime-limitations-supported-types-not-supported-types-will-not-bi.md` — Supported binding types
- `custom-ui-patterns/combobox-viewmodel-pattern.md` — ComboBox array binding example

## Next Steps
1. **Ask MHS support/documentation**: "Does NoesisGUI XAML support `ItemsControl` with `ItemsSource` binding?"
2. **Create test case**: Minimal XAML file with `ItemsControl` + `readonly ItemViewModel[]` array
3. **If confirmed working**: Refactor ActionList to use dynamic binding
4. **If not supported**: Document limitation and keep current approach
