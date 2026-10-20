'use strict';
const { requireCapability } = require('../shared/inventory.permissions');
const { throwInventoryDatabaseError } = require('../shared/inventory.errors');
const { limit } = require('../shared/inventory.validation');

async function rpc(context,name,args={}){const {data,error}=await context.client.rpc(name,args);if(error)throwInventoryDatabaseError(error);return data;}
const active=c=>{requireCapability(c,'inventory.view');return rpc(c,'inventory_purchase_get',{p_session_id:null});};
const detail=(c,id)=>{requireCapability(c,'inventory.view');return rpc(c,'inventory_purchase_get',{p_session_id:id});};
const start=(c,_b,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_purchase_start',{p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey});};
const setLine=(c,id,lineId,b,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_purchase_line_set',{p_session_id:id,p_line_id:lineId,p_quantity:Number(b.purchased_quantity),p_expected_version:m.expectedVersion});};
const transition=(action)=>(c,id,_b,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_purchase_transition',{p_session_id:id,p_action:action,p_expected_version:m.expectedVersion});};
async function syncFinance(context,id){
  try{const result=await rpc(context,'finance_create_inventory_purchase_expense_v1',{p_purchase_session_id:id});await rpc(context,'inventory_purchase_finance_link',{p_purchase_session_id:id,p_transaction_id:result.transaction_id,p_error_code:null});return {finance_sync_status:'linked',finance_transaction_id:result.transaction_id,finance_outcome:result.outcome};}
  catch(error){try{await rpc(context,'inventory_purchase_finance_link',{p_purchase_session_id:id,p_transaction_id:null,p_error_code:error.code??'finance_sync_failed'});}catch{}return {finance_sync_status:'failed',finance_transaction_id:null,finance_sync_error_code:error.code??'finance_sync_failed'};}
}
async function finalize(c,id,b,m){requireCapability(c,'inventory.use');const result=await rpc(c,'inventory_finalize_purchase',{p_session_id:id,p_expected_version:m.expectedVersion,p_total_amount_minor:b.total_amount_minor??null,p_local_date:b.local_date,p_register_in_finance:Boolean(b.register_in_finance),p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey});if(b.register_in_finance){const finance=await syncFinance(c,id);return {...result,...finance};}return result;}
async function retryFinance(c,id){requireCapability(c,'inventory.use');return syncFinance(c,id);}
const history=(c,q)=>{requireCapability(c,'inventory.view');return rpc(c,'inventory_purchase_history',{p_cursor_completed_at:q.cursor_completed_at??null,p_cursor_id:q.cursor_id??null,p_limit:limit(q.limit,30,30)});};
module.exports={active,detail,start,setLine,pause:transition('pause'),resume:transition('resume'),cancel:transition('cancel'),finalize,retryFinance,history};
