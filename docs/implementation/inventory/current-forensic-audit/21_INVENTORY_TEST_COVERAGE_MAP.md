# 21_INVENTORY_TEST_COVERAGE_MAP.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Catálogo de tests relacionados con Inventory

**Búsqueda realizada**: `front/mi-front-limpio/tests/`, `backend/`, `supabase/`, `tests/` — archivos `*.test.*`, `*.spec.*`, scripts de test

---

### Hallazgo principal: **CERO tests específicos de Inventory**

| Ubicación | Tests encontrados | Relacionados con Inventory |
|-----------|-------------------|---------------------------|
| `front/mi-front-limpio/tests/` | `experienceMode.contract.test.js`, `plannerTasksContract.test.js` | **0** |
| `backend/` | Ninguno (no test files fuera de node_modules) | **0** |
| `supabase/migrations/` | Ninguno (solo SQL) | **0** |
| `tests/` (root) | `planner_event_series_materialization_bound_transactional.sql`, `planner_event_series_transactional.sql` | **0** |

---

## Tests de contratos existentes (No Inventory)

### `front/mi-front-limpio/tests/plannerTasksContract.test.js`
- Valida contrato de Planner tasks (create, update, complete, etc.)
- **No cubre** `origin_module='inventory'` tasks

### `front/mi-front-limpio/tests/experienceMode.contract.test.js`
- Valida experience mode switching
- **No cubre** Inventory

---

## Cobertura conceptual por capa

| Capa | Feature | Frontend | Backend | DB | Integration | Realtime | Permissions | Cross-domain |
|------|---------|----------|---------|-----|-------------|----------|-------------|--------------|
| **CRUD Items** | Create | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Read (list) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Update | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Delete (soft) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Quantity** | Add (+) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Consume (-) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Mark OOS | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Restock** | Auto-create | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Approve | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Reject | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Duplicate prevention | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Templates** | List | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Quick-add from template | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Alerts** | GET /alerts | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Home urgency card | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Realtime** | Items subscription | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Restock subscription | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Household switch | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Permissions** | Role gates (approve) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | RLS policies | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Cross-domain** | Inventory → Planner (approve) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Planner → Inventory (completion) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Home → Inventory (nav) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Inventory → Home (alerts) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Audit** | Movements logging | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Edge cases** | Concurrent quantity | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Offline/reconnect | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Double submit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Scripts de test / QA evidencia (No unit tests)

### `docs/implementation/planner/qa-evidence/`
Contiene scripts de verificación DB para Planner integration (M11, OLA phases):
- `m11_int_01_phase_2_r2b/r2b_independent_probe.js`
- `m11_ola_3_global_qa/global_qa_db_probe.js`
- Varios `*_probe.js` y `*_summary.json`

**Relevancia para Inventory**: **Indirecta** — validan Planner tasks con `origin_module='inventory'` pero no testean Inventory per se.

### `backend/scripts/`
- `inspect-outbox.js`, `process-outbox.js`, `process-purges.js`, `retry-outbox.js`, `seed-demo-familia-1-test.js`
- **No tests** — scripts operacionales

### `backend/sql/rls_test.sql`
- Test manual de RLS para esquema legacy (`grupos_familiares`, `miembros_grupo`, `perfiles`)
- **No cubre** Inventory RLS

---

## Comandos de test disponibles

| Proyecto | Comando | Qué corre |
|----------|---------|-----------|
| Frontend | `npm test` (en `front/mi-front-limpio`) | Jest → `experienceMode.contract.test.js`, `plannerTasksContract.test.js` |
| Backend | `npm test` (en `backend`) | **No test script** en package.json |
| DB | `psql -f tests/*.sql` | Solo Planner transactional tests |

---

## Dependencias de test

### Frontend (`front/mi-front-limpio/package.json` - inferido)
- `jest`, `@testing-library/react-native`, `react-test-renderer`
- Tests corren en **JSdom** (no device/emulator)

### Backend
- **No test framework** configurado (no `jest`, `mocha`, `vitest` en dependencies)
- **No test DB** — tests requerirían Supabase local o staging

---

## Gaps de test críticos

| Gap | Severidad | Descripción |
|-----|-----------|-------------|
| **GAP-TEST-001** | CRÍTICA | **Cero tests unitarios** para `inventory.service.js` (636 líneas, 17 funciones, lógica de negocio compleja) |
| **GAP-TEST-002** | CRÍTICA | **Cero tests de integración** para endpoints `/api/inventory/*` (12 endpoints) |
| **GAP-TEST-003** | ALTA | **Cero tests de RLS** para 4 tablas Inventory (10 policies) |
| **GAP-TEST-004** | ALTA | **Cero tests de realtime** (suscripción, refresh, household switch, event storm) |
| **GAP-TEST-005** | ALTA | **Cero tests de concurrencia** (lost update en add/consume, double submit) |
| **GAP-TEST-006** | ALTA | **Cero tests de idempotencia** (create, add, consume sin keys) |
| **GAP-TEST-007** | ALTA | **Cero tests cross-domain** Inventory→Planner (approve flow, task reuse, duplicate prevention) |
| **GAP-TEST-008** | MEDIA | **Cero tests E2E** (user flows: create→edit→quantity→restock→approve) |
| **GAP-TEST-009** | MEDIA | **Cero tests de UI** (InventarioScreen states, modal, empty states, errors) |
| **GAP-TEST-010** | MEDIA | **Cero tests de Home integration** (urgency card, alerts, cross-refresh) |

---

## Fixtures / Test Data necesarios (No existen)

| Fixture | Descripción |
|---------|-------------|
| `household_with_members` | Hogar con 4 members (coordinator, adult, adolescent, senior) |
| `inventory_items_various` | Items en estados: ok, low, out, deleted |
| `inventory_templates_seed` | 63 templates globales |
| `restock_requests_all_states` | Pending, approved, rejected, cancelled |
| `planner_tasks_from_inventory` | Tasks con `origin_module='inventory'` |
| `inventory_movements_history` | Movements de todos los tipos |

---

## Comandos de verificación manual (Runtime)

```bash
# Typecheck frontend
cd front/mi-mi-front-limpio && npx tsc --noEmit

# Typecheck backend (si tiene TS)
cd backend && npx tsc --noEmit  # (backend es JS, no TS)

# Lint
cd front/mi-front-limpio && npm run lint
cd backend && npm run lint

# DB schema check (Supabase CLI)
supabase db diff --schema public

# RLS test manual
psql -f backend/sql/rls_test.sql  # Solo legacy schema
```

---

## Resumen de cobertura

| Métrica | Valor |
|---------|-------|
| Tests unitarios Inventory | 0 |
| Tests integración Inventory | 0 |
| Tests E2E Inventory | 0 |
| Tests RLS Inventory | 0 |
| Tests realtime Inventory | 0 |
| Tests concurrencia Inventory | 0 |
| Tests cross-domain Inventory | 0 |
| **Cobertura total** | **0%** |

**Nota**: No se inventan porcentajes. La cobertura es **cero** en todas las dimensiones medibles.