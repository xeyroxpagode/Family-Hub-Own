**# Producto: HomePlus — Sistema Operativo del Hogar**

**\*\*Versión:\*\* 1.0**

**\*\*Fecha:\*\* Junio 2026**

**\*\*Dependencias:\*\* FinalSpec V1 §14-15-19-20-23, DB Schema V1**



**> \*\*Principio rector:\*\* El sistema es reactivo por diseño. Acciones de usuarios, cambios de estado y**

**> triggers temporales generan eventos que disparan notificaciones, automatizaciones, intervenciones**

**> de Geni y registros de auditoría.**



**# PARTE 1: CATÁLOGO COMPLETO DE EVENTOS**



**## Leyenda de Consumidores**



**| Código | Sistema | Descripción |**

**|--------|---------|-------------|**

**| \*\*N\*\* | Notificaciones | Push in-app al/los miembro/s afectado/s |**

**| \*\*E\*\* | Email | Email transaccional (solo si el miembro lo activó) |**

**| \*\*G\*\* | Geni | Capa de IA: pattern detection, recomendaciones |**

**| \*\*A\*\* | Automatizaciones | Motor SI X → ENTONCES Y |**

**| \*\*AU\*\* | Auditoría | Registro inmutable append-only (audit\_logs) |**

**| \*\*F\*\* | Feed | Post automático en el feed del hogar |**

**| \*\*B\*\* | Briefing | Inclusión en el resumen diario de Geni |**

**| \*\*ST\*\* | Streaks | Actualización de rachas (streaks table) |**

**| \*\*S\*\* | SOS | Sistema de emergencia (siempre activo, nunca silenciable) |**



**## Leyenda de Prioridades**



**| Prioridad | Significado | Comportamiento |**

**|-----------|-------------|----------------|**

**| \*\*🔴 CR\*\* | Crítica — no silenciable, ignora quiet hours | Push inmediato + email + SMS si está configurado |**

**| \*\*🟠 AL\*\* | Alta — ignora quiet hours, respeta opt-in | Push inmediato + email si está configurado |**

**| \*\*🟡 ME\*\* | Media — respeta quiet hours, respeta opt-in | Push estándar, se agrupa si hay múltiples en ventana corta |**

**| \*\*🟢 BA\*\* | Baja — solo in-app, respeta quiet hours | Sin push. Visible en centro de notificaciones in-app |**



**## Leyenda de Comportamiento Offline**



**| Código | Comportamiento |**

**|--------|----------------|**

**| \*\*Q\*\* | Encolar — se guarda en cola local, se emite al sincronizar |**

**| \*\*L\*\* | Local-first — se ejecuta localmente, se sincroniza después |**

**| \*\*D\*\* | Descartar — no tiene sentido offline, se descarta |**

**| \*\*S\*\* | Solo online — requiere conexión, se bloquea si no hay |**



**---**



**## 1. PEOPLE \& AUTH**



**### 1.1 member.invited**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Coordinador (o adulto con permiso) crea una invitación en `invitations` |**

**| \*\*Payload\*\* | `{ household\_id, invitation\_id, invited\_by: member\_id, email, phone, suggested\_role, message, token, expires\_at }` |**

**| \*\*Consumidores\*\* | N (→ invitado via email/SMS), E (→ invitado), AU (→ audit\_log), B (→ coordinador: "Invitación pendiente") |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q — se encola y envía al sincronizar |**



**### 1.2 invitation.accepted**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Invitado acepta invitación via token → `invitations.status = 'accepted'`, se crea `household\_members` |**

**| \*\*Payload\*\* | `{ invitation\_id, household\_id, member\_id, user\_id, display\_name, role, accepted\_at }` |**

**| \*\*Consumidores\*\* | N (→ coordinador: "X aceptó la invitación"), AU, B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 1.3 invitation.expired**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `expires\_at < now()` con `status = 'pending'` → `status = 'expired'` |**

**| \*\*Payload\*\* | `{ invitation\_id, household\_id, email, phone, invited\_by: member\_id, expires\_at }` |**

**| \*\*Consumidores\*\* | N (→ coordinador: "Invitación a \[email] expiró"), AU, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | S — cron server-side |**



**### 1.4 invitation.cancelled**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Coordinador cancela invitación → `status = 'cancelled'` |**

**| \*\*Payload\*\* | `{ invitation\_id, household\_id, email, phone, cancelled\_by: member\_id }` |**

**| \*\*Consumidores\*\* | AU, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 1.5 member.joined**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Se crea `household\_members` con `status = 'active'` (post-aceptación o creación directa por coordinador) |**

**| \*\*Payload\*\* | `{ household\_id, member\_id, user\_id, display\_name, role, joined\_at }` |**

**| \*\*Consumidores\*\* | N (→ todos los miembros: "¡X se unió al hogar!"), F (→ post automático de bienvenida), AU, A (→ trigger: `member\_joined`), B, ST (→ inicializa contador de racha) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 1.6 member.removed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Coordinador hace soft-delete: `status = 'finalized'`, `left\_at = now()` |**

**| \*\*Payload\*\* | `{ household\_id, member\_id, display\_name, role, removed\_by: member\_id, left\_at }` |**

**| \*\*Consumidores\*\* | N (→ coordinador confirma; → resto del hogar: "X ya no es parte del hogar"), AU, B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 1.7 member.role\_changed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Coordinador cambia `role` de un miembro en `household\_members` |**

**| \*\*Payload\*\* | `{ household\_id, member\_id, display\_name, old\_role, new\_role, changed\_by: member\_id }` |**

**| \*\*Consumidores\*\* | N (→ miembro afectado: "Ahora eres \[rol]"), N (→ coordinador: confirmación), AU, B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 1.8 user.registered**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Nuevo usuario crea cuenta en `auth.users` (Supabase Auth) |**

**| \*\*Payload\*\* | `{ user\_id, email, phone, registered\_at }` |**

**| \*\*Consumidores\*\* | AU (en Supabase Auth), B (primer briefing de bienvenida) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | D — no puede registrarse sin conexión |**



**### 1.9 user.onboarding\_completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Usuario completa el flujo de onboarding (crear/perfilar hogar, invitar miembros, configurar preferencias) |**

**| \*\*Payload\*\* | `{ user\_id, member\_id, household\_id, steps\_completed: \[], completed\_at }` |**

**| \*\*Consumidores\*\* | G (→ inicia aprendizaje del hogar), B (→ primer briefing completo) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 1.10 household.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Usuario crea su primer hogar (`INSERT INTO households`) |**

**| \*\*Payload\*\* | `{ household\_id, name, slug, timezone, default\_language, created\_by: user\_id }` |**

**| \*\*Consumidores\*\* | AU, G (→ inicializa contexto del hogar) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | S |**



**### 1.11 household.settings\_changed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Coordinador modifica `config` del hogar (timezone, idioma, umbrales Geni, etc.) |**

**| \*\*Payload\*\* | `{ household\_id, changed\_by: member\_id, old\_config: {}, new\_config: {}, changed\_keys: \[] }` |**

**| \*\*Consumidores\*\* | AU, G (→ reconfigura umbrales de intervención), A (→ puede invalidar automatizaciones) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**---**



**## 2. TASKS**



**### 2.1 task.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro autorizado crea una tarea (`INSERT INTO tasks`). Adultos, Coordinador, Senior para tareas del hogar; Adolescentes para tareas propias (§04.05). |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, description, visibility, priority, due\_date, due\_time, recurrence\_rule, responsibility\_id, created\_by: member\_id, assigned\_to: member\_id }` |**

**| \*\*Consumidores\*\* | N (→ assigned\_to: "Nueva tarea: \[title]"), AU, A (→ trigger: `task\_created`), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q — se crea localmente (con UUID pre-generado) y sincroniza |**



**### 2.2 task.assigned**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Se asigna o reasigna `assigned\_to` en una tarea existente |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, old\_assignee: member\_id \\| null, new\_assignee: member\_id, assigned\_by: member\_id }` |**

**| \*\*Consumidores\*\* | N (→ new\_assignee: "Te asignaron: \[title]"), AU, G (→ recalcula carga de tareas), A |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 2.3 task.started**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Asignado cambia `status: 'pending' → 'in\_progress'` |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, started\_by: member\_id, started\_at }` |**

**| \*\*Consumidores\*\* | N (→ created\_by: "\[Display\_name] empezó \[title]"), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 2.4 task.completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Asignado (o adulto/coordinador) marca `status → 'completed'`, establece `completed\_by`, `completed\_at` |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, completed\_by: member\_id, assigned\_to: member\_id, was\_overdue: boolean, completed\_at }` |**

**| \*\*Consumidores\*\* | N (→ created\_by y assigned\_to si son diferentes), F (→ post si visibility='household'), AU, A (→ trigger: `task\_completed`), B, ST (→ actualiza racha), G (→ evalúa patrón de carga) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q — se marca localmente, sincroniza al reconectar |**



**### 2.5 task.verified**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Coordinador o adulto verifica una tarea completada (`verified\_by`, `verified\_at`) — mecanismo de verificación parental (§06.13) |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, completed\_by: member\_id, verified\_by: member\_id, verified\_at }` |**

**| \*\*Consumidores\*\* | N (→ completed\_by: "¡\[Verificador] confirmó tu tarea!"), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 2.6 task.cancelled**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Creador o coordinador marca `status → 'cancelled'` |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, cancelled\_by: member\_id, reason }` |**

**| \*\*Consumidores\*\* | N (→ assigned\_to si no es quien cancela), AU, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 2.7 task.overdue**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON diario detecta `due\_date < today()` con `status IN ('pending','in\_progress')` y `deleted\_at IS NULL` |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, assigned\_to: member\_id, due\_date, days\_overdue: integer }` |**

**| \*\*Consumidores\*\* | N (→ assigned\_to), G (→ acumula para patrón de escalamiento), B, A |**

**| \*\*Prioridad\*\* | 🟠 AL (si days\_overdue > 1), 🟡 ME (día 1) |**

**| \*\*Offline\*\* | S — solo se dispara por cron server-side |**



**### 2.8 task.reminder\_due**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON evalúa `due\_date` contra preferencias de notificación del asignado |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, assigned\_to: member\_id, due\_date, due\_time, hours\_remaining }` |**

**| \*\*Consumidores\*\* | N (→ assigned\_to), E (→ assigned\_to si configurado) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S — cron server-side |**



**### 2.9 task.escalation\_level\_1**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni detecta ≥3 tareas atrasadas del mismo miembro (Día 1 del modelo de escalamiento) |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, overdue\_count: integer, task\_ids: \[], days\_overdue\_max: integer, escalation\_level: 1 }` |**

**| \*\*Consumidores\*\* | N (→ SOLO el miembro afectado, tono neutro, privado), G (→ registra en patterns\_log) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S — solo Geni server-side |**



**### 2.10 task.escalation\_level\_2**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni escala tras silencio del miembro (Día 4 del modelo, segundo aviso) |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, overdue\_count: integer, task\_ids: \[], escalation\_level: 2, warning: "Mañana aviso al coordinador" }` |**

**| \*\*Consumidores\*\* | N (→ SOLO el miembro, tono directo, advertencia explícita), G (→ patterns\_log) |**

**| \*\*Prioridad\*\* | 🟠 AL |**

**| \*\*Offline\*\* | S |**



**### 2.11 task.escalation\_level\_3**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni escala al coordinador (Día 5+ del modelo) |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, coordinator\_ids: \[], overdue\_count: integer, task\_ids: \[], task\_titles: \[], escalation\_level: 3 }` |**

**| \*\*Consumidores\*\* | N (→ coordinador/es, tono informativo, sin juicio), G (→ patterns\_log), B |**

**| \*\*Prioridad\*\* | 🟠 AL |**

**| \*\*Offline\*\* | S |**



**### 2.12 task.escalation\_level\_4**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni expone en Briefing familiar tras ≥7 días sin acción |**

**| \*\*Payload\*\* | `{ household\_id, member\_id, overdue\_count: integer, task\_ids: \[], task\_titles: \[], escalation\_level: 4 }` |**

**| \*\*Consumidores\*\* | B (→ briefing familiar, tono neutro, enfoque en solución: "Hay 3 tareas sin dueño activo. Como familia, ¿quieren redistribuirlas?"), G (→ patterns\_log) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**### 2.13 task.reassigned**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Se cambia `assigned\_to` en tarea en progreso o atrasada |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, old\_assignee: member\_id, new\_assignee: member\_id, reassigned\_by: member\_id, reason }` |**

**| \*\*Consumidores\*\* | N (→ old\_assignee y new\_assignee), AU, G (→ recalcula asimetría), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 2.14 task.commented**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro agrega comentario en `task\_comments` |**

**| \*\*Payload\*\* | `{ comment\_id, task\_id, task\_title, author\_id: member\_id, content\_preview: "primeros 80 chars", mentioned\_members: \[] }` |**

**| \*\*Consumidores\*\* | N (→ assigned\_to y created\_by si no son el autor; → miembros mencionados), AU |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 2.15 subtask.completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Se completa una sub-tarea (`parent\_task\_id IS NOT NULL`) |**

**| \*\*Payload\*\* | `{ subtask\_id, parent\_task\_id, household\_id, title, completed\_by: member\_id, remaining\_subtasks: integer, total\_subtasks: integer }` |**

**| \*\*Consumidores\*\* | N (→ assigned\_to de la tarea padre), F (si es la última subtask), ST, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 2.16 task.progress\_updated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Cambio en progreso de tarea (para tareas con subtareas; se calcula %) |**

**| \*\*Payload\*\* | `{ task\_id, household\_id, title, progress\_pct: float, completed\_subtasks: integer, total\_subtasks: integer }` |**

**| \*\*Consumidores\*\* | N (→ assigned\_to y created\_by), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**---**



**## 3. CALENDAR**



**### 3.1 event.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro autorizado crea evento (`INSERT INTO events`). Adultos, Coordinador, Senior, Adolescente para eventos familiares (§04.05). |**

**| \*\*Payload\*\* | `{ event\_id, household\_id, title, description, visibility, all\_day, starts\_at, ends\_at, location\_name, recurrence\_rule, created\_by: member\_id, participants: \[] }` |**

**| \*\*Consumidores\*\* | N (→ participantes), AU, A (→ trigger: `event\_created`), B, G (→ evalúa conflictos) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 3.2 event.updated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Creador o coordinador modifica campos del evento |**

**| \*\*Payload\*\* | `{ event\_id, household\_id, title, updated\_by: member\_id, changed\_fields: \[], old\_starts\_at, new\_starts\_at, old\_ends\_at, new\_ends\_at }` |**

**| \*\*Consumidores\*\* | N (→ participantes si cambió fecha/hora/ubicación), AU, G (→ re-evalúa conflictos), B |**

**| \*\*Prioridad\*\* | 🟡 ME (🟠 AL si cambió fecha con <24h de anticipación) |**

**| \*\*Offline\*\* | Q |**



**### 3.3 event.cancelled**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Creador o coordinador marca `status → 'cancelled'` |**

**| \*\*Payload\*\* | `{ event\_id, household\_id, title, cancelled\_by: member\_id, reason, was\_recurring: boolean }` |**

**| \*\*Consumidores\*\* | N (→ todos los participantes), AU, B |**

**| \*\*Prioridad\*\* | 🟡 ME (🟠 AL si el evento era ≤2h) |**

**| \*\*Offline\*\* | Q |**



**### 3.4 event.completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Evento pasa su `ends\_at` y se marca `status → 'completed'` (automático o manual) |**

**| \*\*Payload\*\* | `{ event\_id, household\_id, title, completed\_at }` |**

**| \*\*Consumidores\*\* | F (→ si era evento del hogar: "\[title] terminó"), B, ST |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 3.5 event.conflict\_detected**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni detecta 2+ eventos solapados para el mismo miembro |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, event\_a: {id, title, starts\_at, ends\_at}, event\_b: {id, title, starts\_at, ends\_at}, overlap\_minutes: integer }` |**

**| \*\*Consumidores\*\* | N (→ SOLO el miembro afectado: "Tienes dos eventos solapados"), G (→ patterns\_log si es recurrente), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**### 3.6 event.reminder\_due**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON evalúa `starts\_at - recordatorio\_configurado` (30min, 1h, 1d según preferencia) |**

**| \*\*Payload\*\* | `{ event\_id, household\_id, title, starts\_at, location\_name, minutes\_until: integer }` |**

**| \*\*Consumidores\*\* | N (→ todos los participantes que aceptaron), E (si configurado) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S — cron server-side |**



**### 3.7 event.participant\_added**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Se agrega miembro a `event\_participants` |**

**| \*\*Payload\*\* | `{ event\_id, event\_title, household\_id, member\_id, added\_by: member\_id, starts\_at }` |**

**| \*\*Consumidores\*\* | N (→ miembro agregado: "Te invitaron a \[event\_title]"), AU |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 3.8 event.participant\_removed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Se remueve miembro de `event\_participants` |**

**| \*\*Payload\*\* | `{ event\_id, event\_title, household\_id, member\_id, removed\_by: member\_id }` |**

**| \*\*Consumidores\*\* | N (→ miembro removido), AU |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**---**



**## 4. GOALS**



**### 4.1 goal.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto o Coordinador crea una meta (`INSERT INTO goals`) |**

**| \*\*Payload\*\* | `{ goal\_id, household\_id, title, description, visibility, category, target\_type, target\_value, unit, starts\_at, ends\_at, created\_by: member\_id }` |**

**| \*\*Consumidores\*\* | N (→ hogar si visibility='household'), F (→ post si es meta familiar), AU, B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 4.2 goal.milestone\_completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `milestones.achieved` pasa a `true` |**

**| \*\*Payload\*\* | `{ goal\_id, milestone\_id, household\_id, goal\_title, milestone\_title, target\_value, achieved\_at }` |**

**| \*\*Consumidores\*\* | N (→ created\_by del goal), F (→ post con related\_entity\_type='milestone'), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 4.3 goal.completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `goals.status → 'completed'`, `current\_value ≥ target\_value`, `completed\_at` |**

**| \*\*Payload\*\* | `{ goal\_id, household\_id, title, created\_by: member\_id, target\_value, final\_value, completed\_at, duration\_days }` |**

**| \*\*Consumidores\*\* | N (→ todo el hogar si visibility='household'), F (→ celebración automática), AU, B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 4.4 goal.failed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `ends\_at` pasó y `current\_value < target\_value` sin extensión → `status → 'failed'` |**

**| \*\*Payload\*\* | `{ goal\_id, household\_id, title, created\_by: member\_id, target\_value, final\_value, ends\_at }` |**

**| \*\*Consumidores\*\* | N (→ created\_by, tono neutro: "La meta \[title] venció sin alcanzarse. ¿Quieres crear una nueva?"), G (→ sugiere ajuste de meta), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | S — cron server-side |**



**### 4.5 goal.progress\_updated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `current\_value` cambia (manual o automático vía automatización) |**

**| \*\*Payload\*\* | `{ goal\_id, household\_id, title, old\_value, new\_value, target\_value, progress\_pct: float, updated\_by: member\_id }` |**

**| \*\*Consumidores\*\* | N (→ created\_by si el progreso fue por otro), B, A (→ puede disparar otras metas) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**---**



**## 5. FINANCE**



**### 5.1 expense.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro autorizado registra un gasto (`INSERT INTO expenses`). Adultos, Coordinador, Senior, Adolescente (§04.05). |**

**| \*\*Payload\*\* | `{ expense\_id, household\_id, account\_id, description, amount, currency, category, visibility, paid\_by: member\_id, due\_date, is\_recurring, status }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador si visibility='household'), AU, A (→ trigger: `expense\_added`), B, G (→ evalúa patrón de gasto) |**

**| \*\*Prioridad\*\* | 🟡 ME (🟠 AL si amount > umbral\_configurado) |**

**| \*\*Offline\*\* | Q |**



**### 5.2 expense.updated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Creador o coordinador modifica un gasto |**

**| \*\*Payload\*\* | `{ expense\_id, household\_id, description, updated\_by: member\_id, changed\_fields: \[], old\_amount, new\_amount }` |**

**| \*\*Consumidores\*\* | N (→ adultos si cambió monto o categoría), AU, G, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 5.3 expense.annulled**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Creador o coordinador anula gasto: `status → 'annulled'`, `annulled\_at = now()` (§07.13: los gastos no se eliminan, se anulan) |**

**| \*\*Payload\*\* | `{ expense\_id, household\_id, description, amount, category, annulled\_by: member\_id, reason }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), AU (+++ detallado por ser anulación financiera), G |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 5.4 income.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto, Senior o Coordinador registra un ingreso (`INSERT INTO incomes`) |**

**| \*\*Payload\*\* | `{ income\_id, household\_id, account\_id, description, amount, currency, category, received\_by: member\_id, date }` |**

**| \*\*Consumidores\*\* | AU, A (→ trigger: recalcular balances), B, G |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 5.5 budget.threshold\_warning**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON/trigger evalúa: `SUM(expenses) / budget.amount ≥ alert\_threshold` (configurable, default 0.85 según DB Schema) |**

**| \*\*Payload\*\* | `{ budget\_id, household\_id, budget\_name, category, budget\_amount, spent\_amount, spent\_pct: float, alert\_threshold, period }` |**

**| \*\*Consumidores\*\* | N (→ coordinador y adultos), G (→ sugiere ajuste), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**### 5.6 budget.exceeded**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `SUM(expenses) ≥ budget.amount` |**

**| \*\*Payload\*\* | `{ budget\_id, household\_id, budget\_name, category, budget\_amount, spent\_amount, spent\_pct: float, overspent\_by, period }` |**

**| \*\*Consumidores\*\* | N (→ coordinador y adultos, tono directo), E (→ coordinador), G (→ patterns\_log si es ≥3 semanas), B |**

**| \*\*Prioridad\*\* | 🟠 AL |**

**| \*\*Offline\*\* | S |**



**### 5.7 debt.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto o Coordinador crea deuda entre miembros (`INSERT INTO debts`) |**

**| \*\*Payload\*\* | `{ debt\_id, household\_id, from\_member\_id, to\_member\_id, amount, currency, description, due\_date }` |**

**| \*\*Consumidores\*\* | N (→ deudor y acreedor), AU, G (→ inicia contador de días), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 5.8 debt.paid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `remaining = 0`, `status → 'paid'`, `settled\_at = now()` |**

**| \*\*Payload\*\* | `{ debt\_id, household\_id, from\_member\_id, to\_member\_id, amount, settled\_at }` |**

**| \*\*Consumidores\*\* | N (→ deudor y acreedor: "Deuda saldada"), AU, G (→ limpia contador), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 5.9 debt.overdue**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `due\_date < today()` con `status = 'active'` y `remaining > 0` |**

**| \*\*Payload\*\* | `{ debt\_id, household\_id, from\_member\_id, to\_member\_id, amount, remaining, due\_date, days\_overdue: integer }` |**

**| \*\*Consumidores\*\* | N (→ deudor y acreedor), G (→ evalúa escalamiento: 30d → Nivel 1, 60d → Nivel 3), B |**

**| \*\*Prioridad\*\* | 🟠 AL |**

**| \*\*Offline\*\* | S |**



**### 5.10 fund.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Coordinador crea un fondo (`INSERT INTO funds`) |**

**| \*\*Payload\*\* | `{ fund\_id, household\_id, name, description, target\_amount, current\_amount: 0, currency, is\_emergency }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), AU, F (si es fondo familiar), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 5.11 fund.completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `current\_amount ≥ target\_amount` → `status → 'completed'` |**

**| \*\*Payload\*\* | `{ fund\_id, household\_id, name, target\_amount, final\_amount, completed\_at, duration\_days }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), F (→ celebración: "¡Fondo \[name] completado!"), AU, B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 5.12 fund.milestone\_reached**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `current\_amount` cruza 25%, 50%, 75%, 90% del `target\_amount` |**

**| \*\*Payload\*\* | `{ fund\_id, household\_id, name, target\_amount, current\_amount, milestone\_pct: integer }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), F (si es familiar), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 5.13 balance.updated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Cambio en `accounts.balance` (post expense, income, transferencia) |**

**| \*\*Payload\*\* | `{ account\_id, household\_id, account\_name, old\_balance, new\_balance, currency, triggered\_by: 'expense' \\| 'income' \\| 'transfer' }` |**

**| \*\*Consumidores\*\* | G (→ evalúa salud financiera del hogar), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**---**



**## 6. PRESENCE**



**### 6.1 member.arrived\_home**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Edge function detecta entrada en geofence de place\_type='home' |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, place\_name, arrived\_at }` — \*\*NUNCA incluye coordenadas GPS\*\* |**

**| \*\*Consumidores\*\* | N (→ miembros con permiso de ubicación según location\_settings), A (→ trigger: `location\_changed`), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q — se dispara al reconectar si la geofence se cruzó offline |**



**### 6.2 member.left\_home**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Edge function detecta salida de geofence de place\_type='home' |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, place\_name, left\_at }` — \*\*sin coordenadas\*\* |**

**| \*\*Consumidores\*\* | N (→ miembros con permiso), A, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 6.3 member.arrived\_place**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Edge function detecta entrada en geofence de cualquier place registrado (escuela, trabajo, club) |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, place\_id, place\_name, place\_type, arrived\_at }` |**

**| \*\*Consumidores\*\* | N (→ miembros con permiso de ubicación), A, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 6.4 member.left\_place**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Edge function detecta salida de geofence de place |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, place\_id, place\_name, place\_type, left\_at }` |**

**| \*\*Consumidores\*\* | N (→ miembros con permiso), A, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 6.5 member.checkin\_manual**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro hace check-in manual (`INSERT INTO check\_ins`) |**

**| \*\*Payload\*\* | `{ check\_in\_id, member\_id, household\_id, display\_name, place\_id, place\_name, notes, checked\_in\_at }` |**

**| \*\*Consumidores\*\* | F (→ opcional: "Estoy en \[place]"), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q — se registra localmente y sincroniza |**



**### 6.6 member.checkin\_missed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON/Geni: miembro no llegó a destino esperado dentro de ventana de tiempo (ej: niño no llegó a escuela 30min después de hora entrada) |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, expected\_place\_id, expected\_place\_name, expected\_by: time, current\_delay\_minutes }` |**

**| \*\*Consumidores\*\* | N (→ coordinador y adultos con permiso, prioridad AL), G (→ patterns\_log), B |**

**| \*\*Prioridad\*\* | 🟠 AL |**

**| \*\*Offline\*\* | S — requiere datos de ubicación actualizados |**



**### 6.7 member.ghost\_mode\_activated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro activa Ghost Mode (`is\_sharing\_enabled = false` temporalmente en location\_settings) |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, activated\_at, duration\_minutes (si temporizado) }` |**

**| \*\*Consumidores\*\* | N (→ SOLO el miembro: confirmación), AU |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | L — se activa localmente de inmediato |**



**### 6.8 member.ghost\_mode\_expired**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Ghost Mode temporizado expira → `is\_sharing\_enabled = true` |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, expired\_at }` |**

**| \*\*Consumidores\*\* | N (→ SOLO el miembro: "Ghost Mode desactivado. Tu ubicación vuelve a compartirse.") |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | L |**



**### 6.9 member.location\_stale**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: última ubicación >30min antigua (batería baja, sin conexión, app en background) |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, last\_known\_at, stale\_minutes, battery\_level (si disponible) }` |**

**| \*\*Consumidores\*\* | N (→ miembros con permiso de ubicación: "\[Display\_name] lleva sin actualizar ubicación X min"), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**### 6.10 member.inactive\_alert**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni detecta inactividad: 0 eventos de presencia en 24h+ (para miembros que normalmente tienen actividad) |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, display\_name, hours\_inactive, last\_activity\_at }` |**

**| \*\*Consumidores\*\* | N (→ coordinador: "\[Display\_name] no ha tenido actividad en 24h"), G (→ patterns\_log) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**---**



**## 7. INVENTORY**



**### 7.1 inventory.stock\_low**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `quantity ≤ min\_quantity` (umbral configurado por item) |**

**| \*\*Payload\*\* | `{ item\_id, household\_id, item\_name, category\_id, category\_name, current\_quantity, min\_quantity, unit }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), A (→ trigger: `stock\_low` → add\_to\_shopping\_list), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 7.2 inventory.stock\_empty**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `quantity ≤ 0` |**

**| \*\*Payload\*\* | `{ item\_id, household\_id, item\_name, category\_id, category\_name, unit }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador: "Se acabó \[item\_name]"), A (→ add\_to\_shopping\_list automático), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 7.3 inventory.item\_added**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `INSERT INTO inventory\_items` |**

**| \*\*Payload\*\* | `{ item\_id, household\_id, item\_name, category\_id, quantity, unit, min\_quantity, added\_by: member\_id }` |**

**| \*\*Consumidores\*\* | AU, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 7.4 inventory.item\_updated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Cambio en `quantity`, `min\_quantity`, `location` o `status` |**

**| \*\*Payload\*\* | `{ item\_id, household\_id, item\_name, changed\_fields: \[], old\_quantity, new\_quantity, updated\_by: member\_id }` |**

**| \*\*Consumidores\*\* | AU, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 7.5 shopping.item\_added**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro agrega item a `shopping\_list` |**

**| \*\*Payload\*\* | `{ item\_id, household\_id, item\_name, quantity, unit, category, added\_by: member\_id }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), E (→ resumen semanal opcional) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 7.6 shopping.item\_completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | `is\_purchased = true`, `purchased\_by`, `purchased\_at` |**

**| \*\*Payload\*\* | `{ item\_id, household\_id, item\_name, purchased\_by: member\_id, purchased\_at }` |**

**| \*\*Consumidores\*\* | N (→ quien agregó el item: "\[Comprador] compró \[item\_name]"), ST (→ racha para el comprador), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q — se marca al comprar, sincroniza después |**



**### 7.7 expiry.item\_near**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `expiry\_date - today() ≤ 3 days` |**

**| \*\*Payload\*\* | `{ expiry\_record\_id, household\_id, item\_name, expiry\_date, days\_until\_expiry, quantity }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador: "\[item\_name] vence en 3 días"), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S — cron server-side |**



**### 7.8 expiry.item\_overdue**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `expiry\_date < today()` con `status = 'active'` |**

**| \*\*Payload\*\* | `{ expiry\_record\_id, household\_id, item\_name, expiry\_date, days\_overdue, quantity }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador: "\[item\_name] venció hace X días. ¿Lo descartamos?"), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**---**



**## 8. ASSETS**



**### 8.1 asset.maintenance\_due**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `next\_maintenance\_date - today() ≤ 7 days` en `asset\_maintenance` |**

**| \*\*Payload\*\* | `{ maintenance\_id, asset\_id, asset\_name, asset\_type, household\_id, maintenance\_title, next\_maintenance\_date, days\_until }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), E (→ coordinador si configurado), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S — cron server-side |**



**### 8.2 asset.maintenance\_overdue**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `next\_maintenance\_date < today()` |**

**| \*\*Payload\*\* | `{ maintenance\_id, asset\_id, asset\_name, asset\_type, household\_id, maintenance\_title, next\_maintenance\_date, days\_overdue }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador: prioridad AL), E, B |**

**| \*\*Prioridad\*\* | 🟠 AL |**

**| \*\*Offline\*\* | S |**



**### 8.3 asset.document\_expiring**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `documents.expiry\_date - today() ≤ 30 days` para documentos asociados a assets (seguros, garantías, títulos) |**

**| \*\*Payload\*\* | `{ document\_id, asset\_id, asset\_name, asset\_type, household\_id, doc\_type, document\_title, expiry\_date, days\_until }` |**

**| \*\*Consumidores\*\* | N (→ coordinador y adultos), E (→ coordinador), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**### 8.4 asset.document\_expired**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `documents.expiry\_date < today()` |**

**| \*\*Payload\*\* | `{ document\_id, asset\_id, asset\_name, asset\_type, household\_id, doc\_type, document\_title, expiry\_date, days\_overdue }` |**

**| \*\*Consumidores\*\* | N (→ coordinador y adultos: prioridad AL), E (→ coordinador), B |**

**| \*\*Prioridad\*\* | 🟠 AL |**

**| \*\*Offline\*\* | S |**



**### 8.5 pet.maintenance\_due**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON evalúa `asset\_maintenance` asociado a pet con `next\_maintenance\_date` próximo (vacunas, controles veterinarios) |**

**| \*\*Payload\*\* | `{ pet\_id, pet\_name, species, household\_id, maintenance\_title, due\_date, days\_until, vet\_name, vet\_phone }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**### 8.6 vehicle.service\_due**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `vehicles.next\_service\_date - today() ≤ 14 days` o por kilometraje si se registra |**

**| \*\*Payload\*\* | `{ vehicle\_id, vehicle\_name, brand, model, household\_id, next\_service\_date, days\_until, insurance\_expiry (si próximo) }` |**

**| \*\*Consumidores\*\* | N (→ adultos/coordinador), E, B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**---**



**## 9. HomeCLOUD**



**### 9.1 media.uploaded**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro autorizado sube foto o video (`INSERT INTO media\_items`). Todos excepto Niños (§11.06). |**

**| \*\*Payload\*\* | `{ media\_id, household\_id, file\_name, media\_type, visibility, tags, taken\_at, uploaded\_by: member\_id, file\_size }` — sin datos de imagen raw |**

**| \*\*Consumidores\*\* | N (→ hogar si visibility='household'), AU, F (→ "Nueva foto en HomeCloud"), G (→ clasifica, sugiere etiquetas, genera recuerdos) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q — se encola; el archivo se sube al reconectar |**



**### 9.2 media.deleted**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Uploader o coordinador hace soft-delete (`deleted\_at`) |**

**| \*\*Payload\*\* | `{ media\_id, household\_id, file\_name, media\_type, deleted\_by: member\_id }` |**

**| \*\*Consumidores\*\* | AU, G (→ actualiza índices de clasificación) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 9.3 album.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto o Coordinador crea álbum (`INSERT INTO albums`) |**

**| \*\*Payload\*\* | `{ album\_id, household\_id, name, visibility, created\_by: member\_id, cover\_media\_id }` |**

**| \*\*Consumidores\*\* | N (→ hogar si visibility='household'), F, AU, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 9.4 album.updated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Se agregan/remueven fotos del álbum o se cambia nombre/descripción |**

**| \*\*Payload\*\* | `{ album\_id, household\_id, name, updated\_by: member\_id, items\_added\_count, items\_removed\_count }` |**

**| \*\*Consumidores\*\* | N (→ miembros con acceso al álbum), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 9.5 document.uploaded**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto o Coordinador sube documento (`INSERT INTO documents`) |**

**| \*\*Payload\*\* | `{ document\_id, household\_id, title, category, sensitivity, visibility, owner\_id: member\_id, expiry\_date, file\_size, content\_type }` — sin contenido del documento |**

**| \*\*Consumidores\*\* | N (→ owner\_id y miembros con acceso), AU, G (→ clasifica, sugiere etiquetas), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 9.6 document.versioned**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Nueva versión de documento (`INSERT INTO document\_versions`, `current\_version` incrementa) |**

**| \*\*Payload\*\* | `{ document\_id, household\_id, title, version\_number, change\_summary, updated\_by: member\_id }` |**

**| \*\*Consumidores\*\* | N (→ miembros con acceso al documento), AU |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 9.7 document.expiring**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: `documents.expiry\_date - today() ≤ 30 days` |**

**| \*\*Payload\*\* | `{ document\_id, household\_id, title, category, sensitivity, owner\_id, expiry\_date, days\_until }` |**

**| \*\*Consumidores\*\* | N (→ owner\_id y coordinador), E (→ coordinador), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S |**



**### 9.8 memory.generated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni genera una memoria (collage, video resumen, recuerdo) a partir de media\_items |**

**| \*\*Payload\*\* | `{ memory\_type: 'collage' \\| 'video' \\| 'slideshow', household\_id, title, media\_ids: \[], generated\_by: 'geni', cover\_media\_id }` |**

**| \*\*Consumidores\*\* | N (→ hogar: "Geni creó un recuerdo: \[title]"), F (→ post automático), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | S — generación server-side |**



**---**



**## 10. FEED**



**### 10.1 post.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro crea post (`INSERT INTO posts`). Todos los miembros pueden crear posts. |**

**| \*\*Payload\*\* | `{ post\_id, household\_id, author\_id, content\_preview, post\_type, has\_media: boolean, related\_entity\_type, related\_entity\_id }` |**

**| \*\*Consumidores\*\* | N (→ miembros del hogar si no están en quiet hours), AU, A (→ trigger: `post\_to\_feed`), G (→ puede extraer temas) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 10.2 post.reaction\_added**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro agrega reacción (`INSERT INTO post\_reactions`) |**

**| \*\*Payload\*\* | `{ post\_id, post\_author\_id, reactor\_id: member\_id, reaction, post\_content\_preview }` |**

**| \*\*Consumidores\*\* | N (→ autor del post: "\[Display\_name] reaccionó con \[emoji] a tu post") |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 10.3 post.comment\_added**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro comenta (`INSERT INTO post\_comments`) |**

**| \*\*Payload\*\* | `{ comment\_id, post\_id, post\_author\_id, author\_id: member\_id, content\_preview, mentioned\_members: \[] }` |**

**| \*\*Consumidores\*\* | N (→ autor del post y miembros mencionados), AU |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 10.4 post.milestone\_shared**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Sistema o miembro crea un post con `related\_entity\_type = 'milestone'` y `post\_type = 'milestone'` al alcanzar un hito de goal |**

**| \*\*Payload\*\* | `{ post\_id, household\_id, goal\_id, milestone\_id, milestone\_title, related\_member\_id, occurred\_at }` |**

**| \*\*Consumidores\*\* | F (→ post automático de celebración), N (→ hogar), B |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**---**



**## 11. SOS**



**> \*\*Regla inviolable:\*\* SOS no puede ser silenciado nunca. Ignora quiet hours, modos no molestar, y**

**> ghost mode. Siempre genera push + notificación in-app. Si hay canales SMS/call configurados,**

**> se usan automáticamente (§19.07).**



**### 11.1 sos.activated\_manual**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Miembro activa SOS manualmente desde panel SOS (`INSERT INTO sos\_alerts`, `alert\_type='manual'`). Niveles: `'red'` (🔴), `'orange'` (🟠), `'yellow'` (🟡). \*\*Restricción:\*\* Niños y Empleado Familiar NO pueden emitir `level='red'` (§24.11). |**

**| \*\*Payload\*\* | `{ sos\_id, household\_id, triggered\_by: member\_id, display\_name, level: 'red'\\|'orange'\\|'yellow', alert\_type: 'manual', category, message, coordinates (solo para respuesta de emergencia, NUNCA a Geni), battery\_level, triggered\_at }` |**

**| \*\*Consumidores\*\* | N (→ según nivel: red→todos los adultos, orange→adultos+responsables, yellow→personas relevantes. Push inmediato, ignora todo), E (→ adultos), S (→ SMS/call si configurado en sos\_recipients), AU (+++ detallado) |**

**| \*\*Prioridad\*\* | 🔴 CR |**

**| \*\*Offline\*\* | L — se activa localmente; si no hay conexión, se encola y envía al reconectar. Si pasaron >5min, incluye flag `was\_delayed: true` |**



**### 11.2 sos.activated\_auto**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | SOS automático por detección de caída (`alert\_type='fall\_detected'`) o inactividad prolongada (`alert\_type='no\_response'`) |**

**| \*\*Payload\*\* | `{ sos\_id, household\_id, triggered\_by: member\_id, display\_name, level: 'red', alert\_type: 'fall\_detected' \\| 'no\_response', coordinates, battery\_level, triggered\_at }` |**

**| \*\*Consumidores\*\* | N (→ TODOS los adultos/coordinador, push + sonido crítico), E, S (→ SMS/call prioritario), AU |**

**| \*\*Prioridad\*\* | 🔴 CR |**

**| \*\*Offline\*\* | L — mismo que activated\_manual |**



**### 11.3 sos.activated\_panic**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | SOS con botón de pánico físico o 5 toques rápidos en app (`alert\_type='panic'`) |**

**| \*\*Payload\*\* | `{ sos\_id, household\_id, triggered\_by: member\_id, display\_name, level: 'red', alert\_type: 'panic', coordinates, battery\_level, triggered\_at }` |**

**| \*\*Consumidores\*\* | N (→ TODOS los miembros del hogar, push crítico), E, S (→ SMS + call automático a todos los sos\_recipients), AU |**

**| \*\*Prioridad\*\* | 🔴 CR |**

**| \*\*Offline\*\* | L — si no hay conexión, intenta enviar SMS nativo directamente (bypass del sistema) |**



**### 11.4 sos.cancelled**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Quien emitió el SOS lo cancela, o un adulto/coordinador lo resuelve → `status → 'cancelled'`, `cancellation\_reason` (§13.04, §24.11) |**

**| \*\*Payload\*\* | `{ sos\_id, household\_id, cancelled\_by: member\_id, display\_name, cancellation\_reason, cancelled\_at, original\_alert\_type, duration\_seconds }` |**

**| \*\*Consumidores\*\* | N (→ todos los que recibieron el SOS: "SOS cancelado por \[Display\_name]"), AU |**

**| \*\*Prioridad\*\* | 🔴 CR |**

**| \*\*Offline\*\* | Q |**



**### 11.5 sos.closed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto/coordinador marca alerta como resuelta → `status → 'closed'`, `resolved\_by`, `resolved\_at` |**

**| \*\*Payload\*\* | `{ sos\_id, household\_id, resolved\_by: member\_id, display\_name, resolved\_at, minutes\_since\_activation }` |**

**| \*\*Consumidores\*\* | N (→ triggered\_by y otros adultos: "\[Display\_name] atendió y cerró el SOS"), AU |**

**| \*\*Prioridad\*\* | 🔴 CR |**

**| \*\*Offline\*\* | Q |**



**### 11.6 sos.escalated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: SOS activo (`status='active'`) sin respuesta de ningún adulto en 5 minutos |**

**| \*\*Payload\*\* | `{ sos\_id, household\_id, triggered\_by: member\_id, display\_name, alert\_type, minutes\_without\_response, escalated\_to: 'all\_members' \\| 'emergency\_contacts' }` |**

**| \*\*Consumidores\*\* | N (→ TODOS los miembros del hogar, incluso niños/teens si aplica), S (→ reintenta SMS/call), E, AU |**

**| \*\*Prioridad\*\* | 🔴 CR |**

**| \*\*Offline\*\* | S — server-side, cron |**



**### 11.7 sos.no\_response\_timeout**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: SOS activo 15+ minutos sin respuesta de nadie |**

**| \*\*Payload\*\* | `{ sos\_id, household\_id, triggered\_by: member\_id, display\_name, alert\_type, minutes\_without\_response }` |**

**| \*\*Consumidores\*\* | G (→ patterns\_log: alerta crítica de sistema), AU (+++), N (→ todos los miembros de nuevo), S (→ re-intenta emergencia) |**

**| \*\*Prioridad\*\* | 🔴 CR |**

**| \*\*Offline\*\* | S |**



**---**



**## 12. GENI**



**### 12.1 geni.pattern\_detected**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni detecta un patrón que cruza un umbral de intervención |**

**| \*\*Payload\*\* | `{ pattern\_id, household\_id, pattern\_type, member\_id (si aplica), severity, escalation\_level, details: { ... datos procesados, sin GPS, sin datos financieros crudos } }` — \*\*NUNCA incluye coordenadas GPS ni transacciones individuales\*\* |**

**| \*\*Consumidores\*\* | G (→ patterns\_log, determina acción), N (→ según nivel de escalamiento), B |**

**| \*\*Prioridad\*\* | Variable según pattern\_type: 🟡 ME (leve), 🟠 AL (grave), 🔴 CR (obsessión o emergencia) |**

**| \*\*Offline\*\* | S — procesamiento server-side |**



**### 12.2 geni.recommendation\_generated**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Geni genera una recomendación proactiva (no reactiva a consulta del usuario) |**

**| \*\*Payload\*\* | `{ recommendation\_id, household\_id, member\_id (si es personal), domain, title, description, action\_suggestion, confidence\_score }` |**

**| \*\*Consumidores\*\* | N (→ miembro/s afectado/s como "Geni sugiere"), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | S |**



**### 12.3 geni.briefing\_ready**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | CRON: Geni completa el Briefing diario para un miembro |**

**| \*\*Payload\*\* | `{ member\_id, household\_id, briefing\_date, sections: \[{type, title, summary}], highlights\_count }` — \*\*NUNCA incluye memorias de otros miembros ni coordenadas GPS\*\* |**

**| \*\*Consumidores\*\* | N (→ miembro: "Tu briefing del día está listo"), E (→ opcional, si configurado) |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | S — se genera server-side, se entrega al reconectar |**



**### 12.4 geni.guardrail\_triggered**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Se activa un guardrail (obsessión de ubicación ≥5 consultas/día, obsessión de gastos ≥3 aperturas/semana) |**

**| \*\*Payload\*\* | `{ guardrail\_type: 'location\_obsession' \\| 'expense\_obsession', household\_id, observer\_member\_id, observed\_member\_id, trigger\_count, threshold, action\_taken: 'alerted' }` — \*\*SIN coordenadas, SIN montos exactos\*\* |**

**| \*\*Consumidores\*\* | G (→ patterns\_log, solo service\_role), N (→ coordinador/es: "\[Observer] ha consultado la ubicación de \[Observed] 5 veces hoy."), AU (+++) |**

**| \*\*Prioridad\*\* | 🔴 CR — siempre Nivel 3 directo sin escalamiento previo |**

**| \*\*Offline\*\* | S |**



**### 12.5 geni.obsession\_detected**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Guardrail se activa por 3ª vez en 30 días para el mismo observador → reincidencia confirmada |**

**| \*\*Payload\*\* | `{ household\_id, observer\_member\_id, observed\_member\_id, guardrail\_type, occurrences\_30d: integer, escalation: 'coordinator\_crisis' }` |**

**| \*\*Consumidores\*\* | G (→ patterns\_log CRÍTICO), N (→ TODOS los coordinadores: "\[Observer] muestra patrón de monitoreo excesivo"), AU (+++) |**

**| \*\*Prioridad\*\* | 🔴 CR |**

**| \*\*Offline\*\* | S |**



**---**



**## 13. AUTOMATIZACIONES**



**### 13.1 automation.created**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto/coordinador crea automatización (`INSERT INTO automations`) |**

**| \*\*Payload\*\* | `{ automation\_id, household\_id, name, trigger\_type, action\_type, requires\_approval, created\_by: member\_id }` |**

**| \*\*Consumidores\*\* | AU, B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 13.2 automation.triggered**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Evento del sistema coincide con `trigger\_config` de una automatización activa |**

**| \*\*Payload\*\* | `{ automation\_id, household\_id, name, trigger\_type, trigger\_data: {...}, triggered\_at }` |**

**| \*\*Consumidores\*\* | A (→ evalúa condiciones y ejecuta acción), AU (→ automation\_logs) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q — se encola y evalúa al sincronizar |**



**### 13.3 automation.executed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Automatización ejecutó su acción exitosamente |**

**| \*\*Payload\*\* | `{ automation\_id, household\_id, name, action\_type, action\_result: {...}, executed\_at }` |**

**| \*\*Consumidores\*\* | N (→ created\_by: "Automatización \[name] ejecutada"), AU (→ automation\_logs), B |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 13.4 automation.failed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Automatización falla al ejecutar su acción |**

**| \*\*Payload\*\* | `{ automation\_id, household\_id, name, trigger\_type, action\_type, error\_message, failed\_at }` |**

**| \*\*Consumidores\*\* | N (→ created\_by: "Automatización \[name] falló: \[error]"), AU (→ automation\_logs con status='error') |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | Q |**



**### 13.5 automation.paused**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto/coordinador pausa automatización (`status = 'paused'`) |**

**| \*\*Payload\*\* | `{ automation\_id, household\_id, name, paused\_by: member\_id, paused\_at }` |**

**| \*\*Consumidores\*\* | AU |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**### 13.6 automation.archived**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Adulto/coordinador archiva automatización (`status = 'archived'`) |**

**| \*\*Payload\*\* | `{ automation\_id, household\_id, name, archived\_by: member\_id, archived\_at }` |**

**| \*\*Consumidores\*\* | AU |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | Q |**



**---**



**## 14. SISTEMA**



**### 14.1 system.sync\_completed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Cliente completa sincronización de cola offline con el servidor |**

**| \*\*Payload\*\* | `{ member\_id, device\_id, events\_synced: integer, conflicts\_resolved: integer, sync\_duration\_ms, completed\_at }` |**

**| \*\*Consumidores\*\* | AU (→ registro técnico), G (→ puede recalcular patrones con datos frescos) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | — (es el evento post-offline) |**



**### 14.2 system.sync\_conflict**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Last Write Wins detecta conflicto: dos clientes modificaron el mismo registro offline (§20.07) |**

**| \*\*Payload\*\* | `{ entity\_type, entity\_id, winning\_client, losing\_client, conflict\_type, resolved\_by: 'LWW', resolved\_at }` |**

**| \*\*Consumidores\*\* | AU (+++), N (→ miembros afectados si el conflicto afecta datos visibles: "Hubo un conflicto en \[entity]. Se conservó la versión más reciente.") |**

**| \*\*Prioridad\*\* | 🟡 ME |**

**| \*\*Offline\*\* | — (se resuelve al sincronizar) |**



**### 14.3 system.offline\_queue\_processed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Servidor procesa lote de eventos de cola offline de un dispositivo |**

**| \*\*Payload\*\* | `{ member\_id, device\_id, batch\_size, events\_processed, events\_failed, processing\_duration\_ms }` |**

**| \*\*Consumidores\*\* | AU (→ métricas internas) |**

**| \*\*Prioridad\*\* | 🟢 BA |**

**| \*\*Offline\*\* | — |**



**### 14.4 system.error**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Trigger\*\* | Error del sistema que afecta la experiencia del usuario (edge function crash, RLS bloqueo inesperado, storage lleno, etc.) |**

**| \*\*Payload\*\* | `{ error\_code, severity, domain, message, user\_impact, stack\_trace (solo en logs internos), occurred\_at }` |**

**| \*\*Consumidores\*\* | AU (→ ++crítico si afecta datos), N (→ solo si el usuario necesita saber: "Tuvimos un problema al guardar. Tus datos están seguros.") |**

**| \*\*Prioridad\*\* | Variable: 🟠 AL (si afecta datos), 🟡 ME (si es recuperable), 🔴 CR (si compromete SOS o datos sensibles) |**

**| \*\*Offline\*\* | Q — si se genera localmente |**



**---**



**# PARTE 2: MATRIZ EVENTOS × CONSUMIDORES**



**## Tabla de Consumo (✓ = siempre, ○ = condicional, — = nunca)**



**| Evento | N | E | G | A | AU | F | B | ST | S |**

**|-----------|---|---|---|---|----|---|---|----|---|**

**| \*\*People \& Auth\*\* | | | | | | | | | |**

**| member.invited | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — |**

**| invitation.accepted | ✓ | — | — | — | ✓ | — | ✓ | — | — |**

**| invitation.expired | ✓ | — | — | — | — | — | ✓ | — | — |**

**| invitation.cancelled | — | — | — | — | ✓ | — | ✓ | — | — |**

**| member.joined | ✓ | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | — |**

**| member.removed | ✓ | — | — | — | ✓ | — | ✓ | — | — |**

**| member.role\_changed | ✓ | — | — | — | ✓ | — | ✓ | — | — |**

**| user.registered | — | — | — | — | ✓ | — | ✓ | — | — |**

**| user.onboarding\_completed | — | — | ✓ | — | — | — | ✓ | — | — |**

**| household.created | — | — | ✓ | — | ✓ | — | — | — | — |**

**| household.settings\_changed | — | — | ✓ | ✓ | ✓ | — | — | — | — |**

**| \*\*Tasks\*\* | | | | | | | | | |**

**| task.created | ✓ | — | — | ✓ | ✓ | — | ✓ | — | — |**

**| task.assigned | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | — |**

**| task.started | ✓ | — | — | — | — | — | ✓ | — | — |**

**| task.completed | ✓ | — | ✓ | ✓ | ✓ | ○ | ✓ | ✓ | — |**

**| task.verified | ✓ | — | — | — | — | — | ✓ | — | — |**

**| task.cancelled | ✓ | — | — | — | ✓ | — | ✓ | — | — |**

**| task.overdue | ✓ | — | ✓ | ✓ | — | — | ✓ | — | — |**

**| task.reminder\_due | ✓ | ✓ | — | — | — | — | — | — | — |**

**| task.escalation\_level\_1 | ✓ | — | ✓ | — | — | — | — | — | — |**

**| task.escalation\_level\_2 | ✓ | — | ✓ | — | — | — | — | — | — |**

**| task.escalation\_level\_3 | ✓ | — | ✓ | — | — | — | ✓ | — | — |**

**| task.escalation\_level\_4 | — | — | ✓ | — | — | — | ✓ | — | — |**

**| task.reassigned | ✓ | — | ✓ | — | ✓ | — | ✓ | — | — |**

**| task.commented | ✓ | — | — | — | ✓ | — | — | — | — |**

**| subtask.completed | ✓ | — | — | — | — | ○ | ✓ | ✓ | — |**

**| task.progress\_updated | ✓ | — | — | — | — | — | ✓ | — | — |**

**| \*\*Calendar\*\* | | | | | | | | | |**

**| event.created | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | — |**

**| event.updated | ✓ | — | ✓ | — | ✓ | — | ✓ | — | — |**

**| event.cancelled | ✓ | — | — | — | ✓ | — | ✓ | — | — |**

**| event.completed | — | — | — | — | — | ○ | ✓ | ✓ | — |**

**| event.conflict\_detected | ✓ | — | ✓ | — | — | — | ✓ | — | — |**

**| event.reminder\_due | ✓ | ✓ | — | — | — | — | — | — | — |**

**| event.participant\_added | ✓ | — | — | — | ✓ | — | — | — | — |**

**| event.participant\_removed | ✓ | — | — | — | ✓ | — | — | — | — |**

**| \*\*Goals\*\* | | | | | | | | | |**

**| goal.created | ✓ | — | — | — | ✓ | ○ | ✓ | — | — |**

**| goal.milestone\_completed | ✓ | — | — | — | — | ✓ | ✓ | — | — |**

**| goal.completed | ✓ | — | — | — | ✓ | ✓ | ✓ | — | — |**

**| goal.failed | ✓ | — | ✓ | — | — | — | ✓ | — | — |**

**| goal.progress\_updated | ✓ | — | — | ✓ | — | — | ✓ | — | — |**

**| \*\*Finance\*\* | | | | | | | | | |**

**| expense.created | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | — |**

**| expense.updated | ✓ | — | ✓ | — | ✓ | — | ✓ | — | — |**

**| expense.annulled | ✓ | — | ✓ | — | ✓ | — | — | — | — |**

**| income.created | — | — | ✓ | ✓ | ✓ | — | ✓ | — | — |**

**| budget.threshold\_warning | ✓ | — | ✓ | — | — | — | ✓ | — | — |**

**| budget.exceeded | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — |**

**| debt.created | ✓ | — | ✓ | — | ✓ | — | ✓ | — | — |**

**| debt.paid | ✓ | — | ✓ | — | ✓ | — | ✓ | — | — |**

**| debt.overdue | ✓ | — | ✓ | — | — | — | ✓ | — | — |**

**| fund.created | ✓ | — | — | — | ✓ | ○ | ✓ | — | — |**

**| fund.completed | ✓ | — | — | — | ✓ | ✓ | ✓ | — | — |**

**| fund.milestone\_reached | ✓ | — | — | — | — | ○ | ✓ | — | — |**

**| balance.updated | — | — | ✓ | — | — | — | ✓ | — | — |**

**| \*\*Presence\*\* | | | | | | | | | |**

**| member.arrived\_home | ✓ | — | — | ✓ | — | — | ✓ | — | — |**

**| member.left\_home | ✓ | — | — | ✓ | — | — | ✓ | — | — |**

**| member.arrived\_place | ✓ | — | — | ✓ | — | — | ✓ | — | — |**

**| member.left\_place | ✓ | — | — | ✓ | — | — | ✓ | — | — |**

**| member.checkin\_manual | — | — | — | — | — | ○ | ✓ | — | — |**

**| member.checkin\_missed | ✓ | — | ✓ | — | — | — | ✓ | — | — |**

**| member.ghost\_mode\_activated | ✓ | — | — | — | ✓ | — | — | — | — |**

**| member.ghost\_mode\_expired | ✓ | — | — | — | — | — | — | — | — |**

**| member.location\_stale | ✓ | — | — | — | — | — | ✓ | — | — |**

**| member.inactive\_alert | ✓ | — | ✓ | — | — | — | — | — | — |**

**| \*\*Inventory\*\* | | | | | | | | | |**

**| inventory.stock\_low | ✓ | — | — | ✓ | — | — | ✓ | — | — |**

**| inventory.stock\_empty | ✓ | — | — | ✓ | — | — | ✓ | — | — |**

**| inventory.item\_added | — | — | — | — | ✓ | — | ✓ | — | — |**

**| inventory.item\_updated | — | — | — | — | ✓ | — | ✓ | — | — |**

**| shopping.item\_added | ✓ | ○ | — | — | — | — | — | — | — |**

**| shopping.item\_completed | ✓ | — | — | — | — | — | ✓ | ✓ | — |**

**| expiry.item\_near | ✓ | — | — | — | — | — | ✓ | — | — |**

**| expiry.item\_overdue | ✓ | — | — | — | — | — | ✓ | — | — |**

**| \*\*Assets\*\* | | | | | | | | | |**

**| asset.maintenance\_due | ✓ | ✓ | — | — | — | — | ✓ | — | — |**

**| asset.maintenance\_overdue | ✓ | ✓ | — | — | — | — | ✓ | — | — |**

**| asset.document\_expiring | ✓ | ✓ | — | — | — | — | ✓ | — | — |**

**| asset.document\_expired | ✓ | ✓ | — | — | — | — | ✓ | — | — |**

**| pet.maintenance\_due | ✓ | — | — | — | — | — | ✓ | — | — |**

**| vehicle.service\_due | ✓ | ✓ | — | — | — | — | ✓ | — | — |**

**| \*\*HomeCloud\*\* | | | | | | | | | |**

**| media.uploaded | ✓ | — | ✓ | — | ✓ | ○ | — | — | — |**

**| media.deleted | — | — | ✓ | — | ✓ | — | — | — | — |**

**| album.created | ✓ | — | — | — | ✓ | ○ | ✓ | — | — |**

**| album.updated | ✓ | — | — | — | — | — | ✓ | — | — |**

**| document.uploaded | ✓ | — | ✓ | — | ✓ | — | ✓ | — | — |**

**| document.versioned | ✓ | — | — | — | ✓ | — | — | — | — |**

**| document.expiring | ✓ | ✓ | — | — | — | — | ✓ | — | — |**

**| memory.generated | ✓ | — | — | — | — | ✓ | ✓ | — | — |**

**| \*\*Feed\*\* | | | | | | | | | |**

**| post.created | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |**

**| post.reaction\_added | ✓ | — | — | — | — | — | — | — | — |**

**| post.comment\_added | ✓ | — | — | — | ✓ | — | — | — | — |**

**| post.milestone\_shared | ✓ | — | — | — | — | ✓ | ✓ | — | — |**

**| \*\*SOS\*\* | | | | | | | | | |**

**| sos.activated\_manual | ✓ | ✓ | — | — | ✓ | — | — | — | ✓ |**

**| sos.activated\_auto | ✓ | ✓ | — | — | ✓ | — | — | — | ✓ |**

**| sos.activated\_panic | ✓ | ✓ | — | — | ✓ | — | — | — | ✓ |**

**| sos.cancelled | ✓ | ✓ | — | — | ✓ | — | — | — | — |**

**| sos.closed | ✓ | — | — | — | ✓ | — | — | — | — |**

**| sos.escalated | ✓ | ✓ | — | — | ✓ | — | — | — | ✓ |**

**| sos.no\_response\_timeout | ✓ | ✓ | ✓ | — | ✓ | — | — | — | ✓ |**

**| \*\*Geni\*\* | | | | | | | | | |**

**| geni.pattern\_detected | ○ | — | ✓ | — | — | — | ✓ | — | — |**

**| geni.recommendation\_generated | ✓ | — | — | — | — | — | ✓ | — | — |**

**| geni.briefing\_ready | ✓ | ✓ | — | — | — | — | — | — | — |**

**| geni.guardrail\_triggered | ✓ | — | ✓ | — | ✓ | — | — | — | — |**

**| geni.obsession\_detected | ✓ | — | ✓ | — | ✓ | — | — | — | — |**

**| \*\*Automations\*\* | | | | | | | | | |**

**| automation.created | — | — | — | — | ✓ | — | ✓ | — | — |**

**| automation.triggered | — | — | — | ✓ | ✓ | — | — | — | — |**

**| automation.executed | ✓ | — | — | — | ✓ | — | ✓ | — | — |**

**| automation.failed | ✓ | — | — | — | ✓ | — | — | — | — |**

**| automation.paused | — | — | — | — | ✓ | — | — | — | — |**

**| automation.archived | — | — | — | — | ✓ | — | — | — | — |**

**| \*\*System\*\* | | | | | | | | | |**

**| system.sync\_completed | — | — | ✓ | — | ✓ | — | — | — | — |**

**| system.sync\_conflict | ○ | — | — | — | ✓ | — | — | — | — |**

**| system.offline\_queue\_processed | — | — | — | — | ✓ | — | — | — | — |**

**| system.error | ○ | — | — | — | ✓ | — | — | — | — |**



**---**



**# PARTE 3: JERARQUÍA DE PRIORIDADES**



**## 🔴 CRÍTICA — No silenciable, ignora quiet hours**



**| # | Evento | Notas |**

**|---|--------|-------|**

**| 1 | sos.activated\_manual | Manual (🔴🟠🟡 según nivel) |**

**| 2 | sos.activated\_auto | Caída / no respuesta |**

**| 3 | sos.activated\_panic | Pánico / 5 toques |**

**| 4 | sos.cancelled | La cancelación también es crítica |**

**| 5 | sos.closed | Cierre de alerta |**

**| 6 | sos.escalated | Sin respuesta en 5 min |**

**| 7 | sos.no\_response\_timeout | 15+ min sin respuesta |**

**| 8 | geni.guardrail\_triggered | Obsessión de ubicación/gastos |**

**| 9 | geni.obsession\_detected | Reincidencia confirmada |**

**| 10 | system.error (SOS/data) | Si compromete SOS o datos sensibles |**



**## 🟠 ALTA — Ignora quiet hours, respeta opt-in**



**| # | Evento | Notas |**

**|---|--------|-------|**

**| 11 | task.overdue (>1 día) | |**

**| 12 | task.escalation\_level\_2 | Día 4, advertencia explícita |**

**| 13 | task.escalation\_level\_3 | Alerta al coordinador |**

**| 14 | event.updated (<24h) | Cambio de última hora |**

**| 15 | event.cancelled (≤2h) | Cancelación inminente |**

**| 16 | budget.exceeded | Presupuesto excedido |**

**| 17 | debt.overdue | Deuda vencida |**

**| 18 | member.checkin\_missed | Niño no llegó a destino |**

**| 19 | asset.maintenance\_overdue | Mantenimiento vencido |**

**| 20 | asset.document\_expired | Documento vencido |**

**| 21 | expense.created (>umbral) | Gasto grande |**

**| 22 | geni.pattern\_detected (grave) | Patrón de riesgo |**

**| 23 | system.error (datos) | Afecta integridad de datos |**



**## 🟡 MEDIA — Respeta quiet hours, respeta opt-in**



**| # | Evento | Notas |**

**|---|--------|-------|**

**| 24 | member.invited | |**

**| 25 | member.joined | |**

**| 26 | member.removed | |**

**| 27 | member.role\_changed | |**

**| 28 | task.created | |**

**| 29 | task.assigned | |**

**| 30 | task.completed | |**

**| 31 | task.overdue (día 1) | |**

**| 32 | task.reminder\_due | |**

**| 33 | task.escalation\_level\_1 | Día 1-3, privado |**

**| 34 | task.escalation\_level\_4 | Briefing familiar |**

**| 35 | task.reassigned | |**

**| 36 | event.created | |**

**| 37 | event.conflict\_detected | |**

**| 38 | event.reminder\_due | |**

**| 39 | event.participant\_added | |**

**| 40 | goal.created | |**

**| 41 | goal.milestone\_completed | |**

**| 42 | goal.completed | |**

**| 43 | expense.created (normal) | |**

**| 44 | expense.annulled | |**

**| 45 | budget.threshold\_warning | |**

**| 46 | debt.created | |**

**| 47 | debt.paid | |**

**| 48 | fund.completed | |**

**| 49 | member.location\_stale | |**

**| 50 | member.inactive\_alert | |**

**| 51 | inventory.stock\_low | |**

**| 52 | inventory.stock\_empty | |**

**| 53 | expiry.item\_near | |**

**| 54 | expiry.item\_overdue | |**

**| 55 | asset.maintenance\_due | |**

**| 56 | asset.document\_expiring | |**

**| 57 | pet.maintenance\_due | |**

**| 58 | vehicle.service\_due | |**

**| 59 | document.uploaded (sensitive/critical) | |**

**| 60 | document.expiring | |**

**| 61 | post.milestone\_shared | |**

**| 62 | geni.briefing\_ready | |**

**| 63 | geni.pattern\_detected (leve) | |**

**| 64 | automation.failed | |**

**| 65 | system.sync\_conflict | |**

**| 66 | system.error (recuperable) | |**



**## 🟢 BAJA — Solo in-app, respeta quiet hours**



**Todos los eventos restantes (\~42 eventos): presencia estándar, inventory updates leves, album updates, reacciones, comentarios, progreso, etc.**



**---**



**# PARTE 4: FLUJOS DE EVENTOS CRÍTICOS**



**## 4.1 Flujo SOS → Resolución**

