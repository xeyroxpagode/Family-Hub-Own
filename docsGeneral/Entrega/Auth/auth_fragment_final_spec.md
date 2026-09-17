# AUTH fragment — HomePlus — FinalSpec

## 1. Información encontrada

### Objetivo del módulo

El documento no define un módulo `Auth` como dominio independiente. La información implementable relacionada con Auth aparece de forma transversal en `Cuenta`, `Persona`, `Hogar`, `Membresía`, `Invitaciones`, `Roles`, `Settings` y navegación por rol.

### Entidades

#### Account / Cuenta

- La Cuenta pertenece al usuario.
- La Cuenta no pertenece al hogar.
- Incluye:
  - Perfil.
  - Preferencias.
  - Idioma.
  - Configuración personal.

#### Person / Persona

- Toda persona pertenece a una cuenta.
- Una persona puede participar en uno o más hogares.
- Cada hogar mantiene su propia membresía independiente.

#### Household / Hogar

- El Hogar es la unidad organizativa principal.
- Todo ocurre dentro de un hogar.
- Los roles pertenecen al hogar.

#### Membership / Membresía

- La membresía representa la relación entre una persona y un hogar.
- Cada membresía posee un único rol activo.
- La membresía se usa como vínculo entre persona, hogar y rol.

#### Role / Rol

Roles encontrados en el documento y mapeo para MVP:

| Nombre en documento | Nombre MVP |
| ------------------- | ---------- |
| Coordinador | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño | Child |
| Adulto Mayor | Senior |
| Invitado | Guest |

#### Invitation / Invitación

- Una persona puede ser invitada a un hogar.
- La invitación participa del flujo de ingreso al hogar.

### Campos

#### Campos de Persona encontrados

- Nombre.
- Apellido.
- Foto.
- Fecha de nacimiento.
- Género, opcional.
- Información de contacto.
- Rol dentro del hogar.

#### Campos de Cuenta encontrados

- Perfil.
- Preferencias.
- Idioma.
- Configuración personal.

#### Campos no encontrados para Auth

- Email.
- Password.
- Password hash.
- Provider.
- Email verificado.
- Access token.
- Refresh token.
- Session.
- Expiración de sesión.
- Estado de cuenta.

### Estados posibles

#### Membership

Estados encontrados:

- Pendiente.
- Activa.
- Suspendida.
- Finalizada.

#### Account / Session / Token

- No se definen estados de cuenta.
- No se definen estados de sesión.
- No se definen estados de token.

### Reglas de negocio

- La Cuenta pertenece al usuario, no al hogar.
- La Persona pertenece a una Cuenta.
- La Persona participa en hogares mediante Membresías independientes.
- Cada Membresía posee un único rol activo.
- Las relaciones familiares registradas son informativas y no modifican permisos automáticamente.
- La privacidad individual prevalece.
- Ningún rol obtiene acceso automático a información privada del usuario.
- Los Coordinadores administran el hogar, no la vida privada de las personas.

### Permisos relacionados

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
- Administrar operaciones familiares.

No puede:

- Aprobar ingresos.

#### Adolescent / Adolescente

Puede:

- Recibir permisos adicionales configurables.

#### Child / Niño

- Posee acceso simplificado.
- No administra información familiar crítica.

#### Senior / Adulto Mayor

- Utiliza una experiencia adaptada.
- Mantiene acceso a coordinación, personas, eventos, recordatorios, medicación, tareas y briefing según el documento.

#### Guest / Invitado

- Tiene acceso mínimo.
- Tiene participación limitada.
- En navegación por rol, solo ve contexto autorizado y no tiene navegación completa.

### Flujos

#### Register

- No se encontró flujo de registro.

#### Login

- No se encontró flujo de login.

#### Refresh Token

- No se encontró flujo de refresh token.

#### Logout

- No se encontró flujo de logout.

#### Crear hogar durante registro

- No se encontró flujo de creación de hogar durante registro.
- El documento sí define que el Hogar es la unidad organizativa principal y que la Cuenta no pertenece al hogar.

#### Invitar miembros durante onboarding

Flujo de invitación encontrado:

1. Invitación.
2. Aceptación.
3. Aprobación, si corresponde.
4. Ingreso al hogar.

Reglas asociadas:

- Adult puede invitar personas.
- Coordinator puede aprobar ingresos.
- Adult no puede aprobar ingresos.

#### Onboarding por rol

Información encontrada:

- Cada rol recibe una experiencia adaptada.
- Durante onboarding, Quick Actions puede sugerir acciones por rol.
- La navegación por rol define prioridades de experiencia:
  - Coordinator: estado operativo completo, distribución de carga, riesgos, responsabilidades y gestión de miembros.
  - Adult: responsabilidades propias y contexto familiar.
  - Adolescent: sus tareas, sus eventos y sus objetivos, con menos contexto global.
  - Child: tareas, logros y recordatorios, con mínima profundidad.
  - Senior: medicación, transporte, eventos y contactos; experiencia adaptada.
  - Guest: solo contexto autorizado, sin navegación completa.

No se encontraron pasos detallados de onboarding para cada rol MVP.

### APIs

No se encontraron endpoints ni contratos API para:

- Register.
- Login.
- Refresh Token.
- Logout.
- Crear hogar durante registro.
- Invitar miembros durante onboarding.
- Aceptar invitación.
- Aprobar ingreso.

### Request

No se encontraron estructuras de request para Auth u Onboarding.

### Response

No se encontraron estructuras de response para Auth u Onboarding.

### UI

#### Settings

Settings contiene una sección de Cuenta con:

- Perfil.
- Seguridad.
- Privacidad.

Settings contiene una sección de Hogar con:

- Miembros.
- Roles.
- Responsabilidades.
- Permisos.
- Integraciones.

#### Quick Actions

- Quick Actions puede incluir acciones condicionales según rol y permisos.
- Se menciona `Invitar miembro` como acción condicional.
- Durante onboarding, las acciones sugeridas pueden variar por rol.

#### Login / Register

- No se encontró pantalla de Login.
- No se encontró pantalla de Register.

### Componentes UI

- Settings → Cuenta → Perfil / Seguridad / Privacidad.
- Settings → Hogar → Miembros / Roles / Permisos.
- Quick Actions → acción condicional `Invitar miembro`.

### Navegación

- El avatar da acceso al perfil personal.
- La sección Cuenta vive dentro de Settings.
- La sección Hogar vive dentro de Settings.
- La navegación por rol adapta la experiencia visible para cada rol.

### Eventos del sistema

No se encontraron nombres técnicos de eventos para Auth.

Eventos conceptuales encontrados:

- Ingreso al hogar después de invitación, aceptación y aprobación si corresponde.
- Cambio de rol.
- Expulsión de miembro.

El documento indica que los cambios relevantes deben quedar registrados y que las acciones importantes generan trazabilidad.

### Dependencias

- Account depende del usuario.
- Person pertenece a Account.
- Membership vincula Person con Household.
- Membership posee Role.
- Invitation se relaciona con Person y Household.
- La aprobación de ingresos depende del rol Coordinator.
- La invitación de personas depende del rol Adult o de permisos del hogar.

### Restricciones arquitectónicas

- Separación entre Cuenta y Hogar.
- El Hogar es la unidad organizativa principal.
- La Persona entra al Hogar mediante Membresía.
- La Membresía mantiene rol único activo.
- La privacidad individual prevalece sobre los permisos del rol.
- Las acciones relevantes deben quedar registradas.

### Casos especiales / Edge cases

- Aprobación “si corresponde” aparece en el flujo de invitación, pero no se define cuándo corresponde.
- Una Persona puede participar en más de un hogar, con membresías independientes.
- Un Adult puede invitar personas pero no aprobar ingresos.
- Coordinator puede aprobar ingresos y cambiar roles.
- Guest tiene acceso mínimo y solo contexto autorizado.

### Datos mockeados

No se encontró información MOCK para Auth u Onboarding.

### Funcionalidades REAL

- Account separado de Household.
- Person vinculada a Account.
- Membership como relación Person–Household.
- Role único por Membership.
- Invitación conceptual al hogar.
- Aceptación conceptual de invitación.
- Aprobación conceptual de ingreso si corresponde.
- Experiencia por rol.
- Settings de Cuenta y Hogar.
- Quick Action condicional para invitar miembro.
- Privacidad individual.
- Trazabilidad de acciones importantes.

### Funcionalidades MOCK

No se encontró información MOCK aplicable.

### Funcionalidades POST_MVP

- Permisos configurables avanzados para miembros específicos.
- Personalización avanzada de acciones por frecuencia, recencia, rol y contexto.
- Onboarding específico de Empleado Familiar queda fuera de este fragment MVP porque no pertenece a los seis roles solicitados.

## 2. Clasificación para implementación

### REAL

- Usar `Account / Cuenta` como entidad de usuario separada del hogar.
- Usar `Person / Persona` como entidad perteneciente a una cuenta.
- Usar `Household / Hogar` como unidad organizativa principal.
- Usar `Membership / Membresía` como relación entre persona y hogar.
- Usar `Role / Rol` como rol único activo dentro de una membresía.
- Mapear roles MVP:
  - Coordinador → Coordinator.
  - Adulto → Adult.
  - Adolescente → Adolescent.
  - Niño → Child.
  - Adulto Mayor → Senior.
  - Invitado → Guest.
- Registrar que Adult puede invitar personas.
- Registrar que Coordinator puede aprobar ingresos.
- Registrar que Adult no puede aprobar ingresos.
- Registrar flujo conceptual de invitación:
  - Invitación → Aceptación → Aprobación si corresponde → Ingreso al hogar.
- Registrar experiencia adaptada por rol.
- Registrar que Settings contiene Cuenta y Hogar.
- Registrar que Quick Actions puede sugerir acciones por rol y permisos, incluyendo invitar miembro.
- Registrar privacidad individual como restricción transversal.
- Registrar trazabilidad de acciones importantes como restricción transversal.

### MOCK

No se encontró información para simular en Auth u Onboarding.

### POST_MVP

- Permisos configurables avanzados.
- Personalización avanzada del orden de Quick Actions por aprendizaje/contexto.
- Onboarding específico de Empleado Familiar.

### IGNORAR

No aplica contenido ignorado en este fragment.

## 3. Información faltante

### Auth técnico

- No se define módulo Auth.
- No se define Register.
- No se define Login.
- No se define Refresh Token.
- No se define Logout.
- No se define Session.
- No se define RefreshToken.
- No se definen access tokens.
- No se definen expiraciones.
- No se define rotación de tokens.
- No se define revocación de tokens.
- No se define hashing de password.
- No se define recuperación de contraseña.
- No se define verificación de email.

### Modelos y campos faltantes

- No hay campos técnicos para Account/User.
- No hay campos técnicos para Session.
- No hay campos técnicos para RefreshToken.
- No hay campos técnicos para Invitation.
- No hay campos técnicos para crear hogar durante registro.
- No hay tipos de datos.
- No hay valores por defecto.
- No hay constraints.

### Flujos faltantes

- Falta flujo de registro.
- Falta flujo de login.
- Falta flujo de refresh token.
- Falta flujo de logout.
- Falta flujo de crear hogar durante registro.
- Falta flujo completo de invitar miembros durante onboarding.
- Falta flujo detallado de aceptar invitación.
- Falta definición de cuándo una invitación requiere aprobación.
- Falta flujo de onboarding por cada rol MVP.

### APIs faltantes

- No hay endpoints.
- No hay métodos HTTP.
- No hay rutas.
- No hay requests.
- No hay responses.
- No hay errores.
- No hay códigos de estado.

### UI faltante

- No hay pantalla de Login.
- No hay pantalla de Register.
- No hay pantalla de creación de hogar durante registro.
- No hay pantalla de aceptar invitación.
- No hay pantalla detallada de onboarding por rol.
- No hay estructura de formularios.
- No hay validaciones visuales.
- No hay estados de carga/error/vacío.

### Permisos faltantes

- No se define quién puede aceptar invitaciones.
- No se define quién puede crear hogar durante registro.
- No se define si Adult puede definir rol del invitado.
- No se define si Coordinator debe aprobar todas las invitaciones o solo algunas.
- No se define matriz completa de permisos de onboarding.

### Contradicciones o riesgos

- El MVP obligatorio requiere Auth real, pero el documento no define Auth técnico.
- El MVP obligatorio requiere Register/Login/Refresh Token/Logout, pero el documento no contiene esos flujos.
- El MVP obligatorio requiere crear hogar durante registro, pero el documento solo define la entidad Hogar y su separación respecto de Cuenta.
- El documento contiene siete roles oficiales, pero este fragment MVP solo debe usar seis roles.
- “Aprobación si corresponde” es ambiguo y requiere definición posterior.
- La información de Onboarding por rol es conceptual; no alcanza para implementación completa.

## 4. Fuente

- Archivo: `HomePlus — FinalSpec(1).md`
  - Sección: `02.01 Privacidad primero`
  - Sección: `02.02 Propiedad de los datos`
  - Sección: `02.03 Coordinación por encima de jerarquía`
  - Sección: `02.04 Transparencia operativa`
  - Sección: `02.05 Auditoría permanente`
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
  - Sección: `05.07 Invitaciones`
  - Sección: `05.08 Cambio de rol`
  - Sección: `05.09 Expulsión`
  - Sección: `05.11 Perfil personal`
  - Sección: `05.12 Información privada`
  - Sección: `18.23 Home por rol`
  - Sección: `24.09 Quick Actions — Congelado V1`
  - Sección: `24.15 Settings — Ubicación`
  - Sección: `24.17 Navegación por Rol — Resumen`

- Archivo: `Final Spec(1).txt`
  - Sección: `OUTPUT 2 — CORE ENTITIES`
  - Sección: `OUTPUT 3 — CANONICAL RELATIONSHIPS`
  - Sección: `OUTPUT 5 — INVARIANTS`
  - Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`

- Archivo: `source_map_HomePlus_FinalSpec(1).md`
  - Sección: `4.1 AUTH`
  - Sección: `4.2 ONBOARDING`
  - Sección: `4.3 HOUSEHOLD`
  - Sección: `4.4 MEMBERSHIP`
  - Sección: `4.5 INVITATIONS`
  - Sección: `4.6 ROLES & PERMISSIONS`
  - Sección: `8. Mapa de permisos`
  - Sección: `9. Mapa de flujos`
  - Sección: `10. Mapa de APIs`
  - Sección: `11. Mapa de UI`
  - Sección: `12. Mapa de eventos del sistema`
  - Sección: `13. Restricciones arquitectónicas detectadas`
  - Sección: `18. Información faltante`
  - Sección: `19. Recomendación de fragments a generar`
