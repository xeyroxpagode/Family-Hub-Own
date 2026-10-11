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

console.log('\n=== HOMECLOUD P1 ST-2 SCROLL OFFSETS ===');

const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const code = stripComments(screen);

check(
  code.includes("const sourceKey = activeCollectionId ?? 'root';"),
  'root and type collection surfaces have stable explicit source keys',
);
check(
  !/const sourceKey[^;\n]*selecting/.test(code),
  'entering selection cannot change the current source key',
);
check(
  code.includes('scrollOffsetsRef.current.set(sourceKeyRef.current, event.nativeEvent.contentOffset.y);'),
  'scroll events are saved under the live source key',
);
check(
  /useEffect\(\(\) => \{[\s\S]*?const offset = scrollOffsetsRef\.current\.get\(sourceKey\) \?\? 0;[\s\S]*?scrollMemoryListToOffset\(listRef\.current, offset\);[\s\S]*?\}, \[sourceKey\]\);/.test(code),
  're-entering a surface restores that surface through the single scroll adapter',
);
check(
  code.includes('scrollOffsetsRef.current.clear();')
    && /useEffect\(\(\) => \{[\s\S]*?scrollOffsetsRef\.current\.clear\(\);[\s\S]*?resetMemorySelectionScope\(\)[\s\S]*?\}, \[abortDrag, householdId, token\]\);/.test(code),
  'household reset clears every saved offset in the single reset authority',
);
check(
  code.includes('key={sourceKey}')
    && !code.includes('key={selecting')
    && !code.includes('sourceKeyRef.current = selecting'),
  'the list key is caller/source based, not selection based',
);
check(
  code.includes('const showAlbumDetail = openAlbumId !== null;')
    && code.includes('const showCollectionDetail = activeCollection !== null;'),
  'Album and collection scroll positions survive selection because their overlays stay mounted',
);

if (failed > 0) {
  console.error(`\nHOMECLOUD P1 ST-2 SCROLL OFFSETS: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nHOMECLOUD P1 ST-2 SCROLL OFFSETS: PASS');
