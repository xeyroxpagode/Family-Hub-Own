# Planner V1 — M11-B External UX/UI Research

**Estado:** `M11-B RESEARCH STATUS: PASSED`<br>
**Consulta:** 2026-07-18<br>
**Criterio:** fuentes primarias/oficiales; productos reconocidos solo como referencia de patrón, nunca como plantilla.

## 1. Fuentes y conclusión aplicada

| Fuente | URL | Conclusión aplicada a HomePlus |
|---|---|---|
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | Contraste 4.5:1 normal/3:1 texto grande; resize 200%; reflow 320 CSS px; focus, status messages y no dependencia del color son requisitos de diseño. |
| WCAG 2.2 — Target Size Minimum | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum | 24×24 CSS px es AA con excepciones; no es el objetivo cómodo para una app táctil. |
| WCAG 2.2 — Target Size Enhanced | https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced | 44×44 es referencia reforzada, especialmente para acciones frecuentes o de difícil reversión. |
| Android Accessibility | https://developer.android.com/design/ui/mobile/guides/foundations/accessibility | Usar 48 dp táctiles, texto escalable, contraste 4.5:1 y affordance redundante al color. |
| Android Grids and units | https://developer.android.com/design/ui/mobile/guides/layout-and-content/grids-and-units | Especificar dp/sp, ritmo 4/8 y layouts responsivos a densidad/font settings. |
| Android Content structure | https://developer.android.com/design/ui/mobile/guides/layout-and-content/content-structure | Whitespace, tipografía y divider pueden contener implícitamente; card solo cuando el grupo necesita una frontera. |
| Android Common layouts | https://developer.android.com/design/ui/mobile/guides/layout-and-content/common-layouts | List-detail es el patrón correcto para colecciones que revelan detalle; en compact se ve lista o detalle, no ambos. |
| Android Layout basics | https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-basics | Respetar teclado/safe areas, mantener acciones esenciales alcanzables y no saturar acciones por vista. |
| Android Touch gestures | https://developer.android.com/develop/ui/views/touch-and-input/gestures | La funcionalidad básica no puede depender de un gesto; swipe requiere alternativa visible. |
| React Native Accessibility | https://reactnative.dev/docs/accessibility | Diseñar `accessibilityLabel`, role, selected/disabled/busy/expanded y live regions; agrupar sin destruir el orden de lectura. |
| React Native AccessibilityInfo | https://reactnative.dev/docs/next/accessibilityinfo | El diseño debe prever `isReduceMotionEnabled()` y cambios en preferencias de accesibilidad. |
| Apple HIG Accessibility | https://developer.apple.com/design/human-interface-guidelines/accessibility | 44×44 pt como control cómodo iOS; controles espaciados, gestos simples con alternativa, Dynamic Type y Reduce Motion. |
| Apple HIG Buttons | https://developer.apple.com/design/human-interface-guidelines/buttons | Toda custom action necesita pressed state y solo la acción más probable debe ser prominente. |
| Apple HIG Motion | https://developer.apple.com/design/human-interface-guidelines/motion | Motion explica status/feedback; usar componentes familiares y respetar ajustes del sistema. |
| Apple HIG Entering data | https://developer.apple.com/design/human-interface-guidelines/entering-data | Minimizar entrada, ofrecer selección, validar dinámicamente y hacer inequívocos los requisitos. |
| Apple HIG Sheets | https://developer.apple.com/design/human-interface-guidelines/sheets | Sheet puede soportar progressive disclosure; cierre/back y detents deben sentirse previsibles. |
| Material Design — Chips | https://m2.material.io/components/chips/android | Chips representan input, choice, filter o acción contextual; no son contenedores genéricos de metadata pasiva. |
| Material Design — Text fields | https://m2.material.io/design/components/text-fields.html | Error reemplaza helper, explica cómo corregir y no depende solo de rojo/icono. |
| Google Calendar Help — Views | https://support.google.com/calendar/answer/6110849?hl=es | Day/Week/Month/Agenda son perspectivas persistentes; Today y navegación de fecha tienen affordances directas. |
| Google Calendar Accessibility | https://support.google.com/calendar/answer/6101541?hl=en | Month necesita navegación lógica por semanas/días y un acceso a overflow; Agenda es la vista más lineal para lectores. |
| Apple Reminders Support | https://support.apple.com/en-us/102484 | La importancia excepcional se marca de forma condicional; subtasks/tags viven como organización y detalle, no como badges universales. |

## 2. Principios derivados

1. **La frecuencia gana visibilidad.** Completar, verificar, crear y actualizar progreso deben costar un tap; cancel/trash/delete no.
2. **Un control tiene una semántica.** Chip = selección/filtro/input/acción contextual. Badge = estado excepcional o count necesario. Metadata = texto, no cápsula.
3. **La lista prioriza escaneo.** El objeto normal se resuelve en dos líneas; la excepción añade una línea o indicador, no una segunda card.
4. **Progressive disclosure no oculta lo frecuente.** Solo campos avanzados, history, administración y destrucción esperan.
5. **Motion cierra el loop.** Press, busy, success, rollback y error deben ser perceptibles y cancelables; nunca retrasan el trabajo.
6. **Responsive incluye texto grande.** No basta “caber” a escala 1.3; componentes refluye a 2 columnas/1 columna y conservan orden lógico.

## 3. Matriz comparativa de patrones

Escala taps: número habitual desde la superficie actual. Descubribilidad `A/M/B`; accesibilidad considera target, lector, alternativa y reflow.

| Patrón | Problema | Ventajas | Riesgos | Taps | Desc. | Accesibilidad | Compatibilidad HomePlus | Decisión |
|---|---|---|---|---:|---|---|---|---|
| Action grid 3 columnas | tres creaciones frecuentes | paralelo, compacto, rápido | texto grande | 1 | A | alta si full-cell 48dp+ | muy alta | ADAPT |
| Icon circles + labels | menú actual pesado | cálido, reconocible | círculo parece único target | 1 | A | media/alta | alta | ADAPT |
| Full-surface action tiles | límites táctiles | estado completo y reflow | exceso de cards si muy decorado | 1 | A | alta | muy alta | ADOPT |
| Open action band | reducir superficies | muy ligera | límites ambiguos, capability reflow | 1 | M | media | media | RESERVE |
| FAB expansion | acceso global | cercano al + actual | oculta labels, coordinación/back | 1–2 | M | media | media | NEEDS_PROTOTYPE |
| Bottom-sheet rows | labels largos | familiar, flexible | actual se siente administrativo | 1 | A | alta | baja para solo 3 | REJECT |
| Contextual menu | acciones raras | despeja row | baja descubribilidad | 2 | M | alta si labeled | alta para edit/cancel | ADOPT |
| Inline primary affordance | completion/verify | un tap, visible | targets múltiples en row | 1 | A | alta con orden | alta Task | ADOPT |
| Swipe actions | rapidez | gesto eficiente | oculto; conflicto scroll/nav; motor | 1 | B | baja sin alternativa | media | RESERVE |
| Overflow | acciones secundarias | reduce ruido | tap adicional | 2 | M | alta con label | muy alta | ADOPT |
| Flat two-line row | listas densas | escaneable, flexible | requiere buen whitespace | 1 | A | alta | muy alta | ADOPT |
| Card per item | objetos agrupados | target claro | borders/surfaces repetidos | 1 | A | alta | media | RESERVE |
| Grouped/sectioned list | separar today/attention | contexto natural | headers excesivos | 1 | A | alta con headings | alta | ADAPT |
| Comfortable density | lista normal | lectura cómoda | menos items | 1 | A | alta | alta | ADOPT default |
| Compact density | lista densa | más contenido | target/text comprometidos | 1 | A | media | media | NEEDS_PROTOTYPE |
| Progressive metadata | sobrecarga | normal silencioso | puede ocultar contexto | 1–2 | A | alta si detail | muy alta | ADOPT |
| Exceptional state line | estados importantes | no compite lo normal | demasiadas excepciones juntas | 1 | A | alta, no color-only | muy alta | ADOPT |
| Completion checkbox/button | task action | patrón familiar | checkbox implica selección | 1 | A | alta con role/label | alta | ADAPT como action, no selección |
| Filter chips | filtros directos | compactos, selected explícito | overflow horizontal | 1 | A | media/alta | media | ADAPT solo set corto |
| Passive metadata chip | metadata | compacta visualmente | falsa interactividad, ruido | 0 | M | baja | baja | REJECT |
| Badge excepcional | overdue/cancelled | llama atención | normalización del badge | 0 | A | alta con texto/icono | alta | ADOPT |
| Segmented control | 2–4 vistas exclusivas | estado visible | labels largos | 1 | A | alta | alta para Day/Week/Month; tabs raíz | ADAPT |
| Filter toolbar + sheet | muchos filtros | una entrada, escala | tap adicional | 2 | A | alta | muy alta | ADOPT |
| Quick Create | título + mínimo | velocidad | defaults invisibles | varios | A | alta | muy alta | ADOPT |
| Full Create | casos complejos | control completo | longitud | varios | A | alta si secciones | alta | ADOPT |
| Advanced disclosure | campos infrecuentes | reduce carga | discovery | 1 extra | A | alta expanded state | muy alta | ADOPT |
| Inline validation | errores tardíos | corrección local | feedback prematuro | 0 | A | alta con announcement | muy alta | ADOPT |
| Sticky CTA | formulario largo | acción alcanzable | teclado/safe area | 1 | A | alta | alta | ADAPT |
| Preserve draft | interrupción/back | evita pérdida | lifecycle/privacidad | 0 | A | alta | media | NEEDS_PROTOTYPE |
| Day + agenda | tiempo detallado | lineal y accesible | scrolling | 1 | A | alta | alta | ADOPT |
| Week strip + agenda | overview compacta | mejor que grid estrecha | menos simultaneidad visual | 1 | A | alta | alta | ADAPT |
| Month density dots + agenda | orientación | legible en móvil | detalle bajo demanda | 1 | A | alta si labels/count | muy alta | ADOPT |
| Events text inside Month cells | detalle inmediato | útil en tablet | ilegible móvil | 0 | A | baja compact | baja | REJECT compact |
| Action-first detail | acción común | claridad | puede sobrerrepresentar action | 1 | A | alta | alta Task/Goal | ADAPT |
| Metadata groups | detail largo | escaneo | cards anidadas | 0 | A | alta con headings | alta | ADOPT sin cards |
| Destructive footer | protección | separa peligro | scroll profundo | 2+ | M | alta | alta | ADAPT: overflow + sección final |
| Press opacity/scale | respuesta inmediata | confirma target | scale molesta con motion reduced | 0 | A | alta si no única señal | alta | ADAPT |
| Optimistic update | completar rápido | velocidad | rollback/conflicto | 1 | A | alta con busy/announcement | alta | ADOPT |
| Skeleton initial only | carga inicial | preserva estructura | motion/false progress | 0 | A | neutral | alta | ADOPT |
| Keep stale data + banner | refresh/offline | continuidad | dato desactualizado | 1 | A | alta | muy alta | ADOPT |
| Success animation decorative | “premium” | deleite | demora/distracción | 0 | A | baja | baja | REJECT |
| Haptic semantic | confirmación | no visual | preferencias/hardware | 0 | — | complementaria | alta | ADAPT |

## 4. Síntesis por área

### Acciones repetitivas

Adoptar acción inline para Task y tiles para crear. Overflow concentra acciones contextuales. Esta conclusión discovery reservaba swipe hasta prototipo; el addendum M11-C2, tras prototipo y contraste accesible, la reemplaza por la política Task-only acotada de la sección 6.

### Listas

Usar filas de dos líneas con divider/whitespace como default. Cards solo para summary agregado, empty/error o entidades que necesitan agrupación espacial real. Cómoda por defecto; compacta necesita prototipo y no puede bajar targets.

### Chips/filtros

Solo hay tres usos aceptados en Planner V1: filtros interactivos, selección de formulario y estado excepcional de baja frecuencia. Scope/categoría/status normal dejan de ser chips.

### Formularios

Quick Create y Full/Edit comparten datos pero no densidad. CTA debe mantenerse visible sin superponerse al teclado. Error se anuncia y explica corrección; success cierra la sheet o presenta resultado inequívoco.

### Calendar

Month es overview, no agenda comprimida. Day y agenda son lineales; Week móvil debe ser strip seleccionable + agenda, reservando grid temporal para ancho suficiente. Today siempre visible.

### Details

Título y acción primaria primero; metadata agrupada sin card por campo; history y acciones administrativas bajo disclosure. Destructive nunca comparte prominencia con save/complete.

### Motion/feedback

Press ≤80 ms; selection 140 ms; sheet 160–180 ms; state completion 180–240 ms. Reduced motion elimina traslación/scale y deja cambio instantáneo o fade corto si hace falta continuidad.

## 5. Resultado M11-B

La evidencia externa respalda adaptar patrones, no copiar productos. La dirección recomendada maximiza velocidad y claridad con costo moderado: reutiliza contracts, services y sheet ownership existentes, y concentra el cambio futuro en presentación y composición.

**M11-B RESEARCH STATUS: PASSED**

## 6. M11-C2 addendum — gestures, recovery and progressive learning

**Consulted:** 2026-07-18. These sources refine D11–D20 and D31–D36; they do not reopen M1–M10 behavior.

| Official source | Applied conclusion |
|---|---|
| [Apple HIG — Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures) | standard gestures remain accelerators; any custom/hidden gesture needs a simple visible alternative |
| [Apple HIG — Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus) | long press exposes a short state-relevant menu, hides unavailable commands and places destructive commands last; it never owns a unique action |
| [Apple HIG — Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo) | destructive or state-changing actions should be reversible when the domain supplies a valid inverse; HomePlus must not simulate reversibility |
| [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | labels, traits, focus order, large text and non-gesture alternatives are part of the design contract |
| [Apple HIG — Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) | teaching is contextual, optional and close to the feature; no blocking gesture tutorial |
| [Android — Principles for improving app accessibility](https://developer.android.com/guide/topics/ui/accessibility/views/principles-views) | custom accessibility actions expose the same row actions to TalkBack without requiring swipe discovery |
| [React Native — Accessibility](https://reactnative.dev/docs/accessibility) | `accessibilityActions`/`onAccessibilityAction`, state and live-region behavior require explicit parity tests |
| [WCAG 2.2 — Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation) | commit on release and allow retreat/cancellation before threshold action completes |
| [WCAG 2.2 — Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | every drag/swipe outcome needs a single-pointer non-drag method |
| [WCAG 2.2 — Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures) | path-based movement cannot be the only means of operation |
| [Material — Snackbars](https://m2.material.io/components/snackbars/android) | one concise temporary Undo action is appropriate; it must not become a multi-action queue or hide permanent state |
| [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) | haptics are optional enhancement with platform/device limits, never the sole feedback channel |

### Final applied policy

- **Tap is primary.** Visible complete/verify, row-to-Detail and overflow controls remain the canonical paths.
- **Partial swipe is Task-only.** Right reveals the current frequent action; left reveals `Más`. Event and Goal do not inherit Task semantics.
- **Full swipe is exceptional.** Only reversible Task completion may commit after a 70% threshold and release; verification and every destructive/administrative action are excluded.
- **Long press mirrors overflow.** It adds no command and contains no more than four state-valid actions.
- **Undo is contract-gated.** Six-second base availability, adjusted for accessibility timeout, only when an existing inverse/rollback can reliably restore state.
- **Learning is contextual.** One dismissible inline hint may appear after a successful visible completion and on a later eligible visit; it is suppressed for screen-reader, error, offline and transition contexts.
- **Haptics are restrained.** Visual feedback always occurs; optional haptics mark context-menu open, one threshold crossing and final success/failure, never an advance warning before destructive confirmation.

The interactive comparison is isolated at [`m11-proposals/planner-gesture-lab.html`](m11-proposals/planner-gesture-lab.html). Final decisions are frozen in the Registry and Freeze Contract after human approval.
