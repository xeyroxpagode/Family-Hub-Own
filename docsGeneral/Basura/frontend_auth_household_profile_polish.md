# frontend_auth_household_profile_polish.md

## 0. Propósito del documento

Este documento define el **polish premium de Auth, Onboarding, Household/Familia y Profile/Settings para HomePlus MVP**.

Su objetivo es que Antigravity/Codex pueda mejorar estas pantallas para que se sientan confiables, limpias, cálidas y premium, sin tocar backend, sin cambiar endpoints, sin cambiar flujos reales ya implementados y sin inventar módulos.

Este documento usa como base:

- `frontend_all_extractions_master.md`;
- `frontend_premium_extraction_index.md`;
- `frontend_premium_design_system_v1.md`;
- `frontend_navigation_shell_v1.md`.

Este documento **no implementa código**, **no define contratos API**, **no cambia rutas backend**, **no reemplaza Auth/Household real**, **no convierte mocks en features reales** y **no rediseña Home/Planner en detalle**.

La intención es pulir la experiencia de entrada, pertenencia al hogar, miembros, invitaciones, perfil y settings para que la app deje de sentirse como una colección de formularios técnicos y pase a sentirse como una app familiar premium.

---

## 1. Principio global de estas pantallas

Auth, Onboarding, Household/Familia y Profile/Settings deben transmitir una idea central:

> HomePlus es una casa digital confiable. Entrar, crear hogar, invitar y configurar deben sentirse simples, seguros y humanos, no técnicos.

Traducción práctica:

- Auth debe sentirse como “volver a casa”, no como pasar un control de seguridad.
- Crear hogar debe sentirse como darle identidad a un espacio familiar, no como llenar una entidad de base de datos.
- Unirse a hogar debe sentirse claro y protegido: el usuario sabe a qué hogar pidió entrar y qué estado tiene.
- Waiting approval debe evitar ansiedad: explicar que la solicitud fue enviada y qué puede hacer mientras tanto.
- Familia debe ser la pantalla de personas reales del hogar, no una tabla de memberships.
- Profile debe dar identidad y control básico.
- Settings debe parecer una lista iOS ordenada, no un panel administrativo.
- Logout debe ser visible y seguro, pero no agresivo.
- Los estados técnicos deben traducirse a lenguaje humano.

### 1.1 Regla de oro

Nunca mostrar complejidad interna si el usuario solo necesita entender una acción simple.

Ejemplos:

- No decir `membership pending`; decir `Solicitud enviada`.
- No decir `auth session invalid`; decir `Tu sesión venció. Volvé a entrar para continuar.`
- No decir `household_id missing`; decir `No encontramos el hogar. Probá de nuevo.`
- No decir `RPC error`; decir `No pudimos completar la acción.`

### 1.2 Alcance real del MVP

Estas pantallas deben respetar el flujo real existente:

- registro/login por backend real;
- `/me` como fuente de navegación privada;
- crear hogar real;
- unirse por invite link real;
- solicitud pendiente real;
- aprobar/rechazar solicitudes real;
- miembros básicos reales;
- perfil/logout real básico;
- settings visual básico sin prometer configuración avanzada real.

### 1.3 Alcance mock permitido

Solo se permite mock visual en:

- preferencias no críticas de Settings si no persisten;
- futuras opciones de seguridad si están deshabilitadas o marcadas como próximamente;
- cards de explicación o empty states;
- módulos secundarios que viven en More pero no forman parte de este documento.

No se permite mockear:

- login;
- registro;
- crear hogar;
- join invite link;
- pending approval;
- approve/reject;
- logout;
- rol/membership visible si el dato real existe.

---

## 2. Decisiones de consistencia con el MVP real

### 2.1 No cambiar flujos reales ya implementados

El polish debe envolver visualmente los flujos existentes. No debe cambiar su semántica.

Mantener:

- `Register → Login/sesión → Create Household o Join Household → Home/Onboarding`;
- `GET /me` como decisión de navegación post-auth;
- usuario sin hogar activo → pantalla de crear/unirse a hogar;
- usuario que se une por link → estado pendiente hasta aprobación;
- coordinator aprueba/rechaza solicitudes;
- link de invitación como mecanismo principal de acceso;
- logout limpia sesión local y vuelve a Auth.

### 2.2 Invitación por link: decisión visual

Aunque el documento de onboarding viejo menciona links con vencimiento de 7 días, el MVP real debe **no mostrar vencimiento** si el backend no lo implementa.

Regla final:

- si el invite link real es permanente, el copy debe decir: `Link listo para compartir.`;
- no mostrar `vence en 7 días`;
- no mostrar `single-use`;
- no mostrar contador de expiración;
- no generar UI de revocación si no existe o no está expuesta;
- si existe revoke real, puede mostrarse como acción secundaria avanzada solo para coordinator.

### 2.3 Registro y nombre

Las fuentes antiguas plantean registro mínimo sin nombre, pero el flujo real puede estar pidiendo nombre/display name.

Regla final:

- no eliminar un campo real requerido por el flujo actual;
- si el registro actual pide nombre, mantenerlo y pulirlo;
- si el flujo actual no lo pide, pedir nombre en onboarding/perfil básico;
- no duplicar nombre en dos pasos consecutivos;
- no bloquear por foto, teléfono, género, fecha de nacimiento o preferencias avanzadas.

### 2.4 Roles

Usar roles visibles humanos:

| Rol técnico | Label UI recomendado | Uso visual |
|---|---|---|
| `coordinator` | Coordinador/a | Administra el hogar y aprueba solicitudes. |
| `adult` | Adulto | Miembro operativo. |
| `adolescent` | Adolescente | Autonomía progresiva. |
| `child` | Niño/a | Experiencia simplificada. |
| `senior` | Adulto mayor | Experiencia accesible. |
| `guest` | Invitado/a | Acceso limitado. |

No usar `Empleado Familiar` en MVP si no existe en backend real. Si aparece en fuentes, queda **POST-MVP**.

---

## 3. Lenguaje visual compartido

Estas pantallas deben consumir el Design System V1.

### 3.1 Base visual

- Fondo `background` cream/sand.
- Cards `surface` con borde suave.
- Acción primaria en terracota.
- Estados tranquilos con salvia/success.
- Errores suaves, claros y no agresivos.
- Tipografía premium con títulos expresivos y body muy legible.
- Espaciado generoso.
- Inputs de 44–52px mínimo.
- Buttons de 52px mínimo.
- Touch targets de 44×44px mínimo.
- Radius medio/large en cards y botones.
- Glass solo donde aporta profundidad; no en formularios densos.

### 3.2 Personalidad

Debe sentirse:

- confiable;
- calma;
- cálida;
- premium;
- familiar;
- clara;
- segura;
- no técnica;
- no corporativa;
- no infantil.

### 3.3 Reglas de densidad

- Una acción primaria por pantalla.
- Máximo una acción secundaria visible al mismo nivel.
- Links terciarios discretos.
- No usar más de 2 cards grandes por pantalla auth/onboarding.
- No usar más de 3 badges por member card.
- No repetir metadata si ya está implícita.
- No mostrar IDs, tokens, slugs, raw roles ni errores técnicos.

---

## 4. Arquitectura de pantallas cubierta

### 4.1 Auth stack

Pantallas incluidas:

- Splash / loading inicial.
- Login.
- Registro.
- Sesión vencida si existe.
- Recuperación de contraseña solo si ya existe en la app o se decide como real.

No incluir en MVP si no existe real:

- 2FA real;
- biometría real;
- account picker;
- eliminación de cuenta;
- magic link avanzado;
- social login si backend real no lo soporta.

### 4.2 Post-auth / no household

Pantallas incluidas:

- Crear hogar.
- Unirse a hogar.
- Esperando aprobación.
- Onboarding de perfil básico si aplica.

### 4.3 Private stack / Familia y Profile

Pantallas incluidas:

- Familia / miembros.
- Invitar miembro.
- Solicitudes pendientes.
- Profile.
- Settings.
- Logout confirm sheet.

### 4.4 Relación con Navigation Shell

- Auth no muestra tab bar.
- Crear hogar/unirse/esperando aprobación tampoco muestra Home tabs si el usuario todavía no pertenece a un hogar activo.
- Private stack muestra tabs: `Home | Familia | + | Planner | Más`.
- Familia vive en tab People/Familia.
- Profile/Settings viven en Más/Profile o desde avatar según navegación actual.
- Quick Actions puede incluir `Invitar miembro` solo dentro de contexto privado y con permisos.

---

## 5. Splash / Loading inicial

### 5.1 Propósito

Splash debe transmitir marca y confianza mientras la app resuelve sesión local y `/me`.

No debe vender features. No debe parecer tutorial. No debe bloquear más de lo necesario.

### 5.2 Visual

Estructura recomendada:

1. Fondo cream/sand.
2. Logo o monograma HomePlus centrado.
3. Nombre `HomePlus` con tipografía hero/title.
4. Tagline breve opcional.
5. Spinner o pulso sutil debajo.

Copy recomendado:

- `HomePlus`
- `Tu hogar, un poco más liviano.`

Copy alternativo si se prefiere más operativo:

- `Organizando tu hogar...`

### 5.3 Reglas visuales

- Logo de 64px o 72px.
- No usar ilustraciones pesadas.
- No usar carrusel.
- No usar texto largo.
- No pedir permisos.
- No mostrar tabs.
- No mostrar Home parcial antes de resolver navegación.

### 5.4 Estados

#### Loading normal

Mostrar splash simple mientras:

- se lee sesión local;
- se obtiene token;
- se llama `/me` si hay sesión.

#### Loading extendido

Si tarda más de 3 segundos:

- mantener visual;
- agregar texto: `Conectando con tu hogar...`.

#### Error inicial

Si falla por backend inaccesible:

Título:

- `No pudimos cargar HomePlus`

Body:

- `Revisá tu conexión y probá otra vez.`

CTA:

- `Reintentar`

Secundario si corresponde:

- `Cerrar sesión`

#### Sin sesión

Navegar a Login sin mostrar error.

#### Sesión inválida

Limpiar sesión local si corresponde y navegar a Login/Sesión vencida con copy humano.

---

## 6. Login

### 6.1 Principio

Login debe sentirse como volver a un espacio propio.

No debe ser una pantalla fría de seguridad. Debe ser clara, rápida y tranquilizadora.

### 6.2 Layout

Estructura mobile:

1. AppScreen sin tabs.
2. Logo/monograma superior centrado.
3. Título emocional breve.
4. Subtítulo.
5. Form card o bloque de inputs.
6. Email.
7. Contraseña.
8. Link `¿Olvidaste tu contraseña?` si existe real.
9. CTA primaria `Entrar`.
10. Link secundario `Crear cuenta`.
11. Social login solo si existe real o está claramente deshabilitado.

Copy recomendado:

- Título: `Qué bueno verte de nuevo`
- Body: `Entrá para seguir organizando tu hogar.`
- Email label: `Email`
- Password label: `Contraseña`
- CTA: `Entrar`
- Link registro: `Crear cuenta`

### 6.3 Campos

Email:

- teclado email;
- autocapitalize off;
- autocomplete email;
- validar formato on blur;
- no limpiar ante error.

Contraseña:

- secure text;
- toggle mostrar/ocultar;
- return key submit;
- no mostrar reglas de password en login.

### 6.4 CTA

`Entrar` debe estar disabled hasta que email y contraseña tengan contenido mínimo válido.

Al presionar:

- haptic light;
- botón loading;
- bloquear doble tap;
- mantener inputs visibles;
- no resetear formulario salvo éxito.

### 6.5 Error states

#### Credenciales inválidas

Copy:

- `Ese email o contraseña no son correctos. ¿Probás de nuevo?`

Reglas:

- no revelar si el email existe;
- no marcar solo email ni solo password;
- mostrar error general bajo form o toast superior suave;
- mantener email cargado.

#### Backend inaccesible / red

Copy:

- `No pudimos conectar. Revisá tu internet y probá de nuevo.`

Reglas:

- toast superior;
- inputs preservados;
- CTA vuelve a enabled.

#### Sesión vencida

Si el usuario venía de private stack:

- título: `Tu sesión venció`
- body: `Volvé a entrar para seguir usando HomePlus.`
- email prellenado si está disponible.

#### Rate limit

Copy:

- `Muchos intentos. Esperá un minuto y probá de nuevo.`

Regla:

- deshabilitar CTA durante cooldown solo si backend lo informa.

### 6.6 Loading

- Spinner dentro del botón.
- Texto del botón puede cambiar a `Entrando...`.
- Overlay solo si el submit tarda más de 300ms.
- No oscurecer toda la pantalla con modal pesado.

### 6.7 Qué evitar

- No usar `Sign in` si la UI está en castellano.
- No mostrar stack traces.
- No pedir nombre en login.
- No esconder link de crear cuenta.
- No meter Home preview o módulos mock en login.

---

## 7. Registro

### 7.1 Principio

Registro debe pedir lo mínimo necesario para crear cuenta y no mezclar todavía toda la configuración del hogar.

### 7.2 Layout

Estructura:

1. Header simple con back si viene desde Login.
2. Título.
3. Body breve.
4. Inputs requeridos.
5. Checkbox legal si existe.
6. CTA primaria.
7. Link a Login.

Copy recomendado:

- Título: `Creá tu cuenta`
- Body: `Después armamos tu hogar en pocos pasos.`
- CTA: `Crear cuenta`
- Link: `Ya tengo cuenta`

### 7.3 Campos

Campos base:

- Nombre si el flujo actual lo requiere.
- Email.
- Contraseña.
- Confirmar contraseña si ya existe en UI o backend lo requiere.
- Checkbox de términos si ya existe.

Regla final:

- no agregar campos extra si no existen;
- no pedir teléfono;
- no pedir fecha de nacimiento;
- no pedir género;
- no pedir rol en registro si el flujo real lo decide después;
- no pedir hogar en registro.

### 7.4 Validaciones

Email:

- formato simple;
- error: `Ese email no parece válido.`

Email ya registrado:

- si backend lo permite detectar en registro: `Ese email ya tiene cuenta. ¿Querés entrar?`

Contraseña:

- mínimo 8 caracteres si aplica;
- sugerencia: `Mínimo 8 caracteres.`
- si requiere número/signo: `Sumale un número o un signo para que sea más segura.`

Confirmación:

- `Las contraseñas no coinciden.`

Nombre:

- no vacío;
- máximo razonable;
- `Usá un nombre más corto.`

Legal:

- `Marcá la casilla para continuar.`

### 7.5 Loading y éxito

Al crear cuenta:

- CTA loading `Creando cuenta...`;
- evitar doble tap;
- mantener datos ante error de red;
- en éxito, seguir el flujo real: login/session y luego `/me` decide create/join/home.

No mostrar celebración larga. Una transición suave alcanza.

### 7.6 Error states

#### Error general

Copy:

- `No pudimos crear la cuenta. Probá de nuevo.`

#### Red

Copy:

- `Sin conexión. Probá de nuevo en un momento.`

#### Backend validation

Mapear a texto humano. No mostrar nombres de campos técnicos.

### 7.7 Qué evitar

- No mezclar crear cuenta con crear hogar en la misma pantalla.
- No pedir rol si no se usa inmediatamente.
- No usar formularios de varias columnas en mobile.
- No meter social login falso.
- No prometer verificación de email si el flujo real no la exige.

---

## 8. Crear hogar

### 8.1 Propósito

Crear hogar es el primer momento donde HomePlus deja de ser una cuenta y se vuelve un espacio familiar.

Debe sentirse identitario y simple.

### 8.2 Layout recomendado

Pantalla única para MVP, salvo que la app ya tenga pasos separados.

Estructura:

1. Header simple.
2. Título emocional.
3. Body explicativo.
4. Card de identidad del hogar.
5. Input nombre del hogar.
6. Opcional: mini preview de avatar/inicial.
7. CTA primaria.
8. Link secundario `Tengo una invitación`.

Copy recomendado:

- Título: `Creá tu hogar`
- Body: `Este va a ser el espacio donde tu familia coordina tareas, eventos e invitaciones.`
- Label: `Nombre del hogar`
- Placeholder: `Casa de los Robles`
- CTA: `Crear hogar`
- Secundario: `Tengo una invitación`

### 8.3 Campos

Real MVP:

- nombre del hogar.

Opcionales si ya existen en backend/UI:

- slug;
- timezone;
- idioma;
- foto.

Regla:

- ocultar campos técnicos bajo defaults;
- no mostrar timezone salvo que sea necesario;
- no pedir tipo de hogar si no se usa realmente;
- no pedir reglas de privacidad avanzadas.

### 8.4 Validaciones

Nombre vacío:

- `Poné un nombre para tu hogar.`

Nombre demasiado largo:

- `Usá un nombre más corto.`

Slug conflict si existe:

- `Ya existe un hogar con ese identificador. Probá con otro nombre.`

Error auth/person:

- `No pudimos preparar tu perfil. Volvé a entrar y probá de nuevo.`

Error general:

- `No pudimos crear el hogar. Probá de nuevo.`

### 8.5 CTA

- Disabled hasta nombre válido.
- Loading `Creando hogar...`.
- Éxito → refetch `/me` y navegar según respuesta.

### 8.6 Visual premium

Usar AppCard suave con:

- icono casa o monograma;
- superficie cream/surface;
- borde sutil;
- microcopy cálido.

No usar ilustración compleja ni formulario técnico.

---

## 9. Unirse a hogar

### 9.1 Propósito

Esta pantalla permite entrar con un link de invitación o confirmar una invitación recibida.

Debe responder:

- ¿A qué hogar me estoy uniendo?
- ¿Quién me invitó?
- ¿Qué pasa después?

### 9.2 Variantes posibles

#### A. Usuario llega con token/link detectado

Mostrar pantalla de confirmación:

- título: `Te invitaron a un hogar`
- card con nombre del hogar si backend lo permite mostrar;
- explicación breve;
- CTA: `Solicitar unirme` o `Unirme al hogar`, según flujo real.

Si el flujo real crea pending approval:

- CTA recomendado: `Solicitar unirme`.

#### B. Usuario no tiene token

Mostrar pantalla manual:

- título: `Unite a un hogar`
- body: `Abrí el link que te compartieron o pegalo acá.`
- input: `Link de invitación`
- CTA: `Continuar`
- secundario: `Crear mi hogar`

### 9.3 Link

Reglas:

- aceptar link completo o token si la UI actual lo permite;
- limpiar espacios;
- no mostrar token interno luego de submit;
- no exponer household_id;
- no prometer expiración si no existe;
- no decir “código” si el producto final decidió link.

### 9.4 Estados

#### Link inválido

Copy:

- `Ese link no parece válido. Revisalo y probá de nuevo.`

#### Link revocado/expirado si backend lo informa

Copy:

- `Ese link ya no está disponible. Pedile otro a quien te invitó.`

#### Ya sos miembro activo

Copy:

- `Ya formás parte de este hogar.`

CTA:

- `Ir a Home`

#### Solicitud ya pendiente

Copy:

- `Tu solicitud ya fue enviada.`

CTA:

- `Ver estado`

#### Error general

Copy:

- `No pudimos procesar la invitación. Probá de nuevo.`

### 9.5 Visual

- AppCard con icono familia/hogar.
- CTA clara.
- Body corto.
- No usar pantalla de permisos larga.
- No pedir rol antes de aprobación si el flujo real asigna rol al aprobar.

---

## 10. Esperando aprobación

### 10.1 Propósito

Cuando el usuario se unió por link y queda pendiente, la app debe explicar el estado sin ansiedad.

No debe mostrar Home privado todavía si pending no concede acceso.

### 10.2 Layout

Estructura:

1. Ícono cálido de reloj/personas.
2. Título.
3. Body.
4. Card del hogar o solicitud.
5. Acción principal: `Actualizar estado`.
6. Acción secundaria: `Cerrar sesión` o `Cambiar cuenta`.

Copy recomendado:

- Título: `Solicitud enviada`
- Body: `Cuando un coordinador apruebe tu ingreso, vas a poder entrar al hogar.`
- Card label: `Estado`
- Estado: `Pendiente de aprobación`
- CTA: `Actualizar estado`
- Secundario: `Cerrar sesión`

### 10.3 Refresh

Al tocar `Actualizar estado`:

- llamar refetch `/me`;
- mostrar loading inline;
- si pasa a active → navegar a Home;
- si sigue pending → toast suave: `Todavía está pendiente.`;
- si fue rechazada/finalized → mostrar estado rechazado con CTA a crear hogar o cerrar sesión.

### 10.4 Estado rechazado

Copy:

- Título: `No se aprobó la solicitud`
- Body: `Podés pedir un nuevo link o crear tu propio hogar.`
- CTA: `Crear mi hogar`
- Secundario: `Cerrar sesión`

No usar tono acusatorio.

### 10.5 Estado suspendido/finalizado

Si backend devuelve membership no active:

- no entrar a Home;
- mostrar card de estado;
- no exponer detalles técnicos.

Copy genérico:

- `No tenés acceso activo a este hogar.`

### 10.6 Qué evitar

- No mostrar datos internos del hogar antes de aprobación.
- No permitir crear tareas/eventos pending.
- No mostrar tabs privadas.
- No hacer polling agresivo.
- No mostrar “rechazado” como rojo dramático salvo que sea necesario.

---

## 11. Onboarding de rol / perfil básico si aplica

### 11.1 Principio

El onboarding de perfil debe pedir solo lo que mejora la experiencia inmediata.

No debe bloquear el MVP por preferencias avanzadas.

### 11.2 Cuándo mostrarlo

Mostrar perfil básico si:

- el usuario no tiene display name;
- el flujo necesita confirmar cómo llamarlo;
- el rol ya fue asignado y se quiere personalizar UI mínima.

No mostrarlo si:

- ya existe nombre suficiente;
- el usuario está pending approval;
- el usuario solo necesita crear/unirse a hogar;
- implica guardar datos que backend no soporta.

### 11.3 Campos permitidos

Real MVP:

- nombre visible;
- avatar iniciales derivado del nombre;
- tratamiento solo si ya existe preferencia real o local segura.

Opcional visual/postergable:

- foto;
- color de avatar;
- idioma;
- nivel de notificaciones.

No pedir:

- edad exacta;
- género;
- teléfono;
- dirección;
- relación familiar exacta;
- horarios complejos;
- permisos del sistema antes del primer valor.

### 11.4 Onboarding por rol: enfoque visual

#### Coordinador

- Ver hogar y miembros como prioridad.
- Acceso a invitaciones y solicitudes.
- Copy de responsabilidad sin presión.

#### Adulto

- Confirmar perfil.
- Ver tareas/eventos compartidos.
- No mostrar Carga Familiar como admin si no corresponde.

#### Adolescente

- UI más directa.
- Evitar tono infantil.
- Mostrar tareas/eventos propios.

#### Adulto mayor

- Modo accesible.
- Tipografía mayor.
- Touch targets grandes.
- Sin gestos obligatorios.
- Copy respetuoso.

#### Niño

- Solo si existe flujo real.
- UI muy simplificada.
- Sin settings, finanzas ni alertas negativas.

### 11.5 CTA

- Principal: `Continuar` / `Entrar a HomePlus`.
- Secundario: `Después` solo si realmente se puede omitir.

---

## 12. Familia / Miembros

### 12.1 Propósito

Familia es la pantalla donde el hogar se vuelve humano.

Debe mostrar quién forma parte, qué rol tiene y si hay solicitudes o invitaciones pendientes.

No debe parecer una tabla de usuarios.

### 12.2 Layout

Estructura recomendada:

1. AppHeader: `Familia`.
2. Subtítulo breve: nombre del hogar o cantidad de miembros.
3. Card de solicitudes pendientes si existen y usuario puede aprobar.
4. Lista de miembros activos.
5. Invitaciones/solicitudes pendientes bajo demanda.
6. CTA contextual `Invitar` si el rol puede.

### 12.3 Lista de miembros

Cada member row/card debe mostrar:

- avatar;
- nombre;
- rol visible;
- estado si no está active;
- acción contextual mínima.

Layout de card:

- leading: avatar 40–48px;
- center: nombre + rol;
- trailing: chevron o status pill;
- altura mínima 64px;
- tap abre detalle/perfil si existe.

### 12.4 Avatars

Reglas:

- si hay foto, usar foto circular;
- si no hay foto, usar iniciales;
- color de fondo por hash de nombre;
- no usar iconos genéricos iguales para todos;
- no usar presencia real si no existe;
- no mostrar online/offline falso.

### 12.5 Roles

Mostrar role pill discreta:

- `Coordinador/a`;
- `Adulto`;
- `Adolescente`;
- `Niño/a`;
- `Adulto mayor`;
- `Invitado/a`.

Reglas:

- pill corta;
- no usar colores demasiado fuertes;
- no mezclar rol con estado;
- no mostrar rol técnico en inglés.

### 12.6 Estados de membership

| Estado técnico | UI label | Tratamiento visual |
|---|---|---|
| `active` | Activo | Normal, sin badge si no aporta. |
| `pending` | Pendiente | Pill suave warning/sand. |
| `suspended` | Acceso pausado | Pill muted; acciones limitadas. |
| `finalized` | Finalizado | Ocultar de lista principal o mover a historial si existe. |

Regla clave:

- Active no necesita badge si todos son active. Mostrar menos metadata mejora la UI.

### 12.7 Acciones

Para coordinator:

- Invitar miembro.
- Ver solicitudes pendientes.
- Aprobar/rechazar solicitudes.
- Cambiar rol solo si ya existe real.
- Remover/suspender solo si ya existe real.

Para adult:

- Invitar si el backend lo permite.
- Ver miembros activos.
- No aprobar solicitudes.

Para otros roles:

- Ver miembros según permisos.
- Sin acciones administrativas.

### 12.8 Empty state

Si solo está el usuario:

Título:

- `Tu hogar está listo`

Body:

- `Cuando invites miembros, aparecen acá con su rol y foto.`

CTA si puede invitar:

- `Invitar miembro`

No usar copy triste como “No hay nadie”.

---

## 13. Invitar miembro

### 13.1 Propósito

Invitar debe ser rápido y natural, especialmente por WhatsApp/link.

No debe obligar a conocer datos técnicos.

### 13.2 Modalidad recomendada

Usar bottom sheet o pantalla simple, según navegación actual.

Para MVP premium:

- si se abre desde Familia, usar bottom sheet 50–75%;
- si requiere más explicación, usar pantalla full con header.

### 13.3 Layout

Estructura:

1. Título: `Invitar miembro`.
2. Body: `Compartí este link para que pidan sumarse al hogar.`
3. Link card.
4. Botón primario `Compartir link`.
5. Botón secundario `Copiar link`.
6. Explicación de aprobación.

Copy recomendado:

- `Quien abra el link va a pedir sumarse. Un coordinador aprueba el ingreso antes de que vea el hogar.`

### 13.4 Link

Visual:

- mostrar link truncado;
- botón copiar;
- icono link;
- no mostrar token largo completo si rompe UI.

Estados:

- loading creando link: `Preparando link...`;
- éxito copia: `Link copiado.`;
- share abierto: usar share sheet nativo;
- error: `No pudimos crear el link. Probá de nuevo.`

### 13.5 Compartir

Share text recomendado:

- `Te invité a sumarte a mi hogar en HomePlus. Abrí este link para pedir acceso:`

No prometer acceso inmediato si hay aprobación.

### 13.6 Campos opcionales

Si el flujo actual permite nombre/email/teléfono:

- mantenerlos bajo sección `Enviar a alguien`;
- no hacerlos obligatorios si el link ya resuelve la invitación;
- priorizar compartir link.

### 13.7 Qué evitar

- No usar join code.
- No mostrar expiración si no existe.
- No mostrar “invitación enviada” si solo se copió link.
- No pedir rol antes de approval si el rol se asigna al aprobar.
- No permitir invitar si el rol no tiene permiso.

---

## 14. Solicitudes pendientes

### 14.1 Propósito

Permitir al coordinator revisar quién pidió sumarse y decidir aprobar o rechazar.

Debe sentirse seguro, claro y reversible solo si backend lo permite.

### 14.2 Ubicación

Recomendación:

- en Familia, arriba de la lista de miembros;
- card compacta: `2 solicitudes pendientes`;
- tap abre pantalla/sheet `Solicitudes`.

Si hay una sola solicitud, puede aparecer inline.

### 14.3 Card resumen

Visual:

- icono/personas;
- título `Solicitudes pendientes`;
- count;
- CTA `Revisar`.

No mostrar como alerta roja salvo abuso/error.

### 14.4 Lista de solicitudes

Cada item:

- avatar/inicial;
- nombre/email si existe;
- subtítulo: `Quiere sumarse a {hogar}`;
- estado `Pendiente`;
- acciones: `Aprobar` y `Rechazar`.

### 14.5 Aprobar

Al tocar aprobar:

- abrir confirm sheet si requiere seleccionar rol;
- si backend requiere role, elegir rol antes de confirmar;
- CTA: `Aprobar ingreso`;
- loading inline;
- éxito: mover a miembros activos;
- toast: `{Nombre} ya forma parte del hogar.`

Si no hay nombre:

- `La persona ya forma parte del hogar.`

### 14.6 Rechazar

Debe pedir confirmación.

Sheet:

- título: `Rechazar solicitud`
- body: `Esta persona no va a poder entrar al hogar con esta solicitud.`
- CTA danger: `Rechazar`
- secundario: `Cancelar`

Éxito:

- remover de pendientes;
- toast: `Solicitud rechazada.`

No usar lenguaje como “bloquear” si backend solo finalized/reject.

### 14.7 Errores

Approve error:

- `No pudimos aprobar la solicitud. Probá de nuevo.`

Reject error:

- `No pudimos rechazar la solicitud. Probá de nuevo.`

Permission error:

- `No tenés permiso para hacer esta acción.`

Already handled:

- `La solicitud ya fue actualizada.`

### 14.8 Qué evitar

- No mostrar approve/reject a adultos si no pueden aprobar.
- No aprobar con un tap sin feedback si implica acceso real.
- No usar modal full-screen para una confirmación simple.
- No mezclar solicitudes con miembros activos sin separación visual.

---

## 15. Profile

### 15.1 Propósito

Profile debe permitir al usuario entender quién es dentro de HomePlus y salir de la cuenta de forma segura.

No debe ser un centro de configuración avanzada.

### 15.2 Ubicación

Puede abrirse desde:

- avatar del header;
- tab Más/Profile si la navegación actual lo usa;
- Settings → Cuenta.

No debe ser tab principal separado si ya existe More/Profile.

### 15.3 Layout

Estructura:

1. AppHeader: `Perfil`.
2. Avatar grande 72px.
3. Nombre visible.
4. Email.
5. Card hogar activo.
6. Card rol.
7. Acceso a Settings.
8. Logout.

### 15.4 Datos visibles

Mostrar:

- nombre;
- email;
- hogar activo;
- rol;
- estado de membresía si no active;
- idioma/preferencia solo si existe.

No mostrar:

- user id;
- auth_user_id;
- membership id;
- token;
- provider técnico;
- raw JSON settings.

### 15.5 Nombre

Si es editable y backend lo soporta:

- edición simple en sheet;
- label `Nombre`;
- CTA `Guardar`.

Si no está soportado:

- mostrar solo lectura;
- no simular edición.

### 15.6 Email

- Solo lectura para MVP.
- No implementar cambio de email si backend no lo soporta.

### 15.7 Hogar

Card:

- nombre del hogar;
- rol del usuario;
- cantidad de miembros si dato real está disponible;
- CTA `Ver familia`.

### 15.8 Logout

Debe ser visible pero no dominante.

Ubicación:

- al final de Profile o Settings.

Al tocar:

- abrir `LogoutConfirmSheet`.

Copy sheet:

- título: `Cerrar sesión`
- body: `Vas a salir de HomePlus en este dispositivo.`
- CTA: `Cerrar sesión`
- secundario: `Cancelar`

Éxito:

- limpiar sesión;
- navegar a Login.

Error:

- `No pudimos cerrar sesión. Probá de nuevo.`

---

## 16. Settings

### 16.1 Principio

Settings debe ser una lista agrupada estilo iOS: clara, compacta y sin sensación de panel admin.

No debe competir con Home, Planner ni Familia.

### 16.2 Ubicación

Settings vive en:

- More/Profile;
- acceso desde Profile;
- no vive en Home;
- no tiene tab propio.

### 16.3 Layout grouped list estilo iOS

Estructura:

1. AppHeader: `Configuración`.
2. Section: Cuenta.
3. Section: Hogar.
4. Section: Preferencias.
5. Section: Soporte / Acerca de.
6. Section final: Logout.

Visual:

- fondo cream;
- grupos con radius 16;
- rows de 56–64px;
- leading icon suave;
- title;
- optional subtitle;
- trailing chevron/status;
- separadores internos suaves.

### 16.4 Secciones recomendadas MVP

#### Cuenta

Rows:

- Perfil.
- Email.
- Cerrar sesión.

#### Hogar

Rows:

- Familia.
- Invitaciones.
- Solicitudes pendientes si coordinator.

#### Preferencias

Rows visuales:

- Apariencia: `Sistema` / `Claro` / `Oscuro` si existe.
- Notificaciones: `Próximamente` o valor mock si no persiste.
- Idioma: `Español` si existe.

#### Soporte

Rows:

- Ayuda.
- Acerca de HomePlus.
- Versión de la app si disponible.

### 16.5 Mock preferences

Se permiten preferencias mock solo si se muestran como:

- deshabilitadas;
- `Próximamente`;
- o puramente locales si la app ya las soporta.

No permitir que el usuario cambie algo que no tendrá efecto.

Ejemplo:

- `Notificaciones` → `Próximamente`.
- `Biometría` → ocultar si no existe real.
- `2FA` → ocultar o `Próximamente`, no simular seguridad.

### 16.6 Logout

Logout puede estar:

- en Profile;
- en Settings → Cuenta;
- al final como row danger suave.

No usar rojo saturado para el row completo. Usar texto danger y confirm sheet.

### 16.7 Qué evitar

- No crear Settings de Finanzas/Inventory si no son reales.
- No mostrar Auditoría completa si no existe.
- No mostrar toggles falsos.
- No crear pantalla de privacidad avanzada sin backend.
- No mostrar raw config JSON.
- No mezclar Profile y Household admin en una misma lista larga sin secciones.

---

## 17. Estados globales

### 17.1 Empty states

Patrón base:

- icono 48px;
- título humano;
- body breve;
- una acción principal;
- opcional acción secundaria discreta;
- no usar tristeza;
- no usar “vacío” como palabra principal.

#### Familia sin miembros

Título:

- `Tu hogar está listo`

Body:

- `Cuando invites miembros, aparecen acá con su rol y foto.`

CTA:

- `Invitar miembro`

#### Sin solicitudes

Título:

- `No hay solicitudes pendientes`

Body:

- `Cuando alguien pida sumarse al hogar, aparece acá.`

#### Sin hogar

Título:

- `Empecemos por tu hogar`

Body:

- `Creá un hogar o unite con el link que te compartieron.`

CTAs:

- `Crear hogar`
- `Unirme con link`

### 17.2 Loading states

Usar:

- skeleton para listas de miembros;
- spinner en botón para submits;
- overlay anti doble tap solo en actions críticas;
- no bloquear toda la pantalla para copiar link;
- no usar skeleton en auth forms vacíos.

Textos:

- `Cargando tu hogar...`
- `Preparando link...`
- `Actualizando estado...`
- `Guardando...`

### 17.3 Error states

Patrón:

- título claro;
- body humano;
- CTA reintentar;
- acción secundaria si corresponde.

#### Backend inaccesible

Título:

- `No pudimos conectar`

Body:

- `Revisá tu conexión y probá de nuevo.`

CTA:

- `Reintentar`

#### Error de permisos

Título:

- `No tenés permiso para hacer esto`

Body:

- `Puede hacerlo un coordinador del hogar.`

#### Error de sesión

Título:

- `Tu sesión venció`

Body:

- `Volvé a entrar para continuar.`

CTA:

- `Entrar`

### 17.4 Offline states

Si no hay conexión:

- Auth submit falla con toast.
- Inputs preservan datos.
- Familia puede mostrar último estado solo si existe cache; si no, mostrar error.
- Join/approve/reject no deben simular éxito offline.
- Copiar link existente puede funcionar si el link está cargado.
- Crear link nuevo requiere conexión.

Copy offline:

- `Sin conexión. Probá de nuevo cuando vuelva internet.`

### 17.5 Success states

Usar toast o transición suave, no pantalla de celebración salvo onboarding inicial.

Textos:

- `Hogar creado.`
- `Link copiado.`
- `Solicitud enviada.`
- `Solicitud aprobada.`
- `Solicitud rechazada.`
- `Sesión cerrada.`

---

## 18. Reglas de copy

### 18.1 Tono

Debe ser:

- humano;
- claro;
- LATAM;
- no técnico;
- no acusatorio;
- breve;
- accionable.

### 18.2 Preferencias de palabras

Usar:

- `Entrar` en vez de `Iniciar sesión`.
- `Crear cuenta` o `Creá tu cuenta`.
- `Hogar` en vez de `workspace`.
- `Familia` para People si la UI va localizada.
- `Solicitud` en vez de `request`.
- `Coordinador/a` en vez de `admin`.
- `Cerrar sesión` en vez de `logout`.

Evitar:

- `membership`;
- `household_id`;
- `token`;
- `RPC`;
- `forbidden`;
- `unauthorized`;
- `pending approval`;
- `backend`;
- `error 500`.

### 18.3 Errores

Formato:

1. Qué pasó.
2. Qué puede hacer.

Ejemplo:

- Malo: `Error approving membership.`
- Bueno: `No pudimos aprobar la solicitud. Probá de nuevo.`

### 18.4 Confirmaciones

Ser claro sin dramatizar.

- `¿Seguro que querés rechazar esta solicitud?`
- `Esta persona no va a poder entrar al hogar con esta solicitud.`

### 18.5 Mensajes de pertenencia

- `Ya formás parte de este hogar.`
- `Tu solicitud fue enviada.`
- `Cuando te aprueben, vas a poder entrar.`

No usar lenguaje de vigilancia o control.

---

## 19. Motion y haptics

### 19.1 Motion general

Usar motion para orientar, no decorar.

Duraciones recomendadas:

- tap feedback: 80–120ms;
- sheet open/close: 220–280ms;
- screen transition: 220–300ms;
- toast in/out: 180–220ms;
- skeleton shimmer: sutil y lento;
- success micro animation: 250–350ms.

Respetar reduced motion:

- reducir a fade mínimo;
- evitar scale/bounce;
- no usar partículas.

### 19.2 Auth

- Submit: botón loading sin salto de layout.
- Error: shake sutil solo en form/card, no en toda pantalla.
- Success: fade/crossfade a la siguiente pantalla.

### 19.3 Household

- Crear hogar: transición suave hacia Home o siguiente estado.
- Join: sheet/pantalla confirma solicitud con fade.
- Waiting approval refresh: spinner inline.

### 19.4 Familia

- Nueva solicitud: card aparece con fade/slide corto.
- Approve: item se mueve fuera de pendientes y aparece toast.
- Reject: item desaparece con fade.

### 19.5 Haptics

Usar haptics si plataforma lo permite.

| Acción | Haptic |
|---|---|
| Tap botón principal | light |
| Cambiar selección/role | selection |
| Copiar link | success/light |
| Crear hogar exitoso | success |
| Solicitud enviada | success |
| Aprobar solicitud | success |
| Rechazar solicitud | warning/light |
| Error submit | warning |
| Logout confirm | light |

No usar haptics en cada scroll, row hover o lectura de settings.

---

## 20. Accesibilidad

### 20.1 Reglas generales

- Touch target mínimo 44×44px.
- En modo senior, mínimo 56×56px.
- Contraste AA mínimo.
- Texto no depende solo de color.
- Labels visibles en inputs.
- Placeholders no reemplazan labels.
- Error inline anunciado por screen reader.
- Botones loading anuncian estado.
- Sheets tienen foco inicial y cierre accesible.
- Back button siempre accesible.

### 20.2 Auth

- Email input label claro.
- Password toggle anuncia `Mostrar contraseña` / `Ocultar contraseña`.
- Error de credenciales anunciado una vez.
- No auto-focus agresivo si vuelve de error.

### 20.3 Familia

- Avatar con label: `Mariana, Coordinadora`.
- Status pill con texto, no solo color.
- Approve/reject con labels explícitos.
- Confirm sheet para destructive actions.

### 20.4 Adulto mayor

- Tipografía mayor si rol senior o setting senior.
- Sin gestos obligatorios.
- No depender de pull-to-refresh.
- Toast más largo.
- Confirmaciones sin timeout.

---

## 21. Reglas de performance

### 21.1 Auth

- Render inicial liviano.
- Logo local.
- No cargar assets pesados.
- No bloquear UI mientras se validan campos locales.
- Evitar re-render de todo el form por cada keypress si no hace falta.

### 21.2 Familia/listas

- Usar listas eficientes si miembros crecen.
- Skeleton simple.
- Avatares optimizados.
- No recalcular colores/hash en cada render sin memoización.
- No cargar imágenes full-size.

### 21.3 Glass/blur

- Evitar blur pesado en formularios auth.
- Tab bar/sheets pueden usar glass según Navigation Shell.
- Android/Web debe tener fallback surface translúcido sin blur real.

### 21.4 Network

- Evitar doble submit.
- Refetch `/me` solo cuando aporta navegación/estado.
- No hacer polling agresivo en waiting approval.
- Refresh manual o intervalo muy moderado si ya existe.

---

## 22. Checklist QA

### 22.1 Auth

- [ ] Login usa copy humano y no técnico.
- [ ] Login no revela si email existe.
- [ ] Inputs no se limpian ante error.
- [ ] CTA tiene loading y evita doble tap.
- [ ] Registro no pide campos innecesarios.
- [ ] Errores de registro son inline o toast claro.
- [ ] Sesión vencida navega a Auth sin loop.
- [ ] Logout limpia sesión y vuelve a Login.
- [ ] Keyboard no tapa inputs.
- [ ] Reduced motion funciona.

### 22.2 Crear / unirse a hogar

- [ ] Usuario sin hogar ve crear/unirse, no Home vacía.
- [ ] Crear hogar pide solo nombre salvo campos ya reales.
- [ ] Crear hogar hace refetch `/me` al éxito.
- [ ] Unirse por link no muestra token técnico.
- [ ] Link inválido tiene error humano.
- [ ] Pending no accede a Home privada.
- [ ] Waiting approval permite actualizar estado.
- [ ] Rejected/finalized no queda en loop.

### 22.3 Familia / miembros

- [ ] Lista muestra avatares, nombres y roles humanos.
- [ ] Active no usa badges innecesarios.
- [ ] Pending se distingue claramente.
- [ ] Coordinator ve solicitudes pendientes.
- [ ] Adult no ve aprobar/rechazar si no puede.
- [ ] Approve requiere rol si backend lo requiere.
- [ ] Reject pide confirmación.
- [ ] Empty state invita sin sonar triste.

### 22.4 Invitar

- [ ] Compartir link usa share sheet nativo.
- [ ] Copiar link muestra toast.
- [ ] No se muestra vencimiento si no existe.
- [ ] No se usa join code.
- [ ] Copy explica que puede requerir aprobación.
- [ ] Error creando link no rompe la pantalla.

### 22.5 Profile / Settings

- [ ] Profile muestra nombre, email, hogar y rol.
- [ ] No muestra IDs técnicos.
- [ ] Settings está agrupado estilo iOS.
- [ ] Toggles falsos están ocultos o deshabilitados como próximamente.
- [ ] Logout usa confirm sheet.
- [ ] Settings no se vuelve dashboard.

### 22.6 Accesibilidad

- [ ] Touch targets mínimos.
- [ ] Labels accesibles en inputs y botones.
- [ ] Password toggle accesible.
- [ ] Approve/reject accesibles.
- [ ] Contraste AA.
- [ ] Modo senior no depende de gestos.

---

## 23. Fases sugeridas de polish

### Fase A — Auth polish seguro

Objetivo:

- mejorar Splash, Login, Registro, errores, loading y sesión vencida sin tocar backend.

Entregables:

- AppScreen auth;
- AppInput consistente;
- AppButton loading;
- Toasts humanos;
- keyboard behavior;
- copy final.

### Fase B — Household entry polish

Objetivo:

- hacer premium crear hogar/unirse/waiting approval.

Entregables:

- Crear hogar simple;
- Unirse por link;
- Waiting approval;
- refetch state;
- errores humanos.

### Fase C — Familia real mínima

Objetivo:

- convertir People/Familia en miembros + invitaciones reales.

Entregables:

- lista de miembros;
- role pills;
- pending cards;
- invite link sheet;
- pending requests;
- approve/reject sheets.

### Fase D — Profile/Settings polish

Objetivo:

- cerrar experiencia de cuenta y salida.

Entregables:

- Profile básico;
- Settings grouped list;
- Logout confirm;
- rows disabled/próximamente donde corresponda.

---

## 24. Qué NO hacer

### 24.1 No hacer en Auth

- No cambiar endpoints.
- No cambiar la semántica de sesión.
- No mezclar registro con create household si el flujo real no lo hace.
- No pedir datos personales innecesarios.
- No mostrar errores técnicos.
- No agregar 2FA/biometría real sin backend.
- No simular social login si no funciona.

### 24.2 No hacer en Household

- No crear multi-hogar avanzado.
- No mostrar selector de hogar si solo hay uno.
- No mostrar reglas de privacidad por tipo de hogar si no existen.
- No usar join code si la decisión final es link.
- No mostrar expiración de link si no existe.
- No permitir pending como active.

### 24.3 No hacer en Familia

- No convertir miembros en tabla administrativa.
- No mostrar IDs.
- No mostrar todos los estados si no aportan.
- No dejar approve/reject visibles a quien no puede.
- No ocultar solicitudes pendientes al coordinator.
- No aprobar/rechazar sin feedback.

### 24.4 No hacer en Profile/Settings

- No crear Settings con toggles falsos funcionales.
- No meter Finance/Inventory real en Settings.
- No mostrar auditoría completa si no existe.
- No meter logout como botón rojo gigante arriba.
- No mostrar raw config.
- No crear edición de email/password si no está soportada.

### 24.5 No hacer visualmente

- No saturar con badges.
- No usar colores de error para estados normales.
- No anidar cards dentro de cards sin necesidad.
- No usar glass en inputs.
- No usar blur pesado en Android.
- No usar motion ornamental.
- No usar textos largos en pantalla chica.

---

## 25. Criterios de aceptación visual

Una implementación cumple este documento si:

- Auth se entiende en menos de 5 segundos.
- Crear hogar pide solo lo necesario.
- Join link explica claramente el resultado.
- Pending approval no muestra Home privada.
- Familia muestra personas, no registros técnicos.
- Invitar por link es obvio y rápido.
- Solicitudes pendientes son visibles para coordinator.
- Approve/reject tienen feedback y confirmación adecuada.
- Profile permite entender cuenta/hogar/rol.
- Settings parece una lista iOS premium, no un panel técnico.
- Todos los errores están en lenguaje humano.
- No hay mocks que parezcan features reales de seguridad o permisos.
- No hay IDs, tokens ni nombres técnicos visibles.
- La experiencia completa mantiene coherencia con Design System y Navigation Shell.

---

## 26. Resumen operativo para Antigravity/Codex

Implementar polish sobre pantallas existentes, sin tocar backend:

1. Aplicar Design System a Auth.
2. Normalizar inputs, botones, loading, errores y toasts.
3. Pulir crear hogar como pantalla cálida de identidad.
4. Pulir unirse por link como solicitud clara.
5. Crear/ajustar waiting approval sin tabs privadas.
6. Pulir Familia con miembros reales, roles y estados.
7. Agregar invite link sheet con copiar/compartir.
8. Agregar solicitudes pendientes para coordinator con aprobar/rechazar.
9. Pulir Profile con datos básicos reales.
10. Pulir Settings como grouped list estilo iOS.
11. Mantener mocks solo como preferencias deshabilitadas/próximamente.
12. No cambiar endpoints, flujos ni permisos reales.

AUTH HOUSEHOLD PROFILE READY
