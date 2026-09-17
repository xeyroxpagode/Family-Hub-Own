'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
  CANONICAL_ERROR_CODES,
  assertExpectedVersionMatches,
} = require('../lib/mutationContracts');
const {
  buildPayloadEnvelope,
  cloneJson,
  normalizePayloadEnvelope,
  normalizeString,
} = require('../contracts/planner.presets-drafts.contract');
const {
  getAdapter,
  getDefaultAdapter,
  validateEnvelopeForUse,
} = require('../adapters/planner.presets-drafts.adapters');

const RETENTION_DAYS = 30;
const nowIso = () => new Date().toISOString();
const addRetentionWindow = (date = new Date()) =>
  new Date(date.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

function toError(result) {
  const status = result.code === 'payload_version_unsupported' ? 422 : 400;
  return createHttpError(status, result.message, result.code, result.details ?? null);
}

function mapPresetDraftRpcError(error) {
  if (!error) return createHttpError(500, 'Error interno.', 'internal_error');
  if (error.code === '42501') return createHttpError(403, 'No tenes permiso para realizar esta accion.', 'forbidden');
  if (error.code === 'P0008') {
    return createHttpError(409, 'La operacion ya fue procesada con otros datos.', CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT);
  }
  if (error.code === 'P0009') {
    return createHttpError(409, 'La operacion ya se esta procesando. Reintenta en unos segundos.', CANONICAL_ERROR_CODES.IDEMPOTENCY_IN_FLIGHT);
  }
  if (error.code === 'P0001' && error.message === 'version_conflict') {
    return createHttpError(412, 'La version de la entidad cambio. Actualiza y reintenta.', CANONICAL_ERROR_CODES.VERSION_CONFLICT_V2);
  }
  const mapped = createHttpError(500, 'Error interno.', 'internal_error');
  mapped.supabaseError = { code: error.code, message: error.message, details: error.details, hint: error.hint };
  return mapped;
}

function mapAtomicMutationResult(result, expectedVersion = null) {
  if (result?.outcome === 'version_conflict') {
    throw createHttpError(412, 'La version de la entidad cambio. Actualiza y reintenta.', CANONICAL_ERROR_CODES.VERSION_CONFLICT_V2, {
      current: Number(result.current_version),
      expected: Number(expectedVersion),
    });
  }
  if (result?.outcome === 'idempotency_conflict') {
    throw createHttpError(409, 'La operacion ya fue procesada con otros datos.', CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT);
  }
  return result;
}

function ensurePayloadEnvelope(input, entityType, adapterKey, kind) {
  const normalized = normalizePayloadEnvelope(input, entityType, adapterKey);
  if (!normalized.ok) throw toError(normalized);
  const validated = validateEnvelopeForUse({
    entity_type: normalized.value.entityType,
    adapter_key: normalized.value.adapterKey,
    payload_schema: normalized.value.payloadSchema,
    payload_version: normalized.value.payloadVersion,
    payload: normalized.value.payload,
  }, kind);
  if (!validated.ok) throw toError(validated);
  return validated.value;
}

function resolvePresetScope(context, source, body = {}) {
  if (source === 'personal') {
    return {
      source,
      owner_person_id: context.personId,
      household_id: null,
      scopeType: 'personal',
      scopeId: context.personId,
    };
  }
  if (source === 'household') {
    const householdId = body.household_id ?? context.householdId;
    if (!householdId || householdId !== context.householdId) {
      throw createHttpError(403, 'Household incorrecto.', 'wrong_household');
    }
    return {
      source,
      owner_person_id: null,
      household_id: householdId,
      scopeType: 'household',
      scopeId: householdId,
    };
  }
  if (source === 'homeplus') {
    throw createHttpError(403, 'HomePlus presets are read-only for users.', 'forbidden');
  }
  throw createHttpError(400, 'source invalido.', 'validation_error');
}

function assertPresetWritableByContext(context, preset) {
  if (!preset) throw createHttpError(404, 'Preset no encontrado.', 'not_found');
  if (preset.source === 'homeplus') {
    throw createHttpError(403, 'HomePlus presets are read-only for users.', 'forbidden');
  }
  if (preset.source === 'personal' && preset.owner_person_id !== context.personId) {
    throw createHttpError(404, 'Preset no encontrado.', 'not_found');
  }
  if (preset.source === 'household' && preset.household_id !== context.householdId) {
    throw createHttpError(403, 'Household incorrecto.', 'wrong_household');
  }
}

class SupabasePresetRepository {
  constructor(client) {
    this.client = client;
  }

  async list(context, filters = {}) {
    let query = this.client
      .from('planner_presets')
      .select('*, planner_preset_revisions(*)')
      .order('updated_at', { ascending: false })
      .limit(Number(filters.limit) || 100);
    if (!filters.include_trashed) query = query.is('trashed_at', null);
    if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
    const { data, error } = await query;
    if (error) throw createHttpError(500, 'Error interno.', 'internal_error');
    return data ?? [];
  }

  async get(id) {
    const { data, error } = await this.client
      .from('planner_presets')
      .select('*, planner_preset_revisions(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw createHttpError(500, 'Error interno.', 'internal_error');
    return data;
  }

  async callMutation(name, args) {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw mapPresetDraftRpcError(error);
    return data;
  }

  async createPreset(context, data, correlation = {}) {
    return this.callMutation('planner_create_preset_v1', {
      p_entity_type: data.entity_type,
      p_source: data.source,
      p_name: data.name,
      p_payload_envelope: data.envelope,
      p_structural_fingerprint: data.fingerprint,
      p_request_id: correlation.requestId ?? null,
      p_mutation_id: correlation.mutationId ?? null,
      p_idempotency_key: correlation.idempotencyKey ?? null,
    });
  }

  async updateMetadata(context, presetId, patch, expectedVersion, correlation = {}) {
    const result = await this.callMutation('planner_update_preset_metadata_v1', {
      p_preset_id: presetId,
      p_expected_version: expectedVersion,
      p_name: patch.name ?? null,
      p_request_id: correlation.requestId ?? null,
      p_mutation_id: correlation.mutationId ?? null,
      p_idempotency_key: correlation.idempotencyKey ?? null,
    });
    return mapAtomicMutationResult(result, expectedVersion);
  }

  async startRevision(context, presetId) {
    return this.callMutation('planner_start_preset_revision_v1', {
      p_preset_id: presetId,
    });
  }

  async updateRevisionDraft(context, revisionId, envelope, fingerprint, expectedVersion) {
    return this.callMutation('planner_update_preset_revision_draft_v1', {
      p_revision_id: revisionId,
      p_expected_version: expectedVersion,
      p_payload_envelope: envelope,
      p_structural_fingerprint: fingerprint,
    });
  }

  async publishRevision(context, revisionId, expectedVersion, correlation = {}) {
    return this.callMutation('planner_publish_preset_revision_v1', {
      p_revision_id: revisionId,
      p_expected_version: expectedVersion,
      p_request_id: correlation.requestId ?? null,
      p_mutation_id: correlation.mutationId ?? null,
    });
  }

  async trash(context, presetId, expectedVersion, correlation = {}) {
    return this.callMutation('planner_trash_preset_v1', {
      p_preset_id: presetId,
      p_expected_version: expectedVersion,
      p_request_id: correlation.requestId ?? null,
      p_mutation_id: correlation.mutationId ?? null,
    });
  }

  async restore(context, presetId, expectedVersion, correlation = {}) {
    return this.callMutation('planner_restore_preset_v1', {
      p_preset_id: presetId,
      p_expected_version: expectedVersion,
      p_request_id: correlation.requestId ?? null,
      p_mutation_id: correlation.mutationId ?? null,
    });
  }
}

class InMemoryPresetRepository {
  constructor() {
    this.presets = new Map();
    this.revisions = new Map();
    this.nextPreset = 1;
    this.nextRevision = 1;
  }

  _presetId() {
    return `preset-${this.nextPreset++}`;
  }

  _revisionId() {
    return `revision-${this.nextRevision++}`;
  }

  _withRevisions(preset) {
    if (!preset) return null;
    return {
      ...cloneJson(preset),
      planner_preset_revisions: [...this.revisions.values()]
        .filter((revision) => revision.preset_id === preset.id)
        .sort((a, b) => a.revision_number - b.revision_number)
        .map(cloneJson),
    };
  }

  async list(context, filters = {}) {
    return [...this.presets.values()]
      .filter((preset) => {
        if (!filters.include_trashed && preset.trashed_at) return false;
        if (filters.entity_type && preset.entity_type !== filters.entity_type) return false;
        if (preset.source === 'homeplus') return true;
        if (preset.source === 'personal') return preset.owner_person_id === context.personId;
        return preset.household_id === context.householdId;
      })
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .map((preset) => this._withRevisions(preset));
  }

  async get(id) {
    return this._withRevisions(this.presets.get(id));
  }

  async createPreset(context, data) {
    const timestamp = nowIso();
    const preset = {
      id: this._presetId(),
      entity_type: data.entity_type,
      source: data.source,
      owner_person_id: data.owner_person_id,
      household_id: data.household_id,
      created_by_person_id: context.personId,
      created_by_member_id: context.membershipId ?? null,
      name: data.name,
      active_revision_id: null,
      version: 1,
      trashed_at: null,
      trashed_from_state: null,
      retention_expires_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const revision = {
      id: this._revisionId(),
      preset_id: preset.id,
      revision_number: 1,
      revision_state: 'published',
      adapter_key: data.envelope.adapter_key,
      payload_schema: data.envelope.payload_schema,
      payload_version: data.envelope.payload_version,
      payload: data.envelope.payload,
      structural_fingerprint: data.fingerprint,
      version: 1,
      created_by_person_id: context.personId,
      created_by_member_id: context.membershipId ?? null,
      created_at: timestamp,
      updated_at: timestamp,
      published_at: timestamp,
    };
    preset.active_revision_id = revision.id;
    this.presets.set(preset.id, preset);
    this.revisions.set(revision.id, revision);
    return { preset: this._withRevisions(preset), revision: cloneJson(revision), outcome: 'created' };
  }

  async updateMetadata(context, presetId, patch, expectedVersion) {
    const preset = this.presets.get(presetId);
    assertPresetWritableByContext(context, preset);
    assertExpectedVersionMatches(preset.version, expectedVersion);
    if (preset.trashed_at) throw createHttpError(409, 'Preset en papelera.', 'preset_trashed');
    const name = normalizeString(patch.name);
    if (!name) return { preset: this._withRevisions(preset), outcome: 'noop' };
    preset.name = name;
    preset.version += 1;
    preset.updated_at = nowIso();
    return { preset: this._withRevisions(preset), outcome: 'updated' };
  }

  async startRevision(context, presetId) {
    const preset = this.presets.get(presetId);
    assertPresetWritableByContext(context, preset);
    if (preset.trashed_at) throw createHttpError(409, 'Preset en papelera.', 'preset_trashed');
    const open = [...this.revisions.values()].find((revision) =>
      revision.preset_id === presetId && revision.revision_state === 'draft');
    if (open) throw createHttpError(409, 'Ya existe una revision draft abierta.', 'preset_revision_already_open');
    const active = this.revisions.get(preset.active_revision_id);
    const nextNumber = Math.max(0, ...[...this.revisions.values()]
      .filter((revision) => revision.preset_id === presetId)
      .map((revision) => revision.revision_number)) + 1;
    const timestamp = nowIso();
    const revision = {
      ...cloneJson(active),
      id: this._revisionId(),
      preset_id: presetId,
      revision_number: nextNumber,
      revision_state: 'draft',
      version: 1,
      created_by_person_id: context.personId,
      created_by_member_id: context.membershipId ?? null,
      created_at: timestamp,
      updated_at: timestamp,
      published_at: null,
    };
    this.revisions.set(revision.id, revision);
    return { revision: cloneJson(revision), outcome: 'created' };
  }

  async updateRevisionDraft(context, revisionId, envelope, fingerprint, expectedVersion) {
    const revision = this.revisions.get(revisionId);
    if (!revision) throw createHttpError(404, 'Revision no encontrada.', 'not_found');
    const preset = this.presets.get(revision.preset_id);
    assertPresetWritableByContext(context, preset);
    if (revision.revision_state !== 'draft') {
      throw createHttpError(409, 'Revision publicada inmutable.', 'preset_revision_not_publishable');
    }
    assertExpectedVersionMatches(revision.version, expectedVersion);
    if (revision.structural_fingerprint === fingerprint) {
      return { revision: cloneJson(revision), outcome: 'noop' };
    }
    Object.assign(revision, {
      adapter_key: envelope.adapter_key,
      payload_schema: envelope.payload_schema,
      payload_version: envelope.payload_version,
      payload: envelope.payload,
      structural_fingerprint: fingerprint,
      version: revision.version + 1,
      updated_at: nowIso(),
    });
    return { revision: cloneJson(revision), outcome: 'updated' };
  }

  async publishRevision(context, revisionId, expectedVersion) {
    const revision = this.revisions.get(revisionId);
    if (!revision) throw createHttpError(404, 'Revision no encontrada.', 'not_found');
    const preset = this.presets.get(revision.preset_id);
    assertPresetWritableByContext(context, preset);
    if (preset.trashed_at) throw createHttpError(409, 'Preset en papelera.', 'preset_trashed');
    if (revision.revision_state !== 'draft') {
      throw createHttpError(409, 'Revision no publicable.', 'preset_revision_not_publishable');
    }
    assertExpectedVersionMatches(revision.version, expectedVersion);
    for (const other of this.revisions.values()) {
      if (other.preset_id === preset.id && other.revision_state === 'published') {
        other.revision_state = 'superseded';
      }
    }
    revision.revision_state = 'published';
    revision.published_at = nowIso();
    revision.version += 1;
    revision.updated_at = revision.published_at;
    preset.active_revision_id = revision.id;
    preset.version += 1;
    preset.updated_at = revision.published_at;
    return { preset: this._withRevisions(preset), revision: cloneJson(revision), outcome: 'updated' };
  }

  async trash(context, presetId, expectedVersion) {
    const preset = this.presets.get(presetId);
    assertPresetWritableByContext(context, preset);
    assertExpectedVersionMatches(preset.version, expectedVersion);
    if (preset.trashed_at) return { preset: this._withRevisions(preset), outcome: 'noop' };
    preset.trashed_from_state = { active_revision_id: preset.active_revision_id };
    preset.trashed_at = nowIso();
    preset.retention_expires_at = addRetentionWindow();
    preset.version += 1;
    preset.updated_at = preset.trashed_at;
    return { preset: this._withRevisions(preset), outcome: 'updated' };
  }

  async restore(context, presetId, expectedVersion) {
    const preset = this.presets.get(presetId);
    assertPresetWritableByContext(context, preset);
    assertExpectedVersionMatches(preset.version, expectedVersion);
    if (!preset.trashed_at) return { preset: this._withRevisions(preset), outcome: 'noop' };
    if (preset.retention_expires_at && new Date(preset.retention_expires_at).getTime() < Date.now()) {
      throw createHttpError(409, 'La ventana de restore expiro.', 'restore_window_expired');
    }
    preset.trashed_at = null;
    preset.trashed_from_state = null;
    preset.retention_expires_at = null;
    preset.version += 1;
    preset.updated_at = nowIso();
    return { preset: this._withRevisions(preset), outcome: 'updated' };
  }
}

function createPlannerPresetsService(repositoryFactory = (context) => new SupabasePresetRepository(context.client)) {
  const getRepository = (context) =>
    typeof repositoryFactory === 'function' ? repositoryFactory(context) : repositoryFactory;

  return {
    async listPresets(context, filters = {}) {
      return { presets: await getRepository(context).list(context, filters) };
    },

    async getPreset(context, presetId) {
      const preset = await getRepository(context).get(presetId);
      if (!preset) throw createHttpError(404, 'Preset no encontrado.', 'not_found');
      if (preset.source === 'personal' && preset.owner_person_id !== context.personId) {
        throw createHttpError(404, 'Preset no encontrado.', 'not_found');
      }
      if (preset.source === 'household' && preset.household_id !== context.householdId) {
        throw createHttpError(403, 'Household incorrecto.', 'wrong_household');
      }
      return { preset };
    },

    async createPreset(context, body, correlation = {}) {
      const entityType = normalizeString(body.entity_type);
      const source = normalizeString(body.source || 'personal');
      const name = normalizeString(body.name);
      if (!name) throw createHttpError(400, 'name es obligatorio.', 'validation_error');
      const adapterKey = body.adapter_key || getDefaultAdapter(entityType).value?.key;
      const adapterResult = getAdapter(adapterKey, entityType);
      if (!adapterResult.ok) throw toError(adapterResult);
      const scope = resolvePresetScope(context, source, body);
      const envelope = body.payload_envelope
        ? body.payload_envelope
        : buildPayloadEnvelope(entityType, adapterKey, body.payload ?? {});
      const validated = ensurePayloadEnvelope(envelope, entityType, adapterKey, 'preset');
      return getRepository(context).createPreset(context, {
        ...scope,
        entity_type: entityType,
        name,
        envelope: validated.envelope,
        fingerprint: validated.fingerprint,
      }, correlation);
    },

    async updatePresetMetadata(context, presetId, body, expectedVersion, correlation = {}) {
      return getRepository(context).updateMetadata(context, presetId, body ?? {}, expectedVersion, correlation);
    },

    async startRevision(context, presetId) {
      return getRepository(context).startRevision(context, presetId);
    },

    async updateRevisionDraft(context, revisionId, body, expectedVersion) {
      const adapterKey = body.adapter_key;
      const entityType = body.entity_type;
      const envelope = body.payload_envelope
        ? body.payload_envelope
        : buildPayloadEnvelope(entityType, adapterKey, body.payload ?? {});
      const validated = ensurePayloadEnvelope(envelope, entityType, adapterKey, 'preset');
      return getRepository(context).updateRevisionDraft(
        context,
        revisionId,
        validated.envelope,
        validated.fingerprint,
        expectedVersion,
      );
    },

    async publishRevision(context, revisionId, expectedVersion, correlation = {}) {
      return getRepository(context).publishRevision(context, revisionId, expectedVersion, correlation);
    },

    async listRevisionHistory(context, presetId) {
      const { preset } = await this.getPreset(context, presetId);
      return {
        revisions: (preset.planner_preset_revisions ?? [])
          .sort((a, b) => b.revision_number - a.revision_number),
      };
    },

    async getRevision(context, revisionId) {
      const presets = await getRepository(context).list(context, { include_trashed: true, limit: 1000 });
      const revision = presets
        .flatMap((preset) => preset.planner_preset_revisions ?? [])
        .find((candidate) => candidate.id === revisionId);
      if (!revision) throw createHttpError(404, 'Revision no encontrada.', 'not_found');
      return { revision };
    },

    async trashPreset(context, presetId, expectedVersion, correlation = {}) {
      return getRepository(context).trash(context, presetId, expectedVersion, correlation);
    },

    async restorePreset(context, presetId, expectedVersion, correlation = {}) {
      return getRepository(context).restore(context, presetId, expectedVersion, correlation);
    },

    async prepareApplicationPayload(context, presetId, revisionId = null) {
      const { preset } = await this.getPreset(context, presetId);
      const revisions = preset.planner_preset_revisions ?? [];
      const revision = revisionId
        ? revisions.find((candidate) => candidate.id === revisionId)
        : revisions.find((candidate) => candidate.id === preset.active_revision_id);
      if (!revision) throw createHttpError(404, 'Revision no encontrada.', 'not_found');
      const adapterResult = getAdapter(revision.adapter_key, preset.entity_type);
      if (!adapterResult.ok) throw toError(adapterResult);
      return {
        data: adapterResult.value.prepareApplicationPayload(
          { presetId: preset.id, revisionId: revision.id },
          revision.payload,
        ),
        outcome: 'noop',
        version: revision.version,
      };
    },
  };
}

const defaultService = createPlannerPresetsService();

module.exports = {
  InMemoryPresetRepository,
  SupabasePresetRepository,
  addRetentionWindow,
  createPlannerPresetsService,
  mapAtomicMutationResult,
  mapPresetDraftRpcError,
  ...defaultService,
};
