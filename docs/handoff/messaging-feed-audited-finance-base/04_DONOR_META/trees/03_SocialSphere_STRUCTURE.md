# SocialSphere (03_SocialSphere) — Tracked File Structure (3–4 levels)

```
.
├── app.json (Expo 57, expo-router)
├── package.json (React 19, RN 0.86, Expo 57, Supabase 2.110, TypeScript 6.0)
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── signup.tsx
│   │   │   └── onboarding.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx (feed)
│   │   │   └── profile.tsx
│   ├── components/
│   │   └── color-picker.ios.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   └── usePosts.ts (feed, createPost, 24h expiry)
│   ├── lib/
│   │   ├── date-helper.ts
│   │   ├── supabase/
│   │   │   ├── client.ts (AsyncStorage-backed client)
│   │   │   └── storage.ts (uploadPostImage)
│   ├── scripts/
│   │   └── seed.ts
├── assets/
├── eas.json
├── eslint.config.js
├── LICENSE (MIT — Expo copyright)
├── README.md
├── AGENTS.md
├── CLAUDE.md
└── .gitignore
```