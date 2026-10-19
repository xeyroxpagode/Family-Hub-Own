# 08_INVENTORY_FRONTEND_SERVICE_MAP.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Catálogo completo de funciones frontend que comunican con Inventory backend

### Archivo fuente: `front/mi-front-limpio/services/inventory.ts` (171 líneas)

---

### SERVICE-INV-001: listInventoryTemplates
```typescript
export const listInventoryTemplates = (accessToken: string) =>
  requestJson<{ templates: InventoryTemplate[] }>('/api/inventory/templates', { accessToken });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-001 |
| **Nombre** | `listInventoryTemplates` |
| **Archivo:Línea** | `inventory.ts:90-91` |
| **Callers** | `InventarioScreen.refresh()` (línea 350), `useHomeInventoryAlerts.refresh()` (HomePlannerSections.tsx:156) |
| **HTTP Method** | `GET` |
| **URL** | `/api/inventory/templates` |
| **Query Params** | Ninguno |
| **Request Body** | Ninguno |
| **Auth Mechanism** | Bearer token en header `Authorization: Bearer <accessToken>` (via `requestJson` en `api.ts`) |
| **Expected Response** | `{ templates: InventoryTemplate[] }` |
| **TypeScript Type** | `InventoryTemplate[]` (definido línea 12-23) |
| **Error Mapping** | `ApiError` con `message` del backend (400/500) |
| **Retry Behavior** | Ninguno (llamada única) |
| **Timeout** | Default `fetch` (sin timeout explícito en `requestJson`) |

---

### SERVICE-INV-002: listInventoryItems
```typescript
export const listInventoryItems = (accessToken: string) =>
  requestJson<{ items: InventoryItem[] }>('/api/inventory/items', { accessToken });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-002 |
| **Nombre** | `listInventoryItems` |
| **Archivo:Línea** | `inventory.ts:93-94` |
| **Callers** | `InventarioScreen.refresh()` (línea 351), `useHomeInventoryAlerts.refresh()` → `getInventoryAlerts` → `listItems` (backend) |
| **HTTP Method** | `GET` |
| **URL** | `/api/inventory/items` |
| **Query Params** | Backend acepta `?category_key=` y `?search=` (pero frontend filtra client-side) |
| **Request Body** | Ninguno |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ items: InventoryItem[] }` |
| **TypeScript Type** | `InventoryItem[]` (línea 25-40) |
| **Error Mapping** | `ApiError` |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-003: createInventoryItem
```typescript
export const createInventoryItem = (accessToken: string, payload: UpsertInventoryItemPayload) =>
  requestJson<{ item: InventoryItem }>('/api/inventory/items', {
    method: 'POST',
    accessToken,
    body: payload,
  });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-003 |
| **Nombre** | `createInventoryItem` |
| **Archivo:Línea** | `inventory.ts:96-101` |
| **Callers** | `InventarioScreen.handleSave()` cuando `!editingItem` (línea 475) |
| **HTTP Method** | `POST` |
| **URL** | `/api/inventory/items` |
| **Query Params** | Ninguno |
| **Request Body** | `UpsertInventoryItemPayload` (línea 73-80): `template_id?`, `name?`, `emoji?`, `category_key?`, `quantity?`, `low_stock_threshold?` |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ item: InventoryItem }` |
| **TypeScript Type** | `InventoryItem` |
| **Error Mapping** | `ApiError` (400 validation, 403 forbidden, 500 server) |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-004: updateInventoryItem
```typescript
export const updateInventoryItem = (
  accessToken: string,
  itemId: string,
  payload: UpsertInventoryItemPayload,
) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-004 |
| **Nombre** | `updateInventoryItem` |
| **Archivo:Línea** | `inventory.ts:103-112` |
| **Callers** | `InventarioScreen.handleSave()` cuando `editingItem` (línea 473) |
| **HTTP Method** | `PATCH` |
| **URL** | `/api/inventory/items/:itemId` |
| **Query Params** | Ninguno |
| **Request Body** | `UpsertInventoryItemPayload` (campos parciales) |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ item: InventoryItem }` |
| **TypeScript Type** | `InventoryItem` |
| **Error Mapping** | `ApiError` (404 not found, 400 validation, 403 forbidden) |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-005: deleteInventoryItem
```typescript
export const deleteInventoryItem = (accessToken: string, itemId: string) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}`, {
    method: 'DELETE',
    accessToken,
  });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-005 |
| **Nombre** | `deleteInventoryItem` |
| **Archivo:Línea** | `inventory.ts:114-118` |
| **Callers** | `InventarioScreen.handleDelete()` → `mutateItem()` (línea 507) |
| **HTTP Method** | `DELETE` |
| **URL** | `/api/inventory/items/:itemId` |
| **Query Params** | Ninguno |
| **Request Body** | Ninguno |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ item: InventoryItem }` (item con `deleted_at` seteado) |
| **TypeScript Type** | `InventoryItem` |
| **Error Mapping** | `ApiError` |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-006: addInventoryQuantity
```typescript
export const addInventoryQuantity = (accessToken: string, itemId: string, quantityDelta = 1) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}/add`, {
    method: 'POST',
    accessToken,
    body: { quantity_delta: quantityDelta },
  });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-006 |
| **Nombre** | `addInventoryQuantity` |
| **Archivo:Línea** | `inventory.ts:120-125` |
| **Callers** | `InventarioScreen` render: `onAdd={() => accessToken && void mutateItem(item, () => addInventoryQuantity(accessToken, item.id, 1))}` (línea 639) |
| **HTTP Method** | `POST` |
| **URL** | `/api/inventory/items/:itemId/add` |
| **Query Params** | Ninguno |
| **Request Body** | `{ quantity_delta: number }` (default 1) |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ item: InventoryItem }` (item actualizado) |
| **TypeScript Type** | `InventoryItem` |
| **Error Mapping** | `ApiError` |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-007: consumeInventoryQuantity
```typescript
export const consumeInventoryQuantity = (accessToken: string, itemId: string, quantityDelta = 1) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}/consume`, {
    method: 'POST',
    accessToken,
    body: { quantity_delta: quantityDelta },
  });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-007 |
| **Nombre** | `consumeInventoryQuantity` |
| **Archivo:Línea** | `inventory.ts:127-132` |
| **Callers** | `InventarioScreen` render: `onConsume={() => accessToken && void mutateItem(item, () => consumeInventoryQuantity(accessToken, item.id, 1))}` (línea 640) |
| **HTTP Method** | `POST` |
| **URL** | `/api/inventory/items/:itemId/consume` |
| **Query Params** | Ninguno |
| **Request Body** | `{ quantity_delta: number }` (default 1) |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ item: InventoryItem }` |
| **TypeScript Type** | `InventoryItem` |
| **Error Mapping** | `ApiError` |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-008: markInventoryItemOutOfStock
```typescript
export const markInventoryItemOutOfStock = (accessToken: string, itemId: string) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}/out-of-stock`, {
    method: 'POST',
    accessToken,
  });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-008 |
| **Nombre** | `markInventoryItemOutOfStock` |
| **Archivo:Línea** | `inventory.ts:134-138` |
| **Callers** | `InventarioScreen.handleMarkOutOfStock()` → `mutateItem()` (línea 520, 641) |
| **HTTP Method** | `POST` |
| **URL** | `/api/inventory/items/:itemId/out-of-stock` |
| **Query Params** | Ninguno |
| **Request Body** | Ninguno |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ item: InventoryItem }` (quantity=0) |
| **TypeScript Type** | `InventoryItem` |
| **Error Mapping** | `ApiError` |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-009: getInventoryAlerts
```typescript
export const getInventoryAlerts = (accessToken: string) =>
  requestJson<{ alerts: InventoryAlerts }>('/api/inventory/alerts', { accessToken });
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-009 |
| **Nombre** | `getInventoryAlerts` |
| **Archivo:Línea** | `inventory.ts:140-141` |
| **Callers** | `useHomeInventoryAlerts.refresh()` (HomePlannerSections.tsx:156) — usado en Home screen |
| **HTTP Method** | `GET` |
| **URL** | `/api/inventory/alerts` |
| **Query Params** | Ninguno |
| **Request Body** | Ninguno |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ alerts: InventoryAlerts }` (línea 63-71) |
| **TypeScript Type** | `InventoryAlerts` |
| **Error Mapping** | `ApiError` → `setAlerts(null)` en hook (línea 159) |
| **Retry Behavior** | Ninguno (pero `useFocusEffect` re-intenta al focus) |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-010: listInventoryRestockRequests
```typescript
export const listInventoryRestockRequests = (accessToken: string, status?: InventoryRestockRequestStatus) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return requestJson<{ requests: InventoryRestockRequest[] }>(`/api/inventory/restock-requests${query}`, {
    accessToken,
  });
};
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-010 |
| **Nombre** | `listInventoryRestockRequests` |
| **Archivo:Línea** | `inventory.ts:143-148` |
| **Callers** | `InventarioScreen.refresh()` (línea 353: `status='pending'`), `useHomeInventoryAlerts` → backend `getAlerts` llama internamente |
| **HTTP Method** | `GET` |
| **URL** | `/api/inventory/restock-requests` + `?status=pending` |
| **Query Params** | `status` (optional: `'pending' \| 'approved' \| 'rejected' \| 'cancelled'`) |
| **Request Body** | Ninguno |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ requests: InventoryRestockRequest[] }` |
| **TypeScript Type** | `InventoryRestockRequest[]` (línea 44-61) |
| **Error Mapping** | `ApiError` |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-011: approveInventoryRestockRequest
```typescript
export const approveInventoryRestockRequest = (
  accessToken: string,
  requestId: string,
  payload: ApproveRestockRequestPayload = {},
) =>
  requestJson<{ request: InventoryRestockRequest; task: unknown }>(
    `/api/inventory/restock-requests/${requestId}/approve`,
    {
      method: 'POST',
      accessToken,
      body: payload,
    },
  );
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-011 |
| **Nombre** | `approveInventoryRestockRequest` |
| **Archivo:Línea** | `inventory.ts:150-162` |
| **Callers** | `InventarioScreen.handleApproveRequest()` (línea 530) |
| **HTTP Method** | `POST` |
| **URL** | `/api/inventory/restock-requests/:requestId/approve` |
| **Query Params** | Ninguno |
| **Request Body** | `ApproveRestockRequestPayload` (línea 82-88): `title?`, `description?`, `priority?`, `assigned_to_member_id?`, `requires_verification?` |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ request: InventoryRestockRequest, task: unknown }` |
| **TypeScript Type** | `{ request: InventoryRestockRequest; task: unknown }` |
| **Error Mapping** | `ApiError` (403 not approver, 409 not pending, 404 not found) |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-012: rejectInventoryRestockRequest
```typescript
export const rejectInventoryRestockRequest = (accessToken: string, requestId: string) =>
  requestJson<{ request: InventoryRestockRequest }>(
    `/api/inventory/restock-requests/${requestId}/reject`,
    {
      method: 'POST',
      accessToken,
    },
  );
```

| Propiedad | Valor |
|-----------|-------|
| **SERVICE_ID** | SERVICE-INV-012 |
| **Nombre** | `rejectInventoryRestockRequest` |
| **Archivo:Línea** | `inventory.ts:164-171` |
| **Callers** | `InventarioScreen.handleRejectRequest()` (línea 545) |
| **HTTP Method** | `POST` |
| **URL** | `/api/inventory/restock-requests/:requestId/reject` |
| **Query Params** | Ninguno |
| **Request Body** | Ninguno |
| **Auth Mechanism** | Bearer token |
| **Expected Response** | `{ request: InventoryRestockRequest }` (status='rejected') |
| **TypeScript Type** | `InventoryRestockRequest` |
| **Error Mapping** | `ApiError` (403, 409, 404) |
| **Retry Behavior** | Ninguno |
| **Timeout** | Default `fetch` |

---

### SERVICE-INV-013: (Internal) requestJson — Base API Client
```typescript
// En api.ts (no inventory.ts pero usado por todos)
export const requestJson = async <T>(url: string, options: RequestOptions = {}): Promise<T>
```

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `front/mi-front-limpio/services/api.ts` |
| **Función** | Wrapper `fetch` con auth header, error parsing, JSON response |
| **Auth** | `headers.Authorization = 'Bearer ' + accessToken` |
| **Error handling** | Si `!res.ok` → parse JSON → throw `ApiError` con `message`, `code`, `status` |
| **Timeout** | No implementado (native fetch sin timeout) |
| **Retry** | No implementado |

---

## Trace: SURFACE → CONTROL → HANDLER → SERVICE → REQUEST

| SURFACE_ID | CONTROL_ID | HANDLER | SERVICE_ID | REQUEST |
|------------|------------|---------|------------|---------|
| INV-SURF-001 (Loading) | - | `refresh()` | SERVICE-INV-001, 002, 010 | GET /templates, GET /items, GET /restock-requests?status=pending |
| INV-SURF-006 (Loaded) | INV-CTL-006 (Pull refresh) | `handleRefresh()` → `refresh(false)` | SERVICE-INV-001, 002, 010 | Same as above |
| INV-SURF-014 (ItemCard) | INV-CTL-007 (-) | `mutateItem(item, consumeInventoryQuantity)` | SERVICE-INV-007 | POST /items/:id/consume {quantity_delta:1} |
| INV-SURF-014 | INV-CTL-008 (+) | `mutateItem(item, addInventoryQuantity)` | SERVICE-INV-006 | POST /items/:id/add {quantity_delta:1} |
| INV-SURF-014 | INV-CTL-009 (Sin stock) | `handleMarkOutOfStock` → `mutateItem(markInventoryItemOutOfStock)` | SERVICE-INV-008 | POST /items/:id/out-of-stock |
| INV-SURF-014 | INV-CTL-010 (Editar) | `openEdit` → `handleSave` → `updateInventoryItem` | SERVICE-INV-004 | PATCH /items/:id {payload} |
| INV-SURF-014 | INV-CTL-011 (Eliminar) | `handleDelete` → `mutateItem(deleteInventoryItem)` | SERVICE-INV-005 | DELETE /items/:id |
| INV-SURF-009/010 (Modal) | INV-CTL-019 (Crear/Guardar) | `handleSave` → `createInventoryItem` / `updateInventoryItem` | SERVICE-INV-003 / 004 | POST /items / PATCH /items/:id |
| INV-SURF-008 (QuickAdd) | INV-CTL-020 (Template chip) | `openTemplate` → `handleSave` → `createInventoryItem` | SERVICE-INV-003 | POST /items (con template_id) |
| INV-SURF-011 (Restock) | INV-CTL-021 (Enviar) | `handleApproveRequest` → `approveInventoryRestockRequest` | SERVICE-INV-011 | POST /restock-requests/:id/approve {payload} |
| INV-SURF-011 | INV-CTL-022 (✕) | `handleRejectRequest` → `rejectInventoryRestockRequest` | SERVICE-INV-012 | POST /restock-requests/:id/reject |
| INV-SURF-016 (Home) | INV-CTL-002 (Card tap) | `navigation.navigate` | - | - |
| Home (useHomeInventoryAlerts) | - | `refresh()` | SERVICE-INV-009 | GET /alerts |

---

## Tipos TypeScript exportados (Contrato de datos)

```typescript
// inventory.ts líneas 3-71
export type InventoryCategoryKey = 'kitchen' | 'bathroom' | 'cleaning' | 'tools' | 'medication' | 'pets' | 'general';

export type InventoryTemplate = {
  id: string;
  key: string;
  name: string;
  emoji: string | null;
  category_key: InventoryCategoryKey;
  default_quantity: number;
  default_low_stock_threshold: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type InventoryItem = {
  id: string;
  household_id: string;
  template_id: string | null;
  name: string;
  emoji: string | null;
  category_key: InventoryCategoryKey;
  quantity: number;
  low_stock_threshold: number;
  is_out_of_stock: boolean;           // generated column (quantity <= 0)
  created_by_person_id: string | null;
  updated_by_person_id: string | null;
  deleted_at: string | null;          // soft delete
  created_at: string;
  updated_at: string;
};

export type InventoryRestockRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type InventoryRestockRequest = {
  id: string;
  household_id: string;
  inventory_item_id: string | null;
  status: InventoryRestockRequestStatus;
  suggested_title: string;
  suggested_description: string | null;
  requested_by_person_id: string | null;
  approved_by_person_id: string | null;
  assigned_to_person_id: string | null;
  planner_task_id: string | null;     // FK a planner_tasks
  created_at: string;
  updated_at: string;
  item?: Pick<InventoryItem, 'id'|'name'|'emoji'|'quantity'|'low_stock_threshold'|'is_out_of_stock'|'deleted_at'> | null;
};

export type InventoryAlerts = {
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_restock_requests_count: number;
  low_stock_items: InventoryItem[];
  out_of_stock_items: InventoryItem[];
  pending_restock_requests: InventoryRestockRequest[];
};

export type UpsertInventoryItemPayload = {
  template_id?: string | null;
  name?: string;
  emoji?: string | null;
  category_key?: InventoryCategoryKey;
  quantity?: number;
  low_stock_threshold?: number;
};

export type ApproveRestockRequestPayload = {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigned_to_member_id?: string;
  requires_verification?: boolean;
};
```

---

## Resumen cuantitativo

| Métrica | Valor |
|---------|-------|
| Servicios exportados | 12 (1 base `requestJson` + 11 inventory-specific) |
| Endpoints únicos llamados | 10 (templates, items×4, alerts, restock-requests×3, approve, reject) |
| Métodos HTTP | GET (4), POST (5), PATCH (1), DELETE (1) |
| Tipos TypeScript | 7 tipos principales + 2 payloads |
| Callers únicos | 2 pantallas (InventarioScreen, HomePlannerSections) + 1 hook |
| Error handling | Uniforme vía `ApiError` |
| Retry/Timeout | **Ninguno** en capa de servicio |