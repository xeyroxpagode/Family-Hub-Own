'use strict';

/**
 * HOMePLUS Assets — S7-03 / S7-04: fachada Assets <-> Planner.
 *
 * Este modulo es la FRONTERA de integracion. Assets es el dueno del read
 * model "Proximo" del activo; Planner es el dueno de la entidad (Task/Event).
 *
 * Reglas congeladas (S6):
 * - Planner owns Task/Event. Assets NO inserta en planner_tasks/planner_events:
 *   delega en los services canonicos (plannerTasksService / plannerEventsService)
 *   que mantienen la capability enforcement, RLS e idempotencia de Planner.
 * - La referencia al Asset viaja como quartet canonico:
 *     origin_module     = 'assets'
 *     origin_entity_type= 'asset'
 *     origin_entity_id  = <asset UUID>
 *     origin_reason     = 'asset_scheduled'
 *   Es una SOFT REFERENCE: no hay FK cross-domain ni tabla puente.
 * - origin_* lo compone el SERVIDOR. Si el cliente lo envia, se rechaza 400.
 * - Idempotencia: NO hay una segunda tabla de idempotencia. La identidad
 *   (X-Mutation-Id + Idempotency-Key) viaja intacta hasta Planner.
 * - Sin recurrence en V1 (S7 explicito): un Event con recurrence != 'none'
 *   se rechaza con 400 assets_planner_recurrence_not_supported.
 * - NO Derived Care: esta fachada no escribe assets_care ni dispara efectos
 *   secundarios sobre Care.
 */

const { createHttpError } = require('../lib/httpErrors');
const { supabaseAdmin } = require('../config/supabase');
const {
  requireMutationId,
  requireIdempotencyKey,
} = require('../lib/mutationContracts');
const {
  resolveAssetsCapabilities,
  assertAssetsCapability,
} = require('../lib/assetsCapabilities');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const { getPlannerContext } = require('./planner.context.service');
const plannerTasksService = require('./planner.tasks.service');
const plannerEventsService = require('./planner.events.service');
const {
  resolveAssetsContext,
  loadContextAsset,
  assertValidAssetId,
} = require('./assets.service');

// ── Constantes del contrato ──────────────────────────────────────────────────

/** Assets es el dueno: los origin_* los compone el servidor, jamas el cliente. */
const PROTECTED_ORIGIN_FIELDS = Object.freeze([
  'origin_module',
  'origin_entity_type',
  'origin_entity_id',
  'origin_reason',
]);

const ORIGIN_MODULE = 'assets';
const ORIGIN_ENTITY_TYPE = 'asset';
const ORIGIN_REASON = 'asset_scheduled';

/**
 * Descripcion inicial congelada (S7 prefill). El composer la siembra igual:
 * este default SOLO entra cuando la clave 'description' NO viene en el body
 * (es decir, el usuario no la toco). Si el usuario la modifico -- incluso
 * borrandola -- el valor enviado se respeta tal cual.
 */
function defaultAssetDescription(assetName) {
  return `Programado para el activo «${assetName}».`;
}

/** Lifecycle del activo que admite nuevas programaciones (S7 lifecycle). */
const PLANNER_ITEM_WRITABLE_LIFECYCLE = Object.freeze(['ACTIVE', 'INACTIVE']);

/** Capacidades Planner exigidas por tipo de item. */
const PLANNER_ITEM_CAPABILITY = Object.freeze({
  task: 'task.create_household',
  event: 'event.create_household',
});

/** Campos propios del composer Planner que la fachada acepta por tipo. */
const TASK_BODY_FIELDS = Object.freeze([
  'kind',
  'title',
  'description',
  'due_date',
  'due_time',
  'priority',
  'category',
  'assigned_to_member_id',
  'requires_verification',
  'estimated_duration_minutes',
  'template_key',
  'checklist',
  'goal_id',
  'plan_classification',
  'visibility',
  'scope',
]);

const EVENT_BODY_FIELDS = Object.freeze([
  'kind',
  'title',
  'description',
  'starts_at',
  'ends_at',
  'all_day',
  'location_name',
  'recurrence',
  'goal_id',
  'plan_classification',
  'visibility',
  'scope',
]);

/** Read model "Proximo": limites del contrato. */
const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_FETCH_ROWS = 500;

/** Estados de Task que siguen siendo "proximos". */
const ACTIVE_TASK_STATUSES = Object.freeze(['pending', 'awaiting_verification']);

// ── Helpers ──────────────────────────────────────────────────────────────────

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

function assertNoOriginInjection(body) {
  const field = PROTECTED_ORIGIN_FIELDS.find((key) => hasOwn(body, key));
  if (field) {
    throw createHttpError(
      400,
      'La referencia al activo la define el servidor y no se puede enviar.',
      'protected_assets_origin_field',
      { field },
    );
  }
}

function assertKnownBodyFields(body, allowed) {
  const unknown = Object.keys(body ?? {}).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw createHttpError(
      400,
      'El cuerpo del pedido tiene campos no admitidos.',
      'validation_error',
      { fields: unknown },
    );
  }
}

function pickBody(body, fields) {
  const payload = {};
  for (const field of fields) {
    if (hasOwn(body, field)) {
      payload[field] = body[field];
    }
  }
  return payload;
}

function resolvePlannerCapabilities(plannerContext) {
  return resolveCapabilities({
    role: plannerContext.membership?.role,
    membershipStatus: plannerContext.membership?.status,
    household: plannerContext.household,
  });
}

function resolveAssetsCapabilitiesFor(context) {
  return resolveAssetsCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
}

function parseLimit(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_LIMIT;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw createHttpError(400, 'limit debe ser un entero.', 'validation_error');
  }
  if (parsed < MIN_LIMIT || parsed > MAX_LIMIT) {
    throw createHttpError(
      400,
      `limit debe estar entre ${MIN_LIMIT} y ${MAX_LIMIT}.`,
      'validation_error',
      { min: MIN_LIMIT, max: MAX_LIMIT },
    );
  }
  return parsed;
}

function assertWritableLifecycle(asset) {
  if (!PLANNER_ITEM_WRITABLE_LIFECYCLE.includes(asset.lifecycle_status)) {
    throw createHttpError(
      409,
      'Este activo no admite nuevas programaciones.',
      'assets_planner_item_not_allowed',
      { lifecycle_status: asset.lifecycle_status },
    );
  }
}

function buildOrigin(assetId) {
  return {
    origin_module: ORIGIN_MODULE,
    origin_entity_type: ORIGIN_ENTITY_TYPE,
    origin_entity_id: assetId,
    origin_reason: ORIGIN_REASON,
  };
}

function startOfUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isoDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function isoTime(value) {
  if (!value) return null;
  const raw = String(value);
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function toMillis(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Instante efectivo congelado (S7 read model):
 * - Task: due_date + due_time (00:00 UTC si no hay due_time).
 * - Task sin due_date: null (va al final del bucket normal).
 * - Event: starts_at.
 */
function taskEffectiveMillis(task) {
  if (!task.due_date) return null;
  const time = task.due_time ? String(task.due_time) : '00:00:00';
  const normalized = time.length === 5 ? `${time}:00` : time;
  return toMillis(`${task.due_date}T${normalized}Z`);
}

function eventEffectiveMillis(event) {
  return toMillis(event.starts_at);
}

/**
 * Overdue congelado: Task con due_date anterior al dia UTC de hoy.
 * Los Events nunca son overdue (los Events pasados quedan fuera del modelo).
 */
function isOverdueTask(task) {
  if (!task.due_date) return false;
  const dueDay = Date.parse(`${task.due_date}T00:00:00Z`);
  if (Number.isNaN(dueDay)) return false;
  return dueDay < startOfUtcDay(new Date());
}

function compareItems(left, right) {
  // 1. Overdue primero.
  if (left.overdue !== right.overdue) {
    return left.overdue ? -1 : 1;
  }

  // 2. Instante efectivo ASC (los sin instante van al final).
  if (left.effectiveAtMillis === null && right.effectiveAtMillis !== null) return 1;
  if (left.effectiveAtMillis !== null && right.effectiveAtMillis === null) return -1;
  if (
    left.effectiveAtMillis !== null
    && right.effectiveAtMillis !== null
    && left.effectiveAtMillis !== right.effectiveAtMillis
  ) {
    return left.effectiveAtMillis - right.effectiveAtMillis;
  }

  // 3. Empate de instante: Task antes que Event.
  if (left.kind !== right.kind) {
    return left.kind === 'task' ? -1 : 1;
  }

  // 4. created_at DESC.
  const leftCreated = toMillis(left.createdAt) ?? 0;
  const rightCreated = toMillis(right.createdAt) ?? 0;
  if (leftCreated !== rightCreated) {
    return rightCreated - leftCreated;
  }

  // 5. id ASC.
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

function mapTaskItem(task) {
  const effectiveAtMillis = taskEffectiveMillis(task);
  return {
    kind: 'task',
    id: task.id,
    title: task.title,
    effective_at: effectiveAtMillis === null ? null : new Date(effectiveAtMillis).toISOString(),
    effective_date: isoDate(task.due_date),
    effective_time: isoTime(task.due_time),
    overdue: isOverdueTask(task),
    status: task.status,
    version: task.version ?? null,
    effectiveAtMillis,
    createdAt: task.created_at ?? null,
  };
}

function mapEventItem(event) {
  const effectiveAtMillis = eventEffectiveMillis(event);
  const effectiveDate = effectiveAtMillis === null
    ? null
    : new Date(effectiveAtMillis).toISOString().slice(0, 10);
  return {
    kind: 'event',
    id: event.id,
    title: event.title,
    effective_at: effectiveAtMillis === null ? null : new Date(effectiveAtMillis).toISOString(),
    effective_date: effectiveDate,
    effective_time: event.all_day ? null : (effectiveDate ? new Date(effectiveAtMillis).toISOString().slice(11, 16) : null),
    overdue: false,
    status: event.status,
    version: event.version ?? null,
    effectiveAtMillis,
    createdAt: event.created_at ?? null,
  };
}

/** Proyeccion publica del item (sin campos internos de orden). */
function toPublicItem(item) {
  const { effectiveAtMillis, createdAt, ...rest } = item;
  return rest;
}

// ── S7-03 — Creacion ─────────────────────────────────────────────────────────

/**
 * Crea una Task o un Event de Planner a partir de un activo.
 *
 * El cliente NUNCA envia origin_*: el servidor compone el quartet canonico.
 * La entidad creada la produce el service CANONICO de Planner.
 */
async function createAssetPlannerItem(req, assetId, body = {}) {
  const id = assertValidAssetId(assetId);
  assertNoOriginInjection(body);

  const kind = body?.kind;
  if (kind !== 'task' && kind !== 'event') {
    throw createHttpError(400, 'kind debe ser "task" o "event".', 'validation_error');
  }

  assertKnownBodyFields(body, kind === 'task' ? TASK_BODY_FIELDS : EVENT_BODY_FIELDS);

  // Los items de un activo siempre son del Household activo: el scope
  // personal no existe en Planner V1 y no se puede pedir desde aqui.
  if (body.visibility === 'personal' || body.scope === 'personal') {
    throw createHttpError(
      400,
      'Los items personales todavía no están disponibles.',
      'personal_planner_items_not_supported',
    );
  }

  if (kind === 'event') {
    const recurrence = body.recurrence;
    if (recurrence !== undefined && recurrence !== null && recurrence !== '' && recurrence !== 'none') {
      throw createHttpError(
        400,
        'La recurrencia todavía no está disponible desde un activo.',
        'assets_planner_recurrence_not_supported',
        { recurrence: String(recurrence) },
      );
    }
  }

  // Household + activo (404 unico para inexistente y cross-Household).
  const assetsContext = await resolveAssetsContext(req);
  const asset = await loadContextAsset(assetsContext, id);

  assertWritableLifecycle(asset);

  // Capability Assets (fail-closed).
  assertAssetsCapability(resolveAssetsCapabilitiesFor(assetsContext), 'assets.contribute');

  // Capability Planner (fail-closed). El service canonico de Planner vuelve a
  // verificarla: la fachada no sustituye la autoridad de Planner.
  const plannerContext = await getPlannerContext(req);
  const plannerCapabilities = resolvePlannerCapabilities(plannerContext);
  assertCapability(plannerCapabilities, PLANNER_ITEM_CAPABILITY[kind]);

  // Identidad del intento: viaja intacta hasta Planner (sin tabla nueva).
  const mutationId = requireMutationId(req);
  const idempotencyKey = requireIdempotencyKey(req);

  const origin = buildOrigin(asset.id);

  if (kind === 'task') {
    const taskPayload = pickBody(body, TASK_BODY_FIELDS);
    delete taskPayload.kind;
    if (!hasOwn(taskPayload, 'description')) {
      taskPayload.description = defaultAssetDescription(asset.name);
    }

    // El quartet origin_* viaja por la via interna canonica (`correlation.origin`),
    // nunca por el body: el service de Planner rechaza `origin_*` en el body.
    const result = await plannerTasksService.createTask(plannerContext, taskPayload, {
      requestId: req.requestId ?? mutationId,
      mutationId,
      idempotencyKey,
      operation: 'assets.planner_item.create.task',
      origin,
    });

    const task = result?.task ?? result;
    return { item: toPublicItem(mapTaskItem(task)) };
  }

  const eventPayload = pickBody(body, EVENT_BODY_FIELDS);
  delete eventPayload.kind;
  if (!hasOwn(eventPayload, 'description')) {
    eventPayload.description = defaultAssetDescription(asset.name);
  }

  const result = await plannerEventsService.createEvent(plannerContext, eventPayload, {
    mutationId,
    idempotencyKey,
    operation: 'assets.planner_item.create.event',
    origin,
  });

  const event = result?.event ?? result;
  return { item: toPublicItem(mapEventItem(event)) };
}

// ── S7-04 — Read model "Proximo" ─────────────────────────────────────────────

/**
 * Read model "Proximo" del activo: Tasks + Events que lo referencian.
 *
 * Dueno: Assets. Requiere assets.view AND planner.view (fail-closed).
 * Sin horizonte temporal: el filtro de Event es "starts_at >= now()" y el de
 * Task es "no completada, no cancelada, no descartada, no archivada".
 */
async function listAssetPlannerItems(req, assetId, query = {}) {
  const id = assertValidAssetId(assetId);

  const assetsContext = await resolveAssetsContext(req);
  assertAssetsCapability(resolveAssetsCapabilitiesFor(assetsContext), 'assets.view');

  const plannerContext = await getPlannerContext(req);
  assertCapability(resolvePlannerCapabilities(plannerContext), 'planner.view');

  // El activo debe existir en el Household activo (404 sin divisibilidad).
  const asset = await loadContextAsset(assetsContext, id);

  const limit = parseLimit(query?.limit);

  const nowIso = new Date().toISOString();

  const taskQuery = supabaseAdmin
    .from('planner_tasks')
    .select(
      'id,title,status,due_date,due_time,created_at,version',
      { count: 'exact' },
    )
    .eq('household_id', assetsContext.householdId)
    .eq('origin_module', ORIGIN_MODULE)
    .eq('origin_entity_type', ORIGIN_ENTITY_TYPE)
    .eq('origin_entity_id', asset.id)
    .is('trashed_at', null)
    .is('archived_at', null)
    .in('status', ACTIVE_TASK_STATUSES)
    .limit(MAX_FETCH_ROWS);

  const eventQuery = supabaseAdmin
    .from('planner_events')
    .select(
      'id,title,status,lifecycle,starts_at,all_day,created_at,version',
      { count: 'exact' },
    )
    .eq('household_id', assetsContext.householdId)
    .eq('origin_module', ORIGIN_MODULE)
    .eq('origin_entity_type', ORIGIN_ENTITY_TYPE)
    .eq('origin_entity_id', asset.id)
    .is('trashed_at', null)
    .eq('status', 'scheduled')
    .eq('lifecycle', 'scheduled')
    .gte('starts_at', nowIso)
    .limit(MAX_FETCH_ROWS);

  const [taskResult, eventResult] = await Promise.all([
    taskQuery,
    eventQuery,
  ]);

  if (taskResult.error) {
    throw createHttpError(500, 'No se pudo consultar la agenda del activo.', 'assets_planner_items_failed');
  }
  if (eventResult.error) {
    throw createHttpError(500, 'No se pudo consultar la agenda del activo.', 'assets_planner_items_failed');
  }

  const taskItems = (taskResult.data ?? []).map(mapTaskItem);
  const eventItems = (eventResult.data ?? []).map(mapEventItem);

  const merged = [...taskItems, ...eventItems].sort(compareItems);

  const total = Math.max(
    merged.length,
    (taskResult.count ?? taskItems.length) + (eventResult.count ?? eventItems.length),
  );

  return {
    items: merged.slice(0, limit).map(toPublicItem),
    total,
    limit,
  };
}

module.exports = {
  PROTECTED_ORIGIN_FIELDS,
  PLANNER_ITEM_WRITABLE_LIFECYCLE,
  createAssetPlannerItem,
  listAssetPlannerItems,
  // Expuestos para tests focalizados (no forman parte de la API HTTP).
  __testOnly: {
    compareItems,
    mapTaskItem,
    mapEventItem,
    parseLimit,
    buildOrigin,
  },
};
