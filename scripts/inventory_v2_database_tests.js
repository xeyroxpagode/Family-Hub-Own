'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('../backend/node_modules/pg');

const connectionString = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
const prefix = `inv-v2-${Date.now()}`;
const ids = { household1:randomUUID(), household2:randomUUID(), person1:randomUUID(), person2:randomUUID(), auth1:randomUUID(), auth2:randomUUID() };
let assertions=0;
const openedClients=[];
const check=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);assertions+=1;};

async function clientFor(authId, roleAuthenticated=false) {
  const client=new Client({connectionString}); await client.connect();
  openedClients.push(client);
  await client.query("select set_config('request.jwt.claim.sub',$1,false)",[authId]);
  if(roleAuthenticated) await client.query('set role authenticated');
  return client;
}

async function main(){
  const admin=new Client({connectionString});
  try{await admin.connect();}catch(error){console.log(`SKIPPED (LOCAL_RUNTIME_REQUIRED): ${error.message}`);return;}
  const createdPeople=[];
  const createdAuth=[ids.auth1,ids.auth2];
  try{
    await admin.query('begin');
    await admin.query("insert into auth.users(id,email,aud,role,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values($1,$2,'authenticated','authenticated',now(),'{}','{}'),($3,$4,'authenticated','authenticated',now(),'{}','{}')",[ids.auth1,`${prefix}-1@example.test`,ids.auth2,`${prefix}-2@example.test`]);
    for(const [person,auth,name] of [[ids.person1,ids.auth1,'Inventory Test 1'],[ids.person2,ids.auth2,'Inventory Test 2']]){
      await admin.query("insert into public.people(id,auth_user_id,display_name) values($1,$2,$3)",[person,auth,name]);createdPeople.push(person);
    }
    await admin.query("insert into public.households(id,name,slug,created_by_person_id) values($1,'Inventory H1',$2,$3),($4,'Inventory H2',$5,$6)",[ids.household1,`${prefix}-h1`,ids.person1,ids.household2,`${prefix}-h2`,ids.person2]);
    await admin.query("insert into public.household_members(household_id,person_id,role,status,joined_at) values($1,$2,'adult','active',now()),($3,$4,'adult','active',now())",[ids.household1,ids.person1,ids.household2,ids.person2]);
    await admin.query('update public.people set active_household_id=case id when $1 then $2::uuid else $3::uuid end where id in ($1,$4)',[ids.person1,ids.household1,ids.household2,ids.person2]);
    await admin.query('commit');

    const actor=await clientFor(ids.auth1);
    const catalogExact=(await actor.query("select public.inventory_catalog_search('Leche',10,0,$1) body",[ids.household1])).rows[0].body.items;
    check(catalogExact[0].canonical_name,'Leche','catalog canonical exact ranks first');
    check((await actor.query("select public.inventory_catalog_search('milk',10,0,$1) body",[ids.household1])).rows[0].body.items[0].canonical_name,'Leche','catalog alias exact works');
    check((await actor.query("select public.inventory_catalog_search('jabon',10,0,$1) body",[ids.household1])).rows[0].body.items.some((item)=>item.canonical_name==='Jabón'),true,'catalog search is accent-insensitive');
    check((await actor.query("select public.inventory_catalog_search('LEC',10,0,$1) body",[ids.household1])).rows[0].body.items[0].canonical_name,'Leche','catalog search is case-insensitive and prefix-aware');
    check((await actor.query("select public.inventory_catalog_search('lece',10,0,$1) body",[ids.household1])).rows[0].body.items.some((item)=>item.canonical_name==='Leche'),true,'catalog fuzzy typo search works');
    const catalogId=(await admin.query("select id from public.inventory_catalog_items where canonical_name='Sal' limit 1")).rows[0].id;
    await admin.query('insert into public.inventory_catalog_household_stats(household_id,catalog_item_id,usage_count,last_used_at) values($1,$2,999,now())',[ids.household1,catalogId]);
    const discovery=(await actor.query("select public.inventory_catalog_search('',5,0,$1) body",[ids.household1])).rows[0].body;
    check(discovery.items[0].id,catalogId,'household stats influence discovery ranking');
    const discovery2=(await actor.query("select public.inventory_catalog_search('',5,5,$1) body",[ids.household1])).rows[0].body;
    check(discovery.items.some((a)=>discovery2.items.some((b)=>a.id===b.id)),false,'catalog pagination is stable without overlap');
    check(Number((await admin.query("select count(*) from public.inventory_catalog_items where external_source='legacy_inventory_template'")).rows[0].count),Number((await admin.query('select count(*) from public.inventory_item_templates')).rows[0].count),'catalog seed has one stable row per legacy template');
    const created=await actor.query("select public.inventory_product_create($1::jsonb,$2,$3) body",[JSON.stringify({name:'Leche concurrente',quantity:5,low_stock_threshold:1,category_key:'kitchen'}),'create-1','create-key-1']);
    const itemId=created.rows[0].body.item.id;
    check(Number(created.rows[0].body.item.quantity),5,'create quantity');
    const legacyActor=await clientFor(ids.auth1,true);
    await legacyActor.query("select public.inventory_legacy_log_movement($1,'edit',5,null,5,$2::jsonb)",[itemId,JSON.stringify({compatibility_test:true})]);
    check(Number((await admin.query("select count(*) from public.inventory_item_movements where inventory_item_id=$1 and source='legacy_v1'",[itemId])).rows[0].count),1,'V1 movement compatibility RPC remains operational');
    await legacyActor.query('reset role');await legacyActor.end();

    const concurrent=await Promise.all(Array.from({length:5},async(_,index)=>{const c=await clientFor(ids.auth1);try{return await c.query('select public.inventory_adjust_quantity($1,1,$2,$3) body',[itemId,`plus-${index}`,`plus-key-${index}`]);}finally{await c.end();}}));
    check(concurrent.length,5,'five concurrent calls complete');
    let state=(await admin.query('select quantity,version from public.inventory_items where id=$1',[itemId])).rows[0];
    check(Number(state.quantity),10,'five +1 operations never lose updates');

    const replay1=await actor.query('select public.inventory_adjust_quantity($1,1,$2,$3) body',[itemId,'replay-mut','replay-key']);
    const replay2=await actor.query('select public.inventory_adjust_quantity($1,1,$2,$3) body',[itemId,'replay-mut','replay-key']);
    check(replay2.rows[0].body,replay1.rows[0].body,'same mutation replays identical response');
    state=(await admin.query('select quantity,version from public.inventory_items where id=$1',[itemId])).rows[0];
    check(Number(state.quantity),11,'replay does not duplicate mutation');
    await assert.rejects(()=>actor.query('select public.inventory_adjust_quantity($1,2,$2,$3)',[itemId,'replay-mut','replay-key']),/idempotency_conflict/);assertions+=1;
    const inflightPayload=JSON.stringify({id:itemId,delta:3});
    await admin.query("insert into public.inventory_idempotency_keys(household_id,actor_person_id,operation,mutation_id,idempotency_key,payload_hash,key_state) values($1,$2,'product.quantity_adjust','inflight-mut','inflight-key',encode(extensions.digest(convert_to($3::jsonb::text,'UTF8'),'sha256'),'hex'),'reserved')",[ids.household1,ids.person1,inflightPayload]);
    await assert.rejects(()=>actor.query('select public.inventory_adjust_quantity($1,3,$2,$3)',[itemId,'inflight-mut','inflight-key']),/idempotency_in_flight/);assertions+=1;

    const expected=Number(state.version);
    await actor.query('select public.inventory_set_quantity($1,20,$2,$3,$4)',[itemId,expected,'set-ok','set-ok-key']);
    await assert.rejects(()=>actor.query('select public.inventory_set_quantity($1,30,$2,$3,$4)',[itemId,expected,'set-stale','set-stale-key']),/version_conflict_v2/);assertions+=1;
    check(Number((await admin.query('select quantity from public.inventory_items where id=$1',[itemId])).rows[0].quantity),20,'stale set cannot overwrite');
    check(Number((await admin.query("select count(*) from public.inventory_idempotency_keys where mutation_id='set-stale'")).rows[0].count),0,'failed mutation reservation rolls back');

    const actor2=await clientFor(ids.auth2);
    await assert.rejects(()=>actor2.query('select public.inventory_adjust_quantity($1,1,$2,$3)',[itemId,'cross-mut','cross-key']),/inventory_item_not_found/);assertions+=1;
    const rls=await clientFor(ids.auth2,true);
    check(Number((await rls.query('select count(*) from public.inventory_items where id=$1',[itemId])).rows[0].count),0,'RLS hides cross-household item');
    await rls.query('reset role'); await rls.end();

    let location=(await actor.query("select public.inventory_location_create('Heladera','snow','loc-create','loc-create-key') body")).rows[0].body.location;
    await assert.rejects(()=>actor.query("select public.inventory_location_create(' heladera ',null,'loc-dup','loc-dup-key')"),/duplicate key/);assertions+=1;
    location=(await actor.query("select public.inventory_location_edit($1,'Heladera principal',null,false,'loc-edit','loc-edit-key') body",[location.id])).rows[0].body.location;
    check(location.icon_key,'snow','location patch preserves omitted icon');
    await admin.query('update public.inventory_items set location_id=$1 where id=$2',[location.id,itemId]);
    await assert.rejects(()=>actor.query('select public.inventory_location_delete($1,$2,$3,$4)',[location.id,randomUUID(),'loc-delete-bad','loc-delete-bad-key']),/invalid_destination_location/);assertions+=1;
    check(Number((await admin.query('select count(*) from public.inventory_locations where id=$1',[location.id])).rows[0].count),1,'failed location delete rolls back location');
    check((await admin.query('select location_id from public.inventory_items where id=$1',[itemId])).rows[0].location_id,location.id,'failed location delete rolls back product move');
    const deleted=(await actor.query('select public.inventory_location_delete($1,null,$2,$3) body',[location.id,'loc-delete','loc-delete-key'])).rows[0].body;
    check(deleted.moved_products,1,'location delete reports moved product');
    check((await admin.query('select location_id from public.inventory_items where id=$1',[itemId])).rows[0].location_id,null,'location delete moves product to no location');
    check(Number((await admin.query('select count(*) from public.inventory_locations where id=$1',[location.id])).rows[0].count),0,'location deletion commits atomically');

    const item2=(await actor.query("select public.inventory_product_create($1::jsonb,$2,$3) body",[JSON.stringify({name:'Arroz batch',quantity:2,low_stock_threshold:1,category_key:'kitchen'}),'create-2','create-key-2'])).rows[0].body.item;
    const listed=(await actor.query("select public.inventory_products_list(null,null,false,'all',null,'active',1,null) body")).rows[0].body;
    check(listed.items.length,1,'product list enforces requested page size');check(Boolean(listed.next_cursor),true,'product list emits stable cursor');
    const beforeBatch=(await admin.query('select id,category_key,version from public.inventory_items where id=any($1::uuid[]) order by id',[[itemId,item2.id]])).rows;
    const batchItems=beforeBatch.map((row,index)=>({id:row.id,expected_version:Number(row.version)+(index===1?1:0)}));
    await assert.rejects(()=>actor.query('select public.inventory_products_batch($1::jsonb,$2,$3::jsonb,$4,$5)',[JSON.stringify(batchItems),'set_category',JSON.stringify({category_key:'general'}),'batch-stale','batch-stale-key']),/version_conflict_v2/);assertions+=1;
    const afterBatch=(await admin.query('select id,category_key,version from public.inventory_items where id=any($1::uuid[]) order by id',[[itemId,item2.id]])).rows;
    check(afterBatch,beforeBatch,'one stale entity rolls back full batch');
    check(Number((await admin.query("select count(*) from public.inventory_item_movements where correlation_id='batch-stale'")).rows[0].count),0,'batch rollback removes audit too');
    const goodBatch=afterBatch.map((row)=>({id:row.id,expected_version:Number(row.version)}));
    const batchResult=(await actor.query('select public.inventory_products_batch($1::jsonb,$2,$3::jsonb,$4,$5) body',[JSON.stringify(goodBatch),'set_category',JSON.stringify({category_key:'general'}),'batch-ok','batch-ok-key'])).rows[0].body;
    check(batchResult.items.every((item)=>item.category_key==='general'),true,'batch success updates all rows atomically');

    let lifecycleItem=(await admin.query('select * from public.inventory_items where id=$1',[item2.id])).rows[0];
    await assert.rejects(()=>actor.query("select public.inventory_product_lifecycle($1,'permanent',$2,'perm-bad','perm-bad-key')",[item2.id,lifecycleItem.version]),/permanent_delete_requires_trash/);assertions+=1;
    for(const [action,mutation] of [['archive','life-a'],['restore','life-r'],['trash','life-t'],['restore_from_trash','life-rt'],['trash','life-t2']]){
      lifecycleItem=(await actor.query('select public.inventory_product_lifecycle($1,$2,$3,$4,$5) body',[item2.id,action,lifecycleItem.version,mutation,`${mutation}-key`])).rows[0].body.item;
    }
    await actor.query("select public.inventory_product_lifecycle($1,'permanent',$2,'perm-ok','perm-ok-key')",[item2.id,lifecycleItem.version]);
    check(Number((await admin.query('select count(*) from public.inventory_items where id=$1',[item2.id])).rows[0].count),0,'permanent delete only succeeds from trash');
    const preservedAudit=(await admin.query("select inventory_item_id,item_name_snapshot from public.inventory_item_movements where correlation_id='perm-ok'")).rows[0];
    check(preservedAudit.inventory_item_id,null,'permanent delete preserves movement with null item FK');check(preservedAudit.item_name_snapshot,'Arroz batch','permanent delete preserves name snapshot');

    await assert.rejects(()=>actor.query("select public.inventory_product_create($1::jsonb,'bad-target','bad-target-key')",[JSON.stringify({name:'Target inválido',quantity:0,low_stock_threshold:2,target_quantity:2,auto_restock_enabled:true})]),/invalid_target/);assertions+=1;
    const autoItem=(await actor.query("select public.inventory_product_create($1::jsonb,'auto-create','auto-create-key') body",[JSON.stringify({name:'Auto restock',quantity:0,low_stock_threshold:1,target_quantity:4,auto_restock_enabled:true})])).rows[0].body.item;
    check(Number((await admin.query('select requested_quantity from public.inventory_shopping_list_items where inventory_item_id=$1',[autoItem.id])).rows[0].requested_quantity),4,'auto-restock creates needed quantity');
    await actor.query("select public.inventory_adjust_quantity($1,5,'auto-fill','auto-fill-key')",[autoItem.id]);
    check(Number((await admin.query('select count(*) from public.inventory_shopping_list_items where inventory_item_id=$1',[autoItem.id])).rows[0].count),0,'auto-restock line is removed above threshold');

    const auditRls=await clientFor(ids.auth1,true);
    await assert.rejects(()=>auditRls.query("insert into public.inventory_item_movements(household_id,movement_type) values($1,'create')",[ids.household1]),/permission denied/);assertions+=1;
    await assert.rejects(()=>auditRls.query("insert into public.inventory_catalog_items(canonical_name,category_key,search_name) values('X','general','x')"),/permission denied/);assertions+=1;
    await assert.rejects(()=>auditRls.query('select * from public.inventory_idempotency_keys limit 1'),/permission denied/);assertions+=1;
    await auditRls.query('reset role'); await auditRls.end();

    const roleExpected={coordinator:[true,true,true,true],adult:[true,true,true,true],adolescent:[true,true,true,false],child:[true,true,true,false],senior:[true,true,true,false],guest:[true,true,false,false]};
    for(const [role,expectedCaps] of Object.entries(roleExpected)){
      const person=randomUUID(),auth=randomUUID();createdPeople.push(person);
      createdAuth.push(auth);
      await admin.query("insert into auth.users(id,email,aud,role,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values($1,$2,'authenticated','authenticated',now(),'{}','{}')",[auth,`${prefix}-${role}@example.test`]);
      await admin.query('insert into public.people(id,auth_user_id,display_name) values($1,$2,$3)',[person,auth,`Role ${role}`]);
      await admin.query('insert into public.household_members(household_id,person_id,role,status,joined_at) values($1,$2,$3,\'active\',now())',[ids.household1,person,role]);
      await admin.query('update public.people set active_household_id=$1 where id=$2',[ids.household1,person]);
      const c=await clientFor(auth);const caps=[];for(const capability of ['inventory.view','inventory.use','inventory.manage','inventory.destroy']) caps.push((await c.query('select public.inventory_has_capability($1,$2) value',[ids.household1,capability])).rows[0].value);await c.end();check(caps,expectedCaps,`${role} capability matrix`);
    }
    await actor.end();await actor2.end();
    console.log(`INVENTORY_V2_DATABASE: PASS (${assertions} assertions; real RPC/RLS/concurrency)`);
  } finally {
    await Promise.allSettled(openedClients.map((client)=>client.end()));
    try{await admin.query('rollback');}catch{}
    try{await admin.query('reset role');await admin.query('update public.people set active_household_id=null where id=any($1::uuid[])',[createdPeople]);await admin.query('delete from public.households where id=any($1::uuid[])',[[ids.household1,ids.household2]]);await admin.query('delete from public.people where id=any($1::uuid[])',[createdPeople]);await admin.query('delete from auth.users where id=any($1::uuid[])',[createdAuth]);}catch(error){console.error('Fixture cleanup failed:',error.message);process.exitCode=1;}await admin.end();
  }
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
