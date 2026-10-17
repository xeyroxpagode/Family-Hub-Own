# HOMECLOUD FILES — FINAL UX & FUNCTIONAL DECISION FREEZE V3.2

**Nombre corto:** Files Freeze  
**Estado:** `FINAL_DECISION_FREEZE`  
**Ámbito:** HomeCloud · Files  
**Fecha:** 13/10/2026  
**Autoridad:** este documento congela la experiencia objetivo de Files y reemplaza decisiones UX/UI anteriores cuando entren en conflicto explícito con este Freeze.  
**Implementación:** todavía no iniciada. El siguiente paso será auditar el CURRENT real y derivar el REAL GAP antes de tocar código.

---

# 0. PROPÓSITO

Este documento formaliza, sin ambigüedad, la experiencia final objetivo de HomeCloud Files.

No vuelve a abrir decisiones ya cerradas de:

- permisos y roles;
- household scoping;
- RLS y seguridad;
- lifecycle;
- trash / restore / purge;
- persistencia;
- archivos originales;
- backend válido existente;
- viewers y contratos técnicos que no contradigan este Freeze.

El objetivo es que Files funcione como **una única experiencia coherente**, no como una suma de modificaciones aisladas.

Cada decisión debe interpretarse junto con las reglas de concatenación de este documento.

---

# 1. PRINCIPIOS GLOBALES

## FF-001 — Claridad
Cada pantalla debe comunicar claramente:

1. dónde está el usuario;
2. qué contenido está viendo;
3. qué acción puede realizar;
4. qué operación está ocurriendo;
5. cómo volver, cerrar o recuperarse.

No se muestran estados técnicos en lugar de información útil para el usuario.

## FF-002 — Geometría estable
Header HomeCloud, selector Archivos/Recuerdos, búsqueda y navbar mantienen una geometría estable.

Navegar entre carpetas no puede:

- desplazar toda la pantalla;
- cortar cards por los laterales;
- introducir offsets residuales;
- modificar alturas de superficies ajenas al contenido.

Se anima el contenido navegable, no toda la estructura.

## FF-003 — Contexto antes que formularios
No volver a pedir información que ya se conoce.

Ejemplos definitivos:

- `+ → Elegir archivo → picker nativo`.
- Nueva carpeta hereda la carpeta actual.
- Renombrar precarga el nombre actual.
- Guardar escaneo conoce el destino actual.
- Mover conoce qué archivos están siendo movidos.

## FF-004 — Progressive disclosure
Las acciones frecuentes permanecen visibles o a un gesto directo.

Las acciones secundarias se agrupan en `⋯`, popovers o sheets según su complejidad.

No mostrar seis o siete botones permanentes cuando pueden resolverse contextualmente.

## FF-005 — Consistencia Files / Memories
Cuando la intención sea la misma, el patrón debe ser reutilizable entre Files y Memories:

- selección;
- popovers;
- drag-select;
- overlays;
- feedback;
- motion;
- safe areas.

Esto no obliga a que ambos módulos tengan el mismo contenido.

## FF-006 — Mobile real como autoridad UX
La validación física en iPhone tiene prioridad sobre tests que solo comprueban montaje o estructura.

Debe contemplarse:

- safe areas;
- Dynamic Island / notch;
- navbar flotante;
- teclado;
- Dynamic Type;
- VoiceOver;
- Reduced Motion;
- precisión táctil.

---

# 2. BROWSER PRINCIPAL Y CARPETAS

## FF-007 — Estructura estable

### Root

```text
HomeCloud

[ Archivos | Recuerdos ]

[ Buscar en archivos ]

Archivos                    Organizar   +   ⋯

CONTENIDO
```

### Dentro de una carpeta

```text
HomeCloud

[ Archivos | Recuerdos ]

[ Buscar en esta carpeta ]

← Nombre carpeta             Organizar   +   ⋯

CONTENIDO
```

Entrar a una carpeta no agrega filas nuevas ni altera la estructura general.

## FF-008 — Búsqueda
Se elimina el label visual redundante `Buscar`.

Placeholder:

- Root: `Buscar en archivos`
- Carpeta: `Buscar en esta carpeta`

El nombre accesible se conserva para VoiceOver.

## FF-009 — Nombre de carpeta único
El nombre de la carpeta aparece únicamente en la barra contextual.

No se repite debajo del buscador.

## FF-010 — Transición de carpetas
La navegación puede comunicar dirección mediante slide/fade corto.

Solo se anima el área navegable.

No se animan:

- header HomeCloud;
- tabs Archivos/Recuerdos;
- búsqueda;
- navbar.

Al finalizar, toda la geometría debe volver exactamente a su posición base.

## FF-011 — Preservación de contexto
Al volver desde una carpeta, viewer, sheet operativo o selector de destino, se conserva cuando corresponda:

- carpeta;
- búsqueda;
- filtros;
- orden;
- vista grid/lista;
- posición de scroll;
- selección activa.

No se reconstruye arbitrariamente el browser desde root.

---

# 3. CUADRÍCULA, LISTA Y TARJETAS

## FF-012 — Grid uniforme
Vista predeterminada: **dos columnas** en móvil vertical.

Cada archivo y carpeta ocupa exactamente una celda.

Queda prohibido:

- expandir una card a dos columnas porque sobra espacio;
- variar el ancho según la posición;
- estirar una fila incompleta para completar el ancho.

Las filas incompletas quedan alineadas al inicio.

## FF-013 — Geometría adaptable
El tamaño de cada celda se calcula desde el viewport real.

Nunca depende de offsets de animación ni de posiciones transitorias.

## FF-014 — Nombres en Grid
En cuadrícula:

- máximo dos líneas;
- truncamiento estable;
- nunca desbordar la celda;
- preservar la extensión cuando sea viable;
- no alterar la altura de la card por nombres extensos.

## FF-015 — Vista Lista
Files tendrá dos representaciones:

- **Cuadrícula**
- **Lista**

Cuadrícula es la vista predeterminada.

La vista se selecciona dentro de `Organizar`.

### Archivo en Lista

```text
[preview]  Cuestionario fibra óptica.docx       ⋯
           Documento de Word · 13 oct
```

### Carpeta en Lista

```text
[folder]   Documentos                           ⋯
           Carpeta
```

Grid y Lista comparten exactamente:

- dataset;
- filtros;
- orden;
- favoritos;
- permisos;
- selección;
- menús;
- índice lateral;
- operaciones.

Cambiar de Grid a Lista no equivale a cambiar de browser ni debe resetear el contexto.

---

# 4. ORGANIZAR, ORDEN E ÍNDICE LATERAL

## FF-016 — Ordenamientos
Opciones congeladas:

- `Recientes`
- `A–Z`

Para Files, `Recientes` utiliza la fecha de incorporación del archivo a HomeCloud Files.

No utiliza la fecha semántica de Memories.

## FF-017 — Índice lateral contextual
La navegación rápida lateral depende del orden activo.

### Recientes
Índice temporal:

- mes;
- año;
- mayor precisión solo cuando aporte valor.

### A–Z
Índice alfabético por letras o grupos.

### Con búsqueda o filtros
El índice representa únicamente el conjunto visible actual.

### Pocos elementos
No se muestra.

## FF-018 — Funcionamiento del índice
El índice:

- no reemplaza el scroll normal;
- es discreto cuando no se utiliza;
- al arrastrar muestra un label flotante con fecha/letra;
- puede usar feedback háptico ligero;
- nunca inventa posiciones de datos todavía desconocidos;
- no promete saltos semánticos si la paginación no puede resolverlos correctamente.

## Superficie Organizar final

El antiguo concepto `Filtros y orden` pasa a llamarse **Organizar** porque controla también la representación.

```text
Organizar                              ×

MOSTRAR
[ Todos ] [ Favoritos ]

ORDENAR
[ Recientes ] [ A–Z ]

VISTA
[ ▦ Cuadrícula ] [ ≡ Lista ]
```

Reglas:

- cambios inmediatos;
- sin botón `Aplicar`;
- sin texto descriptivo redundante;
- sin espacios vacíos artificiales;
- altura ajustada al contenido.

Relaciones obligatorias:

- `Recientes → índice temporal`.
- `A–Z → índice alfabético`.
- Grid/Lista no cambia la semántica del índice.
- Favoritos/búsqueda restringen el universo sobre el que opera el índice.

---

# 5. POPOVERS, MENÚS Y MODAL SHEETS

## FF-019 — Regla de superficie

### Popover
Se usa para comandos breves, acciones contextuales, pocas opciones y tareas sin formulario ni navegación interna.

### Modal sheet
Se usa para formularios, selector de destino, organización, confirmaciones extensas, información o tareas que requieren más superficie.

No se elige el componente por comodidad técnica.

## FF-020 — `+` de Files
`+` abre un **popover contextual anclado**:

```text
Elegir archivo
Escanear documento
Nueva carpeta
```

Resultados:

- `Elegir archivo → picker nativo inmediatamente`.
- `Escanear documento → cámara inmediatamente`.
- `Nueva carpeta → sheet Nombre + Crear`.

No existe una pantalla puente.

## FF-021 — `⋯` general
Popover:

```text
Seleccionar
Papelera
```

- Seleccionar entra directamente al modo selección.
- Papelera navega directamente a Papelera.

## FF-022 — `⋯` de archivo
Popover compacto:

```text
Información
Renombrar
Mover
────────────
Guardar una copia
Compartir
Agregar a favoritos
────────────
Mover a la papelera
```

Acciones condicionadas por permisos y capacidades.

## FF-023 — `⋯` de carpeta
Popover:

```text
Renombrar
Mover
────────────
Eliminar carpeta
```

La explicación de consecuencias de eliminación aparece en la confirmación destructiva, no permanentemente en el menú.

## FF-024 — Jerarquía visual
- acciones normales: neutras;
- acción principal cuando corresponda: terracota;
- destructivas: rojo/destructive;
- separadores por grupos semánticos.

Terracota no significa “botón para todo”.

## FF-025 — Backdrop
Con popover activo:

- atenuación suave;
- blur ligero cuando plataforma y accesibilidad lo permitan;
- fondo reconocible;
- sin desplazamiento de geometría.

No se fija un porcentaje técnico de blur.

## FF-026 — Un solo overlay contextual activo
No pueden coexistir popover anterior, sheet nuevo, botón `Cancelar` huérfano, backdrop antiguo o lock invisible.

Ejemplo correcto:

```text
Popover archivo
↓ Mover
Cerrar popover
↓
Sheet Mover
```

La bandeja de upload es estado persistente, no overlay modal.

## FF-027 — Posicionamiento adaptativo
Los popovers:

- se anclan al trigger real;
- se reposicionan cerca de bordes;
- respetan notch;
- respetan navbar;
- respetan teclado;
- solo usan fallback a sheet si realmente no existe espacio útil o la tarea ya requiere un sheet.

---

# 6. GESTOS Y SELECCIÓN

## FF-028 — Mapa de gestos definitivo

| Estado | Gesto | Resultado |
|---|---|---|
| Normal | Tap archivo | Abrir viewer |
| Normal | Tap carpeta | Entrar |
| Normal | Tap `⋯` | Menú contextual |
| Normal | Long press estacionario | Menú contextual |
| Normal | Long press + movimiento | Iniciar/continuar selección |
| Normal | Drag normal | Scroll |
| Selección | Tap archivo | Toggle selección |
| Selección | Drag por archivos | Selección continua |
| Selección | Tap carpeta | Entrar a carpeta |

Menú contextual y selección nunca pueden dispararse simultáneamente.

Las carpetas no forman parte de la selección múltiple.

## FF-029 — Header de selección
Al entrar:

```text
X        3 seleccionados               ⋯
```

Durante selección:

- `Organizar` desaparece;
- `+` desaparece;
- `⋯` pasa a representar acciones masivas.

## FF-030 — Feedback visual
Archivo seleccionado:

- check visible;
- borde;
- overlay/atenuación mínima.

No ocultar el filename ni el preview completo.

## FF-031 — Eliminar barra inferior
Desaparecen definitivamente los botones inferiores:

`Mover | Cancelar`

La navegación y acciones viven en el header de selección.

## FF-032 — Selección entre carpetas
La selección pertenece a Files, no a la grilla actual.

## FF-033 — Identidad real
La selección almacena identidad real del archivo, no posición visual.

Si un elemento desaparece, pierde permisos o cambia lifecycle, se invalida con feedback claro.

## FF-034 — Drag-select
Long press + movimiento entra en selección y continúa seleccionando sin exigir levantar el dedo.

## FF-035 — Autoscroll
Durante drag-select, acercarse al borde produce:

- scroll gradual;
- feedback discreto;
- sin saltos bruscos;
- sin selección fantasma.

---

# 7. OPERACIONES MASIVAS Y MOVER

## FF-036 — Menú de selección
`⋯` muestra únicamente acciones válidas para el conjunto seleccionado.

## FF-037 — Mover
Mover siempre usa **sheet de destino**.

- tocar carpeta = navegar;
- `Mover aquí` = ejecutar.

Nunca se confunden ambas acciones.

## FF-038 — Destinos inválidos
No se permite mismo destino como operación inútil, destino sin permiso o destino incompatible.

## FF-039 — Orígenes múltiples
Archivos provenientes de varias carpetas pueden moverse a un destino común.

Cada archivo se valida individualmente.

Éxito parcial no puede informarse como éxito total.

### Cierre del modo selección
- éxito total → salir de selección;
- éxito parcial → mantener seleccionados solo los elementos fallidos;
- cancelar sheet → volver a la selección original;
- cambiar Files → Memories → terminar selección Files.

---

# 8. UPLOAD Y COLA DE TRANSFERENCIAS

## FF-040 — Inicio directo

```text
+ → Elegir archivo
↓
picker nativo
↓ elegir
browser + upload pill
```

No existe formulario HomeCloud intermedio.

## FF-041 — Pill colapsado

```text
Subiendo · 45%
2 en cola
━━━━━━━━━━━━
```

Pequeño, flotante, sobre navbar, sin reflow y con progreso real.

## FF-042 — Expansión
Se expande **la misma superficie**.

```text
Subidas

informe.docx       45%         Cancelar
slides.pptx        En cola     Cancelar
gastos.xlsx        En cola     Cancelar
```

No se crea un segundo popover.

## FF-043 — Estados por archivo
- En cola
- Preparando
- Subiendo
- Verificando
- Finalizando
- Completado
- Fallido
- Cancelado

No mostrar porcentaje falso cuando ya no existe transferencia real de bytes.

## FF-044 — Retry
Reintentar afecta solo el archivo fallido.

## FF-045 — Persistencia
La transferencia continúa al navegar dentro de Files.

No se duplica ni se cancela por cambiar de carpeta.

## FF-046 — Bandeja expandida
- altura máxima;
- scroll interno;
- no cubre toda la app;
- permite mantener noción de contexto.

Con sheet/modal activo, el upload continúa pero el pill queda visualmente subordinado y no recibe taps.

---

# 9. SCANNER — FLUJO FINAL

## FF-047 — Flujo obligatorio

```text
Captura
↓
Ajustar esquinas
↓
Revisión multipágina
↓
Guardar PDF
```

No existen rutas paralelas para la tarea principal.

## FF-048 — Cámara inmersiva
Durante cámara se ocultan navbar global, header HomeCloud y tabs.

Permanece únicamente el chrome del scanner.

## FF-049 — Editor inmersivo
Después de capturar:

- imagen grande;
- máxima superficie útil;
- proporción respetada;
- sin preview minúsculo artificial;
- sin navbar global superpuesta.

## FF-050 — Cuatro esquinas
Perspectiva siempre editable mediante cuatro esquinas independientes.

- detección confiable → sugerencia automática;
- sin detección → límites de la imagen;
- siempre editables manualmente.

## FF-051 — Precisión
Puede existir lupa/zoom contextual durante drag de esquina.

## FF-052 — Controles del editor
Principal: `Confirmar`.

Secundarias:

- Repetir
- Rotar
- Restablecer

No coexistirán confirmaciones duplicadas como `✓`, `Aplicar y ver` y `Editar página`.

## FF-053 — Edición individual
Perspectiva, crop y rotación afectan solo la página actual.

## FF-054 — Revisión multipágina

```text
Escaneo · 3 páginas

[        página actual grande         ]

[1] [2] [3]

[ + Página ]             [ Guardar PDF ]
```

Tocar una miniatura abre el editor de esa página.

## FF-055 — Acciones secundarias
`⋯` de página agrupa Repetir, Eliminar y Reordenar.

## FF-056 — Reordenamiento
Preferencia: drag & drop.

Alternativa accesible:

- Mover antes
- Mover después

El orden final visual debe coincidir exactamente con el PDF generado.

## FF-057 — Guardar escaneo
Sheet minimalista con:

- nombre editable;
- destino actual;
- opción de cambiar destino;
- Guardar.

## FF-058 — Error
Si falla generación o upload:

- conservar páginas;
- conservar ajustes;
- permitir reintento.

## FF-059 — Éxito
Después de guardar:

- volver a la carpeta destino;
- nuevo PDF visible;
- feedback `Escaneo guardado · Abrir`.

No abrir automáticamente el PDF.

---

# 10. FORMULARIOS Y FEEDBACK

## FF-060 — Nueva carpeta
Sheet simple con Nombre + Crear. Destino implícito = carpeta actual.

## FF-061 — Renombrar
Nombre actual precargado, una acción principal, guardar, cerrar y actualizar UI.

## FF-062 — Destino
No pedir nuevamente una ubicación ya conocida.

Cambiar destino es opcional y explícito.

## FF-063 — Feedback
Operaciones breves correctas usan toast/snackbar discreto.

`Deshacer` solo aparece cuando exista restauración real.

---

# 11. VIEWERS

## FF-064 — Metadata humanizada
Nunca mostrar MIME crudo, UUID, rutas internas ni URLs firmadas.

Sí mostrar información como:

`Documento de Word · 22 KB`

## FF-065 — Nombre primero
El nombre real del archivo es la referencia principal.

## FF-066 — Chrome contextual
- imagen/video pueden ocultar chrome cuando aporte valor;
- PDF/text/Office mantienen controles necesarios.

## FF-067 — Retorno estable
Cerrar viewer devuelve a misma carpeta, scroll, query, filtro, orden y vista.

El cierre nunca puede quedar bloqueado por error.

## FF-068 — Fallback
Un formato incompatible muestra explicación comprensible, Reintentar y alternativa válida cuando corresponda.

### Acciones desde viewer
El `⋯` reutiliza las acciones del mismo archivo.

- Renombrar → viewer permanece y actualiza título.
- Mover → sheet sobre viewer; viewer puede permanecer si el archivo sigue disponible.
- Papelera → cerrar viewer y retornar al browser actualizado.

---

# 12. OFFICE VIEWER

## FF-069 — Alcance V1
Office es **read-only**.

Formatos principales:

- DOCX
- XLSX
- PPTX

## FF-070 — Estados
Debe soportar:

- Preparing
- Loading
- Ready
- Error
- Retry
- Close

## FF-071 — Disponibilidad real
Document Server configurado es requisito funcional.

`office_viewer_unavailable` significa función incompleta.

Nunca hardcodear secretos ni reemplazar Office por un falso preview.

---

# 13. MOTION

## FF-072 — Motion funcional
Motion comunica origen, destino y cambio de estado.

No decora innecesariamente.

## FF-073 — Navegación
Slide/fade únicamente sobre contenido navegable.

## FF-074 — Reduced Motion
Mismo resultado final, duraciones reducidas y sin geometría alternativa ni errores de interpolación.

---

# 14. SAFE AREAS Y ACCESIBILIDAD

## FF-075 — Navbar
Ningún control funcional queda debajo, tapado o inaccesible.

## FF-076 — Teclado
La acción primaria de un sheet debe seguir accesible con teclado abierto.

## FF-077 — Touch targets
Los targets táctiles deben ser cómodos aunque el icono visual sea pequeño.

## FF-078 — Dynamic Type
El texto puede crecer sin ocultar acciones críticas.

## FF-079 — VoiceOver y alternativas
Todo gesto complejo tiene alternativa accesible:

- drag reorder → mover antes/después;
- drag-select → selección por taps;
- índice lateral → scroll estándar.

---

# 15. ESTADOS Y ERRORES

## FF-080 — Estados distintos
Diferenciar:

- loading;
- empty;
- no results;
- offline;
- forbidden;
- recoverable error;
- fatal error;
- operation in progress.

Nunca usar un empty state para representar un error.

## FF-081 — Recuperación
Cuando exista una salida útil, mostrar claramente:

- Reintentar;
- Volver;
- Deshacer;
- Cambiar destino;
- Abrir externamente.

---

# 16. CONTRATOS DE CONCATENACIÓN OBLIGATORIOS

| Situación | Resultado obligatorio |
|---|---|
| Recientes → A–Z | índice pasa automáticamente de fechas a letras |
| Grid → Lista | filtros, orden, contexto y selección permanecen |
| Entrar en selección | Organizar y `+` desaparecen |
| Entrar en carpeta durante selección | selección previa permanece |
| Tap carpeta durante selección | navegar, nunca seleccionar carpeta |
| Popover → acción que necesita sheet | cerrar popover antes de presentar sheet |
| Sheet con upload activo | upload continúa pero no recibe interacción |
| Cancelar picker nativo | volver al mismo browser |
| Elegir archivos en picker | iniciar upload directamente |
| Error parcial de upload | solo el archivo fallido pasa a Retry |
| Capturar en scanner | abrir siempre ajuste de esquinas |
| Confirmar esquinas | volver siempre a Review |
| Tocar página en Review | abrir editor individual de esa página |
| Guardar scanner | volver al destino con PDF visible |
| Viewer → Renombrar | actualizar viewer sin reconstruirlo |
| Viewer → Papelera | cerrar viewer y actualizar browser |
| Operación masiva total | salir de selección |
| Operación masiva parcial | conservar seleccionados solo los fallidos |
| Files → Memories | terminar selección Files |
| Back desde carpeta | restaurar contexto del padre |
| Reduced Motion | mismo resultado final con motion reducido |

---

# 17. REGLA PARA LA FUTURA IMPLEMENTACIÓN

Antes de modificar cada sistema:

## 1. CURRENT
Rastrear el flujo real completo.

## 2. TARGET
Usar exclusivamente este Freeze como autoridad UX/funcional.

## 3. REAL GAP
Determinar:

- qué ya cumple;
- qué cumple parcialmente;
- qué sobra;
- qué falta;
- qué debe preservarse.

## 4. IMPLEMENTACIÓN
Modificar únicamente el REAL GAP.

## 5. QA
Validar primero contrato, después flujo completo y finalmente dispositivo real.

El objetivo de la auditoría no será redescubrir producto. Será localizar exactamente qué separa al CURRENT de este TARGET.

---

# 18. GATE DE CIERRE FUTURO

Files solo podrá declararse cerrado cuando pasen:

- navegación root → carpeta → volver;
- grid uniforme;
- vista Lista;
- Organizar;
- índice temporal;
- índice A–Z;
- popovers correctos;
- sheets correctos;
- selección;
- drag-select;
- autoscroll;
- selección entre carpetas;
- mover;
- upload de múltiples archivos;
- expansión de cola;
- cancelación individual;
- retry;
- scanner 2+ páginas;
- cuatro esquinas;
- reordenamiento;
- generación PDF;
- viewer común;
- PDF;
- DOCX;
- XLSX;
- PPTX;
- errores;
- permisos;
- safe areas;
- Reduced Motion.

Y además:

`AUTOMATED_QA_PASS`

+

`DEVICE_QA_PASS`

+

`FILES_PRODUCT_FREEZE_CLOSED`

---

# 19. EXCLUSIONES

Este Freeze no autoriza:

- rediseñar Memories completo;
- alterar permisos;
- modificar RLS arbitrariamente;
- cambiar household semantics;
- reescribir lifecycle;
- editor Office;
- OCR nuevo;
- sincronización offline completa;
- reescribir backend sin evidencia;
- nuevas features ajenas a Files;
- convertir todos los overlays en popovers;
- convertir todos los overlays en sheets.

Sí permite reutilizar posteriormente en Memories componentes compartidos correctamente diseñados para popovers, selección, gestos, overlays y motion.

---

# 20. ESTADO FINAL

**`FILES_V3.2_FINAL_DECISION_FREEZE`**

Las decisiones de producto y experiencia objetivo de HomeCloud Files quedan formalizadas y conectadas entre sí.

Este documento cierra la etapa de definición de TARGET.

No implica todavía:

- que el CURRENT soporte todo;
- que se haya auditado el worktree;
- que se haya generado la Master Gap List;
- que la implementación esté autorizada.

## Próximo paso

Cuando se decida comenzar implementación:

**CURRENT audit → TARGET reconciliation → REAL GAP → Master Gap List → prompt de implementación.**

No se vuelve a rediscutir la experiencia objetivo durante esa auditoría salvo contradicción técnica real que haga imposible una decisión congelada.
