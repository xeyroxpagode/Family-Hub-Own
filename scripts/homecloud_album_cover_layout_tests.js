#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'front/mi-front-limpio/components/homecloud/AlbumTile.tsx'),
  'utf8',
);

const check = (label, condition) => {
  assert.ok(condition, label);
  console.log(`PASS: ${label}`);
};

check('READY_DATA uses cover scaling', /<Animated\.Image[\s\S]*resizeMode="cover"/.test(source));
check(
  'the cover layer fills the measured tile instead of using intrinsic image size',
  /cover:\s*\{\s*width:\s*'100%',\s*height:\s*'100%',\s*alignSelf:\s*'stretch'/.test(source),
);
check('READY_DATA renders in the full-size cover layer', /style=\{\[styles\.cover, \{ opacity: imageOpacity \}\]\}/.test(source));
check('LOADING renders in the same full-size cover layer', /style=\{\[styles\.cover, styles\.loadingVisual\]\}/.test(source));
check('EMPTY renders in the same full-size cover layer', /style=\{\[styles\.cover, styles\.fallbackVisual\]\}/.test(source));
check('ERROR renders in the same full-size cover layer', /style=\{\[styles\.cover, styles\.errorVisual\]\}/.test(source));
check('the button remains the clipping square', /visual:\s*\{[\s\S]*aspectRatio:\s*1[\s\S]*overflow:\s*'hidden'/.test(source));

console.log('HOMECLOUD_ALBUM_COVER_LAYOUT_TESTS=PASS');
