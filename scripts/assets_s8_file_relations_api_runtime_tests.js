#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets <-> HomeCloud — S8-02 / S8-03 API + RUNTIME certification.
 *
 * LOCAL_RUNTIME_REQUIRED. Runs against the ISOLATED S8 stack (HpAssetsS8)
 * with the REAL backend, the REAL Supabase DB, the REAL HomeCloud service and
 * the REAL Assets idempotency store. Nothing is mocked.
 *
 * It NEVER resets, drops or truncates a shared database: every fixture is a
 * disposable household removed at the end of the script.
 *
 * Covered:
 *   S8-02  link / unlink / list for Asset, Record and Care.
 *   S8-03  POST /api/homecloud/contents/states.
 *   HC-01, HC-02, HC-03  attach an existing HomeCloud File.
 *   HC-07  duplicate attach is safe (no second row).
 *   HC-08  unlink touches the RELATION only.
 *   HC-09  trashed File  -> state 'trashed'.
 *   HC-10  restored File -> state 'available' again.
 *   HC-11  purged File   -> tombstone, state 'missing', file null.
 *   HC-12  assets.contribute=false -> 403 assets_forbidden.
 *   HC-13  File of another household -> 404 homecloud_content_not_found.
 *   HC-19  household isolation on the read model.
 *   HC-20  owner lifecycle rules (ARCHIVED / TRASH).
 *   Plus: idempotency conflict, in-flight lease, validation order,
 *   metadata ownership (no clone), no client policies / no client grants.
 */

const {
  loadS8RuntimeEnv,
  findFreePort,
  startBackend,
  waitForHealth,
  makeApi,
  createFixtureWorld,
  createRecorder,
} = require('./assets_s8_runtime_helpers');

const MARKER = `s8${Date.now().toString(36).slice(-6)}`;

const uuid = () => crypto.randomUUID();
const key = (prefix) => `${prefix}-${uuid()}`;

/**
 * Deep equality that ignores JSON key order.
 *
 * The idempotency store keeps the answer as JSONB, so Postgres normalizes the
 * key order of the stored body. The replay is still the SAME answer; only the
 * serialization order differs, so the comparison must be semantic.
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    return a.length === b.length && a.every((value, index) => deepEqual(value, b[index]));
  }
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  if (!keysA.every((k, index) => k === keysB[index])) return false;
  return keysA.every((k) => deepEqual(a[k], b[k]));
}

async function main() {
  const recorder = createRecorder('ASSETS_S8_API');
  const env = loadS8RuntimeEnv();
  const port = await findFreePort();
  const backend = startBackend(port, env);
  await waitForHealth(port, backend);
  const api = makeApi(port);
  const world = createFixtureWorld(env, MARKER);

  try {
    // ── Fixtures: household H1 with full capabilities ───────────────────────
    const user = await world.createAuthUser('owner');
    const person = await world.makePerson('owner', user.userId, 'Owner S8');
    const h1 = await world.makeHousehold('H1', person);
    await world.addMember(h1.id, person.id, 'coordinator');
    await world.setActiveHousehold(person.id, h1.id);
    await world.setGrants(h1.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
      'homecloud.view': { coordinator: true },
      'homecloud.contribute': { coordinator: true },
      'homecloud.organize': { coordinator: true },
      'homecloud.delete': { coordinator: true },
    });

    // Household H2 (another member, another household) for the isolation cases.
    const user2 = await world.createAuthUser('other');
    const person2 = await world.makePerson('other', user2.userId, 'Other S8');
    const h2 = await world.makeHousehold('H2', person2);
    await world.addMember(h2.id, person2.id, 'coordinator');
    await world.setActiveHousehold(person2.id, h2.id);
    await world.setGrants(h2.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
      'homecloud.view': { coordinator: true },
      'homecloud.contribute': { coordinator: true },
    });

    const assetA1 = await world.makeAsset(h1.id, 'Auto S8 A1');
    const assetA2 = await world.makeAsset(h1.id, 'Auto S8 A2');
    const recordR1 = await world.makeRecord(h1.id, 'WARRANTY', 'Garantía S8 R1');
    const careC1 = await world.makeCare(h1.id, assetA1.id, 'Revisión S8 C1');
    const fileF1 = await world.makeHomeCloudFile(h1.id, { displayName: 'factura.pdf', mimeType: 'application/pdf', extension: 'pdf', sizeBytes: 2048 });
    const fileF2 = await world.makeHomeCloudFile(h1.id, { displayName: 'contrato.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', sizeBytes: 4096 });
    const fileF3 = await world.makeHomeCloudFile(h1.id, { displayName: 'foto.png', mimeType: 'image/png', extension: 'png', sizeBytes: 8192 });
    const foreignFile = await world.makeHomeCloudFile(h2.id, { displayName: 'secreto.pdf', mimeType: 'application/pdf', extension: 'pdf' });

    // ══ HC-01 — attach an existing File to an Asset ════════════════════════
    {
      const linkKey = key('s8.link.a1');
      const res = await api('POST', '/assets/files/link', {
        token: user.token,
        idempotencyKey: linkKey,
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: fileF1.id },
      });
      recorder.record(res.status === 201, `HC-01 link Asset -> 201 (obtenido ${res.status})`);
      recorder.record(res.body?.duplicate === false, 'HC-01 la primerarelacion no es duplicada');
      recorder.record(res.body?.relation?.state === 'available', 'HC-01 la relacion nace disponible');
      recorder.record(res.body?.relation?.file?.display_name === 'factura.pdf', 'HC-01 el read model usa el nombre real del File');
      recorder.record(res.body?.relation?.file?.mime_type === 'application/pdf', 'HC-01 el read model usa el MIME real del File');

      const rows = await world.relationRows('assets_asset_files', h1.id);
      const active = rows.filter((r) => r.removed_at === null);
      recorder.record(active.length === 1, `HC-01 hay exactamente 1 fila activa en assets_asset_files (${active.length})`);
      recorder.record(active[0]?.file_id === fileF1.id, 'HC-01 la fila activa apunta al File correcto');
      recorder.record(active[0]?.created_by_member_id !== null, 'HC-01 la fila registra quien la creo');

      // The File is untouched in HomeCloud.
      const contents = await world.serviceClient.from('homecloud_contents').select('*').eq('id', fileF1.id).single();
      recorder.record(contents.data?.lifecycle === 'active', 'HC-01 el File sigue activo en HomeCloud');
      recorder.record(contents.data?.original_storage_path?.includes(contents.data.id), 'HC-01 el blob del File no fue duplicado ni movido');
    }

    // ══ HC-07 — duplicate attach is safe ═══════════════════════════════════
    {
      const res = await api('POST', '/assets/files/link', {
        token: user.token,
        idempotencyKey: key('s8.link.a1.dup'),
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: fileF1.id },
      });
      recorder.record(res.status === 200, `HC-07 link duplicado con key nueva -> 200 (obtenido ${res.status})`);
      recorder.record(res.body?.duplicate === true, 'HC-07 duplicate:true');

      const rows = await world.relationRows('assets_asset_files', h1.id);
      recorder.record(rows.filter((r) => r.removed_at === null).length === 1, 'HC-07 no se crea una segunda fila activa');

      // Same key + same payload -> replay of the stored answer.
      const replayKey = key('s8.link.replay');
      const first = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: replayKey,
        body: { owner_type: 'asset', owner_id: assetA2.id, file_id: fileF1.id },
      });
      const replay = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: replayKey,
        body: { owner_type: 'asset', owner_id: assetA2.id, file_id: fileF1.id },
      });
      recorder.record(first.status === 201, 'HC-07 el link con key propia crea la relacion');
      recorder.record(replay.status === 201, `HC-07 el replay con la misma key devuelve el mismo status (${replay.status})`);
      recorder.record(deepEqual(replay.body, first.body), 'HC-07 el replay devuelve exactamente la misma respuesta');
    }

    // ══ Idempotency: same key, different payload ═══════════════════════════
    {
      const conflictKey = key('s8.conflict');
      await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: conflictKey,
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: fileF2.id },
      });
      const conflict = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: conflictKey,
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: fileF3.id },
      });
      recorder.record(conflict.status === 409, `misma key con payload distinto -> 409 (obtenido ${conflict.status})`);
      recorder.record(conflict.body?.error?.code === 'idempotency_conflict', 'misma key con payload distinto -> idempotency_conflict');
    }

    // ══ Idempotency-Key required ════════════════════════════════════════════
    {
      const res = await api('POST', '/assets/files/link', {
        token: user.token,
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: fileF2.id },
      });
      recorder.record(res.status === 422, `sin Idempotency-Key -> 422 (obtenido ${res.status})`);
      recorder.record(res.body?.error?.code === 'idempotency_key_required', 'sin Idempotency-Key -> idempotency_key_required');
    }

    // ══ Validation order ════════════════════════════════════════════════════
    {
      const badType = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.v1'),
        body: { owner_type: 'invoice', owner_id: assetA1.id, file_id: fileF1.id },
      });
      recorder.record(badType.status === 400, `owner_type invalido -> 400 (obtenido ${badType.status})`);
      recorder.record(badType.body?.error?.code === 'assets_invalid_file_owner_type', 'owner_type invalido -> assets_invalid_file_owner_type');

      const badUuid = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.v2'),
        body: { owner_type: 'asset', owner_id: 'not-a-uuid', file_id: fileF1.id },
      });
      recorder.record(badUuid.status === 400, `UUID invalido -> 400 (obtenido ${badUuid.status})`);

      const extra = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.v3'),
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: fileF1.id, household_id: h2.id },
      });
      recorder.record(extra.status === 400, `campo no aceptado (household_id) -> 400 (obtenido ${extra.status})`);

      const unknownOwner = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.v4'),
        body: { owner_type: 'asset', owner_id: uuid(), file_id: fileF1.id },
      });
      recorder.record(unknownOwner.status === 404, `owner inexistente -> 404 (obtenido ${unknownOwner.status})`);
      recorder.record(unknownOwner.body?.error?.code === 'assets_file_owner_not_found', 'owner inexistente -> assets_file_owner_not_found');
    }

    // ══ HC-13 — a File of another household is invisible ════════════════════
    {
      const res = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.cross'),
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: foreignFile.id },
      });
      recorder.record(res.status === 404, `HC-13 File de H2 desde H1 -> 404 (obtenido ${res.status})`);
      recorder.record(res.body?.error?.code === 'homecloud_content_not_found', 'HC-13 File de H2 -> homecloud_content_not_found');
      const serialized = JSON.stringify(res.body ?? {});
      recorder.record(!serialized.includes('secreto'), 'HC-13 la respuesta NO filtra el nombre del File ajeno');
      recorder.record(!serialized.includes('secreto.pdf'), 'HC-13 la respuesta NO filtra el nombre del File ajeno (2)');
    }

    // ══ HC-02 — Record ════════════════════════════════════════════════════
    {
      const res = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.link.r1'),
        body: { owner_type: 'record', owner_id: recordR1.id, file_id: fileF1.id },
      });
      recorder.record(res.status === 201, `HC-02 link Record -> 201 (obtenido ${res.status})`);
      const rows = await world.relationRows('assets_record_files', h1.id);
      recorder.record(rows.filter((r) => r.removed_at === null).length === 1, 'HC-02 hay exactamente 1 fila activa en assets_record_files');

      const list = await api('GET', `/assets/records/${recordR1.id}/files`, { token: user.token });
      recorder.record(list.status === 200, `HC-02 GET files del Record -> 200 (obtenido ${list.status})`);
      recorder.record(Array.isArray(list.body?.files) && list.body.files.length === 1, 'HC-02 el read model del Record lista 1 archivo');
      recorder.record(list.body?.files?.[0]?.owner_type === 'record', 'HC-02 el read model declara owner_type=record');
      recorder.record(list.body?.files?.[0]?.file?.display_name === 'factura.pdf', 'HC-02 el read model usa el nombre real del File');
    }

    // ══ HC-03 — Care ═══════════════════════════════════════════════════════
    {
      const res = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.link.c1'),
        body: { owner_type: 'care', owner_id: careC1.id, file_id: fileF1.id },
      });
      recorder.record(res.status === 201, `HC-03 link Care -> 201 (obtenido ${res.status})`);
      const rows = await world.relationRows('assets_care_files', h1.id);
      recorder.record(rows.filter((r) => r.removed_at === null).length === 1, 'HC-03 hay exactamente 1 fila activa en assets_care_files');

      const list = await api('GET', `/assets/care/${careC1.id}/files`, { token: user.token });
      recorder.record(list.status === 200, `HC-03 GET files del Care -> 200 (obtenido ${list.status})`);
      recorder.record(list.body?.files?.length === 1, 'HC-03 el read model del Care lista 1 archivo');
      recorder.record(list.body?.files?.[0]?.owner_type === 'care', 'HC-03 el read model declara owner_type=care');
    }

    // ══ HC-08 — unlink touches the RELATION only ════════════════════════════
    {
      const before = await world.serviceClient.from('homecloud_contents').select('*').eq('id', fileF1.id).single();
      const res = await api('POST', '/assets/files/unlink', {
        token: user.token, idempotencyKey: key('s8.unlink.a1'),
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: fileF1.id },
      });
      recorder.record(res.status === 200, `HC-08 unlink -> 200 (obtenido ${res.status})`);
      recorder.record(res.body?.already_removed === false, 'HC-08 la primera relacion queda marcada como removida');

      const assetRows = await world.relationRows('assets_asset_files', h1.id);
      const a1Rows = assetRows.filter((r) => r.asset_id === assetA1.id && r.file_id === fileF1.id);
      recorder.record(a1Rows.length === 1, 'HC-08 la fila de la relacion NO se borra (queda el historico)');
      recorder.record(a1Rows[0]?.removed_at !== null, 'HC-08 removed_at queda seteado');
      recorder.record(a1Rows[0]?.removed_by_member_id !== null, 'HC-08 removed_by_member_id queda seteado');

      const recordRows = await world.relationRows('assets_record_files', h1.id);
      recorder.record(recordRows.filter((r) => r.removed_at === null).length === 1, 'HC-08 la relacion del Record sigue activa');

      const after = await world.serviceClient.from('homecloud_contents').select('*').eq('id', fileF1.id).single();
      recorder.record(after.data?.lifecycle === before.data?.lifecycle, 'HC-08 el File de HomeCloud NO cambia de lifecycle');
      recorder.record(after.data?.original_storage_path === before.data?.original_storage_path, 'HC-08 el File de HomeCloud NO se borra');

      // Repeated unlink is idempotent (never a 404).
      const repeat = await api('POST', '/assets/files/unlink', {
        token: user.token, idempotencyKey: key('s8.unlink.a1.repeat'),
        body: { owner_type: 'asset', owner_id: assetA1.id, file_id: fileF1.id },
      });
      recorder.record(repeat.status === 200, `HC-08 unlink repetido -> 200 (obtenido ${repeat.status})`);
      recorder.record(repeat.body?.already_removed === true, 'HC-08 unlink repetido -> already_removed:true');
    }

    // ══ HC-09 / HC-10 / HC-11 — the File lifecycle ═════════════════════════
    {
      await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.link.a2'),
        body: { owner_type: 'asset', owner_id: assetA2.id, file_id: fileF3.id },
      });

      // HC-09 — trash.
      await world.setHomeCloudLifecycle(fileF3.id, 'trashed');
      let list = await api('GET', `/assets/${assetA2.id}/files`, { token: user.token });
      let row = list.body?.files?.find((f) => f.file_id === fileF3.id);
      recorder.record(row?.state === 'trashed', `HC-09 el File en la papelera -> state 'trashed' (${row?.state})`);
      recorder.record(row?.file?.display_name === 'foto.png', 'HC-09 el metadata sigue disponible en la papelera');

      // HC-10 — restore.
      await world.setHomeCloudLifecycle(fileF3.id, 'active');
      list = await api('GET', `/assets/${assetA2.id}/files`, { token: user.token });
      row = list.body?.files?.find((f) => f.file_id === fileF3.id);
      recorder.record(row?.state === 'available', `HC-10 el File restaurado -> state 'available' (${row?.state})`);
      const rowsAfterRestore = await world.relationRows('assets_asset_files', h1.id);
      recorder.record(
        rowsAfterRestore.filter((r) => r.file_id === fileF3.id && r.removed_at === null).length === 1,
        'HC-10 la relacion nunca se rompio: no hace falta volver a adjuntar',
      );

      // HC-11 — purge (the File row physically disappears).
      await world.purgeHomeCloudFile(fileF3.id);
      list = await api('GET', `/assets/${assetA2.id}/files`, { token: user.token });
      row = list.body?.files?.find((f) => f.file_id === fileF3.id);
      recorder.record(row?.state === 'missing', `HC-11 el File purgado -> state 'missing' (${row?.state})`);
      recorder.record(row?.file === null, 'HC-11 el File purgado -> file = null');
      const rowsAfterPurge = await world.relationRows('assets_asset_files', h1.id);
      recorder.record(
        rowsAfterPurge.filter((r) => r.file_id === fileF3.id && r.removed_at === null).length === 1,
        'HC-11 la relacion sobrevive como tombstone (removed_at IS NULL)',
      );
      recorder.record(
        rowsAfterPurge.filter((r) => r.file_id === fileF3.id).length === 1,
        'HC-11 no se creo ni se borro ninguna fila extra',
      );
    }

    // ══ Metadata ownership — no clone ═══════════════════════════════════════
    {
      const before = await world.relationRows('assets_care_files', h1.id);
      const columns = Object.keys(before[0] ?? {});
      const forbidden = ['display_name', 'mime_type', 'extension', 'size_bytes', 'document_date', 'note', 'original_storage_path', 'preview_storage_path', 'lifecycle'];
      recorder.record(
        !columns.some((c) => forbidden.includes(c)),
        `la fila de relacion NO guarda metadata del File (${columns.join(', ')})`,
      );

      // A rename in HomeCloud must be visible in Assets after a refresh,
      // WITHOUT touching the relation row.
      await world.serviceClient.from('homecloud_contents').update({ display_name: 'renombrado.pdf' }).eq('id', fileF1.id);
      const list = await api('GET', `/assets/care/${careC1.id}/files`, { token: user.token });
      recorder.record(
        list.body?.files?.[0]?.file?.display_name === 'renombrado.pdf',
        'el rename de HomeCloud se ve en Assets sin tocar la fila de relacion',
      );
      const after = await world.relationRows('assets_care_files', h1.id);
      recorder.record(
        JSON.stringify(after[0]) === JSON.stringify(before[0]),
        'la fila de relacion no cambio al renombrar el File',
      );
    }

    // ══ HC-12 — assets.contribute = false ══════════════════════════════════
    {
      const h3 = await world.makeHousehold('H3', person);
      await world.addMember(h3.id, person.id, 'coordinator');
      await world.setActiveHousehold(person.id, h3.id);
      await world.setGrants(h3.id, {
        'assets.view': { coordinator: true },
        'assets.contribute': { coordinator: false },
        'homecloud.view': { coordinator: true },
      });
      const assetH3 = await world.makeAsset(h3.id, 'Auto S8 H3');
      const fileH3 = await world.makeHomeCloudFile(h3.id, { displayName: 'h3.pdf' });

      const res = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.nocontribute'),
        body: { owner_type: 'asset', owner_id: assetH3.id, file_id: fileH3.id },
      });
      recorder.record(res.status === 403, `HC-12 sin assets.contribute -> 403 (obtenido ${res.status})`);
      recorder.record(res.body?.error?.code === 'assets_forbidden', 'HC-12 sin assets.contribute -> assets_forbidden');
      const rows = await world.relationRows('assets_asset_files', h3.id);
      recorder.record(rows.length === 0, 'HC-12 no se creo ninguna relacion');

      await world.setActiveHousehold(person.id, h1.id);
    }

    // ══ HC-20 — owner lifecycle ════════════════════════════════════════════
    {
      const archived = await world.makeAsset(h1.id, 'Auto S8 ARCHIVED');
      const trashed = await world.makeAsset(h1.id, 'Auto S8 TRASH');
      await world.serviceClient.from('assets').update({
        lifecycle_status: 'ARCHIVED', archived_from: 'ACTIVE', archived_at: new Date().toISOString(),
      }).eq('id', archived.id);
      await world.serviceClient.from('assets').update({
        lifecycle_status: 'TRASH', trashed_from: 'ACTIVE', trashed_at: new Date().toISOString(),
      }).eq('id', trashed.id);

      const linkArchived = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.arch.link'),
        body: { owner_type: 'asset', owner_id: archived.id, file_id: fileF2.id },
      });
      recorder.record(linkArchived.status === 409, `HC-20 attach en ARCHIVED -> 409 (obtenido ${linkArchived.status})`);
      recorder.record(linkArchived.body?.error?.code === 'assets_file_attach_not_allowed', 'HC-20 attach en ARCHIVED -> assets_file_attach_not_allowed');

      const linkTrashed = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.trash.link'),
        body: { owner_type: 'asset', owner_id: trashed.id, file_id: fileF2.id },
      });
      recorder.record(linkTrashed.status === 409, `HC-20 attach en TRASH -> 409 (obtenido ${linkTrashed.status})`);
      recorder.record(linkTrashed.body?.error?.code === 'assets_file_attach_not_allowed', 'HC-20 attach en TRASH -> assets_file_attach_not_allowed');

      // Unlink in ARCHIVED is allowed; in TRASH it is blocked.
      await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.arch.link.ok'),
        body: { owner_type: 'asset', owner_id: assetA2.id, file_id: fileF2.id },
      });
      const unlinkArchived = await api('POST', '/assets/files/unlink', {
        token: user.token, idempotencyKey: key('s8.arch.unlink'),
        body: { owner_type: 'asset', owner_id: archived.id, file_id: fileF2.id },
      });
      recorder.record(unlinkArchived.status === 200, `HC-20 unlink en ARCHIVED -> 200 (obtenido ${unlinkArchived.status})`);

      const unlinkTrashed = await api('POST', '/assets/files/unlink', {
        token: user.token, idempotencyKey: key('s8.trash.unlink'),
        body: { owner_type: 'asset', owner_id: trashed.id, file_id: fileF2.id },
      });
      recorder.record(unlinkTrashed.status === 409, `HC-20 unlink en TRASH -> 409 (obtenido ${unlinkTrashed.status})`);
      recorder.record(unlinkTrashed.body?.error?.code === 'assets_file_unlink_not_allowed', 'HC-20 unlink en TRASH -> assets_file_unlink_not_allowed');

      // Viewing in TRASH is allowed.
      const viewTrashed = await api('GET', `/assets/${trashed.id}/files`, { token: user.token });
      recorder.record(viewTrashed.status === 200, `HC-20 ver en TRASH -> 200 (obtenido ${viewTrashed.status})`);
    }

    // ══ HC-19 — household isolation on the read model ═══════════════════════
    {
      const foreignAsset = await world.makeAsset(h2.id, 'Auto S8 H2');
      const res = await api('GET', `/assets/${foreignAsset.id}/files`, { token: user.token });
      recorder.record(res.status === 404, `HC-19 owner de H2 desde H1 -> 404 (obtenido ${res.status})`);
      recorder.record(res.body?.error?.code === 'assets_file_owner_not_found', 'HC-19 owner de H2 -> assets_file_owner_not_found');

      const linkForeign = await api('POST', '/assets/files/link', {
        token: user.token, idempotencyKey: key('s8.h2.owner'),
        body: { owner_type: 'asset', owner_id: foreignAsset.id, file_id: fileF1.id },
      });
      recorder.record(linkForeign.status === 404, `HC-19 attach sobre owner de H2 -> 404 (obtenido ${linkForeign.status})`);

      const unlinkForeign = await api('POST', '/assets/files/unlink', {
        token: user.token, idempotencyKey: key('s8.h2.unlink'),
        body: { owner_type: 'asset', owner_id: foreignAsset.id, file_id: fileF1.id },
      });
      recorder.record(unlinkForeign.status === 404, `HC-19 unlink sobre owner de H2 -> 404 (obtenido ${unlinkForeign.status})`);

      const h2Rows = await world.relationRows('assets_asset_files', h2.id);
      recorder.record(h2Rows.length === 0, 'HC-19 no se toco ninguna relacion de H2');
    }

    // ══ HC-14 — Core success + File operation failed: the Core survives ════
    {
      const created = await api('POST', '/assets/records', {
        token: user.token,
        idempotencyKey: key('s8.hc14'),
        body: { type: 'WARRANTY', title: 'Registro HC-14', asset_ids: [assetA1.id] },
      });
      recorder.record(created.status === 201, `HC-14 el Record se crea por la API (${created.status})`);
      const recordId = created.body?.record?.id;

      // The File operation FAILS: a File of another household is invisible.
      const failed = await api('POST', '/assets/files/link', {
        token: user.token,
        idempotencyKey: key('s8.hc14.link'),
        body: { owner_type: 'record', owner_id: recordId, file_id: foreignFile.id },
      });
      recorder.record(failed.status === 404, `HC-14 el attach de archivo falla (${failed.status})`);

      const stillThere = await api('GET', `/assets/records/${recordId}`, { token: user.token });
      recorder.record(stillThere.status === 200, 'HC-14 el Record SIGUE existiendo: el Core NUNCA hace rollback');
      const hc14Rows = await world.relationRows('assets_record_files', h1.id);
      recorder.record(
        hc14Rows.filter((r) => r.record_id === recordId).length === 0,
        'HC-14 no se creó ninguna relación',
      );

      // The retry touches ONLY the File step: the Core is not re-created.
      const retryLink = await api('POST', '/assets/files/link', {
        token: user.token,
        idempotencyKey: key('s8.hc14.link2'),
        body: { owner_type: 'record', owner_id: recordId, file_id: fileF1.id },
      });
      recorder.record(retryLink.status === 201, `HC-14 el reintento del archivo crea la relación (${retryLink.status})`);
      const afterRetry = await api('GET', `/assets/records/${recordId}`, { token: user.token });
      recorder.record(afterRetry.status === 200, 'HC-14 el Core sigue siendo el MISMO Record (no se re-crea)');
      const hc14Rows2 = await world.relationRows('assets_record_files', h1.id);
      recorder.record(
        hc14Rows2.filter((r) => r.record_id === recordId && r.removed_at === null).length === 1,
        'HC-14 el reintento deja exactamente 1 relación activa',
      );
    }

    // ══ HC-15 — File success + link response lost: replay, no duplicate ═════
    {
      const assetH15 = await world.makeAsset(h1.id, 'Auto S8 HC-15');
      const fileH15 = await world.makeHomeCloudFile(h1.id, { displayName: 'hc15.pdf' });
      const linkKey = key('s8.hc15');

      const first = await api('POST', '/assets/files/link', {
        token: user.token,
        idempotencyKey: linkKey,
        body: { owner_type: 'asset', owner_id: assetH15.id, file_id: fileH15.id },
      });
      recorder.record(first.status === 201, `HC-15 el link crea la relación (${first.status})`);

      // The response was lost: the retry uses the SAME key.
      const lost = await api('POST', '/assets/files/link', {
        token: user.token,
        idempotencyKey: linkKey,
        body: { owner_type: 'asset', owner_id: assetH15.id, file_id: fileH15.id },
      });
      recorder.record(lost.status === 201, `HC-15 el reintento con la misma key replayea (${lost.status})`);
      const hc15Rows = await world.relationRows('assets_asset_files', h1.id);
      recorder.record(
        hc15Rows.filter((r) => r.asset_id === assetH15.id && r.removed_at === null).length === 1,
        'HC-15 el reintento NO crea una segunda relación',
      );
      const hc15Files = await world.serviceClient
        .from('homecloud_contents')
        .select('id')
        .eq('household_id', h1.id)
        .eq('id', fileH15.id);
      recorder.record((hc15Files.data ?? []).length === 1, 'HC-15 el File NO se vuelve a subir');
    }

    // ══ S8-03 — the HomeCloud states batch ═════════════════════════════════
    {
      const res = await api('POST', '/homecloud/contents/states', {
        token: user.token, body: { ids: [fileF1.id, fileF2.id, foreignFile.id, uuid()] },
      });
      recorder.record(res.status === 200, `S8-03 states batch -> 200 (obtenido ${res.status})`);
      recorder.record(Array.isArray(res.body?.contents) && res.body.contents.length === 4, 'S8-03 devuelve una entrada por id solicitado');
      const byId = new Map(res.body.contents.map((c) => [c.id, c]));
      recorder.record(byId.get(fileF1.id)?.exists === true, 'S8-03 un File propio existe:true');
      recorder.record(byId.get(fileF1.id)?.lifecycle === 'active', 'S8-03 un File propio activo -> lifecycle active');
      recorder.record(byId.get(fileF1.id)?.display_name === 'renombrado.pdf', 'S8-03 proyecta el nombre real del File');
      recorder.record(byId.get(foreignFile.id)?.exists === false, 'S8-03 un File de H2 -> exists:false');
      recorder.record(byId.get(foreignFile.id)?.lifecycle === null, 'S8-03 un File de H2 -> lifecycle:null');
      recorder.record(byId.get(foreignFile.id)?.display_name === null, 'S8-03 un File de H2 -> display_name:null');
      const serialized = JSON.stringify(res.body);
      recorder.record(!serialized.includes('secreto'), 'S8-03 la respuesta NO filtra metadata de H2');

      const invalid = await api('POST', '/homecloud/contents/states', {
        token: user.token, body: { ids: ['no-es-uuid'] },
      });
      recorder.record(invalid.status === 400, `S8-03 id invalido -> 400 (obtenido ${invalid.status})`);
      recorder.record(invalid.body?.error?.code === 'validation_error', 'S8-03 id invalido -> validation_error');

      const tooMany = await api('POST', '/homecloud/contents/states', {
        token: user.token, body: { ids: Array.from({ length: 201 }, () => uuid()) },
      });
      recorder.record(tooMany.status === 400, `S8-03 mas de 200 ids -> 400 (obtenido ${tooMany.status})`);

      const noAuth = await api('POST', '/homecloud/contents/states', { body: { ids: [fileF1.id] } });
      recorder.record(noAuth.status === 401, `S8-03 sin token -> 401 (obtenido ${noAuth.status})`);
    }

    // ══ Capability gates on the read model ═════════════════════════════════
    {
      const h4 = await world.makeHousehold('H4', person);
      await world.addMember(h4.id, person.id, 'coordinator');
      await world.setActiveHousehold(person.id, h4.id);
      await world.setGrants(h4.id, {
        'assets.view': { coordinator: true },
        'assets.contribute': { coordinator: true },
        'homecloud.view': { coordinator: false },
      });
      const assetH4 = await world.makeAsset(h4.id, 'Auto S8 H4');
      const res = await api('GET', `/assets/${assetH4.id}/files`, { token: user.token });
      recorder.record(res.status === 403, `sin homecloud.view la seccion de archivos no se renderiza -> 403 (obtenido ${res.status})`);
      recorder.record(res.body?.error?.code === 'homecloud_forbidden', 'sin homecloud.view -> homecloud_forbidden');

      const states = await api('POST', '/homecloud/contents/states', {
        token: user.token, body: { ids: [fileF1.id] },
      });
      recorder.record(states.status === 403, `states batch sin homecloud.view -> 403 (obtenido ${states.status})`);

      await world.setActiveHousehold(person.id, h1.id);
    }

    // ══ No client policies / no client grants ═══════════════════════════════
    {
      const { data: session, error: signInError } = await world.anonClient.auth.signInWithPassword({
        email: user.email,
        password: 'dummy12345',
      });
      recorder.record(!signInError, 'el cliente anon puede autenticarse (para la prueba de RLS)');
      if (session?.session?.access_token) {
        const { createClient } = require('@supabase/supabase-js');
        const userScoped = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
        });
        const rel = await userScoped.from('assets_asset_files').select('*').limit(5);
        recorder.record((rel.data ?? []).length === 0, 'el frontend NO puede leer la tabla de relaciones directamente');
        const relWrite = await userScoped.from('assets_asset_files').insert({
          household_id: h1.id, asset_id: assetA1.id, file_id: fileF1.id,
        }).select('*');
        recorder.record((relWrite.data ?? []).length === 0 && Boolean(relWrite.error), 'el frontend NO puede escribir la tabla de relaciones directamente');
        const hc = await userScoped.from('homecloud_contents').select('*').limit(5);
        recorder.record((hc.data ?? []).length === 0, 'el frontend NO puede leer homecloud_contents directamente');
      }
    }
  } finally {
    await world.destroy();
    backend.child.kill();
  }

  recorder.finish('ASSETS_S8_FILE_RELATIONS_API');
}

main().catch((error) => {
  console.error('[assets_s8_file_relations_api_runtime_tests] ERROR', error);
  process.exitCode = 1;
});
