# PERFORMANCE / INTERACTION TIMING — Inventory V2

Mediciones de latencia de interacción realizadas con instrumentación EXTERNA (sin modificar código de producto).

## Método

1. **Sampler por `requestAnimationFrame`** inyectado en la página: en cada frame se calcula una "firma" del DOM (número de nodos visibles + longitud del texto renderizado + `transform` + `opacity` de cada nodo) y se registra `{t: performance.now(), s: firma}`.
2. La acción se dispara con Playwright; `t0` se toma con `performance.now()` en el mismo contexto de página.
3. **Primer píxel** = primer frame cuya firma difiere de la inicial.
4. **Asentado** = último frame cuya firma difiere de la firma final (es decir, el último frame en el que algo sigue cambiando).
5. Contexto: Chromium headless, 390 × 844, deviceScaleFactor 1, 60 fps sostenidos durante la medición.

Limitación: la firma es un hash estructural, no un diff de píxeles. Un cambio que no altere estructura, texto, transform ni opacity (por ejemplo, un cambio de color) no se detecta. Por eso las cifras de "primer píxel" son cota inferior del cambio visual real.

---

## Resultados

| Interacción | Superficie | Primer píxel | Asentado | Frames | fps |
|---|---|---|---|---|---|
| Abrir overflow del root | 02_productos_root_overflow | **84,2 ms** | **236,5 ms** | 157 | 60,0 |
| Cambio de tab Productos → Compras | 01↔03 (COMPRAS) | **68,5 ms** | 25,9 ms (1 commit) | 155 | 60,0 |
| Cambio de tab Compras → Productos | 01↔03 (COMPRAS) | **80,9 ms** | 33,0 ms (1 commit) | 156 | 59,6 |
| Cambio de ruta Root → Todos los productos | 05_productos_todos | **218,3 ms** | 333,8 ms | 156 | 56,7 |
| Entrada en modo selección (long press) | 61_productos_seleccion | 108,1 ms | 857,3 ms (incluye ~800 ms de long press) | 201 | 59,7 |
| Abrir sheet (flujo de producto) | 19_agregar_catalogo_inicial | **196,6 ms** | 409,7 ms | 163 | 60,0 |
| Cerrar sheet (flujo de producto) | 19_agregar_catalogo_inicial | 111,7 ms | 285,1 ms | 157 | 59,6 |
| Abrir sheet (Agregar a la lista) | 07_agregar_lista_inicial | **96,4 ms** | 353,2 ms | 155 | 59,2 |
| Cerrar sheet (Agregar a la lista) | 07_agregar_lista_inicial | 175,2 ms | 306,0 ms | 158 | 58,5 |
| Compra: "+" → hoja "Agregar a la lista" | 29..36 | ≈105 ms (ruta) | ≈355 ms (hoja) | 18 frames de screencast | — |

## Cadenas de latencia percibida

Sumando el retardo hasta el primer píxel y la duración de animación declarada:

| Cadena | Cálculo | Total |
|---|---|---|
| Tap → popover de overflow asentado | 84,2 ms (primer píxel) + 130 ms (declarado) | **≈214 ms** |
| Tap → sheet de Compras asentado | 96,4 ms + 220 ms | **≈316 ms** (medido: 353,2 ms) |
| Tap → sheet de Producto asentado | 196,6 ms + 220 ms | **≈417 ms** (medido: 409,7 ms) |
| Tap → escena nueva (ruta de stack) | 218,3 ms | **≈218 ms** (sin animación intermedia observable) |
| Tap → cambiar de tab | 68,5 ms | **≈69 ms** (commit único, 2 frames en el screencast) |
| "+ de la compra" → lista + hoja estable | 105 ms (ruta) + 220 ms (hoja) | **≈325 ms** (medido: ≈355 ms) |
| Compra: click de check → fila actualizada | no medido de forma aislada (la mutación es de red) | — |
| Compra: "Finalizar compra" → loading → pantalla de éxito | con la respuesta demorada 2200 ms de forma artificial | loading visible desde ~+40 ms; commit a los 2200 ms |
| Compra: "Finalizar compra" → ruta PurchaseSuccess | `navigation.replace(...)` | sin animación intermedia (1 commit) |

## Observaciones factuales

1. **La animación más larga del módulo (220 ms) no es la percibida como más lenta**: el retardo hasta el primer píxel del flujo de producto (196,6 ms) duplica el del sheet de Compras (96,4 ms) para la misma animación declarada. La diferencia está en el trabajo de render previo al primer frame, no en la duración del `Animated.timing`.
2. **El cambio de tab es la interacción más rápida (68,5 ms) y la que no tiene ninguna animación intermedia**: el screencast produjo 2 frames (antes y después).
3. **El cambio de ruta dentro del stack cuesta 218,3 ms hasta el primer píxel**, 3,2× más que el cambio de tab, porque monta una pantalla completa (18 filas de producto).
4. **Ninguna interacción中介 bloquea la UI**: en las mediciones el sampler siguió registrando frames a 58-60 fps durante todas las animaciones.
5. Las cifras de "primer píxel" son cotas inferiores (hash estructural, no diff de píxeles).

## Datos crudos

Archivo con el volcado completo: `performance-timing.json` (generado durante la captura y citado en `SCREENSHOT_MANIFEST.md`).
Cada superficie .md incluye en su sección 6 las duraciones DECLARADAS en el código; este documento separa lo declarado de lo medido.
