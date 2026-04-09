# Progress Bars UI — Task List

## Tasks

- [x] **Task 1: Service Getters** — Add missing public getters to VaultService, FrenzyService, InterestService, GeneratorService
- [x] **Task 2: XAML** — Create UI/ProgressBars.xaml with 4 colored progress bars
- [x] **Task 3: Component + Entity** — Create ProgressBarsUIComponent.ts and wire up entity
- [x] **Task 4: Verification** — Verify implementation
- [ ] **Task 5: Feedback** — User testing

## Design

| Feature | Color | Behavior |
|---------|-------|----------|
| Vault | Purple #9B59B6 | Timer countdown when locked |
| Frenzy | Orange #F39C12 | Taps remaining → duration remaining |
| Interest | Green #27AE60 | Timer until next payout |
| Generator | Blue #3498DB | Production cycle progress |

## Files to Create/Modify

- `Scripts/Services/VaultService.ts` — add `isPurchased()`
- `Scripts/Services/FrenzyService.ts` — add `isPurchased()`, `getDuration()`
- `Scripts/Services/InterestService.ts` — add `isPurchased()`
- `Scripts/Services/GeneratorService.ts` — add `getFirstGeneratorCycleProgress()`
- `UI/ProgressBars.xaml` — new file
- `Scripts/Components/ProgressBarsUIComponent.ts` — new file
