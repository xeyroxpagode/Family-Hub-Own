import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Pressable,StyleSheet,View} from 'react-native';
import {HomePlusIcon} from '../../constants/icons';
import {colors,radius,spacing} from '../../constants/theme';
import {useInventoryV2} from '../../context/InventoryV2Context';
import {ApiError} from '../../services/api';
import {canInventory} from '../../services/inventoryCapabilities';
import {
  adjustInventoryProductQuantity,changeInventoryProductLifecycle,createInventoryLocation,createInventoryProduct,discoverInventoryCatalog,getInventoryProduct,
  listInventoryProducts,searchInventoryCatalog,updateInventoryProduct,type InventoryCatalogItem,type InventoryProductV2,type ProductWrite,
} from '../../services/inventoryV2';
import {canonicalInventoryCategory,INVENTORY_CATEGORIES,inventoryCategoryPresentation,inventoryProductIcon,type InventoryCategoryKey} from '../../services/inventoryV2Presentation';
import {BottomSheet,AppButton,AppInput,AppText,EmptyState,SearchField,Skeleton,Toggle} from '../ui';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {MOTION_CURVES,PREMIUM_MOTION,resolveMotionDuration} from '../../constants/motionSystem';
import {hapticIntent} from '../../utils/haptics';
import {
  InventoryLocationForm,
  InventoryLocationIconGrid,
  emptyInventoryLocationDraft,
  isInventoryLocationDraftDirty,
  validateInventoryLocationName,
  type InventoryLocationDraft,
} from './InventoryLocationForm';

/**
 * The Inventory product flow.
 *
 * ONE sheet, ONE backdrop, ONE detent state: the catalog, the editor, the
 * pickers, the location form, the icon picker, the duplicate resolution and
 * the conflict review are INTERNAL PAGES of the same shared `BottomSheet`.
 * There is never a sheet over a sheet.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §14.11.
 */

type Surface='catalog'|'editor'|'location_picker'|'category_picker'|'create_location'|'icon_picker'|'duplicate'|'conflict_review'|'confirm_discard';

type Draft={catalog_item_id:string|null;name:string;quantity:string;location_id:string|null;auto_restock_enabled:boolean;category_key:InventoryCategoryKey;low_stock_threshold:string;target_quantity:string;notes:string};

const identity=()=>{const value=`inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;return{mutationId:value,idempotencyKey:value};};
const fromProduct=(product:InventoryProductV2):Draft=>({catalog_item_id:product.catalog_item_id,name:product.name,quantity:String(product.quantity),location_id:product.location_id,auto_restock_enabled:product.auto_restock_enabled,category_key:canonicalInventoryCategory(product.category_key),low_stock_threshold:String(product.low_stock_threshold),target_quantity:product.target_quantity==null?'':String(product.target_quantity),notes:product.notes??''});
const customDraft=(name='',locationId:string|null=null):Draft=>({catalog_item_id:null,name,quantity:'1',location_id:locationId,auto_restock_enabled:false,category_key:'other',low_stock_threshold:'1',target_quantity:'3',notes:''});

/** The page a back affordance returns to. */
const BACK_SURFACE:Partial<Record<Surface,Surface>>={
  location_picker:'editor',
  category_picker:'editor',
  create_location:'location_picker',
  icon_picker:'create_location',
  duplicate:'editor',
  conflict_review:'editor',
  confirm_discard:'editor',
};

export function InventoryProductFlowSheet({visible,onClose,product=null,initialName='',defaultLocationId=null,readOnly=false}:{visible:boolean;onClose:()=>void;product?:InventoryProductV2|null;initialName?:string;defaultLocationId?:string|null;readOnly?:boolean}){
  const {state,accessToken,patchProduct,refresh,showToast,setSheetOpen}=useInventoryV2();
  const manage=canInventory(state.capabilities,'inventory.manage')&&!readOnly;
  const canUse=canInventory(state.capabilities,'inventory.use');
  const reducedMotion=useReducedMotion();

  const [surface,setSurface]=useState<Surface>(product?'editor':'catalog');
  const [target,setTarget]=useState<InventoryProductV2|null>(product);
  const [draft,setDraft]=useState<Draft>(product?fromProduct(product):customDraft(initialName,defaultLocationId));
  const [base,setBase]=useState<Draft>(draft);
  const [query,setQuery]=useState(initialName);
  const [catalog,setCatalog]=useState<{recents:InventoryCatalogItem[];suggestions:InventoryCatalogItem[]}>({recents:[],suggestions:[]});
  const [results,setResults]=useState<InventoryCatalogItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const [more,setMore]=useState(false);
  const [duplicate,setDuplicate]=useState<InventoryProductV2[]>([]);
  const [latest,setLatest]=useState<InventoryProductV2|null>(null);
  const [locationDraft,setLocationDraft]=useState<InventoryLocationDraft>(emptyInventoryLocationDraft());

  // -- internal navigation ---------------------------------------------------
  const progress=useRef(new Animated.Value(1)).current;
  const direction=useRef(1);
  const rendered=useRef<Surface>(product?'editor':'catalog');
  const [transition,setTransition]=useState<{from:Surface;to:Surface}|null>(null);
  const skipTransition=useRef(false);
  const wasVisible=useRef(false);

  const navigate=useCallback((next:Surface,dir:1|-1=1)=>{direction.current=dir;setSurface(next);},[]);
  const goBack=useCallback(()=>{const back=BACK_SURFACE[surface];if(back)navigate(back,-1);},[navigate,surface]);

  useEffect(()=>{
    if(visible===wasVisible.current)return;
    wasVisible.current=visible;
    if(!visible)return;
    const nextSurface:Surface=product?'editor':'catalog';
    const nextDraft=product?fromProduct(product):customDraft(initialName,defaultLocationId);
    setTarget(product);
    setDraft(nextDraft);setBase(nextDraft);
    setQuery(initialName);setError(null);setDuplicate([]);setLatest(null);setMore(false);
    setLocationDraft(emptyInventoryLocationDraft());
    rendered.current=nextSurface;progress.setValue(1);setTransition(null);
    skipTransition.current=true;
    setSurface(nextSurface);
  },[visible,product,product?.id,initialName,defaultLocationId,progress]);

  useEffect(()=>{
    if(!visible)return;
    if(skipTransition.current){skipTransition.current=false;return;}
    if(surface===rendered.current)return;
    const from=rendered.current;const to=surface;
    rendered.current=to;
    setTransition({from,to});
    progress.setValue(0);
    Animated.timing(progress,{toValue:1,duration:resolveMotionDuration(reducedMotion,PREMIUM_MOTION.localNav),easing:MOTION_CURVES.standardInOut,useNativeDriver:true}).start(({finished})=>{if(finished)setTransition(null);});
  },[surface,visible,reducedMotion,progress]);

  // -- accordion -------------------------------------------------------------
  const moreOpacity=useRef(new Animated.Value(0)).current;
  const moreHeight=useRef(new Animated.Value(0)).current;
  const [moreContentHeight,setMoreContentHeight]=useState(0);
  useEffect(()=>{
    Animated.parallel([
      Animated.timing(moreOpacity,{toValue:more?1:0,duration:resolveMotionDuration(reducedMotion,PREMIUM_MOTION.content),easing:MOTION_CURVES.standardInOut,useNativeDriver:false}),
      Animated.timing(moreHeight,{toValue:more?moreContentHeight:0,duration:resolveMotionDuration(reducedMotion,PREMIUM_MOTION.content),easing:MOTION_CURVES.standardInOut,useNativeDriver:false}),
    ]).start();
  },[more,moreContentHeight,reducedMotion,moreOpacity,moreHeight]);

  // -- quantity micro transition --------------------------------------------
  const quantityPulse=useRef(new Animated.Value(1)).current;
  const lastQuantity=useRef(draft.quantity);
  useEffect(()=>{
    if(lastQuantity.current===draft.quantity)return;
    lastQuantity.current=draft.quantity;
    Animated.sequence([
      Animated.timing(quantityPulse,{toValue:1.08,duration:resolveMotionDuration(reducedMotion,PREMIUM_MOTION.micro),easing:MOTION_CURVES.standardOut,useNativeDriver:true}),
      Animated.timing(quantityPulse,{toValue:1,duration:resolveMotionDuration(reducedMotion,PREMIUM_MOTION.micro),easing:MOTION_CURVES.standardInOut,useNativeDriver:true}),
    ]).start();
  },[draft.quantity,reducedMotion,quantityPulse]);

  const locations=useMemo(()=>Object.values(state.locationsById).sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name)),[state.locationsById]);
  const online=state.networkStatus==='online';
  const dirty=JSON.stringify(draft)!==JSON.stringify(base);
  const locationDirty=isInventoryLocationDraftDirty(locationDraft,emptyInventoryLocationDraft());
  // The sheet is dirty while the editor holds unsaved work, while the location
  // form does, and while the discard confirmation is open: in none of those
  // states can the sheet be dismissed without asking.
  const sheetDirty=(surface==='editor'&&dirty)||(surface==='create_location'&&locationDirty)||surface==='confirm_discard';
  const sameLocationDuplicate=duplicate.find(existing=>existing.location_id===draft.location_id);

  useEffect(()=>{setSheetOpen(visible);return()=>setSheetOpen(false);},[visible,setSheetOpen]);
  useEffect(()=>{if(!visible||surface!=='catalog'||!accessToken||!online)return;setLoading(true);discoverInventoryCatalog(accessToken).then(setCatalog).catch(e=>setError(e instanceof Error?e.message:'No pudimos buscar el catálogo')).finally(()=>setLoading(false));},[visible,surface,accessToken,online]);
  useEffect(()=>{if(surface!=='catalog'||!accessToken||!online)return;const text=query.trim();if(!text){setResults([]);return;}const timer=setTimeout(()=>{setLoading(true);searchInventoryCatalog(accessToken,{q:text,limit:30}).then(r=>setResults(r.items)).catch(e=>setError(e instanceof Error?e.message:'No pudimos buscar el catálogo')).finally(()=>setLoading(false));},120);return()=>clearTimeout(timer);},[query,surface,accessToken,online]);
  useEffect(()=>{if(surface!=='editor'||!draft.catalog_item_id||!accessToken||!online||target)return;listInventoryProducts(accessToken,{catalog_item_id:draft.catalog_item_id,limit:50}).then(r=>setDuplicate(r.items)).catch(()=>setDuplicate([]));},[surface,draft.catalog_item_id,draft.location_id,accessToken,online,target]);

  const requestClose=()=>{if(sheetDirty){navigate('confirm_discard',1);return;}onClose();};

  const chooseCatalog=(item:InventoryCatalogItem)=>{const threshold=item.suggested_restock_threshold!=null&&item.suggested_restock_threshold>=0?item.suggested_restock_threshold:1;const targetQuantity=item.suggested_target_quantity!=null&&item.suggested_target_quantity>threshold?item.suggested_target_quantity:Math.max(threshold+2,3);const next:Draft={catalog_item_id:item.id,name:item.canonical_name,quantity:String(Math.max(item.default_quantity,1)),location_id:defaultLocationId,auto_restock_enabled:false,category_key:canonicalInventoryCategory(item.category_key),low_stock_threshold:String(threshold),target_quantity:String(targetQuantity),notes:''};setDraft(next);setBase(next);setDuplicate([]);navigate('editor',1);};
  const createCustom=()=>{const next=customDraft(query.trim(),defaultLocationId);setDraft(next);setBase(next);setDuplicate([]);navigate('editor',1);};
  const openExisting=(existing:InventoryProductV2)=>{const next=fromProduct(existing);setTarget(existing);setDraft(next);setBase(next);setDuplicate([]);navigate('editor',1);};

  const validation=useMemo(()=>{const quantity=Number(draft.quantity.replace(',','.'));const threshold=Number(draft.low_stock_threshold.replace(',','.'));const target=Number(draft.target_quantity.replace(',','.'));return{name:!draft.name.trim()||draft.name.trim().length>120?'Ingresá un nombre.':null,quantity:!Number.isFinite(quantity)||quantity<0||Math.round(quantity*1000)!==quantity*1000?'Ingresá una cantidad válida.':null,target:draft.auto_restock_enabled&&(!Number.isFinite(target)||target<=threshold)?'El objetivo tiene que ser mayor al nivel de reposición.':null,notes:draft.notes.length>500?'Máximo 500 caracteres.':null};},[draft]);
  const payload=():ProductWrite=>({catalog_item_id:draft.catalog_item_id,location_id:draft.location_id,name:draft.name.trim(),quantity:Number(draft.quantity.replace(',','.')),category_key:draft.category_key,low_stock_threshold:Number(draft.low_stock_threshold.replace(',','.')),target_quantity:draft.auto_restock_enabled?Number(draft.target_quantity.replace(',','.')):null,auto_restock_enabled:draft.auto_restock_enabled,notes:draft.notes.trim()||null});

  const save=async()=>{
    if(!accessToken||!online||Object.values(validation).some(Boolean))return;
    setSaving(true);setError(null);
    try{
      const response=target?await updateInventoryProduct(accessToken,target.id,payload(),{...identity(),expectedVersion:target.version}):await createInventoryProduct(accessToken,payload(),identity());
      patchProduct(response.item);
      if(!target)void refresh();
      showToast({message:target?'Cambios guardados':'Producto agregado',kind:'success'});
      onClose();
    }catch(e){
      if(e instanceof ApiError&&e.code==='version_conflict_v2'&&target){
        try{const fresh=await getInventoryProduct(accessToken,target.id);setLatest(fresh.item);navigate('conflict_review',1);}
        catch{setError('No pudimos cargar la versión actual.');}
      }else setError(e instanceof Error?e.message:'No pudimos guardar el producto.');
    }finally{setSaving(false);}
  };

  const adjustReadOnly=async(delta:number)=>{
    if(!accessToken||!target||!online||!canUse)return;
    const optimistic={...target,quantity:Math.max(0,target.quantity+delta),version:target.version+1};
    patchProduct(optimistic);
    try{const response=await adjustInventoryProductQuantity(accessToken,target.id,delta,identity());patchProduct(response.item);}
    catch{patchProduct(target);showToast({message:'No pudimos actualizar la cantidad.',kind:'error'});}
  };

  const createLocation=async()=>{
    const nameError=validateInventoryLocationName(locationDraft.name);
    if(!accessToken||nameError||!online)return;
    setSaving(true);
    try{
      const response=await createInventoryLocation(accessToken,{name:locationDraft.name.trim(),icon_key:locationDraft.icon},identity());
      setDraft(current=>({...current,location_id:response.location.id}));
      void refresh();
      navigate('editor',-1);
    }catch(e){setError(e instanceof Error?e.message:'No pudimos crear el lugar.');}
    finally{setSaving(false);}
  };

  const changeLifecycle=async(action:'archive'|'trash')=>{
    if(!accessToken||!target||!online)return;
    setSaving(true);
    try{
      const response=await changeInventoryProductLifecycle(accessToken,target.id,action,{...identity(),expectedVersion:target.version});
      patchProduct(response.item);
      showToast({message:action==='archive'?'Producto archivado':'Movido a Papelera',durationMs:5000,onUndo:()=>{const undo=action==='archive'?'restore':'restore-from-trash';void changeInventoryProductLifecycle(accessToken,target.id,undo,{...identity(),expectedVersion:response.item.version}).then(result=>patchProduct(result.item)).catch(()=>showToast({message:'No pudimos deshacer porque el producto cambió.',kind:'error'}));}});
      onClose();
    }catch(e){setError(e instanceof Error?e.message:'No pudimos completar la acción.');}
    finally{setSaving(false);}
  };

  const catalogRows=query.trim()?results:[...catalog.recents,...catalog.suggestions.filter(s=>!catalog.recents.some(r=>r.id===s.id))];

  const conflictFields=useMemo(()=>{if(!latest)return[];const server=fromProduct(latest);const fields:[string,keyof Draft][]=[['Nombre','name'],['Cantidad','quantity'],['Lugar','location_id'],['Reposición automática','auto_restock_enabled'],['Categoría','category_key'],['Reponer cuando queden','low_stock_threshold'],['Llevar stock hasta','target_quantity'],['Notas','notes']];return fields.filter(([,field])=>draft[field]!==base[field]&&server[field]!==base[field]);},[latest,draft,base]);
  const conflictValue=(source:Draft,field:keyof Draft):string=>field==='location_id'?(locations.find(l=>l.id===source.location_id)?.name??'Sin lugar'):field==='auto_restock_enabled'?(source.auto_restock_enabled?'Activada':'Desactivada'):field==='category_key'?inventoryCategoryPresentation(source.category_key).label:String(source[field]??'—');

  const title=surface==='catalog'?'Agregar producto':surface==='location_picker'?'Lugar':surface==='category_picker'?'Categoría':surface==='create_location'?'Nuevo lugar':surface==='icon_picker'?'Elegir icono':surface==='duplicate'?'Producto parecido':surface==='confirm_discard'?'¿Descartar cambios?':surface==='conflict_review'?'Cambios en otro dispositivo':target?(readOnly?target.name:'Editar producto'):'Agregar producto';

  const footer=surface==='editor'&&manage
    ?<AppButton title={saving?'Guardando…':target?'Guardar cambios':'Agregar producto'} onPress={save} loading={saving} disabled={!online||Object.values(validation).some(Boolean)}/>
    :undefined;

  const renderSurface=(current:Surface)=>{
    if(current==='catalog')return <View style={styles.page}>
      <SearchField autoFocus={false} label="Buscar productos" labelVisible={false} placeholder="Buscar productos" value={query} onChangeText={setQuery} inputStyle={{minHeight:44}}/>
      {loading&&catalogRows.length===0?<View style={styles.stack}>{Array.from({length:6}).map((_,index)=><Skeleton key={index} height={60}/>)}</View>:null}
      {!loading&&catalogRows.length===0&&query.trim()?<EmptyState title={`No encontramos “${query.trim()}”`} description="Podés crearlo con el nombre que buscaste." actionLabel={`Crear “${query.trim()}”`} onAction={createCustom}/>:null}
      {catalogRows.length?(
        <View style={styles.stack}>
          {!query.trim()&&catalog.recents.length?<AppText variant="title3">Recientes</AppText>:null}
          {!query.trim()?<AppText variant="title3">Sugerencias</AppText>:null}
          {catalogRows.map(item=><Pressable key={item.id} style={styles.catalogRow} onPress={()=>chooseCatalog(item)} accessibilityRole="button" accessibilityLabel={`Agregar ${item.canonical_name}`}>
            <View style={styles.smallIcon}><HomePlusIcon name={inventoryProductIcon({category_key:item.category_key,catalog_item:item})} size={20} color={colors.brand}/></View>
            <View style={{flex:1}}><AppText weight="700" numberOfLines={1}>{item.canonical_name}</AppText>{item.brand||item.presentation?<AppText variant="caption" tone="secondary" numberOfLines={1}>{[item.brand,item.presentation].filter(Boolean).join(' · ')}</AppText>:null}</View>
            <HomePlusIcon name="add" size={22} color={colors.brand}/>
          </Pressable>)}
        </View>
      ):null}
    </View>;

    if(current==='editor')return <View style={styles.page}>
      {!online?<Banner text="Sin conexión · Mostrando datos guardados."/>:null}
      {duplicate.length?<Pressable style={styles.notice} onPress={()=>navigate('duplicate',1)} accessibilityRole="button" accessibilityLabel="Revisar producto parecido">
        <View style={{flex:1}}><AppText variant="bodySmall" weight="700">Ya existe un producto parecido.</AppText><AppText variant="caption" tone="secondary">{sameLocationDuplicate?`${sameLocationDuplicate.name} · ${sameLocationDuplicate.location?.name??'Sin lugar'}`:`${duplicate.length} productos con el mismo catálogo`}</AppText></View>
        <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary}/>
      </Pressable>:null}
      {error?<Banner text={error} danger/>:null}
      {latest&&surface==='editor'?<Pressable style={styles.notice} onPress={()=>navigate('conflict_review',1)} accessibilityRole="button" accessibilityLabel="Revisar cambios">
        <View style={{flex:1}}><AppText variant="bodySmall" weight="700">Este producto cambió en otro dispositivo.</AppText><AppText variant="caption" tone="secondary">Revisar cambios</AppText></View>
        <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary}/>
      </Pressable>:null}
      <AppInput label="Nombre" value={draft.name} onChangeText={name=>setDraft(v=>({...v,name}))} maxLength={120} editable={manage} errorText={validation.name??undefined}/>
      <View>
        <AppText variant="caption" tone="secondary" weight="700">Cantidad</AppText>
        <View style={styles.stepper}>
          <AppButton variant="icon" title="−" accessibilityLabel="Restar una unidad" onPress={()=>{hapticIntent('light');if(manage){setDraft(v=>({...v,quantity:String(Math.max(0,Number(v.quantity||0)-1))}));}else{void adjustReadOnly(-1);}}} disabled={!online||(!manage&&!canUse)}/>
          <Animated.View style={{transform:[{scale:quantityPulse}]}}>
            <AppInput label="Cantidad" labelVisible={false} value={draft.quantity} onChangeText={quantity=>setDraft(v=>({...v,quantity}))} keyboardType="decimal-pad" editable={manage} inputStyle={styles.quantity} errorText={validation.quantity??undefined}/>
          </Animated.View>
          <AppButton variant="icon" title="+" accessibilityLabel="Sumar una unidad" onPress={()=>{hapticIntent('light');if(manage){setDraft(v=>({...v,quantity:String(Number(v.quantity||0)+1)}));}else{void adjustReadOnly(1);}}} disabled={!online||(!manage&&!canUse)}/>
        </View>
      </View>
      <EditorRow label="Lugar" value={locations.find(l=>l.id===draft.location_id)?.name??'Sin lugar'} onPress={manage?()=>navigate('location_picker',1):undefined}/>
      <View style={styles.toggleRow}>
        <View style={{flex:1}}><AppText weight="700">Reposición automática</AppText>{draft.auto_restock_enabled?<AppText variant="caption" tone="secondary">Se agrega a la lista cuando haga falta.</AppText>:null}</View>
        <Toggle value={draft.auto_restock_enabled} disabled={!manage} accessibilityLabel="Reposición automática" onValueChange={value=>setDraft(v=>({...v,auto_restock_enabled:value,low_stock_threshold:Number(v.low_stock_threshold)>=0?v.low_stock_threshold:'1',target_quantity:Number(v.target_quantity)>Number(v.low_stock_threshold)?v.target_quantity:String(Math.max(Number(v.low_stock_threshold||1)+2,3))}))}/>
      </View>
      <Pressable style={styles.more} onPress={()=>setMore(value=>!value)} accessibilityRole="button" accessibilityLabel="Más opciones" accessibilityState={{expanded:more}}>
        <AppText weight="700">Más opciones</AppText>
        <HomePlusIcon name={more?'chevron-up':'chevron-down'} size={20} color={colors.text.secondary}/>
      </Pressable>
      <Animated.View style={{height:more?moreHeight:0,opacity:moreOpacity,overflow:'hidden'}}>
        <View style={styles.stack} onLayout={event=>setMoreContentHeight(event.nativeEvent.layout.height)}>
          <EditorRow label="Categoría" value={inventoryCategoryPresentation(draft.category_key).label} onPress={manage?()=>navigate('category_picker',1):undefined}/>
          {draft.auto_restock_enabled?<>
            <AppInput label="Reponer cuando queden" value={draft.low_stock_threshold} onChangeText={low_stock_threshold=>setDraft(v=>({...v,low_stock_threshold}))} keyboardType="decimal-pad" editable={manage} helperText="Se considera poco stock desde esta cantidad."/>
            <AppInput label="Llevar stock hasta" value={draft.target_quantity} onChangeText={target_quantity=>setDraft(v=>({...v,target_quantity}))} keyboardType="decimal-pad" editable={manage} errorText={validation.target??undefined}/>
          </>:null}
          <AppInput label="Notas" value={draft.notes} onChangeText={notes=>setDraft(v=>({...v,notes}))} variant="multiline" maxLength={500} editable={manage} errorText={validation.notes??undefined}/>
        </View>
      </Animated.View>
      {!online?<AppText variant="caption" tone="secondary">Necesitás conexión para guardar.</AppText>:null}
      {target&&manage?(
        <View style={styles.management}>
          <AppText variant="caption" tone="secondary" weight="700">Gestión</AppText>
          {!target.archived_at?<ManagementRow label="Archivar producto" onPress={()=>void changeLifecycle('archive')} disabled={!online}/>:null}
          <ManagementRow label="Mover a Papelera" onPress={()=>void changeLifecycle('trash')} disabled={!online}/>
        </View>
      ):null}
    </View>;

    if(current==='location_picker')return <View style={styles.page}>
      <BackRow label="Producto" onPress={goBack}/>
      <View style={styles.stack}>
        {[{id:'none',name:'Sin lugar'} as any,...locations].map(item=>(
          <Pressable key={item.id} style={styles.pickerRow} onPress={()=>{hapticIntent('selection');setDraft(v=>({...v,location_id:item.id==='none'?null:item.id}));navigate('editor',-1);}} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{selected:draft.location_id===(item.id==='none'?null:item.id)}}>
            <HomePlusIcon name={draft.location_id===(item.id==='none'?null:item.id)?'checkmark-circle':'ellipse-outline'} size={22} color={colors.brand}/>
            <AppText style={{flex:1}}>{item.name}</AppText>
          </Pressable>
        ))}
        {manage?<AppButton title="+ Crear lugar" variant="ghost" onPress={()=>{setLocationDraft(emptyInventoryLocationDraft());navigate('create_location',1);}}/>:null}
      </View>
    </View>;

    if(current==='category_picker')return <View style={styles.page}>
      <BackRow label="Producto" onPress={goBack}/>
      <View style={styles.stack}>
        {INVENTORY_CATEGORIES.map(item=>(
          <Pressable key={item.key} style={styles.pickerRow} onPress={()=>{hapticIntent('selection');setDraft(v=>({...v,category_key:item.key}));navigate('editor',-1);}} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:draft.category_key===item.key}}>
            <HomePlusIcon name={item.icon} size={22} color={colors.brand}/>
            <AppText style={{flex:1}}>{item.label}</AppText>
            {draft.category_key===item.key?<HomePlusIcon name="checkmark" size={22} color={colors.brand}/>:null}
          </Pressable>
        ))}
      </View>
    </View>;

    if(current==='create_location')return <View style={styles.page}>
      <BackRow label="Lugar" onPress={goBack}/>
      <InventoryLocationForm draft={locationDraft} onChange={setLocationDraft} onPickIcon={()=>navigate('icon_picker',1)} errorText={locationDraft.name.trim()?validateInventoryLocationName(locationDraft.name)??undefined:undefined} disabled={!online}/>
      <AppButton title="Crear lugar" onPress={createLocation} disabled={!locationDraft.name.trim()||!online||Boolean(validateInventoryLocationName(locationDraft.name))} loading={saving}/>
    </View>;

    if(current==='icon_picker')return <View style={styles.page}>
      <BackRow label="Nuevo lugar" onPress={goBack}/>
      <InventoryLocationIconGrid icon={locationDraft.icon} onSelect={icon=>{hapticIntent('selection');setLocationDraft(current=>({...current,icon}));navigate('create_location',-1);}}/>
    </View>;

    if(current==='duplicate')return <View style={styles.page}>
      <BackRow label="Producto" onPress={goBack}/>
      <AppText weight="700">Ya existe un producto parecido.</AppText>
      <View style={styles.stack}>
        {duplicate.slice(0,3).map(existing=>(
          <Pressable key={existing.id} style={styles.duplicateCard} onPress={()=>openExisting(existing)} accessibilityRole="button" accessibilityLabel={`Ver ${existing.name}`}>
            <AppText weight="700">{existing.name}</AppText>
            <AppText variant="caption" tone="secondary">{existing.location?.name??'Sin lugar'} · {existing.quantity}</AppText>
          </Pressable>
        ))}
      </View>
      <AppButton title="Crear de todos modos" onPress={()=>{setDuplicate([]);navigate('editor',-1);}}/>
      <AppButton title="Ver producto existente" variant="secondary" onPress={()=>openExisting(duplicate[0])}/>
    </View>;

    if(current==='conflict_review')return <View style={styles.page}>
      <BackRow label="Producto" onPress={goBack}/>
      <AppText tone="secondary">Este producto cambió en otro dispositivo. Revisá qué querés conservar.</AppText>
      {conflictFields.length?(
        <View style={styles.stack}>
          <View style={styles.conflictHead}><AppText variant="caption" tone="secondary" style={{flex:1}}>Campo</AppText><AppText variant="caption" tone="secondary" style={{flex:1}}>Versión actual</AppText><AppText variant="caption" tone="secondary" style={{flex:1}}>Tu edición</AppText></View>
          {conflictFields.map(([label,field])=><View key={field} style={styles.conflictRow}><AppText variant="bodySmall" style={{flex:1}}>{label}</AppText><AppText variant="bodySmall" tone="secondary" style={{flex:1}} numberOfLines={1}>{conflictValue(fromProduct(latest!),field)}</AppText><AppText variant="bodySmall" weight="700" style={{flex:1}} numberOfLines={1}>{conflictValue(draft,field)}</AppText></View>)}
        </View>
      ):(
        <View style={styles.stack}>
          <EditorRow label="Versión actual" value={`${latest?.name??''} · ${latest?.quantity??''}`}/>
          <EditorRow label="Tu edición" value={`${draft.name} · ${draft.quantity}`}/>
        </View>
      )}
      <AppButton title="Usar versión actual" onPress={()=>{const next=fromProduct(latest!);setDraft(next);setBase(next);setLatest(null);navigate('editor',-1);}}/>
      <AppButton title="Reaplicar mis cambios" variant="secondary" onPress={()=>{const userDraft=draft;const server=fromProduct(latest!);const changed=Object.fromEntries(Object.entries(userDraft).filter(([key,value])=>value!==base[key as keyof Draft]));const next={...server,...changed};setDraft(next);setBase(server);setLatest(null);navigate('editor',-1);}}/>
    </View>;

    return <View style={styles.page}>
      <AppText weight="700">¿Descartar cambios?</AppText>
      <AppText tone="secondary">Los cambios de este producto no se guardaron.</AppText>
      <AppButton title="Seguir editando" onPress={()=>navigate('editor',-1)}/>
      <AppButton title="Descartar" variant="danger" onPress={onClose}/>
    </View>;
  };

  const incomingStyle={opacity:progress,transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[12*direction.current,0]})}]};
  const outgoingStyle={opacity:progress.interpolate({inputRange:[0,1],outputRange:[1,0]}),transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[0,-12*direction.current]})}]};

  return <BottomSheet
    visible={visible}
    title={title}
    variant="flow"
    onRequestClose={requestClose}
    dirty={sheetDirty}
    onRequestDismissGuard={()=>navigate('confirm_discard',1)}
    committing={saving}
    footer={footer}
  >
    {transition?(
      <View style={styles.transition}>
        <Animated.View style={[StyleSheet.absoluteFill,outgoingStyle]}>{renderSurface(transition.from)}</Animated.View>
        <Animated.View style={incomingStyle}>{renderSurface(transition.to)}</Animated.View>
      </View>
    ):renderSurface(rendered.current)}
  </BottomSheet>;
}

function EditorRow({label,value,onPress}:{label:string;value:string;onPress?:()=>void}){return <Pressable style={styles.editorRow} onPress={onPress} disabled={!onPress} accessibilityRole={onPress?'button':undefined} accessibilityLabel={`${label}: ${value}`}><View style={{flex:1}}><AppText variant="caption" tone="secondary">{label}</AppText><AppText weight="700">{value}</AppText></View>{onPress?<HomePlusIcon name="chevron-forward" size={20} color={colors.text.tertiary}/>:null}</Pressable>;}
function ManagementRow({label,onPress,disabled}:{label:string;onPress:()=>void;disabled?:boolean}){return <Pressable style={styles.managementRow} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}><AppText style={{flex:1}}>{label}</AppText><HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary}/></Pressable>;}
function BackRow({label,onPress}:{label:string;onPress:()=>void}){return <Pressable style={styles.backRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Volver a ${label}`}><HomePlusIcon name="arrow-back" size={20} color={colors.text.secondary}/><AppText variant="caption" tone="secondary" weight="700">{label}</AppText></Pressable>;}
function Banner({text,danger=false}:{text:string;danger?:boolean}){return <View style={[styles.banner,danger&&styles.danger]}><AppText variant="bodySmall" tone={danger?'danger':'secondary'}>{text}</AppText></View>;}

const styles=StyleSheet.create({page:{gap:16,paddingBottom:spacing[2]},transition:{position:'relative'},stack:{gap:12},sectionHead:{gap:20,paddingVertical:12},catalogRow:{minHeight:60,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:colors.border.subtle},smallIcon:{width:36,height:36,borderRadius:12,backgroundColor:colors.brandSoft,alignItems:'center',justifyContent:'center'},stepper:{flexDirection:'row',alignItems:'flex-start',gap:12,marginTop:8},quantity:{width:72,textAlign:'center',minHeight:44},editorRow:{minHeight:56,paddingHorizontal:12,borderWidth:1,borderColor:colors.border.default,borderRadius:radius.md,flexDirection:'row',alignItems:'center'},toggleRow:{minHeight:56,flexDirection:'row',alignItems:'center',gap:12},more:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},pickerRow:{minHeight:56,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:colors.border.subtle},backRow:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8},banner:{padding:12,borderRadius:radius.md,backgroundColor:colors.warning.soft},danger:{backgroundColor:colors.danger.soft},notice:{minHeight:56,paddingHorizontal:12,paddingVertical:8,borderRadius:radius.md,backgroundColor:colors.surface.soft,flexDirection:'row',alignItems:'center',gap:8},duplicateCard:{minHeight:56,paddingHorizontal:12,borderWidth:1,borderColor:colors.border.default,borderRadius:radius.md,justifyContent:'center'},management:{gap:8,paddingTop:8},managementRow:{minHeight:48,paddingHorizontal:4,flexDirection:'row',alignItems:'center',gap:8},conflictHead:{flexDirection:'row',gap:8},conflictRow:{flexDirection:'row',gap:8,alignItems:'flex-start',borderBottomWidth:1,borderBottomColor:colors.border.subtle,paddingVertical:8}});
