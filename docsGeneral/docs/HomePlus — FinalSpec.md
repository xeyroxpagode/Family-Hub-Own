\# \*\*01. VISIÓN\*\* {\#visión}

\#\# \*\*01.01 Propósito\*\* {\#propósito}

HomePlus es una plataforma integral de coordinación familiar diseñada para centralizar la organización, planificación, comunicación, memoria y operación diaria de uno o más hogares.

El objetivo principal de HomePlus es reducir la carga mental de las personas mediante herramientas que permitan coordinar responsabilidades, administrar recursos, registrar información importante y automatizar tareas repetitivas.

HomePlus no busca ser únicamente una aplicación de tareas, un calendario o una herramienta financiera.

HomePlus busca convertirse en el sistema operativo del hogar.

\#\# \*\*01.02 Problema que resuelve\*\* {\#problema-que-resuelve}

Las familias modernas administran información distribuida en múltiples herramientas:

\- Calendarios

\- Aplicaciones de tareas

\- Chats

\- Notas

\- Documentos

\- Fotos

\- Recordatorios

\- Finanzas

\- Inventarios

\- Ubicaciones

Esta fragmentación genera:

\- Falta de coordinación

\- Olvido de tareas importantes

\- Pérdida de información

\- Duplicación de trabajo

\- Conflictos organizativos

\- Sobrecarga mental

HomePlus unifica toda esta información en un único ecosistema.

\#\# \*\*01.03 Filosofía del producto\*\* {\#filosofía-del-producto}

HomePlus está construido sobre una filosofía de coordinación.

No busca controlar personas.

No busca vigilar personas.

No busca reemplazar relaciones familiares.

Busca facilitar la coordinación entre personas que comparten responsabilidades.

\#\# \*\*01.04 Rol de Geni\*\* {\#rol-de-geni}

Geni es el asistente inteligente nativo de HomePlus.

No es un chatbot agregado al sistema.

Es una capa transversal integrada en todo el producto.

Geni puede:

\- Entender contexto familiar

\- Ayudar a organizar tareas

\- Analizar hábitos

\- Generar recomendaciones

\- Coordinar información entre módulos

\- Crear automatizaciones

\- Elaborar briefings

\- Responder preguntas sobre el hogar

Siempre respetando permisos y privacidad.

\#\# \*\*01.05 Alcance\*\* {\#alcance}

HomePlus cubre:

\- Personas

\- Tareas

\- Eventos

\- Metas

\- Responsabilidades

\- Finanzas

\- Presencia

\- Inventario

\- Activos

\- Documentación

\- Recuerdos

\- Automatizaciones

\- Comunicación

\- Coordinación

Todo dentro de un mismo ecosistema.

\#\# \*\*01.06 Principio fundamental\*\* {\#principio-fundamental}

Toda funcionalidad nueva debe responder al menos una de estas preguntas:

\- ¿Ayuda a coordinar?

\- ¿Reduce carga mental?

\- ¿Evita perder información?

\- ¿Mejora la organización?

\- ¿Permite automatizar trabajo repetitivo?

Si la respuesta es no, la funcionalidad no pertenece a HomePlus.

\# \*\*02. PRINCIPIOS\*\* {\#principios}

\#\# \*\*02.01 Privacidad primero\*\* {\#privacidad-primero}

La privacidad individual tiene prioridad sobre la conveniencia.

La información privada pertenece a quien la genera.

\#\# \*\*02.02 Propiedad de los datos\*\* {\#propiedad-de-los-datos}

Los datos pertenecen a los usuarios.

HomePlus administra la información.

No la posee.

\#\# \*\*02.03 Coordinación por encima de jerarquía\*\* {\#coordinación-por-encima-de-jerarquía}

HomePlus no está diseñado como una estructura autoritaria.

La coordinación tiene prioridad sobre el control.

Los Coordinadores administran el hogar.

No administran la vida privada de las personas.

\#\# \*\*02.04 Transparencia operativa\*\* {\#transparencia-operativa}

Las acciones que afectan al hogar deben ser visibles.

Los cambios relevantes deben quedar registrados.

\#\# \*\*02.05 Auditoría permanente\*\* {\#auditoría-permanente}

Las acciones importantes generan trazabilidad.

El sistema debe poder responder:

\- Quién hizo algo

\- Cuándo ocurrió

\- Qué cambió

\#\# \*\*02.06 Configuración mínima\*\* {\#configuración-mínima}

La complejidad debe resolverse mediante diseño y automatización.

No trasladando configuraciones complejas al usuario.

\#\# \*\*02.07 Automatización asistida\*\* {\#automatización-asistida}

Las automatizaciones deben ayudar.

No reemplazar decisiones humanas críticas.

\#\# \*\*02.08 IA explicable\*\* {\#ia-explicable}

Cuando Geni realiza una recomendación importante debe poder explicar el contexto utilizado.

\#\# \*\*02.09 Multi-hogar real\*\* {\#multi-hogar-real}

Un usuario puede pertenecer a múltiples hogares.

Cada hogar funciona como una entidad independiente.

\#\# \*\*02.10 Ecosistema integrado\*\* {\#ecosistema-integrado}

Los módulos no deben comportarse como aplicaciones separadas.

Todos los dominios deben poder relacionarse entre sí.

Ejemplos:

\- Tareas relacionadas con activos

\- Gastos relacionados con metas

\- Documentos relacionados con vehículos

\- Eventos relacionados con personas

\#\# \*\*02.11 Simplicidad visual\*\* {\#simplicidad-visual}

La complejidad interna del sistema no debe reflejarse en la interfaz.

La experiencia debe mantenerse simple independientemente de la cantidad de módulos.

\#\# \*\*02.12 Home como centro operativo\*\* {\#home-como-centro-operativo}

Home debe resumir información.

No administrar información.

La administración siempre ocurre dentro del módulo correspondiente.

\# \*\*03. ARQUITECTURA CONCEPTUAL\*\* {\#arquitectura-conceptual}

\#\# \*\*03.01 Estructura general\*\* {\#estructura-general}

HomePlus se organiza en dominios.

Cada dominio posee:

\- Entidades

\- Reglas

\- Permisos

\- Estados

\- Eventos

Todos los dominios comparten:

\- Personas

\- Roles

\- Permisos

\- Auditoría

\- Geni

\#\# \*\*03.02 Dominios oficiales\*\* {\#dominios-oficiales}

\#\#\# \*\*People\*\*

Coordinación humana. Contiene: Feed, Presence y Personas como sub-secciones.

\#\#\# \*\*Planner\*\*

Administración de:

\- Tasks (con Responsabilidades como eje organizador interno)

\- Calendar

\- Goals

\#\#\# \*\*Finance\*\*

Administración financiera.

\#\#\# \*\*Presence\*\*

Ubicación, disponibilidad y coordinación de movimientos.

Nota: GPS desaparece como dominio o nombre visible. Todo lo relacionado a ubicación se llama Presence.

\#\#\# \*\*Inventory\*\*

Consumibles y stock.

\#\#\# \*\*Assets\*\*

Activos importantes del hogar.

\#\#\# \*\*HomeCloud\*\*

Memoria documental y emocional de la familia. Organizada por álbumes, recuerdos y eventos, no por carpetas técnicas.

\#\#\# \*\*SOS\*\*

Emergencias.

\#\#\# \*\*Geni\*\*

Capa de inteligencia transversal. No es un módulo aislado ni tiene tab dedicado en navegación principal.

\#\#\# \*\*Automatizaciones\*\*

Automatización basada en eventos.

\#\# \*\*03.03 Entidades transversales\*\* {\#entidades-transversales}

Existen entidades que pueden relacionarse con cualquier dominio.

Ejemplos:

\#\#\# \*\*Persona\*\*

Puede relacionarse con:

\- Tareas

\- Gastos

\- Eventos

\- Documentos

\- Activos

\#\#\# \*\*Responsabilidad\*\*

Puede relacionarse con:

\- Tareas

\- Gastos

\- Inventario

\- Automatizaciones

\#\#\# \*\*Goal\*\*

Puede relacionarse con:

\- Finanzas

\- Tareas

\- Fondos

\#\#\# \*\*Documento\*\*

Puede relacionarse con:

\- Personas

\- Activos

\- Gastos

\- Eventos

\#\# \*\*03.04 Hogar\*\* {\#hogar}

El Hogar es la unidad organizativa principal.

Todo ocurre dentro de un hogar.

Ejemplos:

\- Roles

\- Planner

\- Finance

\- Presence

\- Assets

\- HomeCloud

pertenecen al hogar.

\#\# \*\*03.05 Cuenta\*\* {\#cuenta}

La Cuenta pertenece al usuario.

No al hogar.

Incluye:

\- Perfil

\- Preferencias

\- Idioma

\- Configuración personal

\- Memoria personal de Geni

\#\# \*\*03.06 Memoria\*\* {\#memoria}

Existen dos tipos de memoria.

\#\#\# \*\*Memoria Personal\*\*

Pertenece al usuario.

\#\#\# \*\*Memoria Familiar\*\*

Pertenece al hogar.

\#\# \*\*03.07 Geni\*\* {\#geni-1}

Geni opera sobre todos los dominios autorizados.

Funciona como una capa transversal.

Puede:

\- Consultar

\- Analizar

\- Relacionar

\- Recomendar

\- Automatizar

según permisos disponibles.

\# \*\*04. ROLES Y PERMISOS\*\* {\#roles-y-permisos}

\#\# \*\*04.01 Roles oficiales\*\* {\#roles-oficiales}

HomePlus posee siete roles oficiales.

\#\#\# \*\*Coordinador\*\*

Responsable administrativo principal del hogar.

\#\#\# \*\*Adulto\*\*

Miembro operativo con amplios permisos.

\#\#\# \*\*Adolescente\*\*

Miembro con autonomía progresiva.

Puede recibir autorizaciones adicionales.

\#\#\# \*\*Niño\*\*

Miembro con experiencia simplificada.

\#\#\# \*\*Adulto Mayor\*\*

Miembro con experiencia adaptada.

Mantiene permisos equivalentes a un Adulto salvo configuraciones específicas.

\#\#\# \*\*Invitado\*\*

Participación limitada.

\#\#\# \*\*Empleado Familiar\*\*

Colaborador operativo del hogar.

No forma parte del núcleo familiar.

\#\# \*\*04.02 Principio de privacidad\*\* {\#principio-de-privacidad}

Ningún rol obtiene acceso automático a:

\- Memoria privada de Geni

\- Metas privadas

\- Documentos privados

\- Finanzas personales

La privacidad individual prevalece.

\#\# \*\*04.03 Coordinador\*\* {\#coordinador-1}

Puede:

\- Aprobar ingresos

\- Cambiar roles

\- Expulsar miembros

\- Transferir coordinación

\- Administrar configuraciones del hogar

No puede eliminar hogares.

\#\# \*\*04.04 Adulto\*\* {\#adulto-1}

Puede:

\- Invitar personas

\- Crear tareas

\- Reasignar tareas

\- Crear eventos

\- Administrar operaciones familiares

No puede aprobar ingresos.

\#\# \*\*04.05 Adolescente\*\* {\#adolescente-1}

Puede:

\- Crear eventos familiares

\- Crear gastos

\- Administrar tareas propias

Puede recibir permisos adicionales configurables.

\#\# \*\*04.06 Niño\*\* {\#niño-1}

Posee acceso simplificado.

No administra información familiar crítica.

\#\# \*\*04.07 Adulto Mayor\*\* {\#adulto-mayor-1}

Utiliza una experiencia adaptada.

Home prioriza:

\- Personas

\- Eventos

\- Recordatorios

\- Medicación

\- Coordinación

sin perder acceso a tareas y briefing.

\#\# \*\*04.08 Invitado\*\* {\#invitado-1}

Acceso mínimo.

Participación limitada.

\#\# \*\*04.09 Empleado Familiar\*\* {\#empleado-familiar-1}

Acceso restringido a las responsabilidades asignadas.

No administra el hogar.

No participa de decisiones familiares.

\#\# \*\*04.10 Permisos configurables\*\* {\#permisos-configurables}

El hogar puede otorgar permisos especiales a determinados miembros.

Principalmente:

\- Adolescente autorizado

\- Adulto autorizado

para acciones específicas.

\# \*\*05. PEOPLE\*\* {\#people-1}

\#\# \*\*05.01 Objetivo\*\* {\#objetivo}

People es el dominio responsable de administrar las personas que participan dentro de un hogar.

Centraliza:

\- Identidad

\- Relaciones

\- Roles

\- Información básica

\- Participación en el hogar

People es la base sobre la que operan todos los demás módulos.

\#\# \*\*05.02 Persona\*\* {\#persona-1}

Toda persona pertenece a una cuenta.

Una persona puede participar en uno o más hogares.

Cada hogar mantiene su propia membresía independiente.

\#\# \*\*05.03 Información básica\*\* {\#información-básica}

Cada persona puede tener:

\- Nombre

\- Apellido

\- Foto

\- Fecha de nacimiento

\- Género (opcional)

\- Información de contacto

\- Rol dentro del hogar

\#\# \*\*05.04 Membresía\*\* {\#membresía}

La membresía representa la relación entre una persona y un hogar.

Estados posibles:

\- Pendiente

\- Activa

\- Suspendida

\- Finalizada

\#\# \*\*05.05 Roles\*\* {\#roles}

Cada membresía posee un único rol activo.

Roles oficiales:

\- Coordinador

\- Adulto

\- Adolescente

\- Niño

\- Adulto Mayor

\- Invitado

\- Empleado Familiar

\#\# \*\*05.06 Relaciones familiares\*\* {\#relaciones-familiares}

People permite registrar relaciones entre personas.

Ejemplos:

\- Madre

\- Padre

\- Hijo

\- Hija

\- Abuelo

\- Abuela

\- Hermano

\- Hermana

\- Tutor

Las relaciones son informativas.

No modifican permisos automáticamente.

\#\# \*\*05.07 Invitaciones\*\* {\#invitaciones}

Una persona puede ser invitada a un hogar.

Flujo:

Invitación

↓

Aceptación

↓

Aprobación (si corresponde)

↓

Ingreso al hogar

\#\# \*\*05.08 Cambio de rol\*\* {\#cambio-de-rol}

Los roles pueden modificarse.

La acción queda auditada.

\#\# \*\*05.09 Expulsión\*\* {\#expulsión}

Los Coordinadores pueden expulsar miembros.

La expulsión conserva historial.

No elimina información histórica.

\#\# \*\*05.10 Multi-hogar\*\* {\#multi-hogar}

Una persona puede pertenecer a múltiples hogares.

Ejemplo:

Coordinador en Hogar A

↓

Adulto en Hogar B

↓

Invitado en Hogar C

Los roles son independientes.

\#\# \*\*05.11 Perfil personal\*\* {\#perfil-personal}

Pertenece a la cuenta.

No al hogar.

Incluye:

\- Preferencias

\- Idioma

\- Configuración personal

\- Memoria personal de Geni

\#\# \*\*05.12 Información privada\*\* {\#información-privada}

Nunca se comparte automáticamente:

\- Memoria privada de Geni

\- Metas privadas

\- Documentos privados

\- Finanzas personales

\#\# \*\*05.13 Presencia\*\* {\#presencia}

People se integra con Presence para mostrar:

\- Estado actual

\- Disponibilidad

\- Última actividad relevante

según permisos.

\#\# \*\*05.14 Participación transversal\*\* {\#participación-transversal}

Una persona puede relacionarse con:

\- Tasks

\- Events

\- Goals

\- Gastos

\- Fondos

\- Assets

\- Inventory

\- Documentos

\- Recuerdos

\- Automatizaciones

\# \*\*06. PLANNER\*\* {\#planner-1}

\#\# \*\*06.01 Objetivo\*\* {\#objetivo-1}

Planner es el núcleo operativo de HomePlus.

Administra:

\- Tasks

\- Calendar

\- Goals

\- Responsabilidades

\# \*\*TASKS\*\*

\#\# \*\*06.02 Objetivo\*\* {\#objetivo-2}

Representar trabajo pendiente o realizado.

\#\# \*\*06.03 Campos principales\*\* {\#campos-principales}

\- Título

\- Descripción

\- Responsable

\- Fecha de inicio

\- Fecha de vencimiento

\- Prioridad

\- Estado

\- Responsabilidad asociada

\- Goal asociada

\- Archivos

\- Comentarios

\#\# \*\*06.04 Estados\*\* {\#estados}

\- Pendiente

\- En progreso

\- Completada

\- Cancelada

Vencida es calculada automáticamente.

\#\# \*\*06.05 Prioridades\*\* {\#prioridades}

\- Baja

\- Media

\- Alta

\- Crítica

\#\# \*\*06.06 Dependencias\*\* {\#dependencias}

Las tareas pueden depender de otras.

Ejemplo:

Comprar ingredientes

↓

Cocinar cena

Si la tarea previa no se completa, la dependiente queda bloqueada.

\#\# \*\*06.07 Recurrencias\*\* {\#recurrencias}

Las recurrencias generan nuevas instancias.

No reutilizan la misma tarea.

Esto preserva historial.

\#\# \*\*06.08 Subtareas\*\* {\#subtareas}

Existe un único nivel.

Modelo:

Task

└─ Subtasks

No existen subtareas anidadas.

\#\# \*\*06.09 Progreso de subtareas\*\* {\#progreso-de-subtareas}

El progreso se calcula automáticamente.

Ejemplo:

5 subtareas

3 completadas

↓

60%

\#\# \*\*06.10 Comentarios\*\* {\#comentarios}

Las tareas poseen comentarios.

\#\# \*\*06.11 Adjuntos\*\* {\#adjuntos}

Las tareas aceptan:

\- Imágenes

\- PDFs

\- Archivos

\- Audio

\#\# \*\*06.12 Timeline\*\* {\#timeline}

Cada tarea posee actividad automática.

Ejemplos:

\- Tarea creada

\- Responsable cambiado

\- Fecha modificada

\- Completada

y comentarios humanos.

Todo aparece en una única línea temporal.

\#\# \*\*06.13 Verificación\*\* {\#verificación}

Las tareas pueden requerir verificación.

Es opcional.

Cuando se verifica:

Completada

↓

Estado final

No existe un estado separado.

\#\# \*\*06.14 Asignación\*\* {\#asignación}

Los responsables pueden variar según permisos.

Las tareas pueden asignarse a terceros.

\#\# \*\*06.15 Reasignación\*\* {\#reasignación}

Puede realizarse según permisos del hogar.

\#\# \*\*06.16 Plantillas\*\* {\#plantillas}

Existen plantillas de tareas.

Inicialmente sólo para Tasks.

\# \*\*RESPONSABILIDADES\*\*

\#\# \*\*06.17 Objetivo\*\* {\#objetivo-3}

Agrupar áreas operativas del hogar.

Ejemplos:

\- Compras

\- Mascotas

\- Limpieza

\- Vehículos

\#\# \*\*06.18 Responsabilidad principal\*\* {\#responsabilidad-principal}

Una tarea posee una única responsabilidad principal.

Ejemplo:

Comprar alimento perro

↓

Compras

No múltiples responsabilidades.

\#\# \*\*06.19 Miembros\*\* {\#miembros}

Las responsabilidades poseen miembros asignados.

\#\# \*\*06.20 Responsables múltiples\*\* {\#responsables-múltiples}

Una responsabilidad puede tener múltiples personas.

\# \*\*CALENDAR\*\*

\#\# \*\*06.21 Objetivo\*\* {\#objetivo-4}

Administrar eventos.

\#\# \*\*06.22 Eventos\*\* {\#eventos}

Pueden ser:

\- Familiares

\- Personales

\#\# \*\*06.23 Estados\*\* {\#estados-1}

\- Programado

\- Completado

\- Cancelado

No existe Postergado.

Postergar equivale a modificar fecha.

\#\# \*\*06.24 Participantes\*\* {\#participantes}

Los eventos pueden tener múltiples participantes.

\# \*\*GOALS\*\*

\#\# \*\*06.25 Objetivo\*\* {\#objetivo-5}

Representar objetivos personales o familiares.

\#\# \*\*06.26 Tipos\*\* {\#tipos}

\- Meta Personal

\- Meta Familiar

\#\# \*\*06.27 Estructura\*\* {\#estructura}

Modelo oficial:

Goal

↓

Hitos

↓

Tasks

\#\# \*\*06.28 Hitos\*\* {\#hitos}

Representan grandes avances dentro de la meta.

\#\# \*\*06.29 Estados\*\* {\#estados-2}

\- Activa

\- Completada

\- Fallida

\#\# \*\*06.30 Integración con Finance\*\* {\#integración-con-finance}

Las metas financieras calculan progreso automáticamente.

Ejemplo:

Objetivo

↓

Saldo acumulado

\#\# \*\*06.31 Integración con Tasks\*\* {\#integración-con-tasks}

Las tareas pueden avanzar metas.

\#\# \*\*06.32 Integración con Fondos\*\* {\#integración-con-fondos}

Las metas pueden vincularse a fondos financieros.

\#\# \*\*06.33 Geni\*\* {\#geni-2}

Geni puede estimar progreso en metas complejas.

Sin configuración manual por parte del usuario.

\# \*\*07. FINANCE\*\* {\#finance-1}

\#\# \*\*07.01 Objetivo\*\* {\#objetivo-6}

Administrar la economía personal y familiar.

\#\# \*\*07.02 Filosofía\*\* {\#filosofía}

Finance es un copiloto financiero.

No sólo registra movimientos.

Ayuda a tomar decisiones.

\#\# \*\*07.03 Entidades principales\*\* {\#entidades-principales}

\- Cuentas

\- Gastos

\- Ingresos

\- Fondos

\- Presupuestos

\- Deudas

\- Metas financieras

\# \*\*CUENTAS\*\*

\#\# \*\*07.04 Objetivo\*\* {\#objetivo-7}

Representar dinero disponible.

\#\# \*\*07.05 Tipos\*\* {\#tipos-1}

Ejemplos:

\- Efectivo

\- Mercado Pago

\- Banco

\- Tarjeta

\#\# \*\*07.06 Campos\*\* {\#campos}

\- Nombre

\- Tipo

\- Saldo

\#\# \*\*07.07 Saldo\*\* {\#saldo}

Se calcula mediante:

Saldo inicial

\- 

Ingresos

\- 

Gastos

\#\# \*\*07.08 Ajustes\*\* {\#ajustes}

Los ajustes manuales están permitidos.

Quedan auditados.

\# \*\*GASTOS\*\*

\#\# \*\*07.09 Tipos\*\* {\#tipos-2}

\- Personal

\- Familiar

\#\# \*\*07.10 Información\*\* {\#información}

\- Monto

\- Fecha

\- Cuenta

\- Categoría

\- Responsable

\#\# \*\*07.11 Relaciones\*\* {\#relaciones}

Un gasto puede relacionarse con:

\- Persona

\- Responsabilidad

\- Goal

\- Asset

\- Fondo

\#\# \*\*07.12 Comprobantes\*\* {\#comprobantes}

Opcionales.

Soportan:

\- Foto

\- PDF

\- Imagen

\#\# \*\*07.13 Eliminación\*\* {\#eliminación}

Los gastos no se eliminan.

Pueden anularse.

\# \*\*INGRESOS\*\*

\#\# \*\*07.14 Tipos\*\* {\#tipos-3}

Ejemplos:

\- Sueldo

\- Regalo

\- Venta

\- Reembolso

\# \*\*PRESUPUESTOS\*\*

\#\# \*\*07.15 Objetivo\*\* {\#objetivo-8}

Controlar límites de gasto.

\#\# \*\*07.16 Alertas\*\* {\#alertas}

Cuando se aproxima el límite:

\- Alerta

\- Recomendación de Geni

\# \*\*FONDOS\*\*

\#\# \*\*07.17 Objetivo\*\* {\#objetivo-9}

Reservar dinero para un propósito.

Ejemplo:

Vacaciones

\#\# \*\*07.18 Campos\*\* {\#campos-1}

\- Objetivo

\- Saldo actual

\#\# \*\*07.19 Estados\*\* {\#estados-3}

\- Activo

\- Completado

\- Cerrado

\# \*\*DEUDAS\*\*

\#\# \*\*07.20 Tipos\*\* {\#tipos-4}

\- Persona ↔ Persona

\- Persona ↔ Familia

\- Familia ↔ Externo

\#\# \*\*07.21 Estados\*\* {\#estados-4}

\- Activa

\- Pagada

\- Vencida

\#\# \*\*07.22 Recordatorios\*\* {\#recordatorios}

Automáticos.

\# \*\*GENI FINANCE\*\*

\#\# \*\*07.23 Análisis\*\* {\#análisis}

Puede detectar patrones.

Ejemplo:

Gastaste más en delivery este mes.

\#\# \*\*07.24 Recomendaciones\*\* {\#recomendaciones}

Ejemplo:

Reduciendo un 10% este gasto alcanzarías antes tu objetivo.

\#\# \*\*07.25 Tareas\*\* {\#tareas}

Puede sugerir o crear tareas relacionadas con finanzas.

\#\# \*\*07.26 Home\*\* {\#home}

Finance no posee widget permanente.

Aparece cuando existe:

\- Pago vencido

\- Presupuesto excedido

\- Meta en riesgo

\- Fondo completado

mediante Atención Requerida.

\# \*\*08. PRESENCE\*\* {\#presence-1}

\#\# \*\*08.01 Objetivo\*\* {\#objetivo-10}

Presence es el dominio encargado de coordinar disponibilidad, ubicación y movimientos relevantes de las personas dentro del hogar.

No está diseñado como una herramienta de vigilancia.

Su propósito es:

\- Saber quién está disponible.

\- Saber quién llegó.

\- Saber quién salió.

\- Mejorar la coordinación familiar.

\- Potenciar funcionalidades de SOS.

\- Proveer contexto a Geni.

\#\# \*\*08.02 Filosofía\*\* {\#filosofía-1}

Presence prioriza la coordinación sobre el control.

La información debe responder preguntas útiles como:

\- ¿Quién está en casa?

\- ¿Quién viene?

\- ¿Quién ya llegó?

\- ¿Quién está disponible?

\- ¿Quién puede ayudar?

\#\# \*\*08.03 Componentes principales\*\* {\#componentes-principales}

Presence se compone de:

\- Ubicación

\- Estados

\- Lugares

\- Geocercas

\- Historial

\- Check-ins

\- Coordinación

\# \*\*UBICACIÓN\*\*

\#\# \*\*08.04 Compartición de ubicación\*\* {\#compartición-de-ubicación}

La ubicación puede compartirse de manera continua.

También puede pausarse temporalmente por decisión del usuario.

La filosofía del producto recomienda compartirla permanentemente para maximizar coordinación y seguridad.

\#\# \*\*08.05 Niveles de visibilidad\*\* {\#niveles-de-visibilidad}

Nivel 1

\- Información mínima.

Nivel 2

\- Información resumida.

Nivel 3

\- Ubicación completa.

Distribución inicial:

\#\#\# \*\*Nivel 3\*\*

\- Coordinador

\- Adulto

\- Adulto Mayor

\#\#\# \*\*Nivel 2\*\*

\- Adolescente

\- Niño

\- Invitado

Los permisos finales pueden modificarse mediante configuración.

\#\# \*\*08.06 Historial\*\* {\#historial}

Presence conserva historial de ubicaciones.

Retención oficial:

30 días.

\#\# \*\*08.07 Uso del historial\*\* {\#uso-del-historial}

El historial existe para:

\- Coordinación.

\- Investigación de incidentes.

\- SOS.

\- Aprendizaje contextual de Geni.

\# \*\*ESTADOS\*\* {\#estados-5}

\#\# \*\*08.08 Estados automáticos\*\* {\#estados-automáticos}

Presence puede inferir estados según:

\- Ubicación.

\- Horario.

\- Actividad.

Ejemplos:

\- En casa

\- En trabajo

\- En escuela

\- En tránsito

\#\# \*\*08.09 Estados manuales\*\* {\#estados-manuales}

Los usuarios también pueden definir estados manuales.

Ejemplos:

\- No molestar

\- Descansando

\- Estudiando

\- Trabajando

Modelo similar a Discord o Slack.

\#\# \*\*08.10 Prioridad\*\* {\#prioridad}

Los estados manuales tienen prioridad sobre los estados automáticos.

\# \*\*LUGARES\*\*

\#\# \*\*08.11 Objetivo\*\* {\#objetivo-11}

Representar ubicaciones relevantes para la coordinación familiar.

\#\# \*\*08.12 Tipos\*\* {\#tipos-5}

Existe un único tipo de lugar.

No existen:

\- Lugares personales

\- Lugares familiares

Todos utilizan el mismo modelo.

\#\# \*\*08.13 Ejemplos\*\* {\#ejemplos}

\- Casa

\- Escuela

\- Trabajo

\- Club

\- Parada de colectivo

\- Hospital

\- Gimnasio

\#\# \*\*08.14 Creación\*\* {\#creación}

Los lugares pueden crearse cuando generan valor operativo.

No existe limitación artificial por categoría.

\# \*\*GEOCERCAS\*\*

\#\# \*\*08.15 Geocercas\*\* {\#geocercas-1}

Todos los lugares pueden poseer geocerca.

\#\# \*\*08.16 Eventos automáticos\*\* {\#eventos-automáticos}

La geocerca puede generar eventos como:

\- Llegó

\- Salió

\#\# \*\*08.17 Configuración\*\* {\#configuración}

Las geocercas están habilitadas por defecto.

\# \*\*CHECK-INS\*\*

\#\# \*\*08.18 Objetivo\*\* {\#objetivo-12}

Permitir confirmaciones manuales.

\#\# \*\*08.19 Casos de uso\*\* {\#casos-de-uso}

Ejemplos:

\- Llegué.

\- Ya estoy en el club.

\- Ya estoy en la escuela.

\#\# \*\*08.20 Relación con ubicación\*\* {\#relación-con-ubicación}

Los check-ins complementan al GPS.

No lo reemplazan.

\# \*\*COORDINACIÓN\*\*

\#\# \*\*08.21 Uso por parte de Geni\*\* {\#uso-por-parte-de-geni}

Geni puede utilizar Presence para:

\- Coordinar eventos.

\- Detectar retrasos.

\- Generar recordatorios.

\- Proponer acciones.

\#\# \*\*08.22 Automatizaciones\*\* {\#automatizaciones-1}

Presence puede disparar automatizaciones.

Ejemplo:

Juan llegó a casa

↓

Enviar aviso.

\#\# \*\*08.23 Home\*\* {\#home-1}

Presence no posee módulo permanente en Home.

Su información aparece mediante:

\- Briefing

\- Atención requerida

\- Widgets contextuales

\# \*\*09. INVENTORY\*\* {\#inventory-1}

\#\# \*\*09.01 Objetivo\*\* {\#objetivo-13}

Inventory administra los consumibles y elementos de stock del hogar.

No administra activos importantes.

Eso pertenece a Assets.

\#\# \*\*09.02 Filosofía\*\* {\#filosofía-2}

Inventory existe para responder:

\- ¿Qué tenemos?

\- ¿Qué falta?

\- ¿Qué debemos comprar?

\- ¿Qué se está por terminar?

\#\# \*\*09.03 Entidades principales\*\* {\#entidades-principales-1}

Inventory administra:

\- Consumibles

\- Productos del hogar

\- Medicamentos

\# \*\*CONSUMIBLES\*\*

\#\# \*\*09.04 Ejemplos\*\* {\#ejemplos-1}

\- Leche

\- Arroz

\- Fideos

\- Aceite

\- Sal

\- Azúcar

\#\# \*\*09.05 Campos\*\* {\#campos-2}

\- Nombre

\- Categoría

\- Cantidad

\- Unidad

\- Stock mínimo

\#\# \*\*09.06 Stock\*\* {\#stock}

Cada ítem posee stock actual.

\#\# \*\*09.07 Stock mínimo\*\* {\#stock-mínimo}

Puede definirse un umbral mínimo.

\#\# \*\*09.08 Reposición\*\* {\#reposición}

Cuando el stock cae por debajo del mínimo:

Geni puede:

\- Alertar

\- Crear tarea

\- Sugerir compra

\- Crear automatización

\# \*\*PRODUCTOS DEL HOGAR\*\*

\#\# \*\*09.09 Ejemplos\*\* {\#ejemplos-2}

\- Shampoo

\- Jabón

\- Papel higiénico

\- Detergente

\- Lavandina

\#\# \*\*09.10 Funcionamiento\*\* {\#funcionamiento}

Utilizan el mismo modelo que consumibles.

\# \*\*MEDICAMENTOS\*\*

\#\# \*\*09.11 Clasificación\*\* {\#clasificación}

Los medicamentos pertenecen a Inventory.

No a Assets.

\#\# \*\*09.12 Información\*\* {\#información-1}

Pueden almacenar:

\- Nombre

\- Stock

\- Vencimiento

\- Observaciones

\#\# \*\*09.13 Recordatorios\*\* {\#recordatorios-1}

Pueden generar:

\- Alertas de vencimiento

\- Alertas de reposición

\# \*\*RELACIONES\*\* {\#relaciones-1}

\#\# \*\*09.14 Planner\*\* {\#planner-2}

Inventory puede crear tareas.

Ejemplo:

No hay leche

↓

Comprar leche

\#\# \*\*09.15 Finance\*\* {\#finance-2}

Las compras pueden registrarse como gastos.

\#\# \*\*09.16 Automatizaciones\*\* {\#automatizaciones-2}

Inventory puede disparar automatizaciones.

\#\# \*\*09.17 Home\*\* {\#home-2}

Inventory no posee widget permanente.

Aparece cuando existe:

\- Falta de stock

\- Producto crítico

\- Medicamento próximo a vencer

\# \*\*ESTADOS\*\* {\#estados-6}

\#\# \*\*09.18 Estados\*\* {\#estados-7}

\- Activo

\- Archivado

\# \*\*10. ASSETS\*\* {\#assets-1}

\#\# \*\*10.01 Objetivo\*\* {\#objetivo-14}

Assets administra los activos importantes del hogar.

Representa bienes que requieren:

\- Seguimiento

\- Documentación

\- Mantenimiento

\- Vencimientos

\- Responsables

\#\# \*\*10.02 Filosofía\*\* {\#filosofía-3}

Assets responde:

\- ¿Qué activos tiene el hogar?

\- ¿Quién es responsable?

\- ¿Qué mantenimiento requieren?

\- ¿Qué documentación poseen?

\- ¿Qué vencimientos existen?

\#\# \*\*10.03 Categorías oficiales\*\* {\#categorías-oficiales}

\#\#\# \*\*Vehículos\*\*

\#\#\# \*\*Mascotas\*\*

\#\#\# \*\*Dispositivos\*\*

\#\#\# \*\*Propiedades\*\*

\# \*\*VEHÍCULOS\*\*

\#\# \*\*10.04 Información\*\* {\#información-2}

Ejemplos:

\- Marca

\- Modelo

\- Año

\- Patente

\#\# \*\*10.05 Documentación\*\* {\#documentación}

Puede almacenar:

\- Seguro

\- Cédula

\- Título

\- VTV

\#\# \*\*10.06 Vencimientos\*\* {\#vencimientos}

Ejemplos:

\- Seguro

\- VTV

\- Patente

\#\# \*\*10.07 Mantenimiento\*\* {\#mantenimiento}

Ejemplos:

\- Cambio de aceite

\- Service

\- Limpieza

\#\# \*\*10.08 Responsables\*\* {\#responsables}

Puede tener:

\- Responsable principal

\- Responsables secundarios

\# \*\*MASCOTAS\*\*

\#\# \*\*10.09 Información\*\* {\#información-3}

\- Nombre

\- Especie

\- Raza

\- Fecha de nacimiento

\#\# \*\*10.10 Información médica\*\* {\#información-médica}

\- Veterinario

\- Vacunas

\- Tratamientos

\#\# \*\*10.11 Mantenimiento\*\* {\#mantenimiento-1}

Ejemplos:

\- Vacunas

\- Controles

\- Baño

\- Alimentación

\#\# \*\*10.12 Estados\*\* {\#estados-8}

\- Activa

\- Fallecida

\- Archivada

\# \*\*DISPOSITIVOS\*\*

\#\# \*\*10.13 Ejemplos\*\* {\#ejemplos-3}

\- Notebook

\- PC

\- Tablet

\- Celular

\- Consola

\#\# \*\*10.14 Seguimiento\*\* {\#seguimiento}

Pueden registrar:

\- Garantías

\- Documentación

\- Limpiezas

\- Mantenimiento

\# \*\*PROPIEDADES\*\*

\#\# \*\*10.15 Ejemplos\*\* {\#ejemplos-4}

\- Casa

\- Departamento

\- Terreno

\#\# \*\*10.16 Información\*\* {\#información-4}

\- Dirección

\- Documentación

\- Observaciones

\# \*\*MANTENIMIENTO\*\* {\#mantenimiento-2}

\#\# \*\*10.17 Objetivo\*\* {\#objetivo-15}

Los Assets pueden requerir mantenimiento periódico.

\#\# \*\*10.18 Integración con Planner\*\* {\#integración-con-planner}

Un Asset puede generar tareas automáticamente.

Ejemplos:

Vehículo

↓

Cambio de aceite

Mascota

↓

Vacuna

Dispositivo

↓

Limpieza

\# \*\*DOCUMENTOS\*\*

\#\# \*\*10.19 HomeCloud\*\* {\#Homecloud-1}

Todos los Assets pueden vincular documentos.

Ejemplos:

\- Seguro

\- Facturas

\- Garantías

\- Certificados

\# \*\*FINANCE\*\* {\#finance-3}

\#\# \*\*10.20 Relación financiera\*\* {\#relación-financiera}

Los Assets pueden vincular:

\- Gastos

\- Presupuestos

\- Metas

\# \*\*ESTADOS\*\* {\#estados-9}

\#\# \*\*10.21 Estados generales\*\* {\#estados-generales}

\- Activo

\- Inactivo

\- Archivado

\# \*\*HOME\*\* {\#home-3}

\#\# \*\*10.22 Home\*\* {\#home-4}

Assets no posee widget permanente.

Puede aparecer cuando:

\- Existe mantenimiento pendiente.

\- Existe vencimiento próximo.

\- Existe documentación faltante.

mediante Atención Requerida.

\#\# \*\*10.23 Geni\*\* {\#geni-3}

Geni puede utilizar información de Assets para:

\- Generar recordatorios.

\- Crear tareas.

\- Detectar vencimientos.

\- Proponer mantenimientos.

\- Coordinar documentación.

Assets forma parte del ecosistema operativo del hogar y se integra directamente con Planner, Finance, Presence, HomeCloud y Automatizaciones.

\# \*\*11. HomeCLOUD\*\* {\#Homecloud-2}

\#\# \*\*11.01 Objetivo\*\* {\#objetivo-16}

HomeCloud es la memoria documental y emocional de la familia.

No es un almacenamiento de archivos.

Su objetivo es preservar:

\- Historia familiar.

\- Documentación importante.

\- Evidencia operativa.

\- Recuerdos y momentos familiares.

\#\# \*\*11.02 Filosofía\*\* {\#filosofía-4}

La gente no recuerda rutas de carpetas técnicas.

Recuerda momentos:

El cumpleaños de Gaby

Las vacaciones en Córdoba

La organización principal es por álbumes, eventos y recuerdos. No por carpetas técnicas.

HomeCloud debe poder responder:

\- ¿Dónde está este documento?

\- ¿Cuándo ocurrió esto?

\- ¿Quién participó en este evento?

\- ¿Qué documentos pertenecen a este activo?

\#\# \*\*11.03 Componentes principales\*\* {\#componentes-principales-1}

HomeCloud se divide en:

\- Álbumes / Recuerdos (vista principal)

\- Documentos (acceso separado)

\- Papelera

\#\# \*\*11.04 Pendientes (features futuras confirmadas)\*\* {\#pendientes-Homecloud}

\- \*\*HomePlus Recap anual\*\* (tipo Spotify Wrapped): resumen emocional con datos reales del sistema (tareas completadas, eventos, fotos, goals cumplidos, momentos destacados).

\- \*\*Línea temporal familiar\*\*: historia cronológica del hogar.

\# \*\*RECUERDOS\*\*

\#\# \*\*11.04 Objetivo\*\* {\#objetivo-17}

Preservar momentos familiares.

\#\# \*\*11.05 Contenido permitido\*\* {\#contenido-permitido}

\- Fotos

\- Videos

\- Texto

\#\# \*\*11.06 Creación\*\* {\#creación-1}

Pueden crear recuerdos:

\- Coordinador

\- Adulto

\- Adulto Mayor

\- Adolescente

\- Invitado (si tiene permisos)

Niños no crean recuerdos directamente.

\#\# \*\*11.07 Personas asociadas\*\* {\#personas-asociadas}

Los recuerdos pueden relacionarse con personas.

\#\# \*\*11.08 Reconocimiento facial\*\* {\#reconocimiento-facial}

\*\*V1:\*\* Los participantes de álbumes y recuerdos se heredan del evento de Calendar. No existe reconocimiento facial en V1.

\*\*V2 (futuro):\*\* HomePlus incorporará reconocimiento facial como funcionalidad opcional. El sistema podrá sugerir personas detectadas en fotos. La confirmación siempre pertenece al usuario. No existe asignación manual de personas en V1. O es automático (V2) o no está.

\#\# \*\*11.09 Álbum automático desde Calendar\*\* {\#álbum-automático-calendar}

Cuando un evento del Calendar finaliza:

Evento finalizado

↓

Recuerdo creado automáticamente

↓

HomePlus detecta fotos tomadas durante el evento

↓

"Encontramos 42 fotos del evento. ¿Agregar?"

↓

\[Agregar\] \[Revisar\] \[Ignorar\]

Esto combina automatización con control del usuario. No sube nada a la nube sin consentimiento explícito.

\#\# \*\*11.11 Feed mensual\*\* {\#feed-mensual}

Los recuerdos pueden utilizarse para generar recopilaciones automáticas.

Ejemplo:

Resumen Junio 2027

↓

Fotos destacadas

↓

Momentos importantes

↓

Publicación automática sugerida para Feed.

\# \*\*ÁLBUMES\*\*

\#\# \*\*11.12 Objetivo\*\* {\#objetivo-18}

Agrupar recuerdos.

\#\# \*\*11.13 Tipos\*\* {\#tipos-6}

No existen tipos especiales.

Todos utilizan el mismo modelo.

\#\# \*\*11.14 Ejemplos\*\* {\#ejemplos-5}

\- Vacaciones

\- Cumpleaños

\- Navidad

\- Escuela

\- Mascotas

\#\# \*\*11.15 Organización\*\* {\#organización}

Los álbumes pueden contener:

\- Fotos

\- Videos

\- Recuerdos

\# \*\*DOCUMENTOS\*\*

\#\# \*\*11.16 Objetivo\*\* {\#objetivo-19}

Almacenar documentación importante.

\#\# \*\*11.17 Tipos\*\* {\#tipos-7}

Ejemplos:

\- PDF

\- Imagen

\- Documento escaneado

\#\# \*\*11.18 Integración con el ecosistema\*\* {\#integración-con-el-ecosistema}

Los documentos pueden vincularse a:

\- Personas

\- Assets

\- Gastos

\- Eventos

\- Goals

\- Responsabilidades

\#\# \*\*11.19 Casos de uso\*\* {\#casos-de-uso-1}

Ejemplos:

Vehículo

↓

Seguro

↓

Documento asociado

Mascota

↓

Carnet de vacunación

↓

Documento asociado

Propiedad

↓

Escritura

↓

Documento asociado

\#\# \*\*11.20 OCR\*\* {\#ocr}

El sistema debe estar preparado para OCR automático.

Cuando esté disponible:

\- Extraer datos.

\- Clasificar documentos.

\- Sugerir relaciones.

\#\# \*\*11.21 Privacidad\*\* {\#privacidad}

Los documentos pueden ser:

\- Familiares

\- Privados

\# \*\*VERSIONADO\*\*

\#\# \*\*11.22 Versionado\*\* {\#versionado-1}

Los documentos soportan versiones.

Las versiones anteriores permanecen disponibles.

\# \*\*COMENTARIOS\*\* {\#comentarios-1}

\#\# \*\*11.23 Comentarios\*\* {\#comentarios-2}

Los documentos pueden recibir comentarios.

\# \*\*PERMISOS\*\*

\#\# \*\*11.24 Permisos\*\* {\#permisos-1}

Cada documento puede definir visibilidad.

\# \*\*PAPELERA\*\*

\#\# \*\*11.25 Papelera\*\* {\#papelera-1}

Los elementos eliminados van a papelera.

\#\# \*\*11.26 Retención\*\* {\#retención}

Retención oficial:

30 días.

\# \*\*EXPORTACIÓN\*\*

\#\# \*\*11.27 Exportación\*\* {\#exportación-1}

Los usuarios pueden exportar:

\- Recuerdos

\- Álbumes

\- Documentos

\#\# \*\*11.28 Propiedad\*\* {\#propiedad}

Toda la información pertenece al usuario.

HomePlus sólo la administra.

\# \*\*12. FEED\*\* {\#feed-1}

\#\# \*\*12.01 Objetivo\*\* {\#objetivo-20}

Feed es el espacio social del hogar.

Permite compartir actividad relevante.

\#\# \*\*12.02 Filosofía\*\* {\#filosofía-5}

Feed no busca competir con redes sociales.

Busca reforzar coordinación y memoria familiar.

\#\# \*\*12.03 Modelo\*\* {\#modelo}

Todo es un Post.

No existen tipos especiales de publicación.

\#\# \*\*12.04 Contenido permitido\*\* {\#contenido-permitido-1}

Un Post puede contener:

\- Texto

\- Imagen

\- Video

\- Archivos

\- Enlaces internos

\#\# \*\*12.05 Comentarios\*\* {\#comentarios-3}

Los Posts admiten comentarios.

\#\# \*\*12.06 Reacciones\*\* {\#reacciones}

Los Posts admiten reacciones.

\#\# \*\*12.07 Publicaciones automáticas\*\* {\#publicaciones-automáticas}

Geni puede sugerir publicaciones.

Ejemplos:

Meta completada

↓

Post sugerido

Vacaciones terminadas

↓

Resumen sugerido

\#\# \*\*12.08 Integración con Planner\*\* {\#integración-con-planner-1}

Puede publicarse actividad relevante.

Ejemplos:

\- Goal completada

\- Evento importante

\- Logro familiar

\#\# \*\*12.09 Integración con HomeCloud\*\* {\#integración-con-Homecloud}

Los recuerdos pueden convertirse en publicaciones.

\#\# \*\*12.10 Moderación\*\* {\#moderación}

Los permisos dependen del rol.

La administración final pertenece a Coordinadores y Adultos.

\#\# \*\*12.11 Orden\*\* {\#orden}

Feed se ordena cronológicamente.

\#\# \*\*12.12 Home\*\* {\#home-5}

La actividad reciente puede alimentar el widget:

Actividad Familiar.

\# \*\*13. SOS\*\* {\#sos-1}

\#\# \*\*13.01 Objetivo\*\* {\#objetivo-21}

SOS es el sistema de emergencias de HomePlus.

Permite solicitar ayuda inmediata.

\#\# \*\*13.02 Filosofía\*\* {\#filosofía-6}

Debe funcionar con la menor cantidad posible de pasos.

\#\# \*\*13.03 Quién puede emitir SOS\*\* {\#quién-puede-emitir-sos}

Todos los miembros.

Incluye:

\- Niño

\- Adolescente

\- Adulto

\- Adulto Mayor

\- Empleado Familiar

\#\# \*\*13.04 Quién puede cancelar SOS\*\* {\#quién-puede-cancelar-sos}

\- Quien lo emitió.

\- Coordinadores.

\#\# \*\*13.05 Información enviada\*\* {\#información-enviada}

Un SOS puede incluir:

\- Persona

\- Ubicación

\- Hora

\- Contexto disponible

\# \*\*SOS SILENCIOSO\*\*

\#\# \*\*13.06 Objetivo\*\* {\#objetivo-22}

Permitir pedir ayuda sin alertar a terceros presentes.

\#\# \*\*13.07 Funcionamiento\*\* {\#funcionamiento-2}

El usuario activa SOS silencioso.

HomePlus envía la alerta normalmente.

Pero no genera señales visibles para quien emitió la alerta.

\#\# \*\*13.08 Destinatarios\*\* {\#destinatarios}

Los destinatarios reciben exactamente la misma información.

La diferencia es únicamente local.

\# \*\*CANCELACIÓN ACCIDENTAL\*\*

\#\# \*\*13.09 Protección\*\* {\#protección}

El sistema puede ofrecer una breve ventana para cancelar activaciones accidentales.

\# \*\*ESCALADO\*\*

\#\# \*\*13.10 Escalado\*\* {\#escalado-1}

La alerta escala automáticamente.

Modelo:

Coordinador

↓

Adultos

↓

Personas relevantes

\# \*\*PRESENCE\*\* {\#presence-2}

\#\# \*\*13.11 Integración\*\* {\#integración}

SOS utiliza:

\- Ubicación actual

\- Historial reciente

\- Lugares relevantes

\# \*\*HOME\*\* {\#home-6}

\#\# \*\*13.12 Home\*\* {\#home-7}

SOS tiene prioridad máxima.

Siempre desplaza cualquier otro contenido.

\# \*\*AUDITORÍA\*\*

\#\# \*\*13.13 Auditoría\*\* {\#auditoría-1}

Toda activación queda registrada.

\# \*\*14. GENI\*\* {\#geni-4}

\#\# \*\*14.01 Objetivo\*\* {\#objetivo-23}

Geni es la capa de inteligencia transversal de HomePlus.

No es un módulo aislado.

Opera sobre todo el ecosistema.

\#\# \*\*14.02 Filosofía\*\* {\#filosofía-7}

Geni existe para:

\- Reducir carga mental.

\- Coordinar información.

\- Automatizar trabajo repetitivo.

\- Generar contexto.

\#\# \*\*14.03 Capacidades\*\* {\#capacidades}

Puede:

\- Consultar.

\- Analizar.

\- Recomendar.

\- Coordinar.

\- Automatizar.

\#\# \*\*14.04 Restricciones\*\* {\#restricciones}

Nunca ignora permisos.

Nunca accede a información privada sin autorización.

\# \*\*BRIEFING\*\*

\#\# \*\*14.05 Objetivo\*\* {\#objetivo-24}

Resumir lo importante del hogar.

\#\# \*\*14.06 Home\*\* {\#home-8}

El Briefing es el primer widget de Home.

\#\# \*\*14.07 Contenido\*\* {\#contenido}

Puede incluir:

\- Eventos

\- Tareas

\- Finanzas

\- Presence

\- Goals

\- Alertas

\#\# \*\*14.08 Formato\*\* {\#formato}

Existe una única card.

No múltiples widgets.

\#\# \*\*14.09 Estado\*\* {\#estado}

Home recuerda el estado del Briefing.

\#\# \*\*14.10 Tamaño\*\* {\#tamaño}

Versión resumida permanente.

Versión ampliada cuando existen cambios relevantes.

\# \*\*MEMORIA\*\* {\#memoria-1}

\#\# \*\*14.11 Tipos\*\* {\#tipos-8}

\#\#\# \*\*Memoria Personal\*\*

Pertenece al usuario.

\#\#\# \*\*Memoria Familiar\*\*

Pertenece al hogar.

\#\# \*\*14.12 Creación\*\* {\#creación-2}

Puede ser creada por:

\- Usuarios

\- Geni

\#\# \*\*14.13 Visibilidad\*\* {\#visibilidad}

Respeta permisos del sistema.

\# \*\*AUTOMATIZACIONES\*\* {\#automatizaciones-3}

\#\# \*\*14.14 Participación\*\* {\#participación}

Geni puede:

\- Crear automatizaciones.

\- Sugerir automatizaciones.

\- Modificar automatizaciones.

Siempre sujeto a aprobación cuando corresponda.

\# \*\*FINANCE\*\* {\#finance-4}

\#\# \*\*14.15 Análisis financiero\*\* {\#análisis-financiero}

Puede:

\- Detectar patrones.

\- Detectar riesgos.

\- Recomendar ahorro.

\- Proponer acciones.

\# \*\*PLANNER\*\* {\#planner-3}

\#\# \*\*14.16 Planner\*\* {\#planner-4}

Puede:

\- Crear tareas.

\- Reprogramar tareas.

\- Sugerir responsables.

\- Analizar carga familiar.

\#\# \*\*14.17 Limitación\*\* {\#limitación}

No puede marcar tareas completadas automáticamente.

\# \*\*PRESENCE\*\* {\#presence-3}

\#\# \*\*14.18 Presence\*\* {\#presence-4}

Puede:

\- Coordinar eventos.

\- Detectar retrasos.

\- Generar recordatorios.

\# \*\*HomeCLOUD\*\* {\#Homecloud-3}

\#\# \*\*14.19 HomeCloud\*\* {\#Homecloud-4}

Puede:

\- Clasificar documentos.

\- Sugerir personas.

\- Generar recuerdos.

\# \*\*SEARCH\*\*

\#\# \*\*14.20 Geni Search\*\* {\#geni-search}

Existe búsqueda global.

Puede buscar en:

\- People

\- Planner

\- Finance

\- Presence

\- Inventory

\- Assets

\- HomeCloud

\- Feed

según permisos.

\#\# \*\*14.21 Contexto\*\* {\#contexto}

Las respuestas utilizan contexto cruzado del ecosistema.

\#\# \*\*14.22 Home\*\* {\#home-9}

Geni es el principal motor de personalización de Home.

\# \*\*15. AUTOMATIZACIONES\*\* {\#automatizaciones-4}

\#\# \*\*15.01 Objetivo\*\* {\#objetivo-25}

Automatizaciones permite ejecutar acciones automáticamente cuando ocurre un evento dentro del ecosistema HomePlus.

Modelo conceptual:

SI ocurre X

↓

ENTONCES hacer Y

\#\# \*\*15.02 Filosofía\*\* {\#filosofía-8}

Las automatizaciones existen para eliminar trabajo repetitivo.

No deben reemplazar decisiones humanas importantes.

La coordinación sigue siendo responsabilidad de las personas.

\#\# \*\*15.03 Alcance\*\* {\#alcance-1}

Las automatizaciones pueden interactuar con:

\- People

\- Planner

\- Finance

\- Presence

\- Inventory

\- Assets

\- HomeCloud

\- Feed

\- SOS

\- Geni

\#\# \*\*15.04 Estructura\*\* {\#estructura-1}

Toda automatización posee:

\- Nombre

\- Descripción

\- Trigger

\- Condiciones

\- Acciones

\- Estado

\- Auditoría

\# \*\*TRIGGERS\*\*

\#\# \*\*15.05 Tipos de eventos\*\* {\#tipos-de-eventos}

Ejemplos:

\#\#\# \*\*Presence\*\* {\#presence-5}

\- Llegó a lugar

\- Salió de lugar

\- Check-in

\#\#\# \*\*Planner\*\* {\#planner-5}

\- Tarea creada

\- Tarea completada

\- Evento creado

\- Evento cancelado

\#\#\# \*\*Finance\*\* {\#finance-5}

\- Gasto registrado

\- Presupuesto excedido

\- Fondo completado

\#\#\# \*\*Inventory\*\* {\#inventory-2}

\- Stock bajo

\- Producto agotado

\#\#\# \*\*Assets\*\* {\#assets-2}

\- Vencimiento próximo

\- Mantenimiento vencido

\#\#\# \*\*SOS\*\* {\#sos-2}

\- SOS activado

\# \*\*ACCIONES\*\*

\#\# \*\*15.06 Acciones posibles\*\* {\#acciones-posibles}

Ejemplos:

\- Crear tarea

\- Crear recordatorio

\- Enviar notificación

\- Crear evento

\- Actualizar meta

\- Publicar en Feed

\- Solicitar aprobación

\- Ejecutar otra automatización

\#\# \*\*15.07 Acciones sobre Planner\*\* {\#acciones-sobre-planner}

Ejemplos:

No hay leche

↓

Crear tarea

Meta completada

↓

Crear evento celebración

\#\# \*\*15.08 Acciones sobre Presence\*\* {\#acciones-sobre-presence}

Ejemplos:

Juan llegó a casa

↓

Avisar a mamá

\#\# \*\*15.09 Acciones sobre Finance\*\* {\#acciones-sobre-finance}

Ejemplos:

Presupuesto 90%

↓

Crear alerta

\# \*\*BIBLIOTECA\*\*

\#\# \*\*15.10 Biblioteca oficial\*\* {\#biblioteca-oficial}

HomePlus incluye automatizaciones prearmadas.

Ejemplos:

\- Llegó a casa

\- Stock bajo

\- Pago próximo a vencer

\- Mantenimiento pendiente

\- Cumpleaños próximo

\#\# \*\*15.11 Personalización\*\* {\#personalización}

Las plantillas pueden modificarse.

\# \*\*CREACIÓN\*\* {\#creación-3}

\#\# \*\*15.12 Quién puede crear\*\* {\#quién-puede-crear}

\- Coordinador

\- Adulto

\- Usuarios autorizados

\#\# \*\*15.13 Quién puede aprobar\*\* {\#quién-puede-aprobar}

\- Coordinador

\- Adulto

\# \*\*GENI\*\* {\#geni-5}

\#\# \*\*15.14 Creación automática\*\* {\#creación-automática}

Geni puede proponer automatizaciones.

\#\# \*\*15.15 Flujo\*\* {\#flujo}

Geni detecta patrón

↓

Propone automatización

↓

Usuario aprueba

↓

Automatización creada

\#\# \*\*15.16 Restricción\*\* {\#restricción}

Geni no crea automatizaciones permanentes sin aprobación.

\# \*\*ALCANCE\*\* {\#alcance-2}

\#\# \*\*15.17 Alcance de ejecución\*\* {\#alcance-de-ejecución}

Las automatizaciones operan a nivel hogar.

No existen automatizaciones compartidas entre hogares.

\#\# \*\*15.18 Personas objetivo\*\* {\#personas-objetivo}

Una automatización puede actuar sobre:

\- Una persona

\- Varias personas

\- Todo el hogar

\# \*\*ESTADOS\*\* {\#estados-10}

\#\# \*\*15.19 Estados\*\* {\#estados-11}

\- Activa

\- Pausada

\- Archivada

\# \*\*AUDITORÍA\*\* {\#auditoría-2}

\#\# \*\*15.20 Auditoría\*\* {\#auditoría-3}

Toda ejecución queda registrada.

Debe poder responder:

\- Qué ocurrió

\- Cuándo ocurrió

\- Qué acción se ejecutó

\# \*\*16. MULTI-HOGAR\*\* {\#multi-hogar-1}

\#\# \*\*16.01 Objetivo\*\* {\#objetivo-26}

Permitir que una misma persona participe en múltiples hogares independientes.

\#\# \*\*16.02 Filosofía\*\* {\#filosofía-9}

Cada hogar es una organización separada.

No comparten configuración automáticamente.

\#\# \*\*16.03 Ejemplos\*\* {\#ejemplos-6}

Familia Principal

Padre

Madre

Hijos

Casa de Abuela

Abuela

Madre

Tío

Departamento Compartido

Amigos

\#\# \*\*16.04 Independencia\*\* {\#independencia}

Cada hogar posee:

\- Roles

\- Planner

\- Finance

\- Presence

\- Inventory

\- Assets

\- HomeCloud

\- Feed

\- Automatizaciones

independientes.

\#\# \*\*16.05 Roles independientes\*\* {\#roles-independientes}

Un usuario puede ser:

Coordinador

↓

Hogar A

Adulto

↓

Hogar B

Invitado

↓

Hogar C

\#\# \*\*16.06 Cambio de hogar\*\* {\#cambio-de-hogar}

Existe selector de hogar.

\#\# \*\*16.07 Home\*\* {\#home-10}

Cada hogar posee su propio Home.

\#\# \*\*16.08 Notificaciones\*\* {\#notificaciones}

Las notificaciones indican a qué hogar pertenecen.

\#\# \*\*16.09 Memoria\*\* {\#memoria-2}

La memoria familiar pertenece al hogar.

Nunca se comparte automáticamente.

\#\# \*\*16.10 Search\*\* {\#search-1}

Geni Search puede buscar:

\- Dentro del hogar actual

\- Globalmente

según permisos.

\# \*\*17. EMPLEADO FAMILIAR\*\* {\#empleado-familiar-2}

\#\# \*\*17.01 Objetivo\*\* {\#objetivo-27}

Representar colaboradores operativos del hogar.

Ejemplos:

\- Niñera

\- Jardinero

\- Personal de limpieza

\- Cuidador

\- Chofer

\- Asistente doméstico

\#\# \*\*17.02 Filosofía\*\* {\#filosofía-10}

No forman parte de la familia.

Forman parte de la operación del hogar.

\#\# \*\*17.03 Rol\*\* {\#rol}

Empleado Familiar es un rol oficial.

\#\# \*\*17.04 Ingreso\*\* {\#ingreso}

Flujo:

Invitación

↓

Aceptación

↓

Asignación de horario

↓

Asignación de responsabilidades

↓

Ingreso

\#\# \*\*17.05 Onboarding\*\* {\#onboarding}

El onboarding es configurado inicialmente por el Coordinador.

\#\# \*\*17.06 Multi-hogar\*\* {\#multi-hogar-2}

Un Empleado Familiar puede pertenecer a múltiples hogares.

\#\# \*\*17.07 Responsabilidades\*\* {\#responsabilidades-1}

Las responsabilidades son asignadas por Coordinadores.

\#\# \*\*17.08 Horario laboral\*\* {\#horario-laboral}

Existe agenda laboral.

Ejemplo:

Lunes

09:00 \- 13:00

Miércoles

09:00 \- 13:00

Viernes

09:00 \- 13:00

\# \*\*PLANNER\*\* {\#planner-6}

\#\# \*\*17.09 Crear tareas\*\* {\#crear-tareas}

No puede crear tareas.

\#\# \*\*17.10 Puede\*\* {\#puede}

\- Completar tareas

\- Comentar tareas

\- Adjuntar evidencia

\# \*\*FINANCE\*\* {\#finance-6}

\#\# \*\*17.11 Registro laboral\*\* {\#registro-laboral}

Puede registrar:

\- Salario

\- Bonos

\- Horas

\- Historial de pagos

\#\# \*\*17.12 Historial\*\* {\#historial-1}

Los pagos quedan registrados.

\# \*\*PRESENCE\*\* {\#presence-6}

\#\# \*\*17.13 Filosofía\*\* {\#filosofía-11}

La visibilidad depende de la responsabilidad.

No del rol.

\#\# \*\*17.14 Ejemplos\*\* {\#ejemplos-7}

Niñera:

Puede ver ubicación de niños asignados.

Chofer:

Puede ver ubicación de la persona que debe recoger.

Personal de limpieza:

Normalmente no requiere ubicación.

\# \*\*GENI\*\* {\#geni-6}

\#\# \*\*17.15 Acceso\*\* {\#acceso}

Posee acceso limitado.

\#\# \*\*17.16 Puede consultar\*\* {\#puede-consultar}

Ejemplos:

¿Qué tareas tengo hoy?

¿Hay alguien en casa?

¿Cambió la agenda?

\#\# \*\*17.17 Restricción\*\* {\#restricción-1}

Sólo recibe información necesaria para trabajar.

\# \*\*DESVINCULACIÓN\*\*

\#\# \*\*17.18 Fin de relación\*\* {\#fin-de-relación}

Cuando deja de trabajar:

\- Se elimina acceso

\- Se conserva historial

\- Se conservan pagos

\- Se conservan tareas

\#\# \*\*17.19 Estados\*\* {\#estados-12}

\- Activo

\- Suspendido

\- Finalizado

\# \*\*18. HOME\*\* {\#home-11}

\#\# \*\*18.01 Objetivo\*\* {\#objetivo-28}

Home es el centro operativo del hogar.

Resume información.

No administra información.

\#\# \*\*18.02 Regla principal\*\* {\#regla-principal}

Toda información mostrada en Home debe conducir al módulo que la administra.

Modelo:

Toco información

↓

Voy al módulo correspondiente

\#\# \*\*18.03 Navegación contextual\*\* {\#navegación-contextual}

Ejemplos:

Mis tareas

↓

Planner

Próximos eventos

↓

Calendar

Meta

↓

Goals

Presupuesto excedido

↓

Finance

\#\# \*\*18.04 Filosofía\*\* {\#filosofía-12}

Home responde:

1\. ¿Cómo está el hogar?

2\. ¿Qué requiere atención?

3\. ¿Qué debo hacer yo?

4\. ¿Hay riesgo?

\*\*Home no administra información. Solo la resume y redirige.\*\*

\# \*\*ESTRUCTURA\*\* {\#estructura-2}

\#\# \*\*18.05 Bloques oficiales\*\* {\#bloques-oficiales}

Home se compone de (orden oficial):

1\. Briefing Geni

2\. Atención Requerida

3\. Carga Familiar

4\. Próximos Eventos

5\. Tareas (agrupadas por Responsabilidad)

6\. Finanzas Relevantes (condicional)

7\. Presence Resumido

8\. Actividad Familiar

\# \*\*BRIEFING\*\*

\#\# \*\*18.06 Posición\*\* {\#posición}

Siempre aparece primero.

\#\# \*\*18.07 Formato\*\* {\#formato-1}

Una única card.

\#\# \*\*18.08 Contenido\*\* {\#contenido-1}

Puede incluir:

\- Planner

\- Finance

\- Presence

\- Goals

\- Eventos

\- Alertas

\#\# \*\*18.09 Estado\*\* {\#estado-1}

Home recuerda estado del Briefing.

\#\# \*\*18.10 Comportamiento\*\* {\#comportamiento}

Existe:

\- Versión resumida permanente

\- Versión ampliada cuando existen cambios importantes

\# \*\*ATENCIÓN REQUERIDA\*\*

\#\# \*\*18.11 Objetivo\*\* {\#objetivo-29}

Centralizar elementos urgentes.

\#\# \*\*18.12 Ejemplos\*\* {\#ejemplos-8}

\- SOS

\- Tareas vencidas

\- Pagos vencidos

\- Aprobaciones pendientes

\- Vencimientos

\#\# \*\*18.13 Prioridad\*\* {\#prioridad-1}

Es el bloque más importante después del Briefing.

\# \*\*TAREAS\*\* {\#tareas-1}

\#\# \*\*18.14 Filosofía\*\* {\#filosofía-13}

Las tareas se muestran agrupadas por responsabilidad.

Ejemplo:

Mascotas

↓

Dar de comer

Sacar a pasear

Limpieza

↓

Barrer

\#\# \*\*18.15 Dinamismo\*\* {\#dinamismo}

Cuando las tareas se completan:

\- Los widgets desaparecen.

\- El Home se reorganiza automáticamente.

\#\# \*\*18.16 Estado final\*\* {\#estado-final}

Cuando no existen tareas:

Home puede mostrar una card positiva.

Ejemplo:

Todo al día.

\# \*\*PRESENCE\*\* {\#presence-7}

\#\# \*\*18.17 Objetivo\*\* {\#objetivo-30}

Mostrar contexto útil.

\#\# \*\*18.18 Ejemplos\*\* {\#ejemplos-9}

\- Quién está en casa.

\- Quién está en camino.

\- Quién llegó recientemente.

\# \*\*FINANZAS\*\*

\#\# \*\*18.19 Regla\*\* {\#regla}

No existe widget financiero permanente.

\#\# \*\*18.20 Aparece cuando\*\* {\#aparece-cuando}

\- Pago vencido

\- Meta en riesgo

\- Fondo completado

\- Presupuesto excedido

\# \*\*PERSONALIZACIÓN\*\* {\#personalización-1}

\#\# \*\*18.21 Filosofía\*\* {\#filosofía-14}

Home puede personalizarse.

Pero mantiene estructura base.

Geni es el motor principal de reorganización contextual.

\#\# \*\*18.22 Reglas\*\* {\#reglas}

La personalización no debe romper la experiencia.

El usuario \*\*no puede cambiar el punto de entrada\*\* de la app. Home siempre es la pantalla inicial.

\# \*\*ROLES\*\* {\#roles-1}

\#\# \*\*18.23 Home por rol\*\* {\#home-por-rol}

Cada rol recibe una experiencia adaptada.

\#\#\# \*\*Coordinador\*\* {\#coordinador-2}

Visión completa del hogar.

\#\#\# \*\*Adulto\*\* {\#adulto-2}

Visión operativa.

\#\#\# \*\*Adolescente\*\* {\#adolescente-2}

Más foco en tareas, eventos y coordinación.

\#\#\# \*\*Niño\*\* {\#niño-2}

Experiencia simplificada.

\#\#\# \*\*Adulto Mayor\*\* {\#adulto-mayor-2}

Experiencia adaptada con:

\- Briefing

\- Tareas

\- Eventos

\- Personas

\- Medicación

\- Recordatorios

\#\#\# \*\*Invitado\*\* {\#invitado-2}

Acceso mínimo.

\#\#\# \*\*Empleado Familiar\*\* {\#empleado-familiar-3}

Visión centrada en trabajo asignado.

\# \*\*PRIORIDAD\*\* {\#prioridad-2}

\#\# \*\*18.24 Motor de prioridad\*\* {\#motor-de-prioridad}

Orden oficial:

SOS

↓

Atención requerida

↓

Briefing

↓

Tareas

↓

Eventos

↓

Presence

↓

Actividad Familiar

\#\# \*\*18.25 Geni\*\* {\#geni-7}

Geni es el motor principal de personalización de Home.

Puede reorganizar contenido según contexto y relevancia.

\# \*\*19. NOTIFICACIONES\*\* {\#notificaciones-1}

\#\# \*\*19.01 Objetivo\*\* {\#objetivo-31}

Mantener a las personas informadas sobre eventos relevantes sin generar ruido innecesario.

\#\# \*\*19.02 Filosofía\*\* {\#filosofía-15}

HomePlus prioriza:

Información útil

sobre

Cantidad de notificaciones.

\#\# \*\*19.03 Categorías\*\* {\#categorías}

\#\#\# \*\*Planner\*\* {\#planner-7}

\- Tarea asignada

\- Tarea próxima a vencer

\- Tarea vencida

\- Comentario nuevo

\- Verificación requerida

\#\#\# \*\*Calendar\*\*

\- Evento próximo

\- Evento modificado

\- Evento cancelado

\#\#\# \*\*Finance\*\* {\#finance-7}

\- Pago próximo a vencer

\- Pago vencido

\- Presupuesto excedido

\- Meta en riesgo

\- Fondo completado

\#\#\# \*\*Presence\*\* {\#presence-8}

\- Llegó a lugar

\- Salió de lugar

\- Check-in recibido

\#\#\# \*\*Assets\*\* {\#assets-3}

\- Mantenimiento próximo

\- Mantenimiento vencido

\- Documento próximo a vencer

\#\#\# \*\*Inventory\*\* {\#inventory-3}

\- Stock bajo

\- Producto agotado

\- Medicamento próximo a vencer

\#\#\# \*\*HomeCloud\*\* {\#Homecloud-5}

\- Documento compartido

\- Comentario recibido

\#\#\# \*\*Feed\*\* {\#feed-2}

\- Comentario

\- Reacción

\- Mención

\#\#\# \*\*SOS\*\* {\#sos-3}

\- Activación

\- Cancelación

\- Escalado

\#\# \*\*19.04 Prioridades\*\* {\#prioridades-1}

\#\#\# \*\*Crítica\*\*

SOS

\#\#\# \*\*Alta\*\*

Aprobaciones

Pagos vencidos

Tareas vencidas

\#\#\# \*\*Media\*\*

Eventos

Comentarios

Cambios importantes

\#\#\# \*\*Baja\*\*

Actividad general

Feed

\#\# \*\*19.05 Configuración\*\* {\#configuración-1}

Cada usuario puede configurar:

\- Qué recibe

\- Cómo recibe

\- Horarios

\#\# \*\*19.06 Canales\*\* {\#canales}

\- Push

\- Email

\- In-App

\#\# \*\*19.07 Silenciamiento\*\* {\#silenciamiento}

Cada categoría puede silenciarse.

Excepto SOS.

\# \*\*20. OFFLINE\*\* {\#offline}

\#\# \*\*20.01 Objetivo\*\* {\#objetivo-32}

Permitir uso básico de HomePlus sin conexión.

\#\# \*\*20.02 Filosofía\*\* {\#filosofía-16}

Offline no busca replicar toda la plataforma.

Busca permitir continuidad operativa.

\#\# \*\*20.03 Disponible Offline\*\* {\#disponible-offline}

\#\#\# \*\*Planner\*\* {\#planner-8}

\- Ver tareas

\- Completar tareas

\- Crear comentarios

\#\#\# \*\*Calendar\*\*

\- Ver eventos

\#\#\# \*\*People\*\* {\#people-2}

\- Ver personas

\#\#\# \*\*Assets\*\* {\#assets-4}

\- Ver activos

\#\#\# \*\*Inventory\*\* {\#inventory-4}

\- Ver stock

\#\#\# \*\*HomeCloud\*\* {\#Homecloud-6}

\- Archivos descargados previamente

\#\# \*\*20.04 No disponible Offline\*\* {\#no-disponible-offline}

\- Presence en tiempo real

\- Feed en tiempo real

\- SOS

\- Sincronización instantánea

\- Geni online

\#\# \*\*20.05 Cola de sincronización\*\* {\#cola-de-sincronización}

Las acciones realizadas offline quedan pendientes.

\#\# \*\*20.06 Sincronización\*\* {\#sincronización}

Cuando vuelve internet:

Sin conexión

↓

Cambios locales

↓

Internet disponible

↓

Sincronización automática

\#\# \*\*20.07 Resolución de conflictos\*\* {\#resolución-de-conflictos}

Regla oficial:

Última modificación gana.

Last Write Wins.

\#\# \*\*20.08 Auditoría\*\* {\#auditoría-4}

Las acciones realizadas offline conservan:

\- Autor

\- Fecha original

\- Fecha de sincronización

\# \*\*21. ESTADOS\*\* {\#estados-13}

\#\# \*\*21.01 Objetivo\*\* {\#objetivo-33}

Definir estados oficiales de todas las entidades del sistema.

\# \*\*MEMBERSHIP\*\*

\#\# \*\*21.02 Membership\*\* {\#membership-1}

Estados:

\- Pendiente

\- Activa

\- Suspendida

\- Finalizada

\# \*\*TASK\*\*

\#\# \*\*21.03 Task\*\* {\#task-1}

Estados:

\- Pendiente

\- En progreso

\- Completada

\- Cancelada

\#\# \*\*21.04 Estado derivado\*\* {\#estado-derivado}

Vencida no es un estado.

Se calcula automáticamente.

\# \*\*EVENT\*\*

\#\# \*\*21.05 Event\*\* {\#event-1}

Estados:

\- Programado

\- Completado

\- Cancelado

\# \*\*GOAL\*\*

\#\# \*\*21.06 Goal\*\* {\#goal-2}

Estados:

\- Activa

\- Completada

\- Fallida

\# \*\*FONDO\*\*

\#\# \*\*21.07 Fondo\*\* {\#fondo-1}

Estados:

\- Activo

\- Completado

\- Cerrado

\# \*\*DEUDA\*\*

\#\# \*\*21.08 Deuda\*\* {\#deuda-1}

Estados:

\- Activa

\- Pagada

\- Vencida

\# \*\*AUTOMATIZACIÓN\*\*

\#\# \*\*21.09 Automatización\*\* {\#automatización-1}

Estados:

\- Activa

\- Pausada

\- Archivada

\# \*\*INVENTORY\*\* {\#inventory-5}

\#\# \*\*21.10 Inventory Item\*\* {\#inventory-item}

Estados:

\- Activo

\- Archivado

\# \*\*ASSET\*\*

\#\# \*\*21.11 Asset\*\* {\#asset-1}

Estados:

\- Activo

\- Inactivo

\- Archivado

\# \*\*MASCOTA\*\*

\#\# \*\*21.12 Mascota\*\* {\#mascota-1}

Estados:

\- Activa

\- Fallecida

\- Archivada

\# \*\*EMPLEADO FAMILIAR\*\* {\#empleado-familiar-4}

\#\# \*\*21.13 Empleado Familiar\*\* {\#empleado-familiar-5}

Estados:

\- Activo

\- Suspendido

\- Finalizado

\# \*\*DOCUMENTO\*\*

\#\# \*\*21.14 Documento\*\* {\#documento-2}

Estados:

\- Activo

\- Archivado

\- En papelera

\# \*\*SOS\*\* {\#sos-4}

\#\# \*\*21.15 SOS\*\* {\#sos-5}

Estados:

\- Activo

\- Cancelado

\- Cerrado

\# \*\*22. RELACIONES\*\* {\#relaciones-2}

\#\# \*\*22.01 Objetivo\*\* {\#objetivo-34}

Definir cómo se conectan las entidades principales del sistema.

\# \*\*PEOPLE\*\* {\#people-3}

\#\# \*\*22.02 Relaciones principales\*\* {\#relaciones-principales}

People ↔ Household

People ↔ Membership

People ↔ Role

People ↔ Presence

People ↔ Tasks

People ↔ Events

People ↔ Goals

People ↔ Finance

People ↔ HomeCloud

\# \*\*PLANNER\*\* {\#planner-9}

\#\# \*\*22.03 Planner\*\* {\#planner-10}

Task ↔ Persona

Task ↔ Responsabilidad

Task ↔ Goal

Task ↔ Subtasks

Task ↔ Comentarios

Task ↔ Adjuntos

Task ↔ Event

\#\# \*\*22.04 Goals\*\* {\#goals-1}

Goal ↔ Hitos

Goal ↔ Tasks

Goal ↔ Fondos

Goal ↔ Finance

\#\# \*\*22.05 Events\*\* {\#events}

Event ↔ Personas

Event ↔ Presence

Event ↔ HomeCloud

\# \*\*FINANCE\*\* {\#finance-8}

\#\# \*\*22.06 Finance\*\* {\#finance-9}

Cuenta ↔ Movimientos

Movimiento ↔ Persona

Movimiento ↔ Responsabilidad

Movimiento ↔ Goal

Movimiento ↔ Fondo

Movimiento ↔ Asset

\#\# \*\*22.07 Fondos\*\* {\#fondos-1}

Fondo ↔ Goal

Fondo ↔ Cuenta

\#\# \*\*22.08 Deudas\*\* {\#deudas-1}

Deuda ↔ Persona

Deuda ↔ Familia

\# \*\*PRESENCE\*\* {\#presence-9}

\#\# \*\*22.09 Presence\*\* {\#presence-10}

Presence ↔ Persona

Presence ↔ Lugar

Presence ↔ Check-in

Presence ↔ SOS

\# \*\*INVENTORY\*\* {\#inventory-6}

\#\# \*\*22.10 Inventory\*\* {\#inventory-7}

Inventory Item ↔ Categoría

Inventory Item ↔ Planner

Inventory Item ↔ Finance

\# \*\*ASSETS\*\* {\#assets-5}

\#\# \*\*22.11 Assets\*\* {\#assets-6}

Asset ↔ Persona

Asset ↔ Finance

Asset ↔ Planner

Asset ↔ HomeCloud

Asset ↔ Mantenimiento

\# \*\*HomeCLOUD\*\* {\#Homecloud-7}

\#\# \*\*22.12 HomeCloud\*\* {\#Homecloud-8}

Documento ↔ Persona

Documento ↔ Asset

Documento ↔ Goal

Documento ↔ Evento

Documento ↔ Gasto

\#\# \*\*22.13 Recuerdos\*\* {\#recuerdos-1}

Recuerdo ↔ Personas

Recuerdo ↔ Álbum

Recuerdo ↔ Feed

\# \*\*FEED\*\* {\#feed-3}

\#\# \*\*22.14 Feed\*\* {\#feed-4}

Post ↔ Comentarios

Post ↔ Reacciones

Post ↔ Personas

\# \*\*SOS\*\* {\#sos-6}

\#\# \*\*22.15 SOS\*\* {\#sos-7}

SOS ↔ Presence

SOS ↔ Personas

SOS ↔ Notificaciones

\# \*\*GENI\*\* {\#geni-8}

\#\# \*\*22.16 Geni\*\* {\#geni-9}

Geni ↔ Todo el ecosistema

respetando permisos.

\# \*\*23. AUDITORÍA\*\* {\#auditoría-5}

\#\# \*\*23.01 Objetivo\*\* {\#objetivo-35}

Registrar cambios importantes del sistema.

\#\# \*\*23.02 Filosofía\*\* {\#filosofía-17}

Nada importante desaparece.

Debe poder reconstruirse qué ocurrió.

\#\# \*\*23.03 Información registrada\*\* {\#información-registrada}

\- Autor

\- Fecha

\- Hora

\- Acción

\- Entidad afectada

\#\# \*\*23.04 Ejemplos\*\* {\#ejemplos-10}

Juan creó tarea.

Mamá cambió vencimiento.

Papá completó tarea.

Geni sugirió automatización.

\#\# \*\*23.05 Planner\*\* {\#planner-11}

Auditar:

\- Creación

\- Edición

\- Asignación

\- Reasignación

\- Completado

\#\# \*\*23.06 Finance\*\* {\#finance-10}

Auditar:

\- Gastos

\- Ingresos

\- Ajustes

\- Fondos

\- Deudas

\#\# \*\*23.07 Presence\*\* {\#presence-11}

Auditar:

\- Check-ins

\- Cambios manuales relevantes

\#\# \*\*23.08 HomeCloud\*\* {\#Homecloud-9}

Auditar:

\- Subidas

\- Eliminaciones

\- Restauraciones

\#\# \*\*23.09 Roles\*\* {\#roles-2}

Auditar:

\- Cambios de rol

\- Ingresos

\- Expulsiones

\#\# \*\*23.10 Conservación\*\* {\#conservación}

La auditoría nunca se elimina.

\# \*\*24. NAVEGACIÓN\*\* {\#navegación}

\#\# \*\*24.01 Objetivo\*\* {\#objetivo-36}

Permitir acceder rápidamente a cualquier área del ecosistema.

\#\# \*\*24.02 Filosofía\*\* {\#filosofía-18}

La navegación existe para \*\*reducir coordinación\*\*.

No existe para exponer funcionalidades.

El usuario nunca debe pensar: "¿Dónde está el módulo?"

Debe pensar: "Necesito hacer esto." Y llegar en la menor cantidad de pasos posible.

Modelo mental oficial:

ATENCIÓN → ACCIÓN → EXPLORACIÓN

No: MÓDULO → SUBMÓDULO → DATO

\#\# \*\*24.03 Arquitectura global — Niveles\*\* {\#arquitectura-niveles}

| Nivel | Nombre | Ejemplos |  
|-------|--------|----------|  
| 0 | Home | Centro operativo |  
| 1 | Navegación principal | Bottom Nav, More |  
| 2 | Dominio | Tasks, Calendar, Finance |  
| 3 | Vista específica | Task Detail, Event Detail |  
| 4 | Acción puntual | Editar tarea, Cambiar responsable |

\*\*Regla oficial:\*\* Más de 4 niveles es fallo de navegación.

\*\*Objetivo:\*\* 95% de acciones ≤ 3 niveles.

\#\# \*\*24.04 Bottom Navigation — Congelado V1\*\* {\#bottom-navigation}

\`\`\`  
\[ Home \]  \[ People \]  \[ \+ \]  \[ Planner \]  \[ More \]  
\`\`\`

\- \*\*Home\*\* → Atención actual. Lo importante ahora.  
\- \*\*People\*\* → Coordinación humana. Feed \+ Presence \+ Personas.  
\- \*\*+\*\* → Quick Actions. Panel de acción rápida.  
\- \*\*Planner\*\* → Ejecución. Tasks \+ Calendar \+ Goals.  
\- \*\*More\*\* → Herramientas especializadas. Finance \+ Inventory \+ HomeCloud \+ Settings.

\*\*Regla:\*\* No todos los dominios merecen estar en navegación primaria. La frecuencia de uso define visibilidad.

\#\# \*\*24.05 Jerarquía de frecuencia — Tiers\*\* {\#frecuencia-tiers}

| Tier | Frecuencia | Módulos |  
|------|-----------|---------|  
| Tier 1 | Diario | Home, Tasks, Calendar, Feed |  
| Tier 2 | Semanal | Finance, Goals, Presence |  
| Tier 3 | Ocasional | Documents, Inventory |  
| Tier 0 | Especial (siempre disponibles) | SOS, Geni |

Los módulos Tier 1 tienen acceso más directo. Los Tier 3 viven dentro de More.

\#\# \*\*24.06 Home\*\* {\#home-12}

Punto de entrada principal. Siempre es la pantalla inicial. El usuario no puede cambiarlo.

\#\# \*\*24.07 People — Estructura interna\*\* {\#people-nav}

\`\`\`  
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
\`\`\`

Feed no es un tab independiente en Bottom Nav. Vive dentro de People.

\#\#\# Perfil individual

\`\`\`  
Persona

├─ Resumen  
├─ Tareas  
├─ Eventos  
├─ Goals (metas, progreso y logros)  
├─ Presence  
├─ Actividad  
└─ Responsabilidades  
\`\`\`

\#\# \*\*24.08 Planner — Estructura interna\*\* {\#planner-nav}

\`\`\`  
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
\`\`\`

\*\*Responsabilidades:\*\* NO son un dominio independiente. Son una propiedad de la tarea y un eje organizador dentro de Tasks. Una tarea siempre tiene una Responsabilidad asociada.

\*\*Goals:\*\* Vive dentro de Planner, no como dominio independiente.

\#\# \*\*24.09 Quick Actions — Congelado V1\*\* {\#quick-actions}

El botón \*\*+\*\* central en Bottom Navigation abre un panel flotante con blur del fondo.

\*\*Rol de Geni en Quick Actions:\*\*

Geni es el \*\*único elemento fijo\*\* del menú. Al tocar Geni → abre la pantalla completa de Geni.

Geni NO tiene tab propio en Bottom Nav ni botón global dedicado. Está presente en toda la app de forma transversal y tiene acceso vía Quick Actions como punto de entrada principal.

\*\*SOS NO está en Quick Actions.\*\* Tiene acceso propio (swipe ↑ global).

\#\#\# Estructura

\`\`\`  
\+

├─ 🤖 Geni (fijo, siempre primero)  
├─ Acción dinámica 1  
├─ Acción dinámica 2  
├─ Acción dinámica 3  
→ (scroll horizontal para ver más)  
\`\`\`

\#\#\# Orden de acciones

1\. Fijadas por el usuario (📌)  
2\. Más usadas  
3\. Menos usadas

\#\#\# Motor de aprendizaje

El sistema registra frecuencia de uso, recencia, rol del usuario y contexto actual. Reordena automáticamente.

\#\#\# Acciones posibles

\`\`\`  
Crear tarea  
Crear evento  
Registrar gasto  
Crear tema  
Check-in  
Escanear documento  
Subir archivo  
Ver pendientes  
\`\`\`

\#\#\# Acciones condicionales (según rol y permisos)

\`\`\`  
Invitar miembro  
Crear objetivo  
Registrar inventario  
Crear presupuesto  
\`\`\`

\#\#\# Personalización

\- Durante onboarding: sugerencias de acciones por rol.  
\- El usuario puede fijar acciones (📌 Fijar).  
\- El sistema aprende y adapta el orden solo.

\#\# \*\*24.10 Search Global\*\* {\#search-global}

Search es el \*\*navegador interno de la app\*\*. Accesible desde cualquier pantalla.

No vive en el Bottom Nav. Es una capacidad universal de la app.

\#\#\# Alcance

Busca en: Personas, Tasks, Events, Goals, Responsabilidades, Gastos, Presupuestos, Fondos, Documentos, Fotos, Videos, Inventario, Configuraciones, Hogares, Temas, Acciones ejecutables directamente.

\#\#\# Comportamiento

Resultados agrupados por categoría.

Search también ejecuta acciones:

\`\`\`  
"crear tarea" → ➕ Crear tarea (ejecutable)  
"invitar miembro" → ejecutable  
"agregar gasto" → ejecutable  
\`\`\`

Search indexa Settings:

\`\`\`  
"notificaciones" → Settings → Notificaciones (acceso directo)  
"privacidad" → Settings → Privacidad  
\`\`\`

\#\# \*\*24.11 SOS — Congelado V1\*\* {\#sos-nav}

\*\*Acceso:\*\* Swipe ↑ desde la parte inferior (global). Disponible en toda la app desde cualquier pantalla. No vive en Bottom Nav. No vive en Quick Actions.

SOS siempre abre un \*\*panel\*\*. Nunca dispara una alerta directa.

\#\#\# Panel

\`\`\`  
SOS Panel

├─ 🔴 Emergencia grave  
├─ 🟠 Necesito ayuda  
├─ 🟡 Coordinación urgente  
└─ Cancelar / Salir  
\`\`\`

\#\#\# Niveles

\*\*🔴 Emergencia grave:\*\* Riesgo físico o situación crítica. Notificación máxima → todos los adultos → contactos de emergencia → ubicación automática.

\*\*🟠 Necesito ayuda:\*\* Problema importante sin riesgo inmediato. Notificación fuerte → confirmación de recepción → seguimiento activo.

\*\*🟡 Coordinación urgente:\*\* No es emergencia, requiere coordinación rápida. Notificación prioritaria → personas relevantes → no escala a todos automáticamente.

\#\#\# Regla de escalamiento

\`\`\`  
Nivel bajo → responsables de contexto  
Nivel medio → adultos \+ responsables  
Nivel alto → todos los adultos \+ contactos de emergencia  
\`\`\`

\#\#\# Permisos por rol

| Rol | 🔴 | 🟠 | 🟡 |  
|-----|----|----|-----|  
| Coordinador | ✔ | ✔ | ✔ |  
| Adulto | ✔ | ✔ | ✔ |  
| Adolescente | ✔ | ✔ | ✔ |  
| Niño | ✗ | ✔ | ✔ |  
| Adulto Mayor | ✔ | ✔ | ✔ |  
| Empleado Familiar | ✗ | ✔ | ✔ |

\#\#\# Cancelación

Permitida. Al cancelar → el sistema pide motivo.

Motivos posibles: error / falsa alarma / lo resolví / me equivoqué.

\#\#\# Categorías de SOS

\`\`\`  
Salud  
Seguridad  
Transporte  
Familia  
Logística  
\`\`\`

Alimentan: prioridades, responsables automáticos, automatizaciones, historial de riesgos.

\#\#\# Regla de niveles

No existe cuarto nivel. Violencia y peligro extremo entran en 🔴 Emergencia grave.

\*\*Niños y empleados familiares no pueden emitir Emergencia grave directamente.\*\*

\#\#\# Modo offline

\`\`\`  
Si no hay internet:  
↓  
Guardar alerta local  
↓  
Reintentar envío  
↓  
WhatsApp (fallback si disponible)  
↓  
SMS (fallback)  
↓  
Llamada directa  
\`\`\`

\#\# \*\*24.12 More — Estructura oficial\*\* {\#more-nav}

More NO es un descarte. Es la sección de \*\*herramientas especializadas\*\* — módulos importantes que se usan con menor frecuencia diaria.

\`\`\`  
More

💰 Finance  
📦 Inventory  
☁ HomeCloud  
⚙ Settings  
\`\`\`

Cada módulo se muestra como card con nombre y línea de contexto secundaria (indicador de estado, no contenido consumible).

\*\*Regla:\*\* More no contiene dashboards. Solo accesos a dominios \+ indicadores rápidos opcionales.

\#\# \*\*24.13 Multi-Hogar — Selector Global\*\* {\#multi-hogar-nav}

Multi-Hogar \*\*no vive en More\*\*. Vive como selector global en el header.

\*\*Si el usuario pertenece a 1 solo hogar:\*\* Header limpio, solo Avatar. No se muestra selector.

\*\*Si el usuario pertenece a 2 o más hogares:\*\* Aparece automáticamente el nombre del hogar activo con dropdown.

\`\`\`  
Header → \[Avatar\]    \[Familia Bazan ▼\]  
\`\`\`

\*\*Avatar\*\* → acceso al perfil personal.

\*\*Nombre de hogar\*\* → cambio de contexto. Son dos cosas distintas y no se mezclan.

No existe navegación cruzada entre hogares. Cada hogar es una entidad independiente.

\#\# \*\*24.14 Geni — Rol en navegación\*\* {\#geni-nav}

\*\*Geni NO tiene tab dedicado en Bottom Nav.\*\*

\*\*Geni NO tiene botón global propio.\*\*

Geni está en todos lados:

\- Home usa Geni (Briefing).  
\- Search usa Geni.  
\- Quick Actions accede a Geni (slot fijo).  
\- Planner usa Geni.  
\- Finance usa Geni.  
\- HomeCloud usa Geni.  
\- Automatizaciones usan Geni.

\*\*Acceso principal:\*\* Quick Actions → Geni (fijo, siempre presente). Al tocar → abre pantalla completa de Geni.

\#\#\# Pantalla de Geni

\`\`\`  
Geni

├─ Chat  
├─ Acciones sugeridas  
├─ Insights familiares  
├─ Historial  
└─ Configuración IA  
\`\`\`

\#\# \*\*24.15 Settings — Ubicación\*\* {\#settings-nav}

Settings vive \*\*exclusivamente en More\*\*.

No aparece en Bottom Nav. No tiene acceso desde Home.

Acceso rápido disponible mediante Search (indexa configuraciones).

\#\#\# Estructura

\`\`\`  
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
\`\`\`

\#\# \*\*24.16 Reglas globales de navegación\*\* {\#reglas-globales}

\#\#\# Tabs

Usar cuando todas las vistas pertenecen al mismo objeto mental.

\`\`\`  
Correcto: Mis tareas | Familia | Completadas  
Incorrecto: Tasks | Finance | Documents (esos son dominios)  
\`\`\`

Máximo 5 tabs por dominio.

\#\#\# Stacks

Usar para profundizar dentro de un dominio:

\`\`\`  
Tasks → Task Detail → Edit Task → History  
\`\`\`

\#\#\# Modales

Solo para acciones cortas: crear tarea, crear gasto, crear evento, confirmar check-in.

Nunca para navegación completa.

\#\#\# Drawers

Uso extremadamente limitado. Solo para: filtros, opciones contextuales, acciones secundarias. Nunca como navegación principal. Mobile-first.

\#\#\# Navegación entre dominios

Las entidades deben estar enlazadas:

\`\`\`  
Tarea → Evento relacionado → Documento relacionado → Responsable → Conversación Geni  
\`\`\`

HomePlus se comporta como una red de entidades conectadas, no como carpetas aisladas.

\#\# \*\*24.17 Navegación por Rol — Resumen\*\* {\#navegacion-por-rol}

\#\#\# Coordinador

Ve: estado operativo completo, distribución de carga, riesgos, responsabilidades, gestión de miembros.

\#\#\# Adulto

Ve: responsabilidades propias \+ contexto familiar.

\#\#\# Adolescente

Prioridad: sus tareas, sus eventos, sus objetivos. Menos contexto global.

\#\#\# Niño

Prioridad: tareas, logros, recordatorios. Mínima profundidad.

\#\#\# Adulto Mayor

Prioridad: medicación, transporte, eventos, contactos. Experiencia adaptada.

\#\#\# Invitado

Solo contexto autorizado. Sin navegación completa.

\#\#\# Empleado Familiar

Visión centrada en trabajo asignado.

\#\# \*\*24.18 Sugerencia contextual — Compras Cerca\*\* {\#sugerencia-compras}

Feature derivada de navegación inteligente. Pendiente de spec técnico.

\`\`\`  
Responsabilidad: Compras  
↓  
Items pendientes: Leche, Pan, Arroz  
↓  
HomePlus detecta: usuario está a 150 metros de un supermercado  
↓  
Sugerencia: "¿Ya que estás cerca, querés comprar los productos pendientes?"  
\`\`\`

Este flujo nace desde la Responsabilidad, no desde una Tarea individual.

\#\# \*\*24.19 Responsive\*\* {\#responsive}

Mobile First confirmado.

Tablet: 2 columnas.

Desktop: sidebar (pendiente confirmación final).

\#\# \*\*24.20 Decisiones pendientes de cierre\*\* {\#pendientes-nav}

1\. \*\*Finance navegación interna\*\* — Tabs oficiales de Finance  
2\. \*\*Presence navegación interna\*\* — Confirmación de tabs finales  
3\. \*\*Home Strategy\*\* — Revisión del Priority Engine y widgets dinámicos  
4\. \*\*Notificaciones\*\* — Inbox, agrupación, categorías  
5\. \*\*Responsive desktop\*\* — Sidebar (Mobile first y tablet 2 columnas confirmados)

\# \*\*25. DECISIONES CONGELADAS\*\* {\#decisiones-congeladas}

\#\# \*\*25.01 Principio\*\* {\#principio}

Toda decisión incluida en este documento se considera congelada.

\#\# \*\*25.02 Cambios\*\* {\#cambios}

Las modificaciones futuras deben:

\- Registrar motivo.

\- Registrar fecha.

\- Registrar responsable.

\#\# \*\*25.03 Filosofía de producto\*\* {\#filosofía-de-producto}

HomePlus es:

\- Un sistema operativo familiar.

\- No una app de tareas.

\- No una app financiera.

\- No una red social.

\#\# \*\*25.04 Geni\*\* {\#geni-10}

Geni es transversal.

No es un módulo aislado.

\#\# \*\*25.05 Home\*\* {\#home-13}

Home informa.

Los módulos administran.

\#\# \*\*25.06 Datos\*\* {\#datos}

Los datos pertenecen al usuario.

Siempre deben poder:

\- Exportarse.

\- Descargarse.

\- Recuperarse.

\#\# \*\*25.07 Arquitectura\*\* {\#arquitectura}

Todos los dominios deben poder relacionarse entre sí.

Se evita la creación de módulos aislados.

\#\# \*\*25.08 Regla final\*\* {\#regla-final}

Si una decisión futura contradice este documento:

Este documento tiene prioridad hasta que exista una nueva versión canónica aprobada.

\# \*\*FIN \--- DOCUMENTO MAESTRO CANONICAL V1\*\* {\#fin-documento-maestro-canonical-v1}

Con esto queda consolidado el contexto completo del proyecto HomePlus tal como fue definido durante todas las sesiones de diseño y toma de decisiones.  
