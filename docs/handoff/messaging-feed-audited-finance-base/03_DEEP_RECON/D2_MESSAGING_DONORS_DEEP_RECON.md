# D2 — MESSAGING DONORS DEEP RECON

**Scope:** Read-only audit of three donors for HOMePLUS MessagingService + shared conversation engine  
**Date:** 2026-09-02  
**Repos:**
- `06_ReactNativeChat` — UI library (`@kesha-antonov/react-native-chat` v4.4.0, MIT)
- `07_CircleRN` — App with Supabase backend (directs + rooms)
- `08_RealtimeChatMarketplace` — Marketplace chat (threads per listing, Supabase schema) — **REFERENCE-ONLY**

---

## 1. CONVERSATION MODEL

### 1.1 CircleRN (Directs = Matches)

**Evidence:** `src/lib/service.ts:33`, `src/store.ts:329-359`, `src/types.ts:111-117`

| Property | Source | Value / Mechanism |
|----------|--------|-------------------|
| **Thread identity** | `MatchRow.id` (UUID) | `matches` table PK |
| **Direct uniqueness** | `matches` table: `user_a`, `user_b` | **No canonical ordering enforced in schema** — `act_on_profile` RPC must enforce A+B = B+A (see §6) |
| **Participants** | `MatchRow.user_a`, `user_b` | Two-user only |
| **Created at** | `MatchRow.created_at` | timestamptz |
| **Last activity** | Derived from `messages` table via `updated_at` on thread list | `refreshConversations()` pulls last message |
| **Unread** | `Conversation.unread` (bool) + `readConvos[]` (memberIds opened) | Unread until user opens; new inbound message → unread=true |
| **Lifecycle** | Match created → conversation exists; `unmatch` RPC deletes match row | Hard delete |
| **Group/Room** | Separate model (see §7) | N/A for directs |

**Frontend assumptions (store.ts:329-359):**
- Conversation keyed by `otherId` (memberId), not matchId
- `matchIDs[memberId] → matchId` mapping maintained
- `readConvos` tracks which memberIds the user has opened
- Unread = `!readConvos.includes(otherId) && (!lastMsg || lastMsg.sender_id !== uid)`

### 1.2 CircleRN (Rooms = Group Chats)

**Evidence:** `src/types.ts:27-39`, `src/lib/service.ts:221-288`, `src/store.ts:621-720`

| Property | Source | Value / Mechanism |
|----------|--------|-------------------|
| **Thread identity** | `Room.id` (UUID) | `rooms` table PK |
| **Participants** | `room_members` join table | `user_id`, `role`, `status` |
| **Membership** | `RoomMember[]` with `role: owner|admin|member`, `status: invited|joined` | Invite flow via RPC |
| **Created at** | `rooms.created_at` (implied) | Not exposed in `Room` type |
| **Last activity** | `Room.lastText`, `Room.time` | Updated on send/receive |
| **Unread** | `Room.unread` (bool) | Cleared on `openRoom()` |
| **Group roles** | `owner`, `admin`, `member` | Enforced by RPCs (`set_room_role`, `remove_room_member`, etc.) |
| **Canonical identity** | Room ID only | No duplicate prevention beyond PK |
| **DB constraints** | `room_members` unique on `(room_id, user_id)` implied | RLS policies not shown |

### 1.3 RealtimeChatMarketplace (Threads per Listing)

**Evidence:** `supabase/schema.sql:2-12`, `src/types/index.ts:15-25`

| Property | Source | Value / Mechanism |
|----------|--------|-------------------|
| **Thread identity** | `chat_threads.id` (UUID) | PK |
| **Direct uniqueness** | `UNIQUE (listing_id, buyer_id, seller_id)` | **Canonical per listing-party pair** — one thread per listing per buyer-seller pair |
| **Participants** | `buyer_id`, `seller_id` (FK to `auth.users`) | Two-party only, bound to listing |
| **Created at** | `created_at` (timestamptz) | Auto |
| **Last activity** | `updated_at` + `last_message` join | `listThreads` orders by `updated_at desc` |
| **Unread** | `ChatThread.unreadCount` (per `myId`) | Computed via `unread_count_${myId}` in query |
| **Lifecycle** | Thread created on first contact; no delete shown | Soft archive not modeled |
| **Group/Room** | N/A | Marketplace is 1:1 only |

---

## 2. MESSAGE MODEL

### 2.1 ReactNativeChat (IMessage — UI Contract)

**Evidence:** `src/Models.ts:50-79`

```typescript
interface IMessage {
  _id: string | number                    // Client or server ID
  text: string
  createdAt: Date | number                // Timestamp
  user: User                              // { _id, name?, avatar? }
  image?: string                          // Image URL
  video?: string                          // Video URL
  videoNote?: boolean                     // Round video note (Telegram-style)
  audio?: string                          // Audio URL
  duration?: number                       // Seconds (for audio/video)
  system?: boolean                        // System message flag
  sent?: boolean                          // Single tick
  received?: boolean                      // Double tick (delivered)
  pending?: boolean                       // Sending (clock)
  streaming?: boolean                     // AI streaming (caret)
  quickReplies?: QuickReplies             // Bot-style buttons
  replyMessage?: ReplyMessage             // Swipe-reply reference
  reactions?: MessageReaction[]           // { emoji, userIds[] }
  location?: { latitude, longitude }
}
```

**Key observations:**
- **No server ID vs client ID distinction** — `_id` is opaque; consumer generates via `messageIdGenerator` prop
- **Status flags are local/UI only** — `sent`/`received`/`pending` not synced to backend
- **Reactions embedded** — `MessageReaction { emoji, userIds[] }` on message
- **Reply is shallow copy** — `ReplyMessage` picks `_id, text, user, audio, image`
- **No edit/delete/revoke fields** — UI supports actions via `messageActions` prop but model lacks `edited`, `deleted`, `revoked`
- **No message type enum** — `kind` inferred from presence of `image`/`video`/`audio`/`system`/`location`

### 2.2 CircleRN (ChatMessage / RoomChatMessage)

**Evidence:** `src/types.ts:18-25`, `src/types.ts:104-109`

```typescript
// Directs (match messages)
interface ChatMessage {
  id: string
  text: string
  fromMe: boolean
  at: string                          // ISO timestamp
}

// Rooms
interface RoomChatMessage {
  id: string
  text: string
  senderId: string
  senderName: string
  fromMe: boolean
  at: string
}
```

**Key observations:**
- **Minimal fields** — text only; no media, reactions, reply, system
- **`fromMe` derived** — `sender_id === currentUserId` (store.ts:353, 658)
- **No client-side optimistic ID** — optimistic messages use `local-${Date.now()}` (store.ts:582, 674)
- **No status flags** — delivery/read not modeled in message; conversation-level unread only

### 2.3 RealtimeChatMarketplace (ChatMessage)

**Evidence:** `supabase/schema.sql:14-24`, `src/types/index.ts:3-13`

```sql
-- DB schema
chat_messages:
  id uuid PK
  thread_id uuid FK → chat_threads
  sender_id uuid FK → auth.users
  body text
  kind text DEFAULT 'text'   -- 'text' | 'image' | 'system' | 'offer'
  attachment_url text
  offer_amount numeric
  sent_at timestamptz
  read_at timestamptz        -- Nullable: null = unread
```

```typescript
// TypeScript
interface ChatMessage {
  id: string
  threadId: string
  senderId: string
  body: string
  kind: 'text' | 'image' | 'system' | 'offer'
  sentAt: string
  readAt: string | null
  attachmentUrl: string | null
  offerAmount: number | null
}
```

**Key observations:**
- **Server-authoritative IDs** — UUID from `uuid()` (client-generated in repo, but could be DB default)
- **Explicit `kind` enum** — `text`, `image`, `system`, `offer`
- **Read receipts at message level** — `read_at` timestamp per message
- **Offer as first-class message** — `offer_amount` + `body` for context
- **No reactions, no reply, no edit/delete** — Not in schema

---

## 3. SEND PIPELINE

### 3.1 ReactNativeChat (UI Library — No Backend)

**Evidence:** `src/Chat/index.tsx:233-260`, `src/Send.tsx:53-59`, `src/InputToolbar.tsx:245-277`

```
Composer (InputToolbar)
  → User types / records voice / records video
  → onSend callback (consumer-provided)
  → Consumer: optimistic append → API → reconcile
```

**Library responsibilities:**
- `messageIdGenerator` prop (default: random string) — `Chat/index.tsx:56`
- Attaches `user`, `createdAt: new Date()`, `_id` to message
- Attaches `replyMessage` if active
- Clears reply preview after send
- `isTextOptional` allows media-only sends
- Voice/video recording components (`VoiceMessageInput`, `VideoNoteRecorder`) call `onSend` with `{ audio: uri, duration }` or `{ video: uri, videoNote: true, duration }`

**No built-in:**
- Duplicate prevention (consumer responsibility)
- Retry/rollback (consumer responsibility)
- Optimistic → server reconciliation (consumer responsibility)

### 3.2 CircleRN (Directs)

**Evidence:** `src/store.ts:577-588`, `src/lib/service.ts:204-210`

```typescript
// Store.send() — store.ts:577
send(text, memberId) {
  const matchId = get().matchIDs[memberId];
  const optimistic = { id: `local-${Date.now()}`, text, fromMe: true, at: new Date().toISOString() };
  // 1. Optimistic append to local conversation
  // 2. Service.sendMessage(matchId, text) — fire-and-forget (.catch(() => {}))
}
```

```typescript
// Service.sendMessage — service.ts:204
async sendMessage(matchId, body) {
  const uid = await currentUserId();
  const { data } = await supabase.from('messages')
    .insert({ match_id: matchId, sender_id: uid, body }).select().limit(1);
  return data?.[0] ?? null;
}
```

**Pipeline:**
1. Composer → `store.send(text, memberId)`
2. Optimistic message (`local-${Date.now()}`) appended to `conversations[memberId].messages`
3. `Service.sendMessage` → Supabase `messages` INSERT
4. **No reconciliation** — Real-time `postgres_changes` on `messages` table delivers server row (store.ts:366-390)
5. **Duplicate risk** — If realtime fires before optimistic, two messages (local + server) unless deduped by ID (not done)
6. **No retry** — `.catch(() => {})` swallows errors

### 3.3 CircleRN (Rooms)

**Evidence:** `src/store.ts:671-678`, `src/lib/service.ts:251-255`

```typescript
// Store.sendRoom() — store.ts:671
sendRoom(roomId, text) {
  const optimistic = { id: `local-${Date.now()}`, text, senderId: 'me', senderName: 'You', fromMe: true, at: new Date().toISOString() };
  // Optimistic append to room.messages
  Service.sendRoomMessage(roomId, text).catch(() => {});
}
```

- Same pattern as directs: optimistic + fire-and-forget + realtime echo
- Realtime on `room_messages` table (store.ts:412-426)

### 3.4 RealtimeChatMarketplace

**Evidence:** `app/(thread)/[id].tsx:84-107`, `src/lib/chatRepository.ts:106-121`

```typescript
// ThreadScreen.send() — app/(thread)/[id].tsx:84
const optimistic: ChatMessage = { id: `tmp-${Date.now()}`, threadId, senderId: myId, body, kind: 'text', sentAt: new Date().toISOString(), readAt: null, attachmentUrl: null, offerAmount: null };
prepend(threadId, optimistic);  // Store
try {
  const real = await sendText(threadId, myId, body);  // Repository
  replace(threadId, optimistic.id, real);  // Reconcile
} catch (e) {
  remove(threadId, optimistic.id);
  Alert.alert('Send failed', String(e));
}
```

```typescript
// chatRepository.sendText — chatRepository.ts:106
export async function sendText(threadId, senderId, body) {
  const row = { id: uuid(), thread_id: threadId, sender_id: senderId, body: trimmed, kind: 'text', sent_at: new Date().toISOString() };
  const { error } = await supabase.from('chat_messages').insert(row);
  if (error) throw error;
  return rowToMessage(row);
}
```

**Pipeline:**
1. Composer → optimistic message (`tmp-${Date.now()}`) → `prepend` to store
2. `chatRepository.sendText` → Supabase INSERT with client-generated UUID
3. On success: `replace(optimisticId, realMessage)` — **explicit reconciliation**
4. On failure: `remove(optimisticId)` + alert — **explicit rollback**
5. Realtime subscription (`subscribeThread`) also receives the insert → **duplicate risk** if not deduped (store.ts:27 checks `existing.some(x => x.id === m.id)`)

**Duplicate prevention:** Store `prependMessage` guards by ID (chatStore.ts:27); `replaceMessage` filters both IDs (chatStore.ts:36).

---

## 4. REALTIME

### 4.1 CircleRN

**Evidence:** `src/store.ts:360-440`

```typescript
startRealtime() {
  const channel = supabase.channel(`circle-realtime-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
      // 1. Ignore own messages (sender_id === uid)
      // 2. Find conversation by match_id → memberId
      // 3. Append to conversation.messages
      // 4. Update preview, time, unread=true
      // 5. Reorder conversationOrder
      // 6. Remove from readConvos
      // 7. Show in-app banner if not viewing
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, ...)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions' }, ...)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages' }, async (payload) => {
      // Room messages: append to room.messages, update lastText/time, unread, banner
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, async (payload) => {
      // Membership changes → refreshRooms()
    })
    .subscribe();
}
```

**Channel strategy:** Single channel with multiple `postgres_changes` filters. Topic includes timestamp to avoid "cannot add callbacks after subscribe" errors.

**Own-event handling:** Explicit `if (row.sender_id === uid) return;` for messages and room_messages.

**Typing:** Not implemented in CircleRN.

**Reconnect:** Not handled explicitly; relies on Supabase JS client auto-reconnect.

### 4.2 RealtimeChatMarketplace

**Evidence:** `src/lib/chatRepository.ts:69-98`, `app/(thread)/[id].tsx:44-76`

```typescript
// Per-thread message subscription
subscribeThread(threadId, onInsert) {
  const channel = supabase.channel(`thread:${threadId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, (payload) => onInsert(rowToMessage(payload.new)))
    .subscribe();
  channels.set(threadId, channel);
  return () => { channels.delete(threadId); supabase.removeChannel(channel); };
}

// Per-thread typing (Broadcast)
subscribeTyping(threadId, onTyping) {
  const channel = supabase.channel(`typing:${threadId}`)
    .on('broadcast', { event: 'typing' }, ({ payload }) => onTyping({ threadId, userId: payload.user_id, since: Date.now() }))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

emitTyping(threadId, userId) {
  const channel = supabase.channel(`typing:${threadId}`);
  await channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId } });
}
```

**Channel strategy:** One channel per thread for messages; one per thread for typing (Broadcast).

**Own-event handling:** Typing ignores `if (t.userId === myId) return;` (ThreadScreen.tsx:64). Messages: no explicit filter — relies on store dedup.

**Cleanup:** `useEffect` cleanup calls unsubscribe functions on unmount.

**Reconnect:** Not explicit; Supabase client handles.

---

## 5. READ / UNREAD

### 5.1 CircleRN (Directs)

**Evidence:** `src/store.ts:329-359`, `src/store.ts:569-575`, `src/store.ts:380-382`

| Mechanism | Implementation |
|-----------|----------------|
| **Unread flag** | `Conversation.unread` (bool) per memberId |
| **Mark read** | `openChat(id)` → sets `convos[id].unread = false` + adds to `readConvos[]` |
| **Read receipts** | None at message level; conversation-level only |
| **Own unread UI** | `Messages` screen shows dot (`styles.unread`) when `convo.unread` |
| **First unread** | Not tracked |
| **New inbound message** | Realtime handler sets `c.unread = true` and removes from `readConvos` (store.ts:382) |
| **Match created (no messages)** | Treated as unread for recipient (store.ts:347: `unread = !readConvos.includes(otherId) && (!last || last.sender_id !== uid)`) |

### 5.2 CircleRN (Rooms)

**Evidence:** `src/store.ts:412-426`, `src/store.ts:665-669`

| Mechanism | Implementation |
|-----------|----------------|
| **Unread flag** | `Room.unread` (bool) |
| **Mark read** | `openRoom(roomId)` → sets `rooms[roomId].unread = false` + calls `loadRoomMessages()` |
| **Read receipts** | None |
| **Own unread UI** | `Rooms` screen shows dot when `room.unread` |
| **Realtime inbound** | Sets `unread: !viewing` (store.ts:422) |

### 5.3 RealtimeChatMarketplace

**Evidence:** `supabase/schema.sql:23`, `src/lib/chatRepository.ts:144-153`, `app/(thread)/[id].tsx:50-52, 60`

| Mechanism | Implementation |
|-----------|----------------|
| **Unread count** | `ChatThread.unreadCount` (per `myId`) computed via `unread_count_${myId}` in query |
| **Mark read** | `markRead(threadId, myId)` → UPDATE `chat_messages SET read_at = now() WHERE thread_id = ... AND sender_id != myId AND read_at IS NULL` |
| **Read receipts** | Per-message `read_at` timestamp (nullable) |
| **Auto mark read** | On thread open: `await markRead(threadId, myId)` (ThreadScreen.tsx:52) |
| **Realtime inbound** | `subscribeThread` callback calls `markRead` if `m.senderId !== myId` (ThreadScreen.tsx:60) |

---

## 6. DIRECTS — CANONICAL UNIQUENESS

### 6.1 CircleRN

**Evidence:** `src/lib/service.ts:179-185` (actOnProfile RPC), `supabase` schema not in repo

**Analysis:**
- `matches` table has `user_a`, `user_b` columns (service.ts:32)
- **No unique constraint on (LEAST(user_a,user_b), GREATEST(user_a,user_b)) visible in repo**
- `act_on_profile` RPC (`service.ts:179`) is the only match creation path
- **Assumption:** RPC enforces canonical ordering (A+B = B+A) — **not verifiable from frontend code**
- Frontend `refreshConversations` maps by `otherId` (memberId), so duplicate matches would appear as duplicate conversations

**Risk:** If RPC doesn't enforce uniqueness, two threads possible for same pair.

### 6.2 RealtimeChatMarketplace

**Evidence:** `supabase/schema.sql:11`

```sql
UNIQUE (listing_id, buyer_id, seller_id)
```

**Analysis:**
- **Canonical per listing-party pair** — enforced at DB level
- Buyer/seller roles fixed → (buyer=A, seller=B) ≠ (buyer=B, seller=A) for same listing
- But a user can't be both buyer and seller on same listing (business logic)
- **Strong guarantee** — no duplicate threads for same listing between same two users

---

## 7. GROUPS / ROOMS (CircleRN Only)

**Evidence:** `src/types.ts:27-39`, `src/lib/service.ts:221-288`, `src/store.ts:621-720`, `src/screens/CreateRoom.tsx`, `src/screens/RoomSettings.tsx`

| Operation | Implementation |
|-----------|----------------|
| **Create** | `Service.createRoom(name, memberIds[])` → RPC `create_room` → returns roomId |
| **Members** | `room_members` table: `user_id`, `role` (owner|admin|member), `status` (invited|joined), `invited_by` |
| **Invite** | `Service.inviteToRoom(roomId, userId)` → RPC `invite_to_room` |
| **Accept/Decline** | `Service.respondRoomInvite(roomId, accept)` → RPC `respond_room_invite` |
| **Remove** | `Service.removeRoomMember(roomId, userId)` → RPC `remove_room_member` (owner/admin only) |
| **Leave** | `Service.leaveRoom(roomId)` → RPC `leave_room` |
| **Rename** | `Service.renameRoom(roomId, name)` → RPC `rename_room` (owner only) |
| **Promote/Demote** | `Service.setRoomRole(roomId, userId, 'admin'|'member')` → RPC `set_room_role` (owner only) |
| **Delete** | `Service.deleteRoom(roomId)` → RPC `delete_room` (owner only) |
| **History** | Full message history loaded on `openRoom` via `fetchRoomMessages` |
| **Roles** | `owner` (creator), `admin`, `member` — enforced by RPCs |
| **Owner assumptions** | Owner cannot be removed/demoted; only owner can delete room |

**UI Flows:**
- `CreateRoom` screen: name + pick from `myMatches()` (store.ts:779)
- `RoomSettings`: owner sees rename, invite, promote/demote, remove, delete; admin sees invite, remove members; member sees leave

---

## 8. REACT-NATIVE-CHAT — PUBLIC CONTRACT

**Evidence:** `src/Models.ts`, `src/types.ts`, `src/Chat/index.tsx`, `README.md`

### 8.1 IMessage Mapping (Consumer → Library)

| Field | Required | Notes |
|-------|----------|-------|
| `_id` | Yes | String or number; consumer generates via `messageIdGenerator` |
| `text` | Yes | Empty string allowed if `isTextOptional` |
| `createdAt` | Yes | `Date` or timestamp (ms) |
| `user` | Yes | `{ _id, name?, avatar? }` — `_id` used for `fromMe` |
| `image` | No | URL string |
| `video` | No | URL string |
| `videoNote` | No | Boolean — renders as round video |
| `audio` | No | URL string |
| `duration` | No | Seconds — shown before decode |
| `system` | No | Boolean — renders via `renderSystemMessage` |
| `sent` | No | Boolean — single tick |
| `received` | No | Boolean — double tick (delivered) |
| `pending` | No | Boolean — clock spinner |
| `streaming` | No | Boolean — AI caret |
| `quickReplies` | No | `{ type: 'radio'|'checkbox', values: Reply[], keepIt? }` |
| `replyMessage` | No | Shallow copy: `_id, text, user, audio, image` |
| `reactions` | No | `MessageReaction[]` — `{ emoji, userIds[] }` |
| `location` | No | `{ latitude, longitude }` |

### 8.2 Customization Props (Consumer Overrides)

| Category | Props / Hooks |
|----------|---------------|
| **Bubble** | `renderBubble`, `renderMessageText`, `renderMessageImage`, `renderMessageVideo`, `renderMessageAudio`, `renderMessageLocation`, `renderCustomView`, `isCustomViewBottom` |
| **Message Row** | `renderMessage` (entire row), `onPressMessage`, `onLongPressMessage`, `isMessageGestureEnabled` |
| **Composer** | `renderInputToolbar`, `renderComposer`, `renderSend`, `renderActions`, `renderAccessory`, `textInputProps`, `audioRecording`, `videoRecording`, `onPressEmoji` |
| **Context Menu** | `messageActions` (array or fn(message) → `MessageMenuItem[]`) |
| **Reactions** | `reactions: { isEnabled, emojis[], onReactionPress, renderReactions, renderReactionPicker, containerStyle, reactionStyle, reactionActiveStyle, reactionTextStyle, reactionCountStyle, pickerContainerStyle, pickerEmojiStyle }` |
| **Reply** | `reply: { swipe: { isEnabled, direction, onSwipe, renderAction, actionContainerStyle }, previewStyle, messageStyle, message (controlled), onClear, onPress, renderPreview, renderMessageReply }` |
| **Day Separator** | `renderDay`, `dateFormat`, `dateFormatCalendar`, `isDayAnimationEnabled` |
| **Avatars** | `renderAvatar`, `isUserAvatarVisible`, `isAvatarVisibleForEveryMessage`, `isAvatarOnTop`, `onPressAvatar`, `onLongPressAvatar` |
| **Load Earlier** | `loadEarlierMessagesProps: { isAvailable, onPress, isLoading, isInfiniteScrollEnabled, label, containerStyle, wrapperStyle, textStyle, activityIndicatorStyle, activityIndicatorColor, activityIndicatorSize }`, `renderLoadEarlier` |
| **Typing** | `isTyping`, `renderTypingIndicator`, `typingIndicatorStyle`, `renderFooter` |
| **Scroll to Bottom** | `isScrollToBottomEnabled`, `scrollToBottomComponent`, `scrollToBottomOffset`, `scrollToBottomStyle`, `scrollToBottomContentStyle` |
| **Theming** | `theme`, `darkTheme` (deep-merged tokens: colors, radii, spacing, typography, avatar, sendButton, composer, voice), `icons` (override registry), `labels` (i18n), `locale`, `colorScheme` |
| **List Engine** | `isFlashListEnabled`, `listProps` (FlatList/FlashList props) |
| **Keyboard** | `keyboardAvoidingViewProps`, `keyboardProviderProps`, `enableKeyboardProvider`, `enableGestureHandlerRootView` |

---

## 9. CUSTOMIZATION DEPTH (ReactNativeChat)

| Component | Customizable? | Mechanism |
|-----------|---------------|-----------|
| **Bubble** | ✅ Full | `renderBubble` + per-content render props |
| **Message Row** | ✅ Full | `renderMessage` (entire Item) |
| **Text** | ✅ | `renderMessageText` + `messageTextProps` (markdown, link matchers) |
| **Composer** | ✅ Full | `renderInputToolbar`, `renderComposer`, `renderSend`, `renderActions`, `renderAccessory` |
| **Actions (attachment)** | ✅ | `actions[]` + `AttachmentSheet` (grid/list, icons, colors) |
| **Context Menu** | ✅ | `messageActions` (array/fn) → `ContextMenu` (Modal-based, themed) |
| **Reaction Picker** | ✅ | `reactions.renderReactionPicker` (full emoji browser) |
| **Reply Preview** | ✅ | `reply.renderPreview`, `reply.previewStyle` |
| **Reply in Bubble** | ✅ | `reply.messageStyle`, `reply.renderMessageReply` |
| **Media** | ✅ | `renderMessageImage/Video/Audio/Location` |
| **Voice** | ✅ | `audioRecording` prop (needs `expo-audio`); `VoiceMessageInput` internal |
| **System Messages** | ✅ | `renderSystemMessage` |
| **Day Separator** | ✅ | `renderDay` (receives `isAnimated` for sticky header) |
| **Avatars** | ✅ | `renderAvatar`, visibility props |
| **Load Earlier** | ✅ | `renderLoadEarlier`, `loadEarlierMessagesProps` |
| **Typing** | ✅ | `renderTypingIndicator`, `renderFooter` |
| **Colors** | ✅ | `theme`/`darkTheme` tokens (deep merge) |
| **Typography** | ✅ | `theme.typography` tokens |
| **Icons** | ✅ | `icons` registry (Lucide defaults, SVG optional) |
| **Locales** | ✅ | `locale` + `labels` override (built-in: en, es, fr, de, ru) |

**Limitations:**
- No hook access to internal state (messages, scroll, etc.) — `ChatContext` only exposes theme/locale/icons/labels/actionSheet
- `messageIdGenerator` is only injection point for IDs
- No plugin system for new message types (must use `renderCustomView` or `isCustomViewBottom`)

---

## 10. REPLY

### 10.1 ReactNativeChat

**Evidence:** `src/components/ReplyPreview.tsx`, `src/components/MessageReply.tsx`, `src/Chat/index.tsx:155-178`, `src/Bubble/index.tsx:499-527`, `README.md:644-758`

| Aspect | Implementation |
|--------|----------------|
| **Gesture** | Swipe (left/right configurable) via `ReanimatedSwipeable` (react-native-gesture-handler) |
| **Preview** | Animated banner above composer (`ReplyPreview`) — expands/collapses with Reanimated |
| **Data Structure** | `ReplyMessage { _id, text, user, image?, audio? }` attached to outgoing message |
| **In-bubble Render** | `MessageReply` component — shows sender name, text, image; tappable to scroll |
| **Nested Replies** | Not supported — single level only |
| **Deleted Replied Msg** | Not handled — `replyMessage` is shallow copy, survives original deletion |
| **Controlled/Uncontrolled** | Both: `reply.message` prop (controlled) or internal state (uncontrolled) |

### 10.2 CircleRN / Marketplace

- **Not implemented** in either donor.

---

## 11. REACTIONS

### 11.1 ReactNativeChat

**Evidence:** `src/Models.ts:43-48`, `src/Reactions/MessageReactions.tsx`, `src/Reactions/ReactionPicker.tsx`, `src/Bubble/index.tsx:599-645`, `README.md:878-950`

| Aspect | Implementation |
|--------|----------------|
| **Model** | `MessageReaction { emoji: string, userIds: (string|number)[] }` on `IMessage.reactions[]` |
| **Quick Picker** | 6 emojis default (`👍❤️😂😮😢👎`); configurable via `reactions.emojis` |
| **Full Picker** | Optional via `reactions.renderReactionPicker` (consumer provides) |
| **Representation** | One pill per emoji; shows count; active state for current user |
| **Toggle** | `onReactionPress(message, emoji)` — consumer implements toggle logic (README example) |
| **Persistence** | Consumer responsibility — library only renders `reactions` array on message |
| **UI** | Pills below bubble; long-press opens quick picker (Modal) |

### 11.2 CircleRN / Marketplace

- **Not implemented** in either donor.

---

## 12. LONG-PRESS ACTIONS

### 12.1 ReactNativeChat

**Evidence:** `src/Models.ts:6-14`, `src/Bubble/index.tsx:86-93`, `src/components/ContextMenu.tsx`, `src/components/AttachmentSheet.tsx`

| Action | Built-in | Consumer-Provided |
|--------|----------|-------------------|
| **Copy** | ❌ | ✅ via `messageActions` |
| **Reply** | ✅ Swipe gesture | ✅ via `messageActions` |
| **Forward** | ❌ | ✅ via `messageActions` |
| **Edit** | ❌ | ✅ via `messageActions` |
| **Delete** | ❌ | ✅ via `messageActions` (destructive) |
| **Star/Pin** | ❌ | ✅ via `messageActions` |
| **Custom** | ❌ | ✅ via `messageActions` (any `MessageMenuItem`) |

**Mechanism:** Long-press → `ContextMenu` (Modal) anchored to bubble. If `reactions.enabled`, reactions pill renders above actions.

### 12.2 CircleRN / Marketplace

- **Not implemented** — no long-press context menu in either.

---

## 13. MEDIA / VOICE

### 13.1 ReactNativeChat

**Evidence:** `src/Models.ts:109-149`, `src/components/VoiceMessageInput.tsx`, `src/components/VideoNoteRecorder.tsx`, `src/components/WaveformPlayer.tsx`, `src/MessageAudio.tsx`, `src/MessageVideo.tsx`, `src/MessageImage.tsx`, `src/components/AttachmentSheet.tsx`

| Media Type | UI Provided | Consumer Responsibility | Native Dependency |
|------------|-------------|------------------------|-------------------|
| **Photo** | ✅ `MessageImage` (zoomable) | Upload/hosting | None |
| **Video** | ✅ `MessageVideo` (expo-video) | Upload/hosting | `expo-video` (optional peer) |
| **Video Note** | ✅ Round preview + recorder | Upload/hosting | `react-native-vision-camera` (optional) |
| **Audio** | ✅ `MessageAudio` (basic) | Upload/hosting | None |
| **Voice Note** | ✅ `WaveformPlayer` (waveform + scrub + speed) | Upload/hosting | `react-native-audio-api` (optional) |
| **Voice Recorder** | ✅ `VoiceMessageInput` (hold, slide cancel/lock) | Upload/hosting | `expo-audio` (optional) |
| **Video Recorder** | ✅ `VideoNoteRecorder` (round, flip, torch, pause) | Upload/hosting | `react-native-vision-camera` (optional) |
| **Attachments** | ✅ `AttachmentSheet` (grid/list, icons) | Custom actions in `actions[]` | `@lodev09/react-native-true-sheet` (optional, for native bottom sheet) |
| **Location** | ✅ `MessageLocation` (map card → system maps) | None | `react-native-maps` (optional) |

**Key Architecture:**
- All media upload/hosting is **consumer responsibility** — library only renders URLs
- Recorders return local `uri` + `duration`; consumer must upload and send final URL
- Optional peers: features gracefully hide when dependency missing
- Waveform decoding via `react-native-audio-api` (web-compatible)

### 13.2 CircleRN / Marketplace

- **No media support** — text-only in both donors.

---

## 14. PAGINATION / SCROLL

### 14.1 ReactNativeChat

**Evidence:** `src/MessagesContainer/index.tsx`, `src/LoadEarlierMessages.tsx`, `README.md:598-610`

| Feature | Implementation |
|---------|----------------|
| **List Engine** | `FlatList` (default) or `FlashList` v2 (opt-in `isFlashListEnabled`) |
| **Load Earlier** | `loadEarlierMessagesProps { isAvailable, onPress, isLoading, isInfiniteScrollEnabled }` — button at top (inverted) or bottom |
| **Infinite Scroll** | `isInfiniteScrollEnabled` auto-triggers `onPress` on scroll to top (FlashList only) |
| **Scroll Preservation** | `maintainVisibleContentPosition` via `listProps` (for AI streaming) |
| **Prepend Older** | `Chat.prepend()` / `MessagesContainer` handles inverted list |
| **New Message While Scrolled** | Auto-scroll if near bottom (`scrollToBottomOffset` threshold); `ScrollToBottom` button appears when scrolled up |
| **Inverted** | Default `isInverted={true}` (newest at bottom visually) |
| **Keyboard** | `react-native-keyboard-controller` provider; `KeyboardAvoidingView` with measured offset |

### 14.2 CircleRN

**Evidence:** `src/screens/Chat.tsx:69-84`, `src/screens/RoomChat.tsx:53-68`

| Feature | Implementation |
|---------|----------------|
| **List Engine** | `ScrollView` (not virtualized) |
| **Pagination** | None — loads all messages via `fetchMessages` / `fetchRoomMessages` |
| **Scroll** | `onContentSizeChange → scrollToEnd` |
| **Keyboard** | `KeyboardAvoidingView` (padding on iOS) |

### 14.3 RealtimeChatMarketplace

**Evidence:** `app/(thread)/[id].tsx:116-123`

| Feature | Implementation |
|---------|----------------|
| **List Engine** | `FlashList` (inverted) |
| **Pagination** | `fetchMessages(threadId, limit=50)` — no load-earlier UI |
| **Scroll** | FlashList `maintainVisibleContentPosition` config |

---

## 15. COMPATIBILITY RISKS (ReactNativeChat)

**Evidence:** `package.json`, `AGENTS.md`, `README.md`

| Dependency | Version | Risk |
|------------|---------|------|
| **React Native** | 0.86.x (peer `*`) | Pinned to Expo SDK 57; New Architecture ready |
| **React** | 19.x (peer `>=18`) | Current on 19.2.3 |
| **Expo** | SDK 57 (example app) | Library works with any Expo SDK ≥ 50 |
| **Reanimated** | 4.x (peer `>=3 \|\| ^4`) | v4.6.0 in example; v3 also supported |
| **Gesture Handler** | 2.x (peer `>=2`) | **v3 breaks** `BaseButton`/`FlatList`/`TextInput`/`Pressable` → `Legacy*`; pinned to 2.x |
| **FlashList** | 2.x (optional peer) | v2 API; v1 not supported |
| **Keyboard Controller** | 1.x (peer `>=1`) | Required for keyboard handling |
| **expo-audio** | Optional peer | Voice recording; not in Expo Go (dev build needed) |
| **expo-video** | Optional peer | Video playback; not in Expo Go |
| **expo-image-picker** | Optional peer | Video recording fallback |
| **vision-camera** | 4.x (optional peer) | Video notes; v5 requires Nitro Modules |
| **react-native-audio-api** | Optional peer | Waveform decoding |
| **react-native-streamdown** | Optional peer | Rich markdown (native, dev build only) |
| **react-native-svg** | Optional peer | Icons (fallback to View-based) |
| **@lodev09/react-native-true-sheet** | Optional peer | Native bottom sheet for attachments |

**Dev Build Implications:**
- `expo-audio`, `expo-video`, `vision-camera`, `react-native-audio-api`, `react-native-streamdown`, `react-native-svg` → **require dev build / prebuild** (not Expo Go)
- Library works in Expo Go with text/images only (fallback renderers)

---

## 16. TESTS (ReactNativeChat)

**Evidence:** `src/__tests__/*.test.tsx`, `package.json:60`, `tests/setup.ts`

| Area | Test Coverage |
|------|---------------|
| **Reply** | `ReplyPreview.test.tsx`, `MessageReply.test.tsx` |
| **Reactions** | Not directly tested (UI integration) |
| **Media** | `MessageImage.test.tsx`, `MessageVideo` not tested, `MessageAudio` not tested |
| **Composer** | `Composer.test.tsx`, `InputToolbar.test.tsx`, `ComposerSubmit.test.tsx` |
| **Keyboard** | `useKeyboardVerticalOffset.test.tsx` |
| **Pagination** | `LoadEarlier.test.tsx` |
| **Context Menu** | Not directly tested |
| **Bubble** | `Bubble.test.tsx` |
| **Message** | `Message.test.tsx` |
| **FlashList** | `MessagesContainerFlashList.test.tsx`, `MessagesContainerFlashListMissing.test.tsx` |
| **Day Separators** | `Day.test.tsx`, `DayAnimated.test.tsx` |
| **Link Parsing** | `linkParser.test.tsx` |
| **RTL** | `rtl.test.ts` |
| **Utils** | `utils.test.ts` |
| **i18n** | `i18n.test.ts`, `dayjsLocales.test.ts` |
| **Constants** | `Constant.test.tsx` |
| **Send** | `Send.test.tsx` |

**Run Command:** `yarn test` (Jest + @testing-library/react-native v14)

---

## 17. LICENSE BOUNDARY

| Donor | License | Code Eligibility |
|-------|---------|------------------|
| **ReactNativeChat** | MIT (Copyright 2019 Farid Safi, 2026 Kesha Antonov) | ✅ **Fully eligible** — can copy, modify, embed, commercialize |
| **CircleRN** | Not specified in repo (no LICENSE file) | ⚠️ **Uncertain** — assume proprietary / internal; treat as reference only |
| **RealtimeChatMarketplace** | Not specified | ❌ **REFERENCE-ONLY** per instructions — no code copying |

**Action:** Only ReactNativeChat code can be directly adopted. CircleRN patterns can be reimplemented. Marketplace schema/logic is reference only.

---

## 18. FINAL CAPABILITY MATRIX

| Capability | ReactNativeChat | CircleRN | Marketplace |
|------------|-----------------|----------|-------------|
| **Conversation List** | N/A (UI only) | PROVEN | PROVEN |
| **Direct Thread** | N/A | PROVEN | PROVEN (per listing) |
| **Canonical Direct Uniqueness** | N/A | UNCERTAIN (RPC-dependent) | PROVEN (DB unique constraint) |
| **Group Thread** | N/A | PROVEN | N/A |
| **Group Membership** | N/A | PROVEN | N/A |
| **Group Roles** | N/A | PROVEN (owner/admin/member) | N/A |
| **Text Message** | PROVEN | PROVEN | PROVEN |
| **Message Identity** | PROVEN (client-gen) | PARTIAL (local- prefix optimistic) | PROVEN (client-gen UUID) |
| **Realtime** | N/A | PROVEN (postgres_changes) | PROVEN (postgres_changes + Broadcast) |
| **Optimistic Send** | N/A (consumer) | PROVEN | PROVEN |
| **Retry** | N/A | ABSENT (swallowed) | PARTIAL (alert + remove) |
| **Duplicate Prevention** | N/A | ABSENT | PARTIAL (store dedup by ID) |
| **Unread** | N/A | PROVEN (conversation-level) | PROVEN (per-message read_at + count) |
| **Mark Read** | N/A | PROVEN (open clears) | PROVEN (explicit + auto) |
| **Typing** | PROVEN (UI + prop) | ABSENT | PROVEN (Broadcast) |
| **Reply** | PROVEN (swipe + preview) | ABSENT | ABSENT |
| **Reactions** | PROVEN (pills + picker) | ABSENT | ABSENT |
| **Copy** | PARTIAL (via actions) | ABSENT | ABSENT |
| **Forward** | PARTIAL (via actions) | ABSENT | ABSENT |
| **Edit** | PARTIAL (via actions) | ABSENT | ABSENT |
| **Delete** | PARTIAL (via actions) | ABSENT | ABSENT |
| **Star** | PARTIAL (via actions) | ABSENT | ABSENT |
| **Pin** | PARTIAL (via actions) | ABSENT | ABSENT |
| **System Message** | PROVEN | ABSENT | PROVEN (kind='system') |
| **Photo** | PROVEN | ABSENT | PARTIAL (kind='image', attachment_url) |
| **Video** | PROVEN | ABSENT | ABSENT |
| **File Attachment** | PARTIAL (via actions) | ABSENT | ABSENT |
| **Voice** | PROVEN (record + waveform) | ABSENT | ABSENT |
| **Pagination** | PROVEN (load earlier + infinite) | ABSENT | PARTIAL (limit only) |
| **Scroll Preservation** | PROVEN (maintainVisibleContentPosition) | ABSENT | PARTIAL (FlashList config) |
| **Keyboard Handling** | PROVEN (keyboard-controller) | PARTIAL (KeyboardAvoidingView) | PARTIAL (KeyboardAvoidingView) |
| **Search** | ABSENT | ABSENT | ABSENT |
| **Tests** | PROVEN (Jest suite) | ABSENT | ABSENT |

---

## STRENGTHS / WEAKNESSES / ASSUMPTIONS / OPEN QUESTIONS

### ReactNativeChat
| Category | Notes |
|----------|-------|
| **Strengths** | Complete UI kit; streaming AI; reactions; reply; voice/video recording; theming; FlashList; TypeScript; MIT license; active maintenance |
| **Weaknesses** | No backend logic; no persistence; no search; no edit/delete built-in; optional peers require dev build; no nested replies |
| **Assumptions** | Consumer owns send pipeline, ID generation, reconciliation, retry, duplicate prevention |
| **Open Questions** | How to integrate with HOMePLUS message ID scheme? Will `expo-audio`/`vision-camera` be in HOMePLUS dev build? |

### CircleRN
| Category | Notes |
|----------|-------|
| **Strengths** | Real Supabase backend; realtime works; rooms with roles/invites; match→direct flow; push notifications |
| **Weaknesses** | No media; no reactions; no reply; no edit/delete; no pagination (loads all); swallow errors; no retry; duplicate risk on realtime echo; no typing; no message-level read receipts |
| **Assumptions** | `act_on_profile` RPC enforces direct uniqueness; `matches` table has canonical ordering |
| **Open Questions** | What is `matches` table schema? Does `create_room` RPC validate member existence? How are push notifications triggered for messages? |

### RealtimeChatMarketplace
| Category | Notes |
|----------|-------|
| **Strengths** | Canonical thread per listing (DB enforced); per-message read receipts; typing via Broadcast; explicit optimistic→reconcile→rollback; FlashList; clean repository pattern |
| **Weaknesses** | No groups; no reactions; no reply; no media upload (only URL); no edit/delete; no pagination UI; mock backend fallback |
| **Assumptions** | Buyer/seller roles fixed per listing; one thread per listing per pair |
| **Open Questions** | How are `chat_threads` created? (Not in repo) What triggers `updated_at`? How are offers resolved? |

---

## CROSS-DONOR SYNTHESIS

| HOMePLUS Need | Best Source | Gap |
|---------------|-------------|-----|
| **UI Components** | ReactNativeChat | Full adoption (MIT) |
| **Conversation Model (Directs)** | Marketplace (schema) + CircleRN (realtime) | Merge: Marketplace canonical uniqueness + CircleRN match flow |
| **Conversation Model (Groups)** | CircleRN | Adopt room_members + roles + invite flow |
| **Message Model** | ReactNativeChat (UI) + Marketplace (DB: kind, read_at, offer) | Extend IMessage with `kind`, `readAt`, `offerAmount`, `editedAt`, `deletedAt` |
| **Send Pipeline** | Marketplace (optimistic→reconcile→rollback) | Adopt pattern; add retry queue |
| **Realtime** | CircleRN (multi-table) + Marketplace (per-thread + typing) | Unified channel manager |
| **Unread/Read** | Marketplace (per-message read_at) + CircleRN (conversation unread) | Per-message read receipts + conversation badge |
| **Typing** | Marketplace (Broadcast) | Adopt |
| **Reply** | ReactNativeChat | Adopt |
| **Reactions** | ReactNativeChat | Adopt |
| **Media/Voice** | ReactNativeChat | Adopt (requires dev build deps) |
| **Pagination** | ReactNativeChat | Adopt |
| **Tests** | ReactNativeChat | Extend for HOMePLUS flows |

---

## VERIFICATION

- All three repos inspected at current HEAD
- No modifications made to any donor repo
- HOMePLUS workspace unchanged
- Output written to `C:\Users\thega\Desktop\HomePlus-donors\_recon\deep\D2_MESSAGING_DONORS_DEEP_RECON.md`

---

**END OF RECON**