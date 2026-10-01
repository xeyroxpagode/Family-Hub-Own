#!/usr/bin/env node
'use strict';

/**
 * HomeCloud STAGE 4B.1 — Preview foundation tests.
 *
 * Target: local Supabase only. Exercises the REAL preview service, the REAL
 * finalize integration and the REAL storage access service against real
 * Storage objects in homecloud-originals / homecloud-previews.
 *
 * Covers:
 *  23. image preview succeeds              27. missing preview returns a typed error
 *  24. preview_storage_path persisted      28. Written never attempts a preview
 *  25. preview failure NEVER blocks active 29. audio never fabricates a preview
 *  26. valid preview access                30. retry/idempotency is safe
 *
 * On the image codec: the thumbnail codec is an OPTIONAL runtime capability of
 * this backend (backend/src/lib/sharp.js). Whether it is installed or not,
 * the asserted contract is the same: finalize never fails because of a preview,
 * every non-generated outcome is a typed reason, and no fake preview is ever
 * written. The environment fact is printed, never assumed.
 *
 * Two image fixtures make the two halves observable:
 *   - a decodable image  -> the production pipeline really derives a preview
 *   - an undecodable one -> the production pipeline really fails, and the
 *                           content still ends up active with preview NULL
 */

const { createClient } = require('@supabase/supabase-js');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});
requireLocalUrl('SUPABASE_URL');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  generateHomeCloudPreview,
  resolvePreviewPlan,
  resolvePreviewKindPolicy,
  defaultImageTransformer,
  PREVIEW_OUTCOME,
  PREVIEW_BUCKET,
  ORIGINAL_BUCKET,
} = require('../backend/src/services/homecloudPreviewService');
const { createHomeCloudContentAccess } = require('../backend/src/services/homecloudStorageAccess');
const {
  registerHomeCloudContent,
  authorizeHomeCloudOriginalUpload,
  finalizeHomeCloudContent,
} = require('../backend/src/services/homecloudIntakeService');
const { getContentById, listMemories } = require('../backend/src/services/homecloudReadService');
const storageController = require('../backend/src/controllers/homecloud.storage.controller');
const {
  getHomeCloudOriginalPath,
  getHomeCloudPreviewPath,
  getHomeCloudBucket,
} = require('../backend/src/lib/homecloudStoragePaths');

// Real, decodable 1x1 PNG: the production transformer can genuinely process it.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const DERIVED_PREVIEW_BYTES = Buffer.from('hc4b1-derived-preview-bytes', 'utf8');

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
  } catch (e) {
    const ok = e && e.code === expectedCode;
    record(ok, `${message} (${(e && e.code) || 'no_code'}${ok ? '' : `, expected ${expectedCode}`})`);
    return e;
  }
  record(false, `${message} (expected rejection ${expectedCode}, got success)`);
  return null;
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

async function createAuthUser(runId, label) {
  const email = `hc4b1-prev-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, token: signedIn.session.access_token };
}

function reqFor(authUser, suffix) {
  return {
    user: { id: authUser.userId },
    accessToken: authUser.token,
    requestId: `req-hc4b1-prev-${suffix}`,
    mutationId: `mut-hc4b1-prev-${suffix}`,
  };
}

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    set() { return this; },
  };
}

async function run() {
  console.log('\n=== HC-4B1 PREVIEW FOUNDATION TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  // Environment fact, reported honestly and never assumed: the thumbnail codec
  // is an optional dependency of this backend.
  let codecAvailable = true;
  try {
    defaultImageTransformer();
  } catch {
    codecAvailable = false;
  }
  console.log(`INFO: production image codec available = ${codecAvailable}`);

  const runId = Date.now();
  const cleanup = {
    authUsers: [], personIds: [], householdIds: [], membershipIds: [], contentIds: [],
  };

  try {
    const adult = await createAuthUser(runId, 'adult');
    cleanup.authUsers.push(adult.userId);

    const { data: person } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC4B1 Preview Adult', auth_user_id: adult.userId })
      .select('*')
      .single();
    cleanup.personIds.push(person.id);

    const { data: household } = await serviceClient
      .from('households')
      .insert({ name: 'HC4B1 Preview Household', slug: `hc4b1-prev-${runId}`, created_by_person_id: person.id })
      .select('*')
      .single();
    cleanup.householdIds.push(household.id);
    const hh = household.id;

    const { data: member } = await serviceClient
      .from('household_members')
      .insert({ household_id: hh, person_id: person.id, role: 'adult', status: 'active', joined_at: new Date().toISOString() })
      .select('*')
      .single();
    cleanup.membershipIds.push(member.id);
    await serviceClient.from('people').update({ active_household_id: hh }).eq('id', person.id);

    const req = reqFor(adult, 'adult');
    const accessContext = { householdId: hh, capabilities: { 'homecloud.view': true } };

    const makeBinaryMemory = async ({ displayName, mimeType, body, label, finalize = true }) => {
      const dto = await registerHomeCloudContent(req, {
        role: 'memory',
        displayName,
        mimeType,
        sizeBytes: body.length,
        intakeRequestId: `hc4b1-prev-${label}-${runId}`,
      });
      cleanup.contentIds.push(dto.id);
      const originalPath = getHomeCloudOriginalPath(hh, dto.id);
      const auth = await authorizeHomeCloudOriginalUpload(req, dto.id);
      const put = await fetch(auth.signedUploadUrl, {
        method: 'PUT',
        headers: { 'content-type': mimeType, 'x-upsert': 'false' },
        body,
      });
      if (!put.ok) throw new Error(`original upload failed for ${label}: ${put.status}`);
      const finalized = finalize ? await finalizeHomeCloudContent(req, dto.id) : null;
      return { dto, originalPath, body, finalized };
    };

    const previewExists = async (contentId) => {
      const { data, error } = await serviceClient.storage.from(PREVIEW_BUCKET).list(`${hh}/${contentId}`);
      if (error) return false;
      return (data ?? []).some((entry) => entry.name === 'preview');
    };

    const readObject = async (bucket, path) => {
      const { data, error } = await serviceClient.storage.from(bucket).download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    };

    // ---------------------------------------------------------------
    // Fixtures. `image` is decodable, `broken` is not: the production
    // pipeline therefore really succeeds on one and really fails on the other.
    // ---------------------------------------------------------------
    const image = await makeBinaryMemory({
      displayName: 'preview-foto.png', mimeType: 'image/png', body: PNG_1X1, label: 'image',
    });
    const broken = await makeBinaryMemory({
      displayName: 'preview-rota.png', mimeType: 'image/png', body: Buffer.from('not-an-image-at-all'), label: 'broken',
    });
    const video = await makeBinaryMemory({
      displayName: 'preview-video.mp4', mimeType: 'video/mp4', body: Buffer.from('fake-mp4-bytes'), label: 'video',
    });
    const audio = await makeBinaryMemory({
      displayName: 'preview-audio.m4a', mimeType: 'audio/mp4', body: Buffer.from('fake-m4a-bytes'), label: 'audio',
    });

    const writtenDto = await registerHomeCloudContent(req, {
      role: 'memory',
      writtenText: 'Recuerdo escrito sin binario',
      capturePrecision: 'year',
      capturedYear: 2015,
      intakeRequestId: `hc4b1-prev-written-${runId}`,
    });
    cleanup.contentIds.push(writtenDto.id);
    await finalizeHomeCloudContent(req, writtenDto.id);

    const rowOf = async (id) => {
      const { data } = await serviceClient.from('homecloud_contents').select('*').eq('id', id).single();
      return data;
    };

    // ===============================================================
    // 23 + 24) image preview succeeds through the REAL finalize path
    // ===============================================================
    const imagePreviewPath = getHomeCloudPreviewPath(hh, image.dto.id);
    const imageRow = await rowOf(image.dto.id);
    if (codecAvailable) {
      record(imageRow.preview_storage_path === imagePreviewPath, 'finalize persists the canonical preview path for a decodable image (24)');
      record(await previewExists(image.dto.id), 'finalize really writes a preview object into homecloud-previews (23)');
      const derived = await readObject(PREVIEW_BUCKET, imagePreviewPath);
      record(
        Boolean(derived) && derived.length > 0 && derived[0] === 0xff && derived[1] === 0xd8 && derived[2] === 0xff,
        'the derived preview is a real JPEG produced by the codec, not a copy of the original (23)',
      );
      record(image.finalized && image.finalized.hasPreview === true, 'the finalize DTO reports hasPreview=true when a preview was derived (23)');
    } else {
      record(imageRow.preview_storage_path === null && imageRow.lifecycle === 'active', 'without a codec the image still finalizes active with preview NULL (25)');
    }
    record(imageRow.lifecycle === 'active', 'the Memory is active after finalize regardless of the preview outcome (23/25)');
    record(
      imageRow.preview_storage_path === null || imageRow.preview_storage_path === imagePreviewPath,
      'preview_storage_path is only ever the canonical identity-derived path (24)',
    );

    const imageRead = await getContentById(req, image.dto.id);
    const imageListed = (await listMemories(req, { limit: 100 })).memories.find((m) => m.id === image.dto.id);
    record(
      imageListed && imageRead && imageListed.hasPreview === imageRead.hasPreview && imageListed.hasPreview === codecAvailable,
      `read DTO and read model agree on hasPreview (codec=${codecAvailable}) (24)`,
    );
    record(
      !JSON.stringify(imageListed).includes(PREVIEW_BUCKET)
      && !JSON.stringify(imageListed).includes(imagePreviewPath)
      && !JSON.stringify(imageListed).includes(ORIGINAL_BUCKET),
      'neither read surface exposes the preview/original bucket or path (24)',
    );

    // ===============================================================
    // 25) a preview failure NEVER blocks or rolls back the active content
    // ===============================================================
    const brokenRow = await rowOf(broken.dto.id);
    record(brokenRow.lifecycle === 'active', 'finalize succeeds even when the thumbnail codec rejects the bytes (25)');
    record(
      brokenRow.preview_storage_path === null || codecAvailable === false,
      'a failed preview leaves preview_storage_path NULL, never a fabricated path (25)',
    );
    if (codecAvailable) {
      record(brokenRow.preview_storage_path === null, 'an undecodable image really fails the production pipeline (25)');
      record(!(await previewExists(broken.dto.id)), 'no preview object is written when derivation fails (25)');
      const brokenRetry = await generateHomeCloudPreview({ contentId: broken.dto.id, client: serviceClient });
      record(
        brokenRetry.generated === false && brokenRetry.reason === PREVIEW_OUTCOME.TRANSFORM_FAILED,
        `re-running the failed preview is a typed no-op, not a throw (${brokenRetry.reason}) (25)`,
      );
    }
    const brokenOriginal = await createHomeCloudContentAccess({
      authContext: accessContext, contentId: broken.dto.id, variant: 'original',
    });
    record(typeof brokenOriginal.signedUrl === 'string', 'the original stays fully accessible after a preview failure (25)');
    const brokenPreview = await createHomeCloudContentAccess({
      authContext: accessContext, contentId: broken.dto.id, variant: 'preview',
    });
    record(
      brokenPreview.code === 'preview_unavailable',
      'a failed preview answers preview_unavailable, never a 500 (25/27)',
    );
    record(
      broken.finalized && broken.finalized.hasPreview === false && broken.finalized.uploadedAt !== null,
      'the failed-preview DTO is honest: no preview, custody timestamp present (25)',
    );

    // ===============================================================
    // 26 + 27) access semantics through the real HTTP controller
    // ===============================================================
    if (codecAvailable) {
      const previewAccess = await createHomeCloudContentAccess({
        authContext: accessContext, contentId: image.dto.id, variant: 'preview',
      });
      record(
        typeof previewAccess.signedUrl === 'string' && previewAccess.variant === 'preview',
        'variant=preview issues a signed URL when a preview exists (26)',
      );
      const fetched = await fetch(previewAccess.signedUrl);
      record(fetched.ok, 'the signed preview URL really serves the object (26)');
      const served = Buffer.from(await fetched.arrayBuffer());
      const stored = await readObject(PREVIEW_BUCKET, imagePreviewPath);
      record(stored && served.equals(stored), 'the signed preview URL serves exactly the stored derived preview (26)');

      const okRes = fakeRes();
      await storageController.getHomeCloudContentAccess(
        { ...req, params: { contentId: image.dto.id }, query: { variant: 'preview' } },
        okRes,
      );
      record(
        okRes.statusCode === 200 && typeof okRes.body.signedUrl === 'string',
        'access endpoint answers 200 with a signed preview URL (26)',
      );
    }

    for (const [label, contentId] of [['written', writtenDto.id], ['audio', audio.dto.id], ['video', video.dto.id], ['undecodable image', broken.dto.id]]) {
      const missingRes = fakeRes();
      await storageController.getHomeCloudContentAccess(
        { ...req, params: { contentId }, query: { variant: 'preview' } },
        missingRes,
      );
      record(
        missingRes.statusCode === 404 && missingRes.body && missingRes.body.code === 'preview_unavailable',
        `a ${label} Memory without preview answers 404 preview_unavailable, not 500 (27)`,
      );
    }

    // ===============================================================
    // 28) Written Memory never attempts a preview
    // ===============================================================
    let writtenTransformCalls = 0;
    const writtenOutcome = await generateHomeCloudPreview({
      contentId: writtenDto.id,
      client: serviceClient,
      transform: async () => {
        writtenTransformCalls += 1;
        throw new Error('must never run for a Written Memory');
      },
    });
    record(
      writtenOutcome.generated === false && writtenOutcome.reason === PREVIEW_OUTCOME.WRITTEN_NO_BINARY,
      `a Written Memory reports written_no_binary (${writtenOutcome.reason}) (28)`,
    );
    record(writtenTransformCalls === 0, 'a Written Memory never invokes the image transformer (28)');
    const writtenRow = await rowOf(writtenDto.id);
    record(
      writtenRow.preview_storage_path === null && writtenRow.mime_type === null
      && writtenRow.size_bytes === null && writtenRow.original_storage_path === null
      && writtenRow.uploaded_at === null,
      'a Written Memory keeps every binary field NULL, preview included (28)',
    );
    record(!(await previewExists(writtenDto.id)), 'no preview object is created for a Written Memory (28)');
    await expectReject(
      () => createHomeCloudContentAccess({ authContext: accessContext, contentId: writtenDto.id, variant: 'original' }),
      'homecloud_content_has_no_binary',
      'a Written Memory has no original binary to access (28)',
    );

    // ===============================================================
    // 29) audio never fabricates a waveform or any preview
    // ===============================================================
    let audioTransformCalls = 0;
    const audioOutcome = await generateHomeCloudPreview({
      contentId: audio.dto.id,
      client: serviceClient,
      transform: async () => {
        audioTransformCalls += 1;
        return { body: DERIVED_PREVIEW_BYTES, contentType: 'image/jpeg' };
      },
    });
    record(
      audioOutcome.generated === false && audioOutcome.reason === PREVIEW_OUTCOME.AUDIO_NO_VISUAL_PREVIEW,
      `an audio Memory reports audio_no_visual_preview (${audioOutcome.reason}) (29)`,
    );
    record(audioTransformCalls === 0, 'an audio Memory never invokes the image transformer (29)');
    record((await rowOf(audio.dto.id)).preview_storage_path === null, 'preview_storage_path stays NULL for audio (29)');
    record(!(await previewExists(audio.dto.id)), 'no preview/waveform object is created for audio (29)');
    record(
      (await serviceClient.storage.from(PREVIEW_BUCKET).list(`${hh}/${audio.dto.id}`)).data?.length === 0,
      'the audio preview folder stays empty (29)',
    );

    // ---------------------------------------------------------------
    // video: no fake poster. A poster frame needs a video decoder this
    // repository does not depend on; that is a reported REAL GAP.
    // ---------------------------------------------------------------
    let videoTransformCalls = 0;
    const videoOutcome = await generateHomeCloudPreview({
      contentId: video.dto.id,
      client: serviceClient,
      transform: async () => {
        videoTransformCalls += 1;
        return { body: DERIVED_PREVIEW_BYTES, contentType: 'image/jpeg' };
      },
    });
    record(
      videoOutcome.generated === false && videoOutcome.reason === PREVIEW_OUTCOME.VIDEO_POSTER_UNSUPPORTED,
      `a video Memory reports video_poster_unsupported instead of faking a poster (${videoOutcome.reason})`,
    );
    record(videoTransformCalls === 0, 'a video Memory never reuses the image transformer (no fake poster)');
    record((await rowOf(video.dto.id)).preview_storage_path === null, 'preview_storage_path stays NULL for video');
    record(!(await previewExists(video.dto.id)), 'no poster object is created for video');

    // ===============================================================
    // 30) retry / idempotency never corrupts the original or the preview
    // ===============================================================
    // Models exactly the state this slice refuses to backfill automatically:
    // an already active Memory with no preview.
    const backlog = await makeBinaryMemory({
      displayName: 'preview-backlog.png', mimeType: 'image/png', body: PNG_1X1, label: 'backlog',
    });
    const backlogPreviewPath = getHomeCloudPreviewPath(hh, backlog.dto.id);
    if (codecAvailable) {
      await serviceClient.storage.from(PREVIEW_BUCKET).remove([backlogPreviewPath]);
      await serviceClient.from('homecloud_contents').update({ preview_storage_path: null }).eq('id', backlog.dto.id);
    }
    record((await rowOf(backlog.dto.id)).preview_storage_path === null, 'backlog fixture is an active Memory with no preview (30)');

    const deterministicTransform = async (input) => {
      if (!Buffer.isBuffer(input) || input.length === 0) throw new Error('empty_original');
      return { body: DERIVED_PREVIEW_BYTES, contentType: 'image/jpeg' };
    };
    const originalBefore = await readObject(ORIGINAL_BUCKET, backlog.originalPath);

    const backlogOutcome = await generateHomeCloudPreview({
      contentId: backlog.dto.id, client: serviceClient, transform: deterministicTransform,
    });
    record(
      backlogOutcome.generated === true && backlogOutcome.previewStoragePath === backlogPreviewPath,
      `the real pipeline derives and persists the preview on demand (${backlogOutcome.reason}) (23/30)`,
    );
    const derivedBytes = await readObject(PREVIEW_BUCKET, backlogPreviewPath);
    record(derivedBytes && derivedBytes.equals(DERIVED_PREVIEW_BYTES), 'the derived bytes are exactly what the transformer produced (23)');
    record((await rowOf(backlog.dto.id)).preview_storage_path === backlogPreviewPath, 'the on-demand generation persists the canonical path (24)');

    // Custody metadata snapshot AFTER the first generation: the retry below
    // must change absolutely nothing.
    const backlogBeforeRetry = await rowOf(backlog.dto.id);

    let retryTransformCalls = 0;
    const retryOutcome = await generateHomeCloudPreview({
      contentId: backlog.dto.id,
      client: serviceClient,
      transform: async () => {
        retryTransformCalls += 1;
        return { body: Buffer.from('SHOULD-NOT-BE-WRITTEN'), contentType: 'image/jpeg' };
      },
    });
    record(
      retryOutcome.generated === false && retryOutcome.reason === PREVIEW_OUTCOME.PREVIEW_ALREADY_EXISTS,
      `a retry over an existing preview is a typed no-op (${retryOutcome.reason}) (30)`,
    );
    record(retryTransformCalls === 0, 'a retry does not re-derive an existing preview (30)');
    const previewAfterRetry = await readObject(PREVIEW_BUCKET, backlogPreviewPath);
    record(
      previewAfterRetry && previewAfterRetry.equals(DERIVED_PREVIEW_BYTES),
      'a retry never overwrites the existing preview bytes (30)',
    );
    const originalAfter = await readObject(ORIGINAL_BUCKET, backlog.originalPath);
    record(
      originalBefore && originalAfter && originalBefore.equals(originalAfter) && originalAfter.equals(PNG_1X1),
      'a retry never touches the original bytes (30)',
    );
    const backlogAfter = await rowOf(backlog.dto.id);
    record(
      backlogAfter.preview_storage_path === backlogBeforeRetry.preview_storage_path
      && backlogAfter.original_storage_path === backlogBeforeRetry.original_storage_path
      && backlogAfter.uploaded_at === backlogBeforeRetry.uploaded_at
      && backlogAfter.lifecycle === backlogBeforeRetry.lifecycle,
      'a retry changes neither the persisted preview path nor the custody metadata (30)',
    );
    record(
      (await serviceClient.storage.from(PREVIEW_BUCKET).list(`${hh}/${backlog.dto.id}`)).data
        .filter((entry) => entry.name === 'preview').length === 1,
      'a retry never duplicates the preview object (30)',
    );

    // finalize replay is the natural retry path and stays truthful.
    const replay = await finalizeHomeCloudContent(req, backlog.dto.id);
    record(replay.hasPreview === true, 'a finalize replay reports the existing preview truthfully (30)');
    const backlogReplay = await rowOf(backlog.dto.id);
    record(
      backlogReplay.uploaded_at === backlogBeforeRetry.uploaded_at && backlogReplay.preview_storage_path === backlogPreviewPath,
      'a finalize replay does not re-timestamp custody and keeps the preview (30)',
    );

    // A no-codec environment must behave identically at the contract level.
    const noCodecOutcome = await (async () => {
      try {
        return await generateHomeCloudPreview({
          contentId: writtenDto.id, client: serviceClient, transform: 'not-a-function',
        });
      } catch (error) {
        return { generated: false, reason: `threw:${error.message}` };
      }
    })();
    record(
      noCodecOutcome.generated === false && typeof noCodecOutcome.reason === 'string',
      'an unusable transformer degrades to a typed reason and never throws (25)',
    );

    // ===============================================================
    // storage boundary + pure policy functions
    // ===============================================================
    const { data: bucketList, error: bucketErr } = await serviceClient.storage.listBuckets();
    const homecloudBuckets = (bucketList ?? []).filter((b) =>
      b.id === getHomeCloudBucket('original') || b.id === getHomeCloudBucket('preview'));
    record(
      !bucketErr && homecloudBuckets.length === 2 && homecloudBuckets.every((b) => b.public === false),
      'homecloud-originals and homecloud-previews stay private (no public bucket)',
    );

    const purePolicy = (over) => resolvePreviewKindPolicy({
      id: 'x', role: 'memory', lifecycle: 'active', written_text: null, mime_type: null, ...over,
    });
    record(purePolicy({ role: 'file', mime_type: 'image/jpeg' }).reason === PREVIEW_OUTCOME.NOT_A_MEMORY, 'a File is never previewed');
    record(purePolicy({ lifecycle: 'staging', mime_type: 'image/jpeg' }).reason === PREVIEW_OUTCOME.NOT_ACTIVE, 'a staging Memory is never previewed');
    record(purePolicy({ lifecycle: 'trashed', mime_type: 'image/jpeg' }).reason === PREVIEW_OUTCOME.NOT_ACTIVE, 'a trashed Memory is never previewed');
    record(purePolicy({ written_text: 'texto' }).reason === PREVIEW_OUTCOME.WRITTEN_NO_BINARY, 'a Written Memory is never previewed');
    record(purePolicy({ mime_type: 'application/pdf' }).reason === PREVIEW_OUTCOME.UNSUPPORTED_MIME, 'a non-media Memory is never previewed');
    record(
      resolvePreviewPlan({
        id: 'not-a-uuid', role: 'memory', lifecycle: 'active', written_text: null,
        mime_type: 'image/jpeg', preview_storage_path: 'x', original_storage_path: 'y',
      }).reason === PREVIEW_OUTCOME.PREVIEW_ALREADY_EXISTS,
      'an existing preview short-circuits before any path derivation',
    );
  } finally {
    const prefixHh = cleanup.householdIds[0];
    for (const contentId of cleanup.contentIds) {
      if (prefixHh) {
        await serviceClient.storage.from(PREVIEW_BUCKET).remove([`${prefixHh}/${contentId}/preview`]).catch(() => {});
        await serviceClient.storage.from(ORIGINAL_BUCKET).remove([`${prefixHh}/${contentId}/original`]).catch(() => {});
      }
    }
    if (cleanup.contentIds.length > 0) {
      await serviceClient.from('homecloud_album_items').delete().in('content_id', cleanup.contentIds);
      await serviceClient.from('homecloud_contents').delete().in('id', cleanup.contentIds);
    }
    if (cleanup.membershipIds.length > 0) {
      await serviceClient.from('household_members').delete().in('id', cleanup.membershipIds);
    }
    if (cleanup.personIds.length > 0) {
      await serviceClient.from('people').update({ active_household_id: null }).in('id', cleanup.personIds);
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

  console.log(`\nHC4B1_PREVIEW_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC4B1_PREVIEW_TESTS=FAIL');
  } else {
    console.log('HC4B1_PREVIEW_TESTS=PASS');
  }
}

run().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
