import React from 'react';
import {StyleSheet,View} from 'react-native';
import {AppButton} from '../ui';
import {colors,radius} from '../../constants/theme';
import {BOTTOM_CHROME_METRICS} from '../../services/core/bottomChrome';

/**
 * The Inventory selection bar.
 *
 * ONE elevated surface, and its position comes from the shared bottom-chrome
 * contract: it floats ABOVE the BottomNav (which stays below it) and the
 * content of the list reserves the whole stack through
 * `resolveContentBottomInset('selection-bar')`.
 *
 * There is no magic `bottom: 84` here: the offset is derived from the shared
 * metrics, so the nav, the selection bar and the list can never disagree.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §14.15,
 * §14.20.
 */
export function InventorySelectionBar({lifecycle,count,canDestroy,onAction}:{lifecycle:'active'|'archived'|'trashed';count:number;canDestroy:boolean;onAction:(action:string)=>void}){
  const actions=lifecycle==='active'?[['Mover','move'],['Archivar','archive'],['•••','more']]:lifecycle==='archived'?[['Restaurar','restore'],['Mover','move'],['Papelera','trash']]:[['Restaurar','restore'],...(canDestroy?[['Eliminar','permanent']]:[])];
  return <View style={styles.bar} accessibilityLabel={`${count} productos seleccionados`}>
    {actions.map(([label,action])=><AppButton key={action} title={label} size="sm" variant={action==='permanent'?'danger':'ghost'} onPress={()=>onAction(action)} style={styles.button}/>)}
  </View>;
}
const styles=StyleSheet.create({bar:{position:'absolute',left:16,right:16,bottom:BOTTOM_CHROME_METRICS.bottomNavHeight+BOTTOM_CHROME_METRICS.selectionBarGap,height:BOTTOM_CHROME_METRICS.selectionBarHeight,borderRadius:radius.lg,backgroundColor:colors.surface.card,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:8,borderWidth:1,borderColor:colors.border.default,elevation:8},button:{flex:1,minWidth:44}});
