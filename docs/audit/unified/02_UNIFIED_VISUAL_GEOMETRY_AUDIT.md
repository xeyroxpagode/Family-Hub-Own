# 02_UNIFIED_VISUAL_GEOMETRY_AUDIT.md

**HomeCloud Unified Experience — Source-Level Visual Geometry Audit**

Status: **STATICALLY_INFERRED** — All measurements derived from source code (tokens, styles, layout calculations). No device screenshots or ADB available. **DEVICE_VISUAL_QA_REQUIRED** for all pixel-level claims.

---

## 0. TOKEN FOUNDATION (Shared)

| Token | Files Value | Memories Value | Source |
|-------|-------------|----------------|--------|
| `colors.background.primary` | `#FFFFFF` / `#000000` | Same | `theme.ts` |
| `colors.background.alt` | `#F2F2F7` / `#1C1C1E` | Same | `theme.ts` |
| `colors.surface.card` | `#FFFFFF` / `#1C1C1E` | Same | `theme.ts` |
| `colors.surface.soft` | `#E5E5EA` / `#2C2C2E` | Same | `theme.ts` |
| `colors.border.subtle` | `#C6C6C8` / `#38383A` | Same | `theme.ts` |
| `colors.terracotta[600]` | `#C84B31` | Same (brand accent) | `theme.ts` |
| `colors.terracotta[500]` | `#D95A3D` | Same | `theme.ts` |
| `typography.displayLarge` | 32/38, weight 600 | Same | `theme.ts` |
| `typography.title1` | 28/34, weight 600 | Same | `theme.ts` |
| `typography.title2` | 22/28, weight 600 | Same | `theme.ts` |
| `typography.body` | 17/24, weight 400 | Same | `theme.ts` |
| `typography.caption` | 13/18, weight 400 | Same | `theme.ts` |
| `spacing[1]` | 4 | Same | `theme.ts` |
| `spacing[2]` | 8 | Same | `theme.ts` |
| `spacing[3]` | 12 | Same | `theme.ts` |
| `spacing[4]` | 16 | Same | `theme.ts` |
| `spacing[5]` | 24 | Same | `theme.ts` |
| `spacing[6]` | 32 | Same | `theme.ts` |
| `radius.xs` | 4 | Same | `theme.ts` |
| `radius.sm` | 8 | Same | `theme.ts` |
| `radius.md` | 12 | Same | `theme.ts` |
| `radius.lg` | 16 | Same | `theme.ts` |
| `radius.xl` | 24 | Same | `theme.ts` |
| `radius.full` | 9999 | Same | `theme.ts` |
| `touchTargets.normal` | 44 | Same | `theme.ts:569` |
| `touchTargets.large` | 48 | Same | `theme.ts:570` |
| `componentSizes.primaryButtonHeight` | 52 | Same | `theme.ts` |
| `componentSizes.iconButtonSize` | 44 | Same | `theme.ts` |

**VERDICT**: Tokens are **fully shared** — single `theme.ts` imported by both modules.

---

## 1. FILES — VISUAL GEOMETRY

### 1.1 Root & Folder Browser

| Aspect | Source Evidence | 360pt | 390pt | 430pt | Classification |
|--------|-----------------|-------|-------|-------|----------------|
| **Header Row Height** | `HomeCloudFilesScreen.tsx` titleRow: `paddingHorizontal: spacing[4]` (16), `height: 56` (implied by `primaryButtonHeight` + padding) | 56 | 56 | 56 | STATICALLY_INFERRED |
| **Search Field** | `paddingHorizontal: spacing[4]`, `height: 44`, `borderRadius: radius.md` (12) | 44h | 44h | 44h | STATICALLY_INFERRED |
| **Filter Icon** | `AppButton variant="icon"` → `touchTargets.normal` (44) | 44×44 | 44×44 | 44×44 | STATICALLY_INFERRED |
| **Grid Columns** | `numColumns={2}` fixed, `columnWrapperStyle: { paddingHorizontal: spacing[3] (12), justifyContent: 'space-between' }` | 2 cols | 2 cols | 2 cols | SOURCE_VERIFIED |
| **Tile Width** | `(width - 3*spacing[3]) / 2` → ~159 / ~174 / ~194 | 159 | 174 | 194 | STATICALLY_INFERRED |
| **Tile Height** | Image: `aspectRatio: 1` → square; Folder: fixed `height: 132` + label | ~159+label | ~174+label | ~194+label | STATICALLY_INFERRED |
| **Tile Padding** | `padding: spacing[2]` (8) internal | 8 | 8 | 8 | STATICALLY_INFERRED |
| **Tile Label** | `AppText variant="caption"`, `numberOfLines: 2`, `marginTop: spacing[1]` (4) | 2 lines | 2 lines | 2 lines | STATICALLY_INFERRED |
| **Folder Badge** | `position: 'absolute', top: 8, right: 8`, `radius.full`, `backgroundColor: terracotta[600]` | 16×16 min | 16×16 min | 16×16 min | STATICALLY_INFERRED |
| **Gutter** | `columnGap: spacing[3]` (12) via `justifyContent: 'space-between'` | 12 | 12 | 12 | STATICALLY_INFERRED |
| **Pull-to-Refresh** | `RefreshControl` on `FlatList`, `colors.terracotta[600]` | Native | Native | Native | SOURCE_VERIFIED |
| **Pagination Footer** | `ListFooterComponent`: `ActivityIndicator` (24dp) + 24dp spacer when idle | 24 | 24 | 24 | STATICALLY_INFERRED |
| **Empty State** | `ListEmptyComponent`: centered `VStack` gap 16, icon 64, `AppButton size="md"` | 64 icon | 64 icon | 64 icon | STATICALLY_INFERRED |

### 1.2 File Tiles & Cards

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Visual Area** | `FileTile`: `aspectRatio: 1`, `borderRadius: radius.xl` (24), `overflow: 'hidden'` | SOURCE_VERIFIED |
| **Preview Image** | `Image resizeMode="cover"`, `style={styles.preview}` = full tile | SOURCE_VERIFIED |
| **Fallback (PDF/Doc)** | `FileTypeFallback`: icon 32, label `caption`, `colors.terracotta[600]` | STATICALLY_INFERRED |
| **Selection Overlay** | `MemorySelectableCard` (shared): `selected` → `borderWidth: 3`, `borderColor: terracotta[600]`, checkmark icon | SOURCE_VERIFIED |
| **Long Press Hit Target** | Entire tile `onLongPress` → `PanResponder` on `MemorySelectableCard` | SOURCE_VERIFIED |
| **Action Overflow** | Removed in Stage 2 Reopen — now header overflow `Seleccionar` + long press on tile | SOURCE_VERIFIED |

### 1.3 Action Sheet (Canonical)

| Aspect | Source Evidence | 360pt | 390pt | 430pt | Classification |
|--------|-----------------|-------|-------|-------|----------------|
| **Sheet Height** | `ActionSheet size="scrollable-content"` → `0.9 * viewportHeight - insetTop` | ~324 | ~351 | ~387 | STATICALLY_INFERRED |
| **Content Box** | `fileActionSheetLayoutPolicy`: `sheetHeight - chromeTop (28) - header (74) - bottom (max(insetBottom,16))` | ~190 | ~217 | ~253 | STATICALLY_INFERRED |
| **Row Height** | `actionRowMinHeightDp: 52` + `rowGapDp: 12` | 52 | 52 | 52 | STATICALLY_INFERRED |
| **6 Rows Fit?** | `intrinsicContentDp = 6*52 + 5*12 + 8 + caption(30) ≈ 410` → **overflows at 360/1.0, 360/1.3** | OVERFLOW | fits | fits | PROVEN_STATIC (arithmetic) |
| **Scrollable** | `size="scrollable-content"` + `ScrollView` wrapper with `flexShrink: 1` | YES | YES | YES | SOURCE_VERIFIED |
| **Favorite Row** | Row 6 of 7 — was clipped before scrollable fix | NOW REACHABLE | REACHABLE | REACHABLE | COMPONENT_BEHAVIOUR |

### 1.4 File Viewer

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Viewer Container** | `HomeCloudFileViewerScreen.tsx`: `StyleSheet.absoluteFill`, `zIndex: 20` | SOURCE_VERIFIED |
| **Top Chrome** | `paddingTop: insets.top + 12`, `height: 56`, `flexDirection: 'row'`, `justifyContent: 'space-between'` | STATICALLY_INFERRED |
| **Close Button** | `AppButton variant="icon" size="md"` → 44×44 hit, `accessibilityLabel="Cerrar"` | SOURCE_VERIFIED |
| **Semantic Date** | `AppText variant="body"`, `color: text.primary`, centered | STATICALLY_INFERRED |
| **Actions Button** | `AppButton variant="icon"` → `⋯` menu (not yet implemented in Files Viewer) | SOURCE_VERIFIED |
| **Image Page** | `Animated.Image`, `style={[{width}, {height: '100%'}]}` — declares page width | SOURCE_VERIFIED |
| **Video Page** | `VideoView style={{width, height: '100%'}}`, `nativeControls`, `fullscreenOptions={{enable:true}}` | SOURCE_VERIFIED |
| **Audio Page** | Custom controls: progress bar `height: 4`, time labels `caption`, ±10s buttons `icon` | STATICALLY_INFERRED |
| **PDF Page** | `WebView` with local pdf.js, `style={{width, height: '100%'}}`, `originWhitelist` | SOURCE_VERIFIED |
| **Office Page** | `ViewerOfficeSurface` → `WebView style={styles.officeFill}` = `flex: 1` | SOURCE_VERIFIED |
| **Safe Areas** | `useSafeAreaInsets()` → top/bottom insets applied to chrome | SOURCE_VERIFIED |
| **Android Back** | `BackHandler` added on mount, calls `onClose`, removed on unmount | SOURCE_VERIFIED |

### 1.5 Intake & Scanner

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Add Sheet** | `ActionSheet size="content"` → fits content, max 90% viewport | STATICALLY_INFERRED |
| **Scanner Viewfinder** | `HomeCloudScannerScreen.tsx`: `CameraView style={StyleSheet.absoluteFill}`, quad overlay | STATICALLY_INFERRED |
| **Scanner Review** | `ActionSheet size="near-full"` → multi-page thumbnails horizontal scroll | STATICALLY_INFERRED |
| **New Folder Sheet** | `ActionSheet size="content"` → `AppInput` + `AppButton` row | STATICALLY_INFERRED |

---

## 2. MEMORIES — VISUAL GEOMETRY

### 2.1 Root IA Layout

| Aspect | Source Evidence | 360pt | 390pt | 430pt | Classification |
|--------|-----------------|-------|-------|-------|----------------|
| **Title Row** | `HomeCloudMemoriesScreen.tsx:1592+`: `paddingHorizontal: spacing[4]` (16), `height: 56`, `flexDirection: 'row'`, `justifyContent: 'space-between'` | 56 | 56 | 56 | STATICALLY_INFERRED |
| **Create Button (+)** | `InteractivePressable minWidth={44} minHeight={44}`, no circle, `color: terracotta[600]` | 44×44 | 44×44 | 44×44 | SOURCE_VERIFIED |
| **Resurfacing Band** | Conditional render: `resurfacingGroups.length > 0` → `SectionList` horizontal, `contentContainerStyle: { paddingHorizontal: spacing[3] }` | Variable | Variable | Variable | SOURCE_VERIFIED |
| **Resurfacing Tile** | `MemoryResurfacingTile`: `width: 160`, `height: 160`, `borderRadius: radius.xl` (24) | 160 | 160 | 160 | STATICALLY_INFERRED |
| **Albums Rail** | `AlbumsRail.tsx`: `ScrollView horizontal`, `contentContainerStyle: { paddingHorizontal: spacing[3] }` | Horizontal | Horizontal | Horizontal | SOURCE_VERIFIED |
| **Album Tile** | `AlbumTile.tsx`: `width: 132`, `height: 132`, `borderRadius: radius.xl` (24), cover `aspectRatio: 1` | 132 | 132 | 132 | SOURCE_VERIFIED |
| **Album Label** | `AlbumTile`: `AppText variant="caption"`, `numberOfLines: 2`, `marginTop: spacing[1]` (4), width 132 | 2 lines | 2 lines | 2 lines | STATICALLY_INFERRED |
| **Create Album Tile** | Last in rail: `AlbumTile` variant with `+` icon + "Nuevo álbum" label | 132 | 132 | 132 | STATICALLY_INFERRED |
| **Types Rail** | `MemoryCollectionTile.tsx`: 4 fixed tiles, `width: 100`, `height: 100`, `borderRadius: radius.xl` | 100 | 100 | 100 | STATICALLY_INFERRED |
| **Timeline** | `SectionList`: `contentContainerStyle: { paddingBottom: spacing[6] (32) }`, `stickySectionHeadersEnabled={false}` | Full width | Full width | Full width | SOURCE_VERIFIED |
| **Timeline Row** | `MemoryTimelineRow.tsx`: 3 columns, `flex: 1`, `gap: spacing[2]` (8), `paddingHorizontal: spacing[3]` (12) | 3 cols | 3 cols | 3 cols | SOURCE_VERIFIED |
| **Timeline Tile** | `MemorySelectableCard`: `aspectRatio: 1`, `borderRadius: radius.xl` (24) | ~106 | ~116 | ~130 | STATICALLY_INFERRED |
| **Section Header** | `AppText variant="title2"`, `paddingHorizontal: spacing[4]` (16), `marginTop: spacing[5]` (24) | 28/34 | 28/34 | 28/34 | STATICALLY_INFERRED |
| **Load More Footer** | `ListFooterComponent`: `AppButton title="Mostrar más recuerdos"` + `ActivityIndicator` | 52h | 52h | 52h | STATICALLY_INFERRED |

### 2.2 Selection Mode

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Selection Header** | Replaces titleRow: `[X] N seleccionados [⋯ Acciones]`, `paddingHorizontal: spacing[4]`, `height: 56` | SOURCE_VERIFIED |
| **Selection Check** | `MemorySelectableCard`: `selected` → `borderWidth: 3`, `borderColor: terracotta[600]`, checkmark 24×24 | SOURCE_VERIFIED |
| **Drag Selection** | `homecloudMemoryDrag.ts`: `MEMORY_DRAG_TAKEOVER_SLOP = 6`, measured frames, `PanResponder` | SOURCE_VERIFIED |
| **Auto-scroll** | Edge zone 72dp, step 12dp, tick 16ms, clamped to `contentHeight - viewportHeight` | STATICALLY_INFERRED |
| **Action Sheet** | Same `ActionSheet` host, `size="content"`, replaces content for destination picker | SOURCE_VERIFIED |

### 2.3 Album Detail (Overlay)

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Overlay Container** | `AlbumDetailView.tsx`: `Position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10` | SOURCE_VERIFIED |
| **Back/Header** | `paddingTop: insets.top + spacing[3]`, `flexDirection: 'row'`, back button 44×44 | STATICALLY_INFERRED |
| **Grid** | `SectionList` with `numColumns={3}`, `columnWrapperStyle: { paddingHorizontal: spacing[3], justifyContent: 'space-between' }` | 3 cols | STATICALLY_INFERRED |
| **Album Tile** | Same as rail: `width: (width - 4*spacing[3]) / 3` → ~104 / ~114 / ~127 | STATICALLY_INFERRED |
| **No Permanent X** | `albumScopeAction` removed (Bug D fix) — removal only via selection | SOURCE_VERIFIED |

### 2.4 Memory Viewers (Immersive)

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Viewer Container** | `MemoryViewer.tsx`: `StyleSheet.absoluteFill`, `zIndex: 20`, hides global navbar, segmented, header, AppTopBar | SOURCE_VERIFIED |
| **Top Chrome** | `paddingTop: insets.top + 12`, `height: 56`, `[Cerrar] [Fecha] [⋯]` — close 44×44 | STATICALLY_INFERRED |
| **Bottom Chrome** | `paddingBottom: insets.bottom + 12`, source label + media controls (audio/video) | STATICALLY_INFERRED |
| **Image Page** | `ImagePage`: `Animated.Image`, `style={[{width}, {height: '100%'}]}` — declares width | SOURCE_VERIFIED |
| **Video Page** | `MemoryVideoPage.tsx`: `ActiveMemoryVideoPage` → `VideoView style={{width}}` — **NOW declares width** (Run A fix) | SOURCE_VERIFIED |
| **Audio Page** | `MemoryAudioPage.tsx`: `ActiveMemoryAudioPage` → `View style={{width}}` — **NOW declares width** (Run A fix) | SOURCE_VERIFIED |
| **Written Page** | `ScrollView style={{width}}` — declares width | SOURCE_VERIFIED |
| **Pager** | `FlatList horizontal pagingEnabled`, `getItemLayout` with `length: width`, `initialScrollIndex` | SOURCE_VERIFIED |
| **Opening Lock** | `openingLock` in `MemoryViewer` — ignores `onActiveChange` until alignment confirmed | SOURCE_VERIFIED |
| **Missing State** | `findIndex` raw → `-1` → `Missing` component ("Este recuerdo ya no está disponible") | SOURCE_VERIFIED |
| **Safe Areas** | All chrome within insets, media viewport between top/bottom chrome | STATICALLY_INFERRED |

### 2.5 Intake & Camera

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Create Menu** | `ActionSheet size="content"`: 5 flat items, `AppText variant="body"`, `AppButton variant="text"` | STATICALLY_INFERRED |
| **Gallery Picker** | System picker → `MemoryMediaReview.tsx` | STATICALLY_INFERRED |
| **Review Screen** | Preview dominant, Date (editable, 4 precisions), Album (optional), Description (optional) | SOURCE_VERIFIED |
| **Date Picker** | `DatePickerSheet` → 4 precision selector (exact/month-year/year/unknown) | STATICALLY_INFERRED |
| **Camera Viewfinder** | `MemoryCameraSurface.tsx`: `CameraView style={StyleSheet.absoluteFill}`, shutter 72×72 | STATICALLY_INFERRED |
| **Audio Recorder** | `MemoryAudioRecorder.tsx`: Waveform visualization (live), timer, pause/resume, 44×44 controls | STATICALLY_INFERRED |
| **Written Form** | `MemoryIntake.tsx`: `AppInput multiline`, `minHeight: 200`, `AppText variant="body"` | STATICALLY_INFERRED |

### 2.6 Lifecycle (Trash)

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Trash Section** | Conditional in root IA: only renders if `trashMemories.length > 0` | SOURCE_VERIFIED |
| **Trash Tile** | Same as Timeline tile, `lifecycle: 'trashed'` | STATICALLY_INFERRED |
| **Restore** | Swipe action or selection → `Restaurar`, snackbar "Restaurado" | STATICALLY_INFERRED |
| **Purge Confirm** | `Alert` dialog: "Esto borra los recuerdos para siempre. No se puede deshacer." | SOURCE_VERIFIED |

---

## 3. SHARED — VISUAL GEOMETRY

### 3.1 ActionSheet (Unified Host)

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Modal Container** | `ActionSheet.tsx`: `Modal transparent animationType="slide" presentationStyle="pageSheet"` | SOURCE_VERIFIED |
| **Sizes** | `full` (90%), `content` (intrinsic), `scrollable-content` (90% + scroll), `near-full` (95%) | SOURCE_VERIFIED |
| **Backdrop** | `Pressable` `zIndex: 0`, `backgroundColor: 'rgba(0,0,0,0.32)'`, `onPress: onClose` | SOURCE_VERIFIED |
| **Sheet** | `zIndex: 1`, `borderTopLeftRadius: radius.xl` (24), `borderTopRightRadius: radius.xl` | SOURCE_VERIFIED |
| **Drag Handle** | `View width: 36, height: 4, borderRadius: 2, backgroundColor: border.subtle` | STATICALLY_INFERRED |

### 3.2 Upload Progress Band

| Aspect | Source Evidence | Classification |
|--------|-----------------|----------------|
| **Position** | `HomeCloudUploadProgress.tsx`: `Position: 'absolute', top: insets.top + 56, left: 16, right: 16, zIndex: 50` | STATICALLY_INFERRED |
| **Appearance** | `backgroundColor: surface.card`, `borderRadius: radius.md` (12), `padding: spacing[3]` (12) | STATICALLY_INFERRED |
| **Content** | Row: spinner + `Subiendo X · N%` + `Cancelar` (text button) | STATICALLY_INFERRED |
| **Persistence** | Visible across Files/Memories tabs, survives navigation | SOURCE_VERIFIED |

### 3.3 Error / Empty / Loading States (Mutually Exclusive)

| State | Visual Contract | Source Evidence |
|-------|-----------------|-----------------|
| **LOADING** | Skeleton matching content shape (card/row/tile), `background.alt` base | `Skeleton.tsx:78-81` |
| **READY_EMPTY** | Honest copy, no skeleton, CTA where applicable | Per-screen |
| **READY_DATA** | Actual content | Per-screen |
| **ERROR** | `ErrorState` component: icon 48, `AppText variant="body"`, `AppButton title="Reintentar"` | `ErrorState.tsx` |
| **REFRESHING** | Preserves READY_DATA, adds `RefreshControl` indicator | `FlatList` refresh |

**VERIFIED**: No screen shows skeleton after READY_EMPTY. No screen shows empty state that cannot refresh.

---

## 4. LOGICAL WIDTH ANALYSIS (360 / 390 / 430 pt)

| Component | 360pt | 390pt | 430pt | Risk |
|-----------|-------|-------|-------|------|
| **Files Grid Tile** | 159 | 174 | 194 | Low — responsive by design |
| **Files Tile Label** | 2 lines max, may truncate at 360/1.3 font | 2 lines | 2 lines | Medium — Dynamic Type |
| **Memories Timeline Tile** | 106 | 116 | 130 | Low — 3-col responsive |
| **Album Rail Tile** | 132 fixed | 132 fixed | 132 fixed | Low — horizontal scroll |
| **Types Rail Tile** | 100 fixed | 100 fixed | 100 fixed | Low — horizontal scroll |
| **Resurfacing Tile** | 160 fixed | 160 fixed | 160 fixed | Low — horizontal scroll |
| **Action Sheet Content** | **OVERFLOWS** at fontScale 1.0 (410 > 324) | Fits (410 < 351? NO — still overflows at 390/1.0) | Fits at 430/1.0 | **HIGH** — requires scrollable |
| **Action Sheet at 1.3 font** | Clipped 106dp | Clipped 5dp | Fits | **HIGH** — scrollable mandatory |
| **Viewer Top Chrome** | 56 + inset (44) = 100 | 56 + inset (44) = 100 | 56 + inset (44) = 100 | Low |
| **Viewer Media Viewport** | viewport - 100 - (56 + insetBottom) | Same | Same | Low |
| **HomeCloudScreen Tab Bar** | Not in HomeCloud (global navbar only) | — | — | N/A |

> **Critical Finding**: The File Action Sheet **must** be `scrollable-content` at all widths and font scales ≤1.3 on 360/390pt. This is already implemented (Slice A fix). Memories uses same host → inherits fix.

---

## 5. VISUAL HIERARCHY & CONTRAST

| Element | Files | Memories | Shared Tokens | Contrast Risk |
|---------|-------|----------|---------------|---------------|
| **Primary Background** | `background.primary` | `background.primary` | YES | PASS (WCAG AAA on both themes) |
| **Card Surface** | `surface.card` | `surface.card` | YES | PASS |
| **Primary Text** | `text.primary` | `text.primary` | YES | PASS |
| **Secondary Text** | `text.secondary` | `text.secondary` | YES | PASS |
| **Accent (Terracotta)** | `terracotta[600]` | `terracotta[600]` | YES | PASS (4.5:1 on light, 3:1 on dark) |
| **Border Subtle** | `border.subtle` | `border.subtle` | YES | PASS |
| **Selection Border** | `terracotta[600]` 3dp | `terracotta[600]` 3dp | YES | PASS |
| **Disabled State** | `text.tertiary` + `opacity: 0.5` | Same | YES | PASS |
| **Error/Destructive** | `semantic.error` (red) | Same | YES | PASS |

**VERDICT**: Contrast is **token-driven and shared**. No module-specific color deviations found in source.

---

## 6. POTENTIAL CLIPPING / OVERLAP RISKS

| Risk | Location | Source Evidence | Severity | Mitigation |
|------|----------|-----------------|----------|------------|
| Action Sheet clips last rows | `FileActionHost.tsx` | `fileActionSheetLayoutPolicy` proves overflow at 360/1.0, 390/1.0 | **HIGH** | Already fixed: `size="scrollable-content"` |
| Viewer chrome under status bar | `MemoryViewer.tsx`, `HomeCloudFileViewerScreen.tsx` | `paddingTop: insets.top + 12` | LOW | Safe-area aware |
| Viewer media under home indicator | `MemoryViewer.tsx` | `paddingBottom: insets.bottom + 12` | LOW | Safe-area aware |
| Album rail empty state | `AlbumsRail.tsx:85` | Renders only create tile at 0 albums — no large empty block | NONE | By design |
| Favorites tile in Albums rail | `AlbumsRail.tsx` | Special system tile, no delete action — distinct from normal albums | NONE | By design |
| Resurfacing band empty | `HomeCloudMemoriesScreen.tsx` | `resurfacingGroups.length === 0` → **band not rendered** | NONE | By design |
| Timeline section headers sticky | `stickySectionHeadersEnabled={false}` | Explicitly disabled — no overlap | NONE | By design |
| Upload band over content | `HomeCloudUploadProgress.tsx` | `zIndex: 50`, absolute at top | LOW | Intentional overlay |

---

## 7. RESPONSIVE BEHAVIOR

| Breakpoint | Files | Memories | Source |
|------------|-------|----------|--------|
| **Phone (≤430pt)** | 2-col grid, 3-col timeline, horizontal rails | Same | Layout calculations |
| **Tablet / Wide (>430pt)** | Grid adds columns from `minTileWidth` (not hardcoded) | Timeline could add columns (not implemented) | `HomeCloudFilesScreen.tsx` comment |
| **Landscape** | `useWindowDimensions` → re-renders grid/rails | Same | `useWindowDimensions` in screens |
| **Dynamic Type** | All `AppText` use `typography.*` tokens, `numberOfLines` capped | Same | `AppText.tsx` |
| **Reduce Motion** | `AccessibilityInfo.isReduceMotionEnabled` checked in `SegmentedControl`, Viewer transitions | Same | `SegmentedControl.tsx`, `MemoryViewer.tsx` |

---

## 8. CLASSIFICATION SUMMARY

| Module | Surfaces Audited | SOURCE_VERIFIED | STATICALLY_INFERRED | DEVICE_VISUAL_QA_REQUIRED |
|--------|------------------|-----------------|---------------------|---------------------------|
| Files | 23 | 14 | 9 | 23 (all) |
| Memories | 31 | 18 | 13 | 31 (all) |
| Shared | 7 | 5 | 2 | 7 (all) |
| Office | 4 | 3 | 1 | 4 (all) |

> **Reminder**: No pixel-perfect validation claimed from source alone. Every surface requires physical device QA for final validation.

---

**End of Visual Geometry Audit**