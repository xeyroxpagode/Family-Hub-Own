# WORKTREE STATE — DIRTY WORKTREE SNAPSHOT

Fecha de captura: `2026-09-03 15:07:30 UTC-03:00`

## TRACKED MODIFIED

```
 front/mi-front-limpio/components/finance/MovementDetailSheet.tsx
 front/mi-front-limpio/components/finance/index.ts
 front/mi-front-limpio/package-lock.json
 front/mi-front-limpio/screens/finance/FinanceScreen.tsx
 front/mi-front-limpio/services/finance/financeDisplay.ts
 front/mi-front-limpio/services/finance/financeMovements.ts
 scripts/tsconfig.test.json
 tests/run.js
```

`git diff --stat`:

```
 .../components/finance/MovementDetailSheet.tsx     |   6 +-
 front/mi-front-limpio/components/finance/index.ts  |   1 +
 front/mi-front-limpio/package-lock.json            |  47 ++---
 .../screens/finance/FinanceScreen.tsx              | 217 +++++++++++++++-----
 .../services/finance/financeDisplay.ts             |   7 +
 .../services/finance/financeMovements.ts           | 227 ++++++++++++++++++++-
 scripts/tsconfig.test.json                         |   2 +
 tests/run.js                                       |  14 ++
 8 files changed, 433 insertions(+), 88 deletions(-)
```

## STAGED

```
(ninguno)
```

`git diff --cached --stat` → (empty)

## UNTRACKED

```
 01_GENI-A_RX6700XT_GUIA_PASO_A_PASO_V1.1.md        -> EXCLUIDO (ver SNAPSHOT_EXCLUSIONS.md)
 02_GENI-B_RTX2060SUPER_GUIA_PASO_A_PASO_V1.1.md    -> EXCLUIDO (ver SNAPSHOT_EXCLUSIONS.md)
 03_GENI-C_RTX3050_GUIA_PASO_A_PASO_V1.1.md         -> EXCLUIDO (ver SNAPSHOT_EXCLUSIONS.md)
 backup-before-presence.sql                         -> EXCLUIDO (ver SNAPSHOT_EXCLUSIONS.md)
 STAGE_7A_AUDIT_REPORT.md                           -> INCLUIDO (Finance work)
 STAGE_7B_CONTRACT_FREEZE.md                        -> INCLUIDO (Finance work)
 STAGE_8A_AUDIT_REPORT.md                           -> INCLUIDO (Finance work)
 STAGE_8B_R2_RECON_REPORT.md                        -> INCLUIDO (Finance work)
 STAGE_8B_RECON_R5_REPORT.md                        -> INCLUIDO (Finance work)
 front/mi-front-limpio/components/finance/TransferDetailSheet.tsx  -> INCLUIDO (Finance source)
 scripts/finance_7c_unified_movements_backend_tests.js            -> INCLUIDO (Finance test)
 scripts/finance_7d_unified_movements_frontend_tests.ts           -> INCLUIDO (Finance test)
 scripts/finance_7e_transfer_detail_frontend_tests.ts             -> INCLUIDO (Finance test)
 supabase/migrations/20260831000003_finance_unified_movements_v1_1.sql -> INCLUIDO (Finance migration)
```

## Clasificación general

- **TRACKED MODIFIED:** 8 archivos, todos relacionados con Finance (estado de trabajo válido actual, no committeado).
- **STAGED:** 0 archivos.
- **UNTRACKED:** 14 archivos (11 incluidos como trabajo Finance válido, 4 excluidos por ser externos/sensibles).

Todos los archivos excluidos y su justificación figuran en `SNAPSHOT_EXCLUSIONS.md`.