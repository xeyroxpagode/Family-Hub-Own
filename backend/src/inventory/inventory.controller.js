'use strict';
const { getHouseholdRequestContext } = require('../services/core/householdRequestContext.service');
const { resolveInventoryCapabilities } = require('../lib/inventoryCapabilities');
const { requireMutationContract, OPERATION_KINDS } = require('../lib/mutationContracts');
const catalog = require('./catalog/catalog.service');
const locations = require('./locations/locations.service');
const products = require('./products/products.service');
const summary = require('./summary/summary.service');
const shopping = require('./shopping/shopping.service');
const purchases = require('./purchases/purchases.service');
const integrations = require('./integrations');

function sendError(res,error){const status=error.statusCode??500;if(status>=500)console.error('[inventory-v2]',{message:error.message,code:error.code,details:error.details});return res.status(status).json({error:status<500?error.message:'Error interno.',code:error.code??'internal_error'});}
const handler=(fn,status=200)=>async(req,res)=>{try{const context=await getHouseholdRequestContext(req);const body=await fn(context,req);return res.status(status).json(body===undefined?{}:body);}catch(error){return sendError(res,error);}};
const contract=(req,kind)=>requireMutationContract(req,kind);

module.exports={
  capabilities:handler(async(c)=>({capabilities:resolveInventoryCapabilities({role:c.role,membershipStatus:c.membershipStatus,household:c.household}),membershipId:c.membershipId,householdId:c.householdId,role:c.role})),
  summary:handler((c)=>summary.get(c)),
  catalogSearch:handler((c,r)=>catalog.search(c,r.query)), catalogDiscovery:handler((c,r)=>catalog.discovery(c,r.query)),
  locationsList:handler((c)=>locations.list(c)),
  locationsCreate:handler((c,r)=>locations.create(c,r.body??{},contract(r,OPERATION_KINDS.CREATE_IDEMPOTENT)),201),
  locationsEdit:handler((c,r)=>locations.edit(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  locationsDelete:handler((c,r)=>locations.remove(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  locationsReorder:handler((c,r)=>locations.reorder(c,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  locationsMoveProducts:handler((c,r)=>locations.moveProducts(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  productsList:handler((c,r)=>products.list(c,r.query)), productsGet:handler((c,r)=>products.get(c,r.params.id)),
  productsCreate:handler((c,r)=>products.create(c,r.body??{},contract(r,OPERATION_KINDS.CREATE_IDEMPOTENT)),201),
  productsEdit:handler((c,r)=>products.edit(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  productsAdjust:handler((c,r)=>products.adjust(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  productsSet:handler((c,r)=>products.setQuantity(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  productsArchive:handler((c,r)=>products.lifecycle(c,r.params.id,'archive',contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  productsRestore:handler((c,r)=>products.lifecycle(c,r.params.id,'restore',contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  productsTrash:handler((c,r)=>products.lifecycle(c,r.params.id,'trash',contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  productsRestoreTrash:handler((c,r)=>products.lifecycle(c,r.params.id,'restore_from_trash',contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  productsPermanent:handler((c,r)=>products.lifecycle(c,r.params.id,'permanent',contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  productsBatch:handler((c,r)=>products.batch(c,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  productsEmptyTrash:handler((c,r)=>products.emptyTrash(c,contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  integrations:handler((c)=>integrations.status(c)),
  shoppingGet:handler((c)=>shopping.get(c)), shoppingDiscovery:handler((c,r)=>shopping.discovery(c,r.query)),
  shoppingAssign:handler((c,r)=>shopping.assign(c,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  shoppingAdd:handler((c,r)=>shopping.add(c,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  shoppingEdit:handler((c,r)=>shopping.edit(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  shoppingRemove:handler((c,r)=>shopping.remove(c,r.params.id,contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  shoppingRestore:handler((c,r)=>shopping.restore(c,r.params.id,contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  shoppingBatch:handler((c,r)=>shopping.batch(c,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  shoppingClear:handler((c,r)=>shopping.clear(c,contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
  shoppingPlannerTask:handler((c,r)=>shopping.plannerTask(c,r.body??{},contract(r,OPERATION_KINDS.CREATE_IDEMPOTENT))),
  purchasesActive:handler((c)=>purchases.active(c)), purchasesHistory:handler((c,r)=>purchases.history(c,r.query)), purchasesDetail:handler((c,r)=>purchases.detail(c,r.params.id)),
  purchasesStart:handler((c,r)=>purchases.start(c,r.body??{},contract(r,OPERATION_KINDS.CREATE_IDEMPOTENT)),201),
  purchaseLineSet:handler((c,r)=>purchases.setLine(c,r.params.id,r.params.lineId,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  purchasePause:handler((c,r)=>purchases.pause(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  purchaseResume:handler((c,r)=>purchases.resume(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  purchaseCancel:handler((c,r)=>purchases.cancel(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  purchaseFinalize:handler((c,r)=>purchases.finalize(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.VERSIONED_MUTATION))),
  purchaseFinanceRetry:handler((c,r)=>purchases.retryFinance(c,r.params.id,r.body??{},contract(r,OPERATION_KINDS.IDEMPOTENT_MUTATION))),
};
