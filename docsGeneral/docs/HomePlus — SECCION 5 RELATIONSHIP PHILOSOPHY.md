**title: Filosofía de Relaciones del Ecosistema**

**description: Cómo se conectan los módulos, las entidades y las personas en HomePlus, y cómo Geni actúa como capa de inteligencia transversal respetando los límites de privacidad de cada rol.**

**audience: internal-dev**

**diataxis: explanation**

**status: stable**

**last\_reviewed: 2026-06-14**

**owners: architecture**

**---**

**# 5. Filosofía de Relaciones del Ecosistema**

**> \*\*Principio rector:\*\* Ningún módulo de HomePlus funciona de forma aislada. La plataforma es un ecosistema de entidades conectadas, donde cada dominio puede relacionarse con los demás. Pero esas conexiones están gobernadas por reglas de privacidad que la capa de inteligencia transversal —Geni— debe respetar en todo momento. La coordinación no autoriza el acceso indiscriminado.**

**## 5.1 El ecosistema como red de entidades**

**HomePlus no está diseñado como un conjunto de aplicaciones independientes que comparten base de datos. Cada dominio —People, Planner, Finance, Presence, Inventory, Assets, HomeCloud, SOS— opera sobre entidades que pueden vincularse entre sí de forma natural.**

**La arquitectura conceptual (§03) establece que todos los dominios comparten:**

**- \*\*Personas\*\* (identidad y membresía)**

**- \*\*Roles\*\* (permisos dentro del hogar)**

**- \*\*Permisos\*\* (qué puede ver y hacer cada rol)**

**- \*\*Auditoría\*\* (trazabilidad de acciones)**

**- \*\*Geni\*\* (capa de inteligencia transversal)**

**Esto significa que una misma entidad —una Persona, una Tarea, un Documento— puede aparecer referenciada desde múltiples módulos sin duplicarse, sin desincronizarse y sin violar la privacidad de quien la posee.**

**Ejemplo concreto de ecosistema conectado:**

**Persona (Mamá, rol Adulto)**

**│**

**├── Tarea: "Comprar alimento para perro"**

**│ └── Responsabilidad: Mascotas**

**│ └── Asset: Perro (Toby)**

**│ └── Documento: Carnet de vacunación (HomeCloud)**

**│**

**├── Gasto: "$45 — Alimento balanceado"**

**│ └── Cuenta: Mercado Pago**

**│ └── Presupuesto: Mascotas (Finance)**

**│**

**└── Evento: "Visita al veterinario — sábado 11:00"**

**└── Lugar: Veterinaria San Roque (Presence)**



**\*.txt**

**Plaintext**

**Cada flecha del diagrama anterior es una relación navegable. El sistema permite recorrerla, pero solo si el rol de quien consulta tiene visibilidad sobre cada eslabón de la cadena.**

**## 5.2 Entidades transversales**

**Existen entidades que, por diseño, pueden relacionarse con cualquier dominio (§03.03). No pertenecen a un solo módulo: son ciudadanas de primera clase del ecosistema.**

**### 5.2.1 Persona**

**Una Persona puede relacionarse con:**

**| Dominio | Tipo de relación | Ejemplo |**

**|---------|-----------------|---------|**

**| Planner | Responsable de tareas, participante de eventos, dueño de metas | "Mamá es responsable de Comprar alimento" |**

**| Finance | Responsable de gastos, titular de cuentas, deudor/acreedor | "Papá registró un gasto de $200 en Supermercado" |**

**| Presence | Sujeto de ubicación, check-ins, estados | "Juan llegó a Casa — 17:32" |**

**| Inventory | Consumidor de stock, repositor | "Mamá repuso leche — stock actual: 3L" |**

**| Assets | Responsable principal o secundario de un activo | "Papá es responsable del Vehículo — Ford Focus" |**

**| HomeCloud | Autor o sujeto de documentos, participante en recuerdos | "Mateo aparece en Recuerdo: Cumpleaños 7" |**

**| SOS | Emisor o destinatario de alertas | "Luca activó SOS — Nivel 🟡 Coordinación urgente" |**

**La visibilidad de cada relación depende del rol de quien consulta y del ámbito de la entidad vinculada (familiar vs. privado). Ver §5.5.**

**### 5.2.2 Responsabilidad**

**Una Responsabilidad agrupa áreas operativas del hogar (§06.17–§06.20). Puede relacionarse con:**

**- \*\*Tareas\*\* (relación principal: una tarea pertenece a una única responsabilidad)**

**- \*\*Gastos\*\* (un gasto puede imputarse a una responsabilidad)**

**- \*\*Inventory\*\* (ítems cuyo stock se monitorea dentro de una responsabilidad)**

**- \*\*Automatizaciones\*\* (triggers basados en eventos de una responsabilidad)**

**Ejemplo: la Responsabilidad «Mascotas» agrupa tareas (alimentar, pasear), gastos (alimento, veterinario), y está vinculada al Asset «Perro (Toby)».**

**### 5.2.3 Goal**

**Una Meta (§06.25–§06.33) puede relacionarse con:**

**- \*\*Finance\*\* (metas financieras con saldo acumulado)**

**- \*\*Tasks\*\* (tareas que avanzan hitos de la meta)**

**- \*\*Fondos\*\* (reserva de dinero vinculada al objetivo)**

**### 5.2.4 Documento**

**Un Documento (§11.16–§11.21) puede relacionarse con:**

**- \*\*Personas\*\* (titularidad)**

**- \*\*Assets\*\* (documentación de vehículos, mascotas, propiedades, dispositivos)**

**- \*\*Gastos\*\* (comprobantes, facturas)**

**- \*\*Eventos\*\* (documentación requerida para un evento)**

**- \*\*Goals\*\* (evidencia de progreso)**

**## 5.3 Geni como capa de conexión transversal**

**Geni no es un módulo más. Es la capa de inteligencia que opera sobre todos los dominios autorizados (§14, §03.07). Su rol como «puente» entre módulos se manifiesta en cinco capacidades concretas:**

**### 5.3.1 Consultar**

**Geni puede buscar y recuperar información de cualquier dominio para el que el usuario tenga permisos. Puede responder preguntas como:**

**- «¿Qué tareas pendientes tiene Mateo esta semana?»**

**- «¿Cuánto gastamos en supermercado este mes?»**

**- «¿Qué documentos están próximos a vencer?»**

**- «¿Quién está en casa ahora?»**

**Cada respuesta se construye consultando los dominios relevantes (Planner, Finance, HomeCloud, Presence), pero solo devuelve la información que el rol del usuario que pregunta está autorizado a ver.**

**### 5.3.2 Analizar**

**Geni puede cruzar información de múltiples dominios para detectar patrones:**

**- «Este mes gastaste 30% más en delivery que el mes pasado» (Finance)**

**- «Mateo completó todas sus tareas escolares 5 días seguidos» (Planner)**

**- «El seguro del auto vence en 15 días y no hay documento cargado» (Assets + HomeCloud)**

**El análisis siempre respeta los límites de privacidad: Geni no cruza información privada de un miembro con información familiar sin autorización explícita.**

**### 5.3.3 Relacionar**

**Geni puede sugerir conexiones que el usuario no había establecido manualmente:**

**- «Esta factura parece corresponder al mantenimiento del vehículo Ford Focus. ¿Querés vincularla?»**

**- «Detecté 3 tareas relacionadas con el evento 'Cumpleaños de Gaby'. ¿Querés agruparlas?»**

**- «Este documento tiene fecha del 15/03. ¿Corresponde al evento 'Vacaciones Córdoba'?»**

**Las sugerencias son siempre optativas. El usuario confirma o descarta. Geni nunca impone relaciones automáticas sin consentimiento.**

**### 5.3.4 Recomendar**

**Basándose en el análisis cruzado de dominios, Geni puede proponer acciones:**

**- «Reduciendo un 10% el gasto en delivery, alcanzarías tu meta de ahorro 3 meses antes» (Finance → Goals)**

**- «El stock de leche está bajo. ¿Creo una tarea de compras?» (Inventory → Planner)**

**- «Hace 6 meses que no se hace el service del auto. ¿Agendo un recordatorio?» (Assets → Planner)**

**### 5.3.5 Automatizar**

**Geni puede crear o sugerir automatizaciones que conecten eventos de un dominio con acciones en otro (§15.14–§15.16):**

**- «Cada vez que el stock de pañales baje de 2 unidades, ¿creo una tarea de compra?»**

**- «Cuando Juan llegue a Casa, ¿aviso a Mamá?»**

**\*\*Restricción fundamental:\*\* Geni nunca crea automatizaciones permanentes sin aprobación explícita del usuario (§15.16). La capa de inteligencia asiste, no decide.**

**## 5.4 Reglas de navegación entre dominios**

**La filosofía de relaciones del ecosistema tiene una manifestación concreta en la navegación (§24): las entidades deben estar enlazadas de forma que el usuario complete su intención sin fricción, incluso si esa intención cruza dominios.**

**### 5.4.1 Principio de «no volver atrás»**

**El usuario no debería necesitar recordar dónde estaba ni volver al menú principal para seguir una relación entre entidades. La navegación contextual se implementa mediante enlaces cruzados en la vista de detalle de cada entidad.**

**\*\*Ejemplo de flujo entre dominios:\*\***

**Home → Tarea "Preparar comida para el asado"**

**→ (enlace) Evento "Asado del sábado 13:00"**

**→ (enlace) Documento "Lista de compras"**

**→ (enlace) Gasto "$150 — Carnicería"**



**\*.txt**

**Plaintext**

**El usuario recorrió Planner → Planner (Calendar) → HomeCloud → Finance sin pasar por ningún menú, sin buscar nada manualmente, y sin perder el hilo de su intención original.**

**### 5.4.2 Regla de implementación**

**Toda entidad que tenga relación con otra debe exponer esa relación como un enlace navegable en su vista de detalle (§24.16). Si una Tarea pertenece a un Evento, el detalle de la Tarea muestra el Evento. Si un Documento está vinculado a un Asset, el detalle del Documento muestra el Asset. Siempre.**

**### 5.4.3 Evitar ciclos infinitos**

**Cuando el usuario navega A → B → C y desde C existe un enlace a A, el sistema reutiliza la instancia existente de A en el stack de navegación. No se duplica. El botón «back» del sistema operativo siempre retrocede un nivel real.**

**## 5.5 Límites de privacidad en las relaciones entre módulos**

**Esta es la restricción más importante del ecosistema. Las entidades pueden relacionarse técnicamente, pero la visibilidad de esas relaciones está gobernada por los roles y el ámbito de cada entidad (§04).**

**### 5.5.1 Principio de privacidad individual**

**El principio §04.02 establece que \*\*ningún rol obtiene acceso automático\*\* a:**

**- Memoria privada de Geni**

**- Metas privadas**

**- Documentos privados**

**- Finanzas personales**

**Esto significa que, aunque dos entidades estén técnicamente vinculadas en la base de datos, la relación \*\*no se muestra\*\* si el usuario que consulta no tiene visibilidad sobre ambas entidades.**

**### 5.5.2 Ámbitos de visibilidad**

**Cada entidad del ecosistema pertenece a uno de dos ámbitos:**

**| Ámbito | Alcance | Ejemplos |**

**|--------|---------|----------|**

**| \*\*Familiar\*\* | Visible para todos los miembros del hogar según su rol | Tareas familiares, Eventos familiares, Gastos familiares, Inventory del hogar, Assets compartidos, SOS |**

**| \*\*Privado\*\* | Visible solo para el propietario | Memoria privada de Geni, Metas personales, Documentos privados, Finanzas personales |**

**Una entidad privada puede ser referenciada desde una entidad familiar, pero su contenido solo es visible para su propietario.**

**### 5.5.3 Comportamiento de Geni ante entidades privadas**

**Cuando Geni construye una respuesta que cruza dominios, aplica tres reglas:**

**1. \*\*Filtrado por rol:\*\* solo incluye información de dominios para los que el rol del usuario tiene permiso de lectura.**

**2. \*\*Filtrado por ámbito:\*\* las entidades privadas de otros miembros nunca se incluyen en respuestas, análisis ni recomendaciones dirigidas a terceros.**

**3. \*\*Transparencia:\*\* si una relación existe pero no puede mostrarse por restricciones de privacidad, Geni omite la entidad sin mencionar su existencia. No dice «hay un documento pero no podés verlo». Simplemente no lo incluye.**

**\*\*Ejemplo concreto de privacidad aplicada:\*\***

**Contexto:**



**Mamá (Coordinador) consulta a Geni: "¿Cómo están las finanzas este mes?"**

**Papá (Adulto) tiene un Gasto Privado de $500 que no es visible para el hogar.**

**Mamá (Adulto) tiene un Gasto Familiar de $300 en supermercado.**

**Respuesta de Geni a Mamá:**

**"Este mes registraste $300 en supermercado. El presupuesto está al 45%."**



**El gasto privado de Papá NO aparece.**

**Geni NO menciona que existe información que no puede mostrar.**



**\*.txt**

**Plaintext**

**### 5.5.4 Tabla de visibilidad por rol en relaciones cruzadas**

**| Relación consultada | Coordinador | Adulto | Adolescente | Niño | Invitado | Empleado Familiar |**

**|---------------------|-------------|--------|-------------|------|----------|-------------------|**

**| Tarea familiar → Responsable | ✅ | ✅ | ✅ (si es propia o familiar) | ✅ (solo propias) | ❌ | ✅ (solo asignadas) |**

**| Gasto familiar → Persona | ✅ | ✅ | ❌ (no ve Finance) | ❌ | ❌ | ❌ (no ve Finance) |**

**| Evento → Documentos asociados | ✅ | ✅ | ✅ (si participa) | ❌ | ⚠️ (según permisos) | ❌ |**

**| Asset → Responsable | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ (si es su responsabilidad) |**

**| Meta personal → Tareas | Solo el dueño | Solo el dueño | Solo el dueño | Solo el dueño | Solo el dueño | ❌ |**

**| Presence → Ubicación | ✅ Nivel 3 | ✅ Nivel 3 | ✅ Nivel 2 | ✅ Nivel 2 | ✅ Nivel 2 | ⚠️ (según necesidad laboral) |**

**| SOS → Información enviada | ✅ Completa | ✅ Completa | ✅ Completa | ✅ (limitada) | ❌ | ✅ (si es destinatario) |**

**## 5.6 Patrones oficiales de integración entre dominios**

**La Final Spec define conexiones específicas entre entidades (§22). Estas no son sugerencias: son el modelo de datos canónico.**

**### 5.6.1 People ↔ ecosistema**

**People ↔ Household**

**People ↔ Membership**

**People ↔ Role**

**People ↔ Presence**

**People ↔ Tasks**

**People ↔ Events**

**People ↔ Goals**

**People ↔ Finance**

**People ↔ HomeCloud**

**People ↔ SOS**

**People ↔ Assets**

**People ↔ Inventory**



**\*.txt**

**Plaintext**

**### 5.6.2 Planner ↔ ecosistema**

**Task ↔ Persona**

**Task ↔ Responsabilidad**

**Task ↔ Goal**

**Task ↔ Subtareas**

**Task ↔ Comentarios**

**Task ↔ Adjuntos**

**Task ↔ Event**



**Goal ↔ Hitos**

**Goal ↔ Tasks**

**Goal ↔ Fondos**

**Goal ↔ Finance**



**Event ↔ Personas**

**Event ↔ Presence**

**Event ↔ HomeCloud**



**\*.txt**

**Plaintext**

**### 5.6.3 Finance ↔ ecosistema**

**Cuenta ↔ Movimientos**

**Movimiento ↔ Persona**

**Movimiento ↔ Responsabilidad**

**Movimiento ↔ Goal**

**Movimiento ↔ Fondo**

**Movimiento ↔ Asset**



**Fondo ↔ Goal**

**Fondo ↔ Cuenta**



**Deuda ↔ Persona**

**Deuda ↔ Familia**



**\*.txt**

**Plaintext**

**### 5.6.4 Inventory ↔ ecosistema**

**Inventory Item ↔ Categoría**

**Inventory Item ↔ Planner (tareas de reposición)**

**Inventory Item ↔ Finance (gastos de compra)**



**\*.txt**

**Plaintext**

**### 5.6.5 Assets ↔ ecosistema**

**Asset ↔ Persona (responsable)**

**Asset ↔ Finance (gastos, presupuestos, metas)**

**Asset ↔ Planner (tareas de mantenimiento)**

**Asset ↔ HomeCloud (documentación)**

**Asset ↔ Mantenimiento**



**\*.txt**

**Plaintext**

**### 5.6.6 HomeCloud ↔ ecosistema**

**Documento ↔ Persona**

**Documento ↔ Asset**

**Documento ↔ Goal**

**Documento ↔ Evento**

**Documento ↔ Gasto**



**Recuerdo ↔ Personas**

**Recuerdo ↔ Álbum**

**Recuerdo ↔ Feed**



**\*.txt**

**Plaintext**

**### 5.6.7 SOS ↔ ecosistema**

**SOS ↔ Presence (ubicación, historial, lugares)**

**SOS ↔ Personas (emisor, destinatarios)**

**SOS ↔ Notificaciones**



**\*.txt**

**Plaintext**

**### 5.6.8 Geni ↔ ecosistema completo**

**Geni ↔ Todo el ecosistema**

**(respetando permisos y ámbito de cada entidad)**



**\*.txt**

**Plaintext**

**## 5.7 Relaciones familiares: informativas, no permisivas**

**People permite registrar relaciones entre personas (§05.06): Madre, Padre, Hijo, Hija, Abuelo, Abuela, Hermano, Hermana, Tutor.**

**Estas relaciones son \*\*exclusivamente informativas\*\*. No modifican permisos, no otorgan visibilidad adicional, no alteran la jerarquía de roles. La frase canónica de la Final Spec es definitiva:**

**> «Las relaciones son informativas. No modifican permisos automáticamente.» (§05.06)**

**Un Padre con rol Adulto y un Hijo con rol Adolescente tienen exactamente los permisos que sus roles definen. La etiqueta «Padre» / «Hijo» no agrega ni quita nada. Esto es intencional: HomePlus coordina, no jerarquiza relaciones personales.**

**## 5.8 Multi-Hogar y aislamiento entre hogares**

**Un usuario puede pertenecer a múltiples hogares (§16). Cada hogar es una entidad independiente con sus propios roles, módulos y datos. La filosofía de relaciones del ecosistema se aplica por igual a cada hogar, pero con una restricción adicional:**

**\*\*No existen relaciones entre hogares.\*\* Un documento del Hogar A no puede vincularse a una persona del Hogar B en su rol dentro de ese hogar. Una tarea del Hogar A no puede relacionarse con un evento del Hogar B. La memoria familiar de un hogar nunca se comparte automáticamente con otro (§16.09).**

**Geni Search puede buscar dentro del hogar activo o globalmente (§16.10), pero siempre respetando los permisos: si el usuario cambia al Hogar B, Geni opera sobre el contexto del Hogar B y solo sobre ese contexto.**

**## 5.9 Principios de diseño para nuevas relaciones**

**Cuando se evalúa agregar una nueva relación entre entidades —por ejemplo, vincular un nuevo tipo de entidad con un dominio existente—, deben verificarse estas condiciones:**

**1. \*\*¿La relación responde a una necesidad real de coordinación?\*\* (§01.06)**

**2. \*\*¿Ambas entidades existen en el ámbito correcto (familiar o privado)?\*\***

**3. \*\*¿La visibilidad de la relación respeta los permisos de todos los roles?\*\* (§04)**

**4. \*\*¿Geni puede consultar la relación sin violar límites de privacidad?\*\* (§14.04)**

**5. \*\*¿La relación queda auditada?\*\* (§23)**

**Si la respuesta a cualquiera de estas preguntas es no, la relación no debe implementarse.**

**---**

**\*Documento canónico de Filosofía de Relaciones del Ecosistema para HomePlus. Alineado con Final Spec V1 §03 (Arquitectura Conceptual), §04 (Roles y Permisos), §14 (Geni), §22 (Relaciones) y §23 (Auditoría).\***



