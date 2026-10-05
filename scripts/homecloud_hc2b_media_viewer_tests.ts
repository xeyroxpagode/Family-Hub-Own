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
import {
  MemoryAcceptanceLifecycle,
  MemoryPickerLifecycle,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeLifecycle';
import {
  MemoryMediaAccess,
  isMemoryMediaKind,
  mediaPlaybackAuthorized,
  mediaProgressRatio,
  resolveMemoryMediaFailure,
  validMediaDuration,
  type MemoryMediaLifecycle,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryMediaPlayback';

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
const reopened = lifecycle.begin('audio-import', 150)!;
check(reopened.attempt !== 0, 'D6 an explicit ownership boundary releases the guard and permits a new picker');
// PRODUCT TRUTH (§20/§21): elapsed time alone never ends picker ownership. A
// native presentation can legitimately run far past any wall-clock threshold,
// so a never-settling picker must stay owned instead of being auto-closed.
check(lifecycle.begin('gallery', 60_000) === null && lifecycle.active()?.attempt === reopened.attempt, 'D6 arbitrary elapsed time never cancels an unsettled picker');
check(lifecycle.settle(reopened, 60_000).kind === 'current', 'D6 a picker that finally settles still releases ownership honestly');
check(lifecycle.begin('gallery', 60_001) !== null, 'D6 ownership is reusable after the long presentation settles');
lifecycle.invalidate();

const acceptance = new MemoryAcceptanceLifecycle();
check(acceptance.begin('draft-1') && !acceptance.begin('draft-1'), 'D6 binary submit admits one in-flight acceptance');
acceptance.settle('draft-1', false);
check(!acceptance.isAccepting() && acceptance.begin('draft-1'), 'D6 thrown/failed submit restores guards and permits retry');
acceptance.settle('draft-1', true);
check(acceptance.isAccepted('draft-1') && !acceptance.begin('draft-1'), 'D6 durable acceptance remains idempotent');

const intake = fs.readFileSync(path.join(root, 'front/mi-front-limpio/services/homecloud/MemoryIntake.tsx'), 'utf8');
const intakeService = fs.readFileSync(path.join(root, 'front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts'), 'utf8');
for (const event of ['picker_request', 'picker_guard_reject', 'picker_settled', 'picker_stale_settle', 'picker_appstate_observed', 'intake_submit_rejected']) {
  check(intake.includes(`'${event}'`), `D6 TEMPORARY diagnostics include ${event}`);
}
// PRODUCT TRUTH (§20): an AppState transition is NOT an ownership boundary, so
// the listener must OBSERVE and never invalidate. Presenting a native picker
// legitimately moves the app out of `active`; invalidating there would close
// legitimate presentations — the exact failure D6 exists to prevent.
const appStateListener = /AppState\.addEventListener\('change',[\s\S]*?\n {4}\}\);/.exec(intake)?.[0] ?? '';
check(appStateListener.includes('picker_appstate_observed') && !appStateListener.includes('invalidate'), 'D6 AppState transition only traces; it never invalidates picker ownership');
check(!/runtimeTrace\('picker_appstate_invalidate'/.test(intake), 'D6 no longer invalidates a legitimate native picker on backgrounding');
check(!/AppState[\s\S]{0,400}?setTimeout/.test(intake), 'D6 has no AppState watchdog timeout that auto-closes a picker');
// The ownership boundaries that ARE allowed to invalidate must stay intact.
for (const boundary of ['pickerLifecycleRef.current.invalidate();', 'attemptAuthorityRef.current.invalidate();']) {
  check(intake.includes(boundary), `D6 keeps the established ownership boundary ${boundary}`);
}
check(/const closeCreate[\s\S]*?pickerAttemptRef\.current \+= 1;/.test(intake), 'D6 closing the Create flow supersedes the picker generation');
check(/mountedRef\.current = true;[\s\S]*?pickerLifecycle\.invalidate\(\)/.test(intake), 'D6 unmount still releases the pending picker guard');
check(/const submitBinary[\s\S]*catch \(error\)[\s\S]*finally/.test(intake), 'D6 submit exceptions always restore acceptance guards');
check(intakeService.includes('if (pickerGeneration === generation) picking = false;'), 'D6 service-level stale settle cannot clear a newer picker guard');
check(!/runtimeTrace\([^\n]*(accessToken|signedUrl|localUri|contentId|fileName)/.test(intake), 'D6 diagnostics exclude sensitive identifiers and media paths');

// ===========================================================================
// HC2-B — VIDEO MEMORY PLAYBACK
// ===========================================================================
console.log('\n=== HC2-B VIDEO PLAYBACK ===');

/**
 * Comments describe intent in prose, so a "this must not exist" assertion has
 * to look at CODE. Stripping comments keeps those assertions precise instead of
 * matching a sentence that explains why the thing is absent.
 */
function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// PRODUCT TRUTH: a Video opens PAUSED and nothing but an explicit user press may
// start it. The single authorization boolean is therefore the whole contract:
// `true` merely permits playback, it never begins it.
const ALLOWED: MemoryMediaLifecycle = { isActivePage: true, viewerOpen: true, appActive: true, screenFocused: true, dragging: false };
check(mediaPlaybackAuthorized(ALLOWED), 'Video the active foreground page is authorized to play');
for (const [label, patch] of [
  ['backgrounded', { appActive: false }],
  ['HomeCloud blurred', { screenFocused: false }],
  ['mid-swipe', { dragging: true }],
  ['Viewer closed', { viewerOpen: false }],
  ['page-away', { isActivePage: false }],
] as [string, Partial<MemoryMediaLifecycle>][]) {
  check(!mediaPlaybackAuthorized({ ...ALLOWED, ...patch }), `Video is NOT authorized while ${label}`);
}

// There is deliberately no "resume" anywhere: authorization is a permission,
// never an instruction, so returning to the foreground cannot restart a video.
const mediaModule = fs.readFileSync(path.join(root, 'front/mi-front-limpio/services/homecloud/homecloudMemoryMediaPlayback.ts'), 'utf8');
const videoPageSource = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx'), 'utf8');
const videoCode = codeOf(videoPageSource);
check(!/\b(resume|autoPlay|autoplay|startPlayback)\b/.test(codeOf(mediaModule)), 'media contract exposes no resume/autoplay helper at all');
check(!/\.play\(/.test(videoCode), 'the Video page never calls play(); only the native controls start playback');

// DURATION (§39): only a duration the player actually reported is a duration.
check(validMediaDuration(12.5) === 12.5 && validMediaDuration(0) === 0, 'a reported finite non-negative duration is honoured');
check(validMediaDuration(undefined) === null && validMediaDuration(Number.NaN) === null, 'undefined and NaN are never rendered as a duration');
check(validMediaDuration(Number.POSITIVE_INFINITY) === null && validMediaDuration(-1) === null, 'Infinity and a negative duration are rejected');
check(mediaProgressRatio(5, 0) === null, 'progress is null while the duration is still unknown (0), never a divide by zero');
check(mediaProgressRatio(5, 10) === 0.5 && mediaProgressRatio(50, 10) === 1, 'progress is clamped into 0..1');

// ERROR CLASSIFICATION (§41): unsupported requires evidence.
check(resolveMemoryMediaFailure({ access: 'failed', platform: 'android', videoTracks: [] }) === 'access', 'a missing original is an ACCESS failure, never "unsupported"');
check(resolveMemoryMediaFailure({ access: 'ok', platform: 'android', videoTracks: [{ isSupported: false }] }) === 'unsupported', 'Android reporting an unplayable track is an evidenced UNSUPPORTED state');
check(resolveMemoryMediaFailure({ access: 'ok', platform: 'android', videoTracks: [{ isSupported: true }] }) === 'playback', 'a supported track on error is a generic PLAYBACK failure');
check(resolveMemoryMediaFailure({ access: 'ok', platform: 'android', videoTracks: [] }) === 'playback', 'no track evidence never becomes UNSUPPORTED');
check(resolveMemoryMediaFailure({ access: 'ok', platform: 'ios', videoTracks: [{ isSupported: false }] }) === 'playback', 'iOS never claims UNSUPPORTED from an Android-only field');

// STALE ASYNC RESULTS (§32): a superseded generation cannot resolve.
const mediaAccess = new MemoryMediaAccess();
const first = mediaAccess.begin();
const second = mediaAccess.begin();
check(!mediaAccess.isCurrent(first) && mediaAccess.isCurrent(second), 'a superseded signed-original request can no longer resolve');
mediaAccess.invalidate();
check(!mediaAccess.isCurrent(second), 'revoking ownership invalidates the outstanding request too');

// MEDIA OWNERSHIP: only the active page may hold a player, and an inactive page
// must not even ASK for the original.
const videoPage = videoPageSource;
check(/if \(!active\) return <View/.test(videoCode) && videoCode.indexOf('if (!active)') < videoCode.indexOf('useVideoPlayer('), 'the inactive Video page returns a placeholder BEFORE any player hook exists');
check((videoCode.match(/getMemoryOriginalUrl\(/g) ?? []).length === 1 && /function ActiveMemoryVideoPage/.test(videoPage), 'exactly one place requests the signed original, and it is inside the ACTIVE page');
// `subscription.remove()` is the LISTENER teardown, not a player release: the
// assertion targets the player object specifically, and also forbids the
// non-releasing `createVideoPlayer` factory.
check(!/player\.(remove|release)\(/.test(videoCode) && !/createVideoPlayer/.test(videoCode), 'the Video page adds no manual release on top of the hook-owned one');
check(/player\.pause\(\)/.test(videoCode) && /if \(authorized\) return;/.test(videoCode), 'a revoked lifecycle intent pauses the player that is still mounted');
check(!/transcod|poster|Poster|saveToFiles|Sharing|shareAsync|expo-sharing/.test(videoCode), 'HC2-B video invents no poster, no transcode and no Save/Share action');

// PAGER + LIFECYCLE, as code-level integration.
check(/onScrollBeginDrag=\{revoke\}/.test(viewer), 'a pager drag immediately revokes playback authorization');
check(/active=\{item\.id === activeContentId\}/.test(viewer), 'the Viewer passes the active-page authority to every page');
check((viewer.match(/AppState\.addEventListener/g) ?? []).length === 1, 'the Viewer owns exactly ONE AppState listener for media, so Video and Audio cannot compete');
check(!/\.play\(/.test(codeOf(viewer)), 'the Viewer itself never starts playback');
check(/windowSize=\{|initialNumToRender=\{/.test(viewer), 'the Viewer bounds how many full-screen pages stay mounted');

if (failed) process.exitCode = 1;
