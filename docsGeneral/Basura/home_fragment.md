# HOME fragment — HomePlus — FinalSpec

## 1. Información encontrada

### Objetivo del módulo

Home es el centro operativo del hogar. Resume información y no administra información.

Home responde:

1. Cómo está el hogar.
2. Qué requiere atención.
3. Qué debe hacer el usuario.
4. Si hay riesgo.

### Entidades

- **Home**
  - Pantalla inicial.
  - Centro operativo.
  - Resume información y redirige al módulo correspondiente.
- **Briefing**
  - Card ubicada primero.
  - En MVP debe tratarse como MOCK.
- **Task**
  - Aparece en Home como tareas pendientes o tareas agrupadas por responsabilidad.
- **Event**
  - Aparece en Home como próximos eventos.
- **Carga Familiar**
  - Bloque oficial de Home.
  - En MVP debe tratarse como MOCK.
- **Presence resumido**
  - Bloque oficial de Home.
  - En MVP debe tratarse como MOCK.
- **Actividad Familiar**
  - Bloque oficial de Home.
  - En MVP debe tratarse como MOCK.

### Campos

No se encontraron campos técnicos de Home.

Bloques dentro del alcance MVP encontrados:

- Briefing.
- Carga Familiar.
- Próximos Eventos.
- Tareas agrupadas por Responsabilidad.
- Presence Resumido.
- Actividad Familiar.

### Reglas de negocio

- Home resume información.
- Home no administra información.
- Toda información mostrada en Home debe conducir al módulo que la administra.
- Home siempre es la pantalla inicial.
- El usuario no puede cambiar el punto de entrada de la app.
- Home mantiene estructura base aunque exista personalización.
- Las tareas se muestran agrupadas por responsabilidad.
- Cuando las tareas se completan, los widgets desaparecen.
- Cuando las tareas se completan, Home se reorganiza automáticamente.
- Cuando no existen tareas, Home puede mostrar una card positiva.

### Navegación contextual

Ejemplos encontrados dentro del alcance MVP:

- Mis tareas → Planner.
- Próximos eventos → Calendar.

### Home por rol

#### Coordinator / Coordinador

- Visión completa del hogar.

#### Adult / Adulto

- Visión operativa.

#### Adolescent / Adolescente

- Más foco en tareas, eventos y coordinación.

#### Child / Niño

- Experiencia simplificada.

#### Senior / Adulto Mayor

Experiencia adaptada con:

- Briefing.
- Tareas.
- Eventos.
- Personas.
- Medicación.
- Recordatorios.

#### Guest / Invitado

- Acceso mínimo.

### Flujos

#### Ver Home

Información encontrada:

- Home es pantalla inicial.
- Home resume información.
- Home redirige a módulos administradores.

#### Ver tareas pendientes

Información encontrada:

- Las tareas se muestran agrupadas por responsabilidad.
- Ejemplo de agrupación:
  - Mascotas.
  - Limpieza.
- Cuando las tareas se completan, los widgets desaparecen.
- Cuando no existen tareas, Home puede mostrar “Todo al día”.

#### Ver próximos eventos

Información encontrada:

- Próximos eventos aparece como navegación contextual.
- Próximos eventos redirige a Calendar.

#### Ver resumen del hogar

Información encontrada:

- Home es centro operativo.
- Home responde cómo está el hogar.
- Home responde qué requiere atención.
- Home responde qué debe hacer el usuario.
- Home responde si hay riesgo.

### APIs

No se encontraron endpoints, rutas, métodos, request, response ni errores para Home.

Acciones mencionadas sin contrato API:

- Ver Home.
- Ver tareas desde Home.
- Ver próximos eventos desde Home.
- Ir desde Home al módulo correspondiente.

### UI

#### Pantalla Home

- Home es punto de entrada principal.
- Home siempre es la pantalla inicial.
- El usuario no puede cambiarlo.

#### Briefing

- Siempre aparece primero.
- Formato: una única card.
- Existe versión resumida permanente.
- Existe versión ampliada cuando hay cambios importantes.

Para MVP, esta card debe simularse.

#### Tareas

- Tareas agrupadas por Responsabilidad.
- Home puede mostrar una card positiva cuando no hay tareas.

#### Próximos eventos

- Bloque oficial de Home.
- Redirige a Calendar.

#### Presence resumido

- Muestra contexto útil.
- Ejemplos encontrados:
  - Quién está en casa.
  - Quién está en camino.
  - Quién llegó recientemente.

Para MVP, este bloque debe simularse.

#### Actividad Familiar

- Aparece como bloque oficial de Home.
- No se encontró estructura detallada.

Para MVP, este bloque debe simularse.

### Componentes UI

Componentes encontrados dentro del alcance:

- Card de Briefing.
- Bloque de Carga Familiar.
- Bloque de Próximos Eventos.
- Bloque de Tareas agrupadas por Responsabilidad.
- Bloque de Presence Resumido.
- Bloque de Actividad Familiar.
- Card positiva “Todo al día” cuando no existen tareas.

### Estados

#### Briefing

- Home recuerda estado del Briefing.
- Versión resumida permanente.
- Versión ampliada cuando existen cambios importantes.

#### Tareas en Home

- Con tareas pendientes: se muestran widgets/bloques de tareas.
- Sin tareas: puede mostrarse card positiva.
- Al completar tareas: widgets desaparecen y Home se reorganiza.

#### Activity / Presence / Carga Familiar

- No se encontraron estados técnicos.

### Permisos

- Home adapta experiencia por rol.
- Guest tiene acceso mínimo.
- Child tiene experiencia simplificada.
- Senior tiene experiencia adaptada.
- Coordinator tiene visión completa del hogar.
- Adult tiene visión operativa.
- Adolescent tiene más foco en tareas, eventos y coordinación.

No se encontró matriz de visibilidad por widget.

### Dependencias

Home depende de:

- Planner para tareas.
- Calendar para próximos eventos.
- Roles para adaptar experiencia.

Para los bloques MOCK del MVP, Home no debe depender de lógica real.

### Restricciones arquitectónicas

- Home informa.
- Home no administra.
- Los módulos dueños administran la información.
- Toda card o bloque debe redirigir al módulo correspondiente cuando se interactúa.
- Home no debe reemplazar la administración del módulo fuente.
- Home siempre es la pantalla inicial.

### Datos mockeados

#### Briefing

Debe simularse en MVP con:

- Texto fijo.
- Datos simples.
- Ejemplo permitido por alcance MVP: “Hoy tienes 3 tareas y 2 eventos.”

No debe implementarse lógica real de generación.

#### Carga Familiar

Debe simularse en MVP con:

- Datos dummy.

No debe implementarse cálculo real.

#### Presence

Debe simularse en MVP con:

- Datos dummy.

No debe implementarse lógica real.

#### Actividad Familiar

Debe simularse en MVP con:

- Datos dummy.

No debe implementarse actividad real.

### Funcionalidades REAL

- Ver Home.
- Mostrar resumen del hogar.
- Mostrar próximos eventos.
- Mostrar tareas pendientes.
- Agrupar tareas por Responsabilidad.
- Redirigir desde Home al módulo administrador.
- Mostrar estado positivo cuando no hay tareas.
- Adaptar experiencia por rol a nivel conceptual.

### Funcionalidades MOCK

- Briefing.
- Carga Familiar.
- Presence.
- Actividad Familiar.

### Funcionalidades POST_MVP

- Personalización contextual avanzada.
- Motor de prioridad avanzado.
- Reorganización inteligente real de contenido.
- Cálculo real de Carga Familiar.
- Lógica real de Presence.
- Generación real de Briefing.
- Actividad Familiar real.

## 2. Clasificación para implementación

### REAL

- Home como pantalla inicial.
- Home como centro operativo.
- Home resume y redirige.
- Home no administra información.
- Próximos eventos.
- Tareas pendientes.
- Tareas agrupadas por Responsabilidad.
- Resumen del hogar.
- Card positiva cuando no existen tareas.
- Redirección:
  - Mis tareas → Planner.
  - Próximos eventos → Calendar.
- Experiencia por rol a nivel conceptual.

### MOCK

- Briefing con texto fijo o datos simples.
- Carga Familiar con datos dummy.
- Presence con datos dummy.
- Actividad Familiar con datos dummy.

### POST_MVP

- Briefing con lógica real.
- Carga Familiar con cálculo real.
- Presence con lógica real.
- Actividad Familiar con datos reales.
- Personalización contextual avanzada.
- Motor de prioridad avanzado.

### IGNORAR

No se incorpora contenido clasificado fuera de alcance.

## 3. Información faltante

- No se encontró endpoint de Home.
- No se encontró request/response de Home.
- No se encontró contrato para obtener resumen del hogar.
- No se encontró contrato para próximos eventos.
- No se encontró contrato para tareas pendientes.
- No se encontró estructura de datos de Briefing mock.
- No se encontró estructura de datos de Carga Familiar mock.
- No se encontró estructura de datos de Presence mock.
- No se encontró estructura de datos de Actividad Familiar mock.
- No se encontró matriz de visibilidad de widgets por rol.
- No se encontró orden MVP reducido para mostrar solo bloques reales y mocks permitidos.
- No se encontró estado vacío para próximos eventos.
- No se encontró estado vacío para actividad familiar.
- No se encontró definición formal de “resumen del hogar”.
- No se encontró definición de límites de cantidad de tareas/eventos visibles.
- No se encontró si los bloques son configurables en MVP.
- No se encontró navegación exacta al tocar cada card.

## 4. Fuente

- Archivo: `HomePlus — FinalSpec(1).md`
- Sección: `02.12 Home como centro operativo`
- Sección: `18.01 Objetivo`
- Sección: `18.02 Regla principal`
- Sección: `18.03 Navegación contextual`
- Sección: `18.04 Filosofía`
- Sección: `18.05 Bloques oficiales`
- Sección: `18.06 Posición`
- Sección: `18.07 Formato`
- Sección: `18.08 Contenido`
- Sección: `18.09 Estado`
- Sección: `18.10 Comportamiento`
- Sección: `18.14 Filosofía`
- Sección: `18.15 Dinamismo`
- Sección: `18.16 Estado final`
- Sección: `18.17 Objetivo`
- Sección: `18.18 Ejemplos`
- Sección: `18.23 Home por rol`
- Sección: `18.24 Motor de prioridad`
- Sección: `24.06 Home`
- Archivo: `Final Spec(1).txt`
- Sección: `OUTPUT 2 — CORE ENTITIES`
- Sección: `OUTPUT 3 — CANONICAL RELATIONSHIPS`
- Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`
- Archivo: `source_map_HomePlus_FinalSpec(1).md`
- Sección: `4.11 HOME`
