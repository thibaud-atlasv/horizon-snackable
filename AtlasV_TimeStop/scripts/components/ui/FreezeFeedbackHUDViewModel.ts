import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { Events, HUDEvents, ScoreGrade } from '../../Types';
import { HEIGHT } from '../../Constants';

const CANVAS_H  = 3640; // gameplay canvas height — matches FallingObjCanvas

const GRADE_NAMES: Record<ScoreGrade, string> = {
  [ScoreGrade.Perfect]: 'PERFECT',
  [ScoreGrade.Great]:   'GREAT',
  [ScoreGrade.Good]:    'GOOD',
  [ScoreGrade.Early]:   'EARLY',
  [ScoreGrade.Miss]:    'MISS',
};

const GRADE_COLORS: Record<ScoreGrade, string> = {
  [ScoreGrade.Perfect]: '#FFE566',  // bright gold
  [ScoreGrade.Great]:   '#3fcf3f',  // pale mint — distinct from bg green, different from white
  [ScoreGrade.Good]:    '#66D4FF',  // sky blue
  [ScoreGrade.Early]:   '#FFB347',  // peach orange
  [ScoreGrade.Miss]:    '#CCCCCC',  // medium grey
};

@uiViewModel()
export class FreezeFeedbackHUDViewModelData extends UiViewModel {
  lineY:       number  = 0;
  gradeText:   string  = '';
  scoreText:   string  = '';
  lineColor:   string  = '';
  animTrigger: boolean = false;
}

@component()
export class FreezeFeedbackHUDViewModel extends Component {
  private _viewModel = new FreezeFeedbackHUDViewModelData();
  private _customUi: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) this._customUi.dataContext = this._viewModel;
  }

  @subscribe(HUDEvents.ShowGrade)
  onShowGrade(p: HUDEvents.ShowGradePayload): void {
    if (NetworkingService.get().isServerContext()) return;

    this._viewModel.lineY      = this._worldYToScreenY(p.worldY);
    this._viewModel.gradeText  = GRADE_NAMES[p.grade] ?? 'MISS';
    this._viewModel.scoreText  = `+${p.pts}`;
    this._viewModel.lineColor  = GRADE_COLORS[p.grade] ?? '#9E9E9E';
    this._viewModel.animTrigger = !this._viewModel.animTrigger;
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._viewModel.gradeText = '';
    this._viewModel.scoreText = '';
  }

  private _worldYToScreenY(worldY: number): number {
    // BG pre-scale space (2324px): same Grid transform as ScreenSpaceOverlay
    return -(worldY / HEIGHT) * CANVAS_H + CANVAS_H / 2;
  }
}
