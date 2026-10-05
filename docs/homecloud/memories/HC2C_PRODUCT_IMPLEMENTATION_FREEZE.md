# HC2-C PRODUCT + IMPLEMENTATION FREEZE

```
STATUS: HC2C_FROZEN_FOR_IMPLEMENTATION
AUTHORITY: THIS DOCUMENT
SOURCE: HC2-C TOTAL CURRENT AUDIT
IMPLEMENTATION: NOT STARTED BY THIS AUDIT
```

> Regla de lectura: este documento separa **PRODUCTO** (lo que el usuario vive) de
> **IMPLEMENTACIÓN** (cómo CURRENT lo logra). Ninguna limitación técnica de
> CURRENT cambió una verdad de producto: cuando una capacidad no es segura, está
> marcada `DEFER` explícitamente.

---

## 1. Scope

HC2-C cierra el consumo y la organización de Memories en HomeCloud:

- corrección de la apertura del Viewer (el item abierto es siempre el item pedido);
- una sola arquitectura de información en la raíz de Memories;
- selección como estado contextual, no como navegación;
- pulido de Álbumes (CTA descubrible, sin chrome destructivo permanente);
- corrección del Viewer por fuente;
- completitud del Viewer (capacidades `IN` de §16-§19);
- acciones de Viewer y Selección sobre una gramática compartida;
- acotación de caché, carga y flicker.

El resultado cierra HC2.

---

## 2. Explicit Out of Scope

- Favoritos, búsqueda, resurfacing, papelera / restaurar / purgar, ocultos.
- Rediseño de cámara, ingesta masiva.
- Cualquier cambio en Files.
- Homi / IA.
- Arquitectura backend de ciclo de vida, modelo de storage nuevo, transcodificación.
- Migraciones de base de datos.
- Dependencias nuevas.
- Rediseño visual del producto: se preservan design system, paletas, tipografía, Timeline, D4, contratos de álbum, ciclo de vida de media y shell de navegación.

---

## 3. Final Memories Root

**Decisión de producto.** La raíz de Memories es UN scroll vertical con tres
secciones, en este orden:

```
MemoriesRoot
 ├─ 1. ÁLBUMES        (section header "Álbumes"  +  "+ Nuevo")
 │      riel horizontal de portadas
 ├─ 2. TIPOS          (section header "Tipos")
 │      riel horizontal: Fotos · Videos · Audios · Notas
 └─ 3. TIMELINE       SectionList agrupado por tiempo/fecha (año → mes)
```

- **El selector global `Archivos | Recuerdos` de HomeCloud SE MANTIENE.** No se toca.
- **La navegación interna `Recuerdos | Colecciones` SE ELIMINA por completo**:
  el `SegmentedControl` del header de selección, el tipo
  `MemorySelectionSourceTab`, `switchTab`, el estado
  `MEMORY_SELECTION_SOURCE_COLLECTIONS_ROOT`, el `ScrollView` `collectionsRoot`
  con su título/back/ref/offset, y el swap de cuerpo que lo mostraba.
- Albums y Tipos viven directamente en la raíz. Tipos NO se duplica debajo de
  ninguna capa de navegación.

**Decisión de implementación.**
- El `ListHeaderComponent` de la SectionList pasa a ser un header compuesto
  (sección Álbumes + sección Tipos) y se renderiza **siempre**, idéntico en modo
  normal y en modo selección.
- La colección activa pasa a ser **estado de pantalla independiente**
  (`activeCollectionId`), no un sub-modo de la sesión de selección. Se reutiliza
  el `collectionsController` que ya existe; no se crea otro.
- Abrir un álbum o una colección automática es un **overlay anidado** sobre la
  raíz, igual que hoy lo es el detalle de álbum. Sin rutas nuevas, sin cambios en
  `navigation/types.ts`.
- **Orden obligatorio de implementación:** crear la fila de Tipos **antes** de
  borrar `collectionsRoot`. Hoy `openCollection` sólo se llama desde
  `collectionsRoot`; si se borra primero, las colecciones quedan inalcanzables.
- No se fuerzan componentes nuevos: si el header compuesto cabe en
  `HomeCloudMemoriesScreen.tsx` + `AlbumsRail.tsx` + `MemoryCollectionTile.tsx`,
  se queda ahí. Reutilizar `AlbumTile`/`MemoryCollectionAlbumTile`: si la
  sección Tipos muestra álbumes, reutiliza `AlbumTile` y borra el duplicado.

---

## 4. Albums Final UX

- Sección con header `Álbumes` y acción `+ Nuevo` **siempre visible**, independiente
  de la posición del scroll horizontal.
- Estados mutuamente excluyentes (§23): `LOADING` (skeleton sólo mientras se
  espera contenido real), `READY_EMPTY`, `READY_DATA`, `ERROR` (con reintento),
  `REFRESHING` (conservando los datos visibles).
- Con cero álbumes: estado vacío honesto con CTA de creación, del tipo
  "explicación + acción". Se permite un patrón de galería preestablecida
  **en espíritu**, no copiando las visuales de otro módulo.
- El detalle de álbum sigue siendo overlay anidado. Sin cambios.
- Contratos de dominio **intactos**: álbum compartido por household; Memory↔Album
  N:M; borrar álbum NO borra Memories; cover = visual activo más antiguo en
  orden canónico de álbum; `itemCount` = total de Memories activos verbatim;
  orden de álbum más antiguo → más nuevo.

---

## 5. Types Final UX

- Las cuatro colecciones automáticas (`Fotos`, `Videos`, `Audios`, `Notas`) se
  mantienen tal cual:/HomeCloud-generated, filtro por `kind`, orden Timeline.
- Viven en la raíz, en su propia sección `Tipos`, en un riel horizontal.
- Sin conteo (el read model entrega páginas, no totales; un número sería
  inventado).
- Tocar una abre el mismo overlay anidado que un álbum, con su propia fuente de
  Viewer.
- Colección vacía: estado vacío honesto y distinto de "cargando".

---

## 6. Timeline Final UX

- Sin cambios de agrupación, orden, títulos ni paginación. Es la superficie que
  ya funciona.
- Se preserva el `SectionList` con `stickySectionHeadersEnabled={false}`,
  `onEndReachedThreshold` 0.6 y el footer "Mostrar más recuerdos".
- Se preserva D4 (drag selection contigua).
- Se preserva el offset de scroll por fuente.
- **Corrección de dependencia:** el rail de álbumes deja de depender de
  `loading` de la Timeline para su propio estado de carga; durante la primera
  carga de la Timeline la sección Álbumes renderiza su propio `LOADING`, no
  desaparece y no aparece después con skeleton.

---

## 7. Memory Create CTA

**Decisión de producto.** El `+` de crear recuerdo se mantiene muy descubrible,
pero **sin el contenedor circular**:

- desaparece el tratamiento de botón circular alrededor del `+`;
- el `+` se mantiene como acción limpia, con el color de marca existente;
- **hit area invisible ≥ 44×44** (`touchTargets.normal = 44`, `theme.ts:569-574`);
  si se necesita más área, se agranda el `hitSlop`/contenedor **transparente**,
  nunca un disco visible;
- se preserva `accessibilityLabel="Crear recuerdo"` y la semántica de
  `disabled` cuando `capabilities.contribute` es falso.

**Decisión de implementación.** El disparador vive en
`MemoryIntake.tsx:638-646` como `AppButton variant="icon"`. `AppButton` con
`variant="icon"` **siempre** pinta `borderRadius: radius.full` +
`backgroundColor: surface.soft` + borde (`AppButton.tsx:91,120-124`), y aplica
`pressScale`. Para quitar el círculo sin tocar `AppButton` global (afecta a toda
la app), se sustituye el disparador por un `InteractivePressable` **sin fondo,
sin borde y sin radio**, con `minWidth/minHeight = 44`, `accessibilityRole="button"`
y el mismo `accessibilityLabel`. Se conserva el haptic existente.

---

## 8. Album Create CTA

**Decisión de producto.** La creación de álbum no depende de un tile al final de
un riel horizontal.

- Header de sección: `Álbumes` … `+ Nuevo`.
- El CTA es **independiente de la posición del scroll del riel**.
- Con cero álbumes, el estado vacío ofrece además su propia acción de creación.
- Sólo se renderiza si `capabilities.organize`.

**Decisión de implementación.** `AlbumsRail.Header` (`AlbumsRail.tsx:127-143`)
pasa a renderizar `AppButton size="sm" title="Nuevo"` (o `+ Nuevo`) a la derecha
del título, conservando `accessibilityLabel`. Se elimina el `+` icono suelto del
header. No hay que añadir un tile al riel.

---

## 9. Refresh / Retry Semantics

**Decisión de producto.**

- **El botón visible de Refresh SE QUITA**, condicionado a que pull-to-refresh
  esté verificado en QA física (§28). Si la verificación falla, el botón se
  conserva y se documenta.
- **El error mantiene siempre un reintento explícito.** Quitar el botón de
  refresh de rutina **no** quita ninguna capacidad de recuperación.
- Pull-to-refresh sigue montado salvo durante una sesión de selección
  (`solveMemoryRefreshGate`, sin cambios).

**Decisión de implementación.** Quitar el `AppButton` de refresh de `titleRow`
(`HomeCloudMemoriesScreen.tsx:1596-1598`). `refresh()` y `handleGridRefresh`
**permanecen** porque son el mismo camino que usa la reconciliación y la
finalización de ingesta. `ErrorState` + `Reintentar` se conservan en todas las
superficies.

**Semánticas a congelar (deuda de Run A, sin cambio de comportamiento visible):**
hoy `refresh()` preserva el contenido y `loadFirstPage()` lo vacía con skeleton
(`:1653`, `:275-293`), y `useFocusEffect` usa `loadFirstPage()`. La corrección
mínima es que la relectura de página 0 con datos ya cargados no vuelva a renderizar
el skeleton. No se rediseña el pipeline de datos.

---

## 10. Selection Mode Final Contract

**Decisión de producto.**

- La entrada por long press se mantiene. Es buena y funciona.
- La selección es **estado contextual dentro de la superficie actual**. No es un
  destino de navegación.
- Al comenzar la selección:
  - el grid/lista **no cambia de sitio**;
  - el offset de scroll **se preserva**;
  - la arquitectura de información de la raíz **no cambia**;
  - el contexto de álbum **se preserva**;
  - el contexto de colección **se preserva**;
  - **no aparece ninguna navegación `Recuerdos | Colecciones`**;
  - el conteo de seleccionados es visible;
  - cancelar es visible;
  - **las acciones contextuales son visibles inmediatamente**.
- **No hay paso `✓` obligatorio** sólo para revelar acciones. La selección ya es
  estado. El `✓` se elimina como revelador de acciones.

**Permitido en el modo selección:** overlays de seleccionado/checks, conteo,
cancelar, acciones contextuales, chrome superior/inferior específico de
selección.

**Prohibido en el modo selección:** cambiar de pantalla raíz, cambiar la fuente
automáticamente, revelar un segmented control no relacionado, mover al usuario a
Colecciones, resetear el scroll sin necesidad.

**Decisión de implementación.**
- Eliminar de `MemorySelectionHeader.tsx`: `MemorySelectionSourceTab`, la prop
  `tab`, `onTabChange` y el `SegmentedControl` (líneas 42, 80, 82, 93-111).
- Eliminar `switchTab` (`HomeCloudMemoriesScreen.tsx:901-914`).
- Sacar `source` de `MemorySelectionState`
  (`homecloudMemorySelection.ts:104-110, 294-304`): la sesión queda
  `{ mode, purpose, selectedIds, excludedIds }`. `cancelMemorySelection` deja de
  recibir un `source`.
- `ListHeaderComponent` deja de ramificar (`:1450-1466`).
- `sourceKey` (`:664-668`) pasa a depender sólo de la colección activa.
- Se preserva **todo** D4: `homecloudMemoryDrag.ts`, `MemorySelectableCard`,
  `MEMORY_DRAG_TAKEOVER_SLOP`, `armMemoryDrag`/`beginMemoryDrag`/
  `stepMemoryDrag`/`applyMemoryVisualRange`, el registro de filas, el
  auto-scroll de borde, `solveMemoryRefreshGate` y `createMemoryExitGestureLock`
  **intactos**.
- Se preservan las 4 entradas productivas actuales (A/B/C/D) y `runAlbumMemberships`
  como único compositor de membresías, con su falla parcial honesta y su retry.

---

## 11. Contextual Actions Contract

**Una sola gramática de acciones contextuales**, compartida conceptualmente por
Selección y por el menú de un Memory en el Viewer.

| Superficie | Acciones en HC2-C |
| --- | --- |
| Raíz (Library) | `Agregar a álbum` · `Compartir` |
| Álbum | `Quitar del álbum` · `Agregar a otro álbum` (cuando `organize`) · `Compartir` |
| Colección automática | `Agregar a álbum` · `Compartir` |
| Failure band | `Reintentar los que fallaron` (se conserva) |

- **"Compartir" en selección múltiple se marca `DEFER`**: la costura OS SHARE
  existente (`homecloudDownloadService`) comparte **un** archivo. Compartir N
  binarios exigiría N descargas, N archivos temporales y una decisión de UX
  (secuencial o no). No se congela sin esa decisión. En selección múltiple sólo
  se exponen las acciones de organización.
- `Mover a papelera` **queda reservada en la arquitectura** (un tipo de acción
  adicional en la autoridad, no renderizado) y **no se implementa** en HC2-C.

**Decisión de implementación.**
- **Host de acciones: `ActionSheet` con `size="content"`, el mismo componente y
  el mismo precedente que ya usa esta pantalla** (`HomeCloudMemoriesScreen.tsx:1762-1798`).
  No se crea un `SelectionBar` nuevo ni una barra inferior nueva (§59: no
  inventar un lenguaje visual).
- El header de selección queda `[X] N seleccionados [Acciones ⋯]`. El botón
  `⋯` abre la hoja de acciones contextual **ya al entrar** en selección: las
  acciones son visibles desde el primer fotograma.
- La selección de destino (`Agregar a un álbum`) **reemplaza el contenido de la
  misma hoja**; nunca se apila una segunda.
- El picker de destino se construye con `rail.albums` (ya cargados), sin segunda
  lectura y sin "crear álbum desde aquí".
- `runMemoryAlbumMutation`, `toMemorySelectionFailure`, `memoryMutationFailureSummary`,
  `albumRemoveSelectionLabel` y la validación de destino contra
  `fetchHomeCloudAlbums` (autoritativa) **se conservan sin cambios**.
- En la raíz y en las colecciones automáticas el destino se elige en la propia
  hoja de acciones. En un álbum el destino de `Quitar del álbum` es el álbum
  abierto y ya se conoce, por lo que esa acción no pide destino.

---

## 12. Album Membership Contract

- Un Memory dentro de un álbum se ve **normalmente**.
- **No hay overlay X permanente.** Ninguna tarjeta de ningún tipo muestra una
  acción de quitar.
- Para quitar uno o varios: entrar en selección → acción contextual →
  `Quitar del álbum`.
- Semántica: **se elimina la membresía Memory↔Album. El Memory sobrevive.** Sin
  papelera, sin borrado binario, sin transición de ciclo de vida.
- Copy congelado: `Quitar 1 del álbum` / `Quitar N del álbum`
  (`homecloudAlbumScope.ts:101-103`). Prohibido `Eliminar` / `Borrar` /
  `Papelera` / `Quitar de HomeCloud`.
- El Viewer puede exponer la misma acción para un solo Memory (Run B, C6).
- **Corrección de la furry Square:** el leave-out de `albumScopeAction` elimina el
  envoltorio `styles.albumScope` (`MemoryCards.tsx:311-317`) que pintaba el
  cuadrado blanco detrás del botón circular. No hace falta "arreglar" el radio: el
  leave-out es la corrección mínima.

---

## 13. Viewer Opening Invariant

> **EL MEMORY QUE EL USUARIO TOCÓ ES LA AUTORIDAD INICIAL DEL VIEWER.**

Al abrir el Viewer:

1. `requestedContentId` sobrevive al montaje.
2. Ningún callback de layout, ningún callback de scroll, ningún índice por
   defecto, ninguna actualización de dataset y ningún evento de momentum inicial
   puede reemplazarlo **antes** de que se establezca la alineación.
3. El pager primero se alinea a `requestedContentId`.
4. Sólo después de que la alineación está establecida, la navegación genuina
   puede cambiar el contenido activo.
5. Si `requestedContentId` no está en el dataset, el Viewer muestra el estado
   honesto `Missing` ("Este recuerdo ya no está disponible") — **nunca el índice 0**.

**Decisión de implementación (mínimo compatible con CURRENT).**
- **Ancho de página uniforme**: `MemoryVideoPage` y `MemoryAudioPage` reciben
  `width` y aplican `{ width }` en su contenedor raíz, igual que `ImagePage` y la
  página Written ya hacen. Elimina la mentira de `getItemLayout`.
- **Una sola autoridad de scroll programático**: el efecto
  `scrollToIndex({animated:false})` se ejecuta **sólo** cuando
  `activeContentId` cambia a un id **distinto** del actual. Se elimina el
  realimentamiento `onMomentumScrollEnd → setState → efecto → scroll`.
- **Opening lock**: mientras el pager no ha reportado el índice pedido, las
  escrituras de `onActiveChange` cuyo idComputed ≠ `activeContentId` se ignoran.
  El lock se libera por el primer `onMomentumScrollEnd` **o** `onScrollEndDrag`
  cuyo `computedIndex === requestedIndex`. Si el lock no se puede liberar, el
  Viewer debe poder igualinear sin escribir estado (fallback explícito).
- **Sin fallback a índice 0**: `findIndex` crudo; `−1` → `Missing`.
- **`viewerMemories` memoizado** con dependencias explícitas. El campo muerto
  `MemoryViewerSession.memories` se borra o se consume de verdad (preferible:
  borrar).

---

## 14. Viewer Source Contract

- El Viewer hace pager **exclusivamente** dentro de la fuente con la que se abrió.
- La fuente es `{ kind, sourceId, label }` y es **inmutable** durante la vida del
  Viewer. `viewer.source` nunca se reescribe.
- Cero cambios de fuente sin cerrar y reabrir. Cero "cambia a la biblioteca porque el
  dataset se vació".
- Si el dataset de la fuente se vacía transitoriamente, se muestra `Missing`, no
  otra fuente.
- Chrome: la etiqueta inferior nombra la fuente real (Library / Album / Fotos /
  Videos / Audios / Notas / nombre de álbum). Se conserva.

---

## 15. Viewer Dataset Update Contract

- Paginación, refresh, reconciliación y completados de ingesta **preservan** el
  contenido activo: la página 0 re-leída con datos ya cargados **no** vacía el
  Viewer ni muestra skeleton.
- Reconstruir el array de datos **no** puede mover el contenido activo.
- El contenido activo se resuelve **por `contentId`**, no por índice físico.
- Un `onNearEnd` que appende páginas **no** puede desplazar el item activo.
- La identidad del array de datos del Viewer es estable mientras el contenido y la
  fuente no cambian.

---

## 16. Image Final Feature Set

| Capacidad | Decisión | Clasificación | Razón |
| --- | --- | --- | --- |
| Pinch zoom | **IN** | `SUPPORTED_NOW` | ya implementado con PanResponder |
| Pan (zoom > 1) | **IN** | `SUPPORTED_NOW` | ya implementado, clamp correcto |
| Pager a escala ≈1 | **IN** | `SUPPORTED_NOW` | arbitraje ya correcto |
| Arbitration al hacer zoom | **IN** | `SUPPORTED_NOW` | `onPanResponderTerminationRequest` ya correcto |
| Reset de zoom al cambiar de página | **IN** | `SUPPORTED_NOW` | estructural (`keyExtractor = memory.id`) |
| Reset al reabrir | **IN** | `SUPPORTED_NOW` | el Viewer remonta |
| Rotation / layout | **IN** | `SUPPORTED_NOW` | `useWindowDimensions` |
| Acceso al original de alta resolución | **IN** | `SUPPORTED_NOW` | ya correcto |
| Estado de carga | **IN** | `SUPPORTED_NOW` | ya correcto |
| Error honesto | **IN** | `SUPPORTED_NOW` | ya correcto |
| **Retry del original** | **IN (Run A, C4)** | `SUPPORTED_WITH_CURRENT_STACK` | un error sin recuperación es un hueco de corrección |
| **Compartir (OS)** | **IN (Run B, C6)** | `SUPPORTED_WITH_CURRENT_STACK` | costura `homecloudDownloadService` ya existe |
| Double-tap zoom | **DEFER** | `REQUIRES_CUSTOM_GESTURE` | sin RNGH; arbitrar contra toggle de chrome y pager |
| Double-tap reset | **DEFER** | `REQUIRES_CUSTOM_GESTURE` | ídem |
| Selección de texto dentro de la imagen | **DEFER** | — | sin valor |

Deferred debt: doble toque; zoom por pinch más allá de 3×; reset de zoom por
doble toque.

---

## 17. Video Final Feature Set

| Capacidad | Decisión | Clasificación | Razón |
| --- | --- | --- | --- |
| Play / Pause | **IN** | `SUPPORTED_NOW` | `nativeControls` |
| Scrub | **IN** | `SUPPORTED_NOW` | barra nativa; feel es DEVICE_ONLY |
| Tiempo actual / duración | **IN** | `SUPPORTED_NOW` | controles nativos |
| Estado de buffering | **IN** | `SUPPORTED_NOW` | overlay mientras `status !== readyToPlay` |
| Error de reproducción | **IN** | `SUPPORTED_NOW` | clasificado honestamente |
| "No soportado" | **IN** | `SUPPORTED_NOW` | `isSupported` es Android-only; en iOS se informa `playback` a propósito |
| Coexistencia pager ↔ gestos | **IN (verificar)** | `DEVICE_ONLY_VERIFY` | es corrección, no funcionalidad |
| Coexistencia `nativeControls` | **IN (verificar)** | `DEVICE_ONLY_VERIFY` | ídem |
| Background (pause) | **IN** | `SUPPORTED_NOW` | `authorized` |
| Foreground (sin auto-resume) | **IN** | `SUPPORTED_NOW` | nada llama `play()` |
| **Fullscreen** | **IN (Run B, C5)** | `SUPPORTED_WITH_CURRENT_STACK` | `fullscreenOptions.enable` default `true`; hoy está en `false` |
| **Compartir (OS)** | **IN (Run B, C6)** | `SUPPORTED_WITH_CURRENT_STACK` | |
| Velocidad 0.5/1/1.5/2× | **DEFER** | `SUPPORTED_WITH_CURRENT_STACK` | la API existe (`playbackRate`), pero una UI de velocidad propia compite con `nativeControls` y con fullscreen |
| Mute | **DEFER** | `SUPPORTED_WITH_CURRENT_STACK` | en iOS el volumen es del dispositivo |
| Volumen | **DEFER** | `SUPPORTED_WITH_CURRENT_STACK` | ídem |
| Double-tap ±10 s | **DEFER** | `REQUIRES_CUSTOM_GESTURE` | `seekBy` existe, el gesto no |
| Pinch zoom / pan al hacer zoom | **DEFER** | `REQUIRES_CUSTOM_GESTURE` | `VideoView` no expone zoom |

**Invariantes HC2-B que se preservan y NO se rediseñan:** jugador sólo en la
página activa; fetch del original sólo en la página activa; sin release manual
(la autoridad es el hook); sin resurrección async obsoleta (`MemoryMediaAccess`);
pause en background/blur/swipe; sin auto-resume; revocación por cambio de scope.

---

## 18. Audio Final Feature Set

| Capacidad | Decisión | Clasificación | Razón |
| --- | --- | --- | --- |
| Play / Pause | **IN** | `SUPPORTED_NOW` | ya implementado |
| Progreso / tiempo / duración | **IN** | `SUPPORTED_NOW` | ya implementado |
| Seek por toque | **IN** | `SUPPORTED_NOW` | `audioSeekRatio`/`audioSeekTarget` |
| Error honesto | **IN** | `SUPPORTED_NOW` | ya implementado |
| "No soportado" | **IN** | `SUPPORTED_NOW` | no hay API que lo reporte en iOS |
| Background / foreground | **IN** | `SUPPORTED_NOW` | ya implementado |
| Sesión de audio | **IN** | `SUPPORTED_NOW` | HC2-B no la toca; no se cambia |
| Frecuencia de actualización | **IN** | `SUPPORTED_NOW` | `updateInterval: 250` local a la página |
| Etiquetas de accesibilidad | **IN** | `SUPPORTED_NOW` | ya implementado |
| **Seek −10 s / +10 s** | **IN (Run B, C5)** | `SUPPORTED_WITH_CURRENT_STACK` | `AudioPlayer.seekTo` |
| **Velocidad 0.5/1/1.5/2×** | **IN (Run B, C5)** | `SUPPORTED_WITH_CURRENT_STACK` | `setPlaybackRate`; rango iOS 0–2 |
| **Buffering en reproducción** | **IN (Run B, C5)** | `SUPPORTED_WITH_CURRENT_STACK` | `AudioPlayer.isBuffering` |
| **Compartir (OS)** | **IN (Run B, C6)** | `SUPPORTED_WITH_CURRENT_STACK` | |
| Bocina / auriculares | **DEFER** | `DEFER` | reconfigurar la sesión de audio; decisión HC2-B explícita |
| Onda (waveform) | **DEFER** | — | no hay datos; no se fabrican |

---

## 19. Written Final Feature Set

| Capacidad | Decisión | Clasificación | Razón |
| --- | --- | --- | --- |
| Scroll de texto largo | **IN** | `SUPPORTED_NOW` | ya implementado |
| Fecha / contexto semántico | **IN** | `SUPPORTED_NOW` | ya implementado |
| Interacción con el pager | **IN** | `SUPPORTED_NOW` | ya correcto |
| Loading / error | **IN** | `SUPPORTED_NOW` | por construcción (no hay acceso binario) |
| **Copiar todo** | **IN (Run B, C6)** | `SUPPORTED_WITH_CURRENT_STACK` | `Clipboard.setString` de RN core; sin dependencia nueva |
| **Compartir (texto)** | **IN (Run B, C6)** | `SUPPORTED_NOW` | `Share.share` de RN core, precedente ya en el repo |
| Acciones de organización | **IN (Run B, C6)** | `SUPPORTED_WITH_CURRENT_STACK` | gramática compartida |
| Selección de texto | **DEFER** | `DEFER` | compite con el pager; "Copiar todo" cubre el caso |
| Edición | **FUERA DE ALCANCE** | — | HC2-C es consumo |

---

## 20. Sharing Contract

- HC2-C habla de **OS SHARE**, no de HomeCloud household sharing. Son funciones
  distintas; household sharing queda fuera de alcance.
- **Nunca** se expone la signed URL como payload de share. Se comparte **el
  archivo local descargado**, nunca una URL firmada.
- Binario (imagen / video / audio): `downloadHomeCloudOriginal` →
  `validateDownloadedFile` → `shareHomeCloudDownloadedFile`. Se reutiliza la
  costura existente; no hay endpoint nuevo ni dependencia nueva.
- **Narrowing obligatorio**: sólo un Memory **binario** (`kind !== 'written'`) se
  comparte como archivo; un `written` (`displayName`/`mimeType`/`sizeBytes` nulos)
  se comparte como **texto** vía `Share.share`, o se le dice honestamente que no
  se puede compartir como archivo.
- **Ciclo de vida del archivo temporal**: el archivo se escribe en
  `Paths.cache/HomeCloud/<safeFileName>` (no `Paths.document`) y se **borra al
  resolver `shareAsync`**. Congela la fuga actual de `Paths.document`.
- El estado es honesto: `Compartido` ≠ `Compartido por el usuario`;
  `shareAsync` resuelto no significa que el destinatario lo recibió.
- Si `Sharing.isAvailableAsync()` es `false`, el mensaje es honesto y no se
  ofrece una acción falsa.

---

## 21. Copy Contract

- Alcance: **Written** únicamente (y, si en el futuro se*volviera* a exponer
  texto de otro Memory, el mismo helper).
- Implementación: `Clipboard.setString` del **React Native core 0.86.3**, ya
  instalado. `expo-clipboard` **NO** se agrega en HC2-C.
- La llamada se aísla en un helper propio y se encapsula la deprecación, de modo
  que migrar a `expo-clipboard` sea un cambio de un archivo si React Native quita
  `Clipboard`.
- Honestidad: en iOS `setString` no muestra confirmación. El estado "Copiado" es
  verificable sólo en dispositivo.
- No se ofrece "pegar", ni lectura del portapapeles, ni sincronización.

---

## 22. Media Lifecycle Invariants

Se **preservan** sin modificar, salvo el fetch del original de imagen (§24):

1. Un solo `AppState` listener y una sola fuente de focus en el Viewer
   (`MemoryViewer.tsx:73-76`), colapsados en `mediaPlaybackAuthorized`.
2. `authorized === false` significa **pause**, nunca resume.
3. `onScrollBeginDrag` revoca de inmediato; un drag soltado sin momentum también
   restaura (vía `momentumRef`).
4. Un cambio de página asentado vuelve inactiva la página saliente → el player se
   desmonta → el hook libera.
5. `useVideoPlayer` / `useAudioPlayer` son la **única** autoridad de release. Nunca
   `release()` / `remove()` manual, nunca tocar un player tras su unmount.
6. `MemoryMediaAccess` impide que un resultado async obsoleto resucite una página.
7. Cambio de household / re-auth revoca (derivado durante render, sin efecto).
8. `resolveMemoryMediaFailure` sólo dice `unsupported` en la plataforma cuya API lo
   reporta.
9. El progreso de audio vive dentro de la página y no se sube al Viewer.
10. Un solo gesto por celda: no hay más de un `PanResponder` de fila en juego.

---

## 23. Loading / Empty / Error State Contract

Estados **mutuamente excluyentes** por superficie. Para cada superficie:
`LOADING`, `READY_EMPTY`, `READY_DATA`, `ERROR`, `REFRESHING`.

Reglas:

1. El skeleton aparece **sólo** mientras se espera contenido que se espera que
   llegue.
2. El skeleton **nunca** es el estado vacío permanente.
3. Tras `READY_EMPTY` **no** se muestran tarjetas estructurales vacías.
4. `REFRESHING` **preserva** el contenido válido existente donde la arquitectura
   actual lo permita.
5. `ERROR` con contenido previo **no** borra el contenido previo; muestra el error
   junto a él y ofrece reintento.
6. `ERROR` sin contenido previo muestra `ErrorState` + reintento y **nunca** un
   vacío disfrazado de "no hay/albumes".
7. El estado de carga de **portadas** es distinguible del estado "sin portada"
   (corrige B3).
8. La relectura de página 0 con datos ya cargados **no** re-renderiza el
   skeleton (corrige la semántica `loadFirstPage` vs `refresh`).

Aplicación por superficie:

| Superficie | LOADING | READY_EMPTY | READY_DATA | ERROR | REFRESHING |
| --- | --- | --- | --- | --- | --- |
| Álbumes (rail/sección) | skeleton de la sección | copy + CTA | riel de tiles | `ErrorState` + Reintentar | conserva tiles, sin skeleton |
| Portada de álbum | estado de carga de portada | fallback de álbum | imagen | fallback de álbum | conserva imagen |
| Tipos | sin skeleton (son 4 tiles fijos) | — | 4 tiles | — | — |
| Timeline | `MemoriesLoadingSkeleton` | copy "Aún no hay recuerdos" | SectionList | `ErrorState` + Reintentar | conserva contenido |
| Colección (overlay) | skeleton de tarjetas | "Esta colección todavía no tiene recuerdos" | SectionList | `ErrorState` + Reintentar, o terminal si el álbum ya no existe | conserva contenido |
| Detalle de álbum | skeleton de tarjetas | `ALBUM_EMPTY_TITLE` + "Agregar recuerdos" | SectionList | `ErrorState` + Reintentar, o `ALBUM_MISSING_TITLE` terminal | conserva contenido |
| Acceso a media en Viewer | overlay por página | — | reproductor/página | mensaje honesto por tipo (`access` / `playback`) | — |
| Original de imagen | spinner | — | imagen | mensaje + **Retry** | — |

---

## 24. Cache / Performance Contract

1. **Original de imagen sólo para la página activa.** Una página `ImagePage`
   inactiva pide **preview**, no original. Esto alinea imagen con el invariante
   HC2-B que ya cumplen video y audio, y elimina el fan-out de hasta 7 originales
   firmados por apertura. *(Run B, C7)*
2. **Mapas de signed URL acotados y con scope.** `clearMemoryPreviewCache()` y
   `clearMemoryOriginalCache()` se conectan al **único** efecto de reset de
   household que ya existe. Cero LRU nuevo, cero plataforma de caché nueva.
   *(Run B, C7)*
3. **Deduplicación de requests en vuelo** para preview y original, por `contentId`.
   *(Run B, C7)*
4. **Archivos compartidos acotados**: `Paths.cache` + borrado tras `shareAsync`.
   *(Run B, C7)*
5. **Ventaneo del Viewer acotado** — se conserva `initialNumToRender=3`,
   `maxToRenderPerBatch=3`, `windowSize=7`.
6. **Identidad de arrays**: `viewerMemories` memoizado; la relectura de página 0
   preserva la referencia cuando el contenido no cambió, o al menos no fuerza
   re-render del árbol visible.
7. **Aislamiento de alta frecuencia**: el estado de progress de audio sigue
   local a la página. No se sube.
8. **Sin FlashList, sin capa de datos nueva, sin reescritura global de caché.**
   No hay evidencia que lo justifique.
9. **Preservado**: `plannerCache` con TTL 30 s y `captureContextToken`; los
   comandos de Album usan `scope` para que la invalidación existente funcione.

---

## 25. Expo Go Constraint

- El objetivo físico sigue siendo **iPhone vía Expo Go**.
- **Ninguna capacidad congelada en HC2-C requiere salir de Expo Go.**
- **Cero dependencias nuevas.** `package.json` y lockfiles no se tocan.
- Todo lo clasificado `IN` es `EXPO_GO_SAFE`. No hay
  `CUSTOM_DEV_CLIENT_REQUIRED` en el freeze.
- `expo-dev-client` está instalado pero **no** se usa como excusa para nada.
- Riesgo residual tolerable: `Clipboard` de RN core está en deprecación. Está
  encapsulado para que una futura migración sea local.

---

## 26. Run A Exact Scope

**C0 Runtime correctness**
- A1: ancho de página uniforme en `MemoryVideoPage` y `MemoryAudioPage`.
- A2: `onActiveChange` con opening lock + eliminar el realimentación del efecto de
  scroll.
- A3: sin fallback a índice 0 → `Missing`.
- A4: `viewerMemories` memoizado; borrar el campo muerto
  `MemoryViewerSession.memories`.
- B1: el reset de scope no superscribe la lectura inicial del rail.
- B2: una sola lectura de primera pintura del rail.
- B4: la sección Álbumes con su propio `LOADING`, independiente del `loading` de
  la Timeline.
- C: eliminar el segmented control de selección, `switchTab`, `collectionsRoot`,
  su ref/handler/offset/back, y la ramificación del `ListHeaderComponent`.
- D: leave-out de `albumScopeAction` / `AlbumScopeRemove` /
  `MemoryAlbumScopeAction`, y limpieza en cascada de props relacionados.
- Retry del original de imagen.
- Semántica de relectura: página 0 con datos cargados no muestra skeleton.

**C1 Root simplification**
- Header compuesto Álbumes + Tipos en la raíz, siempre montado.
- Fila de Tipos creada **antes** de borrar `collectionsRoot`.
- Colección activa como estado de pantalla.
- Reutilizar `AlbumTile` y eliminar el duplicado `MemoryCollectionAlbumTile` si la
  fila de Tipos los muestra.

**C2 Selection Mode**
- Sesión sin `source`.
- Header `[X] N seleccionados [Acciones ⋯]`.
- Acciones visibles al entrar.
- D4, refresh gate y exit gesture **intactos**.

**C3 Albums polish**
- `Álbumes  + Nuevo` en el header de sección.
- Estado vacío con acción.
- Estado de carga de portada distinguible (B3).

**C4 Viewer correctness**
- Todo §13, §14, §15.
- Matriz de corrección por fuente × media verificada.

### Archivos que se espera tocar (evidencia-based)

Frontend:
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx`
- `front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryCards.tsx`
- `front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx`
- `front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx`
- `front/mi-front-limpio/components/homecloud/AlbumsRail.tsx`
- `front/mi-front-limpio/components/homecloud/AlbumTile.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryCollectionTile.tsx`
- `front/mi-front-limpio/services/homecloud/homecloudMemorySelection.ts`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryViewerSource.ts`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryCollectionsPagination.ts`

Helper nuevo **sólo si** se justifica: uno puro para la autoridad de acciones
(§11). Preferencia: que viva en `services/homecloud/` y que sea una función pura
pequeña, sin contexto, sin store.

Tests a actualizar/agregar: `scripts/homecloud_hc2a_memories_viewer_tests.ts`,
`scripts/homecloud_hc2b_media_viewer_tests.ts`,
`scripts/homecloud_moa3_memory_selection_tests.ts`,
`scripts/homecloud_moa2_album_surface_tests.ts`, `tests/run.js` (enganchar la
suite HC2-A al gate).

**Backend:** NO. **Migraciones:** NO. **Dependencias:** NO.

---

## 27. Run A DoD

- Los cuatro bugs tienen corrección implementada yrazonada.
- `tsc --noEmit` del frontend en verde.
- Los comandos deterministas de Memories en verde: HC2-A, HC2-B, MO-A1 contract,
  MO-A2 surface, MO-A3 selection, MO-A3 device gestures.
- `npx expo lint` sin errores nuevos en `screens/HomeCloud*` ni en
  `components/homecloud/*` ni en `services/homecloud/*`.
- Las nuevas pruebas deterministas de §28 están en verde.
- La suite HC2-A está enganchada a un grupo de suites.
- `git diff --check` limpio.
- Cero cambios de backend, migraciones, `package.json` ni lockfiles.
- Instrumentación de trace **retirada**.
- Informe honesto de limitaciones.

---

## 28. Run A Physical QA Gate

En iPhone físico vía Expo Go. Cada ítem marcado `DEVICE_ONLY` es bloqueante.

### A. FOUNDATION QA

| # | Prueba | Tipo | Automatable |
| --- | --- | --- | --- |
| 1 | Image abre el item exacto, índice 0 y distinto de 0 | AUTOMATABLE (unit) + DEVICE_PREFERRED | sí |
| 2 | Video abre el item exacto y **se queda**, sin gesto del usuario | **DEVICE_ONLY** | no |
| 3 | Audio abre el item exacto y **se queda**, sin gesto del usuario | **DEVICE_ONLY** | no |
| 4 | Written abre el item exacto | DEVICE_PREFERRED | sí |
| 5 | Media en índice ≠ 0 sobrevive a renders iniciales, refresh y append de páginas | AUTOMATABLE + DEVICE_PREFERRED | sí |
| 6 | El pager de Library queda en Library | DEVICE_PREFERRED | sí |
| 7 | El pager del Album queda en el Album | DEVICE_PREFERRED | sí |
| 8 | Videos queda en Videos | DEVICE_PREFERRED | sí |
| 9 | Audios queda en Audios | DEVICE_PREFERRED | sí |
| 10 | Fotos queda en Fotos | DEVICE_PREFERRED | sí |
| 11 | Notas queda en Notas | DEVICE_PREFERRED | sí |
| 12 | Cerrar el Viewer devuelve al contexto correcto (álbum / colección / raíz) | DEVICE_PREFERRED | sí |
| 13 | Long press entra en selección de forma estable | DEVICE_ONLY | no |
| 14 | D4 drag selection sigue estable (rango contiguo, selección y deselección) | AUTOMATABLE + **DEVICE_ONLY** | sí |
| 15 | Entrar en selección **no altera** la IA de la raíz | DEVICE_PREFERRED | sí |
| 16 | No existe selector interno `Recuerdos\|Colecciones` en ninguna superficie | AUTOMATABLE (source) + DEVICE_PREFERRED | sí |
| 17 | Se ve la fila de Álbumes | DEVICE_PREFERRED | sí |
| 18 | Se ve la fila de Tipos | DEVICE_PREFERRED | sí |
| 19 | Se ve el Timeline | DEVICE_PREFERRED | sí |
| 20 | El orden es Álbumes → Tipos → Timeline | DEVICE_PREFERRED | sí |
| 21 | Ya no hay overlay X en ninguna tarjeta de álbum | AUTOMATABLE (source) + DEVICE_PREFERRED | sí |
| 22 | `Quitar del álbum` está disponible contextualmente y sobrevive al leave-out | DEVICE_PREFERRED | sí |
| 23 | El `+` de Crear recuerdo ya no es un círculo y el hit area es ≥44×44 | DEVICE_PREFERRED | sí |
| 24 | `+ Nuevo` de álbum es descubrible sin scrollear el riel | DEVICE_PREFERRED | sí |
| 25 | El botón de Refresh desapareció **y** pull-to-refresh funciona | **DEVICE_ONLY** | no |
| 26 | Un error real conserva un reintento explícito | DEVICE_PREFERRED | sí |
| 27 | Primera entrada a Memories: estado de carga correcto (0, 1, N álbumes; red lenta, sin red) | **DEVICE_ONLY** | no |
| 28 | No hay skeletons permanentes | **DEVICE_ONLY** | no |
| 29 | Las 4 colecciones automáticas son alcanzables en modo NORMAL (sin selección) | DEVICE_PREFERRED | sí |
| 30 | Cambiar de household no deja residuos del anterior | DEVICE_PREFERRED | sí |
| 31 | Un álbum remoto creado aparece al volver a enfocar HomeCloud | DEVICE_PREFERRED | sí |

**Gate: los 31 puntos. Cualquier fallo DEVICE_ONLY bloquea Run B.**

---

## 29. HARD GATE

```
Run B MUST NOT start until Run A physical QA passes.
```

Sin excepciones. Si un punto DEVICE_ONLY falla, se corrige en Run A. Si un punto
no se puede verificar en el dispositivo objetivo, Run B no arranca y la deuda se
registra.

---

## 30. Run B Exact Scope

**C5 Viewer completeness**
- Fullscreen de video (`fullscreenOptions.enable`).
- Seek −10 s / +10 s de audio.
- Velocidad de audio 0.5 / 1 / 1.5 / 2×.
- Buffering de audio en reproducción.

**C6 Viewer + Selección actions**
- Gramática de acciones compartida en el menú de un Memory del Viewer:
  - Library / Colección: `Agregar a álbum`, `Compartir`.
  - Album: `Quitar del álbum`, `Agregar a otro álbum`, `Compartir`.
  - Written: `Copiar`, `Compartir`.
- OS SHARE binario (descarga local + `shareAsync` + borrado del temporal).
- OS SHARE de texto (`Share.share`).
- Copiar (`Clipboard.setString`).
- Reconectar `removeMemoryFromOpenAlbum` al Viewer.

**C7 Performance / cache / flicker**
- Original de imagen sólo para la página activa.
- Conectar `clearMemoryPreviewCache` / `clearMemoryOriginalCache` al reset de scope.
- Deduplicación de requests en vuelo.
- Archivos compartidos en `Paths.cache` + borrado.
- `viewerMemories` memoizado e identidad estable.
- Sin flicker en primera entrada.

### Archivos que se espera tocar (evidencia-based)

- `front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx`
- `front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx` (sólo si
  la gramática compartida lo exige)
- `front/mi-front-limpio/services/homecloud/homecloudMemoryOriginal.ts`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryPreview.ts`
- `front/mi-front-limpio/services/homecloud/homecloudDownloadService.ts`
- `front/mi-front-limpio/services/homecloud/homecloudDownloadPolicy.ts`
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx`
- helper nuevo de autoridad de acciones (sólo si Run A no ya lo provee)
- helper nuevo de share/copy (aislado, para que la migración de `Clipboard` sea local)

**Backend:** NO. **Migraciones:** NO. **Dependencias:** NO** (salvo que React
Native elimine `Clipboard`; en cuyo caso `expo-clipboard`, con justificación
explícita).

---

## 31. Run B DoD

- Todas las capacidades `IN` de §16-§21 implementadas y honestas.
- Todos los `DEFER` siguen sin aparecer en la UI.
- tests deterministas nuevas en verde + las de Run A siguen en verde.
- `tsc --noEmit` en verde; sin errores nuevos de lint en Memories.
- Cero cambios de backend, migraciones, dependencias.
- Cero URLs firmadas expuestas como payload de share.
- Cero archivos compartidos acumulados.
- Informe honesto de limitaciones.

---

## 32. Run B Physical QA Gate

### B. FINAL VIEWER QA

| # | Prueba | Tipo |
| --- | --- | --- |
| B1 | Scrub de video se siente nativo | **DEVICE_ONLY** |
| B2 | Pinch de imagen se siente bien | **DEVICE_ONLY** |
| B3 | Doble tap (deferred, sólo para confirmar que NO interfiere) | **DEVICE_ONLY** |
| B4 | Controles nativos de video vs pager | **DEVICE_ONLY** |
| B5 | Transición a fullscreen y de vuelta | **DEVICE_ONLY** |
| B6 | Velocidad de audio cambia el tono de forma audible y controlable | **DEVICE_ONLY** |
| B7 | Seek ±10 s de audio es preciso | **DEVICE_ONLY** |
| B8 | Buffering de audio es honesto en una red mala | **DEVICE_ONLY** |
| B9 | Parada audible inmediata al deslizar | **DEVICE_ONLY** |
| B10 | Share sheet de iOS aparece y se descarta honestamente | **DEVICE_ONLY** |
| B11 | Clipboard: "Copiado" es verificable en iOS | **DEVICE_ONLY** |
| B12 | Arbitraje pager ↔ gestos en imagen con zoom | **DEVICE_ONLY** |
| B13 | Archive de vídeos grandes por share (archivo temporal, sin acumulación) | **DEVICE_ONLY** |
| B14 | Original de imagen: exactamente 1 request al abrir | DEVICE_PREFERRED |
| B15 | Verificación de D6 (no hay regresión de D4) | AUTOMATABLE + **DEVICE_ONLY** |
| B16 | Gramática de acciones del Viewer igual en Library / Album / Colección | DEVICE_PREFERRED |
| B17 | Nested modal: nunca dos modales a la vez | **DEVICE_ONLY** |
| B18 | Cerrar el Viewer tras una acción devuelve al contexto correcto | DEVICE_PREFERRED |

**Gate: los 18 puntos.**

---

## 33. HC2 Closure Criteria

HC2 está cerrado cuando:

1. Run A DoD + Run A Physical QA Gate en verde.
2. Run B DoD + Run B Physical QA Gate en verde.
3. Un iPhone físico vía Expo Go recorre de punta a punta: crear recuerdo →
   aparece en Timeline → aparece en su álbum → abrir en Viewer → ver la imagen /
   reproducir video / escuchar audio / leer la nota → compartir → copiar (nota) →
   seleccionar varios → agregar a álbum → quitar del álbum → recargar y verificar.
4. No hay skeletons permanentes, ni saltos de Viewer, ni navegación interna, ni
   acción destructiva permanente.
5. La deuda diferida está escrita, con motivo, no escondida.
6. Dos documentos de freeze y este cierre quedan en el repo.

---

## 34. Deferred Debt

| Deuda | Motivo |
| --- | --- |
| Double-tap zoom / reset en imagen | `REQUIRES_CUSTOM_GESTURE`; riesgo de arbitraje con chrome y pager |
| Velocidad de video | la API existe pero la UI compite con `nativeControls` |
| Mute / volumen de video | en iOS es del dispositivo |
| Double-tap ±10 s en video | `seekBy` existe, el gesto no |
| Pinch / pan con zoom en video | `VideoView` no expone zoom |
| Selección de texto en Written | compite con el pager; "Copiar todo" cubre el caso |
| Onda (waveform) de audio | no hay datos; no se fabrican |
| Bocona / auriculares | reconfigurar la sesión de audio |
| Compartir en selección múltiple | requiere N descargas + decisión de UX |
| Favoritos, búsqueda, resurfacing, papelera, ocultos | fuera de alcance de HC2 |
| Migración a `expo-clipboard` | sólo si React Native elimina `Clipboard` |
| Imágenes de portada generadas para video | el backend no tiene decoder; no se fabrica |
| Contadores exactos de Tipos | el read model entrega páginas, no totales |
| Reproducción en background | `staysActiveInBackground` / `shouldPlayInBackground` no se habilitan en HC2-C |
| HomeCloud household sharing | función distinta, otra etapa |

---

## 35. Files Likely To Change

### Run A (C0-C4)

Frontend (todos existen hoy; ninguno es nuevo salvo el helper opcional de
acciones):
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx`
- `front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryCards.tsx`
- `front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx`
- `front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx`
- `front/mi-front-limpio/components/homecloud/AlbumsRail.tsx`
- `front/mi-front-limpio/components/homecloud/AlbumTile.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryCollectionTile.tsx`
- `front/mi-front-limpio/services/homecloud/homecloudMemorySelection.ts`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryViewerSource.ts`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryCollectionsPagination.ts`

Tests:
- `scripts/homecloud_hc2a_memories_viewer_tests.ts` (actualizar + ampliar)
- `scripts/homecloud_hc2b_media_viewer_tests.ts` (actualizar)
- `scripts/homecloud_moa3_memory_selection_tests.ts` (actualizar: `source` fuera)
- `scripts/homecloud_moa2_album_surface_tests.ts` (actualizar: leave-out del X)
- `tests/run.js` (enganchar la suite HC2-A al gate)

Helper nuevo: **sólo si** la gramática de acciones no cabe en los componentes
existentes. Si se crea: `front/mi-front-limpio/services/homecloud/` como función
 pura, sin React, sin contexto, sin store.

### Run B (C5-C7)

- `front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx`
- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx`
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryOriginal.ts`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryPreview.ts`
- `front/mi-front-limpio/services/homecloud/homecloudDownloadService.ts`
- `front/mi-front-limpio/services/homecloud/homecloudDownloadPolicy.ts`
- Tests nuevos: `scripts/homecloud_hc2c_*`

### Explícitamente congelado / read-only

- `backend/**`
- `supabase/migrations/**`
- `package.json`, `package-lock.json`, lockfiles
- Config Expo, config nativo
- Infraestructura compartida de upload de HomeCloud
- Contratos de producto generados
- `front/mi-front-limpio/components/ui/**` salvo que un cambio sea estrictamente
  necesario y justificado (preferible resolver en el componente homecloud)
- `front/mi-front-limpio/screens/HomeCloudScreen.tsx` (el selector global se mantiene)

### Cambios esperados

| Categoría | Run A | Run B |
| --- | --- | --- |
| Backend | **NO** | **NO** |
| Migraciones | **NO** | **NO** |
| Instalación de dependencias | **NO** | **NO** (salvo `expo-clipboard` si RN elimina `Clipboard`, con justificación) |
| New global state manager | **NO** | **NO** |
| Nuevo coordinador de media | **NO** | **NO** |
| Nueva arquitectura de navegación | **NO** | **NO** |
| Nueva plataforma de caché | **NO** | **NO** |
| FlashList | **NO** | **NO** |

**No se acepta ninguna `ARCHITECTURAL_ESCALATION` en este freeze.** Si Run A o
Run B descubren que la arquitectura existente no puede satisfacer esta verdad de
producto, se detiene y se documenta; no se escala en silencio.

---

## 36. Test Plan Freeze

Las pruebas deben **probar comportamiento**, no hacer grep de cadenas como
evidencia principal.

| Comportamiento | Tipo de prueba | Dónde |
| --- | --- | --- |
| Apertura exacta: el `requestedContentId` sobrevive al montaje | puro (resolver índice + guard del lock) | nuevo `homecloud_hc2c_*` |
| Apertura en índice ≠ 0 | puro | idem |
| Estabilidad en re-render: dataset nuevo con el mismo contenido → mismo índice activo | puro | idem |
| Actualización de dataset: append no desplaza el activo | puro | idem |
| Aislamiento de fuente: un cambio de dataset de otra fuente no mueve el activo | puro | idem |
| Alineación inicial: el lock se libera | puro (lock + evento) | idem |
| Sin fallback a índice 0: `−1` → Missing | puro + source | idem |
| Ancho de página: toda página declara `width` | source assertion como **complemento**, no evidencia principal | idem |
| Orden de efectos / reset del rail: una lectura después de un reset produce respuesta | puro (controlador) | extender MO-A2 surface |
| Primera pintura: una sola lectura del rail | puro | idem |
| Estados mutuamente excluyentes (LOADING/EMPTY/DATA/ERROR/REFRESHING) | puro | nuevo `homecloud_hc2c_*` |
| Sin skeleton tras READY_EMPTY | puro | idem |
| Selección: entrar no cambia la IA | puro (transiciones sin `source`) + source | extender MO-A3 selection |
| Selección: acciones visibles sin `✓` | puro + source | idem |
| D4 drag range sigue estable | puro (ya existe, no se reabre) | `homecloud_hc2a_memories_viewer_tests.ts` |
| Leave-out del X de álbum | source assertion | extender MO-A2 surface |
| `Quitar del álbum` semántica intacta | puro | `homecloud_hc2a_*` |
| Gramática de acciones por fuente | puro | nuevo |
| Cycle de vida de media: un solo `AppState` listener, pause sin auto-resume, sin release manual | ya existe, **no se reabre** | `homecloud_hc2b_media_viewer_tests.ts` |
| Velocidad de audio | puro (normalización de rate) | nuevo |
| Seek ±10 s de audio | puro (target clamp) | nuevo |
| Buffering de audio | puro (fase) | nuevo |
| Costura de share | puro (narrowing written vs binario, nombre de archivo, ciclo de vida) | nuevo |
| Costura de copy | puro (helper, no la llamada nativa) | nuevo |
| Invalidación de caché en cambio de household | puro | extender `homecloud_4b1_preview` / nuevo |

**No se congelan** pruebas cuyo único valor sea buscar una cadena en el fuente.
Las aserciones de fuente se permiten **sólo** como complemento de una prueba de
comportamiento (por ejemplo: "toda página declara `width`" es una aserción de
fuente legítima, porque el comportamiento depende de la declaración de estilo;
pero "el archivo contiene la palabra `pagingEnabled`" no lo es).

---

## 37. Device QA Plan Freeze

### A. FOUNDATION QA (después de Run A) — 31 puntos, ver §28

### B. FINAL VIEWER QA (después de Run B) — 18 puntos, ver §32

Marcado:
- `AUTOMATABLE`: se cubre con una prueba determinista; el dispositivo confirma.
- `DEVICE_PREFERRED`: automatizable en parte, pero el dispositivo es la prueba.
- `DEVICE_ONLY`: **sólo** el dispositivo puede concluirlo; bloqueante.

Puntos estrictamente DEVICE_ONLY en HC2-C:
- apertura y permanencia de Video (§28 #2)
- apertura y permanencia de Audio (§28 #3)
- long press estable (#13)
- D4 en el dedo (#14)
- pull-to-refresh tras quitar el botón (#25)
- primera entrada con skeleton / sin skeleton (#27, #28)
- scrub de video, pinch de imagen, doble tap, controles nativos vs pager,
  fullscreen, tono de velocidad de audio, precisión de seek ±10 s, buffering en
  red mala, parada audible inmediata, share sheet, portapapeles, arbitraje pager
  vs gestos, archivo temporal de vídeo grande, nunca-dos-modales.

Ninguno de ellos puede cerrarse por inspección de fuente.

---

## 38. On unknowns

`DEVICE_TRACE_REQUIRED` permanece marcado en BUG A para el **orden de eventos
nativos**, con plan de trace congelado en §16.1 del audit. Run A debe ejecutar ese
trace y retirarlo.

BUG B tiene su efecto probado estáticamente pero su consecuencia física depende de
un comportamiento de `@react-navigation/native` que Run A debe **probar**, no
suponer.

Ningún bug de este documento tiene confianza `PROVEN` para la cadena nativa. No se
presenta como probado lo que no lo está.
