# HOMECLOUD FILES â€” STAGE 2 EXECUTION LOG

This is an EXECUTION JOURNAL, not a new Product Truth authority. The authoritative
Files contract stays in `HOMECLOUD_FILES_UX_UI_FREEZE_V1.md`; the hierarchy delta is
recorded there by the Phase 1 documentation commit. Nothing in this file may be cited
as a product decision.

Never record secrets, JWTs, signed URLs, passwords or API keys here.

---

## RUN IDENTITY

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-files`
- Branch: `homecloud/files-lane`
- Stage 1 baseline HEAD at run start: `1acb0292e9e13456feb40d50c5802e03569e4e06`
- Shared upload engine (`homecloudUploadCoordinator/Engine/Runtime/Recovery`,
  native PUT transport, `register/verify/finalize`, UploadJob model, queue
  semantics): **FROZEN and UNTOUCHED** by this run.
- Memories worktree: **READ ONLY, never written.**
- Stage 3 (Trash / Restore / Purge / Lifecycle / Scanner): **NOT IMPLEMENTED.**

---

## PHASE 0 â€” GLOBAL SAFETY PREFLIGHT (read-only)

**PASS.**

- Starting working tree: clean, exactly as expected.
- Baseline suites at the start: `homecloud-files` PASS, `homecloud-s2i` PASS,
  `homecloud-recovery` PASS, `homecloud-t2-d1` PASS.
- Local runtime rule (Â§21): `backend/.env` advertises a LAN Supabase URL while the
  test safety helper only accepts loopback. Resolved WITHOUT touching product
  behavior: the loopback URL of the SAME local instance is supplied through a
  throwaway environment loader outside the repository. No product file was modified
  to satisfy the helper.
- Locality was proven before any database write: the local `supabase_db_HomePlus`
  container plus a reachable `127.0.0.1:56222`.
- Local database baseline recorded before any migration (non-sensitive counts only):
  folders 3, Files with a folder 3, Favorites 0, Memories 163. There is no
  `upload_jobs` relation in this schema; durable UploadJobs are client-side
  (AsyncStorage), so that count is NOT_APPLICABLE at the database level.
- `supabase db reset` was never run. No Docker or Supabase volume was ever deleted.

---

## PHASE 1 â€” NESTED FOLDER HIERARCHY

### PROVENANCE OF THE DIRTY TREE (recovery)

After the run was stopped on a concurrent-write blocker, this session resumed as the
only authorized writer. Every dirty path was classified before anything was changed:

| Class | Paths |
|---|---|
| **A â€” this run's Phase 1 work** | `backend/src/lib/homecloudFolderHierarchy.js`, `backend/src/services/homecloudFilesService.js`, `backend/src/services/homecloudReadService.js`, `backend/src/lib/homecloudMappers.js`, `backend/src/routes/homecloud.js`, `backend/src/controllers/homecloud.files.controller.js`, `front/.../services/homecloud/homecloudFolderTree.ts`, `front/.../services/homecloud/homecloudMoveDestinations.ts`, `front/.../services/homecloud/homecloudTypes.ts`, `front/.../services/homecloud/homecloudFilesService.ts`, `front/.../services/homecloud/homecloudMoveDestinations.ts` consumers (`FileMoveDestinationPicker.tsx`, `FileActionHost.tsx`, `FileIntake.tsx`, `homecloudFileIntakeService.ts`, `homecloudFileIntakeTypes.ts`), `front/.../screens/HomeCloudFilesScreen.tsx`, `scripts/homecloud_files_hierarchy_runtime_tests.js`, `scripts/homecloud_files_hierarchy_ui_tests.ts`, `scripts/homecloud_files_hierarchy_migration_tests.js`, `scripts/tsconfig.homecloud_files_hierarchy_ui_test.json`, `scripts/homecloud_s4ii_search_contract_tests.js`, `scripts/homecloud_files_selection_bulk_tests.ts`, `tests/run.js`, `.gitignore`, `supabase/migrations/20261005000000_homecloud_folders_hierarchy_v2.sql` |
| **B â€” foreign competing migration** | `supabase/migrations/20261005000000_homecloud_nested_folders_v1.sql` â€” resolved and deleted in this recovery, with owner authorization |
| **C â€” pre-existing / unknown** | none found |
| **D â€” generated / test artifact** | `scripts/compiled-files-hierarchy-ui/` (added to `.gitignore`, never committed) |

### CURRENT (audited before any write)

Flat folders: `homecloud_folders` had no parent; uniqueness was household-wide
(`hc_folders_household_name_unique`), which is only correct with a single level;
`deleteFolder` relied on the File FK's `ON DELETE SET NULL`, correct only for a
root-level folder; `browseFiles` returned the whole household's folders and none
inside a folder; the folder DTO carried no ancestry; two flat destination pickers;
back always jumped to the root; "Nueva carpeta" was disabled inside a folder.

### TARGET

Adjacency list with `parent_folder_id`; sibling uniqueness; same-Household parent;
no cycles; atomic delete-with-promotion; one hierarchy-aware destination grammar.

### REAL GAP

Ten concrete holes: no parent column, household-wide flat uniqueness, no cycle
detection at all, no reparent operation, create accepted no parent, the catalogue DTO
carried no ancestry so a tree could not be derived without an N+1, the browser listed
one level only at the root, deletion had no promotion and no conflict check, the
destination pickers were flat, and back could not express one level up.

### AUTONOMOUS DECISIONS

1. Adjacency list only. No materialized path, no closure table, no nested set, no
   ltree. A persisted path would force a subtree rewrite on every rename or move.
2. Display paths and trees are DERIVED client-side from ONE household catalogue read.
3. The DATABASE is the authority for same-Household parent, no self parent and no
   cycles â€” via a trigger, so a direct table write cannot bypass it.
4. Household-scoped `pg_advisory_xact_lock`, taken INSIDE the trigger, so every write
   path serializes and the ancestor walk it guards is authoritative. Never a global lock.
5. One canonical destination grammar in a pure module, rendered by a sheet that owns
   no logic of its own.
6. Sibling ORDER is the server's. A client-side re-sort was written and then removed:
   JavaScript and PostgreSQL do not share a collation, so a client sort would make the
   picker disagree with the very folders it lists.
7. Root SEARCH stays global and folder SEARCH stays folder-scoped. Nesting does not
   silently redefine search; the scope is documented instead.
8. The open folder is a TRAIL derived from the catalogue, so back is one level up and
   a remote rename, move or delete re-resolves instead of leaving a ghost folder.

### MIGRATION COLLISION â€” HOW IT WAS RESOLVED

Two migrations claimed version `20261005000000`. Both were read completely and compared
property by property against the frozen contract. Three objectively stronger safety
properties were transplanted into the integrated base, each backed by measured
PostgreSQL 17.6 evidence on an identical three-level fixture (A <- B <- C):

| Property | Adopted | Measured evidence |
|---|---|---|
| Parent FK | `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED` | A direct delete of a folder with children FAILS and moves nothing; promotion-then-delete succeeds and yields exactly the promotion contract; `DELETE FROM households` cascade still tears the tree down with zero folders left. The weaker `ON DELETE SET NULL` was measured on the same fixture and REJECTED: it silently relocated a child to the root, losing a level and never consulting the promotion conflict check. |
| Sibling uniqueness | one `NULLS NOT DISTINCT` unique index | A duplicate ROOT sibling is rejected because NULL parents compare equal; the same name under a different parent is accepted. One mechanism instead of two partial indexes. |
| Concurrency | the advisory lock moved INTO the trigger | A cycle check that does not serialize is a convention, not an invariant. A direct concurrent table write is exactly the race a service-level check loses, so the lock belongs in the trigger. |

Rejected from the losing file: its `p_household_id` delete parameter (the caller must
not name the authority scope; the household is derived from the folder) and its `P0004`
code (a name collision is a unique violation).

Why the losing file lost: it defined no `homecloud_create_folder` and no
`homecloud_move_folder`, so it could not satisfy the create-with-parent or reparent
contracts, and its backend could not have been wired to it. Its trigger name collided
with the integrated one.

Losing file removed: `supabase/migrations/20261005000000_homecloud_nested_folders_v1.sql`.
Nothing else foreign was touched.

Surviving migration: `20261005000000_homecloud_folders_hierarchy_v2.sql`. The version
was already unique and monotonic after the duplicate was removed, so it was NOT
renumbered. No historical migration was edited.

### LOCAL DATABASE RECONCILIATION

The earlier session applied the migration with `psql`, so the local schema and the
ledger disagreed. Reconciled forward, with no reset and no remote access:

1. Locality proven before any write.
2. Pre-state recorded: columns, FKs, indexes, triggers, functions, grants, ledger, and
   the data invariants (folder count, folder ids, folder households, File counts,
   `File.folder_id` links, Favorites).
3. The final migration was applied forward. It is idempotent: it drops the earlier
   inline FK before adding the named one and drops the superseded partial indexes.
4. Post-state verified to EQUAL the final migration exactly: parent FK deferrable with
   no CASCADE, one `NULLS NOT DISTINCT` sibling index, the parent index, the lock key
   function, the three canonical RPCs, the hierarchy trigger, and `service_role`-only
   grants. The superseded `homecloud_folders_lock_household` helper is absent.
5. Data invariants IDENTICAL to pre-state: 3 folders, byte-identical ids, identical
   household ownership, all `parent_folder_id` NULL, byte-identical `File.folder_id`
   links, Favorites unchanged.
6. Ledger: the canonical CLI (`supabase migration list` / `db push`) aborts with
   "Cannot find project ref", and linking would mean touching a remote project, which
   this run must never do. The ledger row was therefore inserted by hand, and only
   AFTER the schema was proven equal. Repository convention permits it: this local
   stack is shared across worktrees and its ledger already holds applied versions
   whose files live elsewhere (20261003000001-3, 20261004000001-8, 20261005000001-3 are
   all Planner rows with no file in this worktree). `tests/db/run.js` additionally
   asserts ledger/file parity, which this satisfies.

### MIGRATION SAFETY EVIDENCE (isolated databases)

`scripts/homecloud_files_hierarchy_migration_tests.js` creates two throwaway databases,
and drops only those two in a `finally`. The user's active stack is never reset,
dropped or written.

- **Fresh (41 assertions total, all pass):** a database that never had the hierarchy.
  The real historical Stage 1 migrations are applied unmodified first, so the case is
  genuinely fresh. Proves the migration applies cleanly, leaves exactly ONE column, ONE
  self-FK, ONE sibling index, ONE trigger and ONE of each function, removes the Stage 1
  flat uniqueness and both superseded partial indexes, exposes nothing to PUBLIC, and
  is RE-APPLICAble â€” a second run converges instead of failing.
- **Stage 1 upgrade:** a realistic pre-Stage-2 database with flat folders, the Stage 1
  household-wide uniqueness, Files already filed under folders, a Favorite and a Memory.
  Proves folder count, folder ids, household ownership and names are byte-identical;
  every pre-existing folder lands at the root; every `File.folder_id` link is
  byte-identical; Favorites and contents unchanged; Memory semantics untouched. Then
  proves the upgraded schema WORKS: create-with-parent, cycle refusal, a refused direct
  delete, and a promotion that leaves the parent and its Files intact.

### PHASE 1 TESTS

- Runtime against real PostgREST: **87/87 pass.** Additive-migration preservation, root
  and nested creation, seven levels, root and nested sibling uniqueness under the
  canonical normalizer, self parent, deep descendant cycle, cross-household parent
  without an existence leak, direct table writes refused by the trigger, reparent to
  root and across branches, rename, delete promotion at depth and at the root,
  promotion conflict with zero mutation, three real concurrency races (concurrent
  same-name siblings, the A-under-B / B-under-A cycle race, delete racing a child
  create), permissions unchanged, File move into the deepest folder, one-level browser
  vs whole-household catalogue, search scope, Favorites, literal search, household
  isolation, RLS.
- Deterministic UI: **112/112 pass.** Forest, no N+1, computed paths, same-name
  disambiguation, descendant exclusion, stale remote rename/move/delete resolution,
  the destination grammar, traversal termination, the one-level-up trail, and the
  source-level contracts including the migration decisions.
- Migration safety: **41/41 pass.**
- Gates: `homecloud-files` PASSED (21 commands), `homecloud-s2i` PASSED,
  `homecloud-recovery` PASSED, `homecloud-t2-d1` PASSED, `homecloud-3a-3d` PASSED,
  frontend typecheck PASS, backend syntax PASS, migration uniqueness PASS (114),
  secret scan PASS, `git diff --check` clean.

### STAGE 1 SEAMS CHANGED (declared)

1. `homecloud_s4ii_search_contract_tests.js` â€” `folder SEARCH does not list folders` is
   SUPERSEDED. It asserted flatness as an accident: with a flat model a folder had no
   subfolders, so listing any was meaningless. It is replaced by three STRONGER
   assertions that the subfolder read is scoped to the current folder, uses the literal
   `ilike` pattern, and never carries a content `.or()` filter. Assertion count went
   from 43 to 47; nothing was removed.
2. `homecloud_s4ii_search_contract_tests.js` â€” the folder-name encoder check no longer
   matches a source substring against one local variable name. It now asserts the
   emitted filter EQUALS the canonical encoder's own output, which is a stronger claim.
3. `homecloud_files_selection_bulk_tests.ts` â€” import only. The destination grammar
   moved to its own pure module so the contract is testable without a device. Assertion
   count unchanged at 168; C35-C42 all intact.
4. Ordering â€” the client-side sort that duplicated the server's collation was removed.

### KNOWN DEBT CARRIED

- `41e9145` (shared upload pump) is still pending sync into Memories. NOT solved here.
- No physical device was available. Pull-to-refresh feel, long-press feel, context-menu
  placement, native pickers, native save/share, media playback, PDF and Office
  external-open are UNPROVEN_DEVICE.
---

## PHASE 2 â€” FILES UX / INTERACTION REDESIGN

### CURRENT (audited)

The Files title row carried a refresh icon, a `Recientes / A-Z` button, a
`Favoritos` toggle, a `Seleccionar` button and a `+`. Every File tile and every
Folder tile carried its own circular ellipsis. Selection was entered by a long
press. The `FlatList` had no `RefreshControl`, even though the Memories screen in
the same shell already used one.

### PLANNER DONOR (inspected directly, not from memory)

`PlannerTasksScreen` utility row: `InteractivePressable` at 44x44, `radius.full`,
`options-outline` at size 20 with the tint flipping to `colors.terracotta[600]`
when a filter is active, plus an 8x8 accent dot. The `+` is `add` at size 22 in the
same accent. `PlannerScreen` overflow is an `ActionSheet size="content"` with
`ellipsis-horizontal` at size 22 and `overflowItem` rows, and it uses
`RefreshControl` with no customization. All of it was reused as-is.

No Planner file, no Memories screen and no shared HomeCloud shell file was
modified. Verified with `git diff --name-only` after the change.

### REAL GAP

Five permanent controls where the product wants one, a per-row action icon on
every tile, a long press that meant two different things, no manual refresh gesture,
and no accessible non-gesture route to the per-tile actions.

### AUTONOMOUS DECISIONS

1. ONE compact filter icon for BOTH display axes, because a mode and an order are
   both "what am I looking at" and two controls made the row unreadable.
2. A dot, not a count. `2` would be ambiguous: Favoritos + A-Z is two changes, not
   two filters.
3. Seleccionar lives in the overflow and is WITHDRAWN while the mode is active, so
   there is never a second way in.
4. Actualizar stays in the overflow as a secondary refresh path, so pull-to-refresh
   is never the only route for someone who cannot pull.
5. The refresh indicator is driven by its own local flag rather than the list's
   loading state, because the list also loads while paging and while the context
   changes, and the spinner must not lie about what the gesture did.
6. Inside selection a long press is a deliberate NO-OP rather than a tap or a menu.
   The simplest deterministic behaviour is the correct one: a menu during a
   multi-select would let a member move or delete a File they meant to batch.
7. The contextual accessibility action is REMOVED while selecting, so assistive
   technology and the gesture cannot disagree.
8. The destination GRAMMAR was separated from its sheet in Phase 1 and is reused
   here unchanged.

### FILES TOUCHED

- `front/mi-front-limpio/services/homecloud/homecloudFilesFilters.ts` (new): the
  pure display-filter grammar.
- `front/mi-front-limpio/services/homecloud/FilesFilterMenu.tsx` (new): the sheet.
- `front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx`: header, pull-to-refresh,
  and the interaction grammar.
- `scripts/homecloud_files_ux_tests.ts` (new): 74 deterministic assertions.

### TESTS

- New UX suite: **74/74 pass.**
- `homecloud-files`: **PASSED (21 commands).**
- `homecloud-s2i`, `homecloud-recovery`, `homecloud-t2-d1`, `homecloud-3a-3d`:
  **PASSED.** `selection-system`: **PASSED.**
- Frontend typecheck PASS, backend syntax PASS, migration uniqueness PASS (114),
  secret scan PASS, `git diff --check` clean.

### STAGE 1 SEAMS CHANGED (declared)

Six Stage 1 suites drove the interaction model Stage 2 supersedes. Each was ported
to the NEW gesture and keeps every original behavioral assertion; none lost
coverage.

| Suite | What it used to do | What it does now | Kept |
|---|---|---|---|
| `homecloud_s4i_files_wiring` | sort = the only titled sibling of the refresh icon | open the filter icon, press the real A-Z chip | C1-C7 unchanged, 29/29 |
| `homecloud_s4iii_files_surface_closure` | same, plus tile `onMore` for folder actions | same filter path; long press for folder actions | A9, A16, B35-B41 unchanged |
| `homecloud_files_selection_bulk` | long press ENTERED selection; per-File overflow | overflow `Seleccionar`, then taps | B1-B52 + C24-C27, 177/177, 168 model assertions unchanged |
| `homecloud_files_freshness` | per-File overflow; titled sort button | long press; filter menu | B2.2-B2.10, E1, E3 unchanged, 94/94 |
| `homecloud_files_favorites_ui` | permanent `Favoritos` button and its label | filter menu, asserting the NEW control announces the state before and after | 106/106 |
| `selection_system` | asserted `onLongPress={beginSelectionAt}` and a `useState` for `favoritesOnly` | asserts the long-press entry is ABSENT, both guards exist, `favoritesOnly` is derived and still sent to the read | strictly stronger |

Two expectations were deliberately REVERSED rather than merely ported, because the
Stage 2 contract reverses them:

- A File's contextual actions are no longer reachable INSIDE selection mode. Stage 1
  asserted they were ("the overflow still opens the canonical actions inside
  selection mode"). Phase 2 forbids it, so the suite now asserts the action is
  absent and a long press opens nothing.
- `Seleccionar` is withdrawn while the mode is active instead of being present and
  disabled.

### KNOWN DEBT CARRIED

- Pull-to-refresh FEEL, long-press FEEL and context-menu placement are
  UNPROVEN_DEVICE.

---

## PHASE 3 â€” VIEWER V1

### CURRENT (audited, primitives inspected in the installed tree)

Expo SDK 57.0.25, React Native 0.86.3, React 19.2.3. Installed and usable:
`expo-file-system` 57.0.7 (the new `File`/`Directory`/`Paths` API),
`expo-sharing` 57.0.22, `expo-video` 57.0.5, `expo-audio` 57.0.5, `expo-print`,
`expo-document-picker`, `react-native-svg`. NOT installed: `expo-av`,
`expo-image`, `expo-media-library`, `react-native-webview`, `react-native-video`,
`expo-constants`, `expo-intent-launcher`.

The two facts that decided the format strategy:

- There is NO WebView and NO PDF renderer. Adding one would need a package that
  forces a custom native rebuild, which Stage 2 forbids. So an inline PDF is not
  available at this dependency surface.
- `expo-video` and `expo-audio` already expose hooks that RELEASE the player on
  unmount, which is exactly the no-ghost-playback guarantee the contract asks for.

Therefore: **ZERO new dependencies**, and PDF/Office get a truthful system hand-off
instead of a fake inline render.

### FORMAT STRATEGY

| Family | Strategy | Why |
|---|---|---|
| image | inline from the authorized signed URL | React Native's own `Image`; no `expo-image` needed |
| video | inline via `useVideoPlayer` | installed, auto-releases on unmount |
| audio | inline via `useAudioPlayer` | installed, auto-releases on unmount |
| pdf | staged to cache, system hand-off | no renderer exists and adding one is forbidden |
| office | staged to cache, system hand-off | a WebView cannot render binary Office documents |
| text / csv / markdown | bounded local read, 512 KiB cap | small enough that a whole file must never be pulled into JS |
| svg / html / xml | REFUSED inline as active web content | an SVG may carry scripts; sanitizing one properly is a security project of its own |

### PRIVACY DECISIONS

1. `variant=original` is requested explicitly and a preview variant is NEVER
   requested: a preview is a different byte stream than the member asked to see.
2. A signed URL is never persisted, never a durable cache key and never logged.
   Authorization expiry allows at most ONE controlled re-grant per failed access.
3. Nothing is sent to Google Docs, Microsoft, a converter or any public preview.
4. The hand-off is labelled "Abrir o compartir con..." because
   `Sharing.shareAsync` is a generic hand-off, not an "open with" picker. Calling it
   "Abrir con..." would be a lie about the primitive.
5. Staging lives in `Paths.cache` in its OWN directory, is named deterministically
   from the content id, and is removed on unmount. The raw server filename is never
   concatenated into a path.

### FILES TOUCHED

- `front/mi-front-limpio/services/homecloud/homecloudViewerKind.ts` (new): the single
  classification layer.
- `front/mi-front-limpio/services/homecloud/homecloudViewerAccess.ts` (new):
  authorization, staging, bounded text read, system hand-off.
- `front/mi-front-limpio/screens/HomeCloudFileViewerScreen.tsx` (new).
- `front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx`: the tap seam is wired,
  and the Viewer is mounted as a LAYER rather than a route, which is what makes back
  restore the exact browser context.
- `tests/stubs/{expo-video,expo-audio,expo-file-system,expo-sharing}` (new): the
  device-supplied pieces the Node harness needs. The media stubs are deliberately
  inert - they never fake playback, so device playback stays honestly UNPROVEN.

### TESTS

- New Viewer suite: **112/112 pass.**
- Integrated QA (Phase 4): **119/119 pass.**
- All Stage 2 suites and every Stage 1 gate: **PASS.**

---

## PHASE 4 â€” FULL STAGE 1 + STAGE 2 INTEGRATED QA

### WHAT ONLY THE INTEGRATED SEAM COULD PROVE

Per-phase suites prove a seam. Only the combination proves the product. The new
`homecloud-stage2-integrated` suite drives the real authority chain - real JWT, real
context, real capability matrix, real services, real PostgREST - through the
cross-flows, the large-data boundaries, the household-isolation matrix and the
privacy review.

### CROSS-FLOWS (all pass)

- A: nested create, upload, navigate out and back - no duplicates, path correct.
- B: move a File across branches - destination lists it, source does not, no
  duplicate, exactly one stored link.
- C: a cycle attempt leaves the tree byte-identical.
- D: delete promotes the direct contents and grandchild Files stay put; no File is
  deleted, only relocated.
- E: a promotion that would collide is refused; X, the colliding child, the existing
  sibling and every File are all untouched.
- F: a refresh re-asks the same nested question and answers identically.
- G: N canonical mutations into a nested destination all land, and neither the
  destination nor the root double-counts.
- H: Favoritos composes with a nested context and does not leak into a sibling folder.
- I: root search stays GLOBAL, folder search stays folder-scoped, and the literal
  hardening survives.
- J-N: Viewer routing, the bounded text cap, selection coexistence and pruning.
- O: cross-household original access refused both ways; the owner gets an ORIGINAL
  variant grant whose URL points at household storage; a missing preview returns the
  canonical `preview_unavailable` result and NO url; a written Memory is refused as
  binary.

### LARGE DATA

99 / 100 / 101 / 199 / 200 / 201 / 299 / 300 / 301: page sizes exact, `nextOffset`
present only when there is genuinely more, adjacent pages never overlap, and paging
TO EXHAUSTION yields every row exactly once. Also a catalogue-scale fixture of 105
folders across 5 levels with a 25-child level, served by ONE catalogue read.

### TWO REAL FINDINGS THIS SEAM CAUGHT

Both were in the QA harness and both would have produced a false verdict:

1. A partially-applied UPDATE from a File row into a written Memory violates
   `homecloud_contents_shape_check` and `homecloud_contents_written_purity_check`.
   It failed SILENTLY and left a stray File at the root, which then inflated every
   large-data count by exactly one. The written Memory is now INSERTED in its real
   shape, and an explicit assertion proves no stray File remains.
2. The catalogue-scale fixture tracked the previously created LEAF as the next
   level's parent, silently flattening the tree it was meant to measure.

Neither is a product defect. Both are recorded because the seam is only worth
running if its own fixtures are trustworthy.

### HOUSEHOLD ISOLATION (11 seams, all pass)

Parent, children, create, rename, move, delete, pickers, File move, bulk move,
upload destination, search, Favorites, Viewer metadata, Viewer original, signed URLs.
A cross-household parent is answered with the SAME 404 as an unknown one, so the
hierarchy adds no existence-probing leak.

### PRIVACY REVIEW (7 checks, all pass)

No log statement can carry a signed URL or a token. No third-party viewer or
converter is referenced. No raw document HTML is executed and no iframe is
rendered. No WebView in the Viewer. The Viewer never requests a preview variant. A
signed URL is never persisted. The QA suite itself never prints one.

### RESIDUE

Zero QA folders, Files, households, Memories or storage objects remain. The 39
orphaned `homecloud-originals` objects were verified to pre-date this run by more
than three hours: they are pre-existing debt from earlier Stage 1 acceptance runs
and were deliberately left alone.

---

## PHASE 5 â€” CLOSURE

- Nested Folder Hierarchy: **CLOSED**
- Files UX: **CLOSED**
- Viewer V1: **CLOSED** (source/runtime), device acceptance pending
- Stage 1 regression: **PASS**, no behavioral regression
- Stage 2 automated: **PASS**
- Migration safety (fresh AND upgrade): **PASS**
- Household isolation: **PASS**
- Privacy: **PASS**
- Zero new dependencies, zero secrets logged, zero destructive remote operations
- Stage 3 was **NOT** started.

### KNOWN DEBT CARRIED OUT

- `41e9145` (shared upload pump) is still pending sync into Memories. Verified NOT
  an ancestor of the Memories branch; not solved here by design.
- 39 orphaned `homecloud-originals` objects from earlier Stage 1 runs.
- Every physical-device behavior is UNPROVEN_DEVICE.

---

## PHASE 3 CORRECTION â€” the Viewer was NOT closed at `89af43e`

Recorded as an append, not a rewrite. The Phase 3 section above stands as written at
the time, because what it claimed was wrong and the correction has to be visible.

### WHAT WAS WRONG

`89af43e` was reported as **CLOSED** on the strength of **112/112 assertions**. Those
112 assertions were **source-text greps**. Not one of them executed
`stageViewerOriginal`, `readViewerTextPreview` or the retry helper, and the
file-system stub made that impossible: `downloadFileAsync` unconditionally threw
`STUB_NO_NETWORK`, so the functions under test could not run at all.

So the suite could not have caught runtime defects, and six were live:

1. **The bounded read was theatre.** `readViewerTextPreview` called
   `written.bytesSync()` â€” the WHOLE file, unconditionally, in BOTH branches of a
   ternary â€” and sliced the result. A 500 MB TXT was fully resident in the JS heap
   before 512 KiB were kept. The comment claiming "a 500 MB TXT cannot exhaust the
   heap here" was false, and so was the log's "Texto acotado a 512 KiB".
2. **`truncated` could never be true.** It was computed as
   `bytes.length > byteCap` from a buffer that had already been subarray'd to
   `byteCap`. The "partial preview" indication was unreachable.
3. **Staging orphaned a file on every view.** `stageViewerOriginal` built a
   deterministic `target` and then downloaded into the DIRECTORY, so the platform
   named the file from the response headers. `discardViewerStaging` deleted the
   deterministic name, which therefore never existed. Every PDF and Office view left a
   permanent cache orphan, and the log's "removed on unmount" was false.
4. **The retry never retried.** `requestViewerAccessWithSingleRetry` accepted an
   `alreadyRetried` flag and returned the same grant from both branches. It had ZERO
   importers. The log's "at most ONE controlled re-grant" described nothing.
5. **A transfer error escaped untyped.** `stageViewerOriginal` let the raw platform
   error propagate, so the surface showed a generic message and the controlled retry
   could not recognise an expired grant.
6. **A stale signed URL outlived its session.** The target-change effect reset phase,
   failure, staging and text, but not `signedUrl`, so the previous file's live
   credential was retained in state past its own Viewer session.

A seventh defect was in the harness itself: the stub's containment check collapsed
`file:///x` to `file:/x`, so every lookup under `Paths.cache` looked like a sandbox
escape. It stayed hidden precisely because nothing had ever executed against it.

### WHAT CHANGED

- The read is now **structural, not arithmetic**: `readableStream()` consumed chunk
  by chunk, the reader cancelled at the cap, and only the accumulated prefix is
  materialized. `truncated` is measured from the real file size before slicing.
- `VIEWER_TEXT_TRANSFER_BYTE_LIMIT` (8 MiB) refuses an absurd text BEFORE any
  transfer, because the bounded read only happens once the platform has finished
  downloading. This is a second, separate bound and the log should not have implied
  the first one covered it.
- Staging downloads into the deterministic `File` with `idempotent: true`, so cleanup
  removes exactly what was written and repeat views reuse one slot.
- `withSingleGrantRetry` replaces the dead helper. It retries the **ACCESS** with a
  **fresh grant**, exactly once, and never retries a genuine permission denial.
- A transfer failure is typed as `preview_failed` on both the text and hand-off paths.
- `signedUrl` is reset when the target changes.

### WHY THIS WAS MISSED, AND THE STRUCTURAL FIX

The failure was epistemic, not a typo: I treated 112 green source-greps as evidence
of runtime behavior. A grep cannot see that a cap is applied after the fact.

The stub now publishes a **heap guard** that makes `bytes`, `bytesSync`, `arrayBuffer`,
`text` and `textSync` **throw**, so any whole-file reader fails the suite by
construction. It also serves real registered transfer bodies, honours a `File`
destination, and drives `readableStream`.

The new section **V-K EXECUTES the real access module** â€” 21 assertions covering the
bounded read, honest truncation, the too-large refusal before transfer, deterministic
staging, real orphan removal, slot reuse, the single retry and the denial that must not
retry. Suite total: **133/133**.

### THE TESTS WERE MUTATION-PROVEN

Green tests that were never shown to fail are the same mistake one level down, so each
original defect was reintroduced and the suite re-run:

| Reintroduced defect | Result |
|---|---|
| whole-file read behind the cap | 4 FAIL, incl. the heap guard |
| staging into the directory | 4 FAIL, incl. real orphan detection |
| no-op retry | 5 FAIL with a readable diagnosis |

The no-op retry initially turned the suite **red by crashing** rather than by
asserting, aborting the remaining checks â€” the same `[object Object]` blind spot hit in
Phase 4. The retry assertion is now guarded so a regression reports cleanly.

---

# POST-DEVICE-QA REOPEN

Physical-device QA and a subsequent READ-ONLY reopen audit proved the previous Stage 2
closure INCOMPLETE. The history above is preserved exactly as written and is NOT
rewritten: the previous closure, the device-QA contradiction, the reopen audit, the
corrective implementation and the new evidence are all separate, ordered events.

The previous closure's core epistemic error is recorded here once and applies to every
slice below: **a source grep was treated as a behaviour.** A regex can support
SOURCE_EVIDENCE. It cannot prove runtime interaction, layout reachability, gesture
arbitration, native media playback, PDF rendering, safe-area behaviour or scroll wiring.
Every claim below is tagged with the strongest evidence class that actually supports it.

## RUN IDENTITY (REOPEN)

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-files`
- Branch: `homecloud/files-lane`
- Starting HEAD: `5bb9775b3a63eddabc647d9684e7cb98914b693f`
- Starting working tree: clean.
- Memories worktree: **READ ONLY, never written.**
- Shared upload engine: **FROZEN and UNTOUCHED.**
- Stage 3 (Trash / Restore / Purge / Lifecycle / Scanner / OCR): **NOT IMPLEMENTED.**
- No DB migration was added in this reopen.

### LOCAL RUNTIME DISCOVERY (RESOLVED, NOT ASSUMED)

The reopen brief reported that the previous audit could not reproduce local runtime
because it checked a default `54321`-style endpoint. That is confirmed, and the actual
stack was discovered rather than guessed:

| Fact | Value | How |
|---|---|---|
| Kong / REST gateway | `127.0.0.1:56221` | `docker ps` on `supabase_kong_HomePlus` |
| Postgres | `127.0.0.1:56222` | `docker ps` on `supabase_db_HomePlus` |
| `supabase/config.toml` API port | `56221` | file read |
| `backend/.env` `SUPABASE_URL` host | `192.168.0.26` (this machine's LAN address), port `56221` | parsed, values never printed |

`backend/.env` therefore advertises the SAME local stack over the LAN interface, and
`tests/helpers/environment.js` only accepts `127.0.0.1` / `localhost`. Resolved WITHOUT
touching product behaviour, exactly as the previous run did: a **process-scoped**
`SUPABASE_URL`/`SUPABASE_JWKS_URL` loopback override for the test process only. No
product `.env` was modified. No remote Supabase was contacted. `supabase db reset` was
never run.

Confirmed running: `homecloud-files-favorites-runtime` (39/39) and
`homecloud-stage2-integrated` (119/119) against the discovered stack.
---

## SLICE A -- FAVORITES CORRECTNESS

### PRE-AUDIT AGAINST `5bb9775` (THE REOPEN FINDINGS STILL MATCHED)

| Reopen finding | Confirmed at HEAD | Evidence |
|---|---|---|
| Favorite is the sixth action in a BOUNDED, NON-SCROLLABLE content sheet | YES | `FileActionHost.tsx` mounted `ActionSheet size="content"`; `ActionSheet` maps `content` to `modalContentIntrinsic` = `{ flexShrink: 1, minHeight: 0 }` -- a box that shrinks and CLIPS |
| Favorite mutation uses the shared `saving` flag | YES | `toggleFileFavorite` set `saving`, and `FileActionHost` disabled **every** row with `disabled={!action.available \|\| saving}` |
| Favorite failure uses the SCREEN-LEVEL error channel | YES | `toggleFileFavorite` catch called `setError(...)`; the screen renders `error` as a full-surface error card whose `Reintentar` calls `load()` |

Backend / DB decision: **NO CHANGE.** The Favorites identity, the
`PATCH /api/homecloud/content/:id/favorite` contract and the `homecloud_content_favorites`
trigger invariants are correct at HEAD; the real PostgREST runtime suite still passes
39/39 unmodified. The defect was entirely in the client interaction layer.

### ROOT CAUSE

The Favorite was not missing because the grammar hid it. It was missing because the
action sheet's content box was not scrollable, so at the audited viewports the LAST
rows were clipped off the bottom of the sheet -- no error, no disabled control, nothing
to explain the absence. Two secondary defects rode on the same flow: one surface-wide
busy flag froze the whole menu, and the failure path offered a recovery that replaced
the list and re-read page one.

### THE FIX

1. **REACHABILITY.** `FileActionHost` now mounts `ActionSheet size="scrollable-content"`
   and wraps its content in a `ScrollView` with `flexShrink: 1`, so every row is
   scrollable to. The overflow that made this necessary is DECIDED by a new pure policy,
   `fileActionSheetLayoutPolicy`, computed from the real design tokens.
2. **PER-ACTION BUSY.** The host takes `favoriteBusy`. Only the Favorite row is busy and
   disabled while its own mutation is in flight; `run()` also refuses to re-dispatch a
   row that is already busy, so a slow connection cannot send the PATCH twice.
3. **SUCCESS.** The server answer is authoritative for one row: `patchFile` corrects the
   loaded rows in place, the sheet closes, and the window-preserving re-read continues
   WITHOUT being awaited into the busy state. No second Favorites cache, no backend
   change.
4. **FAILURE.** The refusal is carried on a new `actionError` prop and rendered INSIDE the
   sheet as an `accessibilityRole="alert"` line. `setError` is no longer used by the
   Favorite path, so the list is never replaced, pagination is never reset and no
   first-page `load()` is ever issued as a recovery. The member stays in the exact
   folder / query / sort / window they were in.

### EVIDENCE (CLASSIFIED HONESTLY)

| Claim | Class | What actually ran |
|---|---|---|
| The content genuinely overflows at the audited viewports | PURE_UNIT (arithmetic over real tokens) | `fileActionSheetLayoutPolicy` at 360x640, inset 44/34: fontScale 1.0 asks 410dp for a 410dp box (exactly at the boundary), 1.3 clips 5dp, 2.0 clips 106dp. At 360x800 it does NOT overflow -- which is why the bug survived review: it was viewport-dependent. |
| The host mounts the REAL scrollable sheet and every row survives | COMPONENT_BEHAVIOUR | The REAL `ActionSheet`, `AppButton`, `AppText`, `InteractivePressable` were required and executed at that viewport, with real safe-area insets and a mutable `useWindowDimensions`. Assertions read the executed tree: `size="scrollable-content"`, the applied content container is the `flexGrow:1 + flexShrink:1` style and the `flexShrink:1/minHeight:0` intrinsic box appears NOWHERE, the `ScrollView` IS the sheet's child, and all six rows render in canonical order. |
| One busy row, not a frozen menu | COMPONENT_BEHAVIOUR | The Favorite PATCH was held open with a gate, so the busy state was observed **while in flight**. The host was re-rendered against the real sheet: exactly one row reports `accessibilityState.busy`, exactly one is disabled, and a second press while busy sends no second PATCH. |
| A refusal preserves list, window and context | COMPONENT_BEHAVIOUR | A real 300-row window (three 100-row pages). After the refusal: the `FlatList` is still mounted, no `ErrorState` anywhere, still 300 rows, **zero** reads at `offset=0&limit=100` were issued as recovery, and the refusal is rendered inside the sheet as an alert. A subsequent refresh walked offsets `0,100,200` and the window was still 300 rows. |

### A HARNESS GAP THIS SLICE FOUND AND CLOSED

`mountSurface` set no `authMe`, so `useHomeCloudCapabilities` could never resolve a
complete scope (account + household + membership) and every surface assertion ran
against a permanently **deny-all** descriptor -- i.e. every File action row was
`disabled: true` in every "behavioural" test, and none of them noticed. The suite now
installs a real `authMe`, which is what makes the busy/enabled assertions above mean
anything.

Suite: `homecloud-files-favorites-ui` **156/156**.

### SLICE A REGRESSION

`homecloud-files-favorites` PASS (39 mutation/read/migration) -- `homecloud-files-favorites-ui`
PASS (156) -- `homecloud-files-slice1-selection-bulk` PASS -- `homecloud-files-freshness`
PASS -- `homecloud-files-hierarchy-ui` PASS -- `homecloud-w1bc-pagination-reconciliation` PASS
-- `homecloud-s4iii-files-surface` PASS -- frontend `tsc --noEmit` PASS -- `git diff --check`
clean.

Real runtime: `homecloud-files-favorites-runtime` **39/39** against the discovered local
stack. **DEVICE_PENDING**: no physical device is attached to this agent, so sheet
reachability on real hardware is not claimed here.

### COMMIT

`fix(homecloud): repair file favorites interaction`
---

## SLICE B -- DRAG SELECTION, REFRESH and AUTOMATIC PAGINATION

### PRE-AUDIT AGAINST `c6abd40` (SLICE A)

| Reopen finding | Confirmed at HEAD | Evidence |
|---|---|---|
| A long press inside selection mode did NOTHING | YES | `handleFileLongPress` was `if (selection.mode) return;` -- the product requirement is a continuous sweep |
| `Mostrar más archivos` was the normal way to page | YES | `ListFooterComponent` rendered that button whenever `hasMore` |
| `Actualizar` was a VISIBLE overflow item | YES | the header overflow carried it, plus the hint said "Seleccionar archivos o actualizar" |
| The empty state was DEAD | YES | `items.length === 0` rendered a plain `View`, so the `FlatList` and its `RefreshControl` were UNMOUNTED |
| Automatic pagination could retry-storm | N/A | pagination was manual, so the latch did not exist yet |

No PanResponder donor was reused as-is: `AccountSheet` and `HouseholdSwitcherSheet` use
PanResponder for a sheet swipe, which is a different arbitration problem. React Native's
own `PanResponder` is used here, with **no new dependency** -- no gesture-handler, no
reanimated, no `GestureHandlerRootView`.

### ARCHITECTURE DECISION: WHY THE RESPONDER IS ARMED, AND WHY IT BLOCKS THE NATIVE ONE

Normal scrolling inside selection mode must keep working. A member sweeping straight down
a column of Files and a member flicking the list are the same physical motion, so no axis
or distance discriminator can separate them. Only the LONG PRESS can, because it is a
decision the member already made. Therefore:

- `onStartShouldSetPanResponder` / `...Capture` return **false unconditionally** and
  `onShouldBlockNativeResponder` is false until armed, so a swipe is still a swipe.
- `onLongPress` arms the sweep. The mode is read ONCE, from the anchor's CURRENT selection
  state, and never re-derived.
- After arming, `onMoveShouldSetPanResponder` is true, `onPanResponderTerminationRequest`
  is false, and `onShouldBlockNativeResponder` is **true**. That last one is not optional
  decoration: React Native 0.86 is on the New Architecture, where the `FlatList` pan is a
  NATIVE recognizer, so blocking it is the only way to keep a stationary finger on a tile
  that is scrolling underneath it. This was read out of the installed
  `react-native/Libraries/Components/ScrollView/ScrollView.js` and `Pressable.js`, not
  assumed.

### THE PURE MODULE

`homecloudDragSelection.ts` owns the three decisions that are not styling, framework-free
and directly testable: the anchor mode, the visited-once fold, the MEASURED hit test
(`pointerToListContent` + `hitTestFileTile`, with gutters returning `null` rather than the
nearest neighbour), and the auto-scroll bounds. The screen owns the responder, the timer
and the measured frames, and re-implements none of it.

Auto-scroll: 72 dp edge zone, 12 dp step, 16 ms tick, clamped to
`max(0, contentHeight - viewportHeight)`. A tick that cannot move the list returns `null`,
which is what stops the timer at a boundary instead of firing forever against it.

### REFRESH

`Actualizar` is REMOVED from the visible overflow and the overflow hint no longer mentions
updating. `RefreshControl` and every automatic freshness signal (focus, foreground, tab
return, upload reconciliation, household/context changes) are untouched. An
ACCESSIBILITY-ONLY `refresh-files` action on the list container replaces the button and
calls the SAME window-preserving `refresh()` -- no duplicated refresh implementation and no
second visible item. The empty state moved into `ListEmptyComponent`, so the scroll surface
and its `RefreshControl` exist on an empty root, an empty folder, an empty Favoritos result
and an empty search.

### PAGINATION

`Mostrar más archivos` is GONE. `onEndReached` reaches the canonical `loadMore()` with
`onEndReachedThreshold={2}` (the grid viewport is only a few rows). The synchronous
`loadingMore` guard and the generation rejection are preserved. The footer renders: nothing
while idle (a fixed 24 dp spacer, so there is no layout jump), a small `ActivityIndicator`
while a page is in flight, and on a failure the error plus a COMPACT `Reintentar`.

New `autoPageBlocked` latch + `retryNextPage()`: after a failed AUTOMATIC request, automatic
requests are refused, the failed `nextOffset` is kept, and only the explicit retry re-arms
one attempt. A second failure latches again, so a retry can never become a loop. A first
page, a window-preserving refresh and a household reset all clear it.

### EVIDENCE (CLASSIFIED HONESTLY)

| Claim | Class | What actually ran |
|---|---|---|
| The sweep model is an anchor decision, each File processed at most once | PURE_UNIT | `homecloudDragSelection` executed: ADD from an unselected anchor, REMOVE from a selected one, re-crossing returns the SAME object (so a second processing is structurally impossible), a 41-tile sweep visits 41. |
| Hit testing uses measured frames | PURE_UNIT | Executed on a deliberately NON-174dp grid with a 24dp gutter: second column, next row, gutter returns `null`, and a 500dp scroll offset resolves against real content. |
| The gesture does not break normal scrolling | COMPONENT_BEHAVIOUR | The surface's own `PanResponder` was ASKED, not read: before arming `onStartShouldSetPanResponder === false`, `onMoveShouldSetPanResponder === false` and `onShouldBlockNativeResponder === false`; after arming, move is claimed, start is still refused, native is blocked, termination is refused. |
| The sweep works end to end | COMPONENT_BEHAVIOUR | The real Files screen, the real `FileTile`, the real responder: a 5-crossing sweep through TWO columns selected exactly 6 Files; re-crossing changed nothing; a second gesture anchored on a selected File removed the run; the same was then repeated at a 4-row scroll offset. |
| Folders are ignored | COMPONENT_BEHAVIOUR | The folder tile has no `onLayout` and no `panHandlers` at all, and dragging the finger back over the folder row selected nothing extra. |
| Auto-scroll starts, keeps going in bounded steps and stops | COMPONENT_BEHAVIOUR | Real `setInterval`: a finger in the middle does not scroll; the bottom edge scrolls the list under a stationary finger and keeps going; release stops it, terminate stops it, leaving selection mode stops it. |
| No timer leak | COMPONENT_BEHAVIOUR + SOURCE | The offset was sampled 80 ms after each end and did not move again; and every end reaches the ONE `stopAutoScroll`, from release, terminate, mode exit, the context effect and unmount. |
| Zero visible Refresh controls | COMPONENT_BEHAVIOUR | Asserted on the RENDERED tree: no element carries the label `Actualizar archivos`, no button titled `Actualizar`, the overflow's own titles do not include it, the hint no longer advertises it, and exactly ONE `refresh-files` accessibility action exists. |
| Empty states are refreshable | COMPONENT_BEHAVIOUR | An empty root, and an empty Favoritos result: the `FlatList` is still mounted, `ListEmptyComponent` renders, the `RefreshControl` exists, and firing it issues a real read. |
| Pull-to-refresh and the AT action share one authority | COMPONENT_BEHAVIOUR | The `RefreshControl` was invoked: indicator true, then false after settle (a `finally`), exactly one read. The `refresh-files` action produced exactly one more read. |
| Automatic pagination is wired and early | COMPONENT_BEHAVIOUR | The list's own `onEndReached` was invoked: threshold 2 (>= 1.5), FIVE rapid invocations produced exactly ONE request, 250 rows paged to exhaustion, and three further invocations at the end produced NO read. |
| A stale page cannot append | COMPONENT_BEHAVIOUR | A next page was held in flight, the household was switched underneath it, and the late answer did not appear in the new household's list. |
| The failure latch works | COMPONENT_BEHAVIOUR | A failing next page: one request, the failure stated, a compact `Reintentar` present, then FOUR further automatic invocations produced ZERO requests; only the explicit retry asked again, and the affordance disappeared once the page landed. |
| Footer states | COMPONENT_BEHAVIOUR | A gated page showed exactly one `Cargando más archivos` indicator and NO paging button at all; idle showed no spinner; the final page showed no spinner. |
| Selection is still fully accessible without a drag | COMPONENT_BEHAVIOUR | Inside selection the tile is a `checkbox` announcing `selected`, and offers explicit `select`/`deselect` actions that really select and really deselect; the tap toggle and the bar summary still work. |

### A HARNESS GAP THIS SLICE FOUND AND CLOSED (AGAIN)

The three surfaces that mount the real Files screen stubbed `react-native` without
`PanResponder`, so the screen crashed on mount the moment a pan responder existed. Each now
provides a DRIVABLE stub: `create` records the production config and the handlers delegate
straight to it, which is what makes "does this responder claim a move?" an answerable
question instead of an unreadable string.

Two existing assertions had to change because the product truth changed, and both were
updated to assert the NEW truth rather than to be relaxed:

- freshness F1 asserted "the Files surface has no interval". That is now false by design, so
  the suite instead asserts there is exactly ONE interval, that its body never reads from
  the server, and that every gesture end reaches the one `clearInterval`. F4's "no new Map"
  became "the only Map is the measured tile-frame map", because the frame map is
  measurement, not a data cache.
- selection/bulk B28 asserted "inside selection the tile offers NO accessibility action at
  all". Drag-selection REQUIRES explicit `select`/`deselect` actions, so the suite now
  asserts the absence of the contextual `longpress` action specifically.

### THE UX SUITE WAS REWRITTEN, NOT EXTENDED

`homecloud_files_ux_tests.ts` was almost entirely source regexes -- it could prove the string
`title="Actualizar"` existed and nothing about whether pressing it worked. It is now a
153-assertion suite that mounts the real Files screen over a hook host and a stubbed
transport and EXERCISES the claims, with the genuinely source-scoped checks (donor reuse,
design tokens) kept and labelled as such.

### SLICE B REGRESSION

`homecloud-files-ux` PASS (153) -- `homecloud-files-slice1-selection-bulk` PASS (178) --
`homecloud-files-freshness` PASS -- `homecloud-w1bc-pagination-reconciliation` PASS (84) --
`homecloud-files-favorites` PASS (100) -- `homecloud-files-favorites-ui` PASS (157) --
`homecloud-files-hierarchy-ui` PASS (129) -- `homecloud-s4iii-files-surface` PASS (234) --
`homecloud-files-viewer` PASS -- frontend `tsc --noEmit` PASS -- `git diff --check` clean.

**`frontend-lint` was ALREADY RED at HEAD and was not made redder.** React Compiler
"Compilation Skipped: Existing memoization could not be preserved" errors already exist in
`PlannerSheetHost.tsx` and at nine sites in `HomeCloudFilesScreen.tsx`. The error set was
diffed against `HEAD` with `eslint --stdin` and is IDENTICAL, so this slice introduced no new
lint error. It is reported here as pre-existing debt, not as a pass.

Real runtime: no Stage 2 UI suite requires the local stack, so nothing new was run here;
`homecloud-files-favorites-runtime` and the Stage 2 integrated suite are re-run in Slice D.

### COMMIT

`refactor(homecloud): finish files selection refresh and pagination`
---

## SLICE C -- VIEWER COMMON-FORMAT UX

### PRE-AUDIT AGAINST `b4e7a3f`

The Viewer's strategy was declared as "pdf / office: hand off to the platform" with the
reason stated in the source: *"There is no WebView and no PDF renderer in this app, and
adding one would force a custom native rebuild, which Stage 2 forbids."* That reasoning
was wrong on its own terms — the project DOES have a dev-client / native-build workflow
(`expo run:android`, `expo run:ios`, `expo-dev-client`, `eas.json`), so a renderer was
always allowed. The PDF requirement was never closed; it was deferred with a reason that
did not hold. Text/MD/CSV were also not selectable, the Viewer ignored the safe area, and
Android back left the app instead of closing the Viewer.

### PDF RENDERER DECISION (full record: `HOMECLOUD_FILES_STAGE2_PDF_RENDERER_DECISION.md`)

Compared, with published evidence rather than memory:

| | `react-native-pdf@7.0.5` | `react-native-pdfrender@1.0.3` | `react-native-webview` + bundled pdf.js |
|---|---|---|---|
| Last published | **2026-08-13** (after RN 0.86 shipped) | 2026-06-02 (package created 2026-05-17) | n/a |
| New Architecture | Fabric path fixed (`#1011`, `#1012`, `#1022`), verified by its author on Expo SDK 56 / RN 0.85 | purpose-built for Fabric | n/a |
| Local staged file | **`file://` first-class on both platforms** | caller must stage first (we already do) | needs `allowFileAccess` / `allowingReadAccessToURL` plumbing |
| Bytes in JS heap | **never** — `android.graphics.pdf.PdfRenderer` + PDFKit read a file descriptor | never | only if the transfer is mis-wired, in which case it is base64 |
| Extra native surface | 1 module + 1 peer + 1 Expo plugin (`@config-plugins/react-native-pdf@14.0.2`, `peer expo >= 56`) | 1 module, 0 deps | 1 module + a large JS renderer + a worker bundle |

**Chosen: `react-native-pdf@7.0.5`**, pointed at the local staged original.

Labelled as INFERENCE, not proof: "7.0.5 works on SDK 57 / RN 0.86". The maintainer proved
SDK 56 / RN 0.85; Expo states 0.86 introduces no breaking changes from 0.85. **No native
build can be produced in this environment, so the native build itself is DEVICE_PENDING.**

Installed with the canonical mechanism (`npx expo install`), which added exactly three
entries and bumped nothing: `react-native-pdf ^7.0.5`, `react-native-blob-util ^0.25.1`
(peer) and `@config-plugins/react-native-pdf ^14.0.2` (prebuild wiring in `app.config.js`).

### WHAT CHANGED IN THE VIEWER

| Format | Before | After |
|---|---|---|
| PDF | system hand-off | **inline `react-native-pdf` from the local staged `file://`**, native paging + double-tap zoom, `trustAllCerts={false}` |
| image / video / audio | inline | unchanged, plus a real fallback for a decode failure |
| TXT / Markdown / CSV | bounded read, not selectable | **natively selectable**, so a member can copy from it |
| DOC/XLS/PPT | hand-off | hand-off (unchanged, and honest) |
| SVG / HTML / XML | refused as active content | unchanged |
| safe area | hard-coded `paddingTop` | **`useSafeAreaInsets()`**, the app's own mechanism |
| Android back | nothing — left HomeCloud | **`BackHandler` registered only while a File is open**, removed on close/unmount |

Failure consistency is the point of §45 and it is now real: a PDF the device cannot open
says *why* ("puede estar protegido con contraseña o dañado") and still offers the hand-off;
a video whose decoder reports an error keeps the player mounted, says so, and offers
`Abrir o compartir con…`; a hand-off failure lands on the same typed surface. No branch
ends blank and no branch shows a stack trace.

### EVIDENCE (CLASSIFIED HONESTLY)

The previous Viewer suite was 133 assertions of SOURCE/PURE evidence — worth keeping, all
kept. What it could NOT do was prove a render branch, so **V-L mounts the real
`HomeCloudFileViewer`**. `expand()` EXECUTES the nested surfaces (`ViewerPdfSurface`,
`ViewerVideoSurface`, `ViewerAudioSurface`) with their own hook slots, exactly as React
would; without that the suite could only assert those components exist.

| Claim | Class | What actually ran |
|---|---|---|
| A PDF opens INLINE | COMPONENT_BEHAVIOUR | Mounted with `file.id = c-pdf`: a `Pdf` element is in the tree; its `source.uri` is `file://…/HomeCloudViewer/viewer-c-pdf.pdf` — the local staged original, deterministic from the content id, and NOT the signed URL. |
| No remote renderer | COMPONENT_BEHAVIOUR | The renderer's own props were serialized and scanned: no `cdn.`, `unpkg`, `jsdelivr`, `googleapis`, `microsoft`, `docs.google` or `drive.google` anywhere; the source URI does not match `^https?:`. |
| Paging and zoom | COMPONENT_BEHAVIOUR | `enablePaging === true`, `enableDoubleTapZoom === true`, `trustAllCerts === false`, asserted on the mounted renderer. |
| One authorized private transfer | COMPONENT_BEHAVIOUR | Exactly one native download, from the signed original, into `file:///cache/`, with `idempotent: true`. |
| A PDF the device cannot open | COMPONENT_BEHAVIOUR | `onError` fired: the tree shows the specific reason (password / damaged), exactly one `Abrir o compartir con…`, and no `Error:`/stack text. |
| Target change cleans up | COMPONENT_BEHAVIOUR | Switched to a second File: the first staged copy was DELETED, a second transfer went to its own slot, and the renderer shows the second File. |
| Image / MOV / audio branches | COMPONENT_BEHAVIOUR | An image mounts `Image` with the signed URL and no PDF renderer; a MOV mounts `VideoView` first, with NO error copy while healthy; audio mounts the existing Reproducir/Pausar surface with no PDF or video renderer. |
| Video decode failure | COMPONENT_BEHAVIOUR | With the decoder reporting `error`: the specific message appears, `Abrir o compartir con…` is offered, and the player is STILL mounted — nothing flickers away and the member is not dumped into another app. |
| TXT / MD / CSV selectable | COMPONENT_BEHAVIOUR | The REAL `AppText` was used, so the assertion is made on the platform `Text` element: each of the three produced a `Text` with `selectable === true` carrying the file's text. The staged text round-tripped through the REAL bounded read (chunked `readableStream`, no whole-file reader). |
| Safe area | COMPONENT_BEHAVIOUR | With insets 44/34 installed, the mounted root's flattened style has `paddingTop === 44` and `paddingBottom === 34` — the real inset, not a hard-coded status bar. |
| Android back | COMPONENT_BEHAVIOUR | Exactly one handler registered while open; it returns `true` (consumes) and calls `onClose` exactly once; unmounting leaves zero handlers. |
| Honest refusals | COMPONENT_BEHAVIOUR | DOCX -> hand-off with no PDF renderer mounted and the original really staged; SVG -> "documento web activo" with no renderer; an authorization failure -> a stated surface with no renderer mounted. |

Two harness defects were found and closed while writing this, and both had been producing
*misleading* evidence rather than failures:

1. **`components/ui` was resolved before the loader interception**, so the real `AppText`
   tried to resolve `react` for real. It is now built lazily from inside the loader.
2. **The access module was already in `require.cache`** from the V-K block, bound to a
   DIFFERENT filesystem stub. Every branch test was therefore hitting the real transport
   and failing with a network error that had nothing to do with the Viewer. It is now
   explicitly re-required after the stubs are installed.

Also removed a tautological `|| true` assertion in V-C that was incapable of failing; it
now proves the grant is an in-memory type.

The native `react-native-pdf` and `react-native-safe-area-context` boundaries were added to
`tests/stubs/` so every suite that mounts the Files screen resolves them, instead of each
one growing its own copy.

### SLICE C REGRESSION

`homecloud-files-viewer` PASS (**188**, up from 133) -- `homecloud-files-ux` PASS --
`homecloud-files-favorites-ui` PASS -- `homecloud-files-slice1-selection-bulk` PASS --
`homecloud-files-freshness` PASS -- `homecloud-w1bc-pagination-reconciliation` PASS --
`homecloud-s4iii-files-surface` PASS -- `homecloud-files-hierarchy-ui` PASS --
`backend-syntax` PASS -- `migration-uniqueness` PASS -- `secrets` PASS -- frontend
`tsc --noEmit` PASS -- `eslint` on the Viewer: no new error and no new warning --
`git diff --check` clean.

Privacy review of the whole diff: no external PDF host, no CDN renderer, no signed URL in a
log, no persisted signed URL, no uploaded HTML execution, no public file URL.

**DEVICE_ACCEPTANCE_PENDING**: no physical device or emulator is available to this agent,
so inline PDF rendering, native paging/zoom, MOV/MP4 playback, audio playback and the
notch/safe-area result are NOT claimed here. Every one of those is on the Slice D
checklist.

### COMMIT

`feat(homecloud): close common file viewer ux`