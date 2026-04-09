# Task: Dynamic Action List UI

## Goal
Create a scrollable action list panel in XAML that displays all registered Actions from ActionService with title, description, price button, and smooth fade-in animations.

## Tasks

- [x] **Task 1: Create XAML file** (scripting)
  - Created `UI/ActionList.xaml` with scrollable vertical list
  - 10 slots with title, description, price button
  - Fade-in + slide-from-right animation for new items
  - Right-side screen positioning

- [x] **Task 2: Create TypeScript component** (scripting)
  - Created `Components/ActionListUIComponent.ts`
  - Listens to `Events.ActionRegistryChanged` to rebuild list
  - Listens to `Events.ResourceChanged` for affordability
  - Gets actions from ActionService and renders to slots
  - Handles clicks to trigger actions
  - Fixed `ActionService._notify()` to actually fire events

- [x] **Task 3: Verification** (scripting_verification)
  - Fixed missing BooleanToVisibilityConverter in XAML
  - Added ActionListUI entity to space.hstf
  - Verified all patterns and coding standards

- [ ] **Feedback Point**
  - User tests the action list UI
