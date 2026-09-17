# CM2 — FRONTEND / RUNTIME / REALTIME / RELIABILITY

**Scope:** HOMePLUS Mensajes + Feed runtime/frontend cross matrix  
**Modo:** READ-ONLY audit + arquitectura candidata, sin implementación  
**Fecha:** 2026-09-02  
**Autoridades:** Product Truth frozen > CURRENT HOMePLUS > D1/D2/D3 proven evidence > Donors > README/assumptions

---

## 1. Executive summary

CM2 confirma que HOMePLUS ya tiene fundamentos frontend reutilizables suficientes para construir Mensajes + Feed sin rediseñar el shell: `AppScreen`, `AppCard`, `AppTopBar`, `AppAvatar`, `SearchField`, `ActionSheet`/sheets, `EmptyState`, `ErrorState`, `Skeleton`, `InteractivePressable`, `BottomNavigation`, `HouseholdSwitcherSheet`, navegación stack/tab, lifecycle de sesión/hogar, `requestJson`, Presence realtime y Planner Reliability.

La decisión candidata principal es: **ReactNativeChat puede ser adoptado como engine UI de conversación, pero nunca como fuente de verdad frontend ni runtime de persistencia**. HOMePLUS debe poseer el estado canónico mapeado, la cola reliability, el envío, reconciliación, retry, unread, permisos, access control y realtime. RNChat recibe `IMessage[]` derivados desde estado HOMePLUS.

Para Mensajes, la ruta segura es un adoption staged: `CORE` primero para texto, composer, reply, reactions, pagination, day separators y basic image. Video, voice, waveform, native sheet, video notes y markdown rich quedan detrás de gates porque agregan peers nativos o compatibilidad runtime no probada en HOMePLUS.

Para Feed, CURRENT `FeedFamiliarScreen` prueba estética y tono familiar, pero hoy es mock/local truth. Debe ser reemplazado por una implementación canónica única, no duplicada. Product Truth exige Feed cronológico, Human + System Social en una sola timeline, sin ranking algorítmico, sin grafo social público, Human rows relativamente flat y System Social con card semántica.

Planner Reliability CURRENT es la base runtime más fuerte. La extracción candidata debe ser mínima: identidad de operación, AsyncStorage validado, state machine, retry/backoff, hydrate recovery, lifecycle por sesión/hogar, observability sanitizada y hooks de pending. No se debe copiar complejidad Planner DAG/domain si Mensajes no la necesita.

Resultado: **PASS como cross matrix arquitectónica read-only**. Validación runtime de RNChat y peers queda pendiente por gates R1-R8.

---

## 2. CURRENT reusable frontend foundations

| Foundation | Estado CURRENT | Uso candidato | Evidencia |
|---|---:|---|---|
| App shell/navigation | PROVEN | Mantener shell global, agregar rutas Messages/Feed/detail | `App.tsx`, `navigation/AppNavigator.tsx`, `navigation/HomeTabNavigator.tsx`, `navigation/types.ts` |
| Bottom nav | PROVEN | Root screens con bottom nav; details deep hide bottom nav por stack externo o nested options | `BottomNavigation.tsx`, `HomeTabNavigator.tsx` |
| AppTopBar + household switcher | PROVEN | Reusar en roots; detalles con header local compacto | `AppTopBar.tsx`, `HouseholdSwitcherSheet.tsx` |
| AppScreen | PROVEN | Base segura para roots, empty/error/loading; detalles chat pueden necesitar layout custom sin scroll wrapper | `components/ui/AppScreen.tsx` |
| AppCard | PROVEN | System Social cards, empty/error containers, inbox rows si hace falta | `components/ui/AppCard.tsx` |
| AppAvatar | PROVEN | Personas, directs, groups, feed authors | `components/ui/AppAvatar.tsx` |
| SearchField | PROVEN | UI consistente para search root y scoped search | `components/ui/SearchField.tsx` |
| Empty/Error/Skeleton | PROVEN | Estados de root, detail, feed, comments | `EmptyState.tsx`, `ErrorState.tsx`, `Skeleton.tsx` |
| Pressables/haptics | PROVEN | Mantener tactilidad existente | `InteractivePressable.tsx`, `utils/haptics.ts` |
| Sheets/modal pattern | PROVEN | Composer media picker, action menus cuando RNChat no alcance | `ActionSheet.tsx`, `QuickActionSheet.tsx`, `PlannerSheetHost.tsx` |
| `requestJson` | PROVEN | Feature service/client adapters con idempotency headers y timeout | `services/api.ts` |
| Lifecycle session/household | PROVEN | Cleanup subscriptions, queues, runtime scope al switch/logout | `services/core/lifecycle.ts`, `registerLifecycleHandlers.ts` |
| Presence realtime | PROVEN | Patrón simple Supabase channel + cleanup + household filter | `PresenceScreen.tsx:181-198` |
| Planner Reliability | PROVEN | Extraer runtime compartido mínimo para messaging send/retry | `services/planner/reliability/*`, D3 Part C |
| Notifications top-bar badge | PARTIAL | Global Notifications debe ser dueño de superficie, no Feed/Messages | `AttentionTopBarButton` en `HomeTabNavigator.tsx` |
| FeedFamiliar | PARTIAL/MOCK | Preservar tono visual; reemplazar local truth/mock interactions | `screens/feed/FeedFamiliarScreen.tsx` |

---

## 3. Main Cross Matrix

| Row | Product Truth | CURRENT HomePlus | Ahlan | Sharebook | Framez | RNChat | Circle | Marketplace | Planner Reliability | Target Candidate | Decision | Runtime Risk | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Messages Root | No primary tabs; Feed Preview + unified inbox | Absent | N/A | N/A | N/A | N/A | Convo/rooms separate | Thread list | N/A | One root query: feed preview + direct/group summaries ordered by activity | BUILD HOMEPLUS | Medium | Product Truth, D2 §1 |
| Direct UI | Conversation detail, bottom nav hidden | Absent | N/A | N/A | N/A | UI engine | Directs text only | Thread detail | Send runtime reusable | RNChat mapped from HOMePLUS state | ADOPT DEPENDENCY | Medium | D2 §8-14 |
| Group UI | Topic groups, closed/reopen history | Absent | N/A | N/A | N/A | UI engine | Rooms useful, roles conflict | N/A | Lifecycle useful | Group detail on same engine, HomePlus permissions | ADAPT PATTERN | High | D2 §7, Product Truth |
| Comment UI | Feed comments reuse Messaging engine | Absent | Nested comments no realtime | Flat comments | 2-level comments | FEED_COMMENT profile | N/A | N/A | Retry possible | Post detail embeds comment conversation surface | BUILD HOMEPLUS | Medium | D1 §5, D2 RNChat |
| Composer | Fixed composer in detail | Feed modal mock | Compose post | Single body/file | Caption/media | Strong composer | Text input | Text input | Form states | RNChat composer for chats/comments; custom FeedComposer for posts | ADOPT PATTERN | Medium | FeedFamiliar lines 237-271, D2 §3 |
| Text | Required | Feed text mock | Proven | HTML body risk | Proven | Proven | Proven | Proven | Queueable | Plain text + line breaks; no HTML | KEEP/BUILD | Low | D1 §1, D2 §2 |
| Reply | Required | Absent | Comment replies only | Absent | Comment parent_id | Proven shallow reply | Absent | Absent | Queueable op | RNChat reply for messages/comments | ADOPT DEPENDENCY | Medium | D2 §10 |
| Reactions | Shared grammar ❤️ 👍 😂 😮 😢 + | Feed like mock count increments | Like/repost/save | Like | Like/dislike | Emoji reactions UI | Absent | Absent | Optimistic states | Shared reaction service + RNChat picker | ADAPT PATTERN | Medium | D1 §6, D2 §11 |
| Context Menu | Copy/forward/edit/delete/star/pin/reply | Absent | Post menus partial | Post actions | Post actions | `messageActions` | Absent | Absent | Failure states | Use RNChat `messageActions` with server-authority permission | ADOPT PATTERN | Medium | D2 §12 |
| Copy | Required | Absent | N/A | N/A | N/A | Via actions only | Absent | Absent | N/A | Local action for text messages | BUILD HOMEPLUS | Low | D2 §12 |
| Forward | Required | Absent | N/A | N/A | N/A | Via actions only | Absent | Absent | Queue send | Select target then create forwarded message | BUILD HOMEPLUS | Medium | Product mechanics |
| Edit | Required | Feed modal create only | Post edit | Upsert edit | Post edit | No model field | Absent | Absent | Version conflict useful | Server canonical edit state; custom render edited marker | BUILD HOMEPLUS | Medium | D2 §2, §12 |
| Delete | For me/everyone | Absent | Hard delete | Hard delete | Client cascade | No model field | Hard delete room conflicts | Absent | Auth failure states | Soft/tombstone semantics in state; render deleted | BUILD HOMEPLUS | High | D1 §3, D2 §2 |
| Star | Required | Absent | Save post analogous | Save? | N/A | Via actions | Absent | Absent | Queue optional | User-local marker | BUILD HOMEPLUS | Low | Product mechanics |
| Pin | Required | Absent | N/A | N/A | N/A | Via actions | Absent | Absent | Version auth | Thread-level pinned message bar | BUILD HOMEPLUS | Medium | Product mechanics |
| Photo | Required messages/feed | Avatar upload only | Single image | Single image | Multi-media | Image renderer | Absent | Image URL only | Upload op possible | Basic image V1; Feed multi-photo via custom carousel | ADAPT PATTERN | Medium | D1 §4, D2 §13 |
| Video | Required messages/feed | Absent feed runtime | Single video | Single video | Video carousel | expo-video optional | Absent | Absent | Upload op possible | Later media gate; feed one video | DEFER/ADOPT LATER | High | D1 §4, D2 §15 |
| File | Required messages | Absent | N/A | N/A | N/A | Attachment action only | Absent | Absent | Queue upload/send | Custom file attachment message rendered via `renderCustomView` | BUILD HOMEPLUS | High | Product mechanics, D2 §13 |
| Voice | Required messages | Absent | N/A | N/A | N/A | Voice UI optional peers | Absent | Absent | Queue upload/send | Defer until dev-build gate | DEFER | High | D2 §13, §15 |
| Pagination | Long history/loading older | Feed ScrollView mock | Feed keyset | Offset | Partial | Load earlier/FlashList | None | Limit only | Queue independent | Keyset for messages/inbox/feed older | ADAPT PATTERN | Medium | D1 §2, D2 §14, D3 §A5 |
| Scroll Preservation | Must preserve | Feed ScrollView no virtual | Fetch guard | None | Carousel | maintainVisibleContentPosition | ScrollToEnd yank | FlashList partial | N/A | RNChat detail + FlashList/keyset; Feed no-yank new-post indicator | ADOPT PATTERN | Medium | D2 §14 |
| Keyboard | System keyboard fixed composer | AppScreen KAV | N/A | N/A | N/A | keyboard-controller peer | KAV | KAV | N/A | Gate RNChat keyboard behavior in current Expo 54 | UNKNOWN | High | package.json, D2 §15 |
| Unread | Root badges/counts, first unread | Absent | Notification unread only | Notification unread | Notification unread | UI only | Bool | Count/read_at | N/A | Server frontier + local viewing rules | BUILD HOMEPLUS | High | D1 §9, D2 §5 |
| First Unread | Required | Absent | Absent | Absent | Absent | Custom divider possible | Absent | Absent | N/A | Store first unread message id from server frontier | BUILD HOMEPLUS | Medium | Product mechanics |
| Typing | Optional if cheap | Absent | Absent | Absent | Absent | UI prop | Absent | Broadcast proven | N/A | Defer unless low-cost after core | DEFER | Low | D2 §4.2 |
| Optimistic | Required | Feed local mock only | Strong for feed | Like only | Strong | Pending flag | Poor dedupe | Reconcile/rollback useful | Strongest | Stable clientMessageId + reliability runtime + echo dedupe | EXTRACT | High | D1 §3, D2 §3, D3 §C |
| Retry | Required | Planner only | Queue partial | Absent | Absent | Consumer owned | Swallowed | Remove+alert | Strong | Shared runtime simplified UX | EXTRACT | High | D3 §C3-C8 |
| Offline | Offline pending required messages | Planner only | AsyncStorage queue | Absent | Absent | UI flags only | Absent | Absent | Strong | Messaging send/reaction queue required; feed selective | EXTRACT | High | D3 §C |
| Realtime | Required | Presence simple table channel | Notifications/messages only | Absent | Notifications/follows only | N/A | Broad channel | Per-thread channel | Realtime bridge pattern | Root summary + detail per-thread; no giant global channel | ADAPT PATTERN | High | PresenceScreen, D1 §7, D2 §4 |
| Feed List | Chronological, no ranking | Mock ScrollView | Chronological keyset | Chronological offset | Algorithmic reject | N/A | N/A | N/A | N/A | Canonical Feed route, virtualized list | BUILD HOMEPLUS | Medium | FeedFamiliar, D1 §2 |
| Feed Post | Human flat, System semantic | Mock cards | User post | User post | Instagram card | N/A | N/A | N/A | Optimistic possible | FeedPostRow + SystemSocialPostCard | BUILD HOMEPLUS | Medium | Product Truth, D1 |
| System Post | Same timeline, semantic card | Absent | Absent | Absent | Absent | System msg renderer not feed | N/A | System chat only | N/A | Distinct card accent, no Geni autonomous author | BUILD HOMEPLUS | Medium | Product Truth |
| Feed Composer | Placeholder fixed | Modal mock, text required | Compose | Body/file | Caption/media | N/A | N/A | N/A | Form states | Custom composer with text optional and photos XOR video | BUILD HOMEPLUS | Medium | FeedFamiliar lines 121-138 |
| Multi-photo | Feed human supports multiple photos OR one video | Absent | Absent | Absent | Proven carousel | Image single msg | Absent | Absent | Upload queue optional | Adapt Framez carousel mechanics with HomePlus aesthetics | ADAPT PATTERN | Medium | D1 §4.4 |
| Feed Video | One video | Absent | Proven single | Proven single | Proven | Video renderer optional | Absent | Absent | Upload queue optional | Later media after Expo/video gate | DEFER | High | D1 §4, D2 §15 |
| Post Reactions | Shared grammar | Mock heart increments count only | Like only | Like only | Like/dislike | Picker can inspire | Absent | Absent | Optimistic rollback | Shared reaction grammar service | BUILD HOMEPLUS | Medium | D1 §6 |
| Feed Comments | Messaging engine | Comment hint mock | Comments no realtime | Flat | 2-level | FEED_COMMENT profile | Absent | Absent | Queue optional | Same message model/profile, scoped to post | BUILD HOMEPLUS | Medium | D1 §5 |
| Feed Unread | Top-level posts only | Absent | Absent | Absent | Absent | N/A | N/A | N/A | N/A | Feed frontier per household/person; comments/reactions excluded | BUILD HOMEPLUS | High | D1 §9 |
| Search | Posts + comments + messages | Planner search only | Absent feed | Absent | Absent | N/A | Absent | Absent | Access scoped | Unified typed results | BUILD HOMEPLUS | High | D1 §10, PlannerSearchScreen |
| Notifications | Global surface owns | Planner attention badge | Notifications proven | Push proven | Notifications RPC | N/A | Push/in-app maybe | N/A | Fire-and-forget candidate | Emit eligible events only, deep links target global router | ADAPT PATTERN | Medium | D1 §11, HomeTabNavigator |
| Deep Links | Direct/group/message/post/comment | Planner only | Partial | Partial | Partial | N/A | N/A | Thread id | Planner contract strong | Add typed targets and inaccessible fallback | BUILD HOMEPLUS | Medium | App.tsx linking, plannerNavigationContract |
| Loading | Required | Proven components | Partial | Partial | Partial | Internal loading props | Partial | Partial | N/A | Use HomePlus states around RNChat/feed | KEEP | Low | UI components |
| Empty | Required | Proven | Partial | Partial | Partial | Empty messages possible | Partial | Partial | N/A | Use `EmptyState`; distinguish no messages/no access/closed | KEEP | Low | EmptyState |
| Error | Required | Proven | Toast | Alert | Alert | Consumer owned | Weak | Alert | Rich state | Use `ErrorState` + retry actions | KEEP/EXTRACT | Low | ErrorState, D3 |
| Skeleton | Required | Proven | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Use for roots/feed; chat detail initial loader | KEEP | Low | Skeleton.tsx |
| Performance | Long lists/media | Feed ScrollView inadequate | FetchGuard | Weak | Memoized list | FlatList/FlashList | ScrollView weak | FlashList | Scheduler bounded | Virtualized lists, bounded realtime batches, avoid premature global store | ADAPT PATTERN | Medium | D1 §14, D2 §14 |
| Tests | Runtime/frontend matrix required | Planner tests strong | Ahlan tests partial | None | None | Jest suite | None | None | Strong unit tests | Unit/component/service/integration + Android/iOS runtime gates | BUILD HOMEPLUS | Medium | D1 §13, D2 §16, D3 §C11 |

---

## 4. ReactNativeChat integration candidate

### Ownership rule

ReactNativeChat **does not become frontend source of truth**. It receives mapped, derived `IMessage[]` from HOMePLUS state and calls HOMePLUS callbacks (`onSend`, reaction press, message action, load earlier). Persistence, retry, dedupe, unread, permissions, edit/delete, media upload and realtime reconciliation remain HOMePLUS-owned.

### Mapping candidate

| HomePlusMessage | RNChat `IMessage` | Notes |
|---|---|---|
| `id` or `clientMessageId` | `_id` | Use stable `clientMessageId` while pending; replace or alias to server ID after reconciliation without duplicate echo. |
| `body.text` | `text` | Preserve emoji and line breaks. Empty string allowed only for media messages if profile permits. |
| `createdAt` | `createdAt` | Prefer server timestamp when confirmed; local timestamp while pending. |
| `sender.personId` | `user._id` | Must match current user id logic. |
| `sender.displayName` | `user.name` | Use HomePlus member/person display. |
| `sender.avatarUrl` | `user.avatar` | Optional. |
| `status=pending/in_flight/retrying/offline` | `pending=true` | Render clock/spinner. |
| `status=confirmed` | `sent=true` | `received` only if delivery semantics later exist. |
| `replyTo` | `replyMessage` | Shallow snapshot for UI; server stores canonical reply target. |
| `reactions[]` | `reactions[]` | Transform one active reaction/user/target into emoji groups. |
| `attachment.type=image` | `image` | Basic supported. |
| `attachment.type=video` | `video` | Gate on `expo-video`. |
| `attachment.type=audio/voice` | `audio` + `duration` | Gate voice recorder/waveform separately. |
| `kind=system` | `system=true` | Use `renderSystemMessage` if needed. |

### Fields RNChat lacks

| Field | Candidate solution | Safety |
|---|---|---|
| `editedAt` | Store in HomePlus model; render via `renderBubble`/`renderMessageText` footer | Safe |
| `deletedForEveryoneAt` | Map text to deleted placeholder or custom render; disable actions | Safe |
| `deletedForMe` | Filter from HomePlus view model before passing RNChat | Safe |
| `forwardedFrom` | Custom header in `renderBubble` or `renderCustomView` | Safe |
| `starred` | Local marker via custom bubble adornment; action via `messageActions` | Safe |
| `pinned` | Thread-level pinned bar outside RNChat; optional marker in bubble | Safe |
| `failed/retry` | HomePlus status + custom render/action; do not rely on `pending` only | Safe |
| `file attachment` | `renderCustomView` or custom bubble, plus open/download handler | Medium risk |

### RNChat props likely needed

| Prop/area | Use |
|---|---|
| `renderMessage` / `renderBubble` | Edited/deleted/failed/file/system/adornments |
| `renderCustomView` | File attachment and custom semantic message blocks |
| `messageActions` | Copy, reply, forward, edit, delete, star, pin |
| `reactions` | Shared reaction picker and pills |
| `reply` | Swipe reply + composer preview |
| `loadEarlierMessagesProps` | Older history loading |
| `isScrollToBottomEnabled` | Incoming while scrolled up |
| `renderDay` | Date separators |
| `theme`, `labels`, `locale='es'` | HomePlus visual language and Spanish labels |
| `listProps` | `maintainVisibleContentPosition`, testIDs, accessibility |

---

## 5. Capability profiles

| Capability | DIRECT | GROUP | FEED_COMMENT | Rationale |
|---|---:|---:|---:|---|
| Text | YES | YES | YES | Required. |
| Emoji/line breaks | YES | YES | YES | Text behavior. |
| Reply | YES | YES | YES | Required messages; comments reuse engine. |
| Reactions | YES | YES | YES | Shared grammar. |
| Photo | YES | YES | PRODUCT DECISION | Product supports feed posts media, comments media not stated. |
| Video | YES | YES | PRODUCT DECISION | Do not infer comments media. |
| File | YES | YES | NO V1 | Product requires messaging file; not comments. |
| Voice | YES | YES | NO V1 | Product requires messaging voice; not comments. |
| Copy | YES | YES | YES | Text target. |
| Forward | YES | YES | NO V1 | Comments should not auto-forward unless product says. |
| Edit own | YES | YES | YES | Product requires messaging; own comment edit acceptable. |
| Delete for me | YES | YES | NO | Comment visibility is not personal unless defined. |
| Delete for everyone | YES | YES | Own comment delete/retract | Server authority. |
| Star | YES | YES | NO V1 | Not product-required for comments. |
| Pin | YES | YES | NO | Comments should not create thread pin. |
| Typing | DEFER | DEFER | NO | Optional if cheap; comments not needed. |
| Closed composer disabled | N/A | YES | If post deleted/locked | Group product mechanic. |

---

## 6. Messages Root candidate

Root has no primary tabs. Candidate first load returns one view model:

| Section | Data | UX |
|---|---|---|
| Feed Preview | latest top-level posts, unread count/frontier, timestamp | Compact preview row/card above inbox, not a primary tab. |
| Unified inbox | Direct + Group summaries | One chronological list sorted by last meaningful activity DESC. |
| Summary fields | id, type, title, avatar/group icon, last meaningful preview, last activity timestamp, unread count, has failed/pending own send | AppAvatar/AppCard/Row style; no donor social tab UX. |
| Loading | Root skeleton | Use HomePlus `Skeleton`. |
| Error | Retry | `ErrorState` with retry. |
| Empty | No conversations yet + Feed CTA | `EmptyState`, avoid fake content. |
| Realtime updates | Summary changes only | No global full-message channel. |

Meaningful activity excludes typing and local draft. It includes new messages, edited last-message if preview changes, delete/retract if last-message tombstone changes, reaction only if product later decides reactions move threads. Candidate default: reactions do not reorder inbox.

---

## 7. Conversation runtime candidate

| State | UI candidate | Notes |
|---|---|---|
| initial loading | Full-screen spinner/skeleton, header visible | Avoid blank RNChat. |
| history loaded | RNChat list + fixed composer | Bottom nav hidden. |
| loading older | Top load earlier indicator | Preserve viewport. |
| sending | Optimistic message with clock | Stable clientMessageId. |
| pending offline | Clock + subtle “Se enviará cuando vuelva la conexión” on message or composer banner | No Planner jargon. |
| failed | Error icon + Retry action on bubble | Preserve content. |
| retrying | Clock/sync indicator | Same visual family as pending. |
| uncertain | “Revisando envío” subtle state | Do not duplicate. |
| edited | Small “editado” marker | Custom render. |
| deleted | Tombstone “Mensaje eliminado” | Disable content actions except maybe info. |
| reply target | RNChat reply preview | Server stores canonical target. |
| pinned message | Bar above list | Outside RNChat. |
| closed Group | History readable, composer disabled, status visible | May reopen. |
| lost access | Replace detail with no-access state; stop channel; cancel pending sends | Server remains authority. |
| empty conversation | Empty state + composer | Direct/group created but no messages. |

---

## 8. Feed frontend candidate

### CURRENT audit

`FeedFamiliarScreen` currently uses local `MOCK_POSTS` and `MOCK_HITOS`, `useState`, local `publishPost`, local `toggleReaction`, `ScrollView`, local modal composer and generated `Date.now()` ids. This is not runtime truth. It can inform HomePlus tone: warm background, family avatar colors, compact header, soft cards, subtle section labels.

### KEEP

| Pattern | Reason |
|---|---|
| Warm HomePlus visual tone | Matches existing app palette. |
| Family author row with initials/avatar | Reusable via `AppAvatar`. |
| Compact comment hint | Useful as affordance into Post detail. |
| Simple chronological vertical reading | Aligns Product Truth. |

### REPLACE

| Pattern | Reason |
|---|---|
| `MOCK_POSTS` / `MOCK_HITOS` | Fake local truth. |
| `Date.now()` post ids | Not canonical/reliable. |
| Local reaction increments | Violates one active reaction/user/target. |
| `ScrollView` for feed | Long history requires virtualized list. |
| Emoji `illustration` as media substitute | Product requires photos/video. |
| Modal composer text-required | Product says text optional; multiple photos OR one video. |

### Candidate components

| Component | Responsibility |
|---|---|
| `FeedScreen` | Canonical route, initial load, pagination, realtime indicator, unread frontier. |
| `FeedPostRow` | Human post flat social row. |
| `SystemSocialPostCard` | Semantic system post treatment inside same timeline. |
| `FeedComposer` | Human post create flow. |
| `FeedMediaCarousel` | Multiple photos OR one video display. |
| `FeedPostDetail` | Post + comment conversation surface. |
| `FeedPreview` | Messages Root compact preview. |

---

## 9. Comments integration candidate

Post detail owns post header/content and embeds a comment conversation surface using Messaging engine with `FEED_COMMENT` profile. No separate donor comment engine.

| Concern | Candidate |
|---|---|
| Load | Fetch post and comments independently; post deleted state handled. |
| Pagination | Older comments with cursor; chronological reading. |
| Reply | Same reply target model as messages. |
| Reactions | Same reaction grammar. |
| Edit/delete | Own comments only; server authority. |
| Realtime | Subscribe to post comment events only while detail open. |
| Deleted post | Show tombstone/unavailable post state; PRODUCT DECISION REQUIRED for tombstone with existing comments. |

---

## 10. Media UX candidate

### Feed composer state machine

| State | Meaning | Allowed transitions |
|---|---|---|
| EMPTY | No text/media | TEXT, PHOTOS, VIDEO, cancel |
| TEXT | Text only | PHOTOS, VIDEO, EMPTY, PUBLISHING |
| PHOTOS | One or more photos | Remove/add photos, TEXT+PHOTOS, UPLOADING, EMPTY |
| VIDEO | One video | Remove video, TEXT+VIDEO, UPLOADING, EMPTY |
| UPLOADING | Media upload active | PUBLISHING, FAILED, cancel if supported |
| PUBLISHING | DB publish active | PUBLISHED, FAILED |
| FAILED | Upload/publish failed | Retry, edit, cancel |
| PUBLISHED | Server confirmed | Close/reset |

Rules: photos and video are mutually exclusive; text is optional only when media exists; permissions are requested at action time; draft behavior is deferred unless cheap; partial multi-photo failure should preserve successful local selections and allow retry without silently publishing incomplete media.

### Display

| Case | Candidate |
|---|---|
| text-only | Flat row, no empty media frame. |
| single photo | Rounded image area with HomePlus spacing. |
| multiple photos | Framez carousel mechanics adapted, no Instagram clone styling. |
| one video | Poster/thumbnail + play control; gate on video runtime. |
| system post | Semantic card/accent, not media carousel unless source has media. |

### Upload

Picker, preview, upload status, retry and cancel are required for decent UX. Per-file progress only if backend/service exposes progress; do not fake progress. Failed publish after successful upload should preserve media references and allow retry/cleanup policy later.

---

## 11. Realtime strategy

Candidate channel strategy:

| Surface | Channel | Events | Behavior |
|---|---|---|---|
| Messages Root | Household scoped summary channel | conversation summary changed, feed preview changed, membership changed | Update summaries; dedupe by version/timestamp. |
| Direct/Group detail | Thread-specific channel | message created/updated/deleted, reaction changed, membership, closed/reopened | Reconcile into current thread only. |
| Feed list | Household feed posts channel | post created/edited/deleted/retracted, post reaction if visible count changes | Insert at top only if user at top; otherwise show new-post indicator. |
| Post detail/comments | Post-specific comments channel | comment created/updated/deleted/reaction | Update comment surface while open. |
| Typing | Broadcast per thread | typing | Deferred. |

Rules: subscribe on mount/focus; cleanup on blur/unmount; dispose on session logout and household switch; dedupe own events by `clientMessageId`/server id; handle late events by cursor/version; never mark optimistic op confirmed from realtime alone unless backend event contains authoritative identity enough to reconcile.

Circle broad multi-table channel is useful as reference but not target; Marketplace per-thread channel is the safer pattern for detail. Presence CURRENT proves Supabase channel cleanup by household filter.

---

## 12. Reliability/offline strategy

### Shared runtime extraction candidate

| Primitive | Extract? | Notes |
|---|---:|---|
| Connectivity source | YES | Reuse injectable `isOnline`/`subscribe` style. |
| Operation identity | YES | `mutationId`, `idempotencyKey`, `requestHash`; can simplify UI copy only. |
| AsyncStorage operation store | YES | Versioned wrapper, validation, quarantine. |
| State machine | YES | `pending`, `in_flight`, `uncertain`, `retrying`, `conflicted/failed`, `confirmed`. |
| Retry policy | YES | Exponential backoff + jitter + retry-after. |
| Lifecycle scope | YES | Session + household switch disposal. |
| Observability sanitization | YES | No PII in logs/events. |
| Dependency graph | PARTIAL | Needed for upload-then-send or post media publish; not Planner DAG complexity. |
| Planner domain adapters | NO | Planner-specific. |
| Planner cache invalidation | NO | Messaging/feed need their own adapters. |

### User-facing language

| Runtime state | UX |
|---|---|
| pending/offline | Clock icon; “Se enviará cuando vuelva la conexión” if banner needed. |
| in_flight | Clock/sending. |
| uncertain | “Revisando envío” or neutral sync indicator. |
| retrying | Clock/sync; no scary copy. |
| terminal failed/conflicted | Error icon + `Reintentar`; preserve content. |
| authorization lost | Stop retry, show access changed. |
| group closed | Stop new sends, keep history. |

### Feed offline scope V1

| Mutation | Classification | Rationale |
|---|---|---|
| Create Post | QUEUE OPTIONAL | Nice UX, but product requires robust messaging baseline first. |
| Comment | QUEUE OPTIONAL | Comments reuse engine but can defer offline. |
| Reaction | ONLINE ONLY ACCEPTABLE V1 | Optimistic with rollback OK; offline queue can be later. |
| Edit | ONLINE ONLY ACCEPTABLE V1 | Conflict risk; avoid over-engineering. |
| Delete | ONLINE ONLY ACCEPTABLE V1 | Destructive/access-sensitive. |
| Message send | QUEUE REQUIRED | Product explicitly requires pending/failed/retry/offline pending. |
| Message reaction | QUEUE OPTIONAL | Shared feel useful, less critical than send. |

---

## 13. Unread strategy

### Feed unread

Feed unread applies to top-level posts only. Comments and reactions do not badge Feed Preview.

| Scenario | Candidate behavior |
|---|---|
| Messages Root Feed Preview | Show unread post count/badge from server frontier. |
| Opening Feed | Mark visible/top-level posts read when feed opens and first page is loaded, or after brief dwell; exact frontier server-owned. |
| New post while Feed at top | Insert without yanking if near top; mark read after visible. |
| New post while scrolled down | Do not yank viewport; show “N publicaciones nuevas” affordance. |
| System vs human posts | Both count as top-level posts unless source is retracted/deleted before read. |
| Deleted unread post | Server count/frontier adjusts; client removes or tombstones. |

### Messages unread

| Scenario | Candidate behavior |
|---|---|
| Inbox badge/count | Server unread count per conversation, excluding own messages. |
| First unread divider | Computed from membership `lastReadAt`/frontier and loaded messages. |
| Opening thread | Do not immediately mark all read if user lands away from bottom/history target; mark when unread messages become visible or thread is opened at bottom. |
| Incoming while viewing near bottom | Append and mark read after visible. |
| Incoming while scrolled up | Keep count, show scroll-to-bottom/new messages button. |
| Own messages | Never create unread for self. |
| Others read receipts | Not required; no blue tick UI V1. |

---

## 14. Search/notifications/navigation

### Search UX

Unified typed results: `GROUP`, `DIRECT`, `MESSAGE`, `FEED_POST`, `FEED_COMMENT`. Backend handles access; frontend must not show inaccessible results.

| Result type | Presentation | Navigation |
|---|---|---|
| GROUP | Group icon/avatar, title, last context | Group detail. |
| DIRECT | Person avatar, display name | Direct detail. |
| MESSAGE | Conversation label + snippet + timestamp | Thread detail focused on message. |
| FEED_POST | Author/system label + snippet/media indicator | Feed post detail. |
| FEED_COMMENT | Post context + comment snippet | Feed post detail focused on comment. |

Use `SearchField` visual language. Highlight snippets if backend returns ranges; otherwise avoid unreliable local highlight.

### Notifications UX

Global Notifications owns the notification surface. Messages/Feed emit eligible events only. No duplicate local notification system inside Feed/Messages.

| Target | Deep-link target | Inaccessible behavior |
|---|---|---|
| Direct | Direct detail | Show no-access/not-found state. |
| Group | Group detail | Closed readable if member; lost access if removed. |
| Message | Thread detail + message focus | If deleted, show thread with tombstone/fallback. |
| Feed Post | Post detail | If deleted/retracted, show unavailable/tombstone state. |
| Feed Comment | Post detail + comment focus | If deleted, show post and comment unavailable marker if policy allows. |

### Navigation candidate

| Route | Placement |
|---|---|
| Messages root | Product decision: likely tab/root replacement/addition in HomeTabs; no primary tabs inside root. |
| Feed | Canonical route reachable from Messages root preview and optional direct route. |
| Direct detail | Stack detail, bottom nav hidden. |
| Group detail | Stack detail, bottom nav hidden. |
| Post detail/comments | Stack detail, bottom nav hidden. |
| Search | Root search and deep-link search route. |
| Notification deep links | Linking config extended like Planner pattern. |

---

## 15. Compatibility matrix

HOMePLUS current dependencies: Expo `~54.0.35`, React `19.1.0`, React Native `0.81.5`, `react-native-safe-area-context ~5.6.0`, `react-native-svg 15.12.1`, `expo-dev-client`, no Reanimated, no Gesture Handler, no FlashList, no keyboard-controller, no expo-image-picker, no expo-video, no expo-audio.

RNChat peers/evidence: React `>=18`, RN `*`, safe-area `>=5`, Gesture Handler `>=2`, Reanimated `>=3 || ^4`, keyboard-controller `>=1`; optional FlashList, expo-audio, expo-video, image-picker, audio-api, streamdown, true-sheet, vision-camera, svg.

| Feature | Status | Reason |
|---|---|---|
| Core text UI | LIKELY COMPATIBLE | React/RN versions likely acceptable; missing required peers must be added later. |
| Reply | UNKNOWN | Requires Gesture Handler + Reanimated integration not installed. |
| Reactions | LIKELY COMPATIBLE | Mostly JS/UI but may depend on RNChat base peer setup. |
| FlashList | UNKNOWN | `@shopify/flash-list` absent; version/gate needed. |
| Image | LIKELY COMPATIBLE | Renderer URL-based; picker/upload separate. Zoom dependency comes with RNChat deps. |
| Video | UNKNOWN/CONFLICT UNTIL PEER | `expo-video` absent; dev-build likely. |
| Voice recording | UNKNOWN/CONFLICT UNTIL PEER | `expo-audio` absent; dev-build likely. |
| Audio waveform | UNKNOWN/CONFLICT UNTIL PEER | `react-native-audio-api` absent. |
| Video note | UNKNOWN/CONFLICT UNTIL PEER | `react-native-vision-camera` absent and native heavy. |
| Native sheet | UNKNOWN/CONFLICT UNTIL PEER | `@lodev09/react-native-true-sheet` absent. |
| Markdown | UNKNOWN/CONFLICT UNTIL PEER | `react-native-streamdown` absent and optional; product does not require rich markdown. |
| Keyboard behavior | UNKNOWN | RNChat expects `react-native-keyboard-controller`; HOMePLUS only has keyboard-aware-scroll-view. |
| Expo Go | UNKNOWN | HOMePLUS has `expo-dev-client`; optional native peers block Expo Go for later media. |

---

## 16. Dependency strategy

| Stage | Features | Dependency stance | Gate |
|---|---|---|---|
| CORE | Text, bubble, composer, reply, reactions, date separators, pagination, basic image URL | Add only RNChat required runtime peers needed by actual core; avoid media peers | R1/R2/R3 |
| LATER MEDIA | Video playback, richer image picker/upload integration | Add `expo-video`, image picker/media service only when backend ready | R4 |
| LATER VOICE | Voice record/playback, waveform | Add `expo-audio`, possibly `react-native-audio-api`; dev build required | R5 |
| DEFERRED NATIVE | Video notes, native true sheet, streamdown markdown | Do not block core messaging | Later product gate |

Optional native peers must not block text messaging. No new global state dependency like Zustand is justified by current evidence.

---

## 17. Runtime gates

| Gate | Purpose | Exit criteria |
|---|---|---|
| GATE R1 | RNChat text/reply/reactions compatibility | Minimal conversation renders, sends text, reply preview, reaction picker, no crash. |
| GATE R2 | FlashList/keyboard behavior | Long list works, composer stays fixed, keyboard does not cover input on Android/iOS. |
| GATE R3 | Image attachment | Pick/upload/render basic image URL, retry failure visible. |
| GATE R4 | Video | Video post/message playback works in dev build. |
| GATE R5 | Voice/audio | Record, upload, play, retry; waveform only if stable. |
| GATE R6 | Offline/reconnect | Pending persists across restart, retry dedupes, realtime echo reconciles. |
| GATE R7 | Android runtime | Real Android device/emulator validation. |
| GATE R8 | iOS/runtime if available | iOS keyboard/media/runtime validation. |

No execution performed in CM2.

---

## 18. Frontend test matrix

| Area | Unit | Component | Service | Integration | Runtime Android/iOS |
|---|---|---|---|---|---|
| Messages root | Sort/view model | Root loading/empty/error/badges | Root client query | Realtime summary update | Navigation + badges |
| Direct detail | Mapper | RNChat wrapper states | Message service | Send/reconcile/dedupe | Keyboard/scroll |
| Group detail | Permissions view model | Closed/lost access UI | Membership service | Membership event while open | Reopen/closed device behavior |
| Send | Identity/hash | Pending bubble | Reliability adapter | Success, timeout, auth lost | Offline send |
| Retry/offline | State machine | Retry action UI | Queue/store | Restart recovery | Airplane mode |
| Reconciliation | Dedupe pure functions | Duplicate echo UI | Realtime adapter | Own echo, late event | Reconnect burst |
| Reply | Mapper | Reply preview/bubble | API payload | Deleted replied target | Swipe gesture |
| Reaction | Toggle reducer | Picker/count/highlight | Reaction service | Switch/toggle/rollback | Rapid taps |
| Edit/delete | Permission menu | Edited/deleted render | Mutation service | Server reject rollback | Long press menu |
| Star/pin | View model | Menu + pinned bar | Local/server service | Pin event | Header layout |
| Media | Validation | Carousel/preview | Upload service | Upload then send/post | Picker permissions |
| Voice | Validation | Recorder/player | Upload service | Record/send/play | Native audio gate |
| Pagination | Cursor helpers | Load earlier state | Query client | Preserve viewport | Long history |
| Unread | Frontier helpers | First unread divider | Mark read service | Incoming while scrolled | Notification badge |
| Feed create | Composer state | FeedComposer | Feed service | Publish success/fail | Media permissions |
| Feed media | Media rules | Carousel/video | Upload service | Multi-photo partial failure | Video runtime |
| Feed comments | Mapper/profile | Comment surface | Comments service | Realtime comment | Post detail scroll |
| Feed realtime | Insert policy | New posts indicator | Realtime adapter | No-yank viewport | Reconnect burst |
| Feed unread | Frontier rules | Feed Preview badge | Read service | Deleted unread post | Root navigation |
| System Social | Type rendering | System card states | Service shape | Correction/retraction | Accessibility |
| Search/deep links | Type guards | Result list | Search client | Inaccessible target | Deep-link app launch |
| Notifications | Target parser | Fallback state | Notification adapter | Deleted target | Push/deep link |

---

## 19. Rejected donor patterns

| Donor/pattern | Decision | Reason |
|---|---|---|
| Framez algorithmic ranking | REJECT | Product Truth requires reverse chronological, no algorithmic ranking. |
| SocialSphere ephemeral 24h semantics | REJECT | Product Truth does not define ephemeral Feed. |
| Circle owner/admin/member hierarchy as target | REJECT | HomePlus group authority unresolved; donor hierarchy cannot redefine product. |
| Circle delete-room lifecycle | REJECT | Conflicts with closed/reopen and history-readable groups. |
| Circle send reliability | REJECT | Fire-and-forget, swallowed errors, duplicate risk. |
| Marketplace as implementation source | REFERENCE ONLY | Explicit authority; useful only for patterns. |
| Marketplace per-message `read_at` as automatic target | REJECT as automatic | Unread target can use membership frontier; no blue ticks required. |
| Planner DAG/domain complexity | REJECT for Messaging V1 | Extract primitives, not Planner domain graph. |
| Feed mocks/local truth | REJECT | Must replace, not duplicate. |
| Public social graph/media assumptions | REJECT | HomePlus household-private semantics. |
| Separate donor comment engine | REJECT | Feed comments reuse Messaging engine. |
| HTML post body | REJECT | Product requires plain content, no HTML/XSS surface. |

---

## 20. Deferred features

| Feature | Status | Reason |
|---|---|---|
| Typing | DEFER | Optional if cheap; core messaging should not wait. |
| Drafts | DEFER | Optional if cheap; reliability send more important. |
| Voice recording/waveform | DEFER | Native peers and dev-build gate. |
| Video notes | DEFER | Not product-required; heavy native dependency. |
| Markdown rich rendering | DEFER/REJECT V1 | Product does not require markdown. |
| Native true sheet | DEFER | Existing HomePlus sheets sufficient until blocker proven. |
| Feed edit/delete offline queue | DEFER | Destructive/versioned; online-only acceptable V1. |
| Feed reaction offline queue | DEFER | Optimistic rollback acceptable V1. |
| Comment media | PRODUCT DECISION | Product does not specify media comments. |
| Others read receipts | DEFER | Explicitly not needed V1. |

---

## 21. Product decisions required

| Question | Why it matters |
|---|---|
| Group creator leaves Household | Determines group continuity and admin transfer. |
| Group management authority | Determines who renames, closes/reopens, pins, removes members. |
| Rename authority | Needed for group settings UI/menu availability. |
| Historical unread on member addition | Product says added member gets full history; unread frontier for old messages needs decision. |
| Post tombstone with existing comments | Determines post detail after delete/retract. |
| System Social correction/retraction presentation | Determines normal/corrected/retracted/unavailable card states. |
| Comment media | Needed before enabling RNChat media in `FEED_COMMENT`. |
| Reactions move inbox ordering? | Candidate says no; product may decide otherwise. |
| Mark-read timing exactness | Candidate uses visibility/dwell; product may require open-immediate. |
| Messages root placement in bottom nav | Product defines root IA but not current tab replacement. |

---

## 22. Risks

| Risk | Severity | Mitigation |
|---|---:|---|
| RNChat peer mismatch with Expo 54/RN 0.81 | High | Runtime gates before broad adoption; staged dependencies. |
| Keyboard behavior in chat detail | High | Gate R2 on Android/iOS; avoid AppScreen scroll wrapper around RNChat list. |
| Realtime duplicate optimistic echoes | High | Stable clientMessageId + server id alias + dedupe by identity. |
| Offline uncertain sends duplicate server writes | High | Idempotency key + requestHash + server replay support. |
| Feed unread absent in all donors | High | Build HomePlus frontier model; do not borrow notification unread. |
| Feed realtime absent in donors | Medium | Use Supabase/HomePlus patterns; no donor proves full feed realtime. |
| Closed/lost access edge cases | High | Server authority, channel cleanup, cancel pending sends. |
| Media upload partial failure | Medium | Explicit state machine, no fake progress. |
| Over-abstracting reliability | Medium | Extract only primitives; keep feature adapters thin. |
| New global state dependency creep | Medium | Use existing contexts/services/hooks unless blocker proven. |
| Long lists performance | Medium | Virtualized list, keyset pagination, bounded realtime updates. |
| Product authority gaps | Medium | Mark PRODUCT DECISION REQUIRED, do not invent semantics. |

---

## Safety verification

Read-only constraints honored for source code and donors. No dependencies installed, no Expo/build/tests run, no package locks modified, no migrations, no source edits.

Confirmed inputs inspected:

| Source | Evidence |
|---|---|
| D1 Feed donors | `_recon/deep/D1_FEED_DONORS_DEEP_RECON.md` |
| D2 Messaging donors | `_recon/deep/D2_MESSAGING_DONORS_DEEP_RECON.md` |
| D3 Backend/reliability | `_recon/deep/D3_BACKEND_RELIABILITY_DEEP_RECON.md` |
| CURRENT Feed | `front/mi-front-limpio/screens/feed/FeedFamiliarScreen.tsx` |
| CURRENT Navigation | `App.tsx`, `navigation/AppNavigator.tsx`, `navigation/HomeTabNavigator.tsx`, `navigation/types.ts` |
| CURRENT UI foundations | `components/ui/*` |
| CURRENT Presence realtime | `screens/presence/PresenceScreen.tsx`, `services/presence.ts` |
| CURRENT Planner Reliability | `services/planner/reliability/*`, `components/planner/PlannerReliabilityStatus.tsx` |
| CURRENT dependencies | `front/mi-front-limpio/package.json` |
| RNChat contract/deps | `06_ReactNativeChat/package.json`, D2 sections §8-16 |

CM2 FRONTEND/RUNTIME/RELIABILITY: PASS
