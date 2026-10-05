# HOMECLOUD MEMORIES — FINAL PRODUCT TRUTH

```
STATUS:        HOMECLOUD_MEMORIES_FINAL_PRODUCT_TRUTH
AUTHORITY:     ESTE DOCUMENTO (Producto final V1)
SOURCE:        Donor research + HC2-C freezes + forense CURRENT + observaciones fisicas P1-P9
SCOPE:         Definicion de producto y contratos de TODA accion significativa
NO IMPLEMENTA: Esta sesion NO escribe codigo de producto y NO produce el plan de implementacion
```

Jerarquia de autoridad aplicada (prompt §2):

1. Decisiones explicitas del prompt de esta sesion.
2. Observaciones fisicas del usuario (P1-P9).
3. HomeCloud / Memories Product Truth mas reciente y compatible.
4. Donor research como evidencia de diseno, NUNCA como autoridad automatica.
5. Implementacion actual.
6. Tests.

Un test verde NO sobreescribe un bug observado en un iPhone fisico.

**Revision de producto aplicada 2026-10-05 (patch de audio).** Esta version incorpora las
dos ultimas decisiones explicitas de producto:

1. **`Importar audio` es IN V1 como accion de primer nivel** y el menu del `+` pasa de
   **4 items a 5**, planos y sin submenu (§4.1.1). El camino congelado de `Importar audio`
   esta en §4.1.2; el de `Grabar audio`, en §4.1.3. La distincion intake de audio esta en
   §6.4; la regla de `Sin fecha` corregible del audio importado, en §6.5; las piezas que
   **no** se pueden borrar, en §6.6.
2. **Resurfacing sigue siendo EXACT-ONLY** y no hay resurfacing mensual (§21.3.1). Una
   fecha parcial se vuelve `exact` **solo** por correccion explicita del usuario (§7.3.1,
   §21.3.2). No existe ninguna conversion automatica y no se prohibe ningun dia sintetico.

Las decisiones anteriores que estas dos sustituyen quedan marcadas como **SUPERSEDED** en el
punto exacto donde aparecem, no borradas, para que la historia siga siendo legible.

---

## 1. Product Definition

**HomeCloud Memories es la HISTORIA COMPARTIDA DEL HOGAR.**

No es:

- una red social
- un editor multimedia profesional
- una galeria de IA
- una boveda privada
- un sistema de archivos disfrazado de fotos

Sus seis trabajos nuclearres son:

| Trabajo | Significado | Capacidad que lo sirve |
| --- | --- | --- |
| **GUARDAR** | Que nada del hogar se pierda | Intake, Camera, Audio, Written Memory |
| **ENTENDER AUTOMATICAMENTE** | Que HomeCloud sepa cuando ocurrio, sin que el usuario complete datos tecnicos | Semantic Date, Types |
| **ORGANIZAR** | Que el hogar pueda agrupar sin destruir contenido | Albums |
| **CONSUMIR** | Que ver y escuchar sea inmediato y predecible | Viewer, Image, Video, Audio, Written |
| **RECUPERAR** | Que un error del hogar sea reversible | Lifecycle: Trash / Undo / Restore / Purge |
| **REDESCUBRIR** | Que un recuerdo vuelva cuando corresponde | Resurfacing: Para volver a ver |

Regla existencial:

> Un Memory existe porque: "Lo guardo porque algun dia voy a querer volver a esto."

**La prueba de pertenencia a HomeCloud.** Una capacidad pertenece a Memories solo si responde
"el hogar compartido lo necesita para no perder, entender, organizar, mirar, recuperar o
redescubrir su historia". Si una capacidad solo tiene valor personal o profesional, es OUT
de Memories V1 aunque Apple, Google o Immich la tengan.

---

## 2. Explicit In / Out / Deferred

### 2.1 IN

| Capacidad | Decision |
| --- | --- |
| Create / import (multiples modos) | IN |
| Tipos automaticos: Fotos, Videos, Audios, Notas | IN |
| Timeline agrupado por tiempo | IN |
| Albums (crear, renombrar, agregar, quitar, eliminar) | IN |
| Crear Album desde Memories seleccionados | IN |
| Seleccion contextual que preserva contexto de llamador | IN |
| Viewer inmersivo (shell, pager por fuente) | IN |
| Image Viewer (fit, zoom, pan) | IN |
| Video Viewer basico (poster, play/pause, scrub, fullscreen) | IN |
| Audio Viewer (identidad, play/pause, seek, tiempo, duracion, +/-10, velocidad) | IN |
| Written Memory | IN |
| Memory Information / Edicion de metadata | IN |
| Acciones contextuales (una sola gramatica) | IN |
| Lifecycle: Move to Trash, Undo, Restore, Purge | IN |
| Trash surface con restore y purge | IN |
| Resurfacing deterministico "Para volver a ver" | IN |
| Ocultar de resurfacing ("No mostrar este recuerdo aca") | IN |
| Camera como fuente de intake | IN |
| **`Importar audio` como accion de primer nivel de Create** | **IN** (§4.1.1, §6.4) |
| **`Grabar audio` como accion de primer nivel de Create** | **IN** (§4.1.1, §6.4) |

### 2.2 OUT (no re-discutir sin contradiccion real)

| Capacidad | Decision | Motivo |
| --- | --- | --- |
| **Search en Memories** | **OUT** | Los Memories ya se agrupan por tiempo, tipo y album. La busqueda de texto sobre Memories es una correccion para bibliotecas Mas grandes de las que maneja un hogar. Ver §10 de esta tabla. |
| Archive | OUT | El hogar no archiva: o esta activo o esta en la papelera. Un tercer estado es ambiguedad. |
| Hidden / Private Memories | OUT | Memories es compartido por diseno de producto. Lo privado contradice §1. |
| Album Trash | OUT | Album es organizacion, Memory es contenido. Ver §10.2. |
| People / Pets / Faces | OUT | Requiere reconocimiento facial. |
| Places UI / Map | OUT | Requiere geolocalizacion y UI de mapa. |
| Face / Object recognition | OUT | ML. |
| OCR | OUT | ML. |
| AI tagging | OUT | ML. |
| AI semantic search | OUT | ML. |
| Busqueda semantica por IA | OUT | ML. |
| Social feed, likes, comentarios, seguidores | OUT | No es red social (§1). |
| Edicion profesional (crop, filtros, recorte,collage, memory movie) | OUT | Memories no es editor. |
| Favoritos | **DEFER** | Ver §22. |
| Album folders / album de albumes | OUT | Un solo nivel. |
| Sincronizacion en background de audio/video | OUT | Ver §16.4. |
| Doble toque para zoom en imagen | **DEFER** | Ver §14.6. |
| Reproduccion en background | OUT | Ver §16.4. |
| Ocultar un GRUPO de resurfacing (rango de fechas) | OUT (V1) | Requiere modelo de datos que no existe. Ver §21.6. |
| **Resurfacing mensual / por `month_year`** | **OUT de V1, decision congelada** | "Este dia" requiere dia. Ver §21.3.1. |
| **Resurfacing por `year` o por `unknown`** | **OUT de V1, decision congelada** | Ver §21.3.1. |
| **Submenu `Audio >` en el menu del `+`** | **OUT de V1, decision congelada** | `Importar audio` y `Grabar audio` son acciones planas de primer nivel. Ver §4.1.1. |
| **Conversion automatica de una fecha parcial a `exact`** | **PROHIBIDO** | Solo por correccion explicita del usuario. Ver §7.3.1. |

### 2.3 EXISTING_UNUSED_CAPABILITY (declarado, no expuesto, no borrado)

| Capacidad | Donde existe | Decision |
| --- | --- | --- |
| Backend Memories search (`GET /memories?query=` → `ILIKE` sobre caption / written_text / display_name) | `backend/src/services/homecloudReadService.js:695-699`; cliente `homecloudReadService.ts:459` | **OUT de V1.** No se expone UI. No se elimina. Reconsiderable. |
| Indexacion de busqueda en DB | **NO EXISTE** (sin tsvector, sin GIN, sin trigram) | No es capacidad. Verificar antes de cualquier Searching futuro. |
| `expo-audio` muestreo de audio (`useAudioSampleListener`, `isAudioSamplingSupported`) | `node_modules/expo-audio/src/ExpoAudio.ts:238,240` | Candidato IN condicionado a device QA. Ver §16.3. |
| Capacidad `homecloud.delete` |Declarada, proyectada al cliente, **nunca exigida** por ninguna ruta | Se activa con Lifecycle. Ver §26. |
| Columnas `homecloud_contents.trashed_at` / `trashed_by_member_id` | Ya en schema con CHECK de consistencia | Se activan con Lifecycle. Ver §19. |
| Columnas `homecloud_albums.trashed_at` / `lifecycle='trashed'` | Ya en schema | **Permanecen sin uso por decision** (§10.2). |
| `hidden_from_resurfacing` | Ya en schema, validado en backend, sin UI | Se activa con Resurfacing. Ver §21.5. |
| `homecloud.delete` matrix por rol | `backend/src/lib/householdPermissions.js:85-92` + SQL `:102-109` | Se activa con Lifecycle. |

---

## 3. Global IA

### 3.1 Jerarquia congelada

```
HomeCloud  (global, no se toca)
  └─ Archivos | Recuerdos            <- SegmentedControl GLOBAL, se mantiene
     └─ MemoriesRoot  (UN scroll vertical, UNA sola IA)
        ├─ titleRow:  "Recuerdos"  [+]
        ├─ "Para volver a ver"        <- Resurfacing (§21), condicional
        ├─ "Álbumes"                  <- riel horizontal (§10)
        ├─ "Tipos"                    <- riel horizontal: Fotos Videos Audios Notas (§11)
        └─ Timeline                   <- SectionList agrupado por tiempo (§9)
```

Prohibido para siempre: la navegacion interna `Recuerdos | Colecciones`.
No existe, no debe volver, y ningun test debe exigirla.
`MemorySelectionSource`, `MemorySelectionSourceTab`, `switchTab`, `collectionsRoot` y
`MEMORY_SELECTION_SOURCE_COLLECTIONS_ROOT` quedan **prohibidos por contrato**.

### 3.2 Create vive en la raiz

`+` esta en `titleRow`, extremo derecho, hit area >= 44x44, sin circulo visible.
Una galeria sin ruta visible para agregar recuerdos esta incompleta.
`CREATE = IN` (§8.2 del prompt). El `+` desaparece unicamente durante una sesion de seleccion
o cuando `capabilities.contribute` es falso.

### 3.3 Orden y visibilidad congelados

| Region | Sticky | Se oculta durante overlay | Se oculta durante seleccion |
| --- | --- | --- | --- |
| `Archivos \| Recuerdos` | n/a (fuera de Memories) | si | si |
| `titleRow` + `+` | no | si | **si** (se reemplaza por el header de seleccion) |
| `Para volver a ver` | no | si | si |
| `Álbumes` | no | si | **NO** (debe permanecer) |
| `Tipos` | no | si | **NO** (debe permanecer) |
| `Timeline` | `stickySectionHeadersEnabled=false` | si | no (cambia el dataset, ver §12.2) |
| Navbar inferior global | fuera de Memories | **debe ocultarse en Viewer** | visible |

### 3.4 Restore de scroll

- Un offset persistido por superficie, claveado por la superficie abierta
  (`root` / `album:<id>` / `type:<kind>` / `resurfacing:<group>` / `trash`).
- Al volver a una superficie se restaura su offset.
- Entrar y salir de Seleccion **no** cambia el offset.
- Cambiar de household **descarta** todos los offsets.

### 3.5 Paths de test de la raiz

Frozen: first entrance, ready-empty, ready-data, error, refreshing, refresh, 0 albums,
1 album, many albums, resurfacing disponible, resurfacing no disponible, seleccion activa,
upload pendiente, retorno desde Viewer / Album / Tipo / Resurfacing / Camera / Intake.

---

## 4. Create Entry

### 4.1 Menu del `+`

El `+` abre un **anchored bottom sheet** (mismo host `ActionSheet` del producto) titulado
`Guardar un recuerdo`. Menu de primer nivel, **cinco items, sin submenu**:

| # | Item | Copy | Comportamiento |
| --- | --- | --- | --- |
| 1 | Fotos y videos | `Fotos y videos` | Lanza picker de galeria directo |
| 2 | Camara | `Capturar momento` | Lanza Camera directo |
| 3 | Importar audio | `Importar audio` | Lanza el picker de documentos de audio directo |
| 4 | Grabar audio | `Grabar audio` | Lanza el grabador directo |
| 5 | Recuerdo escrito | `Escribir un recuerdo` | Abre el formulario escrito |

**El orden es congelado y es el orden de arriba.** No se reordena.

### 4.1.1 Decision de cierre: IMPORT_AUDIO = IN V1, RECORD_AUDIO = IN V1, ambos de primer nivel

Esta clausula **SUPERSEDE** el congelado anterior de este mismo documento que declaraba
`cuatro items` con un unico item de audio rotulado `Grabar audio`.

```
IMPORT_AUDIO = IN V1   (accion de primer nivel, item 3)
RECORD_AUDIO = IN V1   (accion de primer nivel, item 4)
AUDIO SUBMENU = NO
```

Razon congelada:

1. **Importar un archivo de audio existente y grabar uno nuevo son dos intenciones de
   usuario distintas.** No son dos ventanas al mismo destino: una conserva algo que ya
   existia fuera de HomeCloud; la otra crea algo que no existia.
2. **La capacidad ya existe en CURRENT.** `DocumentPicker` con `audio/*`, resolucion de
   MIME por prefijo o extension, `AudioReview` e intake binario de audio estan
   implementados y verificados. Ocultar una capacidad ya soportada detras de un submenu es
   una perdida neta.
3. **Cinco acciones planas son preferibles a cuatro items con un submenu.** La decision
   previa ("un submenu para una decision binaria cuesta mas de lo que aporta") era
   correcta **mientras la eleccion fuese realmente binaria**. Al promover `Importar audio`
   a accion de primer nivel, el argumento se invierte: un submenu `Audio >` obligaria a
   un segundo nivel de navegacion modal para dos intenciones que ya caben en dos lineas de
   un menu plano.
4. **El menu sigue siendo finito y entendible.** Cinco items, ninguno duplica a otro,
   ninguno es un submenu. No es "un menu infinito".

**Lo que NO se hace:**

- **NO** existe `Audio >` con `Importar audio` / `Grabar audio`.
- **NO** se conserva una hoja intermedia `Elegir contenido` como paso obligatorio para
  llegar a audio importado.
- **NO** se elimina, oculta ni reescribe la implementacion de importacion de audio de
  CURRENT (§6.6).
- **NO** aparece `Nuevo album` aqui (ver §4.1.3).

### 4.1.2 Camino congelado de `Importar audio`

```
root
  → `+`
    → `Importar audio`                        <- accion de primer nivel, item 3
      → picker de documentos/audio del sistema
        → review binario de audio
          → Fecha semantica EDITABLE
          → Album opcional
          → Descripcion opcional
          → Guardar
            → shared upload engine
              → Memory ACTIVE
                → root
```

Se reusa **exacto** el servicio de importacion de audio existente en CURRENT. La decision
es de **enrutado de primer nivel**, no de reescritura de intake. §6.6.

### 4.1.3 Camino congelado de `Grabar audio`

```
root
  → `+`
    → `Grabar audio`                          <- accion de primer nivel, item 4
      → grabador
        → review binario de audio
          → Fecha semantica EDITABLE
          → Album opcional
          → Descripcion opcional
          → Guardar
            → shared upload engine
              → Memory ACTIVE
                → root
```

Los dos caminos **convergen despues** de la adquisicion de la fuente, en el mismo review
binario, con la misma jerarquia de informacion (§6.2) y el mismo `submitBinary`.

`Nuevo album` **NO** aparece aqui. Albums tienen su propia semantica de creacion (§10.3).

### 4.2 Menu grammar (host unico)

- Un solo host modal a la vez.
- El contenido del host cambia; nunca se apila un segundo modal encima.
- Al cerrar un sub-nivel se vuelve al nivel anterior **dentro del mismo host**.
- Nunca dos modales visibles simultaneamente.

---

## 5. Interaction Surface Grammar

La regla "popover = filtros" queda **rechazada**. La gramatica HomeCloud es:

| Superficie | Cuando se usa | Ejemplos HomeCloud |
| --- | --- | --- |
| **ANCHORED MENU / BOTTOM SHEET** | Lista corta de acciones; comandos contextuales; un `+`; un `⋯`; un selector de modo | Menu del `+`; Acciones del Menu de seleccion; Acciones de `⋯` del Viewer; Acciones de album |
| **SHEET / PICKER DEDICADO** | Elegir entre muchos destinos; editar metadata; formularios grandes | Selector de destino multi-album; Hoja de nombre de album; Formulario de intake; Hoja de edicion de fecha; Info del Memory |
| **CONFIRM DIALOG** | Irreversible | Purge (borrado permanente); Vaciar papelera; Eliminar album |
| **INLINE** | Estado reversible inmediato; toggles ligeros | Chip de album en intake; precisions de fecha; conteo de seleccion |

Prohibido:

- Menus anidados de mas de 2 niveles.
- Un segundo `Modal` de RN encima de otro `Modal` de RN.
- Un menu infinito queMezcle Crear, Filtrar, Ordenar y Destino en la misma lista.

---

## 6. Intake

### 6.1 Principio rector

> **HomeCloud auto-rellena todo lo que puede derivar. El usuario no completa metadata tecnica que HomeCloud ya sabe.**

El usuario aporta unicamente:

1. una descripcion opcional con significado,
2. decisiones de organizacion,
3. una correccion manual cuando la derivacion fallo o es incorrecta.

**Intake NO es un formulario de base de datos.** Si el intake pide un dato que CURRENT ya
conoce, ese intake esta mal.

### 6.2 Jerarquia de informacion del review (single item)

```
[ preview del contenido ]

Fecha
  valor derivado, automatico, EDITABLE
  (exact | mes y ano | solo ano | sin fecha)

Album        opcional
Descripcion  opcional

Guardar recuerdo
```

Reglas:

- El **preview** es el elemento dominante. No es un thumbnail pequenos.
- La **Fecha** es un dato de primera clase, no un detalle gris. Es lo que hace que un
  Memories sea un Memories y no un filesystem.
- **Album** y **Descripcion** son opcionales y nunca bloquean el guardado.
- Exactos visuales (tipografia, tamano, colores) NO quedan congelados por este documento.
  La jerarquia y el comportamiento SI.

### 6.3 La fecha en intake binario DEBE ser editable

CURRENT la muestra read-only. Eso esta **mal** y es un hueco P1 del producto (§ DATE-03).
Razon de producto: si HomeCloud resuelve `Sin fecha` para un video de galeria, y el usuario
no puede corregirlo en ningun momento, HomeCloud pierde el recuerdo de una manera que el
usuario no puede reparar. Un dato que HomeCloud no sabe no es un dato del usuario.

### 6.4 Intake de audio: importado y grabado, DOS entradas, UN review

El review de audio es **uno solo**, pero **los caminos de entrada son dos y ambos son
acciones de primer nivel del menu del `+`** (§4.1.1).

| | `Importar audio` | `Grabar audio` |
| --- | --- | --- |
| Origen | archivo de audio existente, fuera de HomeCloud | nueva grabacion hecha en la app |
| Adquisicion | picker de documentos/audio del sistema | grabador con permiso de microfono |
| `source` | `audio-import` | `audio-recorder` |
| Fecha automatica | **`unknown` → `Sin fecha`** (§7.2) | **`exact`** = instante real de inicio |
| Precision inicial | `unknown` | `exact` |
| Review | **el mismo** review binario de audio | **el mismo** review binario de audio |
| Fecha editable | **SI**, obligatoria como en cualquier binario | **SI** |
| Album / Descripcion | opcional / opcional | opcional / opcional |
| Submit | el mismo `submitBinary` | el mismo `submitBinary` |
| Audio Viewer | **el mismo** Audio Viewer (§16) | **el mismo** Audio Viewer (§16) |

**Reglas que no se negocian:**

1. Los dos caminos **convergen despues** de la adquisicion de la fuente. No hay dos
   reviews, ni dos formularios, ni dos pipelines de subida.
2. La distincion entre importado y grabado **no** cambia el review, **no** cambia el
   guardado y **no** cambia el Audio Viewer. Solo cambia como se obtiene el archivo y que
   fecha se deriva automaticamente.
3. `Importar audio` **no** es un submenu de `Fotos y videos`, **no** es un item de un
   selector `Elegir contenido`, y **no** comparte item con `Grabar audio`.
4. **Importar audio NO es un atajo de `Fotos y videos`.** Un archivo de audio no es una
   foto ni un video. El menu `Fotos y videos` no ofrece audio.

### 6.5 Fecha del audio importado: `Sin fecha` es automatico, nunca terminal

El audio importado no tiene ninguna fuente de fecha parseable en el stack actual, asi que
la derivacion automatica produce `capture_precision = 'unknown'` → `Sin fecha` (§7.2).

Eso es **aceptable y correcto**. Lo que es **inaceptable** es que ese `Sin fecha` sea
incorregible.

Regla congelada:

```
automatico  ->  capture_precision = unknown  ->  `Sin fecha`
corregible  ->  el usuario edita en intake (§6.3)  ->  se persiste
             ->  el usuario edita despues en Informacion del recuerdo (§8)  ->  se persiste
```

- `Sin fecha` en un audio importado es un **estado de espera de correccion**, no un
  veredicto final.
- Si el usuario nunca corrige, el Memory queda honestamente en `Sin fecha` y no participa de
  resurfacing (§21.3). Esa consecuencia es aceptada, no es un bug.
- Si el usuario corrige a `exact`, el Memory pasa a comportarse como cualquier otro Memory
  con fecha, **incluida la elegibilidad de resurfacing**.

**Prohibido** derivar la fecha de un audio importado de cualquiera de estos (§7.1):

- el **nombre del archivo**
- el **mtime / fecha de modificacion del archivo**, salvo que se congele explicitamente
  como autoridad semantica (no lo esta)
- el **momento de la subida** (`uploaded_at`)
- la **duracion** del audio
- cualquier heuristica, estadistica o eleccion automatica

### 6.6 Importar audio se preserva: no se borra, no se reescribe

La correccion de §4.1 es de **enrutado**, no de reimplementacion. Las siguientes piezas de
CURRENT **se conservan** y quedan **prohibidas** de eliminacion:

| Pieza | Donde |
| --- | --- |
| `DocumentPicker` con `audio/*` | `homecloudMemoryPicker.ts` (`pickAudioMemory`) |
| Resolucion de MIME de audio por prefijo o extension, con fallback | `homecloudMemoryPicker.ts` |
| `AudioReview` con reloj y play/pause | `MemoryMediaReview.tsx` |
| Intake binario de audio (draft, submit, job, finalize) | `homecloudMemoryIntakeService.ts` |
| Audio Viewer compatible con audio importado **y** grabado | `MemoryAudioPage.tsx` |
| `unknownMediaCaptureMetadata()` para audio importado | `homecloudMediaCaptureMetadata.ts` |

Si CURRENT expone hoy `Importar audio` a traves de un selector compartido
`foto/video/audio`, **ese enrutado se convierte en hueco**, no en verdad.

### 6.7 Batch intake

Batch es obligatorio (§18 del prompt) y NO puede convertirse en N formularios.

| Regla | Decision |
| --- | --- |
| Seleccion multiple | Habilitada (`allowsMultipleSelection`) |
| Mezcla imagen + video en un mismo lote | Habilitada |
| Fechas | **Por item**, derivadas individualmente. El usuario puede corregir una por una sin tocar las demas. |
| **Nunca** sobrescribir fechas distintas con una fecha compartida | Prohibido. Un lote con 3 fechas distintas conserva 3 fechas. |
| Fecha por defecto del lote | Prohibida. Cada item conserva su propia derivacion. |
| Album | Asignacion masiva a un unico album, **mas** excepciones por item. |
| Descripcion | Masiva opcional, con override por item. |
| Preview | El item con el que se entro al review. El resto se navega con anterior/siguiente. |
| Guardado | Un solo submit. N jobs, una sola confirmacion de exito. |
| Cancelar antes de guardar | Descarta el lote completo sin dejar artefactos. |
| Cancelar durante la subida | Los jobs ya confirmaos NO se revierten. Se informa cuantos salieron y cuantos no. |
| Falla parcial de subida | Los exitosos quedan ACTIVE. Los fallidos quedan reintentables y nombrados. Nunca se finge exito total. |

---

## 7. Semantic Date

### 7.1 Prohibiciones absolutas

HomeCloud **no** juzga si la metadata del usuario es "verdadera". No existe "confianza",
no existe "confiabilidad", no existe score.

Prohibido usar como fecha de captura:

- `uploaded_at`
- `created_at`
- `Date.now()` en el cliente al importar
- la fecha de seleccion del usuario
- la fecha del servidor al recibir
- un filename heuristico

Si HomeCloud no tiene un valor parseable de un campo soportado, el resultado es
`Sin fecha`. Punto.

### 7.2 Precedencia determinista por fuente (CONGELADA tras el audit de fuentes)

**Orden de precedencia global, evaluado de mas especifico a menos especifico:**

1. Campo de captura/fecha soportado del asset, parseado con exito -> `exact`.
2. Si el asset no entrega campo de captura, se consulta una segunda fuente de metadata
   **explicitamente soportada** para ese tipo de asset. Si parsea -> `exact`.
3. Captura nativa de HomeCloud (camara, grabacion de audio) -> instante real de captura -> `exact`.
4. Correccion explicita del usuario -> gana siempre sobre cualquier valor automatico.
5. Ningun valor parseable -> `unknown` -> `Sin fecha`.

**Tabla por fuente (congelada):**

| Fuente | Campo(s) que se leen | Orden de intento | Resultado si no hay |
| --- | --- | --- | --- |
| Imagen de galeria | `exif.DateTimeOriginal` → `exif.DateTimeDigitized` → `exif.DateTime` | 1,2,3 | `unknown` |
| MOV de galeria | Mismos 3 campos EXIF | 1,2,3 | `unknown` (CURRENT ya documenta que el SDK iOS no entrega EXIF para video) |
| MP4 de galeria | Mismos 3 campos EXIF | 1,2,3 | `unknown` |
| Video de camara | **Instante real de captura de HomeCloud** (no el reloj del cliente al importar, sino el instante de la captura) | directo | n/a |
| Imagen de camara | Instante real de captura de HomeCloud | directo | n/a |
| Audio importado (`Importar audio`, item 3 del menu del `+`) | **Ninguna fuente soportada.** El audio importado no tiene campo de captura parseable en el stack actual. | — | **siempre `unknown` → `Sin fecha`**, y §6.5 obliga a que ese `Sin fecha` sea corregible por el usuario en intake y despues en `Información del recuerdo` |
| Audio grabado | Instante real de inicio de grabacion | directo | n/a |
| Recuerdo escrito | Eleccion del usuario; por defecto el dia actual | usuario | `unknown` |

### 7.3 Precision

Cuatro precisiones, congeladas:

| Precision | Campos | Se usa cuando |
| --- | --- | --- |
| `exact` | `captured_at` (instante completo) | Hay un instante real de captura |
| `month_year` | `captured_year` + `captured_month`, `captured_at = NULL` | El usuario sabe mes y ano |
| `year` | `captured_year`, `captured_at = NULL`, `captured_month = NULL` | El usuario solo sabe el ano |
| `unknown` | los tres NULL | No hay valor parseable y el usuario no corrigio |

**Prohibido inventar dia o mes para contenido `year`-only o `unknown`.**
El backend ya lo valida con `homecloud_contents_capture_semantics_check` y
`homecloud_contents_capture_component_range_check`. Esa validacion se conserva intacta.

### 7.3.1 Precision parcial → `exact`: SOLO por correccion explicita del usuario

Este es el unico camino por el cual una precision parcial se vuelve `exact`, y es
**exclusivamente** la correccion explicita del usuario.

| Precision actual | Se vuelve `exact` sola, sin usuario | Camino permitido |
| --- | --- | --- |
| `month_year` | **NO** | el usuario edita y elige **explicitamente** un dia -> `exact` |
| `year` | **NO** | el usuario edita y elige **explicitamente** mes **y** dia -> `exact` |
| `unknown` | **NO** | el usuario edita y elige **explicitamente** una fecha exacta -> `exact` |
| `exact` | ya es `exact` | edicion posterior se evalua por §7.4 |

Ejemplo canonico:

```
Memory con `Octubre 2023` (capture_precision = month_year)
  → el usuario abre la edicion de fecha
    → elige explicitamente `18 octubre 2023`
      → capture_precision = exact
        → SOLO AHORA puede participar de resurfacing por fecha exacta (§21.3)
```

**HomeCloud NUNCA inventa un dia.** Prohibido, sin excepcion:

```
day = 1
day = hoy
day = el dia de la subida
day = el dia de la importacion
day = el dia del primer dia del mes
day = el medio del mes
cualquier dia sintetico
```

**No existe conversion automatica `month_year → exact`, ni `year → exact`, ni
`unknown → exact`.** No hay job, ni tarea, ni trigger, ni heuristica que complete una fecha
parcial. La fecha parcial es honesta hasta que el usuario la completa; despues es exacta
porque **el usuario** la hizo exacta.

La unica via de edicion post-guardado es `Información del recuerdo` (§8), que es la
**unica** superficie de edicion de metadata (§8.3). No se crea una segunda via, ni una
pantalla de "completar fechas pendientes".

### 7.4 Correccion de fechas

| Operacion | V1 |
| --- | --- |
| Editar fecha exacta (single Memory) | **IN** |
| Editar a mes y ano (single) | **IN** |
| Editar a solo ano (single) | **IN** |
| Marcar `Sin fecha` / limpiar fecha (single) | **IN** |
| Editar descripcion (single) | **IN** |
| Editar membresias de album (single) | **IN** |
| **Correccion masiva de fecha en un lote** | **OUT de V1.** No se congela sin evidencia de necesidad. Requiere una pantalla propia y una decision sobre items parciales. Reconsiderable. |
| Editar fecha al capturar (galeria) | **IN** (§6.3) |
| Editar fecha al capturar (camara) | **IN** |
| Editar fecha de recuerdo escrito | **IN** (ya existe) |

### 7.5 Presentacion

`exact` -> `12 ene 2024`
`month_year` -> `ene 2024`
`year` -> `2024`
`unknown` -> `Sin fecha`

En Timeline, los grupos `unknown` y `year`-only van **al final**, en una seccion honesta
`Sin fecha`, separados de los recuerdos fechados.

---

## 8. Memory Information / Metadata

### 8.1 Distincion obligatoria

El usuario debe poder distinguir, sin ambiguedad:

- **CUANDO OCURRIO EL RECUERDO** = Semantic Date (§7)
- **CUANDO SE AGREGÓ A HOMECLOUD** = `uploaded_at` (fecha de ingesta)
- **QUIEN LO AGREGÓ** = `uploaded_by_member_id`

Son tres hechos distintos. Ninguna pantalla debe llamarlos igual.

### 8.2 Superficie Info (IN)

`Informacion del recuerdo`, alcanzable desde el Menu `⋯` del Viewer y desde la seleccion.

| Campo | Editable en V1 |
| --- | --- |
| Fecha (semantica, con precision) | **SI** |
| Descripcion | **SI** |
| Pertenencia a albums | **SI** |
| Tipo (Foto / Video / Audio / Nota) | no (derivado) |
| Agregado a HomeCloud (fecha) | no (hecho) |
| Agregado por (miembro) | no (hecho) |
| Tamano / mimeType / nombre tecnico | **NO.** No se expone. Un filename y un storage path **no son la identidad de un Memory**. |

La identidad de un Memory es su contenido y su fecha semantica. Nunca su ruta.

### 8.3 Alcance

`Informacion del recuerdo` es la **unica** superficie de edicion de metadata.
No hay una segunda via de edicion. Editar desde Intake y editar desde Info usan la misma
autoridad.

---

## 9. Timeline

- Timeline es la vista canonica de la historia del hogar.
- Agrupado por tiempo, orden determinista y total:
  `captured_year DESC NULLS LAST` → `captured_month DESC NULLS LAST` →
  `captured_at DESC NULLS LAST` → `id DESC`.
- `uploaded_at` **nunca** es criterio de orden.
- La seccion `Sin fecha` va al final.
- Paginacion por `limit`/`offset` con orden total: no puede duplicar ni saltar filas.
- Preservado tal cual: `SectionList`, `stickySectionHeadersEnabled={false}`,
  `onEndReachedThreshold` 0.6, `Mostrar mas recuerdos`.
- Es la superficie de donde sale la seleccion por drag contiguo (D4).

---

## 10. Albums

### 10.1 Verdades de dominio (intocables)

| Regla | Estado |
| --- | --- |
| Un Album pertenece al hogar y lo ven todos sus miembros | Intocable |
| Memory ↔ Album es N:M | Intocable |
| **Eliminar un Album NUNCA elimina Memories** | Intocable |
| Quitar un Memory de un Album **NUNCA** cambia el ciclo de vida del Memory | Intocable |
| Portada = visual activo mas antiguo en orden canonico de album | Intocable |
| `itemCount` = total exacto de Memories activos | Intocable |
| Orden de album = mas antiguo → mas nuevo | Intocable |
| Nombres de album duplicados permitidos | Intocable (sin UNIQUE en schema) |

### 10.2 Album Trash: NO existe

Un Album es **organizacion**. Un Memory es **contenido**.
Si borrar un album fuera reversible, habria dos niveles de papelera y una jerarquia de
restauracion ambigua. No la hay.

`homecloud_albums.lifecycle = 'trashed'` y `homecloud_albums.trashed_at` existen en el
schema y **permanecen sin uso por decision de producto**, no por descuido.
Registrado como `EXISTING_UNUSED_CAPABILITY`. No se eliminan.

### 10.3 Crear Album — affordance de raiz (CONGELADO, reemplaza HC2-C §8)

**NO existe una accion persistente `+ Nuevo` en el header de la seccion Albums.**

El riel de Albums **termina en un tile de creacion**:

```
Álbumes

[ Familia ] [ Viaje ] [ Cumple ] [ + ]
                                Nuevo álbum
```

Reglas del tile:

- Es el **ultimo** item del riel, siempre, incluso con 0 albums.
- Se ve claramente como `+ Nuevo álbum`: icono `+` **y** etiqueta de texto visible.
  Un cuadrado vacio sin etiqueta es inaceptable (rechaza P5).
- Gated por `capabilities.organize`.
- Es la **unica** accion de crear album en la raiz. No hay segunda en el header.
- Es independiente de la posicion del scroll horizontal.
- Con 0 albums el riel muestra **solo el tile de creacion**, que sigue siendo util.

Contraste con CURRENT, que tiene `+ Nuevo` en el header y ningun tile final: eso es
`STALE`. Se corrige.

### 10.4 Acciones de album

| Accion | Superficie | Copy | Confirmacion |
| --- | --- | --- | --- |
| Crear | tile final del riel / `+ Nuevo album` contextual | `Nuevo álbum` | no |
| Renombrar | `⋯` del album | `Renombrar álbum` | no |
| Agregar recuerdos existentes | `⋯` del album, y CTA si el album esta vacio | `Agregar recuerdos` | no |
| Quitar del album | seleccion contextual dentro del album | `Quitar 1 del álbum` / `Quitar N del álbum` | no |
| Cambiar portada | **OUT de V1** | — | — |
| Reordenar albums | OUT de V1 | — | — |
| Mover Memory a otro album | `Agregar a otro álbum` | `Agregar a otro álbum` | no |
| Eliminar album | `⋯` del album | `Eliminar álbum` | **SI, dialogo de confirmacion** |

`Eliminar álbum` **exige** dialogo de confirmacion explicito con esta copy obligatoria:

> `Los recuerdos no se eliminan: van a seguir en Recuerdos.`

El dialogo de confirmacion es obligatorio aunque el producto underlying ya garantiza que
los Memories sobreviven: el usuario debe ver la garantia antes de confirmar.

### 10.5 Crear Album desde Memories seleccionados (OBLIGATORIO)

Camino requerido, congelado:

```
N Memories seleccionados
  → Acciones (⋯)
    → Agregar a un álbum
      → [hoja de destino: lista de albums existentes]  +  [ Nuevo álbum ]
```

Si elige `Nuevo álbum`:

1. Entra a un campo de nombre.
2. Crea el album.
3. Los Memories seleccionados se vuelven miembros **en el mismo flujo logico**.
4. No se pide al usuario volver a seleccionar los Memories.
5. Retorna al llamador original.
6. La seleccion termina segun el contrato de exito (§12.5).

Variantes obligatorias:

| Situacion | Comportamiento |
| --- | --- |
| Albums existentes | Se listan y son elegibles |
| **0 albums** | La hoja muestra `Nuevo álbum` como accion primaria. No es un callejon sin salida. |
| El usuario cancela el nombre | Vuelve a la lista de destinos. **No** se crea album. **No** se pierde la seleccion. |
| Falla la creacion del album | Mensaje honesto en la misma hoja. La seleccion se conserva intacta. Se puede reintentar. |
| Falla la pertenencia de algunos Memories | Los que si entraron quedan en el album. Los fallidos **siguen seleccionados** y se nombran uno por uno. Copy honesta del tipo `2 recuerdos no se pudieron agregar. Los que sí se agregaron ya están en el álbum.` + `Reintentar los que fallaron`. |
| Falla la pertenencia de todos | Todos siguen seleccionados. Mismo copy. El album existe vacio. |
| Nombre duplicado | **Permitido.** Sin precheck, sin error. Se crea con el mismo nombre. |
| El album destino fue borrado remotamente | Se revalida contra lectura autoritativa antes de confirmar. Error terminal claro, no un fallo silencioso. |

### 10.6 Quitar del album

```
Album A
  → seleccionar 1 o N
    → Quitar N del álbum
      → las membresías se eliminan
      → los Memories sobreviven intactos
      → el usuario SIGUE en Album A
      → los items quitados desaparecen de Album A
      → NO hay fallback a la raiz
```

Accion de un solo Memory desde el Viewer: **IN**. Mismo copy, misma semantica.

**Vocabulario congelado y prohibido confusion:**

| Copy | Significado | Prohibido |
| --- | --- | --- |
| `Quitar del álbum` | quita una membresia | `Eliminar`, `Borrar`, `Papelera`, `Mover a papelera`, `Quitar de HomeCloud` |
| `Mover a papelera` | cambia el ciclo de vida del Memory | `Quitar`, `Eliminar del álbum` |

Son operaciones **estructuralmente distintas** y nunca pueden compartir label.

### 10.7 Estados del album

| Superficie | LOADING | READY_EMPTY | READY_DATA | ERROR | REFRESHING |
| --- | --- | --- | --- | --- | --- |
| Riel de albums | skeleton de la seccion | solo el tile de creacion | riel de tiles | `ErrorState` + `Reintentar` | conserva tiles, sin skeleton |
| Portada de album | estado de carga **distinguible** | fallback de album | imagen | fallback de album | conserva imagen |
| Detalle de album | skeleton de tarjetas | copy + `Agregar recuerdos` | SectionList | `ErrorState` + `Reintentar`, o `ALBUM_MISSING` terminal | conserva contenido |

`LOADING` con contenido previo ya disponible **nunca** es skeleton.

---

## 11. Types

Tipos son **vistas automaticas**, no Memories duplicados.

| Tipo | Origen | Orden |
| --- | --- | --- |
| Fotos | `kind = image` | Timeline |
| Videos | `kind = video` | Timeline |
| Audios | `kind = audio` | Timeline |
| Notas | `kind = written` | Timeline |

- `kind` es **derivado** en backend, nunca almacenado: `written` si hay `written_text`, si
  no el prefijo del `mime_type`. Es una funcion de los datos, no un campo.
- Sin contadores. El read model entrega paginas, no totales; un numero seria inventado.
- No son carpetas. No se pueden renombrar, mover ni eliminar.
- Empty honesto: `Esta colección todavía no tiene recuerdos.` Distinto de "cargando".

---

## 12. Selection

### 12.1 Invariante central

> **LA SELECCION NUNCA CAMBIA EL CONTEXTO DE LLAMADOR.**

| Llamador | Dataset durante la seleccion | Al cancelar | Al tener exito |
| --- | --- | --- | --- |
| Timeline (raiz) | Timeline | Timeline | Timeline |
| Album A | **Solos Memories de Album A** | Album A | Album A |
| Fotos | **Solos image** | Fotos | Fotos |
| Videos | **Solos video** | Videos | Videos |
| Audios | **Solos audio** | Audios | Audios |
| Notas | **Solos written** | Notas | Notas |
| Resurfacing: grupo G | **Solos los de G** | G | G |
| Papelera | **Solos los de la papelera** | Papelera | Papelera |

**La raiz nunca es un fallback de conveniencia.** Si el estado del llamador se pierde, es un
bug, no un comportamiento.

### 12.2 Mecanica

- Entrada por **long press**. Se mantiene.
- La seleccion es **estado contextual**, no un destino de navegacion.
- Al entrar: el offset se preserva, la IA no cambia, la lista no cambia de sitio.
- **Drag contiguo (D4)**: se preserva. Rango visual contiguo, no seleccion arbitraria.
- **Las acciones contextuales son visibles desde el primer fotograma.** No hay paso `✓`
  obligatorio para revelar acciones. El `✓` desaparece como revelador.
- Header de seleccion: `[X]  N seleccionados  [⋯ Acciones]`.
- El conteo y cancelar son siempre visibles.
- Salida por `X` o por gesto de retroceso: vuelve a la superficie del mismo llamador, mismo
  offset.

### 12.3 Prohibido durante la seleccion

- Cambiar la pantalla raiz.
- Cambiar el dataset visible al de otro llamador.
- Revelar `Recuerdos | Colecciones`.
- Mover al usuario a la raiz.
- Resetear el scroll sin necesidad.
- Desmontar la superficie del llamador.

### 12.4 Catalogo de acciones de seleccion

| Accion | Timeline | Tipo | Album | Resurfacing | Papelera |
| --- | --- | --- | --- | --- | --- |
| `Agregar a un álbum` | SI | SI | SI (como `Agregar a otro álbum`) | SI | no |
| Crear album desde la seleccion | SI | SI | SI | SI | no |
| `Quitar del álbum` | no | no | **SI** | no | no |
| `Mover a papelera` | SI | SI | SI | SI | SI |
| `Restaurar` | no | no | no | no | **SI** |
| `Eliminar definitivamente` | no | no | no | no | **SI** |
| `Compartir` | **DEFER** | DEFER | DEFER | DEFER | DEFER |
| Favoritos | no (DEFER, §22) | no | no | no | no |

`Compartir` en seleccion multiple sigue diferido: la costura OS SHARE existente comparte
**un** archivo. Compartir N binarios exigiria N descargas, N temporales y una decision de UX
adicional. **No se congela sin esa decision.** En el menu de Viewer de un solo Memory,
`Compartir` si es IN (C6 de HC2-C, no revertido).

`Quitar del álbum` **no** aparece en la raiz, en un Tipo ni en Resurfacing: no hay album
abierto ahi. Aparece solo dentro de un Album.

### 12.5 Contrato de fin de seleccion

| Resultado | Comportamiento |
| --- | --- |
| Exito, la seleccion tiene un solo elemento | Vuelve a la superficie del llamador |
| Exito, la seleccion tiene N elementos | Vuelve a la superficie del llamador |
| Exito parcial | Vuelve a la superficie del llamador, con solo los fallidos seleccionados y nombrados |
| Cancelar (`X` / gesto) | Vuelve a la superficie del llamador, offset preservado, sin cambios de datos |
| Fallo total | La seleccion **se conserva** para que el usuario pueda reintentar. No se pierde contexto. |

---

## 13. Viewer Shell

### 13.1 Decision

> **VIEWER = SUPERFICIE INMERSIVA.**

El Viewer no es una capa dentro de la pagina de Memories. Es una superficie a pantalla
completa que oculta el chrome global.

### 13.2 Chrome que el Viewer DEBE ocultar

| Elemento | Oculto en Viewer |
| --- | --- |
| Navbar inferior global flotante | **SI** |
| Selector global `Archivos \| Recuerdos` | **SI** |
| Header de pagina HomeCloud | **SI** |
| `AppTopBar` global | **SI** |
| `titleRow` de Memories + `+` | SI (ya cubierto por el overlay) |
| Bottom chrome de Memories | SI |

**Regla dura:** *ninguna media ni ninguna accion puede vivir debajo de la navegacion global.*

### 13.3 Safe area

El Viewer **debe** consultar safe-area insets. No se usan constantes magicas.

| Zona | Contrato |
| --- | --- |
| Top safe area | `insets.top` |
| Top chrome | Dentro del top safe area, con padding minimo de 12 |
| Media viewport | El area util entre top chrome y bottom chrome, descontando `insets.bottom` |
| Bottom chrome | Dentro del bottom safe area |
| Close | Hit area **>= 44x44** |

### 13.4 Top chrome

De izquierda a derecha:

```
[Cerrar]   [Fecha semantica del Memory activo]   [⋯ Acciones]
```

- `Cerrar`: `AppButton variant="icon"` con hit area >= 44x44. `accessibilityLabel="Cerrar recuerdo"`.
- Fecha semantica: muestra el valor de §7.5. Es la orientacion minima del usuario.
- `⋯ Acciones`: **IN**. Hoy no existe. Sin el, el Viewer no puede ofrecer las acciones de
  §18 y `Quitar del álbum` de un solo Memory queda inalcanzable.

### 13.5 Bottom chrome

Etiqueta de la fuente real (`Recuerdos` / nombre del album / `Fotos` / `Videos` /
`Audios` / `Notas` / nombre del grupo de resurfacing / `Papelera`) + para Audio y Video los
controles de medio.

Debajo de `insets.bottom`. Nunca debajo de la barra global.

### 13.6 Comportamiento del shell

- El shell aparece **de inmediato**, sin esperar bytes.
- Un unico `AppState` listener y una unica fuente de focus.
- `authorized === false` significa **pause**, nunca resume.
- Al cerrar, el llamador se restaura con su offset (§27).
- Android: el `BackHandler` debe cerrar el Viewer **antes** de cerrar el album o la
  coleccion que lo abrieron. Hoy no esta en la cadena de prioridades: es un bug.

---

## 14. Image Viewer

### 14.1 Alcance

Galeria, no editor. `editing / crop / filter = OUT`.

### 14.2 Interacciones V1

| Capacidad | Decision | Nota |
| --- | --- | --- |
| Fit (`contain`) | IN | ya correcto |
| Pinch zoom | IN | Verificacion fisica obligatoria (§31). Un test que diga "existe" no basta. |
| Pan con zoom | IN | El clamp debe derivarse del viewport, no de una constante magica |
| Reset de zoom al cambiar de pagina | IN | |
| Reset de zoom al reabrir | IN | |
| Arbitraje pager ↔ zoom | IN | `onPanResponderTerminationRequest` correcto a escala 1 |
| Pan continuo con 1 dedo cuando hay zoom | IN | |
| Doble toque para zoom | **DEFER** | |
| Doble toque para reset | **DEFER** | |
| Preview → original progresivo | IN | Se muestra el preview primero y el original lo reemplaza |
| Loading | IN | |
| Error | IN | |
| **Retry del original** | IN | Un error sin recuperacion no es aceptable |

### 14.3 Originales: solo la pagina activa

**Regla dura:** una pagina de imagen **inactiva** pide **preview**. Solo la pagina **activa**
pide **original**.

CURRENT viola esto: `ImagePage` no recibe `active` y pide el original al montar. Con la
ventana del pager activa se pueden pedir hasta 7 originales firmados a la vez.
Se corrige.

Ademas:

- Deduplicacion de requests en vuelo por `contentId` para preview y original.
- Guardia de generacion en el fetch del original, como ya existe en video y preview.
- Mapas de signed URL acotados y limpiados en el cambio de household.

### 14.4 Finito

Un estado de carga **perpetuo** sin error ni timeout es inaceptable. Si el original no
llega, el usuario debe ver un error con retry, no un spinner eterno.

---

## 15. Video Viewer

### 15.1 Prioridad de producto

> **APERTURA PERCIBIDA RAPIDA + REPRODUCCION NORMAL.**

Un visor de video familiar no es un reproductor profesional. No se agregan controles
avanzados porque las APIs existan.

### 15.2 Estados obligatorios (orden de aparicion)

```
1. Tap
2. Shell del Viewer aparece INMEDIATAMENTE          <- nunca espera bytes
3. Poster / preview visible si existe               <- si no, spinner honesto
4. Llega el original -> player ready -> el poster desaparece
5. Reproduccion normal
```

**Regla dura:** *el usuario nunca debe dudar si su tap funciono.*

### 15.3 P1 — Por que algunos Videos tardan

Evidencia `PROVEN_STATIC`:

- La pagina de video pide **solo el original**. No usa `useMemoryPreviewUrl`. No hay poster.
- No hay thumbnail de video en ningun lugar del pipeline.
- El estado no-listo es un spinner + `Cargando video…` sobre negro.
- El original se transmite por red hasta el buffer del player.

Evidencia `PLAUSIBLE_ONLY` / `DEVICE_VERIFY_REQUIRED`: la razon de que **algunos** tarden
mucho mas que otros es el tamano del archivo y el ancho de banda. Eso es coherente con la
evidencia pero no esta medido.

La conclusion de producto es valida independientemente de la causa exacta: **CURRENT no
ofrece ninguna señal de progreso ni poster antes de que el player este listo.** Un video
largo sobre red movil produce exactamente la experiencia "tarda una eternidad".

### 15.4 Decision de producto para P1

1. El shell aparece de inmediato. (Ya lo hace; se conserva.)
2. **Si `hasPreview` es true, el video se muestra como poster hasta que el player este
   listo.** Esto es lo que falta.
3. El spinner se reemplaza por el poster cuando hay poster.
4. El overlay de buffering desaparece en cuanto `status === 'readyToPlay'`.
5. Falla honesta si el player no puede reproducir.
6. Si `hasPreview` es false, spinner honesto + copy que dice que esta preparando el video.
   Nunca un cuadrado negro ambiguo.

### 15.5 Capacidades V1

| Capacidad | Decision |
| --- | --- |
| Poster antes de `readyToPlay` | **IN** (nuevo, corrige P1) |
| Play / Pause | IN |
| Scrub | IN |
| Tiempo actual / duracion | IN |
| Fullscreen | **IN** |
| Buffering honesto | IN |
| Error de reproduccion | IN |
| "No soportado" | IN, clasificado honestamente por plataforma |
| Pausa en background | IN |
| Sin auto-resume en foreground | IN |
| Coexistencia pager ↔ gestos | IN (device QA) |
| Velocidad de reproduccion | OUT de V1 |
| Mute / Volumen | OUT de V1 (en iOS es del dispositivo) |
| Doble toque +/-10 s | DEFER |
| Zoom / pan del video | OUT (la API no lo expone) |
| Reproduccion en background | OUT |

### 15.6 Invariantes preservados (no se rediseñan)

1. Player **solo** en la pagina activa.
2. Fetch del original **solo** en la pagina activa.
3. Sin release manual del player: la autoridad es el hook.
4. Sin resurreccion asincrona obsoleta.
5. Pause en background / blur / swipe.
6. Sin auto-resume.
7. Revocacion por cambio de household.

---

## 16. Audio Viewer

### 16.1 Identidad visual obligatoria

Un Audio no puede estar visualmente vacio. La barra de progreso no es identidad visual.

**El Audio Viewer es UNO y sirve a las dos fuentes.** Un audio importado (`Importar audio`,
item 3) y un audio grabado (`Grabar audio`, item 4) usan **el mismo** Audio Viewer, con las
mismas capacidades y el mismo diseno honesto no-waveform (§16.3). No hay un visor de audio
"importado" y otro "grabado", ni una variante degradada para el audio importado, ni un
"no se puede reproducir" presumido.

La distincion de origen (`source: 'audio-import'` vs `'audio-recorder'`) **no** es visible
en el Viewer y **no** altera ninguna capacidad. Si un audio importado no se puede
reproducir, el Viewer lo dice con copy honesta de playback (§16.2), igual que para un audio
grabado.

### 16.2 Capacidades V1

| Capacidad | Decision |
| --- | --- |
| Identidad visual (icono + etiqueta `Audio`) | IN |
| Play / Pause | IN |
| Seek por toque | IN |
| Tiempo actual / duracion | IN |
| **Seek -10 s / +10 s** | **IN** |
| **Velocidad 0.5 / 1 / 1.5 / 2x** | **IN** |
| **Buffering en reproduccion** | **IN** |
| Error de reproduccion | IN |
| Compartir (OS) | IN |
| Pager | IN |
| Pausa en background | IN |
| Sin auto-resume | IN |
| Bocina / auriculares (`setAudioModeAsync` para salida) | **DEFER**. Reconfigurar la sesion de audio es una decision propia. |
| Reproduccion en background | **OUT** |

### 16.3 Waveform — decision congelada

**`FAKE WAVEFORM = OUT` (prohibido).** Un waveform visual que no represente el audio es
mentira de producto. No se implementa bajo ninguna circunstancia.

**`REAL WAVEFORM = CANDIDATE IN`, con tres clasificaciones posibles y el veredicto actual:**

> **`REAL_WAVEFORM_EXPENSIVE` + `DEVICE_VERIFY_REQUIRED`**

Evidencia `PROVEN_STATIC`:

- `expo-audio@57.0.5` **expone publicamente** `useAudioSampleListener(player, listener)` y
  `player.isAudioSamplingSupported` (`node_modules/expo-audio/src/ExpoAudio.ts:238,240`,
  re-exportado por `src/index.ts:4`).
- La documentacion del paquete advierte: el muestreo **requiere `RECORD_AUDIO` en Android**
  y **no esta soportado en todas las plataformas**.
- No hay muestreo en vivo durante la **grabacion**; `setAudioSamplingEnabled` solo existe
  en `AudioPlayer`.
- No hay ninguna libreria de waveform instalada.
- El muestreo es de **reproduccion**: la waveform solo existe mientras suena. Un waveform
  estatico requires descargar y decodificar el archivo en el cliente, lo que en esta
  arquitectura (original remoto via signed URL, sin descarga previa) es caro.

Consecuencia de producto: una waveform que solo aparece al reproducir no es identidad
visual, y una waveform estatica requiere descargar el original. Ambos son caros para el
beneficio.

**Decision V1 congelada:** Audio recibe un **diseño visual honesto no-waveform**, no vacio:

- Icono de audio + etiqueta `Audio`.
- Duracion y posicion en formato `m:ss`, visibles siempre.
- Barra de progreso con punto de posicion, con seek por toque y arrastre.
- Nombre de archivo presentable, porque es un archivo de audio y el usuario lo reconoce por
  su nombre. (Esto es identidad util, no identidad falsa.)
- Estado de buffering explicito cuando corresponda.

**Reconsideracion:** si en device QA `useAudioSampleListener` resulta soportado y estable en
el iPhone objetivo con costo de CPU aceptable, la waveform **en vivo durante la
reproduccion** puede entrar como V1.1. La prohibicion de fake waveform no cambia.

### 16.4 Sesion de audio

El grabador ya fuerza y restaura `setAudioModeAsync`. Esa decision se preserva.
No se reconfigura la sesion de audio desde el Viewer en V1.

Nota: el grabador **fuerza** un estado conocido en vez de restaurar el modo previo. Riesgo
deuda, no bug de V1.

---

## 17. Written Memory

Un Recuerdo escrito es **contenido**, no una nota de tareas.

| Capacidad | Decision |
| --- | --- |
| Crear (texto) | IN |
| `Importar audio` (archivo de audio existente) | **IN** — accion de primer nivel del menu del `+` (§4.1.1, §6.4) |
| `Grabar audio` (grabacion nueva) | **IN** — accion de primer nivel del menu del `+` (§4.1.1, §6.4) |
| Fecha (4 precisiones) | IN |
| Album opcional | IN |
| Leer | IN |
| Scroll de texto largo | IN |
| Copiar todo | IN |
| Compartir (texto) | IN |
| Informacion /-editar metadata | IN (§8) |
| Acciones de album | IN |
| Mover a papelera | IN |
| Pager | IN |
| Retorno al llamador | IN |

**OUT:** texto enriquecido, editor markdown, checklists, adjuntos, comments.
`Notas` en Tipos es el nombre del **tipo automatico** que agrupa Memories escritos. No es
una app de notas.

Restricciones de almacenamiento que ya existen y se conservan: un Memory escrito tiene
`written_text` no vacio y **todos** los campos binarios en `NULL`, incluido `uploaded_at`.
Nunca hubo bytes en custodia. La UI no debe ofrecer "descargar original" para un escrito;
debe oferecer `Compartir` como texto.

---

## 18. Actions

### 18.1 Una sola gramática

Un unico **action authority**: funcion pura que recibe `(surface, callerContext, selectionCount,
memoryKinds, albumIdentity, capabilities)` y devuelve las acciones disponibles con label,
efecto, confirmacion y feedback. Sin store, sin contexto nuevo, sin reducer global.

Compartida conceptualmente por:

- Menu `⋯` del Viewer (1 Memory)
- Hoja de acciones de seleccion (N Memories)
- `⋯` de un album
- `⋯` de un tipo
- `⋯` de un grupo de resurfacing
- `⋯` de la papelera

### 18.2 Catalogo final de acciones

| Accion | Label | Disponible en | Efecto | Confirmacion | Exito | Error | Retorno |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Agregar a album | `Agregar a un álbum` | Viewer, seleccion (root/tipo/resurfacing) | crea membresia | no | count + snackbar | parcial con retry | llamador |
| Crear album y agregar | `Nuevo álbum` | menu de destino | crea album + membresias | no | count + snackbar | album creado / membresia fallida, honesto | llamador |
| Quitar del album | `Quitar N del álbum` | seleccion dentro de album, Viewer en album | elimina membresia | no | count + snackbar | parcial con retry | **sigue en el album** |
| Mover a papelera | `Mover a papelera` | Viewer, seleccion (todas las superficies) | lifecycle ACTIVE→TRASHED | no | `Movido a la papelera` + `Deshacer` | snackbar | llamador |
| Restaurar | `Restaurar` | papelera (1 o N) | lifecycle TRASHED→ACTIVE | no | `Restaurado` | snackbar | papelera |
| Borrado permanente | `Eliminar definitivamente` | papelera | lifecycle PURGED | **SI** | `Eliminado definitivamente` | snackbar | papelera |
| Vaciar papelera | `Vaciar papelera` | papelera | purga todos | **SI**, con conteo | `Papelera vacía` | snackbar | papelera |
| Compartir | `Compartir` | Viewer de 1 Memory | OS share | no | `Compartido` honesto | si sharing no disponible, mensaje honesto y sin accion falsa | Viewer |
| Copiar | `Copiar` | Viewer de Memory escrito | portapapeles | no | `Copiado` (device-only en iOS) | snackbar | Viewer |
| Informacion | `Información del recuerdo` | Viewer, seleccion | abre §8 | no | — | — | vuelve al llamador |
| Renombrar album | `Renombrar álbum` | `⋯` album | PATCH nombre | no | — | hoja abierta | llamador |
| Agregar recuerdos | `Agregar recuerdos` | `⋯` album, album vacio | entra a seleccion contextual | no | — | — | album |
| Eliminar album | `Eliminar álbum` | `⋯` album | hard delete de organizacion | **SI** | album desaparece | hoja abierta | root |
| Ocultar de resurfacing | `No mostrar este recuerdo acá` | Viewer, seleccion, grupo de resurfacing | `hidden_from_resurfacing = true` | no | `No se mostrara en Para volver a ver` | snackbar | llamador |

### 18.3 Prohibiciones

- Un mismo concepto con dos labels en superficies distintas.
- Un accion destructiva sin confirmacion cuando es irreversible.
- Dos labels que mezclen organizacion y ciclo de vida.
- Ofrecer una accion que no esta soportada por la superficie del llamador.
- Un estado "compartido" que afirme que el destinatario recibio el archivo.

### 18.4 Selector de destino

Cuando hay **muchos** albums, elegir destino es un **picker dedicado** en su propia hoja,
no un item mas del menu de acciones. El menu de acciones **reemplaza su contenido** por el
picker; nunca se apila un segundo modal.

Con 0 albums, el picker ofrece `Nuevo álbum` como accion primaria.

---

## 19. Lifecycle

### 19.1 Modelo final

```
        Mover a papelera            Restaurar
ACTIVE ──────────────────> TRASHED ────────────> ACTIVE
   │                          │
   │ Eliminar                 │ Vaciar papelera /
   │ definitivamente          │ Eliminar definitivamente
   ▼                          ▼
PURGED <───────────────── PURGED
```

`PURGED` **no es un estado de base de datos**. `PURGED` = la fila desaparece y los bytes
desaparecen. Es el unico estado que no se persiste.

### 19.2 Realidad de CURRENT (declarada, no asumida)

| Elemento | Existe en schema | Escribido por backend | UI |
| --- | --- | --- | --- |
| `homecloud_contents.lifecycle` | SI (`CHECK in ('staging','active','trashed')`) | **solo `staging` y `active`** | no |
| `homecloud_contents.trashed_at` | SI | **nunca** | no |
| `homecloud_contents.trashed_by_member_id` | SI | **nunca** | no |
| `homecloud_contents_trash_consistency` CHECK | SI | — | — |
| Endpoint de trash | **NO** | — | — |
| Endpoint de restore | **NO** | — | — |
| Endpoint de purge | **NO** | — | — |
| `homecloud.delete` | capability declarada y proyectada | **nunca exigida por ninguna ruta** | no |

El schema **ya soporta `trashed`** y su CHECK de consistencia ya esta. Purge no necesita un
estado nuevo: es borrado fisico.

### 19.3 Decision

Lifecycle es **IN**. Requiere, por primera vez en este carril, un cambio de backend:

- endpoint `trash` / `restore` / `purge` (o un unico endpoint de transicion de lifecycle)
- la escritura de `lifecycle='trashed'` + `trashed_at` + `trashed_by_member_id`
- `purge` borra fila + objetos de storage + membresias (FK cascade ya lo cubre)
- **exigir `homecloud.delete`** en trash y purge

Exigir `homecloud.delete` es lo que le da por fin un proposito a una capacidad que hoy se
proyecta al cliente sin ningun efecto.

### 19.4 Contrato de visibility

| Estado | Timeline | Tipo | Album | Resurfacing | Papelera | Signed URL |
| --- | --- | --- | --- | --- | --- | --- |
| ACTIVE | visible | visible | visible si es miembro | elegible | no | accesible |
| TRASHED | **no** | **no** | **no** | **no** | **si** | **404** |
| PURGED | no existe | no existe | no existe | no existe | no existe | no existe |

`lifecycle='trashed'` debe quedar ya invisible en SQL por filtro, no por post-filtrado, igual
que hoy se hace con `staging`.

---

## 20. Trash / Restore / Purge

### 20.1 Entrada a la papelera

`Mover a papelera` disponible desde Viewer, seleccion en Timeline, Tipo, Album y Resurfacing.

Al mover a papelera:
- El Memory **desaparece de su superficie** de inmediato.
- Aparece un feedback con **`Deshacer`** durante un plazo razonable.
- `Deshacer` es un **restore completo**, no un "undo" cosmético.

### 20.2 Organizacion al mover a papelera

**Decision congelada: las membresias de album se PRESERVAN al mover a papelera.**

Razon: la papelera es una bandeja de recuperacion, no un segundo sistema de organizacion.
Si las membresías se destruyeran, restaurar un Memory lo devolveria a la casa sin sus
albums, que es peor que no restaurarlo. Preservar permite un restore coherente (§20.4).

La membresía sigue existiendo pero es **invisible** mientras el Memory esta `TRASHED`
(el filtro de album ya excluye `lifecycle != 'active'`). Se limpia al purgar.

### 20.3 Superficie Papelera

- Es una superficie de primer nivel alcanzable desde la raiz, en la misma posicion que
  Albums / Tipos, **solo si hay contenido en la papelera**.
- Empty honesto: `La papelera está vacía.` + `Deshacer` no aplica.
- Empty = **no se muestra la superficie**. Una papelera vacia no es un Album vacio.

### 20.4 Restore (semantica congelada)

| Situacion | Resultado |
| --- | --- |
| Memoria en un album que sigue existiendo | **Restaurada CON su membresia.** El album recupera el item. |
| Memoria en un album que fue eliminado mientras estaba en la papelera | **Restaurada SIN esa membresia.** Nunca se restaura en una relacion inexistente. Sin error, sin mencion. |
| N_memorials restauradas | Todas restauradas. Las que-surviven en album y las que no, silently. |
| El hogar cambio mientras estaba en la papelera | La restauracion ocurre en el hogar actual. Las membresias de otro hogar no se respetan. |
| Restore de un item ya purgado | Error honesto: ya no esta disponible. |
| Restore fallido | El item **sigue en la papelera**. Feedback honesto. |

Preservar la organizacion previa cuando sigue siendo valida. Nunca restaurar hacia una
relacion inexistente.

### 20.5 Purge

Irreversible. **Exige dialogo de confirmacion explicito**, siempre, sin excepcion.

```
Eliminar definitivamente
Esto borra los recuerdos para siempre. No se puede deshacer.

[Cancelar]  [Eliminar para siempre]
```

Si el purge es de N items, la copy dice cuantos.

Requirements:

- Requiere `homecloud.delete`.
- Verifica pertenencia al hogar en el servidor, **nunca** confia en el id del cliente.
- Borra la fila, los objetos de `homecloud-originals`, los de `homecloud-previews` y las
  membresias (FK `ON DELETE CASCADE` ya cubre membresias).
- **No existe estado "borrado" mientras los bytes sobreviven.** Si el borrado de storage
  falla, la operacion se reporta como fallida y se reintenta; no se finge exito.
- Un purge parcial de N items reporta cuantos se borraron y cuantos no, y nombra los que
  quedaron.

### 20.6 Permisos de ciclo de vida

| Operacion | Requiere |
| --- | --- |
| Mover a papelera | `homecloud.contribute` |
| Restaurar | `homecloud.contribute` |
| Borrado permanente | **`homecloud.delete`** |

---

## 21. Resurfacing

### 21.1 Decision

**IN.** HomeCloud debe comportarse como "Memories", no solo como una galeria.
Deterministico, sensible a precision, in-app. **Sin IA.**

### 21.2 Modelo de producto

`Para volver a ver` es una banda en la raiz de Memories, arriba de Albums.

Es determinista: la misma fecha produce el mismo grupo. No hay scoring, no hay "probabilidad
de que te guste".

### 21.3 Elegibilidad (determinista, congelada)

Un Memory es elegible si y solo si:

1. `lifecycle = 'ACTIVE'`
2. `hidden_from_resurfacing = false`
3. `capture_precision = 'exact'`
4. su fecha es **anterior** a hoy (un recuerdo de hoy no es un recuerdo del pasado)

**Los Memories `unknown` NO participan en resurfacing por fecha exacta.**
**Los Memories `year`-only y `month_year` NO participan en resurfacing por fecha exacta.**

Razon: "este dia" requiere dia. Inventar un dia a partir de un ano seria mentir, y esta
prohibido (§7.1). Un Memory `2024` no es "un dia de 2024".

### 21.3.1 Resurfacing es EXACT-ONLY. No existe resurfacing mensual.

Clausula de cierre, sin ambiguedad:

```
capture_precision = exact       -> ELEGIBLE  (si lifecycle=ACTIVE, !hidden, fecha pasada)
capture_precision = month_year  -> NO ELEGIBLE
capture_precision = year        -> NO ELEGIBLE
capture_precision = unknown     -> NO ELEGIBLE
```

**NO existe** un grupo `Octubre 2023 — hace 3 años`.
**NO existe** resurfacing por mes y ano en V1.
**NO existe** "este mes de hace N años".
**NO existe** un segundo motor de fechas junto al de `exact`.
**NO se abre** un gap de resurfacing mensual. No es un olvido ni una ambiguedad: es una
decision congelada.

Un `month_year` es informacion real y suficiente para **agrupar en Timeline** y para
**presentar** `oct 2023` (§7.5). No es suficiente para afirmar que algo paso "este dia".

### 21.3.2 Una fecha parcial puede volverse elegible: solo si el usuario la completa

La exclusividad de §21.3.1 no es una sentencia permanente. Hay **un unico** camino de
vuelta, y no lo ejecuta HomeCloud:

```
Memory `month_year`, `year` o `unknown`
  -> NO aparece en `Para volver a ver`                       (§21.3.1)
    -> el usuario abre `Información del recuerdo`             (§8) o edita en intake (§6.3)
      -> el usuario elige EXPLICITAMENTE una fecha exacta     (§7.3.1)
        -> capture_precision = exact
          -> la elegibilidad se evalua NORMALMENTE desde ese momento
```

Consecuencias congeladas:

1. La evaluacion de elegibilidad es **una sola funcion** y se corre en cada lectura. No hay
   estado cacheado de "ya era elegible" que una correccion de fecha tenga que invalidar.
2. El mismo Memory corregido a `exact` **aparece** en `Para volver a ver` sin ninguna
   accion adicional del usuario.
3. Un Memory corregido a una precision **parcial** (`month_year`, `year`, `Sin fecha`)
   **vuelve a quedar fuera**. La correccion puede ir en cualquier direccion y el motor no
   asume nada.
4. El cambio es de `capture_*` + `capture_precision` unicamente. No hay columna de
   "resurfacing evaluated", ni tabla de historial, ni job de re-evaluacion.
5. **No existe** camino automatico de vuelta. Ningun motor de dates, ninguna normalizacion,
   ninguna migracion convierte una fecha parcial en exacta. Si un dia existiera, seria una
   mentira de producto y un bug P0 de datos (§7.3.1).

Esta regla hace que los videos de galeria y el audio importado —que son siempre
`unknown`— **no aparezcan nunca** en `Para volver a ver` mientras el usuario no corrija la
fecha. Eso es correcto y honesto. Se resuelve dando al usuario la correccion de fecha
(§6.3 en intake, §8 despues), **nunca** con una heuristica.

### 21.4 Algoritmo de agrupacion (nivel producto)

Un grupo por fecha: las Memories elegibles cuya fecha coincide con el dia y mes de hoy
en un anio anterior. El grupo mas reciente va primero.

Cada grupo muestra Memories **de un solo anio**.

Si un mismo dia aparece en tres anios, hay **tres grupos**, no uno con tres anos. Esto
mantiene la precision de "hace 3 anios" honesta.

**La clave de agrupacion es `day` + `month`, nunca `month` + `year`.** La clave de grupo
incluye siempre el dia, y por eso solo puede construirse sobreMemories `exact`. Un
`month_year` no tiene dia con que agrupar, y por eso queda fuera antes de la agrupacion
(§21.3.1). No existe una clave de agrupacion alternativa para precision parcial.

### 21.5 Acciones de resurfacing

| Accion | Decision |
| --- | --- |
| Abrir un grupo | IN |
| Abrir un Memory en el Viewer | IN (el Viewer hace pager **solo dentro del grupo**) |
| `Agregar a un álbum` | IN |
| `Mover a papelera` | IN |
| `No mostrar este recuerdo acá` | **IN** — pone `hidden_from_resurfacing = true` |
| `Quitar del álbum` | no aplica (no hay album abierto) |
| Seleccion multiple dentro de un grupo | **IN**, preservando el grupo (§12.1) |
| Volver / cerrar | vuelve a la raiz, mismo offset |

`No mostrar este recuerdo acá` es la pieza que hace trustworthy a un resurfacing
determinista. Sin ella, un resurfacing sin IA va a sacar cosas que el usuario no quiere ver.
Los donors lo confirman: Google Photos permite ocultar personas, fechas y rangos de fechas,
y apagar la funcion entera.

### 21.6 Ocultar un grupo o un rango de fechas: OUT de V1

Los donors permiten ocultar un rango de fechas. El schema actual solo soporta
`hidden_from_resurfacing` **por Memory**. Ocultar un grupo requiere un modelo de datos
nuevo. Se declara **OUT de V1** explicitamente para no dejarlo como ambiguedad.

### 21.7 Estados

| Estado | Comportamiento |
| --- | --- |
| Hay >= 1 grupo | La banda se muestra |
| No hay grupos | **La banda no se muestra.** No es un vacio, no es un error, no es un boton deshabilitado |
| Calculando | No muestra skeleton permanente. La banda aparece cuando llega |
| Error de calculo | La banda no se muestra. No bloquea la raiz. Si es un fallo recuperable, no hay nada que recuperar: el calculo es local sobre datos ya cargados |

---

## 22. Favorites Decision

> **`FAVORITES = DEFER`**

Investigacion de donors:

| Producto | Favorites | Semantica |
| --- | --- | --- |
| Apple Photos | album `Favoritos` | **Personal.** No se sincroniza con el iCloud compartido |
| Google Photos | album `Favorites` + estrella | **Personal.** Solo en tu propia biblioteca. Una foto compartida hay que copiarla a tu biblioteca para marcarla |
| Samsung Gallery | `Favoritos` | Personal |
| Immich | toggle `favorite` por asset | **Compartido por household** |

Patron comun: en tres de cuatro, Favorites es **personal, no compartido**.

Evaluacion para HomeCloud:

| Criterio | Evaluacion |
| --- | --- |
| Valor de usuario | Real pero duplicado. Un album hace lo mismo, con un nombre que el hogar elige |
| ¿Es la semantica correcta para Memories? | **No.** Memories es la historia compartida del hogar (§1). Un favorito personal es una medida distinta dentro de la misma galeria |
| Costo de superficie | Un nuevo filtro persistente en la raiz, mas una vista de tipo mas una accion en cada superficie |
| Costo de modelo de datos | **Requiere columna nueva** + logica de visibilidad por miembro si es personal. Ninguna existe |
| Relacion con Albums | Si es compartido, es un album implicito: redundante con Albums. Si es personal, contradice §1 |
| Relacion con Resurfacing | Resurfacing ya resuelve "volver a ver lo que quiero". Favorites no agrega valor de redescubrimiento |

**Decision:** Favorites es `DEFER`, no `OUT` permanente.

- **NO** se agrega al plan de implementacion de V1.
- **NO** se agrega a la UI.
- **NO** se agrega una columna al schema.
- Se reconsidera solo si aparece evidencia de que un hogar necesita "lo que mas nos
  importa" como concepto **compartido** distinto de un album con nombre.
- Si se reconsidera como **personal**, requiere antes una decision de modelo de datos para
  visibilidad por miembro, que HomeCloud no tiene.

Esta decision **no** elimina la accion `Favorito` de una hipotetica V2; la aplaza.

---

## 23. Performance / Loading

### 23.1 Principio

> **El feedback de interaccion debe ser inmediato aunque los bytes no lo sean.**

Separar siempre tres cosas:

- **CORRECTNESS**: el resultado es el correcto.
- **PERCEIVED PERFORMANCE**: el usuario sintio que respondio.
- **REAL NETWORK COST**: cuanto costo de verdad.

Una mejora de perceived performance que miente sobre correctness es un bug.

### 23.2 Presupuesto de honestidad

| Momento | Que debe mostrar el usuario |
| --- | --- |
| Tap en un Memory | El shell del Viewer, ya visible |
| Tap en un video | El shell + poster (o spinner honesto) |
| Pull-to-refresh | El contenido actual sigue visible; el indicador aparece |
| Guardar un recuerdo | El feedback inmediato del submit; la subida se reporta aparte |
| Carga inicial | Un estado de carga distinguible del estado vacio |

Nunca: un vacio que parece "no hay recuerdos" mientras carga. Nunca: un spinner que no
puede terminar.

### 23.3 Presupuesto de red por apertura de Viewer

| Apertura | Requests |
| --- | --- |
| Imagen | 1 preview (si existe) + **1 original, solo de la pagina activa** |
| Video | 1 preview/poster (si existe) + 1 original, solo de la pagina activa |
| Audio | 1 original, solo de la pagina activa |
| Written | 0 (no hay binario) |

Con ventana de 7 paginas montadas, esto significa **como maximo 1 original por apertura**.
CURRENT llega a 7.

Deduplicacion de requests en vuelo por `contentId`. Caches de signed URL acotadas,
con margen de expiracion y limpieza en el cambio de household.

### 23.4 Refresh

- **Pull-to-refresh** montado salvo durante una sesion de seleccion.
- **Boton de refresh visible: NO.** (Decision HC2-C §9, no revertida.)
- Un refresh nunca vacia contenido ya cargado. Re-leer la pagina 0 con datos presentes **no**
  muestra skeleton.
- Todo error tiene un **retry explicito**.

---

## 24. Upload States

### 24.1 Estados reales (nombres de CURRENT, no inventados)

El vocabulario real tiene **dos capas**, y ambas se conservan:

**Job durable** (`UploadJobState`, 9 estados):

```
pending → registering → registered → uploading → verifying → finalizing → completed
                                                     ↓
                                                  failed  (retryable o terminal)
                                                     ↓
                                               cancelled
```

**Proyeccion de UI del intake** (`MemoryIntakeState.status`):

```
idle | picking | preparing | uploading | verifying | finalizing | completed | failed | cancelled
```

`staging` **no** es un estado de UI: es el `lifecycle` de la fila en base de datos, que se
setea en `register` y se resuelve en `finalize`. Un Memory en `staging` **no** es un Memory
compartido todavia, y la UI nunca debe presentarlo como ACTIVE.

### 24.2 Contrato de usuario

| Momento | Comportamiento |
| --- | --- |
| Tras enviar | Feedback inmediato. El contenido aparece en una banda de actividad, no en la Timeline todavia |
| Durante la subida | Banda global visible desde cualquier pantalla de HomeCloud: `Subiendo X · 42%` + `Cancelar` |
| Salir de la pantalla | **La subida NO se interrumpe.** El job sigue vivo |
| Volver | La banda refleja el estado real |
| Fallo | `No se pudo subir X` + `Reintentar` |
| Reintento | Manual por el usuario, o automatico si el error es retryable |
| Cancelar | Aborta la transferencia, marca el job `cancelled`, limpia el artefacto |
| Reinicio de la app | **Se recupera.** Hidratacion desde almacenamiento + sweep de huerfanos + guarda de conectividad (offline no quema jobs) |
| Nunca se hace | Un auto-loop de reintentos sobre fallos transitorios |

### 24.3 Regla de honestidad

> El contenido en staging/pending **nunca** se presenta como contenido compartido ACTIVE.

Si el usuario ve su foto en la Timeline, esta es ACTIVE. Si no esta, es pending y se dice
que esta pendiente.

### 24.4 Estados de la banda

| Situacion | Copy |
| --- | --- |
| Job fallido | `No se pudo subir {nombre}` + `Reintentar` |
| Verificando / finalizando | `Terminando…` |
| Subiendo con progreso | `Subiendo {nombre} · {n}%` + `Cancelar` |
| Subiendo sin progreso | `Subiendo {n} elementos…` + `Cancelar` |
| Pendientes | `Pendiente de subir` / `{n} elementos pendientes` |
| Nada | No se renderiza |

---

## 25. Camera Contract

Camera es **IN** y es una **fuente de intake**, no un modelo de contenido separado.

### 25.1 Pipeline unico (obligatorio)

La salida de Camera entra **exactamente** en el mismo pipeline semantico que la importacion:

```
Camera ───────────┐
Fotos y videos ───┤
Importar audio ───┼→ { artifact, capture, source }  →  BinaryMemoryDraft  →  review  →  submitBinary
Grabar audio ─────┤
                  ┘
```

Un solo `submitBinary`. Una sola subida. Un solo review. **No hay un segundo modelo de
producto para Camera.** Y `Importar audio` y `Grabar audio` **tampoco** tienen un segundo
modelo entre si: convergen en el mismo `BinaryMemoryDraft` (§6.4).

### 25.2 Permisos

| Estado | Que ve el usuario |
| --- | --- |
| Desconocido | Indicador de carga. No un error |
| Permitido | Camara lista |
| Denegado, se puede volver a preguntar | Explicacion + `Permitir cámara` + `Volver` |
| Denegado, no se puede volver a preguntar | Explicacion + `Abrir configuración` + `Volver` |
| Microfono denegado (solo video) | Copy honesto + `Reintentar` |

### 25.3 Paths

| Path | Comportamiento |
| --- | --- |
| Foto | Shutter → review |
| Video | Grabar → parar → review |
| Retake | `Repetir` → vuelve al shutter, el artefacto anterior se descarta |
| Usar | `Usar foto` / `Usar video` → entra al review de intake |
| Cancelar | `Volver` / X → descarta, sin artefactos |
| Fecha | **Instante real de captura de HomeCloud**, `exact`. No el reloj del cliente al importar |
| Album | Opcional, se pregunta en el review, no en la camara |
| Descripcion | Opcional, se pregunta en el review, no en la camara |
| Guardar | Mismo `Guardar recuerdo` que importacion |
| Subida | Mismo pipeline de §24 |
| Fallo | Copy honesto + `Reintentar`, vuelve al estado previo |
| Retorno | Al **root de Memories**, no a la ultima superficie arbitraria |

Salir de la app mientras se graba: se detiene y se libera. No queda una grabacion huerfana.

---

## 26. Permissions

### 26.1 Modelo real de CURRENT (4 capacidades)

| Capacidad | coordinator | adult | adolescent | child | senior | guest |
| --- | --- | --- | --- | --- | --- | --- |
| `homecloud.view` | SI | SI | SI | SI | SI | SI |
| `homecloud.contribute` | SI | SI | SI | **NO** | SI | **NO** |
| `homecloud.organize` | SI | SI | **NO** | **NO** | SI | **NO** |
| `homecloud.delete` | SI | SI | **NO** | **NO** | **NO** | **NO** |

Definidas en `backend/src/lib/householdPermissions.js:7-93` y espejadas en
`supabase/migrations/20260917000000_household_default_permissions_homecloud_v1.sql:78-109`.
Se computan por rol del hogar, con override por hogar.

### 26.2 Mapa de permisos por operacion (CONGELADO)

| Operacion | Requiere |
| --- | --- |
| Ver Memories, albums, tipos, papelera | `homecloud.view` |
| Crear Memory (import, camera, audio, escrito) | `homecloud.contribute` |
| **`Importar audio`** (item 3 del menu del `+`) | `homecloud.contribute` |
| Grabar audio | `homecloud.contribute` |
| **Mover a papelera** | `homecloud.contribute` |
| **Restaurar** | `homecloud.contribute` |
| Crear album | `homecloud.organize` |
| Renombrar album | `homecloud.organize` |
| Eliminar album | `homecloud.organize` |
| Agregar a album | `homecloud.organize` |
| Quitar de album | `homecloud.organize` |
| Editar fecha / descripcion / membresias | `homecloud.organize` |
| **Borrado permanente (purge)** | **`homecloud.delete`** |
| **Vaciar papelera** | **`homecloud.delete`** |

### 26.3 Hallazgo de seguridad que esta decision cierra

`homecloud.delete` esta **declarada, proyectada al cliente y nunca exigida por ninguna
ruta**. El cliente recibe `homecloud.delete: true` y no hay nada que gatear. Eso es una
capacidad de autorizacion muerta.

Alifecycle es lo que le da un proposito real. V1 **debe** exigir `homecloud.delete` en
purge y en vaciar papelera. Sin eso, cualquier miembro con `contribute` podria borrar
definitivamente el contenido del hogar.

### 26.4 Ocultamiento de acciones

Una accion no disponible **no se renderiza**. No se renderiza deshabilitada con un
tooltip. Si `organize` es falso, no hay tile de crear album, ni acciones de album, ni
acciones de seleccion que muten organizacion.

La unica excepcion: la ausencia de una accion no debe explicar por si sola una pantalla
vacia. Las superficies vacias tienen su propio copy honesto.

### 26.5 Cambio de household

- Cambiar de household **descarta**: offsets de scroll, caches de signed URL, draft de
  intake, seleccion, viewer, rail de albums, colecciones.
- **No** se filtran datos entre hogares. El backend valida pertenencia en cada lectura y
  en cada mutacion.

---

## 27. Return Contracts

### 27.1 Principio

Toda superficie secundaria declara **quien la abrio**, **que contexto debe preservar** y
**a donde vuelve**.

Los strings exactos no son obligatorios. **El contrato de producto si.**

### 27.2 Llamadores canonicos

```
root
album:<id>
type:<kind>
resurfacing:<group>
trash
intake
camera
```

Search no es un llamador: Search es OUT.

### 27.3 Matriz de retorno (CONGELADA, exhaustiva)

| Desde | Abrir | Cerrar / volver | Offset restaurado |
| --- | --- | --- | --- |
| Timeline (root) | Viewer | root, item en su posicion | si |
| Timeline (root) | Album A | **Album A** | si |
| Timeline (root) | Fotos / Videos / Audios / Notas | **ese Tipo** | si |
| Timeline (root) | Resurfacing G | **grupo G** | si |
| Timeline (root) | Papelera | **Papelera** | si |
| Timeline (root) | Intake | root, refrescado | si |
| Timeline (root) | Camera | **root**, refrescado | si |
| **Album A** | Viewer | **Album A** | si |
| **Album A** | Seleccion → accion | **Album A** | si |
| **Album A** | Seleccion → cancelar | **Album A** | si |
| **Album A** | Seleccion → `Quitar del álbum` | **Album A**, sin los items quitados | si |
| **Album A** | Resurfacing G | root | si |
| **Album A** | Papelera | Papelera | si |
| **Tipo K** | Viewer | **Tipo K** | si |
| **Tipo K** | Seleccion → cualquier accion | **Tipo K** | si |
| **Tipo K** | Album A (via agregar) | Tipo K | si |
| **Resurfacing G** | Viewer | **grupo G**, dentro del grupo | si |
| **Resurfacing G** | Seleccion → accion | **grupo G** | si |
| **Resurfacing G** | Album A (agregar) | grupo G | si |
| **Papelera** | Viewer | **Papelera** | si |
| **Papelera** | Seleccion → `Restaurar` | **Papelera**, con los items fuera | si |
| **Papelera** | Seleccion → purge | **Papelera**, con los items fuera | si |
| **Viewer** | cualquier accion | **el Viewer sigue abierto** | n/a |
| **Viewer** | `Información del recuerdo` | **el Viewer sigue abierto** | n/a |
| **Intake** | Camera | Intake (o el review, si ya habia draft) | n/a |
| **Intake** | guardar | root, refrescado | si |
| **Intake** | cancelar | root, sin cambios | si |
| **Album A** | `Eliminar álbum` | **root** | si |

### 27.4 Regla del fallback

**Root nunca es un fallback generico.**

Si una superficie no sabe de donde vino, eso es un bug de implementacion. El contrato de
producto exige que las siete superficiesreatment llamadores sean respondedas
explicitamente.

### 27.5 Preservacion de dataset en Viewer

El Viewer hace pager **exclusivamente** dentro de la fuente con la que se abrio.

| Fuente | Dataset del pager |
| --- | --- |
| `root` | Timeline completa |
| `album:<id>` | Solos Members de ese album |
| `type:<kind>` | Solo ese `kind` |
| `resurfacing:<group>` | Solo ese grupo |
| `trash` | Solo la papelera |

- La fuente es **inmutable** durante la vida del Viewer.
- Si el dataset de la fuente se vacia transitoriamente, se muestra `Missing`
  (`Este recuerdo ya no está disponible.`), **nunca** otra fuente, **nunca** el indice 0.
- Append de paginas **no** puede desplazar el contenido activo.
- Resolver el contenido activo **por `contentId`**, nunca por indice fisico.

---

## 28. State Models

### 28.1 Memory

```
                 register                finalize
   (nada) ──────────────────> STAGING ──────────────> ACTIVE
                                │                        │
                                │ (fallo de verify,      │ Mover a papelera
                                │  queda en staging)      ▼
                                │                     TRASHED
                                │                        │
                                │  purge                │ Restaurar
                                ▼                        ▼
                             (eliminado)              ACTIVE
                                                         │
   Purged: la fila desaparece y los bytes desaparecen     │ Eliminar definitivamente
                                                         ▼
                                                    (eliminado)
```

| Estado | Visible en Timeline | En Tipo | En Album | En Resurfacing | En Papelera | Bytes |
| --- | --- | --- | --- | --- | --- | --- |
| STAGING | no | no | no | no | no | en transito |
| ACTIVE | si | si | si | si | no | completos |
| TRASHED | no | no | no | no | si | completos |
| (eliminado) | no | no | no | no | no | eliminados |

### 28.2 Album

```
   create ──> ACTIVE ──> (hard delete) ──> (no existe)
```

Un solo estado. Sin trash, por decision (§10.2).

### 28.3 Album Membership

```
   agregar ──> existe
                  │  (el Memory va a TRASHED -> se preserva, invisible)
                  │  (el Memory se purga      -> se elimina por FK cascade)
                  │  (el Album se elimina    -> se elimina por FK cascade)
                  └── quitar ──> no existe
```

**La membership sobrevive al trash del Memory.** Se destruye con el purge o con el album.

### 28.4 Selection

```
   normal
     │  long press / D4
     ▼
   selecting { purpose, selectedIds, excludedIds }
     │  ├─ tap        -> toggle
     │  ├─ drag       -> rango contiguo
     │  ├─ ⋯          -> hoja de acciones
     │  │                ├─ exito      -> normal (mismo llamador)
     │  │                ├─ exito parcial -> selecting (solo fallidos)
     │  │                └─ fallo      -> selecting (intactos)
     │  └─ X / gesto    -> normal (mismo llamador, mismo offset)
     ▼
   normal
```

`purpose` es `{generic}` | `{addToAlbum, albumId}` | `{removeFromAlbum, albumId}`.
El llamador **nunca** es parte de la sesion: es estado de pantalla.

### 28.5 Viewer

```
   abrir(desde, contentId)
     │
     ▼
   aligning  ── el pager se alinea al contentId pedido, con opening lock
     │
     ▼
   active    ──┬─ swipe -> otro contentId de la MISMA fuente
               ├─ cerrar -> Surface(caller) restaurada
               └─ dataset vacio -> Missing
```

Nunca: fallback a indice 0. Nunca: cambio de fuente. Nunca: escritura de
`activeContentId` antes de que la alineacion este establecida.

### 28.6 Upload

Ver §24.1. Los dos vocabularios (job durable + proyeccion de UI) coexisten.

### 28.7 Intake

```
   idle
     │ abrir create
     ▼
   (sheet: 5 acciones planas de primer nivel, §4.1)
     │  ├─ 1 Fotos y videos -> picker(sin feather)  ────────> review
     │  ├─ 2 Capturar momento -> camera(permisos) -> capture ─> review
     │  ├─ 3 Importar audio  -> picker de audio ───────────> review
     │  ├─ 4 Grabar audio    -> grabador ──────────────────> review
     │  └─ 5 Escribir un recuerdo ────────────────────────> formulario escrito
     ▼
   submitting
     │  ├─ exito   -> completed -> onComplete -> root
     │  └─ fallo   -> failed -> Reintentar | cerrar (el draft se conserva)
     ▼
   idle
```

### 28.8 Camera

```
   permission: unknown -> granted | denied(canAskAgain) | denied(permanent)
     │
     ▼
   ready ── shutter ──> capturing ──> captured ── "Usar" ──> review (intake)
     ▲                     │              │
     └────── "Repetir" ────┴──────────────┘
```

AppState fuera de `active` -> invalidar, detener, volver a `ready`.

### 28.9 Resurfacing visibility

```
   ACTIVE + exact + anterior a hoy + !hidden_from_resurfacing
        │
        ├─ "No mostrar este recuerdo acá" -> hidden_from_resurfacing = true
        │                                          │
        │                                          ▼
        │                                    excluido para siempre
        │                                    (reversible solo por API, no hay UI de re-inclusion en V1)
        ├─ Mover a papelera -> TRASHED -> excluido
        ├─ Restaurar -> ACTIVE -> vuelve a ser elegible
        └─ el usuario edita la fecha a `exact` (§7.3.1)
                 -> el diagrama se vuelve a evaluar desde arriba en la siguiente lectura
```

Un Memory que **nunca** fue `exact` (`month_year`, `year`, `unknown`) no tiene entrada a
este diagrama: queda fuera desde el principio (§21.3.1). Editar su fecha a `exact` es lo
unico que lo hace entrar. Ningun otro estado lo saca ni lo mete.

---

## 29. Accessibility / Safe Areas

| Regla | Decision |
| --- | --- |
| Hit area minimo | **44x44** en todo control, incluido el cierre del Viewer |
| Safe area | **Todas** las superficies la consultan. Cero constantes magicas |
| Viewer | Oculta navbar global, selector global, header de pagina, AppTopBar |
| Contraste | El chrome del Viewer es sobre media: contraste garantizado en ambos modos |
| Etiquetas de accion | Toda accion tiene etiqueta textual o `accessibilityLabel` explicito |
| Anuncio de estado | Un estado de carga se anuncia (`accessibilityState={{busy:true}}`), no se infiere de un color |
| Elemento no decorativo | Nunca un contenedor vacío que simule contenido |
| Texto legible | Todo texto visible dentro de un componente de texto. Cero strings sueltos |
| Selected state | `accessibilityState={{selected:true}}` en elementos seleccionables |
| Dynamic Type | El texto no se trunca de forma que pierda informacion essential |
| Reduce Motion | Las transiciones de chrome respetan la preferencia del sistema |

---

## 30. Explicit Non-Goals

Lo que Memories V1 **no** es, aunque se pueda construir:

- No es un buscador.
- No es un editor de video.
- No es un visor de audio profesional.
- No es una maquina de collage ni de memory movies.
- No es un DMS con tags libres.
- No es un mapa.
- No es un catalogo de caras.
- No es un feed.
- No es un buzón de notificaciones.
- No es un gestor de archivos con galeria.
- No es un producto de AI.

Memories responde a una pregunta: *¿el hogar todavia puede encontrar y volver a ver lo que
vivio?*

---

## 31. Product Closure Criteria

Memories V1 esta **cerrado** cuando un iPhone fisico puede recorrer, de punta a punta, sin
bloqueos y sin sorpresas:

1. Entrar a Memories por primera vez con 0, 1 y N albums. Estados correctos, sin skeleton
   permanente.
2. Crear un recuerdo desde cada modo: galeria, camara foto, camara video, **audio importado**,
   **audio grabado**, recuerdo escrito. Los dos modos de audio se alcanzan como **acciones
   de primer nivel distintas** del menu del `+`, sin submenu (§4.1.1).
2b. Corregir la fecha de un audio importado de `Sin fecha` a una fecha exacta — en intake y
   despues en `Informacion del recuerdo` — y verificar que a partir de ahi ya aparece en
   `Para volver a ver` (§21.3.2).
3. Ver la fecha derivada, **corregirla**, y verla persistida.
4. Ver el recuerdo en Timeline con la fecha correcta.
5. Crear un album desde el tile final del riel.
6. Seleccionar N Memories y crear un album **desde la seleccion**, con los Memories
   adjointos automaticamente.
7. Entrar en Album A, seleccionar, y **verificar que sigue en Album A** en todo momento.
8. `Quitar del álbum` y verificar que el Memory sobrevive y sigue en Recuerdos.
9. Abrir imagen, video, audio y escrito desde Timeline, Album, Tipo y Resurfacing. En todos
   los casos: el item exacto abre, el shell es inmediato, y cerrar devuelve al contexto
   correcto.
10. Verificar zoom de imagen en el dedo.
11. Verificar que un video largo muestra poster de inmediato y no una espera opaca.
12. Verificar que el audio tiene seek, +/-10 y velocidad.
13. Mover a memoria a la papelera, usar `Deshacer`, y luego abrir la Papelera.
14. Restaurar, y verificar que conserva su album si el album sigue existiendo.
15. Borrado permanente con confirmacion.
16. Ver `Para volver a ver` con contenido real, y `No mostrar este recuerdo acá`.
17. Editar metadata desde `Informacion del recuerdo`.
18. Verificar que ninguna media ni accion queda bajo la navbar global.
19. Cambiar de household y verificar que no queda residuo del anterior.
20. Con `organize = false`, verificar que no hay affordances de organizacion.
21. Con `contribute = false`, verificar que no hay `+`.
22. Con `delete = false`, verificar que no hay borrado permanente.

Y cuando **todo** lo anterior es cierto en el dispositivo:

- Ningun skeleton permanente.
- Ningun fallback a la raiz.
- Ninguna accion destructiva sin confirmacion.
- Ningun dato que el usuario pueda entrar y HomeCloud ya sepa.
- Ninguna operacion de una sola accion disponible por dos caminos UI.
- Ningun menu que crezca sin limite.
- Cero warnings de runtime.
- Cero falsos "exito" en operaciones que quedaron pendientes.

---

## 32. Donor Comparison Table

Solo capacidades que afectan una decision real de este documento.

| Capacidad | Apple | Google | Samsung | Immich | Patron comun | Decision HomeCloud | Razon |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create visible desde la galeria | si | si | si | si | siempre | **IN** | Una galeria sin ruta para agregar esta incompleta |
| Menu de create con subniveles | no | no | no | no | menu plano | **menu plano de 5 acciones, sin submenu** (§4.1.1) | `Importar audio` y `Grabar audio` son intenciones distintas; un submenu `Audio >` para eso cuesta mas de lo que aporta |
| Crear album desde el riel de albums | `Edit → +` | `+` en la pestana Albums | `+` en la lista | `Create album` | accion dedicada en la seccion de albums | **tile final del riel, sin `+ Nuevo` en el header** | El header action compite con el titulo; el tile final hace lo que el usuario espera y sobrevive con 0 albums |
| Crear album desde una seleccion | si (`Add to Album → New Album`) | si (`+ → Add to → Create new`) | si (`+` en el mismo dialogo) | si (mismo dialog, tabs Albums/Create) | **si, en los cuatro** | **IN, mismo flujo logico** | Es el patron mas universal y el de menor friccion: no hacer reseleccionar |
| Devolver al llamador tras crear album | vuelve al origen | vuelve al origen + notificacion con `View album` | vuelve al origen | el commit #8270 lo arreglo porque **perdia** el scroll | volver al origen | **volver al llamador, offset preservado** | El caso de Immich es evidencia de que este detalle se rompe si no se congela |
| Seleccion preserva contexto | si | si | si | si | siempre | **INVARIANTE DURO** | Es la expectativa universal y hoy esta rota en Album |
| Ver como superficie inmersiva | si | si | si | si | siempre | **IN, chrome global oculto** | Es lo que el usuario ya espera de un visor |
| Borrar -> papelera con restore | `Recently Deleted`, 30 dias | papelera | papelera | papelera con restore | los cuatro | **IN: Trash / Undo / Restore / Purge** | Recuperar es un trabajo nuclear del producto (§1) |
| Borrado permanente exige confirmacion | si | si | si | si | los cuatro | **IN, sin excepcion** | Es irreversible |
| Solo quien agrego puede purgar (biblioteca compartida) | si | si | si | no documentado | mayoria | **IN, `homecloud.delete`** | da destino a una capacidad hoy muerta |
| Archive | no | no (en chat) | no | no | no | **OUT** | Tercer estado es ambiguedad |
| Oculto / privado | `Hidden` (separado de Recently Deleted) | oculto por personas/fechas | oculto | no | mayoria | **OUT** | Memories es compartido por diseno |
| Ocultar de resurfacing | n/a | si (personas, fechas, rangos, y apagar todo) | no | no | Google | **IN: "No mostrar este recuerdo acá"** | Sin esto, un resurfacing determinista no es confiable |
| Resurfacing por fecha | `On This Day` | `Rediscover This Day` (mismo dia, anios anteriores) | no | no | los dos | **IN, deterministico, sin IA** | La version de Google es exactamente deterministica: mismo dia, anios previos |
| Ocultar un rango de fechas en resurfacing | no | si | no | no | solo Google | **OUT de V1** | Requiere modelo de datos que no existe |
| Busqueda | si | si | si | si | los cuatro | **OUT** | Decision explicita. Un hogar no tiene el problema de escala que la resuelve |
| Favoritos | personal | personal | personal | household | **personal en 3 de 4** | **DEFER** | Personal contradice "historia compartida"; compartido duplica Albums |
| Personas / caras | si | si | si | si | los cuatro | **OUT** | ML |
| Mascotas | si | si | si | no | los cuatro | **OUT** | ML |
| Lugares / mapa | si | si | si | si | los cuatro | **OUT** | Geolocalizacion + mapa |
| OCR / busqueda de sonido | si | si | no | no | Apple/Google | **OUT** | ML |
| Waveform de audio en visor | no documentado | no documentado | no documentado | no | **ninguno lo muestra** | **diseño honesto no-waveform en V1** | Ningun donor lo hace; la API de muestreo es de reproduccion y platform-gated |
| Editar imagen (crop/filtros) | si | si | si | no | mayoria | **OUT** | Memories no es editor |
| Video en fullscreen | si | si | si | si | los cuatro | **IN** | Es control basico, no avanzado |
| Velocidad de reproduccion | si | si | si | si | los cuatro | **OUT de V1 para video, IN para audio** | El chrome nativo de video ya posee esa superficie |
| Reproductir en background | si | no | si | si | la mayoria | **OUT de V1** | No es un trabajo nuclear de Memories |

**Regla de uso de esta tabla:** es evidencia, no autoridad. Ninguna capacidad entra en
HomeCloud solo porque un donor la tenga. Cada fila tiene una razon de decision propia.