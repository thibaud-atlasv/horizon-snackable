import { uiViewModel, UiViewModel } from 'meta/worlds';

/**
 * Single leaderboard row for UI binding.
 */
@uiViewModel()
export class LeaderboardRowData extends UiViewModel {
  rank:            number  = 0;
  playerName:      string  = '';
  score:           number  = 0;
  isCurrentPlayer: boolean = false;
  rankDisplay:     string  = '';
}

/**
 * ViewModel exposing reactive properties for the Leaderboard UI.
 */
@uiViewModel()
export class LeaderboardHUDViewModelData extends UiViewModel {
  isVisible:    boolean = false;
  title:        string  = 'GAME OVER';
  titleColor:   string  = '#FF4444';
  yourScore:    number  = 0;
  yourRank:     number  = 0;
  yourRankDisplay: string = '';
  entries:      readonly LeaderboardRowData[] = [];
  isLoading:    boolean = false;
  errorMessage: string  = '';
}
