# HOMECLOUD FILES — STAGE 2 EXECUTION LOG

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

## PHASE 0 — GLOBAL SAFETY PREFLIGHT (read-only)

**PASS.**

- Starting working tree: clean, exactly as expected.
- Baseline suites at the start: `homecloud-files` PASS, `homecloud-s2i` PASS,
  `homecloud-recovery` PASS, `homecloud-t2-d1` PASS.
- Local runtime rule (§21): `backend/.env` advertises a LAN Supabase URL while the
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

## PHASE 1 — NESTED FOLDER HIERARCHY

### PROVENANCE OF THE DIRTY TREE (recovery)

After the run was stopped on a concurrent-write blocker, this session resumed as the
only authorized writer. Every dirty path was classified before anything was changed:

| Class | Paths |
|---|---|
| **A — this run's Phase 1 work** | `backend/src/lib/homecloudFolderHierarchy.js`, `backend/src/services/homecloudFilesService.js`, `backend/src/services/homecloudReadService.js`, `backend/src/lib/homecloudMappers.js`, `backend/src/routes/homecloud.js`, `backend/src/controllers/homecloud.files.controller.js`, `front/.../services/homecloud/homecloudFolderTree.ts`, `front/.../services/homecloud/homecloudMoveDestinations.ts`, `front/.../services/homecloud/homecloudTypes.ts`, `front/.../services/homecloud/homecloudFilesService.ts`, `front/.../services/homecloud/homecloudMoveDestinations.ts` consumers (`FileMoveDestinationPicker.tsx`, `FileActionHost.tsx`, `FileIntake.tsx`, `homecloudFileIntakeService.ts`, `homecloudFileIntakeTypes.ts`), `front/.../screens/HomeCloudFilesScreen.tsx`, `scripts/homecloud_files_hierarchy_runtime_tests.js`, `scripts/homecloud_files_hierarchy_ui_tests.ts`, `scripts/homecloud_files_hierarchy_migration_tests.js`, `scripts/tsconfig.homecloud_files_hierarchy_ui_test.json`, `scripts/homecloud_s4ii_search_contract_tests.js`, `scripts/homecloud_files_selection_bulk_tests.ts`, `tests/run.js`, `.gitignore`, `supabase/migrations/20261005000000_homecloud_folders_hierarchy_v2.sql` |
| **B — foreign competing migration** | `supabase/migrations/20261005000000_homecloud_nested_folders_v1.sql` — resolved and deleted in this recovery, with owner authorization |
| **C — pre-existing / unknown** | none found |
| **D — generated / test artifact** | `scripts/compiled-files-hierarchy-ui/` (added to `.gitignore`, never committed) |

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
   cycles — via a trigger, so a direct table write cannot bypass it.
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

### MIGRATION COLLISION — HOW IT WAS RESOLVED

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
  is RE-APPLICAble — a second run converges instead of failing.
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

1. `homecloud_s4ii_search_contract_tests.js` — `folder SEARCH does not list folders` is
   SUPERSEDED. It asserted flatness as an accident: with a flat model a folder had no
   subfolders, so listing any was meaningless. It is replaced by three STRONGER
   assertions that the subfolder read is scoped to the current folder, uses the literal
   `ilike` pattern, and never carries a content `.or()` filter. Assertion count went
   from 43 to 47; nothing was removed.
2. `homecloud_s4ii_search_contract_tests.js` — the folder-name encoder check no longer
   matches a source substring against one local variable name. It now asserts the
   emitted filter EQUALS the canonical encoder's own output, which is a stronger claim.
3. `homecloud_files_selection_bulk_tests.ts` — import only. The destination grammar
   moved to its own pure module so the contract is testable without a device. Assertion
   count unchanged at 168; C35-C42 all intact.
4. Ordering — the client-side sort that duplicated the server's collation was removed.

### KNOWN DEBT CARRIED

- `41e9145` (shared upload pump) is still pending sync into Memories. NOT solved here.
- No physical device was available. Pull-to-refresh feel, long-press feel, context-menu
  placement, native pickers, native save/share, media playback, PDF and Office
  external-open are UNPROVEN_DEVICE.