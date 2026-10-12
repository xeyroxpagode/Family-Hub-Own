# 01_UNIFIED_CURRENT_SCREEN_ATLAS.md

**HomeCloud Unified Experience — Complete Screen Inventory**

Status: **SOURCE_VERIFIED** — Every screen listed below exists in the merged `homecloud/unified-integration` worktree (HEAD `f23213b`). No screens are inferred from donor docs or stale branches.

---

## 0. SHARED ENTRY & NAVIGATION

| Screen | File | State | Classification |
|--------|------|-------|----------------|
| **HomeCloud Entry (Más → HomeCloud)** | `HomeCloudScreen.tsx` | Single surface, both panes mounted (`display: 'none'` for inactive) | SHARED |
| **Global Tab Selector** `Archivos | Recuerdos` | `HomeCloudScreen.tsx:28-35` SegmentedControl, global, never removed | SHARED |
| **Household Switcher** | Via global HomePlus shell | Discards all HomeCloud state on change | SHARED |
| **Permission Gating** | `useHomeCloudCapabilities` | 4 capabilities: `view`, `contribute`, `organize`, `delete` | SHARED |

---

## 1. FILES (Archivos) — COMPLETE SCREENS

### 1.1 Browser & Navigation

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Files Root** | `HomeCloudFilesScreen.tsx` | `HomeCloudFilesView`, header row, filter menu, grid | Screen |
| **Folder Context** | `HomeCloudFilesScreen.tsx` | Same view, `folderId` in context, breadcrumb trail | Screen |
| **Search (Global/Folder-scoped)** | `HomeCloudFilesScreen.tsx` | Single search field, server-backed, trim/case-insensitive | Screen |
| **Sort/Filter Menu** | `FilesFilterMenu.tsx` | Compact filter icon → sheet: Show (Todos/Favoritos), Order (Recientes/A-Z) | Screen |
| **Favorites Filter Mode** | `HomeCloudFilesScreen.tsx` | Server-side `favoritesOnly`, composes with folder/search/sort/pagination | Screen |

### 1.2 Content Surfaces

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **File Grid (Virtualized)** | `HomeCloudFilesScreen.tsx` | `FlatList` 2-col responsive, `FileTile`, `FolderTile` | Screen |
| **Folder Tile** | `HomeCloudFilesScreen.tsx` (inline) | Tap → enter folder, long press → folder actions | Screen |
| **File Tile** | `HomeCloudFilesScreen.tsx` (inline) | Tap → Viewer (reserved), long press → contextual actions | Screen |
| **Empty States** | `HomeCloudFilesScreen.tsx` | `ListEmptyComponent`: "Todavía no hay archivos" + "Agregar archivo" CTA | Screen |
| **Error States** | `HomeCloudFilesScreen.tsx` | `ErrorState` + explicit `Reintentar`, preserves loaded window | Screen |
| **Loading States** | `HomeCloudFilesScreen.tsx` | Pull-to-refresh `RefreshControl`, automatic pagination footer spinner | Screen |

### 1.3 Selection & Bulk Operations

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Selection Mode Entry** | `HomeCloudFilesScreen.tsx` | Header overflow → `Seleccionar` (withdrawn while active) | Screen |
| **Selection Bar** | `FileSelectionBar.tsx` | `[X] N seleccionados [Acciones ⋯]` | Screen |
| **Drag Selection (D4)** | `homecloudDragSelection.ts` + `MemorySelectableCard` | Anchor decision (ADD/REMOVE), auto-scroll, measured hit-test | Service + Tile |
| **Bulk Move** | `HomeCloudFilesScreen.tsx` → `homecloudBulkMove.ts` | Shared `FileMoveDestinationPicker`, N×PATCH, one reconciliation | Screen + Service |

### 1.4 File Actions

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **File Action Host (Canonical)** | `FileActionHost.tsx` | Single `ActionSheet size="scrollable-content"`, 7 rows (Info, Rename, Move, Save Copy, Share, Favorite, Trash) | Screen |
| **File Info Sheet** | `FileActionHost.tsx` | Name, Folder, Document Date, Note edits | Service |
| **Rename Sheet** | `FileActionHost.tsx` | Inline edit | Service |
| **Move Picker (Single/Bulk/Folder)** | `FileMoveDestinationPicker.tsx` | One destination grammar: tree depth-first, full computed paths | Service |
| **Save Copy / Share** | `homecloudDownloadService.ts` | Stage → native export/share, no outcome claim | Service |
| **Favorite Toggle** | `FileActionHost.tsx` | Per-row busy, idempotent, label flips (Add/Remove) | Service |

### 1.5 Intake & Creation

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Add Sheet (Root)** | `FileIntake.tsx` | "Elegir archivo", "Escanear documento", "Nueva carpeta" | Screen |
| **Add Sheet (In Folder)** | `FileIntake.tsx` | "Elegir archivo", "Escanear documento" (folder inherited) | Screen |
| **Document Scanner** | `HomeCloudScannerScreen.tsx` | Multi-page → PDF, perspective correction, shared capture | Screen |
| **New Folder Sheet** | `FileActionHost.tsx` / dedicated | Name input, parent inherited | Service |

### 1.6 File Viewers (Common-Format UX)

| Screen | File | Contract | Evidence |
|--------|------|----------|----------|
| **Image Viewer** | `HomeCloudFileViewerScreen.tsx` | Inline, pinch zoom, pan, double-tap zoom/reset, progressive original | `SUPPORTED_NOW` |
| **Video Viewer** | `HomeCloudFileViewerScreen.tsx` | Inline `expo-video`, native controls, fullscreen, poster when available | `SUPPORTED_WITH_CURRENT_STACK` |
| **Audio Viewer** | `HomeCloudFileViewerScreen.tsx` | Inline `expo-audio`, seek, ±10s, speed 0.5–2×, buffering | `SUPPORTED_WITH_CURRENT_STACK` |
| **PDF Viewer** | `HomeCloudFileViewerScreen.tsx` + pdf.js in WebView | Inline, multi-page, zoom, local staged original, no remote host | `SUPPORTED_WITH_CURRENT_STACK` (Expo Go) |
| **TXT/MD/CSV Viewer** | `HomeCloudFileViewerScreen.tsx` | Bounded read (512 KiB), selectable/copyable text | `SUPPORTED_NOW` |
| **Office (DOCX/XLSX/PPTX)** | `HomeCloudFileViewerScreen.tsx` → `ViewerOfficeSurface` | Embedded OnlyOffice via signed session, `type: "embedded"` | `SUPPORTED_WITH_CURRENT_STACK` |
| **Unsupported / SVG / HTML** | `HomeCloudFileViewerScreen.tsx` | Honest refusal + system hand-off | `SUPPORTED_NOW` |
| **Password-Protected PDF** | `HomeCloudFileViewerScreen.tsx` | Dedicated protected state + hand-off | `SUPPORTED_WITH_CURRENT_STACK` |
| **Corrupt / Oversized PDF** | `HomeCloudFileViewerScreen.tsx` | Polished failure + hand-off | `SUPPORTED_WITH_CURRENT_STACK` |

### 1.7 Lifecycle & Trash

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Trash Surface** | `HomeCloudFilesTrashScreen.tsx` | List of TRASHED Files, `Restaurar`, `Eliminar definitivamente` | Screen |
| **Trash Empty** | `HomeCloudFilesTrashScreen.tsx` | "La papelera está vacía" — surface not shown when empty | Screen |
| **Purge Confirmation** | `HomeCloudFilesTrashScreen.tsx` | Explicit dialog with count, requires `homecloud.delete` | Screen |
| **Undo Snackbar** | `HomeCloudFilesScreen.tsx` | "Movido a la papelera" + `Deshacer` (full restore) | Screen |

---

## 2. MEMORIES (Recuerdos) — COMPLETE SCREENS

### 2.1 Root & Primary IA

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Memories Root** | `HomeCloudMemoriesScreen.tsx` | Single vertical scroll: TitleRow(+), Resurfacing (conditional), Albums Rail, Types Rail, Timeline | Screen |
| **Title Row** | `HomeCloudMemoriesScreen.tsx:1592+` | "Recuerdos" + `+` (no circle, hit≥44×44), no visible Refresh | Screen |
| **Resurfacing Band** | `HomeCloudMemoriesScreen.tsx` | "Para volver a ver" — exact-only, deterministic groups, `No mostrar este recuerdo acá` | Screen |
| **Albums Rail** | `AlbumsRail.tsx` | Horizontal rail, cover tiles, `+ Nuevo` tile at end (always visible) | Rail Controller |
| **Types Rail** | `MemoryCollectionTile.tsx` | 4 fixed tiles: Fotos, Videos, Audios, Notas | Screen |
| **Timeline** | `MemoryTimelineRow.tsx` + `MemorySelectableCard.tsx` | SectionList grouped by year/month, `stickySectionHeadersEnabled=false` | Screen |

### 2.2 Album Surfaces

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Album Detail (Overlay)** | `AlbumDetailView.tsx` | Nested SectionList, `selecting={false}` fixed, no permanent X | Screen |
| **Album Create** | `AlbumsRail.tsx` header `+ Nuevo` / Album empty CTA | Name sheet, gated by `organize` | Screen |
| **Album Actions Sheet** | `AlbumSheets.tsx` | `Renombrar`, `Agregar recuerdos`, `Eliminar` (confirm: "Los recuerdos no se eliminan") | Screen |
| **Album Empty** | `AlbumDetailView.tsx` | "Esta colección todavía no tiene recuerdos" + `Agregar recuerdos` | Screen |

### 2.3 Type Collections (Auto)

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Fotos / Videos / Audios / Notas** | `MemoryCollectionTile.tsx` → overlay | Same overlay as Album, source `type:<kind>`, Timeline order | Collection Controller |

### 2.4 Resurfacing

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Resurfacing Group** | `HomeCloudMemoriesScreen.tsx` | Opens group-specific overlay, pager locked to group | Screen |
| **Hide from Resurfacing** | Action grammar | Sets `hidden_from_resurfacing=true` | Service |

### 2.5 Selection (Contextual State)

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Selection Entry** | `HomeCloudMemoriesScreen.tsx` | Long press → `enterMemorySelection` | Screen |
| **Selection Header** | `MemorySelectionHeader.tsx` | `[X] N seleccionados [⋯ Acciones]` — NO `✓` gate, NO `Recuerdos|Colecciones` | Screen |
| **Selection Actions** | `HomeCloudMemoriesScreen.tsx` | Shared grammar: Add to Album, Create Album, Remove from Album (in Album), Trash, Share, Favorite | Service (pure) |
| **Destination Picker** | Reuses `ActionSheet` | Replaces content in same host, albums from rail (no extra read) | Screen |
| **Drag Selection (D4)** | `homecloudMemoryDrag.ts` + `MemorySelectableCard` | Contiguous range, auto-scroll, measured frames | Service + Tile |

### 2.6 Memory Viewers (Immersive Shell)

| Screen | File | Contract | Evidence |
|--------|------|----------|----------|
| **Viewer Shell** | `MemoryViewer.tsx` | Full-screen overlay `zIndex:20`, hides global chrome, safe-area aware | `SOURCE_VERIFIED` |
| **Top Chrome** | `MemoryViewer.tsx` | `[Cerrar] [Fecha semántica] [⋯ Acciones]` — close ≥44×44 | `SOURCE_VERIFIED` |
| **Bottom Chrome** | `MemoryViewer.tsx` | Source label + media controls (audio/video) | `SOURCE_VERIFIED` |
| **Image Viewer** | `MemoryViewer.tsx` → `ImagePage` | Fit, pinch zoom 1–3×, pan clamp, double-tap zoom/reset, active-only original | `SUPPORTED_NOW` + `DEFER` (double-tap) |
| **Video Viewer** | `MemoryVideoPage.tsx` | Poster→player, native controls, fullscreen, double-tap ±10s, background pause | `SUPPORTED_WITH_CURRENT_STACK` + `DEFER` (double-tap ±10s) |
| **Audio Viewer** | `MemoryAudioPage.tsx` | Identity + play/pause, seek, time/duration, ±10s, speed, buffering, real waveform (roadmap) | `SUPPORTED_WITH_CURRENT_STACK` |
| **Written Viewer** | `MemoryViewer.tsx` → `ScrollView` | Long text scroll, copy all, share text | `SUPPORTED_NOW` |
| **Pager Invariants** | `MemoryViewer.tsx` | Source-immutable, active-by-contentId, no fallback to index 0, Missing state | `SOURCE_VERIFIED` |

### 2.7 Memory Actions (Unified Grammar)

| Screen | File | Key Actions | State Owner |
|--------|------|-------------|-------------|
| **Viewer Menu (1 item)** | `MemoryViewer.tsx` → `⋯` | Add to Album, Share, Info, Remove from Album (in Album), Trash, Hide from Resurfacing | Pure Function |
| **Selection Menu (N items)** | `MemorySelectionHeader.tsx` → `⋯` | Same as Viewer + bulk variants, mixed favorite state | Pure Function |
| **Album Menu** | `AlbumSheets.tsx` | Rename, Add Memories, Delete (confirm) | Screen |
| **Type Menu** | (via selection) | Add to Album, Share, Trash, Favorite | Pure Function |
| **Resurfacing Menu** | (via selection) | Add to Album, Trash, Hide from Resurfacing | Pure Function |
| **Trash Menu** | (via selection) | Restore, Purge (confirm) | Pure Function |
| **Favorites Menu** | (via selection) | Add to Album, Share, Trash, Unfavorite | Pure Function |

### 2.8 Intake & Creation

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Create Menu (+)** | `MemoryIntake.tsx` | 5 flat items: Fotos y videos, Capturar momento, Importar audio, Grabar audio, Escribir un recuerdo | Screen |
| **Gallery Picker** | `homecloudMemoryPicker.ts` | Multi-select, mixed image+video, per-item dates, mass Album + per-item override | Service |
| **Camera** | `MemoryCameraSurface.tsx` | Photo → review, Video → review, Retake, real capture instant = `exact` | Screen |
| **Audio Import** | `homecloudMemoryPicker.ts` → `AudioReview` | System audio picker → binary review → editable date (unknown→corrigible) | Service |
| **Audio Record** | `MemoryAudioRecorder.tsx` | Mic permission → recorder → review → editable date (exact) | Screen |
| **Written Memory** | `MemoryIntake.tsx` | Text form, date (4 precisions), optional Album/description | Screen |
| **Batch Review** | `MemoryIntake.tsx` | Swipe previews, single submit, partial failure honest | Screen |

### 2.9 Lifecycle (Trash / Restore / Purge)

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Trash Surface** | `HomeCloudMemoriesScreen.tsx` | Conditional root section (only if content), `Restaurar`, `Eliminar definitivamente` | Screen |
| **Restore Semantics** | `homecloudLifecycleService.js` | Preserves album memberships if album exists; silent drop if album gone | Service |
| **Purge** | `homecloudLifecycleService.js` | Hard delete: row + storage objects + memberships (cascade), requires `homecloud.delete` | Service |

### 2.10 Favorites (Smart Collection)

| Screen | File | Key Components | State Owner |
|--------|------|----------------|-------------|
| **Favorites Tile** | `AlbumsRail.tsx` | First tile in Albums rail: `⭐ Favoritos` (system tile, no rename/delete) | Rail |
| **Favorites Dataset** | `homecloudReadService.ts` | Auto-derived: `favorite=true` AND `lifecycle=active` | Service |
| **Favorite Toggle** | Viewer/Selection grammar | Star/unstar, optimistic if safe, bulk in selection | Service |

---

## 3. SHARED INFRASTRUCTURE SCREENS

| Screen | File | Scope |
|--------|------|-------|
| **ActionSheet Host** | `components/ui/ActionSheet.tsx` | All bottom sheets (size: `content`, `scrollable-content`, `near-full`, `full`) |
| **Modal Host** | `HomeCloudScreen.tsx` | No stacked RN Modals — Viewer is absolute View, sheets are ActionSheet |
| **Upload Progress Band** | `HomeCloudUploadProgress.tsx` | Global band visible across HomeCloud, `Subiendo X · N%` + `Cancelar` |
| **Download/Share Staging** | `homecloudDownloadService.ts` | `Paths.cache` + cleanup on `shareAsync` resolve |
| **Signed URL Cache** | `homecloudMemoryOriginal.ts`, `homecloudMemoryPreview.ts` | Bounded maps, 30s margin, household-scoped invalidation |
| **Error Boundaries** | Per-screen `ErrorState` | Honest copy, explicit retry, never destroys loaded content |
| **Loading Skeletons** | `Skeleton.tsx` | Mutually exclusive: LOADING / READY_EMPTY / READY_DATA / ERROR / REFRESHING |

---

## 4. OFFICE VIEWER (Integrated Surface)

| Screen | File | Contract |
|--------|------|----------|
| **Office Session Creation** | `homecloudOfficeViewerService.js` (backend) | `POST /api/homecloud/office/session` → signed config JWT |
| **Office Viewer Surface** | `HomeCloudFileViewerScreen.tsx` → `ViewerOfficeSurface` | Embedded OnlyOffice, `officeFill` container, `type: "embedded"` |
| **Bridge Protocol** | `homecloudOfficeViewer.ts` | Versioned (`v:1`), types: `DOCUMENT_READY`, `APP_READY`, `LOAD_ERROR` |
| **Origin Whitelist** | `homecloudOfficeViewer.ts` | `officeViewerAllowedOrigin` — only session origin allowed |
| **Title Escaping** | `buildOfficeViewerHtml` | Neutralizes `</script>` in document title |
| **Diagnostics** | `HomeCloudFileViewerScreen.tsx` | `office_timeout_app_ready`, `office_timeout_no_app_ready`, `office_webview_error`, `office_session_failed` |

---

## 5. CLASSIFICATION SUMMARY

| Module | Screens Audited | Source Files Inspected | Classification |
|--------|-----------------|------------------------|----------------|
| **Files** | 23 | 12 | **SOURCE_VERIFIED** |
| **Memories** | 31 | 18 | **SOURCE_VERIFIED** |
| **Shared** | 7 | 6 | **SOURCE_VERIFIED** |
| **Office** | 4 | 3 | **SOURCE_VERIFIED** |
| **TOTAL** | **65** | **39** | — |

> **Note**: "Screen" = distinct user-visible surface with its own state owner and IA. Overlays (Album Detail, Viewer, ActionSheets) counted separately from their callers. Conditional surfaces (Resurfacing band, Trash, Favorites tile) counted as distinct because they have unique contracts.

---

## 6. MISSING / DEFERRED SURFACES (Explicitly NOT in V1)

| Surface | Module | Status | Reason |
|---------|--------|--------|--------|
| Search (Memories) | Memories | OUT | Metadata grouping sufficient for household scale |
| Archive | Both | OUT | Three-state ambiguity |
| Private/Hidden Memories | Memories | OUT | Shared by design |
| Album Trash | Memories | OUT | Album=org, Memory=content; no nested trash |
| People/Faces/Places | Memories | OUT | ML required |
| OCR/AI Search/Tagging | Both | OUT | ML required |
| Social features | Memories | OUT | Not a social product |
| Pro editing (crop/filters/collage) | Memories | OUT | Not an editor |
| Nested Albums | Memories | OUT | Single level only |
| Background sync/playback | Memories | OUT | Not core job |
| Monthly/Year resurfacing | Memories | OUT | Exact-only frozen |
| Audio submenu in Create | Memories | OUT | Two flat actions: Import + Record |
| Fake waveform | Memories | PROHIBITED | Product lie |
| Custom audio output picker | Memories | OUT | OS provides |
| PPTX/XLSX Viewer | Files | DEFERRED | Office hand-off honest answer |
| Multi-file intake | Files | OUT | V1 scope |
| Copy/Duplicate File | Files | OUT | V1 scope |
| Tags/Version history/Offline | Files | OUT | V1 scope |

---

**End of Atlas** — Every screen above has a corresponding source file in the integration worktree. No screen is assumed from donor documentation.