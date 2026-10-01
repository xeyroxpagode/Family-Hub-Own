# AUTH fragment — HomePlus — Sección 4: Emotional Design

## 1. Información encontrada

### Objetivo del módulo

* El documento no define un objetivo funcional de AUTH.
* El documento aporta reglas transversales útiles para AUTH + ONBOARDING:
  * la cuenta pertenece a la persona, no al hogar;
  * la persona puede participar en hogares mediante membresías;
  * los roles operan por hogar;
  * la privacidad individual tiene prioridad;
  * la experiencia de incorporación debe evitar fricción emocional, especialmente para Invitado y Adulto Mayor.

### Entidades

* `Account`:
  * Cuenta de usuario.
  * Pertenece a la persona, no al hogar.
  * Incluye perfil, preferencias, idioma y configuración personal.
* `Person`:
  * Entidad transversal.
  * Pertenece a una cuenta.
  * Participa en uno o más hogares.
* `Household`:
  * Unidad organizativa principal.
  * Todo ocurre dentro de un hogar.
* `Membership`:
  * Relación entre persona y hogar.
  * Permite asociar una persona a un hogar.
  * Tiene un rol dentro del hogar.
* `Invitation`:
  * Flujo de invitación detectado como `Invitación → Aceptación → Aprobación → Ingreso`.
  * People gestiona invitaciones.
* `Role`:
  * Roles detectados en el archivo asociado y mapeables al alcance MVP:
    * Coordinador → `Coordinator`
    * Adulto → `Adult`
    * Adolescente → `Adolescent`
    * Niño → `Child`
    * Adulto Mayor / `SeniorAdult` → `Senior`
    * Invitado → `Guest`

### Campos

* No se definen campos técnicos de AUTH.
* `Account` menciona atributos conceptuales:
  * perfil;
  * preferencias;
  * idioma;
  * configuración personal.
* Para la invitación del Invitado se mencionan elementos conceptuales de contenido:
  * por qué se lo invita;
  * qué podrá ver;
  * qué podrá hacer;
  * por cuánto tiempo, si aplica.
* No se definen campos para:
  * email;
  * password;
  * provider;
  * access token;
  * refresh token;
  * expiración;
  * dispositivo;
  * código de invitación;
  * token de invitación.

### Tipos

* No se definen tipos técnicos.
* No se definen tipos para campos de cuenta, credenciales, sesión, token o invitación.

### Valores por defecto

* No se definen valores por defecto para AUTH.
* Para `Senior`, el documento indica una experiencia simplificada por defecto.
* Para `Guest`, el documento indica experiencia limitada por arquitectura y onboarding breve.

### Restricciones

* La cuenta pertenece a la persona, no al hogar.
* Los roles son independientes por hogar: una persona puede tener un rol en un hogar y otro rol en otro hogar.
* La composición del hogar no modifica la arquitectura de roles y permisos; solo afecta el tono emocional.
* La privacidad individual tiene prioridad sobre la conveniencia.
* La coordinación está por encima de la jerarquía: quienes coordinan administran el hogar, no la vida privada.
* Ningún rol obtiene acceso automático a información privada solo por tener ese rol.
* Para `Guest`, los límites deben ser claros desde el inicio.
* Para `Guest`, las funciones no disponibles no deberían mostrarse como opciones bloqueadas; lo visible debería ser lo que efectivamente puede hacer.
* Para `Senior`, el sistema no debe exigir aprender mecánicas complejas ni generar sensación de carga.
* Para `Senior`, las funciones sensibles o configurables no deben asumirse por defecto.

### Relaciones

* `Person` pertenece a `Account`.
* `Person` tiene `Membership`.
* `Household` posee `Membership`.
* `Membership` tiene rol.
* `Membership` puede tener los roles del alcance MVP:
  * `Coordinator`;
  * `Adult`;
  * `Adolescent`;
  * `Child`;
  * `Senior`;
  * `Guest`.
* `People` gestiona `Invitation`.
* Flujo conceptual detectado:
  * `Coordinator` → invitación → `Person`.
  * `Person` → aceptación → `Membership`.

### Cardinalidad

* `Person` puede participar en uno o más hogares.
* No se define cardinalidad técnica para:
  * una cuenta y múltiples personas;
  * múltiples cuentas por persona;
  * múltiples invitaciones por persona;
  * múltiples hogares por cuenta.

### Estados posibles

* `Membership` tiene estados detectados:
  * `Pendiente`;
  * `Activa`;
  * `Suspendida`;
  * `Finalizada`.
* No se definen estados para:
  * `Account`;
  * sesión;
  * access token;
  * refresh token;
  * invitación.

### Reglas de negocio

* La privacidad individual tiene prioridad sobre la conveniencia.
* Los datos pertenecen a los usuarios; el sistema administra, no posee.
* Los roles son independientes por hogar.
* La incorporación de nuevos miembros debe tener bienvenida real.
* El `Guest` debe tener bienvenida sin presión.
* El `Guest` debe tener claridad de límites.
* El `Guest` debe tener participación sin ambigüedad.
* El onboarding del `Guest` debe ser breve y cálido, sin tutoriales innecesarios.
* El `Guest` debe saber qué puede y qué no puede hacer sin descubrirlo por ensayo y error.
* La experiencia del `Senior` debe priorizar simplicidad y pertenencia activa.
* La experiencia del `Senior` debe evitar carga, complejidad y sensación de monitoreo.

### Permisos

* No se define matriz completa de permisos AUTH.
* `Coordinator` aparece como origen conceptual de invitación a una `Person`.
* `Coordinator` puede aprobar ingresos según la descripción de rol del archivo asociado.
* `Adult` aparece como rol con permiso de invitar según la descripción de rol del archivo asociado.
* `Guest` tiene acceso mínimo y participación limitada.
* No se detallan permisos de AUTH para:
  * register;
  * login;
  * refresh token;
  * logout;
  * crear hogar durante registro;
  * aceptar invitación;
  * cambiar contraseña;
  * revocar sesión.

### Flujos

* `Register`: no encontrado.
* `Login`: no encontrado.
* `Refresh Token`: no encontrado.
* `Logout`: no encontrado.
* Crear hogar durante registro: no encontrado.
* Invitar miembros durante onboarding:
  * se detecta flujo conceptual `Coordinator` → invitación → `Person`;
  * no se definen pasos técnicos;
  * no se define si ocurre durante registro, onboarding o gestión posterior.
* Aceptar invitación:
  * se detecta `Person` → aceptación → `Membership`;
  * el archivo asociado describe el flujo `Invitación → Aceptación → Aprobación → Ingreso`;
  * no se definen campos, validaciones ni pantallas.
* Onboarding por rol:
  * `Guest`: onboarding breve, cálido, con límites claros.
  * `Senior`: experiencia simplificada, orientada a contribuir sin carga.
  * Para `Coordinator`, `Adult`, `Adolescent` y `Child` no se define flujo técnico de onboarding.
* Incorporación de miembro nuevo:
  * el documento describe bienvenida real e integración gradual;
  * no se define como flujo técnico MVP.

### APIs

* No se encontraron endpoints.
* No se encontraron métodos HTTP.
* No se encontraron rutas.
* No se encontraron contratos de API.

### Request

* No se encontraron estructuras de request.

### Response

* No se encontraron estructuras de response.

### UI

* No se describen pantallas de Login.
* No se describen pantallas de Register.
* No se describen formularios de credenciales.
* No se describen pantallas de refresh token o logout.
* Para `Guest` se describe experiencia de onboarding:
  * breve;
  * cálida;
  * sin tutoriales innecesarios;
  * con límites claros;
  * sin mostrar funciones no disponibles como opciones bloqueadas.
* Para `Senior` se describe interfaz simplificada por defecto.
* Para nuevo miembro se menciona bienvenida real e integración gradual, sin estructura de pantalla.

### Componentes UI

* No se definen componentes UI concretos para AUTH.
* No se definen inputs, botones ni estados visuales para Login/Register.

### Navegación

* No se define navegación AUTH.
* No se define redirección post-login.
* No se define redirección post-register.
* No se define navegación de aceptación de invitación.

### Eventos del sistema

* No se definen nombres técnicos de eventos.
* Eventos conceptuales detectados:
  * invitación creada/enviada;
  * invitación aceptada;
  * ingreso de persona al hogar mediante membresía;
  * incorporación de nuevo miembro.
* No se encontraron eventos técnicos para:
  * `auth.registered`;
  * `auth.logged_in`;
  * `auth.logged_out`;
  * `auth.token_refreshed`.

### Dependencias

* `Account`.
* `Person`.
* `Household`.
* `Membership`.
* `Invitation`.
* `Role`.
* Privacidad individual.
* Reglas de roles por hogar.

### Restricciones arquitectónicas

* `Account` pertenece a `Person`, no a `Household`.
* `Person` participa en hogares mediante `Membership`.
* `Membership` concentra la relación persona/hogar/rol.
* Los roles son por hogar, no globales.
* La composición del hogar no altera la arquitectura de roles y permisos.
* La experiencia puede cambiar por rol, pero el documento no define cambios técnicos de permisos para todos los roles MVP.

### Casos de uso

* Invitado recibe una invitación con contexto claro.
* Invitado entra a una experiencia breve y cálida.
* Invitado entiende límites desde el inicio.
* Adulto Mayor usa una experiencia simplificada.
* Nuevo miembro se incorpora a un hogar con historia y necesita contexto e integración gradual.

### Casos especiales

* `Guest` puede sentir exclusión si el acceso mínimo se presenta como experiencia hostil.
* `Guest` puede sentir ambigüedad si no sabe qué puede y qué no puede hacer.
* `Senior` puede abandonar si la experiencia se siente como trabajo, complejidad o monitoreo.
* Nuevo miembro puede necesitar contexto para entender el hogar al que ingresa.

### Edge cases

* Incorporación de miembro nuevo:
  * situación: nuevo miembro se suma a un hogar con historia, dinámicas y rachas establecidas;
  * postura: bienvenida real e integración gradual;
  * necesidad: contexto, primera acción de bajo riesgo y reconocimiento de incorporación.
* Invitado:
  * riesgo: experiencia hostil por acceso mínimo;
  * postura: límites claros y tono cálido.
* Adulto Mayor:
  * riesgo: carga, complejidad o sensación de monitoreo;
  * postura: simplicidad y pertenencia activa.

### Datos mockeados

* No se detectan datos mockeados para AUTH + ONBOARDING.

### Funcionalidades REAL

* Separación conceptual `Account` / `Person` / `Household` / `Membership`.
* Relación `Person` → `Membership` → `Household`.
* Rol asociado a `Membership`.
* Roles MVP reconocibles:
  * `Coordinator`;
  * `Adult`;
  * `Adolescent`;
  * `Child`;
  * `Senior`;
  * `Guest`.
* Invitación conceptual a nuevo miembro.
* Aceptación conceptual que confirma ingreso mediante `Membership`.
* Onboarding del `Guest` con límites claros y experiencia breve.
* Experiencia simplificada para `Senior`.
* Privacidad individual como restricción transversal.

### Funcionalidades MOCK

* No se encontró información mockeable para AUTH + ONBOARDING.

### Funcionalidades POST_MVP

* Bienvenida ceremonial de nuevo miembro.
* Integración gradual de nuevo miembro con mecanismos no definidos como flujo técnico MVP.
* Configuración avanzada de experiencia por rol.
* Funciones configurables para `Senior` no asumidas por defecto.

## 2. Clasificación para implementación

### REAL

* Usar `Account` como cuenta perteneciente a `Person`, no a `Household`.
* Usar `Person` como entidad que participa en hogares mediante `Membership`.
* Usar `Membership` como relación entre `Person`, `Household` y `Role`.
* Considerar que los roles son independientes por hogar.
* Considerar los roles MVP detectados:
  * `Coordinator`;
  * `Adult`;
  * `Adolescent`;
  * `Child`;
  * `Senior`;
  * `Guest`.
* Considerar invitación y aceptación como flujo conceptual ligado a ingreso al hogar mediante `Membership`.
* Para onboarding de `Guest`, aplicar límites claros y experiencia breve/cálida.
* Para onboarding de `Senior`, aplicar experiencia simplificada y evitar carga.
* Mantener privacidad individual como restricción transversal.

### MOCK

* No se encontró información para simular en AUTH + ONBOARDING.

### POST_MVP

* Bienvenida ceremonial para nuevo miembro.
* Integración gradual avanzada de nuevo miembro.
* Configuración avanzada de experiencia por rol.
* Personalización avanzada de funciones para `Senior`.

### IGNORAR

* No se incluye información.

## 3. Información faltante

* No se define `Register`.
* No se define `Login`.
* No se define `Refresh Token`.
* No se define `Logout`.
* No se define creación de hogar durante registro.
* No se define flujo técnico completo de invitación durante onboarding.
* No se define flujo técnico completo de aceptación de invitación.
* No se define onboarding técnico para `Coordinator`, `Adult`, `Adolescent` o `Child`.
* No se definen campos obligatorios de `Account`.
* No se definen credenciales.
* No se definen tokens.
* No se definen refresh tokens.
* No se definen sesiones.
* No se definen expiraciones.
* No se definen validaciones.
* No se definen errores.
* No se definen endpoints.
* No se definen request/response.
* No se define pantalla de Login.
* No se define pantalla de Register.
* No se define pantalla de creación de hogar durante registro.
* No se define pantalla de invitación de miembros durante onboarding.
* No se define pantalla de aceptación de invitación.
* No se define matriz completa de permisos por rol para acciones AUTH.
* `Membership` tiene estados en español en el archivo asociado, pero el documento no define equivalentes técnicos ni transiciones.
* `Invitation` aparece como flujo, pero no se definen estados, tokens, expiración ni single-use.
* El archivo asociado describe un paso de aprobación entre aceptación e ingreso; no se aclara si ese paso pertenece al MVP o a una variante posterior.
* El archivo asociado declara siete roles oficiales, mientras que el alcance de este fragment solo acepta seis roles MVP; para este fragment se retienen únicamente los roles del alcance MVP.
* La información del documento es principalmente emocional/arquitectónica, no contractual.

## 4. Fuente

* Archivo: `HomePlus — SECCION 4 EMOTIONAL DESING.md`
  * Sección: `Pertenencia`
  * Sección: `Pertenencia activa — Adulto Mayor`
  * Sección: `Carga — para el Adulto Mayor`
  * Sección: `Exclusión — para el Invitado`
  * Sección: `Principios emocionales según composición del hogar`
  * Sección: `Emociones del Invitado`
  * Sección: `Situaciones de edge case — D — Incorporación de miembro nuevo`
* Archivo: `Seccion 4 Emotional Design.txt`
  * Sección: `OUTPUT 1 — ENTITIES`
  * Sección: `OUTPUT 2 — RELATIONSHIPS`
  * Sección: `OUTPUT 4 — DATA FLOWS`
  * Sección: `OUTPUT 5 — BUSINESS RULES`
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`
* Archivo: `source_map_HomePlus_SECCION_4_EMOTIONAL_DESING.md`
  * Sección: `4.1 AUTH`
  * Sección: `4.2 ONBOARDING`
  * Sección: `9. Mapa de flujos`
  * Sección: `10. Mapa de APIs`
  * Sección: `19. Recomendación de fragments a generar`
