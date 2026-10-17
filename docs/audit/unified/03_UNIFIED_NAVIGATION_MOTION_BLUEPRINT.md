# 03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md

**HomeCloud Unified Experience — Navigation Paths & Motion Design**

Status: **SOURCE_VERIFIED** (paths) + **PROPOSED** (motion targets). No device validation. **DEVICE_VISUAL_QA_REQUIRED** for all motion claims.

---

## 0. NAVIGATION ARCHITECTURE

### 0.1 Global Structure

```
HomePlus App
└── Más (Tab)
    └── HomeCloud (Stack Screen)
        ├── HomeCloudScreen.tsx (Global Owner)
        │   ├── SegmentedControl: [ Archivos ] [ Recuerdos ]  ← PERSISTENT GLOBAL
        │   ├── HomeCloudFilesView (mounted, display: 'none' when inactive)
        │   └── HomeCloudMemoriesView (mounted, display: 'none' when inactive)
        │
        ├── Files Navigation (within HomeCloudFilesView)
        │   ├── Root Browser (folderId = null)
        │   ├── Folder Browser (folderId = X) ← trail derived from catalogue
        │   ├── Search Overlay (same surface, query param)
        │   ├── Selection Mode (contextual state, same surface)
        │   ├── File Viewer (absolute overlay, zIndex: 20)
        │   ├── Office Viewer (absolute overlay, zIndex: 20)
        │   ├── ActionSheets (ActionSheet host, modal)
        │   └── Trash Screen (separate route: HomeCloudFilesTrashScreen)
        │
        └── Memories Navigation (within HomeCloudMemoriesView)
            ├── Root (single vertical scroll)
            ├── Album Detail (nested overlay, zIndex: 10)
            ├── Type Collection (nested overlay, zIndex: 10)
            ├── Resurfacing Group (nested overlay, zIndex: 10)
            ├── Memory Viewer (absolute overlay, zIndex: 20)
            ├── Selection Mode (contextual state, same surface)
            ├── ActionSheets (ActionSheet host, modal)
            ├── Camera / Intake (ActionSheet → full screen)
            └── Trash (conditional section in root)
```

### 0.2 State Ownership Map

| State | Owner | Scope | Persistence |
|-------|-------|-------|-------------|
| Active Tab (Archivos/Recuerdos) | `HomeCloudScreen.tsx` | Global | Session |
| Files: folderId, query, sort, favoritesOnly, page, scrollOffset | `HomeCloudFilesScreen.tsx` | Files | Per-surface key |
| Files: selection | `HomeCloudFilesScreen.tsx` | Files | Cleared on context change |
| Files: viewer | `HomeCloudFilesScreen.tsx` | Files | Session |
| Memories: activeCollectionId, scrollOffsets | `HomeCloudMemoriesScreen.tsx` | Memories | Per-surface key (root/album/type/resurfacing/trash/favorites) |
| Memories: selection | `HomeCloudMemoriesScreen.tsx` | Memories | Cleared on context change |
| Memories: viewer | `HomeCloudMemoriesScreen.tsx` | Memories | Session |
| Memories: openAlbumId | `HomeCloudMemoriesScreen.tsx` | Memories | Session |
| Upload Progress | `HomeCloudUploadProgress.tsx` | Global HomeCloud | Cross-tab |

---

## 1. COMPLETE NAVIGATION PATHS

### 1.1 Files ↔ Memories (Tab Switch)

| Path | Trigger | Current Behavior | Target Motion |
|------|---------|------------------|---------------|
| **Archivos → Recuerdos** | Tap segmented control | `setSection('memories')` — both panes mounted, `display: 'none'` toggle | **Cross-fade 150ms ease-out** (content), tab indicator slide |
| **Recuerdos → Archivos** | Tap segmented control | `setSection('files')` — same | **Cross-fade 150ms ease-out** |
| **Deep Link → Files** | URL/notification | Opens HomeCloud, sets section='files', navigates to folder/file | **Direct mount** (no animation) |
| **Deep Link → Memories** | URL/notification | Opens HomeCloud, sets section='memories', navigates to album/memory | **Direct mount** |

**Risk**: Both panes mounted → memory pressure. No unmount on tab switch → state preserved but no remount animation.

### 1.2 Files Navigation

| Path | Trigger | Current Behavior | Target Motion |
|------|---------|------------------|---------------|
| **Root → Folder** | Tap FolderTile | `setFolder(folderId)` → push to trail, `loadFirstPage()` | **Slide right 200ms ease-out**, trail breadcrumb appears |
| **Folder → Subfolder** | Tap FolderTile | Same, trail extends | **Slide right 200ms ease-out**, breadcrumb extends |
| **Folder → Parent (Back)** | Back gesture / breadcrumb tap | `popTrail()` → `loadFirstPage()` parent | **Slide left 200ms ease-in**, breadcrumb collapses |
| **Folder → Root (Back from L1)** | Back gesture | `popTrail()` to empty | **Slide left 200ms ease-in** |
| **Root/Search/Folder → File Viewer** | Tap FileTile | `setViewer(libraryViewerSession(...))` → absolute overlay mounts | **Scale up from tile 250ms ease-out** (origin-aware) |
| **File Viewer → Browser** | Close / Android Back / Swipe down | `setViewer(null)` → overlay unmounts | **Scale down to tile 200ms ease-in** (return to origin) |
| **Root → Search** | Type in search field | `setQuery(text)` → debounced `loadFirstPage()` | **No navigation** — inline filter |
| **Root → Selection** | Header overflow → `Seleccionar` | `enterSelectionMode()` → header becomes selection bar | **Header morph 150ms**, bar slides down |
| **Selection → Bulk Move** | Selection bar → `Mover` | `FileMoveDestinationPicker` opens (ActionSheet) | **Sheet slide up 200ms** |
| **Selection → Cancel** | `X` / Back gesture | `cancelSelection()` → header restores | **Header morph 150ms** |
| **Root → Trash** | (No direct entry — Trash is separate screen) | Navigate to `HomeCloudFilesTrashScreen` | **Stack push 250ms** |
| **Trash → Root** | Back / Close | `navigation.goBack()` | **Stack pop 250ms** |
| **Root → Add File** | `+` button | `FileIntake` ActionSheet opens | **Sheet slide up 200ms** |
| **Folder → Add File** | `+` button | `FileIntake` ActionSheet (folder pre-selected) | **Sheet slide up 200ms** |
| **Scanner → Result** | Scan complete | Review sheet → `FileIntake` with PDF artifact | **Sheet replace 150ms** |

### 1.3 Memories Navigation

| Path | Trigger | Current Behavior | Target Motion |
|------|---------|------------------|---------------|
| **Root → Album** | Tap AlbumTile | `openAlbum(albumId)` → `AlbumDetailView` overlay (zIndex: 10) | **Slide up 250ms ease-out**, root dims |
| **Album → Root** | Back / Close / Swipe down | `closeAlbum()` → overlay unmounts | **Slide down 200ms ease-in** |
| **Root → Type Collection** | Tap Type Tile | `openCollection(type:<kind>)` → overlay (zIndex: 10) | **Slide up 250ms ease-out** |
| **Type → Root** | Back / Close | `closeCollection()` | **Slide down 200ms ease-in** |
| **Root → Resurfacing Group** | Tap Group | `openResurfacingGroup(group)` → overlay (zIndex: 10) | **Slide up 250ms ease-out** |
| **Group → Root** | Back / Close | `closeResurfacingGroup()` | **Slide down 200ms ease-in** |
| **Any Source → Memory Viewer** | Tap MemoryTile | `setViewer(sourceViewerSession(...))` → absolute overlay (zIndex: 20) | **Scale up from tile 250ms ease-out** (origin-aware) |
| **Memory Viewer → Source** | Close / Android Back / Swipe down | `setViewer(null)` → restores source scroll offset | **Scale down to tile 200ms ease-in** (return to origin) |
| **Viewer → Next/Prev (Pager)** | Horizontal swipe | `FlatList` paging — **source-locked** (never crosses source) | **Native pager 150ms** |
| **Viewer → Actions** | Tap `⋯` | ActionSheet opens (replaces content for destination) | **Sheet slide up 200ms** |
| **Root → Selection** | Long press MemoryTile | `enterMemorySelection()` → header becomes selection bar | **Header morph 150ms** |
| **Album → Selection** | Long press in Album | Same, but dataset = Album memories only | **Header morph 150ms** |
| **Selection → Add to Album** | `⋯ Acciones` → `Agregar a un álbum` | ActionSheet content replaces with album picker | **Content cross-fade 100ms** |
| **Selection → Create Album** | Picker → `Nuevo álbum` | Name sheet → creates album + adds memories | **Sheet replace 150ms** |
| **Root → Create Memory** | `+` button | Create menu ActionSheet (5 flat items) | **Sheet slide up 200ms** |
| **Album → Create Memory** | `+` in Album empty / `Agregar recuerdos` | Same menu, Album pre-selected | **Sheet slide up 200ms** |
| **Camera → Review** | Capture photo/video | `MemoryMediaReview` (full screen) | **Push 200ms** |
| **Review → Intake** | `Usar foto/video` | Enters binary review with date/Album/description | **Sheet replace 150ms** |
| **Audio Import → Review** | Pick audio file | `AudioReview` → binary review | **Sheet replace 150ms** |
| **Audio Record → Review** | Record → stop | `AudioReview` → binary review | **Sheet replace 150ms** |
| **Written → Intake** | `Escribir un recuerdo` | Text form → date/Album/description | **Sheet replace 150ms** |
| **Batch Review → Submit** | `Guardar` | Single submit, N jobs, one success banner | **Progress in band, then root refresh** |
| **Root → Trash** | (Conditional section) | Tap Trash section → expands inline | **Expand 200ms** |
| **Trash → Root** | Back / Close | Collapses | **Collapse 200ms** |

### 1.4 Cross-Module Paths

| Path | Trigger | Current Behavior | Target Motion |
|------|---------|------------------|---------------|
| **Files Viewer → Memories** | N/A (no cross-module viewer) | Not possible — Viewer is module-scoped | N/A |
| **Memories Viewer → Files** | N/A | Not possible | N/A |
| **Files → Office Viewer** | Tap DOCX/XLSX/PPTX | `createOfficeViewingSession` → `ViewerOfficeSurface` in File Viewer | **Same as File Viewer open** |
| **Office Viewer → Files** | Close | `cancelOfficeViewingSession` → close Viewer | **Same as File Viewer close** |

---

## 2. MOTION SPECIFICATIONS (TARGET DESIGN)

### 2.1 Motion Principles

| Principle | Specification |
|-----------|---------------|
| **Origin-Aware** | Every transition knows its spatial origin (tile, button, list position) |
| **Reversible** | Close/back always returns to exact origin with preserved scroll |
| **Interrupted-Safe** | Gestures can cancel mid-flight; no stuck states |
| **Reduced Motion** | `prefersReducedMotion` → all durations ×0.2, no spring/easing |
| **Ownership** | One animation controller per transition; no competing animators |
| **60fps Budget** | All transitions < 16ms/frame; no layout thrashing |

### 2.2 Transition Specifications

| Transition | Duration | Easing | Origin | Interruption | Reduced Motion |
|------------|----------|--------|--------|--------------|----------------|
| **Tab Switch (Archivos↔Recuerdos)** | 150ms | `ease-out` | Tab indicator | Tap other tab mid-flight → abort, reverse | 30ms, linear |
| **Folder Enter (Files)** | 200ms | `ease-out` | Folder tile center | Back gesture → reverse slide | 40ms, linear |
| **Folder Back (Files)** | 200ms | `ease-in` | Breadcrumb | Forward swipe → reverse | 40ms, linear |
| **File → Viewer (Files)** | 250ms | `ease-out` | Tile bounds (scale 0.95→1) | Swipe down → cancel, return | 50ms, linear |
| **Viewer → File (Files)** | 200ms | `ease-in` | Tile bounds (scale 1→0.95) | Tap media → cancel close | 40ms, linear |
| **Album → Detail (Memories)** | 250ms | `ease-out` | Album tile bounds | Back gesture → reverse | 50ms, linear |
| **Album Detail → Root** | 200ms | `ease-in` | Album tile bounds | Tap memory → cancel | 40ms, linear |
| **Memory → Viewer (Memories)** | 250ms | `ease-out` | Tile bounds (scale 0.95→1) | Swipe down → cancel | 50ms, linear |
| **Viewer → Memory (Memories)** | 200ms | `ease-in` | Tile bounds (scale 1→0.95) | Tap media → cancel | 40ms, linear |
| **Viewer Pager Swipe** | 150ms | `ease-out` | Current page edge | Opposite swipe → reverse | 30ms, linear |
| **ActionSheet Open** | 200ms | `ease-out` | Trigger button | Backdrop tap → close | 40ms, linear |
| **ActionSheet Close** | 150ms | `ease-in` | Sheet center | Drag down → follow finger | 30ms, linear |
| **Selection Header Morph** | 150ms | `ease-out` | Header row | Tap outside → cancel | 30ms, linear |
| **Drag Selection Auto-scroll** | 16ms/step | Linear | Finger at edge | Release → stop immediately | Disabled |
| **Upload Band Appear** | 200ms | `ease-out` | Top of screen | Dismiss → slide up | 40ms, linear |
| **Upload Band Dismiss** | 150ms | `ease-in` | Band center | Auto on complete | 30ms, linear |
| **Trash Expand (Memories)** | 200ms | `ease-out` | Section header | Tap elsewhere → collapse | 40ms, linear |
| **Resurfacing Group Open** | 250ms | `ease-out` | Group tile | Back → reverse | 50ms, linear |

### 2.3 Shared Motion Tokens (Proposed)

```typescript
// To be added to theme.ts or dedicated motion.ts
export const MOTION = {
  // Durations
  fast: 150,
  normal: 200,
  slow: 250,
  verySlow: 300,
  
  // Easings (cubic-bezier)
  easeOut: [0.25, 0.46, 0.45, 0.94],
  easeIn: [0.55, 0.06, 0.68, 0.19],
  easeInOut: [0.42, 0, 0.58, 1],
  spring: [0.34, 1.56, 0.64, 1], // for origin-aware scale
  
  // Reduced motion multipliers
  reducedMultiplier: 0.2,
  
  // Specific transitions
  tabSwitch: { duration: 150, easing: 'easeOut' },
  folderEnter: { duration: 200, easing: 'easeOut' },
  folderBack: { duration: 200, easing: 'easeIn' },
  viewerOpen: { duration: 250, easing: 'spring' },
  viewerClose: { duration: 200, easing: 'easeIn' },
  albumOpen: { duration: 250, easing: 'spring' },
  albumClose: { duration: 200, easing: 'easeIn' },
  sheetOpen: { duration: 200, easing: 'easeOut' },
  sheetClose: { duration: 150, easing: 'easeIn' },
  headerMorph: { duration: 150, easing: 'easeOut' },
  uploadBand: { duration: 200, easing: 'easeOut' },
  trashExpand: { duration: 200, easing: 'easeOut' },
} as const;
```

---

## 3. CRITICAL PATH ANALYSIS (Source-Verified Issues)

### 3.1 Abrupt Transitions

| Path | Current | Issue | Fix |
|------|---------|-------|-----|
| **Tab Switch** | Instant `display: 'none'` toggle | No cross-fade, content pops | Add `Animated.View` cross-fade between panes |
| **Viewer Open** | `MemoryViewer` mounts at `zIndex: 20` instantly | No scale-from-tile, no shared element | Implement `sharedElementTransition` (React Native Reanimated 3) or scale animation |
| **Viewer Close** | `setViewer(null)` unmounts instantly | No scale-to-tile | Animate scale + fade before unmount |
| **Album Open** | `AlbumDetailView` mounts at `zIndex: 10` instantly | No slide-up | Animate `translateY` from tile position |
| **ActionSheet** | `Modal animationType="slide"` | Native slide only, no content morph | Acceptable — native is consistent |
| **Selection Header** | Conditional render `{!selecting ? <TitleRow/> : <SelectionHeader/>}` | Instant swap, no morph | Wrap in `Animated.View` with height/opacity transition |

### 3.2 Unnecessary Remounts

| Path | Current | Issue |
|------|---------|-------|
| **Tab Switch** | Both panes **always mounted** (`display: 'none'`) | No remount — GOOD. But no animation either. |
| **Folder Change (Files)** | `loadFirstPage()` → new data, same `FlatList` | No remount — GOOD. |
| **Album Open** | `AlbumDetailView` mounted as sibling in `HomeCloudMemoriesScreen` | New mount each open — acceptable for overlay. |
| **Viewer Open** | `MemoryViewer` mounted as sibling | New mount each open — should animate from origin. |
| **Selection Enter/Exit** | Header conditional render | Remounts header — should morph. |

### 3.3 Scroll Loss

| Path | Current | Contract | Status |
|------|---------|----------|--------|
| **Files: Folder → Back** | `scrollOffsetsRef` per folderId → restored | **PASS** — `scrollOffsetsRef.current[folderId]` saved/restored | SOURCE_VERIFIED |
| **Files: Viewer → Close** | No scroll restoration (viewer is overlay) | **PASS** — browser never unmounted | SOURCE_VERIFIED |
| **Memories: Root → Album → Back** | `scrollOffsetsRef` per surface key → restored | **PASS** — `scrollOffsetsRef.current[sourceKey]` | SOURCE_VERIFIED |
| **Memories: Viewer → Close** | `scrollOffsetsRef` keyed by caller surface → restored | **PASS** — `scrollOffsetsRef` restored in `cancelMemorySelection` / viewer close | SOURCE_VERIFIED |
| **Memories: Selection Enter/Exit** | `scrollOffsetsRef` preserved | **PASS** — selection doesn't change offset | SOURCE_VERIFIED |
| **Memories: Type/Resurfacing → Back** | Per-surface offsets | **PASS** | SOURCE_VERIFIED |

### 3.4 Empty Flashes

| Path | Current | Issue |
|------|---------|-------|
| **Files: Initial Load** | `loading` → `MemoriesLoadingSkeleton` (Files has own) → data | Skeleton flashes — acceptable if <300ms |
| **Memories: Initial Load** | `loading` → `MemoriesLoadingSkeleton` (full screen) → root IA | **BUG B** — Albums rail shows skeleton due to reset race |
| **Viewer Open** | `FlatList` mounts with `initialScrollIndex` → `getItemLayout` | **BUG A** — Video/Audio pages don't declare width → jump |
| **ActionSheet** | Modal animates, content renders after | Native — acceptable |

### 3.5 Overlapping Modals

| Scenario | Current | Contract |
|----------|---------|----------|
| **Viewer + ActionSheet** | Viewer is `View` (zIndex: 20), ActionSheet is `Modal` | **SAFE** — different layers, no RN Modal stacking |
| **Album Detail + ActionSheet** | Album is `View` (zIndex: 10), ActionSheet is `Modal` | **SAFE** |
| **Selection + ActionSheet** | Selection header `⋯` opens ActionSheet | **SAFE** — replaces content in same host |
| **Camera + ActionSheet** | Camera is full-screen, ActionSheet for permissions | **SAFE** |
| **Two ActionSheets** | Single host — content replaces, never stacks | **ENFORCED** by design |

---

## 4. ANDROID BACK HANDLING

| Surface | Handler | Priority | Behavior |
|---------|---------|----------|----------|
| **Files Viewer** | `HomeCloudFileViewerScreen.tsx` `BackHandler` | High | `onClose()` → close viewer |
| **Memories Viewer** | `MemoryViewer.tsx` `BackHandler` (via `useFocusEffect`) | High | `onClose()` → close viewer |
| **Album Detail** | `AlbumDetailView.tsx` `BackHandler` | Medium | `closeAlbum()` |
| **Type/Resurfacing Detail** | `HomeCloudMemoriesScreen.tsx` `BackHandler` | Medium | `closeCollection()` |
| **Selection Mode** | `HomeCloudMemoriesScreen.tsx` `BackHandler` | Medium | `cancelMemorySelection()` |
| **ActionSheet** | `ActionSheet.tsx` backdrop press | Highest (modal) | `onClose()` |
| **Camera** | `MemoryCameraSurface.tsx` `BackHandler` | High | Cancel capture, return to intake |
| **Intake Review** | `MemoryIntake.tsx` `BackHandler` | High | Cancel review, return to create menu |
| **Files Root** | Global HomePlus navbar | Lowest | Exit HomeCloud |

**VERIFIED**: No conflicting handlers. Viewer back handler consumes event (`return true`). MemoryViewer back handler **must** be in priority chain before Album/Collection handlers (currently: `HomeCloudMemoriesScreen.tsx:1231` adds viewer handler, `1239` adds collection handler — **viewer wins**).

---

## 5. LOADING → CONTENT HANDOFF

| Surface | Loading State | Content State | Handoff |
|---------|---------------|---------------|---------|
| **Files Root** | `FlatList` + `RefreshControl` + `ListEmptyComponent` | Same `FlatList` | **Seamless** — list never unmounts |
| **Files Folder** | Same | Same | **Seamless** |
| **Files Viewer** | Per-page overlay (spinner/poster) | Per-page media | **Per-page** — shell immediate |
| **Memories Root** | `MemoriesLoadingSkeleton` (full screen) → `SectionList` | **BUG B** — skeleton replaced by content | **Needs fix** — rail should have independent loading |
| **Memories Album** | `AlbumDetailView` skeleton cards → `SectionList` | **Seamless** — overlay mounts with skeleton |
| **Memories Viewer** | Shell immediate (zIndex: 20) → per-page poster/spinner | **Per-page** — shell never waits | **GOOD** |
| **ActionSheets** | No loading — content ready | N/A | **Instant** |

---

## 6. REDUCED MOTION COMPLIANCE

| Transition | Current Respect | Implementation |
|------------|-----------------|----------------|
| `SegmentedControl` indicator | YES — `AccessibilityInfo.isReduceMotionEnabled` checked | `SegmentedControl.tsx:Animated.timing` skipped |
| Viewer pager | NOT CHECKED | `FlatList` paging — native, may not respect |
| ActionSheet slide | NOT CHECKED | `Modal animationType="slide"` — native |
| Album/Collection slide | NOT CHECKED | `Animated.View` — needs check |
| Drag auto-scroll | NOT CHECKED | Timer-based — should disable |
| Upload band | NOT CHECKED | `Animated.View` — needs check |

**ACTION REQUIRED**: Audit all `Animated.*` and `Modal` animations for `reduceMotion` compliance.

---

## 7. IMPLEMENTATION PRIORITY

| Priority | Motion | Effort | Dependencies |
|----------|--------|--------|--------------|
| **P0** | Viewer open/close (scale from/to tile) | High | Reanimated 3 / Shared Element Transition |
| **P0** | Tab switch cross-fade | Medium | `Animated.View` wrapper on both panes |
| **P1** | Album/Type/Resurfacing slide up/down | Medium | `Animated.View` on overlay containers |
| **P1** | Selection header morph | Low | `Animated.View` height/opacity |
| **P1** | Reduced motion audit | Medium | All `Animated.*` + `Modal` |
| **P2** | Folder enter/back slide (Files) | Medium | `Animated.View` on browser container |
| **P2** | Trash expand/collapse | Low | `Animated.View` height |
| **P3** | Upload band polish | Low | Existing `Animated.View` |

---

**End of Navigation & Motion Blueprint**

> **Next Step**: Implement P0 motions behind a `useReducedMotion` hook. Validate on device before P1.