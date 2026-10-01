# RealtimeChatMarketplace (08_RealtimeChatMarketplace) — Tracked File Structure (3–4 levels)

```
.
├── app.json (Expo 52, expo-router)
├── package.json (React 18, RN 0.76, Expo 52, Supabase 2.45, Zustand 5, TypeScript 5.3)
├── tsconfig.json
├── app/
│   ├── _layout.tsx
│   ├── index.tsx (thread list)
│   └── (thread)/[id].tsx (chat screen)
├── src/
│   ├── components/
│   │   ├── MessageBubble.tsx
│   │   └── ThreadTile.tsx
│   ├── lib/
│   │   ├── supabase.ts (client + isSupabaseConfigured flag)
│   │   ├── chatRepository.ts (CRUD + realtime subscriptions)
│   │   │   ├── listThreads, fetchMessages
│   │   │   ├── subscribeThread (postgres_changes INSERT)
│   │   │   ├── subscribeTyping (broadcast)
│   │   │   ├── emitTyping, sendText, sendOffer
│   │   │   └── markRead
│   │   └── mockBackend.ts (fallback when Supabase not configured)
│   ├── store/
│   │   └── chatStore.ts (Zustand)
│   ├── demo/
│   │   └── autopilot.ts
│   └── types/
│       └── index.ts (ChatMessage, ChatThread, TypingState)
├── supabase/
│   └── schema.sql (chat_threads, chat_messages tables)
├── screenshots/
├── README.md, LICENSE (none found)
├── .env.example, .gitignore
└── package-lock.json
```