# M11.7A Reliability Durable Operation Foundation Report

## 1. Directive And Scope

PROJECT: HomePlus Planner V1
LANE: Reliability
MILESTONE: M11.7A - Reliability Operation Foundation
EXPECTED RESULT: RELIABILITY_FOUNDATION_IMPLEMENTATION_COMPLETE

Implemented a frontend-local, domain-neutral Reliability foundation for Planner operations. The work is limited to Reliability-owned modules, focused Reliability tests, and this report. No productive Tasks, Events, Plans, Presets/Drafts, navigation, UI, backend, Supabase, migration, or global wiring was modified.

## 2. Historical Branch

Historical branch: `planner-v1-reliability`
Historical worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\reliability`

Inspection commands:

```text
git branch --show-current -> planner-v1-reliability
git rev-parse HEAD -> 678e88ed1e0ba4572b8d1035c5243546d78cfc8f
git status --short -> clean
git log -5 --oneline --decorate -> 678e88e, b6ab681, 26e29f9, fb4efc8, c2a544b
git worktree list --porcelain -> historical worktree remains registered at reliability
```

## 3. HEAD Historico

HISTORICAL_BRANCH_HEAD: `678e88ed1e0ba4572b8d1035c5243546d78cfc8f`

The historical branch was not moved, rebased, merged, reset, force-updated, cherry-picked, amended, cleaned, or otherwise modified.

## 4. Historical Worktree Status

HISTORICAL_WORKTREE_STATUS: clean

No local dirty files were present in the historical worktree during inspection.

## 5. Historical Commits Preserved

Command:

```text
git log --oneline --decorate c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9..planner-v1-reliability
```

Result:

```text
678e88e (planner-v1-reliability) feat(planner): add reliability operation foundation
```

Ancestry:

```text
git merge-base planner-v1-reliability c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9
-> b6ab6814a62d7a28b003e48c3fa469fe1f60430f

git merge-base --is-ancestor planner-v1-reliability c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9
-> exit 1

git merge-base --is-ancestor c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9 planner-v1-reliability
-> exit 1
```

The old implementation was treated as reference material only; it was not cherry-picked or merged in bulk.

## 6. New Worktree Strategy

Created a second worktree from the mandatory canonical base, preserving the historical branch and worktree intact.

Pre-checks:

```text
refs/heads/planner-v1-reliability-m11-7a existed -> false
Test-Path reliability-m11-7a -> false
```

Creation command:

```text
git worktree add -b planner-v1-reliability-m11-7a C:\Users\thega\Desktop\HomePlus-worktrees\reliability-m11-7a c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9
```

## 7. New Branch

`planner-v1-reliability-m11-7a`

Initial snapshot:

```text
git branch --show-current -> planner-v1-reliability-m11-7a
git rev-parse HEAD -> c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9
git status --short -> clean
```

## 8. New Worktree

`C:\Users\thega\Desktop\HomePlus-worktrees\reliability-m11-7a`

## 9. Canonical Base

Base: `c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9`

Verification:

```text
git cat-file -e 'c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9^{commit}' -> exit 0
git show --no-patch --format=fuller -> feat(planner): integrate presets and drafts frontend
git show --stat --oneline -> 14 files changed, 1034 insertions(+), 11 deletions(-)
```

## 10. Mutation Identity Inventory

Current authority:

- `front/mi-front-limpio/services/api.ts`
- `front/mi-front-limpio/services/planner/plannerMutationIntent.ts`

Findings:

- `generateMutationId()` creates `mut_<timestamp>_<counter>`.
- `createIdempotencyKey(operation)` creates `idem_<operation>_<timestamp>_<random>`.
- `requestJson()` preserves caller-provided `mutationId`, `idempotencyKey`, and `expectedVersion`.
- Mutation headers are `X-Mutation-Id`, `Idempotency-Key`, and `If-Match`.
- Request identity is generated as `X-Request-Id` in `requestJson()`, and response request ID is parsed from header/envelope.
- `plannerMutationIntent.ts` is the Planner identity authority and explicitly states retry must clone/preserve identity.

Reliability consumes these identities through `PlannerMutationIntent` and does not generate a second mutation authority.

## 11. Idempotency Inventory

Tasks, Events, Plans, Presets, and Drafts pass stable idempotency options into `requestJson()` or domain service wrappers. Canonical result outcomes already used by Planner are:

```text
created
updated
noop
replay
```

The Reliability descriptor persists `mutationId`, `idempotencyKey`, `requestHash`, `expectedVersion`, operation kind/domain, scope, and dependencies.

## 12. Optimistic State

Current files:

- `services/core/serverState.ts`
- `services/planner/plannerCache.ts`
- `services/planner/plannerOptimisticState.ts`
- `services/planner/homeTaskOneTapCompletion.ts`
- `services/planner/plannerEventsFrontend.ts`

Findings:

- Core server state owns pending mutation snapshots, rollback, reconcile, discard, and generation checks.
- Planner cache wraps server state with household scoped keys and invalidation helpers.
- Existing optimistic flows rollback on conflicts/offline/server errors and preserve uncertain state where domain code already models it.
- Reliability does not mutate current optimistic domain flows; it provides a durable operation lifecycle for future domain adapters.

## 13. Uncertain State

Existing uncertain concepts:

- `plannerOptimisticState.ts` has `uncertain`.
- `plannerAutosaveCoordinator.ts` has autosave `uncertain`.
- `plannerPlans.ts` projects uncertain sync state.
- Error adapters classify timeout/offline paths for safe UI behavior.

Reliability adds durable state `uncertain` for requests that may have reached the backend and must be replayed or reconciled with the same identity.

## 14. Draft Autosave

Current files:

- `hooks/usePlannerDraftAutosave.ts`
- `storage/plannerDraftAutosaveStorage.ts`
- `services/planner/plannerAutosaveCoordinator.ts`
- `services/plannerDrafts.ts`

Findings:

- Current draft autosave storage is memory-backed and owner/draft scoped.
- Current autosave coordinator is pure state, not durable offline queue.
- It preserves identity for uncertain retries and handles `created`, `updated`, `noop`, and `replay`.

Reliability does not modify Draft autosave production logic. It adds a neutral adapter policy where the default is no coalescing, and domain adapters may explicitly supersede only pending, never-sent autosaves.

## 15. Cache

Current cache:

- `plannerCache.ts` over `core/serverState.ts`
- Household keyed planner keys in `plannerKeys.ts`
- Generation invalidation on household switch/sign-out
- Directed invalidation for Tasks, Events, Goals, Plans, Summary, Trash, Calendar, Capabilities, Presets, Drafts, Search

Reliability reconciliation is two phase: persist confirmed result, call adapter reconcile/cache logic, persist `reconciliationAppliedAt`, cleanup later.

## 16. Realtime

Current realtime is not globally wired for this foundation. Existing Supabase client/Auth subscriptions were inspected but no new channels were created.

Reliability adds a neutral realtime bridge that:

- validates scope;
- deduplicates signals;
- ignores old versions;
- identifies related operations;
- requests reconciliation;
- never confirms operations directly.

## 17. Durable Storage Chosen

Chosen dependency: `@react-native-async-storage/async-storage`, already declared in `front/mi-front-limpio/package.json`.

Implementation:

- `operationStore.ts` defines `PlannerDurableOperationStore`.
- `plannerDurableOperationStore` uses a lazy `require('@react-native-async-storage/async-storage').default`.
- Test storage injects the same `getItem/setItem/removeItem` shape.

No `package.json` or lockfile was modified.

## 18. Architecture Implemented

Files under `front/mi-front-limpio/services/planner/reliability/`:

- `types.ts`
- `operationIdentity.ts`
- `operationStateMachine.ts`
- `operationStore.ts`
- `operationQueue.ts`
- `operationScheduler.ts`
- `retryPolicy.ts`
- `dependencyGraph.ts`
- `errorClassifier.ts`
- `reconciliation.ts`
- `realtimeBridge.ts`
- `observability.ts`
- `domainAdapters.ts`
- `index.ts`

The queue is serializable and adapter-driven. It knows durable operation mechanics, not domain business rules.

## 19. Descriptor

Implemented `PlannerPendingOperation<TPayload>` with:

- `schemaVersion: 1`
- `localOperationId`
- `mutationId`
- `idempotencyKey`
- `requestHash`
- `domain`
- `operationType`
- `ownerPartition.authenticatedUserId`
- personal or household scope
- optional entity and expected version
- payload
- dependency IDs
- creation timestamp

`requestHash` uses deterministic stable JSON plus FNV-1a hashing.

## 20. State Machine

Implemented exact states:

```text
pending
in_flight
uncertain
retrying
conflicted
confirmed
```

Invalid transitions throw. Hydration converts persisted `in_flight` to `uncertain`.

## 21. User And Household Protection

`assertPlannerOperationScopeMatchesPartition()` prevents:

- executing another user's operation;
- executing a household operation under the wrong active household.

Personal operations remain same-user scoped and independent of active household.

## 22. Dependency Ordering

`dependencyGraph.ts` implements:

- dependency sorting;
- direct/indirect cycle detection;
- blocking on missing dependencies;
- blocking on uncertain/in-flight dependencies;
- blocking on conflicted dependencies;
- allowing dependencies only after confirmation.

## 23. Retry

`retryPolicy.ts` implements:

- configurable base delay;
- max delay;
- max attempts;
- bounded jitter;
- `Retry-After`;
- injectable random source.

`operationQueue.ts` persists `nextRetryAt` and moves retry exhaustion to `conflicted` with `retry_exhausted`.

## 24. Lost Response

Ambiguous abort/timeout errors become `uncertain`, preserving:

- mutation ID;
- idempotency key;
- request hash;
- expected version;
- attempt metadata;
- request-may-have-reached-server flag.

Re-draining an uncertain operation replays the same operation through its adapter.

## 25. Replay

Authoritative outcomes `noop` and `replay` confirm the operation. Tests cover lost acknowledgement followed by restart and replay with unchanged identity.

## 26. Reconciliation

`reconciliation.ts` implements:

1. persist confirmed state and authoritative result;
2. call adapter reconciliation;
3. persist `reconciliationAppliedAt`;
4. cleanup later by retention policy.

No global merge policy or last-write-wins behavior was implemented.

## 27. Conflicts

`errorClassifier.ts` normalizes:

- version conflict;
- idempotency conflict;
- validation;
- authorization;
- not found;
- retry exhaustion;
- unknown non-retryable.

Conflicts preserve local descriptor/payload, stable code, expected/current versions when available, request ID metadata, and authoritative state when supplied by backend error details.

## 28. Cleanup

Confirmed operations are removed only when:

- state is `confirmed`;
- authoritative result is persisted;
- reconciliation was applied;
- retention time passed;
- no dependents reference the operation.

Cleanup is idempotent and partition scoped.

## 29. Realtime Hooks

`realtimeBridge.ts` implements neutral signal intake and returns either ignored reasons or `reconciliation_requested`. It does not open channels, subscribe, confirm, delete, or reconcile by itself.

## 30. Observability

`observability.ts` implements:

- injectable observer;
- no-op default;
- sanitized metadata;
- observer failure isolation.

Events include enqueue, dedupe, start, uncertain, retry, conflict, confirmed, reconciled, discarded, cleanup, rehydrated, scope blocked, realtime received, reconciliation requested, and quarantined record names.

Payloads, titles, descriptions, notes, locations, people, email, tokens, secrets, raw responses, and stacks are not emitted.

## 31. Files Modified

Reliability-owned implementation:

```text
front/mi-front-limpio/services/planner/reliability/types.ts
front/mi-front-limpio/services/planner/reliability/operationIdentity.ts
front/mi-front-limpio/services/planner/reliability/operationStateMachine.ts
front/mi-front-limpio/services/planner/reliability/operationStore.ts
front/mi-front-limpio/services/planner/reliability/operationQueue.ts
front/mi-front-limpio/services/planner/reliability/operationScheduler.ts
front/mi-front-limpio/services/planner/reliability/retryPolicy.ts
front/mi-front-limpio/services/planner/reliability/dependencyGraph.ts
front/mi-front-limpio/services/planner/reliability/errorClassifier.ts
front/mi-front-limpio/services/planner/reliability/reconciliation.ts
front/mi-front-limpio/services/planner/reliability/realtimeBridge.ts
front/mi-front-limpio/services/planner/reliability/observability.ts
front/mi-front-limpio/services/planner/reliability/domainAdapters.ts
front/mi-front-limpio/services/planner/reliability/index.ts
```

Reliability tests:

```text
scripts/planner_m11_7a_reliability_tests.ts
scripts/planner_reliability_test_globals.d.ts
scripts/tsconfig.planner_reliability_test.json
```

Report:

```text
docs/implementation/planner/M11_7A_RELIABILITY_DURABLE_OPERATION_FOUNDATION_REPORT.md
```

## 32. Exact Tests

PASS:

```text
Command:
npx --yes --package typescript tsc -p scripts/tsconfig.planner_reliability_test.json

Exit code: 0
Result: Reliability TypeScript compilation passed.
```

PASS:

```text
Command:
$env:NODE_PATH=(Resolve-Path 'tests\stubs').Path
node scripts\compiled-reliability\scripts\planner_m11_7a_reliability_tests.js

Exit code: 0
Assertions: 64 passed, 0 failed
Result: Reliability behavior suite passed.
```

Notes:

- The test compile emitted `scripts/compiled-reliability`; generated files were removed before final diff/commit.
- Root `npm exec tsc -- -p scripts/tsconfig.planner_reliability_test.json` initially failed because the worktree has no installed `node_modules` and npm resolved the wrong `tsc` shim. A transient `npx --package typescript` invocation was used without modifying manifests or lockfiles.

NOT RUN:

```text
npm run typecheck
npm run test:planner
```

Reason: no local `node_modules` are installed in this worktree. Installing dependencies is outside scope and was not performed.

## 33. Risks

- Productive domain adapters are not registered yet; this is a foundation and not end-user wiring.
- Storage quarantine is parser-level and testable, but observer emission for quarantined records is not globally wired until a queue-level storage observer is introduced.
- Existing Draft autosave storage remains memory-backed because changing it is outside Reliability scope for this milestone.
- Full frontend typecheck and full planner suite were not run because dependencies are not installed locally.

## 34. Blockers

No blocker for the local Reliability foundation.

Environment blocker for broader gates: local `node_modules` are absent, so repository-wide TypeScript/front-end test scripts cannot run without installing dependencies.

## 35. Integration Requests

- Domain lanes should implement and register adapters for Tasks, Events, Plans, and Draft autosave.
- Integration should decide where the scheduler starts/stops in authenticated Planner lifecycle.
- Integration should connect realtime signals to authoritative fetch/replay rather than direct confirmation.
- A future lane should add UI/Attention surfaces for durable conflicted/uncertain operations.
- A future lane may add queue storage quarantine observability wiring at app startup.

## 36. Supabase

SUPABASE: NOT USED - no lock acquired; no migrations; no reset; no remote

No backend, RPC, RLS, migration, Supabase lock, or remote command was used.

## 37. Commit Final

Commit message required:

```text
feat(planner): add reliability operation foundation
```

Commit hash is recorded after final commit.

## 38. Final Git State

To be recorded after final validation and commit:

```text
git diff --check
git status --short
git rev-parse HEAD
git show --stat --oneline HEAD
git log -4 --oneline --decorate
```
