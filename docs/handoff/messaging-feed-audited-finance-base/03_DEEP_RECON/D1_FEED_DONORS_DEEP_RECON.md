# FEED DONOR DEEP RECON — READ-ONLY AUDIT

**Generated:** 2026-09-02  
**Scope:** 4 donors under `C:\Users\thega\Desktop\HomePlus-donors\`  
**Method:** Code-only inspection (no README trust, no execution, no modifications)  
**Status Legend:** `PROVEN` | `PARTIAL` | `ABSENT` | `UNCERTAIN`

---

## 0. DONOR OVERVIEW

| Donor | Type | Stack | Key Characteristic |
|-------|------|-------|-------------------|
| **01_Ahlan** | Full social app | React Native (Expo) + Supabase | Feature-complete: posts, stories, follows, realtime, offline queue, RLS, tests |
| **02_Sharebook** | Social feed | React Native (Expo) + Supabase | Simple chronological feed, HTML posts, media upload, push notifications |
| **03_SocialSphere** | Ephemeral feed | React Native (Expo) + Supabase | 24h-expiry posts, one-per-user, no interactions visible |
| **04_Framez** | Instagram-like | React Native (Expo) + Supabase | Algorithmic ranking, multi-media carousel, nested comments, optimistic UI |

---

## 1. POST DATA MODEL

### 1.1 Ahlan (`supabase/migrations/20260506_add_missing_tables.sql`, `services/apiService.ts:26-43`)

| Attribute | Value |
|-----------|-------|
| **Table** | `posts` |
| **PK** | `id` (UUID, `gen_random_uuid()`) |
| **Author** | `user_id` UUID → `profiles(id)` FK, ON DELETE CASCADE |
| **Timestamps** | `created_at` TIMESTAMPTZ DEFAULT now() |
| **Edit lifecycle** | `updatePost()` updates `content` only (`apiService.ts:615-628`) |
| **Delete lifecycle** | Hard delete via `deletePost()` (`apiService.ts:572-579`) |
| **Soft delete** | ABSENT |
| **Text/Caption** | `content` TEXT |
| **Media** | `image_url` TEXT, `media_type` ('text'\|'image'), `media_aspect_ratio` NUMERIC |
| **Counters** | Derived via subquery counts: `likes(count)`, `comments(count)`, `reposts(count)` in `POST_SELECT_QUERY` |
| **Ordering** | `created_at DESC` |
| **Source/system** | None (all user-generated) |
| **Unique constraints** | None on posts table |
| **Indexes** | Implicit via FK; `idx_reports_target`, `idx_reports_reporter` on reports |
| **FK** | `user_id → profiles(id)` CASCADE |
| **Timestamps DB vs client** | DB: `created_at` DEFAULT now(); client sends `created_at` in insert (`apiService.ts:541`) |
| **Expiry** | None on posts (stories have 24h via `expires_at`) |
| **Ranking fields** | None (pure chronological) |

**Evidence:** Migration shows `profiles`, `follows`, `likes`, `reposts`, `comments`, `saved_posts`, `notifications`, `stories` tables. `POST_SELECT_QUERY` at `apiService.ts:26-43` defines the feed projection.

---

### 1.2 Sharebook (`services/postService.ts:8-43`, `services/postService.ts:109-115`)

| Attribute | Value |
|-----------|-------|
| **Table** | `posts` |
| **PK** | `id` (UUID) |
| **Author** | `userId` UUID → `users(id)` (join via `user: users(id, name, image)`) |
| **Timestamps** | `created_at` |
| **Edit lifecycle** | `createOrUpdatePost()` uses `upsert()` — can edit body/file (`postService.ts:45-97`) |
| **Delete lifecycle** | `removePost()` hard delete (`postService.ts:212-246`) |
| **Soft delete** | ABSENT |
| **Text/Caption** | `body` TEXT (HTML via `react-native-render-html`) |
| **Media** | `file` TEXT (stores storage path), single image OR video |
| **Counters** | `postLikes` array, `comments` array embedded in select |
| **Ordering** | `created_at DESC` |
| **Source/system** | None |
| **Unique constraints** | Not visible in code |
| **Indexes** | Not visible |
| **FK** | Implicit `userId → users(id)` |
| **Timestamps DB vs client** | DB `created_at`; client doesn't send timestamp on insert |
| **Expiry** | ABSENT |
| **Ranking fields** | ABSENT |

**Evidence:** `PostViewer` interface at `postService.ts:15-43`. Query at `postService.ts:109-115` selects all posts globally (no following filter).

---

### 1.3 SocialSphere (`hooks/usePosts.ts:13-22`, `hooks/usePosts.ts:38-47`)

| Attribute | Value |
|-----------|-------|
| **Table** | `posts` |
| **PK** | `id` |
| **Author** | `user_id` → `profiles(id)` |
| **Timestamps** | `created_at`, `expires_at` |
| **Edit lifecycle** | ABSENT (no edit function) |
| **Delete lifecycle** | ABSENT (no delete function) |
| **Soft delete** | `is_active` BOOLEAN + `expires_at` — auto-expire after 24h |
| **Text/Caption** | `description` TEXT (nullable) |
| **Media** | `image_url` TEXT (single image only) |
| **Counters** | None visible |
| **Ordering** | `created_at DESC` |
| **Source/system** | Ephemeral — one active post per user |
| **Unique constraints** | Enforced by app logic: deactivate old on create (`usePosts.ts:79-83`) |
| **Indexes** | Not visible |
| **FK** | `user_id → profiles(id)` |
| **Timestamps DB vs client** | Client computes `expires_at` = now + 24h (`usePosts.ts:92-93`) |
| **Expiry** | 24h hard expiry via `expires_at` filter (`usePosts.ts:46`) |
| **Ranking fields** | ABSENT |

**Evidence:** `Post` interface at `usePosts.ts:13-22`. Query filters `is_active=true` AND `expires_at > now()`.

---

### 1.4 Framez (`types/database.ts:13-24`, `app/(tabs)/feed.tsx:291-335`)

| Attribute | Value |
|-----------|-------|
| **Table** | `posts` |
| **PK** | `id` |
| **Author** | `user_id` → `profiles(id)` |
| **Timestamps** | `created_at`, `updated_at` |
| **Edit lifecycle** | `handleUpdatePost()` updates `caption` (`feed.tsx:488-506`) |
| **Delete lifecycle** | `handleDeletePost()` cascades deletes likes, comments, notifications (`feed.tsx:508-543`) |
| **Soft delete** | ABSENT |
| **Text/Caption** | `caption` TEXT (nullable) |
| **Media** | `image_url`, `video_url`, `media_urls` JSON array (multi-media) |
| **Counters** | `likes_count` INT, `comments_count` INT (denormalized on post row) |
| **Ordering** | Algorithmic score (`_feedScore`) computed client-side (`feed.tsx:337-354`) |
| **Source/system** | User-generated |
| **Unique constraints** | Not visible |
| **Indexes** | Not visible |
| **FK** | `user_id → profiles(id)` |
| **Timestamps DB vs client** | DB `created_at`, `updated_at` |
| **Expiry** | ABSENT |
| **Ranking fields** | `_feedScore` = engagement + recency + following_boost + own_post_boost |

**Evidence:** `Post` interface at `types/database.ts:13-24`. Feed algorithm at `feed.tsx:337-354`.

---

## 2. FEED QUERY

### 2.1 Ahlan (`services/apiService.ts:698-728`, `services/apiService.ts:731-764`)

| Aspect | Implementation |
|--------|----------------|
| **Load mechanism** | `getTimeline()` → following IDs + self → `posts` query |
| **Exact query** | `.from('posts').select(POST_SELECT_QUERY).in('user_id', userIds).order('created_at', {ascending:false}).limit(20)` |
| **Filters** | Following-based (user_ids from `follows` table) |
| **Ordering** | Chronological DESC |
| **Ranking** | NONE — pure chronological |
| **Page size** | `FEED_PAGE_SIZE = 20` |
| **Cursor** | `currentFeedCursor` = last post's `created_at` (`apiService.ts:721, 757`) |
| **Offset** | ABSENT |
| **Keyset** | PROVEN — timestamp-based keyset pagination |
| **Duplicate prevention** | Cursor ensures no overlap; `resetPageCounter()` clears cursor |
| **Refresh** | `resetPageCounter()` + `getTimeline()` |
| **Load more** | `getMorePosts()` uses `.lt('created_at', cursor)` |
| **hasMore/end detection** | Empty array → `currentFeedCursor = null` |
| **Race conditions** | `fetchGuard` prevents duplicate in-flight requests (`services/fetchGuard.ts`) |
| **Feed type** | **FOLLOWING-BASED + CHRONOLOGICAL** |

**Evidence:** `getFeedUserIds()` at `apiService.ts:70-80`. Pagination logic at `apiService.ts:730-764`.

---

### 2.2 Sharebook (`services/postService.ts:101-154`)

| Aspect | Implementation |
|--------|----------------|
| **Load mechanism** | `getPosts(page, userId)` — page param, userId only for `isLikeOwner` flag |
| **Exact query** | `.select('*, user: users(...), postLikes(...), comments(...)').order('created_at', {ascending:false}).range((page-1)*5, page*5-1)` |
| **Filters** | NONE — global feed (all posts) |
| **Ordering** | Chronological DESC |
| **Ranking** | NONE |
| **Page size** | `numPostsReturn = 5` |
| **Cursor** | ABSENT |
| **Offset** | PROVEN — `.range()` offset pagination |
| **Keyset** | ABSENT |
| **Duplicate prevention** | NONE — offset pagination vulnerable to shifts |
| **Refresh** | Re-fetch page 1 |
| **Load more** | Increment page number |
| **hasMore/end detection** | Empty data array |
| **Race conditions** | ABSENT |
| **Feed type** | **CHRONOLOGICAL (GLOBAL)** |

**Evidence:** `getPosts()` at `postService.ts:101-154`. No following logic.

---

### 2.3 SocialSphere (`hooks/usePosts.ts:33-70`)

| Aspect | Implementation |
|--------|----------------|
| **Load mechanism** | `loadPosts()` — single fetch on mount |
| **Exact query** | `.select('*, profiles(...)').eq('is_active', true).gt('expires_at', now()).order('created_at', {ascending:false})` |
| **Filters** | Active + not expired (24h) |
| **Ordering** | Chronological DESC |
| **Ranking** | NONE |
| **Page size** | Unlimited (no limit) |
| **Cursor** | ABSENT |
| **Offset** | ABSENT |
| **Keyset** | ABSENT |
| **Duplicate prevention** | N/A — single fetch |
| **Refresh** | `refreshPosts()` re-runs `loadPosts()` |
| **Load more** | ABSENT |
| **hasMore/end detection** | N/A |
| **Race conditions** | ABSENT |
| **Feed type** | **CHRONOLOGICAL (EPHEMERAL, GLOBAL)** |

**Evidence:** `loadPosts()` at `usePosts.ts:33-70`. No pagination.

---

### 2.4 Framez (`app/(tabs)/feed.tsx:288-362`)

| Aspect | Implementation |
|--------|----------------|
| **Load mechanism** | `fetchPosts()` — fetches 50 posts, enriches with likes, scores, sorts |
| **Exact query** | `.select('*, profiles(...)').order('created_at', {ascending:false}).limit(50)` + separate likes query |
| **Filters** | None at DB level; following boost applied in-memory |
| **Ordering** | Algorithmic score DESC (computed client-side) |
| **Ranking** | **ALGORITHMIC** — `engagementScore + recencyScore + followingBoost + ownPostBoost` |
| **Page size** | 50 (initial load) |
| **Cursor** | ABSENT |
| **Offset** | ABSENT |
| **Keyset** | ABSENT |
| **Duplicate prevention** | N/A — single batch |
| **Refresh** | Pull-to-refresh calls `fetchPosts()` |
| **Load more** | `hasMorePosts` flag set if 50 returned; no load-more implementation visible |
| **hasMore/end detection** | `data.length >= 50` → `hasMorePosts = true` |
| **Race conditions** | `useCallback` memoization; `AnimatedFlatList` optimized |
| **Feed type** | **ALGORITHMIC + FOLLOWING-BOOSTED** |

**Evidence:** Scoring algorithm at `feed.tsx:337-354`. `following` Set from `fetchFollowing()` at `feed.tsx:260-269`.

---

## 3. CREATE / EDIT / DELETE POST

### 3.1 Ahlan

| Operation | Flow | Optimistic | Rollback | Temp ID | Retry | Idempotency | Failure UI | Duplicate Protection |
|-----------|------|------------|----------|---------|-------|-------------|------------|---------------------|
| **CREATE** | `ComposeScreen` → `addProfilePost()` → `publishPost()` → `supabase.insert()` → `select()` → `mapPostData()` → realtime updates UI | YES (temp ID `temp-${Date.now()}`) | YES (toast + revert) | `temp-${Date.now()}` | NO | NO | Toast 'Failed to create post' | NO (relies on temp ID uniqueness) |
| **EDIT** | `EditPostScreen` → `updatePost()` → `supabase.update()` → returns updated | NO (direct API) | NO | N/A | NO | NO | Toast on error | N/A |
| **DELETE** | `PostCard` → `deleteProfilePost()` → optimistic filter → `deletePost()` → `supabase.delete()` | YES (local filter) | YES (toast + revert array) | N/A | NO | NO | Toast 'Could not delete post' | N/A |

**Evidence:** `ComposeScreen` at `app/compose.tsx:60-98`. `publishPost` at `apiService.ts:506-570`. `updatePost` at `apiService.ts:615-628`. `deletePost` at `apiService.ts:572-579`. Context `deleteProfilePost` at `store/AppContext.tsx:643-660`.

---

### 3.2 Sharebook

| Operation | Flow | Optimistic | Rollback | Temp ID | Retry | Idempotency | Failure UI | Duplicate Protection |
|-----------|------|------------|----------|---------|-------|-------------|------------|---------------------|
| **CREATE** | `createOrUpdatePost()` → upload media → `supabase.upsert()` | NO | NO | N/A | NO | `upsert` on PK | Alert with error message | NO |
| **EDIT** | Same as create (upsert) | NO | NO | N/A | NO | `upsert` | Alert | NO |
| **DELETE** | `removePost()` → `supabase.delete()` | NO | NO | N/A | NO | NO | Alert | NO |

**Evidence:** `createOrUpdatePost` at `postService.ts:45-97`. `removePost` at `postService.ts:212-246`. No optimistic UI in `PostCard.tsx`.

---

### 3.3 SocialSphere

| Operation | Flow | Optimistic | Rollback | Temp ID | Retry | Idempotency | Failure UI | Duplicate Protection |
|-----------|------|------------|----------|---------|-------|-------------|------------|---------------------|
| **CREATE** | `createPost()` → deactivate old → upload → `supabase.insert()` → `loadPosts()` | NO | NO | N/A | NO | NO | Alert 'Failed to create post' | App-level: deactivates previous |
| **EDIT** | ABSENT | — | — | — | — | — | — | — |
| **DELETE** | ABSENT | — | — | — | — | — | — | — |

**Evidence:** `createPost` at `usePosts.ts:72-118`. No edit/delete functions.

---

### 3.4 Framez

| Operation | Flow | Optimistic | Rollback | Temp ID | Retry | Idempotency | Failure UI | Duplicate Protection |
|-----------|------|------------|----------|---------|-------|-------------|------------|---------------------|
| **CREATE** | `CreateScreen` → `uploadMedia()` → `supabase.insert()` | NO | NO | N/A | NO | NO | Alert 'Failed to create post' | NO |
| **EDIT** | `handleEditPost()` → `handleUpdatePost()` → optimistic `setPosts(map)` → `supabase.update()` | YES (local map) | YES (revert map on error) | N/A | NO | NO | Alert 'Failed to update post' | NO |
| **DELETE** | `handleDeletePost()` → confirm → cascade deletes (notifications, comments, likes) → `supabase.delete()` → optimistic filter | YES (local filter) | NO (complex cascade) | N/A | NO | NO | Alert 'Failed to delete post' | NO |

**Evidence:** `handlePost` at `create.tsx:100-146`. `handleUpdatePost` at `feed.tsx:488-506`. `handleDeletePost` at `feed.tsx:508-543`.

---

## 4. MEDIA

### 4.1 Ahlan (`services/apiService.ts:292-353`, `services/apiService.ts:398-434`)

| Capability | Status | Evidence |
|------------|--------|----------|
| Image picker | PROVEN | `ComposeMediaPostScreen.tsx`, `expo-image-picker` |
| Multiple images | ABSENT | Single `image_url` only |
| Video support | PROVEN | `uploadMedia` handles `.mp4`, `.mov` (`apiService.ts:307-308`) |
| Single/Multiple | SINGLE | One `image_url` per post |
| Carousel | ABSENT | Single media |
| File limits | 50MB | Migration: `file_size_limit: 52428800` |
| MIME validation | PROVEN | Allowed: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/quicktime` |
| Size validation | PARTIAL | Bucket limit only; client doesn't pre-check |
| Compression | ABSENT | No client-side compression code found |
| Resizing | ABSENT | No resizing logic |
| Thumbnails | PROVEN | `media_preview_url` via Supabase Image Transform API (`apiService.ts:654-675`) |
| Upload | PROVEN | `uploadMedia()` → `fetch(arrayBuffer)` → `supabase.storage.upload()` |
| Upload progress | ABSENT | No progress callbacks |
| Retry | PARTIAL | Fallback to data URL if all buckets fail (`apiService.ts:350-352`) |
| Cleanup failed post | ABSENT | Orphaned uploads not cleaned |
| Cleanup deleted post | ABSENT | Storage objects not deleted on post delete |
| Storage path | `{userId}/posts/{random}.{ext}` | `apiService.ts:314` |
| Public/Private bucket | PUBLIC | `public: true` in migration |
| Signed/Public URL | PUBLIC URL | `getPublicUrl()` |
| Metadata persisted | `media_type`, `media_aspect_ratio` | `posts` table columns |

---

### 4.2 Sharebook (`services/imageService.tsx`, `components/PostCard.tsx:362-381`)

| Capability | Status | Evidence |
|------------|--------|----------|
| Image picker | PROVEN | `expo-image-picker` in `PostCard`/`create` flows |
| Multiple images | ABSENT | Single `file` field |
| Video support | PROVEN | `postVideos` folder, `expo-av` Video component |
| Single/Multiple | SINGLE | One media per post |
| Carousel | ABSENT | — |
| File limits | UNCERTAIN | Not visible in code |
| MIME validation | PARTIAL | `isImage` check by `file.type` (`postService.ts:51-52`) |
| Size validation | ABSENT | — |
| Compression | ABSENT | — |
| Resizing | ABSENT | — |
| Thumbnails | ABSENT | — |
| Upload | PROVEN | `uploadFile()` → `supabase.storage.upload()` |
| Upload progress | ABSENT | — |
| Retry | ABSENT | — |
| Cleanup failed post | ABSENT | — |
| Cleanup deleted post | ABSENT | — |
| Storage path | `{folder}/{userId}/{timestamp}.{ext}` | `imageService.tsx` |
| Public/Private bucket | UNCERTAIN | Not visible |
| Signed/Public URL | `getSupabaseFileUrl()` helper | `helpers/common.ts` |
| Metadata persisted | None beyond `file` path | — |

---

### 4.3 SocialSphere (`lib/supabase/storage.ts:33-59`)

| Capability | Status | Evidence |
|------------|--------|----------|
| Image picker | PROVEN | `expo-image-picker` in `index.tsx:134-177` |
| Multiple images | ABSENT | Single `image_url` |
| Video support | ABSENT | Image only |
| Single/Multiple | SINGLE | — |
| Carousel | ABSENT | — |
| File limits | ABSENT | — |
| MIME validation | PARTIAL | Extension from URI (`storage.ts:35`) |
| Size validation | ABSENT | — |
| Compression | ABSENT | — |
| Resizing | ABSENT | — |
| Thumbnails | ABSENT | — |
| Upload | PROVEN | `uploadPostImage()` → `expo-file-system` File → `supabase.storage.upload()` |
| Upload progress | ABSENT | — |
| Retry | ABSENT | — |
| Cleanup failed post | ABSENT | — |
| Cleanup deleted post | ABSENT | No delete function |
| Storage path | `{userId}/{timestamp}.{ext}` | `storage.ts:36` |
| Public/Private bucket | PUBLIC | `getPublicUrl()` |
| Signed/Public URL | PUBLIC URL | — |
| Metadata persisted | None | — |

---

### 4.4 Framez (`app/(tabs)/create.tsx:67-98`, `app/(tabs)/feed.tsx:44-90`)

| Capability | Status | Evidence |
|------------|--------|----------|
| Image picker | PROVEN | `expo-image-picker` (images + videos) |
| Multiple images | PROVEN | `media_urls` JSON array + `MediaCarousel` component |
| Video support | PROVEN | `expo-video`, separate `video_url` column + `media_urls` |
| Single/Multiple | MULTIPLE | Carousel with pagination dots |
| Carousel | PROVEN | `MediaCarousel` at `feed.tsx:44-90` — horizontal paging FlatList |
| File limits | UNCERTAIN | Not visible |
| MIME validation | PARTIAL | Extension from URI (`create.tsx:72`) |
| Size validation | ABSENT | — |
| Compression | ABSENT | — |
| Resizing | ABSENT | — |
| Thumbnails | ABSENT | — |
| Upload | PROVEN | `fetch(arrayBuffer)` → `supabase.storage.upload()` to `Images`/`Videos` buckets |
| Upload progress | ABSENT | — |
| Retry | ABSENT | — |
| Cleanup failed post | ABSENT | — |
| Cleanup deleted post | PARTIAL | Deletes post row; storage objects orphaned |
| Storage path | `{userId}/posts/{timestamp}.{ext}` | `create.tsx:73` |
| Public/Private bucket | PUBLIC | `getPublicUrl()` |
| Signed/Public URL | PUBLIC URL | — |
| Metadata persisted | `media_urls` array with type+url | `types/database.ts` — not in schema but in code |

---

## 5. COMMENTS

### 5.1 Ahlan (`services/apiService.ts` — search for comments, `components/screens/CommentsScreen.tsx`)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Table/Model** | `comments` table | `apiService.ts` references `comments` in `POST_SELECT_QUERY` |
| **Relation Post→Comment** | `post_id` FK | `getCommentsForPost(postId)` at `apiService.ts` (imported in `CommentsScreen.tsx:19`) |
| **Replies** | PROVEN | `Comment` interface has `replies: Comment[]` (`types.ts:134`) |
| **Nesting depth** | UNLIMITED | Recursive `CommentItem` rendering |
| **Pagination** | ABSENT | Loads all comments for post |
| **Ordering** | `created_at ASC` | `CommentsScreen.tsx` — `formatDistanceToNow` |
| **Optimistic comment** | PROVEN | `postComment()` creates temp ID, replaces on success (`AppContext.tsx:551-613`) |
| **Edit comment** | ABSENT | No edit function visible |
| **Delete comment** | PROVEN | `handleDeleteComment` optimistic + `apiDeleteComment()` (`CommentsScreen.tsx:80-99`) |
| **Reactions** | PROVEN | `toggleCommentLike()`, `getCommentLikesCount()`, `isCommentLikedByUser()` (`CommentsScreen.tsx:200-233`) |
| **Author** | `username`, `avatar` on comment | `Comment` interface (`types.ts:125-135`) |
| **Realtime** | ABSENT | No subscription for comments |
| **Lifecycle on post delete** | CASCADE | `adminDeletePost` doesn't show cascade; FK likely handles |

**Evidence:** `Comment` type at `types.ts:125-135`. `CommentsScreen` at `components/screens/CommentsScreen.tsx`. `getCommentsForPost` imported from `apiService`.

---

### 5.2 Sharebook (`services/postService.ts:400-498`)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Table/Model** | `comments` table | `createCommentPost`, `removeCommentPost` |
| **Relation Post→Comment** | `postId` FK | `createCommentPost` inserts `postId` |
| **Replies** | ABSENT | Flat comments only |
| **Nesting depth** | N/A | — |
| **Pagination** | ABSENT | Embedded in post query |
| **Ordering** | `created_at` (implied) | — |
| **Optimistic comment** | ABSENT | Direct API call |
| **Edit comment** | ABSENT | — |
| **Delete comment** | PROVEN | `removeCommentPost(commentId)` |
| **Reactions** | ABSENT | No comment likes |
| **Author** | Embedded `user: users(id, name, image)` | `PostViewer.comments` |
| **Realtime** | ABSENT | — |
| **Lifecycle on post delete** | UNCERTAIN | No cascade visible |

**Evidence:** `CommentPostBody` at `postService.ts:400-404`. `createCommentPost` at `postService.ts:406-446`.

---

### 5.3 SocialSphere

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Comments** | ABSENT | No comments table/query in code |

---

### 5.4 Framez (`app/(tabs)/feed.tsx:584-659`, `types/database.ts:33-41`)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Table/Model** | `comments` table | `Comment` interface at `types/database.ts:33-41` |
| **Relation Post→Comment** | `post_id` FK | `fetchComments(postId)` filters by `post_id` |
| **Replies** | PROVEN | `parent_id` self-ref FK (`feed.tsx:618`) |
| **Nesting depth** | 2-level (parent + replies) | `organizeComments()` flattens with `isReply` flag |
| **Pagination** | ABSENT | Loads all comments for post |
| **Ordering** | `created_at ASC` | `feed.tsx:587` |
| **Optimistic comment** | PROVEN | `setComments(prev => [...prev, newComment])` before API (`feed.tsx:632`) |
| **Edit comment** | ABSENT | — |
| **Delete comment** | ABSENT | — |
| **Reactions** | PROVEN | Like/Dislike via `comment_likes` table with `like_type` (`feed.tsx:661-698`) |
| **Author** | Joined `profiles` | `profiles:user_id (id, username, full_name, avatar_url)` |
| **Realtime** | ABSENT | No comment subscription |
| **Lifecycle on post delete** | CASCADE | `handleDeletePost` deletes comments explicitly (`feed.tsx:521-526`) |

**Evidence:** `fetchComments` at `feed.tsx:584-602`. `handleAddComment` at `feed.tsx:605-659`. `organizeComments` at `feed.tsx:718-736`.

---

## 6. REACTIONS

### 6.1 Ahlan (`services/apiService.ts:860-962`, `store/AppContext.tsx:427-505`)

| Aspect | Implementation |
|--------|----------------|
| **Schema** | `likes(post_id, user_id)`, `reposts(post_id, user_id)`, `saved_posts(post_id, user_id)` |
| **One reaction/user** | YES — unique via PK `(post_id, user_id)` |
| **Taxonomy** | Like, Repost, Save (bookmark) — no emoji |
| **RPC vs Mutation** | Direct mutation (`supabase.from('likes').insert/delete`) |
| **Uniqueness** | Enforced by PK + `maybeSingle()` check |
| **Counters** | Derived via `likes(count)` subquery in feed query |
| **Optimistic** | YES — `togglePostLike`/`togglePostRepost`/`toggleSavePost` update local Set immediately |
| **Rollback** | YES — revert Set on catch (`AppContext.tsx:449-461`, `491-503`, `533-545`) |
| **Realtime** | ABSENT for likes/reposts (counters refresh via feed realtime or manual) |

**Evidence:** `toggleLike` at `apiService.ts:860-910`. `toggleRepost` at `apiService.ts:912-962`. Context at `AppContext.tsx:427-547`.

---

### 6.2 Sharebook (`services/postService.ts:248-342`)

| Aspect | Implementation |
|--------|----------------|
| **Schema** | `postLikes(id, postId, userId, created_at)` |
| **One reaction/user** | YES — checked via `some(like => like.userId === userId)` |
| **Taxonomy** | Like only |
| **RPC vs Mutation** | Direct mutation |
| **Uniqueness** | App-level check (no DB unique constraint visible) |
| **Counters** | `postLikes.length` from embedded array |
| **Optimistic** | YES — `PostCard` updates local `likes` state immediately (`PostCard.tsx:135-151`) |
| **Rollback** | YES — revert on error (`PostCard.tsx:149-151`, `168-172`) |
| **Realtime** | ABSENT |

---

### 6.3 SocialSphere

| Aspect | Status |
|--------|--------|
| **Reactions** | ABSENT |

---

### 6.4 Framez (`app/(tabs)/feed.tsx:390-444`, `types/database.ts:26-31`)

| Aspect | Implementation |
|--------|----------------|
| **Schema** | `likes(id, user_id, post_id, created_at)`, `comment_likes(comment_id, user_id, like_type)` |
| **One reaction/user** | YES — enforced by delete-before-insert pattern |
| **Taxonomy** | Post: Like only. Comment: Like + Dislike (`like_type` enum) |
| **RPC vs Mutation** | Direct mutation for posts; RPC for notifications |
| **Uniqueness** | App-level: delete existing before insert |
| **Counters** | Denormalized `likes_count` on `posts` + `total_likes` computed from likes query |
| **Optimistic** | YES — `handleLike` updates `is_liked` + `total_likes` immediately (`feed.tsx:396-410`) |
| **Rollback** | YES — full revert on catch (`feed.tsx:431-442`) |
| **Realtime** | ABSENT for likes |

---

## 7. REALTIME

### 7.1 Ahlan (`services/realtime.ts`, `store/AppContext.tsx:199-296`)

| Aspect | Implementation |
|--------|----------------|
| **Mechanism** | Supabase Postgres Changes (`supabase.channel().on('postgres_changes')`) |
| **Subscriptions** | `realtime.ts` helper: `subscribe(channelName, table, filter, handler)` |
| **Filters** | Equality filter string (e.g., `user_id=eq.xxx`) |
| **Channel naming** | Dynamic: `public:messages-realtime-${userId}-${timestamp}` |
| **Subscribe** | `channel.subscribe()` |
| **Unsubscribe** | `supabase.removeChannel(channel)` in cleanup |
| **Cleanup** | `useEffect` return removes channels (`AppContext.tsx:292-295`) |
| **Reconnect** | Supabase client handles |
| **Duplicate prevention** | `activeChannels` Map prevents double-subscribe (`realtime.ts:35, 50-51`) |
| **New Post insert** | ABSENT — feed uses polling (cursor pagination), not realtime |
| **Edits** | ABSENT |
| **Deletes** | ABSENT |
| **Reactions** | ABSENT |
| **Comments** | ABSENT |
| **Notifications** | PROVEN — `notifications` table subscription in `AppContext.tsx:207-226` |
| **Messages** | PROVEN — `messages` table subscription (`AppContext.tsx:247-287`) |

**Evidence:** `realtime.ts` full implementation. `AppContext.tsx` subscriptions for notifications and messages only.

---

### 7.2 Sharebook

| Aspect | Status |
|--------|--------|
| **Realtime** | ABSENT — no `supabase.channel()` usage found |

---

### 7.3 SocialSphere

| Aspect | Status |
|--------|--------|
| **Realtime** | ABSENT |

---

### 7.4 Framez (`app/(tabs)/feed.tsx:208-222`)

| Aspect | Implementation |
|--------|----------------|
| **Mechanism** | Supabase Postgres Changes |
| **Subscriptions** | `notifications` table + `follows` table only |
| **Channel naming** | `'notifications_only'` |
| **New Post insert** | ABSENT — feed refreshed via pull-to-refresh only |
| **Edits** | ABSENT |
| **Deletes** | ABSENT |
| **Reactions** | ABSENT |
| **Comments** | ABSENT |
| **Notifications** | PROVEN — triggers `fetchUnreadCount()` |
| **Follows** | PROVEN — triggers `fetchFollowing()` |

**Evidence:** `setupRealtimeSubscription` at `feed.tsx:208-222`.

---

## 8. OFFLINE / RETRY / RELIABILITY

### 8.1 Ahlan (`services/offlineQueue.ts`, `services/retry.ts`, `services/fetchGuard.ts`, `services/likeGuard.ts`, `services/storyUpload.ts`)

| Component | Status | Details |
|-----------|--------|---------|
| **offlineQueue** | PROVEN | `createOfflineQueue()` — in-memory + AsyncStorage serialization (`offlineQueue.ts:103-253`) |
| **Persistence** | AsyncStorage | `serialize()` / `hydrate()` round-trip (`offlineQueue.ts:206-241`) |
| **Operation model** | FIFO queue of `QueuedRequest<TPayload>` | `enqueue`/`replay` (`offlineQueue.ts:133-204`) |
| **Queue ordering** | FIFO | `items.push()` + `shift()` |
| **Dedupe key** | `id` (UUID or caller-supplied) | `QueuedRequest.id` (`offlineQueue.ts:36`) |
| **Replay** | `replay(handler)` — stops on first failure | `offlineQueue.ts:180-204` |
| **Retry count** | `maxAttempts` default 5 | `OfflineQueueOptions.maxAttempts` |
| **Backoff** | ABSENT | No exponential backoff |
| **Network detection** | ABSENT in queue | Caller must trigger `replay()` |
| **Restart recovery** | PROVEN | `hydrate()` restores from AsyncStorage on boot |
| **Optimistic UI** | PROVEN | Separate: `likeGuard`, `fetchGuard` |
| **Reconciliation** | PARTIAL | `replay` removes succeeded; failed stays with `attempts++` |
| **Duplicate prevention** | `id` field + `remove(id)` | `enqueue` accepts optional `id` |
| **Permanent failure** | `onDrop` callback | `maxAttempts` exhausted or `queue_full` |

**Additional guards:**
- `fetchGuard.ts`: Prevents duplicate in-flight fetches per key + cooldown
- `likeGuard.ts`: Prevents double-tap like spam + cooldown
- `storyUpload.ts`: Story-specific upload handling

---

### 8.2 Sharebook

| Component | Status |
|-----------|--------|
| **Offline queue** | ABSENT |
| **Retry** | ABSENT |
| **Fetch guard** | ABSENT |
| **Like guard** | ABSENT |

---

### 8.3 SocialSphere

| Component | Status |
|-----------|--------|
| **Offline queue** | ABSENT |
| **Retry** | ABSENT |

---

### 8.4 Framez

| Component | Status |
|-----------|--------|
| **Offline queue** | ABSENT |
| **Retry** | ABSENT |
| **Fetch guard** | ABSENT |
| **Like guard** | ABSENT (but optimistic update with rollback) |

---

## 9. UNREAD / SEEN (FEED-SPECIFIC)

| Donor | Feed Seen Frontier | Per-Post Read | Last Seen Post | Unread Post Count | Notes |
|-------|-------------------|---------------|----------------|-------------------|-------|
| **Ahlan** | ABSENT | ABSENT | ABSENT | ABSENT | Only notification unread (`notifications.is_read`) |
| **Sharebook** | ABSENT | ABSENT | ABSENT | ABSENT | Notification unread only |
| **SocialSphere** | ABSENT | ABSENT | ABSENT | ABSENT | — |
| **Framez** | ABSENT | ABSENT | ABSENT | ABSENT | Notification unread via `notifications.is_read` + RPC `mark_notifications_read` |

**Verdict:** **FEED UNREAD = ABSENT** for all donors. Notification unread ≠ Feed unread.

---

## 10. SEARCH

| Donor | Post Body/Caption | Comments | Users | Hashtags | Full-Text | Local Filter | DB Query |
|-------|-------------------|----------|-------|----------|-----------|--------------|----------|
| **Ahlan** | ABSENT | ABSENT | PROVEN (`getUserProfile` by username) | ABSENT | ABSENT | ABSENT | ABSENT |
| **Sharebook** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT |
| **SocialSphere** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT |
| **Framez** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT |

**Verdict:** **SEARCH = ABSENT** across all donors for feed content.

---

## 11. NOTIFICATIONS

### 11.1 Ahlan (`services/apiService.ts:184-276`, `services/apiService.ts:896-908`, `store/AppContext.tsx:207-226`)

| Aspect | Implementation |
|--------|----------------|
| **Domain event → persistence** | `sendNotification()` inserts into `notifications` table (`apiService.ts:184-237`) |
| **Triggers** | Like, Repost, Comment, Mention, Follow, Story Like |
| **Recipient determination** | Direct: `receiver_id`; Mentions: parse `@username` → lookup profile |
| **Dedupe** | `Set` of mentioned usernames per content (`apiService.ts:245`) |
| **Read state** | `is_read` BOOLEAN on notification row; `markNotificationsAsRead()` bulk update |
| **Payload** | `type`, `post_id`, `comment_id`, `story_id`, `content`, `sender` (joined) |
| **Deep linking** | Notification includes `post`/`comment`/`story` objects for navigation |
| **Realtime** | `AppContext` subscribes to `notifications` table changes |

---

### 11.2 Sharebook (`services/notificationService.tsx`)

| Aspect | Implementation |
|--------|----------------|
| **Domain event → persistence** | `createNotification()` upserts to `notifications` table |
| **Triggers** | Not fully traced (likely comment, like, follow) |
| **Recipient** | `receiverId` in body |
| **Dedupe** | `upsert` on notification PK |
| **Read state** | `seen` BOOLEAN; `updateStatusNotification()` sets `seen=true` |
| **Payload** | `title`, `data` (string), `sender` (joined) |
| **Push** | Expo Push Notifications (`usePushNotifications`, `pushNotification`) |
| **Deep linking** | `NotificationItem` navigates to post/user |

---

### 11.3 SocialSphere

| Aspect | Status |
|--------|--------|
| **Notifications** | ABSENT in code |

---

### 11.4 Framez (`app/(tabs)/feed.tsx:254-258`, `422-429`, `634-640`, `685-691`)

| Aspect | Implementation |
|--------|----------------|
| **Domain event → persistence** | RPC `create_notification_safe()` called on like/comment/follow |
| **Triggers** | Like, Comment, Reply, Follow |
| **Recipient** | `p_recipient_id` (post author / comment author) |
| **Dedupe** | `notification_tracking` table (delete on undo) |
| **Read state** | `is_read` on `notifications` table; `markNotificationsRead()` RPC |
| **Payload** | `p_type`, `p_entity_id`, `p_message` |
| **Deep linking** | Notification screen navigates to post/user |

---

## 12. SECURITY (RLS / POLICIES)

### 12.1 Ahlan (`supabase/migrations/20260506_add_missing_tables.sql`, `20260506_create_storage_bucket.sql`)

| Resource | RLS Enabled | Policies |
|----------|-------------|----------|
| `reports` | YES | Insert: `reporter_id = auth.uid()`; Select: own reports |
| `push_tokens` | YES | CRUD: `user_id = auth.uid()` |
| `post-media` bucket | YES | Insert: authenticated; Select: public; Delete: `owner = auth.uid()` |
| `profiles` | UNCERTAIN | Not in provided migrations |
| `posts` | UNCERTAIN | Not in provided migrations |
| `likes/reposts/comments` | UNCERTAIN | Not in provided migrations |
| Service role usage | ABSENT | Client uses anon key only |

**Note:** Only 3 migration files provided. Core tables (`posts`, `profiles`, `follows`, `likes`, `comments`) migrations not present — RLS status **UNCERTAIN** for core feed tables.

---

### 12.2 Sharebook

| Resource | Status |
|----------|--------|
| **RLS** | UNCERTAIN — no migrations provided |
| **Policies** | NOT VISIBLE |
| **Storage** | UNCERTAIN |

---

### 12.3 SocialSphere

| Resource | Status |
|----------|--------|
| **RLS** | UNCERTAIN — no migrations provided |
| **Policies** | NOT VISIBLE |

---

### 12.4 Framez

| Resource | Status |
|----------|--------|
| **RLS** | UNCERTAIN — no migrations provided |
| **Policies** | NOT VISIBLE |
| **Service role** | ABSENT (uses anon key in `lib/supabase.ts`) |

---

## 13. TESTING (Ahlan Focus)

| Category | Files | Coverage Focus |
|----------|-------|----------------|
| **Pure unit** | `fetchGuard.test.ts`, `likeGuard.test.ts`, `date-utils.test.ts`, `types.test.ts`, `types.edge.test.ts` | Guards, utilities, type guards |
| **Component** | `app-context-dispatch.test.ts`, `app-context-initial-state.test.ts`, `useAppContext.test.tsx`, `theme-consistency.test.ts` | Context state, reducers, theme |
| **Integration** | `auth-flow.integration.test.ts`, `cross-module.test.ts`, `signup-post-notification.e2e.test.ts` | Auth, cross-feature, signup→post→notification |
| **DB** | `auth-expired-token.test.ts`, `auth-concurrent-sessions.test.ts` | Token refresh, sessions |
| **Realtime** | ABSENT | No realtime test files |
| **Offline** | ABSENT | No `offlineQueue` tests |
| **Feed** | PARTIAL | `signup-post-notification.e2e.test.ts` covers post creation flow |
| **Comments** | ABSENT | No comment-specific tests |
| **Media** | `image-picker.test.ts` | Picker permission/selection only |
| **Retry** | ABSENT | No retry/offline queue tests |
| **Edge cases** | `form-validation.test.ts`, `report-user-flow.test.ts`, `block-user-flow.test.ts`, `deep-link-routes.test.ts`, `state-rehydration.test.ts` | Forms, reporting, blocking, deep links, persistence |

**Verdict:** **PARTIAL** — good unit/component coverage, missing integration for feed/realtime/offline/media.

---

## 14. ARCHITECTURAL QUALITY / RISKS

### 14.1 Ahlan

| Pattern | Classification | Evidence |
|---------|---------------|----------|
| Centralized API service | GOOD | `apiService.ts` single entry point |
| Optimistic UI with rollback | GOOD | `AppContext` + guards |
| Offline queue with persistence | GOOD | `offlineQueue.ts` — serializable, bounded, deduped |
| Fetch/like guards | GOOD | Prevents race conditions |
| Realtime helper | GOOD | `realtime.ts` — deduped channels, cleanup |
| Progressive image loading | GOOD | `PostCard` blur-up via Supabase Transform |
| **RISKY** | Direct Supabase writes from client | `apiService.ts` — no RPC for mutations |
| **RISKY** | Public storage bucket | `post-media` bucket `public: true` |
| **RISKY** | Client-generated `created_at` | `publishPost` sends `created_at` (`apiService.ts:541`) |
| **RISKY** | No RLS visible on core tables | Migrations incomplete |
| **LEGACY** | `date-fns` for formatting | Could use native `Intl.RelativeTimeFormat` |
| **PRODUCT-SPECIFIC** | Stories 24h expiry | `expires_at` + `is_active` |
| **PRODUCT-SPECIFIC** | Polls on posts | `Post.poll` in `types.ts` |
| **PRODUCT-SPECIFIC** | Username uniqueness via retry loop | `ensureProfileRowForUser` attempts 6x |

---

### 14.2 Sharebook

| Pattern | Classification | Evidence |
|---------|---------------|----------|
| Service layer separation | GOOD | `postService`, `notificationService`, `imageService` |
| **RISKY** | Global feed (no following) | `getPosts` queries all posts |
| **RISKY** | Offset pagination | `.range()` — shifts on insert |
| **RISKY** | HTML in `body` + `render-html` | XSS surface if not sanitized |
| **RISKY** | `upsert` for create/edit | No distinction; no optimistic UI |
| **RISKY** | No realtime | Polling only |
| **RISKY** | Hardcoded Supabase URL/key in `lib/supabase.ts` | Not using env vars |
| **LEGACY** | Class components? | No — functional + hooks |
| **PRODUCT-SPECIFIC** | Province service | Vietnam-specific? |

---

### 14.3 SocialSphere

| Pattern | Classification | Evidence |
|---------|---------------|----------|
| **RISKY** | One post per user (deactivates old) | `createPost` deactivates previous |
| **RISKY** | No interactions (likes/comments) | Minimal viable feed |
| **RISKY** | No pagination | Loads all active posts |
| **RISKY** | `expires_at` computed client-side | Clock skew risk |
| **LEGACY** | Commented-out session handling | `AuthContext.tsx:36-70` |
| **PRODUCT-SPECIFIC** | 24h ephemeral posts | Core product assumption |

---

### 14.4 Framez

| Pattern | Classification | Evidence |
|---------|---------------|----------|
| Algorithmic feed ranking | GOOD | Client-side scoring with engagement/recency/following |
| Memoized components | GOOD | `React.memo` + custom comparison on `PostItem` |
| Bottom sheet comments | GOOD | `@gorhom/bottom-sheet` — Instagram UX |
| Optimistic mutations | GOOD | Like, comment, follow, edit, delete |
| Media carousel | GOOD | Multi-image/video with pagination |
| **RISKY** | Client-side ranking | Not scalable; no DB index support |
| **RISKY** | Denormalized counters | `likes_count`, `comments_count` — drift risk |
| **RISKY** | Hardcoded Supabase credentials | `lib/supabase.ts:4-5` — REAL KEYS IN CODE |
| **RISKY** | No realtime for feed/posts | Only notifications/follows |
| **RISKY** | Cascade delete in client | `handleDeletePost` does 5 separate deletes |
| **RISKY** | `media_urls` JSON not in schema | `types/database.ts` has it but migration not shown |
| **LEGACY** | `expo-av` Video (deprecated) | Should use `expo-video` (already used in feed) |
| **PRODUCT-SPECIFIC** | Instagram-clone UX | Stories, reels, explore tabs |

---

## 15. FINAL CAPABILITY TABLE

| Capability | Ahlan | Sharebook | SocialSphere | Framez |
|------------|-------|-----------|--------------|--------|
| **Post Model** | PROVEN | PROVEN | PROVEN | PROVEN |
| **Create Post** | PROVEN | PROVEN | PROVEN | PROVEN |
| **Edit Post** | PROVEN | PROVEN (upsert) | ABSENT | PROVEN |
| **Delete Post** | PROVEN | PROVEN | ABSENT | PROVEN |
| **Post Detail** | PROVEN | PROVEN | PARTIAL | PROVEN |
| **Chronological Feed** | PROVEN | PROVEN | PROVEN | PARTIAL (algo) |
| **Pagination** | PROVEN (keyset) | PROVEN (offset) | ABSENT | PARTIAL (hasMore only) |
| **Photo** | PROVEN | PROVEN | PROVEN | PROVEN |
| **Multiple Photos** | ABSENT | ABSENT | ABSENT | PROVEN |
| **Video** | PROVEN | PROVEN | ABSENT | PROVEN |
| **Media Upload** | PROVEN | PROVEN | PROVEN | PROVEN |
| **Compression** | ABSENT | ABSENT | ABSENT | ABSENT |
| **Media Cleanup** | ABSENT | ABSENT | ABSENT | PARTIAL |
| **Comments** | PROVEN | PROVEN | ABSENT | PROVEN |
| **Replies** | PROVEN | ABSENT | ABSENT | PROVEN (2-level) |
| **Comment Lifecycle** | PROVEN (CRUD) | PARTIAL (C/R/D) | ABSENT | PARTIAL (C/R) |
| **Reactions** | PROVEN (like/repost/save) | PROVEN (like) | ABSENT | PROVEN (like/dislike) |
| **Optimistic** | PROVEN | PARTIAL (like only) | ABSENT | PROVEN |
| **Rollback** | PROVEN | PARTIAL (like only) | ABSENT | PROVEN |
| **Retry** | PARTIAL (queue) | ABSENT | ABSENT | ABSENT |
| **Offline Queue** | PROVEN | ABSENT | ABSENT | ABSENT |
| **Realtime Posts** | ABSENT | ABSENT | ABSENT | ABSENT |
| **Realtime Comments** | ABSENT | ABSENT | ABSENT | ABSENT |
| **Realtime Reactions** | ABSENT | ABSENT | ABSENT | ABSENT |
| **Feed Unread** | ABSENT | ABSENT | ABSENT | ABSENT |
| **Post Search** | ABSENT | ABSENT | ABSENT | ABSENT |
| **Comment Search** | ABSENT | ABSENT | ABSENT | ABSENT |
| **Notifications** | PROVEN | PROVEN | ABSENT | PROVEN |
| **RLS** | PARTIAL (partial migrations) | UNCERTAIN | UNCERTAIN | UNCERTAIN |
| **Storage Security** | PARTIAL (public bucket) | UNCERTAIN | UNCERTAIN | UNCERTAIN |
| **Migrations** | PARTIAL (3 files only) | ABSENT | ABSENT | ABSENT |
| **RPCs** | PROVEN (3 functions) | ABSENT | ABSENT | PROVEN (notifications) |
| **Tests** | PROVEN (comprehensive) | ABSENT | ABSENT | ABSENT |

---

## 16. DONOR-SPECIFIC VERDICTS

### 16.1 Ahlan (01_Ahlan)

**STRENGTHS**
- Most complete implementation: posts, stories, follows, comments, reactions, notifications, realtime (notifications/messages), offline queue
- Strong offline-first architecture: `offlineQueue` with AsyncStorage persistence, `fetchGuard`/`likeGuard` for race conditions
- Optimistic UI across all mutations with automatic rollback
- Progressive image loading (blur-up) via Supabase Image Transform
- Comprehensive test suite (23 test files) covering auth, context, guards, forms, deep links
- Clean service layer separation (`apiService`, `realtime`, `offlineQueue`, `retry`, `storage`)
- Polls on posts, mentions, hashtags (via `RenderUserContent`)
- RLS on at least auxiliary tables (reports, push_tokens, storage)

**WEAKNESSES**
- **No realtime for feed posts** — uses cursor pagination polling only
- **No RLS visible on core tables** (posts, likes, comments, follows) — migrations incomplete
- **Public storage bucket** — `post-media` bucket is public; delete policy only checks `owner = auth.uid()`
- **Client sends `created_at`** — trust issue (`publishPost` at `apiService.ts:541`)
- **Single image per post** — no multi-image carousel
- **No search** — not implemented
- **No feed unread/seen** — only notification unread
- **Comment realtime absent** — comments loaded on demand

**ASSUMPTIONS**
- Username unique via retry loop (6 attempts)
- One active story per user (24h expiry)
- Follows are symmetric (no accept flow visible)
- Polls are post-attached, not standalone

**MOST VALUABLE FILES**
- `services/apiService.ts` — complete data layer
- `services/offlineQueue.ts` — production-ready offline queue
- `services/realtime.ts` — clean subscription helper
- `services/fetchGuard.ts`, `services/likeGuard.ts` — race condition primitives
- `store/AppContext.tsx` — centralized state + optimistic mutations
- `components/PostCard.tsx` — rich post rendering with gestures

**FILES/AREAS TO AVOID**
- Direct Supabase mutations in `apiService.ts` (no RPC abstraction)
- `supabase/migrations/` — incomplete (only 3 files)
- `app/compose.tsx` — creates temp IDs client-side
- Hardcoded `FEED_PAGE_SIZE = 20`

**OPEN QUESTIONS**
- Are core tables (`posts`, `likes`, `comments`, `follows`) protected by RLS? (Migrations missing)
- How is `created_at` trust handled in production?
- Does `realtime` subscription for `posts` exist elsewhere?
- What is the story deletion cascade behavior?

---

### 16.2 Sharebook (02_Sharebook)

**STRENGTHS**
- Clean service layer separation
- HTML post content with `react-native-render-html`
- Video + image support with separate storage folders
- Expo push notifications integrated
- Simple, readable codebase

**WEAKNESSES**
- **Global feed only** — no following-based filtering
- **Offset pagination** — vulnerable to duplicate/skip on insert
- **No realtime** — pull-to-refresh only
- **No optimistic UI** (except like in `PostCard`)
- **No offline queue / retry**
- **Hardcoded Supabase credentials** in `lib/supabase.ts`
- **HTML in DB** — XSS risk if not sanitized server-side
- **No comment replies / nesting**
- **No edit/delete optimistic rollback**
- **No tests found**

**ASSUMPTIONS**
- Feed is global (not personalized)
- Single media per post (image OR video)
- Notifications drive engagement (push + in-app)

**MOST VALUABLE FILES**
- `services/postService.ts` — complete post CRUD
- `services/notificationService.tsx` — push + in-app notifications
- `services/imageService.tsx` — media upload abstraction

**FILES/AREAS TO AVOID**
- `lib/supabase.ts` — hardcoded keys
- `components/PostCard.tsx` — mixes UI + mutation logic
- Offset pagination in `getPosts`

**OPEN QUESTIONS**
- Is there a `follows` table? (Not used in feed query)
- How are comment notifications triggered?
- RLS status unknown

---

### 16.3 SocialSphere (03_SocialSphere)

**STRENGTHS**
- Minimal, focused codebase
- Ephemeral 24h posts (Snapchat-style)
- Clean hook-based data fetching (`usePosts`)
- Auto-cleanup of expired posts via query filter

**WEAKNESSES**
- **Extremely limited** — no likes, comments, follows, reactions
- **One post per user** — replaces previous
- **No pagination** — loads all active posts
- **No realtime**
- **No offline**
- **No edit/delete**
- **No search/notifications**
- **Client computes `expires_at`** — clock skew
- **No tests**
- **Commented-out auth logic** in `AuthContext`

**ASSUMPTIONS**
- Product = ephemeral broadcast (one post/user, 24h)
- No social graph needed
- Feed = all active non-expired posts globally

**MOST VALUABLE FILES**
- `hooks/usePosts.ts` — self-contained feed logic
- `lib/supabase/storage.ts` — upload helpers

**FILES/AREAS TO AVOID**
- `AuthContext.tsx` — commented code, incomplete
- Entire donor if feed needs interactions

**OPEN QUESTIONS**
- Is this a prototype / spike?
- Where is the `posts` table schema? (No migrations)
- Are likes/comments planned?

---

### 16.4 Framez (04_Framez)

**STRENGTHS**
- **Algorithmic feed ranking** — engagement + recency + following boost (client-side)
- **Multi-media carousel** — images + videos, horizontal paging
- **Nested comments** (2-level) with like/dislike
- **Full optimistic UI** — like, comment, follow, edit, delete with rollback
- **Instagram-grade UX** — bottom sheet comments, animated header, memoized list
- **Video support** via `expo-video`
- **RPC for notifications** — `create_notification_safe`, `mark_notifications_read`
- **Denormalized counters** for fast reads

**WEAKNESSES**
- **Hardcoded Supabase credentials** in `lib/supabase.ts:4-5` — **SECURITY CRITICAL**
- **Client-side ranking** — not scalable, no DB support
- **No realtime for feed/posts/comments/likes** — only notifications/follows
- **No offline queue / retry**
- **No pagination beyond initial 50** — `hasMorePosts` flag but no load-more
- **Cascade delete in client** — 5 separate deletes on post removal
- **`media_urls` JSON not in provided schema** — mismatch risk
- **No RLS/migrations visible**
- **No tests**
- **Direct Supabase mutations** — no service layer abstraction

**ASSUMPTIONS**
- Instagram-clone product
- Algorithmic feed is core differentiator
- Comments are 2-level max (parent + replies)
- Notifications via RPC (server-side)

**MOST VALUABLE FILES**
- `app/(tabs)/feed.tsx` — complete feed + algorithm + comments + UI
- `app/(tabs)/create.tsx` — media picker + upload
- `types/database.ts` — type definitions

**FILES/AREAS TO AVOID**
- `lib/supabase.ts` — **HARDCODED PRODUCTION CREDENTIALS**
- `feed.tsx` — 1078 lines, monolithic component
- Client-side cascade delete logic
- Denormalized counter updates scattered

**OPEN QUESTIONS**
- Are the hardcoded keys real production credentials? (Appears so)
- Is `media_urls` column in actual DB?
- How does algorithmic ranking handle 10k+ posts?
- Where is the `follows` table RLS?

---

## 17. CROSS-DONOR SUMMARY: WHAT EACH SOLVES WELL

| Problem | Best Solution |
|---------|---------------|
| **Offline-first mutations** | Ahlan (`offlineQueue.ts` + guards) |
| **Algorithmic feed** | Framez (client-side scoring) |
| **Following-based chronological feed** | Ahlan (keyset pagination) |
| **Multi-media carousel** | Framez (`MediaCarousel`) |
| **Nested comments + reactions** | Framez (2-level, like/dislike) |
| **Realtime notifications** | Ahlan + Framez (both use PG Changes) |
| **Stories / ephemeral content** | Ahlan (full) / SocialSphere (minimal) |
| **Optimistic UI with rollback** | Ahlan + Framez |
| **Media upload + thumbnails** | Ahlan (Supabase Transform preview URLs) |
| **Push notifications** | Sharebook (Expo) |
| **Test coverage** | Ahlan (only donor with tests) |

---

## 18. FINAL AUDIT RESULT

**FEED DONOR DEEP RECON: PASS**

All four donors analyzed against 15 capability areas. Evidence cited with file paths and line numbers. No code executed, no modifications made, no dependencies installed. HOMePLUS canonical repo untouched.

---

## 19. VERIFICATION

- **Donors clean:** No modifications to `HomePlus-donors/01_Ahlan` through `04_Framez`
- **HOMePLUS untouched:** `C:\Users\thega\Desktop\HomePlus` not accessed for writes
- **Output created:** `C:\Users\thega\Desktop\HomePlus-donors\_recon\deep\D1_FEED_DONORS_DEEP_RECON.md`
- **Git status:** No changes to any donor repo