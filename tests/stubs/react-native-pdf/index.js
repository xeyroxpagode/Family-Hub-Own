'use strict';

/**
 * `react-native-pdf` — the native PDF renderer used by the HomeCloud Files Viewer.
 *
 * The node host has no PDF engine, so this is the device boundary and nothing else.
 * It RETAINS the props it was given instead of discarding them, because a Viewer test
 * that asserts "the renderer was pointed at the local staged file" has to be able to
 * read them; a stub that dropped them would make that class of assertion impossible to
 * write honestly.
 *
 * This is NOT a renderer. It records what production asked for and reports nothing back:
 * no page count, no error, no text. Any suite that needs a render verdict mounts the
 * Viewer with its own stub (see `scripts/homecloud_files_viewer_branch_tests.ts`).
 */
function Pdf(props) {
  return { type: 'Pdf', props: { ...props, children: undefined } };
}

module.exports = { __esModule: true, default: Pdf, Pdf };
