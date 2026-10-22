'use strict';

/**
 * HOMePLUS Assets <-> HomeCloud — S8-02: Asset/Record/Care <-> File relations.
 *
 * Authority: S6 INTEGRATION FREEZE (DEC-S6-014..028 relevant to HomeCloud).
 *
 * OWNERSHIP (frozen):
 *   * HomeCloud OWNS the File: the blob, the canonical metadata and the
 *     lifecycle (active / trashed / purging / staging). HomeCloud also owns
 *     the purge.
 *   * Assets OWNS the RELATION: which File is attached to which Asset, Record
 *     or Care of the same Household.
 *
 * HARD RULES enforced here:
 *   - Assets NEVER duplicates a blob and NEVER clones File metadata: the
 *     relation rows carry relation metadata only; the read model projects the
 *     LIVE HomeCloud metadata at read time.
 *   - Assets NEVER deletes, trashes or purges a HomeCloud File. "Unlink" is a
 *     SOFT operation on the relation (removed_at + removed_by_member_id).
 *   - Assets NEVER reads public.homecloud_contents on its own: the File is
 *     validated through the canonical HomeCloud service
 *     (homecloudContentStates.service.js), which owns the lifecycle rules.
 *   - A File of ANOTHER household answers exactly like a nonexistent File
 *     (404 homecloud_content_not_found): no name, no type, no size and no
 *     lifecycle of a foreign File is ever disclosed.
 *   - A purged File leaves a TOMBSTONE: the relation row survives with
 *     removed_at IS NULL and the read model reports state='missing' with
 *     file=null. Nothing is auto-unlinked and no owner is ever deleted.
 *
 * ENDPOINTS (owned by this service):
 *   POST /api/assets/files/link    attach an existing HomeCloud File
 *   POST /api/assets/files/unlink  detach it (relation only)
 *   GET  /api/assets/:assetId/files
 *   GET  /api/assets/records/:recordId/files
 *   GET  /api/assets/care/:careId/files
 *
 * IDEMPOTENCY: the Assets machinery is reused verbatim (reserve/complete +
 * the canonical request hash). Same key + same payload replays the stored
 * answer; same key + different payload is a 409 idempotency_conflict; an
 * active lease is a 409 idempotency_in_flight.
 */

const { supabaseAdmin } = require('../config/supabase');
const { createHttpError, buildApiErrorEnvelope } = require('../lib/httpErrors');
const {
  requireIdempotencyKey,
  createIdempotencyInFlightError,
} = require('../lib/mutationContracts');
const {
  resolveAssetsContext,
  contextWithCapability,
  reserveAssetsIdempotency,
  completeAssetsIdempotency,
  hashAssetsRequest,
  loadRecordDtos,
  loadCareDtos,
} = require('./assets.service');
const {
  resolveHomeCloudCapabilities,
  assertHomeCloudCapability,
} = require('../lib/homecloudCapabilities');
const {
  resolveAssetsCapabilities,
  assertAssetsCapability,
} = require('../lib/assetsCapabilities');
const {
  listContentStates,
  getContentState,
} = require('./homecloudContentStates.service');

/** The three owner kinds. There is NO polymorphic owner table. */
const FILE_OWNER_TYPES = Object.freeze(['asset', 'record', 'care']);

/**
 * Owner kind -> physical storage.
 *
 * `relationTable` is the Assets-owned relation table.
 * `ownerColumn` is the owner id column inside that table.
 * `ownerTable` is the Assets-owned owner entity.
 * `stateColumn` is the column that carries the owner lifecycle:
 *   - Asset: lifecycle_status (ACTIVE | INACTIVE | ARCHIVED | TRASH)
 *   - Record/Care: status (ACTIVE | REMOVED). REMOVED is the record-level
 *     equivalent of TRASH: it freezes writes.
 */
const FILE_OWNER_SPECS = Object.freeze({
  asset: {
    relationTable: 'assets_asset_files',
    ownerColumn: 'asset_id',
    ownerTable: 'assets',
    stateColumn: 'lifecycle_status',
  },
  record: {
    relationTable: 'assets_record_files',
    ownerColumn: 'record_id',
    ownerTable: 'assets_records',
    stateColumn: 'status',
  },
  care: {
    relationTable: 'assets_care_files',
    ownerColumn: 'care_id',
    ownerTable: 'assets_care',
    stateColumn: 'status',
  },
});

/** Canonical textual UUID form. */
const UUID_PATTERN =
  /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/;

/**
 * The Assets file state set. Authoritative, closed, and NEVER extended:
 *   available -> the File is ACTIVE in HomeCloud
 *   trashed   -> the File is in the HomeCloud trash
 *   purging   -> the File is being purged
 *   missing   -> the File no longer exists (purged) or is not attachable
 */
const ASSET_FILE_STATES = Object.freeze(['available', 'trashed', 'purging', 'missing']);

// ── Validation ────────────────────────────────────────────────────────────────

function assertBodyFields(body, allowedFields) {
  for (const key of Object.keys(body)) {
    if (!allowedFields.includes(key)) {
      throw createHttpError(
        400,
        `Campo no aceptado: ${key}.`,
        'assets_invalid_body_fields',
        { allowed_fields: allowedFields },
      );
    }
  }
}

function assertValidFileOwnerType(value) {
  if (typeof value !== 'string' || !FILE_OWNER_TYPES.includes(value)) {
    throw createHttpError(
      400,
      `owner_type inválido. Debe ser uno de: ${FILE_OWNER_TYPES.join(', ')}.`,
      'assets_invalid_file_owner_type',
      { allowed_owner_types: FILE_OWNER_TYPES },
    );
  }
  return value;
}

function assertValidUuid(value, errorCode, message) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw createHttpError(400, message, errorCode);
  }
  return value.trim().replace(/^\{|\}$/g, '').toLowerCase();
}

// ── State projection ──────────────────────────────────────────────────────────

/**
 * Map the canonical HomeCloud lifecycle onto the Assets file state set.
 *
 *   active   -> available
 *   trashed  -> trashed
 *   purging  -> purging
 *   missing  -> missing   (the File was purged: the relation is a tombstone)
 *
 * A `staging` File is NOT an attachable File: it has no canonical binary yet
 * and the viewer must never open it. Because the Assets state set is closed,
 * staging is reported conservatively as `missing` (file=null) instead of
 * inventing a fifth state.
 */
function mapHomeCloudStateToAssetState(contentState) {
  if (!contentState || contentState.exists !== true) return 'missing';
  if (contentState.lifecycle === 'active') return 'available';
  if (contentState.lifecycle === 'trashed') return 'trashed';
  if (contentState.lifecycle === 'purging') return 'purging';
  return 'missing';
}

/**
 * Project the LIVE HomeCloud metadata of a File.
 *
 * The relation row never stores this; it is read from HomeCloud every time,
 * so a rename or a metadata change in HomeCloud is visible in Assets after a
 * refresh WITHOUT touching the relation row.
 */
function mapFileProjection(contentState) {
  if (!contentState || contentState.exists !== true) return null;
  if (mapHomeCloudStateToAssetState(contentState) === 'missing') return null;
  return {
    id: contentState.id,
    display_name: contentState.display_name ?? null,
    mime_type: contentState.mime_type ?? null,
    extension: contentState.extension ?? null,
    size_bytes: contentState.size_bytes ?? null,
    document_date: contentState.document_date ?? null,
  };
}

/**
 * Project one relation row into the canonical Assets file DTO.
 *
 * `ownerContext` is a READ projection: it says WHO owns the relation so the
 * aggregated view can label it. It is NEVER persisted and it NEVER changes
 * the ownership of the relation.
 */
function mapRelationRowToDto(row, ownerType, ownerId, contentState, ownerContext = null) {
  const state = mapHomeCloudStateToAssetState(contentState);
  return {
    relation_id: row.id,
    owner_type: ownerType,
    owner_id: ownerId,
    file_id: row.file_id,
    state,
    file: mapFileProjection(contentState),
    owner_context: ownerContext ?? defaultOwnerContext(ownerType, ownerId),
  };
}

/**
 * The owner context of a DIRECT Asset relation.
 */
function defaultOwnerContext(ownerType, ownerId) {
  if (ownerType === 'asset') return { type: 'asset', asset_id: ownerId };
  if (ownerType === 'record') return { type: 'record', record_id: ownerId };
  return { type: 'care', care_id: ownerId };
}

/**
 * The owner context of a Record relation (canonical Record projection).
 *
 * The Record MUST belong to the Asset: the caller never supplies an owner id
 * here — the ids are derived from the Asset's own links.
 */
function recordOwnerContext(dto) {
  if (!dto) return null;
  return {
    type: 'record',
    record_id: dto.id,
    record_type: dto.type ?? null,
    record_title: dto.title ?? null,
    record_label: dto.title ?? null,
    record_issuer: dto.issuer ?? null,
    record_status: dto.status ?? null,
  };
}

/**
 * The owner context of a Care relation (canonical Care projection).
 */
function careOwnerContext(dto) {
  if (!dto) return null;
  return {
    type: 'care',
    care_id: dto.id,
    care_description: dto.description ?? null,
    care_label: truncateLabel(dto.description ?? null),
    care_date_label: careDateLabel(dto),
    care_status: dto.status ?? null,
  };
}

const MAX_LABEL_LENGTH = 120;

function truncateLabel(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return trimmed.length > MAX_LABEL_LENGTH
    ? `${trimmed.slice(0, MAX_LABEL_LENGTH - 1)}…`
    : trimmed;
}

/**
 * The human date label of a Care, built ONLY from the canonical projection.
 */
function careDateLabel(dto) {
  const precision = dto?.date_precision;
  if (precision === 'exact' && dto.occurred_on) return String(dto.occurred_on);
  if (precision === 'month_year' && dto.occurred_year) {
    return dto.occurred_month
      ? `${String(dto.occurred_month).padStart(2, '0')}/${dto.occurred_year}`
      : String(dto.occurred_year);
  }
  if (precision === 'year' && dto.occurred_year) return String(dto.occurred_year);
  return null;
}

// ── Owner resolution ──────────────────────────────────────────────────────────

/**
 * Resolve the owner entity inside the caller's Household.
 *
 * Unknown id and other-Household id answer the SAME 404 (no disclosure).
 */
async function resolveFileOwner(context, ownerType, ownerId) {
  const spec = FILE_OWNER_SPECS[ownerType];
  const { data, error } = await supabaseAdmin
    .from(spec.ownerTable)
    .select(`id, household_id, ${spec.stateColumn}`)
    .eq('id', ownerId)
    .eq('household_id', context.householdId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, 'No se pudo leer el propietario del archivo.', 'assets_file_owner_lookup_failed');
  }
  if (!data) {
    throw createHttpError(404, 'No se encontró el elemento.', 'assets_file_owner_not_found');
  }
  return { ...data, ownerState: data[spec.stateColumn] };
}

/**
 * Owner lifecycle gate for ATTACHING a File.
 *
 *   Asset ACTIVE / INACTIVE -> ALLOW
 *   Asset ARCHIVED           -> BLOCK (409 assets_file_attach_not_allowed)
 *   Asset TRASH              -> BLOCK (409 assets_file_attach_not_allowed)
 *   Record/Care ACTIVE       -> ALLOW
 *   Record/Care REMOVED      -> BLOCK (409 assets_file_attach_not_allowed)
 *
 * Existing relations stay readable in every owner state.
 */
function assertFileAttachAllowed(ownerType, ownerState) {
  if (ownerType === 'asset') {
    if (ownerState === 'ACTIVE' || ownerState === 'INACTIVE') return;
  } else if (ownerState === 'ACTIVE') {
    return;
  }
  throw createHttpError(
    409,
    'No se puede adjuntar un archivo en este estado.',
    'assets_file_attach_not_allowed',
    { owner_state: ownerState ?? null },
  );
}

/**
 * Owner lifecycle gate for DETACHING a File (the relation only).
 *
 *   Asset ACTIVE / INACTIVE / ARCHIVED -> ALLOW
 *   Asset TRASH                        -> BLOCK (409 assets_file_unlink_not_allowed)
 *   Record/Care ACTIVE                 -> ALLOW
 *   Record/Care REMOVED                -> BLOCK (409 assets_file_unlink_not_allowed)
 *
 * Viewing the existing relations of a TRASH owner stays ALLOWED.
 */
function assertFileUnlinkAllowed(ownerType, ownerState) {
  if (ownerType === 'asset') {
    if (ownerState === 'ACTIVE' || ownerState === 'INACTIVE' || ownerState === 'ARCHIVED') return;
  } else if (ownerState === 'ACTIVE') {
    return;
  }
  throw createHttpError(
    409,
    'No se puede quitar un archivo en este estado.',
    'assets_file_unlink_not_allowed',
    { owner_state: ownerState ?? null },
  );
}

// ── Capabilities ──────────────────────────────────────────────────────────────

/**
 * Require homecloud.view for the caller's context.
 *
 * The Assets domain does NOT own the HomeCloud capability catalogue: it
 * consumes the canonical HomeCloud projection. A caller without homecloud.view
 * can neither see nor attach any File.
 */
function assertHomeCloudView(context) {
  const capabilities = resolveHomeCloudCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertHomeCloudCapability(capabilities, 'homecloud.view');
  return capabilities;
}

// ── Idempotency ───────────────────────────────────────────────────────────────

/**
 * Run a file mutation under the canonical Assets idempotency contract.
 *
 * The reserve/complete primitives are the SAME ones the Assets Core uses
 * (public.reserve_assets_idempotency_key / public.complete_assets_idempotency_key
 * over public.assets_idempotency_keys): no second store, no second hash.
 *
 * The only difference from the Assets Core helper is that the success status
 * is decided by the mutation itself (201 for a new relation, 200 for a
 * duplicate), so the stored answer always matches what the client saw.
 */
async function withFilesIdempotency(context, { idempotencyKey, operation, requestHash, req }, mutationFn) {
  const reservation = await reserveAssetsIdempotency(context, { idempotencyKey, operation, requestHash });

  if (reservation?.status === 'replay') {
    return { status: reservation.response_status, body: reservation.response_body, replay: true };
  }
  if (reservation?.status === 'in_flight') {
    throw createIdempotencyInFlightError();
  }

  let body;
  let responseStatus;
  try {
    const outcome = await mutationFn();
    responseStatus = outcome.status;
    body = outcome.body;
  } catch (error) {
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      const envelope = buildApiErrorEnvelope(error, req).envelope;
      await completeAssetsIdempotency(context, { idempotencyKey, operation }, error.statusCode, envelope);
      throw error;
    }
    throw error;
  }

  await completeAssetsIdempotency(context, { idempotencyKey, operation }, responseStatus, body);
  return { status: responseStatus, body };
}

// ── Link ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/assets/files/link — attach an existing HomeCloud File.
 *
 * Body: { owner_type: 'asset'|'record'|'care', owner_id: uuid, file_id: uuid }
 * Header: Idempotency-Key (REQUIRED).
 *
 * Validation order (frozen):
 *   1. body shape            6. owner lifecycle
 *   2. owner_type            7. assets.contribute
 *   3. UUIDs                 8. homecloud.view
 *   4. active household      9. validate the File through HomeCloud
 *   5. resolve owner         10. create the relation
 *
 * Outcomes:
 *   - new relation                  -> 201 { relation, duplicate: false }
 *   - already active (NEW key)      -> 200 { relation, duplicate: true }
 *   - same key + same payload       -> replay of the stored answer
 *   - same key + different payload  -> 409 idempotency_conflict
 *   - active lease                  -> 409 idempotency_in_flight
 */
async function linkAssetFile(req, body = {}) {
  // 1. body shape
  assertBodyFields(body, ['owner_type', 'owner_id', 'file_id']);

  // 2. owner_type
  const ownerType = assertValidFileOwnerType(body.owner_type);

  // 3. UUIDs
  const ownerId = assertValidUuid(body.owner_id, 'assets_invalid_file_owner_id', 'owner_id inválido.');
  const fileId = assertValidUuid(body.file_id, 'assets_invalid_file_id', 'file_id inválido.');

  // 4. active household (server-derived; the client never chooses it)
  const context = await resolveAssetsContext(req);

  // 5. resolve owner by id + household (unknown and cross-household are the same 404)
  const owner = await resolveFileOwner(context, ownerType, ownerId);

  // 6. owner lifecycle
  assertFileAttachAllowed(ownerType, owner.ownerState);

  // 7. assets.contribute
  assertAssetsContribute(context);

  // 8. homecloud.view
  assertHomeCloudView(context);

  // 9. validate the File through the canonical HomeCloud authority
  const contentState = await getContentState({ householdId: context.householdId, contentId: fileId });
  if (!contentState.exists) {
    // Another household's File answers exactly like a nonexistent File.
    throw createHttpError(404, 'Archivo no encontrado.', 'homecloud_content_not_found');
  }
  if (contentState.lifecycle !== 'active') {
    throw createHttpError(
      409,
      'El archivo no está disponible en HomeCloud.',
      'homecloud_content_not_active',
      { lifecycle: contentState.lifecycle ?? null },
    );
  }

  const idempotencyKey = requireIdempotencyKey(req);
  const operation = 'assets.file.link';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    owner_type: ownerType,
    owner_id: ownerId,
    file_id: fileId,
  });

  const spec = FILE_OWNER_SPECS[ownerType];

  return withFilesIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    async () => {
      // 10. create the relation (never a second active row for the same pair)
      const { data: existing, error: existingError } = await supabaseAdmin
        .from(spec.relationTable)
        .select('id, file_id, household_id, created_at')
        .eq(spec.ownerColumn, ownerId)
        .eq('household_id', context.householdId)
        .eq('file_id', fileId)
        .is('removed_at', null)
        .maybeSingle();

      if (existingError) {
        throw createHttpError(500, 'No se pudo leer la relación del archivo.', 'assets_file_link_failed');
      }
      if (existing) {
        return {
          status: 200,
          body: {
            relation: mapRelationRowToDto(existing, ownerType, ownerId, contentState),
            duplicate: true,
          },
        };
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from(spec.relationTable)
        .insert({
          household_id: context.householdId,
          [spec.ownerColumn]: ownerId,
          file_id: fileId,
          created_by_member_id: context.membershipId,
        })
        .select('id, file_id, household_id, created_at')
        .single();

      if (insertError) {
        // A concurrent identical attach won the race: the partial unique index
        // says there is only ONE active relation per (owner, file).
        if (insertError.code === '23505') {
          const { data: raced } = await supabaseAdmin
            .from(spec.relationTable)
            .select('id, file_id, household_id, created_at')
            .eq(spec.ownerColumn, ownerId)
            .eq('household_id', context.householdId)
            .eq('file_id', fileId)
            .is('removed_at', null)
            .maybeSingle();
          if (raced) {
            return {
              status: 200,
              body: {
                relation: mapRelationRowToDto(raced, ownerType, ownerId, contentState),
                duplicate: true,
              },
            };
          }
        }
        throw createHttpError(500, 'No se pudo adjuntar el archivo.', 'assets_file_link_failed');
      }

      return {
        status: 201,
        body: {
          relation: mapRelationRowToDto(inserted, ownerType, ownerId, contentState),
          duplicate: false,
        },
      };
    },
  );
}

// ── Unlink ────────────────────────────────────────────────────────────────────

/**
 * POST /api/assets/files/unlink — detach a File from an owner.
 *
 * Body: { owner_type, owner_id, file_id }
 * Header: Idempotency-Key (REQUIRED).
 *
 * UNLINK IS ONLY ABOUT THE RELATION:
 *   - it sets removed_at + removed_by_member_id,
 *   - it NEVER deletes, trashes or purges the HomeCloud File,
 *   - it NEVER deletes the owner and NEVER cascades anything.
 *
 * Outcomes:
 *   - active relation removed   -> 200 { relation, already_removed: false }
 *   - already removed / none    -> 200 { relation: null|historical, already_removed: true }
 *     (a repeated unlink is NEVER a 404)
 */
async function unlinkAssetFile(req, body = {}) {
  assertBodyFields(body, ['owner_type', 'owner_id', 'file_id']);

  const ownerType = assertValidFileOwnerType(body.owner_type);
  const ownerId = assertValidUuid(body.owner_id, 'assets_invalid_file_owner_id', 'owner_id inválido.');
  const fileId = assertValidUuid(body.file_id, 'assets_invalid_file_id', 'file_id inválido.');

  const context = await resolveAssetsContext(req);
  const owner = await resolveFileOwner(context, ownerType, ownerId);

  // Owner lifecycle: TRASH freezes writes.
  assertFileUnlinkAllowed(ownerType, owner.ownerState);

  assertAssetsContribute(context);
  assertHomeCloudView(context);

  const idempotencyKey = requireIdempotencyKey(req);
  const operation = 'assets.file.unlink';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    owner_type: ownerType,
    owner_id: ownerId,
    file_id: fileId,
  });

  const spec = FILE_OWNER_SPECS[ownerType];

  return withFilesIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    async () => {
      const contentState = await getContentState({ householdId: context.householdId, contentId: fileId });

      const { data: active, error: activeError } = await supabaseAdmin
        .from(spec.relationTable)
        .select('id, file_id, household_id, created_at, removed_at')
        .eq(spec.ownerColumn, ownerId)
        .eq('household_id', context.householdId)
        .eq('file_id', fileId)
        .is('removed_at', null)
        .maybeSingle();

      if (activeError) {
        throw createHttpError(500, 'No se pudo leer la relación del archivo.', 'assets_file_unlink_failed');
      }

      if (!active) {
        // Nothing active: the relation was already removed (or never existed).
        // A repeated unlink is idempotent, never a 404.
        const { data: historical } = await supabaseAdmin
          .from(spec.relationTable)
          .select('id, file_id, household_id, created_at, removed_at')
          .eq(spec.ownerColumn, ownerId)
          .eq('household_id', context.householdId)
          .eq('file_id', fileId)
          .not('removed_at', 'is', null)
          .order('removed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          status: 200,
          body: {
            relation: historical ? mapRelationRowToDto(historical, ownerType, ownerId, contentState) : null,
            already_removed: true,
          },
        };
      }

      const removedAt = new Date().toISOString();
      const { data: updated, error: updateError } = await supabaseAdmin
        .from(spec.relationTable)
        .update({ removed_at: removedAt, removed_by_member_id: context.membershipId })
        .eq('id', active.id)
        .is('removed_at', null)
        .select('id, file_id, household_id, created_at, removed_at')
        .maybeSingle();

      if (updateError) {
        throw createHttpError(500, 'No se pudo quitar el archivo.', 'assets_file_unlink_failed');
      }

      return {
        status: 200,
        body: {
          relation: mapRelationRowToDto(updated ?? active, ownerType, ownerId, contentState),
          already_removed: false,
        },
      };
    },
  );
}

// ── Read model ────────────────────────────────────────────────────────────────

/**
 * GET the Files attached to one owner.
 *
 * Capability: assets.view AND homecloud.view.
 * Cross-Household owner: the same nondisclosure 404 as an unknown owner.
 * The response is never cached (server: no-store; client: 30 s Assets cache).
 */
async function listOwnerFiles(req, ownerType, ownerId) {
  const context = await contextWithCapability(req, 'assets.view');
  assertHomeCloudView(context);

  const spec = FILE_OWNER_SPECS[ownerType];
  const owner = await resolveFileOwner(context, ownerType, ownerId);

  const { data: rows, error } = await supabaseAdmin
    .from(spec.relationTable)
    .select('id, file_id, household_id, created_at, removed_at')
    .eq(spec.ownerColumn, owner.id)
    .eq('household_id', context.householdId)
    .is('removed_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw createHttpError(500, 'No se pudieron leer los archivos.', 'assets_file_list_failed');
  }

  const relations = rows ?? [];
  const fileIds = relations.map((row) => row.file_id);
  const states = await listContentStates({ householdId: context.householdId, ids: fileIds });
  const stateById = new Map(states.map((state) => [String(state.id).toLowerCase(), state]));

  const files = relations.map((row) =>
    mapRelationRowToDto(
      row,
      ownerType,
      owner.id,
      stateById.get(String(row.file_id).toLowerCase()),
    ),
  );

  return { files };
}

// ── Aggregation (S9) ──────────────────────────────────────────────────────────

/**
 * The aggregation scopes of the Asset file read model.
 *
 *   direct -> ONLY the Files attached to the Asset itself (the default, and
 *             the exact behaviour frozen by S8).
 *   all    -> the UNION of the direct Files and the Files owned by the
 *             Records and the Care of THAT Asset.
 */
const FILE_INCLUDE_SCOPES = Object.freeze(['direct', 'all']);

/**
 * Normalize the `include` query parameter.
 *
 * An unknown scope is a typed 400: a silent fallback would answer a DIFFERENT
 * question than the caller asked.
 */
function normalizeFileInclude(value) {
  if (value === undefined || value === null || value === '') return 'direct';
  if (typeof value !== 'string' || !FILE_INCLUDE_SCOPES.includes(value)) {
    throw createHttpError(
      400,
      `include inválido. Debe ser uno de: ${FILE_INCLUDE_SCOPES.join(', ')}.`,
      'assets_invalid_file_include',
      { allowed_include: FILE_INCLUDE_SCOPES },
    );
  }
  return value;
}

/**
 * Read the active relation rows of one table for a set of owners.
 */
async function readOwnerRelations(relationTable, ownerColumn, ownerIds, householdId) {
  if (!ownerIds || ownerIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from(relationTable)
    .select(`id, file_id, household_id, created_at, removed_at, ${ownerColumn}`)
    .in(ownerColumn, ownerIds)
    .eq('household_id', householdId)
    .is('removed_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw createHttpError(500, 'No se pudieron leer los archivos.', 'assets_file_list_failed');
  }
  return data ?? [];
}

/**
 * The Records that are CURRENTLY linked to this Asset.
 *
 * The ids are DERIVED from the Asset's own links: the caller never supplies
 * an owner id, so a Record of another Asset (or of another Household) can
 * never be pulled into the aggregation.
 */
async function readLinkedRecordIds(householdId, assetId) {
  const { data, error } = await supabaseAdmin
    .from('assets_record_links')
    .select('record_id')
    .eq('asset_id', assetId)
    .eq('household_id', householdId)
    .is('ended_at', null);

  if (error) {
    throw createHttpError(500, 'No se pudieron leer los archivos.', 'assets_file_list_failed');
  }
  return [...new Set((data ?? []).map((row) => row.record_id))];
}

/**
 * The Care that belongs to this Asset.
 *
 * `assets_care.asset_id` IS the ownership: the Care is owned by the Asset.
 */
async function readAssetCareIds(householdId, assetId) {
  const { data, error } = await supabaseAdmin
    .from('assets_care')
    .select('id')
    .eq('asset_id', assetId)
    .eq('household_id', householdId);

  if (error) {
    throw createHttpError(500, 'No se pudieron leer los archivos.', 'assets_file_list_failed');
  }
  return (data ?? []).map((row) => row.id);
}

/**
 * GET /api/assets/:assetId/files — the Files of ONE Asset.
 *
 * include=direct (DEFAULT): the Files attached to the Asset itself.
 * include=all: the UNION of the direct Files and the Files owned by the
 * Records and the Care of THAT Asset.
 *
 * The aggregation NEVER changes the ownership of a relation: a Record file
 * keeps its Record owner and a Care file keeps its Care owner. The
 * `owner_context` field is a READ projection of that ownership (it says who
 * owns it so the UI can label it) and it is NEVER persisted.
 *
 * Capability: assets.view AND homecloud.view.
 * Cross-Household Asset: the same nondisclosure 404 as an unknown Asset.
 */
async function listAssetFilesForAsset(req, assetId, include) {
  const scope = normalizeFileInclude(include);
  if (scope === 'direct') {
    return listOwnerFiles(req, 'asset', assetId);
  }

  const context = await contextWithCapability(req, 'assets.view');
  assertHomeCloudView(context);

  const owner = await resolveFileOwner(context, 'asset', assetId);

  const [recordIds, careIds] = await Promise.all([
    readLinkedRecordIds(context.householdId, owner.id),
    readAssetCareIds(context.householdId, owner.id),
  ]);

  const [directRows, recordRows, careRows] = await Promise.all([
    readOwnerRelations('assets_asset_files', 'asset_id', [owner.id], context.householdId),
    readOwnerRelations('assets_record_files', 'record_id', recordIds, context.householdId),
    readOwnerRelations('assets_care_files', 'care_id', careIds, context.householdId),
  ]);

  // The canonical projections of the owners. REMOVED owners are included on
  // purpose: their relation is still active and the File is still there.
  const [recordDtos, careDtos] = await Promise.all([
    loadRecordDtos(context, recordIds, { includeRemoved: true }),
    loadCareDtos(context, careIds, { includeRemoved: true }),
  ]);

  const relations = [
    ...directRows.map((row) => ({
      row,
      ownerType: 'asset',
      ownerId: owner.id,
      ownerContext: defaultOwnerContext('asset', owner.id),
    })),
    ...recordRows.map((row) => ({
      row,
      ownerType: 'record',
      ownerId: row.record_id,
      ownerContext: recordOwnerContext(recordDtos.get(row.record_id)),
    })),
    ...careRows.map((row) => ({
      row,
      ownerType: 'care',
      ownerId: row.care_id,
      ownerContext: careOwnerContext(careDtos.get(row.care_id)),
    })),
  ];

  const fileIds = relations.map((entry) => entry.row.file_id);
  const states = await listContentStates({ householdId: context.householdId, ids: fileIds });
  const stateById = new Map(states.map((state) => [String(state.id).toLowerCase(), state]));

  const files = relations.map((entry) =>
    mapRelationRowToDto(
      entry.row,
      entry.ownerType,
      entry.ownerId,
      stateById.get(String(entry.row.file_id).toLowerCase()),
      entry.ownerContext,
    ),
  );

  return { files };
}

// ── Assets capability helpers ─────────────────────────────────────────────────

/**
 * Require assets.contribute for a file mutation.
 *
 * The Assets catalogue is the canonical one (lib/assetsCapabilities.js) and the
 * HomeCloud catalogue is consumed as-is. No third capability system exists.
 */
function assertAssetsContribute(context) {
  const capabilities = resolveAssetsCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertAssetsCapability(capabilities, 'assets.contribute');
  return capabilities;
}

module.exports = {
  FILE_OWNER_TYPES,
  FILE_INCLUDE_SCOPES,
  ASSET_FILE_STATES,
  mapHomeCloudStateToAssetState,
  linkAssetFile,
  unlinkAssetFile,
  listOwnerFiles,
  listAssetFilesForAsset,
};
