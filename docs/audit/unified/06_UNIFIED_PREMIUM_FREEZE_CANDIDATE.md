# 06_UNIFIED_PREMIUM_FREEZE_CANDIDATE.md

**HomeCloud Unified Experience — Premium Experience Freeze Candidate**

Status: **DESIGN PROPOSAL** — Based on source audit, product truth documents, and unified analysis. Requires **USER CONFIRMATION** on all PROPOSED items.

---

## 0. FREEZE SCOPE DEFINITION

This freeze candidate defines the **Unified Premium Experience V1** — the single, coherent HomeCloud product combining Files, Memories, and Office Viewer.

**In Scope**:
- All 65 screens from `01_UNIFIED_CURRENT_SCREEN_ATLAS.md`
- Shared design tokens, primitives, overlay architecture
- Navigation paths and motion specifications
- Performance baselines and functional debt acknowledgment

**Out of Scope** (Explicitly Deferred):
- AI/ML features (search, tagging, faces, places)
- Social features (sharing beyond OS, comments, likes)
- Pro editing (crop, filters, collage, video edit)
- Background sync/playback
- Nested albums, archive, private memories
- Cross-household sharing (beyond current isolation)

---

## 1. SCREEN CLASSIFICATION — FREEZE DECISIONS

Every screen classified with **KEEP / MINOR_POLISH / MAJOR_POLISH / REDESIGN**.

### 1.1 Shared Entry & Navigation

| Screen | Classification | Rationale | User Confirmation |
|--------|----------------|-----------|-------------------|
| HomeCloud Entry (Más → HomeCloud) | **KEEP** | Working, global tab selector correct | ☐ Confirm |
| Global Tab Selector (Archivos \| Recuerdos) | **KEEP** | Frozen in product truth, no intermediate root | ☐ Confirm |
| Household Switcher | **KEEP** | Global HomePlus, discards state correctly | ☐ Confirm |
| Permission Gating | **KEEP** | 4 capabilities, correct projection | ☐ Confirm |

### 1.2 Files Screens

| Screen | Classification | Rationale | User Confirmation |
|--------|----------------|-----------|-------------------|
| Files Root Browser | **KEEP** | 2-col grid, search, sort, filter — all frozen | ☐ Confirm |
| Folder Browser | **KEEP** | Hierarchical, breadcrumb trail, one-level-up back | ☐ Confirm |
| Search (Global/Folder) | **KEEP** | Server-backed, metadata-first, no OCR | ☐ Confirm |
| Sort/Filter Menu | **KEEP** | Compact filter icon, Show/Order — frozen | ☐ Confirm |
| Favorites Filter Mode | **KEEP** | Server-side, composes with context | ☐ Confirm |
| File Grid (Virtualized) | **KEEP** | 2-col, responsive, preview fallbacks | ☐ Confirm |
| Folder Tile | **KEEP** | Tap→enter, long press→actions | ☐ Confirm |
| File Tile | **KEEP** | Tap→Viewer (reserved), long press→actions | ☐ Confirm |
| Empty States | **KEEP** | Honest copy, CTA, refreshable | ☐ Confirm |
| Error States | **KEEP** | Preserves window, explicit retry | ☐ Confirm |
| Loading States | **KEEP** | Pull-to-refresh, auto-pagination | ☐ Confirm |
| Selection Mode | **KEEP** | Header overflow entry, tap toggle, drag sweep | ☐ Confirm |
| Selection Bar | **KEEP** | `[X] N seleccionados [⋯ Acciones]` | ☐ Confirm |
| Drag Selection (D4) | **KEEP** | Anchor decision, auto-scroll, measured frames | ☐ Confirm |
| Bulk Move | **KEEP** | Shared picker, N×PATCH, one reconciliation | ☐ Confirm |
| File Action Host | **KEEP** | 7 rows, scrollable, per-row busy, label flips | ☐ Confirm |
| File Info Sheet | **KEEP** | Name, Folder, Doc Date, Note — canonical | ☐ Confirm |
| Rename Sheet | **KEEP** | Inline edit | ☐ Confirm |
| Move Picker (All) | **KEEP** | One destination grammar, tree depth-first | ☐ Confirm |
| Save Copy / Share | **KEEP** | Stage → native export/share, no outcome claim | ☐ Confirm |
| Favorite Toggle | **KEEP** | Per-row busy, idempotent, label flips | ☐ Confirm |
| Add Sheet (Root/Folder) | **KEEP** | 3/2 items, folder inheritance | ☐ Confirm |
| Document Scanner | **KEEP** | Multi-page PDF, perspective correction | ☐ Confirm |
| New Folder Sheet | **KEEP** | Name input, parent inherited | ☐ Confirm |
| **Image Viewer** | **MINOR_POLISH** | Pinch zoom, pan, double-tap zoom/reset **DEFERRED** | ☐ Confirm double-tap defer |
| **Video Viewer** | **MINOR_POLISH** | Poster, native controls, fullscreen, **±10s DEFERRED** | ☐ Confirm ±10s defer |
| **Audio Viewer** | **MINOR_POLISH** | Seek, ±10s, speed, buffering, **waveform ROADMAP** | ☐ Confirm waveform roadmap |
| **PDF Viewer** | **KEEP** | Inline pdf.js, multi-page, zoom, local staged | ☐ Confirm |
| **TXT/MD/CSV Viewer** | **KEEP** | Bounded read, selectable/copyable | ☐ Confirm |
| **Office Viewer (DOCX)** | **KEEP** | Embedded OnlyOffice, `type: "embedded"` | ☐ Confirm |
| **Office Viewer (XLSX/PPTX)** | **MAJOR_POLISH** | System hand-off only — honest but not inline | ☐ Confirm hand-off acceptable |
| **Unsupported/SVG/HTML** | **KEEP** | Honest refusal + hand-off | ☐ Confirm |
| Password-Protected PDF | **KEEP** | Dedicated state + hand-off | ☐ Confirm |
| Corrupt/Oversized PDF | **KEEP** | Polished failure + hand-off | ☐ Confirm |
| Trash Surface | **KEEP** | List TRASHED, Restore, Purge (confirm) | ☐ Confirm |
| Trash Empty | **KEEP** | Hidden when empty | ☐ Confirm |
| Purge Confirmation | **KEEP** | Explicit dialog, requires `homecloud.delete` | ☐ Confirm |
| Undo Snackbar | **KEEP** | "Movido a la papelera" + `Deshacer` | ☐ Confirm |

### 1.3 Memories Screens

| Screen | Classification | Rationale | User Confirmation |
|--------|----------------|-----------|-------------------|
| Memories Root | **KEEP** | Single scroll: Title, Resurfacing, Albums, Types, Timeline | ☐ Confirm |
| Title Row (+) | **KEEP** | No circle, 44×44 hit, no visible refresh | ☐ Confirm |
| Resurfacing Band | **KEEP** | Exact-only, deterministic, hide action | ☐ Confirm |
| Albums Rail | **KEEP** | Horizontal, cover tiles, create tile at end | ☐ Confirm |
| Types Rail | **KEEP** | 4 fixed tiles, no counts | ☐ Confirm |
| Timeline | **KEEP** | SectionList, year/month, 3-col, sticky headers off | ☐ Confirm |
| Album Detail | **KEEP** | Nested overlay, SectionList, no permanent X | ☐ Confirm |
| Album Create | **KEEP** | Header `+ Nuevo` (always visible), empty CTA | ☐ Confirm |
| Album Actions | **KEEP** | Rename, Add Memories, Delete (confirm copy) | ☐ Confirm |
| Album Empty | **KEEP** | Honest copy + CTA | ☐ Confirm |
| Type Collections | **KEEP** | Auto-derived, same overlay as Album | ☐ Confirm |
| Resurfacing Group | **KEEP** | Group overlay, pager locked to group | ☐ Confirm |
| Hide from Resurfacing | **KEEP** | Sets `hidden_from_resurfacing=true` | ☐ Confirm |
| Selection Mode | **KEEP** | Long press entry, header morph, no `✓` gate | ☐ Confirm |
| Selection Header | **KEEP** | `[X] N seleccionados [⋯ Acciones]` | ☐ Confirm |
| Selection Actions | **KEEP** | Shared grammar, destination picker replaces content | ☐ Confirm |
| Drag Selection (D4) | **KEEP** | Contiguous, auto-scroll, measured | ☐ Confirm |
| **Viewer Shell** | **KEEP** | Immersive, hides global chrome, safe-area | ☐ Confirm |
| **Top Chrome** | **KEEP** | `[Cerrar] [Fecha] [⋯]` — close 44×44 | ☐ Confirm |
| **Bottom Chrome** | **KEEP** | Source label + media controls | ☐ Confirm |
| **Image Viewer** | **MINOR_POLISH** | Fit, pinch, pan, **double-tap zoom/reset DEFERRED** | ☐ Confirm double-tap defer |
| **Video Viewer** | **MINOR_POLISH** | Poster→player, fullscreen, **±10s DEFERRED** | ☐ Confirm ±10s defer |
| **Audio Viewer** | **MINOR_POLISH** | Identity, seek, ±10s, speed, **waveform ROADMAP** | ☐ Confirm waveform roadmap |
| **Written Viewer** | **KEEP** | Scroll, copy all, share text | ☐ Confirm |
| **Pager Invariants** | **KEEP** | Source-immutable, active-by-id, Missing state | ☐ Confirm |
| Viewer Menu (1 item) | **KEEP** | Shared grammar via `⋯` | ☐ Confirm |
| Selection Menu (N) | **KEEP** | Same grammar, bulk variants | ☐ Confirm |
| Album/Type/Resurfacing/Trash/Fav Menus | **KEEP** | Shared grammar | ☐ Confirm |
| Create Menu (+) | **KEEP** | 5 flat items, no submenu | ☐ Confirm |
| Gallery Picker | **KEEP** | Multi-select, mixed, per-item dates | ☐ Confirm |
| Camera | **KEEP** | Photo/Video, Retake, real capture instant | ☐ Confirm |
| Audio Import | **KEEP** | System picker → review → editable date (unknown) | ☐ Confirm |
| Audio Record | **KEEP** | Mic → recorder → review → editable date (exact) | ☐ Confirm |
| Written Memory | **KEEP** | Text form, 4 precisions, optional Album/desc | ☐ Confirm |
| Batch Review | **KEEP** | Swipe previews, single submit, partial failure honest | ☐ Confirm |
| Trash Section | **KEEP** | Conditional, Restore preserves albums, Purge confirm | ☐ Confirm |
| Favorites Tile | **KEEP** | System tile in Albums rail (star), auto-derived | ☐ Confirm |
| Favorite Toggle | **KEEP** | Star/unstar, bulk in selection | ☐ Confirm |

### 1.4 Shared & Office

| Screen | Classification | Rationale | User Confirmation |
|--------|----------------|-----------|-------------------|
| ActionSheet Host | **KEEP** | Single host, 4 sizes, content replacement | ☐ Confirm |
| Modal Host | **KEEP** | No stacked Modals, Viewer is View | ☐ Confirm |
| Upload Progress Band | **KEEP** | Global, cross-tab, cancel support | ☐ Confirm |
| Download/Share Staging | **KEEP** | `Paths.cache` + cleanup on resolve | ☐ Confirm |
| Signed URL Cache | **MINOR_POLISH** | Connect invalidation to household change | ☐ Confirm |
| Error Boundaries | **KEEP** | Per-screen `ErrorState`, honest retry | ☐ Confirm |
| Loading Skeletons | **KEEP** | Mutually exclusive states | ☐ Confirm |
| Office Session Creation | **KEEP** | Signed JWT config, backend | ☐ Confirm |
| Office Viewer Surface | **KEEP** | Embedded OnlyOffice, `officeFill` | ☐ Confirm |
| Bridge Protocol | **KEEP** | Versioned, typed, hostile-input-proof | ☐ Confirm |
| Origin Whitelist | **KEEP** | Session origin only | ☐ Confirm |
| Title Escaping | **KEEP** | Neutralizes `</script>` | ☐ Confirm |
| Diagnostics | **KEEP** | Bounded codes, no tokens/URLs | ☐ Confirm |

---

## 2. UNIFIED DESIGN LANGUAGE — FROZEN DECISIONS

### 2.1 What Files and Memories SHARE (Enforced)

| Aspect | Decision | Evidence |
|--------|----------|----------|
| **Colors & Tokens** | Single `theme.ts` — no module overrides | `theme.ts` imported by both |
| **Typography** | `typography.*` tokens everywhere | `AppText` variant system |
| **Spacing Grammar** | `spacing[1-6]` = 4/8/12/16/24/32 | All layouts use tokens |
| **Buttons** | `AppButton` variants/sizes shared | Primary, secondary, text, icon, destructive |
| **Touch Targets** | `touchTargets.normal=44`, `large=48` | All interactive elements |
| **Navigation Transitions** | **PROPOSED** `MOTION` tokens (see §3) | Not yet tokenized |
| **Contextual Popovers** | **PROPOSED** `ActionSheet size="popover"` | Single host, anchor variant |
| **Modal Host** | **PROPOSED** `OverlayHost` authority | Single z-index registry |
| **Loading/Skeleton** | `Skeleton` component, mutually exclusive states | All surfaces |
| **Toasts/Feedback** | Inline snackbar + upload band | No standalone toast |
| **Motion Families** | **PROPOSED** `MOTION` tokens | See `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` |
| **Accessibility** | Hit targets, safe areas, contrast, labels, reduce motion | Contract in `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` |
| **Error/Empty States** | `ErrorState` + `Reintentar`, honest copy, never destroys data | All surfaces |

### 2.2 What Remains SPECIALIZED (By Design)

| Aspect | Files | Memories | Rationale |
|--------|-------|----------|-----------|
| **Grid Density** | 2-col compact, info-efficient | 3-col timeline, media-first, breathing room | Different cognitive tasks |
| **Tile Identity** | Name + badge, folder context | Media type + semantic date + album badge | Files=documents, Memories=media |
| **Organization** | Hierarchical folders (tree) | Flat Albums (narrative) + Types (auto) | Files=organize, Memories=rediscover |
| **Search** | Global + folder-scoped, metadata | OUT (grouping sufficient) | Files=find, Memories=recognize |
| **Date Model** | Document date (single) | 4 precisions (exact/month-year/year/unknown) | Memories=semantic capture |
| **Viewer** | Layer over browser (chrome visible) | Immersive (chrome hidden), source-locked | Files=utility, Memories=immersive |
| **Capture** | Scanner only | Camera + Audio Record + Import | Memories=capture life |
| **Lifecycle** | Trash + Purge (no albums) | Trash + Restore + Purge (preserves albums) | Memories=recover story |

---

## 3. MOTION SPECIFICATIONS — FROZEN TARGETS

| Transition | Duration | Easing | Reduced Motion | Status |
|------------|----------|--------|----------------|--------|
| Tab Switch (Archivos↔Recuerdos) | 150ms | ease-out | 30ms linear | **PROPOSED** |
| Folder Enter (Files) | 200ms | ease-out | 40ms linear | **PROPOSED** |
| Folder Back (Files) | 200ms | ease-in | 40ms linear | **PROPOSED** |
| File → Viewer (Files) | 250ms | spring (origin-aware) | 50ms linear | **PROPOSED** |
| Viewer → File (Files) | 200ms | ease-in | 40ms linear | **PROPOSED** |
| Album → Detail (Memories) | 250ms | spring (origin-aware) | 50ms linear | **PROPOSED** |
| Detail → Root (Memories) | 200ms | ease-in | 40ms linear | **PROPOSED** |
| Memory → Viewer (Memories) | 250ms | spring (origin-aware) | 50ms linear | **PROPOSED** |
| Viewer → Memory (Memories) | 200ms | ease-in | 40ms linear | **PROPOSED** |
| Viewer Pager Swipe | 150ms | ease-out | 30ms linear | **PROPOSED** |
| ActionSheet Open | 200ms | ease-out | 40ms linear | **PROPOSED** |
| ActionSheet Close | 150ms | ease-in | 30ms linear | **PROPOSED** |
| Selection Header Morph | 150ms | ease-out | 30ms linear | **PROPOSED** |
| Upload Band Appear | 200ms | ease-out | 40ms linear | **PROPOSED** |
| Trash Expand (Memories) | 200ms | ease-out | 40ms linear | **PROPOSED** |

**OWNERSHIP**: All motion driven by `MOTION` tokens in `theme.ts`. `useReducedMotion` hook gates all `Animated.*`.

**INTERRUPTION**: All transitions cancellable. Gesture-driven (swipe, drag) follow finger. Programmatic (tab, back) reverse on new trigger.

---

## 4. POPOVER / MODAL ARCHITECTURE — FROZEN

### 4.1 Single Overlay Authority

```typescript
// OverlayHost — single source of truth
zIndex: 50  → Upload Band (global)
zIndex: 20  → Viewers (Files, Memories, Office) — absolute Views
zIndex: 10  → Nested Overlays (Album, Type, Resurfacing) — absolute Views
zIndex: 1   → ActionSheet (RN Modal) — ONLY Modal in tree
zIndex: 0   → Backdrop / Root Content
```

### 4.2 Anchored Popovers (ActionSheet `size="popover"`)

| Trigger | Anchor | Actions | Dismissal |
|---------|--------|---------|-----------|
| File Tile Long Press (Files) | Tile bounds (top) | 7 actions | Outside tap, back, scroll |
| Folder Tile Long Press (Files) | Tile bounds (top) | Folder actions | Same |
| Viewer `⋯` (Memories) | Button bounds | 4-6 actions | Same |
| Album `⋯` (Memories) | Button bounds | 3-4 actions | Same |
| Type/Resurfacing/Trash/Fav `⋯` | Button bounds | 3-5 actions | Same |

### 4.3 Bottom Sheets (ActionSheet `size="content/scrollable-content"`)

| Trigger | Content | Reason |
|---------|---------|--------|
| Header Overflow `⋯` (Files) | `Seleccionar` (mode entry) | Mode entry = sheet |
| Create Menu `+` (Files) | 3 items (File, Scan, Folder) | Multi-step (scanner) |
| Create Menu `+` (Memories) | 5 flat items (all launch sub-flows) | Multiple destinations |
| Scanner Review | Multi-page thumbnails | Visual review |
| Destination Picker (Move) | Tree depth-first | Many choices |
| Date Picker | 4 precisions | Form-like |

### 4.4 Collision & Safe Area Rules

1. Popover prefers `anchor='top'` for bottom triggers, flips to `bottom` if <100dp space
2. Clamped to `insets.left + 16` / `insets.right + 16`
3. Max width: `viewportWidth - 32`
4. Keyboard: dismiss on show, resize if input inside
5. Back gesture: dismisses topmost overlay (Viewer > Nested > Sheet)

---

## 5. PERFORMANCE BASELINES — FROZEN TARGETS

| Metric | Target | Measurement | Status |
|--------|--------|-------------|--------|
| Cold Start (HomeCloud Entry) | < 2s TTI | `react-native-performance` | **PENDING DEVICE** |
| Tab Switch Latency | < 100ms | Custom mark/measure | **PENDING DEVICE** |
| Files Grid Scroll (250 items) | 60fps, <16ms/frame | `why-did-you-render` | **PENDING DEVICE** |
| Memories Timeline Scroll (500) | 60fps | Same | **PENDING DEVICE** |
| Video Open (first frame) | < 500ms (with poster) | `expo-video` events | **PENDING DEVICE** |
| Audio Open (first play) | < 300ms | `expo-audio` events | **PENDING DEVICE** |
| PDF Open (first page, <8MiB) | < 1s | pdf.js `DOCUMENT_LOADED` | **PENDING DEVICE** |
| Office Open (ready) | < 3s (network) | Bridge `DOCUMENT_READY` | **PENDING DEVICE** |
| Household Switch Cleanup | 0 stale URLs | Custom verification | **PENDING DEVICE** |
| Steady-State Heap | < 150MB | `react-native-performance` | **PENDING DEVICE** |
| Bundle Size (HomeCloud) | < 5MB gzipped | `expo bundle-analyzer` | **PENDING DEVICE** |

---

## 6. FUNCTIONAL DEBT — ACKNOWLEDGED (Not Fixed in Freeze)

| Debt | Module | Freeze Decision |
|------|--------|-----------------|
| PPTX/XLSX Viewer | Files | **HAND-OFF ACCEPTED** — honest system hand-off |
| Real Audio Waveform | Memories | **ROADMAP** — `expo-audio` sampling, device QA required |
| Video Thumbnails | Memories | **ROADMAP** — backend preview pipeline |
| Platform Audio Routing | Memories | **PRESERVE + VERIFY** — OS provides |
| Selection System Test | Shared | **TEST EXPECTATION STALE** — update to 1 `implemented: false` |
| Device QA | All | **BLOCKER** — physical iPhone required |
| Office Runtime QA | Files | **BLOCKER** — OnlyOffice + device |
| Migration Runtime Verify | Files | **REQUIRED** — data integrity post-migration |
| Signed URL Invalidation | Both | **CONNECT** — call `clearMemory*Cache()` on household change |

---

## 7. PRODUCT DECISIONS REQUIRING USER CONFIRMATION

| Decision | Options | Recommendation | User Confirmation |
|----------|---------|----------------|-------------------|
| **Double-tap Image Zoom/Reset** | Implement (Reanimated 3) vs Defer | **DEFER** — risk of pager arbitration | ☐ Confirm defer |
| **Video Double-tap ±10s** | Implement vs Defer | **DEFER** — gesture conflict risk | ☐ Confirm defer |
| **Audio Waveform** | Live (playback only) vs Static (download) vs Progressive | **ROADMAP** — device QA first | ☐ Confirm roadmap |
| **XLSX/PPTX Inline** | OnlyOffice embedded vs Hand-off | **HAND-OFF** — honest, no fake preview | ☐ Confirm hand-off |
| **Lazy Tab Mount** | Implement vs Keep Dual Mount | **IMPLEMENT** — halves cold start cost | ☐ Confirm implement |
| **Focus Re-read Skip** | Implement (30s TTL) vs Keep Current | **IMPLEMENT** — avoids wasteful reads | ☐ Confirm implement |
| **Popover Variant** | Add `size="popover"` to ActionSheet | **IMPLEMENT** — faster contextual actions | ☐ Confirm implement |
| **OverlayHost Authority** | Implement explicit registry | **IMPLEMENT** — prevents stacking bugs | ☐ Confirm implement |
| **Reduce Motion Audit** | Full audit of all animations | **REQUIRED** — accessibility | ☐ Confirm audit |

---

## 8. FREEZE VALIDATION CHECKLIST

Before declaring **UNIFIED_PREMIUM_FREEZE**:

- [ ] All 65 screens classified with KEEP/MINOR/MAJOR/REDESIGN
- [ ] User confirmed all PROPOSED motions, popovers, specialized aspects
- [ ] Device QA scheduled for all `DEVICE_VERIFY_REQUIRED` items
- [ ] Performance baselines measured on physical iPhone
- [ ] Stale test expectation (`selection-system` 1!=2) corrected
- [ ] Signed URL invalidation connected
- [ ] `MOTION` tokens added to `theme.ts`
- [ ] `ActionSheet size="popover"` implemented
- [ ] `OverlayHost` implemented
- [ ] Reduce motion audit complete
- [ ] All `SOURCE_VERIFIED` claims traceable to source lines
- [ ] No implementation in this freeze — documentation only

---

**End of Premium Freeze Candidate**

> **Next Step**: User review and confirmation of all ☐ items. Then proceed to Implementation Roadmap.