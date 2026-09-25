#!/usr/bin/env node
'use strict';

/**
 * HomeCloud STAGE 4A.2 — Memories V2 Persistence schema tests.
 *
 * Proves the migrated homecloud_contents contract directly on the local
 * PostgreSQL database:
 *   - two content shapes (BINARY / WRITTEN) are the only valid forms
 *   - a File is ALWAYS binary; Written Memory is role='memory' only
 *   - semantic date matrix (unknown / year / month_year / exact) with
 *     UTC coherence for exact and no fake timestamps for partials
 *   - active resolvable: Written active with uploaded_at NULL is valid,
 *     binary active still requires full custody
 *   - hidden_from_resurfacing defaults to false
 *   - Albums N:M unchanged: Written Memory joins, File does not
 *
 * Local DB only (LOCAL_DATABASE_URL must target 127.0.0.1/localhost).
 * All test rows are cleaned up in a finally block. No reset. No destructive ops.
 */

const { randomUUID } = require('node:crypto');
const { loadTestEnvironment } = require('../tests/helpers/environment');

// Required so the helper falls back to `supabase status -o env` and maps
// DB_URL -> LOCAL_DATABASE_URL for the running local project.
loadTestEnvironment({ required: ['LOCAL_DATABASE_URL'] });

const databaseUrl = process.env.LOCAL_DATABASE_URL;
const { Client } = require('../backend/node_modules/pg');

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

async function expectReject(client, sql, params, message) {
  try {
    await client.query(sql, params);
  } catch (e) {
    record(e.code === '23514', `${message} (pg ${e.code || 'no_code'})`);
    return e;
  }
  record(false, `${message} (expected check violation, insert succeeded)`);
  return null;
}

async function insertOk(client, sql, params, message) {
  try {
    const res = await client.query(sql, params);
    record(true, message);
    return res.rows[0];
  } catch (e) {
    record(false, `${message} (unexpected pg error: ${e.code} ${e.message})`);
    return null;
  }
}

async function main() {
  const parsed = new URL(databaseUrl);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error('ENVIRONMENT_FAILURE: schema tests only permit local PostgreSQL');
  }

  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  await client.connect();
  const runId = Date.now();
  let householdId = null;
  let personId = null;

  console.log('\n=== HC-4A2 PERSISTENCE SCHEMA TESTS ===\n');

  try {
    // --- setup: person + household + folder + album ---
    const person = await client.query(
      "insert into public.people (display_name) values ($1) returning id",
      [`HC4A2 Schema ${runId}`],
    );
    personId = person.rows[0].id;
    const household = await client.query(
      "insert into public.households (name, slug, created_by_person_id) values ($1, $2, $3) returning id",
      [`HC4A2 Household ${runId}`, `hc4a2-${runId}`, personId],
    );
    householdId = household.rows[0].id;
    const folder = await client.query(
      "insert into public.homecloud_folders (household_id, name) values ($1, $2) returning id",
      [householdId, `Folder ${runId}`],
    );
    const folderId = folder.rows[0].id;
    const album = await client.query(
      "insert into public.homecloud_albums (household_id, name) values ($1, $2) returning id",
      [householdId, `Album ${runId}`],
    );
    const albumId = album.rows[0].id;

    const contentsSql = `insert into public.homecloud_contents
      (household_id, role, display_name, mime_type, size_bytes, original_storage_path,
       written_text, caption, folder_id, captured_at, captured_year, captured_month,
       capture_precision, lifecycle, uploaded_at, hidden_from_resurfacing)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      returning id, hidden_from_resurfacing, written_text, captured_year, captured_month`;

    function binaryFile(over = {}) {
      return {
        role: 'file', display_name: `doc-${randomUUID().slice(0, 8)}.txt`, mime_type: 'text/plain',
        size_bytes: 12, original_storage_path: `${householdId}/${randomUUID()}/original`,
        written_text: null, caption: null, folder_id: null, captured_at: null,
        captured_year: null, captured_month: null, capture_precision: 'unknown',
        lifecycle: 'staging', uploaded_at: null, hidden_from_resurfacing: false, ...over,
      };
    }

    function binaryMemory(mime, over = {}) {
      return {
        role: 'memory', display_name: `memory-${randomUUID().slice(0, 8)}`, mime_type: mime,
        size_bytes: 100, original_storage_path: `${householdId}/${randomUUID()}/original`,
        written_text: null, caption: null, folder_id: null, captured_at: null,
        captured_year: null, captured_month: null, capture_precision: 'unknown',
        lifecycle: 'staging', uploaded_at: null, hidden_from_resurfacing: false, ...over,
      };
    }

    function writtenMemory(over = {}) {
      return {
        role: 'memory', display_name: null, mime_type: null,
        size_bytes: null, original_storage_path: null,
        written_text: `Recuerdo escrito ${randomUUID()}`, caption: null, folder_id: null,
        captured_at: null, captured_year: null, captured_month: null,
        capture_precision: 'unknown', lifecycle: 'staging', uploaded_at: null,
        hidden_from_resurfacing: false, ...over,
      };
    }

    async function insertContent(row) {
      const res = await client.query(
        contentsSql,
        [householdId, row.role, row.display_name, row.mime_type, row.size_bytes, row.original_storage_path,
         row.written_text, row.caption, row.folder_id, row.captured_at, row.captured_year, row.captured_month,
         row.capture_precision, row.lifecycle, row.uploaded_at, row.hidden_from_resurfacing],
      );
      return res.rows[0];
    }

    // ============ VALID SHAPES ============

    // 1. File binario válido sigue insertable.
    const fileRow = await insertOk(client, contentsSql,
      [householdId, 'file', `f-${runId}.txt`, 'text/plain', 12, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, null, null, 'unknown', 'staging', null, false],
      '1. valid binary File still insertable');
    const fileId = fileRow?.id;

    // 2-4. Binary Memory image/video/audio válidos.
    for (const [label, mime] of [['image', 'image/jpeg'], ['video', 'video/mp4'], ['audio', 'audio/mpeg']]) {
      await insertOk(client, contentsSql,
        [householdId, 'memory', `m-${label}-${runId}`, mime, 100, `${householdId}/${randomUUID()}/original`,
         null, null, null, null, null, null, 'unknown', 'staging', null, false],
        `${label === 'image' ? '2' : label === 'video' ? '3' : '4'}. valid binary Memory (${mime}) insertable`);
    }

    // 5. Written Memory válido.
    const written = writtenMemory();
    const writtenRow = await insertOk(client, contentsSql,
      [householdId, 'memory', null, null, null, null, written.written_text, null, null, null, null, null, 'unknown', 'staging', null, false],
      '5. valid Written Memory insertable (binary fields NULL)');
    const writtenId = writtenRow?.id;

    // ============ WRITTEN REJECTIONS ============

    // 6. Written File rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'file', null, null, null, null, 'texto en un file', null, null, null, null, null, 'unknown', 'staging', null, false],
      '6. Written FILE rejected (file must stay binary)');

    // 7. Written Memory con MIME rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', null, 'text/plain', null, null, 'texto', null, null, null, null, null, 'unknown', 'staging', null, false],
      '7. Written Memory with fake MIME rejected');

    // 8. Written Memory con storage path rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', null, null, null, `${householdId}/${randomUUID()}/original`, 'texto', null, null, null, null, null, 'unknown', 'staging', null, false],
      '8. Written Memory with original_storage_path rejected');

    // 9. Written Memory con size rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', null, null, 5, null, 'texto', null, null, null, null, null, 'unknown', 'staging', null, false],
      '9. Written Memory with fake size_bytes rejected');

    // 10. Written Memory con caption rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', null, null, null, null, 'texto', 'caption duplicado', null, null, null, null, 'unknown', 'staging', null, false],
      '10. Written Memory with caption rejected (text IS the content)');

    // 11. Written Memory con folder rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', null, null, null, null, 'texto', null, folderId, null, null, null, 'unknown', 'staging', null, false],
      '11. Written Memory with folder_id rejected');

    // 12. empty/blank written_text rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', null, null, null, null, '   ', null, null, null, null, null, 'unknown', 'staging', null, false],
      '12. blank written_text rejected');

    // ============ BINARY REJECTIONS ============

    // 13. binary content sin mime rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', null, 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, null, null, 'unknown', 'staging', null, false],
      '13. binary content without mime rejected');

    // 14. binary content sin path rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, null,
       null, null, null, null, null, null, 'unknown', 'staging', null, false],
      '14. binary content without original_storage_path rejected');

    // 15. binary content sin size rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', null, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, null, null, 'unknown', 'staging', null, false],
      '15. binary content without size_bytes rejected');

    // ============ SEMANTIC DATE MATRIX ============

    // 16. unknown: todo null (ya cubierto arriba; caso dedicado binary memory).
    await insertOk(client, contentsSql,
      [householdId, 'memory', `m-unk-${runId}`, 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, null, null, 'unknown', 'staging', null, false],
      '16. unknown date: all components NULL is valid');

    // 17. year: year solamente (binary memory).
    await insertOk(client, contentsSql,
      [householdId, 'memory', `m-year-${runId}`, 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, 2019, null, 'year', 'staging', null, false],
      '17. year precision: captured_year only is valid');

    // 17b. Written Memory with year precision is valid too.
    await insertOk(client, contentsSql,
      [householdId, 'memory', null, null, null, null, `nota year ${runId}`, null, null, null, 1995, null, 'year', 'staging', null, false],
      '17b. Written Memory with year precision is valid');

    // 18. month_year: year + month solamente.
    await insertOk(client, contentsSql,
      [householdId, 'memory', `m-my-${runId}`, 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, 2019, 7, 'month_year', 'staging', null, false],
      '18. month_year precision: year + month only is valid');

    // 19. exact: captured_at + matching year/month.
    const exactAt = '2020-04-15 10:30:00+00';
    await insertOk(client, contentsSql,
      [householdId, 'memory', `m-exact-${runId}`, 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, exactAt, 2020, 4, 'exact', 'staging', null, false],
      '19. exact precision: captured_at + matching components is valid');

    // 20. exact con year/month contradictorios rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, exactAt, 2019, 4, 'exact', 'staging', null, false],
      '20. exact with contradicting captured_year rejected');

    // 20b. exact with contradicting month.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, exactAt, 2020, 5, 'exact', 'staging', null, false],
      '20b. exact with contradicting captured_month rejected');

    // 21. year con month no-null rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, 2019, 7, 'year', 'staging', null, false],
      '21. year precision with non-null captured_month rejected');

    // 22. year con fake captured_at rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, '2019-01-01 00:00:00+00', 2019, null, 'year', 'staging', null, false],
      '22. year precision with fake captured_at rejected');

    // 23. month_year con captured_at rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, '2019-07-01 00:00:00+00', 2019, 7, 'month_year', 'staging', null, false],
      '23. month_year precision with captured_at rejected');

    // 24. unknown con cualquier componente rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, 2019, null, 'unknown', 'staging', null, false],
      '24. unknown precision with captured_year rejected');

    // 25. year/month fuera de rango rechazados.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, 0, null, 'year', 'staging', null, false],
      '25a. captured_year=0 rejected');
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, 10000, null, 'year', 'staging', null, false],
      '25b. captured_year=10000 rejected');
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, 2019, 13, 'month_year', 'staging', null, false],
      '25c. captured_month=13 rejected');

    // ============ ACTIVE RESOLVABLE ============

    // 26. active Written con uploaded_at NULL válido.
    const activeWritten = writtenMemory({ lifecycle: 'active' });
    await insertOk(client, contentsSql,
      [householdId, 'memory', null, null, null, null, activeWritten.written_text, null, null, null, null, null, 'unknown', 'active', null, false],
      '26. active Written Memory with uploaded_at NULL is valid');

    // 27. active binary sin uploaded_at rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, null, null, 'unknown', 'active', null, false],
      '27. active binary without uploaded_at rejected');

    // 28. active binary sin path rechazado.
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'm.jpg', 'image/jpeg', 100, null,
       null, null, null, null, null, null, 'unknown', 'active', '2024-01-01 00:00:00+00', false],
      '28. active binary without original_storage_path rejected');

    // ============ HIDDEN FROM RESURFACING ============

    // 29. hidden_from_resurfacing default false (omitimos la columna).
    const defaultHidden = await client.query(
      `insert into public.homecloud_contents
        (household_id, role, written_text, capture_precision, lifecycle)
       values ($1, 'memory', $2, 'unknown', 'staging')
       returning id, hidden_from_resurfacing`,
      [householdId, `default hidden ${runId}`],
    );
    record(defaultHidden.rows[0].hidden_from_resurfacing === false,
      '29. hidden_from_resurfacing defaults to false');
    // 29b. explicit true on a Memory persists.
    const explicitHidden = await insertContent(writtenMemory({ hidden_from_resurfacing: true }));
    record(explicitHidden?.hidden_from_resurfacing === true,
      '29b. hidden_from_resurfacing=true persists on a Memory');
    // 29c. hidden=true on a binary FILE rejected (Memory-model field only).
    await expectReject(client, contentsSql,
      [householdId, 'file', `f2-${runId}.txt`, 'text/plain', 12, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, null, null, 'unknown', 'staging', null, true],
      '29c. hidden_from_resurfacing=true rejected on a File');

    // ============ EXTRA PURITY / FILE INVARIANT ============

    // 30 (setup). Written with display_name rejected (purity).
    await expectReject(client, contentsSql,
      [householdId, 'memory', 'nota.txt', null, null, null, 'texto', null, null, null, null, null, 'unknown', 'staging', null, false],
      'ex. Written Memory with display_name rejected');

    // ex. Written with uploaded_at rejected (purity: no binary custody ever).
    await expectReject(client, contentsSql,
      [householdId, 'memory', null, null, null, null, 'texto', null, null, null, null, null, 'unknown', 'staging', '2024-01-01 00:00:00+00', false],
      'ex. Written Memory with uploaded_at rejected');

    // ex. File with captured fields rejected (file date invariant).
    await expectReject(client, contentsSql,
      [householdId, 'file', `f3-${runId}.txt`, 'text/plain', 12, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, 2019, null, 'year', 'staging', null, false],
      'ex. FILE with captured_year rejected (files never use captured dates)');

    // ex. blank display_name on binary rejected.
    await expectReject(client, contentsSql,
      [householdId, 'memory', '   ', 'image/jpeg', 100, `${householdId}/${randomUUID()}/original`,
       null, null, null, null, null, null, 'unknown', 'staging', null, false],
      'ex. blank display_name rejected (empty string is not a valid NULL substitute)');

    // ============ ALBUMS (N:M unchanged) ============

    // 30. Written Memory puede pertenecer a Album.
    if (writtenId) {
      await insertOk(client,
        'insert into public.homecloud_album_items (album_id, content_id) values ($1, $2)',
        [albumId, writtenId],
        '30. Written Memory can belong to an Album (role=memory trigger passes)');
    }

    // 31. File no puede pertenecer a Album.
    if (fileId) {
      await expectReject(client,
        'insert into public.homecloud_album_items (album_id, content_id) values ($1, $2)',
        [albumId, fileId],
        '31. FILE cannot belong to an Album (memory-only trigger)');
    }
  } finally {
    // Cleanup: household cascade removes contents/albums/folders/album_items.
    if (householdId) {
      await client.query('delete from public.households where id = $1', [householdId]).catch(() => {});
    }
    if (personId) {
      await client.query('delete from public.people where id = $1', [personId]).catch(() => {});
    }
    await client.end();
  }

  console.log(`\nHC4A2_SCHEMA_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC4A2_SCHEMA_TESTS=FAIL');
  } else {
    console.log('HC4A2_SCHEMA_TESTS=PASS');
  }
}

main().catch((error) => {
  console.error(`DATABASE_FAILURE: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
