# HOMECLOUD STAGE 3 HANDOFF

Status: Source-ready for Stage 3 planning; Stage 2 Android acceptance blocked

Date: 2026-09-14

Canonical worktree:

`C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-integration`

Canonical branch:

`homecloud/v1-integration`

## Stage 2 Closure State

Stage 2 source defects were fixed and automated local validation is green.

The final Stage 2 product acceptance is not closed because the Android binary failed native bootstrap before HomeCloud runtime screens could be tested on device. Stage 3 should not assume Android FILE, IMAGE, VIDEO, or restart-resume acceptance has been proven until a native rebuild/install succeeds and those flows are exercised.

## Fixed For Stage 2

- FILE and MEMORY now share an Android-capable upload transport.
- Upload jobs persist through AsyncStorage instead of only in process memory.
- Picked artifacts are copied to a durable app document workspace before upload jobs are registered.
- Signed upload URLs can be used from Android emulator runtime origins without changing signed path or query authority.
- Initial Folder contribution sends folder intent through the upload job and backend validation path.
- The raw text invariant in HomeCloud failure controls is fixed through the shared button primitive and direct intake screens.

## Pending Before Final Stage 2 Acceptance

- Install a rebuilt Android binary that reaches the React Native runtime.
- Verify FILE upload on Android:
  - select an artifact;
  - register upload;
  - upload bytes;
  - verify;
  - finalize;
  - confirm content appears in HomeCloud.
- Verify MEMORY image upload on Android.
- Verify MEMORY video upload on Android.
- Verify restart/resume using a persisted upload job and durable artifact URI.
- Verify scanner intake if scanner is in the intended Stage 2 acceptance scope.
- Verify audio intake if audio is in the intended Stage 2 acceptance scope.
- Verify batch intake if batch is in the intended Stage 2 acceptance scope.

## Recommended Next Runtime Path

The generated native worktree at the normal desktop path hit Windows native-build path issues. Prefer one of these options:

- Create a real short-path copy such as `C:\hcrt` and run the native Android build there.
- Use a Linux or WSL-based native build path if the Android toolchain is already healthy there.
- Use a clean generated native worktree only after preserving the source patch in the canonical integration branch.

Do not use a junction as the short path workaround; Gradle and CMake resolved the real long path during this closure.

## Stage 3 Readiness

Stage 3 can begin from the canonical branch after acknowledging the Android acceptance block. The likely Stage 3 starting points are:

- richer organization flows for folders and albums;
- reuse of canonical HomeCloud content across HomePlus;
- stronger search and retrieval;
- family-facing polish around contribution history and content status.

Stage 3 should keep these product constraints intact:

- FILE and MEMORY remain the only semantic roles.
- MIME type remains storage/media metadata, not user intent.
- Postgres remains semantic authority.
- Storage remains server-authorized.
- Client code must not gain broad bucket or path authority.

## Handoff Checklist

- Read `docs/homecloud/HOMECLOUD_PRODUCT_EXPERIENCE_FREEZE_V1_3.md`.
- Read `docs/homecloud/HOMECLOUD_LOCAL_RUNTIME.md`.
- Confirm the local Supabase and backend ports.
- Confirm Android ADB reverse rules for Supabase, backend, and Metro.
- Rebuild and install an Android binary that reaches React Native runtime.
- Run HomeCloud 2A and 2C test suites again after any runtime changes.
- Record device acceptance with exact artifact types and timestamps.
