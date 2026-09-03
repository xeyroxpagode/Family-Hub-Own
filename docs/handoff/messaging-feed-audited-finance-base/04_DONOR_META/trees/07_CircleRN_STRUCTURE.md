# CircleRN (07_CircleRN) — Tracked File Structure (3–4 levels)

```
.
├── App.tsx (entry)
├── index.ts
├── app.json (Expo 57)
├── package.json (React 19, RN 0.86, Expo 57, Supabase 2.110, Zustand 5, TypeScript 6.0)
├── tsconfig.json, babel.config.js, eas.json
├── src/
│   ├── RootView.tsx
│   ├── store.ts (Zustand: conversations, members, messages, photos, pending)
│   ├── theme.tsx (serif/grotesk fonts, palette, useTheme)
│   ├── types.ts (ChatMessage, Member, Photo, Report, Notification)
│   ├── components/
│   │   ├── ui.tsx (Text, Pressed, ProfilePhoto, TextInput, Badge, Avatar, ...)
│   │   ├── AnimatedSplash.tsx
│   │   ├── BannerHost.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── PhotoGrid.tsx
│   │   └── ui.tsx
│   ├── screens/
│   │   ├── Auth.tsx, Onboarding.tsx
│   │   ├── MainTabs.tsx (Today, Rooms, Chat, Profile)
│   │   ├── Today.tsx (daily prompt)
│   │   ├── Rooms.tsx (list + create)
│   │   ├── CreateRoom.tsx
│   │   ├── RoomChat.tsx (group chat)
│   │   ├── RoomSettings.tsx
│   │   ├── Chat.tsx (1:1 chat with composer)
│   │   ├── MatchMoment.tsx
│   │   ├── Messages.tsx (inbox)
│   │   ├── Invites.tsx
│   │   ├── LikeComposer.tsx
│   │   ├── Profile.tsx, ProfileDetail.tsx
│   │   └── EditProfile.tsx
│   ├── lib/
│   │   ├── supabase.ts (client + helpers)
│   │   ├── service.ts (API calls)
│   │   ├── report.ts
│   │   ├── notifications.ts
│   │   └── useKeyboard.ts
│   └── data.ts (mock/seed data)
├── assets/
├── LICENSE (MIT — Expo copyright)
├── README.md, AGENTS.md, CLAUDE.md, HANDOFF.md
├── .gitignore, .mcp.json, .claude/settings.json
└── package-lock.json
```