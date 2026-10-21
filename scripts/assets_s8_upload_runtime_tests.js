#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets <-> HomeCloud — S8-05 / S8-09 runtime: REAL upload + attach.
 *
 * LOCAL_RUNTIME_REQUIRED. Runs against the ISOLATED S8 stack with the REAL
 * backend, the REAL Supabase DB, the REAL HomeCloud storage and the REAL
 * Assets idempotency store. Nothing is mocked.
 *
 * The upload goes through the canonical HomeCloud path, byte by byte:
 *
 *   1. POST /api/homecloud/register          (intakeRequestId pineado)
 *   2. POST /api/homecloud/content/:id/upload (signed upload URL)
 *   3. PUT  <signed upload URL>               (los bytes reales)
 *   4. POST /api/homecloud/content/:id/verify
 *   5. POST /api/homecloud/content/:id/finalize
 *   6. POST /api/assets/files/link
 *
 * It proves:
 *   HC-04  un archivo nuevo termina como UN content row activo y UNA relación.
 *   HC-16  la MISMA intakeRequestId resuelve al MISMO contentId (nunca un
 *          segundo File).
 *   HC-17  un outcome desconocido se reconcilia por contentId: no se sube de
 *          nuevo y no queda ni un File ni una relación duplicados.
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

const MARKER = `s8u${Date.now().toString(36).slice(-6)}`;
const uuid = () => crypto.randomUUID();
const key = (prefix) => `${prefix}-${uuid()}`;

/** A deterministic local fixture file (a tiny, valid PDF). */
const FIXTURE_FILE = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8',
);

async function uploadFile(api, token, { intakeRequestId, displayName, mimeType, bytes }) {
  const register = await api('POST', '/homecloud/register', {
    token,
    body: {
      role: 'file',
      displayName,
      mimeType,
      sizeBytes: bytes.length,
      extension: 'pdf',
      intakeRequestId,
      folderId: null,
    },
  });
  if (register.status !== 201) {
    return { ok: false, stage: 'register', response: register };
  }
  const contentId = register.body?.content?.id;

  // VERIFY-FIRST (the canonical resume path): if the File is already ACTIVE
  // there is nothing to upload again. The retry resolves to the SAME contentId.
  const existing = await api('GET', `/homecloud/content/${contentId}`, { token });
  if (existing.status === 200) {
    return { ok: true, contentId, resumed: true };
  }

  const authorize = await api('POST', `/homecloud/content/${contentId}/upload`, { token });
  if (authorize.status !== 200) {
    return { ok: false, stage: 'authorize', response: authorize, contentId };
  }

  const signed = authorize.body?.signedUploadUrl;
  const put = await fetch(signed, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType, 'x-upsert': 'false' },
    body: bytes,
  });
  if (!put.ok) {
    return { ok: false, stage: 'put', status: put.status, contentId };
  }

  const verify = await api('POST', `/homecloud/content/${contentId}/verify`, { token });
  if (verify.status !== 200 || verify.body?.verified !== true) {
    return { ok: false, stage: 'verify', response: verify, contentId };
  }

  const finalize = await api('POST', `/homecloud/content/${contentId}/finalize`, { token });
  if (finalize.status !== 200) {
    return { ok: false, stage: 'finalize', response: finalize, contentId };
  }

  return { ok: true, contentId };
}

async function main() {
  const recorder = createRecorder('ASSETS_S8_UPLOAD');
  const env = loadS8RuntimeEnv();
  const port = await findFreePort();
  const backend = startBackend(port, env);
  await waitForHealth(port, backend);
  const api = makeApi(port);
  const world = createFixtureWorld(env, MARKER);

  try {
    const user = await world.createAuthUser('uploader');
    const person = await world.makePerson('uploader', user.userId, 'Uploader S8');
    const household = await world.makeHousehold('UPLOAD', person);
    await world.addMember(household.id, person.id, 'coordinator');
    await world.setActiveHousehold(person.id, household.id);
    await world.setGrants(household.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
      'homecloud.view': { coordinator: true },
      'homecloud.contribute': { coordinator: true },
    });

    const asset = await world.makeAsset(household.id, 'Auto S8 Upload');

    // ══ HC-04 — register -> upload -> verify -> finalize -> link ═══════════
    const intakeRequestId = `intake_assets_attach_${key('s8.up')}`;
    const upload = await uploadFile(api, user.token, {
      intakeRequestId,
      displayName: 'factura.pdf',
      mimeType: 'application/pdf',
      bytes: FIXTURE_FILE,
    });
    recorder.record(upload.ok, `HC-04 el upload real por HomeCloud funcionó (${upload.ok ? 'ok' : upload.stage})`);
    if (!upload.ok) {
      console.error(JSON.stringify(upload.response ?? upload, null, 2));
      throw new Error('ASSETS_S8_UPLOAD_SETUP_FAILED');
    }
    const contentId = upload.contentId;

    const contents = await world.serviceClient
      .from('homecloud_contents')
      .select('id, lifecycle, display_name, size_bytes, intake_request_id')
      .eq('household_id', household.id);
    recorder.record((contents.data ?? []).length === 1, `HC-04 HomeCloud tiene exactamente 1 content row (${(contents.data ?? []).length})`);
    recorder.record(contents.data?.[0]?.lifecycle === 'active', 'HC-04 el content row quedó activo');
    recorder.record(contents.data?.[0]?.size_bytes === FIXTURE_FILE.length, 'HC-04 el tamaño real del archivo coincide');

    const linkKey = key('s8.up.link');
    const link = await api('POST', '/assets/files/link', {
      token: user.token,
      idempotencyKey: linkKey,
      body: { owner_type: 'asset', owner_id: asset.id, file_id: contentId },
    });
    recorder.record(link.status === 201, `HC-04 el link Assets -> 201 (obtenido ${link.status})`);
    const relations = await world.relationRows('assets_asset_files', household.id);
    recorder.record(relations.filter((r) => r.removed_at === null).length === 1, 'HC-04 hay exactamente 1 relación activa');

    // ══ HC-16 — la misma intakeRequestId resuelve al MISMO contentId ═══════
    const again = await uploadFile(api, user.token, {
      intakeRequestId,
      displayName: 'factura.pdf',
      mimeType: 'application/pdf',
      bytes: FIXTURE_FILE,
    });
    recorder.record(again.ok, 'HC-16 el reintento del intake completa');
    recorder.record(again.contentId === contentId, `HC-16 la misma intakeRequestId resuelve al mismo contentId (${again.contentId})`);
    recorder.record(again.resumed === true, 'HC-16 el reintento NO vuelve a subir: el File ya estaba activo');
    const contentsAfter = await world.serviceClient
      .from('homecloud_contents')
      .select('id')
      .eq('household_id', household.id);
    recorder.record((contentsAfter.data ?? []).length === 1, `HC-16 NO se registró un segundo File (${(contentsAfter.data ?? []).length})`);

    // ══ HC-17 — outcome desconocido: reconciliar, nunca volver a subir ══════
    // El link se ejecutó pero la respuesta se perdió: se reintenta con la
    // MISMA key y no debe aparecer una segunda relación.
    const replay = await api('POST', '/assets/files/link', {
      token: user.token,
      idempotencyKey: linkKey,
      body: { owner_type: 'asset', owner_id: asset.id, file_id: contentId },
    });
    recorder.record(replay.status === 201, `HC-17 el replay con la misma key devuelve el status original (${replay.status})`);
    const relationsAfterReplay = await world.relationRows('assets_asset_files', household.id);
    recorder.record(relationsAfterReplay.filter((r) => r.removed_at === null).length === 1, 'HC-17 el replay NO crea una segunda relación');

    // Reconciliación por contentId: leer el File y confirmar la relación.
    const read = await api('GET', `/homecloud/content/${contentId}`, { token: user.token });
    recorder.record(read.status === 200, `HC-17 el File se puede leer por contentId (${read.status})`);
    recorder.record(read.body?.content?.id === contentId, 'HC-17 el File reconciliado es el MISMO');
    const list = await api('GET', `/assets/${asset.id}/files`, { token: user.token });
    recorder.record(list.body?.files?.length === 1, 'HC-17 la relación sigue siendo exactamente una');
    recorder.record(list.body?.files?.[0]?.state === 'available', 'HC-17 el estado reconciliado es available');

    // ══ Un nuevo intento DELIBERADO usa una key nueva -> un File nuevo ═════
    const newIntake = `intake_assets_attach_${key('s8.up.new')}`;
    const fresh = await uploadFile(api, user.token, {
      intakeRequestId: newIntake,
      displayName: 'otro.pdf',
      mimeType: 'application/pdf',
      bytes: FIXTURE_FILE,
    });
    recorder.record(fresh.ok, 'el nuevo intento deliberado sube');
    recorder.record(fresh.contentId !== contentId, 'un intento nuevo produce un contentId nuevo');
    const contentsFinal = await world.serviceClient
      .from('homecloud_contents')
      .select('id')
      .eq('household_id', household.id);
    recorder.record((contentsFinal.data ?? []).length === 2, `el nuevo intento deja 2 Files en HomeCloud (${(contentsFinal.data ?? []).length})`);

    // ══ El nombre duplicado está permitido (HomeCloud no renombra) ═════════
    const sameName = await uploadFile(api, user.token, {
      intakeRequestId: `intake_assets_attach_${key('s8.up.dupname')}`,
      displayName: 'factura.pdf',
      mimeType: 'application/pdf',
      bytes: FIXTURE_FILE,
    });
    recorder.record(sameName.ok, 'un archivo con el mismo nombre se sube sin problema');
    const sameNameRows = await world.serviceClient
      .from('homecloud_contents')
      .select('display_name')
      .eq('household_id', household.id)
      .eq('display_name', 'factura.pdf');
    recorder.record((sameNameRows.data ?? []).length === 2, 'HomeCloud NO renombra ni deduplica por nombre');
  } finally {
    await world.destroy();
    backend.child.kill();
  }

  recorder.finish('ASSETS_S8_UPLOAD');
}

main().catch((error) => {
  console.error('[assets_s8_upload_runtime_tests] ERROR', error);
  process.exitCode = 1;
});
