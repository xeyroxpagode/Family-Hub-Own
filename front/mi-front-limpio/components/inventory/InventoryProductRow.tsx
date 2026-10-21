import React from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {HomePlusIcon} from '../../constants/icons';
import {colors} from '../../constants/theme';
import type {InventoryProductV2} from '../../services/inventoryV2';
import {formatInventoryQuantity,inventoryProductIcon} from '../../services/inventoryV2Presentation';
import {AppText} from '../ui';

/**
 * The Inventory product row.
 *
 * Layout contract (frozen):
 *
 * ```
 * [icon 40]  Leche                         2
 *            Heladera · Poco stock
 * ```
 *
 *   height 64 · leading 40 · gap 12 · name 1 line · metadata 1 line ·
 *   right quantity on a stable slot.
 *
 * The row is NOT a card: no radius, no elevation, no shadow-as-divider. The
 * status is never color-only: the words carry the meaning and the color only
 * reinforces it.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §14.6,
 * §14.7, §14.8.
 */
export function InventoryProductRow({product,onPress,onLongPress,selected=false,selection=false,caption=null}:{product:InventoryProductV2;onPress:()=>void;onLongPress?:()=>void;selected?:boolean;selection?:boolean;caption?:string|null}){
  const location=product.location?.name??'Sin lugar';const state=product.quantity<=0?'Agotado':product.quantity<=product.low_stock_threshold?'Poco stock':null;
  const secondary=caption??`${location}${state?` · ${state}`:''}`;
  const label=`${product.name}, ${location}, ${formatInventoryQuantity(product.quantity)} unidades${state?`, ${state.toLowerCase()}`:''}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={selection?{selected}:undefined} onPress={onPress} onLongPress={onLongPress} style={({pressed})=>[styles.row,selection&&selected&&styles.rowSelected,pressed&&styles.pressed]}>
    {selection?<View style={[styles.check,selected&&styles.checkSelected]}>{selected?<HomePlusIcon name="checkmark" size={18} color={colors.text.inverse}/>:null}</View>:<View style={styles.icon}><HomePlusIcon name={inventoryProductIcon(product)} size={22} color={colors.brand}/></View>}
    <View style={styles.copy}>
      <AppText numberOfLines={1} weight="700">{product.name}</AppText>
      {caption?
        <AppText variant="caption" tone="secondary" numberOfLines={1}>{secondary}</AppText>:
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {location}
          {state?` · `:null}
          {state?<AppText variant="caption" tone={state==='Agotado'?'danger':'warning'}>{state}</AppText>:null}
        </AppText>}
    </View>
    <View style={styles.quantitySlot}>
      <AppText weight="700" style={styles.quantity}>{formatInventoryQuantity(product.quantity)}</AppText>
    </View>
  </Pressable>;
}
const styles=StyleSheet.create({row:{height:64,paddingHorizontal:16,backgroundColor:colors.background.base,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:colors.border.subtle},rowSelected:{backgroundColor:colors.surface.soft},pressed:{opacity:.72},icon:{width:40,height:40,borderRadius:14,backgroundColor:colors.brandSoft,alignItems:'center',justifyContent:'center'},copy:{flex:1,minWidth:0,gap:2},check:{width:40,height:40,borderRadius:20,borderWidth:2,borderColor:colors.border.strong,alignItems:'center',justifyContent:'center'},checkSelected:{backgroundColor:colors.brand,borderColor:colors.brand},quantitySlot:{minWidth:28,alignItems:'flex-end',justifyContent:'center'},quantity:{fontVariant:['tabular-nums']}});
