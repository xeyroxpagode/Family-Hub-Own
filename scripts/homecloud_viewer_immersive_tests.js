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

console.log('\n=== HOMECLOUD ST-4 VIEWER IMMERSIVE ===');

const viewer = stripComments(read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx'));
const memoriesScreen = stripComments(read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx'));
const homeCloudScreen = stripComments(read('front/mi-front-limpio/screens/HomeCloudScreen.tsx'));
const tabNavigator = stripComments(read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx'));

check(
  viewer.includes("from 'react-native-safe-area-context'") && viewer.includes('useSafeAreaInsets()'),
  'the Viewer reads safe areas with useSafeAreaInsets',
);
check(
  !viewer.includes('paddingTop:90') && !viewer.includes('top:spacing[5]') && !viewer.includes('bottom:spacing[5]'),
  'no fixed padding imitating safe areas remains',
);
check(
  !/overlay:\{[^}]*zIndex:20/.test(viewer.replace(/\s/g, '')) && !viewer.includes('zIndex:20'),
  'the immersive overlay no longer relies on a cross-tree zIndex',
);
check(
  viewer.includes('touchTargets.normal') && viewer.includes('closeTarget'),
  'the close control declares a >=44x44 hit target',
);
check(
  memoriesScreen.includes('publishMemoryViewerOpen(viewer !== null)'),
  'Memories publishes viewer-open one-way',
);
check(
  homeCloudScreen.includes('isMemoryViewerOpen()') && homeCloudScreen.includes('subscribeMemoryViewerOpen') && homeCloudScreen.includes('viewerOpen ? null :'),
  'HomeCloudScreen unmounts the Archivos|Recuerdos selector while the Viewer is open',
);
check(
  tabNavigator.includes('chromeHidden ? null :') && tabNavigator.includes('<AppTopBar') && tabNavigator.includes('subscribeMemoryViewerOpen'),
  'the global AppTopBar and floating navbar unmount while the Viewer is open',
);
check(
  tabNavigator.includes("activeTab === 'MoreTab'"),
  'chrome hiding is scoped to the tab that hosts the Viewer',
);
check(
  memoriesScreen.includes('useEffect(() => () => publishMemoryViewerOpen(false), []);'),
  'leaving Memories clears the visibility flag',
);

if (failed > 0) {
  console.error(`\nHOMECLOUD ST-4 VIEWER IMMERSIVE: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nHOMECLOUD ST-4 VIEWER IMMERSIVE: PASS');
