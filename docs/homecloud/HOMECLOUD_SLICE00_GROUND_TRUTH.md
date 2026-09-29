# HomeCloud Slice 00 Ground Truth

Verified on 2026-09-29 in the local Windows development environment. No product feature, UI, migration, worktree, branch, or remote repository was changed. All pre-existing changes listed below were preserved.

## A. Canonical repository and worktree

**CANONICAL HOMECLOUD BASE**

- Repository owner: `C:/Users/thega/Desktop/HomePlus-worktrees/Family-Hub-Own-integration`
- Worktree: `C:/Users/thega/Desktop/HomePlus-worktrees/homecloud-current`
- Branch: `homecloud/v2-latest-base`
- Audited input HEAD: `87685ff592c4d726188abb51125b3cc6caf1c9d3`
- Git common directory: `C:/Users/thega/Desktop/HomePlus-worktrees/Family-Hub-Own-integration/.git`
- Preflight status: clean

This worktree is the verified superset. It contains 16 backend HomeCloud files, 39 frontend HomeCloud/Memory files, all 33 current `scripts/homecloud_*` probes, all 14 Memories V2 frontend units, the Memories V2 persistence migration, Expo 57 / React Native 0.86 / React 19.2, and a committed Android project. No other inspected HomeCloud worktree contains that complete set.

The separate `C:/Users/thega/Desktop/HomePlus` repository is not the canonical HomeCloud base. Its root is on `finance-v1-unified` at `f042721ef0f1968f24c3b3efffda412c719baf51`, uses `C:/Users/thega/Desktop/HomePlus/.git`, and had 10 pre-existing status entries.

## B. Branch and HEAD evidence

| Command from canonical worktree | Observed result |
|---|---|
| `git rev-parse --show-toplevel` | `C:/Users/thega/Desktop/HomePlus-worktrees/homecloud-current` |
| `git rev-parse --git-common-dir` | `C:/Users/thega/Desktop/HomePlus-worktrees/Family-Hub-Own-integration/.git` |
| `git branch --show-current` | `homecloud/v2-latest-base` |
| `git rev-parse HEAD` | `87685ff592c4d726188abb51125b3cc6caf1c9d3` |
| `git status --short` | clean before Slice 00 writes |

The final Slice 00 commit necessarily advances branch HEAD; the value above is the audited base input and is also recorded in the commit body.

## C. Repository ownership and common directories

Two repositories carry HomeCloud history:

| Repository | Common Git directory | Relationship |
|---|---|---|
| `Family-Hub-Own-integration` | `C:/Users/thega/Desktop/HomePlus-worktrees/Family-Hub-Own-integration/.git` | Owns the canonical worktree and newest HomeCloud superset. |
| `HomePlus` | `C:/Users/thega/Desktop/HomePlus/.git` | Owns the older HomeCloud worktrees and the non-HomeCloud product root. Porting between it and the canonical base is cross-repository work, not a merge within one repository. |

## D. Worktree inventory and preservation

### Canonical repository worktrees

| Worktree | Branch | HEAD | Pre-existing status entries |
|---|---|---|---:|
| `Family-Hub-Own-integration` | `gps-ux-recovery` | `20c5a340253c` | 38 (9 tracked deletions plus 29 untracked planning/audit files) |
| `C:/hcf` | detached | `87685ff592c4` | 0 |
| `C:/hp/integration-runtime` | detached | `b4513b75fda7` | 0 |
| `homecloud-current` | `homecloud/v2-latest-base` | `87685ff592c4` | 0 |
| `planner-migrations-final-sync` | `sync/planner-migrations-final` | `9a437c7e16eb` | 0 |

### Separate HomePlus repository worktrees

| Worktree | Branch | HEAD | Pre-existing status entries |
|---|---|---|---:|
| `C:/Users/thega/Desktop/HomePlus` | `finance-v1-unified` | `f042721ef0f1` | 10 |
| `C:/hcrt` | detached | `3876f297d363` | 18 |
| `events` | `planner-v1-11a-p1-attention-activity-research` | `c7834dd60966` | 0 |
| `homecloud-authority` | `homecloud/01d-authority-capabilities` | `987a44f8b5c3` | 1 (`docs/homecloud/` untracked) |
| `homecloud-db` | `homecloud/01c-albums-foundation` | `240cb3973657` | 1 (`docs/homecloud/` untracked) |
| `homecloud-file-intake` | `homecloud/02b-first-file-intake` | `977003f5b48b` | 0 |
| `homecloud-foundation-qa` | `homecloud/01g-foundation-closure` | `95966ffdf9b4` | 1 (`docs/homecloud/` untracked) |
| `homecloud-foundation-services` | `homecloud/01f-foundation-read-services` | `99003dde20a8` | 10 (route modification plus untracked service/test/docs files) |
| `homecloud-integration` | `homecloud/stage3-files` | `4509de4cb0ac` | 1 (`scripts/zz-seed-app-user.cjs` untracked) |
| `homecloud-migration-reconciliation` | `homecloud/02a1-global-migration-reconciliation` | `ba29be6bf3df` | 0 |
| `homecloud-storage` | `homecloud/01e-storage-foundation` | `d47bca7d1bb2` | 1 (`docs/homecloud/` untracked) |
| `homecloud-upload-engine` | `homecloud/02a-upload-engine-foundation` | `715ab7cfaf05` | 0 |
| `integration` | `planner-v1-11a-2c-attention-activity` | `fdff9c7b28a1` | 2 |
| `planner-domain-audit` | `planner-v1-domain-reconciliation-audit` | `7149f2745d15` | 0 |
| `planner-final` | `planner-v1-final-reconstruction` | `f093bffaa7a7` | 1 |
| `plans` | `planner-v1-11a-p1-trash-archive-research` | `56e72ffc8ac0` | 0 |
| `plans-reconciliation` | `planner-v1-plans-reconciliation` | `23bd798cd3b6` | 1 |
| `presets-drafts` | `planner-v1-frontend-presets-drafts` | `b524f6f7d996` | 0 |
| `qa` | `planner-v1-11a-p1-home-research` | `772f8da15022` | 11 |
| `reference-v1` | detached | `f093bffaa7a7` | 0 |
| `reliability` | `planner-v1-reliability` | `678e88ed1e0b` | 0 |
| `reliability-m11-7a` | `planner-v1-reliability-frontend` | `b8ecf8ff53c6` | 0 |
| `shared-reconciliation` | `planner-v1-shared-reconciliation` | `0e91879ccae2` | 0 |
| `C:/Users/thega/hpw/mvp-finance-planner` | `planner-a-medias-ultima-version` | `8c33ed8d8e4b` | 0 |
| `C:/Users/thega/hpw/planner` | `planner/pulido-final` | `41e858666f9d` | 41 |

No pre-existing status entry was edited, staged, deleted, reset, cleaned, or otherwise rewritten.

## E. Expo / React Native / React version matrix

| Worktree group | Expo | React Native | React | Android present |
|---|---|---|---|---|
| `homecloud-current` | `~57.0.25` | `0.86.3` | `19.2.3` | yes |
| `homecloud-integration` | `~57.0.24` | `0.86.3` | `19.2.3` | yes |
| `Family-Hub-Own-integration` | `^57.0.20` | `0.86.3` | `19.2.3` | yes |
| `homecloud-authority`, `homecloud-db`, `homecloud-file-intake`, `homecloud-foundation-qa`, `homecloud-foundation-services`, `homecloud-migration-reconciliation`, `homecloud-storage`, `homecloud-upload-engine` | `~54.0.35` | `0.81.5` | `19.1.0` | no |

The native/toolchain skew is material. Future work must use `homecloud-current`; porting its native code into an Expo 54 worktree is not an equivalent base.

## F. Relevant HomeCloud-file divergence

| Worktree | Backend HomeCloud files | Frontend HomeCloud/Memory files | `homecloud_*` scripts | UploadJob store SHA-256 prefix |
|---|---:|---:|---:|---|
| `homecloud-current` | 16 | 39 | 33 | `E27266B1A870` |
| `Family-Hub-Own-integration` | 15 | 20 | 21 | `FFE5EFADB6EE` |
| `homecloud-integration` | 15 | 20 | 21 | `227D50E15B11` |
| `homecloud-file-intake` | 13 | 13 | 16 | `B9D801A6E9CB` |
| `homecloud-migration-reconciliation` | 13 | 8 | 16 | `B9D801A6E9CB` |
| `homecloud-upload-engine` | 13 | 8 | 16 | `371336BA152D` |
| `homecloud-foundation-qa` | 10 | 4 | 11 | missing |
| `homecloud-foundation-services` | 10 | 4 | 11 | missing |
| `homecloud-storage` | 7 | 2 | 8 | missing |
| `homecloud-authority` | 4 | 2 | 4 | missing |
| `homecloud-db` | 0 | 0 | 0 | missing |

The UploadJob store has five distinct contents across six copies. Slice 00 names the canonical copy but intentionally does not merge or propagate it.

## G. Migration namespace map

Canonical file hashes are full-file SHA-256 comparisons. “Different” includes substantive historical content differences, not merely the filename.

| Logical migration | Canonical filename | Other filenames / worktrees | Namespace | Content | Applied-history risk | Recommended future action |
|---|---|---|---|---|---|---|
| canonical content | `20260910000000_homecloud_canonical_content_v1_1.sql` | `20260907000004_…` in authority/db/foundation/storage/upload-engine | `20260910` vs `20260907` | Same except `homecloud-db` is different | High: local history records both version ranges | Keep canonical file unchanged; audit every deployed migration ledger before any reconciliation migration. Never rename an applied file. |
| folders | `20260910000001_homecloud_folders_v1_1.sql` | `20260907000005_…` in older worktrees | `20260910` vs `20260907` | Same except `homecloud-db` is different | High | Same as above. |
| memory audio support | `20260910000002_homecloud_memory_audio_support_v1_1.sql` | `20260907000006_…` in older worktrees | `20260910` vs `20260907` | Different (`F326…` canonical; `CF14…` common older; `30D6…` db) | Critical | Treat as three historical variants; derive a forward-only repair only after deployed-state inspection. |
| albums | `20260910000003_homecloud_albums_v1_1.sql` | `20260907000007_…` in older worktrees | `20260910` vs `20260907` | Same except `homecloud-db` is different | High | Preserve history; reconcile forward after deployment audit. |
| storage foundation | `20260910000004_homecloud_storage_foundation_v1_1.sql` | `20260907000008_…` in foundation/storage/upload-engine; absent in earliest worktrees | `20260910` vs `20260907` | Different (`2442…` canonical, `ABB1…` common older, `127A…` storage) | Critical | Do not replay or rename. Verify bucket and policy state per environment, then use a new forward-only migration if required. |
| intake engine foundation | `20260910000005_homecloud_intake_engine_foundation_v1_1.sql` | `20260909000000_…` in upload-engine; absent in early worktrees | `20260910` vs `20260909` | Different (`2573…` vs `D174…`) | Critical | Preserve both histories; reconcile actual schema with a new migration only. |
| default HomeCloud permissions | `20260917000000_household_default_permissions_homecloud_v1.sql` | same filename in integration and parent repository | `20260917` | Canonical/parent `CDB1…`; integration `1796…` differs | High | Determine deployed variant before a forward repair. |
| Memories V2 persistence | `20260925000000_homecloud_memories_v2_persistence_v1.sql` | absent everywhere else | `20260925` | Canonical only | High for worktrees carrying Memories intake UI | Keep canonical authority; do not copy in Slice 00. Future ports must include schema and UI atomically. |

Local migration history contains both the `202609070000xx` and `202609100000xx` ranges. That proves filename reconciliation cannot safely be performed by renaming. No migration was applied, renamed, copied, or edited in this slice.

## H. Memories V2 persistence presence map

| Worktree | Memories frontend state | `20260925000000_homecloud_memories_v2_persistence_v1.sql` | Finding |
|---|---|---|---|
| `homecloud-current` | 14 V2 units including screen, cards, capture/review, timeline, semantic date, diagnostics | present | Complete canonical pairing. |
| `homecloud-integration` | four Memories intake units | absent | Inconsistent; do not execute as a standalone Memories base. |
| `Family-Hub-Own-integration` | four Memories intake units | absent | Inconsistent parent branch. |
| All Expo 54 HomeCloud worktrees | no V2 screen/capture set found | absent | No V2 persistence mismatch for their current frontend contents. |

The authority draft suggested propagating the migration, but the Slice 00 execution prompt explicitly prohibits copying or applying it. The inconsistency is documented only.

## I. Sharp runtime verification

- Package manager: npm (`package-lock.json` exists at root, backend, and frontend; backend dependency is in its own manifest/lockfile).
- Node requirement: root `engines.node >=24`; observed Node `v24.13.0`, npm `11.6.2`.
- Declaration: `backend/package.json` contains `"sharp": "^0.35.4"`.
- Locked/resolved version: `sharp@0.35.4`.
- Normal resolution: `backend/node_modules/sharp/dist/index.cjs`.
- External Codex-runtime fallback required: no. The legacy fallback remains in `backend/src/lib/sharp.js`, but normal `require('sharp')` succeeded first.
- Decode/resize smoke: generated a 2×2 JPEG in memory, decoded it, resized to 1×1, and encoded PNG; result was 90 bytes, format `png`, width 1, height 1.

No manifest or lockfile change was needed.

## J. HomeCloud test inventory and results

Freeze-document expectation: 33 files. Actual discovery: 33 files. Difference: 0. All commands ran from the canonical repository root after `npm exec tsc -- -p scripts/tsconfig.homecloud_4c1_test.json` succeeded.

| File | Command | Assertions pass/fail | Result |
|---|---|---:|---|
| `homecloud_1d_backend_enforcement_tests.js` | `node scripts/homecloud_1d_backend_enforcement_tests.js` | 46/0 | PASS |
| `homecloud_1d_capability_resolution_contract_tests.js` | `node scripts/homecloud_1d_capability_resolution_contract_tests.js` | 143/0 | PASS |
| `homecloud_1d_frontend_projection_tests.js` | `node scripts/homecloud_1d_frontend_projection_tests.js` | 57/0 | PASS |
| `homecloud_1d_new_household_capability_regression_tests.js` | `node scripts/homecloud_1d_new_household_capability_regression_tests.js` | 65/0 | PASS |
| `homecloud_1d_rls_bypass_tests.js` | `node scripts/homecloud_1d_rls_bypass_tests.js` | 20/0 | PASS |
| `homecloud_1e_path_adapter_tests.js` | `node scripts/homecloud_1e_path_adapter_tests.js` | 29/0 | PASS |
| `homecloud_1e_preview_optional_tests.js` | `node scripts/homecloud_1e_preview_optional_tests.js` | 9/0 | PASS |
| `homecloud_1e_signing_security_tests.js` | `node scripts/homecloud_1e_signing_security_tests.js` | 13/0 | PASS |
| `homecloud_1e_storage_rls_tests.js` | `node scripts/homecloud_1e_storage_rls_tests.js` | 10/0 | PASS |
| `homecloud_1f_dto_leak_tests.js` | `node scripts/homecloud_1f_dto_leak_tests.js` | 52/0 | PASS |
| `homecloud_1f_mixed_media_tests.js` | `node scripts/homecloud_1f_mixed_media_tests.js` | 43/0 | PASS |
| `homecloud_1f_security_tests.js` | `node scripts/homecloud_1f_security_tests.js` | 20/0 | PASS |
| `homecloud_2a_backend_structure_tests.js` | `node scripts/homecloud_2a_backend_structure_tests.js` | 36/0 | PASS |
| `homecloud_2a_intake_validation_tests.js` | `node scripts/homecloud_2a_intake_validation_tests.js` | 24/0 | PASS |
| `homecloud_2a_runtime_intake_tests.js` | `node scripts/homecloud_2a_runtime_intake_tests.js` | 29/0 | PASS |
| `homecloud_2a_upload_job_runtime_tests.ts` | `node scripts/compiled/scripts/homecloud_2a_upload_job_runtime_tests.js` | 45/0 | PASS |
| `homecloud_2a_upload_job_tests.js` | `node scripts/homecloud_2a_upload_job_tests.js` | 47/0 | PASS |
| `homecloud_2c_intake_validation_tests.js` | `node scripts/homecloud_2c_intake_validation_tests.js` | 9/0 | PASS |
| `homecloud_2c_memory_intake_tests.js` | `node scripts/homecloud_2c_memory_intake_tests.js` | 16/0 | PASS |
| `homecloud_2c_runtime_intake_tests.js` | `node scripts/homecloud_2c_runtime_intake_tests.js` | 13/0 | PASS |
| `homecloud_3a_3d_acceptance_tests.js` | `node scripts/homecloud_3a_3d_acceptance_tests.js` | 74/0 | PASS |
| `homecloud_3e_scanner_tests.ts` | `node scripts/compiled/scripts/homecloud_3e_scanner_tests.js` | 38/0 | PASS |
| `homecloud_4a2_schema_tests.js` | `node scripts/homecloud_4a2_schema_tests.js` | 41/0 | PASS |
| `homecloud_4a2_written_runtime_tests.js` | `node scripts/homecloud_4a2_written_runtime_tests.js` | 47/0 | PASS |
| `homecloud_4a2_written_validation_tests.js` | `node scripts/homecloud_4a2_written_validation_tests.js` | 46/0 | PASS |
| `homecloud_4b1_memories_read_model_tests.js` | `node scripts/homecloud_4b1_memories_read_model_tests.js` | 67/0 | PASS |
| `homecloud_4b1_preview_tests.js` | `node scripts/homecloud_4b1_preview_tests.js` | 58/0 | PASS |
| `homecloud_4b2_memories_timeline_tests.ts` | `node scripts/compiled/scripts/homecloud_4b2_memories_timeline_tests.js` | 52/0 | PASS |
| `homecloud_4c1_1_memory_create_recovery_tests.ts` | `node scripts/compiled/scripts/homecloud_4c1_1_memory_create_recovery_tests.js` | 40/0 | PASS |
| `homecloud_4c1_memory_create_tests.ts` | `node scripts/compiled/scripts/homecloud_4c1_memory_create_tests.js` | 46/0 | PASS |
| `homecloud_stage_a_memory_creation_tests.js` | `node scripts/homecloud_stage_a_memory_creation_tests.js` | 67/0 | PASS |
| `homecloud_stage_a1_capture_recovery_tests.js` | `node scripts/homecloud_stage_a1_capture_recovery_tests.js` | 63/0 | PASS |
| `homecloud_upload_recovery_tests.ts` | `node scripts/compiled/scripts/homecloud_upload_recovery_tests.js` | 33/0 | PASS |

Totals: **33 discovered, 33 executed, 33 passed, 0 failed; 1,398 assertions passed, 0 failed.**

## K. Runtime probes

Both probes targeted only `http://127.0.0.1:56221` and used isolated disposable Auth, person, household, membership, content, and Storage identifiers.

### Files pagination

- Seeded 101 active files in one disposable household.
- Default server request returned 100 files and `nextOffset: 100`.
- An explicit second request with `offset=100` returned 1 file and `nextOffset: null`.
- The oldest/item-101 sentinel was absent from the default page and present on the second page.
- Current client request observed from `fetchFilesBrowser`: `sort=recent`; its options type and URL contain no `limit` or `offset`.
- `HomeCloudFilesScreen.load()` performs one request, replaces `files`, and does not consume `nextOffset` or issue a load-more request.
- Exact current behavior: item #101 is unreachable in the app even though the server exposes the correct continuation offset.

### 60 MiB upload

- Disposable artifact: 62,914,560 bytes.
- Register: succeeded.
- Upload authorization: succeeded.
- PUT: failed before verify/finalize. HTTP response status was 400, with Storage JSON `{ "statusCode": "413", "error": "Payload too large", "message": "The object exceeded the maximum allowed size" }`.
- Current engine error: `upload transport failed: 400` because it reports the outer HTTP status and discards the Storage body.
- Production UI message: `No pudimos guardar el archivo`.
- Development-only detail: `Detalle tecnico: upload transport failed: 400`.
- `homecloud-originals.file_size_limit`: 52,428,800 bytes; local global Storage config: `50MiB`. Both limits are equal, so the probe proves a Storage size-limit rejection but cannot distinguish the enforcing layer without changing a limit, which Slice 00 prohibits. It is not a transport outage.
- The probe did not create an UploadJob or app staging artifact. It removed the failed Storage path, all 102 QA content rows, membership, household, person, Auth user, and the temporary 60 MiB file. The first cleanup pass exposed the active-household/person FK cycle; a second local-only pass cleared it. Final verification found zero disposable person/household/content rows, zero Storage objects, and no artifact file.

## L. Migration-uniqueness probe

- Real official set before probe: 111 SQL files; aggregate name/content digest `B15418ABF8501DB6B92A91FADCCC9979C4643D90043F608C4E56525CD8113250`.
- Synthetic fixture: a temporary second `20260925000000_*.sql` file.
- Expected: guard reports one duplicate and exits 1.
- Observed: `MIGRATION_UNIQUENESS_GUARD=FAIL`, one duplicate at version `20260925000000`, exit 1.
- After removal: guard passed with 111 unique versions; aggregate digest matched the before value exactly; `git status --short -- supabase/migrations` was empty.

## M. Compiled artifacts, typecheck/lint, blockers, and findings

### `scripts/compiled/**`

- Tracked: no (`git ls-files scripts/compiled/**` returned nothing).
- Generated: yes, by `npm exec tsc -- -p scripts/tsconfig.test.json` and focused TypeScript configs with `outDir: ./compiled`.
- Ignored: yes (`/scripts/compiled/` in `.gitignore`).
- Source available: yes, in TypeScript test and frontend source files.
- Consumer: yes. `tests/run.js` directly executes six compiled HomeCloud outputs and many non-HomeCloud compiled outputs.
- Decision: **KEEP**. There are no tracked copies to delete, and the live test runner depends on generated copies being present after compilation. Slice 12 may only remove the directory as a runtime convention after changing consumers to compile into a disposable location or execute source directly.

### Typecheck and lint

| CWD | Command | Result |
|---|---|---|
| repository root | `npm run typecheck` | FAIL: frontend TypeScript passed; test TypeScript failed with five errors, all in `scripts/planner_v1_navigation_tests.ts` (lines 217, 218, 219, 387, 393). |
| repository root | `npm run lint` | FAIL after backend phase: backend/test syntax passed (290 JS files); backend ESLint found 11 errors in Finance/Planner services. Runner stopped before frontend lint. |
| `front/mi-front-limpio` | `npm run lint` | FAIL: 3 errors and 53 warnings, all in existing family/finance/planner/UI files; no HomeCloud file reported. |
| repository root | `npm exec tsc -- -p scripts/tsconfig.homecloud_4c1_test.json` | PASS. |

These failures existed before the two documentation-only Slice 00 changes and occur exclusively outside the changed paths. They were not fixed in Slice 00.

### Findings and blockers

1. Canonical base is verified and clean at the audited input HEAD.
2. Migration namespace divergence is real and carries applied-history risk; never rename applied migration files.
3. Memories intake code exists without its V2 persistence migration in two noncanonical Expo 57 worktrees.
4. `sharp@0.35.4` is a real repository dependency and works without the Codex fallback.
5. Files item #101 is server-addressable but unreachable through the current client flow.
6. A 60 MiB upload reaches Storage and is rejected by the current 50 MiB limit; the UI hides the actionable reason in production.
7. Static repository quality is not globally green because of unrelated Planner/Finance failures recorded above. This blocks claiming an entirely green repository but does not invalidate the 33/33 HomeCloud result.
8. Pre-existing changes across both repositories require continued preservation during future consolidation.

## Slice 00 exit assessment

The Slice 00-specific evidence gates pass: base and ownership are proven; migrations and Memories persistence are mapped; sharp is declared and verified; all 33 HomeCloud probes pass; the provenance registry exists; both runtime defects are measured locally; compiled-artifact handling is evidence-based; the uniqueness guard fires and restores cleanly; typecheck/lint results and unrelated failures are recorded; and no migration, feature, UI, worktree, branch, remote, or pre-existing user change was modified.
