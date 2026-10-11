# HC2-C TOTAL CURRENT AUDIT

AUDIT MODE: READ-ONLY. No se implementó nada de HC2-C en esta sesión.
SCOPE: C0 → C7 sobre `front/mi-front-limpio` + dependencias instaladas.

---

## 1. Baseline

| Dato | Valor |
| --- | --- |
| Worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-current` |
| Branch | `homecloud/memories-lane` |
| HEAD al iniciar | `f4410a6886f106c617802b829edc9537495a89c2` (`fix(homecloud): harden memory viewer media lifecycle`) |
| Hint histórico HC2-B | `f4410a6…` — coincide con CURRENT. Git actual es la autoridad. |
| Push | NO |
| Cambios de código de producto por esta auditoría | NINGUNO |

### 1.1 Commits HC2 relevantes (HEAD hacia atrás)

```
f4410a6 fix(homecloud): harden memory viewer media lifecycle   <- HC2-B
cf8959d feat(homecloud): add audio memory playback
73d640f feat(homecloud): add video memory playback
a4fd471 fix(homecloud): keep picker ownership across appstate changes
d20c29a fix(homecloud): harden memory intake lifecycle
dbff1c9 fix(homecloud): preserve memory viewer source context
c073f7c fix(homecloud): select contiguous visual range
2df1b04 feat(homecloud): add memory viewer foundation            <- HC2-A
9ea8392 fix(homecloud): harden memory selection gestures
b7d6f0a feat(homecloud): add memory selection and collections   <- MO-A3
e11519b feat(homecloud): add memory albums surface             <- MO-A2
787a548 feat(homecloud): add memory album organization contracts <- MO-A1
```

### 1.2 Working tree y known dirt (verificado y fingerprints)

```
 M backend/src/services/homecloudIntakeService.js
?? CURRENT_AUDIT_AFTER_SLICE_01.md
?? T1_FINAL_WIP.patch
```

| Archivo | Estado | SHA-256 (verificado en esta sesión) | Acción |
| --- | --- | --- | --- |
| `backend/src/services/homecloudIntakeService.js` | modificado, +12 líneas en `authorizeHomeCloudOriginalUpload` | `7E5361A3A0AD7FD38D7895A9505E141C27911943FDDB072B315559450DBE5A10` | NO tocado, NO stageado, NO incluído |
| `CURRENT_AUDIT_AFTER_SLICE_01.md` | untracked | `4982247EBEAFE5DD686BD841FE7282394488DCAF374C720283876444BF9EF2B2` | NO tocado |
| `T1_FINAL_WIP.patch` | untracked | `753111C11F7CDE69071890EDAC5ACBF2625367ABBFDDD8945162EE0DD3584B90` | NO tocado |

Los tres coinciden con el dirt conocido histórico de HC2-B. No hay dirt nuevo ni desconocido. La auditoría pudo continuar alrededor.

### 1.3 Baseline gates ejecutados (solo los relevantes y finitos)

| Gate | Comando | Resultado |
| --- | --- | --- |
| Frontend typecheck | `tsc --noEmit` en `front/mi-front-limpio` | **PASS** (exit 0) |
| Test typecheck | `tsc -p scripts/tsconfig.test.json --noEmit` | **FAIL (pre-existente, ajeno a HC2-C)** |
| Frontend lint | `npx expo lint --no-cache` | **3 errores (pre-existentes, todos en `components/planner/*`)** |
| HC2-B media viewer | `node tests/run.js homecloud-hc2b-media-viewer` | **PASS** |
| HC2-A memories viewer | `npm exec tsc -p scripts/tsconfig.homecloud_hc2a_test.json` + node | **PASS** |
| HC2-A/HC2-B contenido de la prueba HC2-A | `scripts/homecloud_hc2a_memories_viewer_tests.ts` | **PASS** (10 asserts) |
| MO-A1 album contract | `node scripts/homecloud_moa1_album_contracts_tests.js` | **PASS** (83 asserts) |
| MO-A2 album surface | compile + `scripts/compiled-moa2/.../homecloud_moa2_album_surface_tests.js` | **PASS** (134 asserts) |
| MO-A3 selection determinista | compile + `scripts/compiled-moa3/.../homecloud_moa3_memory_selection_tests.js` | **PASS** (209 asserts) |
| MO-A3 device gestures | compile + `scripts/compiled-moa3-device-gesture/...` | **PASS** (90 asserts) |
| Suites runtime (MO-A1/2/3, 4B1 read-model, 4B1 preview) | `node scripts/...` | **ENVIRONMENT_FAILURE** (exigen Supabase local; no se intentó LAN/remoto) |
| `git diff --check` / `--cached --check` | git | **PASS** (sin whitespace errors) |

#### 1.3.1 Fallos pre-existentes, con causa identificada (NO los introduce esta auditoría)

- **Test typecheck**: 5 errores, todos en `scripts/planner_v1_navigation_tests.ts` (líneas 217, 218, 219, 387, 393) — discriminantes de ruta del Planner que no coinciden. Un filtro por `homecloud|memory` sobre la salida de `tsc` devuelve **cero** errores de HomeCloud/Memories.
- **Frontend lint**: 3 errores — `components/planner/PlannerSheetHost.tsx:397` (`react-hooks/purity`, `Math.random` en render), `components/planner/presets/PlannerPresetDraftsIntegrationRoutes.tsx:91` y `:319` (`react-hooks/preserve-manual-memoization`). Cero findings en `screens/HomeCloudMemoriesScreen.tsx`, `components/homecloud/*` o `services/homecloud/*`.

Consecuencia operativa: los agregados `homecloud-4b2`, `homecloud-moa1`, `homecloud-moa2`, `homecloud-moa3` y `npm run typecheck` **fallan en la baseline** por causas ajenas a Memories. Los comandos deterministas de Memories se ejecutaron individualmente (mismo `npm exec tsc` + `node` que usa `tests/run.js`) y pasan.

#### 1.3.2 Hallazgo de gate: la suite HC2-A es huérfana

`tests/run.js:375` registra el comando `homecloud-hc2a-memories-viewer`, pero **ningún grupo de suites lo incluye**. `homecloud-hc2b-media-viewer` sí está enganchado (`:963`). HC2-A es el único evidencia del Viewer que hoy no corre en ningún `npm run quality`. Run A debe corregir esto (ver §17 Test Plan Freeze).

### 1.4 Versiones instaladas (autoridad de CURRENT, leídas de `node_modules`)

| Paquete | Versión instalada | ¿Instalado? |
| --- | --- | --- |
| `expo` | 57.0.25 | sí |
| `react-native` | 0.86.3 | sí |
| `react` | 19.2.3 | sí |
| `expo-video` | 57.0.5 | sí |
| `expo-audio` | 57.0.5 | sí |
| `expo-sharing` | 57.0.22 | sí |
| `expo-file-system` | 57.0.7 | sí |
| `expo-haptics` | 57.0.3 | sí |
| `@react-navigation/native` | 7.2.5 | sí |
| `react-native-screens` | 4.26.2 | sí |
| `expo-clipboard` | — | **NO** |
| `react-native-gesture-handler` | — | **NO** |
| `react-native-reanimated` | — | **NO** |
| `@shopify/flash-list` | — | **NO** |
| `@react-native-community/slider` | — | **NO** |
| `expo-image` | — | **NO** |
| `@react-native-clipboard/clipboard` | — | **NO** |

---

## 2. CURRENT Architecture Map

Rutas bajo `front/mi-front-limpio/`.

### 2.1 Árbol de navegación real

```
HomeTabNavigator → MoreStackScreen → MoreStack.Screen "HomeCloud" → HomeCloudScreen
HomeCloudScreen.tsx:28-35   SegmentedControl GLOBAL  Archivos | Recuerdos   (SE MANTIENE)
HomeCloudScreen.tsx:37-44   AMBOS panes montados a la vez; el pane inactivo usa display:'none'
```

Consecuencia crítica para toda la auditoría: **`HomeCloudMemoriesView` se monta al entrar a HomeCloud, no al cambiar a la pestaña Recuerdos.** El `SegmentedControl` es estado local, no focus. Cualquier lectura que dependa de un evento de focus para corregirse no se dispara al cambiar de pestaña.

### 2.2 Memories root

`front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx` (1864 líneas). Owner único de:

| Estado | Línea | Rol |
| --- | --- | --- |
| `memories` | 231 | dataset canónico de Timeline |
| `viewer` | 232 | `MemoryViewerSession \| null` |
| `nextOffset` / `loading` / `loadingMore` / `refreshing` / `error` | 233-237 | fases de la Timeline |
| `rail` | 346 | `AlbumsRailState` |
| `openAlbumId` / `detail` / `removingContentId` | 391-393 | detalle de álbum anidado |
| `editor` / `actionsAlbum` / `sheetError` / `saving` / `deleting` / `destinationsRevision` | 446-456 | hojas de álbum |
| `selection` / `selectionBusy` / `selectionFailure` / `destinationPickerOpen` | 601-605 | sesión de selección |
| `collections` | 620 | `MemoryCollectionsState` (una colección activa) |

Derivados: `sourceKey` (664), `activeCollectionId` (1075), `activeCollection` (1077), `gridMemories` (1089), `gridGroupingMode` (1104), `viewerMemories` (1106), `sections` (1116), `gridSections` (1121), `excludedIds` (1136), `rowCells` (1159), `visualMemoryIds` (1180).

Efectos de ciclo de vida, EN ORDEN DE DECLARACIÓN (relevante para BUG B):

| # | Línea | Efecto |
| --- | --- | --- |
| 1 | 313 | `loadFirstPage()` |
| 2 | 317 | reset por `householdId` (memories) |
| 3 | 332 | suscripción de reconciliación |
| 4 | 373 | `loadRail()` → `rail.load()` |
| 5 | 377 | `useFocusEffect` → `loadFirstPage()` + `reloadRail()` |
| 6 | 1147 | `setMemorySelectionExclusions` |
| 7 | 1215 | restauración de offset |
| 8 | 1231 | `BackHandler` |
| 9 | 1269 | `AppState` (limpieza de drag) |
| 10 | 1278 | cleanup de ticker/registro/offsets |
| 11 | 1295 | `exitGesture.sync(selecting)` |
| 12 | 1304 | `exitGesture.release()` en unmount |
| **13** | **1311-1334** | **reset por household/token → `railControllerRef.current!.reset()`** |

### 2.3 Albums

- `components/homecloud/AlbumsRail.tsx` — header `Álbumes` + `+` icono; ramas `error` (54), `loading` (69, dos `Skeleton`), `albums.length === 0` (85), rail horizontal (103).
- `components/homecloud/AlbumTile.tsx` — `AlbumTile` (105), `AlbumCover` (91), `AlbumCoverImage` (55), `AlbumCoverFallback` (36).
- `components/homecloud/AlbumDetailView.tsx` — overlay anidado, `SectionList`, `selecting={false}` fijo (187), `albumScopeAction` condicional (193-200).
- `components/homecloud/AlbumSheets.tsx` — `AlbumNameSheet`, `AlbumActionsSheet`.
- `components/homecloud/MemoryCollectionAlbumTile.tsx` (en `MemoryCollectionTile.tsx:70`) — grilla de álbumes de la pantalla Colecciones.
- Contratos: `homecloudAlbumsPagination.ts`, `homecloudAlbumDetailPagination.ts`, `homecloudAlbumScope.ts`, `homecloudMemoryMutations.ts`.

### 2.4 Tipos / colecciones automáticas

- `services/homecloud/homecloudMemoryCollectionsPagination.ts` — `MEMORY_TYPE_COLLECTIONS` = `image | video | audio | written` (58-63); `memoryCollectionId` (66) produce `type:<kind>` / `album:<id>`; `buildMemoryCollectionQuery` (106) devuelve `{kind, order:'timeline'}` o `{albumId, order:'album'}`; un SOLO controlador con UNA colección activa.
- `components/homecloud/MemoryCollectionTile.tsx` — `MemoryCollectionTile` (42, sin count) y `MemoryCollectionAlbumTile` (70, con `itemCount`).
- **"Colecciones" NO es una ruta**: es un `ScrollView` completo (`HomeCloudMemoriesScreen.tsx:1518-1573`) + un `SegmentedControl` de dos opciones en el header de selección (`MemorySelectionHeader.tsx:93-111`) + tres estados de `MemorySelectionSource` (`library | collectionsRoot | collection`, `homecloudMemorySelection.ts:104-107`).

### 2.5 Timeline

- `components/homecloud/MemoryTimelineRow.tsx` — fila de 3 columnas, `React.memo` con comparador de datos (214), medición solo con `measureRows` (= `selecting`).
- `components/homecloud/MemorySelectableCard.tsx` — long press + D4 (`PanResponder`, slop 6).
- `components/homecloud/MemoryCards.tsx` — `MemoryImageTile` / `MemoryVideoTile` / `MemoryAudioTile` / `MemoryWrittenTile` + `AlbumScopeRemove` (83).
- `services/homecloud/homecloudMemoriesTimeline.ts` — `groupMemoriesForTimeline` (207) preserva el orden recibido; modo `timeline` pone unknown/año-solo al FINAL, modo `album` los pone al PRINCIPIO; `flattenTimelineForSectionList` (335) pone `yearTitle` solo en la primera sección del año.
- `SectionList`: `sections={gridSections}`, `stickySectionHeadersEnabled={false}`, `onEndReached` 0.6, `ListFooterComponent` con botón "Mostrar más recuerdos", `ListHeaderComponent` = `AlbumsRail` (o `collectionBackHeader` en selección).

### 2.6 Selección

- Contrato puro: `homecloudMemorySelection.ts` — `createMemorySelectionSession`, `enterMemorySelection`, `toggleMemorySelection`, `setMemorySelectionExclusions`, `setMemorySelectionSource`, `cancelMemorySelection`, `confirmMemorySelection`, `resetMemorySelectionScope`.
- Sesión: `{ mode, purpose, source, selectedIds, excludedIds }`; identidad = `contentId`.
- Drag D4: `homecloudMemoryDrag.ts` + `MemorySelectableCard`.
- Ownership de gestos: `homecloudMemoryGestureOwnership.ts` — `scrollMemoryListToOffset`, `solveMemoryRefreshGate`, `createMemoryExitGestureLock`.
- Chrome: `components/homecloud/MemorySelectionHeader.tsx` — `[X] [SegmentedControl Recuerdos|Colecciones] [✓]` + línea de conteo + banda inline de fallos + "Reintentar los que fallaron".
- **No existe** `SelectionBar`, `ContextualActionBar` ni barra inferior contextual.

### 2.7 Viewer

- `components/homecloud/MemoryViewer.tsx` (136 líneas) — overlay absoluto `zIndex: 20`, `FlatList horizontal pagingEnabled`, chrome superior (cerrar + etiqueta semántica) e inferior (`source.label`).
- `activeIndex = Math.max(0, memories.findIndex(m => m.id === activeContentId))` (línea 50).
- `initialScrollIndex={activeIndex}` + `getItemLayout` con `length: width` + efecto `scrollToIndex({animated:false})` en `[activeContentId, activeIndex]` (líneas 72, 80-81).
- `renderItem` monta una `ViewerPage` por elemento; `active={item.id === activeContentId}` (87).
- Páginas: Written `ScrollView style={{width}}` (104), `MemoryVideoPage` (108), `MemoryAudioPage` (109), `MediaPlaceholder {width}` (119/110), `ImagePage` (122-133).
- `Missing` (135) se usa solo si `memories.length === 0`.

- `services/homecloud/homecloudMemoryViewerSource.ts` — `libraryViewerSession` / `albumViewerSession` / `collectionViewerSession` construyen `{source, memories, activeContentId}`; `memoryViewerDataset(source, datasets)` resuelve el dataset VIVO por `source.kind` y `sourceId`.
- **Dato muerto**: `MemoryViewerSession.memories` (la instantánea tomada al abrir) NUNCA se lee. El Viewer consume `viewerMemories`, recalculado del estado vivo.

### 2.8 Media access

- `services/homecloud/homecloudMemoryOriginal.ts` — `getMemoryOriginalUrl`, mapa `originals: Map<contentId, {url, expiresAt}>`, margen 30 s, TTL del servidor o 300 s, `clearMemoryOriginalCache()` **exportada y nunca invocada**.
- `services/homecloud/homecloudMemoryPreview.ts` — `getMemoryPreviewUrl`, mapa `previewUrlCache`, margen 30 s, TTL del servidor o 5 min, `clearMemoryPreviewCache()` **exportada y nunca invocada**.
- `components/homecloud/useMemoryPreviewUrl.ts` — fases `idle | loading | ready | unavailable | error`, un fetch por `contentId`, AbortController.
- Backend: `GET /api/homecloud/content/:id/access?variant=preview|original` (el cliente nunca manda bucket/path).

### 2.9 Media pages

`MemoryVideoPage.tsx` (181 líneas):
- `!active` → placeholder sin `useVideoPlayer`, sin `VideoView`, SIN pedir el original.
- `ActiveMemoryVideoPage` → `MemoryMediaAccess` (generación) + `getMemoryOriginalUrl` + `MemoryVideoPlayer`.
- `MemoryVideoPlayer` — `useVideoPlayer({uri}, p => p.pause())`; `statusChange` → `readyToPlay | error`; revocación por `authorized === false` → `player.pause()`; **nunca llama `play()`**.
- `<VideoView nativeControls contentFit="contain" fullscreenOptions={{enable:false}}>`.

`MemoryAudioPage.tsx` (208 líneas):
- `!active` → placeholder sin pedir el original.
- `ActiveMemoryAudioPage` → `MemoryMediaAccess` + `getMemoryOriginalUrl`.
- `MemoryAudioPlayer` — `useAudioPlayer(uri, {updateInterval: 250})` + `useAudioPlayerStatus(player)`; `status.error` → `'playback'`; revocación → `pause()`; barra de progreso con `audioSeekRatio`/`audioSeekTarget`; `toggle` con replay si terminó; `formatDuration`.
- **No toca `setAudioModeAsync`** (decisión HC2-B explícita).

`MemoryViewer.tsx:122-133` — `ImagePage`: `Animated.Image`, pinch con `PanResponder` de 2 dedos (escala 1..3), pan con `translate` clamp, `scaleValue.current <= 1.01` como frontera de arbitraje, `onPanResponderTerminationRequest`, y `getMemoryOriginalUrl` **para cada página montada, activa o no**.

### 2.10 Acciones / modales

- `components/ui/ActionSheet.tsx` — `Modal transparent animationType="slide"`, `size='full' | 'content' | 'scrollable-content' | 'near-full'`, backdrop `Pressable` con `zIndex: 0`, hoja `zIndex: 1`.
- En Memories hay UN solo `ActionSheet`: el picker de destino "Agregar a un álbum" (1762-1798), abierto solo tras `✓` con `purpose.kind === 'generic'`.
- El Viewer NO es un `Modal`: es un `View` absoluto dentro del mismo árbol (`MemoryViewer.tsx:78`), lo que significa que abrir un `Modal` desde dentro del Viewer no produce modal-sobre-modal nativo.

### 2.11 Cache / loading

- `plannerCache` compartido (`services/plannerCache`) con TTL 30 s para `albums`, `folders`, `content`, `items` (`homecloudReadService.ts:69-74`) y `captureContextToken` para no cruzar household.
- `listMemories` NO pasa por `plannerCache`: va directo por `requestJson`.
- Estados de carga por superficie: Timeline (`MemoriesLoadingSkeleton`, 1809), rail (`AlbumsRail` loading), colección (`skeletonWrap`, 1630), álbum (`AlbumDetailView` `state.loading`), collection detail (`collections.loading`).
- `solveMemoryRefreshGate` desMONTA el `RefreshControl` mientras hay selección (1446).

---

## 3. Physical Observations

### BUG A — Video/Audio Viewer jumps away (iPhone)

Observado por el usuario: al tocar Audio o Video el medio correcto empieza a montarse; durante un instante Audio puede mostrar duración / "Reproducir"; después el Viewer cambia a un Memory de imagen. La misma clase de problema con Video. Las imágenes al menos se abren visiblemente.

### BUG B — Albums initial load / skeleton

Al entrar por primera vez a Memories/Álbumes, las tarjetas de álbum pueden aparecer como bloques skeleton vacíos o como un estado intermedio incorrecto. El intento de arreglo previo no resolvió el problema físico.

### BUG C — Selection changes screen structure

El long press enters selection correctamente. Pero al seleccionar un Memory desde la raíz de Memories, la UI expone/revela la navegación Recuerdos/Colecciones o altera la estructura de pantalla.

### BUG D — Permanent X inside Album

Dentro de un álbum, cada Memory expone un control X/remove permanente. Dos problemas: chrome destructivo permanente en todas las tarjetas; y un artefacto visual — la X es circular pero su superficie/máscara ocupada se ve cuadrada, dejando esquinas blancas.

---

## 4. Runtime Root-Cause Audit

### 4.1 BUG A — Media jumps away

#### CURRENT STATE

`MemoryViewer` es un pager horizontal de página completa que deriva su índice activo del `contentId` y lo reescribe desde el offset físico del `ScrollView`.

#### CODE PATH

1. Tap → `MemorySelectableCard.handlePress` (`MemorySelectableCard.tsx:176-181`) → `onOpen(memory)`.
2. `HomeCloudMemoriesScreen.tsx:1490-1503` → `setViewer(libraryViewerSession(...))` / `collectionViewerSession(...)`, o `:1705` → `albumViewerSession(...)`.
3. `viewerMemories` (`:1106`) resuelve el dataset VIVO por `memoryViewerDataset`.
4. `MemoryViewer` monta el `FlatList` con `initialScrollIndex={activeIndex}` (`:80`).
5. Efecto `useEffect(() => list.current?.scrollToIndex({index: activeIndex, animated: false}), [activeContentId, activeIndex])` (`:72`).
6. `onMomentumScrollEnd` (`:86`) calcula `index = Math.round(contentOffset.x / width)` y llama `onActiveChange(item.id)` → `setViewer` (`:1722`).
7. `activeIndex` se recalcula (`:50`); el efecto de `:72` vuelve a disparar.

#### WRITERS DE `activeContentId`

| # | Escritor | Ubicación | ¿Incondicional? |
| --- | --- | --- | --- |
| W1 | Apertura de sesión (`libraryViewerSession` / `albumViewerSession` / `collectionViewerSession`) | `:644`, `:1492`, `:1705` | sí, una vez por apertura |
| W2 | `onMomentumScrollEnd` → `onActiveChange` | `MemoryViewer.tsx:86` → `:1722` | **SÍ, SIN NINGUNA COMPARACIÓN** |
| W3 | `reset` por `householdId` (`setViewer(null)`) | `:317-322` | sí, pero cierra el Viewer |

**W2 es el único escritor que puede mover el Viewer después del montaje, y no tiene ninguna guarda.**

#### ROOT CAUSES

**A1 — Las páginas de Video y Audio NO declaran el ancho de página.** `PROVEN_STATIC`

- `MemoryViewer.tsx:80-81`: `horizontal pagingEnabled` + `getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}` + `initialScrollIndex={activeIndex}`.
- `react-native@0.86.3` → `@react-native/virtualized-lists/Lists/VirtualizedListCellRenderer.js:207-221`: el renderer por defecto aplica `cellStyle = horizontal ? [styles.row, inversionStyle] : …`, y `styles.row = { flexDirection: 'row' }` (línea 244-246). **El renderer de celda NO fija ningún ancho**: el ancho físico de la página es exactamente el que declare el elemento de página.
- `ImagePage` declara `{width}` (`MemoryViewer.tsx:132`, `styles.imagePage`).
- La página Written declara `style={{ width }}` (`:104`).
- `MediaPlaceholder` declara `style={[styles.placeholder, { width }]}` (`:119`).
- `MemoryVideoPage` devuelve `<View style={styles.placeholder}>` (`:52`), `styles.wrap` (`:154`) y `styles.failure` (`:169`) — **ninguno declara ancho** (`styles` en `:175-180`). `styles.video = { width: '100%' }` (`:178`) se resuelve contra un padre sin ancho.
- `MemoryAudioPage` devuelve `<View style={styles.placeholder}>` (`:57`), `styles.page` (`:153`, `:180`) y `styles.failure` (`:190`) — **ninguno declara ancho** (`styles` en `:199-207`).

Consecuencia: para una página de video o audio, el ancho físico de página ≠ `width`. `getItemLayout` miente para esa página, `initialScrollIndex`/`scrollToIndex` aterrizan fuera de los límites de página, y el snap físico ya no satisface `offset ≈ index * width`. **Esto explica exactamente la asimetría que el usuario reportó**: las imágenes "al menos se abren visiblemente" (declaran ancho) y audio/video no.

**A2 — `onActiveChange` reescribe la autoridad de apertura desde el offset físico, sin guarda de alineación ni de asentamiento.** `PROVEN_STATIC`
`MemoryViewer.tsx:86` no compara contra `activeContentId`, no tiene "opening lock", no tiene marca de "el pager ya se asentó". Cualquier `onMomentumScrollEnd` — incluido uno producido por la alineación inicial que A1 vuelve inconsistente — reemplaza silenciosamente el Memory pedido. Como en orden Timeline las imágenes están al principio, "salta a una imagen" es el resultado predicho.

**A3 — Fallo silencioso al índice 0.** `PROVEN_STATIC`
`MemoryViewer.tsx:50` usa `Math.max(0, memories.findIndex(...))`. Si el Memory tocado está momentáneamente ausente del dataset, `findIndex` devuelve `-1`, `Math.max` devuelve `0` y el Viewer muestra el PRIMER Memory como si fuera el pedido. La guarda de `:77` (`memories.length === 0 || activeIndex < 0`) es **inalcanzable**: `activeIndex` nunca puede ser `< 0`. El dataset puede quedar vacío transitoriamente: `memoryViewerDataset` devuelve `[]` si `source.sourceId !== datasets.album/collection.sourceId` (`homecloudMemoryViewerSource.ts:57-58`), y `:1106` se recalcula en cada render.

**A4 — El dataset del Viewer se reconstruye en cada render del padre para fuentes `collection`.** `PROVEN_STATIC`
`viewerMemories` (`:1106-1110`) no está memoizado; `memoryViewerDataset` llama `.filter(...)` para fuentes tipo (`homecloudMemoryViewerSource.ts:60-62`) → **identidad de `FlatList data` nueva en cada render del padre**. Además `MemoryViewerSession.memories` es un campo muerto.

#### EVIDENCE

| Afirmación | Evidencia |
| --- | --- |
| El renderer de celda no fija ancho | `node_modules/react-native/node_modules/@react-native/virtualized-lists/Lists/VirtualizedListCellRenderer.js:207-221, 244-246` |
| ImagePage sí declara ancho | `MemoryViewer.tsx:132` |
| Written sí declara ancho | `MemoryViewer.tsx:104` |
| MediaPlaceholder sí declara ancho | `MemoryViewer.tsx:119` |
| MemoryVideoPage no declara ancho | `MemoryVideoPage.tsx:52,154,169` + `styles` `:175-180` |
| MemoryAudioPage no declara ancho | `MemoryAudioPage.tsx:57,153,180,190` + `styles` `:199-207` |
| `onMomentumScrollEnd` sin guarda | `MemoryViewer.tsx:86` |
| `Math.max(0, findIndex)` | `MemoryViewer.tsx:50`; guarda inalcanzable `:77` |
| dataset no memoizado | `HomeCloudMemoriesScreen.tsx:1106-1110` |
| `MemoryViewerSession.memories` muerto | `homecloudMemoryViewerSource.ts:11` vs `:1716-1717` (solo se pasa `viewerMemories`, `viewer.source`, `viewer.activeContentId`) |
| La suite HC2-B no cubre esto | `scripts/homecloud_hc2b_media_viewer_tests.ts:203` solo verifica `active={item.id === activeContentId}` |
| La suite HC2-A solo hace grep | `scripts/homecloud_hc2a_memories_viewer_tests.ts:24` verifica `pagingEnabled` + `getMemoryOriginalUrl` + `written` |

#### ROOT CAUSE CONFIDENCE

| Nivel | Aplicación |
| --- | --- |
| `PROVEN_STATIC` | A1, A2, A3, A4 tal como están enunciados arriba |
| `STRONG_EVIDENCE` | Que A1 + A2 son el mecanismo del salto visible (la geometría inconsistente produce offsets que el cálculo de A2 traduce a otro índice) |
| `DEVICE_TRACE_REQUIRED` | El ORDEN exacto de los eventos nativos (`initialScrollIndex` → `scrollToIndex` → `onMomentumScrollEnd`) y cuál de los cuatro defectos se dispara primero en un iPhone real |

No se sube la confianza a PROVEN para la cadena nativa: el fuente no puede observar la secuencia de eventos nativos de `UIScrollView`.

#### MINIMAL CORRECTION (documentada, NO implementada)

1. **Ancho de página uniforme**: pasar `width` a `MemoryVideoPage` y `MemoryAudioPage` y aplicar `{ width }` en su contenedor raíz. Corrección estructural, sin componente nuevo.
2. **La autoridad de apertura es el `contentId` pedido**: mantener `initialScrollIndex`; sustituir el efecto de `:72` por un alineamiento **solo cuando el `activeContentId` cambia a un id distinto**, y añadir un *opening lock* que inhiba escrituras de `onActiveChange` mientras el pager no haya reportado el índice pedido; el lock se libera en el primer `onMomentumScrollEnd` cuyo índice calculado coincide con el pedido.
3. **Sin fallback a índice 0**: usar `findIndex` crudo y renderizar `Missing` cuando sea `-1`. El componente `Missing` ya existe.
4. **Memoizar `viewerMemories`** con dependencias explícitas, y borrar el campo muerto `MemoryViewerSession.memories` o consumirlо de verdad.

Las cuatro son front-only, sin dependencia nueva, sin cambio de arquitectura, sin tocar el backend.

#### REGRESSION TEST REQUIRED

Sí. Hoy ninguna prueba cubre la apertura exacta. La prueba actual más cercana (`hc2b:203`) es un grep de fuente.

#### DEVICE QA REQUIRED

Sí, obligatoria: apertura en índice distinto de 0, sin gesto del usuario, para Audio y Video, desde Library, Album y cada colección.

---

### 4.2 BUG B — Album initial skeleton

#### CURRENT STATE

La fila de álbumes se renderiza como `ListHeaderComponent` de la SectionList de Memories. Tiene su propio controlador con generación, y su propio estado `loading`.

#### CODE PATH (montaje, en orden de efectos)

1. `HomeCloudMemoriesScreen.tsx:373-375` → `railController.load()` → `homecloudAlbumsPagination.ts:100-120` → `generation = 1`, `publish({loading: true, …})`.
2. `:377-384` → `useFocusEffect` → `reloadRail()` → `generation = 2`.
3. `:1311-1334` → reset por household/token → **`railControllerRef.current!.reset()`** → `homecloudAlbumsPagination.ts:126-131` → `generation = 3`, `hasLoadedOnce = false`, `state = ALBUMS_RAIL_INITIAL` (`loading: true`, `albums: []`).

#### ROOT CAUSE

**B1 — El reset de scope se ejecuta DESPUÉS de las lecturas del rail en el mismo commit y las invalida.** `PROVEN_STATIC`

React ejecuta los efectos de montaje en orden de declaración: 373 antes que 1311. Por lo tanto, en el montaje — y en cada cambio de `householdId`/`token`, porque el efecto 373 tiene deps `[loadRail]` y `loadRail` depende de `[token, householdId]` — la secuencia es:

```
load()   -> generation 1   (respuesta descartada: 1 !== 3)
reload() -> generation 2   (respuesta descartada: 2 !== 3)
reset()  -> generation 3   -> loading:true, albums:[] , hasLoadedOnce:false
```

`run()` rechaza toda respuesta cuyo `mine !== generation` (`:110`, `:114`). `reset()` sube la generación y borra `hasLoadedOnce`, así que **ambas respuestas se pierden**.

Y no hay lectura posterior que las reponga:
- `useFocusEffect` tiene identidad estable (`loadFirstPage` deps `[token, householdId]`, `reloadRail` deps `[]`) → no vuelve a dispararse por un cambio de scope.
- Cambiar de `Archivos` a `Recuerdos` es `setSection` local (`HomeCloudScreen.tsx:18,28-35`), **no** un evento de focus.
- El siguiente `reloadRail()` sólo llega al volver a enfocar HomeCloud, mutar un álbum, o pulsar "Reintentar".

⇒ `rail.loading` queda en `true` y `rail.albums` en `[]`, y `AlbumsRail.tsx:69-83` renderiza exactamente **dos `Skeleton variant="card" height={124} width={132}`** en un riel horizontal.

**B2 — Lectura de primera pintura duplicada y contradictoria.** `PROVEN_STATIC`
`loadRail()` (no autoritativa, puede resolver del cache de 30 s) y `reloadRail()` (autoritativa) corren ambas en el montaje; la primera respuesta siempre se descarta. Peor caso: dos lecturas de red; mejor caso: se descarta la respuesta cacheada rápida y el skeleton persiste durante el round-trip autoritativo.

**B3 — La portada del álbum no tiene estado de carga distinguible.** `PROVEN_STATIC`
`AlbumTile.tsx:55-89`: `AlbumCoverImage` renderiza el **mismo** `AlbumCoverFallback` para `phase !== 'ready'` (idle/loading), `phase === 'unavailable'` y `imageFailed`. Mientras la portada se resuelve, la tarjeta ya muestra un cuadrado plano de `background.alt` con un glifo de álbum. Es el segundo tipo de "bloque vacío" del reporte, y no es skeleton: nunca se anuncia.

**B4 — Acoplamiento de todo el cuerpo al `loading` de la Timeline.** `PROVEN_STATIC`
`:1653` — mientras `loading` es `true` el cuerpo entero es `<MemoriesLoadingSkeleton/>` (`:1809`), así que el rail de álbumes **ni siquiera está montado** durante la primera lectura de la Timeline. Aparece después, y entonces muestra skeletons. De ahí la sensación de "los álbumes llegan tarde y luego en skeleton".

#### EVIDENCE — ¿QUÉ SON LOS BLOQUES VACÍOS EXACTAMENTE?

`Skeleton.tsx:23` (`baseColor = colors.background.alt`), `:78-81` (`card: { height, width, borderRadius: radius.xl }`) y `:95` (un único `View` plano con ese background). Son **dos rectángulos grises planos, redondeados, de 132×124**, sin contenido, sin texto y sin diferencia visual con una portada de álbum todavía no resuelta. Por eso el usuario los lee como "tarjetas de álbum en blanco" y no como "cargando".

**No se adivina nada más**: `rail.loading === true` es el único camino de código que produce ese render, y hay prueba estática de que el reset lo deja activo.

#### ROOT CAUSE CONFIDENCE

| Nivel | Aplicación |
| --- | --- |
| `PROVEN_STATIC` | B1 (orden de efectos + rechazo por generación), B2, B3, B4 |
| `STRONG_EVIDENCE` | Que B1 deja el rail **atascado** en el primer montaje, en lugar de lasting un round-trip. Depende de que `useFocusEffect` dispare en el mismo commit que el montaje (comportamiento determinista de `@react-navigation/native@7.2.5`, no de un temporizador nativo) |
| `DEVICE_TRACE_REQUIRED` | Confirmación física del estado final de la fila en el primer ingreso |

Run A debe **probar** la consecuencia con una prueba determinista de orden de efectos/reset, no con una afirmación.

#### MINIMAL CORRECTION (documentada, NO implementada)

1. Que el efecto de reset de scope (1311) **no** se ejecute en el montaje inicial y **no** superscriba la lectura inicial del rail; o equivalently, emitir la lectura del rail DESPUÉS del reset dentro del mismo efecto que posee el scope. Clave: el reset pertenece al scope, y la lectura también.
2. Colapsar la doble lectura de primera pintura en una.
3. Añadir un estado de carga de portada distinguible (`preview-loading`) en lugar de reutilizar el fallback (Run B / C3, con §21).
4. Aplicar el contrato de estados mutuamente excluyentes de §21.

#### REGRESSION TEST REQUIRED

Sí: una prueba determinista que ejecute el controlador del rail y demuestre que un `reset()` seguido de una lectura produce una respuesta, y que la primera pintura no emite dos lecturas.

#### DEVICE QA REQUIRED

Sí: primera entrada a Memories con 0, 1 y N álbumes, con red lenta y sin red.

---

### 4.3 BUG C — Selection mutates the information architecture

#### ROOT CAUSE — `PROVEN_STATIC`

Cuatro CONDICIONALES en el código, todos disparados por entrar en selección:

| # | Condición | Ubicación | Efecto físico |
| --- | --- | --- | --- |
| C1 | `selecting ? <MemorySelectionHeader …/> : <titleRow …/>` | `:1577-1590` | Reemplaza la fila de título por el header de selección |
| C2 | `<SegmentedControl options={[{value:'library',label:'Recuerdos'},{value:'collections',label:'Colecciones'}]} …/>` | `MemorySelectionHeader.tsx:93-111` | **Revela la navegación interna Recuerdos\|Colecciones que el Product Truth elimina** |
| C3 | `ListHeaderComponent={selecting ? collectionBackHeader : <AlbumsRail …/>}` | `:1450-1466` | **La sección Álbumes desaparece del header al entrar en selección** |
| C4 | `selecting && selection.source.kind === 'collectionsRoot' ? collectionsRoot : …` | `:1626-1628` | Cambia el cuerpo ENTERO de la pantalla a la pantalla Colecciones |

Además C5: `confirmSelection` (`:952`) es la única vía a las acciones; con `purpose.kind === 'generic'` el `✓` abre el picker de destino. Es decir, **las acciones contextuales no son visibles al comenzar la selección**: hay que presionar `✓` primero. Eso contradice §12.

Detalle adicional: `switchTab` (`:901-914`) puede mover la selección a `collectionsRoot`, y `enterRemoveFromAlbum` (`:885-899`) fuerza `source` a la colección del álbum — o sea, entrar en selección **dentro de un álbum** cambia la fuente de datos visible a la colección.

#### EVIDENCE

`MemorySelectionHeader.tsx:16-32` documenta la composición congelada actual `[X] Recuerdos | Colecciones [✓]`. `homecloudMemorySelection.ts:104-110` define los tres `MemorySelectionSource`. `HomeCloudMemoriesScreen.tsx:1626-1628` es el swap de cuerpo. `MemorySelectionHeader.tsx:93-111` es el segmented control. `:1450-1466` es el reemplazo del header.

#### ROOT CAUSE CONFIDENCE

`PROVEN_STATIC`. No hay nada nativo ni temporizado en la cadena.

#### MINIMAL CORRECTION (documentada, NO implementada)

1. Eliminar el `SegmentedControl` del header de selección y `MemorySelectionSourceTab` / `onTabChange` / `switchTab`.
2. Dejar `ListHeaderComponent` constante: Álbumes + Tipos + Timeline, sea cual sea el modo.
3. Sacar `source` de la sesión de selección: la colección activa pasa a ser estado de pantalla independiente (`activeCollectionId` ya existe como derivado; hay que promoverlo). La sesión conserva `{mode, purpose, selectedIds, excludedIds}`.
4. Quitar el cuerpo `collectionsRoot` y su `ScrollView`, su ref, su handler de scroll y su rama de offset.
5. Revelar las acciones contextuales al entrar en selección, sin paso `✓` obligatorio.

#### REGRESSION TEST REQUIRED

Sí, y es barato: transiciones puras de la sesión de selección sin `source`, más aserciones de fuente sobre el screen (que la navegación interna no exista).

#### DEVICE QA REQUIRED

Sí: entrar en selección desde la raíz, desde un álbum y desde una colección; comprobar que la estructura de pantalla no cambia.

---

### 4.4 BUG D — Permanent X inside Album

#### ROOT CAUSE, parte 1 — `PROVEN_STATIC`

`AlbumDetailView.tsx:193-200` provee `albumScopeAction` siempre que `canOrganize && !selecting`, es decir, en **cada** tarjeta en modo normal de álbum. `MemoryCards.tsx:83-105` (`AlbumScopeRemove`) lo renderiza en las cuatro variantes de tile (`:190` imagen, `:214` video, `:236` audio, `:264` written). No hay condición de estado que lo esconda.

La vía contextual ya existe y funciona: `enterRemoveFromAlbum(openAlbumId, contentId)` (`:885-899`) entra en selección con `purpose: {kind:'removeFromAlbum'}` y `confirmSelection` corre `runAlbumMemberships('remove', …)`.

#### ROOT CAUSE, parte 2 (artefacto de esquinas blancas) — `PROVEN_STATIC`

- `MemoryCards.tsx:311-317`: el envoltorio `styles.albumScope` = `{ position:'absolute', right, top, zIndex:2, backgroundColor: colors.surface.card }` — **pinta un fondo blanco y NO tiene `borderRadius`**.
- `AppButton.tsx:123`: `borderRadius: isIcon ? radius.full : radius.button`; `theme.ts:367`: `radius.full = 9999`.
- `AppButton.tsx:91,120,124`: `variant="icon"` ⇒ `container: { backgroundColor: colors.surface.soft, borderColor: colors.border.subtle }` + `borderWidth: 1`.

Resultado: un **cuadrado blanco** de exactamente el tamaño del botón se pinta detrás de un botón **circular**. Las cuatro esquinas del cuadrado quedan visibles. Es un defecto de estilo, demostrable sin dispositivo.

#### EVIDENCE

`AlbumDetailView.tsx:193-200`; `MemoryCards.tsx:83-105, 190, 214, 236, 264, 311-317`; `AppButton.tsx:91,120,123,124`; `theme.ts:355-368`; `HomeCloudMemoriesScreen.tsx:885-899, 952-1016`.

#### ROOT CAUSE CONFIDENCE

`PROVEN_STATIC` en ambas partes.

#### MINIMAL CORRECTION (documentada, NO implementada)

1. Dejar de pasar `albumScopeAction` desde `AlbumDetailView` y eliminar `AlbumScopeRemove` + el tipo `MemoryAlbumScopeAction` de `MemoryCards`/`MemorySelectableCard`. La eliminación de una membresía se vuelve una acción contextual (selección → `Quitar del álbum`).
2. Con eso desaparece también el artefacto de esquinas blancas (no queda ningún envoltorio cuadrado). **No** hace falta "arreglar" el radio: el leave-out es la corrección mínima.
3. Limpiar en cascada: `onRemoveMemory`, `removingContentId`, y `removeMemoryFromOpenAlbum` (`HomeCloudMemoriesScreen.tsx:581-595`) quedan sin llamador. Run A debe conservar `removeMemoryFromOpenAlbum` como helper (no es UI) porque Run B (C6) lo reconecta a la acción de un solo Memory en el Viewer; Run A elimina sólo el cableado visual.

#### REGRESSION TEST REQUIRED

Sí: que ninguna superficie pase `albumScopeAction` en modo normal, y que la semántica de la eliminación de membresía siga siendo `removeFromAlbum`.

#### DEVICE QA REQUIRED

No estrictamente para el artefacto (es estilo). Sí para comprobar que la eliminación de membresía sigue siendo alcanzable y honesta tras el leave-out.

---

## 5. Viewer Writer Map

### 5.1 `viewer.activeContentId`

| Escritor | Ubicación | Dirección | Guarda |
| --- | --- | --- | --- |
| `libraryViewerSession(memories, memory.id)` | `:644` (vía `openLibraryViewer`) | set | `if (isMemorySelecting) return` |
| `collectionViewerSession(…, memory.id)` | `:1492-1503` | set | idem |
| `albumViewerSession(…, memory.id)` | `:1705-1710` | set | idem |
| `onActiveChange` desde `onMomentumScrollEnd` | `MemoryViewer.tsx:86` → `:1722` | set | **NINGUNA** |
| `setViewer(null)` por cambio de household | `:317-322` | clear | sí |

### 5.2 Índice activo

| Derivación | Ubicación | Nota |
| --- | --- | --- |
| `activeIndex = Math.max(0, memories.findIndex(…))` | `MemoryViewer.tsx:50` | Recalculado en cada render; **`Math.max` convierte "no encontrado" en 0** |
| `getItemLayout` | `MemoryViewer.tsx:81` | `length: width` — Mentira para páginas video/audio (A1) |
| `initialScrollIndex` | `MemoryViewer.tsx:80` | Sólo en el montaje |
| `scrollToIndex({animated:false})` | `MemoryViewer.tsx:72` | Dispara en CADA cambio de `activeContentId` o `activeIndex` —including los provocados por W2, lo que realimenta el ciclo |
| `Math.round(contentOffset.x / width)` | `MemoryViewer.tsx:86` | Índice físico traducido a contenido |

### 5.3 Dataset

| Productor | Ubicación | Identidad |
| --- | --- | --- |
| `libraryViewerSession` captura `memories` | `:644` | instantánea — **campo muerto** |
| `viewerMemories` (dataset real) | `:1106-1110` | `library`: estable. `album`: `detail.memories`. `collection`: `.filter(...)` → **identidad nueva en cada render** |
| `loadMore` (library) | `:295-311` | `setMemories` con dedupe por id → **identidad nueva** |
| `loadMoreDetail` | `:431-433` | **identidad nueva** |
| `collections.loadMore` | `:1726` | **identidad nueva** |
| `readFirstPage` / `refresh` / reconciliación | `:275-293`, `:332-340` | `setMemories([...page.memories])` → **identidad nueva y objetos nuevos** |
| `closeAlbum` → `openAlbumId = null` | `:421-425` | hace que `memoryViewerDataset` devuelva `[]` para fuente `album` |

### 5.4 Fuente

| Productor | Ubicación |
| --- | --- |
| `viewer.source` (kind/label/sourceId) | solo al abrir, vía las tres fábricas de sesión |

`source` es efetivamente inmutable durante la vida del Viewer. **La fuente NO es el problema de BUG A.**

---

## 6. Root IA Audit

### CURRENT

```
HomeCloud (global)
└─ Archivos | Recuerdos            <- SegmentedControl GLOBAL (HomeCloudScreen.tsx:28-35)
   └─ Memories root
      ├─ titleRow: "Recuerdos" + botón Refresh + MemoryIntake "+"      (:1592-1611)
      ├─ ListHeaderComponent = AlbumsRail                               (:1454-1464)
      │     "Álbumes" + [+] | riel horizontal | loading = 2 skeletons
      │     empty = icono + "Todavía no hay álbumes" + "Crear álbum"
      ├─ SectionList (Timeline agrupado por año/mes)                   (:1414-1515)
      ├─ ListFooterComponent = "Mostrar más recuerdos"
      └─ (solo en selección) cuerpo = Colecciones ScrollView           (:1518-1573)
            "Colecciones"
            Álbumes  -> grilla de MemoryCollectionAlbumTile
            Tipos    -> grilla de MemoryCollectionTile (Fotos/Videos/Audios/Notas)
```

### TARGET

```
HomeCloud (global, intacto)
└─ Archivos | Recuerdos
   └─ MemoriesRoot  (UN scroll vertical, UNA sola IA)
      ├─ Sección "Álbumes"   [ + Nuevo ]   -> riel horizontal
      ├─ Sección "Tipos"                   -> riel horizontal (Fotos Videos Audios Notas)
      └─ Timeline                          SectionList agrupado por tiempo/fecha
```

### REAL GAP

| Gap | Evidencia |
| --- | --- |
| G1 — El `+` de Crear álbum está en el header del rail, no como CTA de sección con etiqueta | `AlbumsRail.tsx:127-143` |
| G2 — No existe una fila de Tipos en la raíz: la colección automática sólo se alcanza vía la pantalla Colecciones, que **sólo existe durante la selección** | `openCollection` se llama únicamente en `:1553` y `:1568`, ambos dentro de `collectionsRoot`, que se renderiza únicamente bajo `selecting` (`:1626-1628`) |
| G3 — La pantalla Colecciones es un `ScrollView` paralelo con su propio offset, back y título | `:1518-1573`, `rootScrollRef`, `handleRootScroll`, rama `collectionsRoot` de `scrollOffsetsRef`/`scrollTo` (`:1215-1223`), `backToCollectionsRoot` (`:923-928`), rama de `BackHandler` (`:1239-1244`) |
| G4 — `sourceKey` incluye la colección y `kind` de selección | `:664-668` |
| G5 — `gridMemories`/`gridSections`/`gridGroupingMode` ramifican por colección | `:1075-1127` |
| G6 — El header de selección sustituye al rail | `:1450-1466` |
| G7 — El contenido de `MemoryCollectionAlbumTile` es la MISMA información que `AlbumTile`, duplicada | `MemoryCollectionTile.tsx:70-111` vs `AlbumTile.tsx:105-148` |

**El gap más profundo (G2)**: hoy **no existe ninguna ruta en modo normal hacia una colección automática.** El único camino normal es `AlbumsRail` → `openAlbum` (overlay anidado). Si se borra la pantalla Colecciones sin crear la fila de Tipos, las colecciones dejan de ser alcanzables. La fila de Tipos **debe existir antes** de poder borrar la pantalla.

---

## 7. Selection Audit

### CURRENT

| Aspecto | CURRENT | TARGET | Gap |
| --- | --- | --- | --- |
| Entrada | long press (`:830-842`) | igual | — |
| Dataset en modo library | el mismo `memories` canónico | igual | — |
| Dataset en colección | cambia a `collections.memories` | la colección activa es un estado de pantalla, no un sub-modo de selección | G5 |
| Header | `[X] [Recuerdos\|Colecciones] [✓]` | `[X] N seleccionados [acciones]` | C2 |
| ListHeader | `collectionBackHeader` (o `null`) | constante Álbumes + Tipos | C3/G6 |
| Estructura de pantalla | puede cambiar a `collectionsRoot` | nunca cambia | C4 |
| Acciones | sólo tras `✓` | visibles al entrar | C5 |
| Conteo | sí | sí | — |
| Cancel | sí | sí | — |
| Scroll | preservado por `scrollOffsetsRef` | preservado | — |

### STATE MACHINE actual

```
normal
  └─ longPress(id) ──> enterMemorySelection({purpose:{kind:'generic'}, source:LIBRARY, initial:[id]})
selecting (source = library | collectionsRoot | collection)
  ├─ tap(id)          ──> toggleMemorySelection
  ├─ longPress(id)    ──> (no-op) + armMemoryDrag
  ├─ drag             ──> applyMemoryVisualRange sobre drag.baselineSelectedIds
  ├─ tab 'Colecciones'──> setMemorySelectionSource(collectionsRoot)   [C4: cambia el cuerpo]
  ├─ tab 'Recuerdos' ──> setMemorySelectionSource(library)
  ├─ ✓                ──> generic   -> abre picker de destino (modal)
  │                       addToAlbum / removeFromAlbum -> valida destino -> runAlbumMemberships
  ├─ fallo parcial    ──> selectionFailure + selectedIds = fallidos
  ├─ "Reintentar"     ──> runAlbumMemberships(solo los fallidos)
  └─ X / Back         ──> cancelMemorySelection -> normal, restaura origen
```

### STATE MACHINE objetivo (congelado)

```
normal
  └─ longPress(id) ──> selecting { purpose, selectedIds:[id], excludedIds }
selecting  (superficie = la MISMA; activaCollection = estado de pantalla independiente)
  ├─ tap(id)          ──> toggle
  ├─ drag             ──> range (D4 intacto)
  ├─ acciones         ──> visibles desde el primer fotograma de la selección
  │      root/album/collection -> contextual, sin ✓ obligatorio
  ├─ fallo parcial    ──> banda inline + retry de los fallidos (se conserva)
  └─ X / Back         ──> volver a normal, misma superficie, mismo offset
```

---

## 8. Albums Audit

| Aspecto | CURRENT | TARGET | Gap |
| --- | --- | --- | --- |
| Ubicación | riel horizontal en el `ListHeaderComponent` | sección de la raíz, siempre presente | — |
| CTA crear | `AppButton variant="icon"` con `+` en el header (`:127-143`) | `Álbumes  + Nuevo` en el header de sección, independiente del scroll | G1 |
| Estado loading | 2 skeletons de 132×124 | sólo mientras se espera contenido real | B1 |
| Estado vacío | icono + copy + "Crear álbum" | onboarding mínimo (patrón tipo galería preestablecida) | menor |
| Estado error | `ErrorState` + Reintentar | igual | — |
| Portada | `AlbumCoverImage` con fallback único para loading/unavailable/error | estado de carga distinguible | B3 |
| `itemCount` | verbatim del servidor | intacto | — |
| Orden | el que llega del servidor | intacto | — |
| X permanente | en cada tarjeta | ninguna | D |
| Quitar del álbum | X por tarjeta + selección + ✓ | solo selección → acción contextual | D |
| Detalle de álbum | overlay anidado | intacto | — |
| Delete de álbum | hoja con copy "Los recuerdos no se eliminan" | intacto | — |

**Contratos de dominio que HC2-C NO toca** (verificados en el código y en los tests deterministas que pasan): álbum compartido por household; Memory↔Album N:M; delete de álbum NO borra Memories (`HomeCloudMemoriesScreen.tsx:507-528` + `homecloudAlbumScope.ts:38-39`); cover = visual activo más antiguo en orden canónico de álbum (`homecloudTypes.ts:176-180`); `itemCount` = total de Memories activos (`homecloudAlbumScope.ts:81-92`); orden de álbum = más antiguo → más nuevo (`homecloudMemoriesTimeline.ts:270-275`).

---

## 9. Viewer Correctness Audit

Sources: `library` | `album` | `collection:image` (Fotos) | `collection:video` (Videos) | `collection:audio` (Audios) | `collection:written` (Notas) | `collection:album` (vía Colecciones).

Media: `image` | `video` | `audio` | `written`.

### 9.1 Matriz source × media (apertura exacta, índice distinto de 0, sin gesto, re-render, actualización de dataset, pager)

| source × media | ¿Abre el item exacto? | ¿Permanece? | Evidencia / causa |
| --- | --- | --- | --- |
| library × image | PROVEN_STATIC sí | estable | declara ancho |
| library × video | **FALLA** | **FALLA** | A1 + A2 |
| library × audio | **FALLA** | **FALLA** | A1 + A2 |
| library × written | sí | estable | declara ancho |
| album × image | sí | estable | |
| album × video | **FALLA** | **FALLA** | A1 + A2 |
| album × audio | **FALLA** | **FALLA** | A1 + A2 |
| album × written | sí | estable | |
| Fotos × image | sí | degradable | dataset re-filtrado en cada render (A4) |
| Videos × video | **FALLA** | **FALLA** | A1 + A2 + A4 |
| Audios × audio | **FALLA** | **FALLA** | A1 + A2 + A4 |
| Notas × written | sí | degradable | A4 |
| colección de álbum × cualquiera | sí mientras el `sourceId` coincida | **riesgo**: si `collections.collectionId` cambia, el dataset cae a `[]` | `homecloudMemoryViewerSource.ts:58` |

### 9.2 Cierre de corrección a congelar (antes de C5)

- Toda página del Viewer declara el ancho de página.
- El `contentId` pedido sobrevive al montaje.
- Ningún callback de layout/scroll, ningún índice por defecto, ninguna actualización de dataset y ningún evento de momentum inicial puede reemplazarlo antes de que se establezca la alineación.
- La fuente del pager es exactamente la fuente de apertura y sólo esa.
- Cerrar devuelve al contexto correcto.

---

## 10. Capability Matrix

Leyenda de clasificación primaria (una sola por capacidad): `SUPPORTED_NOW`, `SUPPORTED_WITH_CURRENT_STACK`, `REQUIRES_CUSTOM_GESTURE`, `REQUIRES_NEW_DEPENDENCY`, `DEVICE_ONLY_VERIFY`, `DEFER`.

### 10.1 IMAGE (`MemoryViewer.tsx:122-133`)

| Capacidad | Estado actual | Clasificación primaria | Evidencia de API instalada | Requisito de implementación | Conflicto de gesto | Expo Go | Device QA | Decisión | Razón |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pinch zoom | `PanResponder` 2 dedos, escala 1..3 (`:127-130`) | `SUPPORTED_NOW` | RN core `PanResponder`; sin RNGH/Reanimated instalados | ninguno | el pager toma el gesto cuando no hay 2 dedos | EXPO_GO_SAFE | sí (feel) | IN | ya funciona |
| Pan | `translate` clamp ±width / ±500 con `scaleValue>1.01` (`:129`) | `SUPPORTED_NOW` | idem | ninguno | arbitration por `onPanResponderTerminationRequest` | EXPO_GO_SAFE | sí | IN | ya funciona |
| Double-tap zoom | **no implementado** | `REQUIRES_CUSTOM_GESTURE` | RN core no ofrece tap-count; sin RNGH | arbitrar tap contra toggle de chrome y contra el pager | alto | EXPO_GO_SAFE | sí | **DEFER** | valor medio, riesgo real de comer taps |
| Double-tap reset | **no implementado** | `REQUIRES_CUSTOM_GESTURE` | ídem | ídem | alto | EXPO_GO_SAFE | sí | **DEFER** | mismo motivo |
| Pager a escala ≈1 | `onMoveShouldSetPanResponder` false con 1 dedo (`:127`) | `SUPPORTED_NOW` | — | ninguno | resuelto | EXPO_GO_SAFE | sí | IN | ya correcto |
| Arbitration al hacer zoom | `onPanResponderTerminationRequest: () => scaleValue.current <= 1.01` (`:130`) | `SUPPORTED_NOW` | — | ninguno | resuelto | EXPO_GO_SAFE | sí | IN | ya correcto |
| Reset de zoom al cambiar de página | estructural: `keyExtractor = memory.id` ⇒ página nueva monta con `scaleValue=1` (`:126`) | `SUPPORTED_NOW` | — | ninguno | — | EXPO_GO_SAFE | sí | IN | ya correcto por construcción |
| Reset al reabrir el Viewer | el Viewer remonta ⇒ todas las páginas remontan | `SUPPORTED_NOW` | — | ninguno | — | EXPO_GO_SAFE | no | IN | ya correcto |
| Rotation / layout | `useWindowDimensions` → `width` (`:48`); efecto de imagen NO depende de `width`, el zoom sobrevive | `SUPPORTED_NOW` | — | ninguno | — | EXPO_GO_SAFE | sí | IN | ya correcto |
| Compartir (OS) | ausente en el Viewer | `SUPPORTED_WITH_CURRENT_STACK` | `expo-sharing@57.0.22` `isAvailableAsync`/`shareAsync`; `expo-file-system@57.0.7` `File.createDownloadTask`; costura existente `homecloudDownloadService.ts:51-115` | descarga a archivo local + `shareAsync(uri)` | ninguno | EXPO_GO_SAFE | sí (share sheet) | **IN (Run B)** | la costura ya existe y está probada en Files |
| Error / retry | mensaje honesto pero **sin reintento** (`:132`) | `SUPPORTED_WITH_CURRENT_STACK` | `getMemoryOriginalUrl` rejecta; reintentar = repetir el efecto | token de reintento en `ImagePage` | ninguno | EXPO_GO_SAFE | no | **IN (Run A, C4)** | un error sin recuperación es un hueco de corrección, no de gamificación |
| Acceso al original de alta resolución | `getMemoryOriginalUrl`, `uri = original ?? preview` (`:126,131`) | `SUPPORTED_NOW` | — | ninguno | — | EXPO_GO_SAFE | sí | IN | ya correcto |
| Estado de carga | `ActivityIndicator` + "Cargando recuerdo…" (`:132`) | `SUPPORTED_NOW` | — | ninguno | — | EXPO_GO_SAFE | no | IN | ya correcto |

### 10.2 VIDEO (`MemoryVideoPage.tsx`)

| Capacidad | Estado actual | Clasificación primaria | Evidencia de API instalada | Requisito | Conflicto de gesto | Expo Go | Device QA | Decisión | Razón |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Play | `nativeControls` (`:148`) | `SUPPORTED_NOW` | `VideoViewProps.nativeControls` default `true` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya funciona |
| Pause | nativo + `player.pause()` en revocación (`:142-145`) | `SUPPORTED_NOW` | `VideoPlayer.pause()` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya funciona |
| Scrub | barra nativa | `SUPPORTED_NOW` | barra inferior nativa; `buttonOptions` es `@platform android` | ninguna | la barra nativa vive dentro de la celda del pager | EXPO_GO_SAFE | **sí, DEVICE_ONLY** | IN | el feel es nativo |
| Tiempo actual / duración | controles nativos + `showsTimecodes` default `true` | `SUPPORTED_NOW` | `VideoViewProps.showsTimecodes` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya funciona |
| Fullscreen | **DESHABILITADO** `fullscreenOptions={{enable:false}}` (`:148`) | `SUPPORTED_WITH_CURRENT_STACK` | `FullscreenOptions.enable` default `true`; `FullscreenOrientation`; `onFullscreenEnter/Exit` | **una prop** | fullscreen dentro de un `FlatList` paginado con overlay `zIndex:20` | EXPO_GO_SAFE | **sí, DEVICE_ONLY** | **IN (Run B)** | valor alto, coste una prop |
| Velocidad 0.5×/1×/1.5×/2× | no expuesta | `SUPPORTED_WITH_CURRENT_STACK` | `VideoPlayer.playbackRate` (0..16) | UI de velocidad | competiría con `nativeControls` | EXPO_GO_SAFE | sí | **DEFER** | el chrome nativo ya posee la superficie de video; una fila de velocidad propia es arquitectura nueva |
| Mute | `VideoPlayer.muted` disponible, no expuesta | `SUPPORTED_WITH_CURRENT_STACK` | `muted: boolean` | UI | ídem | EXPO_GO_SAFE | sí | **DEFER** | en iOS el volumen es del dispositivo; valor bajo |
| Volumen | `VideoPlayer.volume` 0..1, no expuesto | `SUPPORTED_WITH_CURRENT_STACK` | `volume: number` | UI | ídem | EXPO_GO_SAFE | sí | **DEFER** | ídem |
| Buffering | overlay mientras `status !== 'readyToPlay'` (`:149`) | `SUPPORTED_NOW` | `VideoPlayer.status` `idle\|loading\|readyToPlay\|error`; `bufferedPosition` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya honesto |
| Error de reproducción | `statusChange` → `resolveMemoryMediaFailure` (`:113-136`) | `SUPPORTED_NOW` | `VideoPlayerEvents.statusChange` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya correcto |
| "No soportado" | `VideoTrack.isSupported` es `@platform android`; en iOS se informa `playback` a propósito (`:120-124`) | `SUPPORTED_NOW` | `VideoTrack.isSupported` documentado `@platform android` | ninguna | — | EXPO_GO_SAFE | sí | IN | honesto y delimitado por evidencia |
| Double-tap −10 s / +10 s | no implementado | `REQUIRES_CUSTOM_GESTURE` | `VideoPlayer.seekBy(seconds)` existe | detector de doble tap sobre la superficie de video | alto: `nativeControls` también captura taps | EXPO_GO_SAFE | sí | **DEFER** | la API existe pero el gesto no |
| Pinch zoom (video) | no implementado | `REQUIRES_CUSTOM_GESTURE` | `VideoView` sólo expone `contentFit`; no hay API de zoom | contenedor con transform + arbitraje | muy alto | EXPO_GO_SAFE | sí | **DEFER** | |
| Pan al hacer zoom (video) | no implementado | `REQUIRES_CUSTOM_GESTURE` | ídem | ídem | muy alto | EXPO_GO_SAFE | sí | **DEFER** | |
| Coexistencia pager ↔ gestos | `onScrollBeginDrag` revoca la reproducción | `DEVICE_ONLY_VERIFY` | `ScrollView` horizontal de RN dentro de celda con vista nativa | nada que cambiar | **es el punto a verificar** | EXPO_GO_SAFE | **sí, obligatorio** | IN (verificar) | es corrección, no funcionalidad |
| Coexistencia `nativeControls` | activo | `DEVICE_ONLY_VERIFY` | — | nada | **es el punto a verificar** | EXPO_GO_SAFE | **sí, obligatorio** | IN (verificar) | |
| Compartir (OS) | ausente, y el archivo de fallo lo dice explícitamente (`:157-161`) | `SUPPORTED_WITH_CURRENT_STACK` | `homecloudDownloadService` | descarga + `shareAsync` | ninguno | EXPO_GO_SAFE | sí | **IN (Run B)** | |
| Background | `authorized===false` → `pause()`; `staysActiveInBackground` default `false` | `SUPPORTED_NOW` | `VideoPlayer.staysActiveInBackground` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya correcto |
| Foreground | nada llama `play()` salvo el usuario | `SUPPORTED_NOW` | — | ninguna | — | EXPO_GO_SAFE | sí | IN | ya correcto |
| Orientación / fullscreen | pendiente de la decisión de fullscreen | `SUPPORTED_WITH_CURRENT_STACK` | `FullscreenOptions.orientation`, `autoExitOnRotate` | con la prop de fullscreen | — | EXPO_GO_SAFE | **DEVICE_ONLY** | con fullscreen | |

### 10.3 AUDIO (`MemoryAudioPage.tsx`)

| Capacidad | Estado actual | Clasificación primaria | Evidencia de API instalada | Requisito | Conflicto | Expo Go | Device QA | Decisión | Razón |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Play | botón `Reproducir` (`:176`) | `SUPPORTED_NOW` | `AudioPlayer.play()` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya funciona |
| Pause | mismo botón | `SUPPORTED_NOW` | `pause()` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya funciona |
| Progreso | barra (`:167-169`) | `SUPPORTED_NOW` | `useAudioPlayerStatus` | ninguna | — | EXPO_GO_SAFE | no | IN | ya funciona |
| Tiempo actual | `formatDuration(status.currentTime)` (`:174`) | `SUPPORTED_NOW` | `AudioStatus.currentTime` | ninguna | — | EXPO_GO_SAFE | no | IN | ya funciona |
| Duración | `validMediaDuration(status.duration)` | `SUPPORTED_NOW` | `AudioStatus.duration` | ninguna | — | EXPO_GO_SAFE | no | IN | ya funciona |
| Seek | toque sobre la barra vía `audioSeekRatio`/`audioSeekTarget` (`:140-147`) | `SUPPORTED_NOW` | `seekTo(seconds, tolBefore?, tolAfter?)` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya funciona |
| −10 s / +10 s | no implementado | `SUPPORTED_WITH_CURRENT_STACK` | `AudioPlayer.seekTo(seconds)` | dos helpers puros + dos botones | ninguno (UI propia) | EXPO_GO_SAFE | sí | **IN (Run B)** | API y helpers ya existen |
| 0.5× / 1× / 1.5× / 2× | no implementado | `SUPPORTED_WITH_CURRENT_STACK` | `playbackRate` iOS 0.0–2.0 / Android 0.1–2.0; `setPlaybackRate(rate, pitchCorrectionQuality?)` | selector de velocidad | ninguno | EXPO_GO_SAFE | sí | **IN (Run B)** | API instalada, rango suficiente |
| Buffering | sólo "Cargando audio…" mientras `!isLoaded` (`:158`); una stalls en reproducción no se anuncia | `SUPPORTED_WITH_CURRENT_STACK` | `AudioPlayer.isBuffering` | rama honesta de buffering | ninguno | EXPO_GO_SAFE | sí | **IN (Run B)** | pequeño y honesto |
| Error | `status.error` → `'playback'` (`:114-119`) | `SUPPORTED_NOW` | `AudioStatus.error` | ninguna | — | EXPO_GO_SAFE | sí | IN | ya correcto |
| "No soportado" | no hay API que lo reporte en iOS; se informa `playback` | `SUPPORTED_NOW` | — | ninguna | — | EXPO_GO_SAFE | sí | IN | honesto |
| Compartir (OS) | ausente | `SUPPORTED_WITH_CURRENT_STACK` | `expo-sharing` + `expo-file-system` | descarga + `shareAsync` | ninguno | EXPO_GO_SAFE | sí | **IN (Run B)** | |
| Background | `authorized===false` → `pause()`; release por hook al desmontar | `SUPPORTED_NOW` | `useAudioPlayer` libera | ninguna | — | EXPO_GO_SAFE | sí | IN | ya correcto |
| Foreground | nada reanuda solo | `SUPPORTED_NOW` | — | ninguna | — | EXPO_GO_SAFE | sí | IN | ya correcto |
| Sesión / ruta de audio | HC2-B deliberadamente NO toca `setAudioModeAsync` | `SUPPORTED_NOW` | `setAudioModeAsync` existe pero no se invoca | ninguna | — | EXPO_GO_SAFE | sí | IN | no cambiar en HC2-C |
| Bocina / auriculares | no implementado | `DEFER` | `setAudioModeAsync` | reconfigurar sesión de audio | — | EXPO_GO_SAFE | sí | **DEFER** | riesgo de audio con valor bajo; decisión HC2-B explícita |
| Frecuencia de actualización | `updateInterval: 250` y estado LOCAL a la página (`:104-105`) | `SUPPORTED_NOW` | `useAudioPlayer(source,{updateInterval})` | ninguna | — | EXPO_GO_SAFE | no | IN | 4 Hz no repinta el pager |
| Etiquetas de accesibilidad | `accessibilityRole="adjustable"` + `accessibilityValue` (`:160-165`) | `SUPPORTED_NOW` | RN core | ninguna | — | EXPO_GO_SAFE | no | IN | ya correcto |

### 10.4 WRITTEN (`MemoryViewer.tsx:104`)

| Capacidad | Estado actual | Clasificación primaria | Evidencia | Requisito | Conflicto | Expo Go | Device QA | Decisión | Razón |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scroll de texto largo | `ScrollView style={{width}}` (`:104`) | `SUPPORTED_NOW` | — | ancho explícito (A1 ya lo resuelve para Written) | drags horizontales los toma el pager | EXPO_GO_SAFE | sí | IN | ya correcto |
| Copiar todo | no implementado | `SUPPORTED_WITH_CURRENT_STACK` | `react-native@0.86.3` `Libraries/Components/Clipboard/Clipboard.js` expone `setString`; el getter de `react-native/index.js:217-222` **advertisce que se va a quitar** y recomienda `@react-native-clipboard/clipboard` (NO instalado) | una llamada | ninguna | EXPO_GO_SAFE | sí | **IN (Run B)** | evita una dependencia nueva; la deprecación queda registrada como deuda |
| Selección de texto | no implementado | `DEFER` | `Text selectable` de RN existe pero compite con el pager | — | alto | EXPO_GO_SAFE | sí | **DEFER** | "Copiar todo" cubre el caso real con mucho menos riesgo |
| Compartir (sistema, texto) | no implementado | `SUPPORTED_NOW` | RN core `Share.share({message})`; **ya usado** en `screens/InvitarPersonas.tsx:110` y `components/family/InviteLinkSheetFinal.tsx:98`. `expo-sharing` exige URI de archivo local ⇒ no sirve para texto | una llamada | ninguna | EXPO_GO_SAFE | sí | **IN (Run B)** | precedente ya en el repo |
| Acciones de organización | no en el Viewer | `SUPPORTED_WITH_CURRENT_STACK` | gramática de selección + `runMemoryAlbumMutation` | grammar de acciones | ninguno | EXPO_GO_SAFE | sí | **IN (Run B, C6)** | |
| Loading / error | un Written no tiene acceso binario: no hay nada que falle | `SUPPORTED_NOW` | `HomeCloudMemory.writtenText`, binarios `null` (`homecloudTypes.ts:90-97`) | ninguna | — | EXPO_GO_SAFE | no | IN | por construcción |
| Fecha / contexto semántico | `memorySemanticLabel` + `memoryPrimaryText` (`:104`) | `SUPPORTED_NOW` | — | ninguna | — | EXPO_GO_SAFE | no | IN | ya correcto |
| Interacción con el pager | scroll vertical dentro de pager horizontal | `SUPPORTED_NOW` | — | ninguna | — | EXPO_GO_SAFE | **sí** | IN | ya correcto |

### 10.5 SHARE (§34)

| Capacidad | Estado actual | Clasificación primaria | Evidencia | Requisito | Riesgo | Expo Go | Device QA | Decisión | Razón |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OS SHARE de binario (imagen/video/audio) | existe la costura completa en `homecloudDownloadService.ts` (usada por Files) pero **no desde Memories** | `SUPPORTED_WITH_CURRENT_STACK` | `expo-file-system@57.0.7` `File.createDownloadTask`, `Directory`, `Paths`; `expo-sharing@57.0.22` `isAvailableAsync`, `shareAsync`; política `homecloudDownloadPolicy.validateDownloadedFile` | adaptador Memory→archivo local + `shareAsync(uri)` | narrowed de tipos: un `HomeCloudMemoryListItem` tiene `displayName/mimeType/sizeBytes` **anulables** (`homecloudTypes.ts:111`) | EXPO_GO_SAFE | sí (share sheet) | **IN (Run B)** | reutiliza una costura ya probada |
| Nunca exponer la signed URL como payload | ya garantizado por arquitectura: `shareHomeCloudDownloadedFile` sólo acepta un `HomeCloudLocalFile` local | `SUPPORTED_NOW` | `homecloudDownloadService.ts:101-115` | mantener | exposición de URL firmada con expiración | EXPO_GO_SAFE | — | IN | congelar explícitamente |
| Ciclo de vida del archivo temporal | **FUGA**: escribe en `Paths.document/HomeCloud/<safeFileName>` (`:65-67`) y **nunca borra**; compartir dos veces reescribe el mismo nombre | `SUPPORTED_WITH_CURRENT_STACK` | misma API `File`/`Directory` | borrar tras `shareAsync`, o escribir en `Paths.cache` | crecimiento no acotado | EXPO_GO_SAFE | sí | **IN (Run B, C7)** | defecto probado por lectura de fuente |
| Expiración / privacidad de la signed URL | `downloadHomeCloudOriginal` pide acceso nuevo por llamada; `getMemoryOriginalUrl` respeta expiración con margen | `SUPPORTED_NOW` | `homecloudReadService.fetchHomeCloudContentAccess`; `homecloudMemoryOriginal.ts:14-15` | ninguna | bajo | EXPO_GO_SAFE | — | IN | |
| OS SHARE de texto (Written) | no implementado | `SUPPORTED_NOW` | RN core `Share.share` (precedente en repo) | una llamada | bajo | EXPO_GO_SAFE | sí | **IN (Run B)** | |
| **HomeCloud household sharing** | — | — | — | — | — | — | — | **FUERA DE ALCANCE** | es otra función; HC2-C habla de OS SHARE |

### 10.6 CLIPBOARD (§35)

| Capacidad | Estado actual | Clasificación primaria | Evidencia | Requisito | Expo Go | Device QA | Decisión | Razón |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Copiar texto al portapapeles | no implementado | `SUPPORTED_WITH_CURRENT_STACK` | `react-native@0.86.3` `Libraries/Components/Clipboard/Clipboard.js` (`getString`/`setString`) + `NativeClipboard.js` presente; `react-native/index.js:217-222` advierte deprecación; `expo-clipboard` **NO** instalado | una llamada + honestidad sobre el resultado | EXPO_GO_SAFE | **sí (obligatoria: avisar pegado en iOS requiere interacción del usuario)** | **IN (Run B)** | sin dependencia nueva; `expo-clipboard` queda como deuda si RN lo elimina |

---

## 11. Share / Clipboard Audit

Conclusiones:

1. **El camino de OS SHARE ya existe y está probado** en `front/mi-front-limpio/services/homecloud/homecloudDownloadService.ts`: `downloadHomeCloudOriginal` (acceso → `Directory`/`File` → `File.createDownloadTask` con `sessionType:'foreground'` y la signed URL **verbatim** → `validateDownloadedFile`) y `shareHomeCloudDownloadedFile` (`Sharing.isAvailableAsync` → `Sharing.shareAsync(uri, {dialogTitle, mimeType})`). HC2-C **no necesita** ninguna dependencia nueva ni ningún endpoint nuevo.
2. **Obstáculo real y acotado**: la firma de `downloadHomeCloudOriginal` toma un `HomeCloudFile` (`displayName: string`, `mimeType: string`, `sizeBytes: number` no anulables, `homecloudTypes.ts:68-76`), mientras que un `HomeCloudMemoryListItem` los tiene **anulables** (`:111` → `HomeCloudMemory`). Hace falta un narrowing explícito: sólo un Memory binario (`kind !== 'written'`) puede compartirse como archivo; un Written se comparte como texto.
3. **La signed URL nunca debe ser el payload de share.** La arquitectura actual ya lo garantiza: `shareHomeCloudDownloadedFile` sólo acepta un archivo local. Congelar.
4. **Fuga probada**: `homecloudDownloadService.ts:65-67` escribe en `Paths.document/HomeCloud/` y nunca borra. Con Videos esto es un crecimiento no acotado del documento del usuario. Run B debe acotarlo.
5. **Clipboard**: `Clipboard.setString` existe en RN core 0.86.3 y funciona en Expo Go, pero el propio paquete advierte que se va a quitar. Decisión: usarlo en HC2-C (cero dependencias) y registrar `expo-clipboard` como deuda de migración.
6. En iOS, `Clipboard.setString` no muestra una confirmación; el "pegado" requiere interacción. La honestidad del estado ("Copiado") es DEVICE_ONLY_VERIFY.

---

## 12. Actions / Modal Architecture Audit

### 12.1 Estado actual

- Un solo `ActionSheet` en Memories (`:1762-1798`), `size="content"`, que muestra la lista `rail.albums` como destino.
- Se abre únicamente tras `✓` con `purpose.kind === 'generic'`.
- El Viewer **no** tiene ninguna acción.
- El `AlbumDetailView` tiene su propio `AlbumActionsSheet` (propio, basado en `Modal`).
- Precedente de "modal" en el subtree de Memories: `ActionSheet` y `AlbumActionsSheet`, ambos `Modal`.

### 12.2 Riesgo modal-sobre-modal

- El `ActionSheet` usa `Modal` de RN. Un `Modal` no puede contener otro `Modal` en iOS de forma fiable; el segundo se renderiza detrás o no se presenta.
- El riesgo histórico era presentar acciones de álbum **desde dentro** de un picker de álbum.
- **El Viewer no es un `Modal`**: es un `View` absoluto (`MemoryViewer.tsx:78`, `StyleSheet.absoluteFill`, `zIndex: 20`) dentro del mismo árbol. Por lo tanto abrir un `ActionSheet` desde el Viewer produce **un** `Modal`, no dos.

### 12.3 Reglas a congelar

1. **Como máximo un `Modal` en pantalla a la vez.** El picker de destino **reemplaza** el contenido de la hoja de acciones; nunca se apila.
2. La hoja de acciones y el picker de destino son **el mismo host** (`ActionSheet size="content"`), solo con distinto contenido.
3. Una única gramática de accionesconceptual, alimentada por la misma autoridad, para Selección y para el menú de un Memory en el Viewer.
4. La autoridad debe ser una función pura pequeña. Entradas conceptuales: `source kind`, `selection count`, `memory kinds`, `album identity`, `capabilities`. Salidas: acciones disponibles, etiquetas, semántica. **No** un store, **no** un contexto nuevo, **no** un reducer global.
5. Las acciones de ciclo de vida (`Mover a papelera`) deben ser **estructuralmente agregables** pero **no implementadas** ni visibles en HC2-C.

---

## 13. Performance / Cache / Loading Audit

### 13.1 Ventaneo del Viewer

`MemoryViewer.tsx:82`: `initialNumToRender=3`, `maxToRenderPerBatch=3`, `windowSize=7`. Acotado. **Adecuado.**

### 13.2 Montaje de páginas inactivas

`ViewerPage` monta un `ViewerPage` por elemento dentro de la ventana. Los Inactivos de video/audio ya renderizan placeholder sin player y **sin pedir el original** (`MemoryVideoPage.tsx:52`, `MemoryAudioPage.tsx:57`). Correcto.

### 13.3 **Requests del original de imagen — INVARIANTE ROTO**

`MemoryViewer.tsx:126` — `ImagePage` pide el **original** en su efecto, con deps `[accessToken, memory.id, scale, translate]`, **sin condición de `active`**. Con la ventana activa se pueden pedir hasta 7 originales firmados a la vez, sólo uno de los cuales es visible.

Esto contradice el invariante HC2-B de "original sólo para la página activa", que hoy **sí** se cumple para Video y Audio. Clasificación: defecto probado por lectura de fuente. Run B debe pedir el **preview** mientras la página está inactiva y el **original** sólo cuando está activa.

### 13.4 Cache de signed URLs

| Aspecto | Preview (`homecloudMemoryPreview.ts`) | Original (`homecloudMemoryOriginal.ts`) |
| --- | --- | --- |
| Clave | `contentId` | `contentId` |
| Scope de household | **ninguno** | **ninguno** |
| TTL | `expiresIn` del servidor, fallback 5 min | `expiresIn` del servidor, fallback 300 s |
| Margen | 30 s | 30 s |
| Crecimiento máximo | **no acotado** (un entry por `contentId` visto en la sesión) | **no acotado** |
| Invalidación al cambiar de household | **`clearMemoryPreviewCache()` existe y NUNCA se llama** | **`clearMemoryOriginalCache()` existe y NUNCA se llama** |
| URLs fallidas cacheadas | no (sólo se cachea el éxito) | no |
| Deduplicación de requests concurrentes | **no** | **no** |
| Clave privada de household en la key | no | no |

⇒ Acción congelada: **`BOUNDED_FIX`** en Run B (C7). Conectar los dos `clear*` al **único** efecto de reset de household que ya existe en la pantalla (`:1311-1334`), y deduplicar requests en vuelo. **No** inventar un LRU, **no** una plataforma de caché nueva.

### 13.5 Previews de álbum y de Timeline

- Portada de álbum: 1 request de preview por `coverContentId`, cacheado. `useMemoryPreviewUrl` no deduplica en vuelo ⇒ dos montajes simultáneos del mismo `contentId` ⇒ 2 requests.
- Timeline: 1 request de preview por `hasPreview === true`, cacheado, sin dedup en vuelo.

### 13.6 Primera entrada, revalidación, flicker

- Primera entrada: doble `loadFirstPage` (efectos 1 y 5) + reset de scope (efecto 2) ⇒ hasta **dos** lecturas de la primera página de la Timeline. `setLoading(true)` dos veces.
- `useFocusEffect` vuelve a llamar `loadFirstPage()` en cada foco ⇒ el contenido existente se reemplaza por objetos nuevos (`setMemories([...page.memories])`), con **identidad de dataset nueva** ⇒ re-render de la SectionList completa en cada refocus. Costo acotado pero real.
- Reconciliación global (`:332-340`): misma lectura de página 0, silenciosa.
- Flicker: durante `loading` el cuerpo entero es skeleton (`:1653`), así que una relectura que usa `loadFirstPage` (no `refresh`) **vacía la pantalla** aunque haya datos. `refresh()` (`:282-293`) sí preserva el contenido. El botón de Refresh y la reconciliación usan caminos distintos con semánticas distintas.
- `source array identity`: `viewerMemories` sin memoizar (A4).
- Audio: `useAudioPlayerStatus` local a la página ⇒ el tick de 4 Hz no repinta el pager. Correcto.
- `unbounded map risk`: los dos mapas de signed URL (13.4).

**Nada de esto justifica FlashList, una capa de datos nueva ni una reescritura global de caché.**

---

## 14. Dependency / Expo Go Audit

### 14.1 Veredicto

Todo lo que HC2-C necesita está **ya instalado**. **Cero instalaciones.** Ninguna capacidad clasificada `IN` requiere dependencia nueva.

### 14.2 Clasificación Expo Go

| Capacidad | Expo Go |
| --- | --- |
| Corrección del pager (ancho de página, opening lock, sin fallback a 0) | `EXPO_GO_SAFE` |
| Root de Memories en un scroll (Álbumes/Tipos/Timeline) | `EXPO_GO_SAFE` |
| Selección sin navegación interna | `EXPO_GO_SAFE` |
| Acciones contextuales vía `ActionSheet` | `EXPO_GO_SAFE` |
| Eliminar el X permanente del álbum | `EXPO_GO_SAFE` |
| CTA `+ Nuevo` / `+` simplificado | `EXPO_GO_SAFE` |
| Quitar botón Refresh | `EXPO_GO_SAFE` |
| Fullscreen de video (`fullscreenOptions.enable`) | `EXPO_GO_SAFE` |
| Velocidad de audio (`setPlaybackRate`) | `EXPO_GO_SAFE` |
| Seek ±10 s de audio | `EXPO_GO_SAFE` |
| Buffering de audio | `EXPO_GO_SAFE` |
| OS SHARE binario (`expo-sharing` + `expo-file-system`) | `EXPO_GO_SAFE` |
| OS SHARE de texto (`Share.share`) | `EXPO_GO_SAFE` |
| Clipboard (`Clipboard.setString` de RN core) | `EXPO_GO_SAFE` + `DEVICE_ONLY_VERIFY` |
| Pinch/pan de imagen (PanResponder) | `EXPO_GO_SAFE` |
| Todo lo `DEFER` (double-tap, zoom de video, mute/volumen) | n/a |

**Nada en el freeze de HC2-C requiere dejar Expo Go.** Ninguna funcionalidad congelada requiere dev client.

`expo-dev-client@~57.0.19` está instalado en `package.json` pero no es necesario para HC2-C y no debe ser usado como excusa para nada.

---

## 15. Risks (sólo con evidencia)

| # | Riesgo | Evidencia | Impacto | Mitigación |
| --- | --- | --- | --- | --- |
| R1 | El opening lock del Viewer podría congelar la alineación y dejar al usuario en un offset equivocado | el lock debe ser liberable y tener un fallback | alto | liberar por el primer `onMomentumScrollEnd` coincidente **y** por `onScrollEndDrag`; prueba determinista del lock |
| R2 | Corregir A1 cambia el ancho de página y por tanto el `getItemLayout` de video/audio | A1 | medio | el ancho debe ser el MISMO `width` que ya usan imagen y written; ningún otro cambio de geometría |
| R3 | B1: hacer que el reset no superscriba la lectura podría filtrar datos entre households | el reset de scope existe por una razón | **alto** | la corrección debe preservar el reset en cambios de scope reales; la prueba debe cubrir tanto el montaje como un cambio de household |
| R4 | Quitar el X permanente deja `removeMemoryFromOpenAlbum` sin llamador | §4.4 | bajo | conservar el helper; Run B lo reconecta al Viewer |
| R5 | Fullscreen dentro de un pager puede romper la paginación | `VideoView` fullscreen vs `FlatList` horizontal | medio | DEVICE_ONLY en Run B; si falla, `DEFER` explícito, no un workaround oculto |
| R6 | Compartir crea archivos en `Paths.document` sin borrar | `homecloudDownloadService.ts:65-67` | medio | acotar en Run B; no en Run A |
| R7 | `expo-sharing` + iOS presenta el share sheet y el usuario puede descartar; el estado debe ser honesto | platform | bajo | distinguir "compartido" de "no compartido" |
| R8 | Los agregados de suites (`homecloud-4b2`, `homecloud-moa*`, `npm run typecheck`) ya fallan por causas ajenas | §1.3.1 | medio | Run A debe ejecutar los comandos deterministas de Memories individualmente y reportar el dirt pre-existente |
| R9 | La suite HC2-A es huérfana: no corre en ningún grupo | `tests/run.js:375` vs `:963` | medio | engancharla en el gate de HC2-C |
| R10 | B4: sacar el rail del path de skeleton del cuerpo cambia cuándo se ve la sección Álbumes | `:1653` | bajo | el header debe renderizar su propio estado de carga, no depender del `loading` de la Timeline |
| R11 | `Clipboard` de RN core está en camino de removerse | `react-native/index.js:217-222` | bajo | aislar la llamada en un helper propio; `expo-clipboard` como deuda |

---

## 16. Unknowns Requiring Device Trace

### 16.1 BUG A — orden de eventos nativos

No podemos observar desde el fuente si `initialScrollIndex` y/o `scrollToIndex` emiten `onMomentumScrollEnd` antes o después del primer render, ni con qué `contentOffset`. Eso decide cuál de A1/A2/A3 se dispara primero.

**Plan de trace EXACTO para Run A (instrumentación, no de producción):**

| Campo | Valor |
| --- | --- |
| Evento | `viewer_open_alignment` |
| Componente | `MemoryViewer` |
| Disparo | `onMomentumScrollEnd`, `onScrollBeginDrag`, `onScrollEndDrag`, y el efecto de alineación |
| Campos de estado | `activeContentId` (hash truncado, nunca el id completo), `activeIndex`, `width`, `requestedIndex`, `lockHeld`, `computedIndex` |
| Payload seguro para privacidad | `{ requestedIndex, computedIndex, indexDelta, width, lockHeld, phase: 'initial' \| 'settled', kind }` — **sin** ids, **sin** URLs, **sin** texto |
| Parada | al primer `onMomentumScrollEnd` con `phase === 'initial'`, o a los 1500 ms tras el montaje, lo que ocurra primero |

Instalación temporal: `memoryDevTrace` ya existe (`homecloudMemoryDiagnostics.ts:3`, `__DEV__` only, `console.info`). **No se instrumenta en esta sesión.** Run A puede usar el mismo helper y retirar la instrumentación al cerrar laRoots.

### 16.2 BUG B — estado final de la fila de álbumes

Si `useFocusEffect` dispara en el mismo commit que el montaje (determinista en `@react-navigation/native@7.2.5`, pero no probado aquí), el reset posterior deja el rail atascado. Run A debe **probarlo**, no suponerlo: una prueba que ejecute el controlador del rail con la misma secuencia (load → reload → reset → sin read) y afirme el estado resultante. Complementariamente, un contador de reads en `__DEV__` para la primera entrada.

### 16.3 Feel de gestos (nunca demostrable por fuente)

Tacto del scrub nativo de video; pinch de imagen; doble tap; controles nativos de video contra el pager; transición a fullscreen; timing audible de parada de audio; comportamiento del volumen en iOS; codecs soportados; comportamiento del share sheet; confirmación de portapapeles en iOS; pixelación de `Math.random` en planners (ajeno).

---

## 17. Recommended Implementation Boundaries

### RUN A — HC2-C FOUNDATION (C0, C1, C2, C3, C4)

| Parte | Contenido |
| --- | --- |
| C0 | Corrección de BUG A (A1–A4), BUG B (B1–B2), BUG C, BUG D |
| C1 | Raíz única Álbumes → Tipos → Timeline; eliminar la pantalla Colecciones; **crear la fila de Tipos antes de borrarla** |
| C2 | Selección sin navegación interna; header sin segmented control; `ListHeaderComponent` constante; `source` fuera de la sesión; acciones visibles al entrar |
| C3 | Álbumes: CTA `+ Nuevo` en el header de sección; leave-out del X permanente y su artefacto; estado de carga de portada distintivo |
| C4 | Corrección del Viewer: apertura exacta, estabilidad de fuente, pager sólo por su fuente, cierre al contexto correcto |
| Frontend | `screens/HomeCloudMemoriesScreen.tsx`, `components/homecloud/MemoryViewer.tsx`, `MemoryVideoPage.tsx`, `MemoryAudioPage.tsx`, `MemorySelectionHeader.tsx`, `AlbumsRail.tsx`, `AlbumTile.tsx`, `AlbumDetailView.tsx`, `MemoryCards.tsx`, `MemorySelectableCard.tsx`, `MemoryCollectionTile.tsx`; `services/homecloud/homecloudMemorySelection.ts`, `homecloudMemoryViewerSource.ts`, `homecloudMemoryCollectionsPagination.ts`, `homecloudAlbumScope.ts` |
| Backend | **NO** |
| Migraciones | **NO** |
| Dependencias | **NO** |
| Gate | parar aquí; QA físico en iPhone obligatorio |

### RUN B — HC2-C VIEWER COMPLETION (C5, C6, C7)

Sólo después de que la QA física de Run A pase.

| Parte | Contenido |
| --- | --- |
| C5 | Capacidades `IN` de §10: fullscreen de video, seek ±10 s de audio, velocidad de audio, buffering de audio, retry del original de imagen |
| C6 | Acciones de Viewer con la gramática compartida; OS SHARE (binario y texto); Copiar |
| C7 | Original de imagen sólo para la página activa; acotar/limpiar los mapas de signed URL; deduplicación en vuelo; ciclo de vida de archivos compartidos |
| Backend | **NO** |
| Migraciones | **NO** |
| Dependencias | **NO** (`expo-clipboard` sólo si RN quita `Clipboard`; hoy no) |

### Lo que queda explícitamente fuera de ambos runs

Favoritos, búsqueda, resurfacing, papelera/restaurar/purgar, ocultos, rediseño de cámara, ingesta masiva, cambios en Files, Homi/IA, arquitectura backend de ciclo de vida, nuevo modelo de storage, transcodificación.

---

## 18. Documents produced by this audit

- `docs/homecloud/memories/HC2C_TOTAL_CURRENT_AUDIT.md` (este documento)
- `docs/homecloud/memories/HC2C_PRODUCT_IMPLEMENTATION_FREEZE.md`

Ninguna otra fila fue modificada.
