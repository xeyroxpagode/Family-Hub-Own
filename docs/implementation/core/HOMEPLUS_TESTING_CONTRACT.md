# HomePlus Testing Contract

**Versión:** G0.5  
**Fecha de cierre:** 2026-07-14 (America/Buenos_Aires)  
**Estado:** oficial para HomePlus V0

## Propiedad y runners

La infraestructura compartida vive en `tests/`; las suites históricas de dominio siguen en `scripts/` y son invocadas por el runner global `tests/run.js`. Ningún módulo debe copiar un runner de Planner.

- Backend: `node:test` para el Testing Core y scripts Node con assertions/exit code para contratos existentes.
- Frontend: TypeScript compilado fuera de las fuentes (`scripts/compiled`, ignorado) y ejecución Node de módulos puros.
- Contratos: Core + G0.4 mediante el orquestador global.
- Integración: `tests/integration/run.js`, Supabase local, puerto libre, backend aislado, fixtures únicas y cleanup.
- DB: `tests/db/run.js`, schema assertions, paridad local, fixtures transaccionales y lint.
- Remoto: `tests/db/remote.js`, estrictamente `REMOTE_READ_ONLY`.

## Entorno seguro

`tests/helpers/environment.js` aplica este orden:

1. variables ya presentes en el proceso;
2. `.env.test.local` y `.env.local` de raíz;
3. equivalentes de `backend/`, incluido el `.env` histórico ignorado;
4. `supabase status -o env` capturado en memoria para Supabase local.

`.env.example` solo cataloga nombres y nunca se carga. Los valores incorporados se eliminan al terminar. Las suites runtime rechazan hosts que no sean `127.0.0.1` o `localhost`. Ningún token se escribe o imprime.

Variables conocidas: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOCAL_DATABASE_URL`, `TEST_ACCESS_TOKEN`, `API_BASE_URL`, `PORT`. Las tres primeras pueden derivarse del stack local sin secretos persistidos.

## Fixtures y modos

`tests/helpers/fixtures.js` provee IDs únicos, correo ficticio `example.test` y cleanup LIFO que intenta todas las operaciones aun si una falla.

| Suite | Modo | Cleanup |
| --- | --- | --- |
| Unit/contract/frontend | `READ_ONLY` | sin fixtures persistentes |
| DB local | `LOCAL_WRITE_ISOLATED` | transacción con rollback + assertion de cleanup |
| Integration | `LOCAL_WRITE_ISOLATED` | `finally`, eliminación de usuarios/datos y cierre del backend |
| DB remoto | `REMOTE_READ_ONLY` | snapshot temporal eliminado |

Las escrituras remotas no forman parte de ningún runner. La migración G0.5 se aplicó una sola vez como operación autorizada de cierre, fuera de las suites.

## Resultado, skips y errores

Un fallo produce exit code distinto de cero. Una integración sin runtime termina con exit 2 y `RUNTIME_REQUIRED`. El DB runner solo puede indicar `SKIPPED` si el stack local no está disponible y `HOMEPLUS_TEST_REQUIRE_LOCAL_DB` no está activo; CI activa esa variable, por lo que un skip allí falla.

Clasificación: `CODE_FAILURE`, `TEST_FAILURE`, `FIXTURE_FAILURE`, `ENVIRONMENT_FAILURE`, `LEGACY_DB_FAILURE`.

## Privacidad y cobertura

`tests/static/secret-scan.js` inspecciona rutas versionadas, reporta solo archivo/tipo y siempre redacta el valor. Los contratos G0.4 validan PII anidada, allowlists, límites de payload, audit y outbox.

Baseline de cobertura Core medido con Node: líneas 78.35%, ramas 65.19%, funciones 61.97%. Los mínimos automáticos son 78/65/61; bajarlos requiere decisión explícita. No se persiste HTML de coverage.
