# PURCHASE ADD FLOW AUDIT — Compra en curso → "+" → Agregar a la lista

Auditoría frame a frame del flujo reportado por el usuario en iPhone.
Capturas reales del compositor (CDP `Page.startScreencast`), 390 × 844.

---

## 0. El código que dispara el flujo

```tsx
// screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:62
<IconButton icon="add" variant="plain" disabled={!online}
  onPress={() => navigation.navigate('ShoppingHome', {openAddNonce: Date.now()})}
  accessibilityLabel="Agregar productos a la compra" />

// screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:28
useEffect(() => { if (route.params?.openAddNonce) setAdd(true); }, [route.params?.openAddNonce]);
```

El botón **no abre un sheet**. Ejecuta `navigate('ShoppingHome', {openAddNonce})`: como `ShoppingHome` ya está en el stack (debajo de `Purchase`), el stack hace **pop** de la compra y la lista de compras se monta con un parámetro que abre su propio sheet "Agregar a la lista".

---

## 1. Secuencia medida (frames del compositor)

| Fase | Momento | Frame | Route | Superficie visible | Sheet | Teclado | Bottom nav | Background | Compra montada | Shopping montado | Animación | Duración |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **T0** | antes del tap | `add_000.png` | `/compra/:id` | Compra en curso | no | no | sí | Compra | **sí** | no | — | — |
| **T1** | ≈105 ms | `add_001.png` | `/compras?openAddNonce=…` | **Shopping Root** (fila Encargado, banner "Compra en curso", filas de compra, sticky "Continuar compra") | no | no | sí | Shopping Root | **no** | **sí** | fade_from_bottom (nativa) | ≈105 ms hasta el commit |
| **T2** | ≈151 ms | `add_002.png` | idem | Shopping Root + panel del sheet entrando (título "Agregar a la lista" desplazado) | sí (entrando) | no | sí (detrás del scrim) | Shopping Root | no | sí | translateY 80→0 + opacity 0→1 | 220 ms declarados |
| **T3** | ≈185 ms | `add_005.png` | idem | Shopping Root + panel a mitad de camino (handle y título en su sitio, contenido aún tenue) | sí (entrando) | no | sí | Shopping Root | no | sí | ídem | — |
| **T4/T5** | ≈355 ms | `add_014.png` | idem | Shopping Root + panel casi asentado (contenido visible, overlay aún translúcido) | sí | **no** | sí | Shopping Root | no | sí | ídem | — |
| **T6** | ≈2,2 s | `37_compra_agregar_t6_estable.png` | idem | Shopping Root + sheet "Agregar a la lista" estable, sección "EN INVENTARIO" con 9 filas | sí (estable) | no | sí | Shopping Root | no | sí | — | — |
| **T7** | tras tap en X | `38_compra_agregar_t7_cierre.png` | idem | Shopping Root sin scrim | no (cerrando) | no | sí | Shopping Root | no | sí | translateY 0→80 + opacity 1→0 | 190 ms declarados |
| **T8** | ≈2,6 s | `39_compra_agregar_t8_destino.png` | idem | Shopping Root con banner "Compra en curso" | no | no | sí | Shopping Root | **no** | sí | — | — |

---

## 2. Respuestas puntuales

| Pregunta | Respuesta observada |
|---|---|
| ¿Qué route/screen queda debajo? | **Shopping Root** (`/compras?openAddNonce=…`). Debajo del sheet con scrim rgba(26,23,20,0.38). |
| ¿La Purchase sigue montada? | **No.** El stack hizo pop de la ruta `Purchase`. La ruta sigue existiendo en el servidor (status `active`) y es recuperable desde el banner "Compra en curso" o el CTA "Continuar compra". |
| ¿Se navegó a Shopping Root? | **Sí.** Es exactamente lo que ocurre: `navigate('ShoppingHome', …)`. |
| ¿El teclado aparece? | **No.** El `SearchField` del sheet "Agregar a la lista" (`InventoryShoppingPurchaseScreens.tsx:45`) **no declara `autoFocus`** y el `ActionSheet` **no declara `keyboardAware`**. Medido: en T4 el `document.activeElement` sigue siendo el botón `Cerrar Agregar a la lista` (el foco por defecto del Modal), no el input. |
| ¿El sheet cambia de posición? | **No.** El panel entra con `translateY` 80→0 y se ancla al borde inferior. No hay `KeyboardAvoidingView` que compense el teclado. |
| ¿El bottom nav queda visible? | **Sí.** El `FloatingNavigationBar` es chrome global (`HomeTabNavigator`), se mantiene montado y queda **por debajo** del scrim del Modal (visible, atenuado). |
| ¿Qué ocurre al cerrar? | El sheet se cierra (190 ms) y queda Shopping Root con su lista, su banner "Compra en curso" y su sticky "Continuar compra". **La URL conserva el query param** `?openAddNonce=…`. |

---

## 3. Lo que el usuario reporta y lo que ocurre

| Reporte del usuario | Estado en esta auditoría |
|---|---|
| "el + de la compra deja el contexto de compra" | **CONFIRMADO.** La compra se desmonta del stack; el usuario aterriza en la lista de compras. Secuencia T0→T8 medida frame a frame. |
| "Add To List hace autofocus y abre el teclado" | **NO CONFIRMADO para este flujo.** El sheet "Agregar a la lista" de Compras no declara `autoFocus` ni `keyboardAware`. El autofocus real del módulo está en el **catálogo del flujo de producto** (`InventoryProductFlowSheet.tsx:62`), que sí declara `autoFocus` y cuyo sheet sí declara `keyboardAware`. |
| "el teclado mueve el sheet" | **CONFIRMADO sólo en el flujo de producto.** Los sheets de Compras (alta a la lista, cantidad comprada, finalizar compra) no tienen `KeyboardAvoidingView`: con teclado abierto el panel no se desplaza y el footer queda en el borde inferior. |
| "el teclado translúcido de iOS deja ver la navegación/superficie de debajo" | **NO MEDIBLE en el build web** (no hay teclado de sistema). En código, ninguna pantalla de Inventory pasa `keyboardAvoiding` a `AppScreen`. |

---

## 4. Observaciones objetivas del flujo

1. **El punto de entrada es una navegación, no una superposición.** El resto de los flujos del módulo (alta de producto, alta a la lista, editor de ítem, cantidad comprada, finalizar) abren un `<Modal>` sobre la pantalla actual. Este es el único caso en que se cambia de ruta para abrir un sheet.
2. **La acción "+" de la compra y la acción "+" del header de Productos tienen la misma forma visual** (IconButton `add`, 44 × 44, variant `plain`) y.company完全不同: la de productos abre un sheet sobre la misma pantalla; la de compra cambia de pantalla.
3. **No hay indicador de que la compra sigue viva** en la propia pantalla de la lista de compras más allá del banner "Compra en curso" y del texto del CTA ("Continuar compra"). El banner queda en una fila con el mismo tratamiento visual que la fila Encargado.
4. **El query param `openAddNonce` permanece en la URL** después de cerrar el sheet (`/compras?openAddNonce=1792544336719`). Un recargado de la página reabriría el sheet, porque el `useEffect` depende de `route.params.openAddNonce`.
5. **El frame T1 no muestra ningún estado intermedio**: el primer frame paintable tras el tap ya es la pantalla de destino. En el screencast no existe ningún frame en el que se vea la Compra con algo encima.
6. El total medido hasta el estado estable es de **≈355 ms** (105 ms de navegación + 250 ms de entrada del panel), con una cadena de 325 ms declarados (105 no declarados + 220 del sheet).

---

## 5. Artefactos

| Artefacto | Ubicación |
|---|---|
| Frames del compositor | `docs/…/premium-forensic-audit/` (T0–T8 como PNG numerados) |
| Frames originales del screencast | temporales: `frames/add_purchase/add_000.png … add_017.png` (18 frames, 105 ms → 401 ms) |
| Datos del `activeElement` por frame | en cada .md de la serie T0–T8 (sección 1) |
