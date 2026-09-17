# HomePlus Feature Flags Contract

**Version:** G0.4
**Owner:** HomePlus Core (mechanism); each domain owns its definitions
**Initial consumer:** Planner
**Status:** `G0.4 STATUS: PASSED`

## Boundary and canonical registry

`backend/src/lib/featureFlagRegistry.js` owns validation, registration, deterministic evaluation and deny-safe behavior. Domain policy is registered at the composition root in `backend/src/config/featureFlags.js`; Planner owns `backend/src/constants/plannerFeatureFlags.js`. Core does not import Planner.

A definition has a stable key, description, owner, boolean default, `server_only|client_visible` exposure, optional environments and lifecycle expiry. Duplicate or malformed definitions fail at startup. Unknown flags evaluate `false`.

The initial real definition is:

```text
key: planner.search_entry
owner: planner
default: false
exposure: client_visible
purpose: future Planner Search entry point only
```

It does not create an icon, route, screen, endpoint or Search behavior. `planner_search_enabled` and local frontend authority are prohibited.

## Evaluation precedence

From highest to lowest:

1. process kill switch `HOMEPLUS_FEATURE_FLAGS_KILL_SWITCH`;
2. active persisted override with `kill_switch=true`;
3. expiry and definition environment gate;
4. active household override;
5. active global override;
6. canonical default.

Invalid state, missing rollout identity, store error and unknown key deny. Override windows use server time. A household override wins over global for the same key/environment.

Percentage rollout is supported only through persisted overrides. It accepts 0–100 and uses SHA-256 over `flag_key:household_id`; buckets are 0–99 and deterministic. Email, names and person IDs are never rollout identities. Kill switch always wins.

## Persistence

`public.feature_flag_overrides` is server-only, RLS-enabled and has no `anon`/`authenticated` grants. Constraints enforce known keys, environment format, explicit global/household scopes, valid windows, reason, and rollout bounds. Current known DB key is `planner.search_entry`; a new registry definition that needs persisted overrides requires a forward migration extending the DB allowlist.

Changes are operational database changes until an administrative UI is separately authorized. No secrets or UI content belong in the table.

## Authenticated projection

`GET /api/feature-flags` requires bearer authentication and evaluates on the server against the authenticated active household. The public response is only:

```ts
{ flags: Readonly<Record<string, boolean>> }
```

No `server_only` definition, override metadata, rollout percentage, reason or actor information is exposed. A projection error returns 503 and the frontend uses `{}` (all flags disabled).

The frontend projection lives in `services/core/featureFlags.ts`; storage is scoped by account + household in `featureFlagStore.ts`. `FeatureFlagsProvider` reloads on session/household changes. Core lifecycle clears the previous household projection after switch and all projections on sign-out. The frontend never evaluates rollout or overrides.

## Operations and rollback

- Immediate global kill: set `HOMEPLUS_FEATURE_FLAGS_KILL_SWITCH=true` and restart backend processes.
- Flag kill: set `kill_switch=true` for its active environment override.
- Rollback an override: remove/disable the row; canonical default resumes.
- Schema rollback: remove G0.4 consumers first, then reverse the new migration in a reviewed forward rollback migration. Applied migration files are never edited.

Required environment names: `HOMEPLUS_ENVIRONMENT`, optional `HOMEPLUS_FEATURE_FLAGS_KILL_SWITCH`. Supabase server credentials remain the existing backend contract.

## Tests

`npm.cmd run test:feature-flags` covers registry/default/unknown/global/household/kill/environment/rollout and privacy. `npm.cmd run test:g0.4:runtime` covers auth, default false, safe projection and a real server-side override. Frontend Core tests cover household and sign-out cleanup.
