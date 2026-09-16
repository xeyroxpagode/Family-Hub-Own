# Planner V1 — M11 Quick Actions Visual Proposal

**Decisión solicitada:** D1 — layout.<br>
**Acciones exactas:** Tarea, Evento, Meta. No Invite, Geni, placeholders ni futuros.<br>
**Preview:** [`m11-proposals/quick-actions-alternatives.svg`](m11-proposals/quick-actions-alternatives.svg)

## 1. Constraints comunes

- Sheet ownership, rutas y capabilities de M3–M5 se conservan.
- Toda celda, no solo el icono, es tocable.
- Orden lógico y visual: Tarea → Evento → Meta.
- Icono 24 dp, label mínimo 14 sp/semibold, target mínimo 48×48 dp; propuesta normal mucho mayor.
- Capability no permitida se **oculta**, no queda disabled explicando permisos técnicos.
- Mientras abre una acción: tile seleccionada `busy`, las demás `disabled`; no spinner eterno.
- Android Back: si un form está abierto, vuelve a Quick Actions solo si el contract actual lo permite; si la grilla está abierta, cierra sheet; nunca navega a una ruta nueva.

## 2. Alternativa A — iconos circulares

```text
┌──────── Crear ────────┐
│   (＋)      (□)    (△) │
│  Tarea    Evento  Meta │
└───────────────────────┘
```

| Spec | Valor |
|---|---|
| grilla | 3 columnas iguales |
| celda | min 96×92 dp; hit area completa |
| círculo visual | 48 dp; nunca define el hit area |
| gap columnas | 8 dp |
| icon→label | 8 dp |
| sheet padding | 20 dp lateral, 24/20 vertical |
| pressed | fondo de celda neutral + círculo terracotta 12%; scale solo si motion normal |
| disabled | opacity visual 0.45 + `disabled`; label se conserva |

Ventajas: cálida, familiar, baja densidad. Riesgos: usuarios pueden interpretar el círculo como único target; el label largo/reflow separa icono y texto. Decisión: `ADAPT`, segunda opción.

## 3. Alternativa B — celdas compactas de superficie completa

```text
┌──────── Crear ────────┐
│ ┌─────┐ ┌─────┐ ┌─────┐│
│ │  ＋  │ │  □  │ │  △  ││
│ │Tarea│ │Evento│ │Meta ││
│ └─────┘ └─────┘ └─────┘│
└───────────────────────┘
```

| Spec | Valor |
|---|---|
| grilla | 3 columnas iguales; ancho disponible / 3 |
| tile | min 96×88 dp; radius 18–20 dp |
| superficie | neutral warm; borde 1 dp solo si contraste de superficie no llega a 3:1 |
| icono | 24 dp, terracotta accesible |
| gap | 8 dp columnas, 8 dp icon-label |
| pressed | fill terracotta 10–12% + borde/tono; 80 ms |
| focus/selected | outline 2 dp + estado anunciado; no color solo |
| disabled | opacity + `disabled`; no haptic |
| loading | spinner 20 dp reemplaza icono, label “Abriendo…” accesible, tile busy |

Ventajas: target inequívoco; pressed/disabled/loading pueden afectar la superficie completa; escala a capabilities y texto grande; mantiene tono premium sin parecer administrativo. Riesgo: si se añade sombra/borde fuerte vuelve a la inflación de cards. Decisión: `ADOPT`.

## 4. Alternativa C — banda abierta

```text
┌──────── Crear ────────┐
│   ＋     │   □    │  △ │
│ Tarea   │ Evento  │Meta│
└───────────────────────┘
```

Una superficie contenedora con tres zonas táctiles y dividers. Celda mínima 96×80 dp; divider 1 dp; pressed con fill local.

Ventajas: menor cantidad de contenedores; lectura rápida con tres acciones fijas. Riesgos: límite táctil menos evidente; 1/2 capabilities produce composiciones extrañas; texto grande puede parecer segmented control aunque la selección navega. Decisión: `RESERVE`.

## 5. Adaptación común

| Caso | A | B recomendada | C |
|---|---|---|---|
| 3 acciones | 3 columnas | 3 tiles | 3 zonas |
| 2 acciones | 2 columnas centradas, max 144 dp | 2 tiles, cada una 50%, max 160 dp | 2 zonas; puede parecer toggle |
| 1 acción | celda centrada, max 160 dp | tile centrada, max 200 dp | banda parcial poco natural |
| 0 acciones | no abrir sheet; + anuncia no disponible según contract | igual | igual |
| ancho ≥360 dp | 3 columnas | 3 columnas | 3 zonas |
| ancho <360 dp | 2+1, alineación start | 2+1, tercera ocupa una columna, no full row | cambia a 2+1 y pierde claridad |
| font scale ≤1.3 | 3 columnas | 3 columnas | 3 zonas |
| font scale >1.3 o label wrap | 2+1; min 96×104 | 2+1; height auto, max 2 líneas | 1 columna sería fila full-width: no cumple intención |
| texto a 200% | una columna de tiles compactas **solo como fallback accesible**; sin descripciones | igual, ancho limitado 240 dp y centrado | rechazada |
| RTL futuro | orden lógico start→end según locale | igual | dividers correctos; no contemplado hoy por proyecto |

El fallback de una columna a 200% no reproduce las filas actuales: no tiene descripción ni chevron y mantiene tile compacta con ancho limitado. Es una excepción accesible, no el layout normal.

## 6. Estados y feedback

| Estado | Visual | TalkBack | Motion/haptic |
|---|---|---|---|
| idle | icono + label | “Crear tarea, botón” | ninguno |
| pressed | fill/outline local | sin anuncio extra | 80 ms; haptic light opcional |
| disabled durante transición | opacity, no interacción | disabled | ninguno |
| busy | spinner + label estable o “Abriendo…” | busy, anuncio polite una vez | spinner respeta reduce motion |
| capability oculta | no ocupa espacio | no focus | reflow, no animación necesaria |
| error al abrir | tile vuelve idle + inline error sheet | alert/polite según gravedad | haptic error opcional; no shake |
| reduced motion | mismo cambio de color/outline | igual | sin scale/translation; estado instantáneo |

## 7. Recomendación

**Alternativa B.** Resuelve mejor la intención de producto y los casos difíciles sin inventar comportamiento. A queda como fallback estético si Gabriel prioriza una apariencia más ligera; C se descarta para V1 por límites y reflow ambiguos.

**Pregunta exacta D1:** “¿Aprobás la Alternativa B — tres celdas compactas de superficie completa, con reflow 2+1 para ancho/texto grande y capability-gating por ocultamiento— como layout vinculante de Quick Actions para la implementación posterior de M11?”

## 8. M11-C2 revalidation

D1 remains **Alternative B**. D16, D19, D31–D34 add binding acceptance details without changing the visual choice:

- tap sequence remains central `+` → full tile → Quick Form, then title receives focus;
- 1/2/3 available actions keep logical reading order; zero available actions must not open an empty sheet;
- unavailable capabilities are hidden rather than displayed as administrative disabled placeholders;
- duplicate taps during transition produce one navigation intent;
- Android Back closes the sheet before leaving the current route;
- 320 dp and font scales 1×/1.3×/1.6×/2× must preserve label, target and focus order;
- visual press is immediate; reduced motion removes scale/translation; no haptic is required for ordinary tile press.

The final approval question and decision status live only in [`PLANNER_V1_M11_APPROVAL_PACKET.md`](PLANNER_V1_M11_APPROVAL_PACKET.md); this document remains supporting visual evidence.
