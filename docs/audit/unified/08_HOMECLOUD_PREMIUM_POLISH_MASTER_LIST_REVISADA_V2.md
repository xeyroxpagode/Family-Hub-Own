# 08_HOMECLOUD_PREMIUM_POLISH_MASTER_LIST_REVISADA_V2.md

**HomeCloud Unified Experience — Lista Maestra Consolidada de Diseño Premium · V2**

Status: **FREEZE APROBADO PARA EJECUCION** — 62 targets consolidados tras la revisión visual del 12-10-2026. La evidencia de implementación y QA se registra por ejecución; QA física nunca se infiere de este documento.

**LEDGER EJECUCION 1 (Shared, 2026-10-12)**: `HC-POL-001..010` implementados con QA automatizada; `DEVICE_QA_PENDING`. La enmienda de fecha fue promovida a `HOMECLOUD_MEMORIES_FINAL_PRODUCT_TRUTH.md` sin implementar Intake/fecha, y `ATLAS-COV-01` quedó reconciliado en `docs/homecloud/HOMECLOUD_U0_ATLAS_COVERAGE_RECONCILIATION.md`. Los `DECISION STATUS` dentro de cada target se conservan como snapshot histórico pre-ejecución y quedan sustituidos por este ledger para `001..010`.

**PRECEDENCIA**: los campos `PRECISE TARGET` y `VISUAL GEOMETRY` de esta V2 reemplazan los de V1. El campo `CURRENT` conserva una *fotografía histórica* de la auditoría U0 y no debe interpretarse como CURRENT verificado hoy. Los párrafos de `PROBLEM / OPPORTUNITY`, `INTERACTION / MOTION` y `ACCEPTANCE CRITERION` de origen sirven como trazabilidad; ante diferencias con los targets V2, mandan targets V2 y las secciones 11–16 de este documento. Ningún agente puede implementar interpretando solo los párrafos históricos sin revisar esas secciones.

**CAMBIO DE CONTRATO SOLICITADO Y AÚN NO PROPAGADO**: fecha semántica visible tras importación pero no editable en el upload; edición posterior en Información (más detalle §11). Requiere enmienda explícita del Product Truth antes del código. No se modifica ningún contrato original con esta copia.


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

**PRECISE TARGET**: Cross-fade del contenido 150 ms ease-out, sincronizado con indicador existente. Montaje preservado y pane saliente NO interactivo, sin flash, sin perder scroll, filtro, focus ni navegación. Reduce Motion: fade mínimo/instantáneo.

**VISUAL GEOMETRY**: 150 ms; opacity de pane, no translate/layout.

**INTERACTION / MOTION**: Trigger: tap en SegmentedControl. Origin: pane actual. Destination: pane destino. Interruption: tap en otra pestaña a mitad de transición → abortar, invertir. Reduced motion: 30ms linear.

**AFFECTED STATES**: Default (transición completada), mid-flight (interrumpida), reduced-motion (instantáneo).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.1 Tab Switch; `HomeCloudScreen.tsx:28-35`; `SegmentedControl.tsx`

**EXPECTED IMPACT**: El usuario percibe una transición fluida entre módulos en lugar de un salto visual. Mayor sensación de cohesión.

**TECHNICAL RISK**: LOW — `Animated.View` wrapper sobre ambos panes existentes.

**ACCEPTANCE CRITERION**: Cross-fade visible en device. Reduce motion desactiva la animación. No hay flash de contenido duplicado.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-002: Tokens de motion centralizados (MOTION tokens)

**LOCATION**: `theme.ts` (nueva exportación `MOTION`)

**CURRENT**: Duraciones y easings hardcodeados en múltiples componentes (`150`, `200`, `250`, `easeOut`, etc.). No existe un sistema unificado de motion.

**PROBLEM / OPPORTUNITY**: Sin tokens centralizados, cada animación usa valores ad-hoc. Cambiar la duración de una familia requiere buscar en todo el codebase. Inconsistencia risk.

**PRECISE TARGET**: Tokens compartidos por familias: feedback 100-140 ms (referencia 120), estado/menú 140-190 ms (referencia 180), navegación 200-280 ms (referencia 260), viewer origin-aware 260-300 ms según recorrido, easings consistentes y spring amortiguado solo donde aporta; sin refactor de componentes no relacionados.

**VISUAL GEOMETRY**: Valores de referencia, NO uniformizar tiempos de animaciones nativas.

**INTERACTION / MOTION**: N/A — esto ES el sistema de motion.

**AFFECTED STATES**: Default, reduced-motion (tokens se multiplican por `reducedMultiplier`).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.3; `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §10

**EXPECTED IMPACT**: Consistencia en todas las animaciones. Cambio de duración centralizable.

**TECHNICAL RISK**: LOW — refactor de valores hardcodeados a referencias de token.

**ACCEPTANCE CRITERION**: Todas las animaciones usan `MOTION.*`. Reduce motion verificado.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-003: Hook `useReducedMotion`

**LOCATION**: `hooks/useReducedMotion.ts` (nuevo)

**CURRENT**: Solo `SegmentedControl` verifica `AccessibilityInfo.isReduceMotionEnabled`. ActionSheet, Viewer, drag auto-scroll, upload band, Album/Collection transitions NO lo verifican.

**PROBLEM / OPPORTUNITY**: Accesibilidad parcial. Usuarios con preferencia de movimiento reduido reciben animaciones completas en la mayoría de superficies.

**PRECISE TARGET**: Política global y listener dinámico de Reduce Motion: reemplazar transformaciones espaciales, zoom automático y springs por fades mínimos o cambios instantáneos. No alterar gestos/funcionalidades ni imponer animación obligatoria de 50 ms. Respetar RN Modal y componentes nativos según soporte.

**VISUAL GEOMETRY**: Transiciones esenciales: 0-80 ms opacity opcional; sin desplazamiento, rebote ni paralaje.

**INTERACTION / MOTION**: Se aplica a TODAS las animaciones de la app.

**AFFECTED STATES**: Default (animaciones completas), reduced-motion (animaciones minimizadas).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §6; `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §7 Reduce Motion; HC2-C §10.1 (EXPO_GO_SAFE)

**EXPECTED IMPACT**: Cumplimiento de accesibilidad. Usuarios con reduce-motion reciben experiencia respetuosa.

**TECHNICAL RISK**: LOW — gateo de animaciones existentes.

**ACCEPTANCE CRITERION**: Con reduce motion activado, ninguna animación supera 50ms. Verificado en device.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-004: Popover anclado contextual (File/Folder actions)

**LOCATION**: File Tile long press → acciones; Folder Tile long press → acciones

**CURRENT**: `FileActionHost` usa `ActionSheet size="scrollable-content"` — bottom sheet de 7 filas que ocupa ~90% del viewport. Para un menú contextual de 7 acciones sobre un tile específico, un bottom sheet es excesivo y desconectado del trigger.

**PROBLEM / OPPORTUNITY**: El usuario long-press un tile y ve un bottom sheet gigante que no tiene relación visual con el tile que presionó. Es lento de invocar (slide up de sheet completo) y no comunica "esto es sobre ESTE archivo".

**PRECISE TARGET**: Menú de acciones de File/Folder contextual anclado al trigger cuando sea compacto y quepa sin ocultar contenido esencial. Para 7 acciones, fontScale alto o espacio insuficiente: sheet de acciones completo. Acciones existentes y permisos intactos, destructivas al final; no crear nuevos comandos.

**VISUAL GEOMETRY**: Anchor medido; filas >=48 pt, radio 16-18 pt; sheet adaptativo, no overlay 90% por defecto.

**INTERACTION / MOTION**: Trigger: long press en tile. Entry: fade + escala discreta desde la proximidad del botón (160-220ms, `easeOut`). Salida: animación inversa. Tap fuera: cierra. Back gesture: cierra. Safe area: clamped.

**AFFECTED STATES**: Default (visible), entry (fade+scale in), exit (fade+scale out), fallback (bottom sheet si no hay espacio).

**SOURCE REFERENCES**: `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §3.4-3.5; `06_UNIFIED_PREMIUM_FREEZE_CANDIDATE.md` §4.2; `FileActionHost.tsx`; `ActionSheet.tsx`

**EXPECTED IMPACT**: El menú contextual se siente conectado al tile. Apertura más rápida. Jerarquía visual más clara (no oscurece toda la pantalla).

**TECHNICAL RISK**: MEDIUM — nueva variante en `ActionSheet` con posicionamiento, colisión y safe-area.

**ACCEPTANCE CRITERION**: Popover se ancla correctamente en tiles de diferentes posiciones (top, medio, bottom de pantalla). Fallback a sheet en 360pt con fontScale 1.3. No se recorta por safe areas.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-005: Popover anclado para Viewer `⋯` (Memories)

**LOCATION**: Memory Viewer `⋯ Acciones` button

**CURRENT**: El menú `⋯` del Viewer abre un ActionSheet bottom sheet. El viewer es inmersivo (oculta chrome global) y un bottom sheet rompe la inmersión visual.

**PROBLEM / OPPORTUNITY**: Un bottom sheet desde un visor a pantalla completa es inconsistente con la presentación inmersiva. El popover anclado al botón `⋯` mantiene la continuidad espacial.

**PRECISE TARGET**: Menú `⋯` del Memory Viewer emerge del botón mediante transformOrigin medido: opacity 0→1, scale 0.97→1 y desplazamiento 2-4 pt (160 ms ease-out), sin rebote. Mantiene viewer visible, cierra con tap fuera/Back; separador/destructivas al final. Fallback a sheet si no cabe.

**VISUAL GEOMETRY**: Ancho 248-280 pt, filas >=48 pt, radius 16-18 pt, separación destructivas 8 pt.

**INTERACTION / MOTION**: Trigger: tap en `⋯`. Entry: fade + escala desde el botón. Salida: inversa. Tap fuera: cierra. Back: cierra.

**AFFECTED STATES**: Default, entry, exit, con acciones destructivas (separador visible).

**SOURCE REFERENCES**: `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §3.4; `Planner_Visual_Freeze.md` §10.3; `MemoryViewer.tsx`

**EXPECTED IMPERTO**: El menú de acciones se siente integrado al viewer inmersivo.

**TECHNICAL RISK**: MEDIUM — mismo motor de popover que HC-POL-004.

**ACCEPTANCE CRITERION**: Popover no tapa permanentemente la imagen. Se posiciona correctamente con el viewer en fullscreen.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-006: Popover anclado para menú de Create `+` (Memories)

**LOCATION**: Botón `+` en Memories Root → menú de 5 acciones

**CURRENT**: `MemoryIntake` abre un ActionSheet bottom sheet con 5 items. El `+` es un botón discreto sin círculo.

**PROBLEM / OPPORTUNITY**: 5 acciones planas que lanzan sub-flujos. Un bottom sheet funciona pero un popover anclado al `+` sería más rápido y contextual.

**PRECISE TARGET**: Menú `+` de Memories anclado cuando quepa; cinco acciones originales en el orden congelado: Fotos y videos, Capturar momento, Importar audio, Grabar audio, Escribir un recuerdo. Sin submenús, sin botón `+` circular visible. Fallback sheet compacto en 360 pt/fontScale; no reabrir Review hasta cerrar menú según handoff.

**VISUAL GEOMETRY**: Ancho máximo 300 pt, filas 48-52 pt, icono 24 pt, espaciado 12 pt.

**INTERACTION / MOTION**: Trigger: tap en `+`. Entry: fade + escala discreta desde la proximidad del botón (160-220ms). Salida: inversa. Tap fuera: cierra.

**AFFECTED STATES**: Default, entry, exit, gated (`contribute=false` → `+` no visible).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §10.2; `MemoryIntake.tsx`

**EXPECTED IMPACT**: Apertura más rápida del menú de creación. Mayor conexión visual con el botón `+`.

**TECHNICAL RISK**: MEDIUM — mismo motor de popover.

**ACCEPTANCE CRITERION**: Popover con 5 items no se recorta en 360pt. Iconos y texto alineados. Reduce motion respetado.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-007: Popover anclado para menús contextuales de Álbum/Tipo/Resurfacing/Trash/Favorites/Selección `⋯`

**LOCATION**: Todos los menús `⋯` de Memories (Album detail, Type collection, Resurfacing group, Trash, Favorites, Selection header)

**CURRENT**: Todos estos menús abren ActionSheet bottom sheets.

**PROBLEM / OPPORTUNITY**: Inconsistencia: el menú del `+` y el del Viewer serían popovers, pero los de Álbum/Tipo/etc. serían bottom sheets. Para mantener coherencia, todos los menús contextuales de pocas acciones deben ser popovers anclados.

**PRECISE TARGET**: Un solo sistema de menús `⋯` contextuales para álbum, tipo, resurfacing, Trash, favoritos y selección. Menú corto anclado; sheet para pasos múltiples o destinos. En selección de Memories el header SOLO muestra `[X] N seleccionados [⋯]`: Agregar/Quitar de álbum, Favoritos, Compartir, Papelera, etc. según contexto/capacidad dentro de `⋯`; nada de barra visible Álbum/Favoritos/Papelera. Eliminar acciones inválidas en vez de deshabilitarlas.

**VISUAL GEOMETRY**: Filas >=48 pt; no alterar altura del header ni scroll.

**INTERACTION / MOTION**: Igual que HC-POL-004/005/006.

**AFFECTED STATES**: Default, entry, exit, gated (permisos).

**SOURCE REFERENCES**: `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §3.4; `Planner_Visual_Freeze.md` §10.6

**EXPECTED IMPACT**: Sistema de popovers coherente en toda la app. El usuario aprende un patrón.

**TECHNICAL RISK**: MEDIUM — migración de múltiples superficies al popover.

**ACCEPTANCE CRITERION**: Menú accesible desde `⋯`; el header Memories Selection contiene solo `X`, conteo y `⋯`; acciones visibles dependen de caller y permisos; sin barra fija de acciones.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-008: Estado de carga distinguible para portadas de álbum (BUG B3)

**LOCATION**: `AlbumTile.tsx:55-89` (`AlbumCoverImage`)

**CURRENT**: Mientras la portada se resuelve, se muestra el MISMO `AlbumCoverFallback` que para `unavailable` y `imageFailed`. Un cuadrado plano de `background.alt` con un glifo. No hay estado de carga distinguible.

**PROBLEM / OPPORTUNITY**: El usuario no puede distinguir "cargando" de "no disponible" de "falló". Los bloques grises planos se leen como "álbum en blanco", no como "cargando".

**PRECISE TARGET**: Separar LOADING (skeleton misma geometría), READY sin portada (fallback neutro), imagen disponible (preview real) y ERROR (mensaje/acción honesta). Fade discreto al estar lista; nunca skeleton permanente ni imagen falsa.

**VISUAL GEOMETRY**: Cover 132×132 pt, radio 20 pt; fade 120-180 ms.

**INTERACTION / MOTION**: N/A — estado pasivo.

**AFFECTED STATES**: loading (skeleton), ready (imagen), unavailable (fallback con icono), error (fallback con icono + copy).

**SOURCE REFERENCES**: HC2-C §4.2 B3; `AlbumTile.tsx:55-89`

**EXPECTED IMPACT**: El usuario distingue claramente carga vs error vs vacío.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Portada en estado de carga se ve diferente a portada no disponible.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-009: Contraste de botones `⋯` sobre portadas claras/oscuras

**LOCATION**: Botones `⋯` sobre tiles de álbum, tipo, resurfacing

**CURRENT**: Los botones `⋯` usan `surface.soft` con `border.subtle`. Sobre portadas muy claras o muy oscuras, el contraste puede ser insuficiente.

**PROBLEM / OPPORTUNITY**: Accesibilidad y legibilidad. Un botón que no se distingue sobre la portada es un control inutilizable.

**PRECISE TARGET**: Control `⋯` de área táctil >=44×44, fondo adaptativo opaco/traslúcido controlado y contraste >=3:1 sobre portadas claras/oscuras. No oscurecer indiscriminadamente toda la fotografía.

**VISUAL GEOMETRY**: 44×44 pt, radio circular o 12 pt según token; contraste medible.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Default, pressed, disabled.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §10.4 ("El botón necesita contraste suficiente sobre portadas claras u oscuras")

**EXPECTED IMPACT**: Botones siempre visibles y tocables.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Contraste verificado en portadas claras y oscuras, light y dark mode.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-010: Sheet → Popover fallback por espacio insuficiente

**LOCATION**: Motor de popover (compartido HC-POL-004/005/006/007)

**CURRENT**: No existe motor de popover.

**PROBLEM / OPPORTUNITY**: En pantallas pequeñas (360pt) con fontScale alto, un popover con muchas acciones puede no caber. Se necesita fallback automático.

**PRECISE TARGET**: Presentación adaptativa calculada con medidas reales del menú y viewport (safe areas, notch, teclado y fontScale); primero posición anclada con flip/clamp, luego sheet si la altura útil no alcanza. Una sola capa de overlays; sin flicker de recálculo.

**VISUAL GEOMETRY**: No usar `espacio <100 pt` como criterio único; comparar altura completa + márgenes accesibles.

**INTERACTION / MOTION**: N/A — decisión de layout en render.

**AFFECTED STATES**: popover (normal), sheet (fallback).

**SOURCE REFERENCES**: `04_UNIFIED_COMPONENTS_POPOVERS_DESIGN_SYSTEM.md` §3.5 Collision Rules

**EXPECTED IMPACT**: Robustez en todas las geometrías de dispositivo.

**TECHNICAL RISK**: MEDIUM.

**ACCEPTANCE CRITERION**: En 360pt fontScale 1.3, los popovers tienen fallback a sheet cuando no caben.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

### 2.2 FILES

---

#### HC-POL-011: Transición Folder Enter/Back (slide direccional)

**LOCATION**: Root → Folder, Folder → Subfolder, Folder → Back

**CURRENT**: `setFolder(folderId)` → `loadFirstPage()`. El contenido cambia instantáneamente. El breadcrumb trail aparece/desaparece sin transición.

**PROBLEM / OPPORTUNITY**: Navegación jerárquica sin feedback espacial. El usuario no tiene sensación de "entrar" o "volver".

**PRECISE TARGET**: Entrar/salir de carpeta con slide direccional 180-220 ms solo si el contenido anterior y siguiente están preparados; mantener breadcrumbs y posición de scroll. Back interrumpible; si hay paginación/loading inesperado, fade/estado estable en vez de desplazar contenido vacío.

**VISUAL GEOMETRY**: 180-220 ms para contenido; breadcrumb 120-150 ms; no desplazar todo el shell.

**INTERACTION / MOTION**: Trigger: tap en FolderTile (enter), back gesture / breadcrumb tap (back). Origin: contenido actual. Destination: contenido nuevo. Interruption: back gesture → reverse slide. Reduced motion: 40ms linear.

**AFFECTED STATES**: Default, entering (slide right), exiting (slide left), mid-flight (interrumpido), reduced-motion.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 Folder Enter/Back; `HomeCloudFilesScreen.tsx`

**EXPECTED IMPACT**: El usuario percibe la jerarquía de carpetas como un desplazamiento espacial.

**TECHNICAL RISK**: MEDIUM — `Animated.View` sobre el contenedor del browser.

**ACCEPTANCE CRITERION**: Slide visible al entrar/volver de carpetas. Interrupción por back gesture funciona. Reduce motion desactiva.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-012: Apertura de File Viewer con escala desde tile

**LOCATION**: Tap en FileTile → `HomeCloudFileViewerScreen`

**CURRENT**: El Viewer es un `StyleSheet.absoluteFill` View que aparece instantáneamente (mount). No hay transición desde el tile.

**PROBLEM / OPPORTUNITY**: El usuario toca un archivo y la pantalla cambia abruptamente. No hay continuidad entre el tile y el visor.

**PRECISE TARGET**: Apertura visual origin-aware desde tile si hay preview renderizable y se pueden medir sus bounds; para PDF sin portada, audio, texto u Office usar fade corto. El retorno al origen solo si la celda existe/está visible. MISMO owner de implementación que HC-POL-057 (un solo motor, sin duplicar).

**VISUAL GEOMETRY**: Contenidos visuales 240-280 ms; fallback opacity 180-220 ms; Reduce Motion sin transform.

**INTERACTION / MOTION**: Trigger: tap en FileTile. Origin: tile bounds. Destination: fullscreen. Interruption: swipe down → cancel, return. Reduced motion: 50ms linear.

**AFFECTED STATES**: Default, opening (scale up), open (stable), closing (scale down), fallback (fade si tile offscreen), error (fallback inmediato).

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 File→Viewer; `HomeCloudFileViewerScreen.tsx`

**EXPECTED IMPACT**: El usuario percibe que el archivo "se expande" desde su tile.

**TECHNICAL RISK**: HIGH — requiere medir bounds del tile antes de montar el viewer. Posible necesidad de shared element transition o escala aproximada.

**ACCEPTANCE CRITERION**: Apertura con escala visible. Cierre retornando al tile. Tile offscreen → fade fallback. Reduce motion desactiva.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-013: Header morph en entrada/salida de selección (Files)

**LOCATION**: `HomeCloudFilesScreen.tsx` header overflow → `Seleccionar`

**CURRENT**: El header normal se reemplaza condicionalmente por `FileSelectionBar`. Swap instantáneo sin transición.

**PROBLEM / OPPORTUNITY**: Cambio abrupto de header. No hay continuidad entre modo normal y modo selección.

**PRECISE TARGET**: Selection header cross-fade 150 ms + desplazamiento opcional de <=4 pt, preservando altura, búsqueda, grid y scroll. Sin acciones repetidas en modo selección.

**VISUAL GEOMETRY**: 150 ms, translateY <=4 pt.

**INTERACTION / MOTION**: Trigger: tap en `Seleccionar` (enter), tap en `X` / back (exit). Origin: header actual. Interruption: tap fuera → cancel. Reduced motion: 30ms linear.

**AFFECTED STATES**: Default, entering, active, exiting, reduced-motion.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §3.1 Selection Header Morph; `FileSelectionBar.tsx`

**EXPECTED IMPACT**: Transición fluida entre modos. El header se transforma en lugar de saltar.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Cross-fade visible. Reduce motion desactiva.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-014: Feedback de selección de tile (Files) — check con escala

**LOCATION**: `MemorySelectableCard` seleccionado (Files grid)

**CURRENT**: `selected` → `borderWidth: 3`, `borderColor: terracotta[600]`, checkmark icon. El check aparece instantáneamente.

**PROBLEM / OPPORTUNITY**: Al seleccionar con drag sweep (D4), muchas celdas se seleccionan en rápida sucesión. Sin animación, cada check aparece con un "pop" visual que puede sentirse mecánico.

**PRECISE TARGET**: Check 24 pt escala 0.85→1 en 100-140 ms, anillo 2 pt, overlay de color al 8%; durante barridos rápidos limitar a feedback directo de estado para no animar todas las celdas.

**VISUAL GEOMETRY**: Check 24 pt, hit del tile sin reducción; 100-140 ms solo toggle aislado.

**INTERACTION / MOTION**: Trigger: tap o drag sweep. Origin: centro del check. Interruption: deselección → reverse. Reduced motion: instantáneo.

**AFFECTED STATES**: Default, selected (check visible), deselected (check oculto), multi-select (varios checks simultáneos, sin animaciones pesadas).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §4.5; `MemorySelectableCard.tsx`

**EXPECTED IMPACT**: Selección se siente táctil y responsiva. Drag sweep no genera 20 animaciones pesadas.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Check con escala visible al seleccionar. 20 selecciones rápidas no causan lag.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-015: Auto-scroll durante drag selection (Files) — feedback visual

**LOCATION**: `homecloudDragSelection.ts` + `MemorySelectableCard`

**CURRENT**: Auto-scroll con edge zone 72dp, step 12dp, tick 16ms. Funciona pero no hay feedback visual de que el scroll está ocurriendo por el drag.

**PROBLEM / OPPORTUNITY**: El usuario arrastra hacia el borde y el contenido se desplaza, pero no hay indicación visual de que el scroll es por el drag (puede sentirse como un scroll normal).

**PRECISE TARGET**: Indicar edge autoscroll solo cuando efectivamente se activa, mediante gradiente o acento extremadamente tenue; no mostrar gradiente constante durante drag. Prioridad a hit-testing y selección determinista; se puede omitir indicador si interfiere con lectura.

**VISUAL GEOMETRY**: Zona de borde según motor existente; indicador <=24 pt, fade <=100 ms.

**INTERACTION / MOTION**: Trigger: drag activo cerca del borde. Origin: borde de pantalla. Salida: fade out al soltar.

**AFFECTED STATES**: Default, dragging (indicador visible), released (indicador oculto).

**SOURCE REFERENCES**: HC2-C §4.3; `homecloudMemoryDrag.ts`

**EXPECTED IMPACT**: El usuario entiende que el scroll está ocurriendo por su gesto de arrastre.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Gradiente visible durante drag hacia el borde. Desaparece al soltar.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-016: Filtro Favoritos con feedback visual de modo activo

**LOCATION**: `FilesFilterMenu.tsx` → toggle Favoritos

**CURRENT**: El filtro de favoritos es un toggle en un menú. No hay indicación persistente de que el modo Favoritos está activo.

**PROBLEM / OPPORTUNITY**: El usuario puede olvidar que está en modo Favoritos. Confusión sobre por qué solo ve algunos archivos.

**PRECISE TARGET**: Chip contextual `★ Favoritos ×` cuando filtro activo, claramente extraíble. No usar layout reflow en mitad de gestos; reservar espacio/fade de pequeña duración.

**VISUAL GEOMETRY**: 32-36 pt alto, 12 pt padding horizontal, fade <=150 ms.

**INTERACTION / MOTION**: Trigger: toggle en filtro. Entry: fade + slide down 150ms. Salida: tap en ✕ o toggle off → fade out.

**AFFECTED STATES**: Default, filtro activo (chip visible), filtro inactivo (chip oculto).

**SOURCE REFERENCES**: `FilesFilterMenu.tsx`; Product Truth §Favorites filter

**EXPECTED IMPACT**: El usuario siempre sabe que está en modo Favoritos.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Chip visible cuando filtro activo. Tap en ✕ quita el filtro.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-017: Upload Pill flotante — estado sin reflow

**LOCATION**: `HomeCloudUploadProgress.tsx`

**CURRENT**: Banda global con `Subiendo X · N%` + `Cancelar`. Aparece con mount instantáneo.

**PROBLEM / OPPORTUNITY**: La banda aparece/desaparece abruptamente. No hay animación de entrada/salida. El progreso es solo textual.

**PRECISE TARGET**: Reemplazar banda grande por píldora FLOTANTE COMPACTA sobre la UI, con `N archivos · porcentaje real`, progreso 3-4 pt y tap para expandir detalle jobs/cancel/retry. Nunca desplazar search, headers, grid, tab selector o navbar. Ubicación dinámica según safe-area, teclado, sheet y FAB; no tap-target obstruido. No afirmar guardado definitivo antes de confirmar ACTIVE.

**VISUAL GEOMETRY**: Colapsado aprox. 168-220 pt ancho, alto ~46-54 pt, radio 12-14 pt; expandido overlay con detalle; entrada opacity + translateY <=6 pt, 150-180 ms.

**INTERACTION / MOTION**: Trigger: job real iniciado. Pill aparece en overlay con fade + translateY <=6 pt en 150-180 ms. Tap expande overlay detalle. Completar solo después de ACTIVE; fallos mantienen indicador/retry. Nuevo job actualiza contenido sin reset brusco de animación.

**AFFECTED STATES**: Oculto, queued, uploading, verifying/finalizing según transport real, ACTIVE/completed, partial failure, failed, cancelled, expanded/collapsed.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 Upload Band; `HomeCloudUploadProgress.tsx`

**EXPECTED IMPACT**: Progreso accesible y sin ocupar espacio de contenido; no hay layout shift.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Píldora colapsada sin reflow, interacción con tab/search/grid normal, expandir para detalle, progreso y éxito verídicos, no tapa CTA/FAB/teclado, prueba de 360 pt y notches.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-018: Undo Snackbar — animación y claridad

**LOCATION**: `HomeCloudFilesScreen.tsx` → Snackbar "Movido a la papelera" + `Deshacer`

**CURRENT**: Snackbar aparece con mount instantáneo. `Deshacer` es un text button.

**PROBLEM / OPPORTUNITY**: El snackar de undo es la segunda oportunidad del usuario de recuperar un archivo. Debe ser prominente y claro.

**PRECISE TARGET**: Snackbar Deshacer compacto y accesible sin barra lateral terracota dominante, entrada desde borde 160-200 ms. El tiempo visible depende del contrato de Undo real, accesibilidad y ciclo de vida; NO fijar arbitrariamente 8 segundos ni ocultar una acción que ya caducó.

**VISUAL GEOMETRY**: Area táctil >=44 pt; sin desplazamiento del contenido.

**INTERACTION / MOTION**: Trash confirmado → snackbar compacta slide/fade 160-200 ms. `Deshacer` ejecuta restauración real, disponible solo durante ventana de undo acordada con producto/runtime; la salida no inventa caducidad.

**AFFECTED STATES**: Oculto, visible recuperable, restaurando, restored, failed, expirado según contrato.

**SOURCE REFERENCES**: `HomeCloudFilesScreen.tsx`; Product Truth §Undo

**EXPECTED IMPACT**: El undo es más visible y accesible. El usuario tiene tiempo suficiente para reaccionar.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Acción Deshacer con recuperación real y hit >=44 pt; no cronometrar 8 s arbitrarios, visual no interfiere con pill upload.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-019: Estado vacío de Files con CTA más prominente

**LOCATION**: `HomeCloudFilesScreen.tsx` → `ListEmptyComponent`

**CURRENT**: Icono 64 + "Todavía no hay archivos" + `AppButton "Agregar archivo"`.

**PROBLEM / OPPORTUNITY**: El estado vacío funciona pero es visualmente discreto. Podría ser más acogedor.

**PRECISE TARGET**: Estados vacíos diferenciados de raíz, carpeta y búsqueda, con CTA contextual solo si hay permisos. Iconografía sencilla y copy útil; evitar arte decorativo grande.

**VISUAL GEOMETRY**: Icono de referencia 48-64 pt, CTA 48-52 pt, centrado según contenido.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Empty (sin contenido), gated (`contribute=false` → sin CTA).

**SOURCE REFERENCES**: `HomeCloudFilesScreen.tsx`; Product Truth §Empty states

**EXPECTED IMPACT**: El estado vacío se siente más diseñado y menos "roto".

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: CTA visible y tocable. Centrado vertical. Contraste correcto.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-020: Error State con retry más claro (Files)

**LOCATION**: `HomeCloudFilesScreen.tsx` → `ErrorState`

**CURRENT**: `ErrorState` con icono 48 + mensaje + `Reintentar`.

**PROBLEM / OPPORTUNITY**: El estado de error preserva la lista cargada (correcto), pero visualmente puede confundirse con un estado vacío.

**PRECISE TARGET**: Error específico con Retry cuando corresponda. Si existe contenido previo válido, banner pequeño inline sin desmontarlo. No confundir Error con Empty ni afirmar pérdida de datos.

**VISUAL GEOMETRY**: Acento error token semántico; mensajes cortos.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Error (con retry), retrying (spinner), recovered (vuelve a data).

**SOURCE REFERENCES**: `ErrorState.tsx`; `HomeCloudFilesScreen.tsx`

**EXPECTED IMPACT**: El usuario distingue error de vacío. Sabe qué hacer.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Error visualmente distinto de vacío. Retry funcional.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-021: File Tile — badge de favorito persistente

**LOCATION**: `FileTile` en grid

**CURRENT**: El favorito solo se ve en el menú de acciones. No hay indicación visual en el tile.

**PROBLEM / OPPORTUNITY**: El usuario no sabe cuáles archivos son favoritos sin abrir el menú.

**PRECISE TARGET**: Estrella de favorito persistente, en esquina sin colisión con tipo, estado de selección o menú; contraste adecuado. Feedback solo al toggle, no al montar celdas.

**VISUAL GEOMETRY**: Icono 12-16 pt sobre hit correcto.

**INTERACTION / MOTION**: Trigger: toggle de favorito. Entry: fade in 150ms. Salida: fade out.

**AFFECTED STATES**: Default, favorito (badge visible), no favorito (sin badge).

**SOURCE REFERENCES**: `HomeCloudFilesScreen.tsx`; Product Truth §Personal Favorites

**EXPECTED IMPACT**: Identificación rápida de favoritos en el grid.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Badge visible en tiles favoritos. No se solapa con badge de carpeta.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-022: Scanner — perspectiva por página y revisión multipágina

**LOCATION**: `HomeCloudScannerScreen.tsx` → review sheet

**CURRENT**: Al escanear, las páginas se capturan y se muestran en un review sheet. La transición es un reemplazo instantáneo.

**PROBLEM / OPPORTUNITY**: El scanner es un momento de "creación" que merece una transición más cuidada.

**PRECISE TARGET**: Scanner con flujo explícito: captura → editor de UNA página (corregir perspectiva con cuatro esquinas arrastrables, rotar, recortar, confirmar) → revisión MULTIPÁGINA. En multipágina SOLO acciones globales Agregar página, Reordenar páginas y Guardar PDF; tocar miniatura abre editor de la página elegida. No poner botones globales Corregir perspectiva ni Rotar/Recortar. El original y la geometría corregida obedecen contrato existente.

**VISUAL GEOMETRY**: Editor individual fullscreen/sheet near-full; cuadrilátero visible con cuatro handles >=44 pt de hit; confirmación visual discreta sin flash agresivo.

**INTERACTION / MOTION**: Captura → editor individual del pageId actual; handles de perspectiva se mueven 1:1 con dedo; confirmar devuelve miniatura corregida a su posición en multipágina con fade 120-160 ms. Tap miniatura en resumen abre editor de esa página. En multipágina, solo Agregar/Reordenar/Guardar.

**AFFECTED STATES**: Capturando, detectando bordes, edición manual de página, perspectiva sin autodección, rotación, recorte, confirmada, revisión de varias páginas, guardando PDF, error.

**SOURCE REFERENCES**: `HomeCloudScannerScreen.tsx`

**EXPECTED IMPACT**: La captura se siente como un evento confirmado.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Perspectiva con cuatro puntos ajustables por página, edición de una página NO toca otras; multipágina ofrece solo agregar/reordenar/guardar y abrir editor al tocar thumbnail; PDF final usa páginas y orden confirmados.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-023: Move Destination Picker — jerarquía visual de carpetas anidadas

**LOCATION**: `FileMoveDestinationPicker.tsx`

**CURRENT**: Lista depth-first con paths computados. Funciona pero puede ser difícil de escanear visualmente.

**PROBLEM / OPPORTUNITY**: Con carpetas anidadas, una lista plana de paths es difícil de leer. El usuario necesita entender la jerarquía de un vistazo.

**PRECISE TARGET**: Jerarquía de destino basada en capacidades reales del modelo actual, con sangría limitada y ruta secundaria cuando hay profundidad. No crear carpetas anidadas por diseño ni usar `parent_id` si backend no lo soporta.

**VISUAL GEOMETRY**: Fila >=52 pt; sangría por nivel topeada para preservar lectura.

**INTERACTION / MOTION**: N/A — layout estático.

**AFFECTED STATES**: Default, selected, multi-level (indentado).

**SOURCE REFERENCES**: `FileMoveDestinationPicker.tsx`; Product Truth §Move

**EXPECTED IMPACT**: El usuario entiende la jerarquía de un vistazo. Selección más rápida.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Jerarquía visible en carpetas anidadas. Selección clara.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-024: Info Sheet — metadatos más legibles

**LOCATION**: `FileActionHost.tsx` → File Info Sheet

**CURRENT**: Nombre, Carpeta, Fecha de documento, Nota. Presentados como rows en un sheet.

**PROBLEM / OPPORTUNITY**: Los metadatos son información densa que necesita jerarquía visual. Actualmente son rows uniformes sin distinción entre label y valor.

**PRECISE TARGET**: Ficha de información con etiqueta/valor, campos editables solo donde corresponda, sin arcoíris de iconos ni affordance falsa. Tipo/nombre primero, ubicación y metadatos de dominio después.

**VISUAL GEOMETRY**: Labels 12-13 pt, valores 15-17 pt, gap 12-16 pt.

**INTERACTION / MOTION**: N/A — layout estático.

**AFFECTED STATES**: Default, editando (campo activo), guardado (feedback).

**SOURCE REFERENCES**: `FileActionHost.tsx`; Product Truth §File Info

**EXPECTED IMPACT**: Los metadatos son más legibles y escaneables.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Jerarquía label/valor clara. Indicador editable visible.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

### 2.3 MEMORIES

---

#### HC-POL-025: Root IA — composición más compacta y fotográfica

**LOCATION**: `HomeCloudMemoriesScreen.tsx` → Root IA completa

**CURRENT**: TitleRow + Resurfacing + Albums Rail + Types Rail + Timeline. Funciona pero el prompt Planner_Visual_Freeze pide: "Root más compacto y fotográfico; menos espacio vertical desperdiciado; Types notablemente más pequeños que Álbumes; Timeline de 3 columnas refinado".

**PROBLEM / OPPORTUNITY**: La composición actual funciona pero no es tan compacta ni fotográfica como el freeze premium exige. Los Types ocupan demasiado espacio (100×100) en comparación con Álbumes (132×132).

**PRECISE TARGET**: Root único: Header+`+`, Para volver a ver, Álbumes, Tipos, Timeline. Más fotográfico y compacto sin alterar organización ni datasets. Evitar navbar global en Viewer, Cámara, Scanner o Review dedicado. Mantener foco y scroll.

**VISUAL GEOMETRY**: Márgenes horizontales 20 pt; secciones 20-24 pt; título-contenido 12 pt.

**INTERACTION / MOTION**: N/A — layout estático.

**AFFECTED STATES**: Default, sin contenido (tipos/albunes vacíos), cargando (skeletons).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §2.1, §3.3-3.8; `HomeCloudMemoriesScreen.tsx`

**EXPECTED IMPACT**: Root más compacto, fotográfico y premium. Types son accesos compactos, no tarjetas grandes.

**TECHNICAL RISK**: MEDIUM — cambio de dimensiones en múltiples componentes del root.

**ACCEPTANCE CRITERION**: Types visiblemente más pequeños que Álbumes. Separaciones consistentes. Timeline con 3 columnas y gap 8pt.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-026: Resurfacing — carrusel fotográfico premium con next-card peek

**LOCATION**: `HomeCloudMemoriesScreen.tsx` → Resurfacing band

**CURRENT**: Tiles de 160×160 con radio 24pt. El freeze pide: "carrusel horizontal de tarjetas fotográficas con una parte visible de la siguiente tarjeta".

**PROBLEM / OPPORTUNITY**: Las tarjetas actuales son cuadradas y pequeñas. El freeze premium exige tarjetas más grandes, fotográficas, con peek de la siguiente para invitar al scroll horizontal.

**PRECISE TARGET**: Resurfacing de grupos elegibles EXACT-ONLY: carrusel con fotografías reales 16:9, título/fecha/recuento y peek de la siguiente tarjeta. Adaptar ancho a 360/390/430 con padding real; fallback tipográfico para audio/escritos; nunca fabricar efemérides o previews.

**VISUAL GEOMETRY**: En viewport 360/390/430 pt y margen 20 pt: tile 270/300/340 pt, alto 152/169/191 pt; gap 12 pt; peek visible >16 pt. Medir visual en device.

**INTERACTION / MOTION**: Scroll horizontal con paging suave (snap a cada tarjeta). Tap en tarjeta → abre grupo de resurfacing con slide up 250ms.

**AFFECTED STATES**: Default, cargando (placeholder misma geometría), con contenido (fotografía real), fallback (audio/escrito → tipográfico).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §3.3, §3.5; `HomeCloudMemoriesScreen.tsx`

**EXPECTED IMPACT**: Resurfacing se siente como una galería premium, no como una fila de cuadrados.

**TECHNICAL RISK**: MEDIUM — cambio de dimensiones y proporción.

**ACCEPTANCE CRITERION**: Tarjetas con peek de la siguiente. Información jerárquica (título/fecha/count). Fallback tipográfico para no-fotografías.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-027: Resurfacing Group — presentación inmersiva del grupo

**LOCATION**: `HomeCloudMemoriesScreen.tsx` → Resurfacing group overlay

**CURRENT**: Overlay con SectionList de memories del grupo. Funciona pero no tiene la continuidad visual de "la tarjeta se expandió hacia este grupo".

**PROBLEM / OPPORTUNITY**: El usuario toca una tarjeta de resurfacing y ve una lista. No hay sensación de que la tarjeta "llegó aquí".

**PRECISE TARGET**: Grupo Resurfacing con portada visual continua y título/fecha/cantidad veraces. Grid de 3 columnas; abrir Viewer/volver conserva grupo y scroll. Para portada no fotográfica, cabecera tipográfica honesta.

**VISUAL GEOMETRY**: Cabecera 120-160 pt según tamaño y safe areas; overlay de contraste adaptativo.

**INTERACTION / MOTION**: Trigger: tap en tarjeta de resurfacing. Entry: slide up 250ms `ease-out` + la cabecera tiene continuidad con la tarjeta (cross-fade). Salida: slide down 200ms. Back: slide down.

**AFFECTED STATES**: Default, open (inmersivo), closed (vuelve a root), con viewer abierto (cierra a grupo).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §3.4; `HomeCloudMemoriesScreen.tsx`

**EXPECTED IMPACT**: El grupo se siente como una extensión natural de la tarjeta.

**TECHNICAL RISK**: MEDIUM.

**ACCEPTANCE CRITERION**: Cabecera con misma fotografía que la tarjeta. Retorno correcto a grupo y a root.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-028: Albums Radio — transición direccional de entrada/salida

**LOCATION**: `AlbumsRail.tsx` → Album Detail overlay

**CURRENT**: El overlay de álbum aparece con mount instantáneo (zIndex: 10).

**PROBLEM / OPPORTUNITY**: La transición de root → álbum no tiene continuidad espacial con el tile que se tocó.

**PRECISE TARGET**: Entrada/salida de álbum y tipo como una sola familia de navegación vertical (240-260 ms entrada, 180-220 salida), sin fingir origin-morph si solo hay slide. Preservar caller y scroll; sin oscurecimiento exagerado del Root.

**VISUAL GEOMETRY**: Slide vertical controlado + fade leve, viewport clip seguro.

**INTERACTION / MOTION**: Trigger: tap en AlbumTile. Origin: tile bounds. Interruption: back gesture / swipe down → reverse. Reduced motion: 50ms linear.

**AFFECTED STATES**: Default, opening (slide up), open (stable), closing (slide down), reduced-motion.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 Album→Detail; `AlbumDetailView.tsx`

**EXPECTED IMPACT**: El álbum se siente como que "sube" desde el tile.

**TECHNICAL RISK**: MEDIUM — animación de overlay.

**ACCEPTANCE CRITERION**: Slide visible. Overlay de root se atenúa. Cierre funcional.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-029: Types Radio — acceso compacto

**LOCATION**: `MemoryCollectionTile.tsx` → Types Rail (Fotos, Videos, Audios, Notas)

**CURRENT**: Tiles de 100×100 con radio 24pt. Mismos títulos que Álbumes. El freeze pide: "Tipos notablemente más pequeños que Álbumes".

**PROBLEM / OPPORTUNITY**: Los Types son accesos de navegación, no colecciones principales. Deben ser visualmente más ligeros que los Álbumes.

**PRECISE TARGET**: Tipos: cuatro accesos Fotos, Videos, Audios, Notas notablemente menores que Álbumes. No mostrar contadores inventados. Ajustar ancho/gap a 360/390/430, hit >=44 pt y texto accesible.

**VISUAL GEOMETRY**: 360: tile 74 pt/gap 8; 390: tile 81/gap 8; 430: tile 88/gap 12; radio 16 pt; icono 24 pt.

**INTERACTION / MOTION**: Tap en tile → abre colección con slide up 250ms.

**AFFECTED STATES**: Default, pressed, gated (sin contenido → empty honesto).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §3.7; `MemoryCollectionTile.tsx`

**EXPECTED IMPACT**: Los Types son accesos ligeros, no compiten visualmente con Álbumes.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Types visiblemente más pequeños que Álbumes. Gap consistente.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-030: Timeline — refinamiento de grid de 3 columnas

**LOCATION**: `MemoryTimelineRow.tsx` + `MemorySelectableCard.tsx`

**CURRENT**: 3 columnas, gap 8pt, radio 24pt. El freeze pide: "Radio de 14pt para fotografías pequeñas; espaciado de 8pt; sin bordes visibles sobre imágenes cargadas; secciones de fecha claramente diferenciadas".

**PROBLEM / OPPORTUNITY**: El radio de 24pt es demasiado redondeado para celdas pequeñas de timeline. Puede generar "esquinas blancas" entre celdas adyacentes.

**PRECISE TARGET**: Timeline fotográfico 3 columnas, gap 8 pt, radio 14 pt, sin borde sobre imagen cargada; encabezados de fecha claros sin divisor obligatorio repetitivo; refresh preserva fotos existentes.

**VISUAL GEOMETRY**: Secciones con separación aprox. 20-24 pt, skeleton mismo tamaño.

**INTERACTION / MOTION**: N/A — layout estático.

**AFFECTED STATES**: Default, cargando (skeleton), con datos (fotografías), seleccionando (borde + check).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §3.8; `MemoryTimelineRow.tsx`

**EXPECTED IMPACT**: Timeline más denso y fotográfico. Secciones claramente diferenciadas.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Radio 14pt. Sin esquinas blancas entre celdas. Secciones diferenciadas.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-031: Memory Viewer — apertura cinematográfica desde tile

**LOCATION**: Tap en memory tile → `MemoryViewer.tsx`

**CURRENT**: El Viewer es un `StyleSheet.absoluteFill` View (zIndex: 20) que aparece instantáneamente. No hay transición desde el tile.

**PROBLEM / OPPORTUNITY**: El freeze premium pide: "El Viewer debe sentirse conectado con la fotografía tocada. Una representación temporal de esa foto se expande hacia el Viewer."

**PRECISE TARGET**: Apertura Viewer Memories con copia temporal de la preview exacta expandida desde bounds del tile (260-300 ms), fondo inmersivo y chrome entra después. No usar zoom desde centro como sustituto falso del origen. Si origen invisible/inestable, fade honesto; reduce motion lo evita.

**VISUAL GEOMETRY**: Snapshot/preview origin-aware, clip y esquinas interpoladas; 260-300 ms.

**INTERACTION / MOTION**: Trigger: tap en tile. Origin: tile bounds. Interruption: swipe down → cancel, return. Reduced motion: 50ms linear.

**AFFECTED STATES**: Default, opening (scale up), open (stable), closing (scale down), fallback (fade si tile offscreen), error (fallback inmediato), missing (celda eliminada → sin animación).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §5.1; `MemoryViewer.tsx`

**EXPECTED IMPACT**: El usuario percibe que la fotografía "se expande" desde su tile hacia el visor inmersivo.

**TECHNICAL RISK**: HIGH — requiere medir bounds del tile antes de montar el viewer. Posible necesidad de shared element transition o escala aproximada con `Animated.Image`.

**ACCEPTANCE CRITERION**: Apertura con escala visible desde el tile. Cierre retornando al tile. Tile offscreen → fade fallback. Reduce motion desactiva.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-032: Memory Viewer — cierre con retorno a la celda de origen

**LOCATION**: `MemoryViewer.tsx` → close

**CURRENT**: `setViewer(null)` → el overlay se desmonta instantáneamente. No hay retorno visual a la celda de origen.

**PROBLEM / OPPORTUNITY**: El cierre abrupto rompe la continuidad espacial. El freeze pide retorno reversible.

**PRECISE TARGET**: Cierre invierte expansión al mismo tile si sigue visible; si no, fade sin auto-scroll. Mantener álbum/tipo/resurfacing/selección/página según caller; cerrar nunca manda a Root como fallback.

**VISUAL GEOMETRY**: 180-220 ms, con igual clip y posición medidos.

**INTERACTION / MOTION**: Trigger: tap en Cerrar / back gesture / swipe down. Origin: pantalla completa. Destination: celda de origen. Interruption: tap en media → cancel close. Reduced motion: 40ms linear.

**AFFECTED STATES**: Open, closing (scale down), closed (vuelve a source), fallback (fade si offscreen), reduced-motion.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §5.2; `MemoryViewer.tsx`

**EXPECTED IMPACT**: El usuario percibe que la fotografía "vuelve a su lugar".

**TECHNICAL RISK**: HIGH — requiere medir bounds de la celda antes de desmontar el viewer.

**ACCEPTANCE CRITERION**: Cierre con retorno a la celda visible. Offscreen → fade. Reduce motion.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-033: Memory Viewer — chrome show/hide con fade

**LOCATION**: `MemoryViewer.tsx` → tap en media → toggle chrome

**CURRENT**: El chrome (top y bottom) está siempre visible.

**PROBLEM / OPPORTUNITY**: Para una experiencia inmersiva premium, el chrome debe poder ocultarse para disfrutar de la fotografía sin distracciones.

**PRECISE TARGET**: Tap libre alterna chrome con fade <=150 ms; no reflow de foto. Evitar activarlo con zoom/pan/doble tap o controles nativos de video. Chrome puede permanecer oculto entre páginas si es consistente; siempre hay forma accesible de salir.

**VISUAL GEOMETRY**: 150 ms opacity only.

**INTERACTION / MOTION**: Trigger: tap en media. Interruption: swipe → cancel toggle. Reduced motion: instantáneo.

**AFFECTED STATES**: Chrome visible, chrome oculto, toggling (fade).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §5.3; `MemoryViewer.tsx`

**EXPECTED IMPACT**: El usuario puede disfrutar de la fotografía sin distracciones.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Chrome se oculta/muestra con fade. Pager no se ve afectado. Estado persiste entre páginas.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-034: Memory Viewer — pager swipe con reduce motion

**LOCATION**: `MemoryViewer.tsx` → FlatList horizontal pagingEnabled

**CURRENT**: Pager nativo con `pagingEnabled`. No verifica `reduceMotion`.

**PROBLEM / OPPORTUNITY**: Con reduce motion activado, el pager snap puede sentirse excesivamente animado.

**PRECISE TARGET**: Conservar pager nativo y swipe. Reduce Motion afecta transiciones programáticas que puedan controlarse, sin romper pagingEnabled/snap esperado. No requerir desactivar un comportamiento nativo sin probar viabilidad.

**VISUAL GEOMETRY**: Native snap donde necesario; reduce motion sin transiciones espaciales adicionales.

**INTERACTION / MOTION**: Swipe horizontal → cambio de página.

**AFFECTED STATES**: Default (snap animado), reduced-motion (snap instantáneo).

**SOURCE REFERENCES**: `MemoryViewer.tsx`; HC2-C §10.1

**EXPECTED IMPACT**: Accesibilidad respetada.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Con reduce motion, el cambio de página es instantáneo.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-035: Image Viewer — double-tap zoom/reset

**LOCATION**: `MemoryViewer.tsx` → `ImagePage`

**CURRENT**: No implementado. El freeze lo marca como IN (Product Truth §14.2). El HC2-C lo marca DEFER por riesgo de arbitraje con pager.

**PROBLEM / OPPORTUNITY**: Es un gesto universal en galerías. Su ausencia es notable en un producto premium.

**PRECISE TARGET**: Double-tap zoom 2× cerca de coordenadas de tap/reset y pinch/pan reales, arbitraje estricto con pager. Si stack requiere dependencia nueva, STOP técnico explícito antes de agregarla. No sacrificar apertura exacta.

**VISUAL GEOMETRY**: Zoom 200 ms y sin rebote; a escala 1 pager, ampliado pan.

**INTERACTION / MOTION**: Trigger: doble tap. Interruption: pinch → cancel double-tap. Reduced motion: instantáneo.

**AFFECTED STATES**: Fit (escala 1), zoomed (escala >1), transitioning.

**SOURCE REFERENCES**: Product Truth §14.2; HC2-C §10.1; `ImagePage`

**EXPECTED IMPACT**: Gesto universal de galería presente.

**TECHNICAL RISK**: HIGH — arbitraje con pager. Puede requerir gesture-handler/reanimated. Regla: si el stack actual no es suficiente, la regla "sin dependencia nueva" puede ser supersedida (Product Truth §14.2).

**ACCEPTANCE CRITERION**: Double-tap zoom/reset funcional. Pager no interfiere. Reduce motion.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-036: Video Viewer — double-tap ±10s

**LOCATION**: `MemoryVideoPage.tsx`

**CURRENT**: No implementado. Product Truth §15.5 lo marca IN. HC2-C lo marca DEFER por conflicto con native controls.

**PROBLEM / OPPORTUNITY**: Gestos universales de video. El native controls ya tiene seek, pero el double-tap es más rápido.

**PRECISE TARGET**: Double-tap izquierdo/derecho ±10 s solo si convive con controles nativos y fullscreen sin double-seek ni paginación accidental; si no, preservar control nativo y mantener deuda visible.

**VISUAL GEOMETRY**: Overlay resultado breve 400-600 ms, sin animación invasiva.

**INTERACTION / MOTION**: Trigger: doble tap. Interruption: single tap → toggle chrome. Reduced motion: sin indicador visual.

**AFFECTED STATES**: Playing, paused, buffering, fullscreen.

**SOURCE REFERENCES**: Product Truth §15.5; HC2-C §10.2; `MemoryVideoPage.tsx`

**EXPECTED IMPACT**: Control de video más rápido y natural.

**TECHNICAL RISK**: HIGH — arbitraje con native controls y pager.

**ACCEPTANCE CRITERION**: ±10s funcional. Sin conflicto con pager ni fullscreen.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-037: Video Viewer — poster mientras se prepara

**LOCATION**: `MemoryVideoPage.tsx`

**CURRENT**: El video pide solo el original. No hay poster. El estado no-listo es spinner + "Cargando video…" sobre negro.

**PROBLEM / OPPORTUNITY**: Un video largo sobre red móvil produce la experiencia "tarda una eternidad". Product Truth §15.4 marca poster como IN.

**PRECISE TARGET**: Poster real si existe, hasta player listo; sin poster, preparando visible y honesto. No declarar reproducción funcional por ocultar pantalla negra. QA físico de formatos compatibles obligatorio.

**VISUAL GEOMETRY**: Poster aspect-fit; buffering discreto, sin salto.

**INTERACTION / MOTION**: Trigger: apertura de video. Entry: poster aparece inmediatamente. Player ready → poster desaparece (cross-fade 200ms).

**AFFECTED STATES**: Loading (spinner), poster visible (imagen), ready (player), error (copy honesto).

**SOURCE REFERENCES**: Product Truth §15.3-15.4; HC2-C §10.2; `MemoryVideoPage.tsx`

**EXPECTED IMPACT**: El usuario ve algo inmediatamente en lugar de un spinner eterno.

**TECHNICAL RISK**: MEDIUM — requiere `hasPreview` en el dataset (ya existe en preview pipeline).

**ACCEPTANCE CRITERION**: Poster visible antes de player ready. Spinner honesto sin poster.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-038: Audio Viewer — jerarquía visual premium

**LOCATION**: `MemoryAudioPage.tsx`

**CURRENT**: Controles básicos: play/pause, seek, tiempo, duración. El freeze pide: "Una composición vertical centrada, con ancho máximo de contenido aproximado de 360pt. Bloque 1: Identidad. Bloque 2: Progreso. Bloque 3: Reproducción. Bloque 4: Velocidad."

**PROBLEM / OPPORTUNITY**: El audio viewer actual es funcional pero no tiene la jerarquía visual premium que el freeze exige. El play/pause no es lo suficientemente prominente.

**PRECISE TARGET**: Audio Viewer en 4 bloques: identidad, progreso/seek real, play/pause dominante con ±10 s, velocidad compacta. No renderizar waveform falso; la ausencia de waveform no bloquea progreso funcional.

**VISUAL GEOMETRY**: Max width 360 pt, play principal 60-64, secundarias hit >=44, gap 16-24.

**INTERACTION / MOTION**: N/A — layout estático (salvo waveform).

**AFFECTED STATES**: Preparando, Reproduciendo, Pausado, Buffering, Error, Waveform no disponible.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §8.1-8.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: El audio viewer se siente como un producto premium, no como un reproductor mínimo.

**TECHNICAL RISK**: MEDIUM — reorganización del layout.

**ACCEPTANCE CRITERION**: Jerarquía clara de 4 bloques. Play/pause prominente. Waveform real o none.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-039: Audio Viewer — drag seek funcional

**LOCATION**: `MemoryAudioPage.tsx` → barra de progreso

**CURRENT**: Seek por toque sobre la barra. Product Truth §8.2 del freeze pide drag: presionar, deslizar, ver progreso provisional, confirmar seek al soltar.

**PROBLEM / OPPORTUNITY**: El seek por toque solo es insuficiente. El usuario espera poder arrastrar el indicador.

**PRECISE TARGET**: Drag seek interactivo continuo en preview temporal y commit real al soltar; ante error restituir posición real. Priorizar gesto/estado sobre efecto visual.

**VISUAL GEOMETRY**: Hit >=44 pt alto, thumb 16 pt.

**INTERACTION / MOTION**: Trigger: press en indicador. Drag: sigue el dedo. Release: confirma seek. Interruption: vertical drag → cancel.

**AFFECTED STATES**: Default, dragging (progreso provisional), released (seek confirmado).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §8.2; HC2-C §10.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: Seek fluido y natural.

**TECHNICAL RISK**: MEDIUM — posible conflicto entre Pressable y PanResponder.

**ACCEPTANCE CRITERION**: Drag seek funcional. Progreso provisional visible. Seek confirmado al soltar.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-040: Audio Viewer — velocidad de reproducción

**LOCATION**: `MemoryAudioPage.tsx`

**CURRENT**: No implementado. Product Truth §16.2 lo marca IN.

**PROBLEM / OPPORTUNITY**: Control básico de audio que falta.

**PRECISE TARGET**: Velocidades 0.5/1/1.5/2× mediante selector compacto que muestra opción activa y abre opciones bajo demanda; no agregar cuatro controles grandes junto al play.

**VISUAL GEOMETRY**: Botón >=44 pt, opciones dentro de menú accesible.

**INTERACTION / MOTION**: Trigger: tap en velocidad. Aplicación inmediata.

**AFFECTED STATES**: 0.5x, 1x, 1.5x, 2x.

**SOURCE REFERENCES**: Product Truth §16.2; HC2-C §10.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: Control completo de audio.

**TECHNICAL RISK**: LOW — API ya existe.

**ACCEPTANCE CRITERION**: Velocidad cambia al tocar. Estado seleccionado visible.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-041: Audio Viewer — buffering honesto

**LOCATION**: `MemoryAudioPage.tsx`

**CURRENT**: Solo "Cargando audio…" mientras `!isLoaded`. Una stalls en reproducción no se anuncia.

**PROBLEM / OPPORTUNITY**: El usuario no sabe si el audio se detuvo por buffering o por error.

**PRECISE TARGET**: Buffering pequeño y honesto, sin tapar arte/tiempo; no confundir con error y conservar progreso y estado durante stall.

**VISUAL GEOMETRY**: Indicador discreto, no overlay full-screen.

**INTERACTION / MOTION**: Automático.

**AFFECTED STATES**: Playing, buffering, paused, error.

**SOURCE REFERENCES**: Product Truth §16.2; HC2-C §10.3; `MemoryAudioPage.tsx`

**EXPECTED IMPACT**: El usuario entiende qué está pasando.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Buffering visible y distinguible de error.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-042: Audio Viewer — waveform real (ROADMAP)

**LOCATION**: `MemoryAudioPage.tsx`

**CURRENT**: No implementado. Fake waveform prohibido.

**PROBLEM / OPPORTUNITY**: Product Truth §16.3 marca real waveform como IN ROADMAP. Es un requisito de cierre.

**PRECISE TARGET**: Waveform SOLAMENTE derivado del audio real y habilitado si plataforma/permisos lo permiten; no pedir RECORD_AUDIO solo por ver un recuerdo sin decisión técnica/UX expresa. Si no está disponible, barra de seek completa sin fake waveform.

**VISUAL GEOMETRY**: Altura opcional 56-64 pt; no reservar vacío si ausente.

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

**PRECISE TARGET**: Foto/Video centrados respecto de viewport; shutter fijo 74 pt. Hit de modo >=44, transición corta sin rearmar cámara innecesariamente.

**VISUAL GEOMETRY**: Shutter 74×74; selector centrado, gap 16-20 pt.

**INTERACTION / MOTION**: Tap en segmento → cambio de modo con transición 160-200ms.

**AFFECTED STATES**: Modo Foto, Modo Video, transitioning.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §6.1; `MemoryCameraSurface.tsx`

**EXPECTED IMPACT**: Selector visualmente centrado y simétrico.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Selector centrado. Shutter en misma posición en ambos modos.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-044: Cámara — hold shutter en Foto para Quick Video

**LOCATION**: `MemoryCameraSurface.tsx` → shutter en modo Foto

**CURRENT**: No implementado. Product Truth §7 del freeze pide: "Mantener presionado → inicia video. Soltar: detiene video y pasa a confirmación."

**PROBLEM / OPPORTUNITY**: Es un gesto habitual de cámara. El usuario espera poder grabar video sin cambiar de modo.

**PRECISE TARGET**: Quick Video en modo Foto: hold inicia video real, indicador y tiempo real, release detiene y abre el MISMO Review binario. Validar API instalada + device; modo Video tap-to-record permanece funcional. No prometer si API no permite.

**VISUAL GEOMETRY**: Hold threshold y cancelación a validar, status visible y haptics discretos.

**INTERACTION / MOTION**: Press-and-hold → grabación. Release → stop + review. Arbitraje: tap corto = foto, hold = video. Umbral: 300ms.

**AFFECTED STATES**: Foto (tap), Foto hold (grabando video), Video (tap start/stop).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §6.2; `MemoryCameraSurface.tsx`

**EXPECTED IMPACT**: Gestos de cámara naturales y rápidos.

**TECHNICAL RISK**: MEDIUM — requiere acceso a la API de cámara para video desde modo foto.

**ACCEPTANCE CRITERION**: Hold en Foto graba video. Release pasa a review. Indicador visible.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-045: Cámara — transición cámara → review con continuidad

**LOCATION**: `MemoryCameraSurface.tsx` → review

**CURRENT**: Al usar foto/video, pasa al review. Puede haber flash negro entre superficies.

**PROBLEM / OPPORTUNITY**: El freeze pide: "La última imagen capturada permanece visible mientras se produce el cambio a review. No debe haber flash negro."

**PRECISE TARGET**: Captura→Review conserva el MISMO archivo de origen: URI/draftId/assetId e identidad de preview verificados antes de animar. Cross-fade sobre esa imagen exacta; NUNCA foto de ejemplo o contenido previo. Fallo de preview = estado honesto, no asset equivocado.

**VISUAL GEOMETRY**: Preview asset-bound dominante; fade 180-200 ms.

**INTERACTION / MOTION**: Tras captura real, handoff de draft identificado por URI/draftId; review renderiza ese MISMO draft con fade 180-200 ms y no una foto demo. Bloquear la transición si la identidad no coincide; preview failure explícito.

**AFFECTED STATES**: Camera (capturando), review (preview dominant), cancelled.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §6.5; `MemoryCameraSurface.tsx`

**EXPECTED IMPACT**: Transición suave sin flash negro.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Preview de cámara foto/video/audio corresponde al draft exacto, sin stale preview ni foto equivocada; no se pierde dato si no carga preview.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-046: Intake — jerarquía de review más clara

**LOCATION**: `MemoryMediaReview.tsx`

**CURRENT**: Preview + Fecha + Álbum + Descripción + Guardar. Funciona pero el freeze pide una jerarquía más cuidada.

**PROBLEM / OPPORTUNITY**: El review es un formulario que debe sentirse como "confirmar un recuerdo", no como "completar un formulario técnico".

**PRECISE TARGET**: Review individual para foto/video/audio: preview REAL del draft activo y nombre/tipo cuando ayude, álbum opcional, descripción opcional y Guardar. SIN selector de fecha ni elección de precisión durante importación. Extraer semantic date automáticamente de metadata admitida; faltante = unknown, nunca upload date/Date.now. Para recuerdo escrito sin metadata, puede mantenerse entrada semántica opcional según su contrato.

**VISUAL GEOMETRY**: Preview dominante, padding 20 pt, gaps 16 pt, Guardar 52 pt; pantalla enfocada sin navbar ni tab global.

**INTERACTION / MOTION**: Import/capture → Review del MISMO draft. Editar álbum y descripción opcionales. No abrir DatePicker desde media Review. Guardar invoca upload real; no fake success.

**AFFECTED STATES**: Preview ready/loading/error con mismo draftId; optional Album/Description; submitting; partial/error/ACTIVE; fecha auto-derivada o unknown no editable aquí.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §7.2; `MemoryMediaReview.tsx`

**EXPECTED IMPACT**: Review más claro y menos "formulario técnico".

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Media Review usa preview del archivo correcto y no muestra selector de fecha; pantalla dedicada sin global tab/navbar obstructiva; guardar/errores veraces; Written Memory mantiene flujo propio.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-047: Intake batch — navegación entre elementos

**LOCATION**: `MemoryIntake.tsx` → Batch Review

**CURRENT**: Swipe previews, single submit, partial failure honest. Funciona pero el freeze pide: "Indicador de posición: «2 de 5». Controles anterior/siguiente. Transición horizontal breve entre elementos."

**PROBLEM / OPPORTUNITY**: La navegación batch actual es funcional pero no tiene la presentación premium que el freeze exige.

**PRECISE TARGET**: Batch review: preview real del elemento activo e índice `2 de 5`, miniaturas prev/next con correspondencia 1:1 entre draftId, URI y metadata del elemento. Sin formulario de fecha repetido ni campo de fecha en upload. Fechas independientes derivadas por metadata o unknown; álbum y descripción comunes/per-item según contrato. No perder modificaciones por cambiar de item.

**VISUAL GEOMETRY**: Navegación 180-200 ms, sin previsualización de item equivocado.

**INTERACTION / MOTION**: Next/prev cambia atómicamente índice + preview + draftId + título + metadatos actuales. Miniatura seleccionada corresponde 1:1 al mismo archivo; fade/horizontal breve 180-200 ms. Sin DatePicker en batch Review.

**AFFECTED STATES**: Default, navigating (transición), saving (spinner), saved (fade out), partial error (copy honesto).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §7.3; `MemoryIntake.tsx`

**EXPECTED IMPACT**: Navegación batch más clara y premium.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Batch de fotos/videos mixtos: preview exacto del elemento N, overrides conservados, semantic date por asset, no editor temporal de importación, partial failures recuperables.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-048: Intake — guardado con feedback de éxito real

**LOCATION**: `MemoryIntake.tsx` → submit

**CURRENT**: Al guardar, el review se cierra. El usuario vuelve a Root.

**PROBLEM / OPPORTUNITY**: El freeze pide: "El botón pasa a estado de operación confirmada sin cerrar prematuramente toda la interfaz. Cuando el contenido está realmente ACTIVE: el review se cierra, el usuario vuelve a Root, la actualización del Timeline se integra sin flash de vacío. Puede aparecer un highlight breve sobre el recuerdo recién incorporado."

**PRECISE TARGET**: Guardar con estado real de pending → uploading → finalizing → ACTIVE/partial/error, protegiendo submit contra duplicación. Solo cerrar/mostrar éxito una vez confirmado; refresh de timeline sin destello; no declarar éxito con fallos parciales.

**VISUAL GEOMETRY**: Feedback breve <=200 ms; contenido permanezca visible hasta handoff confirmado.

**INTERACTION / MOTION**: Trigger: tap en Guardar. Estados: Guardando → ACTIVE → cierre + root.

**AFFECTED STATES**: Guardando (spinner), ACTIVE (cierre), fallido (copy honesto + reintento), partial (solo fallidos nombrados).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §7.4; `MemoryIntake.tsx`

**EXPECTED IMPACT**: Feedback claro de éxito real. Sin celebration si hay fallidos.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Botón muestra "Guardando…". Cierre con fade. Highlight si visible. No celebration con fallidos.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-049: Selección — entrada por long press con feedback inmediato

**LOCATION**: `MemorySelectableCard.tsx` → long press → `enterMemorySelection`

**CURRENT**: Long press entra en selección. El freeze pide: "Long press aproximadamente 320ms. Al activarse: se selecciona la fotografía bajo el dedo, aparece la indicación visual, se activa háptica breve, el header cambia a selección, la posición del grid no se modifica."

**PROBLEM / OPPORTUNITY**: El long press actual funciona pero puede no tener el umbral óptimo ni el feedback háptico.

**PRECISE TARGET**: Long press ~320 ms selecciona item bajo dedo, háptica UNA vez, check inmediato; selección mantiene contexto y misma posición del grid. Sin acciones fijas Álbum/Favoritos/Papelera en header.

**VISUAL GEOMETRY**: Header `[X] N seleccionados [⋯]`, 56 pt de alto; check 100-140 ms aislado.

**INTERACTION / MOTION**: Trigger: long press 320ms. Feedback inmediato. Interruption: release antes de 320ms → no entra.

**AFFECTED STATES**: Default, long pressing (umbral), selected (activo), dragging (drag selection).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §4.1; `MemorySelectableCard.tsx`

**EXPECTED IMPACT**: Entrada en selección táctil y con feedback inmediato.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Long press ~320ms, primera celda seleccionada bajo dedo sin jump, háptica una vez, header X/N/⋯ sin botones Álbum/Favoritos/Papelera.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-050: Selección — drag continuo sin levantar el dedo

**LOCATION**: `homecloudMemoryDrag.ts` + `MemorySelectableCard`

**CURRENT**: D4 drag selection funciona. El freeze pide: "Mantener presionado → seleccionar primera foto → arrastrar sobre otras fotos → seleccionar rango. No debe exigir soltar el dedo y volver a mantener presionado."

**PROBLEM / OPPORTUNITY**: El drag selection actual puede tener problemas de respuesta, hit-testing o autoscroll. El freeze pide corregir cualquier problema.

**PRECISE TARGET**: Arrastre continuo después de long press sin levantar dedo, barrido reversible determinista, auto-scroll y sin selección accidental por scroll vertical normal; mantener selección individual accesible. Las acciones viven en `⋯`.

**VISUAL GEOMETRY**: QA de 100+ items y cambio de dirección; no animar cada celda pesada.

**INTERACTION / MOTION**: Drag continuo. Dirección cambia → rango se reduce/restaura. Autoscroll en bordes.

**AFFECTED STATES**: Normal, selecting, dragging, direction change, edge autoscroll.

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §4.2-4.4; HC2-C §4.3; `homecloudMemoryDrag.ts`

**EXPECTED IMPACT**: Drag selection 100% confiable y táctil.

**TECHNICAL RISK**: MEDIUM — corrección de hit-testing y arbitraje.

**ACCEPTANCE CRITERION**: Barrido continuo sin soltar, cambio de dirección determinista y auto-scroll confiable 100+ items; no activa scroll y selección simultáneamente; acciones solo en menú.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-051: Selección — header con crossfade y acciones inmediatas

**LOCATION**: `MemorySelectionHeader.tsx`

**CURRENT**: Header `[X] N seleccionados [⋯ Acciones]`. Sin crossfade al entrar. Solo hay un ActionSheet (picker de destino).

**PROBLEM / OPPORTUNITY**: El freeze pide: "Cambio de header mediante crossfade de aproximadamente 150 ms. Acciones disponibles inmediatamente."

**PRECISE TARGET**: Header de selección exclusivamente `[X] N seleccionados [⋯]`, mismo alto que header normal, cross-fade 150 ms, sin fila de botones fijos debajo. Menú contextual ordena acciones válidas según caller y permisos; vuelve exactamente al caller.

**VISUAL GEOMETRY**: Header 56 pt; acciones no ocupan altura permanente.

**INTERACTION / MOTION**: Tap/long press para entrar a selección; crossfade de header 150 ms, sin fila adicional de acciones. Tap `⋯` abre menú contextual desde anchor (o sheet si no cabe). Cancela al caller previo.

**AFFECTED STATES**: Normal, selecting (crossfade in), active, exiting (crossfade out).

**SOURCE REFERENCES**: `Planner_Visual_Freeze.md` §4.6; `MemorySelectionHeader.tsx`

**EXPECTED IMPACT**: Header fluido. Acciones inmediatas.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Header EXACTO `[X] N seleccionados [⋯]`, sin segunda fila Álbum/Favoritos/Papelera; todas las acciones permitidas desde ⋯; scroll se preserva.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-052: Trash (Memories) — expandir/colapsar con animación

**LOCATION**: `HomeCloudMemoriesScreen.tsx` → Trash section

**CURRENT**: La sección de trash es condicional (solo si hay contenido). Aparece/desaparece instantáneamente.

**PROBLEM / OPPORTUNITY**: La aparición abrupta de la sección de trash puede sentirse como un salto.

**PRECISE TARGET**: Papelera descubrible y accesible; animar solo el contenido al expandir/colapsar cuando haya elementos. No quitar acceso de forma inesperada por estar vacía; no reordenar root con saltos.

**VISUAL GEOMETRY**: Expand/collapse 180-200 ms; fallback instantáneo reduce motion.

**INTERACTION / MOTION**: Trigger: trash content disponible/vacío. Animación de altura.

**AFFECTED STATES**: Hidden, expanding, visible, collapsing.

**SOURCE REFERENCES**: `03_UNIFIED_NAVIGATION_MOTION_BLUEPRINT.md` §2.2 Trash Expand; `HomeCloudMemoriesScreen.tsx`

**EXPECTED IMPACT**: Aparición suave de la sección de trash.

**TECHNICAL RISK**: MEDIUM — animación de altura.

**ACCEPTANCE CRITERION**: Expand/collapse visible. Reduce motion desactiva.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-053: Favorites — tile del rail con identidad visual

**LOCATION**: `AlbumsRail.tsx` → Favorites tile (primer tile)

**CURRENT**: Tile de Favoritos con icono de estrella. Funciona pero es visualmente similar a un álbum normal.

**PROBLEM / OPPORTUNITY**: Favoritos es una colección especial, no un álbum. Debe tener identidad visual distinta.

**PRECISE TARGET**: Favoritos tile colección especial compartida por hogar, aspecto próximo a álbumes pero identidad sutil de estrella/brand. No renombrar/eliminar como álbum común.

**VISUAL GEOMETRY**: 132×132 pt, radio 20 pt, acento suave.

**INTERACTION / MOTION**: Tap → abre dataset con slide up 250ms.

**AFFECTED STATES**: Default, pressed, empty (sin favoritos → empty honesto).

**SOURCE REFERENCES**: `AlbumsRail.tsx`; Product Truth §22

**EXPECTED IMPACT**: Favoritos se distingue visualmente de los álbumes.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Favoritos con identidad visual distinta. Sin rename/delete.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-054: Favoritos — toggle con feedback visual

**LOCATION**: Viewer/selection → star/unstar

**CURRENT**: Toggle de favorito en menú de acciones. No hay feedback visual inmediato.

**PROBLEM / OPPORTUNITY**: El toggle de favorito debe sentirse como un gesto con peso (favoritar = destacar).

**PRECISE TARGET**: Estrella feedback 120-180 ms con háptica discreta una vez, rollback si mutación falla; bulk en `⋯`, respetando favorite household-shared y organize.

**VISUAL GEOMETRY**: No animación en cada rerender, solo acción real.

**INTERACTION / MOTION**: Trigger: tap en star. Animación + háptica. Interruption: rollback si falla.

**AFFECTED STATES**: Not favorite, favoriting (animación), favorited, rollback (error).

**SOURCE REFERENCES**: Product Truth §22; `MemoryViewer.tsx`

**EXPECTED IMPACT**: Favorito se siente como un gesto con peso.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Animación + háptica. Rollback funcional.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-055: Álbum vacío — CTA "Agregar recuerdos"

**LOCATION**: `AlbumDetailView.tsx` → álbum vacío

**CURRENT**: Copy "Esta colección todavía no tiene recuerdos" + botón "Agregar recuerdos".

**PROBLEM / OPPORTUNITY**: El CTA funciona pero podría ser más prominente y acogedor.

**PRECISE TARGET**: Empty álbum breve y contextual, CTA Agregar recuerdos solo si capability contribute/organize según contrato vigente; sin gráfico sobredimensionado.

**VISUAL GEOMETRY**: CTA 48-52 pt; sin reflow.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Empty (con CTA), gated (`organize=false` → sin CTA).

**SOURCE REFERENCES**: `AlbumDetailView.tsx`; Product Truth §10.4

**EXPECTED IMPACT**: Álbum vacío más acogedor.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: CTA visible y tocable. Centrado.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-056: Editor de fecha posguardado — DatePickerSheet compacto

**LOCATION**: `DatePickerSheet.tsx` (Memories intake/info)

**CURRENT**: Selector de 4 precisiones (exact/month-year/year/unknown). Funciona.

**PROBLEM / OPPORTUNITY**: La fecha es un dato de primera clase. El date picker debe sentirse como una decisión importante.

**PRECISE TARGET**: Se RETIRA el selector de precisión de fecha del flujo de importación/captura Review foto/video/audio. La fecha viene de metadatos de captura soportados; `unknown` si no existe. El editor de 4 precisiones (exact/month_year/year/unknown) permanece exclusivamente donde se edita fecha semántica POST-GUARDADO en Información del recuerdo para roles `homecloud.organize`, y en creación escrita si aplica. UI de edición compacta, no 4 cards grandes; no mostrar fecha de subida en Información.

**VISUAL GEOMETRY**: Date editor contextual posguardado; al ingresar fecha parcial no sintetizar un día.

**INTERACTION / MOTION**: No aparece en Review foto/video/audio. En Información posguardado, tap `Editar` abre editor compacto de precisión; elegir una opción y valor explícito y confirmar. Sin fecha de subida visible. Solo `homecloud.organize` puede editar.

**AFFECTED STATES**: No visible en intake media; post-save read-only/authorized editing, precision exact/month_year/year/unknown, partial/unknown, saved/error.

**SOURCE REFERENCES**: `DatePickerSheet.tsx`; Product Truth §7.5

**EXPECTED IMPACT**: Upload sin fricción; Timeline usa únicamente fecha semántica correcta. Edición posguardado cuando el usuario lo necesita.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: No DatePicker en Review binario individual/batch; Información muestra fecha de recuerdo, no fecha de subida; el editor posguardado conserva 4 precisiones sin inventar fecha exacta; permisos validados.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

### 2.4 FILE VIEWERS (Compartido con Office)

---

#### HC-POL-057: File Viewer — apertura con escala desde tile

**LOCATION**: `HomeCloudFileViewerScreen.tsx`

**CURRENT**: El viewer aparece instantáneamente (mount). No hay transición desde el tile.

**PROBLEM / OPPORTUNITY**: Igual que HC-POL-012 pero para todos los tipos de archivo (imagen, video, audio, PDF, texto).

**PRECISE TARGET**: ID de trazabilidad de la apertura/cierre File Viewer: usa el MISMO owner/motor de HC-POL-012, sin segunda implementación. Expansión origin-aware solo con preview real y bounds fiables; en formatos documentales y origen no visible fade honesto.

**VISUAL GEOMETRY**: Misma duración y geometría que 012; test conjunto.

**INTERACTION / MOTION**: Igual que HC-POL-012.

**AFFECTED STATES**: Default, opening, open, closing, fallback, error.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`

**EXPECTED IMPACT**: Continuidad espacial entre tile y viewer.

**TECHNICAL RISK**: HIGH.

**ACCEPTANCE CRITERION**: Escala visible. Cierre retornando al tile. Reduce motion.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-058: File Viewer — chrome show/hide

**LOCATION**: `HomeCloudFileViewerScreen.tsx` → top chrome

**CURRENT**: Chrome siempre visible.

**PROBLEM / OPPORTUNITY**: Para PDF y texto, el chrome puede ocultar contenido. Debería poder ocultarse.

**PRECISE TARGET**: Tap media alterna chrome en imagen/video sin mover contenido; PDF/Office conserva siempre los controles necesarios para manejar el documento. No secuestrar gesto de scroll o zoom.

**VISUAL GEOMETRY**: Opacity 150 ms únicamente donde sea útil.

**INTERACTION / MOTION**: Tap → toggle.

**AFFECTED STATES**: Chrome visible, oculto, toggling.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`

**EXPECTED IMPACT**: Lectura sin distracciones para PDF/texto.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Chrome se oculta/muestra. Contenido no se mueve.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-059: PDF Viewer — indicador de página y zoom

**LOCATION**: `HomeCloudFileViewerScreen.tsx` → PDF WebView

**CURRENT**: PDF renderizado en WebView con pdf.js. Multi-page, zoom.

**PROBLEM / OPPORTUNITY**: El usuario no sabe en qué página está ni cuántas hay.

**PRECISE TARGET**: PDF indicador de página real `3/12` pequeño, evita ocultar contenido; zoom accesible solo si comunica estado real de pdf.js y no duplica controles que ya funcionan.

**VISUAL GEOMETRY**: Chip auto-hide opcional ~2 s tras interacción; hit botones >=44 pt.

**INTERACTION / MOTION**: Cambio de página → chip fade in/out. Zoom → inmediato.

**AFFECTED STATES**: Default, page change (chip visible), zooming.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`

**EXPECTED IMPACT**: El usuario sabe dónde está y puede hacer zoom.

**TECHNICAL RISK**: MEDIUM — sincronización con pdf.js WebView.

**ACCEPTANCE CRITERION**: Indicador de página visible. Botones zoom funcionales.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-060: PDF Viewer — estados de error/protected

**LOCATION**: `HomeCloudFileViewerScreen.tsx` → PDF error/protected

**CURRENT**: Estados de error y protegido existen con copy honesto.

**PROBLEM / OPPORTUNITY**: Pueden ser más claros y accionables.

**PRECISE TARGET**: Estados separados PDF password/protected/corrupt/unsupported con handoff del sistema únicamente si realmente está disponible. Mensajes accionables y sin falsos errores.

**VISUAL GEOMETRY**: Cards sobrias, no full-screen success/error inventado.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Protected, corrupted, error.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`; Product Truth §A5

**EXPECTED IMPACT**: Error claro y accionable.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Copy honesto. Botón hand-off funcional.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-061: Office Viewer — loading state

**LOCATION**: `ViewerOfficeSurface`

**CURRENT**: WebView con OnlyOffice. Estado de carga no definido visualmente.

**PROBLEM / OPPORTUNITY**: El usuario no sabe si el documento está cargando o si hay un error.

**PRECISE TARGET**: Office loading honesto ligado a readiness real del bridge/sesión; transicionar solo con documento listo, error/retry explícito, sin falso éxito por WebView montado. Adopción por formatos adicionales cuando carril Office provea capacidades.

**VISUAL GEOMETRY**: Fade 180-200 ms en ready confirmado.

**INTERACTION / MOTION**: N/A.

**AFFECTED STATES**: Loading, ready, error, timeout.

**SOURCE REFERENCES**: `ViewerOfficeSurface`; `homecloudOfficeViewer.ts`; Product Truth §A5

**EXPECTED IMPACT**: El usuario sabe qué está pasando.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Loading visible. Error honesto con retry.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

---

#### HC-POL-062: Office Viewer — close y retorno

**LOCATION**: `ViewerOfficeSurface` → close

**CURRENT**: Cierra con `onClose()`. No hay transición.

**PROBLEM / OPPORTUNITY**: El cierre abrupto rompe la continuidad.

**PRECISE TARGET**: Cerrar Office con fade <=200 ms y regresar a Files conservando carpeta, query, orden y scroll, sin desmontar/recargar innecesariamente; no bloquear cerrar si error.

**VISUAL GEOMETRY**: 180-200 ms; caller preservation.

**INTERACTION / MOTION**: Trigger: tap en Cerrar / back.

**AFFECTED STATES**: Open, closing, closed.

**SOURCE REFERENCES**: `HomeCloudFileViewerScreen.tsx`; Product Truth §A5

**EXPECTED IMPACT**: Cierre suave con retorno correcto.

**TECHNICAL RISK**: LOW.

**ACCEPTANCE CRITERION**: Fade visible. Retorno al browser correcto.

**DECISION STATUS**: USER_REVIEW_DIRECTION_CONFIRMED · TARGET_REVISED_V2 · IMPLEMENTATION_NOT_AUTHORIZED

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
| 31 | Upload pill appear (overlay, sin reflow) | HC-POL-017 | ANIMATE | 150-180ms | easeOut |
| 32 | Upload pill dismiss | HC-POL-017 | ANIMATE | 100-140ms | easeIn |
| 33 | Undo snackbar | HC-POL-018 | ANIMATE | 200ms | easeOut |
| 34 | Scanner captura → editor página individual | HC-POL-022 | ANIMATE | 120-180ms | easeOut |
| 35 | Página editada → resumen multipágina (sin editores globales) | HC-POL-022 | ANIMATE | 180-200ms | easeOut |
| 36 | Cámara modo transición | HC-POL-043 | ANIMATE | 160-200ms | easeOut |
| 37 | Cámara → review | HC-POL-045 | ANIMATE | 200ms | easeOut |
| 38 | Intake batch: mismo asset en preview y thumbnail | HC-POL-047 | ANIMATE | 180-200ms | easeOut |
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
| Files Root | TitleRow + search + filter | Misma IA; jerarquía visual y controles compactos. Sin funcionalidad nueva. |
| Files Folder | Breadcrumb + search | HC-POL-011 (transición) |
| Memories Root | TitleRow + `+` | KEEP (no change) |
| Memories Selection | `[X] N seleccionados [⋯]` | HC-POL-051: SOLO estos tres componentes; acciones dentro de `⋯`, sin barra fija. |
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

- Menú corto de acciones directas: anclado al trigger si la geometría real lo permite; **no se fuerza un popover en iPhone compacto**.
- Menú largo, fuente ampliada o trabajo multi-step: sheet existente, con el mismo catálogo de acciones y permisos.
- Muchos destinos, edición y flujos con cambios pendientes: sheet / pantalla dedicada.
- En selección de Memories: **solo** `[X] N seleccionados [⋯]`, con acciones dentro de `⋯`.
- Una única autoridad de overlays, sin menús anidados ni presentar otro modal sobre popover activo.

### 4.7 Loading y skeleton states

- Mutuamente excluyentes (LOADING / READY_EMPTY / READY_DATA / ERROR / REFRESHING).
- Skeleton solo mientras se espera primer contenido. Nunca después.
- Estado de carga distinguible de empty y error (HC-POL-008).

### 4.8 Errores y retry

- `ErrorState` + `Reintentar` en todos los superficies.
- Copy honesto, nunca stack trace.
- Los errores no destruyen contenido cargado.

### 4.9 Toasts / Undo

- Undo snackbar conserva el plazo REAL del contrato de recuperación y reglas a11y; no imponer 8 s arbitrarios (HC-POL-018).
- Upload **píldora flotante** colapsada, expandible sin reflow, con progreso confirmado y safe-area (HC-POL-017).

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

- Hit target ≥44×44 pt (o mínimo que exija plataforma), incluso esquinas de perspectiva.
- Safe areas, notch, barras del sistema y teclado no pueden tapar CTA ni upload pill.
- Contraste de texto y controles **medido** contra fondos reales claros/oscuros; no declarar AAA por usar tokens.
- Reduce Motion reemplaza transformaciones espaciales y springs, mantiene funcionalidad y ofrece feedback no animado.
- VoiceOver/TalkBack: orden lógico de foco al abrir/cerrar overlays, lectura de `N seleccionados`, estados upload y resultado de guardado.
- Todos los gestos relevantes tienen alternativa táctil visible y a11y.

---

## 5. Omisiones encontradas en U0 (integradas a la lista)

### A. Elementos inventariados pero no evaluados estéticamente

| Elemento | Omisión | Integrada como |
|----------|---------|----------------|
| Upload Progress Band | No evaluado estéticamente en U0 | HC-POL-017 |
| Undo Snackbar | No evaluado | HC-POL-018 |
| DatePickerSheet | No evaluado estéticamente | HC-POL-056 V2: solo posguardado / escrito según contrato |
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
| Upload Band | "Mount" | HC-POL-017 V2: pill flotante sin reflow |

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

### G. Cambios duplicados o contradictorios — reconciliación V2

- HC-POL-012 y HC-POL-057 **sí duplicaban** conceptualmente apertura/cierre File Viewer. En V2 son **dos IDs de trazabilidad, un solo owner y una implementación**.
- HC-POL-056 contradice el nuevo pedido de fecha simplificada: se **retira del Review de media** y se mantiene solo para edición posguardado o creación escrita cuando corresponda.
- Scanner multipágina no contiene operaciones globales de perspectiva/rotación/recorte; pertenecen al editor de una página.
- HC-POL-017 no se monta como banda que genere reflow; es overlay compacto.
- La cobertura del atlas se informaba 65/65, pero la tabla §6 suma 101 apariciones categorizadas. Ver gate de recuento al final de V2; no afirmar 65 únicas sin deduplicación.

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

**COBERTURA HISTÓRICA REPORTADA**: `65/65` superficies únicas (NO verificado en V2). Las subsecciones del cuadro suman 101 apariciones categorizadas; reconciliar contra atlas 01 antes de reclamar cierre (ATLAS-COV-01, §15).

---

## 7. Registro de Decisiones — Revisión con usuario (12-10-2026)

| Decisión | Dirección de producto | Pendiente estrictamente técnico |
|---|---|---|
| **D1 Menús** | **Acordado**: contextual anclado para lista breve si cabe; sheet para lista larga / compact view / multi-step; origen visual desde `⋯` o `+`. | posicionamiento seguro, overlay ownership, fontScale y safe areas |
| **D2 Viewer** | **Acordado**: expansión origin-aware real desde preview/tile, cierre hacia origen si sigue visible; fade fallback honesto. | medición de bounds, source snapshot, pager/gestures y performance en device |
| **D3 Waveform** | **Acordado**: real o ninguno; audio premium y seek funcional obligatorios. | sampling real y permisos/platform gate sin requerir RECORD_AUDIO invasivo para solo escuchar |
| **D4 Quick Video** | **Acordado como objetivo**: hold-to-record en Foto, soltar → mismo Review; modo Video alternativo. | `expo-camera` instalada y validación en dispositivo |
| **D5 Office XLSX/PPTX** | **Alcance acordado**: carril Office separado; no agregar viewers inline desde polish ni asumir hand-off definitivo. | readiness del carril Office antes de integrar formatos |
| **DC-FECHA (nueva)** | **Cambio explícito solicitado**: media intake sin DatePicker; fecha derivada automáticamente, `unknown` si falta; edición posguardado en Información; `uploaded_at` oculto a usuario. | enmienda formal al Product Truth original y validación metadata por fuente (ver §11) |

**No reabrir decisiones del usuario durante implementación.** Un riesgo o imposibilidad técnica se informa como `FEASIBILITY_BLOCKER` con evidencia y alternativa no degradante; no se cambia Product Truth silenciosamente.

---

## 8. Criterios de Aceptación Finales

### 8.1 Visual

- [ ] Cross-fade visible en cambio de pestaña Archivos ↔ Recuerdos.
- [ ] Viewer abre con escala desde tile y cierra retornando a él.
- [ ] Álbum/Colección abren con slide up y cierran con slide down.
- [ ] Menús contextuales anclados cuando caben; fallback sheet coherente en 360/390/430pt, notch/fontScale 1.3.
- [ ] Types visiblemente más pequeños que Álbumes.
- [ ] Timeline con radio 14pt, gap 8pt, secciones diferenciadas.
- [ ] Resurfacing con tarjetas fotográficas 16:9, peek de siguiente, información jerárquica.
- [ ] Audio Viewer con jerarquía de 4 bloques y play/pause prominente.
- [ ] Cámara con selector centrado y shutter 74pt.
- [ ] Todos los estados (loading, empty, error) son distinguibles entre sí.
- [ ] Reduce Motion reemplaza escalas/desplazamientos por fades mínimos o instantáneos, sin afectar gestos.

### 8.2 Interacción

- [ ] Long press 320ms entra en selección con feedback inmediato (check + háptica).
- [ ] Drag selection continuo sin levantar el dedo, con cambio de dirección determinístico.
- [ ] Double-tap zoom/reset en imágenes con arbitraje correcto vs pager.
- [ ] Double-tap ±10s en video sin conflicto con native controls.
- [ ] Drag seek en audio con progreso provisional y confirmación al soltar.
- [ ] Quick Video: hold en Foto graba video, release pasa a review.
- [ ] Fade de chrome en viewers con tap en media.
- [ ] Auto-scroll durante drag selection con feedback tenue solo cuando se activa.
- [ ] Header de selección de Memories no muestra Álbum/Favoritos/Papelera como barra visible; acciones agrupadas en `⋯`.
- [ ] Scanner multipágina muestra Agregar/Reordenar/Guardar, sin acciones globales de corrección de perspectiva o recorte.
- [ ] Review de media usa EXACTAMENTE el mismo draft/asset capturado o seleccionado.
- [ ] Importación de media no obliga a escoger ni corregir fecha.

### 8.3 Confiabilidad

- [ ] Ninguna fotografía confirmada como guardada aparece negra permanentemente.
- [ ] Videos compatibles se reproducen (no solo poster).
- [ ] Audio permite drag seek real.
- [ ] Selección por arrastre es 100% confiable (sin selecciones aleatorias).
- [ ] Las animaciones no bloquean interacción ni inventan éxitos.
- [ ] Los popovers no se superponen incorrectamente con otros overlays.
- [ ] Upload compacto NO cambia posiciones de la UX ni tapa FAB, barra o teclado.
- [ ] Fecha mostrada en Timeline proviene de metadata soportada/corrección explícita; ningún fallback a uploaded_at.
- [ ] Información del recuerdo no exhibe fecha de subida por defecto; backend conserva uploaded_at cuando el contrato lo requiere.

### 8.4 Cobertura

- [ ] Atlas de superficies únicas reconciliado: cifra histórica 65 vs 101 apariciones de tabla; mapping verificable y KEEP justificado (ATLAS-COV-01).
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

### Total de registros HC-POL en alcance: 62 (HC-POL-012/057 una implementación compartida)

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
- Intake metadata de fecha auto-derivada, corrección posterior y batch: HC-POL-046, 047, 056 (**cambio de contrato en V2**).
- Popovers anclados: HC-POL-004, 005, 006, 007
- Favoritos household-shared: HC-POL-053, 054

### Nuevas oportunidades de pulido descubiertas

- Cross-fade en tab switch: HC-POL-001
- Escala desde tile en viewers: HC-POL-012, 057
- Chromes toggle en viewers: HC-POL-033, 058
- Feedback de selección con escala: HC-POL-014
- Auto-scroll visual indicator: HC-POL-015
- Chip de modo Favoritos: HC-POL-016
- Píldora flotante de progreso, sin layout shift: HC-POL-017
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
- DatePicker simplificado y REUBICADO a edición posguardado / creación escrita: HC-POL-056
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

### Decisiones de producto revisadas / gates técnicos

- D1: **resuelta** — menú anclado corto cuando quepa; sheet para largo/multi-step y vistas compactas.
- D2: **dirección aprobada, ejecución condicionada** — escala verdadera desde bounds/preview real; fade seguro si es inviable.
- D3: **dirección aprobada, feasibility pendiente** — solo waveform real; sin fake ni permiso adicional sin evaluar.
- D4: **dirección aprobada, feasibility pendiente** — Quick Video únicamente si se confirma en device.
- D5: **alcance separado** — Office adicional se integra desde su carril; el hand-off actual no es renuncia definitiva.
- DC-FECHA: **cambio solicitado** — retirar editor de fecha de importaciones de media y ocultar fecha de subida en Información. Pendiente propagación formal a Product Truth.

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

**Fin del inventario base y cierre de revisión V2; continúan anexos de diseño en §11–16.**

> **Próximo paso V2**: verificar en repo el Product Truth original y anexar/enmendar el contrato de fecha; reconciliar conteo atlas 65/101 sin reauditoría general; realizar preflight de código y definir orden seguro de implementación. NO iniciar código sobre este archivo a ciegas.

---

## 11. Enmienda de producto — Fecha semántica (USER REQUEST, contrato original aún vigente en repo)

**Motivo**: reducir fricción del upload; la fecha que importa al usuario es la del hecho/recuerdo que alimenta Timeline, no la de incorporación al sistema.

**Reemplazo del comportamiento anterior (a promover formalmente al Product Truth antes de implementar)**:

1. **Galería y cámara — foto/video**: obtener la fecha semántica de metadatos explícitamente admitidos para **cada asset** y de instante real de captura propia cuando corresponda. Si no existe fuente soportada y parseable: `capture_precision=unknown`, `captured_at=null`/representación actual equivalente. Jamás inferir de `uploaded_at`, `created_at`, mtime no autorizado, nombre, fecha del picker, selección, ni `Date.now()` al importar.
2. **Importar/grabar audio**: mismo principio según metadata fuente y autoridad real de captura; si no hay fecha confiable según reglas explícitas del código, `unknown`. No pedir fecha en el Review de medios.
3. **Review individual y batch**: preview **del mismo asset/draft** escogido o capturado, con identidad estable. Eliminar DatePicker/precisión del flujo obligatorio; lote conserva fechas independientes (nunca aplicar fecha del primer asset a todos).
4. **Editar fecha**: desde Información de un recuerdo **ya guardado**, con `homecloud.organize`, usar el editor de precisión EXISTENTE (`exact`, `month_year`, `year`, `unknown`), compacto y sin invención de día. Tras cambio, refrescar la posición temporal de Timeline de forma coherente; no alterar bytes del original. Read-only para miembros sin permiso.
5. **Recuerdos escritos**: al carecer de EXIF, conservar fecha semántica explícita **opcional** en su creación si el Product Truth de escrito así lo requiere. No obligar a seleccionar una fecha inventada. La implementación debe reconciliar el caso concreto con el documento autoritativo.
6. **Ficha Información**: mostrar `Fecha del recuerdo` (precisión y valor si existen) y capacidad `Editar` cuando corresponda. **NO mostrar `Fecha de subida` al usuario**. `uploaded_at` sigue persistido/usable internamente para auditoría/orden operativo y no se borra de backend ni de storage.
7. **Resurfacing**: EXACT-ONLY conserva su criterio; las fechas parciales/unknown no se fuerzan a exactas para hacerlas elegibles. Las correcciones de fecha del usuario son explícitas, auditables según contrato vigente.
8. **No cambios** a RLS, households, permissions, TUS/upload pipeline, identidad de contenido, inmutabilidad de originales ni backend metadatos salvo adaptación mínima necesaria ya aprobada.

**CONFLICTO DOCUMENTAL EXPLÍCITO**: la versión anterior del Product Truth exigía `MemorySemanticDateFields`/`DatePickerSheet` editables durante el binary Review. Esta decisión del usuario del 12-10-2026 **sustituye esa UX para media**. No se declara Product Truth actualizado ni se elimina ese componente antes de revisar otras referencias. Codex debe proponer un diff mínimo del contrato congelado y del código dependiente para aprobación/trace antes de implementarlo. `HC-POL-046,047,056` y cualquier mención a intake date editable en la lista original deben leerse con este reemplazo.

**Gates**: metadata válida, metadata ausente, fecha parcial, batch heterogéneo, cámara propia, audio, fecha corregida posguardado, usuario sin `organize`, cambio de hogar, resurfacing exact-only, original intacto, ningún `uploaded_at` visible en UI.

## 12. IA final por superficie — jerarquía de pantallas y overlays

No se inventa navegación nueva. La lista indica **disposición y ownership de UI** para los casos principales del atlas.

| Pantalla / surface | Composición V2 | Acciones / navegación | Contexto que debe persistir |
|---|---|---|---|
| HomeCloud Global | título + Archivos/Recuerdos (segment) + contenido activo | tab switch 150 ms | scroll, query y estado del pane previo |
| Files Root | título/Agregar, búsqueda, filtros/orden, lista o grid y folders según vista actual | carpeta, archivo, subir, crear, scanner | folder root, sort, query, focus |
| Files Folder | breadcrumb, búsqueda contextuada, hijos, acciones por item | Enter/Back; selección | folder ID y scroll anterior |
| Files Search/Filter | field con resultados y chips de filtros activos | clear filtro, open item | query, resultados y posición |
| Files Selection | `[X] N seleccionados [⋯]` + grid sin desplazamiento | acciones válidas/contextuales | carpeta/query, identidad IDs, selección |
| File Action Menu | menú corto desde tile cuando cabe, sheet si largo | abrir, info, favorito, mover, trash, etc. permitidos | anchor y fileId |
| Files Info | nombre/tipo, ubicación/metadatos, edición de campos realmente editables | editor según permiso | archivo de origen |
| Files Move | destinos reales del backend (profundidad solo si existe) | elegir/confirmar | folder origen y selección |
| Files Upload | pill overlay compacta; expandido a jobs y recuperaciones | tap expande, cancelar/retry reales | toda la UI sin reflow |
| Scanner Capture | cámara/scanner dedicada, controles captura/retomar | tras captura abrir **editor UNA página** | draft del documento |
| Scanner Editor UNA página | imagen actual, cuadrilátero de 4 puntos, perspectiva, rotar, recortar, confirmar | aplicar/repetir/volver | pageId / asset de esa página |
| Scanner Review MULTIPÁGINA | miniaturas con orden, `Agregar página`, `Reordenar`, `Guardar PDF` | tocar miniatura abre editor de esa página | orden de páginas, draft, corrección de cada una |
| Files Trash | lista existente + restore/purge con confirmación protegida | operaciones permitidas | estado/scroll |
| File Viewer (imagen/video/audio/PDF/texto/Office) | controles relativos al formato, contenido legible y errores honesto | cierre al caller exacto | folder, query, sort y scroll |
| Memories Root | Header + `+`, Para volver a ver, Álbumes, Tipos, Timeline | `+`, grupo, álbum, tipo, recuerdo, selección | scroll y filtros internos existentes |
| Resurfacing Group | cabecera fotográfica/ tipográfica real, fecha exacta, grid | Viewer y Back | grupo y scroll |
| Album Detail / Type | título/Back, grid y menú `⋯` según permisos | selección, Viewer, acciones | albumId/type, scroll |
| Favorites dataset | colección especial del hogar | Viewer/selección y toggle según permiso | caller y contenido |
| Memory Selection | **solo `[X] N seleccionados [⋯]`** sobre grid estable | `⋯` contiene todas las acciones válidas | dataset/caller y scroll; drag continuo |
| Memory Viewer foto/video/audio/escrito | surface inmersiva y controles propios; sin tab ni navbar global | gestures naturales y `⋯` | item exacto, source, scroll y pager |
| Memory Create `+` | menú 5 acciones originales | picker/cámara/audio/texto | caller, permisos, draft |
| Memory Camera | Foto/Video, shutter centrado, quick video si viable | captura → Review del **mismo asset** | draft/URI/assetId |
| Media Review individual | preview del draft real dominante, álbum/descripción opcionales, guardar | **sin selector de fecha** | mismo assetId, sin cambio por teclado/modal |
| Media Review batch | preview activo 1:1 con thumbnail y draftId, contador, navegación, destinos/descr. | una acción de guardar lógico, partial/retry | metadatos de cada asset; sin fecha global |
| Escribir recuerdo | formulario específico y fecha opcional si requerida | crear texto | redacción y permisos |
| Memory Info | fecha semántica + precisión, edición si `organize`, resto metadata útil | edición POSGUARDADO; **sin fecha de subida visible** | mismo memoryId/caller |
| Memory Trash | acceso descubrible + elementos con confirmación segura | Restore/Purge según permiso | source, scroll, conteos |
| Estados vacíos/error/loading | mensajes contextuales por surface, mismos tokens visuales | CTA SOLO autorizada; recovery honesta | contenido existente no desaparece |

**Screen shell rule**: mientras el usuario opera Cámara, Scanner, Media Review o Viewer dedicado, NO se añade por el prototipo una navbar global ni un selector tabs invasivo si la ruta real los oculta. Validar contra CURRENT antes de modificar shell.

## 13. Microinteracciones premium — última revisión de precisión

**Referencia de criterio, no afiliación**: Apple's Human Interface Guidelines **Motion, Context menus, Popovers, Accessibility**. La calidad es el gesto/feedback consistente y casi invisible; no “añadir animaciones a todo”. Solo se anima lo que informa causa, estado o continuidad. HIG recomienda menús breves y evitar popovers grandes en compact view (https://developer.apple.com/design/human-interface-guidelines/context-menus/ ; https://developer.apple.com/design/human-interface-guidelines/popovers/ ; https://developer.apple.com/design/human-interface-guidelines/motion/ ).

| Trigger → resultado | Animación propuesta | Ownership / no romper | Reduce Motion / QA |
|---|---|---|---|
| Tap `⋯` → menú | El menú **nace visualmente del anchor**: opacity 0→1, scale 0.97→1, translateY/X máximo 2-4 pt, ~140-180 ms ease-out; pivot apropiado al botón | solo overlay owner; sin mover tile ni root | sin scale/translate, fade <=80 ms o instantáneo; 360pt/notch/fontScale |
| Tap fuera → cierre menú | opacity 1→0, scale 1→0.99 solo si permitido, 100-140 ms | dispara salida sin tap fantasma en contenido debajo | instantáneo |
| Tap `+` Memories → 5 acciones | mismos 140-180 ms y anchor al `+`; primera fila sin salto ni cambios de altura | source sheet dismissal ordenado antes de nuevo modal | QA galería→review (native dismiss) |
| Long press tile → selección | haptic 1× al armar, check 0.85→1 100-140 ms | 320 ms disparador; no mover scroll | check instantáneo; haptic según capacidad |
| Barrido de selección | check/overlay cambian con dedo, sin cascadas/staggers | motor D4 y hit-testing correctos; preservar caller | sin efectos; 100+ items |
| Selección header | crossfade 150 ms, sin variación altura | header contiene **solo X/N/⋯** | instantáneo; sin jump |
| Favorite on/off | estrella 1→1.15→1 en 140-180 ms y haptic una vez | rollback visible si fallo servidor | cambio instantáneo |
| Archivos↔Recuerdos | panes fade 150 ms, indicador segment acompaña | pane oculto sin interacción, estado conservado | instantáneo o fade mínimo |
| Folder enter/back | tras contenido preparado, slide direccional 180-220 ms, breadcrumb fade 120 ms | back interrumpible; evitar blanco | fade / instantáneo |
| Álbum/Tipo open/close | slide vertical 240-260 ms / 180-220 ms, opacity leve | root y scroll retenidos | fade |
| Resurfacing card→group | header usa **misma portada**; fade de cubierta y desplazamiento de contenido moderado 240-260 ms | no cambia exact-only ni dataset | fade |
| Tile→Viewer | snapshot exacto desde bounds medidos, corner radius acompaña y chrome fade luego | visual only; media original independiente; offscreen fallback | fade sin scale |
| Viewer chrome toggle | opacity 150 ms, sin reflow | no interceptar pinch, doble tap ni video controls | instantáneo |
| Audio play/pause | ícono conmuta 100-120 ms, sin mover tarjeta | status real, no icono de playing cuando buffering/error | instantáneo |
| Audio drag seek | thumb y tiempo acompañan dedo; no animación artificial al soltar | commit real, rollback/error honesto | directo |
| Audio speed picker | menú compacto ~140-180 ms nacido del control | opción 1x actual persistida según contrato | fade |
| Video seek ±10 s | confirmación ±10 s 350-500 ms si gesto real | no dobles seeks ni pager accidental | icono persistente breve sin desplazamiento |
| Tab/Filter chip on | fade <=150 ms, sin introducir saltos del grid en gesto | filtro state correcto | instantáneo |
| Upload new job | pill desde opacidad 0 y translateY <=6 pt en 150-180 ms | overlay ABSOLUTE, no reflow, no tap targets tapados | instantáneo |
| Pill expand | contenedor crece hacia dirección con espacio libre ~180 ms, contenido aparece a medida que existe | no confundir job agregado con ACTIVE | instantáneo |
| Upload job complete | pequeño check/color neutro **solo** tras confirmación real, luego se minimiza/retira según contrato | partial failures permanecen visibles | sin celebración falsa |
| Snackbar Undo | entrada desde borde cercano 160-200 ms, no barra decorativa grande | expiración gobernada por Undo REAL | fade/instantáneo |
| Scanner capture → editor página | thumbnail/preview del MISMO pageId aparece con opacity ~150 ms; no flash blanco | crop/perspective por página, originales seguros | instantáneo |
| Perspective corner drag | cuadrilátero sigue dedo 1:1, loupe opcional **solo si ayuda**; sin smoothing que desplace hit | bounds/clamp, magnificación y accesibilidad | sin animación (movimiento directo) |
| Page apply → multipage | miniatura corregida aparece en su posición exacta, fade 120-160 ms | no modifica otras páginas | instantáneo |
| Multipage reorder | objeto sigue dedo, destino se abre con desplazamiento mínimo | orden estable, no pierde previews ni page IDs | feedback no desplazante |
| Camera Foto/Video | selector 160-200 ms; shutter permanece centrado | evitar remount/sesión de cámara incorrectos | instantáneo |
| Camera capture → Review | preview mismo draftId/URI con fade 180-200 ms | evitar preview de otra foto | instantáneo |
| Review batch next/prev | horizontal desplazamiento corto 180-200 ms con índice/preview/thumb atómicos | metadata por asset, no desincronización | instantáneo |
| Guardar Review | spinner/label `Guardando…` tras submit real, cierre fade 180-200 ms **solo** al confirmar ACTIVE | partial failure itemizado, retry | no animación de éxito falso |
| Error/retry | crossfade de estado <=150 ms cuando hay datos válidos, no desmontarlos | honestidad de errores | instantáneo |
| Office ready | fade 180-200 ms únicamente cuando readiness real de bridge confirmado | no sustituir failure con loader infinito | instantáneo |

**Prohibidos:** shimmer infinito, blur pesado, scale global del shell, confetti, auto-scroll para volver al tile, animaciones encadenadas de cada ítem, filas que se mueven mientras el dedo selecciona, jump entre cargas, falsos estados de éxito.

## 14. Consistencia de pantallas, permisos y estados — revisión dirigida

| Contexto | Casos obligatorios | Invariante / criterio de éxito |
|---|---|---|
| HomeCloud global | cambiar tabs durante carga/overlay | caller correcto, pane inactivo no toca nada; sin duplicar modales |
| Files: root, carpeta, search | normal/empty/loading/error/refreshing, query + filtro favoritos | nunca confundir filtro con datos perdidos; conservar datos disponibles |
| Files: selection | 1/N, cancelar, favoritos/move/trash; roles de solo lectura | `⋯` o sheet presenta SOLO acciones permitidas; operaciones bulk protegidas |
| Files: upload | 1/N queued/uploading/finalizing/cancelled/failed/ACTIVE, teclado, FAB, HomeCloud→otro módulo | pill visible sin reflow/tap collision; cancel/retry compatibles con job real |
| Files: scanner | captura, edición por página, página sin detectar bordes, rotar/crop, multipágina reorder/add/save | solo la página elegida cambia; no operaciones globales accidentalmente aplicadas a todas |
| Files: viewers | image/video/audio/PDF/Office/unknown, protected, corrupt, unloaded | contenido/estado veraz, close al folder/query/scroll original |
| Memories: root | exact-only resurfacing, Álbumes, 4 tipos, Timeline, empty/error | no efemérides inferidas; datasets compartidos coherentes |
| Memories: selección | root/álbum/tipo/resurfacing/favs, 1/N y drag 100+ | `[X] N [⋯]` únicamente, acciones en menú según contexto/permiso; no salto de origen |
| Memories: viewer | foto/video/audio/nota, no-preview, tile offscreen, zoom/pager/controls | abre asset exacto; no saltar página; chrome sin secuestrar gesto |
| Memories: create/review | galería individual, mixed batch, cámara, audio import/record, escrito | preview/draftId y metadatos sincronizados; no timestamp falso |
| Memories: dates | metadata exacta/parcial/none, post-save edit, no organize | Timeline usa fecha semántica; editor solo si permitido; no mostrar upload date |
| Memories: favorite | compartido por hogar, toggle N, papelera/restore | un solo favorite canon y permisos; rollback honesto |
| Memories: trash | view/trash/restore/purge; confirm irreversibles | `homecloud.delete` gobierna purge; sin pérdida de álbum por borrar entrada equivocada |
| Compartido | fontScale 1.0/1.3, 360/390/430 pt, notch, iPhone/Android, Reduce Motion, VoiceOver/TalkBack | hit >=44 pt, contraste validado, foco correcto, no overlay cortado |

**Capability gate**: `homecloud.view` para lectura; `homecloud.contribute` para crear/importar/trash donde lo define el contrato; `homecloud.organize` para metadata/favoritos/organización; `homecloud.delete` para purge. La UI únicamente refleja estas capacidades, el backend siempre vuelve a validar household/RLS y permisos. Verificar granularidad exacta por endpoint en Product Truth/código antes de implementación. Nunca inferir permiso por presencia de botón.

**Open runtime gaps que ningún polish puede marcar como PASS estático**: fotos negras o previews permanentemente ausentes, video compatible iPhone, drag seek audio, drag selección 100+, guardado/partial batch, gesto zoom-pager, Quick Video, waveform real. Deben figurar en Device QA con outcome medido.

## 15. Auditoría de cobertura: corrección aritmética del atlas

El candidato V1 declara `65/65` superficies del U0 pero el propio cuadro §6 enumera **101 apariciones** al sumar 17 subtítulos con conteos `(n/n)`. Algunas son referencias cruzadas de la misma screen/surface (p. ej. viewers, Favorites, shared). **101 apariciones no implica 101 superficies únicas**, así como la cifra 65 no está demostrada por el cuadro en este archivo. No afirmar 65/65 ni 101 únicas hasta reconciliar las claves del documento `01_UNIFIED_CURRENT_SCREEN_ATLAS.md`.

**Gate ATLAS-COV-01: RESUELTO.** El registro autoritativo de reconciliación demuestra **65 superficies únicas**, distingue las **101 apariciones** de cobertura y mantiene la unión exacta `HC-POL-001..062`; ver `docs/homecloud/HOMECLOUD_U0_ATLAS_COVERAGE_RECONCILIATION.md`. Las repeticiones son referencias cruzadas legítimas y no crean pantallas nuevas.

## 16. Handoff para implementar sin fases artificiales

**Gate antes de código** (único preflight dirigido): confirmar rama/worktree/HEAD/dirty; leer esta V2, Product Truth originales y U0/HC2-C audit existentes; promover al contrato la enmienda explícita §11; resolver ATLAS-COV-01. **No tocar código ni DB durante documentación.** No reabrir investigación donors o rediseño de sistema.

**Orden de dependencias reales (no cronograma artificial)**:

1. **Contratos + estado**: fecha semántica y upload reviews (§11), permisos/overlay ownership, source identity/draftId y conservación de caller. QA automática del contrato primero.
2. **Sistema compartido**: motion/reducedMotion (002/003), menú contextual adaptativo (004–007/010), upload pill sin reflow (017), contrastes/estados.
3. **Files**: jerarquía visual, File Viewer owner único 012=057, selección, browser, scanner página individual→multipágina, PDF y Office overlays; regression de operaciones existentes.
4. **Memories Root/IA**: composición, resurfacing exact-only, Álbumes, Tipos, Timeline, selección `[X] N [⋯]`, Favorites y Trash.
5. **Memories Viewer y media**: origin-aware, chrome, gestos, audio seek, video real, waveform solo si viable, cámara/Quick Video y review con preview exacta.
6. **QA físico end-to-end**: por riesgo y surfaces afectadas; no marcar PASS si queda bloqueo iPhone/Expo Go/gestos.

Dividir en cambios pequeños, coherentes y reversibles por **dependencia comprobada**, no imponer fases de diseño arbitrarias ni paralelizar modificaciones del mismo UI host. En cada implementación: preflight, diffs solo autorizados, typecheck/tests pertinentes, QA visual y dispositivo, status PASS/DEVICE_PENDING/BLOCKED y rollback de archivos concretos. No commits/push en el trabajo documental.

**CRITERIO DE FREEZE**: el target visual y de interacción del V2 queda especificado; sigue siendo **FREEZE CANDIDATE** hasta aprobación final del documento y resolución de cambios contractuales/documentales mínimos. La ejecución real y el cierre del producto requieren QA de dispositivo posterior.
