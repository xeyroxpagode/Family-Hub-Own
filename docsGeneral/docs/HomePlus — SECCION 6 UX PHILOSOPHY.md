**\*\*Producto:\*\* HomePlus — Sistema Operativo del Hogar**

**\*\*Versión:\*\* 2.0 (reescritura tras auditoría contra Final Spec V1)**

**\*\*Fecha:\*\* Junio 2026**

**\*\*Dependencias:\*\* Final Spec V1 (documento maestro canónico), Sección 2 (Principios), Sección 4 (Emotional Design) — pendiente de recepción, Home Strategy, Design System V1 — pendiente de recepción, UX Writing Guide V1 — pendiente de recepción**

**\*\*Alcance:\*\* Mobile-first absoluto. Filosofía de interacción, no diseño visual.**

**> \*\*Principio rector:\*\* La complejidad del hogar debe resolverse mediante diseño y automatización. No trasladando configuraciones complejas al usuario (§02.06).**

**---**

**## 1. PRINCIPIOS DE INTERACCIÓN**

**Cada interacción en HomePlus responde a cinco principios. No son aspiracionales: son reglas de implementación. Si una pantalla o flujo viola uno de estos principios, el diseño está incompleto.**

**### 1.1 Regla del 1-tap**

**\*\*La acción principal de cada pantalla debe ejecutarse con un solo toque.\*\***

**| Pantalla / Dominio | Acción principal | Cómo se ejecuta |**

**|---|---|---|**

**| Home | Ver briefing diario | Visible al abrir. Sin scroll. Sin tap. |**

**| Tasks (Planner) | Completar tarea asignada | Checkbox táctil en el list item. Sin abrir detalle. |**

**| Calendar (Planner) | Ver evento del día | Primer item de la lista, expandido por defecto. |**

**| Finance (More) | Registrar gasto rápido | Botón `+` flotante en zona de pulgar. |**

**| Inventory (More) | Ver stock bajo / medicación pendiente | Card superior con acción directa si hay alerta. |**

**| HomeCloud (More) | Ver último álbum o recuerdo | Card de acceso rápido si hay contenido reciente. |**

**| Feed (People) | Ver actividad reciente | Lista cronológica. Primer post expandido. |**

**| Presence (People) | Ver quién está en casa | Card de estado. Sin scroll si ≤4 personas. |**

**| SOS | Activar alerta | Swipe ↑ desde cualquier pantalla (§24.11). Sin confirmación para roles adultos en 🔴. |**

**\*\*Regla:\*\* si el usuario necesita más de un toque para completar la acción más frecuente de una pantalla, el diseño debe rehacerse. Las acciones secundarias pueden requerir navegación adicional. La primaria no.**

**### 1.2 Feedback inmediato**

**\*\*Toda acción del usuario debe recibir respuesta en menos de 100ms. Si la operación toma más tiempo, el sistema debe acusar recibo en menos de 100ms y luego resolver.\*\***

**| Tipo de acción | Feedback inmediato (<100ms) | Feedback de resolución |**

**|---|---|---|**

**| Tap en botón | Escala 0.97 → 1.0 + háptico ligero | — |**

**| Completar tarea | Checkbox se rellena + háptico + tachado | Toast de confirmación (opcional, no bloqueante) |**

**| Crear tarea/evento | Item aparece en la lista con opacidad 0 → 1 | — |**

**| Guardar formulario | Botón muestra spinner, mantiene ancho | Toast success o error |**

**| Sincronización | Indicador sutil en status bar | Desaparece al completar |**

**| Error de red | Toast informativo inmediato | — |**

**\*\*Reglas:\*\***

**- Ninguna acción del usuario queda sin respuesta visual o háptica.**

**- Los botones siempre responden al press (escala + háptico), incluso si la acción falla después.**

**- Spinners solo aparecen si la operación excede 300ms. Antes de eso, la UI ya respondió.**

**- El feedback háptico es sutil (tipo `light` en iOS, `clockTick` en Android). Nunca `heavy` ni `warning` fuera de SOS.**

**### 1.3 Previsibilidad**

**\*\*El mismo patrón de interacción produce el mismo resultado en toda la aplicación.\*\***

**| Patrón | Resultado esperado | Aplica en |**

**|---|---|---|**

**| Tap en list item | Abrir detalle del item | Tasks, Events, Finance, Inventory, HomeCloud |**

**| Tap en avatar | Perfil de la persona (o propio) | Home, People, Tasks, Feed |**

**| Botón `+` flotante | Crear nuevo item del dominio actual | Tasks, Events, Finance, Inventory |**

**| X en esquina superior | Cerrar sin guardar (con confirmación si hay cambios) | Modales, sheets, formularios |**

**| Check en esquina superior | Guardar y cerrar | Formularios, edición |**

**| Pull down en scroll superior | Refresh de datos | Todas las listas (excepto modo Adulto Mayor) |**

**| Swipe ↑ desde borde inferior | Abrir panel SOS | Global, toda la app (§24.11) |**

**| Botón `+` central en Bottom Nav | Abrir Quick Actions | Global (§24.09) |**

**\*\*Reglas:\*\***

**- Si un gesto no produce el mismo resultado en dos pantallas, el gesto está mal asignado.**

**- No se introducen nuevos patrones de interacción sin justificación documentada.**

**- El usuario que aprendió a usar Tasks debe poder usar Events sin reaprender nada.**

**- \*\*Nota de auditoría:\*\* Los gestos de swipe sobre list items (izquierda/derecha) y long press NO están definidos en Final Spec V1. Cualquier implementación de estos gestos requiere una enmienda a la especificación canónica.**

**### 1.4 Perdón**

**\*\*Toda acción con consecuencia significativa debe ser reversible o contar con confirmación explícita.\*\***

**| Acción | Nivel de protección | Mecanismo |**

**|---|---|---|**

**| Completar tarea | Reversible 5s | Toast con "Deshacer" |**

**| Eliminar tarea | Confirmación | Bottom sheet: "¿Eliminar esta tarea?" |**

**| Eliminar evento recurrente | Confirmación doble | "¿Este evento o toda la serie?" → confirmar |**

**| Eliminar documento (HomeCloud) | Confirmación | Modal centrado con nombre del documento |**

**| Expulsar miembro del hogar | Solo Coordinador | Doble confirmación + motivo (§05.09) |**

**| Activar SOS 🔴 (adultos) | Sin confirmación | Acción inmediata. Cancelable desde el panel SOS (§24.11) |**

**| Activar SOS 🟠🟡 (todos) | Panel de selección | El panel SOS siempre se abre. Nunca dispara alerta directa (§24.11) |**

**| Cerrar formulario con cambios | Confirmación | Bottom sheet: "Tenés cambios sin guardar. ¿Salir?" |**

**| Anular gasto (Finance) | Confirmación | Los gastos no se eliminan, se anulan (§07.13) |**

**\*\*Reglas:\*\***

**- Ninguna eliminación es silenciosa. Siempre hay un paso de confirmación.**

**- Las acciones cotidianas (completar tarea) tienen "deshacer" por 5 segundos. No más: el hogar sigue moviéndose.**

**- La confirmación no es un obstáculo: es una pausa de seguridad. El diseño del modal de confirmación debe leerse en <2 segundos.**

**- SOS deliberadamente rompe esta regla. En emergencia, la velocidad es seguridad. El panel siempre se abre; nunca se dispara una alerta sin interacción (§24.11).**

**### 1.5 Progressive Disclosure**

**\*\*La complejidad se revela solo cuando el usuario la necesita. Lo que no se usa en el 80% de los casos no ocupa espacio en la interfaz principal.\*\***

**| Nivel | Qué se muestra | Cuándo |**

**|---|---|---|**

**| \*\*Nivel 0 — Home\*\* | Briefing diario, Atención Requerida, pendientes propios | Siempre |**

**| \*\*Nivel 1 — Dominio\*\* | Items del dominio con filtros rápidos | Al navegar al dominio |**

**| \*\*Nivel 2 — Detalle\*\* | Información completa del item, dependencias, historial, entidades relacionadas | Al seleccionar un item |**

**| \*\*Nivel 3 — Configuración\*\* | Reglas de recurrencia, asignaciones avanzadas, automatizaciones | Solo desde detalle, con toggle "Avanzado" |**

**\*\*Ejemplo concreto — Tasks (Planner):\*\***

**- Nivel 0: "Tenés 2 tareas para hoy" (Home → widget Tareas agrupadas por Responsabilidad, §18.14)**

**- Nivel 1: Lista de tareas del día con checkboxes, agrupadas por Responsabilidad (Planner > Tasks)**

**- Nivel 2: Detalle de tarea: descripción, responsable, fecha, dependencias, comentarios, timeline, adjuntos**

**- Nivel 3: Reglas de recurrencia (§06.07), verificación requerida (§06.13), plantillas (§06.16)**

**\*\*Ejemplo concreto — Finance (More):\*\***

**- Nivel 0: "Presupuesto al 92%" (Home → Atención Requerida, condicional, §18.20)**

**- Nivel 1: Lista de gastos del mes, cuentas, presupuestos (More > Finance)**

**- Nivel 2: Detalle de gasto: monto, cuenta, categoría, responsable, comprobante**

**- Nivel 3: Reglas de presupuesto, alertas, integración con Goals y Fondos**

**\*\*Ejemplo concreto — Inventory (More):\*\***

**- Nivel 0: "Leche y pan por debajo del mínimo" (Home → Atención Requerida, condicional, §09.17)**

**- Nivel 1: Lista de consumibles, productos del hogar, medicamentos (More > Inventory)**

**- Nivel 2: Detalle de ítem: stock actual, stock mínimo, categoría, historial de reposición**

**- Nivel 3: Umbrales de alerta, automatizaciones de reposición (§09.08)**

**\*\*Reglas:\*\***

**- El Nivel 3 nunca es visible por defecto. Se accede con un toggle explícito de "Configuración avanzada".**

**- Si una opción de configuración solo la usa <5% de los usuarios, no va en Nivel 2.**

**- Los defaults deben cubrir el caso de uso del 95%. El 5% que necesita ajustar va a Nivel 3.**

**- Principio hermano de §02.11: la complejidad interna no debe reflejarse en la interfaz.**

**---**

**## 2. ARQUITECTURA DE PANTALLA**

**### 2.1 Jerarquía visual universal**

**Toda pantalla en HomePlus sigue una jerarquía de cuatro capas. El orden es fijo; lo que cambia por dominio es el contenido, no la estructura.**

**┌──────────────────────────────────────────┐**

**│ CAPA 1: ATENCIÓN │ ← ¿Qué necesita saber el usuario YA?**

**│ Briefing, alerta, reconocimiento │ Máximo 2 elementos.**

**│ Tiempo de lectura: < 3 segundos │ Siempre visible sin scroll.**

**├──────────────────────────────────────────┤**

**│ CAPA 2: ACCIÓN │ ← ¿Qué puede hacer AHORA?**

**│ Acción principal + acciones rápidas │ Máximo 3 acciones visibles.**

**│ Zona de pulgar si es frecuencia diaria │ La principal siempre en zona pulgar.**

**├──────────────────────────────────────────┤**

**│ CAPA 3: CONTEXTO │ ← ¿Qué más necesita saber?**

**│ Lista de items, métricas, estado │ Scroll vertical si excede pantalla.**

**│ Agrupado por relevancia, no cronología │**

**├──────────────────────────────────────────┤**

**│ CAPA 4: EXPLORACIÓN │ ← ¿Qué más puede hacer?**

**│ Navegación a otros dominios, │ Bottom nav + enlaces cruzados.**

**│ configuraciones, histórico │ Nunca compite con Capa 1 o 2.**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**\*\*Validación por pantalla (usando dominios reales de Final Spec V1):\*\***

**| Pantalla | Capa 1 (Atención) | Capa 2 (Acción) | Capa 3 (Contexto) | Capa 4 (Exploración) |**

**|---|---|---|---|---|**

**| Home | Briefing diario (§18.06) + Atención Requerida (§18.11) | Tareas pendientes propias (1-tap para completar) | Carga Familiar, Próximos Eventos, Presence Resumido, Actividad Familiar (§18.05) | Bottom Nav |**

**| Tasks (Planner) | Chip de filtro activo + contador de pendientes | Checkbox en primer item | Lista de tareas agrupadas por Responsabilidad (§18.14) | Bottom Nav, enlace a Eventos/Goals relacionados |**

**| Calendar (Planner) | Próximo evento (card expandida) | Ver detalle / confirmar asistencia | Timeline del día/semana | Bottom Nav, enlace a Tasks vinculadas |**

**| Feed (People) | Actividad destacada del día | Reaccionar / comentar | Lista cronológica de Posts (§12.03) | Bottom Nav, enlace a perfiles |**

**| Presence (People) | Quién está en casa ahora | Ver ubicación / check-in | Lista de miembros con estado, lugares | Bottom Nav |**

**| Finance (More) | Alerta de presupuesto (si aplica, §18.20) | Botón `+` flotante (registrar gasto) | Lista de gastos del mes, cuentas | Bottom Nav, enlace a HomeCloud (comprobantes) |**

**| Inventory (More) | Stock bajo / medicamento por vencer (si aplica, §09.17) | Marcar reposición | Lista de consumibles, productos, medicamentos | Bottom Nav, enlace a Tasks |**

**| HomeCloud (More) | Último álbum/recuerdo destacado | Ver / crear recuerdo | Álbumes, documentos recientes | Bottom Nav, enlace a Assets/Eventos |**

**### 2.2 Zonas de la pantalla**

**La pantalla del teléfono no es un lienzo uniforme. La accesibilidad del pulgar define tres zonas de importancia.**

**┌──────────────────────────────────────────┐**

**│ ZONA SUPERIOR │ ← Difícil de alcanzar (estiramiento)**

**│ 20% superior de la pantalla │**

**│ │ ¿Qué va acá?**

**│ ┌────────────────────────────────────┐ │ • Título de pantalla**

**│ │ Título + navegación básica │ │ • Navegación back**

**│ └────────────────────────────────────┘ │ • Briefing diario (lectura, no acción)**

**│ │ • Indicadores de estado (hora, conexión)**

**├──────────────────────────────────────────┤**

**│ ZONA MEDIA │ ← Accesible con ajuste de mano**

**│ 50% central de la pantalla │**

**│ │ ¿Qué va acá?**

**│ ┌────────────────────────────────────┐ │ • Contenido scrolleable principal**

**│ │ Listas, cards, contenido │ │ • Filtros (chips horizontales)**

**│ │ principal │ │ • Métricas y resúmenes**

**│ └────────────────────────────────────┘ │**

**│ │**

**├──────────────────────────────────────────┤**

**│ ZONA DE PULGAR │ ← Máxima accesibilidad**

**│ 30% inferior de la pantalla │**

**│ │ ¿Qué va acá?**

**│ ┌────────────────────────────────────┐ │ • Acción principal (1-tap)**

**│ │ Acciones frecuentes │ │ • Botón + flotante**

**│ │ + Bottom Nav │ │ • Confirmaciones rápidas**

**│ └────────────────────────────────────┘ │ • Bottom Navigation Bar (§24.04)**

**│ ──────────────────────────────────── │**

**│ Bottom Nav (siempre presente) │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**\*\*Reglas de asignación:\*\***

**- Si una acción se usa más de 5 veces al día, va en zona de pulgar.**

**- Si una acción se usa 1-2 veces al día, puede ir en zona media.**

**- Si una acción se usa menos de 1 vez por semana, puede ir en zona superior o en navegación secundaria (More, §24.12).**

**- La zona superior solo contiene información de lectura o navegación. Nunca la acción principal.**

**- El botón `+` flotante siempre está en la esquina inferior derecha (zona de pulgar para diestros; aceptable para zurdos por ser esquina).**

**### 2.3 Reglas de scroll**

**| Contexto | Scroll | Justificación |**

**|---|---|---|**

**| Home — Capa 1 (Briefing) | \*\*NO\*\* | Debe leerse sin interacción. Si no cabe, el copy está mal. |**

**| Home — Capa 3 (widgets) | \*\*SÍ\*\* | Vertical. Agrupado por relevancia según orden oficial (§18.05). |**

**| Listas de items (Tasks, Events, Finance, Inventory) | \*\*SÍ\*\* | Vertical infinito con paginación. |**

**| Formulario de creación/edición | \*\*SÍ\*\* | Vertical. Pero acciones (guardar/cancelar) siempre fijas en zona inferior. |**

**| Modal centrado (confirmaciones) | \*\*NO\*\* | Contenido debe caber en el viewport sin scroll. Si no cabe, usar bottom sheet. |**

**| Bottom sheet | \*\*SÍ\*\* | Vertical dentro del sheet si el contenido excede el 50% de altura. |**

**| Detalle de item | \*\*SÍ\*\* | Vertical. Acciones frecuentes fijas abajo. |**

**| Onboarding | \*\*NO\*\* | Cada paso cabe en una pantalla. Sin scroll. |**

**| Settings (More) | \*\*SÍ\*\* | Vertical. Secciones colapsables para reducir scroll. |**

**\*\*Reglas:\*\***

**- Si una pantalla requiere scroll para ver la acción principal, el diseño está mal.**

**- Si un formulario requiere scroll, los botones de acción son fijos (sticky footer).**

**- Nunca scroll horizontal para contenido de lectura. Solo para chips de filtro o galería de fotos.**

**- El scroll infinito siempre tiene indicador de carga al final. Nunca "no hay más" sin avisar.**

**### 2.4 Densidad de información por rol**

**La cantidad de información visible simultáneamente se ajusta por rol. No es solo "mostrar menos": es cambiar qué información aparece en cada capa. Roles según §04.01.**

**| Elemento | Coordinador | Adulto | Adolescente | Niño | Adulto Mayor |**

**|---|---|---|---|---|---|**

**| Items visibles en lista sin scroll | 5–6 | 4–5 | 3–4 | 2–3 | 2–3 |**

**| Cards en Home | 3 (briefing + carga + reconocimiento) | 2 (briefing + reconocimiento) | 2 (mis tareas + reconocimiento) | 1 (mi lista del día) | 1 (lo urgente hoy: medicación, eventos, personas) |**

**| Chips de filtro | 4–5 (Todo, Hoy, Mío, Por miembro, Tipo) | 3 (Todo, Hoy, Mío) | 2 (Hoy, Mío) | 1 (Hoy) | 1 (Hoy) |**

**| Métricas visibles | Carga del hogar, tendencias, presupuesto | Mis tareas, eventos próximos | Mis tareas | Mi lista | Sin métricas |**

**| Badges de estado | Todos | Propios + urgentes del hogar | Solo propios | Solo propios positivos | Solo alertas |**

**\*\*Regla:\*\* la densidad se reduce reduciendo elementos, no achicando fuentes. Nunca bajar de 14px para body en ningún rol.**

**---**

**## 3. NAVEGACIÓN**

**### 3.1 El modelo de niveles según Final Spec V1**

**HomePlus organiza la navegación en cinco niveles oficiales (§24.03). Cada nivel tiene un propósito distinto.**

**NIVEL 0 — Home (§24.06)**

**Punto de entrada principal. Siempre es la pantalla inicial.**

**El usuario no puede cambiarlo (§18.22).**

**│**

**├── ¿Qué está pasando en mi hogar AHORA?**

**├── ¿Qué tengo que hacer YO?**

**│**

**├── Navega a ──→ NIVEL 1 — Navegación Principal (§24.04)**

**│ Bottom Nav: \[Home] \[People] \[+] \[Planner] \[More]**

**│ │**

**│ ├── Navega a ──→ NIVEL 2 — Dominio**

**│ │ Tasks, Calendar, Goals (Planner)**

**│ │ Feed, Presence, Personas (People)**

**│ │ Finance, Inventory, HomeCloud, Settings (More)**

**│ │ │**

**│ │ ├── Navega a ──→ NIVEL 3 — Vista Específica**

**│ │ │ Task Detail, Event Detail, Person Profile,**

**│ │ │ Document Detail, etc.**

**│ │ │ │**

**│ │ │ └── Navega a ──→ NIVEL 4 — Acción Puntual**

**│ │ │ Editar tarea, Cambiar responsable,**

**│ │ │ Configuración avanzada (toggle)**

**│ │ │**

**│ │ └── Enlace cruzado ──→ Otro dominio relacionado**

**│ │ (sin volver atrás, §24.16)**

**│ │**

**│ └── Quick Actions (+) ──→ Panel flotante (§24.09)**

**│ Geni (slot fijo) + acciones dinámicas**

**│**

**└── Swipe ↑ global ──→ Panel SOS (§24.11)**



**\*.txt**

**Plaintext**

**\*\*Reglas oficiales de Final Spec V1:\*\***

**- Más de 4 niveles es fallo de navegación (§24.03).**

**- Objetivo: 95% de acciones ≤ 3 niveles (§24.03).**

**- Si un flujo frecuente requiere 4 niveles, está mal diseñado.**

**- La navegación entre dominios no suma nivel: es un movimiento lateral (§24.16).**

**- Search Global es el navegador interno de la app, accesible desde cualquier pantalla (§24.10).**

**### 3.2 Transiciones entre niveles**

**Cada transición tiene una semántica. El tipo de transición le dice al usuario dónde está en la jerarquía.**

**| Transición | Tipo | Animación | Duración | Uso |**

**|---|---|---|---|---|**

**| Home → Dominio | \*\*Stack push\*\* | Slide right → left | 250ms ease-out | Navegación principal. Bottom nav. |**

**| Dominio → Detalle | \*\*Stack push\*\* | Slide right → left | 250ms ease-out | Profundizar en un item. |**

**| Detalle → Configuración avanzada | \*\*Stack push\*\* | Slide right → left | 250ms ease-out | Solo desde toggle explícito. |**

**| Cualquier nivel → Crear/Editar | \*\*Bottom sheet\*\* | Slide up + fade | 300ms ease-out | Acciones contextuales que no requieren pantalla completa. |**

**| Cualquier nivel → Confirmación | \*\*Modal centrado\*\* | Scale 0.95→1 + fade | 250ms ease-out | Decisiones con consecuencia. |**

**| Dominio A → Dominio B (enlace cruzado) | \*\*Stack push\*\* | Slide right → left | 250ms ease-out | Navegación contextual entre entidades (§24.16). |**

**| Botón `+` → Quick Actions | \*\*Panel flotante + blur\*\* | Fade in + slide up | 200ms ease-out | Panel de acción rápida (§24.09). |**

**| Swipe ↑ → SOS | \*\*Panel\*\* | Slide up | 200ms ease-out | Panel de emergencia (§24.11). |**

**| Cualquier nivel → Home | \*\*Pop to root\*\* | Stack unwind | — | Bottom nav tap en tab activo. |**

**| Back (sistema o botón) | \*\*Stack pop\*\* | Slide left → right | 200ms ease-in | Volver al nivel anterior. |**

**\*\*Reglas:\*\***

**- Bottom sheet para crear/editar. Pantalla completa solo cuando el contenido lo exige.**

**- Modal centrado solo para confirmaciones. Nunca para formularios.**

**- La transición de back es más rápida que la de avance (200ms vs 250ms). El usuario ya conoce el destino.**

**- Nunca usar modal para navegación entre niveles. El modal es una interrupción, no un paso.**

**### 3.3 Navegación contextual entre entidades**

**HomePlus conecta dominios porque el hogar es un sistema, no un conjunto de silos (§02.10). Una tarea puede estar vinculada a un evento, un evento puede tener un documento asociado, una persona puede relacionarse con todo.**

**TASK ─────────────────────→ EVENT**

**│ "Preparar comida" → "Asado del sábado"**

**│**

**└──→ RESPONSABILIDAD: Compras**

**│**

**└──→ INVENTORY: Leche, Pan (stock bajo)**



**GOAL ─────────────────────→ FINANCE**

**│ "Vacaciones 2027" → Fondo: Vacaciones**

**│ → Gastos relacionados**

**│**

**└──→ TASKS: Hitos → subtareas**



**ASSET (Vehículo) ─────────→ HomeCLOUD**

**│ "Toyota Corolla" → Documentos: Seguro, VTV**

**│ → Mantenimiento → Tasks**

**│**

**└──→ FINANCE: Gastos de mantenimiento**



**\*.txt**

**Plaintext**

**\*\*Mecanismo:\*\* cada item en cualquier dominio muestra, en su detalle (Nivel 3), los enlaces a entidades relacionadas. Estos enlaces son navegación directa, no referencia pasiva. Modelo basado en §22 (Relaciones oficiales).**

**| Desde | Enlace a | Ejemplo |**

**|---|---|---|**

**| Task | Event asociado | "Esta tarea es parte del Asado del sábado →" |**

**| Task | Responsabilidad | "Responsabilidad: Compras →" |**

**| Task | Goal | "Contribuye a: Vacaciones 2027 →" |**

**| Event | Tasks vinculadas | "2 tareas dependen de este evento →" |**

**| Event | Documentos (HomeCloud) | "Documentos para este evento →" |**

**| Gasto (Finance) | Documento (HomeCloud) | "Comprobante adjunto →" |**

**| Gasto (Finance) | Responsabilidad | "Responsabilidad: Compras →" |**

**| Asset | Documentos (HomeCloud) | "Documentación del vehículo →" |**

**| Asset | Tasks (mantenimiento) | "Mantenimiento pendiente →" |**

**| Documento (HomeCloud) | Persona | "Titular: Mariana →" |**

**| Documento (HomeCloud) | Asset | "Pertenece a: Toyota Corolla →" |**

**| Inventory Item | Task | "Tarea de reposición →" |**

**\*\*Reglas:\*\***

**- El enlace cruzado siempre se abre como stack push. El usuario puede volver con back.**

**- Si el usuario navegó A → B → C, el stack es A > B > C. Back funciona normalmente.**

**- Los enlaces cruzados no crean ciclos infinitos. Si desde B se enlaza a A, se reutiliza la instancia existente de A en el stack (no se duplica).**

**- Toda entidad que tenga relación con otra debe exponer esa relación como enlace navegable en su vista de detalle (§22, §24.16).**

**### 3.4 Regla de "no volver atrás"**

**La navegación entre dominios relacionados no debe requerir que el usuario recuerde dónde estaba. HomePlus aplica enlaces cruzados para que el usuario complete su intención sin fricción.**

**\*\*Ejemplo de flujo sin fricción (con dominios reales):\*\***

**1. Usuario en Home ve "Tenés que preparar comida para el asado del sábado"**

**2. Tap → Detalle de la tarea (Nivel 3)**

**3. En detalle, ve enlace "Parte del evento: Asado del sábado →"**

**4. Tap → Detalle del evento (stack push, Nivel 3)**

**5. En evento, ve "1 documento pendiente: Lista de compras →"**

**6. Tap → Detalle del documento en HomeCloud (stack push)**

**7. Completa lo necesario. Back → evento → back → tarea → back → Home.**

**\*\*El usuario nunca tuvo que:\*\***

**- Volver al menú principal**

**- Buscar el dominio manualmente**

**- Recordar cómo se llamaba el documento**

**- Navegar por múltiples tabs para encontrar lo relacionado**

**### 3.5 Bottom Navigation — Congelado V1**

**\*\*Estructura oficial según Final Spec §24.04:\*\***

**\[ Home ] \[ People ] \[ + ] \[ Planner ] \[ More ]**



**\*.txt**

**Plaintext**

**| Tab | Ícono | Destino | Contenido principal | Visible para |**

**|---|---|---|---|---|**

**| Home | 🏠 | Home (§18) | Briefing, Atención Requerida, widgets | Todos |**

**| People | 👥 | People (§24.07) | Feed, Presence, Personas | Todos |**

**| `+` | ➕ | Quick Actions (§24.09) | Panel flotante: Geni (fijo) + acciones dinámicas | Todos |**

**| Planner | 📋 | Planner (§24.08) | Tasks, Calendar, Goals | Todos |**

**| More | ⋯ | More (§24.12) | Finance, Inventory, HomeCloud, Settings | Todos |**

**\*\*Reglas oficiales:\*\***

**- Bottom Nav congelada en V1. No se modifica sin enmienda a la especificación canónica (§25).**

**- Quick Actions (`+`) abre panel flotante con blur del fondo. Geni es el único elemento fijo (§24.09).**

**- SOS no está en Bottom Nav. No está en Quick Actions. Acceso vía swipe ↑ global (§24.11).**

**- Geni no tiene tab dedicado. Es transversal (§14, §24.14).**

**- People agrupa Feed, Presence y Personas. Feed no es un tab independiente (§24.07).**

**- Planner agrupa Tasks, Calendar y Goals. Responsabilidades no son un dominio independiente; son propiedad de la tarea y eje organizador dentro de Tasks (§24.08).**

**- More contiene herramientas especializadas (Tier 3). No es un descarte (§24.12).**

**- El badge en un tab solo usa colores success (verde) o alert (ámbar). Nunca error (rojo) en la barra de navegación.**

**- Estado activo: ícono filled + texto con peso 600. Inactivo: ícono outline + texto con peso 400.**

**- El tap en el tab activo hace scroll to top + refresh en la pantalla actual.**

**### 3.6 More — Estructura oficial**

**More no es un descarte. Es la sección de herramientas especializadas (§24.12):**

**More**



**💰 Finance — Cuentas, gastos, ingresos, presupuestos, fondos, deudas**

**📦 Inventory — Consumibles, productos del hogar, medicamentos**

**☁ HomeCloud — Álbumes, recuerdos, documentos**

**⚙ Settings — Hogar, Cuenta, Sistema, Auditoría (§24.15)**



**\*.txt**

**Plaintext**

**Cada módulo se muestra como card con nombre y línea de contexto secundaria (indicador de estado, no contenido consumible).**

**\*\*Regla:\*\* More no contiene dashboards. Solo accesos a dominios + indicadores rápidos opcionales.**

**---**

**## 4. ADAPTACIÓN POR ROL**

**La UX de HomePlus se adapta por rol (§04). No es solo filtrar contenido: es cambiar la jerarquía de la información, el lenguaje visual, la densidad cognitiva y el nivel de agencia.**

**### 4.1 Tabla comparativa de adaptación UX por rol**

**| Dimensión | Coordinador | Adulto | Adolescente | Niño (6–12) | Adulto Mayor |**

**|---|---|---|---|---|---|**

**| \*\*Jerarquía Home\*\* | 1. Carga del hogar 2. Alertas 3. Reconocimiento | 1. Mis pendientes 2. Eventos 3. Reconocimiento | 1. Mis tareas 2. Reconocimiento | 1. Mi lista del día | 1. Lo urgente hoy (medicación, eventos, personas, recordatorios) (§04.07) |**

**| \*\*Densidad de cards\*\* | 3–4 cards | 2–3 cards | 2 cards | 1 card | 1 card |**

**| \*\*Lenguaje\*\* | Informativo + métricas | Ejecutivo + accionable | Directo + sin sermón | Simple + concreto + visual | Asistivo + sin prisa |**

**| \*\*Tratamiento\*\* | Usted o nombre | Usted o nombre (configurable) | Tuteo + nombre de pila | Tuteo + nombre de pila | Usted + nombre (respeta Don/Doña) |**

**| \*\*Longitud de copy\*\* | 2 líneas máx. | 1–2 líneas | 1–2 líneas | 1 línea | 2 líneas máx. |**

**| \*\*Tamaño de fuente base\*\* | 16px (body) | 16px (body) | 16px (body) | 18px (body L) | 18px (body senior) |**

**| \*\*Target táctil mínimo\*\* | 44px | 44px | 44px | 48px | 56px |**

**| \*\*Contraste\*\* | Estándar | Estándar | Estándar | Estándar | AA+ forzado |**

**| \*\*Filtros disponibles\*\* | Todo, Hoy, Mío, Por miembro | Todo, Hoy, Mío | Hoy, Mío | Solo Hoy | Solo Hoy |**

**| \*\*Métricas visibles\*\* | Carga global, tendencias, presupuesto | Propias + hitos del hogar | Propias | Ninguna | Ninguna |**

**| \*\*Crear items\*\* | Todo (tareas, eventos, gastos, docs) | Tareas, eventos, gastos | Tareas propias, eventos | No crea (solo completa) | Tareas propias (simplificado) |**

**| \*\*Ver carga de otros\*\* | Sí, global y por miembro | No | No | No | No |**

**| \*\*Gamificación\*\* | No | No | Rachas ligeras | Rachas + logros visuales | No |**

**| \*\*Confirmaciones\*\* | Estándar | Estándar | Refuerzo positivo | Positivas + visuales | Reforzantes + sin timeout |**

**| \*\*Animaciones\*\* | Funcionales | Funcionales | Sutiles | Lúdicas (no excesivas) | Reducidas o ninguna |**

**| \*\*Modo oscuro\*\* | Sí (manual) | Sí (manual) | Sí (manual) | No (solo claro) | Alto contraste (no oscuro estándar) |**

**| \*\*Onboarding\*\* | 3 pasos (hogar + miembros + preferencias) | 2 pasos (rol + horario) | 2 pasos (avatar + color) | 3 pasos (avatar + color + lista demo) | 3 pasos (fuente grande + medicación + contacto emergencia) |**

**| \*\*SOS\*\* | Acceso completo. Ve todas las alertas (§24.11). | Activar + ver alertas de hijos. | Activar 🟠🟡. No 🔴 (§24.11). | Activar 🟠🟡. No 🔴 (§24.11). | Activar propio. Botón más grande. |**

**### 4.2 Qué significa "cambiar jerarquía, no solo filtrar"**

**\*\*Ejemplo: Home de Coordinador vs Home de Niño (§18.23)\*\***

**HOME COORDINADOR HOME NIÑO**

**┌────────────────────────┐ ┌────────────────────────┐**

**│ Hola, Mariana │ │ ¡Hola, Luca! │**

**│ Carga: 70/30 esta sem │ │ │**

**│ │ │ 🎯 Mi lista de hoy │**

**│ ⚠️ Presupuesto al 92% │ │ ☐ Ordenar el cuarto │**

**│ │ │ ☐ Hacer la tarea │**

**│ 💜 Mateo: 3 días al día│ │ │**

**│ │ │ ⭐ ¡3 días seguidos! │**

**│ Mis pendientes (2) │ │ │**

**│ ... │ │ │**

**└────────────────────────┘ └────────────────────────┘**



**\*.txt**

**Plaintext**

**El Coordinador ve el sistema. El Niño ve su mundo. Ambos abren la misma app, el mismo tab Home, pero la jerarquía de información es radicalmente distinta. Home se adapta por rol (§18.23), no por filtros de contenido.**

**### 4.3 Adulto Mayor: diseño asistivo, no solo "fuente grande"**

**El modo Adulto Mayor (§04.07) no es un zoom. Es una re-arquitectura de la pantalla bajo el principio de \*\*"sin prisa, sin sustos, sin obstáculos"\*\*. La estructura de navegación (Bottom Nav) se mantiene; lo que cambia es el contenido y la presentación.**

**| Principio | Regla de implementación |**

**|---|---|**

**| \*\*Fuente grande\*\* | Escala tipográfica senior (+25–35%). Mínimo 18px para body. |**

**| \*\*Alto contraste\*\* | AA+ garantizado. Texto `#1A1714` sobre fondo `#FBFAF8`. Sin grises sutiles. |**

**| \*\*Mínimos elementos\*\* | Máximo 2 cards en Home, máximo 3 items visibles en lista sin scroll. Sin chips de filtro múltiples. |**

**| \*\*Botones grandes\*\* | Target táctil mínimo 56px. Altura de botón primario: 56–64px. |**

**| \*\*Sin gestos complejos\*\* | Solo tap. Nada de swipe, nada de long press, nada de pull-to-refresh (se reemplaza por botón explícito). |**

**| \*\*Labels siempre visibles\*\* | Nunca íconos sin texto. Los tabs del bottom nav tienen texto debajo del ícono. |**

**| \*\*Tiempo extendido\*\* | Toast dura 8s (doble que default). Confirmaciones no tienen timeout. |**

**| \*\*Sin scroll horizontal\*\* | Los filtros no son chips scrolleables: son un solo botón "Hoy" fijo. |**

**| \*\*Home priorizado\*\* | Home prioriza: Personas, Eventos, Recordatorios, Medicación, Coordinación (§04.07). |**

**| \*\*Contacto de emergencia\*\* | Visible en Home. Un toque para llamar. |**

**| \*\*Onboarding guiado\*\* | Paso a paso con confirmación explícita. Sin timer. Sin "saltar". |**

**| \*\*Medicación (Inventory)\*\* | Card prominente en Home con hora, nombre del medicamento y botón grande "Ya la tomé". Datos provenientes de Inventory (§09.11–§09.13). |**

**### 4.4 Niño: gamificación que refuerza, no que compite**

**El rol Niño (§04.06) posee acceso simplificado. No administra información familiar crítica.**

**| Principio | Regla de implementación |**

**|---|---|**

**| \*\*Lenguaje simple\*\* | Frases de 1 línea. Sujeto + verbo + objeto. "Luca, ordená tu cuarto." |**

**| \*\*Visual\*\* | Íconos grandes para cada tarea. Avatar del niño visible. Colores de la paleta tierra, con el acento miel más presente. |**

**| \*\*Confirmaciones positivas\*\* | Al completar: animación sutil + mensaje "¡Listo! 🎯". Sin comparación con hermanos. |**

**| \*\*Rachas visuales\*\* | Calendario simple con días coloreados (success para días completados). Sin números de "productividad". |**

**| \*\*Lista del día\*\* | Máximo 5 items. Una tarea a la vez visible en foco si el niño tiene menos de 8 años. |**

**| \*\*Sin presión\*\* | Si no completa, al día siguiente se resetea. No se acumulan "deudas". No hay contador de "días sin hacer". |**

**| \*\*Avatar personalizable\*\* | Puede elegir color de avatar entre 8 opciones. Pequeño momento de agencia. |**

**| \*\*Sin acceso a configuración\*\* | No ve tabs de configuración, no ve Finance, no ve documentos salvo los propios. |**

**| \*\*SOS\*\* | Accede a 🟠🟡. No puede emitir 🔴 (§24.11). Panel SOS visible. |**

**---**

**## 5. MICROINTERACCIONES**

**### 5.1 Feedback háptico**

**HomePlus usa vibración con moderación quirúrgica. El háptico es información, no decoración.**

**| Evento | Tipo de háptico | Cuándo |**

**|---|---|---|**

**| Tap en botón | `light` (iOS) / `clockTick` (Android) | Toda interacción con botones |**

**| Completar tarea | `light` + animación de check | Al marcar checkbox |**

**| Error al guardar | `warning` (iOS) / `longPress` (Android) | Solo en errores bloqueantes |**

**| SOS activado | `heavy` (iOS) / `effectHeavyClick` (Android) | Solo en emergencia (§24.11) |**

**| Pull to refresh completo | `light` | Al terminar la sincronización |**

**| Confirmación exitosa | `light` | Al guardar formulario, crear item |**

**\*\*Reglas:\*\***

**- Nunca háptico para notificaciones push entrantes. Eso lo maneja el SO, no la app.**

**- Nunca háptico repetitivo. Una vibración, no un patrón.**

**- El háptico `heavy` está reservado exclusivamente para SOS.**

**- En modo Adulto Mayor, el háptico `light` se reemplaza por `medium` para mayor perceptibilidad.**

**- En modo Niño, sin cambios respecto al estándar.**

**### 5.2 Animaciones**

**| Tipo | Cuándo sí | Cuándo no | Duración máxima |**

**|---|---|---|---|**

**| \*\*Transición entre pantallas\*\* | Navegación push/pop, bottom sheet, modal | — | 300ms |**

**| \*\*Microinteracción de completado\*\* | Checkbox → relleno + tachado | No en listas con más de 3 items completándose simultáneamente | 400ms |**

**| \*\*Reconocimiento\*\* | Card de reconocimiento en Home (entrada sutil) | No animación de "confeti" o "festejo" | 500ms |**

**| \*\*Pull to refresh\*\* | Indicador de refresh nativo | Sin animación custom | Nativo del SO |**

**| \*\*Esqueleto de carga (skeleton)\*\* | Listas que tardan > 300ms en cargar | No en pantallas con datos cacheados | Hasta que carguen los datos |**

**| \*\*Cambio de estado (empty → normal)\*\* | Fade in de contenido cuando aparecen datos | No animar el empty state al salir | 300ms |**

**| \*\*Error\*\* | Toast con slide-down + fade-in | Sin shake, sin parpadeo rojo | 300ms |**

**| \*\*Transición de tema\*\* | Fade entre light/dark/senior | Sin animación brusca de colores | 400ms |**

**| \*\*Badge de notificación\*\* | Aparece con scale 0→1 sutil | Sin bounce, sin loop | 200ms |**

**| \*\*Quick Actions (panel `+`)\*\* | Fade in + slide up con blur de fondo | Sin rebote | 200ms |**

**| \*\*Panel SOS\*\* | Slide up desde borde inferior | Sin animación distractiva | 200ms |**

**\*\*Reglas generales:\*\***

**- Las animaciones deben sentirse como parte de la física del hogar, no como efectos especiales.**

**- Duración máxima de cualquier animación: 500ms. Si algo necesita más tiempo, está mal diseñado.**

**- Las animaciones de entrada usan `ease-out` (arranque rápido, desaceleración suave). Las de salida usan `ease-in` (lo inverso).**

**- Modo Adulto Mayor: `prefers-reduced-motion` se respeta. Si el SO pide reducción de movimiento, las animaciones se eliminan (transiciones instantáneas).**

**- Las animaciones nunca transmiten urgencia falsa. Nada parpadea. Nada rebota repetidamente.**

**### 5.3 Transiciones entre estados**

**Cada componente en HomePlus puede estar en uno de cinco estados. La transición entre ellos debe ser fluida y predecible.**

**┌──────────┐**

**│ NORMAL │ ← Estado por defecto. Datos visibles.**

**└────┬─────┘**

**│**

**┌─────────┼──────────┐**

**▼ ▼ ▼**

**┌───────┐ ┌───────┐ ┌────────┐**

**│LOADING│ │ EMPTY │ │ ERROR │**

**└───┬───┘ └───┬───┘ └───┬────┘**

**│ │ │**

**└─────────┼──────────┘**

**▼**

**┌──────────┐**

**│ SUCCESS │ ← Estado transitorio (toast, confirmación)**

**└──────────┘**

**│**

**▼ (auto, 2-4s)**

**┌──────────┐**

**│ NORMAL │**

**└──────────┘**



**\*.txt**

**Plaintext**

**| Transición | Comportamiento |**

**|---|---|**

**| \*\*NORMAL → LOADING\*\* | Skeleton screen si es carga inicial. Si es refresh, indicador sutil en zona superior sin bloquear la UI actual. |**

**| \*\*LOADING → NORMAL\*\* | Fade-in del contenido (300ms). Los skeletons se disuelven, no desaparecen abruptamente. |**

**| \*\*LOADING → ERROR\*\* | La UI de skeleton se reemplaza por mensaje de error + botón de reintento. Sin flicker. |**

**| \*\*LOADING → EMPTY\*\* | Si la query devuelve 0 resultados, se muestra empty state con acción sugerida. |**

**| \*\*NORMAL → ERROR\*\* | Toast en zona superior. La UI actual permanece visible y funcional. |**

**| \*\*NORMAL → SUCCESS\*\* | Toast o microinteracción local. No se reemplaza toda la pantalla. |**

**| \*\*EMPTY → NORMAL\*\* | Fade-in del primer item. La acción sugerida del empty state desaparece. |**

**| \*\*ERROR → NORMAL\*\* | Al reintentar: vuelve a LOADING, luego a NORMAL. Sin salto visual. |**

**### 5.4 Sonidos**

**HomePlus \*\*no usa sonidos propios\*\*. La decisión es deliberada:**

**- El hogar ya tiene suficientes sonidos. La app no debe agregar más.**

**- Las notificaciones usan el sistema de notificación del SO, que el usuario ya configuró a su gusto.**

**- SOS es la única excepción parcial: si el SO lo permite, reproduce el sonido de alerta del sistema. Nunca un sonido custom.**

**- En modo Niño, sin sonidos. Las confirmaciones son visuales y hápticas.**

**---**

**## 6. ONBOARDING Y PRIMER VALOR**

**### 6.1 Principio: 60 segundos hasta valor visible**

**El usuario debe experimentar valor concreto en el primer minuto de uso. No "la app es linda". No "qué interesante el concepto". Valor: vio algo que antes no sabía, completó una acción que antes requería coordinar, o entendió algo de su hogar que no había visto.**

**| Rol | Primer valor | Tiempo objetivo | Qué ve |**

**|---|---|---|---|**

**| \*\*Coordinador\*\* | Ve el estado de su hogar en un solo lugar | 45–60s | Briefing con miembros, tareas pendientes del hogar, próximos eventos |**

**| \*\*Adulto\*\* | Ve sus tareas y eventos del día | 30–45s | "Hoy tenés 2 tareas y 1 evento." |**

**| \*\*Adolescente\*\* | Ve su lista personal y puede completar algo | 20–30s | "Jose, estas son tus tareas para mañana." |**

**| \*\*Niño\*\* | Ve su lista del día con íconos y completa su primera tarea | 15–20s | Avatar + "Luca, tu lista de hoy" + animación al completar |**

**| \*\*Adulto Mayor\*\* | Ve su medicación del día y entiende que la app le avisa | 40–50s | Card de medicación (desde Inventory) + "¿Quiere que le avise a las 9?" |**

**### 6.2 No tutoriales largos**

**- \*\*Sin carrusel de features.\*\* La app no se explica a sí misma antes de usarse. Se usa y se entiende.**

**- \*\*Sin tooltips.\*\* Si una interfaz necesita un tooltip para entenderse, la interfaz está mal diseñada.**

**- \*\*Sin videos de onboarding.\*\***

**- \*\*Sin "skip" forzado.\*\* Si se puede skippear, no era necesario.**

**\*\*La app enseña usándose:\*\***

**- El empty state de cada dominio explica qué va a aparecer ahí y sugiere la primera acción.**

**- La primera tarea creada muestra un toast sutil: "Tu primera tarea. Cuando alguien la complete, te avisamos."**

**- Si un usuario completa 3 tareas en su primer día, Geni lo reconoce: "Primer día completo."**

**- El onboarding es un diálogo con Geni, no un manual.**

**### 6.3 Flujo de onboarding por rol**

**COORDINADOR (3 pasos, \~60s) ADULTO (2 pasos, \~30s)**

**┌────────────────────────┐ ┌────────────────────────┐**

**│ 1. Bienvenida + nombre │ │ 1. Bienvenida + nombre │**

**│ del hogar │ │ + rol │**

**│ │ │ │**

**│ 2. Invitar miembros │ │ 2. Preferencia horaria │**

**│ (puede postergar) │ │ + tono (nombre/usted)│**

**│ │ │ │**

**│ 3. Preferencia horaria │ │ → HOME (primer valor) │**

**│ + tono │ └────────────────────────┘**

**│ │**

**│ → HOME (primer valor) │**

**└────────────────────────┘**



**NIÑO (3 pasos, \~25s) ADULTO MAYOR (3 pasos, \~60s)**

**┌────────────────────────┐ ┌────────────────────────┐**

**│ 1. ¡Hola! Elegí tu │ │ 1. Bienvenida + nombre │**

**│ avatar y color │ │ + tratamiento │**

**│ │ │ │**

**│ 2. Esta es tu lista │ │ 2. ¿Quiere letra más │**

**│ de ejemplo │ │ grande? (default: sí)│**

**│ │ │ │**

**│ 3. ¡Completá tu │ │ 3. Medicación + horario│**

**│ primer tarea! 🎯 │ │ + contacto emergencia│**

**│ │ │ │**

**│ → HOME (primer valor) │ │ → HOME (primer valor) │**

**└────────────────────────┘ └────────────────────────┘**



**\*.txt**

**Plaintext**

**### 6.4 Qué no tiene el onboarding**

**- ❌ Preguntar "¿qué te gustaría hacer?" sin contexto**

**- ❌ Pedir permisos de notificación antes de mostrar valor**

**- ❌ Forzar a invitar miembros (el Coordinador puede postergarlo)**

**- ❌ Solicitar datos innecesarios (edad exacta, dirección, etc.)**

**- ❌ Mostrar pantallas vacías después del onboarding**

**- ❌ "Tour" por la app**

**---**

**## 7. ACCESIBILIDAD (A11Y)**

**### 7.1 Estándares mínimos**

**HomePlus apunta a \*\*WCAG 2.2 Nivel AA\*\* como base, con elementos de AAA donde sea razonable en mobile.**

**| Requisito | Estándar | Implementación |**

**|---|---|---|**

**| \*\*Contraste de texto\*\* | AA: 4.5:1 para texto normal, 3:1 para texto grande (≥18px bold o ≥24px) | Verificado contra Design System. Modo Adulto Mayor fuerza AA+. |**

**| \*\*Contraste de no-texto\*\* | AA: 3:1 para íconos, bordes, indicadores | Divisores deben cumplir 3:1 sobre fondo. |**

**| \*\*Target táctil\*\* | Mínimo 44×44px (WCAG 2.5.5) | Default 44px. Niño 48px. Adulto Mayor 56px. |**

**| \*\*Zoom de texto\*\* | Soportar 200% sin pérdida de funcionalidad | Layouts responsive con `rem`/`em`. Sin `px` fijos en contenedores de texto. |**

**| \*\*Lectores de pantalla\*\* | Todas las imágenes tienen `alt`. Todos los inputs tienen `label`. Los íconos decorativos tienen `aria-hidden`. | Los íconos en bottom nav tienen `accessibilityLabel`. Las cards tienen `accessibilityRole`. |**

**| \*\*Navegación por teclado\*\* | No aplica en mobile nativo, pero sí en web. | — |**

**| \*\*Reducción de movimiento\*\* | Respetar `prefers-reduced-motion` | Anulamos animaciones. Transiciones instantáneas. |**

**| \*\*Orientación\*\* | Soportar portrait y landscape | Portrait es el principal. Landscape es funcional pero no optimizado (95% portrait). |**

**### 7.2 Tamaños de fuente mínimos por rol**

**| Elemento | Coordinador / Adulto / Adolescente | Niño | Adulto Mayor |**

**|---|---|---|---|**

**| Body | 16px | 18px | 18px |**

**| Caption / metadata | 12px | 14px | 14px |**

**| Label / badge | 11px | 13px | 13px |**

**| Título de card (H4) | 18px | 20px | 20px |**

**| Título de pantalla (H1) | 28px | 32px | 36px |**

**| Montos / datos (Mono) | 15px | 17px | 17px |**

**### 7.3 Alternativas a gestos**

**- \*\*Todos los gestos deben tener alternativa de tap.\*\* Si una acción se ejecuta con swipe, también debe poder ejecutarse con tap en un botón visible.**

**- \*\*Sin gestos de 3 dedos. Sin shake para deshacer.\*\* La única alternativa a "deshacer" es el botón explícito en el toast.**

**- \*\*En modo Adulto Mayor, solo tap.\*\* Swipe, long press y pull-to-refresh se desactivan. Cada acción tiene un botón visible.**

**### 7.4 Modo Alto Contraste**

**El modo Adulto Mayor es, por diseño, un modo de alto contraste. Adicionalmente, si el SO tiene activado "Increase Contrast", HomePlus lo respeta:**

**Modo Alto Contraste forzado:**

**├── text-primary: #1A1714 (antes #2D2A26) → contraste 15.2:1 sobre #FBFAF8**

**├── text-secondary: #4A4540 (antes #6B6560) → contraste 7.5:1**

**├── divider-strong: #B5AFA5 (antes #D5CFC7) → más visible**

**├── Todos los íconos: weight bold, no outline**

**├── Focus ring: 3px, siempre visible en inputs**

**└── Sin transparencias: overlays opacos al 85% en lugar de 50%**



**\*.txt**

**Plaintext**

**### 7.5 Etiquetas para lectores de pantalla**

**| Elemento | `accessibilityLabel` | `accessibilityHint` |**

**|---|---|---|**

**| Botón completar tarea | "Completar \[nombre de tarea]" | "Marca la tarea como completada" |**

**| Botón `+` flotante | "Crear \[tarea/evento/gasto]" | — |**

**| Card de reconocimiento | "\[Nombre] completó \[acción]" | "Toca para enviar reconocimiento" |**

**| Badge de alerta | "\[N] tareas pendientes" | — |**

**| Tab de bottom nav | "\[Nombre del tab], \[N] pendientes" (si aplica) | — |**

**| Avatar de miembro | "\[Nombre], \[rol]" | "Toca para ver perfil" |**

**| Chip de filtro activo | "\[Filtro], seleccionado" | — |**

**| Chip de filtro inactivo | "\[Filtro]" | "Toca para filtrar por \[filtro]" |**

**| SOS | "Emergencia. Toca para pedir ayuda." | "Activa alerta de emergencia a tu familia" |**

**| Botón `+` central (Quick Actions) | "Acciones rápidas" | "Abre el panel de acciones rápidas" |**

**---**

**## 8. TABLA DE DECISIONES UX TOMADAS**

**Esta tabla documenta las decisiones de UX que podrían haber tenido alternativas razonables. Cada decisión tiene un porqué vinculado a los principios y la especificación canónica.**

**| # | Decisión | Alternativa considerada | Por qué esta |**

**|---|---|---|---|**

**| UX-01 | \*\*Home híbrido\*\*: briefing + acciones personales en misma pantalla | Home tipo dashboard (solo estado del hogar) | §02.12: Home resume, no administra. El usuario abre la app para actuar, no para mirar. Home conduce al módulo correspondiente (§18.02). |**

**| UX-02 | \*\*Acción principal en zona de pulgar\*\*, no en zona superior | Acción principal en header (patrón Material Design) | 95% mobile. El pulgar manda. La acción principal debe ser accesible sin ajustar la mano. |**

**| UX-03 | \*\*Bottom sheets para crear/editar\*\*, no pantallas completas | Navegación push a pantalla de creación | Mantiene contexto. El usuario no "se va" a otro lado para agregar algo rápido. |**

**| UX-04 | \*\*Bottom Nav congelada V1\*\*: \[Home] \[People] \[+] \[Planner] \[More] (§24.04) | Arquitectura con tabs por dominio | La frecuencia de uso define visibilidad (§24.05). No todos los dominios merecen navegación primaria. |**

**| UX-05 | \*\*Finance, Inventory, HomeCloud en More\*\*, no en Bottom Nav | Todos los dominios con tab propio | Jerarquía de frecuencia (§24.05). Tier 3 (ocasional) vive en More (§24.12). |**

**| UX-06 | \*\*Carga desbalanceada visible SOLO para Coordinador\*\* | Métrica de carga visible para todos | §02.03: coordinación por encima de jerarquía. La carga es herramienta de coordinación, no de comparación. |**

**| UX-07 | \*\*Badge en nav solo colores success/alert, nunca error\*\* | Badge con color semántico completo (incluyendo rojo) | El rojo en la barra de navegación genera ansiedad de "algo está mal". La navegación es un lugar seguro. |**

**| UX-08 | \*\*Confirmación en eliminación, "deshacer" de 5s en completado\*\* | Confirmación para todo o deshacer para todo | Graduación por consecuencia. Eliminar es grave. Completar es cotidiano pero a veces accidental. |**

**| UX-09 | \*\*Sin sonidos propios. Solo notificaciones del SO.\*\* | Sonidos de confirmación / reconocimiento custom | El hogar ya tiene suficientes sonidos. La app no debe agregar ruido. SOS usa el sonido nativo de alerta. |**

**| UX-10 | \*\*Onboarding sin tutorial. Empty states como guía.\*\* | Tutorial interactivo paso a paso con tooltips | Adopción > Perfección. La app se aprende usándose. El empty state es el mejor tutorial. |**

**| UX-11 | \*\*60 segundos hasta primer valor, no "setup completo"\*\* | Onboarding completo con configuración de todos los dominios | Valor individual desde minuto 1. La configuración completa puede llegar después. |**

**| UX-12 | \*\*Adaptación por rol como jerarquía distinta, no solo filtro\*\* | Misma UI para todos con filtros de permisos | Distintos momentos de vida necesitan distinta arquitectura de información (§04, §18.23). |**

**| UX-13 | \*\*Gamificación infantil sin rankings ni comparación\*\* | Rachas con ranking familiar o badges comparativos | §02.03: prohibida la presión social. El logro es personal. Nunca "tu hermano ya lo hizo". |**

**| UX-14 | \*\*Navegación contextual con enlaces cruzados entre dominios\*\* | Navegación jerárquica estricta (Home → Dominio → Detalle → volver → otro Dominio) | §02.10: ecosistema integrado. Los módulos no deben comportarse como aplicaciones separadas. |**

**| UX-15 | \*\*Progressive disclosure en 4 niveles alineados con §24.03\*\* | Configuración plana o solo 2 niveles (simple/avanzado) | Los niveles mapean la frecuencia real de uso y la especificación canónica de navegación. |**

**| UX-16 | \*\*Paleta tierra-cálida. No colores de productividad.\*\* | Paleta estándar de app de productividad | El hogar no es una oficina. La paleta debe transmitir calma, arraigo, calidez. |**

**| UX-17 | \*\*Toast en zona superior, no inferior\*\* | Toast en zona inferior (patrón Material Design) | La zona inferior tiene el bottom nav y botones de acción. El toast compite visualmente. Arriba es más visible y no interfiere. |**

**| UX-18 | \*\*Geni sin tab propio. Acceso vía Quick Actions y transversal (§24.14)\*\* | Geni como tab en Bottom Nav | Geni es una capa transversal integrada en todo el producto (§14). Quick Actions es su punto de entrada principal (§24.09). |**

**| UX-19 | \*\*SOS vía swipe ↑ global, no en Quick Actions ni Bottom Nav (§24.11)\*\* | SOS en Quick Actions o como tab | SOS tiene prioridad máxima (§13.12). Requiere acceso instantáneo desde cualquier pantalla. |**

**| UX-20 | \*\*Pull-to-refresh en listas, pero no en modo Adulto Mayor\*\* | Sin pull-to-refresh (botón explícito para todos) | Pull-to-refresh es natural en mobile. Pero Adulto Mayor necesita alternativas explícitas sin gestos. |**

**---**

**## 9. PRINCIPIOS DE IMPLEMENTACIÓN UX**

**Estos principios no son de diseño: son de ingeniería. Definen cómo se construye la UX, no cómo se ve.**

**| # | Principio | Regla |**

**|---|---|---|**

**| PUX-01 | \*\*Mobile-first absoluto\*\* | Toda pantalla se diseña y prueba primero en 375×812px (iPhone 13/14/15). Desktop es un derivado, no el origen (§24.19). |**

**| PUX-02 | \*\*Diseño por rol, no por feature\*\* | Cada pantalla tiene N variantes (una por rol), no una variante con N flags. La adaptación es estructural (§04, §18.23). |**

**| PUX-03 | \*\*Todo componente acepta `mode: 'normal' | 'senior'`\*\* | El Design System expone un prop `mode` en componentes que lo necesitan. El `ThemeProvider` lo inyecta globalmente. |**

**| PUX-04 | \*\*Tiempo de respuesta percibido < 100ms\*\* | Toda acción de UI debe responder en < 100ms. Si la operación real tarda más, se usa optimistic UI + skeleton. |**

**| PUX-05 | \*\*La accesibilidad no es una capa: es el componente base\*\* | `accessibilityLabel`, `accessibilityRole` y contraste se implementan en el componente base, no en un wrapper. |**

**| PUX-06 | \*\*4 niveles de profundidad máxima. 95% en ≤3.\*\* | Regla oficial de Final Spec §24.03. Medir telemetría de profundidad de navegación. Si el percentil 95 supera 3 niveles, rediseñar el flujo. |**

**| PUX-07 | \*\*Happy path primero, edge cases visibles pero no protagonistas\*\* | Los empty states, errores y estados de carga están diseñados. Pero el diseño no se optimiza para ellos: se optimiza para el estado NORMAL. |**

**| PUX-08 | \*\*Copy y UX se diseñan juntos\*\* | Ninguna pantalla se considera completa sin el microcopy correspondiente. Ver UX Writing Guide. |**

**| PUX-09 | \*\*Bottom Nav congelada. No se modifica sin enmienda.\*\* | §24.04 y §25: la estructura \[Home] \[People] \[+] \[Planner] \[More] es canónica. Cualquier cambio requiere registro de motivo, fecha y responsable. |**

**| PUX-10 | \*\*Todo dominio usa las entidades transversales oficiales\*\* | Persona, Responsabilidad, Goal, Documento (§03.03). Las relaciones entre entidades están definidas en §22. No se inventan nuevas entidades sin especificación. |**

**---**

**\*Documento canónico de UX Philosophy para HomePlus — Versión 2.0. Auditado y corregido contra Final Spec V1 (documento maestro canónico). Cada decisión de diseño futuro debe poder trazarse a un principio de este documento y a la especificación canónica. Si un principio impide una buena solución, el principio se revisa mediante enmienda formal (§25.02). Pero no se ignora.\***



