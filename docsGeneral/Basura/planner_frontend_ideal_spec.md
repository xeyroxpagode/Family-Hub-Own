\# planner\_frontend\_ideal\_spec.md

\#\# 1\. Resumen ejecutivo

Planner debe ser el núcleo operativo diario de HomePlus para coordinar tareas, eventos y responsabilidades del hogar con la menor fricción posible.

El objetivo del frontend ideal del Planner MVP es corregir la experiencia actual para que se sienta más profesional, clara, alineada visualmente con la app y usable en una demo multi-dispositivo. El usuario debe poder entender rápido qué hay pendiente, qué vence hoy, quién es responsable, qué eventos vienen y qué necesita atención.

Para el MVP actual, Planner se concentra en:

\* Tasks reales.  
\* Events reales.  
\* Calendar real simple.  
\* Responsabilidades como agrupador operativo.  
\* Templates como atajos constantes.  
\* Categoría visible autogenerada.  
\* Quick Actions para crear tarea/evento rápido.  
\* Home conectado a tareas y eventos reales.

Home resume Planner. Planner administra Planner.

Quedan fuera del MVP: Goals reales, Geni real, automatizaciones reales, comentarios, adjuntos, subtareas, dependencias, presencia real, finanzas reales, inventario real, assets reales y cualquier refactor global que no sea necesario para cerrar Tasks \+ Events \+ Home conectado.

\---

\#\# 2\. Alcance del MVP actual

Entra en el MVP actual:

\* Planner accesible desde Bottom Nav.  
\* Tasks reales conectadas al backend actual.  
\* Events reales conectados al backend actual.  
\* Calendar real construido desde eventos y, si aplica, tareas con fecha.  
\* Home mostrando resumen real de Planner:

  \* tareas pendientes;  
  \* tareas vencidas;  
  \* próximas tareas;  
  \* próximos eventos.  
\* Quick Actions reales:

  \* crear tarea;  
  \* crear evento.  
\* Crear tarea con baja fricción.  
\* Crear evento con baja fricción.  
\* Lista de tareas clara y escaneable.  
\* Estados visuales de tarea:

  \* pendiente;  
  \* completada;  
  \* esperando verificación;  
  \* verificada;  
  \* cancelada;  
  \* vencida como estado calculado.  
\* Estados visuales de evento:

  \* programado;  
  \* cancelado;  
  \* all day;  
  \* próximo;  
  \* pasado si se muestra.  
\* Responsabilidades iniciales:

  \* Limpieza;  
  \* Compras;  
  \* Mascotas;  
  \* Medicación;  
  \* Estudios;  
  \* Pagos;  
  \* Vehículos;  
  \* Finanzas;  
  \* Otro.  
\* Templates constantes para acelerar creación.  
\* Categoría visible autogenerada desde responsabilidad/template.  
\* Asignación a miembros activos del hogar usando \`household\_members.id\`.  
\* Refresh manual o automático simple para demo multi-dispositivo.  
\* Loading, empty, error, saving, success y retry.  
\* Diseño mobile-first.  
\* Completar tarea en 1 tap.  
\* Verificación de tarea si el backend lo soporta.  
\* Cancelar tarea/evento sin hard delete visual.  
\* No usar Supabase directo desde Planner frontend.  
\* No usar legacy \`tasks\`, \`events\`, \`schedules\`.  
\* No enviar \`household\_id\` desde frontend.

\---

\#\# 3\. Fuera de alcance / POST-MVP

\#\#\# POST-MVP funcional

No entra en el MVP actual:

\* Goals reales.  
\* Milestones / hitos.  
\* Streaks.  
\* Comentarios en tareas.  
\* Adjuntos en tareas.  
\* Evidencia adjunta.  
\* Subtareas.  
\* Dependencias entre tareas.  
\* Recurrencia compleja de tareas.  
\* RRULE/EXDATE avanzado.  
\* Participantes avanzados de eventos.  
\* RSVP de eventos.  
\* Conflictos inteligentes de calendario.  
\* Notificaciones push/email/SMS reales.  
\* Auditoría visible avanzada.  
\* Timeline de actividad de tarea.  
\* Offline Sync.  
\* Resolución de conflictos offline.  
\* Automatizaciones reales.  
\* Geni real.  
\* Geni Search.  
\* Geni creando, optimizando o sugiriendo tareas reales.  
\* Finance real conectado a Planner.  
\* Inventory real generando tareas.  
\* Assets real generando tareas.  
\* FamilyCloud real desde Calendar.  
\* Presence GPS real.  
\* Multi-hogar avanzado.  
\* Permisos finos configurables por hogar.  
\* CRUD real de templates.  
\* CRUD real de responsabilidades si el backend actual no lo tiene en scope MVP.

\#\#\# POST-MVP visual

Puede quedar como referencia visual, pero no como funcionalidad real:

\* Tab o card de Goals como “Próximamente”.  
\* Métricas de carga familiar avanzadas.  
\* Briefing inteligente generado por Geni.  
\* Sugerencias automáticas de redistribución.  
\* Cards de productividad familiar complejas.  
\* Progreso de metas.  
\* Timeline de tarea.  
\* Historial detallado.  
\* Vista tablet de dos columnas.  
\* Desktop/sidebar.

\#\#\# Módulos mock o referencia

Pueden existir en Home o More como mock/demo premium, pero no deben bloquear Planner:

\* Finance.  
\* Inventory.  
\* Assets.  
\* FamilyCloud.  
\* Presence.  
\* SOS.  
\* Feed.  
\* Automatizaciones.  
\* Geni.  
\* Goals.  
\* Documentos/OCR.

\---

\#\# 4\. Principios de producto aplicables al Planner

\#\#\# Reducir carga mental

Planner existe para que una persona no tenga que recordar, pedir, insistir y coordinar todo manualmente.

Reglas aplicables:

\* Mostrar pendientes de forma clara.  
\* Priorizar lo de hoy, lo vencido y lo próximo.  
\* Mostrar responsable cuando exista.  
\* Evitar que el usuario tenga que revisar muchas pantallas.  
\* Evitar formularios largos para acciones comunes.  
\* Crear tareas/eventos debe sentirse rápido.  
\* Home debe mostrar lo importante sin obligar a abrir Planner.

\#\#\# Coordinar, no controlar

Planner no debe sentirse como vigilancia ni castigo. Debe coordinar responsabilidades.

Reglas aplicables:

\* Usar tono neutral.  
\* Mostrar hechos, no juicios.  
\* Evitar rankings o comparaciones de miembros.  
\* Evitar copy culpabilizante.  
\* No usar rojo fuerte salvo bloqueo real.  
\* Mostrar “Vencida” o “Pendiente” como información operativa.

\#\#\# Home resume; Planner administra

Home muestra extractos útiles. Planner es donde se gestionan tareas y eventos.

Reglas aplicables:

\* Home no reemplaza Planner.  
\* Card de tarea en Home puede abrir detalle o lista filtrada en Planner.  
\* Card de evento en Home puede abrir Calendar o detalle.  
\* Home no debe tener formularios largos de Planner.  
\* Home puede tener CTA “Ver todo”.

\#\#\# Simplicidad visual

Planner debe verse avanzado sin estar cargado.

Reglas aplicables:

\* Pocos elementos por pantalla.  
\* Cards claras.  
\* Chips horizontales.  
\* Jerarquía visual por urgencia.  
\* Acciones primarias visibles.  
\* Opciones avanzadas ocultas bajo “Más opciones”.  
\* No saturar con todos los estados técnicos.

\#\#\# Configuración mínima

El usuario no debe configurar demasiado para obtener valor.

Reglas aplicables:

\* Responsabilidades iniciales predefinidas.  
\* Templates constantes.  
\* Prioridad default.  
\* Fecha opcional.  
\* Responsable opcional.  
\* Descripción opcional.  
\* Verificación opcional.  
\* Categoría autogenerada.

\#\#\# Acciones trazables

El sistema debe dejar claro qué pasó.

Reglas aplicables:

\* Al completar: feedback inmediato.  
\* Al verificar: badge claro.  
\* Al cancelar: estado o desaparición coherente.  
\* Al fallar una acción: error accionable.  
\* En demo multi-dispositivo: otro usuario debe poder ver cambios al refrescar.

\#\#\# Privacidad operativa

Las tareas y eventos del hogar son visibles según reglas del backend. Los datos privados no se mezclan sin necesidad.

Reglas aplicables:

\* Planner solo consume datos del hogar activo resuelto por backend.  
\* No exponer datos de otros hogares.  
\* No usar \`household\_id\` manual desde frontend.  
\* No traer datos por Supabase directo.  
\* No mostrar información privada de módulos no Planner.

\#\#\# Automatización asistida futura

Planner debe estar preparado visualmente para Geni/automatizaciones futuras, pero no implementarlas ahora.

Reglas aplicables:

\* Se pueden reservar patrones de “sugerencia”.  
\* No crear flujos reales de IA.  
\* No permitir que Geni complete tareas automáticamente.  
\* No bloquear el MVP esperando IA.

\#\#\# Ecosistema integrado

Planner debe sentirse conectado con Home y Quick Actions.

Reglas aplicables:

\* Bottom Nav incluye Planner.  
\* Botón central \`+\` permite crear tarea/evento.  
\* Home muestra resumen de Planner.  
\* Planner permite administrar lo que Home resume.

\---

\#\# 5\. Principios UX/UI aplicables

\* Crear una tarea común no debe exigir descripción.  
\* Crear una tarea común debe requerir pocos taps.  
\* Completar una tarea debe ser 1 tap desde la lista.  
\* Crear evento debe ser accesible desde Quick Actions y Calendar.  
\* La lista de tareas debe poder escanearse en segundos.  
\* Los filtros deben reducir ruido, no agregar complejidad.  
\* Los chips deben ser horizontales y simples.  
\* La acción principal debe estar en zona de pulgar.  
\* Las cards no deben tener más de una acción primaria.  
\* El estado de una tarea debe verse sin abrir detalle.  
\* La fecha debe ser visible si existe.  
\* Las vencidas deben destacarse sin generar culpa visual.  
\* Las tareas canceladas no deben ensuciar la lista principal.  
\* Las completadas deben poder consultarse aparte.  
\* Los formularios deben usar bottom sheet o pantalla corta, no formularios interminables.  
\* El usuario debe poder crear desde:

  \* Home/Quick Actions;  
  \* Planner;  
  \* Tasks;  
  \* Calendar.  
\* El feedback debe ser inmediato:

  \* checkbox animado;  
  \* skeleton;  
  \* botón saving;  
  \* toast superior;  
  \* retry.  
\* Los errores deben decir qué hacer.  
\* No usar tooltips como explicación principal.  
\* Empty states funcionan como tutorial.  
\* No usar rankings, leaderboards o métricas acusatorias.  
\* No mostrar estados técnicos innecesarios.  
\* Usar defaults inteligentes.

\---

\#\# 6\. Arquitectura visual general

\#\#\# Base visual

Planner debe usar una estética clara, cálida y premium, alineada con HomePlus y más cercana al Figma que a una app genérica de tareas.

Reglas visuales:

\* Fondo claro, suave, no blanco puro si la app ya usa fondo cálido.  
\* Cards redondeadas.  
\* Separadores sutiles.  
\* Badges suaves.  
\* Chips horizontales.  
\* Avatares o iniciales.  
\* Iconografía simple.  
\* Espaciado generoso.  
\* Jerarquía clara entre:

  \* resumen;  
  \* lista;  
  \* filtros;  
  \* acciones.  
\* Animaciones cortas y suaves.  
\* Sin rebotes repetidos.  
\* Sin parpadeos.  
\* Sin sonidos propios.

\#\#\# Color principal

Para esta spec, usar violeta como color principal operativo del Planner, porque el problema actual pide alinear el Planner a una experiencia visual más premium y el prompt especifica violeta como principal.

Uso recomendado:

\* Violeta para:

  \* CTA principal;  
  \* tab activo;  
  \* chips seleccionados;  
  \* indicador de sección;  
  \* botón \`+\`;  
  \* foco visual moderado.  
\* No usar violeta en todos lados.  
\* Máximo 1 o 2 elementos principales violetas por pantalla.  
\* Estados semánticos deben seguir siendo semánticos:

  \* success para completado/verificado;  
  \* warning para atención;  
  \* neutral para pendiente;  
  \* danger/error solo para bloqueos o cancelación destructiva.

\#\#\# Cards

Card de tarea:

\* Fondo \`surface-card\`.  
\* Radius 12–16px.  
\* Padding 14–16px.  
\* Sombra suave o borde sutil.  
\* Leading checkbox.  
\* Título visible.  
\* Metadata en segunda línea.  
\* Badge/chip de responsabilidad.  
\* Fecha si existe.  
\* Avatar/iniciales del responsable si existe.  
\* Estado visual claro.

Card de evento:

\* Fondo \`surface-card\`.  
\* Radius 12–16px.  
\* Padding 14–16px.  
\* Fecha/hora como metadata principal.  
\* Título.  
\* Ubicación si existe.  
\* Badge all-day si aplica.  
\* Estado cancelado si aplica.

Card destacada:

\* Para Atención requerida.  
\* Borde lateral violeta o warning según el caso.  
\* Texto corto.  
\* CTA claro.

\#\#\# Chips

Usar chips para:

\* filtros;  
\* responsabilidades;  
\* vistas rápidas;  
\* fecha rápida;  
\* prioridad;  
\* estados.

Chips recomendados:

\* Todas.  
\* Mías.  
\* Familia.  
\* Hoy.  
\* Vencidas.  
\* Completadas.  
\* Agrupar.  
\* Limpieza.  
\* Compras.  
\* Mascotas.  
\* Medicación.  
\* Estudios.  
\* Pagos.  
\* Vehículos.  
\* Otro.

\#\#\# Header

Planner puede reutilizar header global:

\* título de pantalla;  
\* avatar;  
\* selector de hogar solo si existe multi-hogar visible;  
\* SOS arriba derecha si la app ya lo muestra globalmente.

Para MVP, no desarrollar SOS real desde Planner.

\#\#\# Bottom Nav

Bottom Nav oficial:

\`Inicio | Personas | \+ | Planner | Más\`

Planner debe estar visible como tab principal.

\#\#\# Tabs internas

Opciones:

\* \`Tareas\`  
\* \`Calendario\`  
\* \`Metas\` solo si se deja visible como futura/mock.

Recomendación MVP:

\* Mostrar \`Tareas\` y \`Calendario\`.  
\* Ocultar \`Metas\` o mostrarla como disabled/próximamente solo si visualmente aporta.

\---

\#\# 7\. Navegación principal y entradas al Planner

Entradas principales:

\* Bottom Nav → Planner.  
\* Home → card de tareas.  
\* Home → card de próximos eventos.  
\* Home → atención requerida.  
\* Quick Actions → Crear tarea.  
\* Quick Actions → Crear evento.  
\* Planner → \`+ Nueva tarea\`.  
\* Calendar → \`+ Nuevo evento\`.  
\* Task card → detalle/editar.  
\* Checkbox de Task card → completar.  
\* Event card → detalle/editar.  
\* Empty state → crear primera tarea/evento.

\#\#\# Navegación recomendada

Desde Home:

\* Tocar “Tareas pendientes” abre Planner en tab Tareas.  
\* Tocar “Vencidas” abre Planner en Tareas con filtro vencidas.  
\* Tocar una tarea abre detalle de tarea.  
\* Tocar “Próximos eventos” abre Calendar.  
\* Tocar un evento abre detalle de evento.

Desde Bottom Nav:

\* Tocar Planner abre el último subtab usado o Tareas por defecto.  
\* Tocar de nuevo Planner estando activo puede hacer scroll to top \+ refresh.

Desde Quick Actions:

\* \`Crear tarea\` abre bottom sheet de creación rápida.  
\* \`Crear evento\` abre bottom sheet de creación rápida de evento.

\#\#\# Profundidad máxima

Acciones principales deben ser 1–2 taps:

\* Ver Planner: 1 tap.  
\* Completar tarea: 1 tap.  
\* Crear tarea desde \`+\`: 2 taps.  
\* Crear evento desde \`+\`: 2 taps.  
\* Ver detalle: 1 tap desde card.  
\* Editar desde detalle: 1 tap adicional.

\---

\#\# 8\. Bottom nav y Quick Actions

\#\#\# Bottom Nav

Estructura:

\`Inicio | Personas | \+ | Planner | Más\`

Reglas:

\* No agregar tabs nuevos.  
\* No esconder Planner en Más.  
\* El botón \`+\` es central y destacado.  
\* Planner debe tener badge solo si hay algo accionable.  
\* No usar rojo/error en badge de Bottom Nav.  
\* Tap en tab activo refresca o vuelve arriba.

\#\#\# Quick Actions

El botón \`+\` central abre un bottom sheet/panel flotante.

Comportamiento:

\* Se abre sobre la pantalla actual.  
\* Mantiene contexto.  
\* Fondo con overlay suave.  
\* Cierre por swipe down, tap fuera o botón cerrar.  
\* Acciones ordenadas por prioridad/frecuencia.

\#\#\# Acciones reales ahora

Deben estar implementadas en MVP:

1\. Crear tarea.  
2\. Crear evento.

Opcional dentro del MVP si ya existe navegación:

3\. Ver pendientes.

\#\#\# Acciones mock/futuras

Pueden aparecer visualmente en una demo si la app ya tiene módulos mock, pero no deben integrarse como funcionalidad real de Planner:

\* Registrar gasto.  
\* Crear tema.  
\* Check-in.  
\* Escanear documento.  
\* Subir archivo.  
\* Ver pendientes avanzado.  
\* Invitar miembro.  
\* Crear objetivo.  
\* Registrar inventario.  
\* Crear presupuesto.  
\* Preguntar a Geni.

\#\#\# Regla de fricción

Quick Actions debe servir para evitar entrar manualmente a Planner antes de crear. No debe abrir un menú largo de opciones irrelevantes.

\---

\#\# 9\. Planner principal / Overview

Hay tres posibilidades:

1\. Planner abre directamente en Tareas.  
2\. Planner abre en Overview.  
3\. Planner abre en la última tab usada.

\#\#\# Recomendación MVP

Planner debe abrir en \`Tareas\` por defecto.

Motivos:

\* Tasks es la acción más frecuente.  
\* El problema principal actual está en tareas.  
\* Facilita demo multi-dispositivo.  
\* Reduce complejidad de crear una pantalla Overview adicional.  
\* Home ya cumple rol de overview general.

\#\#\# Overview interno opcional

Si se decide usar Overview, debe ser muy compacto:

\* Pendientes.  
\* Hoy.  
\* Vencidas.  
\* Esperando verificación.  
\* Próximos eventos.  
\* CTA crear tarea.  
\* CTA crear evento.

\#\#\# Recomendación final

Para MVP actual:

\* Planner default: \`Tareas\`.  
\* Arriba de Tareas incluir mini resumen:

  \* pendientes;  
  \* hoy;  
  \* vencidas;  
  \* awaiting verification.  
\* Calendar como tab secundaria.  
\* Goals oculto o futuro.

\---

\#\# 10\. Tasks: modelo UX

Una task en el MVP es un compromiso operativo del hogar o personal dentro del hogar.

Puede ser:

\* tarea normal;  
\* tarea con fecha;  
\* tarea asignada;  
\* tarea sin responsable;  
\* tarea con prioridad;  
\* tarea con verificación;  
\* tarea vencida calculada;  
\* tarea completada;  
\* tarea verificada;  
\* tarea cancelada.

\#\#\# Campos visibles principales

En lista:

\* título;  
\* checkbox;  
\* responsabilidad/categoría;  
\* fecha;  
\* responsable;  
\* prioridad si no es normal/default;  
\* estado visual;  
\* badge de verificación si aplica.

En detalle:

\* título;  
\* descripción;  
\* responsabilidad;  
\* categoría;  
\* template si aplica;  
\* responsable;  
\* fecha;  
\* hora;  
\* prioridad;  
\* estado;  
\* requiere verificación;  
\* creada por si está disponible;  
\* completada por si está disponible;  
\* verificada por si está disponible.

\#\#\# Estados UX recomendados

Persistidos o recibidos desde backend:

\* \`pending\`  
\* \`completed\`  
\* \`awaiting\_verification\`  
\* \`verified\`  
\* \`cancelled\`

Calculado en frontend:

\* \`overdue\`, si no completada/cancelada/verificada y \`due\_date\` ya pasó.

\#\#\# Regla de vencida

\`Vencida\` no debe tratarse como status persistido. Es un estado visual calculado.

\#\#\# Regla de verificación

Si no requiere verificación:

\* completar → \`completed\`.

Si requiere verificación:

\* completar → \`awaiting\_verification\`.  
\* verificar → \`verified\`.

Si backend modela verificación con campos y no como status, el frontend puede derivar visualmente:

\* \`awaiting\_verification\` \= completada \+ requiere verificación \+ sin \`verified\_at\`.  
\* \`verified\` \= completada \+ requiere verificación \+ con \`verified\_at\`.

Pero para el MVP actual, la UI debe respetar el contrato real del backend actual.

\---

\#\# 11\. Tasks: lista ideal

\#\#\# Objetivo

La lista debe ser más clara que la actual, más visual y más parecida a una app terminada.

Debe permitir:

\* entender pendientes rápido;  
\* completar en 1 tap;  
\* ver responsable;  
\* ver fecha;  
\* ver responsabilidad;  
\* distinguir vencidas;  
\* distinguir tareas esperando verificación;  
\* abrir detalle sin confundir con completar.

\#\#\# Estructura recomendada

Arriba:

\* Header: \`Planner\`  
\* Tabs: \`Tareas | Calendario\`  
\* Mini resumen:

  \* Pendientes;  
  \* Hoy;  
  \* Vencidas;  
  \* Por verificar.  
\* Chips de filtro horizontales.

Lista:

\* Secciones agrupadas por default.  
\* Cards compactas.  
\* Empty state si no hay tareas.  
\* Pull-to-refresh.  
\* Skeleton al cargar.

\#\#\# Card de tarea ideal

Contenido:

\* Checkbox a la izquierda.  
\* Título.  
\* Chip de responsabilidad/categoría.  
\* Fecha o chip rápido:

  \* Hoy;  
  \* Mañana;  
  \* Vencida;  
  \* Sin fecha.  
\* Avatar/iniciales del responsable.  
\* Badge de estado si aplica:

  \* Espera verificación;  
  \* Verificada;  
  \* Cancelada.  
\* Prioridad si es alta.

Ejemplo visual conceptual:

\* \`\[checkbox\] Comprar leche y pan\`  
\* \`Compras · Hoy · Juan\`  
\* badge: \`Pendiente\`

\#\#\# Acciones de card

\* Tap en checkbox: completar.  
\* Tap en cuerpo: abrir detalle.  
\* Long press o menú: editar/cancelar.  
\* Swipe opcional solo si ya está implementado de forma consistente; no obligatorio.

\#\#\# Tareas completadas

Opciones:

\* Se muestran tachadas por unos segundos tras completar.  
\* Luego desaparecen de la lista principal.  
\* Se pueden consultar con chip \`Completadas\`.

Recomendación MVP:

\* Al completar, tachar y mover fuera de la lista principal tras refresh o animación breve.  
\* Mantener chip \`Completadas\`.

\#\#\# Tareas canceladas

Regla:

\* Ocultas por defecto.  
\* Accesibles solo si existe filtro avanzado o detalle/historial.  
\* No mezclarlas con pendientes.

\---

\#\# 12\. Tasks: filtros, chips y agrupación

\#\#\# Chips principales

Recomendados:

\* Todas.  
\* Mías.  
\* Familia.  
\* Hoy.  
\* Vencidas.  
\* Por verificar.  
\* Completadas.

\#\#\# Chips secundarios

\* Limpieza.  
\* Compras.  
\* Mascotas.  
\* Medicación.  
\* Estudios.  
\* Pagos.  
\* Vehículos.  
\* Finanzas.  
\* Otro.

\#\#\# Agrupación posible

Agrupar por:

\* Responsabilidad.  
\* Estado.  
\* Fecha.  
\* Responsable.

\#\#\# Recomendación default

Default para MVP:

\* Filtro inicial: \`Pendientes / activas\`.  
\* Agrupación: por fecha o atención.  
\* Orden:

  1\. Vencidas.  
  2\. Hoy.  
  3\. Próximas.  
  4\. Sin fecha.  
\* Dentro de cada grupo, mostrar responsabilidad como chip.

Alternativa si se busca enfatizar “responsabilidades”:

\* Agrupar por Responsabilidad:

  \* Limpieza;  
  \* Compras;  
  \* Mascotas;  
  \* etc.  
\* Dentro de cada grupo ordenar por vencimiento.

\#\#\# Recomendación final

Para que la lista se entienda mejor en demo:

\* Usar orden por urgencia como default.  
\* Permitir chip o toggle \`Agrupar: Responsabilidad\`.

Esto evita que la lista quede fragmentada si hay pocas tareas y a la vez mantiene responsabilidades como eje visual.

\---

\#\# 13\. Tasks: crear tarea ideal

\#\#\# Objetivo

Crear tarea debe ser rápido, claro y sin duplicación entre template, responsabilidad y categoría.

\#\#\# Entrada

Se puede abrir desde:

\* Quick Actions → Crear tarea.  
\* Planner/Tareas → \`+ Nueva tarea\`.  
\* Empty state → Crear tarea.  
\* Home → Crear tarea si existe acceso.

\#\#\# Formato recomendado

Bottom sheet de creación rápida.

Altura inicial:

\* 50–75% según campos visibles.  
\* No pantalla completa salvo edición avanzada.

\#\#\# Campos principales

Visibles al inicio:

1\. Responsabilidad/template.  
2\. Título.  
3\. Responsable.  
4\. Fecha rápida.  
5\. Prioridad.  
6\. Verificación.

\#\#\# Campos secundarios

Bajo “Más opciones”:

\* descripción;  
\* hora;  
\* fecha exacta;  
\* categoría libre si \`Otro\`;  
\* visibilidad si existe;  
\* notas.

\#\#\# Fecha rápida

Chips:

\* Hoy.  
\* Mañana.  
\* Esta semana.  
\* Sin fecha.  
\* Elegir fecha.

\#\#\# Prioridad

Opciones simples:

\* Normal.  
\* Alta.  
\* Baja.

Default:

\* Normal/medium.

\#\#\# Responsable

Opciones:

\* Sin asignar.  
\* Yo.  
\* Miembro activo 1\.  
\* Miembro activo 2\.  
\* etc.

Debe usar \`household\_members.id\` como valor real.

\#\#\# Verificación

Switch:

\* “Requiere verificación”.

Copy sugerido:

\* “Al completarla, quedará pendiente de revisión.”

\#\#\# Regla de título

Si el usuario elige un template:

\* se autocompleta título;  
\* se autocompleta \`template\_key\`;  
\* se autocompleta \`category\`.

Si el usuario edita manualmente el título:

\* no volver a pisarlo automáticamente al cambiar fecha/responsable.  
\* si cambia de template explícitamente, se puede preguntar o actualizar solo si el título no fue modificado.

\#\#\# Regla de categoría

\* No mostrar categoría como campo editable normal.  
\* Mostrarla como label derivado.  
\* Solo editar categoría si responsabilidad/template \= \`Otro\`.

\#\#\# CTA

Botón principal:

\* \`Crear tarea\`

Estados:

\* disabled si falta título;  
\* disabled si falta responsabilidad/template y no hay default;  
\* loading al guardar;  
\* success toast al crear;  
\* error inline si falla.

\#\#\# Validaciones frontend

\* Título requerido.  
\* Responsabilidad requerida salvo que backend permita default.  
\* Si responsabilidad \`Otro\`, categoría libre requerida o título suficiente según decisión.  
\* \`assigned\_to\_member\_id\` debe ser de miembro activo.  
\* No mandar \`household\_id\`.  
\* No mandar \`created\_by\_person\_id\`.  
\* No mandar \`completed\_by\_person\_id\`.  
\* No mandar \`verified\_by\_person\_id\`.

\---

\#\# 14\. Tasks: editar / detalle / cancelar

\#\#\# Detalle de tarea

Debe mostrar:

\* título;  
\* estado;  
\* responsabilidad/categoría;  
\* responsable;  
\* fecha/hora;  
\* prioridad;  
\* descripción si existe;  
\* verificación si aplica;  
\* acciones disponibles.

Acciones:

\* completar;  
\* verificar si aplica y permitido;  
\* editar;  
\* cancelar.

\#\#\# Editar tarea

Reglas:

\* Editar no cambia status.  
\* Cambiar título no cambia template automáticamente.  
\* Cambiar responsable no completa ni reinicia tarea.  
\* Cambiar fecha puede quitar estado visual vencida si corresponde.  
\* Cambiar prioridad solo cambia visual/priorización.  
\* Editar tarea completada debe ser posible solo si backend lo permite; si no, mostrar error claro.

\#\#\# Cancelar tarea

Reglas:

\* Cancelar no hard delete.  
\* Cancelar cambia estado a cancelada o endpoint equivalente.  
\* Pedir confirmación si es destructivo.  
\* Copy sugerido:

  \* “¿Cancelar esta tarea?”  
  \* “No se va a borrar definitivamente, pero dejará de aparecer como pendiente.”  
\* Canceladas se ocultan por defecto.  
\* No usar “Eliminar” si técnicamente es cancelar/soft-delete, salvo que el producto lo defina.

\#\#\# Completadas

Reglas:

\* Completadas no aparecen en pendientes.  
\* Se consultan desde chip \`Completadas\`.  
\* Pueden aparecer tachadas inmediatamente después de completar.

\---

\#\# 15\. Tasks: completar y verificar

\#\#\# Completar sin verificación

Flujo:

1\. Usuario toca checkbox.  
2\. UI marca completada inmediatamente.  
3\. Se envía request al backend.  
4\. Si éxito:

   \* mantener completada;  
   \* sacar de pendientes o tachar brevemente;  
   \* actualizar Home/summary.  
5\. Si error:

   \* revertir UI;  
   \* mostrar mensaje.

Estado final:

\* \`completed\`.

\#\#\# Completar con verificación

Flujo:

1\. Usuario toca checkbox.  
2\. UI marca como “Esperando verificación”.  
3\. Se envía request al backend.  
4\. Si éxito:

   \* estado visual \`awaiting\_verification\`;  
   \* badge “Por verificar”.  
5\. Si error:

   \* revertir UI;  
   \* mostrar error.

Estado final temporal:

\* \`awaiting\_verification\`.

\#\#\# Verificar

Flujo:

1\. Usuario autorizado abre tarea o lista de tareas por verificar.  
2\. Toca \`Verificar\`.  
3\. Backend valida permisos.  
4\. Si éxito:

   \* estado visual \`verified\`;  
   \* badge “Verificada”.  
5\. Si error:

   \* mostrar copy claro.

\#\#\# No permitir verificar propia completación

Si backend rechaza verificar una tarea completada por uno mismo:

\* no ocultar el error;  
\* mostrar:

  \* “No podés verificar una tarea que completaste vos.”  
\* mantener estado anterior.

\#\#\# Errores esperados

\* Tarea ya completada por otro usuario.  
\* No tenés permiso.  
\* La tarea no está completada.  
\* La tarea no requiere verificación.  
\* Error de conexión.

\#\#\# Copy sugerido

\* Success completar:

  \* “Tarea completada.”  
\* Success completar con verificación:

  \* “Tarea enviada a verificación.”  
\* Success verificar:

  \* “Tarea verificada.”  
\* Error doble completado:

  \* “Esta tarea ya fue completada.”  
\* Error permisos:

  \* “No tenés permiso para hacer esta acción.”  
\* Error red:

  \* “No se pudo actualizar. Intentá de nuevo.”

\---

\#\# 16\. Responsabilidades, templates y categorías

Esta sección define la lógica central del Planner MVP.

\#\#\# Responsabilidad

La responsabilidad es el agrupador operativo visible de tareas.

Ejemplos:

\* Limpieza.  
\* Compras.  
\* Mascotas.  
\* Medicación.  
\* Estudios.  
\* Pagos.  
\* Vehículos.  
\* Finanzas.  
\* Otro.

Uso UX:

\* Agrupar tareas.  
\* Filtrar tareas.  
\* Mostrar chips.  
\* Alimentar Home.  
\* Ordenar listas.  
\* Dar contexto familiar.

Uso técnico frontend:

\* Se representa como opción seleccionable.  
\* Puede mapear a constantes locales del MVP.  
\* Si backend actual requiere otro campo interno, el service debe adaptar.  
\* No debe convertirse en pantalla compleja de administración para MVP.

\#\#\# Template

El template es un atajo de creación rápida.

Ejemplos:

\* Limpieza → “Barrer y fregar”.  
\* Limpieza → “Limpiar cocina”.  
\* Compras → “Comprar leche y pan”.  
\* Mascotas → “Cuidar mascota”.  
\* Mascotas → “Dar de comer a la mascota”.  
\* Medicación → “Revisar medicación”.  
\* Estudios → “Organizar estudios”.  
\* Pagos → “Realizar pago”.  
\* Vehículos → “Revisar vehículo”.  
\* Finanzas → “Revisar gasto familiar”.  
\* Otro → título libre.

Uso UX:

\* Acelera creación.  
\* Sugiere título.  
\* Sugiere responsabilidad.  
\* Sugiere categoría visible.  
\* No es una entidad editable en MVP.

Uso técnico frontend:

\* \`template\_key\` constante.  
\* No usar tabla.  
\* No usar CRUD.  
\* No usar endpoints de templates.  
\* El frontend manda \`template\_key\` si el backend actual lo soporta.  
\* Si el backend no lo necesita, puede usarse solo para UI/categoría.

\#\#\# Categoría

En el MVP actual, \`category\` es el label visible autogenerado desde template/responsabilidad.

Regla:

\* Si se elige template/responsabilidad, se completa automáticamente \`template\_key\` y \`category\`.  
\* El usuario no edita categoría manualmente salvo que elija “Otro”.  
\* Si elige “Otro”, se habilita categoría libre.  
\* Si el usuario modifica el título, no volver a pisarlo automáticamente.  
\* Esto elimina duplicación y mejora velocidad.

\#\#\# Qué ve el usuario

El usuario no debería ver tres conceptos separados.

Debe ver algo simple como:

1\. “¿Qué tipo de tarea es?”

   \* Limpieza  
   \* Compras  
   \* Mascotas  
   \* etc.

2\. “Elegí una tarea rápida o escribí una propia”

   \* Barrer y fregar  
   \* Comprar leche y pan  
   \* Cuidar mascota  
   \* Otro

3\. “Título”

   \* autocompletado o manual.

\#\#\# Qué guarda/maneja frontend

Frontend puede manejar:

\* \`responsibility\_key\`  
\* \`template\_key\`  
\* \`category\`  
\* \`title\`  
\* \`assigned\_to\_member\_id\`  
\* \`due\_date\`  
\* \`due\_time\`  
\* \`priority\`  
\* \`requires\_verification\`

\#\#\# Qué manda al backend

Reglas obligatorias:

\* No mandar \`household\_id\`.  
\* No mandar \`created\_by\_person\_id\`.  
\* No mandar \`completed\_by\_person\_id\`.  
\* No mandar \`verified\_by\_person\_id\`.  
\* \`assigned\_to\_member\_id\` debe ser \`household\_members.id\`.  
\* Usar \`/api/planner\`.  
\* Usar Bearer token.  
\* Usar \`planner\_tasks\`.

Payload ideal de creación:

\* \`title\`  
\* \`description?\`  
\* \`template\_key?\`  
\* \`category\`  
\* \`assigned\_to\_member\_id?\`  
\* \`due\_date?\`  
\* \`due\_time?\`  
\* \`priority?\`  
\* \`requires\_verification?\`

Si el backend actual usa nombres distintos, el service frontend debe adaptar internamente, pero la UI no debe exponer esa complejidad.

\#\#\# Cómo se agrupa

Default visual:

\* por urgencia/fecha.

Agrupación alternativa:

\* por responsabilidad/categoría.

Home:

\* agrupa o resume por responsabilidad/categoría visible.  
\* Ejemplo:

  \* “2 tareas de Compras”  
  \* “1 tarea vencida de Limpieza”

\---

\#\# 17\. Calendar / Events: modelo UX

Un evento en el MVP es un compromiso con fecha/hora dentro del hogar activo.

Puede ser:

\* evento familiar;  
\* evento personal si backend lo soporta;  
\* evento con hora;  
\* evento all day;  
\* evento con ubicación;  
\* evento con descripción;  
\* evento cancelado;  
\* evento recurrente simple si backend actual lo soporta.

\#\#\# Campos principales

En lista/agenda:

\* título;  
\* fecha;  
\* hora inicio;  
\* hora fin si existe;  
\* all day;  
\* ubicación si existe;  
\* estado.

En detalle:

\* título;  
\* descripción;  
\* fecha;  
\* hora inicio;  
\* hora fin;  
\* all day;  
\* ubicación;  
\* recurrencia;  
\* creado por si existe;  
\* estado.

\#\#\# Estados

Recomendados:

\* \`scheduled\`  
\* \`cancelled\`

Opcional visual:

\* \`past\`, calculado si la fecha ya pasó.  
\* \`today\`, calculado si ocurre hoy.

\#\#\# Reglas

\* \`starts\_at\` requerido.  
\* \`ends\_at\` opcional.  
\* \`all\_day\` default false.  
\* \`recurrence\` default none.  
\* Cancelar no hard delete.  
\* Eventos cancelados no deben ensuciar la agenda principal.  
\* Eventos próximos deben verse en Home.  
\* Calendar debe ser claro incluso con pocos eventos.

\---

\#\# 18\. Calendar: visualización ideal

\#\#\# Objetivo

Calendar debe ser más claro, visual y útil en demo.

Debe responder:

\* qué hay hoy;  
\* qué viene esta semana;  
\* qué día tiene eventos;  
\* qué eventos corresponden al día seleccionado.

\#\#\# Recomendación default

Usar vista \`Mes \+ Agenda\`.

Estructura:

1\. Header de mes.  
2\. Calendario mensual compacto.  
3\. Dots por día con eventos.  
4\. Día seleccionado destacado.  
5\. Agenda debajo con eventos del día.  
6\. CTA \`+ Nuevo evento\`.

Motivos:

\* Es visualmente más premium.  
\* Se entiende rápido.  
\* Funciona bien para demo.  
\* Evita construir vistas día/semana complejas.  
\* Permite mostrar dots y agenda debajo.

\#\#\# Vistas

MVP recomendado:

\* Mes agenda como default.  
\* Día como vista secundaria si ya está simple de implementar.  
\* Semana solo si ya existe o es muy barata.

No hacer complejo:

\* drag & drop;  
\* timeline horario avanzado;  
\* recurrencias visuales complejas;  
\* conflictos automáticos;  
\* participantes avanzados.

\#\#\# Dots por día

Reglas:

\* Dot violeta para evento.  
\* Dot neutral o secundario para tarea con fecha si se decide mostrar tareas.  
\* Máximo 3 dots visibles.  
\* Si hay más, usar indicador \`+\`.

\#\#\# Agenda debajo

Card de evento:

\* Hora.  
\* Título.  
\* Ubicación.  
\* Badge all-day si aplica.  
\* Estado cancelado si aplica.

Card de tarea con fecha, si se muestra:

\* Checkbox.  
\* Título.  
\* Chip responsabilidad.  
\* Hora si existe.

\#\#\# Tareas en Calendar

Decisión recomendada:

\* Mostrar tareas con \`due\_date\` dentro de Calendar como elementos secundarios.  
\* Diferenciarlas visualmente de eventos.  
\* No mezclar si complica demasiado la demo.

Regla:

\* Calendar administra eventos, pero puede ayudar a visualizar tareas fechadas.  
\* La edición completa de tarea sigue en Tasks.

\---

\#\# 19\. Events: crear / editar / cancelar

\#\#\# Crear evento

Entrada:

\* Quick Actions → Crear evento.  
\* Calendar → \`+ Nuevo evento\`.  
\* Empty state → Crear evento.

Formato:

\* Bottom sheet.

Campos principales:

\* título;  
\* fecha;  
\* hora inicio;  
\* hora fin;  
\* all day;  
\* ubicación.

Campos secundarios:

\* descripción;  
\* recurrencia;  
\* visibilidad si existe;  
\* notas.

\#\#\# Validaciones

\* \`title\` requerido.  
\* \`starts\_at\` requerido.  
\* Si \`all\_day=false\`, hora inicio recomendada/requerida según backend.  
\* \`ends\_at\` opcional.  
\* Si \`ends\_at\` existe, no debe ser anterior a \`starts\_at\`.  
\* No mandar \`household\_id\`.  
\* Backend resuelve hogar activo.  
\* Backend resuelve \`created\_by\_person\_id\`.

\#\#\# Recurrencia

MVP:

\* default none.  
\* Si existe, usar simple:

  \* no repetir;  
  \* diaria;  
  \* semanal;  
  \* mensual.

Pero si el backend actual no está listo:

\* ocultar recurrencia.  
\* dejar POST-MVP.

\#\#\# Editar evento

Reglas:

\* Editar título/fecha/hora/ubicación no cambia estado.  
\* Cambiar fecha equivale a postergar.  
\* No existe estado “postergado”.  
\* Si evento cancelado no se puede editar, mostrar error claro.

\#\#\# Cancelar evento

Reglas:

\* Cancelar no hard delete.  
\* Pedir confirmación.  
\* Ocultar cancelados de agenda principal por defecto.  
\* Si se muestran, usar estilo atenuado.

Copy sugerido:

\* “¿Cancelar este evento?”  
\* “Dejará de aparecer como próximo evento.”

\#\#\# Eliminar evento

Para MVP, preferir lenguaje “Cancelar” antes que “Eliminar” si técnicamente es soft-delete/cancelled.

\---

\#\# 20\. Goals: tratamiento en MVP

Goals aparece en varios fragments como parte conceptual de Planner, pero no debe implementarse como funcionalidad real en el MVP actual salvo decisión posterior.

\#\#\# Opciones

1\. Ocultar Goals completamente.  
2\. Mostrar tab \`Metas\` disabled / próximamente.  
3\. Mostrar card visual futura en Planner/Home.

\#\#\# Recomendación MVP

Ocultar Goals o mostrarlo como \`Próximamente\` sin backend real.

Motivos:

\* Evita mezclar alcance.  
\* El MVP actual necesita cerrar Tasks \+ Events.  
\* Goals requiere modelo propio.  
\* Goals puede distraer de la demo multi-dispositivo.

\#\#\# Si se muestra visualmente

Reglas:

\* No permitir crear goal real.  
\* No llamar endpoints reales de Goals.  
\* No mezclar con tareas reales.  
\* Usar copy:

  \* “Metas familiares — Próximamente”  
\* No bloquear navegación de Planner.

\---

\#\# 21\. Home conectado a Planner

Home debe mostrar información real de Planner, pero no administrarla.

\#\#\# Secciones Home aplicables

\* Atención requerida.  
\* Próximos eventos.  
\* Tareas.  
\* Ver todo.  
\* Briefing simple/mock.  
\* Carga familiar mock si existe.

\#\#\# Atención requerida

Puede incluir:

\* tareas vencidas;  
\* tareas esperando verificación;  
\* evento próximo importante si aplica.

Copy sugerido:

\* “Tenés 2 tareas vencidas.”  
\* “Hay 1 tarea esperando verificación.”  
\* “Hoy hay 2 eventos.”

Acción:

\* Tocar abre Planner filtrado.

\#\#\# Próximos eventos

Mostrar:

\* próximos 2–3 eventos;  
\* fecha/hora;  
\* título;  
\* ubicación si existe.

CTA:

\* \`Ver calendario\`.

\#\#\# Tareas

Mostrar:

\* 3–5 tareas activas.  
\* Priorizar:

  1\. vencidas;  
  2\. hoy;  
  3\. asignadas al usuario;  
  4\. próximas.

CTA:

\* \`Ver tareas\`.

\#\#\# Home no debe hacer

\* No administrar todo Planner.  
\* No tener formulario completo.  
\* No exponer configuraciones.  
\* No mezclar mocks como si fueran reales sin claridad interna.  
\* No usar datos legacy.

\#\#\# Qué queda mock en Home

Puede quedar mock:

\* Briefing Geni.  
\* Carga familiar.  
\* Presence.  
\* Actividad familiar.  
\* Finance.  
\* Inventory.  
\* Assets.  
\* Goals.

Debe ser real:

\* tareas mostradas;  
\* eventos próximos;  
\* counts básicos si salen de Planner.

\---

\#\# 22\. Estados UX obligatorios

\#\#\# Loading

Usar:

\* skeleton de cards si tarda más de 300ms.  
\* spinner solo en botones/acciones.  
\* no pantalla blanca.

Copy opcional:

\* “Cargando Planner…”

\#\#\# Empty Tasks

Título:

\* “Acá van a aparecer tus tareas”

Descripción:

\* “Creá una tarea o asigná una responsabilidad para organizar el hogar.”

CTA:

\* “Crear tarea”

\#\#\# Empty Calendar

Título:

\* “Todavía no hay eventos”

Descripción:

\* “Agregá un evento familiar para verlo en el calendario.”

CTA:

\* “Crear evento”

\#\#\# Error general

Título:

\* “No se pudo cargar Planner”

Descripción:

\* “Revisá tu conexión e intentá de nuevo.”

CTA:

\* “Reintentar”

\#\#\# Error permisos

Copy:

\* “No tenés permiso para hacer esta acción.”

\#\#\# Error tarea ya completada

Copy:

\* “Esta tarea ya fue completada.”

Acción:

\* refrescar lista.

\#\#\# Error guardado

Copy:

\* “No se pudo guardar. Intentá de nuevo.”

\#\#\# Saving

Reglas:

\* botón mantiene ancho;  
\* texto cambia por spinner;  
\* campos principales pueden quedar disabled;  
\* evitar doble submit.

\#\#\# Success

Usar toast superior:

\* “Tarea creada.”  
\* “Tarea completada.”  
\* “Tarea enviada a verificación.”  
\* “Evento creado.”  
\* “Evento cancelado.”

\#\#\# Disabled submit

Deshabilitar si:

\* falta título;  
\* falta fecha requerida en evento;  
\* falta responsabilidad si es obligatoria;  
\* request en curso.

\#\#\# Retry

Debe existir en:

\* error inicial;  
\* error parcial de lista;  
\* error al refrescar.

\#\#\# Pull to refresh

Debe existir en:

\* Tasks.  
\* Calendar.  
\* Home si muestra Planner real.

\---

\#\# 23\. Performance percibida y experiencia 1-tap

\#\#\# Completar tarea

Debe sentirse instantáneo.

Reglas:

\* Optimistic UI permitido si se maneja rollback.  
\* Feedback visual menor a 100ms.  
\* Checkbox anima.  
\* Título se tacha.  
\* Si falla, revertir y mostrar error.  
\* No recargar toda la app.

\#\#\# Crear tarea/evento

Reglas:

\* Cerrar bottom sheet solo cuando backend responde success o hacer cierre optimista con recuperación clara.  
\* Mostrar loading en botón.  
\* Insertar nuevo item en lista.  
\* Refrescar summary/home si está montado.

\#\#\# Verificar/cancelar

Reglas:

\* Optimismo con cuidado.  
\* Si acción es sensible, esperar respuesta antes de cambiar definitivamente.  
\* Mostrar feedback.

\#\#\# Refresh multi-dispositivo

Para demo:

\* Pull-to-refresh visible.  
\* Refetch al volver a pantalla.  
\* Refetch al tocar tab activo.  
\* Si existe realtime, actualizar lista al recibir eventos.  
\* Si no existe realtime, refresh manual alcanza para demo si es confiable.

\#\#\# No recargar innecesariamente

Evitar:

\* limpiar toda pantalla ante cada acción;  
\* volver al login;  
\* reload global;  
\* perder filtros después de completar;  
\* cerrar sesión por error de Planner.

\#\#\# Skeleton parcial

Si se carga summary y lista por separado:

\* mostrar summary skeleton;  
\* mostrar lista skeleton;  
\* no bloquear toda la pantalla si una parte falla.

\#\#\# Formularios cortos

Principio:

\* la creación rápida debe pedir lo mínimo.  
\* “Más opciones” oculta detalles.

\---

\#\# 24\. Datos, services y contratos frontend

\#\#\# Regla técnica actual obligatoria

Planner frontend debe respetar:

\* Usar \`/api/planner\`.  
\* No usar Supabase directo para Planner.  
\* No usar legacy \`tasks\`, \`events\`, \`schedules\`.  
\* Usar \`planner\_tasks\`.  
\* Usar \`planner\_events\`.  
\* No enviar \`household\_id\` desde frontend.  
\* Backend resuelve \`active\_household\`.  
\* \`assigned\_to\_member\_id\` debe ser \`household\_members.id\`.  
\* \`created\_by\_person\_id\` lo resuelve backend.  
\* \`completed\_by\_person\_id\` lo resuelve backend.  
\* \`verified\_by\_person\_id\` lo resuelve backend.  
\* Templates son constantes, no tabla.  
\* Goals reales no son parte obligatoria del MVP actual.  
\* Home consume Planner vía summary o services Planner.  
\* Home no administra datos directamente.

\#\#\# Services frontend recomendados

Crear o consolidar services:

\* \`plannerTasks\`  
\* \`plannerEvents\`  
\* \`plannerCalendar\`  
\* \`plannerSummary\`  
\* \`plannerTemplates\`  
\* \`plannerMembers\` o usar service existente de household members

\#\#\# \`plannerTasks\`

Responsabilidades:

\* listar tareas;  
\* crear tarea;  
\* editar tarea;  
\* completar tarea;  
\* verificar tarea;  
\* cancelar tarea;  
\* obtener detalle si aplica.

Debe usar:

\* Bearer token.  
\* \`/api/planner\`.  
\* active household resuelto por backend.

No debe usar:

\* Supabase directo.  
\* tablas legacy.  
\* \`household\_id\` en payload.

\#\#\# \`plannerEvents\`

Responsabilidades:

\* listar eventos por rango;  
\* crear evento;  
\* editar evento;  
\* cancelar evento;  
\* obtener detalle si aplica.

Debe usar:

\* Bearer token.  
\* \`/api/planner\`.  
\* \`starts\_at\`.  
\* \`ends\_at\`.  
\* \`all\_day\`.

\#\#\# \`plannerCalendar\`

Responsabilidades:

\* construir vista calendario;  
\* pedir eventos por rango;  
\* opcionalmente pedir tareas con fecha;  
\* normalizar items para UI:

  \* event item;  
  \* task item.

No debe ser dueño de datos.

\#\#\# \`plannerSummary\`

Responsabilidades:

\* proveer datos a Home:

  \* tareas pendientes;  
  \* vencidas;  
  \* por verificar;  
  \* próximas tareas;  
  \* próximos eventos.  
\* Si existe endpoint summary, usarlo.  
\* Si no existe, componer desde tasks/events.

\#\#\# \`plannerTemplates\`

Responsabilidades:

\* exponer constantes locales.  
\* mapear responsabilidad → templates.  
\* mapear template → título/category/defaults.

No debe:

\* llamar API de templates;  
\* persistir templates;  
\* permitir CRUD.

\#\#\# Modelo frontend de Task

Campos mínimos esperados:

\* \`id\`  
\* \`title\`  
\* \`description?\`  
\* \`status\`  
\* \`category\`  
\* \`template\_key?\`  
\* \`assigned\_to\_member\_id?\`  
\* \`assigned\_member?\`  
\* \`due\_date?\`  
\* \`due\_time?\`  
\* \`priority?\`  
\* \`requires\_verification?\`  
\* \`completed\_at?\`  
\* \`verified\_at?\`  
\* \`created\_at\`  
\* \`updated\_at\`

\#\#\# Modelo frontend de Event

Campos mínimos esperados:

\* \`id\`  
\* \`title\`  
\* \`description?\`  
\* \`status\`  
\* \`starts\_at\`  
\* \`ends\_at?\`  
\* \`all\_day?\`  
\* \`location\_name?\`  
\* \`location\_address?\`  
\* \`recurrence?\`  
\* \`created\_at\`  
\* \`updated\_at\`

\#\#\# Normalización

Los services deben adaptar cualquier diferencia backend/UI.

Ejemplo:

\* backend puede devolver snake\_case;  
\* UI puede usar objetos normalizados;  
\* no exponer detalles técnicos en componentes.

\#\#\# Errores

Formato esperado ideal:

\* \`error\`  
\* \`code\`  
\* \`field?\`  
\* \`details?\`

La UI debe mapear códigos a mensajes simples.

\#\#\# Paginación

Si existe \`next\_cursor\`:

\* soportar carga adicional;  
\* no es prioridad si las listas MVP son cortas.

\#\#\# Seguridad frontend

El frontend no decide hogar por ID.

El frontend no debe construir queries directas a tablas.

El frontend no debe confiar en datos locales para permisos.

El backend decide:

\* hogar activo;  
\* persona actual;  
\* membership actual;  
\* permisos;  
\* created\_by;  
\* completed\_by;  
\* verified\_by.

\---

\#\# 25\. Miembros y asignación

\#\#\# Regla técnica

\`assigned\_to\_member\_id\` debe ser \`household\_members.id\`, no \`people.id\`, no \`auth.users.id\`.

\#\#\# Selector de responsable

Debe mostrar:

\* nombre;  
\* iniciales/avatar;  
\* rol si ayuda;  
\* estado activo si existe;  
\* opción “Yo”;  
\* opción “Sin asignar” si backend permite.

Debe filtrar:

\* miembros activos.

No debe mostrar:

\* miembros pending;  
\* miembros suspended;  
\* miembros finalized;  
\* usuarios de otros hogares.

\#\#\# Fallbacks

Si no hay miembros cargados:

\* permitir crear sin responsable si backend lo permite.  
\* mostrar:

  \* “Podés asignarla más tarde.”

Si hay error cargando miembros:

\* no bloquear toda la creación.  
\* mostrar selector en error parcial.  
\* permitir retry.

Si responsable fue removido o no disponible:

\* mostrar “Sin responsable” o “Miembro no disponible”.

\#\#\# Avatares/iniciales

Reglas:

\* si hay avatar, mostrar avatar.  
\* si no, mostrar iniciales.  
\* si no hay nombre, mostrar “Miembro”.  
\* accesibilidad:

  \* label con nombre.

\#\#\# Asignación en Home

Home puede mostrar:

\* “Para vos”  
\* nombre del responsable  
\* iniciales.

No debe saturar.

\---

\#\# 26\. Patrones visuales reutilizables del Figma

\#\#\# Aplicable ahora a Planner

Usar ahora:

\* fondo claro premium;  
\* cards redondeadas;  
\* tabs internas;  
\* chips horizontales;  
\* botón central \`+\`;  
\* bottom sheets;  
\* list items con leading checkbox;  
\* badges de estado;  
\* avatares/iniciales;  
\* skeleton cards;  
\* toast superior;  
\* empty states con CTA;  
\* CTA principal visible;  
\* separadores sutiles;  
\* jerarquía Atención → Acción → Contexto.

\#\#\# Aplicable a Home Planner cards

Usar en Home:

\* card de Atención requerida;  
\* card de Tareas;  
\* card de Próximos eventos;  
\* CTA “Ver todo”;  
\* chips o badges suaves;  
\* máximo 3–5 items reales;  
\* mock visual solo para secciones no Planner.

\#\#\# Referencia visual futura

Puede inspirar más adelante:

\* Goals con progress bar.  
\* Carga familiar.  
\* Briefing inteligente.  
\* Timeline de tarea.  
\* Geni suggestions.  
\* Search global.  
\* Presence.  
\* Family activity.  
\* Tablet layout.  
\* Desktop sidebar.

\#\#\# No implementar ahora

No construir para Planner MVP:

\* pantallas completas de Finance;  
\* Inventory real;  
\* Assets real;  
\* SOS real;  
\* Presence GPS;  
\* Feed real;  
\* Geni Chat real;  
\* Goals reales;  
\* timeline avanzado;  
\* comentarios;  
\* adjuntos;  
\* subtareas;  
\* dependencias.

\---

\#\# 27\. Reglas funcionales finales

1\. Home resume; Planner administra.  
2\. Planner usa \`/api/planner\`.  
3\. Planner no usa Supabase directo.  
4\. Planner no usa legacy \`tasks\`, \`events\`, \`schedules\`.  
5\. Planner usa \`planner\_tasks\` y \`planner\_events\` vía backend.  
6\. Frontend no envía \`household\_id\`.  
7\. Backend resuelve \`active\_household\`.  
8\. \`assigned\_to\_member\_id\` debe ser \`household\_members.id\`.  
9\. Backend resuelve creador, completador y verificador.  
10\. Templates son constantes locales.  
11\. No hay CRUD de templates en MVP.  
12\. Categoría se autogenera desde responsabilidad/template.  
13\. Categoría solo se edita si se elige \`Otro\`.  
14\. No duplicar template \+ categoría \+ responsabilidad como campos independientes visibles.  
15\. Crear tarea común no exige descripción.  
16\. Crear evento común no exige descripción.  
17\. Completar tarea debe ser 1 tap.  
18\. Completar tarea no debe exigir abrir detalle.  
19\. Tarea vencida es estado visual calculado.  
20\. Tareas canceladas se ocultan por defecto.  
21\. Tareas completadas se consultan desde chip separado.  
22\. Si requiere verificación, completar no equivale a verificada.  
23\. Verificar requiere acción separada.  
24\. No permitir verificar si backend lo rechaza.  
25\. Calendar muestra eventos reales.  
26\. Calendar puede mostrar tareas con fecha si se decide.  
27\. Events requieren \`starts\_at\`.  
28\. \`ends\_at\` es opcional.  
29\. Recurrencia default none.  
30\. Cancelar evento no hard delete.  
31\. Quick Actions debe abrir creación real de tarea/evento.  
32\. Home debe mostrar tareas/eventos reales desde Planner.  
33\. Home no debe usar datos legacy para Planner.  
34\. Empty states deben guiar a crear.  
35\. Loading debe usar skeleton.  
36\. Saving debe bloquear doble submit.  
37\. Errores deben ser accionables.  
38\. Pull-to-refresh debe existir para demo.  
39\. No meter POST-MVP en implementación actual.  
40\. No refactor global salvo necesidad directa.  
41\. No implementar Geni real.  
42\. No implementar Goals reales.  
43\. No implementar comentarios/adjuntos/subtareas/dependencias.  
44\. No implementar Finance/Inventory/Assets/Presence reales desde Planner.  
45\. La experiencia debe funcionar con un solo usuario.  
46\. La experiencia debe funcionar en demo con dos usuarios del mismo hogar.  
47\. Otro usuario debe poder ver cambios mediante refresh o realtime simple.  
48\. La UI debe ser mobile-first.  
49\. La UI debe verse más premium y alineada con Figma.  
50\. El tono debe ser neutral, claro y no acusatorio.

\---

\#\# 28\. Contradicciones detectadas

\#\#\# 1\. Goals como parte de Planner vs MVP actual sin Goals reales

Contradicción:

\* Varios fragments ubican Goals dentro de Planner.  
\* El MVP actual no debe implementar Goals reales.

Resolución MVP:

\* Ocultar Goals o mostrar \`Próximamente\`.  
\* No crear backend ni services reales de Goals.  
\* No bloquear Tasks/Calendar por Goals.

Requiere validación usuario:

\* Sí: decidir si tab Metas se oculta o queda visible como futura.

\---

\#\#\# 2\. Design System original usa terracota/salvia vs prompt pide violeta como principal

Contradicción:

\* Design System habla de paleta tierra cálida, primario terracota.  
\* Este prompt exige violeta como color principal en arquitectura visual.

Resolución MVP:

\* Usar violeta como color operativo de Planner.  
\* Mantener superficies claras/cálidas si ya existen.  
\* No mezclar demasiados colores.  
\* Usar semánticos para success/warning/error.

Requiere validación usuario:

\* Sí, si se quiere respetar 100% el Design System original o actualizar Planner al violeta.

\---

\#\#\# 3\. Responsabilidades como entidad CRUD vs responsabilidades/templates constantes

Contradicción:

\* Algunos fragments/API hablan de Responsibilities con endpoints/CRUD.  
\* La regla técnica actual pide templates constantes y resolver categoría desde responsabilidad/template.  
\* El MVP actual busca baja fricción, no CRUD de responsabilidades.

Resolución MVP:

\* Usar responsabilidades como catálogo constante visual.  
\* No construir pantalla CRUD.  
\* Si backend actual tiene otra forma, adaptar en service.  
\* Mantener \`Otro\` para flexibilidad.

Requiere validación usuario:

\* Parcial: definir catálogo inicial final.

\---

\#\#\# 4\. Templates CRUD vs templates constantes

Contradicción:

\* Documento API menciona Task Templates CRUD.  
\* Regla actual: templates son constantes, no tabla.

Resolución MVP:

\* No usar endpoints de templates.  
\* Definir templates locales.  
\* Enviar \`template\_key\` solo si backend actual lo soporta.  
\* Usar template para autocompletar título/category.

Requiere validación usuario:

\* No para MVP si se acepta la regla actual.

\---

\#\#\# 5\. Estados de Task antiguos vs estados MVP actuales

Contradicción:

\* Algunos fragments mencionan \`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\`.  
\* El MVP actual pide \`pending\`, \`completed\`, \`awaiting\_verification\`, \`verified\`.  
\* Además, vencida es calculada.

Resolución MVP:

\* Usar los estados reales del backend actual.  
\* En UI mostrar:

  \* pendiente;  
  \* completada;  
  \* esperando verificación;  
  \* verificada;  
  \* cancelada;  
  \* vencida calculada.  
\* No mostrar \`in\_progress\` salvo que backend ya lo use y sea necesario.

Requiere validación usuario:

\* Sí: confirmar estados exactos del backend actual antes de Codex.

\---

\#\#\# 6\. Verificación como estado separado vs verificación derivada

Contradicción:

\* Algunos fragments dicen que verificación no crea estado separado.  
\* El MVP actual pide \`awaiting\_verification\` y \`verified\`.

Resolución MVP:

\* UI debe mostrar esos estados.  
\* Service puede derivarlos si backend usa campos como \`requires\_verification\` / \`verified\_at\`.  
\* No inventar payload incompatible.

Requiere validación usuario:

\* Sí: confirmar contrato actual.

\---

\#\#\# 7\. Calendar avanzado vs Calendar MVP simple

Contradicción:

\* Algunos fragments mencionan recurrencia, participantes, conflictos, notificaciones.  
\* MVP actual requiere calendar claro, no avanzado.

Resolución MVP:

\* Mes \+ agenda.  
\* Crear/editar/cancelar evento.  
\* Recurrencia none o simple si ya existe.  
\* Sin participantes avanzados.  
\* Sin conflictos Geni.

Requiere validación usuario:

\* Sí: decidir default Calendar.

\---

\#\#\# 8\. Home con Briefing/Geni/Carga Familiar vs Home real mínimo

Contradicción:

\* Home ideal incluye Briefing, Carga Familiar, Presence, Activity, etc.  
\* MVP actual necesita Home conectado a Planner real.

Resolución MVP:

\* Home muestra tareas/eventos reales.  
\* Briefing/Carga/Presence pueden quedar mock.  
\* Home no administra Planner.

Requiere validación usuario:

\* No para MVP, salvo decidir cantidad de tareas/eventos visibles.

\---

\#\#\# 9\. API fragment habla de \`household\_id\` explícito vs regla técnica actual dice no enviarlo

Contradicción:

\* Fragments antiguos/API pueden hablar de operar con \`:hid\` o \`household\_id\`.  
\* Regla técnica actual: frontend no manda \`household\_id\`; backend resuelve active household.

Resolución MVP:

\* Respetar regla técnica actual.  
\* Services usan \`/api/planner\`.  
\* Backend resuelve hogar activo.

Requiere validación usuario:

\* No, está definido como verdad técnica actual.

\---

\#\#\# 10\. Quick Actions con muchas acciones vs MVP solo tarea/evento

Contradicción:

\* Fragments muestran Quick Actions amplio.  
\* MVP Planner solo necesita crear tarea/evento.

Resolución MVP:

\* Implementar reales:

  \* Crear tarea;  
  \* Crear evento.  
\* Resto mock/futuro si aparece visualmente.

Requiere validación usuario:

\* No, salvo ordenar acciones visuales.

\---

\#\# 29\. Decisiones abiertas para el usuario

1\. ¿Planner abre en \`Tareas\` o en \`Overview\`?  
2\. ¿Se oculta \`Metas\` o aparece como tab “Próximamente”?  
3\. ¿Crear tarea se hace en bottom sheet o pantalla completa?  
4\. ¿Crear evento se hace en bottom sheet o pantalla completa?  
5\. ¿Cuáles responsabilidades iniciales quedan definitivas?  
6\. ¿Se permite \`Otro\` en MVP?  
7\. ¿Las completadas se ocultan automáticamente o quedan tachadas en la lista?  
8\. ¿Home muestra 3 o 5 tareas?  
9\. ¿Calendar default es Mes \+ Agenda o Día?  
10\. ¿Calendar muestra tareas con fecha o solo eventos?  
11\. ¿Prioridad tendrá Baja/Normal/Alta o solo Alta/Normal?  
12\. ¿Se muestra responsable obligatorio u opcional?  
13\. ¿Verificación estará visible para todas las tareas o solo en “Más opciones”?  
14\. ¿Violeta reemplaza al primario del Design System o solo aplica a Planner?  
15\. ¿Quick Actions muestra acciones mock o solo reales?  
16\. ¿Tareas canceladas tienen filtro visible o quedan totalmente ocultas?  
17\. ¿Eventos cancelados se ocultan o aparecen atenuados?  
18\. ¿Home tendrá Briefing mock o solo cards reales simples?  
19\. ¿La demo necesita realtime o alcanza pull-to-refresh?  
20\. ¿Se usa \`template\_key\` real en backend o solo como metadata UI?

\---

\#\# 30\. Criterio DONE

Planner MVP se considera terminado cuando:

\#\#\# Visual / UX

\* Planner se ve alineado visualmente con HomePlus/Figma.  
\* El diseño no se siente genérico ni feo.  
\* Hay cards redondeadas, chips, badges y jerarquía clara.  
\* Crear tarea tiene baja fricción.  
\* Completar tarea es 1 tap.  
\* Calendar es claro.  
\* Empty/loading/error/success están diseñados.  
\* Quick Actions abre creación real.  
\* Home muestra Planner de forma clara.

\#\#\# Tasks

\* Se listan tareas reales.  
\* Se crean tareas reales.  
\* Se editan tareas reales si está en scope.  
\* Se completan tareas reales.  
\* Se verifican tareas si está en scope.  
\* Se cancelan tareas sin hard delete.  
\* Se muestran estados correctos.  
\* Se muestran vencidas como calculado.  
\* Se muestran responsables.  
\* Se muestran categorías/responsabilidades.  
\* No hay duplicación template/categoría/responsabilidad.

\#\#\# Events / Calendar

\* Se listan eventos reales.  
\* Se crean eventos reales.  
\* Se editan eventos si está en scope.  
\* Se cancelan eventos.  
\* Calendar muestra eventos por fecha.  
\* Home muestra próximos eventos reales.  
\* No se implementa recurrencia compleja si no está lista.

\#\#\# Home

\* Home consume Planner real.  
\* Home no usa legacy.  
\* Home no administra Planner.  
\* Tocar cards navega a Planner/Calendar.  
\* Tareas/eventos se actualizan con refresh.

\#\#\# Técnico

\* Usa \`/api/planner\`.  
\* Usa Bearer token.  
\* No usa Supabase directo.  
\* No usa legacy \`tasks\`, \`events\`, \`schedules\`.  
\* No manda \`household\_id\`.  
\* Backend resuelve active household.  
\* \`assigned\_to\_member\_id\` usa \`household\_members.id\`.  
\* Templates son constantes.  
\* Goals reales no se implementan.  
\* Services están separados y claros.  
\* Errores están manejados.  
\* Multi-dispositivo demo funciona con refresh o realtime.

\---

\#\# 31\. Checklist previo a Codex

Antes de convertir esta spec en prompt de implementación, revisar:

\#\#\# Decisiones

\* \[ \] Planner abre en Tareas u Overview.  
\* \[ \] Goals oculto o próximamente.  
\* \[ \] Crear tarea: bottom sheet o pantalla.  
\* \[ \] Crear evento: bottom sheet o pantalla.  
\* \[ \] Responsabilidades finales.  
\* \[ \] Templates finales.  
\* \[ \] Home muestra 3 o 5 tareas.  
\* \[ \] Calendar muestra tareas con fecha o no.  
\* \[ \] Mes agenda o día como default.  
\* \[ \] Violeta como primario confirmado.

\#\#\# Alcance

\* \[ \] Tasks reales.  
\* \[ \] Events reales.  
\* \[ \] Calendar real simple.  
\* \[ \] Home conectado.  
\* \[ \] Quick Actions reales.  
\* \[ \] Estados UX.  
\* \[ \] Sin Goals reales.  
\* \[ \] Sin Geni real.  
\* \[ \] Sin comentarios/adjuntos/subtareas/dependencias.  
\* \[ \] Sin refactor global.

\#\#\# Técnico

\* \[ \] Confirmar endpoints actuales bajo \`/api/planner\`.  
\* \[ \] Confirmar shape de \`planner\_tasks\`.  
\* \[ \] Confirmar shape de \`planner\_events\`.  
\* \[ \] Confirmar status reales de task.  
\* \[ \] Confirmar status reales de event.  
\* \[ \] Confirmar endpoint de completar.  
\* \[ \] Confirmar endpoint de verificar.  
\* \[ \] Confirmar endpoint de cancelar.  
\* \[ \] Confirmar si existe summary.  
\* \[ \] Confirmar cómo obtener members activos.  
\* \[ \] Confirmar que \`assigned\_to\_member\_id\` es \`household\_members.id\`.  
\* \[ \] Confirmar que frontend no manda \`household\_id\`.

\#\#\# Frontend

\* \[ \] Identificar pantallas actuales de Planner.  
\* \[ \] Identificar Home actual a tocar.  
\* \[ \] Identificar Quick Actions actual.  
\* \[ \] Identificar services actuales.  
\* \[ \] Identificar tipos actuales.  
\* \[ \] Identificar navegación actual.  
\* \[ \] Definir archivos a tocar.  
\* \[ \] Definir qué componentes reutilizar.  
\* \[ \] Definir qué legacy ignorar.

\#\#\# QA demo

\* \[ \] Usuario A crea tarea.  
\* \[ \] Usuario B ve tarea tras refresh.  
\* \[ \] Usuario B completa tarea.  
\* \[ \] Usuario A ve completada tras refresh.  
\* \[ \] Usuario A crea evento.  
\* \[ \] Usuario B ve evento.  
\* \[ \] Home muestra tarea/evento real.  
\* \[ \] No aparece data de otro hogar.  
\* \[ \] No se rompe sesión.  
\* \[ \] Empty states funcionan.

\---

\#\# 32\. Anexo: material POST-MVP útil

\#\#\# Goals reales

Futuro:

\* Goals personales/familiares.  
\* Hitos.  
\* Progreso.  
\* Relación Goal → Tasks.  
\* Cards en Home.  
\* Progress bars.  
\* Estados activa/completada/fallida.

\#\#\# Subtareas

Futuro:

\* Checklist dentro de task.  
\* Un solo nivel.  
\* Progreso calculado.  
\* No para MVP actual.

\#\#\# Comentarios

Futuro:

\* Comentarios por task.  
\* Menciones.  
\* Historial conversacional.  
\* No para MVP actual.

\#\#\# Adjuntos

Futuro:

\* Imagen.  
\* PDF.  
\* Audio.  
\* Evidencia de tarea.  
\* Storage real.  
\* No para MVP actual.

\#\#\# Dependencias

Futuro:

\* Task bloqueada por otra.  
\* Prevención de dependencia circular.  
\* Estado blocked.  
\* No para MVP actual.

\#\#\# Geni

Futuro:

\* Sugerencias de tareas.  
\* Reorganización.  
\* Briefing real.  
\* Alertas por patrones.  
\* Conflictos de calendario.  
\* Search en Planner.  
\* No para MVP actual.

\#\#\# Automatizaciones

Futuro:

\* Crear tareas desde eventos.  
\* Crear tareas desde inventory/assets.  
\* Recordatorios automáticos.  
\* Reglas del hogar.  
\* No para MVP actual.

\#\#\# Finance links

Futuro:

\* Pagos relacionados a tareas.  
\* Presupuestos.  
\* Gastos del hogar.  
\* Goals financieros.  
\* No para MVP actual.

\#\#\# Inventory links

Futuro:

\* Tareas generadas por stock bajo.  
\* Medicación.  
\* Compras cerca.  
\* No para MVP actual.

\#\#\# Assets links

Futuro:

\* Mantenimiento de vehículo.  
\* Reparaciones.  
\* Garantías.  
\* Tareas generadas por assets.  
\* No para MVP actual.

\#\#\# Presence advanced

Futuro:

\* Presencia real.  
\* GPS.  
\* Check-ins.  
\* Geocercas.  
\* Recordatorios contextuales.  
\* No para MVP actual.

\#\#\# Notificaciones reales

Futuro:

\* Push al asignar tarea.  
\* Push al vencer.  
\* Push por evento próximo.  
\* Push por verificación.  
\* No para MVP actual.

\#\#\# Auditoría visual avanzada

Futuro:

\* Timeline de cambios.  
\* Quién editó.  
\* Quién reasignó.  
\* Quién completó.  
\* Quién verificó.  
\* No para MVP actual.

