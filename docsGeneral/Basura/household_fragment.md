# HOUSEHOLD fragment — HomePlus — FinalSpec

## 1. Información encontrada

### Objetivo del módulo

El Hogar es la unidad organizativa principal. Todo ocurre dentro de un hogar. People es el dominio responsable de administrar las personas que participan dentro de un hogar y centraliza identidad, relaciones, roles, información básica y participación en el hogar.

### Entidades

- **Household / Hogar**
  - Unidad organizativa principal.
  - Contiene roles, membresías, permisos y configuración del hogar.
- **Person / Persona**
  - Pertenece a una cuenta.
  - Participa en hogares mediante membresía.
- **Membership / Membresía**
  - Representa la relación entre Persona y Hogar.
  - Tiene estado.
  - Tiene un único rol activo.
- **Role / Rol**
  - Rol oficial dentro del hogar.
  - Asociado a Membership.
- **Invitation / Invitación**
  - Permite invitar una persona a un hogar.
- **Permission / Permiso**
  - Aparece como configuración conceptual del hogar.
  - No se define como entidad con campos.

### Campos

Campos explícitos encontrados para Persona:

- Nombre.
- Apellido.
- Foto.
- Fecha de nacimiento.
- Género opcional.
- Información de contacto.
- Rol dentro del hogar.

Información explícita encontrada para configuración de Hogar:

- Miembros.
- Roles.
- Responsabilidades.
- Permisos.

Campos explícitos encontrados para Membership:

- Estado.
- Rol único activo.

No se encontraron campos técnicos de Household como nombre, avatar, zona horaria, owner, created_at o updated_at.

### Tipos

Roles oficiales encontrados y mapeo MVP:

- Coordinador → Coordinator.
- Adulto → Adult.
- Adolescente → Adolescent.
- Niño → Child.
- Adulto Mayor → Senior.
- Invitado → Guest.

### Estados posibles

Estados de Membership encontrados:

- Pendiente.
- Activa.
- Suspendida.
- Finalizada.

No se encontraron estados de Household.

No se encontraron estados formales de Invitation.

### Relaciones

- Persona pertenece a Cuenta.
- Persona participa en Hogar mediante Membership.
- Membership vincula Persona con Hogar.
- Membership tiene Role.
- Invitation apunta a Persona.
- Invitation apunta a Hogar.
- Role pertenece al contexto del Hogar mediante Membership.

### Cardinalidad

- Cada Membership tiene un único rol activo.
- Una Persona puede tener membresías de hogar independientes.
- Una Responsibility puede tener miembros asignados.

### Reglas de negocio

- Todo ocurre dentro de un hogar.
- Cada hogar mantiene su propia membresía independiente.
- Los roles son independientes por hogar.
- Las relaciones familiares son informativas.
- Las relaciones familiares no modifican permisos automáticamente.
- El cambio de rol queda auditado.
- La expulsión conserva historial.
- La expulsión no elimina información histórica.
- Ningún rol obtiene acceso automático a información privada.

### Permisos

#### Coordinator / Coordinador

Puede:

- Aprobar ingresos.
- Cambiar roles.
- Expulsar miembros.
- Transferir coordinación.
- Administrar configuraciones del hogar.

No puede:

- Eliminar hogares.

#### Adult / Adulto

Puede:

- Invitar personas.
- Crear tareas.
- Reasignar tareas.
- Crear eventos.
- Administrar operaciones familiares.

No puede:

- Aprobar ingresos.

#### Adolescent / Adolescente

Puede:

- Crear eventos familiares.
- Administrar tareas propias.
- Recibir permisos adicionales configurables.

#### Child / Niño

- Posee acceso simplificado.
- No administra información familiar crítica.

#### Senior / Adulto Mayor

- Utiliza una experiencia adaptada.
- Mantiene acceso a tareas y briefing.
- El documento indica que mantiene permisos equivalentes a Adulto salvo configuraciones específicas.

#### Guest / Invitado

- Acceso mínimo.
- Participación limitada.

### Flujos

#### Crear hogar

El documento define el Hogar como unidad organizativa principal, pero no describe un flujo de creación de hogar.

#### Gestión de miembros

Información encontrada:

- People administra personas que participan dentro de un hogar.
- Settings contiene Hogar → Miembros.
- Los roles pueden modificarse.
- Coordinadores pueden expulsar miembros.
- La expulsión conserva historial.

#### Invitaciones

Flujo encontrado:

1. Invitación.
2. Aceptación.
3. Aprobación, si corresponde.
4. Ingreso al hogar.

Permisos encontrados:

- Adulto puede invitar personas.
- Coordinador puede aprobar ingresos.
- Adulto no puede aprobar ingresos.

#### Aceptar invitación

Aparece como paso del flujo de invitación, pero sin detalle técnico.

#### Configuración básica del hogar

Settings contiene sección Hogar con:

- Miembros.
- Roles.
- Responsabilidades.
- Permisos.

### APIs

No se encontraron endpoints, rutas, métodos, request, response ni errores para Household, Membership, Invitations o Roles.

Acciones mencionadas sin contrato API:

- Crear hogar.
- Invitar miembro.
- Aceptar invitación.
- Aprobar ingreso.
- Cambiar rol.
- Expulsar miembro.
- Transferir coordinación.
- Administrar configuración del hogar.

### UI

Pantallas/componentes encontrados:

- People contiene Personas.
- Personas contiene Lista de miembros.
- Personas contiene Perfil individual.
- Settings contiene Hogar.
- Settings/Hogar contiene Miembros, Roles, Responsabilidades y Permisos.
- Quick Actions puede incluir Invitar miembro según rol y permisos.
- Search puede ejecutar “invitar miembro”.

### Navegación

- Settings vive exclusivamente en More.
- Settings no aparece en Bottom Nav.
- Settings no tiene acceso desde Home.
- People contiene la estructura de Personas.
- Perfil individual puede mostrar resumen, tareas, eventos, actividad y responsabilidades.

### Eventos del sistema

Eventos conceptuales encontrados, sin nombre técnico:

- Cambio de rol.
- Ingreso al hogar.
- Expulsión de miembro.
- Invitación creada.
- Invitación aceptada.

### Dependencias

Household depende de:

- Person.
- Account.
- Membership.
- Role.
- Invitation.
- Permission conceptual.

### Restricciones arquitectónicas

- Hogar es la unidad organizativa principal.
- Cuenta pertenece al usuario, no al hogar.
- Membership separa la participación de una Persona dentro del Hogar.
- Roles y permisos aplican dentro del contexto del Hogar.
- La privacidad individual prevalece.
- El Coordinador administra el hogar, no la vida privada de las personas.

## 2. Clasificación para implementación

### REAL

- Hogar como unidad organizativa principal.
- Cuenta separada de Hogar.
- Persona vinculada a Hogar mediante Membership.
- Membership con rol único activo.
- Estados de Membership: Pendiente, Activa, Suspendida, Finalizada.
- Roles MVP mapeados desde nombres en español.
- Gestión básica de miembros desde People/Settings.
- Invitar personas como acción permitida para Adulto.
- Aprobar ingresos como acción permitida para Coordinador.
- Cambiar roles como acción permitida para Coordinador.
- Expulsar miembros como acción permitida para Coordinador.
- Configuración básica del hogar: Miembros, Roles, Responsabilidades, Permisos.
- Cambio de rol auditado.
- Expulsión conserva historial.

### MOCK

No se encontró información mockeable para Household.

### POST_MVP

- Permisos configurables especiales para miembros específicos aparecen como concepto, pero no están definidos con granularidad implementable.
- Se detecta un rol oficial adicional fuera de los seis roles MVP; no se incorpora al MVP de este fragment.

### IGNORAR

No se incorpora contenido clasificado fuera de alcance.

## 3. Información faltante

- No se encontró flujo de crear hogar.
- No se encontró creación de hogar durante registro.
- No se encontraron campos técnicos de Household.
- No se encontró contrato API para Household.
- No se encontró request/response para crear hogar.
- No se encontró request/response para editar configuración básica del hogar.
- No se encontró modelo técnico de Permission.
- No se encontró matriz completa de permisos por rol.
- No se encontraron permisos explícitos para editar o eliminar miembros salvo expulsión por Coordinador.
- No se encontraron estados formales de Invitation.
- No se encontraron campos de Invitation.
- No se encontró token, código ni expiración de Invitation.
- No se encontró regla de single-use para invitaciones.
- “Aprobación si corresponde” aparece sin condición definida.
- No se define si Adult puede elegir rol al invitar.
- No se define si Coordinator debe aprobar todas las invitaciones o solo algunas.
- No se encontraron errores de invitación, membresía ni permisos.
- No se encontró UI detallada para crear hogar, invitar miembro o aceptar invitación.

## 4. Fuente

- Archivo: `HomePlus — FinalSpec(1).md`
- Sección: `03.04 Hogar`
- Sección: `03.05 Cuenta`
- Sección: `04.01 Roles oficiales`
- Sección: `04.02 Principio de privacidad`
- Sección: `04.03 Coordinador`
- Sección: `04.04 Adulto`
- Sección: `04.05 Adolescente`
- Sección: `04.06 Niño`
- Sección: `04.07 Adulto Mayor`
- Sección: `04.08 Invitado`
- Sección: `04.10 Permisos configurables`
- Sección: `05.01 Objetivo`
- Sección: `05.02 Persona`
- Sección: `05.03 Información básica`
- Sección: `05.04 Membresía`
- Sección: `05.05 Roles`
- Sección: `05.06 Relaciones familiares`
- Sección: `05.07 Invitaciones`
- Sección: `05.08 Cambio de rol`
- Sección: `05.09 Expulsión`
- Sección: `24.07 People — Estructura interna`
- Sección: `24.09 Quick Actions — Congelado V1`
- Sección: `24.10 Search Global`
- Sección: `24.15 Settings — Ubicación`
- Archivo: `Final Spec(1).txt`
- Sección: `OUTPUT 2 — CORE ENTITIES`
- Sección: `OUTPUT 3 — CANONICAL RELATIONSHIPS`
- Archivo: `source_map_HomePlus_FinalSpec(1).md`
- Sección: `4.3 HOUSEHOLD`
- Sección: `4.4 MEMBERSHIP`
- Sección: `4.5 INVITATIONS`
- Sección: `4.6 ROLES & PERMISSIONS`
