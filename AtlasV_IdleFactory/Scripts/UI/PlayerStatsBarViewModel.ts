import { UiViewModel, uiViewModel } from 'meta/worlds';

/**
 * ViewModel for the Player Stats Bar UI.
 * Displays time played, packages sent, and gold balance at the top of the screen.
 *
 * This ViewModel is display-only with no interactive events.
 * A separate controller component will update these values.
 */
@uiViewModel()
export class PlayerStatsBarViewModel extends UiViewModel {
  /**
   * Time played formatted as "MM:SS" or "HH:MM:SS" if over 1 hour.
   * Example: "05:32" or "1:23:45"
   */
  public TimePlayed: string = '00:00';

  /**
   * Number of packages/products delivered.
   * Example: "42"
   */
  public PackagesSent: string = '0';

  /**
   * Current gold balance.
   * Example: "1,250"
   */
  public Gold: string = '0';
}
