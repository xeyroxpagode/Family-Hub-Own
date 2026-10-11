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

console.log('\n=== HOMECLOUD P1 ST-2 GLOBAL TAB SWITCH ===');

const homeCloudScreen = stripComments(read('front/mi-front-limpio/screens/HomeCloudScreen.tsx'));
const memoriesScreen = stripComments(read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx'));

check(
  homeCloudScreen.includes("<HomeCloudMemoriesView active={section === 'memories'} />"),
  'the global Archivos/Recuerdos selector passes active state to Memories',
);
check(
  memoriesScreen.includes('type HomeCloudMemoriesViewProps = {')
    && memoriesScreen.includes('active?: boolean;')
    && memoriesScreen.includes('export function HomeCloudMemoriesView({ active = true }: HomeCloudMemoriesViewProps = {})'),
  'Memories accepts an optional active prop with a safe default for direct mounts',
);
check(
  /useEffect\(\(\) => \{\s*if \(!active\) setViewer\(null\);\s*\}, \[active\]\);/.test(memoriesScreen),
  'leaving the Memories tab closes the Viewer',
);
check(
  /<View style=\{\[styles\.pane, section !== 'memories' && styles\.hidden\]\}[\s\S]*?<HomeCloudMemoriesView active=\{section === 'memories'\} \/>/.test(homeCloudScreen),
  'the Memories pane stays mounted while hidden, so tab switching is handled explicitly',
);
check(
  !/active[^\n]*setSelection|!active[^\n]*closeAlbum|!active[^\n]*closeCollection/.test(memoriesScreen),
  'global tab switching does not destroy selection, Album, or collection caller context',
);

if (failed > 0) {
  console.error(`\nHOMECLOUD P1 ST-2 GLOBAL TAB SWITCH: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nHOMECLOUD P1 ST-2 GLOBAL TAB SWITCH: PASS');
