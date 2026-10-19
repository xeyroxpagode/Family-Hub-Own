# 17_INVENTORY_HOME_INTEGRATION.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Auditoría específica: Representación de Inventory en Home

### Surface: `InventoryUrgencyCard` (INV-SURF-016)

**Archivo:** `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` líneas 72-118  
**Componente:** `InventoryUrgencyCard` (inline function component)  
**Parent:** `HomePlannerSections` → renderizado en `HomeAdulto`, `HomeCoordinador`, `HomeAdolescente`, `HomeAdultoMayor`

---

### Datos consumidos

| Fuente | Hook/Service | Endpoint | Frecuencia |
|--------|--------------|----------|------------|
| `useHomeInventoryAlerts` (línea 184) | Custom hook en `HomePlannerSections.tsx:145-172` | `GET /api/inventory/alerts` (SERVICE-INV-009) | `useFocusEffect` al focus Home + manual retry |

**Hook implementation:**
```javascript
function useHomeInventoryAlerts() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await getInventoryAlerts(accessToken);
      setAlerts(response.alerts);
    } catch {
      setAlerts(null);  // Silencioso — no muestra error en Home
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { alerts, loading, refresh };
}
```

---

### Condición de render

```javascript
// Líneas 81-87
if (!alerts) return null;

const urgentCount = alerts.low_stock_count
  + alerts.out_of_stock_count
  + alerts.pending_restock_requests_count;

if (urgentCount === 0) return null;  // INV-SURF-017: Hidden state
```

**Solo renderiza si hay al menos 1 alerta** (low stock, out of stock, o restock pending).

---

### Layout y Copy

```jsx
<AppCard variant="warning" padding="default" highlighted style={styles.card} onPress={onPress}>
  <View style={styles.cardHeader}>
    <View style={styles.cardHeaderIcon}>
      <HomePlusIcon name="archive" color={colors.warning.base} size={18} />
    </View>
    <AppText variant="title3" tone={dark ? 'inverse' : 'warning'}>
      Inventario
    </AppText>
    <StatusBadge label="Ver" tone="warning" />
  </View>
  <AppText variant="bodySmall" tone="secondary" weight="700">
    {headline}
  </AppText>
  <AppText variant="caption" tone="tertiary">
    {alerts.out_of_stock_count} sin stock - {alerts.low_stock_count} bajo stock - {alerts.pending_restock_requests_count} por aprobar
  </AppText>
</AppCard>
```

**Headline logic** (líneas 93-97):
```javascript
const headline = firstOut
  ? `Sin stock: ${firstOut.name}`
  : firstLow
    ? `Stock crítico: ${firstLow.name}`
    : `${alerts.pending_restock_requests_count} reposición pendiente`;
```

**Prioridad visual**: Out of stock > Low stock > Pending restocks

---

### Navegación

```javascript
onPress={() => navigation.navigate('MoreTab', { screen: 'Inventory' })}
```
- Navega a `MoreTab` → `MoreStack` → `Inventory` screen
- **Deep link params**: `{ screen: 'Inventory' }` pasado a MoreTab

---

### Loading/Error/Refresh behavior

| Estado | Comportamiento |
|--------|----------------|
| **Initial load** | `loading=true` → `refresh()` → `setAlerts(data)` → `loading=false` |
| **Error** | `catch` → `setAlerts(null)` → **card no renderiza** (silencioso) |
| **Refresh** | `useFocusEffect` al focus Home → `refresh()` automático |
| **Pull-to-refresh Home** | `HomePlannerSections` no tiene pull-to-refresh propio; usa `refreshAll` de parent |
| **Household switch** | Hook dependency en `accessToken` (cambia al switch) → re-fetch |

---

### Cross-refresh: Inventory mutation → Home update

**Flujo actual:**
1. Usuario en Inventory: hace +1 quantity / aprueba restock / etc.
2. `mutateItem` → `refresh(false)` → actualiza `InventarioScreen` local
3. **Realtime**: `supabase.channel` en `InventarioScreen` dispara `refresh(false)` 
4. **PERO**: `HomePlannerSections` tiene su **propio hook** `useHomeInventoryAlerts` con **su propia suscripción realtime** — **NO LA TIENE**

**Gap identificado**: `useHomeInventoryAlerts` **NO se suscribe a realtime**. Solo hace `refresh()` en `useFocusEffect`.

**Resultado**: 
- Usuario está en Home → ve `InventoryUrgencyCard` con datos
- Usuario va a Inventory (otro tab), hace cambios, vuelve a Home
- **Home NO se actualiza automáticamente** — solo al re-focus (tab switch) o pull-to-refresh manual

**Evidencia**: `useHomeInventoryAlerts` (líneas 145-172) no tiene `useEffect` con `supabase.channel`. Solo `useFocusEffect`.

---

### Permisos

| Nivel | Verificación |
|-------|--------------|
| **Frontend** | `HomePlannerSections` renderizado para todos los roles (HomeAdulto, HomeCoordinador, etc.) |
| **Backend** | `GET /api/inventory/alerts` → `getAlerts` → `listItems` + `listRestockRequests` → RLS `is_active_household_member` |
| **RLS** | `inventory_items_select_active_household` + `inventory_restock_select_active_household` |
| **Roles** | Todos los miembros activos del hogar pueden ver alertas |

---

### Integración en HomeAdulto / HomeCoordinador

**HomeAdulto.tsx:117** → `<HomePlannerSections />` (línea 117)
**HomeCoordinador.tsx:39** → `<HomePlannerSections />` (línea 39)
**HomeAdolescente** / **HomeAdultoMayor** → asumen mismo patrón (no leídos pero importan HomePlannerSections)

---

### Resumen de estados en Home

| Estado | Card renderizada? | Datos |
|--------|-------------------|-------|
| Sin alertas (`urgentCount===0`) | ❌ NO (INV-SURF-017) | - |
| Hay alertas + loading | ❌ NO (`!alerts` return null) | Skeleton/loading en parent |
| Hay alertas + error | ❌ NO (`setAlerts(null)` en catch) | Silencioso |
| Hay alertas + data | ✅ SÍ (INV-SURF-016) | Counts + primer item crítico |

---

### Gaps y limitaciones

1. **NO realtime en Home** — `useHomeInventoryAlerts` no se suscribe a `postgres_changes`. Solo refresh al focus.
2. **Error silencioso** — si `/alerts` falla, card desaparece sin feedback al usuario.
3. **No hay acciones directas** — solo "Ver" navega a Inventory. No quick actions (ej: "Comprar ya" desde Home).
4. **Prioridad fija** — Out of stock > Low stock > Pending. No configuración por usuario.
5. **Solo top 1 item** — muestra solo primer out-of-stock o low-stock, no lista.
6. **Counts truncados** — `alerts` trae top 5 por categoría pero card solo usa counts totales + primer item.