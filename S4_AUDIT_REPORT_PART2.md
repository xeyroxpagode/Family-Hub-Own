### AH — EVIDENCE INDEX (continuación)

| Ref | Tipo | Ubicación |
|-----|------|-----------|
| [B1] | DIRECT_CODE | `backend/src/routes/assets.js:1-121` |
| [B2] | DIRECT_CODE | `backend/src/controllers/assets.controller.js:1-99` |
| [B3] | DIRECT_CODE | `backend/src/services/assets.service.js:1-2606+` |
| [B4] | DIRECT_CODE | `backend/src/lib/assetsCapabilities.js:1-110` |
| [B5] | DIRECT_CODE | `supabase/migrations/20261006000000_assets_core_persistence_v1.sql` |
| [B6] | DIRECT_CODE | `supabase/migrations/20261008000000_assets_idempotency_v1.sql` |
| [B7] | DIRECT_CODE | `supabase/migrations/20261008010000_assets_context_v1.sql` |
| [B8] | DIRECT_CODE | `supabase/migrations/20261011000000_assets_records_foundation_v1.sql` |
| [B9] | DIRECT_CODE | `supabase/migrations/20261015000000_assets_manual_care_foundation_v1.sql` |
| [B10] | DIRECT_CODE | `scripts/assets_a3_1_api_runtime_tests.js` |
| [B11] | DIRECT_CODE | `scripts/assets_a3_2_api_runtime_tests.js` |
| [B12] | DIRECT_CODE | `scripts/assets_a3_3_api_runtime_tests.js` |
| [F1] | DIRECT_CODE | `front/mi-front-limpio/services/assets/index.ts` |
| [F2] | DIRECT_CODE | `front/mi-front-limpio/services/assets/mutations.ts` |
| [F3] | DIRECT_CODE | `front/mi-front-limpio/services/assets/client.ts` |
| [F4] | DIRECT_CODE | `front/mi-front-limpio/services/assets/types.ts` |
| [F5] | DIRECT_CODE | `front/mi-front-limpio/services/assets/capabilities.ts` |
| [F6] | DIRECT_CODE | `front/mi-front-limpio/services/assets/errors.ts` |
| [F7] | DIRECT_CODE | `front/mi-front-limpio/services/assets/assetsCache.ts` |
| [F8] | DIRECT_CODE | `front/mi-front-limpio/services/assets/assetsKeys.ts` |
| [F9] | DIRECT_CODE | `front/mi-front-limpio/services/assets/intent.ts` |
| [F10] | DIRECT_CODE | `front/mi-front-limpio/services/assets/motion.ts` |
| [F11] | DIRECT_CODE | `front/mi-front-limpio/hooks/assets/useAssetsData.ts` |
| [F12] | DIRECT_CODE | `front/mi-front-limpio/screens/assets/AssetsListScreen.tsx` |
| [F13] | DIRECT_CODE | `front/mi-front-limpio/screens/assets/AssetDetailScreen.tsx` |
| [F14] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetSheet.tsx` |
| [F15] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetCreateSheet.tsx` |
| [F16] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetEditIdentitySheet.tsx` |
| [F17] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetContextSheet.tsx` |
| [F18] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetLifecycleSheets.tsx` |
| [F19] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetRecordSheets.tsx` |
| [F20] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetCareSheets.tsx` |
| [F21] | DIRECT_CODE | `front/mi-front-limpio/screens/assets/AssetRecordsScreen.tsx` |
| [F22] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetRow.tsx` |
| [F23] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetsSearchField.tsx` |
| [F24] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetsFilterRail.tsx` |
| [F25] | DIRECT_CODE | `front/mi-front-limpio/components/assets/assetLabels.ts` |
| [F26] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetAvatar.tsx` |
| [T1] | AUTOMATED_TEST | `scripts/assets_a3_1_api_runtime_tests.js` (PASS local) |
| [T2] | AUTOMATED_TEST | `scripts/assets_a3_2_api_runtime_tests.js` (PASS local) |
| [T3] | AUTOMATED_TEST | `scripts/assets_a3_3_api_runtime_tests.js` (PASS local) |
| [T4] | AUTOMATED_TEST | `scripts/assets_a4_*.js` (PASS local) |
| [T5] | AUTOMATED_TEST | `scripts/assets_a5_*.js` (PASS local) |
| [T6] | AUTOMATED_TEST | `scripts/assets_a6_*.js` (PASS local) |
| [T7] | TEST_FAIL_HARNESS | `tests/run.js` aliases auto-referentes |
| [P1] | PRODUCT_RECOMMENDATION | `HOMePLUS — ASSETS.md` (Target V0.3) |
| [P2] | PRODUCT_RECOMMENDATION | Figma-app prototypes (visual reference only) |
| [R1] | RUNTIME_LOG | Runtime tests boot real Express + Supabase local |
| [R2] | RUNTIME_LOG | A3.2 tests: concurrent dimension edits coexist |
| [R3] | RUNTIME_LOG | A3.3 tests: profile change blockers + retry works |
| [I1] | INFERENCE | Search BG-01 regression from LIKE escape |
| [I2] | INFERENCE | Duplicate key=null from suggested categories id=null |
| [I3] | INFERENCE | Require cycle from barrel import pattern |
| [U1] | UNVERIFIED | BG-02 discovery contract end-to-end |
| [U2] | UNVERIFIED | Planner integration end-to-end (no runtime) |
| [U3] | UNVERIFIED | HomeCloud integration end-to-end (no runtime) |
| [U4] | UNVERIFIED | Finance readiness (no module) |
| [U5] | UNVERIFIED | 500+ assets performance (no load test) |
| [U6] | UNVERIFIED | Accessibility full audit (no screen reader test) |

---

### AI — FINAL VERDICT

**S4_PARTIAL**

#### ¿Tenemos suficiente información para ejecutar S5?
**SÍ.** El backlog S5 (AF) está completamente definido con 10 items P0/P1/P2, archivos exactos, fixes mínimos, tests de aceptación y riesgos. Los 3 defectos P0 bloqueantes (identity edit 422, search BG-01, duplicate key) tienen root cause confirmado y fix owner asignado.

#### ¿Tenemos suficiente información para congelar S6 después de S5?
**PARCIALMENTE.** Las decisiones DE-001 a DE-008 (AG) están documentadas con evidencia, opciones y recomendación. **Faltan 2 decisiones de producto** que no pueden resolverse solo con evidencia técnica:
- **DEC-003**: Care derivado mechanism — requiere definir si Planner emite evento sincrónico o asíncrono, y si Assets expone RPC `create_derived_care` o Planner llama RPC existente con `origin=DERIVED_PLANNER`.
- **DEC-006**: File upload failure semantics — requiere confirmar que Core NUNCA hace rollback por fallo File (patrón compensación O36).

#### Datos que continúan imposibles de determinar sin runtime/device/DB:
1. **Search BG-01 con corpus >500 assets** — performance real, latencia p95, fanout member lookup bajo carga
2. **Idempotency bajo concurrencia real** — race condition reserve/complete con múltiples workers
3. **Planner/HomeCloud integration end-to-end** — deep links, return navigation, care derivado, file retry O36
4. **Accessibility real** — screen reader navigation, focus order, reduced motion en device
5. **Virtualización 500+ assets** — FPS real, memory profile, getItemLayout implementation
5. **Migraciones aplicadas en DB usuario** — prisma/supabase migration status desconocido

#### Cuáles requieren runtime/device/DB:
- [U1] BG-02 discovery contract verify (runtime test existe, necesita ejecución)
- [U2] Planner integration (requiere backend Planner corriendo + frontend)
- [U3] HomeCloud integration (requiere backend HomeCloud + storage)
- [U5] Performance 500+ assets (requiere seed data + device profiling)
- [U6] Accessibility (requiere device + screen reader)

---

### RESUMEN EJECUTIVO PARA S5/S6

**Assets Core (S5)**: 
- ✅ **Funciona**: Create, List, Detail, Context (3 dims), Records (CRUD + link/unlink/renew), Care (CRUD), Lifecycle (archive/trash/restore), Categories, Capabilities, Idempotency, Concurrency per-dimension, Household isolation, RLS deny-by-default.
- ❌ **Roto**: Identity edit (falta expected_identity), Search BG-01 (literal matches, sin property_name, sin accents), Duplicate key=null (suggested categories), Placement picker incluye ARCHIVED, ErrorBar faltante, Require cycle, Telemetry 404.
- 🔧 **Fixes S5**: 10 items definidos, 3 P0 críticos, 2 P1, 5 P2. Estimación: 3-5 días.

**Integraciones (S6)**:
- 📋 **Planner**: Contrato descubierto (Task/Event con `metadata.asset_id`), deep links, return navigation. **Decisiones DE-001, DE-002, DE-003 pendientes producto**.
- 📋 **HomeCloud**: Files API completo, viewer, upload. **Faltan 3 tablas link + RPCs**. **Decisiones DE-004, DE-005, DE-006 pendientes producto**.
- 📋 **Finance**: **EXCLUIDO de V1** (DE-007).
- 📋 **Ownership**: Claro — Assets owner, Planner/HomeCloud/Finance projections/references.

**Riesgo principal**: Si S5 no resuelve identity edit + search BG-01, la UX core queda degradada. Si S6 no decide care derivado + file retry semantics, la integración cross-module será frágil.

---

**FIN DE AUDITORÍA S4** — Listo para S5.