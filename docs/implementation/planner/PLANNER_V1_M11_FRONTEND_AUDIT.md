# Planner V1 — M11-A Frontend Audit

**Estado:** `M11-A AUDIT STATUS: PASSED`<br>
**Alcance:** auditoría, evidencia y diagnóstico; sin cambios productivos.<br>
**Fecha:** 2026-07-18<br>
**Branch / commit:** `v1` / `f093bff`<br>
**Árbol al inicio:** limpio.

## 1. Método y límites

Se trianguló evidencia de tres clases, sin confundirlas:

| Clase | Qué demuestra | Qué no demuestra |
|---|---|---|
| `RUNTIME_REAL` | La UI efectivamente renderizada, secuencia de taps y feedback observable | Cobertura de roles/capabilities que el dataset no permite activar |
| `FRONTEND_REAL` | Estructura, variantes, estados y ownership implementados | Calidad visual por sí sola |
| `CONTRACT` | Comportamiento aprobado M1–M10 y errores/capabilities posibles | Que la superficie sea usable o visualmente correcta |
| `DESIRED_DESIGN` | Intención histórica de UX/UI | Implementación |
| `NEW_PROPOSAL` | Dirección M11 sujeta a D1–D10 | Autorización para implementar |

La aplicación se ejecutó. Las superficies alcanzables se recorrieron en Android y se cruzaron con el frontend real. Los estados peligrosos o no reproducibles con el único rol disponible —`forbidden`, `not_found`, `conflict`, capability denied y destructive recovery— se auditaron contra `PlannerStateView`, details, servicios, contracts y reportes M1–M10. Esto evita fabricar permisos o alterar datos estructurales.

## 2. Autoridades leídas

Se localizaron y revisaron las autoridades vigentes o históricas relacionadas: especificaciones Planner V0/V1, contratos y reportes M1–M10, `homeplus_planner_design_spec.md`, `planner_premium_screen_design_spec.md`, `planner_final_flow_spec.md`, Design System V2, UX Philosophy, Emotional Design, UI Motion Feedback System y su audit, Current Frontend Design System Audit, UIX-006, UIX-007, App Shell, Home Planner Summary, Core accessibility, telemetry privacy, capabilities y household lifecycle.

Hallazgos documentales importantes:

- UIX-006/UIX-007 siguen siendo valiosos como diagnóstico de densidad, formularios, Month y jerarquía, pero algunas observaciones históricas ya no describen V1: Goals y Quick Actions sí existen hoy.
- M1–M10 prueban navegación, shell, sheet host, quick create, tabs persistentes, transition, Home summary, one-tap y deep links; no prueban calidad visual.
- El Design System actual aporta tokens y tono cálido; no justifica repetir cards, pills o bordes.
- El contrato de telemetry prohíbe títulos, descripciones, nombres, direcciones, queries, tokens, errores raw y stacks.

## 3. Ambiente real auditado

| Campo | Valor |
|---|---|
| Plataforma | Android Emulator, Android 16 / API 36 |
| Dispositivo | `emulator-5554` |
| Resolución | 1080 × 2400 px |
| Densidad | 420 dpi |
| Font scale | 1.0; Quick Actions repetido en 1.3 |
| App | `com.anonymous.homeplus` |
| Expo | Metro local en 8081 |
| Backend | Node local en 3001 |
| Supabase | stack local operativo |
| Cuenta | ficticia, nombre visible `dfsa`, iniciales `DF` |
| Rol | Coordinador |
| Hogar activo | ficticio `vd`; un miembro visible |
| Dataset | local y ficticio: tasks normales/vencidas/cancelled/awaiting verification, un event y goals |
| Datos personales | ninguno |

El dataset se creó exclusivamente mediante formularios reales de la app para observar el producto; no se editaron esquemas, migraciones ni servicios. La auditoría detectó que reintentar un submit visualmente atascado puede crear duplicados aunque el backend ya haya persistido.

## 4. Evidencia capturada

Hay 30 capturas reales en [`m11-proposals/screenshots`](m11-proposals/screenshots/) y una selección anotada en [`m11-proposals/index.html`](m11-proposals/index.html). El render QA del paquete está en [`proposal-overview.png`](m11-proposals/proposal-overview.png).

| Evidencia | Superficie / estado |
|---|---|
| `00`, `31` | Home empty/ready/partial error con summary |
| `01`, `05`, `20` | Planner root, Tasks empty y lista densa |
| `02`, `44` | Quick Actions normal y font scale 1.3 |
| `03`, `04`, `12`, `14` | Task Form, teclado, advanced y submit atascado |
| `06`, `07`, `08`, `40`, `41` | Calendar Month/Day/Week empty y con datos |
| `09` | Household switcher |
| `17` | Trash |
| `22`, `23` | Task edit/detail path y overflow |
| `25`, `26`, `28` | Event Form inicial/advanced/loading |
| `32`, `33`, `36` | Goal Form inicial/advanced/CTA |
| `38`, `39` | Goals dense y Goal Detail |

## 5. Diez hallazgos principales

| # | Severidad | Hallazgo | Evidencia | Recomendación preliminar |
|---|---|---|---|---|
| A01 | P0 | Month recorta los numerales en resolución y font scale por defecto. | `06`, `40` | Rehacer geometría: el mes orienta; puntos/`+n` degradan antes que el número. |
| A02 | P0 | Task/Event/Goal pueden quedar en “Guardando” aunque el registro ya persistió, favoreciendo reintentos y duplicados. | `14`, `28`, runtime + dataset | Estado idempotente con éxito concluyente, lock y recuperación explícita. |
| A03 | P0 | Home puede contradecir datos existentes y mostrar `summary_tasks_invalid_entity`. | `18`, `31` | Nunca exponer códigos; conservar secciones válidas y explicar/reintentar la fallida. |
| A04 | P1 | Tasks exige atravesar métricas + dos filas de filtros antes de ver contenido. | `20` | Resumen compacto solo si aporta; un modelo de filtros con disclosure. |
| A05 | P1 | Quick Actions se siente como menú administrativo de tres filas. | `02` | Tres tiles compactos, target completo, sin descripción/chevron. |
| A06 | P1 | Pills de status, scope, categoría, contadores y filtros tienen pesos similares. | `01`, `20`, `38`, `39` | Política: interactivo o excepcional; metadata pasiva pierde contenedor. |
| A07 | P1 | Event agenda expone Edit, Cancel y Trash a la vez; lo destructivo compite inline. | `41`, frontend | Una acción contextual visible; resto en detail/overflow/confirmación. |
| A08 | P1 | Goal Detail enfrenta CTA primaria con “Cerrar meta” terminal en la superficie principal. | `39` | Progreso/milestone primarios; close/delete bajo overflow + confirmación. |
| A09 | P1 | Task card abre Edit, mientras existe Detail por deep link; la semántica del tap es inconsistente. | `22`, frontend | Tap de fila → detail; completar/verificar independiente; edit contextual. |
| A10 | P2 | AppTopBar + título + tabs + cards intermedias consumen demasiado viewport. | casi todas | Reducir header, usar contención implícita y preservar navegación M1–M10. |

## 6. Auditoría pantalla por pantalla

Abreviaturas: `1º` primer elemento que capta atención; `Debe` elemento correcto; `P/S` acción primaria/secundaria; `E/S/O` información esencial/secundaria/ocultable; `T/C/B/Col` taps frecuentes, contenedores/bordes/colores simultáneos observados.

| Superficie y modo | 1º → Debe | P / S | E / S / O | Chips | C/B/Col | Tipo/densidad/espacio | Taps | Consistencia / accesibilidad / motion-feedback | Sev. / recomendación |
|---|---|---|---|---|---|---|---|---|---|
| Shell/AppTopBar `RUNTIME_REAL` | household+rol → contexto discreto + título | cambiar hogar / perfil | hogar / rol / ninguno | rol | 3/2/3 | título correcto, header muy alto | 1 | label existe; rol se repite; transición no explica scope | P2 / compactar sin cambiar contrato |
| Bottom nav/+ `RUNTIME_REAL` | + elevado → destino activo y + | crear / cambiar tab | destinos / labels / ninguno | 0 | 2/1/2 | claro, + dominante | 1 | target/label correctos; pressed solo opacidad | P2 / conservar conducta y equilibrar peso |
| Planner root/tabs `RUNTIME_REAL` | tabs en card → tab activa + contenido | cambiar tab / search gated | tab / título / overflow | tabs segmentadas | 3/3/3 | duplicación de superficies, alto | 1 | selected visual; revisar announcement/focus al persistir | P1 / indicador ligero, sin card exterior |
| Quick Actions cerrado `FRONTEND_REAL` | + → + | abrir / — | propósito / — / — | 0 | 1/1/1 | compacto | 1 | label “Acciones rápidas” | P3 / mantener |
| Quick Actions abierto `RUNTIME_REAL` | filas+chevrons → tres acciones pares | elegir / back/cerrar | label / icono / descripción | 0 | 4/4/4 | demasiado alto | 1 | full row tocable; 1.3 cabe; no reflow ≥2x; motion no verificable | P1 / alternativa B |
| Tasks empty `RUNTIME_REAL` | métricas/filtros → empty state + crear | crear / filtrar | vacío / contexto / métricas | 8+ | 7+/7+/4 | muy denso antes del vacío | 2+ | lectura horizontal y clipping potencial | P1 / ocultar métricas sin datos, filtro único |
| Tasks dense `RUNTIME_REAL` | métricas → tarea más relevante | completar/verificar / filtrar | título+acción / fecha+persona / status normal | 10+ | 9+/9+/5 | primera card bajo fold | 1–3 | card tap=edit; overflow nativo; no pressed fuerte | P1 / rows, L1/L2, overflow |
| Task overdue/high `RUNTIME_REAL` | color/borde/status → due + título | complete / detail | título+overdue / persona+alta / normal status | status | 1/2/3 | aceptable aislada, ruidosa en conjunto | 1 | no depender de color; wording consistente | P1 / icono+texto excepcional |
| Task awaiting verification `RUNTIME_REAL` | badge/status → Verify | verify / detail | título+verify / fecha/persona / status técnico | status | 1/2/3 | acción no suficientemente distinguible | 1 | TalkBack debe anunciar acción/estado; evitar diálogo ambiguo | P1 / affordance primary leading |
| Task completed/cancelled/trash `RUNTIME+CONTRACT` | filtros/status → recuperación | restore/reopen / delete | título+estado excepcional / fecha / normal metadata | múltiples | 2+/2+/semantic | separación por tabs pero misma card | 2 | destructive/restore requieren confirmación y foco | P2 / row especializada de archivo |
| Task Detail `FRONTEND_REAL` | badges → acción | complete/verify / edit | título+acción / metadata útil / timestamps | status+priority | 2+/3+/4 | metadata fragmentada | 1–2 | entry inconsistente desde lista; estados deep link cubiertos | P1 / action-first, grupos planos |
| Calendar Month `RUNTIME_REAL` | glyphs recortados → mes/selección | elegir día / navegar | día+event density / agenda / detalle evento | view tabs | 2/3/4 | ilegible | 1 | P0 a escala 1.0; selección/color insuficientes | P0 / nueva grilla y agenda |
| Calendar Week `RUNTIME_REAL` | columnas → hoy + agenda | elegir día / navegar | día+densidad / horas / detalle | view tabs | 2/3/3 | estrecha, escaneo débil | 1 | targets compactos; TalkBack requiere secuencia por día | P1 / strip de semana + agenda |
| Calendar Day/agenda `RUNTIME_REAL` | cards/action row → hora+título | abrir detail / overflow | hora+título / duración/lugar / status normal | tipo/status | 3/3/5 | acciones saturan row | 1–3 | event no actúa como fila; destructivas inline | P1 / EventRow temporal |
| Event Detail `FRONTEND+CONTRACT` | status badge → hora/título | edit/reactivate / overflow | hora+título / lugar/recurrencia / timestamps | status | 2/2/3 | correcta pero genérica | 1–2 | not_found/forbidden/conflict presentes; focus post-error por verificar | P2 / temporal, no task-like |
| Goals empty `RUNTIME_REAL` | 3 filas de filtros → crear/empty | crear / filtrar | empty / scope / categorías | 12+ | 5+/5+/4 | overflow horizontal | 2+ | categorías icon-only ambiguas; clipping | P1 / filtro disclosure |
| Goals dense `RUNTIME_REAL` | pills → título/progreso | update / detail | dirección+progreso / milestone/target / normal status | 3/card + filtros | 6+/6+/5 | lenta para escanear | 1 | scope/status redundantes | P1 / GoalRow diferenciada |
| Goal Detail `RUNTIME_REAL` | title/card/buttons → progreso próximo | update/complete / overflow | meta+progreso / milestone+fecha / status normal | 3+ | 5/5/5 | muchas superficies | 1–3 | close compite; milestone empty anidado | P1 / action-first, destructive oculto |
| Task Form `RUNTIME_REAL` | cards/campos → título+CTA | save / advanced | title+due/assignee / priority/review / detalles | selectors | 8+/8+/4 | largo; CTA bajo fold | muchos | keyboard overlay, scroll frágil, submit inconcluso | P0 / quick/full/edit separados |
| Event Form `RUNTIME_REAL` | cada campo-card → title+date/time | save / advanced | title+when / location+recurrence / technical | selectors | 8+/8+/4 | excesiva contención | muchos | keyboard-safe parcial; submit atascado | P0 / bloques planos + CTA sticky-safe |
| Goal Form `RUNTIME_REAL` | category/scope pills → title+direction | save / advanced | title+scope / target+progress / category optional | muchos | 8+/8+/5 | muy largo | muchos | advanced funciona, pero jerarquía/persist feedback débiles | P1 / progressive disclosure real |
| Home Summary `RUNTIME_REAL` | attention/partial error → próxima acción | complete / open Planner | próximos items / counts / error detail | task status | 5+/5+/5 | módulos altos | 1–2 | error code técnico y contradicción; one-tap busy existe | P0 / resumen accionable, errores por sección |
| Loading/skeleton `RUNTIME+FRONTEND` | skeleton → estructura | esperar / retry si excede | progreso / contexto / técnico | 0 | 1/0/1 | correcto en initial, no refresh | 0 | busy/live region no uniforme | P2 / skeleton solo inicial |
| Refresh/stale/offline `FRONTEND+CONTRACT` | banner/state → datos preservados | retry / dismiss | estado / timestamp relativo / código | status | 1–2 | variable | 1 | `PlannerStateView` es buen núcleo; no borrar datos | P2 / inline banner único |
| Partial/fatal error `RUNTIME+FRONTEND` | error → contenido válido + retry | retry / back | mensaje humano / incident id / código | 0 | 1–2 | fatal claro, partial puede filtrar técnico | 1 | live regions existen; sanitización inconsistente en Home | P0 / adapter único |
| Forbidden/not found/conflict `FRONTEND+CONTRACT` | state view → explicación+salida | retry/back / discard-reload | consecuencia / acción / raw error | 0 | 1 | jerarquía correcta | 1–2 | deep-link contract cubre; no live fixture por rol único | P1 / mantener patrón y testear TalkBack |
| Capability denied/partial `FRONTEND+CONTRACT` | acción ausente → acciones permitidas | permitida / — | disponibilidad / razón si necesaria / capability key | 0 | adaptable | Quick Actions filtra catálogo | 1 | 1/2 acciones no tienen layout visual definido | P1 / reflow 1=centrada, 2=mitades, 3=tercios |

## 7. Inventario de componentes

| Componente / archivo | Consumidores y variantes | Repetición / inconsistencia | Reuso | Riesgo | Recomendación |
|---|---|---|---|---|---|
| `components/ui/AppTopBar.tsx` | Home/Planner; household/profile | alto y rol-chip dominante | alto | medio | ADAPT: reducir altura y scope repetido |
| `HouseholdSwitcherSheet.tsx` | AppTopBar | buen patrón de sheet, muchas superficies | alto | bajo | KEEP; alinear motion/focus |
| `HomeTabNavigator.tsx` | app shell | central + más dominante que tabs | alto | alto por rutas | VISUAL_ONLY después; no tocar contrato |
| `CenterTabButton.tsx` | global + | pressable accesible | alto | medio | KEEP behavior; calibrar pressed |
| `PlannerScreen.tsx` | root/tabs/states | 809 líneas, shell y presentación mezclados | medio | alto | separar view model solo en implementación aprobada |
| `QuickActionsMenu.tsx` | global + | filas custom y styles locales | alto | medio | reemplazar presentación por `PlannerActionTile` |
| `PlannerSheetHost.tsx` | todos los forms | host correcto, 531 líneas | alto | alto | KEEP ownership; cambiar solo chrome/motion |
| `PlannerStateView.tsx` | loading/empty/error/offline | núcleo coherente; no todos los consumers sanitizan | alto | medio | KEEP + variantes inline |
| `PlannerErrorBoundary.tsx` | fatal fallback | privacy-aware | alto | bajo | KEEP |
| `PlannerTasksScreen.tsx` | metrics/filters/cards | 900 líneas; TaskCard local | bajo | alto | extraer `PlannerTaskRow` tras aprobación |
| `PlannerCalendarScreen.tsx` | Day/Week/Month/agenda | 801 líneas; geometry defectuosa | bajo | alto | prototipar geometry antes de refactor |
| `PlannerCalendarComponents.tsx` | calendar primitives | layouts demasiado rígidos | medio | alto | ADAPT con medidas responsivas |
| `PlannerGoalsScreen.tsx` | list/filter/goal cards | pills y cards locales | bajo | alto | extraer `PlannerGoalRow` |
| `plannerShared.ts` | cards, chips, filters, metadata, forms | 1592 líneas; estilos múltiples con peso equivalente | alto | alto | dividir por primitive semántica, no por color |
| `TaskForm.tsx` | quick/full/edit | 1279 líneas; card por grupo, CTA profundo | medio | alto | separar modos sobre mismo schema |
| `EventForm.tsx` | quick/full/edit | 670 líneas; event tratado como form genérico | medio | alto | jerarquía temporal y disclosure |
| `GoalForm.tsx` | quick/full/edit | 1121 líneas; muchas pills | medio | alto | dirección/progreso primero |
| `TaskDetailScreen.tsx` | deep links | badges normales; entrada inconsistente | medio | medio | ADAPT action-first |
| `EventDetailScreen.tsx` | deep links | status badge y acciones genéricas | medio | medio | ADAPT time-first |
| `GoalDetailScreen.tsx` | cards + milestones | CTA terminal compite | medio | alto | ADAPT progress-first |
| `PlannerTrashScreen.tsx` | restore/permanent states | objeto mixto requiere claridad | medio | alto | filas específicas + confirmaciones |
| `PlannerSearchScreen.tsx` | gated Search | fuera de alcance visual hasta capability | medio | medio | RESERVE; no promocionar |
| `HomePlannerSections.tsx` | task/event/goal summary | cards, status pill, partial error propio | alto | alto | compartir row/metadata/status primitives |
| `AppButton.tsx` | forms/details | primary/secondary/loading accesible | alto | bajo | KEEP + asegurar busy/success exit |
| `ActionPill.tsx` | filters/actions | semántica ambigua entre filtro y acción | medio | medio | restringir a filtro/selection; renombrar después |
| `Skeleton.tsx` | initial loading | reusable | alto | bajo | KEEP; initial only |
| `AppAvatar.tsx` | assignee/member | útil si representa persona, decorativo si sparkle genérico | alto | bajo | KEEP persona; remove generic avatars |

## 8. Deuda sistémica

- **Containment inflation:** se combinan fondo, borde, radius, shadow y gap para separar elementos que whitespace o divider resolverían.
- **Semantic drift:** el mismo lenguaje de pill significa filtro, estado normal, categoría, alcance, contador y acción.
- **Object drift:** Event hereda patrones de Task; Goal parece una Task grande, aunque sus decisiones son temporales y de progreso respectivamente.
- **Feedback drift:** mutation intent e idempotency existen contractualmente, pero el feedback de submit no siempre concluye.
- **Navigation drift:** Task card lleva a Edit mientras Goal lleva a Detail y Event deja acciones inline.

## 9. Resultado M11-A

La auditoría identifica qué está implementado, qué es deuda y qué fue solo intención documental. No se modificó ningún componente productivo. Los P0 visuales/feedback deben entrar al primer bloque de implementación posterior; P1 define la nueva jerarquía; P2/P3 queda para consolidación y polish.

**M11-A AUDIT STATUS: PASSED**
