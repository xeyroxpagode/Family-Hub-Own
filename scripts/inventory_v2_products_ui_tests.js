'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const migration=read('supabase/migrations/20261019000003_inventory_v2_products_ui_read_contract.sql');
const service=read('front/mi-front-limpio/services/inventoryV2.ts');const presentation=read('front/mi-front-limpio/services/inventoryV2Presentation.ts');
const provider=read('front/mi-front-limpio/context/InventoryV2Context.tsx');const screens=read('front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx');
const editor=read('front/mi-front-limpio/components/inventory/InventoryProductFlowSheet.tsx');const swipe=read('front/mi-front-limpio/components/inventory/InventorySwipeRow.tsx');
const navigator=read('front/mi-front-limpio/navigation/InventoryV2Stack.tsx');const more=read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');

test('read migration owns every Block 2 read authority',()=>{for(const fn of ['inventory_summary','inventory_locations_list','inventory_catalog_discovery','inventory_products_list'])assert.match(migration,new RegExp(`function public\\.${fn}`));for(const field of ['archived_count','trashed_count','unlocated_count','active_product_count','managed_product_count','recents','suggestions','catalog_item_id'])assert.ok(migration.includes(field),field);});
test('products use opaque normalized-name keyset pagination without offset',()=>{const body=migration.slice(migration.indexOf('function public.inventory_products_list'),migration.indexOf('function public.inventory_product_edit'));assert.match(body,/inventory_normalize_text\(i\.name\),i\.id/);assert.match(body,/decode\(p_cursor,'base64'\)/);assert.match(body,/next_cursor/);assert.doesNotMatch(body,/\boffset\b/i);});
test('canonical category compatibility is complete',()=>{for(const value of ['food_drink','kitchen','personal_care','bathroom','health','medication','tools','general'])assert.ok(migration.includes(`'${value}'`));for(const label of ['Alimentos y bebidas','Limpieza','Higiene personal','Salud y botiquín','Bebés','Mascotas','Hogar y descartables','Otros'])assert.ok(presentation.includes(label),label);});
test('editor performs quantity and metadata in one versioned mutation',()=>{const body=migration.slice(migration.indexOf('function public.inventory_product_edit'),migration.indexOf('function public.inventory_products_batch'));assert.match(body,/quantity=v_quantity/);assert.equal((body.match(/version=version\+1/g)||[]).length,1);assert.match(body,/'quantity_set'/);assert.match(body,/'metadata_update'/);assert.equal((body.match(/inventory_reconcile_auto_restock/g)||[]).length,1);assert.doesNotMatch(editor,/setInventoryProductQuantity/);});
test('batch lifecycle and empty trash enforce destructive capability',()=>{for(const operation of ['restore','restore_from_trash','permanent'])assert.ok(migration.includes(`'${operation}'`));assert.match(migration,/p_operation='permanent' then 'inventory\.destroy'/);assert.match(migration,/function public\.inventory_empty_trash/);assert.match(migration,/trashed_at is not null order by id for update/);assert.match(service,/emptyInventoryTrash/);});
test('service remains on requestJson and uses the none sentinel',()=>{assert.doesNotMatch(service,/\bfetch\s*\(/);assert.match(service,/requestJson/);assert.match(service,/location_id\?:string/);assert.match(service,/restore_from_trash/);});
test('preview navigation preserves V1 production route',()=>{for(const route of ['ProductsHome','AllProducts','Locations','LocationDetail','ArchivedProducts','InventoryTrash'])assert.ok(navigator.includes(route));assert.match(more,/<MoreStack\.Screen name="Inventory" component=\{InventarioScreen\}/);assert.match(more,/__DEV__ \? <MoreStack\.Screen name="InventoryV2Preview"/);});
test('provider isolates households, hydrates snapshots and discards stale responses',()=>{for(const token of ['generation.current+=1','controller.abort()','inventory:v2:${scopeKey}:products-snapshot:v1','requestGeneration!==generation.current','AsyncStorage.getItem','AsyncStorage.setItem'])assert.ok(provider.includes(token),token);});
test('provider realtime applies only newer versions and coalesces counts',()=>{assert.match(provider,/current\.version>=action\.product\.version/);assert.match(provider,/setTimeout\(\(\)=>\{/);assert.match(provider,/,75\)/);for(const table of ['inventory_items','inventory_locations'])assert.ok(provider.includes(`table:'${table}'`));});
test('offline surfaces retain reads and disable saves',()=>{assert.match(provider,/NetInfo/);assert.match(editor,/Necesitás conexión para guardar/);assert.match(editor,/disabled=\{!online/);assert.match(screens,/Sin conexión/);assert.match(screens,/Mostrando datos guardados\./);});
test('root and lifecycle surfaces expose declared copy without future shopping controls',()=>{for(const copy of ['Inventario','Buscar productos','Todos los productos','Archivados','Papelera','Todavía no hay productos','No hay productos archivados','La Papelera está vacía'])assert.ok(screens.includes(copy),copy);for(const forbidden of ['Lista de compras','Historial de compras','Próximamente','Coming soon'])assert.doesNotMatch(screens,new RegExp(forbidden));});
test('catalog and editor keep one sheet host and complete editor fields',()=>{for(const state of ['catalog','editor','location_picker','category_picker','create_location','confirm_discard','conflict_review'])assert.ok(editor.includes(`'${state}'`),state);for(const label of ['Nombre','Cantidad','Lugar','Reposición automática','Más opciones','Reponer cuando queden','Llevar stock hasta','Notas'])assert.ok(editor.includes(label),label);assert.equal((editor.match(/<BottomSheet/g)||[]).length,1);assert.equal((editor.match(/<ActionSheet/g)||[]).length,0);});
test('swipe follows finger and honors horizontal ownership thresholds',()=>{for(const token of ['TRIGGER_DISTANCE','INTENT_RATIO','INVENTORY_SWIPE_OPEN_WIDTH','FLICK_VELOCITY'])assert.ok(swipe.includes(token),token);assert.ok(swipe.includes('Math.abs(g.dx)>Math.abs(g.dy)*INTENT_RATIO'));assert.doesNotMatch(swipe,/onMoveShouldSetPanResponderCapture/);});
test('selection selects the WHOLE collection and exposes lifecycle bars',()=>{assert.match(screens,/allProductSelection\(/);assert.match(screens,/listInventoryProducts\(accessToken,\{\.\.\.query,limit:100,cursor\}\)/);assert.match(screens,/InventorySelectionBar/);assert.match(screens,/if\(selectedCount>0\)\{toggle\(item\.id\);\}else\{setEditor\(item\);\}/);assert.match(screens,/inventorySwipeInteractionAt\(\)<400/);assert.match(screens,/disabled=\{!manage\|\|selectedCount>0\}/);});
test('accessibility and permission visibility are explicit',()=>{assert.match(read('front/mi-front-limpio/components/inventory/InventoryProductRow.tsx'),/accessibilityState=\{selection\?\{selected\}:undefined\}/);assert.match(screens,/canInventory\(state\.capabilities,'inventory\.manage'\)/);assert.match(screens,/canInventory\(state\.capabilities,'inventory\.destroy'\)/);assert.match(editor,/canInventory\(state\.capabilities,'inventory\.use'\)/);});

test('block 2 recovery gaps stay closed: fresh undo, location detail menu, server search, clean lifecycles',()=>{
  assert.match(screens,/stateRef\.current\.productsById/,'undo reads live versions instead of stale closure state');
  assert.match(screens,/Editar lugar/,'location detail overflow edits the place');
  assert.match(screens,/Mover productos acá/,'location detail overflow moves products');
  assert.match(screens,/Eliminar lugar/,'location detail overflow deletes the place');
  assert.match(screens,/setServerQuery/,'root search debounces a household server query');
  assert.match(screens,/matchesProductLifecycle\(product,lifecycle\)/,'client keeps lifecycle views free of leaked rows');
  assert.match(screens,/formatInventoryRelativeTime/,'trash rows show relative deleted time');
  assert.match(read('front/mi-front-limpio/services/inventoryV2Presentation.ts'),/hace un momento/,'relative time helper exists');
});
test('motion contract keeps catalog morph and accordion inside one host',()=>{
  assert.match(editor,/rendered\.current/,'surfaces morph without reopening the sheet');
  assert.match(editor,/PREMIUM_MOTION\.localNav/,'catalog to editor morph runs on the shared local navigation token');
  assert.match(editor,/PREMIUM_MOTION\.content/,'more options accordion runs on the shared content token');
  assert.match(editor,/createLocation[\s\S]*?void refresh\(\)/,'created location enters the provider authority');
});
test('conflict review compares only fields changed by both sides',()=>{
  assert.match(editor,/conflictFields/,'conflict computes overlapping changed fields');
  assert.match(editor,/Versión actual/);
  assert.match(editor,/Tu edición/);
});
