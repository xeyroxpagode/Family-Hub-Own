# Planner V1 — M11-C2 Final Decision Registry

**STATUS:** **FROZEN**  
**HUMAN APPROVAL:** **APPROVED**  
**FREEZE DATE:** 2026-07-22  
**CANONICAL AUTHORITY:** `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`  
**FUNCTIONAL FREEZE:** **APPROVED**  
**IMPLEMENTATION:** **NOT YET AUTHORIZED**

## Authority and precedence

When this Registry, a previous proposal or a historical matrix differs from
`PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`, the canonical functional freeze prevails.

Final authority order:

1. `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` — canonical functional authority;
2. this Final Decision Registry — decision record and traceability;
3. `PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md` — freeze protection and change control;
4. `PLANNER_V1_M11_APPROVAL_PACKET.md` — human-approval evidence;
5. proposals, matrices, research and audits — historical or technical sources.

| Closure item | Final state |
|---|---|
| Packages A–E | **FROZEN** |
| Gates G1–G7 | **FROZEN** |
| Transverse audit | **PASS** |
| Contradictions | **RESOLVED** |
| Implementation | **NOT YET AUTHORIZED** |
| Future implementation | Only through separately approved submilestones |

The per-decision approval questions and prior status labels below are retained
as historical traceability. Human approval was granted on 2026-07-22. Where a
historical decision conflicts with the canonical freeze, it is explicitly
marked **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE** and must not be implemented.

**Historical boundary — SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** navigation,
routes, params, capabilities, lifecycle, cache, invalidation, optimistic update,
rollback, idempotency, versioning, Summary and deep links were previously
described as governed only by M1–M10. M1–M10 remain implementation history, but
the final Planner V1 functional result is governed by the canonical freeze.

**Evidence:** runtime Android audit, 30 screenshots, frontend inventory, M1–M10 contracts/reports, HomePlus design authorities and current official UX/accessibility guidance consulted 2026-07-18.

## Reading contract

Each decision groups the required audit fields without manufacturing irrelevant subsections:

- **Case:** problem, evidence, job, frequency and current behavior.
- **Decision:** alternatives/research, recommendation, subdecisions, advantages and risks.
- **Resilience:** normal/edge/error/offline, capabilities and household lifecycle.
- **Quality:** accessibility, Dynamic Type, ergonomics, motion/haptics and privacy.
- **Delivery:** technical impact/files/preview, criteria, tests and approval authority.

Research basis for gestures and recovery: [Apple Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures), [Apple Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus), [Apple Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo), [Android accessibility principles](https://developer.android.com/guide/topics/ui/accessibility/views/principles-views), [React Native accessibility actions](https://reactnative.dev/docs/accessibility), [WCAG Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation), [WCAG Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [Material Snackbars](https://m2.material.io/components/snackbars/android) and [Apple Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding).

---

## D1 — Layout de Quick Actions

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** Las tres filas actuales hacen administrativa una decisión frecuente de tres opciones. Runtime default/1.3 y preview A/B/C respaldan el cambio. Job: elegir Tarea, Evento o Meta en un tap; frecuencia alta desde el `+`.
- **Decision:** se mantiene B: tiles compactas de superficie completa. D1.1 orden Tarea→Evento→Meta; D1.2 target completo; D1.3 3 columnas, 2+1 narrow/large text, 1 columna a 200%; D1.4 1/2 capabilities refluye sin huecos; D1.5 busy bloquea doble selección. Se descartan rows, banda abierta y FAB expansion.
- **Resilience:** si 0 acciones, el host no abre una sheet vacía; error devuelve tile a idle. Back/household transition siguen M3/M7. Capability no disponible se oculta.
- **Quality:** 48 dp/44 pt; label visible; orden TalkBack lógico; no color-only; press 80 ms, sheet 160–180 ms, sin scale/translation con Reduce Motion. No telemetry de títulos.
- **Delivery:** `QuickActionsMenu.tsx`, chrome de `PlannerSheetHost.tsx`; preview `quick-actions-alternatives` y gesture lab. Aceptación: una decisión en 1 tap, sin clipping a 2×, pressed/busy/disabled inequívocos. Tests: 0–3 capabilities, narrow, 1.0–2.0, Back, TalkBack, duplicate tap. Pregunta: **¿Aprobás B con este reflow y gating como layout vinculante?**

## D2 — Jerarquía visual de Task

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

> **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** D2.8 and any permanent Task-row
> overflow are historical. Canonical Task rows have no permanent overflow and
> no long press; tapping the row body opens Task Detail.

- **Case:** cards/chips compiten y el tap de card abre Edit. Job frecuente: identificar y completar/verificar; actual first viewport queda bajo métricas/filtros.
- **Decision:** flat action-first row. D2.1 título L1; D2.2 complete/verify leading; D2.3 due y D2.4 assignee L2; D2.5 una excepción; D2.6 high priority solo condicional; D2.7 0 chips normal; D2.8 overflow; D2.9 pressed/busy local; D2.10 offline preserva row; D2.11 autoheight; D2.12 tres focos máximos; D2.13 dense conserva targets; D2.14 tests abajo. Refinamiento C2: integra D11/full swipe/Undo sin quitar el control visible.
- **Resilience:** status/capability decide action; denied no deja control muerto. Error optimistic restaura row y anuncia. Household change cancela feedback viejo por generation M7.
- **Quality:** title completo en accessibility label, targets separados, 2× reflow, up-event/cancel, haptic solo al commit/success. Contenido privado no entra a telemetry.
- **Delivery:** `PlannerTasksScreen.tsx`, `TaskDetailScreen.tsx`, `PlannerTrashScreen.tsx`, `HomePlannerSections.tsx`, `plannerShared.ts`. Preview rows + gesture lab. Aceptación: normal en 2 líneas, excepción máxima 1, complete 1 tap, detail 1 tap. Tests: normal/overdue/high/verify/completed/cancelled/dense/offline/2×/TalkBack. Pregunta: **¿Aprobás la fila action-first y el tap de body hacia Detail?**

## D3 — Jerarquía visual de Event

**Status:** `APPROVED_AS_IS` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** Event se presenta como Task y expone Edit/Cancel/Trash inline. Job: entender cuándo ocurre y abrir contexto; frecuencia diaria/media.
- **Decision:** time-first: hora/all-day L1, título L1, duración/location L2, recurrence plain y cancelled excepcional. Body→Detail; overflow contextual. No gesture commit en V1 (D12).
- **Resilience:** occurrence/series wording usa contratos congelados; cancelled ofrece Reactivar solo por capability; offline preserva agenda; error no borra contexto.
- **Quality:** TalkBack anuncia hora→título→contexto; all-day autoheight; no dependencia de color; pressed 80 ms; no haptic de selección de row. Location/título nunca telemetry.
- **Delivery:** `PlannerCalendarScreen.tsx`, `PlannerCalendarComponents.tsx`, `EventDetailScreen.tsx`, `HomePlannerSections.tsx`. Preview rows. Aceptación: ninguna agenda muestra tres acciones inline; dense mantiene 48 dp. Tests: normal/all-day/recurring/cancelled/simultáneo/2×/capability. Pregunta: **¿Aprobás la jerarquía time-first sin gestures de commit?**

## D4 — Jerarquía visual de Goal

**Status:** `APPROVED_AS_IS` · `HUMAN_APPROVAL_REQUIRED`

> **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** the visible entity is `Plan`,
> not `Goal` or `Meta`. A Plan has composable indicators and requirements; it
> does not use one exclusive progress mode or a universal percentage.

- **Case:** status/category/scope pesan como progreso y Close compite con primary. Job: entender dirección, progreso y siguiente paso; frecuencia media.
- **Decision:** progress-first: title/direction + accessible progress L1; next milestone/target L2; scope solo en listas mixtas; active/category salen de row; Close/Delete contextuales. Goal no hereda completion circle ni time column.
- **Resilience:** completed/closed reciben resumen condicional; sin milestones no reserva placeholder; denied oculta action; offline conserva value anterior.
- **Quality:** `accessibilityValue` textual, bar no color-only, 2× autoheight; motion determinate 180 ms o instantáneo reduced; no goal content telemetry.
- **Delivery:** `PlannerGoalsScreen.tsx`, `GoalDetailScreen.tsx`, `HomePlannerSections.tsx`. Preview rows. Aceptación: progreso domina, máximo una excepción, Close fuera de primary. Tests: active/personal/household/completed/closed/no milestone/dense/2×. Pregunta: **¿Aprobás la jerarquía progress-first?**

## D5 — Política de chips y badges

**Status:** `APPROVED_AS_IS` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** 51 usos mezclan navegación, filtros, status y metadata. Job: reconocer qué se puede tocar y qué es excepcional.
- **Decision:** chip solo input/selection/filter/action contextual real; badge/status indicator solo excepción. D5.1 0 chips en row normal; D5.2 máximo 1 excepción; D5.3 normal status/priority/household remove; D5.4 recurrence/category/scope plain/detail; D5.5 forms mantienen selections.
- **Resilience:** si dos excepciones coinciden, se prioriza la que cambia la acción (verify > overdue > high); el resto vive en detail. N/A lifecycle: no cambia datos.
- **Quality:** selected/disabled con state semántico; 48 dp aunque visual sea menor; no color-only. Privacy N/A salvo labels con contenido, que no se emiten.
- **Delivery:** `plannerShared.ts`, list/detail/forms/Home consumers. Matrix dedicada. Aceptación: inventario sin chip pasivo no justificado. Tests visual-semánticos por 51 grupos. Pregunta: **¿Aprobás esta política y prioridad de excepciones?**

## D6 — Modelo visual de filtros

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** dos/tres filas horizontales y métricas desplazan contenido. Job: restringir lista sin perder contexto; frecuencia media.
- **Decision:** un control primario visible + `Filtrar (n)`; secundarios en sheet. D6.1 state primario; D6.2 count solo >0; D6.3 “Todas” es default; D6.4 filtros activos se resumen y pueden limpiar; D6.5 Calendar view selector no es filtro. Refinamiento: el botón conserva count y summary al volver, asegurando reencontrabilidad.
- **Resilience:** refresh/offline preserva selección; capability no muestra opciones inválidas; household change aplica reset/persistencia según M6/M7 sin redefinirla. Empty distingue dataset de filtro sin resultados.
- **Quality:** selected/expanded/heading, focus retorna al botón; 2× convierte todo a botón+sheet; motion disclosure 180 ms. Telemetry solo categoría allowlisted/count bucket.
- **Delivery:** Tasks/Goals filters y sheet presentation. Aceptación: contenido visible en primer viewport; secondary ≤2 taps. Tests: 0/1/muchos, restore focus, 2×, TalkBack, household switch. Pregunta: **¿Aprobás un filtro visible + sheet con count/resumen?**

## D7 — Densidad y representación de Calendar

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED` · **P0-1 mandatory**

> **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** multiple dots and `+n` are
> historical. Calendar Month uses one numeric badge per day: hidden at 0,
> `1–9` as the number and `9+` above nine.

- **Case:** Month recorta numerales a escala default. Job: orientarse por fecha y descubrir densidad; uso diario/semanal.
- **Decision:** Month number + max 2 dots y `+n`, agenda del día; Week strip+agenda en compact; Day agenda lineal. Refinamiento: el cell nunca reduce el número para alojar metadata; a 1.6–2× elimina dots antes de reflow.
- **Resilience:** 5/6 weeks, locale/start-of-week, days outside month, empty/simultaneous events; offline conserva last good data. Capabilities afectan acciones, no geometry. Household transition mantiene gate M7.
- **Quality:** cell 44–48 dp, nombre/selected/today/count accesible; grid reading order; no color-only; selection 140 ms, reduced instantáneo.
- **Delivery:** Calendar screen/components; preview Calendar. Aceptación P0: cero glyph clipping en 320 dp, audited device y 1.0–2.0. Tests screenshot + TalkBack + month boundaries. Pregunta: **¿Aprobás Month overview con dots/`+n` y agenda?**

## D8 — Progressive disclosure en formularios

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED` · **P0-2 applies**

- **Case:** forms largos y submit puede quedar “Guardando” aunque persiste. Job: capturar lo esencial rápido y ampliar solo cuando hace falta.
- **Decision:** Quick essential + una disclosure `Más opciones`; Full expanded; Edit dirty/busy. D8.1 no campos nuevos; D8.2 orden essential→when/people→organization→advanced; D8.3 validation inline; D8.4 CTA keyboard-safe; D8.5 terminal actions fuera. Refinamiento: defaults se resumen en texto plain antes de Save si no son obvios; templates existentes viven en advanced, nunca interceptan captura.
- **Resilience:** success/safe_error/uncertain/conflict terminal; draft queda en memoria ante safe error; household change sigue lifecycle y nunca traslada draft silenciosamente. Capability oculta/inhabilita fields según contrato.
- **Quality:** expanded state, focus al error, 2× una columna, busy announce una vez; motion 180 ms; no field content telemetry.
- **Delivery:** tres forms + sheet chrome/submit view state, no service changes en D/F salvo P0 autorizado. Tests: keyboard, rotation/narrow, invalid, duplicate tap, timeout, success, conflict. Pregunta: **¿Aprobás Quick/Full/Edit y el resumen de defaults?**

## D9 — Distribución visual de acciones en Details

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

> **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** long press does not duplicate
> Task-row actions. Entity taps open Detail rather than Edit; frequent actions
> may live in Detail and management actions remain secondary.

- **Case:** acciones terminales compiten; entry semantics inconsistente. Job: actuar con seguridad desde Detail.
- **Decision:** una primary; edit/assign/reactivate/reopen contextuales; cancel/trash/close/delete al final de menu/section + confirmation. Refinamiento: long press duplica el mismo menú, nunca agrega comandos; body tap siempre Detail donde existe según rutas M10.
- **Resilience:** unavailable items se ocultan en context menu; conflict/forbidden/not found conservan salida segura. Destructive no ejecuta offline si contrato no lo permite.
- **Quality:** overflow contextual label, focus trap/return, destructive last, 2× labels completos; no hidden gesture-only action; haptic solo confirm outcome.
- **Delivery:** three details, Trash, agenda/list triggers. Aceptación: una primary y ningún destructive al mismo peso. Tests action matrix por state/capability, Back/focus/confirm. Pregunta: **¿Aprobás esta distribución y equivalencia long press/overflow?**

## D10 — Intensidad general de motion

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** Planner necesita feedback premium sin demora. Job: comprender cambio/causa; frecuencia transversal.
- **Decision:** 80 ms press; 140 selection; 160–180 sheet; 180–240 state. Refinamiento C2: no haptic warning antes de destructive —podría insinuar commit—; haptic ocurre en threshold de full swipe, context-click o outcome.
- **Resilience:** toda animación interrumpible/cancelable; errors no shake; offline/rollback preservan layout. Household crossfade solo después de readiness M7.
- **Quality:** Reduce Motion elimina scale/translation/collapse y conserva state/announcement; haptic complementario y best-effort por plataforma.
- **Delivery:** shared motion tokens/utilities después de UI foundation. Aceptación: ninguna animación bloquea input/red ni supera 240 ms funcional. Tests reduced on/off, interruption, low-end runtime. Pregunta: **¿Aprobás este budget y la eliminación del warning haptic preacción?**

---

## D11 — Gestos de Task

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

> **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** the permanent visible overflow
> described below is historical. The canonical accessible alternatives and
> swipe rules apply, with no permanent overflow or long press on Task rows.

- **Case:** completion frecuente puede acelerarse, pero swipe es oculto y compite con navegación/scroll. Job: completar rápido sin perder control; alta frecuencia.
- **Decision:** D11.1 tap leading = complete/verify; D11.2 body tap = Detail; D11.3 overflow siempre visible; D11.4 swipe derecho parcial revela la misma acción frecuente; D11.5 swipe izquierdo revela `Más`, no destructive directo; D11.6 full swipe solo D13. Alternativas: swipe-only/reject all; se adopta atajo redundante.
- **Resilience:** eligible pending→Complete; awaiting verification→Verify parcial sin full; denied no abre underlay muerto; terminal/archive usa visible/detail actions. Gesture termina en up-event y puede abortarse al regresar.
- **Quality:** overflow y `accessibilityActions` equivalentes; TalkBack no requiere swipe físico; 2× row autoheight; threshold haptic una vez; titles privados excluidos.
- **Delivery:** Task row gesture wrapper, no service semantics. Preview gesture lab. Aceptación: control visible funciona sin gesto; horizontal gesture no roba vertical scroll/system Back. Tests directions, cancellation, thresholds, screen reader, one-handed use. Pregunta: **¿Aprobás right=acción frecuente y left=Más como atajos redundantes?**

## D12 — Gestos de Event, Goal y Milestone

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `DERIVED_DECISION`

> **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** `Goal` means `Plan`, and the
> optional long-press/overflow model below is historical where it conflicts
> with the canonical surface contract.

- **Case:** forzar el patrón Task borraría diferencias conceptuales y aumentaría errores. Jobs: abrir tiempo/progreso y completar milestone visible.
- **Decision:** Event y Goal no tienen swipe commit en V1; body→Detail, overflow visible. Milestone mantiene completion control visible; no full swipe. Long press puede duplicar overflow en los tres.
- **Resilience:** recurrence/close/delete nunca gesto; capability unavailable oculta command; offline conserva rows.
- **Quality:** alternativas visibles satisfacen motor/screen reader; no aprendizaje extra. Motion/haptic solo press/menu/outcome.
- **Delivery:** ausencia intencional de recognizer salvo shared context menu. Aceptación/tests: horizontal swipe no ejecuta nada; all actions accesibles por tap/custom action. Aprobación derivada de D3/D4/D17/D31.

## D13 — Política de full swipe

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** full swipe ahorra un tap pero eleva accidental activation. Job: completar una Task elegible con una mano.
- **Decision:** únicamente `Task complete` cuando es simple, capability-allowed, online/confirmable y existe inverse/rollback + Undo. Threshold visual 70%; commit solo on release; puede retroceder antes. Prohibido para Verify, Cancel, Trash, Delete, Close, Restore, Reopen y Milestone.
- **Resilience:** red incierta no retira definitivamente row; rollback la restaura. Segundo full swipe bloqueado mientras misma row busy. Household change cancela UI local sin cambiar contracts.
- **Quality:** visible complete + custom action equivalentes; reduced motion no collapse; threshold se comunica por label/shape, haptic una vez. No content telemetry.
- **Delivery:** Task gesture layer + Undo surface. Aceptación: cero destructive full swipe, abort before release, recovery after failure. Tests 69/70/100%, direction reversal, offline, capability, reduced, TalkBack. Pregunta: **¿Aprobás full swipe exclusivamente para Task complete bajo estas gates?**

## D14 — Política de long press

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `DERIVED_DECISION`

> **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** this general list-row long-press
> policy is not part of the frozen Planner V1 contract. No hidden gesture may
> replace the canonical visible or accessible path.

- **Case:** context menu despeja UI, pero está oculto. Job: shortcut para usuarios expertos; frecuencia baja/media.
- **Decision:** long press duplica exactamente el overflow contextual, máximo 4 comandos relevantes; unavailable hidden; destructive al final. Nunca es la única vía, no cambia primary y no abre preview con datos sensibles.
- **Resilience:** release/cancel no ejecuta comando; Back cierra; offline filtra acciones según contract. Household switch cierra menu.
- **Quality:** overflow/custom accessibility actions equivalentes; context-click haptic al abrir, none al cancelar; autoheight no afecta. Privacy: menu no se telemetra con entity/content.
- **Delivery:** shared row/menu presentation. Aceptación/tests: parity exacta overflow/long press, focus/Back, platform Android/iOS. Derivada de D9/D17/D31.

## D15 — Undo y reversibilidad

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** reversibilidad genera confianza y hace seguro full swipe. Job: recuperar un cambio reciente; frecuencia condicional.
- **Decision:** Undo aparece solo si el contrato ya permite inverse/rollback. Primary case: Task complete. Una barra contextual, una acción, 6 s base adaptada a accessibility timeout; después sigue disponible la recuperación normal si existe. Nunca se usa Undo para ocultar confirmación de destructive irreversible.
- **Resilience:** una acción nueva reemplaza el mensaje visual anterior solo si la anterior sigue recuperable por detail/trash; si no, se serializa/bloquea. Failure restaura sin exigir Undo. Offline/uncertain comunica estado, no promete reversión falsa.
- **Quality:** `role=status`, announce una vez, focus no secuestrado, botón 48 dp; Reduce Motion no slide. Telemetry: action category/outcome/undo used, sin IDs.
- **Delivery:** shared feedback surface + existing rollback/inverse hooks. Preview gesture lab. Aceptación/tests: timeout, screen reader duration, multiple actions, rollback, navigation/household change. Pregunta: **¿Aprobás Undo contextual con gate contractual y 6 s adaptables?**

## D16 — Modelo natural de creación rápida

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `DERIVED_DECISION`

- **Case:** crear debe sentirse como capturar una intención, no configurar un registro. Job frecuente: recordar/coordinar ahora.
- **Decision:** `+`→tile→Quick Form con focus en título y teclado; essential fields visibles, defaults plain summary cuando no obvios, `Más opciones`, Save. Success cierra, anuncia y enfatiza la row/agenda/goal resultante; no pantalla intermedia ni CTA “crear otra”.
- **Resilience:** draft/error/uncertain según D8/P0-2; capability gating antes de form; household identity visible una vez en sheet si un cambio pudiera confundir, sin repetir en fields.
- **Quality:** focus/keyboard/Back, 2× una columna; motion total ≤240 ms tras success; no title telemetry.
- **Delivery:** Quick Actions + forms presentation. Aceptación: máximo 2 transiciones antes de entrada, 1 choice+essential+save. Tests three objects, keyboard, success/error, household switch. Derivada de D1/D8/D19.

## D17 — Acciones visibles versus contextuales

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `DERIVED_DECISION`

- **Case:** demasiadas acciones visibles rompen jerarquía; demasiadas ocultas rompen descubribilidad.
- **Decision:** visible: Create, Task complete/verify, Milestone complete, Goal progress primary en detail, Save, Today/date nav, filter entry, Undo. Contextual: Edit, Assign, Reactivate/Reopen, recurrence scope. Advanced: templates/history. Destructive: Cancel/Trash/Close/Delete en overflow/detail+confirm.
- **Resilience/Quality:** state/capability pueden promover solo la primary aplicable; no dead controls. Toda contextual tiene label y screen-reader action. Dynamic Type no convierte icon-only en targets menores.
- **Delivery:** action matrix shared across rows/details/forms. Aceptación/tests: exactamente una primary por surface y destructive nunca comparte prominencia. Derivada de D2–D5/D9.

## D18 — Descubrimiento progresivo de gestos

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** swipe/long press son invisibles; tutorial global agrega carga. Job: aprender un atajo después de entender el control visible.
- **Decision:** no onboarding modal. Tras la primera completion exitosa mediante control visible, en la próxima visita elegible a Tasks se muestra una sola hint inline, dismissible: “Tip: deslizá una tarea para completarla más rápido”. No enseña left/full/long press a la vez; esos se descubren por reveal/overflow. No reaparición automática tras dismiss.
- **Resilience:** hint no aparece con screen reader activo, Reduce Motion no cambia contenido, no aparece offline/busy/error ni durante household transition. Si no hay eligible row, espera.
- **Quality:** tip no bloquea/focus-steal, close 48 dp, plain language; telemetry allowlisted shown/dismissed/gesture-used, sin user/entity. 
- **Delivery:** local preference/education state solo si implementación autoriza almacenamiento ya disponible; si no, hint se omite, nunca se repite por sesión. Preview gesture lab. Aceptación/tests: once-only, dismiss, eligibility, screen reader, household. Pregunta: **¿Aprobás una hint inline única después de la primera completion visible?**

## D19 — Presupuesto de fricción

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `DERIVED_DECISION`

- **Decision:** ceilings, no targets: create access 1 tap + tile; open Detail 1; Task complete/verify 1; full swipe 1 gesture; primary filter 1; secondary filter ≤2; Edit from list ≤2; Cancel/Trash/Close/Delete ≤3 incluyendo confirm; Restore/Reopen ≤2; Undo 1; Today/view/day select 1 cada uno.
- **Edges:** capability denial no suma taps inútiles; error retry no obliga reingreso; offline no ofrece camino que terminará bloqueado. Household change no cuenta como Planner friction.
- **Quality/Privacy:** no sacrificar 48 dp, confirmation o accessible alternative para cumplir budget. Telemetry mide buckets, nunca contenido.
- **Delivery:** acceptance metric transversal. Tests instrumentados/runtime por job. Derivada de frecuencia, D1/D2/D6/D9/D15/D16.

## D20 — Haptics, feedback y motion de interacción

**Status:** `APPROVED_WITH_REFINEMENT` · `MANDATORY_QUALITY_RULE`

- **Case:** feedback debe confirmar target, threshold y outcome sin ruido. Job transversal.
- **Decision:** visual press siempre; selection haptic opcional en tabs/date; context-click al abrir long press; threshold haptic una vez al cruzar 70%; success/error solo al resultado final. No haptic por scroll/filter chip, normal row tap, pre-destructive warning o re-render.
- **Resilience:** haptic best-effort; ausencia de hardware nunca cambia flow. Rollback usa error/restore visual; reduced motion no elimina labels/announcements y no exige apagar haptic.
- **Quality:** Expo/OS semantics, no custom vibration patterns; TalkBack recibe announcement independiente. Telemetry no registra hardware details finos.
- **Delivery:** shared feedback adapter/tokens; no dependency nueva. Aceptación/tests: exactly-once threshold/outcome, no haptic disabled/unavailable, reduced on/off. Aprobación derivada de D10 para intensidad; regla de calidad no requiere voto separado.

---

## D21 — Modelo mental y arquitectura de atención

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `DERIVED_DECISION`

- **Case:** normal/status/metadata/acciones compiten. Job: saber qué requiere atención ahora.
- **Decision:** pantalla scoped por household; navegación primero una vez, luego objeto/action. Regla: normal desaparece; relevante se entiende; exceptional llama; actionable se reconoce; advanced espera. L1–L5 del Hierarchy document es vinculante.
- **Resilience:** error/offline no reemplaza datos útiles; capability cambia acciones, no el modelo del objeto; household transition evita mezclar scopes.
- **Quality:** headings/reading order reflejan L1–L5, no solo size/color; long text no degrada jerarquía. Telemetry N/A excepto surface/action category.
- **Delivery:** criterio transversal. Aceptación/tests: first-attention review por screenshot y TalkBack order. Derivada de D2–D9.

## D22 — Organización y escaneo de listas

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `DERIVED_DECISION`

- **Case:** cards repetidas y filtros previos reducen scanning. Job diario: encontrar el siguiente objeto relevante.
- **Decision:** comfortable flat rows default; sections solo si cambian decisión (`Requieren acción`, `Hoy`, `Próximas`); divider/whitespace como containment. Dense mode es estado de datos, no preference nueva: reduce metadata, nunca target/type.
- **Resilience:** empty filtrado se diferencia de empty dataset; refresh/stale preserva position; household change reinicia lista según M7. Capabilities no reordenan datos, solo affordances.
- **Quality:** headings accesibles, row autoheight 2×, no horizontal scroll. Motion de removal espera estabilidad/rollback.
- **Delivery:** three list screens/Home. Aceptación/tests: first actionable item en viewport normal, dense 20+ items, screen reader section navigation. Derivada de D2–D7/D24.

## D23 — Integración visual de shell, header y tabs

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** AppTopBar+título+tabs consumen altura; role chip repite contexto. Job: ubicarse y cambiar scope/destino sin competir con contenido.
- **Decision:** compactar padding; household switcher permanece; role pasa a plain metadata/switcher; Planner heading comparte banda con gated Search/overflow; tabs sin card+shadow exterior. Scroll puede colapsar heading, nunca alterar tabs/persistence.
- **Resilience:** household switching/loading mantiene affordance y readiness M7; error no duplica headers; 1–3 tab capabilities siguen contratos. Back stack M1–M10 intacto.
- **Quality:** 48 dp, selected semantic, focus no queda bajo sticky region, 2× labels reflow/no clip. Motion selected 140 ms, household content after-ready 180 ms or none.
- **Delivery:** `AppTopBar.tsx`, `PlannerScreen.tsx`, presentation of `HomeTabNavigator.tsx`; no navigation logic. Aceptación/tests: first row gana altura, tabs persist/announce, scroll/focus/narrow. Pregunta: **¿Aprobás compactar shell y quitar la card exterior de tabs sin cambiar behavior?**

## D24 — Sistema de superficies, densidad y spacing

**Status:** `APPROVED_AS_IS` · `MANDATORY_QUALITY_RULE`

- **Decision:** tokens del Component System: screen 20/16 dp, section 24, heading-content 12, row 14–16 vertical, card 16, control gap 8. Una forma de containment por objeto. Card solo summary/empty/error/agrupación real; row+divider para collections; shadow solo cambio de plano.
- **Edges:** narrow reduce padding antes que targets; dense elimina metadata antes que whitespace esencial. Error/selected no añade borde+shadow+fill simultáneos.
- **Quality:** rhythm 4/8, safe areas, keyboard. No privacy/motion impact salvo sheet elevation.
- **Delivery:** theme/shared primitives. Aceptación/tests: token audit y screenshot diff; cero ad-hoc magic surface stacks. No aprobación humana separada: deriva del Design System y accesibilidad.

## D25 — Tipografía y contenido largo

**Status:** `APPROVED_WITH_REFINEMENT` · `MANDATORY_QUALITY_RULE`

- **Case:** fixed heights/clipping amenazan Month, rows y forms. Job: leer contenido propio completo o entender cómo accederlo.
- **Decision:** screen/section/object/body/metadata/label/status/action roles actuales; title 2 líneas mínimo, autoheight; no ellipsis como única vía; metadata puede mover línea/Detail. At 1.6–2× se elimina L3 antes de truncar L1/L2; full accessible label conserva texto.
- **Resilience:** strings largas/Spanish dates/large household names; empty/error pueden crecer sin tapar CTA. Technical codes prohibidos aunque quepan.
- **Quality:** contrast 4.5:1 normal/3:1 large, scalable type, RTL no gate pero start/end-safe. Motion no anima font size/layout.
- **Delivery:** shared typography/rows/calendar/forms. Aceptación/tests: pseudo-long strings, 1.0/1.3/1.6/2.0, 320 dp, TalkBack full names. No voto: calidad básica.

## D26 — Color, iconografía y elevación semántica

**Status:** `APPROVED_WITH_REFINEMENT` · `MANDATORY_QUALITY_RULE`

- **Case:** demasiados colores/bordes crean igualdad falsa. Job: reconocer primary, selection y exception.
- **Decision:** neutral warm domina; terracotta una ancla; un semantic por row; success/warning/error solo estado relevante. Icono siempre con label/text/accessible name. Elevation solo sheet/floating plane. Refinamiento: focus/selected outline 3:1 y disabled conserva label legible; no color-only.
- **Resilience:** overlapping exceptions siguen priority D5; dark theme no se asume si no existe, pero token pairs se verifican. Platform icons familiares, directional icons mirror si RTL futuro.
- **Delivery:** theme/icons/primitives. Aceptación/tests: automated contrast + grayscale/color-blind review + screenshot simultaneous states. No voto: quality/system consistency.

## D27 — Interacción temporal de Calendar

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `DERIVED_DECISION`

- **Case:** Day/Week/Month deben mantener un modelo de fecha y agenda sin reabrir routes/state. Job: moverse, volver a Today y abrir un item.
- **Decision:** period + previous/next + Today visible; view selector exclusive; selecting day actualiza agenda, no navega a route nueva; Month overview, Week strip, Day chronological. Simultaneous events group by time, no columns ilegibles en compact.
- **Resilience:** selected date persists per M6 where applicable; household change gates data; offline/stale label, no geometry reset; recurrence remains metadata/detail.
- **Quality:** chronological focus order, selected/today redundant, 48 dp cells; 140 ms selection or instant reduced. No date/content telemetry beyond view category.
- **Delivery:** Calendar presentation. Aceptación/tests: boundaries, today, week start, simultaneous/all-day/tasks, Back and screen reader. Derivada de D7/D3.

## D28 — Modos de formulario, defaults y templates

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** defaults pueden acelerar o sorprender; templates pueden interceptar captura. Job: crear con poca entrada y control predecible.
- **Decision:** Quick/Full/Edit D8. Defaults existentes se muestran si cambian interpretación; defaults normales silenciosos. Templates existentes aparecen como acción advanced secundaria después de essential, nunca pantalla inicial, nunca seleccionados automáticamente. Crear/editar templates o nuevos defaults queda `DEFERRED_OUT_OF_SCOPE` como subcapacidad, no nueva decisión global.
- **Resilience:** template incompatible/capability denied no se ofrece; applying template no borra manual input sin confirm; household-scoped defaults siguen contratos. Error conserva draft.
- **Quality:** selection announced; keyboard/focus/2×; template names son contenido privado y no telemetry.
- **Delivery:** three forms + existing `plannerTemplates` presentation only if already reachable. Aceptación/tests: blank/default/template/manual override/edit/draft/denied. Pregunta: **¿Aprobás templates como advanced opcional, nunca interstitial ni automático?**

## D29 — Presentación coherente de estados del sistema

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `MANDATORY_QUALITY_RULE`

- **Case:** state handling existe, pero Home filtra code y consumers divergen. Job: entender si esperar, reintentar o continuar.
- **Decision:** initial=skeleton; refresh=keep data+progress; stale/offline=keep data+single banner; partial=section inline; fatal=state view; forbidden/not found/conflict=safe message+exit/resolve. Priority sigue M2.
- **Resilience:** no skeleton sobre stale; no raw codes; capability denied oculta/explica expectativa; household transition no mezcla old/new context.
- **Quality:** busy/live region exactly once, focus only for blocking error, 2× autoheight, no shake. Telemetry incident/category only.
- **Delivery:** `PlannerStateView`, ErrorBoundary, Home state presentation. Aceptación/tests: state matrix every consumer, screen reader, offline recovery. Derivada de M2 + D21/D34; no human vote.

## D30 — Home Planner Summary

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED` · **P0-3 mandatory**

> **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** references to `Goal` are
> historical and mean `Plan`. Any single progress-first summary is only a
> projection; it cannot redefine Plan as having one exclusive progress model.

- **Case:** runtime mostró datos contradictorios y `summary_tasks_invalid_entity`. Job: ver próxima acción confiable sin abrir Planner.
- **Decision:** un bloque Planner; Attention solo >0; up to 3 Tasks action-first, 3 Events time-first, 1 Goal progress-first; valid sections survive partial error. Refinement: el summary no muestra “sin tareas” si task section falló; reemplaza esa sección por error humano+Retry, nunca code.
- **Resilience:** one-tap busy/rollback M9; stale/offline preserves last good values; capability controls action; household readiness prevents old scope. Fatal summary failure no invalida Home completo.
- **Quality:** row targets/labels, section headings, 2×, local live announcements; no content/raw errors telemetry.
- **Delivery:** `HomePlannerSections.tsx`, summary error adapter/parser tests; backend contract unchanged. Aceptación P0: no contradiction/code in any partial combination. Tests all 2³ section outcomes, one-tap, stale/offline/household. Pregunta: **¿Aprobás este bloque único y jerarquía Task/Event/Goal?**

## D31 — Semántica accesible y acciones equivalentes

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `MANDATORY_QUALITY_RULE`

- **Decision:** every control has name/role/value/state; row order primary→body→overflow; custom `accessibilityActions` mirror swipe/long press commands; gestures never exclusive. Focus enters/exits sheets/menus and returns trigger; errors/status announced once; confirmation names consequence.
- **Edges:** selected/disabled/busy/expanded, 0–3 capabilities, virtual keyboard, screen reader touch exploration. Long titles announced complete but labels stay concise.
- **Motion/privacy:** Reduce Motion independent; haptics nonessential. Accessibility labels can contain local entity titles for reading but must never enter telemetry/logging.
- **Delivery:** acceptance gate every M11-D block. Tests TalkBack Android mandatory; VoiceOver before final cross-platform release where supported. Derived from WCAG/RN/Apple; no human vote.

## D32 — Dynamic Type y adaptación responsive

**Status:** `APPROVED_WITH_REFINEMENT` · `MANDATORY_QUALITY_RULE`

- **Decision:** acceptance matrix 320 dp and font scale 1.0/1.3/1.6/2.0. Reflow: Quick 3→2+1→1; rows metadata wraps/moves; filters become button+sheet; Month drops density before numbers; forms one column; no fixed content heights.
- **Resilience:** landscape/tablet may add whitespace/max width, never stretch tiles/fields. Keyboard and safe areas remain. RTL deferred as locale scope but start/end-safe primitives required.
- **Delivery:** all presentation components. Aceptación/tests screenshot at every matrix point, no clipping/overlap/two-dimensional scroll except justified Calendar. No human vote.

## D33 — Ergonomía y comportamiento por plataforma

**Status:** `APPROVED_WITH_REFINEMENT` · `MANDATORY_QUALITY_RULE`

- **Case:** audit runtime Android; iOS guidance researched but not executed. Job: familiar one-handed actions without platform conflict.
- **Decision:** common semantic behavior, platform-native gesture recognition/menu/haptics. Android: respect predictive/system Back edge; gesture begins away from reserved edge or yields to system; 48 dp. iOS: standard swipe/context menu conventions and 44 pt; never redefine three-finger undo/system gestures. No custom platform divergence in action result.
- **Resilience:** mouse/keyboard/tablet inputs use visible controls/menus; haptics best-effort. Offline/capability same semantics.
- **Delivery:** platform QA, not branching business logic. Aceptación/tests: Android hardware/predictive Back, one-hand reach, iOS VoiceOver/swipe/context menu before release. No human vote; missing iOS runtime is a test requirement, not a blocked design decision.

## D34 — Rendimiento percibido y continuidad visual

**Status:** `DERIVED_FROM_APPROVED_DECISION` · `MANDATORY_QUALITY_RULE`

- **Case:** stuck submit and contradictory Home break trust more than raw latency. Job: always know whether data is loading, saved or recoverable.
- **Decision:** feedback within one frame/100 ms; preserve layout/data on refresh; local busy; skeleton initial only; success exits conclusively; uncertain state names uncertainty; optimistic removal waits for rollback-safe point; no long decorative transition.
- **Resilience:** network slow/offline, duplicate taps, conflict, household generation and late responses. Existing idempotency/cache contracts remain authority.
- **Quality/privacy:** busy/status semantics; reduced no collapse; telemetry duration buckets/outcomes only.
- **Delivery:** P0-2/P0-3 plus shared feedback. Aceptación/tests: 0/500/5k/timeout latency simulation, duplicate taps, late success, rollback. Derived from D10/D15/D29 and P0; no vote.

## D35 — Aprendizaje progresivo

**Status:** `APPROVED_WITH_REFINEMENT` · `HUMAN_APPROVAL_REQUIRED`

- **Case:** premium efficiency must not require prior knowledge. Job: succeed first with visible controls, then discover shortcuts.
- **Decision:** self-evident base UI; one contextual swipe hint D18; progressive form/filter disclosure; no carousel/tutorial/modal. Advanced actions remain refindable in labeled overflow/`Más opciones`. No gamification or repeated coachmarks.
- **Resilience:** hints pause during errors/offline/transition; dismissed means dismissed; no profile inference. Screen reader gets actions directly, not visual gesture lesson.
- **Privacy/motion:** only allowlisted shown/dismissed/used; no animation beyond subtle appear, reduced instant.
- **Delivery:** education state + labels. Aceptación/tests: first-time/returning/dismissed, no blockage, shortcut remains optional. Pregunta: **¿Aprobás aprendizaje contextual único en lugar de onboarding global?**

## D36 — Telemetría de experiencia y privacidad

**Status:** `APPROVED_WITH_REFINEMENT` · `MANDATORY_QUALITY_RULE`

- **Case:** medir fricción/P0/learning sin registrar vida familiar. Job: detectar problemas de experiencia y verificar cierre.
- **Decision:** allowlisted only: surface, action category, outcome, duration bucket, retry bucket, capability-count bucket, font-scale bucket, reduce-motion boolean, gesture type, hint shown/dismissed, undo used, incident ID opaque. Explicitly forbidden: titles/descriptions/names/households/locations/queries/notes/tokens/entity IDs/raw errors/stacks/screenshots.
- **Resilience:** telemetry failure is silent and never changes UX; household/session lifecycle clears context; no offline queue with content. New event requires catalog registration/privacy tests/authorization during F3.
- **Quality:** accessibility usage is coarse setting bucket only if policy approves; never infer disability. No external provider introduced.
- **Delivery:** telemetry catalog/adapters/tests only in M11-F3 after UI approval. Aceptación: forbidden-key/content canary tests, allowlist rejection, no raw error. No human vote for privacy floor; event collection itself remains implementation authorization.

---

## Registry totals

| Outcome | Count | Decisions |
|---|---:|---|
| APPROVED_AS_IS | 4 | D3, D4, D5, D24 |
| APPROVED_WITH_REFINEMENT | 21 | D1, D2, D6–D11, D13, D15, D18, D20, D23, D25, D26, D28, D30, D32, D33, D35, D36 |
| DERIVED_FROM_APPROVED_DECISION | 11 | D12, D14, D16, D17, D19, D21, D22, D27, D29, D31, D34 |
| REPLACED | 0 | — |
| MERGED | 0 | — |
| DEFERRED_OUT_OF_SCOPE | 0 global; one D28 subcapability | template creation/edit |
| BLOCKED_BY_MISSING_EVIDENCE | 0 | — |
| APPROVED_AND_FROZEN under CR-M11-11A-GLOBAL-SURFACES-001 (2026-08-02) | 12 | GS-01..GS-12 |

**Historical approval set (resolved 2026-07-22):** the 18 questions formerly
requiring human approval were D1–D11, plus D13, D15, D18, D23, D28, D30 and
D35. Their final result is **APPROVED**, subject to the canonical functional
freeze and the supersession notes above. D20 is covered by D10's intensity
approval. Mandatory accessibility, privacy, P0 closure and absence of technical
codes remain non-optional. This documentation update does not authorize code;
M11.1A requires a separate prompt after the documentation commit.

---

## 11A.P3 / CR-M11-11A-GLOBAL-SURFACES-001

**Change ID:** CR-M11-11A-GLOBAL-SURFACES-001  
**Requester:** Human Product Owner / Control General  
**Reason:** Close the Global Surfaces after the readiness audit, factual
inventory, comparative research (P1A–P1D), integrated synthesis (P2) and the
P3 human decisions.  
**Approval date:** 2026-08-02  
**Authority link:** `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` version 1.3,
section 1.3 — Global Surfaces change-controlled freeze.  
**Status of every decision below:** `APPROVED_AND_FROZEN`. No
`HUMAN_APPROVAL_REQUIRED` state remains for these items. Implementation is
**not** authorized by this block; only the 11A.1 Technical Architecture /
Contract Readiness Audit may start the implementation chain.

### GS — Decision registry

Each entry records: previous behavior, new frozen behavior, impact, risks,
dependencies, evidence.

| ID | Decision | Previous behavior | New frozen behavior | Impact | Risks | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| GS-01 | Global architecture = `Global Equilibrada` | Bottom nav with Planner-led surfaces; no global Search/Attention/Activity; Trash fragmented; Archive only Plans. | Bottom nav unchanged; Home, Quick Actions, Search, Attention, Activity, Trash and Archive have distinct responsibilities; Inventory gated; Geni hidden until implemented. | Product: coherent global layer. Frontend: new global surfaces. Backend/data: aggregation, Activity, hidden-content contexts. Permissions: coordinator authority for permanent delete/Empty Trash. Offline/reliability: queued/deferred actions. | Shell churn if scoped loosely; privacy leaks if filters not enforced before ranking. | 11A.1 technical audit; Inventory polish before global Trash/Archive participation. | P0, P1A, P1B, P1C, P1D, P2. |
| GS-02 | Home = híbrida orientadora | Planner-first Home with Inventory urgency card; no real Attention/Activity. | Household context, conditional Attention excerpt, Today/Next, Planner continuity when valuable, Inventory exception, offline/stale/partial states. No module grid, no permanent Search bar, no Activity, no Trash/Archive, no decorative metrics. | Product: clearer orientation. Frontend: Home restructuring. Backend: must feed hybrid surface. | Implementation sprawl if Home becomes a feed. | Existing `useHomePlannerSummary`; Inventory alert hook. | P1B, P2 §12. |
| GS-03 | Quick Actions + Search single surface | Center `+` opens actions sheet; Search is a gated Planner placeholder. | The central button opens one surface whose top bar is `Buscar en HomePlus...` and whose grid has `Tarea/Evento/Plan` (and `Geni` only when implemented). Search opens full-screen; the sheet closes/transitions to Search. | Product: one global action surface. Frontend: restructure sheet entry. Backend: Search endpoint required. | Sheet/Search transition must not lose drafts/cancel. | `PlannerSheetHost`; new global Search endpoint. | P1A, P2 §11.2/§13. |
| GS-04 | Search scope = active Tasks/Events/Plans | Search included Drafts, Presets, people, settings, actions, routes. | Initial scope: active Tasks, Events, Plans. Inventory, Drafts, Presets, People, Settings, routes, commands, archived, trash excluded from normal scope. Explicit contexts `Activos/Archivados/Papelera`. | Product: predictable retrieval. Backend: simpler index. Privacy: clearer scope. | Hidden content leaking into active results. | 11A.1 search contract. | P1A, P1D, P2 §13.2. |
| GS-05 | Attention + Activity one shared surface with tabs | No global Attention/Activity; Planner-only local attention filter; Home count card. | One `Atención y actividad` full-screen surface with two tabs. Attention persists until resolution; no read/view resolution; one primary action + `Abrir`; badge counts only unresolved Attention. Activity is chronological, no unread, no `Marcar todo como leído`, no badge, no inline mutations. | Product: actionable queue. Frontend: new top-level surface. Backend: Attention source/count and Activity feed endpoints. | Badges becoming noisy; Activity leaking technical noise. | Realtime bridge passive; Activity backend endpoint. | P1C, P2 §14. |
| GS-06 | Geni in Attention/Activity (pending proposal → Attention; confirmed → grouped Activity row) | Geni not implemented; not represented. | Pending proposal in Attention, Geni identified, person confirms/rejects. Confirmed result in Activity as one grouped row with `Ver proceso` showing author and order per step; never three independent rows for one operation. Failed/uncertain never appears as success; remains or returns to Attention. | Product: traceable AI actions. Frontend: Activity grouping. Backend: process correlation. | Geni ops appearing as successes prematurely. | Geni not implemented; contract deferred to 11A.1+ Geni milestone. | P1C, P2 §14.3. |
| GS-07 | Global Trash with module filters | Trash fragmented: Planner Trash + Preset/Draft Trash separate; Inventory soft-delete only. | One global Trash under `More ▸ Papelera` with local prefiltered entries (Planner/Tasks/Events/Plans/Presets; Inventory when restore ready). Filters: module, type, deletion date, remaining time, scope. 30-day retention with human copy of exact purge date. | Product: unified recovery. Frontend: single surface with filters. Backend: aggregator across modules. | Privacy if owner-only Drafts are included (they are not). | 11A.1 global Trash aggregation contract. | P1D, P2 §15. |
| GS-08 | Drafts: `Descartar borrador` (immediate, definitive); Drafts leave Trash | Persistent Drafts entered Trash, recoverable 30 days; `Enviar a Papelera` and `Restaurar borrador eliminado` existed. | Drafts are private, never appear in Home/Search/Attention/Activity/Archive/Trash. `Descartar borrador` is immediate and definitive. `Eliminar`, `Mover a Papelera` and `Restaurar borrador eliminado` are forbidden. | Product: simpler Draft lifecycle. Data/migration: adapt/retire existing persistent Draft restore. Backend: remove Draft recovery mutation. Privacy: stronger. | Existing Draft restore code paths left inconsistent. | Technical audit question — see §11 of P4 doc. Functional Freeze §7.3, §12.5 superseded. | P1D, P2 §15.2, §17.1. |
| GS-09 | Archive contextual per module (Tasks/Events/Plans/Presets/Inventory) | Archive Plans-only; route registered, no screen. | Archive is a visibility/preservation state independent of operational state. Tasks, Events, Plans, Presets and Inventory Items are archivable. No single global Archive screen; each module exposes contextual Archive. Archive ≠ Completed/Closed/Cancelled/Trash; no automatic retention; no direct permanent delete; Unarchive or move to Trash by permission. Inventory Archive approved as result but waits for Inventory polish/contract. | Product: cross-module Archive. Frontend: contextual Archive screens. Backend: archived_at per entity. | Blurring Archive with Completed/Closed. | 11A.1 Archive contract per module; Inventory contract. Functional Freeze §10.3, §10.16 superseded. | P1D, P2 §15.1. |
| GS-10 | `Eliminar definitivamente` + `Vaciar Papelera` (coordinator-only, inside Trash) | Planner V1 disallowed immediate manual permanent deletion. | Inside Trash only: coordinator may `Eliminar definitivamente` (one or many) and `Vaciar Papelera`. Explicit confirmation showing entity/quantity, consequences, cannot-undo. Never offline, never on active entity/Home/Attention/Activity/normal Search. Empty Trash tolerates partial failure; failed items remain visible; success/failure distinguished. | Product: irreversible cleanup path exists. Permissions: coordinator authority. Backend: irreversible mutation. Privacy: removes content from ranking. | Irreversible human error. | 11A.1 coordinator capability + transactional purge contract. Functional Freeze §7.3, §19 superseded. | P1D, P2 §15.2. |
| GS-11 | Privacy applied before ranking/badge/grouping/recents/results/Activity/Attention/Trash/Archive | Privacy noted but no consolidated pre-rule. | Apply household/personal scope, ownership, role and entity permissions before any surfacing or counting. Personal content never reaches household feed. Household switch resets global context. Geni always identified. Activity coordinates, not surveils. No reveal of titles/counts/existence of others' private content. Coordinator does not auto-gain access to private personal content. | Product: trust. Backend: RLS-aware filters and counts. | Surveillance creep via Activity. | 11A.1 privacy/RLS audit. | P1C, P1D, P2 §17. |
| GS-12 | Phone/tablet surfaces + accessibility floor | Responsive noted generally; no Global Surfaces floor. | Phone: Home single-column; Quick Actions accessible sheet; Search/Attention/Activity/Trash/Archive full-screen; labels visible; no ambiguous icon-only. Tablet: Home two columns same priority; Search overlay/split; Attention/Activity list+detail; Trash filters+list+recovery context. Android 48 dp; iOS 44 pt; Dynamic Type/reflow; screen reader; visible focus; logical order; no color-only; Reduce Motion; accessible destructive confirmations; semantically labelled badge; offline/stale and purge date announced understandably. | Product: cross-device parity. QA: matrix scope. | Tablet becoming a different product. | Existing accessibility contracts; 11A.1 surface contracts. | P1A (accessibility), P1B (tablet), P2 §11.9/§11.10. |

### Superseded historical Registry items

The following older Registry statements remain for traceability but are
**SUPERSEDED BY CR-M11-11A-GLOBAL-SURFACES-001**:

- D7 / D30 historical `Meta`/`Goal` references — preserved with existing
  supersession notes; nothing in this change alters that.
- D1 historical "Quick Actions = tiles" wording — the surface is now the
  shared Quick Actions + Search surface (see GS-03). The tile visual rule
  within that surface remains valid.
- D30 historical Home block structure — Home hybrid shape is now GS-02.
- D21/D22/D29 historical attention/list/state visual rules — global
  Attention/Activity shape is now GS-05; local list rules remain valid where
  they do not conflict.
- Any prior `HUMAN_APPROVAL_REQUIRED` state for GS-01..GS-12 is removed.

Implementations must follow `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` version 1.3
section 1.3 and `M11_11A_P4_GLOBAL_SURFACES_PRODUCT_FREEZE.md`.

---

## Registry totals (after CR-M11-11A-GLOBAL-SURFACES-001)
