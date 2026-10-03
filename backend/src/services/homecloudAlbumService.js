'use strict';

/**
 * HomeCloud MO-A1 — Album organization mutations.
 *
 * Authority: the MO-A Albums product contract (this slice).
 *
 * Frozen model, restated because every rule below follows from it:
 *   - Memory is the primary shared household entity; an Album is a shared
 *     ORGANIZATION over Memories (N:M). A Memory may belong to 0..N Albums.
 *   - Adding or removing membership NEVER creates a duplicate Memory, NEVER
 *     changes content identity, original bytes, storage path, preview bytes or
 *     Memory lifecycle, and NEVER affects memberships in unrelated Albums.
 *
 * Household authority:
 *   - householdId is NEVER read from a request body, query or path. It comes
 *     only from the authenticated server context (getHomeCloudContext).
 *   - Every Album and Memory lookup constrains id + household_id (+ lifecycle
 *     where the contract requires it) INSIDE the query, so a cross-household
 *     id simply does not match. Cross-household ids collapse to 404 and never
 *     disclose that the id exists somewhere else.
 *
 * Capability model:
 *   - Every mutation in this file requires homecloud.organize.
 *   - Deleting an Album does NOT require homecloud.delete: homecloud.delete is
 *     reserved for lifecycle/destructive action against the Memory/File entity
 *     itself. Removing an organizational container without deleting a single
 *     Memory is an organize operation.
 *   - Memory intake with an initialAlbumId keeps homecloud.contribute.
 *
 * Provenance members:
 *   created_by_member_id / added_by_member_id are ALWAYS derived from the
 *   authenticated household server context (context.membership.id). They are
 *   NEVER accepted from the client, never derived from the auth user id and
 *   never guessed.
 */

const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { createHttpError } = require('../lib/httpErrors');
const { mapAlbumRowToDto } = require('../lib/homecloudMappers');
const { aggregateAlbums } = require('./homecloudReadService');

const ALBUM_FIELDS = 'id, household_id, name, created_by_member_id, created_at, updated_at, lifecycle';

/** PostgreSQL unique_violation. The ONLY condition treated as "already added". */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Resolve the authenticated context and assert a HomeCloud capability.
 * Shared by every mutation so no endpoint can forget the capability gate.
 */
async function contextWithCapability(req, capability) {
  const context = await getHomeCloudContext(req);
  const capabilities = resolveHomeCloudCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertHomeCloudCapability(capabilities, capability);
  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }
  return context;
}

/**
 * Normalize an Album name: it must be a string and must not be blank.
 * Trimming happens BEFORE persistence, so the stored name is exactly what the
 * Album DTO returns and two Albums whose names only differ in surrounding
 * whitespace are the same name.
 *
 * Duplicate names are ALLOWED: there is no uniqueness constraint and none is
 * invented here.
 */
function normalizedAlbumName(value) {
  if (typeof value !== 'string') {
    throw createHttpError(400, 'El nombre del álbum es obligatorio.', 'homecloud_invalid_name');
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw createHttpError(400, 'El nombre del álbum es obligatorio.', 'homecloud_invalid_name');
  }
  return trimmed;
}

/** Normalize a client-supplied content id. */
function normalizedContentId(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(400, 'contentId es obligatorio.', 'homecloud_invalid_content_id');
  }
  return value.trim();
}

/**
 * Assert Album authority and return the Album row.
 *
 * The predicate is id + household_id + lifecycle='active' in ONE query, so a
 * nonexistent, cross-household or trashed Album is indistinguishable: all
 * three are a plain 404.
 */
async function assertAlbumAuthority(albumId, householdId) {
  const { data: album, error } = await supabaseAdmin
    .from('homecloud_albums')
    .select(ALBUM_FIELDS)
    .eq('id', albumId)
    .eq('household_id', householdId)
    .eq('lifecycle', 'active')
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_album_lookup_failed');
  }
  if (!album) {
    throw createHttpError(404, 'Álbum no encontrado.', 'homecloud_album_not_found');
  }
  return album;
}

/**
 * Assert Memory authority for Album membership and return the content row.
 *
 * household_id is constrained in the query, so a nonexistent or
 * cross-household Memory is a 404 that discloses nothing.
 *
 * role and lifecycle are then inspected on the ALREADY household-scoped row to
 * produce typed, non-500 errors: a File is not organizationally a Memory, and
 * a staging/trashed Memory is not available to be organized.
 */
async function assertMemoryAuthority(contentId, householdId) {
  const { data: content, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, role, lifecycle')
    .eq('id', contentId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_content_lookup_failed');
  }
  if (!content) {
    throw createHttpError(404, 'Contenido no encontrado.', 'homecloud_content_not_found');
  }
  if (content.role !== 'memory') {
    throw createHttpError(
      409,
      'Solo un recuerdo puede pertenecer a un álbum.',
      'homecloud_album_member_not_memory',
    );
  }
  if (content.lifecycle !== 'active') {
    throw createHttpError(
      409,
      'El recuerdo no está disponible.',
      'homecloud_album_member_not_active',
    );
  }
  return content;
}

/** Build the safe Album DTO for one Album, with its exact aggregates. */
async function albumDtoFor(householdId, album) {
  const aggregates = await aggregateAlbums(householdId, [album.id]);
  const aggregate = aggregates.get(album.id);
  return mapAlbumRowToDto(album, {
    itemCount: aggregate ? aggregate.itemCount : 0,
    coverContentId: aggregate ? aggregate.coverContentId : null,
  });
}

/**
 * CREATE ALBUM — POST /api/homecloud/albums
 *
 * Requires homecloud.organize. The household comes only from the authenticated
 * server context, and created_by_member_id is only the active membership of
 * that context. A brand new Album is active, so itemCount = 0 and
 * coverContentId = null by construction.
 */
async function createAlbum(req, body) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  const name = normalizedAlbumName(body?.name);

  const { data: album, error } = await supabaseAdmin
    .from('homecloud_albums')
    .insert({
      household_id: context.householdId,
      name,
      created_by_member_id: context.membership.id,
      lifecycle: 'active',
    })
    .select(ALBUM_FIELDS)
    .single();

  if (error) {
    // No 23505 branch on purpose: duplicate Album names are legal, so a unique
    // violation here can only be an unexpected database invariant, not a
    // product conflict. It must surface as an error, never as a fake success.
    throw createHttpError(500, error.message, 'homecloud_album_create_failed');
  }

  return albumDtoFor(context.householdId, album);
}

/**
 * RENAME ALBUM — PATCH /api/homecloud/albums/:albumId
 *
 * Requires homecloud.organize, an active Album of the active household.
 * Nonexistent and cross-household Albums are both 404.
 */
async function renameAlbum(req, albumId, body) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  await assertAlbumAuthority(albumId, context.householdId);
  const name = normalizedAlbumName(body?.name);

  const { data: album, error } = await supabaseAdmin
    .from('homecloud_albums')
    .update({ name })
    .eq('id', albumId)
    .eq('household_id', context.householdId)
    .eq('lifecycle', 'active')
    .select(ALBUM_FIELDS)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_album_rename_failed');
  }
  // The Album can disappear between the authority check and the update.
  if (!album) {
    throw createHttpError(404, 'Álbum no encontrado.', 'homecloud_album_not_found');
  }

  return albumDtoFor(context.householdId, album);
}

/**
 * DELETE ALBUM — DELETE /api/homecloud/albums/:albumId
 *
 * HARD DELETE of the ORGANIZATION only:
 *   - the homecloud_albums row is deleted;
 *   - its homecloud_album_items rows disappear through the already-proven
 *     `on delete cascade` FK, in the same database transaction;
 *   - NO statement is issued against homecloud_contents;
 *   - NO storage operation, NO preview operation, NO Memory lifecycle change,
 *     NO soft trash (lifecycle / trashed_at / trashed_by_member_id stay unused);
 *   - memberships of the same Memories in OTHER Albums are untouched.
 *
 * Requires homecloud.organize, NOT homecloud.delete. Returns nothing: the
 * caller answers 204.
 */
async function deleteAlbum(req, albumId) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  await assertAlbumAuthority(albumId, context.householdId);

  // `.select('id')` makes the deletion verifiable: a delete that matched no row
  // is reported as 404 instead of being silently accepted as success.
  const { data: deleted, error } = await supabaseAdmin
    .from('homecloud_albums')
    .delete()
    .eq('id', albumId)
    .eq('household_id', context.householdId)
    .select('id');

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_album_delete_failed');
  }
  if (!deleted || deleted.length === 0) {
    throw createHttpError(404, 'Álbum no encontrado.', 'homecloud_album_not_found');
  }
}

/**
 * ADD EXISTING MEMORY TO ALBUM — POST /api/homecloud/albums/:albumId/items
 *
 * Requires homecloud.organize, an active Album and an active Memory of the same
 * household. ONLY a homecloud_album_items row is inserted: no second
 * homecloud_contents row, no metadata update, no byte or preview operation.
 *
 * Idempotency is narrow on purpose. ONLY a confirmed duplicate-membership
 * condition (PostgreSQL unique_violation on the (album_id, content_id) primary
 * key) becomes idempotent success, answered with the existing relation.
 * Everything else — permission failures, connectivity failures, FK failures,
 * invariant failures and any other database error — stays an error. There is
 * no catch-all success path.
 */
async function addMemoryToAlbum(req, albumId, body) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  await assertAlbumAuthority(albumId, context.householdId);

  const contentId = normalizedContentId(body?.contentId);
  await assertMemoryAuthority(contentId, context.householdId);

  const { data: membership, error } = await supabaseAdmin
    .from('homecloud_album_items')
    .insert({
      album_id: albumId,
      content_id: contentId,
      added_by_member_id: context.membership.id,
    })
    .select('album_id, content_id, added_by_member_id, added_at')
    .single();

  if (!error) {
    return {
      albumId: membership.album_id,
      contentId: membership.content_id,
      addedByMemberId: membership.added_by_member_id ?? null,
      addedAt: membership.added_at,
    };
  }

  if (error.code !== PG_UNIQUE_VIOLATION) {
    throw createHttpError(500, error.message, 'homecloud_album_membership_failed');
  }

  // Confirmed duplicate membership: return the EXISTING relation so a second
  // identical add succeeds without creating a second row.
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('homecloud_album_items')
    .select('album_id, content_id, added_by_member_id, added_at')
    .eq('album_id', albumId)
    .eq('content_id', contentId)
    .maybeSingle();

  if (existingErr) {
    throw createHttpError(500, existingErr.message, 'homecloud_album_membership_lookup_failed');
  }
  if (!existing) {
    // The violation was real but the relation is gone: an invariant race, not
    // an idempotent success. Never silently claim success here.
    throw createHttpError(409, 'El recuerdo ya no pertenece a este álbum.', 'homecloud_album_membership_conflict');
  }

  return {
    albumId: existing.album_id,
    contentId: existing.content_id,
    addedByMemberId: existing.added_by_member_id ?? null,
    addedAt: existing.added_at,
  };
}

/**
 * REMOVE MEMORY FROM ALBUM — DELETE /api/homecloud/albums/:albumId/items/:contentId
 *
 * Requires homecloud.organize. Album authority, Memory authority and Memory
 * type are validated first; only then is the absence of the relation an
 * idempotent no-op. Every other error stays an error.
 *
 * Only the matching membership row is deleted: the Memory survives, its bytes,
 * storage path, preview and lifecycle are untouched, and its memberships in
 * other Albums (plus the global Timeline) are unaffected.
 */
async function removeMemoryFromAlbum(req, albumId, contentId) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  await assertAlbumAuthority(albumId, context.householdId);

  const targetContentId = normalizedContentId(contentId);
  await assertMemoryAuthority(targetContentId, context.householdId);

  const { error } = await supabaseAdmin
    .from('homecloud_album_items')
    .delete()
    .eq('album_id', albumId)
    .eq('content_id', targetContentId);

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_album_membership_failed');
  }
  // Zero deleted rows simply means the relation was already absent: a no-op
  // after full authority validation, never a swallowed failure.
}

module.exports = {
  createAlbum,
  renameAlbum,
  deleteAlbum,
  addMemoryToAlbum,
  removeMemoryFromAlbum,
  assertAlbumAuthority,
  assertMemoryAuthority,
  normalizedAlbumName,
};