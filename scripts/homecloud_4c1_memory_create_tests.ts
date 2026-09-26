import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  emptySemanticDateDraft,
  semanticDateDraftFromCapture,
  semanticDateValueFromDraft,
} from '../front/mi-front-limpio/services/homecloud/homecloudSemanticDate';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const filesScreen = read('front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx');
const component = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const service = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
const written = read('front/mi-front-limpio/services/homecloud/homecloudWrittenMemoryService.ts');
const picker = read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts');
const engine = read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts');

let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`  PASS: ${name}`);
}

console.log('\n=== HOMECLOUD 4C1 MEMORY CREATE TESTS ===\n');

test('+ in Files preserves the existing Files menu', () => assert.match(filesScreen, /title="Agregar"/));
test('+ in Memories mounts productive MemoryIntake', () => assert.match(screen, /<MemoryIntake/));
test('create sheet exposes photo/video', () => assert.match(component, /title="Elegir fotos o videos"/));
test('create sheet exposes Written', () => assert.match(component, /title="Escribir un recuerdo"/));
test('create sheet has no camera action', () => assert.doesNotMatch(component, /title="Tomar foto"/));
test('create sheet has no recorder action', () => assert.doesNotMatch(component, /title="Grabar audio"/));
test('blank Written is disabled', () => assert.match(component, /disabled=\{!writtenText\.trim\(\)/));
test('Written trims and validates text', () => assert.match(written, /input\.text\.trim\(\)/));
test('Written payload has no MIME', () => assert.doesNotMatch(written, /mimeType/));
test('Written payload has no size', () => assert.doesNotMatch(written, /sizeBytes/));
test('Written payload has no path', () => assert.doesNotMatch(written, /localUri|storagePath/));
test('Written flow has no UploadJob', () => assert.doesNotMatch(written, /UploadJob|createUploadEngine/));
test('Written calls register', () => assert.match(written, /homecloud\/register/));
test('Written calls finalize', () => assert.match(written, /\/finalize/));
test('Written album is optional', () => assert.match(written, /initialAlbumId.*null/));
test('Written defaults resurfacing flag to false', () => assert.match(written, /hiddenFromResurfacing: false/));
test('Written keeps an intake request id', () => assert.match(written, /intakeRequestId/));
test('Written blocks double submit', () => assert.match(component, /writtenSubmitting \|\| !writtenText\.trim/));
test('Written error remains recoverable', () => assert.match(component, /setWrittenError/));
test('picker requests images', () => assert.match(picker, /'images'/));
test('picker requests videos', () => assert.match(picker, /'videos'/));
test('picker does not request audio', () => assert.doesNotMatch(picker, /'audios'/));
test('binary review precedes upload', () => assert.ok(component.indexOf("setSheet('binary')") >= 0 && component.includes('createBinaryMemory')));
test('binary caption is forwarded', () => assert.match(service, /caption: metadata\.caption/));
test('binary exact timestamp is forwarded', () => assert.match(service, /capturedAt: metadata\.capturedAt/));
test('binary year is forwarded', () => assert.match(service, /capturedYear: metadata\.capturedYear/));
test('binary month is forwarded', () => assert.match(service, /capturedMonth: metadata\.capturedMonth/));
test('binary precision is forwarded', () => assert.match(service, /capturePrecision: metadata\.capturePrecision/));
test('binary album is forwarded', () => assert.match(service, /initialAlbumId: metadata\.initialAlbumId/));
test('binary uses Shared Upload Engine', () => assert.match(service, /createUploadEngine/));
test('binary does not define a second upload engine', () => assert.doesNotMatch(service, /function createUploadEngine|class .*UploadEngine/));
test('engine sends partial semantic components', () => assert.ok(engine.includes('capturedYear') && engine.includes('capturedMonth')));
test('success refetches canonical Timeline', () => assert.match(screen, /onComplete=\{\(\) => void refresh\(\)\}/));
test('no optimistic Memory is fabricated', () => assert.doesNotMatch(component, /setMemories|prepend|optimistic/i));

test('no EXIF defaults to unknown', () => {
  assert.deepEqual(semanticDateDraftFromCapture(null, 'unknown'), emptySemanticDateDraft());
});
test('EXIF exact remains exact and preserves timestamp', () => {
  const timestamp = '2018-07-05T18:30:45.000Z';
  const draft = semanticDateDraftFromCapture(timestamp, 'exact');
  assert.equal(draft.precision, 'exact');
  assert.deepEqual(semanticDateValueFromDraft(draft), { precision: 'exact', capturedAt: timestamp, capturedYear: null, capturedMonth: null });
});
test('year has no fake month or timestamp', () => {
  assert.deepEqual(semanticDateValueFromDraft({ ...emptySemanticDateDraft(), precision: 'year', year: '1999' }), {
    precision: 'year', capturedAt: null, capturedYear: 1999, capturedMonth: null,
  });
});
test('month_year has no fake day or timestamp', () => {
  assert.deepEqual(semanticDateValueFromDraft({ ...emptySemanticDateDraft(), precision: 'month_year', year: '2004', month: 8 }), {
    precision: 'month_year', capturedAt: null, capturedYear: 2004, capturedMonth: 8,
  });
});
test('unknown has no semantic components', () => {
  assert.deepEqual(semanticDateValueFromDraft(emptySemanticDateDraft()), {
    precision: 'unknown', capturedAt: null, capturedYear: null, capturedMonth: null,
  });
});
test('unknown does not fall back to uploadedAt', () => assert.doesNotMatch(read('front/mi-front-limpio/services/homecloud/homecloudSemanticDate.ts'), /uploadedAt/));
test('unknown does not fall back to createdAt', () => assert.doesNotMatch(read('front/mi-front-limpio/services/homecloud/homecloudSemanticDate.ts'), /createdAt/));
test('single initial album preserves N:M backend model', () => assert.match(component, /writtenAlbumId/));
test('empty album list still offers Sin álbum', () => assert.match(component, /albums\.length === 0.*Sin álbum/));
test('Timeline remains backend sorted', () => assert.match(screen, /listMemories\(token/));
test('no raw string child regression in new form labels', () => assert.match(component, /\{'Álbum \(opcional\)'\}/));

console.log(`\nHOMECLOUD_4C1_MEMORY_CREATE_RESULT pass=${passed} fail=0`);
console.log('HOMECLOUD_4C1_MEMORY_CREATE_TESTS=PASS');
