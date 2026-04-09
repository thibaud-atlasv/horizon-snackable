# Upgrade Button Custom UI Task List

## Tasks

- [ ] **Task 1: scripting** - Create reusable upgrade button Custom UI
  - XAML: `UI/UpgradeButton.xaml` with green border, dark background, rounded corners
  - Price prominently displayed with gold_icon
  - Title (medium) and description (small text)
  - Clickable button with grayed appearance when isAvailable = false
  - ViewModel: `Scripts/UI/UpgradeButtonViewModel.ts` with price, isAvailable, title, description bindings
  - Click event/callback for user to hook

- [ ] **Task 2: scripting_verification** - Verify implementation
  - XAML follows specified style
  - All 4 bindable properties work
  - Click event exposed
  - Disabled state visual treatment

- [ ] **Feedback Point** - User reviews the upgrade button component
