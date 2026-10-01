# **🚀 HomePlus — Linear Workspace MVP v1.2**

Diseñado para un equipo de estudiantes. Cada Issue se puede tomar sin contexto adicional.

---

## **👥 EQUIPO**

| Miembro | Rol | ¿Qué hace? | ¿Qué NO hace? |
| :---- | :---- | :---- | :---- |
| **Gabriel** | PM \+ Frontend Lead \+ UX | Diseña pantallas, revisa todo lo visual, integra al final, presenta | No escribe backend |
| **Compañero 1** | Backend Lead \+ Seguridad | Auth, seguridad, base de datos, TODOS los endpoints y lógica de servidor | No diseña pantallas |
| **Compañero 2** | Frontend Planner \+ UI funcional | Todo el frontend de Planner (Tasks, Events, Calendar). Implementa pantallas. | No escribe endpoints ni toca la base de datos |
| **Compañero 3** | Content Owner \+ Demo \+ UX Texts | Crea datos demo, testea la app, escribe textos de UX, prepara assets | No toca código crítico de backend ni frontend complejo |

**Regla de oro:** Cada uno hace lo que mejor sabe hacer. El backend es 100% de Compañero 1\. El frontend de Planner es 100% de Compañero 2\.

**Lo importante:** Llegar al Día 7 con la app funcionando y lista para presentar.

---

## **1\. PROJECTS**

| ID | Nombre | Color | Descripción |
| :---- | :---- | :---- | :---- |
| **HP** | HomePlus MVP | 🔵 Azul | Proyecto principal. |
| **AUTH** | Auth & Onboarding | 🔴 Rojo | Registro, login, JWT, RLS, invitaciones, onboarding. |
| **HOUSE** | Household | 🟠 Naranja | Gestión de hogares, miembros, roles. |
| **PLAN** | Planner | 🟢 Verde | Tareas, eventos, calendario. El corazón del MVP. |
| **HOME** | Home | 🟣 Púrpura | Pantalla principal, briefing, estados. |
| **NAV** | Navegación | 🩶 Gris | Bottom nav, Quick Actions, empty states. |
| **DEMO** | Demo Final | 🟡 Amarillo | Seed data, smoke test, presentación. |

---

## **2\. MILESTONES**

| Nombre | Fecha objetivo | Descripción |
| :---- | :---- | :---- |
| **M1 — Backend Core** | Día 3 | Auth \+ Household \+ Tasks CRUD \+ Events CRUD listos. Endpoints funcionales. |
| **M2 — Frontend Core** | Día 5 | Todas las pantallas implementadas. Navegación funcional. |
| **M3 — Integración QA** | Día 6 | Frontend conectado a Backend. QA completa. Bugs corregidos. |
| **M4 — Demo Ready** | Día 7 | Seed data cargado. App pulida. Presentación ensayada. |

---

## **3\. LABELS**

### **Área técnica**

| Label | Color | Uso |
| :---- | :---- | :---- |
| ﻿﻿﻿﻿backend﻿ | 🔵 Azul | Endpoints, lógica de servidor, base de datos. |
| ﻿﻿﻿﻿frontend﻿ | 🟢 Verde | Pantallas, componentes, UI. |
| ﻿﻿﻿﻿database﻿ | 🟣 Púrpura | Migraciones, esquemas, índices. |
| ﻿﻿﻿﻿api﻿ | 🟠 Naranja | Diseño e implementación de endpoints. |
| ﻿﻿﻿﻿ui﻿ | 🩷 Rosa | Componentes visuales, diseño. |
| ﻿﻿﻿﻿ux﻿ | 🟡 Amarillo | Flujos de usuario, interacciones, animaciones. |
| ﻿﻿﻿﻿security﻿ | 🔴 Rojo | RLS, JWT, permisos. |
| ﻿﻿﻿﻿qa﻿ | ⚫ Negro | Testing, verificación. |

### **Tipo de dato**

| Label | Color | Uso |
| :---- | :---- | :---- |
| ﻿﻿﻿﻿real﻿ | 🟢 Verde | Datos reales, conectados al backend. |
| ﻿﻿﻿﻿mock﻿ | 🟡 Amarillo | Datos mockeados, placeholders. |

### **Estado**

| Label | Color | Uso |
| :---- | :---- | :---- |
| ﻿﻿﻿﻿post-mvp﻿ | 🔴 Rojo | Fuera del alcance del MVP. No tocar. |
| ﻿﻿﻿﻿v1.1﻿ | 🟠 Naranja | Solo si sobra tiempo. |
| ﻿﻿﻿﻿blocked﻿ | ⚫ Negro | Bloqueado por dependencia. |

---

## **4\. WORKFLOW**

Backlog  →  Todo  →  In Progress  →  In Review  →  Testing  →  Done

* **Backlog**: Issues definidas pero aún no priorizadas.  
* **Todo**: Listas para ser tomadas.  
* **In Progress**: Alguien está trabajando.  
* **In Review**: Código escrito, esperando revisión.  
* **Testing**: QA en curso.  
* **Done**: Completada, mergeada, funcional.

---

## **5\. DEPENDENCIAS**

H-001 Register ──┬── H-002 Login ──┬── H-007 Auth Screens  
                 │                 │  
                 └── H-003 RLS ────┤  
                                   │  
H-004 Create Household ────────────┤  
                                   │  
H-005 Invitations ─────────────────┤  
                                   │  
H-006 Onboarding ──────────────────┘  
       │  
       └── H-009 Onboarding Screens

H-010 Members CRUD ──── H-011 Members UI

H-012 Tasks Table ──┬── H-013 Tasks CRUD ──┬── H-020 Tasks UI  
                    │                      │  
                    ├── H-014 Templates ───┤  
                    │                      │  
                    ├── H-015 Responsib ───┤  
                    │                      │  
                    ├── H-016 Verification ─┼── H-021 Verification UI  
                    │                      │  
                    ├── H-017 Comments ────┼── H-022 Comments UI  
                    │                      │  
                    ├── H-018 Attachments ─┤  
                    │                      │  
                    └── H-019 Streaks ─────┼── H-023 Streaks UI

H-024 Events Table ──┬── H-025 Events CRUD ──┬── H-028 Events UI  
                     │                       │  
                     └── H-026 Recurrence ───┼── H-029 Calendar UI

H-030 Home Real ──┬── H-031 Home Mock ──┬── H-032 Home States  
                  │                    │  
                  └────────────────────┼── H-033 Home por Rol

H-034 Bottom Nav ──┬── H-035 Quick Actions  
                   │  
                   └── H-036 Empty States

H-037 Seed Demo ──── H-038 Smoke Test ──── H-039 Polish  
---

## **6\. ISSUES**

---

### **H-001 — Register Endpoint \+ JWT**

| Campo | Valor |
| :---- | :---- |
| **Project** | AUTH |
| **Priority** | 🔴 Urgent |
| **Estimate** | M (4h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ ﻿﻿﻿security﻿ |
| **Dependencies** | Ninguna |
| **Asignado a** | 🔧 **Compañero 1** |
| **Revisado por** | Gabriel (revisa que los endpoints tengan la forma correcta para el frontend) |

**¿Por qué él?** Es el punto de partida de todo. Auth es la base sobre la que se construye TODO lo demás. Compañero 1 es el backend lead — nadie más en el equipo tiene la experiencia con autenticación y seguridad para hacer esto.

**Descripción:** Implementar el endpoint de registro de usuarios. Un usuario nuevo debe poder crear una cuenta con email y contraseña, y recibir un token JWT válido.

**Checklist**

Backend  
□ Configurar Supabase Auth con email/password  
□ Endpoint POST /auth/register  
  \- Recibe: email, password, display\_name  
  \- Valida: email válido, password ≥ 8 caracteres  
  \- Crea usuario en auth.users  
  \- Devuelve: access\_token, refresh\_token, user\_id  
□ Endpoint POST /auth/login  
□ Endpoint POST /auth/refresh  
□ Endpoint POST /auth/logout  
□ JWT payload incluye: user\_id, email

QA  
□ Registro exitoso → 201 \+ token  
□ Email duplicado → 409  
□ Contraseña corta → 400  
□ Login correcto → 200 \+ token  
□ Login incorrecto → 401

**DONE cuando** ✔ Los 4 endpoints funcionan ✔ JWT se genera y valida ✔ Rate limiting básico

---

### **H-002 — Login Screen \+ Register Screen**

| Campo | Valor |
| :---- | :---- |
| **Project** | AUTH |
| **Priority** | 🔴 Urgent |
| **Estimate** | M (3h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-001 |
| **Asignado a** | 🎨 **Gabriel** (diseño \+ revisión final) |
| **Implementa** | 🧩 **Compañero 2** (arma las pantallas) |

**¿Por qué ellos?** Gabriel diseñó todas las pantallas del Home y el onboarding. Sabe exactamente cómo deben verse y sentirse. Compañero 2 implementa siguiendo las indicaciones visuales. Gabriel revisa al final.

**Descripción:** Crear las pantallas de Login y Register. Deben ser claras, rápidas y dar feedback inmediato.

**Checklist**

Frontend  
□ Login Screen: email, password, botón, link a registro, loading state, errores inline  
□ Register Screen: email, password, display\_name, botón, link a login  
□ Validaciones client-side: email formato, password ≥ 8 caracteres  
□ Animaciones: transición slide entre pantallas, háptico ligero en botón  
□ Mobile-first (375×812px). Paleta tierra.

QA  
□ Login exitoso → redirección a Home  
□ Login fallido → error visible  
□ Registro exitoso → redirección a onboarding  
□ Registro duplicado → error visible

**DONE cuando** ✔ Ambas pantallas funcionales ✔ Validaciones client-side ✔ Flujo Register → Onboarding → Home

---

### **H-003 — Row Level Security**

| Campo | Valor |
| :---- | :---- |
| **Project** | AUTH |
| **Priority** | 🔴 Urgent |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿database﻿ ﻿﻿﻿security﻿ |
| **Dependencies** | H-001 |
| **Asignado a** | 🔧 **Compañero 1** |

**¿Por qué él?** Esto es seguridad pura. Si RLS no está bien configurado, un miembro del Hogar A puede ver datos del Hogar B. Es la última línea de defensa y solo Compañero 1 tiene el conocimiento para hacerlo bien.

**Descripción:** Implementar Row Level Security en todas las tablas. Un miembro del Hogar A no puede ver datos del Hogar B.

**Checklist**

Backend  
□ Configurar RLS en: households, household\_members, tasks, events, invitations, notifications  
□ Política base: WHERE household\_id IN (SELECT household\_id FROM household\_members WHERE user\_id \= auth.uid())  
□ INSERT: household\_id debe pertenecer a un hogar donde el usuario es miembro  
□ UPDATE/DELETE: misma restricción \+ reglas de rol  
□ RLS ACTIVO en todas las tablas (no solo definido)

QA  
□ Miembro Hogar A → GET /tasks → solo ve tareas de A  
□ Miembro Hogar A → intenta ver miembro de Hogar B → 403

**DONE cuando** ✔ RLS activo en todas las tablas ✔ Test de aislamiento entre hogares pasa

---

### **H-004 — Crear hogar al registrarse**

| Campo | Valor |
| :---- | :---- |
| **Project** | AUTH |
| **Priority** | 🔴 Urgent |
| **Estimate** | S (1.5h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ ﻿﻿﻿database﻿ |
| **Dependencies** | H-001 |
| **Asignado a** | 🔧 **Compañero 1** |

**¿Por qué él?** Es parte del flujo de registro. Tiene que ser atómico: si falla la creación del hogar, el usuario no puede quedar creado a medias. Compañero 1 ya está haciendo H-001, esto es una extensión natural.

**Descripción:** Cuando un usuario se registra, se debe crear automáticamente su primer hogar y asignarle el rol de Coordinator.

**Checklist**

Backend  
□ Tabla households: id, name, slug, timezone, default\_language, config, created\_at  
□ Tabla household\_members: id, household\_id, user\_id, role, status, display\_name, joined\_at  
□ Flujo atómico: crear usuario → crear household → crear miembro coordinator  
□ Endpoint POST /households (para hogares adicionales)

QA  
□ Registro exitoso → usuario tiene 1 hogar, es coordinator  
□ Si falla creación del hogar → rollback completo

**DONE cuando** ✔ Registro crea usuario \+ hogar \+ miembro en una transacción ✔ Rollback funciona

---

### **H-005 — Sistema de invitaciones**

| Campo | Valor |
| :---- | :---- |
| **Project** | AUTH |
| **Priority** | 🔴 Urgent |
| **Estimate** | M (3h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ ﻿﻿﻿database﻿ |
| **Dependencies** | H-004 |
| **Asignado a** | 🔧 **Compañero 1** |

**¿Por qué él?** Las invitaciones involucran tokens criptográficos y race conditions (dos personas aceptando al mismo tiempo). Requiere experiencia con transacciones atómicas y unique constraints. Backend delicado — solo Compañero 1\.

**Descripción:** El Coordinator debe poder invitar miembros al hogar. Token único de un solo uso que expira en 7 días.

**Checklist**

Backend  
□ Tabla invitations: id, household\_id, email, token (UNIQUE), suggested\_role, status, expires\_at  
□ POST /households/:hid/invitations → solo coordinator, genera token crypto random  
□ POST /households/:hid/invitations/:iid/accept → atómico con WHERE status='pending'  
□ DELETE /households/:hid/invitations/:iid → solo coordinator, status → 'cancelled'

QA  
□ Coordinator invita → invitación creada  
□ Aceptar con token válido → miembro creado  
□ Token expirado → 410  
□ Dos usuarios aceptan mismo token → solo el primero gana, segundo 409

**DONE cuando** ✔ Invitaciones funcionan ✔ Race condition resuelta ✔ Expiración funciona

---

### **H-006 — Pantallas de invitación**

| Campo | Valor |
| :---- | :---- |
| **Project** | AUTH |
| **Priority** | 🔴 Urgent |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-005 |
| **Asignado a** | 🎨 **Gabriel** (diseño del flujo) |
| **Implementa** | 🧩 **Compañero 2** (arma las pantallas) |

**¿Por qué ellos?** Mismo esquema que H-002. Gabriel define cómo se ve, Compañero 2 ejecuta. Es un flujo simple y lineal, sin lógica compleja.

**Descripción:** Pantallas para invitar miembros y aceptar invitaciones.

**Checklist**

Frontend  
□ Pantalla "Invitar miembro": email, selector de rol, mensaje opcional, lista de pendientes  
□ Pantalla "Aceptar invitación": nombre del hogar, rol sugerido, botón "Unirme"  
□ Estados: loading, error (token expirado/usado), success → redirección

**DONE cuando** ✔ Coordinator puede invitar ✔ Invitado puede aceptar ✔ Errores claros

---

### **H-007 — Onboarding por rol**

| Campo | Valor |
| :---- | :---- |
| **Project** | AUTH |
| **Priority** | 🔴 Urgent |
| **Estimate** | L (5h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ ﻿﻿﻿ux﻿ |
| **Dependencies** | H-006 |
| **Asignado a** | 🎨 **Gabriel** (diseño de los 5 flujos \+ revisión final) |
| **Implementa** | 🧩 **Compañero 2** (arma las pantallas de cada paso) |

**¿Por qué ellos?** Es lo más complejo de UX: 5 experiencias distintas (una por rol). Gabriel diseñó esto en detalle — conoce cada pantalla. Compañero 2 ejecuta los pasos individuales bajo supervisión de Gabriel.

**Descripción:** Cada rol tiene un onboarding distinto. Primer valor en \< 60 segundos.

**Checklist**

Frontend  
□ Coordinator (3 pasos, \~60s): nombre hogar → invitar miembros → preferencia horaria  
□ Adult (2 pasos, \~30s): confirmar nombre → preferencia horaria  
□ Adolescent (2 pasos, \~25s): avatar → color de tema  
□ Child (3 pasos, \~25s): avatar animal → lista demo → completar primera tarea  
□ Senior (3 pasos, \~60s): nombre \+ Don/Doña → letra grande → medicación \+ contacto emergencia  
□ Transiciones slide entre pasos. Indicador de progreso (dots). Sin botón "Saltar".

QA  
□ Cada rol ve su onboarding correcto  
□ No se salta sin completar  
□ Se muestra UNA sola vez

**DONE cuando** ✔ 5 flujos implementados ✔ Cada rol llega a su Home ✔ No se repite

---

### **H-008 — Gestión de miembros del hogar**

| Campo | Valor |
| :---- | :---- |
| **Project** | HOUSE |
| **Priority** | 🔴 Urgent |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ |
| **Dependencies** | H-004 |
| **Asignado a** | 🔧 **Compañero 1** |

**¿Por qué él?** CRUD con reglas de negocio: no se puede echar al último coordinator, cambios de rol auditados. Backend puro — Compañero 1\.

**Descripción:** Endpoints para listar, modificar y remover miembros del hogar.

**Checklist**

Backend  
□ GET /households/:hid/members → lista con id, display\_name, role, status, avatar  
□ PATCH /households/:hid/members/:mid → coordinator: role/status; propio: display\_name/avatar  
□ DELETE → soft-delete (status='finalized'), solo coordinator, no auto-finalizar si es último coordinator

**DONE cuando** ✔ CRUD funcional ✔ Reglas de rol respetadas ✔ No se puede dejar sin coordinator

---

### **H-009 — Pantalla de miembros del hogar**

| Campo | Valor |
| :---- | :---- |
| **Project** | HOUSE |
| **Priority** | 🔴 Urgent |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-008 |
| **Asignado a** | 🧩 **Compañero 2** |
| **Revisado por** | Gabriel (consistencia visual) |

**¿Por qué él?** Pantalla simple: lista con avatares y botones. Sin lógica complicada. Compañero 2 practica frontend con componentes reutilizables.

**Descripción:** Pantalla donde el Coordinator ve y gestiona los miembros del hogar.

**Checklist**

Frontend  
□ Lista de miembros con avatar \+ nombre \+ rol \+ estado, agrupados por rol  
□ Acciones: cambiar rol (bottom sheet), finalizar membresía (confirmación doble)  
□ Empty state: "Todavía no hay miembros. ¿Querés invitar a alguien?"

**DONE cuando** ✔ Lista funcional ✔ Coordinator puede gestionar roles ✔ Empty state

---

### **H-010 — Tasks: Tabla \+ Migración**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🔴 Urgent |
| **Estimate** | S (1.5h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿database﻿ |
| **Dependencies** | H-004 |
| **Asignado a** | 🔧 **Compañero 1** |

**¿Por qué él?** La tabla de tareas es la más importante de toda la app. Si está mal diseñada, todo Planner sufre. Compañero 1 define la estructura completa y ejecuta la migración.

**Descripción:** Crear la tabla ﻿﻿﻿tasks﻿ con todos los campos necesarios para el MVP.

**Checklist**

Backend  
□ Tabla tasks: id, household\_id, title, description, status, priority, responsibility, due\_date,  
  due\_time, assigned\_to, created\_by, requires\_verification, verified\_by, verified\_at, completed\_at  
□ Índices: household\_id, assigned\_to, due\_date, status  
□ RLS activo

**DONE cuando** ✔ Tabla creada ✔ Índices aplicados ✔ RLS activo y testeado

---

### **H-011 — Tasks: CRUD Endpoints**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🔴 Urgent |
| **Estimate** | M (3h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ |
| **Dependencies** | H-010 |
| **Asignado a** | 🔧 **Compañero 1** |

**¿Por qué él?** Tasks CRUD es el corazón del backend de Planner. Involucra permisos por rol, verificación, race conditions al completar. Es backend complejo — solo Compañero 1 tiene la experiencia para hacerlo bien y seguro.

**Descripción:** Endpoints completos para crear, leer, actualizar y eliminar tareas. Cada endpoint respeta permisos por rol.

**Checklist**

Backend  
□ POST /households/:hid/tasks → Adult/Coordinator; campos: title, responsibility (obligatorios)  
□ GET /households/:hid/tasks → filtros: status, assigned\_to, responsibility; paginación  
□ PATCH /households/:hid/tasks/:tid → permisos por rol; status='completed' → completed\_at=now()  
□ POST /households/:hid/tasks/:tid/verify → solo Adult/Coordinator  
□ DELETE → soft-delete  
□ Toast "Deshacer": PATCH status→'pending' dentro de 5s

**DONE cuando** ✔ CRUD completo funcional ✔ Permisos por rol ✔ Verification flow ✔ Deshacer funciona

---

### **H-012 — Tasks: Templates predefinidas**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🟠 High |
| **Estimate** | XS (1h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-011 |
| **Asignado a** | 🧩 **Compañero 2** |

**¿Por qué él?** Es la tarea más simple de todo Planner: un array de constantes y un botón que autocompleta. Frontend puro, sin backend. Compañero 2 gana confianza con el código.

**Descripción:** Templates predefinidas que aceleren la creación de tareas. Array de constantes del sistema.

**Checklist**

Frontend  
□ Array de templates (constante): 3+ por categoría (Limpieza, Compras, Mascotas, Medicación, etc.)  
□ Botón "Usar plantilla" en formulario → bottom sheet con agrupación por categoría  
□ Al seleccionar → autocompleta title, responsibility, priority

**DONE cuando** ✔ Botón visible ✔ 3+ templates por categoría ✔ Autocompletado funcional

---

### **H-013 — Tasks: Pantalla principal \+ Formulario**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🔴 Urgent |
| **Estimate** | L (4h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ ﻿﻿﻿ux﻿ |
| **Dependencies** | H-011, H-012 |
| **Asignado a** | 🧩 **Compañero 2** |
| **Revisado por** | Gabriel (revisión visual y UX) |

**¿Por qué él?** Es la pantalla más usada de la app. Compañero 2 ya practicó con H-009 (Members UI) y H-002 (Login). Sabe hacer listas, formularios y componentes. Gabriel revisa que la experiencia sea correcta.

**Descripción:** Pantalla principal de tareas con lista agrupada por responsabilidad y formulario de creación/edición.

**Checklist**

Frontend  
□ Lista agrupada por Responsabilidad con checkbox 1-tap en zona de pulgar  
□ Filtro rápido: chips \[Todas\] \[Hoy\] \[Mías\] \[Pendientes\]  
□ Formulario creación (bottom sheet): título, responsabilidad, prioridad, fecha, asignado, verificación  
□ Animaciones: checkbox relleno \+ tachado \+ háptico (300ms), toast "Deshacer" 5s  
□ Estados: skeleton loading, empty, error

**DONE cuando** ✔ Lista agrupada funcional ✔ CRUD desde UI ✔ Estados implementados ✔ Animaciones

---

### **H-014 — Tasks: Verification UI**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🟠 High |
| **Estimate** | S (1.5h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-013 |
| **Asignado a** | 🧩 **Compañero 2** |

**¿Por qué él?** Extensión de la pantalla de tareas. Flujo definido: Child completa → badge amarillo → Adult verifica → badge verde. Compañero 2 ya conoce el código de Tasks UI.

**Descripción:** Interfaz para el flujo de verificación: Child completa y Adult verifica.

**Checklist**

Frontend  
□ Badge "Por verificar" (amarillo) y "Verificado ✓" (verde)  
□ Sección "Por verificar" para Adult/Coordinator con botón "Verificar" 1-tap  
□ Vista del Child: "Esperando verificación..." → "¡Verificado\! 🎯"

**DONE cuando** ✔ Flujo Child completa → Adult verifica ✔ Badges correctos ✔ Sección condicional por rol

---

### **H-015 — Tasks: Comentarios**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🟡 Medium |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ ﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-011 |
| **Asignado a** | 🔧 **Compañero 1** (backend: tabla \+ endpoints) |
| **Implementa UI** | 🧩 **Compañero 2** (frontend: lista de comentarios \+ input) |

**¿Por qué ellos?** Es la primera tarea compartida. Backend simple (1 tabla, 2 endpoints) para Compañero 1\. Frontend simple (lista \+ input) para Compañero 2\. Cada uno en lo suyo, bien delimitado.

**Descripción:** Sistema simple de comentarios en tareas.

**Checklist**

Backend (Compañero 1\)  
□ Tabla task\_comments: id, task\_id, author\_id, content, created\_at  
□ POST /tasks/:tid/comments \+ GET /tasks/:tid/comments

Frontend (Compañero 2\)  
□ Sección "Comentarios" en detalle de tarea  
□ Input \+ botón "Enviar". Lista cronológica. Carga optimista.

**DONE cuando** ✔ Comentarios se crean y muestran ✔ Optimistic UI ✔ Scroll en listas largas

---

### **H-016 — Tasks: Adjuntos**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🟡 Medium |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ ﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-011 |
| **Asignado a** | 🔧 **Compañero 1** (backend: multipart upload \+ storage) |
| **Implementa UI** | 🧩 **Compañero 2** (frontend: thumbnail \+ botón) |

**¿Por qué ellos?** Mismo esquema que H-015. Backend: upload a Supabase Storage (Compañero 1). Frontend: UI de adjunto (Compañero 2). Bien separado.

**Descripción:** Adjuntar 1 archivo (imagen o PDF) por tarea. Máximo 5MB.

**Checklist**

Backend (Compañero 1\)  
□ Tabla task\_attachments: id, task\_id (UNIQUE), file\_path, file\_name, file\_size, content\_type  
□ POST /tasks/:tid/attachments (multipart). Storage: bucket "task-attachments". Límite 5MB.

Frontend (Compañero 2\)  
□ Botón "Adjuntar archivo" \+ thumbnail/nombre \+ previsualizar \+ eliminar con confirmación

**DONE cuando** ✔ Se puede adjuntar 1 archivo ✔ Thumbnails para imágenes ✔ Límite 5MB respetado

---

### **H-017 — Streaks simplificadas**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🟡 Medium |
| **Estimate** | S (1.5h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ ﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-011 |
| **Asignado a** | 🔧 **Compañero 1** (lógica de cálculo \+ endpoint) |
| **Implementa UI** | 🧩 **Compañero 2** (indicador visual en Home) |

**¿Por qué ellos?** La lógica de streaks tiene edge cases delicados (medianoche, zonas horarias). Compañero 1 implementa el cálculo. Compañero 2 pone el indicador (🔥) en el Home. Separado y claro.

**Descripción:** Rachas: completar todas las tareas del día → \+1. Fallar un día → \-5 (mín 0). Fallar varios → 0\.

**Checklist**

Backend (Compañero 1\)  
□ Tabla streaks: member\_id, current\_streak, last\_completed\_date  
□ Cálculo on-demand al completar tarea. GET /households/:hid/streaks/:mid

Frontend (Compañero 2\)  
□ Indicador "🔥 N días seguidos" en Home. Solo visible para el propio miembro.  
□ Child: ícono de fuego \+ días. Sin racha activa: no se muestra.

**DONE cuando** ✔ Streak calculado correctamente ✔ Visible en Home ✔ Privado por miembro

---

### **H-018 — Events: Tabla \+ CRUD Endpoints**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🔴 Urgent |
| **Estimate** | M (3h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ ﻿﻿﻿database﻿ |
| **Dependencies** | H-004 |
| **Asignado a** | 🔧 **Compañero 1** |

**¿Por qué él?** Events CRUD es backend puro: tabla, índices, endpoints, RLS, participantes. Es el mismo patrón que Tasks (H-010 \+ H-011) pero para eventos. Compañero 1 ya hizo Tasks, esto es aplicar lo mismo. Nadie más debería tocar el backend de Planner.

**Descripción:** Tabla ﻿﻿﻿events﻿ y endpoints CRUD completos.

**Checklist**

Backend  
□ Tabla events: id, household\_id, title, description, starts\_at, ends\_at, all\_day,  
  location\_name, location\_address, recurrence, status, visibility, created\_by  
□ Tabla event\_participants: event\_id, member\_id, response  
□ POST/GET/PATCH/DELETE /households/:hid/events  
□ GET con filtro ?from=ISO\&to=ISO para rango de fechas  
□ POST/GET /events/:eid/participants  
□ RLS activo

**DONE cuando** ✔ CRUD completo ✔ Participantes básicos ✔ Filtro por rango ✔ RLS

---

### **H-019 — Recurrencia simple**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🟠 High |
| **Estimate** | S (1.5h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ |
| **Dependencies** | H-018 |
| **Asignado a** | 🔧 **Compañero 1** |

**¿Por qué él?** Lógica de generación de instancias virtuales: daily, weekly, monthly. Es backend puro — lógica de servidor. Compañero 1 la implementa sobre el código de Events que ya escribió.

**Descripción:** Eventos que se repiten diaria, semanal o mensualmente. Sin RRULE complejo.

**Checklist**

Backend  
□ Campo recurrence: none | daily | weekly | monthly  
□ Al consultar eventos en rango: generar instancias virtuales de eventos con recurrence  
□ Máximo 52 instancias generadas. Las instancias no se persisten.  
□ Editar "solo este" → excepción (skip en generación)  
□ Selector de recurrencia en formulario: segmented control

QA  
□ Diario → se muestra todos los días en el rango  
□ Semanal → cada 7 días  
□ Mensual → mismo día cada mes

**DONE cuando** ✔ Recurrencia daily/weekly/monthly ✔ Instancias virtuales ✔ Edición individual

---

### **H-020 — Calendar: Vistas Día / Semana / Mes**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🔴 Urgent |
| **Estimate** | L (4h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-018, H-019 |
| **Asignado a** | 🎨 **Gabriel** (arquitectura del componente \+ diseño visual) |
| **Implementa** | 🧩 **Compañero 2** (arma las 3 vistas por separado) |

**¿Por qué ellos?** Es la pantalla más difícil visualmente. Tres vistas, navegación entre fechas, eventos \+ tareas. Gabriel define la arquitectura. Compañero 2 ejecuta cada vista. Sin Gabriel supervisando, el calendario se vuelve un desastre visual.

**Descripción:** Calendario con vistas Mes, Semana y Día.

**Checklist**

Frontend  
□ Vista MES: grid 7×6, dots en días con eventos, hoy con círculo, swipe entre meses  
□ Vista SEMANA: columnas por día, filas por hora (7-22), eventos como bloques  
□ Vista DÍA: timeline vertical, eventos como cards, tareas abajo, línea de hora actual  
□ Navegación: header con \< \>, selector \[Mes|Semana|Día\], botón "Hoy", botón \+  
□ Tareas con due\_date visibles en su día

**DONE cuando** ✔ 3 vistas funcionales ✔ Navegación entre fechas ✔ Eventos \+ tareas visibles

---

### **H-021 — Events: Pantalla de creación \+ lista**

| Campo | Valor |
| :---- | :---- |
| **Project** | PLAN |
| **Priority** | 🔴 Urgent |
| **Estimate** | M (3h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ |
| **Dependencies** | H-018, H-019 |
| **Asignado a** | 🧩 **Compañero 2** |
| **Revisado por** | Gabriel (consistencia visual con Tasks UI) |

**¿Por qué él?** Mismo patrón que H-013 (Tasks UI) pero para eventos. Compañero 2 ya domina el esquema: formulario \+ lista \+ estados. Gabriel solo revisa consistencia.

**Descripción:** Formulario de creación/edición de eventos y pantalla de detalle.

**Checklist**

Frontend  
□ Formulario creación: título, fecha/hora inicio/fin, todo el día, ubicación, recurrencia, participantes  
□ Edición: precargado \+ modal "¿este solo o toda la serie?" si es recurrente  
□ Detalle: título, fecha, ubicación con link a maps, participantes, botones editar/eliminar  
□ Empty state: "Calendario libre por ahora."

**DONE cuando** ✔ Formulario funcional ✔ Detalle con participantes ✔ Recurrentes: individual/serie

---

### **H-022 — Home: Datos reales (Tareas \+ Eventos)**

| Campo | Valor |
| :---- | :---- |
| **Project** | HOME |
| **Priority** | 🔴 Urgent |
| **Estimate** | M (3h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ ﻿﻿﻿real﻿ |
| **Dependencies** | H-013, H-020 |
| **Asignado a** | 🎨 **Gabriel** |

**¿Por qué él?** El Home es LA pantalla. Gabriel diseñó cada detalle: orden de bloques, briefing, adaptación por rol. Nadie más conoce esa especificación. Integra los datos reales que ya construyeron los demás.

**Descripción:** Home con datos reales de Planner. Lo primero que ve el usuario.

**Checklist**

Frontend  
□ Bloque Próximos Eventos (REAL): 2-3 más cercanos con chip HOY/MAÑ/LUN  
□ Bloque Tareas Pendientes (REAL): agrupadas por Responsabilidad, checkbox 1-tap, máx 4  
□ Bloque Resumen: "3 tareas · 2 eventos · 4 miembros"  
□ 3 variantes por rol: Coordinator (todo), Adult (suyo), Child (lista simplificada)

**DONE cuando** ✔ Tareas y eventos reales visibles ✔ Checkbox funciona desde Home ✔ 3 variantes por rol

---

### **H-023 — Home: Secciones mockeadas**

| Campo | Valor |
| :---- | :---- |
| **Project** | HOME |
| **Priority** | 🟠 High |
| **Estimate** | S (1.5h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ ﻿﻿﻿mock﻿ |
| **Dependencies** | H-022 |
| **Asignado a** | 🎨 **Gabriel** (diseña las cards) |
| **Genera datos** | 📋 **Compañero 3** (crea los textos y datos dummy) |

**¿Por qué ellos?** Gabriel define dónde va cada card. Compañero 3 genera los datos falsos. Es perfecto para Compañero 3: crear cosas que se ven, sin tocar código.

**Descripción:** Completar el Home con secciones mockeadas para la demo.

**Checklist**

Frontend  
□ Briefing (MOCK): card destacada con cantidades reales de tareas/eventos  
□ Carga Familiar (MOCK): solo Coordinator, progress bars con datos dummy  
□ Presence (MOCK): avatares con estados 🟢🟡  
□ Actividad Familiar (MOCK): 2-3 items dummy

QA  
□ Home se ve completo (real \+ mock) □ Carga solo visible para Coordinator

**DONE cuando** ✔ Home se ve completo ✔ Briefing usa datos reales

---

### **H-024 — Home: Estados**

| Campo | Valor |
| :---- | :---- |
| **Project** | HOME |
| **Priority** | 🟠 High |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ ﻿﻿﻿ux﻿ |
| **Dependencies** | H-022, H-023 |
| **Asignado a** | 🎨 **Gabriel** |

**¿Por qué él?** Gabriel diseñó los 4 estados del Home. Sabe exactamente qué mostrar en cada uno y cómo transicionar. UX puro — no es solo código.

**Descripción:** Estados del Home: Normal, Todo al día, Sin conexión y Primer uso.

**Checklist**

Frontend  
□ NORMAL: todos los bloques con datos  
□ TODO AL DÍA: 0 tareas → "Todo al día. Sin tareas, sin vencimientos."  
□ SIN CONEXIÓN: banner fijo \+ datos cacheados \+ acciones deshabilitadas  
□ PRIMER USO: cards de acción sugerida post-onboarding

**DONE cuando** ✔ 4 estados implementados ✔ Transiciones fluidas ✔ Sin conexión no rompe la app

---

### **H-025 — Bottom Navigation \+ Quick Actions**

| Campo | Valor |
| :---- | :---- |
| **Project** | NAV |
| **Priority** | 🔴 Urgent |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ ﻿﻿﻿ux﻿ |
| **Dependencies** | H-022 |
| **Asignado a** | 🎨 **Gabriel** |

**¿Por qué él?** La barra de navegación es el esqueleto de toda la app. Una decisión equivocada arruina la experiencia en TODAS las pantallas. Gabriel conoce la especificación canónica — la barra está congelada en V1.

**Descripción:** Barra de navegación inferior canónica \+ panel Quick Actions.

**Checklist**

Frontend  
□ Bottom Nav: \[Home\] \[People\] \[+\] \[Planner\] \[More\] — 5 tabs, siempre sticky  
□ Estado activo: ícono filled \+ label peso 600\. Inactivo: outline \+ peso 400\.  
□ Tap en tab activo → scroll to top \+ refresh. Badge solo success/alert, nunca rojo.  
□ Botón \[+\] → Quick Actions: fondo blur \+ panel con Geni (mock) \+ acciones dinámicas

**DONE cuando** ✔ Navegación entre 5 tabs ✔ Quick Actions funcional ✔ People/More con empty states

---

### **H-026 — Empty States globales**

| Campo | Valor |
| :---- | :---- |
| **Project** | NAV |
| **Priority** | 🟡 Medium |
| **Estimate** | XS (1h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ ﻿﻿﻿ux﻿ |
| **Dependencies** | H-025 |
| **Asignado a** | 🎨 **Gabriel** (define texto y tono) |
| **Implementa** | 📋 **Compañero 3** (arma las pantallas) |

**¿Por qué ellos?** Gabriel define qué dice cada empty state — el tono es clave. Compañero 3 implementa pantallas estáticas. Tarea perfecta para Compañero 3: visible, concreta, sin ambigüedad.

**Descripción:** Cada pantalla sin datos muestra un empty state útil con acción sugerida.

**Checklist**

Frontend  
□ Tasks vacío: 📋 "No tenés tareas pendientes." \+ botón "Crear primera tarea"  
□ Events vacío: 📅 "Calendario libre por ahora." \+ botón "Agregar evento"  
□ People vacío: 👥 "Cuando haya actividad, aparece acá."  
□ Members vacío: 👤 "Todavía no hay miembros." \+ botón "Invitar al primero"  
□ Tono: informativo \+ acción. Sin dramatismo. Sin presión.

**DONE cuando** ✔ Empty states en Tasks, Events, People, Members ✔ Cada uno sugiere acción

---

### **H-027 — Seed Data para Demo**

| Campo | Valor |
| :---- | :---- |
| **Project** | DEMO |
| **Priority** | 🔴 Urgent |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿backend﻿ ﻿﻿﻿api﻿ ﻿﻿﻿demo﻿ |
| **Dependencies** | H-011, H-017, H-018 |
| **Asignado a** | 📋 **Compañero 3** |
| **Revisado por** | 🔧 **Compañero 1** (revisa que el endpoint sea seguro) |

**¿Por qué él?** ESTA ES LA TAREA DE COMPAÑERO 3\. Cerrada, concreta y muy visible: crear una familia falsa con tareas, eventos y streaks. Puede hacerlo sin depender de nadie. Compañero 1 solo revisa que el endpoint no rompa nada. Esta tarea le da a Compañero 3 algo propio que el profesor VA A VER.

**Descripción:** Endpoint que genera datos de demostración. Una familia completa con tareas, eventos y rachas.

**Checklist**

Backend  
□ POST /seed-demo → idempotente (si ya existe, borra y recrea)  
□ Hogar "Familia Demo" con 4 miembros: Gabriel (Coordinator), Mamá (Adult), Hermano (Adolescent), Abuela (Senior)  
□ 6 tareas: pagar servicios, comprar frutas, hacer la tarea (awaiting\_verification), ordenar cuarto (verified), tomar medicación, sacar la basura (completed)  
□ 3 eventos: cena familiar, dentista, reunión de padres  
□ 1 streak activa (Gabriel, 5 días) \+ 2 comentarios \+ 1 adjunto

QA  
□ POST /seed-demo → 201, datos creados □ Home de cada rol tiene contenido □ Re-ejecutar no rompe

**DONE cuando** ✔ Familia demo creada en 1 click ✔ Todos los roles tienen contenido ✔ La app se ve "viva"

---

### **H-028 — Smoke Test \+ QA final**

| Campo | Valor |
| :---- | :---- |
| **Project** | DEMO |
| **Priority** | 🔴 Urgent |
| **Estimate** | M (3h) |
| **Labels** | ﻿﻿﻿﻿qa﻿ |
| **Dependencies** | H-027 |
| **Asignado a** | 📋 **Compañero 3** |
| **Ayudante** | Gabriel (decide qué bugs se corrigen y cuáles no) |

**¿Por qué él?** Compañero 3 sigue un checklist detallado. No necesita diseñar pruebas — solo ejecutarlas y reportar. Trabajo metódico que no requiere creatividad pero sí atención al detalle.

**Descripción:** Recorrer el flujo completo como lo haría el profesor.

**Checklist**

□ Registro → hogar creado → coordinator  
□ Login → Home con datos  
□ Onboarding → cada paso funciona  
□ Invitar miembro → aceptar → aparece en hogar  
□ Crear tarea → asignar → completar → deshacer  
□ Crear evento → ver en calendario (día/semana/mes)  
□ Bottom nav → todos los tabs responden  
□ Quick Actions → panel abre/cierra  
□ Sin crashes al rotar, teclado no tapa inputs, scroll funciona

**DONE cuando** ✔ Flujo completo sin crashes ✔ No bugs bloqueantes ✔ UI consistente

---

### **H-029 — Polish \+ Presentación**

| Campo | Valor |
| :---- | :---- |
| **Project** | DEMO |
| **Priority** | 🟠 High |
| **Estimate** | S (2h) |
| **Labels** | ﻿﻿﻿﻿frontend﻿ ﻿﻿﻿ui﻿ ﻿﻿﻿demo﻿ |
| **Dependencies** | H-028 |
| **Asignado a** | 🎨 **Gabriel** |

**¿Por qué él?** Gabriel es quien presenta. Es la cara del proyecto frente al profesor. Define el recorrido de la demo, ensaya, últimos ajustes visuales. Solo quien diseñó la experiencia puede hacer esto.

**Descripción:** Últimos ajustes visuales y preparación de la presentación.

**Checklist**

□ Mismos márgenes/paddings en todas las pantallas  
□ Animaciones suaves, sin flickers  
□ Colores paleta tierra consistentes  
□ Recorrido de demo: Home → Planner → Calendar → Tasks  
□ Mostrar interacción entre roles  
□ No mostrar código, no explicar arquitectura, no mostrar bugs

**DONE cuando** ✔ App lista para mostrar ✔ Flujo de demo ensayado ✔ Sin bugs visuales obvios

---

## **7\. PLAN DÍA POR DÍA**

### **DÍA 1 — Backend Foundation**

Mañana (4h):  
□ H-001 Register \+ JWT               → Compañero 1  
□ H-004 Create Household             → Compañero 1

Tarde (4h):  
□ H-003 RLS                          → Compañero 1  
□ H-010 Tasks Table                  → Compañero 1  
□ H-008 Members CRUD                 → Compañero 1  
**Gabriel este día:** No escribe código. Prepara diseños para H-002 y H-007.  
**Compañero 2 este día:** Se familiariza con el proyecto, lee diseños del Home.

**Compañero 3 este día:** No tiene tareas todavía. Se familiariza con el proyecto.

---

### **DÍA 2 — Backend Core (Planner)**

Mañana (4h):  
□ H-011 Tasks CRUD                   → Compañero 1  
□ H-005 Invitations                  → Compañero 1

Tarde (4h):  
□ H-018 Events Table \+ CRUD          → Compañero 1  
□ H-019 Recurrence                   → Compañero 1  
**Gabriel este día:** Sigue preparando diseños para H-020 (Calendar) y H-022 (Home).  
**Compañero 2 este día:** Lee los diseños de Planner. Se prepara para armar las pantallas.

**Compañero 3 este día:** Lee UX Writing Guide. Se familiariza con el tono de Geni.

---

### **DÍA 3 — Frontend Auth \+ Backend Extras**

Mañana (4h):  
□ H-002 Login/Register Screens       → Gabriel (diseña) \+ Compañero 2 (implementa)  
□ H-006 Invitation Screens           → Gabriel (diseña) \+ Compañero 2 (implementa)  
□ H-007 Onboarding (iniciar)         → Gabriel (diseña flujos)

Tarde (4h):  
□ H-007 Onboarding (completar)       → Gabriel \+ Compañero 2  
□ H-015 Comments (backend)           → Compañero 1  
□ H-017 Streaks (backend)            → Compañero 1

**Compañero 1 este día:** Code review de H-018 y H-019 (si no lo hizo el día anterior). Luego H-015 y H-017.

---

### **DÍA 4 — Frontend Planner**

Mañana (4h):  
□ H-013 Tasks UI                     → Compañero 2  
□ H-012 Templates                    → Compañero 2

Tarde (4h):  
□ H-020 Calendar                     → Gabriel (arquitectura) \+ Compañero 2 (vistas)  
□ H-021 Events UI                    → Compañero 2  
□ H-014 Verification UI              → Compañero 2  
**Gabriel este día:** Define la arquitectura del Calendar. Revisa H-013 (Tasks UI).

**Compañero 1 este día:** Termina H-016 (Attachments backend). Revisa lo que necesite el equipo.

---

### **DÍA 5 — Frontend Home \+ Navegación**

Mañana (4h):  
□ H-022 Home (real data)             → Gabriel  
□ H-023 Home (mock)                  → Gabriel (cards) \+ Compañero 3 (datos dummy)

Tarde (4h):  
□ H-024 Home States                  → Gabriel  
□ H-025 Bottom Nav                   → Gabriel  
□ H-026 Empty States                 → Gabriel (textos) \+ Compañero 3 (pantallas)  
**Compañero 3 este día:** PRIMER DÍA DE TRABAJO REAL. Genera datos mock para Home y arma empty states.  
**Compañero 2 este día:** Termina H-015 UI (comentarios), H-016 UI (adjuntos), H-009 (Members UI), H-017 UI (streaks).

**Compañero 1 este día:** Code review. Revisa H-027 (seed endpoint de Compañero 3).

---

### **DÍA 6 — Integración**

Mañana (4h):  
□ Conectar frontend ↔ backend        → Gabriel (integra todo)  
□ Terminar issues pendientes         → Compañero 2 (lo que faltó de Planner UI)  
□ H-027 Seed Data                    → Compañero 3

Tarde (4h):  
□ Testing integración                → Todo el equipo  
□ Corrección de bugs                 → Gabriel \+ Compañero 1 (bugs difíciles), Compañero 2 (bugs de sus pantallas)  
**Gabriel este día:** Conecta todo: pantallas de Compañero 2 con endpoints de Compañero 1\.  
**Compañero 1:** Revisa el endpoint de Seed Data de Compañero 3\. Ayuda con bugs de backend.

**Compañero 3:** Termina y prueba el seed data.

---

### **DÍA 7 — Demo**

Mañana (3h):  
□ H-028 Smoke Test                   → Compañero 3  
□ Corrección de bugs críticos        → Gabriel \+ Compañero 1

Tarde (3h):  
□ H-029 Polish                       → Gabriel  
□ Ensayar presentación               → Gabriel  
□ ENTREGA  
**Compañero 3 este día:** SU MOMENTO. Recorre toda la app con el checklist y reporta TODO.

**Gabriel y Compañero 1:** Corrigen solo lo crítico.

---

## **8\. RESUMEN POR PERSONA**

### **🎨 Gabriel — PM \+ Frontend Lead \+ UX**

**Qué hace (10 issues como owner):**

* Diseña y supervisa Login, Register, Invitaciones (H-002, H-006)  
* Diseña los 5 flujos de Onboarding (H-007)  
* Define la arquitectura del Calendar (H-020)  
* Construye el Home completo (H-022, H-023, H-024)  
* Arma la navegación (H-025)  
* Define empty states (H-026)  
* Integra todo (Día 6\) y presenta (H-029)

**Qué revisa:** H-009, H-013, H-021 (consistencia visual)

**Qué NO hace:** Backend, base de datos, CRUD

---

### **🔧 Compañero 1 — Backend Lead \+ Seguridad**

**Qué hace (11 issues como owner):**

* Auth: H-001 (Register), H-003 (RLS), H-004 (Household), H-005 (Invitations)  
* Members: H-008 (CRUD)  
* Tasks backend: H-010 (Tabla), H-011 (CRUD), H-015 backend, H-016 backend, H-017 backend  
* Events backend: H-018 (Tabla \+ CRUD), H-019 (Recurrence)

**Qué revisa:** H-027 (Seed Data — seguridad)

**Qué NO hace:** Frontend, diseño de pantallas, demo

---

### **🧩 Compañero 2 — Frontend Planner \+ UI funcional**

**Qué hace (9 issues como owner de frontend):**

* Auth UI: H-002, H-006, H-007 (implementa bajo supervisión de Gabriel)  
* Planner UI: H-009 (Members), H-012 (Templates), H-013 (Tasks), H-014 (Verification), H-015 UI, H-016 UI, H-017 UI, H-020 (implementa vistas), H-021 (Events)  
* Ayuda a Gabriel con Login, Invitaciones, Onboarding y Calendar

**Qué NO hace:** Backend, endpoints, base de datos, seguridad

**Quién revisa su código:** Gabriel (visual/UX), Compañero 1 (code review de bugs)

---

### **📋 Compañero 3 — Content Owner \+ Demo \+ UX Texts**

**Qué hace (3 issues como owner):**

* H-027 (Seed Data para demo) ← SU MOMENTO PRINCIPAL  
* H-028 (Smoke Test completo) ← SU OTRO MOMENTO  
* Ayuda a Gabriel con: H-023 (mock data), H-026 (pantallas empty state)

**Qué NO hace:** Backend crítico, frontend complejo, decisiones de arquitectura

---

## **9\. RESUMEN GENERAL**

| Métrica | Valor |
| :---- | :---- |
| **Total Issues** | 29 |
| **Gabriel** | 10 owner |
| **Compañero 1** | 11 owner |
| **Compañero 2** | 9 owner (frontend) \+ implementación en 4 issues de Gabriel |
| **Compañero 3** | 3 owner |
| **Urgent** | 12 |
| **High** | 10 |
| **Medium** | 7 |
| **Estimación total** | \~60 horas |
| **Días** | 7 |

---

### **La lógica de esta distribución**

* **No es justa. Es estratégica.** Cada uno hace lo que mejor sabe hacer.  
* **Compañero 1 hace TODO el backend.** Auth, seguridad, base de datos, todos los endpoints. Nadie más toca el servidor.  
* **Compañero 2 hace TODO el frontend de Planner.** Todas las pantallas de tareas, eventos y calendario. Pero no toca backend.  
* **Gabriel no hace backend ni frontend repetitivo.** Diseña, supervisa, integra y presenta.  
* **Compañero 3 tiene poca carga pero ALTO IMPACTO.** Sus tareas son las que el profesor VA A VER.  
* **Las tareas compartidas (H-015, H-016, H-017) tienen dueño claro por capa:** backend \= Compañero 1, frontend \= Compañero 2\.

**El objetivo no es que todos trabajen igual. Es llegar al Día 7 con la app funcionando y lista para presentar.**

---

*Workspace diseñado para Linear. Cada Issue es auto-contenida. Las asignaciones están pensadas para maximizar las fortalezas de cada persona y minimizar los riesgos del proyecto.*

