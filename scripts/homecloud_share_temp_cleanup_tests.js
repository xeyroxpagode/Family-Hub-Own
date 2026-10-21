/**
 * ST-5 — SHARE TEMP lifecycle + Files contract preservation.
 *
 * The Memories share adapter downloads to a bounded cache directory and cleans
 * it after success/failure/background/restart. `homecloudDownloadService` (used
 * by Files) is NOT modified: its Paths.document contract stays intact.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const share = read('front/mi-front-limpio/services/homecloud/homecloudMemoryShare.ts');
const filesScreen = read('front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx');
const downloadService = read('front/mi-front-limpio/services/homecloud/homecloudDownloadService.ts');
const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const packageJson = read('front/mi-front-limpio/package.json');

let failed = 0;
async function check(label, fn) {
  try { await fn(); console.log(`PASS: ${label}`); }
  catch (error) { failed += 1; console.error(`FAIL: ${label}\n  ${error.message}`); }
}

(async () => {
  console.log('\n=== ST5 SHARE TEMP CLEANUP ===');

  await check('expo-sharing and expo-file-system are the installed packages, nothing new', () => {
    assert.match(packageJson, /"expo-sharing"/);
    assert.match(packageJson, /"expo-file-system"/);
  });

  await check('share temporaries live under Paths.cache, never Documents', () => {
    assert.match(share, /Paths\.cache/);
    assert.doesNotMatch(share, /Paths\.document/);
  });

  await check('the share temp directory is bounded and named', () => {
    assert.match(share, /HomeCloudShareTemp/);
  });

  await check('cleanup runs in a finally: success, cancel and error all clean', () => {
    const i = share.indexOf('} finally {');
    const window = share.slice(i, i + 600);
    assert.match(window, /destination\.delete\(\)/);
    assert.match(window, /task\.release\(\)/);
  });

  await check('partial download failure still cleans (the finally wraps the transfer)', () => {
    const i = share.indexOf('const task = File.createDownloadTask');
    const j = share.indexOf('} finally {');
    assert.ok(i !== -1 && j > i, 'the download task must be inside the try guarded by the cleanup finally');
  });

  await check('AppState background sweeps share temporaries', () => {
    assert.match(share, /AppState\.addEventListener\('change'/);
    assert.match(share, /next !== 'active'/);
  });

  await check('stale share-temp recovery after restart: the lifecycle sweep runs on install', () => {
    assert.match(share, /export function installShareTempLifecycle\(\)/);
    assert.match(share, /sweepShareTempFiles\(\);\s*\n\s*const subscription/);
  });

  await check('the sweep is scoped STRICTLY to the share temp directory', () => {
    const i = share.indexOf('export function sweepShareTempFiles');
    const window = share.slice(i, i + 400);
    assert.match(window, /shareTempDirectory\(\)/);
    assert.match(share, /SHARE_TEMP_DIR_NAME = 'HomeCloudShareTemp'/);
    assert.doesNotMatch(window, /Paths\.document/);
    assert.doesNotMatch(window, /UploadJob|upload staging|shared recovery/i);
  });

  await check('the Memories screen installs the share temp lifecycle', () => {
    assert.match(screen, /useEffect\(\(\) => installShareTempLifecycle\(\), \[\]\)/);
  });

  await check('the original is fetched through the EXISTING access authority', () => {
    assert.match(share, /fetchHomeCloudContentAccess\(accessToken, memory\.id, 'original'\)/);
  });

  await check('the signed URL is never exposed to the share target', () => {
    const i = share.indexOf('Sharing.shareAsync');
    const window = share.slice(i, i + 200);
    assert.match(window, /local\.uri/);
    assert.doesNotMatch(window, /access\.signedUrl/);
  });

  await check('the Files download contract is UNCHANGED: homecloudDownloadService still uses Paths.document', () => {
    assert.match(downloadService, /Paths\.document, 'HomeCloud'/);
    assert.match(filesScreen, /downloadHomeCloudOriginal/);
    assert.match(filesScreen, /shareHomeCloudDownloadedFile/);
  });

  await check('Files behavior did not change: its screen was not touched by ST-5', () => {
    // The Files screen consumes the SAME service with the SAME call shape it
    // always had. ST-5 must not appear in it.
    assert.doesNotMatch(filesScreen, /shareMemoryBinary|homecloudMemoryShare/);
  });

  await check('no share temp file is persisted as a user document', () => {
    assert.doesNotMatch(share, /MediaLibrary|assets\/|saveToLibrary/i);
  });

  console.log(`\nST5_SHARE_TEMP_CLEANUP_RESULT fail=${failed}`);
  if (failed > 0) process.exitCode = 1;
})().catch((error) => { console.error('ST5 share temp cleanup tests crashed:', error); process.exitCode = 1; });
