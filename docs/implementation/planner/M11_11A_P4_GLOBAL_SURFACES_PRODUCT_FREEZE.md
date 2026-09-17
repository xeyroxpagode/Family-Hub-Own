# M11 - 11A.P4 Global Surfaces Product Freeze

**MILESTONE:** Planner V1 - 11A.P4 Global Surfaces Product Freeze
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
**BRANCH:** `planner-v1-11a-p4-global-surfaces-product-freeze`
**BASE P4 ORIGINAL:** `0d664a173a87cd03ac5e363054b24f1d8425988e`
**BASE CORRECCIÓN R1:** `7d63f449879f2832a55a950a61999ead5cac903c`
**FECHA:** 2026-08-02
**ALCANCE:** Documentación únicamente. Sin código, contratos, backend, navegación, UI, Supabase, paquetes ni lockfiles.

---

## 1. Estado del freeze

```text
PLANNER V1 - GLOBAL SURFACES PRODUCT FREEZE

STATUS: FROZEN
HUMAN APPROVAL: APPROVED
APPROVAL DATE: 2026-08-02
CHANGE REQUEST: CR-M11-11A-GLOBAL-SURFACES-001
MILESTONE: 11A.P4
CANONICAL AUTHORITY: PLANNER_V1_M11_FUNCTIONAL_FREEZE.md version 1.3
IMPLEMENTATION: NOT YET AUTHORIZED
NEXT GATE: 11A.1 Technical Architecture / Contract Readiness Audit
```

Esta corrección R1 mejora solamente la calidad documental, la precisión y la
coherencia interna. No reabre, reemplaza ni amplía ninguna decisión de producto
P3.

---

## 2. Autoridad y precedencia

Este documento registra el Product Freeze de Global Surfaces aprobado por las
decisiones P3 y confirmado el 2026-08-02. La autoridad funcional canónica es
`PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` versión 1.3.

Este documento contiene:

- el registro del Change Request;
- el análisis de impacto;
- la matriz `Entity / Surface Matrix`;
- el ledger de reglas superseded con brechas técnicas restantes;
- las preguntas de auditoría técnica para 11A.1;
- las exclusiones de implementación;
- la trazabilidad hacia P0, P1, P2 y P3;
- las notas de validación de esta corrección R1.

Si este documento o cualquier artefacto previo P0/P1/P2 contradice
`PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` versión 1.3 o el Decision Registry después
de `CR-M11-11A-GLOBAL-SURFACES-001`, prevalecen las autoridades canónicas.

---

## 3. Change Request

**CHANGE ID:** CR-M11-11A-GLOBAL-SURFACES-001
**REQUESTER:** Human Product Owner / Control General
**REASON:** Cerrar Global Surfaces después de 11A.0 Readiness Audit, P0 Factual
Inventory, P1A-P1D Comparative Research, P2 Integrated Synthesis y las P3 Human
Decisions.

### Comportamiento previo superseded

Antes de este Change Request, el freeze histórico y el material de investigación
todavía contenían reglas que ahora quedan superseded:

- Search incluía Drafts visibles, Presets, People, Settings, acciones y rutas.
- Quick Actions se describía sólo como tiles de creación.
- Los Drafts persistentes entraban en Trash y tenían recuperación de 30 días.
- Planner V1 no permitía eliminación permanente manual.
- Archive estaba concentrado principalmente en Plans.
- Trash era local de Planner o estaba fragmentado entre Planner y Preset/Draft Trash.
- Attention y Activity globales no estaban congelados como una superficie común con tabs.
- Inventory quedaba insinuado de forma demasiado amplia por lenguaje cross-module.

### Comportamiento aprobado y congelado

El comportamiento aprobado es el set P3 GS-01 a GS-12, incorporado en las tres
autoridades:

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` sección 1.3;
- `PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md` bloque 11A.P3 / CR-M11-11A-GLOBAL-SURFACES-001;
- `PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md` secciones GS-V1 a GS-V11.

### Análisis de impacto

| Dimensión | Impacto congelado o brecha de auditoría |
|---|---|
| Producto | Capa global coherente: Home híbrida, superficie Quick Actions + Search, Attention + Activity con tabs, Trash global con filtros, Archive contextual, descarte definitivo de Drafts y gates de permanent delete / Empty Trash. |
| Frontend | Se requieren superficies globales nuevas o adaptadas, pero este P4 no define rutas, componentes ni arquitectura de navegación. 11A.1 debe auditar el estado existente antes de diseñar contratos técnicos. |
| Backend | El resultado funcional requiere fuentes para Search, Attention, Activity y Trash. 11A.1 debe determinar si se reutilizan capacidades existentes o si hace falta una nueva superficie backend. |
| Datos | El comportamiento recuperable de Drafts existente debe auditarse para retiro compatible. Inventory Trash y Inventory Archive quedan diferidos hasta polish/contract de Inventory. |
| API | Este P4 no define datos de intercambio, esquemas ni serialización. 11A.1 debe identificar los contratos necesarios. |
| Permisos | Coordinator-only aplica para `Eliminar definitivamente` y `Vaciar Papelera`; mover a Trash y restaurar siguen permisos de entidad. La privacidad se filtra antes de cualquier exposición. |
| Offline / Reliability | Permanent delete y Empty Trash no corren offline. Las demás operaciones mantienen las reglas de confiabilidad vigentes hasta auditoría técnica. |
| Search | Scope inicial reducido a Tasks, Events y Plans activos; `Archivados` y `Papelera` son contextos explícitos. |
| Attention / Activity | Attention es accionable y persistente hasta resolución; Activity es cronológica, sin unread ni badge. |
| QA | Se requiere matriz de aceptación para Search, Trash, Attention/Activity, Archive contextual, responsive y accesibilidad; este P4 no ejecuta pruebas de implementación. |

### Riesgos documentados

- Las rutas existentes de Draft restore pueden quedar incompatibles con
  `Descartar borrador` si 11A.1 no las audita.
- Permanent delete y Empty Trash son irreversibles; requieren capability,
  confirmación y tratamiento de falla parcial.
- Search con contextos ocultos puede filtrar contenido si privacidad y permisos
  no se aplican antes de ranking/resultados.
- Activity puede volverse ruidosa o invasiva si incluye eventos técnicos,
  navegación o lectura pasiva.
- Inventory no debe entrar prematuramente en Search, Attention, Activity, Trash
  o Archive antes de su polish/contract.

---

## 4. Aprobación humana P3

Las 12 decisiones P3, GS-01 a GS-12, están aprobadas y congeladas desde el
2026-08-02.

Ninguna decisión puede reabrirse sin un nuevo Change Request. Este documento no
inicia 11A.1 y no autoriza implementación.

---

## 5. Arquitectura de producto congelada

La arquitectura congelada es `Global Equilibrada`.

```text
Bottom Navigation
  Home
  People
  Add (Quick Actions + Search)
  Planner
  More

AppTopBar
  Household switch + role
  Attention icon (badge sólo para Attention sin resolver)

Add surface
  Buscar en HomePlus...
  Acciones rápidas
    Crear tarea
    Crear evento
    Crear plan
    Geni (futuro, sólo cuando esté implementado)

Attention / Activity
  Tab: Atención
  Tab: Actividad

More
  Papelera
```

Global Surfaces proyecta entidades existentes. No crea entidades duplicadas, no
redefine los Details de Planner y no reemplaza los flujos canónicos de cada
módulo.

---

## 6. Home

Home orienta, prioriza y da continuidad.

Home contiene:

- contexto activo del household;
- extracto condicional de Attention, sólo cuando existen ítems reales sin resolver;
- Today / Next;
- continuidad de Planner cuando aporta valor;
- la excepción actual de Inventory;
- estados offline, stale y de error parcial.

Home no contiene:

- Search persistente;
- gateways redundantes a módulos;
- grilla de módulos;
- Activity;
- Trash;
- Archive;
- métricas decorativas;
- listas completas de Planner;
- listas completas de Inventory;
- formularios completos.

Las filas en Home abren destinos canónicos. Las acciones inline mínimas sólo
pueden incorporarse cuando una auditoría técnica posterior pruebe su seguridad;
este P4 no define esa mecánica.

---

## 7. Quick Actions y Search

### Quick Actions

El botón central `+` abre una única superficie compartida con Search y Quick
Actions.

Quick Actions iniciales:

- `Crear tarea`;
- `Crear evento`;
- `Crear plan`.

Quedan excluidos de la grilla inicial de Quick Actions:

- Templates;
- Drafts;
- Inventory;
- acciones de lifecycle;
- Trash;
- Archive;
- Search como tile;
- acciones sobre entidades existentes.

Geni será una cuarta Quick Action futura sólo cuando esté implementado. No debe
existir un placeholder deshabilitado de Geni antes de eso.

### Search

Search vive como barra superior dentro de la superficie Quick Actions + Search.
Al activarse, abre Search full-screen.

Alcance normal inicial:

- Tasks activos;
- Events activos;
- Plans activos.

Quedan excluidos del Search normal:

- Inventory Items;
- Drafts;
- Presets;
- People;
- Settings;
- rutas;
- comandos;
- acciones;
- elementos archivados;
- Trash.

Contextos explícitos de Search:

- `Activos`;
- `Archivados`;
- `Papelera`.

Los contextos ocultos nunca se mezclan silenciosamente con resultados activos.
Search abre destinos canónicos y no implementa un Detail duplicado.

---

## 8. Attention y Activity

### Acceso

El icono de Attention en AppTopBar abre una única superficie full-screen:
`Atención y actividad`.

El badge del icono cuenta sólo Attention sin resolver para la persona y el
household actuales. Activity nunca tiene badge.

### Attention

Attention contiene asuntos que requieren intervención o decisión humana.

Reglas:

- leer no resuelve;
- ver no resuelve;
- los ítems persisten hasta una resolución válida;
- cada ítem puede exponer una acción primaria más `Abrir`;
- los procesos complejos abren Detail o un flujo canónico;
- Inventory queda excluido inicialmente de Attention global.

Orden:

1. importancia o impacto;
2. necesidad de decisión directa;
3. proximidad temporal;
4. recencia entre prioridades equivalentes.

### Activity

Activity es una línea de tiempo cronológica simple.

Reglas:

- se agrupa por día, entidad y proceso cuando aplica;
- no tiene estado unread;
- no tiene punto de novedad;
- no tiene `Marcar todo como leído`;
- no tiene badge;
- no contiene mutaciones inline;
- tap abre destino canónico;
- no registra navegación, visitas de pantalla, búsquedas, teclas, sincronización rutinaria ni logs técnicos;
- Inventory queda excluido inicialmente de Activity global.

---

## 9. Representación de procesos Geni

Geni no está implementado en este freeze y no aparece en el producto hasta que
se implemente.

Comportamiento futuro congelado:

- Geni aparece como cuarta Quick Action sólo cuando esté implementado;
- una propuesta Geni pendiente aparece en Attention;
- Geni siempre se identifica;
- la persona confirma o rechaza la propuesta;
- un proceso confirmado y ejecutado aparece en Activity como una fila agrupada;
- `Ver proceso` muestra autor y orden de cada paso;
- una operación Geni no debe crear tres filas independientes de Activity;
- una ejecución fallida o incierta nunca aparece como éxito;
- Geni no reemplaza Search;
- los permisos se heredan de la operación canónica propuesta o ejecutada.

---

## 10. Trash

Existe una única superficie global Trash bajo `More > Papelera`.

Las entradas locales permitidas pueden abrir la misma superficie Trash
prefiltrada por módulo o tipo de entidad.

Entidades recuperables:

- Tasks;
- Events;
- Plans;
- Presets;
- Inventory Items sólo cuando el contrato completo de restore y visualización de
  Inventory esté implementado.

Drafts no entra en Trash.

Retención:

- 30 días;
- fecha exacta de purga visible;
- tiempo restante visible en lenguaje humano.

Restore:

- requiere permiso vigente sobre la entidad;
- devuelve la entidad al estado o contexto correspondiente;
- si hay dependencias rotas, abre revisión o informa el bloqueo;
- no promete éxito antes de la confirmación canónica.

Mover a Trash:

- se permite según permisos de la entidad;
- no se restringe al coordinador salvo que el modelo de permisos de la entidad lo exija.

---

## 11. Descarte de Drafts

Un Draft es trabajo de creación no confirmado, no una entidad productiva
confirmada.

Drafts queda:

- fuera de Home;
- fuera de Search;
- fuera de Quick Actions;
- fuera de Attention;
- fuera de Activity;
- fuera de Trash;
- fuera de Archive;
- privado para su creador mientras exista.

La única operación de descarte es:

```text
Descartar borrador -> eliminación inmediata y definitiva
```

Drafts no tiene permanent delete desde Trash porque nunca entra en Trash. El
comportamiento existente de Draft recuperable debe auditarse después y retirarse
de forma compatible donde corresponda.

---

## 12. Archive

Archive es contextual por módulo. No existe una pantalla global única de Archive
en Planner V1.

Entidades archivables:

- Tasks;
- Events;
- Plans;
- Presets;
- Inventory Items.

Archive es un estado de visibilidad y preservación. No equivale a Completed,
Closed, Cancelled ni Trash.

Archive:

- no cambia el estado operativo;
- no tiene retención automática;
- no permite permanent delete directo;
- permite desarchivar según permisos;
- permite mover a Trash según permisos.

Inventory Archive está aprobado funcionalmente, pero queda técnicamente diferido
hasta completar el polish y el contrato canónico de Inventory.

---

## 13. Permanent delete y Empty Trash

### Permanent delete

`Eliminar definitivamente`:

- existe sólo dentro de Trash;
- está disponible sólo para el coordinador;
- requiere confirmación explícita;
- muestra tipo de entidad y consecuencias;
- comunica que no puede deshacerse;
- no corre offline;
- no se presenta como éxito antes de la confirmación canónica.

### Empty Trash

`Vaciar Papelera`:

- existe sólo dentro de Trash;
- está disponible sólo para el coordinador;
- es la única operación masiva inicial;
- muestra cantidad, tipos de entidad y consecuencias;
- requiere confirmación explícita;
- no corre offline;
- tolera falla parcial;
- deja los ítems fallidos visibles y diferenciados de los éxitos.

### Acciones regulares de Trash

- Mover a Trash sigue permisos de entidad.
- Restore sigue permisos de entidad.
- No hay multiselect, multi-restore, multi-archive ni multi-delete de ítems seleccionados en el alcance inicial.

---

## 14. Contextos de Search para contenido oculto

Search por defecto muestra sólo contenido activo dentro de alcance.

Los contextos ocultos son explícitos:

- `Archivados`;
- `Papelera`.

Resultados archivados:

- muestran `Archivado`;
- abren el contexto Archive;
- pueden ofrecer `Desarchivar` cuando aplique.

Resultados en Trash:

- muestran `En Papelera`;
- muestran tiempo de retención;
- abren contexto de recuperación;
- pueden ofrecer `Restaurar`;
- pueden ofrecer `Eliminar definitivamente` sólo al coordinador.

---

## 15. Privacidad y roles

Permisos y privacidad se aplican antes de cualquier surface, ranking, grouping,
badge, recent item, resultado, Attention item, Activity item, Trash item o
Archive item.

Filtros obligatorios:

- persona actual;
- household activo;
- scope personal o household;
- ownership;
- role;
- permisos de entidad.

Reglas:

- el contenido personal nunca filtra hacia el feed household;
- el cambio de household resetea el contexto global;
- Geni siempre se identifica;
- Activity coordina, no vigila;
- no se revela título, conteo ni existencia de contenido privado de otra persona;
- el coordinador no obtiene automáticamente acceso a contenido personal privado
  salvo regla explícita de entidad.

---

## 16. Entity / Surface Matrix

| Entity | Home | Search active | Search archived | Search Trash | Quick Actions | Attention | Activity | Trash | Archive | permanent delete | permissions | canonical destination | initial implementation status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Task | Extracto Today / Next cuando sea relevante | Sí, scope activo | Sí, contexto archivado explícito | Sí, contexto Trash explícito | Crear tarea | Sí, verificación, corrección, vencimiento accionable o conflicto | Sí, lifecycle, asignación y completions significativos | Sí | Sí, contextual | Coordinador únicamente, desde Papelera | Permiso de entidad para mover/restore; coordinador para permanent delete y Empty Trash | Task Detail | Existing canonical Detail; global projection pending |
| Event | Today / Next cuando sea relevante | Sí, scope activo | Sí, contexto archivado explícito | Sí, contexto Trash explícito | Crear evento | Sí, RSVP, conflicto o cambio horario significativo | Sí, create/edit/cancel/attendance significativos | Sí, con recurrencia considerada | Sí, contextual | Coordinador únicamente, desde Papelera | Participación, scope y permisos de entidad; coordinador para permanent delete y Empty Trash | Event Detail | Existing canonical Detail; global projection pending |
| Plan | Continuidad y bloqueos cuando aporten valor | Sí, scope activo | Sí, contexto archivado explícito | Sí, contexto Trash explícito | Crear plan | Sí, bloqueo, revisión o estado incierto que requiera decisión | Sí, lifecycle y estructura significativos | Sí | Sí, contextual | Coordinador únicamente, desde Papelera | Owner, rol household y permisos de entidad; coordinador para permanent delete y Empty Trash | Plan Detail | Existing canonical Detail; global projection pending |
| Preset | No | No, excluido de Search normal | Sin participación inicial en Search archived | Sí, contexto Trash explícito cuando sea recuperable | No | No | No global Activity inicial | Sí | Sí, Archive contextual de librería | Coordinador únicamente, desde Papelera | Template manager o permiso de entidad para archive/move/restore; coordinador para permanent delete y Empty Trash | Preset Library / Preset Detail | Existing partial support; audit required |
| Draft | Never | Never | Never | Never | Never | Never | Never | Never | Never | No aplica; Draft nunca entra en Trash | Owner-only durante su existencia | Recuperación/edición privada existente mientras no se descarte; al descartar, eliminación inmediata definitiva | Existing behavior must be retired compatibly |
| Inventory Item | Excepción actual de Home permitida | No, excluido inicialmente | No, excluido inicialmente | No, excluido inicialmente hasta existir contrato de Inventory Trash | No | No, excluido inicialmente | No, excluido inicialmente | Aprobado funcionalmente; técnicamente diferido | Aprobado funcionalmente; técnicamente diferido | Coordinador únicamente, desde Papelera sólo después de implementar participación en Inventory Trash | Permisos household/de entidad y guards de sensitive labels; coordinador para permanent delete y Empty Trash después de existir Trash participation | Destino de Inventory Item después de polish/contract de Inventory | Deferred until Inventory polish/contract |
| Geni future process | No hasta estar implementado | No; no reemplaza Search | No | No | Futura cuarta acción sólo cuando esté implementado | Futura propuesta pendiente que requiere confirmación | Futuro proceso confirmado y ejecutado como una fila agrupada | No es entidad directa de Trash en este freeze | No es entidad directa de Archive en este freeze | Hereda la operación canónica; sin regla independiente de permanent delete en este freeze | Hereda permisos de la operación canónica | Flujo de operación canónica o process detail cuando se implemente | Future - not implemented |

---

## 17. Phone / Tablet

Phone:

- Home en una columna.
- Quick Actions como bottom sheet accesible.
- Search full-screen.
- Attention / Activity full-screen con tabs.
- Trash full-screen.
- Archive contextual full-screen cuando aplique.
- Labels visibles.

Tablet:

- Home puede usar dos columnas sin cambiar prioridad.
- Search puede usar overlay o split view.
- Attention / Activity puede usar lista más detalle.
- Trash puede usar filtros, lista y contexto de recuperación.
- Mismas capacidades visibles que phone.

---

## 18. Accesibilidad

- Android: target mínimo de 48 dp.
- iOS: target mínimo de 44 pt.
- Dynamic Type y reflow sin clipping.
- Screen readers anuncian conteos, fechas y consecuencias.
- Foco visible y orden lógico.
- Ningún significado depende sólo de color.
- Reduce Motion respeta la preferencia del sistema.
- Confirmaciones destructivas con contexto accesible.
- Estados offline y stale anunciados.
- Fechas de purga en lenguaje humano.

---

## 19. Empty/loading/error/offline states

- Empty states usan lenguaje de producto claro y dirigen al módulo o punto
  canónico de creación/acceso cuando corresponda.
- Loading states evitan códigos técnicos e identificadores crudos.
- Offline y stale mantienen datos válidos visibles cuando sea posible y usan un
  único banner de superficie.
- Partial error aísla la fuente fallida y mantiene visibles las secciones sanas.
- Fatal error ofrece salida segura o retry.
- Ningún estado expone stack traces, entity IDs ni jerga backend.

---

## 20. Superseded rules

El siguiente ledger es el registro P4 autoritativo de supersession para Global
Surfaces. Cada marcador está completo y apunta al Change Request aprobado.

| Previous rule | New frozen rule | Updated authority section | Superseded marker | Remaining technical gap |
|---|---|---|---|---|
| Global Search incluía Drafts, Presets, People, Settings, acciones y rutas. | Search normal inicial incluye sólo Tasks, Events y Plans activos; los contextos ocultos son explícitos. | Functional Freeze 1.3.4; Registry GS-04; UX/UI GS-V2 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe definir fuente de Search, filtrado de seguridad y contrato de rutas. |
| Quick Actions se describía sólo como tiles de creación. | La acción central abre una superficie Quick Actions + Search, con Search arriba y acciones de creación debajo. | Functional Freeze 1.3.3; Registry GS-03; UX/UI GS-V1 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe auditar el host actual de sheet y la transición hacia Search. |
| Drafts entraban en Trash y eran recuperables durante 30 días. | Drafts nunca entra en Trash; `Descartar borrador` elimina de inmediato y de forma definitiva. | Functional Freeze 1.3.8; Registry GS-08; UX/UI GS-V6 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe identificar y retirar compatiblemente los paths de Draft restore. |
| Planner V1 prohibía eliminación permanente manual inmediata. | `Eliminar definitivamente` y `Vaciar Papelera` existen sólo dentro de Trash y sólo para coordinador. | Functional Freeze 1.3.10; Registry GS-10; UX/UI GS-V7 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe verificar capability de coordinador, confirmación y manejo irreversible. |
| Archive estaba concentrado principalmente en Plans. | Archive es contextual para Tasks, Events, Plans, Presets e Inventory Items; Inventory queda diferido. | Functional Freeze 1.3.9; Registry GS-09; UX/UI GS-V5 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe auditar estado Archive por entidad y entry points de módulo. |
| Trash era local de Planner o fragmentado entre Planner y Preset/Draft Trash. | Existe un único Trash global bajo `More > Papelera`, con filtros por módulo/entidad y entradas locales prefiltradas. | Functional Freeze 1.3.7; Registry GS-07; UX/UI GS-V4 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe determinar si reutiliza fuentes existentes o requiere una nueva superficie backend. |
| Home podía operar como grilla de gateways, con Search permanente, Activity o exposición amplia de Inventory. | Home es híbrida: contexto, extracto de Attention, Today / Next, continuidad Planner, excepción actual de Inventory y estados. Sin grilla de módulos ni Search permanente. | Functional Freeze 1.3.2; Registry GS-02 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe auditar proyecciones actuales de Home y retirar patrones incompatibles de forma compatible. |
| Attention global no era una superficie compartida Attention / Activity con tabs. | Una superficie `Atención y actividad` tiene tabs Attention y Activity; sólo Attention tiene badge por ítems sin resolver. | Functional Freeze 1.3.5; Registry GS-05; UX/UI GS-V3 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe determinar fuente de Attention, contrato de conteo y filtros de privacidad. |
| Activity podía heredar semántica de unread o feed. | Activity es cronológica, sin badge, sin unread y sin mutaciones inline; excluye ruido técnico. | Functional Freeze 1.3.5; Registry GS-05; UX/UI GS-V3 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | 11A.1 debe definir producción, grouping y límites de privacidad de Activity. |
| Inventory quedaba insinuado como participante global de primer nivel. | Inventory conserva su excepción actual de Home, queda excluido inicialmente de Search, Attention y Activity, y espera polish/contract antes de Trash y Archive. | Functional Freeze 1.3.1, 1.3.4, 1.3.5, 1.3.7, 1.3.9; Registry GS-01, GS-04, GS-05, GS-07, GS-09 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | Inventory polish y contrato de restore/archive siguen siendo prerrequisitos. |
| Geni estaba ausente de Global Surfaces. | Geni permanece oculto hasta implementarse; propuestas futuras aparecen en Attention y ejecuciones confirmadas aparecen como filas agrupadas de Activity. | Functional Freeze 1.3.3, 1.3.6; Registry GS-06; UX/UI GS-V1, GS-V3, GS-V11 | SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001 | Implementación de Geni y contrato de correlación de proceso quedan diferidos a trabajo aprobado posterior. |

---

## 21. Technical audit questions

Estas preguntas pertenecen a 11A.1. Este P4 no las resuelve y no congela una
solución técnica.

1. Search: determinar cómo se consultan, agrupan, filtran por permisos y enrutan
   Tasks, Events y Plans activos.
2. Contextos ocultos de Search: determinar cómo representar `Activos`,
   `Archivados` y `Papelera` sin mezclar resultados.
3. Attention: determinar la fuente y el contrato técnico, incluyendo si reutiliza
   capacidades existentes o requiere una nueva superficie backend.
4. Activity: determinar producción, grouping, retención, filtros de privacidad y
   exclusión de ruido técnico.
5. Global Trash: determinar el modelo de fuente para Tasks, Events, Plans,
   Presets y futuros Inventory Items.
6. Restore: definir manejo de estado previo y blockers de dependencias por entidad.
7. Capability destructiva de coordinador: verificar autorización para
   `Eliminar definitivamente` y `Vaciar Papelera`.
8. Empty Trash: definir manejo de falla parcial y semántica de confirmación.
9. Draft discard: auditar paths actuales de Draft restore persistente y planear
   retiro compatible.
10. Archive: auditar estado Archive por entidad, entry points de módulo y
    comportamiento de unarchive.
11. Inventory: esperar polish y contrato canónico de restore/archive antes de
    implementar participación en Trash o Archive.
12. Geni: diferir correlación de proceso, confirmación de propuesta y grouping
    de Activity hasta un milestone Geni aprobado.
13. Offline/degraded: confirmar qué acciones encolan, cuáles se bloquean offline
    y cómo se reporta incertidumbre.
14. Privacy/RLS: verificar filtros antes de ranking, badges, recents, resultados,
    Attention, Activity, Trash y Archive.
15. Retención: definir mecanismo de purga de 30 días y tiempo restante en
    lenguaje humano sin exponer detalles técnicos.

---

## 22. Implementation exclusions

Este P4 y esta corrección R1 excluyen:

- cambios de código;
- implementación UI;
- implementación de navegación;
- definiciones backend;
- contratos API;
- cambios de esquema de base de datos;
- migraciones de datos;
- cambios de paquetes o lockfiles;
- trabajo en Supabase;
- polish visual final, colores o styling 11C;
- participación de Inventory en Search, Attention o Activity globales;
- implementación de Inventory Trash o Archive antes de Inventory polish/contract;
- inicio automático de 11A.1.

El resultado de producto está congelado. La arquitectura técnica no está
congelada.

---

## 23. Traceability

- P0: baseline de realidades verificadas.
- P1A-P1D: investigación comparativa.
- P2: síntesis integrada y recomendación.
- P3: voto humano y aprobación.
- P4: registro de Product Freeze y actualización de autoridades.
- R1: corrección documental de este registro P4.

Documentos autoritativos:

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` versión 1.3;
- `PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md`;
- `PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md`;
- este registro P4 de Product Freeze.

File count original de P4:

```text
4 files total: 3 modified authorities + 1 new P4 document
```

Archivos cambiados por R1:

```text
1 file changed: docs/implementation/planner/M11_11A_P4_GLOBAL_SURFACES_PRODUCT_FREEZE.md
```

---

## 24. Validation notes

La inspección R1 confirmó:

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` está en versión 1.3;
- original freeze date: 2026-07-22;
- latest approved revision: 2026-08-02;
- `CR-M11-11A-GLOBAL-SURFACES-001` está presente;
- las reglas nuevas de Global Surfaces son autosuficientes en sección 1.3;
- las reglas históricas incompatibles están marcadas como superseded;
- no se encontró contradicción activa en las tres autoridades sobre Search,
  Drafts, Trash, Archive, permanent delete, Home, Attention o Activity;
- `PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md` contiene GS-01 a GS-12 con
  `APPROVED_AND_FROZEN`;
- no queda estado `HUMAN_APPROVAL_REQUIRED` para GS-01 a GS-12;
- `PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md` contiene GS-V1 a GS-V11;
- el UX/UI contract congela estructura, comportamiento y estados, no colores
  finales ni polish visual.

Correcciones editoriales R1 en este P4:

- frases incompletas y corruptas corregidas;
- encabezados Markdown y numeración normalizados;
- `Entity / Surface Matrix` reconstruida;
- fila `Geni future process` agregada;
- fila incompleta de solicitud de reposición retirada;
- ledger de supersession reconstruido con columnas y marcadores completos;
- afirmaciones de solución técnica reclasificadas como preguntas o gaps de auditoría;
- lenguaje de file count corregido.

Validación requerida antes del commit:

```text
git diff --check
git diff --stat
git status --short
```

Validación requerida después del commit:

```text
git diff --check HEAD~1 HEAD
git show --stat --oneline --summary HEAD
git status --short
```

---

## 25. Freeze signature

```text
PLANNER V1 - GLOBAL SURFACES PRODUCT FREEZE

STATUS: FROZEN
HUMAN APPROVAL: APPROVED
APPROVAL DATE: 2026-08-02
CHANGE REQUEST: CR-M11-11A-GLOBAL-SURFACES-001
MILESTONE: 11A.P4
CANONICAL AUTHORITY: PLANNER_V1_M11_FUNCTIONAL_FREEZE.md version 1.3
IMPLEMENTATION: NOT YET AUTHORIZED
NEXT GATE: 11A.1 Technical Architecture / Contract Readiness Audit
R1 STATUS: DOCUMENTARY CORRECTION COMPLETE
```
