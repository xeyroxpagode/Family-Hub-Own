# MASTER MESSAGING + FEED CROSS MATRIX

**Fecha:** 2026-09-03  
**Modo:** STRICT READ-ONLY synthesis, sin implementación  
**HOMePLUS branch:** `finance-v1-unified`  
**HOMePLUS HEAD:** `ad4f966 chore(android): configure Google Maps from environment`  
**HOMePLUS pre-status:** cambios Finance/preexistentes preservados; no source modificado por este lote.  
**Inputs:** D1 Feed Donors Deep Recon, D2 Messaging Donors Deep Recon, D3 Backend/Reliability Deep Recon, CM1, CM2, correcciones CM1/CM2.

---

## 1. Executive Summary

Esta Master Cross Matrix congela una candidata autoritativa para Mensajes + Feed antes del Target Architecture Freeze. La síntesis preserva el orden de autoridad: Product Truth Frozen, CURRENT HOMePLUS, evidencia D1/D2/D3, análisis CM1/CM2, patrones donor y supuestos.

**Conclusión principal:** HOMePLUS debe construir una arquitectura propia de dominio sobre fundamentos CURRENT existentes. Donors aportan patrones útiles, pero no existe donor que cumpla el contrato Product Truth completo. RNChat queda como candidato primario de motor UI, no como fuente de verdad, y su aceptación sigue pendiente de gates runtime R1/R2.

**Decisiones técnicas resueltas:** motor único de conversaciones, `messaging_threads(kind)`, direct canónico DB-enforced, secuencia global monotónica recomendada para mensajes y Feed, reacciones/star/pin declarativas, Feed comments como thread `FEED_COMMENTS`, MediaService compartido, backend como trust boundary primario y realtime como transporte.

**Decisiones Product abiertas:** autoridad de gestión de grupos, pin, rename, member-management, creator-leaves, unread histórico para nuevos miembros, direct rejoin, post delete con comentarios, System Social correction/retraction UX, comment media, reacción en orden inbox, mark-read trigger exacto y ubicación App Shell.

**Estado final:** `MASTER CROSS MATRIX PASS WITH PRODUCT DECISIONS`. La arquitectura target puede congelarse con decisiones Product explícitamente abiertas y gates runtime definidos. Implementación sigue bloqueada hasta autorización posterior y PASS/ACCEPTED formal de Finance V1.1.

---

## 2. Product Truth Register

### Messaging

| Regla congelada | Efecto arquitectónico |
|---|---|
| IA canónica: MENSAJES contiene FEED y CONVERSACIONES; Conversaciones contiene TOPIC GROUPS y DIRECTS | Messages root no debe introducir tabs primarios ajenos; Feed Preview + inbox unificado. |
| One canonical messaging engine underneath | Direct, Group y Feed Comments comparten motor semántico. |
| Household-bound; active Household controla acceso | Todas las tablas/servicios se scopean por `household_id` y active membership. |
| Groups son topic-centered con subset explícito | No auto-add de miembros nuevos del Household. |
| Nuevo miembro de Group recibe full history | Modelo de acceso no filtra por `joined_at` para lectura histórica. |
| Miembro removido pierde acceso; authored history remains | Membership status controla acceso actual; mensajes permanecen. |
| Group lifecycle ACTIVE -> CLOSED -> REOPEN, same history | `CLOSED` deshabilita nuevos mensajes, no oculta historia. |
| Creator may close/reopen V1 | Autoridad mínima congelada solo para close/reopen del creator. |
| Direct 1:1 Household-bound; exactamente un Direct canónico por par/Hogar | `ensureDirect` debe ser idempotente y race-safe. |
| Baseline requerido: text, emoji, line breaks, photo, video, file, voice, inline reply, reactions, copy, forward, edit own, delete-for-me, delete-for-everyone, search, unread, unread count, first unread, pending, failed, retry, offline pending, dates, long history, scroll preservation | No se puede excluir media/voice/file/video de V1; pueden tener gates dentro de V1. |
| Typing y drafts opcionales si cheap | No bloquean target freeze ni V1 core. |
| Others' read receipts NOT REQUIRED | No adoptar per-message read receipt visible de Marketplace como producto V1. |
| Star = personal retrieval | Tabla/estado personal por persona. |
| Pin = shared context | Mutación compartida, autoridad Product pendiente. |
| Retry idempotent, no duplicates | Client id + backend uniqueness + replay canonical. |

### Feed

| Regla congelada | Efecto arquitectónico |
|---|---|
| Feed = shared social Household surface | No follower graph, no public audience. |
| All active valid Household members see full Feed history | Lectura basada en active membership actual. |
| Human Posts + System Social Posts only | `feed_posts.kind` semántico. |
| Reverse chronological; no algorithmic ranking | Rechaza Framez ranking y score fields. |
| No follower model, no public social graph, no per-post audience | Feed scope = household completo. |
| Human post text opcional; valid post requires meaningful content | Composer permite text-only, media-only, text+media; no empty. |
| Human post media: multiple photos OR one video | Photos XOR video. |
| Author edit/delete, edited marker, no visible edit history, no restore V1 | Soft/tombstone según necesidad; sin restore UI. |
| Tombstone only when needed | Delete no implica siempre card visible. |
| Feed reactions: shared grammar, one active/person/target | Declarative `setReaction`. |
| Feed comments use shared Messaging engine; no independent canonical comment engine | Comments = `messaging_threads.kind=FEED_COMMENTS`. |
| Feed unread = new top-level Posts since last view | Comments/reactions no incrementan Feed Preview badge. |
| Search: Feed Post text + Feed comments, contextualized as Feed | Search devuelve tipo y contexto. |

### Cross-Module

| Regla congelada | Efecto arquitectónico |
|---|---|
| Backend/API semantic authority | Frontend no muta donor Supabase directo. |
| DB rows no son API contract | Mapper/shape obligatorio. |
| Realtime es transporte | No confirma optimistics sin identidad autoritativa suficiente. |
| Notifications owns delivery policy | Messaging/Feed emiten eligible domain events; no deciden push/in-app. |

### Geni

| Regla congelada | Efecto arquitectónico |
|---|---|
| Minimal/silent | No community-manager behavior. |
| Does not invent conversations or random Human Posts | Geni no crea social persistence canónica. |
| Does not own canonical System Social creation | FeedService/System Social pipeline persiste. |

### Household

| Regla congelada | Efecto arquitectónico |
|---|---|
| Active Household controls access | Lifecycle session/household switch debe limpiar queues/subscriptions. |
| Household-bound messages/feed | `household_id` en threads, messages, feed posts y media. |

### Permissions

| Regla congelada | Efecto arquitectónico |
|---|---|
| No authority extra asumida para Coordinators | Delete others' posts, pin, group management, moderation son Product Decision salvo permiso global congelado. |
| Creator close/reopen V1 sí congelado | Solo esta autoridad social queda resuelta. |
| No Circle owner/admin/member import | Rechazar jerarquía paralela donor. |

### Reliability

| Regla congelada | Efecto arquitectónico |
|---|---|
| Retry idempotent/no duplicates | Mutaciones retryables declarativas e idempotentes. |
| Offline pending requerido para Messaging send | Queue SEND_MESSAGE requerida. |
| Cleanup failure no revierte canonical mutation | Orphan cleanup recoverable/retryable. |

---

## 3. CURRENT Reuse Register

| CURRENT foundation | Master use | State | Evidence |
|---|---|---|---|
| Auth + People | Identidad `person_id`, sender/author, active user mapping | REUSE CURRENT | CM1 §2; auth onboarding migration cited by CM1. |
| Households | Scope principal de Mensajes/Feed/Media/Search | REUSE CURRENT | CM1 §2. |
| Household Members | Active membership, role/status inspiration, joined/left lifecycle | EXTEND | CM1 §2; D3 current references. |
| active_household | Runtime/API scope active | KEEP CURRENT | Product Truth + CM1. |
| Global Permissions | Authority source for social management if Product decides | REUSE CURRENT | CM1-C01 correction. |
| RLS helpers | Defense in depth for household/thread access | REUSE CURRENT | CM1 §2, §7. |
| Backend controller/service conventions | Semantic API, request context, service gates | REUSE CURRENT | CM1 §2, §6. |
| Mapper/API shaping conventions | DB row != API shape | REUSE CURRENT | CM1 §2; D3 Agora shape pattern. |
| Planner Reliability | Extract queue primitives for send/retry/offline | EXTRACT CURRENT | D3 Part C; CM2 §12. |
| Existing outbox/retry | Notification eligible event delivery if confirmed/current | REUSE CURRENT | CM1 §2, D3 A9; implementation mechanism not frozen beyond boundary. |
| Storage/avatar patterns | Media validation/compression/provider seam inspiration | ADAPT PATTERN | CM1 §2; D3 A7. |
| Search CURRENT | Extend semantics, not physical strategy freeze | EXTEND | CM1 §10; CM2 §14. |
| Presence realtime | Subscription cleanup/lifecycle pattern | ADAPT PATTERN | CM2 §2, §11. |
| Notifications CURRENT | Global owner of notification surface | REUSE CURRENT | CM2 §14; CM1-C08/C12. |
| Navigation | Typed stack/deep-link pattern; placement unresolved | EXTEND | `navigation/types.ts`; CM2 §14. |
| UI primitives | AppScreen, AppCard, AppAvatar, SearchField, sheets, states | KEEP CURRENT | CM2 §2; glob evidence. |
| FeedFamiliar CURRENT | Tone reference only; local mock truth rejected | REFERENCE ONLY | `FeedFamiliarScreen.tsx` uses MOCK_POSTS/MOCK_HITOS/ScrollView/Date.now. |

---

## 4. Master Domain Boundaries

| Boundary | OWNS | DOES NOT OWN | CALLS | TRUST BOUNDARY |
|---|---|---|---|---|
| MessagingService | Threads `DIRECT/GROUP/FEED_COMMENTS`, membership access, messages, reply, edit/delete, reactions, star, pin, unread frontier, group lifecycle | Feed top-level posts, System Social creation authority, notification delivery policy, media object storage internals | Household/Permissions, MediaService, Notifications, Search, Reliability | Backend service/RPC is canonical; frontend/RNChat are consumers. |
| FeedService | Feed posts, Human/System Social post lifecycle, Feed unread frontier, Feed reactions, System Social idempotent representation | Comment message CRUD engine, Direct/Group lifecycle, notification delivery policy, Geni authorship | MessagingService for comment thread, MediaService, Notifications, Search, Household/Permissions | Backend owns canonical post state; Feed UI renders shaped models. |
| MediaService | Upload validation, storage path policy, metadata, private household access, relation binding coordination, cleanup eligibility | Business lifecycle meaning of message/post delete, social authority, public URL identity | Household/Permissions, storage provider, MessagingService/FeedService | Storage URL/path is not canonical public identity; metadata + access gates are canonical. |
| Household/Permissions | Active membership and global permission checks | Social semantics not frozen by Product Truth | MessagingService, FeedService | Existing backend permission helpers remain primary. |
| Notifications | event -> notification policy, push/in-app delivery, priority, recipients UX | Canonical message/feed mutation | Messaging/Feed eligible domain events | Notification failure cannot rollback source mutation. |
| Search | Physical query/index execution and typed result shaping | Product definition of searchable scopes | MessagingService, FeedService, Household/Permissions | Access-scoped server search only. |
| Reliability | Local pending queue primitives, retry/backoff, reconciliation hooks | Business payload semantics, Planner domain DAG | Messaging/Feed adapters | Client runtime is provisional until canonical backend response/replay. |
| Realtime transport | Event transport/subscription lifecycle | Authority, confirmation, access decisions | Backend event streams and feature adapters | Events reconcile only with authoritative IDs/versions. |

---

## 5. Master Cross Matrix

| Capability | Product Truth | CURRENT HomePlus | Best Donor Evidence | CM1 Candidate | CM2 Candidate | Correction Applied | MASTER Target Candidate | Master Decision | Product Blocker | Runtime/Implementation Gate | Risk | Rationale | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Domain Boundaries | One messaging engine + Feed surface | Controllers/services/mappers exist | Agora conversations + shape | Messaging/Feed/Media split | Same with frontend ownership | Notifications/Search boundaries tightened | Services split, shared cross-cutting boundaries | ADOPT PATTERN | No | Implementation design | Medium | Clear ownership prevents donor leakage. | D3 A4/A6; CM1 §4; CM2 §4. |
| Household Scope | Household-bound active access | Auth/households/members/RLS helpers | Marketplace scoped by listing only; not sufficient | `household_id` everywhere | Lifecycle cleanup on switch/logout | Preserve active household authority | Household scoped tables, APIs, queues, channels | REUSE CURRENT | No | RLS/API tests | High | Core privacy invariant. | CM1 §2; CM2 §2. |
| Direct Identity | One canonical Direct per pair/Household | Absent | Marketplace UNIQUE; Circle uncertain | low/high person fields or expression index | ensureDirect idempotent | Need DB-enforced race-safe | Partial unique/expression index over sorted pair + household | BUILD HOMEPLUS | No | DB race tests | High | Prevents duplicate directs under concurrent create. | D2 §6. |
| Group Membership | Explicit subset; full history; removed loses access | household_members lifecycle analogous | Circle room_members useful; roles rejected | thread_members active/removed | detail states/lost access | No Circle hierarchy; authority unresolved | Membership relation controls current access, not history window | ADAPT PATTERN | Yes for authority | RLS/lifecycle tests | High | Matches full-history and removal semantics. | D2 §7; CM1-C02. |
| Group Lifecycle | ACTIVE->CLOSED->REOPEN same history; creator V1 | No messaging | Circle delete_room rejected | status ACTIVE/CLOSED | closed composer/readable history | Creator close/reopen only frozen | Closed = read-only, reopen same thread/history | BUILD HOMEPLUS | Creator leaves unresolved | UI/API tests | Medium | Product explicitly freezes lifecycle. | Product Truth; CM2 §7. |
| Thread Model | DIRECT/GROUP/FEED_COMMENTS under one engine | Absent | Agora `conversations.type` | single `messaging_threads(kind)` | RNChat profiles per kind | Creator nullable for Feed comments/system | Semantic thread model with kind-specific constraints | ADOPT PATTERN | Some creator semantics | DB constraints | Medium | One engine without separate comment engine. | D3 A4; CM1-C13. |
| Message Model | Text/media/reply/reactions/edit/delete/etc. | Absent | RNChat UI model; Agora chat fields | canonical message fields | HomePlus model -> RNChat derived | RNChat not DB authority; sender nullable for system | Canonical DB/API model independent of RNChat | BUILD HOMEPLUS | No | API/model tests | High | Donor models incomplete. | D2 §2; CM2 §4. |
| Message Ordering | Deterministic, unread/frontier, long history | Absent | Agora keyset; RNChat load earlier | per-thread sequence | keyset/list preservation | CM1-C03 re-evaluated | Global monotonic `messages.sequence`, indexed by `(thread_id, sequence)` | BUILD HOMEPLUS | No | DB/API pagination race tests | Medium | Global sequence avoids thread counter locks; gaps do not break per-thread frontier. | CM1-C03; D3 A5. |
| Send Idempotency | Retry no duplicates | Planner Reliability | Marketplace explicit reconcile; Ahlan queue partial | `client_message_id` | stable optimistic id | Auth loss terminal status | Client message id + backend uniqueness + replay canonical | EXTRACT CURRENT | No | R6 offline/reconnect | High | Required for pending/failed/retry. | D3 C1-C8; D2 §3. |
| Send Retry | Required | Planner retry policy | Ahlan queue partial; Circle bad | Planner V2 simplified | shared runtime | Stop retry on auth/group closed | Backoff+jitter retry, terminal failed visible | EXTRACT CURRENT | No | R6 | High | Preserve content, avoid silent cancel. | CM2-C04; D3 C5. |
| Offline Send | Required for Messaging | Planner queue current | Ahlan AsyncStorage queue | queue send | QUEUE REQUIRED | No new Realm/Zustand | Messaging send queued with persisted local state | EXTRACT CURRENT | No | R6 | High | Product baseline. | CM2-C09; D3. |
| Unread | Required count/first unread; no others receipts | Absent | Agora membership frontier; Marketplace read_at rejected | last_read_sequence | server frontier | UX trigger Product | Membership frontier by sequence; own messages excluded | ADOPT PATTERN | Mark-read trigger, new-member historical unread | API/UI tests | High | Efficient and privacy-safe. | D2 §5; D3 A4. |
| First Unread | Required | Absent | None complete | sequence frontier | first unread divider | New member frontier pending | API returns/counts enough to locate first unread | BUILD HOMEPLUS | Historical unread | Pagination tests | Medium | Needs sequence frontier and load-around support. | Product Truth. |
| Reply | Inline reply required | Absent | RNChat reply UI | message reply FK/snapshot | RNChat reply | Deleted target behavior implementation | Canonical reply target + UI snapshot | ADOPT DEPENDENCY — PENDING GATE | No | R1 | Medium | RNChat useful, backend canonical. | D2 §10. |
| Reaction | One active/person/target | Absent | Agora unique/RPC; RNChat grouped UI | atomic toggle | shared picker | CM1-C05 declarative | `setReaction(emoji)` / `setReaction(null)` | ADAPT PATTERN | No | Idempotency/race tests | High | Toggle replay unsafe. | CM1-C05; D3 A3; D2 §11. |
| Copy | Required | Absent | RNChat action hook | action endpoint not needed | local action | None | Local copy from shaped visible content | BUILD HOMEPLUS | No | R1/menu | Low | No backend mutation. | D2 §12. |
| Forward | Required | Absent | RNChat action hook only | internal provenance | select target/send | Access leakage correction | Forward creates new message; provenance sanitized by API | BUILD HOMEPLUS | No | API leakage tests | High | Must not leak inaccessible source metadata. | Product Truth; CM1 §3. |
| Edit | Own edit required | Absent | Agora soft lifecycle; donors partial | `edited_at` | custom edited render | no visible edit history | Own edit with edited marker, no history exposed V1 | BUILD HOMEPLUS | No | API/UI tests | Medium | Product explicit. | D1 §3; D2 §12. |
| Delete Everyone | Required | Absent | Agora soft delete | tombstone row | deleted render | Media cleanup not rollback | Tombstone preserves ordering/replies | ADAPT PATTERN | Post/comment delete nuances separate | API/UI/media tests | High | Avoid broken references. | D3 A2/A4. |
| Delete Me | Required | Absent | Agora userDeletedAt analog | hidden table | filter from view model | No canonical cleanup | Personal hide relation | BUILD HOMEPLUS | No | API/view tests | Medium | Personal visibility only. | Product Truth. |
| Star | Personal retrieval | Absent | Ahlan save analogous only | star table | marker/action | CM1-C06 declarative | `setStarred(true/false)` personal | BUILD HOMEPLUS | No | API/UI tests | Low | Idempotent personal state. | Product Truth; CM1-C06. |
| Pin | Shared context | Absent | RNChat actions only | pin table | pinned bar | Authority unresolved | `setPinned(true/false)` shared, authority via Product/permissions | PRODUCT DECISION REQUIRED | Pin authority | API/UI tests | Medium | Shared mutation needs authority. | CM1-C01/C06. |
| System Message | May have actor or no actor | Absent | RNChat `system`; Marketplace system kind | sender not null | render system | CM1-C14 | `kind=SYSTEM`, actor nullable, immutable frontend | BUILD HOMEPLUS | No | DB/API shape tests | Medium | Avoid fake people records. | CM1-C14; D2 §2. |
| Photo | Required messages/feed | Avatar only | Framez multi-photo, Ahlan thumbnails, RNChat image | shared media | basic image gate | Required V1, not OUT | Messages photo + Feed multi-photo | ADAPT PATTERN | No | R3 | High | Product required; donor patterns partial. | D1 §4; D2 §13. |
| Video | Required messages/feed | Absent | RNChat/expo-video; Framez video | shared media | later gate | DEFER WITHIN V1 not OUT | One Feed video, message video | DEFER WITHIN V1 | No | R4 | High | Native/runtime gate. | CM2-C02. |
| File | Required messages | Absent | RNChat custom action only | shared media | custom file view | Required V1 | File attachment message via MediaService/custom render | DEFER WITHIN V1 | No | Implementation gate | High | Product baseline no donor full backend. | Product Truth. |
| Voice | Required messages | Absent | RNChat voice optional peers | shared media | defer voice | Required V1; waveform optional | Voice message record/upload/play | DEFER WITHIN V1 | No | R5 | High | Native audio dependency. | D2 §13; CM2-C02/C03. |
| Message Pagination | Long history loading | Absent | RNChat load earlier; Agora keyset | sequence keyset | load older | Sequence choice updated | `before_sequence`/`after_sequence` over global sequence | ADAPT PATTERN | No | R2/API tests | Medium | Stable history and reconnect. | D2 §14; D3 A5. |
| Scroll Preservation | Required | Feed current ScrollView inadequate | RNChat maintainVisibleContentPosition | keyset | no-yank UI | None | Detail preserve viewport, first unread, new-message affordance | ADOPT DEPENDENCY — PENDING GATE | No | R2 | High | Critical chat UX. | D2 §14. |
| Messaging Search | Required messages/directs/groups | Planner search only | Donors absent | FTS/trigram | typed results | CM1-C10 | Semantics frozen; physical engine implementation-time | BUILD HOMEPLUS | No | Search implementation gate | High | No donor solves. | D1 §10; CM1-C10. |
| Messaging Realtime | Needed for updates, not authority | Presence pattern | Marketplace per-thread; Circle broad | channels | root summary + detail | CM2-C10 | Household summary + thread-scoped detail | ADAPT PATTERN | No | R6/R7 | High | Avoid giant raw global channel. | D2 §4; CM2 §11. |
| Messages Root | Feed Preview + unified Groups/Directs | Absent | Circle split; Marketplace list | thread list | one root view model | placement unresolved | Feed Preview + inbox sorted by meaningful activity | BUILD HOMEPLUS | App Shell placement; reaction ordering | Frontend gate | Medium | Product IA frozen; placement not. | CM2-C08. |
| Feed Preview | Badge top-level posts only | Absent | Donors feed unread absent | feed_read_state | preview row | notification unread rejected | Preview derives from Feed frontier | BUILD HOMEPLUS | Mark-read UX | API/UI tests | High | Donors lack this. | D1 §9. |
| Feed Post Model | Human/System Social only | Mock local posts | Agora entity; feed donors posts | `feed_posts` | FeedPostRow/SystemCard | no ranking fields | Canonical post model with kind/source metadata | BUILD HOMEPLUS | Post delete with comments | API/model tests | High | HOMePLUS-specific. | D1 §1; D3 A1. |
| Human Post | optional text + meaningful content + media rules | mock text-required | D1 donor CRUD partial | edit/delete/tombstone | composer state | media V1 required | Text/media validation; author edit/delete | BUILD HOMEPLUS | Delete with comments | Media/API tests | Medium | Product-specific composer semantics. | Product Truth. |
| System Social | Canonical fact pipeline | Absent | Donors absent | idempotency key | semantic card | Geni boundary | Domain event -> relevance -> Social Moment -> Feed Post | BUILD HOMEPLUS | correction/retraction UX | Domain tests | High | No donor precedent. | Product Truth. |
| Feed Ordering | Reverse chronological, no ranking | Mock order | Ahlan chronological; Framez rejected | sequence | virtualized list | CM1-C04 | Global monotonic `feed_posts.sequence`, order DESC | BUILD HOMEPLUS | No | API pagination tests | Medium | Simpler than per-household counter; gaps okay. | CM1-C04; D1 §2. |
| Feed Pagination | Long history | ScrollView mock | Ahlan keyset; Sharebook offset rejected | sequence keyset | virtualized list | none | Keyset by sequence, no viewport yank | ADAPT PATTERN | No | Frontend/API tests | Medium | Stable under inserts. | D1 §2. |
| Feed Unread | Top-level posts only | Absent | Donors absent | `feed_read_state` | server frontier | Deleted/system/rejoin questions explicit | Person-household post frontier | BUILD HOMEPLUS | first join/rejoin/deleted posts rules | API tests | High | Required and donor absent. | D1 §9. |
| Feed Composer | valid states incl media-only | mock text-required modal | Framez carousel/media | create endpoint | state machine | media required V1 | Custom FeedComposer photos XOR video | BUILD HOMEPLUS | Drafts optional only | R3/R4 | Medium | RNChat not relevant for posts. | CM2 §10. |
| Multi-photo | Feed required | Absent | Framez carousel | media relation | adapt carousel | Required V1 | Multiple photos with ordered media relation | ADAPT PATTERN | No | R3 | Medium | Donor UI useful, backend custom. | D1 §4.4. |
| Feed Video | Feed one video required | Absent | Ahlan/Sharebook/Framez video | media relation | later gate | DEFER WITHIN V1 | One video post, mutually exclusive with photos | DEFER WITHIN V1 | No | R4 | High | Runtime dependency. | CM2-C02. |
| Feed Reaction | Shared grammar one/person/target | local increment mock unsafe | Agora reaction unique | toggle RPC | optimistic | CM1-C05 | `setFeedReaction(emoji|null)` | BUILD HOMEPLUS | No | Race/idempotency tests | Medium | Must be declarative. | D1 §6. |
| Feed Comments | Same Messaging engine | mock hint only | Donor comment engines rejected | comment_thread_id | embedded comment surface | CM1-C09/C13 | `FEED_COMMENTS` thread, hidden from inbox | BUILD HOMEPLUS | Comment media | API/UI tests | High | Product mandates no separate engine. | Product Truth. |
| Comment Reply | Messaging reply applicable | Absent | RNChat reply | same messages | FEED_COMMENT profile | media not inferred | Reply allowed in comment thread | ADOPT DEPENDENCY — PENDING GATE | No | R1 | Medium | Shared engine. | D2 §10. |
| Comment Reaction | Shared grammar | Absent | RNChat UI; donors partial | message reactions | FEED_COMMENT profile | declarative | Same message reaction model on comment messages | ADAPT PATTERN | No | R1/API tests | Medium | Comment messages are messages. | Product Truth. |
| Comment Media | Not frozen | Absent | RNChat can render; donor comments mostly text | implied by engine risk | Product decision | CM2-C05 | Do not expose media comments until Product decision | PRODUCT DECISION REQUIRED | Comment media | R3/R4/R5 if approved | Medium | Capability reuse != exposure. | CM2-C05. |
| Media Service | Shared media | Avatar pattern only | Agora files/provider; Framez UI | media table | upload state | checksum not required | Shared private Household MediaService | ADAPT PATTERN | No | R3/R4/R5 | High | Required across messages/feed. | D3 A7; CM1-C11. |
| Media Security | Household-private | RLS helpers | Ahlan public rejected | private storage | no public truth | public URL rejected | Signed/access-controlled URLs, metadata canonical | BUILD HOMEPLUS | No | Security tests | High | Prevent household leakage. | D1 §14. |
| Media Cleanup | Must be recoverable | Existing mechanisms unclear | Agora best-effort | scheduled cleanup | preserve refs | CM1-C07 | Principles frozen; mechanism implementation-time | IMPLEMENTATION-TIME DECISION | No | Implementation gate | Medium | Do not overfreeze cron/outbox. | CM1-C07. |
| Notifications Boundary | Events eligible, Notifications owns delivery | Attention badge/outbox patterns | Ahlan/Sharebook/Agora | notify signals | global owner | CM1-C08/C12 | Emit eligible domain events only | REUSE CURRENT | Notification policy out of scope | Notifications gate | Medium | Avoid premature push policy. | D3 A9. |
| Search | Messages, Feed Posts, Feed comments | Planner search | Donors absent; Agora advanced | FTS/trigram | typed UX | CM1-C10 | Semantics frozen; physical engine implementation-time | IMPLEMENTATION-TIME DECISION | No | Search gate | Medium | Product matters now, indexes later. | D1 §10. |
| RLS | Defense in depth | Helpers current | Agora server gates + deny-all | RLS matrix | no client trust | no unauthorized coordinator powers | Backend gate + RLS backstop | REUSE CURRENT | Authority mappings | RLS tests | High | Security invariant. | CM1-C01. |
| API Shaping | Semantic API | Mapper conventions | Agora shape layer | controllers/services/RPC | adapters | DB rows not contract | Shape every response | REUSE CURRENT | No | API contract tests | Medium | Protects frontend from schema churn. | D3 A6. |
| Reliability Core | Idempotent retry/offline | Planner strong | Ahlan partial; OfflinePOC rejected | V2 simplified | extract primitives | no Planner DAG pollution | Extract identity/store/state/retry/lifecycle only | EXTRACT CURRENT | No | R6 | High | Current is stronger than donors. | D3 Part C. |
| Realtime Ownership | Transport only | Presence pattern | Marketplace scoped; Circle broad | events | topology | CM2-C10 | HomePlus owns reconciliation; realtime not authority | ADAPT PATTERN | No | R6/R7/R8 | High | Prevent duplicate/conflicting truth. | CM2-C10. |
| RNChat | UI candidate only | Dependency peers absent | RNChat rich UI MIT | view model | primary engine candidate | CM2-C01 | Primary UI engine candidate pending R1/R2 | ADOPT DEPENDENCY — PENDING GATE | No | R1/R2 decide viability | High | Architectural choice != dependency acceptance. | D2 §8-16; CM2 §15. |
| Navigation | Screen relationships frozen partly | Typed routes; FeedFamiliar stack route | Donor routes irrelevant | conceptual | placement pending | CM2-C08 | Messages root, Feed, detail, search, deep links; placement Product/App Shell | PRODUCT DECISION REQUIRED | Messages root placement | Navigation tests | Medium | IA frozen, tab placement not. | `navigation/types.ts`. |
| Deep Links | Direct/group/message/post/comment | Planner deep-link pattern | Marketplace thread refs | endpoints | typed targets | inaccessible fallback | Typed links with no-access/tombstone fallback | BUILD HOMEPLUS | Post/comment delete UX | Navigation tests | Medium | Must handle access loss. | CM2 §14. |
| Testing | Master gates required | Planner tests strong | RNChat tests, Ahlan partial | backend matrix | frontend matrix | add corrections | Domain/API/DB/RLS/idempotency/race/realtime/offline/component/media/mobile | BUILD HOMEPLUS | No | All gates | High | Prevents architecture-only PASS. | D1 §13; D2 §16; D3 C11. |
| Runtime Gates | R1-R8 | No RNChat deps | RNChat peers risk | N/A | R1-R8 | media required within V1 | R1/R2 dependency viability; R3-R8 staged required gates | IMPLEMENTATION-TIME DECISION | No | R1-R8 | High | Must validate in real app. | CM2 §17. |

---

## 6. Messaging Target Candidates

### Conversation Model

`messaging_threads` is the conceptual canonical conversation aggregate with `kind` values `DIRECT`, `GROUP`, `FEED_COMMENTS`.

| Semantic field | Target candidate | Status |
|---|---|---|
| Household ownership | Every thread belongs to one household | TECHNICALLY RESOLVED |
| Kind | `DIRECT`, `GROUP`, `FEED_COMMENTS` | TECHNICALLY RESOLVED |
| Group title | Group-only display title | PRODUCT authority for rename unresolved |
| Group lifecycle | `ACTIVE`, `CLOSED`, reopen same thread | TECHNICALLY RESOLVED |
| Direct identity | Household + sorted person pair DB uniqueness | TECHNICALLY RESOLVED |
| Feed Comments relation | One comment thread per Feed Post | TECHNICALLY RESOLVED |
| Creator semantics | Group creator is human; Feed Comments creator/created_by may be nullable or non-human source-aware | IMPLEMENTATION-TIME DECISION |
| Last meaningful activity | New message, last-preview-changing edit, last-preview-changing delete | PRODUCT DECISION REQUIRED for reactions |
| Hidden from inbox | `FEED_COMMENTS` excluded from Messages inbox | TECHNICALLY RESOLVED |

### Canonical Direct

**Technical recommendation:** DB-enforced sorted pair uniqueness.

| Option | Verdict | Rationale |
|---|---|---|
| `person_low_id` / `person_high_id` stored columns + partial unique | Recommended if generated/stored constraints are clear | Easy query/debug, DB enforced. |
| Generated pair key | Acceptable fallback | Compact but less transparent. |
| Expression unique index over least/greatest | Strong candidate | Avoids duplicated stored values if DB supports clean expression index. |
| RPC-only uniqueness | Rejected | Race safety must be DB-enforced. |

`ensureDirect` must be idempotent, race-safe, scoped by household and return existing thread on replay/conflict.

### Group Membership / Lifecycle

Architecture resolved: active relation controls access; joined/removed timestamps audit lifecycle; full history readable for active group members regardless of join time; removed member loses access; authored history remains; closed group remains readable; reopen preserves same thread.

Product authority unresolved: rename, add member, remove member, pin, settings, creator-leaves and successor rules.

Creator-leaves edge case remains explicit: Product must decide whether creator who loses Household membership retains any close/reopen authority, transfers authority, or disables creator-only actions.

### Message Canonical Model

Candidate semantic fields: `id`, global `sequence`, `thread_id`, `household_id`, `sender_person_id` nullable for system, `actor_person_id` optional for system actor, `body`, `kind USER|SYSTEM`, `reply_to_message_id`, forward provenance internal fields, `edited_at`, `deleted_for_everyone_at`, `deleted_by_person_id`, `client_message_id`, `created_at`, `updated_at` if needed.

RNChat `IMessage` is a derived view model only. It cannot define DB fields, idempotency, permissions, unread or lifecycle.

### Message Ordering Decision

| Dimension | Global monotonic sequence | Per-thread monotonic sequence |
|---|---|---|
| Send race | DB sequence avoids explicit counter row locks; order is allocation order | Requires per-thread counter lock or serializing writes per thread |
| Row locking | No per-thread counter row | Needs thread/counter lock for gapless-ish per-thread order |
| Counter contention | One DB sequence, optimized and non-transactional | Hot active thread may contend |
| Pagination | `(thread_id, sequence)` works | `(thread_id, sequence)` works |
| First unread | `WHERE thread_id=A AND sequence > frontier` works despite global gaps | Works with smaller local numbers |
| Reconnect | Can fetch by thread/frontier and global catch-up if needed | Thread-specific only unless extra timestamp/global cursor |
| Ordering | Stable total order across table; gaps possible | Stable local order; gaps possible on rollback if sequence allocated transactionally depending implementation |
| Implementation simplicity | Simpler; no custom counter mutation | More moving pieces |
| Indexes | `(thread_id, sequence)` plus global PK/sequence if needed | `(thread_id, sequence)` unique |
| Gaps | Harmless for frontier | Harmless but not a differentiator |

**TECHNICAL RECOMMENDATION: GLOBAL.** Use a global monotonic `messages.sequence` and always query thread history with `thread_id` + `sequence`. This avoids introducing per-thread counter locking without proven need. If implementation later proves global allocation order causes unacceptable UX under long transactions, revisit at implementation gate, but current evidence supports global for safety and simplicity.

### Send Reliability

| Concern | Target candidate |
|---|---|
| `client_message_id` | Generated once per user action, stable across retry/restart. |
| Optimistic identity | UI key uses client id while pending; maintain alias to server id after confirmation. |
| Backend uniqueness | Unique by sender/scope/client id or equivalent idempotency table; replay returns canonical message. |
| Same-ID replay | Same payload returns existing canonical response. |
| Same-ID different-payload | Idempotency conflict, terminal failed/conflicted; never mutate existing message silently. |
| Timeout uncertain | Mark uncertain; next drain asks backend/replays with same id. |
| Auth loss | Stop automatic retry, preserve visible failed content when useful. |
| Group closed | Stop automatic retry; content terminal failed/actionable. |
| Reconciliation | Backend response primary; realtime echo deduped by client/server identity. |
| Realtime echo | Never create duplicate and never confirm solely by raw event without identity. |

### Read / Unread

Architecture: thread membership frontier stores last read sequence; unread count = messages in thread with `sequence > frontier`, excluding own visible messages and deleted-for-me messages. First unread is first loaded message after frontier. Others' read receipts are rejected for V1.

Product pending: exact mark-read trigger and historical unread behavior when a new group member receives full history.

### Reactions, Star, Pin, Hide

Message reactions: one active reaction per person per message; backend operations are `setReaction(emoji)` and `setReaction(null)`.

Star: personal retrieval with `setStarred(true/false)`.

Pin: shared context with `setPinned(true/false)`, but authority is Product Decision Required.

Hide/delete-for-me: personal hidden relation; canonical message remains.

### Edit / Delete / Forward

Edit own sets edited marker and exposes no visible edit history V1. Delete for everyone creates a tombstone preserving sequence and reply references. Delete for me filters personal view only.

Forward creates a new message in the target thread. Source provenance must be API-safe: expose only a generic forwarded marker or accessible source context after server access check; never leak inaccessible household/thread/member metadata.

### System Messages

System messages are frontend-immutable, can have optional human actor or no actor, and must not force fake sender/person records. Group lifecycle events may use system messages if Product/UI wants visible timeline markers; otherwise lifecycle can remain thread metadata.

---

## 7. Feed Target Candidates

### Feed Post Canonical Model

Semantic fields: `id`, global `sequence`, `household_id`, `kind HUMAN|SYSTEM_SOCIAL`, `author_person_id` nullable for system, `actor_person_id` optional, `body`, `edited_at`, `deleted_at`, tombstone visibility flag/derived policy, `comment_thread_id`, system source identity, source metadata, `created_at`, `updated_at`.

No algorithmic score, follower fields, public graph fields or per-post audience fields.

### Feed Ordering Decision

| Option | Analysis | Verdict |
|---|---|---|
| Global feed table sequence | Simple, DB sequence avoids household counter locks; `WHERE household_id=X AND sequence > frontier` works despite gaps | Recommended |
| Per-household sequence | Local numbers but requires household counter locking/contention and more implementation complexity | Not recommended without proven need |
| `(created_at,id)` | Avoids sequence but timestamp precision/reconnect/first unread frontiers are more error-prone | Reference only |

**TECHNICAL RECOMMENDATION: GLOBAL.** Use a global monotonic `feed_posts.sequence`, query by `household_id` and `sequence`, order `sequence DESC`. This satisfies reverse chronological insert order and Feed unread without household counter locks.

### Feed Unread

Architecture: per person/household Feed frontier with last seen top-level post sequence. Only top-level posts count. Comments and reactions do not increment Feed Preview badge.

Pending Product details: first join frontier, deleted unread post adjustment/tombstone, System posts count yes/no candidate yes because Product says System Social Posts are Feed Posts, and rejoin Household semantics.

### Human Post Lifecycle

Human posts support text-only, photo-only, video-only, text+photos, text+video. Empty and photos+video are invalid. Author can edit/delete; edited marker visible; no visible edit history; no restore V1. Tombstone appears only when needed, especially if comments/deep links require context.

Exact post-with-comments deletion behavior remains Product Decision Required.

### System Social

Canonical pipeline: canonical domain event -> social relevance evaluation -> idempotent Social Moment representation -> Feed Post.

Safe source identity must include household scope, source module, source entity/event key and version/hash if rerunnable. Duplicate event/rerun returns existing or creates corrected representation according to Product UX decision. Correction/retraction UX remains Product Decision Required. Geni does not own persistence.

### Feed Comments Thread

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| EAGER create thread atomically with Post | Simple invariant, no simultaneous-first-comment race, `comment_thread_id` non-null, uniform for Human/System posts, easier delete/deep-link lifecycle | Unused thread rows for posts with no comments | Recommended |
| LAZY create on first comment | Avoids empty rows | Race on simultaneous first comments, nullable FK complexity, idempotency complexity, harder System Social uniformity | Not recommended |

**Recommendation:** EAGER. Create `FEED_COMMENTS` thread atomically with every Feed Post. It must not appear in Messages inbox, uses Household access, inherits post visibility boundary and preserves canonical messages. System Social posts use the same thread relation without fake human creator.

### Feed Reactions

Feed reactions use same behavior grammar as message reactions. A separate physical table is acceptable. Backend contract must be desired-state: `setFeedReaction(emoji)` and `setFeedReaction(null)`.

---

## 8. Media Target Candidate

Media architecture: shared `MediaService`, private Household storage, metadata rows, and semantic relation tables for message attachments and feed post media. Public URL is not canonical identity. Checksum is not required V1 without proven use.

Feed supports multiple photos OR one video. Messages support photo, video, file and voice.

Media lifecycle principles:

| Scenario | Principle |
|---|---|
| Upload failure | No canonical message/post mutation should be created as successful. |
| Attachment binding | Domain mutation binds already uploaded/validated media atomically with content where possible. |
| DB mutation fails after upload | Preserve recoverable orphan cleanup path; preserve user retry context. |
| Delete-for-me | No canonical media cleanup. |
| Delete-for-everyone/post delete | Media becomes cleanup-eligible if unreferenced and policy allows. |
| Cleanup failure | Must not rollback canonical mutation. |
| Orphan recovery | Recoverable/retryable; mechanism implementation-time. |

Cleanup mechanism remains `IMPLEMENTATION-TIME DECISION`: cron, scheduled job, outbox, worker or periodic cleanup are not frozen here.

---

## 9. Reliability Target Candidate

Extract from Planner Reliability only the general primitives: operation identity, idempotency key, request hash/conflict detection where useful, AsyncStorage wrapper with validation/quarantine, state machine, retry/backoff+jitter, retry-after, hydrate `in_flight -> uncertain`, lifecycle scope by session/household, observability sanitization and thin adapters.

Do not import Planner domain DAG language into Messaging UI. Dependency graph is only optional/minimal for upload-then-send or upload-then-post.

Mutation offline scope recommendation:

| Mutation | Classification | Rationale |
|---|---|---|
| Message send | QUEUE REQUIRED | Product requires offline pending/retry/no duplicates. |
| Feed comment send | QUEUE OPTIONAL | Comments reuse engine, but Product only explicitly requires Messaging send robustness. |
| Message reaction | QUEUE OPTIONAL | Declarative op makes queue safe, but not baseline-critical. |
| Star message | QUEUE OPTIONAL | Declarative personal op. |
| Pin message | ONLINE ONLY V1 | Shared authority-sensitive; Product authority unresolved. |
| Edit message | ONLINE ONLY V1 | Version/conflict/access-sensitive. |
| Delete everyone | ONLINE ONLY V1 | Destructive/access-sensitive. |
| Delete me | QUEUE OPTIONAL | Personal declarative op; can be online-only if scope tight. |
| Create Feed Post | QUEUE OPTIONAL | Nice UX; not required before message send reliability. |
| Feed reaction | ONLINE ONLY V1 | Declarative with optimistic rollback enough V1. |
| Feed post edit/delete | ONLINE ONLY V1 | Destructive/versioned. |
| Mark read message/feed | ONLINE ONLY V1 | Idempotent frontier; can sync opportunistically. |

Access loss + pending send: server authorization lost or Group closed stops automatic retry, preserves visible failed content when useful, exposes terminal action, and does not replay automatically if access later returns unless Product explicitly allows.

---

## 10. Realtime Target Candidate

Recommended topology:

| Surface | Channel | Events | Lifecycle |
|---|---|---|---|
| Messages Root | Household summary channel | thread summary changed, feed preview changed, membership changed | mount/focus, cleanup on blur/logout/household switch/access loss. |
| Conversation Detail | Thread-scoped channel | message created/updated/deleted, reaction changed, pinned changed, membership, closed/reopened | subscribe only while open. |
| Feed | Household feed channel | post created/edited/deleted/retracted, visible reaction count changed | no viewport yank; new-post affordance. |
| Post Detail | Post/comment thread channel | comment message/reaction changes | open only. |
| Typing | Broadcast per thread | typing | Optional/deferred. |

Realtime is never authority. Canonical backend response/replay remains primary reconciliation. Events must carry authoritative identity/version sufficient for dedupe; otherwise trigger refetch.

Cleanup required on unmount, logout, Household switch, access loss and Group removal.

---

## 11. Security/API Boundary

Frontend -> backend semantic API -> service/domain -> DB/RPC -> shaped canonical response.

No direct donor Supabase mutation architecture. No raw RNChat model as persistence. No DB rows as API contract.

Authorization model: backend primary gate plus RLS defense-in-depth. Semantic policy requirements:

| Domain | Policy requirement |
|---|---|
| Threads | Active household + active thread membership for read; kind-specific create/manage gates. |
| Direct | Both participants active valid Household members at creation/access time. |
| Groups | Explicit members only; removed loses access; close/reopen creator V1; other authority Product pending. |
| Messages | Active thread member for read/send; own edit/delete-everyone; system immutable from frontend. |
| Reactions | Active visible target access; one active/person/target. |
| Star/hide | Self only. |
| Pin | Shared target access plus unresolved authority. |
| Feed | Active valid Household members see full history; create Human Post if active member. |
| Feed edit/delete | Author only unless Product maps extra global permission. |
| Media | Access through owning household and semantic relation. |
| Search | Server filters by household/thread/post access. |

Do not freeze unauthorized Coordinator powers or Feed-specific moderation hierarchy.

Membership loss/rejoin behavior:

| Scenario | Technical target | Product pending |
|---|---|---|
| Household membership lost | Stop API access, clear subscriptions, freeze/terminalize pending sends | Rejoin history semantics. |
| Group removed | Thread no-access state, stop retry/subscription, authored messages remain | None for loss itself. |
| Queued sends after access lost | Stop automatic retry; preserve failed local content if useful | Replay after access returns. |
| Thread currently open | Replace detail with no-access/closed state based on server result | UX copy. |
| Deep link inaccessible | Show no-access/not-found/tombstone fallback | Rejoin/direct semantics. |

---

## 12. RNChat Decision + Capability Profiles

### Decision

RNChat is the **PRIMARY UI ENGINE CANDIDATE** for Direct, Group and potentially Feed Comment conversation surfaces.

Dependency acceptance is **ADOPT DEPENDENCY — PENDING R1/R2 COMPATIBILITY GATES**.

What RNChat gives: bubbles, composer, reply UI, reaction UI, message actions hooks, date separators, load earlier, image/video/audio renderers, keyboard/list integration options, theming and Spanish labels.

What HOMePLUS customizes: HomePlus visual tone, mapper to `IMessage`, edited/deleted/failed/file renderers, pinned bar, no-access/closed states, Feed Comment profile, action menu permission filtering and accessibility.

What HOMePLUS implements itself: persistence, backend APIs, reliability queue, permissions, unread/frontiers, search, media upload/storage, business lifecycle, realtime reconciliation, dedupe, notification integration.

### Capability Profiles

| Capability | DIRECT | GROUP | FEED_COMMENT | State |
|---|---|---|---|---|
| Text/emoji/line breaks | YES | YES | YES | BUILD HOMEPLUS + RNChat gate |
| Reply | YES | YES | YES | ADOPT DEPENDENCY — PENDING GATE |
| Reactions | YES | YES | YES | ADAPT PATTERN |
| Photo | YES | YES | PRODUCT DECISION REQUIRED | DEFER/BUILD within V1 for messages |
| Video | YES | YES | PRODUCT DECISION REQUIRED | DEFER WITHIN V1 |
| File | YES | YES | PRODUCT DECISION REQUIRED / candidate NO V1 | DEFER WITHIN V1 |
| Voice | YES | YES | PRODUCT DECISION REQUIRED / candidate NO V1 | DEFER WITHIN V1 |
| Copy | YES | YES | YES | BUILD HOMEPLUS |
| Forward | YES | YES | Product decision/candidate NO V1 | BUILD HOMEPLUS for messages |
| Edit own | YES | YES | YES for own comment if comment engine exposed as messaging | BUILD HOMEPLUS |
| Delete for me | YES | YES | Candidate NO unless Product defines personal comment hide | PRODUCT DECISION if desired |
| Delete everyone | YES | YES | Own comment delete/retract | BUILD HOMEPLUS |
| Star | YES | YES | Candidate NO V1 | BUILD HOMEPLUS for messages |
| Pin | YES | YES | NO unless Product defines | PRODUCT DECISION REQUIRED |
| Typing | Optional/deferred | Optional/deferred | NO candidate | DEFER WITHIN V1 or OUT if Product says |
| Drafts | Optional/deferred | Optional/deferred | Optional/no | DEFER WITHIN V1 |

---

## 13. Required V1 Media/Gates

Required V1 media cannot be silently dropped:

| Capability | Product status | Implementation staging | Gate |
|---|---|---|---|
| Message photo | V1 REQUIRED | After text core | R3 |
| Message video | V1 REQUIRED | Later media stage | R4 |
| Message file | V1 REQUIRED | Later attachment stage | Implementation media/file gate |
| Message voice | V1 REQUIRED | Later audio stage | R5 |
| Feed photos | V1 REQUIRED | Multi-photo composer/display | R3 |
| Feed video | V1 REQUIRED | One-video composer/display | R4 |

Optional enhancements that must not block V1: waveform enhancement, video notes, native sheet, rich markdown.

Runtime gates:

| Gate | Purpose | Exit criteria |
|---|---|---|
| R1 | RNChat core/reply/reactions | Render detail, send text, reply preview, reaction picker/action no crash. |
| R2 | List/keyboard | Long list, fixed composer, keyboard safe on Android/iOS target. |
| R3 | Image | Pick/upload/render photo, multi-photo Feed, failure visible. |
| R4 | Video | Video message/post playback in dev build. |
| R5 | Voice/audio | Record/upload/play voice; waveform optional only if stable. |
| R6 | Offline/reconnect | Pending persists/retries/dedupes; realtime echo reconciles. |
| R7 | Android | Real Android device/emulator validation. |
| R8 | iOS if available | iOS keyboard/media/runtime validation. |

If RNChat fails R1/R2, backend/API contracts remain valid and frontend must fall back to HomePlus custom renderer or alternate UI.

---

## 14. Testing Strategy

| Family | Required coverage |
|---|---|
| DOMAIN | Pure validation for post validity, media XOR, reaction desired-state, frontiers, direct pair normalization. |
| API | Semantic endpoints shape canonical responses, errors, no raw rows, no inaccessible metadata. |
| DB | Unique direct, idempotency keys, sequence ordering, comment thread invariant, constraints. |
| RLS | Household/member/thread/post/media/search access matrices. |
| IDEMPOTENCY | Same key replay, same key different payload conflict, timeout/uncertain replay. |
| RACE | Concurrent ensureDirect, concurrent send, concurrent first comment if implementation deviates from eager, concurrent reactions. |
| REALTIME | Own echo dedupe, late event, reconnect burst, access loss channel cleanup. |
| OFFLINE | Restart recovery, backoff, auth lost terminal failure, group closed terminal failure. |
| COMPONENT | Messages root, detail states, Feed list, composer, post detail, action menus, no-access states. |
| NAVIGATION | Direct/group/message/post/comment deep links, bottom nav hidden in detail, inaccessible fallbacks. |
| MEDIA | Upload validation, partial failure, binding, delete eligibility, private access. |
| ANDROID | Keyboard, list, picker, video, audio, offline/reconnect. |
| IOS if available | Keyboard/media/runtime parity; background limitations not assumed. |

Critical gates: R1/R2 for RNChat viability, R3/R4/R5 for required V1 media, R6 for reliability, R7/R8 for platform runtime.

---

## 15. Rejected Patterns Register

| Pattern | Decision | Reason |
|---|---|---|
| Framez algorithmic ranking | REJECT | Product Truth requires reverse chronological, no ranking. |
| Framez client cascade delete | REJECT | Backend must own lifecycle. |
| SocialSphere ephemeral 24h feed | REJECT | Feed history required. |
| Circle owner/admin/member hierarchy | REJECT | Product/Global Permissions authority unresolved. |
| Circle delete-room lifecycle | REJECT | Conflicts ACTIVE->CLOSED->REOPEN. |
| Circle send reliability | REJECT | Fire-and-forget, swallowed errors, duplicate risk. |
| Marketplace literal domain/listing model | REFERENCE ONLY | Marketplace-specific and instructed reference-only. |
| Marketplace per-message read receipts as target | REJECT | Others' read receipts not required. |
| Ahlan direct Supabase writes | REJECT | HOMePLUS backend trust boundary. |
| Ahlan public storage | REJECT | Household-private media required. |
| Ahlan client timestamps | REJECT | Server canonical timestamps/order. |
| Donor comments engine | REJECT | Feed comments use Messaging engine. |
| HTML posts | REJECT | Plain text/line breaks; avoid XSS surface. |
| Realm/OfflinePOC persistence | REJECT | Overkill; Planner AsyncStorage current is stronger for V1. |
| New Zustand/Redux/global state because donors use it | REJECT | No blocker against CURRENT architecture. |
| Planner domain DAG in Messaging | REJECT | Extract primitives only. |
| Public social graph/follower model | REJECT | Household Feed has no public graph. |
| Raw RNChat model as DB | REJECT | RNChat view model only. |
| Retry-unsafe toggles | REJECT | Declarative set/clear required. |
| Unnecessary checksum | REJECT for V1 | No proven dedupe requirement. |
| Premature push policy | REJECT | Notifications Product Authority owns delivery. |
| Geni community-manager behavior | REJECT | Geni minimal/silent and not canonical social author. |
| Separate Feed moderation hierarchy | REJECT | No Product Truth for social management roles. |

---

## 16. Product Decision Register

| Question | Current Product Truth | Why it matters | Safe default if not decided | Blocks Target Freeze? |
|---|---|---|---|---|
| What happens if Group creator loses Household membership? | Creator may close/reopen V1; group household-bound | Authority continuity and access | Creator loses access; no automatic substitute until decided | NO |
| Who may rename Groups? | Not frozen | Settings/menu and API auth | Disable rename except hidden/internal until decided | NO |
| Who may add/remove Group members? | Explicit subset; no auto-add; authority not frozen | Member management surface and RLS | Creator-only not assumed; require Product permission before UI | NO |
| Who may pin/unpin messages? | Pin shared; authority not frozen | Shared context mutation | Hide pin UI or creator-only only if Product approves; otherwise disabled | NO |
| Are historical messages unread when new Group member is added? | New member gets full history | Unread counts and first unread | Candidate safe default: no historical unread; frontier at current max sequence | NO |
| Direct rejoin semantics after Household loss/rejoin | Direct Household-bound and canonical per pair | Access restoration/deep links/history | Candidate: same canonical Direct restored only if Product accepts | NO |
| Feed Post deletion when comments exist | Tombstone only when needed | Post detail, comments visibility, deep links | Tombstone visible only for existing comments/deep links | NO |
| System Social correction/retraction UX | Pipeline frozen; UX not | Corrected/retracted facts in Feed | Mark superseded/retracted rather than hard delete until UX decided | NO |
| Comment media | Not established | Whether Feed comments expose photo/video/file/voice | Text/reply/reaction comments only | NO |
| Do reactions affect inbox ordering? | Last meaningful activity not fully defined | Conversation ordering and user expectation | Candidate NO; reactions do not reorder | NO |
| Exact mark-read timing | Unread required; trigger not frozen | User-facing read behavior | Server frontier; mark when visible/open-at-bottom, not immediate if deep-linked away | NO |
| Messages root placement in App Shell | IA root frozen; bottom-nav placement not | Navigation/tab changes | Add route without replacing bottom nav until App Shell decision | NO |
| Typing | Optional if cheap | Realtime cost/UI | Defer | NO |
| Drafts | Optional if cheap | Composer persistence | Local-only/defer | NO |

---

## 17. Architecture Decision Register

| Decision | Options | Recommendation | Rationale | Status |
|---|---|---|---|---|
| Message sequence strategy | Global, per-thread, implementation-time | GLOBAL | Simpler, no per-thread locks, gaps harmless for frontier | TECHNICALLY RESOLVED |
| Feed sequence strategy | Global, per-household, `(created_at,id)` | GLOBAL | Supports household frontier without household counter locks | TECHNICALLY RESOLVED |
| Direct canonical key | Low/high cols, generated key, expression unique | DB-enforced sorted pair uniqueness | Race-safe idempotent ensureDirect | TECHNICALLY RESOLVED |
| Reaction transaction primitive | Toggle, set/clear RPC/service transaction | Declarative set/clear | Retry-safe; one active/person/target | TECHNICALLY RESOLVED |
| Star/pin primitive | Toggle, set true/false | Declarative set true/false | Retry-safe | TECHNICALLY RESOLVED; pin authority PRODUCT |
| Comment thread eager/lazy | Eager, lazy | EAGER | Simpler invariant, no simultaneous first-comment race, handles System posts | TECHNICALLY RESOLVED |
| Thread membership physical history | One row/person/thread status, interval rows | One row/status for V1 unless Product needs intervals | V1 semantics need current access + audit, not interval reads | IMPLEMENTATION-TIME |
| System sender/creator nullability | Force person, nullable actor, separate creator fields | Nullable actor/sender where semantic system/no-human | Avoid fake people records | TECHNICALLY RESOLVED conceptually |
| Media cleanup implementation | Cron, scheduled job, outbox, worker, periodic | Do not freeze now | Principle is frozen; mechanism depends CURRENT runtime | IMPLEMENTATION-TIME |
| Search physical strategy | ILIKE, FTS, trigram, GIN, pgvector | Implementation-time; likely FTS/trigram first | Product semantics more important than index freeze | IMPLEMENTATION-TIME |
| RNChat view-model identity reconciliation | Replace id, alias ids, server id only | Stable client id pending + server alias/dedupe | Avoid duplicate echo and list key churn | IMPLEMENTATION-TIME |
| RNChat dependency acceptance | Adopt now, pending gate, reject | Pending R1/R2 | Current peers missing; runtime unproven | IMPLEMENTATION-TIME |
| Feed comment creator field | Human not null, nullable, group-only creator | Nullable/general created_by semantics; group creator separate if needed | Feed comments may belong to system post | TECHNICALLY RESOLVED conceptually |
| Notification delivery | In-app only, push, policy matrix | Notifications owns | Domain event != user notification | BLOCKED BY PRODUCT authority outside scope |

---

## 18. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| RNChat peer mismatch with current Expo/RN | High | R1/R2 before dependency freeze; fallback renderer path. |
| Keyboard/list behavior in conversation detail | High | R2 on devices; avoid wrapping RNChat in incompatible scroll containers. |
| Duplicate optimistic/realtime messages | High | Stable client id, backend replay, alias/dedupe logic. |
| Authorization loss during queued send | High | Stop retry, preserve failed content, no silent replay. |
| Product authority gaps misimplemented as Coordinator powers | High | Keep Product Decision Required; do not expose UI until decided. |
| Feed unread has no donor precedent | High | Build frontier model with DB/API tests. |
| System Social idempotency/corrections | High | Source identity design and Product UX decision before implementation. |
| Media privacy leakage | High | Private storage, access-scoped resolution, RLS/API tests. |
| Media native gates slip V1 | High | Treat as DEFER WITHIN V1, not out of V1. |
| Search cross-household leakage | High | Server-side access filters and RLS tests. |
| Over-extracting Planner Reliability | Medium | Extract primitives only, keep feature adapters thin. |
| Cleanup orphan accumulation | Medium | Monitor and implement recoverable cleanup mechanism later. |

---

## 19. Readiness Verdict

| Area | Status |
|---|---|
| PRODUCT TRUTH COVERAGE | PASS, with explicit Product Decision Register for unfrozen user-facing semantics. |
| CURRENT COVERAGE | PASS, foundations identified and no duplicate foundations recommended. |
| DONOR RECON | PASS, D1/D2/D3 evidence synthesized without re-research. |
| BACKEND CROSS | PASS WITH CORRECTIONS, CM1 premature decisions corrected. |
| FRONTEND CROSS | PASS WITH CORRECTIONS, CM2 dependency/media corrections applied. |
| MASTER CROSS MATRIX | PASS. |
| PRODUCT DECISIONS OPEN | YES, non-blocking for target freeze if recorded. |
| ARCHITECTURE DECISIONS OPEN | YES, implementation-time items remain but target contracts are stable. |
| RUNTIME GATES DEFINED | YES, R1-R8. |
| TARGET ARCHITECTURE FREEZE READY? | YES, with Product Decisions tracked. |

**Final status:** MASTER CROSS MATRIX PASS WITH PRODUCT DECISIONS.

---

## 20. Next Authorized Step

**NEXT AUTHORIZED STEP:** TARGET ARCHITECTURE FREEZE.

Implementation remains locked. No migrations, dependencies, builds, tests, Supabase commands or source edits are authorized until Finance V1.1 receives formal final PASS / ACCEPTED and a separate implementation authorization is granted.

---

## Safety Verification

**Confirmed before write:** HOMePLUS branch `finance-v1-unified`, HEAD `ad4f966`, preexisting Finance/source changes present and preserved.

**Files intentionally created by this lote:** `C:\Users\thega\Desktop\HomePlus-donors\_recon\master\MASTER_MESSAGING_FEED_CROSS_MATRIX.md`.

**Source code modifications:** none.

**Commands intentionally not run:** npm/yarn/pnpm/expo/build/tests/migrations/DB/Supabase/git checkout/reset/clean/pull/commit/push.
