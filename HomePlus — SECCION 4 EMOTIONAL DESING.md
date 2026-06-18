**# HomePlus — PRODUCT BRAIN**

**## Sección 4: Emotional Design**

**\*Arquitectura emocional del sistema\***

**v1.1 — Junio 2026**

**Estado: Activo**

**---**

**## Sobre esta sección**

**El diseño emocional de HomePlus no es una capa de estilo encima del producto. Es la arquitectura que define cómo el sistema afecta las relaciones reales de las personas que lo usan.**

**Esta sección documenta qué debería sentir cada miembro del hogar al usar HomePlus — incluidos los roles de Invitado y Empleado Familiar —, qué emociones el sistema está explícitamente prohibido de generar, y cómo esas decisiones impactan en notificaciones, automatizaciones, Geni, el sistema SOS y la dinámica familiar cotidiana.**

**Todo lo documentado acá fue construido mediante un proceso de workshop iterativo de diseño emocional sistémico. No son decisiones de marketing. Son decisiones de arquitectura.**

**---**

**## Principio central**

**> \*HomePlus resuelve un problema emocional — la asimetría de coordinación — mediante herramientas funcionales. Si las herramientas generan las mismas emociones que el problema que vienen a resolver, el producto fracasó.\***

**La asimetría de coordinación produce resentimiento, desgaste y explosión. HomePlus no puede producir resentimiento, desgaste ni explosión. Ese es el límite que guía todas las decisiones de esta sección.**

**---**

**# Emociones objetivo**

**Las siguientes emociones son las que HomePlus debe generar activamente en sus usuarios. No son aspiracionales. Son criterios de diseño: si una decisión de producto no contribuye a al menos una de estas emociones, la decisión debe revisarse.**

**## Seguridad**

**El sistema está ahí cuando se necesita. La certeza de que pedir ayuda es simple y efectivo — mediante SOS en sus tres niveles (Emergencia grave, Necesito ayuda, Coordinación urgente) — genera una confianza basal que atraviesa toda la experiencia del producto. No es una emoción que se siente a diario; es una emoción que se sabe disponible.**

**Traducción de diseño: SOS es accesible con un solo gesto (swipe ↑ global, según §24.11 de la arquitectura). El panel de SOS presenta opciones claras, nunca dispara una alerta sin confirmación. La cancelación no penaliza. El sistema confirma que la ayuda está en camino.**

**## Calma**

**El sistema reduce la carga cognitiva del coordinador. Las cosas pasan sin que nadie tenga que sostenerlas en la cabeza. La app recuerda, organiza y anticipa para que el usuario no tenga que hacerlo todo el tiempo.**

**Traducción de diseño: las notificaciones son útiles, no decorativas. Geni interviene antes de que haya urgencia. El Home nunca se siente abrumador.**

**## Claridad**

**Cada miembro sabe qué le toca, qué hizo el resto, cuál es el estado del hogar. La información existe y es accesible. No hay que preguntar, adivinar ni recordar.**

**Traducción de diseño: los datos se presentan con contexto. Geni no lanza números sin explicación. Las tareas tienen responsable visible y estado claro.**

**## Reconocimiento**

**El esfuerzo de cada miembro es visible para el resto. Quien hace las cosas, lo ve reconocido. Este es el mecanismo central que resuelve la asimetría de coordinación: la visibilidad del esfuerzo produce reconocimiento antes de que el resentimiento aparezca.**

**Traducción de diseño: los logros se celebran públicamente en el Feed (dominio People). Geni presenta datos de esfuerzo con tono afirmativo, nunca evaluativo. Las rachas de cumplimiento son visibles para el hogar.**

**## Pertenencia**

**Cada miembro siente que es parte activa del hogar, no un destinatario pasivo de instrucciones. El sistema refuerza que el hogar es un proyecto colectivo, no una estructura de mando.**

**Traducción de diseño: el Feed familiar es el espacio de lo cotidiano compartido. Los logros del hogar se celebran como equipo. La incorporación de nuevos miembros tiene bienvenida real.**

**### Pertenencia activa — Adulto Mayor**

**Para el Adulto Mayor específicamente, la emoción objetivo no es inclusión pasiva sino pertenencia activa: sentir que seguís siendo parte de algo que te necesita. La diferencia es importante. Inclusión pasiva genera dependencia. Pertenencia activa genera propósito.**

**Traducción de diseño: el Adulto Mayor puede contribuir al hogar de formas simples y visibles. El sistema no le exige aprender mecánicas complejas ni le recuerda lo que no hizo. Su experiencia adaptada prioriza personas, eventos, recordatorios, medicación y coordinación (§04.07 de la arquitectura), con funciones configurables, no asumidas por defecto.**

**## Control saludable**

**Los miembros tienen agencia real sobre su vida dentro del sistema. Pueden declarar que necesitan un día más liviano. Pueden ver su historial. Pueden decidir su nivel de visibilidad en ciertos módulos. El sistema da información, no órdenes.**

**Traducción de diseño: el modo carga reducida existe. La privacidad por módulo es configurable. Geni sugiere, no impone.**

**## Alivio — para el coordinador en crisis**

**Cuando el coordinador necesita soltar, el sistema tiene que generar alivio: la sensación de que puede delegar sin que el hogar colapse. HomePlus tiene que demostrar en ese momento que fue construido exactamente para eso.**

**Traducción de diseño: la delegación temporal del rol coordinador es un gesto activo y simple. Geni detecta inactividad prolongada y sugiere cobertura con tono de cuidado, no de alarma.**

**---**

**# Emociones a evitar**

**Las siguientes emociones son las que HomePlus está explícitamente prohibido de generar. No son riesgos teóricos. Son consecuencias reales de decisiones de diseño mal ejecutadas.**

**## Vigilancia**

**Presence — con su ubicación, historial, check-ins y estados — es una herramienta que en el mundo real genera sensación de monitoreo si no está diseñada con precisión.**

**La línea entre seguridad familiar y vigilancia no es técnica. Es emocional. Un adolescente que siente que la app lo rastrea va a abandonarla o va a resistirla activamente. Un adulto que siente que su pareja lo monitorea va a perder confianza en el hogar y en el sistema.**

**Traducción de diseño: Presence se rige por el principio de coordinación sobre control (§08.02 de la arquitectura). Los niveles de visibilidad (Nivel 1, 2 y 3) están definidos por rol y son configurables (§08.05). Geni no empuja datos de ubicación sin contexto de seguridad. Presence no posee widget permanente en Home; aparece mediante Briefing, Atención Requerida o widgets contextuales (§08.23).**

**## Culpa acumulada**

**La culpa productiva — la que genera acción — es una herramienta válida y está incorporada en el sistema. La culpa acumulada — la que se asienta sin salida, sin mecanismo de recuperación — destruye la motivación y la relación con el producto.**

**La diferencia entre las dos es el diseño de la salida. Si el sistema penaliza sin ofrecer un camino de recuperación claro, la culpa se vuelve vergüenza. La vergüenza no genera acción. Genera abandono.**

**Traducción de diseño: la racha tiene mecanismo de recuperación (resta de días en lugar de reinicio desde cero si se retoma rápido). La escalada de Geni da tiempo real al miembro para resolver antes de involucrar al coordinador. El modo carga reducida existe para cuando el contexto lo justifica.**

**## Presión social dentro del hogar**

**HomePlus hace visible el esfuerzo de cada miembro. Eso es el valor central del producto. Pero visibilidad sin diseño de tono puede convertirse en exposición pública de fallos.**

**La diferencia entre reconocimiento y humillación es cómo se presenta la información. "Tomás completó todas sus tareas esta semana" es reconocimiento. "Tomás lleva 5 días sin completar ninguna tarea" en el Feed familiar es presión social.**

**Traducción de diseño: los logros van al Feed. Las faltas no van al Feed, van a Geni de forma privada con la secuencia de escalada definida. El Feed de logros celebra sin contrastar.**

**## Ansiedad por notificaciones**

**Una app que notifica constantemente no es una app útil. Es una app ansiosa. Si HomePlus interrumpe el día de sus usuarios con notificaciones que no requieren acción inmediata, va a generar exactamente el microestrés que dice querer evitar.**

**Traducción de diseño: las notificaciones se segmentan en cuatro prioridades — Crítica (SOS), Alta (aprobaciones, pagos vencidos, tareas vencidas), Media (eventos, comentarios, cambios importantes) y Baja (actividad general, Feed) — según §19.04 de la arquitectura. Las alertas de bajo impacto se agrupan en resúmenes. El sistema nunca notifica dos veces lo mismo. SOS tiene prioridad absoluta y no puede silenciarse (§19.07).**

**## Pánico — durante una emergencia**

**El sistema SOS existe para gestionar emergencias, no para generarlas. Si la interfaz de SOS, el tono de las notificaciones o la mecánica de escalamiento inducen pánico en quien emite la alerta o en quien la recibe, el sistema falló en su propósito.**

**Traducción de diseño: el panel SOS presenta tres niveles claramente diferenciados (§24.11) para que el usuario pueda calibrar su respuesta. SOS nunca dispara una alerta directa sin pasar por el panel de confirmación. Las notificaciones de SOS incluyen información concreta (persona, ubicación, hora, contexto disponible) para que quien recibe pueda actuar, no solo asustarse. El SOS Silencioso (§13.06–§13.08) existe justamente para situaciones donde la señal visible de pánico agravaría el peligro.**

**## Carga — para el Adulto Mayor**

**La emoción que HomePlus nunca debe generar en el Adulto Mayor es la sensación de que usar la app es trabajo, que hay que aprender algo difícil, que están siendo monitoreados por su bien. Eso es lo que sienten los adultos mayores en la mayoría de las apps tecnológicas y es exactamente lo que los hace abandonarlas.**

**Traducción de diseño: la experiencia del Adulto Mayor prioriza personas, eventos, recordatorios, medicación y coordinación (§04.07), con interfaz simplificada por defecto. Las funciones que asumen condiciones médicas son opcionales y se activan solo si el miembro o coordinador las habilita explícitamente.**

**## Ambigüedad de rol — para el Empleado Familiar {#ambigüedad-de-rol-empleado-familiar}**

**El Empleado Familiar no forma parte del núcleo familiar (§17.02). Si el sistema genera mensajes, notificaciones o interacciones que sugieren un vínculo emocional que no existe, se crea una situación incómoda para ambas partes: el empleado siente presión de pertenecer, la familia siente que los límites se desdibujan.**

**Traducción de diseño: el tono del sistema hacia el Empleado Familiar es profesional y respetuoso. No recibe publicaciones del Feed que asumen lazos familiares. Su Home está centrado en trabajo asignado (§18.23). Geni solo le entrega información necesaria para trabajar (§17.17).**

**## Exclusión — para el Invitado {#exclusión-para-el-invitado}**

**El Invitado tiene acceso mínimo por definición (§04.08). Pero "acceso mínimo" no debe significar "experiencia hostil". Si el Invitado siente que la app lo trata como un extraño indeseable, la coordinación puntual que motivó su invitación se vuelve tensa.**

**Traducción de diseño: la experiencia del Invitado es limitada pero cálida. Los límites son claros desde el inicio, sin sorpresas. El tono del sistema reconoce su presencia sin forzar pertenencia.**

**## Dependencia emocional del sistema**

**HomePlus no puede convertirse en el único espacio donde la familia se comunica o se reconoce. Si una familia solo se felicita a través del Feed de la app, la app está reemplazando vínculos en lugar de facilitarlos.**

**Traducción de diseño: cuando Geni detecta que el coordinador necesita hablar con un miembro, sugiere la conversación fuera de la app. El sistema facilita relaciones reales, no las sustituye.**

**---**

**# Diseño Emocional del SOS**

**El sistema SOS de HomePlus es el componente de mayor responsabilidad emocional del producto. Está definido arquitectónicamente en §13 y §24.11 de la especificación canónica. Esta sección documenta su capa emocional.**

**## Principio rector del SOS emocional**

**> \*SOS debe generar seguridad sin pánico, urgencia sin caos, y alivio sin olvido. Cada nivel de alerta activa un perfil emocional distinto. El sistema nunca debe hacer sentir a quien pide ayuda que exageró, ni a quien recibe la alerta que perdió tiempo.\***

**## Los tres niveles y su perfil emocional**

**### 🔴 Emergencia grave**

**\*\*Emoción que debe generar en quien la emite:\*\* Protección inmediata. "Ya pedí ayuda. Vienen. No estoy solo."**

**\*\*Emoción que debe generar en quien la recibe:\*\* Urgencia focalizada, no pánico difuso. La notificación debe decir exactamente qué pasa, dónde, y qué se espera del destinatario. Sin ambigüedad.**

**\*\*Lo que el sistema nunca debe hacer en este nivel:\*\* Generar fricción. Este nivel no admite confirmaciones adicionales ni pasos intermedios. El panel SOS es el único paso antes de la activación.**

**\*\*Permisos:\*\* Coordinador, Adulto, Adulto Mayor, Adolescente (§24.11). Niños y Empleados Familiares no pueden emitir este nivel. Es importante que el Adolescente pueda: negarle este acceso en una situación real de riesgo físico es un fallo de diseño con consecuencias graves.**

**### 🟠 Necesito ayuda**

**\*\*Emoción que debe generar en quien la emite:\*\* Respaldo. "Esto no es una catástrofe, pero necesito que alguien me asista ahora."**

**\*\*Emoción que debe generar en quien la recibe:\*\* Atención con contexto. Hay un problema; no es riesgo de vida; alguien necesita soporte activo.**

**\*\*Lo que el sistema nunca debe hacer en este nivel:\*\* Escalar sin dar tiempo a la red de apoyo primaria. La notificación va a los responsables de contexto y adultos relevantes, no a todos automáticamente.**

**\*\*Permisos:\*\* Todos los roles, incluidos Niño y Empleado Familiar (§24.11).**

**### 🟡 Coordinación urgente**

**\*\*Emoción que debe generar en quien la emite:\*\* Pragmatismo. "Necesito coordinar rápido. Esto no es una emergencia."**

**\*\*Emoción que debe generar en quien la recibe:\*\* Colaboración. "Alguien necesita una mano con algo urgente pero manejable."**

**\*\*Lo que el sistema nunca debe hacer en este nivel:\*\* Tratarlo como emergencia. La diferencia de tono entre 🔴 y 🟡 debe ser inequívoca. Si el sistema equipara los tres niveles en su comunicación, destruye la calibración emocional y genera fatiga de alerta.**

**\*\*Permisos:\*\* Todos los roles (§24.11).**

**## La experiencia del SOS Silencioso**

**El SOS Silencioso (§13.06–§13.08 de la arquitectura) tiene una carga emocional específica: quien lo emite está en una situación donde mostrar que pide ayuda podría empeorar las cosas.**

**\*\*Emoción objetivo:\*\* Seguridad sin exposición. El sistema protege no solo físicamente sino socialmente.**

**\*\*Traducción de diseño:\*\* Quien emite SOS Silencioso no ve señales visibles en su dispositivo. Los destinatarios reciben exactamente la misma información que en un SOS normal. La diferencia es exclusivamente local. El sistema no revela que fue "silencioso" a los destinatarios — eso podría generar preguntas que expongan a quien pidió ayuda.**

**## Cancelación: el diseño emocional del error**

**Cancelar un SOS involuntario es una experiencia emocionalmente cargada. Quien canceló por error puede sentir vergüenza o temor a haber generado una falsa alarma.**

**\*\*Principio:\*\* La cancelación nunca debe penalizar emocionalmente. El sistema pide motivo — error, falsa alarma, lo resolví, me equivoqué (§24.11) — pero no juzga el motivo. La categorización de motivos alimenta datos operativos, no evaluación del usuario.**

**\*\*Protección contra activación accidental:\*\* El sistema ofrece una breve ventana para cancelar antes del envío definitivo (§13.09).**

**## La experiencia de quien recibe la alerta SOS**

**El destinatario de un SOS atraviesa tres fases emocionales:**

**1. \*\*Impacto:\*\* Recibe la notificación. Necesita información clara e inmediata: quién, dónde, nivel de gravedad.**

**2. \*\*Acción:\*\* Necesita saber qué se espera. ¿Debe ir? ¿Debe llamar? ¿Debe coordinar con otros? La ambigüedad en esta fase convierte la preocupación en ansiedad.**

**3. \*\*Cierre:\*\* Necesita confirmación de que la situación se resolvió. Un SOS que queda "abierto" emocionalmente genera inquietud persistente.**

**\*\*Traducción de diseño:\*\* Las notificaciones SOS incluyen persona, ubicación, nivel y contexto disponible. Cuando un SOS se cancela o cierra, todos los destinatarios reciben confirmación. El sistema no deja alertas sin cerrar.**

**## Alivio post-resolución**

**\*\*Emoción objetivo:\*\* Alivio con cierre. La situación terminó. El sistema lo registra y lo confirma.**

**\*\*Lo que el sistema debe hacer:\*\* Confirmar el cierre a todos los involucrados. Registrar el evento en auditoría (§13.13). Volver al estado operativo normal sin dramatismo.**

**\*\*Lo que el sistema nunca debe hacer:\*\* Minimizar el evento después de cerrado ("era solo una falsa alarma"), ni generar un espectáculo de alivio que incomode a quien pidió ayuda. El tono post-resolución es: "Cerrado. Todo en orden." Punto.**

**## SOS en Home**

**SOS tiene prioridad máxima en Home (§13.12). Siempre desplaza cualquier otro contenido. Esto es correcto arquitectónicamente, pero tiene una implicancia emocional: si SOS aparece en Home, algo grave está pasando. El diseño visual debe comunicar gravedad sin generar pánico en otros miembros del hogar que vean el Home sin ser destinatarios directos de la alerta.**

**---**

**# Arquitectura de escalada de Geni**

**Geni opera con una secuencia de escalada ante incumplimientos. Esta secuencia es el mecanismo central que convierte a Geni en aliado del miembro antes de convertirlo en canal de reporte al coordinador.**

**La secuencia aplica a tareas del hogar con responsable asignado. Los tiempos son configurables por el coordinador en el onboarding.**

**| Día | Acción de Geni | Emoción objetivo |**

**|---|---|---|**

**| Día 1 | Recordatorio privado y neutro al miembro | Agencia. El miembro tiene tiempo real sin presión externa. |**

**| Día 2 | Asignación automática de tarea de compensación menor. Sin aviso al coordinador. | Presión sistémica, no social. El miembro entiende la consecuencia sin que nadie se la diga. |**

**| Día 3 | Geni avisa al miembro: en 24 horas se notifica al coordinador si no hay acción. | Última ventana de agencia. El miembro tiene información completa para actuar. |**

**| Día 4 | Geni notifica al coordinador: "Hay tareas sin resolver desde hace una semana. Puede ser un buen momento para hablar." | Facilitación de conversación, no denuncia. Geni no señala, sugiere. |**

**Principio rector de la escalada: Geni es aliado del miembro durante 3 días antes de escalar. Cuando escala, lo hace con tono de facilitación de conversación real, no de reporte disciplinario.**

**---**

**# Mecánica de racha, culpa y recuperación**

**## Rachas**

**HomePlus implementa rachas de cumplimiento individuales y familiares. La racha individual registra días consecutivos completando todas las tareas asignadas. La racha familiar registra días donde todos los miembros del hogar cumplieron.**

**Las rachas generan motivación social real. También generan presión real cuando se rompen. El diseño de la recuperación es tan importante como el diseño de la racha.**

**## Recuperación de racha**

**Si un miembro retoma el cumplimiento al día siguiente de romper la racha, el sistema aplica una resta de 5 días en lugar de reinicio desde cero. Esto reduce la sensación de pérdida total y mantiene el incentivo de retomar rápido.**

**Si no retoma al día siguiente, la racha se reinicia en cero y se empieza de nuevo.**

**## Calibración de carga por contexto**

**En épocas de mayor ocupación personal — semana de exámenes, día laboral cargado, evento familiar significativo — la carga de tareas asignadas se reduce automáticamente según la información del calendario del miembro (dominio Planner §06, Calendar).**

**La reducción existe pero la penalización también: el miembro que enfrenta una semana difícil tiene menos tareas, pero igual se contabiliza el cumplimiento de las que tiene.**

**Quién activa la reducción: el sistema la detecta automáticamente desde el calendario cargado. El miembro también puede declararlo manualmente (ver Modo carga reducida más abajo).**

**## Modo carga reducida**

**Cualquier miembro puede declarar que necesita un período más liviano. Esto genera una solicitud que el coordinador debe responder con dos opciones: aprobar o proponer conversación.**

**Si se aprueba: la carga se reduce o pausa según el contexto, sin penalización en la racha.**

**Si el coordinador propone conversación: el flujo normal continúa hasta que haya acuerdo.**

**El modo es ilimitado en frecuencia, pero requiere la aprobación del coordinador en cada activación. El coordinador ve el historial completo de activaciones. Esto es suficiente para detectar patrones de evasión sin convertir el sistema en un tribunal.**

**La solicitud en sí ya es un acto de comunicación: el miembro dice "necesito ayuda", el coordinador responde. Eso es exactamente lo que HomePlus quiere facilitar.**

**---**

**# Memoria histórica y visibilidad del rendimiento**

**## Qué registra el sistema**

**HomePlus mantiene memoria histórica del rendimiento de cada miembro: tareas completadas, rachas, activaciones de modo carga reducida, logros obtenidos. Esta memoria es permanente y no se borra con el reinicio de una racha.**

**## Cómo presenta Geni el rendimiento**

**Geni no usa etiquetas evaluativas. No dice "rendimiento bajo" ni "rendimiento excelente". Presenta datos concretos con contexto y dirección.**

**> \*"Esta semana completaste 6 de 10 tareas. Tu mejor semana del mes fue la segunda, con 9 de 10."\***

**Esta formulación activa agencia: la persona puede hacer algo con esa información. Las etiquetas evaluativas activan defensividad. Los datos con contexto activan acción.**

**Geni avisa cuando el rendimiento está por debajo del promedio histórico del miembro, cuando está en su rango normal, y cuando es excepcionalmente alto. En los tres casos, presenta datos sin juicio.**

**## Visibilidad por rol**

**El miembro ve su propio historial completo. El coordinador puede ver el historial de todos los miembros del hogar en tiempo real, pero no recibe notificaciones de rendimiento individual hasta que hay un problema sistémico — es decir, hasta que Geni activa la escalada.**

**La información existe y está disponible para el coordinador. No se empuja permanentemente.**

**## Logros públicos**

**Los logros de rendimiento excelente se publican en el Feed familiar como logros. El reconocimiento es público, colectivo y celebratorio. No hay segmentación por rol: el coordinador tiene logros igual que los demás miembros, porque su trabajo también es esfuerzo visible.**

**El Feed de logros celebra sin contrastar. Muestra lo que alguien hizo, no lo que otro no hizo.**

**---**

**# Principios emocionales según composición del hogar**

**Si bien HomePlus no modifica su arquitectura de roles y permisos según la composición del hogar — los siete roles oficiales (§04.01) operan igual en cualquier hogar —, la aplicación de los principios emocionales de esta sección debe considerar el contexto relacional.**

**| Composición | Principio emocional dominante | Nota de diseño |**

**|---|---|---|**

**| Hogar con hijos | La jerarquía Coordinador → Adulto → Adolescente → Niño es natural y funcional. | La asimetría de acceso es esperable. El foco emocional está en que el Adolescente y el Niño sientan agencia creciente, no control. |**

**| Hogar con adulto mayor | Pertenencia activa, no inclusión pasiva. | La experiencia adaptada del Adulto Mayor (§04.07) debe configurarse con sensibilidad: activar solo las funciones que suman, no las que abruman. |**

**| Hogar de pareja sin hijos | El Coordinador debe ejercer su rol con conciencia de horizontalidad relacional. | Aunque arquitectónicamente exista un Coordinador, el tono del sistema debe reforzar que ambos son pares en la vida real. Geni evita marcar jerarquía en comunicaciones a este hogar. |**

**| Hogar de convivientes | La coordinación es funcional, no relacional. | Las notificaciones y el Feed deben reflejar este tono: colaboración operativa sin intimidad forzada. El Empleado Familiar, si existe, tiene su propio espacio claramente delimitado (§17). |**

**| Hogar con Empleado Familiar | Profesionalismo respetuoso. Límites visibles. | El sistema segmenta claramente la comunicación: el Empleado Familiar ve lo que necesita para trabajar (§17.17). El tono hacia él es profesional, no pseudo-familiar. |**

**| Hogar con Invitado | Bienvenida temporal. Participación sin pertenencia forzada. | La experiencia del Invitado es limitada por arquitectura (§04.08). El tono es cálido pero no confunde acceso con membresía. |**

**---**

**# Emociones del Invitado**

**El Invitado es un rol oficial de HomePlus (§04.08, §05.05) con acceso mínimo y participación limitada. Su diseño emocional merece atención específica porque la experiencia de "estar pero no pertenecer del todo" puede generar fricción si no se diseña con intención.**

**## Emociones objetivo para el Invitado**

**### Bienvenida sin presión**

**El Invitado debe sentir que su presencia en el hogar digital es valorada, pero sin la expectativa implícita de que "debería" participar más. Su acceso mínimo es una decisión de arquitectura, no un juicio sobre su importancia.**

**\*\*Traducción de diseño:\*\* La invitación incluye contexto claro: por qué se lo invita, qué podrá ver y hacer, y por cuánto tiempo si aplica. El onboarding del Invitado es breve y cálido, sin tutoriales innecesarios.**

**### Claridad de límites**

**El Invitado debe saber exactamente qué puede y qué no puede hacer, sin descubrirlo por ensayo y error. La ambigüedad de permisos genera inseguridad.**

**\*\*Traducción de diseño:\*\* Las funciones no disponibles para el Invitado no se muestran atenuadas con mensajes de "no tenés permiso" — simplemente no aparecen. Lo que el Invitado ve es todo lo que puede hacer. Sin recordatorios de lo que no.**

**### Participación sin ambigüedad**

**Cuando el Invitado participa — por ejemplo, al crear un Recuerdo en HomeCloud si tiene permisos (§11.06) — su contribución es visible sin forzar una narrativa de pertenencia que no corresponde.**

**\*\*Traducción de diseño:\*\* El tono del sistema hacia el Invitado es neutro y respetuoso. No usa lenguaje de "familia". No lo incluye en publicaciones automáticas del Feed que asumen membresía plena.**

**---**

**# Emociones del Empleado Familiar**

**El Empleado Familiar es un rol oficial (§04.09, §17 completo) que representa colaboradores operativos del hogar: niñera, jardinero, personal de limpieza, cuidador, chofer, asistente doméstico (§17.01). La arquitectura es clara: no forman parte de la familia, forman parte de la operación del hogar (§17.02). El diseño emocional debe proteger esta distinción.**

**## Emociones objetivo para el Empleado Familiar**

**### Profesionalismo respetuoso**

**La relación es laboral. El tono del sistema debe reflejarlo sin frialdad, pero sin ambigüedad. El respeto se expresa en claridad de expectativas, no en simulación de cercanía.**

**\*\*Traducción de diseño:\*\* Las comunicaciones del sistema usan lenguaje profesional. No hay mensajes que asuman vínculo afectivo ("tu familia de HomePlus"). La Agenda Laboral (§17.08) es visible y clara. Las responsabilidades están definidas explícitamente (§17.07).** 

**### Autonomía dentro del encuadre**

**El Empleado Familiar debe poder completar sus tareas, comentar, adjuntar evidencia (§17.10) sin sentir que cada acción es supervisada en tiempo real. La confianza operativa es parte del respeto profesional.**

**\*\*Traducción de diseño:\*\* El Empleado Familiar ve su Home centrado en trabajo asignado (§18.23). Geni responde consultas operativas (§17.16): "¿Qué tareas tengo hoy?", "¿Hay alguien en casa?", "¿Cambió la agenda?". No recibe información fuera de su encuadre laboral (§17.17).**

**### Valoración profesional, no afectiva**

**El reconocimiento al Empleado Familiar debe ser por trabajo bien hecho, no por "ser parte de la familia". La diferencia es sutil pero crucial: "Gracias por completar todas tus tareas esta semana" vs. "Gracias por ser parte de esta familia". Lo primero es profesional. Lo segundo es una invasión de límites.**

**\*\*Traducción de diseño:\*\* El reconocimiento en el sistema hacia el Empleado Familiar es operativo y concreto. No aparece en el Feed con tono celebratorio-familiar. Si el hogar quiere expresar aprecio personal, el sistema facilita que eso ocurra fuera de la app.**

**### Límites que protegen**

**La desvinculación (§17.18) es una realidad de la relación laboral. El sistema debe manejarla con dignidad: se elimina el acceso, se conserva el historial operativo, no se borra el registro de trabajo. El Empleado Familiar que se va no desaparece del sistema como si nunca hubiera existido, pero tampoco recibe comunicaciones post-relación que confundan los límites.**

**\*\*Traducción de diseño:\*\* Al finalizar la relación, el estado del Empleado Familiar cambia a Finalizado (§17.19). El historial de tareas, pagos y horarios se conserva para el hogar. El empleado no recibe más notificaciones. La transición es limpia.**

**---**

**# Situaciones de edge case — postura emocional**

**## A — El miembro fantasma**

**Situación: un miembro dejó de abrir la app pero sigue viviendo en el hogar.**

**Postura emocional: el sistema no hace visible la ausencia de forma punitiva. No hay contador de días sin actividad público. La ausencia no se expone en el Feed.**

**Qué hace Geni: trabaja en privado con el miembro ausente. Le envía mensajes de bajo riesgo emocional — no recordatorios de tareas, sino cosas que le conciernen directamente: fotos nuevas del álbum, logros de otros miembros. La puerta de regreso es emocional, no funcional.**

**Al coordinador: Geni le informa en privado que un miembro lleva tiempo inactivo y le sugiere una conversación real fuera de la app. HomePlus no reemplaza la conversación. La facilita.**

**## B — Conflicto activo entre miembros**

**Situación: dos miembros del hogar están en conflicto.**

**Postura emocional: HomePlus no es mediador. El sistema no interfiere en la dinámica interpersonal ni intenta detectar conflictos emocionales. Si los miembros no se hablan en la vida real pero cumplen sus responsabilidades en la app, eso es suficiente para el sistema.**

**Lo que el sistema nunca hace: forzar interacción entre dos miembros en conflicto ni exponer el logro de uno frente al otro como forma de presión implícita.**

**## C — El coordinador en crisis**

**Situación: el coordinador enfrenta una situación personal que le impide cumplir su rol.**

**Postura emocional: alivio. El coordinador necesita sentir que puede soltar sin que el hogar colapse.**

**Mecanismo: delegación temporal a otro miembro adulto, con duración definida. Geni detecta inactividad prolongada y sugiere la delegación con tono de cuidado: "Llevás varios días sin actividad. ¿Querés que alguien te cubra por un tiempo?" El hogar no colapsa. Las responsabilidades se redistribuyen. El sistema demuestra que fue construido para esto.**

**Los hogares con dos o más Adultos (y un solo Coordinador) tienen cobertura natural: si el Coordinador delega, el Adulto designado sostiene.**

**## D — Incorporación de miembro nuevo**

**Situación: un nuevo miembro se suma a un hogar con historia, dinámicas y rachas establecidas.**

**Postura emocional: bienvenida real, integración gradual. El miembro nuevo necesita contexto para entender dónde está, una primera acción de bajo riesgo que lo haga sentir parte, y que el hogar lo reconozca.**

**Qué hace el sistema: el coordinador activa una bienvenida ceremonial visible en el Feed. Geni le da al nuevo miembro un resumen privado del hogar — quiénes son, cuál es la dinámica, qué se espera de él. Le asigna una primera tarea simple de alto impacto visible: cuando la complete, aparece en el Feed como contribución real. El hogar lo ve hacer algo, no solo llegar.**

**## E — Falsa alarma de SOS**

**Situación: un miembro activó SOS por error o en una situación que se resolvió inmediatamente.**

**Postura emocional: la cancelación existe para esto (§24.11). El sistema no penaliza ni estigmatiza. Pide motivo — error, falsa alarma, lo resolví, me equivoqué — y cierra el evento.**

**Qué hace el sistema: notifica el cierre a todos los destinatarios. Registra en auditoría. No genera follow-ups innecesarios ni recordatorios del incidente. La emoción objetivo es alivio con cierre, no vergüenza por el error.**

**---**

**# Tabla de decisiones — Emotional Design**

**| Decisión | Resolución |**

**|---|---|**

**| \*\*Emoción que Geni nunca debe generar\*\* | Acusación, juicio, humillación pública, sensación de denuncia. |**

**| \*\*Tono de Geni ante incumplimientos\*\* | Datos concretos con contexto y dirección. Sin etiquetas evaluativas. Sin juicios. |**

**| \*\*Tono de Geni ante logros\*\* | Celebratorio. Concreto. Público en Feed cuando es excelente. |**

**| \*\*Culpa como herramienta\*\* | Culpa productiva calibrada por contexto. Con mecanismo de recuperación. Sin acumulación indefinida. |**

**| \*\*Racha rota — recuperación\*\* | Resta de 5 días si se retoma al día siguiente. Reinicio en cero si no. |**

**| \*\*Escalada de Geni\*\* | Día 1: recordatorio privado. Día 2: tarea compensatoria. Día 3: aviso al miembro con 24h. Día 4: notificación al coordinador con tono de conversación. |**

**| \*\*Modo carga reducida\*\* | Ilimitado. Requiere aprobación del coordinador en cada activación. Historial visible para coordinador. |**

**| \*\*Memoria histórica\*\* | Permanente. Visible para el miembro en tiempo real. Visible para el coordinador sin notificaciones automáticas salvo escalada. |**

**| \*\*Feed de logros\*\* | Público para todos los miembros del hogar (no para Invitado ni Empleado Familiar con tono celebratorio-familiar). Celebra sin contrastar. Nunca expone faltas. |**

**| \*\*Coordinador en crisis\*\* | Delegación temporal activa. Geni sugiere con tono de cuidado. La emoción objetivo es alivio. |**

**| \*\*SOS — emoción objetivo\*\* | Seguridad sin pánico. Urgencia sin caos. Alivio con cierre. |**

**| \*\*SOS — cancelación\*\* | Sin penalización emocional. El sistema pide motivo sin juzgarlo. |**

**| \*\*SOS Silencioso\*\* | Seguridad sin exposición. Protección local. Misma información para destinatarios que SOS normal. |**

**| \*\*Adulto Mayor — emoción objetivo\*\* | Pertenencia activa. Nunca carga ni sensación de monitoreo. |**

**| \*\*Invitado — emociones objetivo\*\* | Bienvenida sin presión. Claridad de límites. Participación sin ambigüedad. |**

**| \*\*Empleado Familiar — emociones objetivo\*\* | Profesionalismo respetuoso. Autonomía dentro del encuadre. Valoración profesional, no afectiva. Límites que protegen. |**

**| \*\*Miembro fantasma\*\* | Sin exposición pública de la ausencia. Geni trabaja en privado con el miembro. Facilita conversación real con el coordinador. |**

**| \*\*Conflicto entre miembros\*\* | El sistema no interfiere. No fuerza interacción. No expone un miembro frente al otro. |**

**| \*\*Nuevo miembro\*\* | Bienvenida ceremonial activada por coordinador. Integración gradual con primera tarea visible. |**

**| \*\*Falsa alarma de SOS\*\* | Cierre inmediato con notificación a destinatarios. Sin follow-up punitivo. Sin estigmatización. |**

**---**

**# Fuera del scope de esta sección**

**Las siguientes decisiones derivan de este documento y se definen en secciones posteriores:**

**- Cómo el tono emocional se expresa visualmente en cada pantalla → Sección 6: UX Philosophy**

**- Cómo Geni procesa el contexto familiar para calibrar su tono → Sección 7: IA**

**- Cómo se diseña la pantalla de aprobación del modo carga reducida para que el coordinador no sienta que está juzgando → Sección 6: UX Philosophy**

**- Cómo se diseña el Feed de logros para celebrar sin contrastar → Sección 6: UX Philosophy**

**- Qué datos específicos se almacenan del historial y por cuánto tiempo → Sección 8: Data Philosophy**

**- Cómo el módulo del Adulto Mayor se define post investigación de campo → Pendiente de investigación**

**- Cómo se implementa visualmente el panel SOS y sus tres niveles → Sección 6: UX Philosophy**

**- Cómo se diseña la experiencia post-resolución de SOS en Home → Sección 6: UX Philosophy**

**---**

**\*— fin de sección 4 —\***

