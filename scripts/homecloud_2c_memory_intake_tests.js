#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-2C — Memory Intake frontend structure tests.
 *
 * Non-runtime structural validation of the Memory Intake slice (mirrors the
 * HC-2A upload-job structure test). Validates that the picker adapter, intake
 * service, intake component, and the shared engine extension carry the HC-2C
 * contract pieces (role=memory, initialAlbumId, reliable capture metadata,
 * single image/video selection, no document source).
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'front', 'mi-front-limpio', 'services', 'homecloud');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

console.log('\n=== HC-2C MEMORY INTAKE FRONTEND STRUCTURE TESTS ===\n');

const picker = read('homecloudMemoryPicker.ts');
const captureMetadata = read('homecloudMediaCaptureMetadata.ts');
const service = read('homecloudMemoryIntakeService.ts');
const component = read('MemoryIntake.tsx');
const types = read('homecloudUploadTypes.ts');
const engine = read('homecloudUploadEngine.ts');

// Picker adapter
record(picker.includes('launchImageLibraryAsync'), 'picker uses the native image library picker');
record(picker.includes("'images'") && picker.includes("'videos'"), 'picker scoped to photos + videos only');
record(picker.includes('allowsMultipleSelection: false'), 'picker single selection (no batch)');
record(picker.includes('exif') || captureMetadata.includes('DateTimeOriginal'), 'picker reads reliable EXIF capture metadata');
record(
  captureMetadata.includes('capturedAt')
    && captureMetadata.includes('capturePrecision')
    && picker.includes('deriveMediaCaptureMetadata'),
  'capture metadata is derived by the centralized primitive, not ad hoc in the adapter',
);

// MIME gate
record(picker.includes('image/') && picker.includes('video/'), 'picker only accepts image/* and video/*');

// Service
record(service.includes("role: 'memory'"), 'intake service always creates role=memory');
record(service.includes('createUploadEngine'), 'intake service reuses the Shared Upload Engine');
record(service.includes('.capturedAt') || service.includes('capturedAt,'), 'service forwards reliable capture metadata');
record(service.includes('initialAlbumId'), 'service forwards optional initial Album destination');

// Component
record(component.includes('Guardar un recuerdo'), 'component renders canonical create title');
// RETARGET (ST-10) — the old assertion demanded `Elegir foto/video/audio`, the
// intermediate chooser sheet that let a gallery selection also pick audio.
// Product Truth §4.1.1 froze that sheet OUT: `Importar audio` is a first-level
// action, `Fotos y videos` offers ONLY image and video, and there is no
// sub-level chooser. The old assertion therefore encoded a contract the product
// has since forbidden, so it is replaced by the CURRENT one: the productive
// media sources are exposed as FLAT first-level actions.
record(
  component.includes('Fotos y videos')
    && component.includes('Capturar momento')
    && component.includes('Importar audio')
    && component.includes('Grabar audio')
    && !component.includes('Elegir foto/video/audio'),
  'component exposes every productive media source as a flat first-level create action (no chooser sheet, per §4.1.1)',
);
record(component.includes('Sin álbum'), 'root destination is represented as no Album membership');

// Shared engine extension
record(types.includes('initialAlbumId'), 'upload type contract carries initialAlbumId');
record(types.includes('capturedAt') && types.includes('capturePrecision'), 'upload type contract carries capture metadata');
record(engine.includes('initialAlbumId'), 'engine register payload forwards initialAlbumId');

console.log(`\nHC2C_MEMORY_INTAKE_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC2C_MEMORY_INTAKE_FRONTEND_TESTS=FAIL');
} else {
  console.log('HC2C_MEMORY_INTAKE_FRONTEND_TESTS=PASS');
}
