# AgoraServer (05_AgoraServer) — Tracked File Structure (3–4 levels)

```
.
├── apps/
│   ├── api/ (Hono backend — Replyke-compatible)
│   │   ├── src/
│   │   │   ├── index.ts (entry)
│   │   │   ├── app.ts (router composition)
│   │   │   ├── instrument.ts (OTel)
│   │   │   ├── db/
│   │   │   │   ├── index.ts (getDb, request-scoped)
│   │   │   │   └── schema/ (Drizzle: entities, comments, chat, spaces, users, projects, auth, secure-chat, events, notifications, ...)
│   │   │   ├── http/
│   │   │   │   ├── context.ts, envelope.ts (paginate), errors.ts (ApiError), deprecation.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts (JWT verify), project.ts, auth-wall.ts, rate-limit.ts, space-rep.ts
│   │   │   ├── routes/ (REST endpoints)
│   │   │   │   ├── entities.ts (feed, CRUD, ranking, filters)
│   │   │   │   ├── comments.ts (threaded, RPC fetch_comment_thread)
│   │   │   │   ├── chat.ts (conversations, messages, reactions, socket.io fanout)
│   │   │   │   ├── auth.ts, users.ts, follows.ts, connections.ts
│   │   │   │   ├── spaces.ts, collections.ts, events.ts
│   │   │   │   ├── notifications.ts, reports.ts, search.ts, public.ts
│   │   │   │   ├── storage.ts, push-notifications.ts, match.ts
│   │   │   │   ├── roles.ts, steward.ts, db.ts (custom tables), admin.ts
│   │   │   ├── realtime/
│   │   │   │   └── socket.ts (socket.io module singleton, emitToConversation)
│   │   │   ├── lib/ (core business logic)
│   │   │   │   ├── shape.ts (row→API model, attachUserReactions, loadUsers)
│   │   │   │   ├── validation.ts (zod schemas from @agora-server/contract)
│   │   │   │   ├── entity-filters.ts, feed-config.ts, ranking.ts, rerank.ts
│   │   │   │   ├── space-access.ts (readingPermission, postingPermission)
│   │   │   │   ├── moderation-visibility.ts (removedPolicy, excludeRemovedSql)
│   │   │   │   ├── notifications.ts (create_notification_safe RPC)
│   │   │   │   ├── tokens.ts (HS256 mint/rotate, refresh_tokens table)
│   │   │   │   ├── embeddings.ts (Voyage 1024d, match_content RPC)
│   │   │   │   ├── storage.ts (provider seam: Supabase Storage | S3/MinIO)
│   │   │   │   ├── images.ts (sharp variants), storage-cleanup.ts
│   │   │   │   ├── social-weather.ts, social-neighborhood.ts, social-constellation.ts
│   │   │   │   ├── project-roles.ts, stewards.ts, steward-notify.ts
│   │   │   │   ├── rate-limit.ts, ssrf.ts, webhooks.ts, mentions.ts
│   │   │   │   ├── push/ (Web Push, FCM, APNs), metrics.ts, telemetry.ts
│   │   │   │   ├── logger.ts (wonder-logger/Pino), operators.ts
│   │   │   │   └── ...
│   │   │   ├── test/integration/ (80+ integration tests against real Postgres)
│   │   │   └── drizzle/ (66 migrations + meta snapshots)
│   │   ├── Dockerfile, crontab, perf/
│   │   └── scripts/ (genesis, seed, migrate, e2e, diag)
│   ├── admin/ (Vite + React + TS admin SPA)
│   │   ├── src/routes/ (Dashboard, Community, Moderation, Steward, SocialAnalytics, Settings)
│   │   └── src/lib/ (api, analytics, moderation, social-kfloor, dirty tracking)
│   └── secure-chat/ (E2E MLS Delivery Service — separate process)
│       ├── src/realtime/secure-socket.ts (socket.io on /secure-socket/)
│       └── src/routes/secure-chat.ts
├── packages/
│   ├── core/ (@agora/core — shared kernel: db, env, logger, redis, middleware, tokens, schema)
│   └── contract/ (@agora-server/contract — shared types, zod, pagination, reactions, social)
├── services/
│   └── scorer/ (Python: moderation + social-graph edges to Neo4j)
├── deploy/
│   ├── proxy/ (Caddy front door), observability/ (Alloy, Grafana, Tempo, Mimir, Loki)
│   └── db/
├── docker-compose.yml / .dev.yml / .prod.yml
├── docs/ (MANIFEST.md, MODELS.md, SECURE_CHAT.md, SOCIAL-GRAPH.md, SUPERPOWERS specs/plans)
├── wiki/
├── pnpm-workspace.yaml, pnpm-lock.yaml
├── package.json (pnpm@10.14, AGPL-3.0-only)
├── LICENSE (AGPL-3.0-only)
├── OSS-LICENSES.txt
├── CHANGELOG.md, ROADMAP.md, CLAUDE.md, CONTRIBUTING.md
└── tsconfig.base.json
```