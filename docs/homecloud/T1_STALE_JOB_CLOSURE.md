# HomeCloud T1 — Stale job closure (DEV notes)

## 1. Stale server-lifecycle contract

`homecloud_not_staging` is a **domain refusal**, never a transient condition.
The backend raises it when `homecloud_contents.lifecycle !== 'staging`
(`backend/src/services/homecloudIntakeService.js:378` upload authorization,
`:444` verify, `:565` finalize), i.e. the content already left intake.

| Situation | Client behaviour |
|---|---|
| Content is `active` | One bounded `finalize` read-back returns 200 → the job reconciles to `completed` and releases its workspace bytes |
| Content is `trashed` / absent / foreign | `finalize` refuses again → job is `failed`, `error.retryable = false`, artifact preserved |
| Either way | Never auto-retried: not in the same pump, not in the next, not on remount, not on reconnect |

`finalize` is the **existing** idempotent read-back (no backend change): an
`active` content replays finalize as 200 with the content DTO, and a binary
finalize re-checks that the original exists before flipping the lifecycle. A
content that is `active` therefore has its bytes on storage. Completion is
**never** inferred from receiving the 409 itself.

## 2. Why the legacy rows are left alone

Jobs created before this latch are historical data of the broken build. They are
draining on their own and must not be deduplicated against server contents by
name/size: two legitimate contents may share a name and a size.

## 3. DEV-ONLY cleanup of old terminal rows (exact procedure)

Only needed for local QA. **Never** run any of the following against a real
household:

- ❌ `AsyncStorage.clear()` — it wipes auth/session keys too.
- ❌ Deleting the auth/session keys.
- ❌ Deleting recoverable uploads or the durable workspace
  (`homecloud-upload-jobs/pending_*/`) while its job is not terminal.

Safe procedure (dev/local QA only):

1. Close the app.
2. In the dev build, run the app once so the queue is hydrated, then confirm in
   logs that the rows you want gone are `state = failed` with
   `error.retryable !== true` (terminal). Anything else must be left alone.
3. Remove **only** the `homecloud:upload-job:<jobId>` keys of those terminal
   rows, one by one, via the dev tools' storage inspector. Do not clear the
   namespace.
4. Reopen the app. The remaining jobs drain FIFO through the household
   coordinator; nothing stale is re-selected.

If a terminal row's job is still wanted for inspection, keep it: a terminal
`failed` job is inert (never eligible) and cannot block the queue.

## 4. Evidence

- `scripts/homecloud_t1_stale_job_tests.ts` (suite `homecloud-t1-stale-job`).
- Regression suites: `homecloud-recovery`, `homecloud-4c1` (S0 gallery + modal
  host + Stage A1 + 4C1 + 2A/2C structure), `frontend-typecheck`.
