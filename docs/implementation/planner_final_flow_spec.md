# Planner Final Flow Spec - HomePlus

Estado: fuente final de verdad para las proximas implementaciones de Planner.
Alcance: producto, UX, flujo, contrato frontend observado y decisiones correctivas. No implementa codigo.

## 1. Proposito final de Planner

Planner es la agenda familiar accionable de HomePlus. Debe responder con claridad:

- que hay que hacer;
- cuando hay que hacerlo;
- de que tipo es;
- quien lo hace;
- que esta vencido;
- que esta en revision;
- que evento viene.

Planner no es un dashboard decorativo, no es un clon de productividad laboral y no es Home. Es el lugar donde el hogar administra tareas, eventos y calendario con baja friccion, lenguaje claro y autoridad de datos delegada al backend.

## 2. Jerarquia entre Home, Planner y Quick Actions

Home resume. Muestra extractos utiles de Planner: tareas pendientes, tareas de hoy, vencidas, en revision y proximos eventos. Home puede navegar a Planner, pero no debe convertirse en editor ni administrador de Planner.

Planner administra. Crea, edita, completa, verifica, cancela y organiza tareas/eventos. Si Quick Actions global falla o queda vacio, Planner debe seguir permitiendo crear tarea/evento desde sus propias pantallas.

Quick Actions global dispara acciones universales. Su rol es iniciar acciones transversales del producto, no alojar presets especificos de un modulo. Para Planner solo debe incluir acciones universales como Crear tarea y Crear evento.

## 3. Fuentes revisadas

### Documentacion historica

- `docsGeneral/Entrega/Planner/planner_final.md`
- `docsGeneral/Basura/Contrato DB-API Planner MVP.md`
- `docsGeneral/Basura/planner_frontend_ideal_spec_actualizado.md`
- `docsGeneral/Basura/ALL_FRAGMENTS_FROM_PLANNER_TO_MERGE.md` mediante busqueda global
- `docsGeneral/Entrega/Planner/planner_fragment_*` mediante fuentes consolidadas y busqueda global
- `docsGeneral/HomePlus - SECCION 1 PRODUCTO.md`
- `docsGeneral/HomePlus - SECCION 2 PRINCIPIOS DEL PRODUCTO.md`
- `docsGeneral/HomePlus - SECCION 5 RELATIONSHIP PHILOSOPHY.md`
- `docsGeneral/HomePlus - SECCION 6 UX PHILOSOPHY.md`
- `docsGeneral/HomePlus - SECCION 7 AI PHILOSOPHY - GENI.md`
- `docsGeneral/HomePlus - SECCION 8 DATA PHILOSOPHY.md`
- `docsGeneral/HomePlus - Desing system v1.md`

### Documentacion reciente

- `docs/implementation/homeplus_planner_design_spec.md`
- `docs/planner_final.md`
- `docs/professionalization/uix_006_planner_premium_audit.md`
- `docs/implementation/planner_final_flow_spec.md` no existia al inicio de esta etapa.

### Codigo actual

- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`
- `front/mi-front-limpio/screens/planner/TaskForm.tsx`
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx`
- `front/mi-front-limpio/screens/planner/EventForm.tsx`
- `front/mi-front-limpio/screens/planner/plannerShared.ts`
- `front/mi-front-limpio/services/plannerTasks.ts`
- `front/mi-front-limpio/services/plannerEvents.ts`
- `front/mi-front-limpio/services/plannerCalendar.ts`
- `front/mi-front-limpio/services/plannerSummary.ts`
- `front/mi-front-limpio/services/plannerTemplates.ts`
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`
- `front/mi-front-limpio/components/ui/QuickActionSheet.tsx`
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx`
- Busqueda global de logs, warnings, `SafeAreaView`, `AddTab`, `markPlannerChanged`, `refreshKey`, `due_date`, `template_key`, `category`, `assigned_to_member_id`, `requires_verification` y `verify`.

### Runtime reportado

- Consola llena de logs/warnings.
- Quick Actions quedo vacio.
- Warning por `SafeAreaView` deprecated.
- Warning de inline component prop en `AddTab`.
- Logs debug de `AuthContext`, `FamilyScreen` y `TaskForm`.
- `TaskForm` permitio o intento permitir tarea sin fecha.
- Requests duplicadas despues de crear tarea.
- Calendar Month se ve mal: spacing inconsistente, superposiciones y mala proporcion.
- Quick Actions no debe tener presets de Planner porque en el futuro habra muchos modulos.

## 4. Decisiones finales

| Tema | Decision final | Fuente / motivo |
|---|---|---|
| Rol de Planner | Planner es agenda familiar accionable. | Decision nueva + docs recientes. |
| Home | Home resume y navega; no administra Planner. | Docs historicos y codigo `HomePlannerSections.tsx`. |
| Quick Actions global | Solo acciones universales; no presets especificos de Planner. | Decision nueva + runtime reportado. |
| Independencia de Planner | Planner debe crear tarea/evento aunque Quick Actions falle. | Runtime reportado. |
| Fecha en task nueva | Toda tarea nueva requiere fecha. | Decision nueva corrige docs viejos y `TaskForm` actual. |
| Tipo en task nueva | Toda tarea nueva requiere Tipo. | Decision nueva; UI no debe mostrar `responsibility_id`. |
| Tipo default | Default: General. | Decision nueva para baja friccion. |
| Fecha default | Depende del contexto de entrada. | Decision nueva. |
| Sin fecha | No existe "Sin fecha" para tareas nuevas. | Decision nueva corrige codigo actual. |
| Presets | Viven dentro de Planner, en `TaskForm`, como tareas rapidas concretas. | Decision nueva. |
| Preset vs Tipo | Tipo es area; preset es tarea concreta. | Decision nueva. |
| Task card | No checkbox visible; gestos + menu rapido. | Decision nueva corrige docs/codigo actuales. |
| Swipe derecha | Completar tarea. | Decision nueva. |
| Swipe izquierda | Cancelar con confirmacion. | Decision nueva. |
| Tap largo | Menu rapido de acciones. | Decision nueva. |
| Tap corto | No dispara accion peligrosa. | Decision nueva de seguridad UX. |
| Filtros visibles | Minimos: Hoy, Pendientes, Mias, Atencion. | Decision nueva para reducir ruido. |
| Filtro por tipo | Secundario. | Decision nueva. |
| Calendar Month | Panorama compacto con dots y agenda inferior. | Decision nueva + runtime reportado. |
| Calendar Week | Vista intermedia de proximos dias. | Decision nueva. |
| Calendar Day | Vista mas accionable. | Decision nueva. |
| Permisos | Frontend puede ocultar/deshabilitar; backend es autoridad final. | Decision nueva + arquitectura actual. |

## 5. Decisiones descartadas o reemplazadas

| Decision vieja | Por que queda vieja | Decision nueva |
|---|---|---|
| Fecha opcional en tareas. | El usuario observo intento de tarea sin fecha y Planner necesita agenda accionable. | Fecha obligatoria para toda tarea nueva. |
| Chip "Sin fecha" en creacion. | Contradice agenda accionable y genera tareas flotantes. | No se ofrece para nuevas tareas; legacy se exige al editar. |
| Checkbox visible en task cards. | La direccion final pide interaccion por gestos y menos ruido visual. | Swipe derecha completa; menu ofrece alternativa accesible. |
| Presets en Quick Actions global. | Quick Actions debe escalar a muchos modulos. | Presets hardcodeados viven en `TaskForm`. |
| Templates CRUD como parte del flujo actual. | Es POST-MVP y no debe mezclarse con presets hardcodeados. | Presets constantes de UI, sin CRUD. |
| Filtros extensos visibles por defecto. | La pantalla actual tiene demasiados chips y aumenta carga mental. | Filtros minimos + Tipo secundario. |
| Month con cards grandes en grid. | El runtime reporto mala proporcion y superposiciones. | Grid compacto con indicadores y agenda inferior. |
| Home como creador/editor de Planner. | Duplica responsabilidades. | Home resume; Planner administra. |
| Permisos aislados dentro de Planner. | Family/Edit Member debe ser fuente futura de configuracion. | Planner consume roles/capabilities; backend decide. |

## 6. Modelo final de Task

### Campos requeridos para nueva tarea

- `title`: requerido.
- `due_date`: requerido. Siempre se guarda una fecha para tareas nuevas.
- `type` / Tipo: requerido en UI. Inicialmente se mapea al contrato actual mediante `template_key` y/o `category`, sin exponer nombres tecnicos.
- `status`: default `pending`.
- `priority`: default `medium` / UI "Normal".
- `requires_verification`: default `false`.

### Campos opcionales

- `description`.
- `due_time`.
- `assigned_to_member_id`.
- `category` solo como soporte tecnico/legacy o para `Otro`; en UI debe presentarse como Tipo.
- `template_key` solo como metadata tecnica si el backend actual lo soporta.

### Defaults

- Fecha desde Tasks: Hoy.
- Fecha desde Calendar Day/Week/Month: dia seleccionado.
- Fecha desde Quick Actions global: Hoy.
- Fecha desde preset dentro de `TaskForm`: conserva la fecha actual del form.
- Editar tarea: conserva fecha existente.
- Tipo default: General.
- Prioridad default: Normal.
- Responsable default: sin asignar o usuario actual segun decision de implementacion posterior; no debe bloquear el spec.

### Estado y verificacion

Estados de UI actuales/finales:

- `pending`: pendiente.
- `completed`: completada.
- `awaiting_verification`: en revision.
- `verified`: verificada.
- `cancelled`: cancelada.

Vencida no es status persistido; se calcula con `due_date < today` y estado accionable. Si backend modela verificacion con campos, UI puede derivar `awaiting_verification` y `verified`; si backend ya devuelve esos status, UI los consume.

## 7. Modelo final de Event

### Campos requeridos

- `title`.
- `starts_at` o fecha + hora transformada a `starts_at`.
- `all_day`.
- `status`: default `scheduled`.

### Campos opcionales

- `description`.
- `ends_at`.
- `location_name`.
- `recurrence` simple si ya existe: `none`, `daily`, `weekly`, `monthly`.

### Defaults

- Fecha desde Calendar: dia seleccionado.
- Fecha desde Quick Actions global: Hoy.
- Hora default si no es all-day: 09:00 a 10:00, salvo decision posterior de picker.
- All-day default: `false`, salvo entrada contextual futura.
- Recurrence default: `none`.

### Validaciones

- Titulo requerido.
- Fecha valida.
- Si no es all-day, hora inicio y fin validas.
- `ends_at >= starts_at`.
- Cancelar evento requiere confirmacion.

## 8. Tipo / Responsabilidad

Tipo es el area operativa de una tarea. Es obligatorio porque permite ordenar agenda, filtros, Home summary futuro, permisos y posibles conexiones con otros modulos.

Tipos iniciales:

- General
- Limpieza
- Compras
- Mascotas
- Pagos
- Medicacion
- Estudios

En UI usar "Tipo". No mostrar `responsibility_id`, `template_key` ni `category` como lenguaje de usuario. En codigo actual existen `template_key` y `category`; el spec final no exige cambio de DB en esta etapa, solo define el lenguaje y el contrato UX.

Relacion futura:

- Compras puede conectarse con Inventory.
- Pagos puede conectarse con Finance.
- Medicacion puede conectarse con cuidado/salud/inventory.
- Estudios puede conectarse con calendario escolar.
- Mascotas puede conectarse con assets o cuidado futuro.

Estas conexiones son futuras; no implementarlas ahora.

## 9. Presets hardcodeados

Los presets hardcodeados son tareas rapidas concretas. No son Tipos, no son templates CRUD y no viven en Quick Actions global.

Ubicacion final: `TaskForm`, seccion superior "Tareas rapidas".

Presets iniciales:

| Tarea rapida | Tipo |
|---|---|
| Barrer la casa | Limpieza |
| Sacar la basura | Limpieza |
| Lavar los platos | Limpieza |
| Comprar comida | Compras |
| Comprar pan | Compras |
| Dar comida a mascota | Mascotas |
| Cambiar agua de mascota | Mascotas |
| Pagar servicios | Pagos |
| Tomar medicacion | Medicacion |
| Hacer tarea escolar | Estudios |

Flujo:

1. Usuario abre `TaskForm`.
2. El form ya tiene fecha contextual y Tipo default General.
3. Usuario toca una Tarea rapida.
4. El form prellena titulo y Tipo.
5. La fecha actual del form se conserva.
6. Usuario puede ajustar responsable, hora, prioridad o verificacion.
7. Guardar crea una tarea normal.

Empty state puede tener "Usar rapida", pero debe abrir la misma logica del `TaskForm`.

## 10. Task screen

### Header

- Titulo: Tareas.
- CTA principal: Nueva tarea.
- Resumen breve de pendientes/hoy/atencion si ya esta disponible.

### Filtros visibles

- Hoy.
- Pendientes.
- Mias.
- Atencion.

Atencion incluye vencidas, criticas y en revision.

### Filtro secundario por Tipo

Opciones:

- Todos
- General
- Limpieza
- Compras
- Mascotas
- Pagos
- Medicacion
- Estudios

### Lista

Orden recomendado:

1. Vencidas pendientes.
2. En revision.
3. Hoy.
4. Criticas/alta prioridad.
5. Futuras.
6. Completadas/canceladas solo si el filtro las pide.

### Task card

Debe mostrar titulo, fecha, hora si existe, Tipo, responsable, prioridad si no es normal, estado y verificacion si aplica. No mostrar checkbox visible.

### Empty/loading/error

- Loading: mantener contenido previo si existe; skeleton solo en carga inicial.
- Error: `ErrorState` con retry.
- Empty: copy calmo + CTA Crear tarea y acceso opcional a Tarea rapida.

### Que NO mostrar

- Checkbox visible.
- `responsibility_id`, `template_key` o `category` como texto tecnico.
- Presets como bloque permanente en header.
- Filtros largos por defecto.

## 11. Task card interactions

| Interaccion | Resultado |
|---|---|
| Swipe derecha | Completar tarea. Si requiere verificacion, pasa a en revision. |
| Swipe izquierda | Cancelar tarea con confirmacion. |
| Tap largo | Abre menu rapido. |
| Tap corto | Abre detalle/editar o seleccion segura; no completa ni cancela. |

Menu minimo:

- Editar
- Cambiar fecha
- Asignar
- Cambiar tipo
- Completar si corresponde
- Cancelar

Si hay que recortar para MVP:

- Editar
- Completar
- Cancelar

Feedback:

- Haptic liviano si esta disponible.
- Toast de exito.
- Estado saving por item.
- Revertir o refetch si falla.

Accesibilidad: las acciones por gesto no pueden ser la unica forma. El tap largo/menu debe permitir completar/cancelar cuando corresponda.

## 12. TaskForm final

### Campos visibles principales

- Tareas rapidas.
- Titulo.
- Fecha.
- Tipo.
- Responsable.
- Prioridad.
- Requiere revision.

### Campos colapsados

- Descripcion.
- Hora.
- Notas o metadata avanzada si existe.

### Defaults y contexto

- Crear desde Tasks: fecha Hoy, Tipo General.
- Crear desde Calendar: fecha seleccionada, Tipo General.
- Crear desde Quick Actions global: fecha Hoy, Tipo General.
- Preset: prellena titulo/Tipo y conserva fecha.
- Editar: conserva valores existentes.

### Validaciones

- Titulo requerido.
- Fecha requerida.
- Tipo requerido.
- Formato de fecha valido.
- Formato de hora valido si se ingresa.
- Boton disabled y estado saving durante submit.

### Legacy sin fecha/tipo

Las tareas legacy sin fecha pueden mostrarse. Al editarlas, el formulario debe exigir fecha antes de guardar. Si una tarea legacy no tiene Tipo, asignar General como default visible antes de guardar.

## 13. Calendar final

### Month

Proposito: panorama.

Debe tener:

- grid compacto;
- dia seleccionado claro;
- dots/indicadores pequenos de evento/tarea;
- agenda inferior del dia seleccionado;
- sin cards grandes dentro de celdas;
- spacing consistente;
- sin superposiciones.

Month no es la vista de accion principal. Tocar un dia cambia la agenda inferior y permite crear desde ese dia.

### Week

Proposito: vista intermedia de proximos dias.

Debe tener:

- tira de 7 dias;
- dia seleccionado;
- indicadores pequenos;
- agenda del dia seleccionado;
- navegacion anterior/hoy/siguiente por semana.

### Day

Proposito: accion.

Debe mostrar la agenda del dia con tareas y eventos ordenados. Es la vista mas adecuada para completar tareas, revisar vencimientos del dia y crear item contextual.

### Agenda item variants

- `compact`: agenda inferior de Month.
- `normal`: Day/Week.
- `dense`: Home futuro.

### Gestos y estados

Los items de tarea en Calendar deben respetar las mismas reglas de Task card. Eventos se editan con tap seguro y se cancelan con confirmacion. Empty/loading/error deben usar el mismo lenguaje que Planner.

### Creacion desde fecha seleccionada

Crear tarea o evento desde Calendar debe usar el dia seleccionado como fecha default.

## 14. EventForm final

Campos visibles:

- Titulo.
- Fecha.
- Todo el dia.
- Hora inicio y hora fin si no es all-day.
- Lugar.

Campos opcionales/colapsables:

- Descripcion.
- Repeticion simple si ya existe.
- Alcance de edicion para ocurrencias recurrentes si el backend ya lo soporta.

Defaults:

- Fecha contextual desde Calendar o Hoy.
- `all_day = false`.
- Hora inicio 09:00, fin 10:00.
- Recurrence `none`.

Validaciones:

- Titulo requerido.
- Fecha requerida.
- Hora requerida si no es all-day.
- Fin no anterior al inicio.
- No doble submit.

## 15. Quick Actions global

Acciones actuales recomendadas:

- Crear tarea.
- Crear evento.
- Invitar persona si el rol lo permite.

Acciones futuras universales posibles:

- Registrar gasto.
- Agregar producto.
- Subir documento.
- Crear recordatorio.

No debe contener:

- Barrer la casa.
- Sacar basura.
- Comprar pan.
- Ir a Planner.
- Ver agenda del dia.
- Presets de tareas de cualquier modulo.

Conexion con Planner:

- Quick Actions abre `TaskForm` o `EventForm` con defaults universales.
- Si falla o esta vacio, Planner mantiene sus propios CTAs.
- Quick Actions no debe ser requisito para completar flujos Planner.

## 16. Permisos Planner - Family/Edit Member

Permisos necesarios a documentar:

- Crear tareas.
- Crear tareas para otros.
- Asignar tareas.
- Completar tareas propias.
- Completar tareas de otros.
- Verificar tareas.
- Cancelar tareas.
- Crear eventos.
- Editar/cancelar eventos.

Planner no inventa permisos aislados. Debe consumir roles/capabilities cuando existan. Family/Edit Member debe ser el lugar futuro para configurar permisos de Planner.

Frontend:

- Puede ocultar/deshabilitar acciones si conoce permisos.
- Debe mostrar error claro si backend rechaza.

Backend:

- Es autoridad final.
- Valida active household, membership y permisos reales.
- No se modifica en esta etapa.

## 17. Home integration

Planner expone a Home:

- conteo de pendientes;
- tareas de hoy;
- vencidas;
- en revision;
- proximos eventos;
- arrays cortos para cards del Home;
- briefing deterministico o copy simple si existe.

Queda para despues:

- carga familiar real;
- Geni real;
- analisis de patrones;
- automatizaciones;
- acciones de edicion completas dentro de Home.

Home no administra porque eso duplicaria flujos, validaciones y permisos. Home debe llevar al usuario a Planner con el contexto correcto.

## 18. Refetch / performance

Problema actual detectado:

- `PlannerScreen` incrementa `refreshKey` al enfocar, al refrescar manualmente y al ejecutar `changed()`.
- `PlannerTasksScreen` recarga por `refreshKey` y por `plannerChangedAt`.
- `PlannerCalendarScreen` recarga por vista/fecha, `refreshKey` y `plannerChangedAt`.
- `HomePlannerSections` tambien escucha `plannerChangedAt`.
- Despues de crear/editar puede haber `markPlannerChanged`, navegacion con `refreshKey` y refetch local, generando requests duplicadas.

Estrategia futura:

- Centralizar invalidacion de Planner.
- Distinguir carga inicial, refresh silencioso y mutacion.
- Mantener datos previos durante refresh.
- Evitar `setLoading(true)` si ya hay datos.
- No mezclar optimistic update + refetch multiple sin dedupe.
- No resolver en esta etapa: solo queda documentado para Etapa 1/9.

## 19. Runtime hygiene

Problemas detectados:

- Logs de `AuthContext`.
- Logs de `FamilyScreen`.
- Logs de `TaskForm submit`.
- Logs de `EventForm submit`.
- Logs de `HouseholdSwitcherSheet`, `ProfileScreen` e invite sheet.
- Warning de `SafeAreaView` deprecated en imports desde `react-native`.
- Warning de inline component prop en `AddTab` por `component={() => null}`.
- Quick Actions quedo vacio en runtime observado.
- Consola llena dificulta detectar errores reales.

Por que es P0:

- La consola sucia oculta regresiones.
- Dificulta QA multi-dispositivo.
- Hace mas dificil validar permisos, duplicados y errores de backend.
- Afecta confianza antes de tocar flujos sensibles.

Debe limpiarse en la proxima etapa antes de cambiar comportamiento Planner.

## 20. Etapas de implementacion recomendadas

0. Spec final.
1. Runtime hygiene.
2. Quick Actions global minimo.
3. Contrato real de Task.
4. Fecha + tipo obligatorio.
5. Task card gestos sin checkbox.
6. Presets dentro de TaskForm.
7. Filtros minimos.
8. Calendar visual polish.
9. Refetch optimization.
10. Permisos auditados/documentados.
11. QA runtime final.

## 21. Que NO tocar

- Backend.
- DB.
- Auth logic.
- Household logic.
- Home polish general.
- Templates CRUD.
- Recurrencia avanzada.
- Notificaciones.
- Modulos futuros.
- Finance real.
- Inventory real.
- Assets real.
- Geni real.
- Goals reales.

## 22. QA final esperada

- [ ] Consola limpia de logs debug y warnings conocidos.
- [ ] Quick Actions muestra acciones universales y no presets.
- [ ] Planner puede crear tarea aunque Quick Actions no se use.
- [ ] Crear tarea desde Tasks default fecha Hoy.
- [ ] Crear tarea desde Calendar default dia seleccionado.
- [ ] Crear tarea desde Quick Actions default Hoy.
- [ ] No existe "Sin fecha" para nueva tarea.
- [ ] Tarea nueva no guarda sin fecha.
- [ ] Tarea nueva no guarda sin Tipo.
- [ ] Tipo default es General.
- [ ] Preset prellena titulo y Tipo, conservando fecha.
- [ ] Presets no aparecen en Quick Actions global.
- [ ] Task card no muestra checkbox visible.
- [ ] Swipe derecha completa.
- [ ] Swipe izquierda cancela con confirmacion.
- [ ] Tap largo abre menu rapido.
- [ ] Tap corto no dispara accion peligrosa.
- [ ] Filtros visibles minimos funcionan.
- [ ] Filtro Tipo queda secundario.
- [ ] Month no tiene cards grandes dentro del grid.
- [ ] Month no superpone elementos.
- [ ] Day muestra agenda accionable.
- [ ] Week muestra vista intermedia.
- [ ] Home muestra resumen y navega a Planner.
- [ ] No hay requests duplicadas evidentes despues de crear tarea.
- [ ] Backend sigue siendo autoridad final en permisos.
- [ ] No se tocaron backend, DB, Auth ni Household.
