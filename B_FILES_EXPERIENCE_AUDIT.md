# B. FILES EXPERIENCE AUDIT

## 1. SURFACE-BY-SURFACE ASSESSMENT

### 1.1 HomeCloudFilesScreen (Root / Folder Browser)
**File:** `screens/HomeCloudFilesScreen.tsx` (1424 lines)

| Surface | Status | Evidence |
|---|---|---|
| **Search field** | ✅ Implemented | `AppInput variant="search"`, debounced 250ms, server-side |
| **Breadcrumb / path** | ✅ Implemented | `folderDisplayPath` from catalogue, conditional render |
| **Title row** | ✅ Implemented | Folder name / "Archivos", back button (one level up) |
| **Filter/Order icon** | ✅ Implemented | Single compact icon → `FilesFilterMenu` (show: all/favorites, sort: recent/name) |
| **Add button (+)** | ✅ Implemented | Capability-gated (`canAdd`), opens `ActionSheet` with Elegir archivo / Escanear / Nueva carpeta |
| **Overflow (…)** | ✅ Implemented | `Seleccionar` (only when not in selection), `Papelera` (capability-gated `delete`) |
| **Grid (2-col)** | ✅ Implemented | `FlatList numColumns=2`, virtualized, `extraData={selection}` |
| **Folder tiles** | ✅ Implemented | `FolderTile` — tap→enter, long press→actions, accessibility actions |
| **File tiles** | ✅ Implemented | `FileTile` — tap→Viewer (outside selection), long press→actions, drag selection armed |
| **Empty states** | ✅ Implemented | `ListEmptyComponent` inside FlatList (refresh works), context-aware copy |
| **Pull-to-refresh** | ✅ Implemented | `RefreshControl` on FlatList, window-preserving `refresh()` |
| **Auto-pagination** | ✅ Implemented | `onEndReachedThreshold=2`, controller `loadingMore` latch, compact `Reintentar` on failure |
| **Selection bar** | ✅ Implemented | `FileSelectionBar` (count, summary, Move, Cancel) — only in selection mode |
| **Viewer layer** | ✅ Implemented | Absolute `viewerLayer` over browser, `HomeCloudFileViewer` component |
| **Folder create/rename/move/delete** | ✅ Implemented | `ActionSheet` + `FileMoveDestinationPicker` (shared) |
| **File actions** | ✅ Implemented | `FileActionHost` (Info, Rename, Move, Guardar una copia, Compartir, Favorito, Papelera) |
| **Bulk move** | ✅ Implemented | `moveSelectedFiles` → N single-file PATCHes, one refresh, selection pruned |
| **Capabilities notice** | ✅ Implemented | Banner with `Reintentar` when projection unresolved |

### 1.2 HomeCloudFileViewerScreen (Viewer Layer)
**File:** `screens/HomeCloudFileViewerScreen.tsx` (708 lines)

| Surface | Status | Evidence |
|---|---|---|
| **Header** | ✅ Implemented | File name, close button, safe-area insets |
| **Image** | ✅ Implemented | `Image` from signed URL, `resizeMode="contain"` |
| **Video** | ✅ Implemented | `ViewerVideoSurface` → `expo-video` + `VideoView`, decode failure → inline hand-off |
| **Audio** | ✅ Implemented | `ViewerAudioSurface` → `expo-audio`, play/pause, error → inline message |
| **PDF** | ✅ Implemented | `ViewerPdfSurface` → WebView + pdf.js (see Viewer Closure Spec) |
| **Text/CSV/MD** | ✅ Implemented | Bounded prefix (512 KiB), native `selectable` on `AppText` |
| **Office / unsupported** | ✅ Implemented | Honest reason + "Abrir o compartir con…" (staged → share) |
| **Error states** | ✅ Implemented | `failure` (access), `renderFailure` (decode), both with hand-off when staged |
| **Android back** | ✅ Implemented | `BackHandler` registered only while viewer open |
| **Media lifecycle** | ✅ Implemented | Players torn down on unmount / target change |
| **Link handling** | ✅ Implemented | `LINK_PRESSED` → `Linking.openURL` (http/https only) |

### 1.3 HomeCloudFilesTrashScreen (Papelera)
**File:** `screens/HomeCloudFilesTrashScreen.tsx` (395 lines)

| Surface | Status | Evidence |
|---|---|---|
| **Header** | ✅ Implemented | Back (chevron), title "Papelera", subtitle |
| **Capability gate** | ✅ Implemented | `canManageTrash` (delete capability) → empty state with reason |
| **List** | ✅ Implemented | `FlatList` with `InteractivePressable` rows |
| **Row** | ✅ Implemented | Icon, name, "En papelera desde <date>", chevron |
| **Pull-to-refresh** | ✅ Implemented | `RefreshControl` + nonce bump |
| **Pagination** | ✅ Implemented | `onEndReached` + `loadMore` + compact `Reintentar` |
| **Detail sheet** | ✅ Implemented | `ActionSheet` with two views: Detail (Restaurar, Eliminar definitivamente) → Confirm (danger) |
| **Restore** | ✅ Implemented | Idempotent, re-read removes row, no confirmation dialog |
| **Purge** | ✅ Implemented | Two-view sheet, explicit "para siempre" copy, `confirm: true` body |

### 1.4 HomeCloudScannerScreen (Document Scanner)
**File:** `screens/HomeCloudScannerScreen.tsx` (660 lines)

| Surface | Status | Evidence |
|---|---|---|
| **Camera phase** | ✅ Implemented | `expo-camera`, torch, shutter, page count, review button |
| **Review phase** | ✅ Implemented | Horizontal thumb list, preview, actions (add/retake/edit/reset/delete) |
| **Page editor** | ✅ Implemented | `ScannerImageEditorScreen` (perspective crop, rotate, zoom/pan) |
| **Save flow** | ✅ Implemented | Name input, PDF generation (`expo-print`), submit via shared intake |
| **Acceptance boundary** | ✅ Implemented | Detaches on durable job acceptance, cleans local temp only |
| **Discard confirmation** | ✅ Implemented | `ActionSheet` — "Seguir escaneando" / "Descartar" |

### 1.5 ScannerImageEditorScreen
**File:** `screens/ScannerImageEditorScreen.tsx` (813 lines)

| Surface | Status | Evidence |
|---|---|---|
| **Canvas** | ✅ Implemented | SVG overlay, quad handles (4-corner perspective), dimming |
| **Gestures** | ✅ Implemented | Single `PanResponder` → machine-driven (pinch/pan/handle drag) |
| **Rotation** | ✅ Implemented | 90° steps, resets zoom/pan |
| **Preview/Confirm** | ✅ Implemented | WebView perspective job (offscreen), preview → confirm adopts |
| **Reset** | ✅ Implemented | Restores original crop/rotation, deletes preview temp file |
| **Navigation contract** | ✅ Implemented | Serializable params + `pop: true` + `merge: true` → returns to review |

---

## 2. CONFIRMED UX DEFECTS (P0–P3)

### P0 — Prevents Core Task

| ID | Defect | Location | Evidence |
|---|---|---|---|
| **P0-1** | PDF Viewer unproven on physical device | `HomeCloudFileViewerScreen.tsx` → `ViewerPdfSurface` | All V6–V10 in `HOMECLOUD_FILES_STAGE2_DEVICE_QA.md` = `UNPROVEN_DEVICE` |
| **P0-2** | Selection toolbar may be hidden behind global bottom navigation | `FileSelectionBar` + global BottomNav | `floatingNavigationMetrics.mainRegularHeight` reserved in Scanner; Files uses same metric? Need verification |
| **P0-3** | File tap reserved for Viewer but Viewer not validated | `handleFileTap` → `setViewerTargetId` | Product truth says tap = Viewer; if Viewer fails, tap does nothing useful |

### P1 — Meaningful Interaction/Consistency Defect

| ID | Defect | Location | Evidence |
|---|---|---|---|
| **P1-1** | Filter/Order collapse → discoverability reduced | `FilesFilterMenu` (single icon) | Two axes (show + sort) behind one icon; no persistent affordance |
| **P1-2** | No visible refresh control (pull-to-refresh only) | `HomeCloudFilesScreen` | R1–R7: accessibility-only `refresh-files` action; motor-impaired users may not discover pull |
| **P1-3** | Folder selection semantics missing | Selection model | Folders ignored by drag sweep (by intent), not selectable in bulk — correct per spec but undocumented in UI |
| **P1-4** | Selection reset on folder/query/sort change | `selectionScope` effect | Spec-compliant but can surprise: "I selected 20 files, changed folder, selection gone" |
| **P1-5** | Favorite filter persists across folder nav but query clears | `filterState` + `contextKey` | Spec: mode = sort-like (persists), query = folder-scoped (clears). May confuse: "Why did my search clear but Favoritos stay?" |
| **P1-6** | Scanner editor viewport smaller after B2 | `ScannerImageEditorScreen` | Reported in brief; need to verify `canvasSize` vs `box` sizing on device |
| **P1-7** | Scanner page reordering not supported | `ScannerScreen` review phase | Thumb list shows capture order only; no drag-to-reorder |

### P2 — Visual/Motion Polish

| ID | Defect | Location | Evidence |
|---|---|---|---|
| **P2-1** | No enter/exit animation for Viewer layer | `viewerLayer` (absolute View) | Instant appear/disappear; no shared-element or fade |
| **P2-2** | No selection mode activation motion | `FileSelectionBar` mount | Bar appears instantly; no slide-up |
| **P2-3** | Favorite toggle lacks microinteraction | `FileTile` heart badge | Color flip only; no scale/pulse |
| **P2-4** | Upload progress motion not verified | `HomeCloudUploadActivity` | Component exists; device QA needed |
| **P2-5** | Move destination picker — no folder expand/collapse animation | `FileMoveDestinationPicker` | Flat depth-first list; depth indentation only |
| **P2-6** | Empty state transitions | `ListEmptyComponent` | Cross-fade? Currently instant swap |
| **P2-7** | Drag selection auto-scroll visual feedback | `autoScrollStep` | List scrolls but no edge glow/hint |

### P3 — Optional Future Enhancement

| ID | Enhancement | Rationale |
|---|---|---|
| **P3-1** | Drag-to-reorder scanner pages | Scanner review phase |
| **P3-2** | OCR text extraction for scanned PDFs | Post-V1 |
| **P3-3** | Tag/label system for Files | Beyond V1 scope |
| **P3-4** | Version history / conflict resolution | Beyond V1 scope |
| **P3-5** | Cross-household search (opt-in) | Product decision: no |

---

## 3. INTERACTION IMPROVEMENTS (PRIORITIZED)

| Priority | Improvement | Scope | Acceptance |
|---|---|---|---|
| **P0** | Validate PDF Viewer on device (V-A through V-H) | `ViewerPdfSurface` | All `PASS_DEVICE` |
| **P0** | Verify selection bar not obscured by BottomNav | `FileSelectionBar` + `floatingNavigationMetrics` | Bar fully visible, touchable |
| **P1** | Add "Actualizar" accessibility hint to filter icon | `FilesFilterMenu` trigger | Screen reader announces refresh action |
| **P1** | Document selection scope behavior in empty state | `ListEmptyComponent` | "La selección se reinicia al cambiar de carpeta" |
| **P1** | Scanner editor viewport sizing audit | `ScannerImageEditorScreen` | Canvas fills available space, handles reachable |
| **P1** | Add scanner page reorder (drag thumb) | `ScannerScreen` review | Thumb drag reorders `pages` array |
| **P2** | Viewer enter/exit fade (150ms) | `viewerLayer` mount/unmount | `Animated.timing` opacity, respects `reduceMotion` |
| **P2** | Selection bar slide-up (200ms) | `FileSelectionBar` | `Animated.timing` translateY, respects `reduceMotion` |
| **P2** | Favorite heart pulse (150ms) | `FileTile` → `Animated.spring` | Scale 1.0→1.2→1.0 on toggle |
| **P2** | Upload progress ring / bar motion | `HomeCloudUploadActivity` | Smooth progress, completion checkmark |
| **P2** | Move picker folder row expand indicator | `FileMoveDestinationPicker` | Chevron rotates on depth change |

---

## 4. POPOVERS / ACTION MENUS — INTERACTION PROPOSAL

### 4.1 Current State vs. Proposal

| Trigger | Current | Proposal | Rationale |
|---|---|---|---|
| **File row long press** | `FileActionHost` (ActionSheet, scrollable) | **Keep** — canonical, reachable, capability-gated | Single source of truth; no duplicate menus |
| **File row overflow (ellipsis)** | **Removed** (Stage 2) | **Do not restore** | Long press + accessibility actions cover it |
| **Folder row long press** | Folder actions sheet (rename/move/delete) | **Keep** | Consistent with file pattern |
| **Folder row overflow** | **Removed** | **Do not restore** | Same as file |
| **Viewer actions** | Header close + optional hand-off button | **Add**: "Información" (metadata), "Compartir" (if not in unsupported) | Viewer currently has no overflow; Info useful for doc date/note |
| **Search/Filter/Sort** | Filter icon → `FilesFilterMenu` (popover) | **Keep** | Compact, two groups, accessible |
| **Selection mode** | Header overflow → "Seleccionar" | **Keep** | Only discoverable entry; no FAB |
| **Upload item actions** | `HomeCloudUploadActivity` → retry/cancel | **Keep** | Per-job, capability-gated |
| **Trash row tap** | Detail sheet (2 views) | **Keep** | Restore = primary, Purge = confirmed danger |
| **Scanner review** | Bottom action bar (5 buttons) | **Keep** | Dense but all primary; consider fold on small screens |

### 4.2 Menu Specifications

| Menu | Trigger | Actions (Order) | Dismiss | Destructive Confirm | Accessibility |
|---|---|---|---|---|---|
| **FileActionHost** | Long press / a11y longpress | Información, Renombrar, Mover, Guardar una copia, Compartir, ★ Favorito, 🗑 Papelera | Tap outside / back / Cerrar | Papelera → no dialog (Papelera IS recovery) | All rows: `accessibilityLabel`, `accessibilityState.busy` |
| **Folder Actions** | Long press / a11y longpress | Renombrar, Mover, Eliminar carpeta | Tap outside / back | Eliminar → in-sheet confirmation (honest promotion copy) | `accessibilityActions`: activate, longpress |
| **FilesFilterMenu** | Filter icon tap | MOSTRAR: Todos / Favoritos; ORDENAR: Recientes / A-Z | Tap outside / back | None | `accessibilityLabel` = "Filtros y orden. Mostrando X, Y. Toca para cambiar." |
| **Header Overflow** | … tap | Seleccionar (if !selection), Papelera (if delete cap) | Tap outside / back | None | `accessibilityLabel` = "Más opciones de Archivos" |
| **Viewer Header** | (New) … tap | Información, Compartir, Abrir o compartir con… | Tap outside / back | None | Reachability: must scroll if >5 rows |
| **Selection Bar** | Always visible in mode | Mover (bulk), Cancelar | N/A (mode dismiss) | None | `accessibilityLabel` on each button |
| **Trash Detail** | Row tap | View 1: Restaurar, Eliminar definitivamente → View 2: Confirmar / Cancelar | Back / Cancel | View 2 is the confirmation | `accessibilityRole="alert"` on purge button |

**No nested menus.** Every action is one level deep.

---

## 5. MICROINTERACTIONS & MOTION — PROPOSAL

### 5.1 Motion Vocabulary (HomePlus Tokens)

| Token | Value | Use |
|---|---|---|
| `motion.fast` | 150ms | Fade, color flip, small scale |
| `motion.normal` | 200ms | Slide, cross-fade, bar enter/exit |
| `motion.slow` | 300ms | Shared-element, complex transitions |
| `motion.easing.standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default |
| `motion.easing.emphasized` | `cubic-bezier(0.4, 0, 0, 1)` | Decelerate (enter) |
| `motion.easing.decelerated` | `cubic-bezier(0, 0, 0.2, 1)` | Accelerate (exit) |

### 5.2 Motion Specs

| Interaction | Motion | Reduced-Motion | Long-Running Op | Cancellation |
|---|---|---|---|---|
| **Folder enter** | Cross-fade 200ms + content slide-up 200ms | Instant cross-fade | N/A | Back cancels immediately |
| **Folder exit (back)** | Cross-fade 150ms + content slide-down 150ms | Instant | N/A | N/A |
| **File open (Viewer)** | Fade-in 150ms (layer over browser) | Instant | Loading skeleton → content | Back closes Viewer instantly |
| **File close (Viewer)** | Fade-out 100ms | Instant | N/A | N/A |
| **Selection activate** | Bar slide-up 200ms + tile border pulse 150ms | Instant bar | N/A | Long press arms drag instead |
| **Multi-select (drag)** | Auto-scroll 16ms ticks; crossed tile border flash 80ms | No auto-scroll | N/A | Release/terminate stops instantly |
| **Favorite toggle** | Heart scale 1.0→1.2→1.0 (150ms) + color cross-fade | Instant color | N/A | N/A |
| **Upload progress** | Ring/bar smooth (per progress event) | Static steps | Progress events drive motion | Cancel → bar shrinks + checkmark |
| **Move files** | Row slide-out 200ms (staggered 50ms) | Instant remove | Refresh preserves window | N/A |
| **Delete/Restore** | Row fade 150ms + collapse 150ms | Instant | Refresh | N/A |
| **Empty state show** | Cross-fade 200ms | Instant | N/A | N/A |
| **Viewer loading** | Skeleton shimmer (1.4s loop) | Static skeleton | Timeout at 15s/30s | Close cancels load + cleanup |
| **Scanner editor enter** | Slide-up 250ms (full screen) | Instant | N/A | Back → discard confirmation |

### 5.3 Guardrails
- **Motion never conceals failure**: Timeouts → honest error surface, not spinner forever
- **Motion never delays important action**: Close/back always immediate (100ms max)
- **Respect `reduceMotion`**: All animated values check `useReducedMotion()` (add hook)
- **Low-end device**: Disable spring/physics; use `timing` only
- **Gesture cancellation**: Drag selection → `PanResponder` termination clears all timers

---

## 6. REMAINING FUNCTIONAL DEBT

| Area | Debt | Severity | Blocked By |
|---|---|---|---|
| **PDF Viewer** | Device validation (V-A–V-H) | P0 | Physical iPhone + Expo Go |
| **Video/Audio decode failure** | Inline hand-off UX (V17) | P1 | Device test with unsupported codec |
| **Scanner page reorder** | Not implemented | P1 | Design decision (is it V1?) |
| **Search** | Stage 3 — not in current scope | P3 | Product decision |
| **Offline cache** | No offline-first read | P3 | Architecture decision |
| **Cross-device sync verification** | Household isolation (H1–H4) | P1 | Two devices, two households |

---

## 7. PRIORITIZED BACKLOG (P0–P3)

### P0 (Must Fix Before Product Freeze)
1. **PDF Viewer device validation** — all V-A through V-H `PASS_DEVICE`
2. **Selection bar visibility** — verify not behind BottomNav
3. **Media decode failure hand-off** — V17 `PASS_DEVICE`
4. **Expo Go acceptance** — G1–G10 `PASS_DEVICE`

### P1 (Should Fix Before Product Freeze)
5. Filter/Order discoverability (consider persistent sort chip when non-default)
6. Refresh accessibility hint on filter icon
7. Selection scope reset documentation in empty state
8. Scanner editor viewport sizing
9. Scanner page reorder (if V1 scope)
10. Household isolation validation (H1–H4)

### P2 (Polish Before Freeze)
11. Viewer enter/exit fade (150ms)
12. Selection bar slide-up (200ms)
13. Favorite heart pulse (150ms)
14. Upload progress motion verification
15. Move picker depth indicator animation
16. Empty state cross-fade
17. Drag selection edge hint

### P3 (Post-Freeze / Future)
18. OCR for scanned PDFs
19. Tag/label system
20. Version history
21. Cross-household search opt-in
22. Advanced filters (type, size, date range)

---

## 8. VERIFICATION CHECKLIST (FROM QA DOCUMENT)

All rows from `HOMECLOUD_FILES_STAGE2_DEVICE_QA.md` are **`UNPROVEN_DEVICE`**. This audit confirms the implementation exists for every row; physical validation is the only remaining gate.

| Section | Rows | Status |
|---|---|---|
| Favorites | F1–F9 | `UNPROVEN_DEVICE` |
| Selection | S1–S16 | `UNPROVEN_DEVICE` |
| Refresh | R1–R7 | `UNPROVEN_DEVICE` |
| Pagination | P1–P8 | `UNPROVEN_DEVICE` |
| Viewer | V1–V21 | `UNPROVEN_DEVICE` |
| Expo Go | G1–G10 | `UNPROVEN_DEVICE` |
| Household Isolation | H1–H4 | `UNPROVEN_DEVICE` |

**No row can be marked `PASS_DEVICE` without human observation on physical iPhone.**