#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Stage 3A–3D — Acceptance + hardening runtime tests.
 *
 * Target: local Supabase only (127.0.0.1:56221 via backend/.env).
 * Exercises the REAL backend services with REAL Supabase Auth JWTs:
 *   - homecloudFilesService (browse/create/rename/delete/update)
 *   - homecloudIntakeService (register/upload/verify/finalize)
 *   - homecloudReadService (getContentById/getFolderById)
 *
 * Gates:
 *   3A files foundation (intake pipeline -> browser, staging hidden)
 *   3B organization (CRUD, validation, move invariants, delete-detach)
 *   3C discovery (global root search incl. files inside folders, scoped folder
 *      search, sort recent/name, folders-first shape)
 *   3D file info (rename/move/date/note persist; id/binary/path unchanged)
 *   SECURITY cross-household denial (7 cases) + capability guards
 *   STAGING/STORAGE regression (hidden staging, no client paths, denied
 *      direct write, active original protected)
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});
requireLocalUrl('SUPABASE_URL');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const filesService = require('../backend/src/services/homecloudFilesService');
const {
  registerHomeCloudContent,
  authorizeHomeCloudOriginalUpload,
  verifyHomeCloudOriginal,
  finalizeHomeCloudContent,
} = require('../backend/src/services/homecloudIntakeService');
const { getContentById, getFolderById } = require('../backend/src/services/homecloudReadService');
const { getHomeCloudOriginalPath } = require('../backend/src/lib/homecloudStoragePaths');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

async function expectReject(promiseFactory, expectedCode, message) {
  try {
    await promiseFactory();
    record(false, `${message} (expected rejection ${expectedCode}, got success)`);
    return null;
  } catch (e) {
    const ok = e && e.code === expectedCode;
    record(ok, `${message} (${(e && e.code) || 'no_code'}${ok ? '' : `, expected ${expectedCode}`})`);
    return e;
  }
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

async function createAuthUser(runId, label) {
  const email = `hc3-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, email, token: signedIn.session.access_token };
}

function reqFor(authUser, suffix) {
  return {
    user: { id: authUser.userId },
    accessToken: authUser.token,
    requestId: `req-hc3-${suffix}`,
    mutationId: `mut-hc3-${suffix}`,
  };
}

async function insertActiveFile({ householdId, displayName, folderId = null, note = null, documentDate = null, uploadedAt = null, memberId = null, prefix = '' }) {
  const id = randomUUID();
  const row = {
    id,
    household_id: householdId,
    role: 'file',
    display_name: displayName,
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 3,
    original_storage_path: getHomeCloudOriginalPath(householdId, id),
    lifecycle: 'active',
    uploaded_at: uploadedAt || new Date().toISOString(),
    folder_id: folderId,
    note,
    document_date: documentDate,
    uploaded_by_member_id: memberId,
    intake_request_id: `${prefix}${id}`,
  };
  const { error } = await serviceClient.from('homecloud_contents').insert(row);
  if (error) throw error;
  return row;
}

async function run() {
  console.log('\n=== HOMECLOUD STAGE 3A-3D ACCEPTANCE TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const runId = Date.now();
  const P = `s3${String(runId).slice(-6)}`;
  const cleanup = { authUsers: [], contentIds: [], originalPaths: [], folderIds: [], membershipIds: [], personIds: [], householdIds: [] };

  try {
    // ── Setup: HH-A (adultA + childA), HH-B (adultB) ──
    const adultA = await createAuthUser(runId, 'adultA');
    const childA = await createAuthUser(runId, 'childA');
    const adultB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(adultA.userId, childA.userId, adultB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient
        .from('people')
        .insert({ display_name: `HC3 ${label}`, auth_user_id: authUser.userId })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personA = await makePerson('AdultA', adultA);
    const personChildA = await makePerson('ChildA', childA);
    const personB = await makePerson('AdultB', adultB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient
        .from('households')
        .insert({ name: `HC3 ${label}`, slug: `hc3-${label}-${runId}`, created_by_person_id: creator.id })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }
    const householdA = await makeHousehold('a', personA);
    const householdB = await makeHousehold('b', personB);

    const nowIso = new Date().toISOString();
    async function addMember(householdId, personId, role) {
      const { data, error } = await serviceClient
        .from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status: 'active', joined_at: nowIso })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    const memberAdultA = await addMember(householdA.id, personA.id, 'adult');
    await addMember(householdA.id, personChildA.id, 'child');
    await addMember(householdB.id, personB.id, 'adult');

    for (const [personId, hhId] of [[personA.id, householdA.id], [personChildA.id, householdA.id], [personB.id, householdB.id]]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: hhId }).eq('id', personId);
      if (error) throw error;
    }

    const reqA = reqFor(adultA, 'a');
    const reqChildA = reqFor(childA, 'childa');
    const reqB = reqFor(adultB, 'b');

    // ══════════════════════════════════════════════════════════
    // 3A — FILES FOUNDATION: full intake pipeline -> browser
    // ══════════════════════════════════════════════════════════
    console.log('\n--- 3A foundation: register/upload/verify/finalize -> browser ---');
    const intakeName = `${P} contrato.pdf`;
    const staged = await registerHomeCloudContent(reqA, {
      role: 'file', displayName: intakeName, mimeType: 'application/pdf',
      sizeBytes: 5, extension: 'pdf', intakeRequestId: `hc3-intake-${runId}`,
    });
    cleanup.contentIds.push(staged.id);

    const { data: stagedRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', staged.id).single();
    cleanup.originalPaths.push(stagedRow.original_storage_path);
    record(stagedRow.lifecycle === 'staging', '3A: register creates staging row');
    record(stagedRow.original_storage_path === getHomeCloudOriginalPath(householdA.id, staged.id), '3A: server-generated canonical storage path');

    const hiddenBrowse = await filesService.browseFiles(reqA, { folderId: null, query: '', sort: 'recent' });
    record(!hiddenBrowse.files.some((f) => f.id === staged.id), '3A: staging content hidden from browser');
    const hiddenSearch = await filesService.browseFiles(reqA, { folderId: null, query: intakeName.slice(0, 8), sort: 'recent' });
    record(!hiddenSearch.files.some((f) => f.id === staged.id), '3A: staging content hidden from search');
    await expectReject(() => getContentById(reqA, staged.id), 'homecloud_content_not_found', '3A: staging hidden from normal read');

    const uploadAuth = await authorizeHomeCloudOriginalUpload(reqA, staged.id);
    const put = await fetch(uploadAuth.signedUploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'application/pdf', 'x-upsert': 'false' },
      body: Buffer.from('hello'),
    });
    record(put.ok, `3A: signed upload accepts canonical original (${put.status})`);
    const verified = await verifyHomeCloudOriginal(reqA, staged.id);
    record(verified.verified === true, '3A: uploaded original verifies');
    const finalized = await finalizeHomeCloudContent(reqA, staged.id);
    record(finalized.id === staged.id, '3A: finalize returns canonical DTO');

    const afterAdd = await filesService.browseFiles(reqA, { folderId: null, query: '', sort: 'recent' });
    record(afterAdd.files.some((f) => f.id === staged.id), '3A: file appears in browser without reload (fresh read)');
    const dtoKeys = Object.keys(afterAdd.files.find((f) => f.id === staged.id));
    record(!dtoKeys.includes('original_storage_path') && !dtoKeys.includes('preview_storage_path'), '3A: browser DTO leaks no storage paths');

    // ══════════════════════════════════════════════════════════
    // 3B — ORGANIZATION
    // ══════════════════════════════════════════════════════════
    console.log('\n--- 3B organization: folders CRUD + validation ---');
    const folder = await filesService.createFolder(reqA, `${P} Facturas`);
    cleanup.folderIds.push(folder.id);
    record(typeof folder.id === 'string' && folder.name === `${P} Facturas`, '3B: create valid folder');

    const browseAfterCreate = await filesService.browseFiles(reqA, { folderId: null, query: '', sort: 'recent' });
    record(browseAfterCreate.folders.some((f) => f.id === folder.id), '3B: folder appears without reload (fresh read)');
    record(browseAfterCreate.folders.length > 0 && browseAfterCreate.files !== undefined, '3B: root browser keeps folders-first shape {folders, files}');

    const trimmed = await filesService.createFolder(reqA, `  ${P} Recetas  `);
    cleanup.folderIds.push(trimmed.id);
    record(trimmed.name === `${P} Recetas`, '3B: create trims name');

    await expectReject(() => filesService.createFolder(reqA, '   '), 'homecloud_invalid_name', '3B: empty name rejected');
    await expectReject(() => filesService.createFolder(reqA, `  ${P.toLowerCase()} facturas `), 'homecloud_folder_name_conflict', '3B: duplicate case/trim-insensitive rejected');

    const renamed = await filesService.renameFolder(reqA, folder.id, `${P} Facturas 2026`);
    record(renamed.name === `${P} Facturas 2026`, '3B: rename returns canonical result');
    const refetched = await getFolderById(reqA, folder.id);
    record(refetched.name === `${P} Facturas 2026`, '3B: rename persists on re-read (survives restart)');

    // Add in folder inherits + no root duplication.
    const inFolderRow = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} dentro.pdf`, folderId: folder.id,
      memberId: memberAdultA.id, prefix: `hc3-in-${runId}-`,
    });
    cleanup.contentIds.push(inFolderRow.id);
    cleanup.originalPaths.push(inFolderRow.original_storage_path);
    const folderBrowse = await filesService.browseFiles(reqA, { folderId: folder.id, query: '', sort: 'recent' });
    record(folderBrowse.files.some((f) => f.id === inFolderRow.id), '3B: file added in folder appears inside folder');
    record(folderBrowse.folders.length === 0, '3B: folder context has no nested folder UI');
    const rootBrowse = await filesService.browseFiles(reqA, { folderId: null, query: '', sort: 'recent' });
    record(!rootBrowse.files.some((f) => f.id === inFolderRow.id), '3B: file inside folder NOT duplicated in root');

    // Move Root -> Folder -> Root with identity/storage invariants.
    const movableRow = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} movible.txt`,
      memberId: memberAdultA.id, prefix: `hc3-mv-${runId}-`,
    });
    cleanup.contentIds.push(movableRow.id);
    cleanup.originalPaths.push(movableRow.original_storage_path);
    const movedIn = await filesService.updateFile(reqA, movableRow.id, { folderId: folder.id });
    record(movedIn.folderId === folder.id && movedIn.id === movableRow.id, '3B: move Root -> Folder keeps canonical content id');
    const { data: movedInRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', movableRow.id).single();
    record(movedInRow.original_storage_path === movableRow.original_storage_path, '3B: move keeps same Storage path');
    record(movedInRow.lifecycle === 'active', '3B: move keeps lifecycle active');
    const movedOut = await filesService.updateFile(reqA, movableRow.id, { folderId: null });
    record(movedOut.folderId === null && movedOut.id === movableRow.id, '3B: move Folder -> Root keeps canonical content id');
    const { data: movedOutRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', movableRow.id).single();
    record(movedOutRow.original_storage_path === movableRow.original_storage_path, '3B: move back keeps same binary path');

    // Delete folder: files survive detached.
    const doomed = await filesService.createFolder(reqA, `${P} Temporal`);
    cleanup.folderIds = cleanup.folderIds.filter((id) => id !== doomed.id);
    const doomedFileRow = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} huerfano.txt`, folderId: doomed.id,
      memberId: memberAdultA.id, prefix: `hc3-orf-${runId}-`,
    });
    cleanup.contentIds.push(doomedFileRow.id);
    cleanup.originalPaths.push(doomedFileRow.original_storage_path);
    await filesService.deleteFolder(reqA, doomed.id);
    await expectReject(() => getFolderById(reqA, doomed.id), 'homecloud_folder_not_found', '3B: deleted folder disappears');
    const { data: orphanRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', doomedFileRow.id).single();
    record(orphanRow !== null, '3B: no file object deleted with folder');
    record(orphanRow.id === doomedFileRow.id, '3B: delete-detach keeps content.id unchanged');
    record(orphanRow.original_storage_path === doomedFileRow.original_storage_path, '3B: delete-detach keeps original_storage_path unchanged');
    record(orphanRow.lifecycle === 'active', '3B: delete-detach keeps lifecycle active');
    record(orphanRow.folder_id === null, '3B: delete-detach sets folder_id NULL (file survives at root)');
    const rootAfterDelete = await filesService.browseFiles(reqA, { folderId: null, query: '', sort: 'recent' });
    record(rootAfterDelete.files.some((f) => f.id === doomedFileRow.id), '3B: detached file becomes root file');

    // ══════════════════════════════════════════════════════════
    // 3C — SEARCH + SORT
    // ══════════════════════════════════════════════════════════
    console.log('\n--- 3C discovery: global search + scoped folder search + sort ---');
    const searchFolder = await filesService.createFolder(reqA, `${P} Busqueda Carpeta`);
    cleanup.folderIds.push(searchFolder.id);
    const looseRow = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} Informe Anual.pdf`, note: `${P} nota ministerio`,
      memberId: memberAdultA.id, prefix: `hc3-lo-${runId}-`,
    });
    const innerRow = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} Presupuesto Q1.pdf`, folderId: searchFolder.id,
      memberId: memberAdultA.id, prefix: `hc3-inn-${runId}-`,
    });
    const otherFolder = await filesService.createFolder(reqA, `${P} Otra Carpeta`);
    cleanup.folderIds.push(otherFolder.id);
    const otherRow = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} Otro Documento.pdf`, folderId: otherFolder.id,
      memberId: memberAdultA.id, prefix: `hc3-oth-${runId}-`,
    });
    for (const r of [looseRow, innerRow, otherRow]) {
      cleanup.contentIds.push(r.id);
      cleanup.originalPaths.push(r.original_storage_path);
    }

    const folderNameHit = await filesService.browseFiles(reqA, { folderId: null, query: 'Busqueda Carpeta', sort: 'recent' });
    record(folderNameHit.folders.some((f) => f.id === searchFolder.id), '3C: root search matches folder name');
    const looseHit = await filesService.browseFiles(reqA, { folderId: null, query: 'Informe Anual', sort: 'recent' });
    record(looseHit.files.some((f) => f.id === looseRow.id), '3C: root search matches loose file display_name');
    const innerHit = await filesService.browseFiles(reqA, { folderId: null, query: 'Presupuesto Q1', sort: 'recent' });
    record(innerHit.files.some((f) => f.id === innerRow.id), '3C: root search matches file inside folder (global)');
    const noteHit = await filesService.browseFiles(reqA, { folderId: null, query: 'nota ministerio', sort: 'recent' });
    record(noteHit.files.some((f) => f.id === looseRow.id), '3C: root search matches file note');

    const scopedHit = await filesService.browseFiles(reqA, { folderId: searchFolder.id, query: 'Presupuesto', sort: 'recent' });
    record(scopedHit.files.some((f) => f.id === innerRow.id), '3C: folder search returns files in that folder');
    const scopedLeakRoot = await filesService.browseFiles(reqA, { folderId: searchFolder.id, query: 'Informe Anual', sort: 'recent' });
    record(!scopedLeakRoot.files.some((f) => f.id === looseRow.id) && scopedLeakRoot.files.length === 0, '3C: folder search does NOT leak root files');
    const scopedLeakOther = await filesService.browseFiles(reqA, { folderId: searchFolder.id, query: 'Otro Documento', sort: 'recent' });
    record(!scopedLeakOther.files.some((f) => f.id === otherRow.id), '3C: folder search does NOT leak another folder files');

    // Sort: deterministic names + staggered uploaded_at.
    const sortOlder = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} Sort Beta.txt`,
      uploadedAt: new Date(Date.now() - 60000).toISOString(), memberId: memberAdultA.id, prefix: `hc3-sb-${runId}-`,
    });
    const sortNewer = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} Sort Alfa.txt`,
      uploadedAt: new Date().toISOString(), memberId: memberAdultA.id, prefix: `hc3-sa-${runId}-`,
    });
    cleanup.contentIds.push(sortOlder.id, sortNewer.id);
    cleanup.originalPaths.push(sortOlder.original_storage_path, sortNewer.original_storage_path);

    const recentBrowse = await filesService.browseFiles(reqA, { folderId: null, query: `${P} Sort`, sort: 'recent' });
    const recentIds = recentBrowse.files.map((f) => f.id);
    record(recentIds.indexOf(sortNewer.id) !== -1 && recentIds.indexOf(sortOlder.id) !== -1
      && recentIds.indexOf(sortNewer.id) < recentIds.indexOf(sortOlder.id), '3C: sort Recientes orders newest first');
    const nameBrowse = await filesService.browseFiles(reqA, { folderId: null, query: `${P} Sort`, sort: 'name' });
    const nameIds = nameBrowse.files.map((f) => f.id);
    record(nameIds.indexOf(sortNewer.id) !== -1 && nameIds.indexOf(sortOlder.id) !== -1
      && nameIds.indexOf(sortNewer.id) < nameIds.indexOf(sortOlder.id), '3C: sort Nombre A-Z orders alphabetically');
    const rootShape = await filesService.browseFiles(reqA, { folderId: null, query: '', sort: 'recent' });
    record(Array.isArray(rootShape.folders) && rootShape.folders.length > 0, '3C: root keeps folders-first shape (folders array precedes files)');

    // ══════════════════════════════════════════════════════════
    // 3D — FILE INFO
    // ══════════════════════════════════════════════════════════
    console.log('\n--- 3D file info: rename/move/date/note persist + invariants ---');
    const infoRow = await insertActiveFile({
      householdId: householdA.id, displayName: `${P} info.txt`,
      memberId: memberAdultA.id, prefix: `hc3-info-${runId}-`,
    });
    cleanup.contentIds.push(infoRow.id);
    cleanup.originalPaths.push(infoRow.original_storage_path);

    const renamedFile = await filesService.updateFile(reqA, infoRow.id, { displayName: `${P} info renombrado.txt` });
    record(renamedFile.displayName === `${P} info renombrado.txt`, '3D: rename returns canonical result');
    const rereadRenamed = await getContentById(reqA, infoRow.id);
    record(rereadRenamed.displayName === `${P} info renombrado.txt`, '3D: rename persists on re-read');

    const movedFile = await filesService.updateFile(reqA, infoRow.id, { folderId: searchFolder.id });
    record(movedFile.folderId === searchFolder.id, '3D: folder move returns canonical result');
    const rereadMoved = await getContentById(reqA, infoRow.id);
    record(rereadMoved.folderId === searchFolder.id, '3D: folder move persists on re-read');

    const datedFile = await filesService.updateFile(reqA, infoRow.id, { documentDate: '2026-03-15' });
    record(datedFile.documentDate === '2026-03-15', '3D: document_date edit returns canonical result');
    const notedFile = await filesService.updateFile(reqA, infoRow.id, { note: `${P} nota editada` });
    record(notedFile.note === `${P} nota editada`, '3D: note edit returns canonical result');
    const rereadMeta = await getContentById(reqA, infoRow.id);
    record(rereadMeta.documentDate === '2026-03-15' && rereadMeta.note === `${P} nota editada`, '3D: metadata persists on re-read');

    const { data: infoFinalRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', infoRow.id).single();
    record(infoFinalRow.id === infoRow.id, '3D: edits keep content id');
    record(infoFinalRow.original_storage_path === infoRow.original_storage_path, '3D: edits keep original binary path');
    record(infoFinalRow.lifecycle === 'active', '3D: edits keep lifecycle active');

    await expectReject(() => filesService.updateFile(reqA, infoRow.id, { documentDate: '15-03-2026' }), 'homecloud_invalid_document_date', '3D: invalid document_date rejected');
    await expectReject(() => filesService.updateFile(reqA, infoRow.id, { displayName: '   ' }), 'homecloud_invalid_name', '3D: empty rename rejected');
    await expectReject(() => filesService.updateFile(reqA, infoRow.id, {}), 'homecloud_no_file_changes', '3D: empty patch rejected');

    // ══════════════════════════════════════════════════════════
    // SECURITY — cross-household denial (7 cases)
    // ══════════════════════════════════════════════════════════
    console.log('\n--- SECURITY: cross-household denial ---');
    const bFolder = await filesService.createFolder(reqB, `${P} B Privada`);
    cleanup.folderIds.push(bFolder.id);
    const bRow = await insertActiveFile({
      householdId: householdB.id, displayName: `${P} b secreto.txt`, note: `${P} b nota`,
      memberId: null, prefix: `hc3-b-${runId}-`,
    });
    cleanup.contentIds.push(bRow.id);
    cleanup.originalPaths.push(bRow.original_storage_path);

    await expectReject(() => getContentById(reqA, bRow.id), 'homecloud_content_not_found', 'SEC: HH-A read HH-B file DENIED');
    await expectReject(() => getFolderById(reqA, bFolder.id), 'homecloud_folder_not_found', 'SEC: HH-A read HH-B folder DENIED');
    const crossSearch = await filesService.browseFiles(reqA, { folderId: null, query: 'b secreto', sort: 'recent' });
    record(!crossSearch.files.some((f) => f.id === bRow.id), 'SEC: HH-A search cannot see HH-B content DENIED');
    const crossSearchFolder = await filesService.browseFiles(reqA, { folderId: null, query: 'B Privada', sort: 'recent' });
    record(!crossSearchFolder.folders.some((f) => f.id === bFolder.id), 'SEC: HH-A search cannot see HH-B folder DENIED');
    await expectReject(() => filesService.updateFile(reqA, looseRow.id, { folderId: bFolder.id }), 'homecloud_folder_not_found', 'SEC: move HH-A content to HH-B folder DENIED');
    await expectReject(() => filesService.renameFolder(reqA, bFolder.id, 'hack'), 'homecloud_folder_not_found', 'SEC: rename HH-B folder DENIED');
    await expectReject(() => filesService.deleteFolder(reqA, bFolder.id), 'homecloud_folder_not_found', 'SEC: delete HH-B folder DENIED');
    await expectReject(() => filesService.updateFile(reqA, bRow.id, { note: 'hack' }), 'homecloud_content_not_found', 'SEC: edit HH-B file metadata DENIED');

    // Capability guards canonical (no role hardcoding): child lacks organize/contribute.
    await expectReject(() => filesService.createFolder(reqChildA, 'child folder'), 'homecloud_forbidden', 'SEC: capability guard denies organize without homecloud.organize');
    await expectReject(() => filesService.updateFile(reqChildA, looseRow.id, { note: 'child hack' }), 'homecloud_forbidden', 'SEC: capability guard denies metadata edit without homecloud.organize');
    await expectReject(() => registerHomeCloudContent(reqChildA, {
      role: 'file', displayName: 'child.txt', mimeType: 'text/plain', sizeBytes: 1, intakeRequestId: `hc3-child-${runId}`,
    }), 'homecloud_forbidden', 'SEC: capability guard denies intake without homecloud.contribute');
    const filesSource = fs.readFileSync(path.join(__dirname, '..', 'backend', 'src', 'services', 'homecloudFilesService.js'), 'utf8');
    record(filesSource.includes('resolveHomeCloudCapabilities') && filesSource.includes('assertHomeCloudCapability'), 'SEC: files service enforces canonical capability guards');
    record(!/['"](coordinator|adult|adolescent|child|senior|guest)['"]/.test(filesSource), 'SEC: files service has no role hardcoding');

    // ══════════════════════════════════════════════════════════
    // STAGING / STORAGE REGRESSION
    // ══════════════════════════════════════════════════════════
    console.log('\n--- STORAGE/STAGING regression ---');
    await expectReject(() => registerHomeCloudContent(reqA, {
      role: 'file', displayName: 'evil.txt', mimeType: 'text/plain', sizeBytes: 1,
      original_storage_path: 'evil/path', intakeRequestId: `hc3-evil1-${runId}`,
    }), 'homecloud_forbidden_register_field', 'STORAGE: client cannot select arbitrary storage path');
    await expectReject(() => registerHomeCloudContent(reqA, {
      role: 'file', displayName: 'evil2.txt', mimeType: 'text/plain', sizeBytes: 1,
      household_id: householdB.id, intakeRequestId: `hc3-evil2-${runId}`,
    }), 'homecloud_forbidden_register_field', 'STORAGE: client cannot spoof household_id');
    await expectReject(() => registerHomeCloudContent(reqA, {
      role: 'file', displayName: 'evil3.txt', mimeType: 'text/plain', sizeBytes: 1,
      lifecycle: 'active', intakeRequestId: `hc3-evil3-${runId}`,
    }), 'homecloud_forbidden_register_field', 'STORAGE: client cannot force lifecycle');
    const direct = await anonClient.storage.from('homecloud-originals').upload(`evil/${runId}/original`, Buffer.from('bad'), { contentType: 'text/plain', upsert: false });
    record(Boolean(direct.error), 'STORAGE: unauthorized direct Storage write denied');
    await expectReject(() => authorizeHomeCloudOriginalUpload(reqA, looseRow.id), 'homecloud_not_staging', 'STORAGE: active original remains protected (no re-upload auth)');
  } finally {
    if (cleanup.originalPaths.length > 0) {
      await serviceClient.storage.from('homecloud-originals').remove(cleanup.originalPaths).catch(() => {});
    }
    if (cleanup.contentIds.length > 0) {
      await serviceClient.from('homecloud_contents').delete().in('id', cleanup.contentIds);
    }
    if (cleanup.folderIds.length > 0) {
      await serviceClient.from('homecloud_folders').delete().in('id', cleanup.folderIds);
    }
    if (cleanup.membershipIds.length > 0) {
      await serviceClient.from('household_members').delete().in('id', cleanup.membershipIds);
    }
    if (cleanup.householdIds.length > 0) {
      await serviceClient.from('households').delete().in('id', cleanup.householdIds);
    }
    if (cleanup.personIds.length > 0) {
      await serviceClient.from('people').delete().in('id', cleanup.personIds);
    }
    for (const userId of cleanup.authUsers) {
      await serviceClient.auth.admin.deleteUser(userId).catch(() => {});
    }
  }

  console.log(`\nHC3_ACCEPTANCE_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC3_ACCEPTANCE_TESTS=FAIL');
  } else {
    console.log('HC3_ACCEPTANCE_TESTS=PASS');
  }
}

run().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
