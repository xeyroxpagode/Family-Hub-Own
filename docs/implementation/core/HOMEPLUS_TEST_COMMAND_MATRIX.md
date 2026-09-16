# HomePlus Test Command Matrix

Todos los comandos se ejecutan desde la raíz y son compatibles con Windows y Linux. En PowerShell local puede usarse `npm.cmd`; en CI y shells normales, `npm`.

| Comando | Alcance | Runtime/credenciales | Evidencia G0.5 |
| --- | --- | --- | --- |
| `npm run typecheck` | Frontend + fuentes TypeScript de tests | no | PASS |
| `npm run lint` | syntax backend/tests, ESLint backend, Expo ESLint frontend | no | PASS; frontend 0 errores/22 warnings |
| `npm run test:backend` | Testing Core + Core backend | no | PASS; 4 tests + 23 assertions |
| `npm run test:frontend` | Core frontend + cache/context Planner | no | PASS; 19 + 46 assertions |
| `npm run test:contracts` | Core + flags/telemetry/privacy/outbox | no | PASS; 23 + 33 assertions |
| `npm run test:integration` | G0.2 + G0.4 runtime, backend aislado | Supabase local | PASS; 115 + 5 assertions |
| `npm run test:db` | paridad/schema/legacy repair/G0.4 DB/lint local | PostgreSQL local | PASS; 33/33, 75 schema rows, 7 + 27 assertions |
| `npm run test:db:remote` | lint/paridad/schema remoto | sesión Supabase; read-only | PASS; lint 0, 33/33, 8 assertions |
| `npm run test:core` | Core backend/frontend + Testing Core | no | PASS |
| `npm run test:planner` | Planner cache/query/context pure suite | no | PASS; 46 assertions |
| `npm run test:g0.2` | wrapper oficial G0.2 runtime | Supabase local | PASS; 115 assertions, cleanup PASS |
| `npm run test:g0.3` | wrapper oficial G0.3 | no | PASS; 46 assertions |
| `npm run test:g0.4` | contracts + DB + runtime | Supabase local | PASS; 33 + 27 + 5 assertions |
| `npm run test:g0` | quality + runtime completo | Supabase local | PASS |
| `npm run test:coverage` | baseline Core con thresholds | no | PASS; 78.35/65.19/61.97 |
| `npm run test:secrets` | secretos/credenciales en paths versionados y nuevos | no | PASS; 572 paths en cierre final |
| `npm run quality` | baseline obligatorio sin secretos remotos | Supabase local para DB | PASS |

## Matriz de contratos

| Contrato | Unit | Contract | Integration | DB | Runtime | Comando | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Request ID | ✓ | ✓ | ✓ |  | ✓ | `test:contracts`, `test:g0.2` | PASS |
| Mutation ID | ✓ | ✓ | ✓ | ✓ | ✓ | `test:contracts`, `test:g0.2`, `test:db` | PASS |
| Errors | ✓ | ✓ | ✓ |  | ✓ | `test:backend`, `test:g0.2` | PASS |
| Capabilities | ✓ | ✓ | ✓ |  | ✓ | `test:contracts`, `test:g0.2` | PASS |
| Idempotency | ✓ | ✓ | ✓ | ✓ | ✓ | `test:g0.2`, `test:db` | PASS |
| Version | ✓ | ✓ | ✓ | ✓ | ✓ | `test:g0.2`, `test:db` | PASS |
| Cache | ✓ | ✓ |  |  |  | `test:frontend` | PASS |
| Household lifecycle | ✓ | ✓ | ✓ | ✓ | ✓ | `test:core`, `test:g0.2` | PASS |
| Session lifecycle | ✓ | ✓ | ✓ |  | ✓ | `test:core`, `test:integration` | PASS |
| Feature flags | ✓ | ✓ | ✓ | ✓ | ✓ | `test:g0.4` | PASS |
| Telemetry | ✓ | ✓ |  |  |  | `test:contracts` | PASS |
| Audit | ✓ | ✓ | ✓ | ✓ | ✓ | `test:g0.4` | PASS |
| Outbox | ✓ | ✓ | ✓ | ✓ | ✓ | `test:g0.4` | PASS |

Fecha de estas ejecuciones: 2026-07-14. Todos los comandos listados devolvieron exit code 0; no hubo skips en el cierre local/remoto.
