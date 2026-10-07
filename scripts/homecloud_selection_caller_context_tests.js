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

console.log('\n=== HOMECLOUD P1 ST-2 SELECTION CALLER CONTEXT ===');

const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const code = stripComments(screen);
const albumDetail = stripComments(read('front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx'));
const collectionDetail = stripComments(read('front/mi-front-limpio/components/homecloud/MemoryCollectionDetailView.tsx'));

check(
  code.includes('const showAlbumDetail = openAlbumId !== null;')
    && !code.includes('const showAlbumDetail = !selecting && openAlbumId !== null;'),
  'Album detail remains mounted during selection instead of falling back to root',
);
check(
  code.includes('const showCollectionDetail = activeCollection !== null;')
    && !code.includes('const showCollectionDetail = !selecting && activeCollection !== null;'),
  'type collection detail remains mounted during selection instead of falling back to root',
);
check(
  /<AlbumDetailView[\s\S]*?selecting=\{selecting\}[\s\S]*?onLongPressMemory=\{\(contentId\) => \{[\s\S]*?enterRemoveFromAlbum\(openAlbumId, contentId\)/.test(code),
  'long-press inside an Album keeps the Album caller and enters remove-from-that-Album selection',
);
check(
  albumDetail.includes('onLongPress={onLongPressMemory}')
    && albumDetail.includes('selecting={selecting}'),
  'Album rows receive the active selection mode without unmounting the Album surface',
);
check(
  /<MemoryCollectionDetailView[\s\S]*?selecting=\{selecting\}[\s\S]*?onLongPressMemory=\{\(contentId\) => \{[\s\S]*?purpose: \{ kind: 'generic' \}[\s\S]*?initialContentIds: \[contentId\]/.test(code),
  'long-press inside a type collection keeps the type caller and enters generic selection with the pressed Memory',
);
check(
  collectionDetail.includes('onLongPress={onLongPressMemory}')
    && collectionDetail.includes('selecting={selecting}'),
  'type collection rows receive the active selection mode without unmounting the collection surface',
);
check(
  code.includes("const sourceKey = activeCollectionId ?? 'root';")
    && !/const sourceKey[^;\n]*selecting/.test(code),
  'selection state is not part of the scroll/source key',
);
check(
  !/trashMemory|restoreMemory|purgeMemory|purge-all|Papelera|Eliminar recuerdo/.test(code),
  'P1 lifecycle actions are not exposed in the Memories UI',
);

if (failed > 0) {
  console.error(`\nHOMECLOUD P1 ST-2 SELECTION CALLER CONTEXT: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nHOMECLOUD P1 ST-2 SELECTION CALLER CONTEXT: PASS');
