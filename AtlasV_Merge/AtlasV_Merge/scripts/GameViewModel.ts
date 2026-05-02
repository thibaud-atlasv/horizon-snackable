/**
 * GameViewModel — Bridges game state to XAML UI.
 *
 * Properties:
 *  - drawCommands: DrawingCommandData bound to DrawingSurface
 *  - scoreText: Bound to score TextBlock
 *  - gameOverVisible: Controls game over overlay visibility
 *  - onRestartClicked: UiEvent for restart button
 */
import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import { DrawingCommandData } from 'meta/custom_ui_experimental';

export const onRestartClicked = new UiEvent('onRestartClicked');

@uiViewModel()
export class GameViewModel extends UiViewModel {
  drawCommands: DrawingCommandData = new DrawingCommandData();
  scoreText: string = '0';
  gameOverVisible: boolean = false;
  bestScoreText: string = '0';
  isNewBest: boolean = false;
  scoreScale: number = 1.0;

  override readonly events = {
    onRestartClicked,
  };
}
