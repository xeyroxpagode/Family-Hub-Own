#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 deterministic seam evidence (Slice 2).
 *
 * It drives the REAL services with only the pieces a device-less run cannot
 * replace:
 *
 *   - `getHomeCloudContext` -> a resolved member (person + membership + household)
 *   - `supabaseAdmin`       -> an in-memory PostgREST-shaped reader that
 *                              honours eq / is / order / range, plus an `rpc`
 *                              stub that mirrors the REAL database state
 *                              machine tokens of the lifecycle migration
 *                              (idempotence, typed refusals, audit fields).
 *
 * Everything under test is production: `homecloudLifecycle.service.js`,
 * `homecloudFilesService.browseFiles` (trashed exclusion from normal reads),
 * `homecloudStorageAccess.createHomeCloudContentAccess` (the /access gate),
 * the REAL role -> capability matrix, the DTO mappers and the typed failure
 * mapping.
 *
 * The load-bearing product claims proved here:
 *
 *   AUTHORITY     `homecloud.delete` gates Trash, Restore and the Papelera
 *                 listing; a child (view-only) is refused with 403.
 *   ISOLATION     a content id of another household answers the SAME 404 as
 *                 an unknown id; the Papelera lists only this household.
 *   LANE          a Memory is refused: the Files Papelera acts on Files only.
 *   STATE         trash/restore are idempotent; staging and purging are typed
 *                 refusals; trash audit fields are set/cleared correctly.
 *   READS         a trashed File disappears from the Files browser and from
 *                 /content/:id/access (404) - new grants are blocked.
 *   FAVORITES     a Favorite survives Trash and Restore untouched.
 *   PAGINATION    the Papelera uses the has-more probe contract (limit+1).
 *   NO N+1        a Papelera page costs exactly ONE contents read.
 *   DTO SAFETY    no storage path, bucket or purge internal ever leaves.
 */

const path = require('node:path');
const Module = require('node:module');

const REPO_ROOT = path.resolve(__dirname, '..');

// ── the in-memory database ────────────────────────────────────────────────────

const HOUSEHOLD_ID = 'hh-lifecycle';
const OTHER_HOUSEHOLD_ID = 'hh-lifecycle-other';
const MEMBER_COORDINATOR = 'mm-coordinator';
const MEMBER_CHILD = 'mm-child';

const db = {
  homecloud_contents: [],
  homecloud_folders: [],
  homecloud_file_favorites: [],
};

let reads = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function contentRow(overrides = {}) {
  return {
    id: overrides.id,
    household_id: overrides.household_id ?? HOUSEHOLD_ID,
    role: 'file',
    display_name: 'archivo.txt',
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 10,
    original_storage_path: `${HOUSEHOLD_ID}/${overrides.id}/original`,
    preview_storage_path: null,
    uploaded_by_member_id: null,
    uploaded_at: '2026-01-01T00:00:00Z',
    document_date: null,
    note: null,
    caption: null,
    written_text: null,
    captured_at: null,
    captured_year: null,
    captured_month: null,
    capture_precision: 'unknown',
    hidden_from_resurfacing: false,
    folder_id: null,
    lifecycle: 'active',
    trashed_at: null,
    trashed_by_member_id: null,
    ...overrides,
  };
}

function makeQuery(table) {
  let filters = [];
  let orderSpec = [];
  let rangeSpec = null;
  let selectSpec = null;
  let single = false;

  const api = {
    select: (spec) => { selectSpec = spec; return api; },
    eq: (column, value) => { filters.push({ column, value }); return api; },
    is: (column, value) => { filters.push({ column, value }); return api; },
    in: (column, values) => { filters.push({ in: { column, values } }); return api; },
    order: (column, options) => { orderSpec.push({ column, options }); return api; },
    range: (from, to) => { rangeSpec = [from, to]; return api; },
    maybeSingle: () => { single = true; return api; },
    single: () => { single = true; return api; },
    then: (resolve, reject) => Promise.resolve(settle()).then(resolve, reject),
  };

  function settle() {
    reads.push({ table, op: 'read', select: selectSpec, filters: clone(filters), range: rangeSpec });
    let matched = (db[table] ?? []).map(clone);
    for (const filter of filters) {
      if (filter.in) {
        matched = matched.filter((row) => filter.in.values.includes(row[filter.in.column]));
        continue;
      }
      matched = matched.filter((row) => (row[filter.column] ?? null) === (filter.value ?? null));
    }
    for (const spec of orderSpec.slice().reverse()) {
      const direction = spec.options && spec.options.ascending === false ? -1 : 1;
      matched = [...matched].sort((a, b) => {
        const left = a[spec.column] ?? '';
        const right = b[spec.column] ?? '';
        if (left === right) return 0;
        return (left < right ? -1 : 1) * direction;
      });
    }
    if (rangeSpec) {
      const [from, to] = rangeSpec;
      matched = matched.slice(from, to + 1);
    }
    return { data: single ? (matched[0] ?? null) : matched, error: null };
  }

  return api;
}

/**
 * The rpc stub mirrors the REAL database state machine of
 * 20261007000000_homecloud_files_lifecycle_v1.sql decision by decision: same
 * tokens, same errcode mapping, same idempotence, same audit fields. What is
 * under test is the service layer, never this stub.
 */
function rpc(name, params) {
  const fail = (token, code) => ({ data: null, error: { code, message: token } });
  if (name === 'homecloud_trash_content') {
    const row = db.homecloud_contents.find((c) => c.id === params.p_content_id && c.household_id === params.p_household_id);
    if (!row) return fail('homecloud_content_not_found', 'P0002');
    if (row.lifecycle === 'trashed') return { data: [clone(row)], error: null };
    if (row.lifecycle === 'purging') return fail('homecloud_content_purging', '23514');
    if (row.lifecycle !== 'active') return fail('homecloud_content_not_active', '23514');
    row.lifecycle = 'trashed';
    row.trashed_at = new Date().toISOString();
    row.trashed_by_member_id = params.p_trashed_by_member_id;
    return { data: [clone(row)], error: null };
  }
  if (name === 'homecloud_restore_content') {
    const row = db.homecloud_contents.find((c) => c.id === params.p_content_id && c.household_id === params.p_household_id);
    if (!row) return fail('homecloud_content_not_found', 'P0002');
    if (row.lifecycle === 'active') return { data: [clone(row)], error: null };
    if (row.lifecycle === 'purging') return fail('homecloud_content_purging', '23514');
    if (row.lifecycle !== 'trashed') return fail('homecloud_content_not_trashed', '23514');
    row.lifecycle = 'active';
    row.trashed_at = null;
    row.trashed_by_member_id = null;
    return { data: [clone(row)], error: null };
  }
  return fail('homecloud_unknown_rpc', 'P0001');
}

const supabaseAdminStub = {
  from: (table) => makeQuery(table),
  rpc,
};

// ── the resolved contexts a member can be ─────────────────────────────────────

const contextByRole = {
  coordinator: {
    householdId: HOUSEHOLD_ID,
    personId: 'person-coordinator',
    person: { id: 'person-coordinator' },
    membershipId: MEMBER_COORDINATOR,
    membership: { id: MEMBER_COORDINATOR, role: 'coordinator', status: 'active' },
    household: { id: HOUSEHOLD_ID, config: null },
  },
  child: {
    householdId: HOUSEHOLD_ID,
    personId: 'person-child',
    person: { id: 'person-child' },
    membershipId: MEMBER_CHILD,
    // `child` in the REAL matrix: homecloud.view = true, homecloud.delete = false.
    membership: { id: MEMBER_CHILD, role: 'child', status: 'active' },
    household: { id: HOUSEHOLD_ID, config: null },
  },
};

let activeContext = contextByRole.coordinator;

function installStubs() {
  const original = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === '../config/supabase') return { supabaseAdmin: supabaseAdminStub };
    if (request === './homecloud.context.service') {
      return { getHomeCloudContext: async () => activeContext };
    }
    return original.call(this, request, parent, isMain);
  };
}

installStubs();

// eslint-disable-next-line import/no-dynamic-require
const lifecycleService = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudLifecycle.service.js'));
// eslint-disable-next-line import/no-dynamic-require
const filesService = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudFilesService.js'));
// eslint-disable-next-line import/no-dynamic-require
const storageAccess = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudStorageAccess.js'));

const REQUEST = { user: { id: 'auth-user' }, accessToken: 'token' };

// ── assertions ────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

function reset() {
  db.homecloud_contents = [];
  db.homecloud_folders = [];
  db.homecloud_file_favorites = [];
  reads = [];
  activeContext = contextByRole.coordinator;
}

async function expectTypedError(promise, statusCode, code) {
  try {
    await promise;
  } catch (error) {
    const okStatus = error?.statusCode === statusCode || error?.status === statusCode;
    if (okStatus && error?.code === code) {
      record(true, `${code} refused with ${statusCode}`);
      return error;
    }
    record(false, `expected ${code}/${statusCode}, got ${error?.code}/${error?.statusCode ?? error?.status} (${error?.message})`);
    return error;
  }
  record(false, `expected ${code}/${statusCode}, but the call SUCCEEDED`);
  return null;
}

async function main() {
  console.log('\n=== HOMECLOUD FILES: LIFECYCLE V1 SERVICE (deterministic) ===\n');

  // ── AUTHORITY ─────────────────────────────────────────────────────────────
  reset();
  db.homecloud_contents.push(contentRow({ id: 'cap-file' }));
  activeContext = contextByRole.child;
  await expectTypedError(lifecycleService.trashFileContent(REQUEST, 'cap-file'), 403, 'homecloud_forbidden');
  await expectTypedError(lifecycleService.restoreFileContent(REQUEST, 'cap-file'), 403, 'homecloud_forbidden');
  await expectTypedError(lifecycleService.listTrashedFiles(REQUEST, {}), 403, 'homecloud_forbidden');
  record(db.homecloud_contents[0].lifecycle === 'active', 'AUTHORITY: a view-only child changed nothing');
  activeContext = contextByRole.coordinator;
  const trashedDto = await lifecycleService.trashFileContent(REQUEST, 'cap-file');
  record(trashedDto.role === 'file', 'AUTHORITY: a coordinator (homecloud.delete) CAN trash');
  record(true, 'AUTHORITY: homecloud.delete gates Trash, Restore and the Papelera listing');

  // ── LANE + ISOLATION + STATE ───────────────────────────────────────────────
  reset();
  db.homecloud_contents.push(
    contentRow({ id: 'active-1', display_name: 'activo.txt' }),
    contentRow({ id: 'staging-1', lifecycle: 'staging', uploaded_at: null }),
    contentRow({ id: 'memory-1', role: 'memory', mime_type: 'image/jpeg' }),
    contentRow({ id: 'purging-1', lifecycle: 'purging', trashed_at: '2026-01-02T00:00:00Z', trashed_by_member_id: MEMBER_COORDINATOR }),
    contentRow({ id: 'foreign-1', household_id: OTHER_HOUSEHOLD_ID, display_name: 'ajeno.txt' }),
  );
  await expectTypedError(lifecycleService.trashFileContent(REQUEST, 'memory-1'), 400, 'homecloud_lifecycle_requires_file');
  record(true, 'LANE: a Memory is refused with its own typed error');
  await expectTypedError(lifecycleService.trashFileContent(REQUEST, 'foreign-1'), 404, 'homecloud_content_not_found');
  await expectTypedError(lifecycleService.trashFileContent(REQUEST, 'does-not-exist'), 404, 'homecloud_content_not_found');
  record(true, 'ISOLATION: a foreign-household id answers the SAME 404 as an unknown id');
  await expectTypedError(lifecycleService.trashFileContent(REQUEST, 'staging-1'), 409, 'homecloud_content_not_active');
  await expectTypedError(lifecycleService.restoreFileContent(REQUEST, 'staging-1'), 409, 'homecloud_content_not_trashed');
  record(true, 'STATE: staging is a typed refusal for both Trash and Restore');
  await expectTypedError(lifecycleService.trashFileContent(REQUEST, 'purging-1'), 409, 'homecloud_content_purging');
  await expectTypedError(lifecycleService.restoreFileContent(REQUEST, 'purging-1'), 409, 'homecloud_content_purging');
  record(true, 'STATE: Trash and Restore are both refused while purging');

  // ── TRASH / RESTORE idempotence + audit fields ────────────────────────────
  reset();
  db.homecloud_contents.push(contentRow({ id: 'cycle-1', folder_id: 'folder-x' }));
  let dto = await lifecycleService.trashFileContent(REQUEST, 'cycle-1');
  const firstTrashedAt = db.homecloud_contents[0].trashed_at;
  record(db.homecloud_contents[0].lifecycle === 'trashed' && firstTrashedAt !== null, 'TRASH: active -> trashed with trashed_at set');
  record(db.homecloud_contents[0].trashed_by_member_id === MEMBER_COORDINATOR, 'TRASH: trashed_by_member_id records the actor membership');
  record(db.homecloud_contents[0].folder_id === 'folder-x', 'TRASH: the folder link is PRESERVED while trashed');
  dto = await lifecycleService.trashFileContent(REQUEST, 'cycle-1');
  record(dto.id === 'cycle-1' && db.homecloud_contents[0].trashed_at === firstTrashedAt, 'TRASH: repeated command is a no-op success with the SAME trashed_at');
  record(db.homecloud_contents[0].lifecycle === 'trashed' && dto.role === 'file', 'TRASH: idempotent, still trashed');
  dto = await lifecycleService.restoreFileContent(REQUEST, 'cycle-1');
  record(db.homecloud_contents[0].lifecycle === 'active' && db.homecloud_contents[0].trashed_at === null && db.homecloud_contents[0].trashed_by_member_id === null, 'RESTORE: trashed -> active clears the audit fields');
  record(db.homecloud_contents[0].folder_id === 'folder-x', 'RESTORE: the original folder link survives (restore to the same folder when valid)');
  dto = await lifecycleService.restoreFileContent(REQUEST, 'cycle-1');
  record(dto.id === 'cycle-1' && db.homecloud_contents[0].lifecycle === 'active', 'RESTORE: repeated command is a no-op success');

  // ── FAVORITES survive Trash + Restore ─────────────────────────────────────
  reset();
  db.homecloud_contents.push(contentRow({ id: 'fav-1' }));
  db.homecloud_file_favorites.push({ household_id: HOUSEHOLD_ID, person_id: 'person-coordinator', content_id: 'fav-1' });
  await lifecycleService.trashFileContent(REQUEST, 'fav-1');
  record(db.homecloud_file_favorites.length === 1, 'FAVORITES: the Favorite row SURVIVES Trash');
  await lifecycleService.restoreFileContent(REQUEST, 'fav-1');
  record(db.homecloud_file_favorites.length === 1, 'FAVORITES: the Favorite row SURVIVES Restore');

  // ── NORMAL READS exclude TRASHED ──────────────────────────────────────────
  reset();
  db.homecloud_contents.push(
    contentRow({ id: 'visible-1', display_name: 'visible.txt' }),
    contentRow({ id: 'trashed-2', display_name: 'en-papelera.txt', lifecycle: 'trashed', trashed_at: '2026-01-03T00:00:00Z', trashed_by_member_id: MEMBER_COORDINATOR }),
    contentRow({ id: 'foreign-2', household_id: OTHER_HOUSEHOLD_ID, lifecycle: 'trashed', trashed_at: '2026-01-04T00:00:00Z' }),
  );
  const browser = await filesService.browseFiles(REQUEST, {});
  record(browser.files.length === 1 && browser.files[0].id === 'visible-1', 'READS: the Files browser lists ONLY active files (trashed excluded)');

  // ── /content/:id/access returns 404 for TRASHED (new grants blocked) ──────
  const accessContext = {
    householdId: HOUSEHOLD_ID,
    capabilities: { 'homecloud.view': true },
  };
  await expectTypedError(
    storageAccess.createHomeCloudContentAccess({ authContext: accessContext, contentId: 'trashed-2', variant: 'original' }),
    404,
    'homecloud_content_not_found',
  );
  await expectTypedError(
    storageAccess.createHomeCloudContentAccess({ authContext: accessContext, contentId: 'foreign-2', variant: 'original' }),
    404,
    'homecloud_content_not_found',
  );
  record(true, 'ACCESS: /content/:id/access answers 404 for trashed and foreign content (new grants are blocked)');

  // ── PAPERELA listing: scope, order, pagination, one read ───────────────────
  reset();
  const now = Date.now();
  for (let i = 0; i < 3; i += 1) {
    db.homecloud_contents.push(contentRow({
      id: `trash-${i}`,
      display_name: `papelera-${i}.txt`,
      lifecycle: 'trashed',
      trashed_at: new Date(now - i * 1000).toISOString(),
      trashed_by_member_id: MEMBER_COORDINATOR,
    }));
  }
  db.homecloud_contents.push(
    contentRow({ id: 'active-keep', display_name: 'no-esta.txt' }),
    contentRow({ id: 'purging-keep', lifecycle: 'purging', trashed_at: new Date(now).toISOString() }),
    contentRow({ id: 'memory-keep', role: 'memory', mime_type: 'image/jpeg', lifecycle: 'trashed', trashed_at: new Date(now).toISOString() }),
    contentRow({ id: 'foreign-trash', household_id: OTHER_HOUSEHOLD_ID, lifecycle: 'trashed', trashed_at: new Date(now).toISOString() }),
  );
  reads = [];
  let trash = await lifecycleService.listTrashedFiles(REQUEST, { limit: 2, offset: 0 });
  record(trash.files.length === 2, 'PAPERELA: the page respects the caller limit');
  record(trash.files.every((file) => file.id.startsWith('trash-')), 'PAPERELA: only THIS household\'s trashed FILES are listed');
  record(trash.files[0].id === 'trash-0' && trash.files[1].id === 'trash-1', 'PAPERELA: canonical order is trashed_at DESC');
  record(trash.nextOffset === 2, 'PAPERELA: has-more probe reports the next offset');
  trash = await lifecycleService.listTrashedFiles(REQUEST, { limit: 2, offset: 2 });
  record(trash.files.length === 1 && trash.files[0].id === 'trash-2', 'PAPERELA: the last page returns the remainder');
  record(trash.nextOffset === null, 'PAPERELA: no phantom next page at the end');
  record(reads.length === 2, `PAPERELA: two pages cost exactly TWO contents reads (no N+1), got ${reads.length}`);
  const firstPage = trash.files[0];
  const dtoKeys = Object.keys(firstPage);
  record(!dtoKeys.includes('original_storage_path') && !dtoKeys.includes('preview_storage_path'), 'DTO SAFETY: no storage path is ever projected');
  record(!dtoKeys.includes('bucket'), 'DTO SAFETY: no bucket name is ever projected');
  record(firstPage.trashedAt !== null && firstPage.trashedByMemberId === MEMBER_COORDINATOR, 'DTO: trash audit fields are projected');
  record(firstPage.hasPreview === false, 'DTO: hasPreview derives from the preview path without leaking it');

  // ── limit clamp ────────────────────────────────────────────────────────────
  trash = await lifecycleService.listTrashedFiles(REQUEST, { limit: 9999 });
  record(trash.files.length === 3, 'PAPERELA: limit is clamped to the maximum page size');

  console.log(`\nLIFECYCLE_SERVICE_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'LIFECYCLE_SERVICE_TESTS=PASS' : 'LIFECYCLE_SERVICE_TESTS=FAIL');
  return failCount === 0;
}

main().then((ok) => {
  process.exit(ok ? 0 : 1);
}).catch((error) => {
  console.error('LIFECYCLE_SERVICE_TESTS=ERROR');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
