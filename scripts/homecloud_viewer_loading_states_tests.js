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

console.log('\n=== HOMECLOUD ST-4 VIEWER LOADING STATES ===');

const original = stripComments(read('front/mi-front-limpio/services/homecloud/homecloudMemoryOriginal.ts'));
const previewHook = stripComments(read('front/mi-front-limpio/components/homecloud/useMemoryPreviewUrl.ts'));
const viewer = stripComments(read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx'));
const video = stripComments(read('front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx'));
const audio = stripComments(read('front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx'));

check(
  original.includes('timeoutMs') && original.includes('?? 15000'),
  'the original-URL fetch has an explicit bounded timeout',
);
check(
  original.includes('signal: options?.signal'),
  'the original-URL fetch forwards cancellation',
);
check(
  previewHook.includes('timeoutMs: 15000'),
  'the preview URL fetch is bounded too',
);
check(
  viewer.includes('if (!accessToken) { setFailed(true); return; }'),
  'a missing access token is a terminal state, not an eternal spinner',
);
check(
  viewer.includes('attempt') && viewer.includes("title=\"Reintentar\""),
  'the image page keeps an honest Retry',
);
check(
  video.includes('onRetry') && video.includes('Reintentar') && video.includes('attempt'),
  'the video page failure is bounded with a Retry',
);
check(
  audio.includes('onRetry') && audio.includes('Reintentar') && audio.includes('attempt'),
  'the audio page failure is bounded with a Retry',
);
check(
  viewer.includes('No pudimos mostrar este recuerdo.') && viewer.includes('Reintentar cargar este recuerdo'),
  'an image failure keeps its honest message and Retry',
);

if (failed > 0) {
  console.error(`\nHOMECLOUD ST-4 VIEWER LOADING STATES: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nHOMECLOUD ST-4 VIEWER LOADING STATES: PASS');
