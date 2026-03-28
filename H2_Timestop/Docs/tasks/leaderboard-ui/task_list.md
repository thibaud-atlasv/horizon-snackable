# Leaderboard UI - Task List

## Tasks

1. [x] **scripting** - Create leaderboard UI system
   - `assets/UI/LeaderboardHUD.xaml` created with arcade mobile aesthetic
   - `scripts/GameHUD/LeaderboardHUDViewModel.ts` created
   - Submits score via `LeaderboardsService.updateEntryForPlayer()`
   - Fetches top 10 entries and highlights current player
   - Shows "VICTORY!" or "GAME OVER" title with dynamic color
   - Appears on `GamePhase.GameOver` and `GamePhase.End` (500ms delay)
   - Hides on `Events.Restart`

2. [x] **scripting_verification** - Verify leaderboard UI implementation
   - Architecture validated (server guards, event subscriptions, XAML bindings)
   - Correct behavior on GameOver and End phases
   - Score submission before fetch
   - Player rank highlighted

3. [ ] **Feedback Point** - User tests leaderboard UI in-game
   - End the game to see leaderboard appear
   - Check scores and rankings display
   - Verify restart clears leaderboard
