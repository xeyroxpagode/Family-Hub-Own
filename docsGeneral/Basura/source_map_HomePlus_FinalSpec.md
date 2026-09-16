# SOURCE MAP — HomePlus — FinalSpec

## 1. Identificación del documento

- **Archivo principal:** `HomePlus — FinalSpec(1).md`
- **Archivo de comprensión asociado:** `Final Spec(1).txt`
- **Tipo de documento:** Documento maestro canónico de producto + extracción canónica estructurada del ecosistema.
- **Propósito aparente:** Definir visión, dominios, entidades, relaciones, roles, permisos, navegación, estados, Home, Planner y decisiones congeladas de HomePlus.
- **Nivel de relevancia para MVP:** Alto
- **Motivo del nivel de relevancia:** El documento define People/Hogar, Roles, Membresía, Planner/Tasks/Calendar, Home, navegación, auditoría y relaciones transversales. Sin embargo, **no define Auth real, endpoints, contratos API, tokens, RLS técnico ni tipos de datos exhaustivos**, por lo que algunas partes MVP obligatorias deberán quedar marcadas como faltantes.

---

## 2. Resumen técnico del contenido

- Aparecen dominios: People, Planner, Finance, Presence, Inventory, Assets, HomeCloud, SOS, Geni, Automatizaciones, Feed, Notifications, Audit, MultiHogar y System.
- People concentra identidad, persona, roles, membresía, invitaciones, relaciones familiares, perfil personal y privacidad.
- Hogar aparece como unidad organizativa principal: todo ocurre dentro de un hogar.
- Cuenta aparece como entidad del usuario, separada del hogar.
- Roles oficiales: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor, Invitado y Empleado Familiar.
- Planner administra Tasks, Calendar, Goals y Responsabilidades.
- Tasks tiene campos, estados, prioridades, dependencias, recurrencia, subtareas, comentarios, adjuntos, timeline, verificación, asignación, reasignación y plantillas.
- Calendar administra eventos familiares/personales con estados y participantes, pero con poco detalle de campos y vistas.
- Home es centro operativo: resume y redirige, con bloques oficiales: Briefing Geni, Atención Requerida, Carga Familiar, Próximos Eventos, Tareas, Finanzas Relevantes, Presence Resumido y Actividad Familiar.
- Navegación V1 congelada: Home, People, +, Planner, More.
- Auditoría registra cambios importantes y nunca se elimina.
- Notifications existe, pero solo debe usarse para invitaciones/tareas/eventos si la extracción posterior lo necesita.
- Finance, Presence avanzado, Inventory, Assets, HomeCloud, SOS, Feed, Geni avanzado, Automatizaciones, MultiHogar avanzado, Goals y Milestones quedan fuera de extracción MVP actual salvo relaciones mínimas.
- El archivo de comprensión aporta entidades, relaciones canónicas, invariantes, decisiones arquitectónicas, relaciones ocultas y prioridades de auditoría.
- Las partes más importantes para implementación MVP son: `04 Roles y Permisos`, `05 People`, `06 Planner`, `18 Home`, `21 Estados`, `22 Relaciones`, `23 Auditoría`, `24 Navegación`, más outputs 2/3/5/6/7 del archivo de comprensión.

---

## 3. Índice de secciones relevantes

| Sección del documento | Tema | Módulos relacionados | Clasificación | Utilidad para extracción |
| --------------------- | ---- | -------------------- | ------------- | ------------------------ |
| 01 Visión | Propósito general, rol de Geni, alcance | HOME, GENI, SYSTEM | CONTEXTO | Media |
| 02 Principios | Privacidad, propiedad de datos, auditoría, multi-hogar, Home como centro operativo | ROLES, HOUSEHOLD, HOME, AUDIT, SYSTEM | CONTEXTO | Alta |
| 03 Arquitectura conceptual | Dominios, entidades transversales, Hogar, Cuenta, Memoria, Geni | HOUSEHOLD, USER/ACCOUNT/PERSON, SYSTEM | MIXTO | Alta |
| 04 Roles y permisos | Roles oficiales, permisos por rol, privacidad, permisos configurables | ROLES & PERMISSIONS, HOUSEHOLD, MEMBERSHIP | REAL | Alta |
| 05 People | Persona, membresía, roles, invitaciones, expulsión, multi-hogar, privacidad, participación transversal | HOUSEHOLD, MEMBERSHIP, INVITATIONS, ROLES | REAL/MIXTO | Alta |
| 06 Planner | Tasks, Calendar, Goals, Responsabilidades | PLANNER, TASKS, EVENTS, CALENDAR | MIXTO | Alta |
| 06.02–06.16 Tasks | Campos, estados, prioridades, dependencias, recurrencia, subtareas, comentarios, adjuntos, timeline, verificación, asignación, plantillas | TASKS | MIXTO | Alta |
| 06.17–06.20 Responsabilidades | Eje organizador de tareas, ejemplos, miembros asignados | TASKS, HOUSEHOLD, ROLES | MIXTO | Media |
| 06.21–06.24 Calendar | Eventos, tipos, estados, participantes | EVENTS, CALENDAR | REAL/POST_MVP | Media |
| 06.25–06.33 Goals | Metas, hitos, integración Finance/Tasks/Fondos, Geni | GOALS, PLANNER | IGNORAR/POST_MVP | Baja |
| 07 Finance | Finanzas, gastos, presupuestos, fondos, deudas, home condicional | Finance, Home | IGNORAR | Baja |
| 08 Presence | Ubicación, estados, lugares, geocercas, historial, check-ins, Home | Presence, Home | IGNORAR/POST_MVP | Baja |
| 09 Inventory | Stock, medicamentos, reposición, relación con Planner/Home | Inventory, Tasks, Home | IGNORAR | Baja |
| 10 Assets | Activos, mantenimiento, relación con Planner/HomeCloud/Finance/Home | Assets, Tasks, Home | IGNORAR | Baja |
| 11 HomeCloud | Recuerdos, álbumes, documentos, permisos, papelera, versionado | HomeCloud, Events | IGNORAR | Baja |
| 12 Feed | Posts, comentarios, reacciones, integración Planner/HomeCloud | Feed | IGNORAR | Nula |
| 13 SOS | Emergencias, permisos, integración Presence/Home/Audit | SOS, Home, Notifications | IGNORAR | Baja |
| 14 Geni | IA transversal, briefing, memoria, planner, search | Home, Planner, Geni | POST_MVP/MOCK | Media |
| 15 Automatizaciones | SI-ENTONCES, triggers, acciones, planner, approvals, auditoría | Automations, Tasks, Events | IGNORAR | Baja |
| 16 Multi-Hogar | Independencia por hogar, roles independientes, selector | Household, Membership | POST_MVP/MIXTO | Media |
| 17 Empleado Familiar | Rol no núcleo familiar, onboarding, tareas, calendario, fin de relación | Roles, Membership, Planner | POST_MVP | Media |
| 18 Home | Centro operativo, bloques, briefing, tareas, presence, roles, prioridad | HOME, TASKS, EVENTS, CALENDAR | MIXTO | Alta |
| 19 Notificaciones | Categorías, canales, prioridades, silenciamiento | Notifications, Planner, Calendar | MIXTO/POST_MVP | Media |
| 20 Offline | Offline sync, cola, conflictos, auditoría | System | IGNORAR | Baja |
| 21 Estados | Estados oficiales de Membership, Task, Event, Goal, etc. | MEMBERSHIP, TASKS, EVENTS | MIXTO | Alta |
| 22 Relaciones | Relaciones principales People/Planner/Events/Geni/etc. | HOUSEHOLD, TASKS, EVENTS, HOME | MIXTO | Alta |
| 23 Auditoría | Cambios auditables, Planner, Roles, conservación | AUDIT, TASKS, ROLES, MEMBERSHIP | REAL/MIXTO | Alta |
| 24 Navegación | Bottom Nav, People, Planner, Quick Actions, Search, Settings, Multi-Hogar, reglas por rol | UI, HOME, PLANNER, HOUSEHOLD | MIXTO | Alta |
| 25 Decisiones congeladas | Prioridad del documento, Home informa/módulos administran, datos, arquitectura | SYSTEM | CONTEXTO | Media |
| Final Spec — Output 1 | Dominios canónicos | Todos | CONTEXTO | Media |
| Final Spec — Output 2 | Entidades canónicas | Todos | MIXTO | Alta |
| Final Spec — Output 3 | Relaciones canónicas | Todos | MIXTO | Alta |
| Final Spec — Output 5 | Invariantes | SYSTEM, PLANNER, HOME | MIXTO | Alta |
| Final Spec — Output 6 | Decisiones arquitectónicas | UI, HOME, PLANNER, SYSTEM | MIXTO | Alta |
| Final Spec — Output 7 | Relaciones ocultas | HOME, BRIEFING, TASKS, EVENTS | POST_MVP/MIXTO | Media |
| Final Spec — Output 8/9 | Edges y prioridades de grafo | Todos | CONTEXTO | Media |

---

## 4. Mapa por módulo MVP

---

# 4.1 AUTH

## Secciones fuente

- `03.05 Cuenta`
- `05.02 Persona`
- `05.11 Perfil personal`
- `24.15 Settings — Ubicación / Cuenta / Seguridad / Privacidad`
- `Final Spec — Output 2: Person, Account, PersonalMemory`
- No aparecen secciones con nombre Auth, Register, Login, Session, Token o RefreshToken.

## Información encontrada

### Entidades

- **Cuenta / Account:** pertenece al usuario, no al hogar.
- **Persona / Person:** toda persona pertenece a una cuenta; puede participar en uno o más hogares.
- **Perfil personal:** preferencias, idioma, configuración personal, memoria personal de Geni.

### Campos

- Para Persona: nombre, apellido, foto, fecha de nacimiento, género opcional, información de contacto, rol dentro del hogar.
- Para Cuenta: perfil, preferencias, idioma, configuración personal, memoria personal de Geni.
- No hay campos de email, password, provider, password hash, verified email, session, refresh token o access token.

### Estados

- No se definen estados de cuenta, sesión o token.

### Flujos

- No encontrado: Register.
- No encontrado: Login.
- No encontrado: Refresh Token.
- No encontrado: Logout.
- No encontrado: recuperación de contraseña.
- No encontrado: creación de hogar durante registro.

### APIs

- No hay endpoints ni contratos API.

### UI

- Settings incluye Cuenta → Perfil, Seguridad, Privacidad.
- No se define pantalla Login/Register.

### Permisos

- Principio transversal: la información privada pertenece al usuario y no se comparte automáticamente.
- Ningún rol obtiene acceso automático a memoria privada, metas privadas, documentos privados o finanzas personales.

### Edge Cases

- Usuario puede estar en múltiples hogares con roles independientes.
- La Cuenta no pertenece al hogar; la Persona participa mediante Membership.

### Restricciones arquitectónicas

- Separación Cuenta vs Hogar.
- Privacidad primero.
- Propiedad de datos del usuario.

### Eventos del sistema

- No hay nombres técnicos de eventos Auth.

### Dependencias

- Person/Account se conectan con Membership y Household.

## Clasificación

### REAL

- Cuenta pertenece al usuario.
- Persona pertenece a una cuenta.
- Perfil personal separado del hogar.
- Privacidad individual.

### MOCK

- No encontrado.

### POST_MVP

- Memoria personal de Geni asociada a cuenta.

### IGNORAR

- Geni privado avanzado, memoria personal avanzada, si se sale de Account básico.

## Riesgos para extracción

- El MVP obligatorio requiere Register/Login/Refresh Token/Logout, pero el documento no define Auth.
- No hay contratos API, request/response ni errores.
- No hay modelo Session/RefreshToken.
- No hay detalles de seguridad, hashing, expiración, rotación, revocación ni refresh token single-use.
- No hay flujo explícito de crear hogar durante registro.

## Recomendación

- Generar **auth_fragment mínimo**.
- Debe contener solo: Account/User/Person como base, separación Cuenta/Hogar, privacidad, y una sección fuerte de “faltante requerido para MVP”.
- No inventar endpoints ni campos de token.

---

# 4.2 ONBOARDING

## Secciones fuente

- `05.07 Invitaciones`
- `17.05 Onboarding` para Empleado Familiar
- `24.09 Quick Actions — Personalización: Durante onboarding, sugerencias de acciones por rol`
- `24.17 Navegación por Rol — Resumen`
- `18.23 Home por rol`

## Información encontrada

### Entidades

- Person.
- Membership.
- Role.
- Invitation.
- Empleado Familiar como rol específico.

### Campos

- No se definen campos formales de onboarding.
- Para Persona sí existen campos básicos: nombre, apellido, foto, fecha de nacimiento, género opcional, contacto, rol.

### Estados

- No hay estado de onboarding.
- Membership tiene Pendiente/Activa/Suspendida/Finalizada.

### Flujos

- Invitación → Aceptación → Aprobación si corresponde → Ingreso al hogar.
- Empleado Familiar: se vincula a responsabilidades, horarios, tareas, permisos y pagos si corresponde.
- Durante onboarding se sugieren acciones por rol en Quick Actions.
- Home/Navegación adaptan experiencia por rol.

### APIs

- No encontrado.

### UI

- No hay pantallas de onboarding detalladas.
- Quick Actions puede sugerir acciones por rol durante onboarding.
- Home por rol adapta experiencia.

### Permisos

- Onboarding por rol está implícito en la experiencia adaptada por rol.
- Coordinador aprueba ingresos.
- Adulto puede invitar, pero no aprobar ingresos.

### Edge Cases

- Aprobación “si corresponde” es ambigua: no se define cuándo corresponde.
- Empleado Familiar tiene onboarding propio, pero queda fuera del MVP salvo relación mínima.

### Restricciones arquitectónicas

- No convertir roles familiares en jerarquía autoritaria.
- Privacidad individual prevalece.

### Eventos del sistema

- Invitación aceptada/ingreso al hogar aparece como flujo conceptual, sin nombre técnico.

### Dependencias

- Onboarding depende de Role, Membership, Invitation y Household.

## Clasificación

### REAL

- Invitación/aceptación/aprobación/ingreso como flujo conceptual.
- Experiencia por rol.
- Sugerencias de acciones por rol durante onboarding.

### MOCK

- No encontrado.

### POST_MVP

- Onboarding específico de Empleado Familiar.
- Personalización avanzada del orden de Quick Actions por aprendizaje.

### IGNORAR

- Pagos de Empleado Familiar.

## Riesgos para extracción

- No existe flujo Register + crear hogar + invitar miembros detallado.
- No hay pasos de onboarding por cada rol MVP.
- No hay UI ni payloads.
- “Aprobación si corresponde” requiere definición.

## Recomendación

- Generar **onboarding_fragment parcial**.
- Enfatizar faltantes y usar solo roles/experiencias existentes.

---

# 4.3 HOUSEHOLD

## Secciones fuente

- `03.04 Hogar`
- `03.05 Cuenta`
- `04 Roles y Permisos`
- `05 People`
- `05.04 Membresía`
- `05.10 Multi-hogar`
- `16 Multi-Hogar`
- `24.13 Multi-Hogar — Selector Global`
- `24.15 Settings — Hogar`
- `25.06 Datos`
- `Final Spec — Output 2: Household, Membership, Role, Invitation`
- `Final Spec — Output 3: Membership links Person/Household/Role; Invitation targets Person/Household`

## Información encontrada

### Entidades

- Household / Hogar.
- Person / Persona.
- Account / Cuenta.
- Membership / Membresía.
- Role.
- Invitation.

### Campos

- Hogar: no se listan campos formales.
- Settings/Hogar contiene: Miembros, Roles, Responsabilidades, Permisos, Integraciones.

### Estados

- No hay estados del Hogar.
- Membership tiene estados: Pendiente, Activa, Suspendida, Finalizada.

### Flujos

- Todo ocurre dentro de un hogar.
- Roles, Planner, Finance, Presence, Assets, HomeCloud pertenecen al hogar.
- Una persona puede pertenecer a múltiples hogares.
- Cada hogar mantiene membresía independiente.
- Selector global de hogar aparece si el usuario pertenece a 2 o más hogares.
- No hay navegación cruzada entre hogares.

### APIs

- No encontrado.

### UI

- Home es pantalla inicial del hogar activo.
- Header muestra selector de hogar si hay 2+ hogares.
- Settings → Hogar → Miembros/Roles/Responsabilidades/Permisos/Integraciones.

### Permisos

- Coordinador administra configuraciones del hogar.
- Coordinador no puede eliminar hogares.
- Adulto administra operaciones familiares, pero no aprueba ingresos.

### Edge Cases

- Multi-hogar permite roles distintos por hogar.
- Si hay un solo hogar, no se muestra selector.
- Si hay dos o más hogares, aparece dropdown con hogar activo.

### Restricciones arquitectónicas

- Hogar es unidad organizativa principal.
- Separación por hogar.
- No navegación cruzada entre hogares.
- Cuenta no pertenece al hogar.

### Eventos del sistema

- Household created no aparece con nombre técnico.
- Cambios de rol, ingresos, expulsiones son auditables.

### Dependencias

- Membership vincula Person con Household.
- Role vive dentro de Membership.
- Invitation targetea Household.

## Clasificación

### REAL

- Hogar como unidad organizativa.
- Separación Cuenta/Hogar.
- Membership independiente por hogar.
- Configuración básica de Hogar en Settings.
- Roles y permisos por hogar.

### MOCK

- No encontrado.

### POST_MVP

- Multi-hogar avanzado.
- Selector global multi-hogar si la implementación actual no lo incluye.

### IGNORAR

- Integraciones avanzadas de hogar.
- Cross-domain completo fuera de MVP.

## Riesgos para extracción

- No se define creación de hogar durante registro.
- No hay campos del modelo Household.
- No se definen límites, owner, timezone, nombre, slug, avatar, created_at.
- No se define eliminación de hogares salvo que Coordinador no puede eliminar.
- No aparece RLS explícito, aunque la separación por hogar es fuerte.

## Recomendación

- Generar **household_fragment parcial/medio**.
- Servirá para modelo conceptual, permisos y separación por hogar, pero no para API completa.

---

# 4.4 MEMBERSHIP

## Secciones fuente

- `05.02 Persona`
- `05.04 Membresía`
- `05.05 Roles`
- `05.08 Cambio de rol`
- `05.09 Expulsión`
- `05.10 Multi-hogar`
- `16 Multi-Hogar`
- `21.02 Membership`
- `22.02 Relaciones principales`
- `23.09 Roles`
- `Final Spec — Output 2: Membership`
- `Final Spec — Output 3: Membership links Person/Household/Role; Membership audit_logged AuditLog`

## Información encontrada

### Entidades

- Membership.
- Person.
- Household.
- Role.
- AuditLog.

### Campos

- Rol único activo.
- Estado de membresía.
- No se definen campos técnicos como joined_at, invited_by, suspended_at, household_id, person_id.

### Estados

- Pendiente.
- Activa.
- Suspendida.
- Finalizada.

### Flujos

- Persona puede participar en uno o más hogares.
- Cada hogar mantiene membresía independiente.
- Roles pueden modificarse.
- Cambio de rol queda auditado.
- Coordinadores pueden expulsar miembros.
- Expulsión conserva historial y no elimina información histórica.

### APIs

- No encontrado.

### UI

- Settings → Hogar → Miembros/Roles/Permisos.
- People → Personas → Lista de miembros / Perfil individual.
- Perfil individual muestra resumen, tareas, eventos, goals, presence, actividad, responsabilidades.

### Permisos

- Coordinador: aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación, administrar configuraciones.
- Adulto: invitar personas pero no aprobar ingresos.

### Edge Cases

- Mismo usuario puede ser Coordinador en Hogar A, Adulto en Hogar B, Invitado en Hogar C.
- Expulsión conserva historial.

### Restricciones arquitectónicas

- Membresía es el vínculo de autorización y separación de datos por hogar.
- Roles son independientes por hogar.

### Eventos del sistema

- Cambio de rol, ingreso y expulsión se auditan.

### Dependencias

- Role y permisos dependen de Membership.
- AuditLog depende de cambios de Membership.

## Clasificación

### REAL

- Membership con estado y rol único.
- Relación persona/hogar.
- Cambios de rol auditados.
- Expulsión con conservación de historial.

### MOCK

- No encontrado.

### POST_MVP

- Multi-hogar avanzado.

### IGNORAR

- Métricas avanzadas o relaciones con módulos no MVP.

## Riesgos para extracción

- No se define aceptar invitación y activar membresía con detalle transaccional.
- No se define suspensión ni finalización en flujos.
- No se definen permisos por estado.
- No hay reglas de salida voluntaria.

## Recomendación

- Generar **membership_fragment medio**.

---

# 4.5 INVITATIONS

## Secciones fuente

- `05.07 Invitaciones`
- `04.03 Coordinador`
- `04.04 Adulto`
- `23.09 Roles`
- `24.09 Quick Actions: Invitar miembro`
- `24.10 Search: "invitar miembro" ejecutable`
- `Final Spec — Output 2: Invitation`
- `Final Spec — Output 3: Invitation targets Person/Household`

## Información encontrada

### Entidades

- Invitation.
- Person.
- Household.
- Membership.
- Role.

### Campos

- No se definen campos.
- No hay token, código, email, expires_at, status, accepted_at ni invited_by.

### Estados

- No se definen estados formales.
- Flujo conceptual: invitación, aceptación, aprobación si corresponde, ingreso.

### Flujos

- Una persona puede ser invitada a un hogar.
- Flujo: Invitación → Aceptación → Aprobación (si corresponde) → Ingreso al hogar.
- Adulto puede invitar personas.
- Coordinador puede aprobar ingresos.
- Search y Quick Actions pueden ejecutar “Invitar miembro”.

### APIs

- No encontrado.

### UI

- Quick Actions incluye acción condicional “Invitar miembro”.
- Search puede ejecutar “invitar miembro”.
- Settings/Hogar/Miembros es punto probable, pero no especificado como pantalla de invitación.

### Permisos

- Adulto puede invitar personas.
- Coordinador aprueba ingresos.
- Adulto no puede aprobar ingresos.

### Edge Cases

- Aprobación “si corresponde” indefinida.
- No hay expiración ni single-use token.
- No hay reglas para invitado sin cuenta previa.

### Restricciones arquitectónicas

- Invitation targetea Person y Household en el archivo de comprensión.
- Ingreso debe resultar en Membership activa o pendiente según aprobación.

### Eventos del sistema

- Invitación creada/aceptada/ingreso conceptual, sin nombre técnico.
- Ingresos auditables.

### Dependencias

- Depende de Household, Membership, Role y permisos de Coordinador/Adulto.

## Clasificación

### REAL

- Crear invitación como acción conceptual.
- Aceptar invitación como paso conceptual.
- Aprobación por Coordinador.

### MOCK

- No encontrado.

### POST_MVP

- No detectado específico.

### IGNORAR

- Automatizaciones o notificaciones avanzadas alrededor de invitaciones, salvo mínimo MVP.

## Riesgos para extracción

- Falta modelo y estados de Invitation.
- Falta token/código, expiración, single-use, errores y permisos finos.
- No se define si Adulto puede elegir rol del invitado.
- No se define si toda invitación requiere aprobación o solo algunas.

## Recomendación

- Generar **invitations_fragment parcial/medio**, con faltantes explícitos.

---

# 4.6 ROLES & PERMISSIONS

## Secciones fuente

- `04 Roles y Permisos`
- `05.05 Roles`
- `05.06 Relaciones familiares`
- `18.23 Home por rol`
- `24.17 Navegación por Rol — Resumen`
- `23.09 Roles`
- `17 Empleado Familiar`
- `Final Spec — Output 2: Role`

## Información encontrada

### Entidades

- Role.
- Membership.
- Permission conceptual.
- Person.
- Household.

### Campos

- Rol único activo por membresía.
- No se definen campos de Permission.

### Estados

- No hay estados de Role.

### Flujos

- Cambiar roles.
- Transferir coordinación.
- Expulsar miembros.
- Otorgar permisos especiales a Adolescente autorizado o Adulto autorizado para acciones específicas.

### APIs

- No encontrado.

### UI

- Settings → Hogar → Roles, Permisos.
- Home/Navegación por rol adaptan experiencia.

### Permisos

- **Coordinador:** aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación, administrar configuraciones del hogar. No puede eliminar hogares.
- **Adulto:** invitar personas, crear tareas, reasignar tareas, crear eventos, administrar operaciones familiares. No puede aprobar ingresos.
- **Adolescente:** crear eventos familiares, crear gastos, administrar tareas propias. Puede recibir permisos adicionales configurables.
- **Niño:** acceso simplificado; no administra información familiar crítica.
- **Adulto Mayor:** experiencia adaptada; permisos equivalentes a Adulto salvo configuraciones específicas; foco en personas, eventos, recordatorios, medicación, coordinación, tareas y briefing.
- **Invitado:** acceso mínimo; participación limitada.
- **Empleado Familiar:** acceso restringido a responsabilidades asignadas; no administra hogar; no participa en decisiones familiares.

### Edge Cases

- Empleado Familiar aparece como séptimo rol oficial, pero el MVP pedido solo incluye seis roles. Debe quedar fuera del MVP salvo mención mínima.
- Relaciones familiares son informativas y no modifican permisos automáticamente.
- Permisos configurables existen, pero no se detallan.

### Restricciones arquitectónicas

- Privacidad individual prevalece sobre roles.
- Ningún rol obtiene acceso automático a memoria privada, metas privadas, documentos privados o finanzas personales.
- Coordinadores administran el hogar, no la vida privada de las personas.

### Eventos del sistema

- Cambios de rol auditables.
- Ingresos auditables.
- Expulsiones auditables.

### Dependencias

- Role depende de Membership.
- Permission depende de Household y Role.

## Clasificación

### REAL

- Seis roles MVP mapeables: Coordinador→Coordinator, Adulto→Adult, Adolescente→Adolescent, Niño→Child, Adulto Mayor→Senior, Invitado→Guest.
- Permisos explícitos por rol.
- Privacidad transversal.

### MOCK

- No encontrado.

### POST_MVP

- Empleado Familiar.
- Permisos configurables avanzados.

### IGNORAR

- Permisos de SOS por rol para esta entrega, salvo índice global.

## Riesgos para extracción

- Documento dice siete roles oficiales; MVP obligatorio pide seis.
- No hay matriz completa acción/rol.
- No hay permisos explícitos para editar/eliminar tareas ni eventos por cada rol.
- No hay permisos explícitos para verificar tareas.
- “Adulto Mayor mantiene permisos equivalentes a Adulto salvo configuraciones específicas” puede requerir definición técnica.

## Recomendación

- Generar **roles_permissions_fragment completo/medio**.
- Usarlo primero porque condiciona Household, Invitations, Tasks, Events y Home.

---

# 4.7 PLANNER

## Secciones fuente

- `06 Planner`
- `06.02–06.16 Tasks`
- `06.17–06.20 Responsabilidades`
- `06.21–06.24 Calendar`
- `06.25–06.33 Goals`
- `14.16 Planner`
- `15.05 Triggers Planner`
- `18 Home`
- `19.03 Notifications Planner/Calendar`
- `20.03 Offline Planner/Calendar`
- `21.03 Task`, `21.05 Event`
- `22.03 Planner`, `22.05 Events`
- `23.05 Planner`
- `24.08 Planner — Estructura interna`
- `Final Spec — Output 2/3/5/6/7/9`

## Índice interno

| Parte del documento | Corresponde a | Clasificación para MVP |
| ------------------- | ------------- | ---------------------- |
| `06.02–06.16 Tasks` | Tasks | MIXTO: campos básicos REAL; dependencias/subtareas/comentarios/adjuntos POST_MVP; verification contradice MVP esperado |
| `06.17–06.20 Responsabilidades` | Eje organizador de Tasks | REAL parcial; no como dominio independiente |
| `06.21–06.24 Calendar` | Events/Calendar | REAL parcial; participantes pueden ser POST_MVP según alcance |
| `06.25–06.33 Goals` | Goals/Milestones | IGNORAR/POST_MVP |
| `14.16 Planner` | Geni puede organizar tareas/eventos/metas | POST_MVP |
| `15 Automatizaciones` | Triggers y acciones sobre Planner | IGNORAR |
| `18 Home` | Proyección Home de tareas/eventos | REAL/MOCK |
| `19 Notificaciones` | Recordatorios, tareas asignadas, eventos | POST_MVP o dependencia mínima |
| `20 Offline` | Offline sync Planner/Calendar | IGNORAR |
| `21 Estados` | Estados Task/Event | REAL pero contradice MVP expected verification |
| `22 Relaciones` | Task ↔ Responsibility/Goal/Event; Event ↔ Participants/Place/HomeCloud | MIXTO |
| `23 Auditoría` | Acciones Planner auditables | REAL parcial |
| `24.08 Planner nav` | Tasks, Calendar, Goals, filtros/agrupación | MIXTO |

## Recomendación general

- Planner debe extraerse como **índice general**, no como spec monolítica.
- Tasks, Events y Calendar deben tener fragments separados.
- Goals, Streaks, Milestones y automatizaciones deben quedar fuera de MVP.

---

# 4.8 TASKS

## Secciones fuente

- `06.02 Objetivo`
- `06.03 Campos principales`
- `06.04 Estados`
- `06.05 Prioridades`
- `06.06 Dependencias`
- `06.07 Recurrencias`
- `06.08 Subtareas`
- `06.09 Progreso de subtareas`
- `06.10 Comentarios`
- `06.11 Adjuntos`
- `06.12 Timeline`
- `06.13 Verificación`
- `06.14 Asignación`
- `06.15 Reasignación`
- `06.16 Plantillas`
- `06.17–06.20 Responsabilidades`
- `18.14–18.16 Tareas en Home`
- `21.03 Task`
- `22.03 Planner`
- `23.05 Planner`
- `24.08 Planner — Tasks`
- `Final Spec — Output 2: Task, Subtask, TaskComment, TaskAttachment, TaskDependency, TaskTemplate, Responsibility, Streak`
- `Final Spec — Output 3/7: relaciones Task`

## Información encontrada

### Entidades

- Task.
- Responsibility.
- Subtask.
- TaskComment.
- TaskAttachment.
- TaskDependency.
- TaskTemplate.
- Goal.
- Event relacionado.
- AuditLog.
- LoadMetric en archivo de comprensión.
- Streak en archivo de comprensión.

### Campos

- Título.
- Descripción.
- Responsable.
- Fecha de inicio.
- Fecha de vencimiento.
- Prioridad.
- Estado.
- Responsabilidad asociada.
- Goal asociada.
- Archivos.
- Comentarios.

### Estados

- Pendiente.
- En progreso.
- Completada.
- Cancelada.
- Vencida no es estado; se calcula automáticamente.

### Flujos

- Crear tarea aparece como Quick Action y como acción auditable.
- Editar tarea aparece en navegación de stack y auditoría.
- Asignar/reasignar tarea según permisos.
- Completar tarea aparece en timeline y auditoría.
- Verificación: opcional; cuando se verifica, Completada → Estado final; no existe estado separado.
- Recurrencias generan nuevas instancias, no reutilizan la misma tarea.
- Subtareas tienen un único nivel y progreso calculado.
- Dependencias bloquean tareas si la previa no se completa.
- Tasks se muestran en Home agrupadas por Responsabilidad.

### APIs

- No hay endpoints.
- Solo acciones mencionadas sin contrato API: crear, editar, asignar, reasignar, completar.

### UI

- Planner → Tasks.
- Filtros: Todas, Mías, Familia, Recurrentes, Completadas.
- Agrupar por: Responsabilidad, Prioridad, Fecha.
- Stack: Tasks → Task Detail → Edit Task → History.
- Modal para crear tarea.
- Quick Action: Crear tarea.
- Home muestra tareas agrupadas por Responsabilidad.

### Permisos

- Adulto puede crear tareas y reasignar tareas.
- Adolescente puede administrar tareas propias.
- Adulto Mayor mantiene acceso a tareas.
- Empleado Familiar tiene visión centrada en trabajo asignado.
- Responsable/asignación puede variar según permisos del hogar, pero no hay matriz completa.

### Edge Cases

- Vencida es estado derivado, no manual.
- Recurrencia genera nueva instancia para preservar historial.
- Subtareas no pueden anidarse.
- Dependencias bloquean tareas dependientes.
- Tarea tiene una única responsabilidad principal.

### Restricciones arquitectónicas

- Responsabilidades no son dominio independiente.
- Una tarea siempre tiene una Responsabilidad asociada según navegación/decisión arquitectónica.
- Auditoría para creación, edición, asignación, reasignación y completado.

### Eventos del sistema

- Tarea creada.
- Responsable cambiado.
- Fecha modificada.
- Completada.
- Nombres técnicos no definidos.

### Dependencias

- Task → Person responsable.
- Task → Responsibility.
- Task → Goal.
- Task → Task por dependencia.
- Task → Subtask.
- Task → TaskComment.
- Task → TaskAttachment.
- Task → Event.
- Task → TaskTemplate.
- Task → AuditLog.

## Clasificación

### REAL

- Crear/listar/editar/completar/eliminar como acciones MVP: **solo crear/editar/completar aparecen directamente; eliminar no aparece para Task**.
- Campos básicos: título, descripción, responsable, fecha de vencimiento, prioridad, estado, responsabilidad.
- Prioridades: Baja, Media, Alta, Crítica.
- Asignar/reasignar según permisos.
- Tareas con fecha aparecen en Home/Calendar por relación implícita, pero Calendar con tareas no está explícito.

### MOCK

- No encontrado.

### POST_MVP

- Dependencias.
- Subtareas.
- Comentarios.
- Adjuntos/archivos/imágenes/audio.
- Timeline avanzado.
- Goal asociada.
- Streak/current_streak/last_completed_day/recuperación parcial si aparece desde comprensión.
- LoadMetric/carga familiar real.
- Templates editables o TaskTemplate como entidad si se interpreta CRUD.

### IGNORAR

- Goals completos.
- Automatizaciones que crean tareas desde Inventory/Assets/Geni.

## Riesgos para extracción

- **Contradicción fuerte:** MVP esperado pide `pending`, `completed`, `awaiting_verification`, `verified`; documento define Pendiente, En progreso, Completada, Cancelada y dice que verificación no tiene estado separado.
- El documento no enumera templates MVP Limpieza/Compras/Mascotas/Medicación/Estudios/Pagos como constantes; solo menciona plantillas genéricas y responsabilidades Compras/Mascotas/Limpieza/Vehículos.
- El documento incluye dependencias, subtareas, comentarios y adjuntos, que el MVP pedido mueve a POST_MVP.
- No hay endpoint, request, response ni errores.
- No hay definición de eliminar tarea.
- No hay regla explícita de quién puede verificar tarea.
- No hay enum técnico de recurrencia `none/daily/weekly/monthly`.

## Recomendación

- Generar **tasks_fragment parcial/medio**.
- Debe incluir una sección de contradicciones sobre verification flow.
- Para MVP, usar solo campos/acciones básicos y marcar extras como POST_MVP.

---

# 4.9 EVENTS

## Secciones fuente

- `06.21 Calendar Objetivo`
- `06.22 Eventos`
- `06.23 Estados`
- `06.24 Participantes`
- `18.03 Navegación contextual: Próximos eventos → Calendar`
- `18.05 Bloques oficiales: Próximos Eventos`
- `19.03 Calendar notifications`
- `21.05 Event`
- `22.05 Events`
- `23.05 Planner`
- `24.08 Planner — Calendar`
- `Final Spec — Output 2: Event, EventParticipant`
- `Final Spec — Output 3/7: Event relationships`

## Información encontrada

### Entidades

- Event.
- EventParticipant.
- Person.
- Place.
- Album/MediaItem en integración HomeCloud.
- AuditLog.
- Briefing en relaciones ocultas.

### Campos

- No hay lista formal de campos de Event.
- Se menciona tipo familiar/personal.
- Se mencionan participantes múltiples.
- Se menciona relación con Place en archivo de comprensión.

### Estados

- Programado.
- Completado.
- Cancelado.
- No existe Postergado; postergar equivale a modificar fecha.

### Flujos

- Crear evento aparece como permiso Adulto, Adolescente y Quick Action.
- Editar evento implícito por “postergar = modificar fecha” y auditoría Planner edición.
- Eliminar evento no aparece explícitamente.
- Ver próximos eventos desde Home redirige a Calendar.
- Eventos pueden ser familiares o personales.

### APIs

- No encontrado.

### UI

- Planner → Calendar.
- Home → Próximos eventos.
- Quick Action: Crear evento.
- Modal para crear evento.

### Permisos

- Adulto puede crear eventos.
- Adolescente puede crear eventos familiares.
- Adulto Mayor prioriza eventos.
- Permisos de edición/eliminación no definidos.

### Edge Cases

- Postergado no existe como estado.
- Eventos personales vs familiares no se desarrollan en permisos.
- Participantes múltiples no tienen estados `accepted/declined/maybe`.

### Restricciones arquitectónicas

- Calendar administra eventos.
- Home informa y redirige, no administra.

### Eventos del sistema

- Event created/updated/deleted no aparece con nombres técnicos.
- El archivo de comprensión menciona relaciones ocultas donde cancelación cercana regenera Briefing.

### Dependencias

- Event → Person participantes.
- Event → Place.
- Event → HomeCloud/Album/MediaItem fuera de MVP.
- Event → Home/Briefing como resumen.

## Clasificación

### REAL

- Crear/listar/editar eventos: crear y listar/visualizar aparecen conceptualmente; editar implícito por modificar fecha.
- Estados Programado/Completado/Cancelado.
- Próximos eventos en Home.

### MOCK

- No encontrado.

### POST_MVP

- Participantes avanzados.
- Estados de invitación a evento `accepted/declined/maybe` si se agregan después.
- Integración HomeCloud/álbumes/media.
- Automatizaciones y Geni sobre eventos.

### IGNORAR

- Álbum automático desde Calendar.
- Reconocimiento facial.

## Riesgos para extracción

- No hay campos de Event como título, descripción, inicio, fin, ubicación, recurrence.
- No hay recurrencia simple `none/daily/weekly/monthly` para eventos.
- No hay vistas día/semana/mes.
- No hay contratos API ni errores.
- No hay permisos de editar/eliminar.
- No hay eliminar evento explícito.

## Recomendación

- Generar **events_fragment parcial/mínimo-medio**.

---

# 4.10 CALENDAR

## Secciones fuente

- `06.21 Calendar Objetivo`
- `06.22 Eventos`
- `06.23 Estados`
- `06.24 Participantes`
- `18.03 Próximos eventos → Calendar`
- `18.05 Próximos Eventos`
- `24.08 Planner — Calendar`
- `20.03 Offline — Calendar`
- `19.03 Calendar notifications`

## Información encontrada

### Entidades

- Calendar como subárea de Planner.
- Event.
- EventParticipant.
- Task con fecha: no explícito como Calendar input, pero Planner/Tasks comparten fechas.

### Campos

- No hay campos de Calendar.
- No hay rangos ni filtros definidos.

### Estados

- Hereda estados de Event.
- No hay estados de vista.

### Flujos

- Calendar administra eventos.
- Home redirige Próximos eventos a Calendar.
- Calendar está en Planner.

### APIs

- No encontrado.

### UI

- Planner → Calendar.
- No se definen vistas Día/Semana/Mes.
- No se definen filtros ni estados vacíos.

### Permisos

- Hereda permisos de Events.

### Edge Cases

- No hay handling de eventos cancelados en vista.
- No hay definición de tareas con fecha dentro de Calendar.

### Restricciones arquitectónicas

- Calendar es parte de Planner.
- Home no administra Calendar.

### Eventos del sistema

- No hay nombres técnicos.

### Dependencias

- Calendar depende de Events.
- Podría depender de Tasks con fecha para MVP, pero no aparece explícito en documento: marcar como implícito/requiere validación.

## Clasificación

### REAL

- Calendar como contenedor de eventos.
- Próximos eventos en Home.

### MOCK

- No encontrado.

### POST_MVP

- Offline calendar.
- Notificaciones avanzadas.
- Álbumes desde Calendar.

### IGNORAR

- HomeCloud/Media sugerida desde Calendar.

## Riesgos para extracción

- Faltan vistas Día/Semana/Mes del MVP.
- Faltan rango de fechas, filtros, navegación interna y estados vacíos.
- Faltan tareas con fecha dentro del calendario.

## Recomendación

- Generar **calendar_fragment mínimo/parcial**.

---

# 4.11 HOME

## Secciones fuente

- `02.12 Home como centro operativo`
- `07.26 Home`
- `08.23 Home`
- `09.17 Home`
- `10.22 Home`
- `13.12 Home`
- `14.05–14.10 Briefing`
- `18 Home completo`
- `24.06 Home`
- `25.05 Home`
- `Final Spec — Output 2: Briefing, LoadMetric`
- `Final Spec — Output 3/6/7: Briefing relationships, Home decisions`

## Información encontrada

### Entidades

- Home como pantalla/centro operativo.
- Briefing.
- Task.
- Event.
- Attention Required / Atención Requerida conceptual.
- LoadMetric / Carga Familiar.
- Presence resumido.
- Actividad Familiar conceptual.

### Campos

- No hay campos de entidad Home.
- Bloques oficiales en orden:
  1. Briefing Geni
  2. Atención Requerida
  3. Carga Familiar
  4. Próximos Eventos
  5. Tareas agrupadas por Responsabilidad
  6. Finanzas Relevantes condicional
  7. Presence Resumido
  8. Actividad Familiar

### Estados

- Home recuerda estado del Briefing.
- Briefing tiene versión resumida permanente y versión ampliada cuando hay cambios importantes.
- Tareas completadas hacen que widgets desaparezcan y Home se reorganice.
- Estado final sin tareas: card positiva “Todo al día”.

### Flujos

- Home resume y redirige al módulo administrador.
- Mis tareas → Planner.
- Próximos eventos → Calendar.
- Meta → Goals.
- Presupuesto excedido → Finance.
- Tareas se muestran agrupadas por responsabilidad.

### APIs

- No encontrado.

### UI

- Home es pantalla inicial y el usuario no puede cambiarla.
- Bottom Nav: Home está fijo como primer tab.
- Home usa bloques ordenados.
- Una única card de Briefing.
- Home por rol adapta experiencia.

### Permisos

- Home por rol:
  - Coordinador: visión completa del hogar.
  - Adulto: visión operativa.
  - Adolescente: foco en tareas, eventos y coordinación.
  - Niño: experiencia simplificada.
  - Adulto Mayor: briefing, tareas, eventos, personas, medicación, recordatorios.
  - Invitado: acceso mínimo.
  - Empleado Familiar: trabajo asignado.

### Edge Cases

- Sin tareas: card positiva.
- Finance/Presence/Inventory/Assets no tienen widget permanente; aparecen cuando requieren atención.
- Home no administra información.

### Restricciones arquitectónicas

- Home informa; módulos administran.
- Home siempre es punto de entrada.
- Home no debe transformarse en dashboard de todos los dominios.

### Eventos del sistema

- Cambios importantes pueden expandir Briefing.
- Final Spec menciona regeneración de Briefing por eventos cancelados cercanos, documentos por vencer, stock bajo, mantenimiento vencido, deudas vencidas; la mayoría es POST_MVP/ignorar para esta entrega.

### Dependencias

- Home → Tasks.
- Home → Events.
- Home → Briefing.
- Home → Presence/Finance/Inventory/Assets condicionales fuera de MVP.

## Clasificación

### REAL

- Próximos eventos.
- Tareas pendientes/agrupadas.
- Resumen del hogar como centro operativo.
- Redirección al módulo dueño.
- Home por rol a nivel conceptual.

### MOCK

- Para MVP solicitado: Briefing debe simularse con texto fijo o datos simples.
- Carga Familiar debe usar dummy.
- Presence debe usar dummy.
- Actividad Familiar debe usar dummy.

### POST_MVP

- Briefing real por Geni.
- Personalización automática por Geni.
- Motor de prioridad avanzado.
- Carga Familiar real/LoadMetric.
- Attention Required multi-dominio real.

### IGNORAR

- Finanzas Relevantes reales.
- Presence real.
- SOS real.
- Inventory/Assets/HomeCloud reales en Home.

## Riesgos para extracción

- Documento define Briefing como Geni real, pero MVP pedido lo baja a MOCK.
- Carga Familiar está en Home como bloque oficial pero el cálculo real aparece como LoadMetric en comprensión; MVP pide dummy.
- Presence aparece real en ecosistema, pero MVP pide dummy.
- Actividad Familiar no está detallada como entidad ni fuente.

## Recomendación

- Generar **home_fragment completo para MVP**, con fuerte separación REAL vs MOCK.

---

## 5. Mapa de entidades

| Entidad | Módulo/Dominio | Aparece en sección | Clasificación MVP | Notas |
| ------- | -------------- | ------------------ | ----------------- | ----- |
| User | Auth/Account | No explícito; inferible desde Cuenta | TRANSVERSAL | No inventar modelo; documento usa Cuenta/Persona. |
| Account / Cuenta | Account | 03.05, 05.11, 24.15, Final Spec Output 2 | REAL | Pertenece al usuario, no al hogar. |
| Person / Persona | People | 03.03, 05.02, 05.03, Final Spec Output 2 | REAL | Pertenece a cuenta; participa en hogares. |
| Household / Hogar | People/Household | 03.04, 16, 24.13, Final Spec Output 2 | REAL | Unidad organizativa principal. |
| Membership / Membresía | People/Household | 05.04, 21.02, 22.02, Final Spec Output 2 | REAL | Relación Person-Household con rol y estado. |
| HouseholdMember | Household | No nombrada literalmente | TRANSVERSAL | Usar Membership como entidad canónica equivalente si se necesita. |
| Role | People/Roles | 04, 05.05, Final Spec Output 2 | REAL | 7 roles en documento; MVP usa 6. |
| Permission | Roles/System | 04.10, 24.15 | TRANSVERSAL | Conceptual; sin entidad/campos. |
| Invitation | People/Invitations | 05.07, Final Spec Output 2 | REAL | Sin campos/estados formales. |
| Session | Auth | No encontrado | REAL requerido/faltante | MVP lo necesita, documento no. |
| RefreshToken | Auth | No encontrado | REAL requerido/faltante | MVP lo necesita, documento no. |
| Task | Planner/Tasks | 06.02–06.16, 21.03, Final Spec Output 2 | REAL/MIXTO | Básico real; adjuntos/comentarios/dependencias POST_MVP. |
| Responsibility | Planner/Tasks | 06.17–06.20, 24.08, Final Spec Output 2 | REAL/MIXTO | Propiedad/eje de Task, no dominio independiente. |
| TaskTemplate | Planner/Tasks | 06.16, Final Spec Output 2 | POST_MVP/MIXTO | MVP pide constantes sin CRUD; doc lo trata como plantilla genérica/entidad. |
| Subtask | Planner/Tasks | 06.08–06.09, Final Spec Output 2 | POST_MVP | Fuera de MVP pedido. |
| TaskComment | Planner/Tasks | 06.10, Final Spec Output 2 | POST_MVP | Fuera de MVP pedido. |
| TaskAttachment | Planner/Tasks | 06.11, Final Spec Output 2 | POST_MVP | Fuera de MVP pedido. |
| TaskDependency | Planner/Tasks | 06.06, Final Spec Output 2 | POST_MVP | Fuera de MVP pedido. |
| Event | Planner/Calendar | 06.21–06.24, 21.05, Final Spec Output 2 | REAL/MIXTO | Básico real; campos insuficientes. |
| EventParticipant | Planner/Calendar | 06.24, Final Spec Output 2 | POST_MVP/MIXTO | Participantes múltiples aparecen, pero estados avanzados fuera del MVP. |
| Calendar | Planner | 06.21, 24.08 | REAL/MIXTO | Contenedor de eventos; vistas no definidas. |
| Goal | Planner/Goals | 06.25–06.33, 21.06, Final Spec Output 2 | IGNORAR/POST_MVP | Fuera de extracción MVP. |
| Milestone | Planner/Goals | 06.27–06.28, Final Spec Output 2 | IGNORAR/POST_MVP | Fuera de extracción MVP. |
| Streak | Planner | Final Spec Output 2/9 | POST_MVP | No desarrollar. |
| Notification | Notifications | 19, Final Spec Output 2 | POST_MVP/MIXTO | Usar solo si afecta invitaciones/tareas/eventos MVP. |
| NotificationPreference | Notifications | 19.05, Final Spec Output 2 | POST_MVP | No desarrollar. |
| AuditLog | Audit | 23, Final Spec Output 2/3 | TRANSVERSAL | Auditar acciones importantes; nunca eliminar. |
| Briefing | Home/Geni | 14.05–14.10, 18.06–18.10, Final Spec Output 2 | MOCK/POST_MVP | MVP: mock; documento: Geni real. |
| LoadMetric | Home/System | Final Spec Output 2/7 | MOCK/POST_MVP | MVP: Carga Familiar dummy. |
| Finance entities | Finance | 07, Final Spec Output 2 | IGNORAR | Registrar solo en índice global. |
| Presence entities | Presence | 08, Final Spec Output 2 | IGNORAR/MOCK | MVP Home Presence dummy. |
| Inventory entities | Inventory | 09, Final Spec Output 2 | IGNORAR | Relación Inventory→Task futura. |
| Asset entities | Assets | 10, Final Spec Output 2 | IGNORAR | Relación AssetMaintenance→Task futura. |
| HomeCloud entities | HomeCloud | 11, Final Spec Output 2 | IGNORAR | Relación Event→Album futura. |
| SOSAlert | SOS | 13, Final Spec Output 2 | IGNORAR | No desarrollar. |
| Automation | Automations | 15, Final Spec Output 2 | IGNORAR | No desarrollar. |
| Post | Feed | 12, Final Spec Output 2 | IGNORAR | No desarrollar. |

---

## 6. Mapa de relaciones

| Entidad origen | Relación | Entidad destino | Módulos afectados | Clasificación | Fuente |
| -------------- | -------- | --------------- | ----------------- | ------------- | ------ |
| Person | belongs_to | Account | AUTH, HOUSEHOLD | REAL | 05.02, Final Spec Output 3 |
| Person | participates_in | Household | HOUSEHOLD, MEMBERSHIP | REAL | 05.02, 05.10 |
| Membership | links | Person | MEMBERSHIP | REAL | 05.04, Final Spec Output 3 |
| Membership | links | Household | MEMBERSHIP, HOUSEHOLD | REAL | 05.04, Final Spec Output 3 |
| Membership | has | Role | ROLES | REAL | 05.05, Final Spec Output 3 |
| Invitation | targets | Person | INVITATIONS | REAL | 05.07, Final Spec Output 3 |
| Invitation | targets | Household | INVITATIONS, HOUSEHOLD | REAL | 05.07, Final Spec Output 3 |
| Person | has_family_relation | Person | PEOPLE | POST_MVP/MIXTO | 05.06, Final Spec Output 3 |
| Task | assigned_to | Person | TASKS, ROLES | REAL | 06.03, Final Spec Output 3 |
| Task | belongs_to | Responsibility | TASKS | REAL/MIXTO | 06.17–06.20, 24.08, Final Spec Output 3 |
| Task | contributes_to | Goal | TASKS, GOALS | IGNORAR/POST_MVP | 06.31, Final Spec Output 3 |
| Task | depends_on | Task | TASKS | POST_MVP | 06.06, Final Spec Output 3 |
| Task | has_subtask | Subtask | TASKS | POST_MVP | 06.08, Final Spec Output 3 |
| Task | has_comment | TaskComment | TASKS | POST_MVP | 06.10, Final Spec Output 3 |
| Task | has_attachment | TaskAttachment | TASKS | POST_MVP | 06.11, Final Spec Output 3 |
| Task | references | Event | TASKS, EVENTS | POST_MVP/MIXTO | Final Spec Output 3 |
| Task | instantiated_from | TaskTemplate | TASKS | POST_MVP/MIXTO | 06.16, Final Spec Output 3 |
| Responsibility | has_member | Person | TASKS, MEMBERSHIP | MIXTO | 06.19–06.20, Final Spec Output 3 |
| Event | has_participant | Person | EVENTS | POST_MVP/MIXTO | 06.24, Final Spec Output 3 |
| Event | located_at | Place | EVENTS, PRESENCE | IGNORAR/POST_MVP | Final Spec Output 3 |
| Calendar | contains/displays | Event | CALENDAR | REAL | 06.21–06.24 |
| Calendar | displays | Task with due date | CALENDAR, TASKS | implícita / requiere validación | MVP esperado, no explícito en documento |
| Home | references | Task | HOME, TASKS | REAL | 18.14–18.16, Final Spec Output 3 |
| Home | references | Event | HOME, EVENTS | REAL | 18.03, 18.05, Final Spec Output 3 |
| Briefing | references | Task/Event | HOME | MOCK/POST_MVP | 14.07, 18.08, Final Spec Output 3 |
| AuditLog | tracks_action_on | Task | AUDIT, TASKS | REAL/MIXTO | 23.05, Final Spec Output 3 |
| AuditLog | tracks_action_on | Membership | AUDIT, MEMBERSHIP | REAL | 23.09, Final Spec Output 3 |
| InventoryItem | generates_task | Task | TASKS, INVENTORY | IGNORAR/POST_MVP | 09.14, Final Spec Output 3 |
| AssetMaintenance | generates_task | Task | TASKS, ASSETS | IGNORAR/POST_MVP | 10.18, Final Spec Output 3 |
| Geni | generates | Briefing | HOME, GENI | MOCK/POST_MVP | 14.05–14.10, Final Spec Output 3 |

---

## 7. Mapa de estados

| Entidad | Estados encontrados | Estados MVP esperados | Coincide con MVP | Riesgo |
| ------- | ------------------- | --------------------- | ---------------- | ------ |
| Membership | Pendiente, Activa, Suspendida, Finalizada | No especificados en prompt salvo membresía básica | Parcial | Falta mapping técnico y transiciones. |
| Invitation | Invitación, Aceptación, Aprobación si corresponde, Ingreso | Crear/aceptar invitación; estados no listados | Parcial | No hay estados formales, token ni expiración. |
| Task | Pendiente, En progreso, Completada, Cancelada; Vencida derivada | `pending`, `completed`, `awaiting_verification`, `verified` | No | Contradicción fuerte con Verification Flow MVP. |
| Verification Flow | Verificación opcional; Completada → Estado final; no estado separado | `pending`, `completed`, `awaiting_verification`, `verified` | No | Documento niega estado separado. |
| Event | Programado, Completado, Cancelado; no Postergado | No se dieron estados MVP salvo eventos CRUD | Parcial | Falta mapping técnico; no recurrence. |
| Session/Token | No encontrado | Sesión/Refresh Token MVP | No | Auth faltante. |
| Goal | Activa, Completada, Fallida | Fuera de MVP | N/A | Ignorar. |
| Automation | Activa, Pausada, Archivada | Fuera de MVP | N/A | Ignorar. |
| Empleado Familiar | Activo, Suspendido, Finalizado | Fuera MVP | N/A | Registrar como Post-MVP. |

---

## 8. Mapa de permisos

| Rol | Puede hacer | No puede hacer | Módulo | Fuente | Clasificación |
| --- | ----------- | -------------- | ------ | ------ | ------------- |
| Coordinator / Coordinador | Aprobar ingresos; cambiar roles; expulsar miembros; transferir coordinación; administrar configuraciones del hogar | No puede eliminar hogares; no accede automáticamente a datos privados | Household, Membership, Roles | 04.03, 04.02 | REAL |
| Adult / Adulto | Invitar personas; crear tareas; reasignar tareas; crear eventos; administrar operaciones familiares | No puede aprobar ingresos; no accede automáticamente a datos privados | Invitations, Tasks, Events | 04.04, 04.02 | REAL |
| Adolescent / Adolescente | Crear eventos familiares; crear gastos; administrar tareas propias; recibir permisos adicionales configurables | No definido para aprobar ingresos, roles o hogar; no accede automáticamente a datos privados | Tasks, Events, Finance | 04.05, 04.10 | REAL/MIXTO |
| Child / Niño | Acceso simplificado | No administra información familiar crítica | Home, People | 04.06, 18.23, 24.17 | REAL |
| Senior / Adulto Mayor | Permisos equivalentes a Adulto salvo configuraciones; acceso a personas, eventos, recordatorios, medicación, coordinación, tareas, briefing | No definido; privacidad individual sigue aplicando | Home, Tasks, Events | 04.07, 18.23, 24.17 | REAL/MIXTO |
| Guest / Invitado | Acceso mínimo; participación limitada; solo contexto autorizado | Sin navegación completa; no administra hogar | Home, People | 04.08, 18.23, 24.17 | REAL |
| Empleado Familiar | Acceso restringido a responsabilidades asignadas; puede consultar tareas y agenda necesarias para trabajar | No administra hogar; no participa en decisiones familiares | Roles, Tasks, Calendar | 04.09, 17, 18.23, 24.17 | POST_MVP |
| Información faltante | Verificar tareas, editar/eliminar tareas, editar/eliminar eventos, elegir rol al invitar, aceptar invitación, ver calendario completo | N/A | MVP general | No encontrado | Requiere definición |

---

## 9. Mapa de flujos

| Flujo | Pasos encontrados | Módulos involucrados | Clasificación | Fuente | Riesgos |
| ----- | ----------------- | -------------------- | ------------- | ------ | ------- |
| Register | No encontrado | AUTH | No encontrado | — | MVP obligatorio sin fuente. |
| Login | No encontrado | AUTH | No encontrado | — | MVP obligatorio sin fuente. |
| Refresh Token | No encontrado | AUTH | No encontrado | — | MVP obligatorio sin fuente. |
| Logout | No encontrado | AUTH | No encontrado | — | MVP obligatorio sin fuente. |
| Crear hogar durante registro | No encontrado | AUTH, HOUSEHOLD | No encontrado | — | Hogar sí existe, pero no ligado a registro. |
| Invitar miembro | Adulto puede invitar; Quick Actions/Search ejecutan “invitar miembro”; Invitation targetea Person/Household | Invitations, Household | Parcial/REAL | 04.04, 05.07, 24.09, 24.10 | Sin campos, token, expiración ni API. |
| Aceptar invitación | Invitación → Aceptación → Aprobación si corresponde → Ingreso | Invitations, Membership | Parcial/REAL | 05.07 | No define aprobación ni estados. |
| Onboarding por rol | Home y navegación por rol; sugerencias durante onboarding; Empleado Familiar tiene onboarding propio | Onboarding, Roles, Home | Parcial/MIXTO | 17.05, 18.23, 24.09, 24.17 | No hay pasos por rol MVP. |
| Crear tarea | Quick Action “Crear tarea”; Adulto puede crear tareas; auditar creación | Tasks | Parcial/REAL | 04.04, 23.05, 24.09 | Sin API/fields técnicos. |
| Editar tarea | Stack Task Detail → Edit Task; auditar edición | Tasks | Parcial/REAL | 23.05, 24.16 | Sin permisos ni contrato. |
| Completar tarea | Timeline “Completada”; auditar completado; widgets desaparecen | Tasks, Home | Parcial/REAL | 06.12, 18.15, 23.05 | Contradicción con verification MVP. |
| Verificar tarea | Tareas pueden requerir verificación; cuando se verifica, Completada→Estado final; no estado separado | Tasks | Parcial/CONTRADICTORIO | 06.13 | No coincide con estados MVP. |
| Eliminar tarea | No encontrado | Tasks | No encontrado | — | MVP requiere eliminar; documento no. |
| Crear evento | Adulto/Adolescente pueden crear eventos; Quick Action crear evento; modal crear evento | Events | Parcial/REAL | 04.04, 04.05, 24.09, 24.16 | Sin campos/API. |
| Editar evento | Postergar equivale a modificar fecha; edición Planner auditable de forma general | Events | Parcial | 06.23, 23.05 | Sin permiso ni pantalla. |
| Eliminar evento | No encontrado | Events | No encontrado | — | MVP requiere eliminar; documento no. |
| Ver calendario | Planner → Calendar; Home próximos eventos → Calendar | Calendar | Parcial/REAL | 18.03, 24.08 | Sin día/semana/mes. |
| Ver Home | Home pantalla inicial; bloques oficiales; Home por rol | Home | REAL/MOCK | 18, 24.06 | Distinguir mocks. |

---

## 10. Mapa de APIs

| Endpoint o acción | Método | Ruta | Request | Response | Errores | Módulo | Fuente | Estado |
| ----------------- | ------ | ---- | ------- | -------- | ------- | ------ | ------ | ------ |
| Register | No definido | No definido | No definido | No definido | No definido | AUTH | No encontrado | No encontrado |
| Login | No definido | No definido | No definido | No definido | No definido | AUTH | No encontrado | No encontrado |
| Refresh Token | No definido | No definido | No definido | No definido | No definido | AUTH | No encontrado | No encontrado |
| Logout | No definido | No definido | No definido | No definido | No definido | AUTH | No encontrado | No encontrado |
| Crear hogar | No definido | No definido | No definido | No definido | No definido | HOUSEHOLD | Hogar conceptual | Mencionado sin detalle |
| Invitar miembro | No definido | No definido | No definido | No definido | No definido | INVITATIONS | 04.04, 05.07, 24.09 | Acción mencionada sin contrato API |
| Aceptar invitación | No definido | No definido | No definido | No definido | No definido | INVITATIONS | 05.07 | Acción mencionada sin contrato API |
| Cambiar rol | No definido | No definido | No definido | No definido | No definido | ROLES | 04.03, 05.08, 23.09 | Acción mencionada sin contrato API |
| Expulsar miembro | No definido | No definido | No definido | No definido | No definido | MEMBERSHIP | 04.03, 05.09 | Acción mencionada sin contrato API |
| Crear tarea | No definido | No definido | No definido | No definido | No definido | TASKS | 04.04, 24.09 | Acción mencionada sin contrato API |
| Editar tarea | No definido | No definido | No definido | No definido | No definido | TASKS | 23.05, 24.16 | Acción mencionada sin contrato API |
| Reasignar tarea | No definido | No definido | No definido | No definido | No definido | TASKS | 04.04, 06.15, 23.05 | Acción mencionada sin contrato API |
| Completar tarea | No definido | No definido | No definido | No definido | No definido | TASKS | 06.12, 23.05 | Acción mencionada sin contrato API |
| Verificar tarea | No definido | No definido | No definido | No definido | No definido | TASKS | 06.13 | Acción mencionada sin contrato API |
| Eliminar tarea | No definido | No definido | No definido | No definido | No definido | TASKS | No encontrado | No encontrado |
| Crear evento | No definido | No definido | No definido | No definido | No definido | EVENTS | 04.04, 04.05, 24.09 | Acción mencionada sin contrato API |
| Editar evento | No definido | No definido | No definido | No definido | No definido | EVENTS | 06.23 implícito | Mencionado sin detalle |
| Eliminar evento | No definido | No definido | No definido | No definido | No definido | EVENTS | No encontrado | No encontrado |
| Listar calendario | No definido | No definido | No definido | No definido | No definido | CALENDAR | 06.21, 24.08 | Mencionado sin detalle |
| Ver Home | No definido | No definido | No definido | No definido | No definido | HOME | 18, 24.06 | Mencionado sin detalle |

---

## 11. Mapa de UI

| Pantalla/Componente | Módulo | Objetivo | Inputs | Botones | Estados | Fuente | Nivel de detalle |
| ------------------- | ------ | -------- | ------ | ------- | ------- | ------ | ---------------- |
| Login | AUTH | Acceder a cuenta | No definido | No definido | No definido | No encontrado | No encontrado |
| Register | AUTH | Crear cuenta | No definido | No definido | No definido | No encontrado | No encontrado |
| Onboarding | ONBOARDING | Adaptar acciones por rol | No definido | Sugerencias por rol implícitas | No definido | 24.09 | Mencionado |
| Create Household | HOUSEHOLD | Crear hogar | No definido | No definido | No definido | No encontrado | No encontrado |
| Invite Member | INVITATIONS | Invitar miembro al hogar | No definido | Invitar miembro como Quick Action/Search executable | No definido | 24.09, 24.10 | Mencionado |
| Accept Invitation | INVITATIONS | Aceptar invitación | No definido | No definido | No definido | 05.07 | Mencionado |
| Home | HOME | Centro operativo, resumen y redirección | Datos de tareas/eventos/briefing/presence/etc. | Navegar a módulos | Briefing resumido/ampliado; todo al día | 18, 24.06 | Parcial/alto conceptual |
| Home Briefing Card | HOME | Primer widget | Datos simples para MVP mock | Expandir implícito | Resumido/ampliado | 14.05–14.10, 18.06–18.10 | Parcial |
| Attention Required | HOME | Urgencias | SOS, vencidas, pagos, aprobaciones, vencimientos | Navegar | Priorizado | 18.11–18.13 | Mencionado |
| Task List | TASKS | Ver tareas | Filtros: Todas/Mías/Familia/Recurrentes/Completadas | Agrupar por Responsabilidad/Prioridad/Fecha | Completadas/filtros | 24.08 | Parcial |
| Create/Edit Task | TASKS | Crear/editar tarea | No definido | Crear tarea; Edit Task en stack | No definido | 24.09, 24.16 | Mencionado |
| Task Detail / History | TASKS | Ver detalle e historial | No definido | Editar | Timeline | 06.12, 24.16 | Mencionado |
| Calendar | CALENDAR | Ver eventos | No definido | Crear evento | No definido | 06.21, 24.08 | Mencionado |
| Create/Edit Event | EVENTS | Crear/modificar evento | No definido | Crear evento | No definido | 24.09, 24.16 | Mencionado |
| Settings/Hogar | HOUSEHOLD | Administrar hogar | Miembros, roles, responsabilidades, permisos, integraciones | No definido | No definido | 24.15 | Parcial |
| People/List Members | HOUSEHOLD/MEMBERSHIP | Ver miembros | No definido | No definido | No definido | 24.07 | Mencionado |
| Perfil individual | PEOPLE | Ver persona | No definido | No definido | Resumen/tareas/eventos/goals/presence/actividad/responsabilidades | 24.07 | Parcial |
| Quick Actions | SYSTEM/UI | Acciones frecuentes | Contexto, rol, frecuencia | Crear tarea, crear evento, invitar miembro condicional | Reordenamiento | 24.09 | Parcial |
| Search Global | SYSTEM/UI | Buscar/ejecutar acciones | Query | Ejecutables | Resultados por categoría | 24.10 | Parcial |

---

## 12. Mapa de eventos del sistema

| Evento | Cuándo ocurre | Qué produce | Módulo | Fuente | Clasificación |
| ------ | ------------- | ----------- | ------ | ------ | ------------- |
| auth.registered | No encontrado | No encontrado | AUTH | — | No encontrado |
| auth.logged_in | No encontrado | No encontrado | AUTH | — | No encontrado |
| auth.logged_out | No encontrado | No encontrado | AUTH | — | No encontrado |
| auth.token_refreshed | No encontrado | No encontrado | AUTH | — | No encontrado |
| household.created | No encontrado como evento técnico | Hogar creado no está definido | HOUSEHOLD | — | No encontrado |
| member.joined | Conceptual: ingreso al hogar luego de aceptación/aprobación | Membresía activa/ingreso; auditable | MEMBERSHIP | 05.07, 23.09 | Evento conceptual sin nombre técnico |
| invitation.created | Al invitar persona, acción conceptual | Invitación a hogar | INVITATIONS | 04.04, 05.07 | Evento conceptual sin nombre técnico |
| invitation.accepted | Al aceptar invitación | Pasa a aprobación/ingreso | INVITATIONS | 05.07 | Evento conceptual sin nombre técnico |
| task.created | Timeline: tarea creada; auditoría Planner | Registro en timeline/audit | TASKS | 06.12, 23.05 | Evento conceptual sin nombre técnico |
| task.completed | Timeline: completada; auditoría; Home reorganiza | Estado completada, widget desaparece | TASKS, HOME | 06.12, 18.15, 23.05 | Evento conceptual sin nombre técnico |
| task.verified | Al verificar tarea | Documento dice Completada → Estado final | TASKS | 06.13 | Conceptual/contradictorio |
| event.created | Crear evento como acción | Evento nuevo | EVENTS | 04.04, 24.09 | Evento conceptual sin nombre técnico |
| event.updated | Modificar fecha al postergar | Evento actualizado | EVENTS | 06.23 | Evento conceptual sin nombre técnico |
| event.deleted | No encontrado | No encontrado | EVENTS | — | No encontrado |
| role.changed | Cambio de rol | Auditoría | ROLES | 05.08, 23.09 | Evento conceptual sin nombre técnico |
| member.removed | Expulsión | Conserva historial; auditoría | MEMBERSHIP | 05.09, 23.09 | Evento conceptual sin nombre técnico |
| briefing.regenerated | Cambio importante; Final Spec menciona cancelación cercana y otros triggers | Briefing actualizado | HOME | Final Spec Output 7 | POST_MVP/MOCK |

---

## 13. Restricciones arquitectónicas detectadas

| Restricción | Clasificación | Fuente | Notas |
| ----------- | ------------- | ------ | ----- |
| Cuenta pertenece al usuario, no al hogar | Aplicable al MVP | 03.05, 05.11 | Base para Auth/Household. |
| Hogar es unidad organizativa principal | Aplicable al MVP | 03.04 | Todo ocurre dentro de un hogar. |
| Cada hogar mantiene membresía independiente | Aplicable al MVP | 05.02, 16 | Soporta separación por hogar. |
| No hay navegación cruzada entre hogares | Aplicable al MVP / Post-MVP según alcance | 24.13 | Multi-hogar avanzado puede quedar fuera, pero separación importa. |
| Privacidad individual prevalece | Aplicable al MVP | 02.01, 04.02 | Roles no acceden a datos privados automáticamente. |
| Coordinadores administran hogar, no vida privada | Aplicable al MVP | 02.03 | Importante para permisos. |
| Auditoría permanente | Aplicable al MVP parcial | 02.05, 23 | No eliminar auditoría. |
| Cambios de rol, ingresos, expulsiones auditables | Aplicable al MVP | 23.09 | Membership/Roles. |
| Planner audita creación, edición, asignación, reasignación, completado | Aplicable al MVP parcial | 23.05 | No hay implementación técnica. |
| Home informa; módulos administran | Aplicable al MVP | 02.12, 18, 25.05 | Home no debe tener CRUD. |
| Bottom Nav V1 congelada: Home, People, +, Planner, More | Aplicable UI | 24.04 | Útil si hay fragment UI. |
| Responsabilidades no son dominio independiente | Aplicable al MVP | 24.08, Final Spec Output 6 | Propiedad/eje de Task. |
| Tarea siempre tiene una Responsabilidad asociada | Requiere definición para MVP | 24.08, Output 9 | Si el MVP no lo exige, decidir después. |
| Vencida no es estado manual | Aplicable al MVP | 06.04, 21.04, Output 5 | Calculado automáticamente. |
| Recurrencias generan nuevas instancias | Post-MVP/MIXTO | 06.07, Output 6 | MVP pide simple recurrence para eventos, no tasks. |
| Único nivel de subtareas | Post-MVP | 06.08, Output 6 | Fuera de MVP. |
| No endpoints/API definidos | Requiere definición | Todo el documento | No inventar. |
| RLS no aparece explícito | Requiere definición | — | Separación por hogar está conceptual, no técnica. |
| Soft delete no se define para Tasks/Events | Requiere definición | — | Expulsión conserva historial; gastos no se eliminan, pero gasto fuera MVP. |
| Single-use tokens no aparecen | Requiere definición | — | Relevante para invitaciones/Auth. |
| Offline Sync | Fuera de alcance | 20 | Ignorar. |

---

## 14. Información MOCK detectada

> Nota: los archivos no usan las palabras MOCK/dummy. La clasificación MOCK proviene de la regla de entrega MVP indicada en el prompt, contrastada con el documento.

| Módulo | Qué se simula | Fuente | Qué NO debe implementarse realmente |
| ------ | ------------- | ------ | ----------------------------------- |
| HOME | Briefing con texto fijo o generado con datos simples, por ejemplo tareas/eventos contados | 14.05–14.10, 18.06–18.10 + regla MVP del prompt | No implementar Geni real, memoria, recomendaciones ni contexto multi-dominio real. |
| HOME | Carga Familiar con datos dummy | 18.05 + Final Spec LoadMetric | No calcular LoadMetric real, distribución de carga ni históricos. |
| HOME | Presence Resumido con datos dummy | 18.17–18.18, 08, regla MVP | No usar GPS, geocercas, historial ni estados reales. |
| HOME | Actividad Familiar con datos dummy | 18.05, 18.24 | No construir Feed, activity stream ni eventos reales multi-dominio. |

---

## 15. Información POST_MVP detectada

### AUTH / HOUSEHOLD

| Qué es | Dónde aparece | Por qué queda fuera del MVP | Puede afectar decisión actual |
| ------ | ------------- | --------------------------- | ----------------------------- |
| Multi-hogar avanzado y selector global | 16, 24.13 | MVP requiere separación por hogar, no multi-hogar avanzado | Sí: diseñar IDs por household desde inicio. |
| Empleado Familiar | 04.01, 04.09, 17 | Prompt lo excluye salvo vinculación explícita | Sí: no mezclar con roles MVP. |
| Permisos configurables avanzados | 04.10 | MVP solo necesita permisos base | Sí: dejar extensibilidad. |
| Memoria personal/familiar Geni | 03.06, 14.11–14.13 | Geni avanzado fuera | No para MVP Auth. |

### PLANNER

| Qué es | Dónde aparece | Por qué queda fuera del MVP | Puede afectar decisión actual |
| ------ | ------------- | --------------------------- | ----------------------------- |
| Subtareas | 06.08–06.09 | Prompt no las incluye en MVP | Sí: no modelarlas ahora. |
| Comentarios de tareas | 06.10 | Prompt los pone POST_MVP | No. |
| Adjuntos/archivos/imágenes/audio | 06.11 | Prompt los pone POST_MVP | No. |
| Dependencias entre tareas | 06.06 | No está en MVP obligatorio | Sí: no agregar blocked status. |
| Timeline avanzado | 06.12 | No requerido | Puede postergarse. |
| TaskTemplate como entidad/CRUD | 06.16, Final Spec Output 2 | MVP pide constantes sin CRUD/tabla/endpoints | Sí: usar constantes si se implementa. |
| Goals | 06.25–06.33 | Prompt dice ignorar Goals/Milestones | No para MVP. |
| Milestones | 06.27–06.28 | Fuera MVP | No. |
| Streak/current_streak/last_completed_day | Final Spec Output 2/9 | Prompt POST_MVP | No. |
| Automatizaciones sobre Planner | 15.05–15.08 | Ignorar para esta entrega | No. |
| Geni organiza tareas/eventos/metas | 14.16 | Geni avanzado fuera | No. |
| Participantes avanzados evento | 06.24, Output 2 | Prompt POST_MVP para accepted/declined/maybe | Puede dejar relación básica futura. |

### HOME

| Qué es | Dónde aparece | Por qué queda fuera del MVP | Puede afectar decisión actual |
| ------ | ------------- | --------------------------- | ----------------------------- |
| Briefing Geni real | 14.05–14.10, 18.06–18.10 | MVP pide MOCK | Sí: interfaz puede reservar card. |
| Motor de prioridad avanzado | 18.24 | No obligatorio | Sí: ordenar simple. |
| Personalización por Geni | 18.21–18.25 | Geni avanzado fuera | No. |
| Atención Requerida multi-dominio real | 18.11–18.13 | MVP solo Home básico | Sí: incluir estructura simple si no complica. |
| Presence real | 08, 18.17–18.18 | MVP dummy | No. |
| Finanzas relevantes reales | 07.26, 18.19–18.20 | Finance ignorado | No. |

### OTROS DOMINIOS

| Qué es | Dónde aparece | Por qué queda fuera del MVP | Puede afectar decisión actual |
| ------ | ------------- | --------------------------- | ----------------------------- |
| Finance completo | 07 | Ignorar para esta entrega | Solo relación externa con Home/Tasks si aparece. |
| Presence GPS/geofences/historial | 08 | Ignorar; Home Presence dummy | No. |
| Inventory | 09 | Ignorar | Relación futura Inventory→Task. |
| Assets | 10 | Ignorar | Relación futura AssetMaintenance→Task. |
| HomeCloud | 11 | Ignorar | Relación futura Event→Album. |
| Feed | 12 | Ignorar | No. |
| SOS | 13, 24.11 | Ignorar | No. |
| Geni avanzado | 14 | Ignorar/Post-MVP | No. |
| Automatizaciones | 15 | Ignorar | No. |
| Offline Sync | 20 | Ignorar | No. |

---

## 16. Información a IGNORAR

| Tema | Sección donde aparece | Motivo para ignorar |
| ---- | --------------------- | ------------------- |
| Feed | 12, 22.14, 24.07 | Fuera de extracción MVP. |
| SOS | 13, 24.11 | Fuera de extracción MVP. |
| Inventory | 09, 22.10 | Fuera de extracción MVP; registrar solo Inventory→Task futuro. |
| Assets | 10, 22.11 | Fuera de extracción MVP; registrar solo AssetMaintenance→Task futuro. |
| HomeCloud | 11, 22.12 | Fuera de extracción MVP. |
| Geni IA avanzada | 14 | MVP Home usa mock, no IA real. |
| Automations | 15 | Fuera de extracción MVP. |
| Presence GPS/geocercas/historial | 08 | Home Presence dummy en MVP. |
| Finanzas completas | 07 | Fuera de extracción MVP. |
| Offline Sync | 20 | Fuera de extracción MVP. |
| Multi-hogar avanzado | 16, 24.13 | Registrar separación por hogar, no desarrollar selector avanzado si no corresponde. |
| Goals | 06.25–06.33 | Prompt dice ignorar Goals. |
| Milestones | 06.27–06.28 | Prompt dice ignorar Milestones. |
| Empleado Familiar | 17 | Fuera del MVP salvo índice global. |
| Search Global/Geni Search | 14.20, 24.10 | No necesario para módulos MVP. |
| Quick Actions learning/pinning | 24.09 | Post-MVP; solo acciones base si hace falta. |
| Responsive desktop | 24.19 | No relevante para extracción backend/MVP. |

---

## 17. Contradicciones detectadas

| Tema | Sección A | Dice | Sección B | Dice | Impacto | Recomendación para extracción |
| ---- | --------- | ---- | --------- | ---- | ------- | ----------------------------- |
| Roles oficiales | 04.01 / 05.05 | 7 roles: incluye Empleado Familiar | Prompt MVP | 6 roles MVP; Empleado Familiar fuera salvo vínculo explícito | Alto | Mapear 6 roles MVP y registrar Empleado Familiar como POST_MVP. |
| Estados de Task | 06.04 / 21.03 | Pendiente, En progreso, Completada, Cancelada | Prompt MVP | pending, completed, awaiting_verification, verified | Alto | No resolver; marcar contradicción y pedir decisión en fragment. |
| Verification Flow | 06.13 | No existe estado separado; Completada→Estado final | Prompt MVP | awaiting_verification y verified son estados oficiales | Alto | Extraer ambos como conflicto; no inventar transición. |
| Templates | 06.16 / Output 2 | Existen plantillas; TaskTemplate como entidad | Prompt MVP | Templates predefinidas constantes, sin CRUD/tabla/endpoints | Alto | Para MVP usar constantes si se implementa; no crear CRUD ni tabla. |
| Templates predefinidas | 06.17 | Responsabilidades: Compras, Mascotas, Limpieza, Vehículos | Prompt MVP | Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos | Medio | No asumir que Responsabilidades = Templates; marcar categorías faltantes. |
| Comentarios/adjuntos | 06.10–06.11 | Tareas poseen comentarios y adjuntos | Prompt MVP | Adjuntos/comentarios POST_MVP | Alto | Clasificar como POST_MVP y no desarrollar. |
| Dependencias/subtareas | 06.06–06.09 | Aparecen como capacidades de Tasks | Prompt MVP | No incluidas en MVP | Medio | Clasificar POST_MVP. |
| Recurrencia | 06.07 | Recurrencia de tareas genera instancias | Prompt MVP | Recurrencia simple para eventos: none/daily/weekly/monthly | Medio | No aplicar regla de tasks a events; marcar faltante en events. |
| Events participants | 06.24 | Eventos pueden tener múltiples participantes | Prompt MVP | Participantes avanzados accepted/declined/maybe POST_MVP | Medio | Mantener participantes como relación conceptual; no estados RSVP. |
| Home Briefing | 14 / 18 | Briefing generado por Geni | Prompt MVP | Briefing mock con texto fijo/datos simples | Alto | Para MVP Home tratar como MOCK. |
| Presence Home | 18.17 / 08 | Presence real con ubicación/estado | Prompt MVP | Presence dummy | Alto | Mockear en Home; ignorar Presence real. |
| Carga Familiar | 18.05 / Output 2 LoadMetric | Puede implicar métrica real | Prompt MVP | Datos dummy | Medio | Mockear. |
| Multi-hogar | 02.09 / 16 / 24.13 | Multi-hogar real con selector | Prompt MVP | Household básico/separación de datos | Medio | Diseñar separación, no desarrollar avanzado. |

---

## 18. Información faltante

| Módulo | Información faltante | Por qué importa | Impacto en implementación |
| ------ | -------------------- | --------------- | ------------------------- |
| AUTH | Register/Login/Refresh/Logout | MVP obligatorio | Bloqueante para auth_fragment completo. |
| AUTH | Session/RefreshToken fields, expiración, rotación, revocación | Seguridad | Bloqueante técnico. |
| AUTH | Endpoints, request/response, errores | Implementación API | No se puede implementar sin definir. |
| ONBOARDING | Crear hogar durante registro | MVP obligatorio | Faltante crítico. |
| ONBOARDING | Pasos por rol MVP | UX y permisos iniciales | Requiere definición. |
| HOUSEHOLD | Campos de Household | Modelo de datos | Requiere completar en spec posterior. |
| HOUSEHOLD | Crear/editar configuración básica de hogar | MVP obligatorio | Parcial. |
| MEMBERSHIP | Transiciones de estados | Consistencia de permisos | Requiere definir. |
| MEMBERSHIP | Salida voluntaria/suspensión/finalización | Edge cases | Requiere definir. |
| INVITATIONS | Campos, estados, token/código, expiración, single-use | Seguridad y flujo | Bloqueante para implementación real. |
| INVITATIONS | Quién puede aprobar y cuándo corresponde | Regla de negocio | Ambiguo. |
| ROLES | Matriz completa de permisos para acciones MVP | Control de acceso | Alto riesgo. |
| TASKS | Tipos de campos | DB/API | Faltan tipos y constraints. |
| TASKS | Eliminar tarea | MVP obligatorio | No encontrado. |
| TASKS | Verification Flow compatible con MVP | Estado de tareas | Contradicción fuerte. |
| TASKS | Verificador autorizado | Seguridad/negocio | No definido. |
| TASKS | Templates MVP exactas | UI/datos iniciales | No aparecen como templates. |
| TASKS | Endpoint y errores | API | No implementable desde doc solo. |
| EVENTS | Campos de evento | DB/API/UI | Faltante crítico. |
| EVENTS | Editar/eliminar evento | MVP obligatorio | Eliminar no aparece. |
| EVENTS | Recurrencia simple | MVP obligatorio | No encontrado para eventos. |
| EVENTS | Permisos por rol | Seguridad | Parcial. |
| CALENDAR | Vistas Día/Semana/Mes | MVP obligatorio | No encontrado. |
| CALENDAR | Mostrar tareas con fecha | MVP obligatorio | No explícito. |
| CALENDAR | Filtros/rangos/empty states | UI | No definido. |
| HOME | Definición exacta de Resumen del hogar MVP | UI/API | Parcial. |
| HOME | Datos dummy concretos | Mock implementation | Requiere decidir valores. |
| SYSTEM | RLS técnico | Seguridad por hogar | No aparece explícito. |
| SYSTEM | Soft delete | Integridad histórica | No definido para módulos MVP. |
| SYSTEM | Auditoría técnica | Trazabilidad | Conceptual, no modelo. |
| NOTIFICATIONS | Invitaciones/tareas/eventos MVP | UX | Solo categorías generales. |

---

## 19. Recomendación de fragments a generar

| Fragment | Generar | Nivel esperado | Motivo | Secciones a consultar |
| -------- | ------- | -------------- | ------ | --------------------- |
| auth_fragment | Parcial | Mínimo | Auth no está definido; solo Account/Person/privacidad | 03.05, 05.02, 05.11, 24.15, Output 2 |
| onboarding_fragment | Parcial | Medio | Hay onboarding por rol conceptual y flujo invitación, pero no registro | 05.07, 17.05, 18.23, 24.09, 24.17 |
| household_fragment | Sí | Medio | Hogar, configuración, separación, settings y multi-hogar conceptual | 03.04, 05, 16, 24.13, 24.15 |
| membership_fragment | Sí | Medio | Membership está bien definida conceptualmente | 05.02–05.10, 21.02, 22.02, 23.09, Output 2/3 |
| invitations_fragment | Sí | Medio | Flujo conceptual existe, faltan campos/estados/API | 05.07, 04.03–04.04, 24.09, 24.10, Output 2/3 |
| roles_permissions_fragment | Sí | Completo/Medio | Roles y permisos explícitos son fuertes | 04, 05.05, 18.23, 24.17, 23.09 |
| planner_fragment | Sí | Medio | Como índice de Tasks/Events/Calendar, no spec monolítica | 06, 14.16, 15, 18, 21, 22, 24.08 |
| tasks_fragment | Sí | Medio | Mucha información, pero con contradicciones y Post-MVP | 06.02–06.20, 18.14–18.16, 21.03, 22.03, 23.05, 24.08 |
| events_fragment | Parcial | Mínimo/Medio | Eventos poco detallados | 06.21–06.24, 18.03, 18.05, 21.05, 22.05, 24.08 |
| calendar_fragment | Parcial | Mínimo | Calendar casi solo existe como contenedor | 06.21–06.24, 18.03, 24.08 |
| home_fragment | Sí | Completo | Home está muy bien definido, pero requiere MOCK separation | 02.12, 14.05–14.10, 18, 24.06, 25.05, Output 2/6/7 |

---

## 20. Orden recomendado de extracción en este chat

1. **roles_permissions_fragment** — define el marco de acciones permitidas y evita mezclar Empleado Familiar con MVP.
2. **household_fragment** — fija Hogar como unidad organizativa y separación de datos.
3. **membership_fragment** — define relación Persona/Hogar/Rol/Estado.
4. **invitations_fragment** — depende de roles, household y membership.
5. **auth_fragment** — será mínimo y debe declarar faltantes; conviene hacerlo después de Household/Membership para no inventar creación de hogar durante registro.
6. **onboarding_fragment** — combina invitaciones, roles y Home por rol.
7. **planner_fragment** — índice general para no mezclar Goals/Automations con Tasks/Events.
8. **tasks_fragment** — requiere roles/permisos y debe resolver/registrar contradicción de verification flow.
9. **events_fragment** — más corto y con faltantes claros.
10. **calendar_fragment** — depende de Events y parcialmente de Tasks con fecha.
11. **home_fragment** — debe cerrar usando Tasks/Events ya definidos y separando mocks.

---

## 21. Instrucciones para futuras extracciones

Usar exclusivamente el documento principal `HomePlus — FinalSpec(1).md`, el archivo de comprensión `Final Spec(1).txt` y este source map. No usar conocimiento externo. Extraer solo el módulo solicitado. No fusionar con otros documentos. No inventar endpoints, campos, permisos ni estados. Separar siempre REAL, MOCK, POST_MVP e IGNORAR. Si el documento contradice el MVP esperado, registrar la contradicción y no resolverla como decisión final. Para Home, Briefing/Carga Familiar/Presence/Actividad Familiar deben tratarse como MOCK en MVP. Para Planner, no desarrollar Goals, Streaks, subtareas, comentarios, adjuntos, dependencias ni automatizaciones en MVP. Para templates MVP, tratarlas como constantes solo si la extracción las requiere; no crear CRUD, tabla ni endpoints.
