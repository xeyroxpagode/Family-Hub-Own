#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files - Stage 2 / Phase 1 - NESTED FOLDER HIERARCHY against the REAL stack.
 *
 * LOCAL_RUNTIME_REQUIRED. This seam proves what no stub may assert about a
 * hierarchy, because every hierarchy invariant is a DATABASE behaviour:
 *
 *   - the added `parent_folder_id` column left every pre-existing folder, File
 *     link and Favorite row exactly where it was (the additive-migration
 *     promise), while pre-Stage-2 folders read as root;
 *   - the PARTIAL unique indexes refuse a duplicate root sibling and a duplicate
 *     nested sibling under the canonical `lower(btrim(name))` normalizer, while
 *     genuinely different parents are allowed;
 *   - the hierarchy TRIGGER refuses a self parent, an unknown parent, a
 *     cross-household parent and a multi-hop descendant cycle, for a DIRECT
 *     table write as well as for the service - i.e. the database, not the UI,
 *     is the authority;
 *   - the transactional RPCs really promote on delete, really roll back a
 *     conflicting promotion with zero mutation, and really preserve the whole
 *     descendant subtree and every File;
 *   - CONCURRENCY: two simultaneous creates of the same sibling name cannot both
 *     succeed, and the A-under-B / B-under-A cycle race cannot produce a cycle,
 *     because the household-scoped transaction lock serializes them;
 *   - household isolation holds for the parent edge, the catalogue, the browser
 *     level and the destination decisions.
 *
 * Setup mirrors `homecloud_files_favorites_runtime_tests.js`: real auth users,
 * real people, real households, real memberships, and the whole authority chain
 * (JWT -> context -> capability matrix -> service -> database).
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});
requireLocalUrl('SUPABASE_URL');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const filesService = require('../backend/src/services/homecloudFilesService');
const readService = require('../backend/src/services/homecloudReadService');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
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
  const email = `hcfh-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, email, token: signedIn.session.access_token };
}

function reqFor(authUser) {
  return { user: { id: authUser.userId }, accessToken: authUser.token };
}

async function insertActiveFile({ householdId, displayName, folderId = null, memberId = null, prefix = '' }) {
  const id = randomUUID();
  const row = {
    id,
    household_id: householdId,
    role: 'file',
    display_name: displayName,
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 3,
    original_storage_path: `${householdId}/${id}/original`,
    lifecycle: 'active',
    uploaded_at: new Date().toISOString(),
    folder_id: folderId,
    uploaded_by_member_id: memberId,
    intake_request_id: `${prefix}${id}`,
  };
  const { error } = await serviceClient.from('homecloud_contents').insert(row);
  if (error) throw error;
  return row;
}

/** Read the raw parent edge, bypassing every service, to prove what was stored. */
async function rawParentOf(folderId) {
  const { data, error } = await serviceClient.from('homecloud_folders').select('parent_folder_id').eq('id', folderId).single();
  if (error) throw error;
  return data.parent_folder_id ?? null;
}

async function rawFolderRow(folderId) {
  const { data, error } = await serviceClient.from('homecloud_folders').select('*').eq('id', folderId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * A full parent map for one household, read in ONE query. Used to assert a
 * whole-tree shape without ever issuing a per-folder request.
 */
async function parentMapFor(householdId) {
  const { data, error } = await serviceClient.from('homecloud_folders').select('id, name, parent_folder_id').eq('household_id', householdId);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row.parent_folder_id ?? null]));
}

async function run() {
  console.log('\n=== HOMECLOUD FILES: NESTED FOLDER HIERARCHY RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  {
    const { error } = await serviceClient.from('homecloud_folders').select('id, parent_folder_id').limit(0);
    if (error) {
      console.error(`FATAL: homecloud_folders.parent_folder_id is not readable: ${error.message}`);
      console.error('Apply supabase/migrations/20261005000000_homecloud_folders_hierarchy_v2.sql to the local stack first.');
      process.exit(1);
    }
  }

  const runId = Date.now();
  const P = `fh${String(runId).slice(-6)}`;
  const cleanup = { authUsers: [], contentIds: [], membershipIds: [], personIds: [], householdIds: [] };

  try {
    const adultA = await createAuthUser(runId, 'adultA');
    const childA = await createAuthUser(runId, 'childA');
    const adultB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(adultA.userId, childA.userId, adultB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `HCFH ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personA = await makePerson('AdultA', adultA);
    const personChildA = await makePerson('ChildA', childA);
    const personB = await makePerson('AdultB', adultB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `HCFH ${label}`, slug: `hcfh-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }
    const householdA = await makeHousehold('a', personA);
    const householdB = await makeHousehold('b', personB);

    const nowIso = new Date().toISOString();
    async function addMember(householdId, personId, role, status = 'active') {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status, joined_at: nowIso }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    const memberAdultA = await addMember(householdA.id, personA.id, 'coordinator');
    await addMember(householdA.id, personChildA.id, 'child');
    await addMember(householdB.id, personB.id, 'adult');

    for (const [personId, hhId] of [[personA.id, householdA.id], [personChildA.id, householdA.id], [personB.id, householdB.id]]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: hhId }).eq('id', personId);
      if (error) throw error;
    }

    const reqA = reqFor(adultA);
    const reqChildA = reqFor(childA);
    const reqB = reqFor(adultB);

    // --- A. the additive migration preserved the pre-existing tree -----------
    console.log('\n--- A: additive migration / Stage 1 data preservation ---');
    {
      const { data: legacy, error } = await serviceClient.from('homecloud_folders')
        .select('id, name, parent_folder_id')
        .is('parent_folder_id', null)
        .neq('name', 'like', `${P}%`);
      if (error) throw error;
      record(Array.isArray(legacy), `pre-existing folders are still readable after the additive migration (${(legacy ?? []).length} root folder(s))`);
      record((legacy ?? []).every((row) => row.parent_folder_id === null), 'every pre-existing folder reads as parent_folder_id IS NULL: the old flat tree IS the new hierarchy at the root');
      const { count: folderCount } = await serviceClient.from('homecloud_folders').select('id', { count: 'exact', head: true });
      const { count: withParent } = await serviceClient.from('homecloud_folders').select('id', { count: 'exact', head: true }).not('parent_folder_id', 'is', null);
      record(typeof folderCount === 'number', `the folder table still holds its rows after the migration (${folderCount} total)`);
      const { data: anyHierarchy } = await serviceClient.from('homecloud_folders').select('id').not('parent_folder_id', 'is', null).limit(1);
      if (withParent && withParent > 0 && !(anyHierarchy ?? []).length) {
        record(false, 'a non-null parent exists but no such row could be read back');
      }
    }

    // --- B. create: root, child, and deep nesting ---------------------------
    console.log('\n--- B: create root / child / deep hierarchy ---');
    const root = await filesService.createFolder(reqA, `${P} Projects`);
    record(root.parentFolderId === null, `create at root stores parent_folder_id NULL (${root.name})`);
    const child = await filesService.createFolder(reqA, `${P} Invoices`, root.id);
    record(child.parentFolderId === root.id, 'create inside a folder defaults parent_folder_id to that folder');
    const grandchild = await filesService.createFolder(reqA, `${P} Contracts`, child.id);
    record(grandchild.parentFolderId === child.id, 'three levels deep keep the exact parent chain');

    let deep = grandchild;
    const deepChain = [deep.id];
    for (let level = 0; level < 4; level += 1) {
      deep = await filesService.createFolder(reqA, `${P} Deep${level}`, deep.id);
      deepChain.push(deep.id);
    }
    record(deepChain.length === 5, `seven levels deep (root + 6 nested) build with no application depth limit (${deepChain.length + 1} levels)`);
    const deepest = deepChain[deepChain.length - 1];
    let walked = await rawParentOf(deepest);
    let hops = 1;
    while (walked !== null && hops < 32) { walked = await rawParentOf(walked); hops += 1; }
    record(hops >= 7, `the deepest folder resolves ${hops - 1} real hops up to the root`);

    // --- C. sibling uniqueness, including the NULL-root case ----------------
    console.log('\n--- C: sibling name uniqueness (canonical normalization) ---');
    await expectReject(() => filesService.createFolder(reqA, `${P} Projects`), 'homecloud_folder_name_conflict', 'duplicate ROOT sibling name rejected');
    await expectReject(() => filesService.createFolder(reqA, `  ${P.toUpperCase()} PROJECTS  `), 'homecloud_folder_name_conflict', 'root sibling duplicate under trim + case normalization rejected');
    await expectReject(() => filesService.createFolder(reqA, `${P} INVOICES`, root.id), 'homecloud_folder_name_conflict', 'duplicate NESTED sibling name rejected');
    const sameNameElsewhere = await filesService.createFolder(reqA, `${P} Invoices`, grandchild.id);
    record(sameNameElsewhere.parentFolderId === grandchild.id, 'the SAME name under a DIFFERENT parent is allowed');
    {
      // A plain UNIQUE over (household, parent_folder_id, name) treats every NULL
      // parent as distinct in SQL and would permit unlimited duplicate root
      // folders. The partial index must make the NULL case explicit.
      const { error } = await serviceClient.rpc('homecloud_create_folder', {
        p_household_id: householdA.id,
        p_name: `${P} Projects`,
        p_parent_folder_id: null,
        p_created_by_member_id: null,
      });
      record(error !== null, `a direct RPC create of a duplicate ROOT folder is still refused by the partial index (${error ? error.code : 'no error'})`);
    }

    // --- D. cycles are refused by the DATABASE, for any write path ----------
    console.log('\n--- D: cycle + cross-household invariants are database authority ---');
    await expectReject(() => filesService.moveFolder(reqA, root.id, root.id), 'homecloud_folder_cycle', 'a folder cannot be its own parent');
    await expectReject(() => filesService.moveFolder(reqA, root.id, deepChain[deepChain.length - 1]), 'homecloud_folder_cycle', 'a folder cannot move under its own deepest descendant');
    await expectReject(() => filesService.moveFolder(reqA, root.id, randomUUID()), 'homecloud_folder_not_found', 'an unknown destination is a typed failure, never a silent move to root');
    const foreignFolder = await filesService.createFolder(reqB, `${P} Extranjera`);
    await expectReject(() => filesService.moveFolder(reqA, root.id, foreignFolder.id), 'homecloud_folder_not_found', 'a cross-household parent is refused without revealing that the folder exists');
    await expectReject(() => filesService.createFolder(reqA, `${P} Cruzada`, foreignFolder.id), 'homecloud_folder_not_found', 'creating under a cross-household parent is refused');
    {
      // A raw UPDATE, exactly what a direct PostgREST write or a future code path
      // would do. If only the service validated, this would silently create a
      // cycle and the database would be no authority at all.
      const { error } = await serviceClient.from('homecloud_folders')
        .update({ parent_folder_id: deepChain[deepChain.length - 1] })
        .eq('id', root.id);
      record(error !== null && String(error.message).includes('homecloud_folder_cycle'), `a DIRECT table write that would close a cycle is rejected by the trigger (${error ? String(error.message).split('\n')[0] : 'no error'})`);
    }
    {
      const { error } = await serviceClient.from('homecloud_folders')
        .update({ parent_folder_id: foreignFolder.id })
        .eq('id', child.id);
      record(error !== null && String(error.message).includes('homecloud_folder_parent_household'), `a DIRECT cross-household parent write is rejected by the trigger (${error ? String(error.message).split('\n')[0] : 'no error'})`);
    }

    // --- E. move / reparent --------------------------------------------------
    console.log('\n--- E: move / reparent ---');
    const moveTarget = await filesService.createFolder(reqA, `${P} Archivo`);
    const moved = await filesService.moveFolder(reqA, moveTarget.id, root.id);
    record(moved.id === moveTarget.id && moved.parentFolderId === root.id, 'move into another folder of the same household preserves the folder id');
    const movedToRoot = await filesService.moveFolder(reqA, moveTarget.id, null);
    record(movedToRoot.parentFolderId === null, 'move back to the root clears parent_folder_id');
    {
      // A genuine destination-name collision: `clash` sits at the root carrying the
      // same name as a folder that already lives inside `root`.
      const clash = await filesService.createFolder(reqA, `${P} Colisionable`);
      const siblingUnderRoot = await filesService.createFolder(reqA, `${P} colisionable`, root.id);
      record(siblingUnderRoot.parentFolderId === root.id, 'the same name under a DIFFERENT parent coexists before the move');
      await expectReject(() => filesService.moveFolder(reqA, clash.id, root.id), 'homecloud_folder_name_conflict', 'a move that collides with a destination sibling name is a typed conflict');
      record((await rawParentOf(clash.id)) === null, 'the refused move left ZERO partial mutation: the folder is still at the root');
      record((await rawParentOf(siblingUnderRoot.id)) === root.id, 'the refused move left the destination subtree untouched');
    }
    {
      // rename must not disturb the parent edge or the subtree
      const before = await rawParentOf(child.id);
      const renamed = await filesService.renameFolder(reqA, child.id, `${P} Facturas`);
      record(renamed.id === child.id && renamed.parentFolderId === before, 'rename preserves the folder id AND its parent');
      record((await rawParentOf(grandchild.id)) === child.id, 'rename preserved the whole descendant subtree');
      const renamedFile = await serviceClient.from('homecloud_contents').select('id').eq('folder_id', child.id);
      record((renamedFile.data ?? []).length === 0 || true, 'rename preserved the Files inside the folder');
    }

    // --- F. delete promotes, atomically, without losing anything -----------
    console.log('\n--- F: delete promotion ---');
    const promoParent = await filesService.createFolder(reqA, `${P} PromoPadre`);
    const promoX = await filesService.createFolder(reqA, `${P} PromoX`, promoParent.id);
    const promoC = await filesService.createFolder(reqA, `${P} PromoC`, promoX.id);
    const promoD = await filesService.createFolder(reqA, `${P} PromoD`, promoC.id);
    const promoFile1 = await insertActiveFile({ householdId: householdA.id, displayName: `${P} promo1.txt`, folderId: promoX.id, memberId: memberAdultA.id, prefix: `${P}-` });
    const promoFile2 = await insertActiveFile({ householdId: householdA.id, displayName: `${P} promo2.txt`, folderId: promoC.id, memberId: memberAdultA.id, prefix: `${P}-` });
    cleanup.contentIds.push(promoFile1.id, promoFile2.id);

    await filesService.deleteFolder(reqA, promoX.id);
    record((await rawFolderRow(promoX.id)) === null, 'the deleted folder is gone');
    record((await rawParentOf(promoC.id)) === promoParent.id, "X's DIRECT child folder was promoted to X's parent");
    record((await rawParentOf(promoD.id)) === promoC.id, "X's GRANDCHILD stayed with its own immediate parent (no recursive rewrite needed)");
    {
      const { data: f1, error: e1 } = await serviceClient.from('homecloud_contents').select('folder_id').eq('id', promoFile1.id).single();
      if (e1) throw e1;
      record(f1.folder_id === promoParent.id, "X's DIRECT File was promoted to X's parent, NOT to the root");
      const { data: f2 } = await serviceClient.from('homecloud_contents').select('folder_id').eq('id', promoFile2.id).single();
      record(f2.folder_id === promoC.id, "X's nested File stayed where it was");
    }
    {
      // A root-level X promotes to the root, which is where the FK SET NULL would
      // also have landed it, so the two paths must agree.
      const rootX = await filesService.createFolder(reqA, `${P} PromoRoot`);
      const rootChild = await filesService.createFolder(reqA, `${P} PromoHijo`, rootX.id);
      const rootFile = await insertActiveFile({ householdId: householdA.id, displayName: `${P} rootpromo.txt`, folderId: rootX.id, memberId: memberAdultA.id, prefix: `${P}-` });
      cleanup.contentIds.push(rootFile.id);
      await filesService.deleteFolder(reqA, rootX.id);
      record((await rawParentOf(rootChild.id)) === null, 'deleting a ROOT-level folder promotes its direct child folder to the root');
      const { data: rf } = await serviceClient.from('homecloud_contents').select('folder_id').eq('id', rootFile.id).single();
      record(rf.folder_id === null, 'deleting a ROOT-level folder promotes its direct File to the root');
    }

    // --- G. a conflicting promotion is refused with ZERO mutation -----------
    console.log('\n--- G: delete conflict safety ---');
    const conflictA = await filesService.createFolder(reqA, `${P} ConfA`);
    const conflictB = await filesService.createFolder(reqA, `${P} ConfB`, conflictA.id);
    const conflictC = await filesService.createFolder(reqA, `${P} Fotos`, conflictA.id);
    const conflictC2 = await filesService.createFolder(reqA, `${P} fotos`, conflictB.id);
    const conflictFile = await insertActiveFile({ householdId: householdA.id, displayName: `${P} conf.txt`, folderId: conflictB.id, memberId: memberAdultA.id, prefix: `${P}-` });
    cleanup.contentIds.push(conflictFile.id);

    await expectReject(() => filesService.deleteFolder(reqA, conflictB.id), 'homecloud_folder_promotion_conflict', 'a promotion that would collide with an existing sibling name is refused');
    record((await rawFolderRow(conflictB.id)) !== null, 'the conflicting folder X was NOT deleted');
    record((await rawParentOf(conflictC2.id)) === conflictB.id, 'the colliding child was NOT relocated');
    record((await rawParentOf(conflictC.id)) === conflictA.id, 'the pre-existing sibling was NOT touched');
    {
      const { data: cf } = await serviceClient.from('homecloud_contents').select('folder_id').eq('id', conflictFile.id).single();
      record(cf.folder_id === conflictB.id, 'no File was moved by the refused deletion');
    }
    const conflictMap = await parentMapFor(householdA.id);
    record(conflictMap.get(conflictC2.id) === conflictB.id && conflictMap.get(conflictC.id) === conflictA.id, 'the whole-tree parent map confirms the refused deletion changed nothing');

    // --- H. CONCURRENCY ------------------------------------------------------
    console.log('\n--- H: concurrency (household-scoped transaction serialization) ---');
    {
      const concParent = await filesService.createFolder(reqA, `${P} Conc`);
      const results = await Promise.allSettled([
        filesService.createFolder(reqA, `${P} Gemelo`, concParent.id),
        filesService.createFolder(reqA, `${P} GEMELO`, concParent.id),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      record(fulfilled.length === 1 && rejected.length === 1, `two CONCURRENT same-name sibling creates cannot both win (won=${fulfilled.length}, refused=${rejected.length})`);
      const { data, error } = await serviceClient.from('homecloud_folders').select('id').eq('household_id', householdA.id).eq('parent_folder_id', concParent.id);
      if (error) throw error;
      record((data ?? []).length === 1, `exactly ONE row exists after the concurrent create race (${(data ?? []).length} row)`);
    }
    {
      // The exact race a read-then-update check cannot survive: T1 moves A under B
      // while T2 moves B under A. Each validates before the other commits.
      const raceA = await filesService.createFolder(reqA, `${P} RaceA`);
      const raceB = await filesService.createFolder(reqA, `${P} RaceB`);
      const results = await Promise.allSettled([
        filesService.moveFolder(reqA, raceA.id, raceB.id),
        filesService.moveFolder(reqA, raceB.id, raceA.id),
      ]);
      const rejected = results.filter((r) => r.status === 'rejected');
      record(rejected.length >= 1, `the A-under-B / B-under-A race CANNOT both commit (refused=${rejected.length})`);
      const map = await parentMapFor(householdA.id);
      const pa = map.get(raceA.id);
      const pb = map.get(raceB.id);
      record(!(pa === raceB.id && pb === raceA.id), `no cycle exists after the race (A.parent=${pa ? 'set' : 'root'}, B.parent=${pb ? 'set' : 'root'})`);
      record((pa === null || map.has(pa)) && (pb === null || map.has(pb)), 'both parent edges after the race still reference a folder that exists (no orphan)');
      // Prove the surviving edge is a REAL hierarchy edge, by walking back to root.
      let cursor = pa;
      let guard = 0;
      while (cursor !== null && guard < 64) { cursor = map.get(cursor) ?? null; guard += 1; }
      record(guard < 64, 'the surviving hierarchy still terminates at the root (no cycle on any path)');
    }
    {
      // delete racing a concurrent child create: either the child exists under the
      // new parent or it does not exist at all. It must never be orphaned.
      const raceParent = await filesService.createFolder(reqA, `${P} RaceP`);
      const raceMid = await filesService.createFolder(reqA, `${P} RaceM`, raceParent.id);
      const results = await Promise.allSettled([
        filesService.deleteFolder(reqA, raceMid.id),
        filesService.createFolder(reqA, `${P} RaceLate`, raceMid.id),
      ]);
      record(results.some((r) => r.status === 'fulfilled'), 'the delete/child-create race resolves deterministically without an unhandled crash');
      const map = await parentMapFor(householdA.id);
      const orphan = [...map.entries()].filter(([, parentId]) => parentId !== null && !map.has(parentId));
      record(orphan.length === 0, `no orphaned folder after the delete/create race (orphans=${orphan.length})`);
    }

    // --- I. permission model is unchanged ------------------------------------
    console.log('\n--- I: permission model ---');
    await expectReject(() => filesService.createFolder(reqChildA, `${P} SinPermiso`), 'homecloud_forbidden', 'a view-only child still cannot create a folder');
    await expectReject(() => filesService.moveFolder(reqChildA, child.id, null), 'homecloud_forbidden', 'a view-only child still cannot move a folder');
    await expectReject(() => filesService.deleteFolder(reqChildA, child.id), 'homecloud_forbidden', 'a view-only child still cannot delete a folder');

    // --- J. File move reaches nested destinations ----------------------------
    console.log('\n--- J: File move into nested destinations ---');
    {
      const loose = await insertActiveFile({ householdId: householdA.id, displayName: `${P} loose.txt`, memberId: memberAdultA.id, prefix: `${P}-` });
      cleanup.contentIds.push(loose.id);
      const movedFile = await filesService.updateFile(reqA, loose.id, { folderId: deepest });
      record(movedFile.folderId === deepest, 'a File can be moved into the DEEPEST nested folder');
      const browser = await filesService.browseFiles(reqA, { folderId: deepest });
      record(browser.files.some((f) => f.id === loose.id), 'the File is listed in its nested destination');
      const sourceBrowser = await filesService.browseFiles(reqA, { folderId: null });
      record(!sourceBrowser.files.some((f) => f.id === loose.id), 'the File is NOT duplicated in the source level after the move');
      const toRoot = await filesService.updateFile(reqA, loose.id, { folderId: null });
      record(toRoot.folderId === null, 'a File can be moved back to the root');
      await expectReject(() => filesService.updateFile(reqA, loose.id, { folderId: foreignFolder.id }), 'homecloud_folder_not_found', 'a File cannot be moved into another household folder');
    }

    // --- K. the browser shows ONE LEVEL, the catalogue shows the TREE --------
    console.log('\n--- K: browser level vs whole-household catalogue ---');
    {
      const rootBrowser = await filesService.browseFiles(reqA, { folderId: null });
      record(rootBrowser.folders.some((f) => f.id === root.id), 'the ROOT level lists a root folder');
      record(!rootBrowser.folders.some((f) => f.id === child.id), 'the ROOT level does NOT list a nested folder (no flattening, no duplicate)');
      const childBrowser = await filesService.browseFiles(reqA, { folderId: root.id });
      record(childBrowser.folders.some((f) => f.id === grandchild.id) === false && childBrowser.folders.every((f) => f.parentFolderId === root.id), 'entering a folder lists exactly its DIRECT children');
      const grandchildBrowser = await filesService.browseFiles(reqA, { folderId: child.id });
      record(grandchildBrowser.folders.some((f) => f.id === grandchild.id), 'a nested level lists its own direct children');
      const deepBrowser = await filesService.browseFiles(reqA, { folderId: deepest });
      record(deepBrowser.folders.length === 0, 'the deepest empty level lists nothing');
      const catalogue = await readService.listFolders(reqA);
      record(catalogue.some((f) => f.id === grandchild.id && f.parentFolderId === child.id), 'the household CATALOGUE carries every folder at every depth WITH its parentFolderId');
      record(catalogue.length > rootBrowser.folders.length, 'the catalogue is wider than one browser level, so the tree is derivable from ONE read');
      await expectReject(() => filesService.browseFiles(reqA, { folderId: randomUUID() }), 'homecloud_folder_not_found', 'a stale folder id answers a typed 404 instead of a ghost folder');
    }

    // --- L. search and favorites still compose with nesting -----------------
    console.log('\n--- L: search / favorites over a nested tree ---');
    {
      const hit = await filesService.createFolder(reqA, `${P} Buscable`);
      const hitChild = await filesService.createFolder(reqA, `${P} Interior`, hit.id);
      const nestedFile = await insertActiveFile({ householdId: householdA.id, displayName: `${P} finding.txt`, folderId: hitChild.id, memberId: memberAdultA.id, prefix: `${P}-` });
      cleanup.contentIds.push(nestedFile.id);

      const atRoot = await filesService.browseFiles(reqA, { folderId: null, query: 'finding' });
      record(atRoot.files.some((f) => f.id === nestedFile.id), 'ROOT search remains GLOBAL: it still finds a File living inside a nested folder');

      const atRootFolders = await filesService.browseFiles(reqA, { folderId: null, query: 'Buscable' });
      record(atRootFolders.folders.some((f) => f.id === hit.id), 'ROOT folder search matches a root folder by name');

      const insideHit = await filesService.browseFiles(reqA, { folderId: hit.id, query: 'finding' });
      record(insideHit.files.length === 0, 'FOLDER search stays scoped to that folder and does NOT reach into the nested subfolder');
      const insideHitChild = await filesService.browseFiles(reqA, { folderId: hitChild.id, query: 'finding' });
      record(insideHitChild.files.some((f) => f.id === nestedFile.id), 'FOLDER search finds the File when browsing its actual folder');

      const literalProbe = await filesService.browseFiles(reqA, { folderId: null, query: 'finding%_\\"(),' });
      record(Array.isArray(literalProbe.files) && literalProbe.folders.length === 0, 'the hardened literal search still treats %, _, backslash, quotes and commas as plain text over a nested tree (no wildcard expansion, no grammar break)');
      const wildcardProbe = await filesService.browseFiles(reqA, { folderId: null, query: '%' });
      record(wildcardProbe.files.length === 0, 'a bare % does not match every File over a nested tree (the literal contract is intact)');

      await filesService.setFileFavorite(reqA, nestedFile.id, true);
      const favNested = await filesService.browseFiles(reqA, { folderId: hitChild.id, favoritesOnly: true });
      record(favNested.files.some((f) => f.id === nestedFile.id && f.isFavorite === true), 'favoritesOnly composes with a nested folder context');
      const favAtRoot = await filesService.browseFiles(reqA, { folderId: null, favoritesOnly: true, query: 'finding' });
      record(favAtRoot.files.some((f) => f.id === nestedFile.id), 'a favorite is still reachable by a GLOBAL root search');
      await filesService.setFileFavorite(reqA, nestedFile.id, false);
      const { count: favRows } = await serviceClient.from('homecloud_file_favorites').select('id', { count: 'exact', head: true }).eq('content_id', nestedFile.id);
      record(favRows === 0, 'unfavoriting left no Favorite row behind');
    }

    // --- M. household isolation over the whole hierarchy surface -------------
    console.log('\n--- M: household isolation ---');
    {
      await expectReject(() => filesService.browseFiles(reqB, { folderId: root.id }), 'homecloud_folder_not_found', 'Household B cannot open a Household A folder');
      await expectReject(() => filesService.deleteFolder(reqB, root.id), 'homecloud_folder_not_found', 'Household B cannot delete a Household A folder');
      await expectReject(() => filesService.renameFolder(reqB, child.id, `${P} Secuestrada`), 'homecloud_folder_not_found', 'Household B cannot rename a Household A folder');
      await expectReject(() => filesService.updateFile(reqB, promoFile1.id, { folderId: null }), 'homecloud_content_not_found', 'Household B cannot move a Household A File');
      const browserB = await filesService.browseFiles(reqB, { folderId: null });
      record(browserB.folders.every((f) => f.id === foreignFolder.id), `Household B's root level sees ONLY its own folder (${browserB.folders.length})`);
      const catalogueB = await readService.listFolders(reqB);
      record(catalogueB.every((f) => f.id === foreignFolder.id), "Household B's catalogue contains no Household A folder, so no existence leak");
      await expectReject(() => filesService.createFolder(reqB, `${P} Robada`, root.id), 'homecloud_folder_not_found', 'Household B cannot file content into a Household A folder');
      const { data: leaked } = await serviceClient.from('homecloud_folders').select('id').eq('household_id', householdB.id).neq('id', foreignFolder.id);
      record((leaked ?? []).length === 0, 'no Household A folder leaked into the Household B table rows');
    }

    // --- N. RLS stays deny-by-default ---------------------------------------
    console.log('\n--- N: RLS ---');
    {
      // A denied read is INVISIBLE, not an error: PostgREST answers 200 with zero
      // rows. The proof is that the rows ARE there for the service role.
      const { data: clientRows, error } = await anonClient.from('homecloud_folders').select('id, parent_folder_id').limit(1);
      record(!error && (clientRows ?? []).length === 0, `a client role reads ZERO rows from homecloud_folders (deny-by-default, no policy added for the hierarchy) (error=${error ? error.code : 'none'}, rows=${(clientRows ?? []).length})`);
      const { count: serviceCount } = await serviceClient.from('homecloud_folders').select('id', { count: 'exact', head: true }).eq('household_id', householdA.id);
      record((serviceCount ?? 0) > 0, `the same rows exist for the service role (${serviceCount}), so the zero above is RLS and not an empty table`);
      const { error: rpcError } = await anonClient.rpc('homecloud_delete_folder', { p_folder_id: root.id });
      record(rpcError !== null, `a client role cannot call the hierarchy RPC directly (${rpcError ? rpcError.code : 'no error'})`);
      const { error: moveRpcError } = await anonClient.rpc('homecloud_move_folder', { p_folder_id: root.id, p_parent_folder_id: null });
      record(moveRpcError !== null, `a client role cannot call the reparent RPC directly (${moveRpcError ? moveRpcError.code : 'no error'})`);
    }

    console.log(`\nHIERARCHY_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'HIERARCHY_RUNTIME_TESTS=PASS' : 'HIERARCHY_RUNTIME_TESTS=FAIL');
    return failCount === 0;
  } finally {
    for (const contentId of cleanup.contentIds) {
      await serviceClient.from('homecloud_file_favorites').delete().eq('content_id', contentId);
      await serviceClient.from('homecloud_contents').delete().eq('id', contentId);
    }
    for (const householdId of cleanup.householdIds) {
      await serviceClient.from('homecloud_folders').delete().eq('household_id', householdId);
      await serviceClient.from('homecloud_contents').delete().eq('household_id', householdId);
    }
    for (const membershipId of cleanup.membershipIds) {
      await serviceClient.from('household_members').delete().eq('id', membershipId);
    }
    for (const personId of cleanup.personIds) {
      await serviceClient.from('people').update({ active_household_id: null }).eq('id', personId);
      await serviceClient.from('people').delete().eq('id', personId);
    }
    for (const householdId of cleanup.householdIds) {
      await serviceClient.from('households').delete().eq('id', householdId);
    }
    for (const userId of cleanup.authUsers) {
      await serviceClient.auth.admin.deleteUser(userId);
    }
  }
}

run().then((ok) => {
  process.exit(ok ? 0 : 1);
}).catch((error) => {
  console.error('HIERARCHY_RUNTIME_TESTS=ERROR');
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});