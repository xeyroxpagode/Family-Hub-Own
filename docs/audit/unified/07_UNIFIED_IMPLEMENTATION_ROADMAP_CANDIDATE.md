# 07_UNIFIED_IMPLEMENTATION_ROADMAP_CANDIDATE.md

**HomeCloud Unified Experience — Implementation Roadmap Candidate**

Status: **PROPOSED SEQUENCE** — Depends on `06_UNIFIED_PREMIUM_FREEZE_CANDIDATE.md` user confirmations. No implementation started.

---

## 0. ROADMAP PRINCIPLES

| Principle | Application |
|-----------|-------------|
| **One Slice at a Time** | Each slice = single cohesive change, testable, revertible |
| **Evidence Before Code** | Measurement → Design → Implement → Verify |
| **No Opportunistic Refactors** | Only changes required by freeze decisions |
| **Shared Infra First** | Tokens, OverlayHost, Motion, Popover before module work |
| **Device QA Gates** | Every slice with `DEVICE_VERIFY_REQUIRED` blocks next slice |
| **Test-Driven** | Deterministic tests updated/added per slice |

---

## 1. SLICE SEQUENCE OVERVIEW

| Slice | Name | Focus | Est. Effort | Dependencies | Gate |
|-------|------|-------|-------------|--------------|------|
| **S0** | **Shared Infrastructure** | Tokens, OverlayHost, Motion, Popover, Reduce Motion | 3-4 days | Freeze confirmed | Typecheck + Unit tests |
| **S1** | **Files Polish** | Lazy tab mount, focus re-read skip, signed URL invalidation | 2-3 days | S0 | Device QA: tab switch, household switch |
| **S2** | **Memories Polish** | Rail load collapse, viewer memoization, cache invalidation | 2-3 days | S0 | Device QA: first entry, viewer open |
| **S3** | **Motion Implementation** | Tab cross-fade, viewer open/close, album slide, header morph | 4-5 days | S0 | Device QA: all motions + reduce motion |
| **S4** | **Popover Variant** | `ActionSheet size="popover"` for contextual actions | 2-3 days | S0 | Device QA: popover positioning, collision |
| **S5** | **Office & Viewer Polish** | Video poster pipeline, PDF large-file, Office diagnostics | 3-4 days | S0, S3 | Device QA: video open, PDF, Office |
| **S6** | **Audio Waveform (Roadmap)** | Live waveform via `expo-audio` sampling | 3-4 days | S0, S5 | Device QA: Android `RECORD_AUDIO`, iOS |
| **S7** | **Performance Optimization** | Bundle split, component memoization, virtualization tuning | 3-4 days | S1-S5 | Profiling evidence |
| **S8** | **Regression & Freeze** | Full suite, device QA, documentation sync | 2-3 days | All above | **UNIFIED_PREMIUM_FREEZE** |

---

## 2. DETAILED SLICE SPECIFICATIONS

### Slice S0: Shared Infrastructure (Foundation)

**Objective**: Establish single authority for tokens, overlays, motion, and popovers.

| Task | File | Change | Test |
|------|------|--------|------|
| Add `MOTION` tokens to `theme.ts` | `theme.ts` | Export `MOTION` object with durations, easings, reduced multiplier | Unit: token existence |
| Implement `useReducedMotion` hook | `hooks/useReducedMotion.ts` | `AccessibilityInfo.isReduceMotionEnabled` + listener | Unit: hook returns boolean |
| Implement `OverlayHost` | `services/homecloud/OverlayHost.tsx` | Context + Provider, z-index registry, back handler priority | Unit: registry order |
| Wrap `HomeCloudScreen` with `OverlayHost.Provider` | `HomeCloudScreen.tsx` | Add Provider at root | Integration: no stacking |
| Add `size="popover"` to `ActionSheet` | `components/ui/ActionSheet.tsx` | New size variant: anchored, no backdrop, arrow, collision flip | Unit: popover renders |
| Add `anchorRef` + `anchor` props to `ActionSheet` | `components/ui/ActionSheet.tsx` | Positioning logic, safe area clamp | Unit: positioning math |
| Connect `clearMemoryPreviewCache` / `clearMemoryOriginalCache` to household change | `HomeCloudScreen.tsx` / `HomeCloudMemoriesScreen.tsx` | Call in household change effect | Unit: caches cleared |
| Audit all `Animated.*` for `reduceMotion` | All animated components | Wrap with `useReducedMotion` check | Unit: animations skipped |

**Deliverables**: 
- `theme.ts` with `MOTION`
- `OverlayHost` working
- `ActionSheet` popover variant
- Cache invalidation connected
- All animations respect reduce motion

**Gate**: `tsc --noEmit` + unit tests pass + no RN Modal stacking.

---

### Slice S1: Files Polish

**Objective**: Apply shared infra to Files; fix identified performance/functional gaps.

| Task | File | Change | Test |
|------|------|--------|------|
| Lazy-mount inactive tab | `HomeCloudScreen.tsx` | `HomeCloudFilesView` / `HomeCloudMemoriesView` mount on first tab show, not entry | Integration: mount order |
| Skip focus re-read if cache fresh | `HomeCloudFilesScreen.tsx` | `useFocusEffect` checks `plannerCache` TTL before `loadFirstPage()` | Unit: cache hit skips read |
| Use `MOTION` tokens for any new animations | `HomeCloudFilesScreen.tsx` | Replace hardcoded durations | Visual: motion tokens used |
| Use `ActionSheet size="popover"` for File/Folder long press | `HomeCloudFilesScreen.tsx`, `FileActionHost.tsx` | Replace `size="scrollable-content"` with popover for 7-row actions | Device: popover at tile |
| Verify `FileActionHost` scrollable still works for long lists | `FileActionHost.tsx` | Keep `scrollable-content` for >5 actions at small viewport | Device: 360pt font 1.3 |
| Add `MOTION` to folder enter/back (if animated) | `HomeCloudFilesScreen.tsx` | Wrap browser container in `Animated.View` | Device: folder transitions |

**Deliverables**: 
- Files tab lazy-mounted
- Focus re-read optimized
- File/Folder actions use popover
- Folder transitions animated (optional)

**Gate**: Device QA — tab switch <100ms, household switch cleans caches, File popover positions correctly.

---

### Slice S2: Memories Polish

**Objective**: Apply shared infra to Memories; fix HC2-C Run A fixes (already in codebase) and polish.

| Task | File | Change | Test |
|------|------|--------|------|
| Verify HC2-C Run A fixes present | `MemoryViewer.tsx`, `MemoryVideoPage.tsx`, `MemoryAudioPage.tsx` | Page width declared, opening lock, memoized `viewerMemories`, no fallback to 0 | Unit: HC2-A/HC2-B tests pass |
| Collapse rail loads (already done) | `HomeCloudMemoriesScreen.tsx` | Single `loadRail` after scope reset | Unit: 1 rail load on mount |
| Use `MOTION` tokens for viewer open/close | `MemoryViewer.tsx` | Replace any hardcoded durations | Visual: motion tokens |
| Use `ActionSheet size="popover"` for Viewer `⋯`, Album `⋯`, Type/Resurfacing/Trash/Fav `⋯` | `MemoryViewer.tsx`, `AlbumDetailView.tsx`, `MemorySelectionHeader.tsx` | Replace bottom sheet with anchored popover | Device: popover from buttons |
| Verify selection header morph uses `MOTION` | `MemorySelectionHeader.tsx` | Animate height/opacity on enter/exit | Device: header morph |
| Connect cache invalidation (already in S0) | `HomeCloudMemoriesScreen.tsx` | Household change clears preview/original caches | Unit: caches cleared |
| Add `MOTION` to Album/Type/Resurfacing slide | `AlbumDetailView.tsx`, Collection overlay | Animate `translateY` from tile | Device: album open/close |

**Deliverables**: 
- All HC2-C Run A fixes verified
- Contextual menus use popover
- Viewer/Album transitions animated
- Cache invalidation working

**Gate**: Device QA — first entry no skeleton race, viewer opens exact item, popovers position correctly.

---

### Slice S3: Motion Implementation

**Objective**: Implement all frozen motion transitions from `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md`.

| Transition | Implementation | Files |
|------------|----------------|-------|
| Tab Switch Cross-fade | `Animated.View` wrapping both panes, `opacity` cross-fade on `section` change | `HomeCloudScreen.tsx` |
| Folder Enter/Back (Files) | `Animated.View` on browser container, `translateX` + `opacity` | `HomeCloudFilesScreen.tsx` |
| File → Viewer (Files) | Shared element transition (Reanimated 3) or scale-from-tile | `HomeCloudFileViewerScreen.tsx` |
| Viewer → File (Files) | Reverse of above | `HomeCloudFileViewerScreen.tsx` |
| Album → Detail (Memories) | `Animated.View` on `AlbumDetailView`, `translateY` from tile | `AlbumDetailView.tsx` |
| Detail → Root (Memories) | Reverse | `AlbumDetailView.tsx` |
| Memory → Viewer (Memories) | Shared element or scale-from-tile | `MemoryViewer.tsx` |
| Viewer → Memory (Memories) | Reverse | `MemoryViewer.tsx` |
| Viewer Pager Swipe | Native `FlatList` paging — verify reduce motion | `MemoryViewer.tsx`, `HomeCloudFileViewerScreen.tsx` |
| ActionSheet Open/Close | Native Modal — verify `reduceMotion` disables slide | `ActionSheet.tsx` |
| Selection Header Morph | `Animated.View` height/opacity | `MemorySelectionHeader.tsx`, `FileSelectionBar.tsx` |
| Upload Band | `Animated.View` `translateY` | `HomeCloudUploadProgress.tsx` |
| Trash Expand | `Animated.View` height | `HomeCloudMemoriesScreen.tsx` |

**Reduce Motion**: All `Animated.timing`/`spring` gated by `useReducedMotion()` → duration ×0.2, easing `linear`.

**Deliverables**: All transitions implemented with `MOTION` tokens. Reduce motion verified.

**Gate**: Device QA — all motions smooth, reduce motion disables animations, no stuck states on interruption.

---

### Slice S4: Popover Variant Polish

**Objective**: Complete `ActionSheet size="popover"` implementation and migrate all contextual menus.

| Task | File | Change | Test |
|------|------|--------|------|
| Popover positioning engine | `ActionSheet.tsx` | `measure(anchorRef)` → calculate position, arrow, flip, clamp | Unit: positioning math |
| Collision detection | `ActionSheet.tsx` | Flip anchor if <100dp space, clamp to safe areas | Unit: collision cases |
| Keyboard handling | `ActionSheet.tsx` | Dismiss on keyboard show (configurable) | Device: keyboard |
| Migrate File Tile long press | `HomeCloudFilesScreen.tsx` | `ActionSheet size="popover" anchorRef={tileRef} anchor="top"` | Device: popover at tile |
| Migrate Folder Tile long press | `HomeCloudFilesScreen.tsx` | Same | Device: popover at tile |
| Migrate Viewer `⋯` | `MemoryViewer.tsx` | Popover from `⋯` button | Device: popover in viewer |
| Migrate Album `⋯` | `AlbumDetailView.tsx` | Popover from `⋯` button | Device: popover in album |
| Migrate Type/Resurfacing/Trash/Fav `⋯` | `MemorySelectionHeader.tsx` | Popover from `⋯` in selection header | Device: popover in selection |
| Verify bottom sheet still used for Create/Scanner/Destination | `FileIntake.tsx`, `MemoryIntake.tsx`, `FileMoveDestinationPicker.tsx` | Keep `size="content/scrollable-content"` | Device: sheets work |

**Deliverables**: Popover variant production-ready. All contextual menus migrated.

**Gate**: Device QA — popovers position correctly on all widths (360/390/430), notched devices, font scales 1.0/1.3. No overlap with safe areas.

---

### Slice S5: Office & Viewer Polish

**Objective**: Close remaining viewer gaps (video poster, PDF large, Office diagnostics).

| Task | File | Change | Test |
|------|------|--------|------|
| Video Poster Pipeline | Backend + `MemoryVideoPage.tsx` | Generate thumbnail on upload, store in `homecloud-previews`, show poster before player ready | Device: video open shows poster |
| PDF Large File Handling | `HomeCloudFileViewerScreen.tsx` | 8MiB ceiling enforced, polished too-large state + hand-off | Device: 30MB PDF |
| PDF Password/Corrupt States | `HomeCloudFileViewerScreen.tsx` | Dedicated states with honest copy + hand-off | Device: protected/corrupt PDF |
| Office Session Diagnostics | `HomeCloudFileViewerScreen.tsx` | Surface `office_timeout_app_ready`, `office_webview_error`, `office_session_failed` | Device: network failure |
| Office Title Escaping | `homecloudOfficeViewer.ts` | Verify `</script>` neutralization | Unit: XSS test |
| Office Bridge Protocol | `homecloudOfficeViewer.ts` | Versioned, typed, hostile-input-proof | Unit: protocol tests |
| File Viewer Motion (from S3) | `HomeCloudFileViewerScreen.tsx` | Scale-from-tile open/close | Device: file viewer motion |

**Deliverables**: Video poster working, PDF robust, Office diagnosable.

**Gate**: Device QA — video opens with poster instantly, PDF handles edge cases, Office fails honestly.

---

### Slice S6: Audio Waveform (Roadmap)

**Objective**: Implement real audio-derived waveform per freeze roadmap.

| Task | File | Change | Test |
|------|------|--------|------|
| Evaluate `useAudioSampleListener` | `MemoryAudioPage.tsx` | Live waveform during playback only | Device: waveform during play |
| Android `RECORD_AUDIO` permission | `app.config.js` / `MemoryAudioRecorder.tsx` | Add permission, handle denial | Device: Android permission |
| Fallback when sampling unavailable | `MemoryAudioPage.tsx` | Honest controls only, no fake waveform | Device: unsupported platform |
| Progressive waveform (cache) | `MemoryAudioPage.tsx` + backend? | Cache sampled waveform for future | **DECISION NEEDED** — backend derivative? |

**Gate**: Device QA — waveform shows real samples, no fake waveform ever, honest fallback.

---

### Slice S7: Performance Optimization (Evidence-Driven)

**Objective**: Optimize based on S0-S6 measurements. **No speculative optimizations.**

| Potential Optimization | Trigger | Measurement Required |
|------------------------|---------|---------------------|
| Bundle split (lazy tab) | S1 lazy mount | Bundle analyzer — HomeCloud chunk size |
| Component memoization | Profile shows render thrashing | `why-did-you-render` — render counts |
| `FlashList` migration | `FlatList` bottleneck proven | Profile: `FlatList` > 16ms/frame |
| Image preloading | Viewer open latency | Measure: preview→original gap |
| Query batching | Multiple rapid reads | Network tab: request count |
| Cache TTL tuning | Stale data / excess reads | Measure: cache hit rate |

**Rule**: Only implement if measurement proves >10% improvement on target metric.

---

### Slice S8: Regression & Freeze

**Objective**: Full validation, documentation sync, freeze declaration.

| Task | Criteria |
|------|----------|
| All deterministic test suites pass | `homecloud-files`, `homecloud-files-hierarchy`, `homecloud-files-stage2`, `homecloud-hc2a`, `homecloud-hc2b`, `homecloud-hc2c`, `homecloud-moa1/2/3`, `homecloud-office-viewer`, `selection-system` (fixed) |
| Device QA all gates pass | `02_UNIFIED_VISUAL_GEOMETRY_AUDIT.md` all surfaces, `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` all motions, `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` all popovers |
| Performance baselines met | All targets in `06_UNIFIED_PREMIUM_FREEZE_CANDIDATE.md` §5 |
| Functional debt acknowledged | All items in `05_UNIFIED_PERFORMANCE_FUNCTIONAL_GAPS.md` §3 documented |
| `git diff --check` clean | No whitespace errors |
| No uncommitted changes outside audit docs | `git status --short` = only audit docs |
| Documentation sync | All 7 audit docs reflect final state |

**FREEZE DECLARATION**: `UNIFIED_PREMIUM_FREEZE` tagged when all above ✅.

---

## 3. TEST STRATEGY PER SLICE

| Slice | Deterministic Tests | Device QA | Evidence Class |
|-------|---------------------|-----------|----------------|
| S0 | Unit: tokens, hooks, OverlayHost, ActionSheet popover, cache invalidation | Reduce motion, popover collision | DETERMINISTIC + DEVICE_VERIFY |
| S1 | Unit: lazy mount, focus re-read logic, popover migration | Tab switch, household switch, File popover | DETERMINISTIC + DEVICE_VERIFY |
| S2 | Unit: HC2-C Run A fixes, popover migration, cache invalidation | First entry, viewer exact open, Memories popovers | DETERMINISTIC + DEVICE_VERIFY |
| S3 | Unit: motion token usage, reduce motion gating | All transitions + reduce motion | DETERMINISTIC + DEVICE_VERIFY |
| S4 | Unit: popover positioning, collision, keyboard | All popovers on 360/390/430, notched, font scales | DETERMINISTIC + DEVICE_VERIFY |
| S5 | Unit: poster pipeline, PDF states, Office diagnostics | Video open, PDF edge cases, Office failure | DETERMINISTIC + DEVICE_VERIFY |
| S6 | Unit: sampling logic, permission handling | Android/iOS waveform, fallback | DEVICE_VERIFY |
| S7 | Profiling evidence | Profile comparison | MEASUREMENT |
| S8 | Full suite + device gates | Full device regression | ALL |

---

## 4. SHARED INFRA STOP GATES

| Gate | Required For | Resolution |
|------|--------------|------------|
| **OnlyOffice Server** | S5, S8 | Provision OnlyOffice instance (Docker compose in `infra/onlyoffice`) |
| **Android `RECORD_AUDIO`** | S6 | Add permission, test on Android device |
| **Physical iPhone (Expo Go)** | All device gates | Schedule device access |
| **Backend Preview Worker** | Video thumbnails (S5) | Deploy preview generation worker |
| **Migration Verified** | S8 | Run `homecloud-files-hierarchy-migration` on local Supabase |

---

## 5. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Reanimated 3 not Expo Go compatible | MEDIUM | HIGH — blocks shared element transitions | Fallback: scale animation without shared element |
| Popover collision on small phones | HIGH | MEDIUM | Extensive unit tests + device QA on 360pt |
| Reduce motion breaks native Modal | LOW | MEDIUM | Test `Modal animationType="slide"` with reduce motion |
| OnlyOffice server unavailable | MEDIUM | HIGH — Office viewer broken | Document hand-off as honest fallback |
| Video poster backend not ready | MEDIUM | MEDIUM | Defer to post-freeze; keep spinner honest |
| Bundle split breaks state preservation | LOW | HIGH | Test lazy mount thoroughly |
| Cache invalidation causes flash | LOW | MEDIUM | Test household switch rapidly |

---

## 6. ESTIMATED TIMELINE (Working Days)

| Phase | Slices | Days | Cumulative |
|-------|--------|------|------------|
| Foundation | S0 | 4 | 4 |
| Module Polish | S1, S2 | 5 | 9 |
| Motion & Popover | S3, S4 | 8 | 17 |
| Viewer & Office | S5 | 4 | 21 |
| Waveform (Roadmap) | S6 | 4 | 25 |
| Performance | S7 | 4 | 29 |
| Freeze | S8 | 3 | 32 |

**Total: ~32 working days (6-7 weeks)** from freeze confirmation to `UNIFIED_PREMIUM_FREEZE`.

---

## 7. DOCUMENTATION SYNC CHECKLIST (Per Slice)

Each slice must update:

- [ ] `01_UNIFIED_CURRENT_SCREEN_ATLAS.md` — if screens added/changed
- [ ] `02_UNIFIED_VISUAL_GEOMETRY_AUDIT.md` — if geometry changed
- [ ] `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` — if motions implemented
- [ ] `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` — if components/popovers changed
- [ ] `05_UNIFIED_PERFORMANCE_FUNCTIONAL_GAPS.md` — if debt resolved/new
- [ ] `06_UNIFIED_PREMIUM_FREEZE_CANDIDATE.md` — if freeze decisions change
- [ ] `07_UNIFIED_IMPLEMENTATION_ROADMAP_CANDIDATE.md` — if sequence changes

---

**End of Implementation Roadmap Candidate**

> **Next Step**: User confirms freeze candidate (S0-S8 sequence). Then S0 begins with `MOTION` tokens and `OverlayHost`.