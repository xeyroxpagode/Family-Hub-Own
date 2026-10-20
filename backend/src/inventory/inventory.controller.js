'use strict';
const { getHouseholdRequestContext } = require('../services/core/householdRequestContext.service');
const { resolveInventoryCapabilities } = require('../lib/inventoryCapabilities');
const { requireMutationContract, OPERATION_KINDS } = require('../lib/mutationContracts');
const catalog = require('./catalog/catalog.service');
const locations = require('./locations/locations.service');
const products = require('./products/products.service');
const summary = require('./summary/summary.service');

function sendError(res,error){const status=error.statusCode??500;if(status>=500)console.error('[inventory-v2]',{message:error.message,code:error.code,details:error.details});return res.status(status).json({error:status<500?error.message:'Error interno.',code:error.code??'internal_error'});}
const handler=(fn,status=200)=>async(req,res)=>{try{const context=await getHouseholdRequestContext(req);const body=await fn(context,req);return res.status(status).json(body??{});}catch(error){return sendError(res,error);}};
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
};
