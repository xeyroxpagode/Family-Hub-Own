import React from 'react';
import {StyleSheet,View} from 'react-native';
import {AppButton,AppText} from '../ui';
import {colors,radius} from '../../constants/theme';
export function InventorySelectionBar({lifecycle,count,canDestroy,onAction}:{lifecycle:'active'|'archived'|'trashed';count:number;canDestroy:boolean;onAction:(action:string)=>void}){
  const actions=lifecycle==='active'?[['Mover','move'],['Archivar','archive'],['•••','more']]:lifecycle==='archived'?[['Restaurar','restore'],['Mover','move'],['Papelera','trash']]:[['Restaurar','restore'],...(canDestroy?[['Eliminar','permanent']]:[])];
  return <View style={styles.bar} accessibilityLabel={`${count} productos seleccionados`}>{actions.map(([label,action])=><AppButton key={action} title={label} size="sm" variant={action==='permanent'?'danger':'ghost'} onPress={()=>onAction(action)} style={styles.button}/>)}</View>;
}
const styles=StyleSheet.create({bar:{position:'absolute',left:16,right:16,bottom:84,height:58,borderRadius:radius.lg,backgroundColor:colors.surface.card,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:8,borderWidth:1,borderColor:colors.border.default,elevation:8},button:{flex:1,minWidth:44}});
