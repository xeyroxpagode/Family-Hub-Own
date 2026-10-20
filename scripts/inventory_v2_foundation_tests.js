'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (value) => fs.readFileSync(path.join(root, value), 'utf8');
const schema = read('supabase/migrations/20261019000001_inventory_v2_foundation.sql');
const rpc = read('supabase/migrations/20261019000002_inventory_v2_atomic_rpc.sql');
const routes = read('backend/src/routes/inventory.js');
const api = read('front/mi-front-limpio/services/api.ts');
const v2Client = read('front/mi-front-limpio/services/inventoryV2.ts');

const { OPERATION_KINDS, OPERATION_POLICIES, requireMutationContract } = require('../backend/src/lib/mutationContracts');
const { INVENTORY_ROLES, resolveInventoryCapabilities } = require('../backend/src/lib/inventoryCapabilities');
const { buildLegacyTemplateCatalog } = require('../data/inventory/catalog/ar/legacyTemplates');

function fakeClient(rows) {
  return { from(table) {
    const filters=[];
    const query={ select(){return query;}, eq(field,value){filters.push([field,value]);return query;}, maybeSingle(){
      const candidates=Array.isArray(rows[table])?rows[table]:rows[table]?[rows[table]]:[];
      return Promise.resolve({data:candidates.find((row)=>filters.every(([field,value])=>row[field]===value))||null,error:null});
    } };
    return query;
  } };
}
const baseRows={
  people:{id:'p1',auth_user_id:'a1',active_household_id:'h1'},
  households:[{id:'h1',config:{}},{id:'h2',config:{}}],
  household_members:[{id:'m1',household_id:'h1',person_id:'p1',status:'active',role:'adult'},{id:'m2',household_id:'h2',person_id:'p1',status:'active',role:'adult'}],
};

test('household context rejects missing authentication', async () => {
  process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321'; process.env.SUPABASE_ANON_KEY ||= 'test-key';
  const { getHouseholdRequestContext }=require('../backend/src/services/core/householdRequestContext.service');
  await assert.rejects(()=>getHouseholdRequestContext({}, {createClient:()=>fakeClient(baseRows)}),(error)=>error.code==='not_authenticated');
});

test('household context rejects missing person and active household', async () => {
  const { getHouseholdRequestContext }=require('../backend/src/services/core/householdRequestContext.service');
  await assert.rejects(()=>getHouseholdRequestContext({user:{id:'a1'},accessToken:'t'},{createClient:()=>fakeClient({...baseRows,people:null})}),(error)=>error.code==='person_not_found');
  await assert.rejects(()=>getHouseholdRequestContext({user:{id:'a1'},accessToken:'t'},{createClient:()=>fakeClient({...baseRows,people:{...baseRows.people,active_household_id:null}})}),(error)=>error.code==='no_active_household');
});

test('household context rejects absent or inactive membership', async () => {
  const { getHouseholdRequestContext }=require('../backend/src/services/core/householdRequestContext.service');
  await assert.rejects(()=>getHouseholdRequestContext({user:{id:'a1'},accessToken:'t'},{createClient:()=>fakeClient({...baseRows,household_members:[]})}),(error)=>error.code==='not_active_household_member');
  await assert.rejects(()=>getHouseholdRequestContext({user:{id:'a1'},accessToken:'t'},{createClient:()=>fakeClient({...baseRows,household_members:[{...baseRows.household_members[0],status:'suspended'}]})}),(error)=>error.code==='not_active_household_member');
});

test('household context returns the active household and isolates other memberships', async () => {
  const { getHouseholdRequestContext }=require('../backend/src/services/core/householdRequestContext.service');
  const context=await getHouseholdRequestContext({user:{id:'a1'},accessToken:'t',body:{householdId:'h2'},query:{householdId:'h2'}},{createClient:()=>fakeClient(baseRows)});
  assert.equal(context.householdId,'h1'); assert.equal(context.membershipId,'m1'); assert.equal(context.role,'adult'); assert.equal(context.accountId,'a1');
});

test('IDEMPOTENT_MUTATION requires mutation and idempotency but no version', () => {
  assert.deepEqual(OPERATION_POLICIES[OPERATION_KINDS.IDEMPOTENT_MUTATION], { mutationId:'required', idempotency:'required', version:'not_applicable' });
  assert.throws(() => requireMutationContract({headers:{}},OPERATION_KINDS.IDEMPOTENT_MUTATION),/X-Mutation-Id/);
  assert.throws(() => requireMutationContract({headers:{'x-mutation-id':'m1'}},OPERATION_KINDS.IDEMPOTENT_MUTATION),/Idempotency-Key/);
  assert.deepEqual(requireMutationContract({headers:{'x-mutation-id':'m1','idempotency-key':'k1'}},OPERATION_KINDS.IDEMPOTENT_MUTATION),{mutationId:'m1',idempotencyKey:'k1',expectedVersion:null});
});

test('existing mutation operation policies remain canonical', () => {
  assert.equal(OPERATION_POLICIES.READ_ONLY.version,'not_applicable');
  assert.equal(OPERATION_POLICIES.CREATE_IDEMPOTENT.idempotency,'required');
  assert.equal(OPERATION_POLICIES.VERSIONED_MUTATION.version,'required');
  assert.equal(OPERATION_POLICIES.NON_VERSIONED_MUTATION.idempotency,'optional');
  assert.equal(OPERATION_POLICIES.AUTH_SESSION_MUTATION.mutationId,'optional');
});

test('all six roles receive the frozen default capability matrix', () => {
  for (const role of INVENTORY_ROLES) {
    const projection=resolveInventoryCapabilities({role,membershipStatus:'active',household:{config:{}}});
    assert.equal(projection['inventory.view'],true); assert.equal(projection['inventory.use'],true);
    assert.equal(projection['inventory.manage'],role!=='guest');
    assert.equal(projection['inventory.destroy'],role==='coordinator'||role==='adult');
  }
});

test('household config boolean override wins and inactive membership loses all grants', () => {
  const override=resolveInventoryCapabilities({role:'guest',membershipStatus:'active',household:{config:{permissions:{'inventory.manage':{guest:true}}}}});
  assert.equal(override['inventory.manage'],true);
  assert.deepEqual(Object.values(resolveInventoryCapabilities({role:'adult',membershipStatus:'suspended',household:{}})),[false,false,false,false]);
});

test('frontend/backend capability projection names stay in parity', () => {
  const backend=require('../backend/src/lib/inventoryCapabilities').INVENTORY_CAPABILITIES;
  for(const name of backend) assert.match(read('front/mi-front-limpio/services/inventoryCapabilities.ts'),new RegExp(name.replace('.','\\.')));
});

test('legacy template adapter normalizes accents, validates and dedupes repeated imports', () => {
  const source=[{id:'1',key:'cafe',name:' Café  Molido ',category_key:'kitchen',default_quantity:1,default_low_stock_threshold:1,is_active:true},{id:'1',key:'cafe',name:'Café Molido',category_key:'kitchen',default_quantity:1,default_low_stock_threshold:1,is_active:true}];
  const first=buildLegacyTemplateCatalog(source); const second=buildLegacyTemplateCatalog([...source,...source]);
  assert.equal(first.length,1); assert.equal(second.length,1); assert.equal(first[0].search_name,'cafe molido');
  assert.equal(first[0].external_source,'legacy_inventory_template'); assert.equal(first[0].external_key,'1');
});

test('catalog schema supplies exact, alias, prefix, accent/case and fuzzy infrastructure with stable pagination', () => {
  for(const token of ['unaccent','gin_trgm_ops','similarity(','search_alias = args.q',"search_name like args.q || '%'",'global_popularity desc','canonical_name,x.id','next_cursor']) assert.ok(schema.includes(token)||rpc.includes(token),token);
  assert.match(rpc,/p_limit integer default 30/);
});

test('schema is additive and preserves every V1 inventory authority', () => {
  for(const table of ['inventory_catalog_items','inventory_catalog_aliases','inventory_catalog_household_stats','inventory_locations','inventory_shopping_lists','inventory_shopping_list_items','inventory_purchase_sessions','inventory_purchase_lines','inventory_idempotency_keys']) assert.match(schema,new RegExp(`create table if not exists public\\.${table}`));
  assert.doesNotMatch(schema,/drop table\s+.*inventory_(items|item_templates|restock_requests)/i);
  for(const route of ["'/items'","'/templates'","'/alerts'","'/restock-requests'"]) assert.ok(routes.includes(route));
});

test('product/location endpoint frontier is registered side-by-side', () => {
  for(const endpoint of ['/capabilities','/summary','/catalog/search','/catalog/discovery','/locations/reorder','/locations/:id/move-products','/products/:id/quantity-adjust','/products/:id/quantity-set','/products/:id/restore-from-trash','/products/:id/permanent','/products/batch']) assert.ok(routes.includes(endpoint),endpoint);
});

test('atomic quantity RPC locks, clamps, increments version, audits and reconciles before replay persistence', () => {
  const body=rpc.slice(rpc.indexOf('function public.inventory_adjust_quantity'),rpc.indexOf('function public.inventory_set_quantity'));
  for(const token of ['for update','greatest(0,v_before+p_delta)','version=version+1','inventory_item_movements','inventory_reconcile_auto_restock','inventory_mutation_complete']) assert.ok(body.toLowerCase().includes(token.toLowerCase()),token);
});

test('versioned set/edit/lifecycle use canonical conflict and batch locks stable order', () => {
  assert.ok((rpc.match(/version_conflict_v2/g)||[]).length>=3);
  assert.match(rpc,/order by i\.id for update of i/);
  assert.match(rpc,/inventory_products_batch/);
});

test('idempotency is part of each transaction and detects replay, conflicts and in-flight state', () => {
  for(const token of ['payload_hash','idempotency_conflict','idempotency_in_flight',"key_state = 'replay'",'inventory_mutation_reserve','inventory_mutation_complete']) assert.ok(schema.includes(token)||rpc.includes(token),token);
  assert.doesNotMatch(routes,/idempotency.*reserve|idempotency.*complete/i);
});

test('location delete locks location/products, moves, audits and deletes in one RPC', () => {
  const body=rpc.slice(rpc.indexOf('function public.inventory_location_delete'),rpc.indexOf('function public.inventory_location_reorder'));
  for(const token of ['for update','order by id for update','location_id=p_destination_location_id','inventory_item_movements','delete from public.inventory_locations']) assert.ok(body.toLowerCase().includes(token.toLowerCase()),token);
});

test('auto-restock exact rules and manual-line preservation are represented', () => {
  const body=rpc.slice(rpc.indexOf('function public.inventory_reconcile_auto_restock'),rpc.indexOf('function public.inventory_catalog_search'));
  for(const token of ['archived_at is not null','trashed_at is not null','not v_item.auto_restock_enabled','auto_restock_suppressed = false','if v_item.auto_restock_suppressed','greatest(0','where public.inventory_shopping_list_items.auto_managed']) assert.ok(body.includes(token),token);
});

test('RLS denies direct catalog/audit/idempotency writes and scopes household reads by capability', () => {
  for(const token of ['revoke insert, update, delete on public.inventory_catalog_items','revoke insert on public.inventory_item_movements','revoke select, insert, update, delete on public.inventory_idempotency_keys','inventory_has_capability(household_id, \'inventory.view\')']) assert.ok(schema.includes(token),token);
  assert.match(schema,/hm\.person_id = public\.current_person_id\(\)/);
});

test('movement FK preserves audit on permanent delete and vocabulary is expanded', () => {
  assert.match(schema,/foreign key \(inventory_item_id\) references public\.inventory_items\(id\) on delete set null/);
  for(const movement of ['quantity_adjust','quantity_set','metadata_update','move_location','archive','restore_from_trash','purchase_add','migration']) assert.ok(schema.includes(`'${movement}'`));
});

test('typed frontend clients use requestJson and canonical operation kinds only', () => {
  assert.doesNotMatch(v2Client,/\bfetch\s*\(/); assert.match(v2Client,/requestJson/);
  assert.match(v2Client,/OPERATION_KINDS\.IDEMPOTENT_MUTATION/); assert.match(v2Client,/OPERATION_KINDS\.VERSIONED_MUTATION/);
  assert.match(api,/IDEMPOTENT_MUTATION/); assert.match(api,/requestHeaders\['Idempotency-Key'\]/);
});

test('shared UI extraction retains compatibility paths and required behavior contracts', () => {
  assert.match(read('front/mi-front-limpio/services/homecloud/adaptiveActionMenuLayout.ts'),/export \* from '\.\.\/core\/adaptiveActionMenuLayout'/);
  assert.match(read('front/mi-front-limpio/components/planner/PlannerMemberPicker.tsx'),/HouseholdMemberPicker/);
  const sheet=read('front/mi-front-limpio/components/ui/ActionSheet.tsx'); assert.match(sheet,/transition\?: 'native' \| 'controlled'/); assert.match(sheet,/keyboardAware && keyboardVisible/); assert.match(sheet,/openDurationMs = 220/); assert.match(sheet,/closeDurationMs = 190/);
  const toast=read('front/mi-front-limpio/components/ui/AppToastHost.tsx'); assert.match(toast,/duration: reducedMotion \? 0 : 150/); assert.match(toast,/duration: reducedMotion \? 0 : 110/); assert.match(toast,/deferred/);
  assert.match(read('front/mi-front-limpio/components/ui/ConfirmActionSheet.tsx'),/destructive/);
});

test('summary is lightweight and does not return the product collection', () => {
  const body=rpc.slice(rpc.indexOf('function public.inventory_summary'),rpc.indexOf('function public.inventory_product_create'));
  for(const key of ['total_active_products','low_stock_count','out_of_stock_count','shopping_list_count','active_purchase','headline']) assert.ok(body.includes(key));
  assert.doesNotMatch(body,/jsonb_agg\(to_jsonb\(i\)/);
});

test('schema includes performance indexes for every paginated/read frontier', () => {
  for(const index of ['inventory_catalog_search_trgm_idx','inventory_catalog_name_prefix_idx','inventory_items_v2_household_lifecycle_idx','inventory_items_v2_household_location_idx','inventory_locations_household_sort_idx','inventory_catalog_stats_household_rank_idx']) assert.ok(schema.includes(index));
});

test('core household context derives authority only from authenticated person active household', () => {
  const source=read('backend/src/services/core/householdRequestContext.service.js');
  assert.match(source,/eq\('auth_user_id', req\.user\.id\)/); assert.match(source,/const householdId = person\.active_household_id/); assert.match(source,/eq\('status', 'active'\)/);
  assert.doesNotMatch(source,/req\.(body|query).*household/i);
});
