# HOMECLOUD FILES — STAGE 2, SLICE C: PDF RENDERER DECISION AUDIT

> Read this before touching a dependency. It is a decision record, not a wish list.
> Every "proved" line below names where the proof came from; every inference is
> labelled as one.

## WHAT WAS ACTUALLY AVAILABLE (inspected, not remembered)

| Fact | Value | Source |
|---|---|---|
| Expo SDK | `~57.0.25` | `front/mi-front-limpio/package.json` |
| React Native | `0.86.3` (New Architecture mandatory since SDK 55) | same + Expo SDK 57 release notes |
| React | `19.2.3` | same |
| Native workflow | `expo run:android` / `expo run:ios`, `expo-dev-client ~57.0.19`, `eas.json` | `package.json` scripts, `app.config.js` |
| Already installed media | `expo-video ~57.0.5`, `expo-audio ~57.0.5`, `expo-file-system ~57.0.7`, `expo-sharing ~57.0.22`, `react-native-safe-area-context ~5.7.0` | same |
| Already installed PDF renderer | **none** | `package.json` |

## OPTIONS COMPARED

### A. A maintained native local-file PDF renderer

| Candidate | Version | Last published | Evidence gathered |
|---|---|---|---|
| `react-native-pdf` (wonday) | `7.0.5` | **2026-08-13** | Community default, 100+ releases. Its own changelog lists New-Architecture/Fabric fixes (`#1011`, `#1012`, `#1019`, `#1022`, `#1027`, `#1031`, `#1032`), including "avoid loading legacy `PdfView` on Fabric path" (#1022), which its author **verified builds, launches and renders in an Expo SDK 56 / RN 0.85 New Architecture app**. Published 2026-08-13, i.e. **after** React Native 0.86 shipped. Accepts a `file://` URI on BOTH platforms. Peer: `react-native-blob-util >= 0.13.7` (latest `0.25.1`, published **2026-09-24**). Runtime deps: `crypto-js`, `deprecated-react-native-prop-types` — no further native surface. Ships an Expo config plugin: `@config-plugins/react-native-pdf@14.0.2`, `peerDependencies: { expo: ">=56" }` — satisfied by SDK 57. |
| `react-native-pdfrender` | `1.0.3` | 2026-06-02 | Purpose-built for the New Architecture, **zero** runtime dependencies, RN `>=0.70`. But: created 2026-05-17, i.e. **~4 months old with a single minor line**; no documented password support; requires the caller to stage the file first. Too little release history to call "maintained CURRENT-compatible" for a privacy-critical surface. |

### B. `react-native-webview` + a locally bundled pdf.js

Rejected, and the reason is the decision priorities rather than taste:

- It is **strictly more moving parts**: a native WebView dependency **plus** a large
  JavaScript renderer, **plus** a worker bundle, **plus** Metro configuration to serve
  both from inside the app with no CDN.
- pdf.js needs the document bytes. The only WebView-safe channel is a `file://` URL with
  explicit `allowFileAccess` (Android) / `allowingReadAccessToURL` (iOS) plus an
  `injectedJavaScript` bootstrap. That is exactly the arrangement where a mistake
  silently becomes "the whole PDF base64'd into JS memory" — the same class of defect
  Slice B's predecessor was reopened for.
- Its own worker story (`GlobalWorkerOptions.workerSrc`, or a `workerPort`) is a bundler
  integration that cannot be verified in this environment at all.

Option B was not chosen because it is *worse*, but because it fails priority 11
(acceptable dependency surface) and priority 5 (avoids full PDF duplication in JS memory)
with nothing to show in exchange.

## DECISION

**`react-native-pdf@7.0.5`, reading the LOCAL STAGED FILE.**

Why it wins on the ordered priorities:

1. **Private/local bytes only** — it is pointed at `file:///…/HomeCloudViewer/viewer-<id>.pdf`,
   the deterministic temporary-cache slot the Viewer already creates. No third-party
   endpoint is ever contacted.
2. **No third-party endpoint / no CDN** — it is a native module. There is no script to host.
3. **No remote script, no remote viewer** — n/a for a native renderer, by construction.
4. **Accepts the local staged file** — `file://` URI is a first-class source on both
   platforms. This is the decisive advantage over option B.
5. **No full PDF duplication in JS memory** — Android renders through
   `android.graphics.pdf.PdfRenderer` and iOS through PDFKit, both reading from the file
   descriptor. The bytes never enter the JS heap. This is the property the previous
   closure got wrong, and it is structural here rather than a promise.
6. **Android + iOS on current versions** — Fabric path fixed and verified on Expo SDK 56 /
   RN 0.85 New Architecture; SDK 57 is documented by Expo as bringing RN 0.86 **with no
   breaking changes from 0.85**, so carrying that verification forward is a reasoned
   inference, not a fresh proof.
7. **Zoom** — `enableDoubleTapZoom`; native pinch/zoom on both platforms.
8. **Page navigation** — `enablePaging` (default), native vertical paging.
9. **Reliable teardown** — the component is unmounted by the existing Viewer lifecycle
   effect, and the native view goes with it.
10. **Maintained CURRENT compatibility** — see the dates above.
11. **Acceptable dependency surface** — one native module, one native peer, one Expo
    config plugin. Nothing that reaches a network.

### Honest limits of this decision

- **INFERENCE, not proof:** "7.0.5 works on SDK 57 / RN 0.86". The maintainer proved SDK
  56 / RN 0.85. Expo states 0.86 has no breaking changes from 0.85. No build or run of a
  native module is possible in this environment, so **the native build itself is
  `DEVICE_PENDING`** and is listed as such in the device checklist.
- **Expo Go:** the Viewer will NOT render a PDF in Expo Go; the branch reports the honest
  handoff instead of a blank screen. The project already ships a dev client.
- **Dev-build implication:** adding a native module requires a new native build
  (`expo run:android` / `run:ios`). That is the project's canonical workflow; Expo Go is
  not a supported target for this app anyway.
- **Password-protected PDFs:** no password workflow is being built. If the renderer cannot
  open the document, the Viewer says so specifically and offers the system hand-off. It
  never shows a blank surface.

## BOUNDED-MEMORY POLICY (the property the reopen is about)

- No `arrayBuffer()`, no `base64`, no `bytesSync()` anywhere on the PDF path.
- No artificial byte ceiling, because none is needed: the renderer streams from the staged
  file. Inventing a ceiling here would be a fake limit on a path that has no heap cost.
- The staged copy lives in `Paths.cache/HomeCloudViewer/viewer-<contentId>.pdf`, is named
  deterministically from the content id, and is deleted when the Viewer closes or the
  target changes — exactly the contract the text path already uses.
