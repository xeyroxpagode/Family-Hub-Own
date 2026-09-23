# HomePlus Finance QA Seed

This seed is for local manual QA only. It refuses to run unless `SUPABASE_URL` is local, normally `http://127.0.0.1:56221`, and the cleanup DB URL is local on port `56222`.

## Commands

From `C:\Users\thega\Desktop\HomePlus`:

```powershell
npm --prefix backend run seed:qa
```

Cleanup/reset without recreating the household:

```powershell
npm --prefix backend run seed:qa:cleanup
```

Apply the QA seed to an existing local household by slug:

```powershell
npm --prefix backend run seed:qa -- --target-household-slug=familia-garcia
```

This mode keeps the target household and its existing household data. It first cleans the default QA seed household `familia-qa-garcia` and QA personal Finance data, then adds the QA users as members of the target household and seeds Finance there.

## Local Env

The script expects these values in `backend\.env`:

```text
SUPABASE_URL=http://127.0.0.1:56221
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

If your local DB URL is not the default, add:

```text
LOCAL_SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:56222/postgres
```

## QA Users

All users use this password:

```text
HomePlusQA2026!
```

Users:

- `qa.sofia.homeplus@example.test` - coordinator, primary QA user
- `qa.martin.homeplus@example.test` - adult
- `qa.luna.homeplus@example.test` - adolescent
- `qa.tomi.homeplus@example.test` - child

The seed creates the household `Familia QA García` with slug `familia-qa-garcia`.

## Scope

Cleanup removes data for the QA household and the deterministic QA people only. It does not delete auth users, so reruns can reset passwords and recreate the same local QA household quickly.

## Finance Stage 4 Payment QA

The standard seed command also creates deterministic Stage 4 payment journey data for visual QA:

- Personal and household ARS/USD accounts with known positive balances.
- Credit cards covering ARS debt with multiple dues, partial settlement, USD debt without a due, zero debt, and saldo a favor.
- Normal payments across overdue, today, upcoming, known amount, unknown amount, paid expected-vs-actual, and cancelled occurrence states.
- Canonical recurring Payment Series data. The current database enforces one pending due per series, so the seed does not fabricate multiple unresolved occurrences for a single series.

At the end of a successful run, the script prints a `Stage 4 payment QA verification` JSON block with counts and settlement facts. That block is static verification only; it is not a human visual-runtime pass.
