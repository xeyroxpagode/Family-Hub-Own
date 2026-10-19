# 07_INVENTORY_NAVIGATION_MAP.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Reconstrucción completa de navegación hacia/desde Inventory

### Estructura de navegadores (jerarquía)

```
AppNavigator (root)
├── AuthStack (no session)
└── PrivateNavigator (session)
    └── PrivateStack
        ├── ExperienceShell / ExperienceSelector
        ├── HomeTabs (Tab.Navigator) ← MAIN TABS
        │   ├── HomeTab (HomeScreen → HomeCoordinador/Adulto/Adolescente/AdultoMayor)
        │   ├── FamilyTab (FamilyScreen)
        │   ├── QuickActionTab (placeholder, abre PlannerSheetHost)
        │   ├── PlannerTab (PlannerStack.Navigator)
        │   │   ├── PlannerHome (PlannerScreen)
        │   │   ├── CreateTask, EditTask, CreateEvent, EditEvent, CreateGoal...
        │   │   └── ... (20+ planner screens)
        │   └── MoreTab (MoreStack.Navigator) ← INVENTORY AQUÍ
        │       ├── MoreHome (MoreScreen) ← ENTRY POINT 1
        │       ├── Family (FamilyScreen)
        │       ├── HomeCloud, HomeCloudFilesTrash, HomeCloudScanner, ScannerImageEditor
        │       ├── Inventory (InventarioScreen) ← TARGET ROUTE
        │       ├── Finance, FinanceAccounts, FinancePapelera, FinancePoolManagement...
        │       └── Presence
        ├── ProfileScreen
        ├── FeedFamiliar
        └── Fallbacks (PendingApproval, HouseholdSelection, AccessSuspended)
```

---

### Entry Points hacia Inventory

#### EP-INV-001: MoreScreen → Inventory (Principal)
- **Desde**: `MoreScreen` (MoreTab → MoreStack → MoreHome)
- **Componente**: `MODULES` array entry `id: 'inventory'` (MoreScreen.tsx:43-52)
- **Trigger**: Tap en `InteractivePressable` (línea 76-96)
- **Handler**: `handleModulePress('Inventory')` → `navigation.navigate('Inventory')` (línea 58-63)
- **Navigation action**: `MoreStack.Navigator` push `Inventory` screen
- **Route params**: Ninguno
- **Condición**: Usuario autenticado + hogar activo (PrivateNavigator montado)
- **Back behavior**: Back button / gesture → vuelve a MoreHome (MoreStack)
- **Deep link**: No hay deep link directo a Inventory (solo vía MoreTab)

#### EP-INV-002: Home Urgency Card → Inventory (Cross-domain)
- **Desde**: `HomePlannerSections` → `InventoryUrgencyCard` (HomePlannerSections.tsx:366)
- **Trigger**: Tap en `AppCard` con `onPress` (línea 100, 366)
- **Handler**: `navigation.navigate('MoreTab', { screen: 'Inventory' })`
- **Navigation action**: 
  1. `HomeTabNavigator` → `Tab.Navigator` → `navigation.navigate('MoreTab', ...)`
  2. `MoreTab` screen = `MoreStackScreen`
  3. `MoreStack.Navigator` → navigate to `Inventory` screen
- **Route params**: `{ screen: 'Inventory' }` pasado como params al tab MoreTab
- **Condición**: `urgentCount > 0` (hay alertas de stock)
- **Back behavior**: Back → MoreStack → MoreHome → MoreTab → HomeTabs (tab activo)

#### EP-INV-003: Quick Actions (Potencial — no implementado)
- **Desde**: `QuickActionTab` (floating action button en tab bar)
- **Estado actual**: `QuickActionPlaceholder` retorna `null` (HomeTabNavigator.tsx:266-268)
- **No hay navegación a Inventory desde Quick Actions hoy**

#### EP-INV-004: Deep Links (No implementado)
- **Esquema**: No hay `plannerDeepLinkProvider` ni `plannerDeepLinkParser` para Inventory
- **Rutas registradas**: Solo Planner screens en `plannerDeepLinkTypes.ts`

---

### Exit Points desde Inventory

#### EX-INV-001: Back Navigation (Más común)
- **Desde**: `InventarioScreen` (MoreStack → Inventory)
- **Trigger**: Hardware back (Android), swipe back (iOS), header back (no hay header visible)
- **Acción**: `MoreStack` pop → `MoreHome` (MoreScreen)
- **Estado preservado**: `InventarioScreen` permanece montado en stack (no se desmonta)
- **Al volver**: `useFocusEffect` → `refresh()` (línea 367-371)

#### EX-INV-002: Tab Switch (Bottom Navigation)
- **Desde**: `InventarioScreen` (MoreTab activo)
- **Trigger**: Tap en otro tab (HomeTab, FamilyTab, PlannerTab, QuickActionTab)
- **Acción**: `Tab.Navigator` cambia `state.index` → `MoreTab` se desactiva
- **Estado**: Screen permanece montado (React Navigation default)
- **Al volver a MoreTab**: `useFocusEffect` → `refresh()`

#### EX-INV-003: Logout / Session Expiry
- **Desde**: Cualquier screen en PrivateNavigator
- **Trigger**: `AuthContext` detecta `!session` → `AppNavigator` muestra `AuthStack`
- **Acción**: `PrivateNavigator` se desmonta completamente → `PrivateStack` unmount → `HomeTabNavigator` unmount → `MoreStack` unmount → `InventarioScreen` unmount
- **Cleanup**: `useEffect` return → `supabase.removeChannel(channel)` (línea 400-402)

#### EX-INV-004: Household Switch
- **Desde**: `InventarioScreen` (cualquier screen)
- **Trigger**: `HouseholdSwitcherSheet` → `HouseholdContext` actualiza `currentHousehold`
- **Acción**: `useEffect` cleanup old channel + setup new channel + `refresh(false)` (línea 373-403)
- **Screen NO se desmonta** — solo actualiza datos

---

### Parámetros de ruta (Route Params)

| Ruta | Params | Usado por |
|------|--------|-----------|
| `MoreTab` → `Inventory` | Ninguno | - |
| `MoreTab` (desde Home) | `{ screen: 'Inventory' }` | `MoreStackScreen` recibe params y navega internamente |
| `Inventory` screen | Ninguno | `InventarioScreen` no usa `route.params` |

**Nota**: `InventarioScreen` no lee `route.params` — toda la configuración viene de contextos (`useAuth`, `useHousehold`) y estado local.

---

### Navegación condicional

| Condición | Comportamiento |
|-----------|----------------|
| `!session` | `AppNavigator` → `AuthStack` (Inventory inaccesible) |
| `session` pero `!currentHousehold` | `PrivateNavigator` → `HouseholdSelectionFallbackScreen` / `AccessSuspendedFallbackScreen` |
| `currentRole` = 'adolescente' / 'adulto_mayor' | Pueden acceder a Inventory (MoreTab visible para todos), pero `canApproveRestock=false` |
| `currentHousehold` change | Screen no remounta; realtime re-suscribe + refresh |

---

### Integración con Bottom Navigation

- **Tab principal**: `MoreTab` (icon: `ellipsis-horizontal`, label: "Más")
- **Registro**: `MAIN_NAVIGATION_ITEMS.MoreTab` (HomeTabNavigator.tsx:174)
- **TabBar**: `MainFloatingTabBar` → `FloatingNavigationBar` (HomeTabNavigator.tsx:270-313)
- **Accesibilidad**: `tabBarAccessibilityLabel: 'Más'` (línea 430)
- **Orden**: 5to tab (después de Home, Family, QuickAction, Planner)

---

### Navegación indirecta (Cross-domain)

| Origen | Destino | Mecanismo |
|--------|---------|-----------|
| Home (InventoryUrgencyCard) | MoreTab > Inventory | `navigation.navigate('MoreTab', {screen:'Inventory'})` |
| Planner (task completion) | Inventory | **NO EXISTE** — completar tarea Planner no navega a Inventory |
| Inventory (approve restock) | Planner (task created) | Alert "Tarea creada. La reposicion fue enviada al Calendario." — NO navega automáticamente |
| Finance / HomeCloud / Presence | Inventory | Solo vía MoreScreen (mismo nivel) |

---

### Deep Links / Universal Links

- **No hay deep links para Inventory** en `plannerDeepLinkTypes.ts` ni `plannerDeepLinkParser.ts`
- **No hay `Linking` handlers** para `inventory://` o `homeplus://inventory`
- **Web fallback**: No aplicable (React Native app)

---

### Resumen de rutas registradas

| Navigator | Screen Name | Component | Params |
|-----------|-------------|-----------|--------|
| `MoreStack` | `MoreHome` | `MoreScreen` | - |
| `MoreStack` | `Inventory` | `InventarioScreen` | - |
| `MoreStack` | `Finance` | `FinanceScreen` | - |
| `MoreStack` | `HomeCloud` | `HomeCloudScreen` | - |
| `MoreStack` | `Family` | `FamilyScreen` | - |
| `MoreStack` | `Presence` | `PresenceScreen` | - |
| `MoreStack` | `HomeCloudFilesTrash` | `HomeCloudFilesTrashScreen` | - |
| `MoreStack` | `HomeCloudScanner` | `HomeCloudScannerScreen` | - |
| `MoreStack` | `ScannerImageEditor` | `ScannerImageEditorScreen` | (fullScreenModal) |
| `MoreStack` | `FinanceAccounts` | `FinanceAccountsScreen` | - |
| `MoreStack` | `FinancePapelera` | `FinancePapeleraScreen` | - |
| `MoreStack` | `FinancePoolManagement` | `FinancePoolManagementScreen` | - |
| `MoreStack` | `FinanceSpendingLimitsManagement` | `FinanceSpendingLimitsManagementScreen` | - |
| `MoreStack` | `FinanceCategoryManagement` | `FinanceCategoryManagementScreen` | - |
| `MoreStack` | `FinanceAnalysisDetail` | `FinanceAnalysisDetailScreen` | - |

---

### Limitaciones de navegación actuales

1. **Sin deep link directo**: No se puede abrir Inventory desde notificación push, widget, o link externo
2. **Sin navegación post-approve**: Al aprobar restock, muestra Alert pero no navega a Planner task creada
3. **Sin breadcrumbs**: No hay indicador visual de "Más > Inventario" en la screen
4. **Stack no resetea al household switch**: Correcto (preserva estado), pero realtime reconecta
5. **MoreStack anidado en Tab**: `Inventory` es push en stack, no tab directo — requiere 2 taps (Más → Inventario)