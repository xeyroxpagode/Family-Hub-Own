# HOMECLOUD MEMORIES — FINAL IMPLEMENTATION PLAN

```
STATUS:        HOMECLOUD_MEMORIES_FINAL_IMPLEMENTATION_PLAN
DERIVED FROM:  HOMECLOUD_MEMORIES_FINAL_PRODUCT_TRUTH.md   (PATCHED 2026-10-05)
               HOMECLOUD_MEMORIES_FINAL_PATH_MATRIX.md     (PATCHED 2026-10-05, 155 paths)
               HOMECLOUD_MEMORIES_FINAL_CURRENT_GAP.md     (PATCHED 2026-10-05, 179 gaps)
BASELINE:      homecloud/memories-lane @ 3b248f7
SCOPE:         Plan de ejecucion. ESTE DOCUMENTO NO IMPLEMENTA NADA.
NOTA:          Las secuencias Run A / Run B de HC2 NO son autoritativas. Los gaps
               se reordenan por dependencia real, no por historia.
```

---

## 1. Authority

Orden de autoridad, de mayor a menor. Un stage **nunca** puede contradecir (1).

| # | Fuente | Que aporta | Que NO puede hacer |
| --- | --- | --- | --- |
| 1 | `HOMECLOUD_MEMORIES_FINAL_PRODUCT_TRUTH.md` (patched) | Que es el producto V1 | — |
| 2 | `HOMECLOUD_MEMORIES_FINAL_PATH_MATRIX.md` (patched) | Los 155 paths con sus 13 campos | — |
| 3 | `HOMECLOUD_MEMORIES_FINAL_CURRENT_GAP.md` (patched) | Los 179 gaps con status, evidencia, capa | — |
| 4 | Codigo, schema y dependencias de CURRENT | Que existe y donde | No decide producto |
| 5 | Tests | Evidencia de comportamiento | Un test verde no sobreescribe un bug observado en un iPhone |
| 6 | Planes de implementacion viejos de HC2 | Trabajo reutilizable | **No** impone boundaries de stage ni orden |

### 1.1 Reglas de interpretacion

1. **Evidencia manual/runtime prevalece sobre test declarativo.** P1-P9 son autoridad sobre
   cualquier asercion de `scripts/homecloud_*`.
2. **Fingerprints de CURRENT son autoridad sobre descripciones.** Si un gap dice
   `MemoryIntake.tsx:677`, ese archivo se lee primero.
3. **Un gap `DEFERRED` o `EXISTING_UNUSED_CAPABILITY` no se abre.** Si un stage lo necesita,
   es solo para **preservar** el comportamiento existente.
4. **Un gap `IMPLEMENTED` no se reimplementa.** Se preserva y, si el stage lo toca, se
   re-verifica.
5. **Device-only no se cierra con test.** Un stage que cierre un gap DEVICE_ONLY necesita su
   puerta fisica en el **mismo** stage (ver §6).

---

## 2. Final Baseline

### 2.1 Git

| Dato | Valor |
| --- | --- |
| Worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-current` |
| Branch | `homecloud/memories-lane` |
| HEAD de plan | `3b248f7` — `docs(homecloud): finalize memories product decisions` |
| HEAD previo | `02662ac` — `docs(homecloud): freeze final memories product truth` |
| Push | **NO** |

Dirt preexistente, **preservado, nunca stageado**:

```
 M backend/src/services/homecloudIntakeService.js     (+12, bloque TEMPORARY DIAGNOSTIC S2-i)
 ?? CURRENT_AUDIT_AFTER_SLICE_01.md
 ?? T1_FINAL_WIP.patch
```

Ese `console.log` del origin de la signed URL es **instrumentacion de QA de upload**, no de
reproduccion, y **no aplica a P1**. No se toca, no se stagea, no se incluye en ningun commit
de este plan.

### 2.2 Lo que CURRENT ya resuelve y este plan **preserva** (no reimplementar)

| Capacidad | Fingerprint | Por que no se toca |
| --- | --- | --- |
| Album membership N:M | `homecloudAlbumService.js:236-270,349-371` | Correcto; `ON DELETE CASCADE` cubre membresias |
| Schema de fecha semantica + 15 CHECKs | `20260910000000:32-34,84-85,137-138` | `capture_semantics_check` ya prohibe dia sintetico |
| Componente de fecha editable | `MemorySemanticDateFields.tsx:13-18,48-100` | **Construido y desconectado**: conectar, no crear |
| Intake binario | `homecloudMemoryIntakeService.ts` | Un solo `submitBinary`, un solo review |
| Camera capture | `MemoryCameraSurface.tsx` | Pipeline compartido ya verificado en 4 puntos (CAM-01) |
| Audio recorder | `MemoryAudioRecorder.tsx` | Fuerza/restaura `setAudioModeAsync` |
| **Audio import** | `homecloudMemoryPicker.ts:128-146` | **Se preserva entero**; solo cambia el enrutado del menu |
| Upload engine | `homecloudUploadEngine.ts` | La parte mas solida del repo |
| Native signed PUT | `authorizeHomeCloudOriginalUpload` | Intocable desde este carril |
| Verify-first recovery | `homecloudUploadRecovery.ts:42-141` | Correcto y sutil |
| Seleccion D4 | `homecloudMemoryDrag.ts` | 209 + 90 tests, device QA ya pasada |
| Fuentes del Viewer | `homecloudMemoryViewerSource.ts:21-68` | 3 factories; las nuevas son aditivas |
| Video player lifecycle | `MemoryVideoPage.tsx:66,125,160-163` | Hook como unica autoridad de release |
| Audio player lifecycle | `MemoryAudioPage.tsx:30-33,117-118` | Idem; `isBuffering` es lo unico que falta |
| Timeline | `homecloudMemoriesTimeline.ts:70,158-192,270-275` | Orden total determinista ya correcto |
| Album read model | `homecloudMappers.js:159-165,206-225` | `throw` si falta el agregado: no inventa numeros |
| `trashed_at` / `trashed_by_member_id` / CHECK | `20260910000000:32-34,84-85,137-138` | **Ya en schema.** `trashed` no requiere migracion |
| `hidden_from_resurfacing` | `20260925000000:50` + validacion backend | **Ya persistido, validado, proyectado** |
| Capacidad `homecloud.delete` | `householdPermissions.js:85-92` + SQL `:102-109` | Declarada y proyectada; falta exigirla |
| Signed URL 404 para no-ACTIVE | `homecloudStorageAccess.js:106-108` | El mecanismo de seguridad de la papelera ya funciona |
| `react-native-safe-area-context@5.7.0` | `package.json:52` | **Instalada**: VIEW-01 sin dependencia nueva |
| `react-native-calendars@1.1314.0` | `package.json:48` | **Instalada**: fecha editable sin dependencia nueva |
| `expo-sharing` + `homecloudDownloadService` | `package.json:39` | Costura probada en Files: OS share sin dependencia nueva |
| `useAudioSampleListener` | `expo-audio/src/ExpoAudio.ts:238,240` | Candidato V1.1; **no** bloquea V1 |
| `Clipboard.setString` (RN core) | instalado, en deprecacion | Aislar la llamada; `expo-clipboard` **no** se agrega |

### 2.3 Estado de las 4 capacidades

| Capacidad | coordinator | adult | adolescent | child | senior | guest |
| --- | --- | --- | --- | --- | --- | --- |
| `homecloud.view` | SI | SI | SI | SI | SI | SI |
| `homecloud.contribute` | SI | SI | SI | **NO** | SI | **NO** |
| `homecloud.organize` | SI | SI | **NO** | **NO** | SI | **NO** |
| `homecloud.delete` | SI | SI | **NO** | **NO** | **NO** | **NO** |

`homecloud.delete` se proyecta al cliente y **0 rutas la exigen** (LIFE-04, CAP-01).

---

## 3. Product Delta Applied This Session

Tres decisiones explicitas, aplicadas a las cuatro autoridades en los commits `3b248f7` (audio patch) y `HEAD` (final roadmap delta). Este plan se deriva **de las versiones parcheadas**.

### 3.1 `Importar audio` = IN V1 (patch de audio 2026-10-05)

| | Antes | Despues |
| --- | --- | --- |
| Menu de create | **4** items | **5** items, planos, sin submenu |
| Orden | `Fotos y videos`, `Capturar momento`, `Grabar audio`, `Escribir un recuerdo` | `Fotos y videos`, `Capturar momento`, **`Importar audio`**, `Grabar audio`, `Escribir un recuerdo` |
| Camino de audio importado | `Fotos y videos` -> hoja `Elegir contenido` -> `Audio` | `+` -> **`Importar audio`** -> picker de audio |
| `Fotos y videos` | ofrecia galeria **y** audio | ofrece **solo** imagen y video |
| Submenu `Audio >` | — | **NO**, confirmado |
| `Nuevo album` en create | NO | **NO**, confirmado |
| Capacidad de fondo de audio | preservada | **preservada sin cambios** |
| Gaps | — | `CRT-07` MISSING, `CRT-08` IMPLEMENTED, `CRT-09` BROKEN, `CRT-10` PARTIAL, `INTAKE-03b` MISSING, `INTAKE-03c` IMPLEMENTED |
| Paths | — | `B-07`, `B-08`, `B-09`, `B-10`, `K-01b` |

### 3.2 Exact-only resurfacing, con un unico camino de vuelta (patch de audio 2026-10-05)

| `capture_precision` | Elegibilidad | Cambio |
| --- | --- | --- |
| `exact` | **elegible** si `ACTIVE` + `!hidden` + fecha pasada | sin cambio |
| `month_year` | **NO elegible** | ahora explicito |
| `year` | **NO elegible** | ahora explicito |
| `unknown` | **NO elegible** | ahora explicito |
| `partial -> exact` | **solo por eleccion explicita del usuario** | **NUEVO** (`DATE-11`) |
| Fecha parcial corregida | elegible en la siguiente lectura | **NUEVO** (`RESURF-08`) |
| Resurfacing mensual | — | **OUT de V1 explicito** (`RESURF-09`) |
| Dia sintetico | — | **PROHIBIDO**, sin excepcion |

Gaps: `DATE-11` MISSING, `RESURF-08` MISSING, `RESURF-09` IMPLEMENTED por decision.
Paths: `D-05b`, `Q-08`, `Q-09`.

### 3.3 Final Roadmap Delta — 7 capacidades reabiertas (2026-10-06)

| Capacidad | Decision anterior | Nueva decision | Alcance |
| --- | --- | --- | --- |
| Favorites (star/toggle) | DEFER | **IN** — HOUSEHOLD_SHARED | Migration + backend + frontend + device QA |
| Automatic `Favoritos` collection | DEFER | **IN** — Smart collection in Albums rail | Frontend (tile + dataset + factory) |
| Multi-select Share | DEFER | **IN** | OS share N-items + temp lifecycle + caller preservation |
| Image double-tap zoom/reset | DEFER | **IN** | Detector + PanResponder (or RNGH if evidence) |
| Video double-tap ±10s | DEFER | **IN** | Zone detector + seek + arbitration |
| Real waveform | V1.1-only / CANDIDATE | **IN ROADMAP** — required before closure | Live/static/progressive strategy + device QA + fallback |
| Platform-native audio routing | DEFER | **IN / PRESERVE / DEVICE VERIFY** | No custom picker; verify iOS/Android native surfaces |

Gaps nuevos: `FAV-01`..`FAV-06` (6), `MS-01`..`MS-05` (5), `IMG-05`,`IMG-06` (2), `VID-07`,`VID-08` (2), `AUD-05`,`AUD-06`,`AUD-07` (3). Total **+23 gaps**.
Paths nuevos: `FAV-01`..`FAV-12` (12), `MS-01`..`MS-08` (8), `I-05`,`I-06` (2), `J-07`,`J-08` (2), `K-05`,`K-06`,`K-07` (3). Total **+27 paths**.

### 3.4 Conteos tras el final roadmap delta

| | Pre-delta | Post-delta |
| --- | --- | --- |
| Paths | 155 | **192** |
| Gaps | 179 | **202** |
| `IMPLEMENTED` | 71 | **71** |
| `PARTIAL` | 34 | **34** |
| `MISSING` | 33 | **56** |
| `BROKEN` | 16 | **16** |
| `DEFERRED` | 15 | **15** |
| `STALE` | 3 | **3** |
| `EXISTING_UNUSED_CAPABILITY` | 7 | **7** |

`CRT-01` paso de `IMPLEMENTED` a `PARTIAL`: CURRENT expone la gramatica vieja de 4 items.
La decision de **NO submenu sigue cumplida**; lo que se corrige es el conteo de items y la
promocion de `Importar audio`.

---

## 4. CURRENT -> TARGET Summary

Metodo por slice: **CURRENT -> TARGET -> REAL GAP -> minimum safe slice**.

| Dominio | CURRENT | TARGET | REAL GAP | Cantidad |
| --- | --- | --- | --- | --- |
| Lifecycle backend | 24 rutas, 0 de trash/restore/purge | 3 transiciones + escritura `trashed` | Endpoints, escritura, gate `delete` | 8 |
| Patch de metadata | unica ruta `PATCH` de contenido es de Files | `PATCH` de memory con 3 grupos de campos | Endpoint + servicio + validacion | 3 |
| Create menu | 4 items, audio detras de 2o nivel | 5 items planos | Enrutado de menu | 3 |
| Fecha en intake | 3 `AppText` read-only | 4 precisiones editables | Componente ya existe, desconectado | 6 |
| Fecha post-guardado | no existe | PATCH desde Info | Falta endpoint y superficie | 3 |
| Seleccion en Album | pierde el dataset del llamador | preserva | 2 gates | 4 |
| Viewer shell | `View` + `zIndex:20`; navbar tapa 102 px | inmersivo + safe-area | Ocultar chrome, no taparlo | 3 |
| Acciones | 3 en seleccion, 0 en Viewer | autoridad unica | Action authority compartido + `...` | 11 |
| Albums | `+ Nuevo` en header | tile final del riel | Mover la affordance | 6 |
| Crear album desde seleccion | inexistente por decision de codigo | mismo flujo logico | Selector con `Nuevo album` | 1 |
| Resurfacing | ninguna superficie | banda + grupo + ocultar | Superficie + viewer factory | 5 |
| Papelera | ninguna | superficie + restore + purge | UI sobre backend de ST-1 | 5 |
| Video | sin poster | poster + senal honesta | Falta `useMemoryPreviewUrl` en la pagina | 2 |
| Imagen | hasta 7 originales por apertura | 1 | `ImagePage` sin prop `active` | 5 |
| Audio Viewer | sin +/-10, sin velocidad, identidad pobre | controles V1 + identidad honesta | 3 controles + diseno | 6 |
| Zoom imagen | 4 defectos, feel roto | usable en el dedo | Decision sin dependencia nueva | 2 |
| Batch intake | `allowsMultipleSelection:false` | lote con N fechas | Dominio batch completo | 2 |
| Camera | relampago sin destinos frescos | cierra al intake final | 2 huecos | 2 |
| **Favorites** | sin columna, sin endpoint, sin UI, sin coleccion | `favorite` boolean + PATCH + star toggle + smart collection | Migracion + backend + action authority + Albums rail tile + viewer factory | 8 |
| **Multi-select Share** | accion `Compartir` solo single; `homecloudDownloadService` con fuga | OS share N-items + `Paths.cache` + cleanup + caller preservation | action authority + download service fix + temp lifecycle | 5 |
| **Image double-tap** | `DEFERRED` (sin detector) | zoom at tap + reset at zoom | Detector tap-count + PanResponder/RNGH decision | 2 |
| **Video double-tap ±10s** | `DEFERRED` (sin detector) | left -10s / right +10s + clamp + arbitration | Zone detector + seek + pager/fullscreen arbitration | 2 |
| **Real Waveform** | `DEFERRED` / V1.1 candidate | IN ROADMAP: live/static/progressive + device QA | Strategy decision + `useAudioSampleListener` QA + fallback | 3 |
| **Platform Audio Routing** | `DEFERRED` (custom picker asumido) | IN / PRESERVE / DEVICE VERIFY (no custom picker) | Device QA iOS/Android native surfaces | 1 |

---
 
## 5. Dependency Graph
 
Recomputado desde las autoridades parcheadas. **No** es una secuencia; explica por que un
contrato depende de otro. Los IDs son de `FINAL_CURRENT_GAP` y `FINAL_PATH_MATRIX`.
 
```
LIFE-04 (exigir homecloud.delete)              <- P0 SEGURIDAD, sin dependencia
  `- BLOQUEA: TRASH-04, TRASH-05, TRASH-07, TRASH-01, LIFE-01(UI), O-04, P-06, P-07, P-08
     "si se implementa purge sin el gate, un hole latente se vuelve explotable"
 
LIFE-01 (endpoints + escritura 'trashed')
  |- requiere LIFE-04
  |- requiere LIFE-03 (escritura) y su CHECK ya existente
  `- desbloquea TRASH-01/03/04/05, LIFE-01(UI), O-01/02/03, P-01..P-12
 
LIFE-05 (sweep de staging) + UPL-04 (reintento de verify)
  `- independientes de la UI; bloquean la honestidad del pipeline
 
INFO-03 (PATCH de memory)
  `- desbloquea DATE-04 (correccion post-guardado)
       `- desbloquea DATE-11 (partial -> exact)
            `- desbloquea RESURF-08 (corregido => elegible en resurfacing)
 
DATE-03 (fecha editable en intake)             <- NO depende de nada
  |- el componente YA EXISTE, solo esta desconectado
  `- cierra INTAKE-03b (la `Sin fecha` del audio importado deja de ser terminal)
 
VIEW-08 (menu de acciones del Viewer)
  `- desbloquea ALB-13, INFO-01, WRIT-04/05/06, RESURF-06, LIFE-01(acciones de UI)
 
ACT-01 (action authority compartida)
  |- requiere VIEW-08 para servir al Viewer
  `- desbloquea ACT-02, ACT-03, N-01, N-04, N-05, N-06, N-07, **FAV-02, FAV-03, MS-01**
 
VIEW-01 (inmersividad + safe-area)
  |- NO requiere dependencia nueva (safe-area-context instalada)
  |- NO requiere Modal -> ver 5.1
  `- introduce riesgo de dos modales -> exige revisar CRT-03/ACT-08
 
SEL-03 (gates de overlay)                       <- NO depende de nada
  `- desbloquea TYP-03, SEL-06, y es precondicion de ALB-12
 
ALB-12 (crear album desde seleccion)
  |- requiere SEL-03 (el dataset del llamador debe seguir siendo correcto)
  `- requiere el action authority para la accion de seleccion
 
RESURF-01 (banda)
  |- requiere una viewer factory nueva (aditiva, misma fuente inmutable)
  `- su cierre debe dejar cerrado RESURF-09 (nada de month_year/year)
 
CRT-07 + CRT-09 (`Importar audio` de primer nivel)
  |- NO dependen de DATE-03: la `Sin fecha` del audio importado es correcta
  |  aunque no sea corregible (P9 ya lo trata)
  |- NO dependen de nada: es enrutado de menu en un unico ActionSheet
  `- su aceptacion incluye la AUSENCIA de la hoja `Elegir contenido`
 
FAV-01 (columna favorite)                       <- NO depende de nada
  `- desbloquea FAV-02, FAV-03, FAV-04, FAV-05
 
FAV-04 (tile Favoritos en rail)                 <- requiere ALB-02 (tile final rail)
  |- requiere FAV-01 (columna)
  `- desbloquea FAV-05 (viewer factory)
 
FAV-05 (viewer factory favorites)               <- requiere FAV-01, FAV-04
  `- desbloquea FAV-06 (permission gate)
 
MS-01 (multi-share OS)                          <- requiere ACT-01 (action authority)
  |- requiere homecloudDownloadService fix (temp cleanup)
  `- desbloquea MS-02, MS-03, MS-04, MS-05
 
IMG-05 (double-tap detector)                    <- NO depende de nada (PanResponder) / requiere RNGH si evidencia
  `- desbloquea IMG-06 (reset detector)
 
VID-07 (double-tap zone detector)               <- NO depende de nada (PanResponder) / requiere RNGH si evidencia
  |- debe arbitrar con pager, fullscreen, native controls
  `- desbloquea VID-08
 
AUD-05 (waveform strategy)                      <- requiere device QA `useAudioSampleListener`
  |- si live: requiere `isAudioSamplingSupported` + `RECORD_AUDIO` Android
  |- si static: requiere client decode / backend derivative (SHARED_INFRA_BLOCKER?)
  `- desbloquea AUD-06 (fallback)
 
AUD-07 (platform routing verify)                <- NO depende de nada (device QA only)
  `- custom picker = OUT confirmado
```

### 5.1 Decision de arquitectura para VIEW-01: sin `Modal` (congelada)

El riesgo real: `MemoryViewer` hoy es un `View` con `{...absoluteFill, zIndex:20}`
(`MemoryViewer.tsx:206,291`). El navbar global es un **hermano** con `zIndex:10`
(`HomeTabNavigator.tsx:431`), y `zIndex` **no es transitivo** entre subarboles en RN, asi
que el navbar pinta encima. Convertir el Viewer en `Modal` lo arreglaria, pero `ActionSheet`
**tambien** es un `Modal` (`ActionSheet.tsx:46,134`), y el producto congela **un solo host
modal a la vez** (§4.2, §5 del Product Truth). Un Viewer-`Modal` mas un
`ActionSheet`-`Modal` es exactamente el `nested modal stack` prohibido.

Tres opciones evaluadas contra CURRENT:

| Opcion | Que implica | Veredicto |
| --- | --- | --- |
| **A. `Modal` para el Viewer** | Arregla el z-index, pero cualquier `...` de acciones abre un segundo `Modal`. Resuelve `VIEW-01` creando el riesgo `R13` | **RECHAZADA** |
| **B. Ocultar el chrome global por estado, manteniendo `View`** | Un seam de una sola direccion: `HomeCloudMemoriesScreen` -> `HomeCloudScreen` -> `HomeTabNavigator` publica "viewer abierto" y navbar + segmented control + `AppTopBar` **se ocultan**. El Viewer ocupa el area liberada, con `useSafeAreaInsets()` | **ELEGIDA** |
| **C. `Modal` + hoja no-modal dentro** | Anade un modo `inline` a `ActionSheet`, que es UI kit compartido con Files | **RECHAZADA**: toca shared UI para ahorrar un seam de una direccion |

**Elegida: B.** Cumple literalmente el requisito de producto —*inmersivo, safe-area correcto,
por encima del chrome global, navbar oculto*— sin crear ningun `Modal` nuevo, sin tocar
`ActionSheet`, sin tocar el navigator mas alla de ocultar un elemento que ya sabe ocultarse
(`HomeCloudScreen` ya tiene un estado `hidden`). `CRT-03` y `ACT-08` siguen siendo
`IMPLEMENTED` **sin tocar**, porque nada cambia en el mundo de los modales. `zIndex` se
elimina como mecanismo de immersive-ness y se reemplaza por **ausencia real de chrome**.

Coste honesto: un prop de estado que atraviesa 2 niveles. Beneficio: cero riesgo de modal
anidado, cero cambio en UI kit, y el seam es testeable de forma determinista
(`viewerOpen === true` implica navbar no montado).

### 5.2 Decision de arquitectura para IMG-04 (zoom): sin dependencia nueva (congelada)

`DEP-02` verifica que **`react-native-gesture-handler` y `react-native-reanimated` NO estan
instalados**, y HC2-C §25 congelo "cero dependencias nuevas". El zoom esta **BROKEN** hasta
que se pruebe en el dedo; el codigo es plausible pero tiene 4 defectos corregibles y
**ningun test de comportamiento**.

| Criterio | Reparar el `PanResponder` actual | Agregar gesture-handler + reanimated |
| --- | --- | --- |
| Complejidad | 4 defectos localizedos en `MemoryViewer.tsx:268-280` | Cambia el arbol de renders de **todo** el Viewer |
| Expo Go | Nativo, funciona hoy | `gesture-handler` funciona en Go; `reanimated` exige plugin de babel y puede requerir build propio |
| Impacto en bundle | 0 | +2 dependencias nativas, mas config de babel |
| Riesgo | Bajo y **reversible** en un commit | Alto: toca el producto compartido de la app |
| Arbitraje pager | `onPanResponderTerminationRequest` ya es el mecanismo correcto y ya esta | Cambia el modelo de arbitraje entero |
| Plazo | Minimo | Multiplos dias mas una QA nueva |

**Elegido: reparar el `PanResponder`.** Los 4 defectos son: falta
`onPanResponderTerminate`, falta `*Capture`, clamp vertical magico `±500` (debe derivarse del
viewport), y `Animated.event` ausente. Se corrigen **antes** de cualquier device trace, para
que el trace mida el defecto real y no los 4 defectos conocidos.

**Doble toque para zoom y para reset: DEFER.** Confirmado (§14.2). No se agrega.

**Si el device trace de ST-10 demuestra que el defecto restante NO es reparable con
`PanResponder`**, ese es un **STOP documentado**, no una excepcion silenciosa: se vuelve a
esta seccion con evidencia y se reevalua con el usuario.

### 5.3 Decision de arquitectura para waveform: V1 sin waveform (congelada)

`AUD-06` clasifica `REAL_WAVEFORM_EXPENSIVE` + `DEVICE_VERIFY_REQUIRED`. **Ningun donor** de
los cuatro muestra waveform. V1 recibe el **diseno honesto no-waveform** de §16.3: icono +
etiqueta `Audio`, duracion y posicion `m:ss` **visibles siempre**, barra con punto de posicion
con seek por toque **y arrastre**, nombre de archivo presentable (identidad util, no falsa), y
buffering explicito.

**Prohibido en V1**: `react-native-sound-wav`, `react-native-audio-api`, `wavesurfer.js`,
o cualquier libreria de waveform. **Prohibido en todas las circunstancias**: waveform
**falsa**. La prohibicion de fake waveform **no cambia** bajo ninguna hipotesis.

Reconsideracion en **V1.1**, condicionada a device QA de `useAudioSampleListener` en el
iPhone objetivo con costo de CPU aceptable. Esa es la unica via.

---

## 6. Risk Ordering

Prioridad = **severidad de producto x dependencia**, no dificultad.

| Orden | Riesgo | Dueño de stage |
| --- | --- | --- |
| **1** | **P0 seguridad**: el contenido del hogar se puede eliminar de forma definitiva sin gate (`homecloud.delete` proyectada, 0 asserts) | ST-1 |
| **2** | **P0 datos**: un recuerdo queda irrecuperablemente sin fecha (fecha read-only + sin `PATCH`) | ST-3 |
| **3** | **P0 navegacion**: el usuario no puede volver a un lugar (SEL-03) | ST-2 |
| **4** | **P0 datos**: un audio importado nunca es corregible (nuevo P0 tras promover `Importar audio` a IN) | ST-3 |
| **5** | **P0 producto**: superficie de papelera y lifecycle inalcanzables | ST-1 -> ST-6 |
| **6** | **P0 navegacion**: back de Android deja el Viewer en `Missing` sin player | ST-2 |
| **7** | **P0 percepcion**: un video largo parece no funcionar (sin poster) | ST-9 |
| **8** | **P0 producto**: crear album desde seleccion inexistente | ST-7 |
| **9** | **P0 producto**: resurfacing sin superficie, luego casi siempre vacia | ST-8 |
| **10** | **P0 producto**: Viewer no inmersivo, navbar tapa 102 px | ST-4 |
| **11** | **P0 datos**: tentacion de "arreglar" fechas parciales automaticamente | ST-3 + ST-8 |
| **12** | **MED: Favorites migration + backend + smart collection** | ST-3 + ST-7 |
| **13** | **MED: Multi-share temp lifecycle + OS share N-items** | ST-5 |
| **14** | **MED: Real waveform strategy + device QA + fallback** | ST-9 |
| **15** | **MED: Image/Video double-tap detector + arbitration** | ST-10 |
| **16** | **MED: 7 originales por apertura; caches sin acotar** | ST-9 |
| **17** | **MED: zoom de imagen inservible** | ST-10 |
| **18** | **MED: action authority ausente, luego 3 acciones de 6** | ST-5 |
| **19** | **MED: fugas de `staging` y de temporales en share** | ST-1 + ST-5 |
| **20** | **LOW: RLS sin policies (default deny, sin defensa en profundidad)** | ST-11 |
| **21** | **LOW: `albumIds` puede proyectar ids de otro hogar** | ST-11 |
| **22** | **LOW: Platform audio routing device QA** | ST-9 |

---

## 7. Shared Infrastructure Boundary

Memories **NO** rediseña la infraestructura compartida de HomeCloud. Queda **prohibido**
tocar, dentro de este plan:

| Pieza | Por que |
| --- | --- |
| `UploadJob` / cola / `homecloudUploadEngine.ts` | Es la parte mas solida del repo (`PERF-06`) |
| `homecloudUploadCoordinator.ts` | Single-flight por scope, ya correcto |
| Transporte PUT nativo (`authorizeHomeCloudOriginalUpload`) | Verificado en device QA |
| `register -> authorize -> upload -> verify -> finalize` | Verify-first, ya correcto |
| Recovery, guardas de conectividad, sweep de orphans | `homecloudUploadRecovery.ts` |
| Autoridad de storage y rutas canonicas `{household}/{content}/{variant}` | `homecloudStoragePaths.js` |
| Contrato de Files | Lane separado |

### 7.1 `SHARED_INFRA_BLOCKER`

**NO.** Ningun gap de Memories V1 requiere modificar infraestructura compartida.

Los tres puntos que podrian parecerlo, y por que no lo son:

1. **Purge necesita borrar objetos de storage** (`TRASH-05`). No cambia el modelo de storage:
   reutiliza las rutas y policies RLS que `homecloudStoragePaths.js` ya define, y el mismo
   servicio que ya emite `DELETE`. Es una **operacion nueva sobre una autoridad existente**,
   no un rediseño.
2. **Sweep de filas `staging` (`LIFE-05`)** necesita un disparador. Se resuelve con
   infraestructura **ya presente en el repo** (Edge Function o invocacion desde una tarea
   existente), nunca con un cron o un pipeline **nuevo** compartido con Files.
3. **`homecloud.delete` (`LIFE-04`)** es una capacidad que ya existe en la matriz por rol. El
   trabajo es **exigirla**, no crearla.

> Si en la practica de ST-1 hiciera falta tocar `homecloudStoragePaths.js` o
> `homecloudUploadEngine.js` **mas alla de lectura**, ese slice se detiene y se convierte en
> `SHARED_INFRA_BLOCKER`. No se resuelve en caliente.

### 7.2 Lo que si es UI kit compartido

`ActionSheet` es compartido con Files. **Decision: no se toca.** La decision §5.1 lo evita por
construccion. Cualquier stage que necesite una superficie nueva dentro de Memories debe usar
componentes de `components/ui/` **sin modificar su firma**.

### 7.3 Formato de un `SHARED_INFRA_BLOCKER` (por si aparece)

```
SHARED_INFRA_BLOCKER
  id:            SHB-<stage>-<n>
  gap de origen: <ID de FINAL_CURRENT_GAP>
  por que:       <que se necesita y por que no se puede hacer en el carril>
  cambio minimo: <el cambio mas pequeno posible, archivo y funcion>
  contrato Files afectado: <si alguno, con exactitud>
  contrato Memories afectado: <que queda bloqueado>
  riesgo de migracion: <ninguno | cual>
  estrategia de cherry-pick: <commit aislado, en que rama, con que orden>
  decision:      PENDIENTE DE AUTORIZACION
```

---

## 8. Migration Strategy

**Migraciones necesarias: 1.**

| Que pediria migracion? | Respuesta |
| --- | --- |
| `lifecycle='trashed'` | Ya esta en el `CHECK` (`20260910000000:32-34`). **No** |
| `trashed_at` / `trashed_by_member_id` | Ya estan, con `CHECK ((lifecycle='trashed') = (trashed_at is not null))`. **No** |
| `PURGED` | No es un estado: es borrado fisico. **No** |
| **Columna `favorite` en `homecloud_contents`** | **SÍ** — `favorite boolean NOT NULL DEFAULT false`. Requerida para HOUSEHOLD_SHARED Favorites. La regla "0 migraciones" anterior es SUPERSEDED por user override. Migración más pequeña posible; no tabla por miembro; no album sistema. |
| `PATCH` de memory (`captured_at/year/month`, `capture_precision`, `caption`, `hidden_from_resurfacing`) | Columnas ya existen. **No** |
| `hidden_from_resurfacing` | Ya existe, `boolean NOT NULL DEFAULT false`. **No** |
| `duration_ms` | **Decision consciente: NO se persiste.** La duracion se deriva en reproduccion. Eliminar o consumir el codigo muerto (`INTAKE-10`), no agregar columna |
| Indice de busqueda | Search = OUT. **No** |
| RLS policies | `CAP-03`: documentar que default deny es la defensa. **No** agregar GRANT (`R14`) |

Esta es la decision de mayor impacto del plan: **Memories V1 se cierra con una sola
migracion** (`favorite` boolean). Todo lo demas ya existe en el schema y solo esta sin usar.

**Consecuencia operativa:** migracion minima y reversible; no hay ventana de mantenimiento significativa, no hay riesgo de lock critico, rollback de esquema trivial. Cada stage es un commit de codigo revertible.

**Riesgo residual:** el `CHECK ((lifecycle='trashed') = (trashed_at is not null))` ata a un
valor que hoy **nadie produce** (`LIFE-03`). ST-1 es la primera vez que se escribe `trashed`,
asi que es la primera vez que ese CHECK se ejecuta de verdad. Si el endpoint tiene un bug, el
CHECK **falla la escritura**, que es el comportamiento correcto. **No se relaja.**

### 8.1 Invariantes de schema que hay que preservar

| Invariante | Donde | Riesgo si se toca |
| --- | --- | --- |
| `capture_semantics_check` | `20260910000000:137-138` | Permite dia sintetico: P0 de datos (`R21`) |
| `capture_component_range_check` | `20260910000000` | Fechas imposibles |
| `trash_consistency` CHECK | `20260910000000:84-85` | `trashed` sin `trashed_at`, o al reves |
| `homecloud_contents.lifecycle` CHECK | `:32-34` | Un `purged` colarse como estado |
| `album_items.album_id` `ON DELETE CASCADE` | `20260910000003:116` | Membresias huerfanas al restaurar (`TRASH-03`) |
| `album_items` sin `UNIQUE` en nombre | `ALB-04` | Prohibiria duplicados (§10.5) |

---

## 9. Permission Strategy

**Cambios en la matriz de capacidades: 0.** Se usa la matriz existente tal cual.

### 9.1 Enforcement por capa

| Capa | Regla |
| --- | --- |
| Backend | **Es la autoridad.** `readHouseholdPermission(...)` en cada ruta nueva |
| Frontend | Ocultamiento de accion, **nunca** autorizacion |
| Tests | Cada ruta destructiva tiene un test de capability enforcement |

Regla dura: **una accion no disponible no se renderiza** (§26.4). No se renderiza
deshabilitada con tooltip. Si `organize = false`, no hay tile de crear album, ni acciones de
album, ni mutaciones de organizacion. Si `delete = false`, no hay `Eliminar definitivamente`
ni `Vaciar papelera`.

### 9.2 Mapa de enforcement de este plan

| Operacion | Requiere | Se aplica en |
| --- | --- | --- |
| Ver Memories / albums / tipos / papelera / **Favoritos** | `homecloud.view` | Ya existe (`CAP-02`) |
| Crear Memory (import, camara, `Importar audio`, `Grabar audio`, escrito) | `homecloud.contribute` | Ya existe |
| Editar fecha / descripcion / membresias | `homecloud.organize` | **ST-3** (nuevo) |
| Crear / renombrar / eliminar album; agregar / quitar de album | `homecloud.organize` | Ya existe (`ALB-04/07/09/16`) |
| Mover a papelera / Restaurar | `homecloud.contribute` | **ST-1** (nuevo) |
| **Borrado permanente (purge)** | **`homecloud.delete`** | **ST-1** (nuevo, P0) |
| **Vaciar papelera** | **`homecloud.delete`** | **ST-1** (nuevo, P0) |
| `No mostrar este recuerdo aca` | `homecloud.organize` | **ST-8** (nuevo) |
| **Toggle favorite (star/unstar)** | `homecloud.organize` | **ST-3 + ST-7** (nuevo) |
| **Multi-select Share** | `homecloud.view` (no `contribute`) | **ST-5** (nuevo) |

### 9.3 Gate de CI para enforcement

### 9.3 Gate de CI para enforcement

`TEST-01`: 13 de 53 suites `homecloud_*` estan **huerfanas**, no aparecen en ningun grupo de
`tests/run.js`. Los **5 `1d_*`** son los unicos que probarian el enforcement de capacidades
(incluyendo `rls_bypass` y la regresion de hogar nuevo).

**ST-1 engancha esos 5 al gate** como condicion de salida. Es parte del P0 de seguridad: una
capacidad exigida pero sin gate vuelve a morir en silencio.

Ademas, `tests/run.js:410-419` invoca `node` sobre archivos **`.ts`** sin compilar, a
diferencia de todos los demas grupos TS. Se corrige en ST-11, no en ST-1, porque no bloquea
el enforcement.

### 9.4 Matriz de QA por rol (para el cierre)

| Operacion | coordinator | adult | adolescent | child | senior | guest |
| --- | --- | --- | --- | --- | --- | --- |
| Ver Memories | SI | SI | SI | SI | SI | SI |
| Crear Memory | SI | SI | SI | **NO** | SI | **NO** |
| Editar metadata | SI | SI | **NO** | **NO** | SI | **NO** |
| Organizar albums | SI | SI | **NO** | **NO** | SI | **NO** |
| Mover / restaurar | SI | SI | SI | **NO** | SI | **NO** |
| **Purge / vaciar papelera** | SI | SI | **NO** | **NO** | **NO** | **NO** |

Se prueba en el dispositivo al menos una transicion por capacidad negada, y se documenta el
copy de ocultamiento, no solo el resultado.

---

## 10. Stage Map

**11 etapas.** Cada una tiene un rollback boundary y una puerta de QA con significado. No se
crearon 20 etapas diminutas ni una etapa gigante.

### 10.0 Mapa de stages

| Stage | Nombre | Rolls up | Reversible |
| --- | --- | --- | --- |
| ST-1 | Lifecycle backend + gate `homecloud.delete` | LIFE-03/04/05, UPL-04, TRASH-05/07, CAP-01 | Si, detras de flag |
| ST-2 | Caller context, back y scroll | SEL-03/06, TYP-03/04, VIEW-07, ROOT-05/06/07/08, PERF-05 | Si, front-only |
| ST-3 | Fecha editable + `PATCH` de memory + Create de 5 | DATE-03/04/11, INFO-01/02/03, INTAKE-01/02/03/03b/07/08/09, CRT-01/06/07/09, WRIT-03, **FAV-01, FAV-02, FAV-03** | Si, endpoint nuevo detras de flag |
| ST-4 | Viewer inmersivo sin modal anidado | VIEW-01/09, IMG-06, LOAD-01 | Si, front-only |
| ST-5 | Action authority + menu del Viewer + **Multi-share** | ACT-01/02/03, VIEW-08, ALB-13/14, WRIT-04/05/06, **MS-01..MS-05** | Si, front-only |
| ST-6 | Lifecycle UI: papelera, undo, restore, purge | LIFE-01(UI), TRASH-01/03/04, O-01..O-04, P-01..P-12 | Si, sobre ST-1 |
| ST-7 | Albums: tile final, crear desde seleccion, **Favorites smart collection** | ALB-01/02/03/06/08/12/14, **FAV-04, FAV-05, FAV-06** | Si, front-only (backend ya existe) |
| ST-8 | Resurfacing | ROOT-10, RESURF-01/02/06/08 | Si, sobre ST-3 |
| ST-9 | Percepcion de medios: poster, red, audio, **waveform, video double-tap, audio routing** | VID-02/04/07/08, IMG-02, PERF-01/02/03, **AUD-01..07** | Si, front-only |
| ST-10 | Zoom, batch intake, camara, **image double-tap**, deudas | IMG-04/05/06, INTAKE-04/05/09/10, CAM-08/09, WRIT-07, PERF-08, CRT-06 | Si, front-only |
| ST-11 | Cierre, congelamiento y reconciliacion | CAP-03, TEST-01/02, INFO-04, B11, P8, DEVICE_ONLY | Si, docs + tests |

Orden verificado: `ST-1 -> ST-2 -> ST-3 -> ST-4 -> ST-5 -> ST-6 -> ST-7 -> ST-8 -> ST-9 ->
ST-10 -> ST-11`. Ningun stage referencia un gap cerrado mas adelante.

**Camera se planifica en ST-10, no al principio y no al final:** antes seria trabajo repetido
(el intake final no existe), despues seria una mega-QA unica. En ST-10 ya existen el intake
final (ST-3), el destino de album (ST-3), el review (ST-3) y el upload (ya), y todavia queda
un stage de cierre para la QA fisica de camara.

| Stage | Nombre | Rolls up | Reversible |
| --- | --- | --- | --- |
| ST-1 | Lifecycle backend + gate `homecloud.delete` | LIFE-03/04/05, UPL-04, TRASH-05/07, CAP-01 | Si, detras de flag |
| ST-2 | Caller context, back y scroll | SEL-03/06, TYP-03/04, VIEW-07, ROOT-05/06/07/08, A-06, A-09, PERF-05 | Si, front-only |
| ST-3 | Fecha editable + `PATCH` de memory + Create de 5 | DATE-03/04/11, INFO-01/02/03, INTAKE-01/02/03/03b/07/08, CRT-01/06/07/09, WRIT-03 | Si, endpoint nuevo detras de flag |
| ST-4 | Viewer inmersivo sin modal anidado | VIEW-01/09, IMG-06, LOAD-01 | Si, front-only |
| ST-5 | Action authority + menu del Viewer | ACT-01/02/03, VIEW-08, ALB-13/14, WRIT-04/05/06 | Si, front-only |
| ST-6 | Lifecycle UI: papelera, undo, restore, purge | LIFE-01(UI), TRASH-01/03/04, O-01..O-04, P-01..P-12 | Si, sobre ST-1 |
| ST-7 | Albums: tile final y crear desde seleccion | ALB-01/02/03/06/08/12/14 | Si, front-only (backend ya existe) |
| ST-8 | Resurfacing | ROOT-10, RESURF-01/02/06/08 | Si, sobre ST-3 |
| ST-9 | Percepcion de medios: poster, red, audio | VID-02/04, IMG-02, PERF-01/02/03, AUD-01..05 | Si, front-only |
| ST-10 | Zoom, batch intake, camara y deudas | IMG-04/05, INTAKE-04/05/09/10, CAM-08/09, WRIT-07, PERF-08, CRT-06 | Si, front-only |
| ST-11 | Cierre, congelamiento y reconciliacion | CAP-03, TEST-01/02, INFO-04, B11, P8 runtime warning, DEVICE_ONLY | Si, docs + tests |

Orden verificado: `ST-1 -> ST-2 -> ST-3 -> ST-4 -> ST-5 -> ST-6 -> ST-7 -> ST-8 -> ST-9 ->
ST-10 -> ST-11`. Ningun stage referencia un gap cerrado mas adelante.

**Camera se planifica en ST-10, no al principio y no al final:** antes seria trabajo
repetido (el intake final no existe), despues seria una mega-QA única. En ST-10 ya existen
el intake final (ST-3), el upload (ya), el destino de álbum (ST-3) y el review (ST-3), y
todavia queda un stage de cierre para la QA fisica de camara.

---

### ST-1 — LIFECYCLE BACKEND + GATE `homecloud.delete`

**OBJECTIVE**

Escribir `lifecycle='trashed'`, exponer trash / restore / purge, y **exigir
`homecloud.delete` en purge y en vaciar papelera**. Sin ninguna UI.

**WHY NOW**

Es el **P0 de seguridad** y es la precondicion dura de `TRASH-04`, `TRASH-05`, `TRASH-07`,
`LIFE-01(UI)`, `O-04` y `P-06/P-07/P-08`. Si se construye la UI de papelera primero, se
convierte un hole latente en un hole explotable. El schema **ya soporta** `trashed`
(`LIFE-02`), asi que el trabajo es pequeno y esta delimitado.

**PRODUCT TARGET**: §19.3, §19.4, §20.5, §20.6, §26.2, §26.3. `lifecycle = ACTIVE |
TRASHED`; `PURGED` es borrado fisico; `TRASHED` invisible **en SQL** por filtro, no
post-filtrado; purge borra fila + `homecloud-originals` + `homecloud-previews` + membresias;
**ningun estado "borrado" mientras los bytes sobrevivan**.

**GAP IDS**: `LIFE-01` (backend), `LIFE-03`, `LIFE-04`, `LIFE-05`, `TRASH-05`, `TRASH-07`,
`UPL-04`, `CAP-01`

**PATH IDS**: `O-01`, `O-02`, `O-03`, `O-04`, `P-03`, `P-04`, `P-05`, `P-06`, `P-07`, `P-08`,
`P-09`, `P-10`, `P-11`, `P-12`, `T-04`

**CURRENT**

24 rutas en `backend/src/routes/homecloud.js`, ninguna de trash/restore/purge. `lifecycle`
solo se escribe con `'staging'` (`homecloudIntakeService.js:257,277`) o `'active'`
(`:587,627`); `'trashed'` **nunca**. `Select-String 'homecloud\.delete'` sobre todos los `.js`
de `backend/src` ⇒ **0 resultados**. El 404 de signed URL para `lifecycle != 'active'` **ya
funciona** (`homecloudStorageAccess.js:106-108`). Un `/verify` fallido deja la fila en
staging con 409 y nada la barre (`grep 'orphan'` ⇒ 0; no hay cron ni Edge Function).

**TARGET**

3 transiciones de lifecycle con capability enforcement; filtro `active` en SQL aplicado a
Timeline, Tipos, Albums y Resurfacing; purge atomico y honesto; sweep de `staging`.

**REAL GAP**

Endpoints, escritura de `trashed`, gate de `delete`, y dos fugas silenciosas (`LIFE-05`,
`UPL-04`).

**FILES LIKELY TO CHANGE**

- `backend/src/routes/homecloud.js` — 3 rutas nuevas
- `backend/src/services/homecloudLifecycleService.js` — **nuevo**, servicio dedicado
- `backend/src/services/homecloudReadService.js` — extender el filtro `active` ya existente
- `backend/src/controllers/homecloudLifecycleController.js` — **nuevo**
- `scripts/homecloud_*_lifecycle_tests.ts` — **nuevas**

**FILES FORBIDDEN / OUT OF SCOPE**

`front/**` entero · `homecloudStoragePaths.js` (solo lectura) · `homecloudUploadEngine.ts` ·
`homecloudUploadCoordinator.ts` · migraciones · `package.json` · cualquier ruta de Files ·
cualquier artefacto compartido.

**DATABASE / MIGRATION IMPACT**

**0 migraciones.** Escribe en columnas y CHECKs ya existentes. El
`CHECK ((lifecycle='trashed') = (trashed_at is not null))` pasa a ejecutarse de verdad por
primera vez.

**PERMISSION IMPACT**

Enforcement nuevo de `homecloud.delete` en purge y vaciar papelera; `homecloud.contribute` en
trash y restore. **0 cambios en la matriz.**

**SHARED-INFRA IMPACT**

**NO.** Reutiliza `homecloudStoragePaths.js` y el servicio de storage existente. Si requiere
mas que lectura ⇒ `SHARED_INFRA_BLOCKER` y STOP (§7.1).

**DEPENDENCY CHANGES**: ninguna.

**IMPLEMENTATION SLICES**

1. `readHouseholdPermission(homecloud.delete)` exigido en purge. **Primero, solo.**
2. `POST /memories/:contentId/trash` — escribe `lifecycle='trashed'`, `trashed_at=now()`,
   `trashed_by_member_id=<del actor>`. Requiere `contribute`. **Preserva membresias** (§20.2).
3. `POST /memories/:contentId/restore` — `TRASHED -> ACTIVE`, limpia `trashed_at` y
   `trashed_by_member_id`. Requiere `contribute`. **No restaura en relacion inexistente**
   (§20.4): las membresias huerfanas ya caen por `ON DELETE CASCADE`.
4. `DELETE /memories/:contentId` (purge) — borra fila + objetos de `homecloud-originals` +
   `homecloud-previews`. Membresias por cascade. **Requiere `delete`.** Si el storage falla,
   la operacion se reporta **fallida y reintentable**; nunca exito mentiroso.
5. `POST /memories/purge-all` (vaciar papelera) — **requiere `delete`**, con conteo.
6. Extender el filtro `lifecycle='active'` en SQL a las consultas de album y tipo. Los
   placeholders `:` y `?` quedan prohibidos.
7. `UPL-04`: `/verify` fallido deja la fila **reintentable en servidor**, no un 409 ciego.
8. `LIFE-05`: sweep de filas `staging` abandonadas, reutilizando la politica de orphan ya
   existente en `homecloudOrphanSweepPolicy.ts`. **No** introduce un cron compartido.
9. Enganchar las **5 suites `1d_*`** huerfanas al gate de CI (`TEST-01`, parte de seguridad).

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **ADD** | `homecloud_lifecycle_backend_contract_tests` | 3 transiciones + filtro SQL + 404 en `TRASHED` |
| **ADD** | `homecloud_delete_capability_enforcement_tests` | purge y vaciar papelera **rechazan** sin `delete`, en los 6 roles |
| **ADD** | `homecloud_purge_storage_honesty_tests` | fallo de storage ⇒ fallo, no exito |
| **ADD** | `homecloud_staging_sweep_tests` | `staging` abandonado no sobrevive |
| **ADD / UNHOOK** | los 5 `1d_*` | enforcement de capabilities hoy sin gate |
| **KEEP** | `homecloud_moa1_album_contracts_tests` | `ALB-07`: eliminar album no borra Memories |
| **KEEP** | `homecloud_1e_storage_rls_tests` | rutas de storage |
| **RETARGET** | aserciones de lifecycle de `homecloud_hc2b_media_viewer_tests` | ninguna hoy |

**AUTOMATED GATE**

Las 4 suites nuevas + los 5 `1d_*` + `tsc -p scripts/tsconfig.test.json` filtrado a
`homecloud|memory` (debe dar **0** errores).

**DEVICE QA GATE**

**Ninguna para este stage.** Es backend puro, sin superficie. Se documenta explicitamente que
un stage backend no tiene por que tener puerta fisica, y que su verificacion es el contrato
de API. Esto es deliberado, no una omision.

**FAILURE / ROLLBACK STRATEGY**

Cada endpoint se monta tras un flag. Rollback = apagar el flag: las rutas devuelven 404 y el
estado del schema no cambia. Si un `CHECK` de consistencia falla al escribir `trashed`, la
escritura se rechaza, que es el comportamiento correcto; se investiga antes de relajar nada.
Purge es irreversible por diseno: por eso es el **unico** slice con test de fallo de storage.

**COMMIT BOUNDARIES**

Un commit por slice. Ninguno toca frontend.

**EXIT CRITERIA**

- [ ] 3 transiciones responden y filtran en SQL
- [ ] `homecloud.delete` rechazada sin la capacidad, en los 6 roles
- [ ] `homecloud.contribute` rechazada sin la capacidad, en child y guest
- [ ] Purge falla honestamente si storage falla
- [ ] `staging` abandonado no sobrevive
- [ ] Los 5 `1d_*` corren en CI
- [ ] **0 migraciones** aplicadas

**DO NOT ADVANCE IF**

- Aparecio la necesidad de tocar `homecloudStoragePaths.js` o `homecloudUploadEngine.js` mas
  alla de lectura ⇒ `SHARED_INFRA_BLOCKER`, STOP
- Algun endpoint de Files cambio de comportamiento
- Purge queda alcanzable sin `homecloud.delete`
- Se aplico alguna migracion

---

### ST-2 — CALLER CONTEXT, BACK Y SCROLL

**OBJECTIVE**

Que la seleccion, el `BackHandler` y el scroll **preserven el contexto de llamador**, y que
cambiar de pestana global no reabra el Viewer.

**WHY NOW**

Es **P0 de navegacion** (`R3`) y es una correccion front-only pequena. Debe preceder a
cualquier accion destructiva construida sobre el comportamiento actual del llamador: si
`ALB-12` se construye sobre un dataset que ya cambia, la accion se aplica al conjunto
equivocado. Ademas `ALB-07` (ST-7) y `Q-05` (ST-8) heredan este invariante.

**PRODUCT TARGET**

§12.1 (invariante central), §12.3, §12.5, §27.3 (matriz de retorno), §27.4 (root nunca es
fallback), §3.4 (offset por superficie), §13.6 (back cierra el Viewer **antes** que su
llamador).

**GAP IDS**: `SEL-03`, `SEL-06`, `TYP-03`, `TYP-04`, `VIEW-07`, `ROOT-05`, `ROOT-06`,
`ROOT-07`, `ROOT-08`, `PERF-05`, `LOAD-01` (parte del Viewer)

**PATH IDS**: `G-01`…`G-08`, `A-05`, `A-07`, `A-08`, `A-09`, `H-07`, `F-04`, `F-05`, `T-05`,
`R-07`

**CURRENT**

`showAlbumDetail = !selecting && openAlbumId !== null` desmonta el overlay, y `gridMemories`
depende solo de `activeCollectionId` (que sigue `null`) ⇒ el dataset visible pasa al Timeline
de la raiz (`SCREEN:918-932,1145,1442,1800-1823`, **P4 confirmado**). El mismo gate desarma la
estructura en un Tipo (`TYP-03`). El `BackHandler` tiene 5 prioridades (`:1307-1334`) y
**ninguna contempla el Viewer**: back ejecuta `closeCollection()` ⇒ dataset `[]` ⇒ `Missing`
**sin cerrarse**, y como `homecloudMemoryViewerOpening.ts:157` rechaza toda escritura con
`requestedIndex < 0`, **ningun video/audio al que se deslice despues obtiene player**
(`VIEW-07`). Cambiar de pestana global aplica `display:'none'` al pane de Memories y
**desmonta el Viewer sin cerrar su sesion**: al volver, reaparece solo (`ROOT-07`). Hay
**dos** efectos con dependencia `householdId` (`:336-341` y `:1415-1440`) y el comentario
`:1425` afirma "the one and only scope authority", lo cual es **inexacto** (`ROOT-05`).

**TARGET**

El dataset y la estructura durante la seleccion son los del llamador; back cierra el Viewer
primero y conserva su dataset; cambiar de pestana global no reabre nada; un solo reset por
household; un offset por superficie, incluidos album y tipo.

**REAL GAP**

Dos gates que desmontan overlays, una prioridad ausente en el `BackHandler`, un
`requestedIndex` congelado, `display:'none'` como mecanismo de "cambio de pestana", dos
efectos de scope, y offsets que no cubren album ni tipo.

**FILES LIKELY TO CHANGE**

- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx` — gates, `BackHandler`, offsets
- `front/mi-front-limpio/screens/HomeCloudScreen.tsx` — `display:'none'` ⇒ cierre de sesion
- `front/mi-front-limpio/services/homecloud/homecloudMemoryViewerOpening.ts` — `requestedIndex`
- `scripts/homecloud_selection_caller_context_tests.ts` y_adjuntos — **nuevas**

**FILES FORBIDDEN / OUT OF SCOPE**

`backend/**` · `homecloudMemoryIntakeService.ts` · el chrome de `MemoryViewer.tsx` (ST-4) ·
`MemoryAlbumRemoval` (ST-5) · `homecloudUploadEngine.ts` · cualquier accion de lifecycle.

**DATABASE / MIGRATION IMPACT**: 0.
**PERMISSION IMPACT**: ninguno. No cambia ningun gate por capability.
**SHARED-INFRA IMPACT**: NO.
**DEPENDENCY CHANGES**: ninguna.

**IMPLEMENTATION SLICES**

1. `SEL-03`: dataset de la seleccion = dataset del llamador. Quitar el `!selecting` del gate
   del overlay de album y hacer que `gridMemories` respete el `purpose` de la seleccion.
2. `SEL-06` + `ROOT-08`: offset persistido por superficie, con clave `root` / `album:<id>` /
   `type:<kind>` / `resurfacing:<group>` / `trash`. Entrar y salir de seleccion **no** cambia
   el offset. El overlay de album restaura el suyo.
3. `TYP-03`: la estructura no cambia al seleccionar dentro de un Tipo.
4. `VIEW-07` (a): **`BackHandler` cierra el Viewer antes** que la coleccion o el album que lo
   abrieron. Orden final: drag ⇒ seleccion ⇒ **Viewer** ⇒ coleccion ⇒ album ⇒ navegacion.
5. `VIEW-07` (b): `Missing` del Viewer debe ser **recuperable**. El cierre por back no debe
   dejar `requestedIndex` en `-1`.
6. `ROOT-07`: cambiar de pestana global **cierra** la sesion del Viewer en vez de desmontar a
   ciegas. Eliminar `display:'none'` como mecanismo.
7. `ROOT-05` + `ROOT-06`: **un** solo reset por household. Corregir el comentario inexacto.
8. `PERF-05`: `refresh()` preserva; `loadFirstPage()` no vacia contenido ya cargado. El
   `useFocusEffect` deja de reemplazar la `SectionList` completa en cada refocus.
9. `ROOT-04`: verificar en dispositivo el brazo nativo del pull-to-refresh (ya montado y
   gateado; falta el feel).

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **RETARGET** | `homecloud_hc2c_memories_root_tests` | el comentario `SCREEN:921-924` afirma lo **contrario** de la verdad final |
| **ADD** | `homecloud_selection_caller_context_tests` | dataset = llamador en raiz, album y tipo (nadie lo afirma hoy) |
| **ADD** | `homecloud_viewer_android_back_tests` | back cierra el Viewer; el dataset no queda `[]` |
| **ADD** | `homecloud_global_tab_switch_tests` | cambiar de pestana no reabre el Viewer |
| **ADD** | `homecloud_scroll_offset_tests` | offset por superficie, preservado al seleccionar |
| **KEEP** | `homecloud_moa3_memory_selection_tests` (209) | D4 intacto |
| **KEEP** | `homecloud_moa3_memory_selection_device_gesture_fix_tests` (90) | feel de gesto |
| **KEEP** | `homecloud_hc2c_viewer_opening_tests` | apertura exacta + opening lock |

**AUTOMATED GATE**

Las 4 suites nuevas + `homecloud_moa3_*` + typecheck filtrado.

**DEVICE QA GATE**

Obligatorio, y **en este stage**: son bugs de interaccion que ninguna fuente puede probar.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | En Album A, long press ⇒ el dataset sigue siendo Album A; `X` ⇒ Album A, mismo offset | `DEVICE_PREFERRED` |
| 2 | En Fotos, long press ⇒ el dataset sigue siendo Fotos; `X` ⇒ Fotos | `DEVICE_PREFERRED` |
| 3 | Back de Android con el Viewer abierto desde Album A: cierra el **Viewer**, no el album | `DEVICE_ONLY` |
| 4 | Tras back: deslizar en el Viewer da player de video/audio (no `Missing` congelado) | `DEVICE_ONLY` |
| 5 | Cambiar a `Archivos` y volver: el Viewer **no** reaparece solo | `DEVICE_PREFERRED` |
| 6 | Pull-to-refresh: el contenido previo permanece visible, sin skeleton | `DEVICE_ONLY` |
| 7 | Cambiar de household: cero residuos del anterior | `DEVICE_PREFERRED` |

**FAILURE / ROLLBACK STRATEGY**

Todo es front-only y sin migracion. Si el gate nuevo rompe la seleccion en algun llamador, se
revierte el gate (un `&&`) y se re-investiga; no se parchea con un tercer `if`. Si el
`BackHandler` nuevo confunde el cierre del album, se reordena la prioridad: no se anade un
segundo `BackHandler`.

**COMMIT BOUNDARIES**: un commit por slice, 9 en total. Todos `fix(homecloud):` o
`feat(homecloud):`, ninguno toca backend.

**EXIT CRITERIA**

- [ ] Seleccion preserva el llamador en raiz, album y tipo
- [ ] Back cierra el Viewer y su dataset sobrevive
- [ ] Cambiar de pestana global no reabre el Viewer
- [ ] Un solo reset por household, y el comentario dice la verdad
- [ ] Offset por superficie en las 5 claves
- [ ] Refresh no vacia contenido cargado
- [ ] 7 casos de device QA ejecutados, 3 `DEVICE_ONLY`

**DO NOT ADVANCE IF**

- Cualquier llamador sigue perdiendo su contexto de seleccion
- Aparecio un segundo `BackHandler` o un segundo reset de household
- Se toco el chrome de `MemoryViewer.tsx` (pertenece a ST-4)
- El pull-to-refresh no se pudo verificar en el iPhone

---

### ST-3 — FECHA EDITABLE + `PATCH` DE MEMORY + CREATE DE 5 ACCIONES

**OBJECTIVE**

Cerrar el P0 de datos: la fecha es editable en el intake **y** corregible despues de
guardar. Y promover `Importar audio` a accion de primer nivel del menu de create.

**WHY NOW**

Es el **P0 de datos** (`R2`) y, tras el patch de audio, tambien el **P0 nº 4**: un audio
importado sin fecha no tiene ninguna salida. Es precondicion dura de `RESURF-08` (ST-8): sin
`PATCH`, la banda de resurfacing existe pero casi nunca tiene contenido. Y `DATE-03` no depende
de nada: el componente **ya existe y esta desconectado**
(`MemorySemanticDateFields.tsx`, montado solo en el formulario escrito). Es la mejor relacion
effort/impacto de toda la auditoria.

`CRT-01/07/09` van aqui porque son front-only, de bajo riesgo, y desbloquean un gap de datos
P1 que el patch de audio covertio en primera clase. No dependen de `DATE-03`.

**PRODUCT TARGET**

§6.3 (fecha editable), §6.5 (`Sin fecha` del audio importado es corregible), §6.6 (audio
importado se preserva), §7.3.1 (`partial -> exact` solo por el usuario), §7.4, §8.2 (Info),
§8.3 (superficie unica de edicion), §4.1.1/§4.1.2 (create de 5 acciones planas), §4.1.3,
§26.2 (editar metadata = `homecloud.organize`).

**GAP IDS**: `DATE-03`, `DATE-04`, `DATE-11`, `INFO-01`, `INFO-02`, `INFO-03`, `INTAKE-01`,
`INTAKE-02`, `INTAKE-03`, `INTAKE-03b`, `INTAKE-07`, `INTAKE-08`, `CRT-01`, `CRT-06`,
`CRT-07`, `CRT-09`, `WRIT-03`

**PATH IDS**: `D-01`…`D-07`, `D-05b`, `D-09`, `M-01`, `M-02`, `M-03`, `M-04`, `M-05`, `B-01`,
`B-04`, `B-07`, `B-09`, `B-10`, `C-01`, `C-02`, `C-05`, `L-02`, `C-06`, `R-01`, `A-01`, `A-04`

**CURRENT**

La fecha se renderiza read-only como 3 `AppText` sin `onPress` (`MemoryIntake.tsx:806-820`),
mientras `MemorySemanticDateFields` con 4 chips + `DatePickerSheet` **existe y solo esta
montado en el formulario escrito** (`:791` vs `:806-820`). **No existe** ningun `PATCH` de
memory: la unica ruta `PATCH` de contenido es `/content/:contentId/file`, que es de **Files**
(`backend/src/routes/homecloud.js:60`). El audio importado resuelve
`unknownMediaCaptureMetadata()` forzado (`homecloudMemoryPicker.ts:145`). El menu de create
tiene **4** items y el de galeria esta rotulado `Elegir foto/video/audio`, que abre una
**segunda** hoja `Elegir contenido` con un item `Audio` (`MemoryIntake.tsx:677`, `:699-750`,
`:745`). `permissionDenied` y `canAskAgain` **nunca los emite ningun picker** ⇒ `Abrir
configuracion` es rama muerta (`CRT-06`). Elegir `Fecha exacta` en el escrito rellena hoy a
las 00:00 UTC sin avisar (`WRIT-03`).

**TARGET**

(a) `PATCH /memories/:contentId` que escribe `captured_at`, `captured_year`,
`captured_month`, `capture_precision`, `caption` y `hidden_from_resurfacing`, con la
validacion de captura **ya existente** reutilizada. (b) La fecha editable en el review binario
de los 4 origenes. (c) Superficie `Informacion del recuerdo` con las dos fechas distinguidas.
(d) Menu de create de 5 items planos con `Importar audio` de primer nivel y **sin**
`Fotos y videos` ⇒ audio.

**REAL GAP**

Endpoint + servicio cliente + dos superficies de edicion + enrutado de menu. **El intake de
audio no se reescribe** (§6.6).

**FILES LIKELY TO CHANGE**

- `backend/src/routes/homecloud.js` — 1 ruta `PATCH` nueva
- `backend/src/services/homecloudMemoryService.js` — **nuevo**
- `backend/src/services/homecloudIntakeValidation.js` — reutilizar, **no** duplicar
- `front/mi-front-limpio/services/homecloud/homecloudReadService.ts` — `updateMemory`
- `front/mi-front-limpio/components/homecloud/MemorySemanticDateFields.tsx` — **conectar**
- `front/mi-front-limpio/components/homecloud/MemoryMediaReview.tsx` — montar los campos
- `front/mi-front-limpio/components/homecloud/MemoryInfoSheet.tsx` — **nuevo**
- `front/mi-front-limpio/services/homecloud/MemoryIntake.tsx` — menu de create
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx` — abrir Info

**FILES FORBIDDEN / OUT OF SCOPE**

`homecloudStoragePaths.js` · `homecloudUploadEngine.ts` · `homecloudMemoryPicker.ts` **salvo
leerlo** (la derivacion de audio importado **no** cambia: §6.5, `INTAKE-03c`) ·
`MemoryAudioPage.tsx` · cualquier ruta de Files · cualquier `lifecycle` (ST-1) · migraciones ·
el `...` del Viewer (ST-5) · `package.json` · **no borrar** `pickAudioMemory`,
`DocumentPicker audio/*`, `AUDIO_MIME_BY_*`, `AudioReview`, `unknownMediaCaptureMetadata`
(**prohibido por §6.6**).

**DATABASE / MIGRATION IMPACT**

**0 migraciones.** `captured_at`, `captured_year`, `captured_month`, `capture_precision`,
`caption` y `hidden_from_resurfacing` ya existen. El `capture_semantics_check` y el
`capture_component_range_check` **se conservan intactos** y son la validacion de referencia.

**PERMISSION IMPACT**

`PATCH` de metadata exige `homecloud.organize`. `Importar audio` exige `homecloud.contribute`.
**0 cambios en la matriz.**

**SHARED-INFRA IMPACT**: NO.

**DEPENDENCY CHANGES**

**Ninguna.** `react-native-calendars@1.1314.0` ya esta instalada y es la que usan los 4 chips
existentes.

**IMPLEMENTATION SLICES**

1. `CRT-01` + `CRT-07` + `CRT-09`: **menu de create de 5 acciones planas.** Agregar
   `Importar audio` como item 3, con `onPress` ⇒ `chooseAudio()`, la funcion de CURRENT.
   Renombrar `Elegir foto/video/audio` ⇒ `Fotos y videos`. **Eliminar la hoja `Elegir
   contenido`** y su item `Audio`. Ordenar los items 1..5. `Grabar audio` no se toca: ya es
   item de primer nivel (`CRT-08` `IMPLEMENTED`).
2. `DATE-03`: montar `MemorySemanticDateFields` + `DatePickerSheet` en el review binario, para
   los 4 origenes. La fecha deja de ser read-only y pasa a ser un dato de primera clase
   (§6.2: no un resumen gris de 3 `AppText` en tono secundario).
3. `INFO-03` (backend): `PATCH /api/homecloud/memories/:contentId`. Acepta
   `{captured_at?, captured_year?, captured_month?, capture_precision?, caption?,
   hidden_from_resurfacing?}`. **Reutiliza** la validacion de semantica de captura existente.
   **Rechaza** `lifecycle`, `uploaded_at`, `household_id`, paths y `folder_id`, igual que
   `register` (`DATE-02`). Exige `homecloud.organize`. Valida pertenencia al hogar **en el
   servidor**: nunca confia en el id del cliente.
4. `INFO-03` (cliente): `updateMemory` en `homecloudReadService.ts`.
5. `DATE-04` + `DATE-11`: superficie `Informacion del recuerdo` con fecha editable, las dos
   fechas distinguidas (`CUANDO OCURRIO` = semantica; `CUANDO SE AGREGO` = `uploaded_at`) y
   `QUIEN LO AGREGO`.
6. `DATE-11`: la transicion `partial -> exact` existe **solo** como eleccion del usuario. La
   validacion rechaza `exact` sin dia valido. **Prohibido** cualquier default: si el usuario
   elige `exact` sin dia, se **pide** el dia. `year` ⇒ `exact` exige mes **y** dia.
7. `INTAKE-07` + `INTAKE-08`: jerarquia de la fecha en el review: preview dominante, Fecha
   como dato de primera clase, Album y Descripcion opcionales.
8. `WRIT-03`: al elegir `Fecha exacta` en el formulario escrito, **no** rellenar hoy a las
   00:00 UTC en silencio. O se pide el dia explicitamente, o se marca como valor por defecto
   con copy honesto. Hoy el usuario puede creer que registro una hora real.
9. `CRT-06`: emitir `permissionDenied` / `canAskAgain` desde los pickers para que
   `Abrir configuracion` deje de ser rama muerta. **Aplica tambien a `DocumentPicker`**, que
   tras el slice 1 es el primer picker de un item de primer nivel.
10. `INTAKE-09`: el JSX debe usar la autoridad de destinos ya exportada
    (`canShowDestinationSelector`, `getInitialAlbum`, `hasAlbumContext`, `selectDestination`)
    en vez de estado local. Es el mismo modelo de doble autoridad que ST-5 va a resolver para
    acciones; aqui se cierra porque toca el mismo archivo.

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **RETARGET** | `homecloud_2c_memory_intake_tests` | afirma el menu de **4** items |
| **RETARGET** | `homecloud_s0_gallery_intake_contract_tests` | idem + item `Elegir foto/video/audio` |
| **RETARGET** | cualquier test que afirme `Fotos y videos ⇒ … ⇒ Audio` | el camino de audio ya no pasa por galeria |
| **ADD** | `homecloud_create_menu_contract_tests` | 5 items por nombre y copy, en orden; **ausencia** de `Elegir contenido` |
| **ADD** | `homecloud_import_audio_entry_tests` | `Importar audio` alcanzable en un tap; llama al servicio de audio **existente** |
| **ADD** | `homecloud_memory_date_edit_tests` | las 4 precisiones en intake, con `MemorySemanticDateFields` |
| **ADD** | `homecloud_memory_patch_backend_contract_tests` | validacion de captura, rechazo de campos prohibidos, `organize` exigido |
| **ADD** | `homecloud_partial_to_exact_tests` | `month_year`/`year`/`unknown` ⇒ `exact` **solo** con dia explicito |
| **ADD** | `homecloud_memory_info_surface_tests` | las dos fechas distinguidas; **ausencia** de `mimeType`/ruta/tamano |
| **ADD** | `homecloud_written_date_default_tests` | el escrito no afirma una hora que el usuario no eligio (`WRIT-03`) |
| **KEEP** | `homecloud_moa1_written_memory_*` | `WRIT-01`: crear escrito |
| **KEEP** | `homecloud_upload_*`, `homecloud_t1_*`, `homecloud_s2i_*` | `PERF-06`: upload durable |

**Test negativo obligatorio**: un test que afirme que **no existe** ninguna ruta que escriba
`capture_precision='exact'` sin dia explicito del usuario. Es la defensa de `R21` contra un
futuro "arreglo" automatico de fechas.

**AUTOMATED GATE**

Las 7 suites nuevas + las 2 retargeteadas + typecheck filtrado.

**DEVICE QA GATE**

Obligatorio. Este stage introduce el create de 5 acciones y las dos superficies de fecha, y
los tres sonDEVICE_ONLY por naturaleza: no hay forma de probar "el usuario puede corregir
esto" leyendo codigo.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | Menu de create: 5 items, en orden, sin submenu | `DEVICE_PREFERRED` |
| 2 | `Importar audio` ⇒ picker ⇒ review con `Sin fecha` **editable** ⇒ guardar | `DEVICE_ONLY` |
| 3 | `Fotos y videos` **no** ofrece audio | `DEVICE_ONLY` |
| 4 | Corregir la fecha en el review y verla persistida | `DEVICE_PREFERRED` |
| 5 | `Importar audio` con `Sin fecha` ⇒ Info ⇒ corregir a `exact` ⇒ persiste | `DEVICE_ONLY` |
| 6 | `Grabar audio` sigue funcionando y con fecha `exact` | `DEVICE_PREFERRED` |
| 7 | Abrir y cerrar `Informacion del recuerdo`; ninguna accion destructiva | `DEVICE_PREFERRED` |
| 8 | Con `organize = false`, la fecha no es editable | `DEVICE_PREFERRED` |

**FAILURE / ROLLBACK STRATEGY**

El `PATCH` se monta tras un flag y valida campo por campo: fecha primero, luego descripcion,
luego membresias. Si el endpoint falla en device QA, se puede **desmontar la superficie de
Info** sin revertir la fecha en intake, que es independiente. El menu de create se revierte
completo en un commit: son 4 lineas de JSX y la eliminacion de una hoja que no tiene otros
consumidores.

**El mayor riesgo de este stage es la tentacion de "simplificar" audio.** §6.6 es explicito: si
el slice 1 toca `homecloudMemoryPicker.ts`, `MemoryMediaReview.tsx` o `MemoryAudioPage.tsx`
para "dejarlo mas limpio", STOP.

**COMMIT BOUNDARIES**

10 commits. El slice 1 (menu) es **independiente** y commiteable solo: es el gap de menor
effort/impacto del plan y no debe quedar bloqueado por el endpoint.

**EXIT CRITERIA**

- [ ] Menu de 5 items planos; `Elegir contenido` **no** existe
- [ ] `Importar audio` es alcanzable en un tap y usa el servicio **existente**
- [ ] `Fotos y videos` ofrece solo imagen y video
- [ ] `PATCH` de memory valida la semantica de captura y rechaza campos prohibidos
- [ ] La fecha es editable en intake para los 4 origenes
- [ ] `Informacion del recuerdo` existe y distingue las dos fechas
- [ ] `partial -> exact` requiere dia explicito del usuario
- [ ] Ninguna pieza de audio existente fue eliminada
- [ ] 8 casos de device QA ejecutados, 3 `DEVICE_ONLY`

**DO NOT ADVANCE IF**

- Se elimino o reescribio `pickAudioMemory`, el `DocumentPicker audio/*`, el `AudioReview` o
  `unknownMediaCaptureMetadata` (§6.6, `R22`)
- El `PATCH` acepta `lifecycle`, `uploaded_at`, `household_id` o paths
- Aparecio alguna ruta que escriba `exact` sin dia (`R21`)
- `MemorySemanticDateFields` se **duplico** en vez de conectarse
- El test de create menu sigue afirmando 4 items

---

### ST-4 — VIEWER INMERSIVO SIN MODAL ANIDADO

**OBJECTIVE**

Que el Viewer sea una superficie inmersiva: chrome global oculto, safe areas correctas, nada
bajo la navbar.

**WHY NOW**

Es **P0 de producto** (`R4`, **P2 confirmado**) y bloquea el significado de casi todo lo que
se construya encima del Viewer: `VIEW-08` (ST-5), `RESURF-06` (ST-8), `ALB-13` (ST-5) y la
puerta fisica de ST-5 necesitan un chrome que ocupe la pantalla. Ademas introduce el riesgo
`R13` (dos modales de RN), asi que debe resolverse **antes** de que exista un `...` que abra
una hoja.

**PRODUCT TARGET**

§13.1 (inmersivo), §13.2 (chrome oculto), §13.3 (safe areas), §29 (44x44, sin constantes
magicas), §4.2 + §5 (**un** host modal a la vez).

**GAP IDS**: `VIEW-01`, `VIEW-09`, `IMG-06`, `LOAD-01` (estados colgantes del Viewer)

**PATH IDS**: `H-02`, `H-03`, `H-05`, `I-06`, `J-01`, `R-06`

**CURRENT**

`MemoryViewer.tsx:206` renderiza `<View style={styles.overlay} accessibilityViewIsModal>` con
`overlay:{...absoluteFill, zIndex:20, backgroundColor:'#000'}`. El navbar global es un
**hermano** con `zIndex:10` (`HomeTabNavigator.tsx:431`); `zIndex` no es transitivo entre
subarboles, asi que pinta encima y tapa ~102 px. **No consulta safe-area**; `paddingTop:90` y
`bottom:spacing[5]` son magicos (linea 291). El cierre es `AppButton variant="icon"
size="sm"` = **42x42** (`AppButton.tsx:119-120`: `smallButtonHeight=42` vs
`touchTargets.normal=44`). Si `accessToken === null`, no se pide original, el preview queda
`unavailable`, `uri` queda `null` y `failed` queda `false` ⇒ **spinner perpetuo** sin error ni
retry (`IMG-06`).

**TARGET**

Chrome global **realmente ausente** mientras el Viewer esta abierto; insets consultados;
cierre >= 44x44; todo estado de carga **finito** (§14.4).

**REAL GAP**

Un `zIndex` que no funciona, tres constantes magicas, un boton 2 px corto, y un estado de carga
sin salida.

**FILES LIKELY TO CHANGE**

- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx`
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx` — publica `viewerOpen`
- `front/mi-front-limpio/screens/HomeCloudScreen.tsx` — propaga el estado
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` — **oculta** navbar / segmented /
  `AppTopBar`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryOriginal.ts` — timeout + `signal`
- `scripts/homecloud_viewer_immersive_tests.ts` — **nueva**

**FILES FORBIDDEN / OUT OF SCOPE**

`ActionSheet.tsx` (**decision §5.1, opcion B**) · `backend/**` · `MemoryVideoPage.tsx` y
`MemoryAudioPage.tsx` (ST-9) · el `...` de acciones (ST-5) ·
`react-native-gesture-handler` · `react-native-reanimated` · `package.json` ·
`BottomTabView` global de la app mas alla de ocultar.

**DATABASE / MIGRATION IMPACT**: 0.
**PERMISSION IMPACT**: ninguno.
**SHARED-INFRA IMPACT**: **NO**, por construccion: no se toca `ActionSheet` ni ningun UI kit.

**DEPENDENCY CHANGES**: **NINGUNA.** `react-native-safe-area-context@5.7.0` **ya esta
instalada** y ya se usa en `MemoryCameraSurface.tsx:6` y `HomeCloudScannerScreen.tsx:14`.
`DEP-03` lo dice: la correccion de `VIEW-01` **no requiere dependencia nueva**. Se usa
`useSafeAreaInsets()`.

**IMPLEMENTATION SLICES**

1. `VIEW-01` (seam): `HomeCloudMemoriesScreen` publica `viewerOpen`. `HomeCloudScreen` lo
   propaga. `HomeTabNavigator` **oculta** navbar, segmented control y `AppTopBar` cuando es
   `true`. **No** se introduce ningun `Modal`.
2. `VIEW-01` (insets): reemplazar `paddingTop:90` y `bottom:spacing[5]` por
   `useSafeAreaInsets()`. Top chrome dentro de `insets.top` con padding >= 12; bottom chrome
   dentro de `insets.bottom`; media viewport entre ambos.
3. `VIEW-01` (jerarquia): sustituir `zIndex:20` por el area liberada. Eliminar el mecanismo
   `zIndex` como forma de immersive-ness.
4. `VIEW-09`: cierre a **44x44** (`touchTargets.normal`). Sin tocar `AppButton` global: usar el
   `size` correcto o `hitSlop`.
5. `IMG-06`: estado de carga **finito**. Si no hay token ni preview, es un **error con
   retry**, no un spinner. Anadir timeout y estado terminal al fetch del original, que hoy no
   tiene ni `signal` ni timeout.
6. `LOAD-01` (Viewer): `Missing` con salida, y ningun estado intermedio que cuelgue.
7. Re-verificar `VIEW-10`: al cambiar el arbol del Viewer, confirmar que `unmount` **sigue**
   desmontando la pagina y que `useVideoPlayer`/`useAudioPlayer` siguen siendo la unica
   autoridad de release. **Este invariante no se reabre** (§15.6).

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **ADD** | `homecloud_viewer_immersive_tests` | `viewerOpen` ⇒ navbar no montado; insets consultados; `zIndex` fuera |
| **ADD** | `homecloud_viewer_loading_states_tests` | cada estado tiene salida; el perpetuo no existe |
| **ADD (negativo)** | `homecloud_viewer_no_nested_modal_tests` | el Viewer **no** renderiza un `Modal` de RN ⇒ `CRT-03` y `ACT-08` siguen `IMPLEMENTED` |
| **KEEP** | `homecloud_hc2b_media_viewer_tests` | `VIEW-10`: un solo `AppState`, `authorized===false` ⇒ pause, sin `release()` manual |
| **KEEP** | `homecloud_hc2c_viewer_opening_tests` | apertura exacta + opening lock |

**AUTOMATED GATE**

Las 3 suites nuevas + `homecloud_hc2b_media_viewer_tests` + typecheck + `expo lint` filtrado a
`components/homecloud/**`.

**DEVICE QA GATE**

Obligatorio, y con la puerta mas pesada del plan: §5.1 eligio una arquitectura que **solo** la
fisica puede validar.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | Viewer abierto: navbar global **ausente**, no tapado | `DEVICE_ONLY` |
| 2 | Notch y home indicator: media y acciones nunca debajo | `DEVICE_ONLY` |
| 3 | Top chrome dentro del safe area superior, sin solaparse con el notch | `DEVICE_ONLY` |
| 4 | Bottom chrome (etiqueta de fuente + controles) dentro del safe area inferior | `DEVICE_ONLY` |
| 5 | Hit area del cierre >= 44x44 al tacto | `DEVICE_ONLY` |
| 6 | Con red caida: error con retry en tiempo acotado, **no** spinner eterno | `DEVICE_ONLY` |
| 7 | Abrir una hoja **desde** el Viewer: **un** modal, no dos | `DEVICE_ONLY` |
| 8 | Cerrar el Viewer: el llamador vuelve con su offset | `DEVICE_PREFERRED` |

**FAILURE / ROLLBACK STRATEGY**

El slice 1 es el unico que toca tres archivos. Si ocultar el navbar rompe otra superficie, se
revierte **solo** el slice 1: el Viewer sigue inmersivo por `zIndex` y se pierde P2, pero no
se rompe la app. Los slices 2-4 son locales a `MemoryViewer.tsx` y se revierten
independentemente.

**Si en device QA el caso 7 muestra dos modales**, la decision §5.1 es incorrecta y hay que
volver a la **opcion C** (modo `inline` de `ActionSheet`). Eso se declara aqui como
contingencia, **no** se ejecuta sin volver a revisar §7.2, porque toca UI kit compartido.

**COMMIT BOUNDARIES**: 7 commits. Ninguno toca backend ni `ActionSheet`.

**EXIT CRITERIA**

- [ ] Navbar, segmented control y `AppTopBar` ausentes con el Viewer abierto
- [ ] Cero constantes magicas de safe area en el Viewer
- [ ] Cierre >= 44x44
- [ ] Ningun estado de carga perpetuo
- [ ] `VIEW-10` sigue verde tras el cambio de arbol
- [ ] Test negativo de modal anidado en verde
- [ ] 8 casos de device QA ejecutados, 7 `DEVICE_ONLY`

**DO NOT ADVANCE IF**

- Aparecio un `Modal` de RN envolviendo el Viewer
- Se toco `ActionSheet.tsx`
- El test negativo de modal anidado falla
- Cualquier media o accion queda bajo la navbar (P2 sin cerrar)
- `VIEW-10` se rompio al cambiar el arbol

---

### ST-5 — ACTION AUTHORITY + MENU DEL VIEWER

**OBJECTIVE**

Una sola autoridad de acciones, y el `...` que falta en el Viewer.

**WHY NOW**

`VIEW-08` es el **mayor desbloqueador del plan**: activa `ALB-13`, `INFO-01` (parcial),
`WRIT-04/05/06`, `RESURF-06` y las acciones de lifecycle del Viewer. `ACT-01` es la precondicion
de `ALB-12` (ST-7) y de `Q-07` (ST-8). Y debe venir **despues** de ST-4, porque convertir el
Viewer en inmersivo mientras no hay menu es trabajo incompleto, y abrir un `ActionSheet` desde
un Viewer no inmersivo tiene otro comportamiento de safe area.

**PRODUCT TARGET**

§18.1 (funcion pura unica), §18.2 (catalogo final), §18.3 (prohibiciones), §13.4 (`...` en el
top chrome), §4.2 + §5 (un host), §12.4 (catalogo de acciones de seleccion), §10.6
(vocabulario congelado).

**GAP IDS**: `ACT-01`, `ACT-02`, `ACT-03`, `VIEW-08`, `ALB-13`, `ALB-14`, `WRIT-04`, `WRIT-05`,
`WRIT-06`

**PATH IDS**: `N-01`…`N-07`, `H-04`, `E-10`, `E-11`, `E-12`, `L-04`, `L-05`, `L-06`, `G-05`,
`G-07`, `Q-07`

**CURRENT**

Hay **un** `ActionSheet` que sirve 3 acciones + el picker, y `AlbumActionsSheet` aparte
(`SCREEN:1924-2000`; `AlbumSheets.tsx:126-158`). **No** existe action authority compartido. El
chrome del Viewer tiene **solo** `top` y `bottom`: **no hay ningun control `...`**
(`MemoryViewer.tsx:207,217`) y sus props no incluyen ningun `onAction`. En seleccion hay solo
`Agregar a un album`, `Quitar N del album`, `Cancelar` — **3 de 6** (P6 subestima: faltan 4).
`removeMemoryFromOpenAlbum` **existe** y tiene **0 llamadores** en todo `front/`.
`homecloudDownloadService.ts:51-115` tiene la costura de share **probada en Files** y una
**fuga probada**: escribe en `Paths.document/HomeCloud/` y **nunca borra**.

**TARGET**

Una funcion pura `(surface, callerContext, selectionCount, memoryKinds, albumIdentity,
capabilities) => acciones[]`; el `...` del Viewer abre el **mismo** host; `Quitar del album`
alcanzable desde un solo Memory en un album; `Copiar` y `Compartir` operativos; 6 acciones en
seleccion (las de lifecycle llegan en ST-6).

**REAL GAP**

La autoridad compartida, el control `...`, 3 acciones de seleccion, 3 acciones de Viewer, 1
modulo muerto conectar, y una fuga de temporales en share.

**FILES LIKELY TO CHANGE**

- `front/mi-front-limpio/services/homecloud/homecloudMemoryActions.ts` — **nuevo**, pura
- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx` — control `...`
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx` — composicion
- `front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx` — hoja de acciones
- `front/mi-front-limpio/components/homecloud/AlbumSheets.tsx` — consumir la autoridad
- `front/mi-front-limpio/services/homecloud/homecloudMemoryAlbumRemoval.ts` — **conectar**
- `front/mi-front-limpio/services/homecloud/homecloudDownloadService.ts` — `Paths.cache` + borrado
- `scripts/homecloud_memory_action_authority_tests.ts` — **nueva**

**FILES FORBIDDEN / OUT OF SCOPE**

`ActionSheet.tsx` (solo consumir) · `backend/**` · `expo-clipboard` (**no** se agrega:
aislar la llamada de RN core) · las acciones destructivas de lifecycle (ST-6) · el album create
desde seleccion (ST-7) · `No mostrar este recuerdo aca` (ST-8) · migraciones ·
`package.json`.

**DATABASE / MIGRATION IMPACT**: 0.
**PERMISSION IMPACT**: las acciones se ocultan por capability (§26.4). Sin cambio de matriz.
**SHARED-INFRA IMPACT**: NO. `homecloudDownloadService` es de Files pero **se reutiliza** como
cliente; corregir `Paths.document` ⇒ `Paths.cache` + borrado es un fix de fuga, no un rediseño.
Si resultara ser un cambio de contrato de Files ⇒ `SHARED_INFRA_BLOCKER`.

**DEPENDENCY CHANGES**

**Ninguna.** `expo-sharing@57.0.22` y `expo-file-system@57.0.7` ya estan instaladas.
`Clipboard.setString` de RN core esta disponible (en deprecacion: aislar la llamada).
`Share.share` de RN core tiene precedente en el repo (`screens/InvitarPersonas.tsx:110`).

**IMPLEMENTATION SLICES**

1. `ACT-01`: `homecloudMemoryActions.ts` — **funcion pura**, sin store, sin reducer global, sin
   contexto nuevo. Determinista y testeable por tabla.
2. `VIEW-08` + `ACT-03`: control `...` en el top chrome del Viewer, hit area >= 44x44, con
   `accessibilityLabel`. El top chrome queda `[Cerrar] [Fecha semantica] [...]`.
3. `ACT-03` (acciones del Viewer): `Agregar a un album`, `Quitar del album` (solo si hay album
   abierto), `Informacion del recuerdo`, `Compartir`, `Copiar` (solo escrito),
   `Mover a papelera` (ST-6), `No mostrar este recuerdo aca` (ST-8). El **mismo** host, el
   contenido se **reemplaza** (§18.4): nunca se apila un segundo modal.
4. `ACT-02`: las 3 acciones de lifecycle en seleccion **se cablean pero no se habilitan**
   hasta ST-6. Regla dura: ninguna accion destructiva es alcanzable antes de que su backend y
   su gate existan.
5. `ALB-13`: **conectar** `removeMemoryFromOpenAlbum`, que ya existe y esta muerto. `Quitar N
   del album` desde un solo Memory en un album. Mismo copy, misma semantica, **el usuario
   sigue en Album A**.
6. `ALB-14`: `Agregar a otro album` — **falta** porque un Memory es N:M y un unico destino no
   basta. Selector de destino dedicado cuando hay muchos (§18.4).
7. `WRIT-04` + `WRIT-05`: `Copiar` y `Compartir` para recuerdo escrito. Aislar
   `Clipboard.setString`. Compartir texto con `Share.share({message})`, **nunca** la signed URL.
8. `WRIT-06`: OS share de binario. Solo Memories **binarios**: `HomeCloudMemoryListItem` tiene
   `displayName`/`mimeType`/`sizeBytes` **anulables** y la firma los exige no nulos. Nunca la
   signed URL: temporal local acotado en cache.
9. Fuga de temporales: `Paths.document` ⇒ `Paths.cache` + borrado en exito y en error.

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **ADD** | `homecloud_memory_action_authority_tests` | tabla completa `(surface x callerContext x count x kinds x album x capabilities)` |
| **ADD** | `homecloud_viewer_action_menu_tests` | el `...` existe; `Quitar del album` solo donde aplica |
| **ADD** | `homecloud_written_memory_share_tests` | copiar + compartir texto + compartir binario |
| **ADD (negativo)** | `homecloud_share_temp_cleanup_tests` | el temporal se borra en exito y en error |
| **KEEP** | `homecloud_moa3_memory_selection_tests:1163` | la seleccion **no** incluye `hidden_from_resurfacing` |
| **KEEP** | el test que verifica la **ausencia** de `memories` en la sesion del Viewer | invariante correcta |
| **RETARGET** | aserciones del numero de acciones (3 de 6) | pasan a la tabla de la autoridad |
| **DELETE_LATER** | la parte de grep de `homecloud_hc2a_memories_viewer_tests` | HC2-C §36: un test cuyo unico valor es buscar una cadena |

**AUTOMATED GATE**

Las 4 suites nuevas + `homecloud_moa3_*` + typecheck + lint focalizado.

**DEVICE QA GATE**

Obligatorio. El share de iOS y la confirmacion de `Clipboard` son comportamiento de
plataforma: ningun test los demuestra.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | `...` del Viewer abre **un** modal; cerrar vuelve al Viewer | `DEVICE_ONLY` |
| 2 | `Quitar del album` desde 1 Memory: el Memory sobrevive, el usuario sigue en Album A | `DEVICE_PREFERRED` |
| 3 | En Album: `Quitar del album` **aparece**; en raiz y Tipo, **no** | `DEVICE_PREFERRED` |
| 4 | `Copiar` en un escrito: `Copiado` honesto (iOS no muestra confirmacion) | `DEVICE_ONLY` |
| 5 | `Compartir` texto y binario: share sheet de iOS, descarte honesto | `DEVICE_ONLY` |
| 6 | Share de un video grande: el temporal se borra (espacio antes/despues) | `DEVICE_ONLY` |
| 7 | Con `organize = false`: no hay `Quitar del album` ni `Agregar a un album` | `DEVICE_PREFERRED` |
| 8 | No hay **nested modal** en ningun camino | `DEVICE_ONLY` |

**FAILURE / ROLLBACK STRATEGY**

La autoridad es una funcion pura: si su tabla esta mal, se **corrige la tabla**, no se parchea
el llamador. El `...` del Viewer se revierte en un commit (es un control + un `onPress`).
Conectar `removeMemoryFromOpenAlbum` es reversible sin tocar el modulo. La fuga de share se
puede corregir **por separado** del share mismo.

**COMMIT BOUNDARIES**: 9 commits. Slices 1-2 son un par inseparable (autoridad + `...`); los
slices 7-9 (escrito + share + fuga) son otro par.

**EXIT CRITERIA**

- [ ] La autoridad es pura, determinista y testeada por tabla
- [ ] El `...` del Viewer existe con hit area >= 44x44
- [ ] `Quitar del album` alcanzable desde un solo Memory, solo dentro de un album
- [ ] `Copiar` y `Compartir` operativos para texto y binario
- [ ] El temporal de share se borra siempre
- [ ] Un solo host modal en todos los caminos
- [ ] 8 casos de device QA ejecutados, 5 `DEVICE_ONLY`

**DO NOT ADVANCE IF**

- Aparecieron dos modales simultaneos
- Se toco `ActionSheet.tsx`
- Se habilito una accion destructiva de lifecycle antes de ST-6
- La fuga de temporales sigue presente
- Se agrego `expo-clipboard` o `expo-sharing` como dependencia nueva

---

### ST-6 — LIFECYCLE UI: PAPELERA, UNDO, RESTORE, PURGE

**OBJECTIVE**

La superficie de Papelera, `Mover a papelera` con `Deshacer`, `Restaurar` y borrado permanente
con confirmacion.

**WHY NOW**

Depende **estrictamente** de ST-1 (el backend y el gate de `homecloud.delete` ya existen). Es
el trabajo de UI de mayor riesgo del plan, asi que va despues de ST-5: el `...` del Viewer y las
acciones de seleccion ya existen (ST-5 los cableo) y aqui se **habilitan**.

**PRODUCT TARGET**

§20.1 (entrada + `Deshacer`), §20.2 (**membresias se preservan**), §20.3 (Papelera como
superficie de primer nivel), §20.4 (semantica de restore), §20.5 (purge), §20.6 (permisos),
§18.2, §19.4 (visibilidad), §27.3.

**GAP IDS**: `LIFE-01` (UI), `TRASH-01`, `TRASH-03`, `TRASH-04`, `TRASH-07`

**PATH IDS**: `O-01`…`O-04`, `P-01`…`P-12`, `A-10`, `N-01`, `N-02`, `G-08`, `T-04`

**CURRENT**

**No existe ninguna parte de la UI.** El backend de ST-1 expone las transiciones y filtra
`lifecycle='active'` en SQL; el 404 de signed URL para `TRASHED` ya funciona (`TRASH-06`,
`IMPLEMENTED`). `SEL-07` (fallo parcial honesto) y `SEL-08` (validacion de destino
autoritativa) son **ejemplares y se reutilizan tal cual**
(`homecloudMemoryMutations.ts:72-90`).

**TARGET**

`Mover a papelera` desde Viewer y seleccion, con feedback `Deshacer` que es un **restore
completo**; Papelera como banda en la raiz **solo si hay contenido**; `Restaurar` de 1 y N que
**conserva membresias** y **no restaura en relacion inexistente**; `Eliminar definitivamente`
con confirmacion **exigiendo `homecloud.delete`**; `Vaciar papelera` con conteo y confirmacion.

**REAL GAP**

Toda la UI. El backend ya esta.

**FILES LIKELY TO CHANGE**

- `front/mi-front-limpio/services/homecloud/homecloudMemoryLifecycle.ts` — **nuevo**, cliente
- `front/mi-front-limpio/components/homecloud/MemoryTrashDetailView.tsx` — **nuevo**
- `front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx` — habilitar lifecycle
- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx` — habilitar lifecycle
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx` — banda + fuente
- `front/mi-front-limpio/services/homecloud/homecloudMemoryViewerSource.ts` — **cuarta**
  factory `{kind:'trash', sourceId}`
- `scripts/homecloud_trash_surface_tests.ts` — **nueva**

**FILES FORBIDDEN / OUT OF SCOPE**

`backend/**` (ST-1 ya lo hizo) · `homecloud_albums.lifecycle='trashed'` (`ALB-15`: **sin Album
Trash por decision**, no es un gap) · `Archive` (OUT) · `Hidden` (OUT) · cualquier estado nuevo
en la DB · `paths/homecloud/` (se usa el helper existente).

**DATABASE / MIGRATION IMPACT**: 0. **Prohibido** introducir `purged` como estado.
**PERMISSION IMPACT**: frontend **oculta**; el backend **exige**. Sin `delete`, no se renderiza
`Eliminar definitivamente` ni `Vaciar papelera`.
**SHARED-INFRA IMPACT**: NO.
**DEPENDENCY CHANGES**: ninguna.

**IMPLEMENTATION SLICES**

1. Cliente de lifecycle: `trash`, `restore`, `purge`, `purgeAll`, **reutilizando** el patron de
   fallo parcial de `SEL-07` y la revalidacion autoritativa de `SEL-08`.
2. `O-01` + `O-02`: `Mover a papelera` desde Viewer y seleccion. El Memory desaparece **de
   inmediato** de su superficie.
3. `O-03`: feedback con **`Deshacer`** durante un plazo razonable. `Deshacer` es un **restore
   completo**, no un "undo" cosmetico.
4. `P-01` + `P-02`: banda de Papelera en la raiz, en la posicion de Albums/Tipos, **solo si hay
   contenido**. Vacia ⇒ **no se muestra** (no es un album vacio). `La papelera esta vacia.`
5. `P-03` + `P-04`: `Restaurar` de 1 y N. **Conserva la membresia** si el album sigue
   existiendo; **no** la restaura si el album fue eliminado. Restaurar en el hogar **actual** si
   cambio.
6. `P-05`: verify `restore` cuando el album previo fue eliminado. La membresia ya cayo por
   `ON DELETE CASCADE` (`20260910000003:116`), luego **no hay relacion huerfana que recrear**.
   Sin error y sin mencion.
7. `TRASH-04` + `P-06` + `P-07`: `Eliminar definitivamente` con `CONFIRM DIALOG` **siempre**.
   Copy obligatoria si son N. **Requiere `homecloud.delete`.**
8. `P-08`: `Vaciar papelera` con `CONFIRM DIALOG` y conteo. **Requiere `homecloud.delete`.**
9. `P-09` + `P-10` + `P-11`: un Memory `TRASHED` desaparece de album, tipo y resurfacing. El
   filtro ya es SQL (ST-1); aqui se verifica que **nada** lo reintroduce.
10. `P-12`: signed URL de un `TRASHED` da **404**. Ya implementado (`TRASH-06`); se verifica.
11. Cuarta `viewer` factory: `{kind:'trash', sourceId}` + extension del union
    `MemoryViewerSourceKind`. **Aditiva**: la fuente sigue siendo inmutable y el pager recorre
    **solo** la papelera (§27.5).
12. Habilitar las acciones de lifecycle en el `...` del Viewer y en la hoja de seleccion (las que
    ST-5 cableo y no habilito).

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **ADD** | `homecloud_trash_surface_tests` | banda condicional; vacio no se muestra |
| **ADD** | `homecloud_lifecycle_client_tests` | 3 transiciones + fallo parcial honesto |
| **ADD** | `homecloud_restore_membership_tests` | conserva si el album existe; **no** crea relacion inexistente |
| **ADD** | `homecloud_purge_ui_gating_tests` | con `delete = false`, `Eliminar definitivamente` **no se renderiza** |
| **ADD** | `homecloud_viewer_trash_source_tests` | la 4a factory: fuente inmutable, pager solo de papelera |
| **ADD (negativo)** | `homecloud_trashed_visibility_tests` | `TRASHED` **no** aparece en Timeline, Tipo, Album ni Resurfacing |
| **KEEP** | `homecloud_hc2b_media_viewer_tests:204-205` | el invariante de original/player solo en la pagina activa |
| **KEEP** | `homecloud_1e_storage_rls_tests` (ST-1 la descolgo) | 404 de `TRASHED` |

**AUTOMATED GATE**

Las 6 suites nuevas + las de ST-1 + typecheck.

**DEVICE QA GATE**

Obligatorio. La irreversibilidad del purge y el feedback de `Deshacer` no se pueden verificar
por codigo.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | `Mover a papelera`: desaparece al instante + `Deshacer` visible | `DEVICE_PREFERRED` |
| 2 | `Deshacer` ⇒ vuelve **con su album** | `DEVICE_PREFERRED` |
| 3 | Abrir Papelera, `Restaurar` N: los items salen de la lista | `DEVICE_PREFERRED` |
| 4 | Con `delete = false`: no hay `Eliminar definitivamente` ni `Vaciar papelera` | `DEVICE_PREFERRED` |
| 5 | `Eliminar definitivamente` con confirmacion: cancelar no borra, confirmar borra | `DEVICE_PREFERRED` |
| 6 | `Vaciar papelera` con conteo y confirmacion | `DEVICE_PREFERRED` |
| 7 | Con `contribute = false`: hay `Restaurar` pero no `Mover a papelera` | `DEVICE_PREFERRED` |
| 8 | Signed URL de un `TRASHED` da 404 | `AUTOMATABLE` |
| 9 | Un `TRASHED` **no** aparece en Timeline, Tipo, Album ni Resurfacing | `DEVICE_PREFERRED` |
| 10 | Cambiar de household con items en papelera: no hay fuga cruzada | `DEVICE_PREFERRED` |

**FAILURE / ROLLBACK STRATEGY**

Riesgo principal: una UI destructiva sin backend. **Mitigado por el orden**: ST-1 es condicion
de entrada y su suite de enforcement corre en este stage **antes** de cualquier device QA. Si
aun asi, `purge` y `purgeAll` se montan **al final** del stage, no al principio. El rollback es
apagar los flags de los endpoints: la UI muestra un error honesto, nunca finge exito.

**COMMIT BOUNDARIES**: 12 commits. Slices 1-3 (entrada + undo) pueden ser un commit. Slices
7-8 (purge) son un commit **aparte y posterior**.

**EXIT CRITERIA**

- [ ] `Mover a papelera` + `Deshacer` = restore completo
- [ ] Papelera condicional, vacio honesto
- [ ] `Restaurar` conserva membresias y no restaura en relacion inexistente
- [ ] Purge y vaciar papelera exigen `homecloud.delete` **en el servidor**
- [ ] Confirmacion obligatoria en toda accion irreversible
- [ ] La 4a `viewer` factory es aditiva
- [ ] 10 casos de device QA ejecutados

**DO NOT ADVANCE IF**

- Purge es alcanzable sin `homecloud.delete` en el backend
- Aparecio un estado `PURGED` en el schema
- Se implemento Album Trash (`ALB-15` es **decision**, no gap)
- Las membresias se destruyen al mover a papelera (§20.2 dice **preservar**)
- Un `TRASHED` es visible en alguna superficie

---

### ST-7 — ALBUMS: TILE FINAL Y CREAR DESDE SELECCION

**OBJECTIVE**

Quitar `+ Nuevo` del header, agregar el tile final del riel, y **crear un album desde los
Memories seleccionados** en el mismo flujo logico.

**WHY NOW**

`ALB-12` es **P0 de producto** y es el gap mas grande de la reconstruccion final: hoy es
**inexistente por decision de codigo** (`SCREEN:1916-1919,1934-1956,1964-1972`). Depende de
`SEL-03` (ST-2, el dataset del llamador debe ser correcto antes de construir acciones sobre
el) y del action authority (ST-5). Y el **tile final** es la correccion de `P5`.

**PRODUCT TARGET**

§10.1 (verdades intocables), §10.3 (tile final, sin `+ Nuevo` en el header), §10.4 (acciones de
album, `Eliminar album` **con** confirmacion), §10.5 (**crear album desde seleccion**,
obligatorio), §10.6 (vocabulario congelado), §12.1, §12.5.

**GAP IDS**: `ALB-01`, `ALB-02`, `ALB-03`, `ALB-06`, `ALB-08`, `ALB-12`, `ALB-14`

**PATH IDS**: `E-01`…`E-12`, `G-03`, `G-05`, `G-06`, `G-07`, `N-02`, `N-04`, `T-02`

**CURRENT**

`AlbumsRail.tsx:151-169` renderiza `+ Nuevo` en las **5** fases del estado (`:63,80,96,115`).
El `ScrollView` renderiza solo `albums.map(...)` (`:121-132`); `grep createTile` ⇒ **0**. El
estado vacio (`:93-109`) tiene icono + copy + boton `Crear album` **y ademas** el header
`+ Nuevo` ⇒ **dos affordances simultaneas**. `Eliminar album` es un boton destructivo
**directo en la hoja**, sin dialogo: `grep Alert.alert` en `components/homecloud/` ⇒ **0
resultados** (`AlbumSheets.tsx:144-156`). La copy `Los recuerdos no se eliminan: van a seguir
en Recuerdos.` si se renderiza siempre. El picker de destino se construye desde `rail.albums` y
el propio codigo documenta "no 'create an Album from here'"; el servicio de intake **prohibe**
crear albunes por contrato. `ALB-04`, `ALB-05`, `ALB-07`, `ALB-09`, `ALB-10`, `ALB-11`,
`ALB-16` son `IMPLEMENTED` y **se preservan**.

**TARGET**

La creacion de album es **una** accion en la raiz — el tile final del riel — presente
**siempre**, incluso con 0 albunes, con icono **y** etiqueta. `Nuevo album` en el selector de
destino de la seleccion, con el **mismo** flujo logico. `Eliminar album` con dialogo de
confirmacion.

**REAL GAP**

Dos affordances de creacion, un tile ausente, un dialogo ausente, y un flujo obligatorio
ausente.

**FILES LIKELY TO CHANGE**

- `front/mi-front-limpio/components/homecloud/AlbumsRail.tsx` — tile final, quitar header
- `front/mi-front-limpio/components/homecloud/AlbumSheets.tsx` — confirmacion + destino
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx` — flujo desde seleccion
- `front/mi-front-limpio/services/homecloud/homecloudReadService.ts` — revalidacion de destino
- `scripts/homecloud_hc2c_memories_root_tests.ts` (retarget) + nuevos de tile y de seleccion

**FILES FORBIDDEN / OUT OF SCOPE**

`backend/**` — `POST /api/homecloud/albums` y el attach **ya existen** (`ALB-04`) ·
`homecloudAlbumService.js` (`ALB-07`, `ALB-16`: eliminar album **no** borra Memories; quitar
membership **no** cambia lifecycle: intocables) · `homecloud_albums.lifecycle='trashed'`
(`ALB-15`) · migraciones · cambiar portada (OUT) · reordenar albums (OUT) · carpetas de albunes
(OUT) · `album folders` (OUT).

**DATABASE / MIGRATION IMPACT**: 0. Nombres duplicados permitidos, sin precheck, sin `UNIQUE`.
**PERMISSION IMPACT**: tile y acciones gated por `homecloud.organize`. **0 cambios en la
matriz.**
**SHARED-INFRA IMPACT**: NO.
**DEPENDENCY CHANGES**: ninguna.

**IMPLEMENTATION SLICES**

1. `ALB-02`: tile final del riel. **Ultimo** item, **siempre**, incluso con 0 albunes. Icono `+`
   **y** etiqueta de texto visible (un cuadrado vacio es inaceptable, rechaza P5). Gated por
   `organize`. Independiente de la posicion del scroll horizontal.
2. `ALB-01`: **quitar** `+ Nuevo` del header. Mover la affordance, **no duplicarla**.
3. `ALB-03`: estado con 0 albunes = **solo** el tile de creacion. Copy honesto; **no** una
   segunda accion.
4. `ALB-08`: `Eliminar album` con `CONFIRM DIALOG` y la copy obligatoria `Los recuerdos no se
   eliminan: van a seguir en Recuerdos.` El usuario debe **ver** la garantia antes de confirmar,
   aunque el backend ya la garantice.
5. `ALB-12`: el flujo. `N seleccionados` ⇒ `Acciones (...)` ⇒ `Agregar a un album` ⇒ hoja de
   destino con **[lista de albunes] + [Nuevo album]**. Si elige `Nuevo album`: campo de nombre
   ⇒ crea ⇒ **los N seleccionados se vuelven miembros en el mismo flujo logico** ⇒ **no** se
   pide reseleccionar ⇒ retorna al llamador original (§12.5).
6. `ALB-12` (variantes obligatorias): 0 albunes ⇒ `Nuevo album` es la accion primaria (hoy es
   un callejon sin salida). Cancelar el nombre ⇒ vuelve a la lista de destinos, **no** se crea
   album, **no** se pierde la seleccion. Falla la creacion ⇒ mensaje honesto en la misma hoja,
   seleccion intacta, reintentable. Falla parcial ⇒ los que si entraron quedan, los **fallidos
   siguen seleccionados y nombrados** (`SEL-07` ya resuelve esto). Duplicado ⇒ permitido, sin
   precheck. Album borrado en remoto ⇒ revalidacion autoritativa antes de confirmar (`SEL-08`),
   error terminal claro.
7. `ALB-14`: `Agregar a otro album` desde la seleccion dentro de un album. Es **necesario**
   porque un Memory es N:M.
8. `ALB-06`: verificar que `Quitar del album` sigue siendo **solo** por seleccion dentro de un
   album, y que ahora es alcanzable (ST-2 arreglo el dataset, ST-5 conecto el modulo).

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **RETARGET** | `homecloud_hc2c_memories_root_tests:264-265` | **afirma positivamente** `/\+ Nuevo/` + `accessibilityLabel="Nuevo album"` en el header ⇒ debe exigir el **tile final** y la **ausencia** del header action |
| **ADD** | `homecloud_album_create_tile_tests` | ultimo del riel; presente con 0; icono **y** etiqueta; `+ Nuevo` **ausente** del header |
| **ADD** | `homecloud_album_create_from_selection_tests` | las 7 variantes obligatorias de §10.5 |
| **ADD** | `homecloud_album_delete_confirmation_tests` | dialogo obligatorio + copy obligatoria |
| **KEEP** | `homecloud_moa1_album_contracts_tests` | `ALB-07`: eliminar album no borra Memories |
| **KEEP** | `homecloud_moa3_memory_selection_tests` | `SEL-07`, `SEL-08` |
| **KEEP** | `homecloud_2a_*_album_*` | `ALB-09/10/11` |

**AUTOMATED GATE**

Las 3 suites nuevas + la retargeteada + `homecloud_moa1_album_contracts` + typecheck.

**DEVICE QA GATE**

Obligatorio. Que el tile sea el ultimo y sobreviva con 0 albunes es exactamente el tipo de
detalle que el codigo no puede probar.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | Riel con 0 albunes: **solo** el tile final, con etiqueta | `DEVICE_PREFERRED` |
| 2 | Con 1 y con N: el tile es el **ultimo** siempre | `DEVICE_PREFERRED` |
| 3 | El header **no** tiene `+ Nuevo` | `DEVICE_ONLY` |
| 4 | Crear desde seleccion: los N quedan en el album **sin reseleccionar** | `DEVICE_ONLY` |
| 5 | 0 albunes + `Nuevo album` desde seleccion: no es callejon sin salida | `DEVICE_ONLY` |
| 6 | Cancelar el nombre: vuelve a destinos, seleccion **intacta** | `DEVICE_PREFERRED` |
| 7 | `Eliminar album`: ver la copy de supervivencia antes de confirmar | `DEVICE_PREFERRED` |
| 8 | `Quitar del album`: el Memory sobrevive y el usuario sigue en Album A | `DEVICE_PREFERRED` |
| 9 | Con `organize = false`: no hay tile, ni `+ Nuevo`, ni acciones de album | `DEVICE_PREFERRED` |
| 10 | Duplicar nombre de album esta permitido, sin error | `DEVICE_PREFERRED` |

**FAILURE / ROLLBACK STRATEGY**

Quitar `+ Nuevo` y agregar el tile es un commit **unico e invertible** por diseno: si el tile
no se ve bien en device QA, se revierte a `+ Nuevo` y `ALB-02` queda abierto (pero el header
funcionaba). La creacion desde seleccion se puede **desconectar** sin revertir el tile: son
commits separados. El dialogo de confirmacion es independiente y siempre revertsible.

**COMMIT BOUNDARIES**: 8 commits. Slices 1-3 juntos (la affordance de creacion). Slices 5-6
juntos (el flujo P0). Slice 4 aparte (confirmacion, riesgo destructivo).

**EXIT CRITERIA**

- [ ] El tile final es la **unica** accion de crear album en la raiz
- [ ] Presente con 0, 1 y N albunes, con icono y etiqueta
- [ ] `+ Nuevo` **ausente** del header
- [ ] Crear desde seleccion adjunta los N en el mismo flujo, sin reseleccionar
- [ ] Las 7 variantes de §10.5 se cumplen
- [ ] `Eliminar album` pide confirmacion con la copy obligatoria
- [ ] 10 casos de device QA ejecutados, 3 `DEVICE_ONLY`

**DO NOT ADVANCE IF**

- Aparecen dos affordances de crear album en la raiz
- El flujo pide reseleccionar los Memories
- Cancelar el nombre pierde la seleccion
- Un album vacio queda sin salida
- Se implemento Album Trash, o portada, o reordenamiento, o carpetas de albunes

---

### ST-8 — RESURFACING

**OBJECTIVE**

La banda `Para volver a ver`, sus grupos, sus acciones, y el unico camino de vuelta de una
fecha parcial.

**WHY NOW**

Depende de ST-3 (`PATCH` de memory ⇒ `DATE-11` ⇒ `RESURF-08`) y del action authority (ST-5), y
de la cuarta viewer factory (ST-6 la introduce; aqui se reutiliza el patron). Sin ST-3 la banda
existiria pero estaria casi siempre vacia, porque los videos de galeria y todo el audio
importado son `unknown`.

**PRODUCT TARGET**

§21.1–§21.7, §21.3.1 (**exact-only, sin resurfacing mensual**), §21.3.2 (**`partial -> exact`
solo por el usuario**), §21.4 (clave de agrupacion dia+mes), §21.5, §18.2 (`No mostrar este
recuerdo aca`), §12.1 (seleccion dentro del grupo preserva el grupo).

**GAP IDS**: `ROOT-10`, `RESURF-01`, `RESURF-02`, `RESURF-06`, `RESURF-08`

**PATH IDS**: `Q-01`…`Q-09`, `Q-02`, `Q-03`, `Q-04`, `Q-06`, `A-07`, `H-05`, `N-07`, `G-05`

**CURRENT**

**Ninguna** superficie. `hidden_from_resurfacing` esta **persistido, validado en backend y
proyectado** (`20260925000000:50`; `homecloudIntakeValidation.js:254-268`;
`homecloudMappers.js:73`), y el cliente lo escribe **hardcodeado `false`** para escritos
(`homecloudWrittenMemoryService.ts:34`): 2 ocurrencias en `front/`, **ambas no-UI**.
`listMemories` ya filtra por `year` y `kind` en SQL y ya tiene **orden total determinista** por
`captured_year/month/at`. El viewer tiene fuente inmutable y apertura exacta ⇒ una nueva
`sourceId` es **aditiva**.

**TARGET**

Banda en la raiz, arriba de Albums; grupos por dia+mes exactos, del mas reciente al mas
antiguo, **uno por ano**; seleccion dentro del grupo preservando el grupo; `No mostrar este
recuerdo aca`; y la transicion `partial -> exact` que conecta el resurfacing sin cache ni
estado.

**REAL GAP**

La banda, el algoritmo de agrupacion, la viewer factory, el dataset del grupo, y el copy de
ocultar.

**FILES LIKELY TO CHANGE**

- `front/mi-front-limpio/services/homecloud/homecloudMemoriesResurfacing.ts` — **nuevo**, pura
- `front/mi-front-limpio/components/homecloud/MemoryResurfacingBand.tsx` — **nuevo**
- `front/mi-front-limpio/components/homecloud/MemoryResurfacingDetailView.tsx` — **nuevo**
- `front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx` — banda
- `front/mi-front-limpio/services/homecloud/homecloudMemoryViewerSource.ts` — factory nueva
- `front/mi-front-limpio/services/homecloud/homecloudWrittenMemoryService.ts` — dejar de
  escribir `false` hardcodeado
- `scripts/homecloud_resurfacing_tests.ts` — **nueva**

**FILES FORBIDDEN / OUT OF SCOPE**

`backend/**` (`hidden_from_resurfacing` ya validado; el filtro `active` es de ST-1) ·
migraciones · **cualquier motor de resurfacing mensual** · **cualquier normalizacion que
complete una fecha parcial** · ocultar un grupo o rango de fechas (`RESURF-07` = OUT) · una
columna de "resurfacing evaluado" · un job de re-evaluacion · waveform · Search.

**DATABASE / MIGRATION IMPACT**: 0.
**PERMISSION IMPACT**: ver = `view`; `No mostrar este recuerdo aca` = `organize`.
**SHARED-INFRA IMPACT**: NO.
**DEPENDENCY CHANGES**: ninguna.

**IMPLEMENTATION SLICES**

1. `RESURF-01` (agrupacion): funcion **pura** y determinista. Filtro: `lifecycle = ACTIVE` ∧
   `capture_precision = 'exact'` ∧ `!hidden_from_resurfacing` ∧ `captured_at < hoy`. Clave de
   grupo = `day` + `month`; **un grupo por ano**; si el mismo dia aparece en tres anos, hay
   **tres** grupos, no uno con tres anos.
2. `RESURF-09` (**criterio de aceptacion negativo, parte del slice 1**): con Memories
   `month_year`/`year` presentes y al menos un `exact` elegible, la banda contiene **solo**
   grupos exactos. **No** existe `Octubre 2023 - hace 3 anos`. Si aparece, el slice no pasa.
3. `ROOT-10`: la banda en la raiz. **Si no hay grupos, no se muestra**: no es un vacio, no es
   un error, no es un boton deshabilitado. Sin skeleton permanente. Si el calculo falla, la
   banda no se muestra y la raiz no se bloquea (§21.7).
4. `RESURF-06` (grupo): `resurfacing:<group>` como superficie. Su dataset es **solo** el grupo.
   Entrar y salir preserva el offset del grupo.
5. `RESURF-06` (Viewer): viewer factory para `resurfacing`. El Viewer hace pager **solo dentro
   del grupo** (§21.5).
6. `RESURF-06` (seleccion): `Q-05` preserva el grupo como llamador.
7. `RESURF-02`: `No mostrar este recuerdo aca` desde Viewer, seleccion y grupo.
   `hidden_from_resurfacing = true`. El Memory **sigue** en Timeline, album y tipo. Copy de
   exito honesto. **Dejar de escribir `false` hardcodeado** para escritos.
8. `RESURF-08`: la transicion `partial -> exact` **conecta**. Se implementa con la logica de
   lectura de este mismo slice 1 mas el `PATCH` de ST-3. **Nada mas**: sin estado, sin cache,
   sin job. Si el usuario vuelve a dejar la fecha parcial, el Memory **desaparece** de la
   banda.

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **ADD** | `homecloud_resurfacing_grouping_tests` | filtro, clave dia+mes, un grupo por ano, tres anos ⇒ tres grupos |
| **ADD (negativo)** | `homecloud_resurfacing_no_monthly_tests` | con `month_year`/`year` presentes, la banda **no** contiene grupos parciales |
| **ADD** | `homecloud_resurfacing_empty_tests` | 0 grupos ⇒ **la banda no se monta** |
| **ADD** | `homecloud_resurfacing_partial_corrected_tests` | `partial -> exact` ⇒ aparece en la siguiente lectura; volver a parcial ⇒ desaparece |
| **ADD** | `homecloud_hidden_from_resurfacing_ui_tests` | la accion escribe el flag; el Memory sigue visible en las otras superficies |
| **ADD** | `homecloud_viewer_resurfacing_source_tests` | factory aditiva; pager solo del grupo |
| **KEEP** | `homecloud_moa3_memory_selection_tests:1163` | la seleccion **no** incluye `hidden_from_resurfacing` |
| **KEEP** | `homecloud_hc2b_media_viewer_tests` | `VIEW-05`, `VIEW-06` |

**Tests negativos obligatorios**: los dos marcados. Son la defensa de `R21` y la prueba de
`RESURF-09`.

**AUTOMATED GATE**

Las 6 suites nuevas + typecheck + lint focalizado.

**DEVICE QA GATE**

Obligatorio. La banda con datos reales, y sobre todo la transicion
`partial -> exact` ⇒ aparece, son el cruce de dos superficies y **no** hay forma de probarlo
por codigo.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | Con un `exact` de hace 3 anos, la banda aparece con el grupo correcto | `DEVICE_PREFERRED` |
| 2 | Con **solo** `month_year`/`year`: la banda **no** aparece | `DEVICE_ONLY` |
| 3 | El mismo dia en 3 anos ⇒ **3** grupos | `DEVICE_PREFERRED` |
| 4 | Editar un `unknown` a `exact` en Info ⇒ aparece en la banda | `DEVICE_ONLY` |
| 5 | Volver a dejarlo parcial ⇒ **desaparece** de la banda | `DEVICE_ONLY` |
| 6 | `No mostrar este recuerdo aca`: desaparece de la banda, **sigue** en Timeline | `DEVICE_PREFERRED` |
| 7 | Abrir un grupo, seleccionar, `X` ⇒ vuelve al **grupo**, mismo offset | `DEVICE_PREFERRED` |
| 8 | Abrir un Memory desde el grupo, cerrar ⇒ vuelve al grupo | `DEVICE_PREFERRED` |
| 9 | Con `organize = false`: no aparece `No mostrar este recuerdo aca` | `DEVICE_PREFERRED` |
| 10 | Seleccionar en un grupo y crear album: vuelve al grupo, no a la raiz | `DEVICE_PREFERRED` |

**FAILURE / ROLLBACK STRATEGY**

La banda es aditiva y su calculo es una funcion pura: si falla, **no se muestra** y la raiz no
se bloquea (§21.7). Ningun otro comportamiento depende de que exista. Se puede revertir el
componente entero sin afectar Timeline, Tipos ni Albums. `RESURF-08` **no** puede revertirse
sin romper `DATE-11`, asi que el rollback de la transicion es dejarla inactiva en la UI, no
tocar la validacion.

**COMMIT BOUNDARIES**: 8 commits. Slices 1-2 juntos (agrupacion + criterio negativo). Slice 3
(banda). Slices 4-6 (grupo + viewer + seleccion). Slice 7 (ocultar). Slice 8 (transicion).

**EXIT CRITERIA**

- [ ] La banda aparece **solo** si hay grupos elegibles
- [ ] Solo `exact` y fecha pasada participan
- [ ] Un grupo por ano; tres anos ⇒ tres grupos
- [ ] `No mostrar este recuerdo aca` funciona y no oculta de otras superficies
- [ ] La seleccion dentro de un grupo preserva el grupo
- [ ] `partial -> exact` hace aparecer el Memory **sin** accion adicional
- [ ] **Ninguna** conversion automatica de fecha parcial
- [ ] 10 casos de device QA ejecutados, 3 `DEVICE_ONLY`

**DO NOT ADVANCE IF**

- Aparecio un grupo de resurfacing mensual o por `month_year`
- La banda se muestra vacia, con spinner permanente, o deshabilitada
- Un Memory con fecha parcial corregida **no** aparece
- Un Memory oculto de resurfacing desaparecio de Timeline
- Se creo columna de evaluacion, cache o job de re-evaluacion

---

### ST-9 — PERCEPCION DE MEDIOS: POSTER, RED, AUDIO

**OBJECTIVE**

Que un video largo se sienta inmediato, que una apertura de imagen pida **un** original, y que el
Audio Viewer tenga sus controles V1 y una identidad honesta.

**WHY NOW**

`VID-02` es **P0 de percepcion** (`R5`, P1): hoy no hay ninguna senal de progreso antes de que
el player este listo. `PERF-01`/`IMG-02` piden hasta **7 originales firmados concurrentes** por
apertura. Y §22 del prompt exige que los riesgos device-only tengan puerta **cerca** del slice
que los introduce, no al final: el scrub nativo de video y la paginacion son risks de este
stage, y verlos por primera vez en ST-11 seria tarde.

**PRODUCT TARGET**

§15.1, §15.2 (estados obligatorios), §15.4, §15.5 (capacidades V1), §15.6 (invariantes
preservados), §14.3 (**original solo de la pagina activa**), §16.1 (identidad no vacia), §16.2
(capacidades V1), §16.3 (**waveform: fake prohibido, real = V1.1**), §23.3 (budget de red),
§23.1 (honestidad de perceived performance).

**GAP IDS**: `VID-02`, `VID-04`, `IMG-02`, `PERF-01`, `PERF-02`, `PERF-03`, `AUD-01`,
`AUD-02`, `AUD-03`, `AUD-04`, `AUD-05`

**PATH IDS**: `J-01`…`J-06`, `J-02`, `J-04`, `I-01`…`I-03`, `K-01`, `K-01b`, `K-02`, `K-03`,
`K-04`, `K-06`, `H-05`, `H-08`

**CURRENT**

`MemoryVideoPage.tsx:7` importa **solo** `getMemoryOriginalUrl`; **no** importa
`useMemoryPreviewUrl` ni lee `hasPreview`. El codigo lo declara (`NO POSTER, NO TRANSCODING`).
El estado no-listo es un spinner sobre negro. `fullscreenOptions={{enable:false}}` esta
**deshabilitado explicitamente** aunque la API lo soporta con una prop. `ImagePage` ni siquiera
recibe la prop `active`: pide el original al montar, con deps que incluyen `scale` y
`translate`. Los dos servicios de media cachean **solo URLs resueltas** y **no** deduplican
peticiones en vuelo; el crecimiento **no esta acotado**. En audio: hay play/pause y seek por
**tap** (sin `onTouchMove` ni `PanResponder`), reloj y duracion, barra `adjustable`; **no** hay
`-10`/`+10`, **no** hay velocidad, y solo hay `Cargando audio...` mientras `!status.isLoaded`
— que **no** es overlay — y una stalled **no se anuncia** (falta `isBuffering`).

Sobre la causa de "algunos videos tardan": la auditoria la clasifica `PLAUSIBLE_ONLY` /
`DEVICE_VERIFY_REQUIRED` (tamano del archivo y ancho de banda, **no medido**). Este plan **no
afirma** ninguna causa raiz de red. Lo que se implementa es la **senalizacion** (poster +
tiempos observables), que es la accion correcta independientemente de la causa.

**TARGET**

Poster cuando `hasPreview`; spinner honesto cuando no; overlay que desaparece en
`readyToPlay`; `ImagePage` recibe `active` y pide preview mientras esta inactiva; dedup en vuelo;
caches acotadas; audio con `-10`/`+10`, velocidad, arrastre continuo, `isBuffering`, e
identidad visual deliberada y no vacia.

**REAL GAP**

Cinco cosas medibles. La **causa raiz** del video lento **no esta medida** y **no se afirma**.

**FILES LIKELY TO CHANGE**

- `front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx` — poster, fullscreen
- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx` — `active` a `ImagePage`
- `front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx` — controles + identidad
- `front/mi-front-limpio/services/homecloud/homecloudMemoryOriginal.ts` — dedup + timeout
- `front/mi-front-limpio/services/homecloud/homecloudMemoryPreview.ts` — dedup
- `front/mi-front-limpio/services/homecloud/useMemoryPreviewUrl.ts` — dedup
- `scripts/homecloud_hc2b_media_viewer_tests.ts` (retarget) + `homecloud_media_budget_tests.ts`

**FILES FORBIDDEN / OUT OF SCOPE**

**Ninguna dependencia de waveform** (`react-native-sound-wav`, `react-native-audio-api`,
`wavesurfer.js`: **prohibidas**) · `expo-media-library` · transcodificacion · **rediseño de
storage compartido** · `VideoView` zoom (OUT) · velocidad/mute de video (OUT) · playback en
background (OUT) · doble toque +/-10 s (DEFER) · llamar `play()` automaticamente (§15.6) ·
`setAudioModeAsync` desde el Viewer (`AUD-07`) · `release()` manual del player (§15.6) ·
`package.json`.

**DATABASE / MIGRATION IMPACT**: 0. **No** se persiste `duration_ms` (§7, `B7`).
**PERMISSION IMPACT**: ninguno.
**SHARED-INFRA IMPACT**: NO.

**DEPENDENCY CHANGES**

**NINGUNA.**

| Que haria falta? | Se puede evitar? |
| --- | --- |
| `react-native-gesture-handler` para el arrastre continuo del seek | **Si**: `PanResponder` ya esta en el proyecto y funciona para un control |
| Libreria de waveform | **Si**: V1 usa diseno honesto no-waveform (§16.3, §5.3) |
| `setPlaybackRate` para la velocidad | **Ya esta**: `expo-audio` la expone. Cero dependencia |
| `seekTo` para +/-10 | **Ya esta**: `AudioPlayer.seekTo` esta instalada |

**IMPLEMENTATION SLICES**

1. `VID-02`: `MemoryVideoPage` importa `useMemoryPreviewUrl`. Si `hasPreview`, el video se
   muestra como **poster** hasta `readyToPlay`. El spinner **se reemplaza** por el poster. El
   overlay de buffering desaparece en `status === 'readyToPlay'`. Si no hay preview, spinner
   honesto + copy que diga que se esta preparando. Nunca un cuadrado negro ambiguo.
2. `IMG-02`: `ImagePage` recibe `active`. Early return **antes** de que exista el subcomponente
   con hooks, **igual que video y audio** (`VID-06`). Con `windowSize=7`, el maximo es **1
   original por apertura**.
3. `PERF-02`: deduplicacion de peticiones **en vuelo** por `contentId`, para preview y
   original. Con guarda de generacion en el fetch del original, como ya existe en video.
4. `PERF-03`: acotar el crecimiento de los mapas de signed URL, con margen de expiracion y
   limpieza en el cambio de household. **No** inventar un LRU.
5. `VID-04`: `fullscreenOptions={{enable:true}}`. Riesgo conocido: puede romper la paginacion
   dentro del `FlatList`. Device QA bloqueante en este stage.
6. `AUD-03`: `-10` / `+10` con `AudioPlayer.seekTo`, clamp a los bordes.
7. `AUD-04`: selector de velocidad `0.5 / 1 / 1.5 / 2x` con `setPlaybackRate`.
8. `AUD-02` (segunda mitad): arrastre continuo del seek con `PanResponder`, como la imagen.
9. `AUD-05`: `isBuffering` como overlay honesto durante la reproduccion.
10. `AUD-01`: identidad visual deliberada. **Fake waveform prohibido.** Usar el diseno de §16.3:
    icono + etiqueta `Audio`, duracion y posicion `m:ss` **visibles siempre**, barra con punto
    de posicion, nombre de archivo presentable.
11. Instrumentacion de tiempos: medir y exponer el tiempo hasta `readyToPlay` por video, para
    que la causa del video lento sea **medible** en el futuro y no se especule.
12. `AUD-06`: **no** implementar waveform. Registrar la disposicion: V1.1 condicionado a device
    QA de `useAudioSampleListener` en el iPhone objetivo.

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **RETARGET** | `homecloud_hc2b_media_viewer_tests.ts:211` | **afirma la ausencia** de poster/transcod ⇒ el poster pasa a ser IN |
| **RETARGET** | `homecloud_hc2b_media_viewer_tests.ts:260` | **afirma la ausencia** de `waveform\|sampleListener` ⇒ el veredicto pasa de "no hay datos" a "candidato V1.1" |
| **KEEP** | `homecloud_hc2b_media_viewer_tests.ts:177` | afirma que la pagina de video **nunca** llama `play()` ⇒ invariante correcta |
| **KEEP** | `homecloud_hc2b_media_viewer_tests.ts:264` | afirma que la pagina de audio **no** llama `setAudioModeAsync` ⇒ decision correcta |
| **KEEP** | `homecloud_hc2b_media_viewer_tests.ts:204-205` | invariante de original/player solo en la pagina activa, para video/audio |
| **KEEP** | `homecloud_hc2b_media_viewer_tests.ts:258` | error de audio sin renderizar el string nativo |
| **ADD** | `homecloud_video_poster_tests` | poster cuando `hasPreview`; spinner honesto cuando no; overlay sale en `readyToPlay` |
| **ADD** | `homecloud_image_active_page_tests` | `ImagePage` **pide preview mientras esta inactiva** (hoy pide original siempre) |
| **ADD** | `homecloud_media_inflight_dedup_tests` | N ids ⇒ 1 peticion en vuelo por id |
| **ADD (negativo)** | `homecloud_media_cache_bounded_tests` | el mapa de signed URLs no crece sin limite |
| **ADD** | `homecloud_audio_controls_tests` | `-10`/`+10` con clamp; velocidad `0.5/1/1.5/2` |
| **ADD (negativo)** | `homecloud_audio_no_fake_waveform_tests` | **ninguna** forma de onda sintetica en el Audio Viewer |
| **DELETE_LATER** | la parte de grep de `homecloud_hc2a_memories_viewer_tests` | HC2-C §36 |

**AUTOMATED GATE**

Las 6 suites nuevas + las retargeteadas + typecheck + lint focalizado.

**DEVICE QA GATE**

Obligatorio. Este es el stage con mas superficie de plataforma: chrome nativo de video dentro de
un pager, `isBuffering`, tono audible de la velocidad, precision del salto de 10 s.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | Video largo: poster de inmediato, **no** espera opaca | `DEVICE_ONLY` |
| 2 | Video sin preview: spinner honesto con copy, nunca un cuadrado negro | `DEVICE_ONLY` |
| 3 | Overlay de buffering desaparece en `readyToPlay` | `DEVICE_PREFERRED` |
| 4 | Fullscreen de video dentro del pager: la paginacion **no** se rompe | `DEVICE_ONLY` |
| 5 | Feel del scrub nativo de video y su coexistencia con el swipe del pager | `DEVICE_ONLY` |
| 6 | Abrir una imagen: **1** original, no 7 (verificable con el contador de red) | `DEVICE_PREFERRED` |
| 7 | Audio: play/pause, seek por toque **y por arrastre** | `DEVICE_PREFERRED` |
| 8 | Audio: `-10`/`+10` con precision audible y clamp en los bordes | `DEVICE_ONLY` |
| 9 | Audio: velocidad `0.5/1/1.5/2` con tono audiblemente distinto | `DEVICE_ONLY` |
| 10 | Audio largo: buffering anunciado, identidad visual no vacia | `DEVICE_ONLY` |
| 11 | El audio importado se reproduce **igual** que el grabado (mismo visor) | `DEVICE_ONLY` |
| 12 | Pausa inmediata al deslizar a otra pagina | `DEVICE_ONLY` |
| 13 | Slow network y sin network: honestidad de estados en ambos | `DEVICE_PREFERRED` |

**FAILURE / ROLLBACK STRATEGY**

`VID-04` (fullscreen) es el slice de mayor riesgo: puede romper la paginacion. Se commitea
**aparte** y se puede revertir sin afectar poster ni dedup. `AUD-01` (identidad visual) es
frontend puro y totalmente reversible; si el diseno no convence, se revierte sin tocar los
controles. `PERF-02`/`PERF-03` son servicios con cache: revertirlos devuelve el comportamiento
anterior sin riesgo de datos.

**COMMIT BOUNDARIES**: 12 commits. `VID-02` aparte (es el P0 de percepcion y debe poder
revertirse sin tocar audio). `VID-04` aparte. Audio en 4 commits (controles, arrastre,
buffering, identidad). `PERF-02`/`PERF-03` juntos.

**EXIT CRITERIA**

- [ ] Poster visible antes de `readyToPlay` cuando hay preview
- [ ] Spinner honesto con copy cuando no hay preview
- [ ] `ImagePage` pide preview mientras esta inactiva
- [ ] 1 original por apertura como maximo
- [ ] Deduplicacion en vuelo por `contentId`
- [ ] Caches de signed URL acotadas
- [ ] Fullscreen de video no rompe la paginacion
- [ ] Audio: `-10`/`+10`, velocidad, arrastre, `isBuffering`
- [ ] Identidad de audio deliberada y **sin** waveform falsa
- [ ] 13 casos de device QA ejecutados, 8 `DEVICE_ONLY`

**DO NOT ADVANCE IF**

- Se agrego cualquier dependencia de waveform
- Aparecio una forma de onda sintetica (fake waveform)
- El poster no aparece o el overlay no desaparece en `readyToPlay`
- La paginacion se rompio con fullscreen
- `ImagePage` sigue pidiendo original sin `active`
- Se llamo `release()`/`remove()` manual sobre el player, o `play()` automatico
- Se toco `setAudioModeAsync` desde el Viewer

---

### ST-10 — ZOOM, BATCH INTAKE, CAMARA Y DEUDAS

**OBJECTIVE**

Cerrar el zoom de imagen, el batch intake de binarios, y las deudas de V1 que todavia
pertenecen al producto.

**WHY NOW**

El zoom es `BROKEN` hasta que se pruebe en el dedo (`IMG-04`, P3) y §5.2 ya decidio el enfoque;
cuanto mas tarde, mas riesgo de que alguien "lo arregle" agregando una dependencia. El batch
intake es `MISSING` y es obligatorio (§18 del prompt, §6.7). La camara entra aqui porque ya
existe el intake final de ST-3 y porque aun queda ST-11 para su QA de cierre.

**PRODUCT TARGET**

§14.2, §14.3, §14.4, §6.7 (batch), §25.1 (pipeline unico), §25.3 (paths de camara), §29
(safe areas), §6.1 (no pedir lo que ya se sabe), §24.2 (cancelar), §16.4 (sesion de audio).

**GAP IDS**: `IMG-04`, `IMG-05`, `INTAKE-04`, `INTAKE-05`, `INTAKE-10`, `CAM-08`, `CAM-09`,
`WRIT-07`, `PERF-08`, `AUD-07` (deuda)

**PATH IDS**: `I-02`, `I-03`, `I-04`, `C-03`, `C-04`, `C-08`, `L-01`, `L-03`, `R-04`, `S-06`,
`S-07`, `S-08`, `S-09`, `T-05`

**CURRENT**

Zoom: `PanResponder`, escala 1..3, pan clamp, arbitraje correcto, **pero** sin
`onPanResponderTerminate`, sin `*Capture`, clamp vertical **magico `±500`**, `Animated.event`
ausente, y deps que incluyen `scale`/`translate`. Reset de zoom solo por cambio de
`memory.id` ⇒ si la pagina permanece montada dentro del `windowSize=7`, el zoom anterior se
conserva. Batch: `allowsMultipleSelection:false` + `assets?.[0]` + un unico `binaryDraft`; el
review elige **un** componente por MIME, sin selector de item. `CAM-08`: el handoff de audio es
un estado de hoja **sin JSX** (`audio-handoff`) y la transicion ocurre en un `useEffect` que
setea dos estados en el mismo tick. `CAM-09`: `openCamera` **no** llama `reloadDestinations()`.
`INTAKE-10`: `durationMillis` se captura y **se descarta**. `WRIT-07`: el scroll vertical del
escrito alterna el chrome del Viewer. `PERF-08`: `homecloudMemoryIntakeService.cancel()` existe
y **ninguna UI lo invoca**. `AUD-07`: el grabador **fuerza** un estado de audio conocido en vez
de restaurar el modo previo.

**TARGET**

Zoom usable y determinista, con clamp derivado del viewport y arbitraje correcto; reset al
cambiar de pagina y al reabrir; batch con N fechas independientes, un solo submit y album
masivo con override; handoff de camara visible y destinos frescos; `durationMillis` consumido
o eliminado; scroll del escrito sin alternar chrome; `cancel()` alcanzable.

**REAL GAP**

Cinco defects de zoom, todo el dominio batch, dos fences de camara, y cuatro deudas
concretas.

**FILES LIKELY TO CHANGE**

- `front/mi-front-limpio/components/homecloud/MemoryViewer.tsx` — zoom
- `front/mi-front-limpio/components/homecloud/MemoryIntake.tsx` — batch + handoff + destinos
- `front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts` — `allowsMultipleSelection`
- `front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts` — drafts N
- `front/mi-front-limpio/services/homecloud/homecloudMemoryAudioRecorder.tsx` (o el recorder) —
  restaurar modo de audio
- `scripts/homecloud_memory_zoom_tests.ts`, `scripts/homecloud_batch_intake_tests.ts`

**FILES FORBIDDEN / OUT OF SCOPE**

`react-native-gesture-handler` · `react-native-reanimated` · `package.json` · `backend/**` ·
`duration_ms` en DB (decision consciente) · `uploaded_at` como fecha (§7.1) ·
**cualquier conversion automatica de fecha parcial** · `expo-media-library`.

**DATABASE / MIGRATION IMPACT**: 0. `INTAKE-10` se resuelve **eliminando o consumiendo** el
codigo muerto, **no** agregando columna.
**PERMISSION IMPACT**: ninguno.
**SHARED-INFRA IMPACT**: **NO**, con una condicion: el batch usa **exactamente** el upload
engine existente (`PERF-06`), sin tocarlo. N drafts ⇒ N jobs del mismo motor. Si el motor
necesita cambios ⇒ `SHARED_INFRA_BLOCKER` (§7.1).

**DEPENDENCY CHANGES**: **NINGUNA.** Decision §5.2.

**IMPLEMENTATION SLICES**

1. `IMG-04` (a): corregir los 4 defectos **antes** de cualquier device trace, para que el trace
   mida el defecto real y no los defectos conocidos: `onPanResponderTerminate`, `*Capture`,
   clamp derivado del viewport, `Animated.event`.
2. `IMG-04` (b): device trace del gesto con los 4 defectos ya corregidos. Si el defecto
   restante **no** es reparable con `PanResponder`, STOP documentado (§5.2).
3. `IMG-05`: reset de zoom al cambiar de pagina y al reabrir, incluso si la pagina permanece
   montada dentro de `windowSize=7`.
4. `INTAKE-04`: `allowsMultipleSelection:true` + N `binaryDraft` + navegacion
   anterior/siguiente en el review. Fechas **por item**, independientes.
5. `INTAKE-05`: lote mixto imagen+video, con el review eligiendo el componente correcto por
   item y un selector de item.
6. `INTAKE-04` (contrato): **nunca** sobrescribir fechas distintas con una fecha compartida;
   **prohibida** la fecha por defecto del lote; album masivo **mas** excepciones por item;
   descripcion masiva con override; **un** solo submit; cancelacion antes de guardar descarta
   el lote completo sin artefactos; falla parcial deja los exitosos `ACTIVE` y los fallidos
   reintentables y nombrados.
7. `CAM-09`: `openCamera` llama `reloadDestinations()`, igual que `openCreate` y `openWritten`.
8. `CAM-08`: handoff de audio **visible** (JSX real, no un estado sin renderizar), sin la
   transicion fragil de dos estados en el mismo tick.
9. `INTAKE-10`: `durationMillis` se **elimina** del draft o se consume. Decision §8: **no** se
   persiste, y **no** se muestra en la UI. Si no se persiste, no se muestra (§6.1).
10. `WRIT-07`: el scroll vertical del escrito **no** alterna el chrome del Viewer.
11. `PERF-08`: `cancel()` de intake alcanzable desde la UI, con copy honesto de cuantos
    items salieron y cuantos no (§6.7).
12. `AUD-07` (deuda): el grabador **restaura** el modo de audio previo en vez de forzar uno
    conocido. No es un bug de V1 (§16.4), pero es deuda que el batch y la camara amplifican.
13. Camara: verificar que su salida converge en el **mismo** intake final de ST-3 — fecha,
    album, descripcion, upload, error/retry, retorno a `root` (§25.1). **No** abrir un segundo
    modelo de producto para camara.

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **ADD** | `homecloud_memory_zoom_tests` | clamp derivado del viewport; arbitraje pager↔zoom; reset por cambio de pagina. **No** es un grep: es comportamiento (`hc2b` solo verifica `active={...}`, `hc2a` hace grep) |
| **ADD** | `homecloud_batch_intake_tests` | N fechas independientes; album masivo con override; un submit; falla parcial nombrada |
| **ADD (negativo)** | `homecloud_batch_no_shared_date_tests` | **prohibido** sobrescribir N fechas distintas con una compartida |
| **ADD** | `homecloud_camera_destination_refresh_tests` | `openCamera` recarga destinos |
| **ADD** | `homecloud_intake_cancel_tests` | `cancel()` alcanzable y honesto |
| **DELETE** | aserciones de `durationMillis` en el flujo de audio | el valor no se persiste y no se muestra |
| **KEEP** | `homecloud_2c_memory_intake_tests` (resto) | idempotencia de `submitBinary` |
| **KEEP** | `homecloud_moa3_memory_selection_device_gesture_fix_tests` | patron de tests de gesto |
| **KEEP** | `homecloud_upload_recovery_tests`, `homecloud_t1_queue_persistence_tests` | `PERF-06` |

**AUTOMATED GATE**

Las 5 suites nuevas + las de upload + typecheck + lint focalizado.

**DEVICE QA GATE**

Obligatorio, y con la puerta mas pesada en riesgo: zoom, batch y camara son los tres casos
donde el codigo "plausible" ya fallo una vez.

| # | Caso | Marca |
| --- | --- | --- |
| 1 | Pinch zoom en una imagen: escala 1..3 sin temblar | `DEVICE_ONLY` |
| 2 | Pan con zoom, con clamp en los bordes (no `±500` magico) | `DEVICE_ONLY` |
| 3 | Reset de zoom al cambiar de pagina y al volver | `DEVICE_ONLY` |
| 4 | Arbitraje pager↔zoom: a escala 1, el swipe navega | `DEVICE_ONLY` |
| 5 | Batch de N imagenes: N fechas independientes visibles | `DEVICE_PREFERRED` |
| 6 | Batch mixto imagen+video: preview correcto por item | `DEVICE_PREFERRED` |
| 7 | Guardar el lote: **un** submit, una sola confirmacion de exito | `DEVICE_PREFERRED` |
| 8 | Cancelar antes de guardar: no queda artefacto | `DEVICE_PREFERRED` |
| 9 | Falla parcial: exitosos `ACTIVE`, fallidos nombrados y reintentables | `DEVICE_PREFERRED` |
| 10 | Camara foto ⇒ review ⇒ guardar ⇒ `root` | `DEVICE_ONLY` |
| 11 | Camara video ⇒ review ⇒ guardar ⇒ `root` | `DEVICE_ONLY` |
| 12 | En camara, el review ofrece albums frescos | `DEVICE_ONLY` |
| 13 | Salir de la app durante una grabacion de video: se detiene y libera | `DEVICE_ONLY` |
| 14 | AppState transitions durante intake y viewer | `DEVICE_ONLY` |
| 15 | Batch: `AppState` en medio del lote no corrompe nada | `DEVICE_ONLY` |

**FAILURE / ROLLBACK STRATEGY**

El zoom es el unico slice cuyo fallo obliga a volver a §5.2. Se commitea aislado para poder
revertirlo sin tocar batch ni camara. El batch es el de mayor superficie de estado: se commitea
**al final** del stage, cuando zoom y camara ya estan verdes, y detras de flag. Si el batch
resulta inestable, la app sigue con intake de un item, que es el estado actual y no es una
regresion.

**COMMIT BOUNDARIES**: 13 commits. Zoom aislado (slices 1-3). Batch en 3 commits (slice 4-6).
Camara en 2. Deudas en commits separados y pequenos.

**EXIT CRITERIA**

- [ ] Zoom usable en el dedo, con clamp derivado del viewport
- [ ] Reset de zoom al cambiar de pagina y al reabrir
- [ ] Batch de N con N fechas independientes
- [ ] Nunca se sobrescriben N fechas distintas con una compartida
- [ ] Un solo submit; falla parcial honesta y nombrada
- [ ] La camara converge en el intake final, con destinos frescos
- [ ] `durationMillis` ni se persiste ni se muestra
- [ ] El scroll del escrito no alterna el chrome
- [ ] `cancel()` de intake alcanzable
- [ ] 15 casos de device QA ejecutados, 9 `DEVICE_ONLY`

**DO NOT ADVANCE IF**

- Se agrego `react-native-gesture-handler` o `react-native-reanimated`
- El batch sobrescribe fechas distintas con una compartida
- La camara abrio un review distinto del de importacion
- Se agrego `duration_ms` a la DB
- El upload engine compartido necesito cambios (`SHARED_INFRA_BLOCKER`)
- Un `unknown` se completo a `exact` sin accion del usuario

---

### ST-11 — CIERRE, CONGELAMIENTO Y RECONCILIACION

**OBJECTIVE**

Cerrar Memories V1: reconciliar documentos, resolver las deudas de schema declaradas, acotar
la superficie de tests, y hacer la QA fisica final.

**WHY NOW**

Es el ultimo stage y solo puede empezar cuando los 10 anteriores estan verdes. Concentra todo
lo que **no** es feature: reconciliacion documental, `B11`, `CAP-03`, `TEST-01`, `INFO-04`, y el
warning de runtime `P8`, que solo se puede diagnosticar con un stack de dispositivo.

**PRODUCT TARGET**

§31 (Product Closure Criteria, los 22 puntos), §26.3 (el hallazgo de seguridad queda cerrado),
§29 (cero warnings de runtime), §30 (non-goals), §2.2 (`EXISTING_UNUSED_CAPABILITY` **no se
borra**).

**GAP IDS**: `CAP-03`, `TEST-01`, `TEST-02`, `INFO-04`, `B11`, `B5`, `B12`, `B13`

**PATH IDS**: transversal. Toda la matriz se re-verifica.

**CURRENT**

`CAP-03`: 4 tablas con RLS enabled y **0 policies + 0 GRANT** ⇒ default deny; solo
`service_role` (BYPASSRLS) lee. La migracion HC-1D de RLS **nunca se materializo`.
`TEST-01`: 13 de 53 suites huerfanas. `TEST-02`: `tsc -p scripts/tsconfig.test.json` falla con
5 errores en `scripts/planner_v1_navigation_tests.ts` y `expo lint` da 3 errores en
`components/planner/*`; un filtro `homecloud|memory` sobre la salida de `tsc` da **cero** errores
de HomeCloud. `INFO-04`: el endpoint `/access` **si** devuelve `bucket` y `path` al cliente,
pese a que los comentarios del propio servicio dicen "no internal paths, no bucket exposure".
`B11`: `albumIds` de `listMemories` no filtra por household ni lifecycle del album ⇒ puede
proyectar ids de album de otro hogar. `B5`: filas `staging` sin barrer (cerrado en ST-1).
`P8`: el warning `Text strings must be rendered within a <Text>` no se localiza por barrido
estatico ⇒ **requiere stack en dispositivo**.

**TARGET**

Documentos que dicen la verdad; `albumIds` filtrado; RLS documentado como default deny
intencional; suites huerfanas enganchadas o documentadas; `/access` alineado con sus propios
comentarios; y CERO warnings de runtime en un recorrido completo.

**REAL GAP**

Cinco deudas declaradas y un unknown de dispositivo.

**FILES LIKELY TO CHANGE**

- `backend/src/services/homecloudReadService.js` — filtro de `albumIds` (`B11`)
- `backend/src/services/homecloudStorageAccess.js` — `/access` (`INFO-04`)
- `tests/run.js` — enganchar suites huerfanas; corregir `:410-419`
- `scripts/homecloud_*.ts` — las huerfanas que si se enganchan
- `docs/homecloud/memories/*.md` — reconciliacion
- Tests de cierre

**FILES FORBIDDEN / OUT OF SCOPE**

agregar RLS policies o GRANT (`R14`: documentar, no agregar) · eliminar
`EXISTING_UNUSED_CAPABILITY` (§2.3) · `src/search` de Files · cambiar la suite de
`planner` para que `tsc` global pase · tocar `backend/src` fuera de los dos archivos de arriba.

**DATABASE / MIGRATION IMPACT**: **0**. `B12` y `B13` se **documentan**, no se arreglan.
**PERMISSION IMPACT**: ninguno.
**SHARED-INFRA IMPACT**: NO.
**DEPENDENCY CHANGES**: ninguna.

**IMPLEMENTATION SLICES**

1. `B11`: el 2o query de `listMemories` filtra por household **y** por lifecycle del album. Es
   un fix de aislamiento, no una feature.
2. `INFO-04`: alinear `/access` con los comentarios del propio servicio. **Decision a
   confirmar con el usuario**: quitar `bucket`/`path` de la respuesta es el cambio minimo y
   hace que el codigo diga la verdad; la alternativa es reescribir los comentarios para que
   describan la exposicion. El plan asume quitar la exposicion, y por ser un cambio de
   contrato de cliente se reporta explicitamente.
3. `TEST-01`: enganchar las suites huerfanas **que verifiquen comportamiento de Memories**. Las
   que verifiquen Files o el scaner se documentan como huerfanas con motivo, no se enganchan a
   la fuerza. Los 5 `1d_*` ya se engancharon en ST-1.
4. `tests/run.js:410-419`: invocar `node` sobre archivos `.ts` sin compilar es una inconsistencia
   real. Corregir.
5. `TEST-02`: ejecutar los comandos de Memories **individualmente** y registrar que los fallos
   de `planner` son ajenos. **No** se arregla `planner` en este carril.
6. `CAP-03` / `B12`: documentar que RLS enabled con 0 policies es **default deny deliberado** y
   que no se agrega GRANT en V1. `B13`: documentar que Search = OUT, luego el indice no hace
   falta.
7. `P8`: capturar el **stack completo** del warning en el iPhone y atribuirlo. Si viene de una
   libreria y no de nuestro JSX, se documenta como tercero y se mitiga si se puede. **No** se
   "arregla" suprimiendo el warning sin stack.
8. Reconciliacion documental: actualizar los 4 documentos de `docs/homecloud/memories/` con el
   estado real de CURRENT, marcar los gaps cerrados con su commit, y dejar `DEFERRED` y
   `EXISTING_UNUSED_CAPABILITY` **intactos**.
9. **`git diff` check y reconciliacion final**: verificar que no hay codigo de producto sin
   commitear, que el dirt preexistente sigue intacto, y que no hay push.

**TESTS TO ADD / RETARGET / DELETE**

| Clasificacion | Suite | Motivo |
| --- | --- | --- |
| **ADD** | `homecloud_album_ids_household_isolation_tests` | `B11`: `albumIds` de otro hogar **no** se proyecta |
| **ADD** | `homecloud_access_response_contract_tests` | `INFO-04`: `/access` no expone `bucket` ni `path` |
| **ADD/UNHOOK** | suites huerfanas de Memories | `TEST-01` |
| **ADD** | `homecloud_runtime_text_warning_attribution_tests` | `P8`: si el barrido estatico sigue dando 0, el test documenta que **no** es nuestro JSX |
| **KEEP** | **todas** las suites creadas en ST-1..ST-10 | cobertura final |
| **DELETE_LATER** | restos de grep sin valor (`hc2a` y similares) | HC2-C §36 |

**AUTOMATED GATE**

El **gate mas estricto del plan**: las ~50 suites de Memories, el typecheck filtrado a
`homecloud|memory` en 0 errores, el lint focalizado en `components/homecloud/**` y
`services/homecloud/**` en 0 errores, y `git diff --check` limpio.

**DEVICE QA GATE**

El **recorrido de cierre de §31**, de punta a punta, en el iPhone fisico, con los 22 puntos de
Product Closure Criteria verificados uno por uno. Ademas:

| # | Caso | Marca |
| --- | --- | --- |
| 1 | Los 22 puntos de §31, en orden, con resultado registrado | `DEVICE_ONLY` |
| 2 | Matriz de household switching sin residuos cruzados | `DEVICE_ONLY` |
| 3 | Matriz de permisos §9.4 en dispositivo | `DEVICE_PREFERRED` |
| 4 | Cero warnings de runtime en el recorrido completo | `DEVICE_ONLY` |
| 5 | Sin skeleton permanente en ninguna superficie | `DEVICE_PREFERRED` |
| 6 | Ningun fallback a la raiz | `DEVICE_PREFERRED` |
| 7 | Sin nested modal en ningun camino | `DEVICE_ONLY` |
| 8 | Sin fecha falsa: ningun `day=1` en ningun dato persistido | `DEVICE_PREFERRED` |
| 9 | Sin waveform falsa | `DEVICE_PREFERRED` |
| 10 | Sin contenido en staging presentado como compartido | `DEVICE_PREFERRED` |
| 11 | Sin purge desprotegido: `delete=false` no ve ninguna accion de borrado | `DEVICE_PREFERRED` |
| 12 | Sin regresion de Files en el upload compartido | `DEVICE_PREFERRED` |

**FAILURE / ROLLBACK STRATEGY**

Este stage es **read-mostly**. El unico codigo que toca son dos fixes de backend isolados
(`B11`, `INFO-04`), cada uno en su commit. `INFO-04` es un cambio de contrato: si otro codigo
depende de `bucket`/`path`, se rompe en device QA y se revierte en un commit. La
reconciliacion documental es reversible con `git checkout` del doc.

**COMMIT BOUNDARIES**: 9 commits (2 de backend, 2 de tests, 1 de reconciliacion de
`tests/run.js`, 4 de docs). **Ningun commit mezcla backend y docs.**

**EXIT CRITERIA**

Ver §16. Este stage no sale sin cumplir **los 22** puntos de §31.

**DO NOT ADVANCE IF**

- Cualquier punto de §31 falla
- El gate filtrado de Memories da un solo error
- Se agrego un GRANT de RLS
- Se elimino una `EXISTING_UNUSED_CAPABILITY`
- El warning de `<Text>` sigue apareciendo sin stack capturado
- Hay codigo de producto sin commitear
- El dirt preexistente fue tocado

---

## 11. Cumulative Test Matrix

Clasificacion por slice de la §31 del prompt: `KEEP` · `RETARGET` · `DELETE` · `ADD`.
Cada capacidad final conserva cobertura. Un test que codifica verdad superada se reescribe o
se elimina: **no se preserva un test malo solo porque existe**.

### 11.1 Matriz de cobertura por capacidad final

Cobertura por **capacidad**, no por archivo: una capacidad con cobertura en dos suites cuenta
una vez y ambas se listan. La ultima columna es la seccion §19.1 que la valida.

| Capacidad final | Suite que la cubre | Stage | Clasificacion |
| --- | --- | --- | --- |
| Root: un scroll, orden, sin `Recuerdos\|Colecciones` | `homecloud_hc2c_memories_root_tests` | ST-2 | `RETARGET` |
| Root: pull-to-refresh | `homecloud_scroll_offset_tests` | ST-2 | `ADD` |
| Root: cambio de household sin residuos | `homecloud_global_tab_switch_tests` | ST-2 | `ADD` |
| Root: banda de upload global | `HomeCloudUploadActivity` | preservado | `KEEP` |
| Create: menu de 5 acciones | `homecloud_create_menu_contract_tests` | ST-3 | `ADD` |
| Create: `Importar audio` de primer nivel | `homecloud_import_audio_entry_tests` | ST-3 | `ADD` |
| Create: `Fotos y videos` no ofrece audio | `homecloud_create_menu_contract_tests` | ST-3 | `ADD` (negativo) |
| Create: un solo modal | `homecloud_viewer_no_nested_modal_tests` | ST-4 | `ADD` (negativo) |
| Create: gates de capability | `homecloud_moa*_capability_*` | ST-1 | `ADD`/descolgar |
| Import: 1 imagen | `homecloud_s0_gallery_intake_contract_tests` | ST-3 | `RETARGET` |
| Import: 1 video | `homecloud_2c_memory_intake_tests` | ST-3 | `RETARGET` |
| Import: audio importado | `homecloud_import_audio_entry_tests` + `homecloud_partial_to_exact_tests` | ST-3 | `ADD` |
| Import: N imagenes (batch) | `homecloud_batch_intake_tests` | ST-10 | `ADD` |
| Import: lote mixto | `homecloud_batch_intake_tests` | ST-10 | `ADD` |
| Import: falla parcial de subida | `homecloud_batch_intake_tests` | ST-10 | `ADD` |
| Fecha: precedencia EXIF | `homecloud_media_capture_*` | preservado | `KEEP` |
| Fecha: `uploaded_at` nunca como fallback | `homecloud_*_intake_contract_tests` | preservado | `KEEP` |
| Fecha: editable en intake | `homecloud_memory_date_edit_tests` | ST-3 | `ADD` |
| Fecha: correccion post-guardado | `homecloud_memory_patch_backend_contract_tests` | ST-3 | `ADD` |
| Fecha: `partial -> exact` solo por el usuario | `homecloud_partial_to_exact_tests` | ST-3 | `ADD` |
| Fecha: audio importado nunca derivado de heuristica | `homecloud_media_capture_*` | preservado | `KEEP` |
| Fecha: grupo `Sin fecha` en Timeline | `homecloud_moa*_timeline_*` | preservado | `KEEP` |
| Albums: tile final del riel | `homecloud_album_create_tile_tests` | ST-7 | `ADD` |
| Albums: sin `+ Nuevo` en el header | `homecloud_album_create_tile_tests` | ST-7 | `ADD` (negativo) |
| Albums: crear desde seleccion | `homecloud_album_create_from_selection_tests` | ST-7 | `ADD` |
| Albums: eliminar no borra Memories | `homecloud_moa1_album_contracts_tests` | preservado | `KEEP` |
| Albums: eliminar pide confirmacion | `homecloud_album_delete_confirmation_tests` | ST-7 | `ADD` |
| Albums: quitar no cambia lifecycle | `homecloud_moa1_album_contracts_tests` | preservado | `KEEP` |
| Albums: `Agregar a otro album` | `homecloud_memory_action_authority_tests` | ST-5 | `ADD` |
| Types: 4 vistas automaticas | `homecloud_moa*_collection_*` | preservado | `KEEP` |
| Types: seleccion preserva el tipo | `homecloud_selection_caller_context_tests` | ST-2 | `ADD` |
| Seleccion: preserva el contexto de llamador | `homecloud_selection_caller_context_tests` | ST-2 | `ADD` |
| Seleccion: D4 | `homecloud_moa3_memory_selection_tests` | preservado | `KEEP` |
| Seleccion: fallo parcial honesto | `homecloud_moa3_memory_selection_tests` | preservado | `KEEP` |
| Viewer: inmersivo, sin chrome | `homecloud_viewer_immersive_tests` | ST-4 | `ADD` |
| Viewer: el item exacto es la autoridad | `homecloud_hc2c_viewer_opening_tests` | preservado | `KEEP` |
| Viewer: la fuente es inmutable | `homecloud_viewer_*_source_tests` | ST-6/ST-8 | `ADD` |
| Viewer: back de Android | `homecloud_viewer_android_back_tests` | ST-2 | `ADD` |
| Viewer: menu de acciones | `homecloud_viewer_action_menu_tests` | ST-5 | `ADD` |
| Viewer: invariantes de media | `homecloud_hc2b_media_viewer_tests` | preservado | `KEEP` |
| Imagen: original solo de la pagina activa | `homecloud_image_active_page_tests` | ST-9 | `ADD` |
| Imagen: zoom usable | `homecloud_memory_zoom_tests` | ST-10 | `ADD` |
| Imagen: sin carga infinita | `homecloud_viewer_loading_states_tests` | ST-4 | `ADD` |
| Video: poster antes de `readyToPlay` | `homecloud_video_poster_tests` | ST-9 | `ADD` |
| Video: fullscreen | `homecloud_video_poster_tests` | ST-9 | `RETARGET` |
| Video: buffering y error honestos | `homecloud_hc2b_media_viewer_tests` | preservado | `KEEP` |
| Audio: identidad no vacia | `homecloud_audio_controls_tests` | ST-9 | `ADD` |
| Audio: `-10`/`+10`, velocidad | `homecloud_audio_controls_tests` | ST-9 | `ADD` |
| Audio: importado y grabado en el mismo visor | `homecloud_audio_controls_tests` | ST-9 | `ADD` |
| Audio: sin waveform falsa | `homecloud_audio_no_fake_waveform_tests` | ST-9 | `ADD` (negativo) |
| Audio: no tocar la sesion desde el Viewer | `homecloud_hc2b_media_viewer_tests:264` | preservado | `KEEP` |
| Escrito: crear | `homecloud_moa1_written_memory_*` | preservado | `KEEP` |
| Escrito: elegir precision | `homecloud_written_date_default_tests` | ST-3 | `ADD` |
| Escrito: copiar, compartir | `homecloud_written_memory_share_tests` | ST-5 | `ADD` |
| Escrito: compartir binario | `homecloud_written_memory_share_tests` | ST-5 | `ADD` |
| Info: superficie y dos fechas | `homecloud_memory_info_surface_tests` | ST-3 | `ADD` |
| Info: editar metadata | `homecloud_memory_patch_backend_contract_tests` | ST-3 | `ADD` |
| Info: sin identidad tecnica expuesta | `homecloud_access_response_contract_tests` | ST-11 | `ADD` |
| Acciones: autoridad unica | `homecloud_memory_action_authority_tests` | ST-5 | `ADD` |
| Lifecycle: transiciones | `homecloud_lifecycle_backend_contract_tests` | ST-1 | `ADD` |
| Lifecycle: `homecloud.delete` exigido | `homecloud_delete_capability_enforcement_tests` | ST-1 | `ADD` |
| Lifecycle: `TRASHED` invisible en todas las superficies | `homecloud_trashed_visibility_tests` | ST-6 | `ADD` (negativo) |
| Trash: superficie condicional | `homecloud_trash_surface_tests` | ST-6 | `ADD` |
| Trash: restore conserva membresias | `homecloud_restore_membership_tests` | ST-6 | `ADD` |
| Trash: purge con gate | `homecloud_purge_ui_gating_tests` | ST-6 | `ADD` |
| Trash: signed URL 404 | `homecloud_1e_storage_rls_tests` | ST-1 | `KEEP` (descolgar) |
| Resurfacing: agrupacion por dia+mes | `homecloud_resurfacing_grouping_tests` | ST-8 | `ADD` |
| Resurfacing: sin resurfacing mensual | `homecloud_resurfacing_no_monthly_tests` | ST-8 | `ADD` (negativo) |
| Resurfacing: `partial -> exact` habilita | `homecloud_resurfacing_partial_corrected_tests` | ST-8 | `ADD` |
| Resurfacing: ocultar sin oculto de otras superficies | `homecloud_hidden_from_resurfacing_ui_tests` | ST-8 | `ADD` |
| Upload: durable y verify-first | `homecloud_upload_recovery_tests`, `..._t1_*`, `..._s2i_*` | preservado | `KEEP` |
| Upload: staging no se presenta como compartido | `homecloud_*_intake_contract_tests` | preservado | `KEEP` |
| Upload: sweep de staging | `homecloud_staging_sweep_tests` | ST-1 | `ADD` |
| Camera: pipeline compartido | `homecloud_*_camera_*` | preservado | `KEEP` |
| Camera: destinos frescos | `homecloud_camera_destination_refresh_tests` | ST-10 | `ADD` |
| Camera: AppState durante grabacion | device QA | ST-10 | `DEVICE_ONLY` |
| Permisos: matriz por rol | 5 suites `1d_*` | ST-1 | `ADD`/descolgar |
| Permisos: ocultamiento de acciones | por capacidad | ST-1..ST-11 | `ADD` |
| Aislamiento: `albumIds` por household | `homecloud_album_ids_household_isolation_tests` | ST-11 | `ADD` |
| Aislamiento: sin fuga cruzada de household | device QA | ST-11 | `DEVICE_ONLY` |
| Runtime: cero warnings `<Text>` | `homecloud_runtime_text_warning_attribution_tests` | ST-11 | `ADD` |

### 11.2 Suite huerfanas (13 de 53): disposicion

| Suite | Accion en ST-11 | Razon |
| --- | --- | --- |
| `homecloud_1d_backend_enforcement_tests` | descolgar en **ST-1** | enforcement de capabilities |
| `homecloud_1d_capability_resolution_contract_tests` | descolgar en **ST-1** | enforcement de capabilities |
| `homecloud_1d_frontend_projection_tests` | descolgar en **ST-1** | projection de capabilities |
| `homecloud_1d_new_household_capability_regression_tests` | descolgar en **ST-1** | regresion de hogar nuevo |
| `homecloud_1d_rls_bypass_tests` | descolgar en **ST-1** | default deny |
| `homecloud_1e_path_adapter_tests` | **documentar huerfana** | es de Files |
| `homecloud_1e_preview_optional_tests` | **documentar huerfana** | es de Files |
| `homecloud_1e_signing_security_tests` | **documentar huerfana** | es de Files |
| `homecloud_1e_storage_rls_tests` | descolgar en **ST-1** | paths de storage de Memories |
| `homecloud_1f_mixed_media_tests` | revisar; si es Memories, descolgar | depende del veredicto |
| `homecloud_1f_security_tests` | revisar; si es Memories, descolgar | depende del veredicto |
| `homecloud_3a_3d_acceptance_tests` | revisar; si cubre V1, descolgar | depende del veredicto |
| `homecloud_stage_a_memory_creation_tests` | revisar; si cubre V1, descolgar | depende del veredicto |

Las 5 `1d_*` son las unicas que probarian el enforcement de capacidades ⇒ **la capability
enforcement no tiene gate en CI** mientras no se enganchen. Es parte del P0 de ST-1.

### 11.3 Suites que codifican verdad SUPERADA

| Suite y linea | Que codifica | Accion |
| --- | --- | --- |
| `homecloud_hc2c_memories_root_tests.ts:264-265` | afirma **positivamente** `+ Nuevo` en el header de Albums | **`RETARGET`** en ST-7: exigir el tile final y la **ausencia** del header |
| `homecloud_hc2b_media_viewer_tests.ts:211` | afirma la **ausencia** de poster/transcod | **`RETARGET`** en ST-9: el poster pasa a ser IN |
| `homecloud_hc2b_media_viewer_tests.ts:260` | afirma la **ausencia** de `waveform\|sampleListener` | **`RETARGET`** en ST-9: el veredicto pasa a "candidato V1.1" |
| `homecloud_2c_memory_intake_tests` | afirma el menu de create de **4** items | **`RETARGET`** en ST-3: exigir los 5 y la ausencia de `Elegir contenido` |
| `homecloud_s0_gallery_intake_contract_tests` | idem + item `Elegir foto/video/audio` | **`RETARGET`** en ST-3 |
| (nuevo) test que afirme `Fotos y videos ⇒ … ⇒ Audio` | camino de audio via galeria | **`RETARGET`** en ST-3: el camino ya no pasa por galeria |
| `homecloud_hc2a_memories_viewer_tests.ts` | hace **grep** de `pagingEnabled`, `getMemoryOriginalUrl`, `written` | **`DELETE_LATER`** / sustituir en ST-5 y ST-9: HC2-C §36 dice que no se congelan pruebas cuyo unico valor sea buscar una cadena |
| `homecloud_hc2b_media_viewer_tests.ts:177` | afirma que la pagina de video **nunca** llama `play()` | **`KEEP`** — invariante correcta |
| `homecloud_hc2b_media_viewer_tests.ts:264` | afirma que la pagina de audio **no** llama `setAudioModeAsync` | **`KEEP`** — decision correcta |
| `homecloud_hc2b_media_viewer_tests.ts:64` | afirma la **ausencia** de `memories` en la sesion del Viewer | **`KEEP`** — invariante correcta |
| `homecloud_hc2b_media_viewer_tests.ts:204-205` | invariante de original/player solo en la pagina activa, para video/audio | **`KEEP`** — se **extiende** a imagen en ST-9 |
| `homecloud_hc2b_media_viewer_tests.ts:258` | error de audio sin renderizar el string nativo | **`KEEP`** — decision correcta |
| `homecloud_moa3_memory_selection_tests:1163` | exige que la seleccion **no** incluya `hidden_from_resurfacing` | **`KEEP`** — correcto |

### 11.4 Comportamientos con cobertura ADICIENTE

| Comportamiento | Por que el test actual no alcanza | Stage |
| --- | --- | --- |
| El dataset de seleccion sigue siendo el del Album | Ningun test lo afirma; el comentario `SCREEN:921-924` afirma lo **contrario** | ST-2 |
| La estructura no cambia al seleccionar en un Tipo | No cubierto | ST-2 |
| Zoom de imagen | `hc2b` solo verifica `active={...}`; `hc2a` hace grep. **Ningun test de comportamiento** | ST-10 |
| Poster de video antes de `readyToPlay` | el test actual afirma que **no** existe | ST-9 |
| La navbar global no tapa el Viewer | requiere assertions de layout | ST-4 |
| `ImagePage` pide preview mientras esta inactiva | `hc2b` verifica el invariante **solo** para video/audio | ST-9 |
| Crear album desde seleccion | no cubierto porque no existe | ST-7 |
| Lifecycle: `trashed` invisible en las 4 superficies | no cubierto porque no existe | ST-6 |
| Purge: filas y bytes juntos, o falla | no cubierto porque no existe | ST-1 |
| Restore conserva membresias; no restaura en relacion inexistente | no cubierto | ST-6 |
| Resurfacing: solo `exact` y anterior a hoy | no cubierto | ST-8 |
| Resurfacing: **sin** resurfacing mensual | no cubierto; requiere test **negativo** | ST-8 |
| `partial -> exact` hace aparecer el Memory | no cubierto; requiere las dos mitades | ST-3 + ST-8 |
| `partial -> exact` **no** automatico | requiere test **negativo** | ST-3 |
| Correccion de fecha: usuario > automatico > `Sin fecha` | no cubierto | ST-3 |
| Batch: fechas distintas no se sobrescriben | no cubierto porque no existe | ST-10 |
| Menu de create de 5 acciones sin nivel intermedio | los tests afirman 4 | ST-3 |
| `Importar audio` alcanzable en un tap | reachability de UI; una regresion podria reintroducir la hoja intermedia | ST-3 |
| `Fotos y videos` **no** ofrece audio | verificacion negativa de affordance | ST-3 |
| Audio importado y grabado con el mismo visor | igualdad de capacidades no verificable por fuente | ST-9 |
| Back de Android cierra el Viewer | no cubierto | ST-2 |
| `albumIds` aislado por household | no cubierto | ST-11 |
| Texto fuera de `<Text>` (P8) | el barrido estatico da 0; el warning es de libreria ⇒ **requiere device trace, no un test** | ST-11 |

### 11.5 Gates por tipo

| Tipo de gate | Comando | Stage donde se introduce |
| --- | --- | --- |
| Tests deterministas de fuente | `node tests/run.js` filtrado a los grupos de Memories | ST-1 |
| Contratos de backend | `node scripts/homecloud_*_lifecycle_tests.ts` | ST-1 |
| Migraciones | **ninguno**: 0 migraciones (§8) | — |
| Typecheck | `tsc -p scripts/tsconfig.test.json` **filtrado** a `homecloud\|memory` ⇒ 0 errores | ST-1 |
| Lint focalizado | `expo lint` sobre `components/homecloud/**` y `services/homecloud/**` ⇒ 0 errores | ST-4 |
| Device QA fisico | matriz §12 | ST-2 en adelante |

### 11.6 Fallos preexistentes y ajenos (honestamente documentados)

`TEST-02`, **no re-ejecutado** en esta sesion, reportado por la sesion HC2-C:

| Gate | Fallo | ¿Afecta a Memories? | Decision |
| --- | --- | --- | --- |
| `tsc -p scripts/tsconfig.test.json` | 5 errores en `scripts/planner_v1_navigation_tests.ts` | **NO** | Ejecutar los comandos de Memories **individualmente**. No se arregla `planner` en este carril |
| `expo lint` | 3 errores en `components/planner/*` | **NO** | Lint focalizado a `components/homecloud/**` |
| Agregado de suites | falla en baseline por lo anterior | **NO** | No bloquear a Memories con fallos ajenos |
| `npm run typecheck` | falla en baseline por lo anterior | **NO** | Filtrar |

**Un filtro `homecloud|memory` sobre la salida de `tsc` da CERO errores de HomeCloud**
(`HC2C_TOTAL_CURRENT_AUDIT.md:69-74`). Esa es la linea base honesta: **no se requiere que las
suites globales ajenas pasen para cerrar Memories**.

---

## 12. Cumulative Device QA Matrix

Matriz **acumulativa**: cada stage agrega casos y re-verifica los previos. No se espera al
final. Marcas: `DEVICE_ONLY` (solo fisico), `DEVICE_PREFERRED` (fisico bevorzugt), `AUTOMATABLE`.

### 12.1 Por stage

| Stage | Casos | `DEVICE_ONLY` | `DEVICE_PREFERRED` | `AUTOMATABLE` |
| --- | --- | --- | --- | --- |
| ST-1 | 0 (backend puro, se documenta) | 0 | 0 | 0 |
| ST-2 | 7 | 3 | 4 | 0 |
| ST-3 | 8 | 3 | 5 | 0 |
| ST-4 | 8 | 7 | 1 | 0 |
| ST-5 | 8 | 5 | 3 | 0 |
| ST-6 | 10 | 0 | 9 | 1 |
| ST-7 | 10 | 3 | 7 | 0 |
| ST-8 | 10 | 3 | 7 | 0 |
| ST-9 | 13 | 8 | 5 | 0 |
| ST-10 | 15 | 9 | 6 | 0 |
| ST-11 | 12 | 4 | 8 | 0 |
| **TOTAL** | **101** | **45** | **54** | **1** |

### 12.2 Matriz acumulada por capacidad (§32 del prompt)

| # | Caso | Marca | Stage | Cerrado en |
| --- | --- | --- | --- | --- |
| 1 | Shell del Viewer: chrome global ausente | `DEVICE_ONLY` | ST-4 | ST-4 |
| 2 | Safe areas: notch y home indicator | `DEVICE_ONLY` | ST-4 | ST-4 |
| 3 | Navbar ausente dentro del Viewer | `DEVICE_ONLY` | ST-4 | ST-4 |
| 4 | Album: la seleccion **sigue** en Album | `DEVICE_PREFERRED` | ST-2 | ST-2 |
| 5 | Tipo: la seleccion **sigue** en Tipo | `DEVICE_PREFERRED` | ST-2 | ST-2 |
| 6 | Resurfacing: la seleccion **sigue** en el grupo | `DEVICE_PREFERRED` | ST-8 | ST-8 |
| 7 | Papelera: la seleccion **sigue** en Papelera | `DEVICE_PREFERRED` | ST-6 | ST-6 |
| 8 | Image pinch | `DEVICE_ONLY` | ST-10 | ST-10 |
| 9 | Image pan con clamp | `DEVICE_ONLY` | ST-10 | ST-10 |
| 10 | Image reset de zoom | `DEVICE_ONLY` | ST-10 | ST-10 |
| 11 | Video poster / primer frame | `DEVICE_ONLY` | ST-9 | ST-9 |
| 12 | Video scrub | `DEVICE_ONLY` | ST-9 | ST-9 |
| 13 | Video fullscreen | `DEVICE_ONLY` | ST-9 | ST-9 |
| 14 | Video en pagina inactiva: sin player | `DEVICE_ONLY` | ST-9 | ST-9 |
| 15 | Audio play/pause | `DEVICE_PREFERRED` | ST-9 | ST-9 |
| 16 | Audio seek por toque y arrastre | `DEVICE_PREFERRED` | ST-9 | ST-9 |
| 17 | Audio `-10`/`+10` | `DEVICE_ONLY` | ST-9 | ST-9 |
| 18 | Audio velocidad 0.5/1/1.5/2 | `DEVICE_ONLY` | ST-9 | ST-9 |
| 19 | Audio buffering e identidad visual | `DEVICE_ONLY` | ST-9 | ST-9 |
| 20 | Audio importado = audio grabado en el visor | `DEVICE_ONLY` | ST-9 | ST-9 |
| 21 | Menu de create de 5 items | `DEVICE_PREFERRED` | ST-3 | ST-3 |
| 22 | `Importar audio` de primer nivel | `DEVICE_ONLY` | ST-3 | ST-3 |
| 23 | `Grabar audio` de primer nivel | `DEVICE_PREFERRED` | ST-3 | ST-3 |
| 24 | Intake de imagen individual | `DEVICE_PREFERRED` | ST-3 | ST-3 |
| 25 | Intake de video individual | `DEVICE_PREFERRED` | ST-3 | ST-3 |
| 26 | Batch imagen/video | `DEVICE_PREFERRED` | ST-10 | ST-10 |
| 27 | Correccion de fecha en intake | `DEVICE_PREFERRED` | ST-3 | ST-3 |
| 28 | Correccion de fecha post-guardado | `DEVICE_PREFERRED` | ST-3 | ST-3 |
| 29 | `partial -> exact` habilita resurfacing | `DEVICE_ONLY` | ST-8 | ST-8 |
| 30 | Album create desde seleccion | `DEVICE_ONLY` | ST-7 | ST-7 |
| 31 | Album create desde el tile final | `DEVICE_PREFERRED` | ST-7 | ST-7 |
| 32 | `Mover a papelera` + `Deshacer` | `DEVICE_PREFERRED` | ST-6 | ST-6 |
| 33 | `Restaurar` conserva album | `DEVICE_PREFERRED` | ST-6 | ST-6 |
| 34 | Purge con confirmacion | `DEVICE_PREFERRED` | ST-6 | ST-6 |
| 35 | Purge con `delete = false`: no se renderiza | `DEVICE_PREFERRED` | ST-6 | ST-6 |
| 36 | `Vaciar papelera` con conteo | `DEVICE_PREFERRED` | ST-6 | ST-6 |
| 37 | Signed URL de `TRASHED` da 404 | `AUTOMATABLE` | ST-6 | ST-1 |
| 38 | Resurfacing: banda con datos reales | `DEVICE_PREFERRED` | ST-8 | ST-8 |
| 39 | Resurfacing: **sin** datos `month_year`/`year` | `DEVICE_ONLY` | ST-8 | ST-8 |
| 40 | `No mostrar este recuerdo aca` | `DEVICE_PREFERRED` | ST-8 | ST-8 |
| 41 | Camara foto | `DEVICE_ONLY` | ST-10 | ST-10 |
| 42 | Camara video | `DEVICE_ONLY` | ST-10 | ST-10 |
| 43 | Camara AppState durante grabacion | `DEVICE_ONLY` | ST-10 | ST-10 |
| 44 | AppState transitions (intake, viewer) | `DEVICE_ONLY` | ST-10 | ST-10 |
| 45 | Household switching sin residuos | `DEVICE_ONLY` | ST-11 | ST-11 |
| 46 | Household switching con draft de intake | `DEVICE_PREFERRED` | ST-2 | ST-2 |
| 47 | Household switching con jobs en vuelo | `DEVICE_PREFERRED` | ST-2 | ST-2 |
| 48 | Slow network | `DEVICE_PREFERRED` | ST-9 | ST-9 |
| 49 | Sin network | `DEVICE_PREFERRED` | ST-9 | ST-9 |
| 50 | Runtime `<Text>` warning | `DEVICE_ONLY` | ST-11 | ST-11 |
| 51 | Pull-to-refresh | `DEVICE_ONLY` | ST-2 | ST-2 |
| 52 | Back de Android con Viewer abierto | `DEVICE_ONLY` | ST-2 | ST-2 |
| 53 | Cambiar de pestana global | `DEVICE_PREFERRED` | ST-2 | ST-2 |
| 54 | Un solo host modal en todos los caminos | `DEVICE_ONLY` | ST-4 | ST-4 |
| 55 | `Copiar` en escrito | `DEVICE_ONLY` | ST-5 | ST-5 |
| 56 | Share sheet de iOS, texto y binario | `DEVICE_ONLY` | ST-5 | ST-5 |
| 57 | Share: temporal borrado | `DEVICE_ONLY` | ST-5 | ST-5 |
| 58 | `Abrir configuracion` en permiso denegado | `DEVICE_ONLY` | ST-3 | ST-3 |
| 59 | Primer ingreso con 0/1/N albunes | `DEVICE_PREFERRED` | ST-11 | ST-1 |
| 60 | Matriz de permisos §9.4 | `DEVICE_PREFERRED` | ST-11 | ST-1 |

### 12.3 Reglas de la QA fisica

1. **No se espera al final.** Cada stage tiene su puerta. 45 casos `DEVICE_ONLY` se
   resuelven **dentro** de su stage, no en ST-11.
2. **Un caso que falla bloquea el stage.** No se avanza con un `DEVICE_ONLY` rojo.
3. **Un caso que no se puede ejecutar se registra como `NO EJECUTADO` con el motivo**, no como
   aprobado.
4. **La evidencia es el resultado registrado**, no un "lo vi y funciono".
5. **`P8` requiere el stack completo** del warning en el dispositivo, no una suposicion.
6. **`useAudioSampleListener` (AUD-06) NO se prueba en V1.** Es candidato V1.1. Si se prueba,
   es informacion, no un gate de V1.
7. **La primera puerta fisica es la de ST-2** (navegacion), porque su fallo se propaga a todos
   los stages posteriores.
8. **La ultima puerta fisica es la de ST-11** (recorrido completo de los 22 puntos de §31).

---

## 13. Commit Strategy

### 13.1 Principios

1. **Commits pequenos y reversibles.** Cada mini-slice es un commit.
2. **Un concepto por commit.** Un commit que hace dos cosas no se puede revertir sin arrastrar
   la otra.
3. **Ningun commit mezcla backend y frontend** salvo el unico caso inevitable de un endpoint
   nuevo + su cliente, que se divide en dos commits: primero el endpoint con su test, despues
   el cliente.
4. **Sin commits "de limpieza".** Si un fix requiere tocar un archivo por dos razones, se
   separan en dos commits aunque toquen el archivo.
5. **El codigo de producto nunca se commitea con docs.**
6. **Los tests van con el codigo que proban**, en el mismo commit o en el inmediatamente
   anterior. Nunca "tests mas adelante".
7. **El dirt preexistente nunca se stagea.**

### 13.2 Formato de mensaje

```
<tipo>(homecloud): <verb> en <superficie>

<que cambia, en una linea>
<por que, si no es obvio>

Refs: <GAP-IDS affected>
Paths: <PATH-IDS affected>
```

Tipos usados en este plan: `fix`, `feat`, `test`, `docs`, `refactor` (solo para reubicar codigo
existente, nunca para reescribirlo).

### 13.3 Secuencia de commits por stage

| Stage | Commits | Corte de rollback |
| --- | --- | --- |
| ST-1 | 9 | Por endpoint. Flag por endpoint. |
| ST-2 | 9 | Por gate. Front-only. |
| ST-3 | 10 | El menu (slice 1) es **independiente** y commiteable solo |
| ST-4 | 7 | El seam (slice 1) es reversible sin lo demas |
| ST-5 | 9 | Par (autoridad + `...`), par (escrito + share + fuga) |
| ST-6 | 12 | Purge en commit **aparte y posterior** |
| ST-7 | 8 | El tile es invertible; el flujo P0 es desconectable |
| ST-8 | 8 | La banda entera es revertible; la transicion no |
| ST-9 | 12 | `VID-02` aparte (P0 de percepcion); `VID-04` aparte |
| ST-10 | 13 | Zoom aislado; batch al final y detras de flag |
| ST-11 | 9 | Backend y docs **nunca** en el mismo commit |
| **TOTAL** | **106** | |

### 13.4 Dirty preexistente

```
 M backend/src/services/homecloudIntakeService.js    <- NO TOCAR, NO STAGEAR
 ?? CURRENT_AUDIT_AFTER_SLICE_01.md                  <- NO TOCAR
 ?? T1_FINAL_WIP.patch                               <- NO TOCAR
```

En **cada** commit: `git add` **por rutas explicitas**, nunca `git add .`, nunca `git add -A`.
Antes de commitear: `git diff --cached --name-only` debe listar **solo** los archivos del
slice.

---

## 14. Rollback / Stop Strategy

### 14.1 Rollback

| Nivel | Mecanismo | Cuando |
| --- | --- | --- |
| **Endpoint** | Flag por ruta (ST-1, ST-3) | Un endpoint falla o no es usado aun |
| **Componente** | Revertir el commit | Un componente nuevo no integra bien |
| **Gate** | Revertir **un** `&&` | Un gate rompe un llamador |
| **Cache/servicio** | Revertir el commit | Un dedup o un bounding rompe algo |
| **Esquema** | **No aplica** | 0 migraciones (§8) |
| **Docs** | `git checkout` del doc | Una reconciliacion quedo mal |

**Regla:** un rollback **nunca** se hace con `git reset --hard`, `git clean`, `git restore .`,
`git checkout -- .`, `git revert` masivo, ni reescribiendo historia. Se hace con un commit
nuevo que revierte el anterior, o con el flag.

### 14.2 STOP conditions globales

Se detiene la sesion y se reporta si ocurre cualquiera de estas:

| # | Condicion | Por que |
| --- | --- | --- |
| 1 | Se necesita tocar `homecloudStoragePaths.js` o `homecloudUploadEngine.js` mas alla de lectura | `SHARED_INFRA_BLOCKER` (§7.1) |
| 2 | Un cambio de contrato de Files resulta necesario | Lane separado |
| 3 | Purge queda alcanzable sin `homecloud.delete` en el backend | P0 de seguridad |
| 4 | Aparece una ruta que escribe `capture_precision='exact'` sin dia explicito | P0 de datos |
| 5 | Aparece un `Modal` de RN envolviendo el Viewer | Riesgo `R13` |
| 6 | Aparecen dos modales simultaneos | Regla de un host |
| 7 | Se elimina `pickAudioMemory`, `DocumentPicker audio/*`, `AudioReview` o `unknownMediaCaptureMetadata` | §6.6 |
| 8 | Se agrega cualquier dependencia de waveform | §5.3 |
| 9 | Se implementa Album Trash, `Archive` o `Hidden` | OUT de V1 |
| 10 | Aparece resurfacing mensual o por `month_year` | §21.3.1 |
| 11 | Se agrega `react-native-gesture-handler` o `react-native-reanimated` | §5.2 |
| 12 | Se aplican migraciones | §8 |
| 13 | El dirt preexistente fue tocado o stageado | Regla del prompt |
| 14 | Un `DEVICE_ONLY` falla | El stage no pasa |
| 15 | Un gap `DEFERRED` o `EXISTING_UNUSED_CAPABILITY` se abre sin autorizacion | §1.1 |
| 16 | Se hace push | El prompt prohibe push |

### 14.3 Orden de parada por stage

Cada stage tiene su propio `DO NOT ADVANCE IF`. Se evalua **antes** de pasar al siguiente.
Un stage que no pasa **no se abandona a medias**: o se cierra, o se revierte completo.

---

## 15. Deferred Debt

Esta seccion existe para que **nada de esto se cuele en V1 por conveniencia**.

### 15.1 Explisitamente OUT de V1 (no se implementa)

| Capacidad | Decision | Razon |
| --- | --- | --- |
| **Search en Memories** | **OUT** | Los Memories ya se agrupan por tiempo, tipo y album. El backend tiene `GET /memories?query=` ⇒ `ILIKE` y **no se expone**: no se borra, no se indexa |
| Archive | **OUT** | Tercer estado es ambiguedad. El schema tiene `lifecycle in ('active','trashed')` ⇒ **sin** estado `archived` |
| Hidden / Memories privados | **OUT** | `hidden_from_resurfacing` **no** es privacidad. `private`/`hidden` no existen en el schema |
| People / Pets / Faces | **OUT** | Requiere reconocimiento facial |
| Places / Map | **OUT** | Requiere geolocalizacion |
| Face / Object recognition | **OUT** | ML |
| OCR | **OUT** | ML |
| AI tagging / semantic search | **OUT** | ML |
| Social feed / likes / comentarios | **OUT** | No es red social |
| Edicion profesional (crop, filtros, collage, memory movie) | **OUT** | Memories no es editor |
| Album Trash | **OUT** | `homecloud_albums.lifecycle='trashed'` y `trashed_at` **existen** y quedan **sin uso por decision**, no por descuido |
| Carpetas de album / album de albunes | **OUT** | Un solo nivel |
| Ocultar un grupo o rango de fechas de resurfacing | **OUT** | Requiere modelo de datos nuevo |
| Sincronizacion en background de audio/video | **OUT** | §16.4 |
| Reproduccion en background | **OUT** | §16.4 |
| Velocidad de reproduccion de **video** | **OUT** | El chrome nativo ya la posee |
| Mute / volumen de video | **OUT** | En iOS es del dispositivo |
| Zoom / pan de video | **OUT** | `VideoView` no lo expone |
| **Custom HomeCloud audio output picker** | **OUT** | Platform-native routing IN; redundant with OS surfaces |
| **Fake waveform** | **OUT (prohibido permanentemente)** | §16.3, §5.3 |
| Resurfacing mensual / por `month_year` | **OUT** | §21.3.1 |
| Correccion masiva de fecha en un lote (`D-08`) | **DEFER** | §7.4: no se congela sin evidencia |
| Album destino unico vs selector | **IN** (selector dedicado si hay muchos) | §18.4 |

### 15.2 Explisitamente DEFERRED (decidido, no olvidado)

| Capacidad | Decision | Condicion de reconsideracion |
| --- | --- | --- |
| **Custom HomeCloud audio output picker** | **OUT** | Solo si platform-native routing demuestra ser insuficiente en device QA |
| Correccion masiva de fecha | **DEFER** | Cuando haya evidencia de necesidad y una decision sobre items parciales |

### 15.3 Capacidades existentes que NO se borran

`EXISTING_UNUSED_CAPABILITY` de §2.3 del Product Truth. **Prohibido eliminarlas**:

| Capacidad | Por que se conserva |
| --- | --- |
| Search en Memories (backend) | OUT de V1, no se borra. Files si lo usa y es capacidad distinta |
| `homecloud.delete` | Se **activa** en ST-1 |
| `lifecycle='trashed'` + `trashed_at` + `trashed_by_member_id` | Se **activan** en ST-1 |
| `hidden_from_resurfacing` | Se **activa** en ST-8 |
| Signed URL 404 para `lifecycle != 'active'` | Ya activo |
| `homecloud_albums.lifecycle='trashed'` + `trashed_at` | **Sin uso por decision** (`ALB-15`) |
| `expo-audio` muestreo | Candidato V1.1 |
| `react-native-safe-area-context` | Se **usa** en ST-4 |
| `expo-sharing` + `homecloudDownloadService` | Se **usan** en ST-5 |
| `Clipboard.setString` | Se **usa** en ST-5 (aislada) |
| `react-native-calendars` | Se **usa** en ST-3 |
| `homecloudMemoryAlbumRemoval.removeMemoryFromOpenAlbum` | Se **conecta** en ST-5 |
| `canShowDestinationSelector` / `getInitialAlbum` / `selectDestination` | Se **conectan** en ST-3 |
| `homecloudMemoryIntakeService.cancel()` | Se **conecta** en ST-10 |
| `permissionDenied` / `canAskAgain` | Se **conectan** en ST-3 |
| `durationMillis` en el draft | Se **elimina o consume** en ST-10 (no se persiste) |
| Diagnostico del origin de la signed URL | **No tocar.** Instrumentacion de QA de upload |

### 15.4 Deuda que se registra pero NO se cierra en V1

| Deuda | Por que no se cierra | Donde se registra |
| --- | --- | --- |
| Duracion no persistida | Decision: derivarla en reproduccion | `B7`, `INTAKE-10` |
| Sin indice de busqueda | Search = OUT | `B13` |
| RLS con 0 policies | Default deny es seguro; agregar GRANT sin diseno seria peor | `CAP-03`, `B12`, `R14` |
| `exif:true` de camara sin leer | La fecha del cliente es correcta para captura nativa | `DATE-08`, `CAM C10` |
| Grabador que **fuerza** el modo de audio | Riesgo de deuda, no bug de V1 | `AUD-07`, §16.4 |
| `albumIds` sin filtro de household | Se cierra en ST-11; mientras tanto es `PARTIAL` | `B11` |

---

## 16. Closure Criteria

Memories V1 esta **cerrado** cuando **los 22 puntos** de §31 del Product Truth se cumplen en
un iPhone fisico, **y** todas las condiciones de este plan se cumplen.

### 16.1 Los 22 puntos de Product Truth §31

| # | Criterio | Stage | Evidencia |
| --- | --- | --- | --- |
| 1 | Primer ingreso con 0, 1 y N albums, sin skeleton permanente | ST-1/ST-7 | QA #59 |
| 2 | Crear desde cada modo, con los dos de audio como items de primer nivel | ST-3 | QA #21-23 |
| 3 | Ver la fecha derivada, **corregirla**, verla persistida | ST-3 | QA #27-28 |
| 4 | Ver el recuerdo en Timeline con la fecha correcta | ST-3 | QA #24-25 |
| 5 | Crear un album desde el tile final del riel | ST-7 | QA #31 |
| 6 | Crear un album desde la seleccion, con los Memories adjuntos | ST-7 | QA #30 |
| 7 | En Album A, seleccionar, y **verificar que sigue en Album A** | ST-2 | QA #4 |
| 8 | `Quitar del album`: el Memory sobrevive y sigue en Recuerdos | ST-5/ST-7 | QA #8 (ST-7) |
| 9 | Abrir imagen, video, audio y escrito desde Timeline, Album, Tipo y Resurfacing; el item exacto abre y cerrar devuelve al contexto | ST-2/ST-4/ST-8 | QA #1, #5, #6, #7 |
| 10 | Verificar zoom de imagen en el dedo | ST-10 | QA #8, #9, #10 |
| 11 | Verificar que un video largo muestra poster de inmediato | ST-9 | QA #11 |
| 12 | Verificar que el audio tiene seek, +/-10 y velocidad | ST-9 | QA #16-18 |
| 13 | Mover a papelera, `Deshacer`, y abrir la Papelera | ST-6 | QA #32 |
| 14 | Restaurar y verificar que conserva su album | ST-6 | QA #33 |
| 15 | Borrado permanente con confirmacion | ST-6 | QA #34 |
| 16 | Ver `Para volver a ver` con contenido real, y `No mostrar este recuerdo aca` | ST-8 | QA #38, #40 |
| 17 | Editar metadata desde `Informacion del recuerdo` | ST-3 | QA #28 |
| 18 | Verificar que ninguna media ni accion queda bajo la navbar global | ST-4 | QA #1, #2, #3 |
| 19 | Cambiar de household sin residuos del anterior | ST-2/ST-11 | QA #45 |
| 20 | Con `organize = false`, sin affordances de organizacion | ST-7 | QA #9 (ST-7) |
| 21 | Con `contribute = false`, sin `+` | ST-1 | QA #60 |
| 22 | Con `delete = false`, sin borrado permanente | ST-6 | QA #35 |

### 16.2 Criterios adicionales de este plan

| # | Criterio | Verificado en |
| --- | --- | --- |
| A | `homecloud.delete` exigida en el backend para purge y vaciar papelera | ST-1 |
| B | **Una sola migracion aplicada** (`favorite` boolean) | ST-11 |
| C | Ninguna `SHARED_INFRA_BLOCKER` abierta | ST-11 |
| D | Menu de create de 5 items planos, sin submenu, sin `Elegir contenido` | ST-3 |
| E | `Importar audio` alcanzable en un tap; `Fotos y videos` sin audio | ST-3 |
| F | Ninguna pieza de audio existente eliminada | ST-3 |
| G | Resurfacing exact-only, **sin** resurfacing mensual | ST-8 |
| H | `partial -> exact` **solo** por eleccion del usuario | ST-3 |
| I | Ningun dia sintetico persistido en ninguna fila | ST-11 |
| J | Ningun waveform **falso** | ST-9 |
| K | Ningun `Modal` de RN envolviendo el Viewer; un solo host modal | ST-4 |
| L | Sin perdida de contexto de llamador en ninguna superficie | ST-2 |
| M | Sin fallback a la raiz en ningun camino | ST-2 |
| N | Sin contenido en staging presentado como compartido | ST-1 |
| O | Sin purge desprotegido | ST-1/ST-6 |
| P | Sin fuga cruzada entre hogares | ST-11 |
| Q | Sin regresion de Files por el upload compartido | ST-11 |
| R | `git diff --check` limpio; sin codigo de producto sin commitear | ST-11 |
| S | Documentos reconciliados con el estado real | ST-11 |
| T | Cero warnings de runtime en el recorrido completo | ST-11 |
| U | Dirty preexistente intacto | todos |
| V | Sin push | todos |
| **W** | **Favorite toggle funciona** — star/unstar desde Viewer y seleccion; aparece en coleccion Favoritos | ST-3 + ST-7 |
| **X** | **Coleccion automatica Favoritos funciona** — tile en Albums rail; dataset ACTIVE favorites; seleccion preserva caller; trash/restore correcto | ST-7 |
| **Y** | **Multi-select Share funciona** — desde cualquier contexto seleccion; `Compartir` N Memories; temp cleanup; caller preservation | ST-5 |
| **Z** | **Image double-tap zoom/reset funciona** — en fit: zoom cerca del toque; en zoom: reset a fit; pager arbitration correcto | ST-10 |
| **AA** | **Video double-tap ±10s funciona** — izquierda: -10s; derecha: +10s; clamp 0/duration; sin conflicto pager; fullscreen compatible | ST-9 |
| **AB** | **Real waveform closure condition pasa** — waveform real audio-derivada (live/static/progressive) muestra muestras reales; sin fake waveform bajo ningun estado; fallback honesto cuando no soportado | ST-9 |
| **AC** | **Platform-native audio routing verificado** — iOS: speaker, wired, BT, AirPlay; Android: speaker, wired, BT; sin custom picker HomeCloud | ST-9 |

### 16.3 Estado final

```
HOMECLOUD_MEMORIES_V1_CLOSED
```

Solo despues de que **todos** los puntos de §16.1 y §16.2 pasan.

---

## 17. Expected Final State

### 17.1 Que sera Memories V1

- **Una** galeria del hogar, no una red social, no un editor, no un filesystem.
- Un `+` con **cinco** acciones planas: `Fotos y videos`, `Capturar momento`, `Importar audio`,
  `Grabar audio`, `Escribir un recuerdo`.
- **Importar audio** funciona: un archivo de audio existente entra por un item de primer nivel,
  con fecha corregible desde el primer momento.
- **Grabar audio** funciona: dos intenciones distintas, un solo review.
- La **fecha** se deriva sola cuando puede, y **siempre** se puede corregir: en el intake y
  despues en `Informacion del recuerdo`.
- **Nunca** se inventa un dia. Una fecha parcial es honesta hasta que el usuario la completa.
- Un **Viewer** inmersivo que oculta el chrome global, respeta los safe areas, y devuelve al
  llamador exacto.
- **Imagenes** con zoom usable en el dedo; **video** con poster antes de `readyToPlay`; **audio**
  con controles completos e identidad honesta, **real audio-derived waveform** (no fake).
- **Albums** que se crean desde el riel o desde una seleccion, sin reseleccionar nada.
- **Papelera** con `Deshacer`, `Restaurar` que conserva la organizacion, y borrado permanente
  **protegido por `homecloud.delete`**.
- **`Para volver a ver`** con grupos deterministas por dia, y la accion de ocultar.
- **Favoritos** — star/unstar en Viewer y seleccion; coleccion automatica `Favoritos` en Albums rail.
- **Multi-select Share** — `Compartir` N Memories desde cualquier contexto seleccion.
- **Image double-tap zoom/reset** — zoom at tap location, reset when zoomed.
- **Video double-tap ±10s** — left: -10s, right: +10s; clamp at bounds.
- **Platform-native audio routing** — iOS/Android system surfaces work; no custom picker.
- **Sin fecha falsa, sin exito falso, sin contenido huerfano, sin modal anidado, sin perdida
  de contexto.**

### 17.2 Que NO sera

Search · Archive · Hidden/privado · People/Pets/Places · OCR · AI · **fake** waveform ·
velocidad de video · mute de video · playback en background ·
resurfacing mensual · correccion masiva de fecha · **custom audio output picker** ·
crop/filtros/collage/memory movie · carpetas de albunes ·
estado `archived` · **custom favorite table**.

### 17.3 Metricas de cierre esperadas

| Metrica | Valor esperado |
| --- | --- |
| Gaps `MISSING` | 0 |
| Gaps `BROKEN` | 0 |
| Gaps `PARTIAL` de V1 | 0 |
| Gaps `STALE` | 0 (o `KEEP` documentado) |
| Gaps `DEFERRED` | sin cambio (no se abren) |
| `EXISTING_UNUSED_CAPABILITY` | sin cambio (no se borran) |
| Paths de V1 `MISSING`/`BROKEN`/`PARTIAL` | 0 |
| Migraciones | 0 |
| Dependencias nuevas | 0 |
| Suites de Memories | ~50, todas verdes |
| Casos `DEVICE_ONLY` | 45, todos verdes |
| Modulos muertos conectados | 4 (`removeMemoryFromOpenAlbum`, `cancel()`, `permissionDenied`/`canAskAgain`, `selectDestination`) |
| Variables muertas eliminadas | 1 (`MemoryViewerSession.memories`, ya eliminada) |

### 17.4 Lo que queda como deuda visible y aceptada

Ver §15.4. Son 5 deudas registradas, ninguna de las cuales es un bug de V1.

---

## 18. First Implementation Session

Esta seccion identifica **una sola** etapa. **No se ejecuta aqui.**

### 18.1 La etapa correcta

**ST-1 — LIFECYCLE BACKEND + GATE `homecloud.delete`**

### 18.2 Gap IDs

`LIFE-01` (backend), `LIFE-03`, `LIFE-04`, `LIFE-05`, `TRASH-05`, `TRASH-07`, `UPL-04`, `CAP-01`

### 18.3 Path IDs

`O-01`, `O-02`, `O-03`, `O-04`, `P-03`, `P-04`, `P-05`, `P-06`, `P-07`, `P-08`, `P-09`, `P-10`,
`P-11`, `P-12`, `T-04`

### 18.4 Por que es la primera

1. **Es el unico P0 de seguridad.** `homecloud.delete` se proyecta al cliente y **0 rutas la
   exigen**. El cliente recibe `delete: true` y no hay nada que gatear. Con Lifecycle ausente,
   cualquier miembro con `contribute` podria eliminar el contenido del hogar de forma
   definitiva **en cuanto exista el endpoint sin gate**. Es un hole latente que se vuelve
   explotable.
2. **Bloquea fisicamente a ST-6.** La UI de papelera, undo, restore y purge no se puede
   construir antes, porque seria UI destructiva sin enforcement.
3. **Es la de menor riesgo tecnico del plan.** El schema ya soporta `trashed` con su CHECK de
   consistencia; el 404 de signed URL ya funciona; la matriz por rol ya existe. No hay migracion,
   no hay dependencia nueva, y no se toca frontend.
4. **Su exit criteria es 100% automatizable.** Es el unico stage sin puerta fisica, lo que lo
   convierte en el punto de partida mas barato de verificar.
5. **Su superficie es pequena y bien delimitada.** 3 endpoints + 1 gate + 2 fugas. La
   auditoria lo dice: "el trabajo de backend de Lifecycle es pequeño y está bien delimitado. El
   hueco no es de diseño de dominio: es de endpoints, escrituras y UI".
6. **Su artefacto mas valioso es la suite de enforcement.** Los 5 `1d_*` huerfanas son los
   unicos que probarian el enforcement de capacidades. Engancharlos aqui significa que toda la
   seguridad de V1 queda con gate desde el primer dia.

### 18.5 Lo que la sesion siguiente NO debe hacer

- **No** construir ninguna UI de papelera (eso es ST-6).
- **No** tocar `homecloudStoragePaths.js` mas alla de leerlo.
- **No** tocar frontend.
- **No** agregar `package.json`, migraciones ni dependencias.
- **No** tocar el dirt preexistente.
- **No** hacer push.
- **No** habilitar purge sin el gate, ni siquiera "temporalmente".
- **No** abrir Album Trash, aunque `homecloud_albums.lifecycle='trashed'` este ahi.

### 18.6 Como derivar el prompt de la sesion siguiente

Para generar el prompt sin repetir investigacion, de esta seccion sale:

| Campo | Valor |
| --- | --- |
| Etapa | ST-1 |
| Objetivo | Escribir `trashed`, exponer trash/restore/purge, exigir `homecloud.delete` |
| Gaps | Los 8 de §18.2 |
| Paths | Los 15 de §18.3 |
| Archivos a inspeccionar primero | `backend/src/routes/homecloud.js:29-92`; `backend/src/services/homecloudIntakeService.js:257,277,587,627,611-620`; `backend/src/lib/householdPermissions.js:7-126`; `backend/src/services/homecloudStorageAccess.js:106-108`; `backend/src/services/homecloudReadService.js:678`; `backend/src/services/homecloudAlbumService.js:25-28` |
| Que cambiar | 3 rutas + 1 servicio nuevo + filtro SQL + 2 fugas |
| Que NO tocar | `front/**`, `homecloudStoragePaths.js`, `homecloudUploadEngine.ts`, `package.json`, migraciones, el dirt |
| Invariantes a preservar | `capture_semantics_check`, `capture_component_range_check`, `trash_consistency` CHECK, `lifecycle` CHECK, `album_items` `ON DELETE CASCADE`, filtro `lifecycle='active'` en SQL, signed URL 404 |
| Tests a correr | `homecloud_lifecycle_backend_contract_tests`, `homecloud_delete_capability_enforcement_tests`, `homecloud_purge_storage_honesty_tests`, `homecloud_staging_sweep_tests`, los 5 `1d_*`, `homecloud_moa1_album_contracts_tests` |
| Gate | Las 4 suites nuevas + 5 `1d_*` + `tsc` filtrado a `homecloud|memory` en 0 errores |
| Device QA | Ninguno (backend puro) |
| Commits esperados | 9, uno por slice |
| STOP | §14.2 condiciones 1, 2, 3, 12, 13, 16 |

---

## 19. Validation Report

Validacion mecanica ejecutada contra las tres autoridades parcheadas.

### 19.1 Cobertura de gaps por status

| Status | Total | Cubiertos por un stage | Disposicion |
| --- | --- | --- | --- |
| `MISSING` | 56 | **56 / 56** | Todos assignados a un stage |
| `BROKEN` | 16 | **16 / 16** | Todos assignados |
| `PARTIAL` (V1) | 34 | **34 / 34** | Todos assignados o preservados explicitamente |
| `STALE` | 3 | **3 / 3** | ALB-01, ALB-03, ALB-06 en ST-7 |
| `DEFERRED` | 15 | 0 asignados | **No se abren** (§15.1/§15.2) |
| `EXISTING_UNUSED_CAPABILITY` | 7 | 0 asignados | **No se exponen** en V1 (§15.3); 4 se preservan porStage |
| `IMPLEMENTED` | 71 | 0 reimplementados | **Se preservan** (§2.2) |

**Gaps huerfanos: 0.**

### 19.2 Gaps `DEFERRED` (15) — disposicion explicita

| ID | Decision | Donde se registra |
| --- | --- | --- |
| `INTAKE-06` | DEFERRED | §15.1: crear album desde el review no es requirement |
| `DATE-10` | DEFERRED | §15.1: correccion masiva de fecha sin evidencia |
| `IMG-07` | DEFERRED | §15.1: crop/edicion = OUT |
| `VID-07` | DEFERRED | §15.1: velocidad, mute, dbl-tap, zoom de video = OUT |
| `AUD-06` | DEFERRED | §15.2: waveform real = V1.1 candidato, condicionada a device QA |
| `WRIT-*`/`INFO-05` | DEFERRED | §15.1: superficie unica de edicion se cumple en ST-3 |
| `RESURF-03/04/05` | DEFERRED | ST-8 los implementa; dejan de ser DEFERRED al cerrarse |
| `RESURF-07` | DEFERRED | §15.1: ocultar grupo/rango = OUT |
| `TRASH-02/03/07` | DEFERRED | ST-1 y ST-6 los implementan; dejan de ser DEFERRED |

**Nota:** Los gaps `ACT-07` (Compartir en seleccion multiple), `ACT-09` (Favoritos), `I-05` (doble toque zoom), `K-05` (waveform), `D-08` (correccion masiva de fecha) **ya no son DEFERRED** — pasaron a **IN ROADMAP** / **IN** con ownership de implementacion en §3.3 y stages correspondientes (§19.1 los cuenta como `MISSING` asignados a stages).

### 19.3 Gaps `STALE` (3) — disposicion explicita

| ID | Verdad antigua | Decision | Stage |
| --- | --- | --- | --- |
| `ALB-01` | `+ Nuevo` en el header de Albums | Se **quita** del header; la creacion va al tile final | ST-7 |
| `ALB-03` | Estado vacio con su propia accion de creacion ademas del header | **Solo** el tile final, incluso con 0 albunes | ST-7 |
| `ALB-06` | La eliminacion de membresia se hace desde seleccion dentro del Album | Igual, pero ahora **alcanzable** (ST-2 arreglo el dataset, ST-5 conecto el modulo) | ST-5/ST-7 |

### 19.4 Paths de V1 (192 total)

Conteo **verificado por extraccion** sobre los bloques `CURRENT STATUS` del Path Matrix
parcheado.

| Status en Path Matrix | Total | Con stage asignado | Preservados sin stage | Disposicion |
| --- | --- | --- | --- | --- |
| `MISSING` | 65 | **65 / 65** | 0 | Todos assignados |
| `PARTIAL` | 36 | **36 / 36** | 0 | Todos assignados |
| `BROKEN` | 15 | **15 / 15** | 0 | Todos assignados |
| `STALE` | 3 | **3 / 3** | 0 | Todos assignados |
| `IMPLEMENTED` | 56 | 43 citados | **13 preservados** | **No se reimplementan** (§2.2) |
| `DEFERRED` | 5 | **0 asignados** | **5 preservados por decision** | No se abren (§15.1/§15.2) |
| **TOTAL** | **192** | **124 / 124 V1** | **18 por decision** | **192 / 192 con disposicion** |

**Los 13 `IMPLEMENTED` que no tienen stage propio** (se preservan tal cual, sin reescritura):

| Path | Que preserva |
| --- | --- |
| `A-02` | Root con datos: un scroll, orden, sin `Recuerdos\|Colecciones` |
| `A-03` | Root vacio: copy honesto, `READY_EMPTY` distinguido de `ERROR` |
| `C-07` | Preview de imagen falla: error boundary + `Reintentar vista previa` |
| `J-03` | Reproducir video: `nativeControls` + `showsTimecodes`, **sin** `play()` automatico |
| `J-05` | Video en pagina inactiva **sin player** (el invariante que imagen no cumple) |
| `R-02` | Salir de la pantalla durante la subida: **no** interrumpe |
| `R-03` | Fallo de subida y retry manual |
| `R-05` | Reinicio de la app con subidas pendientes: se recupera |
| `S-01` | Camara con permiso desconocido: indicador, no error |
| `S-02` | Camara con permiso denegado re-preguntable |
| `S-03` | Camara con permiso denegado permanentemente: `Abrir configuracion` |
| `S-04` | Sacar una foto: shutter, retake, review |
| `S-05` | Grabar un video: temporizador, parar, review |

Los 5 `DEFERRED` del Path Matrix —`D-08` (correccion masiva de fecha), `I-05` (doble toque zoom),
`K-05` (waveform), `N-03` (`Compartir` multiple), `N-08` (Favoritos)— **ya no son DEFERRED** — pasaron a **IN ROADMAP** / **IN** y se cuentan como `MISSING` asignados a stages (§19.1).

### 19.5 Topics obligatorios (§22 del prompt)

| Topic | Stage | Verificado |
| --- | --- | --- |
| Viewer immersive shell / safe areas | ST-4 | Si |
| Album selection context bug | ST-2 | Si |
| Album final create tile | ST-7 | Si |
| Create menu de 5 acciones | ST-3 | Si |
| Import audio direct entry | ST-3 | Si |
| Intake date editing | ST-3 | Si |
| Binary batch intake | ST-10 | Si |
| Memory Info / metadata editing | ST-3 | Si |
| Create Album from selection | ST-7 | Si |
| Action authority / Viewer action menu | ST-5 | Si |
| Image zoom/pan physical correctness | ST-10 | Si |
| Video poster / perceived loading | ST-9 | Si |
| Audio final controls / honest visual identity | ST-9 | Si |
| Written viewer completion | ST-3, ST-10 | Si |
| Lifecycle backend | ST-1 | Si |
| `homecloud.delete` enforcement | ST-1 | Si |
| Trash UI | ST-6 | Si |
| Undo | ST-6 | Si |
| Restore | ST-6 | Si |
| Purge | ST-1 + ST-6 | Si |
| Resurfacing | ST-8 | Si |
| `hidden_from_resurfacing` UI | ST-8 | Si |
| Camera closure | ST-10 | Si |
| Runtime `<Text>` warning investigation | ST-11 | Si |
| Upload/temp cleanup debts de V1 | ST-1, ST-5 | Si |
| Final physical QA | cada stage + ST-11 | Si |
| Final freeze / closure | ST-11 | Si |

**Ningun topic omitido.**

### 19.6 Gaps sin stage, y por que

| ID | Status | Por que no tiene stage |
| --- | --- | --- |
| `IMG-07` | DEFERRED | crop/edicion = OUT de V1 por decision (§14.1) |
| `INTAKE-06` | DEFERRED | crear album desde el review no es requirement; el album se crea desde la seleccion (§10.5) |
| `DATE-10` | DEFERRED | correccion masiva de fecha = OUT de V1 por decision (§7.4) |
| `VID-07` | DEFERRED | velocidad, mute, dbl-tap y zoom de video = OUT (§15.5) |
| `AUD-06` | DEFERRED | waveform real = V1.1 candidato. **No bloquea V1** (§5.3) |
| `ACT-07` | DEFERRED | `Compartir` en seleccion multiple requiere decision de UX |
| `ACT-09` | DEFERRED | Favoritos (§22) |
| `RESURF-07` | DEFERRED | ocultar un grupo o rango requiere modelo de datos nuevo |
| `INFO-05` | DEFERRED | superficie unica de edicion: se cumple en ST-3 al crear Info |
| `TRASH-02/03/07` | DEFERRED | **se implementan** en ST-1/ST-6; dejan de ser DEFERRED |
| `RESURF-03/04/05` | DEFERRED | **se implementan** en ST-8; dejan de ser DEFERRED |
| `SRCH-01`, `CAP-01` | CAP | `CAP-01` **se implementa** en ST-1; `SRCH-01` = OUT, se documenta |
| `DEP-01/02/03` | CAP | `DEP-03` **se usa** en ST-4; `DEP-01` = V1.1; `DEP-02` = decision de no agregar |
| `VID-08` | CAP | Diagnostico de upload preexistente. **No tocar** |
| `TEST-02` | CAP | Fallos ajenos documentados (§11.6) |

**Ningun gap huerfano.**

### 19.7 P0 y device-only con dueno

| P0 | Stage | Device-only unknown | Dueno |
| --- | --- | --- | --- |
| Seguridad (`delete`) | ST-1 | Zoom de imagen | ST-10 |
| Datos (fecha) | ST-3 | Causa raiz del video lento | ST-9 |
| Datos (audio importado) | ST-3 | `useAudioSampleListener` en iPhone | **V1.1, no V1** |
| Datos (`partial -> exact`) | ST-3 | EXIF por version de iOS | ST-11 |
| Navegacion (caller context) | ST-2 | Warning `<Text>` | ST-11 |
| Navegacion (back Android) | ST-2 | Pull-to-refresh | ST-2 |
| Producto (papelera) | ST-6 | Fullscreen en pager | ST-9 |
| Producto (crear album) | ST-7 | Seek +/-10 audible | ST-9 |
| Producto (resurfacing) | ST-8 | Feel de scrub nativo | ST-9 |
| Producto (viewer) | ST-4 | Camara en dispositivo | ST-10 |
| Percepcion (poster) | ST-9 | Parada audible al deslizar | ST-9 |
| Datos (dia sintetico) | ST-3 + ST-8 | Ninguno | — |

**Todos los P0 tienen stage. Todos los device-only tienen dueno.**

### 19.8 Orden final de stages

| # | Stage | Una frase |
| --- | --- | --- |
| 1 | ST-1 | Cerrar el P0 de seguridad: escribir `trashed`, exponer las 3 transiciones y exigir `homecloud.delete` antes de que exista ninguna UI. |
| 2 | ST-2 | Arreglar la navegacion: la seleccion, el back de Android y el scroll preservan el contexto de llamador, porque todo lo demas se construye encima. |
| 3 | ST-3 | Cerrar el P0 de datos: `PATCH` de memory, fecha editable en intake, y `Importar audio` como accion de primer nivel con la `Sin fecha` corregible. |
| 4 | ST-4 | Hacer el Viewer inmersivo **ocultando** el chrome global, no convertingiendolo en `Modal`, para no crear un host modal anidado. |
| 5 | ST-5 | Una sola autoridad de acciones y el `...` del Viewer, que desbloquea 6 gaps de una vez. |
| 6 | ST-6 | La UI de lifecycle sobre el backend ya protegido: papelera, undo, restore y purge. |
| 7 | ST-7 | La creacion de album: tile final del riel y `Nuevo album` desde la seleccion, sin reseleccionar. |
| 8 | ST-8 | Resurfacing exact-only, con el unico camino de vuelta: el usuario completa la fecha. |
| 9 | ST-9 | Percepcion de medios: poster de video, 1 original por apertura, y los controles de audio V1 sin waveform falsa. |
| 10 | ST-10 | Zoom, batch intake y camara, cuando el intake final ya existe y aun queda stage de cierre para la QA. |
| 11 | ST-11 | Cierre: reconciliacion, deudas de schema declaradas, y el recorrido fisico de los 22 puntos de §31. |

---

## 26. Five Execution Packages — Final Roadmap Form

El usuario NO quiere once implementation prompts. El plan debe exponer un **FINAL EXECUTION PACKAGE MAP** con maximo **cinco** paquetes. Cada paquete esta pensado para convertirse en **UN future agent prompt**.

### 26.1 Mapa de paquetes

| Package | Nombre | Stages internos | Gate de parada | Por que primero/orden |
| --- | --- | --- | --- | --- |
| **P1** | **FOUNDATION & CORRECTNESS** | ST-1, ST-2 | Automated gate + device QA (nav) | Backend P0 seguridad + navegacion caller context son precondiciones de todo lo demas. ST-1 es backend puro (0 device QA); ST-2 es front-only con 7 device QA casos (3 `DEVICE_ONLY`). |
| **P2** | **MEMORY UX CORE** | ST-3, ST-4, ST-5 | Automated gate + device QA (create, viewer, actions) | ST-3: fecha editable + PATCH + create 5 (incluye Favorites migration + Favorites toggle backend). ST-4: viewer inmersivo (7 `DEVICE_ONLY` — chrome global, safe areas). ST-5: action authority + Viewer menu + **Multi-share** (5 `DEVICE_ONLY` — share sheet, copy, temp cleanup). |
| **P3** | **ORGANIZATION & REDISCOVERY** | ST-6, ST-7, ST-8 | Automated gate + device QA (trash, albums, resurfacing) | ST-6: lifecycle UI sobre backend ya protegido (papelera, undo, restore, purge — 0 `DEVICE_ONLY`, 9 `DEVICE_PREFERRED`). ST-7: Albums tile final + crear desde seleccion + **Favorites smart collection** (3 `DEVICE_ONLY` — tile, crear desde seleccion). ST-8: Resurfacing exact-only + `partial->exact` (3 `DEVICE_ONLY` — banda, transicion). |
| **P4** | **MEDIA & CAPTURE COMPLETION** | ST-9, ST-10 | Automated gate + device QA (media pesada) | ST-9: poster video, 1 original/apertura, audio controles V1, **real waveform strategy**, **video double-tap ±10s**, **platform audio routing verify** (8 `DEVICE_ONLY` — poster, fullscreen, seek, waveform, routing). ST-10: **image double-tap zoom/reset**, batch intake, camara, deudas (9 `DEVICE_ONLY` — zoom, camara, AppState). |
| **P5** | **FINAL CLOSURE** | ST-11 | Automated gate + device QA (recorrido completo) | Reconciliacion documental, `favorite` migration verification, albumIds household isolation, runtime warning attribution, **22 puntos de §31** + 12 device QA casos (4 `DEVICE_ONLY`). |

### 26.2 Package Rules

- Cada paquete es **UN future agent prompt**. Los stages internos pueden **STOP** por: automated QA failure, device QA failure, security gate, `SHARED_INFRA_BLOCKER`.
- Un prompt NO significa ejecutar ciegamente todos los stages internos tras un gate fallido. El prompt debe ser **resumable**: si ST-4 falla en device QA, el agente reanuda desde ahi, no desde ST-1.
- **No generar estos cinco prompts en esta sesion**. Solo patch el roadmap para que puedan generarse sin re-investigar.
- Cada paquete hereda los `DO NOT ADVANCE IF` de sus stages internos.

---

## 20. Nota de Cierre

Este plan se derivo de las tres autoridades **parcheadas** en el commit `3b248f7`. No reabrió
ninguna pregunta de producto que ya estuviera resuelta, no preservo los limites de stage de
HC2-C Run A / Run B, no resolvio problemas de implementacion durante la planificacion, no
escondio trabajo de seguridad detras de trabajo de frontend, no escondio incertidumbre
device-only detras de tests, y no rediseño la infraestructura compartida de HomeCloud desde el
carril de Memories.

```
PLAN COMPLETE
NEXT: generar y ejecutar el prompt de ST-1
```

