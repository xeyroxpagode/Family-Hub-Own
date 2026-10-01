## **## HomePlus — PRINCIPIOS DE PRODUCTO**

## **### DECISIONES FUNDACIONALES**

## **Estas son las decisiones que ya tomamos y que gobiernan todo lo demás.**

## **Cada una está anclada en la Final Spec V1 — la constitución del proyecto.**

## **| \*\*Tensión\*\* | \*\*Resolución\*\* | \*\*Fundamento en Final Spec\*\* |**

## **|-------------|---------------|------------------------------|**

## **| \*\*Coordinación vs. Jerarquía\*\* | Coordinación primero. El Coordinador administra el hogar, no la vida privada de las personas. | 02.03, 04.03 |**

## **| \*\*Transparencia vs. Confort\*\* | Los datos del hogar son visibles. La realidad operativa no se suaviza para mantener la paz. | 02.04, 02.05 |**

## **| \*\*Proactividad vs. Intrusión\*\* | Geni interviene cuando detecta patrones, no incidentes aislados. Previene colapsos sin asfixiar. | 02.07, 14.02 |**

## **| \*\*Simplicidad vs. Profundidad\*\* | La interfaz debe mantenerse simple independientemente de la complejidad interna. | 02.11, 02.06 |**

## **| \*\*Privacidad vs. Coordinación\*\* | La privacidad individual prevalece. Pero los compromisos compartidos son visibles por defecto. | 02.01, 04.02 |**

## **| \*\*Adopción vs. Completitud\*\* | Cada módulo entrega valor individual desde el minuto 1. La coordinación colectiva crece con la adopción. | 01.06, 01.03 |**

## **| \*\*Poder del Coordinador vs. Abuso\*\* | El Coordinador tiene poderes ejecutivos definidos y acotados. Toda acción unilateral queda registrada en auditoría permanente. | 04.03, 02.05 |**

## **| \*\*Acceso a Datos vs. Obsesión\*\* | Los datos son accesibles directamente. Geni interviene cuando detecta patrones de consulta obsesiva, sin bloquear el acceso. | 02.08, 14.04 |**

## **---**

## **### PRINCIPIOS RECTORES**

## **Estos principios no son aspiraciones. Son restricciones arquitectónicas.**

## **Cada decisión de producto, diseño o ingeniería debe poder justificarse frente a esta lista.**

## **---**

## **#### 1. La verdad primero, el confort después**

## **\*\*Qué significa:\*\* HomePlus no existe para que las familias se sientan bien. Existe para que las familias \*\*funcionen mejor\*\*. Si la realidad operativa del hogar es incómoda, HomePlus la muestra. El tono puede ser respetuoso, pero los datos son duros.**

## **\*\*Decisiones arquitectónicas que derivan de esto:\*\***

## **- \*\*No existe el "ocultar" asimetrías de carga.\*\* Si un miembro sostuvo el 87% de las tareas este mes, ese número es visible. Geni puede presentarlo con contexto, pero el 87% está ahí.**

## **- \*\*No existe el "suavizar" patrones problemáticos.\*\* Si un miembro acumula tareas vencidas reiteradamente, esa métrica es accesible. Geni puede sugerir coordinación, pero no esconde los datos.**

## **- \*\*Los dashboards muestran realidad, no aspiraciones.\*\* Presupuesto excedido → se muestra. Tarea vencida → se muestra. Meta en riesgo → se muestra.**

## **\*\*Lo que NUNCA hacemos:\*\***

## **- Ocultar datos operativos para "mantener la paz".**

## **- Redondear, suavizar o eufemizar métricas incómodas.**

## **- Permitir que el Coordinador desactive la visibilidad de datos de coordinación compartida.**

## **\*\*El riesgo aceptado:\*\* Familias que no están listas para ver su realidad operativa van a abandonar HomePlus. Ese es el filtro intencional del producto. HomePlus no es para familias que quieren sentirse bien. Es para familias que quieren cambiar.**

## **---**

## **#### 2. Geni no reemplaza conversaciones. Las hace inevitables.**

## **\*\*Qué significa:\*\* Geni no resuelve conflictos. Geni pone sobre la mesa los datos que hacen imposible seguir evitando la conversación. Su trabajo es hacer que la realidad del hogar sea tan visible que ignorarla cueste más trabajo que enfrentarla.**

## **\*\*Decisiones arquitectónicas que derivan de esto:\*\***

## **- \*\*Geni presenta datos, no juicios.\*\* "Tres tareas pendientes desde el lunes" — no "\[Nombre] está siendo irresponsable". Los datos hablan solos.**

## **- \*\*Geni sugiere acciones, no las ejecuta unilateralmente.\*\* "¿Querés que le recuerde sobre las tareas?" — no "Le envié una notificación automáticamente".**

## **- \*\*Geni interviene cuando detecta patrones, no incidentes aislados.\*\* Una tarea atrasada → silencio. Tres tareas atrasadas en una semana → Geni actúa. Un gasto alto → silencio. Gastos recurrentes que comprometen el presupuesto → Geni actúa.**

## **- \*\*Geni nunca completa tareas automáticamente.\*\* Es una restricción explícita de la Final Spec (14.17). La responsabilidad de completar es humana.**

## **\*\*Lo que NUNCA hacemos:\*\***

## **- Geni no manda mensajes en nombre de un miembro a otro sin permiso explícito.**

## **- Geni no resuelve tareas por nadie.**

## **- Geni no oculta información para "proteger" a alguien.**

## **- Geni no crea automatizaciones permanentes sin aprobación humana (15.16).**

## **\*\*El riesgo aceptado:\*\* Geni va a sentirse intrusivo para miembros que no están acostumbrados a rendir cuentas. Van a querer desactivarlo. El producto permite configurar notificaciones, pero no permite desactivar completamente la visibilidad de datos de coordinación compartida.**

## **---**

## **#### 3. El Coordinador administra el hogar. No administra personas.**

## **\*\*Qué significa:\*\* El Coordinador tiene poderes ejecutivos definidos y acotados porque el sistema requiere alguien que tome decisiones operativas. Pero cada uso de ese poder queda registrado, es visible, y está limitado a la administración del hogar — nunca a la vida privada de los miembros.**

## **\*\*Poderes del Coordinador (según Final Spec 04.03):\*\***

## **| \*\*Acción\*\* | \*\*El Coordinador puede\*\* | \*\*Contrabalance del sistema\*\* |**

## **|------------|--------------------------|-------------------------------|**

## **| Aprobar ingresos | Autorizar la entrada de nuevos miembros al hogar. | La invitación y aceptación son pasos previos obligatorios (05.07). |**

## **| Cambiar roles | Modificar el rol de cualquier miembro dentro de los 7 roles oficiales. | La acción queda auditada (05.08). |**

## **| Expulsar miembros | Remover a un miembro del hogar. | Conserva historial. No elimina información histórica (05.09). |**

## **| Transferir coordinación | Ceder el rol de Coordinador a otro miembro. | La acción queda auditada. |**

## **| Administrar configuraciones | Gestionar parámetros operativos del hogar. | Cambios visibles en historial del hogar. |**

## **\*\*Poderes que el Coordinador NUNCA tiene (según Final Spec 04.02):\*\***

## **| \*\*Acción prohibida\*\* | \*\*Por qué\*\* |**

## **|----------------------|-------------|**

## **| Acceder a memoria privada de Geni de otros miembros | La privacidad individual prevalece (04.02). |**

## **| Acceder a metas privadas de otros miembros | Ídem. |**

## **| Acceder a documentos privados de otros miembros | Ídem. |**

## **| Acceder a finanzas personales de otros miembros | Ídem. |**

## **| Eliminar hogares | Prohibición explícita (04.03). |**

## **\*\*El historial del hogar (auditoría permanente):\*\***

## **- Toda acción del Coordinador que afecte a miembros o configuraciones queda registrada.**

## **- Visible para todos los miembros del hogar.**

## **- No se puede borrar.**

## **- La auditoría nunca se elimina (23.10).**

## **\*\*Lo que NUNCA hacemos:\*\***

## **- Darle al Coordinador acceso a datos privados de otros miembros.**

## **- Permitir que el Coordinador desactive funciones del sistema para otros miembros.**

## **- Permitir que el Coordinador borre el historial de sus propias acciones.**

## **\*\*El riesgo aceptado:\*\* Coordinadores con inclinaciones autoritarias van a sentir que HomePlus les pone límites. Van a querer más control del que el sistema permite. Eso es intencional. HomePlus no es una herramienta de vigilancia. Es un sistema de coordinación con transparencia bidireccional.**

## **---**

## **#### 4. Privacidad no es opacidad**

## **\*\*Qué significa:\*\* HomePlus respeta que cada miembro tenga zonas privadas (memoria personal de Geni, metas privadas, documentos privados, finanzas personales). Pero privacidad no significa invisibilidad. Los compromisos compartidos son visibles. Las responsabilidades compartidas son visibles. La contribución al hogar es visible.**

## **\*\*Qué es privado por defecto (según Final Spec 04.02, 05.12):\*\***

## **| \*\*Dato\*\* | \*\*Quién lo ve\*\* | \*\*Configuración\*\* |**

## **|-----------|-----------------|-------------------|**

## **| Memoria privada de Geni | Solo el usuario | No compartible |**

## **| Metas privadas | Solo el usuario | Pueden hacerse familiares |**

## **| Documentos privados | Solo el usuario | Pueden volverse compartidos |**

## **| Finanzas personales | Solo el usuario | Opt-in a visibilidad |**

## **\*\*Qué es visible por defecto en el hogar:\*\***

## **| \*\*Dato\*\* | \*\*Quién lo ve\*\* | \*\*Por qué\*\* |**

## **|-----------|-----------------|-------------|**

## **| Tareas asignadas y estado | Todo el hogar | Transparencia del esfuerzo |**

## **| Calendario y eventos familiares | Todo el hogar | Coordinación de horarios |**

## **| Gastos familiares | Todo el hogar | Economía colectiva |**

## **| Documentos del hogar | Todo el hogar | Gestión familiar |**

## **| Inventory del hogar | Todo el hogar | Coordinación de compras |**

## **| Assets del hogar | Todo el hogar | Responsabilidad compartida |**

## **\*\*Pausa de ubicación:\*\***

## **- La ubicación puede pausarse temporalmente por decisión del usuario (08.04).**

## **- La filosofía del producto recomienda compartirla permanentemente para maximizar coordinación y seguridad.**

## **- Existen 3 niveles de visibilidad configurables (08.05).**

## **\*\*Lo que NUNCA hacemos:\*\***

## **- Forzar visibilidad de datos personales sin consentimiento.**

## **- Permitir que un miembro sea completamente invisible para el hogar en materia de coordinación.**

## **- Compartir memoria privada de Geni sin permiso explícito del usuario.**

## **\*\*El riesgo aceptado:\*\* Miembros que quieren autonomía total van a sentir que HomePlus es demasiado transparente. No es para ellos. HomePlus es para familias que eligen coordinación sobre autonomía absoluta.**

## **---**

## **#### 5. Proactividad calibrada. No notificación constante.**

## **\*\*Qué significa:\*\* Geni actúa antes de que explote el problema, pero no antes de cada micro-evento. Interviene cuando detecta \*\*patrones\*\*, no incidentes aislados. La proactividad mal calibrada es ruido. El ruido mata la adopción.**

## **\*\*Umbrales de intervención de Geni:\*\***

## **| \*\*Situación\*\* | \*\*Geni actúa cuando…\*\* | \*\*Qué hace\*\* |**

## **|---------------|------------------------|--------------|**

## **| Tarea asignada | Inmediato | Notificación al responsable. |**

## **| Tarea próxima a vencer | Se aproxima el vencimiento | Recordatorio al responsable. |**

## **| Tarea vencida | La tarea sigue sin resolverse | Notificación al responsable. Alerta al Coordinador si la situación persiste. |**

## **| Patrón de tareas vencidas | Varias tareas vencidas en período corto | Geni actúa: sugiere reorganización o redistribución. |**

## **| Conflicto de horarios | Solapamiento detectado | Alerta proactiva con sugerencia. |**

## **| Gasto recurrente que compromete presupuesto | Patrón detectado | Sugerencia de ajuste. |**

## **| Stock bajo en Inventory | Por debajo del stock mínimo configurado | Alerta. Puede sugerir crear tarea de compra (09.08). |**

## **| Documento o vencimiento próximo | Se aproxima la fecha | Recordatorio. |**

## **| Meta en riesgo | Progreso insuficiente | Alerta con sugerencia. |**

## **\*\*Regla de oro de notificaciones:\*\* Si Geni va a interrumpir, el contenido debe justificar la interrupción.**

## **Notificación justificada: "SOS activado. Necesitás verlo ahora."**

## **Notificación NO justificada: "¡Hola! Hoy es un buen día para revisar tus gastos."**

## **\*\*Lo que NUNCA hacemos:\*\***

## **- Notificar sobre cosas que el usuario no puede actuar inmediatamente.**

## **- Notificar sobre insights "interesantes pero no urgentes" de forma repetitiva.**

## **- Notificar sobre el mismo problema múltiples veces sin que haya nueva información.**

## **\*\*El riesgo aceptado:\*\* Familias ultra-organizadas van a querer más notificaciones. Familias más relajadas van a querer menos. El sistema permite configuración por categoría de notificación (19.05), pero el default está calibrado para no generar ruido mientras mantiene la proactividad que justifica la existencia de Geni.**

## **---**

## **#### 6. Priorización por frecuencia de uso. No por complejidad técnica.**

## **\*\*Qué significa:\*\* Las funciones que se usan \*\*todos los días\*\* están en navegación primaria. Las que se usan \*\*semanalmente\*\* están a un tap. Las que se usan \*\*ocasionalmente\*\* viven en More o Configuración. La complejidad técnica de la feature es irrelevante para esta decisión.**

## **\*\*Jerarquía de frecuencia (según Final Spec 24.05):\*\***

## **| \*\*Tier\*\* | \*\*Frecuencia\*\* | \*\*Módulos\*\* | \*\*Ubicación\*\* |**

## **|----------|---------------|-------------|---------------|**

## **| Tier 1 | Diario | Home, Tasks, Calendar, Feed | Bottom Nav o Home |**

## **| Tier 2 | Semanal | Finance, Goals, Presence | Bottom Nav o More |**

## **| Tier 3 | Ocasional | Documents, Inventory | More |**

## **| Tier 0 | Especial (siempre disponible) | SOS, Geni | Swipe global, Quick Actions |**

## **\*\*Estructura oficial del Home (Final Spec 18.05):\*\***

## **El Home no es configurable por el usuario en MVP. Su estructura responde al modelo mental "Atención → Acción → Exploración":**

## **1. \*\*Briefing Geni\*\* — Resumen inteligente. Siempre primero.**

## **2. \*\*Atención Requerida\*\* — SOS, tareas vencidas, pagos vencidos, aprobaciones pendientes.**

## **3. \*\*Carga Familiar\*\* — Distribución del esfuerzo en el hogar.**

## **4. \*\*Próximos Eventos\*\* — Agenda inmediata.**

## **5. \*\*Tareas\*\* — Agrupadas por Responsabilidad.**

## **6. \*\*Finanzas Relevantes\*\* — Condicional. Solo aparece cuando hay alertas.**

## **7. \*\*Presence Resumido\*\* — Quién está en casa, quién viene.**

## **8. \*\*Actividad Familiar\*\* — Feed resumido.**

## **\*\*Regla:\*\* Toda información mostrada en Home debe conducir al módulo que la administra. Home resume. Los módulos administran (18.02).**

## **\*\*El Home se adapta por rol (18.23):\*\***

## **- \*\*Coordinador:\*\* Visión completa del hogar.**

## **- \*\*Adulto:\*\* Visión operativa.**

## **- \*\*Adolescente:\*\* Más foco en tareas, eventos y coordinación.**

## **- \*\*Niño:\*\* Experiencia simplificada.**

## **- \*\*Adulto Mayor:\*\* Experiencia adaptada con prioridad en personas, eventos, recordatorios y medicación.**

## **- \*\*Invitado:\*\* Acceso mínimo.**

## **- \*\*Empleado Familiar:\*\* Visión centrada en trabajo asignado.**

## **\*\*Lo que NUNCA hacemos:\*\***

## **- Poner features técnicamente complejas en Home solo porque "costó mucho hacerlas".**

## **- Esconder features de uso diario en Configuración para "mantener el Home limpio".**

## **- Hacer que el usuario tenga que aprender dónde está cada cosa.**

## **\*\*El riesgo aceptado:\*\* Power users van a querer customizar completamente el Home. No lo permitimos en MVP. El Home es adaptativo por rol y por contexto (motor Geni), pero no es infinitamente configurable.**

## **---**

## **#### 7. Datos accesibles. Geni interviene cuando detecta patrones problemáticos.**

## **\*\*Qué significa:\*\* Todos los datos del hogar son accesibles directamente. No hay información oculta. Pero cuando Geni detecta que un miembro está consultando datos de otro con una frecuencia que sugiere vigilancia en lugar de coordinación, interviene con un guardrail. Sin bloquear el acceso.**

## **\*\*Acceso directo sin mediación:\*\***

## **Cualquier miembro puede consultar — según sus permisos — el historial de tareas, gastos familiares, ubicación, calendario y documentos compartidos de otros miembros del hogar.**

## **\*\*Intervención de Geni (detección de patrones):\*\***

## **| \*\*Patrón detectado\*\* | \*\*Intervención de Geni\*\* |**

## **|----------------------|--------------------------|**

## **| Consulta frecuente de ubicación del mismo miembro | Geni ofrece ayuda. "Veo que estás revisando seguido la ubicación de \[nombre]. ¿Querés que te ayude a coordinar algo?" |**

## **| Revisión reiterada de tareas ajenas | Geni sugiere mediación. "¿Querés que Geni le mande un recordatorio en tu lugar?" |**

## **| Consulta insistente de gastos de otro miembro | Geni ofrece facilitar la conversación. |**

## **\*\*Respuestas de Geni:\*\* Geni no acusa. Geni no juzga. Geni ofrece ayuda. El tono es siempre: "Veo que estás prestando mucha atención a esto. ¿Querés que te ayude con algo?"**

## **\*\*Lo que Geni registra (y no comparte):\*\***

## **Geni mantiene un registro privado de patrones de consulta para calibrar futuras intervenciones. Este registro \*\*no es visible para ningún miembro\*\*, incluido el Coordinador. Pertenece a la capa de inteligencia del sistema, no a la capa de transparencia del hogar.**

## **\*\*Lo que NUNCA hacemos:\*\***

## **- Bloquear el acceso a datos porque el usuario los consulta mucho.**

## **- Avisar a un miembro que otro está revisando sus datos (eso genera paranoia).**

## **- Juzgar al usuario. Geni ofrece ayuda, no emite juicios.**

## **\*\*El riesgo aceptado:\*\* Algunos usuarios van a sentir que Geni es invasivo por señalar sus patrones de consulta. Pero sin este guardrail, HomePlus se convierte en herramienta de vigilancia sin freno. La intervención de Geni es el mecanismo que mantiene la transparencia dentro de límites saludables.**

## **---**

## **### PRIORIDADES ARQUITECTÓNICAS**

## **Cuando hay conflicto entre dos enfoques, estas prioridades gobiernan:**

## **#### 1. Adopción > Perfección**

## **Si una feature perfecta requiere 3 meses pero nadie entiende cómo usarla, la simplificamos hasta que sea adoptable. Luego iteramos.**

## **#### 2. Transparencia > Confort**

## **Si mostrar un dato va a incomodar pero resuelve asimetría de coordinación, se muestra. HomePlus no está diseñado para que las familias se sientan bien. Está diseñado para que funcionen bien.**

## **#### 3. Valor individual > Valor colectivo (para adopción inicial)**

## **Cada miembro debe encontrar utilidad propia desde el primer uso. Si el valor solo aparece cuando toda la familia está activa, el producto muere en adopción.**

## **#### 4. Proactividad > Reactividad (pero calibrada por patrones)**

## **Geni actúa antes de que el problema explote, no después. Pero solo cuando detecta patrones, no incidentes aislados.**

## **#### 5. Datos duros > Narrativas suaves**

## **Cuando Geni presenta información, usa datos concretos. "Tres tareas completadas de ocho" — no "estás progresando en tus responsabilidades".**

## **#### 6. Defaults inteligentes > Configuración obligatoria**

## **El 80% de los usuarios nunca va a tocar configuración avanzada. Los defaults deben funcionar bien para ese 80%. La complejidad debe resolverse mediante diseño y automatización, no trasladando configuraciones al usuario (02.06).**

## **#### 7. Ecosistema integrado > Módulos aislados**

## **Los módulos no deben comportarse como aplicaciones separadas. Todos los dominios deben poder relacionarse entre sí (02.10). Una tarea puede vincularse a un Asset. Un gasto puede vincularse a una Meta. Un documento puede vincularse a un Vehículo.**

## **---**

## **### TRADEOFFS ACEPTADOS**

## **Cada tradeoff es una decisión consciente. Sabemos lo que sacrificamos. Sabemos por qué lo hacemos. Y sabemos bajo qué condiciones reconsideramos.**

## **---**

## **#### Tradeoff 1: Transparencia operativa vs. Privacidad absoluta**

## **\*\*Decisión:\*\* Priorizamos transparencia del hogar sobre privacidad absoluta.**

## **\*\*Lo que sacrificamos:\*\* Usuarios que quieren autonomía total no van a adoptar HomePlus.**

## **\*\*Lo que ganamos:\*\* Resolución del problema central (asimetría de coordinación). Adopción profunda en el target correcto.**

## **\*\*Cuándo reconsideramos:\*\* Nunca en datos de coordinación compartida (tareas, calendario, gastos familiares). Solo en datos personales sensibles (memoria privada, metas privadas, finanzas personales).**

## **---**

## **#### Tradeoff 2: Poder ejecutivo del Coordinador vs. Democracia absoluta**

## **\*\*Decisión:\*\* Priorizamos efectividad de coordinación sobre horizontalidad total.**

## **\*\*Lo que sacrificamos:\*\* Hogares donde nadie quiere asumir el rol de Coordinador no van a funcionar bien. Miembros que rechazan cualquier autoridad organizativa van a resistir.**

## **\*\*Lo que ganamos:\*\* Alguien puede mantener el hogar operativo cuando otros no colaboran. El sistema tiene un responsable claro.**

## **\*\*Cuándo reconsideramos:\*\* Si detectamos abuso sistemático (expulsiones reiteradas, uso del sistema como herramienta de control), endurecemos los guardrails.**

## **---**

## **#### Tradeoff 3: Proactividad de Geni vs. Calma absoluta**

## **\*\*Decisión:\*\* Priorizamos proactividad que previene colapsos sobre zero notificaciones.**

## **\*\*Lo que sacrificamos:\*\* Usuarios que quieren silencio total no van a estar cómodos.**

## **\*\*Lo que ganamos:\*\* Prevención de acumulación de tareas, vencimientos perdidos y conflictos de horario. Justificación de la existencia de Geni.**

## **\*\*Cuándo reconsideramos:\*\* Si las métricas muestran abandono masivo por "demasiadas notificaciones", recalibramos umbrales.**

## **---**

## **#### Tradeoff 4: Simplicidad en onboarding vs. Completitud funcional**

## **\*\*Decisión:\*\* Priorizamos un onboarding que entregue valor en 60 segundos sobre exponer todas las features en el primer uso.**

## **\*\*Lo que sacrificamos:\*\* Power users van a tardar en descubrir features avanzadas. Features complejas van a estar "escondidas" en More o Configuración.**

## **\*\*Lo que ganamos:\*\* Adopción masiva. Retención temprana.**

## **\*\*Cuándo reconsideramos:\*\* Si detectamos que features core nunca son descubiertas, agregamos descubrimiento guiado post-onboarding.**

## **---**

## **#### Tradeoff 5: Sincronización en tiempo real vs. Funcionalidad offline completa**

## **\*\*Decisión:\*\* Priorizamos sincronización en tiempo real sobre funcionamiento offline completo (20.02).**

## **\*\*Lo que sacrificamos:\*\* La experiencia offline es limitada: permite lectura de datos ya cargados y acciones básicas como completar tareas o crear comentarios. Pero no replica toda la plataforma (20.03).**

## **\*\*Lo que ganamos:\*\* Sincronización instantánea entre dispositivos. Funcionalidades que requieren conectividad: Presence en tiempo real, Feed, Geni online, sincronización de cambios.**

## **\*\*Cuándo reconsideramos:\*\* Si los usuarios reportan problemas de conectividad frecuentes, la cola de sincronización offline (20.05) ya está prevista en la arquitectura. Las acciones offline quedan pendientes y se sincronizan automáticamente al recuperar conexión (20.06), con resolución de conflictos Last Write Wins (20.07).**

## **---**

## **#### Tradeoff 6: SOS siempre disponible vs. Dependencia de conectividad**

## **\*\*Decisión:\*\* SOS es el sistema de máxima prioridad del ecosistema. Pero su funcionamiento completo depende de conectividad.**

## **\*\*Lo que sacrificamos:\*\* SOS no está disponible en modo offline (20.04). Si un miembro está sin conexión, SOS no puede enviar alertas en tiempo real. La arquitectura contempla un fallback progresivo: almacenamiento local → reintento de envío → canales alternativos (WhatsApp → SMS → llamada directa, según 24.11).**

## **\*\*Lo que ganamos:\*\* Cuando hay conectividad, SOS funciona con máxima prioridad en Home (18.24), escalado automático (13.10: Coordinador → Adultos → Personas relevantes), integración total con Presence (ubicación actual, historial reciente, lugares relevantes según 13.11), y auditoría permanente de cada activación (13.13).**

## **\*\*Cuándo reconsideramos:\*\* Si la frecuencia de uso offline es significativa, reforzamos los mecanismos de fallback para que la transición a canales alternativos sea más rápida y automática.**

## **---**

## **#### Tradeoff 7: Aislamiento Multi-Hogar vs. Coordinación entre hogares**

## **\*\*Decisión:\*\* Cada hogar es una entidad completamente independiente. No existe coordinación ni compartición automática entre hogares.**

## **\*\*Lo que sacrificamos:\*\* Usuarios que pertenecen a múltiples hogares (ej.: familia principal + hogar de padre divorciado) deben gestionar cada contexto por separado. No hay vista unificada. No hay traspaso automático de información entre hogares.**

## **\*\*Lo que ganamos:\*\* Privacidad absoluta entre hogares. La memoria familiar pertenece al hogar y nunca se comparte automáticamente (16.09). Los roles son independientes: un usuario puede ser Coordinador en un hogar y Adulto en otro sin conflicto (16.05). Cada hogar tiene su propio Home, su propio Planner, su propio Finance.**

## **\*\*Cuándo reconsideramos:\*\* Solo si surge un caso de uso validado y masivo que requiera coordinación entre hogares, y solo mediante consentimiento explícito de ambos hogares. Nunca como comportamiento por defecto.**

## **---**

## **#### Tradeoff 8: Escalado automático SOS vs. Privacidad de ubicación**

## **\*\*Decisión:\*\* Cuando se activa un SOS, el sistema accede a ubicación actual, historial reciente y lugares relevantes para maximizar la efectividad de la respuesta. Esto puede sobrepasar temporalmente configuraciones de privacidad de ubicación.**

## **\*\*Lo que sacrificamos:\*\* En una emergencia, la privacidad de ubicación cede frente a la seguridad. SOS utiliza Presence sin restricciones (13.11). La información enviada puede incluir persona, ubicación, hora y contexto disponible (13.05).**

## **\*\*Lo que ganamos:\*\* Respuesta a emergencias con contexto completo. Los destinatarios de la alerta reciben información accionable, no solo una notificación de "alguien necesita ayuda". El escalado automático reduce el tiempo de respuesta.**

## **\*\*Cuándo reconsideramos:\*\* Nunca. La seguridad en emergencias está por encima de cualquier otra prioridad del sistema. Este tradeoff es permanente.**

## **---**

## **### QUÉ NUNCA HACEMOS**

## **Estas son líneas rojas. Decisiones que, sin importar la presión de usuarios, competencia o inversores, \*\*nunca tomamos\*\*. Cada una está anclada en la Final Spec V1.**

## **---**

## **#### 1. Nunca vendemos los datos del hogar**

## **HomePlus no tiene modelo de negocio basado en publicidad o venta de datos. Los datos del hogar son privados. No se analizan para entrenar modelos externos. No se venden a terceros.**

## **\*\*Por qué es línea roja:\*\* Si rompemos esto, destruimos la propuesta de valor central: un espacio privado para la familia.**

## **---**

## **#### 2. Nunca ocultamos el uso del poder del Coordinador**

## **Cada acción unilateral del Coordinador queda registrada en auditoría permanente y es visible para el hogar. No importa quién pague la suscripción. El audit log es inborrable.**

## **\*\*Por qué es línea roja:\*\* Sin este guardrail, HomePlus se convierte en herramienta de control autoritario.**

## **---**

## **#### 3. Nunca suavizamos datos operativos para "mantener la paz"**

## **Si un miembro hizo el 87% de las tareas, el número es 87%. No es "la mayoría". No es "una parte significativa". Es 87%. Geni puede presentarlo con contexto, pero el dato duro está ahí.**

## **\*\*Por qué es línea roja:\*\* Si suavizamos la realidad, dejamos de resolver el problema central: la invisibilidad del esfuerzo.**

## **---**

## **#### 4. Nunca permitimos que un miembro sea completamente invisible para la coordinación del hogar**

## **La ubicación puede pausarse temporalmente (08.04). Las finanzas personales son privadas (04.02). Pero los compromisos compartidos — tareas, eventos, gastos familiares, responsabilidades — son visibles. No existe el "pertenecer al hogar pero no rendir cuentas".**

## **\*\*Por qué es línea roja:\*\* Si permitimos invisibilidad total, el sistema de coordinación colapsa.**

## **---**

## **#### 5. Nunca celebramos el fracaso**

## **Si un miembro completó 2 de 8 tareas, el sistema muestra 2 de 8. No hay badges de "¡Buen intento!". No convertimos el fracaso en logro.**

## **\*\*Por qué es línea roja:\*\* La celebración falsa genera cinismo. Si el sistema festeja todo, no festeja nada.**

## **---**

## **#### 6. Nunca hacemos que Geni actúe en nombre de un miembro sin su permiso explícito**

## **Geni puede sugerir: "¿Querés que le recuerde sobre la tarea?". Pero solo actúa si el miembro dice "Sí". Geni no manda mensajes automáticos en nombre de nadie. Geni no crea automatizaciones permanentes sin aprobación (15.16).**

## **\*\*Por qué es línea roja:\*\* Si Geni actúa automáticamente en nombre de personas, el sistema se siente como un bot intrusivo, no como un asistente.**

## **---**

## **#### 7. Nunca restringimos el acceso a SOS por rol**

## **Todos los miembros del hogar pueden emitir una alerta SOS. Incluye Niño, Adolescente, Adulto Mayor y Empleado Familiar (13.03). Solo el nivel de emergencia máxima (🔴 Emergencia grave) tiene restricción: Niños y Empleados Familiares no pueden emitirla directamente (24.11). Pero los niveles 🟠 Necesito ayuda y 🟡 Coordinación urgente están disponibles para todos.**

## **\*\*Por qué es línea roja:\*\* Restringir el acceso a SOS por rol es restringir el acceso a pedir ayuda. La seguridad no se segmenta por jerarquía.**

## **---**

## **#### 8. Nunca compartimos datos entre hogares automáticamente**

## **Cada hogar es una entidad independiente con sus propios roles, Planner, Finance, Presence, Inventory, Assets, HomeCloud, Feed y Automatizaciones (16.04). La memoria familiar pertenece al hogar y nunca se comparte automáticamente con otros hogares (16.09). Si un usuario pertenece a múltiples hogares, los datos de un hogar nunca "filtran" hacia otro.**

## **\*\*Por qué es línea roja:\*\* La independencia entre hogares es una garantía de privacidad estructural. Un padre divorciado no debe ver datos del nuevo hogar de su ex-pareja. Un empleado familiar que trabaja en múltiples hogares no debe exponer datos entre ellos.**

## **---**

## **#### 9. Nunca eliminamos la auditoría de activaciones SOS**

## **Toda activación de SOS queda registrada permanentemente (13.13). Quién emitió, cuándo, desde dónde, qué nivel, quién canceló. Esta auditoría no se borra. No se archiva. No se desactiva.**

## **\*\*Por qué es línea roja:\*\* SOS es el sistema de máxima criticidad del ecosistema. Cada activación es un evento que debe poder reconstruirse. Borrar este historial sería borrar evidencia de emergencias.**

## **---**

## **#### 10. Nunca permitimos que el modo offline bloquee funciones críticas de lectura**

## **Cuando un miembro está sin conexión, el sistema garantiza acceso de solo lectura a: tareas, eventos, personas, activos, stock de inventory y archivos descargados previamente (20.03). Un miembro sin internet debe poder ver qué tareas tiene pendientes, qué eventos vienen y qué medicamentos están por vencer.**

## **\*\*Por qué es línea roja:\*\* La coordinación no puede detenerse porque falló la conexión. La información crítica debe estar disponible incluso offline. Lo que no está disponible sin conexión — Presence en tiempo real, Feed, SOS, Geni online — está explícitamente fuera del alcance offline por dependencia técnica, no por decisión de diseño (20.04).**

## **---**

## **### REGLA FINAL**

## **Si una decisión futura contradice este documento, este documento tiene prioridad hasta que exista una nueva versión canónica aprobada de la Final Spec que lo modifique explícitamente. Estos principios no son decoración. Son la arquitectura ética y operativa del producto.**

## **---**

