# HOMECLOUD MEMORIES — FINAL CURRENT GAP

```
STATUS:  HOMECLOUD_MEMORIES_FINAL_CURRENT_GAP
MODO:    AUDIT FORENSE READ-ONLY. Cero codigo de producto modificado en esta sesion.
AUTORIDAD DE CURRENT: codigo de produccion > schema/migraciones/contratos > dependencias
                      instaladas > tests deterministas > auditorias historicas
NOTA:    Un test verde NO sobreescribe un bug observado en un iPhone fisico.
```

Formato de fila (obligatorio): `ID` · `DOMAIN` · `PRODUCT TRUTH` · `CURRENT` · `STATUS` ·
`EVIDENCE` · `PHYSICAL EVIDENCE` · `GAP` · `LIKELY LAYER` · `RISK` · `DEVICE QA` ·
`TEST COVERAGE` · `NOTES`.

Leyenda de confianza: `PROVEN_STATIC` (verificable leyendo codigo) · `DEVICE_OBSERVED`
(usuario) · `STRONG_EVIDENCE` · `PLAUSIBLE_ONLY` · `DEVICE_VERIFY_REQUIRED`.

---

## 1. Baseline

| Dato | Valor |
| --- | --- |
| Worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-current` |
| Branch | `homecloud/memories-lane` — coincide con lo esperado |
| HEAD inicial | `1ae24e9fb38081fe7c9df14d0b5ad7ddf04efdc1` |
| HEAD esperado historico | `1ae24e9fb38081fe7c9df14d0b5ad7ddf04efdc1` — **COINCIDE** |
| HEAD final | `1ae24e9fb38081fe7c9df14d0b5ad7ddf04efdc1` (sin commits de codigo) |
| Push | **NO** |
| Codigo de producto modificado | **NO** |

### 1.1 Dirt preexistente (verificado y fingerprinteado)

```
 M backend/src/services/homecloudIntakeService.js
?? CURRENT_AUDIT_AFTER_SLICE_01.md
?? T1_FINAL_WIP.patch
```

| Archivo | Estado | Contenido | Accion |
| --- | --- | --- | --- |
| `backend/src/services/homecloudIntakeService.js` | modificado, +12 lineas | Bloque `TEMPORARY DIAGNOSTIC (S2-i device QA)` en `authorizeHomeCloudOriginalUpload`: `console.log('[HomeCloud Upload] signed URL origin:', new URL(signed.signedUrl).origin)` + rama `catch`. Registra **solo el origin**, nunca el token ni el path firmado | **NO tocado, NO stageado, NO incluido** |
| `CURRENT_AUDIT_AFTER_SLICE_01.md` | untracked | auditoria previa | NO tocado |
| `T1_FINAL_WIP.patch` | untracked | patch previo | NO tocado |

Nada stageado al inicio ni al final. Coincide exactamente con el dirt conocido historico de
HC2-B. **No hay dirt nuevo ni desconocido.**

### 1.2 Commits relevantes

```
1ae24e9 feat(homecloud): simplify memories root and selection   <- Run A de HC2-C
68f778c fix(homecloud): stabilize memories initial loading
2f08c39 fix(homecloud): stabilize memory viewer opening
c85448e docs(homecloud): freeze HC2-C memories closure
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

### 1.3 Hallazgo de baseline: CURRENT esta muy por delante del alcance de HC2-C

HC2-C congelo `Backend: NO`, `Migraciones: NO`, `Dependencias: NO`, y Run A lo cumplio. Pero
**existen** `MemoryIntake.tsx` (45 KB), `MemoryCameraSurface.tsx` (18 KB),
`MemoryAudioRecorder.tsx`, `MemoryMediaReview.tsx`, `homecloudSemanticDate.ts`,
`homecloudMediaCaptureMetadata.ts`, `homecloudMemoryAlbumRemoval.ts`, `homecloudScanner.ts` y
la migracion `20260925000000_homecloud_memories_v2_persistence_v1.sql`.

**Intake, Camera, grabacion de audio, Semantic Date y Album Removal ya estan construidos** y no
estaban en el alcance de HC2-C. La foto real de CURRENT es: *consumo y organizacion casi
listos; ingesta y ciclo de vida recien llegados; lifecycle, resurfacing, info y edicion
inexistentes.*

### 1.4 Puertas

| Gate | Resultado |
| --- | --- |
| `git diff --check` / `--cached --check` | PASS (sin errores de whitespace) |
| Typecheck / lint / suites | **NO ejecutados.** Es una auditoria de descubrimiento. Los "tests verdes" citados abajo son afirmaciones de la sesion HC2-C y se marcan como tales |

---

## 2. CURRENT Architecture

### 2.1 Montaje real

```
HomeTabNavigator
 ├─ AppTopBar                                  (hermano estatico, ~72px, usa insets.top)
 └─ Tab.Navigator tabBar={MainFloatingTabBar}   (position:'absolute', bottom:0, zIndex:10)
     └─ MoreStack → "HomeCloud" → HomeCloudScreen
         ├─ header "HomeCloud" (X + titulo)
         ├─ SegmentedControl GLOBAL  Archivos | Recuerdos     <- estado local, NO focus
         ├─ HomeCloudUploadActivity                           <- banda global de upload
         └─ content (flex:1)
             ├─ pane Files   (display toggle)
             └─ pane Memories
                 └─ HomeCloudMemoriesScreen (2062 lineas, owner unico)
                     ├─ titleRow "Recuerdos" + MemoryIntake(+)
                     ├─ notice de capabilities
                     ├─ SectionList
                     │   ├─ ListHeaderComponent = rootHeader = AlbumsRail + MemoryTypesSection
                     │   ├─ secciones Timeline · filas MemoryTimelineRow
                     │   ├─ footer "Mostrar mas recuerdos"
                     │   └─ empty = skeleton | ErrorState | copy vacio
                     ├─ overlay AlbumDetailView            (absoluteFill, gate !selecting)
                     ├─ overlay MemoryCollectionDetailView (absoluteFill, gate !selecting)
                     ├─ MemoryViewer                        (absoluteFill + zIndex:20, NO Modal)
                     ├─ AlbumNameSheet / AlbumActionsSheet   (Modales RN)
                     └─ ActionSheet unico (acciones de seleccion | picker de destino)
```

### 2.2 Datos

| Concepto | Estado |
| --- | --- |
| `homecloud_contents` | 9 migraciones; `role` semantico; `lifecycle CHECK in ('staging','active','trashed')`; `trashed_at`/`trashed_by_member_id` **nunca escritos**; 15 CHECKs de integridad (shape binario/escrito, semantica de captura, pureza de escrito, consistencia de papelera) |
| `homecloud_albums` | `lifecycle CHECK in ('active','trashed')`; `trashed_at` **nunca escrito**; **sin UNIQUE de nombre** |
| `homecloud_album_items` | PK `(album_id, content_id)`; FK `ON DELETE CASCADE` en ambos lados |
| RLS | `homecloud_contents/folders/albums/album_items`: RLS **enabled, 0 policies, 0 GRANT** ⇒ default deny; solo `service_role` (BYPASSRLS) lee. La migracion HC-1D de RLS **nunca se materializo** |
| Busqueda | **sin tsvector, sin GIN, sin trigram, sin indice de busqueda** |
| Indice de timeline | `(household_id, captured_year desc, captured_month desc, captured_at desc nulls last, id) WHERE role='memory' AND lifecycle='active'` |

### 2.3 Capacidades (4, una muerta)

| Capacidad | coord | adult | adolescent | child | senior | guest | Exigida por |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `homecloud.view` | SI | SI | SI | SI | SI | SI | 9 rutas |
| `homecloud.contribute` | SI | SI | SI | **NO** | SI | **NO** | 4 rutas |
| `homecloud.organize` | SI | SI | **NO** | **NO** | SI | **NO** | 9 rutas |
| `homecloud.delete` | SI | SI | **NO** | **NO** | **NO** | **NO** | **NINGUNA RUTA** |

### 2.4 Dependencias que definen el techo tecnico

| Paquete | Version | Consecuencia |
| --- | --- | --- |
| `expo` / `react-native` / `react` | 57.0.25 / 0.86.3 / 19.2.3 | `Clipboard` de RN core en deprecacion |
| `expo-video` / `expo-audio` | 57.0.5 | `VideoView` no expone zoom; **`useAudioSampleListener` si existe** |
| `expo-image-picker` | 57.0.20 | `exif:true` y `allowsMultipleSelection` disponibles |
| `expo-camera` / `expo-document-picker` | 57.0.5 / 57.0.2 | captura y import de audio |
| **`react-native-safe-area-context`** | **5.7.0 — INSTALADO** | **el Viewer podria consultar insets sin dependencia nueva** |
| `react-native-calendars` | 1.1314.0 | `DatePickerSheet` de precision exacta |
| **`react-native-gesture-handler`** | **NO INSTALADO** | no hay doble toque, no hay pinch de libreria |
| **`react-native-reanimated`** | **NO INSTALADO** | zoom en JS |
| `@shopify/flash-list` / `expo-image` / `expo-clipboard` / `expo-media-library` | **NO INSTALADOS** | `Image` de RN; `Clipboard` de core; sin `assetId` del picker |

---

## 3. Physical QA Findings (P1-P9)

### P1 — VIDEO LOAD

| Aspecto | Hallazgo | Confianza |
| --- | --- | --- |
| Evidencia | "Algunos Videos tardan una cantidad extrema de tiempo en volverse usables" | `DEVICE_OBSERVED` |
| Shell del Viewer | Aparece de inmediato (overlay incondicional) | `PROVEN_STATIC` |
| **Poster / preview** | **AUSENTE.** `MemoryVideoPage.tsx:7` importa **solo** `getMemoryOriginalUrl`; no importa `useMemoryPreviewUrl` ni lee `hasPreview`. El codigo lo declara: `NO POSTER, NO TRANSCODING` (`:35`) | `PROVEN_STATIC` |
| Estado mientras carga | Spinner + `Cargando video…` sobre negro | `PROVEN_STATIC` |
| Buffering | Overlay mientras `status !== 'readyToPlay'`; desaparece en `readyToPlay` | `PROVEN_STATIC` |
| Player | `useVideoPlayer({uri}, pause)` en la pagina **activa** solamente | `PROVEN_STATIC` |
| Signed URL | `GET /content/:id/access?variant=original`, TTL por defecto **1 h**, margen 30 s, cache por `contentId` | `PROVEN_STATIC` |
| Original remoto | Se **transmite**, no se descarga antes de reproducir | `PROVEN_STATIC` |
| Causa de "algunos" | Tamano de archivo + ancho de banda | `PLAUSIBLE_ONLY` / `DEVICE_VERIFY_REQUIRED` |
| Codec | `VideoTrack.isSupported` es Android-only; en iOS se informa `playback` a proposito | `PROVEN_STATIC` |

**Causa raiz: doble.** (1) **Estatica y comprobada:** no hay poster en ningun punto del
pipeline, asi que el usuario no tiene ninguna senal de que el tap funciono — y eso aplica a
**todos** los videos. (2) **No medida:** el coste de red de los archivos grandes.
**Implicacion:** el shell inmediato ya esta; lo que falta es el poster.

### P2 — VIEWER SHELL

| Aspecto | Hallazgo | Confianza |
| --- | --- | --- |
| Evidencia | "Comienza solo unos pixeles debajo de Archivos/Recuerdos"; se ve apretado; el navbar inferior global tapa Image/Video/Audio; los controles quedan cubiertos; parte del medio queda oculta | `DEVICE_OBSERVED` |
| **Causa raiz 1** | El Viewer **no es un `Modal`**: `View` con `{...StyleSheet.absoluteFill, zIndex:20, backgroundColor:'#000'}`; el import de RN (`:2`) **no incluye `Modal`** | `PROVEN_STATIC` |
| **Causa raiz 2** | El navbar global es **hermano** del contenedor de screens: `floatingTabBarShell:{position:'absolute', bottom:0, zIndex:10}` (`HomeTabNavigator.tsx:426-432`), renderizado **despues** por `BottomTabView.js:247`. `zIndex` de RN **no es transitivo entre subarboles** | `PROVEN_STATIC` |
| Altura solapada | `mainRegularHeight = 68` + `Math.max(insets.bottom, spacing[3])` ≈ **102 px** | `PROVEN_STATIC` |
| Precedente en el repo | El solapamiento ya esta compensado en `HomeCloudScannerScreen.tsx:375-381` y `PresenceScreen.tsx:221-223`. **El Viewer no lo compensa** | `PROVEN_STATIC` |
| Header global | `SegmentedControl` y header "HomeCloud" son **ancestros** ⇒ visibles e interactivos | `PROVEN_STATIC` |
| Safe area | **El Viewer no consulta safe-area en ningun punto.** Constante magica `written:{paddingTop:90}` | `PROVEN_STATIC` |
| Top / bottom chrome | `top:20, left/right:12`, **sin `backgroundColor`**; `bottom:20, left:16` — **debajo** de la barra global | `PROVEN_STATIC` |
| Cierre | `AppButton variant="icon" size="sm"` = **42x42 px** vs `touchTargets.normal = 44` | `PROVEN_STATIC` |
| Media viewport | El `FlatList` **no recibe `style`**; sin `contentContainerStyle` con padding inferior | `PROVEN_STATIC` |
| Bug derivado | Tocar "Archivos" aplica `display:'none'` ⇒ el Viewer se desmonta; al volver el estado sigue vivo ⇒ **se reabre solo** | `PROVEN_STATIC` |
| Dependencia | `react-native-safe-area-context@5.7.0` **ya instalada** ⇒ correccion sin dependencia nueva | `PROVEN_STATIC` |

**Causa raiz: `PROVEN_STATIC` al 100%.** Las cuatro observaciones tienen una explicacion
mecanica unica y verificada. **Implicacion:** exactamente Product Truth §13; front-only.

### P3 — IMAGE ZOOM

| Aspecto | Hallazgo | Confianza |
| --- | --- | --- |
| Evidencia | El zoom no es usable / no se observa funcionando en iPhone fisico | `DEVICE_OBSERVED` |
| Pinch / pan / arbitraje | Implementados con `PanResponder`, escala clamp **1..3**, `onPanResponderTerminationRequest: () => scaleValue.current <= 1.01` | `PROVEN_STATIC` |
| `onPanResponderTerminate` | **AUSENTE.** Si el sistema termina el responder, `startDistance` queda sucio y no se dispara el spring de retour | `PROVEN_STATIC` |
| `*Capture` handlers | **AUSENTES.** El arbitration depende del orden de layout | `PROVEN_STATIC` |
| Clamp vertical | Constante **magica `±500`**, no derivada del viewport | `PROVEN_STATIC` |
| `Animated.event` | **AUSENTE.** El transform se recalcula en JS | `PROVEN_STATIC` |
| Tests | `hc2b` solo verifica `active={item.id === activeContentId}`; `hc2a` hace grep de `pagingEnabled` | `PROVEN_STATIC` |

**Causa raiz: NO AISLADA.** El codigo es plausible pero tiene 4 defectos reales corregibles, y
**ningun test prueba comportamiento de zoom**. Clasificacion de producto: `BROKEN`/`PARTIAL`
hasta que se pruebe en el dedo. Un test que demuestra que el codigo existe no es evidencia de
que funcione.

### P4 — SELECTION INSIDE ALBUM

| Aspecto | Hallazgo | Confianza |
| --- | --- | --- |
| Evidencia | Album → long press/seleccionar → la UI **vuelve a la raiz** | `DEVICE_OBSERVED` |
| **Causa raiz exacta** | `showAlbumDetail = !selecting && openAlbumId !== null` (`:1442`) ⇒ al entrar en seleccion el overlay de Album **se desmonta** | `PROVEN_STATIC` |
| **Causa raiz exacta 2** | `gridMemories = activeCollection === null ? memories : collections.memories` (`:1145`) ⇒ con `activeCollectionId` en `null`, el dataset visible pasa al **Timeline completo de la raiz** | `PROVEN_STATIC` |
| El estado si se preserva | `enterRemoveFromAlbum` (`:918-932`) **no** toca `openAlbumId` ni `activeCollectionId` ⇒ por eso `cancel` "vuelve" | `PROVEN_STATIC` |
| Consecuencia | Durante la seleccion el usuario ve **otra lista** | `PROVEN_STATIC` |
| Consecuencia 2 | El offset dentro del album **no** se preserva (el `SectionList` se desmonta y remonta) | `PROVEN_STATIC` |
| Consecuencia 3 | Los ya-miembros excluidos se derivan de `memoriesRef.current` = **solo paginas cargadas del Timeline raiz** (`:909`) | `PROVEN_STATIC` |
| **Comentario que contradice el codigo** | `SCREEN:921-924` afirma "The Album detail is a NESTED OVERLAY that stays mounted underneath" — **no ocurre** | `PROVEN_STATIC` |
| Patron identico en Tipo | `showCollectionDetail = !selecting && ...` (`:1448`): el dataset se preserva pero **la estructura cambia** | `PROVEN_STATIC` |
| Test | Ninguno afirma que el dataset siga siendo el del album | `PROVEN_STATIC` |

**Causa raiz: `PROVEN_STATIC` al 100%.** Un unico gate booleano mal enunciado, en dos sitios.
**TEST GAP = YES**, y es peor: el comentario del codigo afirma lo contrario de la verdad final.

### P5 — ALBUM CREATE TILE

| Aspecto | Hallazgo | Confianza |
| --- | --- | --- |
| Evidencia | CURRENT muestra "un cuadrado/elemento raro de creacion"; el objetivo es `+ Nuevo álbum` como ultimo item del riel | `DEVICE_OBSERVED` |
| Header actual | `<AppButton size="sm" variant="secondary" accessibilityLabel="Nuevo álbum">+ Nuevo</AppButton>` en las **5 fases** (`AlbumsRail.tsx:157-166`; usado en `:63,80,96,115`) | `PROVEN_STATIC` |
| Tile final | **AUSENTE.** El `ScrollView` renderiza solo `albums.map(...)` (`:121-132`); `grep createTile` en `front/` ⇒ 0 | `PROVEN_STATIC` |
| Con 0 albums | Header `+ Nuevo` **y** boton `Crear álbum` **simultaneamente** (`:96` y `:105`) | `PROVEN_STATIC` |
| Decision previa | HC2-C §3 y §8 lo congelaron en el header ⇒ **SUPERSEDED** | documental |
| Test que exige el header | `homecloud_hc2c_memories_root_tests.ts:264-265` **afirma positivamente** `/\+ Nuevo/` | `PROVEN_STATIC` |
| Requisito del tile en el repo | **No existe en ningun archivo** (`grep` de "último tile / LAST TILE / rail tile" en `docs/` ⇒ 0) | `PROVEN_STATIC` |

**Causa raiz: `PROVEN_STATIC`.** CURRENT implementa fielmente HC2-C §8, que queda superseded.
**Implicacion:** hay que **mover** la affordance, no duplicarla; y **retargetear** el test.

### P6 — ACTIONS

| Aspecto | Hallazgo | Confianza |
| --- | --- | --- |
| Evidencia | "El sistema de acciones sigue siendo incompleto / inconsistente" | `DEVICE_OBSERVED` |
| Acciones de seleccion | **Solo 3**: `Agregar a un álbum`, `Quitar N del álbum`, `Cancelar` | `PROVEN_STATIC` |
| Menu del Viewer | **AUSENTE.** El chrome tiene **solo** `top` y `bottom` | `PROVEN_STATIC` |
| Compartir / Copiar | **AUSENTES** en Memories (la costura de Files existe y esta probada) | `PROVEN_STATIC` |
| Crear album desde seleccion | **AUSENTE por decision de codigo**: "no 'create an Album from here'" (`SCREEN:1916-1919`) | `PROVEN_STATIC` |
| Con 0 albums | Dead end: `NO_ALBUMS_DESTINATION_BODY` instruye ir a la barra, **sin enlace** | `PROVEN_STATIC` |
| `Agregar a otro álbum` | **AUSENTE** | `PROVEN_STATIC` |
| Eliminar album | Boton destructivo **directo en la hoja**, sin dialogo (`grep Alert.alert` ⇒ 0) | `PROVEN_STATIC` |
| Lifecycle actions | **TODAS AUSENTES**: ni trash, restore, purge, undo, ni ocultar-de-resurfacing | `PROVEN_STATIC` |
| Lo que si funciona | Copy de `Quitar del álbum` impecable; un solo `ActionSheet` que reemplaza contenido; banda de fallo + `Reintentar los que fallaron` | `PROVEN_STATIC` |

**Causa raiz: `PROVEN_STATIC`.** No es un bug: es **alcance incompleto**. La arquitectura esta
bien diseñada (una autoridad, un host, copy congelado) y **le faltan las acciones**.
**P6 subestima el problema:** faltan 4 de las 6 acciones de seleccion y las 3 existentes son
solo de organizacion.

### P7 — INTAKE FORM

| Aspecto | Hallazgo | Confianza |
| --- | --- | --- |
| Evidencia | Se siente "tecnica, torpe, llena de formularios, y mala manejando fechas de forma natural" | `DEVICE_OBSERVED` |
| Preview | Correcto por tipo; imagen manipulada a 1600px JPEG 0.82; **el original nunca se toca**; error boundary con `Reintentar vista previa` y el copy "El original no fue modificado" | `PROVEN_STATIC` |
| **Fecha en intake binario** | **READ-ONLY**: `MemoryCaptureSummary` = `View` + 3 `AppText`, sin `onPress`/`AppInput`/`FilterChip`/`DatePickerSheet` | `PROVEN_STATIC` |
| El componente de precision existe | `MemorySemanticDateFields` con 4 chips + `DatePickerSheet` + inputs de mes/ano, **pero solo esta montado en el formulario escrito** | `PROVEN_STATIC` |
| **Post-intake** | **NO existe ninguna correccion.** Sin endpoint PATCH de memory, sin servicio de update, sin superficie de Info | `PROVEN_STATIC` |
| Descripcion / Album | Presentes y opcionales; album **solo seleccion** | `PROVEN_STATIC` |
| Jerarquia | Preview arriba, fecha debajo en tono secundario ⇒ la fecha se hace invisible | `PROVEN_STATIC` |
| Batch | **AUSENTE** (`allowsMultipleSelection:false`) | `PROVEN_STATIC` |
| Datos muertos | `durationMillis` capturado y **descartado**; `MediaCaptureAssetMetadata` declara `type`/`duration`/`fileName` pero solo lee `exif` | `PROVEN_STATIC` |
| Codigo muerto | `permissionDenied`/`canAskAgain` nunca emitidos ⇒ `Abrir configuración` inalcanzable | `PROVEN_STATIC` |
| Doble modelo | `selectDestination()` etc. exportados pero el JSX usa estado local | `PROVEN_STATIC` |

**Causa raiz: `PROVEN_STATIC`.** El pipeline es solido; el **formulario** le pide al usuario
menos de lo que deberia y le impide corregir lo que HomeCloud no sabe.

### P8 — RUNTIME WARNING "Text strings must be rendered within a `<Text>`"

| Aspecto | Hallazgo | Confianza |
| --- | --- | --- |
| Evidencia | Dispara en dispositivo | `DEVICE_OBSERVED` |
| Emisor | Unico: `ReactFabric-dev.js:15889-15898` (RN 0.86.3), ante un **nodo de texto crudo** hijo de un host component que no es `<Text>` | `PROVEN_STATIC` |
| En los 5 archivos de HomeCloud | **AUSENTE.** Leidos integros | `PROVEN_STATIC` |
| Barrido de todo `front/` | Regex con balance de llaves buscando nodo de texto tras `<View|Pressable|ScrollView|FlatList|SectionList|Animated.View>` ⇒ **0 coincidencias** | `PROVEN_STATIC` |
| Barrido `>{'` y `>{"` | **17 ocurrencias, las 17 dentro de `<AppText>`/`<Text>`** | `PROVEN_STATIC` |
| Design system | `AppText` devuelve `<Text>`; `AppButton` mete `title` en `AppText`; `Skeleton`/`ErrorState` solo `View`+`AppText` | `PROVEN_STATIC` |
| Causa mas probable | Un componente de **libreria** renderizando texto crudo, o un bundle dev/HMR con JSX distinto al fuente | `PLAUSIBLE_ONLY` |

**Causa raiz: NO LOCALIZADA ESTATICAMENTE.** No hay candidato en Memories ni en los
componentes de HomeCloud. Clasificacion `BROKEN_RUNTIME_UI`. **No se arregla a ciegas**:
requiere capturar el stack en el dispositivo (que incluye la componente).

### P9 — MEDIA CON `Sin fecha`

| Fuente | Campo que se lee | Resultado | Evidencia |
| --- | --- | --- | --- |
| Imagen de galeria | `DateTimeOriginal` → `DateTimeDigitized` → `DateTime` | `exact` si alguno parsea | `homecloudMediaCaptureMetadata.ts:75-79,148-163` |
| MOV / MP4 de galeria | los mismos 3 | **`unknown`** — el SDK iOS no entrega EXIF para video, por diseño documentado | `:38-41` |
| Imagen de camara | instante real de captura de HomeCloud | `exact` | `MemoryCameraSurface.tsx:110`; `homecloudMemoryPicker.ts:172` |
| Video de camara | instante real de captura | `exact` | `MemoryCameraSurface.tsx:157` |
| **Audio importado** | **ninguna** | **siempre `unknown`**, forzado | `homecloudMemoryPicker.ts:145` |
| Audio grabado | instante de inicio de grabacion | `exact` | `MemoryAudioRecorder.tsx:119`; `homecloudMemoryPicker.ts:187` |
| Recuerdo escrito | eleccion del usuario | las 4 precisiones | `MemoryIntake.tsx:791` |

**Cinco hallazgos criticos:**

1. **`uploaded_at`/`created_at` NO se usan como fallback**, y la prohibicion esta en **5 lugares
   independientes** (`homecloudMediaCaptureMetadata.ts:35-36`,
   `homecloudMemoriesTimeline.ts:158-162`, `homecloudUploadTypes.ts:53`,
   `homecloudReadService.js:32`, `homecloudIntakeValidation.js:44`). **Mejor implementada que
   la mayoria de los contratos del repo.**
2. **Alternativas evaluadas y rechazadas por escrito**: `asset.creationTime` no existe en el
   SDK; `asset.duration` es longitud; `asset.assetId` requeriria `expo-media-library` (no
   instalada); parsear `fileName` es heuristica no confiable (`:24-36`).
3. **Por lo tanto `Sin fecha` NO es un bug de extraccion.** Es el resultado honesto de no
   tener dato. Correcto.
4. **PERO es un bug de producto grave:** la fecha **no se puede corregir** ni en intake
   (read-only) ni despues (no hay endpoint). Un video de galeria y un audio importado quedan
   **irrecuperablemente** en `Sin fecha`.
5. `exif:true` se pide en `takePictureAsync` pero **`result.exif` nunca se lee** (solo
   `result.uri`) ⇒ codigo muerto.

**Causa raiz: doble, y hay que separar las dos.** Del `Sin fecha`: **no hay bug**. De la
**irrecuperabilidad**: bug de producto `PROVEN_STATIC`, el mas grave en perdida de
informacion de toda la auditoria. **Implicacion:** dos cambios, ninguno de los cuales es
"inventar una fecha".

---

## 4. Product Truth vs CURRENT — Resumen ejecutivo

| # | Conclusion |
| --- | --- |
| 1 | **La arquitectura esta en muy buen estado.** IA de raiz unica; viewer con apertura exacta y opening lock; seleccion sin navegacion interna; drag D4 completo; pipeline de ingesta durable de 9 estados; album membership N:M correcta; schema con 15 CHECKs de integridad de captura; 4 capacidades con matriz duplicada en JS y SQL |
| 2 | **HC2-C Run A esta mayormente resuelto en codigo.** Los cuatro bugs del freeze (A, B, C, D) tienen correccion implementada y verificable |
| 3 | **Pero el alcance de HC2-C era consumo-y-organizacion, y el producto final es mucho mas.** Faltan completos: lifecycle, resurfacing, info/edicion, batch intake, correccion de fecha, y la mitad de las acciones |
| 4 | **HC2-C declaro `Backend: NO` y era correcto para HC2-C, pero es incorrecto para Memories V1.** Lifecycle y edicion de metadata **exigen** backend. Es el primer cambio de backend del carril |
| 5 | **Tres bugs fisicos tienen causa raiz `PROVEN_STATIC` y correccion front-only:** P2 (inmersividad), P4 (contexto de seleccion), P5 (tile de album) |
| 6 | **Un bug fisico tiene causa raiz NO aislada:** P3 (zoom). Codigo plausible, 4 defectos corregibles, ningun test de comportamiento |
| 7 | **Un bug fisico no se localiza estaticamente:** P8. Requiere stack en dispositivo |
| 8 | **Un "bug" fisico no es bug:** P1 y P9 en su parte de extraccion. Lo que falta es senalizacion (poster) y correccion (fecha editable) |
| 9 | **Un hallazgo de seguridad no estaba en ninguna observacion:** `homecloud.delete` se proyecta al cliente y **ninguna ruta la exige**. Lifecycle lo cierra |
| 10 | **13 de 53 archivos de test de HomeCloud estan huerfanos**, incluidos los 5 unicos que probarian el enforcement de capacidades |

---

## 5. Domain Gap Tables

### ROOT

**ROOT-01** Root: un scroll, orden Álbumes → Tipos → Timeline · `IMPLEMENTED` · frontend · LOW · device si · cubierto
TRUTH: una IA, un scroll. CURR: `rootHeader` = `AlbumsRail` + `MemoryTypesSection` en el `ListHeaderComponent`, constante e independiente de `selecting`. EVID: `SCREEN:1495-1512,1628`. PHYS: no. GAP: ninguno. NOTES: el gap G2 de HC2-C esta cerrado; la fila de Tipos se creo **antes** de borrar `collectionsRoot`, como exigia el freeze.

**ROOT-02** Root: sin navegación interna `Recuerdos|Colecciones` · `IMPLEMENTED` · frontend · LOW · device si · cubierto por aserciones de ausencia
TRUTH: eliminada para siempre. CURR: `SegmentedControl`, `MemorySelectionSourceTab`, `MemorySelectionSource`, `setMemorySelectionSource`, `switchTab`, `onTabChange`, `collectionsRoot`, `MEMORY_SELECTION_SOURCE_COLLECTIONS_ROOT`, `rootScrollRef`, `MemoryCollectionAlbumTile` ⇒ **todos ausentes del codigo**, no solo de la UI (0 resultados en `front/`). GAP: ninguno.

**ROOT-03** Root: `+` de create, hit area ≥ 44, sin círculo · `IMPLEMENTED` · frontend · LOW · device si · cubierto
TRUTH: create visible, ≥ 44x44, sin disco. CURR: `InteractivePressable` transparente con `minWidth/minHeight = touchTargets.normal = 44`, sin `hitSlop` ni círculo, `accessibilityLabel="Crear recuerdo"`, gated por `contribute`. EVID: `MemoryIntake.tsx:659-672,872-878`; `SCREEN:1731-1742`. NOTES: el círculo de `AppButton` fue evitado sin tocar `AppButton` global.

**ROOT-04** Root: refresh sin vaciar contenido · `PARTIAL` · frontend · MED · device si · parcial
TRUTH: nunca skeleton con datos cargados. CURR: `RefreshControl` gateado (`mountRefreshControl = !selecting`), botón de refresh removido, `refresh()` preserva y `loadFirstPage()` vacía. El código declara `PULL_TO_REFRESH = DEVICE_QA_REQUIRED`. EVID: `SCREEN:1603-1627,1727-1730,1786-1789`; `homecloudMemoryGestureOwnership.ts:193-197`. GAP: el brazo nativo del gesto no está probado. TEST: sin cobertura de feel.

**ROOT-05** Root: autoridad única de scope · `PARTIAL` · frontend · MED · device si · sin cobertura
TRUTH: un solo reset por household. CURR: **dos** efectos con dependencia `householdId` (`:336-341` y `:1415-1440`). El comentario `:1425` afirma "the one and only scope authority" y es **inexacto**. EVID: lectura de `SCREEN`. GAP: la afirmación de unicidad no coincide con el código. NOTES: funcionalmente no es bug evidente, pero el código no es confiable como autoridad.

**ROOT-06** Root: cambio de household no deja residuos · `PARTIAL` · frontend · MED · device si · sin cobertura
TRUTH: descartar todo del hogar anterior. CURR: limpia Memories, rail, album, colección, selección, viewer, offsets; y **`clearMemoryPreviewCache()`/`clearMemoryOriginalCache()` están cableadas** al reset (`homecloudScopeInvalidation.ts:77-78`) ⇒ las caches globales por `contentId` **no** filtran entre hogares. EVID: `SCREEN:1415-1440`. NOTES: correcto en caches.

**ROOT-07** Root: cambiar de pestaña global no debe romper nada · `BROKEN` · frontend · MED · device si · sin cobertura
TRUTH: cambiar `Archivos`/`Recuerdos` no altera ninguna sesión. CURR: ambos panes montados con `display:'none'`; tocar "Archivos" **desmonta** el pane de Memories ⇒ el Viewer se desmonta sin cerrar su sesión; al volver, **el Viewer reaparece solo**. EVID: `HomeCloudScreen.tsx:38-43,56`; `SCREEN:238,1865-1879`.

**ROOT-08** Root: offsets por superficie · `PARTIAL` · frontend · LOW · device si · cubierto
TRUTH: un offset por superficie. CURR: `scrollOffsetsRef` con clave `activeCollectionId ?? 'library'`, `key={sourceKey}`, restauración por efecto. **El overlay de Album NO restaura offset.** EVID: `SCREEN:695,703,1290-1294,1594`. GAP: offset de Album y de Tipo.

**ROOT-09** Root: banda de upload global · `IMPLEMENTED` · frontend · LOW · device si · cubierto
TRUTH: estado de subida honesto y visible. CURR: `HomeCloudUploadActivity` sobre ambos panes, con progreso, `Cancelar`, `Reintentar`, `Terminando…`, pendientes. EVID: `HomeCloudUploadActivity.tsx:18-35`; `HomeCloudScreen.tsx:36`. NOTES: bien resuelto.

**ROOT-10** Root: `Para volver a ver` en la raíz · `MISSING` · frontend+backend · HIGH · device si · sin cobertura
TRUTH: banda de resurfacing determinista. CURR: **ninguna**; solo existe el campo `hidden_from_resurfacing`. EVID: 0 componentes. GAP: superficie, algoritmo, viewer source, selector de destino.

### CREATE

**CRT-01** Create: menú de 4 modos · `IMPLEMENTED` · frontend · LOW · device si · cubierto
TRUTH: menú de primer nivel, sin submenú. CURR: los 4 existen en un único `ActionSheet size="content"` titulado `Guardar un recuerdo`; el item de galería está rotulado `Elegir foto/video/audio` en vez de `Fotos y videos`. EVID: `MemoryIntake.tsx:674-687`. NOTES: el copy difiere del congelado (ajuste cosmético); **la decisión de NO submenú está cumplida**.

**CRT-02** Create: `Nuevo álbum` NO está en el menú de create · `IMPLEMENTED` · producto · LOW · device no · cubierto
TRUTH: ausente. CURR: ausente; `MemoryIntake.tsx` no importa `createAlbum` y el servicio de intake prohíbe crear álbumes por contrato. EVID: 14 hits de `crear álbum` en `front/`, 0 en `MemoryIntake.tsx`. NOTES: correcto.

**CRT-03** Create: un solo modal a la vez · `IMPLEMENTED` · frontend · MED · device si · cubierto
TRUTH: nunca dos modales. CURR: un solo `ActionSheet` que reemplaza contenido; el Viewer **no** es `Modal`, así que abrir una hoja desde él produce **un** modal. EVID: `SCREEN:1924-2000`; `MemoryViewer.tsx:2,78,291`. NOTES: **riesgo a vigilar** cuando el Viewer pase a ser `Modal` (VIEW-01).

**CRT-04** Create: `+` oculto con `contribute = false` · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: monta solo con token+household; `triggerDisabled = !capabilities.contribute || picking || accepting`. EVID: `MemoryIntake.tsx:335`.

**CRT-05** Create: `+` oculto durante selección · `IMPLEMENTED` · frontend · LOW · device no · cubierto
CURR: el `+` está en la rama `else` del header mutuamente excluyente. EVID: `SCREEN:1699-1743`.

**CRT-06** Create: `Abrir configuración` en error de permiso · `BROKEN` · frontend · LOW · device si · sin cobertura
TRUTH: el usuario puede recuperar un permiso denegado permanentemente. CURR: el código renderiza `Abrir configuración` cuando `permissionDenied && canAskAgain === false`, pero **`permissionDenied` y `canAskAgain` nunca los emite ningún picker** ⇒ rama **inalcanzable**. EVID: `MemoryIntake.tsx:683,747`; `homecloudMemoryIntakeService.ts:230`; `homecloudMemoryPicker.ts:51,124-146`. NOTES: dead code.

### INTAKE

**INTAKE-01** Importar 1 imagen · `PARTIAL` · frontend · MED · device si · cubierto
TRUTH: preview dominante, fecha editable, álbum opcional, descripción opcional. CURR: preview correcto, descripción y álbum opcionales; **fecha read-only**. EVID: `MemoryMediaReview.tsx:44-67`; `MemoryIntake.tsx:716-741,806-820`. GAP: fecha editable. TEST: `homecloud_2c_memory_intake_tests`, `homecloud_s0_gallery_intake_contract_tests`.

**INTAKE-02** Importar 1 video · `PARTIAL` · frontend · MED · device si · cubierto
TRUTH: preview + fecha editable. CURR: `MemoryVideoPreview` con `nativeControls`, overlay y error boundary; probe de 32 bytes para el formato real con fail-open; fecha `unknown`. EVID: `MemoryMediaReview.tsx:69-108`; `homecloudArtifactMime.ts:99-112`. GAP: fecha editable.

**INTAKE-03** Importar audio · `PARTIAL` · frontend · MED · device si · parcial
TRUTH: identidad + reloj + seek; fecha editable. CURR: `DocumentPicker` `audio/*`, MIME por prefijo o extensión, `AudioReview` con reloj y play/pause, fecha `unknown` forzado. EVID: `homecloudMemoryPicker.ts:132-146`; `MemoryMediaReview.tsx:112-124`. GAP: fecha editable.

**INTAKE-04** Importar N imágenes (batch) · `MISSING` · frontend · HIGH · device si · sin cobertura
TRUTH: batch obligatorio, N fechas independientes, álbum masivo con override, un submit. CURR: `allowsMultipleSelection:false` + `assets?.[0]` + un único `binaryDraft`. EVID: `homecloudMemoryPicker.ts:113-114`; `MemoryIntake.tsx:130`. GAP: todo el dominio batch.

**INTAKE-05** Importar lote mixto imagen+video · `MISSING` · frontend · HIGH · device si · sin cobertura
TRUTH: habilitado. CURR: bloqueado por INTAKE-04; además el review elige **un** componente por MIME, sin selector de ítem. EVID: `MemoryMediaReview.tsx:19-29`.

**INTAKE-06** Intake: crear álbum desde el review · `DEFERRED` · n/a · LOW · device no · n/a
TRUTH: no es requirement de intake; el álbum se crea desde la selección. CURR: correcto por producto. EVID: `MemoryAlbumSelector` = chips de selección única. NOTES: **no abrir este gap.**

**INTAKE-07** Intake: jerarquía de información · `PARTIAL` · producto · MED · device si · sin cobertura
TRUTH: preview dominante, fecha como dato de primera clase, álbum y descripción opcionales. CURR: el orden es correcto (preview, fecha, descripción, álbum) pero la fecha se renderiza como un resumen gris de 3 `AppText` en tono secundario ⇒ invisible. EVID: `MemoryIntake.tsx:722-735,806-820`. NOTES: causa directa de la sensación "técnica y llena de formularios" de P7.

**INTAKE-08** Intake: no pedir datos que HomeCloud ya sabe · `PARTIAL` · producto · MED · device si · sin cobertura
TRUTH: el usuario aporta descripción, organización y corrección. CURR: se cumple en general (no pide nombre, mime, tamaño, household ni lifecycle) y se incumple en la fecha (no pide la corrección que debería poder hacer) y en la duración. EVID: `homecloudIntakeValidation.js`. NOTES: balance neto bueno; los dos huecos son específicos.

**INTAKE-09** Intake: un solo modelo de destino · `BROKEN` · frontend · LOW · device si · sin cobertura
TRUTH: una sola autoridad. CURR: `canShowDestinationSelector()`, `getInitialAlbum()`, `hasAlbumContext()`, `selectDestination()` existen y se exportan (`homecloudMemoryIntakeService.ts:311-316,380-386,411-415,432`) pero **el JSX usa estado local** y `selectDestination` nunca se llama. EVID: `MemoryIntake.tsx:134,735`.

**INTAKE-10** Intake: `durationMillis` se descarta · `BROKEN` · frontend+backend · MED · device si · sin cobertura
TRUTH: un dato capturado que no se puede persistir es código muerto; y no debe mostrarse si no se persiste. CURR: se captura con `Math.max(antes, después)` y validación de URI/tamaño, y **muere**: no está en `BinaryMemoryMetadata`, ni en `UploadIntakeContext`, ni en `createUploadJob`, ni en el payload de register, y **no existe columna en DB**. EVID: `MemoryAudioRecorder.tsx:127-135`; `MemoryIntake.tsx:560-564`; `homecloudUploadTypes.ts:43-61`; `homecloudUploadEngine.ts:291-313`; `homecloudIntakeService.js:267-281`. NOTES: decisión tomada — la duración se **deriva en reproducción** del archivo, no se persiste; el código que la captura debe eliminarse o consumirse.

### DATE

**DATE-01** Fecha: precedencia determinista EXIF · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: `DateTimeOriginal` → `DateTimeDigitized` → `DateTime`; primer parseo gana; sin valor ⇒ `unknown`. Parser estricto (regex, `Date.UTC`, rechazo de calendarios imposibles, rango 1..9999 / 1..12) y wall-clock→UTC deliberado. EVID: `homecloudMediaCaptureMetadata.ts:75-79,115-135,144-164`.

**DATE-02** Fecha: `uploaded_at` NUNCA como fallback · `IMPLEMENTED` · frontend+backend · LOW · device si · cubierto
CURR: prohibido en **5 lugares independientes**; el backend prohíbe que el cliente envíe `lifecycle`/`uploaded_at`/`household_id`/paths/`folder_id`. EVID: los cinco. NOTES: mejor implementada que la mayoría de los contratos del repo.

**DATE-03** Fecha: editable en intake binario · `MISSING` · frontend · **P1 producto** · device si · sin cobertura
TRUTH: la fecha es editable en intake, con las 4 precisiones. CURR: **read-only** como 3 `AppText`; el componente `MemorySemanticDateFields` con 4 chips + `DatePickerSheet` **existe y solo está montado en el formulario escrito**. EVID: `MemoryIntake.tsx:806-820` vs `:791`; `MemorySemanticDateFields.tsx:13-18,48-100`. PHYS: P7. GAP: el componente está construido y desconectado. TEST: ningún test afirma que sea editable. NOTES: **mejor relación effort/impacto de toda la auditoría.**

**DATE-04** Fecha: corrección posterior al guardado · `MISSING` · frontend+backend · **P1** · device si · sin cobertura
TRUTH: `Información del recuerdo` permite editar fecha, descripción y membresías. CURR: **no existe ninguna vía**; la única ruta PATCH de contenido es `/content/:contentId/file`, que es de **Files**. EVID: `backend/src/routes/homecloud.js:29-92,60`; `homecloudReadService.ts:380-434`. PHYS: P9. GAP: endpoint + servicio + superficie. **Requiere backend.**

**DATE-05** Fecha: audio importado siempre `unknown` · `IMPLEMENTED` (como decisión) · n/a · LOW · device si · cubierto
CURR: forzado, con las 4 alternativas evaluadas y rechazadas por escrito. EVID: `homecloudMemoryPicker.ts:145`; `homecloudMediaCaptureMetadata.ts:24-36`. NOTES: correcto; se resuelve con DATE-04, no con heurística.

**DATE-06** Fecha: video de galería siempre `unknown` · `IMPLEMENTED` (como decisión) · n/a · LOW · device VERIFY
CURR: el SDK iOS no entrega EXIF para video; documentado. EVID: `homecloudMediaCaptureMetadata.ts:38-41`. PHYS: P9. NOTES: la afirmación "no EXIF para video" es del equipo y **no está verificada por esta auditoría** en cada versión de iOS.

**DATE-07** Fecha: captura de cámara y audio grabado · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: `capturedAt = new Date().toISOString()` en el instante de la captura / antes de `record()`; `capturePrecision:'exact'`. EVID: `MemoryCameraSurface.tsx:110,157`; `MemoryAudioRecorder.tsx:119`; `homecloudMemoryPicker.ts:172,187`. NOTES: la fecha del **dispositivo** es correcta para una captura nativa.

**DATE-08** Fecha: `exif:true` de cámara es código muerto · `PARTIAL` · frontend · LOW · device si · sin cobertura
CURR: `takePictureAsync({quality:1, exif:true})` pero solo se lee `result.uri`. EVID: `MemoryCameraSurface.tsx:115-117`.

**DATE-09** Fecha: grupo `Sin fecha` en Timeline · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: modo `timeline` pone unknown y year-only al FINAL; modo `album` al PRINCIPIO; `flattenTimelineForSectionList` pone `yearTitle` solo en la primera sección del año. EVID: `homecloudMemoriesTimeline.ts:70,158-192,270-275,335`. NOTES: bien resuelto.

**DATE-10** Fecha: corrección masiva en lote · `DEFERRED` · n/a · LOW · device — · sin cobertura
TRUTH: OUT de V1 por decisión. CURR: ausente. NOTES: **decisión consciente, no un olvido.**

### ALB

**ALB-01** Albums: `+ Nuevo` en el header · `STALE` · frontend · MED · device si · **test contradictorio**
TRUTH: **PROHIBIDO**; la creación va en el tile final del riel. CURR: `+ Nuevo` en las 5 fases. EVID: `AlbumsRail.tsx:151-169`, usado en `:63,80,96,115`. HC2-C §3 y §8 lo congelaron así ⇒ **SUPERSEDED**. TEST: `homecloud_hc2c_memories_root_tests.ts:264-265` **afirma positivamente** el header ⇒ `RETARGET_LATER`. PHYS: P5. GAP: mover la affordance, no duplicarla.

**ALB-02** Albums: tile final `+ Nuevo álbum` · `MISSING` · frontend · MED · device si · sin cobertura
TRUTH: último ítem del riel, siempre, incluso con 0 álbumes, con icono **y** etiqueta. CURR: `ScrollView` renderiza solo `albums.map(...)`; `grep createTile` ⇒ 0. EVID: `AlbumsRail.tsx:121-132`. PHYS: P5. NOTES: un cuadrado vacío sin etiqueta es exactamente lo que P5 rechaza.

**ALB-03** Albums: estado con 0 álbumes · `STALE` · frontend · MED · device si · cubierto
TRUTH: solo el tile de creación. CURR: icono + `Todavía no hay álbumes` + `Creá uno para organizar tus recuerdos.` + botón `Crear álbum` **y además** el header `+ Nuevo`. EVID: `AlbumsRail.tsx:93-109`; `homecloudAlbumScope.ts:50-53`. NOTES: dos affordances simultáneas.

**ALB-04** Albums: crear álbum (flujo) · `IMPLEMENTED` · frontend+backend · LOW · device si · cubierto
CURR: `openCreateAlbum` → `AlbumNameSheet` (`keyboardAware`, `autoFocus`, `returnKeyType="done"`, `Guardar`/`Guardando…`, `closeDisabled` mientras guarda) → `POST /api/homecloud/albums` con `scope` → `reloadRail()` + `bumpDestinations()`. EVID: `SCREEN:486-524`; `AlbumSheets.tsx:28-97`; `homecloudReadService.ts:380-391`. NOTES: validación solo client-side de blank; duplicados permitidos sin precheck (correcto, no hay UNIQUE); la falla deja la hoja abierta.

**ALB-05** Albums: abrir álbum · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: overlay anidado con su propio `SectionList`, controlador con generación única, `missing` terminal, `loading` con 3 skeletons, `error` con `Reintentar`, vacío con CTA, `RefreshControl`, `accessibilityViewIsModal`. EVID: `AlbumDetailView.tsx`; `homecloudAlbumDetailPagination.ts:118-227`. NOTES: estados mutuamente excluyentes correctos.

**ALB-06** Albums: `Quitar del álbum` solo por selección · `STALE` · frontend · LOW · device si · cubierto
TRUTH: solo por selección contextual. CURR: `selecting={false}` **hardcodeado**, sin overlay X por tarjeta (HC2-C BUG D cerrado); el cableado es `enterRemoveFromAlbum` → selección → acción. EVID: `AlbumDetailView.tsx:178-204,185-197`; `grep albumScopeAction|onRemoveMemory` ⇒ 0. NOTES: HC2-C §12 cumplida; el problema es que la selección no se ve (SEL-03).

**ALB-07** Albums: eliminar álbum NO borra Memories · `IMPLEMENTED` · backend · LOW · device no · cubierto
CURR: `deleteAlbum` emite **un solo** statement contra `homecloud_albums`; **ninguna** sentencia contra `homecloud_contents`; las membresías caen por FK `ON DELETE CASCADE`. Requiere `organize`, **no** `delete`. EVID: `homecloudAlbumService.js:236-270`; `20260910000003:116`. TEST: `homecloud_moa1_album_contracts_tests`.

**ALB-08** Albums: eliminar álbum pide confirmación · `MISSING` · frontend · HIGH · device si · sin cobertura
TRUTH: diálogo explícito con la copy de supervivencia. CURR: botón destructivo **directo en la hoja**; `grep Alert.alert` en `components/homecloud/` ⇒ **0 resultados**. La copy `Los recuerdos no se eliminan: van a seguir en Recuerdos.` sí se renderiza siempre. EVID: `AlbumSheets.tsx:144-156`; `homecloudAlbumScope.ts:38-39`.

**ALB-09** Albums: renombrar · `IMPLEMENTED` · frontend+backend · LOW · device si · cubierto
CURR: `PATCH /api/homecloud/albums/:albumId`; solo `name`; el detalle abierto refleja el rename. EVID: `SCREEN:491-516`; `homecloudAlbumService.js:211-234`.

**ALB-10** Albums: portada, `itemCount`, orden · `IMPLEMENTED` · backend+frontend · LOW · device si · cubierto
CURR: portada = visual activo más antiguo en orden de álbum, con `HOME_CLOUD_ALBUM_COVER_KINDS = ['image','video']`; `itemCount` = agregado exacto con sweep paginado a 500 hasta agotamiento, sin N+1; orden `name asc` en el riel y `captured_year ASC` en el álbum. EVID: `homecloudReadService.js:318,343-394,405-419`; `homecloudMappers.js:159-165,206-225`. NOTES: el mapper **exige** el agregado (`throw homecloud_album_dto_requires_exact_item_count`) ⇒ no puede inventar un número.

**ALB-11** Albums: estado de carga de portada distinguible · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: `AlbumCoverLoading` = `Skeleton` con `accessibilityState={{busy:true}}` y label `"Cargando"` para `idle`/`loading`; fallback para `unavailable`/`error`/`imageFailed`. EVID: `AlbumTile.tsx:83-123`. NOTES: HC2-C B3 cerrado.

**ALB-12** Albums: crear álbum desde la selección · `MISSING` · frontend+backend · **P0** · device si · sin cobertura
TRUTH: crear álbum + attach de los N seleccionados en el mismo flujo; 0 álbumes ⇒ `Nuevo álbum` primario; cancelar conserva la selección; falla creación ⇒ selección intacta; falla parcial ⇒ fallidos siguen seleccionados; duplicados permitidos. CURR: **inexistente por decisión de código**: el picker se construye desde `rail.albums` y el propio código documenta "no 'create an Album from here'"; el servicio de intake prohíbe crear álbumes; con 0 álbumes la ruta es un dead end sin enlace. EVID: `SCREEN:1916-1919,1934-1956,1964-1972`. DONOR: los cuatro lo hacen en el mismo diálogo. NOTES: **es el gap P0 de §8.4 del prompt.** Ningún test lo cubre porque ninguno afirma que deba existir.

**ALB-13** Albums: quitar un solo Memory desde el Viewer · `MISSING` · frontend · MED · device si · sin cobertura
CURR: `removeMemoryFromOpenAlbum` existe (`homecloudMemoryAlbumRemoval.ts:61-77`) y **no tiene ningún llamador en todo `front/`**; el Viewer no tiene menú de acciones. NOTES: reservado para "Run B" y nunca conectado.

**ALB-14** Albums: `Agregar a otro álbum` · `MISSING` · frontend · MED · device si · sin cobertura
CURR: solo existe `Agregar a un álbum` (un único destino) y `Quitar N del álbum`. EVID: `SCREEN:1964-1981`. NOTES: necesario porque un Memory es N:M.

**ALB-15** Albums: sin Album Trash · `IMPLEMENTED` (por decisión) · schema · LOW · device no · n/a
TRUTH: no existe. CURR: `homecloud_albums.lifecycle in ('active','trashed')` + `trashed_at` existen, y `deleteAlbum` hace **hard delete** ⇒ la rama `trashed` es **código muerto por decisión**. EVID: `20260910000003:27-29,54-55,61-62`; `homecloudAlbumService.js:245`. NOTES: `EXISTING_UNUSED_CAPABILITY` **deliberado**. No es un gap.

**ALB-16** Albums: quitar membresía no cambia lifecycle · `IMPLEMENTED` · backend · LOW · device si · cubierto
CURR: `removeMemoryFromAlbum` emite **un solo** statement contra `homecloud_album_items`; ninguna contra `homecloud_contents`. EVID: `homecloudAlbumService.js:349-371`; `homecloudAlbumScope.ts:25-28`.

### TYP

**TYP-01** Tipos: 4 vistas automáticas en la raíz · `IMPLEMENTED` · frontend+backend · LOW · device si · cubierto
CURR: `MemoryTypesSection` con 4 tiles, sin count (documentado: "el read model entrega páginas, no totales; un número sería inventado"); `kind` **derivado** en `deriveMemoryKind`; filtro aplicado **en SQL**. EVID: `MemoryCollectionTile.tsx:28-39,86-126`; `homecloudMemoryCollectionsPagination.ts:65-70`; `homecloudMappers.js:33,53-60`; `homecloudReadService.js:688-694`. NOTES: correcto en los 3 niveles.

**TYP-02** Tipos: empty honesto · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: `Esta colección todavía no tiene recuerdos.` con `missing`/`loading&&length===0`/`error&&length===0`/vacío mutuamente excluyentes. EVID: `MemoryCollectionDetailView.tsx:90-133`.

**TYP-03** Tipos: selección dentro de un Tipo · `PARTIAL` · frontend · MED · device si · sin cobertura
TRUTH: la selección **no cambia** la estructura. CURR: el dataset se preserva, pero `showCollectionDetail = !selecting && ...` **desmonta el overlay** y la misma lista se presenta dentro de la raíz bajo `Álbumes`+`Tipos`. EVID: `SCREEN:1145,1448,1833-1863`. PHYS: misma clase que P4. GAP: cambio estructural visible.

**TYP-04** Tipos: el pager del Viewer recorre solo ese Tipo · `PARTIAL` · frontend · MED · device si · sin cobertura
CURR: correcto por construcción, pero cerrar la colección con el Viewer abierto (Android back) vacía el dataset y deja el Viewer en `Missing` **permanente**. EVID: `homecloudMemoryViewerSource.ts:53-68`; `homecloudMemoryViewerOpening.ts:157`. GAP: ver VIEW-07.

**TYP-05** Tipos: no duplicar Memories · `IMPLEMENTED` · backend · LOW · device no · cubierto
CURR: filtro `kind` en SQL sobre `homecloud_contents`; colecciones identificadas por `type:<kind>` opaco, sin tabla propia. EVID: `homecloudMemoryCollectionsPagination.ts:73-75`.

### SEL

**SEL-01** Selección: la sesión no contiene el llamador · `IMPLEMENTED` · frontend · LOW · device si · cubierto
TRUTH: sesión = `{mode, purpose, selectedIds, excludedIds}`. CURR: `MemorySelectionState` tiene exactamente esos 4 campos; **`source` no existe**; el tipo `MemorySelectionSource` **no existe** (solo un comentario que documenta su eliminación); `cancelMemorySelection` y `confirmMemorySelection` **no reciben segundo argumento**. EVID: `homecloudMemorySelection.ts:105-141,303-343`. NOTES: HC2-C §10 cumplida.

**SEL-02** Selección: entrar no cambia la IA · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: `rootHeader` **constante** (no ramifica por `selecting`); `sourceKey` depende solo de la colección abierta; sin `SegmentedControl`/`switchTab`/`collectionsRoot`. EVID: `SCREEN:1495-1512,698-703,1628`. NOTES: HC2-C BUG C cerrado.

**SEL-03** Selección: **preserva el contexto de llamador** · `BROKEN` · frontend · **P0 producto** · device si · **TEST GAP = YES**
TRUTH: Album A → selección = Album A; Tipo K → selección = Tipo K; raíz **nunca** es fallback. CURR: `showAlbumDetail = !selecting && openAlbumId !== null` desmonta el overlay, y `gridMemories` depende solo de `activeCollectionId` (que sigue `null`) ⇒ **el dataset visible pasa al Timeline de la raíz**. EVID: `SCREEN:918-932,1145,1442,1800-1823`. PHYS: **P4 confirmado**. GAP: **el invariante central de selección está violado**. TEST: ningún test afirma que el dataset siga siendo el del álbum; el comentario `SCREEN:921-924` afirma lo **contrario** de la verdad final, lo que es peor que no documentarlo. NOTES: una única causa raíz, dos gates. Corrección front-only pequeña.

**SEL-04** Selección: acciones visibles desde el primer fotograma · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: header `[X] N seleccionados [⋯ Acciones]`; **no hay ningún `✓`**; `⋯` abre la hoja ya al entrar. EVID: `MemorySelectionHeader.tsx:79-146`. NOTES: HC2-C §10 cumplida.

**SEL-05** Selección: drag contiguo (D4) · `IMPLEMENTED` · frontend · LOW · **device sí, obligatorio** · cubierto
CURR: toda la maquinaria intacta — `armMemoryDrag`/`beginMemoryDrag`/`stepMemoryDrag`/`applyMemoryVisualRange`, semántica visited-ONCE, slop 6px único, auto-scroll de borde (banda 0.18, 6–28 px/tick, 16ms), registro de filas por token, `measureInWindow` con `collapsable={false}`, `solveMemoryRefreshGate`, `createMemoryExitGestureLock`. EVID: `homecloudMemoryDrag.ts`; `MemorySelectableCard.tsx:67,127-198`; `SCREEN:774-898`. TEST: `homecloud_moa3_memory_selection_tests` (209) + `..._device_gesture_fix_tests` (90). NOTES: `MEMORY_DRAG_TAKEOVER_SLOP` no se redeclara en el screen.

**SEL-06** Selección: offset preservado · `PARTIAL` · frontend · MED · device si · sin cobertura
CURR: en raíz funciona; **en Album no**, porque su `SectionList` se desmonta al entrar y salir de selección. EVID: `SCREEN:695,1290-1294`; `AlbumDetailView.tsx`.

**SEL-07** Selección: fallo parcial honesto · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: banda inline con `failure.summary` + una línea por fallo + `Reintentar los que fallaron`; los ids comprometidos **no** se revierten; copy honesto. EVID: `MemorySelectionHeader.tsx:125-146`; `SCREEN:1086-1093,1049-1074`; `homecloudMemoryMutations.ts:72-90`. NOTES: patrón ejemplar.

**SEL-08** Selección: validación de destino autoritativa · `IMPLEMENTED` · frontend · LOW · device si · cubierto
CURR: relectura con `fetchHomeCloudAlbums` antes de confirmar; destino ausente ⇒ fallo terminal por ítem + `reloadRail()`. EVID: `SCREEN:1006-1028`.

**SEL-09** Selección: no mover a Colecciones · `IMPLEMENTED` · frontend · LOW · device si · cubierto
EVID: ver ROOT-02.

**SEL-10** Selección: acciones con 0 seleccionados · `IMPLEMENTED` · frontend · LOW · device no · cubierto
CURR: `actionsDisabled = selectedCount === 0 || busy`.

### VIEW

**VIEW-01** Viewer: superficie inmersiva · `BROKEN` · frontend · **P0 producto** · device sí · sin cobertura
TRUTH: chrome global oculto, safe areas respetadas, nada bajo la navbar. CURR: `View` con `{...absoluteFill, zIndex:20}` y **sin `Modal`**; navbar global (`zIndex:10`, hermano, `bottom:0`) pinta encima y tapa ~102 px; ancestros visibles e interactivos; **no consulta safe-area**; `paddingTop:90` mágico; cierre 42x42. EVID: `MemoryViewer.tsx:2,206,207,217,291`; `HomeTabNavigator.tsx:275-281,426-432`; `BottomTabView.js:247`; `HomeCloudScannerScreen.tsx:375-381`. PHYS: **P2 confirmado**. GAP: chrome global oculto + safe areas + hit area. NOTES: `react-native-safe-area-context@5.7.0` **ya instalada** ⇒ sin dependencia nueva. Converge con ROOT-07.

**VIEW-02** Viewer: el ítem exacto es la autoridad de apertura · `IMPLEMENTED` · frontend · MED · device sí · cubierto
TRUTH: invariante HC2-C §13. CURR: `resolveMemoryViewerIndex` usa **`findIndex` crudo** (sin fallback a 0), `opening lock` con 3 vías de liberación, `onActiveChange` con doble guarda, `alignedContentIdRef` anti-loop, **todas** las páginas declaran `width`. EVID: `homecloudMemoryViewerOpening.ts:97-102,115-204`; `MemoryViewer.tsx:77,84-85,134-146,170-177`; `MemoryVideoPage.tsx:66,165`; `MemoryAudioPage.tsx:67,166`. TEST: `homecloud_hc2c_viewer_opening_tests`. NOTES: **HC2-C BUG A completamente cerrado.** No contradice P1/P2, que son problemas de shell y señalización.

**VIEW-03** Viewer: la fuente es inmutable · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: `viewer.source` solo se escribe al abrir, vía 3 factories; `MemoryViewer.tsx` **no lee `source.kind`** (solo `source.label`); `memoryViewerDataset` devuelve `[]` en vez de adoptar otra fuente. EVID: `homecloudMemoryViewerSource.ts:21-68`. TEST: `hc2b:315`.

**VIEW-04** Viewer: dataset memoizado, identidad estable · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: `viewerMemories` **sí** memoizado con `reuseMemoryViewerDataset` devolviendo el array anterior verbatim si longitud e ids por posición coinciden; el campo muerto `MemoryViewerSession.memories` **fue borrado**. EVID: `SCREEN:1178-1188`; `homecloudMemoryViewerOpening.ts:214-225`; `homecloudMemoryViewerSource.ts:21-24`. TEST: `hc2b:64` verifica la **ausencia**.

**VIEW-05** Viewer: append no desplaza el activo · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: `onNearEnd` se llama **antes** del check de `accept`, con guarda `computedIndex >= length - 3`, y es lectura pura. EVID: `MemoryViewer.tsx:169-171`.

**VIEW-06** Viewer: `Missing` en vez de índice 0 · `IMPLEMENTED` · frontend · MED · device sí · cubierto
CURR: `if (memories.length === 0 || activeIndex < 0) return <Missing/>` con `Este recuerdo ya no está disponible.` + `Volver`. EVID: `MemoryViewer.tsx:205,290`.

**VIEW-07** Viewer: cerrar con back de Android · `BROKEN` · frontend · MED · device sí · sin cobertura
TRUTH: back cierra el Viewer. CURR: el `BackHandler` tiene 5 prioridades y **ninguna contempla el Viewer**; back ejecuta `closeCollection()`/`closeAlbum()` ⇒ dataset `[]` ⇒ `Missing` **sin cerrarse**, y como `homecloudMemoryViewerOpening.ts:157` rechaza toda escritura cuando `requestedIndex < 0`, **ningún video/audio al que se deslice después obtiene player**. EVID: `SCREEN:1307-1334,441-445,946-949`; `homecloudMemoryViewerSource.ts:63`; `homecloudMemoryViewerOpening.ts:115-124,157`.

**VIEW-08** Viewer: menú de acciones · `MISSING` · frontend · HIGH · device sí · sin cobertura
TRUTH: `⋯` con acciones según fuente y `kind`. CURR: el chrome tiene **solo** `top` y `bottom`; **no hay ningún control `⋯`**. EVID: `MemoryViewer.tsx:207,217`. NOTES: bloquea ALB-13, INFO-01, WRIT-04/05/06, RESURF-06 y LIFE-01 de una sola vez.

**VIEW-09** Viewer: cierre con hit area ≥ 44 · `PARTIAL` · frontend · LOW · device sí · sin cobertura
CURR: `AppButton variant="icon" size="sm"` = 42x42 (`smallButtonHeight=42` vs `touchTargets.normal=44`). EVID: `MemoryViewer.tsx:207`; `AppButton.tsx:119-120`; `theme.ts:507,570`.

**VIEW-10** Viewer: invariantes de ciclo de vida de media · `IMPLEMENTED` · frontend · MED · device sí · parcial
CURR: un solo `AppState` listener colapsado en `mediaPlaybackAuthorized`; `authorized===false` ⇒ pause y **nunca** resume; `onScrollBeginDrag` revoca de inmediato y un drag sin momentum restaura vía `momentumRef`; cambio de página asentado ⇒ página saliente inactiva ⇒ player desmontado ⇒ el hook libera; `useVideoPlayer`/`useAudioPlayer` son la **única** autoridad de release (sin `release()`/`remove()` manual); `MemoryMediaAccess` impide resurrección obsoleta; cambio de household revoca; el progreso de audio (4 Hz) vive en la página. EVID: `MemoryVideoPage.tsx:66,125,160-163`; `MemoryAudioPage.tsx:30-33,117-118`; `homecloudMemoryMediaPlayback.ts`. TEST: `homecloud_hc2b_media_viewer_tests`. NOTES: **no reabrir**. Riesgo: al mover el Viewer a un `Modal` (VIEW-01) hay que re-verificar que unmount sigue desmontando la página.

### IMG

**IMG-01** Imagen: preview → original progresivo · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: `uri = original ?? (preview.phase === 'ready' ? preview.url : null)`. EVID: `MemoryViewer.tsx:269,278`.

**IMG-02** Imagen: original **solo** para la página activa · `BROKEN` · frontend · HIGH · device sí · **test contradictorio**
TRUTH: página inactiva pide **preview**; solo la activa pide **original**. CURR: **`ImagePage` ni siquiera recibe la prop `active`** (firma `{memory, accessToken, width, onTap}`) y pide el original al montar, con deps que incluyen `scale` y `translate` ⇒ **hasta ~7 originales firmados concurrentes por apertura**, sin deduplicación en vuelo. EVID: `MemoryViewer.tsx:210,215,239,268,273`; `homecloudMemoryOriginal.ts:4-16`. CONTRAPUNTO: video y audio **sí** cumplen el invariante (early return por `!active` **antes** de que exista el subcomponente con hooks). TEST: `hc2b:204-205` verifica el invariante para video/audio ⇒ **el test documenta la regla pero no la aplica a imagen**. NOTES: HC2-C §24.1 (Run B/C7) nunca se implementó.

**IMG-03** Imagen: error con retry · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: `failed` por catch o `onError`; `Reintentar` bumpea `attempt` y re-ejecuta el efecto. EVID: `MemoryViewer.tsx:273,279`.

**IMG-04** Imagen: zoom pinch + pan · `BROKEN` (físico) · frontend · HIGH · device sí · sin cobertura de comportamiento
TRUTH: IN, verificado en el dedo. CURR: implementado con `PanResponder`, escala 1..3, pan clamp, arbitraje correcto. **Pero:** sin `onPanResponderTerminate`, sin `*Capture`, clamp vertical **mágico `±500`**, `Animated.event` ausente. EVID: `MemoryViewer.tsx:268-280`. PHYS: **P3, "no es usable"**. GAP: causa raíz **no aislada**. TEST: `hc2b` solo verifica `active={...}`; `hc2a` hace grep ⇒ **ningún test prueba comportamiento de zoom**. NOTES: los 4 defectos son corregibles sin dependencia nueva, pero **no explican por sí solos** la observación. Hace falta device trace del gesto.

**IMG-05** Imagen: reset de zoom · `PARTIAL` · frontend · LOW · device sí · sin cobertura
CURR: reset por cambio de `memory.id`; el Viewer remonta al reabrir. **Pero:** si la página permanece montada dentro del `windowSize=7` y el usuario vuelve a ella, **el zoom anterior se conserva**. EVID: `MemoryViewer.tsx:209,273`.

**IMG-06** Imagen: sin estado de carga infinito · `BROKEN` · frontend · MED · device sí · sin cobertura
CURR: si `accessToken === null` no se pide original y el preview queda `unavailable` ⇒ `uri === null`, `failed === false` ⇒ **spinner + `Cargando recuerdo…` indefinido**, sin error ni retry. Sin timeout ni estado terminal. EVID: `MemoryViewer.tsx:273,278-279`; `useMemoryPreviewUrl.ts:32-34`.

**IMG-07** Imagen: sin crop/edición · `DEFERRED` · n/a · LOW · device — · n/a
TRUTH: OUT. CURR: ausente. NOTES: correcto.

### VID

**VID-01** Video: shell inmediato · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: el overlay se monta sin condiciones. EVID: `MemoryViewer.tsx:206`. NOTES: correcto; es la mitad de la solución de P1.

**VID-02** Video: poster antes de `readyToPlay` · `MISSING` · frontend · **P0 producto** · device sí · **test contradictorio**
TRUTH: si `hasPreview`, el video se muestra como poster hasta que el player esté listo; si no, spinner honesto; nunca un cuadrado negro ambiguo. CURR: **`MemoryVideoPage.tsx` importa solo `getMemoryOriginalUrl`**; no importa `useMemoryPreviewUrl` ni lee `hasPreview`; no hay poster en ningún punto; el código lo declara (`NO POSTER, NO TRANSCODING`); el estado no-listo es un spinner sobre negro. EVID: `MemoryVideoPage.tsx:7,35-39,167`. PHYS: **P1**. TEST: `hc2b:211` **afirma la ausencia** de poster/transcod ⇒ el test codifica la ausencia como verdad ⇒ `RETARGET_LATER`. GAP: la pieza que hace la acción del tap perceptible.

**VID-03** Video: play/pause, scrub, tiempos · `IMPLEMENTED` · frontend · LOW · device sí (feel) · cubierto
CURR: `nativeControls` + `showsTimecodes` default; **el código nunca llama `play()`** ⇒ la reproducción arranca solo por controles nativos y no hay auto-resume. EVID: `MemoryVideoPage.tsx:125,148,162`. TEST: `hc2b:177` verifica la **ausencia** de `play()`.

**VID-04** Video: fullscreen · `MISSING` · frontend · MED · device sí, obligatorio · sin cobertura
CURR: `fullscreenOptions={{enable:false}}` **deshabilitado explícitamente**; la API lo soporta con una prop. EVID: `MemoryVideoPage.tsx:148`. NOTES: HC2-C §17 lo dejó para Run B y nunca llegó. Riesgo: fullscreen dentro de un `FlatList` paginado puede romper la paginación ⇒ device QA bloqueante.

**VID-05** Video: buffering y error honestos · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: overlay mientras `status !== 'readyToPlay'` con `pointerEvents="none"`; `resolveMemoryMediaFailure` clasifica `access` vs `playback`, y `unsupported` **solo** en la plataforma cuya API lo reporta. EVID: `MemoryVideoPage.tsx:129-154,167`; `homecloudMemoryMediaPlayback.ts:145,157-190`.

**VID-06** Video: página inactiva sin player · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: `if (!active) return <placeholder/>` **antes** de que exista el subcomponente con hooks. EVID: `MemoryVideoPage.tsx:66-67,96`. TEST: `hc2b:204-205`. NOTES: invariante correcto.

**VID-07** Video: velocidad, mute, volumen, dbl-tap, zoom · `DEFERRED` · n/a · LOW · device — · sin cobertura
TRUTH: OUT de V1. CURR: ausentes; `VideoView` no expone zoom. NOTES: decisión consciente.

**VID-08** Diagnóstico de transporte de upload · `EXISTING_UNUSED_CAPABILITY` · backend · LOW · device sí · n/a
CURR: el `console.log` preexistente del origin de la signed URL (`homecloudIntakeService.js:402-412`). NOTAS: es diagnóstico de **upload**, no de reproducción; **no aplica a P1**.

### AUD

**AUD-01** Audio: identidad visual no vacía · `PARTIAL` · producto · MED · device sí · sin cobertura
TRUTH: un Audio no puede estar visualmente vacío; la barra de progreso no es identidad. CURR: identidad = icono `musical-notes` + la palabra `Audio` + barra recta de 6px. No hay waveform (declarado). EVID: `MemoryAudioPage.tsx:167-170,217-219`. GAP: identidad visual real.

**AUD-02** Audio: play/pause, tap-seek, tiempos · `PARTIAL` · frontend · LOW · device sí · cubierto
TRUTH: tap-seek. CURR: play/pause (con replay si terminó), seek por **tap** con helpers puros, duración y reloj, barra `accessibilityRole="adjustable"`. **Sin arrastre continuo.** EVID: `MemoryAudioPage.tsx:117-118,140-160,173-189`.

**AUD-03** Audio: seek −10 / +10 · `MISSING` · frontend · MED · device sí, obligatorio · sin cobertura
CURR: ausente; `AudioPlayer.seekTo` instalada. NOTES: HC2-C §18, Run B.

**AUD-04** Audio: velocidad · `MISSING` · frontend · MED · device sí, obligatorio · sin cobertura
CURR: ausente; `setPlaybackRate` instalada y el rango iOS 0–2 alcanza. NOTES: HC2-C §18, Run B.

**AUD-05** Audio: buffering en reproducción · `PARTIAL` · frontend · LOW · device sí · sin cobertura
CURR: solo `Cargando audio…` mientras `!status.isLoaded` (que **no** es overlay: `styles.loading` no es absoluto, convive con los controles); una stalled en reproducción **no se anuncia**. Falta `isBuffering`. EVID: `MemoryAudioPage.tsx:171`.

**AUD-06** Audio: waveform · `DEFERRED` · stack · LOW · **device sí, obligatorio** · sin cobertura
TRUTH: **`FAKE WAVEFORM = OUT` (prohibido)**; `REAL WAVEFORM = CANDIDATE`; V1 recibe diseño honesto no-waveform y **no vacío**. CURR: **la API real existe y es pública**: `useAudioSampleListener(player, listener)` y `player.isAudioSamplingSupported` (`expo-audio@57.0.5`). Costo: (a) solo muestrea **durante la reproducción** — no hay muestreo en vivo al grabar; (b) requiere `RECORD_AUDIO` en Android; (c) el paquete advierte que no está soportado en todas las plataformas; (d) una waveform estática exigiría descargar y decodificar el original, caro con el modelo de signed URL actual. EVID: `node_modules/expo-audio/src/ExpoAudio.ts:238,240`; `src/index.ts:4`. TEST: `hc2b:260` **afirma la ausencia** de `waveform|sampleListener` ⇒ `RETARGET_LATER`. **CLASIFICACIÓN: `REAL_WAVEFORM_EXPENSIVE` + `DEVICE_VERIFY_REQUIRED`.** DONOR: **ninguno** de los cuatro muestra waveform. NOTES: la prohibición de fake waveform **no cambia** bajo ninguna circunstancia.

**AUD-07** Audio: no tocar la sesión de audio desde el Viewer · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: `MemoryAudioPage.tsx` **no** llama `setAudioModeAsync`; el grabador ya fuerza y restaura. EVID: test `hc2b:263`. DEUDA: el grabador **fuerza** un estado conocido en vez de restaurar el modo previo (`MemoryAudioRecorder.tsx:56-59,116`).

**AUD-08** Audio: error y seek-fail honestos · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: `status.error` → copy honesto **sin renderizar el string nativo** (verificado por `hc2b:258`); `seekFailed` → copy honesto. EVID: `MemoryAudioPage.tsx:120,127-132,159,172`.

### WRIT

**WRIT-01** Escrito: crear · `IMPLEMENTED` · frontend+backend · LOW · device sí · cubierto
CURR: 2 requests (`register` + `finalize`), idempotencia por `intake_request_id` + `idempotencyKey` + `mutationId`, único campo de texto, copy bueno, backend prohibiendo `displayName`/`mimeType`/`sizeBytes`/`extension`/`caption`/`documentDate`/`note`. EVID: `MemoryIntake.tsx:591-626,779-793`; `homecloudWrittenMemoryService.ts:16-51`; `homecloudIntakeValidation.js:146-166`.

**WRIT-02** Escrito: `Notas` es el tipo, no una app de notas · `IMPLEMENTED` · producto · LOW · device no · cubierto
CURR: único editor = `AppInput variant="multiline"`; **0** resultados de `markdown` en `services/homecloud`. EVID: `MemoryIntake.tsx:786`.

**WRIT-03** Escrito: elegir precisión · `PARTIAL` · frontend · MED · device sí · cubierto
CURR: los 4 chips y sus 3 sub-formularios funcionan y validan en 3 capas, **pero** elegir `Fecha exacta` **rellena hoy a las 00:00 UTC sin avisar** que es un valor por defecto, y la fecha manual se guarda como `T00:00:00.000Z`. EVID: `MemorySemanticDateFields.tsx:28,41,48-100`; `homecloudSemanticDate.ts:78-80,92-101`. NOTES: el usuario puede creer que registró una hora real.

**WRIT-04** Escrito: copiar · `MISSING` · frontend · LOW · device sí, obligatorio · sin cobertura
CURR: ausente; `Clipboard.setString` de RN core instalado (con advertencia de deprecación en `react-native/index.js:217-222`). NOTES: `expo-clipboard` **no** instalado ⇒ migración futura a un archivo.

**WRIT-05** Escrito: compartir texto · `MISSING` · frontend · LOW · device sí · sin cobertura
CURR: ausente; `Share.share({message})` de RN core con precedente en el repo. NOTES: `expo-sharing` no sirve para texto (exige URI de archivo local).

**WRIT-06** Compartir binario (OS share) · `MISSING` · frontend · MED · device sí, obligatorio · sin cobertura
TRUTH: IN; sharing de archivo local, nunca la signed URL, temporal acotado, estado honesto. CURR: la costura **existe y está probada en Files** pero nunca se invoca desde Memories; y tiene una **fuga probada**: escribe en `Paths.document/HomeCloud/` y **nunca borra**. EVID: `homecloudDownloadService.ts:51-115,65-67`. NOTAS: requiere narrowing — `HomeCloudMemoryListItem` tiene `displayName`/`mimeType`/`sizeBytes` **anulables** mientras la firma los requiere no nulos ⇒ solo un Memory **binario** se comparte como archivo.

**WRIT-07** Escrito: scroll de texto largo · `PARTIAL` · frontend · LOW · device sí · cubiertos
CURR: `ScrollView` vertical dentro de un pager horizontal con `onTouchEnd` que alterna el chrome ⇒ **un simple scroll vertical cambia el chrome**. EVID: `MemoryViewer.tsx:232`. NOTES: molesto, no bloqueante.

### INFO

**INFO-01** Superficie `Información del recuerdo` · `MISSING` · frontend · HIGH · device sí · sin cobertura
CURR: **no existe**; tampoco hay punto de entrada (tampoco hay `⋯` en el Viewer: VIEW-08). EVID: `MemoryViewer.tsx` (sin affordance de edición); `MemoryCards.tsx:36-38` documenta "cards are NON-INTERACTIVE by default".

**INFO-02** Distinguir "cuándo ocurrió" de "cuándo se agregó" · `PARTIAL` · frontend · MED · device sí · sin cobertura
CURR: **los datos existen y se proyectan** — `capturedAt/Year/Month/Precision`, `uploadedAt`, `uploadedByMemberId`; `lifecycle`/paths **nunca** se proyectan. Falta la superficie y los labels. EVID: `homecloudMappers.js:62-97`.

**INFO-03** Editar fecha / descripción / membresías · `MISSING` · frontend+backend · **P1** · device sí · sin cobertura
CURR: **no existe endpoint PATCH de memory**; la única ruta PATCH de contenido es de **Files**; no hay `updateMemory` en el cliente. EVID: `backend/src/routes/homecloud.js:29-92,60`; `homecloudReadService.ts:380-434`. GAP: **primer cambio de backend del carril.** NOTES: las mutaciones de membresía ya existen y se reutilizarían.

**INFO-04** Identidad técnica no es identidad de Memory · `PARTIAL` · backend · MED · device sí · cubierto
CURR: el mapper de lectura **no** proyecta paths/buckets/`lifecycle` (correcto), **pero** el endpoint `/access` **sí** devuelve `bucket` y `path` al cliente, pese a que los comentarios del propio servicio afirman "no internal paths, no bucket exposure". EVID: `homecloudStorageAccess.js:156-164`; `storage.controller.js:59-60` vs `homecloudMappers.js:22-23`. NOTES: contradicción **documentada en el propio código**. Impacto bajo (no son secretos), pero es una mentira en el código.

**INFO-05** Superficie única de edición · `DEFERRED` · n/a · LOW · device — · n/a
TRUTH: una sola vía. CURR: hoy no hay ninguna ⇒ se cumple vacío. NOTES: al crear Info, Intake e Info deben compartir la misma autoridad.

### ACT

**ACT-01** Una sola autoridad de acciones · `PARTIAL` · frontend · HIGH · device sí · sin cobertura
CURR: hay un **único** `ActionSheet` que sirve 3 acciones + el picker, y `AlbumActionsSheet` aparte. **No** existe un action-authority compartido; cada host compone sus botones. EVID: `SCREEN:1924-2000`; `AlbumSheets.tsx:126-158`. GAP: la autoridad compartida y 8 acciones.

**ACT-02** Acciones de selección: solo 3 · `PARTIAL` · frontend · HIGH · device sí · sin cobertura
TRUTH: 6 acciones. CURR: `Agregar a un álbum`, `Quitar N del álbum`, `Cancelar`. EVID: `SCREEN:1964-1998`. PHYS: P6. GAP: trash, crear álbum, restore, purge. NOTES: P6 **subestima**: faltan 4 de las 6.

**ACT-03** Acciones del Viewer · `MISSING` · frontend · HIGH · device sí · sin cobertura
CURR: **cero acciones**; las props del Viewer no incluyen ningún `onAction`. EVID: `MemoryViewer.tsx:68-70`. NOTES: bloquea 6 filas de otros dominios.

**ACT-04** `Quitar del álbum` solo donde aplica · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: gate `canRemoveFromOpenAlbum = purposeKind==='removeFromAlbum' && purposeAlbumId!==null`, y ese purpose solo lo establece `enterRemoveFromAlbum` (desde Album) ⇒ correcto por construcción. EVID: `SCREEN:918-932,1479,1973-1981`. NOTES: decisión correcta.

**ACT-05** Copy de `Quitar del álbum` inequívoco · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: exactamente eso, con el prohibition escrito en el código y exportado como `memorySelectionRemoveLabel`. EVID: `homecloudAlbumScope.ts:95-104`; `homecloudMemorySelection.ts:75`. NOTES: ejemplar.

NOTES: la confirmación de eliminar álbum se rastrea como **ALB-08** (mismo gap, no se duplica aquí).

**ACT-07** Compartir en selección múltiple · `DEFERRED` · n/a · LOW · device — · sin cobertura
TRUTH: DEFER. CURR: ausente, con el motivo documentado en `SCREEN:1982-1987`. NOTES: decisión consciente.

**ACT-08** Nunca dos modales a la vez · `IMPLEMENTED` · frontend · MED · device sí · cubierto
NOTAS: **riesgo a vigilar** al convertir el Viewer en `Modal`.

**ACT-09** Favoritos · `DEFERRED` · n/a · LOW · device — · n/a
TRUTH: DEFER (§22). CURR: no hay columna, no hay endpoint, no hay UI. DONOR: personal en Apple/Google/Samsung, household en Immich. NOTES: no se agrega al plan de V1; si se reconsidera como personal, requiere antes modelo de datos de visibilidad por miembro.

### LIFE / TRASH

**LIFE-01** Lifecycle: modelo ACTIVE/TRASHED/PURGED · `MISSING` · frontend+backend · **P0** · device sí · sin cobertura
CURR: **no existe ninguna parte**. EVID: `Select-String 'trash|restore|purge'` sobre todos los `*homecloud*` de `backend/src` ⇒ **13 hits, TODOS en comentarios**; **24 rutas, ninguna de trash/restore/purge**. GAP: endpoints + UI + todas las acciones.

**LIFE-02** Schema: `trashed` ya permitido · `IMPLEMENTED` · schema · LOW · device no · n/a
CURR: `CHECK (lifecycle in ('staging','active','trashed'))`, más `trashed_at`, `trashed_by_member_id` y el CHECK `((lifecycle='trashed') = (trashed_at is not null))`. EVID: `20260910000000:32-34,84-85,137-138`. NOTES: **`trashed` no requiere migración.** `purged` tampoco: es borrado físico.

**LIFE-03** Backend: nunca escribe `trashed` · `BROKEN` · backend · HIGH · device no · sin cobertura
CURR: `lifecycle` **solo** se escribe con `'staging'` (`:257,277`) o `'active'` (`:587,627`); `'trashed'` **nunca**. Las columnas de trash son **huérfanas** y su CHECK ata a un valor que el backend jamás produce. EVID: `homecloudIntakeService.js:257,277,587,627`. NOTES: hace el trabajo de backend de Lifecycle **pequeño y bien delimitado**.

**LIFE-04** `homecloud.delete` se exige en algún sitio · `BROKEN` · backend · **P0 seguridad** · device no · sin cobertura
CURR: `homecloud.delete` está **declarada** (`homecloudCapabilities.js:50`), **en la matriz por rol** (`householdPermissions.js:85-92` + SQL `:102-109`), y **proyectada al cliente** en `GET /capabilities` — y `Select-String 'homecloud\.delete'` sobre **todos** los `.js` de `backend/src` ⇒ **0 resultados**. RATIONALE en `homecloudAlbumService.js:25-28`: "reserved for lifecycle/destructive action against the Memory/File entity itself" — y esa acción **nunca se implementó**. IMPACTO: el cliente recibe `delete: true` y no hay nada que gatear. Con Lifecycle ausente, **cualquier miembro con `contribute` podría eliminar el contenido del hogar de forma definitiva** en cuanto exista el endpoint sin gate.

**LIFE-05** Filas `staging` abandonadas · `BROKEN` · backend · HIGH · device no · sin cobertura
CURR: un `register` que nunca llega a `finalize` deja una fila `staging` **permanente e invisible**; un `/verify` fallido deja la fila en staging con 409; **nada en el backend barre filas staging** (`grep 'orphan'` ⇒ 0; no hay cron ni Edge Function). El único sweep del repo es **de filesystem local**. EVID: `homecloudIntakeService.js:257,277,613-620`; `homecloudOrphanSweepPolicy.ts:11-17`; `homecloudUploadMaintenance.ts:23-31`.

**TRASH-01** Superficie Papelera · `MISSING` · frontend+backend · HIGH · device sí · sin cobertura
CURR: no existe. GAP: raíz + listado + estados.

**TRASH-02** Papelera vacía no es un álbum vacío · `DEFERRED` · n/a · LOW · device — · n/a
CURR: sin superficie, la regla no aplica todavía. NOTES: queda por decidir al implementarla.

**TRASH-03** Restaurar conserva la organización previa · `DEFERRED` (por ausencia de lifecycle) · n/a · HIGH · device sí · sin cobertura
CURR: no hay restore. **PERO el schema ya lo resuelve**: `homecloud_album_items.album_id` tiene `ON DELETE CASCADE` ⇒ al borrar el álbum la membresía desaparece sola ⇒ no hay relación huérfana que recrear; y el filtro de álbum ya excluye `lifecycle != 'active'`. EVID: `20260910000003:116`; `homecloudReadService.js:537-538`. NOTES: el modelo ya soporta la semántica; falta endpoint y UI.

**TRASH-04** Borrado permanente con confirmación · `MISSING` · frontend+backend · HIGH · device sí, obligatorio · sin cobertura
CURR: ausente.

**TRASH-05** Purge real: filas **y** bytes · `MISSING` · backend · HIGH · device no · sin cobertura
GAP: borrar fila + `homecloud-originals` + `homecloud-previews` + membresías (FK cascade cubre membresías); fallo de storage ⇒ operación fallida y reintentable, **no** éxito mentiroso. NOTES: hay una costura reutilizable — `homecloudStoragePaths.js` ya define las rutas `{household}/{content}/{variant}` y sus policies RLS.

**TRASH-06** Signed URL de un Memory trashed da 404 · `IMPLEMENTED` · backend · LOW · device no · cubierto
CURR: `homecloudStorageAccess.js:106-108` devuelve 404 cuando `lifecycle !== 'active'`. NOTES: **el mecanismo de seguridad ya existe**; solo falta que algo escriba `TRASHED`.

**TRASH-07** Permisos de restore y purge · `DEFERRED` (por ausencia de lifecycle) · n/a · HIGH · device no · sin cobertura
CURR: ausente. Ver LIFE-04.

### RESURF

**RESURF-01** Superficie `Para volver a ver` · `MISSING` · frontend · HIGH · device sí · sin cobertura
CURR: **ninguna**. GAP: banda, algoritmo, `viewer` factory, selector de destino.

**RESURF-02** `hidden_from_resurfacing` sin UI · `MISSING` · frontend · HIGH · device sí · sin cobertura
CURR: campo `boolean NOT NULL DEFAULT false`, validado en backend (400 propio; prohibido `true` para `role='file'`), proyectado en el mapper, y el cliente lo escribe **hardcodeado `false`** para escritos. `grep` en `front/` ⇒ **2 ocurrencias, ambas no-UI**. EVID: `20260925000000:50`; `homecloudIntakeValidation.js:254-268`; `homecloudMappers.js:73`; `homecloudWrittenMemoryService.ts:34`. TEST: `homecloud_moa3_memory_selection_tests:1163` exige que la **selección** no incluya el flag. NOTES: `CURRENT_AUDIT_AFTER_SLICE_01.md:73` ya lo registra como GAP UI.

**RESURF-03** Determinismo y sensibilidad a precisión · `DEFERRED` (por ausencia de superficie) · n/a · MED · device sí · sin cobertura
TRUTH: solo `exact` y con fecha anterior a hoy participa; `month_year`/`year`/`unknown` quedan fuera; **nunca** inventar día o mes. NOTA CRÍTICA: como los videos de galería y el audio importado resuelven **siempre** `unknown` (DATE-05, DATE-06), **nunca aparecerían** en resurfacing. Eso es correcto y se resuelve con DATE-03/DATE-04, **no** con una heurística.

**RESURF-04** Un grupo por año · `DEFERRED` · n/a · LOW · device sí · n/a
TRUTH: si el mismo día aparece en tres años, hay tres grupos. NOTES: decisión de algoritmo ya tomada.

**RESURF-05** Sin grupos, la banda no se muestra · `DEFERRED` · n/a · LOW · device sí · n/a
CURR: sin superficie.

**RESURF-06** Acciones de resurfacing · `MISSING` · frontend · MED · device sí · sin cobertura
TRUTH: abrir grupo, abrir Memory (pager solo del grupo), agregar a álbum, trash, ocultar, y **selección preservando el grupo**. CURR: ninguna. GAP: requiere una 4ª `viewer` factory, una extensión del union `MemoryViewerSourceKind`, y un dataset propio.

**RESURF-07** Ocultar un grupo o rango de fechas · `DEFERRED` · schema · LOW · device — · n/a
TRUTH: OUT de V1 explícito. CURR: solo existe el flag **por Memory**. DONOR: Google permite ocultar personas, fechas y rangos, y apagar la función entera. NOTES: requiere modelo de datos nuevo. **Declarado OUT para no dejarlo como ambigüedad.**

### CAM

**CAM-01** Camera: pipeline compartido con import · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: **probado en 4 puntos**: (1) mismo shape `{success, artifact, capture, source, durationMillis}` en `homecloudMemoryPicker.ts:94-96` (import) y `:169-175` (cámara); (2) mismo `BinaryMemoryDraft` vía `setBinaryDraft` (`MemoryIntake.tsx:364` import, `:477` cámara); (3) mismo render + `submitBinary`; (4) única divergencia: `source:'camera'`. NOTES: **correcto por producto.** No abrir este gap.

**CAM-02** Camera: 3 estados de permiso · `IMPLEMENTED` · frontend · LOW · device sí, obligatorio · sin cobertura
CURR: `useCameraPermissions` + `useMicrophonePermissions`; `permission==null` ⇒ `ActivityIndicator`; `canAskAgain` ⇒ `Permitir cámara`; no ⇒ `Abrir configuración`; micrófono perezoso en `startVideo`. EVID: `MemoryCameraSurface.tsx:4,32-33,154-155,189-190,203`.

**CAM-03** Camera: captura, retake, review · `IMPLEMENTED` · frontend · LOW · device sí, obligatorio · sin cobertura
CURR: `SegmentedControl Foto/Video`, shutter con `accessibilityLabel` por estado, temporizador, `Repetir`, `Usar foto`/`Usar video`, facing switch, remount por readiness, MIME/ext por **probe de 32 bytes** con `throw` si no se puede determinar. EVID: `MemoryCameraSurface.tsx:41-206`; `homecloudArtifactMime.ts:43-81`.

**CAM-04** Camera: fecha = instante real de captura · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
EVID: `MemoryCameraSurface.tsx:110,157`; `homecloudMemoryPicker.ts:172`. NOTES: la deuda de `exif:true` no le afecta (DATE-08).

**CAM-05** Camera: álbum y descripción opcionales · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: se preguntan en el review, no en la cámara. EVID: `MemoryCameraSurface` sin selector de álbum; `MemoryIntake.tsx:725-735` sí.

**CAM-06** Camera: AppState durante grabación · `IMPLEMENTED` · frontend · MED · device sí, obligatorio · sin cobertura
CURR: `status !== 'active'` ⇒ invalidate + stop + `ready=false`. EVID: `MemoryCameraSurface.tsx:79-84`.

**CAM-07** Camera: fallos honestos con retry · `IMPLEMENTED` · frontend · LOW · device sí · sin cobertura
CURR: 4 copies honestas distintos. EVID: `MemoryCameraSurface.tsx:118,163,184,200`.

**CAM-08** Camera: retorno y handoff · `PARTIAL` · frontend · MED · device sí · sin cobertura
CURR: el handoff de audio es un estado de hoja **sin JSX** (`audio-handoff`), y la transición real ocurre en un `useEffect` que setea dos estados en el mismo tick ⇒ funciona, pero es invisible y frágil. EVID: `MemoryIntake.tsx:47,399-414,452-465`.

**CAM-09** Camera: recarga de destinos · `PARTIAL` · frontend · LOW · device sí · sin cobertura
CURR: `openCreate` y `openWritten` llaman `reloadDestinations()`; **`openCamera` NO** ⇒ la lista de álbumes del review puede estar más vieja que en el resto de la app. EVID: `MemoryIntake.tsx:473` vs `:617-635`.

### PERF / LOAD / UPLOAD

**PERF-01** Budget: 1 original por apertura · `BROKEN` (imagen) / `IMPLEMENTED` (video, audio) · frontend · HIGH · device sí · test contradictorio
TRUTH: como máximo 1 original por apertura. CURR: imagen hasta ~7 (IMG-02); video y audio 1 (VID-06). EVID: los anteriores.

**PERF-02** Deduplicación de requests en vuelo · `MISSING` · frontend · MED · device sí · sin cobertura
CURR: los dos servicios de media cachean **solo URLs resueltas** y **no** deduplican peticiones en vuelo ⇒ N ids distintos ⇒ N requests simultáneos. EVID: `homecloudMemoryOriginal.ts`; `homecloudMemoryPreview.ts`. NOTES: HC2-C §24.3 (C7) nunca implementado.

**PERF-03** Caches de signed URL acotadas y por scope · `PARTIAL` · frontend · MED · device sí · sin cobertura
CURR: **`clearMemoryPreviewCache`/`clearMemoryOriginalCache` están cableadas** al reset de household ⇒ **no filtran entre hogares** (correcto). **Pero el crecimiento es no acotado**: un entry por `contentId` visto en la sesión, sin TTL de entrada más allá de la expiración de la URL. NOTES: HC2-C §24.2 — **no** inventar LRU; solo acotar.

**PERF-04** Ventaneo del Viewer acotado · `IMPLEMENTED` · frontend · LOW · device no · cubierto
CURR: `VIEWER_WINDOW=3` ⇒ `initialNumToRender=3`, `maxToRenderPerBatch=3`, `windowSize=7`. EVID: `MemoryViewer.tsx:210,227`.

**PERF-05** Refresh sin vaciar contenido · `PARTIAL` · frontend · MED · device sí · parcial
CURR: `refresh()` preserva, `loadFirstPage()` vacía con skeleton; `useFocusEffect` usa `loadFirstPage()` ⇒ en cada refocus se reemplaza el contenido por objetos nuevos ⇒ re-render de la SectionList completa. EVID: `SCREEN:275-312,332,377-384`.

**PERF-06** Upload durable completo · `IMPLEMENTED` · frontend · MED · device sí, obligatorio · cubierto
CURR: **todo presente y bien construido**. `recoverEntryPoint` reanuda desde el punto correcto; `isAutoRecoverableJob` solo auto-reanuda si está mid-flight o si `failed && error.retryable` ⇒ **un fallo terminal nunca se reintenta en cada arranque**; guarda de conectividad ⇒ **offline no quema jobs**; sweep borra solo carpetas de >24h sin job vivo; reconciliación usa el `householdId` **del job**; single-flight por scope. EVID: `homecloudUploadJob.ts:21-68,215-234`; `homecloudUploadEngine.ts:352-369`; `homecloudUploadRecovery.ts:42-141`; `homecloudUploadRuntime.ts:129-243`; `homecloudUploadCoordinator.ts:118-188`. TEST: `homecloud_upload_recovery_tests`, `homecloud_t1_queue_persistence_tests`, `homecloud_s2i_durable_recovery_tests`, `..._t2_d1_native_upload`. NOTES: **la parte más sólida del repo.**

**PERF-07** `staging` no se presenta como compartido · `IMPLEMENTED` · frontend+backend · LOW · device no · cubierto
CURR: `listMemories` filtra `lifecycle='active'` **en SQL**, no post-filtrado; la banda de upload es el único lugar donde aparece lo pendiente. EVID: `homecloudReadService.js:678`.

**PERF-08** Cancelar desde la propia superficie de intake · `PARTIAL` · frontend · LOW · device sí · sin cobertura
CURR: `homecloudMemoryIntakeService.cancel()` existe y se exporta, y **ninguna UI de intake lo invoca** ⇒ `status:'cancelled'` es inalcanzable desde intake. El cancel real vive en la banda global. EVID: grep del símbolo en `MemoryIntake.tsx` ⇒ 0 usos. NOTES: código muerto.

**LOAD-01** Superficies con estados excluyentes · `PARTIAL` · frontend · MED · device sí · parcial
CURR: bien resuelto en Timeline, rail de álbumes, álbum y colección (`missing`/`loading&&length===0`/`error&&length===0`/vacío). **Excepción: Viewer** — `Missing` es **irrecuperable** dentro de la misma sesión (VIEW-07); y la página de imagen tiene estados colgantes (IMG-06). TEST: `homecloud_hc2c_viewer_opening_tests`.

**UPL-01** Intake: salir de pantalla no interrumpe la subida · `IMPLEMENTED` · frontend · LOW · device sí, obligatorio · cubierto
CURR: `closeReview` **no** borra el artefacto si `hasActiveJob()`; `dismiss()` limpia UI sin cancelar; el coordinador es process-wide. EVID: `MemoryIntake.tsx:452-465`; `homecloudMemoryIntakeService.ts:359-366`.

**UPL-02** Intake: cambio de foco descarta el draft · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: al perder foco se invalidan guards, `clearBinaryDraft('focus_lost')`, `dismiss()`, `setSheet(null)`; **solo** descarta el artefacto si `!hasActiveJob() && !acceptingRef`. EVID: `MemoryIntake.tsx:520-534`. NOTES: correcto y sutil.

**UPL-03** Upload: honestidad de estados · `IMPLEMENTED` · frontend · LOW · device sí · cubierto
CURR: el progreso es efímero y **nunca se persiste**; 6 copies distintos según el estado; `Reintentar` y `Cancelar` por job. EVID: `HomeCloudUploadActivity.tsx:18-35`; `homecloudUploadCoordinator.ts:22-23`.

**UPL-04** `staging` con verify fallido · `BROKEN` · backend · MED · device sí · sin cobertura
CURR: `/verify` falla ⇒ 409 `homecloud_verify_failed` y **la fila sigue en staging**, sin mecánica de reintento a nivel de servidor. EVID: `homecloudIntakeService.js:611-620`. NOTAS: relacionado con LIFE-05.

### SRCH / CAP / DEP

**SRCH-01** Search en Memories · `EXISTING_UNUSED_CAPABILITY` · backend+frontend · LOW · device no · sin cobertura
TRUTH: **OUT de V1** (decisión explícita). CURR: **tres sub-capas, dos sin uso**. Backend: `GET /memories?query=` → `.or('caption.ilike.%s%,written_text.ilike.%s%,display_name.ilike.%s%')` con normalizador que neutraliza `,()`. Cliente: `memoriesQueryString` incluye `query` pero **los 4 call-sites de `listMemories` nunca lo pasan** y `buildMemoryCollectionQuery` nunca lo emite. UI: **ausente**. INDEX: **no existe** ⇒ cualquier búsqueda futura es un seq scan. EVID: `homecloudReadService.js:695-699,610-613`; `homecloudReadService.ts:459`. NOTES: **no borrar en esta auditoría.** Files **sí** tiene search end-to-end (`homecloudFilesService.js:49,66` + `HomeCloudFilesScreen.tsx:180`) ⇒ capacidad distinta y en uso.

**CAP-01** `homecloud.delete` sin uso · `EXISTING_UNUSED_CAPABILITY` · backend · **P0 seguridad** · device no · sin cobertura
EVID: ver LIFE-04.

**CAP-02** Matriz de capacidades duplicada JS + SQL · `IMPLEMENTED` · backend+schema · LOW · device no · cubierto
CURR: `DEFAULT_HOUSEHOLD_PERMISSIONS` y la migración contienen matrices **idénticas**; `readHouseholdPermission` hace override por clave con fallback al default ⇒ **parche parcial, no reemplazo**; un rol no final ⇒ todo false; `membershipStatus !== 'active'` ⇒ las 4 false. EVID: `householdPermissions.js:7-126`; migración `:78-109`. NOTAS: correcto, con la justificacion del defecto 2026-09-17 documentada en la migracion.

**CAP-03** RLS sin policies · `PARTIAL` · schema · MED · device no · sin cobertura
CURR: 4 tablas con RLS enabled y **0 policies + 0 GRANT** ⇒ default deny; solo `service_role` (BYPASSRLS) lee. La migracion HC-1D de RLS **nunca se materializo**. EVID: `20260910000000:177`; `..._folders_:122`; `..._albums_:194-195`; `grep 'create policy.*homecloud'` ⇒ solo 2, en `storage.objects`. NOTAS: default deny es seguro, pero **no hay defensa en profundidad** si algún día se agrega un GRANT. TEST: `homecloud_1d_rls_bypass_tests` y `homecloud_1e_storage_rls_tests` están **HUÉRFANOS**.

**DEP-01** Waveform: API disponible, no usada · `EXISTING_UNUSED_CAPABILITY` · stack · LOW · device sí · sin cobertura
CURR: `useAudioSampleListener` + `isAudioSamplingSupported` públicos en `expo-audio@57.0.5`. Ver AUD-06. NOTAS: **no borrar**; es la vía de V1.1 si la device QA lo valida.

**DEP-02** Sin gesture-handler / reanimated · `EXISTING_UNUSED_CAPABILITY` (negativa) · stack · LOW · device — · n/a
CURR: **no instalados**. Consecuencia: doble toque fuera de alcance sin dependencia nueva; el zoom de imagen y el scrub de audio se calculan en JS. NOTAS: decisión consciente de no agregar dependencias; HC2-C §25 congelo "cero dependencias nuevas".

**DEP-03** react-native-safe-area-context instalado y sin usar en el Viewer · `EXISTING_UNUSED_CAPABILITY` · stack · LOW · device sí · sin cobertura
CURR: 5.7.0 instalada; usada en `MemoryCameraSurface.tsx:6` y `HomeCloudScannerScreen.tsx:14`; **no** en `HomeCloudMemoriesScreen`, `MemoryViewer`, `MemoryIntake`, `MemoryAudioRecorder`, `HomeCloudFilesScreen`. NOTAS: **la corrección de VIEW-01 no requiere dependencia nueva.**

**TEST-01** Suites de test huérfanas · `PARTIAL` · test · MED · device no · n/a
CURR: **13 de 53** archivos `scripts/homecloud_*` no aparecen en ningún grupo de `tests/run.js`. Incluidos los **5 `1d_*`**, que son los únicos que probarían el enforcement de capacidades (con `rls_bypass` y la regresión de hogar nuevo). EVID: búsqueda por basename sobre el contenido íntegro de `tests/run.js`. EVID adicional: `run.js:410-419` invoca `node` sobre archivos **`.ts`** sin compilar, a diferencia de todos los demás grupos TS. NOTAS: la capability enforcement **no tiene gate en CI**.

**TEST-02** Gates preexistentes que fallan por causas ajenas · `EXISTING_UNUSED_CAPABILITY` · test · LOW · device no · n/a
CURR: según la sesion HC2-C, `tsc -p scripts/tsconfig.test.json` falla con 5 errores en `scripts/planner_v1_navigation_tests.ts`, y `expo lint` da 3 errores en `components/planner/*`; un filtro `homecloud|memory` sobre la salida de `tsc` da **cero** errores de HomeCloud. EVID: reportado en `HC2C_TOTAL_CURRENT_AUDIT.md:69-74`. NOTAS: **no re-ejecutado en esta sesión.** Los agregados de suites y `npm run typecheck` fallan en la baseline por esto.

---

## 6. Broken Paths

`BROKEN` = existe implementación pero viola la verdad final o la evidencia física.

| ID | Qué viola | Causa raíz | Capa | Severidad |
| --- | --- | --- | --- | --- |
| **VIEW-01** | El Viewer no es una superficie inmersiva: el navbar global tapa ~102 px y el chrome superior queda visible | `View`+`zIndex:20` en vez de `Modal`; `zIndex` no transitivo entre subárboles; sin safe-area | frontend | **P0** |
| **SEL-03** | La selección **no preserva el contexto de llamador** en Album | `showAlbumDetail = !selecting && ...` desmonta el overlay; `gridMemories` depende solo de `activeCollectionId` | frontend | **P0** |
| **PERF-01** | Se piden hasta ~7 originales firmados por apertura de imagen | `ImagePage` no recibe `active`; video y audio sí cumplen | frontend | HIGH |
| **ROOT-07** | Cambiar de pestaña global hace reapappear el Viewer solo | estado del Viewer independiente del montaje del pane | frontend | MED |
| **IMG-02** | Se piden hasta ~7 originales firmados por apertura | `ImagePage` no recibe `active` | frontend | HIGH |
| **IMG-04** | El zoom no es usable en el dedo | **no aislada**; 4 defectos adyacentes corregibles | frontend | HIGH |
| **IMG-06** | Estado de carga perpetuo sin salida ni timeout | sin `accessToken` ni preview, `uri` queda `null` sin `failed` | frontend | MED |
| **VIEW-07** | Back de Android deja el Viewer en `Missing` permanente y sin player | `BackHandler` sin rama de viewer; `requestedIndex` congelado en `-1` | frontend | MED |
| **LIFE-03** | El backend nunca escribe `trashed` | solo escribe `'staging'` y `'active'` | backend | HIGH |
| **LIFE-05** | Filas `staging` abandonadas para siempre | nada barre staging en Postgres | backend | HIGH |
| **UPL-04** | `/verify` fallido deja la fila en staging sin reintento de servidor | 409 y no hay estado de reintento backend | backend | MED |
| **CRT-06** | `Abrir configuración` inalcanzable | `permissionDenied`/`canAskAgain` nunca emitidos | frontend | LOW |
| **INTAKE-09** | Doble modelo de destino en intake | API de destinos exportada y no usada por el JSX | frontend | LOW |
| **INTAKE-10** | `durationMillis` capturado y descartado | sin columna, sin payload | frontend+backend | MED |
| **LIFE-04** | `homecloud.delete` se proyecta al cliente y ninguna ruta la exige | declarado + proyectado + 0 asserts | backend | **P0 seguridad** |

## 7. Missing Paths

`MISSING` = la verdad final lo requiere y CURRENT no tiene implementación.

| ID | Qué falta | Capa | Severidad |
| --- | --- | --- | --- |
| **ALB-12** | Crear álbum desde Memories seleccionados | frontend+backend | **P0** |
| **LIFE-01** | Lifecycle completo (trash/undo/restore/purge) | frontend+backend | **P0** |
| **TRASH-01** | Superficie Papelera | frontend+backend | HIGH |
| **TRASH-04** | Borrado permanente con confirmación | frontend+backend | HIGH |
| **TRASH-05** | Purge real de filas y bytes | backend | HIGH |
| **RESURF-01** | Superficie `Para volver a ver` | frontend | HIGH |
| **RESURF-02** | `No mostrar este recuerdo acá` | frontend | HIGH |
| **RESURF-06** | Acciones de resurfacing + 4ª viewer factory | frontend | MED |
| **VIEW-08** | Menú de acciones del Viewer | frontend | HIGH |
| **ACT-03** | Acciones del Viewer | frontend | HIGH |
| **INFO-01** | Superficie `Información del recuerdo` | frontend | HIGH |
| **INFO-03** | Editar fecha / descripción / membresías | frontend+backend | **P1** |
| **DATE-03** | Fecha editable en intake binario | frontend | **P1** |
| **DATE-04** | Corrección de fecha posterior al guardado | frontend+backend | **P1** |
| **INTAKE-04** | Importar N imágenes (batch) | frontend | HIGH |
| **INTAKE-05** | Lote mixto imagen+video | frontend | HIGH |
| **VID-02** | Poster de video antes de `readyToPlay` | frontend | **P0** |
| **VID-04** | Fullscreen de video | frontend | MED |
| **AUD-03** | Seek −10 / +10 de audio | frontend | MED |
| **AUD-04** | Velocidad de audio | frontend | MED |
| **WRIT-04** | Copiar recuerdo escrito | frontend | LOW |
| **WRIT-05** | Compartir texto | frontend | LOW |
| **WRIT-06** | OS share de binario | frontend | MED |
| **ALB-02** | Tile final `+ Nuevo álbum` | frontend | MED |
| **ALB-08** | Confirmación de eliminar álbum | frontend | HIGH |
| **ALB-13** | Quitar un solo Memory desde el Viewer | frontend | MED |
| **ALB-14** | `Agregar a otro álbum` | frontend | MED |
| **ROOT-10** | Banda de resurfacing en la raíz | frontend | HIGH |
| **PERF-02** | Deduplicación de requests en vuelo | frontend | MED |

## 8. Partial Paths

`PARTIAL` = hay porción útil pero el contrato final está incompleto.

| ID | Qué falta para cerrar |
| --- | --- |
| **ROOT-04** | Verificar el pull-to-refresh en el dedo |
| **ROOT-05** | Reconciliar los dos efectos de scope; corregir el comentario |
| **ROOT-06** | Verificar cambio de household con draft de intake abierto |
| **ROOT-08** | Offset de Album y de Tipo |
| **INTAKE-01/02/03** | Fecha editable (comparten la misma causa) |
| **INTAKE-07/08** | Jerarquía de la fecha; no pedir lo que ya se sabe |
| **DATE-08** | `exif:true` muerto en cámara |
| **TYP-03** | La selección dentro de un Tipo no debe cambiar la estructura |
| **TYP-04** | El `Missing` del Viewer debe ser recuperable |
| **SEL-06** | Offset de Album en selección |
| **VIEW-09** | Hit area del cierre ≥ 44 |
| **IMG-05** | Reset de zoom al reentrar en una página montada |
| **AUD-01/02** | Identidad visual real; arrastre continuo de seek |
| **AUD-05** | `isBuffering` en reproducción |
| **WRIT-03** | Marcar el default "hoy 00:00 UTC" |
| **WRIT-07** | El scroll vertical no debe alternar el chrome |
| **INFO-02** | Labels de "cuándo ocurrió" vs "cuándo se agregó" |
| **INFO-04** | `/access` no debe exponer `bucket` y `path` |
| **ACT-01/02** | Autoridad compartida y 4 acciones |
| **TRASH-03** | Endpoint de restore (el schema ya está) |
| **CAM-08/09** | Handoff visible; `reloadDestinations()` en `openCamera` |
| **PERF-03/05** | Acotar caches; refresh sin vaciar |
| **PERF-08** | `cancel()` desde intake |
| **LOAD-01** | Estados excluyentes en el Viewer y en la página de imagen |
| **CAP-03** | Policies de RLS (hoy default deny) |
| **TEST-01** | 13 suites huérfanas |

## 9. Stale Implementations

`STALE` = CURRENT implementa una verdad de producto antigua ya superada.

| ID | Verdad antigua | Verdad final | Evidencia |
| --- | --- | --- | --- |
| **ALB-01** | HC2-C §3 y §8: `Álbumes … + Nuevo` en el header, "independiente del scroll del riel" | Sin `+ Nuevo` en el header; creación en el **tile final** del riel | `AlbumsRail.tsx:151-169`; decisión §8.3 del prompt |
| **ALB-03** | HC2-C §4: estado vacío con **su propia** acción de creación, además del header | Solo el tile final, incluso con 0 álbumes | `AlbumsRail.tsx:93-109` |
| **ALB-06** | HC2-C §12: la eliminación de membresía se hace desde selección **dentro del Album** | Igual, pero hoy la selección no es visible en Album ⇒ la ruta es inalcanzable en la práctica | `AlbumDetailView.tsx:182` |
| **SEL-03** | HC2-C §10: "el contexto de álbum **se preserva**" | Correcto como intención, **pero no implementado**: el gate lo desmonta | `SCREEN:1442` vs `:921-924` |
| **TEST-COUNTER** | `homecloud_hc2c_memories_root_tests.ts:264-265` **afirma positivamente** el `+ Nuevo` del header | El header no debe tenerlo | test contradictorio |

**Decisiones previas clasificadas:**

| Decisión | Estado |
| --- | --- |
| Root = un scroll, Álbumes → Tipos → Timeline, sin `Recuerdos\|Colecciones` | **KEEP** — implementado |
| Selección sin `source`, acciones visibles sin `✓` | **KEEP** — implementado |
| D4 drag contiguo intacto | **KEEP** — implementado |
| Apertura exacta con opening lock, sin fallback a índice 0 | **KEEP** — implementado |
| Fuente del Viewer inmutable; cierre al contexto correcto | **KEEP** — implementado, salvo VIEW-07 |
| Original de imagen sólo para la página activa (§24.1) | **SUPERSEDED por sí misma** — §26.2 puso el original solo en la página activa, pero Run B/C7 **nunca se ejecutó** |
| Acotar caches de signed URL y deduplicar en vuelo (§24.2-3) | **PARTIALLY_SUPERSEDED** — el limpiado por household **sí** se cableó; el acotado y la deduplicación, no |
| `+ Nuevo` en el header de Albums (§8) | **SUPERSEDED** por §8.3 del prompt |
| Retirar el botón de refresh, mantener pull-to-refresh (§9) | **KEEP** — implementado, verificación física pendiente |
| Copy de `Quitar del álbum` y prohibición de vocabulario (§12) | **KEEP** — ejemplar |
| `Mover a papelera` "reservada en la arquitectura, no implementada" (§11) | **SUPERSEDED** — ahora es **IN** obligatoria |
| Fullscreen de video (§17) | **KEEP como pendiente** — Run B nunca llegó |
| Seek ±10 y velocidad de audio (§18) | **KEEP como pendiente** — Run B nunca llegó |
| Onda (waveform) = DEFER "no hay datos; no se fabrican" (§18) | **PARTIALLY_SUPERSEDED** — "no se fabrican" **sigue vigente**; "no hay datos" es **incorrecto**: `expo-audio` expone muestreo público. Reemplazado por §16.3 |
| `Backend: NO` en todo el freeze | **SUPERSEDED** para Memories V1 — lifecycle y edición de metadata exigen backend |
| Favoritos, búsqueda, resurfacing, papelera, ocultos "fuera de alcance de HC2" (§2) | **SUPERSEDED** — búsqueda sigue OUT; favoritos pasan a DEFER; **resurfacing, papelera y lifecycle son IN** |
| Doble toque para zoom (§16) = DEFER | **KEEP** — confirmado |

## 10. Existing Unused Capabilities

Infraestructura que existe y que V1 **no expone deliberadamente**. No borrar.

| Capacidad | Dónde existe | Por qué no se expone | Observación |
| --- | --- | --- | --- |
| **Search en Memories** | Backend `GET /memories?query=` → `ILIKE` sobre `caption`/`written_text`/`display_name` con normalizador (`homecloudReadService.js:695-699,610-613`); cliente `memoriesQueryString` incluye `query` (`homecloudReadService.ts:459`) | **OUT de V1** (decisión explícita) | Los 4 call-sites nunca lo pasan; sin índice ⇒ seq scan. **Files sí tiene search en uso**, es una capacidad distinta |
| Índice de búsqueda en DB | **No existe** (sin tsvector/GIN/trigram) | No es capacidad | Verificar antes de cualquier búsqueda futura |
| `homecloud.delete` | Declarada, en matriz por rol (JS + SQL), proyectada al cliente; **0 rutas la exigen** | Se expone con **Lifecycle** | **P0 seguridad** — ver LIFE-04 |
| `lifecycle='trashed'` + `trashed_at` + `trashed_by_member_id` + CHECK de consistencia | Schema completo; **nunca escrito** | Se expone con **Lifecycle** | `trashed` **no requiere migración** |
| Signed URL 404 para `lifecycle != 'active'` | `homecloudStorageAccess.js:106-108` | Ya activo | El mecanismo de seguridad de la papelera **ya funciona** |
| `hidden_from_resurfacing` | Schema + validación backend + proyección; cliente lo escribe hardcodeado `false`; sin UI | Se expone con **Resurfacing** | Ya está persistido y validado |
| `homecloud_albums.lifecycle='trashed'` + `trashed_at` | Schema | **Sin uso por decisión**: no hay Album Trash | `deleteAlbum` hace hard delete |
| `expo-audio` muestreo (`useAudioSampleListener`, `isAudioSamplingSupported`) | API pública en `expo-audio@57.0.5` | Candidato V1.1 condicionado a device QA | `REAL_WAVEFORM_EXPENSIVE` |
| `react-native-safe-area-context` | 5.7.0 instalada; usada en camara y scanner | **Usada en el Viewer al corregir VIEW-01** | Cero dependencia nueva |
| `expo-sharing` + `homecloudDownloadService` | Costura completa y probada en Files; **nunca invocada desde Memories**; fuga de temporal | Se expone con **OS SHARE** | Corregir `Paths.document` → `Paths.cache` + borrado |
| `Clipboard.setString` (RN core) | Instalado, en deprecación | Se expone con **Copiar** | `expo-clipboard` **no** instalado; aislar la llamada |
| `react-native-calendars` | 1.1314.0 instalada; usada solo por el formulario escrito | Se expone con **fecha editable en intake** | El componente ya existe |
| `homecloudMemoryAlbumRemoval.removeMemoryFromOpenAlbum` | Implementado; **0 llamadores** | Se expone con la acción del Viewer | Muerto hasta que exista VIEW-08 |
| `canShowDestinationSelector`/`getInitialAlbum`/`hasAlbumContext`/`selectDestination` | Exportados; el JSX no los usa | Unificar con INTAKE-09 | Doble modelo |
| `homecloudMemoryIntakeService.cancel()` | Implementado y exportado; **nunca invocado** | Conectar a PERF-08 | `status:'cancelled'` inalcanzable |
| `permissionDenied`/`canAskAgain` | Declarados en el tipo; ningún picker los emite | Conectar a CRT-06 | Rama muerta |
| `durationMillis` en todo el draft | Capturado; nunca persistido | Decidir: eliminar o persistir | INTAKE-10 |
| Consola de diagnóstico del origin de la signed URL | `homecloudIntakeService.js:402-412`, preexistente y sin commitear | Instrumentación temporal de QA | **No tocar.** No aplica a P1 |

## 11. Test Coverage Gaps

Clasificación porPrompt §53: `KEEP` · `RETARGET_LATER` · `DELETE_LATER` · `ADD_COVERAGE`.

### 11.1 Tests que codifican una verdad SUPERADA

| Test | Qué codifica | Acción |
| --- | --- | --- |
| `homecloud_hc2c_memories_root_tests.ts:264-265` | Afirma **positivamente** `/\+ Nuevo/` + `accessibilityLabel="Nuevo álbum"` en el header | **`RETARGET_LATER`** — debe exigir el **tile final** y la **ausencia** del header action |
| `homecloud_hc2b_media_viewer_tests.ts:211` | Afirma la **ausencia** de poster/transcod en `MemoryVideoPage` | **`RETARGET_LATER`** — el poster pasa a ser IN |
| `homecloud_hc2b_media_viewer_tests.ts:260` | Afirma la **ausencia** de `waveform|sampleListener` en `MemoryAudioPage` | **`RETARGET_LATER`** — el veredicto pasa de "no hay datos" a "candidato V1.1" |
| `homecloud_hc2b_media_viewer_tests.ts:177` | Afirma que la página de video **nunca** llama `play()` | **`KEEP`** — invariante correcta |
| `homecloud_hc2b_media_viewer_tests.ts:264` | Afirma que la página de audio **no** llama `setAudioModeAsync` | **`KEEP`** — decisión correcta |
| `homecloud_hc2b_media_viewer_tests.ts:64` | Afirma la **ausencia** de `memories` en la sesión del Viewer | **`KEEP`** — invariante correcta |
| `homecloud_hc2a_memories_viewer_tests.ts` | Hace **grep** de `pagingEnabled` + `getMemoryOriginalUrl` + `written` | **`DELETE_LATER` / sustituir** — el propio freeze HC2-C §36 dice que "no se congelan pruebas cuyo único valor sea buscar una cadena" |
| `homecloud_moa3_memory_selection_tests.ts:1163` | Exige que la selección **no** incluya `hidden_from_resurfacing` | **`KEEP`** — correcto |

### 11.2 Suites HUÉRFANAS (13 de 53)

`homecloud_1d_backend_enforcement_tests` · `homecloud_1d_capability_resolution_contract_tests` ·
`homecloud_1d_frontend_projection_tests` · `homecloud_1d_new_household_capability_regression_tests` ·
`homecloud_1d_rls_bypass_tests` · `homecloud_1e_path_adapter_tests` ·
`homecloud_1e_preview_optional_tests` · `homecloud_1e_signing_security_tests` ·
`homecloud_1e_storage_rls_tests` · `homecloud_1f_mixed_media_tests` ·
`homecloud_1f_security_tests` · `homecloud_3a_3d_acceptance_tests` ·
`homecloud_stage_a_memory_creation_tests`.

**Los 5 `1d_*` son los únicos que probarían el enforcement de capacidades** (incluyendo
`rls_bypass` y la regresión de hogar nuevo) ⇒ **la capability enforcement no tiene gate en CI**.
Acción: `ADD_COVERAGE` (enganchar).

Acción adicional: `tests/run.js:410-419` invoca `node` sobre archivos **`.ts`** sin compilar, a
diferencia de todos los demás grupos TS.

### 11.3 Comportamientos con cobertura ADICIENTE (`ADD_COVERAGE`)

| Comportamiento | Por qué el test actual no alcanza |
| --- | --- |
| **El dataset de selección sigue siendo el del Album** | Ningún test lo afirma; el comentario del código afirma lo contrario (SEL-03, P4) |
| **La estructura de pantalla no cambia al seleccionar en un Tipo** | No cubierto (TYP-03) |
| **Zoom de imagen** | `hc2b` solo verifica `active={...}`; `hc2a` hace grep. **Ningún test de comportamiento** (IMG-04, P3) |
| **Poster de video antes de `readyToPlay`** | El test actual afirma que **no** existe (VID-02, P1) |
| **La navbar global no tapa el Viewer** | No cubierto; requiere assertions de layout (VIEW-01, P2) |
| **`ImagePage` pide preview mientras está inactiva** | `hc2b` verifica el invariante **solo** para video/audio (IMG-02) |
| **Crear álbum desde selección** | No cubierto porque no existe (ALB-12) |
| **Lifecycle: trashed invisible en Timeline/Tipo/Album/Resurfacing** | No cubierto porque no existe (LIFE-01) |
| **Purge: filas y bytes juntos, o falla** | No cubierto porque no existe (TRASH-05) |
| **Restore conserva membresías; no restaura en relación inexistente** | No cubierto (TRASH-03) |
| **Resurfacing: solo `exact` y anterior a hoy** | No cubierto (RESURF-03) |
| **Date correction precedence: usuario > automático > `Sin fecha`** | No cubierto (DATE-04) |
| **Batch: fechas distintas no se sobrescriben** | No cubierto porque no existe (INTAKE-04) |
| **Back de Android cierra el Viewer** | No cubierto (VIEW-07) |
| **Texto fuera de `<Text>` (P8)** | El barrido estático da 0; el warning es de librería ⇒ **requiere device trace, no un test** |

## 12. Device-Only Gaps

Lo que **no** puede cerrarse por inspección de fuente.

| # | Gap | Por qué | Bloquea |
| --- | --- | --- | --- |
| 1 | **Zoom de imagen** (P3) | El feel del gesto no es demostrable por fuente | IMAGE-04 |
| 2 | **Causa raíz real del video lento** (P1) | El coste de red no está medido | VIDEO-02 |
| 3 | **Causa del warning de `<Text>`** (P8) | Requiere el **stack completo** del warning en el dispositivo | P8 |
| 4 | Pull-to-refresh tras quitar el botón | El brazo nativo del gesto | ROOT-04 |
| 5 | Long press y drag D4 en el dedo | Feel del gesto | SEL-05 |
| 6 | Feel del scrub nativo de video y su coexistencia con el pager | Chrome nativo dentro de un pager | VIDEO-03 |
| 7 | Fullscreen dentro de un `FlatList` paginado | Puede romper la paginación | VIDEO-04 |
| 8 | `Clipboard.setString` en iOS | No muestra confirmación | WRIT-04 |
| 9 | Share sheet de iOS y su descarte honesto | Comportamiento de plataforma | WRIT-06 |
| 10 | Tono audible de la velocidad de audio | Percepción | AUD-04 |
| 11 | Precisión del seek ±10 s | Percepción | AUD-03 |
| 12 | Parada audible inmediata al deslizar | Percepción | VIEW-10 |
| 13 | **`useAudioSampleListener` en iPhone** | Platform-gated por el propio paquete | AUD-06 |
| 14 | Qué campos EXIF entrega el SDK por versión de iOS | No garantizable | DATE-01, DATE-06 |
| 15 | Primer ingreso con 0/1/N álbumes, red lenta y sin red | Combinación de estados | ROOT-01 |
| 16 | `useAudioSampleListener` con `RECORD_AUDIO` en Android | Platform-gated | AUD-06 |

## 13. Backend / Schema Gaps

| # | Gap | Evidencia | Impacto |
| --- | --- | --- | --- |
| B1 | **Sin endpoints de trash/restore/purge** | 24 rutas, 13 hits de `trash\|purge` todos en comentarios | **P0**: lifecycle es IN |
| B2 | **`homecloud.delete` nunca exigida** | 0 resultados en `backend/src` | **P0 seguridad** |
| B3 | `lifecycle='trashed'` nunca escrito | solo `'staging'` y `'active'` | Las columnas de papelera son huérfanas |
| B4 | **Sin endpoint PATCH de memory** | la única ruta PATCH de contenido es de Files | **P1**: edición de fecha/descripción imposible |
| B5 | Filas `staging` sin barrer | sin cron, sin Edge Function, `grep 'orphan'` ⇒ 0 | Fuga silenciosa e invisible |
| B6 | `/verify` fallido deja staging sin reintento backend | 409 y nada más | El cliente es el único que reintenta |
| B7 | Sin `duration_ms` | barrido de los 9 archivos ⇒ `ABSENT` | La duración no se persiste (decisión: derivarla en reproducción) |
| B8 | Sin columna `favorite` | `ABSENT` | Favoritos = DEFER, consistente |
| B9 | `homecloud_albums.trashed_at` sin uso | `deleteAlbum` hace hard delete | Consistente con "no hay Album Trash" |
| B10 | `/access` expone `bucket` y `path` | contradice los comentarios del propio servicio | Bajo, pero es una mentira en el código |
| B11 | `albumIds` de `listMemories` no filtra por household ni lifecycle del álbum | el 2º query usa `.in('content_id', ...)` sin filtros | Puede projectar ids de álbum de otro hogar |
| B12 | RLS enabled con 0 policies y 0 GRANT | migración HC-1D nunca materializada | Default deny (seguro) pero sin defensa en profundidad |
| B13 | Sin índice de búsqueda | sin tsvector/GIN/trigram | Búsqueda futura sería seq scan |
| B14 | Sin `deleted_at`/`purged_at` | `ABSENT` | Correcto: `purged` es borrado físico, no un estado |

## 14. Frontend / UX Gaps

| # | Gap | Evidencia |
| --- | --- | --- |
| F1 | Viewer no inmersivo; navbar global lo tapa; sin safe-area | VIEW-01, P2 |
| F2 | La selección cambia de contexto en Album | SEL-03, P4 |
| F3 | Sin menú de acciones en el Viewer | VIEW-08 |
| F4 | Solo 3 acciones de selección | ACT-02, P6 |
| F5 | `+ Nuevo` en el header en vez de tile final | ALB-01, P5 |
| F6 | Sin confirmación al eliminar álbum | ALB-08 |
| F7 | Fecha read-only en intake binario | DATE-03, P7 |
| F8 | Sin superficie de información/edición | INFO-01, INFO-03 |
| F9 | Sin batch intake | INTAKE-04, INTAKE-05 |
| F10 | Sin superficie de resurfacing | RESURF-01 |
| F11 | Sin superficie de papelera | TRASH-01 |
| F12 | Back de Android no cierra el Viewer | VIEW-07 |
| F13 | Cambio de pestaña global reabre el Viewer | ROOT-07 |
| F14 | Audio sin identidad visual real | AUD-01 |
| F15 | Fecha del escrito pre-rellena "hoy 00:00" sin avisar | WRIT-03 |
| F16 | El scroll vertical del escrito alterna el chrome | WRIT-07 |
| F17 | `Abrir configuración` inalcanzable | CRT-06 |
| F18 | `openCamera` no recarga destinos | CAM-09 |
| F19 | `cancel()` de intake inalcanzable | PERF-08 |
| F20 | Hasta 7 originales por apertura | IMG-02 |
| F21 | Spinner perpetuo en la página de imagen | IMG-06 |
| F22 | Acciones de cámara: solo 4 de 6 | ACT-01 |
| F23 | Handoff de audio invisible | CAM-08 |
| F24 | El Viewer solo puede abrirse desde 3 de 5 datasets | TYP-04, RESURF-06 |

## 15. Media / Performance Gaps

| # | Gap | Evidencia | Impacto |
| --- | --- | --- | --- |
| M1 | Sin poster de video | `MemoryVideoPage.tsx:7` | **P0** — perceptibilidad (P1) |
| M2 | Hasta 7 originales firmados concurrentes | `ImagePage` sin `active` | HIGH — red y memoria |
| M3 | Sin deduplicación de requests en vuelo | ambos servicios de media | MED |
| M4 | Caches de signed URL de crecimiento no acotado | un entry por `contentId` de la sesión | MED |
| M5 | `loadFirstPage()` vacía contenido en cada refocus | `SCREEN:275-312,377-384` | MED — re-render completo |
| M6 | `getMemoryOriginalUrl` sin timeout ni `signal` | a diferencia del preview | MED — estado colgado |
| M7 | Sin estados terminales de timeout en media | `MemoryViewer`/`MemoryVideoPage` | MED |
| M8 | Refresco del dataset del Viewer en cada página recargada | mitigado por `reuseMemoryViewerDataset` | LOW |
| M9 | `Missing` irrecuperable por `requestedIndex` congelado | `homecloudMemoryViewerOpening.ts:157` | MED |
| M10 | Fuga de temporales en OS share | `Paths.document` sin borrar | MED — crecimiento no acotado |
| M11 | Audio: 4 Hz de estado en la página | correcto y aislado | LOW |
| M12 | Waveform no disponible sin reproducción | `useAudioSampleListener` | LOW — ver AUD-06 |

## 16. Camera Gaps

| # | Gap | Estado |
| --- | --- | --- |
| C1 | Pipeline compartido con import | **IMPLEMENTED** — no abrir |
| C2 | 3 estados de permiso | **IMPLEMENTED** |
| C3 | Captura, retake, review, probe de bytes | **IMPLEMENTED** |
| C4 | Fecha = instante real de captura | **IMPLEMENTED** |
| C5 | Álbum y descripción opcionales en el review | **IMPLEMENTED** |
| C6 | AppState durante grabación | **IMPLEMENTED** |
| C7 | Fallos honestos con retry | **IMPLEMENTED** |
| C8 | Handoff invisible (`audio-handoff` sin JSX) | `PARTIAL` |
| C9 | `openCamera` no recarga destinos | `PARTIAL` |
| C10 | `exif:true` solicitado y nunca leído | `PARTIAL` |
| C11 | No se puede crear álbum desde el review de cámara | correcto por producto |
| C12 | No hay Actions en el review | correcto: van en el Viewer |

**Conclusión de Camera: la superficie de Camera está en mejor estado que la de Memories
consumida.** Lo único que falta es parámetro de encaje con el resto del producto.

## 17. Lifecycle Gaps

Ver §13 (B1-B3, B5-B6) y LIFE-01 a LIFE-05.

**El dato más importante de esta auditoría en materia de lifecycle:**

> El schema **ya soporta `trashed`** y su CHECK de consistencia ya está. El mecanismo de
> seguridad de la papelera **ya funciona** (404 en signed URL para `lifecycle != 'active'`).
> Y la capacidad `homecloud.delete` **ya existe** en la matriz por rol.

**El trabajo de backend de Lifecycle es pequeño y está bien delimitado.** El hueco no es
de diseño de dominio: es de endpoints, escrituras y UI.

**Y el riesgo de seguridad es real y silencioso:** hoy `delete: true` llega al cliente sin
nada que gatear. Si se implementa el purge **sin** exigir `homecloud.delete`, se convierte un
hole hoy latente en un hole explotable.

## 18. Resurfacing Gaps

Ver RESURF-01 a RESURF-07.

**Lo que ya está listo sin decirlo:**

1. `hidden_from_resurfacing` está **persistido, validado en backend y proyectado**.
2. El read model ya tiene **orden total determinista** por `captured_year/month/at`, que es
   exactamente lo que un resurfacing determinista necesita.
3. `listMemories` ya soporta filtro `year` y `kind` en SQL.
4. El viewer ya tiene fuente inmutable y apertura exacta ⇒ un 4º `sourceId` es aditivo.

**Lo que falta es transformational:** la banda, el algoritmo de agrupación, una 4ª viewer
factory, el dataset del grupo, y el copy de `No mostrar este recuerdo acá`.

**Y una consecuencia que hay que aceptar explícitamente:** los videos de galería y el audio
importado resuelven **siempre** `unknown`, y `unknown` **no participa** en resurfacing por
fecha exacta. Por lo tanto **no aparecerán nunca** en `Para volver a ver` hasta que el usuario
corrija la fecha (DATE-03/DATE-04). Eso es correcto y honesto, y es el argumento más fuerte a
favor de implementar la corrección de fecha.

## 19. Dependency / Expo Capability Findings

| Hallazgo | Evidencia | Consecuencia de producto |
| --- | --- | --- |
| `react-native-safe-area-context@5.7.0` **instalada**, sin usar en Memories | `package.json:52`; usada solo en `MemoryCameraSurface.tsx:6` y `HomeCloudScannerScreen.tsx:14` | **VIEW-01 se corrige sin dependencia nueva** |
| **`expo-audio` expone muestreo público** | `ExpoAudio.ts:238,240`; `src/index.ts:4` | El veredicto de waveform cambia de "no hay datos" a "candidato V1.1". La prohibición de fake waveform no cambia |
| El muestreo es **solo de reproducción** y platform-gated | el paquete advierte `RECORD_AUDIO` en Android y "no soportado en todas las plataformas" | `REAL_WAVEFORM_EXPENSIVE` + `DEVICE_VERIFY_REQUIRED` |
| `react-native-calendars@1.1314.0` instalada | `package.json:48` | La fecha editable en intake **no** necesita `DatePicker` nuevo |
| `expo-sharing@57.0.22` + `expo-file-system@57.0.7` instaladas | `package.json:39,31` | OS SHARE **no** necesita dependencia nueva |
| `Clipboard.setString` de RN core disponible, **en deprecación** | `react-native/index.js:217-222` | Aislar la llamada; `expo-clipboard` **no** se agrega |
| `Share.share` de RN core con precedente | `screens/InvitarPersonas.tsx:110` | Compartir texto sin dependencia nueva |
| **`react-native-gesture-handler` NO instalado** | ausente de `package.json` y de `node_modules` | **Doble toque = DEFER confirmado**, sin dependencia nueva |
| **`react-native-reanimated` NO instalado** | ídem | El zoom se calcula en JS ⇒.device QA obligatoria |
| **`expo-media-library` NO instalado** | ídem | Sin `asset.assetId` ⇒ la fecha de audio importado no es derivable (coherente con DATE-05) |
| `expo-video` `VideoView` no expone zoom | `contentFit` es lo único | Zoom de video = OUT de V1 |
| `expo-video` `fullscreenOptions.enable` default `true` | `VideoView` props | Fullscreen = **una prop** |
| **Sin `ARCHITECTURAL_ESCALATION`Justified por esta auditoría** | — | Ninguna capacidad IN de Memories V1 requiere salir de Expo Go |

## 20. Product Risks

Ordenados por severidad de producto, **no** por dificultad de implementación.

| # | Riesgo | Evidencia | Impacto | Mitigación |
| --- | --- | --- | --- | --- |
| R1 | **El contenido del hogar se puede eliminar de forma definitiva sin gate** | `homecloud.delete` proyectada y nunca exigida | **P0** | Lifecycle debe exigir `delete` en purge y en vaciar papelera, **desde el primer commit** |
| R2 | **Un recuerdo queda irrecuperablemente sin fecha** | fecha read-only en intake + sin endpoint de corrección | **P0 datos** | DATE-03 + DATE-04 |
| R3 | **El usuario no puede volver a un lugar**: el Viewer lo devuelve a otra superficie | SEL-03 | **P0 navegación** | Un cambio en dos gates |
| R4 | **La pantalla de consumo está ocupada por el chrome global** | VIEW-01 | **P0** | Inmersividad + safe-area, sin dependencia nueva |
| R5 | **Un video largo parece no funcionar** | sin poster | **P0 percepción** | VID-02 |
| R6 | **Fugas silenciosas de filas `staging`** | B5 | MED | Sweep backend |
| R7 | **Fuga de temporales en el dispositivo al compartir vídeos grandes** | `Paths.document` sin borrar | MED | `Paths.cache` + borrado |
| R8 | **Hasta 7 originales firmados por apertura** | IMG-02 | MED | Gate por `active` + dedup |
| R9 | **13 suites huérfanas, incluidos los 5 de enforcement de capacidades** | TEST-01 | MED | Enganchar al gate |
| R10 | **Un fallo de seguridad visible en un repo de tan buen estado puede ser peor que la ausencia del feature** | `viewer` + `/access` exponen `bucket` y `path` | MED | Alinear código y comentarios |
| R11 | **`requestedIndex` congelado deja el Viewer sin players para siempre** | VIEW-07 | MED | Cerrar el Viewer en back |
| R12 | **La capability enforcement no tiene gate en CI** | 13 huérfanos | MED | Enganchar |
| R13 | **Riesgo de plataforma al volver el Viewer un `Modal`**: dos modales de RN en iOS | ACT-08 es hoy estructural solo porque el Viewer no es Modal | MED | Verificar N-05 (un solo host) al corregir VIEW-01 |
| R14 | **RLS sin policies**: default deny hoy, sin defensa en profundidad mañana | B12 | LOW | Documentar; no agregar GRANT |
| R15 | **`albumIds` puede projectar ids de otro hogar** | B11 | LOW | Filtrar por household en el 2º query |
| R16 | **Fallo en CI por gates preexistentes ajenos** | TEST-02 | LOW | Ejecutar los comandos de Memories individualmente |
| R17 | **Ambigüedad de producto no resuelta** | ninguna | LOW | Las 3 decisiones abiertas están listadas en el veredicto |

## 21. FINAL READINESS VERDICT

### 21.1 Conteo por status

| Status | Filas |
| --- | --- |
| `IMPLEMENTED` | 69 |
| `PARTIAL` | 32 |
| `MISSING` | 29 |
| `DEFERRED` | 15 |
| `BROKEN` | 15 |
| `EXISTING_UNUSED_CAPABILITY` | 7 |
| `STALE` | 3 |
| **TOTAL** | **170** |

Conteo **verificado por extracción**, no estimado: 170 filas de encabezado en §5, 170 IDs únicos
(sin duplicados). `PERF-01` es compuesto (`BROKEN` para imagen, `IMPLEMENTED` para video/audio) y
se cuenta una sola vez por el peor caso. Las secciones §6-§9 son **vistas de corte** sobre el
mismo registro y agrupan filas que comparten causa, así que sus conteos de filas pueden diferir
de los de §5; §6 y §7 se verificaron contra §5 y coinciden exactamente.

### 21.2 Veredicto

```
MEMORIES_FINAL_PRODUCT_RECONSTRUCTION_COMPLETE
```

Lo que esto **significa**:

- El producto final esta **definido** en 31 secciones con decisiones, no hallazgos.
- Los **147 paths** tienen los 13 campos obligatorios, con éxito, cancelación, error y retorno.
- Los **170 gaps** de §5 tienen ID estable, status de §11, evidencia y capa.
- Las **9 observaciones fisicas** tienen causa raiz clasificada por confianza.
- Las **13 contradicciones** del prompt §62 estan resueltas explicitamente.
- Los **4 caminos de retorno** de las superficies secundarias estan congelados como contrato.

Lo que esto **NO** significa:

- **NO** significa `MEMORIES_IMPLEMENTATION_COMPLETE`.
- **NO** significa que los gaps de esta tabla estén resueltos.
- **NO** cierra los 16 unknowns de §12, que requieren dispositivo.

### 21.3 Readiness para el plan de implementación

**El producto está listo para planearse.** Las tres decisiones de producto que quedaban
abiertas en la sección 22 del prompt fueron tomadas con evidencia:

| Decisión abierta | Resultado | Base |
| --- | --- | --- |
| Favoritos | **`DEFER`** | Donor: personal en 3 de 4. Semántica incompatible con "historia compartida"; compartido duplica Albums; personal requiere modelo de datos por miembro que no existe |
| Waveform | **`FAKE OUT` / `REAL = CANDIDATE`, veredicto `REAL_WAVEFORM_EXPENSIVE`** | `expo-audio` expone muestreo público, pero solo de reproducción y platform-gated; ningún donor lo muestra; V1 recibe diseño honesto no-waveform no vacío |
| Precisión del resurfacing | **Solo `exact` y anterior a hoy** | La regla de no inventar día/mes ya está en el schema (`capture_semantics_check`); extenderla a resurfacing es coherente y evita la mentira de "un día de 2024" |

### 21.4 Dependencias de contrato (grafo alto nivel, no secuencia)

Solo para explicar por qué un contrato depende de otro. **No es un plan.**

```
VIEW-08 (menú del Viewer)
   └─ desbloquea: ALB-13, INFO-01, WRIT-04/05/06, RESURF-06, LIFE-01(acciones)

LIFE-01 (endpoints + escritura de 'trashed')
   ├─ exige LIFE-04 (gate homecloud.delete)  ← P0 seguridad
   └─ desbloquea: TRASH-01/03/04/05, LIFE-01(UI)

INFO-03 (PATCH de memory)
   └─ desbloquea: DATE-04 (corrección posterior)
                     └─ desbloquea RESURF-03 (videos/audio con fecha corregida)

DATE-03 (fecha editable en intake)
   └─ no depende de nada: el componente YA EXISTE, está desconectado

SEL-03 (gates de overlay)
   └─ no depende de nada: un cambio en dos condiciones

VIEW-01 (inmersividad + safe-area)
   ├─ no requiere dependencia nueva (safe-area-context instalada)
   └─ introduce R13 (riesgo de dos modales) → exige revisar CRT-03/ACT-08

RESURF-01 (banda)
   └─ depende de INFO-03/DATE-04 para que los videos/audio tengan fecha elegible
```

### 21.5 Ambigüedades de producto que quedan abiertas

**Ninguna bloquea el plan.** Las tres están resueltas arriba. Lo que queda es
**device-only**, y por lo tanto pertenece al QA del plan, no a su definición:

1. Si `useAudioSampleListener` es estable en el iPhone objetivo (V1.1 de audio).
2. Qué campos EXIF entrega el SDK en cada versión de iOS (afecta DATE-01/DATE-06, no la decisión).
3. La causa raíz real del video lento más allá de la ausencia de poster (ya resuelta de producto).