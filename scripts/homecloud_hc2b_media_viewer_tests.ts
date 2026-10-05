import fs from 'node:fs';
import path from 'node:path';
import {
  applyMemoryVisualRange,
  resolveMemoryVisualRangeIds,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryDrag';
import {
  albumViewerSession,
  collectionViewerSession,
  libraryViewerSession,
  memoryViewerDataset,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryViewerSource';
import type { HomeCloudMemoryKind, HomeCloudMemoryListItem } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';
import { MemoryAcceptanceLifecycle, MemoryPickerLifecycle } from '../front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeLifecycle';

let failed = 0;
function check(value: boolean, label: string) {
  if (value) console.log(`PASS: ${label}`);
  else { failed += 1; console.error(`FAIL: ${label}`); }
}
function memory(id: string, kind: HomeCloudMemoryKind): HomeCloudMemoryListItem {
  return {
    id, kind, role: 'memory', displayName: null, mimeType: kind === 'written' ? null : `${kind}/test`, extension: null,
    sizeBytes: null, uploadedByMemberId: null, uploadedAt: null, hasPreview: false, hiddenFromResurfacing: false,
    caption: null, writtenText: kind === 'written' ? id : null, capturedAt: null, capturedYear: null, capturedMonth: null,
    capturePrecision: 'unknown', albumIds: [],
  };
}

console.log('\n=== HC2-B MEDIA VIEWER SLICE 0 ===');
const order = ['1', '2', '3', '4', '5', '6'];
check(resolveMemoryVisualRangeIds('1', '4', order).join() === '1,2,3,4', 'D4 incomplete row 1→4 is contiguous visual order');
check(resolveMemoryVisualRangeIds('2', '5', order).join() === '2,3,4,5', 'D4 2→5 crosses rows contiguously');
check(resolveMemoryVisualRangeIds('5', '2', order).join() === '2,3,4,5', 'D4 reverse/bottom→top is symmetric');
check([...applyMemoryVisualRange(new Set(['6']), ['1','2','3','4','5'], 'select')].sort().join() === '1,2,3,4,5,6', 'D4 select preserves baseline');
check([...applyMemoryVisualRange(new Set(order), ['2','3','4','5'], 'deselect')].sort().join() === '1,6', 'D4 deselect preserves baseline outside current range');

const photo = memory('photo', 'image'); const video = memory('video', 'video'); const audio = memory('audio', 'audio'); const note = memory('note', 'written');
const all = [photo, video, audio, note];
const library = libraryViewerSession(all, photo.id);
check(library.source.kind === 'library' && library.source.label === 'Recuerdos', 'Library opener produces Library source');
const album = albumViewerSession('album-7', 'Viaje', [photo, note], note.id);
check(album.source.kind === 'album' && album.source.sourceId === 'album-7' && album.source.label === 'Viaje', 'Album opener preserves exact Album source');
const cases = [
  { kind: 'image' as const, label: 'Fotos', item: photo },
  { kind: 'video' as const, label: 'Videos', item: video },
  { kind: 'audio' as const, label: 'Audios', item: audio },
  { kind: 'written' as const, label: 'Notas', item: note },
];
for (const item of cases) {
  const sourceId = `type:${item.kind}`;
  const session = collectionViewerSession({ kind: 'type', memoryKind: item.kind }, sourceId, item.label, all, item.item.id);
  const pager = memoryViewerDataset(session.source, {
    library: all,
    album: { sourceId: 'album-7', memories: [photo, note] },
    collection: { sourceId, memories: all },
  });
  check(session.source.kind === 'collection' && session.source.sourceId === sourceId && session.source.label === item.label, `${item.label} opener produces exact Collection source`);
  check(pager.length === 1 && pager[0]?.kind === item.kind, `${item.label} pager contains only its Collection kind`);
}
const root = process.cwd();
const screen = fs.readFileSync(path.join(root, 'front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx'), 'utf8');
const viewer = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/homecloud/MemoryViewer.tsx'), 'utf8');
check(screen.includes('libraryViewerSession') && screen.includes('albumViewerSession') && screen.includes('collectionViewerSession'), 'each caller supplies explicit Viewer source identity');
check(viewer.includes('{source.label}'), 'Viewer chrome renders the source naming authority label');

const lifecycle = new MemoryPickerLifecycle();
const oldAttempt = lifecycle.begin('gallery', 100)!;
check(lifecycle.begin('audio-import', 101) === null, 'D6 rapid double tap opens only one picker');
lifecycle.invalidate();
const currentAttempt = lifecycle.begin('audio-import', 110)!;
check(lifecycle.settle(oldAttempt, 120).kind === 'stale' && lifecycle.active()?.attempt === currentAttempt.attempt, 'D6 old settle cannot corrupt a newer attempt');
check(lifecycle.settle(currentAttempt, 130).kind === 'current' && !lifecycle.isBusy(), 'D6 success/cancel/error settle returns to idle');
check(lifecycle.begin('gallery', 140) !== null, 'D6 picker reopens after cancel or error');
lifecycle.invalidate();
check(!lifecycle.isBusy() && lifecycle.begin('audio-import', 150) !== null, 'D6 AppState invalidation releases a stale guard');

const acceptance = new MemoryAcceptanceLifecycle();
check(acceptance.begin('draft-1') && !acceptance.begin('draft-1'), 'D6 binary submit admits one in-flight acceptance');
acceptance.settle('draft-1', false);
check(!acceptance.isAccepting() && acceptance.begin('draft-1'), 'D6 thrown/failed submit restores guards and permits retry');
acceptance.settle('draft-1', true);
check(acceptance.isAccepted('draft-1') && !acceptance.begin('draft-1'), 'D6 durable acceptance remains idempotent');

const intake = fs.readFileSync(path.join(root, 'front/mi-front-limpio/services/homecloud/MemoryIntake.tsx'), 'utf8');
const intakeService = fs.readFileSync(path.join(root, 'front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts'), 'utf8');
for (const event of ['picker_request', 'picker_guard_reject', 'picker_settled', 'picker_stale_settle', 'picker_appstate_invalidate', 'intake_submit_rejected']) {
  check(intake.includes(`'${event}'`), `D6 TEMPORARY diagnostics include ${event}`);
}
check(intake.includes("nextState !== 'background'") && intake.includes('pickerLifecycleRef.current.invalidate()'), 'D6 AppState recovery invalidates interrupted picker ownership');
check(/const submitBinary[\s\S]*catch \(error\)[\s\S]*finally/.test(intake), 'D6 submit exceptions always restore acceptance guards');
check(intakeService.includes('if (pickerGeneration === generation) picking = false;'), 'D6 service-level stale settle cannot clear a newer picker guard');
check(!/runtimeTrace\([^\n]*(accessToken|signedUrl|localUri|contentId|fileName)/.test(intake), 'D6 diagnostics exclude sensitive identifiers and media paths');

if (failed) process.exitCode = 1;
