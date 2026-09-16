# ReactNativeChat (06_ReactNativeChat) — Tracked File Structure (3–4 levels)

```
.
├── src/ (library source — compiled to lib/ on build)
│   ├── index.ts (public API)
│   ├── types.ts (public types)
│   ├── Models.ts (IMessage, User, QuickReplies, MessageReaction, ReplyMessage)
│   ├── Chat/
│   │   ├── index.tsx (<Chat> top-level component)
│   │   ├── ChatKeyboardAvoidingView.tsx
│   │   ├── styles.ts, types.ts
│   ├── MessagesContainer/
│   │   ├── index.tsx (FlatList/FlashList engine, day headers)
│   │   ├── FlashList.ts
│   │   ├── components/
│   │   │   ├── Item/ (message row)
│   │   │   ├── DayAnimated/ (animated day separators)
│   │   │   └── dayLayout.ts
│   │   ├── styles.ts, types.ts
│   ├── Bubble/
│   │   ├── index.tsx (message bubble)
│   │   ├── styles.ts, types.ts
│   ├── Message/ (IMessage rendering)
│   │   ├── index.tsx, styles.ts, types.ts
│   │   ├── MessageText.tsx, MessageImage.tsx, MessageVideo.tsx
│   │   ├── MessageAudio.tsx, MessageLocation.tsx
│   ├── Reactions/
│   │   ├── index.ts
│   │   ├── MessageReactions.tsx (emoji pills on bubble)
│   │   ├── ReactionPicker.tsx (quick-picker + full picker)
│   │   ├── types.ts
│   │   └── DEFAULT_REACTION_EMOJIS
│   ├── Reply/
│   │   ├── index.ts (swipe-to-reply, reply preview)
│   │   └── types.ts
│   ├── Composer.tsx (input toolbar, attachments, voice)
│   ├── InputToolbar.tsx
│   ├── Actions.tsx (long-press context menu)
│   ├── Send.tsx
│   ├── Day/index.tsx (day separator)
│   ├── LoadEarlierMessages.tsx
│   ├── SystemMessage.tsx
│   ├── ChatAvatar.tsx, ChatContext.ts, ChatGestureHandlerRoot.tsx
│   ├── QuickReplies.tsx
│   ├── TypingIndicator/
│   ├── StreamingCursor.tsx (AI streaming)
│   ├── components/
│   │   ├── AttachmentSheet.tsx, MediaCard.tsx, MediaControls.tsx
│   │   ├── ContextMenu.tsx, Icon.tsx, LucideIcon.tsx
│   │   ├── BasicMarkdown.tsx, MarkdownMessageText.tsx
│   │   ├── MessageReply.tsx, ReplyPreview.tsx
│   │   ├── VideoNoteOverlay.tsx, VideoNoteRecorder.tsx
│   │   ├── VideoRecordButton.tsx, VoiceMessageInput.tsx
│   │   ├── WaveformPlayer.tsx, SendIcon.tsx, Ticks.tsx
│   │   ├── TouchableOpacity.tsx, mediaPalette.ts, mediaPlayback.ts
│   ├── hooks/
│   │   ├── useStreamingMessages.ts, useLabels.ts, useTheme.ts
│   │   ├── useHasKeyboardProvider.ts, useIsKeyboardVisible.ts
│   │   ├── useKeyboardVerticalOffset.ts, useUpdateLayoutEffect.ts
│   │   ├── useColorScheme.ts, useIcons.ts, useIsRTL.ts
│   ├── locales/ (i18n: en, es, fr, de, ru, ja, ko, zh, ...)
│   │   └── index.ts
│   ├── dayjsLocales.ts
│   ├── linkParser.tsx
│   ├── rtl.ts, logging.ts, styles.ts, utils.ts
│   ├── Constant.ts, Color.ts, Time.ts, Theme.ts, Icons.ts
│   ├── __tests__/ (colocated Jest tests for each component)
├── example/ (Expo 57 demo app — separate yarn project)
│   ├── app/(tabs)/ (basic, reactions, reply, media, streaming, theming, ...)
│   ├── components/chat-examples/
│   └── example-chat/, example-expo/, example-slack-message/
├── expoSnack/
├── tests/setup.ts (Jest mocks: reanimated, worklets, safe-area)
├── docs/ (MIGRATION.md, STREAMING.md)
├── llms.txt (compact integration guide)
├── package.json (yarn@4.17, MIT, peerDeps for expo-audio, expo-video, vision-camera, ...)
├── tsconfig.json, babel.config.cjs, jest.config.cjs
├── eslint.config.js, .yarnrc.yml
├── CHANGELOG.md, AGENTS.md, README.md, LICENSE (MIT)
└── media/ (screenshots, gifs)
```