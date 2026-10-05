#!/usr/bin/env node
'use strict';

/**
 * HomeCloud S4-ii — Files SEARCH contract (literal, honest, grammar-safe).
 *
 * These tests drive the REAL `homecloudFilesService` query-building path over
 * the REAL installed `@supabase/postgrest-js`, with only the HTTP transport
 * stubbed. So what is asserted is the exact PostgREST filter the backend would
 * put on the wire — not a re-implementation of the encoder.
 *
 * The oracle is semantic, not textual: every emitted `ilike` value is compiled
 * as a Postgres ILIKE pattern (with `\` as the default escape character) and
 * then asked whether it matches the user's own text, and whether it still
 * matches a decoy that a WILDCARD reading would have matched. That is what
 * proves `%` is not a whole-Household wildcard and `_` is not a
 * one-character wildcard.
 *
 * Deterministic: no Supabase, no network, no database.
 */

const path = require('node:path');
const Module = require('node:module');
const { createClient } = require('@supabase/supabase-js');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUPABASE_CONFIG = path.join(REPO_ROOT, 'backend', 'src', 'config', 'supabase.js');
const CONTEXT_SERVICE = path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloud.context.service.js');
const FILES_SERVICE = path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudFilesService.js');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

console.log('\n=== S4-ii FILES SEARCH CONTRACT TESTS ===\n');

// ── transport stub ──────────────────────────────────────────────────────────

/** Every request the service actually issued, as `{ url, headers }`. */
const requests = [];

function recordingFetch(input, init) {
  const url = typeof input === 'string' ? input : String(input);
  requests.push({ url, headers: init?.headers ?? {} });
  const parsed = new URL(url);
  // The only single-row read the Files browser makes is the folder scope guard,
  // which filters on both `id` and `household_id`.
  const isFolderScopeGuard = parsed.pathname.endsWith('/homecloud_folders')
    && parsed.searchParams.has('id')
    && parsed.searchParams.has('household_id');
  const body = isFolderScopeGuard ? [{ id: 'folder-9', household_id: 'hh-1' }] : [];
  return Promise.resolve(new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));
}

const STUB_SUPABASE_ADMIN = createClient('http://127.0.0.1:1', 'stub-anon-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: recordingFetch },
});

const ACTIVE_COORDINATOR_CONTEXT = {
  accountId: 'user-1',
  person: { id: 'person-1', active_household_id: 'hh-1' },
  household: { id: 'hh-1', config: null },
  membership: { id: 'member-1', role: 'coordinator', status: 'active' },
  householdId: 'hh-1',
  personId: 'person-1',
  membershipId: 'member-1',
  role: 'coordinator',
  membershipStatus: 'active',
};

const REQUEST = { user: { id: 'user-1' }, accessToken: 'stub-token' };

/** Replace a module's exports before the service under test is required. */
function stubModule(filename, exports) {
  const stub = new Module(filename, null);
  stub.filename = filename;
  stub.loaded = true;
  stub.paths = [];
  stub.exports = exports;
  require.cache[filename] = stub;
}

stubModule(SUPABASE_CONFIG, { supabaseAdmin: STUB_SUPABASE_ADMIN });
stubModule(CONTEXT_SERVICE, { getHomeCloudContext: async () => ACTIVE_COORDINATOR_CONTEXT });

// eslint-disable-next-line import/no-dynamic-require
const filesService = require(FILES_SERVICE);

// ── filter inspection ───────────────────────────────────────────────────────

function paramsOf(request) {
    return new URL(request.url).searchParams;
  }

/** Split a PostgREST filter body on top-level commas, respecting `"` quoting. */
function splitTopLevel(body) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (inQuotes && character === '\\') { current += character + (body[index + 1] ?? ''); index += 1; continue; }
    if (character === '"') { inQuotes = !inQuotes; current += character; continue; }
    if (character === ',' && !inQuotes) { parts.push(current); current = ''; continue; }
    current += character;
  }
  parts.push(current);
  return parts;
}

/** Undo the PostgREST quoted-value encoding to obtain the ILIKE pattern. */
function unquotePostgrestValue(value) {
  if (!(value.length >= 2 && value.startsWith('"') && value.endsWith('"'))) return value;
  return value.slice(1, -1).replace(/\\(.)/g, (_, escaped) => escaped);
}

/** Compile a Postgres ILIKE pattern (default `\` escape) into a matcher. */
function likeMatcher(pattern) {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '\\') { source += escapeRegExp(pattern[index + 1] ?? ''); index += 1; continue; }
    if (character === '%') { source += '[\\s\\S]*'; continue; }
    if (character === '_') { source += '[\\s\\S]'; continue; }
    source += escapeRegExp(character);
  }
  return new RegExp(`${source}$`, 'i');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The `display_name` / `note` ILIKE patterns behind a `.or()` filter. */
function fileSearchPatterns(orFilter) {
  const body = orFilter.startsWith('(') && orFilter.endsWith(')') ? orFilter.slice(1, -1) : orFilter;
  const clauses = splitTopLevel(body);
  return clauses.map((clause) => {
    const match = /^([a-z_]+)\.(ilike|like)\.(.*)$/.exec(clause);
    if (!match) return null;
    return { column: match[1], operator: match[2], pattern: unquotePostgrestValue(match[3]) };
  });
}

/** The Files content read issued by the last `browseFiles` call. */
  function contentsRequest() {
    return requests.find((request) => request.url.includes('/homecloud_contents'));
  }

  async function browseFiles(options) {
    requests.length = 0;
    return filesService.browseFiles(REQUEST, options);
  }

  async function emittedFileSearchPatterns(options) {
    await browseFiles(options);
    const orFilter = paramsOf(contentsRequest()).get('or');
    return { orFilter, clauses: orFilter === null ? [] : fileSearchPatterns(orFilter) };
  }

async function run() {
  // ── A. literal substring semantics ──────────────────────────────────────────

  console.log('--- A: user text is a literal substring, never a wildcard ---');

  const LITERAL_CASES = [
    { label: 'ordinary text', search: 'Informe Anual', decoy: 'Otro Documento' },
    { label: 'percent', search: '%', decoy: 'cualquier archivo' },
    { label: 'underscore', search: '_', decoy: 'ab' },
    { label: 'backslash', search: '\\', decoy: 'xy' },
    { label: 'double quote', search: '"', decoy: 'sincomillas' },
    { label: 'open parenthesis', search: '(', decoy: 'ab' },
    { label: 'close parenthesis', search: ')', decoy: 'ab' },
    { label: 'comma', search: ',', decoy: 'ab' },
    { label: 'comma inside text', search: 'a,b', decoy: 'ab' },
    { label: 'parenthesis inside text', search: 'a)b', decoy: 'ab' },
    { label: 'mixed metacharacters', search: 'a%b_c\\d"e(f),g', decoy: 'abcdefg' },
    { label: 'wildcards with text', search: '100%_off', decoy: '1009xoff' },
    { label: 'dot', search: 'informe.pdf', decoy: 'informepdf' },
    { label: 'colon', search: 'reunion:final', decoy: 'reunionfinal' },
  ];

  for (const testCase of LITERAL_CASES) {
    const { orFilter, clauses } = await emittedFileSearchPatterns({ folderId: null, query: testCase.search, sort: 'recent' });
    record(
      clauses.length === 2,
      `${testCase.label}: .or() stays a 2-clause filter (got ${clauses.length} in ${JSON.stringify(orFilter)})`,
    );
    const [displayName, note] = clauses;
    record(Boolean(displayName) && displayName.column === 'display_name' && displayName.operator === 'ilike',
      `${testCase.label}: display_name searched with ilike`);
    record(Boolean(note) && note.column === 'note' && note.operator === 'ilike',
      `${testCase.label}: note searched with ilike`);
    record(Boolean(displayName) && Boolean(note) && displayName.pattern === note.pattern,
      `${testCase.label}: display_name and note share the exact same value`);
    const pattern = displayName ? displayName.pattern : '';
    record(likeMatcher(pattern).test(testCase.search),
      `${testCase.label}: pattern matches the user's own text literally`);
    record(!likeMatcher(pattern).test(testCase.decoy),
      `${testCase.label}: pattern does NOT match the decoy ${JSON.stringify(testCase.decoy)}`);
  }

  // ── B. `%` and `_` explicitly are not wildcards ─────────────────────────────

  console.log('\n--- B: % cannot expand to the whole Household, _ is not one character ---');

  {
    const { clauses } = await emittedFileSearchPatterns({ folderId: null, query: '%', sort: 'recent' });
    const pattern = clauses[0].pattern;
    record(pattern === '%\\%%', `searching % emits the literal pattern %\\%% (got ${JSON.stringify(pattern)})`);
    record(!likeMatcher(pattern).test('anything at all'),
      'searching % matches no unrelated File name');
    record(!likeMatcher(pattern).test(''), 'searching % does not match the empty string');
  }
  {
    const { clauses } = await emittedFileSearchPatterns({ folderId: null, query: '_', sort: 'recent' });
    const pattern = clauses[0].pattern;
    record(pattern === '%\\_%', `searching _ emits the literal pattern %\\_% (got ${JSON.stringify(pattern)})`);
    record(!likeMatcher(pattern).test('ab'), 'searching _ does not match a single character');
    record(!likeMatcher(pattern).test('a b'), 'searching _ does not match one character with spaces');
  }
  {
    const { clauses } = await emittedFileSearchPatterns({ folderId: null, query: '%_%', sort: 'recent' });
    const pattern = clauses[0].pattern;
    record(pattern === '%\\%\\_\\%%', `searching %_% emits %\\%\\_\\%% (got ${JSON.stringify(pattern)})`);
    record(!likeMatcher(pattern).test('abc'), 'searching %_% does not match arbitrary text');
  }

  // ── C. PostgREST grammar cannot break the query ─────────────────────────────

  console.log('\n--- C: PostgREST grammar characters cannot break the filter ---');

  for (const search of [',', '(', ')', '"', '\\', 'a,b', 'a)b', '(a', 'a(b)c', '"quoted"', 'a\\"b', '.,:*()']) {
    const { orFilter, clauses } = await emittedFileSearchPatterns({ folderId: null, query: search, sort: 'recent' });
    // One wrapping paren pair, and exactly two well-formed clauses: proof that
    // no user character was read as grammar.
    const wrappedOnce = orFilter.startsWith('(') && orFilter.endsWith(')');
    record(wrappedOnce && clauses.length === 2 && clauses.every((clause) => clause !== null),
      `search ${JSON.stringify(search)} keeps one balanced 2-clause .or() filter (${JSON.stringify(orFilter)})`);
  }
  {
    // The comma must survive as DATA, not mutate into a space.
    const { clauses } = await emittedFileSearchPatterns({ folderId: null, query: 'a,b', sort: 'recent' });
    record(clauses[0].pattern === '%a,b%', `search "a,b" keeps its comma (got ${JSON.stringify(clauses[0].pattern)})`);
    record(likeMatcher(clauses[0].pattern).test('x a,b y'), 'search "a,b" matches text containing a comma');
    record(!likeMatcher(clauses[0].pattern).test('x a b y'), 'search "a,b" is not mutated into "a b"');
  }

  // ── D. no 500 for ordinary text with punctuation ────────────────────────────

  console.log('\n--- D: metacharacters never cause homecloud_files_list_failed ---');

  for (const search of ['%', '_', '"', '(', ')', ',', '\\', 'a)b', 'a,b', '50% off (final), draft']) {
    let code = null;
    try {
      await browseFiles({ folderId: null, query: search, sort: 'recent' });
    } catch (error) {
      code = error.code ?? error.message;
    }
    record(code === null, `search ${JSON.stringify(search)} resolves with results or empty results (got ${code})`);
  }

  // ── E. folder-name search uses the same literal contract ────────────────────

  console.log('\n--- E: folder-name search shares the same contract ---');

  // A PLAIN filter value runs to the end of the parameter, so it must NOT be
  // quoted: the installed PostgREST does not unquote a plain filter value, and a
  // quoted value would be searched for literally (including the `"` characters).
  // A `"` the USER typed is literal data and must survive as data.
  for (const testCase of [
    { label: 'ordinary folder text', search: 'Busqueda', decoy: 'Otra' },
    { label: 'folder percent', search: '%', decoy: 'cualquier carpeta' },
    { label: 'folder underscore', search: '_', decoy: 'ab' },
    { label: 'folder comma', search: 'a,b', decoy: 'ab' },
    { label: 'folder parenthesis', search: 'a)b', decoy: 'ab' },
    { label: 'folder backslash', search: '\\', decoy: 'xy' },
    { label: 'folder quote', search: '"', decoy: 'sincomillas' },
    { label: 'folder dot', search: 'a.b', decoy: 'ab' },
    { label: 'folder colon', search: 'a:b', decoy: 'ab' },
  ]) {
    requests.length = 0;
    await filesService.browseFiles(REQUEST, { folderId: null, query: testCase.search, sort: 'recent' });
    const foldersRequest = requests.find((request) => request.url.includes('/homecloud_folders')
      && String(new URL(request.url).searchParams.get('select') ?? '').includes('name'));
    const nameFilter = foldersRequest ? paramsOf(foldersRequest).get('name') : null;
    record(Boolean(nameFilter) && nameFilter.startsWith('ilike.'), `${testCase.label}: folder name filter uses ilike`);
    const rawValue = nameFilter ? nameFilter.slice('ilike.'.length) : '';
    record(!rawValue.startsWith('"'), `${testCase.label}: folder filter value is not quoted (got ${JSON.stringify(rawValue)})`);
    const pattern = rawValue;
    record(Boolean(pattern) && likeMatcher(pattern).test(testCase.search),
      `${testCase.label}: folder pattern matches the user's own text literally`);
    record(Boolean(pattern) && !likeMatcher(pattern).test(testCase.decoy),
      `${testCase.label}: folder pattern does NOT match the decoy ${JSON.stringify(testCase.decoy)}`);
  }

  // Both seams must produce the SAME literal pattern; only the transport differs.
  {
    const searchModule = require(path.join(REPO_ROOT, 'backend', 'src', 'lib', 'homecloudFilesSearch.js'));
    for (const search of ['Informe Anual', '%', '_', '\\', 'a)b,c']) {
      const plain = searchModule.literalContainsPattern(search);
      const quoted = searchModule.literalContainsLogicTreeValue(search);
      record(unquotePostgrestValue(quoted) === plain,
        `both seams encode ${JSON.stringify(search)} as the same literal pattern`);
    }
  }

  // ── F. scope, sort, pagination and query propagation preserved ─────────────

  console.log('\n--- F: root/folder scope, sort and pagination are preserved ---');

  {
    const { orFilter } = await emittedFileSearchPatterns({ folderId: null, query: 'Informe Anual', sort: 'recent' });
    const params = paramsOf(contentsRequest());
    record(params.get('folder_id') === null && !params.has('folder_id'),
      'root SEARCH stays global (no folder_id filter at all)');
    record(orFilter !== null, 'root SEARCH still filters');
  }
  {
    await browseFiles({ folderId: null, query: '', sort: 'recent' });
    const params = paramsOf(contentsRequest());
    record(params.get('folder_id') === 'is.null', 'root listing without search keeps folder_id IS NULL');
    record(!params.has('or'), 'root listing without search emits no .or() filter');
  }
  {
    const { orFilter } = await emittedFileSearchPatterns({ folderId: 'folder-9', query: 'Informe', sort: 'recent' });
    const params = paramsOf(contentsRequest());
    record(params.get('folder_id') === 'eq.folder-9', 'folder SEARCH stays scoped to that folder');
    record(orFilter !== null, 'folder SEARCH still filters');
    // Stage 2 Phase 1 SUPERSESSION. Stage 1 asserted 'folder SEARCH does not list
    // folders', which was true only because folders were FLAT: a folder had no
    // subfolders, so listing any would have been meaningless. With the nested
    // hierarchy a folder HAS direct children, so a folder-context browse must list
    // them or the user could not keep navigating while searching. What Stage 1 was
    // really protecting is preserved and now asserted: the subfolder read is
    // SCOPED to the current folder and carries NO content `.or()` filter.
    const folderRequests = requests.filter((request) => request.url.includes('/homecloud_folders'));
    const folderRequest = folderRequests[folderRequests.length - 1];
    record(Boolean(folderRequest), 'folder SEARCH lists the direct children of the current folder');
    if (folderRequest) {
      const folderParams = new URL(folderRequest.url).searchParams;
      record(folderParams.get('parent_folder_id') === 'eq.folder-9', `folder-context subfolder read is scoped to the current folder (parent_folder_id=${folderParams.get('parent_folder_id')})`);
      record(folderParams.get('name') === 'ilike.%Informe%', `subfolder read filters by name with the literal ilike pattern (name=${folderParams.get('name')})`);
      record(!folderParams.has('or'), 'the subfolder read emits NO content .or() filter, so folder search never leaks File predicates into the folder query');
    }
  }
  {
    const { orFilter } = await emittedFileSearchPatterns({ folderId: 'folder-9', query: '', sort: 'recent' });
    record(orFilter === null, 'folder listing without search emits no .or() filter');
  }
  {
    const { clauses } = await emittedFileSearchPatterns({ folderId: null, query: '  Informe Anual  ', sort: 'recent' });
    record(clauses[0].pattern === '%Informe Anual%', `query is trim-normalized (got ${JSON.stringify(clauses[0].pattern)})`);
    record(likeMatcher(clauses[0].pattern).test('INFORME ANUAL'),
      'search stays case-insensitive through ilike');
  }
  {
    await browseFiles({ folderId: null, query: '', sort: 'name' });
    record(paramsOf(contentsRequest()).get('order') === 'display_name.asc,id.asc', 'sort Nombre keeps display_name ASC, id ASC');
  }
  {
    await browseFiles({ folderId: null, query: '', sort: 'recent' });
    record(paramsOf(contentsRequest()).get('order') === 'uploaded_at.desc.nullslast,id.desc', 'sort Recientes keeps uploaded_at DESC, id DESC');
  }
  {
    // S4-iii C2: the read asks for ONE row more than the requested page size and
    // answers `limit` rows plus an evidence-based `nextOffset`. A full page is
    // not evidence of a next page, so the extra row is what turns "100 files"
    // into "there is nothing more" instead of a phantom "Mostrar más".
    const answered = await browseFiles({ folderId: null, query: '', sort: 'recent', limit: 25, offset: 50 });
    const request = contentsRequest();
    const range = String(request.headers.Range ?? request.headers.range ?? '');
    const askedLimit = paramsOf(request).get('limit');
    const askedOffset = paramsOf(request).get('offset');
    record(range === '50-75' || (askedLimit === '26' && askedOffset === '50'),
      `pagination still emits limit/offset, with one has-more probe row (range=${JSON.stringify(range)} limit=${askedLimit} offset=${askedOffset})`);
    record(answered.files.length <= 25, 'pagination never answers more rows than the requested page size');
    record(typeof answered.nextOffset === 'number' || answered.nextOffset === null,
      `nextOffset is a real offset or null, never a guess from a full page (${answered.nextOffset})`);
  }

  // ── G. the helper is not a duplicate of the service ─────────────────────────

  console.log('\n--- G: the literal encoder is the one the service actually uses ---');

  {
    const searchModule = require(path.join(REPO_ROOT, 'backend', 'src', 'lib', 'homecloudFilesSearch.js'));
    const { orFilter } = await emittedFileSearchPatterns({ folderId: null, query: 'a)b', sort: 'recent' });
    record(
      `(display_name.ilike.${searchModule.literalContainsLogicTreeValue('a)b')},note.ilike.${searchModule.literalContainsLogicTreeValue('a)b')})` === orFilter,
      'the emitted .or() filter is exactly the canonical encoder output',
    );
    const filesSource = require('node:fs').readFileSync(FILES_SERVICE, 'utf8');
    record(!filesSource.includes("replace(/,/g, ' ')"),
      'the service no longer rewrites user commas into spaces');
    // Stage 2 Phase 1: the folder read moved into its own helper, so this can no
    // longer be asserted by matching a call site against one local variable name.
    // The BEHAVIOUR is asserted instead, and it is the stronger claim: the folder
    // query is emitted with the canonical encoder's own output as its pattern.
    const folderSource = filesSource.slice(filesSource.indexOf('async function childFoldersOf'));
    record(folderSource.includes('literalContainsPattern('),
      'folder-name search uses the canonical plain-filter pattern');
    {
      await browseFiles({ folderId: null, query: 'Informe', sort: 'recent' });
      const emittedFolderRequests = requests.filter((request) => request.url.includes('/homecloud_folders'));
      const emitted = emittedFolderRequests[emittedFolderRequests.length - 1];
      const emittedPattern = emitted ? new URL(emitted.url).searchParams.get('name') : null;
      record(emittedPattern === `ilike.${searchModule.literalContainsPattern('Informe')}`,
        `the emitted folder-name filter is exactly the canonical encoder output (got ${emittedPattern})`);
    }
  }

  console.log(`\nS4II_SEARCH_CONTRACT_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('S4II_SEARCH_CONTRACT_TESTS=FAIL');
  } else {
    console.log('S4II_SEARCH_CONTRACT_TESTS=PASS');
  }

}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
