#!/usr/bin/env node
'use strict';

/**
 * HomeCloud S4-ii — Files literal search against the REAL PostgREST + Postgres.
 *
 * LOCAL_RUNTIME_REQUIRED. The deterministic suite proves the ENCODING; only this
 * seam can prove that the installed PostgREST actually HONOURS it, which is not
 * obvious because the grammar differs by position:
 *
 *   - a value inside a logic tree (`.or()`) IS unquoted by PostgREST
 *   - a PLAIN filter value (`.ilike()`) is NOT unquoted, so quoting it there
 *     would make the `"` characters part of the searched text
 *
 * It drives the REAL `homecloudFilesService.browseFiles` against a REAL local
 * Supabase, with only the Household context stubbed, so the emitted PostgREST
 * filters are the ones production emits.
 */

const path = require('node:path');
const Module = require('node:module');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'HOMECLOUD_MAX_UPLOAD_BYTES'],
});
requireLocalUrl('SUPABASE_URL');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUPABASE_CONFIG = path.join(REPO_ROOT, 'backend', 'src', 'config', 'supabase.js');
const CONTEXT_SERVICE = path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloud.context.service.js');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

async function run() {
  console.log('\n=== S4-ii FILES SEARCH RUNTIME TESTS (real PostgREST) ===\n');
  console.log(`Target Supabase local: ${process.env.SUPABASE_URL}`);

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runId = Date.now();
  const marker = `S4${String(runId).slice(-7)}`;
  const cleanup = { personIds: [], householdIds: [], folderIds: [], contentIds: [] };

  // A name that is UNIQUE per metacharacter class, so "matched exactly this one
  // row" is proof of literal semantics rather than a coincidence.
  const NAMES = [
    { key: 'plain', name: 'Informe Anual', file: 'Informe Anual.pdf' },
    { key: 'wildcards', name: '100%_off', file: '100%_off.txt' },
    { key: 'grammar', name: 'a)b,c(d)', file: 'a)b,c(d).txt' },
    { key: 'backslash', name: 'back\\slash', file: 'back\\slash.txt' },
    { key: 'quote', name: 'quote"d', file: 'quote"d.txt' },
  ];

  try {
    const { data: person, error: personError } = await admin
      .from('people').insert({ display_name: `${marker} person` }).select('*').single();
    if (personError) throw personError;
    cleanup.personIds.push(person.id);

    const { data: household, error: householdError } = await admin
      .from('households')
      .insert({ name: `${marker} household`, slug: `${marker}-hh`, created_by_person_id: person.id })
      .select('*').single();
    if (householdError) throw householdError;
    cleanup.householdIds.push(household.id);

    const nowIso = new Date().toISOString();
    const folders = NAMES.map(({ name }) => ({
      id: randomUUID(),
      household_id: household.id,
      name: `${marker} ${name}`,
      created_by_member_id: null,
      created_at: nowIso,
      updated_at: nowIso,
    }));
    const { error: folderError } = await admin.from('homecloud_folders').insert(folders);
    if (folderError) throw folderError;
    cleanup.folderIds.push(...folders.map((f) => f.id));

    const files = NAMES.map(({ key, file }) => {
      const id = randomUUID();
      return {
        id,
        household_id: household.id,
        role: 'file',
        display_name: `${marker} ${file}`,
        mime_type: 'text/plain',
        extension: 'txt',
        size_bytes: 1,
        original_storage_path: `${household.id}/${id}/original`,
        lifecycle: 'active',
        uploaded_at: nowIso,
        folder_id: null,
        note: key === 'plain' ? `${marker} nota unica` : null,
        intake_request_id: `${marker}-${id}`,
      };
    });
    const { error: contentError } = await admin.from('homecloud_contents').insert(files);
    if (contentError) throw contentError;
    cleanup.contentIds.push(...files.map((f) => f.id));

    const fileIdByKey = Object.fromEntries(NAMES.map(({ key }, index) => [key, files[index].id]));
    const folderIdByKey = Object.fromEntries(NAMES.map(({ key }, index) => [key, folders[index].id]));

    // The real service, with only the Household context stubbed.
    function stubModule(filename, exports) {
      const stub = new Module(filename, null);
      stub.filename = filename;
      stub.loaded = true;
      stub.paths = [];
      stub.exports = exports;
      require.cache[filename] = stub;
    }
    stubModule(SUPABASE_CONFIG, { supabaseAdmin: admin });
    stubModule(CONTEXT_SERVICE, {
      getHomeCloudContext: async () => ({
        householdId: household.id,
        household: { id: household.id, config: null },
        membership: { id: 'member-1', role: 'coordinator', status: 'active' },
        person: { id: person.id },
        membershipId: 'member-1',
        personId: person.id,
        accountId: 'user-1',
      }),
    });
    // eslint-disable-next-line import/no-dynamic-require
    const filesService = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudFilesService.js'));
    const REQUEST = { user: { id: 'user-1' }, accessToken: 'runtime-token' };

    // `keys` is the exact set of fixture rows the term must return for files, and
    // `folderKeys` the same for folders (they differ when the term only exists
    // in a file name or only in a note, since folders carry no extension/note).
    const CASES = [
      { term: 'Informe Anual', keys: ['plain'] },
      { term: 'nota unica', keys: ['plain'], byNote: true, folderKeys: [] },
      { term: '100%_off', keys: ['wildcards'] },
      { term: 'a)b,c(d)', keys: ['grammar'] },
      { term: 'back\\slash', keys: ['backslash'] },
      { term: 'quote"d', keys: ['quote'] },
      { term: '%', keys: ['wildcards'] },
      { term: '_', keys: ['wildcards'] },
      { term: ',', keys: ['grammar'] },
      { term: ')', keys: ['grammar'] },
      { term: '(', keys: ['grammar'] },
      { term: '"', keys: ['quote'] },
      { term: '\\', keys: ['backslash'] },
      { term: '.txt', keys: ['wildcards', 'grammar', 'backslash', 'quote'], folderKeys: [] },
      { term: '.pdf', keys: ['plain'], folderKeys: [] },
      { term: 'nada de esto', keys: [], folderKeys: [] },
    ];

    for (const testCase of CASES) {
      let browser = null;
      let code = null;
      try {
        browser = await filesService.browseFiles(REQUEST, { folderId: null, query: testCase.term, sort: 'recent' });
      } catch (error) {
        code = error.code ?? error.message;
      }
      if (code !== null) {
        record(false, `search ${JSON.stringify(testCase.term)} did not fail (${code})`);
        continue;
      }
      const gotFiles = browser.files.map((f) => f.id).sort();
      // `keys` lists the fixture rows whose display_name contains the term; a
      // note search can only match the row that owns the note.
      const expectedFiles = testCase.keys
        .map((key) => fileIdByKey[key]).sort();
      const gotFolders = browser.folders.map((f) => f.id).sort();
      const expectedFolders = (testCase.folderKeys ?? testCase.keys).map((key) => folderIdByKey[key]).sort();

      record(JSON.stringify(gotFiles) === JSON.stringify(expectedFiles),
        `search ${JSON.stringify(testCase.term)} returns exactly the expected files (${testCase.byNote ? 'by note' : 'by name'}): expected ${expectedFiles.length}, got ${gotFiles.length}`);
      record(JSON.stringify(gotFolders) === JSON.stringify(expectedFolders),
        `search ${JSON.stringify(testCase.term)} returns exactly the expected folders: expected ${expectedFolders.length}, got ${gotFolders.length}`);
    }

    // A folder-scoped search must not leak rows of another scope.
    const scoped = await filesService.browseFiles(REQUEST, { folderId: folders[0].id, query: '%', sort: 'recent' });
    record(scoped.files.length === 0 && scoped.folders.length === 0,
      'a folder-scoped % search does not leak files from anywhere else');
    const scopedPlain = await filesService.browseFiles(REQUEST, { folderId: folders[0].id, query: 'Informe Anual', sort: 'recent' });
    record(scopedPlain.files.length === 0, 'a folder-scoped ordinary search does not leak root files');
  } finally {
    if (cleanup.contentIds.length) await admin.from('homecloud_contents').delete().in('id', cleanup.contentIds);
    if (cleanup.folderIds.length) await admin.from('homecloud_folders').delete().in('id', cleanup.folderIds);
    if (cleanup.householdIds.length) await admin.from('households').delete().in('id', cleanup.householdIds);
    if (cleanup.personIds.length) await admin.from('people').delete().in('id', cleanup.personIds);
  }

  console.log(`\nS4II_SEARCH_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('S4II_SEARCH_RUNTIME_TESTS=FAIL');
  } else {
    console.log('S4II_SEARCH_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
