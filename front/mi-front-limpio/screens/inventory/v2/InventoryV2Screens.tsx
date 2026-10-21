import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Animated,FlatList,PanResponder,Pressable,ScrollView,StyleSheet,View,useWindowDimensions,type GestureResponderEvent} from 'react-native';
import {useNavigation,useRoute} from '@react-navigation/native';
import {HomePlusIcon} from '../../../constants/icons';
import {colors,radius} from '../../../constants/theme';
import {useBottomChrome} from '../../../context/BottomChromeContext';
import {useInventoryV2} from '../../../context/InventoryV2Context';
import {canInventory} from '../../../services/inventoryCapabilities';
import {
  addInventoryShoppingItem,batchInventoryProducts,changeInventoryProductLifecycle,deleteInventoryLocation,emptyInventoryTrash,listInventoryProducts,moveInventoryLocationProducts,
  permanentlyDeleteInventoryProduct,reorderInventoryLocations,type InventoryLocation,type InventoryProductV2,type ProductListQuery,
} from '../../../services/inventoryV2';
import {
  allProductSelection,buildProductCollectionQuery,chunkProductIds,emptyProductSelection,isProductFilterActive,isProductInCollection,isProductOnShoppingList,
  matchesProductLifecycle,matchesProductSearch,pruneProductSelection,selectedProductIds,toggleProductSelection,type ProductFilterState,type ProductSelectionState,
} from '../../../services/inventoryV2Products';
import {INVENTORY_CATEGORIES,formatInventoryRelativeTime,inventoryCategoryPresentation} from '../../../services/inventoryV2Presentation';
import {resolveContentBottomInset} from '../../../services/core/bottomChrome';
import {
  AdaptiveActionMenu,AdaptiveMenuRow,AdaptiveMenuSeparator,AppButton,AppScreen,AppText,AppToastHost,BottomSheet,ConfirmActionSheet,EmptyState,ErrorState,FilterChip,
  IconButton,menuAnchorFromEvent,SearchField,SegmentedControl,Skeleton,
} from '../../../components/ui';
import {InventoryProductFlowSheet} from '../../../components/inventory/InventoryProductFlowSheet';
import {InventoryProductRow} from '../../../components/inventory/InventoryProductRow';
import {InventorySelectionBar} from '../../../components/inventory/InventorySelectionBar';
import {InventorySwipeRow,closeOpenInventorySwipe,inventorySwipeInteractionAt} from '../../../components/inventory/InventorySwipeRow';
import {InventoryLocationFormSheet} from '../../../components/inventory/InventoryLocationFormSheet';
import {hapticIntent} from '../../../utils/haptics';
import type {InventoryWorkspaceAction,InventoryWorkspacePageProps} from './InventoryWorkspaceScreen';

/**
 * The Inventory V2 Products surfaces.
 *
 * Same product, same concept, premium execution: the canvas, the density, the
 * rows and the status pattern of the CURRENT module are PRESERVED. What this
 * file changes is the continuity (shared header, shared sheet, shared chrome),
 * the gesture behaviour (swipe), the selection semantics (Select All over the
 * WHOLE collection) and the lifecycle actions (Undo, atomic location delete).
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §14.
 */

const identity=()=>{const value=`inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;return{mutationId:value,idempotencyKey:value};};
const productQueryKey=(query:ProductListQuery)=>JSON.stringify(Object.entries(query).filter(([,value])=>value!==undefined&&value!==null&&value!=='').sort(([a],[b])=>a.localeCompare(b)));
/** How many pages the "select all" walk may traverse before giving up. */
const SELECT_ALL_MAX_PAGES=50;

function Header({title,onBack,right,selection,onCancel,onAll,onAllBusy,leftLabel}:{title:string;onBack?:()=>void;right?:React.ReactNode;selection?:number;onCancel?:()=>void;onAll?:()=>void;onAllBusy?:boolean;leftLabel?:string}){return <View style={styles.header}>{selection!==undefined?<><IconButton icon="close" variant="plain" onPress={onCancel} accessibilityLabel="Salir de selección"/><AppText variant="title3" weight="700" numberOfLines={1} style={{flex:1,textAlign:'center'}}>{selection} seleccionados</AppText><AppButton title="Todos" size="sm" variant="ghost" onPress={onAll} loading={onAllBusy}/></>:<>{onBack?leftLabel?<AppButton title={leftLabel} size="sm" variant="ghost" onPress={onBack}/>:<IconButton icon="arrow-back" variant="plain" onPress={onBack} accessibilityLabel="Volver"/>:null}<AppText variant="title2" weight="700" numberOfLines={1} style={{flex:1,textAlign:leftLabel?'center':undefined}}>{title}</AppText>{right}</>}</View>}

/**
 * The connectivity notices.
 *
 * Offline and stale are TWO different states with two different messages, and
 * neither of them ever hides the last known capabilities.
 */
function OfflineBanner(){const {state}=useInventoryV2();if(state.networkStatus==='offline')return <View style={styles.offline}><AppText variant="bodySmall" weight="700">Sin conexión</AppText><AppText variant="caption" tone="secondary">Mostrando datos guardados.</AppText></View>;if(state.stale)return <View style={styles.stale}><AppText variant="bodySmall" weight="700">No pudimos actualizar.</AppText><AppText variant="caption" tone="secondary">Mostrando datos anteriores.</AppText></View>;return null;}

export type InventoryProductsPageProps=InventoryWorkspacePageProps&{embedded?:boolean};

export function InventoryProductsPage({embedded=true,addNonce=0,onOverflowActionsChange,onSelectionStateChange}:InventoryProductsPageProps){
  const navigation=useNavigation<any>();
  const {state,refresh,queryProducts,loadProducts}=useInventoryV2();
  const manage=canInventory(state.capabilities,'inventory.manage');
  const capabilitiesUnknown=state.capabilities===null;
  const [menu,setMenu]=useState<{visible:boolean;anchor:any}>({visible:false,anchor:null});
  const [flow,setFlow]=useState(false);
  const [editor,setEditor]=useState<InventoryProductV2|null>(null);
  const [query,setQuery]=useState('');
  const [serverQuery,setServerQuery]=useState('');
  const {width}=useWindowDimensions();
  const contentInset=resolveContentBottomInset({slot:'bottom-nav',keyboardVisible:false,safeAreaBottom:0});

  useEffect(()=>{const timer=setTimeout(()=>setServerQuery(query.trim()),120);return()=>clearTimeout(timer);},[query]);
  useEffect(()=>{if(serverQuery)void loadProducts({lifecycle:'active',search:serverQuery,limit:50});},[serverQuery,loadProducts]);
  useEffect(()=>{if(addNonce>0)setFlow(true);},[addNonce]);
  const overflowActions=useMemo<InventoryWorkspaceAction[]>(()=>{const actions:InventoryWorkspaceAction[]=[];if(manage)actions.push({id:'locations',label:'Gestionar lugares',onPress:()=>navigation.navigate('Locations')});actions.push({id:'archived',label:'Archivados',onPress:()=>navigation.navigate('ArchivedProducts')});actions.push({id:'trash',label:'Papelera',onPress:()=>navigation.navigate('InventoryTrash')});if(typeof __DEV__!=='undefined'&&__DEV__)actions.push({id:'premium-qa',label:'QA Premium UX (dev)',onPress:()=>navigation.navigate('InventoryPremiumQA')});return actions;},[manage,navigation]);
  useEffect(()=>{onOverflowActionsChange?.(overflowActions);},[onOverflowActionsChange,overflowActions]);
  useEffect(()=>{onSelectionStateChange?.(null);},[onSelectionStateChange]);

  const active=queryProducts({lifecycle:'active',limit:50}).filter(p=>!p.archived_at&&!p.trashed_at);
  const local=active.filter(p=>matchesProductSearch(p,query));
  const serverState=serverQuery?state.productQueries[productQueryKey({lifecycle:'active',search:serverQuery,limit:50})]:undefined;
  const serverReady=Boolean(serverState&&!serverState.loading);
  const results=query.trim()?(serverReady?queryProducts({lifecycle:'active',search:serverQuery,limit:50}).filter(p=>!p.archived_at&&!p.trashed_at):local):active;
  const searching=Boolean(query.trim())&&!serverReady&&local.length===0;
  const locations=Object.values(state.locationsById).sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name)).slice(0,4);
  const openOverflow=()=>setMenu({visible:true,anchor:{x:width-60,y:16,width:44,height:44}});

  const legacyHeader=embedded?null:<><Header title="Inventario" right={<View style={styles.headerActions}><IconButton icon="add" variant="plain" onPress={()=>setFlow(true)} disabled={capabilitiesUnknown&&state.networkStatus!=='online'} accessibilityLabel="Agregar producto"/><IconButton icon="ellipsis-horizontal" variant="plain" onPress={openOverflow} accessibilityLabel="Más opciones"/></View>}/><View style={styles.legacyTabs}><SegmentedControl options={[{value:'products',label:'Productos'},{value:'shopping',label:'Compras'}]} value="products" onChange={value=>{if(value==='shopping')navigation.navigate('ShoppingHome');}} accessibilityLabel="Sección de Inventario"/></View></>;

  if(state.loading&&!state.summary)return <AppScreen safeAreaEdges={embedded?['bottom','left','right']:undefined}>{legacyHeader??<Header title="Inventario"/>}<View style={styles.stack}><Skeleton height={44}/>{Array.from({length:4}).map((_,i)=><Skeleton key={i} height={56}/>)}{Array.from({length:3}).map((_,i)=><Skeleton key={`a${i}`} height={56}/>)}</View></AppScreen>;
  if(state.error&&!state.summary)return <AppScreen safeAreaEdges={embedded?['bottom','left','right']:undefined}>{legacyHeader??<Header title="Inventario"/>}<ErrorState title="No pudimos cargar Inventario" description={state.error} retryLabel="Reintentar" onRetry={refresh}/></AppScreen>;

  return <AppScreen scroll bottomInset="none" safeAreaEdges={embedded?['bottom','left','right']:undefined} contentContainerStyle={[styles.screen,{paddingBottom:contentInset}]}>{legacyHeader}
    <View style={styles.searchWrap}><SearchField label="Buscar productos" labelVisible={false} placeholder="Buscar productos" value={query} onChangeText={setQuery} inputStyle={{minHeight:44}}/><OfflineBanner/></View>
    {query.trim()?searching?<View style={styles.gap12}>{Array.from({length:4}).map((_,i)=><Skeleton key={`s${i}`} height={64}/>)}</View>:results.length?<View style={styles.gap12}>{results.map(product=><InventoryProductRow key={product.id} product={product} onPress={()=>setEditor(product)}/>)}</View>:<EmptyState title={`No encontramos “${query.trim()}”`} description="Probá con otro nombre." actionLabel={manage?`Agregar “${query.trim()}”`:undefined} onAction={manage?()=>setFlow(true):undefined}/>:state.summary?.total_active_products===0?<EmptyState title="Todavía no hay productos" description={'Agregá lo que querés controlar\nen tu casa.'} illustration={<HomePlusIcon name="cube-outline" size={34} color={colors.brand}/>} actionLabel={manage?'Agregar producto':undefined} onAction={manage?()=>setFlow(true):undefined} secondaryActionLabel={manage?'Crear lugares':undefined} onSecondaryAction={manage?()=>navigation.navigate('Locations'):undefined}/>:<View style={styles.rootSections}>
      <View><SectionTitle title="Lugares" action="Ver lugares" onPress={()=>navigation.navigate('Locations')}/><View style={styles.gap4}>{state.summary&&state.summary.unlocated_count>0?<AccessRow icon="help-circle-outline" title="Sin lugar" count={state.summary.unlocated_count} onPress={()=>navigation.navigate('LocationDetail',{locationId:null,title:'Sin lugar'})}/>:null}{locations.map(location=><AccessRow key={location.id} icon={(location.icon_key??'cube-outline') as any} title={location.name} count={location.active_product_count} onPress={()=>navigation.navigate('LocationDetail',{locationId:location.id,title:location.name})}/>)}</View></View>
      {state.summary&&(state.summary.out_of_stock_count>0||state.summary.low_stock_count>0)?<View style={styles.chips}>{state.summary.out_of_stock_count>0?<FilterChip label={`Agotados ${state.summary.out_of_stock_count}`} onPress={()=>navigation.navigate('AllProducts',{stockState:'out'})}/>:null}{state.summary.low_stock_count>0?<FilterChip label={`Poco stock ${state.summary.low_stock_count}`} onPress={()=>navigation.navigate('AllProducts',{stockState:'low'})}/>:null}</View>:null}
      <View style={styles.gap16}><View><AccessRow title="Todos los productos" count={state.summary?.total_active_products??0} onPress={()=>navigation.navigate('AllProducts')}/><AccessRow title="Archivados" count={state.summary?.archived_count??0} onPress={()=>navigation.navigate('ArchivedProducts')}/><AccessRow title="Papelera" count={state.summary?.trashed_count??0} onPress={()=>navigation.navigate('InventoryTrash')}/></View>{manage?<AppButton title="+ Agregar producto" onPress={()=>setFlow(true)}/>:null}</View>
    </View>}
    {!embedded?<AdaptiveActionMenu visible={menu.visible} title="Inventario" anchor={menu.anchor} itemCount={overflowActions.length} width={224} openDurationMs={130} closeDurationMs={100} initialScale={.96} initialTranslateY={-3} popoverRadius={14} transparentBackdrop onRequestClose={()=>setMenu(v=>({...v,visible:false}))}>{overflowActions.map(action=><AdaptiveMenuRow key={action.id} title={action.label} onPress={()=>{setMenu(v=>({...v,visible:false}));action.onPress();}}/>)}</AdaptiveActionMenu>:null}
    <InventoryProductFlowSheet visible={flow} initialName={query.trim()} onClose={()=>setFlow(false)}/>
    <InventoryProductFlowSheet visible={Boolean(editor)} product={editor} readOnly={!manage} onClose={()=>setEditor(null)}/>
  </AppScreen>;
}

/**
 * Legacy standalone route for Productos. It keeps the legacy surface (header
 * + canonical selector) until the Block 4 cleanup removes the legacy routes.
 */
export function InventoryProductsRootScreen(){return <InventoryProductsPage embedded={false}/>}

export function AllProductsScreen(){const route=useRoute<any>();return <ProductListScreen title="Todos los productos" lifecycle="active" initial={{stock_state:route.params?.stockState,location_id:route.params?.unlocated?'none':route.params?.locationId,category:route.params?.category}}/>}
export function ArchivedProductsScreen(){return <ProductListScreen title="Archivados" lifecycle="archived"/>}
export function InventoryTrashScreen(){return <ProductListScreen title="Papelera" lifecycle="trashed"/>}
export function LocationDetailScreen(){const route=useRoute<any>();return <ProductListScreen title={route.params.title} lifecycle="active" locationId={route.params.locationId}/>}

function ProductListScreen({title,lifecycle,locationId,initial={}}:{title:string;lifecycle:'active'|'archived'|'trashed';locationId?:string|null;initial?:Partial<ProductListQuery>}){
  const navigation=useNavigation<any>();
  const {state,accessToken,refresh,refreshShopping,loadProducts,queryProducts,patchProduct,removeProduct,showToast,toast,dismissToast,sheetOpen}=useInventoryV2();
  const {setSlot}=useBottomChrome();
  const manage=canInventory(state.capabilities,'inventory.manage');
  const destroy=canInventory(state.capabilities,'inventory.destroy');
  const online=state.networkStatus==='online';
  const {width}=useWindowDimensions();

  const [search,setSearch]=useState('');
  const [debouncedSearch,setDebouncedSearch]=useState('');
  const [stock,setStock]=useState<'low'|'out'|undefined>(initial.stock_state==='low'||initial.stock_state==='out'?initial.stock_state:undefined);
  const [category,setCategory]=useState<string|undefined>(initial.category);
  const [location,setLocation]=useState<string|undefined>(locationId===null?'none':locationId??initial.location_id);
  const [selection,setSelection]=useState<ProductSelectionState>(emptyProductSelection());
  const [selectionCatalog,setSelectionCatalog]=useState<Record<string,InventoryProductV2>>({});
  const [selectAllBusy,setSelectAllBusy]=useState(false);
  const [editor,setEditor]=useState<InventoryProductV2|null>(null);
  const [addFlow,setAddFlow]=useState(false);
  const [menu,setMenu]=useState<{product:InventoryProductV2|null;anchor:any}>({product:null,anchor:null});
  const [screenMenu,setScreenMenu]=useState<any>(null);
  const [picker,setPicker]=useState<'location'|'category'|'more'|null>(null);
  const [confirm,setConfirm]=useState<'permanent'|'empty'|null>(null);
  const [moveHere,setMoveHere]=useState(false);
  const [moveHereSearch,setMoveHereSearch]=useState('');
  const [moveHereSelection,setMoveHereSelection]=useState<Set<string>>(new Set());
  const [locationForm,setLocationForm]=useState<{visible:boolean;location:InventoryLocation|null}>({visible:false,location:null});
  const [deleteLocation,setDeleteLocation]=useState<InventoryLocation|null>(null);
  const [deleteDestination,setDeleteDestination]=useState<string|undefined>(undefined);
  const filterScroll=useRef<ScrollView|null>(null);
  const chipOffsets=useRef<Record<string,{x:number;width:number}>>({});
  const chipScrollX=useRef(0);const chipViewportWidth=useRef(0);
  const stateRef=useRef(state);stateRef.current=state;

  const filter:ProductFilterState=useMemo(()=>({stock,category,location:locationId===undefined?location:locationId===null?'none':location}),[stock,category,location,locationId]);
  const filterActive=isProductFilterActive({stock,category,location:locationId===undefined?location:undefined});
  const query:ProductListQuery=useMemo(()=>buildProductCollectionQuery({lifecycle,search:debouncedSearch,filter,limit:50}),[lifecycle,debouncedSearch,filter]);
  const key=productQueryKey(query);
  const queryState=state.productQueries[key];

  const resolveProduct=useCallback((id:string)=>stateRef.current.productsById[id]??selectionCatalog[id],[selectionCatalog]);
  const selectedIds=useMemo(()=>selectedProductIds(selection),[selection]);
  const selected=useMemo(()=>selectedIds.map(resolveProduct).filter(Boolean) as InventoryProductV2[],[selectedIds,resolveProduct]);
  const selectedCount=selected.length;

  useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(search.trim()),120);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{void loadProducts(query);},[query,loadProducts]);
  useEffect(()=>{closeOpenInventorySwipe();},[selectedCount,debouncedSearch,stock,category,location]);
  useEffect(()=>{setSelection(emptyProductSelection());setSelectionCatalog({});setMenu({product:null,anchor:null});setScreenMenu(null);setPicker(null);setConfirm(null);setEditor(null);setAddFlow(false);setMoveHere(false);},[state.scopeKey]);
  useEffect(()=>{setSlot(selectedCount>0?'selection-bar':'bottom-nav');return()=>setSlot('bottom-nav');},[selectedCount,setSlot]);

  // A product that leaves the collection by realtime/domain mutation leaves the
  // selection; an empty selection leaves Selection Mode automatically.
  useEffect(()=>{
    if(!selectedIds.length)return;
    const pruned=pruneProductSelection(selection,id=>{
      const product=resolveProduct(id);
      if(!product)return true;
      return isProductInCollection(product,{lifecycle,filter,search:debouncedSearch});
    });
    if(pruned.ids.length!==selection.ids.length||pruned.allIds.length!==selection.allIds.length||pruned.excluded.length!==selection.excluded.length)setSelection(pruned);
  },[selectedIds.length,selection,resolveProduct,lifecycle,filter,debouncedSearch]);

  const products=queryProducts(query).filter(product=>matchesProductLifecycle(product,lifecycle)).filter(product=>matchesProductSearch(product,debouncedSearch));
  const contentInset=resolveContentBottomInset({slot:selectedCount>0?'selection-bar':'bottom-nav',keyboardVisible:false,safeAreaBottom:0});
  const cachedActive=queryProducts({lifecycle:'active',limit:50}).filter(p=>!p.archived_at&&!p.trashed_at&&p.location_id!==(locationId??null)&&matchesProductSearch(p,moveHereSearch));

  const act=async(operation:string,targets:InventoryProductV2[],payload:Record<string,unknown>={},isUndo=false)=>{
    if(!accessToken||!targets.length||!online)return;
    const before=targets;const now=new Date().toISOString();
    targets.forEach(product=>{
      if(operation==='permanent'){removeProduct(product.id);return;}
      const optimisticProduct={...product,version:product.version+1};
      if(operation==='archive')optimisticProduct.archived_at=now;
      if(operation==='restore')optimisticProduct.archived_at=null;
      if(operation==='trash')optimisticProduct.trashed_at=now;
      if(operation==='restore_from_trash'){optimisticProduct.trashed_at=null;optimisticProduct.archived_at=product.pre_trash_lifecycle==='archived'?product.archived_at??now:null;}
      if(operation==='set_category'&&typeof payload.category_key==='string')optimisticProduct.category_key=payload.category_key;
      if(operation==='enable_auto_restock'){optimisticProduct.auto_restock_enabled=true;optimisticProduct.low_stock_threshold=Number(payload.low_stock_threshold??1);optimisticProduct.target_quantity=Number(payload.target_quantity??3);}
      if(operation==='disable_auto_restock')optimisticProduct.auto_restock_enabled=false;
      if(operation==='move')optimisticProduct.location_id=payload.location_id===null||typeof payload.location_id==='string'?payload.location_id as string|null:product.location_id;
      patchProduct(optimisticProduct);
    });
    try{
      if(targets.length===1&&['archive','restore','trash','restore_from_trash'].includes(operation)){const apiAction=operation==='restore_from_trash'?'restore-from-trash':operation as any;const response=await changeInventoryProductLifecycle(accessToken,targets[0].id,apiAction,{...identity(),expectedVersion:targets[0].version});patchProduct(response.item);}
      else if(targets.length===1&&operation==='permanent')await permanentlyDeleteInventoryProduct(accessToken,targets[0].id,{...identity(),expectedVersion:targets[0].version});
      else{
        const chunks=chunkProductIds(targets.map(target=>target.id));
        for(const chunk of chunks){
          const chunkTargets=chunk.map(id=>targets.find(target=>target.id===id)!);
          const response=await batchInventoryProducts(accessToken,{items:chunkTargets.map(p=>({id:p.id,expected_version:p.version})),operation:operation as any,payload},identity());
          response.items.filter((p:any)=>!p.deleted).forEach(p=>patchProduct(p));
        }
      }
      const count=targets.length;const undoOperation=operation==='archive'?'restore':operation==='trash'?'restore_from_trash':null;
      const message=operation==='archive'?(count===1?'Producto archivado':`${count} productos archivados`):operation==='trash'?(count===1?'Movido a Papelera':`${count} productos movidos a Papelera`):operation==='move'?(count===1?'Producto movido':`${count} productos movidos`):operation==='set_category'?(count===1?'Categoría actualizada':`${count} productos actualizados`):'Cambios guardados';
      showToast({message,durationMs:undoOperation?5000:2200,onUndo:undoOperation?()=>void act(undoOperation,before.map(p=>stateRef.current.productsById[p.id]??p),{},true):undefined});
      setSelection(emptyProductSelection());setSelectionCatalog({});
    }catch{
      before.forEach(p=>patchProduct(p));
      showToast({message:isUndo?'No pudimos deshacer porque algunos productos cambiaron.':'No pudimos completar la acción.',kind:'error'});
      void loadProducts(query);
    }
  };

  /**
   * "Todos" means EVERY result of the active collection, not the loaded rows:
   * the pages of the active query are walked with the existing read API.
   */
  const selectAll=async()=>{
    if(!accessToken||!online)return;
    setSelectAllBusy(true);
    try{
      const collected:InventoryProductV2[]=[];let cursor:string|undefined=undefined;
      for(let page=0;page<SELECT_ALL_MAX_PAGES;page++){
        const response=await listInventoryProducts(accessToken,{...query,limit:100,cursor});
        response.items.forEach(item=>{if(matchesProductSearch(item,debouncedSearch))collected.push(item);});
        if(!response.next_cursor)break;
        cursor=response.next_cursor;
      }
      setSelectionCatalog(Object.fromEntries(collected.map(item=>[item.id,item])));
      setSelection(allProductSelection(collected.map(item=>item.id)));
    }catch{
      showToast({message:'No pudimos seleccionar todos los productos.',kind:'error'});
    }finally{setSelectAllBusy(false);}
  };

  const addToShoppingList=async(product:InventoryProductV2)=>{
    if(!accessToken||!online)return;
    if(isProductOnShoppingList(state.shopping,product.id)){showToast({message:`${product.name} ya está en la lista`});return;}
    try{
      await addInventoryShoppingItem(accessToken,{source:'inventory',inventory_item_id:product.id,quantity:1},identity());
      await refreshShopping();
      showToast({message:`${product.name} agregado a la lista`,kind:'success'});
    }catch{
      showToast({message:'No pudimos agregar a la lista.',kind:'error'});
    }
  };

  const toggle=(id:string)=>{hapticIntent('selection');setSelection(current=>toggleProductSelection(current,id));};
  const runSelection=(operation:string)=>{if(operation==='move'){setPicker('location');return;}if(operation==='more'){setPicker('more');return;}if(operation==='permanent'){setConfirm('permanent');return;}void act(operation,selected);};
  const deleteNow=()=>{if(accessToken&&deleteLocation&&online)void deleteInventoryLocation(accessToken,deleteLocation.id,deleteDestination==='none'?null:deleteDestination??null,identity()).then(()=>{showToast({message:'Lugar eliminado'});setDeleteLocation(null);setDeleteDestination(undefined);void refresh();navigation.goBack();});else{setDeleteLocation(null);setDeleteDestination(undefined);}};
  const screenOverflow=()=>setScreenMenu({x:width-60,y:16,width:44,height:44});
  const emptyTitle=lifecycle==='archived'?'No hay productos archivados':lifecycle==='trashed'?'La Papelera está vacía':search||filterActive?'No encontramos productos':'No hay productos';

  const screenActions=useMemo(()=>{
    const actions:{id:string;label:string;variant?:'danger';onPress:()=>void}[]=[];
    if(locationId===undefined&&lifecycle==='active'&&manage)actions.push({id:'locations',label:'Gestionar lugares',onPress:()=>navigation.navigate('Locations')});
    if(locationId!==undefined&&manage&&locationId!==null){
      actions.push({id:'edit-location',label:'Editar lugar',onPress:()=>setLocationForm({visible:true,location:state.locationsById[locationId]??null})});
      actions.push({id:'move-here',label:'Mover productos acá',onPress:()=>setMoveHere(true)});
      actions.push({id:'delete-location',label:'Eliminar lugar',variant:'danger',onPress:()=>{setDeleteLocation(state.locationsById[locationId]??null);setDeleteDestination(state.locationsById[locationId]?.managed_product_count?'':'none');}});
    }
    if(locationId!==undefined&&locationId===null&&manage)actions.push({id:'move-here',label:'Mover productos acá',onPress:()=>setMoveHere(true)});
    if(lifecycle==='trashed'&&destroy)actions.push({id:'empty-trash',label:'Vaciar Papelera',variant:'danger',onPress:()=>setConfirm('empty')});
    return actions;
  },[locationId,lifecycle,manage,destroy,navigation,state.locationsById]);

  /**
   * Keep the selected chip visible with the MINIMUM scroll: a chip that is
   * already visible is never moved, so the bar never hides the chip the user
   * did not choose.
   */
  const ensureChipVisible=useCallback((chipId:string)=>{
    const entry=chipOffsets.current[chipId];
    const scroll=filterScroll.current;
    if(!entry||!scroll)return;
    const viewport=chipViewportWidth.current;
    const current=chipScrollX.current;
    if(entry.x>=current-1&&entry.x+entry.width<=current+viewport-1)return;
    const target=entry.x+entry.width>current+viewport?entry.x+entry.width-viewport+8:Math.max(0,entry.x-8);
    scroll.scrollTo({x:target,animated:true});
  },[]);
  useEffect(()=>{if(stock)ensureChipVisible('stock');else if(category)ensureChipVisible('category');else if(location!==undefined)ensureChipVisible('location');},[stock,category,location,ensureChipVisible]);

  return <AppScreen padded={false} bottomInset="none"><View style={{paddingHorizontal:16}}>
    <Header title={title} onBack={()=>navigation.goBack()} selection={selectedCount>0?selectedCount:undefined} onCancel={()=>{setSelection(emptyProductSelection());setSelectionCatalog({});}} onAll={()=>void selectAll()} onAllBusy={selectAllBusy} right={screenActions.length?<IconButton icon="ellipsis-horizontal" variant="plain" onPress={screenOverflow} accessibilityLabel="Más opciones"/>:null}/>
    {locationId!==undefined?<AppText variant="bodySmall" tone="secondary">{locationId===null?state.summary?.unlocated_count??0:state.locationsById[locationId]?.active_product_count??0} productos</AppText>:null}
    <OfflineBanner/>
    <SearchField label={`Buscar en ${title}`} labelVisible={false} placeholder={`Buscar en ${title}`} value={search} onChangeText={setSearch} editable={selectedCount===0} inputStyle={{minHeight:44}}/>
    {lifecycle==='active'&&selectedCount===0?(
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} ref={filterScroll} onLayout={event=>{chipViewportWidth.current=event.nativeEvent.layout.width;}} onScroll={event=>{chipScrollX.current=event.nativeEvent.contentOffset.x;}} scrollEventThrottle={16}>
        <FilterChip label="Todos" selected={!stock&&!location&&!category} onPress={()=>{setStock(undefined);setLocation(undefined);setCategory(undefined);}}/>
        <View onLayout={event=>{chipOffsets.current.stock={x:event.nativeEvent.layout.x,width:event.nativeEvent.layout.width};}}><FilterChip label="Agotados" selected={stock==='out'} onPress={()=>setStock(stock==='out'?undefined:'out')}/></View>
        <View onLayout={event=>{chipOffsets.current.stock={x:event.nativeEvent.layout.x,width:event.nativeEvent.layout.width};}}><FilterChip label="Poco stock" selected={stock==='low'} onPress={()=>setStock(stock==='low'?undefined:'low')}/></View>
        <View onLayout={event=>{chipOffsets.current.location={x:event.nativeEvent.layout.x,width:event.nativeEvent.layout.width};}}><FilterChip label={location==='none'?'Sin lugar':state.locationsById[location??'']?.name??'Lugar'} selected={Boolean(location)} onPress={()=>setPicker('location')} onClear={location?()=>setLocation(locationId===null?'none':undefined):undefined}/></View>
        <View onLayout={event=>{chipOffsets.current.category={x:event.nativeEvent.layout.x,width:event.nativeEvent.layout.width};}}><FilterChip label={category?inventoryCategoryPresentation(category).label:'Categoría'} selected={Boolean(category)} onPress={()=>setPicker('category')} onClear={category?()=>setCategory(undefined):undefined}/></View>
        <View style={styles.chipPeek}/>
      </ScrollView>
    ):null}
  </View>
    {queryState?.loading&&!products.length?<View style={styles.listPad}>{Array.from({length:7}).map((_,i)=><Skeleton key={i} height={64}/>)}</View>:queryState?.error&&!products.length?<View style={styles.listPad}><ErrorState description={queryState.error} onRetry={()=>loadProducts(query)}/></View>:<FlatList data={products} keyExtractor={p=>p.id} onScrollBeginDrag={closeOpenInventorySwipe} contentContainerStyle={[products.length?undefined:styles.emptyList,{paddingBottom:contentInset}]} renderItem={({item})=><InventorySwipeRow disabled={!manage||selectedCount>0} closeSignal={`${selectedCount}-${selection.ids.length}-${selection.allIds.length}`} onPrimary={()=>void addToShoppingList(item)} primaryDone={isProductOnShoppingList(state.shopping,item.id)} onMore={event=>setMenu({product:item,anchor:menuAnchorFromEvent(event)})}><InventoryProductRow product={item} caption={lifecycle==='trashed'?`${item.location?.name??'Sin lugar'} · ${formatInventoryRelativeTime(item.trashed_at)}`:undefined} selection={selectedCount>0} selected={selectedIds.includes(item.id)} onPress={()=>{if(Date.now()-inventorySwipeInteractionAt()<400)return;if(selectedCount>0){toggle(item.id);}else{setEditor(item);}}} onLongPress={manage?()=>{hapticIntent('selection');setSelection(current=>toggleProductSelection(current,item.id));}:undefined}/></InventorySwipeRow>} ListEmptyComponent={<EmptyState title={locationId!==undefined?`${title} está vacío`:emptyTitle} description={search||filterActive?'Cambiá la búsqueda o los filtros.':''} actionLabel={locationId!==undefined&&manage?'Agregar producto':search||filterActive?'Limpiar filtros':undefined} onAction={locationId!==undefined&&manage?()=>setAddFlow(true):()=>{setSearch('');setStock(undefined);setCategory(undefined);setLocation(locationId===null?'none':locationId);}} secondaryActionLabel={locationId!==undefined&&manage?'Mover productos acá':undefined} onSecondaryAction={locationId!==undefined&&manage?()=>setMoveHere(true):undefined}/>} onEndReached={()=>queryState?.nextCursor&&void loadProducts(query,true)} onEndReachedThreshold={.5}/>}
    {selectedCount>0?<InventorySelectionBar lifecycle={lifecycle} count={selectedCount} canDestroy={destroy} onAction={runSelection}/>:null}
    <AdaptiveActionMenu visible={Boolean(menu.product)} title={menu.product?.name??''} anchor={menu.anchor} itemCount={4} width={224} openDurationMs={130} closeDurationMs={100} initialScale={.96} initialTranslateY={-3} popoverRadius={14} transparentBackdrop onRequestClose={()=>setMenu({product:null,anchor:null})}>
      {menu.product&&lifecycle==='active'?<><AdaptiveMenuRow title="Editar" onPress={()=>{setEditor(menu.product);setMenu({product:null,anchor:null});}}/><AdaptiveMenuRow title="Mover a…" onPress={()=>{setSelection(current=>toggleProductSelection(current,menu.product!.id));setPicker('location');setMenu({product:null,anchor:null});}}/><AdaptiveMenuRow title={isProductOnShoppingList(state.shopping,menu.product.id)?'En lista':'Agregar a la lista'} disabled={isProductOnShoppingList(state.shopping,menu.product.id)} onPress={()=>{void addToShoppingList(menu.product!);setMenu({product:null,anchor:null});}}/><AdaptiveMenuSeparator/><AdaptiveMenuRow title="Archivar" onPress={()=>{void act('archive',[menu.product!]);setMenu({product:null,anchor:null});}}/><AdaptiveMenuRow title="Mover a Papelera" variant="danger" onPress={()=>{void act('trash',[menu.product!]);setMenu({product:null,anchor:null});}}/></>:menu.product&&lifecycle==='archived'?<><AdaptiveMenuRow title="Restaurar" onPress={()=>{void act('restore',[menu.product!]);setMenu({product:null,anchor:null});}}/><AdaptiveMenuRow title="Mover a…" onPress={()=>{setSelection(current=>toggleProductSelection(current,menu.product!.id));setPicker('location');setMenu({product:null,anchor:null});}}/><AdaptiveMenuSeparator/><AdaptiveMenuRow title="Mover a Papelera" variant="danger" onPress={()=>{void act('trash',[menu.product!]);setMenu({product:null,anchor:null});}}/></>:menu.product?<><AdaptiveMenuRow title="Restaurar" onPress={()=>{void act('restore_from_trash',[menu.product!]);setMenu({product:null,anchor:null});}}/>{destroy?<><AdaptiveMenuSeparator/><AdaptiveMenuRow title="Eliminar definitivamente" variant="danger" onPress={()=>{setSelection(current=>toggleProductSelection(current,menu.product!.id));setConfirm('permanent');setMenu({product:null,anchor:null});}}/></>:null}</>:null}
    </AdaptiveActionMenu>
    <AdaptiveActionMenu visible={Boolean(screenMenu)} title={title} anchor={screenMenu} itemCount={screenActions.length} width={224} openDurationMs={130} closeDurationMs={100} initialScale={.96} initialTranslateY={-3} popoverRadius={14} transparentBackdrop onRequestClose={()=>setScreenMenu(null)}>{screenActions.map(action=><AdaptiveMenuRow key={action.id} title={action.label} variant={action.variant} onPress={()=>{setScreenMenu(null);action.onPress();}}/>)}</AdaptiveActionMenu>
    <InventoryLocationFormSheet visible={locationForm.visible} location={locationForm.location} onClose={()=>setLocationForm({visible:false,location:null})} onSaved={()=>{void refresh();showToast({message:locationForm.location?'Lugar actualizado':'Lugar creado'});}}/>
    <BottomSheet visible={Boolean(deleteLocation)&&Boolean(deleteLocation?.managed_product_count)} title={deleteLocation?`Eliminar “${deleteLocation.name}”`:'Eliminar lugar'} variant="standard" onRequestClose={()=>setDeleteLocation(null)} footer={<AppButton title="Continuar" variant="danger" disabled={!deleteDestination||!online} onPress={deleteNow}/>}>
      <View style={styles.stack}>
        <AppText tone="secondary">Hay {deleteLocation?.managed_product_count??0} productos en este lugar.</AppText>
        <AppText weight="700">Mover productos a</AppText>
        <ChoiceRow id="none" label="Sin lugar" selected={deleteDestination==='none'} onPress={()=>setDeleteDestination('none')}/>
        {Object.values(state.locationsById).filter(l=>l.id!==deleteLocation?.id).map(l=><ChoiceRow key={l.id} id={l.id} label={l.name} selected={deleteDestination===l.id} onPress={()=>setDeleteDestination(l.id)}/>)}
      </View>
    </BottomSheet>
    {deleteLocation&&!deleteLocation.managed_product_count?<ConfirmActionSheet visible title={`Eliminar ${deleteLocation.name}`} body="Este lugar se eliminará." primaryLabel="Eliminar lugar" variant="destructive" onCancel={()=>setDeleteLocation(null)} onPrimary={deleteNow}/>:null}
    <InventoryProductFlowSheet visible={Boolean(editor)} product={editor} readOnly={!manage} onClose={()=>setEditor(null)}/>
    <InventoryProductFlowSheet visible={addFlow} defaultLocationId={locationId??null} onClose={()=>setAddFlow(false)}/>
    <BottomSheet visible={moveHere} title={`Mover productos a ${title}`} variant="flow" onRequestClose={()=>setMoveHere(false)} footer={<AppButton title={`Mover ${moveHereSelection.size} productos`} disabled={!moveHereSelection.size||!online} onPress={()=>{if(accessToken){const chosen=cachedActive.filter(p=>moveHereSelection.has(p.id));chosen.forEach(p=>patchProduct({...p,location_id:locationId??null,version:p.version+1}));void batchInventoryProducts(accessToken,{items:chosen.map(p=>({id:p.id,expected_version:p.version})),operation:'move',payload:{location_id:locationId??null}},identity()).then(r=>{r.items.forEach(p=>patchProduct(p));setMoveHereSelection(new Set());setMoveHere(false);showToast({message:`${r.items.length} productos movidos`});void loadProducts(query);}).catch(()=>{chosen.forEach(p=>patchProduct(p));showToast({message:'No pudimos completar la acción.',kind:'error'});});}}}/>}>
      <SearchField label="Buscar productos" labelVisible={false} placeholder="Buscar productos" value={moveHereSearch} onChangeText={setMoveHereSearch} inputStyle={{minHeight:44}}/>
      <View style={styles.stack}>
        {cachedActive.map(item=><InventoryProductRow key={item.id} product={item} selection selected={moveHereSelection.has(item.id)} onPress={()=>setMoveHereSelection(current=>{const next=new Set(current);if(next.has(item.id)){next.delete(item.id);}else{next.add(item.id);}return next;})}/>)}
      </View>
    </BottomSheet>
    <BottomSheet visible={picker==='location'} title={lifecycle==='active'?'Elegir lugar':'Mover productos'} variant="standard" onRequestClose={()=>setPicker(null)}>
      <View style={styles.stack}>
        {Object.values(state.locationsById).map(l=><ChoiceRow key={l.id} id={l.id} label={l.name} selected={location===l.id} onPress={()=>{if(selectedCount>0)void act('move',selected,{location_id:l.id});else setLocation(l.id);setPicker(null);}}/>)}
        <ChoiceRow id="none" label="Sin lugar" selected={location==='none'} onPress={()=>{if(selectedCount>0)void act('move',selected,{location_id:null});else setLocation('none');setPicker(null);}}/>
      </View>
    </BottomSheet>
    <BottomSheet visible={picker==='category'} title="Elegir categoría" variant="standard" onRequestClose={()=>setPicker(null)}>
      <View style={styles.stack}>
        {INVENTORY_CATEGORIES.map(c=><ChoiceRow key={c.key} id={c.key} label={c.label} selected={category===c.key} onPress={()=>{if(selectedCount>0)void act('set_category',selected,{category_key:c.key});else setCategory(c.key);setPicker(null);}}/>)}
      </View>
    </BottomSheet>
    <BottomSheet visible={picker==='more'} title="Acciones" variant="standard" onRequestClose={()=>setPicker(null)}>
      <View style={styles.stack}>
        <AppButton title="Cambiar categoría" variant="ghost" onPress={()=>setPicker('category')}/>
        <AppButton title="Activar reposición" variant="ghost" onPress={()=>{void act('enable_auto_restock',selected,{low_stock_threshold:1,target_quantity:3});setPicker(null);}}/>
        <AppButton title="Desactivar reposición" variant="ghost" onPress={()=>{void act('disable_auto_restock',selected);setPicker(null);}}/>
        <View style={styles.menuDivider}/>
        <AppButton title="Mover a Papelera" variant="danger" onPress={()=>{void act('trash',selected);setPicker(null);}}/>
      </View>
    </BottomSheet>
    <ConfirmActionSheet visible={confirm==='permanent'} title="Eliminar definitivamente" body={selected.length===1?`“${selected[0]?.name}” se eliminará de forma permanente.\nEsta acción no se puede deshacer.`:`Se eliminarán permanentemente ${selected.length} productos.\nEsta acción no se puede deshacer.`} primaryLabel="Eliminar definitivamente" variant="destructive" onCancel={()=>setConfirm(null)} onPrimary={()=>{setConfirm(null);void act('permanent',selected);}}/>
    <ConfirmActionSheet visible={confirm==='empty'} title="Vaciar Papelera" body={`Se eliminarán permanentemente ${state.summary?.trashed_count??0} productos.\nEsta acción no se puede deshacer.`} primaryLabel="Vaciar Papelera" variant="destructive" onCancel={()=>setConfirm(null)} onPrimary={()=>{if(accessToken&&online)void emptyInventoryTrash(accessToken,identity()).then(r=>{products.forEach(p=>removeProduct(p.id));setSelection(emptyProductSelection());setSelectionCatalog({});showToast({message:`${r.deleted_count} productos eliminados`});});setConfirm(null);}}/>
    <AppToastHost toast={toast} onDismiss={dismissToast} sheetOpen={sheetOpen}/>
  </AppScreen>;
}

export function InventoryLocationsScreen(){
  const navigation=useNavigation<any>();const {state,accessToken,refresh,showToast}=useInventoryV2();const manage=canInventory(state.capabilities,'inventory.manage');const online=state.networkStatus==='online';const [search,setSearch]=useState('');const [reorder,setReorder]=useState(false);const [order,setOrder]=useState<InventoryLocation[]>([]);const [dragIndex,setDragIndex]=useState<number|null>(null);const [deleteLocation,setDeleteLocation]=useState<InventoryLocation|null>(null);const [deleteDestination,setDeleteDestination]=useState<string|undefined>(undefined);const [form,setForm]=useState<{visible:boolean;location:InventoryLocation|null}>({visible:false,location:null});const [locationMenu,setLocationMenu]=useState<{location:InventoryLocation|null;anchor:any}|null>(null);const [moveSource,setMoveSource]=useState<InventoryLocation|null>(null);
  const dragIndexRef=useRef<number|null>(null);const dragStartY=useRef(0);
  const locations=useMemo(()=>Object.values(state.locationsById).sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name)),[state.locationsById]);
  useEffect(()=>setOrder(locations),[locations]);
  const visible=reorder?order:locations.filter(l=>l.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  const saveOrder=async()=>{if(!accessToken||!online)return;await reorderInventoryLocations(accessToken,order.map(l=>l.id),identity());setReorder(false);void refresh();};
  const startDrag=(index:number,pageY:number)=>{dragIndexRef.current=index;dragStartY.current=pageY;setDragIndex(index);};
  const moveDrag=(pageY:number)=>{const from=dragIndexRef.current;if(from==null)return;const target=Math.max(0,Math.min(visible.length-1,from+Math.round((pageY-dragStartY.current)/60)));if(target!==from){hapticIntent('selection');setOrder(rows=>{const next=[...rows];const [row]=next.splice(from,1);next.splice(target,0,row);return next;});dragIndexRef.current=target;setDragIndex(target);}};
  const endDrag=()=>{dragIndexRef.current=null;setDragIndex(null);};
  const deleteNow=()=>{if(accessToken&&deleteLocation&&online)void deleteInventoryLocation(accessToken,deleteLocation.id,deleteDestination==='none'?null:deleteDestination??null,identity()).then(()=>{showToast({message:'Lugar eliminado'});void refresh();});setDeleteLocation(null);setDeleteDestination(undefined);};
  const moveNow=(destination:string)=>{if(accessToken&&moveSource&&online)void moveInventoryLocationProducts(accessToken,moveSource.id,destination==='none'?null:destination,identity()).then(result=>{showToast({message:`${result.moved_products} productos movidos`});void refresh();});setMoveSource(null);};
  return <AppScreen padded={false}><View style={{paddingHorizontal:16}}><Header title={reorder?'Ordenar lugares':'Lugares'} onBack={reorder?()=>{setOrder(locations);setReorder(false);}:()=>navigation.goBack()} leftLabel={reorder?'Cancelar':undefined} right={reorder?<AppButton title="Listo" size="sm" onPress={saveOrder}/>:manage?<View style={styles.headerActions}><IconButton icon="add" variant="plain" onPress={()=>setForm({visible:true,location:null})} accessibilityLabel="Nuevo lugar"/><AppButton title="Ordenar" size="sm" variant="ghost" onPress={()=>setReorder(true)}/></View>:null}/><SearchField label="Buscar lugares" labelVisible={false} placeholder="Buscar lugares" value={search} onChangeText={setSearch} editable={!reorder} inputStyle={{minHeight:44}}/></View><FlatList data={visible} keyExtractor={l=>l.id} ListHeaderComponent={!reorder?<LocationRow name="Sin lugar" icon="help-circle-outline" count={state.summary?.unlocated_count??0} onPress={()=>navigation.navigate('LocationDetail',{locationId:null,title:'Sin lugar'})}/>:null} renderItem={({item,index})=><LocationRow name={item.name} icon={(item.icon_key??'cube-outline') as any} count={item.active_product_count} onPress={()=>navigation.navigate('LocationDetail',{locationId:item.id,title:item.name})} reorder={reorder} index={index} dragActive={dragIndex===index} onDragStart={startDrag} onDragMove={moveDrag} onDragEnd={endDrag} onDelete={manage?(event:GestureResponderEvent)=>setLocationMenu({location:item,anchor:menuAnchorFromEvent(event)}):undefined}/>} ListEmptyComponent={reorder?null:<EmptyState title="No hay lugares" description="Creá un lugar para ordenar tus productos." actionLabel={manage?'Nuevo lugar':undefined} onAction={manage?()=>setForm({visible:true,location:null}):undefined}/>}/>
    <AdaptiveActionMenu visible={Boolean(locationMenu)} title={locationMenu?.location?.name??''} anchor={locationMenu?.anchor??null} itemCount={4} width={224} openDurationMs={130} closeDurationMs={100} initialScale={.96} initialTranslateY={-3} popoverRadius={14} transparentBackdrop onRequestClose={()=>setLocationMenu(null)}><AdaptiveMenuRow title="Editar lugar" onPress={()=>{setForm({visible:true,location:locationMenu?.location??null});setLocationMenu(null);}}/><AdaptiveMenuRow title="Reordenar lugares" onPress={()=>{setReorder(true);setLocationMenu(null);}}/><AdaptiveMenuRow title="Mover productos" onPress={()=>{setMoveSource(locationMenu?.location??null);setLocationMenu(null);}}/><AdaptiveMenuSeparator/><AdaptiveMenuRow title="Eliminar lugar" variant="danger" onPress={()=>{setDeleteLocation(locationMenu?.location??null);setDeleteDestination(locationMenu?.location?.managed_product_count?'':'none');setLocationMenu(null);}}/></AdaptiveActionMenu>
    <InventoryLocationFormSheet visible={form.visible} location={form.location} onClose={()=>setForm({visible:false,location:null})} onSaved={()=>{void refresh();showToast({message:form.location?'Lugar actualizado':'Lugar creado'});}}/>
    <BottomSheet visible={Boolean(moveSource)} title={moveSource?`Mover productos de ${moveSource.name}`:'Mover productos'} variant="standard" onRequestClose={()=>setMoveSource(null)}>
      <View style={styles.stack}>
        {locations.filter(l=>l.id!==moveSource?.id).map(l=><ChoiceRow key={l.id} id={l.id} label={l.name} onPress={()=>moveNow(l.id)}/>)}
        <ChoiceRow id="none" label="Sin lugar" onPress={()=>moveNow('none')}/>
      </View>
    </BottomSheet>
    <BottomSheet visible={Boolean(deleteLocation)&&Boolean(deleteLocation?.managed_product_count)} title={deleteLocation?`Eliminar “${deleteLocation.name}”`:'Eliminar lugar'} variant="standard" onRequestClose={()=>setDeleteLocation(null)} footer={<AppButton title="Continuar" variant="danger" disabled={!deleteDestination||!online} onPress={deleteNow}/>}>
      <View style={styles.stack}>
        <AppText tone="secondary">Hay {deleteLocation?.managed_product_count??0} productos en este lugar.</AppText>
        <AppText weight="700">Mover productos a</AppText>
        <ChoiceRow id="none" label="Sin lugar" selected={deleteDestination==='none'} onPress={()=>setDeleteDestination('none')}/>
        {locations.filter(l=>l.id!==deleteLocation?.id).map(l=><ChoiceRow key={l.id} id={l.id} label={l.name} selected={deleteDestination===l.id} onPress={()=>setDeleteDestination(l.id)}/>)}
      </View>
    </BottomSheet>
    {deleteLocation&&!deleteLocation.managed_product_count?<ConfirmActionSheet visible title={`Eliminar ${deleteLocation.name}`} body="Este lugar se eliminará." primaryLabel="Eliminar lugar" variant="destructive" onCancel={()=>setDeleteLocation(null)} onPrimary={deleteNow}/>:null}</AppScreen>;
}
function SectionTitle({title,action,onPress}:{title:string;action:string;onPress:()=>void}){return <View style={styles.sectionTitle}><AppText variant="title3">{title}</AppText><AppButton title={action} variant="ghost" size="sm" onPress={onPress}/></View>}
function AccessRow({icon,title,count,onPress}:{icon?:any;title:string;count:number;onPress:()=>void}){return <Pressable style={styles.accessRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${count} productos`}>{icon?<View style={styles.locationIcon}><HomePlusIcon name={icon} size={20} color={colors.brand}/></View>:null}<AppText style={{flex:1}} weight="700">{title}</AppText><AppText tone="secondary">{count}</AppText><HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary}/></Pressable>}
function ChoiceRow({id,label,selected=false,onPress}:{id:string;label:string;selected?:boolean;onPress:()=>void}){return <Pressable style={styles.choice} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}}><AppText style={{flex:1}}>{label}</AppText>{selected?<HomePlusIcon name="checkmark" size={20} color={colors.brand}/>:<HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary}/>}</Pressable>}
function LocationRow({name,icon,count,onPress,reorder,index,dragActive,onDragStart,onDragMove,onDragEnd,onDelete}:{name:string;icon:any;count:number;onPress:()=>void;reorder?:boolean;index?:number;dragActive?:boolean;onDragStart?:(index:number,pageY:number)=>void;onDragMove?:(pageY:number)=>void;onDragEnd?:()=>void;onDelete?:(event:GestureResponderEvent)=>void}){
  const rowScale=useRef(new Animated.Value(1)).current;
  useEffect(()=>{Animated.timing(rowScale,{toValue:dragActive?1.02:1,duration:120,useNativeDriver:true}).start();},[dragActive,rowScale]);
  const pan=useMemo(()=>reorder?PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dy)>8,
    onMoveShouldSetPanResponderCapture:(_,g)=>Math.abs(g.dy)>8,
    onPanResponderGrant:event=>onDragStart?.(index??0,event.nativeEvent.pageY),
    onPanResponderMove:(_,g)=>onDragMove?.(g.moveY),
    onPanResponderRelease:onDragEnd,onPanResponderTerminate:onDragEnd,
  }).panHandlers:null,[reorder,index,onDragStart,onDragMove,onDragEnd]);
  return <Pressable style={styles.locationRow} onPress={reorder?undefined:onPress}><View style={styles.locationIcon}><HomePlusIcon name={icon} size={22} color={colors.brand}/></View><AppText style={{flex:1}} weight="700">{name}</AppText><AppText tone="secondary">{count}</AppText>{reorder?<Animated.View style={{transform:[{scale:rowScale}],elevation:dragActive?6:0}}><Pressable {...pan} accessibilityRole="button" accessibilityLabel={`Mover ${name}`} style={styles.dragHandle}><HomePlusIcon name={'reorder-three-outline' as any} size={24} color={colors.text.secondary}/></Pressable></Animated.View>:<><HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary}/>{onDelete?<Pressable style={styles.menuTrigger} onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Opciones de ${name}`}><HomePlusIcon name="ellipsis-horizontal" size={22} color={colors.text.secondary}/></Pressable>:null}</>}</Pressable>;
}
const styles=StyleSheet.create({screen:{paddingTop:8},searchWrap:{marginTop:12},legacyTabs:{paddingHorizontal:16,paddingBottom:12},rootSections:{marginTop:8,gap:16},gap4:{gap:4},gap8:{gap:8},gap12:{gap:12},gap16:{gap:16},gap20:{gap:20},header:{height:44,flexDirection:'row',alignItems:'center',gap:8},headerActions:{flexDirection:'row',alignItems:'center'},stack:{gap:12},sectionTitle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},accessRow:{height:56,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:colors.border.subtle},locationIcon:{width:32,height:32,borderRadius:10,backgroundColor:colors.brandSoft,alignItems:'center',justifyContent:'center'},chips:{flexDirection:'row',gap:8,paddingRight:24},chipPeek:{width:8},offline:{padding:10,borderRadius:radius.md,backgroundColor:colors.warning.soft,gap:2},stale:{padding:10,borderRadius:radius.md,backgroundColor:colors.surface.soft,gap:2},listPad:{padding:16,gap:8},emptyList:{flexGrow:1,justifyContent:'center'},choice:{minHeight:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.border.subtle},locationRow:{height:60,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:colors.border.subtle},dragHandle:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},menuTrigger:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},menuDivider:{height:1,backgroundColor:colors.border.subtle,marginVertical:4}});
