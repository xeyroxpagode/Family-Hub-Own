import React from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {HomePlusIcon} from '../../constants/icons';
import {colors} from '../../constants/theme';
import type {InventoryProductV2} from '../../services/inventoryV2';
import {formatInventoryQuantity,inventoryProductIcon} from '../../services/inventoryV2Presentation';
import {AppText} from '../ui';

export function InventoryProductRow({product,onPress,onLongPress,selected=false,selection=false,caption=null}:{product:InventoryProductV2;onPress:()=>void;onLongPress?:()=>void;selected?:boolean;selection?:boolean;caption?:string|null}){
  const location=product.location?.name??'Sin lugar';const state=product.quantity<=0?'Agotado':product.quantity<=product.low_stock_threshold?'Poco stock':null;
  const secondary=caption??`${location}${state?` · ${state}`:''}`;
  const label=`${product.name}, ${location}, ${formatInventoryQuantity(product.quantity)} unidades${state?`, ${state.toLowerCase()}`:''}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} onPress={onPress} onLongPress={onLongPress} style={({pressed})=>[styles.row,pressed&&styles.pressed]}>
    {selection?<View style={[styles.check,selected&&styles.checkSelected]}>{selected?<HomePlusIcon name="checkmark" size={18} color={colors.text.inverse}/>:null}</View>:<View style={styles.icon}><HomePlusIcon name={inventoryProductIcon(product)} size={22} color={colors.brand}/></View>}
    <View style={styles.copy}><AppText numberOfLines={1} weight="700">{product.name}</AppText><AppText variant="caption" tone={state&&!caption?'brand':'secondary'} numberOfLines={1}>{secondary}</AppText></View>
    <AppText weight="700">{formatInventoryQuantity(product.quantity)}</AppText>
  </Pressable>;
}
const styles=StyleSheet.create({row:{height:64,paddingHorizontal:16,backgroundColor:colors.background.base,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:colors.border.subtle},pressed:{opacity:.72},icon:{width:40,height:40,borderRadius:14,backgroundColor:colors.brandSoft,alignItems:'center',justifyContent:'center'},copy:{flex:1,gap:2},check:{width:40,height:40,borderRadius:20,borderWidth:2,borderColor:colors.border.strong,alignItems:'center',justifyContent:'center'},checkSelected:{backgroundColor:colors.brand,borderColor:colors.brand}});
