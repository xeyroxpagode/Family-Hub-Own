'use strict';

/**
 * `react-native-webview` — the locked-down renderer host for the HomeCloud PDF Viewer.
 *
 * The node host has no WebView, so this is the device boundary and nothing else.
 * It RETAINS the props it was given instead of discarding them, because a Viewer test
 * that asserts "the renderer loads LOCAL html, navigates nowhere and reports through
 * the versioned protocol" has to be able to read them; a stub that dropped them would
 * make that class of assertion impossible to write honestly.
 *
 * This is NOT a renderer. It records what production asked for and reports nothing back:
 * no READY, no pages, no error. Any suite that needs a renderer verdict mounts the
 * Viewer with its own stub (see `scripts/homecloud_files_viewer_branch_tests.ts`).
 */
function WebView(props) {
  return { type: 'WebView', props: { ...props, children: undefined } };
}

module.exports = { __esModule: true, default: WebView, WebView };
