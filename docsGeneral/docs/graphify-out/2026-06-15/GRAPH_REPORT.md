# Graph Report - docs  (2026-06-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 103 nodes · 133 edges · 9 communities
- Extraction: 0% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ee1a0be2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Home Member Roles|Home Member Roles]]
- [[_COMMUNITY_Core Modules & Assets|Core Modules & Assets]]
- [[_COMMUNITY_Backend & Data Infrastructure|Backend & Data Infrastructure]]
- [[_COMMUNITY_Design System & UX|Design System & UX]]
- [[_COMMUNITY_Philosophical Principles|Philosophical Principles]]
- [[_COMMUNITY_Geni AI System|Geni AI System]]
- [[_COMMUNITY_SOS Emotional Design|SOS Emotional Design]]
- [[_COMMUNITY_Privacy & Personal Memory|Privacy & Personal Memory]]
- [[_COMMUNITY_User Personas|User Personas]]

## God Nodes (most connected - your core abstractions)
1. `HomePlus (Sistema Operativo)` - 44 edges
2. `Dominio: Geni` - 17 edges
3. `Dominio: People` - 12 edges
4. `Dominio: Planner` - 11 edges
5. `Dominio: Finance` - 9 edges
6. `Dominio: Assets` - 9 edges
7. `Dominio: Presence` - 8 edges
8. `Dominio: HomeCloud` - 8 edges
9. `Dominio: Inventory` - 6 edges
10. `Dominio: Feed` - 5 edges

## Surprising Connections (you probably didn't know these)
- `HomePlus — Api + TestCases + Edgecases V1` --defines_architecture--> `HomePlus (Sistema Operativo)`  [CURATED]
  HomePlus — Api + TestCases + Edgecases V1.md → HomePlus — FinalSpec.md
- `HomePlus — Diseño ed pantallas de Auth v1` --defines_architecture--> `HomePlus (Sistema Operativo)`  [CURATED]
  HomePlus — Diseño ed pantallas de Auth v1.md → HomePlus — FinalSpec.md
- `HomePlus — SECCION 8 DATA PHILOSOPHY` --defines_architecture--> `HomePlus (Sistema Operativo)`  [CURATED]
  HomePlus — SECCION 8 DATA PHILOSOPHY.md → HomePlus — FinalSpec.md
- `HomePlus — Esquema de base de datos v1` --defines_architecture--> `HomePlus (Sistema Operativo)`  [CURATED]
  HomePlus — Esquema de base de datos v1.md → HomePlus — FinalSpec.md
- `HomePlus — Desing system v1` --defines_architecture--> `HomePlus (Sistema Operativo)`  [CURATED]
  HomePlus — Desing system v1.md → HomePlus — FinalSpec.md

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "Home Member Roles"
Cohesion: 0.08
Nodes (25): HomePlus — Api + TestCases + Edgecases V1, HomePlus — Diseño ed pantallas de Auth v1, HomePlus — SECCION 8 DATA PHILOSOPHY, HomePlus — Esquema de base de datos v1, HomePlus — Desing system v1, HomePlus — SECCION 4 EMOTIONAL DESING, HomePlus — Eventos del sistema v1, HomePlus — SECCION 3 FILOSOFIA (+17 more)

### Community 1 - "Core Modules & Assets"
Cohesion: 0.18
Nodes (13): Dominio: Finance, Dominio: Inventory, Entidad: Accounts, Entidad: Budgets, Entidad: Debts, Entidad: Expense Splits, Entidad: Expenses, Entidad: Expiry Records (+5 more)

### Community 2 - "Backend & Data Infrastructure"
Cohesion: 0.17
Nodes (12): Dominio: Feed, Dominio: Geni, Dominio: System, Entidad: Audit Logs, Entidad: Conversations, Entidad: Load Metrics, Entidad: Memory Family, Entidad: Memory Personal (+4 more)

### Community 3 - "Design System & UX"
Cohesion: 0.18
Nodes (11): Dominio: People, Entidad: Household Members, Entidad: Households, Entidad: Invitations, Rol: Adolescente, Rol: Adulto, Rol: Adulto Mayor, Rol: Coordinador (+3 more)

### Community 4 - "Philosophical Principles"
Cohesion: 0.27
Nodes (10): Dominio: Planner, Entidad: Event Participants, Entidad: Events, Entidad: Goals, Entidad: Milestones, Entidad: Responsibilities, Entidad: Streaks, Entidad: Task Comments (+2 more)

### Community 5 - "Geni AI System"
Cohesion: 0.20
Nodes (10): Dominio: Presence, Dominio: SOS, Entidad: Check-ins, Entidad: Geofences, Entidad: Location History, Entidad: Location Settings, Entidad: Locations, Entidad: Places (+2 more)

### Community 6 - "SOS Emotional Design"
Cohesion: 0.25
Nodes (9): Dominio: Assets, Entidad: Asset Documents, Entidad: Asset Maintenance, Entidad: Assets, Entidad: Devices, Entidad: Documents, Entidad: Pets, Entidad: Properties (+1 more)

### Community 7 - "Privacy & Personal Memory"
Cohesion: 0.29
Nodes (7): Dominio: Automatizaciones, Dominio: Notificaciones, Entidad: Automation Logs, Entidad: Automations, Entidad: Channels, Entidad: Notification Preferences, Entidad: Notifications

### Community 8 - "User Personas"
Cohesion: 0.33
Nodes (6): Dominio: HomeCloud, Entidad: Album Items, Entidad: Albums, Entidad: Document Access, Entidad: Document Versions, Entidad: Media Items

## Knowledge Gaps
- **67 isolated node(s):** `HomePlus — Api + TestCases + Edgecases V1`, `HomePlus — Desing system v1`, `HomePlus — Diseño de onboarding completo v1`, `HomePlus — Diseño de Pantallas de Home V1`, `HomePlus — Diseño ed pantallas de Auth v1` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HomePlus (Sistema Operativo)` connect `Home Member Roles` to `Core Modules & Assets`, `Backend & Data Infrastructure`, `Design System & UX`, `Philosophical Principles`, `Geni AI System`, `SOS Emotional Design`, `Privacy & Personal Memory`, `User Personas`?**
  _High betweenness centrality (0.687) - this node is a cross-community bridge._
- **Why does `Dominio: Geni` connect `Backend & Data Infrastructure` to `Home Member Roles`, `Core Modules & Assets`, `Design System & UX`, `Philosophical Principles`, `Geni AI System`, `SOS Emotional Design`, `Privacy & Personal Memory`, `User Personas`?**
  _High betweenness centrality (0.258) - this node is a cross-community bridge._
- **Why does `Dominio: Planner` connect `Philosophical Principles` to `Home Member Roles`, `Backend & Data Infrastructure`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **What connects `HomePlus — Api + TestCases + Edgecases V1`, `HomePlus — Desing system v1`, `HomePlus — Diseño de onboarding completo v1` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Home Member Roles` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._