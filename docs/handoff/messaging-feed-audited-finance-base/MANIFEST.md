# MANIFEST — HOMePLUS MESSAGING + FEED HANDOFF SNAPSHOT

## Identidad

| Campo | Valor |
|---|---|
| source branch | `finance-v1-unified` |
| audit reference HEAD | `ad4f966` |
| snapshot pre-commit HEAD | `ad4f9668f4da8cfefadf512b680f8284640d31ff` |
| final handoff commit | `chore(handoff): snapshot audited finance base for messaging-feed` — hash `9915f56328792514d17b10b4e30b8362053cc1a9` (short `9915f56`) |
| remote branch | `handoff/messaging-feed-audited-finance-base` (sin upstream en el momento del snapshot) |
| tag | `messaging-feed-audited-base-2026-09-03` |
| fecha | `2026-09-03` (`2026-09-03 15:07:30 UTC-03:00`) |

## Documentos enumerables de Mensajes/Feed

### Archivos copiados desde el donor/recon root (`C:\Users\thega\Desktop\HomePlus-donors\_recon`)

**01_PRODUCT_AND_MASTER/**
- `MASTER_MESSAGING_FEED_CROSS_MATRIX.md`

**02_CROSS_MATRIX/**
- `CM1_DATA_BACKEND_SECURITY.md`
- `CM2_FRONTEND_RUNTIME_RELIABILITY.md`

**03_DEEP_RECON/**
- `D1_FEED_DONORS_DEEP_RECON.md`
- `D2_MESSAGING_DONORS_DEEP_RECON.md`
- `D3_BACKEND_RELIABILITY_DEEP_RECON.md`

**04_DONOR_META/**
- `00_DONOR_ACQUISITION_REPORT.md`
- `01_DONOR_MANIFEST.md`
- `02_DONOR_STACK_MATRIX.md`
- `03_DONOR_STRUCTURAL_CAPABILITIES.md`
- `04_LICENSE_CLASSIFICATION.md`
- `trees/` (18 archivos: `*_STRUCTURE.md` y `*_TRACKED_FILES.txt` por donor)

### Archivos finales creados para el handoff

**00_READ_FIRST/**
- `README_START_HERE.md`
- `DEVELOPER_HANDOFF_SUMMARY.md`

**05_BRANCH_SNAPSHOT/**
- `BRANCH_STATE.md`
- `AUDIT_TO_CURRENT_DELTA.md`
- `WORKTREE_STATE.md`
- `SNAPSHOT_EXCLUSIONS.md`

**06_INTEGRATION_NOTES/**
- `APP_SHELL_PRESENCE_MESSAGES_NOTES.md`
- `FRIEND_BRANCH_MERGE_STRATEGY.md`
- `FINANCE_CONTEXT.md`

**raíz del paquete**
- `MANIFEST.md` (este archivo)

## Exclusions (no stageadas en el snapshot commit)

- `backup-before-presence.sql` — database dump con datos potencialmente reales.
- `01_GENI-A_RX6700XT_GUIA_PASO_A_PASO_V1.1.md` — guía hardware externa (no HOMePLUS).
- `02_GENI-B_RTX2060SUPER_GUIA_PASO_A_PASO_V1.1.md` — guía hardware externa.
- `03_GENI-C_RTX3050_GUIA_PASO_A_PASO_V1.1.md` — guía hardware externa.

Justificación completa: `05_BRANCH_SNAPSHOT/SNAPSHOT_EXCLUSIONS.md`.

## Documentos no encontrados

Buscados como product freeze independientes y **no encontrados** como archivos standalone finales:

- `MESSAGING_PRODUCT_FREEZE*` — not found (la autoridad vive en `MASTER_MESSAGING_FEED_CROSS_MATRIX.md`).
- `FEED_PRODUCT_FREEZE*` — not found (idem).
- `MESSAGING IA*` — not found (IA canónica registrada en la Master).
- `FEED IA*` — not found (idem).
- `HISTORY SEMANTICS*` — not found.
- `HOUSEHOLD BOUNDARIES*` — not found.
- `GENI BOUNDARY*` — not found.

No se inventó ninguno. La Product Truth de Mensajes/Feed está contenida en la Master Cross Matrix.

## git status final (al momento de preparar el snapshot)

```
On branch finance-v1-unified
Changes not staged for commit (Finance, no committeado — incluido como snapshot):
	modified:   front/mi-front-limpio/components/finance/MovementDetailSheet.tsx
	modified:   front/mi-front-limpio/components/finance/index.ts
	modified:   front/mi-front-limpio/package-lock.json
	modified:   front/mi-front-limpio/screens/finance/FinanceScreen.tsx
	modified:   front/mi-front-limpio/services/finance/financeDisplay.ts
	modified:   front/mi-front-limpio/services/finance/financeMovements.ts
	modified:   scripts/tsconfig.test.json
	modified:   tests/run.js

Untracked (incluidos como Finance work):
	STAGE_7A_AUDIT_REPORT.md
	STAGE_7B_CONTRACT_FREEZE.md
	STAGE_8A_AUDIT_REPORT.md
	STAGE_8B_R2_RECON_REPORT.md
	STAGE_8B_RECON_R5_REPORT.md
	front/mi-front-limpio/components/finance/TransferDetailSheet.tsx
	scripts/finance_7c_unified_movements_backend_tests.js
	scripts/finance_7d_unified_movements_frontend_tests.ts
	scripts/finance_7e_transfer_detail_frontend_tests.ts
	supabase/migrations/20260831000003_finance_unified_movements_v1_1.sql

Untracked (excluidos — ver SNAPSHOT_EXCLUSIONS.md):
	01_GENI-A_RX6700XT_GUIA_PASO_A_PASO_V1.1.md
	02_GENI-B_RTX2060SUPER_GUIA_PASO_A_PASO_V1.1.md
	03_GENI-C_RTX3050_GUIA_PASO_A_PASO_V1.1.md
	backup-before-presence.sql

Handoff pack:
	docs/handoff/messaging-feed-audited-finance-base/ (nuevo, este paquete)
```

## Árbol del paquete handoff

```
DOCS\HANDOFF\MESSAGING-FEED-AUDITED-FINANCE-BASE
|   MANIFEST.md
|
+---00_READ_FIRST
|       DEVELOPER_HANDOFF_SUMMARY.md
|       README_START_HERE.md
|
+---01_PRODUCT_AND_MASTER
|       MASTER_MESSAGING_FEED_CROSS_MATRIX.md
|
+---02_CROSS_MATRIX
|       CM1_DATA_BACKEND_SECURITY.md
|       CM2_FRONTEND_RUNTIME_RELIABILITY.md
|
+---03_DEEP_RECON
|       D1_FEED_DONORS_DEEP_RECON.md
|       D2_MESSAGING_DONORS_DEEP_RECON.md
|       D3_BACKEND_RELIABILITY_DEEP_RECON.md
|
+---04_DONOR_META
|   |   00_DONOR_ACQUISITION_REPORT.md
|   |   01_DONOR_MANIFEST.md
|   |   02_DONOR_STACK_MATRIX.md
|   |   03_DONOR_STRUCTURAL_CAPABILITIES.md
|   |   04_LICENSE_CLASSIFICATION.md
|   |
|   \---trees
|           01_Ahlan_STRUCTURE.md
|           01_Ahlan_TRACKED_FILES.txt
|           02_Sharebook_STRUCTURE.md
|           02_Sharebook_TRACKED_FILES.txt
|           03_SocialSphere_STRUCTURE.md
|           03_SocialSphere_TRACKED_FILES.txt
|           04_Framez_STRUCTURE.md
|           04_Framez_TRACKED_FILES.txt
|           05_AgoraServer_STRUCTURE.md
|           05_AgoraServer_TRACKED_FILES.txt
|           06_ReactNativeChat_STRUCTURE.md
|           06_ReactNativeChat_TRACKED_FILES.txt
|           07_CircleRN_STRUCTURE.md
|           07_CircleRN_TRACKED_FILES.txt
|           08_RealtimeChatMarketplace_STRUCTURE.md
|           08_RealtimeChatMarketplace_TRACKED_FILES.txt
|           09_ExpoOfflineFirstPOC_STRUCTURE.md
|           09_ExpoOfflineFirstPOC_TRACKED_FILES.txt
|
+---05_BRANCH_SNAPSHOT
|       AUDIT_TO_CURRENT_DELTA.md
|       BRANCH_STATE.md
|       SNAPSHOT_EXCLUSIONS.md
|       WORKTREE_STATE.md
|
\---06_INTEGRATION_NOTES
        APP_SHELL_PRESENCE_MESSAGES_NOTES.md
        FINANCE_CONTEXT.md
        FRIEND_BRANCH_MERGE_STRATEGY.md
```

## Nota de reproducibilidad

- Los originales en `C:\Users\thega\Desktop\HomePlus-donors\_recon` **no** fueron modificados.
- El donor root no es un repositorio git (`C:\Users\thega\Desktop\HomePlus-donors` no contiene `.git`).
- Sólo copias ingeridas dentro de `docs/handoff/...`.