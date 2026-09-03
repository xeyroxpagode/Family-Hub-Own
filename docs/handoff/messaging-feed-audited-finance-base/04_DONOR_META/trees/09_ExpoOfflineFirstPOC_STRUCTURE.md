# ExpoOfflineFirstPOC (09_ExpoOfflineFirstPOC) — Tracked File Structure (3–4 levels)

```
.
├── app.json (Expo 55, dev-client)
├── package.json (React 19, RN 0.83, Expo 55, Realm 20.2, Zustand 5, TypeScript 5.9)
├── tsconfig.json, metro.config.js, mise.toml
├── index.js (entry + headless task registration)
├── App.tsx
├── src/
│   ├── components/
│   │   ├── OfflineBanner.tsx
│   │   └── PendingBadge.tsx
│   ├── config/
│   │   └── realmConfig.ts (Realm schema + hooks: useRealm, useQuery)
│   ├── features/
│   │   └── offline-queue/
│   │       ├── schema.ts (PendingOperation Realm model)
│   │       ├── types.ts (ActionType enum: CREATE_POST, UPDATE_POST, DELETE_POST, ...)
│   │       └── offlineQueueService.ts (Realm-backed queue + NetInfo-triggered sync)
│   ├── navigation/
│   │   └── AppNavigator.tsx (stack navigator)
│   ├── screens/
│   │   ├── FeedScreen.tsx
│   │   ├── PendingOperationsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/
│   │   └── api.ts (mock backend sync, localhost→10.0.2.2 remap)
│   ├── store/
│   │   ├── uiStore.ts (Zustand: posts, optimistic updates)
│   │   └── queueStore.ts (Zustand: pending count, processing flag)
├── scripts/
│   └── mock-backend/ (TypeScript Express server on port 3001)
│       ├── src/server.ts, users.ts
│       ├── package.json, tsconfig.json
├── android/ (native)
├── ios/ (native)
├── .agents/ (skills: git-commit, github-actions, rn-best-practices, brownfield, upgrading)
├── LICENSE (none found)
├── README.md, AGENTS.md
├── .gitignore, .prettierrc, .gitattributes
├── eslint.config.js, .vscode/
└── yarn.lock
```