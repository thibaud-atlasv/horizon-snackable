/**
 * TowerUpgradeMenuHud — ViewModel controller for the tower upgrade/sell panel.
 *
 * Attached to: TowerUpgradeMenuUI entity in space.hstf (CustomUiComponent → TowerUpgradeMenu.xaml).
 * Shows when a placed tower is tapped (TowerSelected), hides on TowerDeselected or RestartGame.
 * TowerUpgradeMenuViewModel: visible, towerName, sellValue, upgrade1/2 (name, cost, state).
 * Upgrade state: "affordable" | "too_expensive" | "maxed" (no next node in tree).
 * On sell tap: calls TowerService.sell().
 * On upgrade tap: calls TowerService.upgrade(choiceIndex) if not maxed/too_expensive.
 * On TowerUpgraded: refreshes upgrade options and sell value from updated registry.
 * On ResourceChanged: refreshes affordability of displayed upgrade options.
 * _updateUpgradeInfo(): walks the IUpgradeNode tree to find current available options.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, UiEvents } from '../Types';
import type { ITowerDef } from '../Types';
import { TowerService } from '../Services/TowerService';
import { ResourceService } from '../Services/ResourceService';
import { SELL_RATIO } from '../Constants';

const TOWER_BORDER_COLORS: Record<string, string> = {
  arrow: '#2ecc71',
  cannon: '#e67e22',
  frost: '#00bcd4',
  laser: '#9b59b6',
};
const DEFAULT_BORDER_COLOR = '#3a3a5a';

@uiViewModel()
export class TowerUpgradeMenuViewModel extends UiViewModel {
  override readonly events = {
    sellTowerTap: UiEvents.sellTowerTap,
    upgradeTowerTap: UiEvents.upgradeTowerTap,
  };

  visible: boolean = false;
  towerName: string = '';
  sellValue: number = 0;

  upgrade1Name: string = 'Upgrade 1';
  upgrade1Cost: number = 0;
  upgrade1State: string = 'affordable'; // "affordable" | "too_expensive" | "maxed"

  upgrade2Name: string = 'Upgrade 2';
  upgrade2Cost: number = 0;
  upgrade2State: string = 'affordable';

  towerBorderColor: string = '#3a3a5a';
  isMaxed: boolean = false;
  showUpgrades: boolean = true;
  upgradeHistory1: string = '';
  upgradeHistory2: string = '';
  upgradeHistory3: string = '';
  showHistory1: boolean = false;
  showHistory2: boolean = false;
  showHistory3: boolean = false;
}

@component()
export class TowerUpgradeMenuHud extends Component {
  private viewModel: Maybe<TowerUpgradeMenuViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  private selectedCol: number = 0;
  private selectedRow: number = 0;
  private selectedDefId: string = '';
  private selectedChoices: number[] = [];

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.viewModel = new TowerUpgradeMenuViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  @subscribe(Events.TowerSelected, { execution: ExecuteOn.Owner })
  onTowerSelected(payload: Events.TowerSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this.selectedCol     = payload.col;
    this.selectedRow     = payload.row;
    this.selectedDefId   = payload.defId;
    this.selectedChoices = payload.choices;

    const def = TowerService.get().find(payload.defId);
    if (!def) return;

    const rec = TowerService.get().getAt(payload.col, payload.row);
    this.viewModel.towerName  = def.name;
    this.viewModel.sellValue  = rec ? Math.floor(rec.totalInvested * SELL_RATIO) : 0;
    this.viewModel.towerBorderColor = TOWER_BORDER_COLORS[payload.defId] ?? DEFAULT_BORDER_COLOR;
    this._updateUpgradeInfo(def, payload.tier, payload.choices);
    this.viewModel.visible = true;
  }

  @subscribe(Events.TowerDeselected, { execution: ExecuteOn.Owner })
  onTowerDeselected(_payload: Events.TowerDeselectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this.viewModel.visible = false;
    this.viewModel.towerBorderColor = DEFAULT_BORDER_COLOR;
    this.selectedCol     = 0;
    this.selectedRow     = 0;
    this.selectedDefId   = '';
    this.selectedChoices = [];
  }

  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestart(_payload: Events.RestartGamePayload): void {
    if (!this.viewModel) return;
    this.viewModel.visible = false;
    this.viewModel.towerBorderColor = DEFAULT_BORDER_COLOR;
    this.selectedCol     = 0;
    this.selectedRow     = 0;
    this.selectedDefId   = '';
    this.selectedChoices = [];
  }

  @subscribe(Events.ResourceChanged, { execution: ExecuteOn.Owner })
  onResourceChanged(payload: Events.ResourceChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.viewModel.visible) return;
    this._updateAffordability(payload.gold);
  }

  @subscribe(UiEvents.sellTowerTap, { execution: ExecuteOn.Owner })
  onSellTowerTap(_payload: UiEvents.SellTowerTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    TowerService.get().sell();
  }

  @subscribe(UiEvents.upgradeTowerTap, { execution: ExecuteOn.Owner })
  onUpgradeTowerTap(payload: UiEvents.UpgradeTowerTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const upgradeIndex = parseInt(payload.parameter, 10);
    const state = upgradeIndex === 0 ? this.viewModel.upgrade1State : this.viewModel.upgrade2State;
    if (state === 'maxed' || state === 'too_expensive') return;

    TowerService.get().upgrade(upgradeIndex);
  }

  @subscribe(Events.TowerUpgraded, { execution: ExecuteOn.Owner })
  onTowerUpgraded(payload: Events.TowerUpgradedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.viewModel.visible) return;
    if (payload.col !== this.selectedCol || payload.row !== this.selectedRow) return;

    const rec = TowerService.get().getAt(this.selectedCol, this.selectedRow);
    const def = TowerService.get().find(this.selectedDefId);
    if (!rec || !def) return;

    this.viewModel.sellValue = Math.floor(rec.totalInvested * SELL_RATIO);
    this.selectedChoices = [...rec.choices];
    this._updateUpgradeInfo(def, rec.tier, rec.choices);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private _updateUpgradeInfo(def: ITowerDef, tier: number, choices: number[]): void {
    if (!this.viewModel) return;

    // Set maxed state
    const maxed = tier >= 3;
    this.viewModel.isMaxed = maxed;
    this.viewModel.showUpgrades = !maxed;

    // Build upgrade history labels by walking the tree
    this._updateUpgradeHistory(def, choices);

    const options = tier === 0
      ? def.upgrades
      : (() => {
          let node = def.upgrades[choices[0]];
          for (let i = 1; i < choices.length; i++) {
            if (node.next) node = node.next[choices[i]];
          }
          return node.next;
        })();

    if (options) {
      this.viewModel.upgrade1Name  = options[0].label;
      this.viewModel.upgrade1Cost  = options[0].cost;
      this.viewModel.upgrade1State = ResourceService.get().canAfford(options[0].cost) ? 'affordable' : 'too_expensive';
      this.viewModel.upgrade2Name  = options[1].label;
      this.viewModel.upgrade2Cost  = options[1].cost;
      this.viewModel.upgrade2State = ResourceService.get().canAfford(options[1].cost) ? 'affordable' : 'too_expensive';
    } else {
      this.viewModel.upgrade1Name  = 'Upgrade 1';
      this.viewModel.upgrade1Cost  = 0;
      this.viewModel.upgrade1State = 'maxed';
      this.viewModel.upgrade2Name  = 'Upgrade 2';
      this.viewModel.upgrade2Cost  = 0;
      this.viewModel.upgrade2State = 'maxed';
    }
  }

  private _updateUpgradeHistory(def: ITowerDef, choices: number[]): void {
    if (!this.viewModel) return;

    const labels: string[] = [];
    if (choices.length > 0) {
      labels.push(def.upgrades[choices[0]].label);
      let node = def.upgrades[choices[0]];
      for (let i = 1; i < choices.length; i++) {
        if (node.next) {
          node = node.next[choices[i]];
          labels.push(node.label);
        }
      }
    }

    this.viewModel.upgradeHistory1 = labels.length > 0 ? labels[0] : '';
    this.viewModel.upgradeHistory2 = labels.length > 1 ? labels[1] : '';
    this.viewModel.upgradeHistory3 = labels.length > 2 ? labels[2] : '';
    this.viewModel.showHistory1 = labels.length > 0;
    this.viewModel.showHistory2 = labels.length > 1;
    this.viewModel.showHistory3 = labels.length > 2;
  }

  private _updateAffordability(gold: number): void {
    if (!this.viewModel) return;
    if (this.viewModel.upgrade1State !== 'maxed')
      this.viewModel.upgrade1State = gold >= this.viewModel.upgrade1Cost ? 'affordable' : 'too_expensive';
    if (this.viewModel.upgrade2State !== 'maxed')
      this.viewModel.upgrade2State = gold >= this.viewModel.upgrade2Cost ? 'affordable' : 'too_expensive';
  }
}
