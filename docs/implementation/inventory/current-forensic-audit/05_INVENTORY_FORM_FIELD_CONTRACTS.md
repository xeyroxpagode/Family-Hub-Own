# 05_INVENTORY_FORM_FIELD_CONTRACTS.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Catálogo de campos de formulario (Modal Create/Edit)

### INV-FIELD-001: Nombre (name)
| Propiedad | Valor |
|-----------|-------|
| **FIELD_ID** | INV-FIELD-001 |
| **SURFACE_ID** | INV-SURF-009 (Create), INV-SURF-010 (Edit) |
| **Label** | "Nombre" |
| **Placeholder** | "Leche" |
| **Control type** | `AppInput` (text) |
| **Keyboard/input type** | Default (text) |
| **Initial value** | Create: `''` / Edit: `item.name` / Template: `template.name` |
| **Default value** | `''` (EMPTY_FORM) |
| **Hydration source** | `form.name` state → `setForm` onChangeText |
| **Required/Optional** | **Required** (validación frontend + backend) |
| **Frontend validation** | `if (!form.name.trim())` → Alert "Falta nombre" (línea 451-454) |
| **Normalization** | `.trim()` en `handleSave` (línea 465) |
| **Transformation** | Ninguna |
| **Backend validation** | `normalizeString(body?.name)` → `if (!name) throw 400 'name es obligatorio.'` (service.js:208-212) |
| **API property** | `name` (string) en payload |
| **DB column** | `inventory_items.name` (text NOT NULL) |
| **DB type** | `text` |
| **Nullable** | NO (CHECK `length(trim(name)) > 0`) |
| **DB default** | N/A |
| **Constraints** | `inventory_items_name_not_empty_check` |
| **Error behavior** | Frontend: Alert bloquea submit. Backend: 400 validation_error. |
| **Dependencies** | Ninguna |
| **Submit behavior** | Incluido en payload `createItem`/`updateItem` |

---

### INV-FIELD-002: Emoji (emoji)
| Propiedad | Valor |
|-----------|-------|
| **FIELD_ID** | INV-FIELD-002 |
| **SURFACE_ID** | INV-SURF-009, INV-SURF-010 |
| **Label** | "Emoji" |
| **Placeholder** | "🥛" |
| **Control type** | `AppInput` (text, width 96) |
| **Keyboard/input type** | Default |
| **Initial value** | Create: `'📦'` / Edit: `item.emoji || '📦'` / Template: `template.emoji || '📦'` |
| **Default value** | `'📦'` (EMPTY_FORM.emoji) |
| **Hydration source** | `form.emoji` state |
| **Required/Optional** | **Optional** |
| **Frontend validation** | Ninguna (acepta string vacío) |
| **Normalization** | `.trim()` → `normalizeNullableString` → `null` si vacío (service.js:19-23, 218) |
| **Transformation** | String → `string | null` |
| **Backend validation** | `normalizeNullableString` → acepta `null` |
| **API property** | `emoji` (string \| null) |
| **DB column** | `inventory_items.emoji` (text NULL) |
| **DB type** | `text` |
| **Nullable** | YES |
| **DB default** | NULL |
| **Constraints** | Ninguna |
| **Error behavior** | Silencioso (vacío → null) |
| **Dependencies** | Ninguna |
| **Submit behavior** | Incluido en payload si presente |

---

### INV-FIELD-003: Cantidad (quantity)
| Propiedad | Valor |
|-----------|-------|
| **FIELD_ID** | INV-FIELD-003 |
| **SURFACE_ID** | INV-SURF-009, INV-SURF-010 |
| **Label** | "Cantidad" |
| **Placeholder** | (vacío, valor por defecto visible) |
| **Control type** | `AppInput` (flex:1) |
| **Keyboard/input type** | `keyboardType="decimal-pad"` |
| **Initial value** | Create: `'1'` / Edit: `formatQuantity(item.quantity)` / Template: `formatQuantity(template.default_quantity)` |
| **Default value** | `'1'` (EMPTY_FORM.quantity) |
| **Hydration source** | `form.quantity` state |
| **Required/Optional** | **Required** (pero tiene default) |
| **Frontend validation** | `Number(form.quantity.replace(',', '.'))` → `!Number.isFinite(quantity) || quantity < 0` → Alert "Cantidad invalida" (línea 456-459) |
| **Normalization** | `replace(',', '.')` → `Number()` |
| **Transformation** | String → `number` |
| **Backend validation** | `parseQuantity(body?.quantity, 'quantity', fallback)` → `Number(value)` → `if (!Number.isFinite(parsed) || parsed < 0) throw 400` (service.js:32-45) |
| **API property** | `quantity` (number) |
| **DB column** | `inventory_items.quantity` (numeric NOT NULL DEFAULT 0) |
| **DB type** | `numeric` |
| **Nullable** | NO |
| **DB default** | `0` |
| **Constraints** | `inventory_items_quantity_check` (`quantity >= 0 AND low_stock_threshold >= 0`) |
| **Error behavior** | Frontend: Alert bloquea. Backend: 400 validation_error. |
| **Dependencies** | `low_stock_threshold` (regla de negocio: threshold ≤ quantity para no alertar) |
| **Submit behavior** | Incluido en payload |

---

### INV-FIELD-004: Umbral bajo stock (low_stock_threshold)
| Propiedad | Valor |
|-----------|-------|
| **FIELD_ID** | INV-FIELD-004 |
| **SURFACE_ID** | INV-SURF-009, INV-SURF-010 |
| **Label** | "Umbral bajo stock" |
| **Placeholder** | (vacío, valor por defecto visible) |
| **Control type** | `AppInput` (full width) |
| **Keyboard/input type** | `keyboardType="decimal-pad"` |
| **Initial value** | Create: `'1'` / Edit: `formatQuantity(item.low_stock_threshold)` / Template: `formatQuantity(template.default_low_stock_threshold)` |
| **Default value** | `'1'` (EMPTY_FORM.low_stock_threshold) |
| **Hydration source** | `form.low_stock_threshold` state |
| **Required/Optional** | **Required** (pero tiene default) |
| **Frontend validation** | Igual que quantity: `Number(...)` → `≥ 0` |
| **Normalization** | `replace(',', '.')` → `Number()` |
| **Transformation** | String → `number` |
| **Backend validation** | `parseQuantity(body?.low_stock_threshold, 'low_stock_threshold', fallback)` → mismo que quantity |
| **API property** | `low_stock_threshold` (number) |
| **DB column** | `inventory_items.low_stock_threshold` (numeric NOT NULL DEFAULT 1) |
| **DB type** | `numeric` |
| **Nullable** | NO |
| **DB default** | `1` |
| **Constraints** | `inventory_items_quantity_check` (`low_stock_threshold >= 0`) |
| **Error behavior** | Frontend: Alert bloquea. Backend: 400 validation_error. |
| **Dependencies** | `quantity` (regla: si `quantity ≤ low_stock_threshold` → alerta low stock / restock request) |
| **Submit behavior** | Incluido en payload |

---

### INV-FIELD-005: Categoría (category_key)
| Propiedad | Valor |
|-----------|-------|
| **FIELD_ID** | INV-FIELD-005 |
| **SURFACE_ID** | INV-SURF-009, INV-SURF-010 |
| **Label** | "Categoria" (renderizado como chips, no input) |
| **Placeholder** | N/A |
| **Control type** | `TouchableOpacity` chips (7 opciones) |
| **Keyboard/input type** | N/A (tap selection) |
| **Initial value** | Create: `category === 'all' ? 'general' : category` / Edit: `item.category_key` / Template: `template.category_key` |
| **Default value** | `'general'` (EMPTY_FORM.category_key) |
| **Hydration source** | `form.category_key` state |
| **Required/Optional** | **Required** (siempre tiene valor) |
| **Frontend validation** | N/A (chips garantizan valor válido) |
| **Normalization** | `validateCategory(body?.category_key ?? template?.category_key)` → default `'kitchen'` → check `CATEGORY_KEYS.includes()` (service.js:47-55) |
| **Transformation** | Chip tap → string key |
| **Backend validation** | `validateCategory` → `if (!CATEGORY_KEYS.includes(category)) throw 400 'category_key invalida.'` |
| **API property** | `category_key` (string) |
| **DB column** | `inventory_items.category_key` (text NOT NULL DEFAULT 'kitchen') |
| **DB type** | `text` |
| **Nullable** | NO |
| **DB default** | `'kitchen'` |
| **Constraints** | Ninguna CHECK en DB (validado en backend) |
| **Error behavior** | Backend: 400 validation_error (frontend no permite inválido) |
| **Dependencies** | `visibleTemplates` se filtra por `category_key` (línea 325-328) |
| **Submit behavior** | Incluido en payload |

---

### INV-FIELD-006: Template ID (template_id) — Hidden field
| Propiedad | Valor |
|-----------|-------|
| **FIELD_ID** | INV-FIELD-006 |
| **SURFACE_ID** | INV-SURF-009 (solo si from template), INV-SURF-010 |
| **Label** | N/A (hidden) |
| **Placeholder** | N/A |
| **Control type** | No UI directo (set via `openTemplate` / `openEdit`) |
| **Keyboard/input type** | N/A |
| **Initial value** | Create libre: `null` / From template: `template.id` / Edit: `item.template_id` |
| **Default value** | `null` (EMPTY_FORM.template_id) |
| **Hydration source** | `form.template_id` state |
| **Required/Optional** | **Optional** |
| **Frontend validation** | N/A |
| **Normalization** | `getTemplate(context.client, templateId)` → valida `is_active=true` (service.js:59-78) |
| **Transformation** | UUID string → UUID \| null |
| **Backend validation** | `getTemplate` → si `!data` → 400 'template_id invalido.' |
| **API property** | `template_id` (string \| null) |
| **DB column** | `inventory_items.template_id` (uuid NULL REFERENCES inventory_item_templates(id) ON DELETE SET NULL) |
| **DB type** | `uuid` |
| **Nullable** | YES |
| **DB default** | NULL |
| **Constraints** | FK `inventory_items_template_id_fkey` |
| **Error behavior** | Backend: 400 si template no existe o inactivo |
| **Dependencies** | Si presente, provee defaults para name, emoji, category_key, quantity, low_stock_threshold |
| **Submit behavior** | Incluido en payload |

---

## Relaciones entre campos y reglas de negocio

### Regla R-QTY-THRESHOLD: Quantity vs Low Stock Threshold
- **Frontend**: No hay validación cruzada en `handleSave` — permite `quantity < low_stock_threshold`
- **Backend**: No hay validación cruzada — ambos validados independientemente `≥ 0`
- **Efecto runtime**: `getItemStatus(item)` (línea 92-96) calcula:
  - `quantity ≤ 0` → `'out'`
  - `quantity ≤ low_stock_threshold` → `'low'`
  - else → `'ok'`
- **Side effect**: `ensureRestockRequest()` se dispara tras create/update/quantity changes si `quantity ≤ low_stock_threshold` Y `deleted_at IS NULL` Y no existe request `pending`

### Regla R-TEMPLATE-DEFAULTS: Template → Form Hydration
- **Flujo**: `openTemplate(template)` (línea 412-423) → setea `form` con:
  - `template_id: template.id`
  - `name: template.name`
  - `emoji: template.emoji || '📦'`
  - `category_key: template.category_key`
  - `quantity: formatQuantity(template.default_quantity)`
  - `low_stock_threshold: formatQuantity(template.default_low_stock_threshold)`
- **Backend create**: Si `template_id` presente, usa `template.default_quantity` y `template.default_low_stock_threshold` como fallback (service.js:220-225)

### Regla R-EDIT-PRESERVES: Edit mantiene template_id
- **Flujo**: `openEdit(item)` (línea 425-436) → `form.template_id = item.template_id`
- **Backend update**: `buildItemPatch` solo incluye campos presentes en body (línea 246-274) — `template_id` NO editable via API (no hay `hasOwn(body, 'template_id')`)

### Regla R-CATEGORY-TEMPLATES: Category → visibleTemplates
- **Frontend**: `visibleTemplates = category === 'all' ? [] : templates.filter(t => t.category_key === category).slice(0, 8)` (línea 325-328)
- **Efecto**: QuickAddSection solo muestra templates de la categoría activa (o nada si 'all')

---

## Resumen de campos

| FIELD_ID | Nombre | Tipo UI | Requerido | Backend Required | DB Nullable | Default DB | Default Frontend |
|----------|--------|---------|-----------|------------------|-------------|------------|------------------|
| INV-FIELD-001 | name | AppInput text | ✅ | ✅ | NO | N/A | '' |
| INV-FIELD-002 | emoji | AppInput text | ❌ | ❌ | YES | NULL | '📦' |
| INV-FIELD-003 | quantity | AppInput decimal-pad | ✅ (con default) | ✅ | NO | 0 | '1' |
| INV-FIELD-004 | low_stock_threshold | AppInput decimal-pad | ✅ (con default) | ✅ | NO | 1 | '1' |
| INV-FIELD-005 | category_key | TouchableOpacity chips | ✅ | ✅ | NO | 'kitchen' | 'general' |
| INV-FIELD-006 | template_id | Hidden (state) | ❌ | ❌ | YES | NULL | null |

---

## Validación cruzada frontend vs backend

| Regla | Frontend | Backend | Coincide |
|-------|----------|---------|----------|
| name required | ✅ Alert bloquea | ✅ 400 | ✅ |
| quantity ≥ 0 | ✅ Alert bloquea | ✅ 400 | ✅ |
| threshold ≥ 0 | ✅ Alert bloquea | ✅ 400 | ✅ |
| category válida | ✅ Chips limitan | ✅ 400 | ✅ |
| template_id válido | N/A (no editable) | ✅ 400 si inválido | N/A |
| quantity vs threshold | ❌ No valida | ❌ No valida | ✅ (ambos no validan) |
| emoji opcional | ✅ | ✅ | ✅ |