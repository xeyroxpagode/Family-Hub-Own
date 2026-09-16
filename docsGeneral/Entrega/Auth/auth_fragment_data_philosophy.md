# AUTH + ONBOARDING fragment — SECCION_8_DATA_PHILOSOPHY

## 1. Información encontrada

### Objetivo del módulo

No se define un objetivo funcional explícito para Auth ni para Onboarding. El documento funciona como una fuente de restricciones transversales de datos, privacidad, seguridad, consentimiento, cierre de cuenta y permisos.

### Entidades

| Entidad | Información explícita encontrada | Relevancia para Auth / Onboarding |
|---|---|---|
| Cuenta | Pertenece al usuario, no al hogar. Incluye perfil, preferencias, idioma, configuración personal y memoria personal. | Base conceptual para cuenta de usuario. No define credenciales ni sesión. |
| Persona | Pertenece a una cuenta. Participa en uno o más hogares. Contiene nombre, apellido, foto, fecha de nacimiento, género, contacto y rol. | Base conceptual para identidad del miembro dentro del hogar. |
| Hogar | Unidad organizativa principal. Todo ocurre dentro de un hogar. | Afecta creación/ingreso al hogar, pero no se define creación durante registro. |
| Membresía | Relación entre una persona y un hogar. Estados: Pendiente, Activa, Suspendida, Finalizada. | Útil para ingreso al hogar e invitaciones, pero no se define contrato técnico. |
| Invitación | Flujo indicado en archivo de comprensión: Invitación → Aceptación → Aprobación → Ingreso al hogar. | Útil para onboarding/invitación, pero sin endpoints ni request/response. |
| Rol | Roles encontrados en archivo de comprensión: Coordinador, Adulto, Adolescente, Niño, AdultoMayor, Invitado. | Útil para onboarding por rol y permisos iniciales. |

### Campos

| Entidad | Campos encontrados | Tipo definido |
|---|---|---|
| Cuenta | perfil, preferencias, idioma, configuración personal, memoria personal | No |
| Persona | nombre, apellido, foto, fecha de nacimiento, género, contacto, rol | No |
| Membresía | estado: Pendiente, Activa, Suspendida, Finalizada | No |
| Cierre de cuenta | solicitud de cierre, período de gracia de 30 días, eliminación en día 30 | Parcial: plazos definidos, tipos no definidos |
| Consentimiento | confirmación explícita para datos sensibles durante onboarding | No |

No se encuentran campos para password, password hash, access token, refresh token, expiración de sesión, device, IP de sesión, email verification, reset password ni logout.

### Tipos

No se definen tipos técnicos para los campos de Auth u Onboarding.

### Valores por defecto

No se definen valores por defecto para Auth.

Para Onboarding se encuentra una regla general: cada dato sensible pide confirmación explícita. No se define un valor booleano, nombre de campo ni almacenamiento técnico del consentimiento.

### Restricciones

* Contraseñas, tokens y claves aparecen como datos que no se guardan; el documento indica que nunca se almacenan.
* Toda comunicación cliente-servidor debe usar TLS 1.3.
* Datos generales en reposo usan AES-256.
* Datos sensibles usan AES-256 + clave por hogar.
* RLS filtra cada consulta a nivel de base de datos por permisos del miembro que la origina; no es un filtro de capa de aplicación.
* Si la capa de aplicación falla, la base de datos no debe entregar datos que el miembro no debería ver.
* El acceso a un documento requiere autenticación del miembro, permiso explícito sobre el documento, descifrado con clave del hogar y descifrado con clave del documento.
* El usuario puede solicitar cierre de cuenta.
* Antes del cierre, HomePlus ofrece exportación completa.
* El cierre de cuenta tiene 30 días de gracia.
* Si el usuario no revierte el cierre, se eliminan todos los datos del usuario en el día 30.
* Si el usuario es el último miembro del hogar, se elimina el hogar completo en el día 30.
* Si el hogar sigue existiendo, ciertos datos del hogar permanecen aunque el miembro cierre su cuenta.
* El registro de auditoría permanece porque pertenece al sistema.

### Relaciones

| Origen | Relación | Destino | Estado |
|---|---|---|---|
| Cuenta | owns / pertenece a | Persona | Explícita en archivo de comprensión |
| Persona | participa en | Hogar | Explícita en archivo de comprensión |
| Membresía | links | Persona | Explícita en archivo de comprensión |
| Membresía | links | Hogar | Explícita en archivo de comprensión |
| Invitación | deriva en | Aceptación → Aprobación → Ingreso al hogar | Explícita en archivo de comprensión |
| Coordinador | aprueba | incorporación de niño al hogar | Explícita en documento principal |
| Usuario que cierra cuenta | puede provocar eliminación de | Hogar completo, si es último miembro | Explícita en documento principal |

### Cardinalidad

* Persona participa en uno o más hogares, según archivo de comprensión.
* Cuenta pertenece al usuario, no al hogar.
* La relación Persona/Hogar se expresa mediante Membresía.
* No se define cardinalidad de sesiones, tokens, invitaciones, hogares por cuenta ni miembros por hogar.

### Estados posibles

| Entidad / proceso | Estados encontrados | Notas |
|---|---|---|
| Membresía | Pendiente, Activa, Suspendida, Finalizada | Aparece en archivo de comprensión. No se mapea a enums técnicos en inglés. |
| Cierre de cuenta | Día 0 solicitud, 30 días de gracia, Día 30 eliminación | Es flujo temporal, no enum técnico. |
| Sesión / token | No encontrado | No hay estados de sesión. |
| Invitación | No se listan estados técnicos | Solo aparece flujo conceptual. |
| Onboarding | No encontrado | No hay estado global de onboarding. |

### Reglas de negocio

* La familia/usuario es dueña de sus datos; HomePlus administra, no es propietario.
* El usuario puede ver sus datos, exportarlos, solicitar eliminación total, saber qué datos existen y cerrar su cuenta llevándose copia antes del borrado final.
* No se cruzan datos de otros hogares; cada hogar es una bóveda aislada.
* Los datos personales del miembro se eliminan al cierre de cuenta si se completa el período de gracia.
* Si el hogar continúa existiendo tras el cierre de cuenta de un miembro:
  * las tareas del hogar creadas por ese miembro se transfieren al coordinador;
  * los eventos del hogar creados por ese miembro se transfieren al coordinador;
  * los registros de auditoría permanecen.
* Consentimiento informado: onboarding paso a paso; cada dato sensible pide confirmación explícita.
* Para niños, el coordinador aprueba explícitamente la incorporación al hogar.
* Para niños, los datos recolectados son mínimos: nombre, avatar, tareas asignadas y rachas.
* El coordinador puede ver y eliminar todos los datos del niño.
* Base legal indicada para procesamiento: consentimiento explícito en onboarding + interés legítimo de funcionamiento del hogar.
* Privacy by design se apoya en privacidad por defecto, minimización y RLS.

### Permisos

| Rol MVP | Nombre en documento | Información encontrada |
|---|---|---|
| Coordinator | Coordinador | Responsable administrativo principal del hogar. Aprueba ingresos, cambia roles, expulsa miembros y transfiere coordinación. Aprueba explícitamente incorporación de niños. Puede ver y eliminar todos los datos del niño. |
| Adult | Adulto | Miembro operativo con amplios permisos. Invita personas, crea/reasigna tareas y crea eventos. |
| Adolescent | Adolescente | Miembro con autonomía progresiva. Crea eventos familiares, crea gastos, administra tareas propias. Puede recibir permisos adicionales. |
| Child | Niño | Miembro con experiencia simplificada. No administra información familiar crítica. Sus datos recolectados son mínimos. |
| Senior | AdultoMayor | Miembro con experiencia adaptada. Home prioriza personas, eventos, recordatorios, medicación y coordinación. |
| Guest | Invitado | Acceso mínimo. Participación limitada. |

No se encuentra matriz completa de permisos para Register, Login, Refresh Token, Logout, creación de hogar durante registro, invitación durante onboarding ni aceptación de invitación.

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

No se encuentra como flujo de onboarding. Solo se encuentra, en archivo de comprensión, el flujo conceptual: Invitación → Aceptación → Aprobación → Ingreso al hogar. También se encuentra que Adulto puede invitar personas y Coordinador puede aprobar ingresos.

#### Aceptar invitación

Parcial. El archivo de comprensión menciona “Aceptación” dentro del flujo Invitación → Aceptación → Aprobación → Ingreso al hogar. No hay contrato técnico ni pasos detallados.

#### Onboarding por rol

Parcial. El documento no define pantallas ni pasos por rol. El archivo de comprensión sí describe roles y responsabilidades generales. El documento principal agrega reglas específicas para incorporación de niños y consentimiento explícito.

#### Cierre de cuenta

1. Usuario solicita cierre desde Configuración.
2. HomePlus ofrece exportación completa antes de proceder.
3. Existe período de gracia de 30 días.
4. Si no revierte, se eliminan todos los datos del usuario el día 30.
5. Si el usuario es el último miembro del hogar, se elimina el hogar completo el día 30.

### APIs

No se definen endpoints.

Acciones mencionadas sin contrato API:

* solicitar cierre de cuenta;
* revertir cierre durante período de gracia;
* exportar datos antes del cierre;
* eliminar datos personales al cierre definitivo;
* autenticar miembro para acceder a documentos;
* aplicar RLS por permisos del miembro;
* registrar consentimiento explícito durante onboarding;
* aprobar incorporación de niño al hogar;
* aceptar invitación, solo como paso conceptual;
* aprobar ingreso al hogar, solo como paso conceptual.

No se encuentran métodos HTTP, rutas, request, response ni errores.

### Request

No encontrado.

### Response

No encontrado.

### UI

| Pantalla / ubicación | Información encontrada | Nivel de detalle |
|---|---|---|
| Configuración → Exportar Datos | Mecanismo de exportación. El usuario selecciona dominios, rango de fechas y formato. | Parcial |
| Configuración → Mis Datos | Inventario de datos visible. | Mencionado |
| Configuración → Privacidad | Log de accesos a datos. | Mencionado |
| Configuración | Solicitud de cierre de cuenta. | Parcial |
| Onboarding paso a paso | Cada dato sensible pide confirmación explícita. | Mencionado |
| Settings → Cuenta | Perfil, Seguridad, Privacidad, según archivo de comprensión. | Mencionado |

No se encuentran pantallas de Login, Register, Refresh Token, Logout, Create Household, Invite Member o Accept Invitation.

### Componentes UI

No se definen componentes UI específicos para Auth ni Onboarding.

### Navegación

* Configuración → Exportar Datos.
* Configuración → Mis Datos.
* Configuración → Privacidad.
* Settings → Cuenta: Perfil, Seguridad, Privacidad.

No se encuentra navegación de onboarding ni flujo de pantallas.

### Eventos del sistema

No se definen nombres técnicos de eventos.

Eventos conceptuales detectados:

* solicitud de cierre de cuenta;
* exportación previa al cierre;
* reversión posible durante período de gracia;
* eliminación definitiva de cuenta/datos personales;
* eliminación de hogar si el usuario era último miembro;
* consentimiento explícito registrado durante onboarding;
* aprobación de incorporación de niño al hogar;
* aceptación de invitación;
* aprobación de ingreso al hogar.

### Dependencias

* Household: por creación/ingreso al hogar y eliminación del hogar si el último miembro cierra cuenta.
* Membership: por relación Persona/Hogar y estados de membresía.
* Invitations: por flujo Invitación → Aceptación → Aprobación → Ingreso.
* Roles & Permissions: por RLS, visibilidad y reglas por rol.
* Audit: porque acciones importantes deben dejar registro y los registros permanecen.
* Exportación: porque debe ofrecerse antes del cierre de cuenta.
* Planner: porque tareas/eventos del hogar creados por un miembro que cierra cuenta se transfieren al coordinador.

### Restricciones arquitectónicas

* RLS debe aplicarse a nivel de base de datos.
* TLS 1.3 obligatorio para toda comunicación cliente-servidor.
* AES-256 para datos generales en reposo.
* AES-256 + clave por hogar para datos sensibles.
* No se deben almacenar contraseñas, tokens ni claves como datos persistidos del hogar.
* La separación por hogar es obligatoria: no se cruzan datos entre hogares.
* Auditoría permanente para acciones importantes sobre datos del hogar.
* Privacy by design: privacidad por defecto + minimización + RLS.

### Casos de uso

* Usuario consulta sus datos.
* Usuario exporta datos.
* Usuario solicita cierre de cuenta.
* Usuario revierte cierre dentro del período de gracia.
* Sistema elimina datos personales al día 30 si no se revierte.
* Sistema elimina hogar si el usuario que cierra cuenta era el último miembro.
* Coordinador aprueba incorporación de niño al hogar.
* Miembro accede a datos protegidos solo si está autenticado y autorizado.

### Casos especiales

* Si el hogar sigue existiendo, datos del hogar creados por el usuario pueden permanecer y transferirse al coordinador.
* Registros de auditoría permanecen aunque el usuario cierre cuenta.
* Datos personales y datos del hogar tienen tratamiento distinto al cierre de cuenta.
* El documento menciona que no se guardan tokens, pero el MVP requiere Refresh Token. Esto queda como contradicción/ambigüedad pendiente de definición.

### Edge cases

* Último miembro cierra cuenta → eliminación del hogar completo.
* Cierre de cuenta solicitado pero revertido dentro de 30 días → no se especifican detalles de restauración.
* Invitación aceptada requiere aprobación antes de ingreso, según archivo de comprensión; no se define qué pasa si se rechaza o expira.
* Incorporación de niño requiere aprobación explícita del coordinador; no se define proceso alternativo si no hay coordinador padre/madre.

### Datos mockeados

No se encuentran datos mockeados para Auth u Onboarding.

### Funcionalidades REAL

* Cierre de cuenta con período de gracia de 30 días.
* Exportación previa al cierre.
* Eliminación de datos personales al cierre definitivo.
* Eliminación de hogar si el usuario era el último miembro.
* RLS por permisos del miembro.
* Requisito de autenticación para acceder a documentos protegidos.
* Consentimiento explícito durante onboarding para datos sensibles.
* Aprobación explícita del coordinador para incorporar niños al hogar.
* Roles base para experiencia/permisos: Coordinator, Adult, Adolescent, Child, Senior, Guest.

### Funcionalidades MOCK

No encontrado.

### Funcionalidades POST_MVP

* Rachas aparecen en los datos mínimos recolectados de niños, pero para esta entrega deben quedar POST_MVP.
* Inventario de datos visible, log de accesos, exportación completa multi-formato y cumplimiento normativo detallado pueden afectar diseño, pero no hay que convertirlos en endpoints MVP de Auth salvo que otra fuente lo defina.

## 2. Clasificación para implementación

### REAL

* Usar Cuenta como entidad del usuario y Persona como entidad miembro/persona vinculada a hogares, según archivo de comprensión.
* Modelar la pertenencia Persona/Hogar mediante Membresía si se trabaja el ingreso al hogar.
* Considerar estados de Membresía encontrados: Pendiente, Activa, Suspendida, Finalizada.
* Respetar roles MVP mapeados desde español:
  * Coordinador → Coordinator
  * Adulto → Adult
  * Adolescente → Adolescent
  * Niño → Child
  * AdultoMayor → Senior
  * Invitado → Guest
* Aplicar RLS por permisos del miembro a nivel de base de datos.
* Exigir autenticación del miembro para acceso a datos protegidos.
* No persistir contraseñas, tokens ni claves como datos almacenados en claro o como dato funcional del hogar.
* Usar TLS 1.3 para comunicación cliente-servidor.
* Usar AES-256 para datos generales en reposo.
* Usar AES-256 + clave por hogar para datos sensibles.
* Implementar consentimiento explícito durante onboarding para datos sensibles si otro documento define el flujo técnico.
* Para incorporación de Child/Niño, requerir aprobación explícita del Coordinator/Coordinador.
* Cierre de cuenta, si entra al alcance de implementación: solicitud desde Configuración, exportación previa, 30 días de gracia, eliminación al día 30.

### MOCK

No se encontró información para simular en Auth u Onboarding.

### POST_MVP

* Rachas/streaks mencionadas para niños.
* Exportación completa multi-formato si no está dentro del MVP técnico de Auth.
* Inventario de datos visible y log de accesos si se tratan como Settings/Privacidad avanzada.
* Cumplimiento normativo detallado como DPO, notificación de brechas y registro formal de bases de datos.

### IGNORAR

No aplica para este fragment.

## 3. Información faltante

| Tema | Información faltante | Por qué importa | Impacto en implementación |
|---|---|---|---|
| Register | No aparece flujo, entidad, API, request, response, validaciones ni errores. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |
| Login | No aparece flujo, API, credenciales, validación, response ni errores. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |
| Refresh Token | No aparece flujo ni entidad RefreshToken. Además el documento dice que tokens no se almacenan. | Es obligatorio en MVP y puede chocar con la política de no almacenar tokens. | Requiere definición externa; no inventar solución. |
| Logout | No aparece flujo, invalidación de sesión/token ni endpoint. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |
| Crear hogar durante registro | No aparece flujo. Solo se define Hogar como unidad organizativa y aislamiento de datos. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |
| Invitar miembros durante onboarding | No aparece como onboarding. Solo existe flujo conceptual de invitación en archivo de comprensión. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |
| Aceptar invitación | Solo aparece como paso conceptual “Aceptación”. | Falta contrato y estados. | Implementación pendiente de otras fuentes. |
| Onboarding por rol | No se definen pasos/pantallas por rol. Solo descripciones de roles y reglas para niños. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |
| Estados de invitación | No se definen estados técnicos como pending/accepted/expired/revoked. | Necesario para invitaciones. | No se puede implementar desde este documento. |
| Estados de cuenta | No se define enum de cuenta. | Necesario para login/cierre/suspensión. | Requiere otra fuente. |
| Estados de sesión | No se definen. | Necesario para auth real. | Requiere otra fuente. |
| Campos de credenciales | No hay email, password, password hash, provider, verification, recovery. | Necesarios para Register/Login. | Requiere otra fuente. |
| Seguridad de tokens | “Tokens no se almacenan” es ambiguo frente a Refresh Token. | Puede cambiar arquitectura. | Resolver en etapa de merge con otra fuente. |
| APIs | No hay rutas, métodos, request, response ni errores. | Necesario para backend. | No generar endpoints desde este documento. |
| UI Auth | No hay Login/Register/Logout ni pantallas de invitación. | Necesario para frontend. | No generar UI desde este documento. |
| Permisos por rol | Hay descripciones generales, no matriz completa. | Necesario para autorización. | Usar solo como contexto parcial. |
| Consentimientos | No se define almacenamiento técnico, auditoría de consentimiento ni revocación genérica. | Necesario para onboarding. | Debe completarse desde otras fuentes. |
| Cierre de cuenta | Hay flujo temporal, pero no API, jobs, estados ni recuperación. | Si se implementa, requiere precisión técnica. | Queda parcial. |

## 4. Fuente

* Archivo principal: `HomePlus — SECCION 8 DATA PHILOSOPHY.md`
  * Sección 8.1.1 — Ownership — Los datos son del usuario, HomePlus administra
  * Sección 8.1.3 — Minimización — Solo se guarda lo necesario para coordinar
  * Sección 8.1.4 — Transparencia — El usuario sabe qué se guarda y por qué
  * Sección 8.1.5 — Trazabilidad — Las acciones importantes dejan huella
  * Sección 8.4.3 — Opt-in vs Opt-out
  * Sección 8.5 — Seguridad
  * Sección 8.5.1 — Cifrado en Tránsito y en Reposo
  * Sección 8.5.2 — Cifrado Especial de Documentos
  * Sección 8.5.3 — Row Level Security (RLS)
  * Sección 8.6.3 — Mecanismo de Exportación
  * Sección 8.6.4 — Qué Pasa al Cerrar la Cuenta
  * Sección 8.7.1 — Ley 25.326 — Argentina
  * Sección 8.7.2 — COPPA
  * Sección 8.7.3 — GDPR
* Archivo de comprensión asociado: `Seccion 8 Filosofia de la Informacion.txt`
  * OUTPUT 1 — ENTITIES
  * OUTPUT 2 — RELATIONSHIPS
  * Reglas detectadas sobre cierre de cuenta, RLS, roles, invitación y membresía
* Source map usado: `source_map_SECCION_8_DATA_PHILOSOPHY.md`
  * 4.1 AUTH
  * 4.2 ONBOARDING
