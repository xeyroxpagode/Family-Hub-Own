# HOMECLOUD MEMORIES — FINAL PATH MATRIX

```
STATUS:  HOMECLOUD_MEMORIES_FINAL_PATH_MATRIX
FORMA:   UN bloque por path. Cada path declara los 13 campos obligatorios.
AUTORIDAD DE PRODUCTO: HOMECLOUD_MEMORIES_FINAL_PRODUCT_TRUTH.md
AUTORIDAD DE CURRENT:  HOMECLOUD_MEMORIES_FINAL_CURRENT_GAP.md
```

Leyenda de `CURRENT STATUS`: `IMPLEMENTED` · `PARTIAL` · `BROKEN` · `MISSING` · `STALE` ·
`DEFERRED` · `EXISTING_UNUSED_CAPABILITY`.

Convencion de retorno (§27 de Product Truth): los llamadores canonicos son
`root` · `album:<id>` · `type:<kind>` · `resurfacing:<group>` · `trash` · `intake` · `camera`.
**Root nunca es un fallback de conveniencia.**

**Total de paths: 155.** Reconciliado tras el patch de audio de 2026-10-05 (antes 147).
IDs existentes **preservados, sin renumerar**. Paths nuevos: `B-07`, `B-08`, `B-09`, `B-10`,
`K-01b`, `D-05b`, `Q-08`, `Q-09`. Paths reconciliados: `B-01`, `C-05`, `D-04`, `D-05`,
`D-06`, `D-07`, `K-01`, `Q-07`.

---

## A. Root

### PATH A-01 — Primer ingreso a Memories
- **START CONTEXT**: `root` (primer ingreso)
- **PRECONDITIONS**: token + householdId; capabilities resueltas; sin caches de signed URL
- **USER ACTION**: abrir HomeCloud → pestana `Recuerdos`
- **NEXT SURFACE**: MemoriesRoot
- **STATE CHANGE**: ninguna (solo lectura)
- **SUCCESS**: `INITIAL_LOADING` → `READY_DATA` si hay Memories, `READY_EMPTY` si no
- **CANCEL**: n/a
- **ERROR**: `ErrorState` + `Reintentar`. Nunca un vacio disfrazado de "no hay recuerdos"
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si (0, 1, N albums; red lenta; sin red)
- **CURRENT STATUS**: `PARTIAL` — rail de albums con estado `LOADING` propio ya separado del `loading` de Timeline, pero el reset por household vuelve a dispararlo;HC2-C B1 fue corregido pero P2/P5 siguen abiertos

### PATH A-02 — Root con datos
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay Memories en el hogar
- **USER ACTION**:—
- **NEXT SURFACE**: MemoriesRoot con `Álbumes` + `Tipos` + `Timeline`
- **STATE CHANGE**: ninguna
- **SUCCESS**: los tres bloques visibles simultaneously; orden `Álbumes` → `Tipos` → `Timeline`
- **CANCEL**: n/a
- **ERROR**: error parcial del rail de albums no oculta la Timeline
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — un solo scroll, orden correcto, sin `Recuerdos|Colecciones`

### PATH A-03 — Root vacio (hogar sin Memories)
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `listMemories` devuelve 0 filas
- **USER ACTION**: —
- **NEXT SURFACE**: MemoriesRoot
- **STATE CHANGE**: ninguna
- **SUCCESS**: copy honesto `Aún no hay recuerdos` + el `+` de create disponible + `Tipos` visible
- **CANCEL**: n/a
- **ERROR**: distingue `READY_EMPTY` de `ERROR`
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` con hueco de copy — el vacio no ofrece el `+` de forma explicita; el usuario debe descubrirlo

### PATH A-04 — Refrescar la Timeline (pull-to-refresh)
- **START CONTEXT**: `root` (o cualquier superficie con lista)
- **PRECONDITIONS**: no hay sesion de seleccion activa
- **USER ACTION**: pull-to-refresh
- **NEXT SURFACE**: la misma superficie
- **STATE CHANGE**: relee pagina 0 del conjunto activo
- **SUCCESS**: el contenido previo **permanece visible** durante el refresh; sin skeleton
- **CANCEL**: soltar el gesto cancela el refresh, contenido intacto
- **ERROR**: si la lectura falla, se conserva el contenido previo + `Reintentar`
- **RETURN CONTEXT**: la misma superficie, mismo offset
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio (el brazo nativo del gesto no es demostrable por fuente)
- **CURRENT STATUS**: `PARTIAL` — `RefreshControl` esta montado con gate correcto y el boton de refresh fue removido, pero el gate real no esta probado en dispositivo

### PATH A-05 — Cambiar de household
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: hay >= 2 hogares
- **USER ACTION**: cambiar de household
- **NEXT SURFACE**: `root` del hogar nuevo
- **STATE CHANGE**: se descartan Memories, rail, album abierto, coleccion abierta, seleccion, viewer, offsets de scroll y caches de signed URL
- **SUCCESS**: el hogar nuevo carga limpio
- **CANCEL**: n/a
- **ERROR**: si la lectura falla, `ErrorState`; **nunca** mostrar datos del hogar anterior
- **RETURN CONTEXT**: `root` del hogar nuevo, offset 0
- **PERMISSION**: `homecloud.view` en el hogar destino
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el reset existe y limpia las caches de signed URL, pero hay dos efectos con dependencia `householdId` y el comentario de "unica autoridad de scope" no coincide con el codigo

### PATH A-06 — Cambiar de `Archivos` a `Recuerdos` y volver
- **START CONTEXT**: HomeCloud
- **PRECONDITIONS**: ambos panes montados simultaneamente
- **USER ACTION**: tap en el SegmentedControl global
- **NEXT SURFACE**: pane de Memories
- **STATE CHANGE**: ninguno (solo `display`)
- **SUCCESS**: Memories se ve; **el Viewer, si estaba abierto, se desmonta y se reabre solo al volver**
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: HomeCloud
- **PERMISSION**: n/a
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — el pane de Files aplica `display:'none'` al pane de Memories, lo que desmonta el Viewer sin cerrar la sesion; al volver, el Viewer reaparece por su cuenta

### PATH A-07 — Volver desde el Viewer
- **START CONTEXT**: cualquiera de los 7 llamadores
- **PRECONDITIONS**: el Viewer esta abierto
- **USER ACTION**: cerrar el Viewer
- **NEXT SURFACE**: el llamador original
- **STATE CHANGE**: el contenido activo se libera
- **SUCCESS**: offset restaurado, dataset intacto
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: **exactamente el llamador**. Nunca `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, 7 casos
- **CURRENT STATUS**: `PARTIAL` — hay un solo mecanismo de cierre (`setViewer(null)`) y 7 session factories, pero el `BackHandler` de Android no contempla el Viewer

### PATH A-08 — Volver desde un Album
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay albums
- **USER ACTION**: cerrar el overlay de album
- **NEXT SURFACE**: `root`
- **STATE CHANGE**: ninguna
- **SUCCESS**: `root` con offset preservado
- **CANCEL**: el boton `X` es el unico mecanismo
- **ERROR**: n/a
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED`

### PATH A-09 — Volver desde un Tipo
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay Memories de ese `kind`
- **USER ACTION**: cerrar el overlay de coleccion
- **NEXT SURFACE**: `root`
- **STATE CHANGE**: la coleccion activa se limpia
- **SUCCESS**: `root` con offset preservado
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — cerrar la coleccion con el Viewer abierto vacia el dataset del Viewer y lo deja en `Missing` permanente

### PATH A-10 — Upload pendiente visible desde la raiz
- **START CONTEXT**: cualquiera de las superficies de HomeCloud
- **PRECONDITIONS**: hay >= 1 job de upload no terminal
- **USER ACTION**: —
- **NEXT SURFACE**: banda de actividad global
- **STATE CHANGE**: ninguna en Memories
- **SUCCESS**: banda con copy honesto del estado real (§ R-04)
- **CANCEL**: via `Cancelar` de la banda
- **ERROR**: via `Reintentar` de la banda
- **RETURN CONTEXT**: n/a (es una banda, no una navegacion)
- **PERMISSION**: ninguno para ver; `homecloud.contribute` para actuar
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — banda global sobre ambos panes, con progreso, retry y cancel

---

## B. Create

### PATH B-01 — Abrir el menu de create
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `capabilities.contribute = true`; no hay sesion de seleccion
- **USER ACTION**: tap en `+`
- **NEXT SURFACE**: bottom sheet `Guardar un recuerdo`
- **STATE CHANGE**: `intake` sheet abierto
- **SUCCESS**: **5 items**, en este orden y sin submenu: `Fotos y videos`, `Capturar momento`, `Importar audio`, `Grabar audio`, `Escribir un recuerdo`. Los items 3 y 4 son **acciones distintas**, no dos ventanas al mismo destino
- **CANCEL**: `Volver` / X / gesto → `root` sin cambios
- **ERROR**: copy de error en la hoja + `Reintentar`
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la gramatica de 4 items con un unico item de audio esta **superada** (§4.1.1 del Product Truth): CURRENT expone 4 items y el de galeria esta rotulado `Elegir foto/video/audio`, y detras de el hay una **segunda** hoja `Elegir contenido` que recien ahi ofrece `Audio`. Es decir, CURRENT cumple "sin submenu" y **viola** "5 acciones planas de primer nivel" e "Importar audio de primer nivel". Dos correcciones distintas: agregar el item 3 y promover `Importar audio` a primer nivel

### PATH B-02 — El `+` con `contribute = false`
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `capabilities.contribute = false`
- **USER ACTION**: —
- **NEXT SURFACE**: `root`
- **STATE CHANGE**: ninguna
- **SUCCESS**: el `+` no se renderiza
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: `root`
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el trigger se monta solo si hay token + household y se deshabilita por capability

### PATH B-03 — Menu de create durante seleccion
- **START CONTEXT**: `root` con seleccion activa
- **PRECONDITIONS**: `selecting = true`
- **USER ACTION**: —
- **NEXT SURFACE**: n/a
- **STATE CHANGE**: ninguna
- **SUCCESS**: el `+` no se renderiza durante la seleccion
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: n/a
- **PERMISSION**: —
- **DEVICE QA**: no
- **CURRENT STATUS**: `IMPLEMENTED` — correcto por producto

### PATH B-04 — Elegir `Fotos y videos` desde el menu
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: tap en el item `Fotos y videos` (item 1)
- **NEXT SURFACE**: picker del sistema de galeria, **directo**: `ImagePicker` con `mediaTypes: ['images','videos']`. **No** hay hoja intermedia, y **no** ofrece audio
- **STATE CHANGE**: `intake` en fase `picking`
- **SUCCESS**: vuelve al review con 1 draft (o N, con batch: ver C-04)
- **CANCEL**: cerrar el picker → vuelve a `root` sin draft
- **ERROR**: copy honesto; si el permiso fue denegado de forma permanente, `Abrir configuración` (hoy inalcanzable: ver C-01)
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — funciona para 1 item y el selector multiple esta deshabilitado; ademas el item no ofrece audio de forma directa, exige una **segunda** hoja `Elegir contenido` (B-09)

### PATH B-05 — Elegir `Capturar momento`
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: tap
- **NEXT SURFACE**: `camera`
- **STATE CHANGE**: `intake` sheet → estado `camera`
- **SUCCESS**: ver S-01
- **CANCEL**: `Volver` → `root`
- **ERROR**: ver S-02
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la camara abre pero **no recarga la lista de albums destino** al abrirse, a diferencia de los otros modos; la lista puede estar desactualizada

### PATH B-06 — Elegir `Escribir un recuerdo`
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: tap
- **NEXT SURFACE**: formulario escrito
- **STATE CHANGE**: `intake` sheet → estado `written`
- **SUCCESS**: ver L-01
- **CANCEL**: `Volver` → `root`
- **ERROR**: copy honesto en la hoja
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED`

### PATH B-07 — Elegir `Importar audio` (accion de primer nivel)
- **START CONTEXT**: `root` → menu create
- **PRECONDITIONS**: `contribute = true`; el item es visible en el menu de primer nivel sin pasar por ninguna hoja intermedia
- **USER ACTION**: tap en `Importar audio` (item 3)
- **NEXT SURFACE**: picker de documentos/audio del sistema
- **STATE CHANGE**: `intake` sheet → estado `picking` con `source = 'audio-import'`
- **SUCCESS**: vuelve al review binario de audio (C-05) con la fecha `Sin fecha` **editable**, album opcional y descripcion opcional
- **CANCEL**: cerrar el picker → vuelve a `root` sin draft, sin artefacto
- **ERROR**: `El archivo seleccionado no es un audio compatible.` en la hoja, `intake` intacto, `root` no cambia
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si, obligatorio (la promoción de un item y la ausencia de la hoja intermedia no son verificables por fuente)
- **CURRENT STATUS**: `BROKEN` — la **capacidad existe y funciona**, pero **no es alcanzable como accion de primer nivel**: CURRENT obliga a `Elegir foto/video/audio` → hoja `Elegir contenido` → item `Audio`. La correccion es de enrutado del menu, no de intake

### PATH B-08 — Elegir `Grabar audio` (accion de primer nivel, item 4)
- **START CONTEXT**: `root` → menu create
- **PRECONDITIONS**: `contribute = true`; permiso de microfono concedido o solicitable
- **USER ACTION**: tap en `Grabar audio` (item 4)
- **NEXT SURFACE**: grabador
- **STATE CHANGE**: `intake` sheet → estado `recorder`, `source = 'audio-recorder'`
- **SUCCESS**: ver D-04: fecha `exact` (instante de inicio de grabacion) y review binario de audio
- **CANCEL**: `Cancelar` → `stopAndDiscard` + restauracion del modo de audio → `root`
- **ERROR**: `empty recording` / validacion de URI y tamano, con copy honesto
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute` + permiso de microfono
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — ya es item de primer nivel con copy `Grabar audio`; el copy y el lugar en el menu son correctos. Lo unico que cambia es la **posicion relativa** respecto de `Importar audio` (item 4 de 5)

### PATH B-09 — Menu de create: `Importar audio` NO es un atajo de `Fotos y videos`
- **START CONTEXT**: `root` → menu create
- **PRECONDITIONS**: —
- **USER ACTION**: inspeccionar el menu de primer nivel
- **NEXT SURFACE**: —
- **STATE CHANGE**: ninguna
- **SUCCESS**: `Fotos y videos` ofrece **solo** imagen y video. No ofrece audio. `Importar audio` es un item propio del menu de primer nivel. No existe `Audio >`. No existe una hoja `Elegir contenido` obligatoria para llegar a audio
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — CURRENT usa un unico item `Elegir foto/video/audio` cuya segunda hoja reparte galeria **y** audio. Mezcla dos intenciones en un item y agrega un nivel de navegacion para una accion que el producto congela como plana

### PATH B-10 — Los dos caminos de audio convergen en un unico review
- **START CONTEXT**: `root` → menu create → `Importar audio` | `Grabar audio`
- **PRECONDITIONS**: hay un draft binario de audio, sea de la fuente que sea
- **USER ACTION**: —
- **NEXT SURFACE**: review binario de audio
- **STATE CHANGE**: ninguna por la distincion de origen
- **SUCCESS**: el review es **el mismo** para audio importado y audio grabado: misma jerarquia de informacion (preview dominante, Fecha editable, Album opcional, Descripcion opcional, `Guardar recuerdo`), mismo `submitBinary`, mismo upload engine, mismo Audio Viewer. La unica diferencia observable es la fecha derivada automaticamente (`unknown` importado / `exact` grabado)
- **CANCEL**: cerrar el review → artefacto temporal borrado → `root`
- **ERROR**: copy honesto del review, sin perder el draft
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la convergencia **ya existe** en CURRENT (`setBinaryDraft` comun, `MemoryMediaReview` con `AudioReview`, `source` como unico campo divergente): el gap es la **promocion del item 3**, no la convergencia

---

## C. Import

### PATH C-01 — Importar una imagen desde la galeria
- **START CONTEXT**: `root` → menu create
- **PRECONDITIONS**: `contribute = true`; permiso de fotos en iOS
- **USER ACTION**: elegir `Fotos y videos` → elegir 1 imagen
- **NEXT SURFACE**: review binario
- **STATE CHANGE**: `binaryDraft` creado con `capture` derivada
- **SUCCESS**: preview visible, fecha derivada y **editable** (§6.3), album opcional, descripcion opcional
- **CANCEL**: cerrar la hoja → artefacto temporal borrado, `root` sin cambios
- **ERROR**: `No pudimos mostrar la vista previa. El original no fue modificado.` + `Reintentar vista previa`
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el preview se genera con `expo-image-manipulator` a 1600px y hay error boundary con retry; **la fecha es read-only**

### PATH C-02 — Importar un video desde la galeria
- **START CONTEXT**: `root` → menu create
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: elegir `Fotos y videos` → elegir 1 video
- **NEXT SURFACE**: review binario
- **STATE CHANGE**: `binaryDraft` con `capture.precision = 'unknown'`
- **SUCCESS**: preview con `VideoView nativeControls`; fecha `Sin fecha` **editable**
- **CANCEL**: cerrar la hoja → artefacto temporal borrado
- **ERROR**: `No pudimos cargar este video.` + retry
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el probe de bytes de 32 detecta el formato real (fail-open); **la fecha resuelve `unknown` por diseño y no se puede corregir** (P9)

### PATH C-03 — Importar N imagenes (batch)
- **START CONTEXT**: `root` → menu create
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: elegir `Fotos y videos` → seleccionar N
- **NEXT SURFACE**: review de lote
- **STATE CHANGE**: N drafts con N fechas **independientes**
- **SUCCESS**: un solo submit; cada item conserva su propia fecha; asignacion masiva de album con override por item
- **CANCEL**: cerrar antes de guardar → el lote completo se descarta sin artefactos
- **ERROR**: ver C-08
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — `allowsMultipleSelection: false` y `assets?.[0]`; el intake es de un solo item por diseño actual

### PATH C-04 — Importar un lote mixto imagen + video
- **START CONTEXT**: `root` → menu create
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: seleccionar items de ambos tipos
- **NEXT SURFACE**: review de lote
- **STATE CHANGE**: drafts heterogeneos
- **SUCCESS**: cada item con su preview correcto segun tipo
- **CANCEL**: descarta el lote
- **ERROR**: un item que falla no impide mostrar los demas
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — mismo bloqueo que C-03; ademas el review actual elige un unico componente por MIME, sin seleccion de item

### PATH C-05 — Importar audio
- **START CONTEXT**: `root` → menu create → **`Importar audio`** (item 3 de primer nivel; ver B-07)
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: elegir `Importar audio` → elegir un archivo de audio
- **NEXT SURFACE**: review binario de audio
- **STATE CHANGE**: `binaryDraft` con `capture.precision = 'unknown'` forzado (`source = 'audio-import'`)
- **SUCCESS**: reproductor con reloj y play/pause; fecha `Sin fecha` **editable** (D-06); album opcional; descripcion opcional; `Guardar recuerdo`
- **CANCEL**: cerrar la hoja → artefacto borrado → `root`
- **ERROR**: `El archivo seleccionado no es un audio compatible.`
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la **capacidad** es solida y se preserva: el MIME se resuelve por prefijo o por extension con fallback, `DocumentPicker` con `audio/*` y el `AudioReview` con reloj existen y funcionan. Los dos huecos son (a) el **enrutado de primer nivel** (B-07, B-09: hoy exige `Fotos y videos` → `Elegir contenido` → `Audio`) y (b) **la fecha es siempre `unknown` y no corregible** en ningun momento (P9; se cierra con D-06 y D-07)

### PATH C-06 — Guardar el review binario
- **START CONTEXT**: review binario
- **PRECONDITIONS**: hay 1 draft; album opcional elegido; descripcion opcional
- **USER ACTION**: `Guardar recuerdo`
- **NEXT SURFACE**: el review, en estado de envio
- **STATE CHANGE**: `register` → `lifecycle='staging'`; luego upload nativo → `verify` → `finalize` → `lifecycle='active'`
- **SUCCESS**: `onComplete` → `refresh()`; el Memory aparece en Timeline con su fecha
- **CANCEL**: con la subida activa, el boton esta deshabilitado; el `X` tambien
- **ERROR**: `No pudimos guardar este recuerdo. Podés volver a intentarlo o cerrar esta ventana.` + `Reintentar`
- **RETURN CONTEXT**: `root`, refrescado
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — pipeline durable de 9 estados, verify-first, resume idempotente, sweep de huerfanos

### PATH C-07 — Preview de imagen: falla
- **START CONTEXT**: review binario de imagen
- **PRECONDITIONS**: `manipulateAsync` falla
- **USER ACTION**: —
- **NEXT SURFACE**: review binario
- **STATE CHANGE**: ninguna
- **SUCCESS**: copy honesta + `Reintentar vista previa`
- **CANCEL**: n/a
- **ERROR**: el error boundary lo captura y no arrastra la app
- **RETURN CONTEXT**: review
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — patron correcto: el original nunca se modifica para hacer un preview

### PATH C-08 — Guardar un lote con falla parcial de subida
- **START CONTEXT**: review de lote
- **PRECONDITIONS**: N jobs, al menos uno falla
- **USER ACTION**: `Guardar recuerdo`
- **NEXT SURFACE**: banda de actividad
- **STATE CHANGE**: los exitosos → `active`; los fallidos → `failed`
- **SUCCESS**: count honesto de cuantos entraron
- **CANCEL**: `Cancelar` por job
- **ERROR**: `No se pudo subir {nombre}` + `Reintentar` por cada fallido
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el reconcileo por job funciona bien (P-03); falta la entrada batch que produce el lote

---

## D. Date / Metadata

### PATH D-01 — Fecha de imagen de galeria
- **START CONTEXT**: review binario de imagen
- **PRECONDITIONS**: el asset trae `exif`
- **USER ACTION**: —
- **NEXT SURFACE**: review
- **STATE CHANGE**: ninguna
- **SUCCESS**: `exact`, mostrando `12 ene 2024`
- **CANCEL**: n/a
- **ERROR**: si no hay EXIF parseable → `unknown`, `Sin fecha`
- **RETURN CONTEXT**: review
- **PERMISSION**: —
- **DEVICE QA**: si (que entrega EXIF el SDK en cada version de iOS no es garantizable por fuente)
- **CURRENT STATUS**: `IMPLEMENTED` — precedencia `DateTimeOriginal` → `DateTimeDigitized` → `DateTime`, con parser estricto que rechaza calendarios imposibles y convierte wall-clock a UTC deliberadamente

### PATH D-02 — Fecha de video de galeria
- **START CONTEXT**: review binario de video
- **PRECONDITIONS**: ningun EXIF entregado por el SDK para video
- **USER ACTION**: —
- **NEXT SURFACE**: review
- **STATE CHANGE**: ninguna
- **SUCCESS**: `Sin fecha`, en el grupo `Sin fecha` del Timeline
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: review
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` como decision (es honesto) / **`BROKEN` como producto** porque no hay correccion (P9). Se cierra con D-06

### PATH D-03 — Fecha de captura de camara
- **START CONTEXT**: `camera`
- **PRECONDITIONS**: permiso concedido; shutter disparado
- **USER ACTION**: capturar
- **NEXT SURFACE**: review de captura
- **STATE CHANGE**: `capturedAt = new Date().toISOString()` en el instante de la captura
- **SUCCESS**: `exact`
- **CANCEL**: `Repetir` → vuelve al shutter
- **ERROR**: `No pudimos sacar la foto. Probá de nuevo.`
- **RETURN CONTEXT**: review de intake
- **PERMISSION**: `homecloud.contribute` + permiso de camara
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` con deuda — se pide `exif: true` en `takePictureAsync` pero **`result.exif` nunca se lee**; la fecha viene del reloj del cliente, que es correcto para una captura nativa

### PATH D-04 — Fecha de audio grabado
- **START CONTEXT**: `intake` → `Grabar audio` (item 4 de primer nivel; ver B-08)
- **PRECONDITIONS**: permiso de microfono concedido
- **USER ACTION**: grabar → detener
- **NEXT SURFACE**: review binario de audio con reproductor
- **STATE CHANGE**: `capturedAt` tomado **antes** de `record()`
- **SUCCESS**: `exact`
- **CANCEL**: `Cancelar` → `stopAndDiscard` + restauracion del modo de audio
- **ERROR**: `empty recording` / validacion de URI y tamano
- **RETURN CONTEXT**: review de intake
- **PERMISSION**: `homecloud.contribute` + permiso de microfono
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — `durationMillis` se captura con `Math.max(antes, despues)` y **se descarta**: no esta en `BinaryMemoryMetadata`, ni en el payload de `register`, ni existe columna en DB

### PATH D-05 — Fecha de audio importado
- **START CONTEXT**: `root` → menu create → `Importar audio` → review binario de audio
- **PRECONDITIONS**: archivo `.m4a`/`.mp3`/etc
- **USER ACTION**: —
- **NEXT SURFACE**: review
- **STATE CHANGE**: `unknown` forzado
- **SUCCESS**: `Sin fecha`. **`Sin fecha` es automatico y NO terminal**: el usuario puede corregirla **en este review** (D-06) y **despues** en `Informacion del recuerdo` (D-07). Con la correccion a `exact`, el Memory pasa a ser elegible para resurfacing (Q-07)
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: review
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` como decision / **`BROKEN` como producto** por falta de correccion (P9). Alternativas evaluadas y rechazadas en el codice: `asset.creationTime` no existe en el SDK, `duration` es longitud, `assetId` requeriria `expo-media-library` (no instalada), parsear `fileName` es heuristica. **Ninguna se rehabilita**: la fecha del audio importado no se deriva, se pregunta. Prohibido derivarla del nombre de archivo, del mtime del archivo, del momento de la subida, de la duracion o de cualquier heuristica

### PATH D-05b — Completar una fecha parcial a `exact`
- **START CONTEXT**: review binario (D-06) o `Informacion del recuerdo` (D-07)
- **PRECONDITIONS**: el draft / Memory esta en `month_year`, `year` o `unknown`
- **USER ACTION**: abrir la edicion de fecha y elegir **explicitamente** una fecha exacta **con dia**
- **NEXT SURFACE**: el mismo review o la misma hoja de Info
- **STATE CHANGE**: `capture_precision = 'exact'`; `captured_at` completo; `captured_month` presente
- **SUCCESS**: la fecha corregida prevalece sobre cualquier valor automatico, se persiste, y el Memory pasa a participar de resurfacing por fecha exacta (Q-07)
- **CANCEL**: cerrar sin guardar → la precision parcial anterior se conserva intacta
- **ERROR**: validacion en 3 capas (front, servicio, backend) con copy por capa
- **RETURN CONTEXT**: el review, o el Viewer desde el que se abrio Info
- **PERMISSION**: `homecloud.contribute` (en intake) / `homecloud.organize` (post-guardado)
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — no existe ninguna via de correccion, ni en intake ni post-guardado. Es la transicion `partial → exact` y es la **unica** que devuelve un Memory al resurfacing. Prohibido que HomeCloud la ejecute solo: sin eleccion explicita del usuario no hay transicion

### PATH D-06 — Corregir la fecha en el review binario
- **START CONTEXT**: review binario (imagen, video, **audio importado**, audio grabado)
- **PRECONDITIONS**: hay un draft
- **USER ACTION**: editar la fecha (exacta / mes y ano / ano / sin fecha)
- **NEXT SURFACE**: review binario
- **STATE CHANGE**: el draft pasa a derivarse de la correccion del usuario
- **SUCCESS**: la fecha corregida prevalece sobre cualquier valor automatico y se persiste. Aplica **igual** al audio importado (D-05), cuya `Sin fecha` automatica es corregible aqui
- **CANCEL**: descartar la correccion → vuelve al valor derivado
- **ERROR**: validacion en 3 capas (front, servicio, backend) con copy por capa
- **RETURN CONTEXT**: review binario
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — la fecha se renderiza read-only como 3 `AppText` sin `onPress`; el componente de precision con 4 chips existe pero **solo esta montado en el formulario escrito**

### PATH D-07 — Corregir la fecha de un Memory ya guardado
- **START CONTEXT**: `Informacion del recuerdo` (M-01)
- **PRECONDITIONS**: el Memory existe
- **USER ACTION**: editar la fecha
- **NEXT SURFACE**: la misma hoja de Info
- **STATE CHANGE**: `captured_*` y `capture_precision` se actualizan; el Timeline reordena
- **SUCCESS**: la fecha corregida se ve en Timeline, en el album y en resurfacing. Si la correccion lleva un Memory de `month_year`/`year`/`unknown` a `exact`, pasa a ser elegible de resurfacing en la siguiente lectura, **sin ninguna accion adicional** (Q-07). Si la correccion es a una precision parcial o a `Sin fecha`, el Memory queda fuera de resurfacing
- **CANCEL**: cerrar sin guardar → sin cambios
- **ERROR**: copy honesto; si el Memory no esta ACTIVE, no se edita
- **RETURN CONTEXT**: el Viewer desde el que se abrio
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — no existe endpoint `PATCH` de memory (la unica ruta `PATCH` de contenido es `/content/:contentId/file`, que es de Files), ni servicio cliente de update, ni superficie de Info

### PATH D-08 — Corregir fecha en lote
- **START CONTEXT**: seleccion multiple
- **PRECONDITIONS**: N Memories seleccionados
- **USER ACTION**: corregir la fecha de los N
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: —
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: —
- **CURRENT STATUS**: `DEFERRED` — decision explicita de Product Truth §7.4: no se congela sin evidencia de necesidad. **No es un olvido**

### PATH D-09 — `Sin fecha` en el Timeline
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay Memories con `capture_precision='unknown'`
- **USER ACTION**: —
- **NEXT SURFACE**: seccion `Sin fecha` al final del Timeline
- **STATE CHANGE**: ninguna
- **SUCCESS**: agrupacion honesta, separada de los recuerdos fechados, con titulo `Sin fecha`
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el modo `timeline` pone unknown y year-only al final; el modo `album` los pone al principio, que es la decision correcta de orden de album

---

## E. Albums

### PATH E-01 — Ver el riel de albums
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `organize` puede ser false
- **USER ACTION**: —
- **NEXT SURFACE**: riel horizontal
- **STATE CHANGE**: ninguna
- **SUCCESS**: tiles de album con portada, nombre y `itemCount` verbatim
- **CANCEL**: n/a
- **ERROR**: `ErrorState` + `Reintentar`, conservando tiles si ya habia contenido
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `STALE` — el header muestra `+ Nuevo` en las 5 fases y **no existe tile de creacion al final del riel** (P5). El modelo de dominio (portada, `itemCount`, orden) esta intacto

### PATH E-02 — Ver el riel con 0 albums
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `listAlbums` devuelve 0 filas
- **USER ACTION**: —
- **NEXT SURFACE**: seccion Albums
- **STATE CHANGE**: ninguna
- **SUCCESS**: **solo el tile de creacion**, util y persistente
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.organize` para el tile
- **DEVICE QA**: si
- **CURRENT STATUS**: `STALE` — hay **dos** affordances simultaneas (header `+ Nuevo` + boton `Crear álbum`) y ningun tile en el riel

### PATH E-03 — Ver el riel con 1 album
- **START CONTEXT**: `root`
- **PRECONDITIONS**: 1 album
- **USER ACTION**: —
- **NEXT SURFACE**: riel
- **STATE CHANGE**: ninguna
- **SUCCESS**: 1 tile + tile de creacion
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `STALE` — mismo defecto que E-01

### PATH E-04 — Crear album desde la raiz
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: tap en el tile final `+ Nuevo álbum`
- **NEXT SURFACE**: hoja `Nuevo álbum`
- **STATE CHANGE**: `editor = {mode:'create'}`
- **SUCCESS**: `POST /api/homecloud/albums` → el album aparece en el riel, en orden alfabético
- **CANCEL**: `X` → `root`, sin cambios
- **ERROR**: `No pudimos guardar el álbum.` con la hoja abierta y el texto editable
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el flujo de creacion funciona; la **affordance** es `STALE`. Validacion solo client-side de blank; duplicados permitidos sin precheck

### PATH E-05 — Abrir un album
- **START CONTEXT**: `root`
- **PRECONDITIONS**: el album existe y es `active`
- **USER ACTION**: tap en el tile
- **NEXT SURFACE**: overlay de Album
- **STATE CHANGE**: `openAlbumId` + `detailController.open()`
- **SUCCESS**: SectionList con los Members del album, ordenados mas antiguo → mas nuevo
- **CANCEL**: `X` → `root`
- **ERROR**: `No pudimos cargar este álbum` + `Reintentar`; si fue borrado, `ALBUM_MISSING` terminal
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — overlay anidado con su propio `SectionList`, `RefreshControl` y estados excluyentes

### PATH E-06 — Abrir un album vacio
- **START CONTEXT**: overlay de Album
- **PRECONDITIONS**: `itemCount = 0`
- **USER ACTION**: —
- **NEXT SURFACE**: overlay de Album
- **STATE CHANGE**: ninguna
- **SUCCESS**: copy honesto + CTA `Agregar recuerdos` (solo si `organize`)
- **CANCEL**: `X` → `root`
- **ERROR**: n/a
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.organize` para el CTA
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el album no desaparece de la raiz: es un read model, no una navegacion

### PATH E-07 — Renombrar album
- **START CONTEXT**: overlay de Album, o `root` via `⋯` del tile
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: `⋯` → `Renombrar álbum` → nuevo nombre
- **NEXT SURFACE**: hoja `Renombrar álbum`
- **STATE CHANGE**: `PATCH /api/homecloud/albums/:id`
- **SUCCESS**: el nombre cambia en el riel y en el titulo del overlay
- **CANCEL**: `X` → sin cambios
- **ERROR**: copy honesto con la hoja abierta
- **RETURN CONTEXT**: el llamador
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — re-sembrado del borrador al abrir; `closeDisabled` mientras guarda

### PATH E-08 — Eliminar album
- **START CONTEXT**: `root` via `⋯`, o overlay de Album
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: `⋯` → `Eliminar álbum` → confirmar
- **NEXT SURFACE**: `root`
- **STATE CHANGE**: hard delete de `homecloud_albums`; las membresias caen por FK `ON DELETE CASCADE`
- **SUCCESS**: el album desaparece del riel; **los Memories siguen intactos**; `readFirstPage()` porque cambio el `albumIds` proyectado
- **CANCEL**: `X` de la hoja → sin cambios
- **ERROR**: `No pudimos eliminar el álbum.` con la hoja abierta
- **RETURN CONTEXT**: `root` (el overlay se cierra si estaba abierto)
- **PERMISSION**: `homecloud.organize` (**no** `homecloud.delete`, por decision documentada)
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la semantica de dominio es correcta y esta probada; **falta el dialogo de confirmacion explicito** que exige Product Truth §10.4, y el boton destructivo esta expuesto directamente en la hoja

### PATH E-09 — Agregar Memories existentes a un album
- **START CONTEXT**: overlay de Album (o `⋯` del album vacio)
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: `Agregar recuerdos`
- **NEXT SURFACE**: seleccion contextual dentro del Album
- **STATE CHANGE**: `selection.purpose = {kind:'addToAlbum', albumId}`
- **SUCCESS**: ver G-05
- **CANCEL**: `X` → el overlay de Album se **remonta**
- **ERROR**: n/a
- **RETURN CONTEXT**: `album:<id>`
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — entrar en seleccion **desmonta el overlay de Album** y cambia el dataset visible al Timeline de la raiz (P4). Los ya-miembros se excluyen, pero solo se derivan de las paginas cargadas del Timeline raiz

### PATH E-10 — Quitar Memories de un album
- **START CONTEXT**: overlay de Album
- **PRECONDITIONS**: `organize = true`; seleccion activa con `purpose=removeFromAlbum`
- **USER ACTION**: `⋯` → `Quitar N del álbum`
- **NEXT SURFACE**: **overlay de Album**
- **STATE CHANGE**: se eliminan las filas de `homecloud_album_items`
- **SUCCESS**: las membresías se van; **los Memories sobreviven**; los items desaparecen del album; el usuario sigue en Album A
- **CANCEL**: `Cancelar` en la hoja → no sale de la seleccion
- **ERROR**: fallo parcial → quedan seleccionados solo los fallidos + copy honesto + `Reintentar los que fallaron`; album borrado remotamente → error terminal por item
- **RETURN CONTEXT**: **`album:<id>`**. Nunca `root`
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — la semantica de la mutacion es correcta (`DELETE .../items/:contentId`, el Memory no se toca), pero la superficie visible durante la seleccion es la raiz (P4), y la validacion de destino contra `fetchHomeCloudAlbums` mas `reloadRail()` funciona

### PATH E-11 — Quitar un solo Memory del album desde el Viewer
- **START CONTEXT**: `album:<id>` → Viewer
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: `⋯` → `Quitar del álbum`
- **NEXT SURFACE**: el Viewer sigue abierto
- **STATE CHANGE**: se elimina la membresia
- **SUCCESS**: el album ya no lo contiene; el Memory sigue existiendo
- **CANCEL**: n/a
- **ERROR**: copy honesto
- **RETURN CONTEXT**: `album:<id>`
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — `removeMemoryFromOpenAlbum` existe como modulo en `homecloudMemoryAlbumRemoval.ts:61` pero **no tiene ningun llamador en todo `front/`**; el Viewer no tiene ningun menu de acciones

### PATH E-12 — `Agregar a otro álbum` desde un album
- **START CONTEXT**: `album:<id>` con seleccion activa
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: `⋯` → `Agregar a otro álbum` → destino
- **NEXT SURFACE**: **overlay de Album**
- **STATE CHANGE**: se anaden membresias en el album destino
- **SUCCESS**: los Memories quedan en ambos albums
- **CANCEL**: `Cancelar` → no sale de la seleccion
- **ERROR**: parcial con retry
- **RETURN CONTEXT**: **`album:<id>`**
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — la accion no esta implementada; solo existe `Agregar a un álbum` (unico destino) y `Quitar N del álbum`

---

## F. Types

### PATH F-01 — Ver la fila de Tipos
- **START CONTEXT**: `root`
- **PRECONDITIONS**: siempre
- **USER ACTION**: —
- **NEXT SURFACE**: 4 tiles: Fotos, Videos, Audios, Notas
- **STATE CHANGE**: ninguna
- **SUCCESS**: visible en la raiz, en las 4 fases del rail, **tambien durante la seleccion**
- **CANCEL**: n/a
- **ERROR**: sin skeleton; son 4 tiles fijos
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — este fue el gap G2 de HC2-C y quedo resuelto creando la fila antes de borrar `collectionsRoot`

### PATH F-02 — Abrir un Tipo
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay Memories de ese `kind`
- **USER ACTION**: tap en el tile
- **NEXT SURFACE**: overlay de coleccion
- **STATE CHANGE**: `activeCollectionId = 'type:<kind>'`
- **SUCCESS**: SectionList con solo ese `kind`, en orden Timeline
- **CANCEL**: `X` → `root`
- **ERROR**: `No pudimos cargar esta colección` + `Reintentar`; `Missing` si la coleccion dejo de existir
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el filtro `kind` se aplica en SQL (`.like('mime_type','<kind>/%')` o `written_text is not null`), nunca post-filtrado

### PATH F-03 — Abrir un Tipo vacio
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `kind` sin Memories
- **USER ACTION**: tap
- **NEXT SURFACE**: overlay de coleccion
- **STATE CHANGE**: ninguna
- **SUCCESS**: `Esta colección todavía no tiene recuerdos.` — **distinto de "cargando"**
- **CANCEL**: `X` → `root`
- **ERROR**: n/a
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — los estados `missing` / `loading && length===0` / `error && length===0` / vacio son excluyentes

### PATH F-04 — Seleccionar dentro de un Tipo
- **START CONTEXT**: `type:<kind>`
- **PRECONDITIONS**: —
- **USER ACTION**: long press
- **NEXT SURFACE**: seleccion contextual
- **STATE CHANGE**: `selection.mode = 'selecting'`
- **SUCCESS**: **el dataset sigue siendo el del Tipo**; el overlay se desmonta pero el contenido se re-presenta
- **CANCEL**: `X` → el overlay se **remonta** con su dataset
- **ERROR**: n/a
- **RETURN CONTEXT**: `type:<kind>`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el dataset se conserva (`gridMemories` depende de `activeCollectionId`, que no se toca) pero **la estructura de pantalla cambia**: el overlay se desmonta y la lista aparece dentro de la raiz bajo `Álbumes`+`Tipos`. Contradice el invariante de no cambiar la IA

### PATH F-05 — Viewer dentro de un Tipo hace pager solo de ese Tipo
- **START CONTEXT**: `type:<kind>` → Viewer
- **PRECONDITIONS**: —
- **USER ACTION**: swipe
- **NEXT SURFACE**: Viewer con otro item del mismo Tipo
- **STATE CHANGE**: `activeContentId` cambia dentro de la misma fuente
- **SUCCESS**: nunca sale del Tipo
- **CANCEL**: n/a
- **ERROR**: si el dataset se vacia → `Missing`, nunca otra fuente
- **RETURN CONTEXT**: `type:<kind>`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la fuente es inmutable por construccion (3 factories) y el dataset esta memoizado con identidad estable; pero cerrar la coleccion con el Viewer abierto (Android back) vacia el dataset y deja el Viewer en `Missing` **permanente** (`requestedIndex` congelado en `-1` ⇒ todo `accept:false`)

---

## G. Selection

### PATH G-01 — Entrar en seleccion desde el Timeline
- **START CONTEXT**: `root`
- **PRECONDITIONS**: —
- **USER ACTION**: long press sobre un Memory
- **NEXT SURFACE**: seleccion contextual sobre el Timeline
- **STATE CHANGE**: `mode='selecting'`, `purpose={generic}`, `selectedIds={id}`
- **SUCCESS**: grid en el mismo sitio, offset preservado, `Álbumes` y `Tipos` **permanecen visibles**, acciones visibles desde el primer fotograma, haptic
- **CANCEL**: `X` → `root`, offset intacto
- **ERROR**: n/a
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.view` para entrar; `organize` para las acciones de organizacion
- **DEVICE QA**: si (long press y drag son `DEVICE_ONLY`)
- **CURRENT STATUS**: `IMPLEMENTED` — HC2-C BUG C esta corregido: no existe `SegmentedControl`, ni `switchTab`, ni `collectionsRoot`, ni `source` en la sesion; el `ListHeaderComponent` es constante

### PATH G-02 — Seleccionar N por arrastre (D4)
- **START CONTEXT**: cualquiera con seleccion activa
- **PRECONDITIONS**: hay un long press que arme el drag; slop 6px
- **USER ACTION**: arrastrar sobre celdas
- **NEXT SURFACE**: rango contiguo visual
- **STATE CHANGE**: `selectedIds` crece como **rango contiguo**, no como conjunto arbitrario
- **SUCCESS**: seleccion o deseleccion por rango, con auto-scroll de borde (banda 18%, 6–28 px/tick, 16 ms)
- **CANCEL**: soltar → el drag se aborta y la seleccion queda como estaba
- **ERROR**: perder foco de app → `abortDrag()`
- **RETURN CONTEXT**: la superficie del llamador
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio (feel del dedo, no demostrable por fuente)
- **CURRENT STATUS**: `IMPLEMENTED` — toda la maquinaria D4 se preserva intacta: `armMemoryDrag`/`beginMemoryDrag`/`stepMemoryDrag`/`applyMemoryVisualRange`, registro de filas por token, auto-scroll de borde, `solveMemoryRefreshGate`, `createMemoryExitGestureLock`

### PATH G-03 — Entrar en seleccion desde un Album
- **START CONTEXT**: `album:<id>`
- **PRECONDITIONS**: `organize = true` para `Quitar del álbum`
- **USER ACTION**: long press sobre un Member del album
- **NEXT SURFACE**: seleccion contextual
- **STATE CHANGE**: `mode='selecting'`, `purpose={removeFromAlbum, albumId}`
- **SUCCESS**: **el dataset sigue siendo el de Album A**
- **CANCEL**: `X` → **Album A**, offset restaurado
- **ERROR**: —
- **RETURN CONTEXT**: **`album:<id>`**. **Nunca `root`**
- **PERMISSION**: `homecloud.view`; `organize` para la accion
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `BROKEN` — `showAlbumDetail = !selecting && openAlbumId !== null` desmonta el overlay al entrar en seleccion, y `gridMemories` depende solo de `activeCollectionId` (que sigue `null`), por lo que **el dataset visible pasa a ser el Timeline completo de la raiz**. El estado del album si se preserva, por eso `cancel` "vuelve"; pero durante la seleccion el usuario ve otra lista. Un comentario del codigo afirma lo contrario del comportamiento real. **Este es el mecanismo exacto de P4**

### PATH G-04 — Entrar en seleccion desde un Tipo
- **START CONTEXT**: `type:<kind>`
- **PRECONDITIONS**: —
- **USER ACTION**: long press
- **NEXT SURFACE**: seleccion contextual
- **STATE CHANGE**: `mode='selecting'`, `purpose={generic}`
- **SUCCESS**: el dataset se conserva; **la estructura no cambia** (invariante)
- **CANCEL**: `X` → `type:<kind>`
- **ERROR**: —
- **RETURN CONTEXT**: `type:<kind>`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el dataset se preserva pero el overlay se desmonta y la lista se presenta dentro de la raiz; es un cambio estructural visible

### PATH G-05 — Agregar a album desde la seleccion
- **START CONTEXT**: `root`, `type:<kind>`, `resurfacing:<group>`, o `album:<id>`
- **PRECONDITIONS**: `organize = true`; hay albums cargados
- **USER ACTION**: `⋯` → `Agregar a un álbum` → elegir destino
- **NEXT SURFACE**: picker de destino (mismo host, contenido reemplazado)
- **STATE CHANGE**: una membresia por request, `POST .../albums/:id/items`
- **SUCCESS**: `N recuerdos agregados` + refresh del album abierto si corresponde, del rail y de la Timeline
- **CANCEL**: `Cancelar` → **no sale de la seleccion**; el contenido del album no cambia
- **ERROR**: parcial → los fallidos quedan seleccionados y nombrados + `Reintentar los que fallaron`; destino eliminado remotamente → error terminal
- **RETURN CONTEXT**: la superficie del llamador
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — un solo `ActionSheet` que **reemplaza** su contenido, nunca apila un segundo modal; una lectura autoritativa de albums valida el destino antes de confirmar

### PATH G-06 — Crear album desde la seleccion
- **START CONTEXT**: `root`, `type:<kind>`, `resurfacing:<group>`, `album:<id>`
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: `⋯` → `Agregar a un álbum` → `Nuevo álbum` → nombre → confirmar
- **NEXT SURFACE**: hoja de nombre
- **STATE CHANGE**: se crea el album **y** se agregan las N membresias **en el mismo flujo**
- **SUCCESS**: el album existe con los N Memories dentro; exito honesto; la seleccion termina
- **CANCEL**: cancelar el nombre → vuelve a la lista de destinos, **la seleccion se conserva**
- **ERROR**: falla la creacion → mensaje honesto, la hoja queda abierta, la seleccion intacta; falla la pertenencia de algunos → album creado, fallidos siguen seleccionados y nombrados
- **RETURN CONTEXT**: la superficie del llamador
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — el picker de destino construye la lista desde `rail.albums` y el codigo documenta explicitamente que **no** hay "crear album desde aqui"; ademas con 0 albums la ruta es un callejon sin salida que solo instruye ir a la barra. El servicio de intake prohibe crear albums por contrato. Este es un gap P0 de la seccion 8.4 del prompt

### PATH G-07 — `Quitar del álbum` desde la seleccion
- **START CONTEXT**: `album:<id>`
- **PRECONDITIONS**: `organize = true`; `purpose=removeFromAlbum`
- **USER ACTION**: `⋯` → `Quitar N del álbum`
- **NEXT SURFACE**: **overlay de Album**
- **STATE CHANGE**: `DELETE .../items/:contentId` por item
- **SUCCESS**: las membresías se eliminan; los Memories sobreviven; los items desaparecen de Album A
- **CANCEL**: `Cancelar` → no sale de la seleccion
- **ERROR**: parcial con retry; album borrado → error terminal por item + `reloadRail()`
- **RETURN CONTEXT**: **`album:<id>`**
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — la mutacion es correcta; la superficie no lo es (ver G-03). El copy congelado `Quitar N del álbum` prohibe `Eliminar`/`Borrar`/`Papelera` y esta correctamente implementado

### PATH G-08 — Acciones de la seleccion con 0 seleccionados
- **START CONTEXT**: seleccion activa
- **PRECONDITIONS**: `selectedCount = 0`
- **USER ACTION**: tap en `⋯`
- **NEXT SURFACE**: ninguna
- **STATE CHANGE**: ninguna
- **SUCCESS**: el `⋯` esta deshabilitado; no se abre una hoja vacia
- **CANCEL**: n/a
- **ERROR**: n/a
- **RETURN CONTEXT**: n/a
- **PERMISSION**: —
- **DEVICE QA**: no
- **CURRENT STATUS**: `IMPLEMENTED` — `actionsDisabled = selectedCount === 0 || busy`

---

## H. Viewer Common

### PATH H-01 — Abrir el Viewer: el item exacto es la autoridad
- **START CONTEXT**: cualquiera de los 7 llamadores
- **PRECONDITIONS**: el dataset de la fuente contiene el `contentId` pedido
- **USER ACTION**: tap en un Memory
- **NEXT SURFACE**: Viewer
- **STATE CHANGE**: `viewer = {source, activeContentId}`
- **SUCCESS**: el shell aparece **de inmediato**; el pager se alinea al `contentId` pedido con opening lock; ninguna callback de layout, scroll, indice por defecto, actualizacion de dataset ni momentum inicial lo reemplaza antes de que la alineacion este establecida
- **CANCEL**: n/a
- **ERROR**: si el `contentId` no esta en el dataset → `Missing` (`Este recuerdo ya no está disponible.` + `Volver`), **nunca el indice 0**
- **RETURN CONTEXT**: el llamador
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio (indice != 0, sin gesto del usuario)
- **CURRENT STATUS**: `IMPLEMENTED` — HC2-C A1–A4 corregidos: `resolveMemoryViewerIndex` usa `findIndex` crudo (sin `Math.max(0,...)`), existe `opening lock` con 3 vias de liberacion, `onActiveChange` tiene doble guarda, el dataset esta memoizado con `reuseMemoryViewerDataset`, y **todas** las paginas declaran `width` (video y audio incluidos)

### PATH H-02 — El shell del Viewer es inmersivo
- **START CONTEXT**: Viewer abierto
- **PRECONDITIONS**: —
- **USER ACTION**: —
- **NEXT SURFACE**: Viewer
- **STATE CHANGE**: ninguna
- **SUCCESS**: navbar inferior global, selector `Archivos|Recuerdos`, header de pagina y `AppTopBar` **ocultos**; el media viewport ocupa toda la pantalla menos las safe areas
- **CANCEL**: n/a
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `BROKEN` — P2, causa raiz `PROVEN_STATIC`: el Viewer es un `View` con `{...StyleSheet.absoluteFill, zIndex:20}`, **no** un `Modal` (RN import en `MemoryViewer.tsx:2` no incluye `Modal`). El navbar global (`MainFloatingTabBar`, `position:'absolute', bottom:0, zIndex:10`, hermano del contenedor de screens en `BottomTabView`) pinta encima porque `zIndex` de RN no es transitivo entre subarboles. Los ancestros (`SegmentedControl`, header HomeCloud) quedan visibles e interactivos. Ademas **el Viewer no consulta safe-area en ningun punto** (`useSafeAreaInsets` no aparece en `components/homecloud/*` salvo la camara) y usa la constante magica `paddingTop: 90`. El propio repo ya compensa este solapamiento en `HomeCloudScannerScreen` y `PresenceScreen` con `floatingNavigationMetrics.mainRegularHeight + Math.max(insets.bottom, ...)` ≈ 102px, y el Viewer no lo hace

### PATH H-03 — Cerrar control del Viewer
- **START CONTEXT**: Viewer abierto
- **PRECONDITIONS**: —
- **USER ACTION**: tap en `Cerrar`
- **NEXT SURFACE**: el llamador
- **STATE CHANGE**: `viewer = null`
- **SUCCESS**: retorno con offset restaurado; todos los players se liberan por el hook
- **CANCEL**: n/a
- **ERROR**: —
- **RETURN CONTEXT**: exactamente el llamador
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el boton existe con `accessibilityLabel="Cerrar recuerdo"`, pero mide **42x42px**, por debajo del `touchTargets.normal = 44`

### PATH H-04 — Menu de acciones del Viewer
- **START CONTEXT**: Viewer abierto
- **PRECONDITIONS**: —
- **USER ACTION**: tap en `⋯`
- **NEXT SURFACE**: hoja de acciones
- **STATE CHANGE**: ninguna
- **SUCCESS**: acciones segun fuente y `kind` (§18.2)
- **CANCEL**: `Cancelar` → el Viewer **sigue abierto**
- **ERROR**: —
- **RETURN CONTEXT**: el Viewer
- **PERMISSION**: segun la accion
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — el chrome del Viewer tiene exactamente dos piezas (`top` y `bottom`); **no existe ningun control `⋯` ni ningun menu de acciones**. Por eso `Quitar del álbum` de un solo Memory, `Información del recuerdo`, `Compartir`, `Copiar` y `No mostrar este recuerdo acá` son inalcanzables

### PATH H-05 — El pager no cambia de fuente
- **START CONTEXT**: Viewer abierto desde la fuente F
- **PRECONDITIONS**: —
- **USER ACTION**: swipe repetido
- **NEXT SURFACE**: Viewer con otro item de F
- **STATE CHANGE**: `activeContentId` cambia dentro de F
- **SUCCESS**: la etiqueta de la fuente no cambia nunca; nunca "cambia a la biblioteca porque el dataset se vacio"
- **CANCEL**: n/a
- **ERROR**: dataset de F transitoriamente vacio → `Missing`, no otra fuente
- **RETURN CONTEXT**: F
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — `viewer.source` solo se escribe al abrir via las 3 factories; el Viewer no lee `source.kind` para nada, solo `source.label`; y `memoryViewerDataset` devuelve `[]` en vez de cambiar de fuente

### PATH H-06 — Append de paginas no desplaza el activo
- **START CONTEXT**: Viewer abierto
- **PRECONDITIONS**: el usuario swipea cerca del final
- **USER ACTION**: `onNearEnd`
- **NEXT SURFACE**: Viewer con mas paginas
- **STATE CHANGE**: el dataset crece
- **SUCCESS**: el contenido activo no se mueve; se resuelve **por `contentId`**, nunca por indice fisico
- **CANCEL**: n/a
- **ERROR**: —
- **RETURN CONTEXT**: F
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — `onNearEnd` se llama **antes** del check de `accept`, con guarda `computedIndex >= length - 3`, y es lectura pura

### PATH H-07 — Android back con el Viewer abierto
- **START CONTEXT**: Viewer abierto
- **PRECONDITIONS**: usuario en un dispositivo con boton fisico
- **USER ACTION**: back
- **NEXT SURFACE**: deberia ser el llamador
- **STATE CHANGE**: —
- **SUCCESS**: **el Viewer se cierra**
- **CANCEL**: n/a
- **ERROR**: —
- **RETURN CONTEXT**: el llamador
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — el `BackHandler` de `HomeCloudMemoriesScreen:1307-1334` tiene 5 prioridades (drag > seleccion > coleccion > album > false) y **ninguna contempla el Viewer**. Con el Viewer abierto sobre una coleccion, back ejecuta `closeCollection()` → el dataset del Viewer pasa a `[]` → `Missing` **sin cerrarse**, y por `opening.ts:157` el `requestedIndex` congelado en `-1` hace que todo settle futuro sea `accept:false` ⇒ **ningun video/audio al que se deslice obtiene player**

### PATH H-08 — Pausa en background del Viewer
- **START CONTEXT**: Viewer con video/audio reproduciendo
- **PRECONDITIONS**: la app pasa a background
- **USER ACTION**: —
- **NEXT SURFACE**: Viewer pausado
- **STATE CHANGE**: `authorized = false` → `pause()`
- **SUCCESS**: pausa inmediata y audible; el player **no** se libera
- **CANCEL**: n/a
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si, obligatorio (parada audible inmediata)
- **CURRENT STATUS**: `IMPLEMENTED` — un solo `AppState` listener, `authorized===false` significa pause y nunca resume, `onScrollBeginDrag` revoca de inmediato, un cambio de pagina asentado desmonta la pagina saliente y el hook libera. Todo esto se preserva intacto

---

## I. Image

### PATH I-01 — Abrir una imagen
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: hay signed URL disponible
- **USER ACTION**: tap
- **NEXT SURFACE**: pagina de imagen del Viewer
- **STATE CHANGE**: preview y original se solicitan
- **SUCCESS**: el preview aparece primero y el original lo reemplaza; loading con spinner + `Cargando recuerdo…`
- **CANCEL**: n/a
- **ERROR**: `No pudimos mostrar este recuerdo.` + `Reintentar`
- **RETURN CONTEXT**: el llamador
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el retry existe; **el preview no esta gateado por `active`**: `ImagePage` ni siquiera recibe la prop `active`, y pide el original al montar, con deps que incluyen `scale` y `translate` ⇒ **hasta ~7 originales firmados concurrentes por apertura**, sin deduplicacion de requests en vuelo. Ademas el efecto **no tiene guardia de generacion**, a diferencia de video y preview, lo que puede pintar la imagen de la pagina anterior

### PATH I-02 — Zoom con pinza
- **START CONTEXT**: pagina de imagen
- **PRECONDITIONS**: 2 dedos
- **USER ACTION**: pinza
- **NEXT SURFACE**: pagina de imagen ampliada
- **STATE CHANGE**: `scale` en 1..3
- **SUCCESS**: zoom fluido con `useNativeDriver` en el spring de retour
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: **si, obligatorio** (P3)
- **CURRENT STATUS**: `BROKEN` en fisico — el codigo implementa pinch con `PanResponder` (`onStartShouldSetPanResponder: touches.length > 1`, escala clamp 1..3), y hay un test que lo verifica por fuente. **La observacion del usuario en iPhone fisico es que el zoom no es usable.** Clasificacion de producto: `BROKEN/PARTIAL` hasta que se pruebe en el dedo. La causa no esta aislada estaticamente. Defectos reales adyacentes: falta `onPanResponderTerminate` (el `startDistance` queda sucio si el sistema termina el responder), faltan los `*Capture`, y el clamp vertical es una constante **magica `±500`** en vez de derivarse del viewport

### PATH I-03 — Pan con zoom
- **START CONTEXT**: pagina de imagen con `scale > 1.01`
- **PRECONDITIONS**: zoom activo
- **USER ACTION**: arrastrar con 1 dedo
- **NEXT SURFACE**: pagina de imagen desplazada
- **STATE CHANGE**: `translate` clamp
- **SUCCESS**: el pager **no** roba el gesto (`onPanResponderTerminationRequest` devuelve `scale <= 1.01`)
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si, obligatorio (arbitraje pager ↔ gestos)
- **CURRENT STATUS**: `PARTIAL` — la logica de arbitraje es correcta por lectura, pero el clamp vertical magico puede permitir arrastrar la imagen fuera del viewport sin poder recuperar el borde. Sin device QA no se declara `IMPLEMENTED`

### PATH I-04 — Reset de zoom
- **START CONTEXT**: pagina de imagen con zoom
- **PRECONDITIONS**: —
- **USER ACTION**: cambiar de pagina, o cerrar y reabrir
- **NEXT SURFACE**: pagina nueva a escala 1
- **STATE CHANGE**: `scale=1`, `translate={0,0}`
- **SUCCESS**: reset estructural por cambio de `memory.id`
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el reset depende del cambio de `memory.id`; si la pagina permanece montada dentro del `windowSize=7` y el usuario vuelve a ella, **el zoom anterior se conserva**

### PATH I-05 — Doble toque para zoom
- **START CONTEXT**: pagina de imagen
- **PRECONDITIONS**: —
- **USER ACTION**: doble toque
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: —
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: —
- **CURRENT STATUS**: `DEFERRED` — decision de Product Truth §14.2. No hay detector de tap-count en el stack (RN core no lo ofrece; no hay RNGH instalado). El unico `onPress` alterna el chrome, y en la pagina escrita un simple scroll vertical lo dispara via `onTouchEnd`

### PATH I-06 — Error de carga de imagen sin token
- **START CONTEXT**: pagina de imagen
- **PRECONDITIONS**: `accessToken === null` o el preview falla
- **USER ACTION**: —
- **NEXT SURFACE**: pagina de imagen
- **STATE CHANGE**: ninguna
- **SUCCESS**: —
- **CANCEL**: —
- **ERROR**: **spinner perpetuo** sin error ni retry
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — no hay timeout ni estado terminal para "el original nunca llega". Un estado de carga infinito sin salida es inaceptable bajo Product Truth §14.4

---

## J. Video

### PATH J-01 — Abrir un video (shell inmediato)
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: hay signed URL disponible
- **USER ACTION**: tap
- **NEXT SURFACE**: shell del Viewer + pagina de video
- **STATE CHANGE**: `useVideoPlayer({uri}, pause)` se crea; se solicita el original
- **SUCCESS**: **el shell aparece de inmediato**, sin esperar bytes
- **CANCEL**: n/a
- **ERROR**: —
- **RETURN CONTEXT**: el llamador
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `IMPLEMENTED` — el shell es un overlay que monta antes de que resuelva cualquier fetch

### PATH J-02 — Ver el video antes de que este listo (P1)
- **START CONTEXT**: pagina de video
- **PRECONDITIONS**: `status !== 'readyToPlay'`
- **USER ACTION**: —
- **NEXT SURFACE**: pagina de video
- **STATE CHANGE**: overlay `Cargando video…` con spinner sobre negro
- **SUCCESS**: el overlay desaparece en `readyToPlay`
- **CANCEL**: —
- **ERROR**: si el original nunca llega, el overlay **no termina**
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `BROKEN` — P1, causa raiz `PROVEN_STATIC`: `MemoryVideoPage.tsx` importa **solo** `getMemoryOriginalUrl` (linea 7); **no importa `useMemoryPreviewUrl` ni lee `hasPreview`**. No hay poster en ningun punto del pipeline, y el propio codigo lo declara (`NO POSTER, NO TRANSCODING`, linea 35). El resultado es un cuadrado negro ambiguo: el usuario no puede distinguir "cargando" de "no funciono". La razon de que **algunos** tarden mas es `PLAUSIBLE_ONLY` (tamano de archivo + ancho de banda), pero la falta de poster es un hecho estatico que aplica a **todos** los videos

### PATH J-03 — Reproducir un video
- **START CONTEXT**: pagina de video activa
- **PRECONDITIONS**: `readyToPlay`
- **USER ACTION**: tap en play (controles nativos)
- **NEXT SURFACE**: pagina de video reproduciendo
- **STATE CHANGE**: el player reproduce
- **SUCCESS**: play/pause, scrub, tiempo y duracion via `nativeControls`
- **CANCEL**: —
- **ERROR**: `resolveMemoryMediaFailure` clasifica honestamente; `unsupported` **solo** en la plataforma cuya API lo reporta
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio (feel del scrub nativo)
- **CURRENT STATUS**: `IMPLEMENTED` — el codigo **nunca** llama `play()`: la reproduccion arranca solo por los controles nativos, y volver a foreground no reanuda. Invariante correcto

### PATH J-04 — Fullscreen de video
- **START CONTEXT**: pagina de video
- **PRECONDITIONS**: —
- **USER ACTION**: control de fullscreen
- **NEXT SURFACE**: video a pantalla completa
- **STATE CHANGE**: —
- **SUCCESS**: transicion a fullscreen y de vuelta
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si, obligatorio (fullscreen dentro de un pager puede romper la paginacion)
- **CURRENT STATUS**: `MISSING` — `fullscreenOptions={{enable:false}}` esta explicitamente deshabilitado; la API lo soporta con una prop

### PATH J-05 — Player en una pagina inactiva
- **START CONTEXT**: Viewer con varias paginas montadas
- **PRECONDITIONS**: la pagina no es la activa
- **USER ACTION**: —
- **NEXT SURFACE**: placeholder
- **STATE CHANGE**: ninguna
- **SUCCESS**: **no se instancia `useVideoPlayer`, no se monta `VideoView`, no se pide el original**
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el early return por `!active` ocurre **antes** de que exista el subcomponente con hooks; invariante correcto y verificado por test

### PATH J-06 — Codec no soportado
- **START CONTEXT**: pagina de video
- **PRECONDITIONS**: el codec no se puede decodificar
- **USER ACTION**: —
- **NEXT SURFACE**: pagina de video
- **STATE CHANGE**: —
- **SUCCESS**: copy honesto por tipo (`access` vs `playback`)
- **CANCEL**: —
- **ERROR**: `VideoTrack.isSupported` esta documentado como **Android-only**, asi que en iOS se informa `playback` a proposito
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — honesto y delimitado por evidencia, no por suposicion

---

## K. Audio

### PATH K-01 — Abrir un audio
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: hay signed URL disponible
- **USER ACTION**: tap
- **NEXT SURFACE**: pagina de audio
- **STATE CHANGE**: `useAudioPlayer(uri, {updateInterval:250})` se crea en la pagina activa
- **SUCCESS**: shell inmediato + identidad visual `Audio` + barra de progreso + reloj
- **CANCEL**: n/a
- **ERROR**: `Cargando audio…` no bloqueante; si `status.error` → copy honesto
- **RETURN CONTEXT**: el llamador
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la identidad visual es solo un icono + la palabra `Audio` + una barra recta de 6px; no hay nada que_failure ver si el archivo es largo

### PATH K-01b — Abrir un audio importado (mismo visor que un audio grabado)
- **START CONTEXT**: cualquiera (Timeline, Album, Tipo `Audios`, Resurfacing)
- **PRECONDITIONS**: el Memory tiene `kind = audio` y `mimeType` de audio, sea cual sea su origen
- **USER ACTION**: tap
- **NEXT SURFACE**: pagina de audio — **la misma** que K-01
- **STATE CHANGE**: `useAudioPlayer(uri)` sobre el original del Memory
- **SUCCESS**: **capacidades identicas** a un audio grabado: identidad visual, play/pause, seek por toque, reloj y duracion, `-10`/`+10` (K-03), velocidad (K-04), buffering, error honesto. El origen (`audio-import` vs `audio-recorder`) **no cambia nada visible ni ninguna capacidad**. No hay un visor degradado para audio importado, ni una copy de "no soportado" por ser importado
- **CANCEL**: n/a
- **ERROR**: si el original no se puede reproducir, copy honesto de playback igual que para audio grabado. **Nunca** un fallo atribuido al origen
- **RETURN CONTEXT**: el llamador
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el Audio Viewer de CURRENT **ya** es agnostico al origen: reproduce por `kind`/`mimeType`, no por `source`. Se preserva tal cual. Lo unico pendiente es que el audio importado sea alcanzable como accion de primer nivel (B-07) para poder llegar aqui

### PATH K-02 — Seek de audio
- **START CONTEXT**: pagina de audio
- **PRECONDITIONS**: hay duracion conocida y el track midio
- **USER ACTION**: tap sobre la barra
- **NEXT SURFACE**: pagina de audio
- **STATE CHANGE**: `seekTo(target)`
- **SUCCESS**: salto a la posicion tapped, con `audioSeekRatio` / `audioSeekTarget` puros
- **CANCEL**: —
- **ERROR**: `No pudimos mover la posición del audio.`
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el seek es por **tap**, no por arrastre continuo: no hay `onTouchMove` ni `PanResponder` en el archivo

### PATH K-03 — Seek de audio -10 s / +10 s
- **START CONTEXT**: pagina de audio
- **PRECONDITIONS**: —
- **USER ACTION**: boton `-10` / `+10`
- **NEXT SURFACE**: pagina de audio
- **STATE CHANGE**: `seekTo(current ± 10)` con clamp
- **SUCCESS**: salto preciso y audible
- **CANCEL**: —
- **ERROR**: copy honesto
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio (precision del salto)
- **CURRENT STATUS**: `MISSING` — no hay ningun control de salto; la API `AudioPlayer.seekTo` esta instalada y disponible

### PATH K-04 — Velocidad de audio
- **START CONTEXT**: pagina de audio
- **PRECONDITIONS**: —
- **USER ACTION**: selector de velocidad
- **NEXT SURFACE**: pagina de audio
- **STATE CHANGE**: `setPlaybackRate`
- **SUCCESS**: 0.5x / 1x / 1.5x / 2x audible y controlable
- **CANCEL**: —
- **ERROR**: copy honesto
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio (el tono debe ser controlable)
- **CURRENT STATUS**: `MISSING` — `playbackRate` no aparece en el archivo; la API esta instalada y el rango iOS (0–2) alcanza

### PATH K-05 — Waveform de audio
- **START CONTEXT**: pagina de audio
- **PRECONDITIONS**: —
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: —
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: —
- **CURRENT STATUS**: `DEFERRED` con veredicto `REAL_WAVEFORM_EXPENSIVE` + `DEVICE_VERIFY_REQUIRED` — **`FAKE WAVEFORM = OUT` bajo cualquier circunstancia.** La API real **existe** y es publica (`useAudioSampleListener` + `isAudioSamplingSupported`, `expo-audio@57.0.5`), pero: (a) solo muestrea **durante la reproduccion**, no hay muestreo en vivo al grabar; (b) requiere `RECORD_AUDIO` en Android; (c) el propio paquete advierte que no esta soportado en todas las plataformas; (d) una waveform estatica exigiria descargar y decodificar el original en el cliente, lo que es caro con el modelo de signed URL actual. Ningun donor de la tabla §32 muestra waveform en el visor. **V1 recibe un diseno honesto no-waveform y no vacio** (§16.3)

### PATH K-06 — Audio en background
- **START CONTEXT**: pagina de audio reproduciendo
- **PRECONDITIONS**: la app pasa a background
- **USER ACTION**: —
- **NEXT SURFACE**: pagina de audio pausada
- **STATE CHANGE**: `pause()`
- **SUCCESS**: pausa por revocacion de autorizacion; sin auto-resume
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — la pagina de audio **no** llama `setAudioModeAsync`, que es una decision deliberada; el grabador ya restaura el modo de playback

---

## L. Written

### PATH L-01 — Crear un recuerdo escrito
- **START CONTEXT**: `root` → menu create
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: `Escribir un recuerdo` → escribir texto → elegir fecha → `Guardar recuerdo`
- **NEXT SURFACE**: formulario escrito
- **STATE CHANGE**: `register` (staging) → `finalize` (active) en 2 requests
- **SUCCESS**: el texto aparece en `Notas` y en Timeline con su fecha
- **CANCEL**: `X` (bloqueado mientras guarda) → `root` sin cambios
- **ERROR**: `Escribí el recuerdo antes de guardarlo.`; reintentos idempotentes por `intake_request_id`
- **RETURN CONTEXT**: `root`, refrescado
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el unico editor es `AppInput multiline`: sin rich text, sin markdown, sin checklists. El backend prohibe `displayName`, `mimeType`, `sizeBytes`, `extension`, `caption`, `documentDate` y `note` para escritos, y `uploaded_at` queda NULL perpetuo

### PATH L-02 — Elegir precision al escribir
- **START CONTEXT**: formulario escrito
- **PRECONDITIONS**: —
- **USER ACTION**: elegir entre `Fecha exacta` / `Mes y año` / `Sólo año` / `Sin fecha`
- **NEXT SURFACE**: calendario o inputs segun la precision
- **STATE CHANGE**: `SemanticDateDraft`
- **SUCCESS**: `exact` abre un `DatePickerSheet`; `month_year` pide mes + ano; `year` pide ano; `unknown` no pide nada
- **CANCEL**: cambiar de precision descarta el draft de la anterior
- **ERROR**: `Ingresá un año válido.` / `Elegí un mes.` / `Elegí una fecha completa.` / `Elegí una fecha válida.` en tres capas
- **RETURN CONTEXT**: formulario escrito
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el componente de 4 precisiones esta completo y bien validado, pero elegir `Fecha exacta` **rellena hoy a las 00:00 UTC sin avisar** que es un valor por defecto, y la fecha manual se guarda como `T00:00:00.000Z`. El usuario puede creer que registro la hora real

### PATH L-03 — Leer un recuerdo escrito
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: —
- **USER ACTION**: tap
- **NEXT SURFACE**: pagina escrita del Viewer
- **STATE CHANGE**: —
- **SUCCESS**: texto con scroll, fecha semantica y contexto
- **CANCEL**: —
- **ERROR**: no hay acceso binario, asi que no hay nada que falle
- **RETURN CONTEXT**: el llamador
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el scroll vertical choca con el pager horizontal y dispara el toggle de chrome con un simple `onTouchEnd`

### PATH L-04 — Copiar un recuerdo escrito
- **START CONTEXT**: `Notas` → Viewer
- **PRECONDITIONS**: —
- **USER ACTION**: `⋯` → `Copiar`
- **NEXT SURFACE**: el Viewer sigue abierto
- **STATE CHANGE**: portapapeles del sistema
- **SUCCESS**: `Copiado`
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: el Viewer
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio (en iOS `setString` no muestra confirmacion)
- **CURRENT STATUS**: `MISSING` — `Clipboard.setString` de RN core esta instalado; falta el helper y la accion

### PATH L-05 — Compartir un recuerdo escrito
- **START CONTEXT**: `Notas` → Viewer
- **PRECONDITIONS**: —
- **USER ACTION**: `⋯` → `Compartir`
- **NEXT SURFACE**: share sheet del sistema
- **STATE CHANGE**: —
- **SUCCESS**: `Share.share({message})`; el estado es honesto: `Compartido` != el destinatario lo recibio
- **CANCEL**: descartar el share sheet → sin cambios
- **ERROR**: —
- **RETURN CONTEXT**: el Viewer
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — `Share.share` de RN core ya tiene precedente en el repo; `expo-sharing` no sirve para texto porque exige URI de archivo local

### PATH L-06 — Compartir un binario (OS share)
- **START CONTEXT**: cualquiera → Viewer
- **PRECONDITIONS**: el Memory tiene `displayName`/`mimeType`/`sizeBytes` no nulos
- **USER ACTION**: `⋯` → `Compartir`
- **NEXT SURFACE**: share sheet del sistema
- **STATE CHANGE**: se descarga el original a `Paths.cache/HomeCloud/<safeFileName>` y se comparte el **archivo local**
- **SUCCESS**: `Compartido` (honesto)
- **CANCEL**: descartar → sin cambios
- **ERROR**: si `Sharing.isAvailableAsync()` es false, mensaje honesto y **sin accion falsa**
- **RETURN CONTEXT**: el Viewer
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `MISSING` — la costura completa existe en `homecloudDownloadService.ts` y esta probada en Files, pero **nunca se invoca desde Memories**, y tiene una **fuga probada**: escribe en `Paths.document/HomeCloud/` y nunca borra, lo que con videos es crecimiento no acotado del documento del usuario

---

## M. Info / Edit

### PATH M-01 — Abrir `Información del recuerdo`
- **START CONTEXT**: Viewer de 1 Memory, o seleccion
- **PRECONDITIONS**: —
- **USER ACTION**: `⋯` → `Información del recuerdo`
- **NEXT SURFACE**: hoja de Info
- **STATE CHANGE**: ninguna
- **SUCCESS**: fecha semantica, descripcion, albums, tipo, fecha de ingesta, miembro que agrego
- **CANCEL**: `Volver` → la superficie desde la que se abrio
- **ERROR**: —
- **RETURN CONTEXT**: el Viewer si se abrio desde ahi; el llamador si se abrio desde la seleccion
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — no existe la superficie. Ademas el menu `⋯` del Viewer no existe (H-04), asi que tampoco hay punto de entrada

### PATH M-02 — Distinguir "cuando ocurrio" de "cuando se agrego"
- **START CONTEXT**: hoja de Info
- **PRECONDITIONS**: —
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: **dos hechos distintos, dos labels distintos**: fecha semantica vs fecha de ingesta + miembro
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — los datos **existen** y se proyectan (`capturedAt/Year/Month/Precision`, `uploadedAt`, `uploadedByMemberId` en `homecloudMappers.js:62-97`; `lifecycle` y paths **nunca** se proyectan). Falta la superficie y los labels

### PATH M-03 — Editar la descripcion
- **START CONTEXT**: hoja de Info
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: editar el texto y guardar
- **NEXT SURFACE**: hoja de Info
- **STATE CHANGE**: `caption` actualizado
- **SUCCESS**: la descripcion nueva se ve en la tarjeta
- **CANCEL**: cerrar sin guardar → sin cambios
- **ERROR**: copy honesto; en un Memory **escrito** `caption` esta prohibido por el backend
- **RETURN CONTEXT**: el Viewer
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — no hay endpoint de update de memory

### PATH M-04 — Editar las membresias de album
- **START CONTEXT**: hoja de Info
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: agregar o quitar albums
- **NEXT SURFACE**: hoja de Info
- **STATE CHANGE**: filas de `homecloud_album_items` creadas o eliminadas
- **SUCCESS**: las membresias quedan como el usuario las dejo
- **CANCEL**: cerrar sin guardar → sin cambios
- **ERROR**: parcial con retry
- **RETURN CONTEXT**: el Viewer
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — las mutaciones existen (`addMemoryToAlbum` / `removeMemoryFromAlbum`) pero **no hay superficie de Info desde la que invocarlas para un solo Memory**. Ojo semantico: `Quitar del álbum` aca quita membresia, **no** manda a papelera; el copy debe ser inequivoco

### PATH M-05 — Identidad tecnica del Memory
- **START CONTEXT**: hoja de Info
- **PRECONDITIONS**: —
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: el usuario **no** ve `original_storage_path`, `preview_storage_path`, bucket, `intake_request_id` ni `lifecycle`
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: —
- **CURRENT STATUS**: `IMPLEMENTED` por construccion — el mapper nunca los proyecta. **Excepcion a corregir:** el endpoint `/access` **si** devuelve `bucket` y `path` al cliente, pese a que los comentarios del propio servicio afirman lo contrario

---

## N. Actions

### PATH N-01 — Abrir las acciones de seleccion
- **START CONTEXT**: seleccion activa en cualquier superficie
- **PRECONDITIONS**: `selectedCount > 0`; `!busy`
- **USER ACTION**: tap en `⋯`
- **NEXT SURFACE**: hoja `Acciones`
- **STATE CHANGE**: ninguna
- **SUCCESS**: acciones disponibles segun superficie, con conteo
- **CANCEL**: `Cancelar` → **no sale de la seleccion**
- **ERROR**: —
- **RETURN CONTEXT**: la superficie del llamador
- **PERMISSION**: segun la accion
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el header es `[X] N seleccionados [⋯]` con las acciones visibles **desde el primer fotograma**; no hay paso `✓` obligatorio. El unico `ActionSheet` reemplaza su contenido y nunca apila un segundo modal

### PATH N-02 — `Quitar del álbum` no aparece donde no aplica
- **START CONTEXT**: `root`, `type:<kind>`, `resurfacing:<group>`
- **PRECONDITIONS**: seleccion activa
- **USER ACTION**: abrir acciones
- **NEXT SURFACE**: hoja `Acciones`
- **STATE CHANGE**: —
- **SUCCESS**: la accion **no se renderiza**; solo aparece dentro de un Album
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — gate `canRemoveFromOpenAlbum = purposeKind==='removeFromAlbum' && purposeAlbumId!==null`. Decision de producto correcta

### PATH N-03 — `Compartir` en seleccion multiple
- **START CONTEXT**: seleccion con N >= 2
- **PRECONDITIONS**: —
- **USER ACTION**: abrir acciones
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: —
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: —
- **CURRENT STATUS**: `DEFERRED` — decision consciente, no un olvido. La costura OS SHARE comparte **un** archivo; N binarios exigirian N descargas, N temporales y una decision de UX (secuencial o no) que no esta congelada. En seleccion multiple solo se exponen acciones de organizacion y de ciclo de vida

### PATH N-04 — Acciones de album
- **START CONTEXT**: `⋯` de un tile o del overlay de Album
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: tap en `⋯`
- **NEXT SURFACE**: hoja de acciones del album
- **STATE CHANGE**: ninguna
- **SUCCESS**: `Agregar recuerdos`, `Renombrar álbum`, `Eliminar álbum` + copy obligatoria de supervivencia de Memories
- **CANCEL**: `X` → la superficie desde la que se abrio
- **ERROR**: `No pudimos eliminar el álbum.` con la hoja abierta
- **RETURN CONTEXT**: `root` o `album:<id>`
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la hoja existe y la copy de supervivencia se renderiza siempre (incluso sin `organize`); **falta el dialogo de confirmacion** del borrado

### PATH N-05 — Un solo host de acciones
- **START CONTEXT**: cualquier superficie que abra acciones
- **PRECONDITIONS**: —
- **USER ACTION**: abrir acciones → elegir destino → elegir album
- **NEXT SURFACE**: el picker **reemplaza** el contenido de la misma hoja
- **STATE CHANGE**: —
- **SUCCESS**: **nunca dos modales visibles a la vez**
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si, obligatorio (nested modals es un bug de plataforma en iOS)
- **CURRENT STATUS**: `IMPLEMENTED` — el Viewer **no** es un `Modal` (es un `View` absoluto), asi que abrir un `ActionSheet` desde el Viewer produce **un** modal, no dos. Regla a preservar cuando el Viewer pase a ser `Modal`

### PATH N-06 — Acciones del Viewer de un solo Memory
- **START CONTEXT**: Viewer
- **PRECONDITIONS**: —
- **USER ACTION**: `⋯`
- **NEXT SURFACE**: hoja de acciones
- **STATE CHANGE**: —
- **SUCCESS**: acciones segun fuente y `kind`
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: el Viewer
- **PERMISSION**: segun la accion
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — el menu no existe. Y al convertir el Viewer en `Modal` (H-02), la regla de un-solo-modal pasa a ser un riesgo real de plataforma, no una propiedad de la arquitectura

### PATH N-07 — Acciones de un grupo de resurfacing
- **START CONTEXT**: `resurfacing:<group>`
- **PRECONDITIONS**: —
- **USER ACTION**: `⋯`
- **NEXT SURFACE**: hoja de acciones del grupo
- **STATE CHANGE**: —
- **SUCCESS**: acciones de grupo
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: `resurfacing:<group>`
- **PERMISSION**: segun la accion
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — la superficie de resurfacing completa no existe

### PATH N-08 — Favoritos
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: —
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: —
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: —
- **CURRENT STATUS**: `DEFERRED` — decision §22 del Product Truth. No hay columna, no hay endpoint, no hay UI. **No se agrega al plan de V1**

---

## O. Lifecycle

### PATH O-01 — Mover a papelera desde el Viewer
- **START CONTEXT**: cualquiera → Viewer
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: `⋯` → `Mover a papelera`
- **NEXT SURFACE**: el Viewer, que avanza al siguiente item
- **STATE CHANGE**: `lifecycle ACTIVE → TRASHED` + `trashed_at` + `trashed_by_member_id`
- **SUCCESS**: `Movido a la papelera` + accion `Deshacer`; el item desaparece de su superficie
- **CANCEL**: `Deshacer` → restauracion completa
- **ERROR**: copy honesto; el Memory sigue donde estaba
- **RETURN CONTEXT**: el Viewer en el siguiente item, o `Missing` si era el ultimo
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — no existe endpoint, ni escritura de `lifecycle='trashed'`, ni accion. El schema ya lo soporta

### PATH O-02 — Mover a papelera desde la seleccion
- **START CONTEXT**: seleccion en cualquier superficie
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: `⋯` → `Mover a papelera` → confirmar
- **NEXT SURFACE**: la superficie del llamador
- **STATE CHANGE**: N Memories pasan a `TRASHED`
- **SUCCESS**: count honesto + `Deshacer`; los items salen de la superficie visible
- **CANCEL**: cancelar la confirmacion → nada cambia
- **ERROR**: parcial → se reporta cuantos y cuales fallaron; los exitosos **no** se revierten
- **RETURN CONTEXT**: la superficie del llamador
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING`

### PATH O-03 — `Deshacer` (Undo)
- **START CONTEXT**: feedback de `Mover a papelera`
- **PRECONDITIONS**: el Memory acaba de pasar a `TRASHED`
- **USER ACTION**: tap en `Deshacer`
- **NEXT SURFACE**: la superficie del llamador
- **STATE CHANGE**: `TRASHED → ACTIVE`, limpiando `trashed_at` y `trashed_by_member_id`
- **SUCCESS**: el Memory vuelve **con sus membresias de album**
- **CANCEL**: el plazo expira → el Memory queda en la papelera
- **ERROR**: si ya fue purgado → copy honesto `ya no está disponible`
- **RETURN CONTEXT**: la superficie del llamador
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si, obligatorio (el snackbar es el patron de Undo; hay que decidir y congelar el plazo)
- **CURRENT STATUS**: `MISSING`

### PATH O-04 — Permisos de ciclo de vida
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: —
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: `homecloud.delete` se exige en purge y en vaciar papelera
- **CANCEL**: —
- **ERROR**: 403 honesto
- **RETURN CONTEXT**: —
- **PERMISSION**: ver §26.2
- **DEVICE QA**: si
- **CURRENT STATUS**: `BROKEN` — `homecloud.delete` esta **declarada, proyectada al cliente y nunca exigida por ninguna ruta** (0 resultados de `homecloud.delete` en todo `backend/src`). El cliente recibe `delete: true` y no hay nada que gatear. Cualquiera con `contribute` podria borrar el contenido del hogar de forma definitiva

---

## P. Trash

### PATH P-01 — Ver la papelera
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay >= 1 Memory `TRASHED`
- **USER ACTION**: —
- **NEXT SURFACE**: superficie Papelera
- **STATE CHANGE**: ninguna
- **SUCCESS**: lista de los Memories trashed, con su fecha semantica
- **CANCEL**: n/a
- **ERROR**: `ErrorState` + `Reintentar`
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING`

### PATH P-02 — Papelera vacia
- **START CONTEXT**: `root`
- **PRECONDITIONS**: 0 Memories `TRASHED`
- **USER ACTION**: —
- **NEXT SURFACE**: **la superficie no se muestra**
- **STATE CHANGE**: ninguna
- **SUCCESS**: no hay seccion Papelera en la raiz; no hay un album vacio que se confunda con "no tienes recuerdos"
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING`

### PATH P-03 — Restaurar 1 Memory
- **START CONTEXT**: `trash`
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: seleccionar 1 → `⋯` → `Restaurar`
- **NEXT SURFACE**: Papelera
- **STATE CHANGE**: `TRASHED → ACTIVE`
- **SUCCESS**: `Restaurado`; el item sale de la papelera; **vuelve a su album si el album sigue existiendo**
- **CANCEL**: `Cancelar` → no sale de la seleccion
- **ERROR**: si ya fue purgado → copy honesto; si no, el item sigue en la papelera
- **RETURN CONTEXT**: `trash`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING`

### PATH P-04 — Restaurar N Memories
- **START CONTEXT**: `trash`
- **PRECONDITIONS**: `contribute = true`
- **USER ACTION**: seleccionar N → `⋯` → `Restaurar`
- **NEXT SURFACE**: Papelera
- **STATE CHANGE**: N pasan a `ACTIVE`
- **SUCCESS**: count honesto; los que siguen en album y los que no, silenciosamente
- **CANCEL**: —
- **ERROR**: parcial → se reporta cuantos y cuales
- **RETURN CONTEXT**: `trash`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING`

### PATH P-05 — Restaurar cuando el album previo fue eliminado
- **START CONTEXT**: `trash`
- **PRECONDITIONS**: el Memory estaba en un album que ya no existe
- **USER ACTION**: `Restaurar`
- **NEXT SURFACE**: Papelera
- **STATE CHANGE**: `TRASHED → ACTIVE`; la membresia huerfana no se recrea
- **SUCCESS**: restaurado **sin** esa membresia, sin error y sin mencion
- **CANCEL**: —
- **ERROR**: nunca "restaurar en una relacion inexistente"
- **RETURN CONTEXT**: `trash`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — el schema ya lo resuelve: `homecloud_album_items.album_id` tiene `ON DELETE CASCADE`, asi que al borrar el album la membresia desaparece sola y no hay relacion que recrear

### PATH P-06 — Borrado definitivo de 1
- **START CONTEXT**: `trash`
- **PRECONDITIONS**: **`homecloud.delete = true`**
- **USER ACTION**: seleccionar 1 → `⋯` → `Eliminar definitivamente` → confirmar
- **NEXT SURFACE**: Papelera
- **STATE CHANGE**: se borran fila, objetos de `homecloud-originals`, objetos de `homecloud-previews` y membresias
- **SUCCESS**: `Eliminado definitivamente`; el item desaparece
- **CANCEL**: `Cancelar` en el dialogo → nada cambia
- **ERROR**: si el borrado de storage falla → la operacion se reporta **fallida** y es reintentable; nunca se finge exito con bytes vivos
- **RETURN CONTEXT**: `trash`
- **PERMISSION**: **`homecloud.delete`**
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `MISSING`

### PATH P-07 — Borrado definitivo de N
- **START CONTEXT**: `trash`
- **PRECONDITIONS**: **`homecloud.delete = true`**
- **USER ACTION**: seleccionar N → `⋯` → `Eliminar definitivamente` → confirmar
- **NEXT SURFACE**: Papelera
- **STATE CHANGE**: N purgados
- **SUCCESS**: copy que dice **cuantos** se borraron
- **CANCEL**: —
- **ERROR**: parcial → se reporta cuantos y se **nombran** los que quedaron, con retry
- **RETURN CONTEXT**: `trash`
- **PERMISSION**: **`homecloud.delete`**
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `MISSING`

### PATH P-08 — Vaciar papelera
- **START CONTEXT**: `trash`
- **PRECONDITIONS**: **`homecloud.delete = true`**; hay >= 1 item
- **USER ACTION**: `Vaciar papelera` → confirmar
- **NEXT SURFACE**: `root` (la papelera desaparece al quedar vacia)
- **STATE CHANGE**: todos los `TRASHED` se purgan
- **SUCCESS**: `Papelera vacía`; la seccion desaparece de la raiz
- **CANCEL**: `Cancelar` → nada cambia
- **ERROR**: parcial → se reporta cuantos
- **RETURN CONTEXT**: `root`
- **PERMISSION**: **`homecloud.delete`**
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `MISSING`

### PATH P-09 — Un Memory trashed en un album
- **START CONTEXT**: `album:<id>`
- **PRECONDITIONS**: hay un Member `TRASHED`
- **USER ACTION**: —
- **NEXT SURFACE**: Album
- **STATE CHANGE**: la membresia **se preserva** pero es invisible
- **SUCCESS**: el album no lo muestra; el filtro de album excluye `lifecycle != 'active'` en SQL
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — la invisibilidad en album ya funciona (`getAlbumMemberships` filtra por `lifecycle='active'`), pero **el endpoint de trash no existe**, asi que nada llega a `TRASHED`

### PATH P-10 — Un Memory trashed en un Tipo
- **START CONTEXT**: `type:<kind>`
- **PRECONDITIONS**: hay un Member `TRASHED`
- **USER ACTION**: —
- **NEXT SURFACE**: Tipo
- **STATE CHANGE**: ninguna
- **SUCCESS**: no aparece; `listMemories` filtra `lifecycle='active'` en SQL, no post-filtrado
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: no
- **CURRENT STATUS**: `PARTIAL` — el filtro SQL ya es correcto; falta poder mover a `TRASHED`

### PATH P-11 — Un Memory trashed en resurfacing
- **START CONTEXT**: `resurfacing:<group>`
- **PRECONDITIONS**: —
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: excluido por la regla de elegibilidad (`lifecycle='ACTIVE'`), independiente de `hidden_from_resurfacing`
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: no
- **CURRENT STATUS**: `MISSING` (la superficie completa no existe)

### PATH P-12 — Acceder por signed URL a un Memory trashed
- **START CONTEXT**: cualquier superficie
- **PRECONDITIONS**: el Memory esta `TRASHED`
- **USER ACTION**: intentar cargar preview u original
- **NEXT SURFACE**: ninguna
- **STATE CHANGE**: —
- **SUCCESS**: **404**. Los bytes no son accesibles por signed URL mientras estan en la papelera
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — `homecloudStorageAccess.js:106-108` ya devuelve 404 cuando `lifecycle !== 'active'`. El mecanismo de seguridad ya existe; solo falta que algo escriba `TRASHED`

---

## Q. Resurfacing

### PATH Q-01 — Ver `Para volver a ver` con grupos
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay >= 1 Memory elegible
- **USER ACTION**: —
- **NEXT SURFACE**: banda de resurfacing, arriba de Albums
- **STATE CHANGE**: ninguna
- **SUCCESS**: grupos deterministas, del mas reciente al mas antiguo; cada grupo es de un solo anio
- **CANCEL**: n/a
- **ERROR**: si falla el calculo, la banda **no se muestra** y la raiz no se bloquea
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — no existe ninguna superficie. El campo `hidden_from_resurfacing` esta persistido, tipado y validado en backend, y **no lo lee ningun componente**

### PATH Q-02 — No hay grupos
- **START CONTEXT**: `root`
- **PRECONDITIONS**: 0 Memories elegibles
- **USER ACTION**: —
- **NEXT SURFACE**: `root`
- **STATE CHANGE**: ninguna
- **SUCCESS**: **la banda no se muestra**. No es un vacio, no es un error, no es un boton deshabilitado
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING`

### PATH Q-03 — Abrir un grupo
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay un grupo
- **USER ACTION**: tap en el grupo
- **NEXT SURFACE**: `resurfacing:<group>`
- **STATE CHANGE**: `activeCollectionId`-equivalente del grupo
- **SUCCESS**: SectionList con solo los Members del grupo
- **CANCEL**: `X` → `root`
- **ERROR**: —
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING`

### PATH Q-04 — Abrir un Memory desde un grupo
- **START CONTEXT**: `resurfacing:<group>` → Viewer
- **PRECONDITIONS**: —
- **USER ACTION**: tap
- **NEXT SURFACE**: Viewer
- **STATE CHANGE**: `viewer.source = {kind:'resurfacing', sourceId: group}`
- **SUCCESS**: el shell aparece de inmediato; el pager recorre **solo ese grupo**
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: **`resurfacing:<group>`**. Nunca `root`
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `MISSING` — requiere una cuarta `viewer` factory y una extension del union `MemoryViewerSourceKind`

### PATH Q-05 — Seleccionar dentro de un grupo
- **START CONTEXT**: `resurfacing:<group>`
- **PRECONDITIONS**: —
- **USER ACTION**: long press
- **NEXT SURFACE**: seleccion contextual
- **STATE CHANGE**: `mode='selecting'`
- **SUCCESS**: **el dataset sigue siendo el del grupo**
- **CANCEL**: `X` → `resurfacing:<group>`
- **ERROR**: —
- **RETURN CONTEXT**: **`resurfacing:<group>`**
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING`

### PATH Q-06 — `No mostrar este recuerdo acá`
- **START CONTEXT**: Viewer, seleccion, o grupo de resurfacing
- **PRECONDITIONS**: `organize = true`
- **USER ACTION**: `⋯` → `No mostrar este recuerdo acá`
- **NEXT SURFACE**: la superficie del llamador
- **STATE CHANGE**: `hidden_from_resurfacing = true`
- **SUCCESS**: `No se mostrará en Para volver a ver`; el Memory **sigue en Timeline, en su album y en su tipo**
- **CANCEL**: —
- **ERROR**: copy honesto
- **RETURN CONTEXT**: la superficie del llamador
- **PERMISSION**: `homecloud.organize`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — el campo existe en schema (`boolean NOT NULL DEFAULT false`), el backend lo valida (400 si no es boolean, prohibido `true` para `role='file'`), el mapper lo proyecta... y **el cliente lo escribe hardcodeado en `false` para escritos y no tiene ninguna UI**. Confundir este campo con "Memory privado" seria un error de producto (§62)

### PATH Q-07 — Elegibilidad por precision
- **START CONTEXT**: `root`
- **PRECONDITIONS**: hay Memories `exact`, `month_year`, `year` y `unknown`
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: —
- **SUCCESS**: **solo `exact` y con fecha anterior a hoy participa.** `month_year`, `year` y `unknown` quedan fuera del resurfacing por fecha exacta. No existe resurfacing mensual ni por mes y ano
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — pero la consecuencia es importante y ya es verificable: como los videos de galeria y el audio importado resuelven **siempre** `unknown`, **nunca aparecerian en resurfacing**. Eso es correcto y honesto, y se resuelve con la correccion de fecha (D-06, D-07), no con una heuristica

### PATH Q-08 — Una fecha parcial, corregida a `exact`, pasa a ser elegible
- **START CONTEXT**: `root` (banda de resurfacing), con Memories `exact`, `month_year`, `year` y `unknown` presentes
- **PRECONDITIONS**: hay al menos un Memory elegible y al menos uno con precision parcial
- **USER ACTION**: en `Informacion del recuerdo` (o en el review de intake), elegir **explicitamente** una fecha exacta con dia para uno de los parciales
- **NEXT SURFACE**: la misma hoja de edicion; luego `root` en la siguiente lectura
- **STATE CHANGE**: ese Memory pasa a `capture_precision = 'exact'`; **no hay ninguna otra escritura**: sin columna de evaluacion, sin cache, sin job, sin tabla de historial
- **SUCCESS**: el Memory corregido **aparece** en `Para volver a ver` sin que el usuario vuelva a hacer nada. Si el usuario lo vuelve a dejar parcial o en `Sin fecha`, **desaparece** de nuevo. La elegibilidad se evalua en cada lectura con una sola funcion
- **CANCEL**: cerrar sin guardar → no hay cambio de precision, la evaluacion no cambia
- **ERROR**: copy honesto de la validacion de fecha; la precision anterior se conserva
- **RETURN CONTEXT**: el llamador de la edicion
- **PERMISSION**: `homecloud.organize` para editar; `homecloud.view` para ver la banda
- **DEVICE QA**: si, obligatorio (es el cruce de DATE-04 y resurfacing; ninguna fuente lo demuestra)
- **CURRENT STATUS**: `MISSING` — depende de D-07 (o D-06) + la banda de Q-01. Se implementa con las **mismas** validaciones de fecha semantica existentes y la misma logica de lectura de resurfacing. **No se crea un segundo sistema de fechas ni un motor de resurfacing paralelo**

### PATH Q-09 — No existe resurfacing mensual
- **START CONTEXT**: `root`, con Memories `month_year` y/o `year` presentes y al menos un `exact` elegible
- **PRECONDITIONS**: hay Memories con precision parcial
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: ninguna
- **SUCCESS**: **no existe ningun grupo `Octubre 2023 — hace 3 años`**, ni `este mes de hace N años`, ni ninguna banda derivada de `month_year` o `year`. La unica banda es la de grupos por dia+mes exactos (Q-01). Los Memories parciales siguen visibles en su seccion `Sin fecha` / `2023` del Timeline, que es un grouping distinto y no un resurfacing
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: si (verificacion negativa: que la banda no aparezca con datos parciales)
- **CURRENT STATUS**: `IMPLEMENTED` (por decision) — no hay superficie de resurfacing, asi que la regla se cumple vacio. Queda **congelada**: no se abre como gap faltante ni se diseña en V1. La unica forma de que un Memory parcial llegue a la banda es D-05b / Q-08

---

## R. Upload

### PATH R-01 — Enviar un recuerdo y esperar
- **START CONTEXT**: review binario
- **PRECONDITIONS**: 1 draft valido
- **USER ACTION**: `Guardar recuerdo`
- **NEXT SURFACE**: el review con estado de envio
- **STATE CHANGE**: `pending → registering → registered → uploading → verifying → finalizing → completed`
- **SUCCESS**: `lifecycle='active'`; `onComplete` → `refresh()`; el Memory aparece en Timeline
- **CANCEL**: deshabilitado durante el envio
- **ERROR**: `failed`; si `error.retryable`, reintento automatico; si no, `Reintentar`
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — resume **verify-first**: si el estado es `uploading` y ya hay `contentId`, pregunta `/verify`; si `verified===true` salta a `verifying` sin volver a subir; un error **terminal** nunca se convierte en "re-subir"

### PATH R-02 — Salir de la pantalla durante la subida
- **START CONTEXT**: review binario con envio activo
- **PRECONDITIONS**: hay 1 job activo
- **USER ACTION**: cerrar la hoja / navegar fuera
- **NEXT SURFACE**: `root` (u otra pantalla)
- **STATE CHANGE**: el job **sigue vivo**
- **SUCCESS**: la subida **no se interrumpe**; la banda global la refleja
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: la superficie desde la que se salio
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `IMPLEMENTED` — `closeReview` **no** borra el artefacto si `hasActiveJob()`; `dismiss()` limpia la UI sin cancelar nada. El coordinador es process-wide y el pump sigue

### PATH R-03 — Fallo de subida y retry
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: hay 1 job `failed`
- **USER ACTION**: `Reintentar`
- **NEXT SURFACE**: n/a
- **STATE CHANGE**: `failed → uploading` (o `→ registering` si no hay `contentId`)
- **SUCCESS**: el job se reanuda desde su punto correcto, **no desde cero**
- **CANCEL**: `Cancelar` marca `cancelled`
- **ERROR**: si falla de nuevo, `failed` otra vez; **nunca** auto-loop sobre fallos transitorios (el pump corta)
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — `isAutoRecoverableJob` solo auto-reanuda si esta mid-flight **o** si `failed && error.retryable === true`, para que un fallo terminal nunca se reintente en cada arranque

### PATH R-04 — Cancelar una subida
- **START CONTEXT**: banda de actividad
- **PRECONDITIONS**: hay 1 job activo
- **USER ACTION**: `Cancelar`
- **NEXT SURFACE**: n/a
- **STATE CHANGE**: aborta la transferencia nativa; `transition(job,'cancelled')`; persiste; limpia el artefacto
- **SUCCESS**: el job es terminal; no reaparece
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el cancel del **coordinador** funciona y esta cableado en la banda. Pero `homecloudMemoryIntakeService.cancel()` existe, se exporta, y **ninguna UI de intake lo invoca** ⇒ `status:'cancelled'` es inalcanzable desde la propia superficie de intake

### PATH R-05 — Reinicio de la app con subidas pendientes
- **START CONTEXT**: app recien abierta
- **PRECONDITIONS**: hay jobs no terminales en almacenamiento local
- **USER ACTION**: abrir la app
- **NEXT SURFACE**: n/a
- **STATE CHANGE**: hidratacion + sweep de huerfanos + pasada de recuperacion
- **SUCCESS**: los jobs se reanudan
- **CANCEL**: —
- **ERROR**: **offline no quema jobs**: `recover_skipped_offline`; al volver online hay una unica pasada `reconnect`
- **RETURN CONTEXT**: n/a
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `IMPLEMENTED` — el runtime es propiedad de `HomeCloudUploadRuntimeOwner` en `AppNavigator`, **no** requiere ninguna pantalla de HomeCloud montada; hay single-flight por scope `householdId::role`; y el sweep de huerfanos borra solo carpetas de filesystem local de mas de 24h sin job vivo

### PATH R-06 — Un Memory en staging no se presenta como compartido
- **START CONTEXT**: cualquiera
- **PRECONDITIONS**: hay un Memory en `staging`
- **USER ACTION**: —
- **NEXT SURFACE**: Timeline, Tipo, Album
- **STATE CHANGE**: —
- **SUCCESS**: **no aparece en ningun lado**; `listMemories` filtra `lifecycle='active'` en SQL
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: `homecloud.view`
- **DEVICE QA**: no
- **CURRENT STATUS**: `IMPLEMENTED` — y hay un indice parcial `(household_id, captured_at) WHERE role='memory'` que **no** filtra por lifecycle, pero la predicacion SQL si lo hace

### PATH R-07 — Filas en staging abandonadas
- **START CONTEXT**: servidor
- **PRECONDITIONS**: un `register` que nunca llega a `finalize`
- **USER ACTION**: —
- **NEXT SURFACE**: —
- **STATE CHANGE**: una fila `staging` permanente e invisible
- **SUCCESS**: —
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: no (requiere inspeccion de DB)
- **CURRENT STATUS**: `BROKEN` — **nada en el backend barre filas `staging`**. No hay cron, no hay Edge Function; `grep 'orphan'` en `backend/src` da 0 resultados. El unico sweep del repo es de filesystem local. Un `verify` fallido deja la fila en staging **permanentemente** (409 `homecloud_verify_failed`), y solo se limpia por el delete compensatorio si fallo la insercion de la membresia de album inicial. Es deuda de backend que V1 debe reconocer, no un hueco de UI

---

## S. Camera

### PATH S-01 — Camera con permiso desconocido
- **START CONTEXT**: `intake`
- **PRECONDITIONS**: `permission === null`
- **USER ACTION**: —
- **NEXT SURFACE**: `camera`
- **STATE CHANGE**: ninguna
- **SUCCESS**: `ActivityIndicator`. No un error, no un "permiso denegado"
- **CANCEL**: `Volver` → `root`
- **ERROR**: —
- **RETURN CONTEXT**: `intake` o `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED`

### PATH S-02 — Camera con permiso denegado (se puede repreguntar)
- **START CONTEXT**: `camera`
- **PRECONDITIONS**: `!granted && canAskAgain`
- **USER ACTION**: —
- **NEXT SURFACE**: `camera`
- **STATE CHANGE**: ninguna
- **SUCCESS**: copy explicito + `Permitir cámara` + `Volver`
- **CANCEL**: `Volver` → `intake`
- **ERROR**: —
- **RETURN CONTEXT**: `intake`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `IMPLEMENTED`

### PATH S-03 — Camera con permiso denegado permanentemente
- **START CONTEXT**: `camera`
- **PRECONDITIONS**: `!granted && !canAskAgain`
- **USER ACTION**: —
- **NEXT SURFACE**: `camera`
- **STATE CHANGE**: ninguna
- **SUCCESS**: `Abrir configuración` (`Linking.openSettings()`) + `Volver`
- **CANCEL**: `Volver`
- **ERROR**: —
- **RETURN CONTEXT**: `intake`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `IMPLEMENTED`

### PATH S-04 — Sacar una foto
- **START CONTEXT**: `camera` con permiso concedido
- **PRECONDITIONS**: `mode='picture'`
- **USER ACTION**: shutter
- **NEXT SURFACE**: review de captura
- **STATE CHANGE**: `capturedAt` fijado; se sondea el formato real de los bytes
- **SUCCESS**: `Usar foto` → review de intake; `Repetir` → vuelve al shutter
- **CANCEL**: `X` → descarta el artefacto temporal
- **ERROR**: `No pudimos sacar la foto. Probá de nuevo.`; `No pudimos preparar la captura. Podés reintentar.` → vuelve a `captured`
- **RETURN CONTEXT**: review de intake
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `IMPLEMENTED` — el MIME y la extension se resuelven leyendo los **primeros 32 bytes**, no por la extension declarada, y `throw` si no se puede determinar

### PATH S-05 — Grabar un video
- **START CONTEXT**: `camera`
- **PRECONDITIONS**: `mode='video'`; permiso de microfono
- **USER ACTION**: shutter para empezar → shutter para detener
- **NEXT SURFACE**: review de captura con `MemoryVideoPreview`
- **STATE CHANGE**: `capturedAt` fijado al inicio; grabacion en vuelo
- **SUCCESS**: `Usar video` → review de intake
- **CANCEL**: `Repetir` → descarta
- **ERROR**: microfono denegado → `HomePlus necesita acceso al micrófono para grabar video.` + `Reintentar`; `No pudimos grabar el video. Probá de nuevo.`
- **RETURN CONTEXT**: review de intake
- **PERMISSION**: `homecloud.contribute` + microfono
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `IMPLEMENTED` — hay un `recordGate` y locks para evitar doble inicio; el microfono se pide de forma perezosa solo al iniciar video

### PATH S-06 — Salir de la app durante una grabacion de video
- **START CONTEXT**: `camera` grabando
- **PRECONDITIONS**: la app pasa a background
- **USER ACTION**: —
- **NEXT SURFACE**: `camera` en `ready`
- **STATE CHANGE**: invalidar, detener, volver a `ready`
- **SUCCESS**: no queda una grabacion huerfana
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: `camera`
- **PERMISSION**: —
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `IMPLEMENTED`

### PATH S-07 — La salida de Camera entra al pipeline de intake
- **START CONTEXT**: review de captura
- **PRECONDITIONS**: `Usar foto` / `Usar video` pulsado
- **USER ACTION**: —
- **NEXT SURFACE**: review binario de intake
- **STATE CHANGE**: `setBinaryDraft` con el **mismo** shape que la importacion
- **SUCCESS**: **un solo `submitBinary`, un solo review, una sola subida.** El album y la descripcion se preguntan en el review, no en la camara
- **CANCEL**: `Volver` → `intake`
- **ERROR**: —
- **RETURN CONTEXT**: review de intake
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — la unica divergencia es `source:'camera'`. Correcto por producto (§48)

### PATH S-08 — Guardar una captura de camera
- **START CONTEXT**: review de intake
- **PRECONDITIONS**: album opcional, descripcion opcional
- **USER ACTION**: `Guardar recuerdo`
- **NEXT SURFACE**: review con envio
- **STATE CHANGE**: identico a C-06
- **SUCCESS**: el Memory aparece en Timeline con la fecha **real de captura**, no de importacion
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: `root`
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED`

### PATH S-09 — Volver desde Camera
- **START CONTEXT**: `camera` o review de captura
- **PRECONDITIONS**: —
- **USER ACTION**: `Volver` / `X`
- **NEXT SURFACE**: **la raiz de Memories**
- **STATE CHANGE**: ninguna; los artefactos temporales se borran
- **SUCCESS**: `root`, sin cambios en los datos
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: **`root`** — no a una superficie arbitraria "anterior"
- **PERMISSION**: `homecloud.contribute`
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — hay un handoff invisible y fragil (`audio-handoff` es un estado de hoja **sin JSX**; la transicion real ocurre en un `useEffect` que setea dos estados en el mismo tick) y `openCamera` **no** llama `reloadDestinations()`, a diferencia de `openCreate` y `openWritten`, por lo que la lista de albums del review puede estar mas vieja que en el resto de la app

---

## T. Permissions / Household switching

### PATH T-01 — Ver Memories sin `view`
- **START CONTEXT**: HomeCloud
- **PRECONDITIONS**: `homecloud.view = false`
- **USER ACTION**: —
- **NEXT SURFACE**: notice de capabilities
- **STATE CHANGE**: ninguna
- **SUCCESS**: `ErrorState` con `Reintentar`; **no** se muestra un vacio
- **CANCEL**: —
- **ERROR**: 403 honesto
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `IMPLEMENTED` — el notice de capabilities esta sobre ambos panes con su propio retry

### PATH T-02 — Un rol sin `organize` en la raiz
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `organize = false` (adolescent, child, guest)
- **USER ACTION**: —
- **NEXT SURFACE**: MemoriesRoot
- **STATE CHANGE**: ninguna
- **SUCCESS**: **no hay tile de crear album, ni `+ Nuevo` en el header, ni `⋯` de album, ni acciones de organizacion en la seleccion.** El hogar puede ver y consumir, no organizar
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el gate del header y del CTA del album vacio funciona; **el gate de las acciones de organizacion dentro de la hoja de seleccion depende de `canOrganize` y esta cableado**, pero hay que verificar en dispositivo que no queden acciones de organizacion accesibles por otra via

### PATH T-03 — Un rol sin `contribute`
- **START CONTEXT**: `root`
- **PRECONDITIONS**: `contribute = false` (child, guest)
- **USER ACTION**: —
- **NEXT SURFACE**: MemoriesRoot
- **STATE CHANGE**: ninguna
- **SUCCESS**: **no hay `+`**, ni grabador, ni camara, ni formulario escrito, ni `Mover a papelera`, ni `Restaurar`
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `PARTIAL` — el trigger del `+` se monta solo si hay token + household y se deshabilita por capability; **el resto de las superficies de intake y las acciones de ciclo de vida no existen todavia**, as que su gate no se puede evaluar

### PATH T-04 — Un rol sin `delete`
- **START CONTEXT**: `trash`
- **PRECONDITIONS**: `delete = false`
- **USER ACTION**: —
- **NEXT SURFACE**: Papelera
- **STATE CHANGE**: —
- **SUCCESS**: **no se renderizan `Eliminar definitivamente` ni `Vaciar papelera`.** No se renderizan deshabilitados
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: —
- **PERMISSION**: —
- **DEVICE QA**: si
- **CURRENT STATUS**: `MISSING` — la accion no existe, y `delete` no se exige en ninguna ruta

### PATH T-05 — Cambiar de household con un draft de intake abierto
- **START CONTEXT**: `intake` con draft
- **PRECONDITIONS**: hay >= 2 hogares
- **USER ACTION**: cambiar de household
- **NEXT SURFACE**: `root` del hogar nuevo
- **STATE CHANGE**: el draft se descarta; los jobs en vuelo se reconcilian con su propio `householdId`
- **SUCCESS**: **nada del hogar anterior queda visible.** La reconciliacion al completar un job usa el `householdId` **del job**, no el actual
- **CANCEL**: —
- **ERROR**: —
- **RETURN CONTEXT**: `root` del hogar nuevo
- **PERMISSION**: —
- **DEVICE QA**: si, obligatorio
- **CURRENT STATUS**: `PARTIAL` — el runtime es por household y la reconciliacion usa el household del job, lo cual es correcto; falta verificar que el draft de intake y el Viewer se descarten (el reset de household limpia `viewer` y seleccion, pero el estado del intake vive en `MemoryIntake`, montado dentro de la pantalla, asi que se desmonta con ella)

---

## Cobertura de la matriz

| Dominio | Paths | Estados cubiertos |
| --- | --- | --- |
| A. Root | 10 | primera entrada, datos, vacio, refresh, household, tab global, 3 retornos, upload pendiente |
| B. Create | 10 | menu de 5 acciones, gates de permiso y de seleccion, 3 modos, `Importar audio` de primer nivel, `Grabar audio` de primer nivel, audio no atajo de galeria, convergencia de los dos caminos de audio |
| C. Import | 8 | 1 imagen, 1 video, N imagenes, lote mixto, audio, guardar, preview fail, falla parcial |
| D. Date | 10 | 6 fuentes, completar `partial → exact`, correccion en intake, correccion post-guardado, correccion en lote, grupo `Sin fecha` |
| E. Albums | 12 | riel 0/1/N, crear, abrir, vacio, renombrar, eliminar, agregar, quitar, quitar 1 desde Viewer, `Agregar a otro album` |
| F. Types | 5 | fila, abrir, vacio, seleccion, pager |
| G. Selection | 8 | entrar desde 5 llamadores, D4, agregar, crear album, quitar, 0 seleccionados |
| H. Viewer common | 8 | apertura exacta, inmersividad, cerrar, acciones, fuente, append, back Android, background |
| I. Image | 6 | abrir, zoom, pan, reset, doble toque, carga infinita |
| J. Video | 6 | shell, P1, reproducir, fullscreen, pagina inactiva, codec |
| K. Audio | 7 | abrir, abrir audio importado con el mismo visor, seek, +/-10, velocidad, waveform, background |
| L. Written | 6 | crear, precision, leer, copiar, compartir texto, compartir binario |
| M. Info/Edit | 5 | abrir, las dos fechas, descripcion, membresias, identidad tecnica |
| N. Actions | 8 | seleccion, gates, compartir multi, album, un-solo-host, Viewer, resurfacing, favoritos |
| O. Lifecycle | 4 | trash desde Viewer, trash desde seleccion, undo, permisos |
| P. Trash | 12 | ver, vacia, restaurar 1/N, restaurar sin album, purge 1/N, vaciar, en album/tipo/resurfacing, signed URL |
| Q. Resurfacing | 9 | con grupos, sin grupos, abrir grupo, abrir Memory, seleccionar, ocultar, elegibilidad por precision, parcial corregido a `exact`, ausencia de resurfacing mensual |
| R. Upload | 7 | enviar, salir, retry, cancelar, reinicio, staging, filas huerfanas |
| S. Camera | 9 | 3 estados de permiso, foto, video, background, handoff, guardar, retorno |
| T. Permissions | 5 | sin view, sin organize, sin contribute, sin delete, cambio de household con draft |
| **TOTAL** | **155** | |