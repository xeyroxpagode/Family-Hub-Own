import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import React,{createContext,useCallback,useContext,useEffect,useMemo,useReducer,useRef,useState} from 'react';
import type { AppToast } from '../components/ui';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { supabase } from '../supabase';
import {
  getInventoryCapabilities,getInventorySummary,listInventoryLocations,listInventoryProducts,
  type InventoryLocation,type InventoryProductV2,type InventorySummary,type ProductListQuery,
} from '../services/inventoryV2';
import type { InventoryCapabilities } from '../services/inventoryCapabilities';

export type InventoryQueryState={ids:string[];nextCursor:string|null;loading:boolean;error:string|null;loadedAt:number|null};
export type InventoryV2State={
  scopeKey:string|null;capabilities:InventoryCapabilities|null;summary:InventorySummary|null;
  locationsById:Record<string,InventoryLocation>;productsById:Record<string,InventoryProductV2>;
  productQueries:Record<string,InventoryQueryState>;networkStatus:'online'|'offline';realtimeStatus:'idle'|'connecting'|'connected'|'error';
  loading:boolean;stale:boolean;error:string|null;mutationBusy:boolean;savedAt:number|null;
};
type Action=
  |{type:'reset';scopeKey:string|null;online:boolean}|{type:'hydrate';scopeKey:string;payload:Snapshot}
  |{type:'authority';scopeKey:string;capabilities:InventoryCapabilities;summary:InventorySummary;locations:InventoryLocation[];products:InventoryProductV2[];queryKey:string;nextCursor:string|null}
  |{type:'network';online:boolean}|{type:'realtime';status:InventoryV2State['realtimeStatus']}
  |{type:'queryLoading';key:string}|{type:'queryResult';key:string;products:InventoryProductV2[];nextCursor:string|null;append:boolean}
  |{type:'queryError';key:string;message:string}|{type:'patchProduct';product:InventoryProductV2}|{type:'realtimeProduct';product:InventoryProductV2}|{type:'removeProduct';id:string}
  |{type:'counts';summary:InventorySummary;locations:InventoryLocation[]}|{type:'error';message:string}|{type:'mutation';busy:boolean};
type Snapshot={summary:InventorySummary|null;locations:InventoryLocation[];products:InventoryProductV2[];productQueries:Record<string,InventoryQueryState>;savedAt:number};

const emptyState=(scopeKey:string|null,online=true):InventoryV2State=>({scopeKey,capabilities:null,summary:null,locationsById:{},productsById:{},productQueries:{},networkStatus:online?'online':'offline',realtimeStatus:'idle',loading:true,stale:false,error:null,mutationBusy:false,savedAt:null});
const byId=<T extends {id:string}>(rows:T[])=>Object.fromEntries(rows.map((row)=>[row.id,row]));
function reducer(state:InventoryV2State,action:Action):InventoryV2State{
  if('scopeKey' in action&&action.scopeKey!==state.scopeKey&&action.type!=='reset')return state;
  switch(action.type){
    case'reset':return emptyState(action.scopeKey,action.online);
    case'hydrate':return {...state,summary:action.payload.summary,locationsById:byId(action.payload.locations),productsById:byId(action.payload.products),productQueries:action.payload.productQueries,savedAt:action.payload.savedAt,stale:true,loading:false};
    case'authority':return {...state,capabilities:action.capabilities,summary:action.summary,locationsById:byId(action.locations),productsById:{...state.productsById,...byId(action.products)},productQueries:{...state.productQueries,[action.queryKey]:{ids:action.products.map(x=>x.id),nextCursor:action.nextCursor,loading:false,error:null,loadedAt:Date.now()}},loading:false,stale:false,error:null};
    case'network':return {...state,networkStatus:action.online?'online':'offline'};
    case'realtime':return {...state,realtimeStatus:action.status};
    case'queryLoading':return {...state,productQueries:{...state.productQueries,[action.key]:{...(state.productQueries[action.key]??{ids:[],nextCursor:null,error:null,loadedAt:null}),loading:true}}};
    case'queryResult':{const old=state.productQueries[action.key];const ids=action.append?[...new Set([...(old?.ids??[]),...action.products.map(x=>x.id)])]:action.products.map(x=>x.id);return {...state,productsById:{...state.productsById,...byId(action.products)},productQueries:{...state.productQueries,[action.key]:{ids,nextCursor:action.nextCursor,loading:false,error:null,loadedAt:Date.now()}}};}
    case'queryError':return {...state,productQueries:{...state.productQueries,[action.key]:{...(state.productQueries[action.key]??{ids:[],nextCursor:null,loadedAt:null}),loading:false,error:action.message}}};
    case'patchProduct':{const current=state.productsById[action.product.id];const incoming=action.product;const location=incoming.location!==undefined?incoming.location:(current&&incoming.location_id!==undefined&&incoming.location_id!==current.location_id?null:current?.location);const catalog_item=incoming.catalog_item!==undefined?incoming.catalog_item:(current&&incoming.catalog_item_id!==undefined&&incoming.catalog_item_id!==current.catalog_item_id?null:current?.catalog_item);const merged=current?{...current,...incoming,location,catalog_item}:incoming;return {...state,productsById:{...state.productsById,[incoming.id]:merged}};}
    case'realtimeProduct':{const current=state.productsById[action.product.id];if(current&&current.version>=action.product.version)return state;const incoming=action.product;const location=incoming.location!==undefined?incoming.location:(current&&incoming.location_id!==undefined&&incoming.location_id!==current.location_id?null:current?.location);const catalog_item=incoming.catalog_item!==undefined?incoming.catalog_item:(current&&incoming.catalog_item_id!==undefined&&incoming.catalog_item_id!==current.catalog_item_id?null:current?.catalog_item);const merged=current?{...current,...incoming,location,catalog_item}:incoming;return {...state,productsById:{...state.productsById,[incoming.id]:merged}};}
    case'removeProduct':{const products={...state.productsById};delete products[action.id];const queries=Object.fromEntries(Object.entries(state.productQueries).map(([k,q])=>[k,{...q,ids:q.ids.filter(id=>id!==action.id)}]));return {...state,productsById:products,productQueries:queries};}
    case'counts':return {...state,summary:action.summary,locationsById:byId(action.locations)};
    case'error':return {...state,loading:false,error:action.message,stale:Object.keys(state.productsById).length>0};
    case'mutation':return {...state,mutationBusy:action.busy};
  }
}
const queryKey=(query:ProductListQuery)=>JSON.stringify(Object.entries(query).filter(([,value])=>value!==undefined&&value!==null&&value!=='').sort(([a],[b])=>a.localeCompare(b)));
type ContextValue={state:InventoryV2State;accessToken:string|null;refresh:()=>Promise<void>;loadProducts:(query?:ProductListQuery,append?:boolean)=>Promise<InventoryQueryState|undefined>;queryProducts:(query?:ProductListQuery)=>InventoryProductV2[];patchProduct:(product:InventoryProductV2)=>void;removeProduct:(id:string)=>void;setMutationBusy:(busy:boolean)=>void;toast:AppToast|null;showToast:(toast:Omit<AppToast,'id'>)=>void;dismissToast:()=>void;sheetOpen:boolean;setSheetOpen:(open:boolean)=>void};
const InventoryContext=createContext<ContextValue|null>(null);

export function InventoryV2Provider({children}:{children:React.ReactNode}){
  const {session,user}=useAuth();const {currentHousehold}=useHousehold();
  const accessToken=session?.access_token??null;const accountId=user?.id??null;const householdId=currentHousehold?.id??null;
  const scopeKey=accountId&&householdId?`${accountId}:${householdId}`:null;
  const [state,dispatch]=useReducer(reducer,emptyState(scopeKey));const stateRef=useRef(state);stateRef.current=state;
  const generation=useRef(0);const controllers=useRef(new Set<AbortController>());const [toast,setToast]=useState<AppToast|null>(null);const [sheetOpen,setSheetOpen]=useState(false);const refreshTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const snapshotKey=scopeKey?`inventory:v2:${scopeKey}:products-snapshot:v1`:null;
  const makeController=()=>{const controller=new AbortController();controllers.current.add(controller);return controller;};
  const finishController=(controller:AbortController)=>controllers.current.delete(controller);
  const showToast=useCallback((next:Omit<AppToast,'id'>)=>setToast({id:`inventory-${Date.now()}-${Math.random()}`,durationMs:2200,...next}),[]);
  const dismissToast=useCallback(()=>setToast(null),[]);

  const loadProducts=useCallback(async(query:ProductListQuery={},append=false)=>{
    if(!accessToken||!scopeKey||stateRef.current.networkStatus==='offline')return undefined;
    const key=queryKey(query);const cursor=append?stateRef.current.productQueries[key]?.nextCursor:null;const controller=makeController();const requestGeneration=generation.current;
    dispatch({type:'queryLoading',key});
    try{const response=await listInventoryProducts(accessToken,{...query,cursor:cursor??undefined},{signal:controller.signal,contextScope:`inventory-v2:${scopeKey}:products`});if(requestGeneration!==generation.current)return undefined;dispatch({type:'queryResult',key,products:response.items,nextCursor:response.next_cursor,append});return stateRef.current.productQueries[key];}
    catch(error){if(!controller.signal.aborted&&requestGeneration===generation.current)dispatch({type:'queryError',key,message:error instanceof Error?error.message:'No pudimos cargar los productos.'});return undefined;}finally{finishController(controller);}
  },[accessToken,scopeKey]);

  const refresh=useCallback(async()=>{
    if(!accessToken||!scopeKey||stateRef.current.networkStatus==='offline')return;
    const controller=makeController();const requestGeneration=generation.current;const options={signal:controller.signal,contextScope:`inventory-v2:${scopeKey}:bootstrap`};
    try{const [capabilities,summary,locations,products]=await Promise.all([getInventoryCapabilities(accessToken,options),getInventorySummary(accessToken,options),listInventoryLocations(accessToken,options),listInventoryProducts(accessToken,{lifecycle:'active',limit:50},options)]);if(requestGeneration!==generation.current)return;dispatch({type:'authority',scopeKey,capabilities:capabilities.capabilities,summary,locations:locations.locations,products:products.items,queryKey:queryKey({lifecycle:'active',limit:50}),nextCursor:products.next_cursor});}
    catch(error){if(!controller.signal.aborted&&requestGeneration===generation.current)dispatch({type:'error',message:error instanceof Error?error.message:'No pudimos cargar Inventario.'});}finally{finishController(controller);}
  },[accessToken,scopeKey]);

  useEffect(()=>{generation.current+=1;controllers.current.forEach(controller=>controller.abort());controllers.current.clear();setSheetOpen(false);setToast(null);let cancelled=false;
    void NetInfo.fetch().then(async net=>{if(cancelled)return;const online=net.isConnected!==false;dispatch({type:'reset',scopeKey,online});if(snapshotKey){const raw=await AsyncStorage.getItem(snapshotKey);if(!cancelled&&raw){try{dispatch({type:'hydrate',scopeKey:scopeKey!,payload:JSON.parse(raw) as Snapshot});}catch{await AsyncStorage.removeItem(snapshotKey);}}}if(!cancelled&&online)void refresh();});
    return()=>{cancelled=true;};
  },[scopeKey,snapshotKey,refresh]);

  useEffect(()=>NetInfo.addEventListener(net=>{const online=net.isConnected!==false;dispatch({type:'network',online});if(online&&stateRef.current.stale)void refresh();}),[refresh]);
  useEffect(()=>{if(!snapshotKey||state.scopeKey!==scopeKey||state.loading)return;const payload:Snapshot={summary:state.summary,locations:Object.values(state.locationsById),products:Object.values(state.productsById),productQueries:state.productQueries,savedAt:Date.now()};void AsyncStorage.setItem(snapshotKey,JSON.stringify(payload));},[snapshotKey,scopeKey,state.loading,state.locationsById,state.productQueries,state.productsById,state.summary,state.scopeKey]);

  useEffect(()=>{if(!householdId||!accessToken||state.networkStatus==='offline')return;dispatch({type:'realtime',status:'connecting'});
    const coalescedCounts=()=>{if(refreshTimer.current)clearTimeout(refreshTimer.current);refreshTimer.current=setTimeout(()=>{void Promise.all([getInventorySummary(accessToken),listInventoryLocations(accessToken)]).then(([summary,locations])=>dispatch({type:'counts',summary,locations:locations.locations})).catch(()=>undefined);},75);};
    const handleProduct=(payload:any)=>{if(payload.eventType==='DELETE'){if(payload.old?.id)dispatch({type:'removeProduct',id:payload.old.id});}else if(payload.new?.id){dispatch({type:'realtimeProduct',product:payload.new as InventoryProductV2});}coalescedCounts();};
    const channel=supabase.channel(`inventory-v2-${householdId}`).on('postgres_changes',{event:'*',schema:'public',table:'inventory_items',filter:`household_id=eq.${householdId}`},handleProduct).on('postgres_changes',{event:'*',schema:'public',table:'inventory_locations',filter:`household_id=eq.${householdId}`},()=>coalescedCounts()).subscribe(status=>dispatch({type:'realtime',status:status==='SUBSCRIBED'?'connected':status==='CHANNEL_ERROR'?'error':'connecting'}));
    return()=>{if(refreshTimer.current)clearTimeout(refreshTimer.current);void supabase.removeChannel(channel);dispatch({type:'realtime',status:'idle'});};
  },[accessToken,householdId,state.networkStatus]);

  const exposedState=state.scopeKey===scopeKey?state:emptyState(scopeKey,state.networkStatus==='online');
  const queryProducts=useCallback((query:ProductListQuery={})=>{const q=stateRef.current.productQueries[queryKey(query)];return(q?.ids??[]).map(id=>stateRef.current.productsById[id]).filter(Boolean);},[]);
  const value=useMemo<ContextValue>(()=>({state:exposedState,accessToken,refresh,loadProducts,queryProducts,patchProduct:product=>dispatch({type:'patchProduct',product}),removeProduct:id=>dispatch({type:'removeProduct',id}),setMutationBusy:busy=>dispatch({type:'mutation',busy}),toast,showToast,dismissToast,sheetOpen,setSheetOpen}),[exposedState,accessToken,refresh,loadProducts,queryProducts,toast,showToast,dismissToast,sheetOpen]);
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
export const useInventoryV2=()=>{const value=useContext(InventoryContext);if(!value)throw new Error('useInventoryV2 debe usarse dentro de InventoryV2Provider.');return value;};
