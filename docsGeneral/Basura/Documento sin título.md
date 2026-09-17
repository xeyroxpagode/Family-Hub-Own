# DOCUMENTATION\_STATE\_REPORT \- HomePlus System

## EXECUTIVE SUMMARY

HomePlus is a comprehensive family coordination system designed as a "home operating system." The documentation is extensive and well-structured, with strong philosophical foundations and detailed technical specifications. However, several contradictions, missing specifications, and implementation gaps were identified that require resolution.

---

## 1\. DOMAINS

### Core System Structure

HomePlus is organized into 10 official domains with 3 core pillars:

#### Core Pillars

* HomePlus: Central system entity containing all domains and users  
* Final Spec V1: Constitutional document governing all laws, permissions, and modules  
* Geni: Transversal AI layer connecting all modules

#### Official Domains

1. People: Human coordination (Personas, Presence, Feed)  
2. Planner: Operational execution (Tasks, Calendar, Goals)  
3. Finance: Shared economy (Accounts, Expenses, Incomes, Budgets, Funds, Debts)  
4. Presence: Physical availability (Location, Places, Geofences, Check-ins)  
5. Inventory: Stock management (Consumables, Household products, Medications, Shopping list)  
6. Assets: Physical assets (Vehicles, Pets, Properties, Devices, Maintenance)  
7. HomeCloud: Documentary and emotional memory (Documents, Albums, Memories)  
8. SOS: Emergency system (critical priority over all domains)  
9. Feed: Social chronological space (activity, achievements, recognition)  
10. Automatizaciones: Rule engine connecting triggers to actions

---

## 2\. ENTITIES

### Core Entities

* households: Maximum data isolation unit  
* household\_members: Persona ≠ User model (user\_id nullable)  
* auth.users: Supabase authentication (external system)  
* invitations: Pending household join invitations

### Planner Domain Entities

* tasks: Household tasks with responsibility association  
* responsibilities: Operational grouping of tasks, expenses, inventory  
* events: Calendar events  
* goals: Targets linking Planner tasks with Finance funds  
* streaks: Compliance tracking

### Finance Domain Entities

* accounts: Financial accounts  
* expenses: Household expenses  
* incomes: Household income  
* budgets: Budget management  
* funds: Fund management  
* debts: Debt tracking between members

### Presence Domain Entities

* locations: Location tracking  
* places: Significant places  
* geofences: Geographic boundaries  
* check-ins: Location check-ins

### Inventory Domain Entities

* inventory\_items: Stock items  
* categories: Item categorization  
* shopping\_list: Shopping management  
* expiry\_records: Expiration tracking

### Assets Domain Entities

* assets: Physical assets  
* vehicles: Vehicle management  
* pets: Pet management  
* properties: Property management  
* devices: Device management  
* maintenance: Maintenance records

### HomeCloud Domain Entities

* media\_items: Media storage  
* albums: Album organization  
* documents: Document storage

### Feed Domain Entities

* posts: Social posts  
* reactions: Post reactions  
* comments: Post comments

### SOS Domain Entities

* sos\_alerts: Emergency alerts  
* sos\_recipients: Emergency contacts

### Geni/AI Entities

* geni\_memory\_personal: Personal AI memory  
* geni\_memory\_family: Family AI memory  
* geni\_conversations: AI conversation logs  
* patterns\_log: Pattern detection logs

### Transverse Entities

* audit\_logs: Immutable action records (append-only)  
* documents: Evidence/guarantee linking  
* notifications: Notification management  
* automations: Automation rules  
* automation\_logs: Automation execution logs

---

## 3\. RELATIONSHIPS

### Core Relationships

* households 1──N household\_members N──1 auth.users  
* households 1──N \[all coordination tables with household\_id\]  
* household\_members 1──N tasks (assigned)  
* household\_members 1──N expenses  
* household\_members 1──N locations  
* household\_members 1──N posts

### Transverse Entity Relationships

* Persona: Relates to Tasks, Expenses, Events, Documents, Assets  
* Responsibility: Groups Tasks, Expenses, Inventory operationally  
* Goal: Links Planner tasks with Finance funds  
* Document: Links as evidence/guarantee to Expenses, Assets, Persons

### Cross-Domain Relationships

* Tasks ↔ Events (task\_event\_id)  
* Tasks ↔ Goals (task\_goal\_id)  
* Tasks ↔ Responsibilities (task\_responsibility\_id)  
* Expenses ↔ Budgets  
* Expenses ↔ Funds  
* Documents ↔ Assets  
* Documents ↔ Persons

---

## 4\. EVENTS

### Event Classification System

Consumer Codes:

* N: Notificaciones (Push in-app)  
* E: Email (Transactional)  
* G: Geni (AI pattern detection, recommendations)  
* A: Automatizaciones (Rule engine)  
* AU: Auditoría (Immutable append-only logs)  
* F: Feed (Auto posts)  
* B: Briefing (Daily Geni summary)  
* ST: Streaks (Streak updates)  
* S: SOS (Emergency system)

Priority Levels:

* 🔴 CR: Critical — Non-silenceable, ignores quiet hours  
* 🟠 AL: High — Ignores quiet hours, respects opt-in  
* 🟡 ME: Medium — Respects quiet hours and opt-in  
* 🟢 BA: Low — In-app only, respects quiet hours

### Key Events by Domain

#### People & Auth Events

* member.invited: Coordinator creates invitation  
* invitation.accepted: Invitee accepts via token  
* invitation.expired: CRON expiration  
* invitation.cancelled: Coordinator cancellation  
* member.joined: Member becomes active  
* member.removed: Coordinator soft-delete  
* member.role\_changed: Role modification  
* user.registered: New user account  
* user.onboarding\_completed: Onboarding flow completion  
* household.created: First household creation  
* household.settings\_changed: Configuration modification

#### Planner Events

* task.created: New task creation  
* task.assigned: Task assignment  
* task.completed: Task completion  
* task.overdue: Task past due date  
* task.recurrence\_generated: Recurring task generation  
* goal.created: New goal  
* goal.progress\_updated: Goal progress change  
* goal.achieved: Goal completion  
* event.created: New calendar event  
* event.conflict\_detected: Schedule overlap

#### Finance Events

* expense.created: New expense  
* expense.approval\_required: Expense needs approval  
* budget.exceeded: Budget overrun  
* payment\_due: Payment due date  
* debt.created: New debt between members  
* debt.reminded: Debt payment reminder

#### Presence Events

* location.shared: Location sharing enabled  
* geofence.entered: User enters geofence  
* geofence.exited: User exits geofence  
* check\_in.completed: Check-in recorded  
* presence.pattern\_detected: Movement pattern identified

#### SOS Events

* sos.emergency\_grave: Critical emergency  
* sos.help\_needed: Help request  
* sos.coordination\_urgent: Urgent coordination  
* sos.acknowledged: SOS acknowledged  
* sos.resolved: SOS resolution

#### Geni Events

* geni.pattern\_detected: Pattern identification  
* geni.recommendation\_generated: AI recommendation  
* geni.intervention\_triggered: AI intervention  
* geni.briefing\_generated: Daily briefing created

---

## 5\. PERMISSIONS

### Official Roles (7)

1. Coordinador: Executive power and global vision  
2. Adulto: Full operational vision, shares main load  
3. Adolescente: Progressive autonomy, gamification focus  
4. Niño: Simplified visual experience, positive reinforcement  
5. Adulto Mayor: Assistive experience (Senior mode), health/medication focus  
6. Invitado: Minimum access, limited participation  
7. Empleado Familiar: Professional vision, strictly work-assigned

### Permission Matrix by Domain

#### People Domain

* Coordinador: Full access, member management, invitations  
* Adulto: Full visibility, task creation, expense creation  
* Adolescente: Limited to own data, can create assigned tasks  
* Niño: Simplified view, own tasks only  
* Adulto Mayor: Adapted interface, health focus  
* Invitado: Read-only specific tasks/events  
* Empleado Familiar: Work-assigned data only

#### Finance Domain

* Coordinador: Full financial control, budget approval  
* Adulto: Full access to shared finances, personal finance control  
* Adolescente: Can create own expenses, limited shared finance visibility  
* Niño: No finance access  
* Adulto Mayor: Read-only shared finances, personal finance control  
* Invitado: No finance access  
* Empleado Familiar: No finance access

#### Presence Domain

* Coordinador: Full location access, geofence management  
* Adulto: Full location sharing, geofence visibility  
* Adolescente: Limited location sharing (configurable)  
* Niño: Location sharing by parent configuration  
* Adulto Mayor: Location sharing optional  
* Invitado: No location access  
* Empleado Familiar: Location only during work hours

### Privacy Hierarchy

* Datos de Coordinación: Visible to coordination participants  
* Datos Personales: Private by default, opt-in sharing  
* Datos Sensibles: Maximum protection, special encryption  
* Datos de Auditoría: Immutable, permanent, system-only access

---

## 6\. BUSINESS RULES

### Core Business Rules

#### Coordination Over Hierarchy

* Coordinator administers household, not private lives  
* Transparency takes precedence over comfort  
* Shared commitments visible by default  
* Private data requires explicit consent for sharing

#### Invitation System Rules

* Token validity: 24 hours from generation (server time)  
* Multiple invitations to same email can coexist  
* Coordinator can revoke active invitations  
* Single token use only (used\_at timestamp)  
* No limit on simultaneous active invitations  
* Multi-household membership supported

#### Task Management Rules

* Every task must have a responsibility association  
* Tasks can be personal or household visibility  
* Subtasks limited to single level  
* Recurrence follows RFC 5545 RRULE standard  
* Verification required for certain task types  
* Geni cannot auto-complete tasks (human responsibility)

#### Financial Rules

* Expenses can be personal or household  
* Budgets can be exceeded with approval  
* Debts are between specific members  
* Financial data classified by sensitivity  
* Audit trail for all financial transactions

#### Presence Rules

* Location sharing configurable by level (1, 2, 3\)  
* Location history retained for 30 days  
* Geofence entry/exit triggers events  
* Check-ins require explicit user action  
* GPS data never sent to external AI

#### Data Rules

* Data ownership belongs to users  
* Data export always available  
* Data deletion within 30 days of request  
* Audit logs are append-only, never deleted  
* Sensitive data requires special encryption

---

## 7\. INVARIANTS

### System Invariants

#### Household Isolation

* household\_id is the maximum data isolation boundary  
* RLS policies enforce household-level access  
* No cross-household data access without explicit permission

#### Person ≠ User

* A person can exist without a user account (user\_id nullable)  
* User can belong to multiple households  
* Person is bound to single household  
* UNIQUE constraint on (household\_id, user\_id) where user\_id IS NOT NULL

#### Audit Immutability

* audit\_logs table is append-only  
* UPDATE and DELETE prohibited on audit\_logs  
* All important actions generate audit trail  
* Audit logs never visible to household members

#### Permission Consistency

* Geni inherits household member permissions  
* No permission escalation through AI  
* Private data never auto-shared  
* Role changes trigger audit events

#### Soft-Delete Consistency

* All domain tables use deleted\_at for soft-delete  
* 30-day retention in trash  
* Hard delete only by system role  
* Historical data preserved on member departure

#### Event Ordering

* Events have priority-based ordering  
* SOS events have absolute priority  
* Critical events ignore quiet hours  
* Event consumers are independent but coordinated

#### Multi-Household Integrity

* User can exist in multiple households simultaneously  
* Each household maintains independent configuration  
* Cross-household relationships prohibited  
* User identity unified across households

---

## 8\. ARCHITECTURAL DECISIONS

### Technical Architecture

#### Database Architecture

* Platform: Supabase (PostgreSQL \+ Auth \+ Realtime \+ RLS)  
* Design: Row Level Security (RLS) as primary security mechanism  
* Deletion Strategy: Soft-delete with 30-day trash retention  
* Audit Strategy: Append-only audit\_logs table  
* Isolation: Household-based data isolation

#### API Architecture

* Authentication: Bearer token (JWT from Supabase)  
* Base URL: [https://api.HomePlus.app/api](https://api.homeplus.app/api)  
* Content-Type: application/json  
* Pagination: Cursor-based  
* Error Format: { error, code, field?, details? }  
* Language: Accept-Language: es-419 default

#### Frontend Architecture

* Platform: Mobile-first (375×812px base)  
* Framework: React Native / Expo  
* Navigation: Bottom Nav (frozen): \[Home\] \[People\] \[+\] \[Planner\] \[More\]  
* Modes: normal | senior  
* Offline Strategy: Local-first with sync queue

#### AI Architecture

* Integration: Transversal layer, not isolated module  
* Capabilities: Consult, Analyze, Recommend, Coordinate, Automate  
* Constraints: Never ignores permissions, never auto-completes tasks  
* Escalation: 4-level progressive intervention system  
* Memory: Personal and family memory separation

#### Design System Architecture

* Color Palette: Earth-warm (Terracotta, Sage, Honey)  
* Philosophy: Calm, Clarity, Recognition, Belonging, Healthy Control  
* Typography: Accessible, senior-mode compatible  
* Components: Mobile-first, touch-optimized  
* Emotional Design: Prevents vigilance, guilt, social pressure, notification anxiety

### Philosophical Architecture

#### Core Philosophies (5)

1. Data Philosophy: Privacy, encryption, data ownership, retention policies  
2. UX Philosophy: Bottom navigation, 1-tap rule, progressive disclosure, 4-layer screen architecture  
3. Relationship Philosophy: Cross-domain entity linking without backtracking  
4. Emotional Design: Human tone, generates calm/belonging/relief, prevents vigilance/guilt/panic  
5. AI Philosophy: 4-level escalation, guardrails against control obsession

#### Decision Principles

* Coordination \> Hierarchy: Coordination first, executive power second  
* Transparency \> Comfort: Operational reality not softened  
* Proactivity \> Intrusion: Pattern detection, not incident intervention  
* Simplicity \> Complexity: Simple interface regardless of internal complexity  
* Privacy \> Coordination: Individual privacy prevails, shared commitments visible  
* Adoption \> Completeness: Each module delivers individual value immediately

---

## 9\. CONTRADICTIONS

### Critical Contradictions Identified

#### 1\. Invitation Token Duration

* API Spec: Token expires in 7 days (now() \+ interval '7 days')  
* Business Rules: Token has 24-hour validity  
* Impact: High \- Critical for invitation flow implementation  
* Resolution Required: Align business rules with API specification

#### 2\. Household Deletion Permission

* DB Schema: DELETE PROHIBIDO for members, only system (service\_role) during account closure  
* FinalSpec: Coordinator has expulsion power but not household deletion  
* Impact: Medium \- Affects data retention policies  
* Resolution Required: Clarify household deletion vs member removal

#### 3\. Geni Task Completion

* AI Philosophy: Geni never completes tasks automatically  
* Automation Spec: Geni can execute recurring tasks with approval  
* Impact: Medium \- Affects automation boundaries  
* Resolution Required: Define "execution" vs "completion" distinction

#### 4\. Location Data AI Access

* Data Philosophy: GPS data never sent to external AI  
* AI Philosophy: Geni analyzes patterns across all domains  
* Impact: High \- Affects privacy guarantees  
* Resolution Required: Clarify Geni's access to location pattern data

#### 5\. Adolescent Finance Visibility

* Permissions: Adolescent can create own expenses, limited shared finance visibility  
* Data Classification: Gastos del hogar visible to Adults \+ Adulto Mayor \+ Coordinador  
* Impact: Medium \- Affects adolescent experience  
* Resolution Required: Define adolescent expense visibility rules

---

## 10\. DUPLICATE CONCEPTS

### Identified Duplicates

#### 1\. Person vs User

* Issue: "Persona" entity and "User" entity used interchangeably in some sections  
* Impact: High \- Core to authentication and membership model  
* Status: Documented as Persona ≠ User model, but terminology inconsistent  
* Recommendation: Standardize terminology throughout documentation

#### 2\. Presence vs GPS

* Issue: Historical references to "GPS domain" vs current "Presence domain"  
* Impact: Low \- Naming convention issue  
* Status: GPS explicitly removed in FinalSpec, but legacy references exist  
* Recommendation: Remove all GPS references, standardize on Presence

#### 3\. Household vs Home

* Issue: "Hogar" (Household) and "Home" (screen/domain) used interchangeably  
* Impact: Medium \- Could cause implementation confusion  
* Status: Household is data entity, Home is UI screen  
* Recommendation: Explicitly distinguish household (data) vs Home (UI)

#### 4\. Task vs Responsibility

* Issue: Tasks and Responsibilities sometimes used as synonyms  
* Impact: Medium \- Affects data model clarity  
* Status: Responsibility is grouping mechanism, Task is execution unit  
* Recommendation: Clarify relationship and distinction

---

## 11\. MISSING SPECIFICATIONS

### Critical Missing Specifications

#### 1\. Real-time Sync Strategy

* Missing: Detailed real-time synchronization strategy  
* Impact: High \- Affects multi-user coordination  
* Required: Supabase Realtime implementation specifications

#### 2\. Conflict Resolution

* Missing: Concurrent edit conflict resolution strategy  
* Impact: High \- Critical for collaborative editing  
* Required: Optimistic locking or conflict resolution policies

#### 3\. Geni Memory Limits

* Missing: Geni memory retention and pruning policies  
* Impact: Medium \- Affects storage and performance  
* Required: Memory retention limits and cleanup strategies

#### 4\. Offline/Online Transition

* Missing: Detailed offline-to-online synchronization rules  
* Impact: High \- Critical for mobile experience  
* Required: Conflict resolution, priority ordering, queue management

#### 5\. Notification Rate Limiting

* Missing: Rate limiting policies for notifications  
* Impact: Medium \- Affects user experience  
* Required: Per-user, per-household, per-event type limits

#### 6\. File Upload Limits

* Missing: File size, type, and storage limits  
* Impact: Medium \- Affects HomeCloud functionality  
* Required: Upload limits, quotas, compression policies

#### 7\. Search Implementation

* Missing: Global search implementation specifications  
* Impact: Medium \- Affects cross-domain navigation  
* Required: Search indexing, ranking, filtering strategies

#### 8\. Automation Trigger Limits

* Missing: Limits on automation triggers and actions  
* Impact: Medium \- Affects system stability  
* Required: Rate limits, recursion prevention, resource quotas

---

## 12\. MISSING RELATIONSHIPS

### Identified Missing Relationships

#### 1\. Tasks ↔ Inventory

* Missing: Tasks related to inventory items (e.g., "buy milk" task)  
* Impact: Medium \- Affects shopping coordination  
* Status: Mentioned in business rules but not in schema  
* Recommendation: Add task\_inventory\_item relationship

#### 2\. Tasks ↔ Assets

* Missing: Tasks related to assets (e.g., "change oil" task for vehicle)  
* Impact: Medium \- Affects asset maintenance  
* Status: Documented in transverse entities but not in schema  
* Recommendation: Add task\_asset relationship

#### 3\. Events ↔ Locations

* Missing: Events related to locations  
* Impact: Low \- Affects event coordination  
* Status: Not documented  
* Recommendation: Add event\_location relationship

#### 4\. Notifications ↔ Events

* Missing: Systematic notification triggering from events  
* Impact: Medium \- Affects notification consistency  
* Status: Event catalog exists, but mapping incomplete  
* Recommendation: Complete event-to-notification mapping

#### 5\. Goals ↔ Tasks

* Missing: Bi-directional goal-task relationships  
* Impact: Medium \- Affects goal tracking  
* Status: goal\_id exists in tasks, but reverse relationship unclear  
* Recommendation: Clarify goal-task relationship model

---

## 13\. MISSING IMPLEMENTATION DETAILS

### Critical Implementation Gaps

#### 1\. RLS Policy Details

* Missing: Complete RLS policy implementations  
* Impact: Critical \- Security implementation  
* Status: Schema defines RLS requirements but not policies  
* Required: Complete RLS policy SQL for all tables

#### 2\. Trigger Specifications

* Missing: Database trigger specifications  
* Impact: High \- Data integrity and automation  
* Status: Events documented but triggers not specified  
* Required: Trigger definitions for all events

#### 3\. Edge Function Implementations

* Missing: Supabase Edge Function implementations  
* Impact: High \- Business logic execution  
* Status: API contracts defined but Edge Functions not implemented  
* Required: Edge Function code for all endpoints

#### 4\. Geni Integration

* Missing: Geni AI integration specifications  
* Impact: High \- Core product differentiation  
* Status: AI philosophy defined but technical integration missing  
* Required: AI service integration, prompt engineering, response handling

#### 5\. Frontend State Management

* Missing: Frontend state management architecture  
* Impact: High \- Frontend implementation  
* Status: Screen designs defined but state architecture missing  
* Required: Redux/Context architecture, data synchronization strategy

#### 6\. Error Handling Strategy

* Missing: Comprehensive error handling strategy  
* Impact: Medium \- User experience and debugging  
* Status: Error format defined but handling strategy missing  
* Required: Error categorization, recovery strategies, user communication

#### 7\. Testing Strategy

* Missing: Comprehensive testing strategy  
* Impact: High \- Quality assurance  
* Status: Test cases mentioned but not defined  
* Required: Unit, integration, E2E testing specifications

#### 8\. Deployment Pipeline

* Missing: Deployment and CI/CD pipeline specifications  
* Impact: Medium \- Operations  
* Status: No deployment strategy documented  
* Required: Environment setup, migration strategy, rollback procedures

---

## 14\. RECOMMENDATIONS

### Immediate Actions Required

#### Priority 1 (Critical)

1. Resolve invitation token duration contradiction between API spec (7 days) and business rules (24 hours)  
2. Clarify Geni's access to location data to resolve privacy concerns  
3. Define complete RLS policies for all database tables  
4. Specify database triggers for all documented events  
5. Define offline/online synchronization strategy

#### Priority 2 (High)

1. Complete task-inventory and task-asset relationships in schema  
2. Implement Edge Function specifications for API endpoints  
3. Define Geni AI integration architecture  
4. Specify frontend state management strategy  
5. Create comprehensive testing strategy

#### Priority 3 (Medium)

1. Standardize Persona vs User terminology throughout documentation  
2. Define conflict resolution strategy for concurrent edits  
3. Specify notification rate limiting policies  
4. Define file upload limits and quotas  
5. Implement search functionality specifications

#### Priority 4 (Low)

1. Remove legacy GPS references  
2. Clarify Household vs Home terminology  
3. Complete event-to-notification mapping  
4. Define Geni memory retention policies

### Documentation Improvements

1. Create implementation guide bridging philosophy to technical specifications  
2. Add entity-relationship diagrams for each domain  
3. Create state transition diagrams for all entities  
4. Add sequence diagrams for critical user flows  
5. Create data dictionary with business definitions

---

## 15\. CONCLUSION

The HomePlus documentation demonstrates exceptional depth in philosophical foundation and product vision, with strong emphasis on emotional design, family dynamics, and ethical AI integration. The technical specifications are comprehensive but contain several critical contradictions and implementation gaps that must be resolved before development can proceed effectively.

Strengths:

* Comprehensive philosophical foundation  
* Detailed emotional design principles  
* Well-structured domain architecture  
* Extensive event catalog  
* Strong privacy and security considerations

Critical Issues:

* Token duration contradiction (7 days vs 24 hours)  
* Missing RLS policy implementations  
* Incomplete trigger specifications  
* Unclear Geni integration architecture  
* Missing offline synchronization strategy

Overall Assessment: The documentation represents a sophisticated product vision but requires technical specification completion and contradiction resolution before implementation can proceed effectively. The philosophical foundation is strong and should guide all technical decisions.

Recommendation: Prioritize contradiction resolution and complete critical technical specifications (RLS policies, triggers, sync strategy) before proceeding with full implementation.

