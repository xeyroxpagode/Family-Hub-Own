# 05_UNIFIED_PERFORMANCE_FUNCTIONAL_GAPS.md

**HomeCloud Unified Experience — Performance Audit & Functional Debt**

Status: **SOURCE_VERIFIED** (costs from source) + **STATICALLY_INFERRED** (hypotheses). No runtime profiling. **DEVICE_VISUAL_QA_REQUIRED** for all performance claims.

---

## 0. PERFORMANCE AUDIT METHODOLOGY

| Principle | Application |
|-----------|-------------|
| **Source-Derived Only** | Costs inferred from component trees, fetch patterns, render paths, cache strategies |
| **No Invented Optimizations** | Only optimizations with clear source evidence are documented |
| **Distinguish Actual vs Hypothetical** | `PROVEN_STATIC` = source evidence; `PLAUSIBLE_ONLY` = logical inference; `DEVICE_VERIFY_REQUIRED` = needs device |
| **Measure Before Optimize** | Every recommendation includes measurement step |

---

## 1. SOURCE-DERIVED COST ANALYSIS

### 1.1 Initial Load Costs

| Surface | Files | Memories | Evidence |
|---------|-------|----------|----------|
| **Mount Cost** | `HomeCloudFilesView` mounts on HomeCloud entry (both panes mounted, `display: 'none'`) | `HomeCloudMemoriesView` same | `HomeCloudScreen.tsx:37-44` — **both mount at once** |
| **First Paint** | `loadFirstPage()` → `/api/homecloud/files` (folders + 100 files) | `loadFirstPage()` + `loadRail()` → `/api/homecloud/memories` (100) + `/api/homecloud/albums` | Effect order: Files `loadFirstPage` (1), Memories `loadFirstPage` (1) + `loadRail` (2) |
| **Parallel Reads** | Files: 1 read (files) + 1 read (folders) if root | Memories: 1 read (memories) + 1 read (albums) | **Not parallel** — sequential in effect order |
| **Hydration** | `plannerCache` 30s TTL for folders/content | `plannerCache` 30s TTL for albums | Shared cache — **cross-module benefit** |
| **JS Bundle** | Shared `HomeCloudScreen` + both views | Same | **No code splitting** — both views in main bundle |

**CRITICAL FINDING**: Both Files and Memories views mount on HomeCloud entry (`display: 'none'` toggle). This doubles initial mount cost. **Recommendation**: Lazy-mount inactive tab.

### 1.2 Tab Switching

| Metric | Current | Cost | Evidence |
|--------|---------|------|----------|
| **Switch Time** | Instant (`display: 'none'` toggle) | **Zero navigation cost** | `HomeCloudScreen.tsx:28-35` |
| **State Preservation** | Full — both views stay mounted | **Memory cost** — both view states retained | `HomeCloudScreen.tsx:37-44` |
| **Re-hydration** | None needed | **Fast return** | No remount |
| **Focus Events** | `useFocusEffect` fires on tab show | **Re-reads** — Files: `loadFirstPage()`, Memories: `loadFirstPage()` + `reloadRail()` | `HomeCloudFilesScreen.tsx:377`, `HomeCloudMemoriesScreen.tsx:377` |

**ISSUE**: Tab switch triggers **full re-read** via `useFocusEffect`. This is wasteful if data is fresh. **Fix**: Skip re-read if `focus` return within 30s (cache TTL).

### 1.3 Lists & Grids

| Surface | Virtualization | Window Size | Render Cost | Evidence |
|---------|----------------|-------------|-------------|----------|
| **Files Grid** | `FlatList` `numColumns={2}` | `initialNumToRender=10`, `maxToRenderPerBatch=5`, `windowSize=5` | 20 tiles max | `HomeCloudFilesScreen.tsx` |
| **Files Folder** | Same | Same | Same | Same component |
| **Memories Timeline** | `SectionList` | `initialNumToRender=10`, `windowSize=5` | ~10 rows × 3 cols = 30 tiles | `HomeCloudMemoriesScreen.tsx` |
| **Album Detail** | `SectionList` | Same | Same | `AlbumDetailView.tsx` |
| **Type Collections** | `SectionList` | Same | Same | Collection overlay |
| **Resurfacing** | `SectionList` (horizontal) | `FlatList` horizontal, `windowSize=3` | 3 groups | `HomeCloudMemoriesScreen.tsx` |

**VERIFIED**: All lists use virtualization. Window sizes conservative. No `FlashList` (correct — no evidence it helps).

### 1.4 Pagination

| Surface | Trigger | Threshold | Guard | Evidence |
|---------|---------|-----------|-------|----------|
| **Files** | `onEndReached` | `onEndReachedThreshold={2}` (early) | `loadingMore` + generation rejection | `HomeCloudFilesScreen.tsx:295-311` |
| **Memories Timeline** | `onEndReached` | `onEndReachedThreshold=0.6` | `loadingMore` + generation rejection | `HomeCloudMemoriesScreen.tsx` |
| **Album Detail** | `onEndReached` | Same | Same | `AlbumDetailView.tsx` |
| **Collections** | `onEndReached` | Same | Same | `homecloudMemoryCollectionsPagination.ts` |

**VERIFIED**: Automatic pagination with early threshold. Generation rejection prevents stale appends. Failure latches (Files) / explicit retry (both).

### 1.5 Previews & Signed URLs

| Operation | Files | Memories | Cache Strategy |
|-----------|-------|----------|----------------|
| **Preview URL** | `getMemoryPreviewUrl` (shared) | `getMemoryPreviewUrl` | `Map<contentId, {url, expiresAt}>`, 30s margin, 5min TTL |
| **Original URL** | `getMemoryOriginalUrl` (shared) | `getMemoryOriginalUrl` | `Map<contentId, {url, expiresAt}>`, 30s margin, 300s TTL |
| **Deduplication** | In-flight `Map` per `contentId` | Same | `homecloudMemoryOriginal.ts`, `homecloudMemoryPreview.ts` |
| **Household Invalidation** | `clearMemoryPreviewCache()` + `clearMemoryOriginalCache()` on household change | Same | **Exported but NEVER CALLED** — Bug B3/B4 in HC2-C audit |
| **Viewer Original Fetch** | **Active page only** (PDF/Text) | **Active page only** (Image/Video/Audio) | **BUG A1** — Image inactive pages fetched original (fixed in Run A) |

**CRITICAL FINDING**: Cache invalidation functions **exported but never connected** to household change effect. This causes stale signed URLs across household switches.

### 1.6 Viewers

| Viewer | Fetch Strategy | Active-Only | Evidence |
|--------|----------------|-------------|----------|
| **Files Image** | Preview (all mounted) + Original (active only) | **YES** | `HomeCloudFileViewerScreen.tsx` |
| **Files Video** | Original (active only) | **YES** | `HomeCloudFileViewerScreen.tsx` |
| **Files Audio** | Original (active only) | **YES** | `HomeCloudFileViewerScreen.tsx` |
| **Files PDF** | WebView local — no signed URL fetch | N/A | pdf.js in WebView |
| **Files Office** | Embedded OnlyOffice — signed session | N/A | `ViewerOfficeSurface` |
| **Memories Image** | Preview (inactive) + Original (active only) | **FIXED Run A** | `MemoryViewer.tsx` + `ImagePage` |
| **Memories Video** | Poster (if exists) + Original (active only) | **FIXED Run A** | `MemoryVideoPage.tsx` — **now declares width** |
| **Memories Audio** | Original (active only) | **FIXED Run A** | `MemoryAudioPage.tsx` — **now declares width** |
| **Memories Written** | No binary | N/A | `ScrollView` |

**VERIFIED**: Active-only original fetch enforced for all viewers (post Run A fixes). Preview deduplication in place.

### 1.7 Upload Progress

| Aspect | Implementation | Cost |
|--------|----------------|------|
| **Job Model** | `UploadJob` (9 states) in AsyncStorage | Client-only, no server roundtrip |
| **Native PUT** | Direct to Supabase Storage (signed URL) | **Zero server bandwidth** for binary |
| **Progress Band** | Global `HomeCloudUploadProgress` — subscribes to job store | Single subscription, cross-tab |
| **Background** | Jobs survive app background/foreground | `AppState` listener in coordinator |
| **Recovery** | Orphan sweep on app start + connectivity guard | `homecloudUploadRecovery.ts` |

**VERIFIED**: Upload architecture is **zero-server-bandwidth** for binary transfer. Cost is client-side only.

### 1.8 Thumbnail Decoding

| Surface | Decoder | Cost |
|---------|---------|------|
| **Files Grid** | `Image` component with `resizeMode="cover"` — RN native | GPU texture upload, no JS decode |
| **Memories Timeline** | Same | Same |
| **Album Covers** | `AlbumCoverImage` → `Image` with preview URL | Same |
| **Resurfacing** | Same | Same |
| **Video Poster** | **NOT IMPLEMENTED** — Video pages fetch original only | **P1** — causes slow video open (HC2-C §15.3) |
| **Audio Waveform** | **NOT IMPLEMENTED** — Roadmap | **Roadmap** |

**CRITICAL GAP**: **No video thumbnails** in pipeline. Video open = full original fetch → slow perceived open.

### 1.9 Document Previews

| Format | Files | Memories | Cost |
|--------|-------|----------|------|
| **PDF** | pdf.js in WebView (local, no network) | N/A | GPU render, chunked base64 bridge |
| **Office** | Embedded OnlyOffice (signed session) | N/A | WebView + OnlyOffice server |
| **Text/MD/CSV** | Bounded read (512 KiB) → `Text` | Written Memory (no binary) | JS string, trivial |

### 1.10 Office Sessions

| Aspect | Cost | Evidence |
|--------|------|----------|
| **Session Creation** | `POST /api/homecloud/office/session` → signed JWT config | 1 request per open |
| **OnlyOffice Load** | `api.js` from OnlyOffice server → WebView | External dependency |
| **Document Load** | OnlyOffice fetches from signed URL | External |
| **Bridge** | Versioned protocol (`v:1`), chunked base64 | `homecloudOfficeViewer.ts` |

**RISK**: OnlyOffice server availability + latency. No local fallback for Office.

### 1.11 Scanner Processing

| Step | Cost | Evidence |
|------|------|----------|
| **Perspective Correction** | Client-side (OpenCV via native? No — pure JS/ML) | `HomeCloudScannerScreen.tsx` — **pure JS** |
| **PDF Generation** | `pdf-lib` or similar in JS | Client CPU |
| **Upload** | Same as Files intake | Native PUT |

**VERIFIED**: Scanner is **pure JS** — no native dependency (Expo Go compatible). CPU cost on device.

### 1.12 Redundant Requests

| Pattern | Location | Evidence | Status |
|---------|----------|----------|--------|
| **Double Rail Load** | Memories: `loadRail()` (effect 4) + `reloadRail()` (effect 5) + `reset()` (effect 13) | HC2-C §4.2 B1/B2 | **FIXED Run A** — collapse to one |
| **Viewer Dataset Rebuild** | `viewerMemories` not memoized → new array each render | HC2-C §4.1 A4 | **FIXED Run A** — memoize |
| **Preview/Original Dedupe** | In-flight `Map` per `contentId` | `homecloudMemoryOriginal.ts:40` | **IMPLEMENTED** |
| **Household Change** | `plannerCache` cleared via `captureContextToken` | `homecloudReadService.ts:69-74` | **IMPLEMENTED** |
| **Signed URL Cache** | Invalidation functions **never called** | HC2-C §24 B3/B4 | **OPEN** |

### 1.13 Unnecessary Rerenders

| Component | Cause | Evidence | Mitigation |
|-----------|-------|----------|------------|
| `HomeCloudFilesScreen` | Massive single component (2000+ lines), many state vars | `HomeCloudFilesScreen.tsx` | Split into sub-components with `React.memo` |
| `HomeCloudMemoriesScreen` | Massive single component (2759 lines), many derived states | `HomeCloudMemoriesScreen.tsx` | Split, memoize derived (`viewerMemories`, `gridSections`) |
| `MemoryViewer` | `FlatList` data identity changes on `viewerMemories` rebuild | HC2-C §4.1 A4 | **FIXED Run A** — memoize `viewerMemories` |
| `AlbumsRail` | Re-renders on parent `HomeCloudMemoriesScreen` render | `AlbumsRail.tsx` in `ListHeaderComponent` | `React.memo` on `AlbumsRail` |

---

## 2. PERFORMANCE RISKS (Prioritized)

| Risk | Module | Severity | Evidence | Measurement Needed |
|------|--------|----------|----------|-------------------|
| **Dual View Mount** | Both | **HIGH** | Both panes mount on entry | Profile JS heap / frame time on cold start |
| **Tab Switch Re-read** | Both | **MEDIUM** | `useFocusEffect` → `loadFirstPage()` every tab show | Measure API calls on tab switch |
| **Massive Screen Components** | Both | **MEDIUM** | 2000+/2759 lines, many `useState`/`useMemo` | Profile render count on scroll |
| **Album Rail Skeleton Race** | Memories | **HIGH** (Bug B) | Reset effect supersedes rail load | Device QA: first entry skeleton |
| **Video Open Latency** | Memories | **HIGH** (P1) | No poster → full original fetch | Device QA: video open time |
| **Signed URL Stale** | Both | **MEDIUM** | Invalidation not connected to household change | Test household switch → viewer open |
| **PDF Large File** | Files | **MEDIUM** | pdf.js chunked bridge, 8MiB ceiling | Device QA: 10-30MB PDF |
| **Office External Dependency** | Files | **MEDIUM** | OnlyOffice server required | Network failure simulation |
| **Scanner CPU** | Files | **LOW** | Pure JS perspective correction | Profile on low-end device |
| **Drag Selection Perf** | Memories | **LOW** | Measured frames, auto-scroll timer | Device QA: 100+ item sweep |

---

## 3. FUNCTIONAL DEBT — EXPLICIT OPEN ITEMS

### 3.1 Files

| Item | Current | Target | Root Cause Confidence | Risk | Suggested Solution | Owning Component | Test | Shared Infra Stop Gate |
|------|---------|--------|----------------------|------|-------------------|------------------|------|------------------------|
| **PPTX Viewer** | System hand-off (honest) | Inline preview? | **DESIGN DECISION** — not a bug | LOW | Keep hand-off; Office is external | `HomeCloudFileViewerScreen` | `homecloud-office-viewer` | OnlyOffice server |
| **XLSX Viewer** | System hand-off | Inline preview? | **DESIGN DECISION** | LOW | Keep hand-off | `HomeCloudFileViewerScreen` | `homecloud-office-viewer` | OnlyOffice server |
| **DOCX Viewer** | Embedded OnlyOffice | Working | **IMPLEMENTED** | NONE | N/A | `ViewerOfficeSurface` | `homecloud-office-viewer` | OnlyOffice server |
| **Scanner Native Dep** | Pure JS (Expo Go safe) | Keep pure JS | **CONFIRMED** | NONE | No native dep | `HomeCloudScannerScreen` | `homecloud-scanner-b1` | NONE |
| **Selection Test Failure** | `selection-system` expects 2 `implemented: false` (trash + open), grammar has 1 (open) | Fix test expectation | **STALE TEST** — trash now implemented | LOW | Update test to expect 1 | `selection_system_tests.js:133` | `selection-system` | NONE |

### 3.2 Memories

| Item | Current | Target | Root Cause Confidence | Risk | Suggested Solution | Owning Component | Test | Shared Infra Stop Gate |
|------|---------|--------|----------------------|------|-------------------|------------------|------|------------------------|
| **Black Photos** | Some images render black | Correct render | **PLAUSIBLE_ONLY** — EXIF orientation? | HIGH | Audit `Image` `resizeMode`, orientation handling | `MemorySelectableCard`, `ImagePage` | `homecloud-hc2b-media-viewer` | NONE |
| **Missing Previews** | Some memories lack preview | All have preview | **PLAUSIBLE_ONLY** — backend preview generation | MEDIUM | Ensure preview pipeline for all uploads | `homecloudMemoryPreview.ts`, backend | `homecloud-4b1-preview` | Backend preview worker |
| **Video Playback iPhone** | Some videos fail to play | All play | **DEVICE_VERIFY_REQUIRED** — codec/DRM? | HIGH | Honest error + system hand-off | `MemoryVideoPage` | `homecloud-hc2b-media-viewer` | NONE |
| **Audio Seek Dragging** | Seek bar drag unreliable | Smooth seek | **PLAUSIBLE_ONLY** — `PanResponder` vs touch | MEDIUM | Use `Slider` component or improve `PanResponder` | `MemoryAudioPage` | `homecloud-hc2b-media-viewer` | NONE |
| **Selection Drag Reliability** | D4 drag sometimes misses | 100% reliable | **DEVICE_VERIFY_REQUIRED** — measured frames | HIGH | Validate `hitTestFileTile` on device | `homecloudMemoryDrag.ts`, `MemorySelectableCard` | `homecloud-moa3-device-gestures` | NONE |
| **Camera Quick Video** | Quick video capture not implemented | Quick video (tap to record, tap to stop) | **DESIGN DECISION** — not in V1 | LOW | Defer to V2 | `MemoryCameraSurface` | N/A | NONE |
| **Real Waveform** | Fake prohibited, real in roadmap | Real audio-derived waveform | **ROADMAP** — `expo-audio` sampling | MEDIUM | Implement live waveform via `useAudioSampleListener` | `MemoryAudioPage` | `homecloud-hc2c-memories-foundation` | `expo-audio` Android `RECORD_AUDIO` |
| **Platform Audio Routing** | OS provides | Preserve + verify | **DEVICE_VERIFY_REQUIRED** | MEDIUM | Verify iOS/Android routing works | `MemoryAudioPage` | `homecloud-hc2c-memories-foundation` | NONE |

### 3.3 Shared

| Item | Current | Target | Root Cause Confidence | Risk | Suggested Solution | Owning Component | Test | Shared Infra Stop Gate |
|------|---------|--------|----------------------|------|-------------------|------------------|------|------------------------|
| **Integration Seam (1 != 2)** | `selection-system` test fails | Test matches grammar | **STALE TEST** — grammar evolved, test didn't | LOW | Update test expectation to 1 | `selection_system_tests.js:133` | `selection-system` | NONE |
| **Device QA** | All `UNPROVEN_DEVICE` | `PASS_DEVICE` on iPhone | **BLOCKED** — no device | **BLOCKER** | Schedule physical QA | All | All device gates | Physical iPhone |
| **Office Runtime QA** | Tests pass, no device | `PASS_DEVICE` | **BLOCKED** | **BLOCKER** | Test Office open/edit on device | `HomeCloudFileViewerScreen` | `homecloud-office-viewer` | OnlyOffice server |
| **Migration Runtime** | Schema migrated, no runtime verify | Verify data integrity | **PLAUSIBLE_ONLY** | MEDIUM | Run migration verification suite | Backend migrations | `homecloud-files-hierarchy-migration` | Local Supabase |
| **Signed URL Invalidation** | Functions exist, never called | Connected to household change | **PROVEN_STATIC** | MEDIUM | Call `clearMemory*Cache()` in household change effect | `homecloudMemoryOriginal.ts`, `homecloudMemoryPreview.ts` | `homecloud-4b1-preview` | NONE |

---

## 4. MEASUREMENT PLAN (Before Optimization)

| Metric | Tool | Target | When |
|--------|------|--------|------|
| Cold start (HomeCloud entry) | `react-native-performance` / `why-did-you-render` | < 2s TTI | Pre-freeze |
| Tab switch latency | Custom mark/measure | < 100ms | Pre-freeze |
| Files grid scroll (250 items) | `FlatList` `onScroll` + `why-did-you-render` | 60fps, < 16ms/frame | Pre-freeze |
| Memories timeline scroll (500 items) | Same | 60fps | Pre-freeze |
| Video open (first frame) | `expo-video` `onLoadStart` → `onReadyForDisplay` | < 500ms (with poster) | Pre-freeze |
| Audio open (first play) | `expo-audio` `onLoadStart` → `onReadyToPlay` | < 300ms | Pre-freeze |
| PDF open (first page) | pdf.js `DOCUMENT_LOADED` | < 1s (< 8MiB) | Pre-freeze |
| Office open (ready) | Bridge `DOCUMENT_READY` | < 3s (network dependent) | Pre-freeze |
| Household switch cleanup | Custom — verify caches cleared | 0 stale URLs | Pre-freeze |
| Memory heap (steady state) | `react-native-performance` | < 150MB | Pre-freeze |
| Bundle size (HomeCloud) | `expo bundle-analyzer` | < 5MB gzipped | Pre-freeze |

---

## 5. OPTIMIZATION CANDIDATES (Source-Evidence Only)

| Optimization | Module | Evidence | Effort | Risk |
|--------------|--------|----------|--------|------|
| **Lazy Tab Mount** | Both | Both views mount at entry (`display: 'none'`) | Medium | State preservation logic |
| **Skip Focus Re-read** | Both | `useFocusEffect` fires `loadFirstPage()` every tab show | Low | Cache TTL check |
| **Memoize `viewerMemories`** | Memories | HC2-C A4 — new array each render | **DONE Run A** | N/A |
| **Collapse Rail Loads** | Memories | HC2-C B1/B2 — 3 loads on mount | **DONE Run A** | N/A |
| **Connect Cache Invalidation** | Both | `clearMemory*Cache` never called | Low | Household change effect |
| **Video Poster Pipeline** | Memories | No thumbnail generation | High | Backend worker + storage |
| **Split Screen Components** | Both | 2000+ line components | High | Regression risk |
| **Virtualize Album Rail** | Memories | Horizontal `ScrollView` — not virtualized | Medium | Low item count (typically <50) |
| **Pre-fetch Next Page** | Both | Already done via `onEndReachedThreshold` | N/A | N/A |

---

**End of Performance & Functional Gaps**

> **Next Step**: Execute Measurement Plan on physical device. Only then prioritize optimizations.