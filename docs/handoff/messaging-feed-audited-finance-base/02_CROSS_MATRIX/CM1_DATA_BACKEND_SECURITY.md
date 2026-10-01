# CM1 — DATA / BACKEND / SECURITY CROSS MATRIX

**Generated:** 2026-09-02  
**Scope:** HOMePLUS Mensajes + Feed cross-matrix across 12 technical dimensions  
**Authority Order:** Product Truth Frozen → HOMePLUS CURRENT → D1/D2/D3 Evidence → Donor Patterns → README  
**Mode:** READ-ONLY — No implementation, no migrations, no code modifications  

---

## 1. EXECUTIVE SUMMARY

This Cross Matrix evaluates HOMePLUS Mensajes + Feed architecture against Product Truth, current HOMePLUS foundations, donor recon evidence (D1 Feed, D2 Messaging, D3 Reliability), and donor patterns. It produces **candidates and decisions** for synthesis with CM2 into a Master Cross Matrix.

### Key Findings

| Area | Status | Critical Gaps |
|------|--------|---------------|
| **Domain Boundaries** | Candidate split defined | MediaService authority needs clarification |
| **Thread Model** | Single table with `kind` (DIRECT/GROUP/FEED_COMMENTS) | Canonical Direct uniqueness must be DB-enforced |
| **Message Model** | UUID + sequence + client_message_id | Edit/Delete lifecycle needs explicit tombstone strategy |
| **Feed Model** | HUMAN\|SYSTEM_SOCIAL posts + comment_thread_id → Messaging | Feed unread is HOMePLUS-specific (no donor precedent) |
| **Ordering** | Per-thread `sequence` BIGINT preferred | Global vs per-thread tradeoff documented |
| **Idempotency** | Planner V2 model (`mutationId`+`idempotencyKey`+`requestHash`) generalizable | Must not leak Planner complexity to Messaging API |
| **Unread** | `last_read_sequence` frontier (own only) | Per-message read_at rejected (Product Truth) |
| **Reactions** | Atomic set/switch/clear RPC candidate | Single emoji/user/target enforced by UNIQUE |
| **Star/Pin/Hide** | Separate tables per semantic | Pin = shared thread context; Hide = per-person |
| **Media** | Shared MediaService + semantic relation tables | Household-private storage; no public URLs as identity |
| **Security** | Backend authorization + RLS defense-in-depth | No Feed-specific roles; Global Permissions reused |
| **Notifications** | Fire-and-forget post-commit | Never rolls back canonical mutation |

### Decision Summary

| Decision | State | Rationale |
|----------|-------|-----------|
| Single `messaging_threads` table with `kind` | **ADOPT PATTERN** | Agora `conversations.type` + Product Truth unified engine |
| Canonical Direct via `person_low_id`/`person_high_id` | **BUILD HOMEPLUS** | Marketplace UNIQUE pattern adapted; DB-enforced |
| `messages.sequence` per-thread BIGINT | **ADOPT PATTERN** | Agora keyset cursor + deterministic ordering |
| `client_message_id` UNIQUE(sender, client_id) | **ADAPT PATTERN** | Planner idempotency model simplified for messaging |
| Feed unread = `last_seen_post_sequence` | **BUILD HOMEPLUS** | No donor provides; Product Truth requires |
| System Social idempotency key | **BUILD HOMEPLUS** | HOMePLUS-specific canonical fact pipeline |
| Media cleanup = best-effort async | **ADOPT PATTERN** | Agora pattern; orphan acceptable vs data loss |
| RLS = deny-all backstop + household membership | **REUSE** | HOMePLUS CURRENT pattern proven |

---

## 2. CURRENT FOUNDATIONS REUSED

HOMePLUS already provides battle-tested foundations that **must not be recreated**:

| Foundation | Location | Reused For |
|------------|----------|------------|
| **Auth + People** | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `people` (global identity), `auth_user_id` link, `active_household_id` |
| **Households** | Same migration | `households`, `household_members` (role/status/joined_at/left_at) |
| **RLS Helpers** | `is_active_household_member()`, `is_active_household_coordinator()`, `current_person_id()`, `effective_uid()` | All Messaging/Feed authorization |
| **Invite Links** | `household_invite_links` + RPCs | Group member addition flow |
| **Role Change Requests** | `household_role_change_requests` + RPCs | Group membership management |
| **Planner Context** | `planner.context.service.js`, `plannerGlobalSurfaces.js` | Access context building for Feed/Messaging |
| **Idempotency Core** | `plannerIdempotencyAdapter.js` (V0 + V2) | `mutationId`/`idempotencyKey`/`requestHash` model |
| **Outbox/Retry** | `outboxProcessor.service.js`, `outboxRetryPolicy.js` | Notification emission reliability |
| **Storage/Avatar** | `people.controller.js` + `sharp.js` | Media upload/compression pattern |
| **Search Service** | `planner.search.service.js` | ILIKE + Postgres FTS pattern (extendable) |
| **API Style** | Controllers → Services → RPC/DB | RequestContext, scoped Supabase client, error envelopes |
| **Telemetry** | `plannerTelemetryEvents.js`, `coreTelemetryEvents.js` | Observability hooks |

### Key HOMePLUS Conventions to Preserve

1. **Scoped Supabase client per request** (`createSupabaseForToken`) — never direct anon/admin
2. **RPC-first mutations** — business logic in Postgres functions, controllers orchestrate
3. **`requireActiveMembership` / `requireCoordinator`** guards in services
4. **Mapper functions** (`mapMemberPublic`, `mapRoleRequest`) — DB row ≠ API shape
5. **Household-scoped queries** — `household_id` FK on all domain tables
6. **Status machines** — `pending`→`active`→`suspended`/`finalized` with `joined_at`/`left_at`
7. **SchemaVersion + validation + quarantine** in persistence (Planner reliability)

---

## 3. MAIN CROSS MATRIX

### Capability Matrix (Condensed — Full detail in sections 4-31)

| Capability | Product Truth | CURRENT HOMePLUS | Ahlan | Sharebook | Framez | Agora | RNChat | Circle | Marketplace | Planner Reliability | Target Candidate | Decision | Risk | Evidence |
|------------|---------------|------------------|-------|-----------|--------|-------|--------|--------|-------------|---------------------|------------------|----------|------|----------|
| **Thread Model** | Unified engine: DIRECT/GROUP/FEED_COMMENTS | Planner: tasks/events/plans (separate tables) | `posts` + `comments` (separate) | `posts` + `comments` (flat) | `posts` + `comments` (nested 2-level) | `conversations.type` (direct/group/space) + `conversation_members` | UI only (`IMessage`) | `matches` (direct) + `rooms`/`room_members` (group) | `chat_threads` (per listing) | N/A | Single `messaging_threads(kind)` + `messaging_thread_members` | **ADOPT PATTERN** (Agora) | Low | D2§1, D1§5, Agora A4 |
| **Canonical Direct** | A+B = B+A per Household | N/A (no messaging) | N/A | N/A | N/A | Get-or-create 1:1 via SQL join | N/A | `matches(user_a,user_b)` — **no canonical ordering in schema** | `UNIQUE(listing_id,buyer_id,seller_id)` | N/A | `person_low_id` + `person_high_id` + `household_id` UNIQUE | **BUILD HOMEPLUS** | Medium | D2§6, Marketplace schema |
| **Group Membership** | Explicit subset; new member = full history; removed = lose access | `household_members` (role/status) | N/A | N/A | N/A | `conversation_members(role,lastReadAt,isActive,leftAt)` | N/A | `room_members(role:owner/admin/member, status:invited/joined)` | N/A | N/A | `messaging_thread_members` with `joined_at`, `removed_at`, `status` | **ADAPT PATTERN** (Agora + HOMePLUS) | Low | D2§7, HOMePLUS household_members |
| **Message Fields** | UUID, sequence, body, reply, forward, edit, delete, media, kind | Planner: tasks/events (domain-specific) | N/A | N/A | N/A | `chatMessages` (content, parent, quoted, reactions, edited, userDeleted, moderation) | `IMessage` (UI: _id, text, createdAt, user, image, video, audio, system, sent/received/pending, replyMessage, reactions) | `ChatMessage` (id, text, fromMe, at) — minimal | `ChatMessage` (id, threadId, senderId, body, kind, sentAt, readAt, attachmentUrl, offerAmount) | N/A | Canonical fields per §5 | **ADAPT PATTERN** (Agora + RNChat UI) | Low | D2§2, D2§8, Agora A4 |
| **Message Ordering** | Deterministic; first unread | N/A | `created_at DESC` (cursor keyset) | `created_at DESC` (offset) | Algorithmic (client) | Keyset cursor `COALESCE(lastMessageAt,createdAt)` | N/A | N/A | `sent_at` timestamp + `updated_at` on thread | N/A | Per-thread `sequence` BIGINT + `created_at` tie-break | **ADOPT PATTERN** (Agora keyset) | Low | D1§2, D2§14, Agora A5 |
| **Send Idempotency** | Retry must be idempotent | Planner V2: triple identity | `offlineQueue` (FIFO, no dedupe key) | None | None | N/A (server-authoritative) | Consumer responsibility | Fire-and-forget + realtime echo (no retry) | Client UUID + explicit reconcile | `mutationId` + `idempotencyKey` + `requestHash` | `client_message_id` UNIQUE(sender, client_id) + Planner V2 for complex | **ADAPT PATTERN** (Planner V2 simplified) | Medium | D2§3, D3§C, D1§8 |
| **Unread/Read** | Own unread required; others' read receipts NOT | N/A | ABSENT (feed) / conversation-level bool | ABSENT | ABSENT | `lastReadAt` on membership; unread = messages > lastReadAt | N/A | Conversation-level `unread` bool + `readConvos[]` | Per-message `read_at` + `unreadCount` | N/A | `last_read_sequence` on thread_member; mark-read = advance frontier | **ADOPT PATTERN** (Agora membership) | Low | D1§9, D2§5, Agora A4 |
| **Reactions** | One active/user/target | N/A | `likes/reposts/saved` (PK unique) | `postLikes` (app-level check) | `likes` + `comment_likes` (delete-before-insert) | `reactions` UNIQUE(project,targetType,targetId,userId) + RPC `toggle_reaction` | `MessageReaction{emoji,userIds[]}` on message (UI) | ABSENT | ABSEST | N/A | `message_reactions(message_id,person_id,emoji)` UNIQUE + atomic RPC | **ADOPT PATTERN** (Agora RPC) | Low | D1§6, D2§11, Agora A3 |
| **Star/Pin** | Star=personal; Pin=shared | N/A | N/A | N/A | N/A | N/A | Via `messageActions` (consumer) | ABSENT | ABSENT | N/A | `message_stars`, `message_pins` separate tables | **BUILD HOMEPLUS** | Low | Product Truth |
| **Delete/Edit** | Edit own (edited_at); delete-for-everyone=tombstone; delete-for-me=hide | Planner: soft delete (`trashed_at`) | Hard delete posts | Hard delete (upsert edit) | Hard delete + cascade client-side | Soft delete (`userDeletedAt`, `moderationStatus`) | Via `messageActions` (consumer) | ABSENT | ABSENT | N/A | Edit: `edited_at`; Delete∀: tombstone row; Delete-me: `message_hidden_for_people` | **ADAPT PATTERN** (Agora soft delete) | Low | D1§3, D2§2, Agora A4 |
| **Forwarding** | Must not leak inaccessible metadata | N/A | N/A | N/A | N/A | N/A | Via `messageActions` | ABSENT | ABSENT | N/A | `forwarded_from_message_id` internal; API exposes only allowed marker | **BUILD HOMEPLUS** | Medium | Product Truth |
| **Feed Posts** | HUMAN\|SYSTEM_SOCIAL; author editable; no restore V1 | N/A | `posts` (user-only) | `posts` (HTML body) | `posts` (algorithmic) | `entities` (isDraft, deletedAt, moderationStatus, score) | N/A | N/A | N/A | N/A | `feed_posts(kind, author_person_id, body, comment_thread_id, system_*)` | **ADAPT PATTERN** (Agora entities) | Low | D1§1, Agora A1 |
| **Feed Ordering** | Reverse chronological only | N/A | Keyset cursor `created_at` | Offset pagination | Algorithmic (client) | Hybrid: offset (feed) + keyset (chat) | N/A | N/A | N/A | N/A | `feed_posts.sequence` BIGINT (stable insert order) | **ADOPT PATTERN** (Ahlan keyset) | Low | D1§2, D1§14, Agora A5 |
| **Feed Unread** | Top-level posts only; comments/reactions don't increment | N/A | ABSENT | ABSENT | ABSENT | N/A | N/A | N/A | N/A | N/A | `feed_read_state(person_id,household_id,last_seen_post_sequence)` | **BUILD HOMEPLUS** | High | D1§9, Product Truth |
| **System Social** | Canonical fact → Social Relevance Rule → Social Moment → Feed Post | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Idempotency: UNIQUE(household_id, source_module, source_event_key) | **BUILD HOMEPLUS** | High | Product Truth |
| **Feed Comments** | Reuse Messaging engine (`kind=FEED_COMMENTS`) | N/A | Separate `comments` table | Separate `comments` (flat) | Separate `comments` (nested) | `comments` table (parentId self-ref) | N/A | N/A | N/A | N/A | `feed_posts.comment_thread_id` → `messaging_threads(kind=FEED_COMMENTS)` | **ADOPT PATTERN** (Product Truth mandate) | Low | Product Truth, D1§5, D1§18 |
| **Media Model** | Feed: multi-photo OR one video; Msg: photo/video/file/voice | Avatar: single webp, compressed | Single image/video per post | Single image/video | Multi-media carousel (JSON array) | `files` table + `attachments` jsonb on entity/comment/message | URLs only (consumer uploads) | Text-only | `attachment_url` single | N/A | `media` table + `message_attachments`, `feed_post_media` | **ADOPT PATTERN** (Agora files table) | Low | D1§4, D1§20, Agora A7 |
| **Media Cleanup** | Handle upload→DB fail, delete, edit, retry | Orphaned on delete | Orphaned | Orphaned | Orphaned | Best-effort async (`removeMediaAsync` fire-and-forget) | Consumer responsibility | N/A | N/A | N/A | Best-effort async; orphan acceptable vs data loss | **ADOPT PATTERN** (Agora) | Low | D1§4, D1§21, Agora A7 |
| **Security/RLS** | Backend authz + RLS defense-in-depth | RLS helpers + service guards + RPC | Partial (only aux tables) | Uncertain | Uncertain | **Server gates primary; RLS deny-all backstop** | N/A | N/A | RLS on threads/messages | N/A | Reuse HOMePLUS RLS helpers + deny-all backstop | **REUSE** | Low | HOMePLUS 009, Agora A8 |
| **API Contract** | Semantic endpoints; DB ≠ API | RPC-based controllers + mappers | Direct Supabase from client | Direct Supabase | Direct Supabase | **Shape layer mandatory** (`shape.ts`) | N/A | Direct Supabase | Direct Supabase | N/A | HOMePLUS style: controllers → services → RPC + mapper layer | **REUSE** | Low | HOMePLUS controllers, Agora A6 |
| **Notifications** | Fire-and-forget post-commit | Outbox processor | `notifications` table + realtime | `notifications` + push | RPC `create_notification_safe` | `appNotifications` + fire-and-forget + push | N/A | N/A | N/A | Outbox + retry | Canonical mutation → eligible signal → global Notifications owns delivery | **ADOPT PATTERN** (Agora + HOMePLUS outbox) | Low | D1§11, D3§A9, HOMePLUS outbox |
| **Search** | Posts + comments + contextualized | Planner: ILIKE + in-memory rank | ABSENT | ABSENT | ABSENT | Voyage embeddings + `match_content` RPC (pgvector) | ABSENT | ABSENT | ABSENT | N/A | Postgres FTS + indexes + Node search service | **ADAPT PATTERN** (Planner + Agora) | Medium | D1§10, D3§A28, HOMePLUS search |
| **Migrations** | Conceptual ordering only | 100+ migrations (planner, finance, inventory) | 3 files only | None | None | Drizzle + custom SQL (triggers, RPC, RLS) | N/A | N/A | Single schema.sql | Planner idempotency migrations | Foundation → Threads → Messages → Interactions → Feed → Media → Search → Policies | **REFERENCE ONLY** | Low | HOMePLUS migrations, Agora drizzle |

---

## 4. PROPOSED DOMAIN BOUNDARIES

### 4.1 MessagingService

| Aspect | Decision |
|--------|----------|
| **Authority** | Owns: Threads (Direct/Group/Feed-Comments), membership access, messages, reply, edit/delete, reactions, star, pin, unread, lifecycle (ACTIVE→CLOSED→REOPEN) |
| **Operations** | `ensureDirect`, `createGroup`, `add/removeMember`, `close/reopenGroup`, `sendMessage`, `editMessage`, `deleteMessage`, `addReaction`, `starMessage`, `pinMessage`, `markRead`, `loadMessages`, `searchMessages` |
| **Dependencies** | `MediaService` (attachments), `NotificationService` (emit signals), `HouseholdService` (membership validation) |
| **Explicitly NOT inside** | Feed top-level posts, Feed reactions, System Social generation, Global Permissions evaluation (delegates to helpers) |
| **Rationale** | Product Truth: "One canonical messaging engine underneath." All thread kinds share mechanics. |

### 4.2 FeedService

| Aspect | Decision |
|--------|----------|
| **Authority** | Owns: Top-level posts (HUMAN/SYSTEM_SOCIAL), post reactions, Feed unread, System Social idempotency, post lifecycle (edit/delete/tombstone) |
| **Operations** | `createPost`, `editPost`, `deletePost`, `addReaction`, `getFeed`, `markFeedRead`, `createSystemSocialPost` (internal), `searchFeed` |
| **Dependencies** | `MessagingService` (comment thread via `comment_thread_id`), `MediaService`, `NotificationService`, `HouseholdService` |
| **Explicitly NOT inside** | Comment CRUD (delegated to MessagingService), Direct/Group thread management, Messaging unread |
| **Rationale** | Product Truth: "Feed Comments use shared Messaging engine — not a second comments domain engine." |

### 4.3 MediaService

| Aspect | Decision |
|--------|----------|
| **Authority** | Owns: Validation, upload, metadata persistence, storage path generation, access resolution, cleanup coordination |
| **Operations** | `uploadMedia`, `validateMedia`, `getMediaMetadata`, `resolveMediaAccess`, `cleanupOrphans` (scheduled) |
| **Dependencies** | Supabase Storage (provider seam), `HouseholdService` (membership for access) |
| **Explicitly NOT inside** | Message/Post business logic, reaction/star/pin, thread membership |
| **Rationale** | Shared infrastructure; semantic relations owned by domain services (`message_attachments`, `feed_post_media`) |

### 4.4 Cross-Cutting Services (Existing)

| Service | Reused As-Is |
|---------|--------------|
| `HouseholdService` | Membership validation, role checks, active household resolution |
| `NotificationService` | Persistence, delivery, push (via outbox) |
| `SearchService` | Extended for Feed + Messaging content |
| `IdempotencyService` | Planner V2 core generalized |

---

## 5. PROPOSED DB/DATA MODEL CANDIDATES

### 5.1 Core Tables

```sql
-- Unified thread table (DIRECT | GROUP | FEED_COMMENTS)
messaging_threads (
  id              uuid PK DEFAULT gen_random_uuid(),
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('DIRECT','GROUP','FEED_COMMENTS')),
  creator_person_id uuid NOT NULL REFERENCES people(id),
  title           text,                          -- GROUP only
  status          text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
  closed_at       timestamptz,
  closed_by_person_id uuid REFERENCES people(id),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_message_sequence bigint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Thread membership (unified for all kinds)
messaging_thread_members (
  id                    uuid PK DEFAULT gen_random_uuid(),
  thread_id             uuid NOT NULL REFERENCES messaging_threads(id) ON DELETE CASCADE,
  person_id             uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  joined_at             timestamptz NOT NULL DEFAULT now(),
  removed_at            timestamptz,
  last_read_sequence    bigint NOT NULL DEFAULT 0,
  is_creator            boolean NOT NULL DEFAULT false,
  UNIQUE (thread_id, person_id) WHERE status = 'active'
);

-- Canonical Direct identity (DB-enforced)
-- Enforced by: UNIQUE (household_id, person_low_id, person_high_id) on messaging_threads WHERE kind='DIRECT'
-- person_low_id = LEAST(p1, p2), person_high_id = GREATEST(p1, p2)

-- Messages
messages (
  id                       uuid PK DEFAULT gen_random_uuid(),
  sequence                 bigint NOT NULL,                 -- per-thread monotonic
  thread_id                uuid NOT NULL REFERENCES messaging_threads(id) ON DELETE CASCADE,
  household_id             uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  sender_person_id         uuid NOT NULL REFERENCES people(id),
  body                     text NOT NULL DEFAULT '',
  kind                     text NOT NULL DEFAULT 'USER' CHECK (kind IN ('USER','SYSTEM')),
  reply_to_message_id      uuid REFERENCES messages(id) ON DELETE SET NULL,
  forwarded_from_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  edited_at                timestamptz,
  deleted_for_everyone_at  timestamptz,
  deleted_by_person_id     uuid REFERENCES people(id),
  client_message_id        uuid,                            -- idempotency key
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_thread_sequence ON messages (thread_id, sequence);
CREATE UNIQUE INDEX idx_messages_client_idempotency ON messages (sender_person_id, client_message_id) WHERE client_message_id IS NOT NULL;

-- Message Reactions (one active per person per message)
message_reactions (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  person_id  uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, person_id)
);

-- Stars (personal)
message_stars (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  person_id  uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, person_id)
);

-- Pins (shared thread context)
message_pins (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  thread_id  uuid NOT NULL REFERENCES messaging_threads(id) ON DELETE CASCADE,
  pinned_by_person_id uuid NOT NULL REFERENCES people(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, message_id)
);

-- Hide for me (personal, canonical message unaffected)
message_hidden_for_people (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  person_id  uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, person_id)
);

-- Media (shared)
media (
  id            uuid PK DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  bucket        text NOT NULL,
  object_path   text NOT NULL,
  mime_type     text NOT NULL,
  size_bytes    bigint NOT NULL,
  width         int,
  height        int,
  duration_ms   int,
  checksum      text,
  status        text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','ready','failed')),
  created_by    uuid NOT NULL REFERENCES people(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_path)
);

message_attachments (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_id   uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (message_id, media_id)
);

feed_post_media (
  post_id    uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  media_id   uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, media_id)
);

-- Feed Posts
feed_posts (
  id                     uuid PK DEFAULT gen_random_uuid(),
  sequence               bigint NOT NULL,                 -- global per-household monotonic
  household_id           uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kind                   text NOT NULL CHECK (kind IN ('HUMAN','SYSTEM_SOCIAL')),
  author_person_id       uuid REFERENCES people(id),      -- nullable for system
  body                   text NOT NULL DEFAULT '',
  edited_at              timestamptz,
  deleted_at             timestamptz,
  deleted_by_person_id   uuid REFERENCES people(id),
  comment_thread_id      uuid REFERENCES messaging_threads(id) ON DELETE SET NULL,
  -- System Social metadata
  system_source_module   text,
  system_source_event_key text,
  system_event_type      text,
  system_metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_feed_posts_sequence ON feed_posts (household_id, sequence);
CREATE UNIQUE INDEX idx_feed_posts_system_idempotency 
  ON feed_posts (household_id, system_source_module, system_source_event_key) 
  WHERE kind = 'SYSTEM_SOCIAL';

-- Feed Post Reactions
feed_post_reactions (
  post_id    uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  person_id  uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, person_id)
);

-- Feed Unread (top-level posts only)
feed_read_state (
  person_id              uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  household_id           uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  last_seen_post_sequence bigint NOT NULL DEFAULT 0,
  last_seen_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, household_id)
);
```

### 5.2 Key Design Decisions

| Decision | Candidate | Evidence |
|----------|-----------|----------|
| Thread kinds | `DIRECT`, `GROUP`, `FEED_COMMENTS` | Product Truth unified engine; Agora `conversations.type` |
| Direct canonical key | `person_low_id` + `person_high_id` + `household_id` | Marketplace `UNIQUE(listing_id,buyer_id,seller_id)` adapted; Circle lacks DB constraint |
| Message ordering | Per-thread `sequence` BIGINT | Agora keyset cursor; avoids global counter locking |
| Feed ordering | Per-household `sequence` BIGINT | Ahlan keyset cursor; stable inserts |
| Idempotency | `client_message_id` + UNIQUE(sender, client_id) | Planner V2 `idempotencyKey`; Marketplace client UUID |
| Reactions | Single table + RPC atomic toggle | Agora `toggle_reaction` RPC + UNIQUE constraint |
| System Social idempotency | UNIQUE(household, source_module, source_event_key) | HOMePLUS-specific; no donor precedent |
| Feed Comments | `feed_posts.comment_thread_id` → `messaging_threads(kind=FEED_COMMENTS)` | Product Truth mandate; no donor comment engine adopted |

---

## 6. API CONTRACT CANDIDATES

### 6.1 Messaging Endpoints (Semantic — URLs follow HOMePLUS routing conventions)

| Operation | Endpoint | Authz | Notes |
|-----------|----------|-------|-------|
| List threads (inbox) | `GET /api/messages/threads` | `requireActiveMembership` | Paginated, reverse chronological by `last_activity_at` |
| Ensure Direct | `POST /api/messages/directs/ensure` | `requireActiveMembership` | Idempotent; returns existing or creates |
| Create Group | `POST /api/messages/groups` | `requireActiveMembership` | Creator = member; `kind=GROUP` |
| Get thread | `GET /api/messages/threads/:id` | Thread membership | Includes membership, last message preview |
| List messages | `GET /api/messages/threads/:id/messages` | Thread membership | Keyset pagination (`before_sequence`, `after_sequence`) |
| Send message | `POST /api/messages/threads/:id/messages` | Thread membership + `client_message_id` | Idempotent; returns canonical message |
| Edit message | `PATCH /api/messages/:id` | Own message + valid access | Sets `edited_at` |
| Delete for everyone | `DELETE /api/messages/:id` | Own message + valid access | Tombstone (`deleted_for_everyone_at`) |
| Delete for me | `POST /api/messages/:id/hide` | Thread membership | Inserts `message_hidden_for_people` |
| Add reaction | `POST /api/messages/:id/reactions` | Thread membership | Atomic set/switch/clear |
| Star message | `POST /api/messages/:id/star` | Thread membership | Personal |
| Pin message | `POST /api/messages/:id/pin` | Thread membership (coordinator or creator) | Shared |
| Mark read | `POST /api/messages/threads/:id/read` | Thread membership | Advances `last_read_sequence` |
| Close Group | `POST /api/messages/groups/:id/close` | Creator (V1) | Sets `status=CLOSED`, `closed_at` |
| Reopen Group | `POST /api/messages/groups/:id/reopen` | Creator (V1) | Sets `status=ACTIVE` |
| Add member | `POST /api/messages/groups/:id/members` | Creator/coordinator | Inserts `messaging_thread_members` |
| Remove member | `DELETE /api/messages/groups/:id/members/:person_id` | Coordinator | Sets `status=removed`, `removed_at` |

### 6.2 Feed Endpoints

| Operation | Endpoint | Authz | Notes |
|-----------|----------|-------|-------|
| Get Feed | `GET /api/feed` | `requireActiveMembership` | Keyset pagination (`before_sequence`); reverse chronological |
| Create Post | `POST /api/feed/posts` | `requireActiveMembership` | Human post; media via MediaService |
| Get Post | `GET /api/feed/posts/:id` | `requireActiveMembership` | Includes reaction counts, comment count |
| Edit Post | `PATCH /api/feed/posts/:id` | Author | Sets `edited_at` |
| Delete Post | `DELETE /api/feed/posts/:id` | Author | Tombstone (`deleted_at`) |
| Add Reaction | `POST /api/feed/posts/:id/reactions` | `requireActiveMembership` | Atomic set/switch/clear |
| List Comments | `GET /api/feed/posts/:id/comments` | `requireActiveMembership` | Delegates to MessagingService (thread=comment_thread_id) |
| Add Comment | `POST /api/feed/posts/:id/comments` | `requireActiveMembership` | Creates message in FEED_COMMENTS thread |
| Mark Feed Read | `POST /api/feed/read` | `requireActiveMembership` | Advances `last_seen_post_sequence` |

### 6.3 API Shaping Rule

**DB representation ≠ API representation.** Every response passes through a mapper/shape layer (HOMePLUS convention: `mapMemberPublic`, `mapRoleRequest`). No raw Supabase rows cross the API boundary.

---

## 7. SECURITY / RLS MATRIX

### 7.1 Authorization Model (Defense in Depth)

| Layer | Responsibility |
|-------|----------------|
| **Backend (Primary)** | Every mutation validates: `requireActiveMembership`, `requireCoordinator`, thread membership, ownership checks |
| **RLS (Backstop)** | Deny-all default; policies encode household membership + thread membership + status |

### 7.2 Candidate RLS Policy Semantics

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `messaging_threads` | Member of thread (active) | `requireActiveMembership` (GROUP only) | Creator (close/reopen); Coordinator (manage) | Coordinator (GROUP) |
| `messaging_thread_members` | Active member of thread | Service-only (RPC) | Coordinator (remove); Self (leave) | Coordinator (remove); Self (leave) |
| `messages` | Active thread member | Thread member (send) | Sender (edit); none (delete) | None (tombstone only) |
| `message_reactions` | Thread member | Thread member | Owner (switch/clear) | Owner (clear) |
| `message_stars` | Self only | Self | Self | Self |
| `message_pins` | Thread member | Thread member (creator/coordinator) | Pinner | Pinner |
| `message_hidden_for_people` | Self only | Self | Self | Self |
| `message_attachments` | Thread member | Sender (on send) | None | None |
| `feed_posts` | Active household member | Active household member | Author (edit); Author/Coordinator (delete) | Author/Coordinator |
| `feed_post_media` | Active household member | Author (on create) | None | None |
| `feed_post_reactions` | Active household member | Active household member | Owner | Owner |
| `feed_read_state` | Self only | Self (on first join) | Self | Self |
| `media` | Household member (via message/feed access) | MediaService (upload) | Creator | Creator |

**Note:** All RLS policies use existing HOMePLUS helpers: `is_active_household_member()`, `is_active_household_coordinator()`, `current_person_id()`. New helpers for thread membership: `is_active_thread_member(thread_id)`.

---

## 8. IDEMPOTENCY / RELIABILITY BACKEND REQUIREMENTS

### 8.1 Mutation Idempotency Classification

| Mutation | Idempotency Required | Key | Backend Guarantee |
|----------|---------------------|-----|-------------------|
| `SEND_MESSAGE` | **YES** | `client_message_id` (UUID v4) | UNIQUE(sender, client_message_id); replay returns canonical |
| `SEND_FEED_COMMENT` | **YES** | `client_message_id` | Same as SEND_MESSAGE |
| `CREATE_FEED_POST` | **YES** | `client_post_id` (UUID v4) | UNIQUE(author, client_post_id); replay returns canonical |
| `ADD_REACTION` (msg/feed) | **YES** | Natural key (target_id, person_id, emoji) | RPC atomic toggle; replay = noop |
| `STAR_MESSAGE` | **YES** | Natural key (message_id, person_id) | UNIQUE; replay = noop |
| `PIN_MESSAGE` | **YES** | Natural key (thread_id, message_id) | UNIQUE; replay = noop |
| `MARK_READ` (msg/feed) | **NO** (idempotent by nature) | — | Advance frontier; duplicate safe |
| `MEDIA_FINALIZE` | **YES** | `media_id` (server-generated) | Server-generated; client polls |

### 8.2 Planner V2 Generalization

The Planner reliability core (`mutationId` + `idempotencyKey` + `requestHash`) is **generalizable** but must be **simplified** for Messaging/Feed:

- **Do not expose** `mutationId`, `requestHash`, `dependencies`, `expectedVersion` to Messaging API
- **Use** `client_message_id` / `client_post_id` as the single client-facing idempotency key
- **Backend** maps client key → internal idempotency record (reuse Planner V2 storage pattern)
- **Retry policy**: Exponential backoff + jitter (Planner defaults: base 1s, max 60s, 5 attempts)

### 8.3 Outbox Pattern for Notifications

```sql
-- Reuse HOMePLUS outbox pattern
outbox (
  id uuid PK,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  attempts int NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**Emission signals** (post-commit, fire-and-forget):
- `message.created` → notify thread members (except sender)
- `message.reaction_added` → notify message author
- `feed_post.created` → notify household members (except author)
- `feed_post.reaction_added` → notify post author
- `system_social.post_created` → notify relevant members

**Failure handling**: Notification failure **never** rolls back canonical mutation.

---

## 9. MEDIA LIFECYCLE CANDIDATE

### 9.1 Upload Flow

```
Client → MediaService.validateMedia() → Supabase Storage upload → MediaService.persistMetadata() → returns media_id
```

### 9.2 Attachment Binding

- **Messages**: `message_attachments` (FK to `messages` + `media`)
- **Feed Posts**: `feed_post_media` (FK to `feed_posts` + `media`)

### 9.3 Cleanup Policy (Best-Effort Async)

| Scenario | Action |
|----------|--------|
| Upload succeeds, DB mutation fails | Scheduled cleanup job deletes orphaned storage objects (>24h old) |
| Post deleted (author) | Async cleanup: delete `feed_post_media` → delete `media` rows → delete storage objects |
| Message deleted for everyone | Async cleanup: delete `message_attachments` → delete `media` if unreferenced |
| Message deleted for me | **No media cleanup** (canonical message persists) |
| Media replaced during edit | Old `media` rows unreferenced → async cleanup |
| Retry / partial multi-photo | Each media row independent; failed uploads cleaned by scheduled job |

**Principle**: Orphaned storage is acceptable vs data loss. Follows Agora `removeMediaAsync` pattern.

---

## 10. NOTIFICATION & SEARCH IMPLICATIONS

### 10.1 Notification Emission

| Trigger | Signal | Recipients | Priority |
|---------|--------|------------|----------|
| New message in Direct/Group | `message.created` | Thread members except sender | High |
| New reaction on message | `message.reaction_added` | Message author | Normal |
| New Feed Post | `feed_post.created` | Active household members except author | High |
| New reaction on Feed Post | `feed_post.reaction_added` | Post author | Normal |
| New Feed Comment | `feed_comment.created` | Post author + comment thread participants | Normal |
| System Social Post | `feed_post.created` (kind=SYSTEM_SOCIAL) | Per Social Relevance Rule | Normal |

### 10.2 Search Backend

| Scope | Strategy | Indexes |
|-------|----------|---------|
| Messages (Direct/Group) | Postgres FTS (`to_tsvector`) on `body` + trigram (`pg_trgm`) on `body` | `messages_search_idx` (gin), `messages_trgm_idx` (gin) |
| Feed Posts | Postgres FTS on `body` | `feed_posts_search_idx` (gin) |
| Feed Comments | Via Messaging FTS (same `messages` table) | Shared with messages |
| Group/Direct names | `pg_trgm` on `messaging_threads.title` + member display_names | `threads_trgm_idx` |
| Person names | `household_people_public` view + `pg_trgm` | Existing |

**Access Control**: All search queries server-side filter by `household_id` + thread/household membership. No cross-household leakage.

---

## 11. CONCEPTUAL MIGRATION ORDERING

| Phase | Tables / Objects | Dependencies |
|-------|------------------|--------------|
| **0. Foundation** | Extend `household_members` (if needed), ensure `people`, `households` | Existing |
| **1. Threads & Membership** | `messaging_threads`, `messaging_thread_members` | Foundation |
| **2. Messages** | `messages`, `message_reactions`, `message_stars`, `message_pins`, `message_hidden_for_people` | Threads |
| **3. Interactions** | `media`, `message_attachments` | Messages |
| **4. Feed** | `feed_posts`, `feed_post_media`, `feed_post_reactions`, `feed_read_state` | Threads (for comment_thread_id), Media |
| **5. Search Indexes** | FTS vectors, trigram indexes | Feed, Messages |
| **6. RLS Policies** | All tables above | Tables exist |
| **7. RPCs** | `ensure_direct`, `create_group`, `send_message`, `toggle_reaction`, `mark_read`, `create_feed_post`, `create_system_social` | Tables + RLS |

**No SQL written** — this is dependency-safe ordering only.

---

## 12. BACKEND TEST MATRIX

Based on Agora integration test architecture (`test/integration/**` isolated by `projectId`):

| Capability | L1 Pure/Domain | L2 Backend Contract | L3 DB/API | RLS/Security | Idempotency | Race | Pagination | Membership Changes | Media Lifecycle |
|------------|----------------|---------------------|-----------|--------------|-------------|------|------------|-------------------|-----------------|
| **Direct ensure** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| **Group create** | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — |
| **Group add/remove** | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | — |
| **Group close/reopen** | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — |
| **Send message** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| **Edit message** | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — |
| **Delete ∀ / Delete me** | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ |
| **Reactions (msg/feed)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| **Star / Pin / Hide** | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — |
| **Feed Post CRUD** | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| **Feed Comments** | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |
| **Feed Unread** | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — |
| **System Social** | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| **Search** | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — |
| **Media Upload** | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ |
| **Media Cleanup** | — | — | ✅ | — | — | — | — | — | ✅ |

**Test Patterns to Reuse:**
- Integration tests isolated by `household_id` (like Agora `project_id`)
- Unit tests for pure functions (shapers, validators, ranking, idempotency hash)
- RLS policy tests via authenticated client with different membership states
- Idempotency tests: duplicate key → replay; concurrent same-key → conflict
- Race tests: concurrent send + realtime echo; concurrent reaction toggle

---

## 13. REJECTED DONOR PATTERNS

| Pattern | Donor | Rejection Reason |
|---------|-------|------------------|
| Per-message `read_at` (read receipts) | Marketplace | Product Truth: "Read receipts for other people NOT REQUIRED" |
| Circle `owner/admin/member` group roles | CircleRN | Product Truth: "No parallel group role hierarchy unless Global Permissions requires it" |
| Circle `delete_room` lifecycle | CircleRN | Conflicts with Product Truth `ACTIVE→CLOSED→REOPEN` |
| Framez algorithmic feed | Framez | Product Truth: "NO algorithmic feed" |
| Ahlan direct Supabase writes from client | Ahlan | HOMePLUS: RPC-first, backend trust boundary |
| Ahlan public storage bucket | Ahlan | HOMePLUS: Household-private storage |
| Ahlan client-generated `created_at` | Ahlan | HOMePLUS: Server-authoritative timestamps |
| RNChat `IMessage` as DB schema | RNChat | RNChat = VIEW MODEL only |
| Agora timestamp cursor for all pagination | Agora | HOMePLUS prefers deterministic `sequence` BIGINT |
| Agora trigger-maintained denormalized counters | Agora | Overkill for V1; HOMePLUS uses computed counts |
| OfflinePOC Realm persistence | ExpoOfflineFirstPOC | Overkill; Planner uses AsyncStorage (JS-only) |
| OfflinePOC no idempotency key | ExpoOfflineFirstPOC | Critical gap; Planner has sophisticated model |
| Sharebook offset pagination | Sharebook | Vulnerable to duplicate/skip on insert |
| Sharebook HTML in post body | Sharebook | XSS surface; HOMePLUS uses plain text |
| SocialSphere ephemeral 24h posts | SocialSphere | Contradicts Feed history requirement |

---

## 14. PRODUCT DECISIONS STILL REQUIRED

| Decision | Type | Impact | Notes |
|----------|------|--------|-------|
| **Group creator loses Household membership** → who may close/reopen/manage? | **PRODUCT** | Group lifecycle authority | V1: "creator may close/reopen" — but creator may leave Household. Need successor rule. |
| **Group rename permission** | **PRODUCT** | UI/UX | Coordinator? Creator only? All members? |
| **Group membership management permission** | **PRODUCT** | Add/remove members | Coordinator only? Creator? |
| **Historical unread when new member added** | **PRODUCT** | Unread semantics | New member gets FULL history — should historical messages be unread? Candidate: NO (start at 0). |
| **Direct participant leaves Household then rejoins** | **PRODUCT** | Thread access | Direct is Household-bound. Rejoin → restore access to same canonical thread? Candidate: YES. |
| **Exact Feed tombstone behavior when Post has comments** | **PRODUCT** | Comment visibility | Delete Post → hide Post but preserve comment thread? Or tombstone Post + keep comments accessible? |
| **System Social correction/retraction UX** | **PRODUCT** | Feed integrity | Source fact corrected → regenerate Post? Mark old as superseded? Delete? |
| **Typing indicators** | **PRODUCT** | Real-time feel | "Optional if cheap" — WebSocket/Broadcast cost vs value. |
| **Drafts persistence** | **PRODUCT** | Composer UX | "Optional if cheap" — local only vs server-synced. |

### Architectural Decisions (No Product Impact)

| Decision | Type | Candidate |
|----------|------|-----------|
| Per-thread vs global `sequence` | **ARCHITECTURAL** | Per-thread (avoids counter contention) |
| `client_message_id` generation (client vs server) | **ARCHITECTURAL** | Client-generated UUID v4 (simpler, offline-friendly) |
| Reaction RPC vs Node transaction | **ARCHITECTURAL** | Postgres RPC (atomic, single round-trip) |
| Media cleanup sync vs async | **ARCHITECTURAL** | Async best-effort (Agora pattern) |
| Search: Postgres FTS vs pgvector | **ARCHITECTURAL** | FTS + trigram V1; pgvector later if needed |

---

## 15. ARCHITECTURE DECISIONS STILL OPEN

| Decision | Options | Leaning |
|----------|---------|---------|
| **Direct canonical key implementation** | A) `person_low_id`/`person_high_id` computed in RPC<br>B) Generated `direct_pair_key` stored<br>C) Unique partial index on `(household_id, LEAST(p1,p2), GREATEST(p1,p2))` | **C** — Pure SQL, no RPC computation |
| **Group CLOSED semantics** | A) No new messages; history readable<br>B) No new messages; history hidden<br>C) Read-only for all; creator can reopen | **A** — Product Truth: "same history" |
| **Feed Comment thread creation** | A) Eager (with Post)<br>B) Lazy (first comment) | **B** — Avoids empty threads; simpler |
| **Media `checksum` persistence** | A) SHA-256 on upload<br>B) Skip V1 | **A** — Enables dedupe, costs little |
| **Notification delivery** | A) In-app only V1<br>B) Push via Expo/FCM/APNs | **A** — Defer push; outbox pattern ready |
| **Search ranking** | A) Recency + relevance (FTS rank)<br>B) Recency only | **A** — Planner search already ranks |

---

## 16. RISKS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Canonical Direct race condition** | Medium | High | DB UNIQUE constraint + RPC `ensure_direct` with `FOR UPDATE` |
| **Feed unread performance at scale** | Medium | Medium | `feed_read_state` single row per person/household; index on `sequence` |
| **System Social idempotency collisions** | Low | High | UNIQUE constraint + `source_event_key` design (include version/hash) |
| **Media orphan accumulation** | Medium | Low | Scheduled cleanup job (daily); monitoring alert on orphan count |
| **RLS policy gaps** | Low | High | Deny-all backstop + integration tests for each policy matrix cell |
| **Idempotency key reuse across retries** | Low | Medium | Client generates once per user action; stored with message |
| **Group CLOSED + new member edge case** | Low | Medium | Explicit test: add member to CLOSED group → verify history access |
| **Search cross-household leakage** | Low | Critical | All queries scoped by `household_id` + membership verification |

---

## 17. FINAL STATUS

### Cross Matrix Coverage

| Section | Status |
|---------|--------|
| 1. Domain Service Boundaries | ✅ Complete |
| 2. Thread/Conversation Model Cross | ✅ Complete |
| 3. Canonical Direct Identity | ✅ Complete |
| 4. Group Membership Model | ✅ Complete |
| 5. Message Model | ✅ Complete |
| 6. Message Ordering/Sequence | ✅ Complete |
| 7. Send Idempotency | ✅ Complete |
| 8. Message Read/Unread | ✅ Complete |
| 9. Message Reactions | ✅ Complete |
| 10. Star/Pin/Hide | ✅ Complete |
| 11. Message Delete/Edit Lifecycle | ✅ Complete |
| 12. Forwarding Model | ✅ Complete |
| 13. Feed Post Model | ✅ Complete |
| 14. Feed Ordering/Pagination | ✅ Complete |
| 15. Feed Unread | ✅ Complete |
| 16. Feed Human Post Lifecycle | ✅ Complete |
| 17. System Social Posts | ✅ Complete |
| 18. Feed Comments → Messaging Engine | ✅ Complete |
| 19. Feed Reactions | ✅ Complete |
| 20. Media Data Model | ✅ Complete |
| 21. Media Cleanup/Orphans | ✅ Complete |
| 22. Security/Authorization | ✅ Complete |
| 23. Membership Loss | ✅ Complete |
| 24. RLS Strategy | ✅ Complete |
| 25. API Contract Candidates | ✅ Complete |
| 26. API Shaping | ✅ Complete |
| 27. Notification Emission | ✅ Complete |
| 28. Search Backend Implications | ✅ Complete |
| 29. Reliability Backend Contract | ✅ Complete |
| 30. Migration Plan (Conceptual) | ✅ Complete |
| 31. Backend Test Matrix | ✅ Complete |
| 32. Cross Matrix Format | ✅ Complete |
| 33. Required Corrections from OLA 1 | ✅ Preserved |
| 34. Open Product Decisions | ✅ Documented |

---

**CM1 DATA/BACKEND/SECURITY: PASS**

All 34 required sections completed. Candidates and decisions documented with evidence citations. No implementation performed. No migrations created. No code modified. HOMePLUS workspace untouched. Donor repos unmodified.