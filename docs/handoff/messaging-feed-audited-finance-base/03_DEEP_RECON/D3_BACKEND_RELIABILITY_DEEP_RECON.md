# D3_BACKEND_RELIABILITY_DEEP_RECON

**READ-ONLY DEEP RECON — BACKEND ARCHITECTURE + RELIABILITY**

**Fecha**: 2026-09-02  
**Branch HomePlus**: `finance-v1-unified` (HEAD: `ad4f966`)  
**Git status HomePlus**: 9 modified, 8 untracked (preexistentes, preservados)

---

## PART A — AGORA BACKEND REFERENCE (AGPL-3.0, REFERENCE-ONLY)

> **NOTA**: Agora Server es un backend social/community compatible con Replyke SDK. Patrones documentados solo para discovery; **NO se copia código**.

### A1. ENTITY / POST SCHEMA (`packages/core/src/db/schema/content.ts`)

| Aspecto | Detalle |
|---------|---------|
| **Tabla** | `entities` (posts + entidades genéricas) |
| **PK** | `id` (uuid, defaultRandom) |
| **FKs** | `projectId` → projects (cascade), `spaceId` → spaces (set null), `userId` → profiles (set null) |
| **Author** | `userId` nullable (permite anclas authorless para `createIfNotFound`) |
| **Lifecycle** | `isDraft` (bool), `deletedAt` (soft delete), `isPublic` (internet-visibility ladder) |
| **Status** | `moderationStatus` enum: `approved` | `removed`; `moderatedAt/By/Type/Reason` audit trail |
| **Timestamps** | `createdAt`, `updatedAt` (defaultNow), `deletedAt` nullable |
| **Reactions** | `reactionCounts` jsonb (8 tipos v7) + legacy `upvotes[]`/`downvotes[]` arrays |
| **Counters** | `repliesCount` (int, trigger-maintained), `views` (int) |
| **Ordering/Ranking** | `score` (doublePrecision), `scoreUpdatedAt`, `createdAt`; feed ordena por `score desc` o `createdAt desc` |
| **Media relation** | `attachments` jsonb + tabla `files` separada (FK `entityId`, `commentId`, `chatMessageId`, `spaceId`, `eventId`) |
| **Indexes** | `entities_project_short` (unique project+shortId), `entities_project_foreign` (unique project+foreignId), `entities_feed_score_idx` (project, space, score desc), `entities_feed_new_idx` (project, space, createdAt desc), `entities_user_idx` (project, userId) |
| **Constraints** | Unique en (projectId, shortId) y (projectId, foreignId); FK cascade en projectId; set null en spaceId/userId |

**Patrón clave**: Contadores desnormalizados mantenidos por **triggers SQL** (migration 0002), nunca recomputados en request. `reaction_counts` jsonb + arrays legacy coexisten para compatibilidad SDK.

---

### A2. COMMENTS (`apps/api/src/routes/comments.ts`, `content.ts` schema)

| Aspecto | Detalle |
|---------|---------|
| **Parent model** | `parentId` → `comments.id` (self-ref, cascade delete) — **un nivel de nesting** (SDK construye árbol client-side) |
| **Nesting** | One-level threaded reads via `parentId`; `/thread` endpoint usa RPC `fetch_comment_thread` para subárbol completo |
| **Deletion** | Soft delete por defecto (`userDeletedAt` + `deletedAt`); hard delete modo `CONTENT_DELETE_MODE=hard` cascada FK |
| **Author** | `userId` nullable (set null on delete) |
| **Permissions** | `assertCanReadEntity` (hereda gate del entity/space); ownership check en PATCH/DELETE (`ownedComment`) |
| **Pagination** | Offset-based (`readPagination`: page/limit/offset); stable ordering por `createdAt` |
| **Ordering** | `resolveCommentSort`: `createdAt` | `top` | `controversial` | `new` | `old` (deprecated aliases) |
| **Reactions** | Mismo modelo `reactions` (targetType=`comment`); `toggle_reaction` RPC + trigger mantiene `reactionCounts` |
| **Count** | `repliesCount` en comment (trigger bump en insert reply); `entity.repliesCount` también bump |
| **Orphan prevention** | RPC `fetch_comment_thread` poda removed + **subárbol completo** (evita huérfanos en cliente) |

**Patrón clave**: RPC `fetch_comment_thread` empuja visibilidad de moderación **dentro del SQL** (parámetro `p_hide_removed`) para que hijos de removed no queden huérfanos.

---

### A3. REACTIONS (`content.ts` schema, `entities.ts`/`comments.ts` routes)

| Aspecto | Detalle |
|---------|---------|
| **Schema** | Tabla `reactions`: `projectId`, `targetType` (entity|comment|message), `targetId`, `userId`, `reactionType` (8 enum), timestamps |
| **Unique constraint** | `(projectId, targetType, targetId, userId)` — **una reacción por usuario por target** |
| **Taxonomy** | 8 tipos v7: `upvote`, `downvote`, `like`, `love`, `wow`, `sad`, `angry`, `funny` (enum `reactionType`) |
| **Toggle** | RPC `toggle_reaction(projectId, targetType, targetId, userId, type)` — atómico set/switch/clear |
| **Response shaping** | `{ reactionCounts, userReaction }` — counts desnormalizados en target + reacción del user actual |
| **Tests** | Integration: toggle on/off, switch type, persistencia cross-request, no score refresh en comments |

**Patrón clave**: RPC Postgres atómico + trigger mantiene `reaction_counts` jsonb en entity/comment/message. `upvote` refresca `entity.score` via `refresh_entity_score`.

---

### A4. CHAT / CONVERSATION (`chat.ts` schema, `chat.ts` routes)

| Aspecto | Detalle |
|---------|---------|
| **Conversation model** | `conversations`: `type` (direct|group|space), `spaceId` opcional, `postingPermission` (members|admins), `lastMessageAt` |
| **Membership** | `conversationMembers`: unique (conversationId, userId), `role` (admin|member), `lastReadAt`, `mutedUntil`, `mutedForever`, `isActive`, `leftAt` |
| **Messages** | `chatMessages`: `conversationId`, `userId`, `content`, `parentMessageId` (threads), `quotedMessageId`, `threadReplyCount`, `reactionCounts` (emoji→count map), `userDeletedAt`, moderation fields |
| **Reactions** | `chatMessageReactions`: unique (messageId, userId, emoji) — **emoji libre** (no enum fijo); denormalized map en message |
| **Direct vs Space** | Direct: get-or-create 1:1 via SQL join; Space: get-or-create persistente bound a space, auto-join members |
| **Read/Unread** | `lastReadAt` en membership; unread count = mensajes > `lastReadAt` (excluye own + userDeleted) |
| **Socket fanout** | `emitToConversation` / `emitToUser` / `emitMessageCreated` tras commit DB; eventos: `message:created`, `message:updated`, `message:deleted`, `message:reaction`, `thread:reply_count`, `conversation:created/updated/deleted`, `member:joined/left` |

**Patrón clave**: Conversation preview (inbox) = último mensaje + unread count + ≤5 other members; keyset pagination por `COALESCE(lastMessageAt, createdAt) DESC`.

---

### A5. PAGINATION (`packages/contract/src/pagination.ts`, `apps/api/src/http/envelope.ts`)

| Aspecto | Detalle |
|---------|---------|
| **Envelope** | `{ data: T[], pagination: { page, pageSize, totalPages, totalItems, hasMore } }` — **offset-based** |
| **readPagination** | Parse `?page=` `?limit=` → `{ page, limit, offset }`; cap limit 100, min 1 |
| **Keyset** | Solo en `/chat/conversations` (inbox) y `/chat/conversations/:id/messages` — cursor ISO timestamp (`COALESCE(lastMessageAt, createdAt)` o `createdAt`) |
| **Stable ordering** | Feed: `score desc` + `createdAt desc` tie-break; Comments: `createdAt`; Chat: `createdAt desc` (main) / `asc` (thread) |
| **Cursor encoding** | ISO timestamp string (ms precision); `date_trunc('milliseconds')` en `after` cursor para evitar off-by-one µs |
| **Tests** | Integration: paginación feed, comments, chat messages; `hasMore` correcto; cursor reconnect catch-up |

**Patrón clave**: **Híbrido** — offset para feeds/listas simples; keyset (cursor timestamp) para inbox/chat donde la estabilidad importa. `paginate()` en contract compartido (server + admin).

---

### A6. API BOUNDARIES (`entities.ts`, `comments.ts`, `chat.ts`, `shape.ts`)

| Capa | Responsabilidad |
|------|-----------------|
| **Route** | HTTP handling, auth middleware, validación zod (`parseBody`), permission checks, llama a service/logic inline |
| **Validation** | `parseBody(schema, body, domain)` — zod schemas en `lib/validation.ts` (re-export de `@agora-server/contract`) |
| **Service/Lib** | Lógica de negocio en route handlers (no capa service separada); helpers en `lib/` (shape, notifications, storage, embeddings) |
| **DB** | Drizzle ORM via `getDb()` request-scoped; `sql` tags para RPC/triggers |
| **Shape** | **`lib/shape.ts`** — capa obligatoria: Drizzle row → camelCase API model; Date→ISO; deriva `userReaction`/`isSaved`; blanks deleted content; batch loads (`attachUserReactions`, `loadUsers`, `loadEntityFiles`) |
| **Response envelope** | `paginate(data, total, page, limit)` → contract `PaginatedResponse`; errores via `Errors.*` → `{ error, code, field? }` |

**Cómo evita mezclar DB rows con API model**: **Nunca** retorna row crudo. Todo pasa por `shapeEntity/shapeComment/shapeChatMessage` que normalizan, derivan campos computados y filtran PII. `shape.ts` es la **única** salida hacia contrato.

---

### A7. STORAGE (`storage.ts` routes, `lib/storage.ts`, `lib/storage-cleanup.ts`, `lib/images.ts`)

| Aspecto | Detalle |
|---------|---------|
| **Upload** | POST `/storage` (multipart) → `uploadBytes(path, bytes, contentType)` → `files` row; POST `/storage/images` → Sharp variants (webp original + thumbnail/small/medium) |
| **Validation** | `assertUploadSize` (cap `MAX_UPLOAD_BYTES`); MIME inferido → tipo `image|video|document|other` |
| **Image processing** | `storeImageFromUpload` → Sharp: webp original + 3 variants; `files.image` jsonb con `variants.{thumbnail,small,medium}.{path,width,height}` |
| **Path identity** | Key: `${projectId}/files/${uuid}${ext}`; `originalPath` guarda **URL pública completa**; variantes guardan **bare keys** |
| **Delete** | Hard mode: `collectFileRows` (entity+comments subtree, comment+replies subtree, chatMessage, event) ANTES del delete; `removeMediaAsync` fire-and-forget best-effort |
| **Orphan cleanup** | Soft mode nunca limpia storage (recuperable); hard mode solo en delete handlers explícitos |
| **Failed transaction cleanup** | No automático; `removeMediaAsync` loggea error pero no revierte DB (aceptado: media orphan es menor que data loss) |

**Patrón clave**: Provider seam (`STORAGE_PROVIDER=supabase|s3`) detrás de `getStorage()`; call sites agnósticos. Path identity via `${projectId}/` prefix permite extraer keys aun si `S3_PUBLIC_URL` cambió.

---

### A8. SECURITY (`middleware/auth.ts`, `lib/space-access.ts`, `lib/moderation-visibility.ts`, `lib/project-roles.ts`)

| Patrón | Descripción |
|--------|-------------|
| **Auth middleware** | `requireAuth` (JWT HS256, rotation/reuse-detection/30s grace via `refresh_tokens`); `optionalAuth`; `authWall` (private by default — allowlist explícita) |
| **Access checks** | Handlers **siempre** validan: `assertCanReadEntity`, `assertCanReadSpace`, `assertCanPostInSpace`, `ownedEntity/Comment` — trust boundary = server, **no RLS** |
| **RLS** | Deny-all backstop en todas tablas (migration 0017); nuevas tablas **deben** añadir su propio RLS deny-all en migration que las crea |
| **Permissions** | Roles: `operator` (env) ⊇ `owner` ⊇ `admin` ⊇ `steward` ⊇ `member`; helpers `isProjectAdmin`/`isProjectOwner` foldean operator |
| **Space access** | `readingPermission` (anyone|members) + `postingPermission` (anyone|members|admins) — gates en server, no RLS |
| **Moderation visibility** | `removedPolicy(c)` → `excludeRemovedSql` (listas) / `shouldHide` (single); **removed siempre hidden** para non-operators; operators bypass para review |
| **Deny-all strategy** | Default private; allowlist mínima (`/auth/*`, `/public/*`, pre-sign-in paths); añadir entrada = decisión de seguridad con test |

**Patrón clave**: **Server-side gates en كل handler** — RLS solo defense-in-depth. `spaceRepGate` middleware añade reputation context. No confiar en FK/RLS para authz.

---

### A9. NOTIFICATIONS (`lib/notifications.ts`)

| Flujo | Detalle |
|-------|---------|
| **Domain action** | `notifyOnComment`, `notifyOnEntityMentions`, `notifyOnReaction`, `notifyOnFollow`, `notifyOnConnectionRequest/Accept`, `notifyStewardCaseEvent`, `notifyMediationInvite`, `notifyOnSpaceApproved` |
| **Persistence** | `insert()` → `appNotifications` table (projectId, userId, type, action, metadata, createdAt) |
| **create_notification_safe** | `insert` interno: skip self-notify, dedupe via `notified` Set, catch+log errors (nunca rompe write subyacente) |
| **Push** | `dispatchNotificationPush` fire-and-forget (Web Push/FCM/APNs via `lib/push`); solo tipos push-worthy |
| **Read** | `appNotifications.isRead`; inbox polling + realtime `notification:created` via socket.io |
| **Dedupe** | Set `notified` por fan-out (entity author, parent comment author, mentions); milestones por thresholds `MILESTONES=[10,25,50,100,250,500,1000]` |

**Patrón clave**: **Fire-and-forget con catch interno** — notificación fallida nunca rompe la mutación origen. Realtime + push como capas separadas.

---

### A10. TEST ARCHITECTURE (`apps/api/test/integration/*.test.ts`)

| Categoría | Patrones extraíbles |
|-----------|---------------------|
| **Entities** | Create + shaped readback; auth required; toggle_reaction RPC + trigger; soft delete 404; by-foreign-id createIfNotFound (idempotente, race-safe, project-scoped) |
| **Comments** | Threaded replies + parent replies_count trigger; comment reactions (target=comment, no score); by-foreign-id; ownership edit; soft delete hide |
| **Reactions** | Cubierto en entities/comments tests — toggle on/off/switch, persistencia, counts |
| **Permissions** | Ownership enforcement (403 non-owner); space read/post gates; moderation visibility (removed hidden); project-scoping |
| **Pagination** | Feed offset pagination; chat keyset cursor (inbox + messages); `hasMore` correcto; reconnect catch-up (`after` cursor) |
| **Chat** | Conversation create/direct; membership; messages pagination (main/thread); reactions emoji map; push dispatch; space conversation auto-join |
| **Storage** | Upload file + images variants; associations; shapeFile |
| **Notifications** | Unit tests `lib/notifications.test.ts`: policy matrix stewardCaseRecipients, mentionIds parsing, milestone thresholds |

**Patrón útil**: **Integration tests aislados por `projectId`** — cada test crea su proyecto; `fileParallelism:false`; globalSetup aplica migraciones. Unit tests: funciones puras (shapers, validation, ranking, envelope) sin DB.

---

## PART B — EXPO OFFLINE POC (`09_ExpoOfflineFirstPOC`)

### B1. PENDING OPERATION MODEL (`src/features/offline-queue/schema.ts`, `types.ts`)

```typescript
interface IPendingOperation {
  id: string;                    // UUID v4 (Crypto.randomUUID)
  actionType: 'CREATE_POST' | 'ENABLE_NOTIFICATIONS';  // enum fijo
  payload: string;               // JSON stringificado
  createdAt: Date;               // timestamp creación
  retryCount: number;            // int, default 0 (incrementado en failure)
  // NO state field — inferido por presencia en cola
  // NO ordering field — sorted por createdAt en processQueue
}
```

**Realm schema**: `primaryKey: 'id'`, propiedades tal cual. **Sin** `state`, `idempotencyKey`, `dependencies`, `scope`, `expectedVersion`.

---

### B2. QUEUE (`src/features/offline-queue/offlineQueueService.ts`)

| Función | Implementación |
|---------|----------------|
| **Enqueue** | `realm.write` → create `PendingOperation`; `useQueueStore.incrementPending()`; llama `processQueue()` inmediato |
| **Dedupe** | **Ninguna** — cada enqueue crea fila nueva (incluso misma acción) |
| **Processing** | `processQueue()`: check `NetInfo.fetch()` → si offline return; `realm.objects.sorted('createdAt')`; batch `syncOperations(ops)` |
| **Network trigger** | `NetInfo.fetch()` en `processQueue`; **no listener persistente** (llama desde enqueue + UI) |
| **Sync** | POST `/sync` con array ops; backend responde `{ success, processed: [{id, success}] }` |
| **Retry** | En catch: `op.retryCount += 1` para **todas** ops pendientes (no solo falladas); sin backoff, sin maxAttempts |
| **Permanent failure** | **No manejo** — ops quedan en cola indefinidamente incrementando retryCount |
| **Restart recovery** | Realm persiste; al reiniciar app, cola intacta; `processQueue` se llama desde enqueue o UI |
| **Background sync** | `index.js` registra `expo-background-task` + `expo-task-manager`; `AppState` + `NetInfo` listeners disparan sync |

**Gap crítico**: Sin idempotency key → reenvíos duplican en backend. Sin estado → no distingue pending/in-flight/confirmed. Sin backoff → retry storm.

---

### B3. OPTIMISTIC UI (`src/store/uiStore.ts`)

```typescript
interface Post {
  id: string;
  content: string;
  createdAt: string;
  isPending?: boolean;  // única marca de pending
}
```

| Aspecto | Detalle |
|---------|---------|
| **Temporary identity** | `id` generado en cliente (uuid) — **sin localOperationId separado** |
| **Create** | `addPost` → prepend a `posts[]` con `isPending: true` |
| **Update/Delete** | **No implementado** — solo create |
| **Pending indicators** | `isPending` flag en post; `OfflineBanner` (global), `PendingBadge` (por item) |
| **Rollback/Reconcile** | **No implementado** — tras sync exitoso, `setPosts` reemplaza con datos servidor (pierde optimistic id) |

**Gap**: Sin reconciliation real — reemplazo ciego por respuesta servidor. Sin manejo de conflicto (version mismatch). Sin rollback si sync falla definitivamente.

---

### B4. DEPENDENCY COST

| Dependencia | Propósito | Implicación |
|-------------|-----------|-------------|
| **Realm** | Persistencia local offline queue | Native module; requiere dev build; no Expo Go; migraciones schema manuales |
| **NetInfo** | Network detection | Listener nativo; OK en Expo Go |
| **Zustand** | UI store (posts, queue count) | Ligero, JS-only |
| **expo-background-task** + **expo-task-manager** | Background sync | Requiere dev build; iOS background fetch limitado (no garantizado); Android Doze restrictions |
| **expo-crypto** | UUID generation | Polyfill web crypto; OK |
| **Native/dev build** | **Obligatorio** para Realm + background task | No corre en Expo Go; `eas build` o `npx expo run:android/ios` |

**Complejidad introducida**: **Alta** — Realm añade native layer, schema migrations, threading constraints (Realm objects solo en hilo creador). Background task reliability es best-effort (OS puede matar).

---

## PART C — HOMEPLUS PLANNER RELIABILITY CURRENT (`front/mi-front-limpio/services/planner/reliability/`)

### C1. Operation Identity (`types.ts`, `operationIdentity.ts`)

```typescript
PlannerPendingOperation<TPayload> = {
  schemaVersion: 1,
  localOperationId: string,        // FNV1a hash de (mutationId, idempotencyKey, requestHash)
  mutationId: string,              // UUID v4 único por intento mutación
  idempotencyKey: string,          // Clave deduplicación semántica (estable cross-device)
  requestHash: string,             // FNV1a hash determinista de (domain, opType, scope, entity, expectedVersion, payload)
  domain: string,                  // 'task' | 'event' | 'plan' | 'preset' | 'draft'
  operationType: string,           // 'create' | 'update' | 'complete' | 'cancel' | 'trash' | 'restore' | 'reactivate' | 'assignment' | 'claim' | 'fulfillment.*' | 'structure_changeset' | 'goal.restore' | 'revision.*' | 'autosave' ...
  ownerPartition: { authenticatedUserId: string },
  scope: { kind: 'personal' | 'household'; householdId? },
  entity?: { type: string; id?: string },
  expectedVersion?: number,        // Optimistic locking (versioned mutations)
  payload: TPayload,
  dependencies: string[],          // localOperationIds que deben confirmarse primero
  createdAt: string,               // ISO
}
```

**Identidad compuesta**: `(mutationId, idempotencyKey, requestHash)` — `mutationId` = intento único; `idempotencyKey` = clave semántica estable; `requestHash` = hash contenido completo (detecta colisión semántica distinta payload).

**Dedupe**: `isSamePlannerOperationIdentity` (los 3 iguales) → descarta duplicado; `hasPlannerIdentityConflict` (mismo mutationId, distinto requestHash) → marca `conflicted`.

**Scope binding**: `assertPlannerOperationScopeMatchesPartition` valida `authenticatedUserId` + `householdId` al enqueue y execute.

---

### C2. Storage (`operationStore.ts`)

| Aspecto | Implementación |
|---------|----------------|
| **Backend** | `@react-native-async-storage/async-storage` (JS-only, no native) |
| **Key** | `@homeplus/planner/reliability/operations/v1/{userId}/{householdId|personal}` |
| **Wrapper** | `{ schemaVersion: 1, operations: PlannerOperationRecord[] }` |
| **Validación** | Parse estricto: wrapper schemaVersion, cada record validado (campos requeridos, requestHash pattern `fnv1a:xxxxxxxx`, dependencies non-empty strings, attempt.requestMayHaveReachedServer boolean) |
| **Quarantine** | Registros inválidos → contados + eventos `storage_record_quarantined`; no rompen hydrate; `canRewrite` flag evita re-write si wrapper inválido |
| **Hydrate** | `recoverPersistedPlannerOperation`: `in_flight` → `uncertain` + `requestMayHaveReachedServer=true` |
| **CRUD** | `hydrate`, `get`, `put`, `remove`, `list`, `replaceAll` — todos read-modify-write full array (OK para <100 ops) |

**Planner-specific**: Partition por `(userId, householdId)`; schemaVersion v1 hardcoded; quarantine telemetrado.

**Generalizable**: AsyncStorage wrapper con validación estricta, quarantine no-bloqueante, hydrate recovery `in_flight→uncertain`.

---

### C3. Queue (`operationQueue.ts`)

| Función | Detalle |
|---------|---------|
| **Enqueue** | Valida scope; dedupe por identity (3 campos); conflict detection (mismo mutationId, distinto hash) → `conflicted`; supersede: `canSupersedePendingOperation` (solo `pending` + `attemptCount=0` + `!requestMayHaveReachedServer` + adapter dice true) |
| **Drain** | `sortPlannerOperationsByDependency` (topológico); `maxOperationsPerDrain=3`; elegible si `pending|retrying|uncertain` + `nextRetryAt` pasado; dependency check: todas deps `confirmed` |
| **Execute** | `in_flight` + `attemptCount++` + `requestMayHaveReachedServer=true`; llama `adapter.execute`; si ok → `confirmed` + `reconcile`; si timeout → `uncertain`; si retryable + attempts left → `retrying` + `nextRetryAt` (exponential backoff + jitter); else → `conflicted` (adapter.classifyConflict o default) |
| **Conflict resolution** | `resolveConflictAsPending` → manual retry |
| **Cleanup** | `canCleanupPlannerConfirmedOperation`: `confirmed` + `reconciliationAppliedAt` + `retentionMs` (default 5s) + no deps pendientes |

**Planner-specific**: Dependency graph topológico; supersede solo draft autosave; domain adapters registry; retention 5s agresivo.

**Generalizable**: State machine estricta; dependency-aware drain; supersede policy; backoff con jitter; cleanup con retention + dependency check.

---

### C4. Dedupe (`operationIdentity.ts` + `operationQueue.ts`)

- **Exact dedupe**: `localOperationId` derivado de `(mutationId, idempotencyKey, requestHash)` — misma intención + mismo payload = misma op.
- **Semantic dedupe**: `idempotencyKey` estable cross-device (ej: `idem_task_create_<timestamp>_<random>`); `mutationIdsByIdempotencyKey` map en `productiveMutations.ts` recuerda mutationId por idempotencyKey.
- **Supersede**: Solo `draft.autosave` — nueva autosave reemplaza anterior unsent.

---

### C5. Retry (`retryPolicy.ts`)

```typescript
DEFAULT_PLANNER_RETRY_POLICY = {
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  maxAttempts: 5,
  jitterRatio: 0.2,
}
```

- **Exponential backoff**: `baseDelayMs * 2^attemptIndex` capped at `maxDelayMs`
- **Jitter**: `±jitterRatio * exponential` (uniform [-ratio, +ratio])
- **Retryable categories**: `network_retryable`, `timeout_ambiguous`, `rate_limited`, `server_retryable`, `unknown_retryable`
- **Non-retryable**: `version_conflict`, `idempotency_conflict`, `validation`, `authorization`, `not_found`, `unknown_non_retryable`
- **Retry-After**: Respeta `error.retryAfterMs` (header 429 o body)

---

### C6. Replay / Idempotency

- **Idempotency key** enviada al backend en cada request (`mutationOptions.idempotencyKey`)
- **Mutation ID** único por intento; backend puede deduplicar por idempotencyKey
- **Replay detection**: `outcome: 'replay'` en respuesta backend → tratado como `confirmed` + `noop` efectivo
- **Lost response / late response**: `requestMayHaveReachedServer=true` en `in_flight`; si timeout → `uncertain`; reconcilia en próximo drain

---

### C7. Network Detection (`runtime.ts`)

```typescript
PlannerReliabilityConnectivitySource = {
  isOnline: () => boolean,
  subscribe?: (listener: (online: boolean) => void) => () => void,
}
```

- `runtime.connectivity` inyectable (testable); default `isOnline() !== false` (fail-open)
- `subscribe` listener → `scheduler.start/stop` + `triggerReconnect` en online
- Lifecycle bindings: `registerSessionLifecycle` (cleanup on logout), `registerHouseholdLifecycle` (dispose on household switch)

---

### C8. Status / Pending / Failure

| Estado | Significado |
|--------|-------------|
| `pending` | Encolado, no intentado |
| `in_flight` | Request enviado, esperando respuesta |
| `uncertain` | Timeout/abort — request pudo llegar |
| `retrying` | Programado para reintento (backoff) |
| `conflicted` | Error no-retryable o retry agotado; requiere intervención |
| `confirmed` | Autoritativo confirmado + reconciliado |

**Pending UI**: `frontendExperience.ts` expone `usePlannerReliabilityPendingOperations` → lista ops no-confirmed por dominio.

---

### C9. Restart Persistence

- AsyncStorage persiste `PlannerOperationRecord[]` completo
- `hydrate()` al abrir runtime → `recoverPersistedPlannerOperation` (`in_flight`→`uncertain`)
- Scheduler auto-start si online
- Household switch → dispose all runtimes → nuevo runtime para nuevo scope

---

### C10. Ownership / Runtime Mounting

- **Una runtime por `(userId, householdId)`** — `activeRuntimes` Map; nuevo scope disposes anteriores
- **Session lifecycle**: logout → dispose all
- **Household lifecycle**: switch → dispose all → nuevo runtime
- **Adapters** registrados en constructor (`createPlannerReliabilityProductiveAdapters()`)

---

### C11. Tests

| Archivo | Cobertura |
|---------|-----------|
| `operationIdentity.test.ts` | Hash determinista, localOperationId build, dedupe/conflict detection, scope validation |
| `operationStateMachine.test.ts` | Transiciones válidas/inválidas, recover in_flight→uncertain |
| `operationQueue.test.ts` | Enqueue dedupe, supersede, drain dependency order, retry scheduling, conflict classification, cleanup |
| `operationStore.test.ts` | Parse wrapper, validación record, quarantine findings, hydrate recovery |
| `retryPolicy.test.ts` | Backoff calculation, jitter, retryable categories, attempt counting |
| `dependencyGraph.test.ts` | Cycle detection, dependency evaluation, topological sort |
| `errorClassifier.test.ts` | ApiError/AbortError/TypeError classification, conflict derivation |
| `reconciliation.test.ts` | Mark confirmed, apply reconciliation, cleanup eligibility |
| `observability.test.ts` | Event emission, metadata sanitization (bloquea PII) |
| `productiveAdapters.test.ts` | Adapter execute/reconcile, supersede policy, realtime related |

**Patrón**: Tests unitarios puros (sin React Native, sin AsyncStorage real — usan mock store), cubren máquinas de estado, clasificación, deduplicación, ordenamiento.

---

### C12. ¿Qué es Planner-Specific vs Generalizable?

| **Planner-Specific** | **Potencialmente Generalizable** |
|----------------------|----------------------------------|
| Domain adapters (task, event, plan, preset, draft) | Operation identity model (mutationId, idempotencyKey, requestHash) |
| Supersede policy solo `draft.autosave` | State machine (pending→in_flight→confirmed|uncertain|retrying|conflicted) |
| Dependency graph entre operaciones planner | Queue con dependency-aware drain + topological sort |
| Cache invalidation por dominio (plannerCache) | Exponential backoff + jitter + retryable categories |
| Plan write tracing (`tracePlanWrite`) | AsyncStorage wrapper con validación + quarantine |
| Scope partition `(userId, householdId)` | Scope binding + partition key derivation |
| Realtime bridge integración plannerCache | Hydrate recovery `in_flight→uncertain` |
| Operation types enum (fulfillment.*, revision.*) | Conflict classification matrix |
| Retention 5s agresivo | Cleanup confirmed + retention + no-deps-pending |
| Lifecycle bindings (session/household) | Observability event emission + PII sanitization |

---

## PART D — THREE-WAY RELIABILITY COMPARISON

> **Ahlan**: No hay resultado profundo disponible en paralelo; se deja pendiente para Cross Matrix.

### Dimensiones: Planner CURRENT vs OfflinePOC

| Dimensión | Planner CURRENT | OfflinePOC | Notas |
|-----------|-----------------|------------|-------|
| **Storage** | AsyncStorage (JS-only) + wrapper versionado + validación estricta + quarantine | Realm (native) + schema fija | Planner: portable, no dev build requerido; OfflinePOC: robustez native pero complejidad |
| **Operation model** | Rico: mutationId + idempotencyKey + requestHash + scope + entity + expectedVersion + dependencies + schemaVersion | Mínimo: id + actionType + payload + createdAt + retryCount | Planner soporta versioning, deduplicación semántica, dependencias; OfflinePOC no |
| **Idempotency** | Dual: mutationId (intento) + idempotencyKey (semántico) + requestHash (contenido) | **Ninguna** — reenvío duplica | Gap crítico OfflinePOC |
| **Dedupe** | Exact (3 campos) + semántico (idempotencyKey) + supersede (draft.autosave) | **Ninguna** | Planner sofisticado |
| **Network detection** | Inyectable `ConnectivitySource` (isOnline + subscribe); fail-open | `NetInfo.fetch()` on-demand; no listener persistente en queue | Planner más testable y reactivo |
| **Retry** | Exponential backoff + jitter + maxAttempts(5) + retry-after + categorías ricas | Increment retryCount global sin backoff ni max | Planner production-grade |
| **Backoff** | `baseDelayMs * 2^attempt ± jitterRatio` | **Ninguno** | |
| **Replay** | `outcome: 'replay'` manejado; `requestMayHaveReachedServer` tracking | **No** | Planner maneja lost/late response |
| **Ordering** | Topológico por dependencies + maxOperationsPerDrain(3) | FIFO por createdAt | Planner respeta dependencias |
| **Optimistic UI** | `frontendExperience.ts` → pending ops por dominio; `isPending` implícito por estado | `uiStore.posts[]` con `isPending` flag; reemplazo ciego tras sync | Planner más granular; OfflinePOC solo create |
| **Rollback** | `discardUnsentOperation` (solo never-sent); `resolveConflictAsPending` manual | **No** | Planner permite descartar unsent |
| **Reconciliation** | `adapter.reconcile` → cache invalidation + `invalidationRequested`/`refetchRequested` | `setPosts(serverResponse)` — reemplazo ciego | Planner: invalidación selectiva; OfflinePOC: full replace |
| **Restart** | Hydrate + recover in_flight→uncertain + scheduler auto-start | Realm persiste; processQueue en enqueue/UI | Ambos recuperan; Planner más explícito |
| **Background sync** | Scheduler interval (1s) + connectivity trigger + drainNow manual | expo-background-task + AppState + NetInfo listeners | OfflinePOC tiene background nativo; Planner solo foreground scheduler |
| **Dependency cost** | **Bajo**: AsyncStorage + Zustand + timers JS-only | **Alto**: Realm (native) + background-task (native) + NetInfo | Planner corre en Expo Go; OfflinePOC requiere dev build |

---

## PART E — ARCHITECTURAL PATTERNS

| Patrón | PROVEN USEFUL | RISK | OVERKILL FOR HOMEPLUS V1 | OPEN QUESTION |
|--------|---------------|------|--------------------------|---------------|
| **Trigger-maintained denormalized counts** (Agora) | ✅ High throughput reads, consistent counts | Schema coupling; migraciones complejas | ❌ No — HomePlus V1 no tiene feed high-volume | ¿Valen la pena para planner counts (tasks/event counts)? |
| **RPC atomic toggle_reaction** (Agora) | ✅ Race-free, single round-trip | SQL coupling; testing requiere DB real | ❌ No — HomePlus no tiene reactions sociales | |
| **Keyset pagination (cursor timestamp)** (Agora chat) | ✅ Stable para realtime/inbox | Complejidad cursor encoding; no bi-direccional trivial | ⚠️ Maybe — inbox/notificaciones futuras | ¿Necesita HomePlus keyset o offset basta? |
| **Shape layer obligatoria** (Agora `shape.ts`) | ✅ Contract boundary limpio; PII protection; batch loads | Boilerplate; doble mantenimiento types | ✅ **YES** — Adoptar patrón shape layer en HomePlus API boundary | |
| **Auth wall (private by default)** (Agora) | ✅ Security posture clara; allowlist auditada | Fricción desarrollo; allowlist drift | ⚠️ Maybe — HomePlus ya tiene auth middleware | ¿Aplicar a planner mutations? |
| **Moderation visibility en SQL/RPC** (Agora) | ✅ Correcto para recursive reads | Complejidad RPC; testing | ❌ No — HomePlus no tiene moderación social | |
| **Operation identity triple (mutationId, idempotencyKey, requestHash)** (Planner) | ✅ Dedupe exacto + semántico + detección colisión | Complejidad conceptual; 3 campos | ✅ **YES** — Core de reliability generalizable | ¿Simplificar a 2 campos? |
| **State machine estricta** (Planner) | ✅ Previene estados inválidos; debugging claro | Rigidez; añadir estado rompe tests | ✅ **YES** — Base sólida | |
| **Dependency-aware queue drain** (Planner) | ✅ Orden correcto para ops relacionadas | Overhead topológico; cycles detection | ✅ **YES** — Plan structure changeset lo necesita | ¿Generalizar a otras domains? |
| **Exponential backoff + jitter + retry categories** (Planner) | ✅ Production-grade; respeta retry-after | Config tuning necesario | ✅ **YES** — Estándar reliability | |
| **Hydrate recovery in_flight→uncertain** (Planner) | ✅ Maneja lost/late response correctamente | Requiere requestMayHaveReachedServer tracking | ✅ **YES** — Patrón crítico | |
| **Supersede pending (draft autosave)** (Planner) | ✅ Evita cola de autosaves stale | Solo aplica a idempotent creates | ⚠️ Maybe — Solo drafts | |
| **Quarantine invalid storage records** (Planner) | ✅ No bloquea hydrate; telemetría | Complejidad parse; findings tracking | ✅ **YES** — Robustez storage | |
| **AsyncStorage wrapper + validation** (Planner) | ✅ Portable, no native, testable | Límite tamaño (6MB iOS); full array rewrite | ✅ **YES** — Para V1 suficiente | ¿Migrar a MMKV/Realm si crece? |
| **Realm persistence** (OfflinePOC) | ✅ Robusto, queries, large data | Native module; dev build; threading | ❌ No — Overkill V1 | ¿Cuándo justifica Realm? |
| **Background sync nativo** (OfflinePOC) | ✅ Sync sin app abierta | iOS unreliable; Android Doze; battery | ❌ No — V1 foreground-only | ¿Push notifications como trigger alternativo? |
| **Optimistic UI con isPending flag** (OfflinePOC) | ✅ Simple UX | Sin reconciliation real; pierde temp ID | ⚠️ Partial — Planner tiene mejor modelo | ¿Unificar modelo optimistic? |
| **Realtime bridge → cache invalidation** (Planner) | ✅ Reconcilia server-driven changes | Acoplamiento plannerCache | ✅ **YES** — Para multi-device | |

---

## SAFETY VERIFICATION

```bash
# HomePlus baseline (pre-work)
Branch: finance-v1-unified
HEAD: ad4f966
git status --short:
 M backend/src/controllers/finance.transfers.controller.js
 M backend/src/routes/finance.js
 M backend/src/services/finance.read.service.js
 M front/mi-front-limpio/components/finance/MovementDetailSheet.tsx
 M front/mi-front-limpio/package-lock.json
 M front/mi-front-limpio/screens/finance/FinanceScreen.tsx
 M front/mi-front-limpio/services/finance/financeDisplay.ts
 M front/mi-front-limpio/services/finance/financeMovements.ts
 M scripts/tsconfig.test.json
 M tests/run.js
?? STAGE_7A_AUDIT_REPORT.md
?? STAGE_7B_CONTRACT_FREEZE.md
?? backup-before-presence.sql
?? scripts/finance_7c_unified_movements_backend_tests.js
?? scripts/finance_7d_unified_movements_frontend_tests.ts
?? supabase/migrations/20260831000003_finance_unified_movements_v1_1.sql
```

**Verificación post-recon**:
- ✅ Agora CLEAN (solo lectura, sin modificaciones)
- ✅ OfflinePOC CLEAN (solo lectura, sin modificaciones)
- ✅ HomePlus baseline unchanged (git status idéntico)

---

## RESULTADO

**BACKEND + RELIABILITY DEEP RECON: PASS**

---

### RESUMEN EJECUTIVO

**Agora Server** provee patrones backend **social/community probados en producción**: schema con contadores trigger-maintained, RPC atómicos para reactions, shape layer obligatoria como trust boundary, auth wall private-by-default, pagination híbrida (offset + keyset), storage provider seam, notificaciones fire-and-forget con realtime+push, tests integración aislados por projectId.

**ExpoOfflineFirstPOC** demuestra **offline-first mínimo viable** pero con gaps críticos: sin idempotency, sin state machine, sin backoff, sin deduplicación, sin reconciliation real, dependencia native (Realm) que requiere dev build.

**HomePlus Planner Reliability CURRENT** es **el más sofisticado de los tres** en modelo de operación: identidad triple (mutationId/idempotencyKey/requestHash), state machine estricta, queue dependency-aware, exponential backoff+jitter, hydrate recovery `in_flight→uncertain`, supersede policy, quarantine storage, observability sanitizada, todo en JS-only (AsyncStorage) sin native deps.

**Hallazgo clave**: Planner ya implementa patrones que Agora resuelve en backend (idempotency, versioning, replay) y que OfflinePOC no tiene. La arquitectura Planner es **generalizable** a otros dominios HomePlus (finance, inventory) extrayendo el core reliability runtime + adapters pattern.

**Próximo paso recomendado (fuera de scope este recon)**: Cross-matrix con Ahlan cuando esté disponible → decisión ADOPT/REJECT por patrón.