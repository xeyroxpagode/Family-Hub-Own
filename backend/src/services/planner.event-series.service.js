'use strict'

const { createHttpError } = require('../lib/httpErrors')
const CREATE_FIELDS = new Set(['title', 'description', 'scheduleType', 'recurrenceRule', 'startsOn', 'endsOn', 'timeZone', 'eventDefaults'])
const UPDATE_FIELDS = new Set(['title', 'description', 'recurrenceRule', 'startsOn', 'endsOn', 'timeZone', 'eventDefaults', 'expected_version'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const fail = (message, code = 'validation_error') => { throw createHttpError(400, message, code) }
const date = (value, field) => { if (!DATE_RE.test(String(value ?? ''))) fail(`${field} no es una fecha válida.`); return value }
// Materialization is an explicit, bounded write. The client already refuses
// anything wider (`PlannerSeriesScreen` allows 1..180 days), but a client check
// is not an authority: without this the RPC accepted an arbitrary window. The
// bound mirrors the client contract exactly so no supported request is
// rejected, and the rejection is structured (400 + stable code) instead of a
// generic storage error. The DB enforces the same bound independently.
const MAX_MATERIALIZATION_RANGE_DAYS = 180
const DAY_MS = 86400000
const rangeDays = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
const assertFields = (input, allowed) => { if (!input || typeof input !== 'object' || Array.isArray(input)) fail('El payload no es válido.'); for (const key of Object.keys(input)) if (!allowed.has(key)) fail(`El campo ${key} no está permitido.`) }
// A raw driver code (e.g. Postgres `22P02` invalid uuid) is an implementation
// leak and, worse, would distinguish "malformed id" from "absent id". Only the
// codes we deliberately map are forwarded; everything else stays opaque.
const dbError = (error, fallback) => { if (!error) return; if (error.code === '42501') throw createHttpError(403, 'No tenés permiso para modificar este horario.', 'forbidden'); if (error.code === '40001') throw createHttpError(412, 'El horario cambió. Actualizá y reintentá.', 'version_conflict'); if (error.code === 'P0002') throw createHttpError(404, 'Horario no encontrado.', 'event_series_not_found'); throw createHttpError(400, fallback, 'event_series_storage_error') }
const defaultsFrom = (input, current = {}) => ({ ...current, ...(input.eventDefaults && typeof input.eventDefaults === 'object' && !Array.isArray(input.eventDefaults) ? input.eventDefaults : {}), ...(Object.prototype.hasOwnProperty.call(input, 'title') ? { title: String(input.title ?? '').trim() } : {}), ...(Object.prototype.hasOwnProperty.call(input, 'description') ? { description: String(input.description ?? '').trim() } : {}) })

async function dto(context, id) { const { data, error } = await context.client.rpc('planner_event_series_v1_dto', { p_series_id: id }); dbError(error, 'No se pudo leer el horario.'); if (!data) throw createHttpError(404, 'Horario no encontrado.', 'event_series_not_found'); return data }
async function list(context, query = {}) { let request = context.client.from('planner_event_series').select('id').eq('household_id', context.householdId).eq('scope', 'household').order('updated_at', { ascending: false }); if (query.lifecycle) request = request.eq('lifecycle', query.lifecycle); const { data, error } = await request; dbError(error, 'No se pudieron leer los horarios.'); const series = []; for (const row of data ?? []) series.push(await dto(context, row.id)); return { series } }
async function get(context, id) { return { series: await dto(context, id) } }
async function create(context, input = {}) {
  assertFields(input, CREATE_FIELDS); if (input.scheduleType !== 'timed' && input.scheduleType !== 'all_day') fail('scheduleType no es válido.'); date(input.startsOn, 'startsOn'); if (input.endsOn != null && input.endsOn !== '') date(input.endsOn, 'endsOn'); if (!input.recurrenceRule || typeof input.recurrenceRule !== 'object' || Array.isArray(input.recurrenceRule)) fail('recurrenceRule no es válida.')
  const { data, error } = await context.client.rpc('create_planner_event_series_v1', { p_household_id: context.householdId, p_payload: { scope: 'household', scheduleType: input.scheduleType, recurrenceRule: input.recurrenceRule, startsOn: input.startsOn, endsOn: input.endsOn ?? null, timeZone: input.timeZone ?? null, eventDefaults: defaultsFrom(input) } }); dbError(error, 'No se pudo crear el horario.'); return { series: await dto(context, data?.series?.id) }
}
async function update(context, id, input = {}, expectedVersion) {
  assertFields(input, UPDATE_FIELDS); if (Object.prototype.hasOwnProperty.call(input, 'startsOn')) date(input.startsOn, 'startsOn'); if (input.endsOn != null && input.endsOn !== '') date(input.endsOn, 'endsOn'); const current = await dto(context, id); const patch = {}; for (const key of ['recurrenceRule', 'startsOn', 'endsOn', 'timeZone']) if (Object.prototype.hasOwnProperty.call(input, key)) patch[key] = input[key]; if (Object.prototype.hasOwnProperty.call(input, 'eventDefaults') || Object.prototype.hasOwnProperty.call(input, 'title') || Object.prototype.hasOwnProperty.call(input, 'description')) patch.eventDefaults = defaultsFrom(input, current.eventDefaults); const { data, error } = await context.client.rpc('mutate_planner_event_series_v1', { p_household_id: context.householdId, p_series_id: id, p_action: 'update', p_patch: patch, p_expected_version: expectedVersion }); dbError(error, 'No se pudo actualizar el horario.'); return { series: data }
}
async function lifecycle(context, id, action, expectedVersion) { const { data, error } = await context.client.rpc('mutate_planner_event_series_v1', { p_household_id: context.householdId, p_series_id: id, p_action: action, p_patch: {}, p_expected_version: expectedVersion }); dbError(error, 'No se pudo actualizar el horario.'); return { series: data } }
async function materializeRange(context, input = {}) { const from = date(input.from, 'from'); const to = date(input.to, 'to'); if (to < from) fail('to debe ser igual o posterior a from.'); const days = rangeDays(from, to); if (!Number.isFinite(days)) fail('El rango no es una ventana válida.'); if (days > MAX_MATERIALIZATION_RANGE_DAYS) fail(`El rango no puede superar los ${MAX_MATERIALIZATION_RANGE_DAYS} días.`, 'event_series_range_too_large'); const { data, error } = await context.client.rpc('materialize_planner_event_series_range_v1', { p_household_id: context.householdId, p_from: from, p_to: to }); dbError(error, 'No se pudo materializar el rango.'); return data }
module.exports = { create, get, lifecycle, list, materializeRange, update }
