'use strict';

/**
 * HomeCloud Memories lifecycle authority.
 *
 * This service owns Memory lifecycle mutations only:
 * ACTIVE -> TRASHED, TRASHED -> ACTIVE, and permanent purge of TRASHED rows.
 * It does not create UI surfaces, alter upload contracts, or modify storage
 * path helpers. Household scope and capability gates are resolved server-side.
 */

const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { getHomeCloudBucket } = require('../lib/homecloudStoragePaths');
const { createHttpError } = require('../lib/httpErrors');

const MEMORY_LIFECYCLE_FIELDS = [
  'id',
  'household_id',
  'role',
  'lifecycle',
  'original_storage_path',
  'preview_storage_path',
  'written_text',
  'trashed_at',
  'trashed_by_member_id',
].join(', ');

function requireBackend() {
  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }
}

async function contextWithCapability(req, capability) {
  const context = await getHomeCloudContext(req);
  const capabilities = resolveHomeCloudCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertHomeCloudCapability(capabilities, capability);
  requireBackend();
  return context;
}

function isStorageMissingError(error) {
  if (!error) return false;
  const statusCode = Number(error.statusCode ?? error.status);
  if (statusCode === 404) return true;
  const code = String(error.code ?? '').toLowerCase();
  if (code === 'not_found' || code === 'no_such_key' || code === '404') return true;
  const message = String(error.message ?? '').toLowerCase();
  return message.includes('not found') || message.includes('does not exist');
}

async function deleteStorageObject(storage, bucket, path) {
  if (!path) return { deleted: false, skipped: 'no_path' };
  const { data, error } = await storage.from(bucket).remove([path]);
  if (error && !isStorageMissingError(error)) {
    throw createHttpError(503, 'No se pudo eliminar el archivo de almacenamiento.', 'homecloud_storage_delete_failed', {
      bucket,
      path,
      storageCode: error.code ?? null,
    });
  }
  return {
    deleted: Array.isArray(data) ? data.length > 0 : true,
    skipped: error ? 'already_missing' : null,
  };
}

async function deleteMemoryStorageArtifacts(content, storage = supabaseAdmin.storage) {
  if (content.written_text !== null) {
    return { original: { deleted: false, skipped: 'written_memory' }, preview: { deleted: false, skipped: 'written_memory' } };
  }
  const original = await deleteStorageObject(storage, getHomeCloudBucket('original'), content.original_storage_path);
  const preview = await deleteStorageObject(storage, getHomeCloudBucket('preview'), content.preview_storage_path);
  return { original, preview };
}

async function loadMemoryForLifecycle(contentId, householdId, lifecycle) {
  const { data: content, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select(MEMORY_LIFECYCLE_FIELDS)
    .eq('id', contentId)
    .eq('household_id', householdId)
    .eq('role', 'memory')
    .eq('lifecycle', lifecycle)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_memory_lookup_failed');
  }
  if (!content) {
    throw createHttpError(404, 'Recuerdo no encontrado.', 'homecloud_memory_not_found');
  }
  return content;
}

async function trashMemory(req, contentId) {
  const context = await contextWithCapability(req, 'homecloud.contribute');
  const target = await loadMemoryForLifecycle(contentId, context.householdId, 'active');

  const { data: updated, error } = await supabaseAdmin
    .from('homecloud_contents')
    .update({
      lifecycle: 'trashed',
      trashed_at: new Date().toISOString(),
      trashed_by_member_id: context.membership.id,
    })
    .eq('id', target.id)
    .eq('household_id', context.householdId)
    .eq('role', 'memory')
    .eq('lifecycle', 'active')
    .select(MEMORY_LIFECYCLE_FIELDS)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_memory_trash_failed');
  }
  if (!updated) {
    throw createHttpError(404, 'Recuerdo no encontrado.', 'homecloud_memory_not_found');
  }
  return updated;
}

async function restoreMemory(req, contentId) {
  const context = await contextWithCapability(req, 'homecloud.contribute');
  const target = await loadMemoryForLifecycle(contentId, context.householdId, 'trashed');

  const { data: updated, error } = await supabaseAdmin
    .from('homecloud_contents')
    .update({
      lifecycle: 'active',
      trashed_at: null,
      trashed_by_member_id: null,
    })
    .eq('id', target.id)
    .eq('household_id', context.householdId)
    .eq('role', 'memory')
    .eq('lifecycle', 'trashed')
    .select(MEMORY_LIFECYCLE_FIELDS)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_memory_restore_failed');
  }
  if (!updated) {
    throw createHttpError(404, 'Recuerdo no encontrado.', 'homecloud_memory_not_found');
  }
  return updated;
}

async function purgeTrashedMemoryById(context, contentId) {
  const target = await loadMemoryForLifecycle(contentId, context.householdId, 'trashed');

  const storage = await deleteMemoryStorageArtifacts(target);
  const { data: deleted, error } = await supabaseAdmin
    .from('homecloud_contents')
    .delete()
    .eq('id', target.id)
    .eq('household_id', context.householdId)
    .eq('role', 'memory')
    .eq('lifecycle', 'trashed')
    .select('id');

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_memory_purge_failed');
  }
  if (!deleted || deleted.length === 0) {
    throw createHttpError(404, 'Recuerdo no encontrado.', 'homecloud_memory_not_found');
  }
  return { contentId: target.id, storage };
}

async function purgeMemory(req, contentId) {
  const context = await contextWithCapability(req, 'homecloud.delete');
  return purgeTrashedMemoryById(context, contentId);
}

async function listTrashedMemoryIds(householdId) {
  const { data: rows, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id')
    .eq('household_id', householdId)
    .eq('role', 'memory')
    .eq('lifecycle', 'trashed')
    .order('trashed_at', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_trash_list_failed');
  }
  return (rows ?? []).map((row) => row.id);
}

async function purgeAllTrashedMemories(req) {
  const context = await contextWithCapability(req, 'homecloud.delete');
  const ids = await listTrashedMemoryIds(context.householdId);
  const failures = [];
  let purged = 0;

  for (const contentId of ids) {
    try {
      await purgeTrashedMemoryById(context, contentId);
      purged += 1;
    } catch (error) {
      failures.push({
        contentId,
        code: error.code ?? 'internal_error',
        message: error.statusCode && error.statusCode < 500 ? error.message : 'Error interno.',
      });
    }
  }

  return {
    requested: ids.length,
    purged,
    failed: failures.length,
    failures,
  };
}

module.exports = {
  trashMemory,
  restoreMemory,
  purgeMemory,
  purgeAllTrashedMemories,
  purgeTrashedMemoryById,
  deleteMemoryStorageArtifacts,
  deleteStorageObject,
  isStorageMissingError,
  MEMORY_LIFECYCLE_FIELDS,
};
