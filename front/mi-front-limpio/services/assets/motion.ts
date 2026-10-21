/**
 * HOMePLUS Assets — F0 Foundation. Tokens de motion V0.3.
 *
 * Tabla canónica (Target §4, puntos lógicos RN). Curva de entrada
 * equivalente a cubic-bezier(0.2, 0, 0, 1) → Easing.out(Easing.cubic) en
 * Reanimated / Easing nativo. Sin rebote decorativo.
 *
 * TODA animación debe ser cancelable. Reduced Motion: sin traslaciones ni
 * escalas; se conservan estados y significado. La animación jamás retrasa
 * una escritura o navegación.
 */

export const assetsMotion = {
  buttonPressIn: 80,
  buttonRelease: 130,
  secondaryPress: 80,
  iconButtonPress: 80,
  chipPress: 80,
  chipSelection: 120,
  rootToDetail: 240,
  detailToRoot: 230,
  assetToAsset: 210,
  sheetEnter: 280,
  sheetExit: 200,
  scrimEnter: 180,
  scrimExit: 160,
  nestedSheetView: 180,
  disclosure: 200,
  rowInserted: 180,
  rowRemoved: 180,
  statusUpdate: 170,
  errorBar: 170,
  toast: 180,
  pressScaleButton: 0.985,
  pressScaleSecondary: 0.99,
  pressScaleIcon: 0.97,
  pressScaleChip: 0.98,
  pushRootDetail: 18,
  pushAssetAsset: 12,
  nestedOffset: 8,
  rowInsertY: 6,
  errorY: 4,
  scrimOpacity: 0.28,
} as const;

export type AssetsMotionTokens = typeof assetsMotion;

/**
 * Envuelve flags de accesibilidad (Reduce Motion del SO) para desactivar
 * traslaciones/escalas manteniendo estados, contenido y significado.
 */
export const shouldReduceAssetsMotion = (reduceMotionEnabled: boolean): boolean =>
  reduceMotionEnabled;

export const assetsPressScale = (
  kind: 'primary' | 'secondary' | 'icon' | 'chip',
  reduceMotion: boolean,
): number => {
  if (reduceMotion) return 1;
  switch (kind) {
    case 'primary':
      return assetsMotion.pressScaleButton;
    case 'secondary':
      return assetsMotion.pressScaleSecondary;
    case 'icon':
      return assetsMotion.pressScaleIcon;
    case 'chip':
      return assetsMotion.pressScaleChip;
  }
};
