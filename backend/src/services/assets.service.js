'use strict';

/**
 * HOMePLUS Assets — A3.1 Canonical Asset API (service).
 *
 * Authority: HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0 §5-§8, §28, §43, §53, §56.
 *
 * Scope of this slice: Asset create / list / get / Name-edit (A3.1), the
 * three independent context dimensions (A3.2) and the canonical Profile
 * change with its structural integrity rules (A3.3):
 *   - Responsible 0..1 Household Member (§9, PATCH /responsible).
 *   - Holder 0..1 Household Member OR external party label (§10, PATCH
 *     /holder). External labels create no identity of any kind.
 *   - Placement 0..1: Property Asset + optional detail XOR free-text place
 *     (§11, PATCH /placement). No Presence relation exists.
 *   - Each dimension changes/clears independently; concurrency is evaluated
 *     per dimension (§56): every write is ONE atomic update conditioned on
 *     the current value of that dimension, so independent concurrent edits
 *     coexist and same-dimension stale writes answer a typed 409.
 *   - PROPERTY Assets keep Responsible but reject Holder and Placement
 *     (§12, INV2-AST-019).
 *   - New operational context writes only on ACTIVE/INACTIVE; ARCHIVED and
 *     TRASH freeze the current context (§33, §37).
 *   - Create requires Name + System Profile (§8, INV2-AST-090).
 *   - Initial lifecycle is always ACTIVE (§30).
 *   - Household is ALWAYS derived from the authenticated context, never from
 *     the body (§24, INV2-AST-002, §59).
 *   - Normal list corpus is ACTIVE + INACTIVE; ARCHIVED and TRASH are only
 *     reachable through an explicit scope (§28, INV2-AST-094).
 *   - Cross-Household ids answer with the SAME 404 as unknown ids so the
 *     existence of another Household's Assets is never disclosed (§45).
 *   - Create is idempotent by Idempotency-Key (§53, UC2-AST-092).
 *   - Name edits are guarded by atomic optimistic concurrency on updated_at
 *     so a stale write never silently overwrites newer truth (§56,
 *     UC2-AST-095, INV2-AST-080).
 *   - A3.3 Profile change (§6, §12, §33, §37, §40, §43, §56, §57):
 *     PATCH /api/assets/:assetId/profile requires assets.manage
 *     (CONTRIBUTE alone is never enough), an explicit expected_profile
 *     (same-dimension conflict, never last-write-wins) and is executed by
 *     the change_asset_profile RPC so validation and write are ONE atomic
 *     transaction on the locked row. ARCHIVED/TRASH never accept it. To
 *     PROPERTY requires the operational Holder/Placement to be resolved
 *     explicitly first (nothing is silently cleared). From PROPERTY
 *     requires every operational dependent Placement to be reconciled
 *     explicitly first (dependent lifecycle is never cascaded, §40,
 *     INV2-AST-068) and is revalidated in the same commit that writes.
 *   - A5.1 Manual Care (§17, §18, §42, §43): POST /api/assets/care
 *     creates ONE manual Care fact on exactly ONE owner Asset with an
 *     honest date precision (exact / month_year / year / unknown: a day
 *     is never invented, §18, UC2-AST-032), optional provider and
 *     notes. Requires assets.contribute and an Idempotency-Key. TRASH
 *     owners reject NEW Care (§37); ARCHIVED owners keep accepting
 *     historical evidence (§33, §42). Care is a factual PAST event:
 *     known future dates answer a typed 400. Correction
 *     (PATCH /api/assets/care/:careId) edits the same row with
 *     expected_updated_at concurrency (never last-write-wins, §56) and
 *     never duplicates the fact. Only MANUAL Care exists in this slice;
 *     the DERIVED_PLANNER origin is reserved for a future slice and is
 *     unwritable (§19). Remove/Restore is A5.2 and is NOT implemented
 *     here: the persistence already carries the status/removed_at/
 *     restored_at preparation so A5.2 will be a status flip, never a
 *     schema change (§42).
 *   - A6.1 Identity & Categories (§6, §7, §8, §13, §28, §33, §37):
 *     PATCH /api/assets/:assetId/identity edits the optional identity
 *     dimension (brand / model / serial_number / profile-scoped
 *     identifiers) as ONE atomic update conditioned on the current
 *     identity values, so it never overwrites Responsible/Holder/
 *     Placement and independent edits coexist (§13, §56,
 *     UC2-AST-004/005/014/094). Categories are optional 0..1,
 *     Household-scoped, system-suggested or custom (§7, INV2-AST-008):
 *     GET /api/assets/categories lists the household catalog,
 *     POST creates (or resolves) one name, DELETE removes one row while
 *     referencing Assets resolve to uncategorized (SET NULL, no
 *     corruption), and PATCH /api/assets/:assetId/category
 *     assigns/changes/clears with per-dimension concurrency. Identity
 *     and Category write on ACTIVE/INACTIVE normally and on ARCHIVED as
 *     historical enrichment (§33, UC2-AST-066/110); TRASH rejects every
 *     new write (§37). The structural Profile MANAGE endpoint of A3.3 is
 *     intact: brand/model/serial/category survive it, while specialized
 *     identifiers the target profile does not contemplate block it until
 *     explicitly cleared (UC2-AST-006/007). Requires assets.contribute
 *     for ordinary identity/category edits (§43); VIEW for reads.
 *
 * Architecture: backend-only. All Asset persistence goes through the service
 * role client; the RLS layer on public.assets has no client policies at all,
 * so no client can bypass this authority through Supabase directly.
 *
 * NOT in this slice: Replacement (removed from the roadmap by user
 * decision; Freeze V2 §39 discrepancy recorded, Product Truth NOT
 * edited), permanent purge (outside Core, INV2-AST-074), derived Care
 * from Planner (§19), Files/Finance/Planner relations of Care, Presence
 * relations, member-invalidation auto-unset (deferred global mechanism:
 * the read side marks invalid members as valid:false instead).
 * Archive/Unarchive is implemented in the A6.2 section and recoverable
 * Trash/Restore of Assets in the A6.3 section below (§37-§38, §40).
 */

const crypto = require('crypto');

const { supabaseAdmin, createSupabaseForToken } = require('../config/supabase');
const { createHttpError, buildApiErrorEnvelope } = require('../lib/httpErrors');
const {
  requireIdempotencyKey,
  parseIdempotencyKey,
  CANONICAL_ERROR_CODES,
  createIdempotencyConflictError,
  createIdempotencyInFlightError,
} = require('../lib/mutationContracts');
const {
  resolveAssetsCapabilities,
  assertAssetsCapability,
} = require('../lib/assetsCapabilities');

const ASSET_PROFILES = Object.freeze(['STANDARD', 'VEHICLE', 'PET', 'PROPERTY']);
const LIST_SCOPES = Object.freeze(['normal', 'archived', 'trash']);
const SCOPE_LIFECYCLE = Object.freeze({
  normal: ['ACTIVE', 'INACTIVE'],
  archived: ['ARCHIVED'],
  trash: ['TRASH'],
});

// A6.2 operational lifecycle (§30-§36). ACTIVE<->INACTIVE is ordinary
// operation (CONTRIBUTE); ARCHIVED is history outside normal operation
// (MANAGE). TRASH transitions belong to A6.3, never to this slice.
const OPERATIONAL_LIFECYCLE = Object.freeze(['ACTIVE', 'INACTIVE']);
// A6.3 recoverable Trash (§37, §38): every lifecycle state may enter
// TRASH; Restore returns to trashed_from exactly, never a fallback.
const TRASHABLE_LIFECYCLE = Object.freeze(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
const ARCHIVE_DISPOSITIONS = Object.freeze([
  'SOLD',
  'GIFTED',
  'DISPOSED',
  'LOST',
  'STOLEN',
  'REPLACED',
  'DECEASED',
  'OTHER',
]);
const DISPOSITION_NOTE_MAX_LENGTH = 500;

// A3.2 (§30-§33, §37): only ACTIVE and INACTIVE accept NEW operational
// context writes. ARCHIVED/TRASH freeze the current context (the read side
// keeps presenting the last known values).
const CONTEXT_EDITABLE_LIFECYCLE = Object.freeze(['ACTIVE', 'INACTIVE']);

const CONTEXT_LABEL_MAX_LENGTH = 200;

const ASSET_FIELDS = [
  'id',
  'household_id',
  'name',
  'profile',
  'lifecycle_status',
  'brand',
  'model',
  'serial_number',
  'identifiers',
  'category_id',
  'responsible_member_id',
  'holder_member_id',
  'holder_external_label',
  'placement_property_asset_id',
  'placement_detail',
  'placement_external_text',
  'archived_from',
  'archived_at',
  'trashed_from',
  'trashed_at',
  'created_at',
  'updated_at',
].join(', ');

// A6.1 identity contract (§6, §8). brand/model/serial_number are
// profile-agnostic optional metadata. identifiers carries ONLY the
// specialized keys the asset's System Profile contemplates — never a
// general custom-fields engine (§73 explicitly NOT Core V2).
const IDENTITY_TEXT_MAX = Object.freeze({ brand: 120, model: 120, serial_number: 200 });
const IDENTIFIER_VALUE_MAX_LENGTH = 120;
const IDENTITY_ALLOWED_KEYS = Object.freeze({
  STANDARD: [],
  VEHICLE: ['plate', 'vin'],
  PET: ['microchip', 'species', 'breed'],
  PROPERTY: ['cadastral_ref', 'address_text'],
});
const IDENTIFIER_FORMATS = Object.freeze({
  plate: /^[A-Z0-9][A-Z0-9 -]{0,11}$/,
  vin: /^[A-HJ-NPR-Z0-9]{17}$/,
  microchip: /^[0-9]{9,20}$/,
});
const UPPERCASE_IDENTIFIERS = Object.freeze(['plate', 'vin']);

// A6.1 category contract (§7). The suggested catalog is a backend
// constant; rows are materialized per Household on first use with
// kind='system'. Custom names are stored with kind='custom'. Both kinds
// behave identically once stored: they only organize (INV2-AST-008).
const SUGGESTED_ASSET_CATEGORIES = Object.freeze([
  'Cocina',
  'Hogar',
  'Electrónica',
  'Muebles',
  'Herramientas',
  'Jardín',
  'Documentos',
  'Vehículos',
  'Mascotas',
  'Deporte y ocio',
]);
const CATEGORY_NAME_MAX_LENGTH = 80;

// A6.1 lifecycle stance for identity/category (§33, §37, UC2-AST-066/110):
// factual metadata, not operational context. ARCHIVED accepts it as
// historical enrichment; TRASH rejects every new write.
const IDENTITY_EDITABLE_LIFECYCLE = Object.freeze(['ACTIVE', 'INACTIVE', 'ARCHIVED']);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Postgres LIKE metacharacters: the two wildcards plus the default escape
// char. Search text is USER DATA: it is encoded as a literal substring, never
// as SQL/PostgREST syntax (same technique as the HomeCloud search encoder).
const LIKE_METACHARACTERS = /[\\%_]/g;

function literalContainsPattern(search) {
  const escaped = String(search).replace(LIKE_METACHARACTERS, (character) => `\\${character}`);
  return `%${escaped}%`;
}

function normalizeSearchTerm(search) {
  return String(search)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// BG-01 (Premium Target V0.3 §7/§11): Root search must find by name,
// person or place — never name-only. Minimal safe server-side extension:
//   - name / holder external label / placement text columns via ilike;
//   - members (responsible/holder) resolved through people.display_name;
//   - the caller's Household boundary is applied to EVERY branch.
// The `or` filter language cannot contain raw commas or parens inside values,
// so those are neutralized here. Backslashes are NOT touched: they carry the
// LIKE metacharacter escapes produced by literalContainsPattern (PostgREST
// or-grammar decodes \\ to \, and SQL ilike then reads \% and \_ as literals).
function sanitizeFilterTerm(term) {
  return String(term).replace(/[,()]/g, ' ').trim();
}

async function resolveAssetsSearchMemberIds(context, rawTerm) {
  const normalizedTerm = normalizeSearchTerm(rawTerm);
  const { data: peopleRows, error: peopleError } = await supabaseAdmin
    .from('people')
    .select('id, display_name')
    .limit(1000);
  if (peopleError || !peopleRows || peopleRows.length === 0) return [];
  const matchingPeople = peopleRows.filter((row) =>
    normalizeSearchTerm(row.display_name ?? '').includes(normalizedTerm),
  );
  if (matchingPeople.length === 0) return [];
  const personIds = matchingPeople.map((row) => row.id);
  const { data: memberRows, error: memberError } = await supabaseAdmin
    .from('household_members')
    .select('id')
    .eq('household_id', context.householdId)
    .in('person_id', personIds)
    .limit(100);
  if (memberError || !memberRows) return [];
  return memberRows.map((row) => row.id);
}

async function resolveAssetsSearchPropertyIds(context, rawTerm) {
  const normalized = normalizeSearchTerm(rawTerm);
  const likeTerm = sanitizeFilterTerm(literalContainsPattern(normalized));
  const { data: rows, error } = await supabaseAdmin
    .from('assets')
    .select('id')
    .eq('household_id', context.householdId)
    .eq('profile', 'PROPERTY')
    .ilike('name_normalized', likeTerm)
    .limit(100);
  if (error || !rows || rows.length === 0) return [];
  return rows.map((row) => row.id);
}

/**
 * BG-01: resolve people/property ids for the search term (async reads).
 *
 * Kept SEPARATE from applyAssetsSearchFilter on purpose: a PostgrestFilterBuilder
 * is a thenable, so returning it across an `async` boundary would await the
 * query and resolve to the row array instead of the builder. The filter is
 * assembled and returned synchronously by applyAssetsSearchFilter.
 */
async function resolveAssetsSearchIds(context, rawTerm) {
  const [memberIds, propertyIds] = await Promise.all([
    resolveAssetsSearchMemberIds(context, rawTerm),
    resolveAssetsSearchPropertyIds(context, rawTerm),
  ]);
  return { memberIds, propertyIds };
}

function applyAssetsSearchFilter(assetQuery, rawQuery, searchIds) {
  const rawTerm = String(rawQuery).trim();
  if (rawTerm === '') return assetQuery;
  const normalizedTerm = normalizeSearchTerm(rawTerm);
  const likeTerm = sanitizeFilterTerm(literalContainsPattern(normalizedTerm));
  const { memberIds, propertyIds } = searchIds;
  const branches = [
    `name_normalized.ilike.${likeTerm}`,
    `holder_external_label_normalized.ilike.${likeTerm}`,
    `placement_external_text_normalized.ilike.${likeTerm}`,
    `placement_detail_normalized.ilike.${likeTerm}`,
  ];
  if (memberIds.length > 0) {
    const idList = memberIds.join(',');
    branches.push(`responsible_member_id.in.(${idList})`);
    branches.push(`holder_member_id.in.(${idList})`);
  }
  if (propertyIds.length > 0) {
    const idList = propertyIds.join(',');
    branches.push(`placement_property_asset_id.in.(${idList})`);
  }
  return assetQuery.or(branches.join(','));
}

// ── Canonical context (minimal A3.1 resolution; A3.2 owns the full contract) ──

/**
 * Resolve the authenticated caller's canonical Household context.
 *
 * Mirrors the proven planner/homecloud pattern: the caller's Supabase user ->
 * person -> active_household_id -> ACTIVE membership -> household row. The
 * returned client is scoped to the caller's token (RLS-enabled) and is used
 * ONLY for identity resolution; every Asset read/write goes through the
 * service-role client with the household enforced in the query itself.
 */
async function resolveAssetsContext(req) {
  if (!req.user?.id || !req.accessToken) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated');
  }

  const client = createSupabaseForToken(req.accessToken);

  const { data: person, error: personError } = await client
    .from('people')
    .select('id, auth_user_id, active_household_id')
    .eq('auth_user_id', req.user.id)
    .maybeSingle();

  if (personError) {
    throw createHttpError(500, personError.message, 'internal_error');
  }
  if (!person) {
    throw createHttpError(403, 'No existe person para el usuario autenticado.', 'person_not_found');
  }
  if (!person.active_household_id) {
    throw createHttpError(403, 'El usuario no tiene household activo.', 'no_active_household');
  }

  const { data: membership, error: membershipError } = await client
    .from('household_members')
    .select('*')
    .eq('household_id', person.active_household_id)
    .eq('person_id', person.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    throw createHttpError(500, membershipError.message, 'internal_error');
  }
  if (!membership) {
    throw createHttpError(403, 'El usuario no es miembro activo del household.', 'not_active_household_member');
  }

  const { data: household, error: householdError } = await client
    .from('households')
    .select('*')
    .eq('id', person.active_household_id)
    .maybeSingle();

  if (householdError) {
    throw createHttpError(500, householdError.message, 'internal_error');
  }
  if (!household) {
    throw createHttpError(403, 'El usuario no tiene household activo.', 'no_active_household');
  }

  return {
    personId: person.id,
    householdId: household.id,
    membershipId: membership.id,
    membership,
    household,
  };
}

async function contextWithCapability(req, capability) {
  const context = await resolveAssetsContext(req);
  const capabilities = resolveAssetsCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertAssetsCapability(capabilities, capability);
  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend no configurado.', 'assets_backend_unavailable');
  }
  return context;
}

// ── Validation ────────────────────────────────────────────────────────────────

function assertValidName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw createHttpError(400, 'El nombre es obligatorio.', 'assets_invalid_name');
  }
  return name.trim();
}

function assertValidProfile(profile) {
  if (typeof profile !== 'string' || !ASSET_PROFILES.includes(profile)) {
    throw createHttpError(
      400,
      `Profile inválido. Debe ser uno de: ${ASSET_PROFILES.join(', ')}.`,
      'assets_invalid_profile',
      { allowed_profiles: ASSET_PROFILES },
    );
  }
  return profile;
}

function assertValidAssetId(assetId) {
  if (typeof assetId !== 'string' || !UUID_PATTERN.test(assetId.trim())) {
    throw createHttpError(400, 'assetId inválido.', 'assets_invalid_asset_id');
  }
  return assetId.trim();
}

// ── A6.1 identity validation (§6, §8) ─────────────────────────────────────────

/**
 * Optional identity text (brand/model/serial): undefined means absent,
 * null means clear, a blank string clears too (same convention as the
 * Record text fields). Anything else must be a non-empty string within
 * the profile-agnostic length cap.
 */
function parseOptionalIdentityText(value, field, maxLength) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw createHttpError(400, `Identidad inválida: ${field}.`, 'assets_invalid_identity');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw createHttpError(
      400,
      `Identidad inválida: ${field} debe tener como máximo ${maxLength} caracteres.`,
      'assets_invalid_identity',
    );
  }
  return trimmed;
}

function normalizeIdentifierValue(key, value) {
  const trimmed = String(value).trim();
  if (UPPERCASE_IDENTIFIERS.includes(key)) return trimmed.toUpperCase();
  return trimmed;
}

/**
 * Profile-scoped specialized identifiers. undefined means absent, null
 * means clear (resolves to {}). Must be a flat object of non-empty
 * strings with ONLY the keys the given profile contemplates (§6, no
 * unlimited custom fields). Formats: plate (patente), vin (ISO 3779
 * 17 chars without I/O/Q), microchip (9..20 digits); the remaining keys
 * are bounded free text.
 */
function parseIdentifiers(value, profile) {
  if (value === undefined) return undefined;
  if (value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(400, 'Identificadores inválidos: debe ser un objeto.', 'assets_invalid_identifiers');
  }
  const allowed = IDENTITY_ALLOWED_KEYS[profile] ?? [];
  const normalized = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (!allowed.includes(rawKey)) {
      throw createHttpError(
        400,
        `Identificador no contemplado para el Profile ${profile}: ${rawKey}.`,
        'assets_invalid_identifiers',
        { allowed_keys: allowed, invalid_key: rawKey },
      );
    }
    if (typeof rawValue !== 'string') {
      throw createHttpError(
        400,
        `Identificador inválido: ${rawKey} debe ser texto.`,
        'assets_invalid_identifiers',
        { invalid_key: rawKey },
      );
    }
    const normalizedValue = normalizeIdentifierValue(rawKey, rawValue);
    if (normalizedValue.length === 0 || normalizedValue.length > IDENTIFIER_VALUE_MAX_LENGTH) {
      throw createHttpError(
        400,
        `Identificador inválido: ${rawKey}.`,
        'assets_invalid_identifiers',
        { invalid_key: rawKey },
      );
    }
    const format = IDENTIFIER_FORMATS[rawKey];
    if (format && !format.test(normalizedValue)) {
      throw createHttpError(
        400,
        `Identificador inválido: ${rawKey} no tiene un formato válido.`,
        'assets_invalid_identifiers',
        { invalid_key: rawKey },
      );
    }
    normalized[rawKey] = normalizedValue;
  }
  return normalized;
}

/**
 * The expected identity for optimistic concurrency: the exact identity
 * values the caller observed (brand/model/serial as string|null,
 * identifiers as object). Mandatory — a no-expectation identity write
 * is never last-write-wins (§56).
 */
function parseExpectedIdentity(value) {
  if (value === undefined) {
    throw createHttpError(
      422,
      'expected_identity es obligatorio (la escritura nunca es last-write-wins).',
      'assets_expected_identity_required',
    );
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(400, 'expected_identity inválido.', 'assets_invalid_expected_identity');
  }
  const allowedFields = ['brand', 'model', 'serial_number', 'identifiers'];
  for (const key of Object.keys(value)) {
    if (!allowedFields.includes(key)) {
      throw createHttpError(
        400,
        `Campo no aceptado en expected_identity: ${key}.`,
        'assets_invalid_expected_identity',
        { allowed_fields: allowedFields },
      );
    }
  }
  function expectedText(field, maxLength) {
    const candidate = value[field] === undefined ? null : value[field];
    if (candidate === null) return null;
    if (typeof candidate !== 'string') {
      throw createHttpError(400, 'expected_identity inválido.', 'assets_invalid_expected_identity');
    }
    const trimmed = candidate.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length > maxLength) {
      throw createHttpError(400, 'expected_identity inválido.', 'assets_invalid_expected_identity');
    }
    return trimmed;
  }
  const identifiers = value.identifiers === undefined ? {} : value.identifiers;
  if (identifiers === null || typeof identifiers !== 'object' || Array.isArray(identifiers)) {
    throw createHttpError(400, 'expected_identity inválido.', 'assets_invalid_expected_identity');
  }
  const normalizedIdentifiers = {};
  for (const [rawKey, rawValue] of Object.entries(identifiers)) {
    if (typeof rawValue !== 'string') {
      throw createHttpError(400, 'expected_identity inválido.', 'assets_invalid_expected_identity');
    }
    normalizedIdentifiers[rawKey] = normalizeIdentifierValue(rawKey, rawValue);
  }
  return {
    brand: expectedText('brand', IDENTITY_TEXT_MAX.brand),
    model: expectedText('model', IDENTITY_TEXT_MAX.model),
    serial_number: expectedText('serial_number', IDENTITY_TEXT_MAX.serial_number),
    identifiers: normalizedIdentifiers,
  };
}

function currentIdentityProjection(row) {
  return {
    brand: row.brand ?? null,
    model: row.model ?? null,
    serial_number: row.serial_number ?? null,
    identifiers: row.identifiers && typeof row.identifiers === 'object' && !Array.isArray(row.identifiers)
      ? row.identifiers
      : {},
  };
}

/**
 * Server-controlled fields never come from the body. A client cannot choose
 * the Household (§59, INV2-AST-084), the id or the lifecycle. The Profile
 * only changes through the dedicated structural endpoint, which requires
 * assets.manage plus the atomic structural validations (A3.3).
 */
function assertNoServerControlledFields(body, { allowProfile = false } = {}) {
  if (Object.prototype.hasOwnProperty.call(body, 'household_id') && body.household_id !== undefined && body.household_id !== null) {
    throw createHttpError(
      400,
      'household_id no se acepta: el Household se deriva del contexto autenticado.',
      'assets_household_not_accepted',
    );
  }
  if (Object.prototype.hasOwnProperty.call(body, 'id') && body.id !== undefined && body.id !== null) {
    throw createHttpError(400, 'id no se acepta en el body.', 'assets_id_not_accepted');
  }
  if (Object.prototype.hasOwnProperty.call(body, 'lifecycle_status') && body.lifecycle_status !== undefined && body.lifecycle_status !== null) {
    throw createHttpError(
      400,
      'lifecycle_status no se acepta: el lifecycle no se modifica en este slice.',
      'assets_lifecycle_change_not_supported',
    );
  }
  if (!allowProfile && Object.prototype.hasOwnProperty.call(body, 'profile') && body.profile !== undefined && body.profile !== null) {
    throw createHttpError(
      400,
      'El cambio de Profile se realiza por PATCH /api/assets/:id/profile y requiere assets.manage.',
      'assets_profile_change_not_supported',
    );
  }
}

// ── Idempotency (reserve -> mutate -> complete, planner pattern, backend-only) ──

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        sorted[key] = canonicalize(value[key]);
      });
    return sorted;
  }
  return value;
}

function hashAssetsRequest(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
}

/**
 * Typed answer for transient Postgres concurrency failures (P3 closure):
 * a detected deadlock (40P01) or serialization failure (40001) aborts
 * the loser's transaction with a FULL, safe rollback — nothing was
 * written, so the honest HTTP answer is a typed retryable 409, never a
 * raw 500. The DB guard (23514) is NOT transient: it is classified per
 * operation by the callers (lifecycle_readonly / dimension conflict).
 */
function mapTransientRpcError(error) {
  const code = error?.code ?? null;
  if (code === '40P01' || code === '40001') {
    return createHttpError(
      409,
      'Conflicto transitorio de concurrencia: la operación se revirtió completa y podés reintentar con una key nueva.',
      'assets_retryable_conflict',
      { retryable: true, reason: code === '40P01' ? 'deadlock' : 'serialization_failure' },
    );
  }
  return null;
}

function mapAssetsIdempotencyRpcError(error, operation) {
  const transient = mapTransientRpcError(error);
  if (transient) return transient;
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  if (code === '40007') {
    return createIdempotencyConflictError();
  }
  // Raw SQL errors (constraint names, SQLSTATE, hints, stack traces) never
  // cross the HTTP boundary.
  const httpError = createHttpError(500, 'Error inesperado al reservar idempotencia.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = operation;
  return httpError;
}

async function reserveAssetsIdempotency(context, { idempotencyKey, operation, requestHash }) {
  const { data, error } = await supabaseAdmin.rpc('reserve_assets_idempotency_key', {
    p_household_id: context.householdId,
    p_actor_member_id: context.membershipId,
    p_idempotency_key: idempotencyKey,
    p_operation: operation,
    p_request_hash: requestHash,
  });
  if (error) {
    throw mapAssetsIdempotencyRpcError(error, operation);
  }
  return data;
}

async function completeAssetsIdempotency(context, { idempotencyKey, operation }, responseStatus, responseBody) {
  const { error } = await supabaseAdmin.rpc('complete_assets_idempotency_key', {
    p_household_id: context.householdId,
    p_actor_member_id: context.membershipId,
    p_idempotency_key: idempotencyKey,
    p_operation: operation,
    p_response_status: responseStatus,
    p_response_body: responseBody,
  });
  if (error) {
    // The mutation already succeeded (or already failed deterministically);
    // a storage failure must not turn that into a lie. Same policy as the
    // Planner adapter: swallow, log, keep going.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[assets.idempotency] complete failed', {
        operation,
        message: error?.message,
        code: error?.code,
      });
    }
  }
}

/**
 * Run a mutation under the reserve -> mutate -> complete idempotency contract.
 *
 * A replay returns the exact stored response. An in-flight lease answers the
 * canonical 409. Deterministic 4xx outcomes are stored too so a retry of a
 * failed-stable intent replays the same typed answer instead of re-executing.
 * 5xx outcomes are never stored: the outcome is unknown and a retry must run.
 */
async function withAssetsIdempotency(context, { idempotencyKey, operation, requestHash, req }, successStatus, mutationFn) {
  const reservation = await reserveAssetsIdempotency(context, { idempotencyKey, operation, requestHash });

  if (reservation?.status === 'replay') {
    return { status: reservation.response_status, body: reservation.response_body, replay: true };
  }
  if (reservation?.status === 'in_flight') {
    throw createIdempotencyInFlightError();
  }

  let body;
  let responseStatus = successStatus;
  try {
    body = await mutationFn();
  } catch (error) {
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      responseStatus = error.statusCode;
      const envelope = buildApiErrorEnvelope(error, req).envelope;
      await completeAssetsIdempotency(context, { idempotencyKey, operation }, responseStatus, envelope);
      throw error;
    }
    throw error;
  }

  await completeAssetsIdempotency(context, { idempotencyKey, operation }, responseStatus, body);
  return { status: responseStatus, body };
}

// ── DTO ───────────────────────────────────────────────────────────────────────

function mapAssetRowToDto(row, context = {}) {
  if (!row) return null;
  return {
    id: row.id,
    household_id: row.household_id,
    name: row.name,
    profile: row.profile,
    lifecycle_status: row.lifecycle_status,
    // A6.2 lifecycle stance (§33, §36): the exact previous operational
    // state (unarchive target) and when the current episode started.
    // NULL on every non-ARCHIVED row. `archive` carries the open
    // episode (disposition + last historical context) while ARCHIVED
    // and is null otherwise — after unarchive the disposition survives
    // ONLY in history (§35, INV2-AST-058), never as current state.
    archived_from: row.archived_from ?? null,
    archived_at: row.archived_at ?? null,
    archive: context.archive ?? null,
    // A6.3 recoverable Trash (§37, §38): the exact previous logical
    // lifecycle (restore target) and when the current trash episode
    // started. NULL on every non-TRASH row. `trash` carries the open
    // trash episode while TRASH and is null otherwise; trashed_from on
    // an archived-trashed Asset keeps pointing at ARCHIVED so Restore
    // returns to the still-open archive episode (never a fallback).
    trashed_from: row.trashed_from ?? null,
    trashed_at: row.trashed_at ?? null,
    trash: context.trash ?? null,
    // A6.1 identity dimension (§8): optional metadata for the future
    // Root/Create/Detail screens. identifiers is always an object
    // (empty when the asset carries no specialized identifiers).
    brand: row.brand ?? null,
    model: row.model ?? null,
    serial_number: row.serial_number ?? null,
    identifiers: row.identifiers && typeof row.identifiers === 'object' && !Array.isArray(row.identifiers)
      ? row.identifiers
      : {},
    // A6.1 category (§7): the assigned 0..1 category or null.
    category: context.category ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // A3.2 context dimensions (§9-§13). `context` carries the resolved,
    // human-readable projection for this row (or nulls when absent).
    responsible: context.responsible ?? null,
    holder: context.holder ?? null,
    placement: context.placement ?? null,
  };
}

// ── Context resolution (A3.2, §25) ────────────────────────────────────────────

/**
 * Resolve the human-readable context projection for a batch of asset rows.
 *
 * Members are resolved through household_members -> people.display_name so a
 * member is NEVER presented as a raw technical id (§25). A member whose
 * membership is no longer active is still shown with the last known human
 * identity but marked valid: false, so an inactive/removed member is never
 * presented as a currently valid member. The global Member invalidation
 * mechanism (auto-unset on finalize) is explicitly deferred: read-side
 * marking is the honest interim presentation, no parallel solution is
 * invented here.
 *
 * Placement property names are resolved only inside the caller's Household;
 * a broken reference resolves to property_name: null instead of leaking
 * another Household's data.
 */
async function resolveContextsForRows(context, rows) {
  const memberIds = new Set();
  const propertyIds = new Set();
  for (const row of rows) {
    if (row.responsible_member_id) memberIds.add(row.responsible_member_id);
    if (row.holder_member_id) memberIds.add(row.holder_member_id);
    if (row.placement_property_asset_id) propertyIds.add(row.placement_property_asset_id);
  }

  const membersById = new Map();
  if (memberIds.size > 0) {
    const { data: memberRows, error: memberError } = await supabaseAdmin
      .from('household_members')
      .select('id, person_id, status, role')
      .in('id', [...memberIds]);
    if (memberError) {
      throw createHttpError(500, 'No se pudo consultar el contexto del activo.', 'assets_context_resolve_failed');
    }
    const personIds = [...new Set((memberRows ?? []).map((m) => m.person_id).filter(Boolean))];
    const peopleById = new Map();
    if (personIds.length > 0) {
      const { data: peopleRows, error: peopleError } = await supabaseAdmin
        .from('people')
        .select('id, display_name')
        .in('id', personIds);
      if (peopleError) {
        throw createHttpError(500, 'No se pudo consultar el contexto del activo.', 'assets_context_resolve_failed');
      }
      (peopleRows ?? []).forEach((person) => peopleById.set(person.id, person));
    }
    (memberRows ?? []).forEach((member) => {
      membersById.set(member.id, {
        ...member,
        display_name: peopleById.get(member.person_id)?.display_name ?? null,
      });
    });
  }

  const propertiesById = new Map();
  if (propertyIds.size > 0) {
    const { data: propertyRows, error: propertyError } = await supabaseAdmin
      .from('assets')
      .select('id, name')
      .eq('household_id', context.householdId)
      .in('id', [...propertyIds]);
    if (propertyError) {
      throw createHttpError(500, 'No se pudo consultar el contexto del activo.', 'assets_context_resolve_failed');
    }
    (propertyRows ?? []).forEach((property) => propertiesById.set(property.id, property));
  }

  function memberProjection(memberId) {
    const member = membersById.get(memberId);
    if (!member) return { member_id: memberId, display_name: null, member_status: null, valid: false };
    return {
      member_id: member.id,
      display_name: member.display_name,
      member_status: member.status,
      valid: member.status === 'active',
    };
  }

  const contexts = new Map();
  for (const row of rows) {
    const resolved = {
      responsible: row.responsible_member_id ? memberProjection(row.responsible_member_id) : null,
      holder: null,
      placement: null,
    };
    if (row.holder_member_id) {
      resolved.holder = { type: 'member', ...memberProjection(row.holder_member_id) };
    } else if (row.holder_external_label) {
      resolved.holder = { type: 'external', external_label: row.holder_external_label };
    }
    if (row.placement_property_asset_id) {
      resolved.placement = {
        type: 'property',
        property_asset_id: row.placement_property_asset_id,
        property_name: propertiesById.get(row.placement_property_asset_id)?.name ?? null,
        detail: row.placement_detail ?? null,
      };
    } else if (row.placement_external_text) {
      resolved.placement = { type: 'external', external_text: row.placement_external_text };
    }
    contexts.set(row.id, resolved);
  }
  return contexts;
}

async function loadAssetWithContext(context, assetId) {
  const { data: row, error } = await supabaseAdmin
    .from('assets')
    .select(ASSET_FIELDS)
    .eq('id', assetId)
    .eq('household_id', context.householdId)
    .maybeSingle();
  if (error) throw createHttpError(500, 'No se pudo consultar el activo.', 'assets_get_failed');
  if (!row) return null;
  const contexts = await resolveContextsForRows(context, [row]);
  const categories = await resolveCategoriesForRows(context, [row]);
  const archives = await resolveArchiveProjections(context, [row]);
  const trash = await resolveTrashProjections(context, [row]);
  const merged = {
    ...(contexts.get(row.id) ?? {}),
    category: categories.get(row.id) ?? null,
    archive: archives.get(row.id) ?? null,
    trash: trash.get(row.id) ?? null,
  };
  return mapAssetRowToDto(row, merged);
}

// ── A6.2 archive episodes (§33-§36) ───────────────────────────────────────────

/**
 * Project ONE archive episode row (open or closed) into its canonical
 * human-readable shape. Member/Property references are last-known
 * historical values with display names (§25: never a raw id as the
 * human substitute); their current validity is NOT claimed here.
 */
function mapEpisodeRowToDto(episode) {
  if (!episode) return null;
  const lastContext = { responsible: null, holder: null, placement: null };
  if (episode.last_responsible_member_id) {
    lastContext.responsible = {
      member_id: episode.last_responsible_member_id,
      display_name: episode.last_responsible_display_name ?? null,
    };
  }
  if (episode.last_holder_type === 'member' && episode.last_holder_member_id) {
    lastContext.holder = {
      type: 'member',
      member_id: episode.last_holder_member_id,
      display_name: episode.last_holder_display_name ?? null,
    };
  } else if (episode.last_holder_type === 'external' && episode.last_holder_external_label) {
    lastContext.holder = {
      type: 'external',
      external_label: episode.last_holder_external_label,
    };
  }
  if (episode.last_placement_type === 'property' && episode.last_placement_property_asset_id) {
    lastContext.placement = {
      type: 'property',
      property_asset_id: episode.last_placement_property_asset_id,
      property_name: episode.last_placement_property_name ?? null,
      detail: episode.last_placement_detail ?? null,
    };
  } else if (episode.last_placement_type === 'external' && episode.last_placement_external_text) {
    lastContext.placement = {
      type: 'external',
      external_text: episode.last_placement_external_text,
    };
  }
  return {
    id: episode.id,
    episode_number: episode.episode_number,
    from_lifecycle: episode.from_lifecycle,
    disposition: episode.disposition ?? null,
    disposition_note: episode.disposition_note ?? null,
    last_context: lastContext,
    archived_at: episode.archived_at,
    archived_by_member_id: episode.archived_by_member_id ?? null,
    unarchived_at: episode.unarchived_at ?? null,
    unarchived_to: episode.unarchived_to ?? null,
    created_at: episode.created_at,
  };
}

const EPISODE_FIELDS = [
  'id',
  'household_id',
  'asset_id',
  'episode_number',
  'from_lifecycle',
  'disposition',
  'disposition_note',
  'last_responsible_member_id',
  'last_responsible_display_name',
  'last_holder_type',
  'last_holder_member_id',
  'last_holder_display_name',
  'last_holder_external_label',
  'last_placement_type',
  'last_placement_property_asset_id',
  'last_placement_property_name',
  'last_placement_detail',
  'last_placement_external_text',
  'archived_at',
  'archived_by_member_id',
  'unarchived_at',
  'unarchived_to',
  'created_at',
].join(', ');

/**
 * Resolve the OPEN archive episode projection for a batch of asset rows.
 *
 * Only ARCHIVED rows carry one (the current episode: disposition shown
 * as current state + last historical context). ACTIVE/INACTIVE rows
 * project null — a past disposition survives ONLY in history
 * (INV2-AST-058). TRASH rows project null here: their open archive
 * episode (when ARCHIVED before Trash) survives untouched and surfaces
 * again after Restore; the trash episode itself is projected separately
 * by resolveTrashProjections (A6.3).
 * The read is household-scoped by construction (§45).
 */
async function resolveArchiveProjections(context, rows) {
  const projections = new Map();
  const archivedIds = [...new Set(
    (rows ?? []).filter((row) => row.lifecycle_status === 'ARCHIVED').map((row) => row.id),
  )];
  for (const row of rows ?? []) {
    projections.set(row.id, null);
  }
  if (archivedIds.length === 0) return projections;
  const { data: episodes, error } = await supabaseAdmin
    .from('asset_archive_episodes')
    .select(EPISODE_FIELDS)
    .eq('household_id', context.householdId)
    .in('asset_id', archivedIds)
    .is('unarchived_at', null)
    .order('episode_number', { ascending: false });
  if (error) {
    throw createHttpError(500, 'No se pudo consultar el historial del activo.', 'assets_archive_history_failed');
  }
  const latestByAsset = new Map();
  for (const episode of episodes ?? []) {
    if (!latestByAsset.has(episode.asset_id)) {
      latestByAsset.set(episode.asset_id, episode);
    }
  }
  for (const assetId of archivedIds) {
    projections.set(assetId, mapEpisodeRowToDto(latestByAsset.get(assetId) ?? null));
  }
  return projections;
}

// ── A6.3 trash episodes (§37, §38) ────────────────────────────────────────────

/**
 * Project ONE trash episode row (open or closed) into its canonical
 * shape. Trash preserves the live identity/context columns untouched
 * (INV2-AST-070), so the episode carries only the lifecycle truth:
 * from_lifecycle (the exact restore target), who and when, and the
 * close. History is append-only: re-trashing after restore is a NEW
 * episode, never an overwrite.
 */
function mapTrashEpisodeRowToDto(episode) {
  if (!episode) return null;
  return {
    id: episode.id,
    episode_number: episode.episode_number,
    from_lifecycle: episode.from_lifecycle,
    trashed_at: episode.trashed_at,
    trashed_by_member_id: episode.trashed_by_member_id ?? null,
    restored_at: episode.restored_at ?? null,
    restored_to: episode.restored_to ?? null,
    created_at: episode.created_at,
  };
}

const TRASH_EPISODE_FIELDS = [
  'id',
  'household_id',
  'asset_id',
  'episode_number',
  'from_lifecycle',
  'trashed_at',
  'trashed_by_member_id',
  'restored_at',
  'restored_to',
  'created_at',
].join(', ');

/**
 * Resolve the OPEN trash episode projection for a batch of asset rows.
 *
 * Only TRASH rows carry one (the current episode: the exact previous
 * logical lifecycle, restore target). Every other lifecycle projects
 * null — a past trash survives ONLY in history (§38). The read is
 * household-scoped by construction (§45).
 */
async function resolveTrashProjections(context, rows) {
  const projections = new Map();
  const trashedIds = [...new Set(
    (rows ?? []).filter((row) => row.lifecycle_status === 'TRASH').map((row) => row.id),
  )];
  for (const row of rows ?? []) {
    projections.set(row.id, null);
  }
  if (trashedIds.length === 0) return projections;
  const { data: episodes, error } = await supabaseAdmin
    .from('asset_trash_episodes')
    .select(TRASH_EPISODE_FIELDS)
    .eq('household_id', context.householdId)
    .in('asset_id', trashedIds)
    .is('restored_at', null)
    .order('episode_number', { ascending: false });
  if (error) {
    throw createHttpError(500, 'No se pudo consultar el historial del activo.', 'assets_trash_history_failed');
  }
  const latestByAsset = new Map();
  for (const episode of episodes ?? []) {
    if (!latestByAsset.has(episode.asset_id)) {
      latestByAsset.set(episode.asset_id, episode);
    }
  }
  for (const assetId of trashedIds) {
    projections.set(assetId, mapTrashEpisodeRowToDto(latestByAsset.get(assetId) ?? null));
  }
  return projections;
}

function assertValidLifecycleStatus(value, errorCode) {
  if (typeof value !== 'string' || !OPERATIONAL_LIFECYCLE.includes(value)) {
    throw createHttpError(
      400,
      `lifecycle_status inválido. Debe ser uno de: ${OPERATIONAL_LIFECYCLE.join(', ')}.`,
      errorCode,
      { allowed_lifecycle_status: OPERATIONAL_LIFECYCLE },
    );
  }
  return value;
}

function parseArchiveDisposition(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !ARCHIVE_DISPOSITIONS.includes(value)) {
    throw createHttpError(
      400,
      `Disposition inválida. Debe ser una de: ${ARCHIVE_DISPOSITIONS.join(', ')}.`,
      'assets_invalid_disposition',
      { allowed_dispositions: ARCHIVE_DISPOSITIONS },
    );
  }
  return value;
}

function parseDispositionNote(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw createHttpError(400, 'Disposition note inválida.', 'assets_invalid_disposition_note');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > DISPOSITION_NOTE_MAX_LENGTH) {
    throw createHttpError(
      400,
      `La explicación debe tener como máximo ${DISPOSITION_NOTE_MAX_LENGTH} caracteres.`,
      'assets_invalid_disposition_note',
    );
  }
  return trimmed;
}

function mapLifecycleRpcError(error, operation) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = operation;
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'No se pudo modificar el lifecycle del activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = operation;
  return httpError;
}

// ── A6.1 categories (§7) ────────────────────────────────────────────────────

/**
 * Resolve the assigned Category projection for a batch of asset rows.
 *
 * The projection is household-scoped by construction: only categories of
 * the caller's Household are read, so a broken or foreign reference
 * resolves to null instead of leaking another Household's data (§45).
 * A category that stopped being available (deleted row) resolves to
 * null — the SET NULL reference resolution, never corruption.
 */
async function resolveCategoriesForRows(context, rows) {
  const categoryIds = [...new Set((rows ?? []).map((row) => row.category_id).filter(Boolean))];
  const byId = new Map();
  if (categoryIds.length > 0) {
    const { data: categoryRows, error: categoryError } = await supabaseAdmin
      .from('asset_categories')
      .select('id, name, kind')
      .eq('household_id', context.householdId)
      .in('id', categoryIds);
    if (categoryError) {
      throw createHttpError(500, 'No se pudo consultar la categoría del activo.', 'assets_category_resolve_failed');
    }
    (categoryRows ?? []).forEach((category) => byId.set(category.id, {
      id: category.id,
      name: category.name,
      kind: category.kind,
    }));
  }
  const projections = new Map();
  for (const row of rows ?? []) {
    projections.set(row.id, row.category_id ? (byId.get(row.category_id) ?? null) : null);
  }
  return projections;
}

function assertValidCategoryName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw createHttpError(400, 'El nombre de la categoría es obligatorio.', 'assets_invalid_category_name');
  }
  const trimmed = name.trim();
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
    throw createHttpError(
      400,
      `El nombre de la categoría debe tener como máximo ${CATEGORY_NAME_MAX_LENGTH} caracteres.`,
      'assets_invalid_category_name',
    );
  }
  return trimmed;
}

function assertValidCategoryId(categoryId) {
  if (typeof categoryId !== 'string' || !UUID_PATTERN.test(categoryId.trim())) {
    throw createHttpError(400, 'categoryId inválido.', 'assets_invalid_category_id');
  }
  return categoryId.trim();
}

/**
 * Load ONE category of the caller's Household by id. Unknown and
 * cross-Household ids answer the same null (callers translate to the
 * non-disclosing typed error or the empty filtered list, §45).
 */
async function loadHouseholdCategory(context, categoryId) {
  const { data, error } = await supabaseAdmin
    .from('asset_categories')
    .select('id, household_id, name, kind, created_at')
    .eq('id', categoryId)
    .eq('household_id', context.householdId)
    .maybeSingle();
  if (error) throw createHttpError(500, 'No se pudo consultar la categoría.', 'assets_category_read_failed');
  return data ?? null;
}

function assertEditableIdentityLifecycle(row) {
  if (!IDENTITY_EDITABLE_LIFECYCLE.includes(row.lifecycle_status)) {
    throw createHttpError(
      409,
      'El activo no admite modificaciones en su lifecycle actual.',
      'assets_lifecycle_readonly',
      { lifecycle_status: row.lifecycle_status, allowed_lifecycle: IDENTITY_EDITABLE_LIFECYCLE },
    );
  }
}

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * POST /api/assets — create an Asset from Name + Profile.
 *
 * The Household, the initial lifecycle (ACTIVE) and every server-controlled
 * field are derived server-side. Requires assets.contribute.
 */
async function createAsset(req, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const idempotencyKey = requireIdempotencyKey(req);
  assertNoServerControlledFields(body, { allowProfile: true });
  const name = assertValidName(body.name);
  const profile = assertValidProfile(body.profile);
  // A6.1 (§8): creation stays minimal (Name + Profile) but the caller may
  // already enrich identity/category in the same intent. Every optional
  // field is validated exactly like a later enrichment. A null
  // household_id is ignored (same semantics as the Record create); any
  // other server-controlled value is rejected above.
  const createBody = { ...body };
  delete createBody.household_id;
  assertBodyFields(createBody, ['name', 'profile', 'brand', 'model', 'serial_number', 'identifiers', 'category_id']);
  const brand = parseOptionalIdentityText(body.brand, 'brand', IDENTITY_TEXT_MAX.brand) ?? null;
  const model = parseOptionalIdentityText(body.model, 'model', IDENTITY_TEXT_MAX.model) ?? null;
  const serialNumber = parseOptionalIdentityText(body.serial_number, 'serial_number', IDENTITY_TEXT_MAX.serial_number) ?? null;
  const identifiers = parseIdentifiers(body.identifiers, profile) ?? {};
  let categoryId = null;
  if (body.category_id !== undefined && body.category_id !== null) {
    categoryId = assertValidCategoryId(body.category_id);
    const category = await loadHouseholdCategory(context, categoryId);
    if (!category) {
      throw createHttpError(
        400,
        'La referencia no corresponde a una categoría válida de tu Household.',
        'assets_invalid_category',
      );
    }
  }

  const operation = 'assets.asset.create';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    name,
    profile,
    brand,
    model,
    serial_number: serialNumber,
    identifiers,
    category_id: categoryId,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    201,
    async () => {
      const { data, error } = await supabaseAdmin
        .from('assets')
        .insert({
          household_id: context.householdId,
          name,
          profile,
          lifecycle_status: 'ACTIVE',
          brand,
          model,
          serial_number: serialNumber,
          identifiers,
          category_id: categoryId,
        })
        .select('id')
        .single();
      if (error) throw createHttpError(500, 'No se pudo crear el activo.', 'assets_create_failed');
      const asset = await loadAssetWithContext(context, data.id);
      if (!asset) throw createHttpError(500, 'No se pudo crear el activo.', 'assets_create_failed');
      return { asset };
    },
  );
}

/**
 * GET /api/assets — list the authorized Assets of the caller's Household.
 *
 * The normal corpus is ACTIVE + INACTIVE. ARCHIVED and TRASH only appear
 * under an explicit scope. Requires assets.view.
 */
async function listAssets(req, query = {}) {
  const context = await contextWithCapability(req, 'assets.view');

  const scope = query.scope === undefined || query.scope === null || query.scope === '' ? 'normal' : String(query.scope);
  if (!LIST_SCOPES.includes(scope)) {
    throw createHttpError(
      400,
      `Scope inválido. Debe ser uno de: ${LIST_SCOPES.join(', ')}.`,
      'assets_invalid_scope',
      { allowed_scopes: LIST_SCOPES },
    );
  }

  let assetQuery = supabaseAdmin
    .from('assets')
    .select(ASSET_FIELDS)
    .eq('household_id', context.householdId)
    .in('lifecycle_status', SCOPE_LIFECYCLE[scope]);

  if (query.profile !== undefined && query.profile !== null && query.profile !== '') {
    const profile = String(query.profile);
    if (!ASSET_PROFILES.includes(profile)) {
      throw createHttpError(
        400,
        `Profile inválido. Debe ser uno de: ${ASSET_PROFILES.join(', ')}.`,
        'assets_invalid_profile',
        { allowed_profiles: ASSET_PROFILES },
      );
    }
    assetQuery = assetQuery.eq('profile', profile);
  }

  if (typeof query.q === 'string' && query.q.trim() !== '') {
    // BG-01: name, person or place — server-side, Household-isolated.
    // Ids resolve async; the filter is applied synchronously so the builder
    // (a thenable) is never returned across an await boundary.
    const searchIds = await resolveAssetsSearchIds(context, query.q);
    assetQuery = applyAssetsSearchFilter(assetQuery, query.q, searchIds);
  }

  // A6.1 (§7): optional Category filter. A malformed id answers 400; a
  // well-formed but foreign/unknown id answers the EMPTY list — the same
  // non-disclosure rule as every other cross-Household reference (§45).
  if (query.category_id !== undefined && query.category_id !== null && String(query.category_id).trim() !== '') {
    const categoryId = assertValidCategoryId(String(query.category_id));
    const category = await loadHouseholdCategory(context, categoryId);
    if (!category) {
      return { scope, assets: [], nextOffset: null };
    }
    assetQuery = assetQuery.eq('category_id', categoryId);
  }

  const pageLimit = Math.min(Math.max(Number(query.limit) || 100, 1), 100);
  const pageOffset = Math.max(Number(query.offset) || 0, 0);

  // One probe row proves has-more with real evidence instead of guessing from
  // a full page (same semantics as the HomeCloud Files browser).
  const { data, error } = await assetQuery
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(pageOffset, pageOffset + pageLimit);

  if (error) throw createHttpError(500, 'No se pudieron listar los activos.', 'assets_list_failed');

  const rows = data ?? [];
  const hasMore = rows.length > pageLimit;
  const pageRows = hasMore ? rows.slice(0, pageLimit) : rows;
  const contexts = await resolveContextsForRows(context, pageRows);
  const categories = await resolveCategoriesForRows(context, pageRows);
  const archives = await resolveArchiveProjections(context, pageRows);
  const trash = await resolveTrashProjections(context, pageRows);
  const assets = pageRows.map((row) => mapAssetRowToDto(row, {
    ...(contexts.get(row.id) ?? {}),
    category: categories.get(row.id) ?? null,
    archive: archives.get(row.id) ?? null,
    trash: trash.get(row.id) ?? null,
  }));

  return {
    scope,
    assets,
    nextOffset: hasMore ? pageOffset + pageLimit : null,
  };
}

/**
 * GET /api/assets/:assetId — one authorized Asset.
 *
 * An id belonging to ANOTHER household answers with the same 404 as an
 * unknown id on purpose: distinguishing them would disclose the existence of
 * Assets in households the caller is not part of. Any lifecycle state is
 * addressable here; scope surfaces decide visibility in lists. Requires
 * assets.view.
 */
async function getAssetById(req, assetId) {
  const context = await contextWithCapability(req, 'assets.view');
  const id = assertValidAssetId(assetId);

  const asset = await loadAssetWithContext(context, id);
  if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');

  return { asset };
}

/**
 * PATCH /api/assets/:assetId — edit ONLY the Name.
 *
 * Concurrency: the caller must state the updated_at it observed (If-Match or
 * expected_updated_at). The update is ONE atomic statement conditioned on
 * that version AND on the lifecycle staying editable, so a stale write can
 * never silently overwrite newer truth: it answers a typed 409 with the
 * current version. A no-version write is refused (never last-write-wins).
 * Requires assets.contribute.
 *
 * Lifecycle (§37, A6.3 closure): Name follows the identity editability
 * contract — ACTIVE/INACTIVE/ARCHIVED accept the edit, TRASH refuses it
 * with lifecycle_readonly (Trash freezes the row; only Restore brings it
 * back). The pre-check answers the sequential case honestly; the atomic
 * lifecycle condition closes the race window (a concurrent Trash between
 * the pre-check and the commit loses with the same typed 409, never a
 * silent write on a frozen row).
 */
async function updateAssetName(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidAssetId(assetId);
  assertNoServerControlledFields(body, { allowProfile: false });
  // A6.1 (§13): Name is its own write path. Identity/category move only
  // through their dedicated dimension endpoints, never piggybacked here.
  assertBodyFields(body, ['name', 'expected_updated_at']);
  const name = assertValidName(body.name);

  const rawHeader = req?.headers?.['if-match'];
  const rawBody = body.expected_updated_at;
  const hasHeader = typeof rawHeader === 'string' && rawHeader.trim() !== '';
  const hasBody = rawBody !== undefined && rawBody !== null && String(rawBody).trim() !== '';
  if (!hasHeader && !hasBody) {
    throw createHttpError(
      422,
      'If-Match (o expected_updated_at) es obligatorio para editar un activo.',
      'assets_expected_updated_at_required',
    );
  }
  // The version is compared as the RAW string: updated_at carries microsecond
  // precision and a JS Date round-trip would silently truncate it, which
  // would make every edit look stale.
  const expectedUpdatedAt = (hasHeader ? rawHeader.replace(/^"|"$/g, '') : String(rawBody)).trim();
  if (Number.isNaN(Date.parse(expectedUpdatedAt))) {
    throw createHttpError(400, 'expected_updated_at inválido.', 'assets_invalid_expected_updated_at');
  }

  // Sequential case: refuse honestly before any write attempt.
  const row = await loadContextAsset(context, id);
  assertEditableIdentityLifecycle(row);

  const idempotencyKey = parseIdempotencyKey(req);
  const operation = 'assets.asset.update_name';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    name,
    expected_updated_at: expectedUpdatedAt,
  });

  const mutate = async () => {
    // The atomic statement re-asserts the lifecycle guard: a concurrent
    // Archive/Trash that commits between the pre-check and this UPDATE
    // makes the row ineligible here (zero rows), and the classification
    // below answers the honest typed failure.
    const { data, error } = await supabaseAdmin
      .from('assets')
      .update({ name })
      .eq('id', id)
      .eq('household_id', context.householdId)
      .eq('updated_at', expectedUpdatedAt)
      .in('lifecycle_status', IDENTITY_EDITABLE_LIFECYCLE)
      .select('id')
      .maybeSingle();

    if (error) throw createHttpError(500, 'No se pudo editar el activo.', 'assets_update_failed');
    if (data) {
      const asset = await loadAssetWithContext(context, id);
      if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      return { asset };
    }

    // Zero rows: the asset is gone/foreign, the lifecycle moved out of
    // the editable set, OR the version moved. Re-read to answer with
    // the honest typed failure instead of guessing.
    const { data: current, error: lookupError } = await supabaseAdmin
      .from('assets')
      .select('id, lifecycle_status, updated_at')
      .eq('id', id)
      .eq('household_id', context.householdId)
      .maybeSingle();
    if (lookupError) throw createHttpError(500, 'No se pudo editar el activo.', 'assets_update_failed');
    if (!current) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
    if (!IDENTITY_EDITABLE_LIFECYCLE.includes(current.lifecycle_status)) {
      throw createHttpError(
        409,
        'El activo no admite modificaciones en su lifecycle actual.',
        'assets_lifecycle_readonly',
        { lifecycle_status: current.lifecycle_status, allowed_lifecycle: IDENTITY_EDITABLE_LIFECYCLE },
      );
    }
    throw createHttpError(
      409,
      'El activo cambió mientras lo editabas. Actualizá y reintentá.',
      'assets_stale_write',
      { current_updated_at: current.updated_at },
    );
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

// ── A3.2 context dimensions (§9-§13) ───────────────────────────────────────────

/**
 * Concurrency is evaluated PER DIMENSION (§56, UC2-AST-094/095): every
 * context mutation is ONE atomic update conditioned on the CURRENT value
 * of its own dimension, not on the whole-row updated_at. Independent
 * concurrent edits to different dimensions therefore coexist, while a
 * same-dimension stale write answers a typed 409 with the current value.
 * A no-expectation write is refused (never last-write-wins).
 */

function assertEditableContextLifecycle(row) {
  if (!CONTEXT_EDITABLE_LIFECYCLE.includes(row.lifecycle_status)) {
    throw createHttpError(
      409,
      'El activo no admite cambios operativos de contexto en su lifecycle actual.',
      'assets_lifecycle_readonly',
      { lifecycle_status: row.lifecycle_status, allowed_lifecycle: CONTEXT_EDITABLE_LIFECYCLE },
    );
  }
}

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

function assertValidUuidOrNull(value, errorCode) {
  if (value === null) return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw createHttpError(400, 'Referencia inválida.', errorCode);
  }
  return value.trim();
}

function assertValidLabelOrNull(value, errorCode) {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw createHttpError(400, 'Etiqueta inválida.', errorCode);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > CONTEXT_LABEL_MAX_LENGTH) {
    throw createHttpError(
      400,
      `La etiqueta debe tener entre 1 y ${CONTEXT_LABEL_MAX_LENGTH} caracteres.`,
      errorCode,
    );
  }
  return trimmed;
}

/**
 * Load the asset row for a context mutation.
 *
 * Cross-Household and unknown ids answer the same 404 (§45): the existence
 * of another Household's Assets is never disclosed.
 */
async function loadContextAsset(context, assetId) {
  const { data: row, error } = await supabaseAdmin
    .from('assets')
    .select(ASSET_FIELDS)
    .eq('id', assetId)
    .eq('household_id', context.householdId)
    .maybeSingle();
  if (error) throw createHttpError(500, 'No se pudo consultar el activo.', 'assets_get_failed');
  if (!row) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
  return row;
}

/**
 * Validate that a member reference is an ACTIVE membership of the caller's
 * Household. Cross-Household, nonexistent and inactive members answer the
 * SAME typed error so no restricted entity is revealed (§45, §58).
 */
async function assertEligibleMember(context, memberId, errorCode) {
  const { data, error } = await supabaseAdmin
    .from('household_members')
    .select('id')
    .eq('id', memberId)
    .eq('household_id', context.householdId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw createHttpError(500, 'No se pudo validar la referencia.', 'assets_context_validate_failed');
  if (!data) {
    throw createHttpError(400, 'La referencia no corresponde a un miembro activo de tu Household.', errorCode);
  }
}

function parseHolderValue(value, { requiredCode, invalidCode }) {
  if (value === undefined) {
    throw createHttpError(422, 'holder es obligatorio (puede ser null para limpiar).', requiredCode);
  }
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(400, 'holder inválido.', invalidCode);
  }
  const keys = Object.keys(value);
  const hasMember = keys.includes('member_id');
  const hasExternal = keys.includes('external_label');
  if (hasMember === hasExternal) {
    throw createHttpError(
      400,
      'holder debe indicar exactamente una alternativa: member_id o external_label.',
      invalidCode,
    );
  }
  if (hasMember) {
    if (typeof value.member_id !== 'string' || !UUID_PATTERN.test(value.member_id.trim())) {
      throw createHttpError(400, 'member_id inválido.', invalidCode);
    }
    return { member_id: value.member_id.trim() };
  }
  if (typeof value.external_label !== 'string') {
    throw createHttpError(400, 'external_label inválida.', invalidCode);
  }
  const label = assertValidLabelOrNull(value.external_label, invalidCode);
  return { external_label: label };
}

function parsePlacementValue(value, { requiredCode, invalidCode }) {
  if (value === undefined) {
    throw createHttpError(422, 'placement es obligatorio (puede ser null para limpiar).', requiredCode);
  }
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(400, 'placement inválido.', invalidCode);
  }
  const keys = Object.keys(value);
  const hasProperty = keys.includes('property_asset_id');
  const hasExternal = keys.includes('external_text');
  if (hasProperty === hasExternal) {
    throw createHttpError(
      400,
      'placement debe indicar exactamente una alternativa: property_asset_id o external_text.',
      invalidCode,
    );
  }
  if (hasProperty) {
    if (typeof value.property_asset_id !== 'string' || !UUID_PATTERN.test(value.property_asset_id.trim())) {
      throw createHttpError(400, 'property_asset_id inválido.', invalidCode);
    }
    const propertyId = value.property_asset_id.trim();
    let detail = value.detail ?? null;
    if (detail !== null) {
      if (typeof detail !== 'string' || detail.trim().length > CONTEXT_LABEL_MAX_LENGTH) {
        throw createHttpError(
          400,
          `El detalle debe tener como máximo ${CONTEXT_LABEL_MAX_LENGTH} caracteres.`,
          invalidCode,
        );
      }
      detail = detail.trim() === '' ? null : detail.trim();
    }
    return { property_asset_id: propertyId, detail };
  }
  if (typeof value.external_text !== 'string') {
    throw createHttpError(400, 'external_text inválido.', invalidCode);
  }
  const text = assertValidLabelOrNull(value.external_text, invalidCode);
  return { external_text: text };
}

function assertHolderPlacementAllowed(row) {
  if (row.profile === 'PROPERTY') {
    throw createHttpError(
      409,
      'Un Asset PROPERTY no admite esta dimensión de contexto.',
      'assets_property_context_not_allowed',
      { profile: row.profile },
    );
  }
}

/**
 * Shared zero-row / DB-guard reconciliation for a context dimension
 * mutation (P2 closure). Reaches here when the atomic UPDATE matched no
 * row (the asset is gone/foreign or the dimension moved) or when the
 * assets_context_guard rejected the write at commit time with SQLSTATE
 * 23514 — the race where Archive/Trash (or a target Property's Trash)
 * committed between the pre-check and the atomic UPDATE.
 *
 * The re-read classifies the honest typed outcome instead of guessing:
 *   - asset absent from this Household -> non-disclosing 404 (§45);
 *   - lifecycle left the editable set (concurrent Archive/Trash won the
 *     race) -> typed 409 lifecycle_readonly with the current lifecycle;
 *   - otherwise -> the dimension conflict the caller supplied (typed 409
 *     with the current value so the caller can reconcile).
 */
async function reconcileDimensionWrite(context, assetId, buildConflict) {
  const { data: current, error } = await supabaseAdmin
    .from('assets')
    .select(ASSET_FIELDS)
    .eq('id', assetId)
    .eq('household_id', context.householdId)
    .maybeSingle();
  if (error) throw createHttpError(500, 'No se pudo editar el activo.', 'assets_update_failed');
  if (!current) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
  if (!CONTEXT_EDITABLE_LIFECYCLE.includes(current.lifecycle_status)) {
    throw createHttpError(
      409,
      'El activo no admite cambios operativos de contexto en su lifecycle actual.',
      'assets_lifecycle_readonly',
      { lifecycle_status: current.lifecycle_status, allowed_lifecycle: CONTEXT_EDITABLE_LIFECYCLE },
    );
  }
  throw buildConflict(current);
}

function currentHolderProjection(row) {
  if (row.holder_member_id) {
    return { type: 'member', member_id: row.holder_member_id };
  }
  if (row.holder_external_label) {
    return { type: 'external', external_label: row.holder_external_label };
  }
  return null;
}

function currentPlacementProjection(row) {
  if (row.placement_property_asset_id) {
    return { type: 'property', property_asset_id: row.placement_property_asset_id, detail: row.placement_detail ?? null };
  }
  if (row.placement_external_text) {
    return { type: 'external', external_text: row.placement_external_text };
  }
  return null;
}

/**
 * PATCH /api/assets/:assetId/responsible — set / change / clear the 0..1
 * Responsible (§9). Body:
 *   { responsible_member_id: uuid | null, expected_responsible_member_id: uuid | null }
 *
 * PROPERTY Assets keep the Responsible dimension (§12). The expected value
 * is mandatory: a no-expectation write is never last-write-wins.
 * Requires assets.contribute; only ACTIVE/INACTIVE accept the write.
 */
async function setAssetResponsible(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidAssetId(assetId);
  assertBodyFields(body, ['responsible_member_id', 'expected_responsible_member_id']);

  if (!Object.prototype.hasOwnProperty.call(body, 'responsible_member_id')) {
    throw createHttpError(
      422,
      'responsible_member_id es obligatorio (puede ser null para limpiar).',
      'assets_responsible_member_required',
    );
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'expected_responsible_member_id')) {
    throw createHttpError(
      422,
      'expected_responsible_member_id es obligatorio (la escritura nunca es last-write-wins).',
      'assets_expected_responsible_required',
    );
  }
  const target = assertValidUuidOrNull(body.responsible_member_id, 'assets_invalid_responsible_member');
  const expected = assertValidUuidOrNull(body.expected_responsible_member_id, 'assets_invalid_expected_responsible_member');

  const row = await loadContextAsset(context, id);
  assertEditableContextLifecycle(row);
  if (target !== null) {
    await assertEligibleMember(context, target, 'assets_invalid_responsible_member');
  }

  const idempotencyKey = parseIdempotencyKey(req);
  const operation = 'assets.asset.set_responsible';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    responsible_member_id: target,
    expected_responsible_member_id: expected,
  });

  const buildConflict = (current) => createHttpError(
    409,
    'El responsable cambió mientras lo editabas. Actualizá y reintentá.',
    'assets_responsible_conflict',
    { current_responsible_member_id: current.responsible_member_id ?? null },
  );

  const mutate = async () => {
    let query = supabaseAdmin
      .from('assets')
      .update({ responsible_member_id: target })
      .eq('id', id)
      .eq('household_id', context.householdId);
    query = expected === null
      ? query.is('responsible_member_id', null)
      : query.eq('responsible_member_id', expected);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) {
      // The DB guard rejected the write at commit time: a concurrent
      // Archive/Trash won the race (lifecycle freeze) or the referenced
      // membership stopped being active mid-flight. Classify honestly.
      if (error?.code === '23514') {
        await reconcileDimensionWrite(context, id, buildConflict);
      }
      throw createHttpError(500, 'No se pudo editar el activo.', 'assets_update_failed');
    }
    if (!data) {
      await reconcileDimensionWrite(context, id, buildConflict);
    }
    const asset = await loadAssetWithContext(context, id);
    return { asset };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

/**
 * PATCH /api/assets/:assetId/holder — set / change / clear the 0..1 Holder
 * (§10). Body:
 *   { holder: { member_id } | { external_label } | null,
 *     expected_holder: { member_id } | { external_label } | null }
 *
 * Exactly one alternative at a time; switching between member and external
 * is one atomic change of the Holder dimension. PROPERTY Assets reject the
 * dimension entirely (§12). Independent from Responsible and Placement.
 */
async function setAssetHolder(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidAssetId(assetId);
  assertBodyFields(body, ['holder', 'expected_holder']);

  const target = parseHolderValue(body.holder, {
    requiredCode: 'assets_holder_required',
    invalidCode: 'assets_invalid_holder_value',
  });
  const expected = parseHolderValue(body.expected_holder, {
    requiredCode: 'assets_expected_holder_required',
    invalidCode: 'assets_invalid_expected_holder_value',
  });

  const row = await loadContextAsset(context, id);
  assertEditableContextLifecycle(row);
  assertHolderPlacementAllowed(row);

  if (target?.member_id) {
    await assertEligibleMember(context, target.member_id, 'assets_invalid_holder_member');
  }

  const idempotencyKey = parseIdempotencyKey(req);
  const operation = 'assets.asset.set_holder';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    holder: target,
    expected_holder: expected,
  });

  const buildConflict = (current) => createHttpError(
    409,
    'El holder cambió mientras lo editabas. Actualizá y reintentá.',
    'assets_holder_conflict',
    { current_holder: currentHolderProjection(current) },
  );

  const mutate = async () => {
    const patch = {
      holder_member_id: target?.member_id ?? null,
      holder_external_label: target?.external_label ?? null,
    };
    let query = supabaseAdmin
      .from('assets')
      .update(patch)
      .eq('id', id)
      .eq('household_id', context.householdId);
    if (expected === null) {
      query = query.is('holder_member_id', null).is('holder_external_label', null);
    } else if (expected.member_id) {
      query = query.eq('holder_member_id', expected.member_id).is('holder_external_label', null);
    } else {
      query = query.is('holder_member_id', null).eq('holder_external_label', expected.external_label);
    }
    const { data, error } = await query.select('id').maybeSingle();
    if (error) {
      // The DB guard rejected the write at commit time: a concurrent
      // Archive/Trash won the race (lifecycle freeze) or the referenced
      // membership stopped being active mid-flight. Classify honestly.
      if (error?.code === '23514') {
        await reconcileDimensionWrite(context, id, buildConflict);
      }
      throw createHttpError(500, 'No se pudo editar el activo.', 'assets_update_failed');
    }
    if (!data) {
      await reconcileDimensionWrite(context, id, buildConflict);
    }
    const asset = await loadAssetWithContext(context, id);
    return { asset };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

/**
 * PATCH /api/assets/:assetId/placement — set / change / clear the 0..1
 * Placement (§11). Body:
 *   { placement: { property_asset_id, detail? } | { external_text } | null,
 *     expected_placement: { property_asset_id, detail? } | { external_text } | null }
 *
 * The Property alternative must be a PROPERTY Asset of the SAME Household
 * in an operational lifecycle (ACTIVE or INACTIVE only, §11, §40,
 * UC2-AST-111, INV2-AST-071): ARCHIVED and TRASH Properties reject new
 * normal operational context (§33, §37). Cross-Household, nonexistent,
 * wrong-profile and non-operational targets all answer the SAME typed
 * error so nothing restricted is disclosed (§45). PROPERTY Assets reject
 * the dimension entirely (§12).
 */
async function setAssetPlacement(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidAssetId(assetId);
  assertBodyFields(body, ['placement', 'expected_placement']);

  const target = parsePlacementValue(body.placement, {
    requiredCode: 'assets_placement_required',
    invalidCode: 'assets_invalid_placement_value',
  });
  const expected = parsePlacementValue(body.expected_placement, {
    requiredCode: 'assets_expected_placement_required',
    invalidCode: 'assets_invalid_expected_placement_value',
  });

  const row = await loadContextAsset(context, id);
  assertEditableContextLifecycle(row);
  assertHolderPlacementAllowed(row);

  if (target?.property_asset_id) {
    if (target.property_asset_id === id) {
      throw createHttpError(400, 'La referencia no corresponde a una Property válida de tu Household.', 'assets_invalid_placement_property');
    }
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('assets')
      .select('id')
      .eq('id', target.property_asset_id)
      .eq('household_id', context.householdId)
      .eq('profile', 'PROPERTY')
      .in('lifecycle_status', CONTEXT_EDITABLE_LIFECYCLE)
      .maybeSingle();
    if (propertyError) {
      throw createHttpError(500, 'No se pudo validar la referencia.', 'assets_context_validate_failed');
    }
    if (!property) {
      throw createHttpError(
        400,
        'La referencia no corresponde a una Property válida de tu Household.',
        'assets_invalid_placement_property',
      );
    }
  }

  const idempotencyKey = parseIdempotencyKey(req);
  const operation = 'assets.asset.set_placement';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    placement: target,
    expected_placement: expected,
  });

  const buildConflict = (current) => createHttpError(
    409,
    'La ubicación cambió mientras la editabas. Actualizá y reintentá.',
    'assets_placement_conflict',
    { current_placement: currentPlacementProjection(current) },
  );

  const mutate = async () => {
    const patch = {
      placement_property_asset_id: target?.property_asset_id ?? null,
      placement_detail: target?.detail ?? null,
      placement_external_text: target?.external_text ?? null,
    };
    let query = supabaseAdmin
      .from('assets')
      .update(patch)
      .eq('id', id)
      .eq('household_id', context.householdId);
    if (expected === null) {
      query = query
        .is('placement_property_asset_id', null)
        .is('placement_detail', null)
        .is('placement_external_text', null);
    } else if (expected.property_asset_id) {
      query = query
        .eq('placement_property_asset_id', expected.property_asset_id)
        .is('placement_external_text', null);
      query = expected.detail === null
        ? query.is('placement_detail', null)
        : query.eq('placement_detail', expected.detail);
    } else {
      query = query
        .is('placement_property_asset_id', null)
        .is('placement_detail', null)
        .eq('placement_external_text', expected.external_text);
    }
    const { data, error } = await query.select('id').maybeSingle();
    if (error) {
      // The DB guard rejected the write at commit time: a concurrent
      // Archive/Trash won the race (lifecycle freeze) or the target
      // Property left the operational corpus mid-flight. Classify
      // honestly with the typed conflict instead of a raw 500.
      if (error?.code === '23514') {
        await reconcileDimensionWrite(context, id, buildConflict);
      }
      throw createHttpError(500, 'No se pudo editar el activo.', 'assets_update_failed');
    }
    if (!data) {
      await reconcileDimensionWrite(context, id, buildConflict);
    }
    const asset = await loadAssetWithContext(context, id);
    return { asset };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

// ── A6.1 Identity & Categories (§6, §7, §8, §13, §33, §37, §43, §56) ──────────

function mapIdentityRpcError(error, operation) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = operation;
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'No se pudo editar la identidad del activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = operation;
  return httpError;
}

/**
 * PATCH /api/assets/:assetId/identity — edit the optional identity
 * dimension (brand / model / serial_number / identifiers). Body:
 *   { brand?: string|null, model?: string|null,
 *     serial_number?: string|null, identifiers?: object|null,
 *     expected_identity: { brand, model, serial_number, identifiers } }
 *
 * Rules (Product Freeze V2.0):
 *   - At least one identity field must be provided; absent fields keep
 *     their current value, null clears (§8 ENRICH LATER).
 *   - expected_identity is mandatory: the write is ONE atomic RPC
 *     conditioned on the CURRENT identity values of that dimension, not
 *     on whole-row updated_at (§56, UC2-AST-094/095). Independent
 *     Responsible/Holder/Placement edits coexist; a stale identity write
 *     answers a typed 409 with the current identity.
 *   - identifiers accept ONLY the keys the asset's profile contemplates
 *     (§6, UC2-AST-005); anything else answers a typed 400. No new
 *     System Profiles, no unlimited custom fields.
 *   - Editing identity never touches Responsible/Holder/Placement (§13).
 *   - ACTIVE/INACTIVE accept normally; ARCHIVED accepts as historical
 *     enrichment (§33, UC2-AST-066/110); TRASH rejects (§37).
 *   - Requires assets.contribute (§43). Idempotent by Idempotency-Key
 *     when the caller sends one (§53).
 */
async function updateAssetIdentity(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidAssetId(assetId);
  assertBodyFields(body, ['brand', 'model', 'serial_number', 'identifiers', 'expected_identity']);

  const row = await loadContextAsset(context, id);
  assertEditableIdentityLifecycle(row);

  const expected = parseExpectedIdentity(body.expected_identity);
  const brand = parseOptionalIdentityText(body.brand, 'brand', IDENTITY_TEXT_MAX.brand);
  const model = parseOptionalIdentityText(body.model, 'model', IDENTITY_TEXT_MAX.model);
  const serialNumber = parseOptionalIdentityText(body.serial_number, 'serial_number', IDENTITY_TEXT_MAX.serial_number);
  const identifiers = parseIdentifiers(body.identifiers, row.profile);

  if (brand === undefined && model === undefined && serialNumber === undefined && identifiers === undefined) {
    throw createHttpError(
      422,
      'Proporcioná al menos un campo de identidad para editar.',
      'assets_identity_required',
    );
  }

  const target = {
    brand: brand === undefined ? expected.brand : brand,
    model: model === undefined ? expected.model : model,
    serial_number: serialNumber === undefined ? expected.serial_number : serialNumber,
    identifiers: identifiers === undefined ? expected.identifiers : identifiers,
  };

  const idempotencyKey = parseIdempotencyKey(req);
  const operation = 'assets.asset.update_identity';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    brand: target.brand,
    model: target.model,
    serial_number: target.serial_number,
    identifiers: target.identifiers,
    expected_identity: expected,
  });

  const mutate = async () => {
    const { data, error } = await supabaseAdmin.rpc('update_asset_identity', {
      p_household_id: context.householdId,
      p_actor_member_id: context.membershipId,
      p_asset_id: id,
      p_brand: target.brand,
      p_model: target.model,
      p_serial_number: target.serial_number,
      p_identifiers: target.identifiers,
      p_expected_brand: expected.brand,
      p_expected_model: expected.model,
      p_expected_serial_number: expected.serial_number,
      p_expected_identifiers: expected.identifiers,
    });
    if (error) throw mapIdentityRpcError(error, operation);

    const outcome = data ?? {};
    if (outcome.status === 'not_found') {
      throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
    }
    if (outcome.status === 'lifecycle_readonly') {
      throw createHttpError(
        409,
        'El activo no admite modificaciones en su lifecycle actual.',
        'assets_lifecycle_readonly',
        { lifecycle_status: outcome.lifecycle_status, allowed_lifecycle: IDENTITY_EDITABLE_LIFECYCLE },
      );
    }
    if (outcome.status === 'conflict') {
      throw createHttpError(
        409,
        'La identidad del activo cambió mientras la editabas. Actualizá y reintentá.',
        'assets_identity_conflict',
        { current_identity: outcome.current_identity },
      );
    }
    if (outcome.status !== 'changed') {
      throw createHttpError(500, 'No se pudo editar la identidad del activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }

    const asset = await loadAssetWithContext(context, id);
    if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
    return { asset };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

/**
 * PATCH /api/assets/:assetId/category — assign / change / clear the 0..1
 * Category (§7). Body:
 *   { category_id: uuid | null, expected_category_id: uuid | null }
 *
 * The target must be a Category of the caller's Household; unknown and
 * cross-Household ids answer the SAME typed 400 (non-disclosure, §45).
 * The expected value is mandatory: same-dimension optimistic guard, never
 * last-write-wins (§56). Assigning a category never modifies profile,
 * lifecycle, permissions or relations (INV2-AST-008). ARCHIVED accepts as
 * historical enrichment (§33); TRASH rejects (§37). Requires
 * assets.contribute (§43).
 */
async function setAssetCategory(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidAssetId(assetId);
  assertBodyFields(body, ['category_id', 'expected_category_id']);

  if (!Object.prototype.hasOwnProperty.call(body, 'category_id')) {
    throw createHttpError(
      422,
      'category_id es obligatorio (puede ser null para quitar).',
      'assets_category_required',
    );
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'expected_category_id')) {
    throw createHttpError(
      422,
      'expected_category_id es obligatorio (la escritura nunca es last-write-wins).',
      'assets_expected_category_required',
    );
  }
  const target = body.category_id === null ? null : assertValidCategoryId(body.category_id);
  const expected = body.expected_category_id === null ? null : assertValidCategoryId(body.expected_category_id);

  const row = await loadContextAsset(context, id);
  assertEditableIdentityLifecycle(row);

  if (target !== null) {
    const category = await loadHouseholdCategory(context, target);
    if (!category) {
      throw createHttpError(
        400,
        'La referencia no corresponde a una categoría válida de tu Household.',
        'assets_invalid_category',
      );
    }
  }

  const idempotencyKey = parseIdempotencyKey(req);
  const operation = 'assets.asset.set_category';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    category_id: target,
    expected_category_id: expected,
  });

  const mutate = async () => {
    let query = supabaseAdmin
      .from('assets')
      .update({ category_id: target })
      .eq('id', id)
      .eq('household_id', context.householdId);
    query = expected === null
      ? query.is('category_id', null)
      : query.eq('category_id', expected);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) throw createHttpError(500, 'No se pudo editar el activo.', 'assets_update_failed');
    if (!data) {
      await reconcileDimensionWrite(context, id, (current) => createHttpError(
        409,
        'La categoría del activo cambió mientras la editabas. Actualizá y reintentá.',
        'assets_category_conflict',
        { current_category_id: current.category_id ?? null },
      ));
    }
    const asset = await loadAssetWithContext(context, id);
    return { asset };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

/**
 * GET /api/assets/categories — the household catalog (VIEW).
 *
 * Returns stored rows (system + custom) with their live asset counts,
 * PLUS the suggested names not yet materialized (kind system, id null,
 * asset_count 0) so Create/Detail screens can offer them without a
 * round-trip. Cross-Household rows never appear (§45).
 */
async function listCategories(req) {
  const context = await contextWithCapability(req, 'assets.view');

  const { data: rows, error } = await supabaseAdmin
    .from('asset_categories')
    .select('id, name, kind, created_at')
    .eq('household_id', context.householdId)
    .order('name', { ascending: true });
  if (error) throw createHttpError(500, 'No se pudieron listar las categorías.', 'assets_categories_list_failed');

  const stored = rows ?? [];
  const { data: assetRows, error: assetError } = await supabaseAdmin
    .from('assets')
    .select('category_id')
    .eq('household_id', context.householdId)
    .not('category_id', 'is', null);
  if (assetError) throw createHttpError(500, 'No se pudieron listar las categorías.', 'assets_categories_list_failed');
  const counts = new Map();
  for (const assetRow of assetRows ?? []) {
    counts.set(assetRow.category_id, (counts.get(assetRow.category_id) ?? 0) + 1);
  }

  const storedNames = new Set(stored.map((category) => category.name.toLowerCase()));
  const categories = stored.map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind,
    asset_count: counts.get(category.id) ?? 0,
    created_at: category.created_at,
  }));
  for (const suggested of SUGGESTED_ASSET_CATEGORIES) {
    if (!storedNames.has(suggested.toLowerCase())) {
      categories.push({ id: null, name: suggested, kind: 'system', asset_count: 0, created_at: null });
    }
  }
  categories.sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return { categories };
}

/**
 * POST /api/assets/categories — create (or resolve) ONE household
 * category (CONTRIBUTE, Idempotency-Key required).
 *
 * A name matching the suggested catalog materializes a system row; any
 * other name creates a custom row. An existing row with the same name
 * (case-insensitive) is resolved idempotently with status 200 instead of
 * duplicating — one name per household, never two rows (§7).
 */
async function createCategory(req, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const idempotencyKey = requireIdempotencyKey(req);
  assertBodyFields(body, ['name']);
  const name = assertValidCategoryName(body.name);

  const operation = 'assets.category.create';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    name: name.toLowerCase(),
  });

  // Idempotent by nature: resolving an existing name performs no write,
  // so it answers directly without consuming the Idempotency-Key lease.
  const preexisting = await loadHouseholdCategoryByName(context, name);
  if (preexisting) {
    const { data: counted } = await supabaseAdmin
      .from('assets')
      .select('id')
      .eq('household_id', context.householdId)
      .eq('category_id', preexisting.id);
    return {
      status: 200,
      body: {
        category: {
          id: preexisting.id,
          name: preexisting.name,
          kind: preexisting.kind,
          asset_count: (counted ?? []).length,
          created_at: preexisting.created_at,
        },
        created: false,
      },
    };
  }

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    201,
    async () => {
      const kind = SUGGESTED_ASSET_CATEGORIES.some((suggested) => suggested.toLowerCase() === name.toLowerCase())
        ? 'system'
        : 'custom';
      const { data, error } = await supabaseAdmin
        .from('asset_categories')
        .insert({ household_id: context.householdId, name, kind })
        .select('id, household_id, name, kind, created_at')
        .single();
      if (error) {
        // Unique race: a concurrent create won. Resolve instead of lying.
        if (error.code === '23505') {
          const retry = await loadHouseholdCategoryByName(context, name);
          if (retry) {
            return {
              category: { id: retry.id, name: retry.name, kind: retry.kind, asset_count: 0, created_at: retry.created_at },
              created: false,
            };
          }
        }
        throw createHttpError(500, 'No se pudo crear la categoría.', 'assets_category_create_failed');
      }
      return {
        category: { id: data.id, name: data.name, kind: data.kind, asset_count: 0, created_at: data.created_at },
        created: true,
      };
    },
  );
}

async function loadHouseholdCategoryByName(context, name) {
  const { data, error } = await supabaseAdmin
    .from('asset_categories')
    .select('id, household_id, name, kind, created_at')
    .eq('household_id', context.householdId)
    .ilike('name', name)
    .maybeSingle();
  if (error) throw createHttpError(500, 'No se pudo consultar la categoría.', 'assets_category_read_failed');
  if (!data || data.name.toLowerCase() !== name.toLowerCase()) return null;
  return data;
}

/**
 * DELETE /api/assets/categories/:categoryId — remove ONE household
 * category (CONTRIBUTE, Idempotency-Key required).
 *
 * Referencing Assets resolve to uncategorized through ON DELETE SET NULL:
 * integrity preserved, no corruption, no cascade (§7). Unknown and
 * cross-Household ids answer the same 404 (§45). The response reports how
 * many Assets were unassigned so the caller can explain the outcome.
 */
async function deleteCategory(req, categoryId) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const idempotencyKey = requireIdempotencyKey(req);
  const id = assertValidCategoryId(categoryId);

  const operation = 'assets.category.delete';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    category_id: id,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const category = await loadHouseholdCategory(context, id);
      if (!category) throw createHttpError(404, 'Categoría no encontrada.', 'assets_category_not_found');

      const { data: referencing, error: countError } = await supabaseAdmin
        .from('assets')
        .select('id')
        .eq('household_id', context.householdId)
        .eq('category_id', id);
      if (countError) throw createHttpError(500, 'No se pudo eliminar la categoría.', 'assets_category_delete_failed');
      const unassignedCount = (referencing ?? []).length;

      const { error } = await supabaseAdmin
        .from('asset_categories')
        .delete()
        .eq('id', id)
        .eq('household_id', context.householdId);
      if (error) throw createHttpError(500, 'No se pudo eliminar la categoría.', 'assets_category_delete_failed');

      return {
        deleted: { id: category.id, name: category.name, kind: category.kind },
        unassigned_assets: unassignedCount,
      };
    },
  );
}

// ── A3.3 Profile change (§6, §12, §33, §37, §40, §43, §56, §57) ────────────────

/**
 * Map a change_asset_profile RPC storage failure to the canonical typed
 * error. Raw SQL (constraint names, SQLSTATE, stack) never crosses the HTTP
 * boundary; 42501 is the shared membership-revalidation failure (§44,
 * INV2-AST-083).
 */
function mapProfileChangeRpcError(error) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = 'assets.asset.change_profile';
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'No se pudo cambiar el Profile del activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = 'assets.asset.change_profile';
  return httpError;
}

/**
 * PATCH /api/assets/:assetId/profile — the canonical structural Profile
 * change (A3.3). Body:
 *   { profile: STANDARD|VEHICLE|PET|PROPERTY,
 *     expected_profile: STANDARD|VEHICLE|PET|PROPERTY }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage; CONTRIBUTE alone is never enough (§43:
 *     "MANAGE: Profile change ... blocker resolution").
 *   - expected_profile is mandatory: the Profile dimension conflicts are
 *     evaluated per dimension, never last-write-wins (§56).
 *   - ARCHIVED/TRASH never accept it (§33, §37, UC2-AST-111).
 *   - To PROPERTY: an operational Holder or Placement blocks the change
 *     with a typed 409 until it is resolved EXPLICITLY through its own
 *     dimension endpoint (§12, INV2-AST-019). Nothing is auto-cleared.
 *   - From PROPERTY: operational dependents (ACTIVE/INACTIVE Assets
 *     placed in it) block the change with a typed 409 listing them until
 *     every Placement is reconciled explicitly (§40, INV2-AST-069). Their
 *     lifecycle is never touched (INV2-AST-068).
 *   - A6.1 (§6, UC2-AST-005): specialized identifiers the TARGET profile
 *     does not contemplate block the change with a typed 409 until cleared
 *     explicitly via PATCH /:assetId/identity. brand/model/serial/category
 *     always survive. The check runs in the service for the fast typed
 *     answer AND atomically inside the RPC, so a concurrent identity write
 *     re-validates against the committed structural truth (§57).
 *   - The RPC validates and writes in ONE transaction on the locked row,
 *     so the dependency revalidation is the commit itself (§57,
 *     UC2-AST-096/099) and a concurrent context write re-validates
 *     against the committed structural truth.
 *   - A cross-Household id answers the SAME 404 as an unknown id (§45).
 *   - Idempotent by Idempotency-Key like every other Assets mutation
 *     (§53, UC2-AST-092).
 */
async function changeAssetProfile(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidAssetId(assetId);
  assertBodyFields(body, ['profile', 'expected_profile']);

  if (!Object.prototype.hasOwnProperty.call(body, 'profile')) {
    throw createHttpError(422, 'profile es obligatorio.', 'assets_profile_required');
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'expected_profile')) {
    throw createHttpError(
      422,
      'expected_profile es obligatorio (la escritura nunca es last-write-wins).',
      'assets_expected_profile_required',
    );
  }
  const targetProfile = assertValidProfile(body.profile);
  const expectedProfile = assertValidProfile(body.expected_profile);

  // A6.1 fast guard (§6): identifiers the target profile does not
  // contemplate must be cleared explicitly first. The RPC re-validates
  // atomically (race-safe); this pre-check only produces the early typed
  // answer on the already-committed truth.
  const precheckRow = await loadContextAsset(context, id);
  if (precheckRow.profile !== targetProfile) {
    const allowed = IDENTITY_ALLOWED_KEYS[targetProfile] ?? [];
    const currentKeys = precheckRow.identifiers && typeof precheckRow.identifiers === 'object' && !Array.isArray(precheckRow.identifiers)
      ? Object.keys(precheckRow.identifiers)
      : [];
    const blocking = currentKeys.filter((key) => !allowed.includes(key)).sort();
    if (blocking.length > 0) {
      throw createHttpError(
        409,
        'El activo tiene identificadores que el Profile destino no contempla: limpialos explícitamente antes del cambio.',
        'assets_profile_change_identifiers_conflict',
        { blocking_keys: blocking, current_identifiers: currentIdentityProjection(precheckRow).identifiers },
      );
    }
  }

  const idempotencyKey = parseIdempotencyKey(req);
  const operation = 'assets.asset.change_profile';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    profile: targetProfile,
    expected_profile: expectedProfile,
  });

  const mutate = async () => {
    const { data, error } = await supabaseAdmin.rpc('change_asset_profile', {
      p_household_id: context.householdId,
      p_actor_member_id: context.membershipId,
      p_asset_id: id,
      p_expected_profile: expectedProfile,
      p_new_profile: targetProfile,
    });
    if (error) {
      throw mapProfileChangeRpcError(error);
    }

    const outcome = data ?? {};
    if (outcome.status === 'not_found') {
      throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
    }
    if (outcome.status === 'invalid_profile') {
      throw createHttpError(
        400,
        `Profile inválido. Debe ser uno de: ${ASSET_PROFILES.join(', ')}.`,
        'assets_invalid_profile',
        { allowed_profiles: ASSET_PROFILES },
      );
    }
    if (outcome.status === 'lifecycle_readonly') {
      throw createHttpError(
        409,
        'El activo no admite cambios estructurales en su lifecycle actual.',
        'assets_lifecycle_readonly',
        { lifecycle_status: outcome.lifecycle_status, allowed_lifecycle: CONTEXT_EDITABLE_LIFECYCLE },
      );
    }
    if (outcome.status === 'conflict') {
      throw createHttpError(
        409,
        'El Profile del activo cambió mientras lo editabas. Actualizá y reintentá.',
        'assets_profile_conflict',
        { current_profile: outcome.current_profile },
      );
    }
    if (outcome.status === 'blocked') {
      if (outcome.code === 'context_conflict') {
        throw createHttpError(
          409,
          'El activo tiene Holder/Placement operativos: resolvélos explícitamente antes de convertirlo en PROPERTY.',
          'assets_profile_change_context_conflict',
          { blockers: outcome.blockers },
        );
      }
      if (outcome.code === 'identifiers_conflict') {
        throw createHttpError(
          409,
          'El activo tiene identificadores que el Profile destino no contempla: limpialos explícitamente antes del cambio.',
          'assets_profile_change_identifiers_conflict',
          { blocking_keys: outcome.blocking_keys, current_identifiers: outcome.current_identifiers },
        );
      }
      throw createHttpError(
        409,
        'La Property tiene Assets ubicados: reconciliá sus Placement explícitamente antes de cambiar el Profile.',
        'assets_profile_change_dependents',
        { dependents: outcome.dependents },
      );
    }
    if (outcome.status !== 'changed') {
      throw createHttpError(500, 'No se pudo cambiar el Profile del activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }

    const asset = await loadAssetWithContext(context, id);
    if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
    return { asset };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

// ── A6.2 Operational lifecycle & Archive (§30-§36, §40, §43, §53-§59) ─────────

/**
 * PATCH /api/assets/:assetId/lifecycle — ACTIVE <-> INACTIVE.
 *
 * Body:
 *   { lifecycle_status: ACTIVE|INACTIVE,
 *     expected_lifecycle_status: ACTIVE|INACTIVE }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.contribute (§43: "ACTIVE↔INACTIVE" is CONTRIBUTE).
 *   - Both states keep ordinary editing; the transition touches NOTHING
 *     else: no Records, no Care, no Responsible/Holder/Placement, no
 *     future Planner work changes (INV2-AST-050).
 *   - expected_lifecycle_status is mandatory: the write is ONE atomic RPC
 *     on the locked row conditioned on the current lifecycle, never
 *     last-write-wins (§56). A stale snapshot answers a typed 409 with
 *     the current state.
 *   - ARCHIVED/TRASH never accept it (§33, §37): they answer a typed 409
 *     pointing at the archive/unarchive path. ARCHIVED/TRASH targets in
 *     the body answer a typed 400 (wrong endpoint, never silent).
 *   - Idempotent: same canonical intent replays the same success, with or
 *     without an Idempotency-Key (§53, UC2-AST-092).
 */
async function setAssetLifecycleStatus(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidAssetId(assetId);
  assertBodyFields(body, ['lifecycle_status', 'expected_lifecycle_status']);

  if (!Object.prototype.hasOwnProperty.call(body, 'lifecycle_status')) {
    throw createHttpError(422, 'lifecycle_status es obligatorio.', 'assets_lifecycle_status_required');
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'expected_lifecycle_status')) {
    throw createHttpError(
      422,
      'expected_lifecycle_status es obligatorio (la escritura nunca es last-write-wins).',
      'assets_expected_lifecycle_required',
    );
  }
  const target = assertValidLifecycleStatus(body.lifecycle_status, 'assets_invalid_lifecycle_status');
  const expected = assertValidLifecycleStatus(body.expected_lifecycle_status, 'assets_invalid_expected_lifecycle_status');

  const idempotencyKey = parseIdempotencyKey(req);
  const operation = 'assets.asset.set_lifecycle_status';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    lifecycle_status: target,
    expected_lifecycle_status: expected,
  });

  const mutate = async () => {
    const { data, error } = await supabaseAdmin.rpc('set_asset_operational_status', {
      p_household_id: context.householdId,
      p_actor_member_id: context.membershipId,
      p_asset_id: id,
      p_expected_lifecycle: expected,
      p_new_lifecycle: target,
    });
    if (error) throw mapLifecycleRpcError(error, operation);

    const outcome = data ?? {};
    if (outcome.status === 'not_found') {
      throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
    }
    if (outcome.status === 'invalid_lifecycle') {
      throw createHttpError(
        400,
        `lifecycle_status inválido. Debe ser uno de: ${OPERATIONAL_LIFECYCLE.join(', ')}.`,
        'assets_invalid_lifecycle_status',
        { allowed_lifecycle_status: OPERATIONAL_LIFECYCLE },
      );
    }
    if (outcome.status === 'lifecycle_readonly') {
      throw createHttpError(
        409,
        'El activo no admite cambios operativos de lifecycle en su estado actual: usá el flujo de archivado.',
        'assets_lifecycle_readonly',
        { lifecycle_status: outcome.lifecycle_status },
      );
    }
    if (outcome.status === 'conflict') {
      throw createHttpError(
        409,
        'El lifecycle del activo cambió mientras lo editabas. Actualizá y reintentá.',
        'assets_lifecycle_conflict',
        { current_lifecycle_status: outcome.current_lifecycle_status },
      );
    }
    if (outcome.status !== 'changed') {
      throw createHttpError(500, 'No se pudo modificar el lifecycle del activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }

    const asset = await loadAssetWithContext(context, id);
    if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
    return { asset };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

/**
 * POST /api/assets/:assetId/archive — ACTIVE/INACTIVE -> ARCHIVED.
 *
 * Body:
 *   { expected_lifecycle_status: ACTIVE|INACTIVE,
 *     disposition?: SOLD|GIFTED|DISPOSED|LOST|STOLEN|REPLACED|DECEASED|OTHER,
 *     disposition_note?: string }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43: "Archive/Unarchive ... Disposition").
 *   - inspect -> resolve -> revalidate -> commit in ONE RPC transaction
 *     on the locked row (§34, §57). A stale snapshot answers a typed
 *     409; an already-ARCHIVED row answers already_archived (no
 *     duplicate episodes from a fresh double-tap — true retries replay
 *     through the Idempotency-Key layer, §53).
 *   - The commit ends the operational R/H/P context (live columns
 *     NULLed) and preserves the last human-readable values in the new
 *     episode row (§33). Ended context can never silently resurrect
 *     because the live columns no longer hold it (§36).
 *   - Records, Care and their identities survive untouched (§33,
 *     INV2-AST-051). Nothing is cascaded.
 *   - PROPERTY assets with operational dependents are BLOCKED with the
 *     typed dependents list until every Placement is reconciled
 *     explicitly (other Property, free-text place, or clear — §40).
 *     No partial writes.
 *   - Disposition is optional (INV2-AST-056); OTHER requires a human
 *     explanation (INV2-AST-057). REPLACED is an exit reason only: no
 *     successor relation is created (removed from roadmap by user
 *     decision; Freeze §39 discrepancy recorded, not implemented).
 *   - Planner integration is CONNECTED (S7): an Asset can create real Planner
 *     Tasks/Events carrying the immutable origin quartet, and the Asset read
 *     model "Proximo" lists them. The response reports planner:'connected'
 *     honestly. Recurrence from Assets is still NOT supported (S7 V1 rejects
 *     it with 400 assets_planner_recurrence_not_supported); that limitation
 *     is enforced at the facade, not reported through this projection.
 *   - Idempotency-Key is required (destructive operation, §53, §57).
 */
async function archiveAsset(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidAssetId(assetId);
  const idempotencyKey = requireIdempotencyKey(req);
  assertBodyFields(body, ['expected_lifecycle_status', 'disposition', 'disposition_note']);

  if (!Object.prototype.hasOwnProperty.call(body, 'expected_lifecycle_status')) {
    throw createHttpError(
      422,
      'expected_lifecycle_status es obligatorio (no se archiva sobre snapshots obsoletos).',
      'assets_expected_lifecycle_required',
    );
  }
  const expected = assertValidLifecycleStatus(body.expected_lifecycle_status, 'assets_invalid_expected_lifecycle_status');
  const disposition = parseArchiveDisposition(body.disposition);
  const dispositionNote = parseDispositionNote(body.disposition_note);
  if (disposition === 'OTHER' && dispositionNote === null) {
    throw createHttpError(
      422,
      'OTHER exige una explicación humana (disposition_note).',
      'assets_disposition_note_required',
    );
  }
  if (disposition !== 'OTHER' && dispositionNote !== null) {
    throw createHttpError(
      400,
      'disposition_note sólo se acepta junto a disposition OTHER.',
      'assets_disposition_note_not_accepted',
    );
  }

  const operation = 'assets.asset.archive';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    expected_lifecycle_status: expected,
    disposition,
    disposition_note: dispositionNote,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('archive_asset', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_asset_id: id,
        p_expected_lifecycle: expected,
        p_disposition: disposition,
        p_disposition_note: dispositionNote,
      });
      if (error) throw mapLifecycleRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      }
      if (outcome.status === 'invalid_lifecycle') {
        throw createHttpError(
          400,
          `expected_lifecycle_status inválido. Debe ser uno de: ${OPERATIONAL_LIFECYCLE.join(', ')}.`,
          'assets_invalid_expected_lifecycle_status',
          { allowed_lifecycle_status: OPERATIONAL_LIFECYCLE },
        );
      }
      if (outcome.status === 'invalid_disposition') {
        throw createHttpError(
          400,
          `Disposition inválida. Debe ser una de: ${ARCHIVE_DISPOSITIONS.join(', ')}.`,
          'assets_invalid_disposition',
          { allowed_dispositions: ARCHIVE_DISPOSITIONS },
        );
      }
      if (outcome.status === 'invalid_disposition_note') {
        throw createHttpError(
          400,
          'disposition_note inválida: OTHER exige explicación humana y ningún otro motivo la acepta.',
          'assets_invalid_disposition_note',
        );
      }
      if (outcome.status === 'already_archived') {
        throw createHttpError(
          409,
          'El activo ya está archivado: no se crea un episodio duplicado.',
          'assets_already_archived',
          { lifecycle_status: outcome.lifecycle_status },
        );
      }
      if (outcome.status === 'lifecycle_readonly') {
        throw createHttpError(
          409,
          'El activo no admite archivado en su lifecycle actual.',
          'assets_lifecycle_readonly',
          { lifecycle_status: outcome.lifecycle_status },
        );
      }
      if (outcome.status === 'conflict') {
        throw createHttpError(
          409,
          'El activo cambió mientras lo archivabas. Actualizá y reintentá.',
          'assets_archive_conflict',
          { current_lifecycle_status: outcome.current_lifecycle_status },
        );
      }
      if (outcome.status === 'blocked') {
        throw createHttpError(
          409,
          'La Property tiene Assets con Placement operacional: reconciliá sus ubicaciones explícitamente antes de archivar.',
          'assets_archive_blocked_dependents',
          {
            dependents: outcome.dependents ?? [],
            dependent_count: outcome.dependent_count ?? 0,
            resolution_hint: outcome.resolution_hint ?? 'reconcile_placement_then_retry',
          },
        );
      }
      if (outcome.status !== 'archived') {
        throw createHttpError(500, 'No se pudo archivar el activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const asset = await loadAssetWithContext(context, id);
      if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      return {
        asset,
        episode: {
          id: outcome.episode_id,
          episode_number: outcome.episode_number,
          from_lifecycle: outcome.from_lifecycle,
          disposition: outcome.disposition ?? null,
          archived_at: outcome.archived_at,
        },
        integrations: { planner: 'connected' },
      };
    },
  );
}

/**
 * POST /api/assets/:assetId/unarchive — ARCHIVED -> exact previous state.
 *
 * Body:
 *   { expected_lifecycle_status: 'ARCHIVED' }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43).
 *   - ACTIVE->ARCHIVED->ACTIVE and INACTIVE->ARCHIVED->INACTIVE (§36).
 *     Never a silent fallback to ACTIVE: a missing or corrupt
 *     archived_from blocks with a typed outcome carrying the resolution
 *     hint (BLOCK -> explain -> resolve -> retry).
 *   - The previous episode is CLOSED as history, never deleted or
 *     overwritten; after unarchive the disposition survives ONLY there
 *     (INV2-AST-058).
 *   - Ended Responsible/Holder/Placement are NEVER restored, recurrence
 *     and automations are never reactivated (§36).
 *   - Records and Care are untouched.
 *   - Idempotency-Key is required (destructive operation, §53, §57).
 */
async function unarchiveAsset(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidAssetId(assetId);
  const idempotencyKey = requireIdempotencyKey(req);
  assertBodyFields(body, ['expected_lifecycle_status']);

  if (!Object.prototype.hasOwnProperty.call(body, 'expected_lifecycle_status')) {
    throw createHttpError(
      422,
      'expected_lifecycle_status es obligatorio (debe ser ARCHIVED).',
      'assets_expected_lifecycle_required',
    );
  }
  if (body.expected_lifecycle_status !== 'ARCHIVED') {
    throw createHttpError(
      400,
      "expected_lifecycle_status inválido: para desarchivar debe ser 'ARCHIVED'.",
      'assets_invalid_expected_lifecycle_status',
      { allowed_expected: ['ARCHIVED'] },
    );
  }

  const operation = 'assets.asset.unarchive';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    expected_lifecycle_status: 'ARCHIVED',
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('unarchive_asset', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_asset_id: id,
        p_expected_lifecycle: 'ARCHIVED',
      });
      if (error) throw mapLifecycleRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      }
      if (outcome.status === 'already_operational') {
        throw createHttpError(
          409,
          'El activo ya está en estado operacional: no hay nada que desarchivar.',
          'assets_already_operational',
          { lifecycle_status: outcome.lifecycle_status },
        );
      }
      if (outcome.status === 'lifecycle_readonly') {
        throw createHttpError(
          409,
          'El activo no admite desarchivado en su lifecycle actual.',
          'assets_lifecycle_readonly',
          { lifecycle_status: outcome.lifecycle_status },
        );
      }
      if (outcome.status === 'conflict') {
        throw createHttpError(
          409,
          'El activo cambió mientras lo desarchivabas. Actualizá y reintentá.',
          'assets_unarchive_conflict',
          { current_lifecycle_status: outcome.current_lifecycle_status },
        );
      }
      if (outcome.status === 'blocked') {
        throw createHttpError(
          409,
          'El estado operacional previo ya no es válido: resolvé el destino y reintentá (nunca se elige ACTIVE automáticamente).',
          'assets_unarchive_blocked',
          { requires_resolution: true, resolution_hint: outcome.resolution_hint ?? 'resolve_target_lifecycle_then_retry' },
        );
      }
      if (outcome.status !== 'unarchived') {
        throw createHttpError(500, 'No se pudo desarchivar el activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const asset = await loadAssetWithContext(context, id);
      if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      return {
        asset,
        restored_to: outcome.restored_to,
        episode_closed: outcome.episode_closed === true,
      };
    },
  );
}

/**
 * GET /api/assets/:assetId/archive-history — every archive episode.
 *
 * The append-only history (§35): each archive is its own episode with
 * motive, last historical context and timestamps. Closed episodes keep
 * their disposition after unarchive (INV2-AST-058). Requires
 * assets.view. Unknown and cross-Household ids answer the same 404
 * (§45).
 */
async function getArchiveHistory(req, assetId) {
  const context = await contextWithCapability(req, 'assets.view');
  const id = assertValidAssetId(assetId);

  await loadContextAsset(context, id);

  const { data: episodes, error } = await supabaseAdmin
    .from('asset_archive_episodes')
    .select(EPISODE_FIELDS)
    .eq('household_id', context.householdId)
    .eq('asset_id', id)
    .order('episode_number', { ascending: true });
  if (error) {
    throw createHttpError(500, 'No se pudo consultar el historial del activo.', 'assets_archive_history_failed');
  }

  return {
    asset_id: id,
    episodes: (episodes ?? []).map(mapEpisodeRowToDto),
  };
}

// ── A6.3 Recoverable Trash & Restore (§37, §38, §40, §43, §53-§59) ────────────

/**
 * POST /api/assets/:assetId/trash — ACTIVE/INACTIVE/ARCHIVED -> TRASH.
 *
 * Body:
 *   { expected_lifecycle_status: ACTIVE|INACTIVE|ARCHIVED }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43: "Trash/Restore ... blocker resolution").
 *   - Recoverable removal from the normal corpus, NEVER a physical
 *     DELETE (INV2-AST-074). Identity, metadata, category, R/H/P,
 *     archive episodes, Records, Care and history survive untouched
 *     (INV2-AST-070). Nothing is cascaded (INV2-AST-068).
 *   - inspect -> resolve -> revalidate -> commit in ONE RPC transaction
 *     on the locked row (§37, §57). A stale snapshot answers a typed
 *     409; an already-TRASH row answers already_trashed (no duplicate
 *     episodes from a fresh double-tap — true retries replay through the
 *     Idempotency-Key layer, §53).
 *   - PROPERTY assets with operational dependents are BLOCKED with the
 *     typed dependents list until every Placement is reconciled
 *     explicitly (other Property, free-text place, or justified
 *     clear — §40). No partial writes.
 *   - The previous logical lifecycle is recorded exactly in trashed_from
 *     and in the append-only trash episode.
 *   - Idempotency-Key is required (destructive operation, §53, §57).
 */
async function trashAsset(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidAssetId(assetId);
  const idempotencyKey = requireIdempotencyKey(req);
  assertBodyFields(body, ['expected_lifecycle_status']);

  if (!Object.prototype.hasOwnProperty.call(body, 'expected_lifecycle_status')) {
    throw createHttpError(
      422,
      'expected_lifecycle_status es obligatorio (no se abandona un activo sobre snapshots obsoletos).',
      'assets_expected_lifecycle_required',
    );
  }
  const expected = body.expected_lifecycle_status;
  if (typeof expected !== 'string' || !TRASHABLE_LIFECYCLE.includes(expected)) {
    throw createHttpError(
      400,
      `expected_lifecycle_status inválido. Debe ser uno de: ${TRASHABLE_LIFECYCLE.join(', ')}.`,
      'assets_invalid_expected_lifecycle_status',
      { allowed_lifecycle_status: TRASHABLE_LIFECYCLE },
    );
  }

  const operation = 'assets.asset.trash';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    expected_lifecycle_status: expected,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('trash_asset', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_asset_id: id,
        p_expected_lifecycle: expected,
      });
      if (error) throw mapLifecycleRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      }
      if (outcome.status === 'invalid_lifecycle') {
        throw createHttpError(
          400,
          `expected_lifecycle_status inválido. Debe ser uno de: ${TRASHABLE_LIFECYCLE.join(', ')}.`,
          'assets_invalid_expected_lifecycle_status',
          { allowed_lifecycle_status: TRASHABLE_LIFECYCLE },
        );
      }
      if (outcome.status === 'already_trashed') {
        throw createHttpError(
          409,
          'El activo ya está en la papelera: no se crea un episodio duplicado.',
          'assets_already_trashed',
          { lifecycle_status: outcome.lifecycle_status, trashed_from: outcome.trashed_from ?? null },
        );
      }
      if (outcome.status === 'conflict') {
        throw createHttpError(
          409,
          'El activo cambió mientras lo enviabas a la papelera. Actualizá y reintentá.',
          'assets_trash_conflict',
          { current_lifecycle_status: outcome.current_lifecycle_status },
        );
      }
      if (outcome.status === 'blocked') {
        throw createHttpError(
          409,
          'La Property tiene Assets con Placement operacional: reconciliá sus ubicaciones explícitamente antes de enviarla a la papelera.',
          'assets_trash_blocked_dependents',
          {
            dependents: outcome.dependents ?? [],
            dependent_count: outcome.dependent_count ?? 0,
            resolution_hint: outcome.resolution_hint ?? 'reconcile_placement_then_retry',
          },
        );
      }
      if (outcome.status !== 'trashed') {
        throw createHttpError(500, 'No se pudo enviar el activo a la papelera.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const asset = await loadAssetWithContext(context, id);
      if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      return {
        asset,
        trash_episode: {
          id: outcome.episode_id,
          episode_number: outcome.episode_number,
          from_lifecycle: outcome.from_lifecycle,
          trashed_at: outcome.trashed_at,
        },
      };
    },
  );
}

/**
 * POST /api/assets/:assetId/restore — TRASH -> exact previous lifecycle.
 *
 * Body:
 *   { expected_lifecycle_status: 'TRASH' }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43).
 *   - TRASH -> previous valid logical lifecycle (§38, INV2-AST-061):
 *     ACTIVE/INACTIVE/ARCHIVED exactly as recorded. Never a silent
 *     fallback to ACTIVE: a missing or corrupt trashed_from blocks with
 *     a typed outcome carrying the resolution hint (BLOCK -> explain ->
 *     resolve -> retry, INV2-AST-062).
 *   - Destination dependencies are revalidated at commit (§57): an
 *     operational destination whose Placement Property left the
 *     operational corpus blocks with a typed outcome instead of
 *     resurrecting an invalid relation (INV2-AST-063/071).
 *   - The previous trash episode is CLOSED as history, never deleted or
 *     overwritten. Ended relations, removed Records/Care, recurrence
 *     and automations are NEVER recreated (§38).
 *   - Permissions, relations and Household are revalidated during the
 *     operation (INV2-AST-083/084).
 *   - Idempotency-Key is required (§53, §57).
 */
async function restoreAsset(req, assetId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidAssetId(assetId);
  const idempotencyKey = requireIdempotencyKey(req);
  assertBodyFields(body, ['expected_lifecycle_status']);

  if (!Object.prototype.hasOwnProperty.call(body, 'expected_lifecycle_status')) {
    throw createHttpError(
      422,
      'expected_lifecycle_status es obligatorio (debe ser TRASH).',
      'assets_expected_lifecycle_required',
    );
  }
  if (body.expected_lifecycle_status !== 'TRASH') {
    throw createHttpError(
      400,
      "expected_lifecycle_status inválido: para restaurar debe ser 'TRASH'.",
      'assets_invalid_expected_lifecycle_status',
      { allowed_expected: ['TRASH'] },
    );
  }

  const operation = 'assets.asset.restore';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: id,
    expected_lifecycle_status: 'TRASH',
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('restore_asset', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_asset_id: id,
        p_expected_lifecycle: 'TRASH',
      });
      if (error) throw mapLifecycleRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      }
      if (outcome.status === 'not_trashed') {
        throw createHttpError(
          409,
          'El activo no está en la papelera: no hay nada que restaurar.',
          'assets_not_trashed',
          { lifecycle_status: outcome.lifecycle_status },
        );
      }
      if (outcome.status === 'conflict') {
        throw createHttpError(
          409,
          'El activo cambió mientras lo restaurabas. Actualizá y reintentá.',
          'assets_restore_conflict',
          { current_lifecycle_status: outcome.current_lifecycle_status },
        );
      }
      if (outcome.status === 'blocked' && outcome.code === 'invalid_placement') {
        throw createHttpError(
          409,
          'La Property del Placement ya no es operacional: restaurá la Property y reintentá (nunca se elige un estado sustituto).',
          'assets_restore_blocked_placement',
          {
            requires_resolution: true,
            placement_property_asset_id: outcome.placement_property_asset_id ?? null,
            property_lifecycle_status: outcome.property_lifecycle_status ?? null,
            resolution_hint: outcome.resolution_hint ?? 'restore_property_then_retry',
          },
        );
      }
      if (outcome.status === 'blocked') {
        throw createHttpError(
          409,
          'El estado previo registrado ya no es válido: resolvé el destino y reintentá (nunca se elige ACTIVE automáticamente).',
          'assets_restore_blocked',
          { requires_resolution: true, resolution_hint: outcome.resolution_hint ?? 'resolve_target_lifecycle_then_retry' },
        );
      }
      if (outcome.status !== 'restored') {
        throw createHttpError(500, 'No se pudo restaurar el activo.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const asset = await loadAssetWithContext(context, id);
      if (!asset) throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
      return {
        asset,
        restored_to: outcome.restored_to,
        trash_episode_closed: outcome.episode_closed === true,
      };
    },
  );
}

/**
 * GET /api/assets/:assetId/trash-history — every trash episode.
 *
 * The append-only trash history (§37, §38): one row per trash episode
 * with its origin, actor and close. Requires assets.view. Unknown and
 * cross-Household ids answer the same 404 (§45).
 */
async function getTrashHistory(req, assetId) {
  const context = await contextWithCapability(req, 'assets.view');
  const id = assertValidAssetId(assetId);

  await loadContextAsset(context, id);

  const { data: episodes, error } = await supabaseAdmin
    .from('asset_trash_episodes')
    .select(TRASH_EPISODE_FIELDS)
    .eq('household_id', context.householdId)
    .eq('asset_id', id)
    .order('episode_number', { ascending: true });
  if (error) {
    throw createHttpError(500, 'No se pudo consultar el historial del activo.', 'assets_trash_history_failed');
  }

  return {
    asset_id: id,
    episodes: (episodes ?? []).map(mapTrashEpisodeRowToDto),
  };
}

// ── A4.1 Asset Records (§14-§16, §41, §43, §45) ────────────────────────────────

/**
 * Authority: HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0 §14, §15, §16, §41, §43,
 * §45, §53, §56.
 *
 * An Asset Record is formal or structured information (WARRANTY, INSURANCE,
 * REGISTRATION, INSPECTION, SERVICE_CONTRACT, OTHER) related to 1..N Assets
 * of the caller's Household. A shared Record is ONE canonical object, never
 * a child copy per Asset (§15, INV2-AST-022): the record row is single and
 * the Record↔Asset links live in their own table, each pointing at the
 * validity period that covers that Asset. That structure is the contractual
 * answer to partial renewal (§16, INV2-AST-026/027): a global expiry on a
 * shared Record cannot survive "renew only some of its Assets", so validity
 * is a per-period entity referenced per link.
 *
 * Scope of A4.1: create (CONTRIBUTE, atomic with its initial relations),
 * read one authorized Record and list the Records of one Asset (VIEW).
 * NO Correction, NO Renewal, NO Link/Unlink administration, NO
 * Remove/Restore and NO File/Planner/Finance relations: those belong to
 * later slices. The persistence layer already supports them structurally
 * (periods, ended_at, status) without reestructuración.
 *
 * Security shape:
 *   - The Household is ALWAYS derived from the authenticated context (§24,
 *     §59, INV2-AST-084).
 *   - Creation targets are validated inside the same transaction that
 *     writes: no Record huérfano, no partial creation (UC2-AST-091).
 *   - Unknown, cross-Household and TRASH targets answer the SAME typed
 *     error so nothing restricted is disclosed (§37, §45).
 *   - Cross-Household Record ids answer the same 404 as unknown ids (§45).
 *   - Create is idempotent by Idempotency-Key (§53, UC2-AST-092).
 */

const ASSET_RECORD_TYPES = Object.freeze([
  'WARRANTY',
  'INSURANCE',
  'REGISTRATION',
  'INSPECTION',
  'SERVICE_CONTRACT',
  'OTHER',
]);

const RECORD_FIELD_MAX_LENGTH = 200;
const RECORD_NOTES_MAX_LENGTH = 5000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function assertValidRecordType(type) {
  if (typeof type !== 'string' || !ASSET_RECORD_TYPES.includes(type)) {
    throw createHttpError(
      400,
      `Tipo de Record inválido. Debe ser uno de: ${ASSET_RECORD_TYPES.join(', ')}.`,
      'assets_invalid_record_type',
      { allowed_types: ASSET_RECORD_TYPES },
    );
  }
  return type;
}

function assertValidRecordTitle(title) {
  if (typeof title !== 'string' || !title.trim()) {
    throw createHttpError(400, 'El título del Record es obligatorio.', 'assets_invalid_record_title');
  }
  const trimmed = title.trim();
  if (trimmed.length > RECORD_FIELD_MAX_LENGTH) {
    throw createHttpError(
      400,
      `El título debe tener como máximo ${RECORD_FIELD_MAX_LENGTH} caracteres.`,
      'assets_invalid_record_title',
    );
  }
  return trimmed;
}

function parseOptionalRecordTextField(value, maxLength, errorCode) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw createHttpError(400, 'Campo de texto del Record inválido.', errorCode);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw createHttpError(
      400,
      `El campo debe tener como máximo ${maxLength} caracteres.`,
      errorCode,
    );
  }
  return trimmed;
}

/**
 * Validity is INFORMATION (§14, UC2-AST-024, INV2-AST-028): both dates are
 * optional dates without invented precision. When both exist, the window
 * must be coherent. A Record without dates simply has no temporal validity
 * (no period row is created and its links carry no period).
 */
function assertValidRecordValidity(validFrom, validUntil) {
  function parseOne(value, fieldCode) {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string' || !isValidIsoDate(value.trim())) {
      throw createHttpError(
        400,
        `${fieldCode} inválido: debe ser una fecha ISO (YYYY-MM-DD) o null.`,
        'assets_invalid_record_validity',
      );
    }
    return value.trim();
  }
  const from = parseOne(validFrom, 'valid_from');
  const until = parseOne(validUntil, 'valid_until');
  if (from !== null && until !== null && from > until) {
    throw createHttpError(
      400,
      'valid_from no puede ser posterior a valid_until.',
      'assets_invalid_record_validity',
    );
  }
  return { valid_from: from, valid_until: until };
}

/**
 * The initial relation set: 1..N Asset ids of the caller's Household.
 * Repeated ids are ONE canonical relation, never two (§15).
 */
function parseRecordAssetIds(assetIds) {
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw createHttpError(
      422,
      'asset_ids es obligatorio: un Record se crea con al menos un Asset relacionado.',
      'assets_record_assets_required',
    );
  }
  const ids = [];
  const seen = new Set();
  for (const candidate of assetIds) {
    if (typeof candidate !== 'string' || !UUID_PATTERN.test(candidate.trim())) {
      throw createHttpError(
        400,
        'La referencia no corresponde a Assets válidos de tu Household.',
        'assets_invalid_record_asset',
      );
    }
    const id = candidate.trim();
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function assertValidRecordId(recordId) {
  if (typeof recordId !== 'string' || !UUID_PATTERN.test(recordId.trim())) {
    throw createHttpError(400, 'recordId inválido.', 'assets_invalid_record_id');
  }
  return recordId.trim();
}

/**
 * Map a create_asset_record RPC storage failure to the canonical typed
 * error. Raw SQL never crosses the HTTP boundary; 42501 is the shared
 * membership-revalidation failure (§44, INV2-AST-083).
 */
function mapRecordCreateRpcError(error) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = 'assets.record.create';
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'No se pudo crear el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = 'assets.record.create';
  return httpError;
}

// ── Record DTO projection ──────────────────────────────────────────────────────

const RECORD_FIELDS = [
  'id',
  'household_id',
  'type',
  'title',
  'issuer',
  'identifier',
  'notes',
  'status',
  'created_at',
  'updated_at',
].join(', ');

/**
 * Load the Records of the caller's Household by id, with their full
 * shared projection: periods (validity windows) and assets (active links
 * with the validity that covers each one). A Record belonging to ANOTHER
 * Household is simply absent here, so the caller answers the same 404 as
 * for an unknown id (§45).
 *
 * By default only ACTIVE Records are projected (the normal corpus, §28,
 * §41): REMOVED Records never appear in normal operational reads. Pass
 * { includeRemoved: true } ONLY for the mutation responses and the
 * authorized recovery scope that must keep addressing an explicitly
 * removed Record (Remove/Restore/Link/Unlink outcomes, scope=removed
 * list). The Household boundary applies identically in both modes.
 */
async function loadRecordDtos(context, recordIds, options = {}) {
  const dtos = new Map();
  if (!recordIds || recordIds.length === 0) return dtos;
  const includeRemoved = options.includeRemoved === true;

  let recordQuery = supabaseAdmin
    .from('assets_records')
    .select(RECORD_FIELDS)
    .eq('household_id', context.householdId)
    .in('id', recordIds);
  if (!includeRemoved) {
    recordQuery = recordQuery.eq('status', 'ACTIVE');
  }
  const { data: recordRows, error: recordError } = await recordQuery;
  if (recordError) {
    throw createHttpError(500, 'No se pudo consultar el Record.', 'assets_records_read_failed');
  }
  if (!recordRows || recordRows.length === 0) return dtos;

  const ids = recordRows.map((row) => row.id);

  const { data: linkRows, error: linkError } = await supabaseAdmin
    .from('assets_record_links')
    .select('id, record_id, period_id, asset_id, linked_at')
    .in('record_id', ids)
    .is('ended_at', null);
  if (linkError) {
    throw createHttpError(500, 'No se pudo consultar el Record.', 'assets_records_read_failed');
  }

  const { data: periodRows, error: periodError } = await supabaseAdmin
    .from('assets_record_periods')
    .select('id, record_id, valid_from, valid_until, created_at, updated_at')
    .in('record_id', ids);
  if (periodError) {
    throw createHttpError(500, 'No se pudo consultar el Record.', 'assets_records_read_failed');
  }

  const assetIds = [...new Set((linkRows ?? []).map((link) => link.asset_id))];
  const { data: assetRows, error: assetError } = await supabaseAdmin
    .from('assets')
    .select('id, name, lifecycle_status')
    .eq('household_id', context.householdId)
    .in('id', assetIds);
  if (assetError) {
    throw createHttpError(500, 'No se pudo consultar el Record.', 'assets_records_read_failed');
  }

  const periodsById = new Map((periodRows ?? []).map((period) => [period.id, period]));
  const assetsById = new Map((assetRows ?? []).map((asset) => [asset.id, asset]));
  const linksByRecord = new Map();
  for (const link of linkRows ?? []) {
    if (!linksByRecord.has(link.record_id)) linksByRecord.set(link.record_id, []);
    linksByRecord.get(link.record_id).push(link);
  }
  const periodsByRecord = new Map();
  for (const period of periodRows ?? []) {
    if (!periodsByRecord.has(period.record_id)) periodsByRecord.set(period.record_id, []);
    periodsByRecord.get(period.record_id).push(period);
  }

  for (const row of recordRows) {
    const links = (linksByRecord.get(row.id) ?? [])
      .slice()
      .sort((a, b) => (a.linked_at < b.linked_at ? -1 : a.linked_at > b.linked_at ? 1 : a.asset_id.localeCompare(b.asset_id)));
    dtos.set(row.id, {
      id: row.id,
      household_id: row.household_id,
      type: row.type,
      title: row.title,
      issuer: row.issuer ?? null,
      identifier: row.identifier ?? null,
      notes: row.notes ?? null,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      periods: (periodsByRecord.get(row.id) ?? [])
        .slice()
        .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id.localeCompare(b.id)))
        .map((period) => ({
          id: period.id,
          valid_from: period.valid_from ?? null,
          valid_until: period.valid_until ?? null,
          created_at: period.created_at,
          updated_at: period.updated_at,
        })),
      assets: links.map((link) => {
        const period = link.period_id ? periodsById.get(link.period_id) : null;
        const asset = assetsById.get(link.asset_id);
        return {
          asset_id: link.asset_id,
          asset_name: asset?.name ?? null,
          asset_lifecycle_status: asset?.lifecycle_status ?? null,
          linked_at: link.linked_at,
          valid_from: period?.valid_from ?? null,
          valid_until: period?.valid_until ?? null,
        };
      }),
    });
  }
  return dtos;
}

// ── A4.1 operations ─────────────────────────────────────────────────────────────

/**
 * POST /api/assets/records — create one canonical Asset Record with its
 * initial relations. Body:
 *   { type, title, issuer?, identifier?, notes?,
 *     valid_from?: YYYY-MM-DD|null, valid_until?: YYYY-MM-DD|null,
 *     asset_ids: [uuid, ...] }
 *
 * One atomic RPC creates the Record, its (optional) validity period and
 * every initial link: no partial Record can exist (UC2-AST-091). Targets
 * must belong to the caller's Household; TRASH Assets reject new relations
 * (§37, INV2-AST-071) and ARCHIVED Assets accept them as historical
 * evidence (§33, UC2-AST-110). Requires assets.contribute (§43) and an
 * Idempotency-Key (§53).
 */
async function createAssetRecord(req, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const idempotencyKey = requireIdempotencyKey(req);
  // The Household is ALWAYS derived from the authenticated context (§24,
  // §59): a body value is rejected, a null is ignored (same semantics as
  // the Asset create).
  if (Object.prototype.hasOwnProperty.call(body, 'household_id') && body.household_id !== undefined && body.household_id !== null) {
    throw createHttpError(
      400,
      'household_id no se acepta: el Household se deriva del contexto autenticado.',
      'assets_household_not_accepted',
    );
  }
  const recordBody = { ...body };
  delete recordBody.household_id;
  assertBodyFields(recordBody, [
    'type',
    'title',
    'issuer',
    'identifier',
    'notes',
    'valid_from',
    'valid_until',
    'asset_ids',
  ]);
  const type = assertValidRecordType(body.type);
  const title = assertValidRecordTitle(body.title);
  const issuer = parseOptionalRecordTextField(body.issuer, RECORD_FIELD_MAX_LENGTH, 'assets_invalid_record_issuer');
  const identifier = parseOptionalRecordTextField(body.identifier, RECORD_FIELD_MAX_LENGTH, 'assets_invalid_record_identifier');
  const notes = parseOptionalRecordTextField(body.notes, RECORD_NOTES_MAX_LENGTH, 'assets_invalid_record_notes');
  const validity = assertValidRecordValidity(body.valid_from, body.valid_until);
  const assetIds = parseRecordAssetIds(body.asset_ids);

  const operation = 'assets.record.create';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    type,
    title,
    issuer,
    identifier,
    notes,
    valid_from: validity.valid_from,
    valid_until: validity.valid_until,
    asset_ids: assetIds,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    201,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('create_asset_record', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_type: type,
        p_title: title,
        p_issuer: issuer,
        p_identifier: identifier,
        p_notes: notes,
        p_valid_from: validity.valid_from,
        p_valid_until: validity.valid_until,
        p_asset_ids: assetIds,
      });
      if (error) {
        throw mapRecordCreateRpcError(error);
      }

      const outcome = data ?? {};
      if (outcome.status === 'invalid_type') {
        throw createHttpError(
          400,
          `Tipo de Record inválido. Debe ser uno de: ${ASSET_RECORD_TYPES.join(', ')}.`,
          'assets_invalid_record_type',
          { allowed_types: ASSET_RECORD_TYPES },
        );
      }
      if (outcome.status === 'invalid_title') {
        throw createHttpError(400, 'El título del Record es obligatorio.', 'assets_invalid_record_title');
      }
      if (outcome.status === 'invalid_validity') {
        throw createHttpError(
          400,
          'valid_from no puede ser posterior a valid_until.',
          'assets_invalid_record_validity',
        );
      }
      if (outcome.status === 'no_assets') {
        throw createHttpError(
          422,
          'asset_ids es obligatorio: un Record se crea con al menos un Asset relacionado.',
          'assets_record_assets_required',
        );
      }
      if (outcome.status === 'invalid_asset') {
        // Unknown, cross-Household and TRASH targets answer the SAME typed
        // error: nothing restricted is disclosed (§37, §45).
        throw createHttpError(
          400,
          'La referencia no corresponde a Assets válidos de tu Household.',
          'assets_invalid_record_asset',
        );
      }
      if (outcome.status !== 'created') {
        throw createHttpError(500, 'No se pudo crear el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const dtos = await loadRecordDtos(context, [outcome.record_id]);
      const record = dtos.get(outcome.record_id);
      if (!record) {
        throw createHttpError(500, 'No se pudo crear el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { record };
    },
  );
}

/**
 * GET /api/assets/records/:recordId — one authorized canonical Record with
 * its full shared projection. A Record of ANOTHER household answers the
 * same 404 as an unknown id on purpose: distinguishing them would disclose
 * the existence of Records in households the caller is not part of (§45).
 * Requires assets.view.
 */
async function getAssetRecordById(req, recordId) {
  const context = await contextWithCapability(req, 'assets.view');
  const id = assertValidRecordId(recordId);

  const dtos = await loadRecordDtos(context, [id]);
  const record = dtos.get(id);
  if (!record) {
    throw createHttpError(404, 'Record no encontrado.', 'assets_record_not_found');
  }
  return { record };
}

/**
 * BG-02 (Premium Target V0.3 §11): Household-wide shareable Record
 * discovery — GET /api/assets/records
 *
 * The client must be able to offer "vincular un registro existente" without
 * downloading every Asset. Read-only, requires assets.view:
 *   - ONLY ACTIVE Records of the caller's Household (§28, §41, §45).
 *   - ?exclude_asset_id=uuid: omit Records already linked (active link) to
 *     that Asset, so the picker never offers a duplicate relation. A
 *     cross-Household/unknown id answers the EMPTY list (non-disclosure).
 *   - ?q=: search by title/issuer/identifier (server-side).
 *   - Real pagination with the probe-row rule (nextOffset is evidence).
 */
async function listHouseholdRecords(req, query = {}) {
  const context = await contextWithCapability(req, 'assets.view');

  let excludedRecordIds = new Set();
  if (
    query.exclude_asset_id !== undefined
    && query.exclude_asset_id !== null
    && String(query.exclude_asset_id).trim() !== ''
  ) {
    const excludeAssetId = assertValidAssetId(String(query.exclude_asset_id));
    const { data: assetRow, error: assetError } = await supabaseAdmin
      .from('assets')
      .select('id')
      .eq('id', excludeAssetId)
      .eq('household_id', context.householdId)
      .maybeSingle();
    if (assetError) {
      throw createHttpError(500, 'No se pudieron listar los Records.', 'assets_records_list_failed');
    }
    if (assetRow) {
      const { data: linkRows, error: linkError } = await supabaseAdmin
        .from('assets_record_links')
        .select('record_id')
        .eq('asset_id', excludeAssetId)
        .is('ended_at', null);
      if (linkError) {
        throw createHttpError(500, 'No se pudieron listar los Records.', 'assets_records_list_failed');
      }
      excludedRecordIds = new Set((linkRows ?? []).map((row) => row.record_id));
    }
  }

  let recordQuery = supabaseAdmin
    .from('assets_records')
    .select('id')
    .eq('household_id', context.householdId)
    .eq('status', 'ACTIVE');

  // The exclusion is part of the QUERY, not of the page projection: filtering
  // after the range would let the excluded Records consume page slots and
  // break the probe-row rule (a page would come back shorter than `limit`
  // and `nextOffset` would no longer be pagination evidence).
  if (excludedRecordIds.size > 0) {
    const excludedList = [...excludedRecordIds].join(',');
    recordQuery = recordQuery.not('id', 'in', `(${excludedList})`);
  }

  if (typeof query.q === 'string' && query.q.trim() !== '') {
    const likeTerm = sanitizeFilterTerm(literalContainsPattern(query.q.trim()));
    recordQuery = recordQuery.or(
      `title.ilike.${likeTerm},issuer.ilike.${likeTerm},identifier.ilike.${likeTerm}`,
    );
  }

  const pageLimit = Math.min(Math.max(Number(query.limit) || 100, 1), 100);
  const pageOffset = Math.max(Number(query.offset) || 0, 0);

  const { data: idRows, error: idError } = await recordQuery
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(pageOffset, pageOffset + pageLimit);
  if (idError) {
    throw createHttpError(500, 'No se pudieron listar los Records.', 'assets_records_list_failed');
  }

  const rows = idRows ?? [];
  const hasMore = rows.length > pageLimit;
  const pageIds = (hasMore ? rows.slice(0, pageLimit) : rows).map((row) => row.id);

  const dtos = await loadRecordDtos(context, pageIds);
  const records = pageIds
    .map((id) => dtos.get(id))
    .filter((record) => Boolean(record));

  return {
    records,
    nextOffset: hasMore ? pageOffset + pageLimit : null,
  };
}

/**
 * GET /api/assets/:assetId/records — the Records related to one
 * Asset of the caller's Household. Every Record carries its FULL asset
 * list, so a shared Record is represented as the single canonical object
 * it is, no matter which related Asset the list was reached from (§15).
 * Requires assets.view. The Asset is addressable in any lifecycle (like
 * GET /api/assets/:assetId); relations toward TRASH Assets could never be
 * created and existing ones survive recoverably (INV2-AST-070).
 *
 * Scope (A4.4, §28 secondary-scope pattern, §41 recovery):
 *   - scope=active (default): the normal operational corpus. REMOVED
 *     Records never appear here.
 *   - scope=removed: the authorized, bounded recovery listing. ONLY
 *     REMOVED Records with an active link to THIS Asset are projected,
 *     so a removed Record stays recoverable from the UI without ever
 *     leaking into normal reads. Unknown scopes answer 400.
 */
const RECORD_LIST_SCOPES = Object.freeze(['active', 'removed']);

async function listAssetRecords(req, assetId, query = {}) {
  const context = await contextWithCapability(req, 'assets.view');
  const id = assertValidAssetId(assetId);

  const scope = query.scope === undefined || query.scope === null || query.scope === '' ? 'active' : String(query.scope);
  if (!RECORD_LIST_SCOPES.includes(scope)) {
    throw createHttpError(
      400,
      `Scope inválido. Debe ser uno de: ${RECORD_LIST_SCOPES.join(', ')}.`,
      'assets_invalid_record_scope',
      { allowed_scopes: RECORD_LIST_SCOPES },
    );
  }

  const { data: assetRow, error: assetError } = await supabaseAdmin
    .from('assets')
    .select('id')
    .eq('id', id)
    .eq('household_id', context.householdId)
    .maybeSingle();
  if (assetError) {
    throw createHttpError(500, 'No se pudieron listar los Records.', 'assets_records_list_failed');
  }
  if (!assetRow) {
    throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
  }

  const { data: linkRows, error: linkError } = await supabaseAdmin
    .from('assets_record_links')
    .select('record_id')
    .eq('asset_id', id)
    .is('ended_at', null);
  if (linkError) {
    throw createHttpError(500, 'No se pudieron listar los Records.', 'assets_records_list_failed');
  }

  const recordIds = [...new Set((linkRows ?? []).map((link) => link.record_id))];
  const dtos = await loadRecordDtos(context, recordIds, { includeRemoved: scope === 'removed' });

  const records = [...dtos.values()]
    .filter((record) => (scope === 'removed' ? record.status === 'REMOVED' : record.status === 'ACTIVE'))
    .sort((a, b) => {
      if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
      return a.id.localeCompare(b.id);
    });

  return { asset_id: id, scope, records };
}


// ── A4.2 Record Link / Unlink (§15, §16, §41, §43, §45, §53, §56) ────────────────

/**
 * Authority: HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0 §15, §16, §41, §43, §45,
 * §53, §56.
 *
 * Link / Unlink administer structural relationships between an EXISTING
 * canonical Asset Record and additional Assets of the SAME Household.
 *
 * LINK (POST /api/assets/records/:recordId/link):
 *   - Relates an existing Record to another valid Asset.
 *   - Single canonical Record identity: no copy is created (§15).
 *   - Same Household (§24, INV2-AST-010).
 *   - Valid lifecycle: target Asset must not be TRASH (§37, INV2-AST-071).
 *   - No duplicate active links: the unique partial index guarantees this.
 *   - Requires assets.manage for structural relation administration (§43:
 *     "MANAGE: shared Record relation administration").
 *   - Revalidation at execution: actor membership, target validity, and
 *     duplicate check all run inside the atomic RPC.
 *   - History preserved: the new link references the chosen period_id (or
 *     NULL for no temporal validity); previous links and periods are
 *     untouched.
 *   - Optional period_id chooses which validity window covers the new
 *     Asset. If omitted, the link carries no period (validity is
 *     information until temporal action exists in Planner, UC2-AST-024).
 *
 * UNLINK (POST /api/assets/records/:recordId/unlink):
 *   - Ends the current association of a Record with an Asset (sets
 *     ended_at on the active link).
 *   - Unlink ≠ Remove (§15, §69): the canonical Record is not deleted.
 *   - No physical deletion of the Record or historical periods.
 *   - Historical facts of the association are preserved: the link row
 *     remains with ended_at populated.
 *   - The orphan guard (A4.1, trg_assets_record_links_orphan_guard)
 *     blocks ending the LAST active link of an ACTIVE Record, raising
 *     errcode 23514. The RPC catches this and returns a typed outcome
 *     (last_unlink_blocked) so the caller knows resolution is required
 *     (§15, INV2-AST-030, UC2-AST-027/097).
 *   - If the Record is REMOVED, the orphan guard allows it (removal IS
 *     the explicit resolution §15 requires).
 *   - Requires assets.manage (§43).
 *   - No orphan Records: the last unlink of an ACTIVE Record is blocked
 *     at the database level and signaled via typed outcome.
 *
 * LAST UNLINK RESOLUTION:
 *   When unlink returns last_unlink_blocked, the caller MUST resolve by
 *   either:
 *     a) Linking the Record to another valid Asset (POST /link), OR
 *     b) Removing the Record (future A4.4 Remove/Restore).
 *   This endpoint does NOT implement Remove/Restore (A4.4).
 *
 * SHARED AUTHORITY:
 *   Both operations require assets.manage. The RPC validates authority
 *   over ALL affected targets (Record + target Asset) in a single
 *   atomic transaction. Unknown, cross-Household and TRASH targets
 *   answer the SAME typed error (no disclosure, §45).
 */

function assertValidPeriodIdOrNull(periodId) {
  if (periodId === undefined || periodId === null) return null;
  if (typeof periodId !== 'string' || !UUID_PATTERN.test(periodId.trim())) {
    throw createHttpError(400, 'periodId inválido.', 'assets_invalid_period_id');
  }
  return periodId.trim();
}

function assertValidPeriodId(periodId) {
  if (typeof periodId !== 'string' || !UUID_PATTERN.test(periodId.trim())) {
    throw createHttpError(400, 'periodId inválido.', 'assets_invalid_period_id');
  }
  return periodId.trim();
}

function mapLinkRpcError(error) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = 'assets.record.link';
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'Error inesperado en la operación de relación.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = 'assets.record.link';
  return httpError;
}

function mapUnlinkRpcError(error) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = 'assets.record.unlink';
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'Error inesperado en la operación de relación.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = 'assets.record.unlink';
  return httpError;
}

/**
 * POST /api/assets/records/:recordId/link — Link an existing Record to
 * another Asset.
 *
 * Body:
 *   { asset_id: uuid, period_id?: uuid|null }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (CONTRIBUTE alone is not enough for structural
 *     relation administration, §43).
 *   - The Record must belong to the caller's Household (enforced by RPC).
 *   - The target Asset must belong to the same Household and not be TRASH
 *     (§37, INV2-AST-071).
 *   - Duplicate active link for the same (record, asset) is rejected with
 *     a typed 409 (duplicate_link).
 *   - If period_id is provided, it must be a period of THIS Record.
 *   - Idempotent by Idempotency-Key (§53).
 *   - Unknown, cross-Household and TRASH targets answer the SAME typed
 *     error so nothing restricted is disclosed (§45).
 */
async function linkRecordToAsset(req, recordId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidRecordId(recordId);
  const idempotencyKey = requireIdempotencyKey(req);

  assertBodyFields(body, ['asset_id', 'period_id']);

  if (!Object.prototype.hasOwnProperty.call(body, 'asset_id')) {
    throw createHttpError(422, 'asset_id es obligatorio.', 'assets_link_asset_required');
  }

  const assetId = assertValidAssetId(body.asset_id);
  const periodId = assertValidPeriodIdOrNull(body.period_id);

  const operation = 'assets.record.link';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    record_id: id,
    asset_id: assetId,
    period_id: periodId,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('link_record_to_asset', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_record_id: id,
        p_asset_id: assetId,
        p_period_id: periodId,
      });
      if (error) throw mapLinkRpcError(error);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Record no encontrado.', 'assets_record_not_found');
      }
      if (outcome.status === 'invalid_asset') {
        throw createHttpError(
          400,
          'La referencia no corresponde a un Asset válido de tu Household.',
          'assets_invalid_record_asset',
        );
      }
      if (outcome.status === 'invalid_period') {
        throw createHttpError(
          400,
          'El período indicado no pertenece a este Record.',
          'assets_invalid_period_id',
        );
      }
      if (outcome.status === 'duplicate_link') {
        throw createHttpError(
          409,
          'Este Record ya está relacionado activamente con ese Asset.',
          'assets_record_duplicate_link',
        );
      }
      if (outcome.status !== 'linked') {
        throw createHttpError(500, 'No se pudo vincular el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      // A4.4: linking to a REMOVED Record is the explicit relink resolution
      // a blocked Restore waits for (§41), so the outcome must stay
      // addressable even when the Record is not ACTIVE.
      const dtos = await loadRecordDtos(context, [id], { includeRemoved: true });
      const record = dtos.get(id);
      if (!record) {
        throw createHttpError(500, 'No se pudo leer el Record actualizado.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { record };
    },
  );
}

/**
 * POST /api/assets/records/:recordId/unlink — Unlink a Record from an
 * Asset (end the active association).
 *
 * Body:
 *   { asset_id: uuid }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43).
 *   - The Record must belong to the caller's Household.
 *   - The target Asset must belong to the same Household.
 *   - If no active link exists for (record, asset), returns 404
 *     (no_active_link).
 *   - If this is the LAST active link of an ACTIVE Record, the orphan
 *     guard blocks it and the RPC returns last_unlink_blocked. The
 *     service translates this to a typed 409 with a resolution hint.
 *   - If the Record is REMOVED, the unlink succeeds (removal IS the
 *     explicit resolution).
 *   - The historical link row is preserved with ended_at set.
 *   - Idempotent by Idempotency-Key (§53): repeating the same unlink
 *     after the link is already ended returns the same outcome
 *     (no_active_link) without error.
 *   - Unknown, cross-Household targets answer the SAME typed error
 *     (no disclosure, §45).
 */
async function unlinkRecordFromAsset(req, recordId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidRecordId(recordId);
  const idempotencyKey = requireIdempotencyKey(req);

  assertBodyFields(body, ['asset_id']);

  if (!Object.prototype.hasOwnProperty.call(body, 'asset_id')) {
    throw createHttpError(422, 'asset_id es obligatorio.', 'assets_unlink_asset_required');
  }

  const assetId = assertValidAssetId(body.asset_id);

  const operation = 'assets.record.unlink';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    record_id: id,
    asset_id: assetId,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('unlink_record_from_asset', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_record_id: id,
        p_asset_id: assetId,
      });
      if (error) throw mapUnlinkRpcError(error);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Record no encontrado.', 'assets_record_not_found');
      }
      if (outcome.status === 'invalid_asset') {
        throw createHttpError(
          400,
          'La referencia no corresponde a un Asset válido de tu Household.',
          'assets_invalid_record_asset',
        );
      }
      if (outcome.status === 'no_active_link') {
        throw createHttpError(
          404,
          'No existe una relación activa entre este Record y ese Asset.',
          'assets_record_no_active_link',
        );
      }
      if (outcome.status === 'last_unlink_blocked') {
        throw createHttpError(
          409,
          outcome.message ?? 'Un Record ACTIVO no puede quedar sin Assets activos: relinkeá a otro Asset válido o remové el Record canónico.',
          'assets_record_last_unlink_blocked',
          { requires_resolution: true, resolution_hint: 'link_or_remove' },
        );
      }
      if (outcome.status !== 'unlinked') {
        throw createHttpError(500, 'No se pudo desvincular el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      // A4.4: unlinking from a REMOVED Record stays allowed (removal IS the
      // explicit last-unlink resolution, §15), so the outcome must stay
      // addressable even when the Record is not ACTIVE.
      const dtos = await loadRecordDtos(context, [id], { includeRemoved: true });
      const record = dtos.get(id);
      if (!record) {
        throw createHttpError(500, 'No se pudo leer el Record actualizado.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { record };
    },
  );
}

// ── A4.3 Correction & Renewal (§14-§16, §41, §43, §45, §53, §56) ───────────────

/**
 * Authority: HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0 §14-§16, §43, §45, §56.
 *
 * Correction corrects factual information WITHOUT creating a new validity
 * (§16: "Correction → corrige el mismo hecho"). Two dimensions:
 *
 *   correctAssetRecord — UPDATEs canonical Record metadata (title, issuer,
 *     identifier, notes) IN PLACE. No period is created, no link is touched.
 *     Affects the whole Record; requires CONTRIBUTE (§43).
 *
 *   correctAssetRecordPeriod — UPDATEs one validity period's dates IN PLACE.
 *     Affects every Asset covered by that period; requires authority over
 *     all of them (§45, INV2-AST-031). No new period is created (§16).
 *
 * Concurrency: optimistic locking via expected_updated_at. A stale write
 * never silently overwrites newer truth (§56, UC2-AST-095, INV2-AST-080).
 *
 * Security shape:
 *   - Household always derived from authenticated context (§24, §59).
 *   - Cross-Household Record ids answer the same 404 as unknown ids (§45).
 *   - Idempotent by Idempotency-Key (§53, UC2-AST-092).
 */

function mapCorrectionRpcError(error, operation) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = operation;
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'Error inesperado en la corrección.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = operation;
  return httpError;
}

/**
 * PATCH /api/assets/records/:recordId — correct canonical Record metadata.
 *
 * Body:
 *   { title?: string, issuer?: string|null, identifier?: string|null, notes?: string|null,
 *     expected_updated_at: timestamptz }
 *
 * At least one metadata field must be provided. expected_updated_at is
 * mandatory (optimistic concurrency, never last-write-wins).
 * Requires assets.contribute (§43).
 */
async function correctAssetRecord(req, recordId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidRecordId(recordId);
  const idempotencyKey = parseIdempotencyKey(req);

  assertBodyFields(body, ['title', 'issuer', 'identifier', 'notes', 'expected_updated_at']);

  const hasUpdate = ['title', 'issuer', 'identifier', 'notes'].some((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
  if (!hasUpdate) {
    throw createHttpError(422, 'Proporcioná al menos un campo para corregir.', 'assets_record_correction_required');
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'expected_updated_at')) {
    throw createHttpError(
      422,
      'expected_updated_at es obligatorio (la escritura nunca es last-write-wins).',
      'assets_expected_updated_at_required',
    );
  }

  const expectedUpdatedAt = body.expected_updated_at;
  if (typeof expectedUpdatedAt !== 'string' || Number.isNaN(Date.parse(expectedUpdatedAt))) {
    throw createHttpError(400, 'expected_updated_at inválido.', 'assets_invalid_expected_updated_at');
  }

  const title = body.title !== undefined ? parseOptionalRecordTextField(body.title, RECORD_FIELD_MAX_LENGTH, 'assets_invalid_record_title') : null;
  const issuer = body.issuer !== undefined ? parseOptionalRecordTextField(body.issuer, RECORD_FIELD_MAX_LENGTH, 'assets_invalid_record_issuer') : null;
  const identifier = body.identifier !== undefined ? parseOptionalRecordTextField(body.identifier, RECORD_FIELD_MAX_LENGTH, 'assets_invalid_record_identifier') : null;
  const notes = body.notes !== undefined ? parseOptionalRecordTextField(body.notes, RECORD_NOTES_MAX_LENGTH, 'assets_invalid_record_notes') : null;

  const operation = 'assets.record.correct';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    record_id: id,
    title,
    issuer,
    identifier,
    notes,
    expected_updated_at: expectedUpdatedAt,
  });

  const mutate = async () => {
    const { data, error } = await supabaseAdmin.rpc('correct_asset_record', {
      p_household_id: context.householdId,
      p_actor_member_id: context.membershipId,
      p_record_id: id,
      p_expected_updated_at: expectedUpdatedAt,
      p_title: title,
      p_issuer: issuer,
      p_identifier: identifier,
      p_notes: notes,
    });
    if (error) throw mapCorrectionRpcError(error, operation);

    const outcome = data ?? {};
    if (outcome.status === 'not_found') {
      throw createHttpError(404, 'Record no encontrado.', 'assets_record_not_found');
    }
    if (outcome.status === 'record_not_active') {
      throw createHttpError(
        409,
        'El Record no está activo: restauralo antes de corregirlo.',
        'assets_record_not_active',
      );
    }
    if (outcome.status === 'conflict') {
      throw createHttpError(
        409,
        'El Record cambió mientras lo corregías. Actualizá y reintentá.',
        'assets_record_correction_conflict',
        { current_updated_at: outcome.current_updated_at },
      );
    }
    if (outcome.status !== 'corrected') {
      throw createHttpError(500, 'No se pudo corregir el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }

    const dtos = await loadRecordDtos(context, [id]);
    const record = dtos.get(id);
    if (!record) {
      throw createHttpError(500, 'No se pudo leer el Record corregido.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }
    return { record };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

/**
 * PATCH /api/assets/records/:recordId/periods/:periodId — correct one validity
 * period's dates.
 *
 * Body:
 *   { valid_from?: YYYY-MM-DD|null, valid_until?: YYYY-MM-DD|null,
 *     expected_updated_at: timestamptz }
 *
 * At least one date field must be provided. expected_updated_at is mandatory
 * (optimistic concurrency on the period row).
 * Requires assets.contribute (§43).
 */
async function correctAssetRecordPeriod(req, recordId, periodId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidRecordId(recordId);
  const pid = assertValidPeriodId(periodId);
  const idempotencyKey = parseIdempotencyKey(req);

  assertBodyFields(body, ['valid_from', 'valid_until', 'expected_updated_at']);

  const hasUpdate = ['valid_from', 'valid_until'].some((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
  if (!hasUpdate) {
    throw createHttpError(422, 'Proporcioná al menos una fecha para corregir.', 'assets_period_correction_required');
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'expected_updated_at')) {
    throw createHttpError(
      422,
      'expected_updated_at es obligatorio (la escritura nunca es last-write-wins).',
      'assets_expected_updated_at_required',
    );
  }

  const expectedUpdatedAt = body.expected_updated_at;
  if (typeof expectedUpdatedAt !== 'string' || Number.isNaN(Date.parse(expectedUpdatedAt))) {
    throw createHttpError(400, 'expected_updated_at inválido.', 'assets_invalid_expected_updated_at');
  }

  const validity = assertValidRecordValidity(body.valid_from, body.valid_until);
  const validFrom = validity.valid_from;
  const validUntil = validity.valid_until;

  const operation = 'assets.record.correct_period';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    record_id: id,
    period_id: pid,
    valid_from: validFrom,
    valid_until: validUntil,
    expected_updated_at: expectedUpdatedAt,
  });

  const mutate = async () => {
    const { data, error } = await supabaseAdmin.rpc('correct_asset_record_period', {
      p_household_id: context.householdId,
      p_actor_member_id: context.membershipId,
      p_record_id: id,
      p_period_id: pid,
      p_expected_updated_at: expectedUpdatedAt,
      p_valid_from: validFrom,
      p_valid_until: validUntil,
    });
    if (error) throw mapCorrectionRpcError(error, operation);

    const outcome = data ?? {};
    if (outcome.status === 'not_found') {
      throw createHttpError(404, 'Período no encontrado.', 'assets_period_not_found');
    }
    if (outcome.status === 'record_not_active') {
      throw createHttpError(
        409,
        'El Record no está activo: restauralo antes de corregir sus períodos.',
        'assets_record_not_active',
      );
    }
    if (outcome.status === 'invalid_validity') {
      throw createHttpError(
        400,
        'valid_from no puede ser posterior a valid_until.',
        'assets_invalid_record_validity',
      );
    }
    if (outcome.status === 'conflict') {
      throw createHttpError(
        409,
        'El período cambiaba mientras lo corregías. Actualizá y reintentá.',
        'assets_period_correction_conflict',
        { current_updated_at: outcome.current_updated_at },
      );
    }
    if (outcome.status !== 'corrected') {
      throw createHttpError(500, 'No se pudo corregir el período.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }

    const dtos = await loadRecordDtos(context, [id]);
    const record = dtos.get(id);
    if (!record) {
      throw createHttpError(500, 'No se pudo leer el Record actualizado.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }
    return { record };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

function mapRenewalRpcError(error, operation) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = operation;
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'Error enesperado en la renovación.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = operation;
  return httpError;
}

/**
 * POST /api/assets/records/:recordId/renew — create a new validity period for
 * an explicitly selected subset of Assets.
 *
 * Body:
 *   { valid_from?: YYYY-MM-DD|null, valid_until?: YYYY-MM-DD|null,
 *     asset_ids: [uuid, ...] }
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.contribute (§43: "Record create/edit/correct/renew").
 *   - asset_ids is mandatory: at least one Asset must be selected (§16,
 *     INV2-AST-027). Duplicates are normalized to one.
 *   - Every selected target must be an ACTIVE/INACTIVE Asset of the caller's
 *     Household (§37, §45). Unknown, cross-Household, TRASH and ARCHIVED
 *     targets answer the SAME typed error (no disclosure, §45).
 *   - Every selected target must have an ACTIVE link to this Record.
 *   - Creates a NEW period; ends the selected Assets' current links; opens
 *     new links to the new period. Non-selected Assets keep their link to
 *     the preserved previous period (INV2-AST-026/027).
 *   - History is fully preserved: ended links and previous periods remain.
 *   - Idempotent by Idempotency-Key (§53, UC2-AST-092).
 */
async function renewAssetRecord(req, recordId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidRecordId(recordId);
  const idempotencyKey = requireIdempotencyKey(req);

  assertBodyFields(body, ['valid_from', 'valid_until', 'asset_ids']);

  if (!Object.prototype.hasOwnProperty.call(body, 'asset_ids')) {
    throw createHttpError(422, 'asset_ids es obligatorio: seleccioná al menos un Asset a renovar.', 'assets_renewal_assets_required');
  }

  if (!Array.isArray(body.asset_ids) || body.asset_ids.length === 0) {
    throw createHttpError(422, 'asset_ids es obligatorio: seleccioná al menos un Asset a renovar.', 'assets_renewal_assets_required');
  }

  const assetIds = parseRecordAssetIds(body.asset_ids);
  const validity = assertValidRecordValidity(body.valid_from, body.valid_until);

  const operation = 'assets.record.renew';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    record_id: id,
    valid_from: validity.valid_from,
    valid_until: validity.valid_until,
    asset_ids: assetIds,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('renew_asset_record', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_record_id: id,
        p_valid_from: validity.valid_from,
        p_valid_until: validity.valid_until,
        p_asset_ids: assetIds,
      });
      if (error) throw mapRenewalRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Record no encontrado.', 'assets_record_not_found');
      }
      if (outcome.status === 'record_not_active') {
        throw createHttpError(409, 'El Record no está activo.', 'assets_record_not_active');
      }
      if (outcome.status === 'invalid_validity') {
        throw createHttpError(
          400,
          'valid_from no puede ser posterior a valid_until.',
          'assets_invalid_record_validity',
        );
      }
      if (outcome.status === 'no_assets') {
        throw createHttpError(
          422,
          'asset_ids es obligatorio: seleccioná al menos un Asset a renovar.',
          'assets_renewal_assets_required',
        );
      }
      if (outcome.status === 'invalid_asset') {
        throw createHttpError(
          400,
          'La referencia no corresponde a Assets válidos de tu Household.',
          'assets_invalid_record_asset',
        );
      }
      if (outcome.status === 'no_active_link') {
        throw createHttpError(
          409,
          'Uno o más Assets seleccionados no tienen una relación activa con este Record.',
          'assets_renewal_no_active_link',
        );
      }
      if (outcome.status !== 'renewed') {
        throw createHttpError(500, 'No se pudo renovar el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const dtos = await loadRecordDtos(context, [id]);
      const record = dtos.get(id);
      if (!record) {
        throw createHttpError(500, 'No se pudo leer el Record actualizado.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { record, new_period_id: outcome.period_id };
    },
  );
}

// ── A4.4 Recoverable Record Remove / Restore (§15, §41, §43, §45, §53, §57) ──

/**
 * Authority: HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0 §15, §41, §43, §45, §53,
 * §56, §57.
 *
 * REMOVE (POST /api/assets/records/:recordId/remove) quita
 * recuperablemente el Record CANÓNICO. No es un Unlink:
 *   - Unlink termina UNA relación Record<->Asset (ended_at).
 *   - Remove cambia el lifecycle del objeto canónico (ACTIVE -> REMOVED).
 *
 * RESTORE (POST /api/assets/records/:recordId/restore) recupera el MISMO
 * Record (mismo id), con su historial y sus períodos intactos.
 *
 * Shared authority: Assets capabilities are Household-wide (no per-object
 * ACL exists in Core V2), so same-Household + assets.manage IS the complete
 * authority over every affected target (§45, INV2-AST-031). Unknown and
 * cross-Household ids answer the same 404 as unknown ids; no names, ids,
 * counts or existence of restricted targets ever leak (§45, §66).
 *
 * Concurrency: both RPCs lock the canonical Record row FOR UPDATE, so
 * Remove vs Link/Unlink and Restore vs lifecycle changes serialize on the
 * committed truth (§56, §57). Repeating Remove (or Restore) replays the
 * same success (idempotent at the RPC level AND under Idempotency-Key,
 * §53, UC2-AST-092).
 */

function mapRemoveRestoreRpcError(error, operation) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = operation;
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'Error inesperado en la operación.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = operation;
  return httpError;
}

/**
 * POST /api/assets/records/:recordId/remove — recoverable Remove of the
 * canonical Record.
 *
 * Body: {} (no fields accepted; the Household comes from the context).
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43: "MANAGE: Record/Care remove/restore").
 *   - ACTIVE -> REMOVED with removed_at set. Identity, data, periods,
 *     links (active and historical) and history are preserved; related
 *     Assets are NOT modified; no File/Task/Transaction or external object
 *     is touched (§41).
 *   - No physical DELETE anywhere (INV2-AST-074).
 *   - The removed Record leaves the normal operational reads (GET one and
 *     scope=active list stay 404/empty) and appears in the authorized
 *     scope=removed recovery listing.
 *   - Repeating Remove on a REMOVED Record replays 200 (idempotent).
 *   - A failed last-unlink is NEVER converted into Remove: this endpoint
 *     only runs on explicit intent (§15).
 *   - Idempotency-Key is required (§53).
 */
async function removeAssetRecord(req, recordId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidRecordId(recordId);
  const idempotencyKey = requireIdempotencyKey(req);

  assertBodyFields(body, []);

  const operation = 'assets.record.remove';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    record_id: id,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('remove_asset_record', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_record_id: id,
      });
      if (error) throw mapRemoveRestoreRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Record no encontrado.', 'assets_record_not_found');
      }
      if (outcome.status !== 'removed') {
        throw createHttpError(500, 'No se pudo remover el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const dtos = await loadRecordDtos(context, [id], { includeRemoved: true });
      const record = dtos.get(id);
      if (!record) {
        throw createHttpError(500, 'No se pudo leer el Record removido.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { record };
    },
  );
}

/**
 * POST /api/assets/records/:recordId/restore — recover the SAME Record.
 *
 * Body: {} (no fields accepted).
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43).
 *   - REMOVED -> ACTIVE with removed_at cleared and restored_at set. Same
 *     id, same history, same periods, same links. No new link is created,
 *     no related Asset is restored or reactivated (§41, §38 analogue).
 *   - Requires >= 1 ACTIVE link to a valid same-Household Asset
 *     (non-TRASH; ARCHIVED counts as historical evidence, §33). With zero
 *     valid relations the Restore stays blocked with a typed 409 that
 *     explains the resolution (relink a valid Asset first, then retry) —
 *     never a silent fallback to ACTIVE (§36 analogue, UC2-AST-029,
 *     INV2-AST-072).
 *   - Partially valid coverage restores: TRASH-linked relations survive
 *     recoverably untouched (INV2-AST-070), they are simply not counted.
 *   - Restoring an ACTIVE Record replays 200 (idempotent).
 *   - Authority, lifecycle and relations are revalidated inside the commit
 *     (§57, INV2-AST-082/083).
 *   - Idempotency-Key is required (§53).
 */
async function restoreAssetRecord(req, recordId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidRecordId(recordId);
  const idempotencyKey = requireIdempotencyKey(req);

  assertBodyFields(body, []);

  const operation = 'assets.record.restore';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    record_id: id,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('restore_asset_record', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_record_id: id,
      });
      if (error) throw mapRemoveRestoreRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Record no encontrado.', 'assets_record_not_found');
      }
      if (outcome.status === 'no_valid_asset') {
        throw createHttpError(
          409,
          outcome.message ?? 'El Record no tiene ninguna relación válida con un Asset: relinkeá a un Asset válido antes de restaurarlo.',
          'assets_record_restore_no_valid_asset',
          { requires_resolution: true, resolution_hint: 'relink_then_retry' },
        );
      }
      if (outcome.status !== 'restored' && outcome.status !== 'active') {
        throw createHttpError(500, 'No se pudo restaurar el Record.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const dtos = await loadRecordDtos(context, [id]);
      const record = dtos.get(id);
      if (!record) {
        throw createHttpError(500, 'No se pudo leer el Record restaurado.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { record };
    },
  );
}

// ── A5.1 Manual Care (§17, §18, §19, §42, §43, §45, §53, §56) ───────────────────

/**
 * Authority: HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0 §17, §18, §19, §42, §43,
 * §45, §53, §56.
 *
 * A Care Record is a factual event that REALLY HAPPENED to exactly ONE
 * Asset (§17, INV2-AST-033). This slice implements the MANUAL surface
 * only (UC2-AST-031/032, A5.2 adds UC2-AST-042/043):
 *   - POST   /api/assets/care          create manual Care (assets.contribute, Idempotency-Key)
 *   - GET    /api/assets/care/:careId  one authorized ACTIVE Care (assets.view)
 *   - GET    /api/assets/:assetId/care  Care of one Asset (assets.view, ?scope=active|removed)
 *   - PATCH  /api/assets/care/:careId   correct manual Care (assets.contribute, expected_updated_at)
 *   - POST   /api/assets/care/:careId/remove   recoverable Remove (assets.manage, Idempotency-Key)
 *   - POST   /api/assets/care/:careId/restore  recover the same Care (assets.manage, Idempotency-Key)
 *
 * What it never does:
 *   - It never stores money (Finance, §21), File contents (HomeCloud,
 *     §22), Tasks or recurrence (Planner, §19/§20) and it never
 *     references a Planner task id: a recurrent task can have multiple
 *     real executions, so a Planner-side uniqueness decision is
 *     deferred to the derived-Care slice, not frozen here.
 *   - It never invents date precision (§18): unknown stays unknown.
 *   - It never accepts a known future date: Care is a historical fact.
 *   - It never executes a physical DELETE (INV2-AST-074) and never
 *     writes the reserved DERIVED_PLANNER origin (§19): the manual
 *     Remove/Restore refuses derived rows with a typed conflict so a
 *     Planner resolution can never be hidden from Assets (§42,
 *     INV2-AST-042).
 */

const CARE_DATE_PRECISIONS = Object.freeze(['exact', 'month_year', 'year', 'unknown']);
const CARE_LIST_SCOPES = Object.freeze(['active', 'removed']);
const CARE_DESCRIPTION_MAX_LENGTH = 2000;
const CARE_PROVIDER_MAX_LENGTH = 200;
const CARE_NOTES_MAX_LENGTH = 5000;

function assertValidCareId(careId) {
  if (typeof careId !== 'string' || !UUID_PATTERN.test(careId.trim())) {
    throw createHttpError(400, 'careId inválido.', 'assets_invalid_care_id');
  }
  return careId.trim();
}

function assertValidCareDescription(description) {
  if (typeof description !== 'string' || !description.trim()) {
    throw createHttpError(400, 'La descripción del Care es obligatoria.', 'assets_invalid_care_description');
  }
  const trimmed = description.trim();
  if (trimmed.length > CARE_DESCRIPTION_MAX_LENGTH) {
    throw createHttpError(
      400,
      `La descripción debe tener como máximo ${CARE_DESCRIPTION_MAX_LENGTH} caracteres.`,
      'assets_invalid_care_description',
    );
  }
  return trimmed;
}

function parseOptionalCareTextField(value, maxLength, errorCode) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw createHttpError(400, 'Campo de texto del Care inválido.', errorCode);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw createHttpError(
      400,
      `El campo debe tener como máximo ${maxLength} caracteres.`,
      errorCode,
    );
  }
  return trimmed;
}

/**
 * The honest temporal representation (§18, UC2-AST-032). The precision
 * decides which values may exist:
 *   exact      -> occurred_on only
 *   month_year -> occurred_year + occurred_month only
 *   year       -> occurred_year only
 *   unknown    -> nothing
 * Any other combination is a typed 400: a day is never invented and a
 * smuggled extra value is never accepted. Future dates are rejected by
 * the RPC (defense in depth) with the same typed outcome family.
 */
function parseCareDateGroup(body) {
  const precision = body.date_precision;
  if (typeof precision !== 'string' || !CARE_DATE_PRECISIONS.includes(precision)) {
    throw createHttpError(
      400,
      `Precisión temporal inválida. Debe ser una de: ${CARE_DATE_PRECISIONS.join(', ')}.`,
      'assets_invalid_care_date',
      { allowed_precisions: CARE_DATE_PRECISIONS },
    );
  }

  const occurredOn = body.occurred_on === undefined || body.occurred_on === null
    ? null
    : body.occurred_on;
  if (occurredOn !== null && (typeof occurredOn !== 'string' || !isValidIsoDate(occurredOn.trim()))) {
    throw createHttpError(
      400,
      'occurred_on inválido: debe ser una fecha ISO (YYYY-MM-DD) o null.',
      'assets_invalid_care_date',
    );
  }

  const occurredYear = body.occurred_year === undefined || body.occurred_year === null
    ? null
    : body.occurred_year;
  if (occurredYear !== null && (!Number.isInteger(occurredYear) || occurredYear < 1 || occurredYear > 9999)) {
    throw createHttpError(400, 'occurred_year inválido.', 'assets_invalid_care_date');
  }

  const occurredMonth = body.occurred_month === undefined || body.occurred_month === null
    ? null
    : body.occurred_month;
  if (occurredMonth !== null && (!Number.isInteger(occurredMonth) || occurredMonth < 1 || occurredMonth > 12)) {
    throw createHttpError(400, 'occurred_month inválido.', 'assets_invalid_care_date');
  }

  const coherent =
    (precision === 'exact' && occurredOn !== null && occurredYear === null && occurredMonth === null)
    || (precision === 'month_year' && occurredOn === null && occurredYear !== null && occurredMonth !== null)
    || (precision === 'year' && occurredOn === null && occurredYear !== null && occurredMonth === null)
    || (precision === 'unknown' && occurredOn === null && occurredYear === null && occurredMonth === null);
  if (!coherent) {
    throw createHttpError(
      400,
      'La fecha no coincide con la precisión declarada: nunca se inventa precisión.',
      'assets_invalid_care_date',
    );
  }

  return {
    date_precision: precision,
    occurred_on: occurredOn === null ? null : occurredOn.trim(),
    occurred_year: occurredYear,
    occurred_month: occurredMonth,
  };
}

function mapCareRpcError(error, operation) {
  const transient = mapTransientRpcError(error);
  if (transient) {
    transient.operation = operation;
    return transient;
  }
  const code = error?.code ?? null;
  if (code === '42501') {
    return createHttpError(403, 'No sos miembro activo del household.', 'not_active_household_member');
  }
  const httpError = createHttpError(500, 'Error inesperado en la operación de Care.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
  httpError.operation = operation;
  return httpError;
}

// ── Care DTO projection ─────────────────────────────────────────────────────

const CARE_FIELDS = [
  'id',
  'household_id',
  'asset_id',
  'description',
  'date_precision',
  'occurred_on',
  'occurred_year',
  'occurred_month',
  'provider',
  'notes',
  'origin',
  'status',
  'created_at',
  'updated_at',
].join(', ');

/**
 * Load the Care Records of the caller's Household by id. A Care of
 * ANOTHER Household is simply absent here, so the caller answers the
 * same 404 as for an unknown id (§45). By default only ACTIVE Care is
 * projected (the normal corpus): pass { includeRemoved: true } ONLY for
 * the authorized recovery scope that must keep addressing explicitly
 * removed Care (A5.2); the Household boundary applies identically in
 * both modes.
 */
async function loadCareDtos(context, careIds, options = {}) {
  const dtos = new Map();
  if (!careIds || careIds.length === 0) return dtos;
  const includeRemoved = options.includeRemoved === true;

  let careQuery = supabaseAdmin
    .from('assets_care')
    .select(CARE_FIELDS)
    .eq('household_id', context.householdId)
    .in('id', careIds);
  if (!includeRemoved) {
    careQuery = careQuery.eq('status', 'ACTIVE');
  }
  const { data: careRows, error: careError } = await careQuery;
  if (careError) {
    throw createHttpError(500, 'No se pudo consultar el Care.', 'assets_care_read_failed');
  }
  if (!careRows || careRows.length === 0) return dtos;

  const assetIds = [...new Set(careRows.map((row) => row.asset_id))];
  const { data: assetRows, error: assetError } = await supabaseAdmin
    .from('assets')
    .select('id, name, lifecycle_status')
    .eq('household_id', context.householdId)
    .in('id', assetIds);
  if (assetError) {
    throw createHttpError(500, 'No se pudo consultar el Care.', 'assets_care_read_failed');
  }
  const assetsById = new Map((assetRows ?? []).map((asset) => [asset.id, asset]));

  for (const row of careRows) {
    const asset = assetsById.get(row.asset_id);
    dtos.set(row.id, {
      id: row.id,
      household_id: row.household_id,
      asset_id: row.asset_id,
      asset_name: asset?.name ?? null,
      asset_lifecycle_status: asset?.lifecycle_status ?? null,
      description: row.description,
      date_precision: row.date_precision,
      occurred_on: row.occurred_on ?? null,
      occurred_year: row.occurred_year ?? null,
      occurred_month: row.occurred_month ?? null,
      provider: row.provider ?? null,
      notes: row.notes ?? null,
      origin: row.origin,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
  return dtos;
}

// ── A5.1 operations ──────────────────────────────────────────────────────────

/**
 * POST /api/assets/care — create ONE manual Care fact.
 *
 * Body:
 *   { asset_id: uuid, description: string,
 *     date_precision: 'exact'|'month_year'|'year'|'unknown',
 *     occurred_on?: YYYY-MM-DD, occurred_year?: int, occurred_month?: int,
 *     provider?: string, notes?: string }
 *
 * One atomic RPC revalidates the actor membership, locks the owner
 * Asset and inserts the fact. The owner must belong to the caller's
 * Household; TRASH owners reject NEW Care (§37) and ARCHIVED owners
 * accept it as historical evidence (§33, §42). Unknown, cross-Household
 * and TRASH owners answer the SAME typed error so nothing restricted is
 * disclosed (§45). A known future date answers a typed 400: Care is a
 * factual past event, never a task. Requires assets.contribute (§43:
 * manual Care) and an Idempotency-Key (§53).
 */
async function createManualCare(req, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const idempotencyKey = requireIdempotencyKey(req);
  // The Household is ALWAYS derived from the authenticated context (§24,
  // §59): a body value is rejected, a null is ignored (same semantics as
  // the Asset and Record creates).
  if (Object.prototype.hasOwnProperty.call(body, 'household_id') && body.household_id !== undefined && body.household_id !== null) {
    throw createHttpError(
      400,
      'household_id no se acepta: el Household se deriva del contexto autenticado.',
      'assets_household_not_accepted',
    );
  }
  const careBody = { ...body };
  delete careBody.household_id;
  assertBodyFields(careBody, [
    'asset_id',
    'description',
    'date_precision',
    'occurred_on',
    'occurred_year',
    'occurred_month',
    'provider',
    'notes',
  ]);
  const assetId = assertValidAssetId(body.asset_id);
  const description = assertValidCareDescription(body.description);
  const dateGroup = parseCareDateGroup(body);
  const provider = parseOptionalCareTextField(body.provider, CARE_PROVIDER_MAX_LENGTH, 'assets_invalid_care_provider');
  const notes = parseOptionalCareTextField(body.notes, CARE_NOTES_MAX_LENGTH, 'assets_invalid_care_notes');

  const operation = 'assets.care.create';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    asset_id: assetId,
    description,
    date_precision: dateGroup.date_precision,
    occurred_on: dateGroup.occurred_on,
    occurred_year: dateGroup.occurred_year,
    occurred_month: dateGroup.occurred_month,
    provider,
    notes,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    201,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('create_manual_care', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_asset_id: assetId,
        p_description: description,
        p_date_precision: dateGroup.date_precision,
        p_occurred_on: dateGroup.occurred_on,
        p_occurred_year: dateGroup.occurred_year,
        p_occurred_month: dateGroup.occurred_month,
        p_provider: provider,
        p_notes: notes,
      });
      if (error) {
        throw mapCareRpcError(error, operation);
      }

      const outcome = data ?? {};
      if (outcome.status === 'invalid_description') {
        throw createHttpError(400, 'La descripción del Care es obligatoria.', 'assets_invalid_care_description');
      }
      if (outcome.status === 'invalid_date') {
        throw createHttpError(
          400,
          'La fecha no coincide con la precisión declarada: nunca se inventa precisión.',
          'assets_invalid_care_date',
        );
      }
      if (outcome.status === 'future_date') {
        throw createHttpError(
          400,
          'Un Care es un hecho histórico: la fecha no puede estar en el futuro.',
          'assets_care_future_date',
        );
      }
      if (outcome.status === 'invalid_asset') {
        // Unknown, cross-Household and TRASH owners answer the SAME
        // typed error: nothing restricted is disclosed (§37, §45).
        throw createHttpError(
          400,
          'La referencia no corresponde a un Asset válido de tu Household.',
          'assets_invalid_care_asset',
        );
      }
      if (outcome.status !== 'created') {
        throw createHttpError(500, 'No se pudo registrar el Care.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const dtos = await loadCareDtos(context, [outcome.care_id]);
      const care = dtos.get(outcome.care_id);
      if (!care) {
        throw createHttpError(500, 'No se pudo registrar el Care.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { care };
    },
  );
}

/**
 * GET /api/assets/care/:careId — one authorized canonical Care Record.
 * A Care of ANOTHER household answers the same 404 as an unknown id on
 * purpose: distinguishing them would disclose the existence of Care in
 * households the caller is not part of (§45). Requires assets.view.
 */
async function getManualCareById(req, careId) {
  const context = await contextWithCapability(req, 'assets.view');
  const id = assertValidCareId(careId);

  const dtos = await loadCareDtos(context, [id]);
  const care = dtos.get(id);
  if (!care) {
    throw createHttpError(404, 'Care no encontrado.', 'assets_care_not_found');
  }
  return { care };
}

/**
 * GET /api/assets/:assetId/care — the Care Records of one Asset of the
 * caller's Household. Requires assets.view. The Asset is addressable in
 * any lifecycle (like GET /api/assets/:assetId): Care toward TRASH
 * Assets could never be created and existing Care survives a later
 * Trash recoverably (INV2-AST-070 analogue).
 *
 * Scope (A5.2 preparation, §28 secondary-scope pattern, §42 recovery):
 *   - scope=active (default): the normal operational corpus.
 *   - scope=removed: the authorized, bounded recovery listing. ONLY
 *     REMOVED Care of THIS Asset is projected (empty until A5.2 exists,
 *     but the read side is already the exact one Remove/Restore will
 *     operate on). Unknown scopes answer 400.
 */
async function listAssetCare(req, assetId, query = {}) {
  const context = await contextWithCapability(req, 'assets.view');
  const id = assertValidAssetId(assetId);

  const scope = query.scope === undefined || query.scope === null || query.scope === '' ? 'active' : String(query.scope);
  if (!CARE_LIST_SCOPES.includes(scope)) {
    throw createHttpError(
      400,
      `Scope inválido. Debe ser uno de: ${CARE_LIST_SCOPES.join(', ')}.`,
      'assets_invalid_care_scope',
      { allowed_scopes: CARE_LIST_SCOPES },
    );
  }

  const { data: assetRow, error: assetError } = await supabaseAdmin
    .from('assets')
    .select('id')
    .eq('id', id)
    .eq('household_id', context.householdId)
    .maybeSingle();
  if (assetError) {
    throw createHttpError(500, 'No se pudo listar el Care.', 'assets_care_list_failed');
  }
  if (!assetRow) {
    throw createHttpError(404, 'Activo no encontrado.', 'assets_not_found');
  }

  let careQuery = supabaseAdmin
    .from('assets_care')
    .select(CARE_FIELDS)
    .eq('household_id', context.householdId)
    .eq('asset_id', id);
  careQuery = scope === 'removed'
    ? careQuery.eq('status', 'REMOVED')
    : careQuery.eq('status', 'ACTIVE');
  const { data: careRows, error: careError } = await careQuery;
  if (careError) {
    throw createHttpError(500, 'No se pudo listar el Care.', 'assets_care_list_failed');
  }

  const assetIds = [...new Set((careRows ?? []).map((row) => row.asset_id))];
  const { data: assetRows, error: assetProjectionError } = await supabaseAdmin
    .from('assets')
    .select('id, name, lifecycle_status')
    .eq('household_id', context.householdId)
    .in('id', assetIds.length ? assetIds : ['00000000-0000-0000-0000-000000000000']);
  if (assetProjectionError) {
    throw createHttpError(500, 'No se pudo listar el Care.', 'assets_care_list_failed');
  }
  const assetsById = new Map((assetRows ?? []).map((asset) => [asset.id, asset]));

  const care = (careRows ?? [])
    .map((row) => {
      const asset = assetsById.get(row.asset_id);
      return {
        id: row.id,
        household_id: row.household_id,
        asset_id: row.asset_id,
        asset_name: asset?.name ?? null,
        asset_lifecycle_status: asset?.lifecycle_status ?? null,
        description: row.description,
        date_precision: row.date_precision,
        occurred_on: row.occurred_on ?? null,
        occurred_year: row.occurred_year ?? null,
        occurred_month: row.occurred_month ?? null,
        provider: row.provider ?? null,
        notes: row.notes ?? null,
        origin: row.origin,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    })
    .sort((a, b) => {
      if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
      return a.id.localeCompare(b.id);
    });

  return { asset_id: id, scope, care };
}

/**
 * PATCH /api/assets/care/:careId — correct a MANUAL Care in place.
 *
 * Body:
 *   { description?: string, provider?: string, notes?: string,
 *     date_precision?: 'exact'|'month_year'|'year'|'unknown',
 *     occurred_on?: YYYY-MM-DD, occurred_year?: int, occurred_month?: int,
 *     expected_updated_at: timestamptz }
 *
 * Correction edits the SAME row: same id, same history, no duplicate
 * (a correction is never a new Care). expected_updated_at is mandatory
 * (optimistic concurrency, never last-write-wins, §56). When
 * date_precision is present the WHOLE date representation is replaced
 * with the complete honest group for the new precision (e.g. exact ->
 * year clears the day). The owner Asset is never modified and existing
 * Care survives any owner lifecycle. Only MANUAL Care is correctable:
 * the reserved DERIVED_PLANNER origin answers a typed conflict (§42
 * analogue). Requires assets.contribute (§43).
 */
async function correctManualCare(req, careId, body = {}) {
  const context = await contextWithCapability(req, 'assets.contribute');
  const id = assertValidCareId(careId);
  const idempotencyKey = parseIdempotencyKey(req);

  assertBodyFields(body, [
    'description',
    'date_precision',
    'occurred_on',
    'occurred_year',
    'occurred_month',
    'provider',
    'notes',
    'expected_updated_at',
  ]);

  const hasUpdate = ['description', 'date_precision', 'provider', 'notes'].some((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
  if (!hasUpdate) {
    throw createHttpError(422, 'Proporcioná al menos un campo para corregir.', 'assets_care_correction_required');
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'expected_updated_at')) {
    throw createHttpError(
      422,
      'expected_updated_at es obligatorio (la escritura nunca es last-write-wins).',
      'assets_expected_updated_at_required',
    );
  }

  const expectedUpdatedAt = body.expected_updated_at;
  if (typeof expectedUpdatedAt !== 'string' || Number.isNaN(Date.parse(expectedUpdatedAt))) {
    throw createHttpError(400, 'expected_updated_at inválido.', 'assets_invalid_expected_updated_at');
  }

  const description = body.description !== undefined
    ? assertValidCareDescription(body.description)
    : null;
  const provider = body.provider !== undefined
    ? parseOptionalCareTextField(body.provider, CARE_PROVIDER_MAX_LENGTH, 'assets_invalid_care_provider')
    : null;
  const notes = body.notes !== undefined
    ? parseOptionalCareTextField(body.notes, CARE_NOTES_MAX_LENGTH, 'assets_invalid_care_notes')
    : null;
  const dateGroup = Object.prototype.hasOwnProperty.call(body, 'date_precision')
    ? parseCareDateGroup(body)
    : { date_precision: null, occurred_on: null, occurred_year: null, occurred_month: null };

  const operation = 'assets.care.correct';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    care_id: id,
    description,
    date_precision: dateGroup.date_precision,
    occurred_on: dateGroup.occurred_on,
    occurred_year: dateGroup.occurred_year,
    occurred_month: dateGroup.occurred_month,
    provider,
    notes,
    expected_updated_at: expectedUpdatedAt,
  });

  const mutate = async () => {
    const { data, error } = await supabaseAdmin.rpc('correct_manual_care', {
      p_household_id: context.householdId,
      p_actor_member_id: context.membershipId,
      p_care_id: id,
      p_expected_updated_at: expectedUpdatedAt,
      p_description: description,
      p_date_precision: dateGroup.date_precision,
      p_occurred_on: dateGroup.occurred_on,
      p_occurred_year: dateGroup.occurred_year,
      p_occurred_month: dateGroup.occurred_month,
      p_provider: provider,
      p_notes: notes,
    });
    if (error) throw mapCareRpcError(error, operation);

    const outcome = data ?? {};
    if (outcome.status === 'not_found') {
      throw createHttpError(404, 'Care no encontrado.', 'assets_care_not_found');
    }
    if (outcome.status === 'care_not_active') {
      throw createHttpError(
        409,
        'El Care no está activo: restauralo antes de corregirlo.',
        'assets_care_not_active',
      );
    }
    if (outcome.status === 'not_manual') {
      throw createHttpError(
        409,
        'El Care derivado de Planner no se corrige manualmente desde Assets.',
        'assets_care_not_manual',
      );
    }
    if (outcome.status === 'invalid_date') {
      throw createHttpError(
        400,
        'La fecha no coincide con la precisión declarada: nunca se inventa precisión.',
        'assets_invalid_care_date',
      );
    }
    if (outcome.status === 'future_date') {
      throw createHttpError(
        400,
        'Un Care es un hecho histórico: la fecha no puede estar en el futuro.',
        'assets_care_future_date',
      );
    }
    if (outcome.status === 'invalid_description') {
      throw createHttpError(400, 'La descripción del Care es obligatoria.', 'assets_invalid_care_description');
    }
    if (outcome.status === 'conflict') {
      throw createHttpError(
        409,
        'El Care cambió mientras lo corregías. Actualizá y reintentá.',
        'assets_care_correction_conflict',
        { current_updated_at: outcome.current_updated_at },
      );
    }
    if (outcome.status !== 'corrected') {
      throw createHttpError(500, 'No se pudo corregir el Care.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }

    const dtos = await loadCareDtos(context, [id]);
    const care = dtos.get(id);
    if (!care) {
      throw createHttpError(500, 'No se pudo leer el Care corregido.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
    }
    return { care };
  };

  if (!idempotencyKey) {
    return { status: 200, body: await mutate() };
  }
  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    mutate,
  );
}

// ── A5.2 Recoverable Care Remove / Restore (§42, §43, §45, §53, §56, §57) ────

/**
 * Authority: HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0 §17, §19, §42, §43,
 * §45, §53, §56, §57.
 *
 * REMOVE (POST /api/assets/care/:careId/remove) quita recuperablemente
 * un Care MANUAL. ACTIVE -> REMOVED: mismo id, mismo contenido, mismo
 * owner Asset; nada se borra físicamente (INV2-AST-074).
 *
 * RESTORE (POST /api/assets/care/:careId/restore) recupera el MISMO
 * Care (mismo id). Requiere un owner Asset válido no-TRASH (ARCHIVED
 * cuenta como evidencia histórica, §33/§42); un owner TRASH bloquea
 * con un 409 tipado que explica la resolución — nunca hay fallback a
 * otro Asset ni restauración fantasma del propietario (§36, §42,
 * INV2-AST-073, UC2-AST-043).
 *
 * Shared authority: Assets capabilities are Household-wide (no
 * per-object ACL exists in Core V2), so same-Household + assets.manage
 * IS the complete authority (§43: "MANAGE: Record/Care remove/restore",
 * §45, INV2-AST-031). Unknown and cross-Household ids answer the same
 * 404 as unknown ids; no names, ids, counts or existence of restricted
 * targets ever leak (§45, §66).
 *
 * Concurrency: both RPCs lock the canonical Care row FOR UPDATE, and
 * Restore also locks the owner Asset, so Remove/Restore vs Correction
 * and Restore vs Asset lifecycle changes serialize on the committed
 * truth (§56, §57). Repeating Remove (or Restore) replays the same
 * success (idempotent at the RPC level AND under Idempotency-Key,
 * §53, UC2-AST-092).
 */

/**
 * POST /api/assets/care/:careId/remove — recoverable Remove of a
 * MANUAL Care Record.
 *
 * Body: {} (no fields accepted; the Household comes from the context).
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43).
 *   - ACTIVE -> REMOVED with removed_at set. Identity, content, the
 *     owner Asset and history are preserved; the owner Asset is NOT
 *     modified; no File/Task/Transaction or external object is touched
 *     (§42).
 *   - No physical DELETE anywhere (INV2-AST-074).
 *   - The removed Care leaves the normal operational reads (GET one and
 *     scope=active list stay 404/empty) and appears in the authorized
 *     scope=removed recovery listing.
 *   - Only MANUAL Care: a DERIVED_PLANNER row answers a typed 409 so a
 *     Planner resolution can never be hidden manually (§42,
 *     INV2-AST-042).
 *   - Repeating Remove on a REMOVED Care replays 200 (idempotent).
 *   - Idempotency-Key is required (§53).
 */
async function removeManualCare(req, careId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidCareId(careId);
  const idempotencyKey = requireIdempotencyKey(req);

  assertBodyFields(body, []);

  const operation = 'assets.care.remove';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    care_id: id,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('remove_manual_care', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_care_id: id,
      });
      if (error) throw mapCareRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Care no encontrado.', 'assets_care_not_found');
      }
      if (outcome.status === 'not_manual') {
        throw createHttpError(
          409,
          'El Care derivado de Planner no se remueve manualmente desde Assets.',
          'assets_care_not_manual',
        );
      }
      if (outcome.status !== 'removed') {
        throw createHttpError(500, 'No se pudo remover el Care.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const dtos = await loadCareDtos(context, [id], { includeRemoved: true });
      const care = dtos.get(id);
      if (!care) {
        throw createHttpError(500, 'No se pudo leer el Care removido.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { care };
    },
  );
}

/**
 * POST /api/assets/care/:careId/restore — recover the SAME Care.
 *
 * Body: {} (no fields accepted).
 *
 * Rules (Product Freeze V2.0):
 *   - Requires assets.manage (§43).
 *   - REMOVED -> ACTIVE with removed_at cleared and restored_at set.
 *     Same id, same content, same owner Asset. No new Care is created,
 *     no other Asset is picked as fallback and the owner Asset is never
 *     restored automatically (§42, §36 analogue).
 *   - Requires the owner Asset to be a valid non-TRASH Asset of the
 *     same Household (§42, INV2-AST-073). ARCHIVED counts as historical
 *     evidence (§33). A TRASH (or otherwise invalid) owner blocks the
 *     Restore with a typed 409 that explains the resolution (restore
 *     the Asset first, then retry) — never a silent fallback (§36
 *     analogue, UC2-AST-043).
 *   - Only MANUAL Care: a DERIVED_PLANNER row answers a typed 409 (the
 *     derived lifecycle belongs to the future Planner slice, §19/§42).
 *   - Restoring an already ACTIVE Care replays 200 (idempotent).
 *   - Authority, ownership and lifecycle are revalidated inside the
 *     commit with locks (§57, INV2-AST-082/083).
 *   - Idempotency-Key is required (§53).
 */
async function restoreManualCare(req, careId, body = {}) {
  const context = await contextWithCapability(req, 'assets.manage');
  const id = assertValidCareId(careId);
  const idempotencyKey = requireIdempotencyKey(req);

  assertBodyFields(body, []);

  const operation = 'assets.care.restore';
  const requestHash = hashAssetsRequest({
    operation,
    household_id: context.householdId,
    actor_member_id: context.membershipId,
    care_id: id,
  });

  return withAssetsIdempotency(
    context,
    { idempotencyKey, operation, requestHash, req },
    200,
    async () => {
      const { data, error } = await supabaseAdmin.rpc('restore_manual_care', {
        p_household_id: context.householdId,
        p_actor_member_id: context.membershipId,
        p_care_id: id,
      });
      if (error) throw mapCareRpcError(error, operation);

      const outcome = data ?? {};
      if (outcome.status === 'not_found') {
        throw createHttpError(404, 'Care no encontrado.', 'assets_care_not_found');
      }
      if (outcome.status === 'not_manual') {
        throw createHttpError(
          409,
          'El Care derivado de Planner no se restaura manualmente desde Assets.',
          'assets_care_not_manual',
        );
      }
      if (outcome.status === 'owner_not_valid') {
        throw createHttpError(
          409,
          outcome.message ?? 'El Asset propietario del Care no es válido: restaurá primero el Asset y reintentá.',
          'assets_care_restore_owner_not_valid',
          { requires_resolution: true, resolution_hint: 'restore_owner_asset_then_retry' },
        );
      }
      if (outcome.status !== 'restored' && outcome.status !== 'active') {
        throw createHttpError(500, 'No se pudo restaurar el Care.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }

      const dtos = await loadCareDtos(context, [id]);
      const care = dtos.get(id);
      if (!care) {
        throw createHttpError(500, 'No se pudo leer el Care restaurado.', CANONICAL_ERROR_CODES.INTERNAL_ERROR);
      }
      return { care };
    },
  );
}

/**
 * GET /api/assets/capabilities — capability projection for the active
 * member + household (assets.view / assets.contribute / assets.manage).
 *
 * The backend stays the authority: this endpoint only exposes the SAME
 * projection the service uses to authorize every mutation, so the client can
 * hide or disable controls instead of offering a dead action (§43).
 * A member without any Assets capability receives a projection with every
 * capability in false (fail-closed), never an error.
 */
async function getAssetsCapabilities(req) {
  const context = await resolveAssetsContext(req);
  const capabilities = resolveAssetsCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  return {
    capabilities,
    membershipId: context.membershipId,
    householdId: context.householdId,
    role: context.membership.role,
  };
}

module.exports = {
  ASSET_PROFILES,
  ASSET_RECORD_TYPES,
  LIST_SCOPES,
  CONTEXT_EDITABLE_LIFECYCLE,
  IDENTITY_EDITABLE_LIFECYCLE,
  IDENTITY_ALLOWED_KEYS,
  SUGGESTED_ASSET_CATEGORIES,
  OPERATIONAL_LIFECYCLE,
  TRASHABLE_LIFECYCLE,
  ARCHIVE_DISPOSITIONS,
  getAssetsCapabilities,
  createAsset,
  listAssets,
  getAssetById,
  updateAssetName,
  updateAssetIdentity,
  setAssetCategory,
  listCategories,
  createCategory,
  deleteCategory,
  setAssetResponsible,
  setAssetHolder,
  setAssetPlacement,
  changeAssetProfile,
  setAssetLifecycleStatus,
  archiveAsset,
  unarchiveAsset,
  getArchiveHistory,
  trashAsset,
  restoreAsset,
  getTrashHistory,
  createAssetRecord,
  getAssetRecordById,
  listAssetRecords,
  listHouseholdRecords,
  linkRecordToAsset,
  unlinkRecordFromAsset,
  correctAssetRecord,
  correctAssetRecordPeriod,
  renewAssetRecord,
  removeAssetRecord,
  restoreAssetRecord,
  RECORD_LIST_SCOPES,
  CARE_DATE_PRECISIONS,
  CARE_LIST_SCOPES,
  createManualCare,
  getManualCareById,
  listAssetCare,
  correctManualCare,
  removeManualCare,
  restoreManualCare,
  // S7-03: la fachada Assets <-> Planner (assets.planner.service.js) reutiliza
  // estas piezas para NO duplicar la resolucion de Household, la capability
  // gate ni la regla de no-divulgacion (404 unico para id/cross-Household).
  resolveAssetsContext,
  contextWithCapability,
  loadContextAsset,
  assertValidAssetId,
  // S8-02: la fachada Assets <-> HomeCloud (assets.files.service.js) reutiliza
  // EXACTAMENTE la maquinaria de idempotencia (reserve/complete + hash) y la
  // resolucion de contexto. No se crea un segundo store ni un segundo hash.
  reserveAssetsIdempotency,
  completeAssetsIdempotency,
  hashAssetsRequest,
};
