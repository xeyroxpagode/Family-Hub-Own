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
const host = code.slice(
  code.indexOf("visible={sheet === 'source' || sheet === 'binary'}"),
  code.indexOf("visible={sheet === 'recorder'}"),
);
/** The unified host's single close policy. */
const closePolicy = code.slice(code.indexOf('const handleSourceBinaryRequestClose'));

console.log('\n=== HOMECLOUD S0 SINGLE MODAL HOST CONTRACT TESTS ===\n');

// ===========================================================================
// C. STABLE source|binary MODAL HOST
// ===========================================================================

record((code.match(/visible=\{sheet === 'source' \|\| sheet === 'binary'\}/g) ?? []).length === 1, 'exactly ONE native modal host for source|binary');
record((code.match(/visible=\{sheet === 'source'\}/g) ?? []).length === 0, 'the separate source Modal host is gone (it was half of the race)');
record((code.match(/visible=\{sheet === 'binary'\}/g) ?? []).length === 0, 'the separate binary Modal host is gone (it was half of the race)');
record((host.match(/<ActionSheet/g) ?? []).length === 1, 'that host is one ActionSheet, not a nested or duplicated one');

// source -> binary is a content transition, so presentation props vary by content.
record(/\{sheet === 'binary' \? \(/.test(host), 'the host renders binary content vs source content by ternary');
record(host.includes("title={sheet === 'binary' ? 'Revisar recuerdo' : 'Elegir contenido'}"), 'the host switches title by content');
record(host.includes("size={sheet === 'binary' ? 'scrollable-content' : 'content'}"), 'the host switches size by content');
record(host.includes('keyboardAware={sheet === '), 'the host switches keyboard awareness by content');
record(host.includes('footer={sheet === '), 'the host switches footer by content (the source content has no Guardar)');
record(host.includes('subtitle={sheet === '), 'the capture-date subtitle belongs to the binary content only');

// The transition itself is one plain content change that never runs close logic.
record(/setBinaryDraft\(draft\);[\s\S]{0,300}setSheet\('binary'\);/.test(code), 'gallery and camera commit the draft, then switch the host content to binary');
record(!/setSheet\(null\)[\s\S]{0,120}setSheet\('binary'\)/.test(code), 'the transition has no dismiss-then-present step');
record(!/gallery-handoff|pendingBinaryReview|completeGalleryBinaryHandoff/.test(code), 'no intermediate handoff sheet or pending draft exists');

// gallery image and gallery video share this host and this Review primitive.
record(host.includes('<MemoryMediaReview'), 'the binary Review lives inside the same host as the source chooser');
record(host.includes('title={binarySubmitLabel(state.status)}'), 'the Guardar footer is inside the same host as the Review');
record(review.includes('const kind = draft.artifact.mimeType.startsWith'), 'the Review picks a player by MIME, shared by every source and both kinds');
record(!/draft\.source ===/.test(stripComments(review)), 'the Review never branches its player on the source');
record(review.includes('pointerEvents="none"') && review.includes('fullscreenOptions={{ enable: false }}'), 'the video preview keeps touch routing correct and does not hijack fullscreen');
record(actionSheet.includes('backdropDismiss') && actionSheet.includes('modalOverlay'), 'the host keeps its backdrop overlay, so the background HomeCloud receives no taps');

// The close policy varies by content, and a submitting binary is not discardable.
record((host.match(/onRequestClose=/g) ?? []).length === 1, 'the host has exactly ONE close handler');
record(host.includes('onRequestClose={handleSourceBinaryRequestClose}'), 'that handler is the content-aware close policy');
record(closePolicy.includes("sheet === 'source'") && closePolicy.includes("setSheet('create')"), 'closing the source content returns to create');
record(closePolicy.includes("sheet === 'binary' && !active") && closePolicy.includes('closeReview()'), 'closing an idle binary content abandons the review');
record((closePolicy.slice(0, closePolicy.indexOf('const abandonRecorder')).match(/closeReview\(\)/g) ?? []).length === 1, 'there is exactly one door into closeReview, guarded by `!active`');
record(host.includes("closeDisabled={sheet === 'binary' && active}"), 'a submitting binary cannot be discarded from any close affordance');
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