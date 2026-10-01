# 03_DONOR_STRUCTURAL_CAPABILITIES.md

## Matriz de capacidades estructurales

| Capability | Ahlan | Sharebook | SocialSphere | Framez | AgoraServer | RNChat | CircleRN | Marketplace | OfflinePOC |
|------------|-------|-----------|--------------|--------|-------------|--------|----------|-------------|------------|
| **Feed** | FOUND | FOUND | FOUND | FOUND | FOUND (API) | N/A | FOUND | FOUND | FOUND |
| **Post CRUD** | FOUND | FOUND | FOUND | FOUND | FOUND (API) | N/A | FOUND | FOUND (threads) | FOUND |
| **Post Detail** | FOUND | FOUND | NOT FOUND | FOUND | FOUND (API) | N/A | NOT FOUND | FOUND | NOT FOUND |
| **Comments** | FOUND | FOUND | NOT FOUND | NOT FOUND | FOUND (API, threaded) | FOUND (UI) | FOUND | FOUND | NOT FOUND |
| **Comment Replies** | FOUND (nested) | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (1-level + RPC thread) | FOUND (UI) | NOT FOUND | NOT FOUND | NOT FOUND |
| **Reactions** | FOUND (like, repost, save) | FOUND (like) | NOT FOUND | FOUND (like) | FOUND (reaction taxonomy, RPC toggle) | FOUND (emoji reactions) | NOT FOUND | NOT FOUND | NOT FOUND |
| **Photos** | FOUND | FOUND | FOUND | FOUND | FOUND (storage) | FOUND (UI) | FOUND | FOUND | NOT FOUND |
| **Video** | FOUND | FOUND | NOT FOUND | FOUND (expo-video) | FOUND (storage) | FOUND (UI) | NOT FOUND | NOT FOUND | NOT FOUND |
| **Upload** | FOUND (Supabase Storage) | FOUND (Supabase Storage) | FOUND (Supabase Storage) | FOUND (Supabase Storage) | FOUND (provider seam) | FOUND (UI only) | FOUND (Supabase Storage) | FOUND (Supabase Storage) | NOT FOUND |
| **Compression** | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (sharp variants) | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND |
| **Storage** | Supabase Storage | Supabase Storage | Supabase Storage | Supabase Storage | Pluggable (Supabase\|S3) | Consumer | Supabase Storage | Supabase Storage | Realm (local) |
| **Pagination** | FOUND (cursor/limit) | FOUND (page/limit) | NOT FOUND | FOUND (FlatList + limit 50) | FOUND (keyset + offset) | FOUND (LoadEarlier) | NOT FOUND | FOUND (limit) | NOT FOUND |
| **Realtime** | FOUND (Postgres Changes + Broadcast) | FOUND (Postgres Changes) | FOUND (Postgres Changes) | FOUND (Postgres Changes) | FOUND (socket.io + PG Changes) | N/A (UI) | FOUND (Postgres Changes) | FOUND (PG Changes + Broadcast) | NOT FOUND |
| **Optimistic** | FOUND (likes, comments, posts) | FOUND (likes) | NOT FOUND | FOUND (likes, follow, comments) | N/A (server) | N/A (UI) | FOUND (Zustand) | NOT FOUND | FOUND (Zustand + Realm) |
| **Retry/Backoff** | FOUND (retry.ts, fetchGuard) | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (rate-limit, webhook retry) | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (retryCount in queue) |
| **Offline Queue** | FOUND (AsyncStorage FIFO) | NOT FOUND | NOT FOUND | NOT FOUND | N/A | N/A | NOT FOUND | NOT FOUND | FOUND (Realm + NetInfo) |
| **Unread** | FOUND (notifications) | NOT FOUND | NOT FOUND | FOUND (notifications + chat) | FOUND (conversation unread) | FOUND (UI) | FOUND (messages) | FOUND (unread_count) | NOT FOUND |
| **Search** | FOUND (search tab, users) | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (semantic + text) | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND |
| **Notifications** | FOUND (expo-notifications + DB) | FOUND (expo-notifications) | NOT FOUND | FOUND (DB + expo-notifications) | FOUND (DB + Web Push/FCM/APNs) | NOT FOUND | FOUND (expo-notifications) | NOT FOUND | NOT FOUND |
| **RLS** | NOT FOUND (client-side only) | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (deny-all + policies) | N/A | NOT FOUND | NOT FOUND | N/A |
| **Migrations** | FOUND (supabase/migrations/*.sql) | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (66 Drizzle migrations) | N/A | NOT FOUND | FOUND (schema.sql) | N/A |
| **RPCs** | FOUND (toggle_reaction, feed) | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (toggle_reaction, match_content, create_notification_safe, fetch_comment_thread, ...) | N/A | NOT FOUND | NOT FOUND | N/A |
| **Tests** | FOUND (60+ Jest files) | FOUND (basic Jest) | NOT FOUND | NOT FOUND | FOUND (Vitest unit + integration) | FOUND (Jest + RTL) | NOT FOUND | NOT FOUND | NOT FOUND |
| **Direct Chat** | FOUND (messages screen) | NOT FOUND | NOT FOUND | NOT FOUND (stub) | FOUND (conversations API) | FOUND (UI library) | FOUND (Chat screen) | FOUND (threads) | NOT FOUND |
| **Group Chat** | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | FOUND (space chats) | FOUND (UI) | FOUND (RoomChat) | NOT FOUND | NOT FOUND |

---

## Evidencia de paths (solo FOUND)

### Ahlan (01_Ahlan)
- **Feed**: `app/(tabs)/index.tsx`, `components/tabs/HomeTab.tsx`, `components/screens/PostViewerScreen.tsx`
- **Post CRUD**: `app/compose.tsx`, `app/edit-post.tsx`, `components/screens/ComposePostScreen.tsx`, `components/screens/EditPostScreen.tsx`, `services/apiService.ts`
- **Post Detail**: `app/post/[id].tsx`, `components/screens/PostViewerScreen.tsx`
- **Comments**: `app/comments/[postId].tsx`, `components/screens/CommentsScreen.tsx`, `src/components/CommentItem.tsx`
- **Comment Replies**: `components/screens/CommentsScreen.tsx` (nested `comment.replies` rendering), `src/components/CommentItem.tsx`
- **Reactions**: `components/PostCard.tsx` (like, repost, save), `services/apiService.ts` (togglePostLike, togglePostRepost, toggleSavePost), `services/likeGuard.ts`
- **Photos**: `app/(tabs)/camera.tsx`, `components/screens/PhotoEditorScreen.tsx`, `expo-image-picker`, `expo-media-library`
- **Video**: `components/screens/VideosScreen.tsx`, `expo-video`
- **Upload**: `services/apiService.ts` (upload media), `services/storage.ts`, `supabase/functions/`
- **Pagination**: `services/apiService.ts` (cursor-based), `components/screens/FeedScreen.tsx` (infinite scroll)
- **Realtime**: `services/realtime.ts` (subscribe/unsubscribe Postgres Changes + Broadcast)
- **Optimistic**: `components/PostCard.tsx` (handleLike, handleRepost), `components/screens/CommentsScreen.tsx` (postComment)
- **Retry/Backoff**: `services/retry.ts`, `services/fetchGuard.ts`, `services/likeGuard.ts`
- **Offline Queue**: `services/offlineQueue.ts` (AsyncStorage FIFO, dedupe, serialize/hydrate)
- **Unread**: `app/notifications.tsx`, `services/notifications.ts`
- **Search**: `app/(tabs)/search.tsx`, `components/tabs/SearchTab.tsx`
- **Notifications**: `services/notifications.ts`, `expo-notifications`, `supabase/functions/delete-user-account/`
- **Migrations**: `supabase/migrations/20260506_add_missing_tables.sql`, `20260506_create_storage_bucket.sql`, `20260812_add_rpc_functions.sql`
- **RPCs**: `services/apiService.ts` (toggle_reaction via Supabase RPC)
- **Tests**: `__tests__/` (60+ files: unit, integration, component, e2e)
- **Direct Chat**: `app/messages.tsx`, `components/screens/MessagesScreen.tsx`

### Sharebook (02_Sharebook)
- **Feed**: `app/(main)/home.tsx`, `components/PostCard.tsx`
- **Post CRUD**: `app/(main)/newPosts.tsx`, `services/postService.tsx` (createOrUpdatePost, getPosts, removePost)
- **Post Detail**: `app/(main)/postDetails.tsx`
- **Comments**: `services/postService.tsx` (createCommentPost, getPostDetails), `components/CommentItem.tsx`
- **Reactions**: `components/PostCard.tsx` (onLike/onRemoveLike), `services/postService.tsx` (createPostLike, removePostLike)
- **Photos**: `services/imageService.tsx` (uploadFile), `expo-image-picker`
- **Video**: `expo-av` (Video component in PostCard)
- **Upload**: `services/imageService.tsx` (uploadFile, downloadFile)
- **Pagination**: `services/postService.tsx` (page/limit with .range())
- **Realtime**: `lib/supabase.ts` (basic Supabase client)
- **Optimistic**: `components/PostCard.tsx` (setIsLikeOwner immediate)

### SocialSphere (03_SocialSphere)
- **Feed**: `src/app/(tabs)/index.tsx`, `src/hooks/usePosts.ts` (loadPosts)
- **Post CRUD**: `src/hooks/usePosts.ts` (createPost with 24h expiry)
- **Photos**: `src/lib/supabase/storage.ts` (uploadPostImage), `expo-image-picker`
- **Realtime**: `src/lib/supabase/client.ts` (Supabase client with AsyncStorage)

### Framez (04_Framez)
- **Feed**: `app/(tabs)/feed.tsx` (ranking algorithm: engagement + recency + following boost)
- **Post CRUD**: `app/(tabs)/create.tsx`, `app/post/[id].tsx`, handleEditPost/handleDeletePost in feed.tsx
- **Post Detail**: `app/post/[id].tsx`
- **Reactions**: `app/(tabs)/feed.tsx` (handleLike with optimistic update + RPC create_notification_safe)
- **Photos**: `expo-image`, `expo-image-picker`, `MediaCarousel` component
- **Video**: `expo-video`, `VideoPlayer` component in feed.tsx
- **Upload**: `lib/supabase.ts`
- **Pagination**: `app/(tabs)/feed.tsx` (limit 50, hasMorePosts flag)
- **Realtime**: `app/(tabs)/feed.tsx` (setupRealtimeSubscription for notifications + follows)
- **Optimistic**: `app/(tabs)/feed.tsx` (handleLike, handleFollow, handleAddComment immediate UI update)
- **Unread**: `app/(tabs)/feed.tsx` (fetchUnreadCount, markNotificationsRead)
- **Notifications**: `app/(tabs)/notifications.tsx`, `supabase.rpc('create_notification_safe')`

### AgoraServer (05_AgoraServer)
- **Feed**: `apps/api/src/routes/entities.ts` (GET /entities with filters, ranking, pagination)
- **Post CRUD**: `apps/api/src/routes/entities.ts` (POST/PATCH/DELETE /entities)
- **Post Detail**: `apps/api/src/routes/entities.ts` (GET /entities/:id)
- **Comments**: `apps/api/src/routes/comments.ts` (GET/POST /comments, threaded via parentId)
- **Comment Replies**: `apps/api/src/routes/comments.ts` (parentId filter), `fetch_comment_thread` RPC
- **Reactions**: `apps/api/src/routes/entities.ts` (toggle_reaction RPC), `reactionSchema` in contract
- **Photos**: `apps/api/src/routes/storage.ts`, `lib/storage.ts` (provider seam), `lib/images.ts` (sharp variants)
- **Video**: `apps/api/src/routes/storage.ts` (file upload), `lib/storage.ts`
- **Upload**: `apps/api/src/routes/storage.ts` (POST /storage multipart), `lib/storage.ts`
- **Compression**: `lib/images.ts` (sharp: webp original + thumbnail/small/medium variants)
- **Storage**: `lib/storage/` (Supabase Storage provider + S3/MinIO provider)
- **Pagination**: `apps/api/src/routes/entities.ts` (keyset + offset via readPagination/paginate)
- **Realtime**: `apps/api/src/realtime/socket.ts` (socket.io), `emitToConversation`, Postgres Changes for notifications
- **RLS**: `apps/api/drizzle/0004_rls.sql`, `0008_rls_public_read.sql`, `0017_rls_self_access.sql`, dynamic guard
- **Migrations**: `apps/api/drizzle/` (66 migration files + meta snapshots)
- **RPCs**: `toggle_reaction`, `refresh_entity_score`, `fetch_comment_thread`, `match_content`, `create_notification_safe`, `mark_notifications_read`, `mark_content` pgvector
- **Tests**: `apps/api/test/integration/` (80+ integration tests), `apps/api/src/**/*.test.ts` (unit)
- **Direct Chat**: `apps/api/src/routes/chat.ts` (conversations, messages, direct type)
- **Group Chat**: `apps/api/src/routes/chat.ts` (space chats, conversation type='space')

### ReactNativeChat (06_ReactNativeChat)
- **Comments**: N/A (chat messages, not social comments)
- **Reactions**: `src/Reactions/` (MessageReactions, ReactionPicker, DEFAULT_REACTION_EMOJIS), `Models.ts` (MessageReaction)
- **Photos**: `src/MessageImage.tsx`, `src/components/MediaCard.tsx`, `AttachmentSheet`
- **Video**: `src/MessageVideo.tsx`, `expo-video` (peer)
- **Upload**: Consumer responsibility (UI only)
- **Pagination**: `src/LoadEarlierMessages.tsx`, `MessagesContainer/FlashList.ts`
- **Optimistic**: N/A (UI library)
- **Tests**: `src/__tests__/` (colocated), `tests/setup.ts`

### CircleRN (07_CircleRN)
- **Feed**: `src/screens/Today.tsx` (daily prompt), `src/screens/Rooms.tsx`
- **Post CRUD**: `src/screens/CreateRoom.tsx`, `src/screens/RoomChat.tsx`
- **Comments**: `src/screens/RoomChat.tsx` (messages in room)
- **Photos**: `expo-image`, `expo-image-picker`, `components/PhotoGrid.tsx`
- **Upload**: `src/lib/supabase.ts`, `src/lib/service.ts`
- **Realtime**: `src/lib/supabase.ts` (Supabase client)
- **Optimistic**: `src/store.ts` (Zustand immediate updates)
- **Direct Chat**: `src/screens/Chat.tsx` (1:1 conversation)
- **Group Chat**: `src/screens/RoomChat.tsx` (group rooms)

### RealtimeChatMarketplace (08_RealtimeChatMarketplace)
- **Feed**: `app/index.tsx` (thread list)
- **Post CRUD**: `app/(thread)/[id].tsx` (chat messages as posts)
- **Comments**: N/A (chat messages only)
- **Photos**: `expo-image`, `expo-image-picker`
- **Upload**: `src/lib/chatRepository.ts` (sendText, sendOffer)
- **Pagination**: `src/lib/chatRepository.ts` (fetchMessages limit 50)
- **Realtime**: `src/lib/chatRepository.ts` (subscribeThread Postgres Changes INSERT, subscribeTyping Broadcast)
- **Unread**: `src/lib/chatRepository.ts` (unread_count in thread list, markRead)

### ExpoOfflineFirstPOC (09_ExpoOfflineFirstPOC)
- **Feed**: `src/screens/FeedScreen.tsx`
- **Post CRUD**: `src/features/offline-queue/offlineQueueService.ts` (enqueue CREATE_POST, UPDATE_POST, DELETE_POST)
- **Photos**: NOT FOUND
- **Pagination**: NOT FOUND
- **Optimistic**: `src/store/uiStore.ts` (Zustand immediate updates on enqueue)
- **Retry/Backoff**: `offlineQueueService.ts` (retryCount increment on failure)
- **Offline Queue**: `src/features/offline-queue/offlineQueueService.ts` (Realm-backed, NetInfo-triggered sync)
- **Notifications**: `expo-background-task`, `expo-task-manager` (periodic background sync)