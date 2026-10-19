# 16_INVENTORY_CROSS_DOMAIN_GRAPH.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Auditoría de Inventory contra TODOS los dominios relevantes

### Matriz de clasificación

| Clasificación | Significado |
|---------------|-------------|
| **REAL** | Integración bidireccional funcional verificada |
| **PARTIAL** | Integración unidireccional o parcial funcional |
| **ONE_WAY** | Solo A → B funciona |
| **TWO_WAY** | A ↔ B ambos sentidos |
| **DOCUMENTED_ONLY** | Solo en docs, no en código |
| **DEAD** | Código existe pero no funciona / no se usa |
| **NONE** | No hay integración |

---

## Por dominio

### 1. HOME → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Home → Inventory** | **ONE_WAY** | `HomePlannerSections.tsx:366` → `InventoryUrgencyCard` con `onPress={() => navigation.navigate('MoreTab', {screen:'Inventory'})}` |
| **Inventory → Home** | **ONE_WAY** | `useHomeInventoryAlerts` hook llama `getInventoryAlerts` → `InventoryUrgencyCard` muestra datos. **NO hay mutaciones desde Home** |

**Detalle Home → Inventory:**
- **Surface**: `InventoryUrgencyCard` (INV-SURF-016) en `HomePlannerSections`
- **Datos**: `useHomeInventoryAlerts` → `GET /api/inventory/alerts` (SERVICE-INV-009)
- **Render condition**: `urgentCount > 0` (low_stock + out_of_stock + pending_restocks)
- **Navegación**: Tap card → `MoreTab > Inventory`
- **Refresh**: `useFocusEffect` en hook → refresh al focus Home
- **Permisos**: Cualquier miembro (endpoint `/alerts` accesible)

**Detalle Inventory → Home:**
- **NO hay**: Botones "Comprar ya" en Inventory que naveguen a Home
- **NO hay**: Mutaciones en Home que afecten Inventory
- **Solo**: Home consume datos de Inventory (read-only)

---

### 2. PLANNER → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Inventory → Planner** | **ONE_WAY** | `approveRestockRequest` → `plannerTasksService.createTask` con `origin_module='inventory'` |
| **Planner → Inventory** | **NONE** | **NO hay** callback, webhook, trigger, ni polling desde Planner hacia Inventory |

**Detalle Inventory → Planner (APPROVE FLOW):**
```
Inventory: approveRestockRequest (SERVICE-INV-011)
    │
    ▼
Backend: approveRestockRequest (FUNCTION-INV-020)
    │
    ├── findActiveInventoryTask() → busca planner_tasks con origin_module='inventory'
    │
    ├── Si EXISTE task: reusa → UPDATE restock_requests SET planner_task_id=existingTask.id
    │
    └── Si NO EXISTE: plannerTasksService.createTask(context, taskPayload, correlation)
            │
            ├── taskPayload: {
            │   title: "Comprar {item.name}",
            │   template_key: 'shopping',
            │   category: 'Compras',
            │   priority: 'high' (out_of_stock) / 'normal' (low_stock),
            │   origin_module: 'inventory',
            │   origin_entity_type: 'inventory_item',
            │   origin_entity_id: item.id,
            │   origin_reason: 'out_of_stock' | 'low_stock'
            │ }
            │
            └── Idempotency key: `inventory-restock-${requestId}-planner-task`
```

**Detalle Planner → Inventory (AUSENTE):**
- Completar task Planner (shopping) **NO** actualiza Inventory
- Cancelar task Planner **NO** cancela restock request
- Eliminar task Planner **NO** afecta restock request
- `ensureRestockRequest` se re-evalúa solo en mutaciones directas de item (create/update/quantity/OOS/delete)
- **Gap**: Si usuario completa compra en Planner y actualiza quantity manualmente en Inventory → OK. Si NO actualiza → restock sigue pending/approved pero stock real no cambió.

---

### 3. FINANCE → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Finance → Inventory** | **NONE** | No imports, no calls, no shared tables |
| **Inventory → Finance** | **NONE** | No imports, no calls |

**Nota**: `ALLOWED_ORIGIN_MODULES` en `planner.tasks.service.js:11-17` incluye `'finance'` pero es para Planner tasks origin, no Inventory.

---

### 4. PRESENCE → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Presence → Inventory** | **NONE** | No integración |
| **Inventory → Presence** | **NONE** | No integración |

---

### 5. FAMILY/HOUSEHOLD → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Household → Inventory** | **REAL** (scope) | Todo Inventory scopeado por `household_id` via `context.householdId` + RLS `is_active_household_member()` |
| **Inventory → Household** | **NONE** | Inventory no modifica household/members |

**Scope implementation:**
- `getInventoryContext` → `getPlannerContext` → resuelve `householdId` de membership activa
- RLS policies usan `public.is_active_household_member(household_id)`
- `currentHousehold` en `HouseholdContext` → UI gating

---

### 6. FEED/MESSAGING → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Feed → Inventory** | **NONE** | No integración |
| **Inventory → Feed** | **NONE** | No `feed` events emitidos por Inventory mutations |

---

### 7. HOMECLOUD → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **HomeCloud → Inventory** | **NONE** | No integración |
| **Inventory → HomeCloud** | **NONE** | No integración |

---

### 8. ASSETS → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Assets → Inventory** | **DOCUMENTED_ONLY** | `ALLOWED_ORIGIN_MODULES` en `planner.tasks.service.js:13` incluye `'assets'` — pero Inventory no usa Assets |
| **Inventory → Assets** | **NONE** | No integración |

---

### 9. HOMI/AI → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Homi/AI → Inventory** | **NONE** | No integración |
| **Inventory → Homi/AI** | **NONE** | No integración |

---

### 10. NOTIFICATIONS → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Notifications → Inventory** | **NONE** | No push notifications para low stock / restock |
| **Inventory → Notifications** | **NONE** | No event emission |

---

### 11. AUTOMATIONS → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Automations → Inventory** | **DOCUMENTED_ONLY** | `ALLOWED_ORIGIN_MODULES` incluye `'automation'` — para Planner tasks origin |
| **Inventory → Automations** | **NONE** | No integración |

---

### 12. AUTH → INVENTORY
| Dirección | Clasificación | Evidencia |
|-----------|---------------|-----------|
| **Auth → Inventory** | **REAL** (auth guard) | `authFinalMiddleware` → `getPlannerContext` → `context` para todos los endpoints |
| **Inventory → Auth** | **NONE** | Inventory no modifica auth |

---

## Grafo de dependencias (Dirección de llamadas)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INVENTORY (CORE)                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (llama)
┌─────────────────────────────────────────────────────────────────────┐
│                      PLANNER (tasks service)                        │
│  plannerTasksService.createTask()                                   │
│  └─ origin_module='inventory', origin_entity_type='inventory_item' │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ (NO llama de vuelta)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         HOME (consumer)                             │
│  useHomeInventoryAlerts → GET /api/inventory/alerts                 │
│  InventoryUrgencyCard → navega a Inventory                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      HOUSEHOLD/FAMILY (scope)                       │
│  getPlannerContext → householdId, personId, role, membershipId     │
│  RLS: is_active_household_member(), is_inventory_restock_approver()│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        AUTH (guard)                                 │
│  authFinalMiddleware → valida JWT, setea req.auth                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Resumen de integraciones

| Dominio | Inventory → Dominio | Dominio → Inventory | Clasificación General |
|---------|---------------------|---------------------|----------------------|
| **Home** | Datos (alertas) + Navegación | Navegación | **PARTIAL_TWO_WAY** (datos one-way, nav two-way) |
| **Planner** | Task creation (approve) | **NONE** | **ONE_WAY** |
| **Household/Family** | Scope context | Scope context | **REAL** (shared scope) |
| **Auth** | Auth guard | **NONE** | **ONE_WAY** (guard) |
| **Finance** | **NONE** | **NONE** | **NONE** |
| **Presence** | **NONE** | **NONE** | **NONE** |
| **HomeCloud** | **NONE** | **NONE** | **NONE** |
| **Assets** | **NONE** | **NONE** (solo constant) | **NONE** |
| **Homi/AI** | **NONE** | **NONE** | **NONE** |
| **Notifications** | **NONE** | **NONE** | **NONE** |
| **Automations** | **NONE** | **NONE** (solo constant) | **NONE** |
| **Feed/Messaging** | **NONE** | **NONE** | **NONE** |

---

## Hallazgos críticos

1. **Planner → Inventory BROKEN**: Completar task de compra en Planner no actualiza Inventory. Usuario debe ir a Inventory y hacer + cantidad manualmente.

2. **No event emission**: Inventory no emite eventos a Feed/Notifications — otros dominios no se enteran de cambios de stock.

3. **Scope coupling fuerte**: `getInventoryContext` = `getPlannerContext` — Inventory depende de Planner context service para auth/scope.

4. **Origin metadata unidireccional**: Planner tasks creadas desde Inventory llevan `origin_module='inventory'` pero Planner no usa ese metadata para retroalimentar.

5. **Zero Finance integration**: Aunque ambos son "household management", no hay cruce (ej: gasto en compras → Finance transaction).