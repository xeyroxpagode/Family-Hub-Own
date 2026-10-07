# HOMECLOUD FILES — STAGE 2 SLICE C EXPO-GO CORRECTION

> Status: `SOURCE PASS / TEST PASS / BUNDLE PASS / EXPO-GO-COMPATIBLE BY ARCHITECTURE / DEVICE ACCEPTANCE PENDING`.
> Every physical-device row is `UNPROVEN_DEVICE` until a human runs it on the iPhone
> (see `HOMECLOUD_FILES_STAGE2_DEVICE_QA.md`).

## 0. WHY (ROOT CAUSE)

Stage 2 Slice C rendered PDFs with `react-native-pdf` (+ `react-native-blob-util` peer
+ `@config-plugins/react-native-pdf`). That is a good native architecture — and it is
unusable in the current development/QA workflow: the primary QA device is a physical
iPhone driven through **Expo Go** from Windows, with no macOS/Xcode and no
development-build loop. Expo Go ships a FIXED native runtime; any module outside it
(`react-native-pdf`, `react-native-blob-util`) fails at import time with a missing-module
red screen. The native renderer therefore had to go — not for quality reasons, but as a
hard environment constraint:

**HOMEPLUS MUST REMAIN RUNNABLE IN EXPO GO FOR THE CURRENT DEVELOPMENT/QA WORKFLOW.**

The correction changes the rendering ENGINE, not the product: PDF stays inside the
HomePlus Viewer shell, private, staged from the existing grant architecture, with no
browser, no cloud renderer, no CDN, no download-first UX.

## 1. ARCHITECTURE SELECTED

```
HomeCloudFileViewer (shell: header, safe area, back, grant, staging, handoff)
        ↓ staged file://…/HomeCloudViewer/viewer-<id>.pdf (UNCHANGED grant/staging)
ViewerPdfSurface (screens/HomeCloudFileViewerScreen.tsx)
        ↓ bounded chunked base64 bridge (homecloudPdfTransport.ts)
        ↓ versioned protocol v1 (homecloudPdfBridge.ts)
WebView (react-native-webview@13.16.1 — the exact build Expo Go SDK 57 ships)
        ↓ local page (homecloudPdfViewerHtml.ts)
        ↓ vendored pdf.js 3.11.174 UMD inlined (pdfJsEngine.generated.ts)
        ↓ per-page canvas, lazy, fit-to-width, DPR-aware
HomePlus-owned chrome only (no pdf.js toolbar/sidebar/branding anywhere)
```

Why this over the alternatives:

- **Native module (status quo ante):** rejected — not loadable in Expo Go, the hard gate.
- **Remote/cloud viewer (Google/M365/CDN pdf.js):** rejected — privacy violation; a
  household document must never leave the device except through explicit share.
- **WebView + remote pdf.js URL:** rejected — same privacy/network problem, plus offline breaks.
- **WebView + local file:// PDF + `allowingReadAccessToURL`:** evaluated second. It keeps
  bytes out of JS memory entirely, which is attractive — but file-origin read-scope
  behavior differs between Expo Go's managed sandbox and dev builds, and it CANNOT be
  proven from Windows without the physical device. Rejected for V1 for determinism;
  explicitly left as the future optimization if device QA ever shows memory pressure.
- **WebView + bundled pdf.js + bounded chunked byte bridge (CHOSEN):** deterministic,
  fully offline, testable in Node (protocol/transport/policy are pure), bounded by an
  explicit ceiling, private by construction. Its cost — bytes cross JS memory twice —
  is capped by the ceiling below instead of wished away.

## 2. PDF.JS DELIVERY

- Pinned through the dependency system: `pdfjs-dist@3.11.174` (exact) as a devDependency
  — dev because the app never imports it at runtime (it is DOM code); it is a vendoring
  source, and the manifest pin + lockfile entry are the provenance.
- `scripts/vendor-pdfjs.cjs` copies `build/pdf.min.js` (UMD, sets the `pdfjsLib` global,
  320 KiB, zero `https://` references) into
  `services/homecloud/pdfJsEngine.generated.ts` with version + sha256 in the header.
  The suite re-hashes the installed build and FAILS on mismatch (X-Eo).
- The Viewer HTML is built by `buildPdfViewerHtml()` (pure, tested): engine inlined,
  no `<script src>`, no `<link>`, no fetch/XHR/WebSocket in our runtime, exactly two
  `</script>` closers.
- **Worker decision: DISABLED** (`disableWorker: true`, `GlobalWorkerOptions.workerSrc = null`).
  A worker inside a `source={{html}}` WebView needs a blob/file-origin handshake that is
  brittle across iOS/Android WebView versions; single-threaded rendering of a bounded
  (≤ 8 MiB) document is deterministic and fast enough. Documented tradeoff, revisit only
  with device evidence.
- **Fonts/CMaps decision: NOT bundled, NO remote URL configured.** pdf.js therefore never
  fetches anything; documents relying on non-embedded exotic glyphs may show substituted
  glyphs with correct metrics/layout. Deliberate V1 offline tradeoff, stated in the
  generated header and here — not a silent gap.

## 3. BYTE TRANSPORT (THE CAREFUL PART)

`readStagedPdfForBridge()` (`homecloudPdfTransport.ts`):

1. Gates on the REAL staged size (`File.size`), never metadata: `empty → PdfEmptyError`,
   `> ceiling → PdfTooLargeError`, both BEFORE any read.
2. Streams via `readableStream()` (the same structural property the text path proved:
   whole-file readers would trip the heap guard), base64-encodes incrementally with a
   3-byte carry (`createBase64StreamEncoder`, proven byte-exact vs one-shot in X-Ca),
   splits into ≤ ~342 KiB messages (256 KiB raw).
3. Aborts mid-stream if the running total passes the ceiling anyway (file grew, size lied).
4. Releases the reader in `finally`; the shell drops the payload after sending and on
   unmount (no double-retention, no close-during-load leak).

RN→Viewer uses `WebView.postMessage` (structured `message` events, iOS + Android); document
bytes travel ONLY as `LOAD_CHUNK { index, data }` under an `INIT_DOCUMENT` session with a
per-document `docId`. Stale/foreign sessions are ignored on both sides; `DISPOSE` is sent
best-effort on unmount/uri-change and the WebView is additionally `key`ed by session, so a
reopened PDF can never show previous pixels (proven: V-L2c, V-L6o/p).

## 4. MEMORY MODEL (WHY 8 MiB IS CONSERVATIVE)

`INLINE_PDF_PREVIEW_MAX_BYTES = 8 MiB` (`homecloudPdfPolicy.ts`, pure + tested incl. the
exact boundary). It is NOT a new number: it equals the already-accepted
`VIEWER_TEXT_TRANSFER_BYTE_LIMIT`, so the Viewer pulls no more over the wire for a PDF
than it already may for text. Worst case for an 8 MiB file, all transient: 8 MiB raw +
~10.7 MiB base64 (RN) + ~10.7 MiB reassembled (WebView) + 8 MiB decoded + ~3 visible
canvases at ≤2x DPR ≈ **40–45 MiB peak, ~20 MiB steady** — comfortable on 2 GiB iPhones
while covering the realistic corpus (statements/contracts/scans are overwhelmingly
< 5 MiB). Marked V1-conservative: raise ONLY with physical profiling, never by optimism.
Above the ceiling: no transfer is attempted; the polished too-large state + existing
Open/Share handoff appears (X-Dg/h, V-L6c–e).

## 5. UX PARITY (WHAT THE MEMBER SEES)

- **Loading:** Viewer shell immediately; WebView page opens on HomePlus canvas color
  (no white flash) with a shimmer skeleton; no browser chrome, no raw HTML.
- **Ready:** pages centered on neutral background, fit-to-width, lazy render
  (visible ± 1), DPR-aware up to 2x, far canvases released, minimal `n / m` pager only
  for multi-page docs. Double-tap toggles 2x with crisp re-render; pinch is native
  WebView zoom; rotation/container resize re-renders visible pages.
- **Errors:** password → dedicated "protegido" state; corrupt/unsupported/timeout →
  "No pudimos abrir este PDF" (+ the two honest reasons); too-large → dedicated state;
  every failure keeps the explicit "Abrir o compartir con…" handoff; never a stack
  trace, never a blank screen, never an indefinite spinner (READY 15 s + LOAD 30 s clocks).
- **Links:** annotation links become overlays; external taps → `LINK_PRESSED` →
  explicit `Linking.openURL` handoff (only http/https survive validation); internal
  destinations scroll; `window.open` neutralized; all other navigation returns false.
- **Close/reopen:** immediate close, DISPOSE + staging cleanup, fresh session per
  document (no stale content by construction).

## 6. SECURITY / PRIVACY

- Grant + staging architecture UNTOUCHED (same endpoint, `variant=original`, same
  deterministic cache slot, same discard discipline). No second cache, no second truth store.
- Engine and document both local; no analytics/upload of bytes; logs carry byte counts
  and event names only (never payload, URLs with credentials, or content).
- WebView lockdown (asserted statically in X-Fi–j + mounted in V-L1g–i):
  `originWhitelist=['about:blank']`, `baseUrl: 'about:blank'`, file access OFF (all three
  flags), no multi-window, no JS-opened windows, no cookies/DOM storage, every load
  request denied. Signed URLs never enter the renderer (V-L1e).

## 7. DEPENDENCY DELTA

- Removed: `react-native-pdf`, `react-native-blob-util`, `@config-plugins/react-native-pdf`
  (package.json + lockfile + app.config.js plugins + imports + stub mock deleted).
- Added: `react-native-webview@13.16.1` (exact — the version `expo/bundledNativeModules.json`
  pins for SDK 57, i.e. the native code inside Expo Go; proven equal in X-Fd).
- Added (dev): `pdfjs-dist@3.11.174` (exact; vendoring source only).
- Retained: `expo-video`, `expo-audio`, `expo-file-system`, `expo-sharing`,
  `react-native-safe-area-context` — all present in Expo Go (X-Fl).

## 8. TEST EVIDENCE (AUTOMATED)

- `homecloud-files-viewer`: **300/300 PASS** — prior suites kept green (V-A–V-L adapted to
  the real new boundary, never to mocks of it) + V-M/X-A–X-F (protocol/policy/transport/
  page/compat-gate) + V-L6 (password, oversized, links, hostile input, READY/LOAD
  timeouts against the real surface with controlled clocks, close-during-load, reopen).
  Deterministic fixture PDFs (1-page, 2-page, truncated-corrupt) are hand-built bytes;
  no test touches the network.
- `homecloud-files-ux` 158/158, `slice1-selection-bulk` 178/178, `favorites` 100/100,
  `favorites-ui` 157/157, `freshness` 100/100, `hierarchy-ui` 129/129 — all PASS.
- Front `tsc --noEmit`: clean. Viewer test-bundle `tsc`: clean.
- `npx expo export`: bundles for web + iOS + Android; all three artifacts contain the
  `pdfjsLib` engine and NONE contain `react-native-pdf`/`blob-util` strings.
- `npx expo-doctor`: 2 findings, both PRE-EXISTING and out of scope (missing direct
  `expo-asset` peer for expo-audio; expo patch-level drift). No WebView/SDK complaint.
- Root `typecheck` "Test TypeScript" step fails ONLY in `scripts/planner_v1_navigation_tests.ts`
  (untouched, unrelated lane) — pre-existing, reported, not expanded into.
- `homecloud-stage2-integrated` cannot run here: LOCAL_RUNTIME_REQUIRED (needs local
  Supabase; the env guard aborts before any assertion). Its P4 assertion was updated to
  the new boundary and syntax-checked.

## 9. WHAT REMAINS PHYSICAL-DEVICE-ONLY (UNPROVEN_DEVICE)

- That pdf.js paints crisp pages on the real iPhone at 1x/2x, pinch/double-tap/pan feel
  right, multi-page scroll is smooth, safe-area/rotation geometry is correct.
- That 8 MiB is the right ceiling under real memory pressure (conservative by design).
- That no Expo Go native-module error appears on boot/open/close/share for PDFs.
- The full §19 checklist in `HOMECLOUD_FILES_STAGE2_DEVICE_QA.md` — all rows
  `UNPROVEN_DEVICE` until the human runs them.

## 10. FILES

| File | Role |
|---|---|
| `screens/HomeCloudFileViewerScreen.tsx` | Shell + new `ViewerPdfSurface` (exported for tests), stable failure callback |
| `services/homecloud/homecloudPdfPolicy.ts` | Ceiling, timeouts, eligibility, engine-error map, product copy |
| `services/homecloud/homecloudPdfBridge.ts` | Protocol v1, validators, streaming base64, URL allowlist, escaping |
| `services/homecloud/homecloudPdfViewerHtml.ts` | Self-contained local page + locked-down runtime |
| `services/homecloud/homecloudPdfTransport.ts` | Bounded staged-file → chunks |
| `services/homecloud/pdfJsEngine.generated.ts` | Vendored engine (DO NOT EDIT; `scripts/vendor-pdfjs.cjs` regenerates) |
| `scripts/vendor-pdfjs.cjs` | Provenance-guarded vendoring |
| `scripts/homecloud_files_pdf_expo_go_tests.ts` | X-A–X-F evidence |
| `scripts/homecloud_files_viewer_branch_tests.ts` | V-L1/V-L2/V-L6 drive the real new boundary |
| `tests/stubs/react-native-webview/index.js` | Boundary stub (records, never renders) |
| `tests/stubs/react-native-pdf/` | DELETED |

## 11. DECISION LOG (tradeoffs taken under the §24 priority order)

1. Privacy/security first: no remote anything; strictest WebView flags; URL allowlist.
2. Expo Go compatibility second: only Go-shipped natives; exact WebView pin.
3. Bounded memory third: 8 MiB ceiling + mid-stream abort + payload drop.
4. Then quality: lazy DPR-aware render, double-tap re-render, intentional states.
5. Known V1 costs, stated not hidden: possible glyph substitution on exotic non-embedded
   fonts (no font blobs shipped); pinch-zoom softness until next render (native zoom +
   debounced re-render); file-URI zero-copy kept as future work (§1).
