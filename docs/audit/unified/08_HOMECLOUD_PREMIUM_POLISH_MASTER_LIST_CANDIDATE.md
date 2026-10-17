# 08_HOMECLOUD_PREMIUM_POLISH_MASTER_LIST_CANDIDATE.md

**HomeCloud Unified Experience — Lista Maestra de Pulido Premium (Candidato)**

Status: **PROPUESTA** — Basada en auditorías U0, Product Truths, HC2-C audit y Planner_Visual_Freeze. Requiere **REVISIÓN Y APROBACIÓN DEL USUARIO**. No es implementación.

**Worktree**: `homecloud-unified` · **HEAD**: `f23213bc` · **Branch**: `homecloud/unified-integration`

---

## 1. Objetivo y Fuentes de Autoridad

### 1.1 Objetivo

Definir una lista completa, concreta y accionable de modificaciones de pulido premium para **todo el frontend visible de HomeCloud**, organizado por ubicación UI real. Cada modificación debe ser suficientemente específica para que un agente de implementación pueda ejecutarla sin inventar diseño.

### 1.2 Fuentes (orden de autoridad)

| # | Fuente | Contribución |
|---|--------|--------------|
| 1 | **Planes y Product Truths** (`HOMECLOUD_FILES_UX_UI_FREEZE_V1.md`, `HOMECLOUD_MEMORIES_FINAL_PRODUCT_TRUTH.md`, `HC2C_PRODUCT_IMPLEMENTATION_FREEZE.md`) | Contratos congelados, capacidades IN/OUT/DEFER, invariantes de dominio |
| 2 | **Planner_Visual_Freeze.md** (Memories Premium Experience Freeze) | Decisiones visuales de Memories, geometría propuesta, motion, popovers, audio, cámara |
| 3 | **Auditorías U0** (01-07) | Evidencia source-verified de screens, geometría, motion, componentes, gaps |
| 4 | **HC2-C Audit** (`HC2C_TOTAL_CURRENT_AUDIT.md`) | Root-cause de BUGs A-D, auditoría de capacidades, invariantes rotos |
| 5 | **Código actual** (`homecloud-unified` worktree) | Única autoridad de implementación actual |

### 1.3 Reglas de esta lista

- **NO** reauditar lo ya verificado. Reutilizar evidencia U0/HC2-C.
- **NO** proponer cambios que contradigan Product Truth congelado.
- **NO** implementar viewers Office faltantes (carril externo).
- **NO** inventar fases artificiales.
- **NO** proponer rearquitectura sin evidencia de que el comportamiento deseado no es alcanzable con la implementación actual.
- **SÍ** proponer cambios cosméticos/interacción concretos aunque la funcionalidad ya funcione.
- **SÍ** integrar residuales funcionales (video negro, audio seek, selección drag) dentro de sus superficies correspondientes.

---

## 2. Lista de Modificaciones

### 2.1 HOMECLOUD SHARED

---

#### HC-POL-001: Cross-fade en cambio de pestaña Archivos ↔ Recuerdos

**LOCATION**: Global Tab Selector (`HomeCloudScreen.tsx:28-35`)

**CURRENT**: Ambos panes montados simultáneamente (`display: 'none'`). El cambio de pestaña es un toggle instantáneo sin transición. El contenido aparece/disaparece abruptamente.

**PROBLEM / OPPORTUNITY**: La transición entre los dos módulos principales es visualmente abrupta. No hay continuidad espacial. El usuario pierde la sensación de que está navegando dentro de un mismo espacio.

**PRECISE TARGET**: Cross-fade de 150ms con `ease-out` entre los panes. El pane activo entra con `opacity: 0 → 1`, el inactivo sale con `opacity: 1 → 0`. Indicador del SegmentedControl se desliza simultáneamente (ya implementado).

**VISUAL GEOMETRY**: Duración 150ms, easing `easeOut`. Ambos panes ocupan el mismo espacio. Sin cambio de layout, solo opacity.

**INTERACTION / MOTION**: Trigger: tap en SegmentedControl. Origin: pane actual. Destination: pane destino. Interruption: tap en otra pestaña a mitad de transición → abortar, invertir. Reduced motion: 30ms linear.

**AFFECTED STATES**: Default (transición completada), mid-flight (interrumpida), reduced-motion (instantáneo).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.1 Tab Switch; `HomeCloudScreen.tsx:28-35`; `SegmentedControl.tsx`

**EXPECTED IMPACT**: El usuario percibe una transición fluida entre módulos en lugar de un salto visual. Mayor sensación de cohesión.

**TECHNICAL RISK**: LOW — `Animated.View` wrapper sobre ambos panes existentes.

**ACCEPTANCE CRITERION**: Cross-fade visible en device. Reduce motion desactiva la animación. No hay flash de contenido duplicado.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-002: Tokens de motion centralizados (MOTION tokens)

**LOCATION**: `theme.ts` (nueva exportación `MOTION`)

**CURRENT**: Duraciones y easings hardcodeados en múltiples componentes (`150`, `200`, `250`, `easeOut`, etc.). No existe un sistema unificado de motion.

**PROBLEM / OPPORTUNITY**: Sin tokens centralizados, cada animación usa valores ad-hoc. Cambiar la duración de una familia requiere buscar en todo el codebase. Inconsistencia risk.

**PRECISE TARGET**: Exportar objeto `MOTION` desde `theme.ts` con: `fast: 150`, `normal: 200`, `slow: 250`, `easeOut`, `easeIn`, `easeInOut`, `spring` (para origin-aware scale), `reducedMultiplier: 0.2`. Reemplazar valores hardcodeados por referencias a estos tokens.

**VISUAL GEOMETRY**: N/A (infraestructura de design tokens).

**INTERACTION / MOTION**: N/A — esto ES el sistema de motion.

**AFFECTED STATES**: Default, reduced-motion (tokens se multiplican por `reducedMultiplier`).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.3; `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §10

**EXPECTED IMPACT**: Consistencia en todas las animaciones. Cambio de duración centralizable.

**TECHNICAL RISK**: LOW — refactor de valores hardcodeados a referencias de token.

**ACCEPTANCE CRITERION**: Todas las animaciones usan `MOTION.*`. Reduce motion verificado.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-003: Hook `useReducedMotion`

**LOCATION**: `hooks/useReducedMotion.ts` (nuevo)

**CURRENT**: Solo `SegmentedControl` verifica `AccessibilityInfo.isReduceMotionEnabled`. ActionSheet, Viewer, drag auto-scroll, upload band, Album/Collection transitions NO lo verifican.

**PROBLEM / OPPORTUNITY**: Accesibilidad parcial. Usuarios con preferencia de movimiento reduido reciben animaciones completas en la mayoría de superficies.

**PRECISE TARGET**: Hook que retorna `boolean` + listener para cambios dinámicos. Gatear TODAS las animaciones `Animated.*` y `Modal animationType` con este hook. Si `reducedMotion` es true: duración × 0.2, easing `linear`, sin springs.

**VISUAL GEOMETRY**: N/A.

**INTERACTION / MOTION**: Se aplica a TODAS las animaciones de la app.

**AFFECTED STATES**: Default (animaciones completas), reduced-motion (animaciones minimizadas).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §6; `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §7 Reduce Motion; HC2-C §10.1 (EXPO_GO_SAFE)

**EXPECTED IMPACT**: Cumplimiento de accesibilidad. Usuarios con reduce-motion reciben experiencia respetuosa.

**TECHNICAL RISK**: LOW — gateo de animaciones existentes.

**ACCEPTANCE CRITERION**: Con reduce motion activado, ninguna animación supera 50ms. Verificado en device.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-004: Popover anclado contextual (File/Folder actions)

**LOCATION**: File Tile long press → acciones; Folder Tile long press → acciones

**CURRENT**: `FileActionHost` usa `ActionSheet size="scrollable-content"` — bottom sheet de 7 filas que ocupa ~90% del viewport. Para un menú contextual de 7 acciones sobre un tile específico, un bottom sheet es excesivo y desconectado del trigger.

**PROBLEM / OPPORTUNITY**: El usuario long-press un tile y ve un bottom sheet gigante que no tiene relación visual con el tile que presionó. Es lento de invocar (slide up de sheet completo) y no comunica "esto es sobre ESTE archivo".

**PRECISE TARGET**: Variante `size="popover"` en `ActionSheet`: se ancla al trigger (tile bounds), no tiene backdrop, muestra flecha apuntando al anchor. Ancho máximo: `viewportWidth - 32`. Filas de 48pt. Radio 18pt. Padding interno 8-12pt. Si el espacio arriba del trigger es < 100pt, flip debajo. Si no hay espacio ni arriba ni abajo, fallback a bottom sheet.

**VISUAL GEOMETRY**: Ancho: `min(300, viewportWidth - 32)` → 288pt en 360, 358pt en 390, 398pt en 430 (pero capped a 300). Alto: intrínseco por contenido. Radio: 18pt. Padding: 8-12pt. Separación entre filas: 8pt. Altura de fila: 48pt.

**INTERACTION / MOTION**: Trigger: long press en tile. Entry: fade + escala discreta desde la proximidad del botón (160-220ms, `easeOut`). Salida: animación inversa. Tap fuera: cierra. Back gesture: cierra. Safe area: clamped.

**AFFECTED STATES**: Default (visible), entry (fade+scale in), exit (fade+scale out), fallback (bottom sheet si no hay espacio).

**SOURCE REFERENCES**: `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §3.4-3.5; `06_UNIFIED_PREMIUM_FREEZE_CANDIDATE.md` §4.2; `FileActionHost.tsx`; `ActionSheet.tsx`

**EXPECTED IMPACT**: El menú contextual se siente conectado al tile. Apertura más rápida. Jerarquía visual más clara (no oscurece toda la pantalla).

**TECHNICAL RISK**: MEDIUM — nueva variante en `ActionSheet` con posicionamiento, colisión y safe-area.

**ACCEPTANCE CRITERION**: Popover se ancla correctamente en tiles de diferentes posiciones (top, medio, bottom de pantalla). Fallback a sheet en 360pt con fontScale 1.3. No se recorta por safe areas.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-005: Popover anclado para Viewer `⋯` (Memories)

**LOCATION**: Memory Viewer `⋯ Acciones` button

**CURRENT**: El menú `⋯` del Viewer abre un ActionSheet bottom sheet. El viewer es inmersivo (oculta chrome global) y un bottom sheet rompe la inmersión visual.

**PROBLEM / OPPORTUNITY**: Un bottom sheet desde un visor a pantalla completa es inconsistente con la presentación inmersiva. El popover anclado al botón `⋯` mantiene la continuidad espacial.

**PRECISE TARGET**: Popover anclado al botón `⋯` (esquina superior derecha). Ancho 248-280pt. Filas de 48pt. Separador antes de acciones destructivas. Sin backdrop oscuro (el contenido del viewer ya está visible detrás). Entrada: fade + escala 160-220ms.

**VISUAL GEOMETRY**: Ancho: 248-280pt. Filas: 48pt alto. Radio: 18pt. Padding: 8-12pt. Separador: 1pt `border.subtle` con margin vertical 8pt.

**INTERACTION / MOTION**: Trigger: tap en `⋯`. Entry: fade + escala desde el botón. Salida: inversa. Tap fuera: cierra. Back: cierra.

**AFFECTED STATES**: Default, entry, exit, con acciones destructivas (separador visible).

**SOURCE REFERENCES**: `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §3.4; `Planner_Visual_Freeze.md` §10.3; `MemoryViewer.tsx`

**EXPECTED IMPERTO**: El menú de acciones se siente integrado al viewer inmersivo.

**TECHNICAL RISK**: MEDIUM — mismo motor de popover que HC-POL-004.

**ACCEPTANCE CRITERION**: Popover no tapa permanentemente la imagen. Se posiciona correctamente con el viewer en fullscreen.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-006: Popover anclado para menú de Create `+` (Memories)

**LOCATION**: Botón `+` en Memories Root → menú de 5 acciones

**CURRENT**: `MemoryIntake` abre un ActionSheet bottom sheet con 5 items. El `+` es un botón discreto sin círculo.

**PROBLEM / OPPORTUNITY**: 5 acciones planas que lanzan sub-flujos. Un bottom sheet funciona pero un popover anclado al `+` sería más rápido y contextual.

**PRECISE TARGET**: Popover anclado al botón `+` (esquina superior derecha). Ancho hasta 288-300pt. Radio 18pt. Padding interno 8-12pt. Filas de 48-52pt. Icono a la izquierda. Texto alineado uniformemente. Sin submenú. Las 5 acciones en orden congelado: Fotos y videos, Capturar momento, Importar audio, Grabar audio, Escribir un recuerdo.

**VISUAL GEOMETRY**: Ancho: `min(300, viewportWidth - 32)`. Filas: 48-52pt. Icono: 24×24. Separación icono/texto: 12pt. Radio: 18pt.

**INTERACTION / MOTION**: Trigger: tap en `+`. Entry: fade + escala discreta desde la proximidad del botón (160-220ms). Salida: inversa. Tap fuera: cierra.

**AFFECTED STATES**: Default, entry, exit, gated (`contribute=false` → `+` no visible).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §10.2; `MemoryIntake.tsx`

**EXPECTED IMPACT**: Apertura más rápida del menú de creación. Mayor conexión visual con el botón `+`.

**TECHNICAL RISK**: MEDIUM — mismo motor de popover.

**ACCEPTANCE CRITERION**: Popover con 5 items no se recorta en 360pt. Iconos y texto alineados. Reduce motion respetado.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-007: Popover anclado para menús contextuales de Álbum/Tipo/Resurfacing/Trash/Favorites/Selección `⋯`

**LOCATION**: Todos los menús `⋯` de Memories (Album detail, Type collection, Resurfacing group, Trash, Favorites, Selection header)

**CURRENT**: Todos estos menús abren ActionSheet bottom sheets.

**PROBLEM / OPPORTUNITY**: Inconsistencia: el menú del `+` y el del Viewer serían popovers, pero los de Álbum/Tipo/etc. serían bottom sheets. Para mantener coherencia, todos los menús contextuales de pocas acciones deben ser popovers anclados.

**PRECISE TARGET**: Todos los `⋯` contextuales usan popover anclado al botón trigger. Ancho 248-300pt según número de acciones. Las operaciones con muchos destinos (ej: elegir álbum) conservan su sheet dedicado.

**VISUAL GEOMETRY**: Ancho: `min(280, viewportWidth - 32)` para ≤5 acciones; `min(300, ...)` para >5. Filas: 48pt. Separador antes de destructivas.

**INTERACTION / MOTION**: Igual que HC-POL-004/005/006.

**AFFECTED STATES**: Default, entry, exit, gated (permisos).

**SOURCE REFERENCES**: `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §3.4; `Planner_Visual_Freeze.md` §10.6

**EXPECTED IMPACT**: Sistema de popovers coherente en toda la app. El usuario aprende un patrón.

**TECHNICAL RISK**: MEDIUM — migración de múltiples superficies al popover.

**ACCEPTANCE CRITERION**: Todos los `⋯` contextuales usan popover. Los pickers de destino (muchos items) usan sheet. Coherencia visual confirmada.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-008: Estado de carga distinguible para portadas de álbum (BUG B3)

**LOCATION**: `AlbumTile.tsx:55-89` (`AlbumCoverImage`)

**CURRENT**: Mientras la portada se resuelve, se muestra el MISMO `AlbumCoverFallback` que para `unavailable` y `imageFailed`. Un cuadrado plano de `background.alt` con un glifo. No hay estado de carga distinguible.

**PROBLEM / OPPORTUNITY**: El usuario no puede distinguir "cargando" de "no disponible" de "falló". Los bloques grises planos se leen como "álbum en blanco", no como "cargando".

**PRECISE TARGET**: Estado `preview-loading` con skeleton que tenga la misma geometría final (132×132, radio 20pt) pero con `background.alt` y shimmer sutil (opcional). Distinto del fallback de unavailable (que muestra icono + copy "Sin portada").

**VISUAL GEOMETRY**: Skeleton: 132×132, radio 20pt, `background.alt`. Mismo tamaño que la portada final.

**INTERACTION / MOTION**: N/A — estado pasivo.

**AFFECTED STATES**: loading (skeleton), ready (imagen), unavailable (fallback con icono), error (fallback con icono + copy).

**SOURCE REFERENCES**: HC2-C §4.2 B3; `AlbumTile.tsx:55-89`

**EXPECTED IMPACT**: El usuario distingue claramente carga vs error vs vacío.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Portada en estado de carga se ve diferente a portada no disponible.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-009: Contraste de botones `⋯` sobre portadas claras/oscuras

**LOCATION**: Botones `⋯` sobre tiles de álbum, tipo, resurfacing

**CURRENT**: Los botones `⋯` usan `surface.soft` con `border.subtle`. Sobre portadas muy claras o muy oscuras, el contraste puede ser insuficiente.

**PROBLEM / OPPORTUNITY**: Accesibilidad y legibilidad. Un botón que no se distingue sobre la portada es un control inutilizable.

**PRECISE TARGET**: Añadir overlay semitransparente (`rgba(0,0,0,0.32)`) detrás del botón `⋯`, o usar `surface.card` con `elevation: 2`. Garantizar contraste ≥ 3:1 en ambos temas.

**VISUAL GEOMETRY**: Overlay: 44×44, `rgba(0,0,0,0.32)`, radio 9999 (o 12pt según diseño).

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Default, pressed, disabled.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §10.4 ("El botón necesita contraste suficiente sobre portadas claras u oscuras")

**EXPECTED IMPACT**: Botones siempre visibles y tocables.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Contraste verificado en portadas claras y oscuras, light y dark mode.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-010: Sheet → Popover fallback por espacio insuficiente

**LOCATION**: Motor de popover (compartido HC-POL-004/005/006/007)

**CURRENT**: No existe motor de popover.

**PROBLEM / OPPORTUNITY**: En pantallas pequeñas (360pt) con fontScale alto, un popover con muchas acciones puede no caber. Se necesita fallback automático.

**PRECISE TARGET**: Si el popover no cabe ni arriba ni abajo del trigger (espacio < 100pt), o si el alto del popover excede `viewportHeight * 0.6`, presentar como bottom sheet en su lugar. El usuario no nota el cambio de presentación.

**VISUAL GEOMETRY**: Umbral de flip: 100pt de espacio mínimo. Umbral de fallback a sheet: `popoverHeight > viewportHeight * 0.6`.

**INTERACTION / MOTION**: N/A — decisión de layout en render.

**AFFECTED STATES**: popover (normal), sheet (fallback).

**SOURCE REFERENCES**: `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §3.5 Collision Rules

**EXPECTED IMPACT**: Robustez en todas las geometrías de dispositivo.

**TECHNICAL RISK**: MEDIUM.

**ACCEPTANCE CRITERION**: En 360pt fontScale 1.3, los popovers tienen fallback a sheet cuando no caben.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

### 2.2 FILES

---

#### HC-POL-011: Transición Folder Enter/Back (slide direccional)

**LOCATION**: Root → Folder, Folder → Subfolder, Folder → Back

**CURRENT**: `setFolder(folderId)` → `loadFirstPage()`. El contenido cambia instantáneamente. El breadcrumb trail aparece/desaparece sin transición.

**PROBLEM / OPPORTUNITY**: Navegación jerárquica sin feedback espacial. El usuario no tiene sensación de "entrar" o "volver".

**PRECISE TARGET**: Slide right 200ms `ease-out` al entrar en carpeta (contenido entra desde la derecha). Slide left 200ms `ease-in` al volver (contenido sale hacia la izquierda). Breadcrumb: cross-fade 150ms.

**VISUAL GEOMETRY**: Duración: 200ms. Easing: easeOut (enter), easeIn (back). Distancia: 100% del ancho. Breadcrumb: altura 44pt, cross-fade.

**INTERACTION / MOTION**: Trigger: tap en FolderTile (enter), back gesture / breadcrumb tap (back). Origin: contenido actual. Destination: contenido nuevo. Interruption: back gesture → reverse slide. Reduced motion: 40ms linear.

**AFFECTED STATES**: Default, entering (slide right), exiting (slide left), mid-flight (interrumpido), reduced-motion.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 Folder Enter/Back; `HomeCloudFilesScreen.tsx`

**EXPECTED IMPACT**: El usuario percibe la jerarquía de carpetas como un desplazamiento espacial.

**TECHNICAL RISK**: MEDIUM — `Animated.View` sobre el contenedor del browser.

**ACCEPTANCE CRITERION**: Slide visible al entrar/volver de carpetas. Interrupción por back gesture funciona. Reduce motion desactiva.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-012: Apertura de File Viewer con escala desde tile

**LOCATION**: Tap en FileTile → `HomeCloudFileViewerScreen`

**CURRENT**: El Viewer es un `StyleSheet.absoluteFill` View que aparece instantáneamente (mount). No hay transición desde el tile.

**PROBLEM / OPPORTUNITY**: El usuario toca un archivo y la pantalla cambia abruptamente. No hay continuidad entre el tile y el visor.

**PRECISE TARGET**: Escala desde los bounds del tile: el viewer abre con `scale: 0.95 → 1` y `opacity: 0 → 1` desde la posición del tile. Duración 250ms con spring suave. Al cerrar: escala 1 → 0.95 y opacity 1 → 0, retornando a la posición del tile. Si el tile no está visible (scroll), usar fade simple 200ms.

**VISUAL GEOMETRY**: Origen: bounds medidos del tile (x, y, width, height). Destino: pantalla completa. Duración: 250ms. Easing: spring suave. Cierre: 200ms easeIn.

**INTERACTION / MOTION**: Trigger: tap en FileTile. Origin: tile bounds. Destination: fullscreen. Interruption: swipe down → cancel, return. Reduced motion: 50ms linear.

**AFFECTED STATES**: Default, opening (scale up), open (stable), closing (scale down), fallback (fade si tile offscreen), error (fallback inmediato).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 File→Viewer; `HomeCloudFileViewerScreen.tsx`

**EXPECTED IMPACT**: El usuario percibe que el archivo "se expande" desde su tile.

**TECHNICAL RISK**: HIGH — requiere medir bounds del tile antes de montar el viewer. Posible necesidad de shared element transition o escala aproximada.

**ACCEPTANCE CRITERION**: Apertura con escala visible. Cierre retornando al tile. Tile offscreen → fade fallback. Reduce motion desactiva.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-013: Header morph en entrada/salida de selección (Files)

**LOCATION**: `HomeCloudFilesScreen.tsx` header overflow → `Seleccionar`

**CURRENT**: El header normal se reemplaza condicionalmente por `FileSelectionBar`. Swap instantáneo sin transición.

**PROBLEM / OPPORTUNITY**: Cambio abrupto de header. No hay continuidad entre modo normal y modo selección.

**PRECISE TARGET**: Cross-fade 150ms `ease-out` entre header normal y selection bar. El selection bar tiene un slide down sutil (translateY: -8 → 0) para reforzar que "desde arriba".

**VISUAL GEOMETRY**: Duración: 150ms. Cross-fade de opacidad. Slide: 8pt. Easing: easeOut.

**INTERACTION / MOTION**: Trigger: tap en `Seleccionar` (enter), tap en `X` / back (exit). Origin: header actual. Interruption: tap fuera → cancel. Reduced motion: 30ms linear.

**AFFECTED STATES**: Default, entering, active, exiting, reduced-motion.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §3.1 Selection Header Morph; `FileSelectionBar.tsx`

**EXPECTED IMPACT**: Transición fluida entre modos. El header se transforma en lugar de saltar.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Cross-fade visible. Reduce motion desactiva.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-014: Feedback de selección de tile (Files) — check con escala

**LOCATION**: `MemorySelectableCard` seleccionado (Files grid)

**CURRENT**: `selected` → `borderWidth: 3`, `borderColor: terracotta[600]`, checkmark icon. El check aparece instantáneamente.

**PROBLEM / OPPORTUNITY**: Al seleccionar con drag sweep (D4), muchas celdas se seleccionan en rápida sucesión. Sin animación, cada check aparece con un "pop" visual que puede sentirse mecánico.

**PRECISE TARGET**: Check aparece con escala 0.85 → 1 en 100-140ms `easeOut`. La celda seleccionada tiene un tinte suave (overlay `terracotta[600]` con opacity 0.08). El anillo de selección es de 2pt.

**VISUAL GEOMETRY**: Check: 24×24, escala 0.85→1. Anillo: 2pt `terracotta[600]`. Tinte: `terracotta[600]` opacity 0.08. Duración: 100-140ms.

**INTERACTION / MOTION**: Trigger: tap o drag sweep. Origin: centro del check. Interruption: deselección → reverse. Reduced motion: instantáneo.

**AFFECTED STATES**: Default, selected (check visible), deselected (check oculto), multi-select (varios checks simultáneos, sin animaciones pesadas).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §4.5; `MemorySelectableCard.tsx`

**EXPECTED IMPACT**: Selección se siente táctil y responsiva. Drag sweep no genera 20 animaciones pesadas.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Check con escala visible al seleccionar. 20 selecciones rápidas no causan lag.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-015: Auto-scroll durante drag selection (Files) — feedback visual

**LOCATION**: `homecloudDragSelection.ts` + `MemorySelectableCard`

**CURRENT**: Auto-scroll con edge zone 72dp, step 12dp, tick 16ms. Funciona pero no hay feedback visual de que el scroll está ocurriendo por el drag.

**PROBLEM / OPPORTUNITY**: El usuario arrastra hacia el borde y el contenido se desplaza, pero no hay indicación visual de que el scroll es por el drag (puede sentirse como un scroll normal).

**PRECISE TARGET**: Indicador sutil de edge scroll: un gradiente de 24pt en el borde correspondiente con `terracotta[600]` opacity 0.15, visible solo durante el drag. Se desvanece al soltar.

**VISUAL GEOMETRY**: Gradiente: 24pt, `terracotta[600]` opacity 0.15, fade in 100ms.

**INTERACTION / MOTION**: Trigger: drag activo cerca del borde. Origin: borde de pantalla. Salida: fade out al soltar.

**AFFECTED STATES**: Default, dragging (indicador visible), released (indicador oculto).

**SOURCE REFERENCES**: HC2-C §4.3; `homecloudMemoryDrag.ts`

**EXPECTED IMPACT**: El usuario entiende que el scroll está ocurriendo por su gesto de arrastre.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Gradiente visible durante drag hacia el borde. Desaparece al soltar.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-016: Filtro Favoritos con feedback visual de modo activo

**LOCATION**: `FilesFilterMenu.tsx` → toggle Favoritos

**CURRENT**: El filtro de favoritos es un toggle en un menú. No hay indicación persistente de que el modo Favoritos está activo.

**PROBLEM / OPPORTUNITY**: El usuario puede olvidar que está en modo Favoritos. Confusión sobre por qué solo ve algunos archivos.

**PRECISE TARGET**: Cuando `favoritesOnly` es true, mostrar un chip/snippet sobre el grid: `Favoritos ✕` (tap para quitar). El chip tiene `terracotta[600]` como acento. Cross-fade 150ms al aparecer.

**VISUAL GEOMETRY**: Chip: altura 36pt, padding horizontal 12pt, radio 9999, `background: terracotta[600]` opacity 0.1. Texto: 13pt, `terracotta[600]`. Posición: entre search field y grid.

**INTERACTION / MOTION**: Trigger: toggle en filtro. Entry: fade + slide down 150ms. Salida: tap en ✕ o toggle off → fade out.

**AFFECTED STATES**: Default, filtro activo (chip visible), filtro inactivo (chip oculto).

**SOURCE REFERENCES**: `FilesFilterMenu.tsx`; Product Truth §Favorites filter

**EXPECTED IMPACT**: El usuario siempre sabe que está en modo Favoritos.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Chip visible cuando filtro activo. Tap en ✕ quita el filtro.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-017: Upload Progress Band — feedback más rico

**LOCATION**: `HomeCloudUploadProgress.tsx`

**CURRENT**: Banda global con `Subiendo X · N%` + `Cancelar`. Aparece con mount instantáneo.

**PROBLEM / OPPORTUNITY**: La banda aparece/desaparece abruptamente. No hay animación de entrada/salida. El progreso es solo textual.

**PRECISE TARGET**: Entrada: slide down desde arriba 200ms `ease-out` + fade. Salida: slide up + fade 150ms `easeIn`. Barra de progreso visual (4pt height, `terracotta[600]`, width = porcentaje) además del texto. Si hay múltiples jobs, indicador `X de Y`.

**VISUAL GEOMETRY**: Banda: `top: insets.top + 56`, `left: 16`, `right: 16`, radio 12pt, padding 12pt. Barra: 4pt height, radio 2pt. Animación: 200ms entrada, 150ms salida.

**INTERACTION / MOTION**: Trigger: upload job iniciado. Entry: slide down + fade. Salida: auto al completar, o manual al cancelar. Interruption: nuevo job → reset animación.

**AFFECTED STATES**: Default (oculto), uploading (visible con progreso), completed (fade out), cancelled (fade out), failed (fade out con copy de error).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 Upload Band; `HomeCloudUploadProgress.tsx`

**EXPECTED IMPACT**: El usuario ve el progreso de subida como un evento con peso visual, no solo texto.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Barra de progreso visible y se llena. Animación de entrada/salida fluida.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-018: Undo Snackbar — animación y claridad

**LOCATION**: `HomeCloudFilesScreen.tsx` → Snackbar "Movido a la papelera" + `Deshacer`

**CURRENT**: Snackbar aparece con mount instantáneo. `Deshacer` es un text button.

**PROBLEM / OPPORTUNITY**: El snackar de undo es la segunda oportunidad del usuario de recuperar un archivo. Debe ser prominente y claro.

**PRECISE TARGET**: Entrada: slide up 200ms `ease-out` + fade. El snackar tiene `surface.card` con `borderLeft: 4pt solid terracotta[600]`. `Deshacer` es un `AppButton variant="secondary"` con hit 44×44. Auto-dismiss a los 8 segundos con fade out.

**VISUAL GEOMETRY**: Snackbar: radio 12pt, padding 12pt, borderLeft 4pt `terracotta[600]`. Altura: 56pt. Auto-dismiss: 8000ms.

**INTERACTION / MOTION**: Trigger: acción de trash completada. Entry: slide up + fade. Salida: auto a los 8s o manual. Interruption: tap en `Deshacer` → ejecuta undo inmediatamente.

**AFFECTED STATES**: Default (oculto), visible (8s), dismissed (fade out), undo ejecutado (fade out + snackbar "Restaurado").

**SOURCE REFERENCES**: `HomeCloudFilesScreen.tsx`; Product Truth §Undo

**EXPECTED IMPACT**: El undo es más visible y accesible. El usuario tiene tiempo suficiente para reaccionar.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Snackbar visible 8s con undo funcional. Animación de entrada/salida.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-019: Estado vacío de Files con CTA más prominente

**LOCATION**: `HomeCloudFilesScreen.tsx` → `ListEmptyComponent`

**CURRENT**: Icono 64 + "Todavía no hay archivos" + `AppButton "Agregar archivo"`.

**PROBLEM / OPPORTUNITY**: El estado vacío funciona pero es visualmente discreto. Podría ser más acogedor.

**PRECISE TARGET**: Icono 64 con `terracotta[600]` opacity 0.15 de fondo (círculo 96pt). Título 22pt `title2` weight 600. Copy 17pt `body` `text.secondary`. CTA `AppButton size="lg"` (52pt alto). Separación entre elementos: 16pt. El conjunto centrado verticalmente en el espacio disponible.

**VISUAL GEOMETRY**: Contenedor: padding 32pt. Icono container: 96×96, radio 9999, `terracotta[600]` opacity 0.15. Gap entre elementos: 16pt. CTA: 52pt alto.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Empty (sin contenido), gated (`contribute=false` → sin CTA).

**SOURCE REFERENCES**: `HomeCloudFilesScreen.tsx`; Product Truth §Empty states

**EXPECTED IMPACT**: El estado vacío se siente más diseñado y menos "roto".

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: CTA visible y tocable. Centrado vertical. Contraste correcto.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-020: Error State con retry más claro (Files)

**LOCATION**: `HomeCloudFilesScreen.tsx` → `ErrorState`

**CURRENT**: `ErrorState` con icono 48 + mensaje + `Reintentar`.

**PROBLEM / OPPORTUNITY**: El estado de error preserva la lista cargada (correcto), pero visualmente puede confundirse con un estado vacío.

**PRECISE TARGET**: Añadir distinción visual: `ErrorState` usa `semantic.error` como color de acento (icono y borde). El copy explica qué falló ("No se pudieron cargar los archivos"). Si hay contenido previo visible, el error aparece como banner inline (no reemplaza la lista).

**VISUAL GEOMETRY**: Icono: 48×48, `semantic.error`. Banner: `background: semantic.error` opacity 0.08, `borderLeft: 4pt solid semantic.error`. Botón: `AppButton variant="secondary"`.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Error (con retry), retrying (spinner), recovered (vuelve a data).

**SOURCE REFERENCES**: `ErrorState.tsx`; `HomeCloudFilesScreen.tsx`

**EXPECTED IMPACT**: El usuario distingue error de vacío. Sabe qué hacer.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Error visualmente distinto de vacío. Retry funcional.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-021: File Tile — badge de favorito persistente

**LOCATION**: `FileTile` en grid

**CURRENT**: El favorito solo se ve en el menú de acciones. No hay indicación visual en el tile.

**PROBLEM / OPPORTUNITY**: El usuario no sabe cuáles archivos son favoritos sin abrir el menú.

**PRECISE TARGET**: Badge de estrella (16×16) en la esquina superior derecha del tile, visible solo si `isFavorite`. Con fade in 150ms al aparecer. Misma posición que el badge de carpeta.

**VISUAL GEOMETRY**: Badge: 16×16, posición `top: 8, right: 8`. Icono estrella 12pt, `terracotta[600]`. Fondo: `surface.card` con radio 9999 y padding 4pt.

**INTERACTION / MOTION**: Trigger: toggle de favorito. Entry: fade in 150ms. Salida: fade out.

**AFFECTED STATES**: Default, favorito (badge visible), no favorito (sin badge).

**SOURCE REFERENCES**: `HomeCloudFilesScreen.tsx`; Product Truth §Personal Favorites

**EXPECTED IMPACT**: Identificación rápida de favoritos en el grid.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Badge visible en tiles favoritos. No se solapa con badge de carpeta.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-022: Scanner — transición capture → review más suave

**LOCATION**: `HomeCloudScannerScreen.tsx` → review sheet

**CURRENT**: Al escanear, las páginas se capturan y se muestran en un review sheet. La transición es un reemplazo instantáneo.

**PROBLEM / OPPORTUNITY**: El scanner es un momento de "creación" que merece una transición más cuidada.

**PRECISE TARGET**: Al capturar la última página, slide up del review sheet 200ms `ease-out` (ya es nativo, pero asegurar que el contenido ya está renderizado antes de la animación, para evitar flash de skeleton). El thumbnail de la página capturada aparece con un flash sutil de 100ms (opacity 0.5 → 1) para confirmar la captura.

**VISUAL GEOMETRY**: Review sheet: `size="near-full"` (95% viewport). Thumbnail: radio 12pt. Flash: 100ms.

**INTERACTION / MOTION**: Trigger: tap en "Completar" o última página. Entry: slide up 200ms. Salida: tap fuera / cancelar → slide down 150ms.

**AFFECTED STATES**: Capturing (flash), captured (thumbnail visible), reviewing (sheet visible), cancelled (slide down).

**SOURCE REFERENCES**: `HomeCloudScannerScreen.tsx`

**EXPECTED IMPACT**: La captura se siente como un evento confirmado.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Flash visible al capturar. Sheet con contenido renderizado antes de animar.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-023: Move Destination Picker — jerarquía visual de carpetas anidadas

**LOCATION**: `FileMoveDestinationPicker.tsx`

**CURRENT**: Lista depth-first con paths computados. Funciona pero puede ser difícil de escanear visualmente.

**PROBLEM / OPPORTUNITY**: Con carpetas anidadas, una lista plana de paths es difícil de leer. El usuario necesita entender la jerarquía de un vistazo.

**PRECISE TARGET**: Indentación visual por nivel de profundidad: cada nivel añade 16pt de paddingLeft. Las carpetas padre tienen un icono de carpeta (16pt) con `terracotta[600]`. Los paths se muestran con `text.secondary` en vez de `text.primary`. La carpeta destino seleccionada tiene un fondo `terracotta[600]` opacity 0.08 con radio 8pt.

**VISUAL GEOMETRY**: Indentación: 16pt por nivel. Icono carpeta: 16×16. Fondo seleccionado: radio 8pt, `terracotta[600]` opacity 0.08. Altura de fila: 52pt.

**INTERACTION / MOTION**: N/A — layout estático.

**AFFECTED STATES**: Default, selected, multi-level (indentado).

**SOURCE REFERENCES**: `FileMoveDestinationPicker.tsx`; Product Truth §Move

**EXPECTED IMPACT**: El usuario entiende la jerarquía de un vistazo. Selección más rápida.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Jerarquía visible en carpetas anidadas. Selección clara.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-024: Info Sheet — metadatos más legibles

**LOCATION**: `FileActionHost.tsx` → File Info Sheet

**CURRENT**: Nombre, Carpeta, Fecha de documento, Nota. Presentados como rows en un sheet.

**PROBLEM / OPPORTUNITY**: Los metadatos son información densa que necesita jerarquía visual. Actualmente son rows uniformes sin distinción entre label y valor.

**PRECISE TARGET**: Label en `caption` (13pt) `text.secondary` encima, valor en `body` (17pt) `text.primary` debajo. Separación entre campos: 16pt. El nombre del archivo tiene un icono de tipo de archivo (24pt) a la izquierda con color por tipo (PDF rojo, imagen verde, etc.). Los campos editables tienen un indicador sutil de "editable" (icono pencil 16pt `terracotta[600]`).

**VISUAL GEOMETRY**: Label: 13pt, `text.secondary`. Valor: 17pt, `text.primary`. Gap: 16pt. Icono tipo: 24×24. Indicador editable: 16×16.

**INTERACTION / MOTION**: N/A — layout estático.

**AFFECTED STATES**: Default, editando (campo activo), guardado (feedback).

**SOURCE REFERENCES**: `FileActionHost.tsx`; Product Truth §File Info

**EXPECTED IMPACT**: Los metadatos son más legibles y escaneables.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Jerarquía label/valor clara. Indicador editable visible.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

### 2.3 MEMORIES

---

#### HC-POL-025: Root IA — composición más compacta y fotográfica

**LOCATION**: `HomeCloudMemoriesScreen.tsx` → Root IA completa

**CURRENT**: TitleRow + Resurfacing + Albums Rail + Types Rail + Timeline. Funciona pero el prompt Planner_Visual_Freeze pide: "Root más compacto y fotográfico; menos espacio vertical desperdiciado; Types notablemente más pequeños que Álbumes; Timeline de 3 columnas refinado".

**PROBLEM / OPPORTUNITY**: La composición actual funciona pero no es tan compacta ni fotográfica como el freeze premium exige. Los Types ocupan demasiado espacio (100×100) en comparación con Álbumes (132×132).

**PRECISE TARGET**:
- **Margins**: 20pt horizontales (consistente con Planner_Visual_Freeze §2.1).
- **Separación entre secciones**: 20-24pt.
- **Separación título/contenido de sección**: 12pt.
- **Types Rail**: Tiles de 74-88pt (adaptable por ancho: 74 en 360, 82 en 390, 88 en 430). Icono centrado 24×24. Etiqueta debajo 12pt.
- **Albums Rail**: Tiles de 132×132 con radio 20pt. Nombre debajo.
- **Timeline**: 3 columnas, gap 8pt, radio 14pt para fotografías pequeñas. Sin bordes visibles sobre imágenes cargadas.
- **Refurfacing**: Tarjetas de 236-280pt de ancho (adaptable), proporción 16:9, radio 20pt, spacing 12pt.

**VISUAL GEOMETRY**: Ver tabla anterior. Ancho útil: 320pt (360), 350pt (390), 390pt (430).

**INTERACTION / MOTION**: N/A — layout estático.

**AFFECTED STATES**: Default, sin contenido (tipos/albunes vacíos), cargando (skeletons).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §2.1, §3.3-3.8; `HomeCloudMemoriesScreen.tsx`

**EXPECTED IMPACT**: Root más compacto, fotográfico y premium. Types son accesos compactos, no tarjetas grandes.

**TECHNICAL RISK**: MEDIUM — cambio de dimensiones en múltiples componentes del root.

**ACCEPTANCE CRITERION**: Types visiblemente más pequeños que Álbumes. Separaciones consistentes. Timeline con 3 columnas y gap 8pt.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-026: Resurfacing — carrusel fotográfico premium con next-card peek

**LOCATION**: `HomeCloudMemoriesScreen.tsx` → Resurfacing band

**CURRENT**: Tiles de 160×160 con radio 24pt. El freeze pide: "carrusel horizontal de tarjetas fotográficas con una parte visible de la siguiente tarjeta".

**PROBLEM / OPPORTUNITY**: Las tarjetas actuales son cuadradas y pequeñas. El freeze premium exige tarjetas más grandes, fotográficas, con peek de la siguiente para invitar al scroll horizontal.

**PRECISE TARGET**: Tarjetas de ancho adaptable (236 en 360, 252 en 390, 280 en 430) con proporción 16:9. Radio 20pt. La siguiente tarjeta muestra ~16pt de peek en el borde derecho. Espaciado entre tarjetas: 12pt. Información en región inferior compacta: título ("Un día como hoy" / fecha real), referencia temporal ("Hace 3 años"), contenido ("5 recuerdos"). Preview con la misma geometría. Fallback tipográfico para audio/escritos.

**VISUAL GEOMETRY**: Ancho: 236-280pt (adaptable). Proporción: 16:9 → alto 133-158pt. Radio: 20pt. Peek: 16pt. Spacing: 12pt.

**INTERACTION / MOTION**: Scroll horizontal con paging suave (snap a cada tarjeta). Tap en tarjeta → abre grupo de resurfacing con slide up 250ms.

**AFFECTED STATES**: Default, cargando (placeholder misma geometría), con contenido (fotografía real), fallback (audio/escrito → tipográfico).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §3.3, §3.5; `HomeCloudMemoriesScreen.tsx`

**EXPECTED IMPACT**: Resurfacing se siente como una galería premium, no como una fila de cuadrados.

**TECHNICAL RISK**: MEDIUM — cambio de dimensiones y proporción.

**ACCEPTANCE CRITERION**: Tarjetas con peek de la siguiente. Información jerárquica (título/fecha/count). Fallback tipográfico para no-fotografías.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-027: Resurfacing Group — presentación inmersiva del grupo

**LOCATION**: `HomeCloudMemoriesScreen.tsx` → Resurfacing group overlay

**CURRENT**: Overlay con SectionList de memories del grupo. Funciona pero no tiene la continuidad visual de "la tarjeta se expandió hacia este grupo".

**PROBLEM / OPPORTUNITY**: El usuario toca una tarjeta de resurfacing y ve una lista. No hay sensación de que la tarjeta "llegó aquí".

**PRECISE TARGET**: Header del grupo con la misma fotografía que la portada de la tarjeta que lo originó (continuidad visual). El header muestra fecha y cantidad. El contenido son los recuerdos del grupo. La cabecera se siente como una continuación de la tarjeta. El usuario puede abrir un memory en el Viewer sin perder el grupo. Al cerrar el Viewer vuelve al mismo grupo y posición. Al cerrar el grupo vuelve a la raíz.

**VISUAL GEOMETRY**: Header: altura 120pt, fotografía de fondo con overlay `rgba(0,0,0,0.4)`. Título: 22pt `title2` blanco. Subtítulo: 15pt blanco opacity 0.8. Contenido: 3 columnas, gap 8pt.

**INTERACTION / MOTION**: Trigger: tap en tarjeta de resurfacing. Entry: slide up 250ms `ease-out` + la cabecera tiene continuidad con la tarjeta (cross-fade). Salida: slide down 200ms. Back: slide down.

**AFFECTED STATES**: Default, open (inmersivo), closed (vuelve a root), con viewer abierto (cierra a grupo).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §3.4; `HomeCloudMemoriesScreen.tsx`

**EXPECTED IMPACT**: El grupo se siente como una extensión natural de la tarjeta.

**TECHNICAL RISK**: MEDIUM.

**ACCEPTANCE CRITERION**: Cabecera con misma fotografía que la tarjeta. Retorno correcto a grupo y a root.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-028: Albums Radio — transición direccional de entrada/salida

**LOCATION**: `AlbumsRail.tsx` → Album Detail overlay

**CURRENT**: El overlay de álbum aparece con mount instantáneo (zIndex: 10).

**PROBLEM / OPPORTUNITY**: La transición de root → álbum no tiene continuidad espacial con el tile que se tocó.

**PRECISE TARGET**: Slide up 250ms `ease-out` desde la posición del tile de álbum. El contenido del álbum entra desde abajo con fade. Al cerrar: slide down 200ms `ease-in`. El root se atenúa (overlay `rgba(0,0,0,0.2)`) mientras el overlay está abierto.

**VISUAL GEOMETRY**: Duración: 250ms entrada, 200ms salida. Easing: easeOut/easeIn. Overlay de root: `rgba(0,0,0,0.2)`.

**INTERACTION / MOTION**: Trigger: tap en AlbumTile. Origin: tile bounds. Interruption: back gesture / swipe down → reverse. Reduced motion: 50ms linear.

**AFFECTED STATES**: Default, opening (slide up), open (stable), closing (slide down), reduced-motion.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 Album→Detail; `AlbumDetailView.tsx`

**EXPECTED IMPACT**: El álbum se siente como que "sube" desde el tile.

**TECHNICAL RISK**: MEDIUM — animación de overlay.

**ACCEPTANCE CRITERION**: Slide visible. Overlay de root se atenúa. Cierre funcional.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-029: Types Radio — acceso compacto

**LOCATION**: `MemoryCollectionTile.tsx` → Types Rail (Fotos, Videos, Audios, Notas)

**CURRENT**: Tiles de 100×100 con radio 24pt. Mismos títulos que Álbumes. El freeze pide: "Tipos notablemente más pequeños que Álbumes".

**PROBLEM / OPPORTUNITY**: Los Types son accesos de navegación, no colecciones principales. Deben ser visualmente más ligeros que los Álbumes.

**PRECISE TARGET**: Tiles de 74-88pt (adaptable). Radio 16pt (no 24pt como Álbumes). Icono principal centrado 24×24. Etiqueta breve debajo 12pt `text.secondary`. Fondo: `surface.card` con borde 1pt `border.subtle`. Sin contadores. La fila es horizontal con los 4 tipos + espaciado 12pt.

**VISUAL GEOMETRY**: Tile: 74×74 (360), 82×82 (390), 88×88 (430). Radio: 16pt. Icono: 24×24. Etiqueta: 12pt. Gap: 12pt.

**INTERACTION / MOTION**: Tap en tile → abre colección con slide up 250ms.

**AFFECTED STATES**: Default, pressed, gated (sin contenido → empty honesto).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §3.7; `MemoryCollectionTile.tsx`

**EXPECTED IMPACT**: Los Types son accesos ligeros, no compiten visualmente con Álbumes.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Types visiblemente más pequeños que Álbumes. Gap consistente.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-030: Timeline — refinamiento de grid de 3 columnas

**LOCATION**: `MemoryTimelineRow.tsx` + `MemorySelectableCard.tsx`

**CURRENT**: 3 columnas, gap 8pt, radio 24pt. El freeze pide: "Radio de 14pt para fotografías pequeñas; espaciado de 8pt; sin bordes visibles sobre imágenes cargadas; secciones de fecha claramente diferenciadas".

**PROBLEM / OPPORTUNITY**: El radio de 24pt es demasiado redondeado para celdas pequeñas de timeline. Puede generar "esquinas blancas" entre celdas adyacentes.

**PRECISE TARGET**: Radio: 14pt para celdas de timeline. Gap: 8pt. Sin bordes sobre imágenes cargadas (solo en selección). Secciones de fecha: `title2` 28pt, `marginTop: 24pt`, `paddingHorizontal: 16pt`, con separador sutil de 1pt `border.subtle` encima del título de sección. Skeleton con dimensiones idénticas a la celda final. Las fotografías renderizadas permanecen visibles durante refresh.

**VISUAL GEOMETRY**: Celda: ancho variable (3 columnas), radio 14pt. Gap: 8pt. Sección: altura 40pt (título + separador). Skeleton: misma geometría que celda.

**INTERACTION / MOTION**: N/A — layout estático.

**AFFECTED STATES**: Default, cargando (skeleton), con datos (fotografías), seleccionando (borde + check).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §3.8; `MemoryTimelineRow.tsx`

**EXPECTED IMPACT**: Timeline más denso y fotográfico. Secciones claramente diferenciadas.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERIA**: Radio 14pt. Sin esquinas blancas entre celdas. Secciones diferenciadas.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-031: Memory Viewer — apertura cinematográfica desde tile

**LOCATION**: Tap en memory tile → `MemoryViewer.tsx`

**CURRENT**: El Viewer es un `StyleSheet.absoluteFill` View (zIndex: 20) que aparece instantáneamente. No hay transición desde el tile.

**PROBLEM / OPPORTUNITY**: El freeze premium pide: "El Viewer debe sentirse conectado con la fotografía tocada. Una representación temporal de esa foto se expande hacia el Viewer."

**PRECISE TARGET**: Secuencia de apertura:
1. El usuario toca la fotografía.
2. Se captura su posición y tamaño visibles (medidos con `measure`).
3. Una representación temporal (snapshot del preview) se expande hacia el Viewer con escala 0.95 → 1 y opacity 0 → 1.
4. El fondo pasa gradualmente a la superficie inmersiva.
5. Los controles aparecen con transición breve (fade 150ms).

Duración: 260-300ms con spring suave. Cierre: si la celda de origen existe y es medible, la imagen vuelve visualmente a ella. Si no, fade/scale seguro. No se hace scroll automático. No se pierde el álbum/tipo/grupo desde el que se abrió.

**VISUAL GEOMETRY**: Origen: bounds medidos del tile. Destino: pantalla completa. Duración: 260-300ms. Chrome: fade in 150ms después de la imagen.

**INTERACTION / MOTION**: Trigger: tap en tile. Origin: tile bounds. Interruption: swipe down → cancel, return. Reduced motion: 50ms linear.

**AFFECTED STATES**: Default, opening (scale up), open (stable), closing (scale down), fallback (fade si tile offscreen), error (fallback inmediato), missing (celda eliminada → sin animación).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §5.1; `MemoryViewer.tsx`

**EXPECTED IMPACT**: El usuario percibe que la fotografía "se expande" desde su tile hacia el visor inmersivo.

**TECHNICAL RISK**: HIGH — requiere medir bounds del tile antes de montar el viewer. Posible necesidad de shared element transition o escala aproximada con `Animated.Image`.

**ACCEPTANCE CRITERION**: Apertura con escala visible desde el tile. Cierre retornando al tile. Tile offscreen → fade fallback. Reduce motion desactiva.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-032: Memory Viewer — cierre con retorno a la celda de origen

**LOCATION**: `MemoryViewer.tsx` → close

**CURRENT**: `setViewer(null)` → el overlay se desmonta instantáneamente. No hay retorno visual a la celda de origen.

**PROBLEM / OPPORTUNITY**: El cierre abrupto rompe la continuidad espacial. El freeze pide retorno reversible.

**PRECISE TARGET**: Al cerrar, si la celda de origen existe y es medible, la imagen se contrae visualmente hacia la posición de la celda con escala 1 → 0.95 y opacity 1 → 0. Duración: 200ms `easeIn`. Si la celda no está visible (offscreen), fade simple 200ms. No se hace scroll automático para encontrar el origen. No se reinicia la galería. No se pierde el álbum/tipo/grupo.

**VISUAL GEOMETRY**: Duración: 200ms. Easing: easeIn. Escala: 1 → 0.95.

**INTERACTION / MOTION**: Trigger: tap en Cerrar / back gesture / swipe down. Origin: pantalla completa. Destination: celda de origen. Interruption: tap en media → cancel close. Reduced motion: 40ms linear.

**AFFECTED STATES**: Open, closing (scale down), closed (vuelve a source), fallback (fade si offscreen), reduced-motion.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §5.2; `MemoryViewer.tsx`

**EXPECTED IMPACT**: El usuario percibe que la fotografía "vuelve a su lugar".

**TECHNICAL RISK**: HIGH — requiere medir bounds de la celda antes de desmontar el viewer.

**ACCEPTANCE CRITERION**: Cierre con retorno a la celda visible. Offscreen → fade. Reduce motion.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-033: Memory Viewer — chrome show/hide con fade

**LOCATION**: `MemoryViewer.tsx` → tap en media → toggle chrome

**CURRENT**: El chrome (top y bottom) está siempre visible.

**PROBLEM / OPPORTUNITY**: Para una experiencia inmersiva premium, el chrome debe poder ocultarse para disfrutar de la fotografía sin distracciones.

**PRECISE TARGET**: Tap en la zona central de la imagen → toggle chrome. El chrome aparece/desaparece con fade 150ms `easeOut`. El pager no debe animarse cuando se ocultan los controles. El estado del chrome persiste entre páginas (si está oculto, permanece oculto).

**VISUAL GEOMETRY**: Duración: 150ms. Easing: easeOut. Afecta solo a top chrome y bottom chrome.

**INTERACTION / MOTION**: Trigger: tap en media. Interruption: swipe → cancel toggle. Reduced motion: instantáneo.

**AFFECTED STATES**: Chrome visible, chrome oculto, toggling (fade).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §5.3; `MemoryViewer.tsx`

**EXPECTED IMPACT**: El usuario puede disfrutar de la fotografía sin distracciones.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Chrome se oculta/muestra con fade. Pager no se ve afectado. Estado persiste entre páginas.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-034: Memory Viewer — pager swipe con reduce motion

**LOCATION**: `MemoryViewer.tsx` → FlatList horizontal pagingEnabled

**CURRENT**: Pager nativo con `pagingEnabled`. No verifica `reduceMotion`.

**PROBLEM / OPPORTUNITY**: Con reduce motion activado, el pager snap puede sentirse excesivamente animado.

**PRECISE TARGET**: Con `reduceMotion`, desactivar el snap animado (paging instantáneo). Sin reduce motion, mantener el snap nativo.

**VISUAL GEOMETRY**: N/A.

**INTERACTION / MOTION**: Swipe horizontal → cambio de página.

**AFFECTED STATES**: Default (snap animado), reduced-motion (snap instantáneo).

**SOURCE REFERENCES**: `MemoryViewer.tsx`; HC2-C §10.1

**EXPECTED IMPACT**: Accesibilidad respetada.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Con reduce motion, el cambio de página es instantáneo.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-035: Image Viewer — double-tap zoom/reset

**LOCATION**: `MemoryViewer.tsx` → `ImagePage`

**CURRENT**: No implementado. El freeze lo marca como IN (Product Truth §14.2). El HC2-C lo marca DEFER por riesgo de arbitraje con pager.

**PROBLEM / OPPORTUNITY**: Es un gesto universal en galerías. Su ausencia es notable en un producto premium.

**PRECISE TARGET**: Doble tap a escala 1: zoom in cerca del punto de tap (escala 1 → 2, centrado en el tap). Doble tap mientras hay zoom: reset a escala 1. Arbitraje con pager: a escala 1, el swipe horizontal pagina. Con zoom, el pan pertenece a la imagen. Duración: 200ms `easeOut`.

**VISUAL GEOMETRY**: Zoom: 1 → 2×. Centrado en tap location. Duración: 200ms.

**INTERACTION / MOTION**: Trigger: doble tap. Interruption: pinch → cancel double-tap. Reduced motion: instantáneo.

**AFFECTED STATES**: Fit (escala 1), zoomed (escala >1), transitioning.

**SOURCE REFERENCES**: Product Truth §14.2; HC2-C §10.1; `ImagePage`

**EXPECTED IMPACT**: Gesto universal de galería presente.

**TECHNICAL RISK**: HIGH — arbitraje con pager. Puede requerir gesture-handler/reanimated. Regla: si el stack actual no es suficiente, la regla "sin dependencia nueva" puede ser supersedida (Product Truth §14.2).

**ACCEPTANCE CRITERION**: Double-tap zoom/reset funcional. Pager no interfiere. Reduce motion.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-036: Video Viewer — double-tap ±10s

**LOCATION**: `MemoryVideoPage.tsx`

**CURRENT**: No implementado. Product Truth §15.5 lo marca IN. HC2-C lo marca DEFER por conflicto con native controls.

**PROBLEM / OPPORTUNITY**: Gestos universales de video. El native controls ya tiene seek, pero el double-tap es más rápido.

**PRECISE TARGET**: Doble tap en lado izquierdo: -10 segundos. Doble tap en lado derecho: +10 segundos. Clamp en 0 y duración. No debe: paginar accidentalmente, disparar seek nativo dos veces, pelear con fullscreen, seek páginas inactivas.

**VISUAL GEOMETRY**: Zonas: 40% izquierdo / 40% derecho / 20% center (sin acción). Indicador visual: overlay con `−10s` / `+10s` por 600ms.

**INTERACTION / MOTION**: Trigger: doble tap. Interruption: single tap → toggle chrome. Reduced motion: sin indicador visual.

**AFFECTED STATES**: Playing, paused, buffering, fullscreen.

**SOURCE REFERENCES**: Product Truth §15.5; HC2-C §10.2; `MemoryVideoPage.tsx`

**EXPECTED IMPACT**: Control de video más rápido y natural.

**TECHNICAL RISK**: HIGH — arbitraje con native controls y pager.

**ACCEPTANCE CRITERION**: ±10s funcional. Sin conflicto con pager ni fullscreen.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-037: Video Viewer — poster mientras se prepara

**LOCATION**: `MemoryVideoPage.tsx`

**CURRENT**: El video pide solo el original. No hay poster. El estado no-listo es spinner + "Cargando video…" sobre negro.

**PROBLEM / OPPORTUNITY**: Un video largo sobre red móvil produce la experiencia "tarda una eternidad". Product Truth §15.4 marca poster como IN.

**PRECISE TARGET**: Si `hasPreview` es true, mostrar el poster hasta que el player esté listo. El spinner se reemplaza por el poster. El overlay de buffering desaparece cuando `status === 'readyToPlay'`. Si `hasPreview` es false, spinner honesto + copy "Preparando video…". Nunca un cuadrado negro ambiguo.

**VISUAL GEOMETRY**: Poster: mismo tamaño que el video (width × height). Overlay de buffering: centrado, 48×48 spinner + copy 15pt.

**INTERACTION / MOTION**: Trigger: apertura de video. Entry: poster aparece inmediatamente. Player ready → poster desaparece (cross-fade 200ms).

**AFFECTED STATES**: Loading (spinner), poster visible (imagen), ready (player), error (copy honesto).

**SOURCE REFERENCES**: Product Truth §15.3-15.4; HC2-C §10.2; `MemoryVideoPage.tsx`

**EXPECTED IMPACT**: El usuario ve algo inmediatamente en lugar de un spinner eterno.

**TECHNICAL RISK**: MEDIUM — requiere `hasPreview` en el dataset (ya existe en preview pipeline).

**ACCEPTANCE CRITERION**: Poster visible antes de player ready. Spinner honesto sin poster.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-038: Audio Viewer — jerarquía visual premium

**LOCATION**: `MemoryAudioPage.tsx`

**CURRENT**: Controles básicos: play/pause, seek, tiempo, duración. El freeze pide: "Una composición vertical centrada, con ancho máximo de contenido aproximado de 360pt. Bloque 1: Identidad. Bloque 2: Progreso. Bloque 3: Reproducción. Bloque 4: Velocidad."

**PROBLEM / OPPORTUNITY**: El audio viewer actual es funcional pero no tiene la jerarquía visual premium que el freeze exige. El play/pause no es lo suficientemente prominente.

**PRECISE TARGET**:
- **Bloque 1 — Identidad**: Iconografía o portada tipográfica. Nombre del recuerdo. Fecha o información secundaria.
- **Bloque 2 — Progreso**: Waveform real cuando esté soportado. Altura visual 56-64pt. Track de progreso con zona táctil ≥44pt. Tiempo transcurrido y duración separados y alineados.
- **Bloque 3 — Reproducción**: Retroceder 10s / Reproducir-Pausa / Adelantar 10s. Botón central visualmente dominante 60-64pt. Controles secundarios con hit ≥44pt.
- **Bloque 4 — Velocidad**: 0.5x / 1x / 1.5x / 2x. Opciones compactas, con estado seleccionado visible.

Ancho máximo de contenido: 360pt. Si no hay waveform, no renderizar forma de onda falsa.

**VISUAL GEOMETRY**: Contenedor: ancho máximo 360pt, centrado. Bloques separados por 16-24pt. Botón central: 60-64pt. Controles secundarios: 44pt. Altura de waveform: 56-64pt.

**INTERACTION / MOTION**: N/A — layout estático (salvo waveform).

**AFFECTED STATES**: Preparando, Reproduciendo, Pausado, Buffering, Error, Waveform no disponible.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §8.1-8.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: El audio viewer se siente como un producto premium, no como un reproductor mínimo.

**TECHNICAL RISK**: MEDIUM — reorganización del layout.

**ACCEPTANCE CRITERION**: Jerarquía clara de 4 bloques. Play/pause prominente. Waveform real o none.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-039: Audio Viewer — drag seek funcional

**LOCATION**: `MemoryAudioPage.tsx` → barra de progreso

**CURRENT**: Seek por toque sobre la barra. Product Truth §8.2 del freeze pide drag: presionar, deslizar, ver progreso provisional, confirmar seek al soltar.

**PROBLEM / OPPORTUNITY**: El seek por toque solo es insuficiente. El usuario espera poder arrastrar el indicador.

**PRECISE TARGET**: Permitir presionar el indicador → deslizar en horizontal → ver progreso provisional → confirmar seek al soltar. El movimiento visual debe seguir el dedo. El player puede limitar la frecuencia de seeks reales. Verificar conflictos entre Pressable y PanResponder.

**VISUAL GEOMETRY**: Indicador: 16×16, radio 9999. Zona táctil: 44pt de alto.

**INTERACTION / MOTION**: Trigger: press en indicador. Drag: sigue el dedo. Release: confirma seek. Interruption: vertical drag → cancel.

**AFFECTED STATES**: Default, dragging (progreso provisional), released (seek confirmado).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §8.2; HC2-C §10.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: Seek fluido y natural.

**TECHNICAL RISK**: MEDIUM — posible conflicto entre Pressable y PanResponder.

**ACCEPTANCE CRITERION**: Drag seek funcional. Progreso provisional visible. Seek confirmado al soltar.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-040: Audio Viewer — velocidad de reproducción

**LOCATION**: `MemoryAudioPage.tsx`

**CURRENT**: No implementado. Product Truth §16.2 lo marca IN.

**PROBLEM / OPPORTUNITY**: Control básico de audio que falta.

**PRECISE TARGET**: Selector de velocidad 0.5x / 1x / 1.5x / 2x. Opciones compactas con estado seleccionado visible. Botón de velocidad en el Bloque 4.

**VISUAL GEOMETRY**: Botones: 36×36, radio 8pt. Estado seleccionado: `terracotta[600]` background opacity 0.1.

**INTERACTION / MOTION**: Trigger: tap en velocidad. Aplicación inmediata.

**AFFECTED STATES**: 0.5x, 1x, 1.5x, 2x.

**SOURCE REFERENCES**: Product Truth §16.2; HC2-C §10.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: Control completo de audio.

**TECHNICAL RISK**: LOW — API ya existe.

**ACCEPTANCE CRITERION**: Velocidad cambia al tocar. Estado seleccionado visible.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-041: Audio Viewer — buffering honesto

**LOCATION**: `MemoryAudioPage.tsx`

**CURRENT**: Solo "Cargando audio…" mientras `!isLoaded`. Una stalls en reproducción no se anuncia.

**PROBLEM / OPPORTUNITY**: El usuario no sabe si el audio se detuvo por buffering o por error.

**PRECISE TARGET**: Estado de buffering distinguible de error. Overlay pequeño con spinner + "Cargando audio…" durante buffering. Desaparece automáticamente cuando el audio continúa.

**VISUAL GEOMETRY**: Overlay: centrado, 32×32 spinner + copy 13pt.

**INTERACTION / MOTION**: Automático.

**AFFECTED STATES**: Playing, buffering, paused, error.

**SOURCE REFERENCES**: Product Truth §16.2; HC2-C §10.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: El usuario entiende qué está pasando.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Buffering visible y distinguible de error.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-042: Audio Viewer — waveform real (ROADMAP)

**LOCATION**: `MemoryAudioPage.tsx`

**CURRENT**: No implementado. Fake waveform prohibido.

**PROBLEM / OPPORTUNITY**: Product Truth §16.3 marca real waveform como IN ROADMAP. Es un requisito de cierre.

**PRECISE TARGET**: Real audio-derived waveform. Estrategia: live waveform during playback via `useAudioSampleListener` (solo mientras suena; requiere `RECORD_AUDIO` en Android; platform-gated). Si live no está disponible, no renderizar波形. El waveform es additive — el Audio Viewer debe ser usable sin él.

**VISUAL GEOMETRY**: Altura: 56-64pt. Ancho: disponible.

**INTERACTION / MOTION**: Live durante playback.

**AFFECTED STATES**: Playing (waveform visible), paused (waveform estático), no soportado (sin waveform).

**SOURCE REFERENCES**: Product Truth §16.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: Waveform real en reproducción.

**TECHNICAL RISK**: HIGH — requiere `expo-audio` sampling, permiso Android, posible native dependency.

**ACCEPTANCE CRITERION**: Waveform con samples reales. No fake waveform en ningún estado. Honesto fallback.

**DECISION STATUS**: TECHNICAL_FEASIBILITY_PENDING — requiere evaluación de estrategia (live vs static vs progressive) y QA de dispositivo.

---

#### HC-POL-043: Cámara — selector Foto/Video centrado

**LOCATION**: `MemoryCameraSurface.tsx`

**CURRENT**: Selector Foto/Video existe pero no está centrado respecto al ancho total de la pantalla.

**PROBLEM / OPPORTUNITY**: El freeze pide: "El selector Foto/Video deberá centrarse respecto al ancho total de la pantalla, no respecto al espacio sobrante entre botones laterales."

**PRECISE TARGET**: Selector centrado horizontalmente. Medidas: Shutter 74pt. Selector: 2 segmentos de 70-80pt, altura visual 36pt, hit ≥44pt. Distancia selector/shutter: 16-20pt. Transición entre modos: 160-200ms. El shutter permanece en la misma posición horizontal al cambiar de modo.

**VISUAL GEOMETRY**: Shutter: 74×74. Selector: 2 segmentos × 70-80pt, altura 36pt. Gap selector/shutter: 16-20pt.

**INTERACTION / MOTION**: Tap en segmento → cambio de modo con transición 160-200ms.

**AFFECTED STATES**: Modo Foto, Modo Video, transitioning.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §6.1; `MemoryCameraSurface.tsx`

**EXPECTED IMPACT**: Selector visualmente centrado y simétrico.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Selector centrado. Shutter en misma posición en ambos modos.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-044: Cámara — hold shutter en Foto para Quick Video

**LOCATION**: `MemoryCameraSurface.tsx` → shutter en modo Foto

**CURRENT**: No implementado. Product Truth §7 del freeze pide: "Mantener presionado → inicia video. Soltar: detiene video y pasa a confirmación."

**PROBLEM / OPPORTUNITY**: Es un gesto habitual de cámara. El usuario espera poder grabar video sin cambiar de modo.

**PRECISE TARGET**: Mantener presionado el shutter en modo Foto → inicia grabación de video. Indicador rojo + duración real. Soltar → detiene y pasa a review. La grabación se identifica claramente. En modo Video: tap empieza, tap detiene.

**VISUAL GEOMETRY**: Indicador: punto rojo 12×12 + texto de duración 15pt. Overlay: `rgba(0,0,0,0.3)` en la esquina superior.

**INTERACTION / MOTION**: Press-and-hold → grabación. Release → stop + review. Arbitraje: tap corto = foto, hold = video. Umbral: 300ms.

**AFFECTED STATES**: Foto (tap), Foto hold (grabando video), Video (tap start/stop).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §6.2; `MemoryCameraSurface.tsx`

**EXPECTED IMPACT**: Gestos de cámara naturales y rápidos.

**TECHNICAL RISK**: MEDIUM — requiere acceso a la API de cámara para video desde modo foto.

**ACCEPTANCE CRITERION**: Hold en Foto graba video. Release pasa a review. Indicador visible.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-045: Cámara — transición cámara → review con continuidad

**LOCATION**: `MemoryCameraSurface.tsx` → review

**CURRENT**: Al usar foto/video, pasa al review. Puede haber flash negro entre superficies.

**PROBLEM / OPPORTUNITY**: El freeze pide: "La última imagen capturada permanece visible mientras se produce el cambio a review. No debe haber flash negro."

**PRECISE TARGET**: La imagen capturada permanece visible durante la transición. Cross-fade 200ms entre la vista de cámara y el review. El review muestra la imagen en área dominante.

**VISUAL GEOMETRY**: Review: padding 20pt. Preview: ancho disponible, altura máxima adaptable, radio 16-20pt.

**INTERACTION / MOTION**: Trigger: tap en "Usar foto/video". Cross-fade 200ms.

**AFFECTED STATES**: Camera (capturando), review (preview dominant), cancelled.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §6.5; `MemoryCameraSurface.tsx`

**EXPECTED IMPACT**: Transición suave sin flash negro.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Sin flash negro. Imagen capturada visible en review.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-046: Intake — jerarquía de review más clara

**LOCATION**: `MemoryMediaReview.tsx`

**CURRENT**: Preview + Fecha + Álbum + Descripción + Guardar. Funciona pero el freeze pide una jerarquía más cuidada.

**PROBLEM / OPPORTUNITY**: El review es un formulario que debe sentirse como "confirmar un recuerdo", no como "completar un formulario técnico".

**PRECISE TARGET**: Preview dominante (no un thumbnail pequeño). Fecha como dato de primera clase. Álbum y Descripción opcionales. Padding horizontal 20pt. Separación de bloques 16pt. Campos con hit ≥44pt. Botón Guardar 52pt, sin quedar debajo del teclado ni de la safe area. El teclado no debe hacer saltar todo el contenido.

**VISUAL GEOMETRY**: Preview: ancho disponible, altura máxima adaptable, radio 16-20pt. Separación: 16pt. Botón: 52pt.

**INTERACTION / MOTION**: N/A — layout.

**AFFECTED STATES**: Default, editing (campo activo), saving (spinner), saved (fade out).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §7.2; `MemoryMediaReview.tsx`

**EXPECTED IMPACT**: Review más claro y menos "formulario técnico".

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Preview dominante. Botón Guardar siempre visible con teclado abierto.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-047: Intake batch — navegación entre elementos

**LOCATION**: `MemoryIntake.tsx` → Batch Review

**CURRENT**: Swipe previews, single submit, partial failure honest. Funciona pero el freeze pide: "Indicador de posición: «2 de 5». Controles anterior/siguiente. Transición horizontal breve entre elementos."

**PROBLEM / OPPORTUNITY**: La navegación batch actual es funcional pero no tiene la presentación premium que el freeze exige.

**PRECISE TARGET**: Indicador de posición "2 de 5" sobre el preview. Controles anterior/siguiente (44pt, `surface.card` con borde). Transición horizontal 200ms entre elementos. Cambios de fecha y overrides conservados por elemento. Una acción lógica Guardar. Progreso y resultado honestos.

**VISUAL GEOMETRY**: Indicador: 15pt, `text.secondary`, centrado sobre preview. Controles: 44×44, `surface.card`, borde 1pt `border.subtle`. Transición: 200ms easeOut.

**INTERACTION / MOTION**: Swipe o tap en anterior/siguiente. Transición horizontal 200ms.

**AFFECTED STATES**: Default, navigating (transición), saving (spinner), saved (fade out), partial error (copy honesto).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §7.3; `MemoryIntake.tsx`

**EXPECTED IMPACT**: Navegación batch más clara y premium.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Indicador "2 de 5" visible. Transición horizontal funcional. Overrides por elemento preservados.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-048: Intake — guardado con feedback de éxito real

**LOCATION**: `MemoryIntake.tsx` → submit

**CURRENT**: Al guardar, el review se cierra. El usuario vuelve a Root.

**PROBLEM / OPPORTUNITY**: El freeze pide: "El botón pasa a estado de operación confirmada sin cerrar prematuramente toda la interfaz. Cuando el contenido está realmente ACTIVE: el review se cierra, el usuario vuelve a Root, la actualización del Timeline se integra sin flash de vacío. Puede aparecer un highlight breve sobre el recuerdo recién incorporado."

**PRECISE TARGET**: Botón Guardar → estado "Guardando…" con spinner. Cuando el contenido está ACTIVE: el review se cierra con fade 200ms. El usuario vuelve a Root. El Timeline se actualiza sin flash. Si el recuerdo es visible, highlight breve (overlay `terracotta[600]` opacity 0.1, fade out 400ms). No usar celebración de éxito mientras existan elementos fallidos.

**VISUAL GEOMETRY**: Botón: 52pt, estado guardando con spinner 20pt. Highlight: overlay 400ms. Fade de cierre: 200ms.

**INTERACTION / MOTION**: Trigger: tap en Guardar. Estados: Guardando → ACTIVE → cierre + root.

**AFFECTED STATES**: Guardando (spinner), ACTIVE (cierre), fallido (copy honesto + reintento), partial (solo fallidos nombrados).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §7.4; `MemoryIntake.tsx`

**EXPECTED IMPACT**: Feedback claro de éxito real. Sin celebration si hay fallidos.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Botón muestra "Guardando…". Cierre con fade. Highlight si visible. No celebration con fallidos.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-049: Selección — entrada por long press con feedback inmediato

**LOCATION**: `MemorySelectableCard.tsx` → long press → `enterMemorySelection`

**CURRENT**: Long press entra en selección. El freeze pide: "Long press aproximadamente 320ms. Al activarse: se selecciona la fotografía bajo el dedo, aparece la indicación visual, se activa háptica breve, el header cambia a selección, la posición del grid no se modifica."

**PROBLEM / OPPORTUNITY**: El long press actual funciona pero puede no tener el umbral óptimo ni el feedback háptico.

**PRECISE TARGET**: Umbral de long press: 320ms (ajustable). Al activarse: selecciona la fotografía, indicación visual inmediata, háptica breve, header cambia con crossfade 150ms. La posición del grid no se modifica.

**VISUAL GEOMETRY**: Crossfade de header: 150ms. Indicación visual: check con escala 0.85→1 en 100-140ms.

**INTERACTION / MOTION**: Trigger: long press 320ms. Feedback inmediato. Interruption: release antes de 320ms → no entra.

**AFFECTED STATES**: Default, long pressing (umbral), selected (activo), dragging (drag selection).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §4.1; `MemorySelectableCard.tsx`

**EXPECTED IMPACT**: Entrada en selección táctil y con feedback inmediato.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Háptica al entrar. Header con crossfade. Grid no se mueve.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-050: Selección — drag continuo sin levantar el dedo

**LOCATION**: `homecloudMemoryDrag.ts` + `MemorySelectableCard`

**CURRENT**: D4 drag selection funciona. El freeze pide: "Mantener presionado → seleccionar primera foto → arrastrar sobre otras fotos → seleccionar rango. No debe exigir soltar el dedo y volver a mantener presionado."

**PROBLEM / OPPORTUNITY**: El drag selection actual puede tener problemas de respuesta, hit-testing o autoscroll. El freeze pide corregir cualquier problema.

**PRECISE TARGET**: Flujo obligatorio: Mantener → seleccionar primera → arrastrar → seleccionar rango. Las celdas responden mientras ocurre el movimiento. Al arrastrarse hacia atrás, el rango se reduce determinísticamente. No hay selecciones aleatorias por volver a cruzar una celda. Autoscroll en los bordes. Arbitraje explícito entre selección, desplazamiento y long press. Un movimiento vertical normal no selecciona accidentalmente toda una columna.

**VISUAL GEOMETRY**: Igual que D4 actual.

**INTERACTION / MOTION**: Drag continuo. Dirección cambia → rango se reduce/restaura. Autoscroll en bordes.

**AFFECTED STATES**: Normal, selecting, dragging, direction change, edge autoscroll.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §4.2-4.4; HC2-C §4.3; `homecloudMemoryDrag.ts`

**EXPECTED IMPACT**: Drag selection 100% confiable y táctil.

**TECHNICAL RISK**: MEDIUM — corrección de hit-testing y arbitraje.

**ACCEPTANCE CRITERION**: Drag sin levantar el dedo. Dirección cambia determinísticamente. No hay selecciones aleatorias. DEVICE_QA_REQUIRED.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-051: Selección — header con crossfade y acciones inmediatas

**LOCATION**: `MemorySelectionHeader.tsx`

**CURRENT**: Header `[X] N seleccionados [⋯ Acciones]`. Sin crossfade al entrar. Solo hay un ActionSheet (picker de destino).

**PROBLEM / OPPORTUNITY**: El freeze pide: "Cambio de header mediante crossfade de aproximadamente 150 ms. Acciones disponibles inmediatamente."

**PRECISE TARGET**: Crossfade 150ms entre header normal y selection header. Acciones visibles desde el primer fotograma (sin `✓` gate). Permisos respetados. El scroll anterior se preserva.

**VISUAL GEOMETRY**: Crossfade: 150ms. Header: altura 56pt, `paddingHorizontal: 16pt`.

**INTERACTION / MOTION**: Trigger: long press. Crossfade de header. Interruption: back/X → crossfade inverso.

**AFFECTED STATES**: Normal, selecting (crossfade in), active, exiting (crossfade out).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §4.6; `MemorySelectionHeader.tsx`

**EXPECTED IMPACT**: Header fluido. Acciones inmediatas.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Crossfade visible. Acciones visibles al entrar. Scroll preservado.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-052: Trash (Memories) — expandir/colapsar con animación

**LOCATION**: `HomeCloudMemoriesScreen.tsx` → Trash section

**CURRENT**: La sección de trash es condicional (solo si hay contenido). Aparece/desaparece instantáneamente.

**PROBLEM / OPPORTUNITY**: La aparición abrupta de la sección de trash puede sentirse como un salto.

**PRECISE TARGET**: Expand 200ms `ease-out` al aparecer. Collapse 200ms `ease-in` al desaparecer. Altura animada (0 → auto).

**VISUAL GEOMETRY**: Duración: 200ms. Easing: easeOut/easeIn. Altura: 0 → contenido.

**INTERACTION / MOTION**: Trigger: trash content disponible/vacío. Animación de altura.

**AFFECTED STATES**: Hidden, expanding, visible, collapsing.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 Trash Expand; `HomeCloudMemoriesScreen.tsx`

**EXPECTED IMPACT**: Aparición suave de la sección de trash.

**TECHNICAL RISK**: MEDIUM — animación de altura.

**ACCEPTANCE CRITERION**: Expand/collapse visible. Reduce motion desactiva.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-053: Favorites — tile del rail con identidad visual

**LOCATION**: `AlbumsRail.tsx` → Favorites tile (primer tile)

**CURRENT**: Tile de Favoritos con icono de estrella. Funciona pero es visualmente similar a un álbum normal.

**PROBLEM / OPPORTUNITY**: Favoritos es una colección especial, no un álbum. Debe tener identidad visual distinta.

**PRECISE TARGET**: Tile de Favoritos con fondo `terracotta[600]` opacity 0.08 (o `surface.card` con borde `terracotta[600]`). Icono de estrella 24pt `terracotta[600]`. Etiqueta "Favoritos". Sin acciones de rename/delete. Al tocar, abre el dataset de favoritos.

**VISUAL GEOMETRY**: Tile: 132×132, radio 20pt. Fondo: `terracotta[600]` opacity 0.08. Icono: 24×24.

**INTERACTION / MOTION**: Tap → abre dataset con slide up 250ms.

**AFFECTED STATES**: Default, pressed, empty (sin favoritos → empty honesto).

**SOURCE REFERENCES**: `AlbumsRail.tsx`; Product Truth §22

**EXPECTED IMPACT**: Favoritos se distingue visualmente de los álbumes.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Favoritos con identidad visual distinta. Sin rename/delete.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-054: Favoritos — toggle con feedback visual

**LOCATION**: Viewer/selection → star/unstar

**CURRENT**: Toggle de favorito en menú de acciones. No hay feedback visual inmediato.

**PROBLEM / OPPORTUNITY**: El toggle de favorito debe sentirse como un gesto con peso (favoritar = destacar).

**PRECISE TARGET**: Toggle con animación: estrella escala 1 → 1.3 → 1 en 200ms `easeOut` + háptica. Si es optimistic, se aplica inmediatamente. Si falla, se rollback con copy honesto. En selección, bulk star/unstar.

**VISUAL GEOMETRY**: Estrella: 24×24. Escala: 1 → 1.3 → 1. Duración: 200ms.

**INTERACTION / MOTION**: Trigger: tap en star. Animación + háptica. Interruption: rollback si falla.

**AFFECTED STATES**: Not favorite, favoriting (animación), favorited, rollback (error).

**SOURCE REFERENCES**: Product Truth §22; `MemoryViewer.tsx`

**EXPECTED IMPACT**: Favorito se siente como un gesto con peso.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Animación + háptica. Rollback funcional.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-055: Álbum vacío — CTA "Agregar recuerdos"

**LOCATION**: `AlbumDetailView.tsx` → álbum vacío

**CURRENT**: Copy "Esta colección todavía no tiene recuerdos" + botón "Agregar recuerdos".

**PROBLEM / OPPORTUNITY**: El CTA funciona pero podría ser más prominente y acogedor.

**PRECISE TARGET**: Icono grande (64pt) con `terracotta[600]` opacity 0.15 de fondo. Copy 17pt `body` `text.secondary`. Botón "Agregar recuerdos" 52pt, centrado. El conjunto centrado en el espacio disponible.

**VISUAL GEOMETRY**: Icono container: 96×96, radio 9999, `terracotta[600]` opacity 0.15. Gap: 16pt. Botón: 52pt.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Empty (con CTA), gated (`organize=false` → sin CTA).

**SOURCE REFERENCES**: `AlbumDetailView.tsx`; Product Truth §10.4

**EXPECTED IMPACT**: Álbum vacío más acogedor.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: CTA visible y tocable. Centrado.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-056: Firmado de fecha — DatePickerSheet con jerarquía

**LOCATION**: `DatePickerSheet.tsx` (Memories intake/info)

**CURRENT**: Selector de 4 precisiones (exact/month-year/year/unknown). Funciona.

**PROBLEM / OPPORTUNITY**: La fecha es un dato de primera clase. El date picker debe sentirse como una decisión importante.

**PRECISE TARGET**: Título "¿Cuándo fue?" 22pt `title2`. Las 4 opciones como cards (no radio buttons): cada opcion con icono + label + descripción. La opción seleccionada tiene borde 2pt `terracotta[600]` y fondo `terracotta[600]` opacity 0.08. Las opciones: "Día exacto" (icono calendario), "Mes y año" (icono mes), "Solo año" (icono año), "Sin fecha" (icono unknown).

**VISUAL GEOMETRY**: Cards: radio 12pt, padding 16pt, gap 12pt. Icono: 24×24. Label: 17pt `body` 600. Descripción: 13pt `caption` `text.secondary`.

**INTERACTION / MOTION**: Tap en card → selección inmediata. Cross-fade 150ms.

**AFFECTED STATES**: Default, selected, editing.

**SOURCE REFERENCES**: `DatePickerSheet.tsx`; Product Truth §7.5

**EXPECTED IMPACT**: La fecha se siente como una decisión de primera clase.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Cards seleccionables con feedback visual. Jerarquía clara.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

### 2.4 FILE VIEWERS (Compartido con Office)

---

#### HC-POL-057: File Viewer — apertura con escala desde tile

**LOCATION**: `HomeCloudFileViewerScreen.tsx`

**CURRENT**: El viewer aparece instantáneamente (mount). No hay transición desde el tile.

**PROBLEM / OPPORTUNITY**: Igual que HC-POL-012 pero para todos los tipos de archivo (imagen, video, audio, PDF, texto).

**PRECISE TARGET**: Escala 0.95 → 1 + opacity 0 → 1 desde la posición del tile. 250ms spring. Cierre: 1 → 0.95 + opacity 1 → 0, 200ms easeIn. Si tile offscreen, fade 200ms.

**VISUAL GEOMETRY**: Igual que HC-POL-012.

**INTERACTION / MOTION**: Igual que HC-POL-012.

**AFFECTED STATES**: Default, opening, open, closing, fallback, error.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`

**EXPECTED IMPACT**: Continuidad espacial entre tile y viewer.

**TECHNICAL RISK**: HIGH.

**ACCEPTANCE CRITERION**: Escala visible. Cierre retornando al tile. Reduce motion.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-058: File Viewer — chrome show/hide

**LOCATION**: `HomeCloudFileViewerScreen.tsx` → top chrome

**CURRENT**: Chrome siempre visible.

**PROBLEM / OPPORTUNITY**: Para PDF y texto, el chrome puede ocultar contenido. Debería poder ocultarse.

**PRECISE TARGET**: Tap en media → toggle chrome con fade 150ms. El contenido no se mueve cuando se oculta el chrome (el layout ya contempla el espacio).

**VISUAL GEOMETRY**: Fade: 150ms.

**INTERACTION / MOTION**: Tap → toggle.

**AFFECTED STATES**: Chrome visible, oculto, toggling.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`

**EXPECTED IMPACT**: Lectura sin distracciones para PDF/texto.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Chrome se oculta/muestra. Contenido no se mueve.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-059: PDF Viewer — indicador de página y zoom

**LOCATION**: `HomeCloudFileViewerScreen.tsx` → PDF WebView

**CURRENT**: PDF renderizado en WebView con pdf.js. Multi-page, zoom.

**PROBLEM / OPPORTUNITY**: El usuario no sabe en qué página está ni cuántas hay.

**PRECISE TARGET**: Indicador de página: "3 / 12" en un chip sobre el PDF (fade out tras 2s, reaparece al cambiar de página). Controles de zoom: botones + / − con hit 44pt. El zoom se sincroniza con el estado del PDF.

**VISUAL GEOMETRY**: Chip: `surface.card`, radio 9999, padding 8pt, texto 13pt. Botones zoom: 44×44, `surface.card`.

**INTERACTION / MOTION**: Cambio de página → chip fade in/out. Zoom → inmediato.

**AFFECTED STATES**: Default, page change (chip visible), zooming.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`

**EXPECTED IMPACT**: El usuario sabe dónde está y puede hacer zoom.

**TECHNICAL RISK**: MEDIUM — sincronización con pdf.js WebView.

**ACCEPTANCE CRITERION**: Indicador de página visible. Botones zoom funcionales.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-060: PDF Viewer — estados de error/protected

**LOCATION**: `HomeCloudFileViewerScreen.tsx` → PDF error/protected

**CURRENT**: Estados de error y protegido existen con copy honesto.

**PROBLEM / OPPORTUNITY**: Pueden ser más claros y accionables.

**PRECISE TARGET**: Estado protegido: icono de candado 48pt + "Este PDF está protegido con contraseña" + botón "Abrir con…" (system hand-off). Estado corrupto: icono de advertencia 48pt + "No se pudo leer este documento" + botón "Abrir con…". Ambos con `surface.card` y radio 12pt.

**VISUAL GEOMETRY**: Icono: 48×48. Card: radio 12pt, padding 24pt.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Protected, corrupted, error.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`; Product Truth §A5

**EXPECTED IMPACT**: Error claro y accionable.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Copy honesto. Botón hand-off funcional.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-061: Office Viewer — loading state

**LOCATION**: `ViewerOfficeSurface`

**CURRENT**: WebView con OnlyOffice. Estado de carga no definido visualmente.

**PROBLEM / OPPORTUNITY**: El usuario no sabe si el documento está cargando o si hay un error.

**PRECISE TARGET**: Loading state: spinner 48pt + "Cargando documento…" centrado. Cross-fade 200ms cuando el documento está listo. Error state: copy honesto + retry. Diagnósticos: `office_timeout_app_ready`, `office_timeout_no_app_ready`, `office_webview_error`, `office_session_failed`.

**VISUAL GEOMETRY**: Spinner: 48×48. Copy: 17pt `body`. Cross-fade: 200ms.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Loading, ready, error, timeout.

**SOURCE REFERENCES**: `ViewerOfficeSurface`; `homecloudOfficeViewer.ts`; Product Truth §A5

**EXPECTED IMPACT**: El usuario sabe qué está pasando.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Loading visible. Error honesto con retry.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

#### HC-POL-062: Office Viewer — close y retorno

**LOCATION**: `ViewerOfficeSurface` → close

**CURRENT**: Cierra con `onClose()`. No hay transición.

**PROBLEM / OPPORTUNITY**: El cierre abrupto rompe la continuidad.

**PRECISE TARGET**: Cross-fade 200ms al cerrar. Retorna al browser con el mismo folder, query, sort y scroll.

**VISUAL GEOMETRY**: Fade: 200ms.

**INTERACTION / MOTION**: Trigger: tap en Cerrar / back.

**AFFECTED STATES**: Open, closing, closed.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`; Product Truth §A5

**EXPECTED IMPACT**: Cierre suave con retorno correcto.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Fade visible. Retorno al browser correcto.

**DECISION STATUS**: PROPOSED_FOR_REVIEW

---

## 3. Cobertura de Interacción / Motion

### 3.1 Inventario completo de interacciones

| # | Interacción | Modificación | Decisión | Duración | Easing |
|---|-------------|--------------|----------|----------|--------|
| 1 | Entrar a HomeCloud | — | KEEP NATIVE | N/A | N/A |
| 2 | Cambiar Archivos ↔ Recuerdos | HC-POL-001 | ANIMATE | 150ms | easeOut |
| 3 | Entrar a carpeta (Files) | HC-POL-011 | ANIMATE | 200ms | easeOut |
| 4 | Volver de carpeta (Files) | HC-POL-011 | ANIMATE | 200ms | easeIn |
| 5 | Abrir archivo desde tile (Files) | HC-POL-012/057 | ANIMATE | 250ms | spring |
| 6 | Cerrar File Viewer | HC-POL-012/057 | ANIMATE | 200ms | easeIn |
| 7 | Abrir álbum (Memories) | HC-POL-028 | ANIMATE | 250ms | easeOut |
| 8 | Cerrar álbum | HC-POL-028 | ANIMATE | 200ms | easeIn |
| 9 | Abrir Tipo/Colección | HC-POL-028 | ANIMATE | 250ms | easeOut |
| 10 | Cerrar Tipo/Colección | HC-POL-028 | ANIMATE | 200ms | easeIn |
| 11 | Abrir Resurfacing Group | HC-POL-027 | ANIMATE | 250ms | easeOut |
| 12 | Cerrar Resurfacing Group | HC-POL-027 | ANIMATE | 200ms | easeIn |
| 13 | Abrir Memory Viewer | HC-POL-031 | ANIMATE | 260-300ms | spring |
| 14 | Cerrar Memory Viewer | HC-POL-032 | ANIMATE | 200ms | easeIn |
| 15 | Viewer pager swipe | HC-POL-034 | KEEP NATIVE | native | native |
| 16 | Viewer chrome toggle | HC-POL-033 | ANIMATE | 150ms | easeOut |
| 17 | Image double-tap zoom | HC-POL-035 | ANIMATE | 200ms | easeOut |
| 18 | Video double-tap ±10s | HC-POL-036 | ANIMATE | 200ms | easeOut |
| 19 | Abrir menú contextual (Create `+`) | HC-POL-006 | ANIMATE | 160-220ms | easeOut |
| 20 | Abrir popover contextual | HC-POL-004/005/007 | ANIMATE | 160-220ms | easeOut |
| 21 | Cerrar popover | HC-POL-004/005/007 | ANIMATE | 160-220ms | easeIn |
| 22 | Entrar en selección (Files) | HC-POL-013 | ANIMATE | 150ms | easeOut |
| 23 | Salir de selección (Files) | HC-POL-013 | ANIMATE | 150ms | easeIn |
| 24 | Entrar en selección (Memories) | HC-POL-049/051 | ANIMATE | 150ms | easeOut |
| 25 | Salir de selección (Memories) | HC-POL-049/051 | ANIMATE | 150ms | easeIn |
| 26 | Seleccionar tile individual | HC-POL-014 | ANIMATE | 100-140ms | easeOut |
| 27 | Drag selection sweep | HC-POL-050 | KEEP NATIVE | N/A | N/A |
| 28 | Drag selection autoscroll | HC-POL-015 | ANIMATE | 100ms | linear |
| 29 | Favoritar/Desfavoritar | HC-POL-054 | ANIMATE | 200ms | easeOut |
| 30 | Expandir/Colapsar Trash | HC-POL-052 | ANIMATE | 200ms | easeOut/In |
| 31 | Upload band appear | HC-POL-017 | ANIMATE | 200ms | easeOut |
| 32 | Upload band dismiss | HC-POL-017 | ANIMATE | 150ms | easeIn |
| 33 | Undo snackbar | HC-POL-018 | ANIMATE | 200ms | easeOut |
| 34 | Scanner capture flash | HC-POL-022 | ANIMATE | 100ms | linear |
| 35 | Scanner → review | HC-POL-022 | ANIMATE | 200ms | easeOut |
| 36 | Cámara modo transición | HC-POL-043 | ANIMATE | 160-200ms | easeOut |
| 37 | Cámara → review | HC-POL-045 | ANIMATE | 200ms | easeOut |
| 38 | Intake batch navegación | HC-POL-047 | ANIMATE | 200ms | easeOut |
| 39 | Intake guardado | HC-POL-048 | ANIMATE | 200ms | easeOut |
| 40 | Audio play/pause | HC-POL-038 | ANIMATE | 100ms | easeOut |
| 41 | Audio drag seek | HC-POL-039 | KEEP NATIVE | N/A | N/A |
| 42 | Audio velocidad | HC-POL-040 | ANIMATE | 100ms | easeOut |
| 43 | PDF page change | HC-POL-059 | ANIMATE | 200ms | easeOut |
| 44 | Office loading → ready | HC-POL-061 | ANIMATE | 200ms | easeOut |
| 45 | Office close | HC-POL-062 | ANIMATE | 200ms | easeIn |

### 3.2 Familias de motion

| Familia | Duraciones | Easing | Aplicación |
|---------|------------|--------|-------------|
| **Feedback táctil** | 80-140ms | easeOut | Botones, checks, favoritos, toggles |
| **Cambio de estado** | 140-200ms | easeOut/In | Loading, error, contenido |
| **Navegación contextual** | 200-250ms | easeOut/spring | Álbumes, colecciones, viewer |
| **Popovers** | 160-220ms | easeOut/In | Menús contextuales |
| **Viewer continuo** | 260-300ms | spring | Thumb ↔ Viewer |
| **Sheet** | 200-300ms | easeOut/In | Formularios, destinos |
| **Confirmación** | Hasta 420ms | easeOut | Solo éxito real |

### 3.3 Reglas obligatorias

- Las animaciones deben ser interrumpibles.
- Las salidas deben conservar continuidad con las entradas.
- El contenido no debe desaparecer antes de que el siguiente estado esté preparado.
- No animar todas las celdas de listas grandes.
- No duplicar efectos sobre una misma transición.
- Las transiciones no deben impedir taps rápidos.
- Respetar Reduce Motion: eliminar escalas y desplazamientos innecesarios.

---

## 4. Consistencia de UI Compartida

### 4.1 Headers

| Superficie | Header actual | Propuesta |
|------------|---------------|-----------|
| Files Root | TitleRow + search + filter | KEEP (funciona, no change) |
| Files Folder | Breadcrumb + search | HC-POL-011 (transición) |
| Memories Root | TitleRow + `+` | KEEP (no change) |
| Memories Selection | `[X] N seleccionados [⋯]` | HC-POL-051 (crossfade) |
| File Viewer | `[Cerrar] [Fecha] [⋯]` | HC-POL-058 (chrome toggle) |
| Memory Viewer | `[Cerrar] [Fecha] [⋯]` | HC-POL-033 (chrome toggle) |
| Album Detail | Back + title | KEEP (no change) |

### 4.2 Botones e iconografía

- Todos los botones usan `AppButton` con variantes existentes.
- Los botones `⋯` sobre contenido (fotografías) necesitan overlay de contraste (HC-POL-009).
- Los badges (favorito, carpeta) usan `terracotta[600]` con posiciones consistentes.

### 4.3 Tipografía

- Ya tokenizada via `AppText` con `typography.*`. No change needed.

### 4.4 Spacing grammar

- Ya tokenizada via `spacing[1-6]`. No change needed.

### 4.5 Color y contraste

- Ya tokenizada via `theme.ts`. No change needed.

### 4.6 Contextual menus

- **≤5 acciones**: Popover anclado (HC-POL-004/005/006/007).
- **>5 acciones o multi-step**: Bottom sheet (existente).
- **Muchos destinos**: Sheet dedicado (existente).

### 4.7 Loading y skeleton states

- Mutuamente excluyentes (LOADING / READY_EMPTY / READY_DATA / ERROR / REFRESHING).
- Skeleton solo mientras se espera primer contenido. Nunca después.
- Estado de carga distinguible de empty y error (HC-POL-008).

### 4.8 Errores y retry

- `ErrorState` + `Reintentar` en todos los superficies.
- Copy honesto, nunca stack trace.
- Los errores no destruyen contenido cargado.

### 4.9 Toasts / Undo

- Undo snackbar con auto-dismiss 8s (HC-POL-018).
- Upload band con progreso (HC-POL-017).

### 4.10 Haptics

- Selection toggle, long press, drag arm, action confirm.
- No disparar hápticas descontroladamente durante barrido.

### 4.11 Modal dismissal

- Un solo host (`ActionSheet`). Contenido reemplaza, nunca apila.
- Popover: tap fuera, back, scroll → cierra.
- Sheet: backdrop tap, drag down → cierra.

### 4.12 Motion families

- Ver §3.2.

### 4.13 Accesibilidad

- Hit target ≥44×44.
- Safe areas en todas las superficies full-screen.
- Contraste token-driven (AAA).
- Reduce motion verificado en todas las animaciones.

---

## 5. Omisiones encontradas en U0 (integradas a la lista)

### A. Elementos inventariados pero no evaluados estéticamente

| Elemento | Omisión | Integrada como |
|----------|---------|----------------|
| Upload Progress Band | No evaluado estéticamente en U0 | HC-POL-017 |
| Undo Snackbar | No evaluado | HC-POL-018 |
| DatePickerSheet | No evaluado estéticamente | HC-POL-056 |
| Favorites tile | No evaluado estéticamente | HC-POL-053 |
| Empty states | Marcados KEEP sin evaluación estética | HC-POL-019 |
| Error states | Marcados KEEP sin evaluación | HC-POL-020 |
| Move Destination Picker | No evaluado estéticamente | HC-POL-023 |
| File Info Sheet | No evaluado estéticamente | HC-POL-024 |

### B. Pantallas marcadas KEEP solo por funcionalidad

| Pantalla | Razón KEEP | Reevaluación |
|----------|------------|--------------|
| Memories Root | "Funciona" | HC-POL-025: necesita compactación fotográfica |
| Timeline | "Funciona" | HC-POL-030: radio y secciones |
| Audio Viewer | "Funciona" | HC-POL-038: jerarquía premium |
| Cámara | "Funciona" | HC-POL-043/044: centrado y quick video |
| Resurfacing | "Funciona" | HC-POL-026: carrusel fotográfico |
| Trash | "Funciona" | HC-POL-052: expand/collapse |

### C. Interacciones sin feedback o transición definida

| Interacción | Estado en U0 | Propuesta |
|-------------|--------------|-----------|
| Tab Switch | "Instant toggle" | HC-POL-001: cross-fade |
| Viewer Open/Close | "Instant mount" | HC-POL-031/032: escala |
| Album Open/Close | "Instant mount" | HC-POL-028: slide |
| Selection Header | "Conditional render" | HC-POL-013/051: crossfade |
| Folder Enter/Back | "Instant" | HC-POL-011: slide |
| Upload Band | "Mount" | HC-POL-017: slide + progress bar |

### D. Botones/menus/filas inconsistentes entre Files/Memories

| Elemento | Files | Memories | Propuesta |
|----------|-------|----------|-----------|
| Botón `⋯` sobre contenido | N/A | Sin contraste garantizado | HC-POL-009 |
| Crear álbum | N/A | Header `+ Nuevo` (viejo) → tile final | HC-POL-029 (Types) + Product Truth §10.3 |
| Favoritos | Badge en menú | Tile en rail | HC-POL-021 (Files badge) |

### E. Estados faltantes en polish propuesto

| Estado | Superficie | Propuesta |
|--------|------------|-----------|
| Preview loading | Álbum cover | HC-POL-008 |
| Buffering | Audio | HC-POL-041 |
| Buffering | Video | HC-POL-037 |
| Guardando | Intake | HC-POL-048 |
| Waveform no disponible | Audio | HC-POL-042 |

### F. Decisiones previamente confirmadas omitidas

| Decisión | Fuente | Estado |
|----------|--------|--------|
| Resurfacing exact-only | Product Truth §21.3 | PRESERVADA |
| Viewer inmersivo | Product Truth §13 | PRESERVADA |
| Selección preserva contexto | Product Truth §12 | PRESERVADA |
| Create visible | Product Truth §3.2 | PRESERVADA |
| Favoritos household-shared | Product Truth §22 | PRESERVEDA |
| Importar audio IN V1 | Product Truth §4.1.1 | PRESERVADA |
| Fake waveform prohibido | Product Truth §16.3 | PRESERVADA |
| XLSX/PPTX hand-off | Product Truth §2.3 | PRESERVADA (no implementar) |

### G. Cambios duplicados o contradictorios

No se encontraron duplicaciones. Cada modificación tiene un único owner.

### H. Propuestas cosméticas que riesgo cambiar reglas de negocio

| Propuesta | Riesgo | Mitigación |
|-----------|--------|------------|
| HC-POL-004 (popover archivos) | Baja | No cambia acciones, solo presentación |
| HC-POL-025 (root layout) | Baja | No cambia datasets ni navegación |
| HC-POL-031 (viewer escala) | Baja | No cambia fuente ni retorno |
| HC-POL-035 (double-tap zoom) | Medio | Arbitraje con pager (Product Truth §14.2) |

### I. Detalles visuales que importan en iPhones reales pero no validables desde source

| Detalle | Riesgo | Mitigación |
|---------|--------|------------|
| Sensación táctil del popover | Medio | DEVICE_QA_REQUIRED |
| Escala desde tile en viewer | Alto | DEVICE_QA_REQUIRED |
| Drag selection sweep | Alto | DEVICE_QA_REQUIRED |
| Cross-fade en tab switch | Bajo | DEVICE_QA_REQUIRED |
| Quick Video hold | Alto | DEVICE_QA_REQUIRED |

### J. Microinteractions que necesitan gate de dispositivo

| Interacción | Gate |
|-------------|------|
| HC-POL-031/032 (viewer escala) | DEVICE_QA_REQUIRED |
| HC-POL-035 (double-tap zoom) | DEVICE_QA_REQUIRED |
| HC-POL-036 (video ±10s) | DEVICE_QA_REQUIRED |
| HC-POL-044 (quick video) | DEVICE_QA_REQUIRED |
| HC-POL-050 (drag selection) | DEVICE_QA_REQUIRED |
| HC-POL-004/005/006/007 (popovers) | DEVICE_QA_REQUIRED |

---

## 6. Checklist de Cobertura vs. Atlas U0 (65 superficies)

### Shared Entry & Navigation (4/4)

| Screen | Status | Modificación |
|--------|--------|--------------|
| HomeCloud Entry | KEEP | — |
| Global Tab Selector | MINOR | HC-POL-001 |
| Household Switcher | KEEP | — |
| Permission Gating | KEEP | — |

### Files (23/23)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Files Root Browser | MINOR | HC-POL-019, HC-POL-020 |
| Folder Browser | MINOR | HC-POL-011 |
| Search | KEEP | — |
| Sort/Filter Menu | MINOR | HC-POL-016 |
| Favorites Filter | MINOR | HC-POL-016 |
| File Grid | KEEP | — |
| Folder Tile | KEEP | — |
| File Tile | MINOR | HC-POL-021 |
| Empty States | MINOR | HC-POL-019 |
| Error States | MINOR | HC-POL-020 |
| Loading States | KEEP | — |
| Selection Mode Entry | MINOR | HC-POL-013 |
| Selection Bar | MINOR | HC-POL-013 |
| Drag Selection (D4) | MINOR | HC-POL-014, HC-POL-015 |
| Bulk Move | KEEP | — |
| File Action Host | MINOR | HC-POL-004 (popover) |
| File Info Sheet | MINOR | HC-POL-024 |
| Rename Sheet | KEEP | — |
| Move Picker | MINOR | HC-POL-023 |
| Save Copy / Share | KEEP | — |
| Favorite Toggle | KEEP | — |
| Add Sheet | KEEP | — |
| Document Scanner | MINOR | HC-POL-022 |
| New Folder Sheet | KEEP | — |

### File Viewers (10/10)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Image Viewer | MINOR | HC-POL-012/057 (escala) |
| Video Viewer | MINOR | HC-POL-057 (escala), HC-POL-037 (poster) |
| Audio Viewer | MINOR | HC-POL-057 (escala) |
| PDF Viewer | MINOR | HC-POL-059 (page indicator), HC-POL-060 (errors) |
| TXT/MD/CSV Viewer | KEEP | — |
| Office DOCX | KEEP | HC-POL-061/062 |
| Office XLSX/PPTX | KEEP (hand-off) | — |
| Unsupported/SVG/HTML | KEEP | — |
| Password-Protected PDF | MINOR | HC-POL-060 |
| Corrupt/Oversized PDF | MINOR | HC-POL-060 |

### File Lifecycle (4/4)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Trash Surface | KEEP | — |
| Trash Empty | KEEP | — |
| Purge Confirmation | KEEP | — |
| Undo Snackbar | MINOR | HC-POL-018 |

### Memories Root & Primary IA (6/6)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Memories Root | MINOR | HC-POL-025 |
| Title Row (+) | KEEP | — |
| Resurfacing Band | MINOR | HC-POL-026 |
| Albums Rail | KEEP | — |
| Types Rail | MINOR | HC-POL-029 |
| Timeline | MINOR | HC-POL-030 |

### Memories Albums (5/5)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Album Detail | MINOR | HC-POL-028 (slide) |
| Album Create | KEEP | — |
| Album Actions | KEEP | — |
| Album Empty | MINOR | HC-POL-055 |
| Favorites Tile | MINOR | HC-POL-053 |

### Memories Types (1/1)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Type Collections | MINOR | HC-POL-029 (Types compact) |

### Memories Resurfacing (2/2)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Resurfacing Group | MINOR | HC-POL-027 |
| Hide from Resurfacing | KEEP | — |

### Memories Selection (5/5)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Selection Entry | MINOR | HC-POL-049 |
| Selection Header | MINOR | HC-POL-051 |
| Selection Actions | KEEP | — |
| Destination Picker | KEEP | — |
| Drag Selection (D4) | MINOR | HC-POL-050 |

### Memories Viewers (9/9)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Viewer Shell | MINOR | HC-POL-031/032 |
| Top Chrome | MINOR | HC-POL-033 |
| Bottom Chrome | KEEP | — |
| Image Viewer | MINOR | HC-POL-035 (double-tap) |
| Video Viewer | MINOR | HC-POL-036 (±10s), HC-POL-037 (poster) |
| Audio Viewer | MINOR | HC-POL-038/039/040/041/042 |
| Written Viewer | KEEP | — |
| Pager Invariants | KEEP | — |
| Missing State | KEEP | — |

### Memories Actions (6/6)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Viewer Menu (1) | MINOR | HC-POL-005 (popover) |
| Selection Menu (N) | MINOR | HC-POL-007 (popover) |
| Album Menu | MINOR | HC-POL-007 (popover) |
| Type Menu | MINOR | HC-POL-007 (popover) |
| Trash Menu | MINOR | HC-POL-007 (popover) |
| Favorites Menu | MINOR | HC-POL-007 (popover) |

### Memories Intake & Creation (8/8)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Create Menu (+) | MINOR | HC-POL-006 (popover) |
| Gallery Picker | KEEP | — |
| Camera | MINOR | HC-POL-043, HC-POL-044, HC-POL-045 |
| Audio Import | KEEP | — |
| Audio Record | KEEP | — |
| Written Memory | KEEP | — |
| Batch Review | MINOR | HC-POL-047 |
| Date Picker | MINOR | HC-POL-056 |

### Memories Lifecycle (3/3)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Trash Section | MINOR | HC-POL-052 |
| Restore | KEEP | — |
| Purge | KEEP | — |

### Memories Favorites (3/3)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Favorites Tile | MINOR | HC-POL-053 |
| Favorites Dataset | KEEP | — |
| Favorite Toggle | MINOR | HC-POL-054 |

### Shared Infrastructure (7/7)

| Screen | Status | Modificación |
|--------|--------|--------------|
| ActionSheet Host | MINOR | HC-POL-004/005/006/007 (popover variant) |
| Modal Host | KEEP | — |
| Upload Progress Band | MINOR | HC-POL-017 |
| Download/Share Staging | KEEP | — |
| Signed URL Cache | MINOR | HC-POL-003 (reduce motion) |
| Error Boundaries | MINOR | HC-POL-020 |
| Loading Skeletons | MINOR | HC-POL-008 |

### Office Viewer (4/4)

| Screen | Status | Modificación |
|--------|--------|--------------|
| Office Session Creation | KEEP | — |
| Office Viewer Surface | MINOR | HC-POL-061, HC-POL-062 |
| Bridge Protocol | KEEP | — |
| Origin Whitelist | KEEP | — |
| Title Escaping | KEEP | — |
| Diagnostics | KEEP | — |

### Office Viewer Sub-surface (1/1)

| Screen | Status | Modificación |
|--------|--------|--------------|
| ViewerOfficeSurface (WebView) | MINOR | HC-POL-061, HC-POL-062 |

**TOTAL COBERTURA**: 65/65 superficies del atlas U0 cubiertas.

---

## 7. Registro de Decisiones que Requieren Discusión

### D1: Popover vs Bottom Sheet para acciones contextuales

**Pregunta**: ¿Convertir los bottom sheets de acciones contextuales en popovers anclados?

**Opción A (Recomendada)**: Popover anclado para ≤5 acciones contextuales. Bottom sheet para >5 o multi-step.

**Opción B**: Mantener bottom sheets para todo (solo optimizar presentación).

**Diferencia visible**: El popover es más rápido, más contextual (se ancla al trigger) y no oscurece toda la pantalla. El bottom sheet es más familiar y más fácil de implementar.

**Tradeoff técnico**: El popover requiere un motor de posicionamiento con colisión y safe-area (MEDIUM risk). El bottom sheet ya existe y funciona.

**Recomendación**: Opción A para Create `+`, Viewer `⋯`, File/Folder actions, Album/Type/Resurfacing/Trash/Favorites/Selección `⋯`. Opción B para Destination Picker, Date Picker, Scanner Review, Create Menus (Files).

### D2: Viewer open/close con escala — implementación

**Pregunta**: ¿Cómo implementar la apertura del Viewer con escala desde el tile?

**Opción A (Recomendada)**: Medir bounds del tile con `measure()` antes de montar el viewer, luego usar `Animated.View` con `scale` + `opacity` + `translate` desde los bounds del tile.

**Opción B**: Shared element transition con Reanimated 3 (requiere nueva dependencia).

**Opción C**: Sin escala, solo cross-fade 200ms.

**Diferencia visible**: La Opción A da la continuidad espacial más completa sin nuevas dependencias. La Opción B es más fluida pero requiere Reanimated. La Opción C es la más simple pero menos premium.

**Tradeoff técnico**: Opción A es HIGH risk pero sin dependencias. Opción B es MEDIUM risk con dependencia. Opción C es LOW risk.

**Recomendación**: Opción A. Si el stack actual no permite medir bounds confiablemente, caer a Opción C (cross-fade).

### D3: Audio waveform — estrategia

**Pregunta**: ¿Qué estrategia usar para el waveform real?

**Opción A (Recomendada)**: Live waveform during playback via `useAudioSampleListener`. Solo mientras suena. Requiere `RECORD_AUDIO` en Android.

**Opción B**: Static waveform generado en cliente (descarga + decodificación). Caro con signed URL model.

**Opción C**: Progressive — live during playback, cache para futuro. Más complejo.

**Diferencia visible**: Opción A muestra waveform solo durante reproducción. Opción B muestra waveform siempre. Opción C muestra waveform siempre después de la primera reproducción.

**Tradeoff técnico**: Opción A es MEDIUM risk y platform-gated. Opción B es HIGH risk (descarga completa). Opción C es HIGH risk (más infraestructura).

**Recomendación**: Opción A para V1. C y B como roadmap. Si A no es técnicamente viable, documentar y mantener sin waveform (no fake).

### D4: Quick Video desde modo Foto — viabilidad

**Pregunta**: ¿Es viable implementar hold-to-record-video desde el shutter de Foto?

**Opción A (Recomendada)**: Implementar press-and-hold simple. Si la API de cámara no permite video desde modo foto, documentar como limitación.

**Opción B**: No implementar. Solo tap en modo Video.

**Diferencia visible**: Opción A permite grabar video sin cambiar de modo. Opción B requiere cambio de modo explícito.

**Tradeoff técnico**: Opción A requiere verificar que `expo-camera` permite video desde la misma sesión que foto. Posiblemente requiera `CameraView` con `mode` dinámico.

**Recomendación**: Opción A si es viable. Si no, Opción B con documentación honesta.

### D5: XLSX/PPTX — confirmar hand-off

**Pregunta**: ¿Confirmar que XLSX/PPTX quedan como hand-off del sistema (sin viewer inline)?

**Opción A (Confirmada)**: Hand-off honesto. No implementar viewer inline en este carril.

**Opción B**: Implementar viewer inline con OnlyOffice (mismo que DOCX).

**Diferencia visible**: Opción A muestra "Abrir con…" del sistema. Opción B muestra el documento dentro de la app.

**Tradeoff técnico**: Opción A es LOW risk. Opción B es MEDIUM risk (OnlyOffice server + sesión).

**Recomendación**: Opción A (confirmada por Product Truth). El carril externo de Office está finalizando formatos adicionales por separado.

---

## 8. Criterios de Aceptación Finales

### 8.1 Visual

- [ ] Cross-fade visible en cambio de pestaña Archivos ↔ Recuerdos.
- [ ] Viewer abre con escala desde tile y cierra retornando a él.
- [ ] Álbum/Colección abren con slide up y cierran con slide down.
- [ ] Popovers anclados posicionan correctamente en 360/390/430pt, con y sin notch.
- [ ] Types visiblemente más pequeños que Álbumes.
- [ ] Timeline con radio 14pt, gap 8pt, secciones diferenciadas.
- [ ] Resurfacing con tarjetas fotográficas 16:9, peek de siguiente, información jerárquica.
- [ ] Audio Viewer con jerarquía de 4 bloques y play/pause prominente.
- [ ] Cámara con selector centrado y shutter 74pt.
- [ ] Todos los estados (loading, empty, error) son distinguibles entre sí.
- [ ] Reduce motion desactiva todas las animaciones >50ms.

### 8.2 Interacción

- [ ] Long press 320ms entra en selección con feedback inmediato (check + háptica).
- [ ] Drag selection continuo sin levantar el dedo, con cambio de dirección determinístico.
- [ ] Double-tap zoom/reset en imágenes con arbitraje correcto vs pager.
- [ ] Double-tap ±10s en video sin conflicto con native controls.
- [ ] Drag seek en audio con progreso provisional y confirmación al soltar.
- [ ] Quick Video: hold en Foto graba video, release pasa a review.
- [ ] Fade de chrome en viewers con tap en media.
- [ ] Auto-scroll durante drag selection con indicador visual.

### 8.3 Confiabilidad

- [ ] Ninguna fotografía confirmada como guardada aparece negra permanentemente.
- [ ] Videos compatibles se reproducen (no solo poster).
- [ ] Audio permite drag seek real.
- [ ] Selección por arrastre es 100% confiable (sin selecciones aleatorias).
- [ ] Las animaciones no bloquean interacción ni inventan éxitos.
- [ ] Los popovers no se superponen incorrectamente con otros overlays.

### 8.4 Cobertura

- [ ] Todas las 65 superficies del atlas U0 evaluadas y con modificación o justificación KEEP.
- [ ] Todas las fuentes de input reconciliadas (U0 + Product Truths + Planner_Visual_Freeze).
- [ ] Todos los IDs HC-POL-XXX implementados o marcados como no-aplicables con justificación.

---

## 9. Notas de Dependencia

| Dependencia | Descripción |
|-------------|-------------|
| HC-POL-002 → HC-POL-001, 011, 012, 013, 014, 015, 017, 018, 022, 026, 027, 028, 030, 031, 032, 033, 034, 035, 036, 038, 039, 040, 041, 043, 045, 047, 048, 049, 050, 051, 052, 054, 057, 058, 059, 061, 062 | Las animaciones usan MOTION tokens |
| HC-POL-003 → Todas las animaciones | Gateo de reduce motion debe preceder o acompañar a cada animación |
| HC-POL-004 → HC-POL-005, 006, 007 | Motor de popover compartido |
| HC-POL-010 → HC-POL-004, 005, 006, 007 | Fallback a sheet si no hay espacio |
| HC-POL-031/032 → HC-POL-033 | La escala del viewer interactúa con el chrome toggle |
| HC-POL-038 → HC-POL-042 | El waveform se integra en el Bloque 2 del Audio Viewer |
| HC-POL-043 → HC-POL-044 | El selector centrado es requisito para el quick video |
| HC-POL-046 → HC-POL-047, 048 | El review es la base para batch y guardado |

---

## 10. Resumen

### Total de modificaciones propuestas: 62

### Conteo por área UI

| Área | Cantidad |
|------|----------|
| HOMECLOUD SHARED | 10 |
| FILES | 14 |
| MEMORIES | 32 |
| FILE VIEWERS (compartido con Office) | 6 |
| **TOTAL** | **62** |

### Cambios previamente confirmados recuperados

- Resurfacing exact-only y tarjetas fotográficas: HC-POL-026, 027
- Viewer inmersivo y apertura cinematográfica: HC-POL-031, 032
- Selección drag confiable: HC-POL-050
- Cámara selector centrado y quick video: HC-POL-043, 044
- Audio jerarquía premium: HC-POL-038
- Intake fecha editable y batch: HC-POL-046, 047
- Popovers anclados: HC-POL-004, 005, 006, 007
- Favoritos household-shared: HC-POL-053, 054

### Nuevas oportunidades de pulido descubiertas

- Cross-fade en tab switch: HC-POL-001
- Escala desde tile en viewers: HC-POL-012, 057
- Chromes toggle en viewers: HC-POL-033, 058
- Feedback de selección con escala: HC-POL-014
- Auto-scroll visual indicator: HC-POL-015
- Chip de modo Favoritos: HC-POL-016
- Barra de progreso en upload: HC-POL-017
- Undo snackbar mejorado: HC-POL-018
- Error states distinguibles: HC-POL-020
- Badge de favorito en tile: HC-POL-021
- Jerarquía en Move Picker: HC-POL-023
- File Info más legible: HC-POL-024
- Tipos compactos: HC-POL-029
- Timeline radio 14pt: HC-POL-030
- Audio velocidad y buffering: HC-POL-040, 041
- Audio waveform: HC-POL-042
- Cámara transición a review: HC-POL-045
- Intake guardado con feedback: HC-POL-048
- Long press con háptica: HC-POL-049
- Selection header crossfade: HC-POL-051
- Trash expand/collapse: HC-POL-052
- DatePicker con jerarquía: HC-POL-056
- PDF page indicator: HC-POL-059
- Office loading/error: HC-POL-061, 062

### Superficies sin cambio (con justificación)

| Superficie | Justificación |
|------------|---------------|
| HomeCloud Entry | Funciona correctamente, global shell |
| Household Switcher | Global HomePlus, fuera de alcance |
| Permission Gating | 4 capacidades correctas, token-driven |
| Files Search | Server-backed, funciona bien |
| Files Loading States | RefreshControl + auto-pagination |
| File Grid (2-col) | Responsive, funciona bien |
| Folder Tile | Tap→enter, long press→actions |
| Rename Sheet | Inline edit funciona |
| Save Copy / Share | Hand-off honesto |
| Add Sheet (Files) | 3/2 items con folder inheritance |
| New Folder Sheet | Name input funciona |
| Trash Surface (Files) | Lista con Restore/Purge funciona |
| TXT/MD/CSV Viewer | Bounded read funciona |
| Unsupported/SVG/HTML | Honest refusal funciona |
| Office XLSX/PPTX | Hand-off aceptado (carril externo) |
| Memory Title Row (+) | 44×44, sin círculo, funciona |
| Albums Rail | Horizontal con covers funciona |
| Album Create | Tile final del riel funciona |
| Album Actions | Rename/Add/Delete funciona |
| Written Viewer | Scroll + copy funciona |
| Gallery Picker | Multi-select funciona |
| Audio Import/Record | Dos caminos convergentes funciona |
| Written Memory | Text form funciona |
| Restore/Purge (Memories) | Funciona correctamente |
| Modal Host | Un solo ActionSheet, funciona |
| Download/Share Staging | Paths.cache funciona |
| Bridge Protocol | Versioned, funciona |
| Origin Whitelist | Session origin only, funciona |
| Title Escaping | Neutraliza </script>, funciona |
| Diagnostics | Bounded codes, funciona |

### Decisiones genuinas pendientes

- D1: Popover vs bottom sheet (recomendado: popover para ≤5 acciones)
- D2: Implementación de escala en viewer (recomendado: medida de bounds + Animated.View)
- D3: Estrategia de audio waveform (recomendado: live durante playback)
- D4: Viabilidad quick video (recomendado: implementar si API lo permite)
- D5: Confirmar XLSX/PPTX hand-off (ya confirmado por Product Truth)

### Preguntas de viabilidad técnica

- HC-POL-031/032: ¿Se pueden medir bounds del tile confiablemente antes de montar el viewer?
- HC-POL-035: ¿El arbitraje double-tap vs pager funciona sin gesture-handler?
- HC-POL-036: ¿El double-tap ±10s funciona con native controls activos?
- HC-POL-042: ¿`useAudioSampleListener` funciona en el dispositivo objetivo?
- HC-POL-044: ¿`expo-camera` permite video desde la misma sesión que foto?

### Requisitos de QA de dispositivo

| Modificación | Gate |
|-------------|------|
| HC-POL-001 (cross-fade tab) | Verificar en 360/390/430pt |
| HC-POL-004/005/006/007 (popovers) | Verificar posicionamiento en 360pt, notch, fontScale 1.3 |
| HC-POL-012/057 (viewer escala) | Verificar apertura desde tile en diferente posición de scroll |
| HC-POL-031/032 (memory viewer escala) | Verificar retorno a tile, offscreen fallback |
| HC-POL-035 (double-tap zoom) | Verificar arbitraje con pager |
| HC-POL-036 (video ±10s) | Verificar con native controls y fullscreen |
| HC-POL-044 (quick video) | Verificar hold-to-record en device |
| HC-POL-050 (drag selection) | Verificar 100+ items, cambio de dirección, autoscroll |
| HC-POL-003 (reduce motion) | Verificar con reduce motion activado |

---

**Fin de la Lista Maestra de Pulido Premium**

> **Próximo paso**: Revisión y discusión con el usuario. Luego implementación de las modificaciones aprobadas.