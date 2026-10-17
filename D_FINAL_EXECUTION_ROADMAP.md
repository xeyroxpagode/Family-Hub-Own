# D. FINAL EXECUTION ROADMAP

## 0. PRINCIPLES
- **Viewer P0 first** — no visual polish until PDF inline is `PASS_DEVICE`
- **Small, verifiable slices** — each slice has device acceptance criteria
- **No speculative claims** — `PASS_DEVICE` requires human observation on physical iPhone
- **Preserve Expo Go compatibility** — no native deps, no dev-build-only features
- **Read-only audit** — this roadmap describes work; implementation happens in subsequent lote

---

## 1. VIEWER CLOSURE (P0 — BLOCKING)

### 1.1 Phase 0: Preflight (0.5 days)
| Task | Owner | Acceptance |
|---|---|---|
| Confirm Expo Go build boots on iPhone | Human | `npx expo start -c --go` → no red screen (G1) |
| Prepare test corpus | Human | 5 PDFs: 1MB (1p), 5MB (10p), 12MB (20p), password-protected, corrupt |
| Verify Scanner still works | Human | G2 `PASS_DEVICE` |

### 1.2 Phase 1: PDF Inline Validation (2–3 days)
| Slice | Test | Acceptance Criteria | STOP Gate |
|---|---|---|---|
| **V-A** | Open 1MB PDF | First page centered, fit-to-width, no white flash, pager "1 / N" | `FAIL_DEVICE` if blank/clipped/white |
| **V-B** | Open 5MB 10-page PDF | Lazy render (±1), smooth scroll, double-tap 2× crisp re-render | `FAIL_DEVICE` if OOM/jank/crash |
| **V-C** | Open 12MB PDF | "Too large" state + working hand-off; **no transfer attempted** | `FAIL_DEVICE` if transfer starts/app dies |
| **V-D** | Open password PDF | "Protegido" state + hand-off | `FAIL_DEVICE` if generic error/blank |
| **V-E** | Open corrupt PDF | Honest failure + hand-off, no stack trace | `FAIL_DEVICE` if white screen/exception |
| **V-F** | Close mid-load → reopen different | No stale content (WebView `key` per session) | `FAIL_DEVICE` if previous pixels visible |
| **V-G** | Android hardware back | Closes Viewer only, browser context exact | `FAIL_DEVICE` if leaves HomeCloud |
| **V-H** | Tap document link | `LINK_PRESSED` → `Linking.openURL` (http/https only) | `FAIL_DEVICE` if viewer navigates internally |

**Exit Criteria:** All V-A through V-H = `PASS_DEVICE`

### 1.3 Phase 2: Media Regression (1 day)
| Slice | Test | Acceptance |
|---|---|---|
| **V1–V2** | JPG / PNG | Sharp, oriented, no distortion |
| **V3–V4** | MOV / MP4 | `expo-video` plays, native controls, header visible |
| **V5** | MP3 / M4A | `expo-audio` plays, play/pause, error → hand-off |
| **V17** | Unsupported codec video | Decode failure → inline "Abrir o compartir con…" (no auto-jump) |

### 1.4 Phase 3: Text Family (0.5 days)
| Slice | Test | Acceptance |
|---|---|---|
| **V10** | TXT (long) | Long-press → native select → copy |
| **V11** | Markdown | Selectable, copyable |
| **V12** | CSV | Selectable, copyable |

### 1.5 Phase 4: Office Handoff (0.5 days)
| Slice | Test | Acceptance |
|---|---|---|
| **V13** | DOCX | Unsupported state + hand-off works (staged → share) |
| **V14** | XLSX | Same |
| **V15** | PPTX | Same |

### 1.6 Phase 5: Edge Cases (0.5 days)
| Slice | Test | Acceptance |
|---|---|---|
| **V16** | Unknown binary | Honest reason + hand-off |
| **V18** | Android back (if tested on Android) | Closes Viewer |
| **V19** | Notched device | Header not under status bar, close reachable |
| **V20** | Close Viewer → browser context | Same folder, query, sort, scroll |
| **V21** | Airplane mode + cached file | Specific failure, never blank/stack trace |

### 1.7 Phase 6: Expo Go Acceptance (0.5 days)
| Slice | Test | Acceptance |
|---|---|---|
| **G1** | Boot in Expo Go | No red screen |
| **G2** | Scanner/camera | Usable |
| **G3** | Normal PDF inline | First page centered, crisp |
| **G4** | Multi-page scroll | Pager follows |
| **G5** | Pinch zoom / double-tap | Works, fit correct |
| **G6** | Close → Files state | Correct |
| **G7** | Reopen PDF | No stale content |
| **G8** | Corrupt/oversized | Polished fallback + working share |
| **G9** | No white screen ever | No raw WebView error surface |
| **G10** | No native module errors | No `react-native-pdf`/`blob-util` errors |

### 1.8 Phase 7: Household Isolation (1 day, needs 2 devices)
| Slice | Test | Acceptance |
|---|---|---|
| **H1** | Household A → B file | Cannot open by any route |
| **H2** | Favorites isolation | A's favorites never in B's list |
| **H3** | Airplane mode PDF | Still previews (staged) |
| **H4** | Rename on device 1 → device 2 refresh | Reflected |

---

## 2. REMAINING FUNCTIONAL CLOSURE (P1)

### 2.1 Selection Bar Visibility (0.5 days)
| Task | Acceptance |
|---|---|
| Verify `FileSelectionBar` not obscured by global BottomNav | Bar fully visible, all touch targets reachable |
| If obscured: add `paddingBottom: floatingNavigationMetrics.mainRegularHeight + ...` | Same formula as Scanner (`bottomNavOverlayPadding`) |

### 2.2 Scanner Editor Viewport (0.5 days)
| Task | Acceptance |
|---|---|
| Audit `ScannerImageEditorScreen` canvas sizing on device | Canvas fills available space, handles reachable at 44dp |
| Verify perspective WebView job completes | No timeout, output dimensions correct |

### 2.3 Scanner Page Reorder (1 day — if V1 scope)
| Task | Acceptance |
|---|---|
| Add drag-to-reorder in review phase thumb list | Thumb drag reorders `pages` array, PDF generation respects new order |
| Accessibility: announce move actions | `accessibilityActions` for reorder |

### 2.4 Refresh Accessibility Hint (0.25 days)
| Task | Acceptance |
|---|---|
| Add "Actualizar archivos" hint to filter icon `accessibilityLabel` | Screen reader announces refresh availability |

### 2.5 Selection Scope Documentation (0.25 days)
| Task | Acceptance |
|---|---|
| Empty state shows "La selección se reinicia al cambiar de carpeta/búsqueda/orden" | Text visible when selection would be cleared |

---

## 3. FILES UX / MOTION POLISH (P2)

### 3.1 Motion Tokens Definition (0.5 days)
| Task | Acceptance |
|---|---|
| Add `motion` namespace to `constants/theme.ts` | Tokens: `fast` (150ms), `normal` (200ms), `slow` (300ms), easings |
| Add `useReducedMotion` hook | Reads `AccessibilityInfo.isReduceMotionEnabled()` |

### 3.2 Motion Implementation (2 days)
| Motion | Component | Duration | Reduced-Motion |
|---|---|---|---|
| Viewer enter fade | `viewerLayer` mount | 150ms | Instant |
| Viewer exit fade | `viewerLayer` unmount | 100ms | Instant |
| Selection bar slide-up | `FileSelectionBar` mount | 200ms | Instant |
| Favorite heart pulse | `FileTile` heart badge | 150ms spring | Instant color |
| Upload progress smooth | `HomeCloudUploadActivity` | Per event | Static steps |
| Folder enter/exit cross-fade | `HomeCloudFilesScreen` folder change | 200ms | Instant |
| Empty state cross-fade | `ListEmptyComponent` | 200ms | Instant |
| Drag selection edge hint | `autoScrollStep` | Continuous | Disabled |

### 3.3 Visual Consistency (1 day)
| Task | Acceptance |
|---|---|
| Verify all touch targets ≥ 44dp | `touchTargets.normal` used throughout |
| Verify color contrast (WCAG AA) | `colors.text.*` on `colors.background.*` / `colors.surface.*` |
| Verify Dark/Light/System themes | All screens render correctly in all three |

---

## 4. CROSS-MODULE INTEGRATION (P1)

### 4.1 Memories Alignment (Parallel — Memories workstream)
| Task | Owner | Acceptance |
|---|---|---|
| Memories empty state refreshable | Memories | `ListEmptyComponent` + `RefreshControl` works |
| Memories safe area insets | Memories | Header/content respect notch/home indicator |
| Memories visible refresh icon removed | Memories | Only accessibility action on list |
| Capabilities notice parity | Both | Same component, same rendering |

### 4.2 Integration Merge (1 day)
| Task | Acceptance |
|---|---|
| Merge `homecloud/files-lane` + `homecloud/memories-lane` → `homecloud/v1-integration` | No conflicts in `constants/theme.ts`, `components/ui/`, `services/homecloud/` shared |
| Run both test suites | `homecloud-files-ux` 158/158 + `homecloud-memories-ux` all PASS |
| Visual regression: Files vs Memories headers | Side-by-side match on tokens, spacing, icon sizes |
| Upload progress cross-attribution test | Files job → Files progress only; Memories job → Memories only |

---

## 5. FINAL QA (P0)

### 5.1 Full Device QA Matrix (3 days)
| Category | Rows | Source |
|---|---|---|
| Favorites | F1–F9 | `HOMECLOUD_FILES_STAGE2_DEVICE_QA.md` |
| Selection | S1–S16 | Same |
| Refresh | R1–R7 | Same |
| Pagination | P1–P8 | Same |
| Viewer | V1–V21 | Same (now including V-A–V-H) |
| Expo Go | G1–G10 | Same |
| Household Isolation | H1–H4 | Same |

**Total: 71 rows** — all must be `PASS_DEVICE` with human observation notes.

### 5.2 Regression Suites (Automated)
| Suite | Target | Gate |
|---|---|---|
| `homecloud-files-ux` | 158 tests | 158/158 PASS |
| `slice1-selection-bulk` | 178 tests | 178/178 PASS |
| `favorites` | 100 tests | 100/100 PASS |
| `favorites-ui` | 157 tests | 157/157 PASS |
| `freshness` | 100 tests | 100/100 PASS |
| `hierarchy-ui` | 129 tests | 129/129 PASS |
| `homecloud-files-viewer` | 300 tests | 300/300 PASS |
| TypeScript | `tsc --noEmit` | Clean |
| Expo export | `npx expo export` | Bundles for iOS/Android/Web |
| Expo doctor | `npx expo-doctor` | No new findings |

---

## 6. FILES PRODUCT FREEZE

### 6.1 Freeze Criteria (ALL REQUIRED)
- [ ] Viewer Phases 1–7 **all `PASS_DEVICE`**
- [ ] Functional P1 items **complete**
- [ ] Motion P2 items **complete**
- [ ] Cross-module integration **merged + green**
- [ ] Final QA matrix **71/71 `PASS_DEVICE`**
- [ ] All regression suites **green**
- [ ] TypeScript clean, Expo export clean, Expo doctor clean

### 6.2 Freeze Artifacts
| Artifact | Location |
|---|---|
| Final Product Truth | `docs/homecloud/HOMECLOUD_PRODUCT_EXPERIENCE_FREEZE_V1_3.md` (amended) |
| UX/UI Freeze | `docs/homecloud/HOMECLOUD_FILES_UX_UI_FREEZE_V1.md` (amended) |
| Device QA Evidence | `docs/homecloud/HOMECLOUD_FILES_STAGE2_DEVICE_QA.md` (all rows filled) |
| Execution Log | `docs/homecloud/HOMECLOUD_FILES_STAGE2_EXECUTION_LOG.md` (appended) |

### 6.3 HomeCloud Merge Readiness
| Check | Status |
|---|---|
| `homecloud/v1-integration` branch exists | ✅ (from STAGE_3_HANDOFF) |
| Android native build verified | ⏳ (STAGE_3_HANDOFF: blocked) |
| FILE/IMAGE/VIDEO upload on Android | ⏳ (pending native build) |
| Restart/resume persisted jobs | ⏳ (pending native build) |
| Scanner/audio/batch intake on Android | ⏳ (pending native build) |

**Note:** Android native acceptance is **outside Files V1 freeze** but required for HomeCloud V1 merge. Files lane can freeze while Android workstream completes.

---

## 7. TIMELINE SUMMARY

| Week | Focus | Deliverable |
|---|---|---|
| **Week 1** | Viewer Closure (Phases 0–7) | All V-A–V-H, V1–V21, G1–G10, H1–H4 = `PASS_DEVICE` |
| **Week 2** | Functional P1 + Motion P2 | Selection bar, Scanner viewport, Motion tokens, 8 motions |
| **Week 3** | Cross-module + Final QA | Memories alignment, Merge, 71-row matrix, Regressions |
| **Week 4** | Freeze + Documentation | Product Freeze artifacts, HomeCloud merge prep |

**Total: ~4 weeks** (assuming 1 human tester on physical iPhone, Memories workstream parallel)

---

## 8. DEPENDENCY GRAPH

```
Viewer P0 (Phase 0-7)
    │
    ├─→ Functional P1 (Selection bar, Scanner viewport)
    │
    ├─→ Motion P2 (tokens → 8 motions)
    │
    └─→ Cross-module (Memories alignment parallel)
            │
            └─→ Integration Merge
                    │
                    └─→ Final QA (71 rows)
                            │
                            └─→ FILES PRODUCT FREEZE
                                    │
                                    └─→ HomeCloud Merge (Android track separate)
```

**Critical Path:** Viewer P0 → Final QA → Freeze. Everything else can overlap.

---

## 9. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PDF Viewer OOM on 2 GiB iPhone | Medium | P0 block | 8 MiB ceiling already conservative; lazy render + canvas release |
| pdf.js glyph substitution breaks legibility | High (known) | P2 (acceptable) | Documented tradeoff; V1 ships with substitution |
| Expo Go WebView differs from dev build | Low | P0 block | Pinned `react-native-webview@13.16.1` = Expo Go SDK 57 native |
| Scanner perspective WebView fails on device | Medium | P1 | Already tested in automated suite (V-L6); device validation needed |
| Android native build remains blocked | High (per STAGE_3_HANDOFF) | HomeCloud merge | Files freezes independently; Android track unblocked separately |
| Memories workstream delays alignment | Medium | Integration | Files aligns to Memories; Memories can adopt Files patterns post-freeze |

---

## 10. VERDICT

**Current State:** `FILES FINAL AUDIT INCOMPLETE — EVIDENCE REQUIRED`

**Reason:** All Viewer P0 slices (V-A through V-H, V1–V21, G1–G10, H1–H4) are `UNPROVEN_DEVICE`. Implementation exists and passes automated suites (300/300), but **physical device evidence is absent**.

**Next Step:** Execute Phase 0 (Preflight) → Phase 1 (PDF Inline Validation) on physical iPhone in Expo Go. **No code changes required** — the implementation is complete and correct by architecture.

**Do not declare `FILES V1 CLOSED`.** The next implementation lote must address Viewer P0 device validation before any optional visual polish.