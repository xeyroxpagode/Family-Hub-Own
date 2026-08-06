# PLANNER PHASE 0D-A - TECHNICAL REALITY AND DECISION MAP

STATUS: `OPEN_TECHNICAL_VALIDATION - TECHNICAL_REALITY_MAPPED`

RESULT: `PLANNER_PHASE_0D_A_TECHNICAL_REALITY_MAPPED`

Phase 0D-A connects the frozen product contract from Phase 0C with Current and V1 technical reality. It does not implement code, define final SQL, freeze endpoint payloads, or complete the final architecture. It produces the evidence-backed map that Phase 0D-B must use to define the technical architecture.

## 1. Safety And Refs

| Item | Value |
|---|---|
| Active worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation` |
| Expected branch | `planner-v1-plans-reconciliation` |
| Initial HEAD for this lot | `7e0225f` |
| V1 reference worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\reference-v1` |
| V1 ref | `f093bffaa7a7db6db7fc1b0072ba90352325a90a` |

Safety commands executed before writing:

```text
git branch --show-current -> planner-v1-plans-reconciliation
git rev-parse --short HEAD -> 7e0225f
git status --short ->
 M front/mi-front-limpio/components/planner/PlannerSheetHost.tsx
?? front/mi-front-limpio/services/planner/planCompositionTrace.ts
git log --oneline -8 -> HEAD 7e0225f docs(planner): freeze phase 0c product contract
```

Preexisting dirty state preserved and not modified:

| Path | State | Classification |
|---|---|---|
| `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | `M` | REC-0A instrumentation |
| `front/mi-front-limpio/services/planner/planCompositionTrace.ts` | `??` | REC-0A instrumentation helper |

Files intentionally modified by this lot:

| Path | Reason |
|---|---|
| `docs/implementation/planner/PLANNER_PHASE_0C_PRODUCT_CONTRACT_FREEZE.md` | Manual Condition normalization only |
| `docs/implementation/planner/PLANNER_FINAL_PRODUCT_AND_EXECUTION_BLUEPRINT.md` | Manual Condition normalization only |
| `docs/implementation/planner/PLANNER_PHASE_0D_A_TECHNICAL_REALITY_AND_DECISION_MAP.md` | New 0D-A report |

No code, DB migration, backend, tests, Supabase state, or V1 reference files were modified.

## 2. Authority Hierarchy

| Priority | Source |
|---|---|
| 1 | Product decisions frozen in Phase 0C |
| 2 | Runtime/manual evidence |
| 3 | Real code, DB, contracts, and DTOs |
| 4 | Recent reports |
| 5 | Tests |
| 6 | Historical documents |

A Current limitation is not allowed to redefine the 0C product contract. It is recorded as a gap and routed to 0D-B.

## 3. Primary Sources Read Completely

| Source | Role |
|---|---|
| `docs/implementation/planner/PLANNER_PHASE_0C_PRODUCT_CONTRACT_FREEZE.md` | Product authority |
| `docs/implementation/planner/PLANNER_FINAL_PRODUCT_AND_EXECUTION_BLUEPRINT.md` | Active product blueprint |
| `docs/implementation/planner/PLANNER_V1_FIRST_PORT_MANIFEST.md` | V1-first recovery and Current infrastructure map |
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md` | Plan graph/structure reality audit |
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P1_DOMAIN_CONTRACT_REPORT.md` | Structure domain contract and DB activation matrix |
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P2A_MILESTONE_EDITOR_REPORT.md` | Milestone editor checkpoint |
| `docs/implementation/planner/PLANNER_V1_PLAN_DUPLICATE_DISPATCH_REPORT.md` | Duplicate dispatch / REC-0 evidence |

Additional reports were located selectively for Tasks, Events, Plans, Presets/Drafts, Reliability, Attention, Activity, Home, Search, Trash, migration, privacy/RLS, and verification/evidence. They are cited in the matrix where relevant.

## 4. Manual Condition Normalization

`PRODUCT_FROZEN`

0D-A applies the requested normalization:

```text
Manual Condition legacy -> Milestone
```

Manual Condition is not canonical and is not a final visible product surface. Legacy Manual Condition data migrates to Milestone only. Requirement remains a separate canonical entity for external or prerequisite mandatory gates and is not the migration target for Manual Condition legacy data.

Normalized documents:

| Document | Normalization |
|---|---|
| `PLANNER_PHASE_0C_PRODUCT_CONTRACT_FREEZE.md` | Removed `Milestone or Requirement`; states Manual Condition legacy maps to Milestone |
| `PLANNER_FINAL_PRODUCT_AND_EXECUTION_BLUEPRINT.md` | Removed migration-to-Requirement wording; clarifies Requirement remains independent |

Contradiction resolved:

| Previous contradiction | Final resolution |
|---|---|
| Manual Condition could migrate to Milestone or Requirement depending meaning | Manual Condition migrates to Milestone. Requirement is independent and not a Manual Condition migration target |

## 5. Decision Register For 0D-A

| Decision | Status | Consequence for 0D-B |
|---|---|---|
| Plan is the only future visible root | `PRODUCT_FROZEN` | Goal migration/bridge must converge to Plan |
| Goal remains productive legacy until migration | `PRODUCT_FROZEN` | Need migration, resolver, and cache strategy |
| Manual Condition legacy migrates to Milestone | `PRODUCT_FROZEN` | Replace Current `manual_conditions` contract or bridge it internally to Milestone |
| Requirement is independent mandatory gate | `PRODUCT_FROZEN` | Keep Requirement model, satisfy/annul audit, activation/completion gates |
| Task belongs to zero or one Plan | `PRODUCT_FROZEN` | Current external requirement model lacks global uniqueness; must be extended/replaced |
| Event belongs to zero or one Plan | `PRODUCT_FROZEN` | Current external requirement model lacks global uniqueness/occurrence semantics; must be extended/replaced |
| Prepared Tasks/Events are not productive before activation | `PRODUCT_FROZEN` | Need Plan-local prepared representation and atomic materialization |
| Principal blocks completion; De apoyo does not | `PRODUCT_FROZEN` | Link/structure model must encode importance separately from Requirement classification |
| Completion is human, not automatic | `PRODUCT_FROZEN` | Readiness can project; transition still requires authorized actor |
| Completed and Closed are distinct | `PRODUCT_FROZEN` | Preserve lifecycle states and close reason |
| Archive is orthogonal terminal Plan visibility | `PRODUCT_FROZEN` | Active Plan uses `Cerrar y archivar`, not active archive |
| Reliability Current must be preserved | `TECHNICAL_FROZEN` | All productive writes remain through mutation intent, idempotency, replay, single-flight |

## 6. Contradiction Map

| Contradiction | Evidence | 0C Authority | 0D-A Direction |
|---|---|---|---|
| Current activation accepts Manual Condition as useful structure | `PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md` lines 424-431; P1 activation matrix accepts one manual condition | Manual Condition removed; legacy -> Milestone | Replace visible/manual-condition path; bridge/migrate existing Current manual condition nodes to Milestone |
| Current Task/Event Plan links use external requirements | Reconciliation audit Tasks/Events sections; `planner_plan_requirements.external_kind` | Task/Event can belong to at most one Plan and are not Requirements by definition | 0D-B must choose dedicated links or hard constraints/semantic extension that preserves zero-or-one and non-Requirement UX |
| Current completion can proceed with unresolved necessary requirements using `confirm_unresolved=true` | P1 Completion Contract | Requirements are mandatory gates anulables with reason | Replace bypass with explicit audited annulment or preserve only as internal bridge if 0D-B proves equivalence |
| Current Plan create is minimal draft without prepared items | Reconciliation audit, V1 manifest | Plan Preset creates Plan En preparación with prepared items after preview | Extend Plan create/structure with prepared representation and activation materialization |
| V1 Goals create active legacy Goal with progress mode | V1 manifest Goal mapping | Plan En preparación first; no Goal root; no universal percentage | Port UX fluency only; do not port Goal domain |
| Current external requirement can reference same Task/Event from multiple Plans | V1 manifest/reconciliation audit note no global uniqueness | Zero-or-one Plan per Task/Event | Add uniqueness/ownership strategy in 0D-B |
| Current purge/retention incomplete | 0A/0B/0C reports and gap audit | Retention windows frozen | Define jobs, hard delete/tombstones, Activity redaction in 0D-B |
| Evidence lifecycle exists conceptually but storage/upload queue not validated | Task fulfillment reports vs 0C evidence contract | Evidence per completion attempt with images/upload states | Add evidence attempt/storage/upload architecture; do not claim implemented |
| REC-0A Android Activate duplicated adapter/request/POST | User evidence and dirty instrumentation | Reliability must be preserved; no cause without proof | Gather trace evidence before diagnosing; do not remove instrumentation |

## 7. Technical Reality Matrix

| Area | Estado Current | Evidencia | Referencia V1 útil | Contrato 0C | Gap | Dirección técnica recomendada | Validación pendiente | Mini-lote futuro |
|---|---|---|---|---|---|---|---|---|
| Plan and Goal legacy | Current has canonical `planner_plans` plus legacy Goals and bridge. | `PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md`; `PLANNER_V1_FIRST_PORT_MANIFEST.md`; `M11_3A_PLAN_GRAPH_FOUNDATION_REPORT.md` | Goal list/detail flow and UX fluency | Plan only future root; Goal legacy migrates/resolves | Bridge partial; Home/Search/routes can still hit legacy IDs; `task.goal_id` remains legacy | Preserve Plan root and bridge; define automatic migration + guided conflicts + resolver | Mapping completeness, cache invalidation, route safety | `0D-B-MIGRATION-BRIDGE` |
| Plan structure | Current graph supports Plan, milestones, measurements, manual conditions, requirements, versions, changesets. | Reconciliation audit; P1 report; `M11_3A_*` | V1 milestone-in-detail pattern | Plan combines Tasks, Events, Milestones, Measurements, Requirements | Manual conditions exist technically; Tasks/Events not first-class Plan elements; prepared items absent | Keep changeset/version foundation; remove/bridge manual conditions; add prepared/task/event link model | Full graph constraints and 0C-compatible activation | `0D-B-PLAN-GRAPH` |
| Milestones | DB/table and P2A add/edit/delete/reorder exist; complete/reopen absent. | P2A report; P1 contract; reconciliation audit | V1 flat milestone editing pattern | Milestone is canonical phase/outcome; Principal/De apoyo; Manual Condition legacy -> Milestone | Lifecycle actions incomplete; classification naming differs (`necessary/supporting`) | Preserve Plan-owned milestone table and editor foundation; extend lifecycle complete/reopen and importance mapping | Android save/activate with one POST; lifecycle replay | `0D-B-MILESTONE-LIFECYCLE` |
| Measurements | Current DB supports measurements and history; no full UI create/edit/record. | Reconciliation audit; P1 report; M11.3A reports | V1 numeric progress only as migration clue | Measurement canonical numeric tracker; percentage only for measurements | UI/actions incomplete; history semantics need architecture | Preserve measurement/history foundation; add dedicated value record flow and indicators | Operator/history/RLS/replay tests | `0D-B-MEASUREMENT` |
| Requirements | Current supports requirement tree/wrappers and external requirements; no full UI; completion bypass exists. | Reconciliation audit; P1 report | No V1 equivalent | Mandatory gates; states pending/satisfied/annulled; annulment audited | Current `classification` necessary/supporting conflicts with mandatory-only product; `confirm_unresolved` conflicts with annulment model | Keep requirement entity but redefine UI/transition semantics as mandatory gates; remove optional/supporting meaning from visible contract | Audit reason/who/when; hierarchy MVP flat | `0D-B-REQUIREMENTS` |
| Plan-Task relationship | Current uses external requirement references; legacy Tasks use `goal_id`; no dedicated Plan-Task link. | V1 manifest §Task link; reconciliation audit Tasks section | Task from Goal, Goal task section | Task belongs to zero/one Plan; Principal/De apoyo; no many-to-many | External requirement permits multi-Plan; represents gate not execution relation; no create/link UX | Prefer dedicated Plan-Task link or enforce global uniqueness and semantics if extending external model; do not use `goal_id` for new links | DB uniqueness, scope sharing, lifecycle derivation | `0D-B-PLAN-TASK-LINK` |
| Plan-Event relationship | Current uses external requirements and `finalization_kind='event'` partial; no Event FK/link. | V1 manifest §Event link; reconciliation audit Events section | Calendar/Event form/recurrence UX | Event belongs to zero/one Plan; Final Event principal; past not resolved | No occurrence binding, no global uniqueness, final event incomplete | Define Plan-Event link with function/importance and optional final-event binding; preserve Event domain ownership | Series/occurrence identity and recurrence scopes | `0D-B-PLAN-EVENT-LINK` |
| Prepared Tasks/Events | Current has no product-ready prepared non-productive items. | 0C Blueprint; V1 manifest says open validation | V1 presets/forms for generating content | Prepared items inside Plan En preparación are non-productive before activation | No storage/materialization model | Add Plan-local prepared item representation and atomic activation materialization into Task/Event | Atomicity/idempotency/replay/offline | `0D-B-PREPARED-ITEMS` |
| Activation | Current backend activates draft only if milestone/measurement/manual condition exists and no necessary external requirement blocks. | Reconciliation audit activation; P1 activation matrix | V1 Goals start active (not portable) | Activate with useful primary Task/Event/Milestone/Measurement and no pending activation Requirements | Current excludes prepared Tasks/Events; includes Manual Condition; pending Requirement semantics need alignment | Replace activation gate with 0C gate; keep backend authority and separate activate mutation | DB/RPC activation matrix updated | `0D-B-ACTIVATION` |
| Pause/completion/close/archive | Current lifecycle supports draft/active/paused/completed/closed/archive/trash but confirmations incomplete. | Reconciliation audit lifecycle; M11 Frontend Plans | V1 complete/close/reopen/trash UX | Pause impact review; completion human; closed distinct; archive terminal | Pause entity impact missing; completion bypass via `confirm_unresolved`; archive capability reachability unvalidated | Preserve lifecycle states/Reliability; add confirmation orchestration and Requirement annulment path | Android lifecycle, capability/RLS, Activity | `0D-B-LIFECYCLE-FLOWS` |
| Recurrence and Final Event | Event recurrence exists in Event domain; final Plan event partial through requirements/finalization kind. | Event reports; V1 manifest; reconciliation audit Events | V1 Calendar day/week/month and Event form | No universal Realizado; Final Event requires occurrence outcome confirmation | No occurrence-level Plan binding; final-event satisfaction unclear | Keep Event recurrence domain; define Plan link to series/occurrence and final-event resolution state | Stable occurrence identity, offline edit scopes | `0D-B-FINAL-EVENT-RECURRENCE` |
| Presets | Presets/Drafts foundation exists; Plan Preset atomicity not implemented. | `M11_4A_PRESETS_DRAFTS_FOUNDATION_REPORT.md`; frontend preset reports | V1 quick forms/preset UX patterns | HomePlus immutable, personal/family rules; Plan Preset preview creates no productive items | No Plan Preset preview/materialization architecture | Preserve preset tables/RLS; add Plan blueprint payload + preview + Plan preparation creation path | Atomic activation, revision compatibility | `0D-B-PRESETS` |
| Creation Drafts | Draft table/service/autosave/recovery exists partially; TTL live/purge missing. | `M11_4A_*`; global surfaces reports | V1 form continuity | Creation Draft owner-only, multiple, 30d TTL, warning 7d, no productive entity | No `expires_at`/purge/warning complete; attachments open | Preserve owner-only draft foundation; add TTL/warning/discard/attachment strategy | RLS, offline autosave, owner switch | `0D-B-DRAFTS` |
| Verification/evidence | Task fulfillment and verification lifecycle PASS; evidence attempts/storage/upload queue not complete. | M11.1A/M11.1B reports; 0B/0C evidence sections | V1 task review flow only as UX clue | Evidence per completion attempt, images+comment, upload states, no self-verification | No validated storage/bucket/upload queue/attempt table implementation | Preserve fulfillment operations; add evidence attempt + storage + upload queue architecture | RLS, thumbnails, offline pending, Attention failed upload | `0D-B-EVIDENCE` |
| Attention | Current global Attention projection exists partial for tasks/events. | `M11_11A_2C_ATTENTION_ACTIVITY_REPORT.md`; 0C | V1 lacks equivalent | Action queue with primary action distinct from Open | Limited handlers; Plan/Draft/evidence/offline items missing | Preserve Attention infrastructure; extend handler taxonomy and invalidation rules | Primary actions, permissions, stale/offline states | `0D-B-ATTENTION` |
| Activity | Activity feed/projection partial; Detail DTO/redaction incomplete. | `M11_11A_2C_*`; 0C Activity/Purge | V1 activity only historical clue | Activity row opens redacted read-only Detail | No full Activity Detail DTO; purge redaction/tombstone incomplete | Preserve audit foundation; add DTO/redaction model and entity-open buttons | Permission filtering and purged entity behavior | `0D-B-ACTIVITY` |
| Trash/retention/purge | Trash/restore exists in domains; retention/purge jobs incomplete. | 0A/0B/0C; global surfaces; gap audit | V1 trash restore UX | Cancelled 30d -> auto Trash 7d -> purge; manual Trash 30d; tombstone minimal | No complete purge jobs; hard delete/tombstone references open | Define retention scheduler/jobs; domain-specific purge and redacted Activity | DB FK constraints, restore windows, no Search after purge | `0D-B-RETENTION` |
| Home/Search/routes | Home summary and Active Search partial; route resolver incomplete. | M8/M9 reports; Active Search report; 0A/0C | V1 entry/search affordances | One Plan projection; safe resolver; no Goal ID into Plan Detail without mapping | Legacy routing/cache inconsistencies | Preserve summary/search foundations; add Goal/Plan resolver and canonical destinations | Legacy IDs, cache invalidation, missing entity states | `0D-B-HOME-SEARCH-ROUTES` |
| Privacy/RLS | Personal/household scope and preset/draft RLS exist partially; Plan link sharing not complete. | Preset/Draft foundation; global surfaces technical audit; 0C privacy | V1 not authority | Personal data owner-only unless explicit share; no silent scope leaks | Linking personal Task/Event to household Plan needs sharing flow; scope edit open | Preserve RLS foundations; add cross-scope share/link rules and cache invalidation | RLS policy tests and household switch | `0D-B-PRIVACY-RLS` |
| Reliability/offline/idempotency | Current has mutation intent, durable ops, idempotency, replay, single-flight. | M11.7A/B/C; duplicate dispatch report; V1 manifest | V1 direct handlers only as UX baseline | Reliability Current must be preserved | Some product domains not integrated; REC-0A duplicate still under investigation | Keep Reliability runtime as mandatory write path; extend adapters not bypassing it | Android single POST per action, replay/noop/conflict | `0D-B-RELIABILITY` |
| REC-0A | Known: structure save showed one dispatch; activate showed duplicate adapter/request/POST on Android; static audit did not prove double mount; cause not demonstrated. Current dirty instrumentation records Plan composition mount/unmount. | Preexisting dirty `PlannerSheetHost.tsx`, `planCompositionTrace.ts`; duplicate dispatch report | V1 direct handlers show no Reliability cause | Do not diagnose without proof; do not modify instrumentation | Need runtime trace correlating host/detail/form instances, handler entries, adapter and POST counts | Gather Android trace with `[PlanCompositionTrace]` + `[PlanWriteTrace]`; classify cause only after evidence | One tap Activate with mounted instance counts and adapter/request/POST correlation | `REC-0A-RUNTIME-EVIDENCE` |

## 8. What Exists, Serves, Extends, Replaces

### Existing Foundations That Serve 0C

| Foundation | Classification | Preserve because |
|---|---|---|
| `planner_plans` canonical root and graph version | `CONFIRMED_EVIDENCE` | Supports Plan as root and versioned writes |
| Plan lifecycle states and mutation endpoint | `CONFIRMED_EVIDENCE` | Maps to En preparación/Activo/Pausado/Completado/Cerrado with extensions |
| Milestone table and P2A editor foundation | `CONFIRMED_EVIDENCE` | Milestone is canonical and Manual Condition migration target |
| Measurement/history tables | `CONFIRMED_EVIDENCE` | Required by 0C measurement-only percentage rule |
| Requirement tree/table | `CONFIRMED_EVIDENCE` | Required as canonical mandatory gate, though semantics need alignment |
| Planner Reliability runtime, mutation identity, idempotency, replay, single-flight | `TECHNICAL_FROZEN` | 0C and V1 manifest require preserving safety |
| Task fulfillment/verification lifecycle | `CONFIRMED_EVIDENCE` | Supports Task completion and verification rules |
| Event domain with recurrence concepts | `CONFIRMED_EVIDENCE` | Supports Event/Calendar foundation |
| Preset/Draft base tables and RLS foundations | `CONFIRMED_EVIDENCE` | Useful for product Presets/Drafts after extensions |
| Search, Home, Attention, Activity partial infrastructure | `CONFIRMED_EVIDENCE` | Useful global surfaces to extend, not replace wholesale |

### Mechanisms To Extend

| Mechanism | Required extension |
|---|---|
| Plan graph changesets | Add 0C-compliant prepared items, link semantics, and lifecycle actions |
| Activation readiness | Accept useful primary Task/Event/Milestone/Measurement; reject pending activation Requirements; remove Manual Condition dependency |
| Lifecycle transitions | Add pause impact, completion review, close/archive orchestration, audited Requirement annulment |
| Task/Event domains | Add zero-or-one Plan link, importance/function, cross-scope sharing, progress derivation |
| Presets/Drafts | Add Plan Preset preview/preparation/materialization and Draft TTL/warning/attachments |
| Attention/Activity | Add Plan/Requirement/evidence/offline/purge handlers and Activity Detail DTO |
| Trash/retention | Add domain retention windows, purge jobs, tombstones, redacted navigation |
| Reliability | Integrate every new write and materialization path through existing runtime |

### Mechanisms To Replace Or Retire

| Mechanism | Replacement direction |
|---|---|
| Manual Condition as visible or canonical structural node | Migrate/bridge legacy to Milestone |
| `planner_tasks.goal_id` as new link | Replace with Plan-compatible zero-or-one link/bridge |
| External requirement as generic Task/Event ownership without uniqueness | Replace or constrain with canonical Plan-Task/Plan-Event relationship |
| GoalDetail as final Plan route | Replace with PlanDetail plus transitional resolver |
| Universal Goal percentage/progress modes | Replace with hybrid deterministic indicators |
| Completion bypass with unresolved mandatory requirements | Replace with satisfy/annul gate semantics |

## 9. Migration And Bridge Needs

| Need | Status | Direction for 0D-B |
|---|---|---|
| Goal -> Plan migration | `OPEN_TECHNICAL_VALIDATION` | Automatic when unequivocal, guided conflicts only |
| `planner_plan_legacy_goal_links` bridge | `CONFIRMED_EVIDENCE`, partial | Preserve during transition, complete resolver semantics |
| `planner_tasks.goal_id` migration | `OPEN_TECHNICAL_VALIDATION` | Do not write for new Plan links; migrate to canonical Plan-Task link |
| Manual Condition -> Milestone | `PRODUCT_FROZEN`, technical open | Backfill/bridge Current manual condition rows as Milestones |
| Legacy progress modes | `PRODUCT_FROZEN`, technical open | Map numeric to Measurements; steps/boolean to Milestones where interpretable; no universal percent |
| Home/Search route resolver | `OPEN_TECHNICAL_VALIDATION` | Resolve Goal/Plan IDs safely, prevent Plan not found |
| Activity/purged references | `OPEN_TECHNICAL_VALIDATION` | Redacted tombstones only where needed |
| Cache invalidation | `OPEN_TECHNICAL_VALIDATION` | Define invalidation across migration, links, Home/Search/Attention |

## 10. REC-0A Status And Evidence Needed

Known state:

| Observation | Status |
|---|---|
| Structure save showed one dispatch | `CONFIRMED_EVIDENCE` from current known runtime statement |
| Activate showed duplication of adapter/request/POST on Android | `CONFIRMED_EVIDENCE` from user/runtime evidence |
| Static audit did not confirm double mounting | `CONFIRMED_EVIDENCE` / negative static evidence |
| Cause is not demonstrated | `OPEN_TECHNICAL_VALIDATION` |
| Current instrumentation must not be modified in this lot | `TECHNICAL_FROZEN` for this lot |

Future REC-0A mini-lot must gather:

1. `[PlanCompositionTrace]` alive instance counts for `PlannerSheetHost`, form hosts, Plan detail, and any legacy Goal detail candidate around one Activate tap.
2. `[PlanWriteTrace]` correlation of lifecycle handler, mutation identity, enqueue, adapter execution, request, POST, and terminal callback.
3. Android trace showing whether duplicate adapter/request/POST share one mutation/idempotency identity or have distinct identities.
4. Evidence whether duplicate starts before Reliability, inside adapter execution, in request layer, or through component composition.
5. Proof before any fix. No root cause may be declared from static code alone.

## 11. Risks

| Risk | Severity | Why |
|---|---|---|
| Current external requirement model reused as Plan-Task/Event link without uniqueness | P0 | Violates frozen zero-or-one cardinality and Requirement meaning |
| Manual Condition remains in canonical UI/activation | P0 | Contradicts normalized 0C |
| Completion bypass remains as substitute for annulment | P0 | Violates mandatory Requirement contract |
| Prepared Tasks/Events become productive before activation | P0 | Violates Plan Preset and preparation semantics |
| REC-0A fixed without runtime proof | P0 | Could damage Reliability or mask duplicate root cause |
| Goal and Plan remain parallel visible roots | P0 | Violates final product root decision |
| Retention/purge implemented without redacted Activity/tombstones | P1 | Privacy/history integrity risk |
| Evidence storage/upload added without RLS/offline states | P1 | Verification privacy and correctness risk |
| Scope sharing for personal entities into household Plans omitted | P1 | Privacy leak risk |
| 0D-B writes architecture from docs only without code/DB validation | P1 | Could freeze impossible or unsafe contract |

## 12. Decisions 0D-B Must Close

These are technical decisions, not product decisions:

| Decision | Status |
|---|---|
| Dedicated Plan-Task/Plan-Event tables vs constrained extension of external requirements | `OPEN_TECHNICAL_VALIDATION` |
| Exact prepared Task/Event storage and activation materialization path | `OPEN_TECHNICAL_VALIDATION` |
| Manual Condition table retirement/backfill/compat bridge | `OPEN_TECHNICAL_VALIDATION` |
| Requirement gate implementation replacing `confirm_unresolved` with audited annulment | `OPEN_TECHNICAL_VALIDATION` |
| Plan activation RPC changes for Task/Event/Milestone/Measurement useful primary gate | `OPEN_TECHNICAL_VALIDATION` |
| Final Event binding to series/occurrence and outcome confirmation | `OPEN_TECHNICAL_VALIDATION` |
| Evidence attempt tables, Storage buckets, upload queue, RLS, thumbnails, retention | `OPEN_TECHNICAL_VALIDATION` |
| Draft TTL/warning/purge and draft attachments | `OPEN_TECHNICAL_VALIDATION` |
| Retention/purge jobs and tombstone schema | `OPEN_TECHNICAL_VALIDATION` |
| Home/Search/route resolver and cache invalidation | `OPEN_TECHNICAL_VALIDATION` |
| REC-0A duplicate root cause classification | `OPEN_TECHNICAL_VALIDATION` |

No product decisions are reopened by 0D-B.

## 13. Recommended Order For 0D-B

1. Preserve Reliability boundary and collect REC-0A runtime evidence before any lifecycle architecture change.
2. Define canonical Plan graph target: remove/bridge Manual Condition and align Milestone/Measurement/Requirement semantics.
3. Decide Plan-Task and Plan-Event technical relationship with zero-or-one uniqueness, scope sharing, and function/importance.
4. Define prepared Task/Event representation and atomic activation materialization.
5. Define activation/completion/Requirement annulment RPC semantics.
6. Define lifecycle orchestration: pause, close, archive, reopen, Activity.
7. Define Goal migration, `task.goal_id` migration, route resolver, Home/Search/cache bridge.
8. Define Presets/Drafts TTL and Plan Preset preview/preparation architecture.
9. Define evidence/storage/upload queue/offline and Attention handlers.
10. Define retention/purge/tombstones and Activity Detail redaction.
11. Produce implementation order and test/runtime gates.

## 14. Final Summary

### Foundations Current To Preserve

- Canonical `planner_plans` root, Plan graph, versioned changesets, Plan lifecycle foundation.
- Milestone and Measurement tables/history foundations.
- Requirement entity as mandatory gate foundation, after semantic alignment.
- Task fulfillment/verification operations.
- Event domain and recurrence foundations.
- Preset/Draft base tables and owner/scope RLS foundations.
- Home/Search/Attention/Activity foundations as partial global surfaces.
- Reliability runtime, mutation identity, idempotency, replay, and single-flight.

### Mechanisms Current That Must Extend

- Activation/completion readiness and transition gates.
- Plan structure editor and lifecycle UI.
- Task/Event link model, progress derivation, and cross-scope sharing.
- Plan Preset preview/preparation/materialization.
- Draft TTL/warning/attachment behavior.
- Evidence attempts, storage, upload queue, and review surfaces.
- Attention handlers and Activity Detail DTO.
- Trash retention, purge, tombstones, and redacted navigation.
- Home/Search/route resolver/cache invalidation.

### Mechanisms That Must Replace

- Manual Condition as canonical product node or activation dependency.
- Legacy Goal root, GoalDetail as final Plan route, and `planner_tasks.goal_id` for new Plan links.
- External requirements as unconstrained substitute for Task/Event ownership.
- Universal percentage/progress modes.
- Requirement completion bypass without audited annulment.

### Required Migrations

- Goal -> Plan.
- Manual Condition -> Milestone.
- Legacy Goal progress modes -> Milestones/Measurements/indicators.
- `planner_tasks.goal_id` -> canonical Plan-Task link or migration bridge.
- Legacy routes/Home/Search IDs -> safe resolver mappings.
- Trash/purge/tombstone migration where references require integrity.

### Required Bridges

- `planner_plan_legacy_goal_links` until migration completes.
- Legacy Goal ID resolver for routes, Home, Search, Activity.
- Compatibility read path for `task.goal_id` until Task links migrate.
- Manual Condition read bridge if physical removal is staged.
- Activity redaction bridge for purged/migrated entities.

## 15. Final Verdict

```text
PLANNER_PHASE_0D_A_TECHNICAL_REALITY_MAPPED
```

Phase 0D-A mapped Current reality, V1 useful references, product-frozen 0C contracts, gaps, replacement/extension directions, migration/bridge needs, REC-0A evidence requirements, and the recommended order for Phase 0D-B.

Phase 0D-B may now define the technical architecture. It must not reopen frozen product decisions.
