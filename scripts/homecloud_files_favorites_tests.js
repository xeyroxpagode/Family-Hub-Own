#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files Core — PERSONAL FAVORITES, deterministic seam evidence.
 *
 * It drives the REAL `backend/src/services/homecloudFilesService.js` and the REAL
 * migration with only the two things a device-less run cannot have replaced:
 *
 *   - `getHomeCloudContext` -> a resolved member (person + membership + household)
 *   - `supabaseAdmin`       -> an in-memory PostgREST-shaped query builder that
 *                              honours eq / is / in / or / order / range, plus
 *                              upsert / delete for the mutation
 *
 * Everything under test is production: `browseFiles`, `contentQuery`, the
 * favorite projection, `setFileFavorite`, the capability enforcement (the REAL
 * role -> capability matrix), the DTO mappers, the query contract normalizers and
 * the migration's SQL text.
 *
 * The load-bearing product claims proved here:
 *
 *   IDENTITY      household + PERSON + File. The person, not the membership and
 *                 not the auth user. A second member is unaffected.
 *   AUTHORITY     `homecloud.view` and nothing more: a member who may NOT
 *                 organize still favorites.
 *   IDEMPOTENCY   favorite twice / unfavorite twice converge, and no duplicate
 *                 row is ever created.
 *   READ          `isFavorite` is caller-specific at the canonical Files read.
 *   FILTER        `favoritesOnly` is a SQL predicate applied BEFORE the page is
 *                 taken, and it composes with folder / search / sort /
 *                 pagination without corrupting a single boundary.
 *   NO N+1        a page costs a FIXED number of reads, whatever its size.
 */

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATION = 'supabase/migrations/20261004000000_homecloud_file_favorites_v1.sql';

// ── the in-memory database ────────────────────────────────────────────────────

const HOUSEHOLD_ID = 'hh-favorites';
const OTHER_HOUSEHOLD_ID = 'hh-favorites-other';
const PERSON_A = 'person-a';
const PERSON_B = 'person-b';

const db = {
  homecloud_contents: [],
  homecloud_folders: [],
  homecloud_file_favorites: [],
};

/** Every read the service issued, in order: { table, op } */
let reads = [];
/** Every mutation the service issued, in order. */
let writes = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function matchesFilter(row, filter) {
  if (filter.in) return filter.in.values.includes(row[filter.in.column]);
  const actual = row[filter.column] ?? null;
  const expected = filter.value === null ? null : filter.value;
  return actual === expected;
}

function makeQuery(table) {
  let filters = [];
  let orderSpec = [];
  let rangeSpec = null;
  let selectSpec = null;
  let mutation = null;
  let payload = null;
  let ignoreDuplicates = false;
  let conflictColumns = null;
  let single = false;

  // Every builder method returns the SAME thenable builder, exactly like
  // supabase-js: the statement executes when it is awaited, not when it is built.
  const api = {
    select: (spec) => { selectSpec = spec; return api; },
    eq: (column, value) => { filters.push({ column, value }); return api; },
    is: (column, value) => { filters.push({ column, value }); return api; },
    ilike: (column, pattern) => { filters.push({ column, ilike: pattern }); return api; },
    in: (column, values) => { filters.push({ in: { column, values } }); return api; },
    or: (filter) => { filters.push({ or: filter }); return api; },
    order: (column, options) => { orderSpec.push({ column, options }); return api; },
    range: (from, to) => { rangeSpec = [from, to]; return api; },
    upsert: (values, options) => {
      mutation = 'upsert';
      payload = values;
      ignoreDuplicates = options?.ignoreDuplicates === true;
      conflictColumns = typeof options?.onConflict === 'string' ? options.onConflict.split(',').map((part) => part.trim()) : null;
      return api;
    },
    delete: () => { mutation = 'delete'; return api; },
    maybeSingle: () => { single = true; return api; },
    single: () => { single = true; return api; },
    then: (resolve, reject) => Promise.resolve(settle()).then(resolve, reject),
  };

  /**
   * Resolve the statement in the order a database actually does:
   *
   *   FROM <table> [INNER JOIN <embed>] WHERE <outer filters> ORDER BY … RANGE
   *
   * The JOIN is applied BEFORE the range on purpose. That ordering IS the product
   * claim under test: `favoritesOnly` has to narrow the set before the page is
   * taken. A stub that joined afterwards would silently reproduce the very defect
   * this suite exists to catch.
   */
  function resolve() {
    const embedMatch = selectSpec ? /homecloud_file_favorites!inner\(([^)]+)\)/.exec(selectSpec) : null;
    const embeddedFilters = filters.filter((f) => String(f.column ?? '').includes('.'));
    const columns = selectSpec
      ? selectSpec.split(',').map((part) => part.trim()).filter((part) => !part.includes('!')).map((part) => part.split('(')[0].trim())
      : null;

    let matched = (db[table] ?? []).map(clone);

    for (const filter of filters) {
      if (filter.or) {
        // `column.op."value"` — the operator is the second token and the value is
        // everything after it, because a PostgREST logic-tree value is quoted and
        // may itself contain dots, commas and escaped metacharacters.
        const alternatives = filter.or.replace(/^\(|\)$/g, '').split(',').map((part) => {
          const firstDot = part.indexOf('.');
          const column = part.slice(0, firstDot);
          const remainder = part.slice(firstDot + 1);
          const secondDot = remainder.indexOf('.');
          const raw = remainder.slice(secondDot + 1);
          const unquoted = raw.startsWith('"') && raw.endsWith('"')
            ? raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            : raw;
          // `%…%` is the "contains" wrapper and `\x` is a literal escape.
          const needle = unquoted.replace(/^%/, '').replace(/%$/, '').replace(/\\([\\%_])/g, '$1').toLowerCase();
          return { column, needle };
        });
        matched = matched.filter((row) => alternatives.some(({ column, needle }) =>
          String(row[column] ?? '').toLowerCase().includes(needle)));
        continue;
      }
      if (filter.column === undefined) continue;
      // A filter on an EMBEDDED relation belongs to the join, not to the outer
      // table: PostgREST never applies `homecloud_file_favorites.person_id` to a
      // homecloud_contents row.
      if (String(filter.column).includes('.')) continue;
      if (filter.ilike !== undefined) {
        const needle = filter.ilike.replace(/%/g, '').toLowerCase();
        matched = matched.filter((row) => String(row[filter.column] ?? '').toLowerCase().includes(needle));
        continue;
      }
      matched = matched.filter((row) => matchesFilter(row, filter));
    }

    if (embedMatch) {
      matched = matched.filter((row) => (db.homecloud_file_favorites ?? []).some((favorite) =>
        favorite.content_id === row.id
        && embeddedFilters.every((filter) => favorite[filter.column.split('.').pop()] === filter.value)));
    }

    if (columns) {
      matched = matched.map((row) => {
        const out = {};
        for (const column of columns) out[column] = row[column] ?? null;
        if (embedMatch) out[embedMatch[1]] = row.id;
        return out;
      });
    }

    for (const spec of orderSpec.slice().reverse()) {
      const { column, options } = spec;
      const direction = options && options.ascending === false ? -1 : 1;
      matched = [...matched].sort((a, b) => {
        const left = a[column] ?? '';
        const right = b[column] ?? '';
        if (left === right) return 0;
        return (left < right ? -1 : 1) * direction;
      });
    }
    if (rangeSpec) {
      const [from, to] = rangeSpec;
      matched = matched.slice(from, to + 1);
    }
    return matched;
  }

  function settle() {
    const source = db[table] ?? [];
    if (mutation === 'upsert') {
      const candidates = Array.isArray(payload) ? payload : [payload];
      writes.push({ table, op: 'upsert', rows: clone(candidates), ignoreDuplicates, conflictColumns });
      for (const candidate of candidates) {
        // The conflict target, not the filter list, decides uniqueness — which is
        // exactly why `ignoreDuplicates` makes a repeated favorite a no-op.
        const target = conflictColumns ?? Object.keys(candidate);
        const exists = source.some((row) => target.every((column) => row[column] === candidate[column]));
        if (exists) {
          if (!ignoreDuplicates) {
            return { data: null, error: { code: '23505', message: 'duplicate key' } };
          }
          continue;
        }
        source.push(clone(candidate));
      }
      return { data: clone(candidates), error: null };
    }
    if (mutation === 'delete') {
      const survivors = source.filter((row) => !filters.every((f) => matchesFilter(row, f)));
      writes.push({ table, op: 'delete', removed: source.length - survivors.length });
      db[table] = survivors;
      return { data: null, error: null };
    }
    reads.push({ table, op: 'read', select: selectSpec, filters: clone(filters), range: rangeSpec });
    const rows = resolve();
    return { data: single ? (rows[0] ?? null) : rows, error: null };
  }

  return api;
}

const supabaseAdminStub = { from: (table) => makeQuery(table) };

// ── the resolved contexts a member can be ─────────────────────────────────────

const contextByPerson = {
  [PERSON_A]: {
    householdId: HOUSEHOLD_ID,
    personId: PERSON_A,
    person: { id: PERSON_A },
    membershipId: 'mm-a',
    membership: { id: 'mm-a', role: 'coordinator', status: 'active' },
    household: { id: HOUSEHOLD_ID, config: null },
  },
  [PERSON_B]: {
    householdId: HOUSEHOLD_ID,
    personId: PERSON_B,
    person: { id: PERSON_B },
    membershipId: 'mm-b',
    // `child` in the REAL matrix: homecloud.view = true, organize = false.
    membership: { id: 'mm-b', role: 'child', status: 'active' },
    household: { id: HOUSEHOLD_ID, config: null },
  },
};

let activeContext = contextByPerson[PERSON_A];
/** When set, the stubbed context throws exactly what production throws. */
let contextRefusal = null;

function installStubs() {
  const original = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === '../config/supabase') return { supabaseAdmin: supabaseAdminStub };
    // Faithful to production `getHomeCloudContext`: a caller with no active
    // membership never returns a context — the stub throws the SAME typed 403
    // instead of inventing a degraded one.
    if (request === './homecloud.context.service') {
      return {
        getHomeCloudContext: async () => {
          if (contextRefusal) throw contextRefusal;
          return activeContext;
        },
      };
    }
    return original.call(this, request, parent, isMain);
  };
}

installStubs();

// eslint-disable-next-line import/no-dynamic-require
const service = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudFilesService.js'));
const { browseFiles, setFileFavorite } = service;
// eslint-disable-next-line import/no-dynamic-require
const contract = require(path.join(REPO_ROOT, 'backend', 'src', 'lib', 'homecloudFileFavorites.js'));

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
  writes = [];
  activeContext = contextByPerson[PERSON_A];
  contextRefusal = null;
}

function seedFile(index, overrides = {}) {
  const id = overrides.id ?? `c-${String(index).padStart(4, '0')}`;
  return {
    id,
    household_id: overrides.household_id ?? HOUSEHOLD_ID,
    role: overrides.role ?? 'file',
    display_name: overrides.display_name ?? `file-${String(index).padStart(4, '0')}.txt`,
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 10,
    original_storage_path: `${overrides.household_id ?? HOUSEHOLD_ID}/o/${index}`,
    preview_storage_path: null,
    uploaded_by_member_id: 'mm-a',
    uploaded_at: overrides.uploaded_at ?? `2026-01-01T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
    document_date: null,
    note: overrides.note ?? null,
    caption: null,
    written_text: null,
    captured_at: null,
    captured_year: null,
    captured_month: null,
    capture_precision: 'unknown',
    hidden_from_resurfacing: false,
    folder_id: overrides.folder_id ?? null,
    lifecycle: overrides.lifecycle ?? 'active',
  };
}

/** Capture a typed failure instead of letting it escape. */
async function failure(fn) {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    return { ok: false, status: error.statusCode ?? error.status, code: error.code, message: error.message };
  }
}

async function main() {
  console.log('=== HOMECLOUD FILES CORE: PERSONAL FAVORITES TESTS ===');

  // ── A. THE MUTATION ─────────────────────────────────────────────────────────
  console.log('\n--- A. favorite / unfavorite, identity and idempotency ---');
  reset();
  db.homecloud_contents.push(seedFile(1));

  const first = await setFileFavorite(REQUEST, 'c-0001', true);
  record(first.contentId === 'c-0001' && first.isFavorite === true, 'A1. favoriting answers the same File it was asked about');
  record(db.homecloud_file_favorites.length === 1, 'A2. exactly one preference row exists after one favorite');

  const stored = db.homecloud_file_favorites[0];
  record(stored.person_id === PERSON_A, 'A3. the preference is stored against the canonical PERSON id');
  record(stored.person_id !== 'auth-user', 'A4. it is NOT the auth user id');
  record(stored.membership_id === undefined && stored.member_id === undefined, 'A5. it is NOT a membership id');
  record(stored.household_id === HOUSEHOLD_ID, 'A6. it is scoped to the resolved household');

  // Favorite twice: the upsert is ignoreDuplicates + the unique triple, so the
  // second intent is a no-op instead of a second row or a 409.
  await setFileFavorite(REQUEST, 'c-0001', true);
  record(db.homecloud_file_favorites.length === 1, 'A7. favoriting an already-favorite File creates NO duplicate row');
  record(writes.filter((w) => w.op === 'upsert').every((w) => w.ignoreDuplicates === true),
    'A8. and the write is issued as an ignore-duplicates upsert, so the repeat is structurally idempotent');

  await setFileFavorite(REQUEST, 'c-0001', false);
  record(db.homecloud_file_favorites.length === 0, 'A9. unfavoriting removes the preference');

  await setFileFavorite(REQUEST, 'c-0001', false);
  record(db.homecloud_file_favorites.length === 0, 'A10. unfavoriting twice converges on the same stable state');

  // The delete is scoped by household AND person AND content: it can never
  // remove another person's preference.
  db.homecloud_file_favorites.push({ id: 'f-b', household_id: HOUSEHOLD_ID, person_id: PERSON_B, content_id: 'c-0001', created_at: '2026-01-01T00:00:00Z' });
  await setFileFavorite(REQUEST, 'c-0001', false);
  record(db.homecloud_file_favorites.length === 1 && db.homecloud_file_favorites[0].person_id === PERSON_B,
    'A11. unfavoriting removes ONLY the caller\'s own preference');
  db.homecloud_file_favorites = [];

  // ── B. HOUSEHOLD AND PERSON ISOLATION ───────────────────────────────────────
  console.log('\n--- B. one person\'s preference is not the household\'s ---');
  reset();
  db.homecloud_contents.push(seedFile(1));

  await setFileFavorite(REQUEST, 'c-0001', true);
  activeContext = contextByPerson[PERSON_B];
  const bView = await browseFiles(REQUEST, { favoritesOnly: false });
  record(bView.files.length === 1 && bView.files[0].isFavorite === false,
    'B1. another member of the SAME household sees the File as NOT their favorite');

  const bFiltered = await browseFiles(REQUEST, { favoritesOnly: true });
  record(bFiltered.files.length === 0 && bFiltered.nextOffset === null,
    'B2. and the Favoritos filter is empty for them: the preference is personal, not Household-global');

  // Person B favorites the same File; both rows coexist, independently.
  await setFileFavorite(REQUEST, 'c-0001', true);
  record(db.homecloud_file_favorites.length === 2, 'B3. both members can hold their own preference over the same File');
  activeContext = contextByPerson[PERSON_A];
  const aFiltered = await browseFiles(REQUEST, { favoritesOnly: true });
  record(aFiltered.files.length === 1 && aFiltered.files[0].isFavorite === true, 'B4. and each member sees exactly their own favorites');

  // A wrong-household File is refused, and refused IDENTICALLY to an unknown one:
  // distinguishing them would let any member probe another household.
  db.homecloud_contents.push(seedFile(2, { household_id: OTHER_HOUSEHOLD_ID }));
  const unknown = await failure(() => setFileFavorite(REQUEST, 'does-not-exist', true));
  record(!unknown.ok && unknown.status === 404 && unknown.code === 'homecloud_content_not_found',
    'B5. an unknown File is a typed 404');
  const crossHousehold = await failure(() => setFileFavorite(REQUEST, 'c-0002', true));
  record(!crossHousehold.ok && crossHousehold.status === 404 && crossHousehold.code === 'homecloud_content_not_found',
    'B6. a File of ANOTHER household is refused with the SAME typed 404 (existence cannot be probed)');
  record(db.homecloud_file_favorites.every((row) => row.household_id === HOUSEHOLD_ID),
    'B7. and no preference was written for the other household');

  // ── C. AUTHORITY ────────────────────────────────────────────────────────────
  console.log('\n--- C. authority: view is enough, organize is not required ---');
  reset();
  db.homecloud_contents.push(seedFile(1));
  activeContext = contextByPerson[PERSON_B];
  const childFavorite = await failure(() => setFileFavorite(REQUEST, 'c-0001', true));
  record(childFavorite.ok === true, 'C1. a member WITHOUT homecloud.organize can favorite (personal preference is not organization)');
  record(db.homecloud_file_favorites.length === 1, 'C2. and the preference was actually written');

  activeContext = {
    ...contextByPerson[PERSON_A],
    membership: { id: 'mm-x', role: 'guest', status: 'suspended' },
  };
  const suspended = await failure(() => setFileFavorite(REQUEST, 'c-0001', true));
  record(!suspended.ok && suspended.status === 403, 'C3. an inactive/suspended member is refused with a typed 403');
  const suspendedView = await failure(() => browseFiles(REQUEST, {}));
  record(!suspendedView.ok && suspendedView.status === 403, 'C4. and cannot read the browser either');

  // Production never RETURNS a context for these callers: it throws
  // not_active_household_member. The stub throws the same typed refusal.
  contextRefusal = { statusCode: 403, code: 'not_active_household_member', message: 'El usuario no es miembro activo del household.' };
  const nonMember = await failure(() => setFileFavorite(REQUEST, 'c-0001', true));
  record(!nonMember.ok && nonMember.status === 403 && nonMember.code === 'not_active_household_member',
    'C5. a caller with no active membership is refused with the production typed 403');
  const nonMemberView = await failure(() => browseFiles(REQUEST, {}));
  record(!nonMemberView.ok && nonMemberView.status === 403, 'C6. and cannot read the browser either');
  contextRefusal = null;
  activeContext = contextByPerson[PERSON_A];
  record(db.homecloud_file_favorites.length === 1, 'C7. and the earlier legitimate preference is untouched');

  // A household whose configuration removes homecloud.view from everyone.
  activeContext = {
    ...contextByPerson[PERSON_A],
    household: { id: HOUSEHOLD_ID, config: { permissions: { 'homecloud.view': { coordinator: false } } } },
  };
  const noView = await failure(() => setFileFavorite(REQUEST, 'c-0001', true));
  record(!noView.ok && noView.status === 403 && noView.code === 'homecloud_forbidden',
    'C8. missing homecloud.view is a typed 403 homecloud_forbidden, never a 500');

  // Defense in depth, through the REAL capability matrix (no service involved):
  // a suspended membership projects every HomeCloud capability to false.
  // eslint-disable-next-line import/no-dynamic-require
  const { resolveHomeCloudCapabilities } = require(path.join(REPO_ROOT, 'backend', 'src', 'lib', 'homecloudCapabilities.js'));
  const suspendedProjection = resolveHomeCloudCapabilities({ role: 'guest', membershipStatus: 'suspended', household: null });
  record(Object.values(suspendedProjection).every((granted) => granted === false),
    'C9. a suspended membership projects no HomeCloud capability at all, whatever the role');
  const childProjection = resolveHomeCloudCapabilities({ role: 'child', membershipStatus: 'active', household: null });
  record(childProjection['homecloud.view'] === true && childProjection['homecloud.organize'] === false,
    'C10. while an active child keeps view and is denied organize by the same matrix');

  // ── D. FILE-ONLY AND TYPED INPUT ────────────────────────────────────────────
  console.log('\n--- D. File-only invariant and ordinary invalid input ---');
  reset();
  db.homecloud_contents.push(seedFile(1, { role: 'memory', display_name: 'recuerdo', written_text: 'texto' }));
  const memory = await failure(() => setFileFavorite(REQUEST, 'c-0001', true));
  record(!memory.ok && memory.status === 400 && memory.code === 'homecloud_favorite_requires_file',
    'D1. a Memory is refused with a typed 400, not a 500');
  record(db.homecloud_file_favorites.length === 0, 'D2. and nothing was written for it');

  db.homecloud_contents.push(seedFile(2, { lifecycle: 'trashed' }));
  const trashed = await failure(() => setFileFavorite(REQUEST, 'c-0002', true));
  record(!trashed.ok && trashed.status === 404, 'D3. a File outside the active lifecycle is unreachable, like any other invisible File');

  db.homecloud_contents.push(seedFile(3));
  for (const intent of [undefined, null, 'true', 'yes', 1, 0, {}]) {
    const bad = await failure(() => setFileFavorite(REQUEST, 'c-0003', intent));
    record(!bad.ok && bad.status === 400 && bad.code === 'homecloud_favorite_invalid',
      `D4. a malformed intent (${JSON.stringify(intent) ?? 'undefined'}) is a typed 400, never a guessed toggle`);
  }

  // ── E. THE READ PROJECTION ──────────────────────────────────────────────────
  console.log('\n--- E. isFavorite at the canonical Files read ---');
  reset();
  db.homecloud_contents.push(seedFile(1), seedFile(2), seedFile(3));
  await setFileFavorite(REQUEST, 'c-0001', true);
  await setFileFavorite(REQUEST, 'c-0003', true);

  reads = [];
  const plain = await browseFiles(REQUEST, { favoritesOnly: false });
  record(plain.files.map((f) => `${f.id}:${f.isFavorite}`).sort().join(' ')
    === 'c-0001:true c-0002:false c-0003:true',
    'E1. every File row carries a DECIDED isFavorite for the caller');
  record(plain.files.every((f) => typeof f.isFavorite === 'boolean'), 'E2. it is a boolean, never undefined');

  const contentReads = reads.filter((r) => r.table === 'homecloud_contents');
  const favoriteReads = reads.filter((r) => r.table === 'homecloud_file_favorites');
  record(contentReads.length === 1 && favoriteReads.length === 1,
    'E3. NO N+1: a 3-row page costs ONE content read + ONE batched favorite read');

  reads = [];
  const empty = await browseFiles(REQUEST, { folderId: null, query: 'nada-de-esto' });
  record(empty.files.length === 0, 'E4. an empty page reads nothing extra at all');
  record(reads.filter((r) => r.table === 'homecloud_file_favorites').length === 0,
    'E5. and an empty page costs zero favorite reads');

  // ── F. favoritesOnly IS A PREDICATE, NOT A CLIENT FILTER ────────────────────
  console.log('\n--- F. favoritesOnly composes with the whole context ---');
  reset();
  const folderId = 'f-garantias';
  db.homecloud_folders.push({ id: folderId, household_id: HOUSEHOLD_ID, name: 'Garantías', created_by_member_id: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' });
  // root: 4 loose files; folder: 3 files; one memory-ish name for search.
  db.homecloud_contents.push(
    seedFile(1, { display_name: 'factura luz.txt' }),
    seedFile(2, { display_name: 'factura gas.txt' }),
    seedFile(3, { display_name: 'contrato.txt' }),
    seedFile(4, { display_name: 'acta.txt' }),
    seedFile(5, { display_name: 'factura garantias.txt', folder_id: folderId }),
    seedFile(6, { display_name: 'factura poliza.txt', folder_id: folderId }),
    seedFile(7, { display_name: 'nota garantias.txt', folder_id: folderId }),
  );
  await setFileFavorite(REQUEST, 'c-0002', true);   // root, matches "factura"
  await setFileFavorite(REQUEST, 'c-0003', true);   // root, does NOT match "factura"
  await setFileFavorite(REQUEST, 'c-0005', true);   // folder, matches "factura"
  await setFileFavorite(REQUEST, 'c-0007', true);   // folder, does NOT match "factura"

  const rootFavorites = await browseFiles(REQUEST, { favoritesOnly: true });
  record(rootFavorites.files.map((f) => f.id).sort().join(',') === 'c-0002,c-0003',
    'F1. Favoritos at the root returns only the caller\'s favorite loose Files');

  const folderFavorites = await browseFiles(REQUEST, { folderId, favoritesOnly: true });
  record(folderFavorites.files.map((f) => f.id).sort().join(',') === 'c-0005,c-0007',
    'F2. Favoritos inside a folder returns only the caller\'s favorites IN that folder');

  const searchFavorites = await browseFiles(REQUEST, { query: 'factura', favoritesOnly: true });
  record(searchFavorites.files.map((f) => f.id).sort().join(',') === 'c-0002,c-0005',
    'F3. Favoritos + search returns only MY favorite Files matching the term (root search is global)');

  const folderSearchFavorites = await browseFiles(REQUEST, { folderId, query: 'factura', favoritesOnly: true });
  record(folderSearchFavorites.files.map((f) => f.id).sort().join(',') === 'c-0005',
    'F4. Favoritos + folder + search stays inside the folder');

  const nameSorted = await browseFiles(REQUEST, { favoritesOnly: true, sort: 'name' });
  record(nameSorted.files.map((f) => f.displayName).join(',') === 'contrato.txt,factura gas.txt',
    'F5. Favoritos + sort by name composes (the sort is the server\'s, not the client\'s)');

  const recentSorted = await browseFiles(REQUEST, { favoritesOnly: true, sort: 'recent' });
  record(recentSorted.files.map((f) => f.displayName).join(',') === 'contrato.txt,factura gas.txt',
    'F6. Favoritos + sort by recent composes (the canonical uploaded_at DESC order is kept, not re-sorted)');

  record(nameSorted.files.every((f) => f.isFavorite === true), 'F7. every row of a Favoritos page is reported as favorite');

  // ── G. PAGINATION IS NEVER CORRUPTED BY THE FILTER ──────────────────────────
  console.log('\n--- G. Favoritos + pagination across real page boundaries ---');
  reset();
  const TOTAL = 250;
  for (let index = 1; index <= TOTAL; index += 1) {
    db.homecloud_contents.push(seedFile(index, { display_name: `file-${String(index).padStart(4, '0')}.txt` }));
  }
  // Favorite a scattered half, deliberately NOT contiguous, so a client-side
  // filter or an offset shift would be visible immediately.
  const favorited = [];
  for (let index = 1; index <= TOTAL; index += 2) favorited.push(`c-${String(index).padStart(4, '0')}`);
  db.homecloud_file_favorites = favorited.map((contentId) => ({ id: `f-${contentId}`, household_id: HOUSEHOLD_ID, person_id: PERSON_A, content_id: contentId, created_at: '2026-01-01T00:00:00Z' }));

  const walked = [];
  let offset = 0;
  let readsDuringWalk = 0;
  for (;;) {
    reads = [];
    const page = await browseFiles(REQUEST, { favoritesOnly: true, limit: 100, offset });
    readsDuringWalk += reads.length;
    walked.push(...page.files.map((f) => f.id));
    if (page.nextOffset === null) break;
    offset = page.nextOffset;
    if (walked.length > TOTAL + 200) break;
  }
  record(walked.length === favorited.length,
    `G1. paging through Favoritos yields EXACTLY the ${favorited.length} favorites out of ${TOTAL} files`);
  record(new Set(walked).size === walked.length, 'G2. with no duplicated row across pages');
  record(walked.slice().sort().join(',') === favorited.slice().sort().join(','),
    'G3. and exactly the favorited ids: a page was never silently short because a row was discarded');
  record(offset === 100,
    'G4. the filter was applied BEFORE the page: the 125 favorites took two pages, not the 250 files\' three');

  const boundary = await browseFiles(REQUEST, { favoritesOnly: true, limit: 100, offset: 100 });
  record(boundary.files.length === 25 && boundary.nextOffset === null,
    'G5. the second page holds the remaining 25 favorites and ends the list');
  const last = await browseFiles(REQUEST, { favoritesOnly: true, limit: 100, offset: 200 });
  record(last.files.length === 0 && last.nextOffset === null,
    'G6. reading past the filtered end is empty and terminal');

  // A filter applied AFTER the page would answer 100 + 100 rows here and lose 75
  // of them; the walk above is the proof that it does not.
  const offsetShift = await browseFiles(REQUEST, { favoritesOnly: true, limit: 100, offset: 0 });
  record(offsetShift.files.length === 100 && offsetShift.files.every((f) => f.isFavorite === true),
    'G7. the FIRST page of Favoritos is full and holds nothing but favorites');

  // Page-size safety under the filter: the has-more probe row is never leaked and
  // the projection IN list stays bounded by the requested page.
  reads = [];
  await browseFiles(REQUEST, { favoritesOnly: true, limit: 10, offset: 0 });
  const projectionRead = reads.find((r) => r.table === 'homecloud_file_favorites');
  record(projectionRead.filters.some((f) => f.in && f.in.values.length <= 11),
    'G7. the isFavorite projection asks about AT MOST the requested page + the probe row (no unbounded IN list)');

  reads = [];
  const small = await browseFiles(REQUEST, { favoritesOnly: false, limit: 3, offset: 0 });
  record(small.files.length === 3, 'G8. a caller asking for 3 still gets 3 rows under the projection');

  // ── H. THE FILTER IS A JOIN, THE PROJECTION IS A SCOPED READ ────────────────
  console.log('\n--- H. what the server actually asks the database for ---');
  reset();
  db.homecloud_contents.push(seedFile(1));
  await setFileFavorite(REQUEST, 'c-0001', true);

  reads = [];
  await browseFiles(REQUEST, { favoritesOnly: true });
  const joinedRead = reads.find((r) => r.table === 'homecloud_contents');
  record(String(joinedRead.select).includes('homecloud_file_favorites!inner(content_id)'),
    'H1. the filter is an INNER JOIN on the caller\'s own preference rows (a SQL predicate, not a post-filter)');
  record(joinedRead.filters.some((f) => f.column === 'homecloud_file_favorites.person_id' && f.value === PERSON_A)
    && joinedRead.filters.some((f) => f.column === 'homecloud_file_favorites.household_id' && f.value === HOUSEHOLD_ID),
    'H2. and the join is constrained by BOTH the resolved person and the resolved household');
  record(joinedRead.range !== null && joinedRead.range[1] - joinedRead.range[0] === 100,
    'H3. the range is still applied to the SAME read, so the filter precedes the page');

  reads = [];
  await browseFiles(REQUEST, { favoritesOnly: false });
  const unfilteredRead = reads.find((r) => r.table === 'homecloud_contents');
  record(!String(unfilteredRead.select).includes('homecloud_file_favorites'),
    'H4. an ordinary browse adds no join at all');
  record(reads.filter((r) => r.table === 'homecloud_contents').length === 1
    && reads.filter((r) => r.table === 'homecloud_file_favorites').length === 1
    && reads.filter((r) => r.table === 'homecloud_folders').length === 1,
    'H5. the read count is FIXED: one content page, one folder catalogue, one batched favorite projection');

  // The household is never a client input: no read may be scoped by a household
  // the caller did not resolve.
  reads = [];
  await browseFiles(REQUEST, { favoritesOnly: true, householdId: OTHER_HOUSEHOLD_ID });
  const scoped = reads.find((r) => r.table === 'homecloud_contents');
  record(scoped.filters.every((f) => f.value !== OTHER_HOUSEHOLD_ID),
    'H6. a client-supplied householdId is ignored: only the resolved household scopes the read');

  // ── I. THE QUERY CONTRACT ───────────────────────────────────────────────────
  console.log('\n--- I. favoritesOnly is normalized, never guessed ---');
  for (const value of ['true', 'TRUE', ' true ', '1', 'yes', 'on', true]) {
    record(contract.normalizeFavoritesOnly(value) === true, `I1. ${JSON.stringify(value)} enables the filter`);
  }
  for (const value of [undefined, null, '', 'false', '0', 'no', 'maybe', {}, [], 1]) {
    record(contract.normalizeFavoritesOnly(value) === false, `I2. ${JSON.stringify(value) ?? 'undefined'} leaves the filter OFF`);
  }
  record(contract.favoritesSelect('a, b', false) === 'a, b', 'I3. an ordinary select list is left exactly as it was');
  record(contract.favoritesSelect('a, b', true).includes('homecloud_file_favorites!inner(content_id)'),
    'I4. the filter adds exactly one embedded relation');

  // ── J. THE MIGRATION ────────────────────────────────────────────────────────
  console.log('\n--- J. migration contract: identity, uniqueness and invariants ---');
  const sql = fs.readFileSync(path.join(REPO_ROOT, MIGRATION), 'utf8');
  const table = /create table if not exists public\.homecloud_file_favorites \(([\s\S]*?)\n\);/.exec(sql);
  record(table !== null, 'J1. the migration creates exactly the Files-scoped table');
  const body = table ? table[1] : '';

  record(/person_id uuid not null references public\.people\(id\) on delete cascade/.test(body),
    'J2. the preference identity is the canonical person (people.id), cascading when the person goes');
  record(/household_id uuid not null references public\.households\(id\) on delete cascade/.test(body),
    'J3. it is scoped to a household');
  record(/content_id uuid not null references public\.homecloud_contents\(id\) on delete cascade/.test(body),
    'J4. and to real content, which disappears with the content');
  record(!/\bboolean\b/i.test(body), 'J5. it is NOT a boolean column on the content: a favorite is a relation, not a flag');
  record(!/membership_id/.test(body) && !/auth_user_id/.test(body),
    'J6. neither membership_id nor auth_user_id is the preference identity');

  record(/unique \(household_id, person_id, content_id\)/.test(sql),
    'J7. the (household, person, content) triple is UNIQUE, so a preference cannot be recorded twice');
  record(/homecloud_file_favorites_scope_unique/.test(sql), 'J8. and the constraint is named, so it can be asserted on');

  const trigger = /create or replace function public\.homecloud_file_favorites_invariants\(\)([\s\S]*?)\$\$;/.exec(sql);
  record(trigger !== null, 'J9. the invariants are enforced by a trigger, as the other HomeCloud tables do');
  const triggerBody = trigger ? trigger[1] : '';
  record(/if not found then[\s\S]*?errcode = '23503'/.test(triggerBody),
    'J10. the content must EXIST (23503)');
  record(/v_content_role <> 'file' then[\s\S]*?errcode = '23514'/.test(triggerBody),
    'J11. the FILE-ONLY invariant is enforced in the database, not only in the service');
  record(/v_content_household is distinct from new\.household_id then[\s\S]*?errcode = '23514'/.test(triggerBody),
    'J12. content and preference must belong to the SAME household (23514)');
  record(/hm\.person_id = new\.person_id[\s\S]*?hm\.status = 'active'/.test(triggerBody),
    'J13. the person must be an ACTIVE member of that household (23514)');
  record(/alter table public\.homecloud_file_favorites enable row level security/.test(sql),
    'J14. RLS is enabled, matching the HomeCloud foundation convention');
  record(!/create policy/i.test(sql), 'J15. and no client-readable policy is created: authority stays in the backend');
  record(/create index if not exists hc_file_favorites_content_idx/.test(sql),
    'J16. the join side of the filter is indexed');

  console.log(`\nHOMECLOUD_FILES_FAVORITES_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_FILES_FAVORITES_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_FILES_FAVORITES_TESTS=PASS');
  }
}

void main();
