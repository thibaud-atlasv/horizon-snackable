// Arena Vermin — ViewModel (XAML sprite rendering + HUD)
import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import { DrawingCommandData } from 'meta/custom_ui';
import { TextureAsset } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

export const onStartClicked = new UiEvent('onStartClicked');
export const onPauseClicked = new UiEvent('onPauseClicked');
export const onResumeClicked = new UiEvent('onResumeClicked');
export const onRestartClicked = new UiEvent('onRestartClicked');
export const onRetryClicked = new UiEvent('onRetryClicked');
export const onReturnToMenuClicked = new UiEvent('onReturnToMenuClicked');
export const onUpgrade0Clicked = new UiEvent('onUpgrade0Clicked');
export const onUpgrade1Clicked = new UiEvent('onUpgrade1Clicked');
export const onUpgrade2Clicked = new UiEvent('onUpgrade2Clicked');

// Maximum enemy pool slots in XAML (expanded from 15 to 25 in M4)
export const ENEMY_POOL_SIZE = 25;

@uiViewModel()
export class ArenaVerminViewModel extends UiViewModel {
  drawCommands: DrawingCommandData = new DrawingCommandData();
  critDrawCommands: DrawingCommandData = new DrawingCommandData();
  titleVisible: boolean = true;

  // === HUD Properties (Milestone 3) ===
  hudVisible: boolean = false;

  // HUD sprite textures
  hudCoinCountTexture: Maybe<TextureAsset> = null;
  hudEnnemiCountTexture: Maybe<TextureAsset> = null;
  hudLevelBarTexture: Maybe<TextureAsset> = null;
  hudTimerBoardTexture: Maybe<TextureAsset> = null;
  hudWaveBarContourTexture: Maybe<TextureAsset> = null;
  hudWaveBarInTexture: Maybe<TextureAsset> = null;
  hudPauseButtonTexture: Maybe<TextureAsset> = null;
  hudCartoucheTexture: Maybe<TextureAsset> = null;

  hpBarWidth: number = 290;
  hpBarColorHex: string = '#40C040';
  hpText: string = '100 / 100';
  levelBarWidth: number = 0;
  levelBarText: string = '0 / 20';
  waveNumber: number = 1;
  playerLevel: number = 1;
  timerBarWidth: number = 218;
  timerColorHex: string = '#50D050';
  waveBarWidth: number = 0;
  enemyCountText: string = '0';
  coinCountText: string = '0';
  pauseMenuVisible: boolean = false;
  waveAnnouncementText: string = '';
  waveAnnouncementVisible: boolean = false;

  // === Hero Body Sprite ===
  heroBodyVisible: boolean = false;
  heroBodyX: number = 0; heroBodyY: number = 0;
  heroBodyW: number = 48; heroBodyH: number = 48;
  heroBodyScaleX: number = 1; heroBodyScaleY: number = 1;
  heroBodyRotation: number = 0; heroBodyOpacity: number = 1;
  heroBodyTexture: Maybe<TextureAsset> = null;

  // === Hero Weapon Sprite ===
  heroWeaponVisible: boolean = false;
  heroWeaponX: number = 0; heroWeaponY: number = 0;
  heroWeaponW: number = 32; heroWeaponH: number = 16;
  heroWeaponScaleX: number = 1; heroWeaponScaleY: number = 1;
  heroWeaponRotation: number = 0; heroWeaponOpacity: number = 1;
  heroWeaponTexture: Maybe<TextureAsset> = null;

  // === Hero Flash Overlay ===
  heroFlashVisible: boolean = false;
  heroFlashX: number = 0; heroFlashY: number = 0;
  heroFlashW: number = 48; heroFlashH: number = 48;
  heroFlashScaleX: number = 1; heroFlashScaleY: number = 1;
  heroFlashOpacity: number = 0;
  heroFlashTexture: Maybe<TextureAsset> = null;

  // === Enemy Pool (25 slots) - Body sprites ===
  enemy0Visible: boolean = false; enemy0X: number = 0; enemy0Y: number = 0; enemy0W: number = 32; enemy0H: number = 32; enemy0ScaleX: number = 1; enemy0ScaleY: number = 1; enemy0Rotation: number = 0; enemy0Opacity: number = 1; enemy0Texture: Maybe<TextureAsset> = null;
  enemy1Visible: boolean = false; enemy1X: number = 0; enemy1Y: number = 0; enemy1W: number = 32; enemy1H: number = 32; enemy1ScaleX: number = 1; enemy1ScaleY: number = 1; enemy1Rotation: number = 0; enemy1Opacity: number = 1; enemy1Texture: Maybe<TextureAsset> = null;
  enemy2Visible: boolean = false; enemy2X: number = 0; enemy2Y: number = 0; enemy2W: number = 32; enemy2H: number = 32; enemy2ScaleX: number = 1; enemy2ScaleY: number = 1; enemy2Rotation: number = 0; enemy2Opacity: number = 1; enemy2Texture: Maybe<TextureAsset> = null;
  enemy3Visible: boolean = false; enemy3X: number = 0; enemy3Y: number = 0; enemy3W: number = 32; enemy3H: number = 32; enemy3ScaleX: number = 1; enemy3ScaleY: number = 1; enemy3Rotation: number = 0; enemy3Opacity: number = 1; enemy3Texture: Maybe<TextureAsset> = null;
  enemy4Visible: boolean = false; enemy4X: number = 0; enemy4Y: number = 0; enemy4W: number = 32; enemy4H: number = 32; enemy4ScaleX: number = 1; enemy4ScaleY: number = 1; enemy4Rotation: number = 0; enemy4Opacity: number = 1; enemy4Texture: Maybe<TextureAsset> = null;
  enemy5Visible: boolean = false; enemy5X: number = 0; enemy5Y: number = 0; enemy5W: number = 32; enemy5H: number = 32; enemy5ScaleX: number = 1; enemy5ScaleY: number = 1; enemy5Rotation: number = 0; enemy5Opacity: number = 1; enemy5Texture: Maybe<TextureAsset> = null;
  enemy6Visible: boolean = false; enemy6X: number = 0; enemy6Y: number = 0; enemy6W: number = 32; enemy6H: number = 32; enemy6ScaleX: number = 1; enemy6ScaleY: number = 1; enemy6Rotation: number = 0; enemy6Opacity: number = 1; enemy6Texture: Maybe<TextureAsset> = null;
  enemy7Visible: boolean = false; enemy7X: number = 0; enemy7Y: number = 0; enemy7W: number = 32; enemy7H: number = 32; enemy7ScaleX: number = 1; enemy7ScaleY: number = 1; enemy7Rotation: number = 0; enemy7Opacity: number = 1; enemy7Texture: Maybe<TextureAsset> = null;
  enemy8Visible: boolean = false; enemy8X: number = 0; enemy8Y: number = 0; enemy8W: number = 32; enemy8H: number = 32; enemy8ScaleX: number = 1; enemy8ScaleY: number = 1; enemy8Rotation: number = 0; enemy8Opacity: number = 1; enemy8Texture: Maybe<TextureAsset> = null;
  enemy9Visible: boolean = false; enemy9X: number = 0; enemy9Y: number = 0; enemy9W: number = 32; enemy9H: number = 32; enemy9ScaleX: number = 1; enemy9ScaleY: number = 1; enemy9Rotation: number = 0; enemy9Opacity: number = 1; enemy9Texture: Maybe<TextureAsset> = null;
  enemy10Visible: boolean = false; enemy10X: number = 0; enemy10Y: number = 0; enemy10W: number = 32; enemy10H: number = 32; enemy10ScaleX: number = 1; enemy10ScaleY: number = 1; enemy10Rotation: number = 0; enemy10Opacity: number = 1; enemy10Texture: Maybe<TextureAsset> = null;
  enemy11Visible: boolean = false; enemy11X: number = 0; enemy11Y: number = 0; enemy11W: number = 32; enemy11H: number = 32; enemy11ScaleX: number = 1; enemy11ScaleY: number = 1; enemy11Rotation: number = 0; enemy11Opacity: number = 1; enemy11Texture: Maybe<TextureAsset> = null;
  enemy12Visible: boolean = false; enemy12X: number = 0; enemy12Y: number = 0; enemy12W: number = 32; enemy12H: number = 32; enemy12ScaleX: number = 1; enemy12ScaleY: number = 1; enemy12Rotation: number = 0; enemy12Opacity: number = 1; enemy12Texture: Maybe<TextureAsset> = null;
  enemy13Visible: boolean = false; enemy13X: number = 0; enemy13Y: number = 0; enemy13W: number = 32; enemy13H: number = 32; enemy13ScaleX: number = 1; enemy13ScaleY: number = 1; enemy13Rotation: number = 0; enemy13Opacity: number = 1; enemy13Texture: Maybe<TextureAsset> = null;
  enemy14Visible: boolean = false; enemy14X: number = 0; enemy14Y: number = 0; enemy14W: number = 32; enemy14H: number = 32; enemy14ScaleX: number = 1; enemy14ScaleY: number = 1; enemy14Rotation: number = 0; enemy14Opacity: number = 1; enemy14Texture: Maybe<TextureAsset> = null;
  enemy15Visible: boolean = false; enemy15X: number = 0; enemy15Y: number = 0; enemy15W: number = 32; enemy15H: number = 32; enemy15ScaleX: number = 1; enemy15ScaleY: number = 1; enemy15Rotation: number = 0; enemy15Opacity: number = 1; enemy15Texture: Maybe<TextureAsset> = null;
  enemy16Visible: boolean = false; enemy16X: number = 0; enemy16Y: number = 0; enemy16W: number = 32; enemy16H: number = 32; enemy16ScaleX: number = 1; enemy16ScaleY: number = 1; enemy16Rotation: number = 0; enemy16Opacity: number = 1; enemy16Texture: Maybe<TextureAsset> = null;
  enemy17Visible: boolean = false; enemy17X: number = 0; enemy17Y: number = 0; enemy17W: number = 32; enemy17H: number = 32; enemy17ScaleX: number = 1; enemy17ScaleY: number = 1; enemy17Rotation: number = 0; enemy17Opacity: number = 1; enemy17Texture: Maybe<TextureAsset> = null;
  enemy18Visible: boolean = false; enemy18X: number = 0; enemy18Y: number = 0; enemy18W: number = 32; enemy18H: number = 32; enemy18ScaleX: number = 1; enemy18ScaleY: number = 1; enemy18Rotation: number = 0; enemy18Opacity: number = 1; enemy18Texture: Maybe<TextureAsset> = null;
  enemy19Visible: boolean = false; enemy19X: number = 0; enemy19Y: number = 0; enemy19W: number = 32; enemy19H: number = 32; enemy19ScaleX: number = 1; enemy19ScaleY: number = 1; enemy19Rotation: number = 0; enemy19Opacity: number = 1; enemy19Texture: Maybe<TextureAsset> = null;
  enemy20Visible: boolean = false; enemy20X: number = 0; enemy20Y: number = 0; enemy20W: number = 32; enemy20H: number = 32; enemy20ScaleX: number = 1; enemy20ScaleY: number = 1; enemy20Rotation: number = 0; enemy20Opacity: number = 1; enemy20Texture: Maybe<TextureAsset> = null;
  enemy21Visible: boolean = false; enemy21X: number = 0; enemy21Y: number = 0; enemy21W: number = 32; enemy21H: number = 32; enemy21ScaleX: number = 1; enemy21ScaleY: number = 1; enemy21Rotation: number = 0; enemy21Opacity: number = 1; enemy21Texture: Maybe<TextureAsset> = null;
  enemy22Visible: boolean = false; enemy22X: number = 0; enemy22Y: number = 0; enemy22W: number = 32; enemy22H: number = 32; enemy22ScaleX: number = 1; enemy22ScaleY: number = 1; enemy22Rotation: number = 0; enemy22Opacity: number = 1; enemy22Texture: Maybe<TextureAsset> = null;
  enemy23Visible: boolean = false; enemy23X: number = 0; enemy23Y: number = 0; enemy23W: number = 32; enemy23H: number = 32; enemy23ScaleX: number = 1; enemy23ScaleY: number = 1; enemy23Rotation: number = 0; enemy23Opacity: number = 1; enemy23Texture: Maybe<TextureAsset> = null;
  enemy24Visible: boolean = false; enemy24X: number = 0; enemy24Y: number = 0; enemy24W: number = 32; enemy24H: number = 32; enemy24ScaleX: number = 1; enemy24ScaleY: number = 1; enemy24Rotation: number = 0; enemy24Opacity: number = 1; enemy24Texture: Maybe<TextureAsset> = null;

  // === Enemy Pool (25 slots) - Weapon sprites ===
  ew0Visible: boolean = false; ew0X: number = 0; ew0Y: number = 0; ew0W: number = 24; ew0H: number = 12; ew0ScaleX: number = 1; ew0ScaleY: number = 1; ew0Rotation: number = 0; ew0Opacity: number = 1; ew0Texture: Maybe<TextureAsset> = null;
  ew1Visible: boolean = false; ew1X: number = 0; ew1Y: number = 0; ew1W: number = 24; ew1H: number = 12; ew1ScaleX: number = 1; ew1ScaleY: number = 1; ew1Rotation: number = 0; ew1Opacity: number = 1; ew1Texture: Maybe<TextureAsset> = null;
  ew2Visible: boolean = false; ew2X: number = 0; ew2Y: number = 0; ew2W: number = 24; ew2H: number = 12; ew2ScaleX: number = 1; ew2ScaleY: number = 1; ew2Rotation: number = 0; ew2Opacity: number = 1; ew2Texture: Maybe<TextureAsset> = null;
  ew3Visible: boolean = false; ew3X: number = 0; ew3Y: number = 0; ew3W: number = 24; ew3H: number = 12; ew3ScaleX: number = 1; ew3ScaleY: number = 1; ew3Rotation: number = 0; ew3Opacity: number = 1; ew3Texture: Maybe<TextureAsset> = null;
  ew4Visible: boolean = false; ew4X: number = 0; ew4Y: number = 0; ew4W: number = 24; ew4H: number = 12; ew4ScaleX: number = 1; ew4ScaleY: number = 1; ew4Rotation: number = 0; ew4Opacity: number = 1; ew4Texture: Maybe<TextureAsset> = null;
  ew5Visible: boolean = false; ew5X: number = 0; ew5Y: number = 0; ew5W: number = 24; ew5H: number = 12; ew5ScaleX: number = 1; ew5ScaleY: number = 1; ew5Rotation: number = 0; ew5Opacity: number = 1; ew5Texture: Maybe<TextureAsset> = null;
  ew6Visible: boolean = false; ew6X: number = 0; ew6Y: number = 0; ew6W: number = 24; ew6H: number = 12; ew6ScaleX: number = 1; ew6ScaleY: number = 1; ew6Rotation: number = 0; ew6Opacity: number = 1; ew6Texture: Maybe<TextureAsset> = null;
  ew7Visible: boolean = false; ew7X: number = 0; ew7Y: number = 0; ew7W: number = 24; ew7H: number = 12; ew7ScaleX: number = 1; ew7ScaleY: number = 1; ew7Rotation: number = 0; ew7Opacity: number = 1; ew7Texture: Maybe<TextureAsset> = null;
  ew8Visible: boolean = false; ew8X: number = 0; ew8Y: number = 0; ew8W: number = 24; ew8H: number = 12; ew8ScaleX: number = 1; ew8ScaleY: number = 1; ew8Rotation: number = 0; ew8Opacity: number = 1; ew8Texture: Maybe<TextureAsset> = null;
  ew9Visible: boolean = false; ew9X: number = 0; ew9Y: number = 0; ew9W: number = 24; ew9H: number = 12; ew9ScaleX: number = 1; ew9ScaleY: number = 1; ew9Rotation: number = 0; ew9Opacity: number = 1; ew9Texture: Maybe<TextureAsset> = null;
  ew10Visible: boolean = false; ew10X: number = 0; ew10Y: number = 0; ew10W: number = 24; ew10H: number = 12; ew10ScaleX: number = 1; ew10ScaleY: number = 1; ew10Rotation: number = 0; ew10Opacity: number = 1; ew10Texture: Maybe<TextureAsset> = null;
  ew11Visible: boolean = false; ew11X: number = 0; ew11Y: number = 0; ew11W: number = 24; ew11H: number = 12; ew11ScaleX: number = 1; ew11ScaleY: number = 1; ew11Rotation: number = 0; ew11Opacity: number = 1; ew11Texture: Maybe<TextureAsset> = null;
  ew12Visible: boolean = false; ew12X: number = 0; ew12Y: number = 0; ew12W: number = 24; ew12H: number = 12; ew12ScaleX: number = 1; ew12ScaleY: number = 1; ew12Rotation: number = 0; ew12Opacity: number = 1; ew12Texture: Maybe<TextureAsset> = null;
  ew13Visible: boolean = false; ew13X: number = 0; ew13Y: number = 0; ew13W: number = 24; ew13H: number = 12; ew13ScaleX: number = 1; ew13ScaleY: number = 1; ew13Rotation: number = 0; ew13Opacity: number = 1; ew13Texture: Maybe<TextureAsset> = null;
  ew14Visible: boolean = false; ew14X: number = 0; ew14Y: number = 0; ew14W: number = 24; ew14H: number = 12; ew14ScaleX: number = 1; ew14ScaleY: number = 1; ew14Rotation: number = 0; ew14Opacity: number = 1; ew14Texture: Maybe<TextureAsset> = null;
  ew15Visible: boolean = false; ew15X: number = 0; ew15Y: number = 0; ew15W: number = 24; ew15H: number = 12; ew15ScaleX: number = 1; ew15ScaleY: number = 1; ew15Rotation: number = 0; ew15Opacity: number = 1; ew15Texture: Maybe<TextureAsset> = null;
  ew16Visible: boolean = false; ew16X: number = 0; ew16Y: number = 0; ew16W: number = 24; ew16H: number = 12; ew16ScaleX: number = 1; ew16ScaleY: number = 1; ew16Rotation: number = 0; ew16Opacity: number = 1; ew16Texture: Maybe<TextureAsset> = null;
  ew17Visible: boolean = false; ew17X: number = 0; ew17Y: number = 0; ew17W: number = 24; ew17H: number = 12; ew17ScaleX: number = 1; ew17ScaleY: number = 1; ew17Rotation: number = 0; ew17Opacity: number = 1; ew17Texture: Maybe<TextureAsset> = null;
  ew18Visible: boolean = false; ew18X: number = 0; ew18Y: number = 0; ew18W: number = 24; ew18H: number = 12; ew18ScaleX: number = 1; ew18ScaleY: number = 1; ew18Rotation: number = 0; ew18Opacity: number = 1; ew18Texture: Maybe<TextureAsset> = null;
  ew19Visible: boolean = false; ew19X: number = 0; ew19Y: number = 0; ew19W: number = 24; ew19H: number = 12; ew19ScaleX: number = 1; ew19ScaleY: number = 1; ew19Rotation: number = 0; ew19Opacity: number = 1; ew19Texture: Maybe<TextureAsset> = null;
  ew20Visible: boolean = false; ew20X: number = 0; ew20Y: number = 0; ew20W: number = 24; ew20H: number = 12; ew20ScaleX: number = 1; ew20ScaleY: number = 1; ew20Rotation: number = 0; ew20Opacity: number = 1; ew20Texture: Maybe<TextureAsset> = null;
  ew21Visible: boolean = false; ew21X: number = 0; ew21Y: number = 0; ew21W: number = 24; ew21H: number = 12; ew21ScaleX: number = 1; ew21ScaleY: number = 1; ew21Rotation: number = 0; ew21Opacity: number = 1; ew21Texture: Maybe<TextureAsset> = null;
  ew22Visible: boolean = false; ew22X: number = 0; ew22Y: number = 0; ew22W: number = 24; ew22H: number = 12; ew22ScaleX: number = 1; ew22ScaleY: number = 1; ew22Rotation: number = 0; ew22Opacity: number = 1; ew22Texture: Maybe<TextureAsset> = null;
  ew23Visible: boolean = false; ew23X: number = 0; ew23Y: number = 0; ew23W: number = 24; ew23H: number = 12; ew23ScaleX: number = 1; ew23ScaleY: number = 1; ew23Rotation: number = 0; ew23Opacity: number = 1; ew23Texture: Maybe<TextureAsset> = null;
  ew24Visible: boolean = false; ew24X: number = 0; ew24Y: number = 0; ew24W: number = 24; ew24H: number = 12; ew24ScaleX: number = 1; ew24ScaleY: number = 1; ew24Rotation: number = 0; ew24Opacity: number = 1; ew24Texture: Maybe<TextureAsset> = null;

  // === Enemy Pool (25 slots) - Flash overlays ===
  ef0Visible: boolean = false; ef0X: number = 0; ef0Y: number = 0; ef0W: number = 32; ef0H: number = 32; ef0ScaleX: number = 1; ef0ScaleY: number = 1; ef0Opacity: number = 0; ef0Texture: Maybe<TextureAsset> = null;
  ef1Visible: boolean = false; ef1X: number = 0; ef1Y: number = 0; ef1W: number = 32; ef1H: number = 32; ef1ScaleX: number = 1; ef1ScaleY: number = 1; ef1Opacity: number = 0; ef1Texture: Maybe<TextureAsset> = null;
  ef2Visible: boolean = false; ef2X: number = 0; ef2Y: number = 0; ef2W: number = 32; ef2H: number = 32; ef2ScaleX: number = 1; ef2ScaleY: number = 1; ef2Opacity: number = 0; ef2Texture: Maybe<TextureAsset> = null;
  ef3Visible: boolean = false; ef3X: number = 0; ef3Y: number = 0; ef3W: number = 32; ef3H: number = 32; ef3ScaleX: number = 1; ef3ScaleY: number = 1; ef3Opacity: number = 0; ef3Texture: Maybe<TextureAsset> = null;
  ef4Visible: boolean = false; ef4X: number = 0; ef4Y: number = 0; ef4W: number = 32; ef4H: number = 32; ef4ScaleX: number = 1; ef4ScaleY: number = 1; ef4Opacity: number = 0; ef4Texture: Maybe<TextureAsset> = null;
  ef5Visible: boolean = false; ef5X: number = 0; ef5Y: number = 0; ef5W: number = 32; ef5H: number = 32; ef5ScaleX: number = 1; ef5ScaleY: number = 1; ef5Opacity: number = 0; ef5Texture: Maybe<TextureAsset> = null;
  ef6Visible: boolean = false; ef6X: number = 0; ef6Y: number = 0; ef6W: number = 32; ef6H: number = 32; ef6ScaleX: number = 1; ef6ScaleY: number = 1; ef6Opacity: number = 0; ef6Texture: Maybe<TextureAsset> = null;
  ef7Visible: boolean = false; ef7X: number = 0; ef7Y: number = 0; ef7W: number = 32; ef7H: number = 32; ef7ScaleX: number = 1; ef7ScaleY: number = 1; ef7Opacity: number = 0; ef7Texture: Maybe<TextureAsset> = null;
  ef8Visible: boolean = false; ef8X: number = 0; ef8Y: number = 0; ef8W: number = 32; ef8H: number = 32; ef8ScaleX: number = 1; ef8ScaleY: number = 1; ef8Opacity: number = 0; ef8Texture: Maybe<TextureAsset> = null;
  ef9Visible: boolean = false; ef9X: number = 0; ef9Y: number = 0; ef9W: number = 32; ef9H: number = 32; ef9ScaleX: number = 1; ef9ScaleY: number = 1; ef9Opacity: number = 0; ef9Texture: Maybe<TextureAsset> = null;
  ef10Visible: boolean = false; ef10X: number = 0; ef10Y: number = 0; ef10W: number = 32; ef10H: number = 32; ef10ScaleX: number = 1; ef10ScaleY: number = 1; ef10Opacity: number = 0; ef10Texture: Maybe<TextureAsset> = null;
  ef11Visible: boolean = false; ef11X: number = 0; ef11Y: number = 0; ef11W: number = 32; ef11H: number = 32; ef11ScaleX: number = 1; ef11ScaleY: number = 1; ef11Opacity: number = 0; ef11Texture: Maybe<TextureAsset> = null;
  ef12Visible: boolean = false; ef12X: number = 0; ef12Y: number = 0; ef12W: number = 32; ef12H: number = 32; ef12ScaleX: number = 1; ef12ScaleY: number = 1; ef12Opacity: number = 0; ef12Texture: Maybe<TextureAsset> = null;
  ef13Visible: boolean = false; ef13X: number = 0; ef13Y: number = 0; ef13W: number = 32; ef13H: number = 32; ef13ScaleX: number = 1; ef13ScaleY: number = 1; ef13Opacity: number = 0; ef13Texture: Maybe<TextureAsset> = null;
  ef14Visible: boolean = false; ef14X: number = 0; ef14Y: number = 0; ef14W: number = 32; ef14H: number = 32; ef14ScaleX: number = 1; ef14ScaleY: number = 1; ef14Opacity: number = 0; ef14Texture: Maybe<TextureAsset> = null;
  ef15Visible: boolean = false; ef15X: number = 0; ef15Y: number = 0; ef15W: number = 32; ef15H: number = 32; ef15ScaleX: number = 1; ef15ScaleY: number = 1; ef15Opacity: number = 0; ef15Texture: Maybe<TextureAsset> = null;
  ef16Visible: boolean = false; ef16X: number = 0; ef16Y: number = 0; ef16W: number = 32; ef16H: number = 32; ef16ScaleX: number = 1; ef16ScaleY: number = 1; ef16Opacity: number = 0; ef16Texture: Maybe<TextureAsset> = null;
  ef17Visible: boolean = false; ef17X: number = 0; ef17Y: number = 0; ef17W: number = 32; ef17H: number = 32; ef17ScaleX: number = 1; ef17ScaleY: number = 1; ef17Opacity: number = 0; ef17Texture: Maybe<TextureAsset> = null;
  ef18Visible: boolean = false; ef18X: number = 0; ef18Y: number = 0; ef18W: number = 32; ef18H: number = 32; ef18ScaleX: number = 1; ef18ScaleY: number = 1; ef18Opacity: number = 0; ef18Texture: Maybe<TextureAsset> = null;
  ef19Visible: boolean = false; ef19X: number = 0; ef19Y: number = 0; ef19W: number = 32; ef19H: number = 32; ef19ScaleX: number = 1; ef19ScaleY: number = 1; ef19Opacity: number = 0; ef19Texture: Maybe<TextureAsset> = null;
  ef20Visible: boolean = false; ef20X: number = 0; ef20Y: number = 0; ef20W: number = 32; ef20H: number = 32; ef20ScaleX: number = 1; ef20ScaleY: number = 1; ef20Opacity: number = 0; ef20Texture: Maybe<TextureAsset> = null;
  ef21Visible: boolean = false; ef21X: number = 0; ef21Y: number = 0; ef21W: number = 32; ef21H: number = 32; ef21ScaleX: number = 1; ef21ScaleY: number = 1; ef21Opacity: number = 0; ef21Texture: Maybe<TextureAsset> = null;
  ef22Visible: boolean = false; ef22X: number = 0; ef22Y: number = 0; ef22W: number = 32; ef22H: number = 32; ef22ScaleX: number = 1; ef22ScaleY: number = 1; ef22Opacity: number = 0; ef22Texture: Maybe<TextureAsset> = null;
  ef23Visible: boolean = false; ef23X: number = 0; ef23Y: number = 0; ef23W: number = 32; ef23H: number = 32; ef23ScaleX: number = 1; ef23ScaleY: number = 1; ef23Opacity: number = 0; ef23Texture: Maybe<TextureAsset> = null;
  ef24Visible: boolean = false; ef24X: number = 0; ef24Y: number = 0; ef24W: number = 32; ef24H: number = 32; ef24ScaleX: number = 1; ef24ScaleY: number = 1; ef24Opacity: number = 0; ef24Texture: Maybe<TextureAsset> = null;

  // === Elite Warning ===
  eliteWarningVisible: boolean = false;

  // === Boss HP Bar & Warning ===
  bossHpBarVisible: boolean = false;
  bossHpBarWidth: number = 0;
  bossHpBarText: string = '';
  bossWarningVisible: boolean = false;

  // === Elite Glow Slots (5 slots, rendered behind enemy sprites) ===
  eg0Visible: boolean = false; eg0X: number = 0; eg0Y: number = 0; eg0W: number = 64; eg0H: number = 64; eg0Opacity: number = 0; eg0ColorHex: string = '#C08060';
  eg1Visible: boolean = false; eg1X: number = 0; eg1Y: number = 0; eg1W: number = 64; eg1H: number = 64; eg1Opacity: number = 0; eg1ColorHex: string = '#C08060';
  eg2Visible: boolean = false; eg2X: number = 0; eg2Y: number = 0; eg2W: number = 64; eg2H: number = 64; eg2Opacity: number = 0; eg2ColorHex: string = '#C08060';
  eg3Visible: boolean = false; eg3X: number = 0; eg3Y: number = 0; eg3W: number = 64; eg3H: number = 64; eg3Opacity: number = 0; eg3ColorHex: string = '#C08060';
  eg4Visible: boolean = false; eg4X: number = 0; eg4Y: number = 0; eg4W: number = 64; eg4H: number = 64; eg4Opacity: number = 0; eg4ColorHex: string = '#C08060';

  // === Upgrade Selection Screen ===
  upgradeScreenVisible: boolean = false;
  upgrade0Name: string = '';
  upgrade0Desc: string = '';
  upgrade0Level: string = '';
  upgrade1Name: string = '';
  upgrade1Desc: string = '';
  upgrade1Level: string = '';
  upgrade2Name: string = '';
  upgrade2Desc: string = '';
  upgrade2Level: string = '';
  upgrade0Visible: boolean = false;
  upgrade1Visible: boolean = false;
  upgrade2Visible: boolean = false;

  // === Death Screen ===
  deathOverlayVisible: boolean = false;
  deathOverlayOpacity: number = 0;
  deathScreenVisible: boolean = false;
  deathWavesText: string = '';
  deathCoinsText: string = '';
  deathXpText: string = '';

  override readonly events = {
    onStartClicked,
    onPauseClicked,
    onResumeClicked,
    onRestartClicked,
    onRetryClicked,
    onReturnToMenuClicked,
    onUpgrade0Clicked,
    onUpgrade1Clicked,
    onUpgrade2Clicked,
  };
}
