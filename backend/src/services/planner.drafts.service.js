'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { assertExpectedVersionMatches } = require('../lib/mutationContracts');
const {
  DRAFT_INTENDED_SCOPES,
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
const {
  addRetentionWindow,
  mapAtomicMutationResult,
  mapPresetDraftRpcError,
} = require('./planner.presets.service');

const nowIso = () => new Date().toISOString();

function toError(result) {
  const status = result.code === 'payload_version_unsupported' ? 422 : 400;
  return createHttpError(status, result.message, result.code, result.details ?? null);
}

function ensureDraftEnvelope(input, entityType, adapterKey) {
  const normalized = normalizePayloadEnvelope(input, entityType, adapterKey);
  if (!normalized.ok) throw toError(normalized);
  const validated = validateEnvelopeForUse({
    entity_type: normalized.value.entityType,
    adapter_key: normalized.value.adapterKey,
    payload_schema: normalized.value.payloadSchema,
    payload_version: normalized.value.payloadVersion,
    payload: normalized.value.payload,
  }, 'draft');
  if (!validated.ok) throw toError(validated);
  return validated.value;
}

function assertDraftOwned(context, draft) {
  if (!draft || draft.owner_person_id !== context.personId) {
    throw createHttpError(404, 'Draft no encontrado.', 'not_found');
  }
}

class SupabaseDraftRepository {
  constructor(client) {
    this.client = client;
  }

  async list(context, filters = {}) {
    let query = this.client
      .from('planner_drafts')
      .select('*')
      .eq('owner_person_id', context.personId)
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
      .from('planner_drafts')
      .select('*')
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

  async autosave(context, data, expectedVersion = null) {
    return this.callMutation('planner_autosave_draft_v1', {
      p_client_draft_key: data.client_draft_key,
      p_entity_type: data.entity_type,
      p_intended_scope: data.intended_scope,
      p_intended_household_id: data.intended_household_id,
      p_source_preset_id: data.source_preset_id,
      p_source_preset_revision_id: data.source_preset_revision_id,
      p_payload_envelope: data.envelope,
      p_content_fingerprint: data.fingerprint,
      p_expected_version: expectedVersion,
    });
  }

  async trash(context, draftId, expectedVersion, correlation = {}) {
    const result = await this.callMutation('planner_trash_draft_v1', {
      p_draft_id: draftId,
      p_expected_version: expectedVersion,
      p_request_id: correlation.requestId ?? null,
      p_mutation_id: correlation.mutationId ?? null,
      p_idempotency_key: correlation.idempotencyKey ?? null,
    });
    return mapAtomicMutationResult(result, expectedVersion);
  }

  async restore(context, draftId, expectedVersion, correlation = {}) {
    return this.callMutation('planner_restore_draft_v1', {
      p_draft_id: draftId,
      p_expected_version: expectedVersion,
      p_request_id: correlation.requestId ?? null,
      p_mutation_id: correlation.mutationId ?? null,
    });
  }

  async discard(context, draftId, expectedVersion) {
    const draft = await this.get(draftId);
    if (!draft) return { draft: null, outcome: 'noop' };
    assertDraftOwned(context, draft);
    if (expectedVersion !== null && expectedVersion !== undefined) {
      assertExpectedVersionMatches(draft.version, expectedVersion);
    }
    const { error } = await this.client
      .from('planner_drafts')
      .delete()
      .eq('id', draftId)
      .eq('owner_person_id', context.personId);
    if (error) throw createHttpError(500, 'Error interno.', 'internal_error');
    return { draft: null, outcome: 'discarded' };
  }
}

class InMemoryDraftRepository {
  constructor() {
    this.drafts = new Map();
    this.nextDraft = 1;
  }

  _draftId() {
    return `draft-${this.nextDraft++}`;
  }

  _findByClientKey(context, clientDraftKey, entityType) {
    return [...this.drafts.values()].find((draft) =>
      draft.owner_person_id === context.personId &&
      draft.client_draft_key === clientDraftKey &&
      draft.entity_type === entityType);
  }

  async list(context, filters = {}) {
    return [...this.drafts.values()]
      .filter((draft) => draft.owner_person_id === context.personId)
      .filter((draft) => filters.include_trashed || !draft.trashed_at)
      .filter((draft) => !filters.entity_type || draft.entity_type === filters.entity_type)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .map(cloneJson);
  }

  async get(id) {
    return cloneJson(this.drafts.get(id));
  }

  async autosave(context, data, expectedVersion = null) {
    let draft = this._findByClientKey(context, data.client_draft_key, data.entity_type);
    const timestamp = nowIso();
    if (!draft) {
      draft = {
        id: this._draftId(),
        client_draft_key: data.client_draft_key,
        entity_type: data.entity_type,
        owner_person_id: context.personId,
        intended_scope: data.intended_scope,
        intended_household_id: data.intended_household_id,
        source_preset_id: data.source_preset_id ?? null,
        source_preset_revision_id: data.source_preset_revision_id ?? null,
        adapter_key: data.envelope.adapter_key,
        payload_schema: data.envelope.payload_schema,
        payload_version: data.envelope.payload_version,
        payload: data.envelope.payload,
        content_fingerprint: data.fingerprint,
        version: 1,
        last_autosaved_at: timestamp,
        trashed_at: null,
        trashed_from_state: null,
        retention_expires_at: null,
        created_at: timestamp,
        updated_at: timestamp,
      };
      this.drafts.set(draft.id, draft);
      return { draft: cloneJson(draft), outcome: 'created' };
    }
    assertDraftOwned(context, draft);
    if (draft.trashed_at) throw createHttpError(409, 'Draft en papelera.', 'draft_trashed');
    if (expectedVersion !== null && expectedVersion !== undefined) {
      assertExpectedVersionMatches(draft.version, expectedVersion);
    }
    if (draft.content_fingerprint === data.fingerprint) {
      return { draft: cloneJson(draft), outcome: 'noop' };
    }
    Object.assign(draft, {
      intended_scope: data.intended_scope,
      intended_household_id: data.intended_household_id,
      source_preset_id: data.source_preset_id ?? draft.source_preset_id ?? null,
      source_preset_revision_id: data.source_preset_revision_id ?? draft.source_preset_revision_id ?? null,
      adapter_key: data.envelope.adapter_key,
      payload_schema: data.envelope.payload_schema,
      payload_version: data.envelope.payload_version,
      payload: data.envelope.payload,
      content_fingerprint: data.fingerprint,
      version: draft.version + 1,
      last_autosaved_at: timestamp,
      updated_at: timestamp,
    });
    return { draft: cloneJson(draft), outcome: 'updated' };
  }

  async trash(context, draftId, expectedVersion) {
    const draft = this.drafts.get(draftId);
    assertDraftOwned(context, draft);
    assertExpectedVersionMatches(draft.version, expectedVersion);
    if (draft.trashed_at) return { draft: cloneJson(draft), outcome: 'noop' };
    draft.trashed_from_state = { intended_scope: draft.intended_scope };
    draft.trashed_at = nowIso();
    draft.retention_expires_at = addRetentionWindow();
    draft.version += 1;
    draft.updated_at = draft.trashed_at;
    return { draft: cloneJson(draft), outcome: 'updated' };
  }

  async restore(context, draftId, expectedVersion) {
    const draft = this.drafts.get(draftId);
    assertDraftOwned(context, draft);
    assertExpectedVersionMatches(draft.version, expectedVersion);
    if (!draft.trashed_at) return { draft: cloneJson(draft), outcome: 'noop' };
    if (draft.retention_expires_at && new Date(draft.retention_expires_at).getTime() < Date.now()) {
      throw createHttpError(409, 'La ventana de restore expiro.', 'restore_window_expired');
    }
    draft.trashed_at = null;
    draft.trashed_from_state = null;
    draft.retention_expires_at = null;
    draft.version += 1;
    draft.updated_at = nowIso();
    return { draft: cloneJson(draft), outcome: 'updated' };
  }

  /**
   * IR-11A-DRAFT-DISCARD-001: Definitive discard of a Draft.
   *
   * Removes the Draft immediately and permanently. Owner-only. No restore
   * window, no tombstone, no Trash participation. Idempotent: discarding an
   * already-removed draft returns a safe noop without throwing 404, so a retry
   * after a lost response does not surface a false error.
   */
  async discard(context, draftId, expectedVersion) {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      return { draft: null, outcome: 'noop' };
    }
    assertDraftOwned(context, draft);
    if (expectedVersion !== null && expectedVersion !== undefined) {
      assertExpectedVersionMatches(draft.version, expectedVersion);
    }
    this.drafts.delete(draftId);
    return { draft: null, outcome: 'discarded' };
  }
}

function normalizeDraftScope(context, body) {
  const intendedScope = normalizeString(body.intended_scope || 'personal');
  if (!DRAFT_INTENDED_SCOPES.includes(intendedScope)) {
    throw createHttpError(400, 'intended_scope invalido.', 'validation_error');
  }
  if (intendedScope === 'household') {
    const householdId = body.intended_household_id ?? context.householdId;
    if (!householdId || householdId !== context.householdId) {
      throw createHttpError(403, 'Household incorrecto.', 'wrong_household');
    }
    return { intended_scope: intendedScope, intended_household_id: householdId };
  }
  return { intended_scope: intendedScope, intended_household_id: null };
}

function createPlannerDraftsService(repositoryFactory = (context) => new SupabaseDraftRepository(context.client)) {
  const getRepository = (context) =>
    typeof repositoryFactory === 'function' ? repositoryFactory(context) : repositoryFactory;

  return {
    async listDrafts(context, filters = {}) {
      return { drafts: await getRepository(context).list(context, filters) };
    },

    async getDraft(context, draftId) {
      const draft = await getRepository(context).get(draftId);
      assertDraftOwned(context, draft);
      return { draft };
    },

    async recoverDraft(context, clientDraftKey, entityType) {
      const drafts = await getRepository(context).list(context, {
        include_trashed: true,
        entity_type: entityType,
        limit: 1000,
      });
      const draft = drafts.find((candidate) => candidate.client_draft_key === clientDraftKey);
      if (!draft) throw createHttpError(404, 'Draft no encontrado.', 'not_found');
      assertDraftOwned(context, draft);
      return { draft };
    },

    async autosaveDraft(context, body, expectedVersion = null) {
      const entityType = normalizeString(body.entity_type);
      const adapterKey = body.adapter_key || getDefaultAdapter(entityType).value?.key;
      const adapterResult = getAdapter(adapterKey, entityType);
      if (!adapterResult.ok) throw toError(adapterResult);
      const clientDraftKey = normalizeString(body.client_draft_key);
      if (!clientDraftKey) throw createHttpError(400, 'client_draft_key es obligatorio.', 'validation_error');
      const envelope = body.payload_envelope
        ? body.payload_envelope
        : buildPayloadEnvelope(entityType, adapterKey, body.payload ?? {});
      const validated = ensureDraftEnvelope(envelope, entityType, adapterKey);
      if (!adapterResult.value.hasMeaningfulDraftContent(validated.payload)) {
        throw createHttpError(422, 'Draft sin contenido significativo.', 'draft_not_meaningful');
      }
      return getRepository(context).autosave(context, {
        client_draft_key: clientDraftKey,
        entity_type: entityType,
        ...normalizeDraftScope(context, body),
        source_preset_id: body.source_preset_id ?? null,
        source_preset_revision_id: body.source_preset_revision_id ?? null,
        envelope: validated.envelope,
        fingerprint: validated.fingerprint,
      }, expectedVersion);
    },

    async trashDraft(context, draftId, expectedVersion, correlation = {}) {
      return getRepository(context).trash(context, draftId, expectedVersion, correlation);
    },

    async restoreDraft(context, draftId, expectedVersion, correlation = {}) {
      return getRepository(context).restore(context, draftId, expectedVersion, correlation);
    },

    async discardDraft(context, draftId, expectedVersion) {
      return getRepository(context).discard(context, draftId, expectedVersion);
    },

    async prepareActivationPayload(context, draftId) {
      const { draft } = await this.getDraft(context, draftId);
      const adapterResult = getAdapter(draft.adapter_key, draft.entity_type);
      if (!adapterResult.ok) throw toError(adapterResult);
      return {
        data: adapterResult.value.prepareApplicationPayload(
          { draftId: draft.id, intendedScope: draft.intended_scope },
          draft.payload,
        ),
        outcome: 'noop',
        version: draft.version,
      };
    },
  };
}

const defaultService = createPlannerDraftsService();

module.exports = {
  InMemoryDraftRepository,
  SupabaseDraftRepository,
  createPlannerDraftsService,
  ...defaultService,
};
