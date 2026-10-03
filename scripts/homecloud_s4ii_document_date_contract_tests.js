#!/usr/bin/env node
'use strict';

/**
 * HomeCloud S4-ii — canonical `documentDate` contract.
 *
 * ONE validator, TWO seams:
 *   - register : POST   /api/homecloud/register          (role=file)
 *   - update   : PATCH  /api/homecloud/content/:id/file
 *
 * The tests drive the REAL production seams (`validateRegisterPayload`,
 * `registerHomeCloudContent`, `homecloudFilesService.updateFile`) and assert
 * both the user-facing typed rejection AND that no invalid value ever reaches a
 * database write (`insertPayload.document_date` / `.update()`).
 *
 * Deterministic: no Supabase, no network, no database.
 */

const path = require('node:path');
const Module = require('node:module');

const REPO_ROOT = path.resolve(__dirname, '..');
process.env.HOMECLOUD_MAX_UPLOAD_BYTES = process.env.HOMECLOUD_MAX_UPLOAD_BYTES || '104857600';

const SUPABASE_CONFIG = path.join(REPO_ROOT, 'backend', 'src', 'config', 'supabase.js');
const CONTEXT_SERVICE = path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloud.context.service.js');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

async function run() {
  console.log('\n=== S4-ii documentDate CONTRACT TESTS ===\n');

  // ── recording database stub ────────────────────────────────────────────────

  /** Every write the service attempted: `{ table, kind, payload }`. */
  const writes = [];

  function rowFor(overrides = {}) {
    return {
      id: 'content-1',
      role: 'file',
      display_name: 'informe.pdf',
      mime_type: 'application/pdf',
      extension: 'pdf',
      size_bytes: 10,
      preview_storage_path: null,
      uploaded_by_member_id: 'member-1',
      uploaded_at: '2026-01-01T00:00:00Z',
      hidden_from_resurfacing: false,
      folder_id: null,
      document_date: null,
      note: null,
      ...overrides,
    };
  }

  /** Chainable stand-in for the PostgREST query builder used by these seams. */
  function queryStub(table) {
    let mode = 'select';
    let payload = null;
    const chain = {
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      order: () => chain,
      insert: (value) => { mode = 'insert'; payload = value; writes.push({ table, kind: 'insert', payload: value }); return chain; },
      update: (value) => { mode = 'update'; payload = value; writes.push({ table, kind: 'update', payload: value }); return chain; },
      single: async () => ({ data: rowFor(payload ?? {}), error: null }),
      maybeSingle: async () => ({ data: rowFor(payload ?? {}), error: null }),
      then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
    };
    return chain;
  }

  const STUB_SUPABASE_ADMIN = { from: (table) => queryStub(table) };

  const HOUSEHOLD_ID = '11111111-1111-4111-8111-111111111111';

  const ACTIVE_COORDINATOR_CONTEXT = {
    accountId: 'user-1',
    person: { id: 'person-1', active_household_id: HOUSEHOLD_ID },
    household: { id: HOUSEHOLD_ID, config: null },
    membership: { id: 'member-1', role: 'coordinator', status: 'active' },
    householdId: HOUSEHOLD_ID,
    personId: 'person-1',
    membershipId: 'member-1',
    role: 'coordinator',
    membershipStatus: 'active',
  };

  const REQUEST = { user: { id: 'user-1' }, accessToken: 'stub-token' };

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

  /* eslint-disable import/no-dynamic-require */
  const { validateRegisterPayload } = require(path.join(REPO_ROOT, 'backend', 'src', 'lib', 'homecloudIntakeValidation.js'));
  const { registerHomeCloudContent } = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudIntakeService.js'));
  const filesService = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudFilesService.js'));
  /* eslint-enable import/no-dynamic-require */

  const FILE_BODY = { role: 'file', displayName: 'informe.pdf', mimeType: 'application/pdf', sizeBytes: 10 };

  async function registerSeam(documentDate, { withKey = true } = {}) {
    const body = { ...FILE_BODY };
    if (withKey) body.documentDate = documentDate;
    writes.length = 0;
    return registerHomeCloudContent(REQUEST, body);
  }

  async function updateSeam(documentDate, { withKey = true } = {}) {
    const changes = { displayName: 'informe.pdf' };
    if (withKey) changes.documentDate = documentDate;
    writes.length = 0;
    return filesService.updateFile(REQUEST, 'content-1', changes);
  }

  function rejectionOf(error) {
    return { code: error?.code, statusCode: error?.statusCode, message: error?.message };
  }

  // ── A. accepted values ─────────────────────────────────────────────────────

  console.log('--- A: canonical dates are ACCEPTED through both seams ---');

  for (const value of ['2026-10-03', '2024-02-29', '2000-02-29', '1970-01-01', '9999-12-31', '0001-01-01']) {
    const normalized = validateRegisterPayload({ ...FILE_BODY, documentDate: value });
    record(normalized.documentDate === value, `register accepts ${value}`);

    await registerSeam(value);
    const insert = writes.at(-1);
    record(insert?.kind === 'insert' && insert.payload.document_date === value,
      `register writes document_date=${value} to the database`);

    const updated = await updateSeam(value);
    const update = writes.at(-1);
    record(update?.kind === 'update' && update.payload.document_date === value,
      `update writes document_date=${value} to the database`);
    record(updated.documentDate === value, `update returns ${value} in the canonical DTO`);
  }

  // ── B. null / absence semantics ────────────────────────────────────────────

  console.log('\n--- B: null and absence keep their path-specific semantics ---');

  {
    const absent = validateRegisterPayload(FILE_BODY);
    record(absent.documentDate === null, 'register with the property ABSENT normalizes to null');
    await registerSeam(undefined, { withKey: false });
    record(writes.at(-1).payload.document_date === null, 'register with the property ABSENT stores NULL');
  }
  {
    const explicit = validateRegisterPayload({ ...FILE_BODY, documentDate: null });
    record(explicit.documentDate === null, 'register with explicit null normalizes to null');
    await registerSeam(null);
    record(writes.at(-1).payload.document_date === null, 'register with explicit null stores NULL');
  }
  {
    await updateSeam(undefined, { withKey: false });
    const update = writes.at(-1);
    record(!Object.prototype.hasOwnProperty.call(update.payload, 'document_date'),
      'update with the key ABSENT does not touch document_date');
    record(update.payload.display_name === 'informe.pdf', 'update with the key ABSENT still applies the other fields');
  }
  {
    await updateSeam(null);
    record(writes.at(-1).payload.document_date === null, 'update with explicit null clears the value');
  }

  // ── C. invalid values ──────────────────────────────────────────────────────

  console.log('--- C: every other value is a typed 400 BEFORE any database write ---');

  const INVALID_VALUES = [
    { label: 'abc', value: 'abc' },
    { label: '2026/10/03', value: '2026/10/03' },
    { label: '2026-13-40 (impossible month and day)', value: '2026-13-40' },
    { label: '2026-02-30 (rollover into March)', value: '2026-02-30' },
    { label: '2026-02-29 (not a leap year)', value: '2026-02-29' },
    { label: '2026-04-31 (April has 30 days)', value: '2026-04-31' },
    { label: '2026-00-10 (month 0)', value: '2026-00-10' },
    { label: '2026-10-00 (day 0)', value: '2026-10-00' },
    { label: '2026-10-32 (day 32)', value: '2026-10-32' },
    { label: '2026-10-03T00:00:00Z (timestamp)', value: '2026-10-03T00:00:00Z' },
    { label: '2026-10-03 10:00 (date and time)', value: '2026-10-03 10:00' },
    { label: '20261003 (compact)', value: '20261003' },
    { label: '"" (empty string)', value: '' },
    { label: '" " (whitespace)', value: ' ' },
    { label: '2026-1-3 (not zero padded)', value: '2026-1-3' },
    { label: '26-10-03 (two digit year)', value: '26-10-03' },
    { label: '2026-10-3 (not zero padded day)', value: '2026-10-3' },
    { label: '["2026-10-03"] (array)', value: ['2026-10-03'] },
    { label: '{} (object)', value: {} },
    { label: 'true (boolean)', value: true },
    { label: '20261003 (number)', value: 20261003 },
    { label: 'NaN (number)', value: Number.NaN },
  ];

  for (const testCase of INVALID_VALUES) {
    const rendered = typeof testCase.value === 'string' ? JSON.stringify(testCase.value) : String(testCase.value);

    let registerError = null;
    try {
      await registerSeam(testCase.value);
    } catch (error) {
      registerError = rejectionOf(error);
    }
    record(registerError !== null && registerError.code === 'homecloud_invalid_document_date' && registerError.statusCode === 400,
      `register rejects ${rendered} with 400 homecloud_invalid_document_date (got ${JSON.stringify(registerError)})`);
    record(writes.length === 0, `register never writes ${rendered} to the database`);

    let updateError = null;
    try {
      await updateSeam(testCase.value);
    } catch (error) {
      updateError = rejectionOf(error);
    }
    record(updateError !== null && updateError.code === 'homecloud_invalid_document_date' && updateError.statusCode === 400,
      `update rejects ${rendered} with 400 homecloud_invalid_document_date (got ${JSON.stringify(updateError)})`);

    let pureError = null;
    try {
      validateRegisterPayload({ ...FILE_BODY, documentDate: testCase.value });
    } catch (error) {
      pureError = rejectionOf(error);
    }
    record(pureError !== null && pureError.code === 'homecloud_invalid_document_date',
      `the pure register validator rejects ${rendered} with the same code`);
  }

  // ── D. one validator, no duplicated rule ──────────────────────────────────

  console.log('\n--- D: register and update share ONE validator and ONE message ---');

  {
    const documentDate = require(path.join(REPO_ROOT, 'backend', 'src', 'lib', 'homecloudDocumentDate.js'));
    record(typeof documentDate.normalizeDocumentDate === 'function' && typeof documentDate.isCanonicalDocumentDate === 'function',
      'the canonical document-date module exposes the shared contract');
    record(Array.isArray(documentDate.DOCUMENT_DATE_SHAPE) === false && documentDate.DOCUMENT_DATE_SHAPE instanceof RegExp,
      'the canonical shape is a single exported expression');

    const filesSource = require('node:fs').readFileSync(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudFilesService.js'), 'utf8');
    record(filesSource.includes("require('../lib/homecloudDocumentDate')"),
      'the Files update seam consumes the canonical validator');
    record(!/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/.test(filesSource),
      'the Files update seam no longer carries its own duplicate date regex');
    const intakeSource = require('node:fs').readFileSync(path.join(REPO_ROOT, 'backend', 'src', 'lib', 'homecloudIntakeValidation.js'), 'utf8');
    record(intakeSource.includes("require('./homecloudDocumentDate')"),
      'the register seam consumes the canonical validator');

    let registerError = null;
    try { await registerSeam('2026-02-30'); } catch (error) { registerError = rejectionOf(error); }
    let updateError = null;
    try { await updateSeam('2026-02-30'); } catch (error) { updateError = rejectionOf(error); }
    record(registerError?.code === updateError?.code && registerError?.message === updateError?.message,
      `both seams reject a calendar-invalid date identically (${JSON.stringify(registerError)})`);
  }

  // ── E. Memory prohibition unchanged ────────────────────────────────────────

  console.log('\n--- E: Memory documentDate prohibition is unchanged ---');

  {
    let binaryMemoryError = null;
    try {
      validateRegisterPayload({ role: 'memory', displayName: 'foto', mimeType: 'image/jpeg', sizeBytes: 1, documentDate: '2026-10-03' });
    } catch (error) { binaryMemoryError = rejectionOf(error); }
    record(binaryMemoryError !== null && binaryMemoryError.code === 'homecloud_memory_doc_meta_forbidden',
      `binary MEMORY + documentDate still rejected with homecloud_memory_doc_meta_forbidden (got ${JSON.stringify(binaryMemoryError)})`);

    let writtenMemoryError = null;
    try {
      validateRegisterPayload({ role: 'memory', writtenText: 'hola', documentDate: '2026-10-03' });
    } catch (error) { writtenMemoryError = rejectionOf(error); }
    record(writtenMemoryError !== null && writtenMemoryError.code === 'homecloud_memory_doc_meta_forbidden',
      `written MEMORY + documentDate still rejected with homecloud_memory_doc_meta_forbidden (got ${JSON.stringify(writtenMemoryError)})`);

    let invalidMemoryError = null;
    try {
      validateRegisterPayload({ role: 'memory', displayName: 'foto', mimeType: 'image/jpeg', sizeBytes: 1, documentDate: 'nope' });
    } catch (error) { invalidMemoryError = rejectionOf(error); }
    record(invalidMemoryError !== null && invalidMemoryError.code === 'homecloud_memory_doc_meta_forbidden',
      'MEMORY + an invalid documentDate keeps the memory-specific code, not the date code');

    const memory = validateRegisterPayload({ role: 'memory', displayName: 'foto', mimeType: 'image/jpeg', sizeBytes: 1 });
    record(memory.documentDate === null && memory.capturePrecision === 'unknown',
      'MEMORY capture semantics are untouched');

    writes.length = 0;
    await registerHomeCloudContent(REQUEST, {
      role: 'memory', displayName: 'foto', mimeType: 'image/jpeg', sizeBytes: 1, documentDate: '2026-10-03',
    }).then(
      () => record(false, 'the register SERVICE rejected MEMORY + documentDate'),
      (error) => record(error.code === 'homecloud_memory_doc_meta_forbidden',
        `the register SERVICE rejects MEMORY + documentDate with the memory code (got ${error.code})`),
    );
    record(writes.length === 0, 'MEMORY + documentDate never reaches the database');
  }

  console.log(`\nS4II_DOCUMENT_DATE_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('S4II_DOCUMENT_DATE_TESTS=FAIL');
  } else {
    console.log('S4II_DOCUMENT_DATE_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
