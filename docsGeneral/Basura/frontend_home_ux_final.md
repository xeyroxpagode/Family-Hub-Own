# frontend_home_ux_final.md

## 0. Propósito del documento

Este documento define la **UX final premium de Home para HomePlus MVP**.

Su objetivo es que Antigravity/Codex pueda implementar Home como una pantalla clara, cálida, viva y premium, sin convertirla en un dashboard saturado y sin transformar módulos mock en features reales.

Este documento usa como base:

- `frontend_all_extractions_master.md`;
- `frontend_premium_extraction_index.md`;
- `frontend_premium_design_system_v1.md`;
- `frontend_navigation_shell_v1.md`.

Este documento **no** define backend, contratos API, base de datos, lógica de sync, navegación global completa, Planner completo ni módulos secundarios completos. Home consume datos reales cuando existan y muestra módulos demo premium cuando el MVP no tenga feature real.

---

## 1. Principio central de Home

Home debe ser el **centro emocional y operativo del hogar**.

Principio rector:

> Home no es un dashboard. Home es la primera lectura tranquila de cómo está la casa hoy y qué necesita atención.

Traducción práctica:

- Home resume; los módulos administran.
- Home muestra lo importante, no todo lo disponible.
- Home prioriza lo real del MVP: tareas, eventos, miembros/rol y estado del hogar.
- Home puede verse premium con mocks, pero debe diferenciar internamente qué es real y qué es demo.
- Home debe bajar carga mental, no aumentarla.
- Home no debe culpar a nadie.
- Home no debe parecer una app corporativa de productividad.
- Home debe dar valor aunque haya un solo usuario activo.
- Home debe permitir demostrar colaboración real entre dos usuarios del mismo hogar.

La pantalla debe sentirse:

- simple;
- cálida;
- humana;
- accionable;
- familiar;
- confiable;
- premium;
- viva sin ser ruidosa.

---

## 2. Qué problema resuelve Home

Home responde rápido a cuatro preguntas:

1. **¿Cómo está el hogar hoy?**
2. **¿Qué requiere atención?**
3. **¿Qué tengo que hacer yo?**
4. **¿A dónde voy si quiero resolverlo?**

HomePlus existe para reducir carga mental y coordinación dispersa. Por eso Home no debe pedir al usuario que recuerde dónde está cada cosa. Debe traer al frente lo que importa ahora y enviar al módulo correcto cuando haga falta administrar.

### 2.1 Problemas que Home sí resuelve

- Centraliza la lectura diaria del hogar.
- Muestra tareas reales pendientes o vencidas.
- Muestra eventos reales próximos.
- Expone aprobaciones o solicitudes relevantes si existen.
- Da contexto emocional con un saludo/briefing breve.
- Permite acciones rápidas sin obligar a navegar.
- Da sensación de producto completo mediante módulos mock premium ordenados.
- Ayuda a la demo mostrando colaboración real en tareas/eventos y una capa visual premium alrededor.

### 2.2 Problemas que Home no debe intentar resolver

- No reemplaza Planner.
- No edita tareas complejas.
- No administra calendario completo.
- No administra finanzas.
- No administra inventario.
- No muestra todos los miembros, documentos o actividades.
- No configura el hogar.
- No promete inteligencia real si Geni es mock.
- No debe convertirse en una lista infinita de módulos.

---

## 3. Alcance final de Home MVP

### 3.1 REAL MVP en Home

Home debe integrar como real, si el backend/front ya existe o está dentro del MVP inmediato:

- sesión autenticada;
- usuario actual;
- hogar activo;
- rol/membership activo;
- tareas reales del hogar o del usuario;
- completar tarea desde Home si está soportado;
- eventos reales próximos;
- navegación a Planner;
- navegación a Familia/People;
- navegación a More/Profile;
- quick actions reales para crear tarea/evento si están implementadas;
- estados de carga/error/sesión vencida;
- empty states de primer uso.

### 3.2 MOCK PREMIUM en Home

Home puede mostrar como demo visual, sin backend real completo:

- Geni/briefing inteligente;
- carga familiar;
- finance summary;
- inventory alerts;
- assets reminders;
- presence summary;
- goals progress;
- activity feed;
- insights;
- reconocimientos;
- recordatorios avanzados;
- alertas inteligentes no derivadas de datos reales.

Regla: los mocks deben verse premium, pero no deben ofrecer flujos que rompan la demo o expongan pantallas vacías.

### 3.3 POST-MVP que Home no debe activar como feature real

- IA real de Geni;
- búsqueda global real;
- automatizaciones reales;
- GPS/geofencing;
- push/email notifications avanzadas;
- offline sync completo;
- auditoría completa;
- OCR;
- reconocimiento facial;
- FamilyCloud storage real avanzado;
- metas reales complejas;
- finanzas reales completas;
- inventory real completo;
- assets real completo;
- multi-hogar avanzado.

---

## 4. Estructura final de Home

Home debe organizarse en bloques de lectura progresiva. Lo más importante aparece arriba; lo decorativo o demo aparece más abajo.

Orden final recomendado:

1. **Header emocional**
2. **Hoy en casa**
3. **Quick Actions compactas**
4. **Geni / Mock Premium**
5. **Módulos mock premium**
6. **Actividad familiar**

Este orden reemplaza la idea de mostrar todos los widgets del master al mismo nivel. Home debe ser selectivo.

---

## 5. Header emocional

### 5.1 Objetivo

El header debe abrir Home con una sensación de calma, pertenencia y contexto. No debe sentirse como una barra técnica.

Debe comunicar:

- saludo breve;
- nombre del usuario o referencia cálida;
- nombre del hogar si aporta contexto;
- avatar/perfil;
- estado general sutil;
- acceso a perfil o settings cuando corresponda.

### 5.2 Contenido recomendado

Header base:

- Saludo contextual: “Buen día”, “Buenas tardes”, “Buenas noches”.
- Línea principal: “Hoy en casa”.
- Subtítulo opcional: nombre del hogar o resumen breve.
- Avatar personal a la derecha.
- Selector de hogar solo si existen 2+ hogares reales.

No saturar el header con métricas. El header no debe contener contadores largos ni badges múltiples.

### 5.3 Variantes por estado

| Estado | Header recomendado |
|---|---|
| Normal | Saludo + “Hoy en casa” + avatar. |
| Primer uso | “Tu hogar está listo” + bajada cálida. |
| Sin hogar activo | No mostrar Home final; navegar al flujo create/join. |
| Offline | Mantener header normal + banner offline debajo. |
| Sesión vencida | No mostrar Home; mostrar estado global y llevar a Auth. |
| Emergencia mock/SOS | Banner crítico desplaza el contenido; no llenar header de rojo. |

### 5.4 Reglas visuales

- Usar `AppHeader` del Design System.
- Fondo transparente o integrado con `AppScreen`.
- No usar shadow fuerte en header.
- No usar rojo en header salvo emergencia activa real/mock explícita.
- Mantener lectura en menos de 2 segundos.
- Avatar con target táctil mínimo accesible.

---

## 6. Sección “Hoy en casa”

### 6.1 Objetivo

“Hoy en casa” es el núcleo real del Home MVP.

Debe mostrar lo que realmente importa hoy:

- tareas reales relevantes;
- eventos reales próximos;
- aprobaciones o solicitudes si existen;
- estados vacíos claros;
- CTA a Planner.

Esta sección es más importante que los módulos mock. Si hay conflicto de espacio, gana “Hoy en casa”.

### 6.2 Composición final

La sección debe tener:

- título: “Hoy en casa”;
- subtítulo opcional breve;
- card principal con tareas/eventos;
- máximo dos sub-bloques visibles:
  - Tareas;
  - Próximos eventos;
- CTA final: “Ver Planner”.

Puede incluir una alerta compacta arriba si hay algo vencido.

### 6.3 Tareas reales

Home debe mostrar tareas reales cuando existan.

#### Datos mínimos visibles por tarea

Cada tarea visible debe mostrar:

- checkbox o control de completar;
- título;
- vencimiento relativo si existe;
- responsable si no es el usuario actual o si aporta claridad;
- estado visual si está vencida o bloqueada;
- responsabilidad/categoría solo si ayuda a leer la lista.

#### Límites máximos

- Máximo 4 tareas visibles en Home.
- Si hay más de 4, mostrar CTA: “Ver todas en Planner”.
- Máximo 1 línea de título por tarea en Home.
- Máximo 1 línea de metadata por tarea.
- No mostrar descripción larga.
- No mostrar comentarios, adjuntos, subtareas ni historial en Home.

#### Orden de prioridad para tareas

Orden final:

1. Tareas vencidas.
2. Tareas que vencen hoy.
3. Tareas asignadas al usuario actual.
4. Tareas del hogar sin responsable o relevantes para todos.
5. Tareas próximas.
6. Tareas completadas recientes solo si ayudan al estado “todo al día”.

No mezclar tareas completadas con pendientes salvo en una microsección de reconocimiento. Las completadas no deben ocupar espacio principal si hay pendientes.

#### Estados de tarea en Home

| Estado | Tratamiento en Home |
|---|---|
| Pendiente | Visible si relevante para hoy. |
| En progreso | Visible si vence pronto o asignada al usuario. |
| Completada | Oculta por defecto; puede aparecer como reconocimiento breve. |
| Cancelada | No mostrar en Home salvo contexto excepcional. |
| Vencida | Visual de atención; “vencida” es calculado, no estado propio. |
| Awaiting verification / verification | Si existe en otra spec, mostrar como “esperando revisión” sin explicar lógica compleja. |

#### Completar tarea desde Home

Si completar tarea está implementado:

- Tap en checkbox completa.
- Usar haptic ligero.
- Animar check con feedback suave.
- Mover o desvanecer la tarea sin salto brusco.
- Mostrar toast con “Deshacer” durante 5 segundos.
- Refrescar o actualizar Home sin bloquear toda la pantalla.

Si completar desde Home no está listo:

- Tap en tarea abre Planner/Task detail.
- No mostrar checkbox falso.
- No simular completado si no persiste.

### 6.4 Eventos reales

Home debe mostrar próximos eventos reales cuando existan.

#### Datos mínimos visibles por evento

Cada evento visible debe mostrar:

- fecha relativa: “Hoy”, “Mañana”, “Vie”;
- hora si existe;
- título;
- ubicación si aporta;
- participantes solo si ayuda y no satura;
- chevron o affordance de navegación.

#### Límites máximos

- Máximo 3 eventos visibles para Coordinador.
- Máximo 2 eventos visibles para Adulto y Adolescente.
- Máximo 2 eventos visibles para Adulto Mayor, pero con texto más grande y ubicación completa si aplica.
- Si hay más, CTA: “Ver calendario”.

#### Orden de prioridad para eventos

1. Eventos de hoy.
2. Eventos con hora más cercana.
3. Eventos donde participa el usuario.
4. Eventos familiares generales.
5. Eventos próximos de los siguientes días.

#### Estados de evento

| Estado | Tratamiento en Home |
|---|---|
| Programado | Mostrar si próximo/relevante. |
| Completado | No mostrar como próximo; puede alimentar actividad mock. |
| Cancelado | Mostrar solo si afecta hoy o necesita atención. |

### 6.5 CTA Ver Planner

La sección “Hoy en casa” debe terminar con un CTA claro:

- “Ver Planner” cuando hay tareas y eventos mezclados.
- “Ver tareas” cuando solo hay tareas.
- “Ver calendario” cuando solo hay eventos.

El CTA debe navegar a Planner en la tab/sección correspondiente cuando el Navigation Shell lo soporte.

Regla: Home resume. Planner administra.

### 6.6 Estados vacíos de Hoy en casa

#### Sin tareas y sin eventos

Mostrar empty state cálido:

- Título: “Todo tranquilo por ahora”.
- Texto: “No hay tareas ni eventos próximos.”
- CTA principal: “Crear tarea” si está implementado.
- CTA secundaria: “Crear evento” si está implementado.
- Si no están implementadas, CTA: “Ir a Planner”.

#### Solo un usuario activo

Mostrar:

- “Tu hogar ya está listo.”
- “Podés empezar con una tarea o invitar a alguien.”
- CTA: “Crear primera tarea”.
- CTA secundaria: “Invitar familia” si la UI de invitación está disponible.

#### Hay eventos pero no tareas

Mostrar eventos y un bloque pequeño:

- “Sin tareas pendientes.”
- No ocupar media pantalla con celebración vacía.

#### Hay tareas pero no eventos

Mostrar tareas y una línea simple:

- “No hay eventos próximos.”

### 6.7 Límites de densidad

“Hoy en casa” no debe superar:

- 1 card principal;
- 2 sub-bloques;
- 4 tareas;
- 3 eventos;
- 1 CTA principal;
- 1 alerta compacta opcional.

Si supera esos límites, se corta y deriva a Planner.

---

## 7. Quick Actions compactas en Home

### 7.1 Objetivo

Home debe permitir acciones frecuentes sin saturar. Las Quick Actions de Home son atajos compactos; no reemplazan al botón central `+` del Navigation Shell.

### 7.2 Acciones visibles recomendadas

Máximo 3 acciones visibles.

Orden recomendado para MVP:

1. Crear tarea.
2. Crear evento.
3. Invitar / Familia / Geni según estado del usuario.

Reglas:

- Si el usuario no tiene permisos para una acción, no mostrarla.
- Si la acción no está implementada, no mostrarla como real.
- Si se muestra una acción mock, debe estar visualmente contenida y no romper el flujo.

### 7.3 Acciones secundarias

Acciones secundarias viven en el `+` global, no en Home.

Ejemplos:

- abrir Geni;
- agregar gasto mock;
- agregar item de inventario mock;
- check-in mock;
- subir documento mock;
- crear automatización mock.

### 7.4 Acciones mock permitidas en Home

Home puede mostrar una acción mock solo si:

- refuerza la sensación premium;
- no confunde al usuario sobre lo real;
- abre un sheet/demo seguro;
- no requiere backend;
- no bloquea el flujo principal.

Acciones mock posibles:

- “Preguntar a Geni”;
- “Ver sugerencia”; 
- “Revisar carga”; 
- “Ver resumen”.

### 7.5 Cómo no saturar

No mostrar más de 3 pills.
No mostrar acciones duplicadas con la tab bar.
No poner Finance/Inventory/Assets como acciones principales si no son reales.
No usar labels largos.
No mezclar acciones reales y mock sin jerarquía.
No poner SOS en Quick Actions de Home.

### 7.6 Feedback

- Tap: scale mínimo y haptic selection.
- Acción exitosa: haptic success si persiste o abre flujo real.
- Acción mock: feedback visual suave, sin toast de “guardado”.
- Acción no disponible: no mostrarla; evitar disabled permanentes.

---

## 8. Geni en Home

### 8.1 Rol de Geni

Geni en Home debe aportar sensación de inteligencia y cuidado, pero sin prometer IA real si no existe.

Debe presentarse como:

- briefing visual;
- sugerencia contextual;
- resumen amable;
- capa de interpretación.

No debe presentarse como:

- asistente real completo si no lo es;
- buscador global real;
- motor de automatizaciones real;
- sistema que “sabe todo” si no hay permisos/datos.

### 8.2 Geni real vs mock

| Elemento | Tratamiento MVP |
|---|---|
| Briefing visual | MOCK PREMIUM permitido. |
| Resumen basado en tareas/eventos reales | REAL parcial si se calcula en frontend con datos disponibles. |
| IA generativa real | POST-MVP. |
| Geni Chat completo | MOCK PREMIUM / POST-MVP. |
| Sugerencias de automatización | MOCK PREMIUM visual, no real. |
| Search global | POST-MVP. |
| Memoria personal | POST-MVP. |

### 8.3 Ubicación en Home

Geni puede aparecer de dos maneras:

1. Card breve debajo de “Hoy en casa” si aporta claridad.
2. Dentro de un módulo “Geni te sugiere” más abajo si es mock/demo.

No debe competir con tareas y eventos reales.

### 8.4 Copy y tono

Geni debe:

- informar sin acusar;
- usar datos concretos;
- hablar con calma;
- sugerir, no ordenar;
- evitar culpa;
- evitar exageraciones;
- evitar promesas de predicción si no existe IA.

Ejemplos válidos:

- “Hoy hay 3 tareas y 1 evento. Conviene empezar por lo que vence hoy.”
- “Todo tranquilo por ahora. No hay eventos próximos.”
- “Hay una tarea vencida. Podés revisarla en Planner.”
- “Parece una semana cargada. Te dejo lo importante arriba.”

Ejemplos no válidos:

- “Geni analizó todo tu hogar con IA avanzada.”
- “Tu familia no está colaborando.”
- “María hizo menos que Juan.”
- “Predije que vas a olvidarte de esto.”
- “Automatización creada” si no existe motor real.

### 8.5 Cómo presentarlo premium sin prometer IA real

- Usar copy “Resumen de hoy” o “Geni te sugiere”.
- Basar el texto en datos visibles: número de tareas, eventos y vencimientos.
- Evitar claims técnicos.
- Usar una card visualmente premium con icono, no un chat completo obligatorio.
- Tap puede abrir un bottom sheet con “Vista demo” o sugerencias no destructivas.
- No usar input de chat si no hay respuesta real confiable.

---

## 9. Módulos mock premium en Home

Los módulos mock existen para que Home se vea vivo y completo. Deben aparecer después del contenido real. Deben ser compactos, creíbles y no prometer funcionalidad real.

### 9.1 Regla general

Cada módulo mock debe cumplir:

- máximo 1 card compacta;
- máximo 1 métrica principal;
- máximo 1 microcopy contextual;
- tap seguro hacia pantalla demo o More;
- no pedir datos que no existen;
- no crear expectativas de persistencia real.

No mostrar todos los módulos mock al mismo tiempo. Home debe elegir 2 o 3 como máximo según rol/estado.

### 9.2 Finance mock

Objetivo visual:

- mostrar que HomePlus también puede ordenar economía familiar.

Card recomendada:

- título: “Finanzas”;
- métrica: “Presupuesto al 72%” o “2 pagos próximos”;
- tono: informativo, no alarmista;
- CTA: “Ver en Más”.

Cuándo mostrar:

- Coordinador: sí, si se quiere demo premium.
- Adulto: sí, con menos detalle.
- Adolescente: solo si es demo personal y no sensible.
- Adulto Mayor: no priorizar salvo recordatorio simple.

No hacer:

- no mostrar saldos reales si no existen;
- no mostrar deudas personales sensibles;
- no permitir “agregar gasto” como real si no persiste;
- no usar rojo salvo deuda/vencimiento demo muy claro.

### 9.3 Inventory mock

Objetivo visual:

- mostrar vida cotidiana del hogar: stock, compras, medicación.

Card recomendada:

- título: “Inventario”;
- métrica: “3 cosas por reponer”;
- ejemplo: “Leche, detergente, papel higiénico”;
- CTA: “Ver lista”.

Variante Adulto Mayor:

- “Medicación” puede aparecer como recordatorio destacado si se decide usar demo senior.
- Botón: “Ya la tomé” solo si se aclara como demo/no real o si el flujo está implementado.

No hacer:

- no convertir medicación en sistema médico real;
- no generar alertas críticas de salud;
- no fingir notificaciones reales;
- no mostrar stock real si no existe.

### 9.4 Assets mock

Objetivo visual:

- mostrar mantenimiento y documentos importantes del hogar.

Card recomendada:

- título: “Cosas importantes” o “Activos”;
- métrica: “1 vencimiento próximo”;
- ejemplo: “Seguro del auto vence en 5 días”;
- CTA: “Ver detalle”.

Cuándo mostrar:

- solo si no desplaza tareas/eventos;
- preferentemente en Coordinador o Adulto.

No hacer:

- no implementar documentación real;
- no pedir patente/datos sensibles en Home;
- no crear flujos de mantenimiento automáticos.

### 9.5 Presence mock

Objetivo visual:

- dar sensación de hogar vivo, no de vigilancia.

Card recomendada:

- título: “Presencia”;
- avatares pequeños;
- estados simples: “En casa”, “Fuera”, “Sin datos”.

Reglas:

- usar Presence como nombre visible, no GPS;
- no mostrar mapa;
- no mostrar ubicación exacta;
- no mostrar historial;
- no mostrar Presence a Invitado;
- para Adulto, mostrar solo contexto permitido;
- para Adolescente, evitar exposición innecesaria.

No hacer:

- no prometer geofencing;
- no mostrar ubicación real si no existe;
- no usar copy de vigilancia.

### 9.6 Goals mock

Objetivo visual:

- dar sensación de progreso familiar/personal.

Card recomendada:

- título: “Meta familiar” o “Tu progreso”;
- progress bar suave;
- texto: “Vacaciones: 60%” o “Semana ordenada: 4/6 tareas”.

Reglas:

- Goals reales complejos quedan post-MVP.
- Puede usarse como visual de demo.
- En Adolescente puede aparecer como XP/progreso personal, sin leaderboard.

No hacer:

- no crear sistema de objetivos real sin backend;
- no comparar miembros;
- no hacer rankings.

### 9.7 Activity mock

Objetivo visual:

- mostrar que el hogar tiene vida y reconocimiento.

Card recomendada:

- título: “Actividad familiar”;
- máximo 3 items;
- tipos: tarea completada, evento agregado, foto subida mock, reconocimiento.

Reglas:

- mantener tono positivo y factual;
- no mostrar actividad sensible;
- no saturar con feed social;
- no competir con Planner.

No hacer:

- no implementar comentarios/reacciones reales en MVP si no existen;
- no mostrar “actividad automática de Geni” como real;
- no exponer auditoría crítica como feed casual.

---

## 10. Home por rol

La adaptación por rol cambia contenido y jerarquía, no la estructura global de navegación. Todos los roles deben reconocer el mismo HomePlus, pero ver lo que les corresponde.

### 10.1 Qué se mantiene común

En todos los roles:

- Home sigue siendo tab inicial.
- Header emocional se mantiene.
- “Hoy en casa” existe.
- Tareas/eventos relevantes aparecen si corresponden.
- Planner sigue siendo destino de administración.
- More contiene módulos secundarios.
- Quick Actions sigue disponible, con permisos.
- El tono sigue siendo factual, humano y no acusatorio.
- No se muestran datos privados sin permiso.

### 10.2 Coordinador

Objetivo:

- visión completa del hogar sin convertirlo en panel de control empresarial.

Prioridades:

1. Atención requerida.
2. Tareas vencidas o sin responsable.
3. Eventos familiares próximos.
4. Solicitudes de ingreso/aprobaciones si existen.
5. Carga familiar mock o parcial.
6. Módulos mock de finanzas/presence/activity.

Puede ver:

- resumen global;
- tareas del hogar;
- eventos familiares;
- aprobaciones pendientes;
- carga familiar mock;
- finance mock;
- activity mock;
- presence permitido.

Debe evitarse:

- mostrar porcentajes de carga de forma punitiva;
- convertir la pantalla en auditoría;
- exponer datos privados de otros;
- llenar Home de administración.

Quick actions recomendadas:

- Crear tarea;
- Crear evento;
- Invitar familia;
- Geni desde `+` global.

### 10.3 Adulto

Objetivo:

- foco en responsabilidades propias con contexto familiar suficiente.

Prioridades:

1. Mis tareas / tareas relevantes.
2. Eventos donde participa.
3. Contexto familiar mínimo.
4. Sugerencias suaves.
5. Módulos mock reducidos.

Puede ver:

- tareas propias;
- eventos propios/familiares relevantes;
- tareas del hogar si son compartidas;
- quick actions para crear tarea/evento si tiene permiso;
- presence relevante si aplica.

Debe evitarse:

- porcentajes de carga de otros miembros;
- comparación social;
- exceso de métricas globales;
- alertas financieras sensibles si no corresponden.

Quick actions recomendadas:

- Crear tarea;
- Crear evento;
- Ver Planner.

### 10.4 Adolescente

Objetivo:

- autonomía progresiva, tareas propias y sensación de avance sin vigilancia.

Prioridades:

1. Mis tareas.
2. Mis eventos o eventos donde participo.
3. Progreso personal visual si se usa mock.
4. Contexto familiar mínimo.

Puede ver:

- tareas asignadas;
- eventos donde participa;
- progreso propio visual;
- quick action limitada si tiene permiso.

Debe evitarse:

- leaderboard;
- comparaciones con hermanos;
- carga familiar global;
- finanzas familiares;
- presence global invasiva;
- tono infantil si es adolescente.

Card mock permitida:

- “Tu progreso de la semana” con barra simple.

Quick actions recomendadas:

- Ver mis tareas;
- Crear evento si el rol lo permite;
- Preguntar a Geni mock si se mantiene seguro.

### 10.5 Adulto Mayor

Objetivo:

- claridad, acompañamiento, eventos, recordatorios y contacto fácil.

Prioridades:

1. Próximo evento.
2. Recordatorios importantes.
3. Contactos o familia.
4. Tareas muy simples si existen.
5. Medicación mock solo como demo no médica.

Debe usar:

- texto más grande;
- botones grandes;
- menos cards;
- más espacio vertical;
- direcciones completas;
- CTAs claros.

Puede ver:

- eventos próximos;
- tareas asignadas simples;
- recordatorios demo;
- contactos relevantes si está configurado;
- botón de emergencia mock si forma parte de la demo visual.

Debe evitarse:

- swipe horizontal obligatorio;
- chips pequeños;
- muchas métricas;
- progress bars complejas;
- finance detallado;
- presence invasiva;
- tareas con metadata larga.

Toast:

- duración más larga: 8 segundos.

Quick actions recomendadas:

- Ver evento;
- Llamar contacto si existe como demo seguro;
- Ver recordatorio.

---

## 11. Reglas de jerarquía visual

Home debe seguir una jerarquía estricta.

### 11.1 Prioridad visual

1. Estados críticos o de sesión.
2. Header emocional.
3. Hoy en casa real.
4. Acciones compactas.
5. Geni/briefing premium.
6. Módulos mock seleccionados.
7. Actividad familiar.

### 11.2 Jerarquía de cards

- Solo 1 card destacada por viewport inicial.
- Las cards reales tienen prioridad sobre las mock.
- Las alertas no deben abusar del color warning/danger.
- Las cards secundarias deben ser compactas.
- Las cards mock no deben tener más presencia que tareas/eventos reales.

### 11.3 Lectura en la primera pantalla

En un dispositivo tipo 375×812, el usuario debería ver sin esfuerzo:

- header;
- parte central de “Hoy en casa”;
- al menos una acción clara;
- tab bar.

Si el primer viewport queda ocupado por un briefing largo o cards mock, está mal.

---

## 12. Cards permitidas

### 12.1 Cards principales permitidas

| Card | Tipo | Uso |
|---|---|---|
| Hoy en casa | Real | Núcleo de tareas/eventos. |
| Atención requerida | Real/mixta | Vencimientos, aprobaciones, urgencias. |
| Geni resumen | Mock/real parcial | Briefing breve. |
| Quick Actions compactas | Real/mixta | Atajos. |

### 12.2 Cards secundarias permitidas

| Card | Tipo | Límite |
|---|---|---|
| Finance | Mock | 1 métrica. |
| Inventory | Mock | 1 alerta/lista corta. |
| Assets | Mock | 1 vencimiento. |
| Presence | Mock | máximo 4 avatares. |
| Goals | Mock | 1 progress bar. |
| Activity | Mock | máximo 3 items. |

### 12.3 Cards prohibidas en Home MVP

- Dashboard financiero completo.
- Calendario mensual completo.
- Lista completa de miembros.
- Feed social completo.
- Auditoría completa.
- Configuración del hogar.
- Chat completo de Geni si no hay IA real.
- Inventario completo.
- Tabla de métricas.
- Leaderboard familiar.
- Mapa de ubicación.
- Document library completa.

---

## 13. Qué ocultar o mover abajo

Mover abajo o a More:

- Finance mock;
- Inventory mock;
- Assets mock;
- FamilyCloud/HomeCloud;
- Activity feed;
- Goals mock;
- Search;
- Automations;
- Settings;
- auditoría;
- documentos;
- historial;
- métricas avanzadas.

Ocultar por defecto:

- módulos sin datos;
- mocks que no aportan a la demo;
- eventos cancelados antiguos;
- tareas completadas viejas;
- metadata técnica;
- IDs, estados backend, slugs, tokens;
- permisos internos;
- errores crudos.

---

## 14. Empty states

Los empty states reemplazan tutoriales. Deben orientar a una acción concreta.

### 14.1 Primer Home después de crear hogar

Contenido:

- título: “Tu hogar está listo”.
- texto: “Podés empezar con una tarea o invitar a alguien.”
- CTA principal: “Crear primera tarea”.
- CTA secundaria: “Invitar familia”.

Si invitar no está implementado:

- CTA secundaria: “Ir a Familia”.

### 14.2 Sin tareas

- título: “Sin tareas pendientes”.
- texto: “Cuando agregues una tarea, va a aparecer acá.”
- CTA: “Crear tarea” o “Ir a Planner”.

### 14.3 Sin eventos

- título: “Sin eventos próximos”.
- texto: “Los próximos planes del hogar van a aparecer acá.”
- CTA: “Crear evento” o “Ver calendario”.

### 14.4 Sin miembros adicionales

No debe sonar triste ni culposo.

- título: “Tu hogar ya funciona con vos”.
- texto: “Cuando invites a alguien, van a poder coordinar tareas y eventos juntos.”
- CTA: “Invitar familia” si está implementado.

### 14.5 Sin módulos mock

No mostrar empty states de módulos mock en Home. Si un mock no tiene contenido, se omite.

---

## 15. Loading states

Home debe cargar con suavidad y sin bloquear más de lo necesario.

### 15.1 Loading inicial

Mostrar:

- `AppScreen` con background real;
- skeleton de header;
- skeleton de “Hoy en casa”;
- skeleton de 1 card secundaria;
- tab bar visible si la sesión ya está resuelta.

No mostrar spinner global sobre pantalla blanca salvo transición mínima.

### 15.2 Loading parcial

Si tareas cargan pero eventos no:

- mostrar tareas;
- skeleton compacto para eventos;
- no bloquear todo Home.

Si módulos mock están listos antes que datos reales:

- no mostrarlos arriba para tapar la carga real;
- mantener prioridad de “Hoy en casa”.

### 15.3 Pull to refresh

Si existe:

- refresca tareas/eventos/Home summary;
- mantiene scroll position razonable;
- no reinicia toda la navegación;
- usa feedback nativo/plataforma.

---

## 16. Error y offline states

### 16.1 Backend inaccesible

Mostrar un estado amable:

- banner compacto: “No pudimos actualizar Home”.
- texto secundario: “Mostramos la última información disponible.”
- CTA: “Reintentar”.

No mostrar stack traces ni errores técnicos.

### 16.2 Sin conexión

Mostrar:

- banner superior bajo header;
- datos cacheados si existen;
- timestamp: “Última actualización: hace 20 min” si está disponible;
- acciones online deshabilitadas u ocultas.

No prometer offline sync si no existe.

### 16.3 Sesión vencida

No dejar al usuario interactuar con Home.

Mostrar transición a Auth o estado global:

- “Tu sesión venció”.
- “Volvé a iniciar sesión para continuar.”

### 16.4 Error al completar tarea

Si falla completar tarea:

- revertir checkbox;
- toast: “No se pudo completar. Intentá de nuevo.”;
- haptic error;
- mantener al usuario en Home.

No duplicar tareas ni dejar estados ambiguos.

---

## 17. Motion y haptics en Home

Home debe sentirse viva, no animada en exceso.

### 17.1 Motion permitida

- Entrada de cards: fade/translate sutil.
- Completar tarea: check + fade/slide corto.
- Toast: slide/fade.
- Bottom sheet: spring suave.
- Pull to refresh: nativo.
- Cambio de tab: transición simple.

### 17.2 Duraciones recomendadas

- Tap feedback: 80–120ms.
- Card entrance: 180–240ms.
- Complete task: 180–260ms.
- Toast entrance: 160–220ms.
- Sheet open: 220–320ms.

### 17.3 Haptics

| Acción | Haptic |
|---|---|
| Tap en acción principal | selection/light. |
| Completar tarea | success/light. |
| Error al completar | error/warning. |
| Abrir sheet | selection. |
| Cambiar segmento/tab interno | selection. |
| Acción mock | selection leve, no success fuerte. |

### 17.4 Prohibiciones de motion

- No confetti frecuente.
- No animaciones largas en cada carga.
- No rebotes excesivos.
- No parallax complejo.
- No animar todas las cards al completar una tarea.
- No usar rojo pulsante salvo emergencia visual explícita.
- No depender de animación para entender el estado.

---

## 18. Accesibilidad

### 18.1 Lectura y contraste

- Texto principal con contraste alto.
- Metadata en secondary/tertiary solo si no es crítica.
- Warning/danger no deben depender solo del color.
- Badges deben tener texto o icono claro.

### 18.2 Tamaños táctiles

- Tareas/check: target mínimo 44px.
- Adulto Mayor: botones principales 56–64px.
- Avatares interactivos: target mínimo accesible.
- Pills: no demasiado pequeñas.

### 18.3 Texto dinámico

Home debe tolerar:

- nombres largos;
- títulos de tareas largos;
- eventos de dos palabras o muy largos;
- idioma español con textos extensos;
- escalado de fuente razonable.

Reglas:

- truncar con cuidado;
- evitar metadata excesiva;
- permitir wrap en Adulto Mayor;
- no comprimir botones al punto de perder legibilidad.

### 18.4 Screen reader

Elementos deben tener labels semánticos:

- “Completar tarea: sacar la basura”.
- “Evento hoy a las 18: reunión familiar”.
- “Abrir Planner”.
- “Abrir acciones rápidas”.

No leer emojis como única información.

---

## 19. Reglas de composición

### 19.1 No saturar

Home debe limitarse a:

- 1 header;
- 1 sección real principal;
- máximo 3 quick actions visibles;
- máximo 1 card Geni;
- máximo 2–3 cards mock;
- máximo 1 activity card.

### 19.2 No anidar cards excesivamente

Permitido:

- card grande con rows internas;
- card secundaria con métrica y CTA.

No permitido:

- card dentro de card dentro de card;
- múltiples containers con shadows fuertes;
- listas con bordes duplicados.

### 19.3 No usar badges largos

Badges deben ser cortos:

- “Hoy”;
- “Vence”;
- “Nuevo”;
- “Pendiente”;
- “Mock” no visible al usuario final salvo build interna.

No usar badges tipo:

- “Pendiente de verificación por coordinador desde ayer”.

Eso va como texto secundario o detalle.

### 19.4 No mostrar metadata si no aporta

No mostrar:

- IDs;
- timestamps exactos innecesarios;
- rol técnico si no ayuda;
- estado backend crudo;
- relación de tabla;
- source de mock;
- cantidades decorativas.

Mostrar metadata solo si ayuda a decidir:

- vence hoy;
- asignada a mí;
- evento a las 18;
- hay 3 más;
- última actualización si offline.

---

## 20. Reglas visuales desde Design System

Home debe consumir el Design System sin redefinir tokens.

### 20.1 Color

- Background: cálido/cream.
- Surface: cards suaves.
- Acción principal: terracota.
- Calma/bienestar: salvia.
- Warning: solo atención real o mock explícita.
- Danger: solo error, sesión, emergencia o acción destructiva.
- Success: completar tarea o estado positivo real.
- Border: sutil.
- Overlay: para sheets/modals.

### 20.2 Tipografía

- Header emocional: title/hero según pantalla.
- Títulos de sección: title2/title3.
- Rows de tareas/eventos: body.
- Metadata: bodySmall/caption.
- Microcopy: caption/micro.

No usar muchas familias ni pesos en Home.

### 20.3 Radius y shadows

- Cards principales con radius amplio.
- Rows internas con radius menor o sin caja propia.
- Shadows suaves.
- Evitar sombra fuerte de dashboard.
- Glass solo donde el Design System lo permita.

### 20.4 Glass/blur

Sí:

- tab bar;
- sheets;
- overlays;
- pequeñas superficies premium si legibles.

No:

- cards con texto denso;
- listas largas;
- Android/Web sin fallback;
- estados de error críticos.

Fallback:

- surface opaca cálida;
- border sutil;
- shadow bajo.

---

## 21. Performance

Home es la primera pantalla privada. Debe sentirse rápida.

### 21.1 Reglas

- No bloquear Home por módulos mock.
- Cargar primero usuario/hogar/tareas/eventos.
- Renderizar módulos mock con datos locales ligeros si se usan.
- Evitar cálculos pesados de carga familiar en render.
- Evitar listas largas en Home.
- Evitar imágenes pesadas.
- Evitar blur excesivo en Android.
- Evitar animaciones simultáneas masivas.
- Mantener skeletons simples.

### 21.2 Prioridad de datos

1. auth/me y navegación ya resuelta por shell;
2. hogar activo y rol;
3. tareas reales relevantes;
4. eventos reales próximos;
5. members básicos si se usan;
6. mocks locales;
7. activity mock.

### 21.3 Re-render

- Completar tarea no debe re-renderizar toda la app.
- Refetch de Home no debe resetear tab bar.
- Mock cards no deben recalcularse en cada render.
- Pull to refresh no debe duplicar datos.

---

## 22. Checklist de implementación

### 22.1 Base visual

- [ ] Home usa `AppScreen`.
- [ ] Header usa `AppHeader` o patrón equivalente del DS.
- [ ] Cards usan `AppCard`.
- [ ] Textos usan `AppText`.
- [ ] Botones usan `AppButton` / `ActionPill`.
- [ ] Inputs no aparecen en Home salvo sheet/modal.
- [ ] Bottom sheets usan patrón global.
- [ ] Toast usa patrón global.

### 22.2 Estructura

- [ ] Header emocional arriba.
- [ ] “Hoy en casa” antes que mocks.
- [ ] Tareas reales visibles si existen.
- [ ] Eventos reales visibles si existen.
- [ ] CTA a Planner.
- [ ] Quick Actions compactas máximo 3.
- [ ] Geni/briefing no tapa contenido real.
- [ ] Módulos mock abajo y limitados.
- [ ] Activity al final.

### 22.3 Estados

- [ ] Loading inicial con skeleton, no pantalla blanca.
- [ ] Empty state primer uso.
- [ ] Empty state sin tareas.
- [ ] Empty state sin eventos.
- [ ] Error backend inaccesible.
- [ ] Offline visual si aplica.
- [ ] Sesión vencida delegada al shell/Auth.
- [ ] Error al completar tarea revierte UI.

### 22.4 Interacciones

- [ ] Completar tarea funciona o no se muestra checkbox.
- [ ] Completar tarea tiene haptic/animation/toast undo si real.
- [ ] Tap tarea abre Planner/detail.
- [ ] Tap evento abre Planner/Calendar.
- [ ] Tap CTA abre Planner.
- [ ] Tap mock abre destino seguro.
- [ ] Pull to refresh no rompe layout.

### 22.5 Rol y permisos

- [ ] Coordinador ve visión global moderada.
- [ ] Adulto ve foco propio + contexto.
- [ ] Adolescente ve autonomía y baja exposición.
- [ ] Adulto Mayor ve layout simplificado y targets grandes.
- [ ] Invitado, si existe, no ve datos sensibles.
- [ ] No se muestran acciones sin permiso.

### 22.6 Calidad visual

- [ ] No hay más de 2–3 cards mock visibles.
- [ ] No hay badges largos.
- [ ] No hay metadata técnica.
- [ ] No hay colores agresivos sin razón.
- [ ] No hay sombras fuertes tipo SaaS.
- [ ] No hay animaciones excesivas.
- [ ] Se ve premium en iOS.
- [ ] Tiene fallback correcto en Android/Web.

---

## 23. Criterios de aceptación visual

Home está aceptada cuando:

- Se entiende en menos de 5 segundos qué pasa hoy.
- Tareas y eventos reales tienen prioridad visible.
- El usuario puede ir a Planner sin pensar.
- El Home no parece dashboard empresarial.
- Los mocks se ven premium pero no dominan.
- Geni no promete IA real.
- La pantalla no se siente saturada.
- Hay suficiente aire visual.
- La tab bar no compite con las cards.
- El primer uso da una acción clara.
- Completar tarea desde Home se siente inmediato y seguro.
- Offline/error no rompe la experiencia.
- Adulto Mayor puede leer y tocar sin precisión fina.
- Adolescente no ve comparaciones ni presión social.
- Coordinador ve contexto sin vigilancia.
- Adulto ve lo suyo sin sentirse evaluado.

---

## 24. Qué NO hacer

No hacer:

- No convertir Home en dashboard de métricas.
- No mostrar todos los módulos del producto a la vez.
- No poner Finance, Inventory, Assets, Presence, Goals o Geni como si fueran features reales completas.
- No prometer IA real.
- No mostrar chat de Geni completo si no responde de verdad.
- No poner calendario mensual completo en Home.
- No poner lista completa de tareas.
- No poner feed social completo.
- No usar rankings familiares.
- No comparar miembros.
- No usar copy acusatorio.
- No usar rojo para presión normal.
- No poner SOS en Quick Actions si la navegación lo excluye.
- No mostrar GPS como nombre visible.
- No mostrar mapas reales/mock invasivos.
- No mostrar datos privados en Home.
- No usar badges largos.
- No mostrar metadata técnica.
- No anidar cards excesivamente.
- No bloquear Home por cargar mocks.
- No generar formularios dentro de Home principal.
- No implementar backend desde este documento.
- No redefinir tokens del Design System.
- No cambiar la navegación desde este documento.

---

## 25. Fases sugeridas para implementar Home

### Fase H1 — Home real mínimo

Objetivo:

- que Home muestre datos reales y sea útil.

Incluye:

- header emocional;
- “Hoy en casa”;
- tareas reales;
- eventos reales;
- empty states;
- CTA a Planner;
- loading/error básico.

No incluye:

- mocks avanzados;
- Geni visual complejo;
- activity feed;
- carga familiar.

### Fase H2 — Interacción real de demo

Objetivo:

- demostrar colaboración real entre usuarios.

Incluye:

- completar tarea desde Home;
- toast con deshacer si posible;
- refetch/update al volver a Home;
- cambios visibles en dos dispositivos;
- eventos próximos actualizados.

No incluye:

- realtime complejo si no existe;
- offline sync.

### Fase H3 — Premium layer

Objetivo:

- que Home se vea avanzado y cálido.

Incluye:

- Geni briefing mock basado en datos reales disponibles;
- 2–3 módulos mock compactos;
- activity mock;
- motion/haptics;
- polish visual iOS premium;
- fallbacks Android/Web.

No incluye:

- IA real;
- módulos reales secundarios.

### Fase H4 — Rol polish

Objetivo:

- adaptar Home por rol sin duplicar pantalla.

Incluye:

- Coordinador;
- Adulto;
- Adolescente;
- Adulto Mayor;
- límites de visibilidad;
- densidad distinta;
- targets grandes para senior.

No incluye:

- permisos finos complejos si backend no los soporta.

---

## 26. Resumen operativo para Codex/Antigravity

Implementar Home como una pantalla premium, mobile-first y selectiva.

La pantalla debe priorizar:

1. header emocional;
2. tareas/eventos reales en “Hoy en casa”;
3. acciones compactas;
4. Geni/briefing mock sobrio;
5. 2–3 módulos mock máximo;
6. activity familiar al final.

La regla de oro:

> Si algo no ayuda al usuario a entender o actuar hoy, no va arriba en Home.

Home debe parecer vivo, pero no saturado; inteligente, pero no falso; familiar, pero no infantil; premium, pero no corporativo.

HOME UX READY
