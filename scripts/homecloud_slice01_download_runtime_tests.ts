import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateDownloadedFile } from '../front/mi-front-limpio/services/homecloud/homecloudDownloadPolicy.ts';
import { normalizeSignedStorageUrlForRuntime } from '../front/mi-front-limpio/services/homecloud/homecloudSignedUrl.ts';

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

test('localhost signed origin is normalized', () => {
  assert.equal(
    normalizeSignedStorageUrlForRuntime('http://localhost:56221/storage/v1/object/sign/a?token=x', 'http://192.168.0.26:56221'),
    'http://192.168.0.26:56221/storage/v1/object/sign/a?token=x',
  );
});

test('127.0.0.1 signed origin is normalized', () => {
  assert.equal(
    normalizeSignedStorageUrlForRuntime('http://127.0.0.1:56221/storage/v1/object/sign/a?token=x', 'http://192.168.0.26:56221'),
    'http://192.168.0.26:56221/storage/v1/object/sign/a?token=x',
  );
});

test('remote hosted signed URL remains unchanged', () => {
  const remote = 'https://storage.example.com/storage/v1/object/sign/a?token=x';
  assert.equal(normalizeSignedStorageUrlForRuntime(remote, 'http://192.168.0.26:56221'), remote);
});

test('encoded pathname is preserved byte-for-byte', () => {
  const source = 'http://127.0.0.1:56221/storage/v1/object/sign/a%2Fb/%E2%9C%93';
  const normalized = normalizeSignedStorageUrlForRuntime(source, 'http://192.168.0.26:56221');
  assert.equal(normalized.slice('http://192.168.0.26:56221'.length), source.slice('http://127.0.0.1:56221'.length));
});

test('signed query is preserved byte-for-byte', () => {
  const suffix = '/storage/v1/object/sign/a?token=a%2Bb%2F%3D&x=one+two&x=three';
  assert.equal(
    normalizeSignedStorageUrlForRuntime(`http://localhost:56221${suffix}`, 'http://192.168.0.26:56221'),
    `http://192.168.0.26:56221${suffix}`,
  );
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
