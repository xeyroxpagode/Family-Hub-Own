# Framez (04_Framez) — Tracked File Structure (3–4 levels)

```
.
├── app.json (Expo 54, expo-router)
├── package.json (React 19, RN 0.81, Expo 54, Supabase 2.81, TypeScript 5.9)
├── tsconfig.json
├── tailwind.config.js
├── nativewind-env.d.ts
├── global.css
├── babel.config.js
├── metro.config.js
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── feed.tsx (main feed with ranking algorithm)
│   │   ├── explore.tsx
│   │   ├── create.tsx
│   │   ├── notifications.tsx
│   │   ├── profile.tsx
│   │   └── user-profile.tsx
│   ├── post/[id].tsx
│   ├── post/_layout.tsx
│   ├── user/[id].tsx
│   └── user/_layout.tsx
├── lib/
│   └── supabase.ts
├── types/
│   └── database.ts
├── assets/
├── eas.json
├── README.md
├── LICENSE (none found)
├── .gitignore
├── .easignore
├── create-icons.js
└── package-lock.json
```