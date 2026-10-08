import fs from 'node:fs';
import path from 'node:path';
import {
  AUDIO_PLAYBACK_RATES,
  audioSampleAmplitudes,
  audioSeekRatio,
  audioSeekTarget,
  isAudioPlaybackRate,
  mediaProgressRatio,
  mediaSeekByTarget,
  validMediaDuration,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryMediaPlayback';

let failed = 0;
function check(value: boolean, label: string) {
  if (value) console.log(`PASS: ${label}`);
  else { failed += 1; console.error(`FAIL: ${label}`); }
}
function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const root = process.cwd();
const viewerSource = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/homecloud/MemoryViewer.tsx'), 'utf8');
const viewer = codeOf(viewerSource);
const videoSource = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx'), 'utf8');
const video = codeOf(videoSource);
const audioSource = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx'), 'utf8');
const audio = codeOf(audioSource);
const cards = codeOf(fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/homecloud/MemoryCards.tsx'), 'utf8'));
const originalService = codeOf(fs.readFileSync(path.join(root, 'front/mi-front-limpio/services/homecloud/homecloudMemoryOriginal.ts'), 'utf8'));
const previewService = codeOf(fs.readFileSync(path.join(root, 'front/mi-front-limpio/services/homecloud/homecloudMemoryPreview.ts'), 'utf8'));
const scopeInvalidation = codeOf(fs.readFileSync(path.join(root, 'front/mi-front-limpio/services/homecloud/homecloudScopeInvalidation.ts'), 'utf8'));

// ===========================================================================
// ST-9.A — IMAGE ACTIVE OWNERSHIP (FINAL_PRODUCT_TRUTH §14.3, §23.3)
// ===========================================================================
console.log('\n=== ST-9.A IMAGE ACTIVE OWNERSHIP ===');

check(/function ImagePage\([^)]*active: boolean/.test(viewer), 'ImagePage receives the pager active flag');
check(/<ImagePage memory=\{memory\} accessToken=\{accessToken\} width=\{width\} active=\{active\} onTap=\{onTap\} \/>/.test(viewer), 'the Viewer passes its active-page authority to the image page');
check(/if \(!active\) return;/.test(viewer) && /if \(!active && uri === null\) return <View/.test(viewer), 'an inactive image page requests no original and renders a placeholder without content');
check((viewer.match(/getMemoryOriginalUrl\(/g) ?? []).length === 1, 'exactly one image call site requests the signed original');
check(/new AbortController\(\)/.test(viewer) && /controller\.abort\(\)/.test(viewer), 'the image original request is aborted when ownership is lost');
check(/forceRefresh: attempt > 0/.test(viewer), 'an image retry is a forced refresh, not a stale-cache hit');
check(/evictMemoryOriginalUrl\(memory\.id\)/.test(viewer) && /evictMemoryPreviewUrl\(memory\.id\)/.test(viewer), 'a failed image render evicts the poisoned URLs before the honest retry');

// Grid cards never spend an original: a missing preview is a neutral tile,
// and the Viewer active page is the only recoverable fallback.
check(/const showImage = preview\.phase === 'ready' && !imageFailed/.test(cards), 'an image card renders only a resolved preview, never a guessed URL');
check(!/getMemoryOriginalUrl/.test(cards), 'no grid card ever requests a signed original');

// ===========================================================================
// ST-9.A — IN-FLIGHT DEDUP + BOUNDED CACHE (FINAL_PRODUCT_TRUTH §23.3)
// ===========================================================================
console.log('\n=== ST-9.A DEDUP + BOUNDED CACHE ===');

for (const [label, service] of [['original', originalService], ['preview', previewService]] as const) {
  check(/Requests\.get\(contentId\)/.test(service) && /Requests\.set\(contentId, request\)/.test(service), `${label}: concurrent requests for one contentId share a single in-flight promise`);
  check(/\.finally\(\(\) => \{\s*\n?\s*\w+Requests\.delete\(contentId\);/.test(service), `${label}: the in-flight entry is released when the request settles`);
  check(/MAX_\w*_CACHE_ENTRIES/.test(service) && /trim\w*Cache\(\)/.test(service), `${label}: the signed-URL map is bounded, never LRU-invented`);
  check(/MARGIN_MS|EXPIRY_MARGIN_MS/.test(service), `${label}: expiring URLs are dropped with a margin, never served dying`);
  check(/forceRefresh/.test(service), `${label}: retry can bypass both the cache and the in-flight entry`);
  check(/evict\w*\(contentId: string\)/.test(service), `${label}: a single poisoned entry can be evicted without clearing the household`);
}
check(/previewRequests\.clear\(\)/.test(previewService) && /originalRequests\.clear\(\)/.test(originalService), 'clearing the household drops pending entries too, so a late resolve cannot repopulate a new household');
check(/clearMemoryPreviewCache\(\)/.test(scopeInvalidation) && /clearMemoryOriginalCache\(\)/.test(scopeInvalidation), 'a household switch clears both signed-URL caches');
check(/preview_unavailable/.test(previewService), 'a missing preview object resolves to unavailable instead of throwing');
check(/throw error/.test(previewService), 'a network/auth preview failure still throws so the card can retry honestly');

// ===========================================================================
// ST-9.B — VIDEO POSTER + PLAYBACK (FINAL_PRODUCT_TRUTH §15)
// ===========================================================================
console.log('\n=== ST-9.B VIDEO POSTER + PLAYBACK ===');

check(/poster = useMemoryPreviewUrl\(accessToken, memory\.id, memory\.hasPreview\)/.test(video), 'the active video page reads the real preview signal');
check(/MemoryVideoLoading width=\{width\} posterUrl=/.test(video), 'the poster is already visible while the original is still loading, not only after');
check(/posterUrl && !firstFrame/.test(video), 'the poster disappears on the first rendered frame');
check(/onFirstFrameRender/.test(video), 'the poster exit is driven by the native first frame, not a timer');
check(/ready \? null :/.test(video), 'the buffering overlay disappears exactly when the player is ready');
check(/fullscreenOptions=\{\{ enable: true \}\}/.test(video), 'native fullscreen is enabled');
check(/onFullscreenEnter/.test(video) && /onFullscreenExit/.test(video), 'fullscreen transitions are tracked');
check(/fullscreen \? null :/.test(video), 'the double-tap zones step aside while fullscreen owns the screen');
check(/memoryDevTrace\('video_ready'/.test(video), 'playback time-to-ready is instrumented with elapsed milliseconds, never a guessed cause');
check((video.match(/getMemoryOriginalUrl\(/g) ?? []).length === 1, 'exactly one video call site requests the signed original');
check(!/\.play\(\)/.test(video), 'nothing in the video page ever starts playback: only the native controls do');
check(/const showPoster = preview\.phase === 'ready' && !imageFailed/.test(cards), 'a video card consumes the real poster when one exists');
check(/playBadge/.test(cards), 'the video card keeps its play affordance with or without a poster');

// Video double-tap ±10s contract (FINAL_PRODUCT_TRUTH §15.5): pure math first.
check(mediaSeekByTarget(100, 200, -10) === 90, 'video double-tap left seeks exactly -10 seconds');
check(mediaSeekByTarget(100, 200, 10) === 110, 'video double-tap right seeks exactly +10 seconds');
check(mediaSeekByTarget(5, 200, -10) === 0, 'a backward seek clamps at zero');
check(mediaSeekByTarget(195, 200, 10) === 200, 'a forward seek clamps at duration');
check(mediaSeekByTarget(0, 0, -10) === null && mediaSeekByTarget(100, Number.NaN, 10) === null, 'an unknown duration never seeks');
check(mediaSeekByTarget(Number.NaN, 200, 10) === null && mediaSeekByTarget(100, 200, Number.NaN) === null, 'non-finite positions and deltas never seek');
check(/seekZoneLeft/.test(video) && /seekZoneRight/.test(video) && /seekBy\(zone === 'left' \? -10 : 10\)/.test(video), 'two arbitration zones feed the clamped ±10s seek, never an unclamped assignment');

// ===========================================================================
// ST-9.C — AUDIO CONTROLS (FINAL_PRODUCT_TRUTH §16)
// ===========================================================================
console.log('\n=== ST-9.C AUDIO CONTROLS ===');

check(AUDIO_PLAYBACK_RATES.join(',') === '0.5,1,1.5,2', 'the speed contract is exactly 0.5 / 1 / 1.5 / 2x');
check(isAudioPlaybackRate(1.5) && !isAudioPlaybackRate(3) && !isAudioPlaybackRate('1') && !isAudioPlaybackRate(Number.NaN), 'only contract speeds are accepted');
check(/title="-10"[\s\S]{0,120}skipBy\(-10\)/.test(audio) && /title="\+10"[\s\S]{0,120}skipBy\(10\)/.test(audio), '-10/+10 skip controls reach the clamped seek');
check(/AUDIO_PLAYBACK_RATES\.map/.test(audio), 'every contract speed is rendered, none hardcoded twice');
check(/status\.isBuffering && !status\.error/.test(audio) && /Buffering/.test(audio), 'buffering is announced honestly during playback, never confused with an error');
check(/PanResponder\.create/.test(audio) && /onPanResponderMove/.test(audio), 'seek supports a continuous drag, not only taps');
check(/seekToXRef\.current/.test(audio), 'the drag responder reads the latest seek handler, never a stale zero-width closure');
check(/memoryPrimaryText\(memory\)/.test(audio), 'the audio page carries a meaningful visual identity, not an empty bar');
check(/elapsed|formatDuration\(status\.currentTime\)/.test(audio) || /formatDuration\(status\.currentTime\) \/ /.test(audioSource), 'elapsed and total duration stay visible');
check((audio.match(/getMemoryOriginalUrl\(/g) ?? []).length === 1, 'exactly one audio call site requests the signed original');
check(!/setAudioModeAsync/.test(audio), 'the audio page never reconfigures the global audio session');
check(!/Math\.random/.test(audio), 'no synthetic sample data anywhere in the audio page');

// Real waveform math: peak amplitudes clamped into 0..1, never invented.
const buckets = audioSampleAmplitudes([{ frames: [0, 0.5, -1, 2, -0.25] }], 2);
check(buckets.length === 2 && buckets.every((v) => v >= 0 && v <= 1), 'sample amplitudes are real clamped peaks, never synthetic');
check(audioSampleAmplitudes([], 8).length === 0 && audioSampleAmplitudes([{ frames: [] }]).length === 0, 'silence produces no bars, never placeholder bars');
check(audioSampleAmplitudes([{ frames: [0.2] }, { frames: [0.8] }], 24).length <= 24, 'multi-channel frames merge into a bounded bar count');

// Pre-existing pure contracts still hold next to the new helpers.
check(audioSeekRatio(50, 100) === 0.5 && audioSeekTarget(0.5, 200) === 100, 'tap-seek math is untouched');
check(mediaProgressRatio(50, 200) === 0.25 && validMediaDuration(-1) === null, 'progress math is untouched');

// ===========================================================================
// ST-9 P3 REGRESSION — VIEWER STILL HIDES GLOBAL CHROME, KEEPS CALLERS
// ===========================================================================
console.log('\n=== ST-9 P3 VIEWER REGRESSION ===');

check(!/TabBar|BottomTab|MainFloating|SegmentedControl/.test(viewerSource), 'the Viewer renders no global navigation chrome of its own');
check(/useSafeAreaInsets/.test(viewer), 'the Viewer still consults safe-area insets');
check(viewerSource.includes('{source.label}'), 'the Viewer chrome still names the actual caller');
check(/active=\{item\.id === activeContentId\}/.test(viewer), 'every page still receives the active-page authority');
check(/memory\.kind === 'video'/.test(viewer) && /memory\.kind === 'audio'/.test(viewer), 'video and audio pages survive for every caller: root, album, type, trash, favorites, resurfacing');

if (failed) process.exitCode = 1;
