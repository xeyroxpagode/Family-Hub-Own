# HomePlus Core — G0.5 Test Infrastructure and Final V0 Closure

## Veredicto

G0.5 convierte la evidencia G0.2–G0.4 en una infraestructura raíz compartida, reproducible y con CI. No agrega Planner V1 ni cambia decisiones funcionales.

## Baseline e inventario

Entrada: rama `v1`, SHA `5a212164b027dfcb870403cec8e9e417698db2c3`, working tree limpio, Windows 10.0.26200.8737, Node 24.13.0, npm 11.6.2, Supabase 2.90.0. Paquetes npm: raíz, `backend/`, `front/mi-front-limpio/`; cada uno conserva lockfile. No existía CI.

| Suite anterior | Lenguaje | Runner anterior | Credenciales | Baseline | Acción |
| --- | --- | --- | --- | --- | --- |
| G0.2 runtime | JS | script Node + backend manual | Supabase local | 115 PASS | WRAP/CONSOLIDATE |
| G0.3 cache | TS/JS | `tsc` + Node | no | 46 PASS | WRAP |
| Core backend | JS | Node assertions | no | 23 PASS | WRAP |
| Core frontend | TS/JS | `tsc` + Node | no | 19 PASS | WRAP |
| G0.4 | JS/SQL | tres scripts | Supabase local | 33+27+5 PASS | CONSOLIDATE |
| Schema checks | SQL | ejecución manual | DB | 75 PASS rows | MIGRATE al DB runner |
| DB lint | CLI | comando manual | local/remoto | local PASS; remoto 3 errores | CONSOLIDATE/FIX |
| TypeScript | TS | comando manual | no | PASS | WRAP |
| ESLint | JS | backend only | no | PASS | EXTEND frontend |

Problemas resueltos: comandos dependientes del cwd, backend manual para G0.2, puerto fijo G0.4, carga directa de `.env`, ausencia de lint frontend/CI/secret scan/coverage gate y tres errores DB remotos. Los outputs compilados siguen ignorados y separados de fuentes.

## Implementación

- `tests/run.js`: runner global y comandos públicos.
- `tests/helpers/`: procesos cross-platform, entorno seguro, fixtures/cleanup.
- `tests/integration/run.js`: backend aislado, puerto libre, readiness y cleanup.
- `tests/db/`: schema/paridad/lint local y verificación remota read-only.
- `tests/static/`: syntax, secretos y workflow YAML.
- Expo ESLint oficial SDK 54 con dependencias mínimas.
- CI base sin secrets e integración manual real.
- Coverage baseline Core con thresholds 78/65/61.
- Migración forward para remover tres RPCs legacy rotas.

## Evidencia final

| Check | Resultado |
| --- | --- |
| Frontend TypeScript / test TypeScript | PASS / PASS |
| Backend syntax | PASS, 90 JS en cierre final |
| Backend ESLint | PASS |
| Frontend ESLint | PASS, 0 errores; 22 warnings documentados |
| Testing Core | PASS, 4 tests |
| Core backend/frontend | PASS, 23 + 19 assertions |
| G0.2 runtime | PASS, 115 assertions, cleanup PASS |
| G0.3 | PASS, 46 assertions |
| G0.4 | PASS, 33 + 27 + 5 assertions |
| DB local | PASS, 33/33, 75 schema PASS rows, lint 0 |
| DB remoto | PASS, 33/33, 8 assertions, lint 0 |
| Coverage | PASS, 78.35% líneas / 65.19% ramas / 61.97% funciones |
| Secrets/privacy | PASS, valores redactados; PII contracts PASS |
| Fixtures/orphans | PASS / PASS |
| CI syntax | PASS |
| `git diff --check` | PASS |

La prueba de instalación eliminó `node_modules` de raíz/backend/frontend y `scripts/compiled`. `npm ci` pasó desde los tres lockfiles; durante el primer intento detectó metadata opcional WASM inconsistente en el lock frontend, que fue regenerada desde el manifest y revalidada con un clean install de 1.093 paquetes. El sweep post-clean ejecutó los catorce comandos oficiales pedidos con exit 0; `test:g0` duró 36,74 s y `quality` 27,01 s en esta máquina.

## Resultado de consola

```text
HOMEPLUS CORE — G0.5 COMPLETED

Status: PASSED
V0 contract gate: PASSED
Branch: v1
Commit audited: 5a212164b027dfcb870403cec8e9e417698db2c3

Backend runner: tests/run.js + node:test/Node contracts
Frontend runner: tests/run.js + TypeScript/Node
Contract runner: tests/run.js
Integration runner: tests/integration/run.js
DB runner: tests/db/run.js + tests/db/remote.js
Root commands: AVAILABLE
CI: .github/workflows/homeplus-quality.yml

Frontend TypeScript: PASS
Frontend lint: PASS (0 errors, 22 warnings)
Backend syntax: PASS
Backend ESLint: PASS
G0.2 runtime: PASS (115)
G0.3: PASS (46)
Core boundaries: PASS (23 backend + 19 frontend)
G0.4: PASS (33 contracts + 27 DB + 5 runtime)
DB tests: PASS
Local DB lint: PASS (0 errors)
Remote DB lint: PASS (0 errors)
Local schema: PASS
Remote schema: PASS
Migration parity: PASS (33/33)
Secrets: PASS
Privacy: PASS
Fixtures cleanup: PASS
Orphan processes: PASS

V0 gates available: 10
V0 gates blocked: 0

Files created: 19
Files modified: 12
Files removed: 0
New migrations: 1
Dependencies installed: eslint + eslint-config-expo (frontend dev)
Reports created: 5

Productive behavior changed: No
Planner V1 implemented: No
Commit created: No
Push performed: No

Next authorized phase:
Planner V1 Focused Readiness Revalidation only if G0.5 PASSED
```

```text
G0.5 STATUS: PASSED
HOMEPLUS V0 CONTRACT GATE: PASSED
```
