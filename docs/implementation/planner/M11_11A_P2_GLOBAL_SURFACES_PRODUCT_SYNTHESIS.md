# M11 - 11A.P2 Global Surfaces Product Synthesis

**MILESTONE:** Planner V1 - 11A.P2 Global Surfaces Product Synthesis
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
**BRANCH:** `planner-v1-11a-p2-global-surfaces-synthesis`
**BASE:** `1b5dea24f5c0ddfb3b5163dd77be095b05f90876`
**DATE:** 2026-08-02
**SCOPE:** Product synthesis only. No code, contracts, backend, navigation, UI, Supabase, package, lockfile, or Product Freeze changes.

---

## 1. Executive Summary

This report integrates P0 and the four P1 research reports into one coherent product definition for HomePlus Global Surfaces: Home, Quick Actions, Search, Attention, Activity, Trash, Archive, and future Geni.

The strongest integrated conclusion is that HomePlus should separate four mental models:

1. **Home orients and prioritizes.** It shows the household context, the most important next things, and safe entries to canonical modules.
2. **Quick Actions starts frequent canonical creation.** It should remain a compact action grid for mature global flows.
3. **Search retrieves existing confirmed content.** It should not become Geni, a command launcher, or a duplicate module detail.
4. **Attention and Activity explain different things.** Attention is unresolved human intervention; Activity is what happened.

The provisional integrated recommendation for discussion is **Architecture B - Global Balanced**:

- Home is hybrid: household/header, visible Search affordance, short Attention excerpt, Today/Next, limited Planner continuity, Inventory exception-only, module gateways.
- Quick Actions uses the existing center button model with `Crear tarea`, `Crear evento`, `Crear plan`; Geni may become a fourth action later.
- Search is separate from Quick Actions and Geni, initially focused on confirmed accessible content, with hidden content excluded by default.
- Attention and Activity live in one shared surface with tabs, where only Attention drives badges.
- Trash is a global recovery surface with filters and strict privacy. Archive starts locally, first where it is semantically strong.
- Inventory participates cautiously: searchable and exception-visible, but not promoted to global mutation flows until product and technical maturity improve.

This is not a Product Freeze. The output is a discussion packet for P3.

---

## 2. Evidencia Incorporada

### 2.1 Hechos internos verificados

Sources:

- `docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md`
- `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`

Verified facts:

- Planner is the most mature module: Tasks, Events, Plans, Presets, Drafts, Calendar, Details, SheetHost, local Trash, and M11.7C Reliability runtime exist.
- Inventory is functional but less mature: one screen, local search, categories, templates, quantity mutations, restock requests, alerts, soft delete, and basic role treatment exist.
- The app shell has five bottom tabs: Home, People, Add, Planner, More.
- The current center Add button opens Planner actions through the existing Planner sheet host.
- No global Search exists.
- No global Attention center exists.
- No global Activity frontend exists.
- Planner Activity has a backend endpoint but no frontend consumer.
- Trash exists locally and fragmentedly inside Planner/Presets/Drafts; Inventory has soft delete but no recovery UI.
- Plan Archive has route/service coverage but no complete screen.
- Geni is future and not implemented.
- Planner V1 functional freeze states that Quick Actions and global Search belong to HomePlus, not only Planner.
- Planner V1 freeze preserves: one identity projected into multiple surfaces, canonical details, Draft privacy, 30-day Trash recoverability, no immediate manual permanent deletion, Attention, Activity, badges, offline/reliability, and privacy boundaries.

### 2.2 Hallazgos de research P1

- P1A Quick Actions/Search: global actions should be few, object-independent, and routed through canonical creation flows. Search should be separate from Quick Actions and from Geni.
- P1B Home: Home should orient, prioritize, and provide continuity. It should not become a mini version of every module or a full Activity feed.
- P1C Attention/Activity: Attention is action-required and persists until resolved; Activity is chronological history and should not drive the global badge.
- P1D Trash/Archive: Completed, Closed, Cancelled, Archive, Trash, Restore, and Permanent Delete must remain semantically distinct.

### 2.3 Inferencias usadas

- Because Planner is mature and Inventory is not, Planner can safely contribute more to first global surfaces than Inventory.
- Because Geni is future, current surfaces must reserve conceptual room without shipping placeholders or making Search depend on it.
- Because global navigation is minimal today, the first integrated architecture should avoid forcing a large shell redesign before P3/P4 decisions.

### 2.4 Decisiones todavia pendientes

The user must still decide global architecture, Home hierarchy, Search entry/scope, Quick Actions catalog, Geni placement, Attention/Activity model, badge semantics, Trash/Archive scope, privacy posture, inline actions, hidden content, and permanent delete policy.

---

## 3. Responsabilidad De Cada Superficie

| Surface | Responsabilidad inequívoca | No debe hacer |
|---|---|---|
| Home | Orientar, priorizar y dar continuidad sin duplicar modulos. | No renderizar detalles completos, feeds largos, formularios, papelera, archivo ni todos los filtros de Planner/Inventory. |
| Quick Actions | Iniciar acciones globales frecuentes mediante flujos canonicos. | No mezclar busqueda, navegacion secundaria, mutaciones sobre objetos existentes o acciones inmaduras de Inventory. |
| Search | Encontrar contenido existente y navegar a su destino canonico. | No interpretar intenciones, no ejecutar acciones por defecto, no reemplazar a Geni. |
| Attention | Mostrar elementos que requieren intervencion o decision humana. | No incluir actividad general ni cambios informativos. Leer no resuelve. |
| Activity | Explicar que ocurrio en el hogar y sus modulos. | No pedir accion como funcion principal ni incrementar badge global. |
| Trash | Recuperar elementos eliminados dentro de su retencion. | No ser archivo, historial o filtro de completados. |
| Archive | Conservar elementos fuera de vistas activas. | No significar completado, cerrado, cancelado ni eliminado. |
| Geni | Futuro interprete que propone y ejecuta acciones confirmadas. | No reemplazar Search ni crear flujos paralelos a formularios canonicos. |

### 3.1 Solapamientos detectados

| Solapamiento | Resolucion provisional |
|---|---|
| Home vs Attention | Home muestra excerpt corto; Attention conserva la cola completa. |
| Home vs Activity | Home puede mostrar teaser solo cuando Activity exista; Activity conserva timeline. |
| Search vs Geni | Search recupera contenido confirmado; Geni interpreta, propone y actua con confirmacion. |
| Quick Actions vs Geni | Geni puede ser una accion global futura, pero con comportamiento propio. |
| Search vs Trash/Archive | Search excluye ocultos por defecto; Trash/Archive tienen filtros explicitos. |
| Trash vs Archive | Trash es eliminacion recuperable; Archive es preservacion fuera de vistas activas. |
| Home vs Planner | Home proyecta excerpts; Planner conserva listas, calendario, detalles y edicion. |
| Home vs Inventory | Home muestra excepciones; Inventory conserva busqueda local, lista y mutaciones. |

---

## 4. Conflictos Entre Informes

| Conflicto | Origen | Alternativas | Compatibilidad | Consecuencia | Recomendacion provisional | Decision necesaria |
|---|---|---|---|---|---|---|
| Search bar en Home vs lupa global en AppTopBar | P1A, P1B | Barra visible; lupa global; ambas staged | Compatibles si una es principal y la otra secundaria | Barra descubre mejor; lupa escala mejor | Barra visible en Home/header, lupa secundaria posible despues | Si |
| Attention primero vs Today/Next primero | P1B, P1C | Attention top; Today top; hibrido | Compatibles con reglas de urgencia | Attention top reduce olvidos; Today top calma agenda | Header/Search, luego Attention si existe, luego Today/Next | Si |
| Activity preview en Home vs no mostrar Activity | P1B, P1C | Ninguno; teaser corto; feed | Compatible solo si teaser no domina | Feed crea ruido; teaser da continuidad | Sin Activity en Home hasta surface global; luego teaser corto opcional | Si |
| Attention y Activity separadas vs tabs | P1C | Pantallas separadas; pantalla con tabs; bandeja unificada | Separadas/tabs compatibles con mismo modelo | Tabs reducen nav; separadas maximizan claridad | Una pantalla con tabs | Si |
| Quick Actions Planner-only vs launcher multimodulo | P1A, P0 | Planner-only; module-aware; full launcher | Incompatibles en modelo mental inicial | Launcher aumenta scope y costo | Mantener 3 Planner actions por madurez; no launcher aun | Si |
| Cuarta accion futura Geni | P1A, P1B, freeze | 4ta accion; header; Search; Home block | Search replacement incompatible | 4ta accion preserva modelos | Futuro 4to Quick Action, sin placeholder | Si |
| Acciones inline desde Home | P1B, freeze | Solo abrir; abrir+complete; aprobaciones | Aprobaciones chocan con contexto | Home puede volverse mutation surface riesgosa | Abrir por defecto; complete solo si probado y fiable | Si |
| Acciones inline desde Attention | P1C | Todas por tipo; una principal; abrir solo | Compatibles segun riesgo | Mas utilidad vs mas permisos/costo | Una accion principal + abrir; ampliar por tipo aprobado | Si |
| Papelera global vs papeleras por modulo | P1D, P0 | Global filtrada; local; actual fragmentada | Global permite entradas locales prefiltradas | Global exige privacidad fuerte | Global Trash con filtros y entradas locales | Si |
| Archive local vs pantalla conjunta Papelera/Archivados | P1D | Local Archive; global Archived; hidden-content | Local y global posterior compatibles | Global temprano puede confundir Archive/Trash | Archive local primero | Si |
| Plans como primer Archive vs mas entidades | P1D, freeze | Plans; Plans+Presets; multiples | Plans first no cierra futuro | Menor costo y semantica fuerte | Plans first, evaluar Presets next | Si |
| Inventory en Search/Home/QA/Attention/Trash | P0, P1A-D | Participacion plena; excepciones; staged | Participacion plena choca con madurez | Riesgo de duplicar o exponer flows inmaduros | Search/Attention excepciones staged; no QA mutations; Trash later | Si |
| Archivados/eliminados en Search | P1A, P1D, freeze | Excluir default; filtros explicitos; incluir | Default incluir choca con sorpresa/privacidad | Mas recuperabilidad vs ruido | Excluir default; incluir explicitamente | Si |
| Privacidad Drafts | Freeze, P1C, P1D | Owner-only; coordinador metadata; excluir global | Owner-only compatible con recovery global | Exposicion dañaria confianza | Owner-only en Search/Trash/Activity | No si se respeta freeze |
| Badges leido/visto/resuelto | Freeze, P1C | Badge unresolved; badge unread; module badges | Unread Activity incompatible con badge action-required | Riesgo de badge ruidoso | Badge = Attention sin resolver | Si |
| Permanent delete | Freeze, P1D | Defer; restricted; full | Full incompatible con freeze V1 | Irreversibilidad y audit | Defer; owner-only Draft exception only if needed | Si |
| Acciones masivas | P1D | No bulk; restore bulk; full bulk | Full bulk choca con privacidad/permisos | Riesgo de cambios masivos accidentales | No bulk V1 | Si |

---

## 5. Principios Integrados

1. One entity, many projections: Home/Search/Attention/Activity route to canonical destinations.
2. Search retrieves; Geni reasons; Quick Actions creates.
3. Attention is unresolved intervention; Activity is history.
4. Badges count unresolved Attention only.
5. Hidden content is explicit: Archive and Trash are excluded from active Home and default Search.
6. Draft privacy is owner-only across all global surfaces.
7. Inventory joins global surfaces in stages because its current product maturity is lower.
8. No global surface should bypass Planner's canonical forms, details, lifecycle, Reliability, or freeze semantics.
9. Home should be useful with little data and trustworthy with lots of data.
10. Destructive, approval, and dependency-heavy operations require context.
11. Phone is single-column and focused; tablet can use split views and filter rails.
12. Offline, partial errors, and stale data must be visible without converting every issue into Attention.

---

## 6. Arquitectura A - Conservadora

### 6.1 Direccion

Preserve the current shell and add the fewest global surfaces needed. Home gets better prioritization. Search entry is visible mainly on Home. Attention/Activity stay under More as separate or minimally shared destinations. Trash remains Planner-led with a path toward global.

### 6.2 Definicion conjunta

| Area | Definicion |
|---|---|
| Navegacion global | Bottom nav unchanged: Home, People, Add, Planner, More. |
| Home | Hybrid but conservative: header, Home Search, top Attention excerpt, Today/Next, Inventory exception, module gateways. |
| Search | Home-first full-screen Search; local Inventory search remains. |
| Quick Actions | Existing center Add with 3 Planner creates. |
| Attention | Dedicated route under More or Home "Ver todo"; limited initial signals. |
| Activity | Planner/household Activity under More, no Home teaser until useful. |
| Trash | Planner Trash remains primary; global Trash prepared as product direction but not forced. |
| Archive | Planner Plan Archive local only. |
| Planner | Canonical module remains source for details/forms/lists. |
| Inventario | Home exception-only, local search/actions only. |
| Geni | Future, no visible placeholder. |
| Phone | One-column Home and full-screen lists. |
| Tablet | Home two-column; lists may use split detail later. |
| Privacy | Strict owner-only Drafts and household switch reset. |
| Roles | Existing capability/role posture; no new matrix here. |
| Badges | Home/More badge only for unresolved Attention if enabled. |
| Empty states | "Nada urgente", "Sin actividad reciente", "Papelera vacia". |
| Offline | Show stale sections and safe read-only content. |
| Partial errors | Section-level error, not whole Home failure. |

### 6.3 Strength

Lowest navigation risk and closest to current implementation.

### 6.4 Weakness

May keep recovery and attention too hidden; global Search can feel less global.

---

## 7. Arquitectura B - Global Equilibrada

### 7.1 Direccion

Create a coherent global layer without turning HomePlus into a command center. Home is hybrid, Search is visible, Quick Actions remain compact, Attention/Activity share one surface, Trash is global with filters, Archive remains local first.

### 7.2 Definicion conjunta

| Area | Definicion |
|---|---|
| Navegacion global | Bottom nav stays stable. More contains Search fallback, Attention/Activity, Trash, settings/module entries. |
| Home | Header/household, visible Search, Attention excerpt, Today/Next, Continuar, Inventory exception, module gateways. |
| Search | Full-screen global Search from Home/header; results grouped by entity/module and route canonically. |
| Quick Actions | Center Add open grid: Crear tarea, Crear evento, Crear plan. Future Geni fourth action. |
| Attention | Tab in a shared Attention/Activity surface; unresolved, deduped, action-required. |
| Activity | Second tab in same surface; chronological, grouped, read state only. |
| Trash | Global Trash under More with module/entity filters and local prefiltered entries. |
| Archive | Local module/entity archive, first Plans; global Archived only later if multiple entities justify it. |
| Planner | Primary mature contributor, but not duplicated by Home. |
| Inventario | Search result candidate; Home exception source; Attention only for actionable stock/restock cases; Trash later after restore rules. |
| Geni | Distinct future action; proposals enter Attention only when confirmation needed, confirmations enter Activity. |
| Phone | Home single-column; Search/Attention/Activity/Trash full-screen; tabs at top. |
| Tablet | Home main + side column; Search overlay/split; Attention/Activity and Trash list-detail. |
| Privacy | Personal content filtered before ranking/grouping; Drafts owner-only; sensitive Inventory labels controlled. |
| Roles | Coordinador/adulto for approvals; menores see assigned/shared eligible content only. |
| Badges | Global badge = unresolved Attention count; Activity has no global badge. |
| Empty states | Each surface gives truthful no-content state and entry to canonical module. |
| Offline | Search may show cached confirmed content; Attention badge can be stale-labelled; mutations open canonical reliable flows. |
| Partial errors | Surface-level partial failure by module; do not hide available modules. |

### 7.3 Strength

Best balance of clarity, commercial polish, current maturity, privacy, and future growth.

### 7.4 Weakness

Requires the user to accept a global layer and a shared Attention/Activity model before implementation.

---

## 8. Arquitectura C - Global Expandible

### 8.1 Direccion

Move toward a central global hub: stronger all-surface Search, a module-aware launcher, a unified recovery/hidden-content center, personalization hooks, and explicit room for more modules and Geni.

### 8.2 Definicion conjunta

| Area | Definicion |
|---|---|
| Navegacion global | AppTopBar includes global Search icon; More becomes a global operations hub. |
| Home | Personalized hybrid Home with configurable module gateways and stronger global excerpts. |
| Search | Search from all surfaces; recents, filters, hidden-content modes, and future command suggestions. |
| Quick Actions | Module-aware launcher: Planner creates now, Geni future, Inventory create later when mature. |
| Attention | Could be shared tabs or unified inbox with strong filters. |
| Activity | Strong household timeline with filters by person/module/entity/Geni. |
| Trash | Global Recovery Center: Trash, Archive, restore problems, recent restores. |
| Archive | Global Archived once several entities support it. |
| Planner | One mature module among many; canonical detail still preserved. |
| Inventario | More global presence: create item later, hidden/recovery later, richer Search. |
| Geni | First-class global assistant action plus labelled Activity and Attention proposals. |
| Phone | Search/launcher/recovery must stay focused; risk of too many chips. |
| Tablet | Strongest fit: split panes, filter rails, command palette-like Search. |
| Privacy | Requires the strongest policy and technical audit before implementation. |
| Roles | Role filtering becomes global and must be audited. |
| Badges | Attention count global plus per-module optional counts. |
| Empty states | Personalized suggestions, recent modules, setup guidance. |
| Offline | More complex cached Search/launcher/recovery expectations. |
| Partial errors | Requires robust module health states and partial results. |

### 8.3 Strength

Most scalable when HomePlus has more mature modules.

### 8.4 Weakness

Highest risk of overbuilding, privacy mistakes, and navigation churn before the current product needs it.

---

## 9. Comparativa

| Criterion | A Conservadora | B Global equilibrada | C Global expandible |
|---|---|---|---|
| Clarity | High locally, medium globally | High | Medium unless carefully governed |
| Simplicity | Highest | High | Medium-low |
| Planner fit | Very strong | Strong | Strong but less central |
| Inventory maturity fit | Strong caution | Balanced caution | Risky unless staged |
| Search value | Medium | High | Highest |
| Attention/Activity clarity | Medium | High | Medium-high |
| Trash/Archive semantics | Medium | High | High but heavy |
| Privacy risk | Low-medium | Medium | High |
| Technical cost | Lowest | Medium | Highest |
| Navigation churn | Lowest | Low-medium | Highest |
| Future Geni | Deferred | Cleanly reserved | Strong but may dominate |
| Commercial quality | Safe but less ambitious | Best | Powerful but premature |

---

## 10. Mapa De Navegacion

### 10.1 Arquitectura A

```text
Bottom Navigation
  Home
  People
  Add
    Crear tarea
    Crear evento
    Crear plan
  Planner
  More
    Inventory
    Planner trash
    Attention
    Activity

AppTopBar
  Household switch
  Role chip
  Optional Search only on Home

Home
  Search
  Attention preview
    Attention
  Today / Next
    Task Detail
    Event Detail
    Plan Detail
  Inventory exception
    Inventory
  Modules
    Planner
    Inventory
    More

Planner local entries
  Planner overflow
    Presets
    Drafts
    Trash
    Plan Archive

Search destinations
  Task Detail
  Event Detail
  Plan Detail
  Inventory

Trash / Archive
  Planner Trash
  Plan Archive
```

### 10.2 Arquitectura B

```text
Bottom Navigation
  Home
  People
  Add
    Crear tarea
    Crear evento
    Crear plan
    Geni (future)
  Planner
  More
    Attention / Activity
    Trash
    Inventory
    Settings

AppTopBar
  Household switch
  Role chip
  Search affordance (bar on Home/header; icon fallback)
  Attention badge if selected

Home
  Search
    Global Search
  Requiere atencion
    Attention / Activity
      Attention tab
  Today / Next
    Task Detail
    Event Detail
  Continuar
    Plan Detail
  Inventory exception
    Inventory
  Modules
    Planner
    Inventory
    People
    More

Planner local entries
  Planner overflow
    Presets
    Drafts
    Trash filtered to Planner
    Plan Archive

Inventory local entries
  Inventory Search (local)
  Inventory alerts
  Future Trash filtered to Inventory

Search destinations
  Task Detail
  Event Detail
  Plan Detail
  Inventory Item destination (when defined)
  Presets / Drafts only by explicit scope

Attention / Activity destinations
  Attention tab
    Task Detail
    Event Detail
    Plan Detail
    Inventory request/item
  Activity tab
    Entity detail or module history

Trash / Archive
  Global Trash
    Filters: Planner, Presets, Drafts, Inventory later
  Local Archive
    Plan Archive first
```

### 10.3 Arquitectura C

```text
Bottom Navigation
  Home
  People
  Add / Launcher
    Planner creates
    Geni
    Future Inventory create
    Future module actions
  Planner
  More / Operations Hub
    Search
    Inbox
    Recovery
    Modules

AppTopBar
  Household switch
  Role chip
  Global Search icon everywhere
  Attention badge

Home
  Global Search
  Priority / Attention
    Inbox or Attention tab
  Today / Next
    Canonical details
  Activity teaser
    Activity / Inbox
  Module state
    Planner
    Inventory
    Future modules
  Geni suggestion (future)
    Geni

Search destinations
  Canonical details
  Module screens
  Hidden-content modes
  Future command suggestions

Recovery
  Trash
  Archived
  Restore problems
  Recent restores
```

---

## 11. Wireframes

Wireframes are structural only, not final style.

### 11.1 Home

```text
HomePlus / Casa activa                         Buscar

Requiere atencion
! Verificar tarea de Ana                       Revisar
! Sin stock: leche                             Inventario
Ver todo

Hoy / Proximo
16:30 Pediatra                                 Abrir
[ ] Comprar leche              Para mi         Completar

Continuar
Plan Mudanza                  1 bloqueo        Abrir plan

Inventario
2 productos requieren reposicion               Abrir

Modulos
[Planner] [Inventario] [Personas] [Mas]
```

### 11.2 Quick Actions

```text
Crear

   (icon)              (icon)              (icon)
   Tarea               Evento              Plan

   (future icon)
   Geni
```

Rules:

- Current initial state is 3 actions.
- Geni appears only when implemented.
- No subtitles, chevrons, metrics, hidden form copies, or Inventory quantity actions.

### 11.3 Search Inicial

```text
Buscar en HomePlus
[ input ]

Recientes
- Tarea: Comprar leche
- Plan: Mudanza
- Inventario: Cafe

Filtros
[Todo] [Tareas] [Eventos] [Planes] [Inventario]

Sin texto
Busca tareas, eventos, planes e inventario visible.
```

### 11.4 Search Con Resultados

```text
Buscar en HomePlus
[ leche ]

Mejores coincidencias
Task       Comprar leche             Hoy / Para mi
Inventory  Leche                     Sin stock

Planner
Event      Compra mayor              Sabado
Plan       Organizar cocina          Activo

Inventario
Item       Leche deslactosada        Bajo stock

Filtros ocultos
[Incluir archivados] [Buscar en Papelera]  (future explicit)
```

### 11.5 Attention

```text
Atencion                         (3)
[Todos] [Planner] [Inventario] [Para mi]

Requiere decision
! Verificar: Comprar leche
  Ana marco completa.                         Verificar / Abrir

! Aprobar reposicion: Leche
  Solicitado por Maria.                       Aprobar / Abrir

Bloqueos
! Plan Mudanza bloqueado
  Falta definir transporte.                   Resolver / Abrir

Vacio
Nada requiere tu intervencion.
```

### 11.6 Activity

```text
Actividad
[Todos] [Planner] [Inventario] [Persona] [Fecha]

Hoy
Comprar leche
  Maria creo la tarea
  Ana la completo

Inventario / Cafe
  Juan consumio 1
  Sistema marco bajo stock

Ayer
Plan Mudanza
  Geni propuso un cambio (future, labeled)
  Maria confirmo el cambio
```

### 11.7 Papelera

```text
Papelera
[Todos] [Planner] [Borradores] [Inventario future]
Buscar en papelera

Task       Comprar leche             27 dias restantes   Restaurar
Event      Pediatra                  12 dias restantes   Restaurar
Draft      Plan vacaciones           Privado             Restaurar
Legacy     Hito mudanza              Revisar             Restaurar

Empty state:
No hay elementos eliminados recuperables.
```

### 11.8 Archive

```text
Archivados / Planes
[Planes] [Presets future]
Buscar archivados

Plan       Renovar cocina            Cerrado             Desarchivar
Plan       Cumple 2025               Completado          Desarchivar

Row opens archived detail context, not active Plan workspace by default.
```

### 11.9 Tablet - Home

```text
HomePlus / Casa activa                                      Buscar

Left column                                Right column
Requiere atencion                         Modulos
! Verificar tarea                         [Planner]
! Sin stock leche                         [Inventario]

Hoy / Proximo                             Inventario
16:30 Pediatra                            2 excepciones
[ ] Comprar leche

Continuar
Plan Mudanza
```

### 11.10 Tablet - Lista Global

```text
Attention / Activity

Filters rail          List                       Detail preview
Module                ! Verificar tarea          Title
Person                ! Aprobar restock          Metadata
Urgency               ! Plan bloqueado           Primary action
Date                                             Open canonical detail
```

---

## 12. Home

### 12.1 Interaccion por alternativa

| Elemento | A Conservadora | B Global equilibrada | C Global expandible |
|---|---|---|---|
| Household/header | Permanente | Permanente | Permanente con mas estado |
| Search | Home-only visible | Home/header visible; icon fallback | AppTopBar global |
| Attention | Excerpt corto | Excerpt corto + tab canonica | Strong priority/inbox |
| Today/Next | Principal despues de Attention | Principal despues de Attention | Personalizable |
| Planner | Curated excerpts | Curated excerpts | One module among many |
| Inventory | Exception-only | Exception-only plus Search candidate | More global presence later |
| Activity | Separate/no teaser | Optional teaser after surface exists | Strong teaser/feed |
| Modulos | Simple gateways | Simple gateways | Configurable gateways |
| Quick Actions | Center Add | Center Add | Launcher |
| Geni future | Hidden until ready | Future 4th action | Action + suggestions |

### 12.2 Permanente, excepcional, above-scroll

Permanent:

- Household/header and switch context.
- Search affordance if global Search is selected.
- Today/Next or priority skeleton.
- Module gateways.
- Center Quick Actions access.

Exceptional:

- Attention excerpt only when unresolved items exist.
- Inventory urgent exception only when meaningful.
- Offline/stale/partial error.
- Restore or dependency problem only when active workflow is affected.

Above scroll in the recommended Architecture B:

1. Header/household.
2. Search affordance.
3. Attention excerpt if any; otherwise Today/Next.
4. At least one Today/Next or empty-state summary.

Should not appear on Home:

- Full Planner lists.
- Full Inventory item list.
- Full Activity feed.
- Trash/Archive rows.
- Permanent delete.
- Approval/rejection flows that need detail context.

Open Detail:

- Task, Event, Plan, Inventory item/request when canonical destination is defined.

Inline candidate:

- Complete task only if capability, evidence, state, rollback, and reliability path are clear.
- Otherwise open canonical detail/surface.

Hidden when empty:

- Attention section.
- Activity teaser.
- Inventory exception.
- Partial error for modules that loaded successfully.

---

## 13. Quick Actions Y Search

### 13.1 Quick Actions product rule

Preserved factual base:

- Current Quick Actions are `Crear tarea`, `Crear evento`, `Crear plan`.
- Templates and Drafts keep their own access.
- Geni is future.
- Inventory lacks an equivalent mature global create/action flow today.

Recommended initial model:

- Open grid without permanent cards/borders.
- Three current Planner actions.
- Future fourth action for Geni when implemented.
- No Inventory quantity, approval, restock, delete, archive, or restore actions globally.
- No Search inside Quick Actions.

### 13.2 Search product rule

Recommended initial model:

- Separate full-screen global Search from visible Home/header affordance.
- Results grouped by module/entity.
- Opens canonical detail or module destination.
- Includes confirmed accessible content only.
- Inventory local search remains local filtering.
- Hidden content excluded by default.
- Drafts owner-only if included later by explicit decision.

Search variants by architecture:

| Variant | Use |
|---|---|
| Home-only Search bar | Conservative first step, lower shell churn. |
| Home/header Search bar | Recommended balance. |
| AppTopBar icon everywhere | Expandible direction or secondary later. |
| Command/launcher hybrid | Not recommended for first global surfaces. |

---

## 14. Attention Y Activity

### 14.1 Integrated definition

Attention includes:

- Verification required.
- Correction required.
- RSVP required.
- Conflict/blocker.
- Persistent uncertain operation.
- Invalid assignment.
- Inventory out-of-stock when actionable.
- Restock approval/request requiring human decision.
- Future Geni proposal requiring confirmation.

Activity includes:

- Create/edit/complete/verify/cancel/trash/restore/archive lifecycle events.
- Assignment and participation changes.
- Inventory quantity and restock events.
- Geni confirmations and proposals, labelled when future.
- Human-level history, not technical noise.

### 14.2 Badge rule

Badge counts unresolved Attention only.

- Read does not decrement.
- Seen does not decrement.
- Resolve, approve, verify, complete, respond, retry-success, or dismiss-with-reason may remove from count depending item type.
- Activity has per-item read state only, not a global badge.

### 14.3 Recommended surface

One shared surface with tabs:

```text
Attention / Activity
  Atencion (badge)
  Actividad
```

Why:

- One entry keeps navigation simple.
- Tabs preserve conceptual distinction.
- Filters can be shared.
- Badge semantics remain clean.

### 14.4 Inline actions

Recommended P3 stance:

- Attention: allow `Abrir` plus one primary inline action per signal when risk and permission are clear.
- Activity: no state-changing inline actions; open/filter/mark-read only.

Technical claims about tables, endpoints, subscriptions, and realtime remain hypotheses for later audit.

---

## 15. Trash Y Archive

### 15.1 Integrated semantic model

| State/action | Meaning |
|---|---|
| Completed | Work was done. |
| Closed | Object no longer active without claiming success. |
| Cancelled | Planned action/event will not occur. |
| Archive | Preserved but hidden from active working views. |
| Trash | Recoverable deletion within retention. |
| Restore | Return from Trash to appropriate state/context. |
| Unarchive | Return from Archive to active or reviewable views. |
| Permanent delete | Irreversible removal; defer or restrict. |

### 15.2 Recommended model

- Global Trash with module/entity filters.
- Local entries can open Trash prefiltered by Planner or future Inventory.
- Drafts owner-only.
- Inventory deleted items join only after restore/permission semantics are defined.
- Archive local first, starting with Plans if selected.
- Do not limit Archive forever to Plans; evaluate Presets next.
- Exclude archived/trashed from Home, Attention, and default Search.
- Log lifecycle events in Activity with privacy-safe labels.
- No bulk actions in V1.
- Defer permanent delete unless a narrow private Draft or coordinator-only policy is explicitly chosen.

---

## 16. Matriz Por Entidad

| Entity | Home | Search | Quick Actions | Attention | Activity | Trash | Archive | Privacidad | Accion principal | Destino canonico | Estado inicial propuesto | Decision pendiente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Task | Today/priority excerpt | Default active results | Crear tarea | Verify, correction, overdue-if-actionable, conflict | Lifecycle and assignment changes | Yes, recoverable | Maybe later | Personal/household scope | Open detail; complete only if safe | Task Detail | Active searchable; hidden excluded | Home inline complete, hidden Search |
| Event | Today/Next | Default active/upcoming results | Crear evento | RSVP, conflict, meaningful time issue | Create/edit/cancel/attendance | Yes, recurrence-aware | Rare/maybe | Participant/scope gated | Open detail / RSVP in Attention | Event Detail | Active/upcoming searchable | Archive need |
| Plan | Continuity/blocker excerpt | Default active results | Crear plan | Blocker, review, uncertain operation | Lifecycle/structure changes | Yes/candidate graph restore | Plans first | Owner/household role | Open plan / resolve blocker | Plan Detail | Active searchable; archived explicit | Archive scope |
| Milestone | Via Plan only | Via Plan/default active | No | Active blocker only | Plan/milestone changes | Legacy/current candidate | Inherit Plan/maybe | Plan scope | Open Plan | Plan Detail / Milestone context | No standalone global role | Restore policy |
| Preset | No default | Maybe library explicit | No | No default | Manager/library events | Yes | Strong later | Template manager | Open library/detail | Preset Library/Detail | Active library only | Archive Presets later |
| Draft | No | Owner-only explicit later | No | Owner recovery only if chosen | Owner-only no household leak | Yes owner-only | No generic | Owner-only | Resume/restore | Draft Recovery | Private by default | Include in global Trash/Search? |
| Inventory Item | Exception only | Candidate active result | No now | Out-of-stock/actionable issue | Quantity/item changes | Later after restore semantics | Maybe/inactive better | Household + sensitive labels | Open Inventory/item | Inventory screen/item destination | Active local; hidden later | Global Search/Trash maturity |
| Restock Request | Pending/urgent exception | Maybe history explicit | No | Approval/request | Create/approve/reject/link task | Maybe cleanup only | No | Coordinator/adult/requester rules | Approve/open in Attention | Inventory request context | Active pending | Attention inline approval |
| Geni future entity | No until exists | Not Search replacement | Future action | Proposal requiring confirmation | Confirmed actions labelled | Depends entity | Depends entity | Label and confirmation required | Confirm/open proposal | Geni/canonical target | Future only | Placement and scope |

---

## 17. Privacidad Y Roles

### 17.1 Privacy rules

- Personal and household content are separated before ranking, grouping, badge count, and display.
- Drafts are owner-only in Search, Attention, Activity, Trash, and any recovery surface.
- Personal tasks/events/plans remain private by default and do not leak through household Activity.
- Household switch resets Search recents, filters, badges, and hidden-content state.
- Sensitive Inventory rows can be redacted or hidden by role, especially medication/health-like content.
- Geni actions must be labelled and confirmed when they mutate data.
- Search recents are per-user and per-household context.

### 17.2 Role posture

| Role/persona | Product posture |
|---|---|
| Coordinador | Can see and resolve household coordination issues subject to entity policy; candidate for restore/permanent-delete permissions. |
| Adulto | Can see shared household work and allowed approvals; not automatically all private content. |
| Integrante menor | Sees assigned/shared eligible items; no broad household audit or hidden-content access by default. |
| Owner | Sees own personal/private content and Draft recovery. |
| Geni | Not a role; every output/action must be labelled and permission-bound. |

### 17.3 Anti-surveillance boundary

Visible household Activity should answer "what happened that matters for coordination", not "what did every person do in the app". Technical audit, sync logs, and private behavior are not household Activity.

---

## 18. Recomendacion Provisional

**RECOMENDACION PROVISIONAL INTEGRADA PARA DISCUSION: Architecture B - Global Balanced.**

Justification:

- **Clarity:** separates Home, Search, Quick Actions, Attention, Activity, Trash, Archive, and Geni.
- **Simplicity:** keeps bottom navigation stable while adding only necessary global surfaces.
- **Real Planner state:** uses mature Planner create/details/lifecycle/reliability without duplicating them.
- **Inventory maturity:** lets Inventory contribute exceptions and Search later without promoting immature mutations.
- **Future growth:** leaves room for Geni and more modules without forcing a launcher today.
- **Accessibility:** tabs, full-screen lists, grouped results, and canonical destinations are easier to explain and adapt.
- **Technical cost:** lower than unified inbox/launcher/recovery center; more coherent than fragmented local surfaces.
- **Navigation risk:** avoids immediate bottom nav redesign.
- **Commercial quality:** Home feels useful, Search is discoverable, Attention has authority, Trash is recoverable.
- **Privacy:** owner-only Drafts and household filtering are easier than in a unified mixed inbox.
- **Noise:** Activity does not count as Attention; Home does not become a feed.
- **Scalability:** module filters, shared Attention/Activity tabs, and global Trash can accept future modules.

This recommendation is provisional and must be reviewed in P3. It is not Product Freeze.

---

## 19. Paquete De Decisiones P3

Maximum 12 integrated decisions.

| ID | Pregunta concreta | Opciones | Recomendacion provisional | Consecuencia de cada opcion | Dependencias | Wireframe/seccion |
|---|---|---|---|---|---|---|
| P3-01 | Que arquitectura global debe guiar P4? | A Conservadora; B Global equilibrada; C Global expandible | B | A menor riesgo pero menos global; B balance; C mas futuro pero mas costo/privacidad | Todas | Sections 6-10 |
| P3-02 | Cual es la responsabilidad de Home? | Dashboard modulos; Prioridades; Today/Next; Hibrida | Hibrida | Dashboard estable pero decorativo; prioridades util pero requiere policy; Today claro pero Planner-heavy; hibrida balancea | P3-01, P3-06 | Sections 11-12 |
| P3-03 | Donde vive Search? | Home/header visible; AppTopBar icon; Home-only; Launcher hybrid | Home/header visible | Visible descubre; icon compacto; Home-only menos global; launcher confunde acciones | P3-01, P3-04, P3-11 | Sections 10-13 |
| P3-04 | Que incluye Search al inicio? | Planner active only; Planner+Inventory active; include Drafts/Presets; include hidden | Planner+Inventory active when destination defined, otherwise Planner staged | Planner only simple; +Inventory prueba global; Drafts/Presets privacidad; hidden ruido | P3-03, P3-10, P3-11 | Search wireframes |
| P3-05 | Que catalogo inicial tiene Quick Actions? | 3 Planner creates; add Abrir Inventario; add Crear item; launcher multimodulo | 3 Planner creates | 3 respeta madurez; Abrir mezcla nav; Crear item requiere madurez; launcher sobreconstruye | P3-01, P3-08 | Quick Actions |
| P3-06 | Donde entra Geni futuro? | 4ta Quick Action; header action; Home block; inside Search | 4ta Quick Action cuando exista | 4ta separa modelos; header compite; Home placeholder prematuro; Search confunde | P3-03, P3-05 | Quick Actions/Home |
| P3-07 | Como se organizan Attention y Activity? | Pantallas separadas; shared tabs; Home Attention + Activity; unified inbox | Shared tabs | Separadas claras mas nav; tabs balance; Home satura; inbox complejo | P3-02, P3-08 | Attention/Activity |
| P3-08 | Que cuenta el badge? | Attention sin resolver; unread Attention+Activity; critical only; per-module only | Attention sin resolver | Actionable claro; unread ruidoso; critical oculta pendientes; per-module fragmenta | P3-07, P3-10 | Attention |
| P3-09 | Que modelo de Papelera? | Global con filtros; por modulo; actual fragmentada; Recovery Center | Global con filtros | Global recupera mejor; local simple pero fragmenta; actual insuficiente; Recovery overbuilt | P3-10, P3-11 | Papelera |
| P3-10 | Que modelo de privacidad/roles? | Owner-only private + household visible; coordinador ve todo; configurable; module-specific only | Owner-only private + household visible with role gates | Balance confianza; coordinador todo vigila; configurable costoso; module-only fragmenta | P3-04, P3-07, P3-09 | Privacy |
| P3-11 | Como tratar hidden content y permanent delete? | Exclude default + explicit filters, defer permanent delete; include archived; include trash; full permanent delete | Exclude default, explicit filters, defer permanent delete | Safe default; archived default sorprende; trash default ruidoso; full delete alto riesgo | P3-03, P3-09, P3-10 | Search/Papelera/Archive |
| P3-12 | Que acciones inline se permiten? | Abrir only; abrir + one primary per type; full inline in Attention; Home full actions | Abrir + one primary per Attention type; Home minimal | Abrir safest; one primary usable; full inline cost/risk; Home full duplica modulos | P3-02, P3-07, P3-08 | Home/Attention |

---

## 20. Orden Posterior

Recommended order after P3:

1. **P3 decisiones con el usuario:** choose from the 12 integrated decisions above.
2. **P4 Product Freeze:** freeze the selected product model and update authority documents.
3. **Auditoria tecnica minima:** inspect contracts, routes, endpoints, permissions, data availability, realtime, offline, and Reliability gaps only after product decisions.
4. **Implementacion por superficies:** Home, Search, Quick Actions, Attention/Activity, Trash, Archive in controlled slices.
5. **Integracion:** connect global surfaces to canonical Planner and Inventory destinations without duplicating domain flows.
6. **Product Polish:** copy, accessibility, empty states, tablet adaptation, partial errors, privacy labels.
7. **QA global:** cross-household, role, offline, hidden content, badge, restore, and canonical navigation validation.

Do not create detailed technical implementation prompts until P3/P4 are complete.

---

## 21. Limitaciones

- This report does not implement code.
- It does not create technical contracts, routes, endpoints, tables, indexes, Supabase policies, subscriptions, or navigation contracts.
- It does not modify the Planner Functional Freeze.
- It does not modify P0/P1 reports.
- It does not declare Product Freeze.
- It treats P1 technical suggestions about tables/endpoints/realtime as hypotheses for later technical audit.
- It does not resolve all implementation cost questions.
- It does not validate with user testing or prototype QA.
- It intentionally reduces P1 decisions to a P3 discussion package rather than preserving every individual research option.
