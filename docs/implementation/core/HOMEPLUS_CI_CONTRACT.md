# HomePlus CI Contract

El workflow oficial es `.github/workflows/homeplus-quality.yml`.

## Job `quality`

Se ejecuta en push, pull request y manual. Usa checkout, Node 24, cache npm por los tres lockfiles, Supabase CLI 2.90.0, `npm ci` en raíz/backend/frontend, Supabase local y `npm run quality` con DB local obligatoria. No usa secretos, no accede al proyecto remoto y no realiza escrituras remotas.

## Job `integration`

Se ejecuta solo con `workflow_dispatch`, después de quality. Construye un Supabase local limpio y corre `npm run test:integration`. Las credenciales locales se obtienen en memoria; el job no requiere secrets. El backend usa puertos libres y se cierra antes de finalizar.

## Garantías

- Un fallo o skip de DB en CI produce exit distinto de cero.
- Los runners no imprimen variables ni tokens.
- Coverage Core tiene mínimos versionados.
- Secret scan y `git diff --check` forman parte de quality.
- `tests/static/workflow-syntax.js` valida que todos los YAML de workflows sean parseables y contengan jobs.
- CI no afirma cobertura runtime en push/PR: runtime se representa por el job manual real.
