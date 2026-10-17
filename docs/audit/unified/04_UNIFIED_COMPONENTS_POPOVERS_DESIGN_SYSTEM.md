# 04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md

**HomeCloud Unified Experience — Shared Components, Popover/Modal Architecture, Design System**

Status: **SOURCE_VERIFIED** (current state) + **DESIGN DECISIONS** (target). No implementation.

---

## 0. DESIGN TOKEN AUTHORITY

**Single Source**: `front/mi-front-limpio/theme.ts` — imported by both Files and Memories.

| Category | Status | Notes |
|----------|--------|-------|
| Colors | **SHARED** | Light/Dark/System — no module overrides |
| Typography | **SHARED** | `typography.*` tokens used everywhere |
| Spacing | **SHARED** | `spacing[1-6]` — 4/8/12/16/24/32 |
| Border Radius | **SHARED** | `radius.xs/xl/full` — 4/24/9999 |
| Touch Targets | **SHARED** | `touchTargets.normal=44`, `large=48` |
| Component Sizes | **SHARED** | `primaryButtonHeight=52`, `iconButtonSize=44` |
| Shadows/Elevation | **SHARED** | `elevation.*` tokens |
| Motion | **NOT YET TOKENIZED** | See §3 — proposed `MOTION` tokens |

**VERDICT**: Design tokens are **fully unified**. No Files/Memories divergence.

---

## 1. SHARED PRIMITIVE COMPONENTS (Currently Used by Both)

| Component | File | Used by Files | Used by Memories | Notes |
|-----------|------|---------------|------------------|-------|
| `AppButton` | `components/ui/AppButton.tsx` | YES | YES | Variants: `primary`, `secondary`, `text`, `icon`, `destructive`; sizes: `sm`, `md`, `lg`; composes `accessibilityState` |
| `AppText` | `components/ui/AppText.tsx` | YES | YES | Variants: `displayLarge`, `title1`, `title2`, `body`, `caption`, `overline` |
| `AppInput` | `components/ui/AppInput.tsx` | YES | YES | `variant: 'default' | 'search'`, controlled/uncontrolled |
| `ActionSheet` | `components/ui/ActionSheet.tsx` | YES | YES | **Unified host** — sizes: `full`, `content`, `scrollable-content`, `near-full` |
| `ErrorState` | `components/ui/ErrorState.tsx` | YES | YES | Icon + message + `Reintentar` button |
| `Skeleton` | `components/ui/Skeleton.tsx` | YES | YES | `variant: 'text' | 'card' | 'circle'`, `background.alt` base |
| `InteractivePressable` | `components/ui/InteractivePressable.tsx` | YES | YES | 44×44 min, `pressScale`, haptic, accessibility |
| `HomePlusIcon` | `constants/icons.tsx` | YES | YES | Unified icon set, `size`, `color` props |
| `SegmentedControl` | `components/ui/SegmentedControl.tsx` | NO (global only) | NO (global only) | Global tab selector only; `selectionMode="multiple"` for Planner |
| `DatePickerSheet` | `components/ui/DatePickerSheet.tsx` | NO | YES | Memories: 4-precision date picker |
| `FormActionRow` | `components/ui/FormActionRow.tsx` | YES | YES | Button row with consistent spacing |

---

## 2. MODULE-SPECIFIC COMPONENTS (Not Shared — By Design)

### 2.1 Files-Specific

| Component | Purpose | Why Not Shared |
|-----------|---------|----------------|
| `FileTile` / `FolderTile` | Grid items with preview/fallback, selection overlay | Files: info-dense, 2-col grid, contextual long press |
| `FileActionHost` | Canonical action sheet host (7 rows) | Files: 7 fixed actions, scrollable, per-row busy |
| `FileMoveDestinationPicker` | Tree destination picker (depth-first) | Files: hierarchical folders, computed paths |
| `FilesFilterMenu` | Compact filter: Show (Todos/Favoritos) + Order (Recientes/A-Z) | Files: server-side filter modes |
| `FileIntake` | Add sheet: Elegir archivo, Escanear, Nueva carpeta | Files: scanner + folder inheritance |
| `HomeCloudFileViewerScreen` | Common-format viewer (PDF, Office, Text, Media) | Files: privacy-first, staged originals, system hand-off |

### 2.2 Memories-Specific

| Component | Purpose | Why Not Shared |
|-----------|---------|----------------|
| `MemorySelectableCard` | Tile with selection, drag (D4), long press | Memories: 3-col timeline, drag selection, contextual tap |
| `MemoryCards` (`MemoryImageTile`, `MemoryVideoTile`, `MemoryAudioTile`, `MemoryWrittenTile`) | Media-specific tiles | Memories: visual-first, media-type identity |
| `MemoryTimelineRow` | 3-col row with section grouping | Memories: chronological sections |
| `AlbumsRail` | Horizontal rail with cover tiles + create tile | Memories: album-centric, conditional empty |
| `AlbumTile` / `AlbumCover` | Album cover with fallback states | Memories: derived cover (oldest visual) |
| `AlbumDetailView` | Nested overlay with SectionList | Memories: album as narrative, oldest→newest |
| `MemoryViewer` | Immersive shell (zIndex: 20, hides global chrome) | Memories: immersive, source-locked pager |
| `MemoryVideoPage` / `MemoryAudioPage` / `ImagePage` | Media pages with active-only fetch | Memories: preview→original, active-only |
| `MemoryViewerSource` | Source-immutable dataset resolver | Memories: 6 sources (root, album, 4 types, resurfacing, trash, favorites) |
| `MemorySelectionHeader` | `[X] N seleccionados [⋯ Acciones]` | Memories: no `✓` gate, no internal nav |
| `MemoryMediaReview` | Binary review: preview + editable date + Album + description | Memories: semantic date (4 precisions), optional Album |
| `MemoryAudioRecorder` | Audio capture with live waveform | Memories: microphone, real capture instant |
| `MemoryCameraSurface` | Photo/Video capture with Retake | Memories: real capture instant = `exact` |

### 2.3 Shared Capture (Architecture — Not UI Components)

| Capability | Owner | Consumers |
|------------|-------|-----------|
| Document Scanner | `Shared Capture → Document Scanner` | Files, Finance (future), Assets (future) |
| Audio Recorder | `Shared Media Capture → Audio Recorder` | Memories, Messages (future) |
| Camera | `Shared Media Capture → Camera` | Memories, Files (scanner), Messages (future) |

---

## 3. POPOVER / MODAL ARCHITECTURE — AUDIT

### 3.1 Current Overlay Systems

| System | Component | Type | Used By | Stacking Risk |
|--------|-----------|------|---------|---------------|
| **RN Modal (ActionSheet)** | `ActionSheet.tsx` | `Modal transparent animationType="slide"` | Files, Memories, Global | **SAFE** — single host, content replaces |
| **Absolute View (Viewer)** | `MemoryViewer.tsx`, `HomeCloudFileViewerScreen.tsx` | `View position: absolute, zIndex: 20` | Files, Memories | **SAFE** — not a Modal, no stacking |
| **Nested Overlay (Album/Type/Resurfacing)** | `AlbumDetailView.tsx`, Collection overlay | `View position: absolute, zIndex: 10` | Memories | **SAFE** — below Viewer, above root |
| **RN Modal (System Permissions)** | Native | System | Camera, Mic, Photos | **EXTERNAL** — not app-controlled |
| **RN Modal (Share Sheet)** | `Share.share()` | System | Files, Memories | **EXTERNAL** |

### 3.2 Stacking Rules (Enforced by Architecture)

```
zIndex: 50  → Upload Progress Band (global, persistent)
zIndex: 20  → Memory Viewer / File Viewer / Office Viewer (absolute Views)
zIndex: 10  → Album Detail / Type Collection / Resurfacing Group (absolute Views)
zIndex: 1   → ActionSheet Modal (RN Modal)
zIndex: 0   → ActionSheet Backdrop
zIndex: 0   → Root Content (FlatList/SectionList)
```

**VERIFIED**: No two `Modal` components stack. Viewer is a `View`, not a `Modal`. Album/Type overlays are `View`s below Viewer. ActionSheet is the **only** `Modal`.

### 3.3 ActionSheet Host Analysis

| Aspect | Current | Contract |
|--------|---------|----------|
| **Single Host** | `ActionSheet` component used everywhere | **ENFORCED** — no second `Modal` |
| **Content Replacement** | `FileActionHost`, `FilesFilterMenu`, `FileMoveDestinationPicker`, `AlbumSheets`, Memory actions — all render into same `ActionSheet` | **ENFORCED** — `visible` prop toggles, content replaces |
| **Sizes** | `content` (default), `scrollable-content` (Files actions), `near-full` (scanner review), `full` (rare) | **CONSISTENT** |
| **Backdrop Dismiss** | `Pressable` on backdrop → `onClose` | **STANDARD** |
| **Keyboard Handling** | `keyboardShouldPersistTaps="handled"` on Modal | **STANDARD** |
| **Safe Areas** | `paddingTop: insets.top`, `paddingBottom: max(insets.bottom, spacing[4])` | **STANDARD** |
| **Drag Handle** | 36×4 pill, `borderRadius: 2` | **STANDARD** |

### 3.4 Contextual Popover Candidates (Design Decision)

| Current Menu | Module | Current Form | Target Form | Rationale |
|--------------|--------|--------------|-------------|-----------|
| File Tile Long Press → Actions | Files | `FileActionHost` (ActionSheet, bottom) | **Anchored Popover** (above tile) | Tile is reference; popover avoids full-screen sheet for 7 rows |
| Folder Tile Long Press → Actions | Files | Same `FileActionHost` | **Anchored Popover** | Same |
| Memory Tile Long Press → Actions | Memories | Selection mode entry (long press) | **Keep as Selection Entry** | Long press = selection entry (not actions) |
| Viewer `⋯` Menu (1 item) | Memories | ActionSheet (bottom) | **Anchored Popover** (from `⋯` button) | Single item + few actions — popover faster |
| Viewer `⋯` Menu (N items, Selection) | Memories | ActionSheet (bottom) | **Anchored Popover** (from `⋯` button) | Contextual to Viewer |
| Album `⋯` Menu | Memories | `AlbumSheets.tsx` (ActionSheet) | **Anchored Popover** | 3-4 actions — popover sufficient |
| Type/Resurfacing `⋯` Menu | Memories | (via Selection) ActionSheet | **Anchored Popover** | Consistent with Album |
| Trash `⋯` Menu | Both | (via Selection) ActionSheet | **Anchored Popover** | Consistent |
| Favorites `⋯` Menu | Memories | (via Selection) ActionSheet | **Anchored Popover** | Consistent |
| Header Overflow (`⋯`) | Files | ActionSheet (bottom) | **Keep as ActionSheet** | Contains `Seleccionar` (mode entry) — sheet is correct |
| Header Overflow (`⋯`) | Memories | (none — `+` only) | N/A | N/A |
| Create Menu (`+`) | Files | ActionSheet (bottom) | **Keep as ActionSheet** | 3 items, one is Scanner (full flow) |
| Create Menu (`+`) | Memories | ActionSheet (bottom) | **Keep as ActionSheet** | 5 flat items, all launch sub-flows |

**DECISION**: 
- **Anchored Popovers** for: File/Folder actions (Files), Viewer `⋯` (Memories), Album/Type/Resurfacing/Trash/Favorites `⋯` (Memories)
- **ActionSheet (Bottom Sheet)** for: Header overflows, Create menus, Scanner review, Multi-step flows, Any >5 items

**Rationale**: Popovers are faster for contextual "do one thing" near the trigger. Sheets are better for "choose from many" or multi-step flows. The `ActionSheet` component supports both via `size="content"` (popover-like) and `size="scrollable-content"` (sheet). We standardize on **one component** with size variants.

### 3.5 Popover Implementation Strategy (Proposed)

```typescript
// Extend ActionSheet to support anchored mode
interface ActionSheetProps {
  // ... existing
  anchor?: 'bottom' | 'top' | 'left' | 'right' | 'center'; // NEW
  anchorRef?: React.RefObject<View>; // NEW — for positioning
  size: 'full' | 'content' | 'scrollable-content' | 'near-full' | 'popover'; // NEW
}

// Popover variant:
// - size="popover" → no backdrop, positioned by anchorRef, arrow pointing to anchor
// - Dismiss on: outside tap, back gesture, escape, anchor scroll
// - Safe area: clamped to insets
// - Collision: flip anchor if no space
```

**Collision Rules**:
1. Prefer `anchor='top'` for bottom-anchored triggers (tile long press)
2. Flip to `anchor='bottom'` if < 100dp space above
3. Clamp to `insets.left + 16` / `insets.right + 16`
4. Max width: `viewportWidth - 32`
5. Keyboard: dismiss on show, resize if input inside

---

## 4. MODAL HOST — UNIFIED AUTHORITY

### 4.1 Current State

| Module | Modal Host | Count | Stacking |
|--------|------------|-------|----------|
| Files | `ActionSheet` (RN Modal) | 1 | Safe |
| Memories | `ActionSheet` (RN Modal) | 1 | Safe |
| Global | `HomeCloudScreen` — no Modal | 0 | N/A |

**VERIFIED**: Exactly **one** `Modal` component in the entire HomeCloud tree: `ActionSheet`. No stacked Modals. No competing visibility state owners.

### 4.2 Target: Single Overlay Authority

```typescript
// services/homecloud/OverlayHost.tsx — NEW (proposed)
export const OverlayHost = () => {
  // Manages: Viewer (zIndex:20), Nested Overlays (zIndex:10), ActionSheet (Modal)
  // Ensures: No zIndex conflicts, proper dismissal order, back handler priority
  // Provides: useOverlay() hook for programmatic open/close
};
```

**Responsibilities**:
1. **Z-Index Registry** — single source of truth for layer ordering
2. **Back Handler Priority** — Viewer > Nested Overlays > ActionSheet > Root
3. **Dismissal Cascade** — Close Viewer → close Nested → close Sheet → back to root
4. **Keyboard Awareness** — dismiss sheets on keyboard show (configurable)
5. **Safe Area & Collision** — shared logic for all anchored popovers

**Migration Path**: Wrap `HomeCloudScreen` with `OverlayHost.Provider`. All `ActionSheet` and overlay components register/unregister. No breaking changes to existing props.

---

## 5. LOADING / SKELETON / EMPTY / ERROR PATTERNS

### 5.1 Mutually Exclusive States (Enforced)

| State | Files | Memories | Shared Contract |
|-------|-------|----------|-----------------|
| **LOADING** | `FlatList` + `RefreshControl` + skeleton footer | `MemoriesLoadingSkeleton` (full) / Rail skeleton / SectionList skeleton | Skeleton matches content shape |
| **READY_EMPTY** | `ListEmptyComponent` (in FlatList) | Conditional copy + CTA per section | Never shows skeleton |
| **READY_DATA** | `FlatList` / `SectionList` data | Same | Content renders |
| **ERROR** | `ErrorState` + `Reintentar` (preserves list) | `ErrorState` + `Reintentar` (preserves content) | Never destroys loaded data |
| **REFRESHING** | `RefreshControl` indicator (preserves list) | Same `RefreshControl` (preserves content) | Same refresh implementation |

### 5.2 Skeleton Specifications

| Surface | Skeleton Variant | Dimensions | Source |
|---------|------------------|------------|--------|
| Files Grid Tile | `card` | `width: tileWidth, height: tileWidth, borderRadius: radius.xl` | `HomeCloudFilesScreen.tsx` |
| Files Folder Tile | `card` | `width: tileWidth, height: 132, borderRadius: radius.xl` | `HomeCloudFilesScreen.tsx` |
| Memories Timeline Tile | `card` | `width: tileWidth, height: tileWidth, borderRadius: radius.xl` | `MemoryTimelineRow.tsx` |
| Albums Rail Tile | `card` | `width: 132, height: 124, borderRadius: radius.xl` | `AlbumsRail.tsx:69` |
| Album Cover | `circle` | `width: 132, height: 132` | `AlbumTile.tsx:91` |
| Album Detail Cards | `card` | `width: tileWidth, height: tileWidth` | `AlbumDetailView.tsx` |
| Type Tiles | `card` | `width: 100, height: 100` | `MemoryCollectionTile.tsx` |
| Resurfacing Tiles | `card` | `width: 160, height: 160` | Resurfacing render |

**RULE**: Skeleton **only** while waiting for first content. Never after `READY_EMPTY`. Never permanent.

---

## 6. TOASTS & FEEDBACK

| Feedback | Component | Trigger | Duration | Shared |
|----------|-----------|---------|----------|--------|
| **Snackbar** | `HomeCloudUploadProgress` (band) | Upload start/progress/fail | Persistent until dismiss | YES |
| **Action Success** | Inline in ActionSheet / Selection bar | Favorite, Move, Share, Trash | 2-3s auto-dismiss | YES |
| **Undo** | Snackbar with `Deshacer` action | Trash, Delete | 8-10s | YES |
| **Error Toast** | `ErrorState` inline (not toast) | Network, permission, validation | Until retry | YES |
| **Haptic** | `expo-haptics` | Selection toggle, long press, drag arm, action confirm | Instant | YES |

**No standalone Toast component** — all feedback is inline or in the persistent upload band.

---

## 7. ACCESSIBILITY CONTRACTS (Shared)

| Rule | Implementation | Verified |
|------|----------------|----------|
| **Hit Target ≥ 44×44** | `touchTargets.normal` in `AppButton`, `InteractivePressable`, all icon buttons | SOURCE_VERIFIED |
| **Safe Areas** | `useSafeAreaInsets()` in all full-screen surfaces (Viewer, Album, Camera, Scanner) | SOURCE_VERIFIED |
| **Contrast** | Token-driven — `text.primary` on `background.primary` = AAA | TOKEN_VERIFIED |
| **Labels** | Every action has `accessibilityLabel` or text child | SOURCE_VERIFIED |
| **State Announcement** | `accessibilityState={{busy: true, selected: true}}` on tiles, buttons | SOURCE_VERIFIED |
| **Dynamic Type** | All `AppText` use `typography.*` tokens, no hardcoded sizes | SOURCE_VERIFIED |
| **Reduce Motion** | `SegmentedControl` checks; **Viewer/Sheets/Drag need audit** | PARTIAL |
| **Screen Reader** | `checkbox` role in selection, `selected` state, `header` traits | SOURCE_VERIFIED |
| **Focus Order** | Logical: Header → Content → Footer → Overlays | SOURCE_VERIFIED |

---

## 8. WHAT MUST REMAIN SPECIALIZED

### 8.1 Files: Efficient Document Organization

| Aspect | Specialization | Why Not Unified |
|--------|----------------|-----------------|
| **Grid Density** | 2-col, compact, info-efficient | Memories needs breathing room, media-first |
| **Tile Metadata** | Name (2 lines), optional badge, no date | Memories shows date prominently |
| **Folder Hierarchy** | Tree with breadcrumb trail | Memories has flat Albums + Types |
| **Search** | Global + folder-scoped, metadata-first | Memories: OUT (grouping sufficient) |
| **Sort/Filter** | Compact filter menu (Show/Order) | Memories: no filter chips |
| **Selection** | Tap toggle + drag sweep (D4) | Memories: same D4 but different entry (long press) |
| **Viewer** | Common-format (PDF, Office, Text) | Memories: immersive media-only |

### 8.2 Memories: Photographic, Emotional, Immersive

| Aspect | Specialization | Why Not Unified |
|--------|----------------|-----------------|
| **Grid Density** | 3-col timeline, larger tiles, media-first | Files needs compact info density |
| **Tile Identity** | Media type icon + semantic date + album badge | Files shows folder + note |
| **Albums** | Narrative (oldest→newest), derived cover | Files: folders are organizational (newest→oldest) |
| **Types** | 4 auto-collections (Fotos/Videos/Audios/Notas) | Files: no auto-types |
| **Resurfacing** | Deterministic "Para volver a ver" (exact-only) | Files: no resurfacing |
| **Semantic Date** | 4 precisions (exact/month-year/year/unknown) | Files: document date (single) |
| **Viewer** | Immersive, hides global chrome, source-locked pager | Files: layer over browser, chrome visible |
| **Capture** | Camera, Audio Record, Import — real capture instant | Files: Scanner only |
| **Lifecycle** | Trash + Restore + Purge (preserves albums) | Files: Trash + Purge (no album equivalent) |

---

## 9. COMPONENT INVENTORY — UNIFIED vs SPECIALIZED

| Category | Unified (Shared) | Files-Specific | Memories-Specific |
|----------|------------------|----------------|-------------------|
| **Primitives** | 9 (`AppButton`, `AppText`, `AppInput`, `ActionSheet`, `ErrorState`, `Skeleton`, `InteractivePressable`, `HomePlusIcon`, `FormActionRow`) | 0 | 0 |
| **Navigation** | `SegmentedControl` (global tab only) | — | — |
| **Browser/Grid** | — | `FileTile`, `FolderTile`, `FileGrid` (FlatList) | `MemorySelectableCard`, `MemoryCards`, `MemoryTimelineRow`, `SectionList` |
| **Collections** | — | `FileMoveDestinationPicker` (tree) | `AlbumsRail`, `AlbumTile`, `AlbumDetailView`, `MemoryCollectionTile` (Types) |
| **Viewers** | — | `HomeCloudFileViewerScreen` (multi-format) | `MemoryViewer`, `MemoryVideoPage`, `MemoryAudioPage`, `ImagePage` |
| **Actions** | — | `FileActionHost`, `FilesFilterMenu` | `MemorySelectionHeader`, `AlbumSheets`, `MemoryActionGrammar` (pure fn) |
| **Intake** | — | `FileIntake`, `HomeCloudScannerScreen` | `MemoryIntake`, `MemoryCameraSurface`, `MemoryAudioRecorder`, `MemoryMediaReview` |
| **Lifecycle** | — | `HomeCloudFilesTrashScreen` | Trash section (inline), `homecloudLifecycleService` |
| **Upload** | `HomeCloudUploadProgress` (band) | — | — |
| **Capture** | Shared Architecture (Scanner, Camera, Audio) | Scanner UI | Camera UI, Audio UI |

---

## 10. DESIGN SYSTEM GAPS (To Close for Unified Freeze)

| Gap | Current | Target | Owner |
|-----|---------|--------|-------|
| Motion Tokens | Not tokenized | Add `MOTION` to `theme.ts` | Design System |
| Reduce Motion Audit | Partial (SegmentedControl only) | All `Animated.*`, `Modal`, drag | Both modules |
| Popover Variant | ActionSheet only | `size="popover"` in ActionSheet | Shared UI |
| Overlay Authority | Implicit (zIndex conventions) | Explicit `OverlayHost` | Shared Services |
| Focus Management | Manual per-screen | `useFocusTrap` in ActionSheet/Viewer | Shared UI |
| Announcements | Inline only | `useAnnouncement` hook for async feedback | Shared Services |
| Theme Testing | No automated contrast tests | Snapshot tests for Light/Dark/System | Design System |

---

**End of Components, Popovers & Design System**

> **Key Principle**: Share primitives and infrastructure. Specialize browser, viewer, and intake. One overlay host. One token system. No duplicate Modal systems.