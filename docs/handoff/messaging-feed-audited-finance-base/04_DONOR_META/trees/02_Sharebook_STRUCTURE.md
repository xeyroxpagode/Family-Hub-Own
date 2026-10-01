# Sharebook (02_Sharebook) — Tracked File Structure (3–4 levels)

```
.
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── signUp.tsx
│   ├── welcome.tsx
│   ├── (main)/
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── editProfile.tsx
│   │   ├── newPosts.tsx
│   │   ├── notifications.tsx
│   │   ├── postDetails.tsx
│   │   └── profile.tsx
├── components/
│   ├── PostCard.tsx
│   ├── CommentItem.tsx
│   ├── Avatar.tsx
│   ├── Button.tsx, Input.tsx, Loading.tsx
│   ├── Header.tsx, BackButton.tsx
│   ├── ScreenWrapper.tsx
│   ├── NotificationItem.tsx
│   ├── RichTextEditor.tsx (react-native-pell-rich-editor)
│   └── icons/ (JSX icon components)
├── services/
│   ├── postService.tsx (CRUD, likes, comments)
│   ├── userService.tsx
│   ├── imageService.tsx (upload, download)
│   ├── notificationService.tsx
│   └── provinceService.tsx
├── contexts/
│   └── AuthContext.tsx
├── helpers/
│   └── common.ts (formatting, supabase URLs)
├── constants/
│   ├── index.ts, theme.ts
├── lib/
│   └── supabase.ts
├── assets/
│   ├── images/, fonts/, icons/
├── android/ (native Android project)
├── patches/ (patch-package patches)
├── scripts/
├── app.json (Expo 52, expo-router)
├── package.json (React 18, RN 0.76, Expo 52, Supabase 2.48, TypeScript 5.3)
├── tsconfig.json
├── eas.json
├── LICENSE (MIT)
├── README.md
├── .gitignore
└── package-lock.json
```