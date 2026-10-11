'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function check(value, label) {
  if (value) console.log(`PASS: ${label}`);
  else { failed += 1; console.error(`FAIL: ${label}`); }
}

console.log('\n=== HOMECLOUD ST-4 VIEWER NO NESTED MODAL ===');

const viewer = read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx');
const actionSheet = read('front/mi-front-limpio/components/ui/ActionSheet.tsx');
const memoriesScreen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');

check(!viewer.includes("from 'react-native'") || !/\bModal\b/.test(viewer), 'the Viewer renders no React Native Modal');
check(!/<Modal[\s>]/.test(viewer), 'the Viewer contains no <Modal> element');
check(
  !/ActionSheet\.tsx/.test(read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx')),
  'the Viewer does not render the shared ActionSheet',
);
check(
  actionSheet.includes('modalHeader') || actionSheet.includes('Modal'),
  'the single shared modal host still exists exactly once',
);
check(
  (memoriesScreen.match(/<ActionSheet\b/g) ?? []).length === 1,
  'Memories still renders exactly one ActionSheet host',
);
check(
  memoriesScreen.includes('<MemoryInfoSheet') && memoriesScreen.includes('onOpenInfo={(contentId) => setInfoContentId(contentId)}'),
  'the ST-3 Info sheet wiring is still in place',
);

if (failed > 0) {
  console.error(`\nHOMECLOUD ST-4 VIEWER NO NESTED MODAL: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nHOMECLOUD ST-4 VIEWER NO NESTED MODAL: PASS');
