import { Ionicons } from '@expo/vector-icons';
import type { HomePlusIconName } from '../constants/icons';
import type { InventoryCatalogItem } from './inventoryV2';

export type InventoryCategoryKey = 'food_drink'|'cleaning'|'personal_care'|'health'|'baby'|'pets'|'household'|'other';

export const INVENTORY_CATEGORIES: ReadonlyArray<{key:InventoryCategoryKey;label:string;icon:HomePlusIconName}> = [
  { key:'food_drink', label:'Alimentos y bebidas', icon:'restaurant-outline' },
  { key:'cleaning', label:'Limpieza', icon:'sparkles-outline' },
  { key:'personal_care', label:'Higiene personal', icon:'person-outline' },
  { key:'health', label:'Salud y botiquín', icon:'medkit-outline' },
  { key:'baby', label:'Bebés', icon:'happy-outline' },
  { key:'pets', label:'Mascotas', icon:'paw-outline' },
  { key:'household', label:'Hogar y descartables', icon:'home-outline' },
  { key:'other', label:'Otros', icon:'cube-outline' },
] as const;

const legacyCategory:Record<string,InventoryCategoryKey>={kitchen:'food_drink',bathroom:'personal_care',medication:'health',tools:'other',general:'other'};
export const canonicalInventoryCategory=(value:string|null|undefined):InventoryCategoryKey=>
  INVENTORY_CATEGORIES.some((entry)=>entry.key===value) ? value as InventoryCategoryKey : legacyCategory[value??'']??'other';
export const inventoryCategoryPresentation=(value:string|null|undefined)=>
  INVENTORY_CATEGORIES.find((entry)=>entry.key===canonicalInventoryCategory(value))!;

const validIcons = new Set(Object.keys(Ionicons.glyphMap));
export const inventoryProductIcon=(item:{category_key:string;catalog_item?:InventoryCatalogItem|null}):HomePlusIconName=>{
  const candidate=item.catalog_item?.icon_key;
  if(candidate&&validIcons.has(candidate)) return candidate as HomePlusIconName;
  return inventoryCategoryPresentation(item.category_key).icon;
};

export const INVENTORY_LOCATION_ICONS:ReadonlyArray<{icon:HomePlusIconName;label:string}>=[
  {icon:'snow-outline',label:'Heladera'},{icon:'snow',label:'Freezer'},{icon:'file-tray-stacked-outline',label:'Alacena'},
  {icon:'restaurant-outline',label:'Cocina'},{icon:'water-outline',label:'Baño'},{icon:'shirt-outline',label:'Lavadero'},
  {icon:'medkit-outline',label:'Botiquín'},{icon:'car-outline',label:'Garage'},{icon:'cube-outline',label:'Despensa'},
  {icon:'archive-outline',label:'Caja'},{icon:'albums-outline',label:'Armario'},{icon:'ellipsis-horizontal-circle-outline',label:'Otro'},
] as const;

export const formatInventoryQuantity=(value:number)=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:3}).format(value);

export const formatInventoryRelativeTime=(iso:string|null|undefined):string=>{
  if(!iso)return'';
  const then=new Date(iso).getTime();
  if(!Number.isFinite(then))return'';
  const minutes=Math.max(0,Math.round((Date.now()-then)/60000));
  if(minutes<1)return'hace un momento';
  if(minutes<60)return`hace ${minutes} min`;
  const hours=Math.round(minutes/60);
  if(hours<24)return`hace ${hours} h`;
  const days=Math.round(hours/24);
  return days===1?'ayer':`hace ${days} días`;
};
