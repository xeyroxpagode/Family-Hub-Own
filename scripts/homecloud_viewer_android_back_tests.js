'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

let failed = 0;
function check(value, label) {
  if (value) console.log(`PASS: ${label}`);
  else { failed += 1; console.error(`FAIL: ${label}`); }
}

console.log('\n=== HOMECLOUD P1 ST-2 VIEWER ANDROID BACK ===');

const code = stripComments(read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx'));
const backStart = code.indexOf("BackHandler.addEventListener('hardwareBackPress'");
const backEnd = code.indexOf('return () => subscription.remove();', backStart);
const backBlock = backStart >= 0 && backEnd >= 0 ? code.slice(backStart, backEnd) : '';

check((code.match(/BackHandler\.addEventListener\('hardwareBackPress'/g) ?? []).length === 1, 'there is exactly one Android Back owner');
check(
  code.includes('const viewerRef = useRef<MemoryViewerSession | null>(viewer);')
    && code.includes('viewerRef.current = viewer;'),
  'the Back handler reads the live Viewer session through a ref',
);

const drag = backBlock.indexOf('dragRef.current.active');
const selection = backBlock.indexOf('if (selecting)');
const viewer = backBlock.indexOf('viewerRef.current !== null');
const collection = backBlock.indexOf('if (collectionDetailOpen)');
const album = backBlock.indexOf('openAlbumIdRef.current !== null');
const fallthrough = backBlock.indexOf('return false;');

check(
  [drag, selection, viewer, collection, album, fallthrough].every((index) => index >= 0)
    && drag < selection && selection < viewer && viewer < collection && collection < album && album < fallthrough,
  'Back priority is drag -> selection -> Viewer -> collection -> Album -> navigation',
);
check(
  /if \(viewerRef\.current !== null\) \{[\s\S]*?setViewer\(null\);[\s\S]*?return true;[\s\S]*?\}/.test(backBlock),
  'Back closes the Viewer before changing the caller surface below it',
);
check(
  /<MemoryViewer[\s\S]*?onClose=\{\(\) => setViewer\(null\)\}/.test(code),
  'the Viewer close affordance and Android Back share the same close state',
);
check(
  /memoryViewerDataset\(viewer\.source,[\s\S]*?album: \{ sourceId: openAlbumId,[\s\S]*?collection: \{ sourceId: collections\.collectionId,/.test(code),
  'Viewer datasets remain caller-scoped and do not fall back to another source',
);

if (failed > 0) {
  console.error(`\nHOMECLOUD P1 ST-2 VIEWER ANDROID BACK: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nHOMECLOUD P1 ST-2 VIEWER ANDROID BACK: PASS');
