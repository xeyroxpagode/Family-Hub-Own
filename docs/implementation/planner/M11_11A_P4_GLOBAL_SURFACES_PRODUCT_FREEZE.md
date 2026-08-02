# M11 — 11A.P4 Global Surfaces Product Freeze

**MILESTONE:** Planner V1 — 11A.P4 Global Surfaces Product Freeze
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
**BRANCH:** `planner-v1-11a-p4-global-surfaces-product-freeze`
**BASE:** `0d664a173a87cd03ac5e363054b24f1d8425988e`
**DATE:** 2026-08-02
**SCOPE:** Documentation-only. No code, contracts, backend, navigation, UI, Supabase, package or lockfile changes.

---

## 1. Freeze status

```text
PLANNER V1 — GLOBAL SURFACES PRODUCT FREEZE

STATUS: FROZEN
HUMAN APPROVAL: APPROVED
APPROVAL DATE: 2026-08-02
CHANGE REQUEST: CR-M11-11A-GLOBAL-SURFACES-001
MILESTONE: 11A.P4
CANONICAL AUTHORITY: PLANNER_V1_M11_FUNCTIONAL_FREEZE.md version 1.3
IMPLEMENTATION: NOT YET AUTHORIZED
NEXT GATE: 11A.1 Technical Architecture / Contract Readiness Audit
```

---

## 2. Authority and precedence

This document records the Global Surfaces product freeze voted by the P3
decisions and confirmed on 2026-08-02. It is not a legal authority on its own:
the canonical frozen authority is `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
version 1.3 which holds the visible rules.

This document provides:

- The full Change Request.
- The impact analysis.
- The entity surface matrix.
- The supersession ledger with remaining technical gaps.
- The technical audit questions for 11A.1.
- Implementation exclusions.
- The traceability chain back through P0/P1/P2.

When this document or a P2/P1/P0 research paper conflicts with the Functional
Freeze v1.3 or the Decision Registry after CR-M11-11A-GLOBAL-SURFACES-001, the
canonical authorities prevail.

---

## 3. Change Request

**CHANGE ID:** CR-M11-11A-GLOBAL-SURFACES-001

**REQUESTER:** Human Product Owner / Control General

**REASON:** Close the Global Surfaces after the Readiness Audit (11A.0),
Factual Inventory (P0), Comparative Research (P1A–P1D), Integrated Synthesis
(P2) and the P3 Human Decisions.

### CURRENT FROZEN BEHAVIOR

Deal honestly with what was in the prior freeze that is being
modified:

- Search included visible Drafts, Presets, People, Settings, actions and routes.
- Quick Actions described only as tile creation.
- Persistent Drafts entered Trash and had 30-day recovery.
- Planner V1 did not allow manual permanent deletion.
- Archive was concentrated mainly in Plans.
- Trash was either Planner-local or fragmented (PlannerTrashScreen) + (PlannerPresetDraftsTrashScreen).
- Activity/Attention did not have the new frontend distribution closed.

### PROPOSED FROZEN BEHAVIOR

The P3-voted decisions embedded in section 4 of this document and the
canonical regulations listed in the Functional Freeze v1.3 section 1.3.

### IMPACT ANALYSIS

| Dimension | Impact |
|---|---|
| Product | A single coherent global layer: Home as hybrid orienter, the one Quick Actions+Search surface, Attention+Activity under one surface with tabs, a global Trash with module filters, per-module Archive, the Draft discard model, and the permanent-delete/Empty-Trash gates. Home without module grid/permanent Search bar; Inventory gated. |
| Frontend | New surfaces and routable contracts for global Search, Attention/Activity tabs, global Trash with entity filters, contextual Archive modules. The existing `PlannerSheetHost` and center-tab-button reuse for the shared QA+Search surface. The current Draft-restore flow will retire. |
| Backend | New endpoint for global Search (or aggregator atop planner search). Endpoint for global Attention (source, counts). Endpoint for global Trash aggregation. Endpoint for unrecoverable delete (permanent + Empty Trash). Endpoint for Activity feed. Archive-per-entity. |
| Data / Migrations | Persistent draft-restore data may need a one-time validation/cleanup (self-clean local Drafts on discard). Soft-delete inventory items for global Trash integration (now not yet, later). |
| API | New serialization schemas: Search result, Attention item, Trash entry, Activity grouped-entry. |
| Permissions | Coordinator role gains permanent-delete + Empty-Trash permissions inside Trash. Any operator keeps move-to-Trash / restore permissions. Geni is always visually identified. No coordinator auto-gain to private personal data. |
| Offline / Reliability | Permanent delete / Empty Trash never offline. Otherwise no offline flow change; operations stay queued or deferred as M11.7 defines. |
| Search / Indexing | Reduced index scope (no Drafts, Presets, People, Settings, Routes). Active scope is Tasks/Events/Plans. Hidden-content context on demand only. |
| Activity / Attention | Aggregation separated; Activity badge-free; reading/view does not clear Attention. |
| Privacy | Now applied before every surface rank, badge, group, results and recents. Household reset after every switch; no coordinator auto-full-access. |
| QA | New acceptance matrices + screen rotation tests for Search, global Trash, Attention/Activity, Archive-per-module. No code terms in UI. |
| Existing data compatibility | Legacy Plan/Milestone restore from Trash not through reliability yet; archived_at defined with full per-entity rule. |

### RISK

- Existing persistent Draft restorable objects conflict with `Descartar` immediate definitive rule.
- Unrefactored DraftTrash/DraftRestore++ in backend/frontend will be inconsistent unless 11A.1 audit catches them.
- Permanent Delete / Empty Trash can be executed only by coordinator-by-capability; cannot run offline; partial failure might leave orphan data.
- Global Trash aggregation pulling from several backend endpoints might aggregate hierarchically (Tasks, Events, Plans, Presets).
- Hidden-content scope memory that user has to manually filter could annoy if Search interaction not well thought-out.
- Archive contextual per entity is a modular concept: no group, mass actions.
- Inventory Archive & Inventory Trash are approved but not to be implemented now because the Inventory restore/ contract/UX is not defined.

### EXPLICIT HUMAN APPROVAL

APPROVED — 2026-08-02

---

## 4. P3 human approval

All 12 P3 decisions (GS-01 through GS-12) are frozen as per the human
approval on 2026-08-02. They live in:

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` section 1.3
- `PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md` block 11A.P3/CR-M11-11A-GLOBAL-SURFACES-001
- `PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md` sections GS-V1 to GS-V11

No decision may be reopened without a new Change Request.

---

## 5. Frozen architecture

```text
Global Equilibrada

Bottom Navigation
  Home
  People
  Add (Quick Actions + Search)
  Planner
  More

AppTopBar
  Household switch + role
  Attention icon (badge when unresolved)

[Seach (inside Add surface)]
├── Buscar en HomePlus...   = bar
└── Acciones rápidas
      Tarea · Evento · Plan
      Geni (when exists)

Attention / Activity
    [Tab: Atención  ]   [Tab: Actividad ]
```

Search within `Add` -> full-screen, not in the sheet. Grouped by module/entity.  
Attention icon -> `Atención&Actividad` screened dual tab.  
Trash: global with filters (More → Papelera).  
Archive: contextual per module, accessible from local Planner/etc menus.

To the full navigation map, see P2 §10.2 (Arquitectura B).

---

## 6. Home

Responsibility: orient, prioritize and give continuity.

What Home contains:

- visible household context;
- conditional Attention excerpt (only when >0 real items);
- Today / Next;
- Planner continuance when valuable;
- Inventory exception (already supported);
- offline/stale/partial error states.

Absent from Home:

- persistent Search bar;
- back-references to all modules;
- a module grid;
- Activity feed/teaser;
- Trash preview;
- Archive rows;
- decorative metrics;
- full Planner or Inventory lists;
- full forms.

Attention excerpt:

- Appears only when there are items; includes `Ver todo`; resolves not by reading.

Continuity & Today row tap → canonical entity Detail.
Minimal inline actions only if their safety has been proven and are not the
freeze immutable rules (future implementation may define but do not start now).

---

## 7. Quick Actions and Search

### Quick Actions

- Open grid (no cards/borders), responsive.
- Center `+` opens sheet with `Buscar en HomePlus...` above the QA grid.
- Fixed order: Tarea, Evento, Plan.
- Duplicates, Templates, Drafts, Inventory, lifecycle, Archive, Trash are excluded.
- Geni future 4th action (no placeholder).

### Search

- Except from the `Quick Action + Search` sheet → Search bar → full-screen Search.
- Results by module/entity grouping.
- Opens canonic destination.
- No duplicate Detail inside Search.
- Scope: currently active Tasks, Events, Plans (no Inventory, no Presets, no Drafts, no people/settings/routes).

Hidden content scopes via explicit chips:
- `Archivados`
- `Papelera`
  (No mix with active results).

SearchResults in Trash context: `En Papelera` + retention time + recover + Delete definitively (coordinator only).

---

## 8. Attention and Activity

### Access

Top bar bell icon, badge only when unresolved Attention exists.

### Screen

Navegación → `Atención y actividad`, tabs:
- `Atención` (badge count for current person/household)
- `Actividad` (no badge)

### Attention rules

- Items that require intervention/decision may contain one primary action + `Abrir`.
- Reading / viewing does not resolve.
- Remain until real validated resolution.
- Group by importance/impact > decision proximity > time proximity > recency.
- No presentation of anonymous general activity.
- No Inventory here (initial): Inventory Exception may still exist in Home.

### Activity rules

- Chronological nice plain timeline.
- Grouped by day, entity, process.
- NO unread state, NO subtle new dot, NO `Marcar todo como leído`.
- NO badge.
- NO inline mutations (open canonical destination).
- No record of keyboard, navigation, search, sync, app screen visits, technical logs.

#### Gen
- When Geni process has started & is pending proposal, it appears in Attention.
  When final and executed, a single row grouped in Activity with "Ver proceso" open to sequence.
  Three independent rows not allowed.
- Failed/uncertain Geni process never appears as success: stays/returns to Attention.

Inventory is excluded from global Attention and Activity but may keep its
existing exception integration in Home.

---

## 9. Geni process representation

> (Note: Geni is not yet implemented; no placeholder).

- Attention: Geni identified, pending proposal requiring confirmation.
- Row: one confirm/abort action + `Abrir`.
- Activity: grouped row with summary "Geni cambió el..." "Ver proceso".
- Steps inside an expansion: each shows "Geni action"/"Human action"/"Result".

---

## 10. Trash

Global Trash under "More -> Papelera" with module/entity filters + overflow
retention of 30 days.

Entities recoverable: Tasks, Events, Plans, Presets, Inventory Items (when
Inventory restore contract is drop-in ready).

Restore:
- Anyone with permissions restores the entity.
- If broken relations appear, show blocker/dialog/review. No false success.

Permanent delete: only coordinator; explicit confirmation per item/type;
consequences not rubicon like cannot-undo.

Empty Papelera: coordinator only; confirmation/high-confirmation + no offline + partial
failure visible with success and failure groups.

No administrative bulk selections / multiple selections / restore / delete,
`Vaciar Papelera` is the single batch action.

Drafts are NOT in trash.

Retention copy: "Se eliminará el 26 de agosto · quedan 24 días", etc.

---

## 11. Draft discard

Drafts are now:

- Private by creator.
- Never appear in Home, QuickActions, Search, Attention, Activity, Trash, or Archive.
- Only operation: `Descartar borrador` = immediate and definitive.
- No more "Enviar a Papelera" / "Restaurar borrador eliminado".

---

## 12. Archive

### Archive is contextual

No single global Archive screen in V1.

Archivable entities:
- Plans (existing scope Up to archiving);
- Tasks, Events, Presets (expanded);
- Inventory Items (approved result but waits for Inventory polish/contract).

Each module shows its own contextual Archive.

Archive does NOT change completion/cancel/close state:
- Completed Task + Archive → Still completed, not active, may be unarchived.
- Canceled Event + Archive → still canceled.
- Archived Plan -> still closed/completed, can be unarchived.
- Preset archived → Not shown in library, not offered for creation.
- Inventory archived → Preserves history and relationships; not in active inventory / alerts.

Archive

- has no auto-retention time (no purge).
- does not allow direct permanent delete.
- a permitted user may unarchive or move to papeler.

---

## 13. Permanent delete and Empty Trash

### Permanent Delete

Only available inside Trash view, for coordinator role only.

Requires:
- Clear what entity, the type, any extra note.
- List consequences (can not be undone, can be recovered).
- Runs after backend confirmation, not offline.
- Not shown as success until back-end says; if fails, remains.

### Empty Trash

- `Vaciar Papelera` is a batch destructive action inside Trash full screen.
- Shows count, entity types, consequences.
- Only coordinator.
- Does not run offline.
- Partial batch failure tolerant: successful removed, failed remain tagged.

### Regular Trash actions

- Move (soft-delete) → anyone with the entity permissions.
- Restore → anyone with same permissions.

### V1 bulk actions exclusion

No additional mass operations:
- No multiselect
- No multi-restore
- No multi-archive
- No multi-delete (apart from emptyza coordinator).

---

## 14. Search hidden-content contexts

Search by default shows active content.

Active context: visible for active Tasks, Events, Plans.
Hidden contexts via explicit chips:
- `Archivados`
- `Papelera`

They never mix silently with the active default results.

For each hidden result:
- Trash → "En Papelera" + retention time + recovery context.
- Archive → "Archivado" + archive destination + Desarchivar capability.

---

## 15. Privacy and roles

Apply BEFORE:

rank/badge/recents/grouping/results/Activity/Attention/Trash/Archive etc.

- personal/household filter
- permission filter
- owner filter

Rules

- personal content not disclosed into household feed.
- Changing household resets badges and recents.
- Geni is always identified.
- Activity = collaborative (not surveillance). No keyboard, click logs, syncs.
- No titles/counts/existence leaking cross-people.
- Coordinator never auto-gains personal private content, unless rules explicit.

---

## 16. Entity / Surface Matrix

| Entity | Home | Search active | Search archived | Search Trash | Quick Actions | Attention | Activity | Trash | Archive | Permanent Delete | Permissions | Canonical destination | Initial implementation status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Task | Today/next excerpt | Yes (active) | Yes (explicit archived context) | Yes (explicit trash context) | No (Quick Actions for create only) | Yes (verify, correction, overdue-if-actionable, conflict) | yes (lifecycle/assignment changes & completions) | Yes | Yes (contextual) | No (only coordinator in Trash) | Personal or household scope; coordinator Permanent/Empty Trash | Task Detail | Navigator OK |
| Event | Today/next | Yes (active) | Yes (explicit archived context) | Yes (explicit trash context) | No (creation only) | Yes (rsvp, conflict, meaningful time change) | Yes (create/edit/cancel/attendance) | Yes, aware of recurrence | Yes (contextual) | No (only coordinator in Trash)  | participant/scope-gate | Event Detail | OK |
| Plan | Continuity + blocker | Yes (active) | Yes (archive context) | Yes (explicit trash context) | No (creation only) | Yes (blocker/review/uncertain) | Yes (lifecycle/structure) | Yes | Yes (contextual) | No | owner/household role | Plan Detail | OK |
| Preset | No | No (exempt) | No | Yes (explicit trash context) | No | No | No (library events only) | Yes | Yes (when no active) | No (coordinator in Trash) | template manager | Preset Library/Detail | OK |
| Draft | **Never** **–** (explicit remove) | Never | Never | Never | Never | Never | Never | Never | Never | Never | Owner-only emptyspace | None | P4 retire draft persistence |
| Inventory Item | *Exception only* | No (initial) | No (not yet) | No (not yet) | No (no until mature) | No (initial) | No (initial) | Pending (when restore contract ready) | Pending (when ready per module contract) | Pending coordinator (global) | household + sensitive labels guarding | Inventory screen fagsto/item destination  ( when defined") | Inventory disabled in global/global stacks early |
| Restock request | Attention only through Inventory? | Not in initial search |  |  | Not | Only if awaiting approval |  | After closed | Not |  | coordinator/adult/requester rules (any basic flow) | Inventory request context | _ |

---

## 17. Phone / Tablet

Phone:
- Quick Actions bottom-sheet, Search full-screen, Attention/Activity = tabs full screen, Trash full-screen, Archive contextual (full-screen) open. 
- text visible.

Tablet:
- Home: dos columnas (same priority).
- Search: overlay o split.
- Trash filters + list elements.
- Same capacities as phone.

(no, no expand to double/take space.)

---

## 18. Accessibility

- Android 48 dp minimal hit target (iOS 44 pt).
- Dynamic Type and reflow adapt.
- All screen readers announce (counts and consequences).
- Focus visible, order logical.
- No color-only.
- Reduce Motion respects the system pref — no extra motion courtesy.
- Confirmaciones con contexto y pantalla.
- Severe actions announce No puede deshacerse/restablecer lo pertinente.
- Offline/stale banner announce.
- Purge date sentido común date (human-readable).

See more details in the UX/UI Freeze Contract GS-V8 etc.

---

## 19. Empty/loading/error/offline states

- Every surface: present empty state helpfully; clicking opens canonical module.
- Stale und offline: Show data + one header banner.
- Partial error: Because module failed, but remaining sections appear (no full-page fail).
- No technical codes, entity talst, raw stacks.

---

20. Superseded rules

Final supersession index with cross-links:

| PARENT | Location in v1.2 FFS | Replacement by CR R1 |
|--------|------------------------|-----------------------------|
| Global searchable Drafts, People, settings, actions, routes | §3.1, §4.3, §22 | §1.3.3, §1.3.4 |
| Quick Actions only "tile-based create" layout | §3.1, §4.3 | §1.3.3 (surface Search + QA combined) |
| Drafts go to Trash + 30-day recovery | §7.3 Trash retention, §12.5 Draft deletion | §1.3.8 (immediate Discard, definitive) |
| No automatic immediate permanent deletion | §7.3 Trash retention, §19 (explicit exclusions) | §1.3.10 (Eliminar definitivo + Vaciar Pa, sólo coordinator, inside Trash) |
| Archive only for completed Plan | §10.3 Plan lifecycle, §10.16 Archive | §1.3.9 (Task, Event, Plan, Preset, Inventory: proposiciones, contextual) |
| Trash separated or fragmented | §3.2 core entites/link, §13.2 (Phone surfaces) | §1.3.7 (single global, module filters) |
| Inventory was "cross-module" without clear gate | §3.2 core limites de-feature | §1.3.3-3.5 + entity/surface matrix restricts to Start -->
| Home earlier with "module gateways, Search at top, Activity, full Inventory" (§13, §22 22 Package D) | | §1.3.2 (#Home híbrida without module grid, no permanent Search, no Inventory-overexposure) |
| Activity had unread states + no feed arrangement | §14.4 Activity | §1.3.5 — simple chronological / no badge / no middle-immersive inline / Inventory excluded initial |
| No global Attention tab but separate texts (`Requiere Respuesta` / `Próximo`) | §14.2.1 attention center | §1.3.5 single surface with tab Attention + Activity |
| No 'coordinator is allowed to permanently delete' previously prohibited | §7.3 (global 07), §19.2 | §1.3.10—coordinator cap, only inside Trash, explicit confirmation |
| Inventory global participation implicitly presumed by cross-module context | §3.2 cross-module, §21 traceability sums | §6 entity matrix + §18 'excl Drawer initial' |

---

## Technical audit questions (for 11A.1 — DO NOT RESOLVE NOW)

1. How to provide live Search data for initial active Tasks/Plans/Events
(grouped) with correct security/RLS filtering.

2. Canonical SearchResult routes -> concrete files that know to open the right
plan/list/detail.

3. Retiring draft persistent Recovery route (several paths exist already)
safely without causing UI crash.

4. Migration or compatible cleanup for already-existing persistent Draft rows
(if any) before disabling Restore.

5. Archive context paths per entity (Overlay chips? How to get Archive
per-module for Task /Events from Plan.)
 MOIUX

6. Inventory Archive still waiting for Inventory polish: may include
pantry or supply links.

7. Global Trash aggregation: endpoints or union with local Planner/Preset/maybe Inventory.
8. Exact restore "previous state" for entities that go through hard-restore.
9. Coordinator-specific capability: confirm existence of permission node for
   perm-delete and batch.
10. Empty Trash: transactional partial failure can be implemented what fallback?
11. Offline/degraded for the permanent mutation gate drawer (never offline)?
12. Search hidden scope: how to express active/archived/trash and
    Presentation states.
13. Attention source/index and count servers.
14. Activity producer: grouping entry, not excessive noise.
15. Geni process correlations (multi-step confirm/exc).
16. Offline reliability for these global edges.
17. Privacy / RLS changes for global + blank context.
18. Retention/30-day count, purge mechanism clean-up.

They must be replied before any implemented.

---

## 22. Implementation exclusions

Not in this P4 / Gersen freeze or following commit:
- No code, No contracts, No rudder, No navigation, no navigation.
- No backend definitions.
- No P4 defines any Supabase migration.
- No push/deep API.
- No design data-collection stats/tests.
- No final colors from 11C.
- Inventory is excluded from Search, Attention, Activity, global Trash initially.

This document does **NOT** start the M11.1A stage. It only freezes the product.

---

## 23. Traceability

- P0 – Mster verified realities baseline.
- P1A-P1D – research and comparative comparative.
- P2 – Synthesis M11P2 product&recommendation.
- P3 – human vote; CR → this document.

Authoritative flet: `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` v1.3 + `FINAL_DECISION_REGISTRY` + `UX/UI_FREEZE_CONTRACT` . This +P4 pack closes.

---

## 24. Validation notes

- ` git diff --check `, `--stat` only documents.
- No code changed. 4 files + 1 new. No package.lock. No backend. No Supabase.

---

## 25. Freeze signature

```text
PLANNER V1 - GLOBAL SURFACES PRODUCT FREEZE

STATUS: FROZEN
HUMAN APPROVAL: APPROVED
APPROVAL DATE: 2026-08-02
CHANGE REQUEST: CR-M11-11A-GLOBAL-SURFACES-001
MILESTONE: 11A.P4
CANONICAL AUTHORITY: PLANNER_V1_M11_FUNCTIONAL_FREEZE.md version 1.3
IMPLEMENTATION: NOT YET AUTHORIZED
NEXT GATE: 11A.1 Technical Architecture / Contract Readiness Audit
```