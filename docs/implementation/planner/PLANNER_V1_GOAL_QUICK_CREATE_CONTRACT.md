# PLANNER V1 — GOAL QUICK CREATE CONTRACT

## Purpose

Defines the binding contract for Goal Quick Create via the Planner sheet host.

## Fields

### Quick Fields (always visible)

1. **Titulo** (required)
   - Non-empty string
   - Max length enforced by domain
   - Validation: non-empty before submit

2. **Categoria**
   - Default: `'home'`
   - Valid: `home | family | finance | health | education | other`

3. **Visibilidad**
   - Default: `'household'`
   - Valid: `household | personal`
   - Subject to capabilities

4. **Guardar** (submit button)
   - Disabled when title empty or submitting
   - Shows spinner during submit

### Advanced Fields (collapsed by default)

5. **Como queres avanzar** (progress mode)
   - Default: `'steps'`
   - Options: `steps | tasks | numeric | boolean | none`
   - Numeric sub-options: count, percentage, amount
   - Target value, current value, unit for numeric only

6. **Fechas** (dates)
   - Default: `'none'`
   - Presets: none, week, month, year, custom
   - Custom: starts_at (YYYY-MM-DD), ends_at (YYYY-MM-DD)

## Defaults

```typescript
category = 'home'
visibility = 'household'
current_value = 0  // forced by backend, not sent by quick-create
progress_mode = 'steps'  // default when not explicitly expanded
```

## Capabilities

- `goal.create_household` → household visibility allowed
- `goal.create_personal` → personal visibility allowed
- Default visibility is `household`
- If household denied but personal allowed → default shifts to `personal`
- If neither allowed → action hidden from Quick Actions menu

## Progressive Disclosure

- Advanced sections begin collapsed (`progressOpen = false`, `datesOpen = false`)
- Toggle button with `accessibilityState.expanded` and chevron icon
- Expand/collapse preserves values
- No form reset on expand/collapse
- No network requests triggered
- No silent default changes

## Submit Contract

```typescript
POST /api/planner/goals
Headers:
  Idempotency-Key: <stable key>
  X-Mutation-Id: <stable mutation id>
Body:
  {
    title: string,
    description?: string | null,
    category: PlannerGoalCategory,
    visibility: PlannerGoalVisibility,
    progress_mode?: PlannerGoalProgressMode,
    target_type?: PlannerGoalTargetType | null,
    target_value?: number | null,
    // current_value intentionally OMITTED (backend defaults to 0)
    unit?: string | null,
    starts_at?: string | null,
    ends_at?: string | null,
  }
```

- No `If-Match` (create operation)
- `current_value` must NOT be sent (backend sets to 0)
- `mutationId` correlates with sheet submit lock
- `idempotencyKey` prevents server duplicates

## Error Handling

| Error class | UX behavior |
|------------|------------|
| validation | Error message near offending field; draft preserved |
| forbidden (403) | Capability invalidate; user message; draft preserved |
| timeout | Retryable message; retry reuses same intent |
| offline | Retryable message; retry reuses same intent |
| server (5xx) | Retryable message; draft preserved |
| abort | Silent; no user error; sheet force-closed |

## Retry

- Same intent reused (mutationId + idempotencyKey preserved)
- Server deduplicates via idempotencyKey
- Retry explicit via Guardar button press
- Timeout does not assume failure

## Close

- Success → close sheet once → navigate to GoalDetail
- Error → sheet stays open; draft preserved
- User close (backdrop/button/X) → discard draft
- Household switch → force close; abandon intent
- Sign-out → force close; abandon intent

## Navigation (Post-Create)

```typescript
openGoalDetail(navigation, {
  entityId: goal.id,
  source: 'quick_action',
  returnTo: 'planner',
  justCreated: true,
});
```

- Goal ID only (no full entity in params)
- `justCreated` ephemeral (one-shot consumption)
- Stale success (household changed) → no navigation
- Sign-out → no navigation