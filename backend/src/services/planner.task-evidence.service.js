'use strict'

const { randomUUID } = require('node:crypto')
const { supabaseAdmin } = require('../config/supabase')
const { createHttpError } = require('../lib/httpErrors')
const { resolveCapabilities, assertCapability, hasCapability } = require('../lib/plannerCapabilities')
const { assertHomeCloudAcceptedSize } = require('../lib/homecloudSizePolicy')

const BUCKET = 'planner-evidence-private'
const SIGNED_READ_TTL = 900
const ALLOWED_MIME = /^(image|video)\/[a-z0-9.+-]+$/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const capabilitiesFor = (context) => resolveCapabilities({
  role: context.membership?.role,
  membershipStatus: context.membership?.status,
  household: context.household,
})

function requireStorage() {
  if (!supabaseAdmin) throw createHttpError(500, 'Backend storage access not configured.', 'storage_backend_unavailable')
  return supabaseAdmin
}

function mapRpcOutcome(data) {
  const outcome = data?.outcome
  if (['updated', 'replay', 'noop'].includes(outcome)) return data
  const errors = {
    planner_forbidden: [403, 'No tenés permiso para esta operación.', 'planner_forbidden'],
    not_found: [404, 'Tarea no encontrada.', 'task_not_found'],
    evidence_not_required: [409, 'La tarea no requiere revisión.', 'evidence_not_required'],
    task_not_operational: [409, 'La tarea no está operativa.', 'task_not_operational'],
    fulfillment_not_current: [409, 'El cumplimiento ya no está vigente.', 'fulfillment_not_current'],
    fulfillment_not_responsible: [403, 'No sos responsable de este cumplimiento.', 'fulfillment_not_responsible'],
    fulfillment_invalid_transition: [409, 'El estado del cumplimiento cambió.', 'fulfillment_invalid_transition'],
    evidence_media_required: [400, 'Seleccioná al menos una foto o video.', 'evidence_media_required'],
    evidence_media_not_confirmed: [409, 'Todavía hay archivos sin confirmar.', 'evidence_media_not_confirmed'],
    idempotency_context_required: [400, 'Falta la clave de idempotencia.', 'idempotency_context_required'],
    idempotency_key_reused: [409, 'La clave de idempotencia ya se usó con otro contenido.', 'idempotency_key_reused'],
    version_conflict: [412, 'La versión cambió en otro dispositivo.', 'version_conflict_v2'],
    correction_reason_required: [400, 'Indicá qué habría que cambiar.', 'correction_reason_required'],
    stale_evidence_version: [409, 'Esta versión de evidencia ya no es la vigente.', 'stale_evidence_version'],
    self_verification_not_allowed: [409, 'No podés revisar tu propia evidencia.', 'cannot_verify_own_evidence'],
    validation_error: [400, 'La solicitud no es válida.', 'validation_error'],
  }
  const definition = errors[outcome] || [500, 'No se pudo completar la operación de evidencia.', 'evidence_operation_failed']
  throw createHttpError(...definition, data?.current_version ? { currentVersion: data.current_version } : undefined)
}

async function assertSubmitAccess(context, taskId) {
  const capabilities = capabilitiesFor(context)
  assertCapability(capabilities, 'planner.view')
  assertCapability(capabilities, 'task.complete_assigned')
  const { data: task, error } = await context.client.from('planner_tasks')
    .select('id,requires_verification,status,trashed_at').eq('id', taskId).eq('household_id', context.householdId).maybeSingle()
  if (error) throw createHttpError(500, error.message, 'evidence_task_lookup_failed')
  if (!task) throw createHttpError(404, 'Tarea no encontrada.', 'task_not_found')
  if (!task.requires_verification) throw createHttpError(409, 'La tarea no requiere revisión.', 'evidence_not_required')
  if (task.trashed_at || task.status === 'cancelled') throw createHttpError(409, 'La tarea no está operativa.', 'task_not_operational')
  const [configResult, assigneeResult] = await Promise.all([
    context.client.from('planner_task_assignment_configs').select('assignment_kind').eq('task_id', taskId).eq('household_id', context.householdId).maybeSingle(),
    context.client.from('planner_task_assignees').select('id').eq('task_id', taskId).eq('member_id', context.membershipId).is('revoked_at', null).maybeSingle(),
  ])
  if (configResult.error || assigneeResult.error) throw createHttpError(500, 'No se pudo validar la asignación.', 'task_assignment_lookup_failed')
  if (configResult.data?.assignment_kind === 'members' && !assigneeResult.data && !hasCapability(capabilities, 'task.complete_any')) {
    throw createHttpError(403, 'No sos responsable de este cumplimiento.', 'fulfillment_not_responsible')
  }
  return task
}

async function registerArtifact(context, taskId, body) {
  await assertSubmitAccess(context, taskId)
  const mimeType = String(body?.mimeType || '').trim().toLowerCase()
  const sizeBytes = Number(body?.sizeBytes)
  const displayName = String(body?.displayName || '').trim().slice(0, 255)
  const intakeKey = String(body?.intakeIdempotencyKey || '').trim()
  if (!ALLOWED_MIME.test(mimeType) || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || !displayName || !intakeKey) {
    throw createHttpError(400, 'Metadata multimedia inválida.', 'validation_error')
  }
  assertHomeCloudAcceptedSize(sizeBytes)
  const admin = requireStorage()
  const existing = await admin.from('planner_task_evidence_artifacts').select('*')
    .eq('household_id', context.householdId).eq('intake_idempotency_key', intakeKey).maybeSingle()
  if (existing.error) throw createHttpError(500, existing.error.message, 'evidence_artifact_lookup_failed')
  if (existing.data) {
    const sameRequest = existing.data.task_id === taskId
      && existing.data.display_name === displayName
      && existing.data.mime_type === mimeType
      && Number(existing.data.size_bytes) === sizeBytes
    if (!sameRequest) throw createHttpError(409, 'La clave de carga ya se usó con otro archivo.', 'idempotency_key_reused')
    if (existing.data.state === 'cancelled') {
      const reactivated = await admin.from('planner_task_evidence_artifacts').update({
        state: 'staging', confirmed_at: null, attached_at: null, purged_at: null,
      }).eq('id', existing.data.id).eq('state', 'cancelled').select('*').single()
      if (reactivated.error) throw createHttpError(500, reactivated.error.message, 'evidence_artifact_reactivate_failed')
      return reactivated.data
    }
    return existing.data
  }
  const id = randomUUID()
  const extension = mimeType.startsWith('image/') ? mimeType.split('/')[1].replace('jpeg', 'jpg') : mimeType.split('/')[1].replace('quicktime', 'mov')
  const storagePath = `${context.householdId}/${taskId}/${id}/original.${extension.replace(/[^a-z0-9]/g, '') || 'bin'}`
  const inserted = await admin.from('planner_task_evidence_artifacts').insert({
    id, household_id: context.householdId, task_id: taskId, uploaded_by_member_id: context.membershipId,
    storage_path: storagePath, display_name: displayName, mime_type: mimeType, size_bytes: sizeBytes,
    duration_ms: Number.isFinite(body?.durationMs) ? Math.max(0, Math.floor(body.durationMs)) : null,
    width: Number.isFinite(body?.width) ? Math.max(1, Math.floor(body.width)) : null,
    height: Number.isFinite(body?.height) ? Math.max(1, Math.floor(body.height)) : null,
    intake_idempotency_key: intakeKey,
  }).select('*').single()
  if (inserted.error) throw createHttpError(500, inserted.error.message, 'evidence_artifact_register_failed')
  return inserted.data
}

async function cancelArtifact(context, taskId, artifactId) {
  await assertSubmitAccess(context, taskId)
  const admin = requireStorage()
  const found = await admin.from('planner_task_evidence_artifacts').select('*').eq('id', artifactId)
    .eq('task_id', taskId).eq('household_id', context.householdId).eq('uploaded_by_member_id', context.membershipId).maybeSingle()
  if (found.error || !found.data) throw createHttpError(404, 'Archivo no encontrado.', 'evidence_artifact_not_found')
  if (found.data.state === 'cancelled') return found.data
  if (found.data.state === 'attached' || found.data.state === 'purged') {
    throw createHttpError(409, 'El archivo ya forma parte de una entrega.', 'evidence_artifact_not_cancellable')
  }
  const removed = await admin.storage.from(BUCKET).remove([found.data.storage_path])
  if (removed.error) throw createHttpError(503, 'No se pudo cancelar la carga.', 'evidence_artifact_cleanup_failed')
  const updated = await admin.from('planner_task_evidence_artifacts').update({
    state: 'cancelled', confirmed_at: null, attached_at: null,
  }).eq('id', artifactId).in('state', ['staging', 'confirmed']).select('*').single()
  if (updated.error) throw createHttpError(500, updated.error.message, 'evidence_artifact_cancel_failed')
  return updated.data
}

async function authorizeArtifactUpload(context, taskId, artifactId) {
  await assertSubmitAccess(context, taskId)
  const admin = requireStorage()
  const found = await admin.from('planner_task_evidence_artifacts').select('*').eq('id', artifactId)
    .eq('task_id', taskId).eq('household_id', context.householdId).eq('uploaded_by_member_id', context.membershipId).maybeSingle()
  if (found.error || !found.data) throw createHttpError(404, 'Archivo no encontrado.', 'evidence_artifact_not_found')
  if (found.data.state === 'confirmed') return { artifactId, alreadyConfirmed: true }
  if (found.data.state !== 'staging') throw createHttpError(409, 'El archivo ya no admite carga.', 'evidence_artifact_not_staging')
  const signed = await admin.storage.from(BUCKET).createSignedUploadUrl(found.data.storage_path)
  if (signed.error || !signed.data?.signedUrl) throw createHttpError(500, 'No se pudo autorizar la carga.', 'evidence_upload_authorization_failed')
  return { artifactId, signedUploadUrl: signed.data.signedUrl, expiresIn: 7200 }
}

async function confirmArtifact(context, taskId, artifactId) {
  await assertSubmitAccess(context, taskId)
  const admin = requireStorage()
  const found = await admin.from('planner_task_evidence_artifacts').select('*').eq('id', artifactId)
    .eq('task_id', taskId).eq('household_id', context.householdId).eq('uploaded_by_member_id', context.membershipId).maybeSingle()
  if (found.error || !found.data) throw createHttpError(404, 'Archivo no encontrado.', 'evidence_artifact_not_found')
  if (found.data.state === 'confirmed' || found.data.state === 'attached') return found.data
  if (found.data.state !== 'staging') throw createHttpError(409, 'El archivo ya no admite confirmación.', 'evidence_artifact_not_staging')
  const segments = found.data.storage_path.split('/')
  const name = segments.pop()
  const listing = await admin.storage.from(BUCKET).list(segments.join('/'), { limit: 10, search: name })
  const object = listing.data?.find((item) => item.name === name)
  if (listing.error || !object) throw createHttpError(409, 'La carga todavía no está disponible.', 'evidence_upload_not_found')
  const reportedSize = Number(object.metadata?.size ?? 0)
  if (reportedSize > 0 && reportedSize !== Number(found.data.size_bytes)) {
    throw createHttpError(409, 'El tamaño cargado no coincide.', 'evidence_upload_size_mismatch')
  }
  const updated = await admin.from('planner_task_evidence_artifacts').update({ state: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', artifactId).eq('state', 'staging').select('*').single()
  if (updated.error) throw createHttpError(500, updated.error.message, 'evidence_artifact_confirm_failed')
  return updated.data
}

async function submitEvidence(context, taskId, fulfillmentId, body, idempotencyKey) {
  await assertSubmitAccess(context, taskId)
  const ids = Array.isArray(body?.artifactIds) ? body.artifactIds.filter((id) => UUID_RE.test(String(id))) : []
  const expectedVersion = Number(body?.expectedVersion)
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1 || ids.length !== body?.artifactIds?.length) {
    throw createHttpError(400, 'Versión o archivos inválidos.', 'validation_error')
  }
  const { data, error } = await context.client.rpc('submit_planner_task_evidence_v2', {
    p_household_id: context.householdId, p_task_id: taskId, p_fulfillment_id: fulfillmentId,
    p_expected_version: expectedVersion, p_artifact_ids: ids, p_idempotency_key: idempotencyKey,
  })
  if (error) throw createHttpError(500, error.message, 'evidence_submit_failed')
  return mapRpcOutcome(data)
}

async function reviewEvidence(context, taskId, fulfillmentId, submissionId, body) {
  const capabilities = capabilitiesFor(context)
  assertCapability(capabilities, 'planner.view'); assertCapability(capabilities, 'task.verify')
  const { data, error } = await context.client.rpc('review_planner_task_evidence_v2', {
    p_household_id: context.householdId, p_task_id: taskId, p_fulfillment_id: fulfillmentId,
    p_submission_id: submissionId, p_expected_version: Number(body?.expectedVersion),
    p_action: body?.action, p_reason: body?.reason ?? null,
  })
  if (error) throw createHttpError(500, error.message, 'evidence_review_failed')
  return mapRpcOutcome(data)
}

async function history(context, taskId) {
  assertCapability(capabilitiesFor(context), 'planner.view')
  const result = await context.client.from('planner_task_evidence_submissions').select(`
    *, media:planner_task_evidence_media(id,position,artifact:planner_task_evidence_artifacts(id,display_name,mime_type,size_bytes,duration_ms,width,height,state,purged_at)),
    submitter:household_members!planner_task_evidence_submissions_submitted_by_member_id_fkey(id,people(id,display_name,avatar_url)),
    reviewer:household_members!planner_task_evidence_submissions_reviewer_member_id_fkey(id,people(id,display_name,avatar_url))
  `).eq('task_id', taskId).eq('household_id', context.householdId).order('version', { ascending: false })
  if (result.error) throw createHttpError(500, result.error.message, 'evidence_history_failed')
  return { submissions: (result.data || []).map((submission) => ({
    ...submission, media: (submission.media || []).sort((a, b) => a.position - b.position),
  })) }
}

async function signedMediaAccess(context, taskId, artifactId) {
  assertCapability(capabilitiesFor(context), 'planner.view')
  const admin = requireStorage()
  const found = await admin.from('planner_task_evidence_artifacts').select('id,task_id,household_id,storage_path,state,mime_type')
    .eq('id', artifactId).eq('task_id', taskId).eq('household_id', context.householdId).maybeSingle()
  if (found.error || !found.data) throw createHttpError(404, 'Archivo no encontrado.', 'evidence_artifact_not_found')
  if (found.data.state === 'purged') throw createHttpError(410, 'El archivo de evidencia ya expiró.', 'evidence_media_expired')
  if (found.data.state !== 'attached') throw createHttpError(409, 'El archivo no está disponible.', 'evidence_media_unavailable')
  const signed = await admin.storage.from(BUCKET).createSignedUrl(found.data.storage_path, SIGNED_READ_TTL)
  if (signed.error || !signed.data?.signedUrl) throw createHttpError(500, 'No se pudo abrir el archivo.', 'evidence_signed_url_failed')
  return { signedUrl: signed.data.signedUrl, expiresIn: SIGNED_READ_TTL, mimeType: found.data.mime_type }
}

async function purgeExpiredEvidence(limit = 100) {
  const admin = requireStorage()
  const claimed = await admin.rpc('claim_expired_planner_evidence_media', { p_limit: limit })
  if (claimed.error) throw claimed.error
  const rows = claimed.data || []
  for (const row of rows) {
    const removed = await admin.storage.from(BUCKET).remove([row.storage_path])
    if (!removed.error) await admin.from('planner_task_evidence_artifacts').update({ state: 'purged', purged_at: new Date().toISOString() }).eq('id', row.artifact_id)
  }
  const submissionIds = await admin.from('planner_task_evidence_submissions').select('id,planner_task_evidence_media!inner(artifact:planner_task_evidence_artifacts!inner(state))')
    .not('retain_until', 'is', null).lte('retain_until', new Date().toISOString()).is('media_purged_at', null)
  for (const submission of submissionIds.data || []) {
    const allPurged = (submission.planner_task_evidence_media || []).every((item) => item.artifact?.state === 'purged')
    if (allPurged) await admin.from('planner_task_evidence_submissions').update({ media_purged_at: new Date().toISOString() }).eq('id', submission.id)
  }
  return { claimed: rows.length }
}

module.exports = { BUCKET, authorizeArtifactUpload, cancelArtifact, confirmArtifact, history, purgeExpiredEvidence, registerArtifact, reviewEvidence, signedMediaAccess, submitEvidence }
