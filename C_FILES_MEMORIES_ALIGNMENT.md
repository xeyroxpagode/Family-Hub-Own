# C. FILES × MEMORIES ALIGNMENT

## 1. PRODUCT SEMANTICS (NON-NEGOTIABLE)

| Dimension | **Files (Archivos)** | **Memories (Recuerdos)** |
|---|---|---|
| **Human intent** | "Lo guardo porque puedo necesitarlo" | "Lo guardo porque quiero volver a esto" |
| **Content examples** | Documents, PDFs, warranties, receipts, scans, manuals, useful images | Photos, videos, family audio, voices, emotional moments |
| **Visual character** | Compact, trustworthy, recognizable, information-efficient, calm | Media-first, emotional, less metadata, breathing room, mixed media |
| **Primary action** | Find → Organize → Act | See → Remember → Resurface |
| **Organization** | Hierarchical folders (optional) | Flat timeline + Albums (optional, many-to-many) |
| **Metadata focus** | Document date, note, folder, name | Captured date (precision), caption, albums |
| **Personal layer** | **Per-person Favorites** (retrieval preference) | **No favorites** (resurfacing is algorithmic) |
| **Search scope** | Metadata-first (name, note, folder, doc date) | Metadata/domain (caption, album, captured date, kind) |
| **Intake sources** | Elegir archivo, Escanear documento | Fotos y videos, Audio existente, Grabar recuerdo |

**Golden Rule:** Do not unify workflows simply for visual symmetry. Semantic differences are product features, not bugs.

---

## 2. SHARED DESIGN CONTRACTS (WORTH ALIGNING)

### 2.1 Header / Title Row Pattern
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Title | "Archivos" / folder name | "Recuerdos" | **ALIGN**: Same typography (`title3` weight 800), same left alignment |
| Back navigation | Chevron back (one level up) | None (root only) | **KEEP DIFFERENT**: Files has hierarchy; Memories is flat |
| Primary action (+) | Add sheet (file/scan/folder) | `MemoryIntake` inline in header | **KEEP DIFFERENT**: Files has 3 sources; Memories has 3 but inline |
| Filter/Order | Single icon → `FilesFilterMenu` | **None** (Stage 4) | **DEFER**: Memories filter TBD in Stage 4 |
| Refresh | Pull-to-refresh only (accessibility action) | Pull-to-refresh + header icon button | **ALIGN TO FILES**: Remove visible refresh icon from Memories; use accessibility action |
| Overflow (…)` | Seleccionar / Papelera | **None** | **KEEP DIFFERENT**: Files has selection/trash; Memories not yet |

### 2.2 Search Field
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Component | `AppInput variant="search"` | `AppInput variant="search"` | **ALIGN**: Same component, same tokens |
| Placeholder | "Buscar en archivos" / "Buscar en esta carpeta" | "Buscar recuerdos" | **ALIGN PATTERN**: Context-aware placeholder |
| Debounce | 250ms | **TBD** (Stage 4) | **ALIGN**: Same 250ms when implemented |
| Scope | Global (root) / folder-scoped | Global / album-scoped | **ALIGN PATTERN**: Scope follows context |

### 2.3 Empty States
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Component | `EmptyState` (inside `ListEmptyComponent`) | `EmptyState` (standalone) | **ALIGN**: Same component, same illustration sizing |
| Illustration | `folder-open-outline` / `heart-outline` | `image-outline` | **KEEP SEMANTIC**: Different icons per product |
| Primary action | "Agregar archivo" / "Ver todos los archivos" | (None yet) | **ALIGN WHEN MEMORIES ADDS**: Same button style |
| Refresh capability | **Yes** (ListEmptyComponent keeps FlatList mounted) | **No** (standalone View) | **FIX MEMORIES**: Wrap in scrollable container so pull-to-refresh works |

### 2.4 Error States
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Component | `ErrorState` | `ErrorState` | **ALIGN**: Same component, same tokens |
| Retry | `onRetry` → `load()` / `loadFirstPage()` | `onRetry` → `loadFirstPage()` | **ALIGN**: Same pattern |
| Capabilities notice | Banner + `Reintentar` | Banner + `Reintentar` | **ALIGN**: Same component (`homeCloudCapabilitiesNotice`) |

### 2.5 Pull-to-Refresh
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Component | `RefreshControl` on `FlatList` | `RefreshControl` on `SectionList` | **ALIGN**: Same primitive |
| Indicator color | `colors.terracotta[600]` | `colors.terracotta[600]` | **ALIGN**: Same token |
| Window preservation | Yes (`refreshPreservingWindow`) | Yes (full re-read page 1) | **NOTE DIFFERENCE**: Files preserves window; Memories re-reads page 1 (new memories at top) |

### 2.6 Upload Progress
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Component | `HomeCloudUploadActivity` | `HomeCloudUploadActivity` | **ALIGN**: Same component (shared) |
| Attribution | `filesOwnedUploadProgress` (acceptedJobIds) | `memoriesOwnedUploadProgress` (acceptedJobIds) | **ALIGN**: Same pure function, different accepted job sets |
| Visual | Progress ring/bar + status text | Progress ring/bar + status text | **ALIGN**: Same design |

### 2.7 ActionSheet Pattern
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Component | `ActionSheet` (size="scrollable-content" / "content") | `ActionSheet` (size="content") | **ALIGN**: Files uses scrollable for reachability; Memories adopt when needed |
| Footer CTA | FileActionHost (Info view) | MemoryIntake (inline) | **KEEP DIFFERENT**: Different content |
| Dismiss | `onRequestClose` + back handler | `onRequestClose` + back handler | **ALIGN**: Same behavior |

### 2.8 Icon System
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Component | `HomePlusIcon` (lucide-react-native) | `HomePlusIcon` | **ALIGN**: Same icon library, same sizing tokens |
| File type icons | `document-text-outline` (PDF), `document-outline` (generic), `image-outline` | `image-outline`, `videocam-outline`, `mic-outline` | **KEEP SEMANTIC**: Type-appropriate icons |

### 2.9 Theme Tokens (Fully Shared)
| Token | Status |
|---|---|
| `colors.background.base` | ✅ Shared |
| `colors.surface.card` | ✅ Shared |
| `colors.border.default` / `.subtle` | ✅ Shared |
| `colors.brand` / `.terracotta` / `.danger` / `.info` | ✅ Shared |
| `colors.text.primary` / `.secondary` / `.tertiary` / `.inverse` | ✅ Shared |
| `spacing[1..8]` | ✅ Shared |
| `radius.sm` / `.md` / `.lg` / `.full` | ✅ Shared |
| `touchTargets.normal` (44dp) | ✅ Shared |
| Typography variants (`title1`..`caption`, weights) | ✅ Shared |

### 2.10 Safe Area / Insets
| Element | Files | Memories | Alignment Decision |
|---|---|---|---|
| Hook | `useSafeAreaInsets` | `useSafeAreaInsets` | **ALIGN**: Same hook |
| Header padding | `Math.max(insets.top, spacing[4])` | `paddingTop: spacing[4]` (no inset max) | **ALIGN TO FILES**: Memories should respect notch |
| Bottom padding | `Math.max(insets.bottom, spacing[3/4])` | `paddingBottom: spacing[8]` | **ALIGN TO FILES**: Memories should respect home indicator |

---

## 3. DELIBERATELY DIFFERENT BEHAVIORS (DO NOT ALIGN)

| Behavior | Files | Memories | Reason |
|---|---|---|---|
| **Navigation model** | Hierarchical (folder stack, back = one level up) | Flat (timeline, back = exit HomeCloud) | Files = documentary hierarchy; Memories = temporal stream |
| **Selection** | Multi-select + bulk move (explicit mode) | **None** (Stage 4) | Files = utility/organization; Memories = consumption |
| **Favorites** | Per-person, server-filtered, persists across folders | **None** | Files = retrieval preference; Memories = algorithmic resurfacing |
| **Metadata editing** | Name, folder, doc date, note (ActionSheet Info view) | Caption, captured date precision, albums (future) | Different semantic fields |
| **Date precision** | Single `documentDate` (ISO date) | `capturedAt` + `capturePrecision` (exact/month_year/year/unknown) | Memories honors unknown dates; Files assumes known |
| **Albums vs Folders** | Tree (parent_folder_id), delete promotes children | Graph (many-to-many), no nesting | Fundamentally different models |
| **Viewer** | Full inline viewer (PDF, media, text) | **No productive viewer yet** (Stage 4B.2) | Files V1 ships viewer; Memories V1 defers |
| **Scanner** | Produces PDF → Files intake | **Not used** (Memories has camera/audio direct) | Different capture semantics |
| **Intake default destination** | Current folder (or root) | Current album (or none) | Context inheritance differs |
| **Sort default** | `uploaded_at DESC` (Recientes) | `captured_at DESC NULLS LAST` (Timeline) | Different temporal semantics |

---

## 4. SHARED COMPONENT OPPORTUNITIES

### 4.1 Already Shared (Verified)
- `HomeCloudUploadActivity` — upload progress (both use)
- `useHomeCloudCapabilities` / `homeCloudCapabilitiesNotice` — capability projection
- `subscribeHomeCloudReadReconciliation` — global read freshness
- `HomePlusIcon`, theme tokens, `AppButton`, `AppText`, `AppInput`, `ActionSheet`, `EmptyState`, `ErrorState`, `Skeleton`, `RefreshControl`, `InteractivePressable`
- `homecloudFolderTree` (Files only) / `homecloudMemoriesTimeline` (Memories only) — separate but same patterns

### 4.2 Candidates for Sharing (Post-Freeze)
| Component | Current State | Sharing Effort | Value |
|---|---|---|---|
| **Date picker** | Files: `DatePickerSheet` in `FileActionHost`; Memories: `MemorySemanticDateFields` | Medium | Unify precision handling (Files could adopt precision) |
| **EmptyState with refresh** | Files: `ListEmptyComponent` (refreshable); Memories: standalone | Low | Wrap Memories empty state in scrollable container |
| **Grid/List virtualization** | Files: `FlatList` 2-col; Memories: `SectionList` 3-col | Low | Same `numColumns` prop pattern |
| **Tile/Grid visual grammar** | Files: `FileTile`/`FolderTile`; Memories: `MemoryCard` | Medium | Shared `AppCard` base + semantic overlay |
| **Filter/Menu popover** | Files: `FilesFilterMenu`; Memories: none yet | Low | Extract `FilterPopover` primitive |

### 4.3 NOT Candidates for Sharing
| Component | Reason |
|---|---|
| `HomeCloudFileViewer` | Memories has no viewer V1 |
| `FileActionHost` | Memories actions differ (albums, caption, date precision) |
| `FileMoveDestinationPicker` | Memories has no folder move |
| `FileSelectionBar` | Memories has no selection |
| `homecloudDragSelection` | Memories has no drag selection |
| `homecloudScanner` | Memories uses direct camera/audio |

---

## 5. CROSS-BRANCH INTEGRATION RISKS

| Risk | Source | Mitigation |
|---|---|---|
| **Theme token drift** | Separate workstreams modify `constants/theme.ts` | Single source of truth; changes require cross-review |
| **ActionSheet reachability** | Files fixed (scrollable-content); Memories may regress | Enforce `fileActionSheetLayoutPolicy` test as shared gate |
| **Capabilities notice duplication** | Both read `useHomeCloudCapabilities` independently | Shared hook already — verify same cache key |
| **Upload progress attribution** | Both use `filesOwnedUploadProgress` / `memoriesOwnedUploadProgress` | Pure functions — test identity comparison logic |
| **Safe area handling** | Files respects insets fully; Memories partial | Align Memories to Files pattern before merge |
| **Empty state refresh** | Files refreshable; Memories not | Fix Memories before merge |
| **Icon consistency** | Both use `HomePlusIcon` but may diverge mappings | Centralize file-type → icon map in `constants/icons.tsx` |

---

## 6. RECOMMENDED HANDOFF TO MEMORIES WORKSTREAM

### 6.1 Immediate (Pre-Merge)
1. **Memories empty state** → wrap in `FlatList`/`SectionList` with `ListEmptyComponent` so pull-to-refresh works
2. **Memories safe area** → add `useSafeAreaInsets` to header and content padding
3. **Memories visible refresh icon** → remove; add accessibility-only `refresh-memories` action on list
4. **Capabilities notice** → verify same `homeCloudCapabilitiesNotice` rendering (already shared)

### 6.2 During Integration (Merge to `homecloud/v1-integration`)
1. **Run both test suites** — `homecloud-files-ux` + `homecloud-memories-ux` must pass
2. **Visual regression** — compare header, search, empty, error states side by side
3. **Token audit** — `git diff constants/theme.ts` must be empty or intentional
4. **Upload progress** — verify no cross-attribution (Files job ≠ Memories progress)

### 6.3 Post-Merge (Product Freeze)
1. **Shared component library** — extract `FilterPopover`, `RefreshableEmptyState`, `SafeAreaScreen` to `components/homecloud/shared/`
2. **Motion tokens** — define `motion.*` in theme; both screens adopt
3. **Icon map** — centralize `fileTypeIcon(mimeType)` and `memoryKindIcon(kind)`

### 6.4 Handoff Document Template
```markdown
# Files → Memories Alignment Handoff
Date: YYYY-MM-DD
Files HEAD: <sha>
Memories HEAD: <sha>

## Aligned (✅)
- [ ] Theme tokens identical
- [ ] Search field component + tokens
- [ ] EmptyState component + refreshable pattern
- [ ] ErrorState component
- [ ] ActionSheet reachability (scrollable-content)
- [ ] Upload progress component + attribution
- [ ] Capabilities notice banner
- [ ] Safe area insets respected

## Deliberately Different (✅ Acknowledged)
- [ ] Navigation model (hierarchy vs flat)
- [ ] Selection model (multi-select vs none)
- [ ] Favorites (per-person vs none)
- [ ] Date precision (single vs multi-precision)
- [ ] Albums vs Folders (graph vs tree)
- [ ] Viewer (full vs none)
- [ ] Scanner vs Direct capture

## Open Decisions (🔄)
- [ ] Motion tokens definition
- [ ] Shared tile/card base component
- [ ] Filter popover primitive
- [ ] Date picker unification
```

---

## 7. NO CONCURRENT WRITES RULE

> **This audit is read-only.** No changes to Memories worktree (`homecloud/memories-lane` or `C:\hpf2\...memories`). All alignment proposals are **specifications for the Memories workstream to implement in their own lane**. The merge happens only after both lanes independently pass their gates.