# frontend_antigravity_implementation_prompts.md

## 0. Propósito del documento

Este documento reúne los **prompts por fases para que Antigravity implemente el rediseño frontend premium de HomePlus MVP** sin romper la lógica real existente.

Debe usarse como documento operativo para trabajar fase por fase, con cambios pequeños, revisables y commiteables por separado.

Base documental destilada:

- `frontend_premium_design_system_v1.md`
- `frontend_navigation_shell_v1.md`
- `frontend_home_ux_final.md`
- `frontend_planner_ux_final.md`
- `frontend_auth_household_profile_polish.md`
- `frontend_premium_extraction_index.md` como apoyo de alcance

El master bruto `frontend_all_extractions_master.md` queda como respaldo, no como fuente principal para implementación.

---

## 1. Principio general de implementación

El rediseño premium debe mejorar la percepción visual, la jerarquía, la claridad, la navegación y los estados UI sin tocar la lógica real que ya funciona.

Principio rector:

> Rediseñar la piel y la experiencia de uso sin cambiar el corazón funcional del MVP.

Traducción práctica:

- No tocar backend.
- No cambiar endpoints.
- No cambiar migraciones.
- No tocar `.env`.
- No usar Supabase directo desde pantallas nuevas.
- No reescribir toda la app.
- No romper Auth, Household ni Planner real.
- No eliminar funcionalidad real aunque visualmente se reorganice.
- No convertir mocks en backend real.
- No instalar dependencias sin pedir confirmación.
- Cada fase debe poder commitearse separada.
- Cada fase debe terminar con `npx.cmd tsc --noEmit`.
- Cada fase debe reportar archivos modificados, bugs encontrados, bugs corregidos y limitaciones.

---

## 2. Cómo usar estos prompts

Cada fase está pensada para copiarse en Antigravity como prompt independiente.

Orden recomendado:

1. Fase 0 — Auditoría técnica previa.
2. Fase 1 — Design System Base.
3. Fase 2 — Navigation Shell.
4. Fase 3 — Planner Visual.
5. Fase 4 — Home Visual.
6. Fase 5 — Auth / Household / Profile Polish.
7. Fase 6 — Motion / Haptics / QA.

No avanzar a una fase posterior si la anterior deja TypeScript roto.

Si Antigravity detecta que falta una dependencia visual, debe reportarlo y proponer alternativa con lo instalado. No debe instalarla automáticamente.

Si una fase requiere tocar un archivo no permitido, debe detenerse y explicarlo.

---

## 3. Reglas globales para todos los prompts

Estas reglas deben pegarse o mantenerse como contexto en todas las fases.

### 3.1 Reglas absolutas

- No tocar backend.
- No tocar `backend/`.
- No tocar `supabase/`.
- No tocar migraciones.
- No tocar `.env`, `.env.local`, `.env.example` ni secretos.
- No cambiar endpoints.
- No cambiar contratos de request/response.
- No introducir Supabase directo en pantallas o componentes.
- No reemplazar services reales por mocks.
- No romper login/register/logout.
- No romper `/api/auth/me` ni navegación derivada de `navigation.next`.
- No romper crear hogar.
- No romper join household por invite link.
- No romper pending approval.
- No romper approve/reject de solicitudes.
- No romper Tasks reales.
- No romper Events reales.
- No cambiar lógica de negocio real.
- No borrar componentes existentes si todavía se usan.
- No instalar dependencias sin pedir confirmación.
- No reescribir toda la app de una.

### 3.2 Reglas de servicios

- Mantener los services existentes como fuente de datos.
- Solo adaptar imports o props si es estrictamente necesario para conectar UI nueva.
- No cambiar nombres de funciones públicas de services.
- No cambiar shape de datos esperado por pantallas reales.
- No mezclar datos mock con datos reales dentro de services reales.
- Los mocks visuales deben vivir en archivos claramente separados, por ejemplo `mockHomeData`, `mockModulesData`, `mockGoalsData`, si el repo ya tiene patrón similar.
- Si ya existen mocks, reutilizarlos o reorganizarlos sin romper imports.

### 3.3 Reglas visuales

- Usar el Design System como fuente visual única.
- No inventar paletas por pantalla.
- No usar colores hardcodeados fuera de tokens salvo casos mínimos existentes que no convenga tocar en esa fase.
- No saturar cards.
- No convertir Home o Planner en dashboard empresarial.
- Mantener estética iOS premium con fallback Android/Web.
- Usar glass/blur solo donde el Design System lo permite.
- Si `expo-blur` o blur equivalente no está instalado, usar surface translúcida/borde/sombra como fallback.
- Si haptics no está instalado, no instalar; dejar helper seguro no-op o usar solo lo existente.

### 3.4 Reglas de accesibilidad

- Mantener textos legibles.
- No usar contraste bajo.
- No depender solo de color para estados.
- Targets táctiles mínimos aproximados: 44x44.
- Inputs con labels claros.
- Errores cerca del campo afectado cuando aplique.
- Botones deshabilitados visualmente diferenciados.
- Soportar tamaños de texto razonables sin romper layouts principales.

### 3.5 Comando QA obligatorio

Al final de cada fase, ejecutar desde la carpeta frontend correcta:

```bash
npx.cmd tsc --noEmit
```

Si el proyecto usa otra carpeta interna, primero detectar dónde está el `package.json` del frontend y ejecutar ahí.

Si el comando falla por errores preexistentes, reportar:

- comando ejecutado;
- carpeta desde donde se ejecutó;
- errores nuevos vs errores preexistentes si puede distinguirse;
- archivos relacionados.

---

## 4. Formato de respuesta obligatorio de Antigravity por fase

Al terminar cada fase, Antigravity debe responder con este formato:

```md
## Fase X completada

### Archivos modificados
- ...

### Archivos creados
- ...

### Bugs encontrados
- ...

### Bugs corregidos
- ...

### Limitaciones / decisiones tomadas
- ...

### QA ejecutado
- Comando: `npx.cmd tsc --noEmit`
- Resultado: OK / FAIL
- Detalle si falló:

### Riesgos para la próxima fase
- ...
```

Si no modificó archivos, debe decirlo explícitamente.

---

# FASE 0 — Auditoría técnica previa

## Prompt para Antigravity

```md
Actuá como implementador frontend senior en el repo HomePlus.

Necesito una auditoría técnica previa para preparar el rediseño frontend premium, sin modificar ningún archivo.

Contexto documental disponible:
- `frontend_premium_design_system_v1.md`
- `frontend_navigation_shell_v1.md`
- `frontend_home_ux_final.md`
- `frontend_planner_ux_final.md`
- `frontend_auth_household_profile_polish.md`
- opcional: `frontend_premium_extraction_index.md`

Objetivo de esta fase:
Inspeccionar el repo actual y producir un mapa técnico de frontend para implementar el rediseño por fases sin romper lógica real.

Reglas absolutas:
- NO modificar archivos.
- NO formatear archivos.
- NO instalar dependencias.
- NO tocar backend.
- NO tocar Supabase.
- NO tocar `.env`.
- NO cambiar imports.
- NO ejecutar migraciones.
- NO cambiar código.

Tareas:
1. Detectá la carpeta frontend real.
   - Buscar `package.json`.
   - Confirmar si el frontend está en `front/mi-front-limpio/` u otra ruta.
2. Detectá stack y librerías instaladas.
   - React Native / Expo.
   - React Navigation.
   - Safe Area.
   - Vector icons.
   - Blur/glass disponible o no.
   - Haptics disponible o no.
   - Calendar/list libraries si existen.
   - State management/contextos existentes.
3. Detectá estructura actual de navegación.
   - AppNavigator.
   - Auth stack.
   - Private stack.
   - Tabs actuales.
   - Pantallas asociadas.
4. Detectá Auth/Household real.
   - AuthContext.
   - services/api.
   - login/register/logout/me.
   - crear hogar.
   - join invite link.
   - pending approval.
   - approve/reject.
5. Detectá Planner real.
   - Pantallas de tasks.
   - Pantallas de events/calendar.
   - Forms existentes.
   - Services usados.
   - Tipos existentes.
6. Detectá Home actual.
   - Pantalla Home.
   - Datos reales consumidos.
   - Mocks existentes.
7. Detectá componentes UI existentes.
   - Buttons.
   - Cards.
   - Inputs.
   - Modals/sheets.
   - Headers.
   - Skeletons/toasts/errors.
8. Detectá estilos existentes.
   - theme/tokens si existen.
   - colores hardcodeados frecuentes.
   - duplicación de estilos.
9. Detectá riesgos antes de rediseñar.
   - Imports circulares.
   - pantallas legacy.
   - services directos a Supabase.
   - componentes duplicados.
   - archivos grandes difíciles de tocar.
   - TypeScript débil o any excesivo.
10. Ejecutá QA de baseline:
   - desde la carpeta frontend correcta: `npx.cmd tsc --noEmit`.

Archivos permitidos:
- Ninguno para modificación.
- Solo lectura de frontend y package files.

Archivos prohibidos:
- Todo el repo para modificación.
- `backend/`.
- `supabase/`.
- `.env*`.
- migraciones.

No implementar:
- No crear tokens.
- No crear componentes.
- No rediseñar pantallas.
- No corregir bugs todavía.
- No instalar dependencias.

Respuesta final esperada:
Usá el formato obligatorio de fase, pero agregá estas secciones:

### Mapa frontend detectado
- ruta del frontend;
- entrypoints principales;
- navegación actual;
- pantallas reales;
- services reales;
- componentes existentes.

### Librerías instaladas relevantes
- blur/glass;
- haptics;
- icons;
- navigation;
- safe area;
- calendar/list.

### Recomendación de implementación por fases
- confirmar si las fases 1 a 6 son viables;
- advertir si alguna fase debe ajustarse.
```

## Criterio de aceptación de Fase 0

La fase queda aprobada si:

- no modificó archivos;
- detectó carpeta frontend real;
- listó componentes/pantallas/services relevantes;
- identificó si blur/haptics están instalados;
- ejecutó `npx.cmd tsc --noEmit` como baseline;
- dejó claro qué errores son preexistentes si el comando falla.

---

# FASE 1 — Design System Base

## Prompt para Antigravity

```md
Actuá como implementador frontend senior en HomePlus.

Vamos a implementar la base del Design System premium sin rediseñar pantallas grandes todavía.

Documentos fuente obligatorios:
- `frontend_premium_design_system_v1.md`
- usar Fase 0 como mapa técnico del repo.

Objetivo de esta fase:
Crear una base visual reutilizable para que las siguientes fases no inventen estilos por pantalla.

Reglas absolutas:
- No tocar backend.
- No tocar endpoints.
- No tocar services reales salvo imports mínimos si una pantalla de prueba lo requiere.
- No tocar `.env`.
- No instalar dependencias.
- No reescribir pantallas grandes.
- No cambiar navegación.
- No modificar lógica real.
- No usar Supabase directo.
- Terminar con `npx.cmd tsc --noEmit`.

Archivos permitidos:
- Archivos nuevos de theme/tokens/componentes UI dentro de la carpeta frontend.
- Archivos de estilos compartidos existentes si ya hay theme.
- Componentes base existentes, solo si conviene migrarlos gradualmente.
- Una pantalla pequeña de bajo riesgo como prueba visual, si Fase 0 detectó una candidata segura.

Archivos prohibidos:
- `backend/`.
- `supabase/`.
- `.env*`.
- migraciones.
- services de Auth/Household/Planner salvo adaptación visual mínima inevitable.
- AppNavigator / navegación principal, salvo imports de theme si no cambia comportamiento.
- Pantallas grandes: Home, Planner, Calendar, Login completo, Register completo.

Alcance exacto:
1. Crear o consolidar tokens visuales.
   Deben cubrir:
   - colors/background;
   - surface;
   - text;
   - terracota;
   - salvia;
   - sand/cream;
   - warning;
   - danger;
   - success;
   - border;
   - overlay;
   - shadow;
   - spacing;
   - radius;
   - typography;
   - elevation/shadows;
   - motion durations/easing si el stack lo permite.
2. Crear componentes UI base mínimos:
   - `AppScreen`;
   - `AppText`;
   - `AppButton`;
   - `AppCard`;
   - `AppInput`;
   - `GlassSurface` con fallback si blur no está instalado;
   - `ActionPill`;
   - `EmptyState`;
   - `ErrorState`;
   - `Skeleton` simple si no existe;
   - `Toast` solo si ya existe infraestructura o como componente visual local sin sistema global complejo.
3. Crear componentes base opcionales solo si encajan con estructura existente:
   - `AppHeader`;
   - `AppBottomSheet`;
   - `AppModal`;
   - `SegmentedControl`.
4. Asegurar que los componentes sean simples, typed y reutilizables.
5. Evitar dependencias nuevas.
6. Si se migra una pantalla pequeña de prueba:
   - elegir una pantalla o componente menor;
   - no tocar lógica;
   - solo reemplazar estilos por componentes/tokens;
   - explicar por qué fue segura.

Reglas de diseño obligatorias:
- HomePlus debe sentirse cálido, claro, familiar y premium.
- No usar estética SaaS fría.
- No saturar cards.
- No usar sombras duras.
- No usar glass si perjudica legibilidad.
- En Android/Web, fallback de glass debe ser surface translúcida o sólida con borde/sombra suave.
- No usar colores directos en pantallas futuras: exponer tokens.
- Tipografía debe estar centralizada.
- Radius debe estar centralizado.
- Spacing debe estar centralizado.

No implementar:
- No rediseñar Home.
- No rediseñar Planner.
- No rediseñar Auth completo.
- No cambiar tab bar.
- No crear Quick Actions Sheet todavía.
- No crear mocks nuevos de módulos.
- No crear animaciones complejas.
- No instalar `expo-blur`, `expo-haptics` ni librerías nuevas.

QA:
1. Revisar que no haya imports rotos.
2. Revisar que no haya dependencias faltantes.
3. Ejecutar:
   `npx.cmd tsc --noEmit`

Respuesta final esperada:
Usar formato obligatorio de fase e incluir:
- estructura de theme creada;
- componentes base creados;
- si hubo pantalla pequeña migrada, cuál y por qué;
- cómo usar los tokens en fases siguientes;
- limitaciones por dependencias no instaladas.
```

## Criterio de aceptación de Fase 1

La fase queda aprobada si:

- existe una fuente única de tokens;
- existen componentes base reutilizables;
- no se rompió navegación ni lógica;
- TypeScript pasa o los errores son preexistentes;
- no instaló dependencias;
- no rediseñó pantallas grandes.

---

# FASE 2 — Navigation Shell

## Prompt para Antigravity

```md
Actuá como implementador frontend senior en HomePlus.

Vamos a implementar el Navigation Shell premium sin romper rutas reales.

Documentos fuente obligatorios:
- `frontend_navigation_shell_v1.md`
- `frontend_premium_design_system_v1.md`
- resultado de Fase 0
- componentes/tokens creados en Fase 1

Objetivo de esta fase:
Mejorar la navegación principal para que se sienta iOS premium, simple y familiar, conservando la estructura real del MVP.

Decisión de producto obligatoria:
Mantener la estructura V1:
- Home
- Familia/People
- Add/Quick Actions como botón central `+`, no pantalla principal real
- Planner
- More/Profile

Reglas absolutas:
- No tocar backend.
- No cambiar endpoints.
- No cambiar services.
- No romper Auth stack.
- No romper Private stack.
- No romper `navigation.next` derivado de `/api/auth/me`.
- No cambiar lógica de sesión.
- No usar Supabase directo.
- No instalar dependencias.
- No reescribir Home o Planner en detalle.
- Terminar con `npx.cmd tsc --noEmit`.

Archivos permitidos:
- Archivos de navegación frontend existentes.
- Componentes de tab bar / header si existen.
- Nuevos componentes de shell visual:
  - premium tab bar;
  - quick actions sheet;
  - app headers;
  - route constants si ya existe patrón.
- Archivos de theme/components creados en Fase 1 si requieren ajustes menores.

Archivos prohibidos:
- `backend/`.
- `supabase/`.
- `.env*`.
- migraciones.
- services reales.
- Pantallas Home/Planner/Auth salvo ajustes mínimos de header/props requeridos por navegación.
- Forms reales.

Alcance exacto:
1. Confirmar Auth Stack y Private Stack actuales.
   - No cambiar flujo real.
   - Mantener Splash/loading inicial si ya existe.
2. Implementar o pulir Tab Bar premium.
   Debe cumplir:
   - glass/fallback según dependencias existentes;
   - safe area correcta;
   - altura cómoda;
   - labels claros;
   - active state suave;
   - iconos consistentes;
   - no ocultar labels salvo que el diseño existente ya lo haga bien;
   - no ocupar demasiado espacio vertical;
   - no tap targets chicos.
3. Implementar comportamiento del botón central `+`.
   - El `+` abre Quick Actions Sheet.
   - No navega a una pantalla vacía.
   - Debe tener feedback visual.
   - Haptics solo si la dependencia ya existe.
4. Crear Quick Actions Sheet.
   Acciones reales permitidas:
   - Crear tarea.
   - Crear evento.
   - Invitar miembro si el usuario tiene flujo disponible.
   - Ir a Planner.
   - Ir a Familia.
   Acciones mock permitidas:
   - Preguntar a Geni / Geni demo.
   - Agregar gasto demo.
   - Agregar item de inventario demo.
   - Check-in Presence demo.
   Estas acciones mock deben verse como premium pero no deben prometer backend real.
5. Implementar headers de shell.
   - Home: emocional, con saludo/hogar/avatar si datos existen.
   - Planner: claro, con acción contextual.
   - Familia: personas/miembros.
   - Perfil/More: configuración.
   - Auth: simple, sin tab bar.
6. Back behavior.
   - Mantener back nativo donde corresponde.
   - Evitar loops.
   - Desde detalles/forms volver a pantalla anterior.
   - Desde flujos post-auth usar reemplazo/reset si ya existe patrón.
7. Deep navigation.
   Preparar rutas o helpers si ya existe patrón para:
   - abrir Planner en tab/tipo específica;
   - abrir crear tarea;
   - abrir crear evento;
   - volver a Home con refetch si el patrón ya existe.
   No inventar deep linking externo complejo.
8. Estados globales del shell.
   - loading inicial;
   - backend inaccesible;
   - offline visual si existe estado;
   - sesión vencida con salida segura.

Reglas visuales obligatorias:
- Tab bar premium pero no pesada.
- `+` debe sentirse central y contextual, no invasivo.
- More/Profile no debe convertirse en “todos los módulos como tabs”.
- Geni no debe ser tab.
- Finance, Inventory, Assets, Presence, Goals, SOS, Automations, Search no deben ser tabs principales.
- Evitar más de 5 entradas principales.
- Evitar badges largos en tabs.
- Si hay badge, que sea pequeño y numérico/estado breve.

No implementar:
- No rediseñar Home cards.
- No rediseñar Planner completo.
- No crear backend para acciones mock.
- No cambiar services.
- No instalar blur/haptics.
- No implementar notificaciones reales.
- No implementar multi-hogar avanzado.
- No implementar search global real.

QA:
1. Probar mentalmente rutas post-auth:
   - no session → Auth;
   - session + no hogar → Create/Join;
   - session + pending → Waiting approval si existe;
   - session + hogar activo → tabs privadas.
2. Verificar que `+` abre/cierra sheet.
3. Verificar que tabs navegan sin perder estado crítico.
4. Ejecutar:
   `npx.cmd tsc --noEmit`

Respuesta final esperada:
Usar formato obligatorio e incluir:
- tabs finales implementadas;
- comportamiento del `+`;
- acciones reales y mock del sheet;
- headers tocados;
- rutas que se mantuvieron;
- limitaciones por dependencias.
```

## Criterio de aceptación de Fase 2

La fase queda aprobada si:

- la estructura `Home | Familia/People | + | Planner | More/Profile` se conserva;
- el `+` abre Quick Actions Sheet;
- Auth/Private stacks siguen funcionando;
- no se tocaron endpoints/services;
- no aparecieron tabs de módulos mock;
- TypeScript pasa o reporta errores preexistentes.

---

# FASE 3 — Planner Visual

## Prompt para Antigravity

```md
Actuá como implementador frontend senior en HomePlus.

Vamos a rediseñar visualmente Planner para que pase de panel administrativo a herramienta diaria simple, sin eliminar funcionalidad real.

Documentos fuente obligatorios:
- `frontend_planner_ux_final.md`
- `frontend_premium_design_system_v1.md`
- `frontend_navigation_shell_v1.md`
- resultado de Fase 0
- Design System de Fase 1
- Navigation Shell de Fase 2

Objetivo de esta fase:
Reorganizar Planner visualmente manteniendo Tasks y Events reales ya implementados. La complejidad debe quedar bajo demanda en detalles, sheets o “Más opciones”.

Reglas absolutas:
- No tocar backend.
- No cambiar endpoints.
- No cambiar services salvo adaptación visual mínima de types/imports si es inevitable.
- No eliminar funcionalidad real.
- No cambiar lógica de negocio.
- No usar Supabase directo.
- No instalar dependencias.
- No tocar Auth/Household.
- No tocar Home salvo si navegación necesita integración mínima ya definida.
- Terminar con `npx.cmd tsc --noEmit`.

Archivos permitidos:
- Pantallas Planner existentes.
- Componentes Planner existentes.
- Nuevos componentes visuales Planner:
  - PlannerShell;
  - TaskCard;
  - TaskDetail layout;
  - TaskForm layout;
  - FiltersSheet;
  - CalendarMonthAgenda;
  - EventCard/EventRow;
  - EventDetail layout;
  - EventForm layout;
  - GoalsComingSoon.
- Mocks locales solo para Metas Próximamente si no existe backend real.
- Theme/components base si necesitan ajustes menores.

Archivos prohibidos:
- `backend/`.
- `supabase/`.
- `.env*`.
- migraciones.
- services reales de Planner salvo adaptación mínima inevitable.
- Auth services.
- Household services.
- DB models backend.
- Nuevas dependencias.

Alcance exacto:

## A. Planner Shell
1. Crear o ajustar shell visual de Planner.
2. Header simple:
   - título Planner;
   - subtítulo breve o estado del día si ya hay datos;
   - acción contextual principal.
3. Tabs internas recomendadas:
   - Tareas;
   - Calendario;
   - Metas Próximamente.
4. Evitar resumen global pesado.
   - No mostrar muchas métricas arriba.
   - No mostrar dashboards de productividad.
   - No duplicar Home.
5. Botón contextual:
   - en Tareas: crear tarea;
   - en Calendario: crear evento;
   - en Metas: deshabilitado o “Próximamente”.

## B. Tareas
1. Layout final:
   - lista diaria simple;
   - secciones o segmentos claros;
   - cards legibles;
   - filtros secundarios bajo sheet.
2. Segmentos primarios sugeridos:
   - Hoy;
   - Próximas;
   - Todas / Asignadas a mí según datos actuales.
   Usar el patrón que mejor encaje con datos reales existentes.
3. Filtros avanzados:
   - responsable;
   - estado;
   - prioridad;
   - vencidas;
   - categoría/responsabilidad si existe.
   Deben vivir en Filters Sheet, no saturar la pantalla.
4. Task Card:
   Debe mostrar solo lo necesario:
   - título;
   - responsable/avatar si existe;
   - fecha/vencimiento;
   - estado visible;
   - prioridad si aporta;
   - indicador de verificación si existe en datos reales.
   No mostrar:
   - IDs;
   - metadata técnica;
   - fechas largas innecesarias;
   - muchos badges;
   - descripción completa.
5. Estados visibles:
   - pendiente;
   - en progreso si existe;
   - completada;
   - cancelada;
   - vencida como calculado visual, no estado nuevo si backend no lo maneja;
   - awaiting verification / verified si ya existe en datos reales.
6. Estados ocultos al detalle:
   - metadata;
   - historial;
   - descripción larga;
   - notas;
   - campos secundarios.
7. Reglas de prioridad:
   - prioridad alta puede tener énfasis visual suave;
   - no usar rojo salvo urgencia real;
   - no convertir toda tarea vencida en alarma gigante.
8. Reglas de verificación:
   - Si la tarea requiere verificación, mostrar pill breve.
   - Si está esperando verificación, mostrar acción del rol correspondiente solo si la lógica real ya existe.
   - No inventar permisos de verificación.
   - No crear estados nuevos que backend no soporte.
9. Canceladas/hechas:
   - Completadas no deben saturar vista diaria.
   - Canceladas deben ir a filtro/detalle/historial, no arriba.
   - No borrar tareas.

## C. Task Detail
1. Debe abrir como pantalla o modal según estructura actual.
2. Contenido:
   - título;
   - estado;
   - responsable;
   - fecha;
   - prioridad;
   - descripción si existe;
   - verificación si existe;
   - acciones disponibles reales.
3. Acciones:
   - completar;
   - editar;
   - cancelar;
   - verificar si ya existe;
   - reabrir solo si ya existe.
4. Layout:
   - hero simple;
   - secciones limpias;
   - acciones primarias abajo o en sheet;
   - confirmación para cancelar.
5. Motion:
   - apertura suave;
   - feedback al completar;
   - no animaciones largas.

## D. Crear tarea
1. Vista principal con campos principales:
   - título;
   - responsable;
   - fecha rápida;
   - verificación si existe;
   - CTA crear.
2. Más opciones bajo demanda:
   - descripción;
   - prioridad;
   - responsabilidad/categoría;
   - fecha/hora avanzada;
   - repetición solo si ya existe;
   - otros campos existentes.
3. Templates:
   - si ya existen templates, mostrarlos como chips.
   - si no existen, usar sección visual mínima o no implementarla.
   - No crear lógica real de templates si no existe.
4. “Otro”:
   - permitir título libre;
   - no forzar categorías.
5. Responsable:
   - usar miembros reales disponibles si existen;
   - no inventar miembros.
6. Fecha rápida:
   - Hoy;
   - Mañana;
   - Esta semana;
   - Sin fecha, si el backend lo permite.
7. Validaciones:
   - título requerido;
   - mensajes humanos;
   - no mostrar errores crudos del backend.

## E. Editar tarea
1. Reutilizar layout de crear tarea si existe.
2. No cambiar campos reales.
3. No perder datos secundarios existentes.
4. Confirmar cambios destructivos si corresponde.

## F. Confirmar cancelar tarea
1. Usar modal/sheet claro.
2. Copy no acusatorio.
3. Acción destructiva visualmente diferenciada.
4. No borrar tarea si backend maneja cancelación.

## G. Calendario
1. Implementar experiencia Mes + Agenda.
2. Header de mes:
   - mes actual;
   - navegación anterior/siguiente si ya existe o se puede hacer sin backend;
   - volver a hoy.
3. Dots:
   - puntos por días con eventos;
   - no saturar con múltiples colores si no aporta.
4. Agenda:
   - lista de eventos del día seleccionado;
   - event rows/cards simples.
5. No mostrar tareas dentro del calendario.
   - Planner UX define que Calendar muestra eventos, no tareas, para evitar mezcla mental.
6. Empty state:
   - “No hay eventos este día”;
   - CTA crear evento.
7. No implementar recurrencia avanzada si backend no existe.

## H. Event Detail
1. Mostrar:
   - título;
   - fecha/hora;
   - lugar si existe;
   - participantes si existen;
   - descripción si existe;
   - estado.
2. Acciones:
   - editar;
   - cancelar;
   - volver.
3. No mostrar IDs ni metadata técnica.

## I. Crear evento
1. Campos principales:
   - título;
   - fecha;
   - hora inicio/fin si existe;
   - participantes si existe;
   - lugar si existe;
   - descripción opcional.
2. Validaciones humanas.
3. No crear RRULE/recurrencia avanzada si no existe.

## J. Editar evento
1. Reutilizar form.
2. Mantener datos reales.
3. Confirmar cancelación.

## K. Metas Próximamente
1. Visual premium sin backend real.
2. Cards mock permitidas:
   - meta familiar;
   - ahorro;
   - organización;
   - mantenimiento.
3. Debe quedar claro que es Próximamente.
4. No crear services.
5. No crear endpoints.
6. No mezclar con datos reales.

Estados:
- Empty states claros por tab.
- Loading con skeletons suaves.
- Error state con retry si ya existe refetch.
- Offline/backend inaccesible con mensaje humano.

Motion/haptics:
- Completar tarea: feedback corto.
- Abrir sheet: slide suave.
- Cambiar filtros: transición simple.
- Crear evento/tarea: success breve.
- Haptics solo si dependencia instalada.

Performance:
- Usar listas eficientes si hay muchas tareas.
- Evitar blur dentro de listas largas.
- Evitar re-render masivo por filtros.
- Memoizar cards si el patrón del repo lo permite.
- No calcular calendario de forma pesada en render si se puede preparar antes.

No implementar:
- No backend.
- No endpoints.
- No nuevos estados de negocio.
- No recurrencia avanzada.
- No subtareas reales si no existen.
- No comentarios/adjuntos reales si no existen.
- No goals backend.
- No notificaciones reales.
- No realtime nuevo.

QA:
1. Crear tarea sigue funcionando.
2. Listar tareas sigue funcionando.
3. Completar tarea sigue funcionando.
4. Editar tarea sigue funcionando si existía.
5. Cancelar tarea sigue funcionando si existía.
6. Crear evento sigue funcionando.
7. Listar eventos sigue funcionando.
8. Editar/cancelar evento sigue funcionando si existía.
9. Metas no hace llamadas reales.
10. Ejecutar:
   `npx.cmd tsc --noEmit`

Respuesta final esperada:
Usar formato obligatorio e incluir:
- pantallas Planner tocadas;
- componentes Planner creados;
- funcionalidad real preservada;
- cosas movidas bajo demanda;
- mocks agregados solo para Metas;
- bugs encontrados/corregidos;
- limitaciones.
```

## Criterio de aceptación de Fase 3

La fase queda aprobada si:

- Planner se ve más simple y diario;
- Tasks reales siguen funcionando;
- Events reales siguen funcionando;
- Calendar no mezcla tareas;
- filtros avanzados quedan bajo demanda;
- Metas es claramente “Próximamente” y no backend;
- TypeScript pasa o reporta preexistentes.

---

# FASE 4 — Home Visual

## Prompt para Antigravity

```md
Actuá como implementador frontend senior en HomePlus.

Vamos a rediseñar visualmente Home para que sea el centro emocional y operativo del hogar, sin convertirlo en dashboard saturado.

Documentos fuente obligatorios:
- `frontend_home_ux_final.md`
- `frontend_premium_design_system_v1.md`
- `frontend_navigation_shell_v1.md`
- resultado de Fase 0
- Design System de Fase 1
- Navigation Shell de Fase 2
- Planner Visual de Fase 3 para rutas/CTAs hacia Planner

Objetivo de esta fase:
Crear una Home premium, cálida, simple y viva, que muestre datos reales del MVP cuando existan y módulos mock ordenados sin prometer features reales.

Reglas absolutas:
- No tocar backend.
- No cambiar endpoints.
- No cambiar services reales salvo adaptación visual mínima inevitable.
- No romper Planner real.
- No romper Auth/Household.
- No usar Supabase directo.
- No instalar dependencias.
- No convertir mocks en features reales.
- No agregar módulos como tabs.
- Terminar con `npx.cmd tsc --noEmit`.

Archivos permitidos:
- Pantalla Home actual.
- Componentes Home existentes.
- Nuevos componentes Home:
  - HomeHeader;
  - TodayAtHome / HoyEnCasa;
  - HomeQuickActions;
  - GeniBriefingMock;
  - MockModuleStrip;
  - FamilyActivityMock;
  - HomeRoleVariant helpers si son simples.
- Mocks locales de Home si ya no existen.
- Navegación mínima para CTAs hacia Planner/Familia/More.
- Theme/components base para ajustes menores.

Archivos prohibidos:
- `backend/`.
- `supabase/`.
- `.env*`.
- migraciones.
- services reales salvo adaptación mínima inevitable.
- Pantallas Planner salvo import/ruta si es inevitable.
- Auth/Household flows.
- Nuevas dependencias.

Alcance exacto:

## A. Principio de Home
Implementar Home como:
- centro emocional y operativo;
- resumen, no administración;
- pantalla simple, cálida y premium;
- lectura rápida del día;
- demostración de colaboración real cuando hay tareas/eventos reales.

## B. Estructura final
Home debe priorizar este orden:
1. Header emocional.
2. Hoy en casa.
3. Quick Actions compactas.
4. Geni/mock premium.
5. Módulos mock.
6. Actividad familiar.

No todo debe estar arriba.

## C. Header emocional
Debe mostrar según datos existentes:
- saludo breve;
- nombre del hogar si existe;
- avatar/perfil si existe;
- estado del día corto.

No mostrar:
- métricas densas;
- IDs;
- rol técnico grande;
- selector multi-hogar avanzado si no existe.

## D. Hoy en casa
Debe ser la sección más importante.
Datos reales permitidos:
- tareas reales;
- eventos reales;
- miembros/rol si ya está disponible.

Límites máximos:
- máximo 3 tareas visibles.
- máximo 2 eventos visibles.
- máximo 1 alerta principal si existe.
- resto va a CTA “Ver Planner”.

Orden de prioridad:
1. Tareas vencidas o para hoy.
2. Eventos próximos de hoy.
3. Tareas asignadas al usuario o pendientes importantes.
4. Próximos eventos.
5. Estado vacío útil.

Estados vacíos:
- Si no hay tareas/eventos: mostrar calma y CTA crear tarea/evento.
- Si solo hay un usuario activo: dar valor individual, no exigir invitar.
- Si no hay hogar activo, no debería llegar a Home; si pasa, mostrar error seguro y acción de refetch/logout según flujo existente.

CTA:
- “Ver Planner” debe llevar a Planner.
- Crear tarea/evento puede abrir Quick Action o ruta real si existe.

## E. Quick Actions compactas en Home
Acciones visibles recomendadas:
- Crear tarea.
- Crear evento.
- Invitar miembro.

Acciones secundarias:
- Ver Planner.
- Ver Familia.

Acciones mock:
- Preguntar a Geni.
- Agregar gasto demo.
- Check-in demo.

Reglas:
- máximo 3 acciones visibles en Home.
- resto al Quick Actions Sheet global.
- no duplicar todo el sheet en Home.
- no mostrar acciones que no tienen destino.

## F. Geni en Home
Implementar Geni como mock premium si no hay IA real.

Debe presentarse como:
- briefing visual;
- sugerencia suave;
- card premium;
- tono factual y no acusatorio.

No debe prometer:
- IA real si no existe;
- búsqueda global real;
- automatizaciones reales;
- predicciones reales;
- acceso a datos privados.

Copy recomendado:
- “Resumen sugerido”.
- “Geni puede ayudarte a ordenar el día”.
- “Vista demo” si el contexto lo necesita.

Evitar:
- “Geni analizó todo tu hogar” si no es real.
- “Automatizado” si no existe motor.
- claims de inteligencia real.

## G. Módulos mock
Módulos permitidos como mock premium:
- Finance;
- Inventory;
- Assets;
- Presence;
- Goals;
- Activity.

Reglas:
- Deben estar visualmente abajo de lo real.
- Deben ser cards compactas o strip.
- Deben usar datos demo locales.
- Deben indicar estado próximo/demo si corresponde.
- No deben hacer llamadas a backend nuevo.
- No deben bloquear la demo real.

Finance mock:
- resumen visual simple;
- no balance real;
- no integración bancaria.

Inventory mock:
- stock bajo demo;
- no persistencia real.

Assets mock:
- mascota/vehículo demo;
- no documentos reales.

Presence mock:
- estados manuales demo;
- no GPS/geofencing.

Goals mock:
- progreso visual;
- no backend.

Activity mock:
- actividad familiar demo;
- no feed real si no existe.

## H. Reglas de jerarquía visual
- Lo real arriba.
- Lo accionable antes que lo decorativo.
- Mock abajo.
- Una card protagonista máximo.
- Evitar más de 2 cards grandes consecutivas.
- No anidar cards dentro de cards si se puede evitar.
- No usar badges largos.
- No mostrar metadata si no aporta.
- No convertir Home en tablero de control.

## I. Cards permitidas
- Hoy en casa.
- Tareas próximas.
- Eventos próximos.
- Quick Actions compactas.
- Geni briefing mock.
- Módulos mock compactos.
- Actividad familiar mock.

## J. Qué ocultar o mover abajo
Mover abajo:
- Finance;
- Inventory;
- Assets;
- Presence;
- Goals;
- Activity mock.

Ocultar si no aporta:
- métricas vacías;
- widgets sin datos;
- estados técnicos;
- roles avanzados;
- permisos finos;
- auditoría.

## K. Variantes por rol
Implementar solo si datos de rol ya están disponibles sin tocar backend.

Común para todos:
- Header.
- Hoy en casa.
- Planner CTA.
- Quick Actions básicas según permisos reales.

Coordinador:
- puede destacar solicitudes pendientes si dato existe;
- invitar miembro puede estar más visible.

Adulto:
- tareas/eventos operativos;
- crear tarea/evento si permisos reales existen.

Adolescente:
- priorizar “mis tareas” si dato existe;
- no inventar restricciones.

Adulto mayor:
- priorizar eventos/personas si rol existe;
- no crear layout completamente separado.

Regla:
- No duplicar Home entera por rol.
- Usar variantes pequeñas y condicionales.

## L. Estados
Loading:
- skeletons suaves.
- no spinners gigantes salvo splash.

Empty:
- útil, cálido y accionable.
- no culpar por falta de datos.

Error:
- mensaje humano.
- CTA reintentar si hay refetch.

Offline/backend inaccesible:
- explicar que puede haber datos desactualizados.
- no borrar UI completa si hay datos previos.

## M. Motion/haptics
- Tap cards: feedback sutil.
- Crear tarea/evento: success breve si ya existe.
- Abrir sheet: slide suave.
- Completar tarea desde Home solo si ya existe acción real y segura.
- Haptics solo si dependencia instalada.

No implementar:
- No backend nuevo.
- No IA real.
- No realtime nuevo.
- No GPS.
- No Finance real.
- No Inventory real.
- No Activity feed real si no existe.
- No Search real.
- No multi-hogar avanzado.
- No roles complejos.

QA:
1. Home carga con usuario con hogar activo.
2. Home muestra tareas reales si existen.
3. Home muestra eventos reales si existen.
4. CTA Ver Planner navega correctamente.
5. Crear tarea/evento navega o abre sheet real si existe.
6. Mocks no llaman backend.
7. Estado vacío se ve bien.
8. Error/refetch no rompe sesión.
9. Ejecutar:
   `npx.cmd tsc --noEmit`

Respuesta final esperada:
Usar formato obligatorio e incluir:
- secciones Home creadas;
- datos reales usados;
- mocks agregados;
- cómo se evitó saturación;
- variantes por rol implementadas o no implementadas y por qué;
- limitaciones.
```

## Criterio de aceptación de Fase 4

La fase queda aprobada si:

- Home se siente simple, cálida, viva y premium;
- tareas/eventos reales aparecen arriba;
- mocks no se confunden con features reales;
- no se rompió Planner/Auth/Household;
- no hay dashboard saturado;
- TypeScript pasa o reporta preexistentes.

---

# FASE 5 — Auth / Household / Profile Polish

## Prompt para Antigravity

```md
Actuá como implementador frontend senior en HomePlus.

Vamos a pulir Auth, Onboarding, Household/Familia y Profile/Settings para que se sientan confiables, limpias y premium, sin cambiar flujos reales.

Documentos fuente obligatorios:
- `frontend_auth_household_profile_polish.md`
- `frontend_premium_design_system_v1.md`
- `frontend_navigation_shell_v1.md`
- resultado de Fase 0
- Design System de Fase 1
- Navigation Shell de Fase 2

Objetivo de esta fase:
Transformar pantallas técnicas/formularios en experiencia premium confiable, manteniendo login/register/me/create household/join/pending/approve/reject/profile/logout reales.

Reglas absolutas:
- No tocar backend.
- No cambiar endpoints.
- No cambiar services reales salvo adaptación visual mínima inevitable.
- No cambiar flujo real ya implementado.
- No usar Supabase directo.
- No instalar dependencias.
- No tocar Planner real.
- No tocar Home salvo navegación mínima si fuese inevitable.
- No inventar módulos.
- No cambiar invite link permanente por link con vencimiento visible.
- Terminar con `npx.cmd tsc --noEmit`.

Archivos permitidos:
- Pantallas Auth:
  - Login;
  - Registro;
  - Splash/Loading inicial si existe.
- Pantallas Household:
  - Crear hogar;
  - Join household;
  - Waiting approval;
  - Familia/Miembros;
  - Invitar miembro;
  - Solicitudes pendientes.
- Pantallas Profile/Settings:
  - Perfil;
  - Settings;
  - logout UI.
- Componentes visuales específicos:
  - AuthCard;
  - HouseholdCard;
  - MemberRow;
  - InviteLinkCard;
  - PendingRequestRow;
  - SettingsGroup;
- Theme/components base para ajustes menores.

Archivos prohibidos:
- `backend/`.
- `supabase/`.
- `.env*`.
- migraciones.
- endpoints/services reales salvo adaptación mínima inevitable.
- Planner.
- Home, salvo cambios mínimos de navegación si son inevitables.
- Nuevas dependencias.

Alcance exacto:

## A. Principio global
Estas pantallas deben sentirse como entrada a una casa digital confiable.

Regla:
- lenguaje humano;
- formularios simples;
- errores claros;
- loading suave;
- acciones reales preservadas;
- nada técnico expuesto.

## B. Splash / Loading inicial
Visual:
- background premium del Design System;
- marca HomePlus si existe;
- copy corto;
- loading calmado.

Copy sugerido:
- “Preparando tu hogar…”
- “Cargando HomePlus…”

Errores:
- backend inaccesible;
- sesión vencida;
- reintentar;
- cerrar sesión/cambiar cuenta si corresponde.

No mostrar:
- tokens;
- JSON;
- errores crudos.

## C. Login
Layout:
- una card o surface central;
- título cálido;
- email;
- password;
- CTA principal;
- link a Registro;
- estados de loading/error.

Campos:
- email;
- password.

CTA:
- “Entrar” o equivalente.

Errores:
- credenciales inválidas;
- red/backend;
- campos vacíos;
- sesión inesperada.

No cambiar:
- función real de login;
- service usado;
- storage/session logic.

## D. Registro
Layout:
- similar a Login;
- menos técnico;
- explicar que luego podrá crear/unirse a hogar.

Campos según implementación real:
- nombre/display name si existe;
- email;
- password;
- confirm password solo si ya existe.

CTA:
- “Crear cuenta”.

Errores:
- email inválido;
- password corto;
- email existente si backend devuelve;
- red/backend.

No cambiar:
- register real;
- respuesta esperada;
- flujo posterior a `/me`.

## E. Crear hogar
Propósito:
- dar identidad a un espacio familiar.

Layout:
- card simple;
- nombre del hogar;
- explicación breve;
- CTA crear.

Copy:
- “Creá el espacio de tu hogar”.
- “Después vas a poder invitar a tu familia”.

CTA:
- “Crear hogar”.

No mostrar:
- slug si no es necesario;
- timezone si no es necesario;
- config técnica;
- IDs.

No cambiar:
- endpoint real;
- payload real salvo campos ya existentes.

## F. Unirse a hogar
Link:
- aceptar invite token/link según flujo real.
- explicar que la solicitud puede quedar pendiente.

Estados:
- link válido;
- solicitud enviada;
- ya solicitaste entrar;
- error link inválido si backend lo devuelve;
- backend inaccesible.

No mostrar:
- vencimiento si backend no lo maneja visualmente;
- single-use si no existe;
- join code si flujo real es invite link.

## G. Esperando aprobación
Visual:
- estado tranquilo;
- icono/pill pending;
- nombre de hogar si está disponible;
- explicación clara.

Copy:
- “Tu solicitud fue enviada”.
- “Cuando te aprueben, vas a poder entrar al hogar”.

Acciones:
- refresh/reintentar `/me` o refetch existente;
- logout/cambiar cuenta.

No hacer:
- no autoaprobar;
- no permitir saltar a Home;
- no inventar chat con coordinador.

## H. Onboarding de rol/perfil básico si aplica
Solo implementar polish si la pantalla ya existe.

Permitido:
- mejorar avatar/nombre;
- copy de valor;
- selección visual de rol si flujo real ya la tiene.

Prohibido:
- crear onboarding largo nuevo;
- pedir datos no usados;
- cambiar roles técnicos;
- inventar permisos.

## I. Familia / miembros
Lista:
- avatar;
- nombre;
- rol;
- estado;
- acciones según permisos reales.

Roles:
- coordinator / Coordinador;
- adult / Adulto;
- adolescent / Adolescente;
- child / Niño si existe;
- senior / Adulto mayor si existe;
- guest / Invitado.

Estados:
- active / activo;
- pending / pendiente;
- suspended / suspendido si existe;
- finalized / finalizado si aparece.

Reglas:
- no mostrar tabla técnica;
- no mostrar IDs;
- no saturar con permisos;
- acciones administrativas solo si ya existen y rol lo permite.

## J. Invitar miembro
Link:
- mostrar invite link real si existe;
- copiar;
- compartir si API nativa ya existe;
- explicar pending approval.

Copy:
- “Compartí este link con quien quieras sumar al hogar”.
- “Cuando la persona pida entrar, vas a poder aprobarla”.

No mostrar:
- vencimiento si no existe;
- código manual si no existe;
- límite de usos si no existe.

## K. Solicitudes pendientes
Mostrar:
- persona/avatar si existe;
- email/nombre;
- estado pending;
- aprobar;
- rechazar.

Confirmaciones:
- aprobar puede ser directo o confirmación suave;
- rechazar debe confirmar.

No cambiar:
- approve endpoint;
- reject endpoint;
- roles enviados si el flujo los requiere.

## L. Perfil
Mostrar:
- nombre;
- email;
- hogar activo;
- rol;
- avatar si existe;
- logout.

No mostrar:
- datos privados inexistentes;
- memoria Geni real;
- settings avanzados sin backend.

## M. Settings
Estilo:
- grouped list estilo iOS.

Secciones permitidas:
- Cuenta;
- Hogar;
- Preferencias mock;
- Acerca de;
- Cerrar sesión.

Mock preferences:
- notificaciones visuales si no hay backend real;
- apariencia si no hay backend real, deshabilitada o local visual;
- idioma si existe.

Reglas:
- dejar claro si algo es próximamente;
- no prometer persistencia si no existe.

Logout:
- visible;
- confirmación si corresponde;
- usa logout real.

## N. Estados globales
Empty:
- sin miembros;
- sin solicitudes;
- sin invite link.

Loading:
- skeleton o surface loading;
- no bloquear con spinner agresivo.

Error:
- humano;
- retry;
- no JSON.

Offline/backend:
- explicar;
- reintentar;
- logout/cambiar cuenta si corresponde.

## O. Copy
Reglas:
- claro;
- cálido;
- no técnico;
- no culpar;
- no prometer funciones inexistentes.

Ejemplos:
- usar “hogar”, no “household_id”.
- usar “solicitud pendiente”, no “membership pending”.
- usar “coordinador”, no “role coordinator” visible salvo debugging.

Motion/haptics:
- tap feedback suave;
- copy link success;
- approve success;
- reject warning/error suave;
- haptics solo si dependencia instalada.

No implementar:
- No backend.
- No endpoints.
- No roles nuevos.
- No multi-hogar avanzado.
- No settings persistentes nuevos.
- No edición avanzada de perfil si no existe.
- No cambiar join link permanente.
- No onboarding largo nuevo.

QA:
1. Login sigue funcionando.
2. Registro sigue funcionando.
3. `/me` sigue decidiendo navegación.
4. Crear hogar sigue funcionando.
5. Join link sigue funcionando.
6. Pending approval no deja entrar a Home.
7. Approve/reject sigue funcionando.
8. Invite link puede copiarse/compartirse si existía.
9. Logout funciona.
10. Settings no hace llamadas falsas.
11. Ejecutar:
    `npx.cmd tsc --noEmit`

Respuesta final esperada:
Usar formato obligatorio e incluir:
- pantallas pulidas;
- flujos reales preservados;
- mocks deshabilitados/próximamente;
- decisiones sobre invite link;
- bugs encontrados/corregidos;
- limitaciones.
```

## Criterio de aceptación de Fase 5

La fase queda aprobada si:

- Auth se siente confiable y premium;
- crear/unirse a hogar no cambió funcionalidad;
- pending approval es claro;
- Familia muestra miembros/roles/solicitudes sin parecer tabla técnica;
- Profile/Settings son limpios;
- logout funciona;
- TypeScript pasa o reporta preexistentes.

---

# FASE 6 — Motion / Haptics / QA

## Prompt para Antigravity

```md
Actuá como implementador frontend senior en HomePlus.

Vamos a hacer un pass final de motion, haptics, skeletons, performance y QA visual, sin cambiar lógica real.

Documentos fuente obligatorios:
- `frontend_premium_design_system_v1.md`
- `frontend_navigation_shell_v1.md`
- `frontend_home_ux_final.md`
- `frontend_planner_ux_final.md`
- `frontend_auth_household_profile_polish.md`
- resultados de Fases 0 a 5

Objetivo de esta fase:
Unificar microinteracciones y estados visuales para que la app se sienta premium, estable y consistente, sin introducir bugs ni dependencias nuevas.

Reglas absolutas:
- No tocar backend.
- No cambiar endpoints.
- No cambiar services reales salvo bug visual mínimo inevitable.
- No cambiar lógica de negocio.
- No instalar dependencias.
- No usar Supabase directo.
- No reescribir pantallas grandes.
- No agregar features nuevas.
- Terminar con `npx.cmd tsc --noEmit`.

Archivos permitidos:
- Helpers de motion/haptics si ya existen o se crean sin dependencias nuevas.
- Componentes base del Design System.
- Pantallas tocadas en Fases 2-5 para microajustes.
- Skeleton components.
- Toast/feedback visual si ya fue creado o existe.
- Performance optimizations locales.

Archivos prohibidos:
- `backend/`.
- `supabase/`.
- `.env*`.
- migraciones.
- services reales salvo bug visual mínimo inevitable.
- package installation.
- cambios de contrato.

Alcance exacto:

## A. Auditoría de dependencias de interacción
1. Confirmar si haptics está instalado.
2. Confirmar si blur está instalado.
3. Confirmar si animaciones están usando `Animated`, Reanimated u otra librería ya instalada.
4. No instalar nada.
5. Si falta algo, usar fallback.

## B. Motion rules
Aplicar microinteracciones consistentes:
- taps: feedback corto;
- sheets: slide/fade suave;
- modals: fade/scale suave si existe patrón;
- tabs: transición simple;
- completar tarea: success breve;
- crear tarea/evento: success breve;
- filtros: transición leve;
- error: no shake agresivo salvo patrón existente.

Duraciones orientativas:
- tap feedback: 80-120ms;
- sheet open/close: 180-260ms;
- modal: 160-220ms;
- tab transition: 120-180ms;
- success: 250-500ms máximo.

Prohibiciones:
- animaciones largas;
- animaciones que bloquean navegación;
- animaciones en listas largas que causen lag;
- parallax complejo;
- blur animado pesado;
- confetti permanente;
- celebraciones exageradas para tareas familiares.

## C. Haptics rules
Solo si dependencia ya instalada.

Aplicar:
- selección de tab o segment: selection light.
- abrir Quick Actions: light.
- crear tarea/evento exitoso: success.
- completar tarea: success.
- error de form: warning/error suave.
- cancelar/destructivo: warning si corresponde.

Si no está instalado:
- no instalar;
- crear no-op helper solo si ayuda a centralizar sin romper;
- reportar limitación.

## D. Skeletons/loading
Unificar loading en:
- Home;
- Planner tasks;
- Calendar/events;
- Familia/members;
- Auth initial loading;
- Invite/pending requests.

Reglas:
- skeletons suaves;
- no spinners gigantes en pantallas internas;
- mantener layout estable;
- evitar saltos visuales.

## E. Error/offline states
Unificar:
- mensaje humano;
- retry;
- no JSON;
- no stack traces;
- no errores técnicos visibles.

Revisar:
- backend inaccesible;
- sesión vencida;
- login error;
- register error;
- create household error;
- join link error;
- tasks error;
- events error.

No cambiar lógica de manejo de errores; solo presentación si es seguro.

## F. Performance pass
Revisar:
- listas de tareas;
- lista de eventos;
- lista de miembros;
- módulos mock de Home;
- blur/glass en tab bar y sheets;
- re-renders por filtros;
- componentes que recalculan datos en render.

Acciones permitidas:
- `memo` si no complica;
- `useMemo` para filtros/cálculos simples;
- `useCallback` para handlers pasados a listas si aporta;
- mover datos mock fuera del render;
- evitar blur dentro de listas largas;
- FlatList/SectionList si ya se usa o cambio es seguro.

Acciones prohibidas:
- reescrituras masivas;
- cambios de arquitectura global;
- instalar virtualization libs;
- cambiar services;
- caching complejo nuevo.

## G. Visual QA checklist
Revisar manualmente en código y, si puede correr la app, visualmente:

Navigation:
- tab bar no tapa contenido;
- safe area correcta;
- `+` abre sheet;
- sheet cierra bien;
- back behavior correcto.

Home:
- no saturada;
- Hoy en casa arriba;
- mocks abajo;
- CTA Planner funciona.

Planner:
- tabs internas claras;
- tareas legibles;
- cards no saturadas;
- filtros bajo demanda;
- Calendar Mes + Agenda;
- Metas Próximamente no llama backend.

Auth/Household/Profile:
- login/register claros;
- errores humanos;
- crear hogar claro;
- join/pending claros;
- miembros legibles;
- invite link claro;
- settings grouped list.

Accessibility:
- targets táctiles correctos;
- contraste razonable;
- labels en inputs;
- no depender solo de color;
- texto no cortado innecesariamente.

## H. Correcciones menores permitidas
- Ajustes de spacing.
- Ajustes de radius.
- Ajustes de sombras.
- Ajustes de copy corto.
- Ajustes de empty/loading/error visual.
- Corrección de imports visuales rotos por fases anteriores.
- Corrección de TypeScript generado por fases anteriores.

No implementar:
- No features nuevas.
- No backend.
- No endpoints.
- No notificaciones reales.
- No IA real.
- No GPS.
- No realtime nuevo.
- No offline sync real.
- No storage.
- No auditoría real.
- No permisos finos nuevos.

QA final:
1. Ejecutar:
   `npx.cmd tsc --noEmit`
2. Si existe script seguro de lint y Fase 0 lo detectó, preguntar antes de ejecutarlo o reportar recomendación. No asumir.
3. Si puede correr app sin instalar dependencias, reportar rutas probadas visualmente.
4. Reportar bugs visuales pendientes.

Respuesta final esperada:
Usar formato obligatorio e incluir además:

### QA visual por pantalla
- Navigation;
- Home;
- Planner;
- Auth;
- Household/Familia;
- Profile/Settings.

### Performance notes
- listas;
- blur;
- re-render;
- mocks.

### Haptics/motion status
- instalado / no instalado;
- aplicado / fallback.
```

## Criterio de aceptación de Fase 6

La fase queda aprobada si:

- la app se siente más fluida sin animaciones excesivas;
- los loading/error states son consistentes;
- no se instalaron dependencias;
- no se rompió lógica real;
- el QA visual cubre las pantallas principales;
- TypeScript pasa o reporta preexistentes.

---

# 5. Orden de commits recomendado

Cada fase debe commitearse separada.

Formato sugerido:

```txt
frontend: audit current premium redesign surface
frontend: add premium design system base
frontend: polish navigation shell and quick actions
frontend: polish planner ux
frontend: polish home ux
frontend: polish auth household profile screens
frontend: motion haptics and visual qa pass
```

No mezclar backend en ningún commit.

---

# 6. Señales de alarma durante implementación

Detenerse y reportar si ocurre cualquiera de estos casos:

- Antigravity necesita cambiar backend para que una pantalla compile.
- Un endpoint no tiene los datos que la UI quiere mostrar.
- Una feature mock empieza a necesitar persistencia real.
- Una dependencia visual no está instalada.
- `npx.cmd tsc --noEmit` falla por muchos errores nuevos.
- La navegación post-auth deja de respetar `/api/auth/me`.
- Planner deja de listar/crear/completar tareas.
- Calendar deja de listar/crear eventos.
- Join/pending approval deja de funcionar.
- Approve/reject deja de funcionar.
- Se detecta uso directo de Supabase en pantallas nuevas.
- Se requiere tocar `.env`.
- Se requiere tocar migraciones.

En esos casos, no improvisar. Reportar el problema y proponer opciones.

---

# 7. Resumen de alcance por fase

| Fase | Modifica UI | Modifica lógica real | Modifica backend | Resultado esperado |
|---|---:|---:|---:|---|
| 0 Auditoría | No | No | No | Mapa técnico del frontend |
| 1 Design System | Sí | No | No | Tokens + componentes base |
| 2 Navigation Shell | Sí | No | No | Tabs premium + Quick Actions |
| 3 Planner Visual | Sí | No | No | Planner diario simple |
| 4 Home Visual | Sí | No | No | Home cálida y operativa |
| 5 Auth/Household/Profile | Sí | No | No | Flujos confiables y premium |
| 6 Motion/Haptics/QA | Sí | No | No | Pulido final y QA |

---

# 8. Prompt corto de emergencia si Antigravity se desvía

Usar si Antigravity empieza a tocar backend, endpoints o reescribir demasiado:

```md
Detenete.

Volvé al alcance de la fase actual.

Reglas obligatorias:
- No backend.
- No endpoints.
- No services salvo adaptación visual mínima inevitable.
- No Supabase directo.
- No dependencias nuevas.
- No reescritura masiva.
- Preservar Auth/Household/Planner real.

Antes de seguir, reportá:
1. qué archivo querías tocar;
2. por qué;
3. si es estrictamente necesario;
4. alternativa visual sin tocar lógica;
5. impacto en `npx.cmd tsc --noEmit`.
```

---

# 9. Prompt corto para pedir revisión antes de instalar dependencia

Usar si Antigravity propone blur/haptics/calendar/etc.

```md
No instales dependencias todavía.

Reportá:
1. nombre de la dependencia;
2. para qué la necesitás;
3. qué archivo la usaría;
4. alternativa usando dependencias ya instaladas;
5. impacto visual si no se instala;
6. comando exacto que propondrías ejecutar si se aprueba.

Esperá confirmación antes de instalar.
```

---

# 10. Prompt corto para corregir TypeScript al final de una fase

Usar si una fase termina con errores nuevos.

```md
Corregí únicamente los errores nuevos de TypeScript generados por la fase actual.

Reglas:
- No tocar backend.
- No tocar endpoints.
- No cambiar lógica real.
- No ampliar alcance visual.
- No refactor masivo.
- No instalar dependencias.

Tareas:
1. Identificar errores nuevos vs preexistentes.
2. Corregir imports, props, types o null checks necesarios.
3. No cambiar contratos de datos reales.
4. Ejecutar nuevamente `npx.cmd tsc --noEmit`.
5. Reportar archivos modificados y resultado.
```

---

# 11. Checklist final para el usuario antes de demo

Después de completar todas las fases, verificar manualmente:

- Usuario A puede registrarse/loguearse.
- Usuario A puede crear hogar.
- Usuario A puede generar invite link.
- Usuario B puede registrarse/loguearse.
- Usuario B puede pedir unirse por link.
- Usuario A puede aprobar a Usuario B.
- Ambos entran al mismo hogar.
- Usuario A crea tarea.
- Usuario B ve tarea.
- Usuario B completa tarea.
- Usuario A ve cambio.
- Usuario A crea evento.
- Usuario B ve evento.
- Home muestra resumen real de tareas/eventos.
- Planner muestra Tasks/Calendar sin saturación.
- Módulos mock se ven premium pero no bloquean demo.
- `npx.cmd tsc --noEmit` pasa antes de presentar.

---

ANTIGRAVITY PROMPTS READY
