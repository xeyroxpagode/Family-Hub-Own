# HomePlus V0 Final Contract Gate

| Campo | Valor |
| --- | --- |
| Fecha | 2026-07-14 (America/Buenos_Aires) |
| Rama | `v1` |
| Commit auditado | `5a212164b027dfcb870403cec8e9e417698db2c3` + working tree G0.5 |
| Working tree inicial | limpio |
| Node / npm / Supabase | 24.13.0 / 11.6.2 / 2.90.0 |
| Migraciones | 33 local / 33 remoto |
| Nueva migración | `20260715010000_remove_broken_legacy_rpcs.sql` |
| CI | `.github/workflows/homeplus-quality.yml` |

## Diez gates V0

| Gate V0 | Estado | Evidencia | Comando |
| --- | --- | --- | --- |
| Migration parity | AVAILABLE | 33/33 local-remoto | `npm run test:db:remote` |
| Capabilities | AVAILABLE | Core 23 + runtime G0.2 115 | `npm run test:contracts`, `npm run test:g0.2` |
| Feature flags | AVAILABLE | 33 contracts, 5 runtime, DB constraints | `npm run test:g0.4` |
| Cache/invalidation | AVAILABLE | 19 Core frontend + 46 G0.3 | `npm run test:frontend` |
| Mutation ID | AVAILABLE | Core + G0.2 + audit correlation | `npm run test:contracts`, `npm run test:g0.2` |
| Error envelope | AVAILABLE | global boundaries + 401/404/runtime | `npm run test:backend`, `npm run test:g0.2` |
| Audit/outbox | AVAILABLE | 33 contracts + 27 DB + processor paths | `npm run test:g0.4` |
| Telemetry/privacy | AVAILABLE | recursive PII + secret scan | `npm run test:contracts`, `npm run test:secrets` |
| Test runners/suites | AVAILABLE | root commands, fixtures, integration, DB, CI | `npm run test:g0` |
| Baseline global | AVAILABLE | typecheck/lint/syntax/coverage/DB/whitespace | `npm run quality` |

## DB lint repair

El baseline remoto tenía tres errores en overloads legacy ya no funcionales: Finance `get_expense_balance(uuid)` usaba `expense_splits.user_id`; `join_household_by_token(text)` usaba `invitations.used_at`; `create_household_rpc(text,text)` usaba `households.nombre`. No había consumidores activos en el repositorio; las dos APIs Household/Invitation ya habían sido revocadas y reemplazadas. La migración elimina solo esos tres overloads, preserva el overload Finance de dos argumentos y las APIs finales. Fue probada con reset local, respaldada mediante snapshot remoto ignorado, aplicada remotamente y revalidada.

`REMOTE DB LINT ERRORS: 0`

## Limitaciones no bloqueantes

- Expo ESLint informa 22 warnings preexistentes y cero errores; los warnings se documentan para corrección focalizada.
- El audit de dependencias frontend informa deuda de vulnerabilidades transitivas; no se ejecutó `audit fix --force` porque implicaría upgrades funcionales fuera de alcance.
- El job runtime de CI es manual, no se presenta como ejecutado automáticamente en cada PR.

## Decisión

Los diez gates están `AVAILABLE`. No se implementó Planner V1 y no se modificó `planner_v1_implementation_ready.md`.

```text
HOMEPLUS V0 CONTRACT GATE: PASSED
G0.5 STATUS: PASSED
```
