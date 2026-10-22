import React,{useEffect,useState}from'react';
import {StyleSheet,View}from'react-native';
import {useInventoryV2}from'../../context/InventoryV2Context';
import {addInventoryShoppingItem,discoverInventoryShopping}from'../../services/inventoryV2';
import {colors}from'../../constants/theme';
import {AppText,BottomSheet,IconButton,SearchField}from'../ui';

/**
 * THE add-to-shopping surface.
 *
 * ONE component, TWO consumers: the Shopping page and the Purchase screen.
 *
 * Before this extraction the Purchase `+` navigated away to `ShoppingHome`
 * with an `openAddNonce` param: the purchase left the visible context and its
 * session (checked rows, quantities, hidden state, scroll) stopped being the
 * thing the user was looking at. Now the Purchase opens THIS surface OVER the
 * purchase, so closing it reveals exactly the same Purchase.
 *
 * The discovery and the add mutation live here, so both consumers share one
 * implementation and never drift.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/06_BLOCK1_BLOCK2_RUNTIME_RECONCILIATION.md` §12.
 */

const identity=()=>{const value=`inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;return{mutationId:value,idempotencyKey:value};};

export type AddToShoppingSheetProps={
  visible:boolean;
  onClose:()=>void;
};

export function AddToShoppingSheet({visible,onClose}:AddToShoppingSheetProps){
  const {state,accessToken,refresh,showToast}=useInventoryV2();
  const online=state.networkStatus==='online';
  const[query,setQuery]=useState('');
  const[discovery,setDiscovery]=useState<any>({inventory:[],recents:[],catalog:[],custom_query:null});

  useEffect(()=>{if(!visible||!accessToken||!online)return;const timer=setTimeout(()=>void discoverInventoryShopping(accessToken,query).then(setDiscovery).catch(()=>undefined),120);return()=>clearTimeout(timer);},[visible,accessToken,online,query]);
  // A closed sheet never keeps the previous search: the next open starts clean.
  useEffect(()=>{if(!visible)setQuery('');},[visible]);

  const addOne=async(source:'inventory'|'catalog'|'custom',row:any)=>{
    if(!accessToken||!online)return;
    try{
      await addInventoryShoppingItem(accessToken,{source,quantity:1,...(source==='inventory'?{inventory_item_id:row.id}:source==='catalog'?{catalog_item_id:row.id}:{name:row})},identity());
      await refresh();
    }catch{
      showToast({message:'No pudimos agregar el producto.',kind:'error'});
    }
  };

  return <BottomSheet visible={visible} title="Agregar a la lista" variant="flow" onRequestClose={onClose}>
    <SearchField label="Buscar" labelVisible={false} placeholder="Buscar productos" value={query} onChangeText={setQuery}/>
    <View style={s.list}>
      {discovery.inventory?.length?<AppText variant="caption" weight="700">EN INVENTARIO</AppText>:null}
      {discovery.inventory?.map((row:any)=><AddRow key={`i-${row.id}`} title={row.name} subtitle={row.location?.name??'Sin lugar'} onAdd={()=>void addOne('inventory',row)}/>)}
      {discovery.recents?.length?<AppText variant="caption" weight="700">RECIENTES</AppText>:null}
      {discovery.recents?.map((row:any)=><AddRow key={`r-${row.id}`} title={row.canonical_name} subtitle={row.presentation} onAdd={()=>void addOne('catalog',row)}/>)}
      {discovery.catalog?.length?<AppText variant="caption" weight="700">CATÁLOGO</AppText>:null}
      {discovery.catalog?.map((row:any)=><AddRow key={`c-${row.id}`} title={row.canonical_name} subtitle={row.presentation} onAdd={()=>void addOne('catalog',row)}/>)}
      {discovery.custom_query?<AddRow title={`Agregar “${discovery.custom_query}”`} onAdd={()=>void addOne('custom',discovery.custom_query)}/>:null}
    </View>
  </BottomSheet>;
}

function AddRow({title,subtitle,onAdd}:{title:string;subtitle?:string|null;onAdd:()=>void}){
  return <View style={s.row}><View style={{flex:1}}><AppText weight="600">{title}</AppText>{subtitle?<AppText variant="bodySmall" tone="secondary">{subtitle}</AppText>:null}</View><IconButton icon="add" variant="brandSoft" onPress={onAdd} accessibilityLabel={`Agregar ${title}`}/></View>;
}

const s=StyleSheet.create({row:{minHeight:64,paddingVertical:10,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:colors.border.subtle,flexDirection:'row',alignItems:'center',gap:10},list:{paddingVertical:14,gap:6}});
