# AUTH fragment — HomePlus — FinalSpec

## 1. Información encontrada

### Objetivo del módulo

No existe una sección específica de Auth en el documento. La información implementable encontrada para este fragment proviene de la separación conceptual entre Cuenta, Persona, Hogar, Membresía e Invitación, y de la existencia de configuración de Cuenta.

### Entidades

- **Cuenta / Account**
  - Pertenece al usuario.
  - No pertenece al hogar.
  - Contiene perfil, preferencias, idioma y configuración personal.
- **Persona / Person**
  - Pertenece a una cuenta.
  - Puede participar en hogares mediante membresías.
- **Membresía / Membership**
  - Relaciona Persona con Hogar.
  - Contiene rol y estado.
- **Invitación / Invitation**
  - Permite que una persona sea invitada a un hogar.
- **Rol / Role**
  - Se aplica dentro de la membresía del hogar.

### Campos

Campos explícitos encontrados para Persona:

- Nombre.
- Apellido.
- Foto.
- Fecha de nacimiento.
- Género opcional.
- Información de contacto.
- Rol dentro del hogar.

Información explícita encontrada para Cuenta:

- Perfil.
- Preferencias.
- Idioma.
- Configuración personal.

No se encontraron campos explícitos para:

- Email.
- Password.
- Password hash.
- Provider.
- Email verificado.
- Session.
- Access token.
- Refresh token.

### Estados

No se encontraron estados de cuenta, sesión o token.

Estados relacionados, pero pertenecientes a Membership:

- Pendiente.
- Activa.
- Suspendida.
- Finalizada.

### Flujos

#### Register

No encontrado.

#### Login

No encontrado.

#### Refresh Token

No encontrado.

#### Logout

No encontrado.

#### Crear hogar durante registro

No encontrado.

#### Invitar miembros durante onboarding

El documento contiene un flujo general de invitaciones a hogar:

1. Invitación.
2. Aceptación.
3. Aprobación, si corresponde.
4. Ingreso al hogar.

No se indica que este flujo ocurra específicamente durante Register ni durante onboarding inicial.

#### Onboarding por rol

Se encontró información parcial:

- Durante onboarding pueden sugerirse acciones por rol.
- La experiencia de Home y la navegación se adaptan por rol.
- Los roles MVP encontrados son:
  - Coordinador → Coordinator.
  - Adulto → Adult.
  - Adolescente → Adolescent.
  - Niño → Child.
  - Adulto Mayor → Senior.
  - Invitado → Guest.

No se encontraron pasos específicos de onboarding para cada rol.

### APIs

No se encontraron endpoints, métodos, rutas, request, response ni errores para Auth.

Acciones obligatorias del MVP sin contrato API en este documento:

- Register.
- Login.
- Refresh Token.
- Logout.
- Crear hogar durante registro.

### UI

Información encontrada:

- Settings contiene sección Cuenta.
- Dentro de Cuenta aparecen:
  - Perfil.
  - Seguridad.
  - Privacidad.
- Durante onboarding se mencionan sugerencias de acciones por rol.

No se encontraron pantallas de:

- Login.
- Register.
- Recuperación de contraseña.
- Refresh session.
- Logout.

### Permisos

Información explícita:

- La información privada pertenece a quien la genera.
- Ningún rol obtiene acceso automático a información privada.
- La privacidad individual prevalece.
- Los Coordinadores administran el hogar, no la vida privada de las personas.

### Relaciones

- Persona pertenece a Cuenta.
- Persona se vincula a Hogar mediante Membership.
- Membership tiene un único rol activo.
- Invitation permite ingreso conceptual al hogar.

### Cardinalidad

- Una Persona pertenece a una Cuenta.
- Una Membership vincula una Persona con un Hogar.
- Cada Membership tiene un único rol activo.

### Restricciones arquitectónicas

- Cuenta y Hogar son conceptos separados.
- Cuenta pertenece al usuario.
- Hogar es la unidad organizativa donde operan roles, membresías e invitaciones.
- La privacidad individual tiene prioridad sobre la conveniencia.

### Eventos del sistema

No se encontraron nombres técnicos para eventos de Auth.

Eventos requeridos por MVP pero no encontrados:

- auth.registered.
- auth.logged_in.
- auth.logged_out.
- auth.token_refreshed.

### Dependencias

Auth depende conceptualmente de:

- Cuenta.
- Persona.
- Hogar.
- Membership.
- Role.
- Invitation.

## 2. Clasificación para implementación

### REAL

- Separar Cuenta de Hogar.
- Cuenta pertenece al usuario.
- Persona pertenece a Cuenta.
- Persona participa en Hogar mediante Membership.
- Membership contiene rol activo.
- Settings incluye una sección Cuenta con Perfil, Seguridad y Privacidad.
- La privacidad individual prevalece sobre permisos de rol.
- Onboarding por rol existe solo como adaptación conceptual de experiencia y sugerencias.

### MOCK

No se encontró información mockeable para Auth en este documento.

### POST_MVP

- Permisos configurables especiales para determinados miembros aparecen como concepto, pero no están detallados para Auth MVP.
- Existe un rol adicional fuera de los seis roles MVP; no se incorpora al alcance de este fragment.

### IGNORAR

No se incorpora contenido clasificado fuera de alcance.

## 3. Información faltante

- No se encontró flujo Register.
- No se encontró flujo Login.
- No se encontró flujo Refresh Token.
- No se encontró flujo Logout.
- No se encontró creación de hogar durante registro.
- No se encontró invitación de miembros como parte explícita del onboarding inicial.
- No se encontraron pasos de onboarding por rol para Coordinator, Adult, Adolescent, Child, Senior o Guest.
- No se encontró entidad User diferenciada de Account/Person.
- No se encontró entidad Session.
- No se encontró entidad RefreshToken.
- No se encontraron campos técnicos de Auth.
- No se encontraron endpoints ni contratos API.
- No se encontraron request/response.
- No se encontraron errores de Auth.
- No se encontraron reglas de expiración, rotación o revocación de tokens.
- No se encontró política de password.
- No se encontró verificación de email.
- No se encontró UI de Login/Register.
- El flujo de invitación menciona “aprobación si corresponde”, pero no define cuándo corresponde.

## 4. Fuente

- Archivo: `HomePlus — FinalSpec(1).md`
- Sección: `03.05 Cuenta`
- Sección: `05.02 Persona`
- Sección: `05.04 Membresía`
- Sección: `05.07 Invitaciones`
- Sección: `05.11 Perfil personal`
- Sección: `24.09 Quick Actions — Congelado V1`
- Sección: `24.15 Settings — Ubicación`
- Sección: `24.17 Navegación por Rol — Resumen`
- Archivo: `Final Spec(1).txt`
- Sección: `OUTPUT 2 — CORE ENTITIES`
- Sección: `OUTPUT 3 — CANONICAL RELATIONSHIPS`
- Archivo: `source_map_HomePlus_FinalSpec(1).md`
- Sección: `4.1 AUTH`
- Sección: `4.2 ONBOARDING`
