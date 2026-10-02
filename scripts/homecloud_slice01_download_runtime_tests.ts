import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateDownloadedFile } from '../front/mi-front-limpio/services/homecloud/homecloudDownloadPolicy.ts';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const download = read('front/mi-front-limpio/services/homecloud/homecloudDownloadService.ts');
const screen = read('front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx');
let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed += 1;
  console.log(`  PASS: ${name}`);
}

console.log('\n=== HOMECLOUD SLICE 01 DOWNLOAD RUNTIME RECOVERY ===\n');

// T1 server authority: signed URLs are used VERBATIM (no client host rewrite).
// Reachability is an environment contract (backend SUPABASE_URL), proven by
// S0 device QA on Cloudflare/Supabase. The rewrite helper is deleted.
test('no client-side signed-URL host rewrite exists', () => {
  assert.doesNotMatch(download, /normalizeSignedStorageUrlForRuntime/);
  assert.match(download, /access\.signedUrl/);
});

test('the signed-URL module is deleted (server authority)', () => {
  assert.equal(fs.existsSync(path.join(root, 'front/mi-front-limpio/services/homecloud/homecloudSignedUrl.ts')), false);
});

test('successful local result must exist and have positive size', () => {
  assert.deepEqual(
    validateDownloadedFile({ uri: 'file:///document/a.pdf', name: 'a.pdf', exists: true, size: 42 }),
    { uri: 'file:///document/a.pdf', name: 'a.pdf', sizeBytes: 42 },
  );
  assert.throws(() => validateDownloadedFile({ uri: 'file:///document/a.pdf', name: 'a.pdf', exists: false, size: 42 }));
  assert.throws(() => validateDownloadedFile({ uri: 'file:///document/a.pdf', name: 'a.pdf', exists: true, size: 0 }));
});

test('native file task remains the transfer and releases ownership', () => {
  assert.match(download, /File\.createDownloadTask/);
  assert.match(download, /await task\.downloadAsync\(\)/);
  assert.match(download, /task\.release\(\)/);
  assert.doesNotMatch(download, /arrayBuffer\(|base64|readAsStringAsync/);
});

test('share path receives the validated local URI', () => {
  assert.match(download, /Sharing\.isAvailableAsync\(\)/);
  assert.match(download, /Sharing\.shareAsync\(file\.uri/);
  assert.doesNotMatch(download, /Linking\.openURL/);
});

test('download instrumentation is safe and complete', () => {
  ['download_access_ok', 'download_start', 'download_complete', 'download_failed'].forEach((event) => assert.ok(download.includes(`'${event}'`), event));
  assert.doesNotMatch(download, /runtimeTrace\([^\n]*(signedUrl|accessToken|token)/);
});

test('download and share failures stay visible in File Info', () => {
  assert.match(screen, /downloadFeedback/);
  assert.match(screen, /No pudimos descargar este archivo\./);
  assert.match(screen, /No pudimos compartir este archivo\./);
  assert.match(screen, /Descargando…/);
  assert.match(screen, /Listo para compartir/);
});

console.log(`\nHOMECLOUD_SLICE01_DOWNLOAD_RUNTIME_RESULT pass=${passed} fail=0`);
