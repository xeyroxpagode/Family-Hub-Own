# Ahlan (01_Ahlan) — Tracked File Structure (3–4 levels)

```
.
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx (home/feed)
│   │   ├── profile.tsx
│   │   ├── search.tsx
│   │   ├── camera.tsx
│   │   └── compose_dummy.tsx
│   ├── compose.tsx
│   ├── edit-post.tsx
│   ├── edit-profile.tsx
│   ├── post/[id].tsx
│   ├── comments/[postId].tsx
│   ├── messages.tsx
│   ├── notifications.tsx
│   ├── settings.tsx
│   ├── user/[username].tsx
│   ├── user-list.tsx
│   ├── story-create.tsx
│   ├── story-viewer.tsx
│   ├── share-post.tsx
│   ├── privacy-policy.tsx
│   └── terms.tsx
├── components/
│   ├── AppBar.tsx, AppBar.utils.ts
│   ├── BottomNavigationBar.tsx, BottomNavigationBar.utils.ts
│   ├── PostCard.tsx
│   ├── PostSkeleton.tsx, PostGridSkeleton.tsx
│   ├── ChatListSkeleton.tsx
│   ├── NotificationSkeleton.tsx
│   ├── UserAvatar.tsx
│   ├── Icons.tsx
│   ├── RenderUserContent.tsx
│   ├── StoryReel.tsx, StoryCreator.tsx
│   ├── FlagContent.tsx, FlagPicker.tsx
│   ├── DatePicker.tsx
│   ├── EdgeCaseUI.utils.ts
│   ├── ErrorBoundary.tsx
│   ├── LoadingStates.tsx
│   ├── gestures.utils.ts
│   ├── native/ (platform-specific variants)
│   │   ├── PostCard.tsx, PostSkeleton.tsx, RenderUserContent.tsx
│   │   ├── StoryCreator.tsx, StoryReel.tsx, Toast.tsx
│   │   ├── Icons.tsx, UserAvatar.tsx
│   ├── screens/ (feature screens)
│   │   ├── CommentsScreen.tsx
│   │   ├── ComposePostScreen.tsx, ComposeMediaPostScreen.tsx
│   │   ├── EditPostScreen.tsx, EditProfileScreen.tsx
│   │   ├── LoginScreen.tsx, SignUpScreen.tsx
│   │   ├── MessagesScreen.tsx, NotificationsScreen.tsx
│   │   ├── PostViewerScreen.tsx
│   │   ├── PhotoEditorScreen.tsx
│   │   ├── ProfileScreen.tsx, SettingsScreen.tsx
│   │   ├── ShareChoiceScreen.tsx, ShareMenu.tsx, ShareScreen.tsx
│   │   ├── StoryCommentsScreen.tsx, StoryCreationScreen.tsx
│   │   ├── StoryEditorScreen.tsx, StoryViewer.tsx
│   │   ├── UserListScreen.tsx, UserProfileScreen.tsx
│   │   ├── VideosScreen.tsx
│   │   └── AiChatScreen.tsx
│   └── tabs/
│       ├── CameraTab.tsx, HomeTab.tsx, ProfileTab.tsx, SearchTab.tsx
├── services/
│   ├── apiService.ts
│   ├── supabase.native.ts
│   ├── realtime.ts (Postgres Changes + Broadcast wrapper)
│   ├── offlineQueue.ts (AsyncStorage-backed FIFO queue with dedupe)
│   ├── storage.ts (AsyncStorage wrapper)
│   ├── notifications.ts
│   ├── fetchGuard.ts, likeGuard.ts, retry.ts
│   ├── analytics.ts, reportReasons.ts, shareIntent.ts, storyUpload.ts
├── store/
│   ├── AppContext.tsx, AppContext.native.tsx (global state)
├── supabase/
│   ├── functions/delete-user-account/index.ts
│   ├── migrations/
│   │   ├── 20260506_add_missing_tables.sql
│   │   ├── 20260506_create_storage_bucket.sql
│   │   └── 20260812_add_rpc_functions.sql
├── src/
│   ├── components/CommentItem.tsx, FollowersList.tsx, PostComposer.tsx
│   └── services/notifications.ts, shareIntent.ts, storyUpload.ts
├── store/ (duplicate at root level)
├── types.ts
├── tailwind.config.ts
├── nativewind-env.d.ts
├── global.css
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── jest.config.js
├── app.json (Expo 54, expo-router)
├── package.json (React 19, RN 0.81, Expo 54, Supabase 2.43, TypeScript 5.9)
├── __tests__/ (60+ test files: unit, integration, component, e2e)
├── scripts/
├── assets/
├── eas.json
├── LICENSE (Apache-2.0)
├── NOTICE
├── README.md
├── CONTRIBUTING.md
└── SECURITY.md
```