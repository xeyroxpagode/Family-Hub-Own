const { createHttpError } = require('../lib/httpErrors')
const { getPlannerContext } = require('./planner.context.service')
const plannerTasksService = require('./planner.tasks.service')

const CATEGORY_KEYS = Object.freeze([
  'kitchen',
  'bathroom',
  'cleaning',
  'tools',
  'medication',
  'pets',
  'general',
])

const RESTOCK_APPROVER_ROLES = Object.freeze(['coordinator', 'adult'])

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key)
const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeNullableString = (value) => {
  if (value === undefined) return undefined
  const normalized = normalizeString(value)
  return normalized || null
}

const throwSupabaseError = (error) => {
  const httpError = createHttpError(500, error.message, error.code ?? 'internal_error')
  httpError.details = error.details
  httpError.hint = error.hint
  throw httpError
}

const parseQuantity = (value, fieldName, fallback) => {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback
    throw createHttpError(400, `${fieldName} es obligatorio.`, 'validation_error')
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createHttpError(400, `${fieldName} debe ser un numero mayor o igual a 0.`, 'validation_error')
  }

  return parsed
}

const validateCategory = (value) => {
  const category = normalizeString(value) || 'kitchen'

  if (!CATEGORY_KEYS.includes(category)) {
    throw createHttpError(400, 'category_key invalida.', 'validation_error')
  }

  return category
}

const getInventoryContext = (req) => getPlannerContext(req)

const getTemplate = async (client, templateId) => {
  if (!templateId) return null

  const { data, error } = await client
    .from('inventory_item_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(400, 'template_id invalido.', 'validation_error')
  }

  return data
}

const getItemOrThrow = async (context, itemId) => {
  const { data, error } = await context.client
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Item de inventario no encontrado.', 'inventory_item_not_found')
  }

  return data
}

const logMovement = async (context, item, movementType, quantityBefore, quantityDelta, quantityAfter, metadata = {}) => {
  const { error } = await context.client
    .from('inventory_item_movements')
    .insert({
      household_id: context.householdId,
      inventory_item_id: item.id,
      movement_type: movementType,
      quantity_before: quantityBefore,
      quantity_delta: quantityDelta,
      quantity_after: quantityAfter,
      actor_person_id: context.personId,
      metadata,
    })

  if (error) {
    throwSupabaseError(error)
  }
}

const buildRestockTitle = (item) => `Comprar ${item.name}`

const ensureRestockRequest = async (context, item) => {
  if (item.deleted_at || Number(item.quantity) > Number(item.low_stock_threshold)) {
    return null
  }

  const { data: existing, error: existingError } = await context.client
    .from('inventory_restock_requests')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('inventory_item_id', item.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingError) {
    throwSupabaseError(existingError)
  }

  if (existing) {
    return existing
  }

  const { data, error } = await context.client
    .from('inventory_restock_requests')
    .insert({
      household_id: context.householdId,
      inventory_item_id: item.id,
      suggested_title: buildRestockTitle(item),
      suggested_description: item.quantity <= 0
        ? 'Sin stock detectado desde Inventario.'
        : 'Stock bajo detectado desde Inventario.',
      requested_by_person_id: context.personId,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return null
    }
    throwSupabaseError(error)
  }

  return data
}

const listTemplates = async (context) => {
  const { data, error } = await context.client
    .from('inventory_item_templates')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throwSupabaseError(error)
  }

  return { templates: data ?? [] }
}

const listItems = async (context, query = {}) => {
  let request = context.client
    .from('inventory_items')
    .select('*')
    .eq('household_id', context.householdId)
    .is('deleted_at', null)

  if (query.category_key) {
    request = request.eq('category_key', validateCategory(query.category_key))
  }

  const { data, error } = await request.order('name', { ascending: true })

  if (error) {
    throwSupabaseError(error)
  }

  const search = normalizeString(query.search).toLowerCase()
  const items = search
    ? (data ?? []).filter((item) => item.name.toLowerCase().includes(search))
    : data ?? []

  return { items }
}

const createItem = async (context, body) => {
  const template = await getTemplate(context.client, body?.template_id)
  const name = normalizeString(body?.name) || template?.name || ''

  if (!name) {
    throw createHttpError(400, 'name es obligatorio.', 'validation_error')
  }

  const payload = {
    household_id: context.householdId,
    template_id: template?.id ?? null,
    name,
    emoji: normalizeNullableString(hasOwn(body, 'emoji') ? body.emoji : template?.emoji) ?? null,
    category_key: validateCategory(body?.category_key ?? template?.category_key),
    quantity: parseQuantity(body?.quantity, 'quantity', Number(template?.default_quantity ?? 1)),
    low_stock_threshold: parseQuantity(
      body?.low_stock_threshold,
      'low_stock_threshold',
      Number(template?.default_low_stock_threshold ?? 1),
    ),
    created_by_person_id: context.personId,
    updated_by_person_id: context.personId,
  }

  const { data, error } = await context.client
    .from('inventory_items')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error)
  }

  await logMovement(context, data, 'create', null, data.quantity, data.quantity, { template_id: payload.template_id })
  await ensureRestockRequest(context, data)

  return { item: data }
}

const buildItemPatch = (body) => {
  const patch = {}

  if (hasOwn(body, 'name')) {
    const name = normalizeString(body.name)
    if (!name) {
      throw createHttpError(400, 'name no puede estar vacio.', 'validation_error')
    }
    patch.name = name
  }

  if (hasOwn(body, 'emoji')) {
    patch.emoji = normalizeNullableString(body.emoji)
  }

  if (hasOwn(body, 'category_key')) {
    patch.category_key = validateCategory(body.category_key)
  }

  if (hasOwn(body, 'quantity')) {
    patch.quantity = parseQuantity(body.quantity, 'quantity')
  }

  if (hasOwn(body, 'low_stock_threshold')) {
    patch.low_stock_threshold = parseQuantity(body.low_stock_threshold, 'low_stock_threshold')
  }

  return patch
}

const updateItem = async (context, itemId, body) => {
  const item = await getItemOrThrow(context, itemId)
  const patch = buildItemPatch(body ?? {})

  if (Object.keys(patch).length === 0) {
    return { item }
  }

  patch.updated_by_person_id = context.personId

  const { data, error } = await context.client
    .from('inventory_items')
    .update(patch)
    .eq('id', item.id)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Item de inventario no encontrado.', 'inventory_item_not_found')
  }

  const before = Number(item.quantity)
  const after = Number(data.quantity)
  const quantityChanged = before !== after

  await logMovement(
    context,
    data,
    quantityChanged ? 'set_quantity' : 'edit',
    before,
    quantityChanged ? after - before : null,
    after,
    { fields: Object.keys(patch).filter((key) => key !== 'updated_by_person_id') },
  )
  await ensureRestockRequest(context, data)

  return { item: data }
}

const changeQuantity = async (context, itemId, body, mode) => {
  const item = await getItemOrThrow(context, itemId)
  const amount = parseQuantity(body?.quantity_delta ?? body?.quantity, 'quantity_delta')

  if (amount <= 0) {
    throw createHttpError(400, 'quantity_delta debe ser mayor a 0.', 'validation_error')
  }

  const before = Number(item.quantity)
  const after = mode === 'add' ? before + amount : Math.max(0, before - amount)
  const delta = after - before

  const { data, error } = await context.client
    .from('inventory_items')
    .update({
      quantity: after,
      updated_by_person_id: context.personId,
    })
    .eq('id', item.id)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  await logMovement(context, data, mode, before, delta, after)
  await ensureRestockRequest(context, data)

  return { item: data }
}

const markOutOfStock = async (context, itemId) => {
  const item = await getItemOrThrow(context, itemId)
  const before = Number(item.quantity)

  const { data, error } = await context.client
    .from('inventory_items')
    .update({
      quantity: 0,
      updated_by_person_id: context.personId,
    })
    .eq('id', item.id)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  await logMovement(context, data, 'mark_out_of_stock', before, -before, 0)
  await ensureRestockRequest(context, data)

  return { item: data }
}

const deleteItem = async (context, itemId) => {
  const item = await getItemOrThrow(context, itemId)
  const now = new Date().toISOString()

  const { data, error } = await context.client
    .from('inventory_items')
    .update({
      deleted_at: now,
      updated_by_person_id: context.personId,
    })
    .eq('id', item.id)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  await logMovement(context, data, 'delete', item.quantity, null, item.quantity)

  await context.client
    .from('inventory_restock_requests')
    .update({ status: 'cancelled' })
    .eq('household_id', context.householdId)
    .eq('inventory_item_id', item.id)
    .eq('status', 'pending')

  return { item: data }
}

const getAlerts = async (context) => {
  const [{ items }, { requests }] = await Promise.all([
    listItems(context),
    listRestockRequests(context, { status: 'pending' }),
  ])

  const outOfStockItems = items.filter((item) => Number(item.quantity) <= 0)
  const lowStockItems = items.filter(
    (item) => Number(item.quantity) > 0 && Number(item.quantity) <= Number(item.low_stock_threshold),
  )

  return {
    alerts: {
      total_items: items.length,
      low_stock_count: lowStockItems.length,
      out_of_stock_count: outOfStockItems.length,
      pending_restock_requests_count: requests.length,
      low_stock_items: lowStockItems.slice(0, 5),
      out_of_stock_items: outOfStockItems.slice(0, 5),
      pending_restock_requests: requests.slice(0, 5),
    },
  }
}

const listRestockRequests = async (context, query = {}) => {
  let request = context.client
    .from('inventory_restock_requests')
    .select('*, item:inventory_items(id, name, emoji, quantity, low_stock_threshold, is_out_of_stock, deleted_at)')
    .eq('household_id', context.householdId)

  if (query.status) {
    request = request.eq('status', query.status)
  }

  const { data, error } = await request.order('created_at', { ascending: false })

  if (error) {
    throwSupabaseError(error)
  }

  return { requests: data ?? [] }
}

const getRestockRequestOrThrow = async (context, requestId) => {
  const { data, error } = await context.client
    .from('inventory_restock_requests')
    .select('*, item:inventory_items(id, name, emoji, quantity, low_stock_threshold, deleted_at)')
    .eq('id', requestId)
    .eq('household_id', context.householdId)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Solicitud de reposicion no encontrada.', 'restock_request_not_found')
  }

  return data
}

const assertRestockApprover = (context) => {
  if (!RESTOCK_APPROVER_ROLES.includes(context.role)) {
    throw createHttpError(403, 'No tenes permiso para aprobar reposiciones.', 'not_restock_approver')
  }
}

const approveRestockRequest = async (context, requestId, body = {}) => {
  assertRestockApprover(context)
  const restockRequest = await getRestockRequestOrThrow(context, requestId)

  if (restockRequest.status !== 'pending') {
    throw createHttpError(409, 'La solicitud ya no esta pendiente.', 'restock_request_not_pending')
  }

  const taskPayload = {
    title: normalizeString(body.title) || restockRequest.suggested_title,
    description: normalizeString(body.description) || restockRequest.suggested_description || 'Stock bajo detectado desde Inventario.',
    priority: body.priority || (restockRequest.item?.quantity <= 0 ? 'high' : 'medium'),
    template_key: 'shopping',
    category: 'Compras',
    assigned_to_member_id: body.assigned_to_member_id || undefined,
    requires_verification: Boolean(body.requires_verification),
  }

  const { task } = await plannerTasksService.createTask(context, taskPayload)

  const assignedMember = body.assigned_to_member_id
    ? await context.client
      .from('household_members')
      .select('person_id')
      .eq('id', body.assigned_to_member_id)
      .eq('household_id', context.householdId)
      .maybeSingle()
    : { data: null, error: null }

  if (assignedMember.error) {
    throwSupabaseError(assignedMember.error)
  }

  const { data, error } = await context.client
    .from('inventory_restock_requests')
    .update({
      status: 'approved',
      approved_by_person_id: context.personId,
      assigned_to_person_id: assignedMember.data?.person_id ?? null,
      planner_task_id: task.id,
    })
    .eq('id', restockRequest.id)
    .eq('household_id', context.householdId)
    .select('*, item:inventory_items(id, name, emoji, quantity, low_stock_threshold, deleted_at)')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  return { request: data, task }
}

const rejectRestockRequest = async (context, requestId) => {
  assertRestockApprover(context)
  const restockRequest = await getRestockRequestOrThrow(context, requestId)

  if (restockRequest.status !== 'pending') {
    throw createHttpError(409, 'La solicitud ya no esta pendiente.', 'restock_request_not_pending')
  }

  const { data, error } = await context.client
    .from('inventory_restock_requests')
    .update({
      status: 'rejected',
      approved_by_person_id: context.personId,
    })
    .eq('id', restockRequest.id)
    .eq('household_id', context.householdId)
    .select('*, item:inventory_items(id, name, emoji, quantity, low_stock_threshold, deleted_at)')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  return { request: data }
}

module.exports = {
  approveRestockRequest,
  changeQuantity,
  createItem,
  deleteItem,
  getAlerts,
  getInventoryContext,
  listItems,
  listRestockRequests,
  listTemplates,
  markOutOfStock,
  rejectRestockRequest,
  updateItem,
}
