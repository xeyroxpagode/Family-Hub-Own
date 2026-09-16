# **FRONTEND ALL EXTRACTIONS MASTER — HOMEPPLUS**

## **OBJETIVO DEL DOCUMENTO**

Este documento reúne todas las extracciones relevantes para diseñar y reimplementar el frontend premium de HomePlus.

Uso previsto:

* definir Design System HomePlus v1;  
* definir Navigation Shell;  
* definir Home UX final;  
* definir Planner UX final;  
* definir Auth / Onboarding / Household;  
* detectar contradicciones;  
* separar REAL, MOCK, DEMO PREMIUM, POST-MVP e IGNORAR;  
* generar prompts de implementación por fases para Antigravity/Codex.

---

# **ÍNDICE DE SOURCES**

## **BLOQUE A — FUNDACIÓN DE PRODUCTO Y FILOSOFÍA**

1. Producto  
2. Principios de producto  
3. Filosofía  
4. Emotional Design  
5. Relationship Philosophy  
6. UX Philosophy  
7. AI Philosophy / Geni  
8. Data / Information Philosophy  
9. UX Writing Guide para Geni

## **BLOQUE B — DESIGN SYSTEM Y PANTALLAS**

10. Design System  
11. Diseño de pantallas Auth  
12. Diseño de Onboarding  
13. Diseño de pantallas Home  
14. Eventos del sistema

## **BLOQUE C — SPECS TÉCNICAS Y CONTRATOS**

15. Final Spec  
16. API \+ Test Cases \+ Edge Cases  
17. Esquema de Base de Datos

---

# **SOURCE 01 — PRODUCTO**

## **Archivo recomendado**

`Seccion 1 Producto.txt`

## **Tipo de documento**

Producto / visión general

## **Uso para frontend**

Extraer:

* promesa principal de HomePlus;  
* tono general;  
* módulos importantes;  
* jerarquía de experiencia;  
* qué debe sentirse real en MVP;  
* qué puede quedar demo/mock;  
* frases o conceptos que afecten Home, onboarding y navegación.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_SECCION\_1\_PRODUCTO**

## **1\. Fuente**

* Documento principal: `HomePlus — SECCION 1 PRODUCTO.md`  
* Archivo de comprensión asociado disponible en el chat: `Seccion 1 Producto.txt`  
* Tipo de documento: Product Brain / documento de producto / comprensión estructurada asociada.  
* Alcance del documento: problema central, visión, misión, propuesta de valor, diferenciación, usuarios objetivo, Geni, principio de visibilidad, dominios oficiales, identidad LATAM, adopción, decisiones de producto y entidades/relaciones extraídas.  
* Nivel de utilidad frontend: **Medio / Alto conceptual**.  
* Motivo: aporta mucha información aplicable a experiencia, navegación global, módulos, Home, Planner, People, More, Quick Actions, roles, filosofía visual e integración entre dominios. No aporta diseño visual detallado, pantallas completas, formularios finales, contratos API ni estilos gráficos concretos.

## **2\. Utilidad frontend del documento**

Este documento sirve para definir cómo debe sentirse HomePlus en frontend:

* App familiar de coordinación, no herramienta genérica de productividad.  
* HomePlus debe reducir carga mental.  
* La UI debe hacer visible el esfuerzo invisible del hogar.  
* La app debe centralizar información dispersa: tareas, calendarios, documentos, finanzas, presencia, recuerdos.  
* Debe funcionar con un solo usuario activo desde el primer uso.  
* Debe escalar visualmente a familia completa sin volverse pesada.  
* La navegación debe priorizar frecuencia de uso.  
* Home es centro operativo y resumen.  
* Planner es núcleo operativo.  
* People concentra coordinación humana.  
* More agrupa herramientas especializadas.  
* Quick Actions es el acceso rápido global.  
* Geni existe como capa transversal, pero para MVP puede representarse visualmente o como demo/mock, no como IA real.  
* El tono de UI debe ser claro, humano, informativo y no acusatorio.

## **3\. Información de producto aplicable al frontend**

### **Principios aplicables**

| Principio encontrado | Aplicación frontend | Clasificación |
| ----- | ----- | ----- |
| Asimetría de coordinación | La UI debe mostrar pendientes, responsables y carga visible sin exigir memoria personal. | REAL MVP / GLOBAL |
| Fragmentación de herramientas | HomePlus debe sentirse como una app integrada, no como módulos aislados. | REAL MVP / GLOBAL |
| Hacer visible el esfuerzo invisible | Cards, listas y estados deben mostrar quién hace qué y qué está pendiente. | REAL MVP |
| Coordinar sin fricción | Acciones frecuentes deben estar a 1-2 taps. | REAL MVP |
| Distribuir sin conflicto | Mostrar datos con tono neutral, no punitivo. | REAL MVP |
| Proactividad por defecto | Alertas, vencimientos, próximos eventos y briefings pueden aparecer como cards o widgets. | REAL MVP / MOCK según feature |
| Transparencia radical con tono de reconocimiento | La UI debe informar hechos sin acusar. | REAL MVP |
| Ecosistema integrado | Home, Planner, People, More y Quick Actions deben conectarse visualmente. | REAL MVP |
| Construido para LATAM | Soportar familias extendidas, roles variados y coordinación cotidiana tipo WhatsApp reemplazado por sistema. | REAL MVP / DEMO PREMIUM |
| Valor desde minuto 1 | Empty states y pantallas iniciales deben ser útiles aunque haya un solo usuario. | REAL MVP |
| Valor individual para cada miembro | Cada usuario debe ver “lo suyo”: tareas, eventos, economía, presencia o recuerdos según módulo. | REAL MVP / DEMO PREMIUM |
| Home resume, no administra | Home debe llevar a los módulos que administran cada dato. | REAL MVP |
| No trasladar complejidad al usuario | Evitar configuración excesiva; resolver con diseño, defaults y automatización visual. | REAL MVP |

### **Sensación esperada**

* Profesional.  
* Familiar.  
* Clara.  
* No invasiva.  
* Proactiva.  
* Humana.  
* Confiable.  
* Centrada en coordinación.  
* Menos parecida a una lista fría de tareas y más a un centro operativo del hogar.  
* Diseñada para evitar “tener que pedir las cosas dos veces”.

## **4\. Navegación y arquitectura de pantallas**

### **Bottom Navigation**

Información explícita desde archivo de comprensión:

Home | People | \+ | Planner | More

Clasificación: **REAL MVP**

Uso frontend:

* `Home`: pantalla inicial y centro operativo.  
* `People`: coordinación humana, personas, presencia/feed según alcance.  
* `+`: Quick Actions global.  
* `Planner`: tareas, calendario y goals.  
* `More`: herramientas especializadas y settings.

### **Home**

* Siempre es la pantalla inicial.  
* El usuario no puede cambiarla.  
* Resume información.  
* No administra información.  
* Debe conducir al módulo que administra cada dato.

Clasificación: **REAL MVP**

### **Quick Actions**

* Botón central `+`.  
* Panel flotante.  
* Contiene Geni fijo.  
* Acciones dinámicas ordenadas por frecuencia y contexto.

Clasificación:

* Botón `+`: **REAL MVP**  
* Panel de acciones: **REAL MVP / DEMO PREMIUM según acción**  
* Geni fijo: **DEMO PREMIUM / MOCK**, no IA real.

### **Header**

* Contiene Avatar.  
* Contiene selector de hogar solo visible con 2+ hogares.

Clasificación:

* Avatar: **REAL MVP**  
* Selector de hogar: **POST\_MVP / REAL si ya existe hogar activo simple**  
* Multi-hogar avanzado: **POST\_MVP**

### **More**

* Contiene herramientas especializadas.  
* No es un descarte.  
* Módulos de menor frecuencia diaria viven ahí.  
* Incluye Finance, Inventory, FamilyCloud, Settings según archivo de comprensión.

Clasificación: **DEMO PREMIUM / REAL parcial para Settings/Profile si aplica**

### **Tiers de navegación**

* Tier 1 diario.  
* Tier 2 semanal.  
* Tier 3 ocasional.  
* Tier 0 siempre disponible.

Aplicación:

* Home, Planner, People y Quick Actions tienen alta visibilidad.  
* More agrupa herramientas menos frecuentes.  
* SOS puede ser acceso global si se toma desde otro documento, pero aquí solo aparece SOS Panel como pantalla.

## **5\. Pantallas detectadas**

| Pantalla/Componente | Objetivo | Qué muestra | Acciones | Navegación | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo del hogar | Resúmenes de dominios, Briefing, Tasks, Calendar, Presence, Finance, Feed según comprensión | Ir al módulo correspondiente | Pantalla inicial | REAL MVP \+ DEMO PREMIUM |
| Planner | Núcleo operativo | Tasks, Calendar, Goals | Administrar tareas/calendario/metas | Bottom Nav | REAL MVP para Tasks/Calendar, POST\_MVP para Goals |
| People | Coordinación humana | Feed, Presence, Personas | Ver personas/coordinación humana | Bottom Nav | REAL MVP parcial / DEMO PREMIUM |
| Quick Actions Panel | Acciones rápidas globales | Geni fijo \+ acciones dinámicas | Ejecutar acción rápida | Botón `+` central | REAL MVP / DEMO PREMIUM |
| More | Herramientas especializadas | Finance, Inventory, FamilyCloud, Settings | Abrir módulo | Bottom Nav | DEMO PREMIUM |
| Settings | Configuración hogar/cuenta/sistema/auditoría | Opciones de configuración | Ajustar settings si existe | Dentro de More | DEMO PREMIUM / REAL parcial |
| Geni Chat | Pantalla completa de Geni | Chat, acciones sugeridas, insights familiares, historial, configuración IA | Preguntar/usar sugerencias | Desde Quick Actions | DEMO PREMIUM / POST\_MVP |
| Task Detail | Detalle de tarea | Timeline de actividad automática \+ comentarios humanos | Ver actividad/comentarios | Desde Planner/Task | POST\_MVP |
| Event Detail | Detalle de evento | Participantes e información asociada | Ver detalle | Desde Calendar/Event | POST\_MVP o REAL parcial si otro documento lo define |
| Perfil individual | Vista de persona | Resumen, Tareas, Eventos, Goals, Presence, Actividad, Responsabilidades | Ver actividad/persona | Desde People/Members | DEMO PREMIUM / POST\_MVP |
| SOS Panel | Activación de emergencia | Tres niveles: emergencia grave, necesito ayuda, coordinación urgente | Activar alerta | Swipe ↑ global | DEMO PREMIUM / POST\_MVP |
| Web App de invitación | Puente de adopción | Tareas, eventos y responsabilidades sin instalar app | Ver contenido / descargar app | Link invitación | POST\_MVP |

## **6\. Componentes y patrones UI reutilizables**

### **Componentes explícitos o claramente presentes**

| Componente / patrón | Uso | Clasificación |
| ----- | ----- | ----- |
| Bottom Navigation | Navegación principal: Home, People, \+, Planner, More | REAL MVP |
| Botón central `+` | Quick Actions | REAL MVP |
| Panel flotante | Menú de Quick Actions | REAL MVP / DEMO PREMIUM |
| Header | Avatar \+ selector hogar | REAL MVP parcial |
| Avatar | Perfil personal | REAL MVP |
| Selector de hogar | Visible solo con 2+ hogares | POST\_MVP / REAL parcial si hogar activo |
| Cards de Home | Resumen de información | REAL MVP / DEMO PREMIUM |
| Widget Briefing | Primer widget de Home | MOCK / DEMO PREMIUM |
| Lista de tareas | Planner/Tasks | REAL MVP |
| Lista/calendario de eventos | Planner/Calendar | REAL MVP |
| Status pills / estados | Task, Event, Membership, Asset, Documento, Deuda, Fondo | REAL MVP / DEMO PREMIUM |
| Role pills | Coordinador, Adulto, Adolescente, Niño, Adulto Mayor, Invitado, Empleado Familiar | REAL MVP parcial |
| Responsabilidad como chip/label | Compras, Mascotas, Limpieza, Vehículos | REAL MVP para Planner |
| Cards de módulos en More | Finance, Inventory, FamilyCloud, Settings | DEMO PREMIUM |
| Activity items | Feed, actividad, auditoría o timeline | DEMO PREMIUM / POST\_MVP |
| Insights / sugerencias | Geni | MOCK / DEMO PREMIUM |
| Progress bars | Goals, fondos, presupuestos, recap | DEMO PREMIUM / POST\_MVP |
| Badges de alerta | Vencimientos, stock bajo, pagos próximos, conflictos | REAL MVP / MOCK según módulo |
| Estados manuales | Presence: No molestar, Descansando, etc. | DEMO PREMIUM |
| Niveles de SOS | 🔴 🟠 🟡 | DEMO PREMIUM / POST\_MVP |

### **Estados visuales mencionados por entidades**

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.  
* En progreso.  
* Completada.  
* Cancelada.  
* Programado.  
* Activo.  
* Archivado.  
* Inactivo.  
* En papelera.  
* Pagada.  
* Vencida.  
* Pausada.  
* Fallecida.  
* Cerrado.  
* Fallida.

## **7\. Visual design aplicable**

No se encontró diseño visual explícito detallado sobre:

* colores;  
* gradientes;  
* blur;  
* glassmorphism;  
* sombras;  
* radios;  
* tipografía;  
* iconografía final;  
* espaciado;  
* sistema de tokens;  
* estilo iOS específico;  
* tamaños de botones;  
* contraste.

Sí se encontró dirección visual/conceptual:

* Mobile First confirmado.  
* Tablet: 2 columnas.  
* Desktop: sidebar pendiente de confirmación final.  
* La UI debe ser clara y evitar fragmentación.  
* La app debe mostrar datos con tono de reconocimiento.  
* Geni nunca acusa, siempre informa.  
* Home debe resumir, no administrar.  
* La frecuencia de uso define visibilidad.  
* Las familias no piensan en módulos; piensan en su hogar como un todo.  
* GPS desaparece como nombre visible: todo se llama Presence.

Clasificación:

* Mobile First: **REAL MVP**  
* Tablet 2 columnas: **POST\_MVP / referencia**  
* Desktop sidebar: **POST\_MVP / pendiente**  
* Tono de reconocimiento: **REAL MVP**  
* Evitar módulos aislados: **REAL MVP**

## **8\. Home**

### **Rol de Home**

* Home es el centro operativo del hogar.  
* Home resume información.  
* Home no administra información.  
* Home siempre es la pantalla inicial.  
* Toda información mostrada en Home debe conducir al módulo que la administra.

Clasificación: **REAL MVP**

### **Información que Home puede mostrar según este documento**

| Elemento Home | Fuente conceptual | Clasificación |
| ----- | ----- | ----- |
| Briefing | Primer widget de Home; resume Planner, Finance, Presence, Goals, eventos y alertas | MOCK / DEMO PREMIUM |
| Tasks | Home referencia Tasks | REAL MVP |
| Calendar / Events | Home referencia Calendar | REAL MVP |
| Presence | Home referencia Presence | MOCK / DEMO PREMIUM |
| Finance | Home referencia Finance | DEMO PREMIUM / MOCK |
| Feed | Home referencia Feed | DEMO PREMIUM / MOCK |
| Goals | Briefing resume Goals | POST\_MVP / DEMO PREMIUM |
| Alertas | Geni genera alertas/sugerencias contextuales | MOCK / POST\_MVP |
| Vencimientos | Geni anticipa vencimientos de tareas, stock bajo, pagos próximos, mantenimientos | REAL para Tasks/Events; MOCK para otros módulos |
| Actividad familiar | Feed/Activity puede alimentar Home | DEMO PREMIUM / MOCK |
| Carga visible | Visibilidad de quién hace qué y distribución de carga | MOCK / DEMO PREMIUM si no hay cálculo real |

### **Regla Home**

Home resume información, no administra información.

Aplicación:

* Card de tareas → abre Planner.  
* Card de eventos → abre Calendar/Planner.  
* Card de miembros/presencia → abre People/Presence.  
* Card de Finance → abre Finance demo en More.  
* Briefing → puede abrir Geni demo o módulos relacionados.

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

| Dato | Aplicación frontend | Clasificación |
| ----- | ----- | ----- |
| Planner es núcleo operativo | Tab principal en Bottom Nav | REAL MVP |
| Administra Tasks, Calendar y Goals | Secciones internas o pantallas relacionadas | REAL MVP para Tasks/Calendar; POST\_MVP para Goals |
| Reduce carga mental | Mostrar pendientes, vencimientos, eventos claros | REAL MVP |
| Funciona con un usuario activo | Empty state útil y creación rápida | REAL MVP |
| Receptor ve sus tareas/eventos/metas | Filtros personales / vista “mis cosas” si se implementa | REAL MVP parcial |

### **Tasks**

Información encontrada:

* Representa trabajo pendiente o realizado.  
* Campos mencionados:  
  * título;  
  * descripción;  
  * responsable;  
  * fechas;  
  * prioridad;  
  * estado;  
  * responsabilidad asociada;  
  * goal;  
  * archivos;  
  * comentarios.  
* Estados:  
  * Pendiente;  
  * En progreso;  
  * Completada;  
  * Cancelada.  
* Vencida es calculada, no estado.  
* Puede tener subtareas.  
* Puede tener recurrencia.  
* Puede tener dependencias.  
* Puede tener verificación opcional.  
* Puede tener asignación/reasignación de responsables.  
* Responsabilidades son eje organizador interno.  
* Ejemplos de responsabilidades:  
  * Compras;  
  * Mascotas;  
  * Limpieza;  
  * Vehículos.

Clasificación:

| Elemento Task | Clasificación |
| ----- | ----- |
| Listar tareas | REAL MVP |
| Mostrar responsable | REAL MVP si hay miembros |
| Mostrar fecha | REAL MVP |
| Mostrar prioridad | REAL MVP si backend/UI lo soporta |
| Mostrar estado | REAL MVP |
| Completar tarea | REAL MVP |
| Vencida calculada | REAL MVP / UI calculada |
| Responsabilidad asociada | REAL MVP |
| Comentarios | POST\_MVP |
| Adjuntos/archivos | POST\_MVP |
| Subtareas | POST\_MVP salvo que otra fuente lo baje a MVP |
| Dependencias entre tareas | POST\_MVP |
| Recurrencia avanzada | POST\_MVP |
| Verificación | POST\_MVP o REAL solo si otra fuente lo define |
| Task Detail con timeline | POST\_MVP |
| Plantillas de tareas | DEMO PREMIUM / POST\_MVP si no hay detalle |

### **Calendar / Events**

Información encontrada:

* Calendar administra eventos familiares y personales.  
* Event tiene múltiples participantes.  
* Estados de Calendar/Event:  
  * Programado;  
  * Completado;  
  * Cancelado.  
* Event puede referenciar Persona.  
* Event puede generar Notificación.  
* Home referencia Calendar.  
* Calendar puede disparar álbum automático en FamilyCloud.  
* Adulto Mayor prioriza personas, eventos, medicación y recordatorios.

Clasificación:

| Elemento Calendar/Event | Clasificación |
| ----- | ----- |
| Listar eventos | REAL MVP |
| Crear evento | REAL MVP si otro documento lo confirma; aquí aparece como capacidad de roles Adulto/Adolescente |
| Mostrar estado Programado/Completado/Cancelado | REAL MVP |
| Mostrar participantes | REAL MVP simple / POST\_MVP avanzado |
| Event Detail | POST\_MVP o REAL parcial |
| Notificaciones reales de evento | POST\_MVP |
| Álbum automático desde Calendar | POST\_MVP |
| Conflictos de horarios anticipados por Geni | MOCK / POST\_MVP |
| Vista día/semana/mes | No se encontró información específica en este documento |
| Tareas con fecha dentro de calendario | No se encontró información específica en este documento |

### **Goals**

Información encontrada:

* Goals forma parte de Planner.  
* Objetivos personales o familiares.  
* Estructura: Goal → Hitos → Tasks.  
* Estados:  
  * Activa;  
  * Completada;  
  * Fallida.  
* Integración con Finance para metas financieras.  
* Goal referencia Task.  
* Goal referencia Fondo.

Clasificación:

* Goals visual demo: **DEMO PREMIUM**  
* Goals backend real: **POST\_MVP**  
* Hitos/Milestones: **POST\_MVP**  
* Integración Finance/Goals: **POST\_MVP**

## **10\. People / Members / Roles**

### **People**

* Dominio de coordinación humana.  
* Contiene Feed, Presence y Personas.  
* People está en Bottom Navigation.  
* Persona es entidad transversal.  
* Persona pertenece a Cuenta.  
* Persona puede participar en múltiples hogares mediante membresías independientes.  
* Datos de Persona:  
  * nombre;  
  * apellido;  
  * foto;  
  * fecha de nacimiento;  
  * género;  
  * contacto.

Clasificación:

* Lista básica de miembros/personas: **REAL MVP parcial**  
* Presence completo: **DEMO PREMIUM / POST\_MVP**  
* Feed completo: **DEMO PREMIUM / POST\_MVP**

### **Membership**

* Membresía relaciona Persona y Hogar.  
* Estados:  
  * Pendiente;  
  * Activa;  
  * Suspendida;  
  * Finalizada.  
* Posee un único rol activo.

Clasificación: **REAL MVP para members/invitations si implementado**

### **Roles oficiales encontrados**

| Rol | Descripción encontrada | Aplicación UI | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Responsable administrativo principal del hogar; puede aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación; no puede eliminar hogares | Role pill, permisos de botones administrativos | REAL MVP parcial |
| Adulto | Miembro operativo con amplios permisos; puede invitar, crear/reasignar tareas, crear eventos; no puede aprobar ingresos | Role pill, botones de crear/invitar según alcance | REAL MVP parcial |
| Adolescente | Autonomía progresiva; puede crear eventos familiares, gastos, administrar tareas propias; permisos adicionales configurables | Role pill, UI simplificada/limitada | REAL MVP parcial / POST\_MVP permisos finos |
| Niño | Experiencia simplificada; no administra información familiar crítica | Role pill, UI simplificada | DEMO PREMIUM / POST\_MVP |
| Adulto Mayor | Experiencia adaptada; Home prioriza personas, eventos, recordatorios, medicación; permisos equivalentes a Adulto | Role pill, accesibilidad/prioridad de contenido | DEMO PREMIUM / POST\_MVP |
| Invitado | Acceso mínimo, participación limitada | Role pill, UI limitada | REAL MVP parcial / DEMO |
| Empleado Familiar | Colaborador operativo; no núcleo familiar; acceso restringido a responsabilidades asignadas | Role pill si aparece | POST\_MVP |

### **Perfil individual**

Pantalla detectada:

* Resumen.  
* Tareas.  
* Eventos.  
* Goals.  
* Presence.  
* Actividad.  
* Responsabilidades.

Clasificación: **DEMO PREMIUM / POST\_MVP**

## **11\. Household / Invitations / Onboarding**

### **Household**

Información encontrada:

* Hogar es unidad organizativa principal.  
* Todo ocurre dentro de un hogar.  
* En multi-hogar cada hogar tiene su propio Home, Planner, Finance, etc.  
* Una persona puede pertenecer a múltiples hogares con roles independientes.

Clasificación:

* Hogar como filtro de datos: **REAL MVP**  
* Multi-hogar avanzado: **POST\_MVP**  
* Selector de hogar con 2+ hogares: **POST\_MVP / REAL parcial si ya está**

### **Invitations / adopción**

Información encontrada:

* Etapa 2: invitación con fricción mínima.  
* El Coordinador invita a la familia.  
* El onboarding de cada nuevo miembro está optimizado para mostrar valor individual en los primeros 60 segundos.  
* Cada persona ve lo que le importa a ella.  
* Planner: ve sus propias tareas, eventos y metas.  
* Finance: accede a sus gastos y economía que le concierne.  
* HomeCloud: encuentra recuerdos/documentos que le afectan.  
* Presence: configura disponibilidad y ve la de otros según permisos.  
* Web app como puente de adopción post-MVP: link de invitación abre web app instantánea sin instalar.

Clasificación:

| Elemento | Clasificación |
| ----- | ----- |
| Invitar familia | REAL MVP conceptual |
| Onboarding con valor individual | REAL MVP |
| Usuario ve sus propias tareas/eventos/metas | REAL MVP / POST\_MVP para metas |
| Web app de invitación | POST\_MVP |
| Miembros fantasma | POST\_MVP |
| Pending approval | No se encontró información específica en este documento |
| Aprobar/rechazar miembros | Permiso de Coordinador detectado; flujo UI no definido |
| Link/código/token | Solo link web app post-MVP; no contrato MVP |

## **12\. More / Settings / Profile**

### **More**

Información encontrada:

* More es sección de herramientas especializadas.  
* Contiene:  
  * Finance;  
  * Inventory;  
  * FamilyCloud;  
  * Settings.  
* No es un descarte.  
* Contiene módulos de menor frecuencia diaria.

Clasificación: **DEMO PREMIUM**

### **Settings**

Información encontrada:

* Settings vive exclusivamente en More.  
* Estructura:  
  * Hogar;  
  * Cuenta;  
  * Sistema;  
  * Auditoría.

Clasificación:

* Settings visual: **DEMO PREMIUM**  
* Settings real básico: **REAL MVP parcial si ya existe perfil/hogar**  
* Auditoría completa: **POST\_MVP**

### **Profile**

Información encontrada:

* Header contiene Avatar de perfil personal.  
* Cuenta pertenece al usuario, no al hogar.  
* Cuenta incluye perfil, preferencias, idioma, configuración personal, memoria personal de Geni.

Clasificación:

* Avatar/perfil básico: **REAL MVP**  
* Preferencias/configuración avanzada: **DEMO PREMIUM / POST\_MVP**  
* Memoria personal de Geni: **POST\_MVP**

## **13\. Quick Actions**

Información encontrada:

* Botón central `+` en Bottom Nav.  
* Panel flotante.  
* Geni fijo.  
* Acciones dinámicas ordenadas por frecuencia y contexto.  
* Geni Chat accesible desde Quick Actions.  
* Geni Chat contiene:  
  * Chat;  
  * Acciones sugeridas;  
  * Insights familiares;  
  * Historial;  
  * Configuración IA.

### **Acciones relacionadas detectadas o derivadas de módulos**

| Acción | Fuente | Clasificación |
| ----- | ----- | ----- |
| Abrir Geni Chat | Geni Chat desde Quick Actions | DEMO PREMIUM / POST\_MVP |
| Consultar Geni | Capacidades oficiales de Geni | MOCK / POST\_MVP |
| Ver acciones sugeridas | Geni Chat | DEMO PREMIUM |
| Crear/sugerir automatización | Geni / Automatizaciones | POST\_MVP |
| Crear tarea | No aparece explícitamente en Quick Actions; Adulto puede crear/reasignar tareas | REAL MVP si otra fuente lo define |
| Crear evento | Adulto/Adolescente pueden crear eventos | REAL MVP si otra fuente lo define |
| Agregar gasto | Finance/Gastos | DEMO PREMIUM |
| Agregar item | Inventory/Consumibles | DEMO PREMIUM |
| Check-in | Presence/Check-ins | DEMO PREMIUM |
| SOS | SOS Panel global vía swipe ↑, no Quick Actions explícito | DEMO PREMIUM / POST\_MVP |
| Subir documento | FamilyCloud/Documentos | DEMO PREMIUM / POST\_MVP |

## **14\. Módulos demo premium**

### **Finance**

Información encontrada:

* Dominio de economía personal y familiar.  
* Cuentas: Efectivo, Mercado Pago, Banco, Tarjeta.  
* Gastos: Personal, Familiar.  
* Ingresos: Sueldo, Regalo, Venta, Reembolso.  
* Fondos: Activo, Completado, Cerrado.  
* Presupuestos: límites de gasto, alertas/recomendaciones.  
* Deudas: Persona↔Persona, Persona↔Familia, Familia↔Externo; estados Activa, Pagada, Vencida.  
* Finance vive en More.  
* Home puede referenciar Finance.  
* Briefing puede resumir Finance.

Clasificación:

* Visual demo: **DEMO PREMIUM**  
* Backend real completo: **POST\_MVP**  
* Alertas financieras reales: **POST\_MVP**  
* Cards de resumen en Home: **MOCK / DEMO PREMIUM**

### **Inventory**

Información encontrada:

* Consumibles y stock del hogar.  
* Consumibles: leche, arroz, aceite.  
* Productos del hogar: shampoo, jabón, papel higiénico, detergente.  
* Medicamentos: nombre, stock, vencimiento, observaciones.  
* Stock mínimo.  
* Alertas de vencimiento y reposición.  
* InventoryItem puede referenciar Planner y Finance.  
* InventoryItem puede generar Notificación.

Clasificación:

* Visual demo: **DEMO PREMIUM**  
* Stock real completo: **POST\_MVP**  
* Alertas reales: **POST\_MVP**  
* Relación con tareas: **POST\_MVP / demo visual**

### **Assets**

Información encontrada:

* Activos importantes: vehículos, mascotas, dispositivos, propiedades.  
* Vehículos: marca, modelo, año, patente; documentación: seguro, cédula, título, VTV.  
* Mascotas: nombre, especie, raza, fecha nacimiento, veterinario, vacunas; estados Activa, Fallecida, Archivada.  
* Dispositivos: notebook, PC, tablet, celular, consola.  
* Propiedades: casa, departamento, terreno.  
* Mantenimiento integrado con Planner para generar tareas automáticamente.  
* Asset puede referenciar Persona, Finance, Planner, FamilyCloud, Mantenimiento.  
* Asset puede generar Notificación.

Clasificación:

* Visual demo: **DEMO PREMIUM**  
* Mantenimiento real: **POST\_MVP**  
* Generar tareas automáticamente: **POST\_MVP**  
* Documentación real/storage: **POST\_MVP**

### **FamilyCloud / HomeCloud**

Información encontrada:

* Memoria documental y emocional.  
* Recuerdos: fotos, videos, texto.  
* Álbumes: vacaciones, cumpleaños, navidad.  
* Documentos: PDF, imagen, documento escaneado.  
* Papelera: retención 30 días.  
* Documentos soportan versionado, comentarios y permisos.  
* OCR preparado, no activo en V1.  
* Reconocimiento facial V2 opcional.  
* Álbum automático desde Calendar.  
* Recap anual pendiente.  
* Línea temporal familiar pendiente.

Clasificación:

* Visual demo: **DEMO PREMIUM**  
* Storage real avanzado: **POST\_MVP**  
* OCR: **POST\_MVP**  
* Reconocimiento facial: **POST\_MVP**  
* Álbum automático: **POST\_MVP**

### **Presence**

Información encontrada:

* Ubicación, disponibilidad y coordinación de movimientos.  
* GPS desaparece como nombre visible; todo se llama Presence.  
* Estados automáticos y manuales.  
* Manuales: No molestar, Descansando, etc.  
* Lugares: Casa, Escuela, Trabajo, Club.  
* Geocercas generan eventos Llegó/Salió.  
* Check-ins son confirmaciones manuales.  
* Presence puede aparecer en Home.  
* Adulto Mayor prioriza eventos, medicación y recordatorios.  
* Historial Presence con retención de 30 días.

Clasificación:

* Presence visual: **DEMO PREMIUM**  
* Estados manuales mock: **MOCK / DEMO PREMIUM**  
* GPS real: **POST\_MVP**  
* Geofencing: **POST\_MVP**  
* Historial real: **POST\_MVP**

### **Geni**

Información encontrada:

* Capa de inteligencia transversal.  
* No es un módulo aislado.  
* No tiene tab dedicado.  
* Opera sobre dominios autorizados.  
* Genera briefings personalizados.  
* Recomienda acciones.  
* Crea/sugiere automatizaciones.  
* Responde preguntas sobre el hogar.  
* Geni Search busca en dominios autorizados.  
* Geni Chat accesible desde Quick Actions.  
* Geni presenta datos con contexto y tono de reconocimiento.  
* “Nunca acusa, siempre informa.”

Clasificación:

* Geni visual/chat mock: **DEMO PREMIUM**  
* Briefing mock: **MOCK**  
* IA real: **POST\_MVP**  
* Búsqueda global real: **POST\_MVP**  
* Automatizaciones reales: **POST\_MVP**

### **Feed**

Información encontrada:

* Feed dentro de People.  
* Todo es un Post.  
* Admite comentarios, reacciones, publicaciones automáticas de Geni.  
* Home puede referenciar Feed.

Clasificación:

* Feed visual/activity mock: **DEMO PREMIUM**  
* Feed real completo: **POST\_MVP**  
* Comentarios/reacciones reales: **POST\_MVP**

### **SOS**

Información encontrada:

* Sistema de emergencias.  
* SOS Silencioso.  
* SOS Panel accesible vía swipe ↑ global.  
* Tres niveles:  
  * 🔴 Emergencia grave;  
  * 🟠 Necesito ayuda;  
  * 🟡 Coordinación urgente.  
* SOS usa Presence y notifica Persona.

Clasificación:

* SOS visual demo: **DEMO PREMIUM**  
* Emergencia real/notificaciones reales: **POST\_MVP**  
* Ubicación real: **POST\_MVP**

### **Automations**

Información encontrada:

* Modelo SI ocurre X → ENTONCES hacer Y.  
* Biblioteca de automatizaciones prearmadas.  
* Geni crea/sugiere automatizaciones.  
* Automatización tiene trigger, condiciones, acciones, estado y auditoría.  
* Estados: Activa, Pausada, Archivada.

Clasificación:

* Visual demo: **DEMO PREMIUM**  
* Motor real: **POST\_MVP**

### **Notifications**

Información encontrada:

* Sistema de notificaciones con categorías y prioridades.  
* Canales: Push, Email, In-App.  
* SOS no puede silenciarse.  
* Geni genera Notificación.  
* Presupuestos, Deudas, InventoryItem, Asset, SOS, Event pueden generar Notificación.

Clasificación:

* In-app visual/mock: **DEMO PREMIUM**  
* Push/email real: **POST\_MVP**

### **Search**

Información encontrada:

* Geni Search busca globalmente en dominios autorizados.  
* Indexa Personas, Tasks, Events, Goals, Gastos, Documentos, Settings.  
* Ejecuta acciones directamente.

Clasificación:

* Search visual demo: **DEMO PREMIUM**  
* Búsqueda real multi-dominio: **POST\_MVP**

## **15\. Estados UX y feedback**

### **Estados explícitos detectados**

| Entidad | Estados | Clasificación |
| ----- | ----- | ----- |
| Membresía | Pendiente, Activa, Suspendida, Finalizada | REAL MVP |
| Task | Pendiente, En progreso, Completada, Cancelada | REAL MVP / revisar con spec final |
| Task vencida | Vencida es calculada, no estado | REAL MVP |
| Calendar/Event | Programado, Completado, Cancelado | REAL MVP |
| Goal | Activa, Completada, Fallida | POST\_MVP / DEMO |
| Fondo | Activo, Completado, Cerrado | DEMO PREMIUM |
| Deuda | Activa, Pagada, Vencida | DEMO PREMIUM |
| InventoryItem | Activo, Archivado | DEMO PREMIUM |
| Asset | Activo, Inactivo, Archivado | DEMO PREMIUM |
| Mascota | Activa, Fallecida, Archivada | DEMO PREMIUM |
| Documento | Activo, Archivado, En papelera | DEMO PREMIUM |
| Automatización | Activa, Pausada, Archivada | DEMO PREMIUM / POST\_MVP |
| Presence manual | No molestar, Descansando | DEMO PREMIUM |

### **Estados UX no encontrados específicamente**

No se encontró información específica sobre:

* loading;  
* skeleton;  
* refreshing;  
* toast;  
* success;  
* error;  
* retry;  
* optimistic update;  
* disabled state;  
* empty state copy;  
* error de red;  
* forbidden;  
* expired;  
* approved/rejected visual;  
* realtime update visual.

## **16\. Formularios y datos de entrada**

### **Formularios explícitamente no definidos**

No se encontró contrato visual o campos específicos para:

* login;  
* register;  
* forgot password;  
* create household;  
* invite member;  
* join household;  
* profile edit;  
* create task;  
* edit task;  
* create event;  
* edit event;  
* settings;  
* formularios demo de módulos secundarios.

### **Datos de entrada mencionados como campos de entidades**

| Formulario potencial | Campos mencionados | Clasificación |
| ----- | ----- | ----- |
| Perfil / Persona | nombre, apellido, foto, fecha de nacimiento, género, contacto | REAL MVP parcial |
| Task | título, descripción, responsable, fechas, prioridad, estado, responsabilidad asociada, goal, archivos, comentarios | REAL MVP para básicos; POST\_MVP para archivos/comentarios/goal |
| Event | participantes/personas, estado | REAL MVP parcial; faltan fecha/hora |
| Inventory item | nombre, categoría, cantidad, unidad, stock mínimo | DEMO PREMIUM |
| Medicamento | nombre, stock, vencimiento, observaciones | DEMO PREMIUM |
| Vehículo | marca, modelo, año, patente, seguro, cédula, título, VTV | DEMO PREMIUM |
| Mascota | nombre, especie, raza, fecha nacimiento, veterinario, vacunas | DEMO PREMIUM |
| Propiedad | dirección, documentación, observaciones | DEMO PREMIUM |
| Gasto | monto, fecha, cuenta, categoría, responsable | DEMO PREMIUM |
| Automatización | trigger, condiciones, acciones, estado | POST\_MVP |
| Auditoría | autor, fecha, hora, acción, entidad afectada | POST\_MVP |

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Módulo | Uso posible | Clasificación |
| ----- | ----- | ----- | ----- |
| WhatsApp, Google Calendar, Notion, Splitwise, hojas de cálculo | Producto / comparación | Copy contextual o onboarding | CONTEXTO |
| Compras | Planner / Responsabilidades | Chip/categoría/task group | REAL MVP |
| Mascotas | Planner / Responsabilidades / Assets | Chip/categoría/demo asset | REAL MVP / DEMO |
| Limpieza | Planner / Responsabilidades | Chip/categoría/task group | REAL MVP |
| Vehículos | Planner/Assets | Chip/categoría/demo asset | DEMO PREMIUM |
| Efectivo | Finance | Cuenta demo | DEMO PREMIUM |
| Mercado Pago | Finance | Cuenta demo LATAM | DEMO PREMIUM |
| Banco | Finance | Cuenta demo | DEMO PREMIUM |
| Tarjeta | Finance | Cuenta demo | DEMO PREMIUM |
| Sueldo | Finance | Tipo ingreso demo | DEMO PREMIUM |
| Regalo | Finance | Tipo ingreso demo | DEMO PREMIUM |
| Venta | Finance | Tipo ingreso demo | DEMO PREMIUM |
| Reembolso | Finance | Tipo ingreso demo | DEMO PREMIUM |
| Leche | Inventory | Item demo | DEMO PREMIUM |
| Arroz | Inventory | Item demo | DEMO PREMIUM |
| Aceite | Inventory | Item demo | DEMO PREMIUM |
| Shampoo | Inventory | Producto demo | DEMO PREMIUM |
| Jabón | Inventory | Producto demo | DEMO PREMIUM |
| Papel higiénico | Inventory | Producto demo | DEMO PREMIUM |
| Detergente | Inventory | Producto demo | DEMO PREMIUM |
| Casa | Presence / Propiedades | Lugar o propiedad demo | DEMO PREMIUM |
| Escuela | Presence | Lugar demo | DEMO PREMIUM |
| Trabajo | Presence | Lugar demo | DEMO PREMIUM |
| Club | Presence | Lugar demo | DEMO PREMIUM |
| Vacaciones | FamilyCloud | Álbum demo | DEMO PREMIUM |
| Cumpleaños | FamilyCloud | Álbum demo | DEMO PREMIUM |
| Navidad | FamilyCloud | Álbum demo | DEMO PREMIUM |
| Emergencia grave | SOS | Nivel SOS | DEMO PREMIUM |
| Necesito ayuda | SOS | Nivel SOS | DEMO PREMIUM |
| Coordinación urgente | SOS | Nivel SOS | DEMO PREMIUM |
| No molestar | Presence | Estado manual | DEMO PREMIUM |
| Descansando | Presence | Estado manual | DEMO PREMIUM |
| Coordinador | Roles | Role pill | REAL MVP |
| Adulto | Roles | Role pill | REAL MVP |
| Adolescente | Roles | Role pill | REAL MVP |
| Niño | Roles | Role pill | DEMO / POST\_MVP |
| Adulto Mayor | Roles | Role pill | DEMO / POST\_MVP |
| Invitado | Roles | Role pill | REAL MVP parcial |
| Empleado Familiar | Roles | Role pill | POST\_MVP |
| “Antes de que tengas que explotar” | Copy producto | Onboarding/marketing interno | CONTEXTO |
| “HomePlus muestra la verdad del hogar. Geni decide cómo contarla.” | Copy producto | Dirección de tono Geni/Home | DEMO PREMIUM |
| “Geni es el sistema nervioso del hogar.” | Copy producto | Geni demo | DEMO PREMIUM |

## **18\. Servicios frontend / APIs / datos**

### **APIs**

No se encontró contrato API explícito en este documento.

No se encontraron:

* endpoints;  
* métodos HTTP;  
* request;  
* response;  
* errores;  
* paginación;  
* contrato Supabase;  
* rutas de backend;  
* tokens;  
* refresh;  
* storage;  
* realtime API.

### **Services inferibles desde entidades, sin inventar implementación**

Este documento permite identificar fuentes/dominios para services futuros, pero no define nombres ni contratos:

| Service potencial | Datos/acciones conceptuales | Estado |
| ----- | ----- | ----- |
| Home data | Briefing, Tasks, Calendar, Presence, Finance, Feed | Conceptual |
| Planner data | Tasks, Calendar, Goals, Responsabilidades | Conceptual |
| People data | Personas, Membresía, Roles | Conceptual |
| Finance data | Cuentas, Gastos, Ingresos, Fondos, Presupuestos, Deudas | Conceptual / demo |
| Inventory data | Consumibles, productos, medicamentos | Conceptual / demo |
| Assets data | Vehículos, mascotas, dispositivos, propiedades, mantenimiento | Conceptual / demo |
| Presence data | Ubicación, estados, lugares, check-ins | Conceptual / demo |
| Geni data | Briefing, sugerencias, search, chat | Conceptual / mock |
| Settings data | Hogar, Cuenta, Sistema, Auditoría | Conceptual |

## **19\. Realtime / sincronización visible**

### **Información encontrada**

* Acciones importantes generan trazabilidad.  
* Las acciones que afectan al hogar deben ser visibles.  
* Auditoría registra cambios importantes.  
* Offline existe como feature: ver/completar tareas, ver eventos, personas, activos, stock.  
* Acciones offline quedan pendientes hasta reconexión.  
* Resolución: Last Write Wins.  
* Presence tiempo real no disponible offline.  
* Feed, SOS y Geni online no disponibles offline.

### **Clasificación**

| Elemento | Clasificación |
| ----- | ----- |
| Cambios visibles en hogar | REAL MVP conceptual |
| Realtime entre dispositivos | No se encontró información técnica específica |
| Auditoría visual completa | POST\_MVP |
| Offline sync | POST\_MVP |
| Last Write Wins | POST\_MVP |
| Completar tareas offline | POST\_MVP salvo que otra fuente lo exija |
| Ver eventos offline | POST\_MVP |

## **20\. Permisos visibles en UI**

### **Permisos explícitos**

| Rol | Puede hacer | No puede hacer | Aplicación UI | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Coordinador | Aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación | No puede eliminar hogares | Mostrar botones administrativos si rol Coordinador | REAL MVP parcial |
| Adulto | Invitar, crear/reasignar tareas, crear eventos | No puede aprobar ingresos | Mostrar crear tarea/evento/invitar si aplica | REAL MVP parcial |
| Adolescente | Crear eventos familiares, gastos, administrar tareas propias | Permisos adicionales configurables | UI de autonomía progresiva | REAL parcial / POST\_MVP permisos finos |
| Niño | Experiencia simplificada | No administra información familiar crítica | Ocultar acciones críticas | DEMO / POST\_MVP |
| Adulto Mayor | Permisos equivalentes a Adulto; experiencia adaptada | No especificado | Priorizar personas, eventos, recordatorios, medicación | DEMO / POST\_MVP |
| Invitado | Acceso mínimo, participación limitada | No especificado | UI limitada | REAL parcial / DEMO |
| Empleado Familiar | Acceso restringido a responsabilidades asignadas | No núcleo familiar | UI restringida por responsabilidad | POST\_MVP |

### **Reglas de privacidad/permisos**

* La privacidad individual tiene prioridad sobre conveniencia.  
* La información privada pertenece a quien la genera.  
* Coordinadores administran el hogar, no la vida privada de las personas.  
* Ningún rol obtiene acceso automático a memoria privada de Geni, metas privadas, documentos privados o finanzas personales.  
* Geni opera según permisos.

Clasificación: **REAL MVP conceptual / POST\_MVP para permisos finos**

## **21\. Integraciones visibles entre módulos**

| Relación | Uso frontend | Clasificación |
| ----- | ----- | ----- |
| Home → Tasks | Card/lista resumen de tareas | REAL MVP |
| Home → Calendar | Próximos eventos/resumen calendario | REAL MVP |
| Home → Briefing | Primer widget resumen | MOCK / DEMO PREMIUM |
| Home → Presence | Estado familiar/presencia | MOCK / DEMO PREMIUM |
| Home → Finance | Resumen financiero | DEMO PREMIUM |
| Home → Feed | Actividad familiar | DEMO PREMIUM |
| Planner → Tasks | Administración de tareas | REAL MVP |
| Planner → Calendar | Administración de eventos | REAL MVP |
| Planner → Goals | Metas | POST\_MVP / DEMO |
| Task → Persona | Responsable/asignado | REAL MVP |
| Event → Persona | Participantes | REAL MVP simple / POST\_MVP avanzado |
| Task → Responsabilidades | Agrupación visual | REAL MVP |
| InventoryItem → Planner | Generar/relacionar tareas | POST\_MVP / demo visual |
| Asset → Planner | Mantenimientos generan tareas | POST\_MVP / demo visual |
| Geni → Briefing | Genera resumen | MOCK / POST\_MVP |
| Geni → Automatización | Crea/sugiere automatizaciones | POST\_MVP |
| Geni Search → todos los dominios | Búsqueda global | POST\_MVP / DEMO PREMIUM |
| Calendar → FamilyCloud | Álbum automático desde evento | POST\_MVP |
| More → Finance/Inventory/FamilyCloud/Settings | Acceso a herramientas | DEMO PREMIUM |
| Quick Actions → Geni Chat | Abrir chat/acciones sugeridas | DEMO PREMIUM |
| Presence \+ Inventory → Compras Cerca | Sugerencia contextual | POST\_MVP |
| Household → Home/Planner/Finance | Datos filtrados por hogar | REAL MVP conceptual |

## **22\. Edge cases frontend**

### **Encontrados explícitamente o por entidades**

| Caso | Fuente | Clasificación |
| ----- | ----- | ----- |
| Coordinador invita y nadie se suma | Riesgo principal de adopción | REAL MVP UX |
| App debe dar valor con un solo usuario activo | Mitigación MVP | REAL MVP |
| Miembro nuevo debe ver valor en primeros 60 segundos | Adopción etapa 2 | REAL MVP |
| Multi-hogar con roles independientes | Identidad LATAM / entidades | POST\_MVP |
| Link de invitación abre web app sin instalar | Web app puente adopción | POST\_MVP |
| Tarea vencida calculada, no estado | Task | REAL MVP |
| Tarea dependiente bloqueada si tarea previa no completa | Dependencia entre tareas | POST\_MVP |
| Acciones offline pendientes hasta reconexión | Offline | POST\_MVP |
| Last Write Wins | Offline | POST\_MVP |
| Papelera retiene 30 días | FamilyCloud | DEMO / POST\_MVP |
| SOS no puede silenciarse | Notificaciones | POST\_MVP |
| V1 sin reconocimiento facial | Decisión | POST\_MVP |
| OCR preparado, no activo en V1 | FamilyCloud | POST\_MVP |
| Coordinador no puede eliminar hogares | Permiso rol | REAL MVP conceptual |
| Ningún rol accede automáticamente a datos privados | Privacidad | REAL MVP conceptual |

### **No encontrados en este documento**

* email ya registrado;  
* credenciales inválidas;  
* token inválido/expirado;  
* invitación expirada;  
* invitación ya usada;  
* usuario sin hogar;  
* usuario pendiente de aprobación;  
* permiso denegado visual;  
* último coordinador;  
* miembro suspendido visual;  
* tarea ya completada;  
* tarea no completada para verificar;  
* evento cancelado como edge visual;  
* conflicto de evento en UI;  
* responsabilidad sin miembros;  
* sin datos / empty state;  
* error de red;  
* soft delete frontend.

## **23\. Copywriting y labels**

### **Frases / labels encontrados**

| Texto | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Asimetría de coordinación | Nombre interno del problema | CONTEXTO |
| “Un mundo donde la vida familiar no se desgasta por cosas que podrían estar resueltas.” | Visión / onboarding | CONTEXTO |
| “Hacer visible el esfuerzo invisible del hogar…” | Misión / onboarding | CONTEXTO |
| “Antes de que tengas que explotar.” | Copy emocional | CONTEXTO |
| “Geni es el sistema nervioso del hogar.” | Geni demo | DEMO PREMIUM |
| “Geni es el único miembro del hogar que ve todo, recuerda todo y nunca explota.” | Geni demo / concepto | DEMO PREMIUM |
| “HomePlus muestra la verdad del hogar. Geni decide cómo contarla.” | Tono Geni/Home | DEMO PREMIUM |
| Home | Tab principal | REAL MVP |
| People | Tab principal | REAL MVP |
| Planner | Tab principal | REAL MVP |
| More | Tab principal | REAL MVP |
| Quick Actions | Botón `+` | REAL MVP |
| Coordinador | Rol | REAL MVP |
| Adulto | Rol | REAL MVP |
| Adolescente | Rol | REAL MVP |
| Niño | Rol | DEMO/POST\_MVP |
| Adulto Mayor | Rol | DEMO/POST\_MVP |
| Invitado | Rol | REAL MVP parcial |
| Empleado Familiar | Rol | POST\_MVP |
| Pendiente | Estado | REAL MVP |
| Activa | Estado | REAL MVP / DEMO |
| Suspendida | Estado | REAL MVP |
| Finalizada | Estado | REAL MVP |
| En progreso | Estado Task | Revisar con MVP |
| Completada | Estado | REAL MVP |
| Cancelada | Estado | REAL MVP |
| Programado | Estado Event | REAL MVP |
| Vencida | Estado calculado | REAL MVP |
| No molestar | Presence | DEMO PREMIUM |
| Descansando | Presence | DEMO PREMIUM |
| Emergencia grave | SOS | DEMO PREMIUM |
| Necesito ayuda | SOS | DEMO PREMIUM |
| Coordinación urgente | SOS | DEMO PREMIUM |

## **24\. Restricciones técnicas frontend**

### **Encontradas**

* Mobile First confirmado.  
* Tablet: 2 columnas.  
* Desktop: sidebar pendiente de confirmación final.  
* Home siempre es pantalla inicial.  
* Home no administra información.  
* Toda información de Home debe conducir al módulo que la administra.  
* Bottom Navigation V1 congelada: `Home | People | + | Planner | More`.  
* Geni no tiene tab dedicado.  
* Settings vive exclusivamente en More.  
* Presence es el nombre visible; no usar GPS como nombre visible.  
* Responsabilidades no son dominio independiente; son propiedad de Task.  
* Vencida es calculada, no estado de Task.  
* OCR preparado, no activo en V1.  
* Reconocimiento facial no en V1.  
* Web app de invitación post-MVP.  
* Offline usa Last Write Wins, pero offline sync queda fuera del MVP actual salvo definición posterior.  
* Auditoría nunca se elimina, pero auditoría completa es más técnica/post-MVP para frontend actual.

### **No encontradas**

* Stack técnico.  
* Expo / React Native.  
* Supabase.  
* Realtime.  
* Storage real.  
* Librerías disponibles.  
* Librerías ausentes.  
* Performance budgets.  
* Design tokens.  
* Sistema de iconos.  
* Breakpoints exactos.  
* Contratos de navegación reales.

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación futura |
| ----- | ----- | ----- |
| Roles oficiales | Documento menciona 7 roles, pero MVP del usuario suele limitar a 6 y Empleado Familiar queda fuera | Mantener Empleado Familiar como POST\_MVP salvo decisión contraria |
| Coordinador perfil vs rol | “Coordinador” psicográfico no es igual al rol técnico Coordinador | En UI/copy distinguir rol técnico de perfil de adopción |
| Planner simple vs Planner avanzado | Documento incluye Goals, subtareas, dependencias, comentarios, adjuntos, recurrencia | MVP debe limitarse a Tasks/Events/Calendar mínimos |
| Estados Task | Documento menciona Pendiente, En progreso, Completada, Cancelada; otros prompts pueden usar pending/completed/awaiting\_verification/verified | Resolver en merge final; no asumir aquí |
| Verificación de tareas | Archivo dice opcional y “no existe estado separado”; otros MVP pueden pedir awaiting\_verification | Marcar contradicción para merge |
| Geni | Producto lo trata como central, pero IA real no es viable en MVP rápido | Usar Geni mock/demo visual, no IA real |
| Home | Home puede parecer muy inteligente por Briefing/Geni | Separar cards reales de Tasks/Events/Members y widgets mock |
| Presence | Producto habla de ubicación y geocercas | Para MVP usar Presence demo/manual, no GPS real |
| Finance/Inventory/Assets | Tienen muchas entidades reales en producto | Para demo usar visual mock/local, no backend real |
| Multi-hogar | Producto lo presenta como real LATAM | Para MVP actual tratarlo como POST\_MVP salvo hogar activo simple |
| Offline | Comprensión incluye offline sync | No meter en MVP rápido salvo visual/no-op |
| Auditoría | Principio fuerte de transparencia | No implementar auditoría completa; usar actividad visual si conviene |
| More | Contiene módulos especializados, puede parecer enorme | Usar cards demo y navegación simple |
| Web app invitación | Aparece como solución de adopción | Mantener POST\_MVP |
| Diseño visual | No hay colores/tokens/layout final | Necesita otro fragment visual/Figma/UX |

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Pantallas completas | Codex necesita estructura visual | Requiere otro documento o decisiones de diseño |
| Layout Home | Home es central, pero no se define layout | Hay que diseñar cards y jerarquía en spec final |
| Layout Planner | No hay estructura visual de Planner | Requiere definición posterior |
| Formularios | No hay campos obligatorios ni errores | No se puede implementar UI exacta solo con este documento |
| API endpoints | No hay contratos | Requiere documento backend/API |
| Design tokens | No hay colores, radios, sombras, tipografía | Requiere design system o criterio visual posterior |
| Estados UX | Faltan loading/error/empty/success | Requiere fragment UX |
| Copy final | Hay frases de producto, no microcopy de pantallas | Requiere copy específico |
| Permisos finos | Hay reglas generales, no matriz completa | Requiere roles/permissions |
| Datos mock completos | Hay ejemplos sueltos, no dataset demo | Requiere mock\_data\_fragment |
| Navegación post-auth | No se define flujo login/register/home | Requiere auth/onboarding fragment |
| Invitaciones reales | Hay adopción conceptual, no flujo completo | Requiere household/invitations fragment |
| Realtime visible | Solo concepto de trazabilidad | Requiere implementación/servicios |
| Quick Actions exactas | Se define patrón, no lista final | Requiere fragment de navegación/actions |
| More visual | Se define contenido, no UI | Requiere fragment More/Settings |
| Home widgets | Se mencionan Briefing y referencias, no diseño | Requiere home frontend fragment |
| Calendar views | No define día/semana/mes | Requiere planner/calendar fragment |
| Verification flow | Contradicción/incompleto | Requiere merge con contrato MVP |
| Prioridades Task | Campo existe, valores no | Requiere definición posterior |

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Bajo/Medio | Hay tono, Mobile First y dirección conceptual, pero no tokens visuales |
| `navigation_fragment` | Sí | Alto | Bottom Nav, Quick Actions, More, Header, tiers de frecuencia |
| `home_frontend_fragment` | Sí | Medio | Home como centro operativo, Briefing, resumen y referencias a módulos |
| `planner_frontend_fragment` | Sí | Medio | Planner, Tasks, Calendar, Goals, Responsabilidades |
| `people_members_frontend_fragment` | Sí | Medio | People, Persona, Membresía, roles, perfil individual |
| `household_invites_frontend_fragment` | Parcial | Medio | Hogar, membresía, invitación conceptual, web app post-MVP |
| `auth_onboarding_frontend_fragment` | Parcial | Bajo/Medio | Valor desde minuto 1 y onboarding por adopción, pero no formularios |
| `quick_actions_frontend_fragment` | Sí | Medio/Alto | Botón `+`, panel flotante, Geni fijo, acciones dinámicas |
| `more_settings_frontend_fragment` | Sí | Medio | More y Settings están definidos conceptualmente |
| `finance_demo_fragment` | Sí | Medio | Entidades y ejemplos útiles para demo |
| `inventory_demo_fragment` | Sí | Medio | Items, productos, medicamentos, stock mínimo |
| `assets_demo_fragment` | Sí | Medio | Vehículos, mascotas, dispositivos, propiedades, mantenimiento |
| `familycloud_demo_fragment` | Sí | Medio | Recuerdos, álbumes, documentos, papelera |
| `presence_demo_fragment` | Sí | Medio | Presence, lugares, estados manuales, check-ins |
| `geni_demo_fragment` | Sí | Alto conceptual | Geni, Briefing, Chat, sugerencias, tono |
| `mock_data_fragment` | Sí | Medio | Hay ejemplos concretos de módulos, estados y categorías |
| `ux_states_fragment` | Parcial | Bajo/Medio | Hay estados de entidades, pero pocos estados UX puros |
| `frontend_services_fragment` | Parcial | Bajo | Hay entidades/datos pero no endpoints ni servicios concretos |

## **28\. Conclusión operativa**

Este documento debe usarse como base de dirección global del frontend premium de HomePlus.

Aporta especialmente:

* propósito emocional y funcional de la app;  
* estructura global de dominios;  
* navegación principal;  
* rol de Home;  
* rol de Planner;  
* rol de People;  
* rol de More;  
* existencia de Quick Actions;  
* Geni como capa visual/demo;  
* principios de visibilidad y tono;  
* roles oficiales;  
* entidades y estados base;  
* ejemplos útiles para datos demo;  
* restricciones de alcance para no convertir todo en backend real.

Debe usarse en la futura `frontend_premium_mvp_spec.md` para definir:

* la experiencia general;  
* la navegación global;  
* el tono visual/copy;  
* qué se ve real vs demo;  
* qué módulos pueden parecer completos con mocks;  
* cómo conectar Home, Planner, People, More y Quick Actions.

No debe usarse solo para implementar directamente porque faltan:

* diseño visual concreto;  
* pantallas exactas;  
* formularios;  
* endpoints;  
* estados UX completos;  
* mock data completo;  
* contratos de servicios;  
* permisos detallados;  
* navegación post-auth;  
* layouts finales.

Clasificación final del documento para frontend MVP:

* **REAL MVP:** navegación global, Home como resumen, Planner básico conceptual, roles base, hogar/persona/membresía conceptual, visibilidad del esfuerzo, valor individual desde el primer uso.  
* **DEMO PREMIUM:** Finance, Inventory, Assets, FamilyCloud, Presence, Geni, Feed, SOS, More/Settings visuales, Briefing, activity/insights.  
* **MOCK:** Briefing, Geni, Presence visible, actividad familiar, alertas inteligentes, carga/distribución si no hay cálculo real.  
* **POST\_MVP:** IA real, automatizaciones reales, offline sync, GPS/geofencing, OCR, reconocimiento facial, storage avanzado, multi-hogar avanzado, web app de invitación, Goals reales, auditoría completa, notificaciones reales, permisos finos.

---

# **SOURCE 02 — PRINCIPIOS DE PRODUCTO**

## **Archivo recomendado**

`Seccion 2 Principios de producto.txt`

## **Tipo de documento**

Principios de producto

## **Uso para frontend**

Extraer:

* principios que afectan navegación;  
* principios que afectan jerarquía visual;  
* reglas de simplicidad;  
* reglas de privacidad/confianza;  
* reglas de colaboración familiar;  
* elementos que deberían condicionar Home, Planner, Household y Geni.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_SECCION\_2\_PRINCIPIOS\_DEL\_PRODUCTO**

## **1\. Fuente**

* Documento: `HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md`  
* Archivo asociado disponible en este chat: `Seccion 2 Principios de producto.txt`  
* Tipo de documento: principios de producto, filosofía operativa, decisiones fundacionales, reglas de navegación, entidades y relaciones transversales.  
* Alcance: define cómo debe comportarse HomePlus como sistema operativo del hogar. No es un documento visual/Figma ni un contrato técnico de frontend.  
* Utilidad para frontend premium MVP: Alta.  
* Motivo: aporta reglas fuertes para navegación, Home, roles, Planner, privacidad, transparencia, Quick Actions, More, Geni, módulos demo y criterios de UX. No aporta layout pixel-perfect, design tokens, pantallas detalladas ni endpoints.  
* Fuentes consultadas: documento principal y archivo de comprensión asociado.

## **2\. Utilidad frontend del documento**

Este documento sirve para definir la lógica global de experiencia de HomePlus: qué debe estar visible, qué debe estar en Home, qué debe ir en Bottom Nav, qué debe vivir en More, cómo deben comportarse los roles y cómo evitar que la app se sienta invasiva o sobrecargada.

Aporta especialmente:

* Principios de producto aplicables al frontend.  
* Reglas de Home como centro operativo.  
* Estructura oficial de Home.  
* Navegación global: Home, People, `+`, Planner, More.  
* Quick Actions como acceso principal a Geni y acciones frecuentes.  
* More como lista de accesos, no dashboard.  
* Roles oficiales y adaptación por rol.  
* Planner como módulo diario: Tasks y Calendar.  
* Widgets de Home relacionados con tareas, eventos, carga familiar, presence, actividad y briefing.  
* Módulos secundarios útiles como DEMO PREMIUM.  
* Restricciones de privacidad, transparencia, coordinación y auditoría.  
* Estados conceptuales: tarea vencida, próxima a vencer, completada, evento cancelado, membresía pendiente, etc.  
* Información de entidades útil para frontend, aunque no define campos completos ni tipos.

No aporta:

* Pantallas completas.  
* Componentes visuales detallados.  
* Colores.  
* Tipografía.  
* Radios.  
* Sombras.  
* Tokens de diseño.  
* Contratos API.  
* Form requests/responses.  
* Estados loading/error específicos.  
* Datos mock concretos con nombres propios.

## **3\. Información de producto aplicable al frontend**

### **Coordinación primero**

* HomePlus prioriza coordinación sobre jerarquía.  
* El Coordinador administra el hogar, no la vida privada de las personas.  
* Aplicación frontend:  
  * La app debe sentirse como centro de coordinación, no como herramienta de vigilancia.  
  * Las acciones del Coordinador deben verse acotadas y justificadas.  
  * Las pantallas deben diferenciar datos compartidos del hogar vs datos privados.

Clasificación: REAL MVP como principio transversal.

### **Transparencia operativa**

* Los datos del hogar son visibles.  
* No se suaviza la realidad operativa para mantener la paz.  
* Tareas vencidas, esfuerzo desigual, gastos familiares y metas en riesgo deben mostrarse si existen.  
* Aplicación frontend:  
  * No esconder vencimientos.  
  * No maquillar estados negativos.  
  * Mostrar números claros cuando existan.  
  * Evitar copy excesivamente optimista ante fallos.

Clasificación: REAL MVP para Home/Planner/Members; MOCK o DEMO PREMIUM para métricas avanzadas.

### **Simplicidad por encima de complejidad interna**

* La interfaz debe mantenerse simple aunque la complejidad interna sea alta.  
* Defaults inteligentes \> configuración obligatoria.  
* Aplicación frontend:  
  * Pocos pasos para acciones frecuentes.  
  * Home ordenado.  
  * No saturar formularios.  
  * No exponer configuraciones avanzadas durante el onboarding.  
  * Acciones diarias accesibles desde Home, Planner o Quick Actions.

Clasificación: REAL MVP.

### **Privacidad no es opacidad**

* La privacidad individual prevalece.  
* Los compromisos compartidos son visibles por defecto.  
* Tareas asignadas y estado son visibles para todo el hogar.  
* Calendario y eventos familiares son visibles para todo el hogar.  
* Memoria privada de Geni, metas privadas, documentos privados y finanzas personales no son visibles automáticamente.  
* Aplicación frontend:  
  * Mostrar datos compartidos del hogar con claridad.  
  * Evitar exponer datos privados en Home o Planner.  
  * Diferenciar visualmente lo familiar/compartido de lo personal si aparece.

Clasificación: REAL MVP.

### **Proactividad calibrada**

* Geni interviene por patrones, no por incidentes aislados.  
* La app no debe generar ruido constante.  
* Aplicación frontend:  
  * Alertas solo si son accionables.  
  * No repetir el mismo problema sin nueva información.  
  * Usar sugerencias suaves.  
  * Evitar notificaciones irrelevantes.

Clasificación: MOCK/DEMO PREMIUM para Geni; REAL MVP como criterio UX.

### **Home como centro operativo**

* Home es pantalla inicial.  
* Home resume; los módulos administran.  
* Home no es configurable por el usuario en MVP.  
* Aplicación frontend:  
  * Home debe mostrar resumen accionable.  
  * Las cards de Home deben navegar al módulo correspondiente.  
  * Home no debe convertirse en pantalla de edición profunda.

Clasificación: REAL MVP.

### **Valor desde el minuto 1**

* Cada módulo debe entregar valor individual desde el primer uso.  
* Aplicación frontend:  
  * Empty states deben orientar a una primera acción.  
  * La app debe ser útil aunque solo haya un miembro activo.  
  * Módulos demo pueden verse completos con datos creíbles.

Clasificación: REAL MVP / DEMO PREMIUM según módulo.

### **Datos duros, tono humano**

* Geni presenta datos, no juicios.  
* Ejemplo explícito: “Tres tareas pendientes desde el lunes”.  
* Aplicación frontend:  
  * Copy factual.  
  * Evitar culpa o infantilización.  
  * No celebrar falsamente el fracaso.  
  * Mostrar progreso real.

Clasificación: REAL MVP para copy global.

## **4\. Navegación y arquitectura de pantallas**

### **Bottom Navigation**

Navegación inferior detectada:

* `Home`  
* `People`  
* `+`  
* `Planner`  
* `More`

El archivo de comprensión la marca como `BottomNavigation` y la describe como `[Home] [People] [+] [Planner] [More]. Congelado V1`.

Clasificación: REAL MVP.

### **Home**

* Home es pantalla inicial.  
* El usuario no puede cambiar el punto de entrada.  
* Home resume información y no administra.  
* Toda información mostrada en Home debe conducir al módulo que la administra.

Clasificación: REAL MVP.

### **People**

* Aparece como dominio asociado a Hogar, Cuenta, Persona, Membresía, Rol, Invitación, Perfil Personal y Feed.  
* People parece ser entrada a miembros/personas y posiblemente feed.  
* Para MVP, usar People/Members básico; Feed queda DEMO o fuera de MVP real.

Clasificación:

* Members básico: REAL MVP.  
* Feed real: POST\_MVP / DEMO PREMIUM si se usa visualmente.

### **Botón central `+`**

* Existe como entrada a Quick Actions.  
* Quick Actions es panel flotante desde `+`.  
* Geni aparece fijo primero.  
* Las acciones son dinámicas por frecuencia.

Clasificación: REAL MVP para estructura; DEMO PREMIUM para acciones avanzadas.

### **Planner**

* Tasks y Calendar son Tier 1 de frecuencia diaria.  
* Planner aparece en Bottom Nav.  
* Planner contiene Task, Calendar, Goal y Responsabilidad.

Clasificación:

* Tasks/Events/Calendar mínimo: REAL MVP.  
* Goals: POST\_MVP o DEMO PREMIUM visual.

### **More**

* More contiene accesos a Finance, Inventory, FamilyCloud y Settings.  
* More no contiene dashboards.  
* Solo accesos a dominios \+ indicadores rápidos opcionales.  
* Settings vive exclusivamente en More.

Clasificación:

* More/Settings visual: DEMO PREMIUM / REAL mínimo según navegación.  
* Finance/Inventory/FamilyCloud como módulos demo: DEMO PREMIUM.

### **Header**

* MultiHogarSelector vive en el header.  
* Solo visible con 2+ hogares.  
* Multi-hogar avanzado queda fuera del MVP actual.

Clasificación:

* Selector visible condicionado: POST\_MVP salvo que el MVP implemente multi-hogar.  
* Header como patrón: referencia futura.

### **Navegación por profundidad**

* Más de 4 niveles de navegación es fallo.  
* Objetivo: 95% de acciones en 3 niveles o menos.

Clasificación: REAL MVP como restricción UX.

## **5\. Pantallas detectadas**

| Pantalla/Componente | Objetivo | Qué muestra | Acciones | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo | Briefing, atención requerida, carga familiar, próximos eventos, tareas, finanzas relevantes, presence resumido, actividad familiar | Navegar a módulos administradores | REAL MVP \+ MOCK/DEMO en widgets avanzados |
| People | Dominio de personas/miembros | Persona, membresía, rol, invitaciones, posiblemente Feed | Ver miembros, gestionar roles/invitaciones si el MVP lo define | REAL MVP para Members básico |
| Planner | Administrar coordinación diaria | Tasks, Calendar, Goal, Responsabilidad | Crear/ver/completar tareas, ver eventos/calendario | REAL MVP para Tasks/Events/Calendar |
| More | Acceso a dominios y configuración | Finance, Inventory, FamilyCloud, Settings | Abrir módulos secundarios/settings | DEMO PREMIUM / REAL navegación |
| Quick Actions | Acciones rápidas desde `+` | Geni primero, acciones dinámicas por frecuencia | Ejecutar acciones rápidas | REAL estructura, DEMO acciones avanzadas |
| Settings | Configuración | Hogar, Cuenta, Sistema, Auditoría | Configurar/ver settings | DEMO PREMIUM / POST\_MVP para auditoría completa |
| MultiHogarSelector | Selector de hogar activo | Hogares disponibles si hay 2+ | Cambiar hogar | POST\_MVP o referencia |
| WidgetBriefing | Resumen inteligente | Briefing Geni, card única | Abrir detalle o sugerencia si existe | MOCK / DEMO PREMIUM |
| WidgetAtenciónRequerida | Mostrar urgencias | SOS, tareas vencidas, pagos vencidos, aprobaciones pendientes | Ir al módulo correspondiente | REAL para tareas/aprobaciones, MOCK/DEMO para otros |
| WidgetCargaFamiliar | Mostrar distribución de esfuerzo | Métricas de carga del hogar | Ver detalle | MOCK / DEMO PREMIUM |
| WidgetPróximosEventos | Agenda inmediata | Eventos próximos | Abrir Calendar/Event | REAL MVP |
| WidgetTareas | Tareas agrupadas | Tareas por Responsabilidad | Completar/ver tareas | REAL MVP |
| WidgetFinanzasRelevantes | Alertas financieras | Alertas condicionales | Abrir Finance | DEMO PREMIUM / MOCK |
| WidgetPresenceResumido | Estado familiar | Quién está en casa, quién viene | Abrir Presence | MOCK / DEMO PREMIUM |
| WidgetActividadFamiliar | Actividad resumida | Feed resumido | Abrir Feed/People | MOCK / DEMO PREMIUM |
| SearchGlobal | Buscar en dominios | Búsqueda contextual | Buscar/ejecutar acciones | POST\_MVP |
| GeniSearch | Búsqueda global con contexto | Resultados cruzados | Consultar/accionar | POST\_MVP |
| Feed | Espacio social del hogar | Posts, comentarios, reacciones | Publicar/comentar/reaccionar | DEMO PREMIUM o POST\_MVP real |
| Finance | Finanzas del hogar | Cuentas, gastos, ingresos, fondos, presupuestos, deudas | Ver/agregar/anular si se simula | DEMO PREMIUM |
| Inventory | Inventario | Consumibles, productos del hogar, medicamentos, stock | Ver/agregar/actualizar stock si se simula | DEMO PREMIUM |
| Assets | Activos | Vehículos, mascotas, dispositivos, propiedades, mantenimiento | Ver detalle/mantenimiento si se simula | DEMO PREMIUM |
| FamilyCloud | Recuerdos/documentos | Recuerdos, álbumes, documentos, papelera | Abrir/subir mock | DEMO PREMIUM |
| Presence | Presencia | Ubicación, estados, lugares, check-ins | Cambiar estado/check-in mock | DEMO PREMIUM |
| SOS | Emergencia | Alerta SOS, niveles, contexto | Activar/cancelar demo | DEMO PREMIUM / no real |
| Automations | Automatizaciones | Triggers, condiciones, acciones | Ver/sugerir demo | DEMO PREMIUM / POST\_MVP real |
| Goals | Metas | Goals, hitos, progreso | Ver progreso/marcar avance visual | DEMO PREMIUM / POST\_MVP real |

## **6\. Componentes y patrones UI reutilizables**

### **Cards / widgets**

Detectados explícitamente:

* WidgetBriefing.  
* WidgetAtenciónRequerida.  
* WidgetCargaFamiliar.  
* WidgetPróximosEventos.  
* WidgetTareas.  
* WidgetFinanzasRelevantes.  
* WidgetPresenceResumido.  
* WidgetActividadFamiliar.

Clasificación:

* Home base: REAL MVP.  
* Widgets avanzados: MOCK / DEMO PREMIUM.

### **Bottom nav**

* Home, People, `+`, Planner, More.  
* Congelado V1 según archivo de comprensión.

Clasificación: REAL MVP.

### **Quick Actions panel**

* Panel flotante desde `+`.  
* Geni fijo primero.  
* Acciones dinámicas por frecuencia.

Clasificación: REAL MVP estructura; DEMO PREMIUM para acciones avanzadas.

### **Listas**

Patrones detectados por entidad:

* Lista de miembros/personas.  
* Lista de tareas.  
* Lista de eventos.  
* Lista de módulos en More.  
* Lista de posts/feed.  
* Lista de documentos/recuerdos.  
* Lista de consumibles/productos/medicamentos.  
* Lista de activos.  
* Lista de notificaciones.

Clasificación: según módulo.

### **Badges / status pills**

No se mencionan visualmente como “badges”, pero hay estados útiles para representar como pills:

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.  
* Programado.  
* Completado.  
* Cancelado.  
* Vencida calculada.  
* En progreso.  
* Crítica / Alta / Media / Baja para notificaciones.  
* En casa / En trabajo / En escuela / En tránsito.  
* No molestar / Descansando.

Clasificación: REAL MVP / DEMO PREMIUM según módulo.

### **Avatares / iniciales**

No se encontró mención explícita de avatares o iniciales en este documento.

### **Formularios**

El documento no define formularios visuales, pero menciona acciones que requerirían formularios en otras fuentes:

* Invitar.  
* Aceptar invitación.  
* Administrar configuraciones.  
* Crear tareas.  
* Crear eventos.  
* Crear gastos.  
* Configurar notificaciones.  
* Crear automatización.

Clasificación: información parcial.

### **Alertas**

* Tarea próxima a vencer.  
* Tarea vencida.  
* Patrón de tareas vencidas.  
* Conflicto de horarios.  
* Presupuesto comprometido.  
* Stock bajo.  
* Documento/vencimiento próximo.  
* Meta en riesgo.  
* SOS activado.

Clasificación:

* Tareas/eventos: REAL MVP o MOCK según implementación.  
* Resto: DEMO PREMIUM / POST\_MVP.

### **Activity items**

* Actividad Familiar / Feed resumido.  
* Auditoría de acciones del Coordinador.  
* Timeline de tareas.  
* Registro de automatizaciones.  
* Feed con posts, comentarios y reacciones.

Clasificación:

* Activity Home: MOCK.  
* Auditoría completa: POST\_MVP.  
* Timeline de tareas: POST\_MVP.

## **7\. Visual design aplicable**

No se encontró información específica sobre:

* Colores.  
* Gradientes.  
* Blur.  
* Glassmorphism.  
* Sombras.  
* Bordes.  
* Radios.  
* Spacing.  
* Tipografía.  
* Iconografía.  
* Emojis.  
* Estilo iOS.  
* Tamaños de botones.  
* Tokens de diseño.  
* Contraste.  
* Layout pixel-perfect.

Sí se encontró información aplicable a jerarquía visual:

* Home sigue orden oficial: Briefing → Atención Requerida → Carga Familiar → Próximos Eventos → Tareas → Finanzas Relevantes → Presence Resumido → Actividad Familiar.  
* Home usa modelo mental “Atención → Acción → Exploración”.  
* Las funciones diarias van en Bottom Nav o Home.  
* Las funciones ocasionales viven en More.  
* More no contiene dashboards.  
* La interfaz debe ser simple aunque la lógica sea profunda.  
* No esconder features de uso diario en Configuración.  
* El usuario no debe tener que aprender dónde está cada cosa.  
* Las alertas deben ser accionables y no repetitivas.

Clasificación: REAL MVP como dirección UX, no visual tokens.

## **8\. Home**

### **Rol de Home**

* Home es centro operativo.  
* Home resume información.  
* Home no administra.  
* Home es punto de entrada principal y no modificable.  
* Home no es configurable por el usuario en MVP.  
* Home se adapta por rol y contexto.

Clasificación: REAL MVP.

### **Estructura oficial de Home**

Orden detectado:

1. Briefing Geni — resumen inteligente, siempre primero.  
2. Atención Requerida — SOS, tareas vencidas, pagos vencidos, aprobaciones pendientes.  
3. Carga Familiar — distribución del esfuerzo en el hogar.  
4. Próximos Eventos — agenda inmediata.  
5. Tareas — agrupadas por Responsabilidad.  
6. Finanzas Relevantes — condicional, solo aparece cuando hay alertas.  
7. Presence Resumido — quién está en casa, quién viene.  
8. Actividad Familiar — Feed resumido.

Clasificación:

* Próximos eventos: REAL MVP.  
* Tareas: REAL MVP.  
* Aprobaciones pendientes: REAL MVP si invitaciones están implementadas.  
* Briefing: MOCK / DEMO PREMIUM.  
* Carga familiar: MOCK / DEMO PREMIUM.  
* Finanzas relevantes: DEMO PREMIUM / MOCK.  
* Presence resumido: MOCK / DEMO PREMIUM.  
* Actividad familiar: MOCK / DEMO PREMIUM.  
* SOS en Home: DEMO PREMIUM / no real.

### **Home por rol**

* Coordinador: visión completa del hogar.  
* Adulto: visión operativa.  
* Adolescente: más foco en tareas, eventos y coordinación.  
* Niño: experiencia simplificada.  
* Adulto Mayor: experiencia adaptada con prioridad en personas, eventos, recordatorios y medicación.  
* Invitado: acceso mínimo.  
* Empleado Familiar: visión centrada en trabajo asignado.

Clasificación:

* Roles MVP: REAL MVP para visibilidad básica.  
* Empleado Familiar: POST\_MVP salvo que el alcance lo incluya.

### **Reglas de Home**

* Toda información mostrada en Home debe conducir al módulo que la administra.  
* Home resume; módulos administran.  
* No poner features en Home solo por complejidad técnica.  
* No esconder features de uso diario en Configuración.  
* No hacer que el usuario tenga que aprender dónde está cada cosa.  
* No existe widget financiero permanente; aparece solo con alertas.

Clasificación: REAL MVP.

### **Home real vs mock**

REAL MVP:

* Tareas pendientes.  
* Tareas vencidas si se calculan desde Planner.  
* Próximos eventos.  
* Resumen básico del hogar.  
* Aprobaciones pendientes si invitaciones/members están implementados.  
* Miembros básicos si el Home los muestra.

MOCK / DEMO PREMIUM:

* Briefing Geni.  
* Carga Familiar.  
* Finanzas Relevantes.  
* Presence Resumido.  
* Actividad Familiar.  
* SOS visual si se muestra.  
* Feed resumido.  
* Alertas financieras.  
* Métricas avanzadas de contribución.

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

* Hogar contiene Planner.  
* Planner contiene Task.  
* Planner contiene Calendar.  
* Planner contiene Goal.  
* Planner contiene Responsabilidad.  
* Cada hogar tiene su propio Planner.  
* Tasks y Calendar son Tier 1, uso diario.  
* Planner aparece en Bottom Nav.

Clasificación:

* Planner básico: REAL MVP.  
* Goals: POST\_MVP / DEMO PREMIUM.

### **Tasks**

Información detectada:

* Task es trabajo pendiente o realizado.  
* Estados detectados:  
  * Pendiente.  
  * En progreso.  
  * Completada.  
  * Cancelada.  
* Vencida es calculado, no estado propio.  
* Task puede contener Subtarea.  
* Task puede contener ComentarioTask.  
* Task puede contener Adjunto.  
* Task tiene Timeline.  
* Task puede requerir Verificación.  
* Task puede depender de otra Task.  
* Task puede tener Recurrencia.  
* Task pertenece a Responsabilidad.  
* Task usa Plantilla de Tarea.  
* Task puede avanzar Goal.  
* Persona puede estar asignada a Task.  
* Home muestra tareas agrupadas por Responsabilidad.  
* Widget de tareas desaparece al completar.  
* Tarea asignada produce notificación al responsable.  
* Tarea próxima a vencer produce recordatorio.  
* Tarea vencida produce notificación.  
* Tarea vencida persistente puede alertar al Coordinador.  
* Patrón de tareas vencidas puede sugerir reorganización o redistribución.  
* Geni nunca completa tareas automáticamente.

Clasificación:

REAL MVP:

* Listar tareas.  
* Completar tareas.  
* Mostrar estado.  
* Mostrar vencida como cálculo visual.  
* Asignar responsable si el MVP lo define.  
* Agrupar por Responsabilidad si se puede.  
* Conectar tareas con Home.  
* Tareas visibles por hogar.

DEMO PREMIUM / MOCK:

* Sugerencias Geni sobre tareas.  
* Métricas de carga.  
* Alertas inteligentes por patrones.

POST\_MVP:

* Subtareas.  
* Comentarios.  
* Adjuntos.  
* Timeline.  
* Dependencias.  
* Recurrencia compleja.  
* Verificación avanzada si contradice estados MVP.  
* Notificaciones reales.  
* Auditoría completa.  
* Offline sync completo.

### **Events / Calendar**

Información detectada:

* Calendar administra eventos familiares y personales.  
* Evento representa evento familiar o personal.  
* Estados:  
  * Programado.  
  * Completado.  
  * Cancelado.  
* No existe Postergado.  
* Postergar equivale a modificar fecha.  
* Persona participa en Evento.  
* Calendario y eventos familiares son visibles para todo el hogar.  
* Home muestra Próximos Eventos como agenda inmediata.  
* Conflicto de horarios puede disparar alerta proactiva con sugerencia.  
* Geocerca puede disparar Evento.  
* Automatización puede crear Evento.  
* Evento puede generar Recuerdo.

Clasificación:

REAL MVP:

* Listar eventos.  
* Crear/editar/cancelar evento si está en alcance.  
* Mostrar próximos eventos en Home.  
* Mostrar Calendar básico.  
* Evento visible por hogar.

DEMO PREMIUM / MOCK:

* Conflictos de horario inteligentes.  
* Eventos que generan recuerdos.  
* Geocerca visual.  
* Automatización visual.

POST\_MVP:

* Geofencing real.  
* Automatizaciones reales.  
* FamilyCloud real.  
* Notificaciones reales.  
* Participantes avanzados.  
* Recurrencia compleja si no está definida.

### **Goals**

* Goal es meta personal o familiar.  
* Estructura: Goal → Hitos → Tasks.  
* Estados:  
  * Activa.  
  * Completada.  
  * Fallida.  
* Meta en riesgo puede generar alerta.  
* Task puede avanzar Goal.

Clasificación:

* POST\_MVP como backend real.  
* DEMO PREMIUM si se usa como card visual/progreso.

## **10\. People / Members / Roles**

### **Entidades relacionadas**

* Cuenta.  
* Persona.  
* Hogar.  
* Membresía.  
* Rol.  
* Invitación.  
* Perfil Personal.  
* Relación Familiar.

### **Roles oficiales detectados**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

Clasificación:

* Coordinator, Adult, Adolescent, Child, Senior, Guest: REAL MVP si el MVP los requiere.  
* Empleado Familiar: POST\_MVP salvo inclusión explícita posterior.

### **Membresía**

* Relación entre Persona y Hogar.  
* Posee rol y estado.  
* Estados detectados:  
  * Pendiente.  
  * Activa.  
  * Suspendida.  
  * Finalizada.  
* Cada membresía posee un único rol activo.  
* Persona puede participar en uno o más hogares.

Clasificación:

* Membership básico: REAL MVP.  
* Multi-hogar avanzado: POST\_MVP.

### **Invitación**

* Flujo detectado: Invitación → Aceptación → Aprobación → Ingreso al hogar.  
* Coordinador aprueba ingresos.  
* La invitación y aceptación son pasos previos obligatorios.  
* Las aprobaciones pendientes aparecen en Atención Requerida de Home.

Clasificación: REAL MVP si invitaciones forman parte del demo.

### **Permisos/acciones por rol detectadas**

Coordinador:

* Aprobar ingresos.  
* Cambiar roles.  
* Expulsar miembros.  
* Transferir coordinación.  
* Administrar configuraciones.  
* No puede acceder a memoria privada de Geni de otros miembros.  
* No puede acceder a metas privadas de otros miembros.  
* No puede acceder a documentos privados de otros miembros.  
* No puede acceder a finanzas personales de otros miembros.  
* No puede eliminar hogares.

Adulto:

* Miembro operativo con amplios permisos.  
* Invita personas.  
* Crea y reasigna tareas.  
* Crea eventos.  
* Administra operaciones.

Adolescente:

* Autonomía progresiva.  
* Crea eventos.  
* Crea gastos.  
* Administra tareas propias.  
* Puede recibir permisos adicionales.

Niño:

* Acceso simplificado.  
* No administra información familiar crítica.

Adulto Mayor:

* Experiencia adaptada.  
* Home prioriza personas, eventos, recordatorios, medicación y coordinación.  
* Permisos equivalentes a Adulto.

Invitado:

* Acceso mínimo.  
* Participación limitada.

Empleado Familiar:

* Colaborador operativo.  
* No forma parte del núcleo familiar.  
* Acceso restringido a responsabilidades asignadas.  
* Visión centrada en trabajo asignado.  
* No puede crear tareas.  
* Solo puede completar, comentar y adjuntar evidencia.  
* Al desvincularse: se elimina acceso, se conserva historial, pagos y tareas.

Clasificación:

* Permisos básicos por rol: REAL MVP parcial.  
* Permisos finos: POST\_MVP.  
* Empleado Familiar: POST\_MVP / referencia.

### **Relación con Planner/Home**

* Persona puede estar asignada a Task.  
* Persona participa en Evento.  
* Persona puede ser miembro de Responsabilidad.  
* Home se adapta por rol.  
* People/Members aporta responsables para Tasks y participantes para Events.

Clasificación: REAL MVP para asignación básica.

## **11\. Household / Invitations / Onboarding**

### **Household**

* Hogar es unidad organizativa principal.  
* Todo ocurre dentro de un hogar.  
* Hogar contiene Planner, Finance, Presence, Inventory, Assets, FamilyCloud, Feed y Automatización.  
* Cada hogar tiene su propio Home, Planner y Finance.  
* La memoria familiar pertenece al hogar y no se comparte automáticamente entre hogares.

Clasificación:

* Hogar activo / separación por hogar: REAL MVP.  
* Multi-hogar avanzado: POST\_MVP.

### **Invitations**

* Invitación es flujo: Invitación → Aceptación → Aprobación → Ingreso al hogar.  
* Coordinador puede aprobar ingresos.  
* Aprobaciones pendientes aparecen en Atención Requerida de Home.  
* La invitación y aceptación son pasos previos obligatorios.

Clasificación: REAL MVP.

### **Onboarding**

Información directa limitada.

Sí aparece:

* Simplicidad en onboarding vs completitud funcional.  
* Se prioriza onboarding que entregue valor en 60 segundos.  
* No se deben exponer todas las features en el primer uso.  
* Features complejas pueden descubrirse después.  
* Descubrimiento guiado post-onboarding solo si features core no se descubren.

Clasificación: REAL MVP como principio UX.

### **Estados intermedios útiles**

* Sin hogar: no aparece explícitamente.  
* Pendiente de aprobación: aparece como membresía pendiente y aprobaciones pendientes.  
* Activa.  
* Suspendida.  
* Finalizada.

Clasificación: REAL MVP para members/invitations.

## **12\. More / Settings / Profile**

### **More**

* More contiene:  
  * Finance.  
  * Inventory.  
  * FamilyCloud.  
  * Settings.  
* More no contiene dashboards.  
* More solo contiene accesos a dominios \+ indicadores rápidos opcionales.

Clasificación: DEMO PREMIUM / REAL navegación.

### **Settings**

* Settings vive exclusivamente en More.  
* Settings incluye:  
  * Hogar.  
  * Cuenta.  
  * Sistema.  
  * Auditoría.

Clasificación:

* Settings visual: DEMO PREMIUM.  
* Settings reales de cuenta/hogar mínimos: REAL si ya están implementados.  
* Auditoría completa: POST\_MVP.

### **Profile / Cuenta**

* Cuenta pertenece al usuario, no al hogar.  
* Incluye perfil, preferencias, idioma, configuración personal y memoria personal de Geni.  
* Perfil Personal pertenece a Cuenta.  
* No se define pantalla Profile específica.

Clasificación:

* Perfil visual o básico: DEMO PREMIUM / REAL si Auth lo requiere.  
* Memoria Geni personal: POST\_MVP.

### **MultiHogarSelector**

* Vive en header, no en More.  
* Visible solo con 2+ hogares.

Clasificación: POST\_MVP salvo multi-hogar mínimo.

## **13\. Quick Actions**

### **Estructura detectada**

* QuickActions es panel flotante desde `+`.  
* Geni fijo siempre primero.  
* Acciones dinámicas por frecuencia.  
* Geni no tiene tab propio ni botón global dedicado.  
* Acceso principal a Geni vía Quick Actions.

Clasificación: REAL MVP estructura.

### **Acciones explícitas detectadas o relacionadas**

| Acción | Fuente / relación | Clasificación |
| ----- | ----- | ----- |
| Abrir Geni | Geni fijo primero en Quick Actions | DEMO PREMIUM / MOCK |
| Crear tarea | Automatización/Geni puede crear Task; Tasks son diarias, pero no aparece literalmente como Quick Action | Propuesta derivada / requiere validación |
| Crear evento | Automatización puede crear Evento; Calendar es diario, pero no aparece literalmente como Quick Action | Propuesta derivada / requiere validación |
| Invitar miembro | Adulto invita personas; no aparece como Quick Action literal | Propuesta derivada / requiere validación |
| Agregar gasto | Adolescente crea gastos; Finance existe; no aparece como Quick Action literal | DEMO PREMIUM derivado |
| Agregar item | Inventory existe; stock bajo puede sugerir tarea de compra | DEMO PREMIUM derivado |
| Subir documento | FamilyCloud/Documento existe; no aparece como Quick Action literal | DEMO PREMIUM derivado |
| Check-in | Presence contiene Check-in | DEMO PREMIUM derivado |
| SOS | Tier 0 especial, siempre disponible vía swipe global o Quick Actions | DEMO PREMIUM / no emergencia real |
| Crear recuerdo | Recuerdo existe; eventos pueden generar recuerdos | DEMO PREMIUM derivado |

## **14\. Módulos demo premium**

### **Finance**

Información extraíble:

* CuentaFinanciera: dinero disponible.  
* Tipos: Efectivo, Mercado Pago, Banco, Tarjeta.  
* Saldo calculado automáticamente.  
* Gasto personal o familiar.  
* Gasto no se elimina, puede anularse.  
* Ingreso: Sueldo, Regalo, Venta, Reembolso.  
* Fondo: reserva de dinero para un propósito.  
* Fondo estados: Activo, Completado, Cerrado.  
* Presupuesto: control de límites de gasto.  
* Presupuesto genera alertas al aproximarse al límite.  
* Deuda: Persona↔Persona, Persona↔Familia, Familia↔Externo.  
* Deuda estados: Activa, Pagada, Vencida.  
* Comprobante opcional: foto, PDF, imagen.  
* Ajuste manual de saldo queda auditado.  
* Home no tiene widget financiero permanente; Finanzas Relevantes aparece solo con alertas.

Clasificación:

* Finance completo real: POST\_MVP.  
* Finance visual en More/Home: DEMO PREMIUM.  
* Alertas financieras en Home: MOCK/DEMO PREMIUM.

### **Inventory**

Información extraíble:

* Consumible: alimentos y consumibles.  
* Campos explícitos: nombre, categoría, cantidad, unidad, stock mínimo.  
* Producto del Hogar: shampoo, jabón, papel higiénico, detergente.  
* Medicamento: nombre, stock, vencimiento, observaciones.  
* Stock bajo puede generar alerta.  
* Stock bajo puede sugerir crear tarea de compra.

Clasificación:

* Inventory real: POST\_MVP.  
* Inventory demo: DEMO PREMIUM.  
* Sugerir tarea por stock bajo: DEMO PREMIUM / POST\_MVP si automatizado.

### **Assets**

Información extraíble:

* Vehículo: marca, modelo, año, patente, documentación y vencimientos.  
* Mascota: información, veterinario, vacunas, mantenimiento.  
* Mascota estados: Activa, Fallecida, Archivada.  
* Dispositivo: notebook, PC, tablet, celular, consola; garantías y mantenimiento.  
* Propiedad: casa, departamento, terreno; dirección y documentación.  
* MantenimientoAsset puede generar tareas automáticamente.

Clasificación:

* Assets real: POST\_MVP.  
* Assets demo visual: DEMO PREMIUM.  
* Generar tareas automáticamente: POST\_MVP / DEMO visual.

### **FamilyCloud / HomeCloud**

Información extraíble:

* Recuerdo: fotos, videos, texto.  
* Recuerdo puede crearse automáticamente desde eventos de Calendar.  
* Álbum: agrupación de recuerdos por momentos.  
* Documento: PDF, imagen, escaneado.  
* Documento soporta versionado, comentarios, permisos.  
* Documento puede vincularse a todo el ecosistema.  
* Papelera: elementos eliminados, retención 30 días.  
* OCR extraído puede ir a Geni para clasificar y sugerir relaciones.

Clasificación:

* FamilyCloud real/storage/OCR: POST\_MVP.  
* FamilyCloud demo visual: DEMO PREMIUM.  
* Recuerdos desde eventos: DEMO PREMIUM / POST\_MVP real.

### **Presence**

Información extraíble:

* Ubicación: compartición continua con pausa temporal.  
* Existen tres niveles de visibilidad configurables.  
* EstadoPresence:  
  * En casa.  
  * En trabajo.  
  * En escuela.  
  * En tránsito.  
  * No molestar.  
  * Descansando.  
* Estados manuales tienen prioridad.  
* Lugar: ubicaciones relevantes.  
* Lugar puede tener geocerca.  
* Check-in: confirmaciones manuales.  
* HistorialUbicación: retención 30 días.  
* WidgetPresenceResumido: quién está en casa, quién viene.

Clasificación:

* Presence GPS real/geofencing: POST\_MVP.  
* Presence visual/mock: DEMO PREMIUM.  
* Widget Home Presence: MOCK.

### **Geni**

Información extraíble:

* Geni es capa transversal.  
* Opera sobre dominios autorizados.  
* Consulta, analiza, relaciona, recomienda, automatiza.  
* Briefing: resumen inteligente del hogar.  
* Briefing es primer widget de Home.  
* WidgetBriefing: card única.  
* Geni presenta datos, no juicios.  
* Geni sugiere acciones, no ejecuta unilateralmente.  
* Geni no completa tareas automáticamente.  
* Geni no manda mensajes sin permiso explícito.  
* Geni no crea automatizaciones permanentes sin aprobación.  
* Geni no tiene tab en Bottom Nav.  
* Geni se accede vía Quick Actions.  
* GeniSearch busca en todos los dominios según permisos.

Clasificación:

* Geni real: POST\_MVP.  
* Geni briefing/sugerencias: MOCK / DEMO PREMIUM.  
* Acceso Quick Actions: REAL estructura.

### **Feed**

Información extraíble:

* Feed es espacio social del hogar.  
* Sub-sección dentro de People.  
* Post contiene texto, imagen, video, archivos, enlaces internos.  
* Todo es un Post, sin tipos especiales.  
* ComentarioFeed y Reacción existen.  
* WidgetActividadFamiliar: Feed resumido.  
* Geni puede sugerir Post.  
* Recuerdo puede alimentar Post.

Clasificación:

* Feed real: POST\_MVP.  
* Feed/Actividad Familiar visual: DEMO PREMIUM / MOCK.

### **SOS**

Información extraíble:

* AlertaSOS: emergencia.  
* Tres niveles:  
  * Emergencia grave.  
  * Necesito ayuda.  
  * Coordinación urgente.  
* Incluye persona, ubicación, hora, contexto.  
* SOSSilencioso: alerta sin señales visibles en dispositivo emisor.  
* CancelaciónSOS: ventana breve para cancelaciones accidentales.  
* EscaladoSOS: Coordinador → Adultos → Personas relevantes.  
* SOS es Tier 0 especial.  
* SOS puede estar en swipe global / Quick Actions.  
* SOS no puede silenciarse en notificaciones.  
* SOS no está disponible offline.  
* SOS activo desplaza cualquier contenido en Home.

Clasificación:

* SOS real: fuera de alcance / POST\_MVP.  
* SOS visual demo: DEMO PREMIUM.  
* No implementar emergencia real desde este documento.

### **Automations**

Información extraíble:

* Automatización: SI ocurre X → ENTONCES hacer Y.  
* Tiene trigger, condiciones, acciones, estado.  
* Opera a nivel hogar.  
* Triggers: Presence, Planner, Finance, Inventory, Assets, SOS.  
* Acciones: crear tarea, crear recordatorio, notificar, crear evento, actualizar meta, publicar en Feed.  
* BibliotecaAutomatizaciones:  
  * Llegó a casa.  
  * Stock bajo.  
  * Pago próximo.  
  * Mantenimiento pendiente.  
  * Cumpleaños próximo.  
* Geni puede sugerir automatización.  
* Automatización puede ejecutarse y generar auditoría.

Clasificación:

* Automatizaciones reales: POST\_MVP.  
* Pantalla/card demo: DEMO PREMIUM.

### **Goals**

Información extraíble:

* Goal personal o familiar.  
* Estructura: Goal → Hitos → Tasks.  
* Estados:  
  * Activa.  
  * Completada.  
  * Fallida.  
* Task puede avanzar Goal.  
* Goal puede vincularse con Fondo.  
* Meta en riesgo puede generar alerta.

Clasificación:

* Goals real: POST\_MVP.  
* Goals visual/progreso: DEMO PREMIUM.

### **Notifications**

Información extraíble:

* Notificación categorizada por dominio.  
* Categorías: Planner, Calendar, Finance, Presence, Assets, Inventory, FamilyCloud, Feed, SOS.  
* Prioridades:  
  * Crítica.  
  * Alta.  
  * Media.  
  * Baja.  
* Canales:  
  * Push.  
  * Email.  
  * In-App.  
* SOS no puede silenciarse.  
* Las notificaciones indican a qué hogar pertenecen.  
* No se debe notificar sobre cosas no accionables.  
* No se debe repetir el mismo problema sin nueva información.

Clasificación:

* Push/email reales: POST\_MVP.  
* In-app visual/mock: DEMO PREMIUM.  
* Indicadores básicos de estado: REAL/MOCK según módulo.

### **Search**

Información extraíble:

* SearchGlobal es navegador interno.  
* Busca en todos los dominios.  
* También ejecuta acciones.  
* Usa Geni.  
* GeniSearch busca con contexto cruzado según permisos.

Clasificación: POST\_MVP / DEMO PREMIUM visual.

### **Activity**

Información extraíble:

* WidgetActividadFamiliar: Feed resumido.  
* Auditoría registra acciones importantes.  
* Timeline de tarea registra cambios.  
* Automatización genera auditoría.  
* Recuerdo puede alimentar Post.

Clasificación:

* Activity Home: MOCK/DEMO PREMIUM.  
* Auditoría/Timeline real: POST\_MVP.

### **Carga Familiar**

Información extraíble:

* Distribución del esfuerzo en el hogar.  
* No ocultar asimetrías de carga.  
* Ejemplo: si un miembro sostuvo el 87% de las tareas este mes, ese número es visible.  
* No suavizar datos operativos.  
* Si completó 2 de 8 tareas, mostrar 2 de 8\.

Clasificación:

* Carga real avanzada: POST\_MVP si no hay backend.  
* Widget mock premium: MOCK/DEMO PREMIUM.

## **15\. Estados UX y feedback**

### **Estados detectados directamente**

Membership:

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.

Task:

* Pendiente.  
* En progreso.  
* Completada.  
* Cancelada.  
* Vencida como cálculo automático.  
* Próxima a vencer como condición temporal.  
* Asignada como situación que dispara notificación.

Evento:

* Programado.  
* Completado.  
* Cancelado.  
* Postergado no existe; se modifica fecha.

Goal:

* Activa.  
* Completada.  
* Fallida.  
* En riesgo como condición.

Finance:

* Fondo: Activo, Completado, Cerrado.  
* Deuda: Activa, Pagada, Vencida.  
* Presupuesto cerca del límite.

Presence:

* En casa.  
* En trabajo.  
* En escuela.  
* En tránsito.  
* No molestar.  
* Descansando.  
* Ubicación pausada.

Assets:

* Mascota: Activa, Fallecida, Archivada.

Notifications:

* Crítica.  
* Alta.  
* Media.  
* Baja.  
* Push.  
* Email.  
* In-App.  
* Silenciable/no silenciable según categoría.

SOS:

* Emergencia grave.  
* Necesito ayuda.  
* Coordinación urgente.  
* SOS activo.  
* Cancelación accidental.  
* Escalado.

Offline:

* Acciones pendientes.  
* Recuperar conexión.  
* Conflicto Last Write Wins.

### **Estados no encontrados explícitamente**

* Loading.  
* Skeleton.  
* Toast.  
* Success message.  
* Error message.  
* Retry.  
* Empty state.  
* Disabled state.  
* Refreshing.  
* Optimistic update.  
* Realtime update visible.

## **16\. Formularios y datos de entrada**

No se encontró definición explícita de formularios frontend.

### **Formularios inferidos por acciones mencionadas, sin campos definidos**

| Formulario/acción | Información encontrada | Campos explícitos | Clasificación |
| ----- | ----- | ----- | ----- |
| Login | No aparece en este documento | No encontrados | Información faltante |
| Register | No aparece en este documento | No encontrados | Información faltante |
| Forgot password | No aparece | No encontrados | No encontrado |
| Create Household | Coordinador administra configuraciones; Hogar es unidad principal | No encontrados | Información parcial |
| Invite Member | Adulto invita personas; Coordinador aprueba ingresos | No encontrados | REAL MVP parcial |
| Join Household | Flujo invitación → aceptación → aprobación → ingreso | No encontrados | REAL MVP parcial |
| Profile | Cuenta incluye perfil/preferencias/idioma/configuración personal | No encontrados | Parcial |
| Create Task | Adulto crea y reasigna tareas; Task existe | No encontrados | REAL MVP parcial |
| Edit Task | No aparece explícitamente | No encontrados | Información faltante |
| Complete Task | Geni no completa tareas; responsabilidad humana; empleado familiar puede completar | No encontrados | REAL MVP parcial |
| Create Event | Adulto crea eventos; Adolescente crea eventos | No encontrados | REAL MVP parcial |
| Edit Event | Postergar equivale a modificar fecha | No encontrados | REAL MVP parcial |
| Settings | Settings: Hogar, Cuenta, Sistema, Auditoría | No encontrados | DEMO/Parcial |
| Create Automation | Automatización tiene trigger, condiciones, acciones, estado | No encontrados | POST\_MVP |

## **17\. Datos demo extraíbles**

| Dato/ejemplo | Uso posible | Clasificación |
| ----- | ----- | ----- |
| “Tres tareas pendientes desde el lunes” | Briefing/copy factual | MOCK / DEMO PREMIUM |
| “¿Querés que le recuerde sobre las tareas?” | Acción sugerida de Geni | DEMO PREMIUM |
| “Veo que estás revisando seguido la ubicación de \[nombre\]. ¿Querés que te ayude a coordinar algo?” | Guardrail Presence/Geni | POST\_MVP / DEMO |
| “Veo que estás prestando mucha atención a esto. ¿Querés que te ayude con algo?” | Copy Geni no acusatorio | DEMO PREMIUM |
| “SOS activado. Necesitás verlo ahora.” | Notificación crítica | DEMO PREMIUM |
| “¡Hola\! Hoy es un buen día para revisar tus gastos.” | Ejemplo de notificación NO justificada | Referencia de qué evitar |
| 87% de tareas | Ejemplo de carga familiar | MOCK / DEMO PREMIUM |
| 2 de 8 tareas | Ejemplo de progreso realista | MOCK / DEMO PREMIUM |
| Compras | Responsabilidad / categoría demo | REAL/DEMO |
| Mascotas | Responsabilidad / categoría demo | REAL/DEMO |
| Limpieza | Responsabilidad / categoría demo | REAL/DEMO |
| Vehículos | Responsabilidad / categoría demo | DEMO/POST\_MVP |
| Efectivo | Tipo cuenta financiera | DEMO PREMIUM |
| Mercado Pago | Tipo cuenta financiera | DEMO PREMIUM |
| Banco | Tipo cuenta financiera | DEMO PREMIUM |
| Tarjeta | Tipo cuenta financiera | DEMO PREMIUM |
| Sueldo | Tipo de ingreso | DEMO PREMIUM |
| Regalo | Tipo de ingreso | DEMO PREMIUM |
| Venta | Tipo de ingreso | DEMO PREMIUM |
| Reembolso | Tipo de ingreso | DEMO PREMIUM |
| Persona↔Persona | Tipo deuda | DEMO PREMIUM |
| Persona↔Familia | Tipo deuda | DEMO PREMIUM |
| Familia↔Externo | Tipo deuda | DEMO PREMIUM |
| Shampoo | Producto del hogar | DEMO PREMIUM |
| Jabón | Producto del hogar | DEMO PREMIUM |
| Papel higiénico | Producto del hogar | DEMO PREMIUM |
| Detergente | Producto del hogar | DEMO PREMIUM |
| En casa | Estado Presence | MOCK / DEMO PREMIUM |
| En trabajo | Estado Presence | MOCK / DEMO PREMIUM |
| En escuela | Estado Presence | MOCK / DEMO PREMIUM |
| En tránsito | Estado Presence | MOCK / DEMO PREMIUM |
| No molestar | Estado Presence | MOCK / DEMO PREMIUM |
| Descansando | Estado Presence | MOCK / DEMO PREMIUM |
| Emergencia grave | SOS demo | DEMO PREMIUM |
| Necesito ayuda | SOS demo | DEMO PREMIUM |
| Coordinación urgente | SOS demo | DEMO PREMIUM |
| Llegó a casa | Automatización demo | DEMO PREMIUM |
| Stock bajo | Automatización / Inventory demo | DEMO PREMIUM |
| Pago próximo | Automatización / Finance demo | DEMO PREMIUM |
| Mantenimiento pendiente | Automatización / Assets demo | DEMO PREMIUM |
| Cumpleaños próximo | Automatización demo | DEMO PREMIUM |

Faltan datos demo concretos como nombres de miembros, nombres de eventos, tareas específicas completas, fechas, horas, avatares, textos de empty states, mensajes de error y ejemplos visuales.

## **18\. Servicios frontend / APIs / datos**

No se encontró contrato API explícito en este documento.

### **Acciones o datos útiles para services, sin endpoint**

| Acción/dato | Módulo | Estado |
| ----- | ----- | ----- |
| Obtener Home por hogar | Home | Acción conceptual |
| Obtener Briefing | Home/Geni | MOCK/POST\_MVP |
| Obtener Atención Requerida | Home | Acción conceptual |
| Obtener tareas vencidas | Planner/Home | REAL MVP si Planner existe |
| Obtener próximos eventos | Calendar/Home | REAL MVP |
| Obtener tareas agrupadas por Responsabilidad | Planner/Home | REAL MVP |
| Obtener finanzas relevantes solo si hay alertas | Finance/Home | DEMO PREMIUM |
| Obtener presence resumido | Presence/Home | MOCK |
| Obtener actividad familiar | Feed/Home | MOCK |
| Listar miembros/membresías | People/Members | REAL MVP |
| Aprobar ingreso | Invitations/Members | REAL MVP |
| Cambiar roles | Members | REAL/PARCIAL |
| Expulsar miembro | Members | POST\_MVP o admin avanzado |
| Crear/reasignar tarea | Planner | REAL MVP parcial |
| Completar tarea | Planner | REAL MVP |
| Crear evento | Calendar | REAL MVP parcial |
| Modificar fecha de evento | Calendar | REAL MVP parcial |
| Crear tarea de compra por stock bajo | Inventory→Planner | POST\_MVP / DEMO |
| Generar recuerdo desde evento | Calendar→FamilyCloud | POST\_MVP / DEMO |
| Enviar notificación | Notifications | POST\_MVP |
| Registrar auditoría | Audit | POST\_MVP |
| Sincronizar offline | Offline | POST\_MVP |

### **Fuentes de datos detectadas**

* Hogar.  
* Cuenta.  
* Persona.  
* Membresía.  
* Rol.  
* Task.  
* Calendar.  
* Evento.  
* Goal.  
* Finance.  
* Presence.  
* Inventory.  
* Assets.  
* FamilyCloud.  
* Geni.  
* Notifications.  
* Audit.

### **Datos locales / mock**

El documento no dice “usar mock” literalmente, pero varios módulos son útiles para demo premium sin backend real:

* Briefing.  
* Carga Familiar.  
* Presence Resumido.  
* Actividad Familiar.  
* Finance cards.  
* Inventory cards.  
* Assets cards.  
* FamilyCloud cards.  
* Geni suggestions.  
* Automations.  
* Goals.

## **19\. Realtime / sincronización visible**

### **Información encontrada**

* Se prioriza sincronización en tiempo real sobre funcionalidad offline completa.  
* Offline permite lectura de datos ya cargados y acciones básicas como completar tareas o crear comentarios.  
* Modo offline disponible para:  
  * Ver tareas.  
  * Completar tareas.  
  * Crear comentarios.  
  * Ver eventos.  
  * Ver personas.  
  * Ver activos.  
  * Ver stock.  
  * Archivos descargados.  
* Resolución de conflictos offline: Last Write Wins.  
* Acciones offline conservan autor, fecha original y fecha de sincronización.  
* ColaSincronización almacena acciones pendientes.  
* ResoluciónConflictos resuelve conflictos.

Clasificación:

* Realtime/sync visible: POST\_MVP si no está implementado.  
* Para MVP demo, usar actualización local o refetch simple.  
* Offline completo: POST\_MVP.

### **Pantallas afectadas si se implementara**

* Home: tareas/eventos/alertas.  
* Planner: tareas/eventos.  
* People: miembros.  
* Inventory: stock.  
* Assets: activos.  
* FamilyCloud: archivos descargados.  
* Notifications: alertas.

## **20\. Permisos visibles en UI**

### **Coordinador**

Puede:

* Aprobar ingresos.  
* Cambiar roles.  
* Expulsar miembros.  
* Transferir coordinación.  
* Administrar configuraciones.

No puede:

* Acceder a memoria privada de Geni de otros miembros.  
* Acceder a metas privadas de otros miembros.  
* Acceder a documentos privados de otros miembros.  
* Acceder a finanzas personales de otros miembros.  
* Eliminar hogares.  
* Borrar historial de sus propias acciones.  
* Desactivar funciones del sistema para otros miembros.

Frontend:

* Mostrar botones de aprobación/cambio de rol/configuración solo si corresponde.  
* No mostrar accesos a datos privados.  
* Acciones unilaterales deben comunicar que quedan registradas.

Clasificación: REAL MVP parcial / POST\_MVP para auditoría completa.

### **Adulto**

Puede:

* Invitar personas.  
* Crear y reasignar tareas.  
* Crear eventos.  
* Administrar operaciones.

Frontend:

* Mostrar crear tarea/evento.  
* Mostrar invitar miembro si el MVP lo permite.  
* Mostrar visión operativa.

Clasificación: REAL MVP.

### **Adolescente**

Puede:

* Crear eventos.  
* Crear gastos.  
* Administrar tareas propias.  
* Recibir permisos adicionales.

Frontend:

* Foco en tareas, eventos y coordinación.  
* Limitar acciones críticas si no están permitidas.

Clasificación: REAL MVP parcial / DEMO para gastos.

### **Niño**

* Acceso simplificado.  
* No administra información familiar crítica.

Frontend:

* UI simplificada.  
* Ocultar acciones críticas.

Clasificación: REAL MVP si hay rol Child en demo; si no, referencia.

### **Adulto Mayor**

* Experiencia adaptada.  
* Prioriza personas, eventos, recordatorios, medicación y coordinación.  
* Permisos equivalentes a Adulto.

Frontend:

* Mayor claridad.  
* Priorizar eventos/medicación/recordatorios.  
* No se definen estilos concretos.

Clasificación: REAL MVP parcial / referencia UX.

### **Invitado**

* Acceso mínimo.  
* Participación limitada.

Frontend:

* Ocultar administración.  
* Mostrar acceso restringido.

Clasificación: REAL MVP si Guest existe en demo.

### **Empleado Familiar**

* Visión centrada en trabajo asignado.  
* No puede crear tareas.  
* Solo puede completar, comentar y adjuntar evidencia.  
* Acceso restringido a responsabilidades asignadas.

Clasificación: POST\_MVP / referencia.

## **21\. Integraciones visibles entre módulos**

| Relación | Descripción | Clasificación |
| ----- | ----- | ----- |
| Home → Planner | Home muestra tareas, vencidas, próximos eventos; navega a Planner/Calendar | REAL MVP |
| Home → Invitations/Members | Atención Requerida incluye aprobaciones pendientes | REAL MVP |
| Home → Finance | Finanzas Relevantes aparece solo con alertas | DEMO PREMIUM |
| Home → Presence | Presence Resumido muestra quién está en casa/quién viene | MOCK / DEMO PREMIUM |
| Home → Feed | Actividad Familiar es Feed resumido | MOCK / DEMO PREMIUM |
| Home → Geni | Briefing Geni es primer widget | MOCK / DEMO PREMIUM |
| Planner → Members | Persona asignada a Task; Persona participa en Evento | REAL MVP |
| Planner → Responsabilidad | Task pertenece a Responsabilidad | REAL MVP / parcial |
| Planner → Goals | Task avanza Goal | POST\_MVP / DEMO |
| Calendar → FamilyCloud | Evento genera Recuerdo | POST\_MVP / DEMO |
| Inventory → Planner | Stock bajo puede sugerir tarea de compra | DEMO PREMIUM / POST\_MVP |
| Assets → Planner | MantenimientoAsset genera Task | DEMO PREMIUM / POST\_MVP |
| Automations → Planner | Automatización crea Task/Evento | POST\_MVP |
| Geni → Planner | Geni crea/sugiere Task, analiza patrones | MOCK / POST\_MVP |
| Geni → Home | Geni genera Briefing | MOCK / DEMO PREMIUM |
| Geni → Notifications | Recomendación/patrón detectado produce notificación | POST\_MVP |
| SOS → Home | SOS activo desplaza contenido | DEMO PREMIUM / POST\_MVP real |
| SearchGlobal → Geni | Búsqueda contextual cruzada | POST\_MVP |
| Household → todos | Cada hogar separa Home, Planner, Finance y memoria familiar | REAL MVP para hogar activo |

## **22\. Edge cases frontend**

| Caso | Información encontrada | Clasificación |
| ----- | ----- | ----- |
| Tarea vencida | Se muestra; vencida es cálculo, no estado | REAL MVP |
| Patrón de tareas vencidas | Geni sugiere reorganización/redistribución | MOCK / POST\_MVP |
| Tarea asignada | Notificación inmediata al responsable | POST\_MVP real / referencia UX |
| Tarea próxima a vencer | Recordatorio al responsable | POST\_MVP real / referencia UX |
| Tarea completada | Widget de Home puede desaparecer al completar | REAL MVP |
| Geni intenta actuar sin permiso | No debe actuar sin aprobación explícita | REAL MVP como prohibición |
| Geni completa tarea | Nunca debe completar tareas automáticamente | REAL MVP como prohibición |
| Evento postergado | No existe estado Postergado; se modifica fecha | REAL MVP |
| Conflicto de horarios | Alerta proactiva con sugerencia | MOCK / POST\_MVP |
| Miembro pendiente | Membresía Pendiente; aprobación pendiente en Home | REAL MVP |
| Miembro suspendido | Estado detectado | REAL/PARCIAL |
| Miembro finalizado | Estado detectado | REAL/PARCIAL |
| Coordinador elimina hogar | Prohibido | REAL MVP |
| Coordinador accede a privados | Prohibido | REAL MVP |
| Acción unilateral del Coordinador | Queda auditada y visible | POST\_MVP para audit completo |
| Último coordinador | No se encontró información específica |  |
| Invitación expirada | No se encontró información específica |  |
| Invitación ya usada | No se encontró información específica |  |
| Token inválido/expirado | No se encontró información específica |  |
| Credenciales inválidas | No se encontró información específica |  |
| Usuario sin hogar | No se encontró información específica |  |
| Error de red | No se encontró información específica |  |
| Offline | Offline limitado; completar tareas posible; SOS no disponible offline | POST\_MVP |
| SOS accidental | Ventana breve para cancelar | DEMO PREMIUM |
| SOS activo | Desplaza contenido en Home | DEMO PREMIUM |
| Privacy conflict | Datos privados no se comparten automáticamente | REAL MVP |
| Multi-hogar | Selector solo con 2+ hogares; memoria no se comparte | POST\_MVP |

## **23\. Copywriting y labels**

### **Textos explícitos**

* “Tres tareas pendientes desde el lunes”  
* “¿Querés que le recuerde sobre las tareas?”  
* “Veo que estás revisando seguido la ubicación de \[nombre\]. ¿Querés que te ayude a coordinar algo?”  
* “Veo que estás prestando mucha atención a esto. ¿Querés que te ayude con algo?”  
* “SOS activado. Necesitás verlo ahora.”  
* “¡Hola\! Hoy es un buen día para revisar tus gastos.” — ejemplo de notificación NO justificada.

### **Labels de navegación**

* Home.  
* People.  
* `+`.  
* Planner.  
* More.  
* Settings.  
* QuickActions.  
* SearchGlobal.  
* MultiHogarSelector.

### **Labels Home**

* Briefing Geni.  
* Atención Requerida.  
* Carga Familiar.  
* Próximos Eventos.  
* Tareas.  
* Finanzas Relevantes.  
* Presence Resumido.  
* Actividad Familiar.

### **Labels roles**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

### **Labels estados**

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.  
* En progreso.  
* Completada.  
* Cancelada.  
* Programado.  
* Completado.  
* Activo.  
* Cerrado.  
* Pagada.  
* Vencida.  
* En casa.  
* En trabajo.  
* En escuela.  
* En tránsito.  
* No molestar.  
* Descansando.  
* Crítica.  
* Alta.  
* Media.  
* Baja.

### **Reglas de tono**

* Datos sin juicio.  
* No acusar.  
* No suavizar métricas reales.  
* No celebrar fracaso falsamente.  
* No usar notificaciones irrelevantes.  
* Usar lenguaje accionable.

## **24\. Restricciones técnicas frontend**

No se encontró información específica sobre:

* Stack frontend.  
* Expo.  
* React Native.  
* Supabase.  
* Realtime técnico.  
* Storage técnico.  
* Edge Functions.  
* Librerías disponibles.  
* Librerías ausentes.  
* Platform differences.  
* Performance técnica.  
* Design tokens.  
* Implementación de servicios.

Sí se encontró:

* Priorizar sincronización en tiempo real sobre offline completo.  
* Offline limitado.  
* Last Write Wins para conflictos offline.  
* Acciones offline conservan autor, fecha original y fecha de sincronización.  
* More no contiene dashboards.  
* Settings vive en More.  
* MultiHogarSelector vive en header.  
* Geni no tiene tab propio.  
* Más de 4 niveles de navegación es fallo.  
* Objetivo: 95% de acciones en 3 niveles o menos.

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Planner simple vs Planner avanzado | El documento incluye Subtareas, Comentarios, Adjuntos, Timeline, Dependencias, Recurrencia, Goals | Mantener MVP en Tasks/Events/Calendar; dejar avanzado como POST\_MVP |
| Estados de Task | Documento define Pendiente/En progreso/Completada/Cancelada; otros documentos podrían exigir pending/completed/awaiting\_verification/verified | No resolver aquí; mapear en merge |
| Verificación | Documento dice que verificación no genera estado separado | Contrastar con specs MVP de verification flow |
| Home real vs Geni real | Home depende de Briefing Geni, pero IA real puede no existir | Implementar briefing MOCK |
| Carga Familiar real | Documento exige mostrar esfuerzo real, pero cálculo puede no estar implementado | Usar MOCK o métrica simple si hay datos |
| Presence real vs demo | Presence incluye GPS, geocercas e historial | Usar Presence resumido MOCK; no GPS real |
| Finance real vs demo | Finance tiene muchas entidades | Usar DEMO PREMIUM; no backend real |
| Inventory/Assets generan Tasks | Integración futura puede complicar Planner | Mostrar como relación demo, no automatización real |
| Auditoría | Coordinador debe tener acciones auditadas, pero audit completo es avanzado | Para MVP, mostrar mensajes/registro simple si existe; no construir audit completo desde esta fuente |
| Multi-hogar | Documento contempla varios hogares | Mantener fuera salvo active household mínimo |
| Quick Actions | Crear tarea/evento no aparece literalmente como acción rápida | Marcar como propuesta derivada en spec final |
| More | More no debe tener dashboards, pero módulos demo podrían querer cards ricas | More debe ser acceso/lista; dashboards dentro de cada módulo demo |
| Notifications | Documento habla de Push/Email/In-App | No implementar Push/Email real; usar feedback local/mock |
| SOS | SOS tiene prioridad máxima, pero real es delicado | Solo demo visual si se incluye |
| Feed en Tier 1 | Documento ubica Feed como uso diario, pero MVP actual puede no incluir Feed real | Tratar como DEMO PREMIUM/Actividad Familiar mock |

## **26\. Información faltante**

| Falta | Impacto |
| ----- | ----- |
| Design tokens | No permite definir estilo visual premium exacto |
| Colores/tipografía | Se necesita otro documento visual |
| Layouts de pantalla | No hay wireframes ni capturas |
| Componentes concretos | Faltan props, variantes, tamaños |
| Estados loading/error/empty | Deben venir de otro documento o definirse después |
| Formularios y campos | No se pueden implementar formularios desde esta fuente |
| Endpoints/API | No hay servicios concretos |
| Request/response | No hay contratos |
| Validaciones | No aparecen reglas por campo |
| Datos mock completos | Hay categorías/labels, pero faltan objetos demo |
| Navegación post-login | No aparece flujo Auth completo |
| Auth UI | No hay Login/Register/Forgot visual |
| Household create/join UI | Solo aparece concepto |
| Invitations UI | Solo aparece flujo conceptual |
| Members UI | Faltan cards/listas detalladas |
| Planner UI | Faltan pantallas, filtros, formularios |
| Calendar UI | Faltan vistas día/semana/mes |
| More visual | Falta estructura exacta de lista/cards |
| Settings visual | Falta detalle |
| Quick Actions items exactos | Solo estructura general |
| Realtime UI | No se define cómo se ve actualización entre dispositivos |
| Permisos finos | Hay permisos generales, faltan condiciones exactas por acción |
| Copy final | Hay ejemplos, no textos completos |
| Accesibilidad | No se menciona explícitamente |
| Animaciones | No se menciona |
| Haptics | No se menciona |
| Librerías | No se menciona |

## **27\. Fragments recomendados desde este documento**

| Fragment | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Bajo/Medio | No hay tokens visuales, pero sí jerarquía y criterios de claridad |
| `navigation_fragment` | Sí | Alto | Bottom Nav, Quick Actions, More, Settings, MultiHogarSelector, reglas de niveles |
| `home_frontend_fragment` | Sí | Alto | Home tiene estructura oficial completa |
| `planner_frontend_fragment` | Sí | Alto | Planner/Task/Calendar/Responsabilidad tienen reglas útiles |
| `people_members_frontend_fragment` | Sí | Medio/Alto | Roles, membresía, invitaciones, permisos |
| `household_invites_frontend_fragment` | Parcial | Medio | Hay flujo invitación→aceptación→aprobación→ingreso, pero no UI |
| `auth_onboarding_frontend_fragment` | Parcial | Bajo/Medio | Principios de onboarding, pero no pantallas Auth |
| `quick_actions_frontend_fragment` | Sí | Medio | Estructura clara; faltan items exactos |
| `more_settings_frontend_fragment` | Sí | Medio | More/Settings definidos a nivel navegación |
| `finance_demo_fragment` | Sí | Medio | Hay entidades y datos demo útiles |
| `inventory_demo_fragment` | Sí | Medio | Hay entidades, campos y ejemplos de productos |
| `assets_demo_fragment` | Sí | Medio | Hay tipos de activos y relación con tareas |
| `familycloud_demo_fragment` | Sí | Medio | Hay recuerdos/documentos/álbumes/papelera |
| `presence_demo_fragment` | Sí | Medio | Hay estados, check-in, ubicación resumida |
| `geni_demo_fragment` | Sí | Alto | Geni tiene principios, copy, restricciones y briefing |
| `mock_data_fragment` | Sí | Medio | Hay labels, categorías, roles, estados y ejemplos |
| `ux_states_fragment` | Sí | Medio | Hay muchos estados conceptuales; faltan loading/error |
| `frontend_services_fragment` | Parcial | Bajo | Hay acciones conceptuales, no endpoints |

## **28\. Conclusión operativa**

Este documento debe usarse como base transversal para el frontend premium MVP de HomePlus. No define diseño visual detallado, pero sí define con bastante fuerza cómo debe organizarse la app, qué debe verse primero, qué debe ser real, qué puede ser demo y qué debe quedar fuera.

Lo más importante para la futura spec `frontend_premium_mvp_spec.md`:

* Bottom Nav fijo: Home, People, `+`, Planner, More.  
* Home como pantalla inicial, no configurable.  
* Home ordenado por: Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, Tareas, Finanzas Relevantes, Presence Resumido, Actividad Familiar.  
* Home resume; los módulos administran.  
* Planner/Tasks/Calendar son uso diario y deben estar en navegación primaria.  
* More es acceso a dominios/settings, no dashboard.  
* Quick Actions se abre desde `+`; Geni aparece primero.  
* Roles oficiales afectan experiencia y permisos visibles.  
* Tareas, eventos y responsabilidades compartidas son visibles.  
* Datos privados personales no se exponen automáticamente.  
* Tareas vencidas y esfuerzo desigual no se ocultan.  
* Geni real queda POST\_MVP; Briefing y sugerencias pueden ser MOCK/DEMO.  
* Finance, Inventory, Assets, FamilyCloud, Presence, Feed, Automations, Goals y SOS pueden alimentar una demo premium visual, pero no deben convertirse en backend real desde este documento.  
* El MVP real debe concentrarse en Auth/Household/Members/Invitations/Planner/Home con datos reales donde sea necesario para demo.  
* La app debe sentirse clara, rápida, accionable, mobile-first y no invasiva.

Este fragment debe fusionarse con documentos visuales, specs técnicas, capturas/Figma, mapas frontend y contratos API para completar pantallas, componentes, servicios, estados UX y datos demo concretos.

---

# **SOURCE 03 — FILOSOFÍA**

## **Archivo recomendado**

`Seccion 3 Filosofia.txt`

## **Tipo de documento**

Filosofía de producto

## **Uso para frontend**

Extraer:

* personalidad del producto;  
* experiencia emocional esperada;  
* estilo de interacción;  
* principios de calma, ayuda, acompañamiento;  
* cosas que la UI debe evitar.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_SECCION\_3\_FILOSOFIA**

## **1\. Fuente**

* Documento: `HomePlus — SECCION 3 FILOSOFIA.md`  
* Archivo de comprensión asociado disponible en el chat: `Seccion 3 Filosofia.txt`  
* Tipo de documento: Filosofía de producto / reglas operativas / principios sistémicos.  
* Alcance del documento: Define postura fundacional, polaridades resueltas, transparencia, coordinación familiar, escalamiento, tono de Geni, adopción gradual, Home como centro operativo, Planner/Tasks/Calendar como núcleo obligatorio y módulos complementarios como expansión progresiva.  
* Nivel de utilidad frontend: **Medio-Alto**  
* Motivo: No define pantallas completas ni diseño visual detallado, pero sí contiene reglas frontend críticas para navegación, Home, Planner, Quick Actions, roles visibles, copywriting, estados de alerta, cards/resúmenes, dashboards, módulos demo y tono premium.

---

## **2\. Utilidad frontend del documento**

Este documento aporta una base fuerte para el **comportamiento, tono, jerarquía y experiencia global** del frontend de HomePlus.

Aporta especialmente:

* HomePlus debe sentirse como un sistema operativo del hogar, no como app de productividad.  
* La app debe estar siempre disponible, pero nunca ser invasiva.  
* Debe actuar proactivamente sin generar ansiedad.  
* Debe sostener sin controlar.  
* Debe recordar sin acusar.  
* Debe forzar conversaciones necesarias sin convertirse en juez.  
* La coordinación del hogar requiere visibilidad de tareas, calendario, carga y esfuerzo.  
* Home debe funcionar como centro operativo.  
* Planner y Calendar son núcleo obligatorio desde el día 1\.  
* Home resume; los módulos administran.  
* Quick Actions existe como botón central `+` dentro del Bottom Nav.  
* More agrupa herramientas especializadas como Finance, Inventory y FamilyCloud.  
* Geni es capa transversal, no tab propio.  
* Los mensajes deben ser factuales, cálidos y no acusatorios.  
* Los datos importantes deben estar visibles siempre, pero las alertas activas deben aparecer solo cuando importan.  
* Varias funciones avanzadas deben quedar como DEMO PREMIUM, MOCK o POST\_MVP para el MVP actual.

---

## **3\. Información de producto aplicable al frontend**

### **3.1 Sistema operativo del hogar**

Clasificación: **REAL MVP / principio global**

Información encontrada:

* HomePlus no es una app de productividad.  
* HomePlus no es un CRM del hogar.  
* HomePlus no es un gestor de proyectos con avatares familiares.  
* HomePlus es el sistema operativo del hogar.  
* HomePlus es un sistema de soporte vital para la coordinación familiar.  
* Debe estar siempre disponible pero nunca invasivo.  
* Debe actuar proactivamente sin generar ansiedad.  
* Debe sostener sin controlar.  
* Debe recordar sin acusar.  
* Debe forzar conversaciones necesarias sin convertirse en juez.

Aplicación frontend:

* La app debe sentirse como centro de coordinación familiar, no como app de tareas aislada.  
* El Home debe priorizar estado del hogar, tareas, eventos, atención requerida y carga.  
* Las pantallas deben reducir carga mental.  
* Las alertas deben ser claras pero no agresivas.  
* Los módulos deben sentirse integrados, no como apps separadas.

### **3.2 Hacer visible lo invisible**

Clasificación: **REAL MVP / principio global**

Información encontrada:

* HomePlus existe para hacer visible lo invisible.  
* No tolera la invisibilidad del esfuerzo.  
* No permite que el caos persista por omisión.  
* Detecta cuando una persona sostiene el hogar sola y lo hace visible.  
* Si un miembro no completa sus responsabilidades, lo registra, alerta y escala.  
* No resuelve problemas automáticamente; fuerza a que la familia los enfrente.

Aplicación frontend:

* Mostrar tareas pendientes y completadas.  
* Mostrar responsables.  
* Mostrar carga familiar.  
* Mostrar tareas vencidas.  
* Mostrar patrones de incumplimiento.  
* Mostrar próximos eventos.  
* Mostrar dashboards o cards de distribución.  
* Mostrar alertas con tono factual.

### **3.3 Transparencia forzada en coordinación**

Clasificación: **REAL MVP / principio global**

Información encontrada:

La transparencia no es negociable en tres áreas:

* Tareas del hogar.  
* Finanzas compartidas.  
* Calendario familiar.

Para el MVP actual:

* Tasks y Calendar aplican como REAL MVP.  
* Finance puede quedar como DEMO PREMIUM/MOCK si no se implementa backend real.

Reglas explícitas:

* Todos ven quién hizo qué.  
* Todos ven quién no cumplió.  
* Todos ven cómo se distribuye la carga.  
* Nadie puede ocultar tareas completadas ni pendientes.  
* Todos ven compromisos del calendario compartido.  
* Nadie puede ocultar un evento del calendario familiar.  
* Si el dato es necesario para coordinar el hogar, es transparencia forzada.  
* Si el dato es sobre vida interna/personal, es autonomía protegida.

Aplicación frontend:

* Las cards de tareas deben mostrar responsable y estado.  
* Las tareas vencidas no deben ocultarse.  
* Las tareas completadas deben poder verse.  
* Los eventos familiares deben ser visibles.  
* La Home debe resumir información operativa.  
* Las configuraciones personales, como notificaciones, pueden ser controladas por el usuario.

### **3.4 Autonomía protegida**

Clasificación: **REAL MVP / POST\_MVP según módulo**

Información encontrada:

Autonomía protegida existe en:

* Ubicación en tiempo real.  
* Notificaciones.  
* Feed familiar.  
* Módulos complementarios.  
* Historial de ubicaciones.  
* Documentos.  
* Fondos.

Aplicación frontend:

* Notificaciones pueden ser configurables visualmente.  
* Presence GPS real no debe forzarse en MVP.  
* Feed puede ser DEMO PREMIUM o fuera de implementación real.  
* Módulos complementarios pueden aparecer como demo o bloqueados/progresivos.  
* Privacidad debe comunicarse con copy claro.

### **3.5 Geni como asistente no invasivo**

Clasificación: **DEMO PREMIUM / MOCK / POST\_MVP según profundidad**

Información encontrada:

Geni nunca:

* Reasigna automáticamente una tarea.  
* Cambia eventos del calendario sin confirmación humana.  
* Perdona deudas o gastos sin decisión familiar.  
* Toma decisiones operativas del hogar en nombre de la familia.  
* Marca tareas completadas automáticamente.

Geni siempre:

* Detecta problemas antes de que exploten.  
* Alerta al responsable primero.  
* Escala al coordinador si el responsable no actúa.  
* Presenta patrones a la familia si el problema persiste.

Aplicación frontend:

* Geni puede aparecer como card, briefing, mensaje contextual o slot fijo en Quick Actions.  
* En MVP, Geni puede ser MOCK/DEMO PREMIUM.  
* El frontend no debe sugerir que Geni ejecutó decisiones críticas automáticamente.  
* Las acciones propuestas por Geni deben requerir decisión humana.

### **3.6 Simplicidad visual y adopción progresiva**

Clasificación: **REAL MVP / DEMO PREMIUM**

Información encontrada:

* HomePlus no permite adopción modular fragmentada.  
* No se puede usar solo calendario y desactivar tareas.  
* No debe abrumar con todo el sistema el primer día.  
* Núcleo obligatorio desde onboarding:  
  * Calendario familiar.  
  * Tareas del hogar.  
  * Feed familiar.  
* Módulos avanzados se desbloquean progresivamente.  
* Módulos complementarios se activan cuando la familia está lista.

Aplicación frontend:

* El Home debe mostrar núcleo operativo primero.  
* More puede contener módulos secundarios/demo.  
* Finance, Inventory, FamilyCloud y similares pueden aparecer como módulos premium visuales.  
* Onboarding debe conducir a calendario y tareas sin sobrecarga.  
* La app puede mostrar módulos complementarios como disponibles, sugeridos o demo.

---

## **4\. Navegación y arquitectura de pantallas**

### **Información encontrada**

Clasificación: **REAL MVP / DEMO PREMIUM**

Desde el archivo de comprensión:

* `BottomNav` contiene:  
  * Home.  
  * People.  
  * QuickActions.  
  * Planner.  
  * More.  
* `QuickActions` es botón `+` central.  
* `QuickActions` abre un panel flotante con acciones rápidas.  
* Geni es slot fijo dentro de QuickActions.  
* `Home` es pantalla principal.  
* `Home` navega a:  
  * Planner.  
  * Calendar.  
  * Finance.  
* `More` contiene:  
  * Finance.  
  * Inventory.  
  * FamilyCloud.  
  * Settings.  
* `SearchGlobal` indexa:  
  * People.  
  * Planner.  
  * Finance.  
  * Presence.  
  * Inventory.  
  * Assets.  
  * FamilyCloud.  
  * Feed.  
* `SelectorHogar` cambia contexto de Hogar.  
* Geni no es tab propio; opera como capa transversal.

### **Arquitectura aplicable**

#### **Bottom Nav**

Clasificación: **REAL MVP**

Estructura detectada:

* Home.  
* People.  
* `+`.  
* Planner.  
* More.

Uso recomendado desde este documento:

* Home: centro operativo.  
* People: miembros/personas.  
* `+`: Quick Actions.  
* Planner: Tasks/Calendar/Goals futuro.  
* More: herramientas especializadas.

#### **Quick Actions**

Clasificación: **REAL MVP / DEMO PREMIUM**

* Botón central `+`.  
* Panel flotante.  
* Acciones rápidas.  
* Slot fijo de Geni.

Acciones concretas no aparecen en este documento. No inventar como contrato, pero sí queda claro que el patrón existe.

#### **Home**

Clasificación: **REAL MVP / MOCK / DEMO PREMIUM**

* Pantalla principal.  
* Resume información.  
* No administra.  
* Contiene widgets y cards.

#### **More**

Clasificación: **DEMO PREMIUM**

* Sección de herramientas especializadas.  
* Contiene módulos secundarios.  
* Puede alojar Finance, Inventory, FamilyCloud y Settings.

#### **SearchGlobal**

Clasificación: **POST\_MVP / DEMO PREMIUM**

* Buscador universal.  
* Indexa dominios.  
* Ejecuta acciones.  
* Acceso a Settings.  
* Para MVP puede quedar fuera o visual/demo si no hay implementación real.

---

## **5\. Pantallas detectadas**

| Pantalla | Objetivo | Qué muestra | Acciones | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo del hogar | Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, Actividad Familiar | Navegar a Planner, Calendar, Finance según relaciones detectadas | REAL MVP para resumen; MOCK/DEMO para widgets avanzados |
| Planner | Núcleo operativo | Tasks, Calendar, Goals, Responsabilidades | Administrar tareas/calendario según módulo | REAL MVP para Tasks/Events/Calendar mínimo; POST\_MVP para Goals |
| Calendar | Eventos familiares/personales | Eventos, próximos eventos | Ver eventos; cambios requieren confirmación humana | REAL MVP mínimo |
| People | Coordinación humana | Personas, Membership, Feed, Presence según archivo de comprensión | Ver miembros; potencial relación con roles | REAL MVP para miembros básico; DEMO/POST\_MVP para Feed/Presence |
| More | Herramientas especializadas | Finance, Inventory, FamilyCloud, Settings | Abrir módulos secundarios | DEMO PREMIUM |
| QuickActions panel | Acciones rápidas | Panel flotante; Geni como slot fijo | Acciones rápidas no detalladas | REAL MVP patrón; acciones específicas dependen de otros documentos |
| Settings | Configuración | Acceso desde SearchGlobal/More según comprensión | Configuración no detallada | DEMO PREMIUM / parcial |
| Finance | Administración financiera | Cuentas, gastos, ingresos, presupuestos, fondos, deudas según comprensión | No detallado en UI | DEMO PREMIUM / POST\_MVP |
| Inventory | Stock del hogar | Consumibles, medicamentos, vencimientos, lista de compras | No detallado en UI | DEMO PREMIUM / POST\_MVP |
| Assets | Activos importantes | Vehículos, mascotas, dispositivos, propiedades, mantenimiento | No detallado en UI | DEMO PREMIUM / POST\_MVP |
| FamilyCloud / HomeCloud | Memoria documental/emocional | Recuerdos, álbumes, documentos | No detallado en UI | DEMO PREMIUM / POST\_MVP |
| Presence | Coordinación de ubicación/disponibilidad | Ubicación, lugares, check-ins, estado presence | No detallado en UI | MOCK / DEMO PREMIUM; GPS real POST\_MVP |
| Feed | Espacio social del hogar | Posts, comentarios, reacciones | Participación opcional | DEMO PREMIUM / POST\_MVP |
| SOS | Sistema de emergencias | 3 niveles de SOS según comprensión | Emitir SOS | DEMO PREMIUM visual; real fuera de MVP |
| Automations | Motor SI ocurre X → ENTONCES Y | Automatizaciones | Crear/usar automatización | POST\_MVP / DEMO si se muestra |

---

## **6\. Componentes y patrones UI reutilizables**

### **Cards / Widgets**

Clasificación: **REAL MVP / DEMO PREMIUM / MOCK**

Detectados:

* Briefing.  
* Atención Requerida.  
* Carga Familiar.  
* Próximos Eventos.  
* Actividad Familiar.  
* Dashboards de distribución de tareas.  
* Próximos vencimientos.  
* Alertas de Geni.  
* Cards de módulos complementarios sugeridos.

Aplicación:

* Home debe organizarse en widgets/cards.  
* Planner puede usar cards de tarea, carga y vencimientos.  
* Finance/Inventory/FamilyCloud pueden aparecer como cards demo en More/Home.

### **Dashboards**

Clasificación: **REAL MVP / MOCK**

Información encontrada:

* Dashboard muestra distribución de tareas semanal/mensual.  
* Dashboard muestra próximos vencimientos.  
* Dashboard puede mostrar asimetrías.  
* Datos visibles siempre; alertas solo cuando importa.

### **Badges / Pills / Estados**

Clasificación: **REAL MVP / DEMO PREMIUM**

Estados extraíbles:

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.  
* Programado.  
* Completado.  
* Cancelado.  
* Activa / Completada / Fallida para Goal.  
* Crítica / Alta / Media / Baja para notificaciones.  
* Tarea vencida.  
* Tarea crítica.  
* Patrón emergente.  
* Patrón confirmado.  
* Carga asimétrica.

### **Alertas / Banners**

Clasificación: **REAL MVP / MOCK**

Detectados:

* Recordatorio privado.  
* Alerta privada.  
* Alerta al coordinador.  
* Exposición del patrón a toda la familia.  
* Alerta por asimetría \> 40%.  
* Alerta por deuda interna \> 30 días.  
* Alerta por tarea crítica incumplida.  
* Alerta por patrón confirmado 3+ semanas.

### **Bottom Nav**

Clasificación: **REAL MVP**

* Home.  
* People.  
* `+`.  
* Planner.  
* More.

### **Floating Action Button / Botón central \+**

Clasificación: **REAL MVP**

* Botón central `+`.  
* Abre Quick Actions.  
* Panel flotante.  
* Geni slot fijo.

### **Avatares / Personas / Roles**

Clasificación: **REAL MVP / DEMO PREMIUM**

No se describen avatares visualmente, pero existen entidades Persona, Membership y roles. El frontend puede necesitar mostrar:

* Nombre.  
* Rol.  
* Estado de membership.  
* Relación con tareas/eventos.

No se especifican iniciales, colores ni visual exacto.

### **Progress / Métricas**

Clasificación: **MOCK / DEMO PREMIUM / REAL si hay datos**

Detectado:

* Distribución porcentual de carga.  
* Tareas completadas por miembro.  
* Tendencias semanales.  
* Carga familiar.  
* Goal con progreso vía Fondo queda POST\_MVP.

---

## **7\. Visual design aplicable**

### **Información explícita**

No se encontró información específica sobre:

* Colores.  
* Gradientes.  
* Blur.  
* Glassmorphism.  
* Sombras.  
* Bordes.  
* Radios.  
* Spacing.  
* Tipografía.  
* Iconografía concreta.  
* Estilo iOS.  
* Tamaño de botones.  
* Componentes visuales con medidas.

### **Tono visual deducible directamente del documento**

Clasificación: **REAL MVP / principio visual**

El documento sí establece sensación y tono:

* Siempre disponible, nunca invasivo.  
* Proactivo sin ansiedad.  
* Sostener sin controlar.  
* Recordar sin acusar.  
* Factual, cálido, no efusivo.  
* Números \+ contexto \+ tono humano.  
* No usar adjetivos valorativos.  
* No usar 3+ emojis.  
* Usar un emoji cuando el tono lo amerite:  
  * 💜 reconocimiento.  
  * ⚠️ alertas urgentes.  
  * 🎯 logros cumplidos.  
* No usar emojis genéricos de celebración como 🎉🎊🥳.

### **Aplicación visual**

* UI clara.  
* Alertas visibles pero no agresivas.  
* Jerarquía fuerte para datos importantes.  
* Evitar ruido constante.  
* Cards informativas.  
* Dashboard honesto.  
* Copy cálido y factual.

---

## **8\. Home**

### **Rol de Home**

Clasificación: **REAL MVP**

Información encontrada:

* Home es centro operativo.  
* Home resume información, no administra.  
* Home es punto de entrada principal inmutable.  
* Home está alimentado por Geni.  
* Home navega a Planner.  
* Home navega a Calendar.  
* Home navega a Finance.

### **Widgets detectados**

| Widget | Qué muestra | Clasificación |
| ----- | ----- | ----- |
| Briefing | Card única con resumen Geni; versión resumida \+ ampliada | MOCK / DEMO PREMIUM |
| Atención Requerida | Elementos urgentes: SOS, tareas vencidas, pagos vencidos, aprobaciones | REAL para tareas/aprobaciones si existen; DEMO/MOCK para SOS/pagos |
| Carga Familiar | Distribución de carga de tareas | MOCK o REAL según datos Planner; útil para demo |
| Próximos Eventos | Próximos eventos del calendario | REAL MVP si Calendar real |
| Actividad Familiar | Alimentado por Feed | DEMO PREMIUM / MOCK |
| Presence en Home | Presence aparece en Home | MOCK / DEMO PREMIUM |

### **Home con Planner**

Clasificación: **REAL MVP**

* Task aparece en Home.  
* Calendar alimenta PróximosEventos.  
* Home navega a Planner.  
* Home navega a Calendar.  
* Atención Requerida puede mostrar tareas vencidas.  
* Carga Familiar muestra distribución de tareas.

### **Home con módulos demo**

Clasificación: **DEMO PREMIUM / MOCK**

* Finance aparece en Home.  
* Presence aparece en Home.  
* Feed aparece en Home.  
* Briefing generado por Geni puede ser mock.  
* Actividad Familiar alimentada por Feed puede ser mock.  
* Carga Familiar puede simularse si no hay cálculo real.

### **Copy útil para Home**

* “HomePlus no esconde la realidad del hogar. Todos los datos están disponibles siempre. Pero Geni no te bombardea con alertas — solo te avisa cuando algo realmente importa.”  
* “La familia completó las 18 tareas asignadas esta semana. Es la primera vez en 3 semanas que todas las tareas se cumplen. 💜”  
* “La distribución de tareas esta semana fue: Valeria 83%, Tomás 11%, Roberto 6%.”  
* “La distribución de tareas viene cambiando en las últimas 3 semanas. Semana 1: 60-40. Semana 2: 65-35. Semana 3: 70-30. La carga sobre Valeria está aumentando.”

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

Clasificación: **REAL MVP / POST\_MVP según submódulo**

Información encontrada:

* Planner es núcleo operativo.  
* Administra Tasks, Calendar y Goals.  
* Responsabilidades son eje organizador.  
* Planner contiene:  
  * Task.  
  * Calendar.  
  * Goal.  
  * Responsabilidad.  
* BottomNav contiene Planner.  
* Home navega a Planner.  
* SearchGlobal indexa Planner.  
* OfflineMode soporta Planner, pero Offline Sync queda POST\_MVP.

### **Tasks**

Clasificación: **REAL MVP**

Información encontrada:

* Las tareas del hogar son núcleo de coordinación.  
* Todos ven quién hizo qué.  
* Todos ven quién no cumplió.  
* Todos ven distribución de carga.  
* Nadie puede ocultar tareas completadas ni pendientes.  
* Geni no puede marcar tareas completadas automáticamente.  
* Geni no puede reasignar automáticamente una tarea.  
* Geni puede recordar, alertar, escalar y mostrar patrones.  
* Task aparece en Home.  
* Auditoría trackea Task, pero auditoría completa queda POST\_MVP.  
* Task se asocia con Persona.  
* Task pertenece a Responsabilidad.  
* Plantilla aplica a Task.  
* Task puede tener Verificación según comprensión.  
* Task puede avanzar Goal, pero Goals queda POST\_MVP.

Estados detectados en archivo de comprensión:

* Pendiente.  
* En progreso.  
* Completada.  
* Cancelada.

Estados/labels operativos detectados en documento principal:

* Vence en 1 hora.  
* Vence en 2 horas.  
* Vencida.  
* Venció hace 2 horas.  
* Venció hace 3 horas.  
* Primera falta.  
* Segunda falta.  
* Tercera falta.  
* Patrón emergente.  
* Patrón confirmado.  
* Tarea crítica incumplida.  
* Tarea no crítica.  
* Completada.

Ejemplos de tareas:

* `lavar los platos`.  
* `sacar la basura`.  
* `comprar medicación`.  
* Tareas asignadas.  
* Tareas livianas.  
* Tareas medianas.  
* Tareas que requieren más tiempo.

Ejemplos de métricas:

* Valeria completó 15 tareas.  
* Tomás completó 2\.  
* Roberto completó 1\.  
* 18 tareas semanales.  
* Valeria 83%, Tomás 11%, Roberto 6%.  
* Valeria 88%, Tomás 12%.  
* Valeria 57%, Tomás 43%.  
* Semana 1: 60-40.  
* Semana 2: 65-35.  
* Semana 3: 70-30.  
* Tomás no completó 8 de las últimas 10 tareas.  
* Tomás no completó sacar la basura en 4 de las últimas 5 semanas.  
* Valeria cubrió la tarea 3 veces.

### **Task verification**

Clasificación: **REAL MVP si otros documentos lo confirman / parcial en este documento**

Información encontrada:

* Verificación aparece como feature de Task en archivo de comprensión.  
* No se define flujo frontend.  
* No se definen estados técnicos.  
* No se define quién verifica.  
* No se define UI.

### **Task advanced features**

Clasificación: **POST\_MVP**

Detectado:

* Subtarea.  
* Dependencia.  
* Recurrencia.  
* Timeline.  
* Comentario.  
* Adjunto.  
* Auditoría completa.  
* Automatizaciones que crean tareas.  
* Task generada desde Asset.  
* Task generada desde Consumible.  
* Medicamento genera tarea.  
* GeniPlanner real.  
* Offline sync.

### **Calendar / Events**

Clasificación: **REAL MVP mínimo**

Información encontrada:

* Calendario familiar es núcleo obligatorio.  
* Todos ven compromisos de todos.  
* Nadie puede ocultar evento del calendario familiar.  
* Calendar contiene Event.  
* Calendar alimenta PróximosEventos.  
* Home navega a Calendar.  
* Geni no puede cambiar eventos del calendario sin confirmación humana.  
* Event tiene participantes Persona según comprensión.  
* Event puede generar AlbumAutomatico o Recuerdo, pero eso queda POST\_MVP.

Estados detectados en archivo de comprensión:

* Programado.  
* Completado.  
* Cancelado.

Información faltante:

* No se definen vistas día/semana/mes.  
* No se define agenda.  
* No se define formulario.  
* No se define recurrencia.  
* No se define ubicación.  
* No se define all-day.  
* No se define edición/cancelación visual.

### **Goals**

Clasificación: **POST\_MVP / DEMO PREMIUM**

Información encontrada:

* Planner contiene Goal.  
* Goal tiene estados:  
  * Activa.  
  * Completada.  
  * Fallida.  
* Goal contiene Hito.  
* Hito se vincula con Task.  
* Goal se asocia con Fondo.  
* Task avanza Goal.  
* Goal trackea progreso vía Fondo.

Aplicación frontend:

* Puede aparecer como referencia visual futura.  
* No debe desplazar MVP real de Tasks/Calendar.  
* No implementar backend real de Goals desde este documento.

---

## **10\. People / Members / Roles**

### **Entidades detectadas**

Clasificación: **REAL MVP / POST\_MVP según profundidad**

* Persona.  
* Membership.  
* Cuenta.  
* Hogar.  
* Role.  
* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* AdultoMayor.  
* Invitado.  
* EmpleadoFamiliar.

### **Membership**

Clasificación: **REAL MVP**

Información encontrada:

* Membership relaciona Persona y Hogar.  
* Estados:  
  * Pendiente.  
  * Activa.  
  * Suspendida.  
  * Finalizada.  
* Membership tiene rol.  
* Membership se vincula con Hogar.  
* Auditoría trackea Membership.

Aplicación frontend:

* Lista de miembros puede mostrar estado.  
* Miembros pending pueden requerir aprobación.  
* Miembros activos pueden aparecer como responsables de tareas o participantes de eventos.  
* Miembro suspendido/finalizado puede requerir estado visual si aparece en producto final.

### **Roles detectados**

| Rol documento | Mapeo MVP | Información encontrada | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Coordinator | Responsable administrativo principal. Aprueba ingresos, cambia roles, expulsa miembros, transfiere coordinación. | REAL MVP parcial |
| Adulto | Adult | Miembro operativo con amplios permisos. Invita personas, crea/reasigna tareas, administra operaciones. | REAL MVP parcial |
| Adolescente | Adolescent | Autonomía progresiva. Crea eventos familiares, gastos, administra tareas propias. | REAL MVP parcial |
| Niño | Child | Experiencia simplificada. No administra información familiar crítica. | REAL MVP parcial |
| AdultoMayor | Senior | Experiencia adaptada. Home prioriza personas, eventos, medicación. | REAL MVP parcial / UI por rol |
| Invitado | Guest | Participación limitada. Acceso mínimo. | REAL MVP parcial |
| EmpleadoFamiliar | Fuera MVP actual | Colaborador operativo. No forma parte del núcleo familiar. Acceso restringido a responsabilidades asignadas. | POST\_MVP |

### **People / Members UI aplicable**

Información explícita directa de UI no encontrada.

Información aplicable:

* People contiene Persona, Membership y Feed.  
* Persona puede tener relaciones con Persona.  
* Task se asocia con Persona.  
* Event tiene participantes Persona.  
* Notificación notifica Persona.  
* Presence trackea Persona.  
* EmpleadoFamiliar puede estar asignado a Responsabilidad.

Aplicación frontend:

* Members básico es necesario para asignar tareas y eventos.  
* Roles deben ser visibles en miembros.  
* Estados de membership deben poder representarse visualmente.  
* No inventar layout de miembros desde este documento.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

Clasificación: **REAL MVP / parcial**

Información encontrada:

* Hogar es unidad organizativa principal.  
* Todo ocurre dentro de un hogar.  
* Membership vincula Persona con Hogar.  
* SelectorHogar cambia contexto de Hogar.  
* Multi-hogar está soportado en el documento, pero multi-hogar avanzado queda POST\_MVP para esta entrega.

Aplicación frontend:

* Datos deben filtrarse por hogar.  
* Home/Planner/People pertenecen al hogar activo.  
* Selector de hogar solo debería entrar si se implementa multi-hogar; para MVP puede quedar fuera o mínimo según otros documentos.

### **Invitations**

Clasificación: **REAL MVP / parcial**

Información encontrada en archivo de comprensión:

* Invitación es workflow.  
* Flujo:  
  * Invitación.  
  * Aceptación.  
  * Aprobación.  
  * Ingreso al hogar.  
* Coordinador aprueba ingresos.  
* Adulto invita personas.  
* EmpleadoFamiliar requiere onboarding específico, fuera MVP.

Información faltante:

* No se define pantalla.  
* No se define link/código/token.  
* No se define expiración.  
* No se define estado de invitación.  
* No se define formulario.  
* No se definen errores.

### **Onboarding**

Clasificación: **REAL MVP / DEMO PREMIUM según profundidad**

Información encontrada:

* Capa 1 se activa desde onboarding:  
  * Calendario familiar.  
  * Tareas del hogar.  
  * Feed familiar.  
* Día 1: familia carga calendario y tareas.  
* La adopción es gradual.  
* Módulos avanzados se desbloquean progresivamente.  
* Geni puede sugerir activar Finanzas después de uso consistente.  
* Geni puede sugerir Inventario cuando detecta patrones de compras.

Aplicación frontend:

* Onboarding debe introducir tareas y calendario sin abrumar.  
* Puede sugerir módulos complementarios como demo.  
* No se define UI exacta.

---

## **12\. More / Settings / Profile**

### **More**

Clasificación: **DEMO PREMIUM**

Información encontrada:

* More es sección de herramientas especializadas.  
* More contiene:  
  * Finance.  
  * Inventory.  
  * FamilyCloud.  
  * Settings.

Aplicación frontend:

* More puede ser pantalla de cards/list items.  
* Puede mostrar módulos demo premium.  
* No se define layout exacto.

### **Settings**

Clasificación: **DEMO PREMIUM / parcial**

Información encontrada:

* SearchGlobal da acceso a Settings.  
* More contiene Settings.  
* Notificaciones pueden configurarse:  
  * urgentes;  
  * diarias;  
  * semanales.  
* Se puede silenciar Geni después de las 22hs.  
* Ubicación en tiempo real puede desactivarse cuando el usuario está en casa.  
* Feed puede no usarse.  
* Privacidad/autonomía deben respetarse.

Aplicación frontend:

* Settings puede incluir opciones visuales de notificaciones y privacidad.  
* Para MVP pueden ser mock si no hay backend.  
* No se definen pantallas exactas.

### **Profile**

No se encontró información específica de pantalla Profile.

---

## **13\. Quick Actions**

### **Información encontrada**

Clasificación: **REAL MVP / DEMO PREMIUM**

* QuickActions es botón `+` central en BottomNav.  
* Abre panel flotante con acciones rápidas.  
* Geni es slot fijo.  
* QuickActions contiene Geni.  
* QuickActions puede adaptarse a Persona.  
* No se listan acciones específicas concretas en el documento.

### **Acciones relacionadas inferidas por relaciones, pero no explícitas**

No deben tratarse como contrato cerrado. Pueden quedar para futura fusión si otros documentos las confirman:

* Crear tarea.  
* Crear evento.  
* Invitar miembro.  
* Preguntar a Geni.  
* Agregar gasto.  
* Agregar item.  
* Check-in.  
* SOS.

### **Clasificación recomendada**

| Acción | Clasificación desde este documento |
| ----- | ----- |
| Slot Geni | DEMO PREMIUM / MOCK |
| Acciones rápidas genéricas | REAL MVP como patrón |
| Crear tarea | Requiere validación con otros documentos |
| Crear evento | Requiere validación con otros documentos |
| Invitar miembro | Requiere validación con otros documentos |
| Agregar gasto | DEMO PREMIUM si aparece |
| Agregar item | DEMO PREMIUM si aparece |
| Check-in | DEMO PREMIUM / POST\_MVP |
| SOS | DEMO PREMIUM visual; real fuera de alcance |
| Crear recuerdo | DEMO PREMIUM / POST\_MVP |

---

## **14\. Módulos demo premium**

### **Finance**

Clasificación: **DEMO PREMIUM / POST\_MVP**

Información encontrada:

* Finance es módulo del ecosistema.  
* Contiene:  
  * Cuenta.  
  * Gasto.  
  * Ingreso.  
  * Presupuesto.  
  * Fondo.  
  * Deuda.  
* Finanzas compartidas son transparencia forzada una vez activadas.  
* Finanzas se desbloquea progresivamente en Semana 2-4.  
* Geni puede sugerir activar Finanzas.  
* Finance aparece en Home.  
* Home navega a Finance.  
* More contiene Finance.  
* Finanzas completas reales quedan fuera del MVP si no hay implementación backend.

Datos demo extraíbles:

* Gastos compartidos.  
* Deuda interna.  
* “Tomás debe $50.000 de alquiler hace 7 días.”  
* “Valeria cubrió el pago completo temporalmente.”  
* “La deuda interna es de $50.000.”  
* Deuda interna \> 30 días.  
* Balance compartido.  
* Gastos de mercado.

### **Inventory**

Clasificación: **DEMO PREMIUM / POST\_MVP**

Información encontrada:

* Inventory contiene Consumible.  
* Inventory contiene Medicamento.  
* Inventario del hogar incluye stock, vencimientos y lista de compras.  
* Se activa como módulo complementario Mes 2+.  
* Geni puede sugerir Inventory si detecta muchos gastos de mercado.  
* Inventory crea Task.  
* Inventory dispara Automatización.  
* More contiene Inventory.  
* OfflineMode soporta Inventory, pero Offline Sync queda POST\_MVP.

Datos demo extraíbles:

* Stock.  
* Vencimientos.  
* Lista de compras.  
* Medicación.  
* Compras de mercado.  
* Consumibles.  
* Medicamentos.

### **Assets**

Clasificación: **DEMO PREMIUM / POST\_MVP**

Información encontrada:

* Assets contiene:  
  * Vehiculo.  
  * Mascota.  
  * Dispositivo.  
  * Propiedad.  
  * Mantenimiento.  
* Assets genera Task.  
* Assets se asocia con Documento.  
* Assets se asocia con Gasto.  
* Vehículo, Mascota y Dispositivo requieren Mantenimiento.  
* OfflineMode soporta Assets.

Datos demo extraíbles:

* Vehículos.  
* Mascotas.  
* Dispositivos.  
* Propiedades.  
* Mantenimiento.  
* Documentación.  
* Vencimientos.

### **FamilyCloud / HomeCloud**

Clasificación: **DEMO PREMIUM / POST\_MVP**

Información encontrada:

* FamilyCloud contiene:  
  * Recuerdo.  
  * Album.  
  * Documento.  
  * Papelera.  
* HomeCloud / gestor documental incluye:  
  * DNIs.  
  * recetas médicas.  
  * facturas.  
  * garantías.  
* Documentos pueden asociarse con Persona, Asset, Event, Goal y Gasto.  
* Documentos soportan versionado.  
* Recuerdo puede generarse desde Event.  
* Event puede disparar AlbumAutomatico.  
* FamilyCloud aparece en More.  
* OCR y reconocimiento facial quedan como V2 o no implementado.

Datos demo extraíbles:

* DNIs.  
* Recetas médicas.  
* Facturas.  
* Garantías.  
* Recuerdos.  
* Álbumes.  
* Documentos.

### **Presence**

Clasificación: **MOCK / DEMO PREMIUM / POST\_MVP**

Información encontrada:

* Presence es coordinación de disponibilidad, ubicación y movimientos.  
* No debe ser herramienta de vigilancia.  
* Contiene:  
  * Ubicación.  
  * Lugar.  
  * Geocerca.  
  * CheckIn.  
  * EstadoPresence.  
* Ubicación en tiempo real es autonomía protegida.  
* Usuario decide cuándo comparte ubicación.  
* Puede pausar ubicación.  
* Presence aparece en Home.  
* Presence se integra con SOS.  
* Geocerca genera eventos Llegó/Salió.  
* Presence GPS real, geofencing y mapas reales quedan POST\_MVP.

Datos demo extraíbles:

* Estado de presencia.  
* Check-in.  
* Lugar.  
* Ubicación resumida.  
* Miembros en casa/fuera, si otros documentos lo confirman.  
* Modo enfoque.

### **Geni**

Clasificación: **MOCK / DEMO PREMIUM / POST\_MVP**

Información encontrada:

* Geni es asistente inteligente nativo.  
* Capa transversal integrada en todo el producto.  
* No es módulo aislado.  
* Home está alimentado por Geni.  
* Briefing generado por Geni.  
* Geni powers SearchGlobal.  
* GeniPlanner usa EscalamientoTareas.  
* Geni tiene componentes:  
  * GeniFinance.  
  * GeniPlanner.  
  * GeniPresence.  
  * GeniFamilyCloud.  
  * GeniSearch.  
* Geni tiene MemoriaPersonal y MemoriaFamiliar.  
* Geni real queda POST\_MVP si requiere IA real.  
* Geni demo puede mostrarse como briefing, sugerencias y mensajes contextuales.

### **Feed**

Clasificación: **DEMO PREMIUM / POST\_MVP**

Información encontrada:

* Feed es módulo dentro de People.  
* Feed familiar es núcleo obligatorio desde onboarding, pero participación es opcional.  
* Feed tiene Post.  
* Post tiene Comentario.  
* Post tiene reacciones.  
* ActividadFamiliar de Home está alimentada por Feed.  
* Feed real completo puede quedar fuera de implementación real actual.

### **SOS**

Clasificación: **DEMO PREMIUM visual / POST\_MVP real**

Información encontrada:

* SOS es sistema de emergencias.  
* Tiene 3 niveles:  
  * Emergencia grave.  
  * Necesito ayuda.  
  * Coordinación urgente.  
* SOS usa Ubicación.  
* SOS dispara Notificación.  
* SOS se integra con Presence.  
* SOS queda deshabilitado en OfflineMode según comprensión.  
* El documento diferencia escalamiento de tareas de escalamiento SOS.

### **Automations**

Clasificación: **POST\_MVP / DEMO PREMIUM si se muestra**

Información encontrada:

* Automatizaciones es motor “SI ocurre X → ENTONCES hacer Y”.  
* Automatización tiene estados:  
  * Activa.  
  * Pausada.  
  * Archivada.  
* Automatización puede dispararse por Presence, Planner, Finance, Inventory, Assets, SOS.  
* Geni puede crear Automatización.  
* Automatización crea Event.  
* Automatizaciones reales quedan POST\_MVP.

### **Goals**

Clasificación: **DEMO PREMIUM / POST\_MVP**

Información encontrada:

* Goal pertenece a Planner.  
* Estados:  
  * Activa.  
  * Completada.  
  * Fallida.  
* Goal contiene Hito.  
* Task avanza Goal.  
* Goal se asocia con Fondo.  
* Goal trackea progreso vía Fondo.

### **Notifications**

Clasificación: **MOCK / POST\_MVP real**

Información encontrada:

* Notificación tiene categoría y prioridad.  
* Prioridades:  
  * Crítica.  
  * Alta.  
  * Media.  
  * Baja.  
* Canales:  
  * Push.  
  * Email.  
  * In-App.  
* Usuario puede configurar tipos de alertas:  
  * urgentes;  
  * diarias;  
  * semanales.  
* Puede silenciar Geni después de las 22hs.  
* Push/email reales quedan POST\_MVP si no están implementados.

### **Search**

Clasificación: **DEMO PREMIUM / POST\_MVP**

Información encontrada:

* SearchGlobal busca universalmente.  
* Indexa todos los dominios.  
* Ejecuta acciones.  
* Acceso a Settings.  
* Geni powers SearchGlobal.  
* Puede quedar demo visual si no hay índice real.

### **Activity / Carga familiar**

Clasificación: **MOCK / DEMO PREMIUM / REAL parcial**

Información encontrada:

* ActividadFamiliar viene de Feed.  
* CargaFamiliar muestra distribución de carga de tareas.  
* Distribución de tareas semanal/mensual siempre visible.  
* Alertas por asimetría.

---

## **15\. Estados UX y feedback**

### **Estados explícitos de entidades**

| Entidad | Estados detectados | Clasificación |
| ----- | ----- | ----- |
| Membership | Pendiente, Activa, Suspendida, Finalizada | REAL MVP |
| Task | Pendiente, En progreso, Completada, Cancelada | REAL MVP / ajustar con otros documentos |
| Event | Programado, Completado, Cancelado | REAL MVP mínimo |
| Goal | Activa, Completada, Fallida | POST\_MVP |
| Fondo | Activo, Completado, Cerrado | DEMO/POST\_MVP |
| Deuda | Activa, Pagada, Vencida | DEMO/POST\_MVP |
| Documento | Activo, Archivado, En papelera | DEMO/POST\_MVP |
| Mascota | Activa, Fallecida, Archivada | DEMO/POST\_MVP |
| Automatización | Activa, Pausada, Archivada | POST\_MVP |
| Notificación | Crítica, Alta, Media, Baja | MOCK/POST\_MVP real |

### **Estados UX derivados explícitamente de reglas del documento**

* Tarea vencida.  
* Tarea crítica incumplida.  
* Primera falta.  
* Segunda falta.  
* Tercera falta.  
* Patrón emergente.  
* Patrón confirmado.  
* Asimetría menor.  
* Asimetría grave.  
* Carga redistribuida.  
* Disponibilidad reducida temporalmente.  
* Alerta privada.  
* Alerta al coordinador.  
* Patrón visible para toda la familia.  
* Usuario pendiente de aprobación.  
* Miembro activo.  
* Miembro suspendido.  
* Miembro finalizado.  
* Evento cancelado.  
* Deuda vencida.  
* Módulo desbloqueado.  
* Módulo complementario sugerido.  
* Notificaciones silenciadas.

### **Estados no encontrados**

No se encontró información específica sobre:

* Loading.  
* Skeleton.  
* Spinner.  
* Toast.  
* Error de red.  
* Retry.  
* Refreshing.  
* Optimistic update.  
* Empty state explícito.  
* Disabled state visual.  
* Offline banner.  
* Conflict resolution visual.

---

## **16\. Formularios y datos de entrada**

### **Información encontrada**

No se definen formularios visuales completos.

### **Datos de entrada mencionados indirectamente**

#### **Configuración de disponibilidad**

Clasificación: **POST\_MVP / DEMO PREMIUM**

Campos mencionados:

* Horas disponibles para tareas del hogar:  
  * 1-2hs por día.  
  * 3-4hs por día.  
  * 5+hs por día.  
* Limitación física o de salud que afecte capacidad.  
* Período de alta carga externa:  
  * exámenes;  
  * proyecto laboral;  
  * cuidado de alguien.

Uso:

* Ajuste contextual de carga.  
* Para MVP actual puede quedar fuera o demo.

#### **Notificaciones**

Clasificación: **DEMO PREMIUM / POST\_MVP real**

Opciones mencionadas:

* Alertas urgentes.  
* Alertas diarias.  
* Alertas semanales.  
* Silenciar Geni después de las 22hs.

#### **Ubicación / Presence**

Clasificación: **MOCK / POST\_MVP**

Opciones mencionadas:

* Compartir ubicación.  
* Pausar ubicación.  
* Modo enfoque.  
* Desactivar ubicación en tiempo real cuando está en casa.

#### **Invitaciones / Onboarding**

Clasificación: **REAL MVP parcial**

No se definen campos, pero sí workflow:

* Invitación.  
* Aceptación.  
* Aprobación.  
* Ingreso al hogar.

### **Formularios no definidos**

No se encontró estructura para:

* Login.  
* Register.  
* Forgot password.  
* Create household.  
* Invite member.  
* Join household.  
* Create task.  
* Edit task.  
* Create event.  
* Edit event.  
* Profile.  
* Settings.  
* Módulos demo.

---

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Módulo | Uso posible | Clasificación |
| ----- | ----- | ----- | ----- |
| Tomás | People / Planner / Home | Miembro demo, responsable de tareas | MOCK |
| Valeria | People / Planner / Home | Coordinadora o miembro demo | MOCK |
| Roberto | People / Planner / Home | Miembro demo | MOCK |
| Familia García | Home / Onboarding | Hogar demo | MOCK |
| lavar los platos | Tasks | Tarea demo | REAL/MOCK |
| sacar la basura | Tasks | Tarea demo | REAL/MOCK |
| comprar medicación | Tasks / Inventory demo | Tarea crítica / medicación | REAL/MOCK |
| turnos médicos | Calendar / Tasks | Evento/tarea crítica | REAL/MOCK |
| pagar alquiler | Finance / Tasks | Pago/deuda demo | DEMO PREMIUM |
| alquiler $50.000 | Finance demo / Home alert | Deuda/pago vencido | MOCK |
| 18 tareas asignadas | Planner / Carga Familiar | Métrica demo | MOCK |
| Valeria 15 tareas | Carga Familiar | Distribución demo | MOCK |
| Tomás 2 tareas | Carga Familiar | Distribución demo | MOCK |
| Roberto 1 tarea | Carga Familiar | Distribución demo | MOCK |
| Valeria 83% | Carga Familiar | Porcentaje demo | MOCK |
| Tomás 11% | Carga Familiar | Porcentaje demo | MOCK |
| Roberto 6% | Carga Familiar | Porcentaje demo | MOCK |
| Valeria 88% / Tomás 12% | Carga Familiar | Asimetría grave | MOCK |
| 57% vs 43% | Carga Familiar | Asimetría menor | MOCK |
| Semana 1: 60-40 | Carga Familiar | Tendencia | MOCK |
| Semana 2: 65-35 | Carga Familiar | Tendencia | MOCK |
| Semana 3: 70-30 | Carga Familiar | Tendencia | MOCK |
| exámenes hasta el 15 de junio | Planner / People | Contexto temporal | MOCK |
| compras de mercado | Finance / Inventory | Sugerencia Inventory | MOCK |
| Inventario del hogar | Inventory | Módulo demo | DEMO PREMIUM |
| DNIs | FamilyCloud | Documento demo | DEMO PREMIUM |
| recetas médicas | FamilyCloud / Inventory | Documento demo | DEMO PREMIUM |
| facturas | FamilyCloud / Finance | Documento demo | DEMO PREMIUM |
| garantías | FamilyCloud / Assets | Documento demo | DEMO PREMIUM |
| Vehículo | Assets | Activo demo | DEMO PREMIUM |
| Mascota | Assets | Activo demo | DEMO PREMIUM |
| Dispositivo | Assets | Activo demo | DEMO PREMIUM |
| Propiedad | Assets | Activo demo | DEMO PREMIUM |
| CheckIn | Presence | Acción demo | DEMO PREMIUM |
| Modo enfoque | Presence / Settings | Privacidad demo | DEMO PREMIUM |
| Crítica / Alta / Media / Baja | Notifications | Prioridades visuales | MOCK |

---

## **18\. Servicios frontend / APIs / datos**

### **Información encontrada**

No se encontró contrato API explícito.

No se encontraron:

* Endpoints.  
* Métodos HTTP.  
* Requests.  
* Responses.  
* Errores API.  
* Paginación.  
* Supabase client.  
* Auth token.  
* Storage.  
* Realtime contract.  
* Mock service contract.  
* AsyncStorage.  
* Nombres de funciones frontend.

### **Acciones/datos que podrían requerir services en otra etapa**

No son contratos, solo necesidades derivadas del documento:

* Cargar Home summary.  
* Cargar tareas.  
* Completar tarea manualmente.  
* Cargar eventos.  
* Cargar próximos eventos.  
* Cargar miembros.  
* Cargar distribución de carga.  
* Cargar invitaciones/memberships pending.  
* Cargar módulos demo.  
* Guardar preferencias de notificación.  
* Cambiar estado de ubicación/presencia si se implementa demo.

### **Clasificación**

* Services reales: pendiente de otros documentos.  
* APIs reales: no encontradas.  
* Mock services: no definidos explícitamente, pero necesarios para módulos DEMO PREMIUM.

---

## **19\. Realtime / sincronización visible**

### **Información encontrada**

No se define realtime técnico.

### **Eventos o actualizaciones conceptuales que afectan UI**

Clasificación: **REAL MVP / MOCK / POST\_MVP según implementación**

* Si un miembro completa una tarea, esa acción debe ser visible porque nadie puede ocultar tareas completadas.  
* Si una tarea vence, debe aparecer como vencida.  
* Si se confirma patrón, debe mostrarse a coordinador o familia.  
* Si Calendar tiene próximos eventos, Home debe reflejarlos.  
* Si un miembro entra al hogar, Membership cambia a activa.  
* Si un usuario está pendiente, Membership está pendiente.  
* Notificaciones pueden avisar al responsable/coordinador/familia.  
* OfflineMode y SyncQueue aparecen, pero offline sync queda POST\_MVP.

### **Pantallas que deberían actualizarse si otros documentos lo implementan**

* Home.  
* Planner.  
* Calendar.  
* People/Members.  
* Atención Requerida.  
* Carga Familiar.  
* Próximos Eventos.  
* Notificaciones.

### **Información faltante**

* No hay eventos técnicos.  
* No hay nombres de channels.  
* No hay Supabase Realtime.  
* No hay broadcast.  
* No hay estrategia de sincronización.  
* No hay conflictos frontend.

---

## **20\. Permisos visibles en UI**

### **Reglas generales**

Clasificación: **REAL MVP / parcial**

* Coordinación por encima de jerarquía.  
* Transparencia operativa.  
* Geni nunca ignora permisos.  
* Geni nunca accede a información privada sin autorización.  
* Si el dato coordina el hogar, es visible.  
* Si el dato es personal, se protege.

### **Roles y acciones detectadas**

| Rol | Puede hacer según documento/compresión | No puede hacer / límites | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Aprueba ingresos, cambia roles, expulsa miembros, transfiere coordinación | No se detallan límites completos | REAL MVP parcial |
| Adulto | Invita personas, crea/reasigna tareas, administra operaciones | No se detallan límites completos | REAL MVP parcial |
| Adolescente | Crea eventos familiares, gastos, administra tareas propias | No administra información crítica no especificada | REAL MVP parcial |
| Niño | Experiencia simplificada | No administra información familiar crítica | REAL MVP parcial |
| AdultoMayor | Home prioriza personas, eventos, medicación | No se detallan permisos | REAL MVP parcial |
| Invitado | Participación limitada, acceso mínimo | Sin permisos detallados | REAL MVP parcial |
| EmpleadoFamiliar | Completa tareas asignadas, comenta, adjunta evidencia; acceso restringido a responsabilidades asignadas | No forma parte del núcleo familiar; no administra hogar; no crea tareas según referencia previa del fragment | POST\_MVP |

### **Permisos visuales aplicables**

* Botones pueden ocultarse/deshabilitarse por rol, pero no se definen reglas completas.  
* Pending approval debe reflejarse visualmente si se implementa flujo de invitación.  
* Coordinador debe ver aprobaciones.  
* Adulto puede invitar según comprensión.  
* Child/Senior/Guest requieren experiencias adaptadas o limitadas, pero falta UI.

---

## **21\. Integraciones visibles entre módulos**

| Relación | Fuente | Clasificación |
| ----- | ----- | ----- |
| Home contiene Briefing | Archivo de comprensión | MOCK / DEMO PREMIUM |
| Home contiene Atención Requerida | Archivo de comprensión | REAL/MOCK |
| Home contiene CargaFamiliar | Archivo de comprensión | REAL/MOCK |
| Home contiene PróximosEventos | Archivo de comprensión | REAL MVP |
| Home contiene ActividadFamiliar | Archivo de comprensión | DEMO PREMIUM |
| Briefing generado por Geni | Archivo de comprensión | MOCK / DEMO PREMIUM |
| Calendar alimenta PróximosEventos | Archivo de comprensión | REAL MVP |
| Task aparece en Home | Archivo de comprensión | REAL MVP |
| Presence aparece en Home | Archivo de comprensión | MOCK / DEMO PREMIUM |
| Feed aparece en Home | Archivo de comprensión | DEMO PREMIUM |
| Finance aparece en Home | Archivo de comprensión | DEMO PREMIUM |
| Home navega a Planner | Archivo de comprensión | REAL MVP |
| Home navega a Calendar | Archivo de comprensión | REAL MVP |
| Home navega a Finance | Archivo de comprensión | DEMO PREMIUM |
| BottomNav contiene Home/People/+/Planner/More | Archivo de comprensión | REAL MVP |
| More contiene Finance/Inventory/FamilyCloud/Settings | Archivo de comprensión | DEMO PREMIUM |
| QuickActions contiene Geni | Archivo de comprensión | DEMO PREMIUM |
| SearchGlobal indexa Planner y otros dominios | Archivo de comprensión | POST\_MVP / DEMO |
| Task se asocia con Persona | Archivo de comprensión | REAL MVP |
| Event tiene participantes Persona | Archivo de comprensión | REAL MVP mínimo |
| Inventory crea Task | Archivo de comprensión | POST\_MVP / DEMO |
| Assets genera Task | Archivo de comprensión | POST\_MVP / DEMO |
| Medicamento genera Task | Archivo de comprensión | POST\_MVP / DEMO |
| Automations crea Event | Archivo de comprensión | POST\_MVP |
| Event genera AlbumAutomatico | Archivo de comprensión | POST\_MVP |
| Recuerdo generado desde Event | Archivo de comprensión | POST\_MVP |
| SOS usa Ubicación | Archivo de comprensión | POST\_MVP / DEMO |
| Presence se integra con SOS | Archivo de comprensión | POST\_MVP / DEMO |
| Geni powers SearchGlobal | Archivo de comprensión | POST\_MVP / DEMO |
| GeniPlanner usa EscalamientoTareas | Archivo de comprensión | DEMO / POST\_MVP |

---

## **22\. Edge cases frontend**

### **Encontrados explícita o claramente**

| Caso | Comportamiento frontend esperado desde documento | Clasificación |
| ----- | ----- | ----- |
| Usuario no completa tarea asignada | Registrar, alertar, escalar; no ocultar | REAL MVP |
| Primera falta leve | Recordatorio privado al responsable | MOCK/REAL según notificaciones |
| Segunda falta o patrón emergente | Alerta al coordinador | MOCK/REAL según roles |
| Tercera falta/patrón confirmado | Exposición a toda la familia | MOCK/REAL según alcance |
| Tarea crítica incumplida | Alerta activa | REAL/MOCK |
| Asimetría menor \< 40% | Datos visibles, no alerta push | REAL/MOCK |
| Asimetría grave \> 40% | Alerta visible | MOCK/REAL |
| Patrón 3+ semanas | Alerta por tendencia | MOCK/REAL |
| Deuda interna \> 30 días | Alerta | DEMO PREMIUM / MOCK |
| Evento del calendario familiar eliminado/cambiado | No debería hacerse sin visibilidad/confirmación | REAL MVP parcial |
| Usuario quiere ocultar tarea pendiente | No permitido | REAL MVP |
| Usuario quiere ocultar tarea completada | No permitido | REAL MVP |
| Usuario quiere ocultar evento familiar | No permitido | REAL MVP |
| Usuario quiere pausar ubicación | Permitido | POST\_MVP / DEMO |
| Usuario silencia Geni después de 22hs | Permitido | DEMO/PARTIAL |
| Usuario no quiere publicar en Feed | Permitido | DEMO/POST\_MVP |
| Familia quiere usar solo calendario | No permitido según filosofía | REAL MVP principle |
| Módulo complementario no activado | Puede sugerirse progresivamente | DEMO PREMIUM |
| SOS offline | SOS disabled in OfflineMode según comprensión | POST\_MVP |

### **No encontrados**

No se encontró información específica sobre:

* Email ya registrado.  
* Credenciales inválidas.  
* Token inválido/expirado.  
* Invitación expirada.  
* Invitación ya usada.  
* Último coordinador.  
* Error de red.  
* Conflicto de edición.  
* Tarea ya completada.  
* Tarea no completada para verificar.  
* Evento cancelado UI.  
* Responsabilidad sin miembros.  
* Soft delete visual.  
* Datos personales ocultos en UI.

---

## **23\. Copywriting y labels**

### **Labels de producto/módulos**

* Home.  
* People.  
* Planner.  
* More.  
* QuickActions.  
* Geni.  
* Finance.  
* Inventory.  
* FamilyCloud.  
* Settings.  
* Calendar.  
* Task.  
* Event.  
* Goal.  
* Briefing.  
* Atención Requerida.  
* Carga Familiar.  
* Próximos Eventos.  
* Actividad Familiar.

### **Roles**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

### **Estados**

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.  
* En progreso.  
* Completada.  
* Cancelada.  
* Programado.  
* Completado.  
* Activa.  
* Fallida.  
* Crítica.  
* Alta.  
* Media.  
* Baja.  
* Activo.  
* Archivado.  
* En papelera.  
* Pausada.  
* Vencida.

### **Mensajes explícitos útiles**

* «HomePlus requiere transparencia en la coordinación del hogar. Tu vida personal sigue siendo tuya. Pero si formás parte de esta familia, todos vemos el esfuerzo compartido.»  
* «Tomás, tu tarea 'lavar los platos' vence en 2 horas.»  
* «Tomás, tu tarea 'lavar los platos' venció hace 3 horas y sigue sin completarse.»  
* «Valeria, Tomás no completó 'lavar los platos' por segunda vez esta semana. ¿Querés reasignar la tarea o hablar con él?»  
* «Tomás no completó 8 de las últimas 10 tareas asignadas. La distribución de carga esta semana fue: Valeria 15 tareas, Tomás 2, Roberto 1.»  
* «Valeria, completaste 15 de 18 tareas esta semana — el 83% del esfuerzo total del hogar. Tomás completó 2, Roberto 1.»  
* «La familia completó las 18 tareas asignadas esta semana. Es la primera vez en 3 semanas que todas las tareas se cumplen. 💜»  
* «La distribución de tareas esta semana fue: Valeria 83%, Tomás 11%, Roberto 6%.»  
* «La distribución de tareas esta semana fue: Valeria 88%, Tomás 12%. Es la mayor asimetría registrada en el último mes.»  
* «La distribución de tareas viene cambiando en las últimas 3 semanas. Semana 1: 60-40. Semana 2: 65-35. Semana 3: 70-30. La carga sobre Valeria está aumentando.»  
* «HomePlus no esconde la realidad del hogar. Todos los datos están disponibles siempre. Pero Geni no te bombardea con alertas — solo te avisa cuando algo realmente importa.»  
* «Tomás está en época de exámenes hasta el 15 de junio. Su carga de tareas se redujo temporalmente. Roberto y Valeria están cubriendo las tareas redistribuidas.»  
* «La familia está usando Calendario y Tareas hace 1 semana. ¿Querés activar Finanzas para tener visibilidad completa de gastos compartidos?»  
* «Valeria registró 3 gastos de 'compras de mercado' esta semana. ¿Querés activar el módulo de Inventario para tener una lista de compras inteligente?»  
* «HomePlus funciona mejor cuando usás todo el sistema. Empezamos con lo esencial (calendario y tareas) y después expandimos cuando estés listo. No vas a activar todo el primer día — pero tampoco podés usar solo una parte e ignorar el resto.»  
* «Tomás, tu tarea 'sacar la basura' vence en 1 hora.»  
* «Tomás, tu tarea 'sacar la basura' venció hace 2 horas. ¿Podés completarla ahora?»  
* «Valeria, Tomás no completó 'sacar la basura' por tercera vez este mes. ¿Querés reasignarla o hablar con él?»

### **Reglas de copywriting**

* Tono neutral, útil, sin juicio.  
* Más directo cuando corresponde, pero sin acusar.  
* Informativo cuando escala al coordinador.  
* Factual y contundente cuando muestra patrón.  
* Usar números y contexto.  
* Evitar adjetivos valorativos.  
* Evitar exageración emocional.  
* Usar un emoji máximo cuando amerite.  
* No usar 3+ emojis.  
* No usar emojis genéricos de celebración.

---

## **24\. Restricciones técnicas frontend**

### **Información encontrada**

No se encontró información específica sobre:

* Stack frontend.  
* Expo.  
* React Native.  
* Supabase.  
* Edge Functions.  
* Storage.  
* Librerías disponibles.  
* Librerías ausentes.  
* Design system técnico.  
* Performance.  
* Platform differences.  
* Mobile constraints específicas.  
* Realtime técnico.  
* API client.  
* Estado global frontend.

### **Restricciones funcionales con impacto técnico**

Clasificación: **REAL MVP / POST\_MVP**

* Datos de coordinación deben ser visibles.  
* Tareas completadas/pendientes no se pueden ocultar.  
* Eventos familiares no se pueden ocultar.  
* Geni no puede completar tareas automáticamente.  
* Geni no puede reasignar tareas automáticamente.  
* Geni no puede cambiar eventos sin confirmación humana.  
* Geni nunca ignora permisos.  
* Geni nunca accede a información privada sin autorización.  
* Home resume; módulos administran.  
* Núcleo obligatorio: Calendar \+ Tasks \+ Feed.  
* OfflineMode existe, pero Offline Sync queda POST\_MVP.  
* SearchGlobal avanzado queda POST\_MVP/DEMO.  
* Presence GPS real queda POST\_MVP.  
* Notificaciones push reales quedan POST\_MVP si no están implementadas.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Impacto frontend | Recomendación futura |
| ----- | ----- | ----- | ----- |
| Tasks como MVP simple vs escalamiento avanzado de Geni | El documento describe escalamiento rico, pero no contratos | Puede inflar MVP | Implementar visual mínimo/mock; no IA real |
| Estados de Task | Archivo de comprensión dice Pendiente/En progreso/Completada/Cancelada; otros MVP pueden usar otros estados | Riesgo de conflicto de estados | Resolver en merge con documento técnico de Planner |
| Calendar obligatorio pero sin UI | Se exige calendario familiar, pero no define vistas | Falta diseño | Usar otros documentos para layout |
| Home real vs Home con Geni | Home está alimentado por Geni, pero Geni real no es MVP | Riesgo de prometer IA real | Briefing mock/dummy |
| Feed núcleo obligatorio vs Feed fuera de implementación real | Documento lo pone en núcleo, pero MVP puede priorizar Tasks/Calendar | Riesgo de alcance | Mostrar Feed/Actividad como demo o mock |
| Finance transparencia forzada vs Finance demo | Filosofía lo trata como módulo fuerte, pero MVP actual puede no tener backend real | Riesgo de scope creep | Finance demo premium/mock |
| Presence privacidad vs Presence en Home | Presence aparece integrado, pero GPS real es avanzado | Riesgo de vigilancia o complejidad | Mock visual; no GPS real |
| Multi-hogar real | Documento menciona soporte multi-hogar | MVP puede no requerir multi-hogar avanzado | Mantener hogar activo básico |
| Empleado Familiar | Está muy detallado en comprensión | Fuera de roles MVP principales | POST\_MVP |
| Quick Actions sin acciones concretas | Patrón existe pero no lista acciones | Riesgo de inventar | Definir acciones en merge desde otros documentos |
| More contiene módulos avanzados | Módulos especializados pueden parecer incompletos | Riesgo visual | Cards demo premium |
| Auditoría permanente | Filosóficamente importante, pero no UI detallada | Scope técnico alto | POST\_MVP o visual mínimo |
| Notificaciones | Documento habla de alertas, push/email/in-app | Push real puede ser complejo | Mock/in-app local para demo |
| Templates | Plantilla aplica a Task, pero no define CRUD ni lista | Riesgo de inventar templates | Resolver con documento Planner |
| Goals | En Planner pero avanzado | Riesgo de meter en MVP real | Mantener como demo/post-MVP |

---

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Pantallas exactas | Se necesita construir UI | Requiere otros documentos |
| Layout visual | No hay diseño premium concreto | Requiere Design System/Figma |
| Colores/tipografía | No se puede definir look final | Requiere documento visual |
| Componentes con medidas | No hay radios, sombras, spacing | Requiere spec visual |
| Formularios | No define inputs ni validaciones | Requiere docs técnicos |
| APIs | No hay endpoints | Requiere API/contracts |
| Services frontend | No hay funciones ni fuentes | Requiere especificación técnica |
| Realtime | No hay canales/eventos técnicos | Requiere backend/realtime docs |
| Auth UI | No define login/register | Requiere Auth docs |
| Household UI | No define crear hogar/invitar | Requiere Household docs |
| Invitations UI | No define link/token/pending screen | Requiere Invitations docs |
| Members UI | No define cards/lista/avatar | Requiere People/Household docs |
| Planner UI | No define tabs ni formularios | Requiere Planner/frontend docs |
| Calendar UI | No define día/semana/mes | Requiere Calendar docs |
| Home layout | Define widgets, no orden visual final | Requiere Home/Figma docs |
| Quick Actions | Define patrón, no acciones concretas | Requiere Navigation/UX docs |
| More/Settings | Define contenedor, no pantalla | Requiere More docs |
| Mock data suficiente | Hay algunos ejemplos, pero no dataset completo | Requiere mock data pack |
| Edge cases técnicos | No hay errores auth/API/red | Requiere API/test cases |
| Permisos finos | Roles descritos parcialmente | Requiere roles/permissions docs |
| Verification flow | Solo aparece como entidad | Requiere Planner tasks docs |
| Recurrencia | No se define | Requiere Calendar/Planner docs |
| Notifications real | No hay implementación | Requiere technical docs |
| Offline | Solo aparece como entidad | POST\_MVP |
| Storage/OCR | Solo futuro | POST\_MVP |

---

## **27\. Fragments recomendados desde este documento**

| Fragment | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Bajo-Medio | No hay tokens visuales, pero sí tono visual y copy |
| `navigation_fragment` | Sí | Medio | BottomNav, Home, People, \+, Planner, More, QuickActions, More |
| `home_frontend_fragment` | Sí | Medio-Alto | Home, widgets, briefing, carga, próximos eventos, atención requerida |
| `planner_frontend_fragment` | Sí | Alto | Tasks/Calendar como núcleo, carga, escalamiento, visibilidad |
| `people_members_frontend_fragment` | Parcial | Medio | Roles, Membership, Persona, relación con tareas/eventos |
| `household_invites_frontend_fragment` | Parcial | Bajo-Medio | Workflow invitación → aceptación → aprobación → ingreso |
| `auth_onboarding_frontend_fragment` | Parcial | Medio | Onboarding activa núcleo; no hay login/register UI |
| `quick_actions_frontend_fragment` | Sí | Medio | Botón \+ central, panel flotante, Geni slot fijo |
| `more_settings_frontend_fragment` | Sí | Medio | More contiene Finance/Inventory/FamilyCloud/Settings; settings de notificaciones/privacidad |
| `finance_demo_fragment` | Sí | Medio | Finance aparece como módulo, deuda/gastos/pagos, sugerencias |
| `inventory_demo_fragment` | Sí | Medio | Stock, vencimientos, lista de compras, medicamentos |
| `assets_demo_fragment` | Parcial | Medio | Vehículos, mascotas, dispositivos, mantenimiento |
| `familycloud_demo_fragment` | Parcial | Medio | Documentos, recuerdos, álbumes, DNIs, recetas, facturas |
| `presence_demo_fragment` | Sí | Medio | Presence visible, ubicación/autonomía, check-in, modo enfoque |
| `geni_demo_fragment` | Sí | Alto | Briefing, tono, escalamiento, mensajes, sugerencias |
| `mock_data_fragment` | Sí | Alto | Muchos ejemplos de personas, tareas, métricas, mensajes |
| `ux_states_fragment` | Sí | Alto | Estados de tareas, membership, alertas, escalamiento |
| `frontend_services_fragment` | Parcial | Bajo | No hay APIs, pero sí necesidades de datos |

---

## **28\. Conclusión operativa**

Este documento debe usarse en la futura `frontend_premium_mvp_spec.md` como fuente de:

* filosofía de experiencia;  
* tono de interfaz;  
* copywriting;  
* Home como centro operativo;  
* Bottom Nav principal;  
* Quick Actions como botón central;  
* Planner/Calendar como núcleo obligatorio;  
* visibilidad de tareas y carga familiar;  
* estados de alerta y escalamiento;  
* reglas de Geni mock/demo;  
* módulos demo premium dentro de More/Home;  
* separación entre coordinación visible y privacidad personal;  
* reglas para no convertir IA/automations/GPS/offline en MVP real.

Este documento **no** debe usarse como fuente única para:

* endpoints;  
* modelo de datos definitivo;  
* pantallas exactas;  
* layout premium;  
* formularios;  
* validaciones;  
* design tokens;  
* realtime;  
* servicios frontend;  
* implementación real de Geni;  
* implementación real de Finance/Inventory/Assets/FamilyCloud/Presence/SOS/Automations;  
* permisos finos completos.

La extracción más valiosa es convertir la filosofía en una app que se sienta:

* clara;  
* humana;  
* honesta;  
* organizada;  
* no invasiva;  
* premium;  
* orientada a coordinación real del hogar;  
* visualmente completa con módulos demo donde convenga;  
* funcionalmente real en Auth, Household, Members básico, Planner, Calendar y Home básico.

---

# **SOURCE 04 — EMOTIONAL DESIGN**

## **Archivo recomendado**

`Seccion 4 Emotional Design.txt`

## **Tipo de documento**

Diseño emocional

## **Uso para frontend**

Extraer:

* emociones que debe transmitir la app;  
* microcopy emocional;  
* estados vacíos;  
* errores;  
* loading;  
* celebraciones;  
* feedback de completar tareas;  
* tono de Geni/Home/Planner.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_SECCION\_4\_EMOTIONAL\_DESING**

## **1\. Fuente**

* Documento: `HomePlus — SECCION 4 EMOTIONAL DESING.md`  
* Archivo de comprensión asociado disponible en este chat: `Seccion 4 Emotional Design.txt`  
* Tipo de documento: Product Brain / arquitectura emocional del sistema.  
* Versión indicada: v1.1 — Junio 2026\.  
* Estado indicado: Activo.  
* Alcance: define emociones objetivo, emociones prohibidas, tono del sistema, impacto emocional de notificaciones, Geni, SOS, Presence, roles, coordinación familiar, rachas, carga reducida y composición del hogar.  
* Utilidad para frontend global MVP: Media.  
* Motivo: no define pantallas completas, tokens visuales, layouts ni APIs, pero sí define reglas de UX, tono, jerarquía emocional, navegación global detectada en el archivo de comprensión, widgets de Home, roles, permisos conceptuales y relaciones entre módulos.

---

## **2\. Utilidad frontend del documento**

Este documento aporta criterios globales para que el frontend de HomePlus se sienta:

* calmo;  
* claro;  
* no punitivo;  
* no invasivo;  
* coordinador sin volverse controlador;  
* humano en el tono;  
* útil para reducir carga mental;  
* seguro sin generar pánico;  
* orientado a reconocimiento sin humillación;  
* adaptado emocionalmente por rol.

No aporta suficiente detalle para:

* construir una UI final completa;  
* definir design tokens;  
* definir componentes visuales exactos;  
* definir endpoints;  
* definir formularios completos;  
* definir copy final de pantallas;  
* definir estados técnicos completos.

---

## **3\. Información de producto aplicable al frontend**

### **Principio central**

HomePlus resuelve una asimetría emocional de coordinación mediante herramientas funcionales. Si las herramientas generan resentimiento, desgaste o explosión, el producto falla.

Clasificación: REAL MVP / principio transversal.

Aplicación frontend:

* La UI no debe sentirse como una lista de órdenes.  
* Las tareas, alertas y recordatorios deben reducir tensión, no aumentarla.  
* Las pantallas deben facilitar coordinación familiar sin transformar la app en control o vigilancia.

### **Seguridad**

El sistema debe generar confianza basal: está disponible cuando se necesita.

Frontend aplicable:

* Los flujos críticos deben ser claros.  
* Las acciones de emergencia o ayuda no deben dispararse sin confirmación cuando el documento lo indique.  
* La cancelación no debe penalizar.  
* El sistema debe confirmar que la ayuda está en camino.

Clasificación:

* SOS visual: DEMO PREMIUM / POST\_MVP según alcance.  
* Principio de confirmación y no penalización: REAL MVP como patrón UX general.

### **Calma**

El sistema debe reducir la carga cognitiva del coordinador. Las cosas deben pasar sin que alguien las tenga que sostener mentalmente todo el tiempo.

Frontend aplicable:

* Home no debe sentirse abrumador.  
* Las notificaciones deben ser útiles, no decorativas.  
* Las pantallas deben priorizar lo accionable.  
* Evitar exceso de widgets simultáneos.  
* Agrupar información de bajo impacto.

Clasificación: REAL MVP / principio transversal.

### **Claridad**

Cada miembro debe saber qué le toca, qué hizo el resto y cuál es el estado del hogar. Las tareas deben tener responsable visible y estado claro.

Frontend aplicable:

* Mostrar responsable en task cards.  
* Mostrar estado claro en task cards.  
* Mostrar datos con contexto.  
* Evitar números sin explicación.  
* Evitar información dispersa.

Clasificación: REAL MVP para Planner/Home/Members.

### **Reconocimiento**

El esfuerzo de cada miembro debe ser visible. La visibilidad del esfuerzo produce reconocimiento antes de que aparezca resentimiento.

Frontend aplicable:

* Celebrar acciones completadas.  
* Mostrar logros con tono afirmativo.  
* No contrastar miembros.  
* No publicar fallos como presión social.

Clasificación:

* Reconocimiento suave en UI: REAL MVP / DEMO PREMIUM.  
* Feed de logros completo: POST\_MVP o DEMO PREMIUM, no real obligatorio.

### **Pertenencia**

Cada miembro debe sentirse parte activa del hogar, no destinatario pasivo de instrucciones.

Frontend aplicable:

* Onboarding de nuevos miembros debe sentirse cálido.  
* Las acciones asignadas deben tener tono colaborativo.  
* Las pantallas de tareas/eventos deben evitar lenguaje de mando.

Clasificación: REAL MVP / principio transversal.

### **Pertenencia activa — Adulto Mayor**

El Adulto Mayor debe sentir pertenencia activa, no inclusión pasiva.

Frontend aplicable:

* Experiencia simplificada por defecto.  
* Priorizar personas, eventos, recordatorios, medicación y coordinación.  
* No exigir aprender mecánicas complejas.  
* No recordarle lo que no hizo de forma punitiva.

Clasificación:

* Adaptación visual por rol Senior: DEMO PREMIUM / POST\_MVP, salvo que otra fuente lo vuelva MVP.

### **Control saludable**

El sistema da información, no órdenes. Geni sugiere, no impone. Existe modo carga reducida y privacidad configurable por módulo.

Frontend aplicable:

* Mensajes como sugerencias, no mandatos.  
* Botones de acción claros pero no coercitivos.  
* Controles de privacidad visibles en futuro.  
* Carga reducida como flujo futuro o demo.

Clasificación:

* Tono sugerente: REAL MVP.  
* Privacidad por módulo: POST\_MVP.  
* Modo carga reducida completo: POST\_MVP.

### **Coordinación sobre control**

La coordinación debe estar por encima de la jerarquía. Coordinadores administran el hogar, no la vida privada.

Frontend aplicable:

* No mostrar datos privados innecesarios.  
* Evitar UI que parezca vigilancia.  
* Mostrar permisos de forma cuidadosa.  
* No empujar ubicación ni rendimiento sin contexto.

Clasificación: REAL MVP / principio transversal.

### **Privacidad**

La privacidad individual tiene prioridad sobre la conveniencia. Ningún rol obtiene acceso automático a memoria privada, metas privadas, documentos privados o finanzas personales.

Frontend aplicable:

* Ocultar o no mostrar información privada por defecto.  
* Evitar que Coordinator vea todo automáticamente.  
* Diferenciar información familiar de información personal.

Clasificación: REAL MVP como restricción de UI.

---

## **4\. Navegación y arquitectura de pantallas**

### **Bottom Navigation**

El archivo de comprensión detecta una navegación principal congelada V1:

* Home.  
* People.  
* `+` / QuickActions.  
* Planner.  
* More.

Clasificación: REAL MVP.

### **Home**

* Home es el centro operativo del hogar.  
* Home resume información, no administra.  
* Home es pantalla inicial inamovible.  
* La administración ocurre en el módulo correspondiente.

Clasificación: REAL MVP.

### **Quick Actions**

* QuickActions es un panel flotante desde el botón `+` en Bottom Nav.  
* Geni aparece como slot fijo.  
* Existen acciones dinámicas.

Clasificación:

* Estructura `+`: REAL MVP como navegación.  
* Geni slot: DEMO PREMIUM / MOCK.  
* Acciones dinámicas: DEMO PREMIUM si no hay backend.

### **More**

* More es una sección de herramientas especializadas.  
* Contiene Finance, Inventory, FamilyCloud y Settings según el archivo de comprensión.

Clasificación:

* More visual: REAL MVP / DEMO PREMIUM.  
* Finance/Inventory/FamilyCloud reales: POST\_MVP.  
* Finance/Inventory/FamilyCloud como cards demo: DEMO PREMIUM.

### **Settings**

* Settings contiene configuración del hogar, cuenta y sistema.  
* Vive exclusivamente en More.

Clasificación: DEMO PREMIUM / parcial real según alcance.

### **MultiHomeSelector**

* Selector global de hogar en el header.  
* Visible solo con 2+ hogares.

Clasificación: POST\_MVP para MVP actual si multi-hogar avanzado queda fuera.

### **Search**

* Búsqueda global con Geni Search.  
* Indexa dominios, Settings y acciones ejecutables.

Clasificación: POST\_MVP / DEMO PREMIUM si se simula.

---

## **5\. Pantallas detectadas**

| Pantalla | Objetivo | Qué muestra | Acciones | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo del hogar | Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, Tareas por Responsabilidad, Finance relevante, Presence resumido, Actividad Familiar | Navegar a módulos, ver resumen | REAL MVP \+ DEMO PREMIUM \+ MOCK |
| People | Dominio de personas del hogar | Feed, Presence, Personas según archivo de comprensión | No se detallan acciones específicas en este documento | DEMO PREMIUM / parcial REAL para members básico |
| Planner | Núcleo operativo | Tasks, Calendar, Goals, Responsabilidades | Crear/gestionar tareas/eventos no detallado en documento | REAL MVP para Tasks/Events mínimos; POST\_MVP para Goals |
| More | Herramientas especializadas | Finance, Inventory, FamilyCloud, Settings | Abrir módulos | DEMO PREMIUM |
| Settings | Configuración del hogar, cuenta y sistema | No se detalla UI | Configurar | DEMO PREMIUM / parcial REAL |
| QuickActions | Panel flotante desde `+` | Geni fijo \+ acciones dinámicas | Acciones rápidas no detalladas | REAL MVP estructura / DEMO PREMIUM contenido |
| SOSPanel | Activación de SOS | Tres niveles: Emergencia grave, Necesito ayuda, Coordinación urgente | Confirmar/cancelar SOS | DEMO PREMIUM / POST\_MVP |
| SOS en Home | Alerta prioritaria | SOS desplaza otro contenido | Ver/cerrar según rol no definido | POST\_MVP / DEMO PREMIUM |
| Feed | Espacio social del hogar | Logros, posts, comentarios, reacciones | Celebrar, comentar, reaccionar | DEMO PREMIUM / POST\_MVP |
| Calendar | Eventos dentro de Planner | Eventos familiares/personales | No se detallan acciones | REAL MVP mínimo para eventos; incompleto |
| Task Detail / Task Card | Trabajo pendiente o realizado | Responsable visible, estado claro | Completar o gestionar no detallado | REAL MVP como patrón |
| Carga reducida | Solicitud de período liviano | No se detalla visualmente | Solicitar/aprobar/proponer conversación | POST\_MVP |
| Aprobación carga reducida | Coordinador responde solicitud | No se define; queda para UX Philosophy | Aprobar/proponer conversación | POST\_MVP |
| Adulto Mayor experience | Experiencia adaptada | Personas, eventos, recordatorios, medicación, coordinación | No se detallan acciones | DEMO PREMIUM / POST\_MVP |
| Empleado Familiar Home | Trabajo asignado | Home centrado en trabajo asignado | Completar trabajo asignado | POST\_MVP / DEMO PREMIUM |
| Guest experience | Experiencia limitada y cálida | Límites claros | Participación puntual | DEMO PREMIUM / POST\_MVP |

---

## **6\. Componentes y patrones UI reutilizables**

### **Componentes detectados explícitamente o desde archivo de comprensión**

| Componente / patrón | Uso | Clasificación |
| ----- | ----- | ----- |
| BottomNavigation | Navegación principal Home / People / \+ / Planner / More | REAL MVP |
| QuickActions panel | Panel flotante desde botón central `+` | REAL MVP estructura / DEMO PREMIUM acciones |
| Home widgets | Bloques resumidos del hogar | REAL MVP \+ DEMO PREMIUM |
| Briefing card | Resumen generado por Geni | MOCK / DEMO PREMIUM |
| Attention Required widget | SOS, tareas vencidas, pagos vencidos, aprobaciones | REAL MVP para tareas/aprobaciones si existen; DEMO/MOCK para pagos/SOS |
| Family Load widget | Carga Familiar | MOCK / DEMO PREMIUM |
| Upcoming Events widget | Próximos eventos | REAL MVP |
| Tasks by Responsibility widget | Tareas agrupadas por responsabilidad | REAL MVP si Planner real lo soporta; MOCK si no |
| Finance Relevant widget | Finanzas relevantes | DEMO PREMIUM / MOCK |
| Presence Summary widget | Presence resumido | MOCK / DEMO PREMIUM |
| Family Activity widget | Actividad familiar | MOCK / DEMO PREMIUM |
| Role pills / etiquetas de rol | Derivable por presencia de roles, pero UI no está definida | DEMO PREMIUM / requiere validación |
| Status claro de tareas | Las tareas deben tener estado claro | REAL MVP |
| Responsable visible | Las tareas deben mostrar responsable | REAL MVP |
| Confirmación | SOS no dispara sin confirmación; cancelación no penaliza | REAL MVP como patrón UX |
| Resúmenes agrupados | Alertas de bajo impacto agrupadas | DEMO PREMIUM / POST\_MVP |
| Badges de prioridad | Notificaciones con prioridad crítica/alta/media/baja | DEMO PREMIUM / POST\_MVP |
| Widget contextual de Presence | Presence no tiene widget permanente; aparece contextual | MOCK / DEMO PREMIUM |
| Alertas no repetidas | El sistema nunca notifica dos veces lo mismo | POST\_MVP / principio UI |
| Mensajes de cierre | “Cerrado. Todo en orden.” | DEMO PREMIUM para feedback |

### **Componentes no definidos**

No se encontró información específica sobre:

* chips visuales;  
* sombras;  
* blur;  
* bordes;  
* radius;  
* tipografías;  
* spacing;  
* calendario visual;  
* modales visuales;  
* bottom sheets visuales;  
* skeletons;  
* toasts;  
* inputs;  
* formularios completos.

---

## **7\. Visual design aplicable**

### **Estilo emocional**

El diseño emocional no es una capa estética, sino arquitectura del sistema. La UI debe reflejar relaciones reales, no solo verse bien.

Aplicación:

* Visual premium no debe producir ansiedad.  
* La claridad pesa más que la densidad.  
* El Home nunca debe sentirse abrumador.  
* SOS debe comunicar gravedad sin pánico.  
* La información debe presentarse con contexto.

### **Gravedad sin pánico**

En SOS en Home, si una alerta aparece, desplaza contenido, pero debe comunicar gravedad sin inducir pánico.

Clasificación: DEMO PREMIUM / POST\_MVP.

### **Presencia no permanente**

Presence no debe tener widget permanente en Home; aparece mediante Briefing, Atención Requerida o widgets contextuales.

Clasificación: MOCK / DEMO PREMIUM.

### **Diseño para Senior**

La experiencia del Adulto Mayor debe ser simplificada por defecto y no generar sensación de carga.

Clasificación: DEMO PREMIUM / POST\_MVP.

### **No hay design tokens**

No se encontró información específica en este documento sobre:

* colores;  
* gradientes;  
* glassmorphism;  
* blur;  
* sombras;  
* bordes;  
* radios;  
* espaciado;  
* tipografía;  
* iconografía;  
* estilo iOS;  
* contraste;  
* tamaño de botones.

---

## **8\. Home**

### **Rol de Home**

* Home es el centro operativo del hogar.  
* Home resume información.  
* Home no administra.  
* La administración ocurre en cada módulo correspondiente.

Clasificación: REAL MVP.

### **Widgets detectados**

| Widget | Contenido | Clasificación |
| ----- | ----- | ----- |
| Briefing | Resumen del hogar generado por Geni | MOCK / DEMO PREMIUM |
| Attention Required | SOS, tareas vencidas, pagos vencidos, aprobaciones | REAL MVP para tareas/aprobaciones; MOCK/DEMO para pagos/SOS |
| Family Load | Carga Familiar | MOCK |
| Upcoming Events | Próximos eventos | REAL MVP |
| Tasks by Responsibility | Tareas agrupadas por responsabilidad | REAL MVP o MOCK según data disponible |
| Finance Relevant | Finanzas relevantes | DEMO PREMIUM / MOCK |
| Presence Summary | Presence resumido | MOCK / DEMO PREMIUM |
| Family Activity | Actividad familiar | MOCK / DEMO PREMIUM |

Fuente: archivo de comprensión.

### **Home emocional**

* Home nunca debe sentirse abrumador.  
* Home debe mostrar información con contexto.  
* Home debe evitar exceso de urgencia.  
* SOS desplaza cualquier otro contenido cuando aparece, pero con tono visual grave sin pánico.  
* Presence no debe aparecer como widget permanente.

### **Home real para MVP**

Extraíble como REAL MVP:

* Próximos eventos.  
* Tareas agrupadas o pendientes.  
* Atención requerida si incluye tareas vencidas o aprobaciones reales.  
* Miembros si otra fuente lo define.

### **Home mock / demo premium**

Extraíble como MOCK / DEMO PREMIUM:

* Briefing.  
* Carga Familiar.  
* Presence Summary.  
* Family Activity.  
* Finance Relevant.  
* SOS visual.  
* Geni personalization.

### **Riesgos**

* El documento menciona Geni generando Briefing, pero Geni real queda fuera del MVP actual.  
* Presence puede generar sensación de vigilancia si se muestra de forma persistente.  
* Feed/actividad familiar real puede generar presión social si muestra fallos.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

* Planner es núcleo operativo.  
* Administra Tasks, Calendar, Goals y Responsabilidades.  
* Planner está en BottomNavigation.

Clasificación:

* Planner tab: REAL MVP.  
* Tasks/Events/Calendar mínimo: REAL MVP.  
* Goals: POST\_MVP / DEMO PREMIUM.

### **Tasks**

Información explícita o detectada:

* Task es trabajo pendiente o realizado.  
* Estados detectados:  
  * Pendiente.  
  * En progreso.  
  * Completada.  
  * Cancelada.  
* “Vencida” no es estado de tarea; se calcula automáticamente.  
* Las tareas deben tener responsable visible y estado claro.  
* Las tareas pueden pertenecer a Responsibility.  
* Responsibility agrupa tareas.  
* Ejemplos de responsabilidades:  
  * Compras.  
  * Mascotas.  
  * Limpieza.  
* Home puede mostrar tareas agrupadas por responsabilidad.  
* Tareas vencidas entran en prioridad alta de notificaciones.  
* La escalada de Geni aplica a tareas del hogar con responsable asignado.

Clasificación REAL MVP:

* Lista de tareas.  
* Responsable visible.  
* Estado claro.  
* Tareas vencidas calculadas visualmente.  
* Agrupación por responsabilidad si se puede implementar simple.  
* Relación con Home.

Clasificación POST\_MVP:

* Rachas.  
* Recuperación de racha.  
* Escalada de Geni.  
* Tarea compensatoria automática.  
* Historial de rendimiento.  
* Modo carga reducida completo.  
* Subtasks.  
* TaskTemplate editable.  
* TaskComment.  
* TaskAttachment.  
* TaskDependency.  
* TaskRecurrence.  
* TaskVerification si no está definido por otra fuente.  
* Auditoría completa.  
* Automatizaciones reales.

### **Events / Calendar**

Información detectada:

* Calendar administra eventos dentro de Planner.  
* Event puede ser familiar o personal.  
* Estados detectados:  
  * Programado.  
  * Completado.  
  * Cancelado.  
* Home puede mostrar próximos eventos.  
* Eventos son prioridad media en notificaciones.  
* Calendar puede servir para calibrar carga de tareas.  
* Ejemplos de contexto:  
  * semana de exámenes;  
  * día laboral cargado;  
  * evento familiar significativo.

Clasificación REAL MVP:

* Próximos eventos en Home.  
* Calendar/Event mínimo si otra fuente define UI/API.  
* Estado visual de evento.

Clasificación POST\_MVP:

* Calibración automática de carga por calendario.  
* Integración con Geni.  
* CalendarAutoAlbum.  
* FamilyCloud vinculado a eventos.  
* Automatizaciones por evento.

### **Goals**

Información detectada:

* Goal pertenece a Planner.  
* Goal tiene estructura Goal → Milestone → Tasks.  
* Estados:  
  * Activa.  
  * Completada.  
  * Fallida.  
* Feed puede celebrar Goal.  
* Document puede linkear a Goal.

Clasificación:

* Goals demo visual: DEMO PREMIUM opcional.  
* Goals backend real: POST\_MVP.  
* Milestones: POST\_MVP.

---

## **10\. People / Members / Roles**

### **People**

* People administra personas dentro del hogar.  
* Contiene Feed, Presence y Personas como subsecciones según archivo de comprensión.  
* People está en BottomNavigation.

Clasificación:

* People tab: REAL MVP / navegación.  
* Members básico: REAL MVP si se usa para tareas/eventos.  
* Feed/Presence completos: DEMO PREMIUM / POST\_MVP.

### **Entidades**

| Entidad | Información | Clasificación |
| ----- | ----- | ----- |
| Person | Pertenece a Account, participa en uno o más hogares | REAL MVP / transversal |
| Membership | Relación entre persona y hogar | REAL MVP |
| Role | Rol dentro del hogar | REAL MVP |
| Account | Cuenta de usuario, pertenece a la persona | REAL MVP / transversal |

### **Roles detectados**

| Rol | Descripción encontrada | Clasificación |
| ----- | ----- | ----- |
| Coordinator | Responsable administrativo principal; puede aprobar ingresos, cambiar roles, expulsar, transferir coordinación | REAL MVP parcial |
| Adult | Miembro operativo con amplios permisos; puede invitar, crear tareas, reasignar, crear eventos | REAL MVP parcial |
| Adolescent | Autonomía progresiva; puede crear eventos familiares, gastos, administrar tareas propias | REAL MVP parcial |
| Child | Experiencia simplificada; no administra información familiar crítica | REAL MVP parcial / restricciones UI |
| SeniorAdult / Adulto Mayor | Experiencia adaptada con foco en personas, eventos, recordatorios, medicación, coordinación | DEMO PREMIUM / POST\_MVP |
| Guest / Invitado | Acceso mínimo y participación limitada | DEMO PREMIUM / POST\_MVP |
| FamilyEmployee / Empleado Familiar | Colaborador operativo, no parte del núcleo familiar | POST\_MVP / DEMO PREMIUM |

Fuente: archivo de comprensión.

### **Estados de Membership**

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.

Clasificación: REAL MVP si coincide con backend/fuentes posteriores.

### **UX emocional por rol**

#### **Adulto Mayor**

* No debe sentir que la app es trabajo.  
* No debe sentir que está siendo monitoreado por su bien.  
* Interfaz simplificada por defecto.  
* Funciones médicas solo opcionales y activadas explícitamente.

#### **Guest**

* Acceso mínimo no debe sentirse hostil.  
* Experiencia limitada pero cálida.  
* Límites claros desde el inicio.

#### **FamilyEmployee**

* Tono profesional y respetuoso.  
* No recibe publicaciones que asuman lazos familiares.  
* Home centrado en trabajo asignado.  
* Geni solo entrega información necesaria para trabajar.

#### **Nuevo miembro**

* Bienvenida ceremonial activada por coordinador.  
* Integración gradual con primera tarea visible.

Clasificación:

* Nuevo miembro UX: DEMO PREMIUM / onboarding.  
* Guest/FamilyEmployee/Senior avanzado: POST\_MVP salvo alcance explícito.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

Información detectada:

* Household es unidad organizativa principal.  
* Todo ocurre dentro de un hogar.  
* Household contiene People, Planner, Finance, Presence, Inventory, Assets, FamilyCloud, Feed y Automations.  
* Household owns Membership.

Clasificación: REAL MVP / transversal.

### **Membership**

* Person tiene Membership.  
* Membership tiene Role.  
* Membership pertenece a Household.  
* Estados: Pendiente, Activa, Suspendida, Finalizada.

Clasificación: REAL MVP.

### **Invitations**

Información detectada en archivo de comprensión:

* Invitation es flujo: Invitación → Aceptación → Aprobación → Ingreso.  
* People manages Invitation.  
* Coordinator puede aprobar ingresos.  
* Adult puede invitar.

Clasificación: REAL MVP / parcial.

### **Onboarding**

Información detectada:

* Los tiempos de escalada de Geni ante tareas son configurables por el coordinador en onboarding.  
* Nuevo miembro tiene bienvenida ceremonial activada por coordinador.  
* Nuevo miembro tiene integración gradual con primera tarea visible.  
* EmployeeOnboarding incluye invitación, aceptación, horario y responsabilidades.  
* FamilyEmployee onboarding es POST\_MVP.

Clasificación:

* Onboarding básico: REAL MVP si otras fuentes lo definen.  
* Configuración de escalada Geni: POST\_MVP.  
* Bienvenida ceremonial: DEMO PREMIUM.  
* Employee onboarding: POST\_MVP.

### **Formularios**

No se encontró información específica en este documento sobre campos de:

* crear hogar;  
* invitar miembro;  
* aceptar invitación;  
* aprobar/rechazar;  
* crear perfil;  
* onboarding por rol.

---

## **12\. More / Settings / Profile**

### **More**

* Sección de herramientas especializadas.  
* Contiene:  
  * Finance.  
  * Inventory.  
  * FamilyCloud.  
  * Settings.

Clasificación:

* More como pantalla de navegación: DEMO PREMIUM / REAL MVP visual.  
* Finance/Inventory/FamilyCloud como reales: POST\_MVP.  
* Finance/Inventory/FamilyCloud como cards o accesos demo: DEMO PREMIUM.

### **Settings**

* Configuración del hogar, cuenta y sistema.  
* Vive exclusivamente en More.  
* Settings contiene AuditLog según archivo de comprensión.

Clasificación:

* Settings visual: DEMO PREMIUM.  
* AuditLog real: POST\_MVP.  
* Privacidad por módulo: POST\_MVP.

### **Profile**

No se encontró información específica en este documento.

---

## **13\. Quick Actions**

### **Información encontrada**

* QuickActions es un panel flotante desde botón `+` en Bottom Nav.  
* Geni aparece como slot fijo.  
* Hay acciones dinámicas.  
* QuickActions pertenece a BottomNavigation.

### **Acciones relacionadas detectadas indirectamente**

| Acción | Fuente | Clasificación |
| ----- | ----- | ----- |
| Preguntar a Geni / usar Geni | Geni slot fijo | DEMO PREMIUM / MOCK |
| Crear tareas en Planner desde Geni | Geni creates\_tasks\_in Planner | POST\_MVP / DEMO PREMIUM |
| Acción dinámica genérica | QuickActions con acciones dinámicas | DEMO PREMIUM |
| SOS por gesto global swipe ↑ | documento principal | DEMO PREMIUM / POST\_MVP |
| Crear tarea | No aparece explícitamente como Quick Action | No definido |
| Crear evento | No aparece explícitamente como Quick Action | No definido |
| Invitar miembro | No aparece explícitamente como Quick Action | No definido |
| Agregar gasto | No aparece explícitamente como Quick Action, Adult puede crear gastos | DEMO PREMIUM / POST\_MVP |
| Check-in | Presence contiene CheckIn, no como QuickAction | DEMO PREMIUM / POST\_MVP |

### **Información faltante**

No se define:

* layout del menú;  
* bottom sheet/modal;  
* orden de acciones;  
* iconos;  
* estados;  
* acciones rápidas concretas para MVP.

---

## **14\. Módulos demo premium**

### **Finance**

Información detectada:

* Finance es dominio de administración financiera personal y familiar.  
* More contiene Finance.  
* Widget\_FinanceRelevant existe en Home.  
* Adult puede crear gastos según rol detectado.  
* Geni puede analizar Expense.

Clasificación:

* Finance real: POST\_MVP.  
* Finance card en More/Home: DEMO PREMIUM / MOCK.

No implementar real:

* cuentas financieras;  
* gastos reales;  
* presupuestos;  
* fondos;  
* deudas;  
* análisis Geni real.

### **Inventory**

Información detectada:

* Inventory contiene Consumable, HouseholdProduct, Medication.  
* More contiene Inventory.  
* Consumable, HouseholdProduct y Medication pueden disparar tareas en Planner.  
* Medication aparece también asociada a Adulto Mayor.

Clasificación:

* Inventory real: POST\_MVP.  
* Inventory demo: DEMO PREMIUM.  
* Relación Inventory → Planner Tasks: POST\_MVP / integración futura.

No implementar real:

* stock real;  
* vencimientos reales;  
* automatizaciones;  
* generación real de tareas.

### **Assets**

Información detectada:

* Assets contiene Vehicle, Pet, Device, Property.  
* Asset puede generar tarea en Planner.  
* Asset puede guardar documento en FamilyCloud.  
* Vehicle/Pet tienen responsable Person.

Clasificación:

* Assets real: POST\_MVP.  
* Assets demo: DEMO PREMIUM.  
* Integración Assets → Planner: POST\_MVP.

### **FamilyCloud / HomeCloud**

Información detectada:

* FamilyCloud contiene Album, Memory, Document, Trash.  
* More contiene FamilyCloud.  
* Document puede vincularse a Event, Goal, Expense, Asset, Person.  
* CalendarAutoAlbum dispara Memory desde evento finalizado.

Clasificación:

* FamilyCloud real/storage/OCR: POST\_MVP.  
* FamilyCloud demo visual: DEMO PREMIUM.  
* Relación Event → Memory: POST\_MVP.

### **Presence**

Información detectada:

* Presence contiene Location, Geofence, CheckIn, PresenceState, PresenceRecord.  
* Presence debe evitar vigilancia.  
* Niveles de visibilidad por rol son configurables.  
* No tiene widget permanente en Home.  
* Aparece mediante Briefing, Atención Requerida o widgets contextuales.  
* SOS usa Presence.  
* Geni coordina Presence.

Clasificación:

* Presence real/GPS/geofencing: POST\_MVP.  
* Presence resumido mock: DEMO PREMIUM / MOCK.  
* Restricción de no widget permanente: aplicar al frontend.

### **Geni**

Información detectada:

* Geni genera Briefing.  
* Geni usa memoria personal y familiar.  
* Geni powers Search.  
* Geni drives Automations.  
* Geni manages GeniEscalation.  
* Geni creates tasks in Planner.  
* Geni personalizes Home.  
* Geni sugiere, no impone.  
* Geni no debe usar etiquetas evaluativas.  
* Geni debe presentar datos con contexto.

Clasificación:

* Geni real: POST\_MVP.  
* Briefing mock / sugerencias visuales: DEMO PREMIUM / MOCK.  
* Tono Geni: REAL MVP como copywriting si se muestra.

### **Feed**

Información detectada:

* Feed celebra Task, Event y Goal.  
* Feed contiene Post, Comment, Reaction.  
* Feed no debe exponer faltas.  
* Logros sí pueden publicarse.  
* Faltas no van al Feed, van a Geni de forma privada.

Clasificación:

* Feed real: POST\_MVP.  
* Feed demo de logros: DEMO PREMIUM.  
* No mostrar fallos públicos: restricción transversal.

### **SOS**

Información detectada:

* SOS tiene tres niveles:  
  * Emergencia grave.  
  * Necesito ayuda.  
  * Coordinación urgente.  
* SOSPanel genera SOSAlert.  
* SOS es accesible con un gesto global swipe ↑.  
* SOS nunca dispara alerta sin panel de confirmación.  
* Cancelación no penaliza.  
* SOS en Home tiene prioridad máxima.  
* SOS comunica gravedad sin pánico.  
* SOS silencioso existe.

Clasificación:

* SOS real: POST\_MVP.  
* SOS demo visual: DEMO PREMIUM.  
* Swipe global real: POST\_MVP si no está implementado.  
* Principios de confirmación/cierre: reutilizables.

### **Automations**

Información detectada:

* Automations contiene Automation y AutomationLibrary.  
* Automation puede disparar Task, Notification, SOS.  
* Geni propone automatizaciones.

Clasificación:

* Automations real: POST\_MVP.  
* Automations demo visual: DEMO PREMIUM si aparece en More o Home.

### **Goals**

Información detectada:

* Planner contiene Goal.  
* Goal contiene Milestone.  
* Goal rastrea progreso vía Task.  
* Feed celebra Goal.

Clasificación:

* Goals real: POST\_MVP.  
* Goals demo visual: DEMO PREMIUM.

### **Notifications**

Información detectada:

* Notificaciones tienen prioridades:  
  * Crítica.  
  * Alta.  
  * Media.  
  * Baja.  
* Tareas vencidas son alta.  
* Eventos son media.  
* Bajo impacto se agrupa.  
* El sistema nunca notifica dos veces lo mismo.  
* SOS tiene prioridad absoluta y no puede silenciarse.

Clasificación:

* Push real: POST\_MVP.  
* Badges/alerts visuales: DEMO PREMIUM / REAL MVP según módulo.

### **Search**

Información detectada:

* Search global con Geni Search.  
* Indexa dominios, Settings y acciones ejecutables.

Clasificación: POST\_MVP / DEMO PREMIUM.

### **Activity / Carga Familiar**

Información detectada:

* Widget\_FamilyLoad existe.  
* Widget\_FamilyActivity existe.  
* Carga reducida y rachas afectan carga emocional.

Clasificación: MOCK / DEMO PREMIUM.

---

## **15\. Estados UX y feedback**

### **Estados detectados**

| Estado | Entidad / módulo | Clasificación |
| ----- | ----- | ----- |
| Pendiente | Membership / Task | REAL MVP si coincide con modelo final |
| Activa | Membership / Goal | REAL MVP para Membership; POST\_MVP para Goal |
| Suspendida | Membership | POST\_MVP o REAL si otra fuente lo requiere |
| Finalizada | Membership | REAL/POST\_MVP según alcance |
| En progreso | Task | Posible REAL MVP si se adopta |
| Completada | Task / Event / Goal | REAL MVP para Task/Event |
| Cancelada | Task / Event | REAL MVP para Event; Task según alcance |
| Vencida | Task calculada | REAL MVP visual, no estado persistente |
| Programado | Event | REAL MVP |
| Fallida | Goal | POST\_MVP |
| Activo | SOSAlert / Automation / Pet etc. | POST\_MVP |
| Cancelado | SOSAlert / Event | DEMO/POST\_MVP para SOS; REAL para Event si aplica |
| Cerrado | SOSAlert / Fund | DEMO/POST\_MVP |
| Crítica | Notification priority | POST\_MVP / DEMO |
| Alta | Notification priority | DEMO/REAL visual para tareas vencidas |
| Media | Notification priority | DEMO/REAL visual para eventos |
| Baja | Notification priority | DEMO |
| Aprobación | Invitations / carga reducida | REAL MVP para invitations; POST\_MVP para carga reducida |
| Cierre | SOS post-resolución | DEMO PREMIUM |

### **Feedback explícito**

* SOS confirma que ayuda está en camino.  
* SOS cancelado/cerrado confirma a destinatarios.  
* Cancelación no penaliza.  
* Post-resolución: “Cerrado. Todo en orden.”  
* Las alertas de bajo impacto se agrupan.  
* El sistema nunca notifica dos veces lo mismo.

### **No encontrado**

No se encontró información específica sobre:

* loading;  
* skeleton;  
* spinner;  
* retry;  
* error de red;  
* toast;  
* optimistic update;  
* refreshing;  
* empty state;  
* disabled state;  
* offline UI.

---

## **16\. Formularios y datos de entrada**

No se encontró información específica de formularios completos.

### **Datos de entrada parcialmente mencionados**

| Flujo | Campo / dato mencionado | Clasificación |
| ----- | ----- | ----- |
| SOS cancelación | motivo: error, falsa alarma, lo resolví, me equivoqué | DEMO PREMIUM / POST\_MVP |
| Modo carga reducida | solicitud del miembro | POST\_MVP |
| Modo carga reducida | respuesta coordinador: aprobar o proponer conversación | POST\_MVP |
| EmployeeOnboarding | horario y responsabilidades | POST\_MVP |
| Geni escalation onboarding | tiempos configurables por coordinador | POST\_MVP |

### **Formularios no definidos**

No se definen campos, validaciones, botones ni errores para:

* login;  
* register;  
* forgot password;  
* create household;  
* invite member;  
* join household;  
* profile;  
* create task;  
* edit task;  
* create event;  
* edit event;  
* settings;  
* módulos secundarios demo.

---

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Emergencia grave | Nivel SOS visual | DEMO PREMIUM |
| Necesito ayuda | Nivel SOS visual | DEMO PREMIUM |
| Coordinación urgente | Nivel SOS visual | DEMO PREMIUM |
| Error | Motivo de cancelación SOS | DEMO PREMIUM |
| Falsa alarma | Motivo de cancelación SOS | DEMO PREMIUM |
| Lo resolví | Motivo de cancelación SOS | DEMO PREMIUM |
| Me equivoqué | Motivo de cancelación SOS | DEMO PREMIUM |
| “Cerrado. Todo en orden.” | Mensaje de cierre SOS | DEMO PREMIUM |
| Compras | Responsibility / categoría Planner | REAL MVP / DEMO |
| Mascotas | Responsibility / categoría Planner | REAL MVP / DEMO |
| Limpieza | Responsibility / categoría Planner | REAL MVP / DEMO |
| Medicación | Senior / Inventory / recordatorio visual | DEMO PREMIUM / POST\_MVP |
| Semana de exámenes | Contexto de carga reducida / Calendar | POST\_MVP / DEMO |
| Día laboral cargado | Contexto de carga reducida / Calendar | POST\_MVP / DEMO |
| Evento familiar significativo | Contexto de Calendar | POST\_MVP / DEMO |
| “Esta semana completaste 6 de 10 tareas. Tu mejor semana del mes fue la segunda, con 9 de 10.” | Insight no evaluativo | DEMO PREMIUM / POST\_MVP |
| “Tomás completó todas sus tareas esta semana” | Ejemplo de reconocimiento correcto | DEMO PREMIUM |
| “Tomás lleva 5 días sin completar ninguna tarea” | Ejemplo de copy a evitar | IGNORAR como contenido; útil como prohibición |
| “Hay tareas sin resolver desde hace una semana. Puede ser un buen momento para hablar.” | Copy de escalada Geni | POST\_MVP / DEMO |
| Home | Tab global | REAL MVP |
| People | Tab global | REAL MVP |
| Planner | Tab global | REAL MVP |
| More | Tab global | REAL MVP |
| Settings | Sección en More | DEMO PREMIUM |
| Finance | Módulo en More | DEMO PREMIUM |
| Inventory | Módulo en More | DEMO PREMIUM |
| FamilyCloud | Módulo en More | DEMO PREMIUM |

### **Datos demo faltantes**

No se encontraron:

* nombres reales de miembros;  
* nombres de tareas concretas;  
* títulos de eventos concretos;  
* productos de inventario concretos;  
* gastos concretos;  
* vehículos concretos;  
* mascotas concretas;  
* documentos concretos;  
* lugares concretos;  
* copies de empty states;  
* copies de botones.

---

## **18\. Servicios frontend / APIs / datos**

No se encontró contrato API explícito en este documento.

### **Acciones/datos útiles para services**

| Acción / dato | Módulo | Estado |
| ----- | ----- | ----- |
| Listar próximos eventos | Home / Calendar | Acción conceptual sin endpoint |
| Listar tareas por responsabilidad | Home / Planner | Acción conceptual sin endpoint |
| Mostrar tareas vencidas | Home / Planner | Acción conceptual sin endpoint |
| Mostrar miembros y roles | People / Household | Acción conceptual sin endpoint |
| Crear tareas desde Geni | Geni / Planner | POST\_MVP |
| Automatización dispara Task | Automations / Planner | POST\_MVP |
| Inventory dispara Task | Inventory / Planner | POST\_MVP |
| Asset genera Task | Assets / Planner | POST\_MVP |
| SOS usa Presence | SOS / Presence | POST\_MVP |
| Geni genera Briefing | Geni / Home | MOCK / POST\_MVP |
| Geni personaliza Home | Geni / Home | POST\_MVP |

### **Fuentes de datos detectadas**

* Household.  
* Person.  
* Membership.  
* Role.  
* Task.  
* Responsibility.  
* Calendar.  
* Event.  
* Briefing.  
* Presence.  
* Finance.  
* Inventory.  
* FamilyCloud.

### **No encontrado**

* endpoints;  
* métodos HTTP;  
* request;  
* response;  
* errores;  
* paginación;  
* filtros;  
* Supabase client;  
* auth token;  
* storage;  
* realtime contract.

---

## **19\. Realtime / sincronización visible**

No se encontró contrato realtime explícito.

### **Eventos conceptuales que podrían afectar UI**

| Evento conceptual | Pantalla afectada | Clasificación |
| ----- | ----- | ----- |
| Task completada | Planner, Home, Feed demo | REAL MVP para Planner/Home; Feed POST\_MVP |
| Event creado/actualizado | Calendar, Home | REAL MVP si Events real |
| Invitation aceptada/aprobada | Household, People, Home | REAL MVP si invitations real |
| SOS activa | Home | POST\_MVP / DEMO |
| SOS cerrada/cancelada | Home / notificaciones | POST\_MVP / DEMO |
| Geni genera Briefing | Home | MOCK / POST\_MVP |
| Presence contextual | Home Briefing / Atención Requerida | MOCK / POST\_MVP |
| Inventory stock bajo genera Task | Planner | POST\_MVP |
| Asset genera Task | Planner | POST\_MVP |
| Automation dispara Task/Notification | Planner / Home | POST\_MVP |

### **No encontrado**

* updates entre dispositivos;  
* broadcast;  
* channels;  
* optimistic updates;  
* conflicto de edición;  
* estrategia offline.

---

## **20\. Permisos visibles en UI**

### **Roles y permisos detectados**

| Rol | Puede hacer según documento / comprensión | Restricciones | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinator | Aprobar ingresos, cambiar roles, expulsar, transferir coordinación | No administra vida privada; no obtiene acceso automático a datos privados | REAL MVP parcial / POST\_MVP para transferencia |
| Adult | Invitar, crear tareas, reasignar, crear eventos | No se detallan límites | REAL MVP parcial |
| Adolescent | Crear eventos familiares, gastos, administrar tareas propias | No debe sentir vigilancia | REAL MVP parcial / gastos DEMO |
| Child | Experiencia simplificada | No administra información familiar crítica | REAL MVP restricción UI |
| SeniorAdult | Experiencia adaptada; foco personas, eventos, recordatorios, medicación, coordinación | No exigir mecánicas complejas; no asumir condiciones médicas | DEMO PREMIUM / POST\_MVP |
| Guest | Acceso mínimo y participación limitada | Debe ser limitado pero cálido | DEMO PREMIUM / POST\_MVP |
| FamilyEmployee | Trabajo asignado; tono profesional; información necesaria para trabajar | No forma parte del núcleo familiar; no recibe Feed familiar afectivo | POST\_MVP / DEMO PREMIUM |

### **Permisos SOS detectados**

| Nivel SOS | Roles permitidos | Clasificación |
| ----- | ----- | ----- |
| Emergencia grave | Coordinador, Adulto, Adulto Mayor, Adolescente | POST\_MVP / DEMO |
| Necesito ayuda | Todos los roles, incluidos Niño y Empleado Familiar | POST\_MVP / DEMO |
| Coordinación urgente | Todos los roles | POST\_MVP / DEMO |

### **UI visible por permisos**

Aplicable:

* Ocultar acciones no permitidas.  
* Evitar botones que sugieran acceso a privacidad personal.  
* Senior debe tener experiencia simplificada.  
* Guest debe ver límites claros.  
* FamilyEmployee debe ver trabajo asignado, no contenido familiar afectivo.

No se encontró:

* matriz completa de permisos por pantalla;  
* reglas para deshabilitar botones;  
* errores de permiso;  
* navegación exacta por rol.

---

## **21\. Integraciones visibles entre módulos**

| Relación | Uso frontend | Clasificación |
| ----- | ----- | ----- |
| Home → Briefing | Primer widget/resumen | MOCK / DEMO PREMIUM |
| Home → AttentionRequired | Tareas vencidas, pagos vencidos, aprobaciones, SOS | REAL para tareas/aprobaciones; MOCK para pagos/SOS |
| Home → UpcomingEvents | Próximos eventos | REAL MVP |
| Home → TasksByResponsibility | Tareas agrupadas por responsabilidad | REAL MVP / MOCK |
| Home → FinanceRelevant | Resumen financiero | DEMO PREMIUM / MOCK |
| Home → PresenceSummary | Presence resumido contextual | MOCK |
| Home → FamilyActivity | Actividad familiar | MOCK / DEMO PREMIUM |
| BottomNavigation → Planner | Tab principal | REAL MVP |
| BottomNavigation → More | Tab principal | REAL MVP |
| BottomNavigation → QuickActions | Botón central \+ | REAL MVP |
| More → Finance | Acceso módulo demo | DEMO PREMIUM |
| More → Inventory | Acceso módulo demo | DEMO PREMIUM |
| More → FamilyCloud | Acceso módulo demo | DEMO PREMIUM |
| More → Settings | Acceso configuración | DEMO PREMIUM / parcial REAL |
| Planner → Task | Núcleo operativo | REAL MVP |
| Planner → Calendar/Event | Eventos | REAL MVP |
| Planner → Goal/Milestone | Futuro visual | POST\_MVP / DEMO |
| Task → Responsibility | Agrupación de tareas | REAL MVP / DEMO |
| Feed → Task/Event/Goal | Celebrar logros | POST\_MVP / DEMO |
| Inventory → Planner Task | Stock/items disparan tareas | POST\_MVP |
| Assets → Planner Task | Activo genera tarea | POST\_MVP |
| FamilyCloud → Event | Document/Memory vinculado a evento | POST\_MVP |
| Presence → SOS | Ubicación para alertas | POST\_MVP |
| Geni → Briefing | Resumen Home | MOCK / POST\_MVP |
| Geni → Planner Tasks | Crear tareas | POST\_MVP / DEMO |
| Geni → Search | Búsqueda global | POST\_MVP |
| Automations → Task/Notification/SOS | Automatizaciones | POST\_MVP |

---

## **22\. Edge cases frontend**

| Caso | Comportamiento esperado | Clasificación |
| ----- | ----- | ----- |
| SOS accidental | Cancelación sin penalización; pedir motivo sin juicio | DEMO PREMIUM / POST\_MVP |
| SOS abierto | Debe cerrarse; no dejar alerta sin cierre | DEMO PREMIUM / POST\_MVP |
| SOS en Home | Desplaza contenido, comunica gravedad sin pánico | DEMO PREMIUM / POST\_MVP |
| Miembro fantasma | No exponer públicamente ausencia; Geni trabaja en privado | POST\_MVP |
| Conflicto entre miembros | Sistema no interfiere, no fuerza interacción, no expone | POST\_MVP / principio UX |
| Nuevo miembro | Bienvenida ceremonial y primera tarea visible | DEMO PREMIUM |
| Coordinador en crisis | Delegación temporal con tono de cuidado | POST\_MVP |
| Adulto Mayor abrumado | Interfaz simplificada; funciones médicas opcionales | DEMO PREMIUM / POST\_MVP |
| Invitado excluido | Acceso limitado pero cálido, límites claros | DEMO PREMIUM |
| Empleado Familiar con ambigüedad | Tono profesional, límites visibles | POST\_MVP |
| Tarea vencida | No estado persistido; cálculo automático | REAL MVP visual |
| Fallos visibles en Feed | No publicar faltas; evitar humillación | Restricción global |
| Notificaciones repetidas | El sistema nunca notifica dos veces lo mismo | POST\_MVP / principio UI |
| Bajo impacto | Agrupar en resúmenes | DEMO / POST\_MVP |
| Privacidad por módulo | Configurable en futuro; no asumir acceso automático | POST\_MVP / restricción |

### **No encontrado**

No se encontró información específica sobre:

* email ya registrado;  
* credenciales inválidas;  
* token expirado;  
* invitación expirada;  
* invitación ya usada;  
* usuario sin hogar;  
* usuario pendiente de aprobación;  
* último coordinador;  
* tarea ya completada;  
* tarea no completada para verificar;  
* conflicto de evento;  
* error de red;  
* offline.

---

## **23\. Copywriting y labels**

### **Textos explícitos aprovechables**

| Texto / label | Uso | Clasificación |
| ----- | ----- | ----- |
| Home | Tab / pantalla | REAL MVP |
| People | Tab | REAL MVP |
| Planner | Tab | REAL MVP |
| More | Tab | REAL MVP |
| Settings | More | DEMO PREMIUM |
| Briefing | Widget Home | MOCK |
| Atención Requerida | Widget Home | REAL/MOCK |
| Carga Familiar | Widget Home | MOCK |
| Próximos Eventos | Widget Home | REAL MVP |
| Tareas por Responsabilidad | Widget Home | REAL MVP / MOCK |
| Finanzas Relevantes | Widget Home | MOCK |
| Presence Resumido | Widget Home | MOCK |
| Actividad Familiar | Widget Home | MOCK |
| Emergencia grave | SOS nivel | DEMO PREMIUM |
| Necesito ayuda | SOS nivel | DEMO PREMIUM |
| Coordinación urgente | SOS nivel | DEMO PREMIUM |
| Error | Motivo cancelación | DEMO PREMIUM |
| Falsa alarma | Motivo cancelación | DEMO PREMIUM |
| Lo resolví | Motivo cancelación | DEMO PREMIUM |
| Me equivoqué | Motivo cancelación | DEMO PREMIUM |
| “Cerrado. Todo en orden.” | Cierre SOS | DEMO PREMIUM |
| Coordinator / Coordinador | Rol | REAL MVP |
| Adult / Adulto | Rol | REAL MVP |
| Adolescent / Adolescente | Rol | REAL MVP |
| Child / Niño | Rol | REAL MVP |
| Senior / Adulto Mayor | Rol | DEMO/REAL parcial |
| Guest / Invitado | Rol | DEMO/REAL parcial |
| Empleado Familiar | Rol futuro | POST\_MVP |
| Compras | Responsabilidad | REAL/DEMO |
| Mascotas | Responsabilidad | REAL/DEMO |
| Limpieza | Responsabilidad | REAL/DEMO |

### **Copy de tono**

* Geni no debe usar etiquetas evaluativas.  
* Debe usar datos concretos con contexto.  
* Ejemplo: “Esta semana completaste 6 de 10 tareas. Tu mejor semana del mes fue la segunda, con 9 de 10.”  
* Escalada suave: “Hay tareas sin resolver desde hace una semana. Puede ser un buen momento para hablar.”  
* Reconocimiento correcto: “Tomás completó todas sus tareas esta semana.”  
* Copy a evitar como patrón: “Tomás lleva 5 días sin completar ninguna tarea.”

### **No encontrado**

No se encontraron:

* textos de botones;  
* títulos de pantallas auth;  
* errores de formularios;  
* mensajes de empty state;  
* mensajes de success;  
* tabs internos;  
* labels de filtros.

---

## **24\. Restricciones técnicas frontend**

No se encontró información específica en este documento sobre:

* Expo;  
* React Native;  
* Supabase;  
* Supabase Realtime;  
* Storage;  
* Edge Functions;  
* librerías instaladas;  
* librerías ausentes;  
* performance;  
* offline;  
* platform differences;  
* mobile constraints técnicos.

### **Restricciones de arquitectura/UX detectadas**

| Restricción | Clasificación |
| ----- | ----- |
| La complejidad interna no debe reflejarse en la interfaz | REAL MVP |
| Home resume, no administra | REAL MVP |
| Los módulos no deben sentirse como apps separadas | REAL MVP |
| Privacidad individual por encima de conveniencia | REAL MVP |
| Datos pertenecen a usuarios; FamilyHub administra, no posee | REAL MVP / principio |
| Vencida no es estado de tarea, se calcula | REAL MVP |
| Solo un nivel de subtareas | POST\_MVP si subtareas aparecen |
| Presence no tiene widget permanente en Home | DEMO/MOCK |
| Geni sugiere, no impone | DEMO/POST\_MVP |
| Feed no debe exponer fallos | POST\_MVP / restricción visual |
| Las automatizaciones ayudan, no reemplazan decisiones humanas críticas | POST\_MVP |
| Ningún rol accede automáticamente a datos privados | REAL MVP |

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Planner simple vs Planner avanzado | Documento menciona TaskTemplate, TaskAttachment, TaskComment, TaskDependency, TaskRecurrence, TaskVerification, Goals y Streaks | Mantener Tasks/Events mínimos como REAL; clasificar avanzados como POST\_MVP |
| Home real vs Home asistido por Geni | Briefing y personalización dependen de Geni | Usar Briefing mock; no implementar IA real |
| Presence en Home | Existe Widget\_PresenceSummary pero el documento dice que Presence no tiene widget permanente | Mostrar Presence solo contextual/mock o dentro de Briefing/Atención Requerida |
| Feed reconocimiento vs presión social | Feed celebra logros, pero puede humillar si expone faltas | En demo, mostrar solo logros o activity positiva |
| Roles MVP vs FamilyEmployee | Archivo incluye FamilyEmployee como rol, pero no forma parte del núcleo familiar | Mantener fuera de MVP real; usar solo como demo/futuro si se necesita |
| Senior como rol avanzado | Hay UX específica pero pendiente de investigación | No desarrollar adaptación profunda sin otra fuente |
| Geni escalada | Documento define escalada por días, compensación y aviso coordinador | POST\_MVP; no convertir en obligación del MVP |
| Rachas | Documento las trata como importantes, pero generan complejidad | POST\_MVP o mock visual |
| Notificaciones reales | Documento define prioridades, pero no tecnología ni endpoints | Usar como badges/alerts visuales, no push real |
| SOS real | Documento define mucha emoción y permisos | Para MVP premium puede ser demo visual, no emergencia real |
| MultiHomeSelector | Detectado como visible con 2+ hogares | Multi-hogar avanzado queda POST\_MVP |
| Adult/Adolescent pueden crear gastos | Finance real fuera de MVP | Si se muestra, hacerlo como DEMO PREMIUM |
| Templates vs responsabilidades | Documento define Responsibility y TaskTemplate, pero no categorías MVP | No resolver acá; usar como fuente parcial |
| Task states | Estados detectados no coinciden necesariamente con otros MVP técnicos | Marcar para merge; no imponer desde este documento |

---

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Design tokens | Necesario para UI premium coherente | Requiere otra fuente |
| Layout de Home | Define widgets pero no layout | Requiere diseño posterior |
| Layout de Planner | No define lista, tabs, calendar visual | Requiere otra fuente |
| Formularios auth/onboarding | No define campos ni errores | Requiere otra fuente |
| Formularios household/invitations | No define UI de crear/invitar/aprobar | Requiere otra fuente |
| Create/Edit Task | No define campos, validaciones ni botones | Requiere otra fuente |
| Create/Edit Event | No define campos ni vistas | Requiere otra fuente |
| Calendar day/week/month | No define visualización | Requiere otra fuente |
| Members list UI | Roles existen, pero no cards | Requiere otra fuente |
| More screen visual | Secciones existen, pero no layout | Requiere otra fuente |
| QuickActions menú | Existe panel, pero no acciones concretas | Requiere decisión posterior |
| Estados loading/error/empty | No aparecen | Requiere diseño UX |
| APIs/services | No aparecen endpoints | Requiere documento técnico |
| Realtime | No aparece contrato | Requiere fuente técnica |
| Datos demo concretos | Pocos ejemplos reales de datos | Requiere mock\_data\_fragment o diseño |
| Copy de botones | No aparece | Requiere UX/copy |
| Permisos detallados | Hay permisos parciales por rol, no matriz completa | Requiere merge |
| Visual de SOS | Se deriva a Sección 6 | No usar esta fuente como UI final |
| Visual de Feed logros | Se deriva a Sección 6 | No usar esta fuente como UI final |
| Modo carga reducida UI | Se deriva a Sección 6 | POST\_MVP |
| Data retention historial | Se deriva a Sección 8 | No definir acá |

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Bajo | No hay tokens visuales, pero sí tono emocional y restricciones visuales |
| `navigation_fragment` | Sí | Medio | Bottom Nav, QuickActions, Home, More, Settings, MultiHomeSelector aparecen en archivo de comprensión |
| `home_frontend_fragment` | Sí | Medio | Home tiene rol claro y widgets detectados |
| `planner_frontend_fragment` | Sí | Medio | Tareas, responsable visible, estado claro, Calendar, Responsibility y Goals aparecen |
| `people_members_frontend_fragment` | Sí | Medio | Roles, Membership, People, Guest, Senior, FamilyEmployee aportan UX |
| `household_invites_frontend_fragment` | Parcial | Bajo/Medio | Household, Membership e Invitation aparecen, pero falta UI |
| `auth_onboarding_frontend_fragment` | Parcial | Bajo | Onboarding aparece indirectamente; no hay auth UI |
| `quick_actions_frontend_fragment` | Sí | Medio | Botón `+`, Geni fijo y acciones dinámicas aparecen |
| `more_settings_frontend_fragment` | Sí | Medio | More y Settings aparecen como estructura |
| `finance_demo_fragment` | Parcial | Bajo | Finance aparece como módulo y widget, sin UI |
| `inventory_demo_fragment` | Parcial | Bajo | Inventory aparece con entidades e integración futura a Planner |
| `assets_demo_fragment` | Parcial | Bajo | Assets aparece con entidades e integración futura |
| `familycloud_demo_fragment` | Parcial | Bajo | FamilyCloud aparece en More y relaciones |
| `presence_demo_fragment` | Sí | Medio | Presence tiene fuertes restricciones emocionales y aparición contextual |
| `geni_demo_fragment` | Sí | Medio/Alto | Geni tiene tono, Briefing, escalada, sugerencias |
| `mock_data_fragment` | Parcial | Bajo | Hay pocos datos demo concretos |
| `ux_states_fragment` | Sí | Medio | Estados emocionales, task/event/membership states y notificación priorities |
| `frontend_services_fragment` | Parcial | Bajo | No hay endpoints; solo acciones conceptuales |

---

## **28\. Conclusión operativa**

Este documento debe usarse como fuente de principios globales de frontend premium, no como especificación visual final.

Aporta con fuerza:

* tono emocional;  
* reglas de no vigilancia;  
* claridad de tareas;  
* responsable visible;  
* estado claro;  
* Home como centro operativo;  
* Home resume, módulos administran;  
* navegación base Home / People / \+ / Planner / More;  
* QuickActions como panel flotante;  
* More como acceso a módulos especializados;  
* widgets de Home;  
* roles y experiencia emocional por rol;  
* restricciones para Presence;  
* restricciones para Feed;  
* restricciones para Geni;  
* criterios para notificaciones;  
* límites de presión social y culpa.

Debe entrar al `frontend_premium_mvp_spec.md` como:

* capa de UX global;  
* reglas de tono;  
* reglas de jerarquía de Home;  
* criterios de cards de tareas/eventos;  
* restricciones de módulos demo;  
* guía para evitar que la app se sienta punitiva o invasiva.

Debe quedar como POST\_MVP o DEMO PREMIUM:

* Geni real;  
* SOS real;  
* Presence GPS;  
* Feed real;  
* rachas;  
* carga reducida completa;  
* escalada automática;  
* automatizaciones;  
* Search global;  
* auditoría;  
* MultiHomeSelector;  
* Goals/Milestones;  
* FamilyCloud real;  
* Finance real;  
* Inventory real;  
* Assets real.

No alcanza para definir por sí solo:

* diseño visual final;  
* componentes exactos;  
* formularios;  
* endpoints;  
* realtime;  
* mocks completos;  
* pantallas finales;  
* permisos completos;  
* estados técnicos finales.

---

# **SOURCE 05 — RELATIONSHIP PHILOSOPHY**

## **Archivo recomendado**

`Seccion 5 filsofia de las relaciones.txt`

## **Tipo de documento**

Filosofía relacional / familia / colaboración

## **Uso para frontend**

Extraer:

* cómo representar miembros;  
* cómo evitar fricción familiar;  
* cómo mostrar asignaciones;  
* cómo mostrar responsabilidades;  
* cómo tratar permisos, aprobación, roles y participación;  
* reglas de lenguaje para no culpar ni presionar.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_SECCION\_5\_RELATIONSHIP\_PHILOSOPHY**

## **1\. Fuente**

* Documento: `HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY.md`  
* Archivo de comprensión asociado: `Seccion 5 filsofia de las relaciones.txt`  
* Source map previo: `source_map_HomePlus_SECCION_5_RELATIONSHIP_PHILOSOPHY.md`  
* Tipo de documento: filosofía de relaciones del ecosistema / arquitectura conceptual de conexiones entre dominios.  
* Alcance del documento: define cómo se conectan módulos, entidades y personas dentro de HomePlus; cómo Geni actúa como capa transversal; cómo se respetan roles, permisos, privacidad, navegación contextual y aislamiento entre hogares.  
* Utilidad para frontend global premium MVP: Media.  
* Motivo: aporta principios, navegación entre entidades, relaciones visibles, Home como resumen, Bottom Nav, More, Settings, QuickActions, widgets de Home, permisos visibles por rol y restricciones de privacidad. No define pantallas completas, diseño visual premium, formularios detallados, endpoints, estados UX completos ni contratos frontend/backend.

Referencias base:

---

## **2\. Utilidad frontend del documento**

Este documento sirve como fuente para definir cómo debe sentirse el frontend global de HomePlus a nivel de experiencia conectada:

* La app no debe sentirse como módulos aislados.  
* Las entidades relacionadas deben poder recorrerse mediante navegación contextual.  
* Home debe actuar como centro operativo/resumen.  
* Los módulos especializados administran su información.  
* La visibilidad de botones, enlaces, relaciones y datos depende del rol y del ámbito familiar/privado.  
* Geni puede inspirar widgets, sugerencias o briefing, pero no debe ejecutarse como IA real para el MVP.  
* Las relaciones no visibles por privacidad deben omitirse sin revelar que existen.  
* Las relaciones familiares no deben modificar permisos.  
* El hogar activo debe aislar datos, relaciones y contexto.  
* More agrupa herramientas especializadas.  
* Bottom Nav V1 aparece como `[Home] [People] [+] [Planner] [More]` en el archivo de comprensión.  
* Home contiene widgets como Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, TareasHome, Finanzas Relevantes, Presence Resumido y Actividad Familiar en el archivo de comprensión.

---

## **3\. Información de producto aplicable al frontend**

### **Principios aplicables**

* Ningún módulo de HomePlus funciona de forma aislada.  
* La plataforma es un ecosistema de entidades conectadas.  
* Cada dominio puede relacionarse con los demás.  
* Las conexiones están gobernadas por privacidad, roles y permisos.  
* La coordinación no autoriza acceso indiscriminado.  
* Una misma entidad puede aparecer referenciada desde múltiples módulos sin duplicarse, sin desincronizarse y sin violar privacidad.  
* Cada flecha o vínculo del ecosistema debe poder recorrerse si el rol del usuario tiene visibilidad.  
* Las entidades relacionadas deben exponerse en la vista de detalle.  
* La navegación debe permitir completar una intención sin volver manualmente al menú principal.  
* La app debe evitar ciclos infinitos de navegación.  
* Geni asiste, no decide.  
* Las sugerencias inteligentes deben ser optativas.  
* Ninguna automatización permanente debe crearse sin aprobación explícita del usuario.  
* Las relaciones familiares son informativas y no cambian permisos.  
* No existen relaciones entre hogares.  
* Home resume información y conduce al módulo que administra.  
* Más de cuatro niveles de navegación aparece como riesgo/fallo de navegación en el archivo de comprensión.

### **Clasificación**

#### **REAL MVP**

* Privacidad por rol y ámbito.  
* Relaciones visibles solo cuando el usuario tiene permiso.  
* Home como resumen de módulos reales cuando aplique.  
* Planner conectado con People/Members para responsables y eventos.  
* Household activo como contexto de datos.  
* Navegación contextual hacia detalle de entidades relacionadas.

#### **DEMO PREMIUM**

* Geni como inspiración visual de sugerencias/cards.  
* Home con widgets avanzados que parezcan vivos.  
* Carga Familiar como widget visual.  
* Presence Resumido como widget visual.  
* Actividad Familiar como widget visual.  
* More como launcher visual de módulos especializados.

#### **MOCK**

* Briefing.  
* Carga Familiar.  
* Presence Resumido.  
* Actividad Familiar.  
* Finanzas Relevantes si no hay backend real.  
* Sugerencias Geni.  
* Cards de módulos secundarios.

#### **POST\_MVP**

* Geni real.  
* Automatizaciones reales.  
* Search global real.  
* Auditoría completa visible.  
* Multi-hogar avanzado.  
* Offline sync.  
* GPS real.  
* OCR.  
* Reconocimiento facial.  
* Álbum automático.  
* Integraciones profundas con Finance, Inventory, Assets, HomeCloud, SOS.

---

## **4\. Navegación y arquitectura de pantallas**

### **Información encontrada**

* Bottom Nav V1 aparece en el archivo de comprensión con estructura congelada: `[Home] [People] [+] [Planner] [More]`.  
* QuickActions aparece como feature de navegación y contiene Geni.  
* More contiene Finance, Inventory, FamilyCloud y Settings.  
* Settings vive exclusivamente en More.  
* Settings se estructura en Hogar, Cuenta, Sistema y Auditoría.  
* Feed no es tab independiente en Bottom Nav; vive dentro de People.  
* Home puede adaptarse por rol.  
* SelectorHogar aparece como feature de header visible solo si el usuario pertenece a dos o más hogares.  
* SOSPanel aparece con acceso `swipe ↑ global`, pero SOS real queda fuera del MVP.  
* Las entidades relacionadas deben navegarse desde la vista de detalle.  
* El sistema debe reutilizar instancias existentes del stack para evitar ciclos.  
* El botón back del sistema operativo debe retroceder un nivel real.  
* Home puede abrir una tarea; esa tarea puede abrir un evento; ese evento puede abrir un documento; ese documento puede abrir un gasto, si todo es visible y autorizado.

### **Clasificación**

#### **REAL MVP**

* Bottom Nav: Home / People / \+ / Planner / More.  
* Home como entrada a tareas/eventos.  
* Planner como módulo accesible desde tab.  
* More como sección para herramientas especializadas.  
* Navegación contextual entre entidades reales del MVP: Home → Task, Home → Event, Task → Event si existe.  
* Back stack sin duplicar pantallas.

#### **DEMO PREMIUM**

* QuickActions visual con Geni y acciones demo.  
* More visual para Finance, Inventory, FamilyCloud, Settings.  
* SelectorHogar visual solo si aplica, pero multi-hogar avanzado no se desarrolla.  
* SOSPanel visual solo si se usa como demo.

#### **POST\_MVP**

* Search global real.  
* Navegación profunda hacia Finance, Inventory, Assets, HomeCloud, SOS como backend real.  
* Navegación global multi-hogar avanzada.  
* Algoritmos de QuickActions por frecuencia/contexto.

---

## **5\. Pantallas detectadas**

| Pantalla / Vista | Objetivo | Qué muestra | Acciones | Navegación | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo/resumen del hogar | Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, TareasHome, Finanzas Relevantes, Presence Resumido, Actividad Familiar | Abrir módulo dueño desde cada widget | Tab Home / links a módulos | REAL MVP \+ MOCK \+ DEMO PREMIUM |
| People | Contenedor de personas, Feed y Presence | People contiene Feed y Presence según comprensión | No especificado | Tab People | REAL MVP parcial / DEMO PREMIUM |
| Planner | Módulo operativo para Tasks, Calendar, Goal y Responsabilidad | Planner contiene Calendar, Goal y Responsabilidad según comprensión | No especificado | Tab Planner | REAL MVP para Tasks/Events/Calendar; POST\_MVP para Goals |
| More | Herramientas especializadas | Finance, Inventory, FamilyCloud, Settings | Abrir módulos especializados | Tab More | DEMO PREMIUM |
| Settings | Configuración | Hogar, Cuenta, Sistema, Auditoría | No especificado | Desde More | DEMO PREMIUM / parcial REAL si settings básicas existen |
| QuickActions | Acciones rápidas desde botón central `+` | Contiene Geni según comprensión | No especificado | Botón central Bottom Nav | DEMO PREMIUM / parcial REAL si crear tarea/evento se confirma en otras fuentes |
| Task Detail | Detalle de tarea relacionada | Debe mostrar Event si la Task pertenece a un Event | Abrir relación visible | Desde Home/Planner | REAL MVP parcial |
| Event Detail | Detalle de evento | Puede tener Personas, Presence, HomeCloud como relaciones | Abrir relaciones visibles si autorizadas | Desde Planner/Home/Task | REAL MVP parcial / POST\_MVP para relaciones externas |
| SOSPanel | Panel de emergencia | Niveles 🔴 🟠 🟡 | Abrir panel, no disparar directo | Swipe ↑ global | DEMO PREMIUM / fuera del MVP real |
| SelectorHogar | Cambiar hogar activo | Visible solo si usuario pertenece a 2+ hogares | Seleccionar hogar | Header | POST\_MVP / parcial si hogar activo se usa |

---

## **6\. Componentes y patrones UI reutilizables**

### **Componentes detectados o inferidos directamente desde relaciones del documento**

* Bottom Nav.  
* Botón central `+`.  
* Quick Actions.  
* Header con SelectorHogar.  
* Cards/widgets de Home.  
* Links internos entre entidades.  
* Vista de detalle de entidad.  
* Lista de herramientas en More.  
* Cards de módulo en More.  
* Widgets de Home:  
  * Briefing.  
  * Atención Requerida.  
  * Carga Familiar.  
  * Próximos Eventos.  
  * TareasHome.  
  * Finanzas Relevantes.  
  * Presence Resumido.  
  * Actividad Familiar.  
* Role-aware UI: Home adapta contenido por Rol.  
* Permission-aware UI: relaciones no autorizadas no se muestran.  
* Cards/list items con relaciones navegables.  
* Panel SOS como patrón global, aunque no se desarrolla real.  
* Search global como patrón futuro.

### **Patrones de interacción reutilizables**

* Tocar una card de Home debe llevar al módulo que administra la información.  
* Tocar una entidad relacionada debe navegar a su detalle.  
* No duplicar la misma entidad en el stack.  
* Back debe volver al nivel real anterior.  
* Si una relación no es visible por privacidad, no se muestra.  
* Geni sugiere; usuario confirma o descarta.  
* SOS siempre abre panel, nunca dispara alerta directa.

### **No encontrado**

* Skeletons.  
* Toasts.  
* Inputs.  
* Pickers.  
* Bottom sheets.  
* Modals específicos, salvo panel SOS.  
* Calendars visuales.  
* Progress bars.  
* Gráficos.  
* Layout visual detallado.  
* Chips/badges definidos explícitamente.  
* Avatares/iniciales definidos visualmente.

---

## **7\. Visual design aplicable**

No se encontró diseño visual explícito en este documento.

No se definen:

* colores;  
* gradientes;  
* blur;  
* glassmorphism;  
* sombras;  
* bordes;  
* radios;  
* spacing;  
* tipografía;  
* iconografía;  
* estilo iOS;  
* densidad;  
* tamaños de botones;  
* contraste;  
* estados visuales específicos.

### **Patrones visuales derivados directamente de reglas funcionales**

* Las relaciones visibles deben expresarse como elementos navegables.  
* Los widgets de Home deben funcionar como resúmenes accionables.  
* More debe agrupar herramientas especializadas.  
* El botón central `+` debe representar acciones rápidas.  
* Home debe ordenar contenido por prioridad si se usa MotorPrioridadHome.  
* SOS tiene prioridad máxima en Home y desplaza cualquier otro contenido, si se implementa visualmente.  
* Las entidades privadas o no visibles deben omitirse sin placeholders del tipo “oculto”.

---

## **8\. Home**

### **Rol de Home**

* Home aparece como centro operativo/resumen.  
* Home resume información; no administra información.  
* Toda información mostrada en Home debe conducir al módulo que la administra.  
* Home puede adaptarse por rol.  
* Home está powered\_by Geni en el archivo de comprensión.  
* Briefing agrega datos desde Planner, Finance y Presence en el archivo de comprensión.  
* Home contiene widgets relacionados con Planner, Presence, Finance, actividad y atención requerida.

### **Widgets detectados**

| Widget | Qué muestra | Clasificación | Notas |
| ----- | ----- | ----- | ----- |
| Briefing | Resumen diario del hogar generado por Geni | MOCK / DEMO PREMIUM | IA real queda POST\_MVP |
| Atención Requerida | Elementos urgentes como SOS, tareas vencidas, pagos vencidos | DEMO PREMIUM / REAL parcial | Para MVP real, solo tareas/eventos si existen |
| Carga Familiar | Distribución de carga entre miembros | MOCK / DEMO PREMIUM | Visible solo para Coordinador según comprensión |
| Próximos Eventos | Próximos eventos | REAL MVP | Debe abrir Planner/Event |
| TareasHome | Tareas agrupadas por responsabilidad; desaparece al completarse | REAL MVP | Debe abrir Planner/Task |
| Finanzas Relevantes | Pagos, metas, presupuesto | DEMO PREMIUM / MOCK | Finance real fuera del MVP |
| Presence Resumido | Estado resumido de presencia | MOCK / DEMO PREMIUM | GPS real fuera |
| Actividad Familiar | Actividad reciente | MOCK / DEMO PREMIUM | Feed real fuera |

### **Clasificación**

#### **REAL MVP**

* Próximos Eventos si Events existen.  
* TareasHome si Tasks existen.  
* Navegación Home → Planner/Task/Event.  
* Home como resumen, no administrador.  
* Adaptación básica por rol si ya existe rol en sesión.

#### **DEMO PREMIUM**

* Briefing visual.  
* Carga Familiar visual.  
* Presence Resumido visual.  
* Actividad Familiar visual.  
* Finanzas Relevantes visual.  
* Atención Requerida visual con datos de demo si no hay backend real.

#### **MOCK**

* Texto fijo de Briefing.  
* Datos dummy de carga.  
* Datos dummy de presence.  
* Activity falsa.  
* Métricas falsas.

#### **POST\_MVP**

* Geni real.  
* Motor de prioridad avanzado.  
* Finance real.  
* Presence GPS real.  
* Feed real.  
* SOS real.  
* Search global real.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner general**

* Planner es uno de los dominios principales del ecosistema.  
* Planner contiene Calendar, Goal y Responsabilidad según archivo de comprensión.  
* Planner se relaciona con People mediante Task asignada a Persona y Event con participantes.  
* Planner se relaciona con Home mediante TareasHome, Próximos Eventos y Briefing.  
* Planner se relaciona con Geni para consultar, analizar, relacionar, recomendar y automatizar, pero eso queda demo/POST\_MVP.  
* Planner se relaciona con Inventory y Assets porque estos pueden generar tareas, pero esas integraciones quedan fuera del MVP real.

### **Tasks**

Información encontrada:

* Task representa trabajo pendiente o realizado.  
* Task tiene estados en archivo de comprensión: Pendiente, En progreso, Completada, Cancelada.  
* Task puede estar asignada a Persona.  
* Task pertenece a Responsabilidad.  
* Task puede tener Subtarea.  
* Task puede tener Comentario.  
* Task puede tener Adjunto.  
* Task puede vincularse con Event.  
* Task puede depender de otra Task.  
* Task puede relacionarse con Goal.  
* Auditoría puede trackear Task.  
* Geni no puede marcar tareas como completadas automáticamente.  
* TareasHome muestra tareas agrupadas por responsabilidad y desaparece al completarse.  
* Ejemplo de tarea: “Comprar alimento para perro”.  
* Ejemplo de tarea en navegación: “Preparar comida para el asado”.  
* Ejemplo de responsabilidad: “Mascotas”.  
* Ejemplo de sugerencia Geni: “El stock de leche está bajo. ¿Creo una tarea de compras?”  
* Ejemplo de automatización sugerida: “Cada vez que el stock de pañales baje de 2 unidades, ¿creo una tarea de compra?”

Clasificación:

#### **REAL MVP**

* Listado visual de Tasks.  
* Completar tarea como acción real si backend existe.  
* Mostrar responsable si hay Persona visible.  
* Mostrar Responsabilidad si existe.  
* Mostrar relación Task → Event si existe y es visible.  
* Home/TareasHome actualiza al completarse.  
* Geni no completa tareas automáticamente.

#### **DEMO PREMIUM**

* Sugerencias visuales de Geni para crear tarea.  
* Cards de tarea con relaciones externas visuales no navegables si no hay módulo real.  
* Tareas agrupadas visualmente por responsabilidad.  
* Responsabilidad como chip/sección visual.

#### **POST\_MVP**

* Subtareas.  
* Comentarios.  
* Adjuntos.  
* Dependencias de tareas.  
* Goals vinculados.  
* Automatizaciones reales.  
* Inventory creando tareas automáticamente.  
* Assets creando tareas automáticamente.  
* Auditoría completa.  
* Streaks o análisis de hábitos.  
* Geni real.

### **Events / Calendar**

Información encontrada:

* Calendar pertenece a Planner.  
* Event tiene estados en archivo de comprensión: Programado, Completado, Cancelado.  
* Event puede tener múltiples participantes.  
* Event tiene participante Persona.  
* Event puede relacionarse con Presence.  
* Event puede tener ubicación/Lugar.  
* Event puede generar Álbum Automático.  
* Event se relaciona con HomeCloud.  
* Task puede vincularse con Event.  
* Si una Tarea pertenece a un Evento, el detalle de la Tarea muestra el Evento.  
* Ejemplo de evento: “Visita al veterinario — sábado 11:00”.  
* Ejemplo de evento: “Asado del sábado 13:00”.  
* Ejemplo de evento: “Cumpleaños de Gaby”.  
* Ejemplo de evento: “Vacaciones Córdoba”.  
* Álbum automático desde Calendar queda futuro/controlado por consentimiento.  
* En V1, participantes de álbumes y recuerdos se heredan del evento de Calendar según archivo de comprensión, pero FamilyCloud real queda fuera.

Clasificación:

#### **REAL MVP**

* Próximos Eventos en Home.  
* Listar eventos.  
* Navegar Home → Event.  
* Navegar Task → Event si existe.  
* Mostrar participantes visibles si hay datos de Members.  
* Calendar mínimo si otra fuente lo define.

#### **DEMO PREMIUM**

* Event cards visuales.  
* Relaciones visuales con documentos/álbumes solo como demo si se usa.  
* Eventos con lugares mock si no hay Presence real.

#### **POST\_MVP**

* Presence real en eventos.  
* HomeCloud real en eventos.  
* Álbum automático.  
* Participantes avanzados.  
* Recurrencia compleja.  
* Documentos asociados a eventos.  
* Geni agrupando tareas con eventos.  
* OCR/reconocimiento facial asociado a recuerdos/eventos.

### **Goals**

* Goal aparece dentro de Planner.  
* Goal se relaciona con Hitos, Tasks, Fondos y Finance.  
* Goal queda POST\_MVP para el MVP actual salvo uso visual/demo.  
* Goal puede inspirar Goals demo, pero no backend real.

---

## **10\. People / Members / Roles**

### **Información encontrada**

* People es dominio compartido.  
* People contiene Feed y Presence.  
* Persona es entidad transversal.  
* Persona puede ser responsable de tareas.  
* Persona puede ser participante de eventos.  
* Persona puede ser dueño de metas.  
* Persona puede tener Membership.  
* Membership pertenece a Hogar.  
* Membership tiene Rol.  
* Rol define permisos dentro del hogar.  
* Cada membresía posee un único rol activo según archivo de comprensión.  
* Roles detectados:  
  * Coordinador.  
  * Adulto.  
  * Adolescente.  
  * Niño.  
  * AdultoMayor.  
  * Invitado.  
  * EmpleadoFamiliar.  
* Relaciones familiares detectadas:  
  * Madre.  
  * Padre.  
  * Hijo.  
  * Hija.  
  * Abuelo.  
  * Abuela.  
  * Hermano.  
  * Hermana.  
  * Tutor.  
* Las relaciones familiares son informativas y no modifican permisos.

### **Permisos/visibilidad detectados**

* Coordinador puede gestionar Hogar.  
* Coordinador puede cambiar Rol.  
* Coordinador puede expulsar Persona.  
* Adulto tiene permisos según rol, no por parentesco.  
* Adolescente puede tener visibilidad limitada según relación.  
* Niño puede ver tareas propias en tabla de visibilidad de relaciones cruzadas.  
* Invitado tiene acceso limitado.  
* Empleado Familiar tiene acceso restringido a responsabilidades asignadas.  
* Empleado Familiar aparece como rol oficial con acceso restringido, pero fuera del MVP obligatorio salvo que otra fuente lo confirme.

### **Aplicación frontend**

#### **REAL MVP**

* Mostrar miembros/personas como responsables de tareas.  
* Mostrar participantes de eventos.  
* Mostrar rol como información visible si existe.  
* Respetar permisos por rol.  
* No usar parentesco para habilitar acciones.  
* Ocultar datos no autorizados.

#### **DEMO PREMIUM**

* Avatares/iniciales si otra fuente visual lo permite.  
* Role pills/status pills visuales si se diseñan en fusión.  
* Presence visual dentro People/Home como demo.

#### **POST\_MVP**

* Feed real.  
* Presence real.  
* Agenda laboral de Empleado Familiar.  
* Registro laboral.  
* Permisos finos avanzados.  
* Relaciones familiares avanzadas.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

Información encontrada:

* Hogar es unidad organizativa principal.  
* Un usuario puede pertenecer a múltiples hogares.  
* Cada hogar es independiente con sus propios roles, módulos y datos.  
* No existen relaciones entre hogares.  
* Una tarea de Hogar A no puede relacionarse con un evento de Hogar B.  
* Geni opera sobre el contexto del hogar activo.  
* SelectorHogar en header visible solo si usuario pertenece a dos o más hogares.  
* OfflineQueue sincroniza con Hogar en archivo de comprensión, pero offline real queda POST\_MVP.

### **Invitations**

Información encontrada en archivo de comprensión:

* Invitacion es workflow.  
* Flujo: Invitación → Aceptación → Aprobación si corresponde → Ingreso al hogar.

No se encontró en este documento:

* pantalla de invitar miembro;  
* link/código/token;  
* pending approval UI;  
* aprobar/rechazar UI;  
* campos de invitación;  
* estados de invitación;  
* errores visibles.

### **Onboarding**

No se encontró información específica de UI de onboarding.

### **Clasificación**

#### **REAL MVP**

* Hogar como contexto de datos.  
* Aislamiento por hogar.  
* Membership/Rol asociado al hogar.  
* No cruzar datos entre hogares.  
* Invitación conceptual si otra fuente define UI/API.

#### **DEMO PREMIUM**

* SelectorHogar visual si no se implementa multi-hogar avanzado.  
* Settings/Hogar como sección visual.

#### **POST\_MVP**

* Multi-hogar avanzado.  
* Search global multi-hogar.  
* Offline sync.  
* Automatizaciones entre hogares: no existen.

---

## **12\. More / Settings / Profile**

### **More**

Información encontrada:

* More es sección de herramientas especializadas.  
* More contiene Finance, Inventory, FamilyCloud y Settings.  
* More está en Bottom Nav.  
* More sirve como acceso a módulos secundarios.

### **Settings**

Información encontrada:

* Settings vive exclusivamente en More.  
* Settings se estructura en:  
  * Hogar.  
  * Cuenta.  
  * Sistema.  
  * Auditoría.

### **Profile**

No se encontró información específica de Profile.

### **Clasificación**

#### **REAL MVP**

* More como tab.  
* Settings básico visual si ya existe en app.  
* Hogar/Cuenta como secciones si hay datos reales.

#### **DEMO PREMIUM**

* Cards/list items para Finance, Inventory, FamilyCloud.  
* Settings visual completo sin lógica avanzada.  
* Auditoría visual como acceso no funcional o demo.

#### **POST\_MVP**

* Auditoría real.  
* Finance real.  
* Inventory real.  
* FamilyCloud real.  
* Settings avanzados.  
* Privacidad avanzada configurable.

---

## **13\. Quick Actions**

### **Información encontrada**

* QuickActions aparece como feature de navegación.  
* QuickActions contiene Geni.  
* El botón central `+` aparece en Bottom Nav como slot central.  
* QuickActions podría aprender de Auditoría según conexión implícita de baja confianza en el archivo de comprensión, pero no debe implementarse como real.  
* No se encontró menú explícito de acciones rápidas.  
* No se encontró si abre modal, bottom sheet o pantalla.

### **Acciones relacionadas detectadas**

| Acción | Fuente | Clasificación | Nota |
| ----- | ----- | ----- | ----- |
| Preguntar a Geni / abrir Geni | QuickActions contains Geni | DEMO PREMIUM | IA real POST\_MVP |
| Crear tarea sugerida por Geni | Geni recomienda crear tarea desde Inventory | DEMO PREMIUM / POST\_MVP | No backend real Inventory |
| Agendar recordatorio sugerido | Geni recomienda desde Assets | DEMO PREMIUM / POST\_MVP | No Assets real |
| Crear automatización | Geni sugiere automatizaciones | POST\_MVP | Requiere aprobación explícita |

No se encontró explícitamente:

* crear tarea desde `+`;  
* crear evento desde `+`;  
* invitar miembro desde `+`;  
* agregar gasto desde `+`;  
* agregar item desde `+`;  
* subir documento desde `+`;  
* check-in desde `+`;  
* SOS desde `+`.

---

## **14\. Módulos demo premium**

### **Finance**

Información encontrada:

* Finance es dominio especializado.  
* Persona puede relacionarse con gastos, cuentas, deudor/acreedor.  
* Gasto puede relacionarse con Persona, Responsabilidad, Goal, Fondo, Asset.  
* CuentaFinanciera tiene Gasto e Ingreso.  
* Presupuesto puede disparar Notificaciones.  
* Finanzas Relevantes aparece como widget de Home.  
* Geni puede analizar Finance.  
* Finanzas personales privadas no se muestran a otros.

Clasificación:

* DEMO PREMIUM para cards de gastos/presupuesto en Home/More.  
* MOCK para Finanzas Relevantes.  
* POST\_MVP para Finance backend real.

### **Inventory**

Información encontrada:

* Inventory es dominio especializado.  
* Consumible puede disparar Task.  
* Consumible puede disparar Gasto.  
* Stock bajo puede generar tarea de compra.  
* Medicamento puede disparar notificaciones.  
* Medicamentos pertenecen a Inventory, no Assets.  
* Sugerencia de compras cerca usa Ubicación e Inventory, pendiente de spec técnico.

Clasificación:

* DEMO PREMIUM para stock bajo / crear tarea sugerida.  
* MOCK para productos/medicación si se muestra.  
* POST\_MVP para Inventory backend real, geocercas y automatizaciones.

### **Assets**

Información encontrada:

* Asset puede asignarse a Persona.  
* Asset puede tener Mantenimiento.  
* Asset requiere Documento.  
* Mantenimiento puede generar Task.  
* Ejemplo: Perro “Toby”.  
* Ejemplo: Ford Focus.  
* Geni puede sugerir agendar recordatorio de service.

Clasificación:

* DEMO PREMIUM para mascotas/vehículos/mantenimiento visual.  
* MOCK para cards de assets.  
* POST\_MVP para Assets backend real.

### **FamilyCloud / HomeCloud**

Información encontrada:

* HomeCloud / FamilyCloud se relaciona con documentos, recuerdos y álbumes.  
* Documento puede relacionarse con Persona, Asset, Goal, Event y Gasto.  
* Event puede generar ÁlbumAutomático.  
* OCR y reconocimiento facial quedan futuro.  
* Documentos privados no son visibles para terceros.

Clasificación:

* DEMO PREMIUM para documentos/recuerdos visuales.  
* MOCK para álbumes/recuerdos.  
* POST\_MVP para storage real, OCR, reconocimiento facial, álbum automático real.

### **Presence**

Información encontrada:

* Presence tiene ubicación, lugares, geocercas, check-ins y estados.  
* PresenceResumido aparece en Home.  
* Presence se relaciona con Event y SOS.  
* Ubicación puede pausarse.  
* Historial de ubicaciones se retiene 30 días.  
* Estados manuales tienen prioridad sobre automáticos.

Clasificación:

* DEMO PREMIUM para Presence Resumido.  
* MOCK para estados/lugares.  
* POST\_MVP para GPS real, geofencing, historial real.

### **Geni**

Información encontrada:

* Geni es capa transversal, no módulo aislado.  
* Geni consulta, analiza, relaciona, recomienda y automatiza sobre dominios autorizados.  
* Geni respeta Rol.  
* Geni genera Briefing.  
* Geni powers Home y GeniSearch.  
* Geni nunca impone relaciones automáticas.  
* Geni nunca crea automatizaciones permanentes sin aprobación.  
* Geni no puede marcar tareas como completadas automáticamente.

Clasificación:

* DEMO PREMIUM para cards, sugerencias, briefing.  
* MOCK para texto fijo.  
* POST\_MVP para IA real.

### **Feed**

Información encontrada:

* Feed vive dentro de People.  
* Feed no es tab independiente.  
* Post tiene Comentario y Reaccion.  
* ActividadFamiliar aparece en Home.

Clasificación:

* DEMO PREMIUM/MOCK para Actividad Familiar.  
* POST\_MVP para Feed real.

### **SOS**

Información encontrada:

* SOSPanel es pantalla/panel.  
* SOS tiene niveles 🔴 🟠 🟡.  
* SOS tiene prioridad máxima en Home.  
* SOS siempre abre panel; nunca dispara alerta directa.  
* Niños y Empleados Familiares no pueden emitir Emergencia grave 🔴.

Clasificación:

* DEMO PREMIUM si se muestra visualmente.  
* POST\_MVP para SOS real, escalado, ubicación y notificaciones reales.

### **Automations**

Información encontrada:

* Automatización tiene Trigger y AcciónAutomatizada.  
* Automatización puede crear Task, Event y Notificaciones.  
* Geni puede crear/sugerir automatizaciones.  
* No se crean automatizaciones permanentes sin aprobación.  
* Automatizaciones operan a nivel hogar.  
* No existen automatizaciones compartidas entre hogares.

Clasificación:

* DEMO PREMIUM si se muestra como card futura.  
* POST\_MVP para automatizaciones reales.

### **Goals**

Información encontrada:

* Goal pertenece a Planner.  
* Goal tiene Hito.  
* Goal se relaciona con Task, Fondo y Finance.  
* Goal puede ser privado.  
* Meta personal → Tareas es visible solo para dueño.

Clasificación:

* DEMO PREMIUM opcional visual.  
* POST\_MVP para backend real.

### **Notifications**

Información encontrada:

* Notificaciones puede ser disparado por Presupuesto, Medicamento, SOSAlerta y Automatización.  
* Notificaciones filtradas por Rol.  
* Notificaciones agregadas por Hogar.  
* No existen sonidos propios en la app; solo notificaciones del sistema operativo.

Clasificación:

* DEMO PREMIUM/MOCK para banners in-app.  
* POST\_MVP para push real.

### **Search**

Información encontrada:

* Search indexa People, Planner, Finance, Presence, Inventory, Assets, FamilyCloud, Feed y Settings.  
* Search respeta Rol.  
* GeniSearch puede buscar dentro del hogar activo o globalmente según permisos.

Clasificación:

* POST\_MVP para Search real.  
* DEMO PREMIUM si se muestra input falso.

---

## **15\. Estados UX y feedback**

### **Estados detectados**

| Estado | Entidad / módulo | Clasificación | Nota |
| ----- | ----- | ----- | ----- |
| Pendiente | Task / Membership según comprensión | REAL MVP si aplica | No se define UI |
| En progreso | Task | POST\_MVP o decisión pendiente | No coincide con estados MVP definidos en otros prompts |
| Completada | Task | REAL MVP | TareasHome desaparece al completarse |
| Cancelada | Task / Event | REAL MVP parcial / POST\_MVP según alcance | No hay UI |
| Programado | Event | REAL MVP | No hay UI |
| Completado | Event | POST\_MVP o decisión pendiente | No hay UI |
| Activa | Membership / Goal / Fondo / Automatización / SOSAlerta según comprensión | Mixto | Depende del módulo |
| Suspendida | Membership | REAL MVP si membership lo usa | No hay UI |
| Finalizada | Membership | REAL MVP si membership lo usa | No hay UI |
| Archivada | Documento / Automatización / Consumible | POST\_MVP | No UI |
| Privado | Ámbito de entidad | REAL MVP | Ocultar si no visible |
| Familiar | Ámbito de entidad | REAL MVP | Visible según rol |
| Pausada | Ubicación / Automatización | POST\_MVP | No UI MVP |
| Papelera 30 días | Documento | POST\_MVP | No UI MVP |
| Expirado/vencido | Documento, pagos, mantenimiento, medicamento según módulos | DEMO/POST\_MVP | No detalle UI |

### **Estados UX no encontrados**

* loading;  
* refreshing;  
* skeleton;  
* toast;  
* success;  
* retry;  
* disabled;  
* empty state;  
* error de red;  
* forbidden como mensaje visual;  
* optimistic update;  
* realtime indicator.

### **Regla UX de privacidad**

* Si una relación existe pero no puede mostrarse por privacidad, no se menciona su existencia; simplemente se omite.

---

## **16\. Formularios y datos de entrada**

No se encontró información específica en este documento sobre formularios.

No se definen:

* login;  
* register;  
* forgot password;  
* create household;  
* invite member;  
* join household;  
* profile;  
* create task;  
* edit task;  
* create event;  
* edit event;  
* settings;  
* formularios demo;  
* campos obligatorios;  
* campos opcionales;  
* defaults;  
* validaciones;  
* errores;  
* botones;  
* responses.

---

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Módulo | Uso posible | Clasificación |
| ----- | ----- | ----- | ----- |
| Mamá | People / Members | Persona demo | MOCK |
| Papá | People / Members | Persona demo | MOCK |
| Mateo | People / Planner | Persona / tareas escolares | MOCK |
| Juan | Presence | Ejemplo de llegada / automatización | MOCK |
| Luca | SOS | Ejemplo de alerta SOS | MOCK |
| Gaby | Calendar / FamilyCloud | Evento cumpleaños | MOCK |
| Toby | Assets / Mascotas / Planner | Mascota asociada a responsabilidad Mascotas | MOCK |
| Comprar alimento para perro | Tasks | Tarea demo | REAL MVP / MOCK seed |
| Mascotas | Responsabilidad / categoría | Agrupador visual de tareas | REAL MVP / MOCK seed |
| Carnet de vacunación | HomeCloud | Documento relacionado | DEMO PREMIUM |
| $45 — Alimento balanceado | Finance | Gasto demo | DEMO PREMIUM / MOCK |
| Mercado Pago | Finance | Cuenta demo | DEMO PREMIUM / MOCK |
| Visita al veterinario — sábado 11:00 | Events | Evento demo | REAL MVP / MOCK seed |
| Veterinaria San Roque | Presence/Event | Lugar demo | MOCK |
| Cumpleaños de Gaby | Events / FamilyCloud | Evento demo | MOCK |
| Vacaciones Córdoba | Events / FamilyCloud | Evento demo | MOCK |
| Preparar comida para el asado | Tasks | Tarea demo | MOCK |
| Asado del sábado 13:00 | Events | Evento demo | MOCK |
| Lista de compras | Documento / Tasks | Documento demo | DEMO PREMIUM |
| $150 — Carnicería | Finance | Gasto demo | DEMO PREMIUM |
| Stock de leche bajo | Inventory → Planner | Sugerencia demo | DEMO PREMIUM |
| Stock de pañales bajo | Inventory → Planner | Sugerencia/automatización demo | DEMO PREMIUM / POST\_MVP |
| Service del auto | Assets → Planner | Recordatorio demo | DEMO PREMIUM |
| Ford Focus | Assets | Vehículo demo | DEMO PREMIUM |
| Supermercado | Finance | Gasto demo | DEMO PREMIUM |
| Delivery | Finance / Goals | Recomendación demo | DEMO PREMIUM |
| Emergencia grave 🔴 | SOS | Nivel visual | DEMO PREMIUM |
| Necesito ayuda 🟠 | SOS | Nivel visual | DEMO PREMIUM |
| Coordinación urgente 🟡 | SOS | Nivel visual | DEMO PREMIUM |

Datos que faltan:

* nombres reales de miembros para MVP;  
* seed data completo para tareas;  
* seed data completo para eventos;  
* textos de empty states;  
* labels de botones;  
* títulos de pantallas;  
* copy de onboarding;  
* datos visuales de cards premium.

---

## **18\. Servicios frontend / APIs / datos**

No se encontró contrato API explícito en este documento.

### **Acciones/datos conceptuales que podrían alimentar services**

| Acción / dato | Módulo | Estado |
| ----- | ----- | ----- |
| Consultar relaciones visibles de una entidad | Global | Conceptual, sin endpoint |
| Consultar tareas de Home | Home / Planner | Conceptual, sin endpoint |
| Consultar próximos eventos | Home / Planner | Conceptual, sin endpoint |
| Consultar miembros/responsables | People / Planner | Conceptual, sin endpoint |
| Filtrar datos por rol | Global | Regla, sin endpoint |
| Filtrar datos por ámbito familiar/privado | Global | Regla, sin endpoint |
| Obtener hogar activo | Household | Conceptual, sin endpoint |
| QuickActions contiene Geni | Navigation | Conceptual, sin endpoint |
| More contiene módulos | Navigation | Frontend estático posible |
| Settings por Hogar/Cuenta/Sistema/Auditoría | Settings | Conceptual, sin endpoint |
| Search indexa dominios | Search | POST\_MVP |
| OfflineQueue sincroniza con Hogar | Offline | POST\_MVP |

No se encontró:

* rutas;  
* métodos;  
* request;  
* response;  
* errores;  
* paginación;  
* filtros técnicos;  
* Supabase;  
* auth token;  
* realtime channel;  
* storage;  
* mock services explícitos.

---

## **19\. Realtime / sincronización visible**

### **Información encontrada**

* Task completada en Planner actualiza Home según data flow del archivo de comprensión.  
* Planner → Home: “Tarea completada” actualiza widget de tareas y reorganiza Home.  
* Finance → Home: pago vencido aparece en Atención Requerida y Finanzas Relevantes.  
* Assets → Home: documento próximo a vencer aparece en Atención Requerida.  
* Geni → Home: Briefing diario.  
* OfflineQueue sincroniza acciones sin conexión con Hogar, pero queda POST\_MVP.  
* No existen relaciones entre hogares.  
* Geni opera sobre hogar activo.

### **Clasificación**

#### **REAL MVP**

* Home debe reflejar cambios de Tasks/Events reales si existen.  
* Al completar tarea, TareasHome debe actualizarse/desaparecer.

#### **DEMO PREMIUM**

* Reordenamiento visual de Home por cambios.  
* Briefing que parece actualizado.  
* Activity falsa.

#### **POST\_MVP**

* Realtime real.  
* Broadcast multi-dispositivo.  
* OfflineQueue.  
* Resolución de conflictos.  
* Auditoría de sincronización.

No se encontró:

* eventos técnicos;  
* subscriptions;  
* Supabase realtime;  
* WebSocket;  
* invalidation strategy;  
* optimistic updates.

---

## **20\. Permisos visibles en UI**

### **Reglas generales**

* La visibilidad depende de Rol y ámbito.  
* Ningún rol obtiene acceso automático a memoria privada de Geni, metas privadas, documentos privados o finanzas personales.  
* Si una relación existe pero no puede mostrarse, se omite sin indicar que existe.  
* Relaciones familiares no modifican permisos.  
* La etiqueta Padre/Hijo no agrega ni quita permisos.  
* Hogar activo define contexto.  
* No cruzar datos entre hogares.

### **Tabla de visibilidad útil para UI**

| Relación consultada | Coordinador | Adulto | Adolescente | Niño | Invitado | Empleado Familiar | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| Tarea familiar → Responsable | Visible | Visible | Visible si propia o familiar | Solo propias | No visible | Solo asignadas | REAL MVP para Planner/People |
| Gasto familiar → Persona | Visible | Visible | No ve Finance | No visible | No visible | No ve Finance | DEMO/POST\_MVP |
| Evento → Documentos asociados | Visible | Visible | Visible si participa | No visible | Según permisos | No visible | POST\_MVP |
| Asset → Responsable | Visible | Visible | No visible | No visible | No visible | Si es su responsabilidad | DEMO/POST\_MVP |
| Meta personal → Tareas | Solo dueño | Solo dueño | Solo dueño | Solo dueño | Solo dueño | No visible | POST\_MVP |
| Presence → Ubicación | Nivel 3 | Nivel 3 | Nivel 2 | Nivel 2 | Nivel 2 | Según necesidad laboral | DEMO/POST\_MVP |
| SOS → Información enviada | Completa | Completa | Completa | Limitada | No visible | Si es destinatario | DEMO/POST\_MVP |

### **Acciones visibles detectadas**

| Rol | Puede hacer | No puede hacer | Módulo |
| ----- | ----- | ----- | ----- |
| Coordinador | Gestionar Hogar | No especificado | Household |
| Coordinador | Cambiar Rol | No especificado | Roles |
| Coordinador | Expulsar Persona | No especificado | Members |
| Niño | Ver solo tareas propias según tabla | No ve Finance | Planner / Finance |
| Niño | No puede emitir Emergencia grave 🔴 | Emitir SOS grave | SOS |
| Empleado Familiar | Ver tareas/responsabilidades asignadas | No forma parte del núcleo familiar | People / Planner |
| Empleado Familiar | No puede emitir Emergencia grave 🔴 | Emitir SOS grave | SOS |

---

## **21\. Integraciones visibles entre módulos**

| Relación frontend | Clasificación | Uso posible |
| ----- | ----- | ----- |
| Home → Planner Tasks | REAL MVP | Widget TareasHome abre Planner/Task |
| Home → Planner Events | REAL MVP | PróximosEventos abre Calendar/Event |
| Home → Members/Roles | REAL MVP parcial | Home adapta widgets por rol |
| Planner → People | REAL MVP | Tareas asignadas a Persona; eventos con participantes |
| Planner → Home | REAL MVP | Completar tarea actualiza Home |
| Planner → Calendar | REAL MVP | Planner contiene Calendar |
| Task → Event | REAL MVP | Link navegable en detalle |
| Home → Geni/Briefing | MOCK / DEMO PREMIUM | Briefing fijo o demo |
| Home → Presence | MOCK / DEMO PREMIUM | Presence Resumido |
| Home → Finance | DEMO PREMIUM | Finanzas Relevantes |
| Home → Feed | MOCK / DEMO PREMIUM | Actividad Familiar |
| More → Finance | DEMO PREMIUM | Módulo visual |
| More → Inventory | DEMO PREMIUM | Módulo visual |
| More → FamilyCloud | DEMO PREMIUM | Módulo visual |
| More → Settings | DEMO PREMIUM / REAL parcial | Configuración visual |
| QuickActions → Geni | DEMO PREMIUM | Abrir asistente/mock |
| Inventory → Task | POST\_MVP / DEMO | Crear tarea por stock bajo |
| Assets → Task | POST\_MVP / DEMO | Crear tarea de mantenimiento |
| Event → HomeCloud | POST\_MVP | Documento/álbum asociado |
| Event → Presence | POST\_MVP | Lugar/ubicación real |
| Geni → Automatizaciones | POST\_MVP | Sugerir/crear automatización con aprobación |
| Search → todos los módulos | POST\_MVP | Buscar respetando roles |
| OfflineQueue → Hogar | POST\_MVP | Sync offline |

---

## **22\. Edge cases frontend**

| Caso | Comportamiento frontend extraíble | Clasificación |
| ----- | ----- | ----- |
| Relación no visible por privacidad | Omitir sin mencionar existencia | REAL MVP |
| Entidad privada referenciada desde familiar | Mostrar solo si usuario es propietario o tiene permiso | REAL MVP |
| Padre/Hijo con roles distintos | No modificar permisos por parentesco | REAL MVP |
| Usuario en múltiples hogares | Usar contexto de hogar activo; SelectorHogar solo si 2+ hogares | POST\_MVP / parcial |
| Relación entre Hogar A y Hogar B | No permitir / no mostrar | REAL MVP |
| Navegación A → B → C → A | Reutilizar instancia A, no duplicar | REAL MVP |
| Botón back | Retrocede un nivel real | REAL MVP |
| Tarea completada | TareasHome desaparece o se actualiza | REAL MVP |
| Geni sugiere relación | Usuario confirma o descarta | DEMO/POST\_MVP |
| Geni sugiere automatización permanente | Requiere aprobación explícita | POST\_MVP |
| Geni intenta completar tarea | No puede completar automáticamente | POST\_MVP / regla de seguridad |
| SOS | Siempre abre panel, nunca dispara directo | DEMO/POST\_MVP |
| SOS en Home | Tiene prioridad máxima y desplaza contenido | DEMO/POST\_MVP |
| Niño / Empleado Familiar en SOS grave | No pueden emitir Emergencia grave 🔴 | DEMO/POST\_MVP |
| Ubicación pausada | No especifica UI; respetar pausa si se muestra | POST\_MVP |
| Offline actions | OfflineQueue futura | POST\_MVP |
| Más de 4 niveles de navegación | Riesgo/fallo de navegación | REAL MVP como restricción UX |

No se encontró:

* email ya registrado;  
* credenciales inválidas;  
* token inválido;  
* invitación expirada;  
* invitación ya usada;  
* usuario sin hogar;  
* usuario pendiente de aprobación;  
* tarea ya completada;  
* conflicto de evento;  
* error de red;  
* retry.

---

## **23\. Copywriting y labels**

### **Textos/frases extraídas**

* “Comprar alimento para perro”  
* “Visita al veterinario — sábado 11:00”  
* “Veterinaria San Roque”  
* “¿Qué tareas pendientes tiene Mateo esta semana?”  
* “¿Cuánto gastamos en supermercado este mes?”  
* “¿Qué documentos están próximos a vencer?”  
* “¿Quién está en casa ahora?”  
* “Mateo completó todas sus tareas escolares 5 días seguidos”  
* “Detecté 3 tareas relacionadas con el evento 'Cumpleaños de Gaby'. ¿Querés agruparlas?”  
* “Este documento tiene fecha del 15/03. ¿Corresponde al evento 'Vacaciones Córdoba'?”  
* “El stock de leche está bajo. ¿Creo una tarea de compras?”  
* “Hace 6 meses que no se hace el service del auto. ¿Agendo un recordatorio?”  
* “Cada vez que el stock de pañales baje de 2 unidades, ¿creo una tarea de compra?”  
* “Cuando Juan llegue a Casa, ¿aviso a Mamá?”  
* “Preparar comida para el asado”  
* “Asado del sábado 13:00”  
* “Lista de compras”  
* “$150 — Carnicería”  
* “Las relaciones son informativas. No modifican permisos automáticamente.”  
* “Home resume información. No administra información. Toda información mostrada debe conducir al módulo que la administra.”  
* “No existen relaciones entre hogares.”

### **Labels detectados**

* Home.  
* People.  
* Planner.  
* More.  
* Settings.  
* QuickActions.  
* Briefing.  
* Atención Requerida.  
* Carga Familiar.  
* Próximos Eventos.  
* TareasHome.  
* Finanzas Relevantes.  
* Presence Resumido.  
* Actividad Familiar.  
* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.  
* Hogar.  
* Cuenta.  
* Sistema.  
* Auditoría.  
* Emergencia grave 🔴.  
* Necesito ayuda 🟠.  
* Coordinación urgente 🟡.

No se encontró:

* títulos completos de pantallas;  
* botones;  
* mensajes de error;  
* mensajes de éxito;  
* empty states;  
* copy de onboarding;  
* copy de auth.

---

## **24\. Restricciones técnicas frontend**

### **Restricciones detectadas**

* No mostrar relaciones si el usuario no tiene visibilidad sobre todos los eslabones.  
* No revelar que existe información oculta.  
* No duplicar entidades en navegación.  
* Back debe retroceder un nivel real.  
* Home no administra; conduce al módulo dueño.  
* Feed no es tab independiente.  
* Settings vive exclusivamente en More.  
* More contiene herramientas especializadas.  
* Bottom Nav V1: `[Home] [People] [+] [Planner] [More]`.  
* SelectorHogar solo visible con 2+ hogares.  
* No existen relaciones entre hogares.  
* Geni opera sobre hogar activo.  
* Geni no completa tareas automáticamente.  
* Geni no crea automatizaciones permanentes sin aprobación.  
* SOS siempre abre panel; no dispara alerta directa.  
* La app no tiene sonidos propios; solo notificaciones del sistema operativo.  
* Más de cuatro niveles de navegación es fallo de navegación.  
* El reconocimiento facial es V2 futura.  
* OCR futuro.  
* OfflineQueue futuro.  
* Storage real no definido.

No se encontró:

* stack técnico;  
* Expo;  
* React Native;  
* Supabase;  
* librerías;  
* performance;  
* platform differences;  
* constraints mobile específicos.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Planner simple vs Planner conectado | El documento propone muchas relaciones avanzadas que pueden inflar el MVP | Usar solo Task/Persona/Responsabilidad/Event/Home como real; marcar resto POST\_MVP |
| Home real vs Geni-powered | Home aparece powered\_by Geni, pero IA real no conviene para MVP | Briefing y widgets avanzados como MOCK/DEMO PREMIUM |
| Bottom Nav y módulos | More incluye módulos que no serán backend real | Mostrar como demo visual, no implementar backend |
| Roles y permisos | Hay visibilidad por rol, pero no contratos completos por acción | Aplicar solo restricciones explícitas; no inventar permisos |
| Multi-hogar | Documento contempla múltiples hogares y selector | MVP puede usar hogar activo; multi-hogar avanzado POST\_MVP |
| Task states | Comprensión menciona Pendiente/En progreso/Completada/Cancelada; otros prompts MVP pueden usar otros estados | No resolver aquí; marcar contradicción para merge |
| Event states | Comprensión menciona Programado/Completado/Cancelado; no hay UI ni API | Usar solo si coincide con specs posteriores |
| Responsabilidad vs Categoría vs Template | Documento define Responsabilidad, pero no templates/categorías MVP | No duplicar modelos; fusionar con specs de Planner |
| Geni sugerencias | Muchas acciones parecen útiles, pero requieren IA o automatización | Usar solo como mock o copy demo |
| Privacy UX | Omitir entidades sin explicar puede parecer ausencia de datos | Mantener regla, pero diseñar UI sin revelar ocultamiento |
| Navigation depth | Relaciones cross-domain pueden generar navegación profunda | Limitar MVP a rutas principales y evitar más de 4 niveles |
| SOS priority | SOS desplaza Home, pero SOS real fuera del MVP | No hacerlo real salvo demo controlada |
| QuickActions | Solo se sabe que contiene Geni; faltan acciones concretas | No inventar menú completo desde esta fuente |
| Search | Search indexa muchos dominios, pero es avanzado | POST\_MVP |
| Feed | Feed vive dentro de People, pero actividad aparece en Home | Actividad Familiar mock, Feed real fuera |
| FamilyCloud/Event | Álbum automático desde Calendar puede parecer tentador | POST\_MVP |

---

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Design tokens | Necesarios para frontend premium coherente | No se puede definir visual final |
| Colores/tipografía | Necesarios para look premium | Queda para documento visual |
| Layout de pantallas | Necesario para Codex | No se puede implementar desde esta fuente |
| Componentes UI concretos | Necesario para reutilización | Solo hay patrones conceptuales |
| Auth UI | Login/Register/onboarding no definidos | Fragment no sirve para Auth visual |
| Household UI | Crear hogar/invitar/aprobar no definido | Requiere otras fuentes |
| Planner UI | Listas, forms, tabs, calendar no definidos | Requiere spec Planner |
| Home layout | Widgets detectados pero sin layout | Requiere diseño Home |
| More UI | Secciones detectadas sin diseño | Requiere spec visual |
| QuickActions UI | No se define menú ni acciones | Requiere otra fuente |
| Estados UX | Faltan loading/error/empty/success | Requiere fragment UX |
| Formularios | No hay campos ni validaciones | Requiere API/spec |
| Endpoints | No hay rutas ni contracts | Requiere API docs |
| Realtime | No hay implementación ni eventos técnicos | Requiere backend/spec |
| Mock data completo | Solo hay ejemplos sueltos | Requiere mock data fragment |
| Permisos accionables | Faltan reglas por botón/acción | Requiere roles permissions spec |
| Copy final | Solo hay frases de ejemplo | Requiere UX writing |
| Accesibilidad | No hay reglas explícitas | Requiere design system |
| Mobile constraints | No hay detalles de RN/Expo | Requiere frontend audit |

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Bajo | No hay visual design, solo patrones conceptuales |
| `navigation_fragment` | Sí | Medio | Hay Bottom Nav, More, QuickActions, navegación contextual y reglas de stack |
| `home_frontend_fragment` | Sí | Medio | Hay widgets, Home resume, prioridad y conexiones |
| `planner_frontend_fragment` | Sí | Medio | Hay relaciones Task/Persona/Responsabilidad/Event/Home |
| `people_members_frontend_fragment` | Sí | Medio | Hay Persona, Roles, Membership, visibilidad y relaciones |
| `household_invites_frontend_fragment` | Parcial | Bajo | Hay Hogar/Membership/Invitación conceptual, falta UI |
| `auth_onboarding_frontend_fragment` | No | Vacío | No hay login/register/onboarding UI |
| `quick_actions_frontend_fragment` | Parcial | Bajo | Solo se sabe que contiene Geni |
| `more_settings_frontend_fragment` | Sí | Medio | More y Settings aparecen con estructura |
| `finance_demo_fragment` | Parcial | Medio | Hay relaciones y ejemplos, no UI |
| `inventory_demo_fragment` | Parcial | Medio | Hay stock bajo/medicamentos/sugerencias a tareas |
| `assets_demo_fragment` | Parcial | Medio | Hay mascotas/vehículos/mantenimiento/documentos |
| `familycloud_demo_fragment` | Parcial | Medio | Hay documentos, recuerdos, álbumes, OCR futuro |
| `presence_demo_fragment` | Parcial | Medio | Hay Presence Resumido, ubicación, lugares, estados |
| `geni_demo_fragment` | Sí | Alto | Hay muchas capacidades, restricciones y ejemplos de copy |
| `mock_data_fragment` | Sí | Medio | Hay ejemplos concretos de tareas, eventos, personas, lugares, gastos |
| `ux_states_fragment` | Parcial | Bajo | Hay privacidad/visibilidad/back stack, faltan estados clásicos |
| `frontend_services_fragment` | Parcial | Bajo | Hay entidades/datos conceptuales, no endpoints |

---

## **28\. Conclusión operativa**

Este documento no sirve para construir por sí solo una UI premium completa, pero sí aporta reglas fundamentales para que el frontend global de HomePlus se sienta coherente, conectado y profesional.

### **Debe usarse en la spec final para:**

* Definir navegación contextual entre entidades.  
* Definir Bottom Nav V1: Home / People / \+ / Planner / More.  
* Definir More como área de herramientas especializadas.  
* Definir Settings dentro de More.  
* Definir Home como resumen y no administrador.  
* Definir widgets de Home: Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, TareasHome, Finanzas Relevantes, Presence Resumido, Actividad Familiar.  
* Definir Planner conectado con People, Home y Calendar.  
* Definir Responsabilidad como agrupador visual de tareas.  
* Definir visibilidad por rol/ámbito.  
* Definir ocultamiento silencioso de relaciones privadas.  
* Definir reglas de navegación sin ciclos.  
* Definir restricciones para Geni: sugerir, no imponer; no completar tareas automáticamente; no crear automatizaciones permanentes sin aprobación.  
* Definir qué módulos pueden ser demo premium desde More/Home.

### **Debe tratarse como mock/demo:**

* Briefing.  
* Carga Familiar.  
* Presence Resumido.  
* Actividad Familiar.  
* Finanzas Relevantes.  
* Geni.  
* Finance.  
* Inventory.  
* Assets.  
* FamilyCloud.  
* Feed.  
* SOS visual.  
* Automations visual.  
* Search visual.

### **Debe quedar fuera del MVP actual:**

* IA real.  
* Automatizaciones reales.  
* Offline sync.  
* Search global real.  
* GPS/geofencing real.  
* Storage/OCR/reconocimiento facial.  
* Finance backend real.  
* Inventory backend real.  
* Assets backend real.  
* FamilyCloud backend real.  
* Feed real.  
* SOS real.  
* Multi-hogar avanzado.  
* Auditoría completa visible.

### **Información que debe venir de otros documentos:**

* diseño visual premium;  
* pantallas reales;  
* formularios;  
* endpoints;  
* estados UX;  
* copy final;  
* mock data completo;  
* permisos accionables;  
* implementación de Home real;  
* implementación de Planner real;  
* implementación de Members/Invitations real.

---

# **SOURCE 06 — UX PHILOSOPHY**

## **Archivo recomendado**

`Seccion 6 filosofia ux.txt`

## **Tipo de documento**

Filosofía UX

## **Uso para frontend**

Extraer:

* reglas de navegación;  
* reglas de simplicidad;  
* reglas de jerarquía;  
* cómo ocultar complejidad;  
* qué debe estar visible y qué bajo demanda;  
* patrones globales de interacción;  
* criterios para “premium”.

## **Contenido extraído**

# **frontend\_global\_fragment\_ux\_philosophy**

## **1\. Fuente**

* Documento: `HomePlus — SECCION 6 UX PHILOSOPHY.md`  
* Archivo de comprensión asociado: `Seccion 6 filosofia ux.txt`  
* Tipo de documento: Documento UX/UI, filosofía de interacción, arquitectura mobile-first y extracción estructurada de entidades/reglas.  
* Alcance del documento: Mobile-first absoluto. Filosofía de interacción, no diseño visual completo. Define navegación, arquitectura de pantalla, feedback, accesibilidad, adaptación por rol, decisiones UX y relaciones entre dominios.  
* Nivel de utilidad frontend: Alto.

## **2\. Utilidad frontend del documento**

Este documento es altamente útil para el frontend global premium porque define reglas transversales que afectan a toda la app:

* Home como pantalla inicial y centro operativo.  
* Bottom Nav congelada: `[Home] [People] [+] [Planner] [More]`.  
* Quick Actions con botón `+` central y panel flotante con blur.  
* Planner como tab principal con Tasks, Calendar y Goals.  
* More como espacio de herramientas especializadas.  
* People como agrupador de Feed, Presence y Personas.  
* Regla 1-tap para acciones principales.  
* Feedback inmediato en menos de 100ms.  
* Progressive disclosure en 4 niveles.  
* Bottom sheets para crear/editar.  
* Modales solo para confirmaciones.  
* Diseño por rol.  
* Accesibilidad integrada en componentes base.  
* Paleta tierra-cálida, no estética de productividad.  
* Home resume; los módulos administran.  
* Módulos demo útiles para More/Home: Finance, Inventory, FamilyCloud/HomeCloud, Presence, Feed, Geni, SOS, Automations.  
* Entidades útiles para UI: Person, Membership, Role, Task, Event, Calendar, Goal, Responsibility, Briefing, AttentionRequired, QuickActions, MoreScreen, SettingsScreen.

## **3\. Información de producto aplicable al frontend**

### **Principios centrales**

* HomePlus se define como “Sistema Operativo del Hogar”.  
* La complejidad del hogar debe resolverse mediante diseño y automatización, no trasladando configuraciones complejas al usuario.  
* Toda funcionalidad nueva debe responder si ayuda a coordinar, reduce carga mental, evita perder información, mejora organización o automatiza trabajo repetitivo.  
* La privacidad individual tiene prioridad sobre la conveniencia.  
* Los datos pertenecen a los usuarios; HomePlus administra, no posee.  
* Coordinación por encima de jerarquía: los coordinadores administran el hogar, no la vida privada.  
* Las acciones que afectan al hogar deben ser visibles.  
* Las automatizaciones ayudan, no reemplazan decisiones humanas críticas.  
* Cuando Geni recomienda algo importante, debe poder explicar el contexto utilizado.  
* Cada hogar funciona como entidad independiente.  
* Home resume, no administra.  
* La app se aprende usándose; no debe depender de tutoriales extensos.  
* El empty state funciona como guía.  
* El objetivo de onboarding es llegar a valor en 60 segundos, no completar todo el setup.  
* El diseño debe ser por rol, no solo por feature.  
* Distintos momentos de vida requieren distinta arquitectura de información, no solo filtros.  
* El hogar no debe sentirse como una oficina.  
* Paleta tierra-cálida; evitar colores de productividad.

### **Clasificación**

#### **REAL MVP**

* Home como centro operativo.  
* Bottom Nav fija.  
* Planner visible.  
* People visible.  
* More visible.  
* Quick Actions visible.  
* Diseño mobile-first.  
* Feedback inmediato.  
* Acciones principales 1-tap.  
* Tareas/eventos visibles en Home y Planner cuando existan datos reales.  
* Members/personas como entidad transversal para asignaciones, avatares y roles.  
* Roles visibles en UX.  
* Household como contexto base de datos visibles.

#### **DEMO PREMIUM**

* Finance en More.  
* Inventory en More.  
* FamilyCloud/HomeCloud en More.  
* Presence dentro de People.  
* Feed dentro de People.  
* Geni como acceso transversal desde Quick Actions.  
* More con cards e indicadores.  
* Home con Carga Familiar, Presence resumido, Actividad Familiar y Finanzas relevantes.  
* Quick Actions dinámicas ordenadas por uso/contexto.  
* Search/GeniSearch como referencia visual si aparece.

#### **MOCK**

* Briefing si no hay IA real.  
* Carga Familiar si no hay cálculo real.  
* Presence resumido si no hay GPS/estado real.  
* Actividad Familiar si no hay Feed real.  
* Finanzas relevantes si Finance no tiene backend.  
* Stock bajo/medicación si Inventory no tiene backend.  
* Último álbum/recuerdo si FamilyCloud no tiene backend.  
* Reconocimiento visual si no hay Feed/reacciones reales.

#### **POST\_MVP**

* IA real.  
* Automatizaciones reales.  
* Offline sync.  
* GPS real/geofencing.  
* OCR.  
* Storage avanzado.  
* Auditoría completa.  
* Permisos granulares completos.  
* Multi-hogar avanzado.  
* Facial recognition.  
* Annual Recap.  
* Family Timeline.  
* Search global real ejecutando acciones.  
* Notificaciones push reales.

## **4\. Navegación y arquitectura de pantallas**

### **Modelo de navegación**

* Nivel 0: Home.  
* Nivel 1: Navegación principal con Bottom Nav.  
* Nivel 2: Dominio.  
* Nivel 3: Vista específica / detalle.  
* Nivel 4: Acción puntual.  
* Más de 4 niveles es fallo de navegación.  
* Objetivo: 95% de acciones en 3 niveles o menos.  
* La navegación entre dominios relacionados no suma nivel; es movimiento lateral.  
* Search Global funciona como navegador interno accesible desde cualquier pantalla, según el documento.

### **Bottom Nav**

Estructura oficial congelada:

`[ Home ] [ People ] [ + ] [ Planner ] [ More ]`

| Tab | Contenido | Clasificación |
| ----- | ----- | ----- |
| Home | Briefing, Atención Requerida, widgets | REAL MVP \+ MOCK |
| People | Feed, Presence, Personas | DEMO PREMIUM / REAL parcial para Members |
| `+` | Quick Actions, Geni fijo \+ acciones dinámicas | REAL visual / DEMO PREMIUM |
| Planner | Tasks, Calendar, Goals | REAL MVP para Tasks/Events/Calendar; Goals POST\_MVP/DEMO |
| More | Finance, Inventory, HomeCloud/FamilyCloud, Settings | DEMO PREMIUM / Settings parcial |

Reglas:

* Bottom Nav no se modifica sin enmienda.  
* Geni no tiene tab propio.  
* SOS no está en Bottom Nav.  
* SOS no está en Quick Actions.  
* Feed no es tab independiente; vive en People.  
* Finance, Inventory, FamilyCloud y Settings viven en More.  
* Responsabilidades no son dominio independiente; son eje interno de Tasks.  
* Multi-hogar no vive en More; vive como selector global en header.  
* Settings vive exclusivamente en More.  
* Badge en nav solo usa success o alert.  
* Nunca usar rojo/error en Bottom Nav.  
* Tab activo: ícono filled \+ texto peso 600\.  
* Tab inactivo: ícono outline \+ texto peso 400\.  
* Tap en tab activo: scroll to top \+ refresh.

### **Transiciones**

| Transición | Patrón | Duración / animación | Uso |
| ----- | ----- | ----- | ----- |
| Home → Dominio | Stack push | Slide right → left, 250ms ease-out | Navegación principal |
| Dominio → Detalle | Stack push | Slide right → left, 250ms ease-out | Profundizar en item |
| Detalle → Configuración avanzada | Stack push | Slide right → left, 250ms ease-out | Toggle avanzado |
| Crear/Editar | Bottom sheet | Slide up \+ fade, 300ms ease-out | Acción contextual |
| Confirmación | Modal centrado | Scale 0.95→1 \+ fade, 250ms ease-out | Decisiones con consecuencia |
| Quick Actions | Panel flotante \+ blur | Fade in \+ slide up, 200ms ease-out | Acciones rápidas |
| SOS | Panel | Slide up, 200ms ease-out | Emergencia |
| Back | Stack pop | Slide left → right, 200ms ease-in | Volver |
| Cualquier nivel → Home | Pop to root | Stack unwind | Tab activo / raíz |

### **Reglas de pantalla**

Toda pantalla usa 4 capas:

1. **Atención**  
   * Qué necesita saber el usuario ya.  
   * Briefing, alerta, reconocimiento.  
   * Máximo 2 elementos.  
   * Lectura menor a 3 segundos.  
   * Siempre visible sin scroll.  
2. **Acción**  
   * Qué puede hacer ahora.  
   * Acción principal \+ acciones rápidas.  
   * Máximo 3 acciones visibles.  
   * Acción principal en zona de pulgar si es frecuente.  
3. **Contexto**  
   * Listas, métricas, estado.  
   * Scroll vertical si excede pantalla.  
   * Agrupado por relevancia, no cronología rígida.  
4. **Exploración**  
   * Bottom Nav, enlaces cruzados, navegación secundaria.  
   * Nunca compite con Atención o Acción.

### **Zonas de pantalla**

* Zona superior: 20% superior. Título, back, lectura, indicadores. Nunca acción principal.  
* Zona media: 50% central. Listas, cards, contenido, chips, métricas.  
* Zona de pulgar: 30% inferior. Acción principal, FAB, confirmaciones rápidas, Bottom Nav.  
* Si una acción se usa más de 5 veces al día, va en zona de pulgar.  
* Si una acción se usa 1–2 veces al día, puede ir en zona media.  
* Si una acción se usa menos de 1 vez por semana, puede ir en zona superior o navegación secundaria.  
* Botón `+` flotante: esquina inferior derecha.

### **Scroll**

* Home — Briefing: sin scroll.  
* Home — widgets: scroll vertical.  
* Listas: scroll vertical infinito con paginación.  
* Formularios: scroll vertical, con acciones fijas abajo.  
* Modal centrado: sin scroll; si no cabe, usar bottom sheet.  
* Bottom sheet: scroll interno si excede 50% de altura.  
* Detalle de item: scroll vertical, acciones frecuentes fijas abajo.  
* Onboarding: sin scroll; cada paso cabe en una pantalla.  
* Settings: scroll vertical con secciones colapsables.  
* Nunca scroll horizontal para lectura.  
* Scroll horizontal solo para chips o galerías.

## **5\. Pantallas detectadas**

| Pantalla / Dominio | Objetivo | Qué muestra | Acciones | Navegación | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo del hogar | Briefing, Atención Requerida, tareas propias, Carga Familiar, Próximos Eventos, Presence Resumido, Actividad Familiar | Completar tareas propias 1-tap, navegar a módulo | Nivel 0 / Bottom Nav | REAL MVP \+ MOCK |
| Tasks | Gestionar tareas del hogar | Chip activo, contador, checkbox, lista agrupada por Responsabilidad | Completar, abrir detalle, crear, refrescar | Planner → Tasks | REAL MVP |
| Calendar | Ver eventos | Próximo evento card expandida, timeline día/semana | Ver detalle, confirmar asistencia, crear evento | Planner → Calendar | REAL MVP parcial |
| Feed | Actividad social del hogar | Actividad destacada, lista cronológica de posts | Reaccionar / comentar | People → Feed | DEMO PREMIUM |
| Presence | Ver estado de personas | Quién está en casa, miembros con estado/lugares | Ver ubicación/check-in | People → Presence | DEMO PREMIUM / MOCK |
| Personas / People | Personas del hogar | Miembros, avatares, roles | Tap avatar → perfil | People | REAL parcial / DEMO |
| Finance | Herramientas financieras | Alerta de presupuesto, gastos del mes, cuentas | Registrar gasto con `+` | More → Finance | DEMO PREMIUM |
| Inventory | Stock y medicamentos | Stock bajo, medicamento por vencer, consumibles/productos/medicamentos | Marcar reposición | More → Inventory | DEMO PREMIUM |
| HomeCloud / FamilyCloud | Recuerdos y documentos | Último álbum/recuerdo, álbumes, documentos recientes | Ver / crear recuerdo | More → HomeCloud | DEMO PREMIUM |
| More | Herramientas especializadas | Cards de Finance, Inventory, FamilyCloud, Settings | Abrir módulo | Bottom Nav → More | DEMO PREMIUM |
| Settings | Configuración | Hogar, Cuenta, Sistema, Auditoría | Ver secciones, editar config si existe | More → Settings | DEMO PREMIUM / REAL parcial |
| Quick Actions | Acciones rápidas | Panel flotante, Geni fijo, acciones dinámicas | Crear tarea, evento, gasto, etc. | Botón `+` central | DEMO PREMIUM / REAL parcial |
| SOS Panel | Emergencia | Panel de emergencia | Activar/cancelar alerta según nivel | Swipe ↑ global | DEMO / POST\_MVP según alcance |
| Profile / Person Profile | Perfil de persona | Nombre, rol, avatar | Ver perfil desde avatar | Tap avatar | REAL parcial / DEMO |
| Detail item | Ver entidad completa | Detalle, relaciones, histórico | Acciones frecuentes abajo | Stack push | REAL / DEMO según entidad |
| Crear/Editar item | Crear o editar entidad | Formulario contextual | Guardar, cancelar | Bottom sheet | REAL / DEMO según entidad |
| Confirmación | Confirmar acción importante | Mensaje breve | Confirmar/cancelar | Modal centrado | REAL patrón global |
| Onboarding | Primer valor sin tutorial | Pasos sin scroll | Continuar, crear/configurar | Post-login | REAL MVP, si existe en otro doc |
| MultiHomeSelector | Cambiar hogar activo | Selector global en header si 2+ hogares | Cambiar contexto | Header global | POST\_MVP / REAL si aplica |

## **6\. Componentes y patrones UI reutilizables**

### **Componentes globales**

* Bottom Nav.  
* Quick Actions panel.  
* FAB de dominio.  
* Cards.  
* Widgets.  
* Chips de filtro.  
* Badges de estado.  
* Avatares.  
* Iniciales.  
* Role pills.  
* Status pills.  
* List item.  
* Section header.  
* Metric card.  
* Attention card.  
* Briefing card.  
* Activity item.  
* Timeline.  
* Bottom sheet.  
* Modal centrado.  
* Toast.  
* Skeleton.  
* Spinner.  
* Sticky footer.  
* Header con título/back.  
* Selector global de hogar.  
* Toggle de configuración avanzada.  
* Scroll vertical.  
* Chips horizontales.  
* Empty state como guía.

### **Patrones de interacción**

* Tap en list item abre detalle.  
* Tap en avatar abre perfil.  
* Botón `+` flotante crea nuevo item del dominio actual.  
* Botón `+` central abre Quick Actions.  
* X cierra sin guardar, con confirmación si hay cambios.  
* Check guarda y cierra.  
* Pull down refresca listas, excepto Adulto Mayor.  
* Swipe ↑ abre SOS.  
* Bottom sheet para crear/editar.  
* Modal centrado solo para confirmaciones.  
* Back más rápido que avance.  
* Crear item agrega item con opacidad 0 → 1\.  
* Completar tarea rellena checkbox, aplica háptico y tachado.  
* Eliminar requiere confirmación.  
* Completar tiene deshacer 5s.  
* Toast superior, no inferior.

### **Clasificación**

#### **REAL MVP**

* Bottom Nav.  
* Home.  
* Planner tab.  
* Tasks list item \+ checkbox.  
* Calendar / events list.  
* Bottom sheet.  
* Modal confirmación.  
* Toast superior.  
* Loading/refreshing/error/success.  
* Avatar/member basic.  
* Chips/filtros básicos.  
* Pull-to-refresh excepto senior.  
* Quick Actions visual.

#### **DEMO PREMIUM**

* More cards.  
* Finance card/list.  
* Inventory card/list.  
* FamilyCloud card/list.  
* Presence card.  
* Feed list.  
* Geni slot.  
* Activity fake.  
* Carga Familiar.  
* Recognition card.  
* Budget alert.  
* Stock alert.  
* Last album/recuerdo card.

#### **POST\_MVP**

* Advanced search.  
* Real Geni.  
* Real automations.  
* Offline sync queue.  
* Full audit UI.  
* OCR.  
* Storage real.  
* GPS/geofencing.  
* Complex settings.  
* Facial recognition.

## **7\. Visual design aplicable**

### **Estilo visual explícito**

* Mobile-first absoluto.  
* Pantallas diseñadas y probadas primero en 375×812px.  
* Paleta tierra-cálida.  
* No usar paleta estándar de productividad.  
* El hogar no es una oficina.  
* Debe transmitir calma, arraigo y calidez.  
* Bottom Nav segura, sin rojo/error.  
* El rojo en navegación genera ansiedad.  
* Toast en zona superior para no competir con Bottom Nav ni botones de acción.  
* La densidad se adapta por rol reduciendo elementos, no achicando fuentes.  
* Nunca bajar de 14px para body.  
* Acciones frecuentes en zona de pulgar.  
* La acción principal no va en header.  
* Confirmaciones deben leerse en menos de 2 segundos.  
* No sonidos propios; solo notificaciones del sistema operativo.  
* Feedback háptico sutil, nunca heavy/warning fuera de SOS.  
* Accesibilidad integrada en componente base.  
* `accessibilityLabel`, `accessibilityRole` y contraste se implementan en componentes base.

### **Estado visual por rol**

| Elemento | Coordinador | Adulto | Adolescente | Niño | Adulto Mayor |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Items visibles sin scroll | 5–6 | 4–5 | 3–4 | 2–3 | 2–3 |
| Cards en Home | 3 | 2 | 2 | 1 | 1 |
| Chips de filtro | 4–5 | 3 | 2 | 1 | 1 |
| Métricas visibles | Carga hogar, tendencias, presupuesto | Mis tareas, eventos próximos | Mis tareas | Mi lista | Sin métricas |
| Badges | Todos | Propios \+ urgentes hogar | Solo propios | Propios positivos | Solo alertas |

### **Adulto Mayor**

* Adaptación de contenido en Home, no reducción de tabs.  
* Prioriza personas, eventos, recordatorios, medicación.  
* Solo tap.  
* Sin swipe.  
* Sin long press.  
* Sin pull-to-refresh.  
* Requiere alternativas explícitas sin gestos.

## **8\. Home**

### **Rol**

* Home es Nivel 0\.  
* Home siempre es pantalla inicial.  
* Home no puede ser cambiado por el usuario.  
* Home responde:  
  * qué está pasando en mi hogar ahora;  
  * qué tengo que hacer yo.  
* Home resume, no administra.  
* Toda información de Home conduce al módulo correspondiente.  
* Home híbrido: briefing \+ acciones personales en una misma pantalla.  
* El usuario abre la app para actuar, no solo mirar.  
* Home no debe convertirse en dashboard caótico.

### **Estructura detectada**

* Briefing diario.  
* Atención Requerida.  
* Tareas pendientes propias.  
* Carga Familiar.  
* Próximos Eventos.  
* Presence Resumido.  
* Actividad Familiar.  
* Finanzas Relevantes.  
* Reconocimiento.  
* Pendientes propios.  
* Alertas.  
* Widgets.

### **Capas de Home**

| Capa | Contenido Home | Clasificación |
| ----- | ----- | ----- |
| Atención | Briefing diario \+ Atención Requerida | Briefing MOCK/DEMO, Atención REAL/MOCK según fuente |
| Acción | Tareas pendientes propias 1-tap | REAL MVP si Tasks real |
| Contexto | Carga Familiar, Próximos Eventos, Presence Resumido, Actividad Familiar | Mixto |
| Exploración | Bottom Nav | REAL MVP |

### **Home por rol**

* Coordinador:  
  * Jerarquía: Carga del hogar, alertas, reconocimiento.  
  * 3–4 cards.  
  * Métricas de carga, tendencias, presupuesto.  
  * Badges todos.  
  * Carga desbalanceada visible solo para Coordinador.  
* Adulto:  
  * Jerarquía: mis pendientes, eventos, reconocimiento.  
  * 2–3 cards.  
  * Métricas de mis tareas, eventos próximos.  
* Adolescente:  
  * Jerarquía: mis tareas, reconocimiento.  
  * 2 cards.  
* Niño:  
  * Jerarquía: mi lista del día.  
  * 1 card.  
  * Gamificación sin rankings ni comparación.  
* Adulto Mayor:  
  * Jerarquía: lo urgente hoy: medicación, eventos, personas, recordatorios.  
  * 1 card.  
  * Sin métricas.

### **Home REAL MVP**

* Tareas pendientes propias.  
* Próximos eventos.  
* Miembros/personas si existe dato real.  
* Atención requerida si se alimenta de tareas vencidas, aprobaciones pendientes o eventos.  
* Navegación hacia Planner/People/More.

### **Home MOCK**

* Briefing con texto fijo o datos simples.  
* Carga Familiar.  
* Presence resumido.  
* Actividad Familiar.  
* Finanzas Relevantes.  
* Reconocimiento si no existe interacción real.  
* Budget al 92% si se usa como referencia demo.  
* “Tenés 2 tareas para hoy” como ejemplo de briefing/widget.

### **Home DEMO PREMIUM**

* Card de Carga Familiar.  
* Card de Presence.  
* Card de Actividad Familiar.  
* Card de Finanzas Relevantes.  
* Atención Requerida con pagos/vencimientos mock.  
* Briefing visual premium.  
* Recognition card.  
* Enlaces a módulos demo.

### **Home POST\_MVP**

* PriorityEngine real.  
* Reordenamiento contextual por Geni.  
* Geni real generando briefing.  
* Automatizaciones reales.  
* Notificaciones reales.  
* Offline real.  
* Multi-hogar avanzado.

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

* Planner vive en Bottom Nav.  
* Planner agrupa Tasks, Calendar y Goals.  
* Planner es núcleo operativo.  
* Planner administra Tasks, Calendar y Goals.  
* Responsabilidades no son dominio independiente.  
* Responsabilidades son propiedad de la tarea y eje organizador en Tasks.  
* Planner debe usar navegación contextual con otras entidades.

### **Tasks**

#### **Información encontrada**

* Acción principal: completar tarea asignada.  
* Cómo se ejecuta: checkbox táctil en el list item, sin abrir detalle.  
* Feedback: checkbox relleno, háptico, tachado.  
* Resolución: toast opcional no bloqueante.  
* Completar tarea es reversible 5s con “Deshacer”.  
* Eliminar tarea requiere confirmación con bottom sheet: “¿Eliminar esta tarea?”  
* Tap en list item abre detalle.  
* Botón `+` flotante crea nuevo item del dominio actual.  
* Lista de tareas del día con checkboxes.  
* Tareas agrupadas por Responsabilidad.  
* Chip de filtro activo.  
* Contador de pendientes.  
* Enlace a eventos/goals relacionados.  
* En Home: “Tenés 2 tareas para hoy”.  
* En Home: widget de tareas agrupadas por Responsabilidad.  
* En detalle de tarea:  
  * descripción;  
  * responsable;  
  * fecha;  
  * dependencias;  
  * comentarios;  
  * timeline;  
  * adjuntos.  
* En configuración avanzada:  
  * recurrencia;  
  * verificación requerida;  
  * plantillas.

#### **Entidad Task**

Campos mencionados:

* título;  
* descripción;  
* responsable;  
* fechas;  
* prioridad;  
* estado;  
* responsabilidad asociada;  
* goal asociada;  
* archivos;  
* comentarios.

Estados encontrados:

* Pendiente.  
* En progreso.  
* Completada.  
* Cancelada.

#### **Responsibility**

* Agrupación de áreas operativas del hogar.  
* Áreas detectadas:  
  * Compras;  
  * Mascotas;  
  * Limpieza;  
  * Vehículos.  
* Una tarea tiene una única responsabilidad principal.  
* Responsibility posee miembros asignados.  
* Responsibility funciona como eje visual de agrupación.

#### **REAL MVP**

* Lista de tareas.  
* Completar tarea.  
* Checkbox en list item.  
* Crear tarea desde FAB/Quick Actions si existe implementación.  
* Tareas propias en Home.  
* Agrupación por Responsabilidad.  
* Responsable/persona si existe Members real.  
* Fecha si existe.  
* Prioridad si se implementa por otros documentos.  
* Pull-to-refresh excepto senior.  
* Estado completado visual.

#### **DEMO PREMIUM**

* Cards de agrupación por responsabilidad.  
* Conteo de pendientes.  
* Chips por filtros.  
* Enlaces visuales a Goals deshabilitados o futuros.  
* Timeline visual simplificado.  
* Reconocimiento por tarea completada si no hay Feed real.

#### **POST\_MVP**

* Dependencias entre tareas.  
* Subtasks.  
* Comentarios.  
* Adjuntos.  
* Timeline completo.  
* Recurrencia avanzada.  
* Templates personalizadas.  
* CRUD de templates.  
* Verificación avanzada si requiere flujo no definido.  
* Goal asociado real.  
* Archivos reales.

### **Calendar / Events**

#### **Información encontrada**

* Calendar vive dentro de Planner.  
* Calendar administra eventos.  
* Acción principal: ver evento del día.  
* Cómo se ejecuta: primer item de la lista, expandido por defecto.  
* Calendar muestra próximo evento como card expandida.  
* Calendar tiene acción de ver detalle / confirmar asistencia.  
* Calendar muestra timeline del día/semana.  
* Calendar enlaza a Tasks vinculadas.  
* Tap en Event list item abre detalle.  
* Crear evento inserta item con opacidad 0 → 1\.  
* Eliminar evento recurrente requiere confirmación doble: “¿Este evento o toda la serie?” → confirmar.  
* Event representa eventos familiares o personales.  
* Event tiene múltiples participantes.  
* Event estados:  
  * Programado;  
  * Completado;  
  * Cancelado.  
* Event puede vincularse con documentos/HomeCloud.  
* Event puede generar Memory en FamilyCloud.  
* Event puede relacionarse con Tasks.

#### **REAL MVP**

* Lista de eventos.  
* Próximo evento.  
* Evento del día expandido.  
* Detalle de evento.  
* Crear evento si existe implementación.  
* Próximos eventos en Home.  
* Timeline día/semana si se implementa simple.

#### **DEMO PREMIUM**

* Confirmar asistencia visual sin backend complejo.  
* Card expandida de próximo evento.  
* Tareas vinculadas mostradas como preview.  
* Enlace a documentos como futuro/demo.

#### **POST\_MVP**

* Participantes avanzados.  
* Estados de asistencia.  
* Event → Memory automático.  
* Event → documentos reales.  
* Recurrencia compleja.  
* Confirmación doble de eventos recurrentes si no hay recurrencia implementada.  
* Calendar con integración FamilyCloud real.

### **Goals**

* Goals vive dentro de Planner.  
* Goal representa objetivos personales o familiares.  
* Estructura: Goal → Hitos → Tasks.  
* Estados:  
  * Activa;  
  * Completada;  
  * Fallida.  
* Task puede contribuir a Goal.  
* Milestone pertenece a Goal.  
* Goals no es dominio independiente.  
* Goals debe quedar como DEMO PREMIUM o POST\_MVP salvo definición MVP en otro documento.

## **10\. People / Members / Roles**

### **People**

* People vive en Bottom Nav.  
* People agrupa Feed, Presence y Personas.  
* Feed no es tab independiente.  
* Presence vive dentro de People.  
* Personas/Members son necesarios para:  
  * asignar tareas;  
  * participantes de eventos;  
  * avatares;  
  * roles;  
  * permisos visibles;  
  * perfil.

### **Entidades**

* Person:  
  * pertenece a una Account;  
  * puede participar en uno o más hogares;  
  * contiene nombre, apellido, foto, fecha de nacimiento, género, contacto.  
* Membership:  
  * relación entre Person y Household;  
  * estados: Pendiente, Activa, Suspendida, Finalizada;  
  * posee un único rol activo.  
* Role:  
  * roles oficiales:  
    * Coordinador;  
    * Adulto;  
    * Adolescente;  
    * Niño;  
    * Adulto Mayor;  
    * Invitado;  
    * Empleado Familiar.  
* FamilyRelationship:  
  * Madre;  
  * Padre;  
  * Hijo;  
  * Hija;  
  * Abuelo;  
  * Abuela;  
  * Hermano;  
  * Hermana;  
  * Tutor.  
  * No modifica permisos.

### **Adaptación por rol**

| Rol | UX |
| ----- | ----- |
| Coordinador | Más métricas, carga del hogar, alertas, reconocimiento |
| Adulto | Mis pendientes, eventos, reconocimiento |
| Adolescente | Mis tareas, reconocimiento |
| Niño | Mi lista del día, gamificación sin comparación |
| Adulto Mayor | Urgente hoy: medicación, eventos, personas, recordatorios |
| Invitado | No se detalla UX específica |
| Empleado Familiar | Rol oficial, colaborador operativo, horario laboral, responsabilidades asignadas, acceso limitado a Geni |

### **REAL MVP**

* Lista básica de miembros/personas si existe implementación.  
* Avatares o iniciales.  
* Nombre.  
* Rol.  
* Estado membership.  
* Pending/active si aplica invitaciones.  
* Personas como responsables de tareas.  
* Personas como participantes de eventos.  
* Tap avatar → perfil.

### **DEMO PREMIUM**

* Presence visual.  
* Feed visual.  
* Reconocimiento.  
* Miembros con estado/lugar.  
* Check-in mock.  
* Role pills/status pills.

### **POST\_MVP**

* Presence GPS real.  
* Geofencing.  
* Historial de ubicación.  
* Check-in real.  
* Feed real con comentarios/reacciones.  
* Empleado Familiar avanzado.  
* SalaryRecord.  
* Schedule.  
* Permisos granulares completos.

## **11\. Household / Invitations / Onboarding**

### **Household**

* Household es unidad organizativa principal.  
* Todo ocurre dentro de un hogar.  
* Cada hogar funciona como entidad independiente.  
* No comparten configuración automáticamente.  
* Household contiene:  
  * Membership;  
  * Planner;  
  * Finance;  
  * Presence;  
  * Inventory;  
  * Assets;  
  * FamilyCloud;  
  * Feed;  
  * Automations;  
  * SOS.  
* Household filtra contexto de la app.  
* Multi-hogar tiene selector global en header si el usuario pertenece a 2+ hogares.  
* Multi-hogar no vive en More.  
* Avatar de perfil personal es independiente del selector de hogar.

### **Membership**

* Person tiene Membership.  
* Membership pertenece a Household.  
* Membership tiene Role.  
* Estados:  
  * Pendiente;  
  * Activa;  
  * Suspendida;  
  * Finalizada.  
* Expulsar miembro:  
  * solo Coordinador;  
  * doble confirmación \+ motivo.

### **Invitations**

* Invitation es workflow:  
  * Invitación;  
  * Aceptación;  
  * Aprobación si corresponde;  
  * Ingreso.  
* No hay detalles de UI de link/código/token en este documento.  
* Aprobaciones pendientes pueden aparecer en Attention Required.

### **Onboarding**

* Onboarding sin tutorial.  
* Empty states como guía.  
* 60 segundos hasta primer valor, no setup completo.  
* Onboarding no debe tener scroll.  
* Cada paso de onboarding cabe en una pantalla.  
* La app se aprende usándose.

### **REAL MVP**

* Crear/seleccionar hogar si está implementado por otros documentos.  
* Estado no household / pending approval si aparece en app.  
* Invitation pending approval como Atención Requerida.  
* Members pending/active.  
* Rol visible.  
* Navegación post-login por estado de hogar si se define en otro documento.

### **DEMO PREMIUM**

* Empty states guiados.  
* Pantalla de onboarding visual simple.  
* Cards de invitación/members.  
* Pendientes de aprobación en Home.

### **Información faltante**

* No define formularios de crear hogar.  
* No define campos de invitación.  
* No define link/código/token.  
* No define errores visibles.  
* No define pantallas de aprobación/rechazo.  
* No define copy de onboarding.

## **12\. More / Settings / Profile**

### **More**

* More no es un descarte.  
* More es sección de herramientas especializadas.  
* More contiene:  
  * Finance;  
  * Inventory;  
  * HomeCloud / FamilyCloud;  
  * Settings.  
* Cada módulo se muestra como card con nombre y línea de contexto secundaria.  
* Línea secundaria es indicador de estado, no contenido consumible.  
* More no contiene dashboards.  
* More solo contiene accesos a dominios \+ indicadores rápidos opcionales.  
* Finance, Inventory, FamilyCloud y Settings viven en More, no en Bottom Nav.

### **Settings**

* Settings vive exclusivamente en More.  
* Acceso rápido mediante Search.  
* Estructura encontrada:  
  * Hogar:  
    * Miembros;  
    * Roles;  
    * Responsabilidades;  
    * Permisos;  
    * Integraciones.  
  * Cuenta:  
    * Perfil;  
    * Seguridad;  
    * Privacidad.  
  * Sistema:  
    * Notificaciones;  
    * Offline;  
    * Multi-Hogar.  
  * Auditoría.

### **Profile**

* Tap en avatar abre perfil de la persona o propio.  
* Avatar de miembro tiene label accesible: `[Nombre], [rol]`.  
* Perfil personal es independiente del selector de hogar.

### **Clasificación**

#### **REAL MVP**

* More tab visual.  
* Settings básico si existe.  
* Profile básico si existe.  
* Miembros/Roles dentro de Settings si aplica MVP.

#### **DEMO PREMIUM**

* Finance card.  
* Inventory card.  
* FamilyCloud card.  
* Settings completo visual.  
* Indicadores de estado mock.

#### **POST\_MVP**

* Auditoría completa.  
* Offline real.  
* Multi-hogar avanzado.  
* Integraciones reales.  
* Permisos finos.  
* Seguridad avanzada.  
* Search ejecutando settings.

## **13\. Quick Actions**

### **Estructura**

* Botón `+` central en Bottom Nav abre Quick Actions.  
* Quick Actions es panel flotante con blur.  
* Geni es el único slot fijo.  
* Acciones dinámicas ordenadas por uso/contexto.  
* Acceso rápido a creación sin cambiar de contexto.  
* Quick Actions aprende por frecuencia, recencia y contexto para reordenar acciones.  
* Quick Actions no es navegación principal.  
* No debe incluir SOS.  
* Geni es punto de entrada principal desde Quick Actions.

### **Acciones detectadas**

| Acción | Módulo | Clasificación |
| ----- | ----- | ----- |
| Crear tarea | Planner / Tasks | REAL MVP si backend existe |
| Crear evento | Planner / Calendar | REAL MVP si backend existe |
| Registrar gasto | Finance | DEMO PREMIUM |
| Crear item / reposición | Inventory | DEMO PREMIUM |
| Crear recuerdo | FamilyCloud | DEMO PREMIUM |
| Preguntar a Geni | Geni | DEMO PREMIUM / POST\_MVP |
| Abrir Quick Actions | Navigation | REAL visual |
| SOS | SOS | No va en Quick Actions |

### **UX**

* Panel flotante \+ blur.  
* Fade in \+ slide up.  
* Duración: 200ms ease-out.  
* `accessibilityLabel`: “Acciones rápidas”.  
* `accessibilityHint`: “Abre el panel de acciones rápidas”.

## **14\. Módulos demo premium**

### **Finance**

* Vive en More.  
* Acción principal: registrar gasto rápido.  
* Botón `+` flotante en zona de pulgar.  
* Capa 1: alerta de presupuesto si aplica.  
* Capa 2: botón `+` para registrar gasto.  
* Capa 3: lista de gastos del mes, cuentas.  
* Puede mostrar “Presupuesto al 92%” en Home → Atención Requerida.  
* Entidades detectadas:  
  * Account\_Finance;  
  * Expense;  
  * Income;  
  * Budget;  
  * Fund;  
  * Debt.  
* Expense:  
  * monto;  
  * fecha;  
  * cuenta;  
  * categoría;  
  * responsable.  
* Expense no se elimina, se anula.  
* DEMO PREMIUM: dashboard/lista/cards/gasto rápido.  
* POST\_MVP: finanzas reales completas, auditoría, saldos reales, fondos, deudas reales.

### **Inventory**

* Vive en More.  
* Acción principal: ver stock bajo / medicación pendiente.  
* Card superior con acción directa si hay alerta.  
* Capa 1: stock bajo / medicamento por vencer.  
* Capa 2: marcar reposición.  
* Capa 3: lista de consumibles, productos, medicamentos.  
* Home puede mostrar “Leche y pan por debajo del mínimo”.  
* Inventory administra consumibles y stock.  
* Inventory no administra activos importantes.  
* Medicamentos pertenecen a Inventory, no a Assets.  
* Entidades:  
  * InventoryItem;  
  * Medication.  
* InventoryItem:  
  * nombre;  
  * categoría;  
  * cantidad;  
  * unidad;  
  * stock mínimo;  
  * estados Activo/Archivado.  
* Medication:  
  * vencimiento;  
  * observaciones.  
* Relación futura: Inventory Item → Task de reposición.  
* DEMO PREMIUM: stock bajo, medicamentos, marcar reposición.  
* POST\_MVP: automatizaciones de reposición reales, backend completo, alertas reales.

### **Assets**

* Vive en More según archivo de comprensión.  
* Administra activos importantes del hogar.  
* Categorías:  
  * Vehículos;  
  * Mascotas;  
  * Dispositivos;  
  * Propiedades.  
* Asset estados:  
  * Activo;  
  * Inactivo;  
  * Archivado.  
* Vehicle:  
  * marca;  
  * modelo;  
  * año;  
  * patente;  
  * seguro;  
  * cédula;  
  * título;  
  * VTV.  
* Pet:  
  * nombre;  
  * especie;  
  * raza;  
  * fecha nacimiento;  
  * veterinario;  
  * vacunas;  
  * tratamientos;  
  * estados Activa/Fallecida/Archivada.  
* Device:  
  * notebook;  
  * PC;  
  * tablet;  
  * celular;  
  * consola.  
* Property:  
  * casa;  
  * departamento;  
  * terreno.  
* MaintenanceRecord puede integrarse con Planner para generar tareas automáticamente.  
* DEMO PREMIUM: cards de activos/mantenimientos/vencimientos.  
* POST\_MVP: Assets real, documentos reales, mantenimiento periódico, integración real con Tasks.

### **FamilyCloud / HomeCloud**

* Vive en More.  
* Acción principal: ver último álbum o recuerdo.  
* Card de acceso rápido si hay contenido reciente.  
* Capa 1: último álbum/recuerdo destacado.  
* Capa 2: ver / crear recuerdo.  
* Capa 3: álbumes, documentos recientes.  
* Organización por álbumes, recuerdos y eventos, no carpetas técnicas.  
* Entidades:  
  * Memory;  
  * Album;  
  * Document;  
  * DocumentVersion;  
  * Trash.  
* Ejemplos:  
  * Vacaciones;  
  * Cumpleaños;  
  * Navidad.  
* Document tipos:  
  * PDF;  
  * imagen;  
  * documento escaneado.  
* Document puede vincularse a:  
  * Personas;  
  * Assets;  
  * Gastos;  
  * Eventos;  
  * Goals;  
  * Responsabilidades.  
* Trash retiene 30 días.  
* DEMO PREMIUM: álbumes, recuerdos, documentos recientes.  
* POST\_MVP: storage real, OCR, versionado real, facial recognition, Annual Recap, Family Timeline.

### **Presence**

* Vive dentro de People.  
* Acción principal: ver quién está en casa.  
* Card de estado sin scroll si ≤4 personas.  
* Capa 1: quién está en casa ahora.  
* Capa 2: ver ubicación/check-in.  
* Capa 3: lista de miembros con estado/lugares.  
* GPS renombrado a Presence.  
* Presence coordina disponibilidad, ubicación y movimientos.  
* Estados automáticos o manuales.  
* Estados manuales:  
  * No molestar;  
  * Descansando;  
  * Estudiando;  
  * Trabajando.  
* Estados manuales tienen prioridad sobre automáticos.  
* Places:  
  * Casa;  
  * Escuela;  
  * Trabajo;  
  * Club;  
  * Hospital;  
  * Gimnasio.  
* CheckIn complementa GPS, no lo reemplaza.  
* DEMO PREMIUM: estados/lugares/check-in visual.  
* MOCK: quién está en casa.  
* POST\_MVP: GPS real, geofencing, historial 30 días, mapas.

### **Geni**

* Capa de inteligencia transversal.  
* No es módulo aislado.  
* No tiene tab propio.  
* Acceso principal vía Quick Actions.  
* Opera sobre todos los dominios respetando permisos.  
* Capacidades:  
  * consultar;  
  * analizar;  
  * recomendar;  
  * coordinar;  
  * automatizar.  
* Geni genera Briefing.  
* Geni usa GeniMemory.  
* Geni powers GeniSearch.  
* Geni puede crear Automation.  
* Geni no puede marcar tareas completadas automáticamente.  
* Geni no crea automatizaciones permanentes sin aprobación.  
* DEMO PREMIUM: slot fijo, sugerencias, briefing fake.  
* POST\_MVP: IA real, memoria real, search real, automatización real.

### **Feed**

* Vive en People.  
* No es tab independiente.  
* Acción principal: ver actividad reciente.  
* Lista cronológica.  
* Primer post expandido.  
* Capa 1: actividad destacada del día.  
* Capa 2: reaccionar/comentar.  
* Capa 3: lista cronológica de posts.  
* Todo es un Post.  
* No existen tipos especiales de publicación.  
* Post puede contener:  
  * texto;  
  * imagen;  
  * video;  
  * archivos;  
  * enlaces internos.  
* DEMO PREMIUM: actividad familiar, posts fake, reacciones visuales.  
* POST\_MVP: feed real, comentarios/reacciones reales.

### **SOS**

* Acceso vía swipe ↑ global.  
* No está en Bottom Nav.  
* No está en Quick Actions.  
* Panel siempre se abre.  
* Nunca dispara alerta directa sin interacción, salvo regla especial de adultos en emergencia grave según documento.  
* Tres niveles:  
  * 🔴 Emergencia grave;  
  * 🟠 Necesito ayuda;  
  * 🟡 Coordinación urgente.  
* No existe cuarto nivel.  
* Violencia y peligro extremo entran en 🔴.  
* Niños y empleados familiares no pueden emitir Emergencia grave 🔴.  
* SOS tiene prioridad máxima en Home.  
* Siempre desplaza cualquier otro contenido.  
* DEMO PREMIUM: panel visual de emergencia.  
* POST\_MVP: emergencia real, notificaciones reales, ubicación real, auditoría permanente.

### **Automations**

* Ejecuta acciones automáticamente ante eventos.  
* Estructura:  
  * nombre;  
  * descripción;  
  * trigger;  
  * condiciones;  
  * acciones;  
  * estado;  
  * auditoría.  
* Estados:  
  * Activa;  
  * Pausada;  
  * Archivada.  
* Acciones:  
  * crear tarea;  
  * crear recordatorio;  
  * enviar notificación;  
  * crear evento;  
  * actualizar meta;  
  * publicar en Feed;  
  * solicitar aprobación.  
* Biblioteca:  
  * Llegó a casa;  
  * Stock bajo;  
  * Pago próximo;  
  * Mantenimiento pendiente;  
  * Cumpleaños próximo.  
* Automatizaciones operan a nivel hogar.  
* No existen automatizaciones compartidas entre hogares.  
* DEMO PREMIUM: cards de automatizaciones o sugerencias.  
* POST\_MVP: automatizaciones reales.

### **Notifications**

* Categorías por dominio.  
* Prioridades:  
  * Crítica;  
  * Alta;  
  * Media;  
  * Baja.  
* Canales:  
  * Push;  
  * Email;  
  * In-App.  
* Configurable por usuario.  
* Sin sonidos propios; solo notificaciones del SO.  
* DEMO PREMIUM: in-app fake.  
* POST\_MVP: push/email reales.

### **Search**

* Search Global es navegador interno.  
* GeniSearch busca en todos los dominios según permisos.  
* Indexa Settings.  
* Ejecuta acciones directamente.  
* DEMO PREMIUM: search visual.  
* POST\_MVP: search real cross-domain.

## **15\. Estados UX y feedback**

### **Feedback inmediato**

| Acción | Feedback inmediato | Resolución |
| ----- | ----- | ----- |
| Tap botón | Escala 0.97 → 1.0 \+ háptico ligero | — |
| Completar tarea | Checkbox relleno \+ háptico \+ tachado | Toast opcional |
| Crear tarea/evento | Item aparece con opacidad 0 → 1 | — |
| Guardar formulario | Botón con spinner, mantiene ancho | Toast success/error |
| Sincronización | Indicador sutil en status bar | Desaparece al completar |
| Error de red | Toast informativo inmediato | — |

### **Estados detectados**

* loading.  
* refreshing.  
* error.  
* success.  
* pending.  
* active.  
* suspended.  
* finalized.  
* completed.  
* cancelled.  
* expired no aparece explícitamente.  
* overdue aparece como vencido/pagos/tareas/vencimientos.  
* empty states como guía.  
* disabled no aparece explícitamente.  
* offline como soporte futuro.  
* sync.  
* conflict con Last Write Wins.  
* optimistic UI.  
* skeleton.  
* spinner \>300ms.  
* toast.  
* no household no aparece explícitamente.  
* no members no aparece explícitamente.  
* no tasks no aparece explícitamente.  
* no events no aparece explícitamente.

### **Reglas**

* Toda acción responde en \<100ms.  
* Operaciones \>300ms muestran spinner.  
* El diseño se optimiza para estado normal, no para edge cases.  
* Happy path primero, edge cases visibles pero no protagonistas.  
* Empty states y errores deben estar diseñados.  
* Ninguna acción queda sin respuesta visual o háptica.  
* Botones responden aunque la acción falle después.  
* Toast va en zona superior.  
* Toast inferior no, porque compite con Bottom Nav y acciones.  
* Sin sonidos propios.  
* Haptic sutil.

## **16\. Formularios y datos de entrada**

### **Formularios/patrones definidos**

* Crear/editar item:  
  * Bottom sheet.  
  * Slide up \+ fade.  
  * Guardar/cancelar fijos abajo.  
  * X en esquina superior para cerrar.  
  * Check en esquina superior para guardar.  
  * Cerrar con cambios requiere confirmación.  
* Guardar formulario:  
  * Botón spinner.  
  * Mantener ancho.  
  * Toast success/error.  
* Formularios con scroll:  
  * acciones sticky footer.  
* Modal centrado:  
  * solo confirmaciones.  
  * no formularios.  
* Confirmación:  
  * texto debe leerse en \<2 segundos.  
* Onboarding:  
  * sin scroll.  
  * cada paso en una pantalla.  
  * sin tutorial.

### **Formularios mencionados sin detalle**

| Formulario | Información encontrada | Faltante |
| ----- | ----- | ----- |
| Login | No se encontró información específica | campos, errores, botones |
| Register | No se encontró información específica | campos, errores, botones |
| Forgot password | No se encontró información específica | campos, errores |
| Create Household | No se encontró información específica | campos, validaciones |
| Invite member | No se encontró información específica | link/código/email, errores |
| Join household | No se encontró información específica | token/código, estados |
| Profile | Tap avatar abre perfil | campos editables |
| Create Task | Bottom sheet / dominio actual / Quick Actions | campos concretos |
| Edit Task | Bottom sheet | campos concretos |
| Create Event | Bottom sheet / Quick Actions | campos concretos |
| Edit Event | Bottom sheet | campos concretos |
| Settings | Secciones colapsables | campos concretos |
| Finance gasto | Registrar gasto rápido con `+` | campos concretos |
| Inventory reposición | Marcar reposición | campos concretos |
| FamilyCloud recuerdo | Ver / crear recuerdo | campos concretos |

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Módulo | Uso posible | Clasificación |
| ----- | ----- | ----- | ----- |
| “Tenés 2 tareas para hoy” | Home / Tasks | Briefing/widget mock | MOCK |
| “Presupuesto al 92%” | Home / Finance | Atención requerida / card demo | MOCK / DEMO PREMIUM |
| “Leche y pan por debajo del mínimo” | Home / Inventory | Stock bajo / alerta demo | MOCK / DEMO PREMIUM |
| “Preparar comida” | Task | Ejemplo tarea | MOCK |
| “Asado del sábado” | Event | Ejemplo evento | MOCK |
| “Lista de compras” | Document / Event | Ejemplo documento relacionado | MOCK |
| “Esta tarea es parte del Asado del sábado →” | Task/Event | Link contextual | DEMO PREMIUM |
| “Responsabilidad: Compras →” | Task/Responsibility | Link contextual | REAL/DEMO |
| “Contribuye a: Vacaciones 2027 →” | Task/Goal | Link futuro | POST\_MVP / DEMO |
| “2 tareas dependen de este evento →” | Event/Tasks | Link contextual | DEMO PREMIUM |
| Casa | Presence/Place | Lugar mock | MOCK |
| Escuela | Presence/Place | Lugar mock | MOCK |
| Trabajo | Presence/Place | Lugar mock | MOCK |
| Club | Presence/Place | Lugar mock | MOCK |
| Hospital | Presence/Place | Lugar mock | MOCK |
| Gimnasio | Presence/Place | Lugar mock | MOCK |
| Compras | Responsibility | Agrupador Tasks | REAL/DEMO |
| Mascotas | Responsibility | Agrupador Tasks | REAL/DEMO |
| Limpieza | Responsibility | Agrupador Tasks | REAL/DEMO |
| Vehículos | Responsibility | Agrupador Tasks | REAL/DEMO |
| Vacaciones | FamilyCloud/Goal | Album/Goal example | MOCK |
| Cumpleaños | FamilyCloud/Event | Album/Event example | MOCK |
| Navidad | FamilyCloud/Album | Album example | MOCK |
| Efectivo | Finance | Cuenta demo | DEMO |
| Mercado Pago | Finance | Cuenta demo | DEMO |
| Banco | Finance | Cuenta demo | DEMO |
| Tarjeta | Finance | Cuenta demo | DEMO |
| Sueldo | Finance/Income | Tipo ingreso | DEMO |
| Regalo | Finance/Income | Tipo ingreso | DEMO |
| Venta | Finance/Income | Tipo ingreso | DEMO |
| Reembolso | Finance/Income | Tipo ingreso | DEMO |
| Vehículo | Assets | Categoría activo | DEMO |
| Mascota | Assets | Categoría activo | DEMO |
| Dispositivo | Assets | Categoría activo | DEMO |
| Propiedad | Assets | Categoría activo | DEMO |
| Toyota Corolla | Assets | Ejemplo asset | MOCK |
| Seguro | Assets/Document | Documento vehículo | DEMO |
| VTV | Assets/Document | Vencimiento | DEMO |
| No molestar | PresenceState | Estado manual | DEMO |
| Descansando | PresenceState | Estado manual | DEMO |
| Estudiando | PresenceState | Estado manual | DEMO |
| Trabajando | PresenceState | Estado manual | DEMO |
| Llegó a casa | Automation | Template demo | POST\_MVP / DEMO |
| Stock bajo | Automation | Template demo | POST\_MVP / DEMO |
| Pago próximo | Automation | Template demo | POST\_MVP / DEMO |
| Mantenimiento pendiente | Automation | Template demo | POST\_MVP / DEMO |
| Cumpleaños próximo | Automation | Template demo | POST\_MVP / DEMO |

### **Datos demo faltantes**

* Nombres concretos de miembros.  
* Avatares concretos.  
* Tareas realistas completas por rol.  
* Eventos completos con fecha/hora.  
* Textos de empty states.  
* Copy exacto de errores.  
* Datos visuales de gráficos.  
* Métricas completas de carga familiar.  
* Actividad familiar concreta.  
* Contenido de briefing completo.

## **18\. Servicios frontend / APIs / datos**

### **Información encontrada**

No se encontró contrato API explícito en este documento.

### **Pistas de services/datos**

| Área | Datos/acciones detectadas | Estado |
| ----- | ----- | ----- |
| Auth | Account, Person, Membership | Sin endpoints |
| Household | Household como contexto | Sin endpoints |
| Members | Person, Membership, Role | Sin endpoints |
| Planner Tasks | listar, completar, crear, eliminar, refrescar, abrir detalle | Sin endpoints |
| Calendar Events | listar, crear, eliminar recurrente, ver detalle | Sin endpoints |
| Home | Briefing, AttentionRequired, widgets | Sin endpoints |
| QuickActions | acciones dinámicas por frecuencia/recencia/contexto | Sin endpoint |
| More | Cards \+ indicadores | Sin endpoints |
| Finance | gastos, cuentas, presupuesto | Sin endpoints |
| Inventory | stock, medicamentos, reposición | Sin endpoints |
| FamilyCloud | recuerdos, álbumes, documentos | Sin endpoints |
| Presence | estados, lugares, check-in | Sin endpoints |
| Notifications | categorías/canales/prioridades | Sin endpoints |
| OfflineSupport | sync queue, Last Write Wins | POST\_MVP |
| AuditLog | cambios importantes nunca se eliminan | POST\_MVP |

### **Reglas útiles para servicios frontend**

* Operaciones lentas:  
  * feedback inmediato \<100ms;  
  * spinner si \>300ms.  
* Crear tarea/evento:  
  * optimistic insert con opacidad 0 → 1\.  
* Completar tarea:  
  * optimistic UI.  
  * deshacer 5s.  
* Sincronización:  
  * indicador sutil en status bar.  
* Error de red:  
  * toast informativo inmediato.  
* Pull-to-refresh en listas, excepto Adulto Mayor.  
* Scroll infinito con indicador de carga final.  
* Offline Last Write Wins es POST\_MVP.

## **19\. Realtime / sincronización visible**

### **Información encontrada**

* Sincronización muestra indicador sutil en status bar.  
* Indicador desaparece al completar.  
* Error de red muestra toast inmediato.  
* OfflineSupport soporta ver/completar tareas, ver eventos, ver personas, ver activos, ver stock, archivos predescargados.  
* Sync queue con Last Write Wins.  
* Offline es futuro/POST\_MVP.  
* MultiHomeSelector cambia household activo y recarga Home con nuevo contexto.  
* QuickActions envía frecuencia \+ recencia \+ contexto a PriorityEngine para reordenar acciones.  
* Finance Payment overdue puede mostrarse en Home AttentionRequired.  
* Finance Fund completed puede mostrarse en Home.  
* Event finished con fotos detectadas puede crear Memory.  
* Inventory medication expiry approaching puede enviar Notification.  
* Assets document expiry puede enviar Notification.  
* FamilyCloud document shared puede enviar Notification.  
* Goal completed puede sugerir auto-post en Feed.

### **Pantallas afectadas**

| Evento / cambio | Pantalla afectada | Clasificación |
| ----- | ----- | ----- |
| Completar tarea | Tasks, Home | REAL MVP si Tasks real |
| Crear tarea/evento | Tasks/Calendar, Home | REAL MVP si backend existe |
| Sync | Status bar global | REAL UX / POST\_MVP si offline |
| Error de red | Pantalla actual | REAL UX |
| Active household switch | Home, todos los módulos | POST\_MVP / REAL si multi-hogar |
| Payment overdue | Home AttentionRequired | DEMO PREMIUM |
| Medication expiry | Inventory/Home/Notification | DEMO PREMIUM |
| Document expiry | Assets/Notification | DEMO PREMIUM |
| Event finished with photos | FamilyCloud | POST\_MVP |
| Goal completed | Feed/Home | POST\_MVP |
| Quick action usage | QuickActions | DEMO PREMIUM / POST\_MVP |

## **20\. Permisos visibles en UI**

### **Roles detectados**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

### **Permisos/visibilidad explícita**

| Rol | Puede / ve | No puede / restricción | Módulo | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Coordinador | Carga del hogar, tendencias, presupuesto, todos los badges | No administra vida privada | Home / Roles | REAL/DEMO |
| Coordinador | Expulsar miembro | Requiere doble confirmación \+ motivo | Household/Members | REAL si miembros |
| Adulto | Mis tareas, eventos próximos, propios \+ urgentes del hogar | No se especifican prohibiciones | Home | REAL/DEMO |
| Adolescente | Mis tareas, reconocimiento, badges propios | No se especifican permisos avanzados | Home/Tasks | REAL/DEMO |
| Niño | Mi lista del día, propios positivos | No puede emitir SOS 🔴 | Home/SOS | DEMO |
| Adulto Mayor | Lo urgente hoy, solo alertas, sin métricas | Sin swipe/long press/pull-to-refresh | Home/UX | REAL UX |
| Invitado | Rol oficial | No se define UI específica | Roles | Pendiente |
| Empleado Familiar | Responsabilidades asignadas, horario laboral, acceso limitado a Geni | No puede emitir SOS 🔴 | People/Role/SOS | POST\_MVP |

### **Densidad por rol**

* Coordinador: mayor densidad.  
* Adulto: densidad media.  
* Adolescente: menor densidad.  
* Niño: mínima y positiva.  
* Adulto Mayor: mínima, asistiva, sin gestos complejos.  
* La adaptación por rol cambia jerarquía, lenguaje visual, densidad cognitiva y nivel de agencia.

### **Información faltante de permisos**

* No define quién crea/edita/elimina tasks.  
* No define quién crea/edita/cancela events.  
* No define quién aprueba invitaciones, salvo expulsar miembro solo Coordinador.  
* No define permisos de Guest.  
* No define permisos completos de Adult/Adolescent/Child/Senior.  
* No define botones visibles/ocultos por rol para cada módulo.

## **21\. Integraciones visibles entre módulos**

| Origen | Destino | Relación visible | Clasificación |
| ----- | ----- | ----- | ----- |
| Home | Planner/Tasks | Muestra tareas pendientes propias y “Tenés 2 tareas para hoy” | REAL/MOCK |
| Home | Calendar/Events | Muestra próximos eventos | REAL/MOCK |
| Home | AttentionRequired | Tareas vencidas, pagos vencidos, aprobaciones, vencimientos | REAL/MOCK |
| Home | Presence | Presence Resumido | MOCK/DEMO |
| Home | Finance | Finanzas Relevantes / presupuesto | DEMO |
| Home | Activity/Feed | Actividad Familiar | MOCK/DEMO |
| Home | SOS | SOS desplaza todo | DEMO/POST\_MVP |
| QuickActions | Planner | Crear tarea / crear evento | REAL si backend |
| QuickActions | Geni | Slot fijo | DEMO/POST\_MVP |
| QuickActions | Finance | Registrar gasto | DEMO |
| QuickActions | Inventory | Agregar/marcar reposición | DEMO |
| Planner Task | Event | “Esta tarea es parte del evento” | REAL/DEMO |
| Event | Tasks | “2 tareas dependen de este evento” | REAL/DEMO |
| Task | Responsibility | Responsabilidad como enlace | REAL/DEMO |
| Task | Goal | “Contribuye a...” | POST\_MVP/DEMO |
| Inventory Item | Task | Tarea de reposición | POST\_MVP/DEMO |
| Asset | Task | Mantenimiento pendiente | POST\_MVP/DEMO |
| Expense | Document | Comprobante adjunto | POST\_MVP/DEMO |
| Event | Document | Documentos para evento | POST\_MVP/DEMO |
| Event | Memory | Memory creada desde evento | POST\_MVP |
| More | Finance/Inventory/FamilyCloud/Settings | Cards de acceso | DEMO |
| People | Feed/Presence/Personas | Sub-secciones | DEMO / REAL parcial |
| Household | Todos | Contexto de datos | REAL arquitectura |
| MultiHomeSelector | Home | Cambia hogar activo y recarga | POST\_MVP/REAL si multi-hogar |
| Geni | Briefing | Genera resumen diario | MOCK/POST\_MVP |
| Geni | Automations | Crea automatizaciones con aprobación | POST\_MVP |
| Search | Settings / Multiple | Busca y ejecuta acciones | POST\_MVP |

## **22\. Edge cases frontend**

| Caso | Comportamiento encontrado | Clasificación |
| ----- | ----- | ----- |
| Acción demora | Respuesta \<100ms, spinner si \>300ms | REAL UX |
| Error de red | Toast informativo inmediato | REAL UX |
| Completar tarea accidental | Deshacer 5s | REAL MVP |
| Eliminar tarea | Bottom sheet de confirmación | REAL MVP |
| Eliminar evento recurrente | Confirmación doble: evento o serie | POST\_MVP si no hay recurrencia |
| Cerrar formulario con cambios | Confirmación: “Tenés cambios sin guardar. ¿Salir?” | REAL UX |
| Eliminar documento | Modal centrado con nombre del documento | DEMO/POST\_MVP |
| Expulsar miembro | Solo Coordinador, doble confirmación \+ motivo | REAL si members |
| SOS adulto 🔴 | Sin confirmación, cancelable desde panel | DEMO/POST\_MVP |
| SOS 🟠🟡 | Panel de selección, nunca alerta directa | DEMO/POST\_MVP |
| Niños / empleados y SOS 🔴 | No pueden emitir emergencia grave | DEMO/POST\_MVP |
| Geni completa tarea | Prohibido: Geni no puede marcar tareas completadas automáticamente | POST\_MVP regla |
| Geni automatización permanente | Requiere aprobación | POST\_MVP regla |
| Adulto Mayor y gestos | Sin swipe/long press/pull-to-refresh | REAL UX |
| Listas largas | Scroll infinito con indicador final | REAL UX |
| Modal no cabe | Usar bottom sheet | REAL UX |
| Home Briefing no cabe | El copy está mal | REAL UX |
| Más de 4 niveles | Fallo de navegación | REAL UX |
| Tab activo tocado | Scroll to top \+ refresh | REAL UX |
| Badge nav error rojo | Prohibido | REAL UX |
| Swipe/list long press | No definido; requiere enmienda | Riesgo |
| Offline conflicto | Last Write Wins | POST\_MVP |
| Empty onboarding | Empty states guían | REAL UX |
| Email ya registrado | No se encontró información específica | Faltante |
| Credenciales inválidas | No se encontró información específica | Faltante |
| Token inválido/expirado | No se encontró información específica | Faltante |
| Invitación expirada/usada | No se encontró información específica | Faltante |
| Usuario sin hogar | No se encontró información específica | Faltante |
| Usuario pendiente | Membership Pendiente existe | REAL/pendiente UI |
| Permiso denegado | No se encontró comportamiento UI | Faltante |
| Último coordinador | No se encontró información específica | Faltante |
| Tarea ya completada | No se encontró comportamiento específico | Faltante |
| Evento cancelado | Estado Cancelado existe | REAL/pendiente UI |
| Responsabilidad sin miembros | No se encontró información específica | Faltante |

## **23\. Copywriting y labels**

### **Textos concretos encontrados**

* “Tenés 2 tareas para hoy”.  
* “Presupuesto al 92%”.  
* “Leche y pan por debajo del mínimo”.  
* “¿Eliminar esta tarea?”  
* “¿Este evento o toda la serie?”  
* “Tenés cambios sin guardar. ¿Salir?”  
* “Esta tarea es parte del Asado del sábado →”.  
* “Responsabilidad: Compras →”.  
* “Contribuye a: Vacaciones 2027 →”.  
* “2 tareas dependen de este evento →”.  
* “Documentos para este evento →”.  
* “Comprobante adjunto →”.  
* “Tarea de reposición →”.  
* “Preparar comida”.  
* “Asado del sábado”.  
* “Lista de compras”.  
* “Acciones rápidas”.  
* “Crear \[tarea/evento/gasto\]”.  
* “Completar \[nombre de tarea\]”.  
* “Marca la tarea como completada”.  
* “\[N\] tareas pendientes”.  
* “\[Nombre del tab\], \[N\] pendientes”.  
* “\[Nombre\], \[rol\]”.  
* “\[Filtro\], seleccionado”.  
* “Toca para filtrar por \[filtro\]”.  
* “Emergencia. Toca para pedir ayuda.”  
* “Activa alerta de emergencia a tu familia”.  
* “\[Nombre\] completó \[acción\]”.  
* “Toca para enviar reconocimiento”.

### **Tono**

* Coordinador: informativo \+ métricas.  
* Adulto: ejecutivo \+ accionable.  
* Adolescente: directo \+ sin sermón.  
* Niño: simple \+ concreto \+ visual.  
* Adulto Mayor: asistivo \+ sin prisa.  
* Adulto Mayor: Usted \+ nombre, respeta Don/Doña.  
* Adolescente/Niño: tuteo \+ nombre de pila.  
* El copy y UX se diseñan juntos.  
* Ninguna pantalla se considera completa sin microcopy.

## **24\. Restricciones técnicas frontend**

### **Detectadas**

* Mobile-first absoluto.  
* Pantallas diseñadas/probadas primero en 375×812px.  
* Desktop es derivado.  
* Todo componente acepta `mode: 'normal' | 'senior'` cuando lo necesita.  
* `ThemeProvider` inyecta globalmente el modo.  
* Tiempo de respuesta percibido \<100ms.  
* Operaciones \>300ms muestran spinner.  
* Usar optimistic UI \+ skeleton cuando corresponda.  
* Accesibilidad en componente base.  
* `accessibilityLabel`, `accessibilityRole` y contraste en componente base.  
* 4 niveles de profundidad máxima.  
* 95% de acciones en ≤3 niveles.  
* Medir telemetría de profundidad de navegación.  
* Bottom Nav congelada.  
* No inventar entidades transversales nuevas sin especificación.  
* Todo dominio usa entidades oficiales: Persona, Responsabilidad, Goal, Documento.  
* Pull-to-refresh no en Adulto Mayor.  
* Sin sonidos propios.  
* Toast superior.  
* Badge nav sin rojo.  
* Gesture swipe/long press en list items no definido.  
* Offline Last Write Wins es futuro.

### **No encontrado**

* Stack concreto de frontend.  
* Expo.  
* React Native.  
* Supabase.  
* Realtime técnico.  
* Storage técnico.  
* Edge Functions.  
* Librerías disponibles.  
* Librerías ausentes.  
* Performance budgets adicionales.  
* Tokens de diseño concretos.  
* Colores hex.  
* Tipografías específicas.  
* Radios/sombras/spacing numéricos.

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación futura |
| ----- | ----- | ----- |
| Documento dice “filosofía de interacción, no diseño visual” | Hay poco visual tokenizado | Usar para reglas UX, no para design tokens finales |
| Paleta tierra-cálida sin colores exactos | Puede generar UI inconsistente | Resolver en Design System |
| Bottom Nav congelada | Puede chocar con módulos adicionales | Mantener `[Home][People][+][Planner][More]` |
| More no dashboard | Módulos demo podrían querer dashboards | More debe ser solo cards de acceso; dashboards viven dentro del módulo |
| Home resume, no administra | Riesgo de poner demasiadas acciones en Home | Limitar Home a resumen \+ acciones 1-tap |
| Planner simple vs avanzado | Task detail menciona dependencias, comentarios, adjuntos | MVP debe mostrar solo lo implementable; avanzado oculto/futuro |
| TaskVerification | Archivo dice estado final Completada sin estado separado | No asumir flujo de verificación separado desde este documento |
| Goals dentro de Planner | Puede parecer MVP obligatorio | Tratar Goals como demo/POST\_MVP salvo otra fuente |
| Calendar muestra confirmar asistencia | No define estados de asistencia | Mantener visual/demo o post-MVP |
| Evento recurrente | Se menciona eliminación recurrente, no contrato de recurrencia | No implementar recurrencia compleja desde este documento |
| Presence | UX fuerte, pero GPS real avanzado | Usar como mock/demo |
| Geni | Capa transversal, no chatbot tab | No crear tab Geni |
| SOS | Acceso global swipe, pero MVP demo puede no soportar gestos | Si se incluye, hacerlo visual con cuidado; no Quick Actions |
| Adulto Mayor | Sin gestos complejos | Añadir alternativas explícitas |
| Empty state como onboarding | No hay copy concreto | Definir copy en otra etapa |
| Roles | 7 roles oficiales incluye Empleado Familiar | MVP pedido puede no incluir Empleado Familiar; tratar como POST\_MVP si no entra |
| Offline | Existe en archivo de comprensión | POST\_MVP para frontend actual |
| Auditoría | Varias acciones registran | No convertir en UI completa MVP |
| Search Global | Se menciona como navegador interno | POST\_MVP/DEMO si no hay implementación |
| Multi-hogar | Selector global en header | POST\_MVP si no se implementa multi-hogar |
| Feed/Presence/Finance/Inventory/FamilyCloud | Aparecen con UI | Demo premium, no backend real |

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Design tokens exactos | Para UI premium consistente | Necesita Design System |
| Colores hex / gradientes / blur exacto | Para implementación visual | Hay solo dirección conceptual |
| Tipografía exacta | Para coherencia visual | Falta especificación visual |
| Espaciado/radios/sombras | Para cards premium | Falta en este documento |
| Mapa real de navegación auth/onboarding | Para flujo post-login | No definido |
| Pantallas Auth | Para MVP real | No hay UI/campos |
| Pantallas Household/Invites | Para MVP real | No hay formularios ni copy |
| Endpoints | Para services frontend | No hay contratos API |
| Request/response | Para Codex/services | No definidos |
| Estados de error auth/invite | Para UX completa | No definidos |
| Permisos por acción | Para botones visibles | Incompleto |
| Mock data suficiente | Para demo premium | Hay ejemplos sueltos, faltan datos completos |
| Home final layout | Para implementación | Solo arquitectura/capas, no diseño final |
| Planner form fields | Para crear/editar | Campos incompletos |
| Calendar día/semana/mes completo | Para calendario MVP | Solo timeline día/semana |
| Events fields | Para create/edit event | No hay fecha/hora/lugar explícitos en pantalla |
| Members UI completa | Para asignaciones | Solo entidades/roles |
| More screen visual final | Para demo premium | Solo estructura conceptual |
| Settings detail | Para settings visuales | Secciones pero no UI |
| Quick Actions list final | Para panel real | Acciones dinámicas sin lista final cerrada |
| Empty state copy | Para onboarding sin tutorial | Falta texto concreto |
| Loading/skeleton diseño | Para estados UX | Regla general, no componente específico |
| Realtime real | Para dos dispositivos | No hay detalles técnicos |
| Storage/Offline | Para sync | POST\_MVP y sin implementación |
| Geni mock copy | Para demo | Falta contenido concreto |
| Activity mock | Para Home/Feed | Falta contenido concreto |
| Carga Familiar mock | Para Home | Falta fórmula/datos |
| Presence mock | Para Home/People | Hay estados/lugares, faltan personas |
| Finance mock | Para More/Home | Hay conceptos, faltan montos/lista |
| Inventory mock | Para More/Home | Hay ejemplos, faltan items |
| Assets mock | Para More | Hay categorías, faltan cards concretas |

## **27\. Fragments recomendados desde este documento**

| Fragment | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Sí | Medio | Aporta dirección visual, mobile-first, zonas, accesibilidad, densidad, paleta conceptual |
| `navigation_fragment` | Sí | Completo | Define Bottom Nav, niveles, transiciones, Quick Actions, More, People, Planner |
| `home_frontend_fragment` | Sí | Alto | Define rol de Home, capas, widgets, Home resume/no administra, Home por rol |
| `planner_frontend_fragment` | Sí | Alto | Define Tasks/Calendar UX, 1-tap, agrupación, relaciones, feedback |
| `people_members_frontend_fragment` | Parcial | Medio | Define People, roles, Person/Membership, Feed/Presence como sub-secciones |
| `household_invites_frontend_fragment` | Parcial | Bajo/Medio | Define Household/Membership/Invitation conceptual, pero no UI detallada |
| `auth_onboarding_frontend_fragment` | Parcial | Bajo | Solo onboarding sin tutorial, empty states, 60s a valor |
| `quick_actions_frontend_fragment` | Sí | Alto | Define botón central, panel flotante, Geni fijo, acciones dinámicas |
| `more_settings_frontend_fragment` | Sí | Alto | Define More, cards, Settings, módulos especializados |
| `finance_demo_fragment` | Sí | Medio | Aporta rol, More, acción principal, datos base |
| `inventory_demo_fragment` | Sí | Medio | Aporta stock bajo, medicamentos, reposición, datos base |
| `assets_demo_fragment` | Parcial | Medio | Aporta categorías/entidades desde comprensión, menos UX visual directa |
| `familycloud_demo_fragment` | Sí | Medio | Aporta HomeCloud/FamilyCloud, recuerdos, álbumes, documentos |
| `presence_demo_fragment` | Sí | Medio/Alto | Aporta Presence, estados, lugares, check-in, Home/People |
| `geni_demo_fragment` | Parcial | Medio | Aporta rol transversal y Quick Actions, no IA real |
| `mock_data_fragment` | Sí | Medio | Hay ejemplos sueltos útiles para demo |
| `ux_states_fragment` | Sí | Alto | Feedback, toasts, spinners, skeleton, empty states, confirmaciones |
| `frontend_services_fragment` | Parcial | Bajo/Medio | No hay endpoints, pero sí reglas de comportamiento service/optimistic UI |

## **28\. Conclusión operativa**

Este documento debe usarse como base transversal para el frontend premium MVP de HomePlus. No define pantallas finales pixel-perfect ni contratos API, pero sí define cómo debe comportarse la app para sentirse profesional, rápida, clara y coherente.

Aporta reglas fuertes para:

* Navegación global.  
* Bottom Nav.  
* Quick Actions.  
* Home.  
* Planner.  
* More.  
* People.  
* Feedback inmediato.  
* Confirmaciones.  
* Empty states.  
* Accesibilidad.  
* Adaptación por rol.  
* Mobile-first.  
* Densidad visual.  
* Relación entre módulos.

Debe entrar en la futura `frontend_premium_mvp_spec.md` como fuente principal para:

* arquitectura global de pantalla;  
* comportamiento de navegación;  
* patrones UI reutilizables;  
* estados UX;  
* reglas de interacción;  
* Home premium;  
* Planner premium;  
* More demo premium;  
* Quick Actions;  
* adaptación por rol;  
* accesibilidad.

Debe tratarse con cuidado en:

* Geni real;  
* SOS real;  
* Offline sync;  
* Automatizaciones reales;  
* Search global real;  
* AuditLog;  
* GPS/geofencing;  
* OCR/storage;  
* Goals;  
* comentarios/adjuntos/dependencias;  
* multi-hogar avanzado.

Para el MVP actual, las partes más valiosas son:

1. **REAL MVP**  
   * Home real con tareas/eventos cuando existan.  
   * Planner Tasks/Calendar como núcleo operativo.  
   * Bottom Nav fija.  
   * Quick Actions visual.  
   * Members/personas para asignaciones.  
   * Feedback inmediato.  
   * Estados UX.  
   * Onboarding sin tutorial si se implementa.  
2. **DEMO PREMIUM**  
   * More con Finance, Inventory, FamilyCloud, Settings.  
   * People con Feed/Presence visual.  
   * Home con Carga Familiar, Presence resumido, Actividad Familiar, Briefing mock.  
   * Geni como slot visual en Quick Actions.  
   * Módulos secundarios con cards e indicadores.  
3. **POST\_MVP**  
   * IA real.  
   * Automatizaciones reales.  
   * Offline real.  
   * GPS/geofencing.  
   * OCR/storage real.  
   * Auditoría completa.  
   * Permisos finos.  
   * Search global real.  
   * Multi-hogar avanzado.  
   * Recurrencia compleja.  
   * Feed real completo.  
   * SOS real completo.

---

# **SOURCE 07 — AI PHILOSOPHY / GENI**

## **Archivo recomendado**

`Seccion 7 Filosofia de la ai - geni.txt`

## **Tipo de documento**

Filosofía AI / Geni

## **Uso para frontend**

Extraer:

* cómo presentar a Geni;  
* qué puede sugerir;  
* qué no debe prometer;  
* tono;  
* cards mock de Geni;  
* módulos futuros;  
* límites MVP;  
* relación entre Geni, Home y Planner.

## **Contenido extraído**

# **frontend\_global\_fragment\_ai\_philosophy\_geni**

## **1\. Fuente**

* Documento principal: `HomePlus — SECCION 7 AI PHILOSOPHY - GENI.md`.  
* Archivo de comprensión asociado disponible en el chat: `Seccion 7 Filosofia de la ai - geni.txt`.  
* Tipo de documento: AI philosophy / filosofía de producto / Geni / navegación / Home / restricciones transversales.  
* Alcance del documento: define a Geni como capa transversal, no como módulo aislado; describe sus capacidades, restricciones, aparición en Home, Quick Actions, Planner, Presence, Search, Briefing, notificaciones, memoria, permisos, escalamiento, guardrails y reglas de navegación.  
* Nota de alcance: el propio documento indica que no es un documento técnico de infraestructura y que las expansiones de diseño están marcadas como `[EXPANSIÓN DE DISEÑO]`.

---

## **2\. Utilidad frontend del documento**

Nivel de utilidad frontend: **Medio / Alto para UX transversal; Bajo para pantallas específicas**.

Este documento no define pantallas visuales completas, layouts detallados ni design tokens. Su utilidad principal para el frontend premium del MVP está en:

* definir cómo debe sentirse la capa Geni dentro de la app;  
* definir que Geni aparece en Briefing, notificaciones, sugerencias inline, búsqueda global, tarjetas de memoria y pantalla completa vía Quick Actions;  
* definir límites claros para evitar una UX invasiva o acusatoria;  
* definir reglas aplicables a Home, Planner, Quick Actions, navegación, permisos y privacidad;  
* definir que Home resume información y no administra;  
* definir que Bottom Navigation V1 es `Home`, `People`, `+`, `Planner`, `More`;  
* definir que Geni no tiene tab propio en Bottom Nav;  
* definir que Finance, Inventory, FamilyCloud y Settings viven en More;  
* definir que el enfoque es Mobile First, con tablet en 2 columnas y desktop/sidebar pendiente de confirmación;  
* definir patrones de escalamiento, alertas y copywriting neutro para tareas, carga familiar y conflictos.

---

## **3\. Información de producto aplicable al frontend**

### **Principios generales extraídos**

* HomePlus debe sentirse como un sistema operativo del hogar, no como una app aislada de tareas, finanzas o red social. El archivo de comprensión lo marca como decisión arquitectónica para unificar herramientas familiares en un ecosistema integrado.  
* Geni es una capa transversal de inteligencia, no un chatbot incrustado ni un asistente de voz genérico. Opera sobre dominios autorizados como People, Planner, Finance, Presence, Inventory, Assets, HomeCloud, Feed, SOS y Automatizaciones.  
* Geni funciona con cinco verbos fundamentales: consultar, analizar, recomendar, coordinar y automatizar.  
* Geni recomienda, pero no ordena. La app debe presentar sugerencias accionables, no decisiones impuestas.  
* Geni coordina información entre módulos, eventos, carga de trabajo y presencia.  
* Toda automatización requiere aprobación explícita previa.  
* Geni no debe sentirse como chatbot aislado; debe aparecer transversalmente dentro de Home, Planner, módulos, búsqueda, notificaciones y Quick Actions.  
* Geni no debe ser juez, árbitro familiar, vigilante acusatorio ni reemplazo de conversación humana.  
* Geni debe presentar datos objetivos y no juicios de valor.  
* Geni no toma decisiones operativas sin aprobación humana.  
* La UX debe reducir ruido: una tarea atrasada no debe generar alerta fuerte; el umbral de intervención empieza en 3 tareas atrasadas.  
* La app debe preservar privacidad: Geni nunca ignora permisos y su output se filtra por la matriz de permisos del miembro que consulta.  
* La ubicación/GPS cruda no debe salir hacia modelos externos; para frontend, esto implica que cualquier UI de Presence/Geni debe mostrar ubicación procesada o resumida, no coordenadas crudas.  
* Home resume información pero no administra; toda información en Home conduce al módulo que la administra.  
* Home siempre es la pantalla inicial y el usuario no puede cambiarlo.  
* La navegación debe ser corta: más de 4 niveles de profundidad es fallo; objetivo: 95% de acciones en 3 niveles o menos.  
* Mobile First confirmado. Tablet usa 2 columnas. Desktop/sidebar queda pendiente de confirmación.

### **Clasificación frontend**

* **REAL MVP**:  
  * navegación principal: Home, People, \+, Planner, More;  
  * Home como pantalla inicial;  
  * Home como resumen;  
  * Planner en Bottom Nav;  
  * permisos visibles y filtrado de acciones/datos según rol;  
  * tareas no completadas automáticamente;  
  * acciones sensibles con confirmación humana;  
  * relación Home → módulo administrador.  
* **DEMO PREMIUM**:  
  * Geni como card, sugerencia inline, pantalla accesible vía Quick Actions;  
  * Briefing diario en Home;  
  * carga familiar visual;  
  * sugerencias de redistribución;  
  * análisis de tareas atrasadas;  
  * búsqueda global visual;  
  * notificaciones contextuales mock.  
* **MOCK**:  
  * Briefing generado con texto fijo o datos simples;  
  * presencia resumida;  
  * actividad reciente;  
  * sugerencias de Geni;  
  * carga familiar si no hay cálculo real.  
* **POST\_MVP**:  
  * IA real;  
  * automatizaciones reales;  
  * búsqueda global real con contexto cruzado;  
  * memorias reales;  
  * escalamiento automático completo;  
  * GPS real;  
  * auditoría completa;  
  * notificaciones push reales;  
  * multi-hogar avanzado.

---

## **4\. Navegación y arquitectura de pantallas**

### **Bottom Navigation**

Bottom Navigation V1 está congelado con:

* `Home`;  
* `People`;  
* `+`;  
* `Planner`;  
* `More`.

El motivo: la frecuencia de uso define la visibilidad, y no todos los dominios merecen espacio en navegación primaria.

Clasificación: **REAL MVP**.

### **Home**

* Home siempre es la pantalla inicial.  
* El usuario no puede cambiarlo.  
* Home resume información, no administra.  
* Toda información en Home conduce al módulo que la administra.

Clasificación: **REAL MVP**.

### **Geni**

* Geni no tiene tab dedicado en Bottom Nav.  
* Su acceso principal es vía Quick Actions como slot fijo.  
* También tiene presencia transversal dentro de la experiencia.

Clasificación: **DEMO PREMIUM / MOCK para MVP**.

### **Quick Actions**

* Quick Actions contiene el slot fijo de Geni.  
* Se accede desde el botón central `+`.  
* El documento no define lista completa de acciones, pero sí confirma que Geni es accesible desde Quick Actions.

Clasificación: **REAL MVP para contenedor `+`; DEMO PREMIUM para Geni**.

### **SOS**

* SOS tiene acceso propio por swipe ↑ global.  
* No está en Bottom Nav ni en Quick Actions.  
* El motivo: debe ser accesible con la menor cantidad de pasos y no confundirse con acciones cotidianas.

Clasificación: **POST\_MVP / DEMO visual si se decide mostrar; no desarrollar SOS real desde este documento**.

### **More**

* Finance, Inventory, FamilyCloud y Settings viven en More.  
* Son herramientas especializadas de uso ocasional.  
* No justifican espacio en navegación primaria.

Clasificación: **DEMO PREMIUM para módulos secundarios; REAL MVP para estructura de More si existe**.

### **Multi-hogar**

* Si el usuario pertenece a un solo hogar, no se muestra selector.  
* Con 2+ hogares, aparece selector en header con dropdown.  
* No existe navegación cruzada entre hogares.  
* Cada hogar es una entidad independiente.

Clasificación: **POST\_MVP para multi-hogar avanzado / REAL conceptual para separación de datos por hogar**.

---

## **5\. Pantallas detectadas**

| Pantalla / Área | Objetivo | Qué muestra / contiene | Acciones | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo inicial | Briefing, resumen de información del hogar, contenido que redirige a módulos | Abrir módulos administradores | REAL MVP \+ MOCK/DEMO para widgets avanzados |
| Briefing en Home | Resumir lo importante del hogar | Card única, versión resumida permanente y ampliada cuando hay cambios relevantes | Expandir / revisar información | DEMO PREMIUM / MOCK |
| People | Navegación primaria para personas | Documento no define pantalla específica, pero People está en Bottom Nav | No especificado | REAL MVP parcial |
| Planner | Navegación primaria para tareas/eventos | Documento no define pantalla completa, pero Planner está en Bottom Nav y Geni puede actuar sobre tareas/eventos | Crear tareas, reprogramar fechas, sugerir responsables, coordinar distribución | REAL MVP parcial \+ DEMO PREMIUM para sugerencias |
| More | Herramientas especializadas | Finance, Inventory, FamilyCloud, Settings | Abrir módulos secundarios | DEMO PREMIUM |
| Settings | Configuración | Vive exclusivamente en More; no aparece en Bottom Nav ni Home | Configurar opciones | DEMO PREMIUM / POST\_MVP según profundidad |
| Quick Actions | Acceso rápido desde `+` | Slot fijo de Geni | Abrir Geni / acciones rápidas no detalladas | REAL MVP para contenedor; DEMO PREMIUM para Geni |
| Pantalla completa de Geni | Experiencia dedicada de Geni | Accesible vía Quick Actions | Consultar / recibir sugerencias | DEMO PREMIUM / MOCK |
| Search / búsqueda global | Buscar con contexto cruzado | Resultados autorizados por permisos | Buscar / abrir resultados | POST\_MVP / DEMO PREMIUM |
| Notificaciones contextuales | Alertar según contexto | Notificaciones de Geni y dominios autorizados | Abrir módulo relacionado | MOCK / POST\_MVP |
| SOS | Acceso de emergencia | Acceso swipe ↑ global | Emitir alerta | IGNORAR como real; posible demo visual fuera de este fragmento |

---

## **6\. Componentes y patrones UI reutilizables**

### **Componentes explícitos o claramente mencionados**

* Bottom Navigation.  
* Botón central `+`.  
* Quick Actions.  
* Card única de Briefing.  
* Sugerencias inline.  
* Notificaciones contextuales.  
* Resultados de búsqueda global.  
* Tarjetas de memoria.  
* Pantalla completa de Geni.  
* Header con selector de hogar si el usuario tiene 2+ hogares.  
* Dropdown de selector multi-hogar.  
* Cards / widgets de Home.  
* Alertas privadas.  
* Informes al Coordinador.  
* Visibilidad en Briefing familiar.  
* Indicadores de carga/asimetría.  
* Estados de intervención por niveles N1, N2, N3, N4.

### **Patrones UX reutilizables**

* Card resumida \+ versión ampliada cuando hay cambios relevantes.  
* Sugerencias no invasivas dentro del módulo.  
* CTA humano para aceptar o rechazar sugerencias.  
* Datos visibles siempre filtrados por permisos.  
* Alertas solo por umbrales/patrones, no por cada evento.  
* Escalamiento progresivo:  
  * privado;  
  * privado reforzado;  
  * Coordinador;  
  * Briefing familiar.  
* Copy neutral y no acusatorio.  
* Navegación con profundidad máxima recomendada.  
* Módulos especializados en More.  
* Geni transversal, no tab independiente.

### **Clasificación**

* **REAL MVP**:  
  * Bottom Nav;  
  * Home inicial;  
  * `+`;  
  * Planner tab;  
  * More tab;  
  * relación Home → módulo.  
* **DEMO PREMIUM**:  
  * card de Briefing;  
  * sugerencias inline;  
  * pantalla Geni;  
  * búsqueda visual;  
  * cards de memoria;  
  * carga/asimetría visual.  
* **MOCK**:  
  * contenido de Briefing;  
  * sugerencias generadas;  
  * notificaciones contextuales;  
  * actividad/carga familiar si no existe cálculo real.  
* **POST\_MVP**:  
  * búsqueda global real;  
  * memoria real;  
  * IA real;  
  * escalamiento automático real.

---

## **7\. Visual design aplicable**

No se encontró información específica de colores, gradientes, blur, glassmorphism, radios, sombras, tipografía, iconografía detallada, densidad exacta, tamaño de botones o design tokens.

### **Información visual indirecta aplicable**

* Mobile First confirmado.  
* Tablet: 2 columnas.  
* Desktop: sidebar pendiente de confirmación.  
* Home usa widgets/cards.  
* Briefing es una única card.  
* Geni aparece como sugerencias inline.  
* Quick Actions es un punto de acceso relevante.  
* Bottom Nav está congelado.  
* More agrupa herramientas especializadas.  
* La UI debe reducir ruido y evitar alertas innecesarias.  
* El tono visual debe ser claro, no invasivo, neutral y orientado a coordinación.

### **Clasificación**

* **REAL MVP**:  
  * mobile-first;  
  * Bottom Nav;  
  * Home como inicio;  
  * navegación simple.  
* **DEMO PREMIUM**:  
  * cards de Geni;  
  * Briefing;  
  * sugerencias inline;  
  * carga familiar.  
* **POST\_MVP**:  
  * desktop/sidebar;  
  * IA real;  
  * Search real;  
  * memoria real.

---

## **8\. Home**

### **Rol de Home**

* Home resume información, no administra.  
* Toda información en Home conduce al módulo que la administra.  
* Home siempre es la pantalla inicial.  
* El usuario no puede cambiarlo.

Clasificación: **REAL MVP**.

### **Briefing**

* Briefing diario es el primer widget de Home.  
* Es una única card.  
* Tiene versión resumida permanente.  
* Tiene versión ampliada cuando hay cambios relevantes.  
* Resume lo importante del hogar.

Clasificación: **DEMO PREMIUM / MOCK** para MVP si no hay IA real.

### **Información que puede alimentar Home**

El contexto de Geni para generar Briefing incluye:

* rol del miembro;  
* nombre;  
* preferencias de notificación;  
* idioma;  
* nombres y roles de miembros del hogar;  
* memorias personales y familiares;  
* actividad reciente relevante;  
* tareas;  
* eventos;  
* gastos;  
* documentos autorizados;  
* briefing anterior;  
* permisos.

Clasificación:

* **REAL MVP**:  
  * tareas;  
  * eventos;  
  * miembros si ya existen.  
* **MOCK / DEMO PREMIUM**:  
  * briefing anterior;  
  * memorias;  
  * actividad reciente avanzada;  
  * gastos/documentos si no se implementan real.  
* **POST\_MVP**:  
  * IA real de briefing;  
  * memoria real;  
  * agregación avanzada.

### **Atención requerida**

El archivo de comprensión menciona que AtenciónRequerida agrega contenido importante y que SOS tiene prioridad máxima en Home.

Clasificación:

* **REAL MVP parcial**:  
  * tareas vencidas;  
  * eventos próximos/conflictos si están implementados.  
* **MOCK / DEMO PREMIUM**:  
  * SOS visual;  
  * vencimientos avanzados;  
  * deudas;  
  * documentos;  
  * medicamentos.  
* **IGNORAR como real**:  
  * SOS real.

### **Carga familiar**

El documento indica que Geni puede analizar carga de trabajo por miembro y coordinar distribución de tareas.

El archivo de comprensión indica que CargaFamiliar se calcula desde responsabilidades y tareas por miembro.

Clasificación:

* **DEMO PREMIUM / MOCK** para MVP visual si no hay cálculo real.  
* **REAL MVP parcial** si se calcula con tareas reales ya disponibles.

### **Activity / actividad familiar**

El documento menciona actividad reciente como parte del contexto de Geni.

Clasificación:

* **MOCK / DEMO PREMIUM**.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

Geni puede operar sobre Planner. En Planner, Geni puede:

* crear tareas;  
* reprogramar fechas;  
* sugerir responsables;  
* analizar carga de trabajo por miembro;  
* coordinar distribución de tareas.

Geni no puede:

* marcar tareas como completadas automáticamente;  
* reasignar tareas sin aprobación del responsable o del Coordinador.

Clasificación:

* **REAL MVP**:  
  * tareas creadas/completadas por humanos;  
  * edición/reprogramación con acción humana;  
  * asignación/reasignación con permisos.  
* **DEMO PREMIUM / MOCK**:  
  * sugerencias de Geni;  
  * análisis de carga;  
  * redistribución sugerida.  
* **POST\_MVP**:  
  * IA real;  
  * análisis automático avanzado;  
  * escalamiento real.

### **Tasks**

Información encontrada:

* Geni nunca marca tareas como completadas automáticamente.  
* Geni nunca reasigna tareas unilateralmente; solo sugiere responsables.  
* Una tarea atrasada equivale a silencio.  
* 3+ tareas atrasadas hacen que Geni actúe.  
* Tareas atrasadas del mismo miembro con umbral ≥3 generan alerta privada.  
* Tareas atrasadas del mismo miembro con umbral ≥5 generan informe al Coordinador.  
* Tareas atrasadas sin dueño activo con umbral ≥3 pueden ser visibles en Briefing familiar.  
* Asimetría de carga de tareas \>40% genera informe al Coordinador.  
* El Coordinador puede configurar umbrales como días de silencio antes de escalar tarea y diferencia de asimetría.

Clasificación:

* **REAL MVP**:  
  * completar tarea solo por acción humana;  
  * no reasignar automáticamente;  
  * mostrar tareas pendientes/vencidas si existen.  
* **DEMO PREMIUM / MOCK**:  
  * banners de “3 tareas atrasadas”;  
  * carga familiar;  
  * sugerencia de redistribución;  
  * informe visual al Coordinador.  
* **POST\_MVP**:  
  * escalamiento automático completo;  
  * configuración real de umbrales;  
  * IA real.

### **Events / Calendar**

Información encontrada:

* Geni puede coordinar eventos entre miembros.  
* Geni puede detectar retrasos, generar recordatorios de salida/llegada y proponer acciones basadas en ubicación.  
* Geni no puede cancelar o modificar eventos del calendario sin aprobación.  
* Geni no puede compartir ubicación con quien no tiene permiso.

Clasificación:

* **REAL MVP**:  
  * eventos creados/editados/cancelados por humanos;  
  * permisos de visibilidad básicos si existen.  
* **DEMO PREMIUM / MOCK**:  
  * conflicto de agenda visual;  
  * recordatorio contextual simulado;  
  * sugerencia de reprogramación.  
* **POST\_MVP**:  
  * GPS real;  
  * detección real de retrasos;  
  * recordatorios reales basados en ubicación;  
  * coordinación real automatizada.

### **Calendar con FamilyCloud**

El archivo de comprensión indica que en V1 los participantes de álbumes y recuerdos se heredan del evento de Calendar y no existe reconocimiento facial en V1.

Clasificación:

* **DEMO PREMIUM / POST\_MVP** para FamilyCloud.  
* Relación útil: Event puede alimentar recuerdos/álbumes visuales en demo.  
* No desarrollar reconocimiento facial.

### **Goals**

El documento menciona metas en el contexto de memorias personales y actividad, pero no define Goals frontend en detalle.

Clasificación: **POST\_MVP / DEMO visual si se requiere**.

---

## **10\. People / Members / Roles**

### **Información encontrada**

El contexto de Geni incluye:

* rol del miembro;  
* nombre;  
* nombres y roles de todos los miembros;  
* relaciones familiares;  
* permisos activos;  
* matriz completa de permisos.

Geni nunca ignora permisos y filtra su output por la matriz de permisos del miembro que consulta.

El Coordinador tiene autoridad decisoria desde Nivel 3 de escalamiento; Geni informa, no decide.

### **Roles mencionados**

* Coordinador.  
* Adulto.  
* Niño.  
* Empleado Familiar.

El documento también referencia matriz de permisos, pero no detalla todos los permisos de cada rol en esta sección.

### **Aplicación frontend**

* Mostrar datos y acciones según permisos.  
* No mostrar datos de dominios sin permiso.  
* Geni/Briefing no debe exponer información que el usuario no puede ver.  
* Coordinador puede recibir informes de escalamiento.  
* Coordinador decide acciones a partir del Nivel 3\.  
* El rol del miembro personaliza tono y formato del output de Geni.

### **Clasificación**

* **REAL MVP**:  
  * rol visible;  
  * permisos básicos;  
  * Coordinador como autoridad para acciones de hogar/escala.  
* **DEMO PREMIUM / MOCK**:  
  * escalamiento de Geni;  
  * informes visuales al Coordinador.  
* **POST\_MVP**:  
  * matriz completa de permisos finos;  
  * escalamiento automático real;  
  * personalización avanzada de tono por rol.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

Información encontrada:

* Geni opera sobre datos autorizados del hogar.  
* El contexto incluye nombres y roles de miembros del hogar.  
* Multi-hogar: cada hogar es una entidad independiente.  
* No existe navegación cruzada entre hogares.  
* Si el usuario pertenece a un solo hogar, no se muestra selector.  
* Con 2+ hogares, aparece selector en header con dropdown.  
* Las automatizaciones operan a nivel hogar y no existen automatizaciones compartidas entre hogares.

Clasificación:

* **REAL MVP**:  
  * datos filtrados por hogar activo;  
  * separación visual/contextual por hogar.  
* **POST\_MVP**:  
  * selector multi-hogar avanzado;  
  * automatizaciones por hogar.

### **Invitations**

No se encontró información específica de invitaciones, aceptar invitación, links, códigos, tokens, pending approval, aprobar/rechazar miembros ni formularios de invitación en este documento.

### **Onboarding**

No se encontró información específica de onboarding, formularios de onboarding ni onboarding por rol en este documento.

---

## **12\. More / Settings / Profile**

### **More**

* Finance, Inventory, FamilyCloud y Settings viven en More.  
* Son herramientas especializadas de uso ocasional.  
* No deben ocupar espacio en navegación primaria.

Clasificación:

* **DEMO PREMIUM** para Finance, Inventory, FamilyCloud.  
* **REAL MVP parcial / DEMO PREMIUM** para More como sección visual.

### **Settings**

* Settings vive exclusivamente en More.  
* No aparece en Bottom Nav.  
* No tiene acceso desde Home.

Clasificación:

* **DEMO PREMIUM** si solo se muestra estructura.  
* **POST\_MVP** si implica configuración real avanzada.

### **Profile**

No se encontró información específica sobre pantalla Profile, formularios de perfil, avatar o datos de cuenta visuales, salvo que el contexto de Geni incluye nombre, rol, idioma y preferencias de notificación.

---

## **13\. Quick Actions**

### **Información encontrada**

* Geni tiene pantalla completa accesible vía Quick Actions como slot fijo.  
* Geni no tiene tab dedicado en Bottom Nav; su acceso principal es Quick Actions.  
* SOS no está en Quick Actions; tiene acceso propio swipe ↑ global.

### **Acciones rápidas detectadas o inferibles directamente por capacidades mencionadas**

| Acción | Fuente | Clasificación |
| ----- | ----- | ----- |
| Abrir Geni | Pantalla completa de Geni vía Quick Actions | DEMO PREMIUM |
| Crear tarea asistida por Geni | Geni puede crear tareas en Planner | DEMO PREMIUM / REAL si se conecta a Planner real |
| Reprogramar fecha sugerida | Geni puede reprogramar fechas, siempre con aprobación humana | DEMO PREMIUM / REAL si hay edición real |
| Sugerir responsable | Geni puede sugerir responsables | DEMO PREMIUM / MOCK |
| Preguntar / consultar a Geni | Geni consulta y cruza datos autorizados | MOCK / POST\_MVP |
| SOS | El documento dice que no va en Quick Actions | IGNORAR para Quick Actions |

No se encontró lista completa de Quick Actions ni estructura visual del menú.

---

## **14\. Módulos demo premium**

### **Geni**

Rol visual:

* Capa transversal.  
* No chatbot aislado.  
* Aparece en Home, notificaciones, sugerencias inline, búsqueda global, tarjetas de memoria y pantalla completa vía Quick Actions.

Datos mock posibles extraídos:

* “Tienes una tarea atrasada: ‘Pagar servicios’. ¿La revisas hoy?”  
* “Ya van 3 tareas atrasadas. Esto está generando desbalance. ¿Quieres que te ayude a reorganizar? Si no se resuelve, mañana debo informar al Coordinador.”  
* “Juan tiene 3 tareas atrasadas esta semana. Te informo como Coordinador para que evalúes si corresponde intervenir.”  
* “Hay 3 tareas sin dueño activo esta semana. Como familia, ¿quieren redistribuirlas?”  
* “Tienes dos eventos el mismo día a la misma hora.”  
* “¿El 15 es el cumpleaños de Sofía? ¿Quieres planear algo?”  
* “Hay 12 documentos sin clasificar. ¿Te ayudo a organizarlos?”

Clasificación: **DEMO PREMIUM / MOCK**.

No implementar real:

* IA real.  
* memoria real;  
* automatizaciones reales;  
* búsqueda global real;  
* escalamiento automático real.

### **Briefing**

Rol visual:

* Primer widget de Home.  
* Card única.  
* Resume lo importante del hogar.  
* Versión resumida permanente \+ versión ampliada cuando hay cambios relevantes.

Clasificación: **DEMO PREMIUM / MOCK**.

### **Finance**

Geni puede:

* detectar patrones de gasto;  
* identificar riesgos;  
* recomendar ahorro;  
* sugerir presupuestos;  
* proponer tareas financieras.

Geni no puede:

* ejecutar transferencias;  
* autorizar pagos;  
* perdonar deudas;  
* modificar saldos.

Clasificación: **DEMO PREMIUM / POST\_MVP**.

### **Inventory**

El documento menciona Inventory como dominio autorizado de Geni. El archivo de comprensión menciona que medicamentos pertenecen a Inventory, no a Assets, y que pueden tener fecha de vencimiento.

Clasificación: **DEMO PREMIUM / POST\_MVP**.

### **Assets**

El documento menciona Assets como dominio autorizado de Geni. No define frontend visual de Assets en esta sección.

Clasificación: **DEMO PREMIUM / POST\_MVP**.

### **FamilyCloud / HomeCloud**

Geni puede:

* clasificar documentos;  
* sugerir etiquetas de personas;  
* generar recuerdos automáticos a partir de eventos finalizados;  
* no puede eliminar documentos;  
* no puede compartir fuera del hogar;  
* no puede crear recuerdos sin confirmación.

V1 sin reconocimiento facial: los participantes de recuerdos se heredan de Calendar.

Clasificación: **DEMO PREMIUM / POST\_MVP**.

### **Presence**

Geni puede:

* coordinar eventos entre miembros;  
* detectar retrasos;  
* generar recordatorios de salida/llegada;  
* proponer acciones basadas en ubicación.

Geni no puede:

* cancelar o modificar eventos del calendario sin aprobación;  
* compartir ubicación con quien no tiene permiso.

Clasificación: **DEMO PREMIUM / POST\_MVP**.

### **Search**

Geni puede hacer búsqueda global con contexto cruzado entre dominios autorizados.

No puede exponer resultados que violen permisos.

Clasificación: **DEMO PREMIUM visual / POST\_MVP real**.

### **Automations**

Geni puede crear, sugerir y modificar automatizaciones.

No puede activar automatizaciones sin aprobación explícita ni crear automatizaciones que afecten a todo el hogar sin aprobación de Coordinador o Adulto.

Clasificación: **DEMO PREMIUM visual / POST\_MVP real**.

### **SOS**

* SOS no está en Bottom Nav ni Quick Actions.  
* Tiene acceso propio swipe ↑ global.  
* SOS tiene prioridad máxima en Home y desplaza cualquier otro contenido.

Clasificación: **POST\_MVP / posible demo visual; no implementar real desde este documento**.

---

## **15\. Estados UX y feedback**

### **Estados y señales explícitas o derivadas del documento**

| Estado / señal | Módulo | Uso frontend | Clasificación |
| ----- | ----- | ----- | ----- |
| Tarea atrasada | Planner/Home/Geni | Mostrar como dato operativo | REAL MVP si hay tareas reales |
| 1 tarea atrasada \= silencio | Planner/Geni | No generar alerta fuerte | REAL MVP como regla UX |
| 3+ tareas atrasadas | Planner/Home/Geni | Mostrar alerta/sugerencia | DEMO PREMIUM / REAL parcial |
| 5+ tareas atrasadas | Planner/Geni | Informe al Coordinador | DEMO PREMIUM |
| Tareas sin dueño activo | Planner/Home | Puede aparecer en Briefing familiar | DEMO PREMIUM / REAL parcial |
| Asimetría de carga \>40% | Planner/Home | Informe al Coordinador | DEMO PREMIUM |
| Evento solapado | Calendar/Geni | Alerta privada | DEMO PREMIUM / REAL parcial |
| Retraso en evento | Presence/Calendar | Notificación a asistentes | POST\_MVP / MOCK |
| Informe al Coordinador | People/Home/Geni | Nivel 3 de escalamiento | DEMO PREMIUM |
| Visibilidad en Briefing familiar | Home/Geni | Nivel 4 de escalamiento | DEMO PREMIUM |
| Permiso denegado / datos no autorizados | Global | Ocultar output/datos | REAL MVP |
| Acción requiere aprobación | Planner/Events/Automations | Confirmar antes de ejecutar | REAL MVP / DEMO |
| Memoria requiere confirmación | Geni/FamilyCloud | No guardar sin aceptar | POST\_MVP |
| Automatización requiere aprobación | Automations/Geni | No activar automáticamente | POST\_MVP |
| GPS crudo excluido | Presence/Geni | No mostrar/enviar lat/long a IA | POST\_MVP / privacidad |

### **Estados no encontrados**

No se encontró definición específica de:

* loading;  
* skeleton;  
* spinner;  
* retry;  
* toast;  
* success;  
* empty state visual;  
* error de red;  
* optimistic update;  
* realtime update.

---

## **16\. Formularios y datos de entrada**

### **Formularios encontrados**

No se encontró especificación de formularios frontend completos.

### **Datos de entrada indirectos mencionados**

| Dato | Uso | Fuente | Clasificación |
| ----- | ----- | ----- | ----- |
| Rol del miembro | Personalización de Geni / permisos | Contexto de Geni | REAL MVP / DEMO |
| Nombre | Personalización de tono/formato | Contexto de Geni | REAL MVP |
| Preferencias de notificación | Personalización | Contexto de Geni | POST\_MVP |
| Idioma | Personalización | Contexto de Geni | REAL / POST\_MVP según alcance |
| Nombres y roles de miembros | Contexto familiar | Contexto de Geni | REAL MVP |
| Tareas | Actividad reciente / patrones | Contexto de Geni | REAL MVP |
| Eventos | Actividad reciente / patrones | Contexto de Geni | REAL MVP |
| Gastos | Actividad reciente / patrones | Contexto de Geni | DEMO PREMIUM / POST\_MVP |
| Documentos | Actividad reciente / patrones | Contexto de Geni | DEMO PREMIUM / POST\_MVP |
| Briefing anterior | Continuidad | Contexto de Geni | MOCK / POST\_MVP |
| Permisos | Filtro de output | Contexto de Geni | REAL MVP |

No se encontraron campos específicos de login, register, household, invite, task form, event form ni settings form.

---

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Módulo | Uso posible | Clasificación |
| ----- | ----- | ----- | ----- |
| “Pagar servicios” | Planner / Geni | Ejemplo de tarea atrasada | MOCK |
| “Tienes una tarea atrasada: ‘Pagar servicios’. ¿La revisas hoy?” | Planner / Notificación / Geni | Copy neutral de recordatorio | MOCK |
| “Ya van 3 tareas atrasadas. Esto está generando desbalance. ¿Quieres que te ayude a reorganizar?” | Planner / Geni | Alerta privada reforzada | MOCK |
| “Si no se resuelve, mañana debo informar al Coordinador.” | Planner / Geni | Preaviso de escalamiento | MOCK |
| “Juan tiene 3 tareas atrasadas esta semana. Te informo como Coordinador para que evalúes si corresponde intervenir.” | Planner / Home / Geni | Informe al Coordinador | MOCK |
| “Hay 3 tareas sin dueño activo esta semana. Como familia, ¿quieren redistribuirlas?” | Home / Planner / Briefing | Briefing familiar | MOCK |
| “Tienes dos eventos el mismo día a la misma hora.” | Calendar / Geni | Alerta de evento solapado | MOCK |
| “Hay 12 documentos sin clasificar. ¿Te ayudo a organizarlos?” | FamilyCloud / Geni | Demo de HomeCloud | MOCK |
| “¿El 15 es el cumpleaños de Sofía? ¿Quieres planear algo?” | Calendar / Geni | Sugerencia contextual | MOCK |
| “Los viernes siempre pides pizza” | Memoria / Geni | Ejemplo de patrón observado | MOCK |
| “Las cenas familiares son los viernes” | Memoria familiar | Ejemplo de memoria familiar | MOCK |
| “El WiFi se corta cuando llueve” | Memoria familiar | Ejemplo de memoria familiar | MOCK |
| “Vacaciones de verano 2026: playa” | Memoria familiar | Ejemplo de memoria familiar | MOCK |
| “Mi meta de ahorro este año es 15%” | Memoria personal / Finance | Ejemplo de memoria personal | MOCK |
| “El médico de Juan es el Dr. Pérez” | Memoria personal | Ejemplo sensible/contextual | MOCK / POST\_MVP |
| “Receta de lasaña de la abuela” | Memoria personal | Ejemplo de memoria | MOCK |
| Casa | Presence / lugares | Lugar demo | MOCK |
| Escuela | Presence / lugares | Lugar demo | MOCK |
| Trabajo | Presence / lugares | Lugar demo | MOCK |
| Club | Presence / lugares | Lugar demo | MOCK |
| Hospital | Presence / lugares | Lugar demo | MOCK |

---

## **18\. Servicios frontend / APIs / datos**

No se encontró contrato API explícito en este documento.

### **Acciones o servicios conceptuales detectados**

| Acción / servicio conceptual | Datos | Clasificación |
| ----- | ----- | ----- |
| Generar Briefing | tareas, eventos, gastos, documentos autorizados, miembros, permisos, briefing anterior | MOCK / POST\_MVP |
| Mostrar sugerencias inline | contexto del módulo \+ permisos | DEMO PREMIUM |
| Filtrar output por permisos | matriz de permisos del miembro | REAL MVP |
| Crear tarea vía Geni | tarea sugerida/creada con aprobación humana | DEMO PREMIUM / REAL si se conecta a Tasks |
| Reprogramar fecha vía Geni | fecha sugerida con aprobación | DEMO PREMIUM |
| Sugerir responsable | miembros/roles/carga | MOCK |
| Analizar carga familiar | tareas por miembro/responsabilidad | MOCK / REAL parcial |
| Detectar evento solapado | eventos del miembro | DEMO PREMIUM |
| Crear memoria | confirmación explícita del usuario | POST\_MVP |
| Activar automatización | aprobación explícita | POST\_MVP |
| Búsqueda global | dominios autorizados | POST\_MVP |
| Procesar ubicación | datos procesados, no GPS crudo | POST\_MVP |

No se encontraron:

* endpoints;  
* métodos HTTP;  
* requests;  
* responses;  
* errores de API;  
* paginación;  
* Supabase;  
* storage;  
* realtime técnico.

---

## **19\. Realtime / sincronización visible**

### **Información encontrada**

* Offline: las acciones realizadas offline quedan en cola de sincronización.  
* Resolución de conflictos: Last Write Wins.

Clasificación: **POST\_MVP**.

### **Eventos conceptuales que podrían afectar UI**

| Evento conceptual | Pantalla afectada | Clasificación |
| ----- | ----- | ----- |
| Tarea atrasada alcanza umbral | Planner / Home / Geni | DEMO PREMIUM |
| Asimetría de carga detectada | Planner / Home / Coordinador | DEMO PREMIUM |
| Evento solapado detectado | Calendar / Home / Geni | DEMO PREMIUM |
| Briefing generado | Home | MOCK |
| Cambio de hogar activo | Header / Home / módulos | POST\_MVP / REAL si se implementa |
| Acción offline sincronizada | Pantalla correspondiente | POST\_MVP |

No se encontró información específica de:

* realtime entre dispositivos;  
* broadcast;  
* websockets;  
* Supabase Realtime;  
* refresh automático de pantallas;  
* conflictos visibles en UI más allá de Last Write Wins.

---

## **20\. Permisos visibles en UI**

### **Reglas extraídas**

* Geni nunca ignora permisos.  
* El output de Geni se filtra por la matriz de permisos del miembro que consulta.  
* Si un miembro no puede ver un documento, Geni no lo menciona en su briefing ni en respuestas.  
* Geni nunca accede a información privada sin autorización.  
* Las memorias personales de otros miembros no entran al contexto de Geni.  
* Los datos de dominios sin permiso no entran al contexto de Geni.  
* El Coordinador es autoridad decisoria a partir del Nivel 3 de escalamiento.  
* El Coordinador configura ciertos umbrales de intervención.  
* Automatizaciones que afectan a todo el hogar requieren aprobación de Coordinador o Adulto.  
* SOS: todos los miembros pueden emitir, excepto alerta roja para Niño y Empleado Familiar; solo quien emitió y los Coordinadores pueden cancelar.

### **Aplicación frontend**

* Ocultar o deshabilitar acciones no permitidas.  
* No mostrar en Briefing información no autorizada.  
* No mostrar resultados de búsqueda global sin permiso.  
* No mostrar memorias personales ajenas.  
* Pedir confirmación antes de guardar memoria, automatización o acción sensible.  
* Mostrar informes al Coordinador solo si el usuario tiene ese rol.  
* Mostrar configuración de umbrales solo al Coordinador si se implementa.

### **Clasificación**

* **REAL MVP**:  
  * filtrado básico por permisos/rol;  
  * acciones sensibles con aprobación humana;  
  * no exponer datos no autorizados.  
* **DEMO PREMIUM**:  
  * informes al Coordinador;  
  * escalamiento visual;  
  * sugerencias con permisos.  
* **POST\_MVP**:  
  * matriz completa de permisos;  
  * permisos finos;  
  * configuraciones avanzadas.

---

## **21\. Integraciones visibles entre módulos**

| Relación | Descripción | Clasificación |
| ----- | ----- | ----- |
| Home → Briefing | Briefing diario como primer widget de Home | DEMO PREMIUM / MOCK |
| Home → Planner | Home resume tareas/eventos y conduce a Planner | REAL MVP |
| Home → People | Home/Geni puede usar nombres y roles de miembros | REAL MVP parcial |
| Home → SOS | SOS tiene prioridad máxima y desplaza contenido | POST\_MVP / DEMO |
| Home → Finance | Briefing puede incluir gastos/riesgos | DEMO PREMIUM / POST\_MVP |
| Home → FamilyCloud/HomeCloud | Briefing puede incluir documentos sin clasificar | DEMO PREMIUM |
| Planner → People | Tareas asignadas a miembros; eventos con participantes | REAL MVP |
| Planner → Geni | Geni sugiere responsables, reprograma fechas y analiza carga | DEMO PREMIUM |
| Planner → Home | Tareas atrasadas, carga, eventos y conflictos aparecen resumidos | REAL MVP \+ MOCK |
| Calendar → Presence | Geni coordina eventos y retrasos basados en ubicación | POST\_MVP / DEMO |
| Calendar → FamilyCloud | Participantes de recuerdos se heredan de Calendar en V1 | DEMO PREMIUM / POST\_MVP |
| More → Finance | Finance vive en More | DEMO PREMIUM |
| More → Inventory | Inventory vive en More | DEMO PREMIUM |
| More → FamilyCloud | FamilyCloud vive en More | DEMO PREMIUM |
| More → Settings | Settings vive exclusivamente en More | DEMO PREMIUM / REAL parcial |
| Quick Actions → Geni | Geni es slot fijo en Quick Actions | DEMO PREMIUM |
| Geni → Search | Búsqueda global con contexto cruzado | POST\_MVP / DEMO visual |
| Geni → Notifications | Notificaciones contextuales | MOCK / POST\_MVP |
| Inventory → Planner | Medicamentos/vencimientos pueden generar alertas o tareas conceptuales | POST\_MVP / DEMO |
| Assets → Planner | Mantenimiento puede generar tareas según archivo de comprensión | POST\_MVP / DEMO |
| Automations → Planner | Automatizaciones pueden crear tarea/recordatorio/evento con aprobación | POST\_MVP |

---

## **22\. Edge cases frontend**

| Caso | Comportamiento esperado según documento | Clasificación |
| ----- | ----- | ----- |
| Usuario sin permiso sobre dato | Geni no lo menciona ni lo muestra | REAL MVP |
| Dominio sin permiso | No entra al contexto ni output de Geni | REAL MVP |
| Memoria personal de otro miembro | No se carga ni se muestra | POST\_MVP / privacidad |
| GPS crudo | No se envía a modelo externo; solo información procesada | POST\_MVP |
| Una tarea atrasada | Silencio; no generar ruido | REAL MVP / DEMO |
| Tres tareas atrasadas | Geni actúa con alerta/sugerencia | DEMO PREMIUM |
| Cinco tareas atrasadas | Informe al Coordinador | DEMO PREMIUM |
| Tareas sin dueño activo ≥3 | Visible en Briefing familiar | DEMO PREMIUM |
| Asimetría de carga \>40% | Informe al Coordinador | DEMO PREMIUM |
| Evento solapado | Alerta privada | DEMO PREMIUM |
| Automatización sin aprobación | No activar | POST\_MVP |
| Memoria sin confirmación | No guardar | POST\_MVP |
| Reasignación automática de tarea | Prohibida | REAL MVP |
| Completar tarea automáticamente | Prohibido | REAL MVP |
| Cancelar/modificar evento por Geni | Prohibido sin aprobación | REAL MVP / POST\_MVP |
| Compartir ubicación sin permiso | Prohibido | POST\_MVP |
| Usuario con un solo hogar | No mostrar selector multi-hogar | POST\_MVP / REAL si aplica |
| Usuario con 2+ hogares | Mostrar selector en header con dropdown | POST\_MVP |
| Navegación \>4 niveles | Considerada fallo de navegación | REAL MVP como regla UX |
| SOS en Quick Actions | No debe estar ahí | POST\_MVP / regla navegación |

No se encontraron edge cases de auth como email registrado, credenciales inválidas, token expirado o invitación expirada.

---

## **23\. Copywriting y labels**

### **Labels / nombres de navegación**

* Home.  
* People.  
* `+`.  
* Planner.  
* More.  
* Settings.  
* Quick Actions.  
* Geni.  
* Briefing.

### **Verbos de Geni**

* Consultar.  
* Analizar.  
* Recomendar.  
* Coordinar.  
* Automatizar.

### **Copy explícito útil**

* “Tienes una tarea atrasada: ‘Pagar servicios’. ¿La revisas hoy?”  
* “Ya van 3 tareas atrasadas. Esto está generando desbalance. ¿Quieres que te ayude a reorganizar? Si no se resuelve, mañana debo informar al Coordinador.”  
* “Juan tiene 3 tareas atrasadas esta semana. Te informo como Coordinador para que evalúes si corresponde intervenir.”  
* “Hay 3 tareas sin dueño activo esta semana. Como familia, ¿quieren redistribuirlas?”  
* “Tienes dos eventos el mismo día a la misma hora.”  
* “Hay 12 documentos sin clasificar. ¿Te ayudo a organizarlos?”  
* “¿El 15 es el cumpleaños de Sofía? ¿Quieres planear algo?”  
* “Los viernes siempre pides pizza.”  
* “¿Recuerdo que el seguro del auto vence en marzo?”

### **Tono**

* Neutral.  
* Informativo.  
* No acusatorio.  
* Sin juicios de valor.  
* Orientado a solución.  
* Con preaviso antes de escalar.  
* Geni informa, no decide.

---

## **24\. Restricciones técnicas frontend**

### **Encontrado**

* Mobile First confirmado.  
* Tablet: 2 columnas.  
* Desktop: sidebar pendiente de confirmación.  
* Más de 4 niveles de profundidad es fallo.  
* Objetivo: 95% de acciones en 3 niveles o menos.  
* Bottom Navigation V1 congelado.  
* Home siempre inicial.  
* Geni sin tab propio.  
* Settings exclusivamente en More.  
* SOS fuera de Bottom Nav y fuera de Quick Actions.  
* No navegación cruzada entre hogares.  
* Si hay un solo hogar, no mostrar selector multi-hogar.  
* Con 2+ hogares, selector en header con dropdown.  
* GPS crudo no sale hacia modelos externos.  
* Offline sync con cola y Last Write Wins aparece como decisión, pero corresponde a alcance avanzado.

### **No encontrado**

* Expo.  
* React Native.  
* Supabase.  
* Realtime técnico.  
* Storage.  
* Edge Functions.  
* Librerías disponibles o ausentes.  
* Limitaciones de performance.  
* Componentes concretos de UI.  
* Design tokens.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Geni real vs demo | El documento describe Geni avanzado, pero el MVP puede no implementar IA real | Usar Geni como DEMO PREMIUM/MOCK salvo que otra fuente defina backend real |
| Briefing real vs mock | El documento describe Briefing inteligente; no hay contrato técnico | Implementar como card mock o con datos simples de tareas/eventos |
| Planner simple vs Geni avanzado | Geni puede crear/reprogramar/sugerir, pero no hay UI ni API | Mantener acciones humanas reales y sugerencias mock |
| Escalamiento real | Hay niveles y tiempos, pero implementarlo real es complejo | Usarlo como inspiración visual/copy; dejar automatización para POST\_MVP |
| Permisos finos | Se menciona matriz completa, pero no se detalla | Implementar solo permisos básicos definidos por otras fuentes |
| Multi-hogar | Documento define selector y separación, pero puede estar fuera del MVP actual | No priorizar selector salvo que otras fuentes lo hagan obligatorio |
| Offline sync | Se menciona Last Write Wins | Clasificar como POST\_MVP |
| Presence GPS | Documento habla de retrasos y ubicación procesada | Usar Presence mock; no GPS real |
| SOS | Tiene reglas de navegación y prioridad Home | No implementar real desde este documento; posible demo visual separada |
| Settings | Vive exclusivamente en More, pero no hay UI | More/Settings puede ser demo premium |
| Search global | Muy transversal y dependiente de permisos | Demo visual o POST\_MVP |
| FamilyCloud/Calendar | Participantes heredados de Calendar | Útil para futuro, no bloquear MVP |
| Automatizaciones | Requieren aprobación y son por hogar | No implementar real; solo demo premium si se muestra |

---

## **26\. Información faltante**

* Pantallas visuales concretas.  
* Layout de Home.  
* Layout de Planner.  
* Layout de People.  
* Layout de More.  
* Layout de Settings.  
* Layout de Quick Actions.  
* Diseño de pantalla completa de Geni.  
* Design tokens.  
* Colores.  
* Tipografía.  
* Iconografía.  
* Spacing.  
* Radios.  
* Sombras.  
* Skeletons.  
* Loaders.  
* Empty states.  
* Toasts.  
* Formularios de auth.  
* Formularios de household.  
* Formularios de invitación.  
* Formularios de tareas.  
* Formularios de eventos.  
* Formularios de settings.  
* API contracts.  
* Requests/responses.  
* Errores visibles.  
* Servicios frontend.  
* Supabase integration.  
* Realtime entre dispositivos.  
* Datos mock completos para todos los módulos.  
* Permisos detallados por rol.  
* Acciones completas de Quick Actions.  
* Estructura completa de More.  
* Copy completo de onboarding.  
* Estados de sesión.  
* Estados de invitación.  
* Estados de membership.  
* Estados definitivos de tasks/events en MVP.  
* Reglas visuales de Calendar día/semana/mes.  
* Relación exacta Home ↔ Planner.  
* Qué widgets avanzados de Home quedan mock vs real.

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Bajo | No hay design tokens, pero sí tono, mobile-first y patrones de cards/sugerencias |
| `navigation_fragment` | Sí | Alto | Define Bottom Nav, Home inicial, More, Quick Actions, Geni sin tab, SOS fuera de Quick Actions |
| `home_frontend_fragment` | Sí | Medio/Alto | Define Home como resumen, Briefing, primera card, no administración, atención/carga |
| `planner_frontend_fragment` | Sí | Medio | Define reglas de Geni sobre tareas/eventos, carga, completado, reasignación, alertas |
| `people_members_frontend_fragment` | Parcial | Bajo/Medio | Aporta roles, permisos y contexto de miembros, pero no pantalla People |
| `household_invites_frontend_fragment` | Parcial | Bajo | Aporta hogar, multi-hogar y selector, pero no invitaciones |
| `auth_onboarding_frontend_fragment` | No | Vacío | No define auth/onboarding |
| `quick_actions_frontend_fragment` | Sí | Medio | Define Geni como slot fijo y SOS fuera de Quick Actions |
| `more_settings_frontend_fragment` | Sí | Medio | Define Finance, Inventory, FamilyCloud y Settings en More |
| `finance_demo_fragment` | Parcial | Medio | Define capacidades/prohibiciones de Geni en Finance |
| `inventory_demo_fragment` | Parcial | Bajo | Solo menciona Inventory y medicamentos/vencimientos desde comprensión |
| `assets_demo_fragment` | Parcial | Bajo | Solo aparece como dominio autorizado |
| `familycloud_demo_fragment` | Sí | Medio | Define documentos, recuerdos, confirmación y herencia desde Calendar |
| `presence_demo_fragment` | Sí | Medio | Define presencia procesada, retrasos, permisos, no GPS crudo |
| `geni_demo_fragment` | Sí | Alto | Documento central para Geni demo |
| `mock_data_fragment` | Sí | Medio | Trae frases y ejemplos útiles de tareas, eventos, documentos, memorias |
| `ux_states_fragment` | Sí | Medio/Alto | Trae escalamiento, umbrales, permisos, silencios, alertas |
| `frontend_services_fragment` | Parcial | Bajo | No hay endpoints, pero sí acciones conceptuales y datos contextuales |

---

## **28\. Conclusión operativa**

Este documento debe usarse en la futura `frontend_premium_mvp_spec.md` como fuente principal para:

* navegación global;  
* reglas de Home;  
* Quick Actions;  
* Geni demo;  
* tono de mensajes;  
* restricciones de IA;  
* permisos visibles;  
* relación Home ↔ Planner;  
* relación Planner ↔ Geni;  
* relación More ↔ módulos especializados;  
* estados de alerta por tareas/eventos;  
* patrones de briefing;  
* copy neutral;  
* límites de automatización.

Debe entrar como **REAL MVP**:

* Bottom Nav: Home, People, \+, Planner, More.  
* Home inicial no modificable.  
* Home resume y redirige.  
* Planner como tab principal.  
* More como hogar de módulos especializados.  
* Geni sin tab propio.  
* Permisos aplicados a visibilidad.  
* No completar tareas automáticamente.  
* No reasignar tareas automáticamente.  
* No modificar eventos sin aprobación.

Debe entrar como **DEMO PREMIUM / MOCK**:

* Briefing.  
* Geni inline.  
* Pantalla de Geni vía Quick Actions.  
* Carga familiar.  
* Alertas de tareas atrasadas.  
* Sugerencias de redistribución.  
* Conflictos de eventos.  
* Búsqueda global visual.  
* Notificaciones contextuales.  
* Módulos de More visuales.

Debe quedar **POST\_MVP**:

* IA real.  
* Automatizaciones reales.  
* Memoria real.  
* Search global real.  
* GPS real.  
* Offline sync.  
* Auditoría completa.  
* Multi-hogar avanzado.  
* Escalamiento automático completo.  
* Push notifications reales.  
* FamilyCloud real avanzado.  
* Finance/Inventory/Assets reales completos.

No debe usarse este documento para definir:

* formularios exactos;  
* endpoints;  
* requests/responses;  
* diseño visual final;  
* design tokens;  
* layouts específicos;  
* auth/onboarding;  
* invitaciones;  
* implementación técnica.

---

# **SOURCE 08 — DATA / INFORMATION PHILOSOPHY**

## **Archivo recomendado**

`Seccion 8 Filosofia de la Informacion.txt`

## **Tipo de documento**

Filosofía de información / datos

## **Uso para frontend**

Extraer:

* qué información mostrar;  
* qué ocultar;  
* estados de confianza;  
* privacidad;  
* data real vs mock;  
* reglas para resúmenes;  
* reglas de Home, Planner, Activity y Geni.

## **Contenido extraído**

# **frontend\_global\_fragment\_data\_philosophy**

## **1\. Fuente**

* Documento: `HomePlus — SECCION 8 DATA PHILOSOPHY.md`  
* Archivo de comprensión asociado: `Seccion 8 Filosofia de la Informacion.txt`  
* Source map previo disponible en este chat: `source_map_SECCION_8_DATA_PHILOSOPHY.md`  
* Tipo de documento: Data philosophy / filosofía de información / privacidad / retención / clasificación de datos / trazabilidad.  
* Alcance del documento: Define cómo HomePlus clasifica, protege, conserva, elimina, exporta y muestra datos sensibles, personales, de coordinación y de auditoría.  
* Utilidad para frontend global premium: Media.  
* Motivo: No contiene diseño visual detallado ni pantallas completas, pero sí define reglas frontend importantes para confianza, privacidad, visibilidad, permisos, Home, Planner, Settings, More, auditoría, exportación, estados de eliminación y separación entre datos reales, mock y futuros.

---

## **2\. Utilidad frontend del documento**

Este documento aporta lineamientos transversales para que el frontend de HomePlus se sienta:

* confiable;  
* privado;  
* seguro;  
* claro;  
* transparente;  
* familiar;  
* no invasivo;  
* respetuoso de roles y visibilidad;  
* coherente con datos sensibles del hogar.

Aporta especialmente a:

* `Home`: como resumen de tareas, eventos, carga familiar, presence y briefing.  
* `Planner`: tareas, eventos, calendario, historial, papelera y visibilidad personal/familiar.  
* `People / Members / Roles`: visibilidad por rol y datos mínimos de niños.  
* `More / Settings`: privacidad, inventario de datos, auditoría, exportación y configuración.  
* `Geni demo`: briefing, contexto, datos usados y límites de privacidad.  
* `Presence demo`: ubicación visible por niveles y sin GPS real para MVP.  
* `Frontend services`: separación por hogar, RLS, permisos, datos visibles por miembro.  
* `Estados UX`: completado, cancelado, eliminado, papelera, privado, compartido, visible, sensible, exportable.

---

## **3\. Información de producto aplicable al frontend**

### **Principios aplicables**

#### **Ownership**

* La familia es dueña de sus datos.  
* HomePlus administra los datos, no los posee.  
* El frontend debe transmitir control, no dependencia.  
* El usuario debe poder ver sus datos.  
* El usuario debe saber qué datos existen.  
* Clasificación: REAL MVP / transversal.

Aplicación frontend:

* Mostrar datos del hogar como información de la familia, no como información “de la app”.  
* Evitar ocultar datos importantes detrás de configuraciones profundas.  
* En Settings / Privacidad / Mis Datos, el documento habilita la idea de un inventario visible de datos.  
* En Planner, tareas y eventos deben sentirse recuperables, entendibles y trazables.

#### **Portabilidad**

* Ningún dato del hogar queda atrapado en HomePlus.  
* El usuario puede exportar datos en formatos estándar.  
* El archivo exportado queda disponible 7 días según el archivo de comprensión.  
* Clasificación: POST\_MVP para implementación completa; puede influir visualmente en Settings demo.

Aplicación frontend:

* Settings puede mostrar una opción de exportación como DEMO PREMIUM o POST\_MVP.  
* No convertir exportación completa en MVP real desde este documento.

#### **Minimización**

* HomePlus guarda solo lo necesario para coordinar.  
* Tareas, eventos y gastos sí se guardan porque son núcleo de coordinación.  
* Conversaciones literales con Geni no se guardan; solo temas y decisiones extraídas.  
* Fotos en crudo para IA no se guardan; solo metadatos clasificados localmente.  
* Contraseñas, tokens, claves y datos biométricos no se almacenan.  
* Clasificación: REAL MVP como principio de UX; POST\_MVP en controles avanzados.

Aplicación frontend:

* Formularios deben ser livianos.  
* No pedir datos innecesarios.  
* Crear tarea/evento debería priorizar campos mínimos.  
* Las pantallas no deberían exponer metadata avanzada como si fuera obligatoria.  
* Geni demo no debe sugerir que guarda conversaciones completas para siempre.

#### **Transparencia**

* El usuario debe saber qué se guarda y por qué.  
* Mecanismos mencionados:  
  * Inventario de datos.  
  * Indicador de contexto.  
  * Log de accesos a datos.  
  * Notificación de nuevos usos.  
  * Consulta directa a Geni.  
* Clasificación: DEMO PREMIUM / POST\_MVP según profundidad.

Aplicación frontend:

* Mostrar contexto cuando un resumen usa datos del usuario.  
* En Briefing mock, se puede indicar que el resumen surge de tareas/eventos.  
* En Settings, pueden existir accesos visuales a “Mis Datos” y “Privacidad”.  
* No implementar log real completo en MVP.

#### **Trazabilidad**

* Las acciones importantes dejan huella.  
* Crear, modificar, eliminar, compartir y exportar generan registro de auditoría.  
* Clasificación: REAL MVP como principio; auditoría completa POST\_MVP.

Aplicación frontend:

* Acciones importantes deben tener feedback claro.  
* Eliminar tarea/evento debe explicar papelera.  
* Cambios guardados deben mostrar confirmación.  
* Auditoría cruda no debe mostrarse a miembros.

#### **Privacidad por defecto**

* Cada dato nace con nivel de visibilidad predefinido.  
* El usuario puede abrir visibilidad; el sistema no debe abrirla automáticamente.  
* Clasificación: REAL MVP / transversal.

Aplicación frontend:

* Distinguir datos personales vs datos del hogar.  
* No mostrar datos personales en Home familiar sin permiso.  
* Mostrar badges/chips de visibilidad cuando ayude.  
* Ocultar información sensible según rol y permisos.

#### **Coordinación familiar**

* Tareas, eventos, gastos compartidos, listas y recordatorios son datos de coordinación.  
* Deben ser visibles para quien necesita coordinar.  
* Clasificación: REAL MVP.

Aplicación frontend:

* Home debe mostrar coordinación diaria.  
* Planner debe administrar tareas/eventos.  
* Members debe servir para asignación y visibilidad.  
* Settings debe permitir comprender quién ve qué.

---

## **4\. Navegación y arquitectura de pantallas**

### **Navegación explícita detectada**

Desde el archivo de comprensión asociado:

* Bottom Nav: `[Home] [People] [+] [Planner] [More]`.  
* QuickActions: botón central `+`.  
* Home: centro operativo.  
* People: sección de miembros/personas.  
* Planner: tab principal.  
* More: herramientas especializadas.  
* Settings: dentro de More.  
* Profile / PerfilPersona: pantalla dentro de People.  
* Configuración IA: pantalla de Geni.  
* SelectorMultiHogar: header con avatar \+ nombre de hogar activo si el usuario pertenece a 2+ hogares.  
* Clasificación: REAL MVP para estructura principal; POST\_MVP para multi-hogar avanzado.

### **Reglas de navegación detectadas**

* Home resume, no administra.  
* Los módulos administran.  
* Más de 4 niveles de navegación es fallo.  
* Objetivo: 95% de acciones a 3 niveles o menos.  
* QuickActions se usa para acciones frecuentes.  
* Settings vive en More.  
* More agrupa herramientas especializadas.  
* Clasificación: REAL MVP / UX global.

### **Navegación aplicable al MVP**

* Auth / Onboarding lleva a Home o creación/unión a hogar según estado del usuario.  
* Home debe abrir detalles en módulos, no resolver toda la administración.  
* Planner es acceso directo desde Bottom Nav.  
* People es acceso directo desde Bottom Nav.  
* More concentra módulos demo/premium secundarios.  
* QuickActions debe estar siempre accesible desde navegación principal.

### **Navegación POST\_MVP**

* Selector multi-hogar avanzado.  
* Navegación por múltiples hogares activos.  
* Configuración avanzada de privacidad/auditoría/exportación.  
* Geni Search global.  
* Automatizaciones.

---

## **5\. Pantallas detectadas**

| Pantalla | Objetivo | Qué muestra | Acciones | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo del hogar | Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, Tareas, Finanzas Relevantes, Presence Resumido, Actividad Familiar | Ver resumen, navegar a módulos | REAL MVP \+ DEMO PREMIUM \+ MOCK |
| People | Sección de miembros/personas | Miembros, roles, presencia visual si aplica | Ver miembro, entrar a perfil | REAL MVP parcial |
| PerfilPersona | Ver información de una persona | Resumen, Tareas, Eventos, Goals, Presence, Actividad, Responsabilidades | Navegar por pestañas/secciones | DEMO PREMIUM / POST\_MVP parcial |
| Planner | Administrar coordinación temporal | Tasks, Calendar, Events, Goals futuro | Crear/editar/completar/ver tareas/eventos si otra fuente lo define | REAL MVP parcial |
| More | Herramientas especializadas | Finance, Inventory, FamilyCloud, Settings, módulos secundarios | Abrir herramientas | DEMO PREMIUM |
| Settings | Configuración de hogar/cuenta/sistema | Hogar, miembros, roles, responsabilidades, permisos, integraciones, cuenta, seguridad, privacidad, notificaciones, offline, multi-hogar, auditoría | Configurar / abrir opciones | DEMO PREMIUM / POST\_MVP |
| Configuración → Mis Datos | Transparencia de datos | Inventario de categorías de datos almacenados con contadores | Ver datos existentes | DEMO PREMIUM / POST\_MVP |
| Configuración → Privacidad | Privacidad y accesos | Log de accesos a datos | Revisar accesos | POST\_MVP |
| Chat con Geni | Consulta directa de datos | Respuesta a “qué datos guardás sobre mí” | Preguntar a Geni | DEMO PREMIUM / POST\_MVP |
| QuickActions panel | Acciones rápidas | Geni primero \+ acciones dinámicas | Ejecutar acción frecuente | REAL MVP \+ DEMO PREMIUM |
| More / Finance | Herramienta financiera | Gastos, cuentas, presupuestos, fondos, deudas si se usa como demo | Ver módulo | DEMO PREMIUM |
| More / Inventory | Herramienta de inventario | Consumibles, productos, medicamentos, stock | Ver módulo | DEMO PREMIUM |
| More / Assets | Activos del hogar | Vehículos, mascotas, dispositivos, propiedades, mantenimiento | Ver módulo | DEMO PREMIUM |
| FamilyCloud / HomeCloud | Memorias/documentos | Recuerdos, álbumes, documentos | Ver/subir mock | DEMO PREMIUM / POST\_MVP |
| Presence | Estado/ubicación familiar | Ubicación resumida, estados, lugares, check-ins | Ver/cambiar estado mock | MOCK / DEMO PREMIUM |
| Geni | Capa de inteligencia | Briefing, búsqueda, sugerencias, acciones | Preguntar/ver sugerencias | DEMO PREMIUM |
| Automations | Automatizaciones | Trigger → condiciones → acciones | Ver/activar mock | DEMO PREMIUM / POST\_MVP |
| Feed | Espacio social del hogar | Posts, comentarios, reacciones | Ver social activity | DEMO PREMIUM / IGNORAR como real |
| SOS | Emergencias | Panel con niveles de alerta | Activar alerta visual | DEMO PREMIUM / IGNORAR como real |

---

## **6\. Componentes y patrones UI reutilizables**

### **Componentes explícitos o derivados directamente**

* Bottom Nav.  
* Botón central `+`.  
* Panel flotante de QuickActions.  
* Cards de Home.  
* Cards de módulos en More.  
* Widgets de resumen.  
* Indicadores de estado.  
* Inventario de datos con contadores.  
* Log de accesos.  
* Notificaciones push \+ email para nuevos usos.  
* Badges/chips de visibilidad.  
* Role pills.  
* Status pills.  
* Activity items.  
* Métricas de carga.  
* Listas de tareas/eventos.  
* Calendario.  
* Secciones de Settings.  
* Selector de hogar activo.  
* Avatares en header o miembros.  
* Pantallas por pestañas dentro de PerfilPersona.  
* Cards con indicadores de estado en More.

### **Patrones reutilizables por clasificación**

#### **REAL MVP**

* Bottom Nav.  
* Home summary.  
* Planner tab.  
* People tab.  
* More tab.  
* QuickActions básico.  
* Tareas y eventos visibles en Home/Planner.  
* Miembros con rol/estado.  
* Badges de estado y rol.  
* Estados de pending/completed/cancelled/deleted si aplican al módulo.

#### **DEMO PREMIUM**

* Cards de Finance.  
* Cards de Inventory.  
* Cards de Assets.  
* Cards de FamilyCloud.  
* Presence resumido.  
* Briefing visual.  
* Carga Familiar.  
* Actividad Familiar.  
* Settings avanzado.  
* Inventario de datos.  
* Exportación visual.  
* Geni Search visual.  
* Automatizaciones visuales.

#### **MOCK**

* Briefing fijo o simple.  
* Presence con datos dummy.  
* Actividad Familiar fake.  
* Carga Familiar con métricas dummy.  
* Finanzas relevantes con datos dummy.  
* Cards de módulos secundarios con indicadores fake.

#### **POST\_MVP**

* Log real de accesos.  
* Auditoría completa.  
* Exportación completa.  
* Offline sync.  
* Multi-hogar avanzado.  
* IA real.  
* Automatizaciones reales.  
* Push/email reales.  
* OCR/storage avanzado.

---

## **7\. Visual design aplicable**

No se encontró un sistema visual explícito con colores, tipografías, radios, sombras, gradientes, blur, glassmorphism, estilo iOS o design tokens en este documento.

Sí se detectan lineamientos de sensación y experiencia:

* Debe sentirse seguro.  
* Debe sentirse transparente.  
* Debe sentirse confiable.  
* Debe evitar vigilancia.  
* Debe evitar oscuridad o ambigüedad sobre los datos.  
* Debe ser claro sobre qué se guarda.  
* Debe ser claro sobre quién ve qué.  
* Debe ser claro sobre qué pasa al eliminar.  
* Debe separar información familiar, personal, sensible y auditoría.  
* Debe proteger datos de niños.  
* Debe evitar exponer logs crudos a miembros.

Aplicación visual:

* Usar jerarquía clara para datos sensibles.  
* Usar indicadores de privacidad.  
* Usar estados visuales diferenciados para:  
  * privado;  
  * compartido;  
  * hogar;  
  * sensible;  
  * eliminado;  
  * histórico;  
  * pendiente;  
  * cancelado;  
  * completado.  
* Usar copy claro y no alarmista.  
* No convertir privacidad en una pantalla intimidante.  
* Settings debe ser entendible para usuarios no técnicos.

---

## **8\. Home**

### **Rol de Home**

* Home es el centro operativo.  
* Home resume, no administra.  
* Home muestra bloques relevantes del hogar.  
* Home conecta con módulos especializados.  
* Clasificación: REAL MVP \+ DEMO PREMIUM \+ MOCK.

### **Bloques detectados**

Desde archivo de comprensión:

* Briefing.  
* Atención Requerida.  
* Carga Familiar.  
* Próximos Eventos.  
* Tareas.  
* Finanzas Relevantes.  
* Presence Resumido.  
* Actividad Familiar.

### **Home REAL MVP**

Debe poder mostrar, si existe en datos reales del MVP:

* Tareas pendientes.  
* Próximos eventos.  
* Miembros básicos.  
* Aprobaciones pendientes si aplica.  
* Invitaciones o solicitudes si aplica.  
* Resumen del hogar con datos reales mínimos.

### **Home MOCK / DEMO PREMIUM**

Puede simular:

* Briefing.  
* Carga Familiar.  
* Presence Resumido.  
* Actividad Familiar.  
* Finanzas Relevantes.  
* Alertas avanzadas.  
* Métricas de carga.  
* Sugerencias de Geni.  
* Módulos secundarios.

### **Home y privacidad**

* No debe mostrar datos personales privados sin permiso.  
* Tareas personales son visibles solo para el dueño salvo que se compartan.  
* Eventos personales son visibles solo para el dueño salvo que se compartan.  
* Datos sensibles deben mostrarse con acceso mínimo.  
* Métricas de carga son visibles solo para Coordinador según clasificación del documento.  
* Log de patrones de Geni no es visible ni para Coordinador.

### **Home y Planner**

* Home puede mostrar tareas.  
* Home puede mostrar próximos eventos.  
* Atención Requerida puede mostrar tareas vencidas o eventos/vencimientos críticos.  
* Home debe navegar a Planner para administrar.

### **Home y Geni**

* Briefing es primer widget de Home.  
* Briefing resume eventos, tareas, finanzas, presence, goals y alertas.  
* Para MVP actual, Geni real no debe implementarse desde este documento.  
* Briefing puede ser mock o generado con datos simples.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner general**

* Hogar contiene Planner.  
* Planner contiene Task.  
* Planner contiene Calendar.  
* Planner se accede desde Bottom Nav.  
* Planner administra; Home resume.

### **Tasks**

#### **Información encontrada**

* Task representa trabajo pendiente o realizado.  
* Tareas del hogar son datos de coordinación.  
* Tareas personales son datos personales.  
* Tareas del hogar son visibles por defecto para todos los miembros.  
* Tareas personales son visibles solo para el dueño.  
* Tareas personales pueden compartirse con miembros específicos o todo el hogar.  
* Tareas activas se guardan mientras el hogar existe.  
* Tareas activas no expiran.  
* Tareas completadas se guardan como historial permanente.  
* Tareas eliminadas van a papelera 30 días.  
* Luego de 30 días, las tareas eliminadas se eliminan definitivamente.  
* Cualquier miembro puede eliminar sus propias tareas.  
* El Coordinador puede eliminar cualquier tarea.  
* Las tareas eliminadas son recuperables por dueño o Coordinador durante 30 días.  
* Las tareas completadas no se archivan: completada \= histórico.  
* Las tareas eliminadas no se archivan: eliminada \= papelera 30 días → borrado.  
* Vencida es calculada según archivo de comprensión.  
* Task referencia Persona.  
* Task referencia Responsabilidad.  
* Task puede requerir Verificación según archivo de comprensión.  
* PlantillaTarea genera Task.  
* Racha deriva de Task.  
* Auditoría registra Task.  
* Exportación puede exportar Task.  
* Notificación puede referenciar Task.

#### **Estados encontrados**

* Pendiente.  
* En progreso.  
* Completada.  
* Cancelada.  
* Vencida calculada.  
* Eliminada / en papelera.  
* Histórica.  
* Personal.  
* Hogar / coordinación.

#### **Responsabilidades**

* Responsabilidad agrupa áreas operativas.  
* Ejemplos:  
  * Compras.  
  * Mascotas.  
  * Limpieza.  
  * Vehículos.  
* Task referencia Responsabilidad.

#### **POST\_MVP para Tasks**

* Subtareas.  
* Dependencias.  
* Recurrencia avanzada.  
* Verificación si excede MVP.  
* Rachas.  
* Goals vinculados.  
* Exportación.  
* Auditoría completa.  
* Adjuntos/documentos.  
* Automatizaciones que crean tareas.  
* Métricas avanzadas.  
* Notificaciones reales.

#### **Riesgos**

* Estados del documento/comprensión no coinciden exactamente con los estados MVP esperados en otros prompts:  
  * Documento: Pendiente, En progreso, Completada, Cancelada.  
  * MVP esperado: pending, completed, awaiting\_verification, verified.  
* El documento no define card de tarea.  
* No define formulario de tarea.  
* No define prioridad.  
* No define fecha límite.  
* No define filtros.  
* No define tabs.  
* No define UX de verificación.

### **Events / Calendar**

#### **Información encontrada**

* Calendar administra eventos familiares y personales.  
* Event pertenece a Calendar.  
* Event referencia Persona.  
* Eventos del hogar son datos de coordinación.  
* Eventos personales son datos personales.  
* Eventos del hogar son visibles por defecto.  
* Eventos personales son visibles solo para el dueño.  
* Eventos personales pueden compartirse.  
* Eventos futuros se guardan indefinidamente mientras el hogar existe.  
* Eventos pasados se guardan como historial permanente.  
* Eventos eliminados van a papelera 30 días.  
* Luego se eliminan definitivamente.  
* El creador o Coordinador puede eliminar eventos.  
* Eventos recurrentes, al eliminar, permiten elegir:  
  * este evento;  
  * toda la serie.  
* Si se elimina toda la serie:  
  * eventos futuros van a papelera 30 días;  
  * eventos pasados se preservan como historial.  
* Eventos cancelados no deberían contaminar el calendario.  
* Event tiene estados:  
  * Programado.  
  * Completado.  
  * Cancelado.  
* No existe Postergado según archivo de comprensión.  
* Auditoría registra Event.  
* Exportación puede exportar Event.  
* Notificación puede referenciar Event.  
* Briefing referencia Event.  
* Home muestra Próximos Eventos.

#### **POST\_MVP para Calendar / Events**

* Participantes avanzados.  
* Respuestas accepted/declined/maybe.  
* Exportación iCalendar.  
* Recurrencia compleja.  
* Auditoría completa.  
* Automatizaciones.  
* Presence real.  
* Integración avanzada con FamilyCloud.

#### **Riesgos**

* No define vistas día/semana/mes.  
* No define agenda.  
* No define campos de evento.  
* No define creación rápida de evento.  
* No define edición/cancelación visual.  
* No define tareas con fecha en calendario.  
* No define UI de calendario.

### **Goals**

* Goal es objetivo personal o familiar.  
* Estructura: Goal → Hitos → Tasks.  
* Estados: Activa, Completada, Fallida.  
* Logros están integrados en Goals.  
* Goals queda como POST\_MVP o DEMO PREMIUM visual.  
* No convertir Goals en MVP real desde este documento.

---

## **10\. People / Members / Roles**

### **Entidades y roles detectados**

* Persona.  
* Cuenta.  
* Hogar.  
* Membresía.  
* RelacionesFamiliares.  
* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* AdultoMayor.  
* Invitado.  
* EmpleadoFamiliar.

### **Información aplicable a frontend**

* Persona pertenece a una cuenta.  
* Persona participa en uno o más hogares.  
* Membresía relaciona Persona y Hogar.  
* Membresía contiene estado y rol.  
* Hogar contiene Persona.  
* Cuenta posee Persona.  
* Persona tiene rol.  
* RelacionesFamiliares son informativas y no modifican permisos.

### **Roles y traducción visual**

* Coordinador → Coordinator.  
* Adulto → Adult.  
* Adolescente → Adolescent.  
* Niño → Child.  
* AdultoMayor → Senior.  
* Invitado → Guest.  
* EmpleadoFamiliar → fuera de MVP salvo demo/futuro.

### **Estados de membresía**

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.

### **Datos mínimos de niños**

* El documento/archivo de comprensión indica que los datos de niños deben ser mínimos:  
  * nombre;  
  * avatar;  
  * tareas asignadas;  
  * rachas.  
* Clasificación: REAL MVP como principio de privacidad; rachas POST\_MVP.

### **Permisos/visibilidad relevantes**

* Coordinador puede eliminar cualquier tarea.  
* Cualquier miembro puede eliminar sus propias tareas.  
* Creador o Coordinador puede eliminar eventos.  
* Métricas de carga visibles solo para Coordinador.  
* Historial de ubicación visible solo para dueño \+ Coordinador.  
* Documentos de identidad visibles solo para dueño \+ Coordinador.  
* Datos de salud/medicación visibles para dueño \+ cuidadores designados \+ Coordinador.  
* Conversaciones con Geni visibles solo para el miembro.  
* Log de patrones de Geni visible solo para Geni.  
* Registro de auditoría visible solo para HomePlus / sistema.  
* Empleado Familiar no puede crear tareas según archivo de comprensión.  
* Clasificación: REAL MVP parcial / POST\_MVP para permisos finos.

### **Relación con Planner**

* Task referencia Persona.  
* Event referencia Persona.  
* Responsabilidad puede tener Persona.  
* PerfilPersona muestra Tareas, Eventos, Goals, Presence, Actividad y Responsabilidades.  
* Members sirven para asignación de tareas/eventos si otra fuente define UI.

### **Relación con Home**

* Home puede mostrar miembros o actividad.  
* Presence Resumido puede mostrar estados de personas como DEMO/MOCK.  
* Carga Familiar puede mostrar distribución de tareas por miembro como MOCK/DEMO.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

* Hogar es unidad organizativa principal.  
* Todo ocurre dentro de un hogar.  
* Hogar contiene personas, Planner y otros módulos.  
* Los datos no se cruzan entre hogares.  
* Cada hogar funciona como una bóveda aislada.  
* RLS filtra a nivel de base de datos.  
* Clasificación: REAL MVP.

### **Membership**

* Membresía relaciona Persona y Hogar.  
* Estados:  
  * Pendiente.  
  * Activa.  
  * Suspendida.  
  * Finalizada.  
* Clasificación: REAL MVP.

### **Invitations**

* Invitación aparece como flujo:  
  * Invitación.  
  * Aceptación.  
  * Aprobación.  
  * Ingreso al hogar.  
* Clasificación: REAL MVP.  
* El documento no define UI de invitación, formulario, link, código, token, errores o pantallas.

### **Onboarding**

No se encontró información específica de onboarding por rol en este documento, salvo que roles existen y que la privacidad/visibilidad depende de rol, membresía y clasificación del dato.

### **Configuración básica del hogar**

Desde Settings:

* Settings incluye:  
  * Hogar;  
  * Miembros;  
  * Roles;  
  * Responsabilidades;  
  * Permisos;  
  * Integraciones.  
* Clasificación: DEMO PREMIUM / REAL parcial según alcance.

### **Falta**

* Crear hogar.  
* Formulario de crear hogar.  
* Invitar miembro.  
* Aceptar invitación.  
* Pending approval UI.  
* Aprobar/rechazar.  
* Errores visibles.  
* Copy de onboarding.  
* Navegación post-login.

---

## **12\. More / Settings / Profile**

### **More**

* More es pantalla de herramientas especializadas.  
* More contiene cards con indicadores de estado.  
* Herramientas mencionadas:  
  * Finance.  
  * Inventory.  
  * FamilyCloud.  
  * Settings.  
* Clasificación: DEMO PREMIUM.

### **Settings**

Settings contiene:

#### **Hogar**

* Miembros.  
* Roles.  
* Responsabilidades.  
* Permisos.  
* Integraciones.

#### **Cuenta**

* Perfil.  
* Seguridad.  
* Privacidad.

#### **Sistema**

* Notificaciones.  
* Offline.  
* Multi-Hogar.  
* Auditoría.

Clasificación:

* Perfil, privacidad y configuración básica: DEMO PREMIUM / REAL parcial.  
* Auditoría, offline, multi-hogar avanzado: POST\_MVP.  
* Notificaciones reales: POST\_MVP.  
* Visual de Settings: DEMO PREMIUM.

### **Configuración → Mis Datos**

* Inventario de datos.  
* Lista completa de categorías de datos almacenados.  
* Contadores.  
* Clasificación: DEMO PREMIUM / POST\_MVP.

### **Configuración → Privacidad**

* Log de accesos a datos.  
* Qué miembro o proceso accedió a qué dato, cuándo y desde dónde.  
* Clasificación: POST\_MVP.

### **Profile / PerfilPersona**

* Pantalla o pestaña dentro de People.  
* Muestra:  
  * Resumen.  
  * Tareas.  
  * Eventos.  
  * Goals.  
  * Presence.  
  * Actividad.  
  * Responsabilidades.  
* Clasificación: DEMO PREMIUM / REAL parcial para miembros básicos.

---

## **13\. Quick Actions**

### **Información encontrada**

* QuickActions es botón `+` en Bottom Nav.  
* Abre panel flotante.  
* Geni fijo siempre primero.  
* Acciones dinámicas.  
* Aprendizaje por frecuencia.  
* Registra frecuencia de creación de tareas para reordenar según archivo de comprensión.  
* QuickActions puede abrir formulario modal de creación según archivo de comprensión.

### **Clasificación de Quick Actions**

| Acción / elemento | Clasificación | Nota |
| ----- | ----- | ----- |
| Botón central `+` | REAL MVP | Estructura central de navegación |
| Panel flotante | REAL MVP / DEMO PREMIUM | Se puede usar para acciones rápidas |
| Geni primero | DEMO PREMIUM | No implementar IA real |
| Acciones dinámicas | DEMO PREMIUM / POST\_MVP | Puede simularse visualmente |
| Aprendizaje por frecuencia | POST\_MVP | No implementar real |
| Crear tarea | REAL MVP si otra fuente lo define | Este documento no lo lista explícitamente como acción |
| Crear evento | REAL MVP si otra fuente lo define | Este documento no lo lista explícitamente como acción |
| Agregar gasto | DEMO PREMIUM | Finance demo |
| Agregar item | DEMO PREMIUM | Inventory demo |
| Check-in | DEMO PREMIUM / MOCK | Presence demo |
| SOS | DEMO PREMIUM / IGNORAR como real | No implementar emergencia real |
| Subir documento | DEMO PREMIUM / POST\_MVP | FamilyCloud/storage real fuera |
| Preguntar a Geni | DEMO PREMIUM | IA real fuera |

---

## **14\. Módulos demo premium**

### **Finance demo**

Información encontrada:

* Finance contiene:  
  * CuentaFinanciera.  
  * Gasto.  
  * Ingreso.  
  * Fondo.  
  * Presupuesto.  
  * Deuda.  
  * Comprobante.  
  * AjusteManual.  
* Home puede mostrar Finanzas Relevantes.  
* Briefing puede referenciar gastos, presupuesto y finanzas.  
* Clasificación: DEMO PREMIUM.  
* No implementar Finance backend real desde este documento.

Datos visuales posibles extraídos:

* Tipos de cuenta: Efectivo, Mercado Pago, Banco, Tarjeta.  
* Tipos de ingreso: Sueldo, Regalo, Venta, Reembolso.  
* Fondo: Activo, Completado, Cerrado.  
* Deuda: Activa, Pagada, Vencida.  
* Comprobante: foto, PDF, imagen.  
* Presupuesto: alertas y recomendaciones de Geni al aproximarse.

### **Inventory demo**

Información encontrada:

* Inventory contiene:  
  * Consumible.  
  * ProductoHogar.  
  * Medicamento.  
* Campos de consumible:  
  * nombre;  
  * categoría;  
  * cantidad;  
  * unidad;  
  * stock mínimo.  
* Estados:  
  * Activo;  
  * Archivado.  
* ProductoHogar ejemplos:  
  * shampoo;  
  * jabón;  
  * papel higiénico;  
  * detergente;  
  * lavandina.  
* Medicamento campos:  
  * nombre;  
  * stock;  
  * vencimiento;  
  * observaciones.  
* Inventory puede relacionarse con tareas vía sugerencias/automatización.  
* Clasificación: DEMO PREMIUM.  
* No implementar Inventory real desde este documento.

### **Assets demo**

Información encontrada:

* Assets contiene:  
  * Vehículo;  
  * Mascota;  
  * Dispositivo;  
  * Propiedad;  
  * Mantenimiento.  
* Vehículo campos:  
  * marca;  
  * modelo;  
  * año;  
  * patente.  
* Vehículo documentos:  
  * seguro;  
  * cédula;  
  * título;  
  * VTV.  
* Mascota campos:  
  * nombre;  
  * especie;  
  * raza;  
  * fecha de nacimiento.  
* Mascota información médica:  
  * veterinario;  
  * vacunas.  
* Mascota estados:  
  * Activa;  
  * Fallecida;  
  * Archivada.  
* Dispositivo ejemplos:  
  * notebook;  
  * PC;  
  * tablet;  
  * celular;  
  * consola.  
* Propiedad ejemplos:  
  * casa;  
  * departamento;  
  * terreno.  
* Mantenimiento puede generar tareas automáticamente vía Planner.  
* Clasificación: DEMO PREMIUM / POST\_MVP para generación real de tareas.

### **FamilyCloud / HomeCloud demo**

Información encontrada:

* Recuerdo.  
* Álbum.  
* Documento.  
* Papelera.  
* VersionDocumento.  
* AlbumAutomaticoCalendar.  
* ReconocimientoFacial futuro.  
* FamilyHubRecap futuro.  
* LíneaTemporalFamiliar futuro.  
* Documento soporta:  
  * PDF;  
  * imagen;  
  * documento escaneado.  
* Documento puede ser familiar o privado.  
* Documento soporta versionado, comentarios, OCR según archivo de comprensión.  
* Papelera 30 días.  
* Clasificación: DEMO PREMIUM para visual; POST\_MVP para storage/OCR/comentarios reales.

### **Presence demo**

Información encontrada:

* Ubicación.  
* HistorialUbicacion.  
* EstadoPresence.  
* Lugar.  
* Geocerca.  
* CheckIn.  
* Ubicación en tiempo real es sensible.  
* Ubicación en tiempo real puede mostrarse por niveles.  
* Historial de ubicación retiene 30 días.  
* Estados automáticos:  
  * En casa;  
  * En trabajo;  
  * En escuela;  
  * En tránsito.  
* Estados manuales:  
  * No molestar;  
  * Descansando.  
* Lugares:  
  * Casa;  
  * Escuela;  
  * Trabajo;  
  * Club;  
  * Hospital;  
  * Gimnasio.  
* Check-in complementa GPS.  
* Clasificación: MOCK / DEMO PREMIUM.  
* No implementar GPS real, mapas reales ni geofencing real.

### **Geni demo**

Información encontrada:

* Geni es capa transversal, no módulo aislado.  
* Geni consulta, analiza, recomienda, coordina y automatiza.  
* Geni respeta permisos.  
* Geni hereda permisos del miembro.  
* Geni genera Briefing.  
* Geni Search busca en módulos.  
* Geni puede crear/sugerir tareas, memorias y automatizaciones.  
* Conversaciones con Geni son personales.  
* Conversaciones literales retienen 90 días.  
* Log de patrones visible solo para Geni.  
* Clasificación: DEMO PREMIUM.  
* IA real: POST\_MVP.

### **Feed demo**

Información encontrada:

* Feed es espacio social del hogar.  
* Post es unidad del Feed.  
* Posts pueden contener:  
  * texto;  
  * imagen;  
  * video;  
  * archivos;  
  * enlaces internos.  
* Comentarios y reacciones.  
* Orden cronológico.  
* Clasificación: DEMO PREMIUM / IGNORAR como real.

### **SOS demo**

Información encontrada:

* SOS es sistema de emergencias.  
* Swipe ↑ global.  
* Panel con 3 niveles:  
  * Emergencia grave.  
  * Necesito ayuda.  
  * Coordinación urgente.  
* SOS silencioso.  
* Escalado:  
  * Coordinador;  
  * Adultos;  
  * Personas relevantes.  
* SOS usa ubicación e historial.  
* Clasificación: DEMO PREMIUM visual / IGNORAR como emergencia real.

### **Automations demo**

Información encontrada:

* Automatización: Trigger → Condiciones → Acciones.  
* Estados:  
  * Activa;  
  * Pausada;  
  * Archivada.  
* Alcance hogar.  
* Auditoría de ejecución.  
* Acciones:  
  * crear tarea;  
  * crear recordatorio;  
  * enviar notificación;  
  * crear evento;  
  * actualizar meta;  
  * publicar en Feed.  
* Biblioteca de automatizaciones:  
  * Llegó a casa.  
  * Stock bajo.  
  * Pago próximo a vencer.  
  * Mantenimiento pendiente.  
  * Cumpleaños próximo.  
* Clasificación: DEMO PREMIUM / POST\_MVP real.

### **Goals demo**

Información encontrada:

* Goal personal o familiar.  
* Estructura Goal → Hitos → Tasks.  
* Estados:  
  * Activa;  
  * Completada;  
  * Fallida.  
* Clasificación: DEMO PREMIUM / POST\_MVP.

### **Notifications demo**

Información encontrada:

* Categorías:  
  * Planner;  
  * Calendar;  
  * Finance;  
  * Presence;  
  * Assets;  
  * Inventory;  
  * FamilyCloud;  
  * Feed;  
  * SOS.  
* Prioridades:  
  * Crítica;  
  * Alta;  
  * Media;  
  * Baja.  
* Canales:  
  * Push;  
  * Email;  
  * In-App.  
* Push se entrega y se descarta.  
* In-app retiene 30 días.  
* Clasificación: DEMO PREMIUM visual / POST\_MVP para push real.

### **Search demo**

Información encontrada:

* GeniSearch busca en:  
  * People;  
  * Planner;  
  * Finance;  
  * Presence;  
  * Inventory;  
  * Assets;  
  * FamilyCloud;  
  * Feed;  
  * Settings.  
* Ejecuta acciones.  
* Indexa Settings.  
* Clasificación: DEMO PREMIUM / POST\_MVP real.

### **Activity / Actividad Familiar**

* Home contiene Actividad Familiar.  
* Feed/Post/acciones auditadas pueden alimentar actividad, pero el documento no define UI exacta.  
* Clasificación: MOCK / DEMO PREMIUM.

### **Load / Carga Familiar**

* Home contiene Carga Familiar.  
* Métricas de carga: tareas por miembro.  
* 90 días de detalle diario.  
* Agregados mensuales permanentes.  
* Visibles solo para Coordinador.  
* Clasificación: MOCK / DEMO PREMIUM para MVP visual; real completo POST\_MVP.

---

## **15\. Estados UX y feedback**

### **Estados detectados directamente**

#### **Auth / Session**

No se encontró información específica de estados UX de Auth/Login/Refresh/Logout en este documento.

#### **Membership**

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.

#### **Invitation**

* Invitación.  
* Aceptación.  
* Aprobación.  
* Ingreso al hogar.

#### **Task**

* Pendiente.  
* En progreso.  
* Completada.  
* Cancelada.  
* Vencida calculada.  
* Activa.  
* Eliminada.  
* En papelera.  
* Histórica.

#### **Event**

* Programado.  
* Completado.  
* Cancelado.  
* Futuro.  
* Pasado.  
* Eliminado.  
* En papelera.  
* Recurrente.

#### **Finance**

* Fondo: Activo, Completado, Cerrado.  
* Deuda: Activa, Pagada, Vencida.

#### **Inventory**

* Consumible / ProductoHogar: Activo, Archivado.

#### **Assets**

* Mascota: Activa, Fallecida, Archivada.

#### **Presence**

* En casa.  
* En trabajo.  
* En escuela.  
* En tránsito.  
* No molestar.  
* Descansando.

#### **Automations**

* Activa.  
* Pausada.  
* Archivada.

#### **Notifications**

* Crítica.  
* Alta.  
* Media.  
* Baja.

#### **Privacy/Data**

* Personal.  
* Coordinación.  
* Sensible.  
* Auditoría.  
* Privado por defecto.  
* Compartido.  
* Visible por defecto.  
* Exportable.  
* Eliminación directa.  
* Papelera 30 días.  
* Permanente.  
* Inmutable.

### **Feedback aplicable**

* Eliminación de tareas/eventos/documentos/fotos/memorias: debe comunicar papelera 30 días cuando aplique.  
* Ubicación/conversaciones Geni: eliminación directa, sin papelera.  
* Auditoría: inmutable, no visible para miembros.  
* Datos personales: visibles solo para dueño salvo que se compartan.  
* Datos sensibles: acceso mínimo.  
* Exportación: archivo disponible 7 días.  
* Notificaciones in-app: 30 días.

### **No encontrado**

* Loading.  
* Skeleton.  
* Spinner.  
* Toast específico.  
* Retry.  
* Error de red.  
* Empty states escritos.  
* Optimistic update.  
* Realtime update visual.

---

## **16\. Formularios y datos de entrada**

No se encontraron formularios completos de frontend en este documento.

### **Formularios mencionados indirectamente o deducibles por pantalla, sin campos completos**

| Formulario / acción | Información encontrada | Clasificación |
| ----- | ----- | ----- |
| Crear tarea | Task existe, PlantillaTarea genera Task, QuickActions puede abrir modal de creación según comprensión | REAL MVP parcial, sin campos |
| Crear evento | Event existe, Calendar administra eventos | REAL MVP parcial, sin campos |
| Settings privacidad | Inventario de datos, log de accesos, exportación | DEMO PREMIUM / POST\_MVP |
| Exportar datos | Exportación por formatos; archivo disponible 7 días | POST\_MVP |
| Consulta a Geni | “qué datos guardás sobre mí” como mecanismo conceptual | DEMO PREMIUM |
| Check-in | CheckIn existe y complementa GPS | DEMO PREMIUM / MOCK |
| Automatización | Trigger → Condiciones → Acciones | POST\_MVP / DEMO |

### **Campos detectados por entidad demo**

#### **Consumible**

* nombre;  
* categoría;  
* cantidad;  
* unidad;  
* stock mínimo.

#### **Medicamento**

* nombre;  
* stock;  
* vencimiento;  
* observaciones.

#### **Vehículo**

* marca;  
* modelo;  
* año;  
* patente.

#### **Mascota**

* nombre;  
* especie;  
* raza;  
* fecha de nacimiento;  
* veterinario;  
* vacunas.

#### **Propiedad**

* dirección;  
* documentación;  
* observaciones.

No se encontró:

* login form;  
* register form;  
* forgot password form;  
* create household form;  
* invite member form;  
* join household form;  
* create task full form;  
* edit task form;  
* create event full form;  
* edit event form.

---

## **17\. Datos demo extraíbles**

| Dato / label | Módulo | Uso posible | Clasificación |
| ----- | ----- | ----- | ----- |
| Compras | Planner / Responsabilidades | Chip, filtro, categoría visual | REAL MVP / DEMO |
| Mascotas | Planner / Responsabilidades | Chip, filtro, categoría visual | REAL MVP / DEMO |
| Limpieza | Planner / Responsabilidades | Chip, filtro, categoría visual | REAL MVP / DEMO |
| Vehículos | Planner / Responsabilidades / Assets | Chip, filtro, categoría visual | DEMO PREMIUM |
| Coordinador | Roles | Role pill | REAL MVP |
| Adulto | Roles | Role pill | REAL MVP |
| Adolescente | Roles | Role pill | REAL MVP |
| Niño | Roles | Role pill | REAL MVP |
| AdultoMayor | Roles | Role pill | REAL MVP |
| Invitado | Roles | Role pill | REAL MVP |
| EmpleadoFamiliar | Roles | Role pill futuro | POST\_MVP |
| Pendiente | Membership / Task | Status pill | REAL MVP |
| Activa | Membership / Goal / Automation | Status pill | REAL MVP / DEMO |
| Suspendida | Membership | Status pill | REAL MVP / POST\_MVP |
| Finalizada | Membership | Status pill | REAL MVP / POST\_MVP |
| En progreso | Task | Status pill | REAL MVP parcial |
| Completada | Task / Goal | Status pill | REAL MVP |
| Cancelada | Task / Event | Status pill | REAL MVP |
| Programado | Event | Status pill | REAL MVP |
| Completado | Event / Fund | Status pill | REAL MVP / DEMO |
| Activo | Inventory / Fund | Status pill | DEMO PREMIUM |
| Archivado | Inventory / Automation | Status pill | DEMO PREMIUM |
| Fallecida | Mascota | Status pill | DEMO PREMIUM |
| Efectivo | Finance | Cuenta demo | DEMO PREMIUM |
| Mercado Pago | Finance | Cuenta demo | DEMO PREMIUM |
| Banco | Finance | Cuenta demo | DEMO PREMIUM |
| Tarjeta | Finance | Cuenta demo | DEMO PREMIUM |
| Sueldo | Finance | Tipo ingreso demo | DEMO PREMIUM |
| Regalo | Finance | Tipo ingreso demo | DEMO PREMIUM |
| Venta | Finance | Tipo ingreso demo | DEMO PREMIUM |
| Reembolso | Finance | Tipo ingreso demo | DEMO PREMIUM |
| Activa | Deuda | Status demo | DEMO PREMIUM |
| Pagada | Deuda | Status demo | DEMO PREMIUM |
| Vencida | Deuda / Task calculada | Badge alerta | DEMO / REAL según módulo |
| shampoo | Inventory | Producto demo | DEMO PREMIUM |
| jabón | Inventory | Producto demo | DEMO PREMIUM |
| papel higiénico | Inventory | Producto demo | DEMO PREMIUM |
| detergente | Inventory | Producto demo | DEMO PREMIUM |
| lavandina | Inventory | Producto demo | DEMO PREMIUM |
| Notebook | Assets | Dispositivo demo | DEMO PREMIUM |
| PC | Assets | Dispositivo demo | DEMO PREMIUM |
| tablet | Assets | Dispositivo demo | DEMO PREMIUM |
| celular | Assets | Dispositivo demo | DEMO PREMIUM |
| consola | Assets | Dispositivo demo | DEMO PREMIUM |
| Casa | Presence / Assets | Lugar / propiedad demo | DEMO PREMIUM |
| Escuela | Presence | Lugar demo | DEMO PREMIUM |
| Trabajo | Presence | Lugar demo | DEMO PREMIUM |
| Club | Presence | Lugar demo | DEMO PREMIUM |
| Hospital | Presence | Lugar demo | DEMO PREMIUM |
| Gimnasio | Presence | Lugar demo | DEMO PREMIUM |
| En casa | Presence | Estado visual | MOCK |
| En trabajo | Presence | Estado visual | MOCK |
| En escuela | Presence | Estado visual | MOCK |
| En tránsito | Presence | Estado visual | MOCK |
| No molestar | Presence | Estado visual manual | MOCK |
| Descansando | Presence | Estado visual manual | MOCK |
| Crítica | Notifications | Prioridad visual | DEMO PREMIUM |
| Alta | Notifications | Prioridad visual | DEMO PREMIUM |
| Media | Notifications | Prioridad visual | DEMO PREMIUM |
| Baja | Notifications | Prioridad visual | DEMO PREMIUM |
| Llegó a casa | Automations | Template demo | DEMO PREMIUM |
| Stock bajo | Automations / Inventory | Template demo | DEMO PREMIUM |
| Pago próximo a vencer | Automations / Finance | Template demo | DEMO PREMIUM |
| Mantenimiento pendiente | Automations / Assets | Template demo | DEMO PREMIUM |
| Cumpleaños próximo | Automations / Calendar | Template demo | DEMO PREMIUM |
| Emergencia grave | SOS | Nivel de alerta visual | DEMO PREMIUM |
| Necesito ayuda | SOS | Nivel de alerta visual | DEMO PREMIUM |
| Coordinación urgente | SOS | Nivel de alerta visual | DEMO PREMIUM |

### **Datos demo faltantes**

El documento no aporta:

* nombres de miembros concretos;  
* tareas concretas;  
* eventos concretos;  
* textos exactos de empty states;  
* mensajes de error;  
* textos de éxito;  
* ejemplos de briefing completos;  
* montos financieros concretos;  
* nombres de mascotas concretos;  
* nombres de vehículos concretos;  
* documentos concretos;  
* nombres de hogares.

---

## **18\. Servicios frontend / APIs / datos**

### **Información útil para services**

* RLS filtra a nivel de base de datos.  
* Cada hogar es una bóveda aislada.  
* No se cruzan datos entre hogares.  
* Geni hereda permisos del miembro.  
* Toda acción sobre datos del hogar genera auditoría.  
* Task pertenece a Planner.  
* Event pertenece a Calendar.  
* Task referencia Persona.  
* Task referencia Responsabilidad.  
* Event referencia Persona.  
* Home consume Task/Event/Briefing/Presence/Finance/Goals/Alertas.  
* Exportación puede exportar Task, Event, Gasto, HistorialUbicacion, Documento, Racha, MemoriaPersonal.  
* Notificación puede referenciar Task, Event, Gasto, SOS.  
* Offline sincroniza con Task, Event, Persona, Asset, Consumible según archivo de comprensión.  
* Auditoría registra Task, Event, Gasto, Ingreso, Fondo, Deuda, Documento, Membresía, Automatización, SOS.

### **APIs**

No se encontró contrato API explícito en este documento.

No se encontraron:

* endpoints;  
* métodos HTTP;  
* request;  
* response;  
* códigos de error;  
* paginación;  
* filtros;  
* realtime channels;  
* Supabase client específico;  
* auth token frontend;  
* storage API.

### **Clasificación**

* RLS / separación por hogar: REAL MVP como regla de datos.  
* Exportación: POST\_MVP.  
* Auditoría completa: POST\_MVP.  
* Offline: POST\_MVP.  
* Notificaciones reales: POST\_MVP.  
* Services mock para módulos demo: DEMO PREMIUM si se implementan desde otras fuentes.

---

## **19\. Realtime / sincronización visible**

No se encontró información específica sobre realtime UI, broadcast o sincronización entre dispositivos en este documento.

### **Eventos conceptuales detectados que podrían afectar UI**

* Crear dato del hogar.  
* Modificar dato del hogar.  
* Eliminar dato del hogar.  
* Compartir dato.  
* Exportar dato.  
* Crear tarea.  
* Completar tarea.  
* Eliminar tarea.  
* Crear evento.  
* Cancelar/eliminar evento.  
* Cambiar membresía.  
* Ejecutar automatización.  
* Enviar notificación.  
* Actualizar ubicación.  
* Check-in.  
* Generar briefing.  
* Crear memoria.  
* Acceder a dato sensible.

### **Pantallas que deberían actualizarse si se implementa realtime desde otra fuente**

* Home.  
* Planner.  
* Calendar.  
* People.  
* More module cards.  
* Notifications.  
* Settings privacy/inventario.  
* Presence demo.  
* Activity demo.

Clasificación: POST\_MVP salvo que otra fuente defina realtime MVP.

---

## **20\. Permisos visibles en UI**

### **Permisos y visibilidad por tipo de dato**

| Dato | Visible por defecto | Clasificación frontend |
| ----- | ----- | ----- |
| Tareas del hogar | Todos los miembros | REAL MVP |
| Tareas personales | Solo dueño; puede compartir | REAL MVP |
| Eventos del hogar | Todos los miembros | REAL MVP |
| Eventos personales | Solo dueño; puede compartir | REAL MVP |
| Gastos del hogar | Adultos \+ Adulto Mayor \+ Coordinador; Adolescente creador ve propios | DEMO PREMIUM / POST\_MVP |
| Gastos personales | Solo dueño | DEMO PREMIUM |
| Deudas entre miembros | Deudor \+ Acreedor \+ Coordinador | DEMO PREMIUM |
| Ubicación en tiempo real | Dueño hasta compartir / niveles | MOCK / POST\_MVP |
| Historial de ubicación | Dueño \+ Coordinador | POST\_MVP |
| Documentos de identidad | Dueño \+ Coordinador | DEMO PREMIUM / POST\_MVP |
| Documentos del hogar | Adulto, Adulto Mayor, Coordinador | DEMO PREMIUM |
| Documentos personales | Dueño; puede compartir | DEMO PREMIUM |
| Datos salud/medicación | Dueño \+ cuidadores designados \+ Coordinador | DEMO PREMIUM / POST\_MVP |
| Conversaciones con Geni | Solo miembro | DEMO PREMIUM |
| Log de patrones Geni | Solo Geni | POST\_MVP |
| Registro de auditoría | Solo HomePlus sistema | POST\_MVP |
| Rachas | Dueño; niño visible para padres | POST\_MVP / DEMO |
| Métricas de carga | Solo Coordinador | MOCK / DEMO PREMIUM |
| Notificaciones | Solo destinatario | DEMO PREMIUM |
| Preferencias | Solo dueño | DEMO PREMIUM |
| Memorias personales | Dueño; puede compartir | DEMO PREMIUM |
| Memorias familiares | Todos los miembros | DEMO PREMIUM |

### **Permisos por rol detectados**

| Rol | Puede hacer / ver | No puede hacer / ver | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Eliminar cualquier tarea; eliminar eventos si es coordinador; ver métricas de carga; ver algunos datos sensibles según reglas | No ve conversaciones personales con Geni; no ve log de patrones Geni; no ve auditoría cruda | REAL MVP / POST\_MVP según función |
| Adulto | Ver datos de coordinación; ver gastos del hogar según documento; puede tener permisos amplios en archivo de comprensión | Permisos finos no definidos | REAL MVP parcial |
| Adolescente | Puede ver gastos propios creados según documento; autonomía progresiva según comprensión | Permisos finos no definidos | REAL MVP parcial |
| Niño | Datos mínimos; tareas asignadas; rachas visibles para padres | No administra información familiar crítica según comprensión | REAL MVP parcial / POST\_MVP |
| AdultoMayor | Ver datos de coordinación y gastos del hogar; experiencia adaptada | Permisos finos no definidos | REAL MVP parcial |
| Invitado | Acceso mínimo; nivel de ubicación resumido según documento | No definido en detalle | REAL MVP parcial |
| EmpleadoFamiliar | Acceso restringido a responsabilidades asignadas; no forma parte del núcleo familiar | No puede crear tareas según comprensión | POST\_MVP |

### **Botones/acciones condicionadas**

* Eliminar tarea propia: visible para cualquier miembro dueño.  
* Eliminar cualquier tarea: visible para Coordinador.  
* Eliminar evento: visible para creador o Coordinador.  
* Ver métricas de carga: solo Coordinador.  
* Ver datos personales: solo dueño salvo compartido.  
* Ver datos sensibles: según rol/cuidador/confirmación.  
* Ver auditoría cruda: no visible para miembros.  
* Ver log de patrones Geni: no visible.

---

## **21\. Integraciones visibles entre módulos**

| Relación | Clasificación | Aplicación frontend |
| ----- | ----- | ----- |
| Home muestra tareas | REAL MVP | Card/lista de tareas pendientes |
| Home muestra próximos eventos | REAL MVP | Card/lista de eventos |
| Home muestra Briefing | MOCK / DEMO PREMIUM | Resumen visual, no IA real |
| Home muestra Carga Familiar | MOCK / DEMO PREMIUM | Métrica dummy o simple |
| Home muestra Presence Resumido | MOCK / DEMO PREMIUM | Estados/lugares fake |
| Home muestra Actividad Familiar | MOCK / DEMO PREMIUM | Activity feed fake |
| Home muestra Finanzas Relevantes | DEMO PREMIUM | Cards dummy |
| Planner usa Members/Persona | REAL MVP | Asignar/ver responsable |
| Calendar usa Event | REAL MVP | Mostrar eventos |
| Event referencia Persona | REAL MVP | Participantes/responsables si se implementa |
| Task referencia Responsabilidad | REAL MVP / DEMO | Agrupar por área operativa |
| Inventory puede generar tareas | POST\_MVP / DEMO | No implementar real |
| Assets/Mantenimiento genera tareas | POST\_MVP / DEMO | Relación futura visual |
| Finance puede generar alertas/pagos | DEMO PREMIUM | No backend real |
| Geni genera Briefing | DEMO PREMIUM | No IA real |
| Geni crea/sugiere Tasks | POST\_MVP / DEMO | No acción real autónoma |
| Automations crea Task/Event/Notification | POST\_MVP | Demo visual |
| FamilyCloud se relaciona con Calendar | POST\_MVP | Evento finalizado → recuerdo sugerido |
| More abre Finance/Inventory/FamilyCloud/Settings | DEMO PREMIUM | Cards de navegación |
| QuickActions contiene Geni | DEMO PREMIUM | Geni primero visual |
| QuickActions aprende por frecuencia | POST\_MVP | No implementar real |
| Household filtra todos los datos | REAL MVP | active household / RLS |
| Auditoría registra acciones | POST\_MVP | No UI cruda |
| Exportación exporta módulos | POST\_MVP | Settings demo/futuro |
| Notifications referencia Planner/Calendar | DEMO PREMIUM / POST\_MVP | Visual, no push real |

---

## **22\. Edge cases frontend**

### **Detectados o derivados directamente del documento**

| Caso | Comportamiento frontend útil | Clasificación |
| ----- | ----- | ----- |
| Tarea eliminada | Mostrar que va a papelera 30 días | REAL MVP |
| Evento eliminado | Mostrar que va a papelera 30 días | REAL MVP |
| Evento recurrente eliminado | Preguntar “este evento” o “toda la serie” si recurrencia se implementa | POST\_MVP / REAL si hay recurrencia simple |
| Datos personales ocultos | No mostrar a otros miembros | REAL MVP |
| Datos sensibles | Acceso mínimo / mostrar restricción | REAL MVP / POST\_MVP |
| Auditoría cruda | No mostrar a miembros | POST\_MVP |
| Log de patrones Geni | No mostrar ni al Coordinador | POST\_MVP |
| Conversaciones Geni | No compartir | DEMO PREMIUM |
| Ubicación borrada | Eliminación directa sin papelera | POST\_MVP |
| Conversaciones Geni borradas | Eliminación directa sin papelera | POST\_MVP |
| Notificación in-app vieja | Eliminar luego de 30 días | POST\_MVP |
| Exportación generada | Archivo disponible 7 días | POST\_MVP |
| Tarea completada | Mantener como historial, no archivar | REAL MVP |
| Evento pasado | Mantener como historial | REAL MVP |
| Evento cancelado | No contaminar calendario | REAL MVP |
| Niño | Mostrar datos mínimos | REAL MVP parcial |
| Métricas de carga | Solo Coordinador | MOCK / DEMO |
| Household aislado | No cruzar datos de otros hogares | REAL MVP |
| Datos biométricos | No se guardan | IGNORAR / restricción |
| Contraseñas/tokens/claves | No se almacenan | REAL MVP como seguridad conceptual |

### **No encontrado**

* Email ya registrado.  
* Credenciales inválidas.  
* Token inválido/expirado.  
* Invitación expirada.  
* Invitación ya usada.  
* Usuario sin hogar.  
* Usuario pendiente de aprobación.  
* Último coordinador.  
* Responsabilidad sin miembros.  
* Error de red.  
* Conflicto de evento.  
* Tarea ya completada para verificar.  
* Tarea no completada para verificar.

---

## **23\. Copywriting y labels**

### **Labels explícitos detectados**

#### **Navegación / módulos**

* Home.  
* People.  
* Planner.  
* More.  
* Settings.  
* Geni.  
* QuickActions.

#### **Home**

* Briefing.  
* Atención Requerida.  
* Carga Familiar.  
* Próximos Eventos.  
* Tareas.  
* Finanzas Relevantes.  
* Presence Resumido.  
* Actividad Familiar.

#### **Settings**

* Hogar.  
* Miembros.  
* Roles.  
* Responsabilidades.  
* Permisos.  
* Integraciones.  
* Cuenta.  
* Perfil.  
* Seguridad.  
* Privacidad.  
* Sistema.  
* Notificaciones.  
* Offline.  
* Multi-Hogar.  
* Auditoría.  
* Mis Datos.

#### **Roles**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

#### **Estados**

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.  
* Pendiente.  
* En progreso.  
* Completada.  
* Cancelada.  
* Programado.  
* Completado.  
* Cancelado.  
* Activo.  
* Archivado.  
* Fallecida.  
* Pausada.  
* Crítica.  
* Alta.  
* Media.  
* Baja.

#### **Datos / privacidad**

* Datos de Coordinación.  
* Datos Personales.  
* Datos Sensibles.  
* Datos de Auditoría.  
* Inventario de datos.  
* Log de accesos a datos.  
* Papelera.  
* Exportación.  
* Portabilidad.

#### **Presence**

* En casa.  
* En trabajo.  
* En escuela.  
* En tránsito.  
* No molestar.  
* Descansando.  
* Casa.  
* Escuela.  
* Trabajo.  
* Club.  
* Hospital.  
* Gimnasio.

#### **SOS**

* Emergencia grave.  
* Necesito ayuda.  
* Coordinación urgente.

#### **Automatizaciones**

* Llegó a casa.  
* Stock bajo.  
* Pago próximo a vencer.  
* Mantenimiento pendiente.  
* Cumpleaños próximo.

### **Frases explícitas útiles**

* “Los datos del hogar son del hogar.”  
* “HomePlus los administra.”  
* “Cada hogar es una bóveda aislada.”  
* “Home resume, no administra.”  
* “Completada \= histórico.”  
* “Eliminada \= papelera 30 días → borrado.”  
* “No se venden datos. Nunca.”  
* “Privados por defecto.”  
* “El usuario puede abrirlo, nunca el sistema.”  
* “Geni hereda permisos del miembro.”

### **No encontrado**

* Textos de botones.  
* Mensajes de error.  
* Mensajes de éxito.  
* Empty states.  
* Copy de onboarding.  
* Copy de auth.  
* Copy de invitación.  
* Copy de creación de tarea/evento.

---

## **24\. Restricciones técnicas frontend**

### **Detectado**

* RLS a nivel de base de datos.  
* Filtro por permisos del miembro.  
* Separación por household.  
* Cada hogar es una bóveda aislada.  
* Geni hereda permisos del miembro.  
* Auditoría permanente e inmutable.  
* Registro de auditoría no visible a miembros.  
* Datos sensibles con cifrado especial.  
* Documentos de identidad y salud requieren protección reforzada.  
* CifradoDocumentos: AES-256 \+ clave por documento \+ clave del documento cifrada con clave del hogar, según archivo de comprensión.  
* Conversaciones literales con Geni no deben guardarse permanentemente.  
* Contraseñas, tokens y claves no se almacenan.  
* Historial de ubicación máximo 30 días.  
* Conversaciones Geni 90 días.  
* Notificaciones in-app 30 días.  
* Papelera 30 días para eliminaciones aplicables.  
* Exportación con archivo disponible 7 días.  
* Offline aparece como módulo/feature pero no como alcance MVP real.

### **No encontrado**

* Stack frontend.  
* Expo.  
* React Native.  
* Supabase client específico.  
* Realtime.  
* Edge Functions.  
* Librerías disponibles.  
* Librerías ausentes.  
* Performance concreta.  
* Platform differences.  
* Mobile constraints técnicos.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Estados de Task | Documento/comprensión usa Pendiente, En progreso, Completada, Cancelada; MVP actual puede requerir pending, completed, awaiting\_verification, verified | No resolver desde este documento; mapear o priorizar spec funcional posterior |
| Verificación | Documento dice que Verificación es opcional y no existe estado separado; MVP puede necesitar awaiting\_verification/verified | Tratar como contradicción importante |
| Calendar simple vs eventos recurrentes | Documento menciona eliminación de recurrentes por evento/serie; MVP puede usar recurrencia simple | No implementar recurrencia compleja ni RRULE desde esta fuente |
| Home real vs Geni real | Briefing de Geni aparece como primer widget, pero IA real queda fuera | Usar Briefing mock/simple |
| Presence | Documento trata ubicación real como sensible; demo necesita presence visual | Usar Presence mock, no GPS real |
| Carga Familiar | Documento define métricas y retención; frontend MVP puede necesitar card visual | Usar mock salvo backend real posterior |
| Exportación | Documento define portabilidad fuerte; no es prioridad demo | Mostrar visualmente en Settings si conviene, no implementar real |
| Auditoría | Documento exige trazabilidad; no debe exponerse cruda | Usar feedback de acciones; auditoría real POST\_MVP |
| Datos personales en Home | Home puede resumir tareas/eventos, pero datos personales son privados | Fusionar con reglas de visibilidad antes de implementar Home |
| Empleado Familiar | Aparece como rol, pero fuera de roles MVP principales | Marcar POST\_MVP |
| Multi-hogar | Selector existe, pero multi-hogar avanzado está fuera | No hacer UI compleja salvo indicador mock/futuro |
| More con módulos secundarios | Muchos módulos aparecen, pero no deben ser reales | Usar cards demo premium |
| Settings avanzado | Muchas opciones futuras pueden sobrecargar MVP | Mostrar visual premium sin backend real completo |
| QuickActions aprendizaje | Aprendizaje por frecuencia aparece, pero no es MVP | Simular orden fijo o simple |
| Notificaciones push/email | Mencionadas para nuevos usos; no implementar reales | Usar in-app mock si hace falta |
| FamilyCloud documentos | Documentos/OCR/storage son avanzados | Demo visual, no storage real |

---

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Diseño visual concreto | Necesario para premium UI | Requiere otra fuente visual/design system |
| Colores/tipografía/radios/spacing | Necesario para consistencia | No definido aquí |
| Pantallas Auth | Prioridad REAL MVP | No se puede extraer de este documento |
| Formularios Auth | Necesario para login/register | No definido |
| Flujos post-login | Necesario para navegación real | No definido |
| Crear hogar UI | Prioridad MVP | No definido |
| Invitaciones UI | Prioridad MVP | No definido |
| Aprobar/rechazar miembros UI | Prioridad MVP | No definido |
| Lista de miembros UI | Prioridad MVP | Solo entidades/roles |
| Planner UI detallada | Prioridad MVP | No define layout ni cards |
| Task form | Prioridad MVP | Faltan campos |
| Event form | Prioridad MVP | Faltan campos |
| Calendar views | Prioridad MVP | No define día/semana/mes |
| Home layout concreto | Muy importante para demo | Solo lista de bloques |
| QuickActions acciones definitivas | Importante para demo | No lista acciones exactas salvo Geni primero |
| More visual | Demo premium | Solo estructura de módulos |
| Mock data concreta | Necesaria para demo | Hay categorías/labels pero faltan nombres/datos completos |
| Copywriting UI | Necesario para polish | No hay mensajes concretos |
| Loading/error/empty states | Necesario para UX | No definidos |
| APIs | Necesarias para implementación | No hay endpoints |
| Realtime | Necesario para multi-dispositivo | No definido |
| Permisos finos por rol | Necesarios para ocultar botones | Parcial e incompleto |
| Verification Flow | Necesario para Planner MVP | Contradictorio/incompleto |
| Templates MVP | Necesario para tareas rápidas | Documento solo menciona PlantillaTarea genérica |
| Responsabilidades exactas MVP | Necesario para filtros | Solo menciona Compras, Mascotas, Limpieza, Vehículos |
| Notifications UI | Demo/real | Solo categorías/prioridades/canales |
| Activity UI | Home demo | No definido |
| Presence UI | Demo | Solo estados/lugares/niveles |
| Finance UI | Demo | Solo entidades y tipos |
| Inventory UI | Demo | Solo entidades/campos |
| Assets UI | Demo | Solo entidades/campos |
| FamilyCloud UI | Demo | Solo entidades/retención |

---

## **27\. Fragments recomendados desde este documento**

| Fragment | Recomendación | Motivo |
| ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | No hay estilos visuales, pero sí principios de confianza, privacidad y claridad |
| `navigation_fragment` | Parcial | Hay Bottom Nav, QuickActions, Home, People, Planner, More, Settings |
| `home_frontend_fragment` | Sí | Home tiene bloques claros: Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, Tareas, Presence, Actividad |
| `planner_frontend_fragment` | Sí | Hay reglas fuertes para tareas, eventos, historial, papelera, privacidad y responsabilidades |
| `people_members_frontend_fragment` | Parcial | Hay roles, membresía, Persona y visibilidad, pero no UI detallada |
| `household_invites_frontend_fragment` | Parcial | Hay Hogar, Membresía e Invitación conceptual, pero no pantallas |
| `auth_onboarding_frontend_fragment` | Parcial | Solo principios de cuenta/persona/privacidad; no flujos auth |
| `quick_actions_frontend_fragment` | Parcial | Botón \+, panel flotante, Geni primero, acciones dinámicas |
| `more_settings_frontend_fragment` | Sí | Settings, More, privacidad, auditoría, datos, exportación tienen bastante contenido visual posible |
| `finance_demo_fragment` | Parcial | Entidades/tipos útiles para cards demo, sin UI |
| `inventory_demo_fragment` | Parcial | Consumibles/productos/medicamentos y campos útiles para mock |
| `assets_demo_fragment` | Parcial | Vehículos/mascotas/dispositivos/propiedades y datos visuales |
| `familycloud_demo_fragment` | Parcial | Recuerdos, álbumes, documentos, papelera, versionado |
| `presence_demo_fragment` | Sí | Estados, lugares, niveles y privacidad útiles para demo mock |
| `geni_demo_fragment` | Sí | Briefing, Geni Search, consulta de datos, permisos heredados |
| `mock_data_fragment` | Sí | Hay muchos labels, categorías, estados, roles y ejemplos |
| `ux_states_fragment` | Sí | Mucha información de estados, retención, papelera, privacidad |
| `frontend_services_fragment` | Parcial | Hay reglas de datos/RLS/household, pero no endpoints |

---

## **28\. Conclusión operativa**

Este documento no es una guía visual ni una spec de pantallas, pero es muy útil para el frontend premium global porque define cómo debe comportarse HomePlus frente a datos familiares sensibles.

Lo que debe usarse en la futura `frontend_premium_mvp_spec.md`:

* Principios de confianza, privacidad, transparencia y minimización.  
* Separación clara entre datos del hogar, personales, sensibles y de auditoría.  
* Home como resumen operativo.  
* Bottom Nav con Home, People, \+, Planner y More.  
* QuickActions como panel flotante con Geni primero.  
* Planner como módulo real para tareas/eventos, respetando historial, privacidad y papelera.  
* Members/People con roles, estados y visibilidad mínima.  
* More/Settings como espacio de privacidad, datos, herramientas demo y configuración.  
* Módulos secundarios como demo premium, no backend real.  
* Presence como mock/demo, no GPS real.  
* Geni como demo/briefing, no IA real.  
* Auditoría, exportación, offline, multi-hogar, automatizaciones y permisos finos como POST\_MVP.  
* Datos demo extraíbles: roles, estados, categorías, lugares, tipos de cuenta, productos del hogar, dispositivos, automatizaciones y prioridades.

Lo que debe ignorarse como implementación real ahora:

* Auditoría completa visible.  
* Exportación completa.  
* GPS real.  
* Geofencing real.  
* IA real.  
* Automatizaciones reales.  
* Offline sync.  
* OCR/storage avanzado.  
* Feed real.  
* SOS real.  
* Finance real.  
* Inventory real.  
* Assets real.  
* FamilyCloud real.  
* Multi-hogar avanzado.

Conclusión: este fragment debe actuar como capa transversal de reglas UX y privacidad para el frontend premium, especialmente para Home, Planner, People, More/Settings, QuickActions y módulos demo.

---

# **SOURCE 09 — UX WRITING GUIDE PARA GENI**

## **Archivo recomendado**

`HomePlus — UX writing guide para geni.md`

## **Tipo de documento**

UX writing / microcopy / tono

## **Uso para frontend**

Extraer:

* tono de Geni;  
* microcopy de sugerencias;  
* textos cortos;  
* frases prohibidas;  
* estilo conversacional;  
* mensajes de ayuda;  
* lenguaje para cards mock o futuras de Geni.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_UX\_writing\_guide\_para\_geni**

## **1\. Fuente**

* Documento principal: `HomePlus — UX writing guide para geni(1).md`  
* Archivo de comprensión asociado: `UX writing guide para geni(1).txt`  
* Source map previo usado como guía: `source_map_HomePlus_UX_writing_guide_para_geni.md`  
* Tipo de documento: guía de UX Writing mobile-first para Geni, con archivo asociado de entidades, relaciones, flujos, reglas de negocio y decisiones arquitectónicas.  
* Alcance usado: solo información presente en este documento, archivo asociado y source map del mismo documento.  
* Relevancia frontend: **alta para copy, estados UX, Home, Briefing, roles, onboarding, permisos visibles, navegación global y patrones de comunicación; media para Planner; baja para contratos API y diseño visual técnico**.

---

## **2\. Utilidad frontend del documento**

Este documento sirve principalmente para extraer:

* tono general de la app;  
* reglas de microcopy;  
* labels y mensajes reutilizables;  
* estados vacíos;  
* errores;  
* feedback inmediato;  
* copy de onboarding;  
* copy de invitaciones;  
* copy de Home / Briefing;  
* copy de tareas, eventos y conflictos;  
* visibilidad por rol;  
* restricciones de privacidad;  
* relaciones visibles entre Home, Planner, People, Geni, Quick Actions y More;  
* navegación global declarada en el archivo de comprensión;  
* datos demo creíbles para Home, Planner, Presence demo, Finance demo, FamilyCloud demo y Geni demo.

No sirve como fuente completa para:

* endpoints;  
* request / response;  
* diseño visual con colores o tokens;  
* layouts exactos;  
* componentes React Native;  
* contratos de backend;  
* sincronización realtime;  
* permisos técnicos completos;  
* CRUD detallado.

---

## **3\. Información de producto aplicable al frontend**

### **REAL MVP / aplicable transversalmente**

* La app debe presentar datos para que la familia decida; no debe reemplazar conversaciones familiares.  
* El sistema debe informar, sugerir y explicar, no ordenar.  
* El copy debe ser objetivo, claro, breve, cálido y no acusatorio.  
* La interfaz debe evitar juicios sobre personas: mostrar hechos, números, fechas y estados.  
* Las recomendaciones deben incluir explicación y salida.  
* La experiencia debe ser mobile-first.  
* El tono debe adaptarse por rol.  
* Home debe funcionar como centro operativo que resume información.  
* El usuario debe sentir coordinación, claridad, confianza y privacidad.  
* Los datos propios no deben compararse con otros miembros, salvo visibilidad especial para Coordinador.  
* El Invitado no debe ver contexto del hogar, nombres de otros miembros, tareas ajenas ni métricas familiares.  
* El Coordinador puede ver información que otros roles no ven, como carga desbalanceada, métricas de hogar e informes de escalamiento.

### **DEMO PREMIUM / MOCK aplicable**

* Geni aparece como capa transversal en Briefing, notificaciones, sugerencias inline, búsqueda global, tarjetas de memoria y pantalla completa accesible desde Quick Actions.  
* Para MVP visual, Geni debe tratarse como **DEMO PREMIUM / MOCK**, no como IA real.  
* Briefing puede usar textos fijos o datos simples.  
* Carga Familiar puede verse premium con datos dummy.  
* Presence puede verse como estado procesado, no GPS real.  
* Actividad Familiar puede verse como widget/card demo.

### **POST\_MVP**

* Geni real.  
* Automatizaciones reales.  
* Memorias personales/familiares creadas por Geni.  
* Sugerencias inline inteligentes.  
* Búsqueda global con contexto cruzado real.  
* Escalamiento completo automatizado.  
* Notificaciones push reales.  
* GPS real / geocercas.  
* Offline sync real.

---

## **4\. Navegación y arquitectura de pantallas**

### **Navegación global encontrada**

| Elemento | Información encontrada | Clasificación |
| ----- | ----- | ----- |
| Bottom Nav | Navegación principal congelada: `[Home] [People] [+] [Planner] [More]`. | REAL MVP / navegación |
| Home | Pantalla inicial y centro operativo. Resume, no administra. | REAL MVP |
| People | Tab principal. Contiene personas, Feed y Presence según archivo asociado; para MVP solo miembros básicos si aplica. | REAL MVP parcial / DEMO para secundarios |
| `+` central | Abre Quick Actions. | REAL MVP visual |
| Planner | Tab principal. Administra Tasks, Calendar, Goals y Responsabilidades según archivo asociado; Goals queda POST\_MVP. | REAL MVP parcial |
| More | Contiene herramientas especializadas: Finance, Inventory, FamilyCloud, Settings. | DEMO PREMIUM |
| Settings | Vive exclusivamente en More; no aparece en Bottom Nav ni desde Home. | DEMO PREMIUM / parcial |
| Quick Actions | Accede a Pantalla Geni; el archivo asociado también indica selección de acciones como entrada a Geni. | DEMO PREMIUM / REAL visual |
| Pantalla Geni | Pantalla completa accesible vía Quick Actions. | DEMO PREMIUM |
| SearchGlobal | Indexa Persona, Task, Event, Documento y Settings. | POST\_MVP / DEMO si se muestra visualmente |

Fuente: archivo asociado de relaciones y decisiones arquitectónicas.

### **Restricciones de navegación detectadas**

* Home resume información; los módulos administran.  
* Settings vive solo en More.  
* Geni no es un tab propio en Bottom Nav.  
* Mobile-first confirmado.  
* Tablet: 2 columnas.  
* Desktop: sidebar pendiente de confirmación.  
* No hay estructura exacta de stacks o rutas.  
* No hay modales ni bottom sheets detallados salvo la noción de Quick Actions.

---

## **5\. Pantallas detectadas**

| Pantalla | Objetivo | Qué muestra | Acciones / botones detectados | Estados | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Splash | Entrada inicial a HomePlus | Copy: “HomePlus — Todo tu hogar en un solo lugar.” | No encontrado | No encontrado | REAL MVP / Onboarding |
| Inicio onboarding | Configurar hogar en pocos minutos | Copy: “Bienvenida, Mariana. Vamos a configurar tu hogar en 3 minutos.” | Continuar implícito, no nombrado | No encontrado | REAL MVP |
| Preguntas de personalización | Configurar hogar, rol, horarios y tono | Nombre del hogar, rol, preferencia horaria, tono | No encontrado | No encontrado | REAL MVP |
| Pantalla invitación onboarding | Invitar miembros | Copy: “HomePlus funciona mejor con todos. ¿A quién invita primero?” | Invitar implícito | Después de invitar / sin invitados | REAL MVP |
| Home | Centro operativo del hogar | Briefing, tareas, eventos, pendientes, carga, presence, actividad, widgets | Abrir módulo implícito | Todo al día, pendientes | REAL MVP \+ MOCK |
| Briefing diario | Primer widget de Home | Resumen de tareas, eventos, vencimientos | Pregunta sugerida: “¿Empezamos por las tareas?” | Día cargado, tranquilo, fin de semana, todo al día | MOCK / DEMO PREMIUM |
| Planner | Administrar tareas y calendario | Tasks, Calendar, Goals, Responsabilidades según archivo asociado | No detallado | No detallado | REAL MVP parcial |
| Task list / tareas asignadas | Mostrar tareas pendientes o asignadas | Tareas, estados, fechas, responsables por relaciones asociadas | Completar implícito por copy | Sin tareas, pendiente, completada, vencida | REAL MVP parcial |
| Calendar / eventos próximos | Mostrar eventos | Eventos próximos, conflictos de horario | Agregar evento sugerido en empty state | Sin eventos, conflicto | REAL MVP parcial |
| People / Members | Administrar personas del hogar | Persona, membresía, roles, estado | Aprobar/invitar implícito desde relaciones | Pending/active/suspended/finalized en archivo asociado | REAL MVP parcial |
| More | Acceso a herramientas especializadas | Finance, Inventory, FamilyCloud, Settings | Abrir módulo | No encontrado | DEMO PREMIUM |
| Settings | Configuración | Hogar, Cuenta, Sistema, Auditoría según archivo asociado | No encontrado | No encontrado | DEMO PREMIUM / parcial |
| Pantalla completa Geni | Punto de entrada a Geni | Chat, acciones sugeridas, insights, historial, configuración IA según archivo asociado | Preguntar / seleccionar acción implícito | No encontrado | DEMO PREMIUM |
| SearchGlobal | Buscar entidades y acciones | Resultados de Persona, Task, Event, Documento, Settings | Buscar | No encontrado | POST\_MVP / DEMO visual |

---

## **6\. Componentes y patrones UI reutilizables**

### **Cards / widgets**

| Componente | Uso frontend | Clasificación |
| ----- | ----- | ----- |
| WidgetBriefing | Primer widget de Home; muestra resumen diario. | MOCK / DEMO PREMIUM |
| WidgetAtenciónRequerida | Centraliza tareas vencidas, pagos vencidos, aprobaciones pendientes, vencimientos, SOS según archivo asociado. | DEMO PREMIUM; real parcial si usa tareas/invitaciones |
| WidgetCargaFamiliar | Muestra distribución de tareas; solo visible al Coordinador según documento. | MOCK / DEMO PREMIUM |
| WidgetPróximosEventos | Muestra eventos próximos del calendario. | REAL MVP |
| WidgetTareas | Muestra tareas agrupadas por Responsabilidad; desaparece al completarse según archivo asociado. | REAL MVP parcial |
| WidgetFinanzasRelevantes | Condicional para pagos, metas, presupuesto. | DEMO PREMIUM |
| WidgetPresenceResumido | Muestra quién está en casa, en camino o llegó recientemente. | MOCK / DEMO PREMIUM |
| WidgetActividadFamiliar | Actividad reciente del Feed. | MOCK / DEMO PREMIUM |
| Tarjeta de notificación contextual | Recordatorios, vencimientos, conflictos, medicación, presupuesto, documentos. | DEMO PREMIUM / POST\_MVP si push real |
| Tarjeta de empty state | Texto informativo \+ acción sugerida. | REAL MVP / DEMO según módulo |

Fuente: archivo asociado de entidades/relaciones de Home y documento principal de Home/Briefing.

### **Patrones reutilizables de comunicación**

* Dato primero, interpretación después.  
* Pregunta abierta en vez de orden.  
* Voz activa y sujeto claro.  
* Primera persona plural para acciones compartidas.  
* Condicional para sugerencias.  
* Presente para hechos.  
* Frases cortas de 12–15 palabras máximo.  
* Empty states con tono informativo \+ acción sugerida.  
* Errores sin culpar al usuario.  
* Un solo emoji máximo por mensaje.  
* Emojis permitidos:  
  * 💜 reconocimiento factual;  
  * ⚠️ urgencia/SOS;  
  * 🎯 logro/meta alcanzada.  
* No usar emojis fuera de esos tres en copy de Geni.  
* No usar exclamaciones múltiples.  
* No usar comparaciones entre miembros salvo visibilidad de Coordinador.

### **Patrones UI no especificados**

No se encontró información específica sobre:

* colores;  
* tipografía;  
* gradientes;  
* sombras;  
* blur;  
* glassmorphism;  
* radios;  
* spacing;  
* iconografía;  
* tamaños de botones;  
* skeletons;  
* loaders visuales;  
* tab bar visual;  
* formularios exactos;  
* calendario visual exacto;  
* gráficos exactos.

---

## **7\. Visual design aplicable**

### **Encontrado**

* Formato: mobile-first.  
* Idioma: Castellano LATAM.  
* La UI debe sentirse clara, breve, humana, objetiva y no invasiva.  
* El copy debe caber en dos líneas de notificación mobile.  
* Máximo un emoji por mensaje.  
* El estilo debe evitar dramatismo, culpa, tono robótico, lenguaje corporativo y efusividad.  
* La ausencia de tareas no debe presentarse como premio; es un estado operativo.  
* La presencia es información operativa, no social.  
* Los datos deben ser limpios y sin efusividad.  
* El copy debe funcionar leído en voz alta en una cocina.  
* Para roles:  
  * Niño: simple, visual, positivo.  
  * Adolescente: motivacional sin condescendencia.  
  * Adulto: par, cálido, colaborativo.  
  * Adulto Mayor: paciente, claro, esencial.  
  * Coordinador: informativo, respetuoso, directo.  
  * Invitado: neutral, funcional.  
  * Empleado Familiar: profesional y acotado.

### **No encontrado**

No se encontró información específica sobre:

* paleta de colores;  
* tokens;  
* gradientes;  
* blur;  
* sombras;  
* bordes;  
* radios;  
* diseño iOS explícito;  
* layout por pantalla;  
* densidad visual;  
* tamaños;  
* fuentes;  
* íconos específicos.

---

## **8\. Home**

### **Rol de Home**

* Home es el centro operativo del hogar.  
* Home resume información; no administra.  
* La información de Home debe conducir al módulo que administra el dato.  
* Home siempre es pantalla inicial según archivo asociado.  
* Geni personaliza Home según archivo asociado, pero para MVP debe tratarse como mock/demo si no hay IA real.

### **Widgets / cards detectados**

| Widget / card | Qué muestra | Clasificación |
| ----- | ----- | ----- |
| Briefing diario | Resumen del día: tareas, eventos, vencimientos. | MOCK / DEMO PREMIUM |
| Todo al día | Estado operativo sin pendientes. | MOCK / DEMO PREMIUM |
| Pendientes | Conteo de tareas, documentos u otros elementos. | MOCK / REAL parcial si usa tareas reales |
| Carga desbalanceada | Distribución de carga entre miembros; solo Coordinador. | MOCK / DEMO PREMIUM |
| Próximos eventos | Eventos próximos del calendario. | REAL MVP |
| Tareas | Tareas pendientes / agrupadas. | REAL MVP |
| Presence resumido | Llegadas, quién está en casa o barrio. | MOCK / DEMO PREMIUM |
| Actividad familiar | Actividad reciente del Feed. | MOCK / DEMO PREMIUM |
| Atención requerida | Tareas vencidas, pagos vencidos, aprobaciones, vencimientos, SOS. | MIXTO: real parcial \+ demo |

### **Copy extraíble para Home**

| Contexto | Copy |
| ----- | ----- |
| Día cargado | “Hoy: 4 tareas, 2 eventos y 1 documento por vencer. ¿Empezamos por las tareas?” |
| Día tranquilo | “Hoy tranquilo: 1 evento a las 16 y sin vencimientos. ☀️” |
| Fin de semana | “Sábado. 1 tarea pendiente y la lista de compras por armar.” |
| Todo al día | “Todo al día por acá. Nada pendiente.” |
| Todo al día | “Sin tareas, sin vencimientos. Buen momento para lo que quieras.” |
| Pendientes | “Tenés 2 tareas para hoy y 1 del lunes.” |
| Pendientes | “Pendientes: 3 tareas, 1 documento. ¿Empezamos por lo urgente?” |
| Carga desbalanceada / Coordinador | “Esta semana la carga está 70% Mariana / 30% Tomás. ¿Querés revisar la distribución?” |
| Carga desbalanceada / Coordinador | “Tomás tiene 5 tareas asignadas, Luca 1\. ¿Ajustan algo entre todos?” |

Fuente: sección Home / Briefing del documento principal.

### **REAL MVP**

* Próximos eventos.  
* Tareas pendientes.  
* Resumen del hogar si se alimenta de tareas/eventos/miembros reales.  
* Aprobaciones pendientes si se conectan con invitaciones/members reales.

### **MOCK / DEMO PREMIUM**

* Briefing textual.  
* Carga Familiar.  
* Presence resumido.  
* Actividad Familiar.  
* Finanzas relevantes.  
* Documentos próximos a vencer.  
* Presupuesto.  
* Vencimientos de activos.  
* Geni personalizado.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Rol del Planner**

* Planner aparece como núcleo operativo que administra Tasks, Calendar, Goals y Responsabilidades.  
* Para MVP frontend, lo aplicable real es Tasks, Events y Calendar mínimo.  
* Goals queda como POST\_MVP o demo visual si se muestra, porque no forma parte del MVP real actual definido por el usuario.

### **Tasks**

#### **Información encontrada**

| Elemento | Información |
| ----- | ----- |
| Entidad | Task. |
| Descripción | Trabajo pendiente o realizado. |
| Estados encontrados en archivo asociado | Pendiente, En progreso, Completada, Cancelada. Vencida es calculada. |
| Responsable | Task assigned\_to Persona. |
| Responsabilidad | Task belongs\_to Responsabilidad. |
| Timeline | Task tiene Timeline según archivo asociado. |
| Verificación | Task puede requerir Verificación; opcional; al verificarse pasa a estado final. |
| Subtarea | Existe un único nivel; no hay anidamiento. POST\_MVP para este MVP. |
| Dependencia | Una tarea puede depender de otra; si la previa no se completa, la dependiente queda bloqueada. POST\_MVP. |
| Recurrencia | Recurrencia genera nuevas instancias y preserva historial. POST\_MVP salvo visual simple/local. |
| PlantillaTarea | Plantilla predefinida inicialmente solo para Tasks. No hay detalle de templates MVP en este documento. |
| Comentario | Comentarios en tareas aparecen como entidad. POST\_MVP. |
| Adjunto | Archivos adjuntos a tareas. POST\_MVP. |

Fuente: archivo de comprensión asociado.

#### **Copy / datos demo de tareas**

| Caso | Copy / dato | Uso |
| ----- | ----- | ----- |
| Tarea simple | “Luca, mañana te toca sacar el reciclaje antes de las 8.” | Card de tarea / recordatorio |
| Tarea con dependencia | “Mati, la reunión del cole es mañana a las 17\. ¿Tenés los papeles listos?” | Tarea asociada a evento |
| Tarea recurrente | “Martes de compras. ¿Mantienen la lista de siempre?” | Tarea de compras |
| Tarea vencida día 1 | “Luca, tenés una tarea pendiente desde ayer. ¿La revisás hoy?” | Badge vencida |
| Tarea vencida día 3 | “Luca, tu tarea sigue pendiente desde el lunes. ¿Necesitás ayuda para completarla?” | Estado vencido |
| Tarea vencida día 4 | “Luca, ya van 3 días con esta tarea sin completar. Si no se resuelve hoy, mañana debo informar al Coordinador. ¿La revisamos juntos?” | Escalamiento demo |
| Tarea vencida al Coordinador | “Te informo como Coordinador: Luca tiene 1 tarea pendiente desde el lunes. ¿Querés intervenir o esperamos?” | Atención requerida demo |
| Adolescente | “Jose, las 2 tareas del finde quedaron sin completar. ¿Querés que te ayude a reorganizarlas?” | Variante por rol |
| Adulto | “Mariana, tenés 1 tarea pendiente desde el jueves. ¿La pasamos al finde o la revisás hoy?” | Variante por rol |
| Completada standard | “Listo el reciclaje. 💜” | Feedback inmediato |
| Completada niño | “Luca completó su lista de hoy. 🎯” | Feedback inmediato |
| Mala noticia sin culpa | “Esta tarea está pendiente desde el lunes. ¿La pasamos a otro día?” | Error/pendiente |
| Grupo sin completar | “Quedan 3 tareas del grupo sin completar. ¿Querés que coordine con cada responsable?” | Card de coordinación demo |

#### **UI útil para tareas**

* Lista de tareas.  
* Cards de tarea.  
* Badge de pendiente.  
* Badge de completada.  
* Badge de vencida calculada.  
* Responsable visible.  
* Fecha visible.  
* Acción de completar.  
* Empty state de sin tareas.  
* Feedback success al completar.  
* Mensaje de error al guardar.  
* Permiso denegado si la tarea/sección no corresponde.  
* Home widget de tareas.

#### **Clasificación**

| Información | Clasificación |
| ----- | ----- |
| Listar tareas | REAL MVP si se conecta al backend real del MVP. |
| Completar tarea | REAL MVP. |
| Crear/editar/eliminar tarea | No aparece detallado en este documento; requerido por MVP desde otras fuentes. |
| Responsable / Persona | REAL MVP si se usa con Members. |
| Fecha / vencimiento | REAL MVP parcial; vencida calculada aparece explícitamente. |
| Prioridad | Solo aparece en data flow como dato hacia Timeline/WidgetTareas; no hay UI ni valores. |
| Verificación | POST\_MVP o real mínimo solo si otra fuente lo define; este documento no tiene estados MVP `awaiting_verification`/`verified`. |
| Subtareas | POST\_MVP. |
| Dependencias | POST\_MVP. |
| Comentarios | POST\_MVP. |
| Adjuntos | POST\_MVP. |
| Timeline | POST\_MVP / DEMO visual. |
| Streak / rachita | POST\_MVP / DEMO visual. |
| Recurrencia avanzada | POST\_MVP. |
| Templates | Parcial: existe PlantillaTarea, sin detalle de MVP. |

### **Events / Calendar**

#### **Información encontrada**

| Elemento | Información |
| ----- | ----- |
| Entidad | Event. |
| Descripción | Evento de calendario. |
| Tipos | Familiar, Personal. |
| Estados | Programado, Completado, Cancelado. |
| Participantes | Event has\_participant Persona. |
| Calendar | Vista de calendario dentro de Planner. Administra eventos. |
| Relación con Home | WidgetPróximosEventos muestra eventos próximos. |
| Relación con FamilyCloud | Event puede generar Recuerdo según archivo asociado. POST\_MVP / DEMO visual. |
| Relación con SearchGlobal | SearchGlobal indexa Event. POST\_MVP / DEMO visual. |

Fuente: archivo de comprensión asociado.

#### **Copy / datos demo de eventos**

| Caso | Copy / dato | Uso |
| ----- | ----- | ----- |
| Día tranquilo | “Hoy tranquilo: 1 evento a las 16 y sin vencimientos. ☀️” | Home / próximo evento |
| Conflicto leve | “El martes coinciden el dentista de Luca y la reunión de Mariana a las 16\. ¿Revisan?” | Calendar conflict demo |
| Conflicto con recurso | “El viernes dos personas necesitan el auto a las 15\. ¿Coordinan quién lo usa?” | Calendar conflict demo |
| Sin eventos | “Calendario libre por ahora. ¿Agregamos un evento?” | Empty state |

#### **UI útil para Events / Calendar**

* Widget de próximos eventos.  
* Calendario con eventos.  
* Empty state “Sin eventos próximos”.  
* Card de conflicto de horario.  
* Card de evento con hora.  
* Participantes/personas visibles si se usa Members.  
* Acceso desde Home al calendario o evento.  
* No hay layout de día/semana/mes en este documento, solo entidad Calendar.

#### **Clasificación**

| Información | Clasificación |
| ----- | ----- |
| Listar eventos próximos | REAL MVP. |
| Calendar mínimo | REAL MVP, pero la UI exacta no está definida. |
| Crear/editar/cancelar evento | No aparece detallado; requerido por MVP desde otras fuentes. |
| Participantes | POST\_MVP si son avanzados; básico con Persona puede ser REAL si otra fuente lo define. |
| Conflictos | DEMO PREMIUM / POST\_MVP si detección real. |
| Tareas con fecha en calendario | Relación Home/Calendar no explicitada directamente; no desarrollar desde este documento. |
| Recurrencia simple | No aparece como valores `none/daily/weekly/monthly`; no inventar desde este documento. |
| RRULE/EXDATE | No encontrado. |

---

## **10\. People / Members / Roles**

### **Entidades y relaciones frontend aplicables**

| Elemento | Información encontrada | Clasificación |
| ----- | ----- | ----- |
| People | Administra personas del hogar; centraliza identidad, relaciones, roles, membresía. | REAL MVP parcial |
| Persona | Representa a un miembro; pertenece a Cuenta; puede participar en hogares. | REAL MVP |
| Membresía | Relación entre Persona y Hogar. Estados: Pendiente, Activa, Suspendida, Finalizada. | REAL MVP |
| RelaciónFamiliar | Informativa; no modifica permisos automáticamente. | POST\_MVP / DEMO |
| PerfilPersonal | Preferencias, idioma, configuración personal, memoria personal de Geni. | REAL parcial / POST\_MVP memoria |
| Rol | Afecta tono, visibilidad y tratamiento. | REAL MVP |
| Persona → Task | Persona puede ser responsable/asignada a Task. | REAL MVP |
| Persona → Event | Persona participa en Event. | REAL MVP parcial |
| Responsabilidad → Persona | Responsabilidad tiene miembros asignados. | DEMO / POST\_MVP si no se desarrolla Responsabilidades |

### **Roles detectados**

| Rol documento | Mapeo | Tratamiento / UI | Visibilidad / regla |
| ----- | ----- | ----- | ----- |
| Coordinador | Coordinator | Colega, informativo, respetuoso, directo; usted o nombre. | Ve carga desbalanceada, métricas de hogar, informe de escalamiento Nivel 3\. |
| Adulto | Adult | Par, cálido, colaborativo; usted o nombre según perfil. | No se detallan permisos completos. |
| Adolescente | Adolescent | Mentor joven; nombre de pila. | Copy motivacional sin condescendencia. |
| Niño | Child | Simple, visual, positivo; nombre de pila. | No administra información familiar crítica según archivo asociado. |
| Adulto Mayor | Senior | Paciente, claro, esencial; usted \+ nombre. | Experiencia adaptada; recordatorios como medicación. |
| Invitado | Guest | Neutral, funcional, contexto mínimo; usted. | No ve contexto del hogar, nombres de otros miembros, tareas ajenas ni métricas. |
| Empleado Familiar | Fuera MVP | Profesional, acotado a responsabilidades asignadas. | Solo recibe información necesaria para su trabajo; no crear como rol MVP obligatorio. |

Fuente: tabla de tono por rol y reglas de tratamiento.

### **UI aplicable**

* Lista de miembros con nombre y rol.  
* Role pills: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor, Invitado.  
* Estados de membresía: Pendiente, Activa, Suspendida, Finalizada.  
* Copy adaptado por rol.  
* Ocultar comparaciones y métricas salvo Coordinador.  
* Ocultar contexto familiar a Invitado.  
* No se encontraron avatares, iniciales, colores por rol o estructura visual detallada.

---

## **11\. Household / Invitations / Onboarding**

### **Onboarding**

| Pantalla / paso | Información encontrada | Clasificación |
| ----- | ----- | ----- |
| Splash | “HomePlus — Todo tu hogar en un solo lugar.” | REAL MVP |
| Inicio | “Bienvenida, Mariana. Vamos a configurar tu hogar en 3 minutos.” | REAL MVP |
| Nombre del hogar | Pregunta: “¿Cómo le dicen a su casa?” Placeholder: “Casa de los Robles”. | REAL MVP |
| Rol | Pregunta: “¿Cuál es su rol en el hogar?” Opciones: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor. | REAL MVP |
| Preferencia horaria | “¿A qué hora prefiere que le avise de las cosas del día?” | DEMO / POST\_MVP si no se usa real |
| Tono | “¿Cómo quiere que le hable?” Opciones: Mariana / Sra. García. | DEMO / REAL perfil parcial |
| Primer valor visible | “Primer paso listo. Ahora sumemos a los miembros del hogar.” | REAL MVP |
| Primer valor visible | “Ya tiene su espacio. Cuando invite a alguien, todo se conecta solo.” | REAL MVP |
| Invitación | “HomePlus funciona mejor con todos. ¿A quién invita primero?” | REAL MVP |
| Después de invitar | “Invitación enviada. Cuando la acepten, aparecen acá.” | REAL MVP |
| Sin invitados todavía | “Cada miembro ve solo lo que le corresponde. La privacidad es prioridad en HomePlus.” | REAL MVP |

Fuente: sección Onboarding del documento principal.

### **Household**

* Hogar es la unidad organizativa principal; todo ocurre dentro de un hogar.  
* Cuenta pertenece al usuario, no al hogar.  
* Persona puede participar en uno o más hogares.  
* Multi-hogar avanzado aparece en archivo asociado, pero para MVP actual debe tratarse como POST\_MVP salvo hogar activo básico si otra fuente lo define.  
* No se encontró UI completa de configuración de hogar, solo onboarding de nombre del hogar.

### **Invitations**

* Existe flujo: Invitación → Aceptación → Aprobación → Ingreso al hogar.  
* La pantalla de invitación aparece durante onboarding.  
* Después de invitar, el usuario ve confirmación textual.  
* Estado sin invitados tiene copy explícito.  
* No se encontró link/código/token en el documento principal.  
* No se encontró UI de aprobar/rechazar miembros, aunque el archivo asociado indica que Coordinador puede aprobar invitaciones.

---

## **12\. More / Settings / Profile**

### **More**

| Elemento | Información encontrada | Clasificación |
| ----- | ----- | ----- |
| MoreSección | Contiene Finance, Inventory, FamilyCloud, Settings. | DEMO PREMIUM |
| Finance | Herramienta especializada accesible desde More. | DEMO PREMIUM |
| Inventory | Herramienta especializada accesible desde More. | DEMO PREMIUM |
| FamilyCloud | Herramienta especializada accesible desde More. | DEMO PREMIUM |
| Settings | Herramienta especializada accesible desde More. | DEMO PREMIUM / parcial |

### **Settings**

* Settings vive exclusivamente en More.  
* No aparece en Bottom Nav.  
* No tiene acceso desde Home.  
* Estructura detectada en archivo asociado: Hogar, Cuenta, Sistema, Auditoría.  
* Auditoría aparece como trazabilidad consultable por roles autorizados, pero auditoría completa es POST\_MVP para esta entrega.  
* No hay pantallas específicas de perfil ni settings visuales detallados.

Fuente: archivo asociado de navegación y reglas.

### **Profile**

* PerfilPersonal contiene preferencias, idioma, configuración personal y memoria personal de Geni.  
* El tratamiento de nombre/usted depende de perfil.  
* Durante onboarding se pregunta preferencia de tono.  
* Memoria personal de Geni queda POST\_MVP.

---

## **13\. Quick Actions**

### **Información encontrada**

| Acción / elemento | Información encontrada | Clasificación |
| ----- | ----- | ----- |
| Botón `+` central | Parte del Bottom Nav. Abre QuickActions. | REAL MVP visual |
| QuickActions | Accede a PantallaGeni. | DEMO PREMIUM |
| Pantalla completa de Geni | Accesible vía Quick Actions. | DEMO PREMIUM |
| Selección de acción | El archivo asociado menciona QuickActions como origen de selección de acción hacia PantallaGeni. | DEMO PREMIUM |
| Crear tarea | No aparece explícitamente como Quick Action en documento principal; el archivo asociado menciona que Geni también ejecuta acciones como crear tarea. | DEMO / requiere validación |
| Invitar miembro | No aparece explícitamente en Quick Actions del documento principal; aparece en onboarding. | REAL MVP desde onboarding, no desde QuickActions |
| Crear evento | No encontrado como Quick Action. | Información faltante |
| Agregar gasto | No encontrado como Quick Action; gastos aparecen en Finance demo/copy. | DEMO si otra fuente lo define |
| Agregar item | No encontrado. | Información faltante |
| Subir documento | No encontrado como Quick Action. | DEMO si otra fuente lo define |
| Preguntar a Geni | Implícito por PantallaGeni. | DEMO PREMIUM |
| Check-in | No encontrado como Quick Action. | Información faltante |
| SOS | SOSPanel aparece como acceso global vía swipe según archivo asociado, no Quick Action. | DEMO / POST\_MVP |

Fuente: documento principal y archivo asociado.

---

## **14\. Módulos demo premium**

### **Geni demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Rol visual | Capa transversal, no chatbot aislado. | DEMO PREMIUM |
| Dónde aparece | Briefing, notificaciones, sugerencias inline, búsqueda global, tarjetas de memoria, pantalla completa vía Quick Actions. | DEMO / POST\_MVP |
| Verbos | Consultar, Analizar, Recomendar, Coordinar, Automatizar. | DEMO PREMIUM |
| Tono | Informativo, objetivo, sugerente, explicable, leal al miembro. | DEMO PREMIUM |
| Qué no implementar real | IA real, memoria real, automatizaciones reales, búsqueda global real. | POST\_MVP |

### **Finance demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Copy presupuesto | “Mariana, supermercado: ya están en $48.000 de $45.000 este mes. Quedan 12 días. ¿Ajustan algo?” | DEMO PREMIUM |
| Copy global | “El presupuesto del mes está al 92% con 10 días por delante. ¿Querés revisar las categorías?” | DEMO PREMIUM |
| Empty state | “Todavía no hay gastos este mes. Tocá \+ para agregar el primero.” | DEMO PREMIUM |
| Entidades | CuentaFinanciera, Gasto, Ingreso, Fondo, Presupuesto, Deuda, MetaFinanciera. | DEMO / POST\_MVP |
| More | Finance aparece dentro de More. | DEMO PREMIUM |
| Qué no implementar real | Finanzas completas reales, cálculos avanzados, presupuesto backend real. | POST\_MVP |

### **Inventory demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Entidades | Consumible, ProductoHogar, Medicamento, Stock. | DEMO PREMIUM |
| Medicación | Recordatorio de medicación para Adulto Mayor y Niño. | DEMO PREMIUM |
| Relación futura | Stock bajo puede disparar automatización o tarea. | POST\_MVP / DEMO visual |
| More | Inventory aparece dentro de More. | DEMO PREMIUM |
| Qué no implementar real | Inventario completo real, automatizaciones reales, stock backend real. | POST\_MVP |

### **Assets demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Documento de activo | “La cédula verde del auto vence en 5 días. ¿Necesitás turno para renovarla?” | DEMO PREMIUM |
| Recurso compartido | “El viernes dos personas necesitan el auto a las 15\. ¿Coordinan quién lo usa?” | DEMO PREMIUM |
| Entidades | Vehículo, Mascota, Dispositivo, Propiedad, Mantenimiento. | DEMO / POST\_MVP |
| Relación futura | Mantenimiento genera Task. | POST\_MVP |
| Qué no implementar real | Assets completo real, vencimientos reales, documentos reales. | POST\_MVP |

### **FamilyCloud / HomeCloud demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Empty álbum | “El álbum está vacío. ¿Suben la primera foto?” | DEMO PREMIUM |
| Empty documentos | “Acá van a aparecer los documentos del hogar. Cédulas, obras sociales, seguros.” | DEMO PREMIUM |
| Documento persona | “El carnet de obra social de Luca vence el 20\. ¿Lo renovamos?” | DEMO PREMIUM |
| Múltiples documentos | “Hay 2 documentos por vencer esta semana. ¿Los revisás?” | DEMO PREMIUM |
| Entidades | Recuerdo, Álbum, Documento, Papelera, OCR. | DEMO / POST\_MVP |
| More | FamilyCloud aparece dentro de More. | DEMO PREMIUM |
| Qué no implementar real | Storage real, OCR, versionado, documentos backend reales. | POST\_MVP |

### **Presence demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Llegada niño | “Luca ya está en casa.” | MOCK / DEMO PREMIUM |
| Llegada geocerca | “Mariana llegó al barrio.” | MOCK; GPS/geocerca real POST\_MVP |
| Widget | WidgetPresenceResumido muestra quién está en casa/en camino/llegó recientemente. | MOCK / DEMO PREMIUM |
| Reglas | Presencia es información operativa, no social. Sin emoji ni efusividad. | DEMO PREMIUM |
| Qué no implementar real | GPS real, geofencing, mapas reales, historial ubicación. | POST\_MVP |

### **Feed demo / Actividad Familiar**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| WidgetActividadFamiliar | Actividad reciente del Feed en Home. | MOCK / DEMO PREMIUM |
| Feed | Contiene Post, Comentario, Reacción según archivo asociado. | DEMO / POST\_MVP |
| Qué no implementar real | Feed real completo, comentarios reales. | POST\_MVP |

### **SOS demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Copy SOS | “⚠️ \[Nombre\] activó el botón de emergencia. ¿Estás en camino?” | DEMO PREMIUM |
| Copy SOS | “\[Nombre\] necesita ayuda. Tocá para ver su ubicación. ⚠️” | DEMO PREMIUM |
| Regla | SOS es único contexto imperativo. | POST\_MVP / DEMO visual |
| SOSPanel | Acceso vía swipe ↑ global según archivo asociado. | DEMO PREMIUM |
| Qué no implementar real | Emergencia real, ubicación real, notificaciones reales. | POST\_MVP |

### **Goals demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Meta individual | “Meta cumplida: 30 días sin faltar al gym. 🎯” | DEMO PREMIUM |
| Meta familiar | “Este mes gastaron $15.000 menos que el promedio. ¿Quieren revisar si ajustan la meta del mes que viene?” | DEMO PREMIUM |
| Meta de pareja | “Ustedes dos cumplieron el plan de comidas de la semana. 💜” | DEMO PREMIUM |
| Entidad Goal | Estados: Activa, Completada, Fallida; estructura Goal → Hitos → Tasks. | POST\_MVP |
| Qué no implementar real | Goals backend real, milestones, progreso real avanzado. | POST\_MVP |

### **Automations demo**

| Aspecto | Información extraíble | Clasificación |
| ----- | ----- | ----- |
| Verbo Automatizar | Ejecuta tareas recurrentes con aprobación explícita previa. | POST\_MVP / DEMO |
| Regla | Toda automatización requiere aprobación explícita. | POST\_MVP |
| Relaciones | Automatización puede crear Task/Event, enviar notificación, publicar en Feed según archivo asociado. | POST\_MVP |
| Qué no implementar real | Automatizaciones reales. | POST\_MVP |

---

## **15\. Estados UX y feedback**

### **Estados vacíos**

| Pantalla / situación | Copy | Clasificación |
| ----- | ----- | ----- |
| Sin tareas asignadas | “No tenés tareas pendientes. Cuando te asignen una, aparece acá.” | REAL MVP |
| Sin eventos próximos | “Calendario libre por ahora. ¿Agregamos un evento?” | REAL MVP |
| Sin gastos registrados | “Todavía no hay gastos este mes. Tocá \+ para agregar el primero.” | DEMO PREMIUM |
| Sin fotos en el álbum | “El álbum está vacío. ¿Suben la primera foto?” | DEMO PREMIUM |
| Sin documentos | “Acá van a aparecer los documentos del hogar. Cédulas, obras sociales, seguros.” | DEMO PREMIUM |
| Sin miembros invitados | “Todavía no hay miembros invitados. ¿Agregamos al primero?” | REAL MVP |

### **Errores y edge cases**

| Situación | Copy | Clasificación |
| ----- | ----- | ----- |
| Error de conexión | “Sin conexión. Tus datos están seguros, se sincronizan cuando vuelvas.” | DEMO / POST\_MVP si sync real |
| Sincronización pendiente | “Falta sincronizar. Los cambios de hoy se guardaron en el teléfono.” | POST\_MVP / DEMO visual |
| Permiso denegado general | “No tenés acceso a esta sección. Solo visible para el Coordinador del hogar.” | REAL MVP |
| Permiso denegado Niño | “Esta sección es solo para adultos del hogar.” | REAL MVP |
| Sesión expirada | “Tu sesión terminó por seguridad. Volvé a entrar, es rápido.” | REAL MVP |
| Error al guardar | “No se pudo guardar. ¿Probás de nuevo? Si persiste, revisamos la conexión.” | REAL MVP |
| Datos inconsistentes | “Hay un dato que no coincide. ¿Lo revisamos juntos?” | DEMO / POST\_MVP |
| Funcionalidad no disponible | “Esta función todavía no está lista. Te avisamos cuando se active.” | DEMO / POST\_MVP |

Fuente: secciones Empty States y Errores.

### **Estados de negocio detectados**

| Entidad | Estados encontrados | Clasificación |
| ----- | ----- | ----- |
| Membresía | Pendiente, Activa, Suspendida, Finalizada. | REAL MVP |
| Task | Pendiente, En progreso, Completada, Cancelada. Vencida calculada. | REAL MVP parcial / contradicción con estados esperados MVP |
| Event | Programado, Completado, Cancelado. | REAL MVP parcial |
| Goal | Activa, Completada, Fallida. | POST\_MVP |
| Fondo | Activo, Completado, Cerrado. | DEMO / POST\_MVP |
| Deuda | Activa, Pagada, Vencida. | DEMO / POST\_MVP |
| SOS | Activo, Cancelado, Cerrado. | DEMO / POST\_MVP |
| Presence manual | No molestar, Descansando, etc. | DEMO / POST\_MVP |

---

## **16\. Formularios y datos de entrada**

| Formulario / pantalla | Campos encontrados | Obligatorio/opcional | Validaciones | Botones / acciones | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Login | No encontrado. | No encontrado. | Sesión expirada como edge case. | No encontrado. | Información faltante |
| Register | No encontrado. | No encontrado. | No encontrado. | No encontrado. | Información faltante |
| Forgot password | No encontrado. | No encontrado. | No encontrado. | No encontrado. | Información faltante |
| Create household / onboarding | Nombre del hogar. Placeholder: “Casa de los Robles”. | No especificado. | No encontrado. | Continuar implícito. | REAL MVP |
| Selección de rol | Coordinador, Adulto, Adolescente, Niño, Adulto Mayor. | No especificado. | No encontrado. | Elegir rol implícito. | REAL MVP |
| Preferencia horaria | “¿A qué hora prefiere que le avise de las cosas del día?” | No especificado. | No encontrado. | No encontrado. | DEMO / POST\_MVP |
| Tono / tratamiento | Mariana / Sra. García. | No especificado. | No encontrado. | Elegir tono implícito. | DEMO / REAL perfil parcial |
| Invite member | “¿A quién invita primero?” | No se especifican campos de contacto. | No encontrado. | Invitar implícito. | REAL MVP parcial |
| Join household | No encontrado. | No encontrado. | No encontrado. | No encontrado. | Información faltante |
| Create task | No encontrado como formulario. | No encontrado. | No encontrado. | No encontrado. | Información faltante |
| Edit task | No encontrado. | No encontrado. | No encontrado. | No encontrado. | Información faltante |
| Create event | No encontrado como formulario. | No encontrado. | No encontrado. | Empty state sugiere agregar evento. | Información faltante |
| Edit event | No encontrado. | No encontrado. | No encontrado. | No encontrado. | Información faltante |
| Settings | Preferencias, idioma, tono aparecen como PerfilPersonal. | No especificado. | No encontrado. | No encontrado. | Parcial |

---

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Módulo | Uso posible | Clasificación |
| ----- | ----- | ----- | ----- |
| HomePlus — Todo tu hogar en un solo lugar. | Splash / Onboarding | Título splash | REAL MVP |
| Bienvenida, Mariana. Vamos a configurar tu hogar en 3 minutos. | Onboarding | Pantalla inicio | REAL MVP |
| Casa de los Robles | Household | Placeholder hogar | REAL MVP |
| Coordinador, Adulto, Adolescente, Niño, Adulto Mayor | Roles | Picker de rol onboarding | REAL MVP |
| Mariana / Sra. García | Perfil | Preferencia de tono | DEMO / parcial |
| HomePlus funciona mejor con todos. ¿A quién invita primero? | Invitaciones | Pantalla invitación | REAL MVP |
| Invitación enviada. Cuando la acepten, aparecen acá. | Invitaciones | Success state | REAL MVP |
| Cada miembro ve solo lo que le corresponde. La privacidad es prioridad en HomePlus. | Invitaciones / privacidad | Empty state / mensaje confianza | REAL MVP |
| Luca | Persona | Demo member | DEMO |
| Mati | Persona | Demo member | DEMO |
| Jose | Persona | Demo member | DEMO |
| Mariana | Persona | Demo member | DEMO |
| Tomás | Persona | Demo member | DEMO |
| Juan | Persona | Demo member | DEMO |
| Don Carlos | Persona / Senior | Demo senior | DEMO |
| Sacar el reciclaje antes de las 8 | Task | Tarea demo | REAL/DEMO |
| Reunión del cole mañana a las 17 | Task/Event | Evento o tarea escolar | DEMO |
| Martes de compras | Task | Tarea recurrente visual | DEMO |
| Lista de siempre | Task / compras | Copy compras | DEMO |
| Lista de compras por armar | Task / Home | Briefing fin de semana | DEMO |
| Dentista de Luca martes a las 16 | Event | Evento demo | DEMO |
| Reunión de Mariana martes a las 16 | Event | Conflicto demo | DEMO |
| Auto viernes a las 15 | Assets/Event | Conflicto recurso | DEMO / POST\_MVP |
| 4 tareas, 2 eventos, 1 documento por vencer | Home | Briefing | MOCK |
| 1 evento a las 16 | Home/Event | Próximo evento | DEMO |
| 2 tareas para hoy y 1 del lunes | Home/Tasks | Resumen | MOCK / REAL parcial |
| 70% Mariana / 30% Tomás | Home/Carga | Widget carga | MOCK |
| Tomás 5 tareas, Luca 1 | Home/Carga | Widget carga | MOCK |
| Supermercado $48.000 de $45.000 | Finance demo | Presupuesto demo | DEMO |
| Presupuesto 92% con 10 días | Finance demo | Card financiera | DEMO |
| Cédula verde del auto vence en 5 días | Assets / FamilyCloud demo | Vencimiento | DEMO |
| Carnet de obra social de Luca vence el 20 | FamilyCloud demo | Documento persona | DEMO |
| Luca ya está en casa | Presence demo | Estado miembro | MOCK |
| Mariana llegó al barrio | Presence demo | Estado llegada | MOCK |

---

## **18\. Servicios frontend / APIs / datos**

### **APIs**

No se encontró contrato API explícito en este documento.

No aparecen:

* endpoints;  
* métodos HTTP;  
* rutas;  
* request;  
* response;  
* status codes;  
* paginación;  
* filtros técnicos;  
* auth token;  
* Supabase client;  
* realtime subscriptions.

### **Datos / services inferibles desde archivo asociado, sin inventar contratos**

| Dominio | Datos que lista o expone | Acciones mencionadas | Clasificación |
| ----- | ----- | ----- | ----- |
| Home | Briefing, atención requerida, carga familiar, próximos eventos, tareas, finanzas relevantes, presence, actividad. | Abrir módulo implícito. | REAL parcial \+ MOCK |
| Planner | Task, Event, Calendar, Responsabilidad, PlantillaTarea, Verificación. | Completar tarea aparece por copy; crear/editar no detallado. | REAL parcial |
| People | Persona, Membresía, Rol, PerfilPersonal. | Invitar/aprobar relación asociada; UI no detallada. | REAL parcial |
| Invitations | Invitación → aceptación → aprobación → ingreso. | Invitar durante onboarding. | REAL MVP parcial |
| Geni | Briefing, sugerencias, notificaciones, pantalla Geni. | Recomendar/coordinar/automatizar con aprobación; no real. | DEMO / POST\_MVP |
| More | Finance, Inventory, FamilyCloud, Settings. | Abrir módulos. | DEMO PREMIUM |
| SearchGlobal | Persona, Task, Event, Documento, Settings. | Buscar. | POST\_MVP / DEMO |

### **Storage / local**

* Documento menciona sincronización pendiente y cambios guardados en el teléfono como copy de edge case.  
* Esto puede inspirar MOCK/LOCAL state, pero offline sync real queda POST\_MVP.  
* No se encontró AsyncStorage ni storage concreto.

---

## **19\. Realtime / sincronización visible**

### **Encontrado**

| Comportamiento | Fuente / copy | Clasificación |
| ----- | ----- | ----- |
| Error de conexión | “Sin conexión. Tus datos están seguros, se sincronizan cuando vuelvas.” | DEMO / POST\_MVP |
| Sincronización pendiente | “Falta sincronizar. Los cambios de hoy se guardaron en el teléfono.” | DEMO / POST\_MVP |
| Offline caches Task/Event según archivo asociado | Offline caches Task y Event. | POST\_MVP |
| Notificación contextual | Recordatorios de tarea, conflictos, presupuesto, documentos, presence, SOS. | DEMO / POST\_MVP si push real |

### **No encontrado**

No se encontró información específica sobre:

* Supabase Realtime;  
* broadcast;  
* listeners;  
* updates entre dispositivos;  
* invalidación de caché;  
* polling;  
* web sockets;  
* resolución de conflictos real;  
* optimistic updates.

---

## **20\. Permisos visibles en UI**

| Rol | Puede ver / tratamiento encontrado | No puede ver / restricción encontrada | Módulo afectado | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Coordinador | Carga desbalanceada, métricas de hogar, informe de escalamiento Nivel 3\. | No se detallan prohibiciones. | Home, Geni, Tasks | REAL / DEMO |
| Adulto | Tono de par, cálido y colaborativo. | No se detallan permisos. | Global | Parcial |
| Adolescente | Nombre de pila, tono de mentor joven. | No se detallan permisos. | Global / Tasks | Parcial |
| Niño | Nombre de pila; copy simple, visual, positivo. | “Esta sección es solo para adultos del hogar.” | Global / permisos | REAL parcial |
| Adulto Mayor | Usted \+ nombre; prioridad en esencial; recordatorios claros. | No se detallan permisos. | Global / medicación | Parcial |
| Invitado | Neutral, funcional, contexto mínimo. | No ve contexto del hogar, nombres de otros miembros, tareas ajenas ni métricas familiares. | Global / People / Tasks / Home | REAL MVP |
| Empleado Familiar | Solo información necesaria para trabajo asignado. | No administra el hogar; archivo asociado indica restricciones sobre tareas. | Fuera MVP | POST\_MVP |
| No coordinador | Ve datos propios; no comparaciones con otros miembros. | No ve carga desbalanceada ni métricas comparativas. | Home / Carga | REAL / DEMO |

Fuente: reglas de tratamiento y archivo asociado.

---

## **21\. Integraciones visibles entre módulos**

| Relación frontend | Información encontrada | Clasificación |
| ----- | ----- | ----- |
| Home → Briefing | Briefing es primer widget de Home. | MOCK / DEMO PREMIUM |
| Home → Tasks | WidgetTareas muestra tareas; Home resume tareas pendientes. | REAL MVP |
| Home → Events | WidgetPróximosEventos muestra eventos. | REAL MVP |
| Home → Atención requerida | Agrega tareas vencidas, pagos vencidos, aprobaciones pendientes y vencimientos según archivo asociado. | MIXTO |
| Home → Carga Familiar | WidgetCargaFamiliar analiza tareas; visible solo Coordinador. | MOCK / DEMO |
| Home → Presence | WidgetPresenceResumido muestra quién está en casa/en camino/llegó. | MOCK |
| Home → Feed | WidgetActividadFamiliar muestra actividad reciente. | MOCK / DEMO |
| Planner → People | Task assigned\_to Persona; Event has\_participant Persona. | REAL MVP parcial |
| Planner → Home | Task y Event alimentan widgets Home. | REAL MVP |
| Calendar → Events | Calendar administra eventos. | REAL MVP |
| SearchGlobal → Task/Event | Search indexa Task y Event. | POST\_MVP / DEMO |
| QuickActions → Geni | Quick Actions accede a PantallaGeni. | DEMO PREMIUM |
| More → Finance/Inventory/FamilyCloud/Settings | More contiene herramientas especializadas. | DEMO PREMIUM |
| Inventory → Task | Stock bajo puede generar tarea vía automatización. | POST\_MVP |
| Assets → Task | Mantenimiento puede generar tarea. | POST\_MVP |
| FamilyCloud → Event | Documento puede vincularse a Event; Event puede generar Recuerdo. | POST\_MVP / DEMO |
| Geni → Briefing | Geni genera Briefing. | MOCK en MVP |
| Geni → Automatización | Geni crea automatización con aprobación. | POST\_MVP |
| Geni → Permisos | Geni respeta permisos. | REAL como regla de visibilidad / no IA real |

---

## **22\. Edge cases frontend**

| Caso | Copy / comportamiento encontrado | Clasificación |
| ----- | ----- | ----- |
| Sin tareas | “No tenés tareas pendientes. Cuando te asignen una, aparece acá.” | REAL MVP |
| Sin eventos | “Calendario libre por ahora. ¿Agregamos un evento?” | REAL MVP |
| Sin miembros invitados | “Todavía no hay miembros invitados. ¿Agregamos al primero?” | REAL MVP |
| Sesión expirada | “Tu sesión terminó por seguridad. Volvé a entrar, es rápido.” | REAL MVP |
| Permiso denegado general | “No tenés acceso a esta sección. Solo visible para el Coordinador del hogar.” | REAL MVP |
| Permiso denegado Niño | “Esta sección es solo para adultos del hogar.” | REAL MVP |
| Error de conexión | “Sin conexión. Tus datos están seguros, se sincronizan cuando vuelvas.” | DEMO / POST\_MVP |
| Sincronización pendiente | “Falta sincronizar. Los cambios de hoy se guardaron en el teléfono.” | DEMO / POST\_MVP |
| Error al guardar | “No se pudo guardar. ¿Probás de nuevo? Si persiste, revisamos la conexión.” | REAL MVP |
| Datos inconsistentes | “Hay un dato que no coincide. ¿Lo revisamos juntos?” | DEMO |
| Funcionalidad no disponible | “Esta función todavía no está lista. Te avisamos cuando se active.” | DEMO / POST\_MVP |
| Tarea vencida | Varios copies de tarea pendiente desde ayer/lunes/jueves. | REAL / DEMO |
| Tarea completada | “Listo el reciclaje. 💜” | REAL MVP |
| Conflicto de horario | “El martes coinciden…” | DEMO / POST\_MVP si detección real |
| Carga desbalanceada | Solo visible Coordinador. | MOCK / DEMO |
| Invitado sin contexto | No ve nombres, tareas ajenas ni métricas. | REAL regla UI |
| SOS | Imperativo permitido solo en SOS. | DEMO / POST\_MVP |
| Documento vencido | “Este documento ya venció. ¿Necesitás ayuda para renovarlo?” | DEMO |
| Presupuesto alcanzado | Copy sin culpa. | DEMO |

---

## **23\. Copywriting y labels**

### **Labels / títulos / módulos**

* HomePlus  
* Home  
* People  
* Planner  
* More  
* Settings  
* Geni  
* Briefing  
* Quick Actions  
* Task  
* Calendar  
* Event  
* Finance  
* Inventory  
* FamilyCloud / HomeCloud  
* Presence  
* Feed  
* SOS  
* Automatizaciones  
* Hogar  
* Cuenta  
* Perfil  
* Miembro  
* Coordinador  
* Adulto  
* Adolescente  
* Niño  
* Adulto Mayor  
* Invitado  
* Empleado Familiar

### **Copy onboarding**

* “HomePlus — Todo tu hogar en un solo lugar.”  
* “Bienvenida, Mariana. Vamos a configurar tu hogar en 3 minutos.”  
* “¿Cómo le dicen a su casa?”  
* Placeholder: “Casa de los Robles”  
* “¿Cuál es su rol en el hogar?”  
* Opciones: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor  
* “¿A qué hora prefiere que le avise de las cosas del día?”  
* “¿Cómo quiere que le hable?”  
* Opciones: Mariana / Sra. García  
* “Primer paso listo. Ahora sumemos a los miembros del hogar.”  
* “Ya tiene su espacio. Cuando invite a alguien, todo se conecta solo.”  
* “HomePlus funciona mejor con todos. ¿A quién invita primero?”  
* “Invitación enviada. Cuando la acepten, aparecen acá.”  
* “Cada miembro ve solo lo que le corresponde. La privacidad es prioridad en HomePlus.”

### **Copy Home / Briefing**

* “Hoy: 4 tareas, 2 eventos y 1 documento por vencer. ¿Empezamos por las tareas?”  
* “Hoy tranquilo: 1 evento a las 16 y sin vencimientos. ☀️”  
* “Sábado. 1 tarea pendiente y la lista de compras por armar.”  
* “Todo al día por acá. Nada pendiente.”  
* “Sin tareas, sin vencimientos. Buen momento para lo que quieras.”  
* “Tenés 2 tareas para hoy y 1 del lunes.”  
* “Pendientes: 3 tareas, 1 documento. ¿Empezamos por lo urgente?”  
* “Esta semana la carga está 70% Mariana / 30% Tomás. ¿Querés revisar la distribución?”  
* “Tomás tiene 5 tareas asignadas, Luca 1\. ¿Ajustan algo entre todos?”

### **Copy tareas / Planner**

* “Luca, mañana te toca sacar el reciclaje antes de las 8.”  
* “Mati, la reunión del cole es mañana a las 17\. ¿Tenés los papeles listos?”  
* “Martes de compras. ¿Mantienen la lista de siempre?”  
* “Luca, tenés una tarea pendiente desde ayer. ¿La revisás hoy?”  
* “Luca, tu tarea sigue pendiente desde el lunes. ¿Necesitás ayuda para completarla?”  
* “Luca, ya van 3 días con esta tarea sin completar. Si no se resuelve hoy, mañana debo informar al Coordinador. ¿La revisamos juntos?”  
* “Te informo como Coordinador: Luca tiene 1 tarea pendiente desde el lunes. ¿Querés intervenir o esperamos?”  
* “Jose, las 2 tareas del finde quedaron sin completar. ¿Querés que te ayude a reorganizarlas?”  
* “Mariana, tenés 1 tarea pendiente desde el jueves. ¿La pasamos al finde o la revisás hoy?”  
* “Listo el reciclaje. 💜”  
* “Luca completó su lista de hoy. 🎯”  
* “Tercer día consecutivo con tus tareas al día. 💜”

### **Copy eventos / calendario**

* “El martes coinciden el dentista de Luca y la reunión de Mariana a las 16\. ¿Revisan?”  
* “El viernes dos personas necesitan el auto a las 15\. ¿Coordinan quién lo usa?”  
* “Calendario libre por ahora. ¿Agregamos un evento?”

### **Copy estados vacíos**

* “No tenés tareas pendientes. Cuando te asignen una, aparece acá.”  
* “Calendario libre por ahora. ¿Agregamos un evento?”  
* “Todavía no hay gastos este mes. Tocá \+ para agregar el primero.”  
* “El álbum está vacío. ¿Suben la primera foto?”  
* “Acá van a aparecer los documentos del hogar. Cédulas, obras sociales, seguros.”  
* “Todavía no hay miembros invitados. ¿Agregamos al primero?”

### **Copy errores**

* “Sin conexión. Tus datos están seguros, se sincronizan cuando vuelvas.”  
* “Falta sincronizar. Los cambios de hoy se guardaron en el teléfono.”  
* “No tenés acceso a esta sección. Solo visible para el Coordinador del hogar.”  
* “Esta sección es solo para adultos del hogar.”  
* “Tu sesión terminó por seguridad. Volvé a entrar, es rápido.”  
* “No se pudo guardar. ¿Probás de nuevo? Si persiste, revisamos la conexión.”  
* “Hay un dato que no coincide. ¿Lo revisamos juntos?”  
* “Esta función todavía no está lista. Te avisamos cuando se active.”

### **Palabras / expresiones prohibidas**

* “No hiciste”  
* “Estás fallando”  
* “Otra vez”  
* “Siempre lo mismo”  
* “Tenés que”  
* “Debés”  
* “Es tu obligación”  
* diminutivos no autorizados  
* “chiquis”  
* “bebé”  
* “corazón”  
* “Action items”  
* “Deliverables”  
* “Stakeholders”  
* “KPIs”  
* “Increíble”  
* “Genial”  
* “Terrible”  
* “Mal”  
* “Pésimo”  
* “Espectacular”  
* “Urgente” salvo SOS real  
* “Crítico”  
* “Fatal”  
* “Desastre”  
* comparaciones entre miembros  
* exclamaciones múltiples  
* más de un emoji por mensaje

Fuente: reglas de voz, glosario y checklist del documento principal.

---

## **24\. Restricciones técnicas frontend**

### **Encontrado**

* Mobile-first confirmado.  
* Tablet: 2 columnas.  
* Desktop: sidebar pendiente de confirmación.  
* Bottom Nav congelada: `[Home] [People] [+] [Planner] [More]`.  
* Settings solo en More.  
* Geni no tiene tab propio.  
* Geni aparece como pantalla completa accesible desde Quick Actions.  
* Home resume; módulos administran.  
* Máximo 1 emoji por mensaje de Geni.  
* Copy debe caber en 2 líneas de notificación mobile.  
* GPS crudo no debe salir del dispositivo hacia Geni; solo información procesada.  
* Automatizaciones requieren aprobación explícita antes de activarse.  
* Geni no marca tareas como completadas automáticamente.  
* Geni no reasigna tareas unilateralmente.  
* Carga desbalanceada solo visible para Coordinador.  
* No-coordinadores no ven comparaciones con otros miembros.  
* Invitado no ve contexto del hogar.  
* Privacidad de datos personales, memoria privada, documentos privados y finanzas personales.

### **No encontrado**

No se encontró información específica sobre:

* Expo;  
* React Native;  
* Supabase;  
* Realtime;  
* Storage;  
* Edge Functions;  
* librerías disponibles;  
* librerías ausentes;  
* performance técnico;  
* componentes nativos;  
* tokens de diseño;  
* AsyncStorage;  
* caché local concreta.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Impacto frontend | Recomendación para futura fusión |
| ----- | ----- | ----- | ----- |
| Geni real vs mock | El documento describe Geni como capa transversal real, pero para MVP actual no se debe implementar IA real. | Riesgo de sobredimensionar Home, Briefing, Search, Suggestions. | Usar Geni como DEMO PREMIUM/MOCK salvo copy y pantalla visual. |
| Estados de Task | Archivo asociado usa Pendiente, En progreso, Completada, Cancelada; MVP esperado usa pending, completed, awaiting\_verification, verified. | Puede generar contradicción en badges y filtros. | En merge, priorizar estados técnicos MVP definidos por fuente final; conservar copy de pendientes/completadas. |
| Verificación | Documento menciona Verificación opcional, pero no define flujo MVP `awaiting_verification`/`verified`. | UI puede quedar incompleta. | Usar solo como referencia parcial; completar desde documento Planner/API. |
| Calendar | Documento menciona Calendar y eventos, pero no define vistas día/semana/mes. | No alcanza para implementar calendar completo. | Usar copy y empty state; completar layout desde otras fuentes. |
| Quick Actions | Documento principal solo explicita PantallaGeni vía Quick Actions; archivo asociado sugiere acciones. | Riesgo de inventar menú de acciones. | En este fragment marcar acciones no explícitas como faltantes o demo. |
| More | Archivo asociado define More, pero documento principal no da UI. | Pantalla More puede quedar genérica. | Usar solo estructura de módulos, completar visual desde otra fuente. |
| Presence | Documento incluye llegada a casa/barrio; GPS/geocerca real está fuera. | Riesgo de implementar mapas reales. | Usar mock procesado, sin GPS real. |
| SOS | Copy de SOS aparece, pero el módulo real debe ignorarse para MVP actual. | Riesgo de abrir emergencia real. | Usar solo visual demo si hace falta; no implementar alerta real. |
| Finance | Copy financiero aparece, pero finanzas reales quedan fuera. | Riesgo de backend innecesario. | Usar cards demo en Home/More. |
| FamilyCloud | Copy de documentos/álbum aparece, pero storage real queda fuera. | Riesgo de implementar archivos reales. | Usar cards mock. |
| Roles | Documento define tono por rol, pero no permisos completos. | Botones visibles pueden estar mal. | Solo aplicar visibilidad explícita; permisos técnicos desde otra fuente. |
| Onboarding | Tiene copy y preguntas, pero no endpoints ni navegación técnica. | Falta implementación completa. | Usar como capa textual/UX; completar flujos desde Auth/Household. |
| Multi-hogar | Archivo asociado menciona independencia de hogares y selector, pero avanzado queda fuera. | Riesgo de complicar navegación. | Solo implementar hogar activo si otra fuente lo exige. |
| Offline | Copy de offline aparece, pero sync real es POST\_MVP. | Riesgo de prometer sync real. | Usar como mensaje demo o error general; no implementar offline real. |

---

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Layout visual exacto | Codex necesita jerarquía, spacing, cards y componentes. | Requiere otra fuente o decisión de merge. |
| Paleta de colores | Documento no define visual premium concreto. | No se puede extraer design system. |
| Tipografía | No hay fonts ni tamaños. | Falta consistencia visual final. |
| Íconos | No hay iconografía por módulo. | Debe definirse en otra etapa. |
| Navegación técnica | No hay stacks/rutas. | Requiere otra fuente. |
| Login/Register UI | Solo hay sesión expirada; no formularios auth. | Auth fragment visual queda incompleto. |
| Endpoints | No hay API contracts. | Services deben salir de otras fuentes. |
| Realtime | No hay sincronización entre dispositivos. | Demo multiusuario no se puede definir desde este documento. |
| Create/Edit Task form | No hay campos ni botones. | Planner real incompleto. |
| Create/Edit Event form | No hay campos ni botones. | Calendar real incompleto. |
| Calendar views | No hay día/semana/mes. | Calendar necesita otra fuente. |
| Verification Flow MVP | No hay estados `awaiting_verification`/`verified`. | Requiere fuente Planner/API. |
| Templates MVP | No aparecen las seis templates MVP completas como constantes. | Requiere otra fuente. |
| Members UI | No hay lista visual con avatar/estado. | People/Members necesita otra fuente. |
| Approve/reject UI | No hay pantalla de aprobación. | Invitations necesita otra fuente. |
| More layout | Solo estructura; no UI. | Demo More necesita diseño. |
| Quick Actions menu | No hay lista completa de acciones. | Debe definirse desde otra fuente. |
| Mock data suficiente para todos los módulos | Hay ejemplos, pero no dataset completo. | Requiere mock\_data\_fragment. |
| Estados de loading/skeleton | No aparecen. | Debe definirse en UX states final. |
| Validaciones | No hay validaciones de formularios. | Requiere otra fuente. |
| Permisos técnicos | Solo visibilidad parcial. | Requiere fuente de roles/permisos. |

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Mínimo | Hay tono, mobile-first, emojis y restricciones de copy; no hay colores/tokens. |
| `navigation_fragment` | Sí | Medio | Bottom Nav, Quick Actions, More, Settings, Home y PantallaGeni aparecen en archivo asociado. |
| `home_frontend_fragment` | Sí | Alto | Home/Briefing, widgets, copy y estados están bien cubiertos. |
| `planner_frontend_fragment` | Sí | Medio | Hay tareas, eventos, calendario, copy y relaciones; faltan formularios/API. |
| `people_members_frontend_fragment` | Parcial | Medio | Roles, tratamiento, visibilidad y membresía aparecen; falta UI detallada. |
| `household_invites_frontend_fragment` | Parcial | Medio | Onboarding e invitación tienen copy; falta aceptación/aprobación UI completa. |
| `auth_onboarding_frontend_fragment` | Sí | Medio | Onboarding está cubierto; auth técnico no. |
| `quick_actions_frontend_fragment` | Parcial | Mínimo | Aparece acceso a PantallaGeni y botón \+; falta menú completo. |
| `more_settings_frontend_fragment` | Parcial | Mínimo | More/Settings aparecen como estructura; falta UI. |
| `finance_demo_fragment` | Sí | Medio | Hay copy financiero y entidades demo. |
| `inventory_demo_fragment` | Parcial | Mínimo | Hay medicamentos/stock desde archivo asociado; poco UI. |
| `assets_demo_fragment` | Parcial | Mínimo | Hay documentos de auto y mantenimiento; poco UI. |
| `familycloud_demo_fragment` | Sí | Medio | Hay empty states y documentos/álbumes. |
| `presence_demo_fragment` | Sí | Medio | Hay copy de llegada y presencia operativa. |
| `geni_demo_fragment` | Sí | Alto | Documento completo define Geni UX Writing. |
| `mock_data_fragment` | Sí | Alto | Hay muchos nombres, tareas, eventos, vencimientos y mensajes. |
| `ux_states_fragment` | Sí | Alto | Empty states, errores, permisos y mensajes están bien cubiertos. |
| `frontend_services_fragment` | Parcial | Mínimo | Hay relaciones y datos, pero no endpoints ni contracts. |

---

## **28\. Conclusión operativa**

Este documento es especialmente útil para construir la **capa premium de UX, microcopy, estados, Home mock/real parcial, onboarding, roles visibles, Planner visual parcial y módulos demo**.

Debe usarse como fuente principal para:

* tono HomePlus;  
* mensajes de error;  
* estados vacíos;  
* copy de onboarding;  
* copy de invitaciones;  
* briefing mock;  
* widgets Home;  
* tareas y eventos demo;  
* restricciones de privacidad por rol;  
* Geni demo;  
* More demo;  
* estados visuales de permisos;  
* datasets mock creíbles.

No debe usarse como fuente única para:

* implementar Auth real;  
* definir backend;  
* crear endpoints;  
* definir Supabase;  
* implementar sincronización realtime;  
* crear Planner completo;  
* crear Calendar con vistas reales;  
* implementar IA real;  
* implementar Finance/Inventory/Assets/FamilyCloud/Presence reales;  
* resolver permisos técnicos completos.

Clasificación general del documento para frontend MVP:

* **REAL MVP:** onboarding copy, invitación copy, roles básicos visibles, Home con tareas/eventos reales parciales, Planner Tasks/Events como señales parciales, permisos visibles básicos, errores comunes.  
* **DEMO PREMIUM:** Geni, Briefing, Carga Familiar, Presence, Finance, FamilyCloud, Assets, Goals, Search, More visual.  
* **MOCK:** datos de briefing, carga familiar, activity, presence, finanzas, documentos, conflictos, goals.  
* **POST\_MVP:** IA real, automatizaciones reales, búsqueda global real, memoria Geni, push real, offline sync, GPS/geofencing, storage/OCR, comentarios, adjuntos, subtareas/dependencias avanzadas, permisos finos.

---

# **SOURCE 10 — DESIGN SYSTEM**

## **Archivo recomendado**

`Design system v1.txt`

## **Tipo de documento**

Design system / visual system

## **Uso para frontend**

Extraer:

* colores;  
* tipografía;  
* spacing;  
* radius;  
* sombras;  
* cards;  
* botones;  
* inputs;  
* navegación;  
* módulos visuales;  
* reglas premium;  
* motion si existe;  
* componentes reutilizables.

## **Contenido extraído**

# **frontend\_global\_fragment\_design\_system\_v1**

## **1\. Fuente**

* Documento principal: `HomePlus — Desing system v1.md`.  
* Archivo de comprensión asociado: `Design system v1.txt`.  
* Tipo de documento: Design System / UX visual / navegación / componentes base / reglas de interacción mobile-first.  
* Alcance declarado del documento: Mobile-first `375×812px`, React Native / Expo, modos `normal` y `senior`.  
* Documento canónico referenciado por el propio archivo: Final Spec V1 y UX Philosophy V2.  
* Utilidad para frontend premium MVP: Alta.  
* Motivo: aporta sistema visual, navegación global, componentes core, estados UX, reglas de accesibilidad, interacción 1-tap, Quick Actions, Bottom Nav, estructura de Home/People/Planner/More y criterios de “no implementar”. No aporta contratos backend completos ni pantallas funcionales detalladas.

---

## **2\. Utilidad frontend del documento**

Este documento sirve principalmente para construir la capa visual e interactiva premium del MVP.

Aporta información reutilizable para:

* Paleta visual tierra-cálida.  
* Tipografía.  
* Espaciado.  
* Radios.  
* Tokens.  
* Componentes base.  
* Accesibilidad.  
* Modo Adulto Mayor.  
* Bottom Nav oficial.  
* Quick Actions.  
* Home como centro operativo.  
* Planner como tab principal.  
* People como agrupador de Feed, Presence y Personas.  
* More como contenedor de herramientas especializadas.  
* Estados UX: loading, skeleton, empty state, toast, pressed, disabled, selected.  
* Reglas emocionales: no culpa, no ansiedad, no vigilancia, no presión social.  
* Reglas de navegación: máximo 4 niveles, 95% de acciones en ≤3 niveles.  
* Patrones de creación/edición: bottom sheets.  
* Patrones de confirmación: modales solo para consecuencias.  
* Patrones de acción: 1-tap, feedback inmediato, deshacer en acciones cotidianas.  
* Módulos visuales demo: Finance, Inventory, Assets, FamilyCloud, Presence, Feed, Geni, Automations, SOS, Goals.  
* Integraciones visibles entre Home, Planner, People, More y Quick Actions.

No aporta suficiente información para:

* Definir endpoints.  
* Definir requests/responses.  
* Definir esquemas completos.  
* Definir permisos backend finos.  
* Definir realtime real.  
* Definir formularios completos de Auth, Household, Planner o módulos demo.  
* Definir datos demo concretos suficientes para poblar todas las pantallas.

---

## **3\. Información de producto aplicable al frontend**

### **Principios generales**

* HomePlus debe sentirse como una app de hogar, no como una app corporativa de productividad.  
* La experiencia debe transmitir:  
  * calma;  
  * claridad;  
  * reconocimiento;  
  * pertenencia;  
  * control saludable.  
* La experiencia no debe transmitir:  
  * vigilancia;  
  * culpa acumulada;  
  * presión social;  
  * ansiedad por notificaciones.  
* La paleta debe sentirse como “entrar a una casa donde hay café recién hecho”, no como abrir una app de productividad.  
* El hogar no debe sentirse como oficina.  
* La app no debe agregar ruido.  
* La acción principal de cada pantalla debe poder ejecutarse con un solo toque.  
* Toda acción del usuario debe recibir feedback en menos de 100ms.  
* Spinner solo aparece si la operación tarda más de 300ms.  
* El mismo patrón de interacción debe producir el mismo resultado en toda la app.  
* Toda acción con consecuencia significativa debe ser reversible o requerir confirmación.  
* Las acciones cotidianas, como completar tarea, pueden tener deshacer de 5 segundos.  
* La complejidad se revela solo cuando el usuario la necesita.  
* La configuración avanzada nunca debe ser visible por defecto.  
* Más de 4 niveles de navegación es fallo.  
* Objetivo de navegación: 95% de acciones en ≤3 niveles.  
* Home resume información, no la administra.  
* Home siempre es la pantalla inicial.  
* El usuario no puede cambiar Home como pantalla inicial.  
* Mobile-first absoluto.  
* Toda pantalla se diseña primero para 375×812px.  
* Desktop y tablet son adaptaciones, no origen.  
* La acción principal siempre debe ubicarse en la zona de pulgar.  
* Adaptación por rol significa jerarquía distinta de información, no solo filtro de contenido.  
* Modo Adulto Mayor no es zoom; es re-arquitectura visual:  
  * fuente mínima ≥18px;  
  * touch targets ≥56px;  
  * alto contraste;  
  * solo tap;  
  * sin gestos complejos.  
* Gamificación infantil sin rankings ni comparación.  
* No se deben usar sonidos propios de la app.  
* Solo se aceptan notificaciones del sistema operativo.  
* Las animaciones no deben crear urgencia falsa.  
* No usar badges de culpa acumulada.  
* No usar rankings, leaderboards ni gráficos de productividad individual.  
* No usar notificaciones del tipo “Fulanito ya hizo X” como presión social.  
* Empty states reemplazan tutoriales.  
* Onboarding sin tutorial tradicional.  
* 60 segundos hasta primer valor visible.

### **Clasificación**

#### **REAL MVP**

* Mobile-first.  
* Home como pantalla inicial.  
* Bottom Nav oficial.  
* Acción principal 1-tap.  
* Feedback inmediato.  
* Empty states.  
* Skeleton/loading.  
* Toast superior.  
* Modo visual normal/senior si se implementa como parte del frontend.  
* Navegación Home / People / \+ / Planner / More.  
* Planner visible.  
* People visible.  
* More visible.  
* Quick Actions visible.  
* Home resume y conduce a módulos.

#### **DEMO PREMIUM**

* Módulos especializados en More.  
* Widgets avanzados de Home.  
* Geni como acceso visual desde Quick Actions.  
* Presence visible como estado visual.  
* Feed como sección visual dentro de People.  
* Goals dentro de Planner como referencia visual si no se implementa real.  
* Finance, Inventory, Assets, FamilyCloud como módulos visuales desde More.

#### **MOCK**

* Briefing si no hay IA real.  
* Carga Familiar si no hay cálculo real.  
* Presence si no hay GPS/check-in real.  
* Activity familiar si se usa sin feed real.  
* Módulos demo con datos locales.

#### **POST\_MVP**

* IA real.  
* Automatizaciones reales.  
* Offline Sync.  
* GPS real.  
* Geofencing.  
* OCR.  
* Reconocimiento facial.  
* Recap anual.  
* Línea temporal familiar.  
* Auditoría completa.  
* Push real.  
* Permisos finos.  
* Multi-hogar avanzado.

---

## **4\. Navegación y arquitectura de pantallas**

### **Bottom Nav oficial**

Estructura congelada V1:

\[ Home \] \[ People \] \[ \+ \] \[ Planner \] \[ More \]

* Bottom Nav es oficial e inmutable.  
* No se modifica sin enmienda a la especificación canónica.  
* Altura: 56px \+ safe-area-inset-bottom.  
* Fondo: `surface-card`.  
* Borde superior: `1px divider`.  
* Sombra: `0px -2px 12px rgba(0,0,0,0.06)`.  
* Tab activo:  
  * ícono filled;  
  * texto `prim-600`;  
  * weight 600\.  
* Tab inactivo:  
  * ícono outline;  
  * texto `text-tertiary`;  
  * weight 400\.  
* Badge sobre tab:  
  * badge sm;  
  * anclado top-right del ícono;  
  * usa success o alert;  
  * nunca error rojo.  
* Tap en tab activo:  
  * scroll to top;  
  * refresh de pantalla actual.

### **Tabs oficiales**

| Tab | Ícono | Destino | Contenido principal | Visible para | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Home | 🏠 | Home | Briefing, Atención, widgets | Todos | REAL MVP |
| People | 👥 | People | Feed, Presence, Personas | Todos | MIXTO: Members REAL básico / Feed y Presence demo |
| \+ | ➕ | Quick Actions | Geni fijo \+ acciones dinámicas | Todos | REAL visual / acciones mixtas |
| Planner | 📋 | Planner | Tasks, Calendar, Goals | Todos | Tasks/Calendar REAL MVP; Goals DEMO/POST\_MVP |
| More | ⋯ | More | Finance, Inventory, FamilyCloud, Settings | Todos | DEMO PREMIUM / Settings parcial |

### **Reglas canónicas**

* SOS no está en Bottom Nav.  
* SOS no está en Quick Actions.  
* SOS se accede vía swipe ↑ global.  
* Geni no tiene tab dedicado.  
* Geni es transversal.  
* People agrupa Feed, Presence y Personas.  
* Planner agrupa Tasks, Calendar y Goals.  
* More contiene herramientas especializadas Tier 3\.  
* Finance, Inventory, FamilyCloud y Settings viven en More.  
* Settings vive exclusivamente en More.  
* Search Global funciona como navegador interno accesible desde cualquier pantalla, pero no vive en Bottom Nav.  
* Multi-Hogar es selector global en header, no en More ni en Settings.  
* Multi-Hogar visible solo si el usuario pertenece a 2+ hogares.

### **Quick Actions**

* Se abre desde el botón central `+`.  
* Panel flotante.  
* Geni es slot fijo y siempre primero.  
* Acciones dinámicas por rol y contexto.  
* Acciones posibles:  
  * Crear tarea.  
  * Crear evento.  
  * Registrar gasto.  
  * Check-in.  
  * Escanear documento.  
  * Subir archivo.  
  * Ver pendientes.  
* Orden:  
  * fijadas por usuario;  
  * más usadas por frecuencia \+ recencia;  
  * menos usadas.

### **Tab Bar interna**

* Para sub-secciones dentro de dominio.  
* Altura: 44px.  
* Fondo: transparente o `bg-primary`.  
* Indicador: `3px prim-500`, `radius-full`, animado con slide.  
* Tab activo: `text prim-600`, weight 600\.  
* Tab inactivo: `text text-tertiary`, weight 400\.  
* Máximo 5 tabs por dominio.  
* People usa:  
  * Feed;  
  * Presence;  
  * Personas.  
* Planner usa:  
  * Tasks;  
  * Calendar;  
  * Goals.

### **Header / Multi-Hogar**

* Selector Multi-Hogar visible solo si el usuario pertenece a 2+ hogares.  
* Estructura:  
  * Avatar;  
  * nombre del hogar;  
  * flecha dropdown.  
* Avatar abre Perfil personal / Cuenta.  
* Nombre de hogar \+ flecha abre dropdown de cambio de hogar.  
* Si hay un solo hogar:  
  * header limpio;  
  * solo avatar;  
  * no se muestra selector.

### **Modales y bottom sheets**

* Bottom Sheet es opción principal mobile para crear/editar.  
* Modales centrados solo para confirmaciones con consecuencia.  
* No usar modal para formularios.  
* No usar modal para navegación entre niveles.

### **Clasificación**

* Bottom Nav: REAL MVP.  
* Header básico con avatar: REAL MVP.  
* Multi-Hogar selector: POST\_MVP si no hay multi-hogar avanzado; puede quedar oculto en MVP si hay un hogar.  
* Quick Actions panel: REAL visual; acciones internas mixtas.  
* Tab Bar interna Planner/People: REAL visual.  
* SOS swipe global: DEMO/POST\_MVP visual si se incluye; no real.  
* Search Global: POST\_MVP/DEMO PREMIUM.  
* Settings en More: DEMO PREMIUM / parcial.

---

## **5\. Pantallas detectadas**

| Pantalla / Área | Objetivo | Qué muestra | Acciones | Navegación | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo inicial | Briefing, Atención Requerida, widgets, Carga Familiar | Ver resumen, entrar a módulos | Tab Home; links a Planner/Calendar/Goals/otros | REAL MVP \+ MOCK/DEMO widgets |
| People | Coordinación humana | Feed, Presence, Personas | Navegar sub-secciones | Tab People; Tab Bar interna | Members parcial REAL; Feed/Presence DEMO |
| People \> Feed | Espacio social del hogar | Posts, comentarios, reacciones | Ver/interactuar visualmente | Dentro de People | DEMO PREMIUM / POST\_MVP real |
| People \> Presence | Ubicación/disponibilidad/check-ins | Estados, lugares, check-ins | Check-in/cambiar estado si demo | Dentro de People | DEMO PREMIUM / MOCK; GPS POST\_MVP |
| People \> Personas | Lista de miembros | Miembros, perfiles, roles | Abrir perfil | Dentro de People | REAL MVP básico |
| Quick Actions | Panel flotante de acciones rápidas | Geni fijo \+ acciones dinámicas | Crear tarea, crear evento, registrar gasto, check-in, escanear, subir, ver pendientes | Botón \+ central | REAL visual; acciones mixtas |
| Planner | Núcleo operativo | Tasks, Calendar, Goals | Navegar sub-tabs | Tab Planner; Tab Bar interna | REAL MVP para Tasks/Calendar; Goals demo/futuro |
| Planner \> Tasks | Gestión de tareas | Tareas, checkbox, estados, responsables si existen | Crear, completar, abrir detalle | Tab Planner \> Tasks | REAL MVP |
| Planner \> Calendar | Gestión de eventos | Eventos familiares/personales | Crear evento, ver evento | Tab Planner \> Calendar | REAL MVP mínimo |
| Planner \> Goals | Metas | Progreso/hitos visuales | Ver progreso | Tab Planner \> Goals | DEMO PREMIUM / POST\_MVP |
| More | Herramientas especializadas Tier 3 | Finance, Inventory, FamilyCloud, Settings | Abrir módulo | Tab More | DEMO PREMIUM |
| More \> Finance | Administración financiera | Cuentas, gastos, ingresos, fondos, presupuestos, deudas | Registrar gasto | More / Quick Actions | DEMO PREMIUM |
| More \> Inventory | Inventario del hogar | Consumibles, productos, medicamentos | Agregar ítem | More / Quick Actions | DEMO PREMIUM |
| More \> FamilyCloud | Memoria documental/emocional | Álbumes, recuerdos, documentos | Subir archivo/documento | More / Quick Actions | DEMO PREMIUM |
| More \> Settings | Configuración | Hogar, cuenta, sistema, auditoría | Configurar / ver settings | More / Search | DEMO PREMIUM / parcial |
| Profile / Cuenta | Perfil personal | Usuario, preferencias, idioma, memoria personal | Editar perfil | Avatar header | Parcial / no detallado |
| SOS Panel | Emergencias | Niveles 🔴 🟠 🟡 | Activar nivel / cancelar | Swipe ↑ global | DEMO visual; real POST\_MVP |
| Multi-Hogar dropdown | Cambiar hogar activo | Hogares disponibles | Cambiar hogar | Header global | POST\_MVP si multi-hogar avanzado |

---

## **6\. Componentes y patrones UI reutilizables**

### **Button**

Variantes:

* Primary.  
* Secondary.  
* Tertiary.  
* Danger.  
* Ghost.

Estados:

* default.  
* hover.  
* active/pressed.  
* disabled.  
* loading.

Tamaños normales:

| Size | Altura | Padding H | Font | Radius | Touch target |
| ----- | ----- | ----- | ----- | ----- | ----- |
| sm | 36px | 12px | caption | radius-sm | 44px |
| md | 44px | 16px | body | radius-md | 44px |
| lg | 52px | 20px | body L | radius-md | 52px |

Tamaños Adulto Mayor:

| Size | Altura | Padding H | Font | Radius | Touch target |
| ----- | ----- | ----- | ----- | ----- | ----- |
| sm | 44px | 16px | body | radius-md | 56px |
| md | 56px | 20px | body L | radius-md | 56px |
| lg | 64px | 24px | h4 | radius-md | 64px |

Reglas:

* Loading mantiene ancho.  
* Texto se reemplaza por spinner.  
* Botón permanece visualmente active.  
* Loading mínimo 400ms para evitar flicker.  
* Spinner aparece solo si operación \>300ms.  
* Todo tap en botón recibe háptico light.  
* En Adulto Mayor, háptico medium.

Clasificación: REAL MVP visual.

### **FAB**

* Acción principal de creación.  
* Posición: esquina inferior derecha.  
* Zona de pulgar.  
* Diámetro normal: 56px.  
* Diámetro Adulto Mayor: 64px.  
* Fondo: `prim-500`.  
* Texto/ícono: white.  
* Sombra: elevated.  
* Ícono: plus.

Visible en:

* Tasks → Crear tarea.  
* Calendar → Crear evento.  
* Finance → Registrar gasto.  
* Inventory → Agregar ítem.

No visible en:

* Home.  
* People \> Feed.  
* People \> Presence.  
* Settings.  
* HomeCloud.

Clasificación:

* Tasks/Calendar: REAL MVP.  
* Finance/Inventory: DEMO PREMIUM.  
* Resto: no mostrar.

### **Cards**

Card estándar:

* `bg: surface-card`.  
* `radius: radius-md (12px)`.  
* `padding: 16px`.  
* sombra: `0px 2px 8px rgba(0,0,0,0.06)`.  
* borde: none por defecto.  
* borde opcional: `1px divider-strong`.

Card destacada:

* Para Briefing, Atención Requerida, Reconocimiento.  
* `border-left: 4px prim-500`.  
* sombra cálida.

Card alerta:

* Para atención / presupuesto / vencimiento.  
* `bg: alert-100`.  
* `border-left: 4px alert-500`.  
* acción principal en `prim-600`.

Card de módulo:

* Para More.  
* Ícono 28px.  
* Nombre del módulo.  
* Indicador de estado opcional.  
* Chevron.  
* Padding 16px.  
* Gap 12px.

Reglas:

* Card no debe tener más de una acción primaria.  
* Acciones secundarias como ghost button o link text.  
* Home:  
  * máximo 3 cards para Coordinador;  
  * máximo 2 para Adulto;  
  * máximo 1 para Niño/Adulto Mayor.

Clasificación: REAL MVP visual / DEMO para módulos no reales.

### **Inputs**

Estados:

* Default.  
* Focus.  
* Filled.  
* Error.  
* Disabled.

Reglas:

* Todos los inputs tienen label arriba.  
* Placeholder no reemplaza label.  
* Placeholder complementa al label.  
* `accessibilityLabel` obligatorio.

Clasificación: REAL MVP visual.

### **Chips**

Uso:

* Filtros de dominio.  
* Selección de categorías/responsabilidades/estados.

Variantes:

* Default.  
* Outline.

Estados:

* default.  
* selected.

Tamaños:

* sm: 28px.  
* md: 32px.

Clasificación: REAL MVP visual.

### **Badges**

Variantes:

* Success.  
* Warning.  
* Error.  
* Info.  
* Neutral.

Reglas:

* No interactivos.  
* Siempre texto \+ color.  
* Nunca solo color como significado.  
* `accessibilityLabel` obligatorio.  
* Badge en Bottom Nav nunca usa error rojo.

Clasificación: REAL MVP visual.

### **Checkbox de tarea**

* Acción principal de Tasks.  
* Completar con 1-tap.  
* No abrir detalle para completar.  
* Tamaño normal: 24×24px.  
* Touch target normal: 44×44px.  
* Adulto Mayor: checkbox 32×32px, touch target 56×56px.  
* Estados:  
  * unchecked;  
  * pressed;  
  * checked.  
* Checked:  
  * `success-500`;  
  * ícono check blanco 14px.  
* Feedback:  
  * háptico light;  
  * tachado en título;  
  * `text-tertiary`;  
  * animación fill 300ms;  
  * scale 0.9→1.0 200ms.

Clasificación: REAL MVP para Planner Tasks.

### **Avatar**

* Con foto.  
* Sin foto con iniciales.  
* Con presencia.  
* Tamaños: xs, sm, md, lg, xl.  
* Tap en avatar abre perfil.  
* `accessibilityLabel`: `[Nombre], [rol]`.  
* `accessibilityHint`: “Toca para ver perfil”.  
* Indicadores:  
  * online;  
  * ausente hace \<30min;  
  * offline.

Clasificación:

* Members/People: REAL MVP básico.  
* Presence indicator: DEMO/MOCK si no hay presence real.

### **Bottom Navigation Bar**

Clasificación: REAL MVP.

### **Quick Actions Panel**

Clasificación: REAL visual; acciones mixtas.

### **SOS Panel**

Clasificación: DEMO visual / POST\_MVP real.

### **Bottom Sheet**

Clasificación: REAL MVP visual.

### **Modal centrado**

Clasificación: REAL MVP visual.

### **List Item**

* Leading:  
  * icon;  
  * avatar;  
  * checkbox;  
  * switch.  
* Trailing:  
  * badge;  
  * chip;  
  * chevron;  
  * monto.  
* Estados:  
  * default;  
  * pressed;  
  * selected;  
  * disabled.  
* Separador indentado.

Clasificación: REAL MVP visual.

### **Toast / Snackbar**

* Posición top.  
* Duración default 4s.  
* Adulto Mayor 8s.  
* Variantes: success, alert, error, info.  
* Máximo 1 visible.  
* Deshacer dura 5s.  
* Nunca toast para tareas completadas por otros miembros.

Clasificación: REAL MVP visual.

### **Progress Bar**

* Tareas/Goals: `prim-500`.  
* Inventory/Medicación: `sec-500`.  
* Finanzas/Presupuesto: `acent-500`.  
* Nunca muestra atraso o deuda visual.  
* Si alguien está atrasado en una tarea, se muestra pendiente sin error.  
* Error solo para bloqueos reales.

Clasificación: REAL visual / DEMO según módulo.

### **Empty State**

* Primera experiencia por dominio.  
* Tutorial implícito.  
* Sin tooltips.  
* Sin carruseles.  
* Ilustración sutil.  
* Título.  
* Descripción.  
* Acción sugerida.

Clasificación: REAL MVP visual.

### **Skeleton**

* Aparece si datos tardan \>300ms.  
* Pulse animation.  
* Fade-in al contenido.

Clasificación: REAL MVP visual.

### **Tab Bar**

* Para sub-secciones internas de dominio.  
* People: Feed | Presence | Personas.  
* Planner: Tasks | Calendar | Goals.

Clasificación: REAL MVP visual.

### **MultiHomeSelector**

* Header global.  
* Visible solo si 2+ hogares.  
* Clasificación: POST\_MVP / oculto si un hogar.

---

## **7\. Visual design aplicable**

### **Estilo general**

* Tierra-cálida.  
* Inspiración en hogares latinoamericanos.  
* Arcilla.  
* Madera.  
* Verdes vegetales.  
* Miel.  
* Cálido.  
* Sereno.  
* No corporativo.  
* No productividad fría.  
* No blanco puro como fondo.  
* No verde neón.  
* No rojo agresivo.  
* No amarillo chillón.  
* No pánico visual.  
* No ansiedad de notificaciones.

### **Colores primarios**

#### **Primario — Arcilla / Terracota**

* Transmite: tierra, hogar, calidez, arraigo.  
* 500: `#C17F59`.  
* 400: `#D49B78`.  
* 600: `#A86B45`.  
* 300: `#E3BAA0`.  
* 100: `#F2E0D4`.  
* 50: `#FAF3ED`.

#### **Secundario — Salvia / Musgo**

* Transmite: calma, naturaleza, crecimiento.  
* 500: `#7A9B7E`.  
* 400: `#94B097`.  
* 600: `#5F7F63`.  
* 300: `#B0C8B3`.  
* 100: `#D8E5DA`.  
* 50: `#EEF4EF`.

#### **Acento — Miel / Ámbar**

* Transmite: reconocimiento, celebración, calor.  
* 500: `#D4A853`.  
* 400: `#DFBC72`.  
* 600: `#BD8F38`.  
* 300: `#E8D09A`.  
* 100: `#F2E6CC`.

### **Colores semánticos**

* Éxito:  
  * base `#6B9E7A`;  
  * bg `#E1EFE5`;  
  * text `#558563`.  
* Alerta:  
  * base `#D4944A`;  
  * bg `#F7EBDB`;  
  * text `#B57930`.  
* Error:  
  * base `#C46B6B`;  
  * bg `#F5E2E2`;  
  * text `#A85050`.  
* Info:  
  * base `#7A8B9B`;  
  * bg `#E4E9ED`;  
  * text `#5F707F`.

### **Reglas de color**

* Máximo 3 colores principales simultáneamente por pantalla.  
* Color primario aparece en 1 o 2 elementos máximo por pantalla.  
* Colores semánticos solo aparecen cuando su estado está activo.  
* Fondos siempre neutros-cálidos.  
* Nunca blanco puro como fondo principal.  
* Barra de progreso nunca muestra atraso/deuda visual.  
* Error visual reservado para bloqueos reales.  
* Badge de navegación nunca usa error rojo.

### **Superficies**

Claro:

* `bg-primary #FBFAF8`.  
* `bg-secondary #F5F1EB`.  
* `surface-card #FFFFFF`.  
* `surface-elevated #FFFFFF`.  
* `surface-overlay rgba(45,42,38,0.50)`.  
* `divider #E8E3DC`.  
* `divider-strong #D5CFC7`.

Oscuro:

* `bg-primary #1C1A17`.  
* `bg-secondary #24211E`.  
* `surface-card #2C2925`.  
* `surface-elevated #332F2B`.  
* `surface-overlay rgba(0,0,0,0.65)`.  
* `divider #3D3933`.  
* `divider-strong #4F4A43`.

Senior:

* `text-primary #1A1714`.  
* `text-secondary #4A4540`.  
* `divider-strong #B5AFA5`.  
* overlay más opaco.  
* íconos bold.  
* focus ring 3px siempre visible en inputs.

### **Tipografía**

Fuentes:

* Display / H1-H2: Fraunces.  
* Body / UI / H3-H6: Inter.  
* Mono / Datos: JetBrains Mono.

Fallback:

* iOS: Georgia \+ SF Pro Text.  
* Android: Noto Serif \+ Roboto.

Escala normal:

* Display: 32/40.  
* H1: 28/36.  
* H2: 24/32.  
* H3: 20/28.  
* H4: 18/26.  
* Body L: 18/26.  
* Body: 16/24.  
* Body S: 14/20.  
* Caption: 12/16.  
* Label: 11/14.  
* Mono: 15/22.

Escala Senior:

* Display: 44/52.  
* H1: 36/44.  
* H2: 30/38.  
* H3: 24/32.  
* H4: 20/28.  
* Body L: 22/30.  
* Body: 18/26.  
* Body S: 16/24.  
* Caption: 14/20.  
* Label: 13/18.

### **Espaciado**

* Base: 4px.  
* Screen padding mobile: 20px.  
* Tablet padding: 24px.  
* Card padding: 16px.  
* Card compact: 12px.  
* Gap interno: 12px.  
* Adulto Mayor:  
  * screen padding 24px;  
  * card padding 20px;  
  * gap 16px.

### **Grid**

Mobile 375–428px:

* 4 columnas.  
* Margen lateral 20px.  
* Gutter 12px.

Tablet ≥768px:

* 8 columnas.  
* Margen lateral 24px.  
* Gutter 16px.

### **Radios**

* none: 0\.  
* sm: 6px.  
* md: 12px.  
* lg: 16px.  
* full: 9999px.

### **Tokens**

* Nivel 1: globales.  
* Nivel 2: semánticos.  
* Nivel 3: componentes.  
* Compatible con React Native StyleSheet y styled-components.

---

## **8\. Home**

### **Rol de Home**

* Home es centro operativo.  
* Home es punto de entrada inamovible.  
* Home siempre es pantalla inicial.  
* Home resume información.  
* Home no administra.  
* Home conduce al módulo correspondiente.  
* Home no es dashboard puro.  
* Home híbrido:  
  * briefing;  
  * acciones personales;  
  * atención.  
* Home debe evitar sobrecarga visual.

### **Contenido detectado**

Home contiene:

* Briefing.  
* Atención Requerida.  
* Carga Familiar.  
* Widgets.  
* Módulos condicionales de Finance.  
* Módulos condicionales de Presence.  
* Módulos condicionales de Inventory.  
* Módulos condicionales de Assets.  
* Links a Planner.  
* Links a Calendar.  
* Links a Goals.  
* Links a Finance.  
* Links a Presence.

### **Briefing**

* Primer widget de Home.  
* Generado por Geni según documento.  
* Resume información importante del hogar.  
* Flujo de datos detectado:  
  * origen: Geni;  
  * datos: briefing diario con tareas, eventos, finanzas, presencia, metas y alertas;  
  * destino: Home \> Briefing;  
  * propósito: resumir lo importante del hogar al abrir la app.

Clasificación:

* MOCK para MVP si no hay IA real.  
* DEMO PREMIUM como card visual.  
* IA real POST\_MVP.

### **Atención Requerida**

* Centraliza elementos urgentes.  
* Puede incluir:  
  * SOS;  
  * tareas vencidas;  
  * pagos vencidos;  
  * aprobaciones.  
* Flujo detectado:  
  * tareas pendientes/vencidas;  
  * lista de tareas con prioridad, responsable y fecha;  
  * destino Home \> Atención Requerida;  
  * propósito: centralizar elementos urgentes que requieren acción inmediata.

Clasificación:

* Tareas reales: REAL MVP si vienen de Planner.  
* Pagos/vencimientos: DEMO PREMIUM/MOCK.  
* SOS: DEMO/POST\_MVP.

### **Carga Familiar**

* Métrica de distribución de tareas.  
* Visible solo para Coordinador.  
* Flujo detectado:  
  * origen: tareas por responsable;  
  * datos: distribución de carga semanal;  
  * destino: Home \> Carga Familiar;  
  * propósito: mostrar al Coordinador el balance de tareas entre miembros.

Clasificación:

* MOCK/DEMO PREMIUM para MVP si no hay cálculo real.  
* Puede consumir Tasks reales en versión simple si existe data.

### **Widgets**

* Home muestra widgets.  
* Home cards máximas:  
  * Coordinador: 3 cards.  
  * Adulto: 2 cards.  
  * Niño/Adulto Mayor: 1 card.  
* Cards destacadas aplican a Briefing, Atención Requerida y Reconocimiento.  
* Card alerta aplica a vencimientos/contexto de atención.

### **Relación con Planner**

* Home links to Planner.  
* Home links to Calendar.  
* Home links to Goals.  
* Home puede mostrar tareas pendientes/vencidas.  
* Home puede mostrar próximos eventos si se extrae desde Calendar, aunque el documento no define la card específica.  
* Home resume, Planner administra.

### **Relación con módulos demo**

* Home puede mostrar Finance condicional.  
* Home puede mostrar Presence condicional.  
* Home puede mostrar Inventory condicional.  
* Home puede mostrar Assets condicional.  
* Estas relaciones son DEMO PREMIUM/MOCK salvo que otro documento las vuelva reales.

### **Clasificación**

#### **REAL MVP**

* Home como pantalla inicial.  
* Resumen de tareas si Planner real existe.  
* Resumen de eventos si Calendar real existe.  
* Links a Planner/Calendar.  
* Atención Requerida basada en tareas reales si hay data.

#### **MOCK**

* Briefing sin IA.  
* Carga Familiar sin cálculo real.  
* Presence sin GPS.  
* Activity familiar si no hay feed real.  
* Alertas de Finance/Inventory/Assets sin backend.

#### **DEMO PREMIUM**

* Cards de módulos secundarios.  
* Widgets avanzados.  
* Finance/Inventory/Assets/Presence snippets.

#### **POST\_MVP**

* Briefing IA real.  
* Automatizaciones reales.  
* Alerts reales desde módulos avanzados.  
* SOS real.  
* Notificaciones push reales.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner general**

* Planner es el núcleo operativo.  
* Planner vive en Bottom Nav.  
* Planner agrupa:  
  * Tasks;  
  * Calendar;  
  * Goals.  
* Planner visible para todos.  
* Planner usa Tab Bar interna:  
  * Tasks;  
  * Calendar;  
  * Goals.  
* Responsabilidades son eje organizador de Tasks.  
* Responsabilidades no son dominio independiente.  
* Goals vive dentro de Planner.

Clasificación:

* Planner shell: REAL MVP.  
* Tasks: REAL MVP.  
* Calendar: REAL MVP mínimo.  
* Goals: DEMO PREMIUM/POST\_MVP.

### **Tasks**

Información explícita:

* Gestión de tareas.  
* Puede tener:  
  * dependencias;  
  * recurrencias;  
  * subtareas;  
  * verificación;  
  * adjuntos;  
  * comentarios;  
  * timeline.  
* Tasks pertenece a Responsabilidades.  
* Tasks puede ser creado desde FAB.  
* Tasks puede ser creado desde Quick Actions.  
* Tasks puede ser actualizado con checkbox.  
* CheckboxTarea actualiza Tasks.  
* Usuario completa tarea con checkbox 1-tap \+ timestamp.  
* El completado actualiza estado de tarea y puede disparar dependencias.

#### **Acción principal**

* Completar tarea con checkbox 1-tap.  
* Sin abrir detalle.  
* Feedback inmediato \<100ms.  
* Háptico light.  
* Animación de fill y scale.  
* Tachado de título.  
* Deshacer 5s mediante toast.  
* No usar toast para tareas completadas por otros miembros.

#### **Responsabilidades detectadas**

* Compras.  
* Mascotas.  
* Limpieza.  
* Vehículos.

Descripción:

* Compras: agrupa tareas de adquisición de consumibles y productos del hogar.  
* Mascotas: agrupa tareas de cuidado animal.  
* Limpieza: agrupa tareas de mantenimiento del hogar.  
* Vehículos: agrupa tareas de mantenimiento vehicular; también categoría de Asset.

#### **Post-MVP en Tasks**

* Dependencias.  
* Recurrencias avanzadas.  
* Subtareas.  
* Verificación si no está definida por otro documento como MVP.  
* Adjuntos.  
* Comentarios.  
* Timeline.  
* Automatizaciones que generan tareas.  
* Inventory que genera tareas.  
* Assets que genera tareas.  
* Offline queue.  
* Auditoría por timeline.

### **Calendar / Events**

Información explícita:

* Calendar es parte de Planner.  
* Calendar gestiona eventos familiares y personales.  
* Calendar puede crearse desde FAB.  
* Crear evento aparece en Quick Actions.  
* Calendar se conecta con Home.  
* Calendar puede generar Recuerdos / Álbumes en FamilyCloud.  
* Offline puede poner en cola Calendar.  
* Navegación contextual conecta Tasks y Calendar.

Clasificación:

* Calendar shell y creación básica: REAL MVP mínimo si otro documento define datos.  
* FamilyCloud desde eventos: POST\_MVP / DEMO.  
* Offline Calendar: POST\_MVP.

No se encontró en este documento:

* vista día;  
* vista semana;  
* vista mes;  
* campos de evento;  
* all day;  
* ubicación;  
* participantes;  
* recurrencia simple;  
* evento cancelado;  
* conflicto de evento;  
* endpoints de eventos.

### **Goals**

Información explícita:

* Goals vive en Planner.  
* Goals contiene Hitos.  
* Hitos contienen Tasks.  
* Goals puede linkear con Fondos / Finance.  
* ProgressBar aplica a Goals.  
* Home puede linkear a Goals.

Clasificación:

* Goals: DEMO PREMIUM / POST\_MVP.  
* Hitos/Milestones: POST\_MVP.  
* Goals reales: no definir desde este documento.

### **Relación con Home**

* Home muestra tareas pendientes/vencidas en Atención Requerida.  
* Home muestra distribución de tareas en Carga Familiar.  
* Home linkea a Planner, Calendar y Goals.  
* Home resume, Planner administra.

### **Relación con Members**

* Tareas pueden tener responsable según flujo de Home \> Atención Requerida.  
* Carga Familiar usa tareas por responsable.  
* People/Members aporta roles, miembros y avatares para responsables.  
* El documento no define campo concreto de responsable.

### **Clasificación general Planner**

#### **REAL MVP**

* Tab Planner.  
* TabBar interna Tasks/Calendar/Goals.  
* Tasks como lista visual.  
* Checkbox 1-tap.  
* Crear tarea desde FAB / Quick Actions.  
* Calendar básico como sección.  
* Crear evento desde FAB / Quick Actions.  
* Home linkea a Planner/Calendar.  
* Empty state de Tasks.  
* Skeleton/loading.  
* Toast/deshacer.  
* Cards/ListItems.

#### **DEMO PREMIUM**

* Goals visual.  
* Responsabilidades visuales si no tienen backend.  
* Carga Familiar.  
* Planner snippets en Home.  
* Calendar → FamilyCloud visual no real.

#### **POST\_MVP**

* Dependencias.  
* Subtareas.  
* Comentarios.  
* Adjuntos.  
* Timeline.  
* Automatizaciones.  
* Inventory/Assets generando tareas.  
* Offline Sync.  
* Recurrencia compleja.  
* Auditoría completa.  
* Goals backend.

---

## **10\. People / Members / Roles**

### **People general**

* People agrupa:  
  * Feed;  
  * Presence;  
  * Personas.  
* Feed no es tab independiente.  
* Presence no es tab independiente.  
* Personas no es tab principal; vive dentro de People.  
* People es tab principal en Bottom Nav.  
* People visible para todos.

### **Personas / Members**

Información útil:

* Personas es lista de miembros y perfiles individuales.  
* Avatar abre perfil.  
* Avatar debe mostrar nombre/rol en accessibilityLabel.  
* Miembros pueden tener:  
  * nombre;  
  * avatar/foto;  
  * iniciales;  
  * rol;  
  * presencia visual;  
  * perfil individual.  
* La membresía vincula Persona y Hogar.  
* Estados de Membresía:  
  * Pendiente;  
  * Activa;  
  * Suspendida;  
  * Finalizada.  
* Hogar es unidad organizativa principal.  
* Todo ocurre dentro de un hogar.  
* Cuenta pertenece al usuario, no al hogar.  
* Multi-hogar independiente aparece como feature.

### **Roles detectados**

| Rol en documento | Descripción | Clasificación |
| ----- | ----- | ----- |
| Coordinador | Responsable administrativo principal del hogar; visión completa; gestión de miembros | REAL MVP |
| Adulto | Miembro operativo con amplios permisos; puede invitar, crear tareas, reasignar | REAL MVP |
| Adolescente | Autonomía progresiva; crea tareas propias, eventos, gastos; permisos ampliables | REAL MVP |
| Niño | Experiencia simplificada; solo completa tareas; rachas visuales sin presión | REAL MVP / gamificación POST\_MVP |
| Adulto Mayor | Experiencia adaptada: fuente grande, alto contraste, sin gestos complejos, medicación priorizada | REAL MVP visual |
| Invitado | Acceso mínimo y participación limitada | REAL MVP |
| Empleado Familiar | Colaborador operativo: niñera, jardinero, chofer; acceso restringido a responsabilidades asignadas | POST\_MVP salvo que otro documento lo incluya |

### **Permisos visibles detectados**

* Coordinador:  
  * gestiona hogar;  
  * ve Carga Familiar.  
* Adulto:  
  * puede invitar;  
  * puede crear tareas;  
  * puede reasignar.  
* Adolescente:  
  * crea tareas propias;  
  * crea eventos;  
  * crea gastos;  
  * permisos ampliables.  
* Niño:  
  * solo completa tareas;  
  * experiencia simplificada.  
* Adulto Mayor:  
  * experiencia adaptada visualmente.  
* Invitado:  
  * acceso mínimo.  
* Empleado Familiar:  
  * acceso restringido a responsabilidades asignadas;  
  * horario laboral asociado.

No se encontró:

* matriz completa de permisos.  
* permisos por pantalla.  
* permisos de edición/eliminación.  
* permisos de invitación detallados.  
* permisos de Planner completos.  
* permisos de Household completos.

### **Relación con Planner**

* Members/Personas sirven para:  
  * responsables de tareas;  
  * participantes de eventos si se implementa;  
  * Carga Familiar;  
  * avatares en listas;  
  * asignación visual.  
* Adulto puede crear tareas/reasignar.  
* Niño solo completa tareas.  
* Adolescente crea tareas propias/eventos.  
* Documento no define formularios de asignación.

### **Relación con Home**

* Carga Familiar visible solo para Coordinador.  
* Home se adapta por rol.  
* Home de Coordinador ≠ Home de Niño.  
* Home puede mostrar información de miembros si se usa widget.

### **Presence visual**

* Avatar puede tener indicador de presencia.  
* Presence incluye ubicación/disponibilidad/check-ins/lugares/geocercas.  
* Para MVP visual: presencia puede ser DEMO/MOCK.  
* GPS/geocercas reales: POST\_MVP.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

Información detectada:

* Hogar es unidad organizativa principal.  
* Todo ocurre dentro de un hogar.  
* Multi-hogar independiente.  
* Multi-Hogar selector global en header.  
* Selector visible solo si el usuario pertenece a 2+ hogares.  
* Si solo hay 1 hogar, header limpio con solo avatar.  
* Nombre de hogar \+ flecha abre dropdown de cambio de hogar.  
* Avatar abre Perfil personal / Cuenta.  
* Coordinador gestiona Hogar.

Clasificación:

* Hogar activo como contexto visual: REAL MVP.  
* Crear hogar: no definido visualmente en este documento.  
* Configuración básica del hogar: no definida.  
* Multi-Hogar avanzado: POST\_MVP.

### **Membership**

Información detectada:

* Membresía relaciona Persona y Hogar.  
* Estados:  
  * Pendiente;  
  * Activa;  
  * Suspendida;  
  * Finalizada.  
* Membresía asigna roles.  
* Membresía linkea Hogar.

Clasificación:

* Estado visual de membership: REAL MVP si se usa para members/pending.  
* Gestión completa: no definida en este documento.

### **Invitations**

Información detectada:

* Adulto puede invitar.  
* Invitaciones como flujo/pantalla no están detalladas.  
* No se encontró link/código/token.  
* No se encontró aceptar invitación.  
* No se encontró pending approval UI.  
* No se encontró aprobar/rechazar en UI.  
* No se encontró copy de invitación.

Clasificación:

* Invitar desde Adulto: dato de permisos parcial.  
* UI de invitaciones: faltante.  
* Backend/API: faltante.

### **Onboarding**

Información detectada:

* Onboarding es flujo de ingreso adaptado por rol.  
* 60 segundos hasta primer valor visible.  
* Sin tutoriales.  
* Sin tooltips.  
* Empty states como guía.  
* Geni puede personalizar onboarding según relación inferida en archivo de comprensión, pero con confianza baja.

Clasificación:

* Onboarding visual por rol: REAL MVP conceptual.  
* IA/Geni personalizando onboarding: POST\_MVP/MOCK.  
* Formularios de onboarding: no definidos.

---

## **12\. More / Settings / Profile**

### **More**

* More es tab principal de Bottom Nav.  
* More contiene herramientas especializadas Tier 3\.  
* More incluye:  
  * Finance;  
  * Inventory;  
  * FamilyCloud;  
  * Settings.  
* Finance, Inventory, FamilyCloud y Settings viven en More.  
* No viven en Bottom Nav.  
* More usa cards de módulo.  
* Card de módulo:  
  * ícono 28px;  
  * nombre;  
  * indicador de estado opcional;  
  * chevron;  
  * padding 16px;  
  * gap 12px.

Clasificación:

* More shell: DEMO PREMIUM / visual necesario.  
* Settings visual: DEMO PREMIUM/parcial.  
* Finance/Inventory/FamilyCloud: DEMO PREMIUM.

### **Settings**

* Settings vive exclusivamente en More.  
* Search Global puede indexar Settings para acceso rápido.  
* Settings contiene:  
  * Hogar;  
  * Cuenta;  
  * Sistema;  
  * Auditoría.  
* Auditoría es registro permanente de cambios importantes:  
  * autor;  
  * fecha;  
  * acción;  
  * entidad afectada.

Clasificación:

* Settings visual: DEMO PREMIUM.  
* Auditoría real: POST\_MVP.  
* Ajustes críticos reales: no definidos.

### **Profile / Cuenta**

* Cuenta pertenece al usuario, no al hogar.  
* Cuenta contiene:  
  * perfil;  
  * preferencias;  
  * idioma;  
  * memoria personal de Geni.  
* Avatar abre Perfil personal / Cuenta.  
* Memoria personal de Geni nunca se comparte automáticamente.

Clasificación:

* Perfil visual: parcial/REAL si existe auth.  
* Memoria personal Geni: POST\_MVP.  
* Preferencias/idioma: no detallado.

---

## **13\. Quick Actions**

### **Estructura visual**

* Panel flotante.  
* Se abre desde `+` central de Bottom Nav.  
* Fondo:  
  * blur(4px);  
  * `surface-overlay`.  
* Contenedor:  
  * `surface-card`;  
  * `radius-lg 16px`;  
  * padding 8px.  
* Animación:  
  * fade in;  
  * slide up;  
  * 200ms ease-out.  
* Geni fijo, siempre primero.  
* Acciones dinámicas debajo.  
* Scroll horizontal si hay muchas acciones.

### **Acciones detectadas**

| Acción | Módulo | Clasificación | Notas |
| ----- | ----- | ----- | ----- |
| Geni | Geni | DEMO PREMIUM / POST\_MVP IA real | Slot fijo, siempre primero |
| Crear tarea | Planner / Tasks | REAL MVP | Acción rápida aplicable |
| Crear evento | Planner / Calendar | REAL MVP | Acción rápida aplicable |
| Registrar gasto | Finance | DEMO PREMIUM | No backend real desde este documento |
| Check-in | Presence | DEMO PREMIUM / MOCK | GPS real POST\_MVP |
| Escanear documento | FamilyCloud | DEMO PREMIUM / POST\_MVP | OCR/storage real POST\_MVP |
| Subir archivo | FamilyCloud | DEMO PREMIUM / POST\_MVP | Storage real POST\_MVP |
| Ver pendientes | Home/Planner | REAL MVP si usa tasks reales | Puede abrir Planner/Atención |

### **Orden**

* Acciones fijadas por usuario.  
* Más usadas por frecuencia \+ recencia.  
* Menos usadas.  
* Geni no participa del orden; es slot fijo.

### **Reglas**

* Geni no tiene tab propio.  
* Geni entra por Quick Actions.  
* SOS no está en Quick Actions.  
* SOS se accede vía swipe ↑.

---

## **14\. Módulos demo premium**

### **Finance demo**

Información detectada:

* Vive en More.  
* Puede aparecer condicionalmente en Home.  
* Contiene:  
  * Cuentas;  
  * Gastos;  
  * Ingresos;  
  * Fondos;  
  * Presupuestos;  
  * Deudas.  
* Quick Actions puede registrar gasto.  
* FAB visible en Finance para registrar gasto.  
* ProgressBar usa acento/miel para Finanzas/Presupuesto.  
* Finance \> Presupuestos puede enviar alerta a Home \> Atención Requerida si \>90%.  
* Gastos pueden tener comprobantes.  
* Ajuste manual corrige saldo y queda auditado.

Clasificación:

* DEMO PREMIUM.  
* Backend real financiero: no implementar desde este documento.  
* Auditoría real/comprobantes reales: POST\_MVP.

### **Inventory demo**

Información detectada:

* Vive en More.  
* Puede aparecer condicionalmente en Home.  
* Contiene:  
  * Consumibles;  
  * Productos del Hogar;  
  * Medicamentos.  
* FAB visible en Inventory para agregar ítem.  
* Inventory puede generar Tasks.  
* Inventory \> Stock bajo puede crear tarea de reposición automáticamente por Automatizaciones.  
* Inventory \> Stock puede alertar Home \> Atención Requerida.  
* Medicamentos pueden generar Notificaciones.  
* ProgressBar para Inventory/Medicación usa Salvia.

Clasificación:

* DEMO PREMIUM.  
* Stock real/automatización real/notificaciones reales: POST\_MVP.  
* Generar tareas real desde Inventory: POST\_MVP.

### **Assets demo**

Información detectada:

* Puede aparecer condicionalmente en Home.  
* Contiene:  
  * Vehículos;  
  * Mascotas;  
  * Dispositivos;  
  * Propiedades.  
* Assets puede generar Tasks.  
* Assets tracks:  
  * Mantenimiento;  
  * Vencimientos.  
* Vencimientos incluyen documentos de activos:  
  * seguro;  
  * VTV;  
  * patente.  
* Assets \> Vencimientos puede alertar Home \> Atención Requerida.  
* Mantenimientos/vencimientos generan notificaciones.

Clasificación:

* DEMO PREMIUM.  
* Generación real de tareas/notificaciones: POST\_MVP.

### **FamilyCloud / HomeCloud demo**

Información detectada:

* Vive en More.  
* Contiene:  
  * Álbumes;  
  * Recuerdos;  
  * Documentos;  
  * Papelera.  
* Documentos pueden relacionarse con Assets, Gastos, Goals.  
* Calendar puede generar Recuerdos.  
* Evento finalizado puede sugerir creación de recuerdo con fotos.  
* Calendar puede crear álbum automático asociado al evento.  
* Recuerdo creado puede generar Post en Feed.  
* OCR futuro.  
* Reconocimiento facial futuro.  
* Recap anual futuro.  
* Línea temporal familiar futura.  
* Exportación de recuerdos, álbumes y documentos.

Clasificación:

* DEMO PREMIUM visual.  
* Storage real/OCR/reconocimiento facial/recap/línea temporal/exportación: POST\_MVP.

### **Presence demo**

Información detectada:

* Dentro de People.  
* Puede aparecer condicionalmente en Home.  
* Contiene:  
  * Lugares;  
  * Geocercas;  
  * Check-ins.  
* Estados:  
  * EstadoManual: No molestar, Descansando, Estudiando.  
  * EstadoAutomático: En casa, En trabajo, En tránsito.  
* Avatar puede mostrar indicador de presencia:  
  * online;  
  * ausente hace \<30min;  
  * offline.  
* ComprasCerca usa Presence \+ Inventory.  
* Presence \> Geocercas dispara Automatizaciones.

Clasificación:

* DEMO PREMIUM / MOCK.  
* GPS/geocercas reales: POST\_MVP.  
* ComprasCerca real: POST\_MVP.

### **Geni demo**

Información detectada:

* Capa de inteligencia transversal.  
* Sin tab propio.  
* Acceso principal vía Quick Actions.  
* Opera sobre todo el ecosistema.  
* Genera Briefing.  
* Usa Memoria Personal.  
* Usa Memoria Familiar.  
* Integra con:  
  * Planner;  
  * Finance;  
  * Presence;  
  * FamilyCloud;  
  * Automatizaciones;  
  * SearchGlobal.  
* Powers Home.  
* Puede personalizar onboarding según relación inferida, con confianza baja.

Clasificación:

* DEMO PREMIUM como entrada visual / mensajes mock.  
* IA real, memoria real, personalización real: POST\_MVP.

### **Feed demo**

Información detectada:

* Dentro de People.  
* Espacio social del hogar.  
* Posts.  
* Comentarios.  
* Reacciones.  
* Recuerdos pueden generar Post.  
* Recap anual puede agregar actividad del Feed.

Clasificación:

* DEMO PREMIUM visual.  
* Feed real/comentarios reales/reacciones reales: POST\_MVP salvo otro documento.

### **SOS demo**

Información detectada:

* Acceso global vía swipe ↑.  
* No en Bottom Nav.  
* No en Quick Actions.  
* Siempre abre panel.  
* Nunca dispara alerta sin interacción.  
* Niveles:  
  * 🔴 Emergencia grave;  
  * 🟠 Necesito ayuda;  
  * 🟡 Coordinación urgente.  
* Fondo nunca rojo.  
* No generar pánico visual.  
* Háptico heavy exclusivo para SOS.  
* Permisos visuales por rol:  
  * Coordinador: 🔴 🟠 🟡.  
  * Adulto: 🔴 🟠 🟡.  
  * Adolescente: 🔴 🟠 🟡.  
  * Niño: 🟠 🟡.  
  * Adulto Mayor: 🔴 🟠 🟡.  
  * Empleado Familiar: 🟠 🟡.  
* Escalado SOS:  
  * Coordinador → Adultos → Personas relevantes.  
* SOS silencioso:  
  * alerta sin señales visibles en dispositivo emisor.

Clasificación:

* DEMO PREMIUM visual.  
* Emergencia real/escalado/notificaciones/ubicación: POST\_MVP.

### **Automations demo**

Información detectada:

* Automatización basada en eventos:  
  * SI ocurre X → ENTONCES hacer Y.  
* Usa Geni.  
* Dispara Tasks.  
* Dispara Notificaciones.  
* Monitorea Presence, Inventory, Assets, Finance.  
* Biblioteca de automatizaciones:  
  * Llegó a casa;  
  * Stock bajo;  
  * Pago próximo;  
  * Mantenimiento pendiente;  
  * Cumpleaños próximo.

Clasificación:

* DEMO PREMIUM visual si aparece como card.  
* Automatizaciones reales: POST\_MVP.

### **Goals demo**

Información detectada:

* Dentro de Planner.  
* Goals contiene Hitos.  
* Hitos contiene Tasks.  
* Link con Fondos/Finance.  
* ProgressBar usa primario.  
* Home linkea Goals.  
* Recap anual agrega Goals cumplidos.

Clasificación:

* DEMO PREMIUM visual.  
* Goals backend/hitos/milestones reales: POST\_MVP.

### **Notifications**

Información detectada:

* Sistema de notificaciones con categorías, prioridades y canales:  
  * Push;  
  * Email;  
  * In-App.  
* Notificaciones notifican a roles.  
* Medicamentos, mantenimiento y vencimientos pueden generar notificaciones.  
* Automatizaciones generan notificaciones.

Clasificación:

* Visual in-app demo: DEMO PREMIUM.  
* Push/email reales: POST\_MVP.

### **Search**

Información detectada:

* SearchGlobal es navegador interno.  
* Busca en todos los dominios.  
* Accesible desde cualquier pantalla.  
* Search indexa Settings.  
* Search busca Tasks, Finance, Settings.

Clasificación:

* DEMO PREMIUM / POST\_MVP.  
* Search real global: POST\_MVP salvo otro documento.

### **Activity / Load**

* Carga Familiar es métrica de distribución de tareas.  
* Visible solo para Coordinador.  
* Activity familiar como tal no aparece detallada; Feed y Timeline cubren actividad social/tarea.  
* Timeline de tarea: POST\_MVP.  
* Carga Familiar: MOCK/DEMO PREMIUM en MVP.

---

## **15\. Estados UX y feedback**

### **Estados visuales detectados**

#### **Loading**

* Botón loading mantiene ancho.  
* Texto se reemplaza por spinner.  
* Spinner aparece si operación \>300ms.  
* Loading mínimo 400ms en botón para evitar flicker.

#### **Skeleton**

* Aparece cuando datos tardan \>300ms.  
* Animación pulse.  
* Fade-in al contenido.

#### **Empty**

* Empty State por dominio.  
* Ilustración sutil.  
* Título.  
* Descripción.  
* Acción sugerida.  
* Tutorial implícito.  
* No tooltips/carruseles.

#### **Pressed**

* Botones tienen estado active/pressed.  
* ListItem pressed usa `bg prim-50`.  
* Checkbox pressed usa `bg prim-50`, border `prim-300`.

#### **Selected**

* ListItem selected usa `bg prim-50 + borde izquierdo 3px prim-500`.  
* Chip selected usa `prim-500` y texto white.

#### **Disabled**

* Botones/input/list items tienen disabled.  
* Inputs disabled:  
  * border divider;  
  * bg-secondary;  
  * text-disabled;  
  * opacity 0.6.

#### **Error**

* Input error:  
  * border error-500;  
  * ring error-100;  
  * texto debajo en caption error-600.  
* Toast error:  
  * borde izquierdo error-500;  
  * háptico warning.  
* Error visual fuerte solo para bloqueos reales.

#### **Success**

* Badge success.  
* Toast success.  
* Checkbox checked con success-500.

#### **Alert / Warning**

* Badge warning.  
* Toast alert.  
* Card alerta.  
* Alertas sin alarma visual agresiva.

#### **Refreshing**

* Tap en tab activo hace refresh.  
* Pull-to-refresh funciona en listas.  
* Pull-to-refresh no funciona en modo Adulto Mayor.

#### **Pending / overdue / completed**

* Tareas pendientes/vencidas alimentan Home \> Atención Requerida.  
* Tarea completada usa checkbox checked, tachado y success.  
* Tarea atrasada se muestra como pendiente, no como deuda/error visual.

#### **Forbidden / permiso**

* No se encontró estado forbidden detallado.  
* Botones visibles/deshabilitados por rol no están definidos salvo permisos parciales.

#### **Offline**

* Offline existe como servicio con cola de sincronización.  
* Tokens de diseño deben funcionar offline por ser estáticos una vez cargados.  
* Offline Sync real: POST\_MVP.

### **Feedback**

* Háptico light en botones.  
* Háptico medium en Adulto Mayor.  
* Háptico light en checkbox de tarea.  
* Háptico warning en toast error.  
* Háptico heavy exclusivo SOS.  
* No sonidos propios.  
* Animaciones máximas 500ms.  
* prefers-reduced-motion respetado.  
* Transiciones instantáneas si reduced motion.

---

## **16\. Formularios y datos de entrada**

### **Formularios explícitos detectados**

No se encontró definición completa de formularios de:

* Login.  
* Register.  
* Forgot password.  
* Create household.  
* Invite member.  
* Join household.  
* Profile.  
* Create task.  
* Edit task.  
* Create event.  
* Edit event.  
* Settings.  
* Finance.  
* Inventory.  
* FamilyCloud.

### **Patrones de formulario sí detectados**

#### **Inputs**

* Label arriba obligatorio.  
* Placeholder no reemplaza label.  
* accessibilityLabel obligatorio.  
* Estados:  
  * default;  
  * focus;  
  * filled;  
  * error;  
  * disabled.  
* Tamaños:  
  * sm;  
  * md;  
  * lg.  
* Focus ring 3px.

#### **Botones de formulario**

* Primary para acción principal.  
* Secondary/Ghost para acción secundaria.  
* Loading mantiene ancho.  
* Spinner si \>300ms.  
* Loading mínimo 400ms.

#### **Bottom Sheet para formularios**

* Crear/editar debe usar bottom sheet.  
* Alturas:  
  * 50% formularios simples;  
  * 75% formularios complejos/listas;  
  * 90% edición detallada.  
* Footer sticky con acción secundaria y primaria.  
* No usar modal para formulario.

#### **Confirmación**

* Modal centrado solo para:  
  * eliminación;  
  * expulsión;  
  * cambio de rol;  
  * cierre con cambios sin guardar.

### **Clasificación**

* Patrones de formulario: REAL MVP visual.  
* Campos específicos: faltantes.

---

## **17\. Datos demo extraíbles**

### **Roles**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

### **Responsabilidades / categorías operativas**

* Compras.  
* Mascotas.  
* Limpieza.  
* Vehículos.

### **Estados Presence**

* Online / en casa / disponible.  
* Ausente hace \<30min / salió recientemente.  
* Offline / sin datos de presencia.  
* No molestar.  
* Descansando.  
* Estudiando.  
* En casa.  
* En trabajo.  
* En tránsito.

### **Módulos**

* Home.  
* People.  
* Planner.  
* More.  
* Tasks.  
* Calendar.  
* Goals.  
* Feed.  
* Presence.  
* Personas.  
* Finance.  
* Inventory.  
* FamilyCloud.  
* Settings.  
* SOS.  
* Geni.  
* Automations.  
* SearchGlobal.

### **Finance entidades/demo**

* Cuentas.  
* Gastos.  
* Ingresos.  
* Fondos.  
* Presupuestos.  
* Deudas.  
* Comprobantes.  
* AjusteManual.

### **Inventory entidades/demo**

* Consumibles.  
* Productos del Hogar.  
* Medicamentos.  
* Stock bajo.  
* Lista de reposición implícita por tareas.

### **Assets entidades/demo**

* Vehículos.  
* Mascotas.  
* Dispositivos.  
* Propiedades.  
* Mantenimiento.  
* Vencimientos.  
* Seguro.  
* VTV.  
* Patente.

### **FamilyCloud datos/demo**

* Álbumes.  
* Recuerdos.  
* Documentos.  
* Papelera.  
* Fotos.  
* Videos.  
* Texto.

### **Automatizaciones prearmadas**

* Llegó a casa.  
* Stock bajo.  
* Pago próximo.  
* Mantenimiento pendiente.  
* Cumpleaños próximo.

### **SOS niveles**

* 🔴 Emergencia grave.  
* 🟠 Necesito ayuda.  
* 🟡 Coordinación urgente.  
* Cancelar.

### **Copy explícito**

* “Acá van a aparecer tus tareas”.  
* “Cuando alguien te asigne una tarea, la vas a ver acá.”  
* “Toca para ver perfil”.  
* “Deshacer”.  
* “Familia Bazán” aparece como ejemplo visual de selector multi-hogar.

### **Datos faltantes**

* Nombres reales de miembros.  
* Nombres de tareas.  
* Nombres de eventos.  
* Ejemplos de gastos.  
* Ejemplos de productos.  
* Ejemplos de mascotas.  
* Ejemplos de vehículos.  
* Ejemplos de documentos.  
* Ejemplos de activity feed.  
* Copy completo de pantallas.  
* Mensajes de error concretos.  
* Labels de formularios concretos.

---

## **18\. Servicios frontend / APIs / datos**

### **Información detectada útil para services**

No se encontraron contratos API explícitos.

Sí se detectan acciones/datos que un service frontend podría exponer después:

* Home consume:  
  * Briefing;  
  * Atención Requerida;  
  * Carga Familiar;  
  * widgets condicionales.  
* Planner/Tasks:  
  * lista de tareas;  
  * tareas pendientes/vencidas;  
  * tareas por responsable;  
  * completar tarea con checkbox;  
  * timestamp de completado.  
* Calendar:  
  * evento con fecha, participantes, ubicación.  
* People/Members:  
  * miembros;  
  * roles;  
  * estado de presencia visual;  
  * membership state.  
* More modules:  
  * Finance resumen;  
  * Inventory stock bajo;  
  * Assets vencimientos;  
  * FamilyCloud documentos/recuerdos.  
* Quick Actions:  
  * crear tarea;  
  * crear evento;  
  * registrar gasto;  
  * check-in;  
  * escanear/subir documento;  
  * ver pendientes.

### **Fuentes de datos mencionadas como flujos**

* Geni → Home \> Briefing.  
* Tareas pendientes/vencidas → Home \> Atención Requerida.  
* Finance \> Presupuestos → Home \> Atención Requerida.  
* Inventory \> Stock → Home \> Atención Requerida.  
* Assets \> Vencimientos → Home \> Atención Requerida.  
* Tareas por responsable → Home \> Carga Familiar.  
* Usuario completa tarea → Planner \> Tasks.  
* Calendar → FamilyCloud \> Álbumes.  
* Evento finalizado → FamilyCloud \> Recuerdos.  
* Recuerdo creado → Feed \> Post.  
* Inventory \> Stock bajo → Automatizaciones \> Tasks.

### **Clasificación**

* Services reales necesarios para MVP:  
  * Auth: no definido en este documento.  
  * Household: no definido.  
  * Members básico: datos de roles/membership parciales.  
  * Planner Tasks: acciones visuales claras, API faltante.  
  * Calendar: visual parcial, API faltante.  
  * Home: flujos de datos conceptuales, API faltante.  
* Mock services recomendables:  
  * Finance.  
  * Inventory.  
  * Assets.  
  * FamilyCloud.  
  * Presence.  
  * Geni.  
  * Automations.  
  * Feed.  
  * Goals.  
* POST\_MVP:  
  * Offline queue real.  
  * Push/email notifications.  
  * Auditoría real.  
  * Search real.  
  * IA real.

---

## **19\. Realtime / sincronización visible**

### **Eventos o flujos detectados**

* Usuario completa tarea:  
  * checkbox 1-tap \+ timestamp;  
  * destino Planner \> Tasks;  
  * propósito: actualizar estado de tarea y disparar dependencias.  
* Tareas pendientes/vencidas:  
  * alimentan Home \> Atención Requerida.  
* Tareas por responsable:  
  * alimentan Home \> Carga Familiar.  
* Inventory \> Stock bajo:  
  * puede generar tarea por automatización.  
* Assets \> Mantenimiento/Vencimientos:  
  * pueden generar notificaciones.  
* Presence \> Geocercas:  
  * dispara automatizaciones.  
* Calendar finalizado:  
  * puede sugerir recuerdo.  
* Calendar evento con fecha/participantes/ubicación:  
  * puede crear álbum automático.  
* Recuerdo creado:  
  * puede generar post en Feed.

### **Pantallas que deberían actualizarse según flujos**

* Tasks:  
  * al completar tarea.  
* Home:  
  * al cambiar tareas pendientes/vencidas;  
  * al cambiar distribución por responsable;  
  * al existir alertas de módulos demo.  
* Carga Familiar:  
  * al cambiar tareas por responsable.  
* Calendar:  
  * al crear/editar evento, aunque no hay evento realtime explícito.  
* Feed/FamilyCloud:  
  * integraciones futuras.

### **No encontrado**

* Websocket.  
* Supabase Realtime.  
* Broadcast.  
* Eventos técnicos concretos.  
* Manejo de conflictos.  
* Updates entre dispositivos.  
* Optimistic update explícito.  
* Retry de sincronización.  
* Estado offline UI completo.

### **Clasificación**

* Refresh visible y actualización local de UI: REAL MVP visual.  
* Realtime multi-dispositivo: no definido aquí.  
* Offline/retry/conflictos: POST\_MVP.

---

## **20\. Permisos visibles en UI**

### **Roles y permisos encontrados**

| Rol | Puede hacer / ver según documento | Restricciones según documento | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Gestiona hogar; visión completa; gestión de miembros; ve Carga Familiar; SOS completo | No detallado | REAL MVP parcial |
| Adulto | Puede invitar; crear tareas; reasignar; SOS completo | No detallado | REAL MVP parcial |
| Adolescente | Crea tareas propias; eventos; gastos; permisos ampliables; SOS completo | Permisos ampliables no definidos | REAL MVP parcial |
| Niño | Solo completa tareas; experiencia simplificada; SOS sin emergencia grave; rachas visuales sin presión | No debe ver presión social/rankings | REAL MVP parcial |
| Adulto Mayor | Experiencia adaptada; fuente grande; alto contraste; sin gestos complejos; medicación priorizada; SOS completo | No pull-to-refresh; solo tap preferente | REAL MVP visual |
| Invitado | Acceso mínimo y participación limitada | No detallado | REAL MVP parcial |
| Empleado Familiar | Acceso restringido a responsabilidades asignadas; horario laboral; SOS 🟠/🟡 | Fuera de MVP salvo decisión explícita | POST\_MVP |

### **Permisos por pantalla detectados**

* Carga Familiar visible solo para Coordinador.  
* SOS niveles varían por rol.  
* Niño solo completa tareas.  
* Adulto puede invitar, crear tareas y reasignar.  
* Adolescente puede crear tareas propias/eventos/gastos.  
* Empleado Familiar tiene acceso restringido a responsabilidades asignadas.  
* Avatar abre perfil.  
* Multi-Hogar visible solo si 2+ hogares.

### **No encontrado**

* Matriz completa de permisos.  
* Botones visibles/deshabilitados por rol.  
* Permisos de edición/eliminación de tarea.  
* Permisos de crear/editar/eliminar evento.  
* Permisos de aprobar/rechazar miembros.  
* Permisos de Settings.  
* Permisos de módulos demo.

---

## **21\. Integraciones visibles entre módulos**

| Relación | Descripción | Clasificación |
| ----- | ----- | ----- |
| Home → Planner | Home linkea a Planner | REAL MVP |
| Home → Calendar | Home linkea a Calendar | REAL MVP |
| Home → Goals | Home linkea a Goals | DEMO/POST\_MVP |
| Home → Finance | Home muestra Finance condicional/linkea | DEMO PREMIUM |
| Home → Presence | Home muestra Presence condicional/linkea | DEMO PREMIUM/MOCK |
| Home → Inventory | Home muestra Inventory condicional | DEMO PREMIUM |
| Home → Assets | Home muestra Assets condicional | DEMO PREMIUM |
| Home contiene Briefing | Briefing como primer widget | MOCK/DEMO; IA POST\_MVP |
| Home contiene Atención Requerida | Urgentes/tareas/pagos/aprobaciones | REAL para Tasks; DEMO resto |
| Home contiene Carga Familiar | Distribución de tareas por responsable | MOCK/DEMO o real parcial si hay tasks |
| People contiene Feed | Feed dentro de People | DEMO PREMIUM |
| People contiene Presence | Presence dentro de People | DEMO/MOCK |
| People contiene Personas | Lista miembros/perfiles | REAL MVP básico |
| Planner contiene Tasks | Gestión de tareas | REAL MVP |
| Planner contiene Calendar | Eventos | REAL MVP mínimo |
| Planner contiene Goals | Metas | DEMO/POST\_MVP |
| More contiene Finance | Herramienta especializada | DEMO PREMIUM |
| More contiene Inventory | Herramienta especializada | DEMO PREMIUM |
| More contiene FamilyCloud | Herramienta especializada | DEMO PREMIUM |
| More contiene Settings | Configuración | DEMO/PARCIAL |
| QuickActions contiene Geni | Slot fijo | DEMO; IA POST\_MVP |
| QuickActions → Crear tarea | Acción rápida Tasks | REAL MVP |
| QuickActions → Crear evento | Acción rápida Calendar | REAL MVP |
| QuickActions → Registrar gasto | Acción rápida Finance | DEMO PREMIUM |
| QuickActions → Check-in | Acción rápida Presence | DEMO/MOCK |
| QuickActions → Escanear/Subir documento | FamilyCloud | DEMO/POST\_MVP |
| Tasks → Responsabilidades | Agrupación operativa | REAL visual / backend no definido |
| Inventory → Tasks | Stock bajo genera tarea | POST\_MVP |
| Assets → Tasks | Mantenimiento/vencimiento genera tarea | POST\_MVP |
| Calendar → FamilyCloud | Evento genera recuerdos/álbum | POST\_MVP/DEMO |
| Recuerdos → Feed | Recuerdo genera post | POST\_MVP/DEMO |
| Geni → Briefing | Genera resumen Home | MOCK/POST\_MVP |
| Automations → Tasks | Dispara tareas | POST\_MVP |
| SearchGlobal → Tasks/Finance/Settings | Busca/navega | POST\_MVP/DEMO |

---

## **22\. Edge cases frontend**

### **Detectados explícitamente o por reglas del documento**

| Caso | Comportamiento esperado | Clasificación |
| ----- | ----- | ----- |
| Datos tardan \>300ms | Mostrar skeleton o spinner según componente | REAL MVP |
| Loading de botón muy corto | Mantener mínimo 400ms para evitar flicker | REAL MVP |
| Empty domain | Mostrar Empty State como tutorial implícito | REAL MVP |
| Tarea completada accidentalmente | Toast con Deshacer 5s | REAL MVP |
| Tarea completada por otro miembro | No mostrar toast | REAL MVP |
| Eliminación | Modal de confirmación | REAL MVP |
| Cierre con cambios sin guardar | Modal de confirmación | REAL MVP |
| Cambio de rol | Modal de confirmación | REAL MVP si UI existe |
| Expulsión | Modal de confirmación | REAL MVP si UI existe |
| Tarea atrasada | Mostrar pendiente, no error/deuda visual | REAL MVP |
| Bloqueo real | Puede usar error | REAL MVP |
| Badge en Bottom Nav | Nunca usar error rojo | REAL MVP |
| Usuario con 1 hogar | Header limpio, solo avatar, sin selector | REAL MVP |
| Usuario con 2+ hogares | Mostrar Multi-Hogar selector | POST\_MVP/parcial |
| Modo Adulto Mayor | Touch ≥56px, fuente mayor, sin gestos complejos | REAL visual |
| Pull-to-refresh en Adulto Mayor | No usar | REAL visual |
| Reduced motion | Transiciones instantáneas | REAL visual |
| SOS | Siempre abre panel, nunca dispara alerta directa | DEMO/POST\_MVP |
| SOS visual | Fondo nunca rojo | DEMO/POST\_MVP |
| Más de 4 niveles navegación | Se considera fallo | REAL UX |
| 95% acciones \>3 niveles | Rediseñar flujo | REAL UX |
| Tooltips/carruseles | No usar | REAL UX |
| Sonidos propios | No usar | REAL UX |

### **No encontrado**

* Email ya registrado.  
* Credenciales inválidas.  
* Token inválido/expirado.  
* Invitación expirada.  
* Invitación ya usada.  
* Usuario sin hogar.  
* Usuario pendiente de aprobación.  
* Permiso denegado.  
* Último coordinador.  
* Miembro suspendido.  
* Tarea ya completada.  
* Tarea no completada para verificar.  
* Evento cancelado.  
* Conflicto de evento.  
* Responsabilidad sin miembros.  
* Error de red.  
* Soft delete UI.  
* Datos personales ocultos UI.

---

## **23\. Copywriting y labels**

### **Textos concretos detectados**

* Bottom Nav:  
  * Home.  
  * People.  
  * Planner.  
  * More.  
* People tabs:  
  * Feed.  
  * Presence.  
  * Personas.  
* Planner tabs:  
  * Tasks.  
  * Calendar.  
  * Goals.  
* Quick Actions:  
  * Geni.  
  * Crear tarea.  
  * Crear evento.  
  * Registrar gasto.  
  * Check-in.  
  * Escanear documento.  
  * Subir archivo.  
  * Ver pendientes.  
* SOS:  
  * Emergencia grave.  
  * Riesgo físico o situación crítica.  
  * Necesito ayuda.  
  * Problema importante sin riesgo.  
  * Coordinación urgente.  
  * No es emergencia, requiere coord.  
  * Cancelar.  
* Empty State Tasks:  
  * “Acá van a aparecer tus tareas”.  
  * “Cuando alguien te asigne una tarea, la vas a ver acá.”  
* Toast:  
  * “Deshacer”.  
* Avatar hint:  
  * “Toca para ver perfil”.  
* Header ejemplo:  
  * “Familia Bazán”.

### **Nombres de módulos**

* Home.  
* People.  
* Planner.  
* More.  
* Finance.  
* Inventory.  
* FamilyCloud.  
* Settings.  
* SOS.  
* Geni.  
* Feed.  
* Presence.  
* Personas.  
* Tasks.  
* Calendar.  
* Goals.

### **Roles**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

### **No encontrado**

* Copy completo de Login/Register.  
* Copy de crear hogar.  
* Copy de invitación.  
* Copy de pending approval.  
* Copy de aprobar/rechazar miembro.  
* Copy de crear tarea.  
* Copy de crear evento.  
* Mensajes de éxito/error de APIs.  
* Mensajes de error de red.

---

## **24\. Restricciones técnicas frontend**

### **Stack / dependencias**

* React Native / Expo.  
* Mobile-first 375×812px.  
* `expo-font`.  
* `@expo-google-fonts/inter`.  
* `@expo-google-fonts/fraunces`.  
* `@expo-google-fonts/jetbrains-mono`.  
* `react-native-reanimated` aparece como dependencia propuesta en el documento.

### **Tokens / ThemeProvider**

* Crear archivo de tokens centralizado.  
* Implementar ThemeProvider.  
* 4 combinaciones:  
  * light \+ normal;  
  * dark \+ normal;  
  * light \+ senior;  
  * dark \+ senior.  
* ThemeMode:  
  * `normal`;  
  * `senior`.  
* ColorScheme:  
  * `light`;  
  * `dark`.  
* Tokens en 3 niveles:  
  * globales;  
  * semánticos;  
  * componentes.

### **Accesibilidad**

* Contraste AA+ en light/dark.  
* Modo Senior con contraste AA+ forzado.  
* Touch targets:  
  * default ≥44px;  
  * senior ≥56px.  
* `accessibilityLabel` en todos los componentes interactivos.  
* `accessibilityRole` en cards, botones y list items.  
* Íconos decorativos con aria-hidden.  
* Respetar `prefers-reduced-motion`.  
* Test con fuente del sistema aumentada 200%.  
* Test con VoiceOver / TalkBack.

### **Performance / movimiento**

* Feedback \<100ms.  
* Spinner solo si operación \>300ms.  
* Skeleton si carga \>300ms.  
* Animaciones máximo 500ms.  
* Reduced motion: transiciones instantáneas.  
* Loading de botón mínimo 400ms.

### **Limitaciones / no implementar**

* No tabs inventados.  
* No badges de culpa.  
* No sonidos propios.  
* No modales para formularios.  
* No gráficos de productividad individual.  
* No rankings/leaderboards.  
* No feed real completo desde este documento.  
* No SOS real desde este documento.  
* No IA real desde este documento.  
* No offline sync real desde este documento.

### **No encontrado**

* Supabase.  
* Auth token.  
* Storage real.  
* Edge Functions.  
* Librerías actuales instaladas en el proyecto.  
* Limitaciones reales del repositorio.  
* APIs reales.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo detectado | Impacto | Recomendación futura |
| ----- | ----- | ----- | ----- |
| Documento se llama Design System V2 pero archivo se llama v1 | Riesgo de naming inconsistente | Puede confundir fragments | Nombrar fragment como design\_system\_v1 o design\_system\_v2 según convención final |
| Planner avanzado vs MVP simple | Documento menciona dependencias, recurrencias, subtareas, verificación, adjuntos, comentarios y timeline | Puede inflar alcance | Clasificar avanzado como POST\_MVP salvo definición externa |
| Goals dentro de Planner | Aparece como tab oficial pero puede no ser real MVP | Puede exigir pantalla sin backend | Usar como DEMO PREMIUM o placeholder visual |
| Geni en Home/Quick Actions | Geni genera Briefing y opera transversalmente | Puede forzar IA real | Usar mock/demo, no IA real |
| Presence visual vs GPS real | Presence aparece con geocercas/ubicación/check-ins | Puede inflar alcance técnico | Usar presence mock, GPS/geofencing POST\_MVP |
| SOS visual vs emergencia real | SOS está muy definido visualmente | Puede implicar responsabilidad real | Mantener demo visual, no emergencia real |
| Multi-Hogar selector | Header global visible si 2+ hogares | Multi-hogar avanzado fuera de MVP | Ocultar si un hogar; no desarrollar avanzado |
| Adulto puede invitar | Permiso parcial aparece, pero no hay UI ni flujo de invitaciones | Puede quedar incompleto | Usar solo como pista; definir en fragment Household/Auth |
| Home muestra muchos módulos | Home puede mostrar Finance/Presence/Inventory/Assets | Riesgo de sobrecarga | Mantener máximo de cards por rol y usar mock selectivo |
| More contiene varios módulos | Puede parecer mucho para MVP | Relevante para demo premium | Usar cards visuales con datos mock |
| Design System propone react-native-reanimated | Puede no estar instalado en proyecto real | Riesgo técnico | Validar stack real antes de implementar |
| Pull-to-refresh no en senior | Si se implementa globalmente puede violar modo senior | Accesibilidad | Desactivar/alternar según modo |
| Badges/alertas | Riesgo de usar rojo en nav o deuda visual | Rompe tono emocional | Seguir reglas de color |

---

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Pantallas reales de Auth | Necesario para login/register/onboarding | No se puede extraer UI específica desde este documento |
| Flujos post-login | Necesario para navegación por estado | Faltante |
| Create Household UI | Necesario para MVP real | Faltante |
| Invitations UI | Necesario para invitar/aceptar/aprobar | Faltante |
| Pending approval UI | Necesario para flujo de miembros | Faltante |
| Members pantalla detallada | Necesario para miembros reales | Solo hay patrón People/Personas |
| Formularios de tarea/evento | Necesario para Planner real | Solo hay componentes/patrones |
| Campos de tarea | Necesario para services/modelo | Faltante |
| Campos de evento | Necesario para services/modelo | Faltante |
| Estados backend de tareas/eventos | Necesario para sync real | Faltante |
| Permisos completos por rol | Necesario para botones visibles/deshabilitados | Parcial |
| APIs/endpoints | Necesario para implementación real | No encontrados |
| Realtime | Necesario para demo multi-dispositivo | No definido |
| Mock data suficiente | Necesario para demo premium | Solo hay categorías/entidades, pocos ejemplos concretos |
| Home layout exacto | Necesario para pantalla final | Solo reglas y widgets |
| More layout exacto | Necesario para demo premium | Solo card de módulo |
| Finance/Inventory/Assets pantallas | Necesario para demo premium | Solo entidades/relaciones |
| Calendar vistas día/semana/mes | Necesario para Calendar ideal | No definido |
| Copy completo | Necesario para polish premium | Parcial |
| Error states de APIs | Necesario para robustez | Faltante |
| Storage/archivos | Necesario para FamilyCloud real | POST\_MVP/no definido |
| Supabase/Auth tokens | Necesario para services reales | No aparece |
| Librerías reales del repo | Necesario para compatibilidad | Documento propone, no valida |

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Motivo |
| ----- | ----- | ----- |
| `visual_system_fragment` | Sí | Documento es altamente útil para paleta, tokens, tipografía, spacing, componentes y accesibilidad |
| `navigation_fragment` | Sí | Define Bottom Nav, Quick Actions, TabBar, More, People, Planner, Multi-Hogar y reglas de navegación |
| `home_frontend_fragment` | Sí | Define Home como centro operativo, Briefing, Atención Requerida, Carga Familiar, widgets y reglas |
| `planner_frontend_fragment` | Sí | Define Planner, Tasks, Calendar, Goals, checkbox 1-tap, FAB, tabs y relación con Home |
| `people_members_frontend_fragment` | Sí | Define People, Personas, roles, avatares, presencia visual y adaptación por rol |
| `household_invites_frontend_fragment` | Parcial | Aporta Hogar, Membresía, roles, selector multi-hogar; no define invitaciones |
| `auth_onboarding_frontend_fragment` | Parcial | Aporta onboarding sin tutorial, por rol, 60s a valor; no define auth screens |
| `quick_actions_frontend_fragment` | Sí | Define panel, acciones, Geni fijo, orden y animación |
| `more_settings_frontend_fragment` | Sí | Define More, Settings y cards de módulo |
| `finance_demo_fragment` | Sí | Aporta entidades, ubicación en More/Home, registrar gasto y progress/alertas |
| `inventory_demo_fragment` | Sí | Aporta categorías, stock bajo, medicamentos, relación con tareas/home |
| `assets_demo_fragment` | Sí | Aporta vehículos/mascotas/dispositivos/propiedades, mantenimiento y vencimientos |
| `familycloud_demo_fragment` | Sí | Aporta álbumes, recuerdos, documentos, papelera, relación con Calendar/Feed |
| `presence_demo_fragment` | Sí | Aporta Presence, estados, check-ins, lugares, geocercas y avatar presence |
| `geni_demo_fragment` | Sí | Aporta Geni como Quick Action fijo, Briefing y capa transversal |
| `mock_data_fragment` | Parcial | Hay nombres de entidades/categorías, pero faltan ejemplos concretos |
| `ux_states_fragment` | Sí | Aporta loading, skeleton, empty, toast, disabled, selected, pressed, error |
| `frontend_services_fragment` | Parcial | Aporta flujos de datos conceptuales, pero no endpoints ni contratos |

---

## **28\. Conclusión operativa**

Este documento debe usarse como base fuerte para la capa premium global del frontend MVP de HomePlus.

Aporta de forma clara:

* identidad visual;  
* tokens;  
* componentes core;  
* navegación global;  
* estructura Home / People / Planner / More;  
* Quick Actions;  
* reglas de interacción;  
* estados UX;  
* accesibilidad;  
* modo Senior;  
* principios emocionales;  
* límites de no implementación;  
* integraciones visibles entre módulos;  
* clasificación útil entre módulos reales y demo premium.

Debe entrar en la futura `frontend_premium_mvp_spec.md` especialmente para:

* Bottom Nav congelada.  
* Home como centro operativo.  
* Quick Actions con Geni fijo.  
* Planner con Tasks / Calendar / Goals.  
* Tasks con checkbox 1-tap.  
* More como contenedor de módulos demo.  
* People como contenedor de Feed / Presence / Personas.  
* Cards, buttons, inputs, chips, badges, avatars, FAB, bottom sheets, modals, toast, empty states y skeletons.  
* Paleta tierra-cálida.  
* Tipografía Fraunces / Inter / JetBrains Mono.  
* Accesibilidad normal/senior.  
* Reglas anti-culpa, anti-presión y anti-ansiedad.

Debe tratarse como faltante o pendiente en otros documentos:

* Auth real.  
* Household real.  
* Invitaciones reales.  
* APIs.  
* Services reales.  
* Realtime multi-dispositivo.  
* Formularios específicos.  
* Campos de Tasks/Events.  
* Mock data concreto completo.  
* Permisos completos.

Debe ignorarse como implementación real para este MVP:

* IA real.  
* Automatizaciones reales.  
* Offline Sync.  
* GPS/geofencing real.  
* OCR.  
* Storage avanzado.  
* Feed real.  
* SOS real.  
* Finance backend real.  
* Inventory backend real.  
* Assets backend real.  
* FamilyCloud real.  
* Goals backend real.  
* Auditoría completa.  
* Push/email notifications reales.  
* Multi-hogar avanzado.

---

# **SOURCE 11 — DISEÑO DE PANTALLAS AUTH**

## **Archivo recomendado**

`Diseño de pantallas auth.txt`

## **Tipo de documento**

Diseño de pantallas Auth

## **Uso para frontend**

Extraer:

* Splash;  
* Login;  
* Registro;  
* Password reset;  
* estados de error;  
* navegación auth;  
* estilo visual;  
* campos;  
* CTAs;  
* copy;  
* loading;  
* reglas premium para auth.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_Disenio\_pantallas\_Auth\_v1**

## **1\. Fuente**

* Archivo principal: `HomePlus — Diseño ed pantallas de Auth v1.md`  
* Archivo de comprensión asociado: `Diseño de pantallas auth.txt`  
* Tipo de documento: documento UX/UI de pantallas de Auth.  
* Plataforma declarada: mobile-first, base 375×812px, React Native / Expo.  
* Backend declarado: Supabase Auth con email+password, Google OAuth, Apple OAuth, magic link, 2FA y biometría.  
* Alcance principal del documento: pantallas, estados, flujos, seguridad, copy, validaciones, comportamiento de teclado, transiciones y accesibilidad para autenticación.  
* Alcance secundario detectado: menciones de Cuenta, Hogar, Perfil, Configuración, Home, Onboarding, roles y navegación global desde el archivo de comprensión asociado.

---

## **2\. Utilidad frontend del documento**

Este documento tiene utilidad **alta** para el frontend premium de **Auth** y utilidad **parcial** para **Onboarding**, **Profile/Settings**, **Home como destino post-login**, **roles básicos** y **patrones globales de UI**.

Clasificación general:

| Área | Utilidad frontend | Clasificación |
| ----- | ----- | ----- |
| Auth Login | Alta | REAL MVP |
| Auth Register | Alta | REAL MVP |
| Recuperación de contraseña | Alta | REAL MVP / POST\_MVP según alcance final |
| Verificación de email | Alta | REAL MVP si se usa email verification |
| Sesión expirada | Alta | REAL MVP |
| Logout | Alta | REAL MVP |
| Cambio de cuenta | Media | POST\_MVP o DEMO PREMIUM según alcance |
| Eliminación de cuenta | Media | POST\_MVP salvo que el MVP la requiera |
| 2FA | Media | POST\_MVP |
| Biometría | Media | POST\_MVP |
| Onboarding | Baja/parcial | REAL MVP solo como navegación post-auth |
| Household | Baja | Contexto, no implementable desde este documento |
| Planner | Muy baja | No implementable desde este documento |
| Home | Baja | Solo destino/resumen conceptual |
| Design System aplicado | Alta | REAL MVP / reutilizable |
| More/Settings/Profile | Media | Parcial, por rutas de logout, seguridad y cuenta |
| Roles | Baja/parcial | Contexto de permisos, no matriz completa |

---

## **3\. Información de producto aplicable al frontend**

### **REAL MVP**

* El login es la puerta de entrada a un hogar y debe sentirse como “volver a casa”, no como pasar un control de seguridad.  
* La Cuenta pertenece al usuario; el Hogar es un ente separado.  
* El usuario se autentica con su Cuenta personal y después selecciona o ingresa a un Hogar.  
* Las credenciales pertenecen a la persona, no al hogar.  
* La experiencia debe reducir fricción:  
  * Login con email y contraseña.  
  * Social login con Google y Apple.  
  * Registro standalone mínimo.  
  * Registro sin pedir nombre; el nombre se pide después en onboarding.  
* El lenguaje debe ser humano y LATAM:  
  * “Entrar” en lugar de “Iniciar sesión”.  
  * “Creá tu cuenta” en lugar de “Registrarse”.  
  * Mensajes de error conversacionales.  
* La seguridad no debe sentirse agresiva:  
  * Mensajes unificados para evitar enumeración de emails.  
  * Toasts claros.  
  * Inputs preservados ante errores de conexión.  
  * Sesión expirada con email pre-rellenado.  
* La app debe respetar accesibilidad:  
  * `accessibilityLabel`.  
  * Roles accesibles.  
  * Focus ring visible.  
  * Soporte para `prefers-reduced-motion`.  
* La experiencia es mobile-first:  
  * Base 375×812px.  
  * Inputs de 44px.  
  * Botones principales de 52px.  
  * Touch targets mínimos de 44×44px.  
  * KeyboardAvoidingView.  
  * Formularios adaptados al teclado.

### **DEMO PREMIUM**

* La sensación premium se apoya en:  
  * Jerarquía visual clara.  
  * Logo centrado.  
  * Tipografía diferenciada para títulos.  
  * Estados de loading con overlay sutil.  
  * Haptics en botones.  
  * Toasts superiores.  
  * Bottom sheets para confirmaciones o selección de cuenta.  
  * Microcopy humano.  
  * Íconos simples y emocionales.

### **POST\_MVP**

* 2FA opcional.  
* Configuración de 2FA desde seguridad.  
* Biometría opt-in.  
* Cambio entre cuentas guardadas.  
* Eliminación de cuenta con soft-delete de 30 días.  
* Códigos de backup.  
* OAuth social si no entra en el alcance técnico inmediato.  
* Magic links si el MVP usa solo password recovery básica.

### **MOCK**

No se encontraron datos mock específicos para producto. El documento define pantallas reales de Auth, no mocks.

---

## **4\. Navegación y arquitectura de pantallas**

### **REAL MVP**

Flujos y navegación explícitos:

#### **Login**

* Ruta: `/(auth)/login`.  
* Desde:  
  * App cold start sin sesión.  
  * Bienvenida / onboarding.  
  * Sesión expirada.  
  * Logout.  
* Hacia:  
  * Home si ya tiene onboarding completo.  
  * Pantalla 2FA si tiene 2FA configurado.  
  * Onboarding si es primera vez.  
  * Registro.  
  * Recuperación de contraseña.

#### **Registro**

* Ruta: `/(auth)/register`.  
* Desde:  
  * Login → Crear cuenta.  
* Hacia:  
  * Verificación de email.  
  * Onboarding si entra por Google/Apple.  
  * Login al volver.

#### **Recuperación**

* Secuencia:  
  * Ingresar email.  
  * Confirmación de envío.  
  * Nueva contraseña desde magic link.  
* Ruta de nueva contraseña:  
  * `/(auth)/recovery?token=xxx`.

#### **Verificación de email**

* Secuencia de 3 pantallas:  
  * Post-registro: revisar email.  
  * Verificación en proceso / link.  
  * Verificación exitosa.

#### **Sesión expirada**

* Usuario en cualquier pantalla → token JWT expirado / Supabase 401\.  
* Redirección a pantalla de sesión expirada.  
* Pantalla pide contraseña o permite biometría.  
* Reautenticación exitosa → Home.

#### **Logout**

* Perfil → Configuración → Cerrar sesión.  
* Abre `AuthLogoutConfirmSheet`, bottom sheet 25%.  
* Logout ejecutado → limpiar sesión → Login.

### **POST\_MVP**

#### **Cambiar cuenta**

* Perfil → Configuración → Cambiar cuenta.  
* Abre `AuthAccountPickerSheet`, bottom sheet 50%.  
* Cambiar a otra cuenta guardada → Home.

#### **Eliminar cuenta**

* Perfil → Configuración → Eliminar cuenta.  
* Advertencia.  
* Confirmación con contraseña.  
* Cuenta eliminada.  
* Vuelve a bienvenida.

#### **2FA**

* Login exitoso con 2FA configurado → pantalla de desafío 2FA.  
* Configuración de 2FA desde Settings \> Seguridad según archivo de comprensión.

#### **Biometría**

* Biometría opt-in.  
* Unlock biométrico al abrir app.  
* Fallback a contraseña.

### **DEMO PREMIUM**

* Las pantallas POST\_MVP pueden mostrarse visualmente como flujo demo si no se implementan completamente.  
* Bottom sheets de logout y selector de cuenta son patrones visuales reutilizables.

### **MOCK**

No se especifica navegación mock.

---

## **5\. Pantallas detectadas**

| Pantalla | Objetivo | Elementos principales | Navegación | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| `AuthLoginScreen` | Permitir ingreso de usuario existente | Logo, nombre, tagline, email, contraseña, recuperar, entrar, Google, Apple, crear cuenta | Home / 2FA / Onboarding / Registro / Recuperación | REAL MVP |
| `AuthRegisterScreen` | Crear cuenta nueva mínima | Header back, título, email, contraseña, confirmar contraseña, términos, crear cuenta, Google, Apple, entrar | Verificación Email / Onboarding social / Login | REAL MVP |
| `AuthRecoveryEmailScreen` | Iniciar recuperación por email | Título, explicación, email, enviar link, volver a login | Confirmación de envío / Login | REAL MVP si hay recovery |
| `AuthRecoverySentScreen` | Confirmar envío del link | Ícono email, título, email interpolado, card info, abrir mail, reenviar, volver login | Mail app / reenviar / login | REAL MVP si hay recovery |
| `AuthRecoveryNewPasswordScreen` | Cambiar contraseña desde magic link | Nueva contraseña, confirmar contraseña, cambiar contraseña | Login | REAL MVP si hay recovery |
| `AuthVerifyEmailSentScreen` | Indicar que debe verificar email | Ícono email, título, email, reenviar, abrir correo | Email / reenviar | REAL MVP si se exige email verificado |
| `AuthVerifyEmailSuccessScreen` | Confirmar email verificado | Confirmación visual, continuar | Onboarding / Home | REAL MVP si se exige email verificado |
| `Auth2FAChallengeScreen` | Ingresar código 2FA | Código 6 dígitos, error, reenviar/usar backup | Home / Onboarding | POST\_MVP |
| `Auth2FASetupScreen` | Configurar método 2FA | Métodos, backup codes | Settings / Seguridad | POST\_MVP |
| `AuthBiometricSetupScreen` | Ofrecer biometría opt-in | Beneficio, activar, ahora no | Home / Settings | POST\_MVP |
| `AuthBiometricUnlockScreen` | Desbloquear al abrir app | Prompt biométrico, fallback | Home / password | POST\_MVP |
| `AuthSessionExpiredScreen` | Reautenticar tras expiración | Email pre-rellenado, contraseña, biometría opcional | Home / Login completo | REAL MVP |
| `AuthLogoutConfirmSheet` | Confirmar cierre de sesión | Bottom sheet 25%, confirmar/cancelar | Login / pantalla actual | REAL MVP |
| `AuthAccountPickerSheet` | Cambiar cuenta guardada | Bottom sheet 50%, lista de cuentas | Home | POST\_MVP |
| `AuthDeleteAccountWarningScreen` | Advertir consecuencias | Card alerta, botón danger, cancelar | Confirmar contraseña / atrás | POST\_MVP |
| `AuthDeleteAccountConfirmScreen` | Confirmar identidad | Contraseña, botón danger | Cuenta eliminada | POST\_MVP |
| `AuthDeleteAccountDoneScreen` | Confirmar eliminación | Check, texto, volver inicio | Bienvenida / Login | POST\_MVP |

---

## **6\. Componentes y patrones UI reutilizables**

### **Componentes explícitos del documento principal**

#### **Inputs**

* Variante default.  
* Tamaño md: 44px.  
* Label arriba obligatorio.  
* Placeholder simple.  
* Estados:  
  * default;  
  * focus;  
  * error;  
  * disabled;  
  * loading indirecto por formulario.  
* Focus:  
  * borde 2px `prim-500`.  
  * ring 3px `prim-100`.  
* Error:  
  * borde 2px `error-500`.  
  * ring 3px `error-100`.  
  * texto caption `error-600`.  
* Password input:  
  * toggle de visibilidad.  
  * ícono ojo.  
  * bullets cuando está oculto.

#### **Botones**

* Primary lg: 52px.  
* Secondary lg: 52px para social login.  
* Ghost md: 44px.  
* Danger lg para eliminación de cuenta.  
* Estados:  
  * enabled;  
  * disabled;  
  * loading con spinner;  
  * success indirecto por navegación.  
* Háptico light / clockTick en taps.

#### **Checkbox**

* Tamaño visual 24×24px.  
* Touch target 44×44px.  
* Usado para términos y privacidad.  
* Checked con `prim-500`.

#### **Bottom Sheet**

* Logout confirm: 25%.  
* Account picker: 50%.  
* El archivo de comprensión también menciona alturas 25%, 50%, 75%, 90%, drag handle y sticky footer.  
* Uso recomendado:  
  * confirmaciones simples;  
  * selección de cuenta;  
  * contenido no destructivo.

#### **Toast**

* Posición Top.  
* Usado para:  
  * errores generales;  
  * sin conexión;  
  * resend link;  
  * éxito de contraseña actualizada.  
* Error:  
  * borde izquierdo `error-500` 3px;  
  * fondo `error-100`;  
  * háptico warning.  
* Duración del login error: 4s.  
* Archivo de comprensión: máximo 1 simultáneo y acción “Deshacer” 5s.

#### **Cards**

* Card info en recuperación:  
  * `info-100`;  
  * borde izquierdo `info-500`;  
  * padding 16px;  
  * radius-md 12px.  
* Card alerta en eliminación de cuenta:  
  * `alert-100`;  
  * borde izquierdo `alert-500`;  
  * padding 16px;  
  * radius-md 12px.

#### **Overlay de loading**

* Overlay sutil para prevenir doble tap.  
* `surface-overlay rgba(45,42,38,0.50)` al 30%.  
* Opacity reducida para pantalla de fondo.  
* Spinner en botón o centrado según flujo.

#### **Divider**

* Divider con texto “o”.  
* Usado para separar credenciales y social login.

#### **Header**

* Header con botón back “← Volver” en registro y recuperación.  
* No se especifica header global completo.

#### **A11y**

* `accessibilityLabel` en inputs y botones.  
* `accessibilityRole`:  
  * button;  
  * link;  
  * checkbox.  
* Toggle de contraseña debe anunciar estado.  
* Botón con spinner debe anunciar “cargando”.

### **Componentes desde archivo de comprensión asociado**

* Button: 5 variantes × 3 tamaños × 4 estados \+ loading \+ háptico.  
* FAB: botón flotante de acción principal, esquina inferior derecha.  
* Card: estándar, destacada, alerta, módulo.  
* Input: 3 tamaños × 4 estados, label arriba obligatorio.  
* Chip: default y outline.  
* Badge: estado no interactivo, siempre texto \+ color.  
* Checkbox: tarea 1-tap, 24×24px, touch target 44×44px, animación de completado.  
* Avatar: 5 tamaños, con/sin foto, con presencia, tap → perfil.  
* BottomNav: Home | People | \+ | Planner | More.  
* QuickActionsPanel: Geni fijo \+ acciones dinámicas por frecuencia.  
* BottomSheet: 25%, 50%, 75%, 90%.  
* Modal: solo confirmaciones con consecuencia, max-width 320px, nunca formularios.  
* ListItem: altura 56px, leading \+ título \+ subtítulo \+ trailing.  
* ProgressBar.  
* EmptyState.  
* Skeleton.  
* TabBar: máximo 5 tabs.  
* MultiHomeSelector: visible solo si hay 2+ hogares.  
* ThemeProvider: light/dark × normal/senior.  
* DesignTokens: globales, semánticos y de componentes.

---

## **7\. Visual design aplicable**

### **Estilo visual detectado**

* Mobile-first.  
* Estilo cálido, humano y familiar.  
* Sensación premium basada en claridad, espacios, tipografía y microinteracciones.  
* Login debe sentirse como volver al hogar.  
* Fondo principal:  
  * `bg-primary #FBFAF8`.  
* Texto principal:  
  * `text-primary #2D2A26`.  
* Texto secundario:  
  * `text-secondary #6B6560`.  
* Texto terciario:  
  * `text-tertiary #9B9590`.  
* Color primario:  
  * `prim-500 #C17F59`.  
* Primario disabled:  
  * `prim-300 #E3BAA0`.  
* Primario pressed/loading:  
  * `prim-600 #A86B45`.  
* Ring focus:  
  * `prim-100 #F2E0D4`.  
* Error:  
  * `error-500 #C46B6B`;  
  * `error-100 #F5E2E2`;  
  * `error-600 #A85050`.  
* Success:  
  * `success-500 #6B9E7A`.  
* Info:  
  * `info-100 #E4E9ED`;  
  * `info-500 #7A8B9B`;  
  * `info-600 #5F707F`.  
* Alert:  
  * `alert-100 #F7EBDB`;  
  * `alert-500`.

### **Tipografía**

* Display / marca:  
  * Fraunces 700, 32px/40px.  
* H1:  
  * Fraunces 600, 28px/36px.  
* Body:  
  * Inter 400, 16px/24px.  
* Body S:  
  * Inter 400, 14px/20px.  
* Caption:  
  * Inter 500, 12px/16px.

### **Layout**

* Base 375×812px.  
* Márgenes laterales:  
  * `space-5` 20px.  
* Gap entre elementos:  
  * `space-4` 16px.  
* Logo HomePlus:  
  * 64×64px.  
* Inputs:  
  * 44px.  
* Botones principales:  
  * 52px.  
* Botones ghost medianos:  
  * 44px.  
* Cards:  
  * padding 16px;  
  * radius-md 12px.

### **Motion**

* Transiciones:  
  * stack push slide right→left 250ms ease-out;  
  * crossfade 300ms;  
  * fade-in 300ms;  
  * stack pop 250ms.  
* Reduced motion:  
  * duración 0ms si el SO tiene la preferencia activada.  
* Loading:  
  * mínimo 400ms para evitar flicker.  
  * spinner visible solo si la operación supera 300ms.  
* Si autenticación tarda más de 3s:  
  * aparece texto “Conectando con tu hogar...”.

### **Haptics**

* Botones:  
  * light / clockTick.  
* Toast error:  
  * warning.

### **Glassmorphism / blur / sombras**

No se encontró información específica en este documento.

---

## **8\. Home**

### **REAL MVP**

Información específica encontrada:

* Login exitoso puede navegar a Home si el usuario ya tiene onboarding completo.  
* Sesión expirada con reautenticación correcta vuelve a Home.  
* Cambio de cuenta vuelve a Home.  
* El archivo de comprensión define Home como centro operativo del hogar que resume información y no administra.  
* El archivo de comprensión indica que Home resume Tasks, Event y Presence, y redirige a Planner, Finance y People.  
* El archivo de comprensión define bloques oficiales:  
  * Briefing;  
  * Atención Requerida;  
  * Carga Familiar;  
  * Próximos Eventos;  
  * Tareas;  
  * Finanzas;  
  * Presence;  
  * Actividad Familiar.

### **MOCK**

* Briefing puede tratarse como widget visual/mock para MVP si no hay Geni real.  
* Presence puede tratarse como visual/mock si no hay GPS real.  
* Carga Familiar y Actividad Familiar aparecen como bloques de Home en el archivo de comprensión, pero el documento de Auth no las desarrolla.

### **DEMO PREMIUM**

* Home puede usar:  
  * Briefing como primer widget visual.  
  * Bloques de tareas/eventos si se integran desde Planner en otro documento.  
  * Presence como bloque visual.  
  * Finanzas como bloque visual si se decide mostrar desde Home.

### **POST\_MVP**

* Home personalizado por Geni.  
* Motor de prioridad avanzado.  
* Presence real.  
* Finanzas reales.  
* Actividad familiar real.

### **Información no encontrada**

* No hay layout detallado de Home.  
* No hay cards concretas de Home.  
* No hay datos mock concretos para Home.  
* No hay copy concreto para briefing.  
* No hay estructura visual de widgets.  
* No hay permisos visibles de Home.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

El archivo de comprensión indica:

* Planner es un módulo core.  
* Planner contiene Tasks, Calendar y Goals.  
* Planner agrupa Tasks, Calendar y Goals como sub-secciones con TabBar interna.  
* Responsabilidades es eje organizador, no dominio independiente.

Clasificación:

* Planner como navegación: DEMO PREMIUM / contexto global.  
* Implementación real de Planner: no extraíble desde este documento.

### **Tasks**

Información encontrada en archivo de comprensión:

* Tasks gestiona tareas pendientes y realizadas.  
* El eje organizador es Responsabilidades.  
* Task es trabajo pendiente o realizado.  
* Estados mencionados en el archivo de comprensión:  
  * Pendiente;  
  * En progreso;  
  * Completada;  
  * Cancelada.  
* Vencida es calculada.  
* Task puede:  
  * asignarse a Persona;  
  * pertenecer a Responsabilidad;  
  * contribuir a Goal;  
  * tener Subtask;  
  * tener Comentario;  
  * tener Adjunto;  
  * referenciar Event;  
  * depender de otra Task;  
  * disparar Notification.  
* Checkbox de tarea:  
  * 1 tap;  
  * 24×24px;  
  * touch target 44×44px;  
  * animación de completado.

Clasificación:

* Lista, creación, edición, eliminación, completar, verificar, filtros, prioridades, deadlines: no definidos en este documento.  
* Checkbox visual: DEMO PREMIUM / reutilizable.  
* Comentarios, adjuntos, dependencias, subtareas, Goals: POST\_MVP para el alcance actual.  
* Estados del archivo de comprensión contradicen los estados MVP esperados del prompt si se usan directamente.

### **Events / Calendar**

Información encontrada en archivo de comprensión:

* Calendar administra eventos familiares y personales.  
* Event es evento familiar o personal.  
* Estados mencionados:  
  * Programado;  
  * Completado;  
  * Cancelado.  
* Event tiene participantes Persona.  
* Event puede generar Recuerdo.  
* Event puede disparar Notification.  
* Calendar visualiza Events según el grafo de relaciones.  
* TimelineFamiliar visualiza Event, Recuerdo y Goal, pero eso no pertenece al MVP actual.

Clasificación:

* Calendar como sub-sección de Planner: DEMO PREMIUM / contexto.  
* Eventos CRUD, recurrencia, día/semana/mes: no definidos en este documento.  
* Participantes avanzados: POST\_MVP.  
* Recuerdos derivados del evento: POST\_MVP / DEMO PREMIUM fuera del alcance de Auth.

### **Goals**

* Goals aparece como submódulo de Planner.  
* Goal tiene hitos y tareas.  
* Goal → Hito → Tasks.  
* Goals debe quedar como POST\_MVP o DEMO PREMIUM visual si se usa para demo.

---

## **10\. People / Members / Roles**

### **Información encontrada**

Desde el archivo de comprensión:

* People es dominio de coordinación humana.  
* People contiene:  
  * Feed;  
  * Presence;  
  * Personas.  
* Persona:  
  * representa un usuario;  
  * pertenece a una Cuenta;  
  * participa en uno o más hogares.  
* Membership:  
  * relación entre Persona y Hogar;  
  * posee un único rol;  
  * estados: Pendiente, Activa, Suspendida, Finalizada.  
* Cuenta:  
  * pertenece al usuario, no al hogar;  
  * incluye Perfil, Preferencias, Idioma, Configuración personal, Memoria personal de Geni.  
* Hogar:  
  * unidad organizativa principal;  
  * todo ocurre dentro de un hogar.

### **Roles detectados**

| Rol en documento | Mapeo frontend | Descripción encontrada | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Coordinator | Responsable administrativo principal del hogar. Puede aprobar ingresos, cambiar roles, expulsar miembros. | REAL MVP parcial |
| Adulto | Adult | Miembro operativo con amplios permisos. No puede aprobar ingresos. | REAL MVP parcial |
| Adolescente | Adolescent | Miembro con autonomía progresiva. Puede recibir autorizaciones adicionales. | REAL MVP parcial |
| Niño | Child | Miembro con experiencia simplificada. No administra información familiar crítica. | REAL MVP parcial |
| AdultoMayor | Senior | Miembro con experiencia adaptada. Mantiene permisos equivalentes a Adulto. | REAL MVP parcial |
| Invitado | Guest | Acceso mínimo. Participación limitada. | REAL MVP parcial |
| EmpleadoFamiliar | Empleado Familiar | Colaborador operativo. No forma parte del núcleo familiar. | POST\_MVP |

### **UI aplicable**

* Avatar:  
  * 5 tamaños;  
  * con/sin foto;  
  * con presencia;  
  * tap → perfil.  
* Badges:  
  * útiles para rol/estado.  
* ListItem:  
  * útil para lista de miembros.  
* Role pills/status pills:  
  * no se nombran así en el documento, pero Badge/Chip pueden servir si se definen en otro documento.  
* Presence visual aparece como opción de Avatar con presencia y como módulo People/Presence.

### **Información no encontrada**

* No hay pantalla People detallada.  
* No hay lista visual de miembros.  
* No hay flujo de aprobar/rechazar detallado en UI.  
* No hay pantalla de perfil de miembro.  
* No hay permisos completos por rol.  
* No hay reglas de visibilidad por rol más allá de descripciones generales.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

Información explícita:

* La Cuenta pertenece al usuario.  
* El Hogar es separado.  
* El usuario se autentica con su Cuenta y luego selecciona o ingresa a un Hogar.  
* Las credenciales son de la persona, no del hogar.  
* Hogar es la unidad organizativa principal.  
* Todo ocurre dentro de un hogar.

Clasificación:

* Separación Cuenta/Hogar: REAL MVP.  
* Crear hogar: no definido en este documento.  
* Configuración básica de hogar: no definida.  
* Selector de hogar: aparece como MultiHomeSelector en archivo de comprensión, pero es multi-hogar avanzado y no se desarrolla aquí.

### **Invitations**

Información encontrada:

* Coordinador puede aprobar ingresos según descripción del rol.  
* No hay pantallas de invitación.  
* No hay link/código/token.  
* No hay formularios de invitar miembro.  
* No hay flujo aceptar invitación.  
* No hay pending approval visual detallado.

Clasificación:

* Permiso conceptual del coordinador para aprobar ingresos: REAL MVP parcial.  
* UI de invitaciones: no encontrada.

### **Onboarding**

Información encontrada:

* Login puede navegar a Onboarding si es primera vez.  
* Registro social puede navegar a Onboarding.  
* Registro standalone no pide nombre porque el nombre se pide en onboarding.  
* RegisterFlow: email+password → verificación → onboarding.  
* LoginFlow: credenciales → JWT → 2FA → Onboarding/Home.  
* La separación Cuenta/Hogar implica que onboarding ocurre después de autenticación.

Clasificación:

* Navegación post-auth a Onboarding: REAL MVP.  
* Onboarding por rol: no definido.  
* Crear hogar durante registro: no definido como pantalla de este documento.  
* Invitar miembros durante onboarding: no definido.

### **Información no encontrada**

* Pantallas de crear hogar.  
* Pantalla de seleccionar hogar.  
* Pantalla de unirse a hogar.  
* Pantalla de invitación.  
* Pantalla de aprobación pendiente.  
* Pantalla de onboarding por rol.  
* Copy de onboarding.  
* Formularios de hogar/invitación.

---

## **12\. More / Settings / Profile**

### **Información encontrada**

Flujos desde Perfil → Configuración:

* Cerrar sesión.  
* Cambiar cuenta.  
* Eliminar cuenta.

Desde archivo de comprensión:

* Settings vive exclusivamente en More.  
* Settings contiene configuración de Hogar, Cuenta, Sistema y Auditoría.  
* Settings configura NotificationCategories.  
* Settings configura TwoFactorAuth.  
* Settings configura BiometricAuth.  
* More contiene herramientas Tier 3:  
  * Finance;  
  * Inventory;  
  * FamilyCloud;  
  * Settings.  
* Settings no debe vivir en Home.  
* Search indexa settings para acceso rápido.

### **REAL MVP**

* Perfil/Configuración debe permitir cerrar sesión.  
* Logout debe limpiar sesión y volver a Login.  
* Sesión expirada y logout afectan navegación global.

### **DEMO PREMIUM**

* More puede mostrar Settings como módulo visual.  
* Settings puede mostrar secciones:  
  * Cuenta;  
  * Hogar;  
  * Seguridad;  
  * Notificaciones;  
  * Ayuda;  
  * Auditoría.  
* Si no se implementa seguridad avanzada, 2FA y biometría pueden mostrarse como opciones demo deshabilitadas o POST\_MVP, según decisión futura.

### **POST\_MVP**

* Cambiar cuenta.  
* Eliminar cuenta.  
* 2FA setup.  
* Biometría setup.  
* Notification settings reales.  
* Auditoría visible.

### **Información no encontrada**

* Layout de More.  
* Cards de navegación de More.  
* Pantalla Profile detallada.  
* Pantalla Settings completa.  
* Íconos de módulos More.

---

## **13\. Quick Actions**

### **Información encontrada**

Desde archivo de comprensión:

* QuickActions es un panel flotante accesible desde el botón `+` en Bottom Nav.  
* QuickActionsPanel contiene Geni fijo y acciones dinámicas ordenadas por frecuencia.  
* Geni no tiene tab dedicado.  
* Geni se accede vía Quick Actions.  
* BottomNav contiene: Home | People | \+ | Planner | More.

### **Clasificación por acción**

El documento no lista acciones concretas como crear tarea, crear evento o invitar miembro. Solo define el patrón.

| Acción | Estado |
| ----- | ----- |
| Abrir Quick Actions desde `+` | DEMO PREMIUM / navegación global |
| Geni fijo dentro del panel | DEMO PREMIUM |
| Acciones dinámicas por frecuencia | POST\_MVP si requiere lógica real |
| Crear tarea | No encontrado |
| Crear evento | No encontrado |
| Invitar miembro | No encontrado |
| Agregar gasto | No encontrado |
| Subir documento | No encontrado |
| Check-in | No encontrado |
| SOS | Según comprensión, SOS no va en Quick Actions; tiene acceso global por swipe ↑ |
| Crear recuerdo | No encontrado |

---

## **14\. Módulos demo premium**

Información detectada en el archivo de comprensión asociado. El documento principal de Auth no desarrolla pantallas de estos módulos.

### **Finance**

* Módulo core de administración financiera personal y familiar.  
* More contiene Finance.  
* Home puede redirigir a Finance.  
* GeniFinance analiza patrones y recomienda ahorro.  
* Clasificación: DEMO PREMIUM / POST\_MVP.  
* No implementar real desde este documento.

### **Inventory**

* Administración de consumibles, productos del hogar y medicamentos.  
* InventoryItem puede generar Task.  
* More contiene Inventory.  
* Clasificación: DEMO PREMIUM / POST\_MVP.  
* No implementar real desde este documento.

### **Assets**

* Activos importantes del hogar:  
  * Vehículos;  
  * Mascotas;  
  * Dispositivos;  
  * Propiedades.  
* Asset puede tener mantenimiento y documentos.  
* Clasificación: DEMO PREMIUM / POST\_MVP.  
* No implementar real desde este documento.

### **FamilyCloud / HomeCloud**

* Memoria documental y emocional de la familia.  
* Álbumes, recuerdos, documentos.  
* More contiene FamilyCloud.  
* Event puede generar Recuerdo.  
* Clasificación: DEMO PREMIUM / POST\_MVP.  
* No implementar real desde este documento.

### **Presence**

* Coordinación de disponibilidad, ubicación y movimientos.  
* Reemplaza GPS como nombre visible.  
* Avatar puede mostrar presencia.  
* Home resume Presence.  
* Presence tiene estados automáticos y manuales.  
* Manuales tienen prioridad.  
* Clasificación:  
  * Visual/mock: DEMO PREMIUM.  
  * GPS/geofencing real: POST\_MVP.

### **Geni**

* Capa de inteligencia transversal.  
* No tiene tab dedicado.  
* Acceso vía Quick Actions.  
* Genera Briefing.  
* Personaliza Home.  
* Respeta permisos.  
* Clasificación:  
  * Geni visual/demo: DEMO PREMIUM.  
  * IA real: POST\_MVP.

### **Feed**

* Espacio social del hogar.  
* Posts, comentarios, reacciones.  
* People contiene Feed.  
* Clasificación: DEMO PREMIUM / POST\_MVP.  
* No implementar real desde este documento.

### **SOS**

* Sistema de emergencias.  
* Acceso global vía swipe ↑.  
* Siempre abre un panel, nunca dispara alerta sin interacción.  
* No va en Bottom Nav ni Quick Actions.  
* Clasificación:  
  * Acceso/panel visual: DEMO PREMIUM si se muestra.  
  * Emergencia real/offline fallback: POST\_MVP.

### **Automations**

* Automatización basada en eventos.  
* Regla: si ocurre X → entonces hacer Y.  
* Geni puede crear/proponer automatizaciones.  
* Clasificación: POST\_MVP / DEMO PREMIUM visual.

### **Goals**

* Objetivos personales o familiares con hitos y tareas.  
* Planner contiene Goals.  
* Clasificación: POST\_MVP / DEMO PREMIUM visual.

### **Notifications**

* Sistema de push, email e in-app.  
* Categorías incluyen Planner, Calendar, Finance, Presence, Assets, Inventory, FamilyCloud, Feed, SOS.  
* Settings configura categorías.  
* Clasificación:  
  * Toasts locales de Auth: REAL MVP.  
  * Push/email reales: POST\_MVP.

### **Search**

* Búsqueda global transversal.  
* Puede ejecutar acciones.  
* No es tab.  
* Accesible desde cualquier pantalla.  
* Clasificación: POST\_MVP / DEMO PREMIUM.

---

## **15\. Estados UX y feedback**

### **Estados globales detectados**

| Estado | Aplicación | Clasificación |
| ----- | ----- | ----- |
| Empty | Login, Registro, Recuperación con inputs vacíos | REAL MVP |
| Loading | Todos los submits de botones con spinner \+ overlay | REAL MVP |
| Error | Credenciales inválidas, red caída, token expirado, tasa limitada, 2FA incorrecto | REAL MVP / POST\_MVP para 2FA |
| Success | Login exitoso, registro exitoso, verificación completada, 2FA validado, biometría aceptada | REAL MVP / POST\_MVP según feature |
| Offline | Toast informativo, datos preservados en inputs | REAL MVP |
| Disabled | Botones deshabilitados hasta validación | REAL MVP |
| Focus | Ring y borde activo en inputs | REAL MVP |
| Field error | Error inline bajo input | REAL MVP |
| General error | Toast superior | REAL MVP |
| Success toast | Contraseña actualizada, link reenviado | REAL MVP |
| Session expired | Reautenticación | REAL MVP |
| Rate limited | Cooldown visual después de intentos fallidos | REAL MVP |
| Token expired | Magic link expirado, JWT expirado, refresh expirado | REAL MVP |
| Account deleted | Cuenta eliminada / soft-delete | POST\_MVP |

### **Loading**

* Botón reemplaza texto por spinner.  
* Overlay sutil evita doble tap.  
* Inputs y links se deshabilitan visualmente.  
* Mínimo 400ms.  
* Spinner aparece solo si la operación excede 300ms.  
* Si autenticación tarda más de 3s:  
  * texto: “Conectando con tu hogar...”.

### **Offline**

* Login:  
  * Toast: “Sin conexión. Cuando vuelva, entrás sin problema.”  
  * Campos no se limpian.  
* Registro:  
  * Toast: “Sin conexión. Probá de nuevo en un momento.”  
  * Datos persisten.  
* Recuperación:  
  * Toast: “Sin conexión. Cuando vuelva, te mandamos el link.”  
* 2FA:  
  * TOTP funciona offline.  
  * SMS requiere conexión.  
* Biometría:  
  * funciona 100% offline.  
* Sesión expirada:  
  * no se puede reautenticar sin conexión.  
* Splash / carga inicial:  
  * carga offline y muestra login.

### **Token expirado**

* Magic link mayor a 1h:  
  * “El link ya no es válido. Pedí uno nuevo.”  
* JWT expirado durante uso:  
  * interceptar 401 de Supabase.  
  * redirigir a Sesión Expirada.  
* Refresh token expirado:  
  * Login completo.

---

## **16\. Formularios y datos de entrada**

### **Login**

Campos:

* Email.  
* Contraseña.

Validaciones:

* Email formato básico `algo@algo.algo` on-blur.  
* Email vacío: sin mensaje; botón deshabilitado.  
* Password vacío: sin mensaje; botón deshabilitado.  
* Credenciales inválidas: mensaje unificado.  
* Email no verificado: ofrece reenviar link.  
* Cuenta eliminada: indica que la cuenta no existe y permite crear cuenta.  
* Conexión caída: toast.  
* Google/Apple OAuth error: toast o mensaje.  
* Tasa limitada: cooldown.

Botones:

* Entrar.  
* Continuar con Google.  
* Continuar con Apple.  
* Crear cuenta.  
* ¿Olvidaste tu contraseña?

Teclado:

* Email:  
  * keyboard email-address;  
  * autofocus;  
  * return next → password.  
* Password:  
  * keyboard default;  
  * return go → submit.

### **Registro**

Campos:

* Email.  
* Contraseña.  
* Confirmar contraseña.  
* Checkbox términos y privacidad.

Validaciones:

* Email formato.  
* Email ya registrado on-blur.  
* Password mínimo 8 caracteres.  
* Password con al menos 1 número o signo.  
* Confirmación coincide.  
* Checkbox debe estar marcado.

Botones:

* Crear cuenta.  
* Continuar con Google.  
* Continuar con Apple.  
* Entrar.  
* Volver.

Teclado:

* Email → next password.  
* Password → next confirmar.  
* Confirmar → go submit.  
* Scroll en pantallas pequeñas.

### **Recuperación — ingresar email**

Campos:

* Email.

Validaciones:

* Email formato.  
* Email no registrado no se revela.

Botones:

* Enviar link.  
* Volver al inicio de sesión.

### **Recuperación — nueva contraseña**

Campos:

* Contraseña nueva.  
* Confirmar contraseña.

Validaciones:

* Token inválido/expirado al cargar.  
* Contraseñas no coinciden.  
* Mínimo 8 caracteres.

Botones:

* Cambiar contraseña.  
* Volver al inicio de sesión si token inválido.

### **Eliminación de cuenta**

Campos:

* Contraseña.

Validaciones:

* Input obligatorio.  
* Contraseña incorrecta.  
* 3 intentos fallidos → cooldown 15 minutos.

Botones:

* Quiero eliminar mi cuenta.  
* No, cancelar.  
* Eliminar cuenta.  
* Volver al inicio.

### **Formularios no encontrados**

* Create household.  
* Invite member.  
* Join household.  
* Profile edit.  
* Create task.  
* Edit task.  
* Create event.  
* Edit event.  
* Settings completas.  
* Formularios demo de módulos secundarios.

---

## **17\. Datos demo extraíbles**

### **Textos concretos / labels**

#### **Login**

* HomePlus  
* El lugar donde tu hogar se organiza solo.  
* Email  
* Contraseña  
* ¿Olvidaste tu contraseña?  
* Entrar  
* o  
* Continuar con Google  
* Continuar con Apple  
* ¿No tenés cuenta?  
* Crear cuenta

#### **Registro**

* Creá tu cuenta  
* Es rápido, solo un minuto.  
* Email  
* Contraseña  
* Confirmar contraseña  
* Mínimo 8 caracteres  
* Acepto los Términos y Condiciones y la Política de Privacidad.  
* Crear cuenta  
* Continuar con Google  
* Continuar con Apple  
* ¿Ya tenés cuenta?  
* Entrar

#### **Recuperación**

* ¿Olvidaste tu contraseña?  
* No pasa nada. Te enviamos un link para que elijas una nueva.  
* Enviar link  
* Volver al inicio de sesión  
* ¡Listo\! Revisá tu correo  
* Si mariana@email.com tiene cuenta, ya le llegó un link.  
* El link vence en 1 hora. Si no lo ves, revisá en spam.  
* Abrir app de correo  
* Reenviar link  
* Elegí una contraseña nueva  
* Contraseña nueva  
* Cambiar contraseña

#### **Errores / feedback**

* Ese email no es válido. ¿Lo revisás?  
* Ese email o contraseña no son correctos. ¿Probás de nuevo?  
* Tu email todavía no está verificado. ¿Reenviamos el link?  
* Esta cuenta ya no existe. Si querés, podés crear una nueva.  
* Sin conexión. Cuando vuelva, entrás sin problema.  
* No se pudo conectar con Google. ¿Probás de nuevo?  
* No se pudo conectar con Apple. ¿Probás de nuevo?  
* Muchos intentos. Esperá un minuto y probá de nuevo.  
* Ese email ya tiene cuenta. ¿Querés entrar?  
* Mínimo 8 caracteres.  
* Sumale un número o un signo para que sea más segura.  
* Las contraseñas no coinciden.  
* Marcá la casilla para continuar.  
* Sin conexión. Probá de nuevo en un momento.  
* Si ese email tiene cuenta, ya te llegó el link.  
* Link reenviado. Revisá tu correo.  
* No se pudo reenviar. ¿Probás de nuevo?  
* El link ya no es válido. Pedí uno nuevo.  
* Contraseña actualizada.  
* Conectando con tu hogar...  
* Demasiados intentos. Por seguridad, esperá 15 minutos.

#### **Eliminación de cuenta**

* Eliminar tu cuenta  
* Esto es definitivo.  
* Tus datos se borran en 30 días.  
* No vas a poder entrar más.  
* Si sos coordinador de un hogar, elegí un reemplazo antes de eliminar tu cuenta.  
* Quiero eliminar mi cuenta  
* No, cancelar  
* Confirmá que sos vos  
* Para eliminar tu cuenta, ingresá tu contraseña.  
* Eliminar cuenta  
* Tu cuenta fue eliminada  
* Tus datos se van a borrar por completo en 30 días.  
* Si querés volver, creá una cuenta nueva.  
* Volver al inicio

### **Roles extraíbles**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* AdultoMayor.  
* Invitado.  
* EmpleadoFamiliar.

### **Nombres de módulos extraíbles**

* Home.  
* People.  
* Planner.  
* More.  
* Settings.  
* Finance.  
* Inventory.  
* Assets.  
* FamilyCloud.  
* Presence.  
* Geni.  
* Feed.  
* SOS.  
* Automations.  
* Notifications.  
* Search.

### **Datos demo no encontrados**

* Nombres de tareas.  
* Nombres de eventos.  
* Miembros de ejemplo.  
* Gastos de ejemplo.  
* Productos de inventario.  
* Mascotas.  
* Vehículos.  
* Documentos.  
* Lugares.  
* Briefing concreto.  
* Activity concreta.  
* Métricas de carga familiar.

---

## **18\. Servicios frontend / APIs / datos**

### **Servicios detectados**

* Supabase Auth:  
  * email+password;  
  * OAuth Google;  
  * OAuth Apple;  
  * magic link;  
  * 2FA;  
  * biometría como unlock local.  
* SupabaseSession:  
  * manejo de JWT;  
  * refresh token de 7 días.  
* GoogleOAuth.  
* AppleOAuth.

### **Acciones detectadas sin endpoint propio**

* Login.  
* Registro.  
* Recuperación de contraseña.  
* Reenviar link.  
* Cambiar contraseña.  
* Verificar email.  
* Reautenticar sesión expirada.  
* Logout.  
* Cambiar cuenta.  
* Eliminar cuenta.  
* Configurar 2FA.  
* Configurar biometría.

### **Tokens**

* Magic links expiran en 1 hora.  
* JWT de sesión expira según configuración de Supabase; se menciona default 1h.  
* Refresh token dura 7 días.  
* JWT expirado durante uso produce 401 de Supabase.  
* Refresh expirado obliga login completo.

### **Seguridad de datos**

* Logout:  
  * destruye sesión Supabase;  
  * limpia storage local;  
  * invalida token.  
* Contraseñas:  
  * nunca en logs;  
  * nunca en analytics;  
  * nunca en crash reports.  
* Biometría:  
  * se procesa localmente;  
  * HomePlus no ve datos biométricos.  
* Email verificado requerido:  
  * cuenta no completamente activa hasta verificar email.  
  * acceso bloqueado hasta entonces.

### **Endpoints**

No se encontraron endpoints REST propios ni contratos request/response.

### **Datos locales**

* Storage local se limpia al logout.  
* Inputs preservan datos en errores de red.  
* Account picker implica cuentas guardadas, pero no se define storage ni modelo.

---

## **19\. Realtime / sincronización visible**

### **Información encontrada**

* No se encontró realtime explícito para Auth.  
* No se mencionan subscriptions.  
* No se mencionan broadcasts.  
* No se mencionan updates entre dispositivos.  
* No se mencionan conflictos de sincronización para Auth.

### **Sincronización visible indirecta**

* Expiración de JWT durante cualquier pantalla:  
  * UI debe interceptar 401;  
  * redirigir a sesión expirada.  
* Logout:  
  * limpia estado local y vuelve a Login.  
* Email verification:  
  * requiere validar link/token antes de activar cuenta.  
* Password recovery:  
  * requiere magic link válido.  
* Offline:  
  * Login no puede completarse sin conexión.  
  * Biometría local funciona offline.  
  * TOTP puede funcionar offline.

### **Desde archivo de comprensión**

* OfflineSyncQueue aparece como feature, pero no debe implementarse desde este documento para MVP Auth.  
* Notification real aparece como sistema transversal, pero no se define realtime visible.

---

## **20\. Permisos visibles en UI**

### **Auth**

* No revelar si un email existe en Login.  
* No revelar si falló email o contraseña.  
* No revelar si un email existe en Recuperación.  
* Registro sí puede revelar si el email ya está registrado.  
* 2FA no debe revelar método antes de autenticación exitosa.  
* Sesión expirada puede mostrar email pre-rellenado porque ya era visible en sesión anterior.  
* Email verificado requerido bloquea acceso hasta activar cuenta.  
* Logout no tiene riesgo: salida voluntaria.

### **Roles**

Permisos explícitos desde archivo de comprensión:

| Rol | Puede hacer | No puede hacer / limitación | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Aprobar ingresos, cambiar roles, expulsar miembros | No se especifican límites | REAL MVP parcial |
| Adulto | Permisos amplios operativos | No puede aprobar ingresos | REAL MVP parcial |
| Adolescente | Autonomía progresiva, autorizaciones adicionales | No se especifica matriz | REAL MVP parcial |
| Niño | Experiencia simplificada | No administra información familiar crítica | REAL MVP parcial |
| AdultoMayor | Experiencia adaptada, permisos equivalentes a Adulto | No se especifica más | REAL MVP parcial |
| Invitado | Acceso mínimo, participación limitada | No se especifica matriz | REAL MVP parcial |
| EmpleadoFamiliar | Colaborador operativo fuera del núcleo familiar | No forma parte del núcleo familiar | POST\_MVP |

### **UI derivada explícita**

* Si el usuario es coordinador y quiere eliminar cuenta, debe elegir reemplazo antes de eliminarla.  
* No se define pantalla para elegir reemplazo.  
* 2FA se recomienda para coordinadores, pero no se fuerza.

---

## **21\. Integraciones visibles entre módulos**

| Relación | Fuente | Clasificación | Nota |
| ----- | ----- | ----- | ----- |
| Cuenta → Hogar | Documento principal | REAL MVP | Usuario se autentica con cuenta y luego selecciona/ingresa a hogar |
| Login → Home | Documento principal | REAL MVP | Si onboarding completo |
| Login → Onboarding | Documento principal | REAL MVP | Si primera vez |
| Registro → Verificación → Onboarding | Documento principal / comprensión | REAL MVP | No define pantallas de onboarding |
| Sesión expirada → Home | Documento principal | REAL MVP | Tras reautenticación |
| Perfil/Settings → Logout | Documento principal | REAL MVP | Bottom sheet 25% |
| Perfil/Settings → Cambiar cuenta | Documento principal | POST\_MVP | Bottom sheet 50% |
| Perfil/Settings → Eliminar cuenta | Documento principal | POST\_MVP | Flujo de advertencia \+ contraseña |
| Settings → 2FA | Comprensión | POST\_MVP | Settings \> Seguridad |
| Settings → Biometría | Comprensión | POST\_MVP | Settings \> Seguridad |
| BottomNav → Home/People/Planner/More/+ | Comprensión | DEMO PREMIUM | Navegación global |
| QuickActions → Geni | Comprensión | DEMO PREMIUM | Geni fijo |
| Home → Tasks | Comprensión | REAL/MOCK según futura implementación | Documento no define UI |
| Home → Events | Comprensión | REAL/MOCK según futura implementación | Documento no define UI |
| Home → Presence | Comprensión | MOCK/DEMO PREMIUM | No hay Presence real |
| Planner → Tasks/Calendar/Goals | Comprensión | DEMO PREMIUM / POST\_MVP | No hay pantallas Planner |
| More → Finance/Inventory/FamilyCloud/Settings | Comprensión | DEMO PREMIUM | No hay pantallas More |
| Inventory → Task | Comprensión | POST\_MVP | Integración futura |
| Asset → Documento/Mantenimiento | Comprensión | POST\_MVP | Integración futura |
| Event → Recuerdo | Comprensión | POST\_MVP | FamilyCloud futuro |
| Geni → Briefing | Comprensión | DEMO PREMIUM / POST\_MVP | Mock si no hay IA real |

---

## **22\. Edge cases frontend**

### **Auth / Login**

* Email inválido.  
* Email vacío.  
* Password vacío.  
* Credenciales inválidas.  
* Email no verificado.  
* Cuenta eliminada.  
* Conexión caída.  
* Error de Google OAuth.  
* Error de Apple OAuth.  
* Tasa limitada.  
* Más de 3s autenticando.  
* No mostrar “email no encontrado”.  
* No decir si falló email o contraseña.

### **Registro**

* Email inválido.  
* Email ya registrado.  
* Contraseña menor a 8 caracteres.  
* Contraseña sin número o signo.  
* Contraseñas no coinciden.  
* Checkbox no marcado.  
* Sin conexión.  
* Pantallas pequeñas requieren scroll.  
* No pedir nombre en registro standalone.

### **Recuperación**

* Email inválido.  
* Email no registrado: no revelar.  
* Link reenviado.  
* Error al reenviar link.  
* Token inválido.  
* Token expirado.  
* Contraseñas no coinciden.  
* Contraseña actualizada.

### **Verificación email**

* Email no verificado bloquea acceso.  
* Reenviar link.  
* Verificación completada.  
* No se encontraron todos los copies concretos en los fragmentos disponibles.

### **Sesión**

* JWT expirado durante uso.  
* Refresh token expirado.  
* Magic link expirado.  
* Sesión expirada sin conexión.  
* Splash/carga inicial offline muestra login.

### **Logout / cuenta**

* Logout limpia sesión, storage local e invalida token.  
* Eliminar cuenta requiere advertencia.  
* Eliminar cuenta requiere contraseña.  
* 3 intentos fallidos en confirmación: cooldown 15 minutos.  
* Si el usuario es coordinador, debe elegir reemplazo antes de eliminar cuenta.  
* Cuenta eliminada: datos se borran por completo en 30 días.

### **2FA / biometría**

* 2FA incorrecto.  
* TOTP offline.  
* SMS requiere conexión.  
* Biometría local offline.  
* Biometría no sale del dispositivo.  
* Método 2FA no se revela antes de autenticación exitosa.

### **Household / members**

* Usuario sin hogar: no definido.  
* Usuario pendiente de aprobación: no definido.  
* Invitación expirada: no definido.  
* Invitación ya usada: no definido.  
* Último coordinador: solo aparece parcialmente en eliminación de cuenta.

### **Planner / Home**

* No tasks, no events, overdue, completed, verified, cancelled, conflict: no definidos en este documento.

---

## **23\. Copywriting y labels**

### **Principios de copy detectados**

* Castellano LATAM.  
* Brevedad radical.  
* Tono humano.  
* Evitar lenguaje corporativo.  
* Mensajes de error conversacionales.  
* No generar miedo innecesario en seguridad.  
* Seguridad comunicada como ayuda, no castigo.

### **Labels principales**

* HomePlus.  
* El lugar donde tu hogar se organiza solo.  
* Email.  
* Contraseña.  
* Confirmar contraseña.  
* Contraseña nueva.  
* ¿Olvidaste tu contraseña?  
* Entrar.  
* Crear cuenta.  
* Continuar con Google.  
* Continuar con Apple.  
* Volver.  
* Volver al inicio de sesión.  
* Enviar link.  
* Abrir app de correo.  
* Reenviar link.  
* Cambiar contraseña.  
* Eliminar cuenta.  
* No, cancelar.  
* Volver al inicio.

### **Mensajes de error / ayuda**

* Ese email no es válido. ¿Lo revisás?  
* Ese email o contraseña no son correctos. ¿Probás de nuevo?  
* Tu email todavía no está verificado. ¿Reenviamos el link?  
* Esta cuenta ya no existe. Si querés, podés crear una nueva.  
* Sin conexión. Cuando vuelva, entrás sin problema.  
* No se pudo conectar con Google. ¿Probás de nuevo?  
* No se pudo conectar con Apple. ¿Probás de nuevo?  
* Muchos intentos. Esperá un minuto y probá de nuevo.  
* Mínimo 8 caracteres.  
* Sumale un número o un signo para que sea más segura.  
* Las contraseñas no coinciden.  
* Marcá la casilla para continuar.  
* Sin conexión. Probá de nuevo en un momento.  
* Si ese email tiene cuenta, ya te llegó el link.  
* El link vence en 1 hora. Si no lo ves, revisá en spam.  
* Link reenviado. Revisá tu correo.  
* No se pudo reenviar. ¿Probás de nuevo?  
* El link ya no es válido. Pedí uno nuevo.  
* Contraseña actualizada.  
* Conectando con tu hogar...  
* Demasiados intentos. Por seguridad, esperá 15 minutos.

### **Copy de cuenta eliminada**

* Eliminar tu cuenta.  
* Esto es definitivo.  
* Tus datos se borran en 30 días.  
* No vas a poder entrar más.  
* Si sos coordinador de un hogar, elegí un reemplazo antes de eliminar tu cuenta.  
* Quiero eliminar mi cuenta.  
* Confirmá que sos vos.  
* Para eliminar tu cuenta, ingresá tu contraseña.  
* Tu cuenta fue eliminada.  
* Tus datos se van a borrar por completo en 30 días.  
* Si querés volver, creá una cuenta nueva.

---

## **24\. Restricciones técnicas frontend**

### **Stack**

* React Native / Expo.  
* Mobile-first.  
* Base 375×812px.  
* Supabase Auth.  
* Google OAuth.  
* Apple OAuth.  
* Magic link.  
* 2FA.  
* Biometría.

### **Performance**

* Login debe cargar en menos de 2s.  
* Logo y tagline son estáticos.  
* Botones sociales usan íconos locales.  
* Nada debe bloquear el render inicial.  
* Loading mínimo 400ms para evitar flicker.  
* Spinner solo aparece si operación supera 300ms.

### **Mobile**

* KeyboardAvoidingView.  
* Formulario se desplaza para mantener input visible.  
* Login no tiene scroll porque todo cabe en 375×812px.  
* Registro sí puede hacer scroll en pantallas menores a 568px de altura.  
* Tap fuera de inputs o Done en iOS cierra teclado.

### **Motion**

* Todas las transiciones respetan `prefers-reduced-motion`.  
* Duración 0ms si reduced motion está activo.

### **Seguridad frontend**

* Nunca mostrar “Email no encontrado”.  
* Login y recuperación usan mensajes genéricos.  
* Registro puede mostrar email ya registrado.  
* No guardar contraseñas en logs, analytics ni crash reports.  
* Logout debe limpiar sesión y storage local.  
* Token JWT expirado se maneja interceptando 401\.  
* Refresh expirado obliga login completo.  
* Magic link expira en 1h.  
* Email verificado requerido bloquea acceso.  
* Biometría es local.

### **Limitaciones**

* No se definen endpoints REST propios.  
* No se define estructura de storage local para cuentas guardadas.  
* No se define implementación real de OAuth.  
* No se define implementación de onboarding.  
* No se define implementación de household/invites.

---

## **25\. Contradicciones o riesgos**

| Riesgo | Descripción | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Registro standalone no pide nombre vs MVP puede necesitar persona/display name | El documento dice que el nombre se pide en onboarding, no en registro | Mantener registro mínimo si se respeta este documento; resolver en merge con Auth/Onboarding final |
| “Crear hogar durante registro” no aparece | El documento separa autenticación y hogar; usuario autentica y luego selecciona/ingresa a hogar | No extraer create household desde este documento |
| Onboarding por rol no definido | Solo aparece navegación hacia Onboarding | Generar fragment onboarding mínimo si se necesita |
| 2FA y biometría pueden ser demasiado avanzados para MVP | Documento las desarrolla como Auth premium | Clasificar POST\_MVP salvo decisión explícita |
| Social login puede exceder alcance técnico | Google/Apple aparecen como botones principales | Mantener visualmente si conviene, pero validar backend real en merge |
| Eliminación de cuenta requiere elegir reemplazo si coordinador | No se define pantalla de reemplazo | No implementar sin fuente adicional |
| Cambio de cuenta implica cuentas guardadas | No se define modelo local ni seguridad | POST\_MVP |
| Roles aparecen en comprensión, no en pantallas Auth | Hay descripciones pero no UI completa | Usar como referencia parcial, no como matriz final |
| Membership estados no coinciden con posibles decisiones finales | Comprensión usa Pendiente/Activa/Suspendida/Finalizada | Validar con documento de Household/Auth final |
| Task estados no coinciden con estados MVP del prompt | Comprensión usa Pendiente/En progreso/Completada/Cancelada; prompt MVP espera pending/completed/awaiting\_verification/verified | No usar este documento para estados finales de Tasks |
| Planner aparece solo en knowledge graph | No hay UI implementable | No generar Planner fragment fuerte desde este documento |
| Home aparece como centro/resumen pero sin layout | Falta especificación visual | Usar solo regla “Home resume, no administra” si se valida en merge |
| Geni aparece como capa transversal | Puede tentar a IA real | Mantener como demo/mock para MVP |
| Presence aparece con estados y visibilidad | Puede tentar GPS real | Mantener visual/demo si aparece en frontend premium |

---

## **26\. Información faltante**

### **Auth**

* Contratos exactos de endpoints.  
* Request/response de login/register/logout.  
* Manejo concreto de Supabase client.  
* Persistencia local de sesión.  
* Diseño completo de 2FA challenge/setup si no está todo en el fragmento visible.  
* Diseño completo de biometría si no está todo en el fragmento visible.  
* Flujo de email verification completo con todos los copies si se requiere exactitud total.  
* Pantalla de Splash.  
* Pantalla de bienvenida previa al login.

### **Onboarding**

* Pantallas de onboarding.  
* Nombre/display name.  
* Onboarding por rol.  
* Crear hogar.  
* Seleccionar hogar.  
* Ingresar a hogar.  
* Invitar miembros.  
* Aprobación pendiente.  
* Copy de onboarding.  
* Estados de onboarding.

### **Household / Invitations**

* Crear hogar.  
* Configurar hogar.  
* Invitar miembro.  
* Aceptar invitación.  
* Token/link/código.  
* Aprobar/rechazar.  
* Pantallas de miembros pending.  
* Errores visibles de invitaciones.  
* Permisos completos.

### **Home**

* Layout.  
* Widgets.  
* Cards.  
* Data real vs mock.  
* Briefing concreto.  
* Tareas/eventos/miembros.  
* Activity.  
* Presence mock.  
* Carga familiar mock.

### **Planner**

* Pantallas Tasks.  
* Task card.  
* Crear/editar tarea.  
* Completar/verificar tarea.  
* Prioridades.  
* Deadlines.  
* Templates.  
* Calendar day/week/month.  
* Crear/editar evento.  
* Recurrencia simple.  
* Relación con Home.

### **People / Members**

* Lista de miembros.  
* Perfil de miembro.  
* Avatares reales.  
* Role pills.  
* Status pills.  
* Acciones por rol.  
* Aprobar/rechazar miembros.

### **More / Settings**

* Layout de More.  
* Pantallas de Settings completas.  
* Profile completo.  
* Privacidad.  
* Ayuda.  
* Auditoría.  
* Notificaciones.

### **Quick Actions**

* Lista concreta de acciones.  
* Modal/bottom sheet real.  
* Acciones reales vs demo.  
* Integración con Planner/Household/Home.

### **Demo premium**

* Datos mock.  
* Cards de Finance.  
* Cards de Inventory.  
* Cards de Assets.  
* Cards de FamilyCloud.  
* Cards de Presence.  
* Geni demo.  
* Activity demo.

---

## **27\. Fragments recomendados desde este documento**

| Fragment | Recomendación | Nivel | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Sí | Medio/alto | Hay muchos componentes, tokens, estados, motion, haptics, formularios y accesibilidad |
| `navigation_fragment` | Parcial | Medio | Hay navegación Auth y navegación global desde comprensión, pero no mapa completo de pantallas |
| `home_frontend_fragment` | Parcial | Mínimo | Solo Home como destino y centro que resume |
| `planner_frontend_fragment` | Parcial | Mínimo | Solo estructura Planner/Tasks/Calendar/Goals desde graph |
| `people_members_frontend_fragment` | Parcial | Mínimo/medio | Roles, Persona, Membership y Avatar; sin pantallas |
| `household_invites_frontend_fragment` | Parcial | Mínimo | Separación Cuenta/Hogar y rol coordinador; sin flujo UI |
| `auth_onboarding_frontend_fragment` | Sí | Alto para Auth, bajo para Onboarding | Documento principal es de Auth; Onboarding solo navegación |
| `quick_actions_frontend_fragment` | Parcial | Mínimo | Botón \+, panel y Geni fijo; sin acciones concretas |
| `more_settings_frontend_fragment` | Parcial | Medio | Logout, cambiar cuenta, eliminar cuenta, Settings en More |
| `finance_demo_fragment` | Parcial | Mínimo | Solo módulo y ubicación en More/Home |
| `inventory_demo_fragment` | Parcial | Mínimo | Solo módulo e integración futura con Tasks |
| `assets_demo_fragment` | Parcial | Mínimo | Solo entidad visual conceptual |
| `familycloud_demo_fragment` | Parcial | Mínimo | Solo módulo, recuerdos/documentos y relación con eventos |
| `presence_demo_fragment` | Parcial | Mínimo | Estados, avatar con presencia, Home resume Presence |
| `geni_demo_fragment` | Parcial | Mínimo | Geni transversal, Quick Actions, Briefing |
| `mock_data_fragment` | Parcial | Bajo | Hay labels y módulos, pero no datos mock de negocio |
| `ux_states_fragment` | Sí | Alto | Estados empty/loading/error/success/offline, overlays, toasts, token expirado |
| `frontend_services_fragment` | Parcial | Medio | Supabase Auth, OAuth, magic link, tokens, logout; sin endpoints propios |

---

## **28\. Conclusión operativa**

Este documento debe usarse principalmente para construir el frontend premium de **Auth**: login, registro, recuperación de contraseña, verificación de email, sesión expirada, logout, estados UX, seguridad visible, validaciones, copy, mobile behavior, transiciones y accesibilidad.

También aporta patrones globales reutilizables para el frontend MVP: botones, inputs, toasts, bottom sheets, overlays, loading, focus/error states, haptics, reduced motion, tipografía, colores, spacing y lenguaje humano.

Para otros dominios, el documento solo aporta contexto parcial:

* Home: destino post-login y concepto de centro que resume.  
* Household: separación Cuenta/Hogar.  
* People/Members/Roles: roles y membership desde el archivo de comprensión.  
* More/Settings/Profile: rutas de logout, cambiar cuenta, eliminar cuenta y seguridad.  
* Quick Actions: botón `+`, panel y Geni fijo.  
* Planner/Home/módulos demo: solo menciones estructurales, no implementación.

No conviene extraer desde este documento fragments fuertes de Planner, Home, Household, Invitations o módulos demo. Para esos dominios, este fragment debe actuar solo como apoyo visual/transversal y como fuente de consistencia UX.

---

# **SOURCE 12 — DISEÑO DE ONBOARDING**

## **Archivo recomendado**

`Diseño de onboarding completo v1.txt`

## **Tipo de documento**

Diseño de onboarding

## **Uso para frontend**

Extraer:

* create household;  
* join household;  
* waiting approval;  
* onboarding por rol;  
* invitaciones;  
* pasos;  
* pantallas;  
* CTAs;  
* estados vacíos;  
* copy;  
* comportamiento MVP.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_Diseño\_de\_onboarding\_completo\_v1**

## **1\. Fuente**

* Documento principal: `HomePlus — Diseño de onboarding completo v1.md`  
* Archivo de comprensión asociado: `Diseño de onboarding completo v1.txt`  
* Tipo de documento: documento de diseño frontend / UX de onboarding completo.  
* Versión indicada: `2.0`, reescritura completa tras auditoría contra Final Spec V1.  
* Fecha indicada: junio 2026\.  
* Idioma: castellano LATAM.  
* Plataforma: mobile-first, base 375×812px.  
* Stack indicado: React Native / Expo.  
* Modos indicados: `normal` y `senior`.  
* Dependencias mencionadas por el propio documento: Final Spec V1, Design System V2, UX Philosophy V2. No se usan como fuente externa, solo se registran como referencias internas mencionadas por el documento.

Clasificación general del documento para frontend MVP:

* Auth / Onboarding: REAL MVP.  
* Household inicial: REAL MVP parcial.  
* Invitations: REAL MVP parcial.  
* Members / People inicial: REAL MVP parcial \+ DEMO PREMIUM en empty states.  
* Home post-onboarding: REAL MVP parcial \+ MOCK / DEMO PREMIUM.  
* Planner / Tasks / Events / Calendar: información frontend parcial, útil para empty states, primer valor y demo inicial; no alcanza para CRUD completo.  
* More / Finance / Inventory / HomeCloud / Presence / Goals / Feed / SOS: DEMO PREMIUM o POST\_MVP visual según el caso.  
* Geni: DEMO PREMIUM / MOCK en onboarding y Home; IA real queda POST\_MVP.

---

## **2\. Utilidad frontend del documento**

Este documento es muy útil para construir el frontend premium inicial de HomePlus porque define:

* Flujo completo de entrada a la app: Splash → Bienvenida → Crear cuenta / Login → Selección de rol → Onboarding por rol → Home.  
* Pantallas detalladas de onboarding con layout, jerarquía visual, copy, inputs, botones, estados y validaciones.  
* Navegación base post-onboarding con Bottom Nav congelada: `[Home] [People] [+] [Planner] [More]`.  
* Primer valor visible antes de 60 segundos como principio rector.  
* Experiencia diferenciada por rol: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor, Invitado y Empleado Familiar.  
* Home post-onboarding inicial con Briefing, Atención requerida, Carga Familiar, Tareas y Próximos Eventos.  
* Empty states accionables para Home, People, Planner, More, Finance, Inventory, Presence, Goals, HomeCloud y Settings.  
* Patrones UI reutilizables: cards seleccionables, chips, inputs, progress bar, bottom sheet, share sheet, toasts, avatares, checkbox, empty states, Bottom Nav.  
* Estados UX globales: offline, loading, error, validación, interrupción, retoma y modo oscuro.  
* Copy concreto reutilizable para onboarding, Home, errors, empty states y role-based UX.

Este documento no define de forma suficiente:

* Contratos API.  
* Endpoints.  
* Request / response.  
* CRUD completo de Tasks.  
* CRUD completo de Events.  
* Calendar día / semana / mes.  
* Verification Flow técnico.  
* Realtime entre dispositivos.  
* Modelo completo de permisos.  
* Data services finales.  
* Diseño completo de módulos secundarios.

---

## **3\. Información de producto aplicable al frontend**

### **Principios explícitos aplicables**

* `60 segundos hasta el primer valor visible`.  
* Cada pantalla debe tener `1 acción principal`.  
* Sin tutoriales.  
* Sin feature carousel.  
* Los flujos por rol derivan de permisos y capacidades definidos por rol.  
* El onboarding no debe sentirse como barrera, sino como primera experiencia de valor.  
* El primer valor no es una felicitación pasiva: debe ser una acción concreta del usuario.  
* Crear algo aporta más valor que mirar un tour.  
* La invitación de miembros debe ser natural, pero postergable.  
* La configuración completa debe poder postergarse.  
* Los permisos de notificación se piden después del primer valor, no al inicio.  
* La foto de perfil y la foto del hogar son opcionales.  
* Geni sugiere opciones concretas para evitar parálisis de elección.  
* El tratamiento `tuteo / usted` se pregunta explícitamente.  
* La disponibilidad se pide en franjas simples, no con time picker preciso.  
* En Adulto Mayor, la opción segura y accesible debe ser default.  
* Para Niño, primero se muestra una lista demo y luego una tarea real interactiva.  
* No se pregunta edad exacta; se usa la franja etaria del rol.  
* Login social se ofrece, no se impone.  
* Bottom Nav congelada e inmutable en V1.  
* Chips informativos reemplazan carruseles.  
* Empty states con una acción sugerida.  
* El empty state funciona como tutorial de la app.  
* Home resume información. Los módulos administran.

### **Sensación de producto buscada**

* Mobile-first.  
* Rápida.  
* Clara.  
* Cálida.  
* Humana.  
* Familiar.  
* No técnica.  
* Sin sobrecarga visual.  
* Sin configuración excesiva.  
* Con tono LATAM.  
* Con adaptación por rol.  
* Con accesibilidad fuerte para Adulto Mayor.  
* Con experiencia simplificada para Niño.  
* Con Home como centro operativo.  
* Con acciones rápidas visibles desde el inicio.

### **Clasificación**

#### **REAL MVP**

* Flujo de onboarding.  
* Auth visual.  
* Login visual.  
* Register visual.  
* Selección de rol.  
* Crear hogar.  
* Invitar miembros.  
* Aceptar invitación.  
* Home inicial.  
* Bottom Nav.  
* Empty states de módulos reales.  
* Diferenciación visible por rol.

#### **DEMO PREMIUM**

* Briefing de Geni como card visual.  
* Sugerencias de Geni.  
* Home con widgets iniciales.  
* More con módulos visuales.  
* Finance empty/demo.  
* Inventory empty/demo.  
* HomeCloud empty/demo.  
* Goals empty/demo.  
* Presence empty/demo.  
* Feed empty/demo.  
* SOS como acceso visual por gesto.

#### **MOCK**

* Briefing fijo o basado en datos simples.  
* Carga Familiar sin miembros.  
* Presence sin datos reales.  
* Lista demo de Niño.  
* Chips sugeridos por Geni.  
* Activity / Feed vacío.  
* Métricas o widgets sin backend real.

#### **POST\_MVP**

* IA real de Geni.  
* Automatizaciones reales.  
* GPS real.  
* Notificaciones push reales.  
* Storage real avanzado.  
* OCR.  
* Offline sync real.  
* Multi-hogar avanzado.  
* Permisos finos completos.  
* Realtime no especificado.

---

## **4\. Navegación y arquitectura de pantallas**

### **Flujo principal**

1. `Splash`  
   * Duración: 2.5s.  
   * Logo \+ tagline.  
2. `Bienvenida`  
   * Una pantalla.  
   * CTA principal: Crear cuenta.  
   * CTA secundario: Entrar.  
3. Rama `Crear cuenta`  
   * Paso 1: Email \+ Password.  
   * Paso 2: Nombre.  
   * Login social: Google / Apple.  
4. Rama `Iniciar sesión`  
   * Email \+ Password.  
   * Recuperación de contraseña.  
   * Si usuario existente: Home.  
5. Usuario nuevo:  
   * Selección de rol.  
6. Si rol \= Coordinador:  
   * Creación del hogar:  
     * Tipo de hogar.  
     * Nombre \+ foto opcional.  
     * Disponibilidad horaria.  
   * Personalización:  
     * Foto perfil \+ nombre completo.  
     * Tono \+ notificaciones.  
   * Primer valor visible:  
     * Crear lista de compras o cargar eventos fijos.  
   * Invitación a miembros.  
   * Home post-onboarding.  
7. Si rol por invitación:  
   * Flujos alternativos por rol.  
   * Aceptación / personalización según rol.  
   * Home post-onboarding.

### **Bottom Nav post-onboarding**

La navegación congelada V1 es:

`[Home] [People] [+] [Planner] [More]`

Tabs:

| Tab | Destino | Contenido inicial indicado | Clasificación |
| ----- | ----- | ----- | ----- |
| Home | Home | Briefing \+ Atención \+ Carga \+ Tareas \+ Eventos | REAL MVP \+ MOCK |
| People | People | Feed vacío \+ Presence sin datos \+ Personas | REAL MVP parcial \+ DEMO PREMIUM |
| \+ | Quick Actions | Geni fijo \+ Crear tarea \+ Crear evento \+ Registrar gasto | MIXTO |
| Planner | Planner | Tasks vacío \+ Calendar vacío \+ Goals vacío | REAL MVP parcial \+ DEMO PREMIUM |
| More | More | Finance \+ Inventory \+ HomeCloud \+ Settings | DEMO PREMIUM \+ REAL parcial |

### **Navegación por rol**

| Rol | Navegación / experiencia |
| ----- | ----- |
| Coordinador | Flujo completo de creación de hogar. Bottom Nav completa. Ve Carga Familiar. Puede invitar miembros. |
| Adulto | Llega por invitación. Acepta invitación y personaliza perfil. Bottom Nav completa con permisos de Adulto. No ve Carga Familiar. |
| Adolescente | Avatar \+ color, tono y notificaciones. Bottom Nav completa, sin tab Finance visible según documento. Foco en tareas, eventos y coordinación. |
| Niño | Avatar \+ color, lista demo y primera tarea interactiva. Bottom Nav completa con permisos restringidos. Home simplificada. |
| Adulto Mayor | Modo senior. Bottom Nav con íconos \+ texto siempre visible. Sin gestos; solo tap. |
| Invitado | Acepta invitación. Bottom Nav con tabs visibles según permisos configurados. Acceso mínimo. |
| Empleado Familiar | Acepta responsabilidades y horario. Ve trabajo asignado. Acceso limitado. |

### **Modales / bottom sheets / sheets**

* Avatar del hogar: tap abre bottom sheet cámara / galería.  
* Primer valor `Crear lista de compras`: bottom sheet 50%.  
* Primer valor `Cargar eventos`: bottom sheet 50%.  
* Disponibilidad horaria: selector tipo bottom sheet para preferencia de aviso.  
* Compartir link: share sheet nativo.  
* No se definen modales completos de confirmación.

---

## **5\. Pantallas detectadas**

### **Splash Screen**

* Clasificación: REAL MVP.  
* Objetivo: transmitir esencia del producto mientras carga; no vender, no explicar.  
* Duración: 2.5s.  
* Muestra:  
  * Logo.  
  * Nombre HomePlus.  
  * Tagline.  
  * Spinner sutil.  
* Estados:  
  * Loading.  
  * Error de carga si no inicializa en 10s.  
  * Sin conexión.  
* Copy:  
  * `HomePlus`  
  * `Todo tu hogar en un solo lugar.`  
  * `Cargando...`  
  * `Algo no salió bien. ¿Probamos de nuevo?`  
  * `Reintentar`

### **Pantalla de Bienvenida**

* Clasificación: REAL MVP.  
* Objetivo: propuesta de valor en una sola frase y dos caminos.  
* Muestra:  
  * Heading.  
  * Subtexto.  
  * 3 chips informativos.  
  * Botón Crear cuenta.  
  * Botón Ya tengo cuenta.  
* Chips:  
  * `🏠 Calendario familiar`  
  * `📋 Tareas de la casa`  
  * `💜 Sin perseguir a nadie`  
* Acciones:  
  * Crear cuenta.  
  * Entrar.  
* Regla:  
  * Sin carrusel.

### **Crear cuenta — Paso 1: Credenciales**

* Clasificación: REAL MVP.  
* Objetivo: capturar email y contraseña con mínima fricción.  
* Componentes:  
  * Header con volver.  
  * Progress bar 2 pasos, 50%.  
  * Input email.  
  * Input password con toggle de visibilidad.  
  * Caption `Mínimo 8 caracteres`.  
  * Botón `Continuar`.  
  * Divider `o`.  
  * Botón Google.  
  * Botón Apple.  
  * Caption legal.  
* Validaciones:  
  * Email formato válido.  
  * Email no vacío.  
  * Password ≥ 8 caracteres.  
  * Password no vacío.  
* Estados:  
  * Default.  
  * Válido.  
  * Error email.  
  * Error pass on-blur.  
  * Loading.  
  * Error red.  
  * Email ya registrado.  
  * Login social.  
* Copy de error:  
  * `Ese email no es válido. ¿Lo revisás?`  
  * `Mínimo 8 caracteres.`  
  * `Sin conexión. Probá de nuevo en un momento.`  
  * `Ese email ya tiene cuenta. ¿Querés entrar?`  
  * `Conectando...`

### **Crear cuenta — Paso 2: Nombre**

* Clasificación: REAL MVP.  
* Objetivo: capturar nombre propio y humanizar cuenta.  
* Componentes:  
  * Header con volver.  
  * Progress bar 100%.  
  * Input nombre.  
  * Botón `Entrar a HomePlus`.  
* Validaciones:  
  * Nombre no vacío.  
  * Máximo 40 caracteres.  
  * Solo letras, espacios y acentos.  
* Estados:  
  * Default.  
  * Nombre ingresado.  
  * Loading.  
  * Error.  
  * Éxito.  
* Copy:  
  * `¿Cómo te llamás?`  
  * `Así te va a llamar Geni.`  
  * `Un poco más corto, por favor.`  
  * `Solo letras y espacios.`  
  * `No se pudo crear la cuenta. ¿Probás de nuevo?`

### **Selección de Rol**

* Clasificación: REAL MVP.  
* Objetivo: determinar onboarding y Home según rol.  
* Componentes:  
  * Heading.  
  * Body.  
  * Cards seleccionables.  
  * Botón continuar.  
* Roles visibles:  
  * Coordinador/a.  
  * Adulto.  
  * Adolescente.  
  * Niño/a.  
  * Adulto Mayor.  
* Roles no visibles en esta pantalla:  
  * Invitado.  
  * Empleado Familiar.  
* Motivo:  
  * Invitado y Empleado Familiar se asignan por invitación.  
* Navegación:  
  * Coordinador/a → Creación del Hogar.  
  * Adulto → Flujo Adulto.  
  * Adolescente → Flujo Adolescente.  
  * Niño/a → Flujo Niño.  
  * Adulto Mayor → Flujo Adulto Mayor.  
* Visual:  
  * Cards, no radio buttons.  
  * Estado default y selected.

### **Creación del Hogar — Paso 1: Tipo de hogar**

* Clasificación: REAL MVP.  
* Objetivo: categorizar la estructura del hogar para ajustar defaults y reglas de acceso.  
* Cards:  
  * `👨‍👩‍👧 Familia con hijos`  
  * `👨‍👩‍👦‍👦 Familia extendida (abuelos, tíos, etc.)`  
  * `💑 Pareja`  
  * `🏠 Convivientes (amigos, roommates)`  
* Reglas visuales / funcionales por tipo:  
  * Familia con hijos: visibilidad total sobre niños, moderada sobre adolescentes.  
  * Familia extendida: visibilidad segmentada por núcleo.  
  * Pareja: visibilidad equitativa; ambos pueden ser co-coordinadores.  
  * Convivientes: máxima privacidad individual; solo tareas/gastos comunes visibles.  
* Información faltante:  
  * No define cómo se traduce cada tipo a backend.  
  * No define enum técnico.  
  * No define controles UI posteriores para esas reglas.

### **Creación del Hogar — Paso 2: Nombre y foto**

* Clasificación: REAL MVP.  
* Objetivo: dar identidad al hogar.  
* Componentes:  
  * Avatar del hogar 72px.  
  * Foto opcional.  
  * Bottom sheet cámara / galería.  
  * Input nombre del hogar.  
  * Botón continuar.  
  * Caption indicando que se puede hacer después.  
* Placeholder:  
  * `Casa de los Robles`  
* Validaciones:  
  * Nombre no vacío.  
  * Máximo 30 caracteres.  
* Copy:  
  * `¿Cómo le dicen a tu casa?`  
  * `Nombre del hogar`  
  * `También podés hacerlo después`  
  * `Un poco más corto.`

### **Creación del Hogar — Paso 3: Disponibilidad horaria**

* Clasificación: REAL MVP parcial / DEMO PREMIUM si no se usa backend.  
* Objetivo: informar cuándo y cuánto tiempo tiene el Coordinador para tareas del hogar.  
* Cards:  
  * `🕐 1 a 2 horas por día`  
  * `🕑 3 a 4 horas por día`  
  * `🕒 5 horas o más`  
* Selector:  
  * `¿A qué hora preferís que te avise? 🌅 Mañana (8 AM) ▼`  
* Opciones:  
  * Mañana.  
  * Media mañana.  
  * Tarde.  
  * Noche.  
* Uso indicado:  
  * Geni sugiere tareas cuando el usuario realmente puede.  
* Información faltante:  
  * No define estructura de datos.  
  * No define si impacta notificaciones reales o solo preferencias locales.

### **Personalización del Perfil — Paso 1: Foto y nombre completo**

* Clasificación: REAL MVP.  
* Objetivo: completar identidad del Coordinador dentro del hogar.  
* Componentes:  
  * Avatar personal 72px.  
  * Foto opcional.  
  * Iniciales si no hay foto.  
  * Input nombre completo.  
  * Botón continuar.  
* Default:  
  * Nombre completo pre-rellenado desde registro.  
* Regla visual:  
  * Color de fondo del avatar asignado por hash del nombre entre cuatro colores:  
    * Arcilla `#F2E0D4`.  
    * Salvia `#D8E5DA`.  
    * Miel `#F2E6CC`.  
    * Lavanda `#E4DFF0`.

### **Personalización del Perfil — Paso 2: Tono y notificaciones**

* Clasificación: REAL MVP parcial.  
* Objetivo: configurar cómo Geni se comunica y con qué frecuencia.  
* Componentes:  
  * Radio cards para tratamiento.  
  * Divider.  
  * Cards seleccionables para intensidad de notificaciones.  
  * Botón `Entrar a mi hogar`.  
* Opciones de tratamiento:  
  * `Mariana (tuteo)`.  
  * `Sra. García (usted)`.  
* Opciones de notificación:  
  * `Media`: lo importante del día. Default.  
  * `Alta`: cada novedad.  
  * `Baja`: solo lo urgente.  
* Información faltante:  
  * No define permisos nativos de notificación.  
  * No define persistencia.  
  * No define push real.

### **Primer Valor Visible**

* Clasificación: REAL MVP visual \+ MOCK / DEMO PREMIUM para Geni.  
* Objetivo: que el Coordinador complete una primera acción real o simulada.  
* Componentes:  
  * Heading `🎯 Tu hogar está listo`.  
  * Card destacada de Geni con borde izquierdo prim-500 de 4px.  
  * Caption `Sugerencia para hoy:`.  
  * Cards de sugerencia.  
  * Botón ghost `Nada, después`.  
* Sugerencias:  
  * `📋 Crear la lista de compras de la semana`.  
  * `📅 Cargar los eventos fijos de la semana`.  
* Acción `Crear lista de compras`:  
  * Bottom sheet 50%.  
  * Título `Lista de compras`.  
  * Campo de texto para primer ítem.  
  * Autofocus.  
  * Chips comunes:  
    * `🥛 Leche`  
    * `🍞 Pan`  
    * `🥚 Huevos`  
    * `🧈 Manteca`  
  * Botón `Guardar`.  
  * Sticky footer.  
  * Toast:  
    * `Tu primera lista. Cuando invites a alguien, la pueden completar entre todos.`  
* Acción `Cargar eventos`:  
  * Bottom sheet 50% para crear primer evento.  
  * No se detallan campos del evento.  
* Información faltante:  
  * No define si la lista de compras es Task, Inventory o entidad propia.  
  * No define endpoint.  
  * No define modelo de evento.  
  * No define si realmente persiste.

### **Invitación a Miembros**

* Clasificación: REAL MVP.  
* Objetivo: invitar como opción natural y postergable.  
* Componentes:  
  * Input nombre del miembro.  
  * Input email o teléfono.  
  * Botón `Enviar invitación`.  
  * Divider `o`.  
  * Botón `📱 Compartir link`.  
  * Botón ghost `Después lo hago`.  
* Campos:  
  * Nombre del miembro.  
  * Email o teléfono.  
* Flujo compartir link:  
  * Tap en Compartir link.  
  * Link único del hogar válido 7 días.  
  * Share sheet nativo: WhatsApp, Mensajes, Mail, Copiar link.  
  * Link incluye: `Mariana te invitó a Casa de los Robles en HomePlus`.  
  * Toast: `Link copiado. Vence en 7 días.`  
* Información faltante:  
  * No define endpoint.  
  * No define si el link es single-use.  
  * No define estados de aprobación posterior en detalle.

### **Home Post-Onboarding — Coordinador**

* Clasificación: REAL MVP parcial \+ MOCK.  
* Objetivo: llegada a Home funcional con estructura oficial.  
* Regla:  
  * Home resume información.  
  * Home no administra información.  
  * Toda card conduce al módulo que administra.  
* Header:  
  * `[Avatar] Casa de los Robles ▼`.  
  * Selector multi-hogar visible solo si hay 2+ hogares.  
* Greeting:  
  * `Hola, Mariana 👋`  
  * `Martes 12 de junio · 08:42`  
* Orden de capas:  
  * Briefing diario.  
  * Atención requerida.  
  * Carga Familiar.  
  * Mis pendientes / Tareas.  
  * Próximos eventos.  
* Cards:  
  * Briefing diario.  
  * Atención requerida.  
  * Carga Familiar.  
  * Mis pendientes.  
  * Próximos Eventos.  
* Acciones:  
  * Invitar miembros.  
  * Crear tarea.  
  * Agregar primer evento desde card.  
* Bottom Nav:  
  * `🏠 Home 👥 People [+] 📋 Planner ⋯ More`.

### **People → Personas Empty State**

* Clasificación: REAL MVP parcial.  
* Objetivo: mostrar que todavía no hay miembros invitados.  
* Componentes:  
  * Back to Home.  
  * Ícono 48px.  
  * H3.  
  * Body.  
  * Botón `+ Invitar miembro`.  
* Copy:  
  * `Todavía no invitaste a nadie.`  
  * `Cuando invites miembros, aparecen acá con su rol y foto.`

### **Planner → Tasks Empty State**

* Clasificación: REAL MVP parcial.  
* Objetivo: introducir tareas del hogar.  
* Componentes:  
  * Back to Home.  
  * Ícono 48px.  
  * H3.  
  * Body.  
  * Botón `+ Crear primera tarea`.  
* Copy:  
  * `Todavía no hay tareas en el hogar.`  
  * `Acá van a aparecer las compras, los trámites y todo lo que necesiten coordinar.`

### **More → Finance Empty State**

* Clasificación: DEMO PREMIUM.  
* Objetivo: pantalla visual de Finance sin datos.  
* Componentes:  
  * Back to More.  
  * Ícono 48px.  
  * H3.  
  * Botón `+ Agregar primer gasto`.  
* Copy:  
  * `Todavía no hay gastos este mes.`

### **More → Inventory Empty State**

* Clasificación: DEMO PREMIUM.  
* Objetivo: pantalla visual de Inventory sin datos.  
* Componentes:  
  * Back to More.  
  * Ícono 48px.  
  * H3.  
  * Body.  
  * Botón `+ Agregar primer ítem`.  
* Copy:  
  * `Todavía no hay productos en el inventario.`  
  * `Acá van a aparecer los consumibles del hogar y las alertas de stock bajo.`

### **People → Presence Empty State**

* Clasificación: DEMO PREMIUM / MOCK.  
* Objetivo: estado vacío de presencia.  
* Componentes:  
  * Back to People.  
  * Ícono 48px.  
  * H3.  
  * Body.  
* Copy:  
  * `Sin datos de presencia todavía.`  
  * `Cuando los miembros activen su ubicación, vas a ver quién está en casa.`

### **Flujo Adulto — Pantalla A1: Aceptar Invitación**

* Clasificación: REAL MVP.  
* Objetivo: aceptar invitación a hogar existente.  
* Componentes:  
  * Heading.  
  * Body.  
  * Card del hogar.  
  * Avatares en grupo.  
  * Botón `Unirme al hogar`.  
  * Botón ghost `No es mi hogar`.  
* Datos visibles:  
  * Nombre del invitador.  
  * Nombre del hogar.  
  * Miembros.  
  * Tipo de hogar.  
* Copy:  
  * `¡Te invitaron!`  
  * `Mariana te sumó a Casa de los Robles.`  
  * `Casa de los Robles`  
  * `Miembros: Mariana, Tomás, Don Carlos`  
  * `Tipo: Familia con hijos`

### **Flujo Adulto — Pantalla A2: Personalización**

* Clasificación: REAL MVP.  
* Componentes:  
  * Avatar.  
  * Nombre completo.  
  * Preferencia horaria de aviso.  
  * Tratamiento.  
  * Botón `Entrar a Casa de los Robles`.  
* Campos:  
  * Nombre completo.  
  * Hora preferida de aviso.  
  * Cómo te hablo: Nombre / Usted.

### **Home Post-Onboarding — Adulto**

* Clasificación: REAL MVP parcial \+ MOCK.  
* Estructura:  
  * Misma estructura oficial que Coordinador.  
  * Visibilidad operativa reducida.  
* Diferencias:  
  * Briefing: `Hola, Tomás. Tenés 0 tareas pendientes.`  
  * Carga Familiar no visible.  
  * Bottom Nav completa con permisos de Adulto.

### **Flujo Adolescente — Pantalla T1: Avatar \+ Color**

* Clasificación: REAL MVP parcial.  
* Componentes:  
  * Avatar XL 72px.  
  * Selector de 8 colores \+ emojis.  
  * Input nombre.  
  * Botón continuar.  
* Colores:  
  * 4 del Design System.  
  * Coral.  
  * Turquesa.  
  * Violeta.  
  * Grafito.  
* Emojis:  
  * `🎒 🎮 ⚽ 🎸 📚 🎨 🚲 🐱`  
* Regla:  
  * Sin foto real durante onboarding; opcional después.

### **Flujo Adolescente — Pantalla T2: Tono \+ Notificaciones**

* Clasificación: REAL MVP parcial.  
* Opciones de tono:  
  * `Directo (sin vueltas)`.  
  * `Tranqui (más relajado)`.  
* Notificaciones:  
  * `Normal` default.  
  * `Pocas`.  
* Botón:  
  * `Entrar`.

### **Home Post-Onboarding — Adolescente**

* Clasificación: REAL MVP parcial \+ DEMO PREMIUM.  
* Briefing:  
  * `Hola, Jose. Estas son tus misiones de hoy.`  
* Foco:  
  * Tareas.  
  * Eventos.  
  * Coordinación.  
* Rachas:  
  * Visibles como gamificación ligera.  
  * Sin comparación con otros.  
* Restricción:  
  * Sin tab Finance visible según permisos.  
* Bottom Nav:  
  * `[Home] [People] [+] [Planner] [More]`.

### **Flujo Niño — Pantalla N1: Avatar \+ Color**

* Clasificación: REAL MVP parcial.  
* Componentes:  
  * H1 grande y amigable.  
  * Avatar XL.  
  * Selector de animales.  
  * Input nombre.  
  * Botón `¡Listo!`.  
* Animales:  
  * `🐶 🐱 🐰 🦊 🐼 🐨`  
* Copy:  
  * `¡Hola!`  
  * `¿Cómo querés que te vean en casa?`

### **Flujo Niño — Pantalla N2: Lista Demo**

* Clasificación: MOCK / DEMO PREMIUM.  
* Objetivo: explicar visualmente cómo se verá su lista.  
* Items demo:  
  * `🧸 Ordenar tu cuarto`  
  * `📚 Hacer la tarea`  
  * `🐶 Darle de comer a Moka`  
* Regla:  
  * Items no interactivos aún.  
* Botón:  
  * `¡Entendido!`

### **Flujo Niño — Pantalla N3: Primera Tarea Interactiva**

* Clasificación: REAL MVP visual parcial.  
* Componente:  
  * Card de tarea.  
  * Checkbox interactivo.  
* Tarea:  
  * `🧸 Ordenar tu cuarto`  
* Instrucción:  
  * `Tocá el círculo para completar tu primera misión.`  
* Al completar:  
  * Checkbox 24×24px.  
  * Touch target 44×44px.  
  * Fill success-500.  
  * Animación 300ms ease-out \+ scale.  
  * Háptico `light`.  
  * Partículas sutiles: 3 estrellitas, 400ms, acent-500.  
  * Copy: `¡Listo! 🎯`.  
  * Transición a Home.

### **Home Post-Onboarding — Niño**

* Clasificación: REAL MVP parcial.  
* Experiencia:  
  * Simplificada.  
  * Solo una card: `Mi lista de hoy`.  
  * Tareas asignadas.  
  * Sin métricas.  
  * Sin finanzas.  
  * Sin configuración.  
  * Sin badges de error o alerta jamás.  
  * Tono simple, positivo, visual.  
  * Bottom Nav completa con permisos restringidos.

### **Flujo Adulto Mayor — Pantalla S1: Bienvenida \+ Tratamiento**

* Clasificación: REAL MVP.  
* Modo:  
  * `senior`.  
* Componentes:  
  * H1 senior 36px/44px.  
  * Input senior 64px.  
  * Cards seleccionables con mínimo 56px de alto.  
  * Botón lg 64px.  
* Opciones:  
  * Carlos.  
  * Don Carlos.  
  * Carlos García.

### **Flujo Adulto Mayor — Pantalla S2: Tamaño de Letra**

* Clasificación: REAL MVP.  
* Opciones:  
  * Letra grande.  
  * Letra normal.  
* Default:  
  * Letra grande.  
* Badge:  
  * `Recomendado`.  
* Regla:  
  * HomePlus recomienda activamente modo accesible.  
  * El usuario puede reducirlo.

### **Flujo Adulto Mayor — Pantalla S3: Medicación \+ Horario**

* Clasificación: DEMO PREMIUM / POST\_MVP si no se implementa Inventory real.  
* Componentes:  
  * Input medicamento.  
  * Selector simplificado de horario.  
  * Botón ghost `+ Agregar otro`.  
  * Botón ghost `Después lo cargo`.  
  * Botón continuar.  
* Ejemplo:  
  * Medicamento: `Losartán`.  
  * Hora: `9:00 AM`.  
* Nota:  
  * Se registra en Inventory según el documento, pero Inventory real no queda definido aquí.

### **Flujo Adulto Mayor — Pantalla S4: Contacto de Emergencia**

* Clasificación: REAL MVP parcial / DEMO PREMIUM según alcance.  
* Componentes:  
  * Input nombre del contacto.  
  * Input teléfono.  
  * Card info.  
  * Botón `Entrar a HomePlus`.  
* Ejemplo:  
  * Nombre: Mariana.  
  * Teléfono: `+54 11 5555-0000`.  
* Copy:  
  * `Este contacto va a aparecer en tu Home por si lo necesitás.`

### **Home Post-Onboarding — Adulto Mayor**

* Clasificación: REAL MVP parcial \+ DEMO PREMIUM.  
* Adaptaciones:  
  * Tipografía \+25-35%.  
  * Touch targets ≥56px.  
  * Contraste AA+.  
  * Toast 8s.  
  * Sin timeout en confirmaciones.  
  * Sin gestos.  
  * Sin pull-to-refresh.  
  * Solo tap.  
  * Bottom Nav con íconos \+ texto siempre visible.  
* Briefing:  
  * `Buen día, Don Carlos. Su medicación de las 9.`  
* Cards:  
  * Medicación prominente.  
  * Contacto de emergencia 1-tap.

### **Flujo Invitado — Pantalla I1: Aceptar**

* Clasificación: REAL MVP parcial.  
* Componentes:  
  * Heading.  
  * Body.  
  * Card info.  
  * Botón aceptar.  
* Copy:  
  * `Te invitaron como invitado`  
  * `Mariana te sumó a Casa de los Robles.`  
  * `Como invitado, solo ves lo necesario para participar.`  
  * `Aceptar invitación`

### **Home Post-Onboarding — Invitado**

* Clasificación: REAL MVP parcial.  
* Reglas visibles:  
  * Solo contexto autorizado por el Coordinador.  
  * Sin acceso a Finanzas.  
  * Sin acceso a Inventario.  
  * Sin acceso a Configuración.  
  * Sin métricas de Carga Familiar.  
  * Bottom Nav con tabs visibles según permisos configurados.

### **Flujo Empleado Familiar — Pantalla E1: Aceptar \+ Responsabilidades**

* Clasificación: POST\_MVP / DEMO PREMIUM visual.  
* Componentes:  
  * Heading.  
  * Body.  
  * Card de responsabilidades.  
  * Card de horario.  
  * Botón aceptar.  
* Responsabilidades de ejemplo:  
  * Limpieza general.  
  * Compras del hogar.  
* Horario de ejemplo:  
  * Lunes 09:00-13:00.  
  * Miércoles 09:00-13:00.  
  * Viernes 09:00-13:00.  
* Copy:  
  * `Te invitaron como empleado del hogar`  
  * `Aceptar y comenzar`

### **Flujo Empleado Familiar — Pantalla E2: Perfil Mínimo**

* Clasificación: POST\_MVP / DEMO PREMIUM visual.  
* Campos:  
  * Nombre.  
  * Teléfono opcional.  
* Ejemplo:  
  * Rosa.  
* Botón:  
  * `Entrar`.

### **Home Post-Onboarding — Empleado Familiar**

* Clasificación: POST\_MVP / DEMO PREMIUM visual.  
* Reglas visibles:  
  * Visión centrada en trabajo asignado.  
  * Solo ve tareas de sus responsabilidades.  
  * Geni con acceso limitado.  
  * No ve finanzas del hogar.  
  * No ve documentos.  
  * No ve métricas.  
  * No ve ubicación de otros miembros salvo configuración explícita.

---

## **6\. Componentes y patrones UI reutilizables**

### **Navegación**

* Splash.  
* Header con volver.  
* Progress bar de pasos.  
* Bottom Nav congelada.  
* Quick Actions con botón central `+`.  
* Back link textual desde pantallas internas.  
* Share sheet nativo.  
* Bottom sheet 50%.  
* Tabs internas en People y Planner mencionadas por navegación.

### **Botones**

* Botón primario.  
* Botón secundario.  
* Botón ghost.  
* Botón full-width.  
* Botón md.  
* Botón lg.  
* Botón senior 64px.  
* Botones deshabilitados hasta validación.  
* Sticky footer en bottom sheet.

### **Inputs**

* Input md 44px.  
* Input lg 52px.  
* Input senior 64px.  
* Input email.  
* Input password.  
* Toggle visibilidad password.  
* Input nombre.  
* Input nombre completo.  
* Input email o teléfono.  
* Input medicamento.  
* Input teléfono.  
* Autofocus en algunos campos.  
* Campos pre-rellenados.

### **Cards**

* Cards seleccionables.  
* Cards de rol.  
* Cards de tipo de hogar.  
* Cards de notificación.  
* Cards de tratamiento.  
* Cards de briefing.  
* Cards de sugerencia.  
* Cards de Home.  
* Cards informativas.  
* Cards de tarea.  
* Cards de horario.  
* Cards de responsabilidades.  
* Card alerta.  
* Card destacada con borde izquierdo 4px.

### **Chips**

* Chips informativos en bienvenida.  
* Chips sugeridos por Geni para lista de compras.  
* Chips con ícono \+ texto.  
* Chips no interactivos en bienvenida.  
* Chips accionables en bottom sheet.

### **Avatares**

* Avatar hogar 72px.  
* Avatar personal 72px.  
* Avatar adolescente XL.  
* Avatar niño XL.  
* Iniciales si no hay foto.  
* Fondo por hash de nombre.  
* Avatares agrupados en invitación.

### **Estados visuales**

* Default.  
* Selected.  
* Disabled.  
* Loading.  
* Error.  
* Empty.  
* Success.  
* Offline.  
* Pending invitation.  
* Recommended badge.  
* Toast superior.  
* Spinner dentro de botón.  
* Overlay anti doble-tap.

### **Empty states**

Patrón:

* Ícono 48px.  
* Título H3.  
* Descripción body S.  
* Máximo una acción sugerida.  
* Rol-aware.  
* No tristes.  
* Funcionan como tutorial.  
* Sin tooltips.  
* Sin carruseles.

### **Checkbox de tarea**

* Tamaño visual: 24×24px.  
* Touch target: 44×44px.  
* 1 tap completa.  
* Animación fill \+ scale.  
* Estado success-500.  
* Háptico light en Niño.  
* Partículas sutiles en onboarding Niño.

### **Toast**

* Toast superior.  
* Para error de red.  
* Para email registrado.  
* Para link copiado.  
* Para primera lista guardada.  
* Adulto Mayor: duración 8s.  
* En confirmaciones senior: sin timeout.

### **Feedback**

* Spinner sutil en Splash.  
* Spinner en botones.  
* Overlay anti doble-tap.  
* Crossfade entre Splash y Bienvenida.  
* Fade-in y scale para logo.  
* Haptic light en tarea de Niño.

---

## **7\. Visual design aplicable**

### **Plataforma y layout**

* Mobile-first.  
* Base 375×812px.  
* React Native / Expo.  
* Layout vertical.  
* Bottom Nav fija.  
* Una acción principal por pantalla.  
* Densidad baja en onboarding.  
* Jerarquía clara.

### **Colores explícitos**

* `prim-50`: `#FAF3ED`, fondo crema suave.  
* `bg-primary`: `#FBFAF8`.  
* `prim-500`: usado en logo, borde destacado, estados selected.  
* `prim-600`: usado en nombre HomePlus.  
* `prim-300`: spinner, íconos empty state.  
* `text-primary`.  
* `text-secondary`.  
* `text-tertiary`.  
* `divider-strong`.  
* `surface-card`.  
* `error-500`.  
* `error-600`.  
* `success-500`.  
* `acent-500`.  
* `info-100`.

### **Colores de avatar por hash**

* Arcilla: `#F2E0D4`.  
* Salvia: `#D8E5DA`.  
* Miel: `#F2E6CC`.  
* Lavanda: `#E4DFF0`.

### **Tipografía explícita**

* Display / headings:  
  * Fraunces.  
  * Fraunces 700, 32px/40px para HomePlus en Splash.  
  * Fraunces 600, 24px/32px en bienvenida.  
  * Fraunces 600, 28px en H1.  
  * Fraunces 700, 32px en greeting de Home.  
  * Senior H1 36px/44px.  
* Body:  
  * Inter.  
  * Inter 400, 16px/24px.  
  * Inter 400, 18px/26px.  
  * Inter 600, 20px para H3.  
  * Body S para descripciones.  
  * Body L en pantallas principales.

### **Espaciado**

* 40px entre chips y botón en bienvenida.  
* 16px entre botones.  
* Cards con padding 16px.  
* Gap ícono/texto: 12px.  
* Bottom sheet 50% para primer valor.

### **Component sizing**

* Logo: 80×80px.  
* Avatar hogar: 72px.  
* Avatar personal: 72px.  
* Íconos de role cards: 32×32px.  
* Íconos empty state: 48px.  
* Chips: 28px.  
* Botón grande: 52px.  
* Input md: 44px.  
* Input lg: 52px.  
* Senior input: 64px.  
* Senior cards: mínimo 56px.  
* Senior buttons: 64px.  
* Checkbox: 24×24px visual, 44×44px touch target.

### **Animaciones**

* Logo Splash: fade-in \+ scale 0.9→1, 400ms ease-out.  
* Tagline: fade-in con 200ms delay.  
* Spinner: aparece con 500ms delay.  
* Transición a bienvenida: crossfade 300ms.  
* Checkbox niño: 300ms ease-out \+ scale.  
* Partículas niño: 3 estrellas, 400ms.

### **Accesibilidad**

* Modo senior.  
* Letra grande por default para Adulto Mayor.  
* Tipografía \+25-35%.  
* Touch targets ≥56px.  
* Contraste AA+.  
* Sin gestos en senior.  
* Sin pull-to-refresh en senior.  
* Íconos \+ texto siempre visibles en Bottom Nav senior.  
* Toast 8s en senior.  
* Sin timeout en confirmaciones senior.

### **Información no encontrada**

No se encontró información específica sobre:

* Blur.  
* Glassmorphism.  
* Sombras detalladas.  
* Radios exactos.  
* Elevation.  
* Gradientes.  
* Safe areas.  
* Breakpoints tablet, salvo base mobile.  
* Librerías visuales concretas.  
* Tokens completos.

---

## **8\. Home**

### **Rol de Home**

* Home es el centro operativo.  
* Home resume información.  
* Home no administra información.  
* Toda card conduce al módulo administrador.  
* Es el destino final post-onboarding.  
* Debe mostrar la estructura oficial inmediatamente después de crear o aceptar hogar.

### **Home Coordinador nuevo**

Orden visual:

1. Header con avatar y nombre de hogar.  
2. Greeting con nombre.  
3. Fecha y hora.  
4. Briefing diario.  
5. Atención requerida.  
6. Carga Familiar.  
7. Tareas / Mis pendientes.  
8. Próximos eventos.  
9. Bottom Nav.

### **Header**

* `[Avatar] Casa de los Robles ▼`.  
* Multi-hogar visible solo si hay 2+ hogares.  
* Para MVP inicial, si solo hay un hogar, puede no mostrarse como selector.

### **Briefing**

* Clasificación: MOCK / DEMO PREMIUM.  
* Card destacada.  
* Borde izquierdo prim-500 de 4px.  
* Texto ejemplo:  
  * `Bienvenida a Casa de los Robles. Ya tenés todo listo para arrancar. Estas son tus primeras acciones.`  
* En roles:  
  * Adulto: `Hola, Tomás. Tenés 0 tareas pendientes.`  
  * Adolescente: `Hola, Jose. Estas son tus misiones de hoy.`  
  * Adulto Mayor: `Buen día, Don Carlos. Su medicación de las 9.`

### **Atención requerida**

* Clasificación: REAL MVP parcial.  
* Condicional.  
* Ejemplo:  
  * `Tu hogar está solo por ahora.`  
  * Botón: `Invitar miembros →`.  
* Puede vincular con Invitations / Members.

### **Carga Familiar**

* Clasificación: MOCK / DEMO PREMIUM.  
* Visible solo para Coordinador según documento.  
* En Coordinador nuevo:  
  * `Todavía no hay miembros para calcular la carga.`  
* No visible para Adulto.  
* No visible para Invitado.  
* No visible para Niño.  
* No definida con datos reales.

### **Tareas en Home**

* Clasificación: REAL MVP parcial.  
* Card:  
  * `📋 Mis pendientes (0)`.  
  * Agrupadas por Responsabilidad según documento.  
  * Texto:  
    * `Sin tareas pendientes.`  
    * `¿Creamos la primera?`  
  * Acción:  
    * `[+ Crear tarea]`  
* Relación:  
  * Conduce a Planner / Tasks.

### **Próximos eventos**

* Clasificación: REAL MVP parcial.  
* Card:  
  * `📅 Sin eventos esta semana`.  
  * `¿Agregamos el primero?`  
* Relación:  
  * Conduce a Planner / Calendar / Events.

### **Home por rol**

| Rol | Home |
| ----- | ----- |
| Coordinador | Estructura completa. Ve Carga Familiar. Puede invitar. Puede crear tarea/evento. |
| Adulto | Misma estructura, visibilidad operativa reducida. No ve Carga Familiar. |
| Adolescente | Más foco en tareas, eventos y coordinación. Rachas visibles. Sin Finance visible. |
| Niño | Solo `Mi lista de hoy`. Sin métricas, sin finanzas, sin configuración, sin alertas visuales negativas. |
| Adulto Mayor | Modo senior, medicación prominente, contacto de emergencia siempre visible. |
| Invitado | Solo contexto autorizado. Sin Finance, Inventory, Settings ni Carga Familiar. |
| Empleado Familiar | Tareas asignadas por responsabilidad, acceso limitado. |

### **Home mock / demo premium**

* Briefing.  
* Carga Familiar.  
* Presence resumido, si aparece desde la estructura general del archivo de comprensión.  
* Feed / Actividad familiar como empty/demo.  
* Geni suggestions.  
* Rachas adolescente.  
* Medicación senior si Inventory no está real.

### **Información faltante**

* No define Home con tareas reales cargadas.  
* No define Home con eventos reales cargados.  
* No define estado de refresh.  
* No define skeletons de Home.  
* No define realtime.  
* No define layout completo para listas pobladas.  
* No define comportamiento de Home con múltiples hogares más allá del selector visible si 2+ hogares.  
* No define comportamiento de errores por card.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner general**

* Clasificación: REAL MVP parcial para acceso visual; incompleto para implementación total.  
* Planner aparece en Bottom Nav.  
* Planner inicial tiene:  
  * Tasks vacío.  
  * Calendar vacío.  
  * Goals vacío.  
* Desde archivo de comprensión:  
  * Planner contiene Tasks, Calendar, Goals y Responsabilidades.  
  * Planner es núcleo operativo.  
* El documento principal desarrolla sobre todo empty states y primer valor.

### **Tasks**

Información encontrada:

* Task aparece como primera acción potencial.  
* `Crear primera tarea` aparece en Home y Planner empty state.  
* `Crear la lista de compras de la semana` aparece como sugerencia de primer valor.  
* `Lista de compras` se abre en bottom sheet 50%.  
* La primera tarea interactiva del Niño es `Ordenar tu cuarto`.  
* Checkbox completa tarea en onboarding Niño.  
* Tasks empty state:  
  * `Todavía no hay tareas en el hogar.`  
  * `Acá van a aparecer las compras, los trámites y todo lo que necesiten coordinar.`  
  * Acción: `+ Crear primera tarea`.  
* Home sin tareas:  
  * Coordinador: `Sin tareas pendientes. ¿Creamos la primera?` \+ `[Crear tarea]`.  
  * Adulto: `No tenés tareas pendientes. Cuando haya, aparecen acá.`  
  * Adolescente: `Sin misiones por ahora.`  
  * Niño: `¡Tu lista está vacía! Nada pendiente.`  
* En Home, tareas se agrupan por Responsabilidad según documento.  
* Para Empleado Familiar:  
  * Solo ve tareas de sus responsabilidades.  
* Para Niño:  
  * Solo ve tareas asignadas en `Mi lista de hoy`.

Datos demo de tasks:

* `Ordenar tu cuarto`.  
* `Hacer la tarea`.  
* `Darle de comer a Moka`.  
* `Crear la lista de compras de la semana`.  
* Items sugeridos:  
  * Leche.  
  * Pan.  
  * Huevos.  
  * Manteca.

Componentes aplicables:

* Task card.  
* Checkbox.  
* Empty state.  
* CTA crear primera tarea.  
* Bottom sheet de creación rápida.  
* Chips de sugerencia.  
* Toast de guardado.  
* Agrupación por Responsabilidad mencionada.

Clasificación:

* REAL MVP:  
  * Acceso a Tasks desde Planner.  
  * Crear primera tarea como CTA.  
  * Completar tarea visualmente.  
  * Mostrar tareas pendientes en Home.  
  * Tareas asignadas a Niño.  
* MOCK / DEMO PREMIUM:  
  * Lista demo de Niño.  
  * Sugerencias de Geni.  
  * Chips comunes.  
  * Si no hay backend, creación de lista puede ser local/mock.  
* POST\_MVP:  
  * Geni real creando tareas.  
  * Responsabilidades completas si no están implementadas.  
  * Rachas del adolescente si requieren lógica real avanzada.

Información faltante para Tasks:

* No define crear tarea completo.  
* No define editar tarea.  
* No define eliminar tarea.  
* No define verificar tarea.  
* No define asignar responsable.  
* No define prioridad.  
* No define fecha límite.  
* No define estados técnicos.  
* No define filtros.  
* No define vistas de lista poblada.  
* No define endpoint.  
* No define request / response.  
* No define verification flow.  
* No define templates predefinidas.  
* No define permisos exactos de creación / edición.

### **Events**

Información encontrada:

* Event aparece como sugerencia de primer valor:  
  * `Cargar los eventos fijos de la semana`.  
* Acción:  
  * Bottom sheet 50% para crear primer evento.  
* Home:  
  * Card `Próximos Eventos`.  
  * Estado vacío: `Sin eventos esta semana. ¿Agregamos el primero?`  
* Planner → Calendar:  
  * Empty state:  
    * `Calendario libre por ahora. ¿Agregamos algo?`  
    * Acción: `[+ Crear primer evento]`.

Clasificación:

* REAL MVP parcial:  
  * Acceso visual a crear evento.  
  * Mostrar próximos eventos en Home.  
  * Calendar empty state.  
* DEMO PREMIUM / MOCK:  
  * Crear evento desde bottom sheet si no hay contrato real.  
* POST\_MVP:  
  * Recurrencia compleja no definida.  
  * Participantes avanzados no definidos.

Información faltante para Events:

* No define campos del evento.  
* No define editar evento.  
* No define eliminar/cancelar evento.  
* No define listar eventos.  
* No define fecha/hora.  
* No define all-day.  
* No define ubicación.  
* No define participantes.  
* No define recurrencia.  
* No define estados.  
* No define endpoints.  
* No define vista poblada.

### **Calendar**

Información encontrada:

* Calendar aparece en bienvenida como valor:  
  * `Calendario familiar`.  
* Calendar aparece en Planner.  
* Calendar aparece como empty state.  
* Calendar está vinculado a eventos.  
* Adulto Mayor: eventos de salud se derivan a Calendar según decisión OB-14.  
* Documento menciona `Planner → Calendar`.

Clasificación:

* REAL MVP parcial:  
  * Tab / sección Calendar.  
  * Empty state.  
  * CTA crear primer evento.  
* Información insuficiente:  
  * No define vista día.  
  * No define vista semana.  
  * No define vista mes.  
  * No define agenda.  
  * No define tareas con fecha dentro del calendario.  
  * No define navegación de fecha.  
  * No define filtros.

### **Goals**

* Clasificación: DEMO PREMIUM / POST\_MVP.  
* Aparece en Planner como tab o sección vacía.  
* Empty state:  
  * `Sin metas todavía. ¿Te animás a crear la primera?`  
  * Acción: `[+ Crear meta]`.  
* No debe tratarse como REAL MVP desde este documento.

---

## **10\. People / Members / Roles**

### **People**

* Clasificación: REAL MVP parcial \+ DEMO PREMIUM.  
* People aparece en Bottom Nav.  
* Contenido para Coordinador nuevo:  
  * Feed vacío.  
  * Presence sin datos.  
  * Personas con solo Coordinador.  
* Subvistas mencionadas:  
  * Feed.  
  * Presence.  
  * Personas.

### **Personas / Members**

Información frontend:

* Lista de miembros aparece como Personas.  
* Empty state para Coordinador:  
  * `Todavía no invitaste a nadie.`  
  * `Cuando invites miembros, aparecen acá con su rol y foto.`  
  * Acción: `+ Invitar miembro`.  
* Estado de invitación pendiente:  
  * `Mateo — Pendiente ⏳. Cuando acepte, aparece acá.`  
  * Acción: `Reenviar`.  
* En invitación Adulto se muestran:  
  * Nombre del hogar.  
  * Miembros existentes.  
  * Avatares agrupados.  
  * Tipo de hogar.  
* Miembros demo:  
  * Mariana.  
  * Tomás.  
  * Don Carlos.  
  * Mateo.

### **Roles**

Roles visibles / tratados:

* Coordinador/a.  
* Adulto.  
* Adolescente.  
* Niño/a.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

Mapeo a nombres técnicos sugeridos por el prompt:

| Documento | Fragment frontend |
| ----- | ----- |
| Coordinador/a | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño/a | Child |
| Adulto Mayor | Senior |
| Invitado | Guest |
| Empleado Familiar | POST\_MVP / fuera del MVP principal |

### **Permisos visibles por rol**

| Rol | Visible / permitido en UI | Oculto / restringido |
| ----- | ----- | ----- |
| Coordinador | Crear hogar, invitar miembros, ver Carga Familiar, Home completa, crear tarea/evento | No se especifican prohibiciones detalladas |
| Adulto | Aceptar invitación, personalizar perfil, Bottom Nav completa con permisos de Adulto | Carga Familiar no visible |
| Adolescente | Tareas, eventos, coordinación, rachas | Sin Finance visible |
| Niño | Mi lista de hoy, tareas asignadas, UI simple | Sin métricas, sin finanzas, sin configuración, sin alertas negativas |
| Senior | Permisos equivalentes a Adulto, modo senior | Sin gestos, sin pull-to-refresh |
| Guest | Aceptar invitación, contexto autorizado | Sin Finanzas, Inventario, Configuración, Carga Familiar |
| Empleado Familiar | Responsabilidades asignadas, horario, tareas de sus responsabilidades | Sin finanzas, documentos, métricas ni ubicación de otros salvo configuración explícita |

### **Información faltante**

* No define lista poblada de miembros.  
* No define pantalla detalle de miembro.  
* No define aprobar/rechazar solicitudes.  
* No define suspender/finalizar miembro.  
* No define editar rol.  
* No define permisos completos por acción.  
* No define estado visual para suspended/finalized.  
* No define relación real con tareas/eventos salvo asignaciones mencionadas parcialmente.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

Información frontend:

* Crear hogar durante onboarding de Coordinador.  
* Pantallas:  
  1. Tipo de hogar.  
  2. Nombre \+ foto.  
  3. Disponibilidad horaria.  
* Tipo de hogar ajusta defaults y reglas de acceso.  
* Foto del hogar opcional.  
* Nombre del hogar obligatorio.  
* Disponibilidad por franjas.

Datos:

* Nombre ejemplo: `Casa de los Robles`.  
* Tipos:  
  * Familia con hijos.  
  * Familia extendida.  
  * Pareja.  
  * Convivientes.

Clasificación:

* REAL MVP:  
  * Crear hogar visual.  
  * Nombre del hogar.  
  * Tipo de hogar.  
  * Foto opcional.  
* DEMO PREMIUM / POST\_MVP:  
  * Reglas finas de visibilidad por tipo.  
  * Co-coordinadores en Pareja.  
  * Privacidad segmentada avanzada.

Información faltante:

* No define household settings posteriores.  
* No define selector de hogar salvo header visible si 2+ hogares.  
* No define endpoint.  
* No define request/response.  
* No define validación de duplicados.  
* No define slug.

### **Invitations**

Información frontend:

* Invitación durante onboarding.  
* Invitación postergable.  
* Inputs:  
  * Nombre del miembro.  
  * Email o teléfono.  
* Acciones:  
  * Enviar invitación.  
  * Compartir link.  
  * Después lo hago.  
* Link:  
  * Único del hogar.  
  * Válido 7 días.  
  * Share sheet nativo.  
  * WhatsApp-first por decisión OB-15.  
* Canales de share:  
  * WhatsApp.  
  * Mensajes.  
  * Mail.  
  * Copiar link.  
* Toast:  
  * `Link copiado. Vence en 7 días.`  
* Texto del link:  
  * `Mariana te invitó a Casa de los Robles en HomePlus`.

### **Aceptar invitación**

Pantallas:

* Adulto:  
  * Aceptar invitación con resumen del hogar.  
  * Personalización.  
* Invitado:  
  * Aceptar invitación con info de acceso mínimo.  
* Empleado Familiar:  
  * Aceptar responsabilidades y horario.  
* Flujos alternativos indican:  
  * Adulto llega por invitación de Coordinador.  
  * Invitado llega por invitación de Coordinador o Adulto.

Estados / errores:

* Token expirado:  
  * `El link ya no es válido. Pedí uno nuevo.`  
* Invitación pendiente:  
  * Empty state de Personas puede mostrar `Mateo — Pendiente ⏳`.

Información faltante:

* No define pending approval explícito con pantalla.  
* No define aprobar/rechazar miembro.  
* No define estado rejected.  
* No define estado accepted.  
* No define invitación ya usada.  
* No define reenviar técnicamente.  
* No define permisos para invitar salvo menciones por rol.  
* No define endpoint.

### **Onboarding por rol**

Clasificación:

* REAL MVP:  
  * Coordinador.  
  * Adulto.  
  * Adolescente.  
  * Niño.  
  * Adulto Mayor.  
  * Invitado.  
* POST\_MVP / opcional:  
  * Empleado Familiar.

Principios:

* Coordinador: máximo 5-7 pantallas.  
* Adulto: 2 pantallas.  
* Adolescente: 2 pantallas.  
* Niño: 3 pantallas.  
* Adulto Mayor: 4 pantallas.  
* Invitado: 1 pantalla.  
* Empleado Familiar: 2 pantallas.

---

## **12\. More / Settings / Profile**

### **More**

* Clasificación: DEMO PREMIUM \+ REAL parcial.  
* Aparece en Bottom Nav.  
* Contenido indicado:  
  * Finance.  
  * Inventory.  
  * HomeCloud.  
  * Settings.

### **Finance**

* Clasificación: DEMO PREMIUM.  
* Empty state:  
  * `Todavía no hay gastos este mes.`  
  * Acción: `+ Agregar primer gasto`.  
* Quick Actions:  
  * `Registrar gasto`.  
* Adolescente:  
  * Sin tab Finance visible según permisos.  
* Guest:  
  * Sin acceso a Finanzas.  
* Empleado Familiar:  
  * No ve finanzas del hogar.

### **Inventory**

* Clasificación: DEMO PREMIUM / POST\_MVP según alcance.  
* Empty state:  
  * `Todavía no hay productos en el inventario.`  
  * `Acá van a aparecer los consumibles del hogar y las alertas de stock bajo.`  
  * Acción: `+ Agregar primer ítem`.  
* Adulto Mayor:  
  * Medicación se registra en Inventory según documento.  
  * Empty state específico:  
    * `No hay medicamentos cargados. Su coordinador puede agregarlos por usted.`  
* Guest:  
  * Sin acceso a Inventario.

### **HomeCloud**

* Clasificación: DEMO PREMIUM.  
* Empty state:  
  * `La nube familiar está vacía. ¿Suben la primera foto o documento?`  
  * Acción: `+ Subir`.

### **Settings**

* Clasificación: REAL MVP parcial / DEMO PREMIUM.  
* Documento indica:  
  * Settings nunca está vacío.  
  * More incluye Settings.  
  * Invitado no accede a Configuración.  
  * Niño no ve configuración.  
* Información faltante:  
  * No define pantalla Settings.  
  * No define secciones de Settings.  
  * No define perfil completo.  
  * No define logout visual.  
  * No define privacidad visual.  
  * No define ayuda.

### **Profile**

* Clasificación: REAL MVP parcial.  
* Se define a través de personalización:  
  * Foto.  
  * Nombre completo.  
  * Tratamiento.  
  * Notificaciones.  
  * Avatar y color por rol.  
* Información faltante:  
  * No define pantalla Profile posterior.  
  * No define edición de perfil.  
  * No define cambio de contraseña desde Profile.

---

## **13\. Quick Actions**

### **Estructura**

* Acceso mediante botón central `+` de Bottom Nav.  
* Clasificación: MIXTO.  
* Contenido para Coordinador nuevo:  
  * Geni fijo.  
  * Crear tarea.  
  * Crear evento.  
  * Registrar gasto.

### **Acciones extraídas**

| Acción | Clasificación | Fuente / motivo |
| ----- | ----- | ----- |
| Geni | DEMO PREMIUM / MOCK | Geni aparece como asistente fijo y sugeridor. IA real no está definida. |
| Crear tarea | REAL MVP parcial | Aparece en Quick Actions, Home y Planner empty state. |
| Crear evento | REAL MVP parcial | Aparece en Quick Actions, primer valor y Calendar empty state. |
| Registrar gasto | DEMO PREMIUM | Finance no está definido como real en este documento. |
| Compartir link | REAL MVP | En Invitación a miembros; usa share sheet nativo. |
| Invitar miembro | REAL MVP | Desde onboarding y empty state Personas / Home. |
| Agregar primer ítem | DEMO PREMIUM | Inventory empty state. |
| Agregar primer gasto | DEMO PREMIUM | Finance empty state. |
| Crear meta | DEMO PREMIUM / POST\_MVP | Goals empty state. |
| Subir a HomeCloud | DEMO PREMIUM / POST\_MVP | HomeCloud empty state. |

### **Información faltante**

* No define UI exacta del panel Quick Actions.  
* No define si abre modal, bottom sheet o pantalla para todas las acciones.  
* No define orden dinámico.  
* No define permisos exactos por rol en Quick Actions.  
* No define estado abierto/cerrado.  
* No define animaciones del panel.

---

## **14\. Módulos demo premium**

### **Geni**

* Clasificación: DEMO PREMIUM / MOCK.  
* Usos:  
  * Texto `Así te va a llamar Geni`.  
  * Configuración de tono.  
  * Configuración de notificaciones.  
  * Card de primer valor.  
  * Sugerencias concretas.  
  * Briefing diario.  
  * Sugerencias de lista de compras.  
* No implementar real desde este documento:  
  * IA real.  
  * Rankeo de acciones real.  
  * Generación inteligente real.  
  * Automatizaciones reales.

### **Finance**

* Clasificación: DEMO PREMIUM.  
* Pantalla:  
  * More → Finance empty state.  
* Acción:  
  * `+ Agregar primer gasto`.  
  * `Registrar gasto` desde Quick Actions.  
* No implementar real:  
  * Cuentas.  
  * Presupuestos.  
  * Deudas.  
  * Reportes.  
  * Backend financiero.

### **Inventory**

* Clasificación: DEMO PREMIUM / POST\_MVP.  
* Pantalla:  
  * More → Inventory empty state.  
* Acción:  
  * `+ Agregar primer ítem`.  
* Adulto Mayor:  
  * Medicación \+ horario.  
* No implementar real:  
  * Stock real.  
  * Alertas reales.  
  * Vencimientos.  
  * Medicación real con notificaciones, salvo mock.

### **HomeCloud**

* Clasificación: DEMO PREMIUM.  
* Pantalla:  
  * More → HomeCloud empty state.  
* Acción:  
  * `+ Subir`.  
* No implementar real:  
  * Storage avanzado.  
  * OCR.  
  * Documentos reales.  
  * Álbumes reales.

### **Presence**

* Clasificación: DEMO PREMIUM / MOCK.  
* Pantalla:  
  * People → Presence empty state.  
* Copy:  
  * `Sin datos de presencia todavía. Cuando los miembros activen su ubicación, vas a ver quién está en casa.`  
* No implementar real:  
  * GPS.  
  * Ubicación.  
  * Geofencing.  
  * Check-ins reales.

### **Feed**

* Clasificación: DEMO PREMIUM / MOCK.  
* Pantalla:  
  * People → Feed empty state.  
* Copy:  
  * `El feed está vacío. Cuando haya actividad en el hogar, aparece acá.`  
* No implementar real:  
  * Posts.  
  * Comentarios.  
  * Reacciones.  
  * Activity real.

### **Goals**

* Clasificación: DEMO PREMIUM / POST\_MVP.  
* Pantalla:  
  * Planner → Goals empty state.  
* Copy:  
  * `Sin metas todavía. ¿Te animás a crear la primera?`  
* Acción:  
  * `+ Crear meta`.  
* No implementar real:  
  * Metas.  
  * Hitos.  
  * Streaks reales.

### **SOS**

* Clasificación: DEMO PREMIUM / POST\_MVP.  
* Información:  
  * Acceso vía swipe ↑ desde cualquier pantalla.  
  * No está en Bottom Nav.  
  * No está en Quick Actions.  
* No implementar real desde este documento:  
  * Alertas reales.  
  * Contactos de emergencia reales.  
  * Fallbacks.  
  * Escalamiento.

### **Activity / Actividad Familiar**

* Clasificación: MOCK / DEMO PREMIUM.  
* Aparece como Feed / actividad del hogar en empty states y comprensión asociada.  
* No se define pantalla completa poblada.

### **Carga Familiar**

* Clasificación: MOCK / DEMO PREMIUM.  
* Visible en Home para Coordinador.  
* No visible para otros roles según documento.  
* Estado inicial:  
  * No hay miembros para calcular carga.  
* No se define cálculo real.

---

## **15\. Estados UX y feedback**

### **Estados de carga**

* Splash loading.  
* Spinner animado.  
* Si Splash tarda \>5s:  
  * Mostrar `Cargando...`.  
* Si Splash no inicializa en 10s:  
  * Pantalla de error con botón `Reintentar`.  
* Loading en botón durante registro.  
* Loading en botón durante nombre.  
* Login social con overlay y spinner:  
  * `Conectando...`.

### **Estados de validación**

* Botón disabled hasta validación.  
* Email inválido con borde error-500 y caption error-600.  
* Password se valida on-blur.  
* Nombre vacío deshabilita botón.  
* Nombre largo muestra error.  
* Nombre con caracteres inválidos muestra error.

### **Estados de error**

* Email ya registrado.  
* Contraseña débil.  
* Red caída.  
* Token expirado.  
* Error de carga inicial.  
* Error creando cuenta.  
* No es mi hogar como acción ghost en invitación.

### **Estados offline**

* Splash carga offline.  
* Pantallas solo UI funcionan offline:  
  * Bienvenida.  
  * Selección Rol.  
  * Tipo Hogar.  
  * Disponibilidad.  
* Pantallas con backend:  
  * Registro.  
  * Login.  
  * Invitación.  
* Comportamiento backend offline:  
  * Toast `Sin conexión. Cuando vuelva, continuamos donde estabas.`  
  * Datos no se pierden.

### **Estados de selección**

* Role cards:  
  * Default.  
  * Selected.  
* Household type cards.  
* Tono.  
* Notificaciones.  
* Letra grande / normal.  
* Avatar / color.  
* Disponibilidad.

### **Estados empty**

* Home sin tareas.  
* Home sin miembros.  
* People Personas vacío.  
* People Personas invitación pendiente.  
* People Feed vacío.  
* People Presence vacío.  
* Planner Tasks vacío.  
* Planner Calendar vacío.  
* Planner Goals vacío.  
* More Finance vacío.  
* More Inventory vacío.  
* More Inventory medicación Adulto Mayor vacío.  
* More HomeCloud vacío.  
* Settings nunca está vacío.

### **Estados success**

* Link copiado.  
* Primera lista guardada.  
* Checkbox niño completado.  
* Cuenta creada con transición directa.  
* Onboarding completado con Home.

### **Estados por invitación**

* Invitación pendiente.  
* Link expirado.  
* Aceptar invitación.  
* Reenviar invitación mencionado.  
* No se define aprobado/rechazado.

### **Estados no encontrados**

No se encontró información específica sobre:

* Refreshing.  
* Pull-to-refresh, salvo que en Senior no se usa.  
* Forbidden genérico.  
* Approved.  
* Rejected.  
* Suspended.  
* Finalized.  
* Verified.  
* Cancelled.  
* Overdue.  
* Conflict.  
* Optimistic update.  
* Realtime update.

---

## **16\. Formularios y datos de entrada**

### **Login**

* Campos:  
  * Email.  
  * Password.  
* Acciones:  
  * Entrar.  
  * Recuperación.  
* Social:  
  * Google.  
  * Apple.  
* Flujo:  
  * Social auth → OK → Home.  
* Información faltante:  
  * Pantalla de login no está descrita visualmente en detalle dentro de sección 2, solo aparece en diagrama.

### **Register — Credenciales**

* Campos:  
  * Email.  
  * Contraseña.  
* Validaciones:  
  * Email formato `x@y.z`.  
  * Password mínimo 8 caracteres.  
* Botón:  
  * Continuar.  
* Social:  
  * Google.  
  * Apple.  
* Legal:  
  * Términos y Política de Privacidad.

### **Register — Nombre**

* Campo:  
  * Nombre.  
* Validaciones:  
  * No vacío.  
  * Máximo 40 caracteres.  
  * Solo letras, espacios y acentos.  
* Botón:  
  * Entrar a HomePlus.

### **Recuperación de contraseña**

* Flujo:  
  * Pantalla email.  
  * `Te enviamos un link`.  
  * Email con link.  
  * Nueva contraseña.  
  * OK.  
* Información faltante:  
  * No define UI completa.  
  * No define validaciones.  
  * No define botón exacto.  
  * No define errores salvo token expirado.

### **Selección de rol**

* Input:  
  * Card seleccionable.  
* Botón:  
  * Continuar.  
* Roles:  
  * Coordinador/a.  
  * Adulto.  
  * Adolescente.  
  * Niño/a.  
  * Adulto Mayor.

### **Crear hogar — Tipo**

* Input:  
  * Card seleccionable.  
* Opciones:  
  * Familia con hijos.  
  * Familia extendida.  
  * Pareja.  
  * Convivientes.  
* Botón:  
  * Continuar.

### **Crear hogar — Nombre y foto**

* Campos:  
  * Nombre del hogar.  
  * Foto opcional.  
* Validaciones:  
  * Nombre no vacío.  
  * Máximo 30 caracteres.  
* Acción:  
  * Foto abre bottom sheet cámara / galería.  
* Botón:  
  * Continuar.

### **Crear hogar — Disponibilidad**

* Inputs:  
  * Tiempo disponible.  
  * Hora preferida de aviso.  
* Opciones de tiempo:  
  * 1 a 2 horas por día.  
  * 3 a 4 horas por día.  
  * 5 horas o más.  
* Opciones de aviso:  
  * Mañana.  
  * Media mañana.  
  * Tarde.  
  * Noche.

### **Perfil**

* Campos:  
  * Foto opcional.  
  * Nombre completo.  
  * Tono/tratamiento.  
  * Nivel de notificaciones.  
* Default:  
  * Nombre pre-rellenado.  
  * Notificaciones: Media.  
  * Adulto Mayor: Letra grande.

### **Invite Member**

* Campos:  
  * Nombre del miembro.  
  * Email o teléfono.  
* Acciones:  
  * Enviar invitación.  
  * Compartir link.  
  * Después lo hago.

### **Accept Invitation**

* Adulto:  
  * Unirme al hogar.  
  * No es mi hogar.  
  * Luego perfil.  
* Invitado:  
  * Aceptar invitación.  
* Empleado Familiar:  
  * Aceptar y comenzar.

### **Create Task / First Value**

* Bottom sheet lista de compras:  
  * Campo para primer ítem.  
  * Chips sugeridos.  
  * Guardar.  
* No se define formulario completo de task.

### **Create Event / First Value**

* Bottom sheet 50%.  
* No se definen campos.

### **Adulto Mayor — Medicación**

* Campos:  
  * Medicamento.  
  * Hora.  
* Acciones:  
  * Agregar otro.  
  * Después lo cargo.  
  * Continuar.

### **Adulto Mayor — Contacto de emergencia**

* Campos:  
  * Nombre del contacto.  
  * Teléfono.  
* Acción:  
  * Entrar a HomePlus.

---

## **17\. Datos demo extraíbles**

### **Nombres de personas**

* Mariana.  
* Tomás.  
* Don Carlos.  
* Mateo.  
* Jose.  
* Luca.  
* Carlos.  
* Carlos García.  
* Sra. García.  
* Rosa.

### **Hogar**

* Casa de los Robles.

### **Roles / labels**

* Coordinador/a.  
* Adulto.  
* Adolescente.  
* Niño/a.  
* Adulto Mayor.  
* Invitado.  
* Empleado del hogar.  
* Empleado Familiar.

### **Tareas / misiones**

* Crear la lista de compras de la semana.  
* Cargar los eventos fijos de la semana.  
* Ordenar tu cuarto.  
* Hacer la tarea.  
* Darle de comer a Moka.  
* Limpieza general.  
* Compras del hogar.

### **Items de compras**

* Leche.  
* Pan.  
* Huevos.  
* Manteca.

### **Mascota**

* Moka.

### **Medicación**

* Losartán.  
* 9:00 AM.

### **Contacto**

* Mariana.  
* `+54 11 5555-0000`.

### **Horarios**

* Mañana (8 AM).  
* Lunes 09:00-13:00.  
* Miércoles 09:00-13:00.  
* Viernes 09:00-13:00.

### **Tipos de hogar**

* Familia con hijos.  
* Familia extendida.  
* Pareja.  
* Convivientes.

### **Copy de Home**

* `Hola, Mariana 👋`  
* `Martes 12 de junio · 08:42`  
* `Bienvenida a Casa de los Robles. Ya tenés todo listo para arrancar. Estas son tus primeras acciones.`  
* `Tu hogar está solo por ahora.`  
* `Todavía no hay miembros para calcular la carga.`  
* `Sin tareas pendientes. ¿Creamos la primera?`  
* `Sin eventos esta semana. ¿Agregamos el primero?`  
* `Hola, Tomás. Tenés 0 tareas pendientes.`  
* `Hola, Jose. Estas son tus misiones de hoy.`  
* `Buen día, Don Carlos. Su medicación de las 9.`

### **Copy de empty states**

* `Todavía no invitaste a nadie.`  
* `Cuando invites miembros, aparecen acá con su rol y foto.`  
* `Mateo — Pendiente ⏳. Cuando acepte, aparece acá.`  
* `El feed está vacío. Cuando haya actividad en el hogar, aparece acá.`  
* `Sin datos de presencia todavía. Cuando los miembros activen su ubicación, vas a ver quién está en casa.`  
* `Acá van a aparecer las tareas del hogar. Compras, trámites, todo lo que necesiten coordinar.`  
* `Calendario libre por ahora. ¿Agregamos algo?`  
* `Sin metas todavía. ¿Te animás a crear la primera?`  
* `Todavía no hay gastos este mes.`  
* `El inventario está vacío. ¿Agregamos el primer producto?`  
* `La nube familiar está vacía. ¿Suben la primera foto o documento?`

### **Información faltante sobre datos demo**

No se encontraron:

* Ejemplos de eventos completos.  
* Ejemplos de calendario poblado.  
* Ejemplos de gastos con monto.  
* Ejemplos de productos de inventario con cantidad.  
* Ejemplos de Feed con actividad real.  
* Ejemplos de Finance cards pobladas.  
* Ejemplos de Goals poblados.  
* Ejemplos de participantes de evento.

---

## **18\. Servicios frontend / APIs / datos**

### **Acciones de datos mencionadas**

* Crear cuenta.  
* Iniciar sesión.  
* Login social Google.  
* Login social Apple.  
* Recuperar contraseña.  
* Crear hogar.  
* Guardar perfil.  
* Configurar tono.  
* Configurar notificaciones.  
* Crear primera lista de compras.  
* Crear primer evento.  
* Enviar invitación.  
* Compartir link.  
* Aceptar invitación.  
* Reenviar invitación pendiente.  
* Crear primera tarea.  
* Agregar primer gasto.  
* Agregar primer ítem.  
* Subir a HomeCloud.  
* Crear meta.

### **Servicios nativos / frontend**

* Share sheet nativo.  
* Cámara / galería mediante bottom sheet.  
* Haptics light para checkbox de Niño.  
* Tema del sistema para modo oscuro.  
* Overlay anti doble-tap.  
* Persistencia local de datos de onboarding incompleto.  
* Retoma de onboarding si cuenta creada y onboarding no terminado.

### **Backend / API**

No se encontraron endpoints concretos.

No se encontró:

* Ruta de register.  
* Ruta de login.  
* Ruta de refresh token.  
* Ruta de logout.  
* Ruta de create household.  
* Ruta de invite member.  
* Ruta de accept invitation.  
* Ruta de create task.  
* Ruta de create event.  
* Request.  
* Response.  
* Errores estructurados.  
* Paginación.  
* Filtros.  
* Supabase auth token.  
* Household activo técnico.  
* Storage.

### **Datos locales**

* Si cuenta creada y onboarding no terminado:  
  * Retoma donde quedó.  
  * Datos preservados localmente.  
* Si registro no completado:  
  * Se descarta y vuelve a Bienvenida.  
* Si timeout \>7 días:  
  * Se reinicia onboarding del hogar, no el registro.

---

## **19\. Realtime / sincronización visible**

No se encontró información específica de realtime o sincronización entre dispositivos.

Información relacionada pero incompleta:

* El toast de primera lista dice:  
  * `Cuando invites a alguien, la pueden completar entre todos.`  
* Personas muestra invitación pendiente:  
  * `Mateo — Pendiente ⏳. Cuando acepte, aparece acá.`  
* Home y People deberían reflejar miembros cuando acepten, pero el documento no define realtime.  
* Home muestra tareas y eventos, pero no define actualización en vivo.

No se encontró:

* Supabase Realtime.  
* Broadcast.  
* Subscriptions.  
* Polling.  
* Optimistic updates.  
* Conflictos.  
* Actualización multi-dispositivo.  
* Eventos de sistema visibles.

---

## **20\. Permisos visibles en UI**

### **Coordinator / Coordinador**

* Puede iniciar flujo de creación de hogar.  
* Puede invitar miembros.  
* Ve Carga Familiar.  
* Ve Home completa.  
* Tiene CTA para crear tarea.  
* Tiene CTA para crear evento.  
* Tiene acceso a People, Planner y More.  
* Settings disponible según empty state.  
* Puede usar Quick Actions.  
* Puede usar Finance/Inventory/HomeCloud como accesos de More según documento.

### **Adult**

* Llega por invitación.  
* Puede unirse al hogar.  
* Puede personalizar perfil.  
* Tiene Bottom Nav completa con permisos de Adulto.  
* No ve Carga Familiar.  
* Ve briefing operativo.  
* No se detallan permisos completos.

### **Adolescent**

* Tiene onboarding de avatar/color/tono/notificaciones.  
* Home enfocada en tareas, eventos y coordinación.  
* Rachas visibles como gamificación ligera.  
* Sin tab Finance visible.  
* No se detallan más permisos.

### **Child**

* Tiene UI simplificada.  
* Ve una card `Mi lista de hoy`.  
* Sin métricas.  
* Sin finanzas.  
* Sin configuración.  
* Sin badges de error o alerta.  
* Bottom Nav completa pero con permisos restringidos.  
* No se detallan acciones exactas permitidas.

### **Senior**

* Permisos equivalentes a Adulto.  
* Modo senior.  
* Sin gestos.  
* Sin pull-to-refresh.  
* Contacto de emergencia prominente.  
* Medicación prominente.  
* Bottom Nav con texto siempre visible.

### **Guest**

* Acceso mínimo.  
* Solo ve contexto autorizado.  
* Sin Finanzas.  
* Sin Inventario.  
* Sin Configuración.  
* Sin Carga Familiar.  
* Tabs visibles según permisos configurados.

### **Empleado Familiar**

* POST\_MVP / DEMO PREMIUM.  
* Ve responsabilidades.  
* Ve horario.  
* Solo ve tareas de sus responsabilidades.  
* Geni limitado.  
* No ve finanzas.  
* No ve documentos.  
* No ve métricas.  
* No ve ubicación de otros salvo configuración explícita.

### **Información faltante**

* No define matriz completa de permisos.  
* No define visibilidad por botón en cada pantalla.  
* No define permisos para editar/eliminar.  
* No define permisos para aprobar/rechazar miembros.  
* No define permisos para crear eventos.  
* No define permisos para crear tareas por rol.  
* No define último coordinador.  
* No define miembro suspendido/finalizado.

---

## **21\. Integraciones visibles entre módulos**

| Relación frontend | Clasificación | Información encontrada |
| ----- | ----- | ----- |
| Home → Planner Tasks | REAL MVP parcial | Home muestra pendientes y CTA crear tarea. |
| Home → Planner Events / Calendar | REAL MVP parcial | Home muestra próximos eventos y CTA agregar primero. |
| Home → People / Invitations | REAL MVP parcial | Atención requerida invita miembros si el hogar está solo. |
| Home → Carga Familiar | MOCK / DEMO PREMIUM | Visible solo Coordinador; sin cálculo real. |
| Home → Geni Briefing | MOCK / DEMO PREMIUM | Briefing diario como card destacada. |
| People → Personas → Invitations | REAL MVP parcial | Empty state permite invitar miembro. |
| People → Presence | DEMO PREMIUM / MOCK | Empty state de presencia. |
| People → Feed | DEMO PREMIUM / MOCK | Empty state de feed. |
| Quick Actions → Crear tarea | REAL MVP parcial | Acción rápida desde botón \+. |
| Quick Actions → Crear evento | REAL MVP parcial | Acción rápida desde botón \+. |
| Quick Actions → Registrar gasto | DEMO PREMIUM | Finance no definido real. |
| More → Finance | DEMO PREMIUM | Empty state y CTA primer gasto. |
| More → Inventory | DEMO PREMIUM | Empty state y CTA primer ítem. |
| More → HomeCloud | DEMO PREMIUM | Empty state y CTA subir. |
| Planner → Tasks | REAL MVP parcial | Empty state y CTA crear primera tarea. |
| Planner → Calendar | REAL MVP parcial | Empty state y CTA crear primer evento. |
| Planner → Goals | DEMO PREMIUM / POST\_MVP | Empty state y CTA crear meta. |
| Adulto Mayor → Inventory | DEMO PREMIUM / POST\_MVP | Medicación registrada en Inventory. |
| Adulto Mayor → Home | DEMO PREMIUM / REAL parcial | Card de medicación y contacto de emergencia. |
| SOS → Global UI | DEMO PREMIUM / POST\_MVP | Acceso por swipe ↑ desde cualquier pantalla. |
| Household → Todos los módulos | REAL MVP conceptual | Home muestra hogar y datos por hogar, pero no define filtro técnico. |

---

## **22\. Edge cases frontend**

### **Encontrados explícitamente**

| Caso | UI / comportamiento |
| ----- | ----- |
| Email ya registrado | Toast: `Ese email ya tiene cuenta. ¿Querés entrar?` y redirige a Login. |
| Contraseña débil | Validación inline: `Mínimo 8 caracteres.` |
| Red caída | Toast: `Sin conexión. Probá de nuevo en un momento.` |
| Token expirado | `El link ya no es válido. Pedí uno nuevo.` |
| Splash tarda \>5s | Mostrar `Cargando...`. |
| Splash falla \>10s | Pantalla de error \+ `Reintentar`. |
| Registro no completado | Se descarta. Vuelve a Bienvenida. |
| Cuenta creada, onboarding no terminado | Retoma donde quedó; datos preservados localmente. |
| Timeout \>7 días | Reinicia onboarding del hogar, no el registro. |
| Invitación pendiente | `Mateo — Pendiente ⏳. Cuando acepte, aparece acá.` |
| Usuario dice “No es mi hogar” | Botón ghost que reporta error. |
| Adulto Mayor en modo oscuro | Fuerza modo claro de alto contraste. |
| Senior | Sin gestos, sin pull-to-refresh. |
| Niño | No ve badges de error o alerta jamás. |
| Foto no cargada | Iniciales o avatar por defecto. |

### **No encontrados**

* Credenciales inválidas.  
* Invitación ya usada.  
* Usuario sin hogar fuera del onboarding.  
* Usuario pendiente de aprobación.  
* Permiso denegado genérico.  
* Último coordinador.  
* Miembro suspendido.  
* Tarea ya completada.  
* Tarea no completada para verificar.  
* Evento cancelado.  
* Conflicto de evento.  
* Responsabilidad sin miembros.  
* Soft delete.  
* Datos personales ocultos en detalle.  
* Error de backend estructurado.

---

## **23\. Copywriting y labels**

### **App / marca**

* `HomePlus`  
* `Todo tu hogar en un solo lugar.`  
* `Bienvenida a HomePlus`  
* `El lugar donde tu hogar se organiza solo.`

### **Botones principales**

* `Crear cuenta`  
* `Ya tengo cuenta`  
* `Continuar`  
* `Entrar a HomePlus`  
* `Entrar a mi hogar`  
* `Enviar invitación`  
* `Compartir link`  
* `Después lo hago`  
* `Nada, después`  
* `Guardar`  
* `Unirme al hogar`  
* `No es mi hogar`  
* `Aceptar invitación`  
* `Aceptar y comenzar`  
* `Entrar`  
* `Reintentar`

### **Auth / Register**

* `Creá tu cuenta`  
* `Email`  
* `Contraseña`  
* `Mínimo 8 caracteres`  
* `Continuar con Google`  
* `Continuar con Apple`  
* `Al crear tu cuenta aceptás los Términos y la Política de Privacidad.`  
* `¿Cómo te llamás?`  
* `Así te va a llamar Geni.`

### **Errores**

* `Ese email no es válido. ¿Lo revisás?`  
* `Mínimo 8 caracteres.`  
* `Sin conexión. Probá de nuevo en un momento.`  
* `Ese email ya tiene cuenta. ¿Querés entrar?`  
* `No se pudo crear la cuenta. ¿Probás de nuevo?`  
* `El link ya no es válido. Pedí uno nuevo.`  
* `Algo no salió bien. ¿Probamos de nuevo?`

### **Roles**

* `Coordinador/a`  
* `Organizás la casa`  
* `Adulto`  
* `Formás parte del hogar`  
* `Adolescente`  
* `Entre 13 y 17 años`  
* `Niño/a`  
* `Entre 6 y 12 años`  
* `Adulto Mayor`  
* `+60 años`

### **Household**

* `¿Cómo es tu hogar?`  
* `Esto nos ayuda a sugerirte lo que te sirve.`  
* `Familia con hijos`  
* `Familia extendida`  
* `Pareja`  
* `Convivientes`  
* `¿Cómo le dicen a tu casa?`  
* `Nombre del hogar`  
* `Casa de los Robles`  
* `También podés hacerlo después`  
* `¿Cuánto tiempo tenés para las cosas de tu casa?`  
* `Así Geni te sugiere tareas cuando realmente podés.`  
* `1 a 2 horas por día`  
* `3 a 4 horas por día`  
* `5 horas o más`  
* `¿A qué hora preferís que te avise?`

### **Perfil / tono**

* `Ponete cara`  
* `Nombre completo`  
* `¿Cómo querés que te hable Geni?`  
* `Mariana (tuteo)`  
* `Sra. García (usted)`  
* `¿Cuánto te avisamos?`  
* `Media`  
* `Lo importante del día`  
* `Alta`  
* `Cada novedad`  
* `Baja`  
* `Solo lo urgente`

### **Primer valor**

* `Tu hogar está listo`  
* `Mariana, vi que armaste tu hogar. ¿Arrancamos con algo concreto?`  
* `Sugerencia para hoy:`  
* `Crear la lista de compras de la semana`  
* `Tiempo estimado: 2 min`  
* `Cargar los eventos fijos de la semana`  
* `Lista de compras`  
* `Tu primera lista. Cuando invites a alguien, la pueden completar entre todos.`

### **Invitaciones**

* `¿A quién invitás primero?`  
* `HomePlus funciona mejor con todos. Pero sin apuro.`  
* `Nombre del miembro`  
* `Email o teléfono`  
* `Mariana te invitó a Casa de los Robles en HomePlus`  
* `Link copiado. Vence en 7 días.`  
* `¡Te invitaron!`  
* `Mariana te sumó a Casa de los Robles.`

### **Home**

* `Hola, Mariana 👋`  
* `Briefing diario`  
* `Atención requerida`  
* `Tu hogar está solo por ahora.`  
* `Invitar miembros →`  
* `Carga Familiar`  
* `Todavía no hay miembros para calcular la carga.`  
* `Mis pendientes (0)`  
* `Sin tareas pendientes.`  
* `¿Creamos la primera?`  
* `Sin eventos esta semana`  
* `¿Agregamos el primero?`

### **Empty states**

* `Todavía no invitaste a nadie.`  
* `Cuando invites miembros, aparecen acá con su rol y foto.`  
* `Todavía no hay tareas en el hogar.`  
* `Acá van a aparecer las compras, los trámites y todo lo que necesiten coordinar.`  
* `Todavía no hay gastos este mes.`  
* `Todavía no hay productos en el inventario.`  
* `Sin datos de presencia todavía.`  
* `Calendario libre por ahora. ¿Agregamos algo?`  
* `Sin metas todavía. ¿Te animás a crear la primera?`

---

## **24\. Restricciones técnicas frontend**

### **Stack**

* React Native / Expo.  
* Mobile-first.  
* Base de diseño: 375×812px.  
* Modos:  
  * `normal`.  
  * `senior`.

### **Theming**

* Respeta tema del sistema.  
* Si el teléfono está en modo oscuro, se aplica paleta oscura del Design System V2.  
* Excepción:  
  * Adulto Mayor fuerza modo claro con alto contraste.

### **Offline**

* Pantallas solo UI funcionan offline:  
  * Bienvenida.  
  * Selección Rol.  
  * Tipo Hogar.  
  * Disponibilidad.  
* Pantallas con backend deben mostrar toast y preservar datos:  
  * Registro.  
  * Login.  
  * Invitación.  
* Splash carga offline.

### **Persistencia local**

* Si cuenta creada y onboarding no terminado:  
  * Retoma donde quedó.  
  * Datos preservados localmente.  
* Si registro no completado:  
  * Se descarta.  
* Si timeout \>7 días:  
  * Reinicia onboarding del hogar.

### **Limitaciones detectadas**

* No hay endpoints.  
* No hay contratos de services.  
* No hay estado global definido.  
* No hay librerías adicionales definidas.  
* No hay implementación real de push.  
* No hay implementación real de storage.  
* No hay realtime.  
* No hay navegación técnica por stack.  
* No hay estructura de rutas.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo frontend | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Principio 60s vs tiempos acumulados | El documento dice primer valor ≤60s, pero algunas pantallas del Coordinador acumulan \~110s antes de `Entrar a mi hogar`; hay tensión entre timing ideal y pantallas reales. | Priorizar flujo corto para demo; mover configuración no crítica después del primer valor. |
| Crear hogar durante registro | El documento visual integra crear hogar dentro del onboarding post-registro, no necesariamente en la misma operación de registro. | En merge, alinear con backend real y navegación `/me`. |
| Geni real vs mock | Geni aparece en tono, briefing y sugerencias, pero no se define IA real. | Implementar como DEMO PREMIUM / MOCK salvo que otra fuente defina IA real. |
| Lista de compras | Se presenta como primera acción, pero no queda claro si pertenece a Tasks, Inventory o entidad específica. | En merge, decidir si se modela como Task, template de compras o demo local. |
| Calendar/Event | Se menciona crear evento, pero sin campos. | Usar otra fuente para Events/Calendar reales. |
| Tasks | Se menciona crear/completar tarea, pero no CRUD ni estados. | Usar este documento solo para UX inicial, empty states y visuales. |
| Verification Flow | No aparece. | No extraer desde este documento. |
| Roles | Invitado y Empleado Familiar aparecen, pero Empleado Familiar puede estar fuera del MVP. | Clasificar Empleado Familiar como POST\_MVP salvo decisión final. |
| Bottom Nav completa por rol | Se dice congelada para todos, pero también que algunos tabs son visibles según permisos. | En merge, separar estructura visual fija vs contenido restringido. |
| Adolescente sin Finance | Dice sin tab Finance visible, aunque Bottom Nav sigue con More. | En merge, definir si Finance se oculta dentro de More o se oculta acceso completo. |
| Multi-hogar | Header menciona selector visible si 2+ hogares, pero no se define flujo multi-hogar. | Para MVP usar solo visual condicional o postergar multi-hogar avanzado. |
| Adulto Mayor medicación | Medicación se registra en Inventory, pero Inventory real no está definido. | Para MVP usar card mock o dato local si no hay Inventory backend. |
| SOS | Acceso global por swipe ↑, pero no se desarrolla pantalla ni lógica. | Tratar como DEMO PREMIUM/POST\_MVP visual si se necesita apariencia avanzada. |
| Offline | Se define comportamiento UX, pero no arquitectura. | No implementar offline real salvo persistencia local básica. |
| Settings nunca vacío | Se afirma pero no se define contenido. | Crear More/Settings visual con opciones mínimas desde otra fuente o mock. |

---

## **26\. Información faltante**

### **Auth**

* Endpoint register.  
* Endpoint login.  
* Refresh token.  
* Logout.  
* Manejo de sesión.  
* Persistencia de sesión.  
* Errores de credenciales inválidas.  
* Contratos request / response.  
* Integración real con Supabase.

### **Onboarding**

* Estado técnico de onboarding.  
* Guardado parcial.  
* Modelo de preferencias.  
* Relación exacta con `/me` o navegación backend.  
* Pantalla post-error.  
* Progreso persistente.

### **Household**

* Entidad técnica household.  
* Campos reales.  
* Slug.  
* Timezone.  
* Configuración básica posterior.  
* Selector activo.  
* API create household.  
* Validaciones backend.  
* Manejo de household ya existente.

### **Invitations / Members**

* Endpoint crear invitación.  
* Endpoint aceptar invitación.  
* Endpoint reenviar invitación.  
* Aprobar/rechazar miembro.  
* Estado pending approval completo.  
* Estados accepted/rejected.  
* Invitación expirada.  
* Invitación ya usada.  
* Permisos para invitar por rol.  
* Pantalla de solicitudes pendientes.

### **Roles & Permissions**

* Matriz completa de permisos.  
* Botones por rol.  
* Tabs ocultas/deshabilitadas por rol.  
* Permisos de Planner.  
* Permisos de Events.  
* Permisos de Settings.  
* Permisos de More.

### **Home**

* Layout con datos reales poblados.  
* Skeleton de Home.  
* Refresh.  
* Error por widget.  
* Realtime.  
* Cards avanzadas pobladas.  
* Actividad familiar real.  
* Carga Familiar real.  
* Presence real.  
* Integración real con tareas/eventos/miembros.

### **Planner / Tasks**

* Crear tarea completo.  
* Editar tarea.  
* Eliminar tarea.  
* Completar tarea fuera de onboarding Niño.  
* Verification Flow.  
* Prioridad.  
* Fecha límite.  
* Responsable.  
* Lista poblada.  
* Filtros.  
* Estados.  
* Templates.  
* Servicios/API.  
* Permisos.

### **Events / Calendar**

* Campos de evento.  
* Crear/editar/eliminar.  
* Listado.  
* Vista día.  
* Vista semana.  
* Vista mes.  
* Tareas con fecha en calendario.  
* Recurrencia simple.  
* Permisos.  
* Servicios/API.

### **More / Settings**

* Pantalla More detallada.  
* Settings detallado.  
* Profile posterior.  
* Logout.  
* Privacidad.  
* Ayuda.  
* Auditoría.  
* Opciones reales vs mock.

### **Quick Actions**

* Panel detallado.  
* Animaciones.  
* Orden.  
* Permisos.  
* Estado abierto/cerrado.  
* Acciones por rol.  
* Formularios rápidos completos.

### **Demo premium**

* Datos mock poblados para Finance.  
* Datos mock poblados para Inventory.  
* Datos mock poblados para HomeCloud.  
* Datos mock poblados para Presence.  
* Datos mock poblados para Feed.  
* Datos mock poblados para Goals.  
* Diseño de cards pobladas.  
* Navegación interna de módulos demo.

### **Servicios**

* Estructura de services frontend.  
* Auth token.  
* Household activo.  
* Mock services.  
* Realtime.  
* Storage.  
* Push notifications.  
* Error mapping.  
* Loading patterns por endpoint.

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Nivel | Motivo |
| ----- | ----- | ----- | ----- |
| `auth_onboarding_frontend_fragment` | Sí | Completo | El documento describe con detalle registro, login social, recuperación, selección de rol y onboarding por rol. |
| `visual_system_fragment` | Sí | Medio | Hay tipografía, colores, tamaños, cards, inputs, avatares, estados y modo senior. No está el Design System completo. |
| `navigation_fragment` | Sí | Medio/Alto | Define flujo principal, Bottom Nav congelada y navegación post-onboarding. Falta stack técnico. |
| `household_invites_frontend_fragment` | Sí | Medio | Define crear hogar, invitar, compartir link y aceptar invitación. Faltan approvals y APIs. |
| `people_members_frontend_fragment` | Parcial | Medio | Define People Personas empty state, invitación pendiente y resumen de miembros en invitación. |
| `home_frontend_fragment` | Sí | Medio | Define Home post-onboarding, cards iniciales, rol de Home y Home por rol. Falta Home poblado real. |
| `planner_frontend_fragment` | Parcial | Bajo/Medio | Aporta empty states, primer valor, crear primera tarea/evento y checkbox Niño. No alcanza para CRUD. |
| `quick_actions_frontend_fragment` | Parcial | Bajo/Medio | Define botón \+ y algunas acciones, pero no panel completo. |
| `more_settings_frontend_fragment` | Parcial | Bajo/Medio | Define More con Finance, Inventory, HomeCloud y Settings; Settings no está detallado. |
| `finance_demo_fragment` | Parcial | Bajo | Solo empty state y CTA primer gasto. |
| `inventory_demo_fragment` | Parcial | Medio | Empty state \+ medicación senior. No define inventario real. |
| `assets_demo_fragment` | No | Vacío | No hay información visual específica en documento principal. |
| `familycloud_demo_fragment` | Parcial | Bajo | Solo HomeCloud empty state. |
| `presence_demo_fragment` | Parcial | Bajo | Solo empty state. |
| `geni_demo_fragment` | Sí | Medio | Geni aparece en briefing, tono, sugerencias y primer valor. IA real no definida. |
| `mock_data_fragment` | Sí | Medio | Hay nombres, hogar, tareas demo, items de compra, horarios, medicamentos y copy. |
| `ux_states_fragment` | Sí | Alto | Define estados de auth, loading, offline, empty, success, error, retoma. |
| `frontend_services_fragment` | Parcial | Bajo | Hay acciones y servicios nativos, pero no endpoints ni contratos. |

---

## **28\. Conclusión operativa**

Este documento debe usarse como una de las fuentes principales para el frontend premium de:

* Auth visual.  
* Onboarding completo.  
* Creación de hogar inicial.  
* Invitaciones iniciales.  
* Home post-onboarding.  
* Empty states.  
* Experiencia por rol.  
* Modo senior.  
* Copywriting inicial.  
* Navegación base.  
* Patrones UI reutilizables.

También aporta información parcial para:

* People / Members.  
* Planner Tasks.  
* Planner Calendar.  
* Quick Actions.  
* More.  
* Finance demo.  
* Inventory demo.  
* HomeCloud demo.  
* Presence demo.  
* Geni demo.

No debe usarse como fuente única para implementar:

* Planner real completo.  
* Tasks CRUD completo.  
* Events CRUD completo.  
* Calendar día/semana/mes.  
* Verification Flow.  
* Realtime.  
* Backend APIs.  
* Permisos finos.  
* Settings completo.  
* Módulos secundarios reales.

Clasificación final:

* Valor frontend global: Alto.  
* Valor para Auth/Onboarding: Muy alto.  
* Valor para Household/Invitations: Medio.  
* Valor para Home: Medio/alto.  
* Valor para Planner: Bajo/medio.  
* Valor para módulos demo premium: Medio.  
* Valor para servicios/API: Bajo.

---

# **SOURCE 13 — DISEÑO DE PANTALLAS HOME**

## **Archivo recomendado**

`Diseño de pantallas home v1.txt`

## **Tipo de documento**

Diseño de Home

## **Uso para frontend**

Extraer:

* Home por rol;  
* Home coordinador;  
* Home adulto;  
* Home adolescente;  
* Home adulto mayor;  
* cards;  
* widgets;  
* quick actions;  
* resumen del día;  
* módulos mock;  
* módulos reales;  
* jerarquía visual;  
* Home como centro emocional.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_Diseno\_de\_Pantallas\_de\_Home\_V1**

## **1\. Fuente**

* Documento: `HomePlus — Diseño de Pantallas de Home V1.md`  
* Archivo de comprensión asociado: `Diseño de pantallas home v1.txt`  
* Tipo de documento: diseño de pantallas / UX visual de Home.  
* Producto: HomePlus — Sistema Operativo del Hogar.  
* Versión: 1.0.  
* Fecha: Junio 2026\.  
* Alcance declarado: mobile-first, 375×812px.  
* Roles contemplados:  
  * Coordinador.  
  * Adulto.  
  * Adolescente.  
  * Niño.  
  * Adulto Mayor.  
  * Invitado.  
  * Empleado Familiar.  
* Dependencias mencionadas por el documento:  
  * Final Spec V1.  
  * UX Philosophy V2.0.  
  * Design System V1 pendiente.  
  * UX Writing Guide V1 pendiente.  
* Nivel de utilidad frontend: **Alto para Home, navegación, patrones UI globales y demo premium. Medio para Planner. Bajo para Auth/Household/API.**

---

## **2\. Utilidad frontend del documento**

Este documento aporta principalmente:

* Arquitectura visual de Home.  
* Bottom Nav canónica.  
* Jerarquía mobile-first.  
* Adaptación por rol.  
* Patrones de cards, widgets, listas, chips, badges, progress bars, toasts, skeletons, banners, bottom sheets y modals.  
* Estados de Home:  
  * normal;  
  * alertas;  
  * emergencia;  
  * todo al día;  
  * sin conexión;  
  * primer uso post-onboarding.  
* Conexiones visibles entre Home y Planner:  
  * tareas pendientes;  
  * tareas vencidas;  
  * próximos eventos;  
  * navegación a Planner \> Calendar.  
* Patrones para demo premium:  
  * Briefing.  
  * Carga Familiar.  
  * Presence resumido.  
  * Actividad Familiar.  
  * Finanzas relevantes.  
  * Medicación para Adulto Mayor.  
  * SOS visual.  
* Reglas de permisos visibles por rol, especialmente para Adulto, Coordinador, Invitado y Adulto Mayor.  
* Información de diseño reutilizable globalmente para que la app se vea premium y coherente.

No aporta contratos API completos, endpoints ni estructura backend concreta.

---

## **3\. Información de producto aplicable al frontend**

### **Principio rector**

* Home es el centro operativo del hogar.  
* Home resume información, no administra información.  
* Home debe responder:  
  * ¿cómo está el hogar?  
  * ¿qué requiere atención?  
  * ¿qué debo hacer yo?  
  * ¿hay riesgo?  
* Toda información mostrada en Home conduce al módulo que la administra.

### **Principios aplicables al frontend global**

* Mobile-first absoluto.  
* Pantalla primaria: 375×812px.  
* Home debe caber en una pantalla cuando sea posible.  
* Scroll solo si es inevitable.  
* Capa de atención siempre visible sin scroll.  
* Acción principal accesible con el pulgar.  
* La frecuencia de uso define visibilidad.  
* Los dominios de uso diario viven en Bottom Nav.  
* Los dominios ocasionales viven en More.  
* La adaptación por rol cambia contenido, no estructura de navegación.  
* La información se agrupa por relevancia, no solo cronología.  
* La gravedad determina prominencia visual.  
* La app debe reducir carga mental.  
* La app debe evitar presión social.  
* La app debe evitar ruido:  
  * sin sonidos propios;  
  * solo notificaciones del sistema operativo.  
* La navegación debe sentirse segura:  
  * badges en nav solo success/alert;  
  * nunca error rojo en navegación.  
* La eliminación requiere confirmación.  
* Completar una tarea debe permitir deshacer.  
* Empty states reemplazan tutoriales.  
* Bottom sheets para crear/editar cuando se busca mantener contexto.  
* El hogar es el centro de separación contextual.  
* Multi-hogar existe como concepto, pero el selector solo aparece si el usuario pertenece a dos o más hogares.  
* Toda entidad relacionada debe exponer enlaces navegables a la entidad relacionada.  
* Enlaces cruzados entre dominios no deben crear ciclos infinitos.

### **Clasificación**

* REAL MVP:  
  * Home como entrada principal.  
  * Bottom Nav.  
  * Planner como tab.  
  * Tareas pendientes reales en Home si existe backend real.  
  * Próximos eventos reales en Home si existe backend real.  
  * Miembros/rol para adaptar Home.  
* DEMO PREMIUM:  
  * Briefing visual.  
  * Carga Familiar visual.  
  * Presence resumido visual.  
  * Actividad Familiar visual.  
  * Finanzas relevantes visuales.  
  * Medicación en Adulto Mayor si no hay Inventory real.  
  * SOS visual si no se implementa emergencia real.  
* MOCK:  
  * Copy de briefing.  
  * Métricas de carga.  
  * Presence dummy.  
  * Actividad familiar dummy.  
  * Finanzas dummy.  
* POST\_MVP:  
  * IA real.  
  * GPS real.  
  * geofencing.  
  * automatizaciones reales.  
  * offline sync completo.  
  * FamilyCloud real.  
  * auditoría completa.  
  * SearchGlobal real.

---

## **4\. Navegación y arquitectura de pantallas**

### **Bottom Navigation canónica**

Estructura congelada V1:

`[Home] [People] [+] [Planner] [More]`

| Tab | Destino | Contenido principal | Visible para | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Home | Home | Briefing, Atención Requerida, widgets | Todos | REAL MVP |
| People | People | Feed, Presence, Personas | Todos | DEMO PREMIUM / parcial |
| `+` | Quick Actions | Panel flotante: Geni fijo \+ acciones dinámicas | Todos | DEMO PREMIUM |
| Planner | Planner | Tasks, Calendar, Goals | Todos | REAL MVP para Tasks/Calendar; Goals POST\_MVP/DEMO |
| More | More | Finance, Inventory, HomeCloud, Settings | Todos | DEMO PREMIUM / parcial |

### **Reglas de navegación**

* Bottom Nav congelada en V1.  
* No se modifica sin enmienda a la especificación canónica.  
* La adaptación por rol cambia el contenido accesible, no la estructura de navegación.  
* Quick Actions abre panel flotante con blur del fondo.  
* Geni es el único elemento fijo en Quick Actions.  
* SOS no está en Bottom Nav.  
* SOS no está en Quick Actions.  
* SOS se accede vía swipe global hacia arriba.  
* People agrupa:  
  * Feed;  
  * Presence;  
  * Personas.  
* Planner agrupa:  
  * Tasks;  
  * Calendar;  
  * Goals.  
* More contiene:  
  * Finance;  
  * Inventory;  
  * HomeCloud;  
  * Settings.  
* Tap en tab activo:  
  * scroll to top;  
  * refresh de pantalla actual.  
* Navegación contextual con enlaces cruzados entre dominios.  
* Si se enlaza a una instancia existente en el stack, se reutiliza.

### **Arquitectura visual del Home**

El Home usa cuatro capas fijas:

1. Capa 1: Atención.  
   * Briefing.  
   * Alerta.  
   * Reconocimiento.  
   * Máximo 2 elementos.  
   * Lectura menor a 3 segundos.  
   * Siempre visible sin scroll.  
2. Capa 2: Acción.  
   * Acción principal.  
   * Acciones rápidas.  
   * Máximo 3 acciones visibles.  
   * La acción principal debe estar en zona de pulgar.  
3. Capa 3: Contexto.  
   * Listas.  
   * Métricas.  
   * Estado.  
   * Scroll vertical si excede pantalla.  
   * Agrupado por relevancia.  
4. Capa 4: Exploración.  
   * Bottom Nav.  
   * Enlaces cruzados.  
   * Nunca compite con Capa 1 o 2\.

### **Orden canónico de bloques en Home**

1. Briefing Geni.  
2. Atención Requerida.  
3. Carga Familiar.  
4. Próximos Eventos.  
5. Tareas.  
6. Finanzas Relevantes.  
7. Presence Resumido.  
8. Actividad Familiar.

Regla: los bloques que un rol no ve se omiten, pero el orden relativo de los bloques visibles se preserva.

---

## **5\. Pantallas detectadas**

| Pantalla | Objetivo | Qué muestra | Acciones | Estados | Navegación | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| HomeScreen | Centro operativo del hogar | Briefing, atención, tareas, eventos, carga, presence, actividad | Completar tarea, abrir detalle, navegar a módulos | Normal, alertas, SOS, todo al día, sin conexión, primer uso | Bottom Nav | REAL MVP \+ DEMO PREMIUM |
| Home Coordinador | Visión completa del hogar | Briefing, atención, carga familiar, eventos, tareas, finanzas, presence, actividad | Revisar distribución, completar tareas, abrir eventos | Normal, alertas, SOS, todo al día, sin conexión, primer uso | Home → Planner/More/People | MIXTO |
| Home Adulto | Visión operativa propia \+ contexto familiar | Tareas propias, eventos propios/participados, carga propia, presence relevante | Completar tareas, abrir eventos | Normal, alertas propias, SOS, todo al día, sin conexión, primer uso | Home → Planner | MIXTO |
| Home Adolescente | Autonomía progresiva | Tareas gamificadas, contexto reducido | Completar tareas | No completamente extraído en los snippets disponibles | Bottom Nav | DEMO PREMIUM / parcial |
| Home Niño | Experiencia simplificada/gamificada | Logros visuales, tareas simples | Completar tarea | No completamente extraído en los snippets disponibles | Bottom Nav | DEMO PREMIUM / parcial |
| Home Adulto Mayor | Coordinación simple, eventos, contactos, medicación | Saludo senior, eventos, contactos, medicación, botón emergencia | Llamar, cómo llegar, ya la tomé, emergencia | Senior, accesibilidad, botones grandes | Bottom Nav | DEMO PREMIUM / parcial |
| Home Invitado | Vista mínima asignada | Briefing mínimo, tareas asignadas, eventos relacionados, contacto si configurado | Completar tarea | Normal, sin tareas, sin eventos | Bottom Nav | REAL parcial / DEMO |
| Quick Actions | Acciones rápidas globales | Geni fijo \+ acciones dinámicas | Abrir acción contextual | No detallado | Botón `+` | DEMO PREMIUM |
| Planner | Administrar Tasks, Calendar, Goals | Mencionado como tab, sin pantalla detallada | No especificado | No especificado | Bottom Nav | REAL MVP parcial |
| People | Feed, Presence, Personas | Mencionado como tab | No especificado | No especificado | Bottom Nav | DEMO PREMIUM |
| More | Herramientas especializadas | Finance, Inventory, HomeCloud, Settings | Abrir herramientas | No especificado | Bottom Nav | DEMO PREMIUM |
| Settings | Configuración | Hogar, cuenta, sistema, auditoría | No especificado | No especificado | More | DEMO PREMIUM / POST\_MVP |
| SelectorHogar | Cambiar hogar activo | Dropdown en header si usuario pertenece a ≥2 hogares | Cambiar hogar | Visible solo con ≥2 hogares | Header | POST\_MVP / parcial |
| BottomSheet de Briefing | Ver briefing ampliado | Versión ampliada del briefing | Abrir/cerrar | 50% altura | Tap en Briefing | DEMO PREMIUM |
| BottomSheet de Carga | Ver detalle de carga | Detalle por categoría | Abrir/cerrar | 50% altura | Tap en Carga Familiar | DEMO PREMIUM |
| Modal de confirmación | Confirmar acciones graves | Confirmación centrada | Confirmar/cancelar | Fade \+ scale | Acción destructiva | REAL/DEMO según módulo |

---

## **6\. Componentes y patrones UI reutilizables**

| Componente / patrón | Descripción | Uso detectado | Clasificación |
| ----- | ----- | ----- | ----- |
| Card Destacada | Borde izquierdo `prim-500`, 4px | Briefing | DEMO PREMIUM |
| Card Alerta | `bg alert-100`, borde `alert-500` | Atención Requerida, Finanzas, Medicación | DEMO PREMIUM |
| Card Estándar | Card base | Carga, Presence, Actividad, eventos, tareas | REAL/DEMO |
| SOS Banner | Full-width, `bg error-100`, borde `error-500` | Emergencia activa | DEMO PREMIUM / POST\_MVP si real |
| ListItem \+ Checkbox | Lista accionable | Tareas | REAL MVP |
| ListItem \+ Chip | Lista con fecha relativa | Eventos | REAL MVP |
| Chip | HOY, MAÑ, LUN; filtros; fechas relativas | Eventos, filtros | REAL/DEMO |
| Badge | success/alert, nunca error en nav | Presence, nav | DEMO PREMIUM |
| Avatar sm | 32px | Presence | DEMO PREMIUM |
| Avatar md | 56px | Contactos Adulto Mayor | DEMO PREMIUM |
| ProgressBar | `prim-500`, `alert-500`, `acent-500` | Carga, XP | MOCK/DEMO |
| Button primary lg | 64px senior | Medicación / Adulto Mayor | DEMO PREMIUM |
| Button secondary lg | Cómo llegar | Adulto Mayor | DEMO PREMIUM |
| Button ghost lg | Llamar contacto | Adulto Mayor | DEMO PREMIUM |
| Button danger lg | Emergencia | Adulto Mayor / SOS | DEMO PREMIUM |
| BottomSheet | Crear/editar, detalle, briefing ampliado | Briefing, Carga, patrón global | DEMO/POST\_MVP según uso |
| Modal | Solo confirmaciones | Eliminación o acciones graves | REAL/DEMO |
| Skeleton | Carga de listas \>300ms | Listas | REAL/DEMO |
| Spinner | Botones tras 400ms | Operaciones | REAL/DEMO |
| Toast | Feedback superior | Completar tarea, deshacer | REAL MVP |
| Banner | Sin conexión, SOS | Estados globales | DEMO/POST\_MVP |
| EmptyState | Guía sin tutorial | Sin tareas, sin eventos, primer uso | REAL/DEMO |
| Checkbox táctil | Target 44–56px, háptico ligero | Completar tareas | REAL MVP |
| Typography Display | Fraunces 700, 32px | Saludo Home | DEMO PREMIUM |
| H1 senior | 36px | Adulto Mayor | DEMO PREMIUM |
| H2 | Fraunces 600, 24px | Invitado | DEMO PREMIUM |
| Activity item compacto | Ícono contextual \+ texto | Actividad Familiar | MOCK |
| Role-specific layout | Misma navegación, distinto contenido | Homes por rol | REAL/DEMO |

---

## **7\. Visual design aplicable**

### **Layout**

* Mobile-first: 375×812px.  
* Home intenta caber en una pantalla.  
* Scroll solo si:  
  * más de 4 tareas;  
  * más de 3 eventos;  
  * contenido excede pantalla.  
* Capa 1 nunca requiere scroll.  
* Acción principal en zona inferior / zona de pulgar.  
* Capa 4 fija con Bottom Nav.

### **Tipografía**

* Saludo principal:  
  * Display;  
  * Fraunces 700;  
  * 32px.  
* Invitado:  
  * H2;  
  * Fraunces 600;  
  * 24px.  
* Adulto Mayor:  
  * H1 senior;  
  * 36px.  
* Body S para subtítulos y metadata secundaria.  
* Text secondary para bajadas.  
* Text tertiary para datos cacheados o metadata débil.

### **Colores y estados**

* `prim-500`:  
  * borde de Card Destacada.  
  * progress bar normal.  
* `alert-500`:  
  * borde de alerta.  
  * progress \>60%.  
  * estados fuera/atención.  
* `alert-100`:  
  * background de alerta.  
* `error-100`:  
  * background de SOS activo.  
* `error-500`:  
  * borde de SOS o botón emergencia.  
* `success-500`:  
  * estado en casa.  
* `info-100` / `info-600`:  
  * banner sin conexión.  
* `acent-500`:  
  * XP/adolescente.  
* Nav badges:  
  * success o alert.  
  * nunca error.

### **Iconografía / emojis**

* Home: 🏠  
* People: 👥  
* Quick Actions: ➕  
* Planner: 📋  
* More: ⋯  
* Geni: 💬  
* Atención: ⚠️  
* Evento: 📅  
* Presencia:  
  * 🟢 En casa.  
  * 🟡 Fuera.  
  * ○ Sin datos.  
* Actividad:  
  * 💜 reconocimiento.  
  * 📸 foto.  
  * 🎯 meta.  
  * 🏠 evento completado.  
* Emergencia: 🆘 / 🚨.  
* Contacto: 📞.  
* Ubicación / cómo llegar: 🚗.  
* Medicación: 🏥 o card de medicación según rol.

### **Densidad por rol**

* Coordinador:  
  * 5–6 items en lista.  
  * 3–4 cards en Home.  
  * métricas visibles.  
* Adulto:  
  * 4–5 items en lista.  
  * 2–3 cards en Home.  
  * métricas propias.  
* Adolescente:  
  * 3–4 items en lista.  
  * 2 cards.  
  * baja exposición al contexto global.  
* Invitado:  
  * vista mínima.  
  * sin métricas.  
* Adulto Mayor:  
  * botones grandes.  
  * direcciones completas.  
  * contactos visibles.  
  * foco en personas/eventos/recordatorios.

### **Sensación premium**

* Jerarquía clara.  
* Cards diferenciadas por gravedad.  
* Microinteracciones:  
  * háptico ligero.  
  * fade-in.  
  * fade-out.  
  * scale \+ fade en modal.  
  * slide-down en banner.  
* Uso de bottom sheets para no perder contexto.  
* No saturar la pantalla.  
* Los bloques condicionales desaparecen cuando no aplican.

---

## **8\. Home**

### **Rol de Home**

* Home es centro operativo.  
* Home resume, no administra.  
* Home conduce al módulo que administra cada información.  
* Punto de entrada principal.  
* Adaptado por rol.

### **Bloques del Home**

1. Briefing Geni.  
2. Atención Requerida.  
3. Carga Familiar.  
4. Próximos Eventos.  
5. Tareas.  
6. Finanzas Relevantes.  
7. Presence Resumido.  
8. Actividad Familiar.

### **Briefing**

* Widget principal de Capa 1\.  
* Único widget de Briefing.  
* Versión resumida permanente.  
* Versión ampliada al tap.  
* Bottom sheet 50% para ampliación.  
* Copy máximo:  
  * 3 líneas;  
  * legible en menos de 3 segundos.  
* DEMO PREMIUM / MOCK si no hay IA real.

Ejemplos:

* “Hoy: 4 tareas, 2 eventos y 1 documento por vencer. La carga está 60/40. ¿Arrancamos por las tareas?”  
* “Hoy: 4 tareas, 2 eventos. La carga está 60/40. ¿Arrancamos por las tareas?”  
* “Todo al día por acá. Nada pendiente.”  
* “Hoy viene cargado: 6 tareas, 3 eventos y 1 vencimiento. ¿Revisamos prioridades?”  
* “La carga está 70/30 esta semana. ¿Querés revisar la distribución?”  
* “El presupuesto está al 92%. Quedan 10 días. ¿Ajustamos algo?”  
* “Sin conexión. Última información: hace 45 min.”  
* “Bienvenida a tu hogar. Estas son tus primeras acciones.”  
* “Rosa, hoy tiene 1 tarea asignada.”

### **Atención Requerida**

* Widget condicional.  
* Solo visible si hay al menos un item.  
* Centraliza:  
  * SOS activo.  
  * tareas vencidas.  
  * pagos vencidos.  
  * documentos por vencer.  
  * aprobaciones pendientes.  
  * vencimientos.  
* Máximo 3 items visibles.  
* Si hay más:  
  * “Ver 2 más →”  
* Orden interno:  
  * SOS primero;  
  * luego proximidad de vencimiento.  
* Card Alerta:  
  * `bg alert-100`;  
  * borde `alert-500`.

### **Carga Familiar**

* Widget con progress bars por miembro.  
* Visible solo para Coordinador con porcentajes.  
* Título:  
  * “Carga de esta semana”.  
* Color:  
  * `prim-500` normal.  
  * `alert-500` si \>60%.  
* Al tap:  
  * detalle de carga por categoría en bottom sheet 50%.  
* MOCK / DEMO PREMIUM para MVP si no existe cálculo real.

### **Próximos Eventos**

* Lista con chips de fecha.  
* Eventos más cercanos temporalmente.  
* Máximo:  
  * 3 eventos para Coordinador.  
  * 2 eventos para Adulto.  
* Cada item:  
  * chip relativo: HOY, MAÑ, LUN;  
  * título;  
  * ubicación si existe;  
  * chevron.  
* Orden:  
  * cercanía temporal.  
* Al tap:  
  * detalle del evento en Planner \> Calendar.  
* REAL MVP si eventos existen con backend real.

### **Tareas**

* Lista con checkbox.  
* Agrupadas por Responsabilidad.  
* Máximo 4 tareas visibles.  
* Si hay más:  
  * “Ver todas (8) →”  
* Cada item:  
  * checkbox;  
  * título;  
  * metadata:  
    * vencimiento;  
    * monto si aplica;  
    * responsable si aplica.  
* Tap en checkbox:  
  * completa la tarea.  
  * háptico ligero.  
  * animación.  
  * toast “Deshacer” 5s.  
* Tareas completadas:  
  * al final;  
  * tachado sutil;  
  * opacidad reducida.  
* Dinamismo:  
  * cuando las tareas se completan, los widgets desaparecen y el Home se reorganiza automáticamente.  
* REAL MVP.

### **Finanzas Relevantes**

* Condicional.  
* Solo visible si hay alertas financieras.  
* Disparadores:  
  * presupuesto ≥80%;  
  * gasto grande reciente;  
  * deuda vencida;  
  * pago próximo a vencer.  
* Card Alerta compacta.  
* Al tap:  
  * navega a Finance en More.  
* DEMO PREMIUM / MOCK.

### **Presence Resumido**

* Card con avatares sm \+ estado.  
* Máximo 4 miembros visibles.  
* Indicadores:  
  * 🟢 En casa.  
  * 🟡 Fuera, ubicación conocida.  
  * ○ Sin datos recientes.  
* Orden:  
  * En casa.  
  * Fuera.  
  * Sin datos.  
* DEMO PREMIUM / MOCK.  
* GPS real queda POST\_MVP.

### **Actividad Familiar**

* Card con feed compacto.  
* Máximo 3 items.  
* Tipos:  
  * reconocimiento;  
  * foto nueva;  
  * meta alcanzada;  
  * evento completado.  
* Al tap:  
  * navega a Feed completo en People \> Feed.  
* MOCK / DEMO PREMIUM.

### **Estados de Home**

| Estado | Comportamiento | Clasificación |
| ----- | ----- | ----- |
| Normal | Briefing \+ bloques con datos | REAL/DEMO |
| Con alertas | Atención Requerida visible entre Briefing y Carga | REAL/DEMO |
| Con SOS | Banner full-width desplaza todo; briefing normal no se muestra | DEMO/POST\_MVP |
| Todo al día | Briefing tranquilo; sin atención requerida; tareas fusionadas con briefing | REAL/DEMO |
| Sin conexión | Banner fijo; datos cacheados; acciones online deshabilitadas | POST\_MVP / DEMO visual |
| Primer uso post-onboarding | Empty states \+ primeras acciones | REAL/DEMO |

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

* Planner es tab principal.  
* Planner contiene:  
  * Tasks.  
  * Calendar.  
  * Goals.  
* Home muestra datos de Planner, pero no los administra.  
* Home navega a Planner para administración/detalle.

### **Tasks**

Información encontrada:

* Task es una unidad de trabajo pendiente o realizado.  
* Estados encontrados en archivo de comprensión:  
  * Pendiente.  
  * En Progreso.  
  * Completada.  
  * Cancelada.  
* Vencida es calculado.  
* Tareas pueden:  
  * asignarse a Persona.  
  * pertenecer a Responsabilidad.  
  * requerir Verificación.  
  * contribuir a Goal.  
  * vincularse a Evento.  
* Home muestra tareas pendientes y completadas agrupadas por Responsabilidad.  
* Tareas accionables con checkbox 1-tap.  
* Home puede mostrar:  
  * tareas vencidas;  
  * tareas pendientes;  
  * tareas completadas;  
  * tareas asignadas al usuario.  
* Invitado solo ve tareas donde es `assigned_to`.  
* Empleado Familiar no crea tareas según archivo de comprensión; solo completa, comenta y adjunta evidencia.  
* Completar tarea:  
  * cotidiano;  
  * debe tener Deshacer 5s.  
* Eliminar:  
  * requiere confirmación.  
* UX global:  
  * bottom sheets para crear/editar.  
  * empty states como guía.

Clasificación:

* REAL MVP:  
  * lista de tareas.  
  * completar tarea.  
  * tareas pendientes.  
  * tareas vencidas.  
  * asignación básica.  
  * relación con Home.  
* DEMO PREMIUM:  
  * visual de carga desde tareas.  
  * actividad por tareas.  
  * rachas/logros visuales.  
* POST\_MVP:  
  * subtareas.  
  * dependencias.  
  * comentarios.  
  * adjuntos.  
  * timeline.  
  * recurrencia avanzada.  
  * verificación compleja si no hay contrato final.  
  * automatizaciones que crean tareas.  
  * offline sync completo.

### **Events / Calendar**

Información encontrada:

* Evento es evento de calendario:  
  * familiar o personal.  
* Estados encontrados:  
  * Programado.  
  * Completado.  
  * Cancelado.  
* Sin estado Postergado.  
* Evento tiene participantes.  
* Evento puede tener:  
  * fecha;  
  * hora;  
  * ubicación;  
  * participantes.  
* Home muestra próximos eventos.  
* Próximos eventos se ordenan por cercanía temporal.  
* Evento en Home navega a Planner \> Calendar.  
* Adulto ve:  
  * eventos propios;  
  * eventos del hogar donde es participante.  
* Invitado solo ve eventos donde es participante.  
* Adulto Mayor ve eventos simplificados, con dirección completa y botones como “Cómo llegar”.  
* Evento finalizado puede sugerir creación de recuerdo automático desde Calendar hacia FamilyCloud.  
* Esta relación con FamilyCloud queda POST\_MVP / demo visual.

Clasificación:

* REAL MVP:  
  * próximos eventos.  
  * detalle de evento desde Home.  
  * calendario mínimo si otra fuente lo define.  
* DEMO PREMIUM:  
  * eventos mock en Home.  
  * botones “Cómo llegar” si no hay integración real.  
* POST\_MVP:  
  * FamilyCloud automático desde Calendar.  
  * participantes avanzados.  
  * recurrencia compleja.  
  * integración real con mapas.

### **Calendar**

* Calendar vive dentro de Planner.  
* Home \> Próximos Eventos navega a Planner \> Calendar.  
* No se definen vistas día/semana/mes en este documento.  
* No se define agenda completa.  
* No se define si Calendar muestra tareas con fecha.  
* No se define formulario de creación/edición de evento.  
* No se define recurrencia simple.  
* Información faltante para Calendar MVP.

### **Goals**

* Goals vive dentro de Planner.  
* Goal:  
  * meta personal o familiar.  
  * estructura Goal → Hitos → Tasks.  
  * estados: Activa, Completada, Fallida.  
* Hito:  
  * gran avance dentro de una Goal.  
* Clasificación:  
  * POST\_MVP / DEMO PREMIUM visual.  
* No convertir Goals en core MVP desde este documento.

---

## **10\. People / Members / Roles**

### **Roles detectados**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

### **Rol / membresía**

Archivo de comprensión:

* Cuenta:  
  * entidad raíz del usuario;  
  * contiene perfil, preferencias, idioma y memoria personal de Geni;  
  * no pertenece al hogar.  
* Persona:  
  * individuo con cuenta;  
  * pertenece a uno o más hogares con membresías independientes.  
* Membresía:  
  * relación entre Persona y Hogar;  
  * posee un único rol activo;  
  * estados: Pendiente, Activa, Suspendida, Finalizada.  
* Rol:  
  * rol oficial dentro de un hogar.  
* RelaciónFamiliar:  
  * relación informativa entre personas;  
  * no modifica permisos automáticamente.

### **Coordinador**

* Responsable administrativo principal del hogar.  
* Necesita:  
  * visión completa;  
  * distribución de carga;  
  * riesgos;  
  * gestión de miembros.  
* Ve:  
  * carga global;  
  * tendencias;  
  * presupuesto;  
  * porcentajes por miembro.  
* Puede aprobar invitaciones según archivo de comprensión.  
* Puede expulsar membresía según archivo de comprensión.  
* Puede cambiar rol según archivo de comprensión.

### **Adulto**

* Miembro operativo con permisos amplios.  
* Necesita:  
  * responsabilidades propias;  
  * contexto familiar.  
* Ve:  
  * tareas propias;  
  * eventos propios \+ eventos del hogar donde participa;  
  * carga propia interpretada;  
  * presence relevante.  
* Nunca ve:  
  * carga de otros miembros en porcentaje.  
* No se debe generar presión social.

### **Adolescente**

* Miembro con autonomía progresiva.  
* Proporción Hogar/Persona:  
  * 30% / 70%.  
* Necesita:  
  * autonomía;  
  * tareas gamificadas;  
  * baja exposición al contexto global.  
* XP/Nivel aparece como visual:  
  * Card \+ ProgressBar `acent-500`.  
* Sin leaderboard.

### **Niño**

* Gamificación infantil sin rankings ni comparación.  
* Logro visual:  
  * estrellitas;  
  * 3 partículas `acent-500`;  
  * 400ms.  
* No usar productividad comparativa.  
* Nunca:  
  * “tu hermano ya lo hizo”.

### **Adulto Mayor**

* Prioriza:  
  * Personas;  
  * Eventos;  
  * Recordatorios;  
  * Medicación;  
  * Coordinación.  
* UI:  
  * botones grandes;  
  * direcciones completas;  
  * contactos;  
  * llamadas.  
* Toast:  
  * 8s.  
* Chips:  
  * no swipe horizontal.  
* Botones:  
  * lg 64px.

### **Invitado**

* Home mínimo.  
* Solo ve tareas asignadas.  
* Solo ve eventos donde es participante.  
* Sin personalización del hogar.  
* Sin nombre del hogar.  
* Nunca ve:  
  * nombres de otros miembros salvo autorización explícita;  
  * carga familiar;  
  * finanzas;  
  * presence global;  
  * actividad familiar;  
  * documentos no compartidos;  
  * métricas.  
* Tareas:  
  * checkbox para completar.  
  * sin XP.  
  * sin rachas.  
  * sin gamificación.  
* Eventos:  
  * solo relacionados.  
* Información de contacto:  
  * solo si el Coordinador configuró contacto de emergencia.  
  * nunca ve contactos de miembros del hogar.

### **Empleado Familiar**

* Aparece como rol.  
* Regla del archivo de comprensión:  
  * no crea tareas.  
  * solo completa, comenta y adjunta evidencia.  
* Comentarios/adjuntos son POST\_MVP si el MVP actual no los contempla.  
* Debe tratarse con cuidado para no convertir evidencia/adjuntos en MVP real.

---

## **11\. Household / Invitations / Onboarding**

### **Información encontrada**

* Hogar:  
  * unidad organizativa principal.  
  * todo ocurre dentro de un hogar.  
  * independiente de otros hogares.  
* Multi-hogar:  
  * cada hogar es independiente.  
  * roles, Planner, Finance, Presence, Inventory, Assets, FamilyCloud y Automatizaciones no se comparten.  
* SelectorHogar:  
  * dropdown en header.  
  * visible solo si el usuario pertenece a dos o más hogares.  
* Membresía:  
  * relación Persona-Hogar.  
  * estados:  
    * Pendiente;  
    * Activa;  
    * Suspendida;  
    * Finalizada.  
* Invitación:  
  * flujo de ingreso al hogar:  
    * Invitación;  
    * Aceptación;  
    * Aprobación;  
    * Ingreso.  
* Coordinador aprueba invitaciones.  
* Atención Requerida puede mostrar aprobaciones pendientes.  
* Primer uso post-onboarding:  
  * “Tu hogar está listo”.  
  * “Bienvenida a tu hogar. Estas son tus primeras acciones.”  
  * “Creá tu primera tarea →”  
  * “Invitá a alguien →”  
  * “Tu hogar está solo”.  
  * “0 tareas · 0 eventos · Sin gastos”.

### **Clasificación**

* REAL MVP:  
  * hogar como contexto.  
  * rol/membresía para adaptar Home.  
  * aprobación pendiente visible si se implementa.  
  * primer uso post-onboarding.  
* DEMO PREMIUM:  
  * SelectorHogar visual si no se implementa multi-hogar.  
* POST\_MVP:  
  * multi-hogar avanzado.  
  * auditoría completa de cambios de rol/expulsión.  
* Información faltante:  
  * pantallas de crear hogar.  
  * pantallas de invitar.  
  * aceptar invitación.  
  * pending approval.  
  * aprobar/rechazar.  
  * formularios.  
  * errores.  
  * endpoints.

---

## **12\. More / Settings / Profile**

### **More**

* Tab fijo en Bottom Nav.  
* Contiene herramientas especializadas:  
  * Finance.  
  * Inventory.  
  * HomeCloud.  
  * Settings.  
* Finance, Inventory y FamilyCloud/HomeCloud viven en More, no en Bottom Nav.  
* Razón:  
  * dominios ocasionales / Tier 3\.  
  * jerarquía por frecuencia.

### **Settings**

* Estructura mencionada:  
  * Hogar.  
  * Cuenta.  
  * Sistema.  
  * Auditoría.  
* SearchGlobal indexa Settings, permitiendo acceso directo a configuraciones desde búsqueda.  
* Auditoría registra:  
  * cambio de rol;  
  * expulsión;  
  * modificación crítica.  
* Auditoría nunca se elimina según archivo de comprensión.

### **Profile**

* No se encontró pantalla Profile detallada.  
* Cuenta contiene:  
  * perfil;  
  * preferencias;  
  * idioma;  
  * memoria personal de Geni.

### **Clasificación**

* DEMO PREMIUM:  
  * More visual.  
  * Settings visual.  
  * cards de navegación a herramientas.  
* REAL MVP:  
  * cuenta/perfil solo si otro documento lo define para Auth.  
* POST\_MVP:  
  * auditoría completa.  
  * SearchGlobal real.  
  * memoria personal de Geni real.  
  * multi-hogar avanzado.

---

## **13\. Quick Actions**

### **Información encontrada**

* Botón central `+` en Bottom Nav.  
* Abre panel flotante.  
* Fondo con blur.  
* Geni es slot fijo.  
* Acciones dinámicas ordenadas por:  
  * frecuencia;  
  * recencia;  
  * rol;  
  * contexto.  
* Quick Actions es visible para todos.  
* SOS no está en Quick Actions.  
* Quick Actions no reemplaza SOS.  
* Acciones dinámicas no están detalladas con lista completa en el documento principal.

### **Posibles relaciones detectadas en archivo de comprensión**

* Acción de automatización puede crear tarea, enviar notificación, crear evento, actualizar meta o publicar en Feed.  
* Esto pertenece a Automatizaciones, no a Quick Actions manual necesariamente.

### **Clasificación**

| Acción / elemento | Estado en documento | Clasificación |
| ----- | ----- | ----- |
| Abrir panel `+` | Explícito | DEMO PREMIUM |
| Geni fijo | Explícito | DEMO PREMIUM |
| Acciones dinámicas | Explícito como patrón | DEMO PREMIUM |
| Crear tarea | No explícito como Quick Action en este documento | No afirmar como REAL desde esta fuente |
| Crear evento | No explícito como Quick Action en este documento | No afirmar como REAL desde esta fuente |
| SOS | Explícitamente fuera de Quick Actions | No incluir |
| Agregar gasto/item/documento | No explícito como acción rápida en este documento | Pendiente de otras fuentes |

---

## **14\. Módulos demo premium**

### **Finance**

Información visual:

* Finanzas Relevantes aparece en Home.  
* Condicional.  
* Solo si hay alertas financieras.  
* Disparadores:  
  * presupuesto ≥80%;  
  * gasto grande reciente;  
  * deuda vencida;  
  * pago próximo a vencer.  
* Card Alerta compacta.  
* Al tap:  
  * navega a Finance en More.  
* Ejemplo:  
  * “Presupuesto al 92%”  
  * “Quedan 10 días del mes →”  
* Clasificación:  
  * DEMO PREMIUM / MOCK.  
* No implementar:  
  * finanzas reales completas.

### **Inventory**

Información visual:

* Medicación pertenece a Inventory.  
* No hay dominio separado “Cuidados”.  
* Medicamento puede generar recordatorio.  
* Home del Adulto Mayor puede mostrar medicación pendiente y botón “Ya la tomé”.  
* Ejemplo:  
  * “Ya la tomé”.  
* Clasificación:  
  * DEMO PREMIUM / MOCK.  
* No implementar:  
  * Inventory real completo.  
  * recordatorios reales.  
  * stock real.

### **Assets**

Información visual:

* Atención Requerida puede mostrar vencimientos.  
* Ejemplo:  
  * “Cédula verde vence en 5 días”.  
* Assets puede aparecer como vencimientos/documentos por vencer.  
* Clasificación:  
  * DEMO PREMIUM / MOCK.  
* No implementar:  
  * Assets real completo.

### **FamilyCloud / HomeCloud**

Información visual:

* More contiene HomeCloud.  
* Actividad Familiar puede mostrar:  
  * “Mariana subió una foto al álbum familiar”.  
* Evento finalizado puede sugerir creación de recuerdo automático desde Calendar.  
* OCR y reconocimiento facial aparecen como futuro.  
* Clasificación:  
  * DEMO PREMIUM / POST\_MVP.  
* No implementar:  
  * storage real avanzado.  
  * OCR.  
  * reconocimiento facial.  
  * creación automática real.

### **Presence**

Información visual:

* Presence Resumido en Home.  
* Muestra estados:  
  * 🟢 En casa.  
  * 🟡 Fuera / ubicación conocida.  
  * ○ Sin datos recientes.  
* Máximo 4 miembros visibles.  
* Orden:  
  * En casa;  
  * Fuera;  
  * Sin datos.  
* Adulto solo ve miembros con permiso de ubicación.  
* Invitado no ve presence global.  
* Clasificación:  
  * DEMO PREMIUM / MOCK.  
* No implementar:  
  * GPS real.  
  * geofencing.  
  * historial real.  
  * mapas reales.

### **Geni**

Información visual:

* Briefing Geni.  
* Geni fijo en Quick Actions.  
* Tono varía por rol.  
* Briefing resume:  
  * tareas;  
  * eventos;  
  * finanzas;  
  * presencia;  
  * alertas.  
* Geni puede sugerir redistribución al Coordinador sin exponer a otros roles.  
* Clasificación:  
  * DEMO PREMIUM / MOCK.  
* No implementar:  
  * IA real.  
  * memoria real.  
  * recomendaciones reales.

### **Feed / Activity**

Información visual:

* Actividad Familiar muestra feed resumido.  
* Tipos:  
  * reconocimiento;  
  * nueva foto;  
  * meta alcanzada;  
  * evento completado.  
* Al tap:  
  * navega al Feed completo en People \> Feed.  
* Clasificación:  
  * DEMO PREMIUM / MOCK.  
* No implementar:  
  * Feed real completo.

### **SOS**

Información visual:

* Acceso vía swipe ↑ global.  
* No está en Bottom Nav.  
* No está en Quick Actions.  
* Si está activo:  
  * desplaza todo el Home.  
  * banner full-width.  
  * muestra quién, hace cuánto, dónde si hay ubicación.  
  * botones:  
    * Llamar;  
    * Ver ubicación.  
* Adulto Mayor tiene botón emergencia prominente:  
  * full-width;  
  * 64px;  
  * danger;  
  * “Mantenga presionado”.  
* Clasificación:  
  * DEMO PREMIUM visual / POST\_MVP si se requiere real.  
* No implementar:  
  * emergencia real.  
  * ubicación real.  
  * notificaciones reales.  
  * escalamiento real.

### **Automations**

Información visual / relación:

* Automatizaciones:  
  * SI ocurre X → ENTONCES hacer Y.  
* Acciones posibles:  
  * crear tarea;  
  * enviar notificación;  
  * crear evento;  
  * actualizar meta;  
  * publicar en Feed.  
* Biblioteca:  
  * Llegó a casa.  
  * Stock bajo.  
  * Pago próximo.  
  * Mantenimiento pendiente.  
  * Cumpleaños próximo.  
* Clasificación:  
  * POST\_MVP / demo visual si se muestra.  
* No implementar:  
  * automatizaciones reales.

### **Goals**

* Goals aparece dentro de Planner.  
* Goal → Hitos → Tasks.  
* Estados:  
  * Activa;  
  * Completada;  
  * Fallida.  
* Actividad Familiar puede mostrar meta alcanzada.  
* Clasificación:  
  * DEMO PREMIUM / POST\_MVP.  
* No implementar:  
  * Goals backend real.

### **Notifications**

* Notificaciones pueden actualizar Home.  
* Categorías:  
  * Planner.  
  * Calendar.  
  * Finance.  
  * Presence.  
  * Assets.  
  * Inventory.  
  * FamilyCloud.  
  * Feed.  
  * SOS.  
* Prioridades:  
  * Crítica.  
  * Alta.  
  * Media.  
  * Baja.  
* Canales:  
  * Push.  
  * Email.  
  * In-App.  
* SOS no se puede silenciar.  
* Clasificación:  
  * POST\_MVP para push real.  
  * DEMO PREMIUM para badges/alerts visuales.

### **Search**

* SearchGlobal indexa:  
  * Personas;  
  * Tasks;  
  * Events;  
  * Goals;  
  * Gastos;  
  * Documentos;  
  * Configuraciones.  
* Ejecuta acciones.  
* Clasificación:  
  * POST\_MVP.  
* No implementar:  
  * búsqueda global real.

### **Load / Carga Familiar**

* Visible solo para Coordinador con porcentajes.  
* Progress bars por miembro.  
* Puede mostrar carga desbalanceada.  
* No debe usarse como comparación pública.  
* Clasificación:  
  * MOCK / DEMO PREMIUM.

---

## **15\. Estados UX y feedback**

| Estado / feedback | Descripción | Uso | Clasificación |
| ----- | ----- | ----- | ----- |
| Normal | Bloques visibles con datos | Home | REAL/DEMO |
| Con alertas | Atención Requerida visible | Home | REAL/DEMO |
| SOS activo | Banner desplaza todo | Home/SOS | DEMO/POST\_MVP |
| Todo al día | Sin tareas/alertas; briefing tranquilo | Home | REAL/DEMO |
| Sin conexión | Banner fijo \+ datos cacheados | Home | DEMO/POST\_MVP |
| Primer uso | Empty states y primeras acciones | Home/Onboarding | REAL/DEMO |
| Sin tareas | Empty state informativo | Tareas/Home | REAL |
| Sin eventos | Bloque no visible para Invitado | Home/Eventos | REAL/DEMO |
| Sin datos recientes | Presence con ○ | Presence | MOCK |
| Tarea completada | Tachado \+ opacidad reducida | Tasks | REAL |
| Tarea vencida | Atención Requerida | Tasks/Home | REAL |
| Acción disabled offline | Opacidad 0.5 | Home | DEMO/POST\_MVP |
| Loading \>300ms | Skeleton | Listas | REAL/DEMO |
| Operación \>400ms | Spinner en botón | Botones | REAL/DEMO |
| Toast | Zona superior | Completar tarea | REAL |
| Toast Adulto Mayor | 8s | Senior | DEMO |
| Deshacer | 5s en completar tarea | Planner/Home | REAL |
| Confirmación | Modal para eliminación | Acciones graves | REAL/DEMO |
| Fade-in | Empty/data load | Transiciones | DEMO |
| Fade-out 300ms | Cerrar SOS | SOS | DEMO |
| Slide-down | Banner | Sin conexión/SOS | DEMO |
| Scale 0.95→1 \+ fade 250ms | Modal | Confirmación | DEMO |
| Háptico ligero | Completar tarea | Planner | REAL/DEMO |
| Háptico heavy | Reservado exclusivamente para SOS | SOS | POST\_MVP |

---

## **16\. Formularios y datos de entrada**

### **Formularios encontrados directamente**

No se encontró definición completa de formularios con campos, validaciones y errores.

### **Formularios inferidos por pantallas o acciones mencionadas, sin detalle suficiente**

| Formulario / acción | Información disponible | Información faltante | Clasificación |
| ----- | ----- | ----- | ----- |
| Crear tarea | Primer uso muestra “Creá tu primera tarea →”; UX dice bottom sheets para crear/editar | Campos, validación, request, navegación | REAL MVP pendiente |
| Editar tarea | UX-03 menciona bottom sheets para crear/editar | Campos, validación, pantalla | REAL MVP pendiente |
| Crear evento | Planner contiene Calendar; Quick/automatización menciona crear evento como acción automatizada | Formulario, campos, validación | REAL MVP pendiente |
| Editar evento | No definido | Todo | Pendiente |
| Invitar miembro | Primer uso muestra “Invitá a alguien →” | Campos, link/código, errores | REAL MVP pendiente |
| Configurar contacto invitado | Contacto de emergencia visible solo si coordinador lo configuró | Formulario de configuración | Pendiente |
| Medicación “Ya la tomé” | Botón mencionado para Adulto Mayor | Formulario no aplica | DEMO |
| Cómo llegar | Botón abre maps | No se define integración | DEMO/POST\_MVP |
| Llamar | Botón de contacto | No se define permisos/teléfono real | DEMO |

### **Campos de entrada explícitos**

No se encontró especificación de campos de formulario con tipos.

---

## **17\. Datos demo extraíbles**

### **Personas / miembros**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Valeria | Saludo Coordinador | MOCK |
| Mariana | Miembro / Adulto / hija / carga / presence | MOCK |
| Tomás | Miembro / nieto / SOS / actividad | MOCK |
| Luca | Miembro / hijo / evento dentista / presence | MOCK |
| D. Carlos | Adulto Mayor / presence | MOCK |
| Don Carlos | Tratamiento Adulto Mayor | MOCK |
| Doña María | Tratamiento Adulto Mayor | MOCK |
| Rosa | Invitado | MOCK |

### **Tareas**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Pagar servicios | Task demo | REAL/ MOCK |
| Comprar fruta | Task demo | REAL/ MOCK |
| Preparar viandas | Task demo completada | REAL/ MOCK |
| Limpieza general | Task invitado | REAL/ MOCK |
| Lavar cortinas | Task invitado | REAL/ MOCK |
| Creá tu primera tarea → | Empty state / primer uso | REAL/DEMO |

### **Eventos**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Dentista de Luca | Evento demo | REAL/ MOCK |
| Reunión de padres | Evento demo | REAL/ MOCK |
| Cena familiar | Evento demo | REAL/ MOCK |
| Limpieza profunda | Evento invitado | REAL/ MOCK |
| Dr. Rodríguez | Evento médico Adulto Mayor | MOCK |
| Cardiología | Especialidad médica | MOCK |

### **Fechas / horarios / chips**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| HOY 14:30 | Chip evento | MOCK |
| MAÑ 10:00 | Chip evento | MOCK |
| HOY 16:00 | Chip evento adulto | MOCK |
| VIE 19:00 | Chip evento adulto | MOCK |
| VIE 9:00 | Chip evento invitado | MOCK |
| SÁB 20:00 | Evento adulto mayor | MOCK |
| Jueves 15 · 10:30 | Evento médico | MOCK |
| Miércoles · 9:00 a 13:00 | Metadata tarea | MOCK |
| Para el viernes | Metadata tarea | MOCK |
| Para mañana | Metadata tarea | MOCK |
| Para el finde | Metadata tarea | MOCK |

### **Lugares / direcciones**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Av. Santa Fe 1234 | Ubicación evento/SOS | MOCK |
| Colegio San Marcos | Ubicación evento | MOCK |
| En casa | Ubicación evento/presence | MOCK |
| Casa principal | Ubicación invitado/tarea | MOCK |
| Av. Córdoba 2345, 3° B | Dirección Adulto Mayor | MOCK |

### **Finanzas / vencimientos**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| $45.000 | Metadata tarea/pago | MOCK |
| Presupuesto al 92% | Finance card | MOCK |
| Quedan 10 días del mes | Finance card | MOCK |
| Cédula verde vence en 5 días | Atención Requerida / Assets | MOCK |
| Pago de servicios vence hoy | Atención Requerida | MOCK |
| El presupuesto está al 92%. Quedan 10 días. ¿Ajustamos algo? | Briefing | MOCK |

### **Presence**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| En casa | Presence | MOCK |
| Escuela | Presence | MOCK |
| Sin datos (1h) | Presence | MOCK |
| Sin datos recientes | Presence | MOCK |

### **Briefing / copy**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Hoy: 4 tareas, 2 eventos y 1 documento por vencer. La carga está 60/40. ¿Arrancamos por las tareas? | Briefing coordinador | MOCK |
| Todo al día por acá. Nada pendiente. | Briefing | MOCK |
| Hoy viene cargado: 6 tareas, 3 eventos y 1 vencimiento. ¿Revisamos prioridades? | Briefing | MOCK |
| La carga está 70/30 esta semana. ¿Querés revisar la distribución? | Briefing | MOCK |
| Sin conexión. Última información: hace 45 min. | Offline | MOCK |
| Tenés 2 tareas para hoy. La tarjeta del auto vence el viernes. | Briefing adulto | MOCK |
| Sin tareas pendientes. Nada que necesite tu atención ahora. | Adulto todo al día | MOCK |
| Esta semana tenés menos tareas que otras semanas. ¿Podés ayudar con algo más? | Adulto carga propia | MOCK |
| Rosa, hoy tiene 1 tarea asignada. | Invitado | MOCK |
| No tiene tareas pendientes. | Invitado vacío | MOCK |
| Bienvenida a tu hogar. Estas son tus primeras acciones. | Primer uso | MOCK |
| Tu hogar está listo | Primer uso | MOCK |

### **Activity**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Tomás completó 3 tareas esta semana | Actividad | MOCK |
| Mariana subió una foto al álbum familiar | Actividad | MOCK |
| Luca completó su lista hoy | Actividad | MOCK |
| Nueva foto en álbum familiar | Actividad | MOCK |

### **Contactos**

| Dato | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Contacto de la casa | Invitado | MOCK |
| \+54 11 5555-0000 | Teléfono demo | MOCK |
| Mariana (hija) | Contacto Adulto Mayor | MOCK |
| Tomás (nieto) | Contacto Adulto Mayor | MOCK |

---

## **18\. Servicios frontend / APIs / datos**

### **Contratos API**

No se encontró contrato API explícito en este documento.

### **Datos / services inferibles por flujos visuales**

| Service conceptual | Datos que debería entregar según documento | Acciones visuales | Clasificación |
| ----- | ----- | ----- | ----- |
| Home data service | briefing, atención requerida, tareas, eventos, carga, finanzas, presence, actividad | cargar Home, refresh | REAL/DEMO |
| Tasks service | tareas pendientes, completadas, vencidas, agrupadas por Responsabilidad | completar, deshacer, abrir lista | REAL MVP |
| Events service | próximos eventos con fecha, ubicación, participantes | abrir detalle | REAL MVP |
| Members/Profile service | perfil, rol, membresía | personalizar Home por rol | REAL MVP |
| Presence mock service | estados de miembros | mostrar presence | MOCK |
| Finance mock service | alertas financieras | mostrar card | MOCK |
| Geni mock service | copy de briefing | mostrar briefing | MOCK |
| Activity mock service | feed resumido | mostrar actividad | MOCK |
| Settings/Audit service | auditoría/settings | visual en More | POST\_MVP/DEMO |
| Offline queue | cola de cambios de Planner | sincronización offline | POST\_MVP |

### **Fuentes de datos mencionadas**

* Persona → HomeScreen:  
  * perfil;  
  * rol;  
  * membresía.  
* Geni → BriefingWidget:  
  * tareas;  
  * eventos;  
  * finanzas;  
  * presencia;  
  * alertas.  
* Task → TareasHomeWidget:  
  * tareas pendientes;  
  * tareas completadas;  
  * agrupación por Responsabilidad.  
* Evento → PróximosEventosWidget:  
  * fecha;  
  * ubicación;  
  * participantes.  
* Presence → HomeScreen:  
  * llegada/salida;  
  * estado resumido.  
* Notificación → HomeScreen:  
  * actualización de Home.  
* Inventory/Medicamento → Home Adulto Mayor:  
  * medicación pendiente.  
* Automatización → Planner:  
  * stock bajo → crear tarea.  
* Evento finalizado → FamilyCloud:  
  * sugerir recuerdo automático.

---

## **19\. Realtime / sincronización visible**

### **Información encontrada**

* Presence puede actualizar HomeScreen en tiempo real vía push.  
* Notificación puede disparar actualización de Home.  
* Offline:  
  * última información conocida.  
  * timestamps de antigüedad.  
  * acciones que requieren conexión deshabilitadas con opacidad 0.5.  
* ColaSincronización puede encolar cambios de Planner.  
* Sincronización offline:  
  * Last Write Wins.  
  * cambios conservan autor;  
  * fecha original;  
  * fecha de sincronización.  
* Multi-hogar:  
  * datos no se comparten entre hogares.

### **Clasificación**

* REAL MVP:  
  * actualizar Home después de completar tarea si el backend real existe.  
  * refresh en tap de tab activo.  
* DEMO PREMIUM:  
  * presencia actualizada visualmente.  
  * banner sin conexión con datos cacheados.  
* POST\_MVP:  
  * push real.  
  * offline queue real.  
  * Last Write Wins completo.  
  * sincronización entre dispositivos si no está definida por otros documentos.  
  * notificaciones reales.

### **Pantallas afectadas**

| Evento / cambio | Pantalla que debería actualizarse | Clasificación |
| ----- | ----- | ----- |
| Tarea completada | Home, Planner | REAL MVP |
| Evento próximo creado/editado | Home, Calendar | REAL MVP si existe |
| Notificación relevante | Home | POST\_MVP/DEMO |
| Cambio presence | Home | MOCK/POST\_MVP |
| Sin conexión | Home | DEMO/POST\_MVP |
| Cambio de rol/membresía | Home, Settings/Auditoría | REAL/POST\_MVP según alcance |

---

## **20\. Permisos visibles en UI**

| Rol | Puede ver / hacer | No puede ver / hacer | Módulo | Clasificación |
| ----- | ----- | ----- | ----- | ----- |
| Coordinador | Visión completa, carga global, tendencias, presupuesto, gestión de miembros, aprobar invitaciones | No especificado | Home/People/Household | REAL/DEMO |
| Coordinador | Ver Carga Familiar con porcentajes | No aplica | Home | DEMO PREMIUM |
| Adulto | Ver tareas propias, eventos propios y donde participa, carga propia interpretada | No ve porcentajes de otros miembros | Home/Planner | REAL/DEMO |
| Adulto | Presence relevante según permisos | No ve todos los miembros si no corresponde | Home/Presence | DEMO |
| Adolescente | Tareas gamificadas, autonomía, bajo contexto global | No se especifica completo | Home/Planner | DEMO |
| Niño | Logros visuales personales | Sin ranking, sin comparación, sin presión social | Home/Planner | DEMO |
| Adulto Mayor | Eventos, contactos, medicación, botones grandes, llamada, emergencia | No se especifica completo | Home | DEMO |
| Invitado | Tareas asignadas, eventos donde participa, contacto configurado | No ve nombres de otros miembros, carga, finanzas, presence global, actividad, documentos no compartidos, métricas | Home/Planner | REAL/DEMO |
| Empleado Familiar | Completar tareas, comentar, adjuntar evidencia | No crea tareas | Planner | POST\_MVP parcial |

### **Reglas de privacidad visibles**

* Adulto no ve carga de otros.  
* Invitado no ve información global del hogar.  
* Carga desbalanceada visible solo para Coordinador.  
* Geni puede sugerir redistribución al Coordinador sin exponer a otros roles.  
* RelaciónFamiliar no modifica permisos automáticamente.

---

## **21\. Integraciones visibles entre módulos**

| Relación | Descripción | Clasificación |
| ----- | ----- | ----- |
| Home → Planner | Home muestra tareas y eventos, Planner administra | REAL MVP |
| Home → Planner \> Calendar | Tap en evento navega al detalle en Calendar | REAL MVP |
| Home → Tasks | Checkbox completa tarea desde Home | REAL MVP |
| Task → Home | Tareas pendientes/completadas alimentan TareasHomeWidget | REAL MVP |
| Evento → Home | Próximos eventos alimentan widget de eventos | REAL MVP |
| Persona/Rol/Membresía → Home | Determina variante por rol | REAL MVP |
| Responsabilidad → Tasks/Home | Agrupa tareas | REAL MVP / parcial |
| Home → Finance | Finanzas Relevantes navega a Finance en More | DEMO PREMIUM |
| Finance → Home | Alertas financieras se muestran en Home | DEMO PREMIUM |
| Presence → Home | Estado resumido de miembros | MOCK / DEMO |
| Inventory/Medicamento → Home Adulto Mayor | Medicación pendiente \+ botón “Ya la tomé” | DEMO PREMIUM |
| Assets/Vencimiento → Atención Requerida | Documentos/vencimientos en Home | DEMO PREMIUM |
| FamilyCloud → Actividad | Fotos/álbumes en actividad | MOCK |
| Evento finalizado → FamilyCloud | Sugerir recuerdo automático | POST\_MVP |
| Geni → Briefing | Genera/resume briefing | MOCK / POST\_MVP |
| Geni → Quick Actions | Geni slot fijo | DEMO PREMIUM |
| Notificaciones → Home | Actualizan Home | POST\_MVP / DEMO |
| Automatización → Planner | Stock bajo crea tarea | POST\_MVP |
| SearchGlobal → Settings/entidades | Navegación directa | POST\_MVP |
| Household → todos los módulos | Separación por hogar | REAL MVP / POST\_MVP avanzado |
| Auditoría → Settings | Cambios críticos | POST\_MVP |
| Offline → Planner | Cola de cambios | POST\_MVP |

---

## **22\. Edge cases frontend**

| Caso | Comportamiento esperado encontrado | Clasificación |
| ----- | ----- | ----- |
| Sin conexión | Banner fijo superior, última actualización, datos cacheados, acciones online disabled opacidad 0.5 | DEMO/POST\_MVP |
| Todo al día | Briefing tranquilo, sin Atención Requerida, tareas fusionadas con briefing, sin “Felicitaciones” excesivo | REAL/DEMO |
| Primer uso | Briefing bienvenida, acciones sugeridas, métricas en cero | REAL/DEMO |
| SOS activo | Desplaza todo el Home, briefing normal no se muestra | DEMO/POST\_MVP |
| Tareas completadas | Tachado sutil, opacidad reducida, al final | REAL |
| Más de 4 tareas | “Ver todas (8) →” | REAL/DEMO |
| Más de 3 eventos | Scroll o limitar visibles | REAL/DEMO |
| Más de 3 alertas | “Ver 2 más →” | REAL/DEMO |
| Invitado sin tareas | “No tiene tareas pendientes.” Empty state informativo | REAL/DEMO |
| Invitado sin eventos | Bloque no visible | REAL/DEMO |
| Invitado sin contacto configurado | Bloque contacto no visible | REAL/DEMO |
| Adulto sin tareas | “Sin tareas pendientes. Nada que necesite tu atención ahora.” | REAL/DEMO |
| Adulto no autorizado a ver carga | Nunca muestra porcentajes de otros | REAL/DEMO |
| Acciones graves | Modal de confirmación | REAL/DEMO |
| Completar accidental | Toast Deshacer 5s | REAL |
| Loading lento | Skeleton \>300ms | REAL/DEMO |
| Operación lenta | Spinner en botón \>400ms | REAL/DEMO |
| Adulto Mayor | Toast 8s, botones grandes, no swipe horizontal en chips | DEMO |

No se encontraron edge cases específicos para:

* email ya registrado;  
* credenciales inválidas;  
* token expirado;  
* invitación expirada;  
* invitación ya usada;  
* usuario pendiente de aprobación;  
* último coordinador;  
* conflicto de evento;  
* tarea ya verificada;  
* responsabilidad sin miembros.

---

## **23\. Copywriting y labels**

### **Tabs**

* Home.  
* People.  
* `+`.  
* Planner.  
* More.

### **Bloques Home**

* Briefing Geni.  
* Atención requerida.  
* Carga de esta semana.  
* Próximos eventos.  
* Tareas pendientes.  
* Finanzas.  
* Presencia.  
* Actividad.  
* Tus tareas.  
* Esta semana.  
* Tu carga.  
* En casa.  
* Para empezar.  
* Así va tu hogar.  
* Información.  
* Contactos.

### **Botones / acciones**

* Ver 2 más →.  
* Ver todas (8) →.  
* Deshacer.  
* Creá tu primera tarea →.  
* Invitá a alguien →.  
* Cómo llegar.  
* Llamar.  
* Ya la tomé.  
* EMERGENCIA.  
* Mantenga presionado.  
* Ver ubicación.  
* Llamar a Tomás.

### **Estados / mensajes**

* Todo al día por acá. Nada pendiente.  
* Sin tareas pendientes.  
* Nada que necesite tu atención ahora.  
* Sin conexión.  
* Última actualización: 08:15.  
* Última información: hace 45 min.  
* Datos de 08:15.  
* Tu hogar está listo.  
* Tu hogar está solo.  
* 0 tareas · 0 eventos · Sin gastos.  
* No tiene tareas pendientes.

### **Briefings / textos concretos**

* “Hoy: 4 tareas, 2 eventos y 1 documento por vencer. La carga está 60/40. ¿Arrancamos por las tareas?”  
* “Hoy: 4 tareas, 2 eventos. La carga está 60/40. ¿Arrancamos por las tareas?”  
* “Todo al día por acá. Nada pendiente.”  
* “Hoy viene cargado: 6 tareas, 3 eventos y 1 vencimiento. ¿Revisamos prioridades?”  
* “La carga está 70/30 esta semana. ¿Querés revisar la distribución?”  
* “El presupuesto está al 92%. Quedan 10 días. ¿Ajustamos algo?”  
* “Sin conexión. Última información: hace 45 min.”  
* “Tenés 2 tareas para hoy y 1 evento a las 16\. La tarjeta del auto vence el viernes.”  
* “Tenés 2 tareas para hoy. La tarjeta del auto vence el viernes.”  
* “Tenés 4 tareas esta semana. ¿Revisamos prioridades?”  
* “Esta semana tenés menos tareas que otras semanas. ¿Podés ayudar con algo más?”  
* “Rosa, hoy tiene 1 tarea asignada.”  
* “Bienvenida a tu hogar. Estas son tus primeras acciones.”

### **Roles / nombres**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.  
* Don Carlos.  
* Doña María.  
* Valeria.  
* Mariana.  
* Tomás.  
* Luca.  
* D. Carlos.  
* Rosa.

---

## **24\. Restricciones técnicas frontend**

### **Stack**

No se encontró información específica de stack técnico como:

* Expo.  
* React Native.  
* Supabase.  
* librerías instaladas.  
* librerías ausentes.  
* Storage real.  
* Edge Functions.

### **Restricciones UX/técnicas detectadas**

* Mobile-first 375×812px.  
* Bottom Nav congelada.  
* Home debe caber en pantalla si es posible.  
* Scroll solo si es inevitable.  
* Capa 1 siempre visible sin scroll.  
* Acción principal en zona de pulgar.  
* Quick Actions con blur.  
* Bottom sheets para crear/editar.  
* Confirmaciones con modal.  
* Skeleton para listas \>300ms.  
* Spinner en botones tras 400ms.  
* Sin sonidos propios.  
* Haptics:  
  * ligero para completar tarea.  
  * heavy solo SOS.  
* Offline:  
  * última información conocida.  
  * datos cacheados.  
  * acciones online deshabilitadas.  
* Last Write Wins mencionado para sincronización offline.  
* Multi-hogar:  
  * hogares independientes.  
  * datos no compartidos entre hogares.  
* SelectorHogar solo visible si pertenece a dos o más hogares.  
* Badge nav:  
  * success/alert;  
  * nunca error.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Documento centrado en Home | No define pantallas completas de otros módulos | Usarlo como fuente visual/global, no como contrato funcional completo |
| Planner aparece como tab pero no como pantalla | Falta estructura de Planner | Fusionar con documentos específicos de Planner |
| Tasks en Home sí están detalladas, pero Tasks module no | Puede confundirse Home widget con pantalla Planner | Mantener regla: Home resume, Planner administra |
| Goals dentro de Planner | Podría inflar MVP | Tratar como DEMO/POST\_MVP salvo otra fuente lo haga real |
| Briefing Geni | Puede parecer IA real | Implementar como MOCK/DEMO si no hay IA real |
| Presence resumido | Puede parecer GPS real | Usar mock/dummy, no GPS real |
| Finance en Home | Puede parecer finanzas reales | Demo premium con datos mock |
| Medicación | Pertenece a Inventory, no a dominio Cuidados | No crear módulo nuevo |
| SOS visual | Puede implicar responsabilidad real | Mantener demo visual salvo definición específica |
| Offline sync | Se menciona Last Write Wins | No implementar completo sin spec técnica |
| Empleado Familiar | Aparece como 7º rol | No convertir automáticamente en MVP principal si alcance MVP usa 6 roles |
| Verificación de tareas | Archivo asociado dice Verificación opcional y sin estado separado | No resolver desde este documento |
| Toast completar tarea | Documento menciona Deshacer 5s; DS asociado menciona 4s default y 8s Adulto Mayor | Usar 5s para completar tarea si se fusiona con Planner |
| Multi-hogar | Selector aparece si ≥2 hogares | Para MVP puede ser POST\_MVP si no se implementa multi-hogar |
| Comentarios/adjuntos | Empleado Familiar puede comentar/adjuntar evidencia | No llevar a MVP si comentarios/adjuntos están fuera |

---

## **26\. Información faltante**

| Área | Información faltante |
| ----- | ----- |
| Auth | Login, Register, Logout, Refresh, errores, formularios, navegación post-login |
| Onboarding | Flujo completo, pantallas, preguntas por rol, validaciones |
| Household | Crear hogar, configurar hogar, hogar activo, selección real |
| Invitations | Crear link/código, aceptar, pending approval, aprobar/rechazar, errores |
| Members | Pantalla People/Members completa, lista de miembros, gestión básica |
| Planner | Pantalla principal, tabs internos, formularios, filtros, detalle |
| Tasks | Campos, prioridades, fechas, edición, eliminación, verificación MVP, endpoints |
| Events | Formulario, editar/cancelar, vista calendario, recurrencia, endpoints |
| Calendar | Día/semana/mes, agenda, tareas con fecha |
| Goals | Si se muestra o se oculta en MVP |
| More | Pantalla detallada |
| Settings | Pantallas, opciones reales, privacidad, perfil |
| Quick Actions | Lista real de acciones |
| Finance demo | Pantalla completa, datos mock suficientes |
| Inventory demo | Pantalla completa, acciones demo |
| Assets demo | Pantalla completa, cards |
| FamilyCloud demo | Pantalla completa, documentos/álbumes |
| Presence demo | Pantalla People/Presence, estados editables |
| Geni demo | Pantalla/panel, prompts, estados |
| Feed demo | Pantalla feed completa |
| Notifications | UI de notificaciones |
| APIs | No hay endpoints |
| Services | No hay contratos frontend |
| Realtime | No hay implementación concreta |
| Design tokens | Colores nombrados pero no valores hex |
| Tipografía | Se menciona Fraunces, pero no escala completa |
| Accesibilidad | No hay checklist completo |
| Performance | Solo thresholds de skeleton/spinner |
| Testing | No se encontró información |

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Nivel esperado | Motivo |
| ----- | ----- | ----- | ----- |
| `visual_system_fragment` | Sí | Alto | Contiene cards, chips, badges, botones, toasts, skeletons, banners, layout, densidad |
| `navigation_fragment` | Sí | Alto | Bottom Nav canónica, Quick Actions, More, Planner, People |
| `home_frontend_fragment` | Sí | Completo | Documento principal trata Home por roles y estados |
| `planner_frontend_fragment` | Sí | Medio | Tareas/eventos en Home y navegación a Planner |
| `people_members_frontend_fragment` | Parcial | Medio | Roles, presence, miembros visibles, permisos de invitado/adulto |
| `household_invites_frontend_fragment` | Parcial | Bajo | Solo hogar, membresía, invitación conceptual, primer uso |
| `auth_onboarding_frontend_fragment` | Parcial | Bajo | Solo primer uso post-onboarding; no Auth |
| `quick_actions_frontend_fragment` | Sí | Medio | Panel `+`, Geni fijo, acciones dinámicas |
| `more_settings_frontend_fragment` | Parcial | Medio | More contiene herramientas; Settings estructura básica |
| `finance_demo_fragment` | Sí | Medio | Finanzas relevantes en Home \+ ejemplos |
| `inventory_demo_fragment` | Parcial | Medio | Medicación Adulto Mayor e Inventory |
| `assets_demo_fragment` | Parcial | Bajo | Vencimientos/documentos por vencer |
| `familycloud_demo_fragment` | Parcial | Medio | Actividad, fotos, álbum, recuerdos |
| `presence_demo_fragment` | Sí | Medio | Presence resumido, estados, visibilidad por rol |
| `geni_demo_fragment` | Sí | Alto | Briefing, tono, Quick Actions slot fijo |
| `mock_data_fragment` | Sí | Alto | Muchos nombres, tareas, eventos, lugares, copies |
| `ux_states_fragment` | Sí | Alto | Normal, alertas, SOS, offline, vacío, primer uso |
| `frontend_services_fragment` | Parcial | Bajo | Data flows conceptuales, sin API |
| `roles_permissions_ui_fragment` | Sí | Medio | Visibilidad por rol muy útil para UI |
| `adulto_mayor_accessibility_fragment` | Sí | Medio | Botones grandes, contactos, eventos, toast extendido |

---

## **28\. Conclusión operativa**

Este documento debe usarse como una fuente fuerte para construir el **frontend global premium** de HomePlus en las áreas de:

* Home.  
* Navegación.  
* Diseño visual.  
* Patrones UI reutilizables.  
* Estados UX.  
* Adaptación por rol.  
* Mock data.  
* Widgets demo premium.  
* Integración visual con Planner, More, People y Quick Actions.

Debe usarse especialmente para definir:

* Bottom Nav final.  
* Home como centro operativo.  
* Home resume, módulos administran.  
* Orden canónico de widgets.  
* Cards y listas.  
* Tareas 1-tap.  
* Eventos próximos.  
* Briefing mock.  
* Carga Familiar mock.  
* Presence mock.  
* Actividad mock.  
* More como contenedor de módulos secundarios.  
* Quick Actions como panel premium.  
* Estados offline/empty/loading/success.  
* Permisos visibles por rol.

No debe usarse como única fuente para:

* Auth real.  
* Household real.  
* Invitations real.  
* Members completo.  
* Planner completo.  
* APIs.  
* Realtime real.  
* Supabase.  
* Formularios finales.  
* Backend.  
* Servicios definitivos.

Para el MVP actual, la recomendación de clasificación desde este documento es:

* REAL MVP:  
  * Bottom Nav.  
  * Home base.  
  * tareas reales en Home si existe Planner real.  
  * eventos reales en Home si existe Calendar real.  
  * rol/membresía para adaptar UI.  
  * completar tarea con feedback.  
* DEMO PREMIUM:  
  * Briefing.  
  * Carga Familiar.  
  * Presence.  
  * Actividad.  
  * Finance card.  
  * Adulto Mayor medicación/contactos.  
  * Quick Actions visual.  
  * More visual.  
* MOCK:  
  * datos de carga.  
  * activity.  
  * presence.  
  * briefing copy.  
  * finanzas.  
  * nombres/eventos/tareas demo.  
* POST\_MVP:  
  * IA real.  
  * GPS real.  
  * SOS real.  
  * offline sync completo.  
  * automatizaciones.  
  * auditoría completa.  
  * SearchGlobal.  
  * FamilyCloud real.  
  * Finance/Inventory/Assets reales.  
  * Goals reales.  
  * comentarios/adjuntos/subtareas avanzadas.

---

# **SOURCE 14 — EVENTOS DEL SISTEMA**

## **Archivo recomendado**

`Eventos del sistema V1.txt`

## **Tipo de documento**

Eventos del sistema / activity / feedback

## **Uso para frontend**

Extraer:

* eventos visibles para Home/Activity;  
* activity feed;  
* notificaciones mock;  
* estados derivados;  
* cambios en tareas/eventos;  
* feedback visual;  
* timeline;  
* qué puede mostrarse como real o mock.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_Eventos\_del\_sistema\_v1**

## **1\. Fuente**

* Documento principal: `HomePlus — Eventos del sistema v1.md`.  
* Archivo de comprensión asociado disponible en este chat: `Esquema de base de datos v1.txt`.  
* Tipo de documento: catálogo de eventos del sistema \+ esquema/knowledge graph de entidades, relaciones, reglas y navegación.  
* Alcance: describe eventos reactivos, triggers, payloads, consumidores, prioridades, comportamiento offline, entidades, pantallas, reglas de negocio y relaciones entre módulos.  
* Nivel de utilidad frontend: **Medio/Alto**.  
  * Alto para estados UX, feedback, pantallas mencionadas, navegación, roles, módulos visibles, conexiones entre módulos y señales de realtime.  
  * Bajo para visual design concreto, porque no define colores, tipografías, spacing, radios, sombras, layout premium ni capturas.

---

## **2\. Utilidad frontend del documento**

Este documento sirve para extraer:

* eventos que deberían reflejarse en UI;  
* estados visibles de tareas, eventos, invitaciones, miembros, notificaciones y módulos;  
* navegación global principal;  
* pantallas mencionadas por dominio;  
* conexiones visibles entre Home, Planner, People, More y Quick Actions;  
* roles y permisos que afectan botones visibles;  
* copy puntual para notificaciones, briefing y feedback;  
* prioridades visuales para alertas;  
* comportamiento offline como referencia futura;  
* módulos que pueden verse como demo premium;  
* riesgos de alcance entre MVP real, demo premium y POST\_MVP.

No sirve para extraer:

* diseño visual detallado;  
* wireframes;  
* capturas;  
* tokens de diseño;  
* estructura exacta de formularios;  
* endpoints HTTP;  
* request/response de APIs frontend;  
* componentes React Native concretos;  
* layout exacto de cada pantalla.

---

## **3\. Información de producto aplicable al frontend**

### **Principios aplicables**

* HomePlus se define como “Sistema Operativo del Hogar”.  
* El sistema es reactivo por diseño: acciones de usuarios, cambios de estado y triggers temporales generan eventos.  
* Las acciones pueden disparar:  
  * notificaciones;  
  * emails;  
  * intervenciones de Geni;  
  * automatizaciones;  
  * auditoría;  
  * feed;  
  * briefing;  
  * streaks;  
  * SOS.  
* La UI debe poder representar eventos y cambios de estado de forma clara.  
* La app debe mostrar consecuencias visibles de acciones familiares: invitación aceptada, miembro unido, tarea asignada, tarea completada, evento cancelado, etc.  
* El hogar es la unidad máxima de aislamiento de datos.  
* Ningún dato del hogar debe cruzarse entre hogares.  
* Home debe actuar como resumen operativo, no como lugar de administración profunda.  
* Los módulos especializados administran sus propios datos.  
* Las notificaciones tienen prioridad y comportamiento diferenciado.  
* Las notificaciones in-app se almacenan; push no se almacena.  
* El usuario debe entender qué requiere atención sin revisar todos los módulos.  
* Geni puede sugerir, detectar patrones y generar briefing, pero no debe ejecutar acciones sensibles sin control del usuario.  
* Las automatizaciones y la IA real son futuras o avanzadas para el frontend premium, no obligatorias para MVP real salvo como demo/mock.

### **Clasificación**

* **REAL MVP**  
  * Auth/register.  
  * Household created.  
  * Members básicos.  
  * Invitations básicas.  
  * Planner Tasks.  
  * Planner Events.  
  * Calendar mínimo.  
  * Home mostrando tareas/eventos/miembros si corresponde.  
* **DEMO PREMIUM**  
  * FinanceDashboard.  
  * InventoryDashboard.  
  * AssetsDashboard.  
  * FamilyCloudDashboard.  
  * PresenceDashboard.  
  * GeniChat.  
  * FeedDashboard.  
  * GoalsView.  
  * AutomationLibrary.  
  * GlobalSearch.  
  * Home widgets avanzados.  
* **MOCK**  
  * Briefing si no hay IA real.  
  * Carga Familiar si no se implementa LoadMetric real.  
  * Presence si no hay ubicación real.  
  * Actividad familiar si no hay Feed real.  
  * métricas y gráficos derivados.  
* **POST\_MVP**  
  * IA real.  
  * Automatizaciones reales.  
  * Offline sync real.  
  * auditoría completa visible.  
  * notificaciones push/email/SMS reales.  
  * geofencing.  
  * GPS real.  
  * OCR/storage avanzado.  
  * comentarios/adjuntos reales.  
  * recurrencia compleja.  
  * búsqueda global avanzada.  
  * multi-hogar avanzado.

---

## **4\. Navegación y arquitectura de pantallas**

### **Navegación global detectada**

* `BottomNavigation`  
  * `[Home] [People] [+] [Planner] [More]`  
  * Clasificación: **REAL MVP / navegación global**.  
  * Estado: congelado V1.  
* `QuickActions`  
  * Panel flotante desde `+`.  
  * Geni tiene slot fijo primero.  
  * Acciones dinámicas por frecuencia.  
  * Clasificación: **DEMO PREMIUM / parcialmente REAL si incluye crear tarea/evento/invitar**.  
* `MoreMenu`  
  * Incluye Finance, Inventory, FamilyCloud, Settings.  
  * Clasificación: **DEMO PREMIUM / navegación secundaria**.  
* `HomeDashboard`  
  * Orden detectado:  
    * Briefing;  
    * Atención Requerida;  
    * Carga Familiar;  
    * Eventos;  
    * Tareas;  
    * Finanzas;  
    * Presence;  
    * Actividad.  
  * Clasificación:  
    * Eventos/Tareas: **REAL MVP**.  
    * Briefing/Carga/Finanzas/Presence/Actividad: **MOCK / DEMO PREMIUM**.  
* `GlobalSearch`  
  * Búsqueda en todo el ecosistema.  
  * Indexa configuraciones.  
  * Ejecuta acciones.  
  * Clasificación: **POST\_MVP / DEMO PREMIUM si solo visual**.  
* `MultiHomeSelector`  
  * Selector global en header.  
  * Visible solo con 2+ hogares.  
  * Clasificación: **POST\_MVP** salvo que el MVP requiera multi-hogar.

### **Flujos post-login / onboarding detectados**

* `user.registered`  
  * Nuevo usuario crea cuenta en `auth.users`.  
* `user.onboarding_completed`  
  * Usuario completa onboarding creando/perfilando hogar, invitando miembros y configurando preferencias.  
* `household.created`  
  * Usuario crea su primer hogar.  
* `member.invited`  
  * Coordinador o adulto con permiso crea invitación.  
* `invitation.accepted`  
  * Invitado acepta token y se crea `household_members`.  
* `member.joined`  
  * Se crea `household_members` activo.

No se encontró un mapa visual de stacks ni pantallas exactas de auth/onboarding.

---

## **5\. Pantallas detectadas**

| Pantalla / entidad UI | Qué muestra / propósito | Acciones detectadas | Clasificación |
| ----- | ----- | ----- | ----- |
| `HomeDashboard` | Briefing, Atención Requerida, Carga Familiar, Eventos, Tareas, Finanzas, Presence, Actividad | Ver resúmenes, navegar a módulos | REAL MVP para tareas/eventos; MOCK/DEMO para widgets avanzados |
| `BottomNavigation` | Tabs principales `[Home] [People] [+] [Planner] [More]` | Cambiar sección principal | REAL MVP |
| `QuickActions` | Panel flotante desde `+`, Geni slot fijo, acciones dinámicas | Ejecutar acciones rápidas | REAL MVP para crear tarea/evento/invitar si se implementa; DEMO para resto |
| `MoreMenu` | Finance, Inventory, FamilyCloud, Settings | Abrir módulos secundarios | DEMO PREMIUM |
| `PeopleList` | Lista de miembros del hogar | Ver miembros | REAL MVP para members básico |
| `PersonProfile` | Resumen, Tareas, Eventos, Goals, Presence, Actividad, Responsabilidades | Ver perfil y actividad por miembro | DEMO PREMIUM / parcial REAL si muestra tareas/eventos |
| `PlannerDashboard` | Vista principal de Planner con Tasks, Calendar y Goals | Administrar Planner | REAL MVP para Tasks/Calendar; Goals POST\_MVP |
| `CalendarView` | Vista de calendario de eventos | Ver eventos | REAL MVP mínimo |
| `GoalsView` | Metas con hitos y progreso | Ver progreso | POST\_MVP / DEMO PREMIUM |
| `FinanceDashboard` | Vista principal de finanzas | Ver finanzas | DEMO PREMIUM |
| `InventoryDashboard` | Vista de inventario | Ver inventario | DEMO PREMIUM |
| `AssetsDashboard` | Vista de assets | Ver bienes del hogar | DEMO PREMIUM |
| `FamilyCloudDashboard` | Álbumes y recuerdos; organización por momentos | Ver fotos/documentos mock | DEMO PREMIUM |
| `FeedDashboard` | Feed del hogar en orden cronológico; vive dentro de People | Ver actividad familiar | DEMO PREMIUM / MOCK |
| `SOSPanel` | Panel SOS con swipe ↑ global y niveles 🔴🟠🟡 | Activar alerta | POST\_MVP / DEMO visual si se usa |
| `PresenceDashboard` | Estado, ubicación, check-ins, lugares y coordinación | Ver presencia | DEMO PREMIUM / MOCK |
| `GeniChat` | Chat, acciones sugeridas, insights, historial, configuración IA | Consultar Geni | DEMO PREMIUM / POST\_MVP si IA real |
| `GlobalSearch` | Búsqueda transversal e indexación de configuraciones | Buscar/ejecutar acciones | POST\_MVP |
| `MultiHomeSelector` | Selector global visible con 2+ hogares | Cambiar hogar | POST\_MVP |

---

## **6\. Componentes y patrones UI reutilizables**

### **Componentes detectados explícitamente**

* Bottom navigation.  
* Panel flotante de Quick Actions.  
* Home dashboard.  
* More menu.  
* Calendar view.  
* Planner dashboard.  
* Goals view.  
* People list.  
* Person profile.  
* Finance dashboard.  
* Inventory dashboard.  
* Assets dashboard.  
* Presence dashboard.  
* FamilyCloud dashboard.  
* Feed dashboard.  
* SOS panel.  
* Geni chat.  
* Global search.  
* Multi-home selector.  
* Briefing card.  
* Home sections/widgets.  
* In-app notification center.  
* Role/status indicators implícitos por roles y estados.  
* Priority indicators por niveles 🔴🟠🟡🟢.

### **Patrones reutilizables derivados directamente del documento**

* Cards de resumen en Home.  
* Cards de módulo en More.  
* Secciones ordenadas en Home.  
* Acciones rápidas desde botón central `+`.  
* Badges/pills de estado:  
  * pending;  
  * active;  
  * suspended;  
  * finalized;  
  * accepted;  
  * expired;  
  * cancelled;  
  * completed;  
  * verified;  
  * overdue;  
  * scheduled.  
* Badges/pills de prioridad:  
  * crítica;  
  * alta;  
  * media;  
  * baja.  
* Listas:  
  * miembros;  
  * tareas;  
  * eventos;  
  * notificaciones;  
  * actividad.  
* Cards de tarea con:  
  * title;  
  * assigned\_to;  
  * due\_date;  
  * due\_time;  
  * priority;  
  * status;  
  * responsibility\_id;  
  * verification state.  
* Cards de evento con:  
  * title;  
  * starts\_at;  
  * ends\_at;  
  * all\_day;  
  * location\_name;  
  * participants;  
  * status.  
* Secciones de Home:  
  * Briefing;  
  * Atención Requerida;  
  * Eventos;  
  * Tareas;  
  * Carga Familiar;  
  * Presence;  
  * Actividad.

### **No encontrado**

* Skeletons.  
* Toasts.  
* Bottom sheets explícitos.  
* Modales explícitos.  
* Inputs visuales.  
* Pickers visuales.  
* Avatares visuales detallados.  
* Gradientes.  
* Blur.  
* Glassmorphism.  
* Shadows.  
* Radios.  
* Spacing.  
* Tipografía.  
* Iconografía concreta fuera de emojis de prioridad/SOS.

---

## **7\. Visual design aplicable**

### **Encontrado**

* Uso de emojis/indicadores para prioridad:  
  * 🔴 crítica;  
  * 🟠 alta;  
  * 🟡 media;  
  * 🟢 baja.  
* Uso de estructura dashboard para Home.  
* Uso de panel flotante para Quick Actions.  
* Uso de bottom navigation con tab central `+`.  
* Uso de dashboard por módulo.  
* SOS usa niveles visuales 🔴🟠🟡.  
* GeniBriefing es “primer widget de Home”.  
* GeniBriefing es una card única con versión resumida/ampliada.

### **No encontrado**

* No hay colores de marca.  
* No hay gradientes.  
* No hay blur.  
* No hay glassmorphism.  
* No hay sombras.  
* No hay border radius.  
* No hay spacing.  
* No hay tipografía.  
* No hay layout mobile detallado.  
* No hay estructura premium iOS explícita.  
* No hay capturas ni pantallas visuales.  
* No hay componentes exactos para React Native.

---

## **8\. Home**

### **Rol de Home**

* Home aparece como `HomeDashboard`.  
* Home ordena el contenido así:  
  1. Briefing.  
  2. Atención Requerida.  
  3. Carga Familiar.  
  4. Eventos.  
  5. Tareas.  
  6. Finanzas.  
  7. Presence.  
  8. Actividad.  
* Home recibe eventos de múltiples módulos mediante consumidor `B` / Briefing.  
* Home resume información y debe redirigir a módulos específicos para administrar.

### **Home REAL MVP**

* Eventos próximos.  
* Tareas.  
* Tareas vencidas.  
* Tareas completadas o verificadas como señales.  
* Miembros unidos/activos si se conecta con People/Members.  
* Invitaciones pendientes si se conecta con onboarding/household.  
* Cambios de rol si corresponde.  
* Household created como contexto inicial.

### **Home MOCK / DEMO PREMIUM**

* Briefing diario de Geni.  
* Carga Familiar.  
* Finanzas.  
* Presence.  
* Actividad.  
* Feed automático.  
* Streaks.  
* Patrones de Geni.  
* Recomendaciones.  
* Métricas de carga.  
* Activity feed.

### **Información concreta para Home**

* `member.invited` puede aparecer como “Invitación pendiente” para coordinador.  
* `invitation.accepted` puede avisar al coordinador: “X aceptó la invitación”.  
* `member.joined` puede mostrar “¡X se unió al hogar\!”.  
* `member.removed` puede mostrar “X ya no es parte del hogar”.  
* `member.role_changed` puede mostrar “Ahora eres \[rol\]”.  
* `user.registered` puede disparar primer briefing de bienvenida.  
* `user.onboarding_completed` puede disparar primer briefing completo.  
* `task.created`, `task.completed`, `task.verified`, `task.overdue`, `task.reassigned` pueden alimentar Tareas/Atención Requerida/Briefing.  
* `event.created`, `event.updated`, `event.cancelled`, `event.completed`, `event.conflict_detected` pueden alimentar Eventos/Atención Requerida/Briefing.  
* `geni.briefing_ready` puede mostrar “Tu briefing del día está listo”.  
* `load_metrics` alimenta Geni Briefing → Home Carga Familiar.

### **Regla útil**

* Home resume; los módulos administran.

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner general**

* `PlannerDashboard`: vista principal con Tasks, Calendar y Goals.  
* `CalendarView`: vista de calendario de eventos.  
* `GoalsView`: vista de metas con hitos y progreso.  
* Planner se relaciona con:  
  * Members;  
  * Home;  
  * Geni;  
  * Briefing;  
  * Notifications;  
  * Streaks;  
  * Feed;  
  * Automations;  
  * Inventory;  
  * Assets;  
  * FamilyCloud.

### **Tasks — REAL MVP aplicable**

#### **Entidad y estados**

* `Task`: tareas del hogar o personales.  
* Estados detectados:  
  * pending;  
  * in\_progress;  
  * completed;  
  * cancelled.  
* `overdue` no es estado; se calcula comparando `due_date` con `current_date`.

#### **Campos detectados**

* `task_id`.  
* `household_id`.  
* `title`.  
* `description`.  
* `visibility`.  
* `priority`.  
* `due_date`.  
* `due_time`.  
* `recurrence_rule`.  
* `responsibility_id`.  
* `created_by`.  
* `assigned_to`.  
* `completed_by`.  
* `completed_at`.  
* `started_by`.  
* `started_at`.  
* `verified_by`.  
* `verified_at`.  
* `cancelled_by`.  
* `reason`.  
* `days_overdue`.  
* `hours_remaining`.  
* `deleted_at`.  
* `requires_verification`.

#### **Acciones detectadas**

* Crear tarea.  
* Asignar tarea.  
* Reasignar tarea.  
* Empezar tarea.  
* Completar tarea.  
* Verificar tarea.  
* Cancelar tarea.  
* Detectar tarea vencida.  
* Recordatorio de tarea.  
* Comentar tarea.  
* Completar subtarea.  
* Actualizar progreso.

#### **Permisos detectados**

* Coordinador, Adulto y Senior pueden crear tareas del hogar.  
* Adolescente puede crear tareas propias.  
* Asignado, adulto o coordinador pueden completar tarea.  
* Coordinador o adulto pueden verificar tarea completada.  
* Creador o coordinador pueden cancelar tarea.

#### **Información para UI de tarea**

* Card/list item puede mostrar:  
  * título;  
  * descripción;  
  * responsable;  
  * prioridad;  
  * fecha límite;  
  * hora límite;  
  * visibilidad;  
  * responsabilidad;  
  * estado;  
  * vencimiento;  
  * verificación.  
* Feedback textual encontrado:  
  * “Nueva tarea: \[title\]”.  
  * “Te asignaron: \[title\]”.  
  * “\[Display\_name\] empezó \[title\]”.  
  * “¡\[Verificador\] confirmó tu tarea\!”.  
* Tareas vencidas:  
  * prioridad media el primer día;  
  * prioridad alta si `days_overdue > 1`.  
* Tareas vencidas alimentan:  
  * notificación;  
  * briefing;  
  * patrón de escalamiento de Geni;  
  * automatizaciones.

#### **Verification Flow**

* `TaskVerification` existe.  
* Verificación opcional de completitud.  
* Campos:  
  * `requires_verification`;  
  * `verified_by`;  
  * `verified_at`.  
* El documento no define `awaiting_verification` como estado formal.  
* Para UI puede representarse como estado derivado, pero no se debe afirmar como estado del documento.

#### **Responsabilidades**

* `Responsibility`: áreas operativas del hogar.  
* Ejemplos:  
  * Compras;  
  * Limpieza;  
  * Mascotas.  
* Regla:  
  * una tarea siempre tiene una única responsabilidad asociada.  
* Las responsabilidades no son dominio independiente; son propiedad de la tarea.

#### **POST\_MVP en Tasks**

* Comentarios.  
* Adjuntos.  
* TaskTemplate como tabla.  
* Dependencias bloqueantes.  
* Subtareas si exceden el MVP simple.  
* TaskTimeline.  
* Streaks.  
* RecurrenceRule/RRULE.  
* Escalamiento Geni real.  
* Automatizaciones.  
* Auditoría completa.  
* Feed automático.  
* Offline sync real.

### **Events / Calendar — REAL MVP aplicable**

#### **Entidad y estados**

* `Event`: eventos del hogar o personales.  
* Estados detectados:  
  * scheduled;  
  * completed;  
  * cancelled.  
* No hay `in_progress` ni `deleted` como estado de evento.

#### **Campos detectados**

* `event_id`.  
* `household_id`.  
* `title`.  
* `description`.  
* `visibility`.  
* `all_day`.  
* `starts_at`.  
* `ends_at`.  
* `location_name`.  
* `recurrence_rule`.  
* `created_by`.  
* `participants`.  
* `updated_by`.  
* `changed_fields`.  
* `cancelled_by`.  
* `reason`.  
* `was_recurring`.  
* `completed_at`.  
* `minutes_until`.  
* `overlap_minutes`.

#### **Acciones detectadas**

* Crear evento.  
* Editar evento.  
* Cancelar evento.  
* Completar evento.  
* Detectar conflicto.  
* Recordatorio de evento.  
* Agregar participante.  
* Remover participante.

#### **Permisos detectados**

* Adultos, Coordinador, Senior y Adolescente pueden crear eventos familiares.  
* Creador o coordinador pueden modificar evento.  
* Creador o coordinador pueden cancelar evento.

#### **Información para UI de evento**

* Card/list item puede mostrar:  
  * título;  
  * descripción;  
  * fecha/hora inicio;  
  * fecha/hora fin;  
  * all day;  
  * ubicación;  
  * participantes;  
  * estado;  
  * visibilidad;  
  * recurrencia.  
* Feedback textual encontrado:  
  * “\[title\] terminó”.  
  * “Tienes dos eventos solapados”.  
  * “Te invitaron a \[event\_title\]”.  
* Cambios de fecha/hora/ubicación notifican a participantes.  
* Cambio de fecha con menos de 24h tiene prioridad alta.  
* Evento cancelado con ≤2h tiene prioridad alta.  
* Recordatorios mencionados:  
  * 30min;  
  * 1h;  
  * 1d.

#### **Calendar**

* `CalendarView` existe como vista de calendario de eventos.  
* No se encontró definición de vistas día/semana/mes.  
* No se encontró definición explícita de tareas con fecha dentro del calendario.  
* No se encontró agenda visual.

#### **POST\_MVP en Calendar/Events**

* Participantes avanzados con respuesta.  
* Detección real de conflictos por Geni.  
* Recurrencia compleja con RRULE.  
* Email/push real.  
* Automatizaciones reales.  
* Auditoría completa.  
* Feed automático.  
* Streaks.  
* FamilyCloud conectado a eventos.  
* MediaItem generado por eventos.

### **Goals**

* `Goal`: metas personales o familiares.  
* Estados:  
  * active;  
  * completed;  
  * failed.  
* `GoalsView`: metas con hitos y progreso.  
* `Milestone`: hitos de una meta.  
* `Task` puede avanzar Goal.  
* `Goal` rastrea progreso vía Task.  
* Clasificación: **POST\_MVP / DEMO PREMIUM** para frontend actual.

---

## **10\. People / Members / Roles**

### **Pantallas detectadas**

* `PeopleList`  
  * Lista de miembros del hogar.  
  * Clasificación: **REAL MVP** si se usa para members básico.  
* `PersonProfile`  
  * Perfil individual con:  
    * Resumen;  
    * Tareas;  
    * Eventos;  
    * Goals;  
    * Presence;  
    * Actividad;  
    * Responsabilidades.  
  * Clasificación: **DEMO PREMIUM / parcial REAL** si muestra tareas/eventos reales.

### **Entidades detectadas**

* `HouseholdMember`.  
* `Membership`.  
* `FamilyRelationship`.  
* `UserAccount`.  
* `Role`.  
* `PersonProfile`.  
* `PeopleList`.

### **Estados de membership**

* pending.  
* active.  
* suspended.  
* finalized.

### **Roles detectados**

* CoordinatorRole.  
* AdultRole.  
* TeenRole.  
* ChildRole.  
* SeniorRole.  
* GuestRole.  
* FamilyEmployeeRole.

### **Mapeo útil para MVP**

* TeenRole equivale conceptualmente a adolescente, pero el documento usa `TeenRole`, no `AdolescentRole`.  
* FamilyEmployeeRole aparece fuera de roles MVP básicos y debe tratarse como fuera de MVP salvo que se use demo.

### **Permisos/acciones por rol detectadas**

* CoordinatorRole:  
  * aprueba ingresos;  
  * cambia roles;  
  * expulsa miembros;  
  * gestiona household;  
  * no puede eliminar hogares.  
* AdultRole:  
  * invita;  
  * crea/reasigna tareas;  
  * crea eventos;  
  * no aprueba ingresos.  
* TeenRole:  
  * autonomía progresiva;  
  * crea eventos familiares;  
  * registra gastos;  
  * administra tareas propias.  
* ChildRole:  
  * experiencia simplificada;  
  * no administra información crítica;  
  * sin ubicación;  
  * sin SOS rojo.  
* SeniorRole:  
  * experiencia adaptada;  
  * mismos permisos que Adulto salvo configuraciones específicas.  
* GuestRole:  
  * acceso mínimo;  
  * participación limitada.  
* FamilyEmployeeRole:  
  * colaborador operativo;  
  * acceso restringido a responsabilidades asignadas;  
  * no crea tareas;  
  * sin SOS rojo.

### **Relación con Planner**

* Members pueden crear tareas.  
* Members pueden estar asignados a tareas.  
* Members completan tareas.  
* Members verifican tareas.  
* Members crean eventos.  
* Members participan en eventos.  
* Responsibilities pueden asignarse a miembros.  
* PersonProfile puede mostrar tareas, eventos y responsabilidades.

### **Relación con Home**

* member.joined puede mostrarse en Home/actividad.  
* member.removed puede mostrarse en Home/actividad.  
* member.role\_changed puede mostrarse como evento o notificación.  
* Invitaciones pendientes pueden alimentar briefing/atención requerida.

---

## **11\. Household / Invitations / Onboarding**

### **Household**

* `Household`: unidad máxima de aislamiento de datos.  
* `household.created`:  
  * Trigger: usuario crea primer hogar.  
  * Payload:  
    * `household_id`;  
    * `name`;  
    * `slug`;  
    * `timezone`;  
    * `default_language`;  
    * `created_by`.  
  * Clasificación: **REAL MVP**.  
* `household.settings_changed`:  
  * Trigger: coordinador modifica config del hogar.  
  * Payload:  
    * `household_id`;  
    * `changed_by`;  
    * `old_config`;  
    * `new_config`;  
    * `changed_keys`.  
  * Clasificación: **POST\_MVP / parcial REAL si settings básicos**.

### **Invitations**

* `Invitation`: invitaciones pendientes a un hogar.  
* `member.invited`:  
  * Coordinador o adulto con permiso crea invitación.  
  * Payload:  
    * `household_id`;  
    * `invitation_id`;  
    * `invited_by`;  
    * `email`;  
    * `phone`;  
    * `suggested_role`;  
    * `message`;  
    * `token`;  
    * `expires_at`.  
  * Feedback:  
    * invitado por email/SMS;  
    * coordinador ve “Invitación pendiente”.  
  * Clasificación: **REAL MVP** para invitar; email/SMS real puede ser POST\_MVP.  
* `invitation.accepted`:  
  * Invitado acepta token.  
  * `invitations.status = 'accepted'`.  
  * Se crea `household_members`.  
  * Payload:  
    * `invitation_id`;  
    * `household_id`;  
    * `member_id`;  
    * `user_id`;  
    * `display_name`;  
    * `role`;  
    * `accepted_at`.  
  * Feedback:  
    * coordinador ve “X aceptó la invitación”.  
  * Clasificación: **REAL MVP**.  
* `invitation.expired`:  
  * CRON: `expires_at < now()` con `status = 'pending'` → `expired`.  
  * Feedback:  
    * “Invitación a \[email\] expiró”.  
  * Clasificación: **REAL MVP si hay expiración; si no, estado visual futuro**.  
* `invitation.cancelled`:  
  * Coordinador cancela invitación.  
  * Estado `cancelled`.  
  * Clasificación: **REAL MVP opcional / POST\_MVP si no se implementa cancelación**.

### **Members**

* `member.joined`:  
  * Se crea household\_members con `status = 'active'`.  
  * Feedback:  
    * “¡X se unió al hogar\!”.  
  * Clasificación: **REAL MVP**.  
* `member.removed`:  
  * Coordinador hace soft-delete: `status = 'finalized'`, `left_at = now()`.  
  * Feedback:  
    * “X ya no es parte del hogar”.  
  * Clasificación: **POST\_MVP** si no hay expulsión en MVP.  
* `member.role_changed`:  
  * Coordinador cambia role.  
  * Feedback:  
    * “Ahora eres \[rol\]”.  
  * Clasificación: **POST\_MVP / parcial REAL si roles visibles**.

### **Onboarding**

* `user.registered`:  
  * Nuevo usuario crea cuenta en Supabase Auth.  
  * Payload:  
    * `user_id`;  
    * `email`;  
    * `phone`;  
    * `registered_at`.  
  * Clasificación: **REAL MVP**.  
* `user.onboarding_completed`:  
  * Usuario completa crear/perfilar hogar, invitar miembros y configurar preferencias.  
  * Payload:  
    * `user_id`;  
    * `member_id`;  
    * `household_id`;  
    * `steps_completed`;  
    * `completed_at`.  
  * Clasificación: **REAL MVP para flujo; Geni/briefing como MOCK/POST\_MVP**.

### **UI faltante**

* No se encontró diseño de formularios de login/register.  
* No se encontró pantalla de crear hogar.  
* No se encontró pantalla de invitar miembro.  
* No se encontró pantalla de aceptar invitación.  
* No se encontró UI de pending approval.  
* No se encontró UI de aprobar/rechazar.  
* No se encontró copy de botones.

---

## **12\. More / Settings / Profile**

### **More**

* `MoreMenu` incluye:  
  * Finance;  
  * Inventory;  
  * FamilyCloud;  
  * Settings.  
* Clasificación:  
  * More visual: **DEMO PREMIUM**.  
  * Settings: **parcial REAL** si contiene perfil/logout/hogar básico; no está detallado.

### **Settings**

* No se encontró estructura detallada de Settings.  
* Sí aparece `household.settings_changed`.  
* Config puede incluir:  
  * timezone;  
  * idioma;  
  * umbrales Geni;  
  * otros keys en `config`.  
* Clasificación:  
  * timezone/idioma básicos: **REAL MVP opcional**.  
  * umbrales Geni: **POST\_MVP**.

### **Profile**

* `PersonProfile` muestra:  
  * Resumen;  
  * Tareas;  
  * Eventos;  
  * Goals;  
  * Presence;  
  * Actividad;  
  * Responsabilidades.  
* Clasificación:  
  * Resumen/Tareas/Eventos/Responsabilidades: **REAL MVP / DEMO según implementación**.  
  * Goals/Presence/Actividad: **DEMO PREMIUM / POST\_MVP**.

---

## **13\. Quick Actions**

### **Información encontrada**

* `QuickActions`:  
  * panel flotante desde `+`;  
  * Geni slot fijo primero;  
  * acciones dinámicas por frecuencia.  
* `GeniQuickActions`:  
  * slot fijo de Geni en Quick Actions;  
  * punto de entrada principal a Geni.

### **Acciones directamente respaldadas por eventos**

| Acción rápida potencial | Base en documento | Clasificación |
| ----- | ----- | ----- |
| Crear tarea | `task.created` | REAL MVP |
| Crear evento | `event.created` | REAL MVP |
| Invitar miembro | `member.invited` | REAL MVP |
| Completar tarea | `task.completed` | REAL MVP si se ofrece desde card; no necesariamente Quick Action |
| Verificar tarea | `task.verified` | REAL MVP si hay verification flow |
| Agregar gasto | `expense.created` | DEMO PREMIUM / POST\_MVP real |
| Agregar item / lista compras | Inventory/ShoppingList existe | DEMO PREMIUM |
| Preguntar a Geni | `GeniChat`, `GeniQuickActions` | DEMO PREMIUM / POST\_MVP IA real |
| Check-in | `CheckIn` existe | DEMO PREMIUM / POST\_MVP real |
| SOS | `SOSPanel` existe | POST\_MVP / demo visual con cuidado |
| Crear recuerdo / subir documento | FamilyCloud existe | DEMO PREMIUM |

### **No encontrado**

* No se define si Quick Actions abre modal, bottom sheet o pantalla.  
* No se listan acciones concretas del panel.  
* No se definen estados visuales del menú.  
* No se define orden de acciones salvo Geni primero.

---

## **14\. Módulos demo premium**

### **Finance**

* Entidades:  
  * Account;  
  * Expense;  
  * ExpenseSplit;  
  * Income;  
  * Budget;  
  * Fund;  
  * Debt;  
  * FinanceDashboard;  
  * ExpenseReceipt.  
* Datos visuales posibles desde el documento:  
  * cuentas: bank, cash, digital, credit, savings, investment;  
  * gastos: pending, paid, annulled;  
  * budgets con alerta default 85%;  
  * fondos: active, completed, closed;  
  * deudas: active, paid, overdue;  
  * comprobantes: foto, PDF, imagen.  
* Clasificación:  
  * **DEMO PREMIUM** para dashboard visual.  
  * **POST\_MVP** para backend financiero completo.

### **Inventory**

* Entidades:  
  * InventoryCategory;  
  * InventoryItem;  
  * ShoppingList;  
  * ExpiryRecord;  
  * Medication;  
  * InventoryDashboard.  
* Datos visuales posibles:  
  * items active/archived;  
  * stock bajo/agotado calculado;  
  * lista de compras;  
  * vencimientos;  
  * medicamentos.  
* Conexión con Planner:  
  * ShoppingList puede generar Task.  
  * ExpiryRecord puede disparar Task como conexión implícita.  
* Clasificación:  
  * **DEMO PREMIUM**.  
  * Integración real Inventory→Planner: **POST\_MVP**.

### **Assets**

* Entidades:  
  * Asset;  
  * AssetDocument;  
  * AssetMaintenance;  
  * Pet;  
  * Vehicle;  
  * Property;  
  * Device;  
  * AssetsDashboard.  
* Datos visuales posibles:  
  * assets active/inactive/archived;  
  * mascotas active/deceased/archived;  
  * mantenimientos;  
  * documentos;  
  * vehículos;  
  * propiedades;  
  * dispositivos.  
* Conexión con Planner:  
  * AssetMaintenance genera Task.  
* Clasificación:  
  * **DEMO PREMIUM**.  
  * Integración real mantenimiento→tasks: **POST\_MVP**.

### **FamilyCloud / HomeCloud**

* Entidades:  
  * MediaItem;  
  * Album;  
  * AlbumItem;  
  * Document;  
  * DocumentVersion;  
  * DocumentComment;  
  * DocumentAccess;  
  * FamilyCloudDashboard;  
  * FamilyRecap;  
  * FamilyTimeline.  
* Visual:  
  * álbumes;  
  * recuerdos;  
  * documentos;  
  * organización por momentos, no carpetas.  
* Conexión con Calendar:  
  * MediaItem links\_to Event;  
  * Event generates MediaItem.  
* Clasificación:  
  * **DEMO PREMIUM**.  
  * Storage real/OCR/document access avanzado: **POST\_MVP**.

### **Presence**

* Entidades:  
  * Location;  
  * LocationSettings;  
  * LocationHistory;  
  * LocationAlert;  
  * CheckIn;  
  * Place;  
  * Geofence;  
  * PresenceState;  
  * VisibilityLevel;  
  * PresenceDashboard.  
* Visual:  
  * estado;  
  * ubicación;  
  * check-ins;  
  * lugares;  
  * coordinación.  
* Estados:  
  * En casa;  
  * En trabajo;  
  * No molestar.  
* Regla:  
  * Manual \> Automático.  
* Visibilidad:  
  * Level 3 para Coordinador/Adulto/Senior;  
  * Level 2 para Teen/Child/Guest.  
* Clasificación:  
  * **DEMO PREMIUM / MOCK**.  
  * GPS real/geofencing/location history: **POST\_MVP**.

### **Geni**

* Entidades/features:  
  * GeniMemoryPersonal;  
  * GeniMemoryFamily;  
  * GeniConversation;  
  * GeniPatternsLog;  
  * GeniBriefing;  
  * GeniSearch;  
  * GeniChat;  
  * GeniQuickActions.  
* Visual:  
  * briefing diario;  
  * chat;  
  * acciones sugeridas;  
  * insights;  
  * historial;  
  * configuración IA.  
* Home:  
  * Briefing diario como primer widget de Home;  
  * card única con versión resumida/ampliada.  
* Clasificación:  
  * **DEMO PREMIUM / MOCK** para UI.  
  * IA real: **POST\_MVP**.

### **Feed**

* Entidades:  
  * Post;  
  * PostReaction;  
  * PostComment;  
  * FeedDashboard.  
* Visual:  
  * feed del hogar;  
  * orden cronológico;  
  * vive dentro de People.  
* Clasificación:  
  * **DEMO PREMIUM / MOCK**.  
  * Feed real completo: **POST\_MVP**.

### **SOS**

* Entidades:  
  * SOSAlert;  
  * SOSRecipient;  
  * SOSPanel;  
  * SOSOffline.  
* Visual:  
  * panel SOS;  
  * swipe ↑ global;  
  * niveles 🔴🟠🟡.  
* Restricción:  
  * Niños/Empleados no pueden usar SOS rojo.  
* Clasificación:  
  * **POST\_MVP / demo visual no crítica**.  
  * Emergencia real: no implementar como mock peligroso sin definición.

### **Automations**

* Entidades:  
  * Automation;  
  * AutomationLog;  
  * AutomationLibrary.  
* Visual:  
  * biblioteca de automatizaciones prearmadas;  
  * personalizables.  
* Estados:  
  * active;  
  * paused;  
  * archived.  
* Clasificación:  
  * **DEMO PREMIUM** para biblioteca visual.  
  * Motor real: **POST\_MVP**.

### **Goals**

* Entidades:  
  * Goal;  
  * Milestone;  
  * GoalsView.  
* Visual:  
  * metas;  
  * hitos;  
  * progreso.  
* Estados:  
  * active;  
  * completed;  
  * failed.  
* Clasificación:  
  * **DEMO PREMIUM / POST\_MVP**.

### **Notifications**

* Entidades:  
  * NotificationPreference;  
  * Notification;  
  * NotificationChannel.  
* Visual:  
  * centro de notificaciones in-app.  
* Reglas:  
  * in-app 30 días rolling;  
  * push no se almacena;  
  * SOS siempre true.  
* Clasificación:  
  * **DEMO PREMIUM / parcial REAL si notificaciones in-app simples**.  
  * Push/email/SMS real: **POST\_MVP**.

### **Search**

* `GlobalSearch`:  
  * búsqueda en todo el ecosistema;  
  * indexa configuraciones;  
  * ejecuta acciones.  
* Clasificación:  
  * **POST\_MVP / DEMO PREMIUM si visual**.

### **Activity**

* Home incluye Actividad.  
* Feed y eventos del sistema pueden alimentar actividad.  
* Clasificación:  
  * **MOCK / DEMO PREMIUM**.

### **Load / Carga familiar**

* `LoadMetric`:  
  * métricas de carga por miembro;  
  * 90 días detalle;  
  * agregados permanentes.  
* Flujo detectado:  
  * `load_metrics table` → Geni Briefing → Home Carga Familiar.  
* Clasificación:  
  * **MOCK / DEMO PREMIUM** para Home.  
  * Métricas reales: **POST\_MVP**.

---

## **15\. Estados UX y feedback**

### **Estados de prioridad**

| Prioridad | Significado | Uso UI |
| ----- | ----- | ----- |
| 🔴 CR | Crítica, no silenciable, ignora quiet hours | Alertas críticas / SOS / system crítico |
| 🟠 AL | Alta, ignora quiet hours, respeta opt-in | Tareas muy vencidas, cambios urgentes, budget excedido |
| 🟡 ME | Media, respeta quiet hours | Invitaciones, tareas, eventos, recordatorios |
| 🟢 BA | Baja, solo in-app | Confirmaciones, cambios leves, progreso |

### **Estados offline / sync como referencia**

| Código | Significado | Uso UI posible |
| ----- | ----- | ----- |
| Q | Encolar | Pendiente de sincronizar |
| L | Local-first | Acción local inmediata |
| D | Descartar | Acción no disponible offline |
| S | Solo online | Bloquear si no hay conexión |

Para MVP actual, offline real debe tratarse como POST\_MVP salvo que ya exista implementación.

### **Estados detectados por dominio**

#### **Membership**

* pending.  
* active.  
* suspended.  
* finalized.

#### **Invitation**

* pending.  
* accepted.  
* expired.  
* cancelled.

#### **Task**

* pending.  
* in\_progress.  
* completed.  
* cancelled.  
* overdue como cálculo, no estado.

#### **Task verification**

* requires\_verification.  
* verified\_by.  
* verified\_at.  
* Verificada como condición derivada.

#### **Event**

* scheduled.  
* completed.  
* cancelled.  
* conflict\_detected como evento, no estado base.

#### **Finance**

* Expense: pending, paid, annulled.  
* Fund: active, completed, closed.  
* Debt: active, paid, overdue.

#### **Inventory**

* InventoryItem: active, archived.  
* Bajo/agotado calculado.

#### **Assets**

* Asset: active, inactive, archived.  
* Pet: active, deceased, archived.

#### **SOS**

* SOSAlert: active, cancelled, closed.  
* Niveles: red, orange, yellow.

#### **Automations**

* active.  
* paused.  
* archived.

#### **Goals**

* active.  
* completed.  
* failed.

### **Feedback textual detectado**

* “Invitación pendiente”.  
* “X aceptó la invitación”.  
* “Invitación a \[email\] expiró”.  
* “¡X se unió al hogar\!”.  
* “X ya no es parte del hogar”.  
* “Ahora eres \[rol\]”.  
* “Nueva tarea: \[title\]”.  
* “Te asignaron: \[title\]”.  
* “\[Display\_name\] empezó \[title\]”.  
* “¡\[Verificador\] confirmó tu tarea\!”.  
* “Mañana aviso al coordinador”.  
* “Hay 3 tareas sin dueño activo. Como familia, ¿quieren redistribuirlas?”.  
* “\[title\] terminó”.  
* “Tienes dos eventos solapados”.  
* “Te invitaron a \[event\_title\]”.  
* “Tu briefing del día está listo”.

### **No encontrado**

* Loading state.  
* Skeleton.  
* Empty state.  
* Error state visual.  
* Retry state.  
* Toast exacto.  
* Disabled state.  
* Forbidden visual.  
* Form validation messages.

---

## **16\. Formularios y datos de entrada**

### **Register**

* Datos:  
  * `user_id`;  
  * `email`;  
  * `phone`;  
  * `registered_at`.  
* No se encontró UI ni formulario exacto.  
* Clasificación: **REAL MVP**.

### **Onboarding completed**

* Datos:  
  * `user_id`;  
  * `member_id`;  
  * `household_id`;  
  * `steps_completed`;  
  * `completed_at`.  
* Pasos conceptuales:  
  * crear/perfilar hogar;  
  * invitar miembros;  
  * configurar preferencias.  
* No se encontró UI exacta.  
* Clasificación: **REAL MVP**.

### **Create household**

* Datos:  
  * `household_id`;  
  * `name`;  
  * `slug`;  
  * `timezone`;  
  * `default_language`;  
  * `created_by`.  
* No se encontró formulario exacto.  
* Clasificación: **REAL MVP**.

### **Invite member**

* Datos:  
  * `household_id`;  
  * `invitation_id`;  
  * `invited_by`;  
  * `email`;  
  * `phone`;  
  * `suggested_role`;  
  * `message`;  
  * `token`;  
  * `expires_at`.  
* No se encontró formulario exacto.  
* Clasificación: **REAL MVP**.

### **Create task**

* Datos:  
  * `task_id`;  
  * `household_id`;  
  * `title`;  
  * `description`;  
  * `visibility`;  
  * `priority`;  
  * `due_date`;  
  * `due_time`;  
  * `recurrence_rule`;  
  * `responsibility_id`;  
  * `created_by`;  
  * `assigned_to`.  
* No se encontró formulario exacto.  
* Clasificación: **REAL MVP**.

### **Edit/assign task**

* Datos:  
  * `old_assignee`;  
  * `new_assignee`;  
  * `assigned_by`.  
* No se encontró formulario exacto.  
* Clasificación: **REAL MVP parcial**.

### **Complete task**

* Datos:  
  * `completed_by`;  
  * `completed_at`;  
  * `was_overdue`.  
* No se encontró UI exacta.  
* Clasificación: **REAL MVP**.

### **Verify task**

* Datos:  
  * `completed_by`;  
  * `verified_by`;  
  * `verified_at`.  
* No se encontró UI exacta.  
* Clasificación: **REAL MVP si verification flow entra en alcance**.

### **Create event**

* Datos:  
  * `event_id`;  
  * `household_id`;  
  * `title`;  
  * `description`;  
  * `visibility`;  
  * `all_day`;  
  * `starts_at`;  
  * `ends_at`;  
  * `location_name`;  
  * `recurrence_rule`;  
  * `created_by`;  
  * `participants`.  
* No se encontró formulario exacto.  
* Clasificación: **REAL MVP**.

### **Edit event**

* Datos:  
  * `updated_by`;  
  * `changed_fields`;  
  * `old_starts_at`;  
  * `new_starts_at`;  
  * `old_ends_at`;  
  * `new_ends_at`.  
* No se encontró formulario exacto.  
* Clasificación: **REAL MVP parcial**.

### **Cancel event**

* Datos:  
  * `cancelled_by`;  
  * `reason`;  
  * `was_recurring`.  
* No se encontró formulario exacto.  
* Clasificación: **REAL MVP parcial / POST\_MVP según alcance**.

### **Settings**

* Datos:  
  * `old_config`;  
  * `new_config`;  
  * `changed_keys`.  
* Campos mencionados:  
  * timezone;  
  * idioma;  
  * umbrales Geni.  
* Clasificación:  
  * timezone/idioma: **REAL MVP opcional**.  
  * umbrales Geni: **POST\_MVP**.

---

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Uso posible | Clasificación |
| ----- | ----- | ----- |
| Compras | Responsabilidad/categoría de tareas | REAL MVP / DEMO |
| Limpieza | Responsabilidad/categoría de tareas | REAL MVP / DEMO |
| Mascotas | Responsabilidad/categoría de tareas | REAL MVP / DEMO |
| En casa | Estado de Presence | MOCK / DEMO PREMIUM |
| En trabajo | Estado de Presence | MOCK / DEMO PREMIUM |
| No molestar | Estado manual de Presence | MOCK / DEMO PREMIUM |
| bank | Tipo de cuenta Finance | DEMO PREMIUM |
| cash | Tipo de cuenta Finance | DEMO PREMIUM |
| digital | Tipo de cuenta Finance | DEMO PREMIUM |
| credit | Tipo de cuenta Finance | DEMO PREMIUM |
| savings | Tipo de cuenta Finance | DEMO PREMIUM |
| investment | Tipo de cuenta Finance | DEMO PREMIUM |
| active | Estado reusable | REAL / DEMO según módulo |
| pending | Estado reusable | REAL MVP |
| completed | Estado reusable | REAL MVP |
| cancelled | Estado reusable | REAL MVP / POST\_MVP según módulo |
| finalized | Estado membership | REAL MVP si se muestra salida |
| suspended | Estado membership | POST\_MVP |
| expired | Estado invitación | REAL MVP si hay expiración |
| paid | Estado finanzas | DEMO PREMIUM |
| annulled | Estado gasto | DEMO PREMIUM |
| overdue | Estado deuda / cálculo task | REAL para tasks vencidas; DEMO finance |
| red / orange / yellow | Niveles SOS | POST\_MVP / demo visual |
| “Invitación pendiente” | Copy Home/briefing/invitaciones | REAL MVP |
| “X aceptó la invitación” | Copy feedback invitación | REAL MVP |
| “¡X se unió al hogar\!” | Copy member joined | REAL MVP |
| “Nueva tarea: \[title\]” | Copy task created | REAL MVP |
| “Te asignaron: \[title\]” | Copy task assigned | REAL MVP |
| “¡\[Verificador\] confirmó tu tarea\!” | Copy task verified | REAL MVP |
| “Tienes dos eventos solapados” | Copy conflict | POST\_MVP / DEMO |
| “Tu briefing del día está listo” | Copy briefing | MOCK / DEMO |

### **Datos demo faltantes**

* No hay nombres concretos de miembros.  
* No hay títulos reales de tareas.  
* No hay títulos reales de eventos.  
* No hay gastos concretos.  
* No hay productos concretos de inventario.  
* No hay mascotas con nombre.  
* No hay vehículos concretos.  
* No hay documentos concretos.  
* No hay lugares concretos.  
* No hay frases largas de empty states.

---

## **18\. Servicios frontend / APIs / datos**

### **Contratos HTTP**

No se encontró contrato API HTTP explícito en este documento.

### **Acciones de service deducibles por evento, sin inventar endpoint**

| Acción | Datos principales | Clasificación |
| ----- | ----- | ----- |
| Registrar usuario | user\_id, email, phone | REAL MVP |
| Completar onboarding | user\_id, member\_id, household\_id, steps\_completed | REAL MVP |
| Crear hogar | household\_id, name, slug, timezone, default\_language | REAL MVP |
| Cambiar settings hogar | old\_config, new\_config, changed\_keys | POST\_MVP / parcial |
| Crear invitación | email, phone, suggested\_role, token, expires\_at | REAL MVP |
| Aceptar invitación | invitation\_id, member\_id, user\_id, role | REAL MVP |
| Crear tarea | title, description, priority, due\_date, assigned\_to | REAL MVP |
| Asignar/reasignar tarea | old\_assignee, new\_assignee | REAL MVP parcial |
| Completar tarea | completed\_by, completed\_at | REAL MVP |
| Verificar tarea | verified\_by, verified\_at | REAL MVP |
| Cancelar tarea | cancelled\_by, reason | REAL MVP parcial |
| Crear evento | title, starts\_at, ends\_at, participants | REAL MVP |
| Actualizar evento | changed\_fields | REAL MVP parcial |
| Cancelar evento | cancelled\_by, reason | REAL MVP parcial |
| Agregar/remover participante | member\_id | POST\_MVP / parcial |
| Generar briefing | sections, highlights\_count | MOCK / POST\_MVP real |
| Generar recomendación Geni | title, description, action\_suggestion | DEMO / POST\_MVP |

### **Fuentes de datos detectadas**

* Supabase Auth para `auth.users`.  
* Tablas:  
  * households;  
  * household\_members;  
  * invitations;  
  * tasks;  
  * events;  
  * responsibilities;  
  * notifications;  
  * load\_metrics;  
  * automation\_logs;  
  * audit\_logs.  
* No se encontró estructura de frontend services.

---

## **19\. Realtime / sincronización visible**

### **Eventos que deberían actualizar UI si se implementa realtime**

#### **Auth / Household / Members**

* `user.registered`  
  * Puede afectar onboarding.  
* `user.onboarding_completed`  
  * Puede llevar a Home.  
* `household.created`  
  * Puede inicializar contexto de hogar.  
* `household.settings_changed`  
  * Puede refrescar settings visibles.  
* `member.invited`  
  * Puede actualizar invitaciones pendientes.  
* `invitation.accepted`  
  * Puede actualizar miembros y Home.  
* `invitation.expired`  
  * Puede actualizar estado de invitación.  
* `invitation.cancelled`  
  * Puede actualizar lista de invitaciones.  
* `member.joined`  
  * Puede actualizar PeopleList y Home.  
* `member.removed`  
  * Puede actualizar PeopleList.  
* `member.role_changed`  
  * Puede actualizar role pill/permisos.

#### **Planner**

* `task.created`  
  * Actualiza Planner Tasks, Home Tareas, Assigned task UI.  
* `task.assigned`  
  * Actualiza responsable en task card.  
* `task.started`  
  * Actualiza estado visual.  
* `task.completed`  
  * Actualiza task card, Home Tareas, carga.  
* `task.verified`  
  * Actualiza estado de verificación.  
* `task.cancelled`  
  * Actualiza estado/oculta tarea según UI.  
* `task.overdue`  
  * Actualiza Atención Requerida.  
* `task.reminder_due`  
  * Genera aviso.  
* `event.created`  
  * Actualiza Calendar y Home Eventos.  
* `event.updated`  
  * Actualiza Calendar y participantes.  
* `event.cancelled`  
  * Actualiza estado del evento.  
* `event.completed`  
  * Actualiza historial/resumen.  
* `event.conflict_detected`  
  * Actualiza alertas/conflictos.  
* `event.reminder_due`  
  * Genera aviso.

#### **Demo / POST\_MVP**

* `geni.briefing_ready`  
  * Actualiza Briefing Home.  
* `geni.recommendation_generated`  
  * Actualiza sugerencias.  
* `inventory.stock_low`  
  * Podría actualizar Inventory y Home mock.  
* `asset.maintenance_due`  
  * Podría actualizar Assets y tareas futuras.  
* `system.sync_conflict`  
  * Podría mostrar conflicto de sync.  
* `system.error`  
  * Podría mostrar error recuperable.

### **Offline**

* Q: encolable.  
* L: local-first.  
* D: descartar.  
* S: solo online.

Para MVP premium visual puede mostrarse estado pendiente/local, pero offline sync real es POST\_MVP.

---

## **20\. Permisos visibles en UI**

| Rol | Puede hacer según documento | No puede hacer / límites | Impacto UI |
| ----- | ----- | ----- | ----- |
| Coordinator | Aprueba ingresos, cambia roles, expulsa miembros, gestiona hogar, crea tareas/eventos, verifica tareas | No puede eliminar hogares | Mostrar botones de aprobar/cambiar rol/expulsar/verificar |
| Adult | Invita, crea/reasigna tareas, crea eventos | No aprueba ingresos | Mostrar invitar, crear/reasignar tarea, crear evento; ocultar aprobar ingresos si aplica |
| Teen | Crea eventos familiares, registra gastos, administra tareas propias | Autonomía progresiva | Mostrar acciones limitadas; tareas propias |
| Child | Experiencia simplificada | No administra info crítica, sin ubicación, sin SOS rojo | Ocultar settings críticos, ubicación, SOS rojo |
| Senior | Mismos permisos que Adulto salvo configuraciones específicas | Experiencia adaptada | UI adaptada; permisos tipo adulto |
| Guest | Acceso mínimo, participación limitada | No se detallan acciones | UI reducida |
| FamilyEmployee | Acceso restringido a responsabilidades asignadas, no crea tareas, sin SOS rojo | No crea tareas | Ocultar crear tarea; mostrar solo responsabilidades asignadas |

### **Permisos específicos Planner**

* Coordinador/Adulto/Senior:  
  * crear tareas del hogar;  
  * crear eventos.  
* Adolescente/Teen:  
  * crear eventos familiares;  
  * administrar tareas propias.  
* Asignado/Adulto/Coordinador:  
  * completar tarea.  
* Coordinador/Adulto:  
  * verificar tarea completada.  
* Creador/Coordinador:  
  * cancelar tarea;  
  * modificar evento;  
  * cancelar evento.

No se encontraron permisos visuales exhaustivos para cada pantalla.

---

## **21\. Integraciones visibles entre módulos**

| Relación | Descripción | Clasificación |
| ----- | ----- | ----- |
| Home → Planner Tasks | Home muestra tareas y redirige a Planner | REAL MVP |
| Home → Calendar Events | Home muestra eventos y redirige a Calendar/Planner | REAL MVP |
| Home → Briefing | Briefing diario primer widget | MOCK / DEMO PREMIUM |
| Home → Carga Familiar | LoadMetric alimenta Geni Briefing → Home Carga Familiar | MOCK / POST\_MVP real |
| Home → Presence | Home incluye Presence | MOCK / DEMO PREMIUM |
| Home → Actividad | Home incluye Actividad | MOCK / DEMO PREMIUM |
| QuickActions → Geni | Slot fijo primero | DEMO PREMIUM |
| QuickActions → Tasks | Crear tarea respaldado por task.created | REAL MVP si se implementa |
| QuickActions → Events | Crear evento respaldado por event.created | REAL MVP si se implementa |
| People → Planner | PersonProfile muestra tareas/eventos/responsabilidades | REAL MVP parcial / DEMO |
| Planner → Members | Tareas asignadas a miembros; eventos con participantes | REAL MVP |
| Inventory → Planner | ShoppingList genera Task; ExpiryRecord podría disparar Task | POST\_MVP / DEMO |
| Assets → Planner | AssetMaintenance genera Task | POST\_MVP / DEMO |
| FamilyCloud → Calendar | MediaItem links\_to Event; Event generates MediaItem | POST\_MVP / DEMO |
| Geni → Home | Briefing, recomendaciones, patrones | MOCK / DEMO |
| Geni → Planner | Detecta carga, escalamiento, conflictos | POST\_MVP / DEMO |
| Notifications → UI | Centro in-app 30 días | DEMO PREMIUM / parcial REAL |
| More → Finance/Inventory/FamilyCloud/Settings | Acceso desde MoreMenu | DEMO PREMIUM |
| Household → Todos | Filtra datos por household\_id | REAL MVP |

---

## **22\. Edge cases frontend**

### **Auth / onboarding / household**

| Caso | Fuente del comportamiento | Clasificación |
| ----- | ----- | ----- |
| Registro sin conexión | `user.registered` offline D, no puede registrarse sin conexión | REAL MVP / estado error |
| Usuario completa onboarding | `user.onboarding_completed` | REAL MVP |
| Crear hogar requiere online | `household.created` offline S | REAL MVP |
| Settings del hogar cambiados | `household.settings_changed` | POST\_MVP / parcial |

### **Invitations / members**

| Caso | Fuente del comportamiento | Clasificación |
| ----- | ----- | ----- |
| Invitación pendiente | `member.invited`, “Invitación pendiente” | REAL MVP |
| Invitación aceptada | `invitation.accepted` | REAL MVP |
| Invitación expirada | `invitation.expired` | REAL MVP si hay expiración |
| Invitación cancelada | `invitation.cancelled` | POST\_MVP / parcial |
| Miembro activo | `member.joined`, status active | REAL MVP |
| Miembro removido | `member.removed`, status finalized | POST\_MVP |
| Rol cambiado | `member.role_changed` | POST\_MVP / parcial |

### **Planner**

| Caso | Fuente del comportamiento | Clasificación |
| ----- | ----- | ----- |
| Tarea asignada | `task.assigned` | REAL MVP |
| Tarea en progreso | `task.started` | POST\_MVP / parcial |
| Tarea completada | `task.completed` | REAL MVP |
| Tarea verificada | `task.verified` | REAL MVP si verification flow |
| Tarea cancelada | `task.cancelled` | REAL MVP parcial |
| Tarea vencida | `task.overdue` | REAL MVP |
| Tarea recordatorio | `task.reminder_due` | POST\_MVP / demo |
| Tarea atrasada con escalamiento | `task.escalation_level_*` | POST\_MVP / demo |
| Comentario en tarea | `task.commented` | POST\_MVP |
| Subtarea completada | `subtask.completed` | POST\_MVP |
| Progreso actualizado | `task.progress_updated` | POST\_MVP |

### **Calendar**

| Caso | Fuente del comportamiento | Clasificación |
| ----- | ----- | ----- |
| Evento creado | `event.created` | REAL MVP |
| Evento actualizado | `event.updated` | REAL MVP parcial |
| Evento cancelado | `event.cancelled` | REAL MVP parcial |
| Evento completado | `event.completed` | POST\_MVP / visual |
| Conflicto de eventos | `event.conflict_detected` | POST\_MVP / demo |
| Recordatorio de evento | `event.reminder_due` | POST\_MVP |
| Participante agregado/removido | `event.participant_added`, `event.participant_removed` | POST\_MVP / parcial |

### **Sistema**

| Caso | Fuente del comportamiento | Clasificación |
| ----- | ----- | ----- |
| Conflicto de sync | `system.sync_conflict` aparece en catálogo de prioridades | POST\_MVP |
| Error recuperable | `system.error` aparece en catálogo | POST\_MVP / estado genérico |
| Offline queue | OfflineQueue | POST\_MVP |
| Last Write Wins | OfflineQueue | POST\_MVP |

---

## **23\. Copywriting y labels**

### **Labels de navegación**

* Home.  
* People.  
* \+.  
* Planner.  
* More.  
* Finance.  
* Inventory.  
* FamilyCloud.  
* Settings.

### **Labels/secciones Home**

* Briefing.  
* Atención Requerida.  
* Carga Familiar.  
* Eventos.  
* Tareas.  
* Finanzas.  
* Presence.  
* Actividad.

### **Roles**

* CoordinatorRole.  
* AdultRole.  
* TeenRole.  
* ChildRole.  
* SeniorRole.  
* GuestRole.  
* FamilyEmployeeRole.

### **Estados y labels**

* pending.  
* active.  
* suspended.  
* finalized.  
* accepted.  
* expired.  
* cancelled.  
* completed.  
* scheduled.  
* failed.  
* paid.  
* annulled.  
* overdue.  
* active.  
* archived.  
* inactive.  
* closed.  
* red.  
* orange.  
* yellow.

### **Copy textual detectado**

* “Invitación pendiente”.  
* “X aceptó la invitación”.  
* “Invitación a \[email\] expiró”.  
* “¡X se unió al hogar\!”.  
* “X ya no es parte del hogar”.  
* “Ahora eres \[rol\]”.  
* “Nueva tarea: \[title\]”.  
* “Te asignaron: \[title\]”.  
* “\[Display\_name\] empezó \[title\]”.  
* “¡\[Verificador\] confirmó tu tarea\!”.  
* “Mañana aviso al coordinador”.  
* “Hay 3 tareas sin dueño activo. Como familia, ¿quieren redistribuirlas?”.  
* “\[title\] terminó”.  
* “Tienes dos eventos solapados”.  
* “Te invitaron a \[event\_title\]”.  
* “La meta \[title\] venció sin alcanzarse. ¿Quieres crear una nueva?”.  
* “Tu briefing del día está listo”.

No se encontraron textos de botones principales como “Crear”, “Guardar”, “Cancelar”, “Ver todo”, etc.

---

## **24\. Restricciones técnicas frontend**

### **Encontrado**

* Supabase Auth aparece por `auth.users`.  
* RLS aparece como servicio de seguridad.  
* RLS filtra por `household_id` y `member_id`.  
* `household_id` es clave para aislamiento de datos.  
* Notificaciones in-app se almacenan 30 días.  
* Push no se almacena.  
* Notification channels incluyen push, email, sms.  
* OfflineQueue:  
  * cola de sincronización;  
  * Last Write Wins;  
  * acciones offline conservan autor y fecha original.  
* OfflineModule permite:  
  * ver/completar tareas;  
  * ver eventos;  
  * ver personas;  
  * ver assets;  
  * ver stock.  
* Estados como texto, no enum PostgreSQL.  
* Visibilidad binaria:  
  * household;  
  * personal.  
* Document access granular solo donde es necesario.  
* Responsabilidades no son dominio independiente; son eje organizador dentro de Tasks.  
* Recurrencias generan nuevas instancias, no reutilizan la misma tarea/evento.

### **Clasificación**

* **REAL MVP**  
  * Supabase Auth como base conceptual.  
  * RLS/household isolation como restricción de datos.  
  * household\_id/member\_id para filtrar UI.  
* **POST\_MVP**  
  * OfflineQueue real.  
  * Last Write Wins real.  
  * push/email/sms reales.  
  * DataExport.  
  * DocumentEncryption.  
  * GlobalSearch.  
  * automatizaciones reales.  
  * Geni real.

### **No encontrado**

* Stack frontend.  
* Expo.  
* React Native.  
* Librerías.  
* Supabase Realtime explícito.  
* Storage frontend.  
* Edge Functions frontend.  
* Performance budgets.  
* Platform differences.  
* Mobile constraints concretas.

---

## **25\. Contradicciones o riesgos**

| Tema | Riesgo | Recomendación para futura fusión |
| ----- | ----- | ----- |
| Roles Teen vs Adolescent | El documento usa TeenRole, pero MVP puede usar Adolescent | Mapear con cuidado sin duplicar roles |
| Task states | Documento usa pending, in\_progress, completed, cancelled; MVP puede querer pending/completed/awaiting\_verification/verified | No convertir verified en estado si la fuente lo define como campos verified\_by/verified\_at |
| Verification Flow | Verificación aparece como feature con campos, no como estado formal | Modelar visualmente como derivado o aclarar en merge |
| Recurrencia | Documento usa recurrence\_rule/RFC5545 | Para MVP evitar RRULE complejo; usar simple si otra fuente lo define |
| Calendar views | Solo aparece CalendarView, no día/semana/mes | No inventar vistas; marcar faltante |
| Quick Actions | Se define panel, pero no lista exacta de acciones | Usar solo acciones respaldadas por eventos en merge |
| Geni | Aparece muy integrado, pero IA real es compleja | Para MVP usar mock/demo salvo definición real |
| Notifications | Documento describe push/email/SMS, pero MVP puede no implementarlo | Mostrar feedback local/in-app; push real POST\_MVP |
| Offline | Documento trae offline queue/local-first, pero MVP puede no tenerlo | No implementar offline real salvo alcance separado |
| Home avanzado | Home incluye muchas secciones no MVP | Separar tareas/eventos reales de widgets mock |
| Feed | Eventos pueden generar feed automático | No implementar Feed real en MVP |
| Finance/Inventory/Assets | Tienen dashboards y conexiones con Planner | Usarlos como demo premium o relaciones futuras |
| SOS | Es crítico/no silenciable y sensible | Evitar falso SOS real en demo salvo visual claramente no operativo |
| MultiHomeSelector | Visible con 2+ hogares | Postergar si MVP usa un hogar activo |
| Permisos finos | Muchos permisos aparecen, pero incompletos para UI total | Definir mínimos en merge |
| Endpoints | No hay contratos HTTP | No inventar endpoints desde este fragment |
| Visual premium | No hay diseño visual explícito | Requiere otro documento visual/design system |

---

## **26\. Información faltante**

* Pantallas exactas de:  
  * Login;  
  * Register;  
  * Forgot Password;  
  * Create Household;  
  * Join Household;  
  * Invite Member;  
  * Pending Approval;  
  * Approve/Reject Member;  
  * Home;  
  * Planner;  
  * Task List;  
  * Create Task;  
  * Edit Task;  
  * Calendar;  
  * Create Event;  
  * Event Detail;  
  * People;  
  * More;  
  * Settings.  
* Layout mobile.  
* Design tokens.  
* Colores.  
* Tipografía.  
* Spacing.  
* Iconografía.  
* Shadows.  
* Border radius.  
* Estados visuales de loading/error/empty.  
* Toasts/snackbars.  
* Skeletons.  
* Bottom sheets/modals.  
* Formularios detallados.  
* Validaciones.  
* Errores visibles.  
* Endpoints HTTP.  
* Request/response de services.  
* Supabase Realtime específico.  
* Datos mock concretos con nombres reales.  
* Copy de botones.  
* Textos de empty states.  
* Criterios de demo premium.  
* Navegación por rol detallada.  
* Qué módulos demo aparecen en Home vs More.  
* Cómo se ve Carga Familiar.  
* Cómo se ve Presence mock.  
* Cómo se ve Briefing mock.  
* Cómo se ve Activity mock.  
* Cómo se representa prioridad visualmente más allá de emojis.  
* Cómo se muestran avatares/iniciales.  
* Cómo se muestra rol en UI.  
* Cómo se muestra permiso denegado.  
* Cómo se muestra usuario sin hogar.  
* Cómo se muestra usuario pendiente.  
* Cómo se muestran tareas con verificación pendiente.  
* Cómo se muestran eventos cancelados.  
* Cómo se resuelve Calendar día/semana/mes.

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Motivo |
| ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Solo hay prioridades/emojis y estructura dashboard; faltan tokens visuales |
| `navigation_fragment` | Sí | Hay BottomNavigation, QuickActions, MoreMenu, HomeDashboard, GlobalSearch, MultiHomeSelector |
| `home_frontend_fragment` | Sí | HomeDashboard y eventos/briefing aportan mucho |
| `planner_frontend_fragment` | Sí | Tasks, Events, Calendar y Goals están muy desarrollados en eventos |
| `people_members_frontend_fragment` | Sí | Hay roles, PeopleList, PersonProfile, member events |
| `household_invites_frontend_fragment` | Sí | Hay invitations, household.created, onboarding\_completed, member events |
| `auth_onboarding_frontend_fragment` | Parcial | Hay registered/onboarding\_completed, pero no login/logout/UI |
| `quick_actions_frontend_fragment` | Parcial | Existe panel y Geni slot, pero faltan acciones exactas |
| `more_settings_frontend_fragment` | Parcial | MoreMenu existe; Settings no está detallado |
| `finance_demo_fragment` | Sí | Hay entidades, estados y FinanceDashboard |
| `inventory_demo_fragment` | Sí | Hay entidades, estados, InventoryDashboard y relación futura con tasks |
| `assets_demo_fragment` | Sí | Hay entidades, AssetsDashboard y mantenimiento |
| `familycloud_demo_fragment` | Sí | Hay dashboard, albums, documents, moments |
| `presence_demo_fragment` | Sí | Hay dashboard, states, lugares, check-ins, visibility |
| `geni_demo_fragment` | Sí | Hay GeniBriefing, GeniChat, recomendaciones, quick actions |
| `mock_data_fragment` | Parcial | Hay labels/estados/categorías, pero pocos datos concretos |
| `ux_states_fragment` | Sí | Hay muchos estados, prioridades, offline flags y feedback |
| `frontend_services_fragment` | Parcial | Hay acciones/payloads/eventos, pero no endpoints |

---

## **28\. Conclusión operativa**

Este documento debe usarse en la futura `frontend_premium_mvp_spec.md` como fuente de:

* navegación global base;  
* orden de Home;  
* pantallas/módulos detectados;  
* estados y feedback;  
* roles y permisos visibles;  
* relaciones entre módulos;  
* payloads útiles para diseñar cards;  
* módulos demo premium;  
* eventos que pueden alimentar Home, Planner, People y notificaciones;  
* restricciones de household isolation;  
* separación REAL MVP vs DEMO vs POST\_MVP.

Partes más útiles para MVP real:

* BottomNavigation.  
* QuickActions como acceso rápido.  
* HomeDashboard.  
* PeopleList.  
* Household/Invitations events.  
* Planner Tasks.  
* Planner Events.  
* CalendarView.  
* Roles y permisos mínimos.  
* Estados UX de invitation/member/task/event.

Partes útiles para demo premium:

* FinanceDashboard.  
* InventoryDashboard.  
* AssetsDashboard.  
* FamilyCloudDashboard.  
* PresenceDashboard.  
* GeniBriefing.  
* GeniChat.  
* FeedDashboard.  
* GoalsView.  
* Carga Familiar.  
* Actividad.  
* Notifications center.

Partes que deben quedar fuera del MVP real salvo mock visual:

* IA real.  
* Automatizaciones reales.  
* Offline sync real.  
* GPS/geofencing real.  
* SOS real.  
* Feed real.  
* Finance real completo.  
* Inventory real completo.  
* Assets real completo.  
* Storage/OCR real.  
* Auditoría completa.  
* Push/email/SMS reales.  
* Recurrencia compleja.  
* Multi-hogar avanzado.  
* Search global real.

---

# **SOURCE 15 — FINAL SPEC**

## **Archivo recomendado**

`Final Spec.txt`

## **Tipo de documento**

Spec general

## **Uso para frontend**

Extraer:

* alcance MVP;  
* módulos reales;  
* módulos mock;  
* navegación global;  
* pantallas obligatorias;  
* restricciones;  
* reglas funcionales que impactan UI;  
* límites POST-MVP;  
* prioridades para demo.

## **Contenido extraído**

# **frontend\_global\_fragment\_HomePlus\_FinalSpec**

## **1\. Fuente**

* Documento principal: `HomePlus — FinalSpec(1).md`  
* Archivo de comprensión asociado: `Final Spec(1).txt`  
* Source map disponible: `source_map_HomePlus_FinalSpec(1).md`  
* Tipo de documento: FinalSpec general / documento maestro canónico de producto.  
* Alcance del documento: visión, principios, arquitectura conceptual, dominios, roles, People, Planner, Home, navegación, estados, relaciones, auditoría, módulos secundarios y decisiones arquitectónicas.  
* Nivel de utilidad frontend: Alto.  
* Motivo: el documento define navegación V1, Home, People, Planner, More, Quick Actions, Settings, roles, estructura de pantallas, bloques de Home, estados, permisos conceptuales, relaciones entre módulos y varios patrones frontend reutilizables. No define design tokens visuales, layouts pixel-perfect, componentes React Native, endpoints ni estados UX técnicos detallados.

---

## **2\. Utilidad frontend del documento**

Este documento sirve como base conceptual y estructural para el frontend premium MVP de HomePlus.

Aporta información útil para:

* Definir la navegación principal.  
* Definir Home como centro operativo.  
* Definir Planner como módulo principal de ejecución.  
* Definir People como módulo de coordinación humana.  
* Definir More como acceso a herramientas especializadas.  
* Definir Quick Actions como panel de acciones rápidas.  
* Definir Settings dentro de More.  
* Adaptar la experiencia por rol.  
* Clasificar qué módulos son de uso diario, semanal, ocasional o especial.  
* Separar módulos reales del MVP de módulos demo/premium.  
* Evitar que Home se convierta en dashboard excesivo.  
* Mantener una app mobile-first, rápida y con baja profundidad de navegación.  
* Usar módulos demo como Finance, Inventory, Assets, HomeCloud, Presence, Geni, Feed, Automations y Goals sin convertirlos en backend real.  
* Definir relaciones visibles entre Home, Planner, People, Quick Actions y More.

---

## **3\. Información de producto aplicable al frontend**

### **Coordinación familiar**

HomePlus está diseñado para centralizar la organización, planificación, comunicación, memoria y operación diaria de uno o más hogares.

Aplicación frontend:

* La app debe sentirse como una herramienta de coordinación diaria.  
* Las pantallas deben responder a “qué tengo que hacer”, “qué requiere atención” y “qué está pasando en el hogar”.  
* La navegación debe priorizar acciones y atención, no exploración de módulos.

Clasificación: REAL MVP / principio global.

### **Reducción de carga mental**

HomePlus busca reducir la carga mental mediante herramientas para coordinar responsabilidades, administrar recursos, registrar información importante y automatizar tareas repetitivas.

Aplicación frontend:

* Mostrar prioridades claras.  
* Agrupar información por contexto familiar.  
* Evitar pantallas sobrecargadas.  
* Crear tarea/evento/invitación debe ser rápido.  
* Home debe resumir lo importante.

Clasificación: REAL MVP / principio global.

### **Home como centro operativo**

Home resume información y no administra información. Toda información mostrada en Home debe conducir al módulo que la administra.

Aplicación frontend:

* Home es la pantalla inicial.  
* Home muestra cards/widgets.  
* Home redirige hacia Planner, Calendar, Goals, Finance u otros módulos.  
* Home no debe tener formularios complejos ni CRUD completo.

Clasificación: REAL MVP.

### **Simplicidad visual**

La complejidad interna del sistema no debe reflejarse en la interfaz.

Aplicación frontend:

* Usar cards, listas, chips, tabs y modales simples.  
* Ocultar funcionalidades avanzadas detrás de More o POST-MVP.  
* No exponer todos los dominios en Bottom Nav.  
* No crear dashboards densos en More.  
* Mantener navegación de baja profundidad.

Clasificación: REAL MVP.

### **Configuración mínima**

La complejidad debe resolverse mediante diseño y automatización, no trasladando configuraciones complejas al usuario.

Aplicación frontend:

* Settings debe estar en More.  
* Acciones frecuentes deben estar en Quick Actions.  
* Filtros y opciones deben ser simples.  
* Configuración avanzada debe ocultarse o quedar POST-MVP.

Clasificación: REAL MVP.

### **Privacidad**

Ningún rol obtiene acceso automático a memoria privada de Geni, metas privadas, documentos privados o finanzas personales. La privacidad individual prevalece.

Aplicación frontend:

* Mostrar/ocultar contenido según permisos.  
* Evitar asumir que Coordinador ve todo.  
* Las pantallas personales deben distinguirse del hogar.  
* Geni debe filtrar output por permisos si aparece como demo o futuro.

Clasificación: REAL MVP / POST-MVP para permisos finos.

### **Transparencia operativa**

Las acciones importantes deben quedar registradas. El sistema debe poder responder quién hizo algo, cuándo ocurrió y qué cambió.

Aplicación frontend:

* Historial o timeline puede aparecer como referencia futura.  
* Cambios importantes pueden mostrarse como activity items.  
* Auditoría completa queda POST-MVP, pero el frontend puede dejar lugar visual a “Historial”.

Clasificación: POST\_MVP para auditoría completa; REAL MVP conceptual para transparencia.

### **Mobile-first**

El documento de comprensión indica mobile-first absoluto, tablet en 2 columnas y desktop sidebar pendiente.

Aplicación frontend:

* Prioridad a navegación móvil.  
* Bottom Nav como navegación principal.  
* Modales cortos para acciones rápidas.  
* Drawers con uso limitado.  
* Evitar layouts desktop complejos.

Clasificación: REAL MVP.

---

## **4\. Navegación y arquitectura de pantallas**

### **Arquitectura global por niveles**

El documento define niveles de navegación:

| Nivel | Nombre | Ejemplos | Clasificación |
| ----- | ----- | ----- | ----- |
| 0 | Home | Centro operativo | REAL MVP |
| 1 | Navegación principal | Bottom Nav, More | REAL MVP |
| 2 | Dominio | Tasks, Calendar, Finance | REAL MVP / DEMO PREMIUM según módulo |
| 3 | Vista específica | Task Detail, Event Detail | REAL MVP para Planner |
| 4 | Acción puntual | Editar tarea, Cambiar responsable | REAL MVP / POST\_MVP según acción |

Regla oficial:

* Más de 4 niveles es fallo de navegación.  
* Objetivo: 95% de acciones en 3 niveles o menos.

### **Bottom Navigation V1**

La navegación inferior congelada V1 es:

\[ Home \]  \[ People \]  \[ \+ \]  \[ Planner \]  \[ More \]

* Home → Atención actual / lo importante ahora.  
* People → Coordinación humana: Feed \+ Presence \+ Personas.  
* `+` → Quick Actions / panel de acción rápida.  
* Planner → Ejecución: Tasks \+ Calendar \+ Goals.  
* More → Herramientas especializadas: Finance \+ Inventory \+ HomeCloud \+ Settings.

Clasificación: REAL MVP.

### **Jerarquía de frecuencia**

| Tier | Frecuencia | Módulos | Clasificación |
| ----- | ----- | ----- | ----- |
| Tier 1 | Diario | Home, Tasks, Calendar, Feed | Home/Tasks/Calendar REAL MVP; Feed DEMO PREMIUM |
| Tier 2 | Semanal | Finance, Goals, Presence | DEMO PREMIUM / POST\_MVP |
| Tier 3 | Ocasional | Documents, Inventory | DEMO PREMIUM |
| Tier 0 | Especial | SOS, Geni | DEMO PREMIUM / POST\_MVP |

Regla:

* Los módulos Tier 1 tienen acceso más directo.  
* Los Tier 3 viven dentro de More.

### **Home**

* Siempre es la pantalla inicial.  
* El usuario no puede cambiarlo.  
* Home resume y redirige.

Clasificación: REAL MVP.

### **People**

Estructura interna:

People

├─ Feed

│   ├─ Actividad (generada por el sistema)

│   └─ Temas (discusiones centradas en un asunto)

│

├─ Presence

│   ├─ Estado

│   ├─ Ubicación

│   ├─ Check-ins

│   ├─ Lugares

│   └─ Coordinación

│

└─ Personas

    ├─ Lista de miembros

    └─ Perfil individual

Clasificación:

* Lista de miembros: REAL MVP.  
* Perfil individual básico: REAL MVP / DEMO PREMIUM.  
* Feed: DEMO PREMIUM.  
* Presence: DEMO PREMIUM / MOCK.  
* GPS real, geocercas e historial: POST\_MVP.

### **Perfil individual**

Estructura mencionada:

Persona

├─ Resumen

├─ Tareas

├─ Eventos

├─ Goals (metas, progreso y logros)

├─ Presence

├─ Actividad

└─ Responsabilidades

Clasificación:

* Resumen, tareas, eventos, responsabilidades: REAL MVP / útil para demo.  
* Goals, Presence, Actividad: DEMO PREMIUM / POST\_MVP.

### **Planner**

Estructura interna:

Planner

├─ Tasks

│

│   Filtros: Todas | Mías | Familia | Recurrentes | Completadas

│

│   Agrupar por: Responsabilidad | Prioridad | Fecha

│

├─ Calendar

│

└─ Goals

Clasificación:

* Tasks: REAL MVP.  
* Calendar: REAL MVP.  
* Goals: DEMO PREMIUM / POST\_MVP.  
* Filtros y agrupaciones: REAL MVP visual.

### **Quick Actions**

El botón central `+` abre un panel flotante con blur del fondo.

Clasificación: REAL MVP para panel; DEMO PREMIUM para acciones no core.

### **More**

More contiene herramientas especializadas.

Estructura visible:

More

💰 Finance

📦 Inventory

☁ HomeCloud

⚙ Settings

Cada módulo se muestra como card con nombre y línea de contexto secundaria. More no contiene dashboards; solo accesos a dominios e indicadores rápidos opcionales.

Clasificación:

* More visual: DEMO PREMIUM / REAL MVP si Settings básico es necesario.  
* Finance, Inventory, HomeCloud: DEMO PREMIUM.  
* Dashboards completos dentro de More: no corresponde.

### **Settings**

Settings vive exclusivamente en More. No aparece en Bottom Nav. No tiene acceso desde Home. Search puede indexar configuraciones.

Estructura:

Settings

├─ Hogar

│   ├─ Miembros

│   ├─ Roles

│   ├─ Responsabilidades

│   ├─ Permisos

│   └─ Integraciones

│

├─ Cuenta

│   ├─ Perfil

│   ├─ Seguridad

│   └─ Privacidad

│

├─ Sistema

│   ├─ Notificaciones

│   ├─ Offline

│   └─ Multi-Hogar

│

└─ Auditoría (acceso protegido)

Clasificación:

* Perfil, Hogar, Miembros, Roles: REAL MVP parcial.  
* Seguridad, Privacidad: DEMO PREMIUM / POST\_MVP si no hay backend.  
* Notificaciones, Offline, Multi-Hogar, Auditoría protegida: POST\_MVP / DEMO PREMIUM visual.

### **Reglas globales de navegación**

* Tabs: usar cuando todas las vistas pertenecen al mismo objeto mental.  
* Máximo 5 tabs por dominio.  
* Stacks: usar para profundizar dentro de un dominio.  
* Modales: solo para acciones cortas.  
* Drawers: uso extremadamente limitado para filtros, opciones contextuales o acciones secundarias.  
* Nunca usar drawers como navegación principal.  
* Mobile-first.  
* Entidades deben estar enlazadas entre sí.

---

## **5\. Pantallas detectadas**

| Pantalla | Objetivo | Qué muestra | Acciones | Navegación | Clasificación |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Home | Centro operativo | Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, Tareas, Finanzas Relevantes, Presence Resumido, Actividad Familiar | Tocar cards para ir al módulo correspondiente | Tab Home / pantalla inicial | REAL MVP \+ MOCK \+ DEMO PREMIUM |
| People | Coordinación humana | Feed, Presence, Personas | Ver miembros, ver perfil, ver actividad/presence demo | Tab People | REAL MVP para miembros; DEMO PREMIUM para Feed/Presence |
| Lista de miembros | Ver personas del hogar | Miembros, roles, estado básico | Abrir perfil | People → Personas | REAL MVP |
| Perfil individual | Ver persona | Resumen, tareas, eventos, goals, presence, actividad, responsabilidades | Navegar a secciones relacionadas | People → Perfil | REAL MVP parcial / DEMO PREMIUM |
| Planner | Ejecución | Tasks, Calendar, Goals | Cambiar sección, filtrar, agrupar | Tab Planner | REAL MVP |
| Tasks | Gestionar tareas | Lista de tareas, filtros, agrupaciones | Crear, abrir detalle, completar, editar/reasignar si aplica | Planner → Tasks | REAL MVP |
| Task Detail | Ver tarea | Detalle, responsable, estado, fecha, historial si se usa | Editar, cambiar responsable, completar | Tasks → Detail | REAL MVP parcial |
| Edit Task | Editar tarea | Formulario de edición | Guardar cambios | Task Detail → Edit | REAL MVP parcial |
| History | Ver historial | Cambios de tarea | Consultar | Task Detail → History | POST\_MVP / DEMO PREMIUM |
| Calendar | Ver eventos | Eventos familiares/personales | Crear evento, ver próximos eventos | Planner → Calendar | REAL MVP parcial |
| Event Detail | Ver evento | Información del evento | Editar fecha/cancelar si aplica | Calendar → Event Detail | REAL MVP parcial / faltan detalles |
| Goals | Objetivos | Metas, progreso, logros | Ver progreso / futuro | Planner → Goals | DEMO PREMIUM / POST\_MVP |
| Quick Actions panel | Acciones rápidas | Crear tarea, crear evento, Geni, otras acciones | Abrir modales o pantalla Geni | Botón central `+` | REAL MVP \+ DEMO PREMIUM |
| Modal Crear tarea | Acción corta | Inputs de tarea si se implementan | Crear/cancelar | Quick Actions / Planner | REAL MVP parcial |
| Modal Crear evento | Acción corta | Inputs de evento si se implementan | Crear/cancelar | Quick Actions / Calendar | REAL MVP parcial |
| Geni | Asistente transversal | Chat, acciones sugeridas, insights, historial, configuración IA | Preguntar/abrir sugerencias | Quick Actions → Geni | DEMO PREMIUM / POST\_MVP |
| More | Herramientas especializadas | Finance, Inventory, HomeCloud, Settings | Abrir módulos | Tab More | DEMO PREMIUM |
| Finance | Finanzas | Cuentas, gastos, ingresos, presupuestos, fondos, deudas | Ver/crear demo | More → Finance | DEMO PREMIUM |
| Inventory | Stock del hogar | Consumibles, productos, medicamentos | Ver stock/demo | More → Inventory | DEMO PREMIUM |
| HomeCloud | Memoria/documentos | Recuerdos, álbumes, documentos | Ver/subir demo | More → HomeCloud | DEMO PREMIUM |
| Settings | Configuración | Hogar, Cuenta, Sistema, Auditoría | Abrir subsecciones | More → Settings | REAL MVP parcial / DEMO PREMIUM |
| Settings/Hogar | Configuración del hogar | Miembros, Roles, Responsabilidades, Permisos, Integraciones | Ver/editar si aplica | Settings → Hogar | REAL MVP parcial |
| Settings/Cuenta | Configuración personal | Perfil, Seguridad, Privacidad | Ver/editar si aplica | Settings → Cuenta | REAL MVP parcial |
| Search | Búsqueda/acciones | Resultados y acciones ejecutables | Buscar, ejecutar acción | Acceso global no detallado | DEMO PREMIUM / POST\_MVP |
| Multi-Hogar selector | Cambiar contexto | Hogar activo en header si hay 2+ hogares | Abrir dropdown/cambiar hogar | Header global | POST\_MVP / REAL conceptual para hogar activo |
| SOS | Emergencia | Niveles de alerta | Swipe global | Swipe ↑ global | DEMO PREMIUM / POST\_MVP; no Quick Actions |

---

## **6\. Componentes y patrones UI reutilizables**

| Componente / patrón | Uso detectado | Clasificación |
| ----- | ----- | ----- |
| Bottom Nav | Home, People, \+, Planner, More | REAL MVP |
| Botón central `+` | Abre Quick Actions | REAL MVP |
| Panel flotante con blur | Quick Actions | REAL MVP / visual premium |
| Cards | Home, More, módulos demo | REAL MVP / DEMO PREMIUM |
| Card única de Briefing | Primer bloque de Home | MOCK / DEMO PREMIUM |
| Widgets / bloques | Home | REAL MVP \+ MOCK |
| Lista de miembros | People/Personas | REAL MVP |
| Perfil individual | People | REAL MVP parcial |
| Tabs | Tasks: Todas/Mías/Familia/Recurrentes/Completadas | REAL MVP |
| Chips/filtros | Filtros y agrupaciones de Tasks | REAL MVP |
| Badges/status pills | Roles, estados, prioridades | REAL MVP visual inferido desde estados/roles; no diseño explícito |
| Role pills | Roles en miembros/perfil | REAL MVP visual útil; no diseño explícito |
| Priority label | Baja, Media, Alta, Crítica | REAL MVP |
| Status label | Pendiente, En progreso, Completada, Cancelada, Programado, Cancelado | REAL MVP |
| Modales | Crear tarea, crear evento, crear gasto, confirmar check-in | REAL MVP / DEMO PREMIUM |
| Drawers limitados | Filtros/opciones contextuales | DEMO PREMIUM / evitar navegación principal |
| Stack | Tasks → Task Detail → Edit Task → History | REAL MVP parcial |
| Header con avatar | Perfil personal | REAL MVP |
| Header con selector de hogar | Multi-hogar con 2+ hogares | POST\_MVP / REAL conceptual |
| Cards de More | Módulo \+ línea secundaria | DEMO PREMIUM |
| Attention Required block | Urgencias en Home | REAL MVP / DEMO PREMIUM según fuente |
| Empty state positivo | “Todo al día” cuando no hay tareas | REAL MVP |
| Activity items | Feed/Actividad/Auditoría/Timeline | DEMO PREMIUM / POST\_MVP |
| Progress visual | Goals, subtareas, LoadMetric | DEMO PREMIUM / POST\_MVP |
| Calendar component | Calendar | REAL MVP parcial |
| Search results | Search global | DEMO PREMIUM / POST\_MVP |

No se encontró especificación de:

* Skeletons.  
* Toasts.  
* Spinners.  
* Tipografía.  
* Colores.  
* Radios.  
* Sombras.  
* Gradientes.  
* Icon set.  
* Tamaños exactos.  
* Espaciado exacto.  
* Design tokens.

---

## **7\. Visual design aplicable**

### **Información visual explícita encontrada**

* Bottom Nav con cinco ítems.  
* Botón central `+`.  
* Quick Actions como panel flotante con blur del fondo.  
* More como cards de módulos con emoji/icono, nombre y línea secundaria.  
* Briefing como una única card.  
* Home como bloques ordenados.  
* Header con Avatar.  
* Selector de hogar como dropdown en header si hay múltiples hogares.  
* Settings como estructura jerárquica.  
* People/Planner como estructuras internas de secciones.  
* Tabs para vistas del mismo objeto mental.  
* Modales para acciones cortas.  
* Drawers solo para filtros/opciones secundarias.  
* Mobile-first absoluto.  
* Tablet en 2 columnas y desktop sidebar pendiente.

### **Emojis/iconos explícitos**

En More aparecen:

* 💰 Finance.  
* 📦 Inventory.  
* ☁ HomeCloud.  
* ⚙ Settings.

En SOS aparecen niveles de emergencia en el documento general:

* Emergencia grave.  
* Necesito ayuda.  
* Coordinación urgente.

### **Sensación deseada derivada del documento**

* Clara.  
* Rápida.  
* No sobrecargada.  
* Orientada a acción.  
* Mobile-first.  
* Coordinada.  
* Familiar.  
* No invasiva.  
* Premium por simplicidad y jerarquía, no por exceso de widgets.

### **No se encontró información específica**

* Paleta de colores.  
* Gradientes.  
* Blur más allá de Quick Actions.  
* Glassmorphism general.  
* Sombras.  
* Radios.  
* Tipografía.  
* Escala de spacing.  
* Estilo iOS explícito.  
* Componentes Figma.  
* Iconografía completa.  
* Estados visuales exactos.

---

## **8\. Home**

### **Rol de Home**

Home es el centro operativo del hogar.

Responde:

1. ¿Cómo está el hogar?  
2. ¿Qué requiere atención?  
3. ¿Qué debo hacer yo?  
4. ¿Hay riesgo?

Home no administra información; solo resume y redirige.

Clasificación: REAL MVP.

### **Orden oficial de bloques**

Home se compone de:

1. Briefing Geni.  
2. Atención Requerida.  
3. Carga Familiar.  
4. Próximos Eventos.  
5. Tareas agrupadas por Responsabilidad.  
6. Finanzas Relevantes condicional.  
7. Presence Resumido.  
8. Actividad Familiar.

### **Briefing**

Información encontrada:

* Siempre aparece primero.  
* Formato: una única card.  
* Puede incluir Planner, Finance, Presence, Goals, Eventos y Alertas.  
* Home recuerda estado del Briefing.  
* Existe versión resumida permanente.  
* Existe versión ampliada cuando hay cambios importantes.

Clasificación:

* MOCK para MVP actual si se simula con texto fijo/datos simples.  
* POST\_MVP si depende de Geni real.

### **Atención Requerida**

Objetivo:

* Centralizar elementos urgentes.

Ejemplos:

* SOS.  
* Tareas vencidas.  
* Pagos vencidos.  
* Aprobaciones pendientes.  
* Vencimientos.

Prioridad:

* Es el bloque más importante después del Briefing.

Clasificación:

* REAL MVP para tareas vencidas y aprobaciones pendientes si existen.  
* DEMO PREMIUM para pagos/vencimientos si los módulos son mock.  
* POST\_MVP para SOS real.

### **Carga Familiar**

Clasificación:

* MOCK para MVP si usa datos dummy.  
* POST\_MVP si calcula métricas reales de carga.  
* Relación oculta: al completar, reasignar o cancelar tareas, deberían recalcularse LoadMetrics, pero eso queda como futuro o baja confianza en el archivo de comprensión.

### **Próximos Eventos**

* Home muestra próximos eventos.  
* Tocar Próximos Eventos lleva a Calendar.

Clasificación: REAL MVP.

### **Tareas**

* Home muestra tareas agrupadas por Responsabilidad.  
* Tocar tareas lleva a Planner.  
* Si se completan tareas, los widgets desaparecen y Home se reorganiza.  
* Si no hay tareas, aparece card positiva “Todo al día”.

Clasificación: REAL MVP.

### **Finanzas Relevantes**

* Finance no posee widget permanente.  
* Aparece condicionalmente cuando existe pago vencido, presupuesto excedido, meta en riesgo o fondo completado.

Clasificación: DEMO PREMIUM / MOCK.

### **Presence Resumido**

* Presence no posee widget permanente.  
* Aparece mediante Briefing, Atención Requerida o widgets contextuales.

Clasificación: MOCK / DEMO PREMIUM.

### **Actividad Familiar**

* Aparece como bloque oficial de Home.  
* Feed/Actividad completa vive en People.

Clasificación: MOCK / DEMO PREMIUM.

### **Home por rol**

| Rol | Home prioriza | Clasificación |
| ----- | ----- | ----- |
| Coordinador | Visión completa del hogar, distribución de carga, riesgos, responsabilidades, gestión de miembros | REAL MVP parcial / DEMO PREMIUM |
| Adulto | Visión operativa, responsabilidades propias y contexto familiar | REAL MVP |
| Adolescente | Tareas, eventos, coordinación, menos contexto global | REAL MVP |
| Niño | Tareas, logros, recordatorios, mínima profundidad | DEMO PREMIUM / POST\_MVP según alcance |
| Adulto Mayor | Personas, eventos, recordatorios, medicación, coordinación, tareas, briefing | DEMO PREMIUM / REAL parcial |
| Invitado | Acceso mínimo, solo contexto autorizado | REAL MVP parcial |
| Empleado Familiar | Trabajo asignado | POST\_MVP |

---

## **9\. Planner / Tasks / Events / Calendar**

### **Planner**

Planner es el núcleo operativo de HomePlus. Administra Tasks, Calendar, Goals y Responsabilidades.

Clasificación:

* Planner shell: REAL MVP.  
* Tasks: REAL MVP.  
* Calendar/Events: REAL MVP.  
* Goals: DEMO PREMIUM / POST\_MVP.  
* Responsabilidades como eje de tareas: REAL MVP parcial.

### **Tasks**

#### **Información encontrada**

Tasks representa trabajo pendiente o realizado.

Campos principales encontrados:

* Título.  
* Descripción.  
* Responsable.  
* Fecha de inicio.  
* Fecha de vencimiento.  
* Prioridad.  
* Estado.  
* Responsabilidad asociada.  
* Goal asociada.  
* Archivos.  
* Comentarios.

Estados encontrados:

* Pendiente.  
* En progreso.  
* Completada.  
* Cancelada.

Regla:

* Vencida se calcula automáticamente; no es estado manual.

Prioridades:

* Baja.  
* Media.  
* Alta.  
* Crítica.

Acciones:

* Crear tarea.  
* Editar tarea.  
* Asignar.  
* Reasignar.  
* Completar.  
* Ver detalle.  
* Ver historial.  
* Filtrar.  
* Agrupar.

UI / navegación:

* Tasks.  
* Task Detail.  
* Edit Task.  
* History.  
* Modal para crear tarea.  
* Filtros: Todas, Mías, Familia, Recurrentes, Completadas.  
* Agrupar por: Responsabilidad, Prioridad, Fecha.

Relaciones:

* Task → Person responsable.  
* Task → Responsibility.  
* Task → Goal.  
* Task → Event relacionado.  
* Task → Home.  
* Task → AuditLog.

#### **Clasificación REAL MVP**

* Listar tareas.  
* Crear tarea.  
* Completar tarea.  
* Cambiar estado básico.  
* Asignar responsable si existe miembro.  
* Fecha de vencimiento.  
* Prioridad.  
* Estado.  
* Responsabilidad asociada.  
* Filtros/tabs básicos.  
* Agrupación por Responsabilidad/Prioridad/Fecha.  
* Tareas vencidas como cálculo visual.  
* Relación con Home.  
* Relación con Members para responsable.

#### **Clasificación DEMO PREMIUM**

* Task Detail visual completo.  
* History visual sin auditoría real.  
* Recurrentes como filtro visual si no hay backend.  
* Responsabilidades como chips/cards si no hay tabla real.  
* Goals vinculados visualmente.

#### **Clasificación POST\_MVP**

* Subtareas.  
* Comentarios.  
* Adjuntos.  
* Archivos.  
* Audio.  
* Dependencias.  
* Timeline avanzado.  
* Auditoría completa.  
* Recurrencias complejas.  
* Geni completando/gestionando tareas.  
* Automatizaciones reales.

#### **Riesgos**

* El documento dice que la verificación no tiene estado separado, pero el MVP puede necesitar estados como `awaiting_verification` y `verified`.  
* No aparece eliminar tarea.  
* No aparece endpoint.  
* No aparece diseño exacto de card de tarea.  
* No aparece empty state específico de Planner, salvo Home “Todo al día”.

### **Calendar / Events**

#### **Información encontrada**

Calendar administra eventos.

Eventos pueden ser:

* Familiares.  
* Personales.

Estados:

* Programado.  
* Completado.  
* Cancelado.

Regla:

* No existe Postergado.  
* Postergar equivale a modificar fecha.

Participantes:

* Los eventos pueden tener múltiples participantes.

Acciones:

* Crear evento.  
* Modificar fecha de evento.  
* Ver próximos eventos.  
* Abrir Calendar desde Home.

UI / navegación:

* Planner → Calendar.  
* Home → Próximos Eventos → Calendar.  
* Modal para crear evento.  
* Event Detail aparece como ejemplo de vista específica.

Relaciones:

* Event → Person participantes.  
* Event → Place.  
* Event → Home.  
* Event → HomeCloud/Album como futuro.  
* Event puede regenerar Briefing en caso de cambios importantes como POST\_MVP.

#### **Clasificación REAL MVP**

* Listar eventos.  
* Crear evento.  
* Editar fecha si se implementa.  
* Mostrar próximos eventos.  
* Calendar como contenedor de eventos.  
* Relación con Home.

#### **Clasificación DEMO PREMIUM**

* Event Detail visual.  
* Participantes visuales.  
* Ubicación visual.  
* Agenda visual si no hay datos reales.  
* Calendar con estado mock si faltan vistas.

#### **Clasificación POST\_MVP**

* Participantes avanzados.  
* Accepted / declined / maybe.  
* Recurrencia compleja.  
* RRULE.  
* EXDATE.  
* Excepciones avanzadas.  
* Álbumes automáticos desde eventos.  
* Notificaciones push reales.  
* Presence/Geni detectando retrasos.  
* Offline Calendar.

#### **Riesgos**

* No aparecen vistas día/semana/mes.  
* No aparecen campos formales de evento como título, inicio, fin, all-day, ubicación.  
* No aparece eliminar evento.  
* No aparece contrato API.  
* No aparece tarea con fecha dentro del calendario de forma explícita.

### **Goals**

Goals vive dentro de Planner, no como dominio independiente.

Información encontrada:

* Goal → Hitos → Tasks.  
* Tipos: Meta Personal, Meta Familiar.  
* Estados: Activa, Completada, Fallida.  
* Integración con Finance, Tasks, Fondos.  
* Geni puede estimar progreso.

Clasificación:

* DEMO PREMIUM como referencia visual.  
* POST\_MVP para implementación real.  
* No convertir a MVP real.

---

## **10\. People / Members / Roles**

### **People**

People es coordinación humana. Contiene Feed, Presence y Personas. Centraliza identidad, relaciones, roles, información básica y participación en el hogar.

Clasificación:

* Lista de miembros: REAL MVP.  
* Presencia visual: MOCK / DEMO PREMIUM.  
* Feed/Actividad: DEMO PREMIUM.  
* Perfil individual: REAL MVP parcial / DEMO PREMIUM.

### **Persona**

Campos encontrados:

* Nombre.  
* Apellido.  
* Foto.  
* Fecha de nacimiento.  
* Género opcional.  
* Información de contacto.  
* Rol dentro del hogar.

Clasificación: REAL MVP parcial.

### **Membership / Membresía**

Estados:

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.

La membresía representa la relación entre una persona y un hogar.

Clasificación: REAL MVP.

### **Roles oficiales**

El documento define siete roles oficiales:

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

Para MVP indicado:

* Coordinator / Coordinador: REAL MVP.  
* Adult / Adulto: REAL MVP.  
* Adolescent / Adolescente: REAL MVP.  
* Child / Niño: REAL MVP.  
* Senior / Adulto Mayor: REAL MVP.  
* Guest / Invitado: REAL MVP.  
* Empleado Familiar: POST\_MVP salvo demo visual.

### **Permisos relevantes para UI**

| Rol | Puede hacer | No puede hacer / límite | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación, administrar configuraciones del hogar | No puede eliminar hogares | REAL MVP parcial |
| Adulto | Invitar personas, crear tareas, reasignar tareas, crear eventos, administrar operaciones familiares | No puede aprobar ingresos | REAL MVP |
| Adolescente | Crear eventos familiares, crear gastos, administrar tareas propias | Permisos adicionales configurables | REAL MVP parcial / DEMO |
| Niño | Acceso simplificado | No administra información familiar crítica | DEMO PREMIUM / REAL parcial |
| Adulto Mayor | Experiencia adaptada, permisos equivalentes a Adulto salvo configuración; prioridad: personas, eventos, recordatorios, medicación, coordinación, tareas, briefing | No definido en detalle | DEMO PREMIUM / REAL parcial |
| Invitado | Acceso mínimo, participación limitada | Sin navegación completa | REAL MVP parcial |
| Empleado Familiar | Responsabilidades asignadas | No administra hogar ni decisiones familiares | POST\_MVP |

### **Relaciones con Planner**

* Persona puede relacionarse con tareas.  
* Persona puede relacionarse con eventos.  
* Task tiene responsable.  
* Event tiene participantes.  
* Perfil individual puede mostrar tareas, eventos, goals, presence, actividad y responsabilidades.

Clasificación:

* Responsable de tarea: REAL MVP.  
* Participantes de eventos básicos: REAL MVP parcial.  
* Presence/Actividad/Goals en perfil: DEMO PREMIUM / POST\_MVP.

---

## **11\. Household / Invitations / Onboarding**

### **Household / Hogar**

El Hogar es la unidad organizativa principal. Todo ocurre dentro de un hogar. Roles, Planner, Finance, Presence, Assets y HomeCloud pertenecen al hogar.

Aplicación frontend:

* La app debe tener contexto de hogar activo.  
* Home muestra estado del hogar.  
* Planner, Members y módulos deben filtrarse por hogar.  
* Header puede mostrar selector de hogar si hay múltiples hogares.

Clasificación: REAL MVP para hogar activo; POST\_MVP para multi-hogar avanzado.

### **Cuenta**

La Cuenta pertenece al usuario, no al hogar.

Incluye:

* Perfil.  
* Preferencias.  
* Idioma.  
* Configuración personal.  
* Memoria personal de Geni.

Clasificación:

* Perfil básico: REAL MVP parcial.  
* Preferencias/configuración visual: DEMO PREMIUM.  
* Memoria Geni: POST\_MVP.

### **Invitations**

Flujo conceptual:

Invitación

↓

Aceptación

↓

Aprobación (si corresponde)

↓

Ingreso al hogar

Acciones y permisos:

* Adulto puede invitar personas.  
* Coordinador puede aprobar ingresos.  
* Adulto no puede aprobar ingresos.

Clasificación:

* Invitar miembro: REAL MVP.  
* Aceptar invitación: REAL MVP.  
* Aprobar/rechazar miembro: REAL MVP si se implementa.  
* Estados/payload/token: faltante.

### **Onboarding**

Información encontrada:

* Home y navegación se adaptan por rol.  
* Quick Actions puede sugerir acciones por rol durante onboarding.  
* Empleado Familiar tiene onboarding propio, pero queda fuera del MVP.

Clasificación:

* Onboarding por rol conceptual: REAL MVP parcial.  
* Onboarding detallado por pantalla: faltante.  
* Empleado Familiar: POST\_MVP.

### **Información faltante específica**

* No hay pantallas de Register/Login.  
* No hay pantalla Create Household.  
* No hay formularios de Invite Member.  
* No hay link/código/token.  
* No hay estados de invitación.  
* No hay errores visibles.  
* No hay copy de onboarding.  
* No hay flujo post-login detallado.

---

## **12\. More / Settings / Profile**

### **More**

More contiene:

More

💰 Finance

📦 Inventory

☁ HomeCloud

⚙ Settings

Reglas:

* Cada módulo se muestra como card.  
* Cada card tiene nombre y línea de contexto secundaria.  
* More no contiene dashboards.  
* More solo contiene accesos a dominios e indicadores rápidos opcionales.

Clasificación: DEMO PREMIUM.

### **Settings**

Settings vive exclusivamente en More.

No aparece en Bottom Nav.

No tiene acceso desde Home.

Search puede indexar configuraciones.

Estructura:

* Hogar:  
  * Miembros.  
  * Roles.  
  * Responsabilidades.  
  * Permisos.  
  * Integraciones.  
* Cuenta:  
  * Perfil.  
  * Seguridad.  
  * Privacidad.  
* Sistema:  
  * Notificaciones.  
  * Offline.  
  * Multi-Hogar.  
* Auditoría:  
  * Acceso protegido.

Clasificación:

* Settings visual: DEMO PREMIUM.  
* Perfil básico: REAL MVP parcial.  
* Miembros/Roles/Responsabilidades: REAL MVP parcial.  
* Seguridad/Privacidad: DEMO PREMIUM / POST\_MVP.  
* Offline/Multi-Hogar/Auditoría: POST\_MVP o demo visual.

### **Profile**

Avatar en header → acceso al perfil personal.

Profile pertenece a Cuenta, no al hogar.

Clasificación: REAL MVP parcial / DEMO PREMIUM.

---

## **13\. Quick Actions**

### **Rol**

El botón `+` central abre un panel flotante con blur del fondo.

Quick Actions es un panel de acción rápida, no navegación principal.

Clasificación: REAL MVP.

### **Acciones explícitas o mencionadas**

| Acción | Fuente | Clasificación |
| ----- | ----- | ----- |
| Crear tarea | Quick Actions / Planner | REAL MVP |
| Crear evento | Quick Actions / Planner | REAL MVP |
| Invitar miembro | Quick Actions/Search según source map | REAL MVP |
| Crear gasto | Modal corto mencionado como ejemplo | DEMO PREMIUM |
| Confirmar check-in | Modal corto mencionado como ejemplo | DEMO PREMIUM |
| Geni | Elemento fijo del menú; abre pantalla completa | DEMO PREMIUM / POST\_MVP |
| SOS | No está en Quick Actions; tiene swipe ↑ global | POST\_MVP / demo separada |

### **Geni en Quick Actions**

* Geni es el único elemento fijo.  
* Al tocar Geni, abre pantalla completa de Geni.  
* Geni no tiene tab propio en Bottom Nav.  
* Geni no tiene botón global dedicado.

Clasificación:

* Acceso visual a Geni: DEMO PREMIUM.  
* IA real: POST\_MVP.

### **SOS**

* SOS no está en Quick Actions.  
* SOS tiene acceso propio mediante swipe ↑ global.

Clasificación: DEMO PREMIUM / POST\_MVP.

---

## **14\. Módulos demo premium**

### **Finance**

Información encontrada:

* Administra economía personal y familiar.  
* Entidades: Cuentas, Gastos, Ingresos, Fondos, Presupuestos, Deudas, Metas financieras.  
* More muestra Finance como módulo especializado.  
* Finance no posee widget permanente en Home.  
* Aparece en Home cuando existe pago vencido, presupuesto excedido, meta en riesgo o fondo completado.  
* Geni Finance puede detectar patrones y hacer recomendaciones.

Clasificación:

* Finance demo visual: DEMO PREMIUM.  
* Finance backend real: POST\_MVP.  
* Alertas financieras en Home: MOCK / DEMO PREMIUM.

Datos demo extraíbles:

* Efectivo.  
* Mercado Pago.  
* Banco.  
* Tarjeta.  
* Sueldo.  
* Regalo.  
* Venta.  
* Reembolso.  
* Delivery como ejemplo de patrón.  
* Vacaciones como ejemplo de fondo.  
* Pago vencido.  
* Presupuesto excedido.  
* Meta en riesgo.  
* Fondo completado.

### **Inventory**

Información encontrada:

* Administra consumibles y stock del hogar.  
* Entidades: Consumibles, Productos del hogar, Medicamentos.  
* Puede crear tareas en Planner cuando falta stock.  
* No posee widget permanente en Home.  
* Aparece cuando existe falta de stock, producto crítico o medicamento próximo a vencer.

Clasificación:

* Inventory demo visual: DEMO PREMIUM.  
* Inventory real: POST\_MVP.  
* Relación Inventory → Task: POST\_MVP / demo visual.

Datos demo extraíbles:

* Leche.  
* Arroz.  
* Fideos.  
* Aceite.  
* Sal.  
* Azúcar.  
* Shampoo.  
* Jabón.  
* Papel higiénico.  
* Detergente.  
* Lavandina.  
* Medicamentos.  
* Stock mínimo.  
* Vencimiento.

### **Assets**

Información encontrada:

* Administra activos importantes del hogar.  
* Categorías: Vehículos, Mascotas, Dispositivos, Propiedades.  
* Puede generar tareas de mantenimiento.  
* No posee widget permanente en Home.  
* Aparece cuando hay mantenimiento pendiente, vencimiento próximo o documentación faltante.

Clasificación:

* Assets demo visual: DEMO PREMIUM.  
* Assets backend real: POST\_MVP.  
* Assets → Task: POST\_MVP / demo visual.

Datos demo extraíbles:

* Vehículo.  
* Mascota.  
* Dispositivo.  
* Propiedad.  
* Seguro.  
* Cédula.  
* Título.  
* VTV.  
* Cambio de aceite.  
* Service.  
* Limpieza.  
* Vacunas.  
* Controles.  
* Baño.  
* Alimentación.  
* Notebook.  
* PC.  
* Tablet.  
* Celular.  
* Consola.  
* Casa.  
* Departamento.  
* Terreno.

### **HomeCloud / FamilyCloud**

Información encontrada:

* Memoria documental y emocional de la familia.  
* Se organiza por álbumes, recuerdos y eventos, no por carpetas técnicas.  
* Documentos pueden vincularse con eventos, personas, activos, gastos.  
* More muestra HomeCloud como módulo especializado.  
* Los recuerdos se heredan del evento de Calendar en V1; no existe asignación manual de personas en V1.

Clasificación:

* HomeCloud demo visual: DEMO PREMIUM.  
* Storage/OCR/versionado real: POST\_MVP.  
* Relación evento → recuerdo/álbum: POST\_MVP / demo visual.

### **Presence**

Información encontrada:

* Coordina disponibilidad, ubicación y movimientos relevantes.  
* Contiene Estado, Ubicación, Check-ins, Lugares y Coordinación.  
* No debe sentirse como vigilancia.  
* Presence vive dentro de People.  
* Presence no posee widget permanente en Home.  
* Aparece mediante Briefing, Atención Requerida o widgets contextuales.

Clasificación:

* Presence demo: DEMO PREMIUM / MOCK.  
* GPS real, geocercas, historial, mapas: POST\_MVP.

Datos demo extraíbles:

* En casa.  
* En trabajo.  
* En escuela.  
* En tránsito.  
* No molestar.  
* Descansando.  
* Estudiando.  
* Trabajando.  
* Casa.  
* Escuela.  
* Trabajo.  
* Club.  
* Parada de colectivo.  
* Hospital.  
* Gimnasio.  
* Llegué.  
* Ya estoy en el club.  
* Ya estoy en la escuela.

### **Geni**

Información encontrada:

* Capa transversal.  
* No tiene tab dedicado.  
* Acceso principal vía Quick Actions.  
* Home usa Geni para Briefing.  
* Search usa Geni.  
* Planner, Finance, HomeCloud y Automatizaciones pueden usar Geni.  
* Pantalla Geni:  
  * Chat.  
  * Acciones sugeridas.  
  * Insights familiares.  
  * Historial.  
  * Configuración IA.

Clasificación:

* Geni demo visual: DEMO PREMIUM.  
* IA real, memoria, recomendaciones reales, automatizaciones: POST\_MVP.  
* Briefing Home: MOCK.

### **Feed**

Información encontrada:

* Vive dentro de People.  
* No tiene tab independiente.  
* Contiene Actividad generada por el sistema y Temas.  
* Todo es un Post en Feed.  
* Feed refuerza coordinación y memoria familiar.

Clasificación:

* Feed demo visual: DEMO PREMIUM.  
* Feed real completo: POST\_MVP.

### **SOS**

Información encontrada:

* Sistema de emergencias.  
* Tiene niveles de alerta.  
* No está en Quick Actions.  
* Acceso por swipe ↑ global.  
* Prioridad máxima en Home.  
* Nunca puede silenciarse.

Clasificación:

* SOS visual/demo: DEMO PREMIUM.  
* Emergencia real, notificaciones reales, ubicación real: POST\_MVP.

### **Automations**

Información encontrada:

* Motor SI-ENTONCES.  
* Triggers desde múltiples dominios.  
* Geni puede sugerir automatizaciones.  
* Toda automatización genera trazabilidad.

Clasificación:

* Automations demo visual: DEMO PREMIUM.  
* Automatizaciones reales: POST\_MVP.

### **Goals**

Información encontrada:

* Vive dentro de Planner.  
* Goal → Hitos → Tasks.  
* Estados: Activa, Completada, Fallida.  
* Puede relacionarse con Finance, Tasks y Fondos.

Clasificación:

* Goals demo visual: DEMO PREMIUM.  
* Goals real: POST\_MVP.

### **Notifications**

Información encontrada:

* Push, email e in-app.  
* Mantiene informadas a las personas sin generar ruido.  
* SOS no puede silenciarse.  
* Puede afectar Planner/Calendar.

Clasificación:

* Indicadores visuales o badges: DEMO PREMIUM.  
* Push/email reales: POST\_MVP.

### **Search**

Información encontrada:

* Search puede indexar Settings.  
* Search usa Geni.  
* Search puede funcionar como acceso rápido.

Clasificación:

* Search demo: DEMO PREMIUM.  
* Search real global/Geni real: POST\_MVP.

### **Activity**

Información encontrada:

* Feed contiene Actividad generada por el sistema.  
* Home contiene Actividad Familiar.  
* Auditoría registra cambios importantes.

Clasificación:

* Activity mock en Home/People: MOCK / DEMO PREMIUM.  
* Auditoría real/activity stream real: POST\_MVP.

### **Load / Carga Familiar**

Información encontrada:

* Home contiene Carga Familiar.  
* LoadMetric aparece como entidad de sistema.  
* Task puede recalcular LoadMetric al completarse, reasignarse o cancelarse en relaciones ocultas del archivo de comprensión.

Clasificación:

* Carga Familiar mock: MOCK.  
* Cálculo real: POST\_MVP.

---

## **15\. Estados UX y feedback**

### **Estados de entidades encontrados**

| Entidad / módulo | Estados | Clasificación |
| ----- | ----- | ----- |
| Membership | Pendiente, Activa, Suspendida, Finalizada | REAL MVP |
| Task | Pendiente, En progreso, Completada, Cancelada | REAL MVP / requiere ajuste |
| Task vencida | Calculada automáticamente, no manual | REAL MVP |
| Event | Programado, Completado, Cancelado | REAL MVP |
| Goal | Activa, Completada, Fallida | POST\_MVP / DEMO |
| Finance/Fund | Activo, Completado, Cerrado | DEMO PREMIUM |
| Debt | Activa, Pagada, Vencida | DEMO PREMIUM |
| InventoryItem | Activo, Archivado | DEMO PREMIUM |
| Asset | Activo, Inactivo, Archivado | DEMO PREMIUM |
| Pet | Activa, Fallecida, Archivada | DEMO PREMIUM |
| Automation | Activa, Pausada, Archivada | POST\_MVP |
| Empleado Familiar | Activo, Suspendido, Finalizado | POST\_MVP |

### **Estados UX explícitos o deducidos directamente**

| Estado UX | Dónde aplica | Clasificación |
| ----- | ----- | ----- |
| Pending / pendiente | Membership, invitaciones, aprobaciones | REAL MVP |
| Approved / aprobado | Aprobación de ingreso conceptual | REAL MVP |
| Rejected / rechazado | No explícito como estado, pero rechazo de ingreso puede existir en MVP externo; no definido aquí | Faltante |
| Suspended / suspendido | Membership | REAL MVP conceptual |
| Finalized / finalizado | Membership | REAL MVP conceptual |
| Completed / completado | Task/Event | REAL MVP |
| Cancelled / cancelado | Task/Event | REAL MVP |
| Overdue / vencido | Task calculada, pagos/deudas demo | REAL MVP para tareas; DEMO para finanzas |
| Empty / sin tareas | Home “Todo al día” | REAL MVP |
| Expanded/collapsed | Briefing resumido/ampliado | MOCK / DEMO |
| Forbidden / sin permiso | Invitado solo contexto autorizado; roles no acceden a privado | REAL MVP conceptual |
| Disabled | No especificado | Faltante |
| Loading | No encontrado | Faltante |
| Error | No encontrado | Faltante |
| Success | No encontrado | Faltante |
| Retry | No encontrado | Faltante |
| Offline | Aparece como módulo/system, pero implementación fuera de alcance | POST\_MVP |
| Conflict | Last Write Wins offline | POST\_MVP |
| Realtime update | No encontrado explícito | Faltante |

---

## **16\. Formularios y datos de entrada**

### **Formularios explícitos o inferibles por acción**

| Formulario | Campos encontrados | Botones / acciones | Clasificación | Notas |
| ----- | ----- | ----- | ----- | ----- |
| Login | No encontrado | No encontrado | REAL MVP requerido, faltante en documento | No hay UI ni campos |
| Register | No encontrado | No encontrado | REAL MVP requerido, faltante en documento | No hay UI ni campos |
| Forgot password | No encontrado | No encontrado | Faltante | No definido |
| Create Household | No hay campos formales | Crear hogar conceptual | REAL MVP requerido, faltante | Hogar existe, pero no formulario |
| Invite Member | No hay campos formales | Invitar miembro | REAL MVP parcial | Adulto puede invitar; falta link/código/token |
| Join Household | No encontrado | Aceptar invitación conceptual | REAL MVP parcial | Falta UI |
| Profile | Nombre, apellido, foto, fecha de nacimiento, género opcional, contacto | Editar perfil no detallado | REAL MVP parcial |  |
| Create Task | Título, descripción, responsable, fecha de inicio, fecha vencimiento, prioridad, estado, responsabilidad, goal, archivos, comentarios | Crear tarea | REAL MVP parcial | Usar solo campos básicos para MVP |
| Edit Task | Mismos campos de tarea | Editar tarea | REAL MVP parcial | Sin validaciones |
| Create Event | No hay campos formales | Crear evento | REAL MVP parcial | Falta título/fecha/hora |
| Edit Event | Modificar fecha al postergar | Editar fecha | REAL MVP parcial | Sin formulario |
| Settings | Hogar, Cuenta, Sistema, Auditoría | Abrir secciones | DEMO PREMIUM / REAL parcial | No hay inputs |
| Create Expense | No detallado en navegación como modal corto; Finance tiene monto, fecha, cuenta, categoría, responsable | Crear gasto demo | DEMO PREMIUM |  |
| Check-in | No hay campos; ejemplos “Llegué” | Confirmar check-in | DEMO PREMIUM |  |
| Upload Document | Documentos/HomeCloud menciona documentos | Subir demo | DEMO PREMIUM / POST\_MVP |  |

### **Validaciones y errores**

No se encontraron validaciones frontend específicas.

No se encontraron mensajes de error concretos.

No se encontraron defaults técnicos de formularios.

---

## **17\. Datos demo extraíbles**

| Dato / ejemplo | Módulo | Uso posible | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Roles | Role pill/member card | REAL MVP |
| Adulto | Roles | Role pill/member card | REAL MVP |
| Adolescente | Roles | Role pill/member card | REAL MVP |
| Niño | Roles | Role pill/member card | REAL MVP |
| Adulto Mayor | Roles | Role pill/member card | REAL MVP |
| Invitado | Roles | Role pill/member card | REAL MVP |
| Empleado Familiar | Roles | Demo/futuro | POST\_MVP |
| Pendiente | Membership/Task | Status pill | REAL MVP |
| Activa | Membership | Status pill | REAL MVP |
| Suspendida | Membership | Status pill | REAL MVP |
| Finalizada | Membership | Status pill | REAL MVP |
| En progreso | Task | Status pill | REAL MVP / riesgo |
| Completada | Task/Event | Status pill | REAL MVP |
| Cancelada | Task/Event | Status pill | REAL MVP |
| Programado | Event | Status pill | REAL MVP |
| Baja | Task prioridad | Priority pill | REAL MVP |
| Media | Task prioridad | Priority pill | REAL MVP |
| Alta | Task prioridad | Priority pill | REAL MVP |
| Crítica | Task prioridad | Priority pill | REAL MVP |
| Compras | Responsabilidad | Task category/chip | REAL MVP |
| Mascotas | Responsabilidad | Task category/chip | REAL MVP |
| Limpieza | Responsabilidad | Task category/chip | REAL MVP |
| Vehículos | Responsabilidad | Task category/chip | REAL MVP |
| Comprar ingredientes | Task ejemplo | Demo task | DEMO PREMIUM |
| Cocinar cena | Task ejemplo | Demo task con dependencia visual futura | POST\_MVP |
| Comprar alimento perro | Task ejemplo | Demo task | DEMO PREMIUM |
| Casa | Presence/Place | Presence demo | DEMO PREMIUM |
| Escuela | Presence/Place | Presence demo | DEMO PREMIUM |
| Trabajo | Presence/Place | Presence demo | DEMO PREMIUM |
| Club | Presence/Place | Presence demo | DEMO PREMIUM |
| Hospital | Presence/Place | Presence demo | DEMO PREMIUM |
| Gimnasio | Presence/Place | Presence demo | DEMO PREMIUM |
| En casa | Presence status | Presence chip | DEMO PREMIUM |
| En trabajo | Presence status | Presence chip | DEMO PREMIUM |
| En escuela | Presence status | Presence chip | DEMO PREMIUM |
| En tránsito | Presence status | Presence chip | DEMO PREMIUM |
| No molestar | Presence status | Presence chip | DEMO PREMIUM |
| Descansando | Presence status | Presence chip | DEMO PREMIUM |
| Estudiando | Presence status | Presence chip | DEMO PREMIUM |
| Trabajando | Presence status | Presence chip | DEMO PREMIUM |
| Llegué | Check-in | Button/action demo | DEMO PREMIUM |
| Ya estoy en el club | Check-in | Activity demo | DEMO PREMIUM |
| Ya estoy en la escuela | Check-in | Activity demo | DEMO PREMIUM |
| Efectivo | Finance cuenta | Finance card demo | DEMO PREMIUM |
| Mercado Pago | Finance cuenta | Finance card demo | DEMO PREMIUM |
| Banco | Finance cuenta | Finance card demo | DEMO PREMIUM |
| Tarjeta | Finance cuenta | Finance card demo | DEMO PREMIUM |
| Sueldo | Finance ingreso | Demo data | DEMO PREMIUM |
| Regalo | Finance ingreso | Demo data | DEMO PREMIUM |
| Venta | Finance ingreso | Demo data | DEMO PREMIUM |
| Reembolso | Finance ingreso | Demo data | DEMO PREMIUM |
| Vacaciones | Fund ejemplo | Finance/Goals demo | DEMO PREMIUM |
| Delivery | Finance insight | Geni/Finance demo copy | DEMO PREMIUM |
| Leche | Inventory | Item demo | DEMO PREMIUM |
| Arroz | Inventory | Item demo | DEMO PREMIUM |
| Fideos | Inventory | Item demo | DEMO PREMIUM |
| Aceite | Inventory | Item demo | DEMO PREMIUM |
| Sal | Inventory | Item demo | DEMO PREMIUM |
| Azúcar | Inventory | Item demo | DEMO PREMIUM |
| Shampoo | Inventory | Item demo | DEMO PREMIUM |
| Jabón | Inventory | Item demo | DEMO PREMIUM |
| Papel higiénico | Inventory | Item demo | DEMO PREMIUM |
| Detergente | Inventory | Item demo | DEMO PREMIUM |
| Lavandina | Inventory | Item demo | DEMO PREMIUM |
| Medicamentos | Inventory | Item demo | DEMO PREMIUM |
| Vehículos | Assets | Asset category | DEMO PREMIUM |
| Mascotas | Assets | Asset category | DEMO PREMIUM |
| Dispositivos | Assets | Asset category | DEMO PREMIUM |
| Propiedades | Assets | Asset category | DEMO PREMIUM |
| Seguro | Assets/HomeCloud | Documento/vencimiento demo | DEMO PREMIUM |
| Cédula | Assets/HomeCloud | Documento demo | DEMO PREMIUM |
| Título | Assets/HomeCloud | Documento demo | DEMO PREMIUM |
| VTV | Assets/HomeCloud | Vencimiento demo | DEMO PREMIUM |
| Cambio de aceite | Assets/Tasks | Maintenance task demo | DEMO PREMIUM |
| Service | Assets | Maintenance demo | DEMO PREMIUM |
| Vacunas | Assets/Pets | Pet maintenance demo | DEMO PREMIUM |
| Notebook | Assets/Device | Device demo | DEMO PREMIUM |
| PC | Assets/Device | Device demo | DEMO PREMIUM |
| Tablet | Assets/Device | Device demo | DEMO PREMIUM |
| Celular | Assets/Device | Device demo | DEMO PREMIUM |
| Consola | Assets/Device | Device demo | DEMO PREMIUM |
| Casa | Assets/Property | Property demo | DEMO PREMIUM |
| Departamento | Assets/Property | Property demo | DEMO PREMIUM |
| Terreno | Assets/Property | Property demo | DEMO PREMIUM |
| Todo al día | Home empty state | Empty state positivo | REAL MVP |
| Mis tareas | Home/Planner nav label | Card/link | REAL MVP |
| Próximos eventos | Home/Calendar label | Card/link | REAL MVP |
| Atención Requerida | Home block | Urgent block | REAL MVP / DEMO |
| Briefing Geni | Home block | Mock card | MOCK |
| Carga Familiar | Home block | Mock metric | MOCK |
| Presence Resumido | Home block | Mock presence | MOCK |
| Actividad Familiar | Home block | Mock activity | MOCK |

---

## **18\. Servicios frontend / APIs / datos**

No se encontró contrato API explícito en este documento.

### **Acciones mencionadas sin endpoint**

| Acción | Módulo | Estado |
| ----- | ----- | ----- |
| Register | Auth | No encontrado |
| Login | Auth | No encontrado |
| Refresh Token | Auth | No encontrado |
| Logout | Auth | No encontrado |
| Crear hogar | Household | Conceptual, sin endpoint |
| Invitar miembro | Invitations | Acción mencionada, sin contrato |
| Aceptar invitación | Invitations | Flujo mencionado, sin contrato |
| Aprobar ingreso | Membership | Permiso Coordinador, sin contrato |
| Cambiar rol | Roles | Acción mencionada, sin contrato |
| Expulsar miembro | Membership | Acción mencionada, sin contrato |
| Crear tarea | Tasks | Acción mencionada, sin contrato |
| Editar tarea | Tasks | Acción mencionada, sin contrato |
| Completar tarea | Tasks | Acción mencionada, sin contrato |
| Reasignar tarea | Tasks | Acción mencionada, sin contrato |
| Verificar tarea | Tasks | Conceptual, contradictorio, sin contrato |
| Crear evento | Events | Acción mencionada, sin contrato |
| Editar evento / modificar fecha | Events | Acción conceptual, sin contrato |
| Listar calendario | Calendar | Conceptual, sin contrato |
| Ver Home | Home | Conceptual, sin contrato |

### **Pistas para services frontend**

Sin inventar endpoints, el documento sí permite identificar fuentes de datos necesarias:

* Home necesita leer tareas, eventos, miembros, briefing mock, carga mock, presence mock y activity mock.  
* Planner necesita listar Tasks y Events.  
* Tasks necesita crear/completar/editar/asignar/reasignar.  
* Calendar necesita listar eventos y próximos eventos.  
* People necesita lista de miembros y perfiles.  
* Invitations necesita invitar, aceptar, aprobar.  
* Settings necesita leer perfil/hogar/roles.  
* More necesita módulos y estados secundarios.  
* Módulos demo pueden usar mock/local.

### **Backend/API faltante**

* Endpoints.  
* Métodos.  
* Request.  
* Response.  
* Errores.  
* Paginación.  
* Supabase.  
* Auth token.  
* Realtime.  
* Storage.  
* RLS técnico.  
* Household activo técnico.

---

## **19\. Realtime / sincronización visible**

### **Información encontrada**

El documento no define realtime explícito entre dispositivos.

Sí define:

* Acciones importantes auditables.  
* Home se reorganiza cuando las tareas se completan.  
* Cambios importantes pueden ampliar/regenerar Briefing.  
* Offline sync existe en el sistema, pero fuera de MVP.  
* Last Write Wins como decisión offline futura.  
* Cada hogar funciona como entidad independiente.

### **Pantallas que deberían actualizarse si se implementa sincronización**

| Evento conceptual | Pantallas afectadas | Clasificación |
| ----- | ----- | ----- |
| Tarea creada | Planner Tasks, Home Tareas, Home Briefing mock | REAL MVP si hay backend |
| Tarea completada | Planner Tasks, Home Tareas, Carga Familiar mock | REAL MVP |
| Tarea reasignada | Planner Tasks, Perfil persona, Home Carga Familiar mock | REAL MVP parcial |
| Evento creado | Calendar, Home Próximos Eventos | REAL MVP |
| Evento cancelado/modificado | Calendar, Home Próximos Eventos, Briefing mock | REAL MVP parcial / POST\_MVP |
| Miembro invitado | People/Members, Settings/Hogar, Home Atención Requerida si pendiente | REAL MVP |
| Miembro aprobado | People/Members, Home, Planner asignaciones | REAL MVP |
| Rol cambiado | People, Settings/Hogar, permisos visibles | REAL MVP parcial |
| Check-in demo | People/Presence, Home Presence mock | DEMO PREMIUM |
| Pago vencido demo | Home Atención Requerida, Finance demo | DEMO PREMIUM |
| Stock bajo demo | Home Atención Requerida, Inventory demo | DEMO PREMIUM |

### **Faltante**

* No hay realtime técnico.  
* No hay Supabase subscriptions.  
* No hay broadcast.  
* No hay optimistic update.  
* No hay retry.  
* No hay conflicto de edición real para MVP.

---

## **20\. Permisos visibles en UI**

### **Reglas generales**

* La privacidad individual prevalece.  
* Ningún rol obtiene acceso automático a datos privados.  
* Relaciones familiares son informativas y no modifican permisos automáticamente.  
* Geni no ignora permisos; su output se filtra por permisos del miembro que consulta.

### **Permisos por rol que afectan UI**

| Rol | Botones/acciones visibles | Botones/acciones ocultos o restringidos | Clasificación |
| ----- | ----- | ----- | ----- |
| Coordinador | Aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación, administrar configuración de hogar | Eliminar hogar | REAL MVP parcial |
| Adulto | Invitar personas, crear tareas, reasignar tareas, crear eventos, administrar operaciones familiares | Aprobar ingresos | REAL MVP |
| Adolescente | Crear eventos familiares, administrar tareas propias, crear gastos demo | Gestión del hogar no definida | REAL MVP parcial / DEMO |
| Niño | Tareas, logros, recordatorios | Información familiar crítica | DEMO PREMIUM / REAL parcial |
| Adulto Mayor | Personas, eventos, recordatorios, medicación, coordinación, tareas, briefing | No definido | REAL parcial / DEMO |
| Invitado | Contexto autorizado, acceso mínimo | Navegación completa | REAL parcial |
| Empleado Familiar | Trabajo asignado | Administrar hogar, decisiones familiares | POST\_MVP |

### **Faltantes de permisos**

* Quién puede editar tarea.  
* Quién puede eliminar tarea.  
* Quién puede verificar tarea.  
* Quién puede cancelar evento.  
* Quién puede editar evento.  
* Quién puede elegir rol al invitar.  
* Qué ve exactamente un invitado.  
* Qué acciones se deshabilitan vs se ocultan.  
* Permisos finos configurables.

---

## **21\. Integraciones visibles entre módulos**

| Relación frontend | Descripción | Clasificación |
| ----- | ----- | ----- |
| Home → Planner | Mis tareas/Tareas llevan a Planner | REAL MVP |
| Home → Calendar | Próximos eventos llevan a Calendar | REAL MVP |
| Home → Goals | Meta lleva a Goals | DEMO PREMIUM / POST\_MVP |
| Home → Finance | Presupuesto excedido lleva a Finance | DEMO PREMIUM |
| Home → Presence | Presence Resumido aparece contextual | MOCK / DEMO |
| Home → Attention Required | Tareas vencidas, pagos, aprobaciones, vencimientos | REAL MVP \+ DEMO |
| Home → Briefing | Briefing resume Planner, Finance, Presence, Goals, Eventos, Alertas | MOCK |
| Planner → People | Tareas tienen responsable; eventos participantes | REAL MVP |
| People → Planner | Perfil individual muestra tareas y eventos | REAL MVP parcial |
| Quick Actions → Planner | Crear tarea, crear evento | REAL MVP |
| More → Finance | Card de Finance | DEMO PREMIUM |
| More → Inventory | Card de Inventory | DEMO PREMIUM |
| More → HomeCloud | Card de HomeCloud | DEMO PREMIUM |
| More → Settings | Card de Settings | REAL MVP parcial / DEMO |
| Settings → Household | Miembros, roles, responsabilidades, permisos | REAL MVP parcial |
| Inventory → Tasks | Stock bajo puede crear tarea | POST\_MVP / demo visual |
| Assets → Tasks | Mantenimiento puede crear tarea | POST\_MVP / demo visual |
| Finance → Home | Alertas financieras condicionales | DEMO PREMIUM |
| Presence → Home | Briefing, Atención Requerida o widget contextual | MOCK / DEMO |
| Geni → Home | Briefing | MOCK / POST\_MVP |
| Geni → Quick Actions | Acceso fijo | DEMO PREMIUM |
| Geni → Planner | Organizar tareas/eventos/metas | POST\_MVP / DEMO |
| Calendar → HomeCloud | Recuerdos heredados del evento | POST\_MVP |
| SOS → Home | Prioridad máxima, desplaza contenido | POST\_MVP / demo visual |
| Search → Settings | Acceso rápido a configuración | DEMO PREMIUM |
| Search → Geni | Search usa Geni | POST\_MVP / DEMO |

---

## **22\. Edge cases frontend**

| Edge case | Documento lo cubre | Comportamiento frontend extraíble | Clasificación |
| ----- | ----- | ----- | ----- |
| Usuario sin hogar | No directamente | Faltante | REAL MVP faltante |
| Usuario pendiente de aprobación | Membership Pendiente | Mostrar estado pendiente / limitar acceso | REAL MVP |
| Miembro suspendido | Membership Suspendida | Restringir/indicar estado | REAL MVP conceptual |
| Miembro finalizado | Membership Finalizada | Ocultar de activos / conservar historial | REAL MVP conceptual |
| Invitación expirada | No encontrado | Faltante | REAL MVP faltante |
| Invitación ya usada | No encontrado | Faltante | REAL MVP faltante |
| Aprobación pendiente | Atención Requerida menciona aprobaciones pendientes | Mostrar en Home | REAL MVP |
| Adulto intenta aprobar ingreso | Adulto no puede aprobar | Ocultar/deshabilitar acción | REAL MVP |
| Coordinador intenta eliminar hogar | Coordinador no puede eliminar hogares | Ocultar/deshabilitar acción | REAL MVP |
| Último coordinador | No encontrado | Faltante | REAL MVP faltante |
| Tarea vencida | Vencida calculada automáticamente | Mostrar como vencida sin estado manual | REAL MVP |
| Tarea completada | Tareas completadas reorganizan Home | Quitar/reducir widget, mostrar actualizado | REAL MVP |
| Tarea a verificar | Documento dice verificación opcional sin estado separado | Riesgo/contradicción | REAL MVP faltante |
| Evento cancelado | Estado Cancelado | Mostrar como cancelado | REAL MVP |
| Evento postergado | No existe Postergado; modificar fecha | No mostrar estado “Postergado” | REAL MVP |
| Sin tareas | Card “Todo al día” | Empty state positivo | REAL MVP |
| Sin eventos | No encontrado | Faltante | REAL MVP faltante |
| Responsabilidad sin miembros | No encontrado | Faltante | REAL MVP faltante |
| Privacidad | Roles no acceden a privado automáticamente | Ocultar contenido privado | REAL MVP conceptual |
| Multi-hogar con 1 hogar | No mostrar selector | Header limpio con Avatar | POST\_MVP / REAL conceptual |
| Multi-hogar con 2+ hogares | Mostrar selector con hogar activo | Header dropdown | POST\_MVP |
| SOS activo | SOS desplaza contenido | Prioridad máxima en Home | POST\_MVP / demo visual |
| Offline conflict | Last Write Wins | No implementar ahora | POST\_MVP |
| Error de red | No encontrado | Faltante | REAL MVP faltante |
| Loading | No encontrado | Faltante | REAL MVP faltante |
| Retry | No encontrado | Faltante | REAL MVP faltante |

---

## **23\. Copywriting y labels**

### **Labels de navegación**

* Home.  
* People.  
* `+`.  
* Planner.  
* More.  
* Tasks.  
* Calendar.  
* Goals.  
* Finance.  
* Inventory.  
* HomeCloud.  
* Settings.  
* Geni.  
* SOS.

### **Labels de Home**

* Briefing Geni.  
* Atención Requerida.  
* Carga Familiar.  
* Próximos Eventos.  
* Tareas.  
* Finanzas Relevantes.  
* Presence Resumido.  
* Actividad Familiar.  
* Todo al día.  
* Mis tareas.

### **Labels de Planner**

* Todas.  
* Mías.  
* Familia.  
* Recurrentes.  
* Completadas.  
* Responsabilidad.  
* Prioridad.  
* Fecha.  
* Task Detail.  
* Edit Task.  
* History.

### **Labels de People**

* Feed.  
* Actividad.  
* Temas.  
* Presence.  
* Estado.  
* Ubicación.  
* Check-ins.  
* Lugares.  
* Coordinación.  
* Personas.  
* Lista de miembros.  
* Perfil individual.  
* Resumen.  
* Tareas.  
* Eventos.  
* Responsabilidades.

### **Labels de Settings**

* Hogar.  
* Miembros.  
* Roles.  
* Responsabilidades.  
* Permisos.  
* Integraciones.  
* Cuenta.  
* Perfil.  
* Seguridad.  
* Privacidad.  
* Sistema.  
* Notificaciones.  
* Offline.  
* Multi-Hogar.  
* Auditoría.

### **Roles**

* Coordinador.  
* Adulto.  
* Adolescente.  
* Niño.  
* Adulto Mayor.  
* Invitado.  
* Empleado Familiar.

### **Estados**

* Pendiente.  
* Activa.  
* Suspendida.  
* Finalizada.  
* En progreso.  
* Completada.  
* Cancelada.  
* Programado.  
* Completado.  
* Cancelado.  
* Activo.  
* Archivado.  
* Inactivo.  
* Pausada.  
* Cerrado.  
* Pagada.  
* Vencida.

### **Prioridades**

* Baja.  
* Media.  
* Alta.  
* Crítica.

### **Copy/frases conceptuales útiles**

* “Home no administra información. Solo la resume y redirige.”  
* “Toco información → voy al módulo correspondiente.”  
* “¿Cómo está el hogar?”  
* “¿Qué requiere atención?”  
* “¿Qué debo hacer yo?”  
* “¿Hay riesgo?”  
* “Necesito hacer esto.”  
* “Todo al día.”

No se encontraron textos concretos de errores, botones de formularios, mensajes de éxito, mensajes de loading ni onboarding copy.

---

## **24\. Restricciones técnicas frontend**

### **Encontrado**

* Mobile-first absoluto.  
* Tablet: 2 columnas.  
* Desktop sidebar: pendiente.  
* Bottom Navigation V1 congelada.  
* Settings vive exclusivamente en More.  
* Geni no tiene tab propio ni botón global.  
* SOS no vive en Bottom Nav ni Quick Actions.  
* SOS se accede mediante swipe ↑ global.  
* More no contiene dashboards.  
* Máximo 5 tabs por dominio.  
* Más de 4 niveles de navegación es fallo.  
* 95% de acciones deben resolverse en 3 niveles o menos.  
* Modales solo para acciones cortas.  
* Drawers con uso extremadamente limitado.  
* Responsabilidades no son dominio independiente.  
* Goals vive dentro de Planner.  
* Finance, Inventory y HomeCloud viven en More.  
* Feed y Presence viven dentro de People.  
* Home resume; módulos administran.  
* Cada hogar funciona como entidad independiente.  
* No navegación cruzada entre hogares.  
* Geni no puede marcar tareas completadas automáticamente.  
* La verificación es responsabilidad humana.  
* Las tareas vencidas se calculan automáticamente.  
* Last Write Wins para offline aparece como decisión futura.  
* Offline conserva autor, fecha original y fecha de sincronización, pero queda POST\_MVP.

### **No encontrado**

* Stack técnico React Native/Expo.  
* Supabase.  
* Realtime.  
* Storage.  
* Auth técnico.  
* Edge Functions.  
* Librerías disponibles.  
* Librerías ausentes.  
* Performance budgets.  
* Haptics.  
* Animaciones.  
* Accesibilidad técnica.  
* Design tokens.  
* Theme system.

---

## **25\. Contradicciones o riesgos**

| Riesgo / contradicción | Dónde aparece | Impacto frontend | Recomendación para fusión futura |
| ----- | ----- | ----- | ----- |
| Auth obligatorio pero no definido | Source map indica no hay Auth real, endpoints ni tokens | Faltan pantallas y estados de Login/Register | Usar otros documentos para Auth |
| Tasks states vs Verification Flow MVP | Documento: Pendiente/En progreso/Completada/Cancelada; verificación sin estado separado | Puede chocar con `awaiting_verification`/`verified` | Resolver en spec Planner final |
| Calendar MVP necesita día/semana/mes, pero documento no lo define | Planner/Calendar parcial | Faltan vistas | Usar fragment visual o definir luego |
| Event fields no definidos | Calendar solo habla de eventos familiares/personales, estados y participantes | Falta formulario | Usar otra fuente o definir campos mínimos luego |
| Task delete no aparece | Tasks | MVP puede requerir eliminar | No inventar desde este documento |
| Event delete no aparece | Events | MVP puede requerir eliminar | No inventar desde este documento |
| Roles oficiales son 7, MVP suele usar 6 | Roles incluye Empleado Familiar | Puede contaminar MVP | Marcar Empleado Familiar POST\_MVP |
| Adulto Mayor permisos equivalentes a Adulto salvo configuración | Roles | Ambiguo para botones visibles | Tratar como Adulto adaptado visualmente, confirmar después |
| Permisos configurables existen pero no se detallan | Roles | UI puede quedar incompleta | No implementar permisos finos ahora |
| Home tiene muchos bloques | Home | Riesgo de dashboard sobrecargado | Priorizar Briefing, Atención, Tareas, Eventos; mocks compactos |
| Geni aparece transversal y potente | Geni/Home/Quick Actions | Riesgo de prometer IA real | Usar Geni demo/mock |
| Presence aparece como ubicación real | Presence | GPS/geocercas fuera de MVP | Usar Presence mock |
| Finance/Inventory/Assets/HomeCloud tienen mucha info | Dominios secundarios | Riesgo de backend real innecesario | Solo demo premium |
| More no debe tener dashboards | More | Riesgo de meter dashboard financiero en More root | More solo cards/accesos |
| Multi-hogar real aparece como principio | Multi-Hogar | Puede complicar header y datos | MVP puede usar hogar activo; selector avanzado POST\_MVP |
| Offline aparece con conflictos | System | Complejidad técnica alta | POST\_MVP |
| Auditoría permanente aparece | Audit | No implementar auditoría completa visual | Usar activity/historial demo si hace falta |

---

## **26\. Información faltante**

| Falta | Por qué importa | Impacto |
| ----- | ----- | ----- |
| Pantallas Auth | Auth es REAL MVP | No se puede diseñar Login/Register desde este documento |
| Formularios Auth | Faltan campos y validaciones | Requiere otra fuente |
| Create Household UI | Household es REAL MVP | Falta pantalla/formulario |
| Join Household UI | Invitaciones son REAL MVP | Falta flujo visual |
| Invite Member UI | Falta token/link/campos | Requiere otra fuente |
| Pending approval UI | Aprobación aparece conceptual | Falta pantalla y copy |
| Members UI detallada | Lista básica aparece, no layout | Hay que definir después |
| Task card final | Tasks aparecen, no card visual | Requiere diseño posterior |
| Create Task form completo | Campos aparecen, pero no defaults/validaciones | Requiere decisión final |
| Verification UI | Hay contradicción de estados | Requiere decisión |
| Delete task | No aparece | No usar desde este documento |
| Event form | No hay campos | Requiere otra fuente |
| Calendar day/week/month | No aparece | Requiere otra fuente |
| Tasks with date in Calendar | No explícito | Requiere validación |
| Home visual layout | Bloques aparecen, no diseño visual | Requiere fragment visual |
| Briefing copy | No hay ejemplos exactos de copy | Se puede mockear con otra fuente |
| Módulos demo mock data completa | Hay ejemplos, pero no datasets listos | Requiere mock\_data\_fragment |
| Loading/error/success states | No aparecen | Requiere ux\_states\_fragment |
| Toasts/skeletons | No aparecen | Requiere definición visual |
| Design tokens | No aparecen | Requiere visual\_system\_fragment |
| Colores/tipografía/radios | No aparecen | Requiere visual fragment |
| Services/endpoints | No aparecen | Requiere backend/API docs |
| Realtime | No aparece | Requiere implementación o docs |
| Supabase/Auth technical | No aparece | Requiere docs técnicos |
| Permissions matrix completa | Parcial | Requiere roles\_permissions final |
| More module detail screens | Parcial | Requiere demo fragments |
| Accessibility | No aparece | Requiere definición |
| Search behavior | Parcial | Requiere Search fragment |
| SOS visual | Parcial | Requiere demo fragment |
| Offline behavior | Avanzado, no MVP | No implementar ahora |

---

## **27\. Fragments recomendados desde este documento**

| Fragment recomendado | Generar | Motivo |
| ----- | ----- | ----- |
| `visual_system_fragment` | Parcial | Hay principios visuales y navegación, pero faltan tokens, colores, spacing y tipografía. |
| `navigation_fragment` | Sí | Documento define Bottom Nav, niveles, tabs, stacks, modales, drawers, More, Settings, Quick Actions y navegación por rol. |
| `home_frontend_fragment` | Sí | Home está muy definido: rol, bloques, orden, navegación contextual, briefing, atención, tareas/eventos y reglas. |
| `planner_frontend_fragment` | Sí | Planner, Tasks, Calendar, Goals, filtros, agrupaciones y responsabilidades están definidos. |
| `people_members_frontend_fragment` | Sí | People, miembros, perfil individual, roles y relación con Planner aparecen. |
| `household_invites_frontend_fragment` | Parcial | Hogar, membresía e invitaciones aparecen, pero faltan formularios, tokens y APIs. |
| `auth_onboarding_frontend_fragment` | Parcial | Cuenta/Persona/Perfil y navegación por rol aparecen; Auth técnico no. |
| `quick_actions_frontend_fragment` | Sí | Botón `+`, blur, Geni fijo, acciones rápidas y exclusión de SOS están definidos. |
| `more_settings_frontend_fragment` | Sí | More y Settings tienen estructura clara. |
| `finance_demo_fragment` | Sí | Finance tiene suficientes entidades, ejemplos y relación con Home para demo premium. |
| `inventory_demo_fragment` | Sí | Inventory tiene categorías, items, stock bajo, medicamentos y relación con Home/Planner. |
| `assets_demo_fragment` | Sí | Assets tiene categorías, mantenimiento, documentos, vencimientos y conexión con Home/Planner. |
| `familycloud_demo_fragment` | Sí | HomeCloud tiene recuerdos, álbumes, documentos y relación con eventos. |
| `presence_demo_fragment` | Sí | Presence tiene estados, lugares, check-ins, Home contextual y filosofía no invasiva. |
| `geni_demo_fragment` | Sí | Geni tiene rol transversal, Briefing, Quick Actions y pantalla propia. |
| `mock_data_fragment` | Sí | El documento contiene muchos ejemplos útiles para mock data. |
| `ux_states_fragment` | Parcial | Hay estados de entidades y algunos empty/priority states, pero faltan loading/error/toast. |
| `frontend_services_fragment` | Parcial | No hay endpoints, pero sí acciones y fuentes de datos necesarias. |
| `roles_permissions_frontend_fragment` | Sí | Roles y permisos visibles están bien definidos a nivel conceptual. |
| `demo_modules_fragment` | Sí | Finance, Inventory, Assets, HomeCloud, Presence, Geni, Feed, SOS y Automations pueden extraerse como demo premium. |

---

## **28\. Conclusión operativa**

Este documento aporta una base fuerte para el frontend global premium del MVP de HomePlus.

Lo más valioso para la futura `frontend_premium_mvp_spec.md` es:

* Navegación V1 congelada: Home, People, `+`, Planner, More.  
* Home como pantalla inicial y centro operativo.  
* Regla “Home resume; módulos administran”.  
* Quick Actions con panel flotante y blur.  
* Planner como módulo diario real con Tasks y Calendar.  
* People como coordinación humana con miembros, perfil, Feed y Presence.  
* More como acceso a herramientas especializadas, no dashboards.  
* Settings dentro de More.  
* Experiencia por rol.  
* Tareas, eventos, miembros e invitaciones como núcleo real del MVP.  
* Finance, Inventory, Assets, HomeCloud, Presence, Geni, Feed, Goals, Automations y SOS como módulos demo/premium o POST\_MVP según alcance.  
* Principios de simplicidad visual, baja profundidad de navegación, mobile-first y reducción de carga mental.  
* Datos demo reutilizables para módulos secundarios.

Partes que deben usarse como REAL MVP:

* Home base con tareas/eventos/miembros cuando aplique.  
* Planner Tasks.  
* Planner Calendar/Events mínimo.  
* People/Members básico.  
* Household activo.  
* Invitations conceptuales.  
* Roles básicos.  
* Quick Actions para crear tarea/evento/invitar miembro.  
* Settings/Hogar básico si se necesita para miembros/roles.

Partes que deben usarse como DEMO PREMIUM / MOCK:

* Briefing Geni.  
* Carga Familiar.  
* Presence Resumido.  
* Actividad Familiar.  
* Finance.  
* Inventory.  
* Assets.  
* HomeCloud.  
* Geni.  
* Feed.  
* Goals visual.  
* Automations visual.  
* More/Settings avanzado.  
* Search.

Partes que deben quedar POST\_MVP:

* IA real.  
* Automatizaciones reales.  
* Offline sync.  
* GPS/geofencing.  
* OCR/storage real.  
* Adjuntos/comentarios/subtareas/dependencias reales.  
* Permisos finos.  
* Multi-hogar avanzado.  
* Notificaciones push reales.  
* Auditoría completa.  
* Recurrencia compleja.  
* Participantes avanzados.  
* SOS real.

Este fragment no define una UI final pixel-perfect ni contratos técnicos. Debe fusionarse con fragments visuales, specs de módulos, contratos backend/API y decisiones actuales del MVP para construir una especificación frontend premium implementable.

---

# **NOTAS PARA FUSIÓN POSTERIOR**

Cuando este master esté completo, analizarlo para producir:

1. `frontend_premium_design_system_v1.md`  
2. `frontend_navigation_shell_v1.md`  
3. `frontend_home_ux_final.md`  
4. `frontend_planner_ux_final.md`  
5. `frontend_auth_household_profile_polish.md`  
6. `frontend_antigravity_implementation_prompts.md`

---

# **REGLAS DE ANÁLISIS POSTERIOR**

Al analizar este master:

* No inventar funcionalidades.  
* No fusionar contradicciones sin marcarlas.  
* Separar REAL, MOCK, DEMO PREMIUM, POST-MVP e IGNORAR.  
* Priorizar MVP demo.  
* Mantener HomePlus cálido, familiar, premium y simple.  
* No convertir Home en dashboard.  
* No convertir Planner en panel administrativo.  
* Ocultar complejidad bajo demanda.  
* Mantener lógica real ya implementada.  
* No tocar backend salvo necesidad explícita.  
* No usar datos mock donde ya hay endpoints reales.

