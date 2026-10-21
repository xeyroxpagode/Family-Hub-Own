/**
 * ST-5 — MULTI-SELECT SHARE platform contract gate.
 *
 * Reads the INSTALLED TypeScript contracts of expo-sharing and React Native
 * Share and determines, definitively, whether ONE native share operation with
 * N attachments is expressible. This is the evidence behind
 * MULTI_SHARE_PLATFORM_BLOCKER: it must fail loud if a future SDK adds the
 * capability, and it pins that CURRENT never fakes N sequential sheets.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const sharingDts = read('front/mi-front-limpio/node_modules/expo-sharing/build/Sharing.d.ts');
const sharingTypesDts = read('front/mi-front-limpio/node_modules/expo-sharing/build/Sharing.types.d.ts');
const shareDts = read('front/mi-front-limpio/node_modules/react-native/Libraries/Share/Share.d.ts');
const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const shareModule = read('front/mi-front-limpio/services/homecloud/homecloudMemoryShare.ts');

let failed = 0;
async function check(label, fn) {
  try { await fn(); console.log(`PASS: ${label}`); }
  catch (error) { failed += 1; console.error(`FAIL: ${label}\n  ${error.message}`); }
}

(async () => {
  console.log('\n=== ST5 MULTISHARE PLATFORM CONTRACT ===');

  await check('installed expo-sharing shareAsync accepts EXACTLY ONE url string', () => {
    assert.match(sharingDts, /shareAsync\(url: string, options\?: SharingOptions\)/);
    assert.doesNotMatch(sharingDts, /shareAsync\(urls/i);
    assert.doesNotMatch(sharingDts, /Array<string>/);
  });

  await check('installed SharingOptions has NO multi-attachment field', () => {
    assert.match(sharingTypesDts, /export type SharingOptions = \{/);
    const window = sharingTypesDts.slice(
      sharingTypesDts.indexOf('export type SharingOptions'),
      sharingTypesDts.indexOf('export type ShareType'),
    );
    assert.doesNotMatch(window, /urls|files|attachments|Array</i);
  });

  await check('installed RN Share has NO files/urls array in ShareContent', () => {
    assert.match(shareDts, /url: string|message: string/);
    // `excludedActivityTypes?: Array<string>` lives in ShareOptions and is an
    // iOS exclusion list, NOT an attachments array. Only an actual multi-file
    // field would unblock N attachments.
    assert.doesNotMatch(shareDts, /files\??:/);
    assert.doesNotMatch(shareDts, /urls\??:/);
    assert.doesNotMatch(shareDts, /Array<(?:string|ShareContent)>.*(?:files|attachments)/i);
  });

  await check('CONCLUSION: one OS share with N attachments is NOT expressible with the installed APIs', () => {
    // The definitive gate. If this ever FAILS, an SDK upgrade added N-attachment
    // sharing and MULTI_SHARE_PLATFORM_BLOCKER must be revisited.
    const singleUrlOnly = /shareAsync\(url: string, options\?: SharingOptions\)/.test(sharingDts)
      && !/urls|files|attachments/i.test(sharingTypesDts.slice(
        sharingTypesDts.indexOf('export type SharingOptions'),
        sharingTypesDts.indexOf('export type ShareType'),
      ));
    assert.ok(singleUrlOnly, 'if this fails, N-attachment sharing became available — revisit the blocker');
    console.log('  -> MULTI_SHARE_PLATFORM_BLOCKER confirmed for the installed SDK');
  });

  await check('CURRENT does NOT fake multi-share with N sequential OS sheets', () => {
    const i = screen.indexOf('const shareMemories = useCallback');
    const window = screen.slice(i, i + 1600);
    assert.doesNotMatch(window, /for .*shareAsync|for .*Share\.share|\.map\(.*shareAsync/);
    assert.doesNotMatch(window, /forEach\(.*share/i);
  });

  await check('multi-select share reports the honest blocker copy, preserving selection and caller', () => {
    const i = screen.indexOf('const shareMemories = useCallback');
    const window = screen.slice(i, i + 1600);
    assert.match(window, /Compartir varios recuerdos aún no está disponible/);
    assert.doesNotMatch(window, /finishSelection\(\)/);
    assert.doesNotMatch(window, /setSelection\(cancelMemorySelection/);
  });

  await check('no silent ZIP of the selection', () => {
    assert.doesNotMatch(screen, /zip|Zip|ZIP/);
    assert.doesNotMatch(shareModule, /zip|Zip|ZIP/);
  });

  await check('signed URLs are never concatenated into a share payload', () => {
    assert.doesNotMatch(screen, /signedUrl.*join|join.*signedUrl/);
    assert.doesNotMatch(shareModule, /signedUrl.*join/);
  });

  await check('single binary share still works through the adapter (one attachment is supported)', () => {
    assert.match(shareModule, /Sharing\.shareAsync\(local\.uri/);
  });

  console.log(`\nST5_MULTISHARE_CONTRACT_RESULT fail=${failed}`);
  if (failed > 0) process.exitCode = 1;
})().catch((error) => { console.error('ST5 multishare contract tests crashed:', error); process.exitCode = 1; });
