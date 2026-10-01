**\*\*Producto:\*\* HomePlus — Sistema Operativo del Hogar**



**\*\*Versión:\*\* 1.0**



**\*\*Fecha:\*\* Junio 2026**



**\*\*Dependencias:\*\* FinalSpec V2 (§02.01, §02.02, §02.05, §11, §23), Sección 2 (Principios), Sección 4 (Emotional Design), Sección 7 (AI Philosophy)**



**\*\*Principio rector:\*\* Los datos del hogar son del hogar. HomePlus los administra con el mismo cuidado con que una familia guarda las llaves de su casa.**



**> \*\*Castellano LATAM · Filosofía de producto · Accionable para implementación\*\***



**## 8.1 Principios de Datos {#principios-de-datos}**



**HomePlus maneja los datos más sensibles que existen: los de una familia. Dónde están sus miembros, cuánto gastan, qué documentos los identifican, qué tareas los ocupan, qué conversaciones tienen con su asistente. Estos cinco principios no son aspiracionales: son líneas rojas. Si una decisión de producto o ingeniería viola uno de estos principios, la decisión está mal.**



**### 8.1.1 Ownership — Los datos son del usuario, HomePlus administra {#ownership-los-datos-son-del-usuario-HomePlus-administra}**



**> \*\*Principio:\*\* La familia es dueña de sus datos. HomePlus es el administrador, nunca el propietario. (§02.02)**



**| El usuario puede… | HomePlus debe… |**

**|---|---|**

**| Ver todos sus datos en todo momento | Proveer acceso irrestricto a los datos propios |**

**| Exportarlos en formatos estándar (§8.6) | Garantizar exportación sin fricción |**

**| Solicitar eliminación total | Ejecutar borrado completo en ≤30 días |**

**| Saber exactamente qué datos existen | Mantener un inventario de datos visible desde Configuración |**

**| Cerrar su cuenta y llevarse todo | Entregar copia completa antes del borrado final |**



**\*\*Lo que HomePlus nunca hace con los datos del hogar:\*\***



**- Venderlos. Es la línea roja #1 del producto. No se venden datos. Nunca. Bajo ninguna circunstancia. (§2)**

**- Analizarlos para entrenar modelos externos. Ningún dato del hogar alimenta modelos de terceros. (§7.8.2)**

**- Usarlos para publicidad. El modelo de negocio es suscripción, no anuncios. (§2)**

**- Cruzarlos con datos de otros hogares. Cada hogar es una bóveda aislada. No existe el «benchmark anónimo entre hogares».**



**### 8.1.2 Portabilidad — Siempre exportable, descargable, recuperable {#portabilidad-siempre-exportable-descargable-recuperable}**



**> \*\*Principio:\*\* Ningún dato del hogar queda atrapado en HomePlus. La familia debe poder llevarse todo, en cualquier momento, sin justificar el motivo. (§2)**



**La portabilidad no es una funcionalidad secundaria. Es un derecho del usuario y una obligación del producto. Ver §8.6 para la política completa de exportación.**



**### 8.1.3 Minimización — Solo se guarda lo necesario para coordinar {#minimización-solo-se-guarda-lo-necesario-para-coordinar}**



**> \*\*Principio:\*\* HomePlus no aspira a «saber todo del hogar». Aspira a saber lo mínimo necesario para que el hogar funcione mejor. (§02.01, §02.11)**



**| Dato | ¿Se guarda? | Justificación |**

**|---|---|---|**

**| Tareas, eventos, gastos | ✅ Sí | Son el núcleo de coordinación |**

**| Ubicación en tiempo real | ✅ Sí (efímera) | Necesaria para presencia y coordinación |**

**| Historial de ubicación | ✅ Sí (30 días) | Necesario para patrones de movilidad familiar (§08.06) |**

**| Conversaciones literales con Geni | ❌ No | Solo temas y decisiones extraídas (§7.5.3) |**

**| Tono emocional de conversaciones | ❌ No | Deliberado: Geni no interpreta emociones (§7.6.2) |**

**| Fotos en crudo para IA | ❌ No | Solo metadatos clasificados localmente (§7.8.2) |**

**| Contraseñas, tokens, claves | ❌ No | Nunca se almacenan (§7.8.2) |**

**| Datos biométricos | ❌ No | Fuera de alcance |**

**| Historial de navegación en la app | ❌ No | No se trackea comportamiento de uso |**



**### 8.1.4 Transparencia — El usuario sabe qué se guarda y por qué {#transparencia-el-usuario-sabe-qué-se-guarda-y-por-qué}**



**> \*\*Principio:\*\* Nadie debería preguntarse «¿HomePlus estará guardando esto?». La respuesta debe ser evidente sin leer documentación.**



**\*\*Mecanismos de transparencia:\*\***



**| Mecanismo | Dónde | Qué muestra |**

**|---|---|---|**

**| \*\*Inventario de datos\*\* | Configuración → Mis Datos | Lista completa de categorías de datos almacenados, con contadores |**

**| \*\*Indicador de contexto\*\* | Briefing de Geni | Cuando Geni usa un dato para una recomendación, dice de dónde lo sacó: «Según tus gastos de este mes…» |**

**| \*\*Log de accesos a datos\*\* | Configuración → Privacidad | Qué miembro o proceso accedió a qué dato, cuándo y desde dónde |**

**| \*\*Notificación de nuevos usos\*\* | Push + email | Si se agrega una nueva categoría de dato o un nuevo uso, el coordinador recibe un aviso con 30 días de anticipación |**

**| \*\*Consulta directa a Geni\*\* | Chat con Geni | «Geni, ¿qué datos guardás sobre mí?» → Responde con el inventario personal |**



**### 8.1.5 Trazabilidad — Las acciones importantes dejan huella {#trazabilidad-las-acciones-importantes-dejan-huella}**



**> \*\*Principio:\*\* Las acciones que afectan al hogar deben poder reconstruirse. No para vigilar, sino para entender. (§02.05)**



**Toda acción sobre datos del hogar (crear, modificar, eliminar, compartir, exportar) genera un registro de auditoría. Ver §8.3.8.**



**## 8.2 Clasificación de Datos {#clasificación-de-datos}**



**HomePlus clasifica todos los datos en cuatro categorías. Esta clasificación determina permisos, retención, cifrado y visibilidad. No es una etiqueta técnica: es una decisión de producto con consecuencias concretas.**



**### 8.2.1 Las Cuatro Categorías {#las-cuatro-categorías}**



**| Categoría | Definición | Ejemplos | Principio rector |**

**|---|---|---|---|**

**| \*\*Datos de Coordinación\*\* | Información necesaria para que el hogar funcione como sistema | Tareas, eventos, gastos compartidos, listas de compras, recordatorios | Visibles para quien necesita coordinar |**

**| \*\*Datos Personales\*\* | Información que pertenece a un miembro individual | Tareas propias no compartidas, memorias personales, metas individuales, rachas, preferencias de notificación | Privados por defecto. El miembro decide qué comparte |**

**| \*\*Datos Sensibles\*\* | Información que requiere protección reforzada por su naturaleza | Documentos de identidad, datos de salud, ubicación en tiempo real, información financiera de tarjetas, claves de acceso | Protección máxima. Cifrado especial. Acceso mínimo. |**

**| \*\*Datos de Auditoría\*\* | Registro inmutable de acciones sobre el sistema | Quién creó/modificó/eliminó qué, cuándo, desde dónde. Log de Geni sobre patrones (§7.6.1) | Inmutables. Permanentes. No los ve ningún miembro directamente. |**



**### 8.2.2 Tabla Completa de Clasificación por Tipo de Dato {#tabla-completa-de-clasificación-por-tipo-de-dato}**



**| Tipo de dato | Categoría | ¿Quién lo ve por defecto? | ¿Se puede compartir? | ¿Cifrado especial? |**

**|---|---|---|---|---|**

**| Tareas del hogar | Coordinación | Todos los miembros | — (ya es visible) | No |**

**| Tareas personales | Personal | Solo el dueño | Sí, a voluntad | No |**

**| Eventos del hogar | Coordinación | Todos los miembros | — | No |**

**| Eventos personales | Personal | Solo el dueño | Sí, a voluntad | No |**

**| Gastos del hogar | Coordinación | Adultos + Adulto Mayor + Coordinador. El Adolescente creador ve los propios (§04.05). | — | No |**

**| Gastos personales | Personal | Solo el dueño | Sí, a voluntad | No |**

**| Deudas entre miembros | Coordinación | Deudor + Acreedor + Coordinador | No (solo partes involucradas) | No |**

**| Ubicación en tiempo real | Sensible | Nivel 3: Coordinador, Adulto, Adulto Mayor. Nivel 2: Adolescente, Niño, Invitado. Configurable. (§08.05) | Sí, con confirmación | No |**

**| Historial de ubicación | Sensible | Solo el dueño + Coordinador (§08.06) | No | No |**

**| Documentos de identidad | Sensible | Solo el dueño + Coordinador | Sí, con confirmación explícita | ✅ Sí |**

**| Documentos del hogar | Coordinación | Todos los miembros adultos (Adulto, Adulto Mayor, Coordinador) | — | No |**

**| Documentos personales | Personal | Solo el dueño | Sí, a voluntad | No |**

**| Fotos/videos familiares | Coordinación | Todos los miembros | Sí (miembros del hogar) | No |**

**| Fotos/videos personales | Personal | Solo el dueño | Sí, a voluntad | No |**

**| Datos de salud/medicación | Sensible | Dueño + cuidadores designados + Coordinador | No | ✅ Sí |**

**| Conversaciones con Geni | Personal | Solo el miembro | No | No |**

**| Log de patrones (Geni) | Auditoría | Solo Geni | No | ✅ Sí |**

**| Registro de auditoría | Auditoría | Solo HomePlus (sistema) | No | ✅ Sí |**

**| Rachas | Personal | Solo el dueño (Niño: visible para padres) | No (Niño: automático para padres) | No |**

**| Logros | — | Integrados en Goals (§24.07). No son entidad de datos independiente. | — | — |**

**| Métricas de carga | Coordinación | Solo Coordinador | No | No |**

**| Notificaciones | Personal | Solo el destinatario | No | No |**

**| Preferencias de configuración | Personal | Solo el dueño | No | No |**

**| Memorias personales | Personal | Solo el dueño | Sí, a voluntad | No |**

**| Memorias familiares | Coordinación | Todos los miembros | — | No |**



**## 8.3 Políticas de Retención {#políticas-de-retención}**



**Cada tipo de dato tiene una política de retención explícita. No hay «guardar por si acaso». Cada plazo responde a una razón concreta: funcional, legal, emocional o de seguridad.**



**### 8.3.1 Tareas — Historial {#tareas-historial}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Tareas activas\*\* | Se guardan mientras el hogar existe. No expiran. |**

**| \*\*Tareas completadas\*\* | Se guardan como historial permanente. Forman parte de la memoria histórica del hogar (§4). |**

**| \*\*Tareas eliminadas\*\* | Van a papelera. Permanecen 30 días. Luego se eliminan definitivamente. |**

**| \*\*¿Se puede eliminar?\*\* | Sí. Cualquier miembro puede eliminar sus propias tareas. El coordinador puede eliminar cualquier tarea. |**

**| \*\*¿Va a papelera?\*\* | Sí. 30 días. Recuperable por el dueño o el coordinador. |**

**| \*\*¿Se archiva?\*\* | No. Completada = histórico. Eliminada = papelera 30 días → borrado. |**

**| \*\*Fundamento\*\* | Las tareas completadas son memoria emocional: rachas, logros, «todo lo que hicimos este año». Eliminarlas borraría esa historia. Las tareas eliminadas se destruyen para no acumular ruido. |**



**### 8.3.2 Eventos — Historial {#eventos-historial}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Eventos futuros\*\* | Se guardan indefinidamente mientras el hogar existe. |**

**| \*\*Eventos pasados\*\* | Se guardan como historial permanente. Forman parte de la memoria del hogar. |**

**| \*\*Eventos eliminados\*\* | Van a papelera. 30 días. Luego se eliminan definitivamente. |**

**| \*\*Eventos recurrentes\*\* | Al eliminar, el usuario elige: «este evento» o «toda la serie». El evento individual va a papelera 30 días. La serie completa: papelera 30 días para todos los eventos futuros; los pasados se preservan como historial. |**

**| \*\*¿Se puede eliminar?\*\* | Sí. El creador o el coordinador. |**

**| \*\*¿Va a papelera?\*\* | Sí. 30 días. |**

**| \*\*¿Se archiva?\*\* | No. Pasado = histórico. Eliminado = papelera 30 días → borrado. |**

**| \*\*Fundamento\*\* | Los eventos son la narrativa del hogar: «el asado del sábado», «el cumpleaños de la abuela». Perder ese historial es perder la historia familiar. Pero los eventos cancelados no deberían contaminar el calendario. |**



**### 8.3.3 Gastos — Historial {#gastos-historial}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Gastos activos\*\* | Se guardan mientras el hogar existe. |**

**| \*\*Gastos del mes cerrado\*\* | Se guardan como historial permanente. |**

**| \*\*Gastos eliminados\*\* | Papelera 30 días. Luego eliminación definitiva. |**

**| \*\*Exportación contable\*\* | El usuario puede exportar por períodos (mes, año, rango personalizado). |**

**| \*\*¿Se puede eliminar?\*\* | Sí. El dueño del gasto o el coordinador. |**

**| \*\*¿Va a papelera?\*\* | Sí. 30 días. |**

**| \*\*¿Se archiva?\*\* | No. Historial permanente. |**

**| \*\*Fundamento\*\* | Los gastos tienen implicancias legales e impositivas. Un hogar puede necesitar recuperar un gasto de hace 3 años para una declaración jurada. El historial financiero completo es un derecho del hogar. |**



**### 8.3.4 Ubicación — Historial {#ubicación-historial}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Ubicación en tiempo real\*\* | Efímera. Se almacena solo la última posición conocida. Se actualiza con cada nueva lectura. |**

**| \*\*Historial de ubicación\*\* | \*\*30 días\*\*. Eliminación automática progresiva (día 31: se borra el día 1). (§08.06) |**

**| \*\*¿Se puede eliminar?\*\* | Sí. El dueño puede borrar todo su historial en cualquier momento. |**

**| \*\*¿Se puede extender?\*\* | No. 30 días es fijo e inmutable. No es configurable. |**

**| \*\*¿Va a papelera?\*\* | No. Eliminación directa sin papelera (por seguridad). |**

**| \*\*¿Se archiva?\*\* | No. |**

**| \*\*Fundamento\*\* | 30 días capturan patrones de movilidad sin convertir a HomePlus en un rastreador permanente. Suficiente para que Geni detecte rutinas («los martes sale más temprano»); insuficiente para construir un perfil de vigilancia. La eliminación es sin papelera para que, si un miembro decide borrar su historial, sea definitivo e inmediato. |**



**### 8.3.5 Documentos — Activos + Versiones Anteriores {#documentos-activos-versiones-anteriores}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Documentos activos\*\* | Se guardan mientras el hogar existe. |**

**| \*\*Versiones anteriores\*\* | Se guardan \*\*todas las versiones\*\*. Sin límite de cantidad. Sin caducidad. (§11) |**

**| \*\*Documentos eliminados\*\* | Papelera 30 días. (§11.25, §11.26) |**

**| \*\*Versiones de documentos eliminados\*\* | Se eliminan junto con el documento activo al cumplirse los 30 días de papelera. |**

**| \*\*¿Se puede eliminar una versión específica?\*\* | Sí. El dueño puede eliminar versiones intermedias. Van a papelera 30 días. |**

**| \*\*¿Se archiva?\*\* | No. Activo = disponible. Eliminado = papelera 30 días → borrado. |**

**| \*\*Fundamento\*\* | Los documentos del hogar evolucionan: una autorización se modifica, una receta se ajusta, un contrato se actualiza. Mantener todas las versiones permite auditoría natural y evita pérdida de información. El costo de almacenamiento de versiones de documentos es trivial frente al valor de no perder una cláusula borrada accidentalmente. |**



**### 8.3.6 Fotos y Videos {#fotos-y-videos}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Fotos/videos activos\*\* | Se guardan mientras el hogar existe. |**

**| \*\*Fotos/videos eliminados\*\* | Papelera 30 días. Luego eliminación definitiva. |**

**| \*\*Metadatos de clasificación\*\* | Se guardan junto con la foto/video. Si la foto se elimina, los metadatos también. |**

**| \*\*¿Se pueden eliminar en lote?\*\* | Sí. Selección múltiple y eliminación. |**

**| \*\*¿Se archiva?\*\* | No. |**

**| \*\*Fundamento\*\* | Las fotos familiares son irremplazables. La papelera de 30 días es una red de seguridad contra eliminaciones accidentales. Pero HomePlus no es un servicio de backup infinito de fotos: si la familia quiere archivar, que use HomeCloud. |**



**### 8.3.7 Conversaciones con Geni {#conversaciones-con-geni}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Historial de conversaciones\*\* | \*\*90 días\*\*. Eliminación automática progresiva. |**

**| \*\*Temas y decisiones extraídas\*\* | Permanentes como memoria personal o familiar (solo con confirmación explícita del usuario; §7.5.2). |**

**| \*\*¿Se pueden eliminar?\*\* | Sí. El usuario puede borrar conversaciones individuales o todo el historial en cualquier momento. |**

**| \*\*¿Va a papelera?\*\* | No. Eliminación directa. |**

**| \*\*¿Se pueden compartir?\*\* | No. Las conversaciones con Geni no son compartibles. (§7.8) |**

**| \*\*Fundamento\*\* | 90 días permiten que Geni contextualice respuestas con conversaciones recientes. Más allá de eso, el valor contextual decae y la privacidad manda. Las decisiones importantes extraídas (memorias) persisten; las conversaciones literales, no. |**



**### 8.3.8 Auditoría {#auditoría}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Registro de auditoría\*\* | \*\*Permanente\*\*. No se elimina nunca. (§23) |**

**| \*\*¿Qué registra?\*\* | Autor, fecha, hora, acción, entidad afectada, valor anterior, valor nuevo, origen (app/web, IP). |**

**| \*\*¿Quién puede verlo?\*\* | Solo HomePlus (sistema). Ningún miembro del hogar accede al log de auditoría crudo. |**

**| \*\*¿Se puede eliminar?\*\* | No. Es inmutable por diseño. |**

**| \*\*Fundamento\*\* | La auditoría es la memoria institucional del sistema. Permite reconstruir cualquier acción sobre los datos del hogar. No es para vigilar a los miembros: es para garantizar que el sistema funciona correctamente y resolver disputas técnicas. |**



**### 8.3.9 Métricas de Carga {#métricas-de-carga}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Métricas de carga (tareas por miembro)\*\* | \*\*90 días\*\* de detalle diario. Agregados mensuales: permanentes. |**

**| \*\*Tendencias y promedios\*\* | Permanentes mientras el hogar existe. |**

**| \*\*¿Se pueden eliminar?\*\* | No por el usuario. Forman parte del funcionamiento del sistema. |**

**| \*\*Fundamento\*\* | 90 días de detalle permiten que Geni detecte asimetrías y patrones. Los agregados permanentes permiten ver evolución sin almacenar cada dato diario indefinidamente. |**



**### 8.3.10 Rachas {#rachas}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Rachas activas\*\* | Permanentes mientras el miembro está en el hogar. |**

**| \*\*Historial de rachas\*\* | Permanente. Forma parte de la memoria histórica personal (§4). |**

**| \*\*¿Se pueden eliminar?\*\* | No por el usuario. Son derivados de datos de tareas. Si las tareas se eliminan, las rachas asociadas se recalculan. |**

**| \*\*¿Se archivan?\*\* | No. |**

**| \*\*Fundamento\*\* | Las rachas son memoria emocional. Un niño que ve su «Racha de 30 días ordenando el cuarto» está viendo su historia de esfuerzo. Borrar eso sería borrar reconocimiento ganado. Los logros, por su parte, se rastrean dentro de Goals (§24.07: «Goals (metas, progreso y logros)») y heredan la política de retención de Goals. |**



**### 8.3.11 Notificaciones {#notificaciones}**



**| Aspecto | Política |**

**|---|---|**

**| \*\*Notificaciones push\*\* | Se entregan y se descartan. No se almacenan en el servidor. |**

**| \*\*Notificaciones in-app\*\* | \*\*30 días\*\*. Luego se eliminan automáticamente. |**

**| \*\*¿Se pueden eliminar?\*\* | Sí. El usuario puede descartar cualquier notificación. |**

**| \*\*¿Se archivan?\*\* | No. |**

**| \*\*Fundamento\*\* | Las notificaciones son efímeras por naturaleza. 30 días es suficiente para recuperar «¿qué me avisó Geni la semana pasada?». Más que eso es ruido. |**



**### 8.3.12 Tabla Resumen de Retención {#tabla-resumen-de-retención}**



**| Tipo de dato | Retención | ¿Papelera? | ¿Eliminable por usuario? | ¿Archivable? |**

**|---|---|---|---|---|**

**| Tareas completadas | Permanente | — | No (parte del historial) | No |**

**| Tareas eliminadas | 30 días en papelera → borrado | ✅ 30 días | Sí | No |**

**| Eventos pasados | Permanente | — | No (parte del historial) | No |**

**| Eventos eliminados | 30 días en papelera → borrado | ✅ 30 días | Sí | No |**

**| Gastos (historial) | Permanente | — | Sí | No |**

**| Gastos eliminados | 30 días en papelera → borrado | ✅ 30 días | Sí | No |**

**| Ubicación (historial) | 30 días rolling | ❌ | Sí (borrado inmediato) | No |**

**| Documentos activos | Permanente | — | Sí | No |**

**| Versiones de docs | Permanente (mientras viva el doc) | — | Sí (por versión) | No |**

**| Docs eliminados | 30 días en papelera → borrado | ✅ 30 días | Sí | No |**

**| Fotos/videos | Permanente (mientras viva el hogar) | ✅ 30 días | Sí | No |**

**| Conversaciones Geni | 90 días rolling | ❌ | Sí (borrado inmediato) | No |**

**| Auditoría | Permanente. Inmutable. | ❌ | No | No |**

**| Métricas de carga (detalle) | 90 días | ❌ | No | No |**

**| Métricas de carga (agregado) | Permanente | ❌ | No | No |**

**| Rachas | Permanente | ❌ | No (recalculables) | No |**

**| Logros | = Política de Goals (§8.3.2, §6) | — | = Política de Goals | No |**

**| Notificaciones in-app | 30 días rolling | ❌ | Sí | No |**

**| Memorias personales | Permanente (mientras exista el miembro) | ✅ 30 días | Sí | No |**

**| Memorias familiares | Permanente (mientras exista el hogar) | ✅ 30 días | Sí | No |**



**## 8.4 Privacidad por Defecto {#privacidad-por-defecto}**



**La privacidad en HomePlus no se configura: se hereda. Cada dato nace con un nivel de visibilidad predefinido según su clasificación. El usuario puede abrirlo, nunca el sistema.**



**### 8.4.1 Qué es Privado por Defecto {#qué-es-privado-por-defecto}**



**| Dato | Visible solo para… | ¿Se puede ampliar? |**

**|---|---|---|**

**| Tareas personales | El dueño | Sí: compartir con miembros específicos o todo el hogar |**

**| Eventos personales | El dueño | Sí: compartir con miembros específicos o todo el hogar |**

**| Gastos personales | El dueño | Sí: compartir con miembros específicos |**

**| Ubicación en tiempo real | El dueño. Nadie más hasta que el dueño comparta. | Sí: compartir con miembros específicos según niveles (§08.05) |**

**| Historial de ubicación | El dueño + Coordinador | No |**

**| Documentos personales | El dueño | Sí: compartir con miembros específicos |**

**| Documentos de identidad | El dueño + Coordinador | Sí: compartir con miembros específicos (con confirmación) |**

**| Datos de salud/medicación | Dueño + cuidadores designados + Coordinador | No |**

**| Conversaciones con Geni | El dueño | No. Nunca. |**

**| Memorias personales | El dueño | Sí: compartir individualmente |**

**| Rachas | El dueño | Niño: automático para padres |**

**| Fotos/videos personales | El dueño | Sí: mover a álbum familiar |**

**| Preferencias de configuración | El dueño | No |**

**| Notificaciones | El destinatario | No |**

**| Log de patrones (Geni) | Solo Geni | No. Nunca. Ni el Coordinador. |**



**### 8.4.2 Qué es Visible por Defecto {#qué-es-visible-por-defecto}**



**| Dato | Visible para… | ¿Se puede restringir? |**

**|---|---|---|**

**| Tareas del hogar | Todos los miembros | Sí: el creador puede cambiar a «personal» |**

**| Eventos del hogar | Todos los miembros | Sí: el creador puede cambiar a «personal» |**

**| Gastos del hogar | Adultos + Adulto Mayor + Coordinador. El Adolescente creador ve los propios (§04.05). | Sí: el creador puede cambiar a «personal» |**

**| Deudas entre miembros | Deudor + Acreedor + Coordinador | No |**

**| Documentos del hogar | Todos los miembros adultos (Adulto, Adulto Mayor, Coordinador) | Sí: restringir a miembros específicos |**

**| Fotos/videos familiares | Todos los miembros | Sí: mover a álbum personal |**

**| Métricas de carga | Solo Coordinador | No. Prohibido mostrar a no-coordinadores (§6) |**

**| Memorias familiares | Todos los miembros | No |**



**### 8.4.3 Opt-in vs Opt-out {#opt-in-vs-opt-out}**



**| Funcionalidad | Modelo | Detalle |**

**|---|---|---|**

**| Ubicación en tiempo real | \*\*Opt-in\*\* | Se pregunta en onboarding. Se puede activar/desactivar en cualquier momento. |**

**| Historial de ubicación | \*\*Opt-in\*\* | Requiere activación explícita. Si no se activa, solo hay ubicación en tiempo real efímera. |**

**| Compartir ubicación con otros | \*\*Opt-in por persona\*\* | El miembro elige exactamente quién ve su ubicación. No es «todos o nadie». |**

**| Notificaciones push | \*\*Opt-in\*\* | Se preguntan después del primer valor visible (§6). |**

**| Memorias creadas por Geni | \*\*Opt-in por memoria\*\* | Geni sugiere, el usuario confirma. Cada vez. (§7.5.2) |**

**| Automatizaciones | \*\*Opt-in por automatización\*\* | Geni sugiere, el usuario aprueba. (§7.2.2) |**

**| Compartir datos con terceros | \*\*No existe\*\* | No hay opt-in ni opt-out porque no hay terceros. |**

**| Entrenar modelos externos | \*\*No existe\*\* | No hay opt-in ni opt-out porque no se hace. |**



**## 8.5 Seguridad {#seguridad}**



**### 8.5.1 Cifrado en Tránsito y en Reposo {#cifrado-en-tránsito-y-en-reposo}**



**| Capa | Estándar | Detalle |**

**|---|---|---|**

**| \*\*En tránsito\*\* | TLS 1.3 | Toda comunicación cliente-servidor. Sin excepciones. |**

**| \*\*En reposo — Datos generales\*\* | AES-256 | Base de datos, backups, logs. |**

**| \*\*En reposo — Datos sensibles\*\* | AES-256 + clave por hogar | Documentos de identidad, datos de salud, auditoría. Cada hogar tiene su propia clave de cifrado. |**

**| \*\*En reposo — Documentos\*\* | AES-256 + clave por documento | Cada documento se cifra con una clave independiente. Si una clave se compromete, solo afecta a ese documento. |**



**### 8.5.2 Cifrado Especial de Documentos {#cifrado-especial-de-documentos}**



**Los documentos en HomeCloud reciben una capa adicional de protección (§11):**



**- Cada documento se cifra con una clave simétrica única.**

**- La clave del documento se cifra a su vez con la clave del hogar.**

**- Acceder a un documento requiere: (a) autenticación del miembro, (b) permiso explícito sobre ese documento, (c) descifrado con la clave del hogar, (d) descifrado con la clave del documento.**

**- Las versiones anteriores de un documento heredan el mismo esquema de cifrado.**



**### 8.5.3 Row Level Security (RLS) {#row-level-security-rls}**



**A nivel de base de datos, cada consulta se filtra por los permisos del miembro que la origina. No es un filtro en la capa de aplicación: es un filtro en la capa de datos.**



**| Principio RLS | Implementación |**

**|---|---|**

**| Un miembro solo ve sus datos personales | ❌ Bloqueado a nivel de fila |**

**| Un miembro solo ve documentos que tiene permiso de ver | ❌ Bloqueado a nivel de fila |**

**| Un miembro no ve gastos de otros (salvo que sea adulto) | ❌ Bloqueado a nivel de fila |**

**| Un niño no ve la tabla de gastos | ❌ Bloqueado a nivel de tabla |**

**| Geni hereda los permisos del miembro que consulta | El contexto de Geni se construye después del filtro RLS |**



**RLS no es una optimización: es la última línea de defensa. Si la capa de aplicación falla, la base de datos sigue sin entregar datos que el miembro no debería ver.**



**### 8.5.4 Presence — Datos de ubicación: nunca a APIs externas {#presence-datos-de-ubicación-nunca-a-apis-externas}**



**> \*\*Decisión de producto #4 (Sección 7):\*\* Los datos de ubicación no se envían a ninguna API externa de IA. Nunca. (§7.8.2)**



**| Dato de ubicación | ¿Sale del dispositivo? | ¿A dónde? |**

**|---|---|---|**

**| Coordenadas en crudo (lat/long) | ✅ Sí, solo a servidores HomePlus | Backend propio para presencia y coordinación |**

**| Coordenadas a LLM externos | ❌ No | Nunca |**

**| «Juan está a 15 min de casa» | ✅ Sí | Puede enviarse a Geni como dato procesado |**

**| «María llegó a casa» | ✅ Sí | Puede enviarse a Geni como evento |**

**| Historial de ubicación | ✅ Sí, solo a servidores HomePlus | Cifrado en reposo. Eliminación automática a los 30 días. |**



**### 8.5.5 Conversaciones con Geni — No Compartibles {#conversaciones-con-geni-no-compartibles}**



**> \*\*Decisión de producto:\*\* Las conversaciones entre un miembro y Geni son privadas. No se pueden compartir con otros miembros del hogar. (§7.8)**



**- No existe «reenviar conversación con Geni».**

**- No existe «mostrar historial de conversaciones de otro miembro».**

**- El Coordinador no puede ver las conversaciones de otros miembros con Geni.**

**- Geni no revela a un miembro lo que otro miembro le preguntó.**



**## 8.6 Exportación y Portabilidad {#exportación-y-portabilidad}**



**### 8.6.1 Qué Puede Exportar el Usuario {#qué-puede-exportar-el-usuario}**



**| Dato | ¿Exportable? | Formato | Frecuencia |**

**|---|---|---|---|**

**| Tareas (propias) | ✅ Sí | CSV, JSON | Sin límite |**

**| Tareas del hogar (Coordinador) | ✅ Sí | CSV, JSON | Sin límite |**

**| Eventos (propios) | ✅ Sí | CSV, JSON, iCalendar (.ics) | Sin límite |**

**| Eventos del hogar (Coordinador) | ✅ Sí | CSV, JSON, iCalendar (.ics) | Sin límite |**

**| Gastos (propios) | ✅ Sí | CSV, JSON | Sin límite |**

**| Gastos del hogar (Adultos y Coordinador) | ✅ Sí | CSV, JSON | Sin límite |**

**| Historial de ubicación (propio) | ✅ Sí | JSON, GeoJSON | Sin límite |**

**| Documentos (propios) | ✅ Sí | Formato original + PDF | Sin límite |**

**| Documentos del hogar (con permiso) | ✅ Sí | Formato original + PDF | Sin límite |**

**| Fotos/videos (propios) | ✅ Sí | Formato original | Sin límite |**

**| Fotos/videos familiares | ✅ Sí | Formato original | Sin límite |**

**| Conversaciones con Geni | ✅ Sí | JSON (solo temas, no literales) | Sin límite |**

**| Memorias personales | ✅ Sí | JSON | Sin límite |**

**| Rachas | ✅ Sí | JSON | Sin límite |**

**| Logros | ✅ Sí | JSON (exportables junto con Goals) | Sin límite |**

**| Datos de auditoría | ❌ No | — | — |**

**| Log de patrones de Geni | ❌ No | — | — |**



**### 8.6.2 Formatos de Exportación {#formatos-de-exportación}**



**| Formato | Usado para | Justificación |**

**|---|---|---|**

**| \*\*CSV\*\* | Tareas, eventos, gastos | Compatible con Excel, Google Sheets, cualquier herramienta de productividad |**

**| \*\*JSON\*\* | Todos los datos estructurados | Formato estándar, legible por humanos y máquinas. Permite migración a otros sistemas |**

**| \*\*iCalendar (.ics)\*\* | Eventos | Compatible con Google Calendar, Apple Calendar, Outlook |**

**| \*\*Formato original + PDF\*\* | Documentos | El formato original preserva editabilidad; PDF garantiza legibilidad futura |**

**| \*\*GeoJSON\*\* | Historial de ubicación | Estándar abierto para datos geoespaciales |**



**### 8.6.3 Mecanismo de Exportación {#mecanismo-de-exportación}**



**1. El usuario accede a: Configuración → Exportar Datos.**

**2. Selecciona qué dominios exportar (puede ser todo o por dominio).**

**3. Selecciona el rango de fechas (o «todo»).**

**4. Selecciona el formato (CSV o JSON).**

**5. HomePlus genera el archivo. Si la exportación es grande, notifica al usuario cuando está lista.**

**6. El archivo se descarga en el dispositivo o se envía por email (a elección del usuario).**

**7. La exportación queda disponible para descarga durante 7 días. Luego el archivo se elimina del servidor.**



**\*\*La exportación no tiene límite de frecuencia.\*\* Un usuario puede exportar sus datos todos los días si quiere.**



**### 8.6.4 Qué Pasa al Cerrar la Cuenta {#qué-pasa-al-cerrar-la-cuenta}**



**| Paso | Acción | Plazo |**

**|---|---|---|**

**| 1 | El usuario solicita el cierre desde Configuración | Día 0 |**

**| 2 | HomePlus ofrece exportación completa antes de proceder | Día 0 |**

**| 3 | Período de gracia: el usuario puede revertir el cierre | 30 días |**

**| 4 | Si no revierte, se eliminan todos los datos del usuario | Día 30 |**

**| 5 | Si el usuario es el último miembro del hogar, se elimina el hogar completo | Día 30 |**



**\*\*Qué se elimina:\*\***



**- Todos los datos personales del miembro**

**- Sus documentos personales**

**- Sus fotos/videos personales**

**- Sus memorias personales**

**- Sus conversaciones con Geni**

**- Su historial de ubicación**

**- Sus preferencias y configuraciones**



**\*\*Qué permanece (si el hogar sigue existiendo):\*\***



**- Tareas del hogar que creó (se transfieren al coordinador)**

**- Eventos del hogar que creó (se transfieren al coordinador)**

**- Gastos del hogar que registró (el registro contable permanece; se anonimiza el autor)**

**- Fotos/videos familiares que subió (pertenecen al hogar, no al miembro)**

**- Registros de auditoría (permanecen; son del sistema, no del miembro)**



**## 8.7 Cumplimiento Normativo {#cumplimiento-normativo}**



**HomePlus está diseñado para cumplir con los marcos normativos de los países donde opera. El estándar más estricto disponible se aplica como piso, no como techo.**



**### 8.7.1 Ley 25.326 — Argentina (Protección de Datos Personales) {#ley-25.326-argentina-protección-de-datos-personales}**



**| Requisito de la ley | Cómo lo cumple HomePlus |**

**|---|---|**

**| \*\*Consentimiento informado\*\* | Onboarding paso a paso. Cada dato sensible pide confirmación explícita. |**

**| \*\*Derecho de acceso\*\* | Inventario de datos visible en Configuración. Exportación sin límites. |**

**| \*\*Derecho de rectificación\*\* | El usuario puede editar o eliminar cualquier dato personal. |**

**| \*\*Derecho de supresión\*\* | Eliminación completa al cerrar cuenta. Papelera de 30 días como red de seguridad. |**

**| \*\*Finalidad limitada\*\* | Cada dato se recolecta para un propósito específico declarado. No se reutiliza para otros fines. |**

**| \*\*Calidad de datos\*\* | Los datos se actualizan en tiempo real. El usuario puede corregir cualquier inexactitud. |**

**| \*\*Seguridad\*\* | Cifrado en tránsito y reposo. RLS. Cifrado especial para datos sensibles. |**

**| \*\*Transferencia internacional\*\* | Los datos se almacenan en la región del hogar. Si hay transferencia, se informa y se cifra. |**

**| \*\*Registro de bases de datos\*\* | HomePlus mantiene registro de todas las bases de datos y su contenido. |**



**### 8.7.2 COPPA — Children's Online Privacy Protection Act (EE.UU.) {#coppa-childrens-online-privacy-protection-act-ee.uu.}**



**HomePlus aplica protecciones COPPA para todos los niños del mundo, no solo en EE.UU.:**



**| Requisito COPPA | Cómo lo cumple HomePlus |**

**|---|---|**

**| \*\*Consentimiento parental verificable\*\* | El coordinador (padre/madre) aprueba explícitamente la incorporación de un niño al hogar. |**

**| \*\*Datos recolectados de niños\*\* | Mínimos: nombre, avatar, tareas asignadas, rachas. Nada más. |**

**| \*\*Sin geolocalización de niños\*\* | Los niños no tienen módulo de ubicación. No se rastrea su ubicación. (§08.05: Nivel 2) |**

**| \*\*Sin publicidad a niños\*\* | HomePlus no tiene publicidad para nadie. |**

**| \*\*Derecho de los padres a revisar/eliminar\*\* | El coordinador puede ver y eliminar todos los datos del niño. |**

**| \*\*Sin conversaciones con IA sin supervisión\*\* | Las interacciones de niños con Geni son supervisadas: los padres pueden ver los temas extraídos. |**



**### 8.7.3 GDPR — General Data Protection Regulation (UE) {#gdpr-general-data-protection-regulation-ue}**



**| Requisito GDPR | Cómo lo cumple HomePlus |**

**|---|---|**

**| \*\*Base legal para el procesamiento\*\* | Consentimiento explícito (onboarding) + interés legítimo (funcionamiento del hogar). |**

**| \*\*Derecho al olvido\*\* | Eliminación completa de datos al cerrar cuenta. |**

**| \*\*Portabilidad de datos\*\* | Exportación en formatos estándar (CSV, JSON, iCalendar). Sin límites. |**

**| \*\*Privacy by design\*\* | Privacidad por defecto (§8.4). Minimización (§8.1.3). RLS (§8.5.3). |**

**| \*\*Data Protection Officer (DPO)\*\* | HomePlus designará un DPO al alcanzar escala relevante en UE. |**

**| \*\*Notificación de brechas\*\* | En caso de brecha de seguridad, notificación al coordinador en ≤72 horas. |**

**| \*\*Registro de actividades de procesamiento\*\* | El registro de auditoría (§8.3.8) documenta toda actividad de procesamiento. |**



**### 8.7.4 Postura de HomePlus ante la Regulación {#postura-de-HomePlus-ante-la-regulación}**



**HomePlus no trata la regulación como un obstáculo. La trata como un estándar mínimo que el producto ya debería superar por filosofía propia.**



**| Principio | Postura |**

**|---|---|**

**| \*\*Cumplir la ley más estricta como piso\*\* | Si GDPR pide X y la ley local pide menos, HomePlus implementa X para todos los hogares. |**

**| \*\*No esperar a que la regulación obligue\*\* | Las protecciones de privacidad no se agregan «cuando toca». Nacen con el producto. |**

**| \*\*Transparencia radical\*\* | Si un hogar pregunta «¿qué datos tienen de nosotros?», la respuesta debe ser inmediata, completa y sin letra chica. |**

**| \*\*No usar vacíos legales como features\*\* | Que algo sea legal no significa que sea correcto. La filosofía de datos de HomePlus es más restrictiva que la ley. |**



**## 8.8 Decisiones de Datos Tomadas {#decisiones-de-datos-tomadas}**



**Esta tabla documenta las decisiones de datos que podrían haber tenido alternativas razonables. Cada decisión tiene un porqué vinculado a los principios del producto.**



**| # | Decisión | Alternativa considerada | Por qué esta |**

**|---|---|---|---|**

**| D-01 | \*\*Historial de tareas y eventos permanente\*\* | Historial con caducidad (ej. 1 año) | El historial del hogar es memoria emocional (§4). Las tareas completadas y los eventos pasados son la narrativa de la familia. Borrarlos sería borrar historia. |**

**| D-02 | \*\*Historial de ubicación: 30 días fijo\*\* | Configurable (30/60/90 días) o permanente | 30 días capturan patrones sin vigilancia. Hacerlo configurable invita a extenderlo. Permanente es inaceptable para un dato tan sensible. |**

**| D-03 | \*\*Conversaciones con Geni: 90 días\*\* | Permanente (como «memoria») o 30 días | 90 días es el punto dulce: suficiente para que Geni contextualice, suficientemente corto para que las conversaciones no se vuelvan un archivo personal. |**

**| D-04 | \*\*Auditoría: permanente e inmutable\*\* | Auditoría con caducidad (ej. 2 años) | La auditoría es la defensa del sistema ante disputas. Si se elimina, no hay forma de reconstruir qué pasó. §23 lo establece como invariante. |**

**| D-05 | \*\*Datos de ubicación nunca a APIs externas de IA\*\* | Enviar coordenadas a LLMs para respuestas más ricas | La ubicación es el dato más sensible de una familia. La riqueza de respuesta no justifica el riesgo. §7.8.2. |**

**| D-06 | \*\*Log de patrones de Geni: visible solo para Geni\*\* | Visible para el Coordinador | El log de patrones existe para detectar reincidencia en comportamientos problemáticos. Si el Coordinador lo viera, se convertiría en herramienta de vigilancia. §7.6.1. |**

**| D-07 | \*\*Cifrado especial de documentos con clave por documento\*\* | Cifrado único para todos los documentos | Si una clave se compromete, solo se expone un documento. El overhead de manejar claves individuales es mínimo frente a la ganancia de seguridad. |**

**| D-08 | \*\*Papelera de 30 días para eliminaciones\*\* | Eliminación inmediata sin papelera | La papelera es una red de seguridad contra eliminaciones accidentales. 30 días es suficiente para darse cuenta; no eterniza datos que el usuario ya decidió borrar. |**

**| D-09 | \*\*Sin «benchmark» entre hogares\*\* | Datos anónimos agregados para comparar hogares | Aunque fuera anónimo, cruzar datos entre hogares viola el principio de bóveda aislada. Cada hogar es su propio universo de datos. |**

**| D-10 | \*\*Notificaciones: 30 días in-app, push descartadas\*\* | Historial permanente de notificaciones | Las notificaciones son efímeras por definición. Guardarlas para siempre las convierte en otra cosa: un archivo de «todo lo que me avisaron». Eso no es útil. |**

**| D-11 | \*\*Rachas permanentes\*\* | Rachas con reset anual | Una racha de «30 días ordenando el cuarto» no pierde valor porque cambió el año. El reconocimiento es atemporal. Los logros se rastrean dentro de Goals. |**

**| D-12 | \*\*Métricas de carga: detalle 90 días, agregados permanentes\*\* | Todo permanente o todo 90 días | El detalle diario pierde utilidad después de 90 días. Pero los agregados mensuales permiten ver evolución a largo plazo sin almacenar cada dato diario. |**

**| D-13 | \*\*Conversaciones con Geni: no compartibles\*\* | Compartibles con confirmación | Las conversaciones con un asistente personal son inherentemente privadas. Habilitar el compartir cambia la naturaleza de la relación con Geni: el usuario se autocensuraría. |**

**| D-14 | \*\*Ubicación de niños: visibilidad restringida (Nivel 2)\*\* | Ubicación de niños con visibilidad completa para padres | La seguridad es importante, pero HomePlus elige no ser un rastreador de niños. La ubicación de niños se limita a información resumida (Nivel 2). |**

**| D-15 | \*\*Sin análisis de tono emocional\*\* | Análisis de sentimiento para detectar conflictos | §7.6.2: Geni deliberadamente no interpreta emociones. Es intrusivo y propenso a errores culturales. Los conflictos se detectan por patrones de datos duros, no por tono. |**

**| D-16 | \*\*Exportación sin límites de frecuencia\*\* | Límite de 1 exportación por mes | La portabilidad es un derecho, no un favor. Poner límites contradice el principio de que los datos son del usuario. |**



**## 8.9 Resumen: La Filosofía de Datos en una Frase {#resumen-la-filosofía-de-datos-en-una-frase}**



**> \*\*HomePlus guarda lo mínimo para coordinar, protege lo sensible como si fuera propio, y entrega todo al usuario cuando lo pide. Los datos del hogar nunca fueron de HomePlus. Solo están bajo su cuidado.\*\***



**\*Documento consistente con: FinalSpec V2 (§02.01, §02.02, §02.05, §11, §23), Sección 2 (Principios), Sección 4 (Emotional Design), Sección 6 (UX Philosophy), Sección 7 (AI Philosophy). Redactado en Castellano LATAM. Filosofía de producto accionable para implementación.\***

