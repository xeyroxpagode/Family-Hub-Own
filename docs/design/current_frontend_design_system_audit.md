# Current Frontend Design System Audit — HomePlus

## 1. Resumen ejecutivo

**Nivel de consistencia actual:** 6.5/10

El frontend de HomePlus cuenta con un sistema de diseño bien estructurado en `constants/theme.ts` con tokens completos de colores, tipografía, espaciado, bordes y sombras. Sin embargo, existe una **inconsistencia significativa** en la aplicación de estos tokens a través de las pantallas.

### Pantallas más logradas
| Pantalla | Archivo | Razón |
|----------|---------|-------|
| FamilyScreen | `screens/FamilyScreen.tsx` | Usa componentes UI (`AppCard`, `AppText`, `AppButton`) y tokens de tema consistentemente |
| HomeAdulto | `screens/home/HomeAdulto.tsx` | Integra `AppScreen`, `AppCard`, `AppText`, `ActionPill` con tokens |
| CalendarScreen | `screens/calendar/CalendarScreen.tsx` | Tema por rol implementado correctamente (adulto, adolescente, adulto_mayor) |
| Planner screens | `screens/planner/*` | Usa `plannerShared.ts` con estilos consistentes basados en theme tokens |

### Pantallas más débiles
| Pantalla | Archivo | Problemas principales |
|----------|---------|----------------------|
| Splash | `screens/Splash.tsx` | Valores hardcodeados: `#C17F59`, `#CD7353`, `#1A1714`, `fontSize: 34`, `borderRadius: 12` |
| Login | `screens/Login.tsx` | Hardcodea colores y tamaños en lugar de usar tokens |
| Registro | `screens/Registro.tsx` | Mismos problemas que Login |
| CrearGrupo | `screens/CrearGrupo.tsx` | Usa `#CD7353` en lugar de `colors.terracotta[500]` (`#C17F59`) |
| InvitarPersonas | `screens/InvitarPersonas.tsx` | Valores hardcodeados en StyleSheet |
| JoinHousehold | `screens/JoinHousehold.tsx` | Hardcodea `#CD7353`, `#7C9E7A`, `fontSize: 24` |

### Problemas principales
1. **Dos tonos de terracotta en uso:** `#C17F59` (theme) vs `#CD7353` (usado en múltiples pantallas)
2. **Fondos inconsistentes:** `#FBFAF8`, `#FAFAF8`, `#F9F8F4`, `#FFFAF5`
3. **Tamaños de título variables:** 26px, 27px, 28px en lugar de usar `typography.title1` (28px)
4. **Border radius inconsistentes:** 12px, 14px, 16px para elementos similares
5. **Muchas pantallas no importan ni usan tokens de theme.ts**

### Oportunidad de unificación
El sistema de tokens existe y está bien diseñado. Solo requiere:
- Refactorización sistemática de pantallas para usar tokens
- Establecer regla de "no hardcodear valores de diseño"
- Crear componentes base que encapsulen estilos comunes

---

## 2. Mapa de pantallas auditadas

| Pantalla | Archivo | Propósito | Estilo visual | Calidad | Problemas | Recomendación |
|----------|---------|-----------|---------------|---------|-----------|---------------|
| P00Splash | `screens/Splash.tsx` | Pantalla de inicio | Teracotta/crema, centrado | Media | Hardcodea colores y tamaños | Usar theme tokens |
| P01Registro | `screens/Registro.tsx` | Registro usuario | Similar a Login | Media | Hardcodea valores | Refactorizar con AppInput/AppButton |
| Login | `screens/Login.tsx` | Inicio sesión | Teracotta/crema | Media | Hardcodea valores | Refactorizar con componentes UI |
| ForgotPassword | `screens/ForgotPassword.tsx` | Recuperar contraseña | Similar a Login | Media | Hardcodea valores | Usar componentes reutilizables |
| UpdatePassword | `screens/UpdatePassword.tsx` | Actualizar contraseña | Similar a Login | Media | Hardcodea valores | Usar componentes reutilizables |
| AuthLoading | `screens/AuthLoading.tsx` | Loading auth | Simple | Buena | - | Mantener |
| P02CrearGrupo | `screens/CrearGrupo.tsx` | Crear/join household | Teracotta | Media | Usa `#CD7353` en vez de `#C17F59` | Corregir color |
| P03InvitarPersonas | `screens/InvitarPersonas.tsx` | Invitar miembros | Teracotta/verde/rojo | Media | Hardcodea colores y bordes | Usar AppCard/AppButton |
| JoinHousehold | `screens/JoinHousehold.tsx` | Join por token | Loading/éxito/error | Media | Hardcodea `#CD7353` | Usar theme tokens |
| ProfileScreen | `screens/ProfileScreen.tsx` | Perfil usuario | Teracotta/roles | Buena | Mix theme/hardcodeado | Unificar a theme |
| FamilyScreen | `screens/FamilyScreen.tsx` | Gestión familia | Componentes UI | Excelente | - | Mantener patrón |
| HomeAdulto | `screens/home/HomeAdulto.tsx` | Home adulto | Componentes UI | Excelente | - | Mantener patrón |
| HomeAdolescente | `screens/home/HomeAdolescente.tsx` | Home adolescente | Tema oscuro | Buena | Verificar consistencia | - |
| HomeAdultoMayor | `screens/home/HomeAdultoMayor.tsx` | Home adulto mayor | Grande/accesible | Buena | Verificar consistencia | - |
| HomeCoordinador | `screens/home/HomeCoordinador.tsx` | Home coordinador | Tema oscuro | Buena | Verificar consistencia | - |
| CalendarScreen | `screens/calendar/CalendarScreen.tsx` | Calendario | Tema por rol | Excelente | - | Mantener patrón |
| InventarioScreen | `screens/inventory/InventarioScreen.tsx` | Inventario | Categorías con colores | Buena | Hardcodea algunos valores | Usar theme tokens |
| FeedFamiliarScreen | `screens/feed/FeedFamiliarScreen.tsx` | Feed familiar | - | - | No revisado en detalle | Auditar |
| PlannerScreen | `screens/planner/PlannerScreen.tsx` | Planner principal | Componentes UI | Buena | Usa plannerShared.ts | Mantener patrón |
| PlannerCalendarScreen | `screens/planner/PlannerCalendarScreen.tsx` | Calendario planner | Componentes UI | Buena | Usa plannerShared.ts | Mantener patrón |
| PlannerTasksScreen | `screens/planner/PlannerTasksScreen.tsx` | Tasks planner | Componentes UI | Buena | Usa plannerShared.ts | Mantener patrón |
| CreateEventScreen | `screens/planner/CreateEventScreen.tsx` | Crear evento | Formulario | - | No revisado en detalle | Auditar |
| EditEventScreen | `screens/planner/EditEventScreen.tsx` | Editar evento | Formulario | - | No revisado en detalle | Auditar |
| CreateTaskScreen | `screens/planner/CreateTaskScreen.tsx` | Crear task | Formulario | - | No revisado en detalle | Auditar |
| EditTaskScreen | `screens/planner/EditTaskScreen.tsx` | Editar task | Formulario | - | No revisado en detalle | Auditar |

---

## 3. Paleta de colores actual

### Colores definidos en `constants/theme.ts`

#### Background Colors
| Token | Hex | Uso actual |
|-------|-----|------------|
| `background.base` | `#FBFAF8` | Fondo principal de screens |
| `background.soft` | `#F7F3EE` | Fondos secundarios |
| `background.alt` | `#F5F1EB` | Alternativo |
| `background.cream` | `#F7EFE6` | Acento cálido |

#### Surface Colors
| Token | Hex | Uso actual |
|-------|-----|------------|
| `surface.card` | `#FFFFFF` | Cards elevadas |
| `surface.soft` | `#FFFDF9` | Fondos suaves de inputs |
| `surface.elevated` | `#FFFFFF` | Cards con sombra fuerte |
| `surface.muted` | `#F5F1EB` | Elementos deshabilitados |
| `surface.glass` | `rgba(255, 255, 255, 0.72)` | Efecto glassmorphism |

#### Text Colors
| Token | Hex | Uso actual |
|-------|-----|------------|
| `text.primary` | `#1A1714` | Títulos, texto principal |
| `text.secondary` | `#4A4540` | Texto secundario |
| `text.tertiary` | `#6B6560` | Metadata, labels |
| `text.muted` | `#8A8178` | Texto apagado |
| `text.inverse` | `#FFFFFF` | Sobre fondos oscuros/coloreados |
| `text.disabled` | `rgba(26, 23, 20, 0.42)` | Elementos deshabilitados |

#### Brand Colors (Terracotta - Color primario)
| Token | Hex | Uso actual |
|-------|-----|------------|
| `terracotta.50` | `#FAF3ED` | Fondos suaves |
| `terracotta.100` | `#F2E0D4` | Bordes suaves |
| `terracotta.300` | `#E3BAA0` | Bordes/acentos |
| `terracotta.400` | `#D49B78` | Acentos |
| `terracotta.500` | `#C17F59` | **PRIMARIO** - Botones principales |
| `terracotta.600` | `#A86B45` | Hover/estado activo |
| `terracotta.700` | `#8F5735` | Texto en fondos claros |

#### Status Colors
| Token | Hex | Uso actual |
|-------|-----|------------|
| `success.base` | `#6B9E7A` | Éxito/confirmación |
| `success.soft` | `#E1EFE5` | Fondos de éxito |
| `success.text` | `#558563` | Texto de éxito |
| `warning.base` | `#D4944A` | Advertencia |
| `warning.soft` | `#F7EBDB` | Fondos de advertencia |
| `warning.text` | `#B57930` | Texto de advertencia |
| `danger.base` | `#C46B6B` | Error/peligro |
| `danger.soft` | `#F5E2E2` | Fondos de error |
| `danger.text` | `#A85050` | Texto de error |

#### Border Colors
| Token | Hex | Uso actual |
|-------|-----|------------|
| `border.subtle` | `rgba(56, 45, 38, 0.10)` | Bordes sutiles |
| `border.default` | `#E8E3DC` | Bordes por defecto |
| `border.strong` | `#D5CFC7` | Bordes fuertes |

#### Shadow Colors
| Token | Hex | Uso actual |
|-------|-----|------------|
| `shadow.soft` | `rgba(36, 31, 28, 0.08)` | Sombra suave |
| `shadow.default` | `rgba(36, 31, 28, 0.10)` | Sombra normal |
| `shadow.floating` | `rgba(36, 31, 28, 0.14)` | Elementos flotantes |

### Inconsistencias detectadas

| Color encontrado | Dónde aparece | Debería ser |
|------------------|---------------|-------------|
| `#CD7353` | ProfileScreen, CrearGrupo, InvitarPersonas, Splash, Login, Registro | `colors.terracotta[500]` = `#C17F59` |
| `#1C1C1C` | CalendarScreen, HomeAdulto | `colors.text.primary` = `#1A1714` |
| `#6B6B6B` | CalendarScreen | `colors.text.tertiary` = `#6B6560` |
| `#FAFAF8` | HomeAdulto, InventarioScreen, CalendarScreen | `colors.background.base` = `#FBFAF8` |
| `#F9F8F4` | Varios screens | `colors.background.base` = `#FBFAF8` |
| `#FFFAF5` | JoinHousehold | `colors.background.base` = `#FBFAF8` |

### Propuesta de tokens (ya existen, solo usarlos consistentemente)

```javascript
// Ya definido en constants/theme.ts - NO CAMBIAR, solo usar
colors.background.base      // #FBFAF8
colors.surface.card         // #FFFFFF
colors.text.primary         // #1A1714
colors.terracotta[500]      // #C17F59 (PRIMARIO)
colors.success.base         // #6B9E7A
colors.warning.base         // #D4944A
colors.danger.base          // #C46B6B
```

---

## 4. Tipografía actual

### Definida en `constants/theme.ts`

| Variant | Size | Line Height | Weight | Letter Spacing | Uso recomendado |
|---------|------|-------------|--------|----------------|-----------------|
| `hero` | 34px | 42px | 700 | -0.4 | Splash, screen titles |
| `title1` | 28px | 36px | 700 | -0.2 | Screen titles principales |
| `title2` | 24px | 32px | 700 | - | Section titles, h1 |
| `title3` | 20px | 28px | 700 | - | Subsection titles, h2 |
| `bodyLarge` | 18px | 26px | 400 | - | Texto principal destacado |
| `body` | 16px | 24px | 400 | - | Texto cuerpo estándar |
| `bodySmall` | 14px | 20px | 400 | - | Texto secundario |
| `caption` | 12px | 16px | 500 | - | Labels, metadata |
| `micro` | 11px | 14px | 600 | - | Screen indicators, badges |
| `mono` | 15px | 22px | 500 | - | Códigos, tokens |

### Senior Typography (para adulto_mayor)

| Variant | Size | Line Height |
|---------|------|-------------|
| `hero` | 44px | 52px |
| `title1` | 36px | 44px |
| `title2` | 30px | 38px |
| `title3` | 24px | 32px |
| `bodyLarge` | 22px | 30px |
| `body` | 18px | 26px |
| `bodySmall` | 16px | 24px |
| `caption` | 14px | 20px |
| `micro` | 13px | 18px |

### Inconsistencias detectadas

| Tamaño hardcodeado | Dónde aparece | Debería ser |
|-------------------|---------------|-------------|
| `fontSize: 27` | Login.tsx, Registro.tsx | `typography.title1.fontSize` = 28 |
| `fontSize: 26` | CrearGrupo.tsx | `typography.title1.fontSize` = 28 |
| `fontSize: 22` | ProfileScreen (header) | `typography.title2.fontSize` = 24 |
| `fontWeight: 800` | CalendarScreen, plannerShared.ts | `fontWeight: 700` (coherente con theme) |
| `fontSize: 17` | Splash.tsx (subtitle) | `typography.bodyLarge.fontSize` = 18 |
| `fontSize: 15` | Varios lugares | `typography.body.fontSize` = 16 |

### Propuesta de escala tipográfica

**Ya definida correctamente en theme.ts.** Solo requiere uso consistente:

```javascript
// Para títulos de pantalla
<AppText variant="title1">Mi Título</AppText>

// Para secciones
<AppText variant="title2">Sección</AppText>

// Para cuerpo
<AppText variant="body">Texto principal</AppText>

// Para labels/metadata
<AppText variant="caption">Label</AppText>
```

---

## 5. Espaciado y layout

### Spacing tokens definidos

| Token | Value | Uso común |
|-------|-------|-----------|
| `spacing[0]` | 0px | Sin espacio |
| `spacing[1]` | 4px | Micro espacio |
| `spacing[2]` | 8px | Gap pequeño, padding interno |
| `spacing[3]` | 12px | Gap medio, padding botón |
| `spacing[4]` | 16px | Padding estándar, gap grande |
| `spacing[5]` | 20px | Padding generoso, screen horizontal |
| `spacing[6]` | 24px | Padding grande |
| `spacing[7]` | 28px | Espacio muy grande |
| `spacing[8]` | 32px | Espacio máximo |
| `spacing[10]` | 40px | Secciones |

### Border Radius tokens

| Token | Value | Uso común |
|-------|-------|-----------|
| `radius.none` | 0px | Sin borde redondeado |
| `radius.xs` | 6px | Badges pequeños |
| `radius.sm` | 10px | Inputs pequeños |
| `radius.md` | 14px | Cards pequeñas |
| `radius.lg` | 18px | **Botones, inputs estándar** |
| `radius.xl` | 24px | **Cards principales** |
| `radius.xxl` | 32px | Sheet panels |
| `radius.pill` | 999px | Chips, pills, icon buttons |

### Shadows definidas

| Token | shadowOpacity | shadowRadius | elevation | Uso |
|-------|---------------|--------------|-----------|-----|
| `shadows.card` | 0.08 | 18 | 3 | Cards estándar |
| `shadows.elevated` | 0.10 | 22 | 5 | Cards elevadas |
| `shadows.floating` | 0.14 | 24 | 8 | FAB, elementos flotantes |
| `shadows.sheet` | 0.16 | 30 | 12 | Sheet modales |

### Inconsistencias detectadas

| Valor hardcodeado | Dónde aparece | Debería ser |
|-------------------|---------------|-------------|
| `borderRadius: 12` | Splash, Login, Registro, CrearGrupo | `radius.lg` = 18 (botones) o `radius.md` = 14 |
| `borderRadius: 14` | InvitarPersonas (algunas cards) | `radius.xl` = 24 (cards) |
| `borderRadius: 16` | ProfileScreen (secciones) | `radius.xl` = 24 o `radius.lg` = 18 |
| `paddingVertical: 16` | Botones hardcodeados | `spacing[4]` = 16 o usar AppButton |
| `paddingHorizontal: 24` | Auth screens | `spacing[5]` = 20 o `spacing[6]` = 24 |
| `marginBottom: 30` | Varios lugares | `spacing[7]` = 28 o `spacing[8]` = 32 |

### Safe Area y Scroll Behavior

- **SafeAreaView**: Usado consistentemente en auth screens
- **AppScreen**: Componente que maneja `bottomInset` (tab, fab, sheet, none)
- **ScrollView**: Usado en la mayoría de las pantallas con contenido largo
- **KeyboardAwareScrollView**: No implementado (disponible en package.json)

---

## 6. Componentes existentes

### UI Components (`components/ui/`)

| Componente | Archivo | Estado | Calidad | Recomendación |
|------------|---------|--------|---------|---------------|
| **AppButton** | `components/ui/AppButton.tsx` | ✅ Reusable | Excelente | Mantener, usar en todas partes |
| **AppCard** | `components/ui/AppCard.tsx` | ✅ Reusable | Excelente | Mantener, usar en todas partes |
| **AppText** | `components/ui/AppText.tsx` | ✅ Reusable | Excelente | Mantener, usar en todas partes |
| **AppInput** | `components/ui/AppInput.tsx` | ✅ Reusable | Buena | Mejorar con password toggle |
| **AppScreen** | `components/ui/AppScreen.tsx` | ✅ Reusable | Buena | Usar en todas las screens |
| **ActionPill** | `components/ui/ActionPill.tsx` | ✅ Reusable | Buena | Usar para chips/selección |
| **GlassSurface** | `components/ui/GlassSurface.tsx` | ✅ Reusable | Buena | Usar para efectos glass |
| **EmptyState** | `components/ui/EmptyState.tsx` | ⚠️ Placeholder | Básica | Completar implementación |
| **ErrorState** | `components/ui/ErrorState.tsx` | ⚠️ Placeholder | Básica | Completar implementación |
| **Skeleton** | `components/ui/Skeleton.tsx` | ⚠️ Placeholder | Básica | Completar implementación |

### Auth Components (`components/`)

| Componente | Archivo | Estado | Calidad | Recomendación |
|------------|---------|--------|---------|---------------|
| **AuthScreenLayout** | `components/AuthScreenLayout.tsx` | ✅ Reusable | Excelente | Mantener para auth flow |
| **AuthTextInput** | `components/AuthTextInput.tsx` | ✅ Reusable | Buena | Mantener, usar en auth screens |
| **AppLogo** | `components/AppLogo.tsx` | ✅ Reusable | Buena | Mantener, usar consistentemente |

### Componentes faltantes o por mejorar

| Componente | Estado | Necesidad |
|------------|--------|-----------|
| **AppTopBar / AppHeader** | ❌ No existe | Crear para navegación consistente |
| **AppAvatar** | ❌ No existe | Crear para perfiles/miembros |
| **AppChip** | ⚠️ Parcial (ActionPill) | Mejorar como componente separado |
| **Modal/Dialog** | ❌ No existe | Crear para confirmaciones |
| **LoadingSkeleton** | ⚠️ Skeleton existe | Crear variantes específicas |
| **MemberCard** | ❌ No existe | Crear para FamilyScreen |
| **HouseholdCard** | ❌ No existe | Crear para selección de hogares |
| **TaskCard** | ⚠️ En plannerShared | Extraer a componente reutilizable |
| **EventCard** | ⚠️ En plannerShared | Extraer a componente reutilizable |

---

## 7. Patrones buenos a conservar

### 1. Sistema de tokens completo (`constants/theme.ts`)
- Colores semánticamente nombrados
- Tipografía con variantes claras
- Spacing, radius, shadows consistentes
- **Acción:** Mantener, no cambiar, solo usar

### 2. Componentes UI base (`components/ui/`)
- `AppButton`, `AppCard`, `AppText` bien implementados
- Usan theme tokens internamente
- **Acción:** Expandir biblioteca, no crear componentes ad-hoc

### 3. Tema por rol (`CalendarScreen.tsx`)
- Diferentes temas para `adulto`, `adolescente`, `adulto_mayor`
- Accesibilidad integrada (touch targets más grandes para senior)
- **Acción:** Extender a todas las pantallas

### 4. Shared styles (`plannerShared.ts`)
- Estilos centralizados en StyleSheet
- Uso consistente de theme tokens
- **Acción:** Adoptar patrón en otras áreas

### 5. Touch targets accesibles
- 44px mínimo normal
- 56px para senior
- **Acción:** Mantener, verificar en todas las pantallas

### 6. Glassmorphism (`GlassSurface.tsx`)
- Efectos modernos bien implementados
- **Acción:** Usar moderadamente para énfasis

---

## 8. Patrones malos a eliminar

### 1. Valores hardcodeados de diseño

**Ejemplos encontrados:**
```javascript
// ❌ Splash.tsx
backgroundColor: '#FBFAF8'  // Debería ser: colors.background.base
fontSize: 34                // Debería ser: typography.hero.fontSize
borderRadius: 12            // Debería ser: radius.lg (18) o radius.md (14)

// ❌ Login.tsx, Registro.tsx
fontSize: 27                // Debería ser: typography.title1.fontSize (28)
color: '#C17F59'            // Debería ser: colors.terracotta[500]

// ❌ CrearGrupo.tsx, InvitarPersonas.tsx
color: '#CD7353'            // Debería ser: colors.terracotta[500] (#C17F59)
```

### 2. Inconsistencia de color primario
- `#C17F59` (theme) vs `#CD7353` (usado en múltiples pantallas)
- **Solución:** Elegir uno (`#C17F59` del theme) y refactorizar

### 3. StyleSheet.create con valores hardcodeados
```javascript
// ❌ plannerShared.ts (algunos estilos)
fontSize: 28, fontWeight: '800'  // Debería usar typography.title1
padding: spacing[5]              // ✅ Correcto
borderRadius: radius.xl          // ✅ Correcto
```

### 4. Alert vacíos o genéricos
- Usar `Alert.alert()` con mensajes genéricos
- **Solución:** Crear `ConfirmDialog` componente personalizado

### 5. Pantallas sin usar AppScreen
- Muchas pantallas crean su propio layout con SafeAreaView + ScrollView
- **Solución:** Usar `<AppScreen scroll bottomInset="tab">`

### 6. Duplicación de estilos
- Mismos estilos repetidos en múltiples archivos
- **Solución:** Extraer a componentes o `sharedStyles.ts`

---

## 9. Design tokens propuestos

Los tokens **ya existen** en `constants/theme.ts`. Esta sección documenta su uso recomendado:

### Colors

```javascript
// Background
colors.background.base        // #FBFAF8 - Fondo principal
colors.background.soft        // #F7F3EE - Fondos secundarios
colors.background.alt         // #F5F1EB - Alternativo

// Surface
colors.surface.card           // #FFFFFF - Cards
colors.surface.soft           // #FFFDF9 - Inputs, fondos suaves
colors.surface.elevated       // #FFFFFF - Cards con sombra fuerte
colors.surface.glass          // rgba - Glassmorphism

// Text
colors.text.primary           // #1A1714 - Texto principal
colors.text.secondary         // #4A4540 - Texto secundario
colors.text.tertiary          // #6B6560 - Metadata
colors.text.muted             // #8A8178 - Texto apagado
colors.text.inverse           // #FFFFFF - Sobre fondos oscuros

// Brand
colors.terracotta[500]        // #C17F59 - PRIMARIO (botones principales)
colors.terracotta[50]         // #FAF3ED - Fondos suaves primario
colors.terracotta[100]        // #F2E0D4 - Bordes suaves primario

// Status
colors.success.base           // #6B9E7A - Éxito
colors.success.soft           // #E1EFE5 - Fondo éxito
colors.success.text           // #558563 - Texto éxito

colors.warning.base           // #D4944A - Advertencia
colors.warning.soft           // #F7EBDB - Fondo advertencia
colors.warning.text           // #B57930 - Texto advertencia

colors.danger.base            // #C46B6B - Error
colors.danger.soft            // #F5E2E2 - Fondo error
colors.danger.text            // #A85050 - Texto error

// Border
colors.border.subtle          // rgba - Bordes sutiles
colors.border.default         // #E8E3DC - Bordes por defecto
colors.border.strong          // #D5CFC7 - Bordes fuertes

// Shadow
colors.shadow.soft            // rgba - Sombra suave
colors.shadow.default         // rgba - Sombra normal
colors.shadow.floating        // rgba - Elementos flotantes
```

### Spacing

```javascript
spacing[0]  // 0px
spacing[1]  // 4px
spacing[2]  // 8px
spacing[3]  // 12px
spacing[4]  // 16px
spacing[5]  // 20px
spacing[6]  // 24px
spacing[7]  // 28px
spacing[8]  // 32px
spacing[10] // 40px
```

### Radius

```javascript
radius.none   // 0px
radius.xs     // 6px
radius.sm     // 10px
radius.md     // 14px
radius.lg     // 18px  // Botones, inputs
radius.xl     // 24px  // Cards
radius.xxl    // 32px  // Sheet panels
radius.pill   // 999px // Chips, pills
```

### Typography

```javascript
typography.hero      // 34px, 700 - Títulos grandes
typography.title1    // 28px, 700 - Screen titles
typography.title2    // 24px, 700 - Section titles
typography.title3    // 20px, 700 - Subsection titles
typography.bodyLarge // 18px, 400 - Cuerpo destacado
typography.body      // 16px, 400 - Cuerpo estándar
typography.bodySmall // 14px, 400 - Cuerpo pequeño
typography.caption   // 12px, 500 - Labels
typography.micro     // 11px, 600 - Badges, indicators
```

### Shadows

```javascript
shadows.card      // Opacidad 0.08, radius 18 - Cards estándar
shadows.elevated  // Opacidad 0.10, radius 22 - Cards elevadas
shadows.floating  // Opacidad 0.14, radius 24 - FAB, elementos flotantes
shadows.sheet     // Opacidad 0.16, radius 30 - Sheet modales
```

---

## 10. Recomendación de componentes base

### Componentes a crear/implementar

| Componente | Prioridad | Descripción | Depende de |
|------------|-----------|-------------|------------|
| **AppScreen** | Alta | Wrapper de pantalla con safe area, scroll, bottom inset | Ya existe, usar consistentemente |
| **AppTopBar** | Alta | Header con título, acciones, back button | AppText, AppButton |
| **AppCard** | Alta | Card con variantes (default, elevated, quiet) | Ya existe, usar consistentemente |
| **AppButton** | Alta | Botón con variantes (primary, secondary, ghost, danger) | Ya existe, usar consistentemente |
| **AppInput** | Media | Input con label, error, helper text | Ya existe, completar features |
| **AppChip** | Media | Chip seleccionable para filtros | AppText, ActionPill |
| **AppAvatar** | Media | Avatar con iniciales, imagen, estado | AppText |
| **SectionHeader** | Media | Título de sección con acción opcional | AppText, AppButton |
| **EmptyState** | Media | Estado vacío con icono, título, acción | AppText, AppButton |
| **ErrorState** | Media | Estado de error con mensaje, retry | AppText, AppButton |
| **LoadingSkeleton** | Media | Skeleton loading con variantes | Skeleton (ya existe) |
| **ConfirmDialog** | Media | Dialog de confirmación | AppCard, AppButton, AppText |

### Estructura recomendada

```
components/ui/
├── AppScreen.tsx       ✅ Ya existe
├── AppTopBar.tsx       ❌ Crear
├── AppCard.tsx         ✅ Ya existe
├── AppButton.tsx       ✅ Ya existe
├── AppInput.tsx        ✅ Ya existe (mejorar)
├── AppChip.tsx         ❌ Crear
├── AppAvatar.tsx       ❌ Crear
├── SectionHeader.tsx   ❌ Crear
├── EmptyState.tsx      ⚠️ Mejorar
├── ErrorState.tsx      ⚠️ Mejorar
├── LoadingSkeleton.tsx ❌ Crear
├── ConfirmDialog.tsx   ❌ Crear
├── ActionPill.tsx      ✅ Ya existe
├── GlassSurface.tsx    ✅ Ya existe
├── AppText.tsx         ✅ Ya existe
└── Skeleton.tsx        ✅ Ya existe
```

---

## 11. Impacto en H-042 Family Core

### Aplicación del design system a pantallas de H-042

| Pantalla/Componente | Acción requerida | Tokens a usar |
|---------------------|------------------|---------------|
| **AppShell / TopBar** | Crear AppTopBar componente | `typography.title2`, `colors.background.base`, `colors.text.primary` |
| **ProfileScreen** | Refactorizar a AppScreen + AppCard | `colors.surface.card`, `radius.xl`, `shadows.card` |
| **EditProfile** | Usar AppInput, AppButton | `colors.terracotta[500]`, `radius.lg`, `spacing[4]` |
| **Mis hogares** | Crear HouseholdCard componente | `colors.surface.card`, `colors.terracotta[50]` |
| **FamilyScreen** | Ya usa componentes UI - mantener | Ya consistente |
| **MemberProfile** | Crear MemberCard componente | `colors.surface.card`, `radius.xl` |
| **InvitePeople** | Refactorizar a AppCard + AppButton | `colors.success.base`, `colors.danger.base` |
| **Permissions** | Usar AppCard variant "quiet" | `colors.surface.soft`, `colors.text.tertiary` |
| **WaitingApproval** | Usar EmptyState + AppButton | `colors.background.base`, `colors.terracotta[500]` |

### Patrones específicos por rol

```javascript
// Adulto (estándar)
bg: colors.background.base      // #FBFAF8
touchTarget: 44px
fontSize: typography.body.fontSize  // 16px

// Adolescente (modo oscuro)
bg: '#0F172A'  // Verificar si usar darkColors
touchTarget: 44px
fontSize: typography.body.fontSize  // 16px

// Adulto Mayor (accesible)
bg: colors.background.base      // #FBFAF8
touchTarget: 56px
fontSize: seniorTypography.body.fontSize  // 18px
```

---

## 12. Orden recomendado para unificación visual

### Etapa 1: Tokens y estilos base (1-2 días)
- [ ] Verificar todos los tokens en `constants/theme.ts`
- [ ] Crear ESLint rule para prevenir hardcodeo de colores/tamaños
- [ ] Documentar convenciones de uso

### Etapa 2: Componentes base (2-3 días)
- [ ] Completar `AppTopBar` componente
- [ ] Completar `AppAvatar` componente
- [ ] Completar `AppChip` componente
- [ ] Mejorar `AppInput` con password toggle
- [ ] Completar `EmptyState`, `ErrorState`, `LoadingSkeleton`

### Etapa 3: AppShell y navegación (1-2 días)
- [ ] Implementar AppTopBar en todas las screens
- [ ] Unificar bottom tab navigation styling
- [ ] Asegurar consistent safe area handling

### Etapa 4: Profile y EditProfile (1-2 días)
- [ ] Refactorizar ProfileScreen a AppScreen + AppCard
- [ ] Crear EditProfile con AppInput
- [ ] Usar AppAvatar para foto de perfil

### Etapa 5: Family y Members (2-3 días)
- [ ] Crear MemberCard componente
- [ ] Refactorizar FamilyScreen members list
- [ ] Crear MemberProfile screen

### Etapa 6: Household y "Mis hogares" (1-2 días)
- [ ] Crear HouseholdCard componente
- [ ] Refactorizar CrearGrupo
- [ ] Refactorizar JoinHousehold

### Etapa 7: Invite y Waiting (1-2 días)
- [ ] Refactorizar InvitarPersonas
- [ ] Crear WaitingApproval screen
- [ ] Usar ConfirmDialog para acciones destructivas

### Etapa 8: Planner y Home alignment (1-2 días)
- [ ] Asegurar Planner usa AppScreen
- [ ] Verificar Home screens consistency
- [ ] Unificar calendar styling

---

## 13. Criterios de aceptación visual

Una pantalla se considera terminada visualmente cuando cumple:

### Checklist de aceptación

- [ ] **Usa AppScreen wrapper** con `scroll` y `bottomInset` apropiado
- [ ] **Usa AppTopBar** para header (si aplica)
- [ ] **Todos los textos usan AppText** con variant del theme
- [ ] **Todos los botones usan AppButton** con variant apropiado
- [ ] **Todos los inputs usan AppInput** con label y error handling
- [ ] **Todas las cards usan AppCard** con variant apropiado
- [ ] **No hay colores hardcodeados** (todos usan `colors.*`)
- [ ] **No hay tamaños de fuente hardcodeados** (todos usan `typography.*`)
- [ ] **No hay spacing hardcodeado** (todos usan `spacing.*`)
- [ ] **No hay border-radius hardcodeado** (todos usan `radius.*`)
- [ ] **Touch targets ≥ 44px** (≥ 56px para senior)
- [ ] **Contraste suficiente** para texto (verificar con WCAG)
- [ ] **Consistente con otras screens** del mismo tipo
- [ ] **Responsive** en diferentes tamaños de pantalla
- [ ] **Accesible** para rol objetivo (adulto, adolescente, adulto_mayor)

### Criterios de calidad

| Nivel | Requerimientos |
|-------|---------------|
| **Básico** | Usa AppScreen, AppText, AppButton, theme tokens |
| **Estándar** | + AppCard, AppInput, consistent spacing, touch targets |
| **Premium** | + AppTopBar, AppAvatar, EmptyState, ErrorState, loading states |
| **Accesible** | + Senior typography, 56px touch targets, high contrast |

---

## Reporte final

### Archivo creado
✅ `docs/design/current_frontend_design_system_audit.md`

### Pantallas auditadas
- **23 pantallas** identificadas y categorizadas
- **10 componentes UI** auditados
- **3 componentes auth** auditados

### Pantallas más consistentes
1. **FamilyScreen** - Usa componentes UI consistentemente
2. **HomeAdulto** - Integra AppScreen, AppCard, AppText
3. **CalendarScreen** - Tema por rol implementado correctamente
4. **Planner screens** - Usan plannerShared.ts con tokens

### Pantallas más flojas
1. **Splash** - Hardcodea muchos valores
2. **Login/Registro** - Hardcodea colores y tamaños
3. **CrearGrupo** - Usa color incorrecto (`#CD7353` vs `#C17F59`)
4. **InvitarPersonas** - Hardcodea estilos en StyleSheet

### Componentes repetidos detectados
- Mismos estilos de botón en 5+ pantallas
- Mismos estilos de card en 4+ pantallas
- Mismos patrones de input en 6+ pantallas

### Propuesta de tokens
**Ya existen** en `constants/theme.ts`. Solo requieren uso consistente:
- `colors.terracotta[500]` = `#C17F59` (PRIMARIO)
- `typography.title1` = 28px, 700 (screen titles)
- `radius.lg` = 18px (botones)
- `radius.xl` = 24px (cards)
- `spacing[4]` = 16px (padding estándar)

### Siguiente paso recomendado
1. **Inmediato:** Refactorizar Splash, Login, Registro para usar theme tokens
2. **Corto plazo:** Crear AppTopBar y AppAvatar componentes
3. **Medio plazo:** Refactorizar todas las auth screens a AppScreen + componentes UI
4. **Largo plazo:** Implementar completo design system en todas las pantallas

---

*Documento generado: 2026-07-03*
*Frontend auditado: `front/mi-front-limpio/`*
*Nivel de madurez del design system: 6.5/10*