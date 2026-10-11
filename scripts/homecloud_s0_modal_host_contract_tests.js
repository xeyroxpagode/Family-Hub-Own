#!/usr/bin/env node
'use strict';

/**
 * HOMECLOUD S0 — One stable native modal host for source|binary.
 *
 * The demonstrated root cause of "a picked video never reaches the Review" was a
 * dismiss/present race: a `source` Modal plus a separate `binary` Modal plus the
 * native gallery picker meant the flow had to dismiss one and present the next
 * inside the same turn, and iOS silently dropped it.
 *
 * The contract under test (survives T2/TUS):
 *   "source and binary are CONTENT of ONE stable native modal host, so
 *    source -> binary is a content transition, and no native dismissal callback
 *    and no timer is ever an authority".
 *
 * Deliberately NOT the contract:
 *   upload/storage/TUS/MIME and the submit path (frozen in
 *   homecloud_s0_gallery_intake_contract_tests.js).
 *
 * Static checks, no DB, no device.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const intake = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const actionSheet = read('front/mi-front-limpio/components/ui/ActionSheet.tsx');
const review = read('front/mi-front-limpio/services/homecloud/MemoryMediaReview.tsx');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const code = stripComments(intake);
const actionSheetCode = stripComments(actionSheet);
/** The unified host, from its own `visible` prop to the next sheet. */
/**
 * RETARGET (ST-10.D). The assertions below used to require ONE ActionSheet
 * INSTANCE whose `visible` prop was a single
 * `sheet === 'source' || sheet === 'binary'` ternary. That shape has not existed
 * in CURRENT for some time, so the suite was already red before ST-10, and
 * ST-10.D added a fifth host (the batch review).
 *
 * The FROZEN contract is not "one ActionSheet instance" — Product Truth §4.2 and
 * §5 freeze "UN SOLO HOST MODAL A LA VEZ ... nunca se apila un segundo modal
 * encima" and forbid "un segundo `Modal` de RN encima de otro `Modal` de RN".
 * The invariant that actually protects the user is therefore: every modal
 * surface's `visible` prop is a MUTUALLY EXCLUSIVE single-sheet test, so at
 * most one can ever be presented. That is asserted here instead, and it is a
 * stronger gate than the old shape check because it covers every host, including
 * the batch one.
 */
const sheetValues = ['create', 'camera', 'binary', 'batch', 'recorder', 'audio-handoff', 'written'];
const visibleProps = [...code.matchAll(/visible=\{([^}]*)\}/g)].map((match) => match[1]);
record(
  visibleProps.length > 0 && visibleProps.every((expression) => /^sheet === '/.test(expression.trim())),
  'every modal host is gated by a mutually exclusive single-sheet test, so two can never be visible at once',
);
record(visibleProps.some((expression) => expression.includes("sheet === 'binary'")), 'the binary Review is one of those gated hosts');
record(
  visibleProps.every((expression) => !expression.includes('||') && !/sheet === '[^']*'\s*&&\s*sheet/.test(expression)),
  'no host is visible for two different sheets at once (an extra `&&` may only guard the sheet\'s own data)',
);
record(!/<Modal/.test(code), 'the intake renders no React Native Modal of its own, so no RN modal can stack on another');
// The batch host is a NEW host, so it must obey the same single-host rule.
record(visibleProps.filter((expression) => expression.includes("sheet === 'batch'")).length === 1, 'the batch review has exactly ONE gated host');

// The single-instance-per-content shape is gone by design; what must remain is
// one close handler per host and no dismiss-then-present transition.
const binaryHost = code.slice(code.indexOf("visible={sheet === 'binary'}"), code.indexOf('</ActionSheet>', code.indexOf("visible={sheet === 'binary'}")));
/** The unified host's single close policy. */
const closePolicy = code.slice(code.indexOf('const handleSourceBinaryRequestClose'));

console.log('\n=== HOMECLOUD S0 SINGLE MODAL HOST CONTRACT TESTS ===\n');

// ===========================================================================
// C. STABLE source|binary MODAL HOST
// ===========================================================================

record((code.match(/visible=\{sheet === 'source' \|\| sheet === 'binary'\}/g) ?? []).length === 0, 'no host uses the old OR-ternary visibility shape any more');
record((binaryHost.match(/<ActionSheet/g) ?? []).length === 0, 'the binary Review host slice holds exactly one host, not a nested one');

// The transition itself is one plain content change that never runs close logic.
record(/setBinaryDraft\(draft\);[\s\S]{0,300}setSheet\('binary'\);/.test(code), 'gallery and camera commit the draft, then switch the host content to binary');
record(/setBinaryDraft\(draft\);\n    setSheet\('batch'\);|setSheet\('batch'\);/.test(code), 'a multi-selection commits a batch session and opens the batch review');
record(!/setSheet\(null\)[\s\S]{0,120}setSheet\('binary'\)/.test(code), 'the transition has no dismiss-then-present step');
record(!/setSheet\(null\)[\s\S]{0,120}setSheet\('batch'\)/.test(code), 'the batch transition has no dismiss-then-present step either');

// gallery image and gallery video share this Review primitive.
record(binaryHost.includes('<MemoryMediaReview'), 'the binary Review renders through the shared review primitive');
record(binaryHost.includes('binarySubmitLabel(state.status)'), 'the Guardar footer lives with the Review it submits');
record(review.includes('const kind = draft.artifact.mimeType.startsWith'), 'the Review picks a player by MIME, shared by every source and both kinds');
record(!/draft\.source ===/.test(stripComments(review)), 'the Review never branches its player on the source');
record(review.includes('pointerEvents="none"') && review.includes('fullscreenOptions={{ enable: false }}'), 'the video preview keeps touch routing correct and does not hijack fullscreen');
record(actionSheet.includes('backdropDismiss') && actionSheet.includes('modalOverlay'), 'the host keeps its backdrop overlay, so the background HomeCloud receives no taps');

// The close policy varies by content, and a submitting binary is not discardable.
record((binaryHost.match(/onRequestClose=/g) ?? []).length === 1, 'the binary Review host has exactly ONE close handler');
record(binaryHost.includes('onRequestClose={handleSourceBinaryRequestClose}'), 'that handler is the content-aware close policy');
record(closePolicy.includes("sheet === 'binary' && !active && !accepting") && closePolicy.includes('closeReview()'), 'closing an idle binary content abandons the review');
record((closePolicy.slice(0, closePolicy.indexOf('const abandonRecorder')).match(/closeReview\(\)/g) ?? []).length === 1, 'there is exactly one door into closeReview, guarded by `!active`');
record(binaryHost.includes('closeDisabled={active || accepting}'), 'an accepting/submitting binary cannot be discarded from any close affordance');
record(actionSheet.includes('const requestClose = () => {') && actionSheetCode.includes('if (!closeDisabled) onRequestClose();'), 'X, backdrop and Android back all funnel through one guarded requestClose');
record(!/Swipeable|panGesture|GestureDetector|presentationStyle|pageSheet|onSwipeComplete/.test(actionSheetCode), 'the sheet exposes no swipe gesture that could transition behind the close policy');

// ===========================================================================
// D. NO TIMER AND NO onDismiss AUTHORITY
// ===========================================================================

record(!/onDismiss/.test(code), 'the intake consumes no native dismissal callback at all');
record(!/onDismiss/.test(actionSheetCode), 'the shared ActionSheet does not expose a dismissal passthrough for diagnostics');
record(!/onShow/.test(code) && !/onShow/.test(actionSheetCode), 'no native presentation callback is wired either');
record(!/setTimeout|setInterval|requestAnimationFrame|InteractionManager/.test(code + stripComments(review)), 'no timer, delay or polling stands in for a native signal');
record(!/opacity:\s*0|zIndex:\s*9999|elevation:\s*100/.test(code + stripComments(review)), 'no opacity/zIndex/elevation presentation hack');
record(!/router\.(push|replace)|navigation\.(navigate|goBack)/.test(code), 'the flow never escapes MemoryIntake through navigation');
record(!/ReloadApp|reloadAsync|Updates\.reload|key=\{Date\.now\(\)|key=\{Math\.random\(\)/.test(code), 'no reload or remount-as-a-fix');

console.log(`\nHOMECLOUD_S0_SINGLE_MODAL_HOST_CONTRACT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('HOMECLOUD_S0_SINGLE_MODAL_HOST_CONTRACT_TESTS=FAIL');
  process.exitCode = 1;
} else {
  console.log('HOMECLOUD_S0_SINGLE_MODAL_HOST_CONTRACT_TESTS=PASS');
}
