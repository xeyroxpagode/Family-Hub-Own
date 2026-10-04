#!/usr/bin/env node
'use strict';

/**
 * HomeCloud S4-iii C2 — the Files read's REAL has-more semantics.
 *
 * The defect this closes was at the SERVER seam, not in a UI helper:
 * `browseFiles` answered `nextOffset = offset + limit` whenever the page came
 * back full, so a household with exactly 100 files advertised a second page that
 * could only ever be empty — the phantom "Mostrar más archivos". The inverse is
 * equally unprovable: receiving `limit` rows never proves that `limit` is the
 * total.
 *
 * So this test drives the REAL `backend/src/services/homecloudFilesService.js`
 * with only its two infrastructure dependencies replaced:
 *
 *   - `getHomeCloudContext`  -> a signed-in adult member of one household
 *   - `supabaseAdmin`        -> an in-memory PostgREST-shaped query builder that
 *                               honours `eq` / `is` / `or` / `order` / `range`
 *
 * Everything under test is production: `browseFiles`, `contentQuery`, the
 * capability enforcement, and the DTO mappers. The boundaries below are the
 * product contract: 99/100/101, 199/200/201 and 299/300/301.
 */

const path = require('node:path');

// ── the two dependencies a device-less run cannot have ──────────────────────

const HOUSEHOLD_ID = 'hh-s4iii-hasmore';

const rows = {
  contents: [],
  folders: [],
};

/** Every range window the service asked for, in order. */
const ranges = [];

function makeQuery(table) {
  let filters = [];
  let orderSpec = [];
  let rangeSpec = null;
  const api = {
    select: () => api,
    eq: (column, value) => { filters.push({ column, value }); return api; },
    is: (column, value) => { filters.push({ column, value }); return api; },
    ilike: (column, pattern) => { filters.push({ column, ilike: pattern }); return api; },
    or: (filter) => { filters.push({ or: filter }); return api; },
    order: (column, options) => { orderSpec.push({ column, options }); return api; },
    range: (from, to) => { rangeSpec = [from, to]; return api; },
    then: (resolve, reject) => Promise.resolve(resolveQuery()).then(resolve, reject),
  };
  function resolveQuery() {
    const source = table === 'homecloud_contents' ? rows.contents : rows.folders;
    let matched = source.slice();
    for (const filter of filters) {
      if (filter.or) {
        // `display_name.ilike.%x%,note.ilike.%x%` — the canonical literal search.
        const alternatives = filter.or.replace(/^\(|\)$/g, '').split(',').map((part) => {
          const [column, rest] = part.split('.');
          const needle = rest.replace(/^ilike\.%|\.%$/g, '').toLowerCase();
          return { column, needle };
        });
        matched = matched.filter((row) => alternatives.some(({ column, needle }) =>
          String(row[column] ?? '').toLowerCase().includes(needle)));
        continue;
      }
      if (filter.column === undefined) continue;
      if (filter.ilike !== undefined) {
        const needle = filter.ilike.replace(/%/g, '').toLowerCase();
        matched = matched.filter((row) => String(row[filter.column] ?? '').toLowerCase().includes(needle));
        continue;
      }
      const value = filter.value === null ? null : filter.value;
      matched = matched.filter((row) => {
        const actual = row[filter.column] ?? null;
        return actual === value;
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
      ranges.push({ table, from, to });
      matched = matched.slice(from, to + 1);
    }
    return { data: matched, error: null };
  }
  return api;
}

const supabaseAdminStub = { from: (table) => makeQuery(table) };

const contextStub = {
  householdId: HOUSEHOLD_ID,
  // The capability matrix is the REAL one, so the role must be a real role:
  // `adult` is granted view/contribute/organize/delete.
  membership: { id: 'mm-s4iii', role: 'adult', status: 'active' },
  household: { id: HOUSEHOLD_ID, config: null },
};

function installStubs() {
  const Module = require('node:module');
  const original = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === '../config/supabase') return { supabaseAdmin: supabaseAdminStub };
    if (request === './homecloud.context.service') return { getHomeCloudContext: async () => contextStub };
    return original.call(this, request, parent, isMain);
  };
}

installStubs();

const service = require(path.join(__dirname, '..', 'backend', 'src', 'services', 'homecloudFilesService.js'));
const { browseFiles } = service;

// ── fixtures ─────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

function seedFileCount(total) {
  rows.contents = Array.from({ length: total }, (_, index) => ({
    id: `c-${String(index).padStart(4, '0')}`,
    household_id: HOUSEHOLD_ID,
    role: 'file',
    display_name: `file-${String(index).padStart(4, '0')}.txt`,
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 10,
    original_storage_path: `${HOUSEHOLD_ID}/o/${index}`,
    preview_storage_path: null,
    uploaded_by_member_id: 'mm-s4iii',
    uploaded_at: `2026-01-01T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
    document_date: null,
    note: null,
    caption: null,
    written_text: null,
    captured_at: null,
    captured_year: null,
    captured_month: null,
    capture_precision: null,
    hidden_from_resurfacing: false,
    folder_id: null,
    lifecycle: 'active',
  }));
}

const request = { user: { id: 'u-s4iii' } };

async function pageOf(total, offset, limit) {
  seedFileCount(total);
  ranges.length = 0;
  const result = await browseFiles(request, { folderId: null, query: '', sort: 'recent', limit, offset });
  return { result, ranges: ranges.slice() };
}

async function hasMoreAfterPaging(total) {
  // Walk to the end exactly as a client would, and report whether a NEXT page
  // was ever advertised after the final real row.
  let offset = 0;
  let ids = [];
  let extraPageAdvertised = 0;
  let reads = 0;
  for (;;) {
    const { result } = await pageOf(total, offset, 100);
    reads += 1;
    ids = ids.concat(result.files.map((file) => file.id));
    if (result.nextOffset === null) break;
    extraPageAdvertised += 1;
    offset = result.nextOffset;
    if (reads > 20) break;
  }
  return { ids, reads, extraPageAdvertised };
}

async function main() {
  console.log('=== HOMECLOUD S4-iii C2 FILES HAS-MORE BOUNDARY TESTS ===');

  const cases = [
    { total: 99, expectedPages: 1 },
    { total: 100, expectedPages: 1 },
    { total: 101, expectedPages: 2 },
    { total: 199, expectedPages: 2 },
    { total: 200, expectedPages: 2 },
    { total: 201, expectedPages: 3 },
    { total: 299, expectedPages: 3 },
    { total: 300, expectedPages: 3 },
    { total: 301, expectedPages: 4 },
  ];

  for (const { total, expectedPages } of cases) {
    const { ids, reads, extraPageAdvertised } = await hasMoreAfterPaging(total);
    const unique = new Set(ids);
    record(ids.length === total, `A.${total}. paging to the end yields exactly ${total} rows`);
    record(unique.size === ids.length, `B.${total}. with no duplicate row`);
    record(ids.length === new Set(ids).size, `C.${total}. and no silent truncation`);
    record(reads === expectedPages, `D.${total}. it took ${expectedPages} reads, and no empty page was needed`);
    record(extraPageAdvertised === expectedPages - 1, `E.${total}. a next page was advertised exactly ${expectedPages - 1} time(s)`);
  }

  // The precise claim: an EXACT page boundary answers a FULL page and still says
  // "there is nothing more". That is the phantom CTA, decided at the real seam.
  for (const total of [100, 200, 300]) {
    const { result } = await pageOf(total, 0, 100);
    record(result.files.length === 100, `F.${total}. the first read still answers a full 100-row page`);
    const lastOffset = total - 100;
    const last = await pageOf(total, lastOffset, 100);
    record(last.result.files.length === 100, `G.${total}. and the final page is full too`);
    record(last.result.nextOffset === null, `H.${total}. yet the final page reports nextOffset = null (no phantom CTA)`);
  }

  // One row past a boundary: the probe finds it and the client is told.
  for (const total of [101, 201, 301]) {
    const { result } = await pageOf(total, 0, 100);
    record(result.files.length === 100 && result.nextOffset === 100, `I.${total}. one row past the boundary IS advertised`);
    const lastOffset = Math.floor((total - 1) / 100) * 100;
    const last = await pageOf(total, lastOffset, 100);
    record(last.result.files.length === total - lastOffset && last.result.nextOffset === null,
      `J.${total}. and the final page (offset ${lastOffset}) holds the remaining ${total - lastOffset} and ends the list`);
  }

  // The probe is ONE extra row in the SAME read: never a second query, and never
  // a response larger than the logical page size.
  seedFileCount(500);
  ranges.length = 0;
  const probeRead = await browseFiles(request, { folderId: null, query: '', sort: 'recent', limit: 100, offset: 0 });
  const contentRanges = ranges.filter((entry) => entry.table === 'homecloud_contents');
  record(contentRanges.length === 1, 'K. reaching "there is more" costs exactly ONE content read');
  record(contentRanges[0].from === 0 && contentRanges[0].to === 100, 'L. and that one read asks for limit + 1 rows (range is inclusive)');
  record(probeRead.files.length === 100, 'M. while the ANSWER never exceeds the requested page size');
  record(probeRead.nextOffset === 100, 'N. with the offset that really continues the list');

  // A caller that asks for a smaller page still gets at most that many rows.
  const small = await pageOf(500, 0, 10);
  record(small.result.files.length === 10 && small.result.nextOffset === 10, 'O. a caller asking for 10 gets 10 rows and the real next offset');

  // Explicitly reading PAST the end is still the end: no phantom, no crash.
  const beyond = await pageOf(100, 100, 100);
  record(beyond.result.files.length === 0 && beyond.result.nextOffset === null, 'P. reading past the last row is empty and terminal');

  console.log(`\nHOMECLOUD_S4III_HASMORE_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_S4III_HASMORE_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_S4III_HASMORE_TESTS=PASS');
  }
}

void main();