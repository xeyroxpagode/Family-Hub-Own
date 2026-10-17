# A. VIEWER CLOSURE SPEC

## 1. CURRENT SUPPORT MATRIX

| Format Family | Classification | Inline Preview | System Handoff | Evidence Status |
|---|---|---|---|---|
| **image** (jpg/png/heic/webp/…) | `image` | ✅ `expo-video`/`Image` from signed URL | ✅ `Sharing.shareAsync` staged copy | Source: implemented, **UNPROVEN_DEVICE** |
| **video** (mp4/mov/m4v/…) | `video` | ✅ `expo-video` native controls | ✅ staged → share | Source: implemented, **UNPROVEN_DEVICE** |
| **audio** (mp3/m4a/wav/…) | `audio` | ✅ `expo-audio` play/pause | ✅ staged → share | Source: implemented, **UNPROVEN_DEVICE** |
| **pdf** | `pdf` | ✅ WebView + bundled pdf.js 3.11.174 (≤8 MiB) | ✅ staged → share | Source: implemented, **UNPROVEN_DEVICE** (V6–V10) |
| **text/csv/markdown** | `text`/`csv`/`markdown` | ✅ bounded UTF-8 prefix (512 KiB), native selectable | ✅ staged → share | Source: implemented, **UNPROVEN_DEVICE** (V10–V12) |
| **office_document** (doc/docx/odt/rtf/…) | `office_document` | ❌ refused — no client renderer | ✅ staged → share | **unsupported** (by design, privacy-safe) |
| **office_sheet** (xls/xlsx/ods/…) | `office_sheet` | ❌ refused | ✅ staged → share | **unsupported** |
| **office_presentation** (ppt/pptx/odp/…) | `office_presentation` | ❌ refused | ✅ staged → share | **unsupported** |
| **svg/html/xml** (active web) | `unsupported` + `activeWebContent=true` | ❌ refused with reason | ✅ staged → share | **unsupported** (security) |
| **other/unknown** | `unsupported` | ❌ honest reason | ✅ staged → share | **unverified** |

**Key invariants (source-verified):**
- Original bytes only (`variant=original`), never preview variant
- Staged to `Paths.cache/HomeCloudViewer/viewer-<contentId>.<ext>` (deterministic, idempotent)
- Signed URL never persisted, max one controlled retry on stale grant
- Cleanup on unmount / target change / viewer close
- No blank screens: every branch shows specific state + hand-off when available

---

## 2. ROOT CAUSES & EVIDENCE (PDF)

### 2.1 Previous Physical Failures (1.2 MB / 4.8 MB PDFs)
**Context:** Failures occurred with the **old native renderer** (`react-native-pdf` + `react-native-blob-util`), which required a dev build and **could not run in Expo Go**.

**Evidence from `HOMECLOUD_FILES_STAGE2_SLICE_C_EXPO_GO_CORRECTION.md`:**
- Native modules outside Expo Go's fixed runtime fail at import (red screen)
- The Expo Go correction **replaced the native renderer entirely** with WebView + bundled pdf.js
- The 8 MiB ceiling matches `VIEWER_TEXT_TRANSFER_BYTE_LIMIT`; both test PDFs (1.2 / 4.8 MB) are **well below** the ceiling
- All transport/policy/bridge logic is pure and unit-tested (300/300 PASS)

**Conclusion:** The historical failures were **environment constraints**, not PDF.js or document defects. The current architecture is the correction.

### 2.2 Remaining Risk Vectors (require device evidence)
| Vector | Likelihood | Mitigation in Code |
|---|---|---|
| WebView memory pressure on 2 GiB iPhone | Medium | 8 MiB ceiling → ~40–45 MiB peak (lazy render, DPR cap 2x, far canvas release) |
| pdf.js glyph substitution on non-embedded fonts | High (known tradeoff) | Documented in generated header & policy; no remote CMap fetch |
| WKWebView / SafariView rendering quirks | Medium | Locked-down flags (`originWhitelist`, no file access, no multi-window) |
| Bridge timeout (READY 15s / LOAD 30s) | Low | Bounded by policy; honest failure states with hand-off |
| Chunked base64 transport overhead | Low | Streaming encoder (3-byte carry), 256 KiB raw chunks, mid-stream abort at ceiling |
| Race: close during load / reopen different doc | Low | `docId` session + WebView `key` per document; stale messages ignored both sides |

**No evidence** of: download/auth failure, MIME corruption, base64 transport corruption, worker misconfig (worker disabled by design), file-size policy bypass.

---

## 3. PDF REPAIR STRATEGY (EXPO GO COMPATIBLE)

**The repair is already implemented.** What remains is **physical device validation** of the WebView + pdf.js path.

### 3.1 Execution Slices (small, verifiable)

| Slice | Scope | Acceptance | STOP Gate |
|---|---|---|---|
| **V-A** | PDF ≤ 1 MiB, 1–2 pages | First page centered, fit-to-width, no white flash, pager shows "1 / N" | `FAIL_DEVICE` if blank/white/clipped |
| **V-B** | PDF 5–8 MiB, 10+ pages | Lazy render (±1 page), scroll smooth, double-tap 2× re-renders crisp | `FAIL_DEVICE` if OOM/crash/jank |
| **V-C** | PDF > 8 MiB (e.g., 12 MiB) | "Too large" state appears, hand-off button works, no transfer attempted | `FAIL_DEVICE` if transfer starts or app dies |
| **V-D** | Password-protected PDF | Dedicated "protegido" state + hand-off | `FAIL_DEVICE` if generic error/blank |
| **V-E** | Corrupt/truncated PDF | Honest failure + hand-off, no stack trace | `FAIL_DEVICE` if white screen/exception |
| **V-F** | Expo Go boot → open → close → reopen | No stale content (WebView `key` per session) | `FAIL_DEVICE` if previous PDF pixels visible |
| **V-G** | Android hardware back | Closes Viewer only, browser context preserved | `FAIL_DEVICE` if leaves HomeCloud |
| **V-H** | Document link tap | `LINK_PRESSED` → `Linking.openURL` (http/https only) | `FAIL_DEVICE` if viewer navigates internally |

### 3.2 STOP GATES
- **No slice proceeds** without `PASS_DEVICE` on physical iPhone (Expo Go)
- **No visual polish** (motion, microinteractions) before V-A through V-H are `PASS_DEVICE`
- **No DOCX work** until PDF inline is `PASS_DEVICE` (P0 dependency)

---

## 4. DOCX STRATEGY

### 4.1 Evaluation: In-App DOCX Preview (docx-preview / mammoth / custom)
| Criterion | Reality |
|---|---|
| Basic text | Partial (loses runs, formatting) |
| Typography | ❌ No font metrics, kerning, OpenType features |
| Paragraphs/headings | ❌ Style mapping loss |
| Tables | ❌ Collapsed or missing |
| Images | ❌ Not rendered in WebView context |
| Lists | ❌ Numbering/bullets lost |
| Page layout | ❌ No pagination concept |
| Multiple pages | ❌ Continuous flow only |
| Embedded resources | ❌ Fonts, charts, OLE objects absent |
| Large documents | ❌ Unbounded DOM → memory pressure |
| Offline rendering | Requires full docx → HTML pipeline in WebView |
| File privacy | ✅ Local only (but fidelity unacceptable) |
| WebView byte transport | Same bridge as PDF — feasible but pointless without renderer |

**Verdict:** **No in-app preview can provide acceptable V1 fidelity.** Shipping a broken preview violates "honest fallback" principle.

### 4.2 Honest Alternative (Current Implementation)
- **Stage** the original DOCX to deterministic cache slot
- **Hand off** via `Sharing.shareAsync(stagedUri, { mimeType, dialogTitle: 'Abrir o compartir con…' })`
- **Label truthfully:** "Abrir o compartir con…" — never "Abrir en otra app" (no picker guarantee)
- **No remote conversion**, no upload, no third-party service
- **Legacy `.doc` (binary)** treated identically — same handoff, same honesty

This is **already implemented** in `homecloudViewerAccess.ts` → `openViewerOriginalWithSystem()` and surfaced in `HomeCloudFileViewerScreen.tsx` for `office_document` / `office_sheet` / `office_presentation`.

---

## 5. UNIVERSAL OPEN/PREVIEW/HANDOFF CONTRACT

### 5.1 Contract (implemented, source-verified)

```typescript
// Entry: HomeCloudFileViewer receives (file, accessToken, onClose, onExternalAction)
// Flow:
1. classifyHomeCloudViewerFile({ fileName, mimeType }) → HomeCloudViewerClassification
2. if inlineRenderableFamily(kind): load directly (image/video/audio/text)
3. if needsStagedOriginalForPreview(kind): stageViewerOriginal(file, grant) → file:// URI
4. if kind === 'pdf' and stagedSize ≤ 8 MiB: ViewerPdfSurface (WebView + pdf.js)
5. if kind === 'pdf' and stagedSize > 8 MiB: too-large state + hand-off button
6. if kind === office_*: unsupported state + hand-off button
7. if kind === 'unsupported' + activeWebContent: security reason + hand-off button
8. Hand-off: openViewerOriginalWithSystem(stagedUri) → Sharing.shareAsync()
9. Cleanup: discardViewerStaging(contentId, displayName) on unmount/target change
```

### 5.2 Guarantees
| Guarantee | Mechanism |
|---|---|
| No file permanently inaccessible | Hand-off offered for **every** non-inline family |
| Authorized source acquisition | `requestViewerAccess` → signed `variant=original` (server validates household/member) |
| Local temp file when needed | `stageViewerOriginal` → deterministic cache slot (never Documents dir) |
| Correct extension/MIME preserved | `viewerStagingName` uses safe extension from `displayName`; `shareAsync` receives `mimeType` |
| Native sharing fallback | `expo-sharing` (Expo Go compatible) |
| Clear unsupported/invalid/corrupt states | Specific `ViewerFailureReason` + `renderFailure` per family |
| No endless loading | READY 15s / LOAD 30s timeouts → honest failure surface |
| Safe cleanup | `discardViewerStaging` in unmount effect + target change effect |
| No leaked signed URLs | Stored only in memory, cleared on unmount/target change, max 1 retry |
| No unauthorized household access | Server validates token; 403/404 → `not_authorized` / `no_longer_available` |

### 5.3 Platform-Dependent Limitations
| Platform | Limitation |
|---|---|
| **iOS (Expo Go)** | `Sharing.shareAsync` → system share sheet; "Guardar en Archivos" available but not guaranteed chosen |
| **Android (Expo Go)** | Same primitive; share targets vary by device/OS version |
| **Web** | `react-native-webview` not available; viewer disabled (Files web not in scope) |
| **Dev Build** | Same code path; WebView native module identical (pinned 13.16.1) |

---

## 6. EXECUTION ROADMAP (VIEWER CLOSURE)

| Phase | Slices | Owner | Dependency |
|---|---|---|---|
| **0. Preflight** | Confirm Expo Go build, device connected, test PDFs (1MB, 5MB, 12MB, password, corrupt) | Human | — |
| **1. PDF Inline** | V-A, V-B, V-C, V-D, V-E, V-F, V-G, V-H | Human (device) | Phase 0 |
| **2. Media Regression** | V1–V5, V17 (images, video, audio decode failure) | Human (device) | Phase 1 |
| **3. Text Family** | V10–V12 (TXT/MD/CSV selectable, copyable) | Human (device) | Phase 1 |
| **4. Office Handoff** | V13–V15 (DOCX/XLSX/PPTX → hand-off works) | Human (device) | Phase 1 |
| **5. Edge Cases** | V16 (unsupported binary), V18–V21 (back, notch, airplane, context restore) | Human (device) | Phase 1 |
| **6. Expo Go Acceptance** | G1–G10 (boot, scanner, PDF, no native errors) | Human (device) | Phase 1–5 |
| **7. Freeze** | All `PASS_DEVICE` → Viewer P0 **CLOSED** | — | Phase 6 |

**No code changes in this spec.** All slices validate **existing implementation**.