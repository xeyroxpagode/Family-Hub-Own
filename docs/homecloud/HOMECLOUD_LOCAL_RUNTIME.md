# HOMECLOUD LOCAL RUNTIME

Status: Stage 2 source validation green; Android device acceptance blocked

Date: 2026-09-14

Canonical worktree:

`C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-integration`

Canonical branch:

`homecloud/v1-integration`

Product authority:

`docs/homecloud/HOMECLOUD_PRODUCT_EXPERIENCE_FREEZE_V1_3.md`

## Boundaries

- HomeCloud keeps two semantic roles: FILE and MEMORY.
- MIME type does not decide product intent.
- The upload engine is shared by FILE and MEMORY.
- Backend storage authority stays server-side.
- Do not add public buckets, broad storage policies, or client-side storage authority.
- Do not use the protected primary worktree for Stage 2 runtime work.

## Local Services

Local Supabase is expected on the host loopback ports printed by `supabase status`.

The Android emulator reaches the host through ADB reverse rules. The relevant rules are:

- `tcp:56221` for local Supabase API.
- `tcp:3004` for the backend API.
- `tcp:8081` for the canonical integration Metro server.

The frontend `.env` may use Android runtime origins such as `http://10.0.2.2:56221`. The upload engine normalizes signed upload URL origins at runtime while preserving the signed path and query string exactly.

## Verified Commands

Run from the repository root unless noted.

```powershell
node scripts/homecloud_2a_upload_job_tests.js
node scripts/homecloud_2c_memory_intake_tests.js
npx tsc --noEmit -p front\mi-front-limpio\tsconfig.json
node tests/run.js homecloud-2a
node tests/run.js homecloud-2c
node tests/run.js backend
node tests/static/migration-uniqueness.js
git diff --check
```

Run from `front\mi-front-limpio`:

```powershell
npx expo-doctor
npx expo install --check
npx expo lint --no-cache
```

Observed result on 2026-09-14:

- HomeCloud 2A passed.
- HomeCloud 2C passed.
- Backend suite passed.
- Migration uniqueness passed.
- TypeScript passed.
- Expo Doctor passed.
- Expo install check passed.
- Expo lint exited with 0 errors and repository warnings outside this HomeCloud closure.

## Android Runtime State

The installed Android app did not reach the HomeCloud runtime during this closure. It failed during native React Native bootstrap before the HomeCloud screens could be exercised.

Observed logcat failure:

```text
TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found
AppRegistryBinding::startSurface failed. Global was not installed.
```

A disposable generated native runtime worktree was used for rebuild attempts:

`C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-android-runtime`

Rebuild attempts failed in native CMake/Ninja under the long Windows path, including:

```text
ninja: error: manifest 'build.ninja' still dirty after 100 tries
```

Because of this, real Android FILE, IMAGE, VIDEO, and restart-resume acceptance remains pending.

## Runtime Fixes Included In Source

- Native Expo FileSystem upload transport for Android local file URIs.
- Signed upload URL origin normalization for emulator runtime origins.
- Durable local artifact copy before upload job creation.
- AsyncStorage-backed upload job persistence with a live in-memory mirror.
- Initial folder contribution support using product-safe payload authority.
- Raw React Native text prevention in `AppButton`.

## Safety Notes

- No remote Supabase database mutation is part of this runbook.
- No remote Storage mutation is part of this runbook.
- No finance data mutation is part of this runbook.
- Do not use destructive git operations to recover Stage 2 state.
