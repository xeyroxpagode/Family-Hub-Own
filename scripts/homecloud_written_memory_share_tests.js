/**
 * ST-5 — written Memory Copy and Share.
 *
 * Copy uses the installed React Native core Clipboard (verified, no package
 * added). Share of a written Memory shares the TEXT through the native text
 * share, never a signed storage URL. "Copiado" is never reported before the
 * operation succeeds.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const packageJson = read('front/mi-front-limpio/package.json');

let failed = 0;
async function check(label, fn) {
  try { await fn(); console.log(`PASS: ${label}`); }
  catch (error) { failed += 1; console.error(`FAIL: ${label}\n  ${error.message}`); }
}

(async () => {
  console.log('\n=== ST5 WRITTEN MEMORY SHARE ===');

  await check('no clipboard package was added (expo-clipboard / @react-native-clipboard absent)', () => {
    assert.ok(!packageJson.includes('expo-clipboard'));
    assert.ok(!packageJson.includes('@react-native-clipboard'));
  });

  await check('Copy uses the installed RN core Clipboard API', () => {
    assert.match(screen, /Clipboard,/);
    const i = screen.indexOf('const copyWrittenMemory = useCallback');
    const window = screen.slice(i, i + 900);
    assert.match(window, /Clipboard\.setString\(text\)/);
  });

  await check('Copy copies the actual written content (writtenText), not a label', () => {
    const i = screen.indexOf('const copyWrittenMemory = useCallback');
    const window = screen.slice(i, i + 900);
    assert.match(window, /memory\.kind !== 'written'/);
    assert.match(window, /memory\.writtenText/);
  });

  await check('"Copiado" is only reported AFTER the clipboard write succeeds', () => {
    const i = screen.indexOf('const copyWrittenMemory = useCallback');
    const window = screen.slice(i, i + 900);
    const setStringIndex = window.indexOf('Clipboard.setString(text)');
    const copiedIndex = window.indexOf("'Copiado'");
    assert.ok(setStringIndex !== -1 && copiedIndex !== -1);
    assert.ok(copiedIndex > setStringIndex, 'Copiado toast must come after setString');
    assert.match(window, /catch/);
    assert.match(window, /No se pudo copiar/);
  });

  await check('sharing a written Memory uses the native TEXT share, never a signed URL', () => {
    assert.match(screen, /Share\.share\(\{ message: text, title: 'Compartir recuerdo' \}\)/);
    const share = read('front/mi-front-limpio/services/homecloud/homecloudMemoryShare.ts');
    assert.doesNotMatch(share, /Share\.share/);
  });

  await check('a written Memory with empty text is refused honestly', () => {
    assert.ok(screen.includes("'Este recuerdo no tiene texto.'"));
  });

  await check('written share never downloads a binary original', () => {
    const i = screen.indexOf('const shareMemories = useCallback');
    const window = screen.slice(i, i + 1400);
    assert.match(window, /memory\.kind === 'written'/);
    const binaryBranch = window.slice(window.indexOf('shareMemoryBinary'));
    assert.match(binaryBranch, /shareMemoryBinary\(token, memory\)/);
    assert.doesNotMatch(binaryBranch, /Share\.share/);
  });

  await check('the written page never offers "download original"', () => {
    const viewer = read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx');
    const written = viewer.slice(viewer.indexOf('function WrittenPage'), viewer.indexOf('function MediaPlaceholder'));
    assert.doesNotMatch(written, /descargar|Descargar/);
    assert.doesNotMatch(written, /getMemoryOriginalUrl/);
  });

  console.log(`\nST5_WRITTEN_MEMORY_SHARE_RESULT fail=${failed}`);
  if (failed > 0) process.exitCode = 1;
})().catch((error) => { console.error('ST5 written memory share tests crashed:', error); process.exitCode = 1; });
