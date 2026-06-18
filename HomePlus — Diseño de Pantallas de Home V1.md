**# Diseño de Pantallas de Home V1 — HomePlus**

**\*\*Producto:\*\* HomePlus — Sistema Operativo del Hogar**

**\*\*Versión:\*\* 1.0 (reescritura tras auditoría contra Final Spec V1)**

**\*\*Fecha:\*\* Junio 2026**

**\*\*Dependencias:\*\* Final Spec V1 (documento maestro canónico), UX Philosophy V2.0, Design System V1 (pendiente), UX Writing Guide V1 (pendiente)**

**\*\*Alcance:\*\* Mobile-first (375×812px). 7 roles: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor, Invitado, Empleado Familiar.**

**> \*\*Principio rector (§18.01–§18.04):\*\* Home es el centro operativo del hogar. Resume información, NO administra información. Responde: ¿cómo está el hogar?, ¿qué requiere atención?, ¿qué debo hacer yo?, ¿hay riesgo? Toda información mostrada conduce al módulo que la administra.**

**---**

**# 0. ARQUITECTURA UNIVERSAL DEL HOME**

**## 0.1 Las 4 Capas del Home**

**Toda pantalla de Home respeta la jerarquía de 4 capas definida en UX Philosophy §2.1. El orden es fijo; lo que cambia por rol es el contenido, no la estructura.**

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

**│ CAPA 4: EXPLORACIÓN │ ← Navegación a otros dominios.**

**│ Bottom Nav + enlaces cruzados │ Nunca compite con Capa 1 o 2.**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**\*\*Validación por pantalla — Home (UX Philosophy §2.1):\*\***

**| Capa | Home |**

**|------|------|**

**| Capa 1 (Atención) | Briefing diario (§18.06) + Atención Requerida (§18.11) |**

**| Capa 2 (Acción) | Tareas pendientes propias (1-tap para completar) |**

**| Capa 3 (Contexto) | Carga Familiar, Próximos Eventos, Presence Resumido, Actividad Familiar (§18.05) |**

**| Capa 4 (Exploración) | Bottom Nav canónica: `\[Home] \[People] \[+] \[Planner] \[More]` |**

**## 0.2 Orden Canónico de Bloques (§18.05)**

**El orden oficial de bloques en Home, establecido en Final Spec V1 §18.05:**

**1. \*\*Briefing Geni\*\* — Único widget, versión resumida permanente + ampliada cuando hay cambios relevantes (§18.06–§18.10)**

**2. \*\*Atención Requerida\*\* — SOS activo, tareas vencidas, pagos vencidos, aprobaciones pendientes, vencimientos (§18.11–§18.13)**

**3. \*\*Carga Familiar\*\* — Distribución de carga entre miembros (§18.23, visible según rol)**

**4. \*\*Próximos Eventos\*\* — Los más cercanos temporalmente**

**5. \*\*Tareas\*\* — Agrupadas por Responsabilidad (§18.14–§18.16)**

**6. \*\*Finanzas Relevantes\*\* — Condicional: solo si hay alertas (§18.19–§18.20)**

**7. \*\*Presence Resumido\*\* — Quién está en casa / dónde están (§18.17–§18.18)**

**8. \*\*Actividad Familiar\*\* — Feed resumido del hogar (§18.05)**

**\*\*Regla:\*\* Los bloques que un rol no ve se omiten, pero el orden relativo de los bloques visibles se preserva (§18.05).**

**## 0.3 Jerarquía de Prioridades (§18.24)**

**1. 🔴 SOS (prioridad máxima — desplaza todo)**

**2. 🟠 Atención Requerida**

**3. 🟡 Briefing**

**4. 🔵 Tareas**

**5. 🟢 Eventos**

**6. ⚪ Presence**

**7. ⚪ Actividad Familiar**

**## 0.4 Reglas Universales del Home**

**- \*\*Mobile-first absoluto.\*\* La pantalla del teléfono (375×812px) es el lienzo de diseño primario (UX Philosophy §PUX-01).**

**- \*\*Home DEBE caber en una pantalla.\*\* Scroll solo si es inevitable (>4 tareas, >3 eventos). La Capa 1 (Briefing + Atención Requerida) nunca requiere scroll (UX Philosophy §2.3).**

**- \*\*Briefing: máximo 3–5 líneas, legible en < 3 segundos\*\* (UX Philosophy §2.1).**

**- \*\*La acción principal accesible con el pulgar\*\* (zona inferior, 30% de pantalla).**

**- \*\*SOS siempre accesible vía swipe ↑ global\*\* (§24.11). No ocupa espacio en Home salvo que esté activo.**

**- \*\*Sin conexión:\*\* última información conocida + indicadores visibles de desactualización (§20).**

**- \*\*Home muestra resumen primero, detalle después.\*\* Home conduce al módulo; no administra (§18.02).**

**- \*\*Bottom Nav congelada V1:\*\* `\[Home] \[People] \[+] \[Planner] \[More]`. No se modifica sin enmienda a la especificación canónica (§24.04, §25).**

**- \*\*La gravedad determina prominencia.\*\***

**- \*\*SOS tiene prioridad máxima\*\* (desplaza cualquier otro contenido, §13.12).**

**## 0.5 Bottom Navigation — Congelada para todos los roles**

**\*\*Estructura canónica según Final Spec §24.04:\*\***

**\[ Home ] \[ People ] \[ + ] \[ Planner ] \[ More ]**



**\*.txt**

**Plaintext**

**| Tab | Ícono | Destino | Contenido principal | Visible para |**

**|-----|-------|---------|---------------------|--------------|**

**| Home | 🏠 | Home (§18) | Briefing, Atención Requerida, widgets | Todos |**

**| People | 👥 | People (§24.07) | Feed, Presence, Personas | Todos |**

**| `+` | ➕ | Quick Actions (§24.09) | Panel flotante: Geni (fijo) + acciones dinámicas | Todos |**

**| Planner | 📋 | Planner (§24.08) | Tasks, Calendar, Goals | Todos |**

**| More | ⋯ | More (§24.12) | Finance, Inventory, HomeCloud, Settings | Todos |**

**\*\*Reglas canónicas:\*\***

**- Bottom Nav congelada en V1. No se modifica sin enmienda a la especificación canónica (§25).**

**- La adaptación por rol cambia el \*\*contenido\*\* del Home y la información accesible dentro de cada dominio, \*\*no la estructura de navegación\*\* (UX Philosophy §4.2).**

**- Quick Actions (`+`) abre panel flotante con blur del fondo. Geni es el único elemento fijo (§24.09).**

**- SOS no está en Bottom Nav. No está en Quick Actions. Acceso vía swipe ↑ global (§24.11).**

**- People agrupa Feed, Presence y Personas (§24.07).**

**- Planner agrupa Tasks, Calendar y Goals (§24.08).**

**- More contiene herramientas especializadas: Finance, Inventory, HomeCloud, Settings (§24.12).**

**- El tap en el tab activo hace scroll to top + refresh en la pantalla actual.**

**---**

**# 1. HOME DEL COORDINADOR**

**## 1.1 Identidad del Rol**

**- \*\*Rol según Final Spec:\*\* Coordinador (§04.03) — responsable administrativo principal del hogar.**

**- \*\*Proporción Hogar/Persona:\*\* 70% / 30%**

**- \*\*Necesidad principal:\*\* Visión completa del hogar, distribución de carga, riesgos, gestión de miembros.**

**- \*\*Densidad:\*\* 5–6 items en lista, 3–4 cards en Home (UX Philosophy §2.4).**

**- \*\*Tono Geni:\*\* Informativo + métricas, 2 líneas máximo, tratamiento usted o nombre.**

**- \*\*Métricas visibles:\*\* Carga global, tendencias, presupuesto (UX Philosophy §4.1).**

**- \*\*Chips de filtro:\*\* 4–5 (Todo, Hoy, Mío, Por miembro, Tipo).**

**## 1.2 Estructura y Orden de Bloques**

**Orden en Home Coordinador (alineado con §18.05):**

**1. Briefing Geni (Capa 1 — siempre visible)**

**2. Atención Requerida (Capa 1.5 — condicional: solo si hay alertas/SOS)**

**3. Carga Familiar (Capa 3 — porcentajes visibles por miembro)**

**4. Próximos Eventos (Capa 3)**

**5. Tareas (Capa 2–3 — agrupadas por Responsabilidad)**

**6. Finanzas Relevantes (Capa 3 — condicional: solo si hay alertas)**

**7. Presence Resumido (Capa 3)**

**8. Actividad Familiar (Capa 3 — feed resumido)**

**## 1.3 Diagrama ASCII — Estado Normal**

**┌──────────────────────────────────────────┐ ── Status Bar (24px)**

**│ 12 de junio, 2026 · 08:42 📶 🔋 │**

**├──────────────────────────────────────────┤**

**│ │**

**│ Hola, Valeria 👋 │ ← Display · Fraunces 700 · 32px**

**│ Martes con movimiento │ ← Body S · text-secondary**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← CAPA 1: ATENCIÓN**

**│ │ 💬 Geni │ │ ← Card Destacada (borde izq prim-500, 4px)**

**│ │ │ │**

**│ │ "Hoy: 4 tareas, 2 eventos y 1 │ │ ← Body S · text-secondary · máx 3 líneas**

**│ │ documento por vencer. La carga │ │**

**│ │ está 60/40. ¿Arrancamos por │ │**

**│ │ las tareas?" │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← CAPA 1.5: ATENCIÓN REQUERIDA (condicional)**

**│ │ ⚠️ Atención requerida │ │ ← Card Alerta (bg alert-100, borde alert-500)**

**│ │ │ │ Solo visible si hay ≥1 item**

**│ │ 📋 Pago de servicios vence hoy │ │ ← List item compacto**

**│ │ 📄 Cédula verde vence en 5 días │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Carga de esta semana ─── │ ← CAPA 3: CONTEXTO**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← Card Estándar**

**│ │ 👤 Mariana ████████████ 60% │ │ ← Progress bar prim-500**

**│ │ 👤 Tomás ██████░░░░░░ 30% │ │**

**│ │ 👤 Luca ██░░░░░░░░░░ 10% │ │**

**│ │ 👤 D. Carlos ████░░░░░░░░ 20% │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Próximos eventos ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📅 HOY 14:30 │ │ ← List item con chip de fecha**

**│ │ Dentista de Luca │ │**

**│ │ Av. Santa Fe 1234 → │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ 📅 MAÑ 10:00 │ │**

**│ │ Reunión de padres │ │**

**│ │ Colegio San Marcos → │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Tareas pendientes ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ ☐ Pagar servicios │ │ ← Checkbox + chip vencimiento**

**│ │ Vence hoy · 💰 $45.000 │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ ☐ Comprar fruta │ │**

**│ │ Para el finde │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ ✓ Preparar viandas — Mariana │ │ ← Completada (tachado sutil)**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Finanzas ─── │ ← Condicional: solo si hay alertas**

**│ ┌────────────────────────────────────┐ │**

**│ │ ⚠️ Presupuesto al 92% │ │ ← Card Alerta compacta**

**│ │ Quedan 10 días del mes → │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Presencia ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 🟢 Mariana · En casa │ │ ← Avatar sm + estado**

**│ │ 🟡 Tomás · Escuela │ │**

**│ │ ○ D. Carlos · Sin datos (1h) │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Actividad ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 💜 Tomás completó 3 tareas │ │ ← Feed item compacto**

**│ │ esta semana │ │**

**│ │ 📸 Mariana subió una foto │ │**

**│ │ al álbum familiar │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**├──────────────────────────────────────────┤ ← CAPA 4: Bottom Nav**

**│ 🏠Home 👥People ➕ 📋Planner ⋯More │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**## 1.4 Contenido de Cada Bloque — Coordinador**

**### Bloque 1: Briefing Geni (§18.06–§18.10)**

**- \*\*Componente:\*\* Card Destacada (borde izquierdo prim-500, 4px)**

**- \*\*Avatar Geni:\*\* Ícono 32px**

**- \*\*Copy máximo:\*\* 3 líneas, legible en < 3 segundos**

**- \*\*Comportamiento:\*\* Versión resumida permanente. Al tap → se despliega versión ampliada (bottom sheet 50%)**

**- \*\*Variantes de copy:\*\***

**| Estado | Copy |**

**|--------|------|**

**| Día normal con tareas | "Hoy: 4 tareas, 2 eventos. La carga está 60/40. ¿Arrancamos por las tareas?" |**

**| Todo al día | "Todo al día por acá. Nada pendiente." |**

**| Mucha carga | "Hoy viene cargado: 6 tareas, 3 eventos y 1 vencimiento. ¿Revisamos prioridades?" |**

**| Carga desbalanceada | "La carga está 70/30 esta semana. ¿Querés revisar la distribución?" |**

**| Alerta financiera | "El presupuesto está al 92%. Quedan 10 días. ¿Ajustamos algo?" |**

**| Sin conexión | "Sin conexión. Última información: hace 45 min." |**

**### Bloque 2: Atención Requerida (§18.11–§18.13)**

**- \*\*Visibilidad:\*\* Condicional. Solo si hay ≥1 item de atención.**

**- \*\*Componente:\*\* Card Alerta (bg alert-100, borde izquierdo alert-500)**

**- \*\*Items que activan este bloque:\*\***

&#x20; **- SOS activo (🟠 máximo desplazamiento, ocupa toda la Capa 1)**

&#x20; **- Tareas vencidas (>24h)**

&#x20; **- Pagos vencidos**

&#x20; **- Documentos por vencer (≤5 días)**

&#x20; **- Aprobaciones pendientes**

**- \*\*Orden interno:\*\* SOS primero, luego por proximidad de vencimiento**

**- \*\*Máximo 3 items visibles.\*\* Si hay más → "Ver 2 más →"**

**### Bloque 3: Carga Familiar (§18.23)**

**- \*\*Visibilidad:\*\* Siempre (con datos). \*\*Exclusivo del Coordinador.\*\***

**- \*\*Componente:\*\* Card Estándar**

**- \*\*Contenido:\*\* Progress bars por miembro con porcentaje**

**- \*\*Color:\*\* prim-500 (arcilla) para carga normal, alert-500 para >60%**

**- \*\*Comportamiento:\*\* Al tap → detalle de carga por categoría (bottom sheet 50%)**

**- \*\*Copy del título:\*\* "Carga de esta semana"**

**### Bloque 4: Próximos Eventos**

**- \*\*Componente:\*\* Lista de items con chip de fecha**

**- \*\*Máximo 3 eventos visibles\*\***

**- \*\*Cada item:\*\* Chip con día relativo (HOY, MAÑ, LUN, etc.) + título + ubicación (si tiene) + chevron**

**- \*\*Orden:\*\* Por cercanía temporal**

**- \*\*Al tap:\*\* Navega al detalle del evento (Planner > Calendar)**

**### Bloque 5: Tareas (§18.14–§18.16)**

**- \*\*Componente:\*\* Lista de items con checkbox**

**- \*\*Agrupación:\*\* Por Responsabilidad (etiqueta sutil)**

**- \*\*Máximo 4 tareas visibles en Home.\*\* Si hay más → "Ver todas (8) →"**

**- \*\*Cada item:\*\* Checkbox + título + metadata (vencimiento, monto, responsable)**

**- \*\*Comportamiento:\*\* Tap en checkbox → completa con háptico ligero + animación + toast "Deshacer" 5s (UX Philosophy §1.4)**

**- \*\*Tareas completadas:\*\* Se muestran al final, tachado sutil, opacidad reducida**

**- \*\*Dinamismo (§18.15):\*\* Cuando las tareas se completan, los widgets desaparecen y el Home se reorganiza automáticamente.**

**### Bloque 6: Finanzas Relevantes (§18.19–§18.20)**

**- \*\*Visibilidad:\*\* Condicional. Solo si hay alertas financieras.**

**- \*\*Disparadores:\*\***

&#x20; **- Presupuesto ≥80%**

&#x20; **- Gasto grande reciente (>umbral configurado)**

&#x20; **- Deuda vencida**

&#x20; **- Pago próximo a vencer**

**- \*\*Componente:\*\* Card Alerta compacta (1 línea + chevron)**

**- \*\*Al tap:\*\* Navega a Finance en More**

**### Bloque 7: Presence Resumido (§18.17–§18.18)**

**- \*\*Componente:\*\* Card Estándar con avatares sm + indicador de presencia**

**- \*\*Máximo 4 miembros visibles\*\***

**- \*\*Indicadores:\*\***

&#x20; **- 🟢 En casa (success-500)**

&#x20; **- 🟡 Fuera, ubicación conocida (alert-500)**

&#x20; **- ○ Sin datos recientes (divider)**

**- \*\*Cada item:\*\* Avatar sm (32px) + nombre + estado + ubicación (si aplica)**

**- \*\*Orden:\*\* En casa → Fuera (por cercanía) → Sin datos**

**### Bloque 8: Actividad Familiar (§18.05)**

**- \*\*Componente:\*\* Card Estándar con items de feed compactos**

**- \*\*Máximo 3 items\*\***

**- \*\*Tipos de items:\*\***

&#x20; **- 💜 Reconocimiento: "X completó Y"**

&#x20; **- 📸 Nueva foto: "X subió una foto al álbum Z"**

&#x20; **- 🎯 Meta alcanzada: "X cumplió su meta de Y"**

&#x20; **- 🏠 Evento completado**

**- \*\*Al tap:\*\* Navega al Feed completo (People > Feed)**

**## 1.5 Estados del Home — Coordinador**

**### Estado 1: Normal (Happy Path)**

**Todo lo descrito en §1.3. Briefing con resumen, bloques con datos reales, sin alertas críticas.**

**### Estado 2: Con Alertas**

**- \*\*Atención Requerida visible\*\* entre Briefing y Carga Familiar.**

**- \*\*Card Alerta\*\* con borde alert-500, bg alert-100.**

**- \*\*Briefing\*\* incluye mención de la alerta.**

**- \*\*Tono Geni:\*\* Informativo, no alarmista. Sin emojis de urgencia.**

**### Estado 3: Con Emergencia (SOS Activo)**

**┌──────────────────────────────────────────┐**

**│ 🚨 SOS ACTIVO │ ← Banner full-width**

**│ Tomás necesita ayuda │ bg: error-100, borde error-500**

**│ Hace 3 min · Av. Santa Fe 1234 │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📞 Llamar a Tomás │ │ ← Botones de acción urgentes**

**│ └────────────────────────────────────┘ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📍 Ver ubicación │ │**

**│ └────────────────────────────────────┘ │**

**│ ──────────────────────────────────── │**

**│ (Resto del Home desplazado abajo) │ ← Todo el contenido normal**

**│ ... │ se desplaza hacia abajo**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**- \*\*SOS desplaza TODO el contenido del Home\*\* (§13.12, §18.24).**

**- \*\*Banner SOS full-width\*\* con color error-100, borde error-500.**

**- \*\*Información mínima:\*\* Quién, hace cuánto, dónde (si hay ubicación).**

**- \*\*Dos botones de acción:\*\* Llamar + Ver ubicación.**

**- \*\*El briefing normal NO se muestra.\*\***

**- \*\*Cuando se cancela SOS:\*\* El banner desaparece con fade-out 300ms. Home vuelve a normal.**

**### Estado 4: Todo al Día**

**┌──────────────────────────────────────────┐**

**│ Hola, Valeria 👋 │**

**│ Viernes tranquilo │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 💬 Geni │ │**

**│ │ "Todo al día por acá. Sin tareas, │ │**

**│ │ sin vencimientos. Buen momento │ │**

**│ │ para lo que quieras." │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Carga de esta semana ─── │**

**│ (distribución balanceada) │**

**│ │**

**│ ─── Próximos eventos ─── │**

**│ "Calendario libre por ahora. │**

**│ ¿Agregamos algo?" │**

**│ │**

**│ ─── Actividad ─── │**

**│ (últimos 3 items del feed) │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**- \*\*Briefing celebra sin euforia:\*\* Dato concreto, sin emojis excesivos.**

**- \*\*Atención Requerida:\*\* No visible (no hay items).**

**- \*\*Tareas:\*\* "Sin tareas pendientes" se fusiona con briefing (§18.16).**

**- \*\*Finanzas:\*\* No visible (sin alertas).**

**- \*\*Sin "¡Felicitaciones!" ni 🎉.\*\* Es un estado, no un logro.**

**### Estado 5: Sin Conexión (§20)**

**┌──────────────────────────────────────────┐**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📡 Sin conexión │ │ ← Banner info-100, info-600**

**│ │ Última actualización: 08:15 │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ Hola, Valeria 👋 │**

**│ (datos de 08:15) │ ← Body S, text-tertiary**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 💬 Geni │ │**

**│ │ "Sin conexión. Tus datos están │ │**

**│ │ seguros. Última información: │ │**

**│ │ hace 45 min." │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ (Resto del Home con datos cacheados) │ ← Última información conocida**

**│ Todos los timestamps con "hace X min" │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**- \*\*Banner "Sin conexión"\*\* fijo en zona superior, info-100 bg, info-600 text, no dismissable.**

**- \*\*Briefing\*\* incluye mención de desconexión.**

**- \*\*Datos cacheados\*\* visibles con timestamps de antigüedad.**

**- \*\*Acciones que requieren conexión:\*\* Deshabilitadas con indicador visual (opacidad 0.5).**

**### Estado 6: Primer Uso Post-Onboarding**

**┌──────────────────────────────────────────┐**

**│ Hola, Valeria 👋 │**

**│ Tu hogar está listo │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 💬 Geni │ │**

**│ │ "Bienvenida a tu hogar. Estas son │ │**

**│ │ tus primeras acciones." │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Para empezar ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📋 Creá tu primera tarea → │ │**

**│ └────────────────────────────────────┘ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 👤 Invitá a alguien → │ │**

**│ │ Tu hogar está solo │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Así va tu hogar ─── │**

**│ 📋 0 tareas · 📅 0 eventos · 💰 Sin gastos│**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**- \*\*No hay Atención Requerida\*\* (0 items).**

**- \*\*No hay Carga Familiar\*\* (1 solo miembro).**

**- \*\*No hay Actividad\*\* (0 eventos).**

**- \*\*Cards de acción sugerida\*\* con empty states que invitan a la primera acción.**

**---**

**# 2. HOME DEL ADULTO**

**## 2.1 Identidad del Rol**

**- \*\*Rol según Final Spec:\*\* Adulto (§04.04) — miembro operativo con amplios permisos.**

**- \*\*Proporción Hogar/Persona:\*\* 50% / 50%**

**- \*\*Necesidad principal:\*\* Visión operativa, responsabilidades propias + contexto familiar.**

**- \*\*Densidad:\*\* 4–5 items en lista, 2–3 cards en Home (UX Philosophy §2.4).**

**- \*\*Tono Geni:\*\* Ejecutivo, respetuoso, accionable, 1–2 líneas.**

**- \*\*Métricas visibles:\*\* Mis tareas, eventos próximos (UX Philosophy §4.1). \*\*Nunca carga de otros miembros.\*\***

**- \*\*Chips de filtro:\*\* 3 (Todo, Hoy, Mío).**

**## 2.2 Estructura y Orden de Bloques**

**Orden en Home Adulto (preservando orden canónico §18.05, omitiendo bloques sin permiso):**

**1. Briefing Geni (balance hogar/persona)**

**2. Atención Requerida (solo items propios: tareas vencidas propias, pagos propios, documentos propios)**

**3. Carga Familiar (interpretación de carga propia, nunca porcentajes de otros)**

**4. Próximos Eventos (propios + del hogar donde es participante)**

**5. Tareas (solo propias)**

**6. Finanzas Relevantes (condicional, alertas propias si aplica)**

**7. Presence Relevante (miembros con permiso de ubicación: hijos, pareja)**

**8. Actividad Familiar (feed resumido, sin métricas de carga)**

**## 2.3 Diagrama ASCII — Estado Normal**

**┌──────────────────────────────────────────┐**

**│ Hola, Mariana │ ← Display · Fraunces 700 · 32px**

**│ Miércoles 12 de junio │ ← Body S · text-secondary**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← CAPA 1: ATENCIÓN**

**│ │ 💬 Geni │ │**

**│ │ "Tenés 2 tareas para hoy y 1 │ │**

**│ │ evento a las 16. La tarjeta del │ │**

**│ │ auto vence el viernes." │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Tus tareas ─── │ ← CAPA 2: ACCIÓN**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ ☐ Pagar servicios │ │ ← Checkbox + metadata**

**│ │ Vence hoy · 💰 $45.000 │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ ☐ Preparar viandas │ │**

**│ │ Para mañana │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ ✓ Comprar fruta — Ayer │ │ ← Completada**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Esta semana ─── │ ← CAPA 3: CONTEXTO**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📅 HOY 16:00 │ │**

**│ │ Reunión de padres │ │**

**│ │ Colegio San Marcos → │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ 📅 VIE 19:00 │ │**

**│ │ Cena familiar │ │**

**│ │ En casa → │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Tu carga ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ Esta semana tenés 3 tareas. │ │ ← Sin porcentajes ajenos**

**│ │ Menos que la semana pasada. │ │ Solo interpretación propia**

**│ │ ¿Podés ayudar con algo más? │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── En casa ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 🟢 Mariana · En casa │ │ ← Presence relevante**

**│ │ 🟡 Luca · Escuela │ │ (no ve todos los miembros)**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Actividad ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 💜 Luca completó su lista hoy │ │ ← Feed resumido**

**│ │ 📸 Nueva foto en álbum familiar │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**├──────────────────────────────────────────┤ ← CAPA 4: Bottom Nav**

**│ 🏠Home 👥People ➕ 📋Planner ⋯More │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**## 2.4 Contenido de Cada Bloque — Adulto**

**### Bloque 1: Briefing Geni**

**- \*\*Foco:\*\* Balance hogar/persona. Tono ejecutivo.**

**- \*\*Copy variantes:\*\***

**| Estado | Copy |**

**|--------|------|**

**| Normal con tareas | "Tenés 2 tareas para hoy. La tarjeta del auto vence el viernes." |**

**| Todo al día | "Sin tareas pendientes. Nada que necesite tu atención ahora." |**

**| Mucha carga | "Tenés 4 tareas esta semana. ¿Revisamos prioridades?" |**

**| Menos carga que otras semanas | "Esta semana tenés menos tareas que otras semanas. ¿Podés ayudar con algo más?" |**

**### Bloque 2: Atención Requerida**

**- \*\*Visibilidad:\*\* Condicional. Solo items propios (tareas vencidas propias, pagos propios, documentos propios).**

**- \*\*Nunca ve alertas de otros miembros.\*\***

**### Bloque 3: Carga Familiar (Interpretación)**

**- \*\*NUNCA porcentajes de otros miembros.\*\* El Adulto no ve "Mariana 60%, Tomás 30%" (UX Philosophy §4.1: solo Coordinador ve carga global).**

**- \*\*Solo ve su propia carga\*\* con contexto: "Tenés 3 tareas. Menos que la semana pasada."**

**- \*\*Si Geni detecta que podría ayudar:\*\* "¿Podés ayudar con algo más?" (sin mencionar a quién — UX Philosophy: prohibida la presión social, §02.03, UX-06, UX-13).**

**### Bloque 4: Próximos Eventos**

**- \*\*Eventos propios + eventos del hogar\*\* donde es participante.**

**- \*\*Máximo 2 eventos visibles.\*\***

**### Bloque 5: Tareas**

**- \*\*Solo tareas propias.\*\* Nunca ve tareas de otros miembros.**

**- \*\*Checkbox\*\* para completar con 1-tap.**

**- \*\*Máximo 4 tareas visibles.\*\***

**- \*\*Sin agrupación por responsable\*\* (todas son propias).**

**### Bloque 6: Finanzas Relevantes**

**- \*\*Solo alertas propias\*\* (pagos propios, presupuestos donde es responsable).**

**- Condicional. Mismo comportamiento que Coordinador.**

**### Bloque 7: Presence Relevante**

**- \*\*Solo miembros con permiso de ubicación\*\* que el Adulto tiene configurado ver.**

**- \*\*Filtrado por relevancia:\*\* Hijos (si es padre/madre), pareja, miembros que están en casa.**

**### Bloque 8: Actividad Familiar**

**- \*\*Feed resumido del hogar\*\*, igual que Coordinador pero sin métricas de carga.**

**- \*\*Máximo 2 items.\*\***

**## 2.5 Estados del Home — Adulto**

**| Estado | Comportamiento |**

**|--------|---------------|**

**| \*\*Normal\*\* | Todo según §2.3 |**

**| \*\*Con alertas\*\* | Atención Requerida visible (solo items propios) |**

**| \*\*Con SOS\*\* | Ídem Coordinador: banner SOS full-width desplaza todo |**

**| \*\*Todo al día\*\* | Briefing: "Sin tareas pendientes. Nada que necesite tu atención ahora." Bloques de tareas y eventos muestran empty states |**

**| \*\*Sin conexión\*\* | Ídem Coordinador: banner + datos cacheados |**

**| \*\*Primer uso\*\* | Briefing de bienvenida. Empty states informativos |**

**---**

**# 3. HOME DEL ADOLESCENTE**

**## 3.1 Identidad del Rol**

**- \*\*Rol según Final Spec:\*\* Adolescente (§04.05) — miembro con autonomía progresiva.**

**- \*\*Proporción Hogar/Persona:\*\* 30% / 70%**

**- \*\*Necesidad principal:\*\* Autonomía, tareas gamificadas, baja exposición al contexto global.**

**- \*\*Densidad:\*\* 3–4 items en lista, 2 cards en Home (UX Philosophy §2.4).**

**- \*\*Tono Geni:\*\* Directo, sin sermón, con agencia. Tuteo + nombre. 1–2 líneas.**

**- \*\*Gamificación:\*\* Rachas ligeras, logros visuales. Sin comparación con otros (UX Philosophy §4.4, UX-13).**

**- \*\*Fuente base:\*\* 16px (body).**

**- \*\*Target táctil mínimo:\*\* 44px.**

**- \*\*Métricas visibles:\*\* Propias (UX Philosophy §4.1). \*\*Nunca carga de otros.\*\***

**- \*\*Chips de filtro:\*\* 2 (Hoy, Mío).**

**## 3.2 Qué NO ve el Adolescente**

**- ❌ Carga Familiar (porcentajes de otros miembros)**

**- ❌ Finanzas del hogar (solo ve su economía personal si está configurada)**

**- ❌ Presence global (no ve ubicación de todos)**

**- ❌ Métricas de carga de otros**

**- ❌ Atención Requerida global (solo items propios si aplica)**

**## 3.3 Estructura y Orden de Bloques**

**Orden en Home Adolescente (preservando orden canónico §18.05):**

**1. Briefing Geni (tono directo)**

**2. Atención Requerida (solo items propios: tareas vencidas propias)**

**3. Tareas propias gamificadas ("Misiones")**

**4. Progreso personal (rachas visuales, logros)**

**5. Próximos Eventos (solo propios)**

**6. Presence relevante (simplificado)**

**7. Actividad Familiar (feed simplificado, sin métricas)**

**## 3.4 Diagrama ASCII — Estado Normal**

**┌──────────────────────────────────────────┐**

**│ Hola, Tomás 🎒 │ ← Display · Fraunces 700 · 32px**

**│ Miércoles 12 de junio │**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← CAPA 1: ATENCIÓN**

**│ │ 💬 Geni │ │**

**│ │ "Tomás, tenés 2 misiones para │ │**

**│ │ mañana. ¿Las revisás?" │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Tus misiones ─── │ ← CAPA 2: ACCIÓN**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ ☐ Sacar el reciclaje │ │ ← Checkbox gamificado**

**│ │ Antes de las 20 · +15 XP │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ ☐ Ordenar el lavadero │ │**

**│ │ Para el finde · +20 XP │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ ✓ Limpiar la cocina — Ayer │ │ ← Completada**

**│ │ +15 XP · ¡3 días al día! 🔥 │ │ Indicador de racha**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Tu progreso ─── │ ← CAPA 3: CONTEXTO**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ ⭐ Nivel 4 │ │ ← Nivel actual**

**│ │ ████████████░░░░░░ 280 / 500 XP │ │ ← Progress bar acent-500 (miel)**

**│ │ Próxima recompensa: │ │**

**│ │ 🎯 50 XP más → "Elegir cena │ │ ← Recompensa concreta**

**│ │ del sábado" │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Esta semana ─── │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📅 VIE 08:00 │ │ ← Eventos propios solamente**

**│ │ Examen de Matemática │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ 📅 SÁB 10:00 │ │**

**│ │ Partido de fútbol │ │**

**│ │ Club Atlético → │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Actividad ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 💜 Luca completó su lista hoy │ │ ← Feed simplificado**

**│ │ 🏠 Mamá ya está en casa │ │ (sin métricas)**

**│ └────────────────────────────────────┘ │**

**│ │**

**├──────────────────────────────────────────┤ ← CAPA 4: Bottom Nav**

**│ 🏠Home 👥People ➕ 📋Planner ⋯More │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**## 3.5 Contenido de Cada Bloque — Adolescente**

**### Bloque 1: Briefing Geni**

**- \*\*Tono:\*\* Directo, sin vueltas. Tuteo + nombre de pila.**

**- \*\*Copy variantes:\*\***

**| Estado | Copy |**

**|--------|------|**

**| Normal | "Tomás, tenés 2 misiones para mañana. ¿Las revisás?" |**

**| Todo al día | "Sin misiones por ahora. Buen momento para lo tuyo." |**

**| Con atraso | "Tenés 1 misión del lunes sin completar. ¿La hacés hoy?" |**

**| Racha activa | "¡3 días al día! 🔥 ¿Seguimos mañana?" |**

**### Bloque 2: Atención Requerida**

**- \*\*Visibilidad:\*\* Condicional. Solo tareas propias vencidas (>24h).**

**- \*\*Nunca ve alertas de otros miembros ni del hogar.\*\***

**### Bloque 3: Tareas Gamificadas ("Misiones")**

**- \*\*Lenguaje:\*\* "Misiones", no "tareas" (gamificación ligera, UX Philosophy §4.4).**

**- \*\*Cada item:\*\* Checkbox + título + horario + XP**

**- \*\*XP por completar:\*\* Visible en cada misión (+15 XP, +20 XP)**

**- \*\*Racha:\*\* Indicador sutil de días consecutivos completando todo. 🔥 aparece con ≥3 días.**

**- \*\*Tono:\*\* Desafiante pero no presionante. \*\*Sin comparación con hermanos\*\* (UX-13).**

**### Bloque 4: Progreso Personal**

**- \*\*Componente:\*\* Card Estándar con progress bar acent-500 (miel)**

**- \*\*Nivel actual:\*\* "Nivel 4" con ícono ⭐**

**- \*\*Barra de XP:\*\* Track bg-secondary, fill acent-500**

**- \*\*Próxima recompensa:\*\* Concreta y alcanzable.**

**- \*\*Sin leaderboard. Sin comparación.\*\* Solo progreso personal (UX Philosophy §4.4).**

**### Bloque 5: Próximos Eventos**

**- \*\*Eventos propios:\*\* Exámenes, deportes, actividades, eventos sociales.**

**- \*\*Máximo 2 eventos visibles.\*\***

**- \*\*Sin eventos del hogar\*\* (a menos que sea participante).**

**### Bloque 6: Presence Relevante**

**- \*\*Simplificado:\*\* Solo miembros en casa (sin ubicaciones precisas).**

**- \*\*Sin datos de ubicación de otros miembros.\*\***

**### Bloque 7: Actividad Familiar**

**- \*\*Máximo 2 items.\*\***

**- \*\*Sin métricas de carga. Sin porcentajes.\*\***

**- \*\*Items:\*\* Reconocimientos, llegadas a casa, fotos nuevas.**

**- \*\*Tono:\*\* Informativo ligero, no "reporte familiar".**

**## 3.6 Estados del Home — Adolescente**

**| Estado | Comportamiento |**

**|--------|---------------|**

**| \*\*Normal\*\* | Todo según §3.4 |**

**| \*\*Todo al día\*\* | "Sin misiones por ahora." Progress bar y XP visibles (no desaparecen). Feed muestra últimos items |**

**| \*\*Con atraso\*\* | Briefing: "Tenés 1 misión del lunes sin completar." Sin presión. Sin mención a padres |**

**| \*\*Racha perdida\*\* | Sin indicador 🔥. Sin mensaje negativo. Simplemente no se muestra |**

**| \*\*Con SOS\*\* | Puede activar SOS propio con panel de selección (§24.11). Ve banner si otro miembro activa SOS |**

**| \*\*Sin conexión\*\* | Banner + datos cacheados. XP local se sigue registrando |**

**| \*\*Primer uso\*\* | Briefing de bienvenida. Misiones demo del onboarding. Avatar y color elegidos visibles |**

**---**

**# 4. HOME DEL NIÑO**

**## 4.1 Identidad del Rol**

**- \*\*Rol según Final Spec:\*\* Niño (§04.06) — acceso simplificado. No administra información familiar crítica.**

**- \*\*Proporción Hogar/Persona:\*\* 20% / 80%**

**- \*\*Necesidad principal:\*\* Visual, simple, tareas concretas, refuerzo positivo sin presión.**

**- \*\*Densidad:\*\* 2–3 items en lista, 1 card en Home (UX Philosophy §2.4).**

**- \*\*Tono Geni:\*\* Simple, concreto, visual. Tuteo + nombre. 1 línea.**

**- \*\*Gamificación:\*\* Rachas + logros visuales. Sin comparación. Sin deuda acumulada (UX Philosophy §4.4).**

**- \*\*Fuente base:\*\* 18px (body L) — UX Philosophy §7.2.**

**- \*\*Target táctil mínimo:\*\* 48px (UX Philosophy §4.4).**

**- \*\*Métricas visibles:\*\* Ninguna (UX Philosophy §4.1).**

**- \*\*Chips de filtro:\*\* 1 (Hoy).**

**## 4.2 Qué NO ve el Niño**

**- ❌ Carga Familiar (porcentajes, distribución)**

**- ❌ Finanzas del hogar**

**- ❌ Presence global con ubicaciones precisas**

**- ❌ Actividad Familiar detallada**

**- ❌ Atención Requerida**

**- ❌ Métricas de cualquier tipo**

**- ❌ Configuración, Finance, documentos salvo los propios (UX Philosophy §4.4)**

**## 4.3 Estructura y Orden de Bloques**

**Orden en Home Niño (simplificado, preservando esencia del orden canónico):**

**1. Saludo personalizado (muy visual, avatar grande)**

**2. Briefing Geni simplificado (1 línea)**

**3. Actividades del día (tareas simples, visuales — Capa 2 principal)**

**4. Progreso / logros del día (rachas visuales)**

**5. Recordatorios simples**

**6. Vista simplificada de la familia (avatares grandes, sin ubicación precisa)**

**## 4.4 Diagrama ASCII — Estado Normal**

**┌──────────────────────────────────────────┐**

**│ │**

**│ 🐱 │ ← Avatar grande del niño (72px)**

**│ ¡Hola, Luca! │ ← H2 · Fraunces 600 · 28px**

**│ Martes 12 │ ← Body L · text-secondary**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← CAPA 1-2: ATENCIÓN Y ACCIÓN**

**│ │ 🎯 Tu lista de hoy │ │ ← Card destacada (borde izq prim-500)**

**│ │ │ │**

**│ │ ┌──────────────────────────────┐ │ │**

**│ │ │ 🧸 Ordenar tu cuarto │ │ │ ← Ícono grande (32px) + texto**

**│ │ │ Antes de cenar │ │ │ Checkbox táctil (48px target)**

**│ │ │ ☐ │ │ │**

**│ │ └──────────────────────────────┘ │ │**

**│ │ │ │**

**│ │ ┌──────────────────────────────┐ │ │**

**│ │ │ 📚 Hacer la tarea │ │ │**

**│ │ │ Para mañana │ │ │**

**│ │ │ ☐ │ │ │**

**│ │ └──────────────────────────────┘ │ │**

**│ │ │ │**

**│ │ ┌──────────────────────────────┐ │ │**

**│ │ │ 🐶 Darle de comer a Moka │ │ │**

**│ │ │ A las 18:00 │ │ │**

**│ │ │ ☐ │ │ │**

**│ │ └──────────────────────────────┘ │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── ¡Qué bien! ─── │ ← CAPA 3: CONTEXTO (refuerzo)**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ ⭐ ¡3 días seguidos │ │ ← Logro visual**

**│ │ completando todo! │ │ Card con acent-500**

**│ │ │ │**

**│ │ 🗓️ L M M J V S D │ │ ← Calendario simple**

**│ │ ✅ ✅ ✅ ⬜ ⬜ ⬜ ⬜ │ │ Días completados: success-500**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── No te olvides ─── │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 💊 Tomar la vitamina │ │ ← Recordatorio simple**

**│ │ A las 9:00 │ │ Ícono grande**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── En casa ─── │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 🟢 😊 🟡 🎒 ○ 👤 │ │ ← Avatares grandes (56px)**

**│ │ Mamá Papá Tomás │ │ Con indicador presencia**

**│ │ En casa Trabajo Escuela │ │ Sin ubicación precisa**

**│ └────────────────────────────────────┘ │**

**│ │**

**├──────────────────────────────────────────┤ ← CAPA 4: Bottom Nav**

**│ 🏠Home 👥People ➕ 📋Planner ⋯More │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**## 4.5 Contenido de Cada Bloque — Niño**

**### Bloque 1: Saludo Personalizado**

**- \*\*Avatar del niño:\*\* Grande (72px), con el personaje/animal que eligió en onboarding (🐱 🐶 🐰 🦊 🐼 🐨).**

**- \*\*Saludo:\*\* "¡Hola, Luca!" en H2 Fraunces.**

**- \*\*Fecha simplificada:\*\* "Martes 12" sin año.**

**### Bloque 2: Briefing Geni (Simplificado)**

**- \*\*1 línea máximo.\*\***

**- \*\*Copy:\*\* "Luca, tu lista de hoy está lista." o similar.**

**- \*\*Se integra visualmente con el saludo, no como card separada.\*\***

**### Bloque 3: Actividades del Día (Tareas)**

**- \*\*Título:\*\* "🎯 Tu lista de hoy"**

**- \*\*Máximo 5 items\*\* (UX Philosophy §4.4).**

**- \*\*Cada item:\*\* Ícono grande (32px) + texto simple + checkbox grande (48px target).**

**- \*\*Lenguaje:\*\* Sujeto + verbo + objeto. "Ordenar tu cuarto." "Darle de comer a Moka."**

**- \*\*Sin horarios complejos.\*\* "Antes de cenar", "Para mañana", "A las 18:00".**

**- \*\*Sin montos de dinero.\*\* Sin XP numérico (la gamificación es visual, no numérica — UX Philosophy §4.4).**

**- \*\*Al completar:\*\* Animación de estrellitas (partículas acent-500, 400ms) + háptico ligero + tachado con check.**

**### Bloque 4: Progreso / Logros**

**- \*\*Racha visual:\*\* "¡3 días seguidos completando todo!" ⭐**

**- \*\*Calendario simple:\*\* 7 días con ✅ (success-500) o ⬜ (bg-secondary).**

**- \*\*Sin números de "productividad".\*\* La racha se resetea cada semana sin penalización.**

**- \*\*Si no completa:\*\* Al día siguiente se resetea. No se acumulan "deudas". No hay contador de "días sin hacer" (UX Philosophy §4.4).**

**### Bloque 5: Recordatorios Simples**

**- \*\*Solo los relevantes para el niño:\*\* Medicación, hora de bañarse, llamar a abuelos.**

**- \*\*Ícono grande + texto simple.\*\***

**- \*\*Sin alarma intrusiva.\*\* Notificación visual en Home.**

**### Bloque 6: Vista Simplificada de la Familia**

**- \*\*Avatares grandes (56px)\*\* con indicador de presencia.**

**- \*\*Nombres como el niño los conoce:\*\* "Mamá", "Papá", "Tomás" (no "Mariana", "Carlos").**

**- \*\*Estados simples:\*\* "En casa", "Trabajo", "Escuela".**

**- \*\*Sin ubicación precisa.\*\* Sin direcciones.**

**## 4.6 Comportamiento Dinámico — Niño**

**### Al completar una tarea:**

**1. Checkbox se rellena con animación success-500 (300ms)**

**2. Háptico ligero**

**3. Estrellitas (3 partículas acent-500, 400ms)**

**4. Texto: "¡Listo! 🎯" en H3**

**5. La tarea se tacha y baja opacidad**

**6. Si es la última del día → Card de celebración: "¡Completaste todo! 🌟"**

**### Al no completar:**

**- No hay penalización visual.**

**- Al día siguiente, nueva lista. La anterior no se menciona.**

**- Sin "deuda acumulada". Sin "te faltó esto" (UX Philosophy §4.4).**

**## 4.7 Estados del Home — Niño**

**| Estado | Comportamiento |**

**|--------|---------------|**

**| \*\*Normal\*\* | Todo según §4.4 |**

**| \*\*Todo completado\*\* | "¡Completaste todo! 🌟" Card de celebración acent-100. Animación de estrellitas. Mañana nueva lista |**

**| \*\*Lista vacía\*\* | "Tu lista está vacía por ahora. ¡Buen trabajo!" Sin acción requerida |**

**| \*\*Sin conexión\*\* | Banner simplificado: "Sin conexión 📡". Tareas cacheadas visibles |**

**| \*\*Primer uso\*\* | Lista demo del onboarding completada. Avatar visible. "¡Bienvenido, Luca! Esta es tu lista" |**

**| \*\*SOS\*\* | Puede activar SOS 🟠🟡 con panel de selección. No puede emitir 🔴 (§24.11). Ve banner si otro miembro activa SOS |**

**---**

**# 5. HOME DEL ADULTO MAYOR**

**## 5.1 Identidad del Rol**

**- \*\*Rol según Final Spec:\*\* Adulto Mayor (§04.07) — experiencia adaptada. Mantiene permisos equivalentes a Adulto.**

**- \*\*Proporción Hogar/Persona:\*\* 30% / 70%**

**- \*\*Necesidad principal:\*\* Medicación, turnos médicos, contacto emergencia, movilidad, foco en lo urgente.**

**- \*\*Densidad:\*\* 2–3 items en lista, 1 card en Home (UX Philosophy §2.4).**

**- \*\*Tono Geni:\*\* Asistivo, sin prisa, reforzante. Usted + nombre. 2 líneas máx.**

**- \*\*Accesibilidad:\*\* Modo Senior completo. Fuente 18px+, AA+, targets 56px+, solo tap (UX Philosophy §4.3).**

**- \*\*Métricas visibles:\*\* Ninguna (UX Philosophy §4.1).**

**- \*\*Chips de filtro:\*\* 1 (Hoy).**

**## 5.2 Especificaciones de Accesibilidad (Modo Senior)**

**| Especificación | Valor | Referencia |**

**|---------------|-------|------------|**

**| Fuente base body | 18px/26px | UX Philosophy §7.2 |**

**| Título pantalla (H1) | 36px/44px | UX Philosophy §7.2 |**

**| Target táctil mínimo | 56px | UX Philosophy §4.3 |**

**| Contraste | AA+ forzado | UX Philosophy §7.4 |**

**| Navegación | Solo tap. Sin swipe, long press, pull-to-refresh | UX Philosophy §4.3 |**

**| Bottom Nav | Se mantiene estructura canónica. Contenido adaptado | UX Philosophy §4.3 |**

**| Toast duración | 8s (doble default) | UX Philosophy §4.3 |**

**| Labels | Siempre visibles (nunca solo íconos) | UX Philosophy §4.3 |**

**| Scroll horizontal | No existe | UX Philosophy §4.3 |**

**| Animaciones | Reducidas o eliminadas (respeta prefers-reduced-motion) | UX Philosophy §5.2 |**

**## 5.3 Estructura y Orden de Bloques**

**Orden en Home Adulto Mayor (priorizando §04.07: Personas, Eventos, Recordatorios, Medicación, Coordinación):**

**1. Saludo + fecha (fuente grande)**

**2. Briefing Geni (tono asistivo)**

**3. Medicación pendiente (Capa 1-2: LO MÁS IMPORTANTE — desde Inventory §09.11–§09.13)**

**4. Próximos turnos médicos (Eventos relevantes)**

**5. Contactos importantes (Capa 2: zona de pulgar)**

**6. Presence relevante (Personas — quién está en casa)**

**7. Botón SOS accesible (alternativa de tap al swipe up global, requerido por UX Philosophy §4.3 y §7.3)**

**## 5.4 Diagrama ASCII — Estado Normal**

**┌──────────────────────────────────────────┐**

**│ │ ← Modo Senior: \[data-mode="senior"]**

**│ Buenos días, Don Carlos 🌿 │ ← H1 · Fraunces 600 · 36px/44px**

**│ Martes 12 de junio de 2026 │ ← Body · 18px/26px**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← CAPA 1: ATENCIÓN**

**│ │ 💬 Geni │ │ ← Card Destacada senior**

**│ │ │ │ padding: 20px (+25%)**

**│ │ "Don Carlos, su medicación de │ │**

**│ │ las 9 está por vencer. ¿Quiere │ │ ← Body senior: 18px/26px**

**│ │ que le avise de nuevo?" │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Su medicación ─── │ ← CAPA 2: ACCIÓN PRINCIPAL**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 💊 Losartán │ │ ← Card Alerta (alert-100)**

**│ │ 50 mg │ │ target: 56px+**

**│ │ Tomar a las 9:00 │ │**

**│ │ │ │**

**│ │ ┌────────────────────────────┐ │ │**

**│ │ │ Ya la tomé │ │ │ ← Botón primario lg (64px)**

**│ │ └────────────────────────────┘ │ │ Zona de pulgar**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Próximos turnos ─── │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 🏥 Dr. Rodríguez │ │ ← Card Estándar senior**

**│ │ Cardiología │ │**

**│ │ Jueves 15 · 10:30 │ │**

**│ │ Av. Córdoba 2345, 3° B │ │ ← Dirección completa**

**│ │ │ │**

**│ │ ┌────────────────────────────┐ │ │**

**│ │ │ 🚗 Cómo llegar │ │ │ ← Botón secondary lg**

**│ │ └────────────────────────────┘ │ │ Abre maps**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Contactos ─── │ ← CAPA 2: ZONA DE PULGAR**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 👤 Mariana (hija) │ │ ← Contacto de emergencia**

**│ │ ┌──────────────────────────────┐ │ │ Avatar md (56px) + nombre**

**│ │ │ 📞 Llamar │ │ │ Botón ghost lg**

**│ │ └──────────────────────────────┘ │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ 👤 Tomás (nieto) │ │**

**│ │ ┌──────────────────────────────┐ │ │**

**│ │ │ 📞 Llamar │ │ │**

**│ │ └──────────────────────────────┘ │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Esta semana ─── │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📅 SÁB 20:00 │ │ ← Eventos simplificados**

**│ │ Cena familiar │ │**

**│ │ En casa │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── En casa ─── │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 🟢 Mariana · En casa │ │ ← Presence relevante**

**│ │ 🟡 Luca · Escuela │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**├──────────────────────────────────────────┤**

**│ ┌────────────────────────────────────┐ │**

**│ │ 🆘 EMERGENCIA │ │ ← Botón SOS prominente**

**│ │ Mantenga presionado │ │ bg: error-500, text: white**

**│ └────────────────────────────────────┘ │ Altura: 64px, full-width**

**│ │ SIEMPRE visible**

**├──────────────────────────────────────────┤ ← CAPA 4: Bottom Nav**

**│ 🏠Home 👥People ➕ 📋Planner ⋯More │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**## 5.5 Contenido de Cada Bloque — Adulto Mayor**

**### Bloque 1: Saludo + Fecha**

**- \*\*Tratamiento:\*\* "Don Carlos" o "Doña María" (respetando lo configurado en onboarding).**

**- \*\*Fecha completa:\*\* "Martes 12 de junio de 2026" (día + número + mes + año).**

**- \*\*Sin íconos superfluos.\*\* Sin emojis excesivos. 🌿 es aceptable (asociado a calma).**

**### Bloque 2: Briefing Geni**

**- \*\*Tono asistivo, sin prisa.\*\***

**- \*\*Copy variantes:\*\***

**| Estado | Copy |**

**|--------|------|**

**| Normal con medicación | "Don Carlos, su medicación de las 9 está por vencer. ¿Quiere que le avise de nuevo?" |**

**| Con turno próximo | "Don Carlos, el jueves tiene turno con el Dr. Rodríguez a las 10:30. ¿Quiere ver cómo llegar?" |**

**| Todo al día | "Don Carlos, no tiene nada pendiente para hoy." |**

**| Sin conexión | "Sin conexión, Don Carlos. Sus recordatorios están guardados." |**

**### Bloque 3: Medicación Pendiente (desde Inventory §09.11–§09.13)**

**- \*\*EL BLOQUE MÁS IMPORTANTE del Home del Adulto Mayor\*\* (§04.07).**

**- \*\*Card Alerta\*\* (alert-100, borde alert-500) para medicación próxima.**

**- \*\*Información:\*\* Nombre del medicamento, dosis, horario.**

**- \*\*Botón grande "Ya la tomé"\*\* (64px, primario, zona de pulgar).**

**- \*\*Al tocar:\*\* Confirmación con háptico medium + toast "Registrado. 💊" (8s).**

**- \*\*Si no confirma:\*\* Geni re-pregunta a los 30 min.**

**- \*\*Máximo 2 medicamentos visibles\*\* (si toma más, se agrupan por horario).**

**### Bloque 4: Próximos Turnos Médicos (Eventos)**

**- \*\*Card Estándar senior\*\* con:**

&#x20; **- Nombre del médico + especialidad**

&#x20; **- Fecha y hora en formato claro: "Jueves 15 · 10:30"**

&#x20; **- Dirección completa**

&#x20; **- Botón "🚗 Cómo llegar" → abre Google Maps / Apple Maps con la dirección pre-cargada**

**- \*\*Máximo 1 turno visible\*\* (el más próximo). Si hay más → "Ver todos →"**

**### Bloque 5: Contactos Importantes (§04.07)**

**- \*\*Máximo 3 contactos\*\* (configurados en onboarding o en Ajustes).**

**- \*\*Cada contacto:\*\* Avatar md (56px) + nombre + botón "📞 Llamar" (ghost lg).**

**- \*\*El contacto de emergencia\*\* (configurado en onboarding) siempre primero.**

**- \*\*Al tocar "Llamar":\*\* Inicia llamada telefónica nativa. Sin confirmación adicional.**

**- \*\*Zona de pulgar:\*\* Este bloque está en la mitad inferior de la pantalla.**

**### Bloque 6: Presence Relevante (§04.07 — "Personas")**

**- \*\*Quién está en casa.\*\* Simplificado.**

**- \*\*Máximo 3 miembros visibles.\*\***

**- \*\*Sin ubicaciones precisas.\*\* Solo estados: "En casa", "Fuera".**

**### Bloque 7: Botón SOS Accesible**

**- \*\*Alternativa de tap al swipe up global.\*\* Requerido por UX Philosophy §4.3 ("Sin gestos complejos. Solo tap") y §7.3 ("Todos los gestos deben tener alternativa de tap").**

**- \*\*Siempre visible\*\*, al final del contenido (zona de máximo acceso del pulgar).**

**- \*\*Componente:\*\* Botón danger, lg (64px), full-width.**

**- \*\*Label:\*\* "🆘 EMERGENCIA" o "Mantenga presionado".**

**- \*\*Comportamiento:\*\* Long press (1.5s) para activar → abre panel SOS (§24.11). Así se evitan activaciones accidentales.**

**- \*\*Coexiste con el swipe up global\*\* (el mecanismo canónico sigue disponible para quienes puedan usarlo).**

**## 5.6 Estados del Home — Adulto Mayor**

**| Estado | Comportamiento |**

**|--------|---------------|**

**| \*\*Normal\*\* | Todo según §5.4 |**

**| \*\*Medicación tomada\*\* | Card cambia a success-100: "✓ Losartán tomado a las 9:05". Próxima medicación aparece automáticamente |**

**| \*\*Sin medicación configurada\*\* | Bloque no visible. "No tiene medicamentos registrados." (se configura vía Inventory en More) |**

**| \*\*Con turno hoy\*\* | El turno sube a Capa 1, comparte espacio con medicación. Briefing incluye ambas menciones |**

**| \*\*Sin conexión\*\* | Banner senior simplificado. Medicación y contactos funcionan offline |**

**| \*\*Primer uso\*\* | Onboarding de 3 pasos completado (UX Philosophy §4.1). Home muestra medicación (si configuró) + contacto emergencia + botón SOS |**

**| \*\*Con SOS\*\* | Ídem resto: banner full-width. Botón SOS del Home cambia a "Cancelar emergencia" |**

**---**

**# 6. HOME DEL INVITADO**

**## 6.1 Identidad del Rol**

**- \*\*Rol según Final Spec:\*\* Invitado (§04.08) — acceso mínimo, participación limitada.**

**- \*\*Proporción Hogar/Persona:\*\* N/A (solo contexto autorizado).**

**- \*\*Necesidad principal:\*\* Ver solo lo asignado. Sin contexto del hogar.**

**- \*\*Densidad:\*\* Mínima. Solo información relevante a su función.**

**- \*\*Tono Geni:\*\* Funcional, neutro, sin contexto del hogar. Usted. 1 línea.**

**## 6.2 Qué NUNCA ve el Invitado**

**- ❌ Nombres de otros miembros (salvo que el coordinador lo autorice explícitamente)**

**- ❌ Carga familiar (porcentajes, distribución)**

**- ❌ Finanzas del hogar (ni propias ni globales)**

**- ❌ Presence global (no ve quién está en casa)**

**- ❌ Actividad familiar (feed, reconocimientos)**

**- ❌ Documentos (salvo los explícitamente compartidos)**

**- ❌ Métricas de cualquier tipo**

**## 6.3 Estructura y Orden de Bloques**

**Orden en Home Invitado (mínimo):**

**1. Saludo neutro + Briefing mínimo**

**2. Tareas asignadas (solo las suyas)**

**3. Eventos relacionados (donde es participante)**

**4. Información de contacto de emergencia (solo si el coordinador lo configuró)**

**## 6.4 Diagrama ASCII — Estado Normal**

**┌──────────────────────────────────────────┐**

**│ │**

**│ Hola, Rosa │ ← H2 · Fraunces 600 · 24px**

**│ Miércoles 12 de junio │**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← CAPA 1: ATENCIÓN (mínima)**

**│ │ 💬 Geni │ │**

**│ │ "Rosa, hoy tiene 1 tarea │ │**

**│ │ asignada." │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Sus tareas ─── │ ← CAPA 2: ACCIÓN**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ ☐ Limpieza general │ │**

**│ │ Miércoles · 9:00 a 13:00 │ │**

**│ │ Casa principal │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ ☐ Lavar cortinas │ │**

**│ │ Para el viernes │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Esta semana ─── │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📅 VIE 9:00 │ │**

**│ │ Limpieza profunda │ │**

**│ │ Casa principal │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Información ─── │**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📞 Contacto de la casa │ │ ← Solo si configurado**

**│ │ +54 11 5555-0000 │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**├──────────────────────────────────────────┤ ← CAPA 4: Bottom Nav**

**│ 🏠Home 👥People ➕ 📋Planner ⋯More │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**## 6.5 Contenido de Cada Bloque — Invitado**

**### Bloque 1: Saludo + Briefing**

**- \*\*Sin personalización del hogar.\*\* "Hola, Rosa" (sin nombre del hogar).**

**- \*\*Briefing mínimo:\*\* Solo menciona tareas propias. Sin contexto del hogar.**

**- \*\*Copy:\*\* "Rosa, hoy tiene 1 tarea asignada."**

**### Bloque 2: Tareas Asignadas**

**- \*\*Solo tareas donde es `assigned\_to`.\*\***

**- \*\*Sin visibilidad de otras tareas del hogar.\*\***

**- \*\*Checkbox para completar\*\* (igual que otros roles).**

**- \*\*Sin XP, sin rachas, sin gamificación.\*\***

**### Bloque 3: Eventos Relacionados**

**- \*\*Solo eventos donde es participante.\*\***

**- \*\*Sin visibilidad de otros eventos del hogar.\*\***

**### Bloque 4: Información de Contacto**

**- \*\*Condicional:\*\* Solo si el coordinador configuró un contacto de emergencia para el invitado.**

**- \*\*Nunca ve contactos de los miembros del hogar.\*\***

**## 6.6 Estados del Home — Invitado**

**| Estado | Comportamiento |**

**|--------|---------------|**

**| \*\*Normal\*\* | Todo según §6.4 |**

**| \*\*Sin tareas\*\* | "No tiene tareas pendientes." Empty state informativo |**

**| \*\*Sin eventos\*\* | Bloque no visible |**

**| \*\*Con SOS\*\* | Ve banner SOS si el coordinador configuró que los invitados reciban alertas. No puede activar SOS del hogar |**

**| \*\*Sin conexión\*\* | Banner + datos cacheados |**

**| \*\*Primer uso\*\* | Onboarding mínimo. Home con empty states |**

**---**

**# 7. HOME DEL EMPLEADO FAMILIAR**

**## 7.1 Identidad del Rol**

**- \*\*Rol según Final Spec:\*\* Empleado Familiar (§17) — colaborador operativo del hogar. No forma parte del núcleo familiar.**

**- \*\*Necesidad principal:\*\* Ver solo trabajo asignado. Sin contexto del hogar (§17.17).**

**- \*\*Densidad:\*\* Mínima. Solo información relevante a su función.**

**- \*\*Tono Geni:\*\* Funcional, neutro. Sin contexto del hogar. Usted. 1 línea.**

**## 7.2 Qué NUNCA ve el Empleado Familiar**

**- ❌ Nombres de miembros (salvo los necesarios para su trabajo)**

**- ❌ Carga familiar**

**- ❌ Finanzas del hogar**

**- ❌ Presence global**

**- ❌ Actividad familiar**

**- ❌ Configuración del hogar**

**- ❌ Documentos no asignados**

**## 7.3 Estructura y Orden de Bloques**

**Orden en Home Empleado Familiar (mínimo, centrado en trabajo):**

**1. Saludo neutro + Briefing mínimo**

**2. Tareas asignadas (solo las suyas, §17.10)**

**3. Horario laboral (§17.08)**

**4. Eventos relacionados (donde es participante)**

**5. Presence (solo si requiere por responsabilidad, §17.13–§17.14)**

**## 7.4 Diagrama ASCII — Estado Normal**

**┌──────────────────────────────────────────┐**

**│ │**

**│ Hola, Rosa │ ← H2 · Fraunces 600 · 24px**

**│ Miércoles 12 de junio │**

**│ │**

**│ ┌────────────────────────────────────┐ │ ← CAPA 1**

**│ │ 💬 Geni │ │**

**│ │ "Rosa, hoy tiene 2 tareas │ │**

**│ │ asignadas. Su horario: 9 a 13." │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Sus tareas ─── │ ← CAPA 2**

**│ │**

**│ ┌────────────────────────────────────┐ │**

**│ │ ☐ Limpieza general │ │**

**│ │ Miércoles · 9:00 a 13:00 │ │**

**│ │ Casa principal │ │**

**│ ├────────────────────────────────────┤ │**

**│ │ ☐ Lavar cortinas │ │**

**│ │ Para el viernes │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**│ ─── Su horario ─── │ ← CAPA 3**

**│ ┌────────────────────────────────────┐ │**

**│ │ 📅 Lunes 09:00 – 13:00 │ │**

**│ │ 📅 Miércoles 09:00 – 13:00 │ │**

**│ │ 📅 Viernes 09:00 – 13:00 │ │**

**│ └────────────────────────────────────┘ │**

**│ │**

**├──────────────────────────────────────────┤ ← CAPA 4: Bottom Nav**

**│ 🏠Home 👥People ➕ 📋Planner ⋯More │**

**└──────────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**---**

**# 8. MATRIZ COMPARATIVA: QUÉ VE CADA ROL EN HOME**

**| Bloque | Coordinador | Adulto | Adolescente | Niño | Adulto Mayor | Invitado | Empleado Familiar |**

**|--------|------------|--------|-------------|------|-------------|----------|-------------------|**

**| \*\*Briefing Geni\*\* | ✅ Completo (3 líneas) | ✅ Balance (2 líneas) | ✅ Directo (1-2 líneas) | ✅ Simplificado (integrado en saludo) | ✅ Asistivo (2 líneas) | ✅ Mínimo (1 línea) | ✅ Mínimo (1 línea) |**

**| \*\*Atención Requerida\*\* | ✅ Global (todos los miembros) | ✅ Solo items propios | ✅ Solo items propios | ❌ | ❌ (medicación es prioridad) | ❌ | ❌ |**

**| \*\*Carga Familiar\*\* | ✅ Porcentajes por miembro | ✅ Solo interpretación propia | ❌ | ❌ | ❌ | ❌ | ❌ |**

**| \*\*Tareas\*\* | ✅ Todas (agrupadas por Responsabilidad) | ✅ Solo propias | ✅ "Misiones" gamificadas | ✅ Lista visual simple | ❌ (medicación reemplaza) | ✅ Solo asignadas | ✅ Solo asignadas |**

**| \*\*XP / Gamificación\*\* | ❌ | ❌ | ✅ XP, nivel, recompensa | ✅ Rachas visuales, logros | ❌ | ❌ | ❌ |**

**| \*\*Finanzas Hogar\*\* | ✅ Alertas financieras (condicional) | ✅ Alertas propias (condicional) | ❌ | ❌ | ❌ | ❌ | ❌ |**

**| \*\*Eventos\*\* | ✅ Todos los del hogar | ✅ Propios + hogar | ✅ Solo propios | ❌ | ✅ Simplificados (1) + turnos médicos | ✅ Solo participante | ✅ Solo participante |**

**| \*\*Presence\*\* | ✅ Todos los miembros | ✅ Relevantes (hijos, pareja) | ✅ Simplificado (en casa) | ✅ Avatares grandes simplificados | ✅ Relevante (quiénes en casa) | ❌ | ✅ Solo si requiere por responsabilidad |**

**| \*\*Actividad Familiar\*\* | ✅ Feed completo (3 items) | ✅ Feed resumido (2 items) | ✅ Feed simplificado (2) | ❌ | ❌ | ❌ | ❌ |**

**| \*\*Medicación\*\* | ❌ (en Inventory, More) | ❌ (en Inventory, More) | ❌ | ✅ Recordatorios simples | ✅ BLOQUE PRINCIPAL | ❌ | ❌ |**

**| \*\*Contactos Emergencia\*\* | ❌ (en Perfil) | ❌ (en Perfil) | ❌ | ❌ | ✅ Visibles en Home | ✅ Solo si configurado | ❌ |**

**| \*\*Botón SOS accesible\*\* | ❌ (swipe up global) | ❌ (swipe up global) | ❌ (swipe up global) | ❌ (swipe up global) | ✅ Botón prominente en Home (alternativa tap) | ❌ | ❌ |**

**| \*\*Horario laboral\*\* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |**

**| \*\*Bottom Nav\*\* | `\[Home] \[People] \[+] \[Planner] \[More]` | `\[Home] \[People] \[+] \[Planner] \[More]` | `\[Home] \[People] \[+] \[Planner] \[More]` | `\[Home] \[People] \[+] \[Planner] \[More]` | `\[Home] \[People] \[+] \[Planner] \[More]` | `\[Home] \[People] \[+] \[Planner] \[More]` | `\[Home] \[People] \[+] \[Planner] \[More]` |**

**| \*\*Proporción Hogar/Persona\*\* | 70% / 30% | 50% / 50% | 30% / 70% | 20% / 80% | 30% / 70% | N/A | N/A |**

**---**

**# 9. REGLAS DE TRANSICIÓN ENTRE ESTADOS DEL HOME**

**## 9.1 Diagrama de Estados Universal**

**\*.txt**

**Plaintext**

**┌──────────────┐**

&#x20;               **│    NORMAL    │ ← Estado por defecto**

&#x20;               **│ (happy path) │**

&#x20;               **└──────┬───────┘**

&#x20;                      **│**

&#x20;    **┌─────────────────┼──────────────────┐**

&#x20;    **│                 │                  │**

&#x20;    **▼                 ▼                  ▼**

**┌────────────┐ ┌──────────────┐ ┌──────────────┐**

**│ CON ALERTAS│ │ TODO AL DÍA │ │ PRIMER USO │**

**│ (ámbar) │ │ (verde calma)│ │(post-onboard)│**

**└─────┬──────┘ └──────┬───────┘ └──────┬───────┘**

**│ │ │**

**│ │ │**

**▼ ▼ ▼**

**┌────────────┐ ┌──────────────┐ ┌──────────────┐**

**│ EMERGENCIA │ │ SIN CONEXIÓN │ │ NORMAL │**

**│(SOS rojo) │ │(banner info) │ │ (transición) │**

**└─────┬──────┘ └──────┬───────┘ └──────────────┘**

**│ │**

**│ │**

**▼ ▼**

**┌────────────┐ ┌──────────────┐**

**│ NORMAL │ │ NORMAL │**

**│(al cancelar│ │(al reconectar│**

**│ SOS) │ │ y sync) │**

**└────────────┘ └──────────────┘**



**\*.txt**

**Plaintext**

**## 9.2 Reglas de Transición**

**### NORMAL → CON ALERTAS**

**- \*\*Trigger:\*\* Aparece ≥1 item en Atención Requerida (tarea vencida, documento próximo a vencer, presupuesto ≥80%).**

**- \*\*Animación:\*\* Card Alerta slide-down + fade-in (300ms ease-out).**

**- \*\*Briefing:\*\* Se actualiza para incluir mención de la alerta.**

**- \*\*Prioridad:\*\* La alerta se inserta después del Briefing (Capa 1.5).**

**### NORMAL → EMERGENCIA (SOS)**

**- \*\*Trigger:\*\* Cualquier miembro activa SOS (§24.11).**

**- \*\*Animación:\*\* Banner SOS slide-down inmediato (150ms, sin ease-out por urgencia).**

**- \*\*Comportamiento:\*\***

&#x20; **- TODO el contenido del Home se desplaza hacia abajo (§13.12, §18.24).**

&#x20; **- El banner SOS ocupa la Capa 1 completa.**

&#x20; **- El briefing normal se reemplaza por mensaje de emergencia.**

&#x20; **- Los botones de acción SOS (Llamar, Ver ubicación) aparecen en Capa 2.**

&#x20; **- Vibración: heavy (iOS) / effectHeavyClick (Android) — UX Philosophy §5.1.**

**- \*\*Audio:\*\* Sonido de alerta del sistema (no custom — UX Philosophy §5.4).**

**### EMERGENCIA → NORMAL**

**- \*\*Trigger:\*\* SOS cancelado o resuelto.**

**- \*\*Animación:\*\* Banner SOS fade-out + slide-up (200ms ease-in).**

**- \*\*Toast:\*\* "SOS cancelado." (4s).**

**- \*\*Restauración:\*\* Home vuelve a su estado anterior (Normal, Con Alertas, etc.).**

**### NORMAL → TODO AL DÍA**

**- \*\*Trigger:\*\* 0 tareas pendientes, 0 alertas, 0 vencimientos.**

**- \*\*Animación:\*\* Bloques de tareas/alertas se colapsan con fade-out (300ms). Briefing se actualiza.**

**- \*\*Briefing:\*\* Cambia a tono "tranquilo". Sin celebración excesiva.**

**### TODO AL DÍA → NORMAL**

**- \*\*Trigger:\*\* Aparece ≥1 tarea o evento.**

**- \*\*Animación:\*\* Bloques reaparecen con fade-in (300ms).**

**### NORMAL → SIN CONEXIÓN**

**- \*\*Trigger:\*\* Pérdida de conectividad detectada.**

**- \*\*Animación:\*\* Banner "Sin conexión" slide-down (250ms).**

**- \*\*Datos:\*\* Se preserva última información conocida con timestamps (§20).**

**- \*\*Acciones:\*\* Las que requieren conexión se deshabilitan (opacidad 0.5).**

**### SIN CONEXIÓN → NORMAL**

**- \*\*Trigger:\*\* Reconexión + sincronización completada.**

**- \*\*Animación:\*\* Banner slide-up + fade-out (300ms). Datos se actualizan con fade-in.**

**- \*\*Toast:\*\* "Sincronizado." (2s) solo si había cambios pendientes.**

**### Cualquier Estado → PRIMER USO**

**- \*\*Trigger:\*\* Usuario completa onboarding (o recién instalado).**

**- \*\*Comportamiento:\*\* Home muestra cards de acción sugerida + empty states informativos.**

**- \*\*Transición a NORMAL:\*\* Automática al crear primera tarea o después de 24h.**

**## 9.3 Reglas de Scroll (UX Philosophy §2.3)**

**| Estado/Contexto | ¿Scroll? | Justificación |**

**|----------------|----------|---------------|**

**| Briefing (Capa 1) | NO | Debe leerse sin interacción. Si no cabe, el copy está mal |**

**| Atención Requerida | NO (máx 3 items) | Si hay más, "Ver N más →" |**

**| Carga Familiar | NO (máx 5 miembros) | Caben en viewport |**

**| Tareas | Scroll vertical si >4 | Lista scrolleable dentro del Home |**

**| Eventos | NO (máx 2–3) | Solo los más próximos |**

**| SOS | NO | El banner SOS + acciones caben sin scroll |**

**| Adulto Mayor | Preferir NO | Si requiere scroll, se prioriza medicación + contactos + SOS. Lo demás se oculta |**

**## 9.4 Reglas de Actualización del Home**

**| Trigger | Frecuencia de actualización | Datos afectados |**

**|---------|---------------------------|-----------------|**

**| Push notification (nueva tarea) | Inmediato (si app en foreground) | Briefing, Tareas |**

**| Evento completado por otro miembro | Polling cada 60s o push | Actividad, Tareas (si relevante) |**

**| Presence (llegada/salida) | Push en tiempo real (§08) | Presence |**

**| Presupuesto | Al abrir Home + push si umbral | Finanzas |**

**| SOS | Push inmediato (ignora todo) (§13.12) | Todo el Home |**

**| Medicación (Adulto Mayor) | CRON cada 30 min + push si próxima | Medicación |**

**| Datos cacheados (offline) | Última sincronización conocida (§20) | Todos (con timestamps) |**

**---**

**# 10. DECISIONES DE HOME TOMADAS**

**| # | Decisión | Alternativa considerada | Por qué esta | Referencia |**

**|---|----------|------------------------|-------------|------------|**

**| H-01 | \*\*Home híbrido: estado del hogar + acciones personales\*\* | Dashboard solo informativo | Home resume, no administra. El usuario abre para actuar, no solo para mirar (§18.02, §18.04) | Final Spec §18.02, UX-01 |**

**| H-02 | \*\*Briefing siempre visible, sin scroll, <3 segundos\*\* | Briefing colapsable o scrolleable | UX Philosophy §2.1: Capa 1 nunca requiere scroll. Si no cabe, el copy está mal | UX Philosophy §2.1, §2.3 |**

**| H-03 | \*\*Carga Familiar: porcentajes solo para Coordinador\*\* | Métrica visible para todos | UX Philosophy §4.1 y §02.03: prohibida la presión social. La carga es herramienta de coordinación, no de comparación | UX-06, UX-13 |**

**| H-04 | \*\*Atención Requerida como bloque condicional\*\* | Siempre visible (aunque vacío) | Home conserva atención, no información. Si no hay alertas, no ocupa espacio (§18.11) | Final Spec §18.11 |**

**| H-05 | \*\*SOS desplaza todo el contenido del Home\*\* | Banner pequeño + contenido normal | SOS es prioridad máxima (§13.12, §18.24). En emergencia, nada compite con la atención | Final Spec §13.12, UX-19 |**

**| H-06 | \*\*Adulto Mayor: medicación como bloque principal desde Inventory\*\* | Medicación en módulo separado | §04.07: para Adulto Mayor, la medicación es LO MÁS IMPORTANTE. Debe estar a 1-tap. Datos desde Inventory (§09.11–§09.13) | Final Spec §04.07, §09.11 |**

**| H-07 | \*\*Adolescente: "Misiones" + XP, sin comparación\*\* | Tareas estándar + ranking familiar | UX Philosophy §4.4: gamificación que refuerza, no que compite. Sin leaderboard | UX-13 |**

**| H-08 | \*\*Niño: lista visual, sin deuda acumulada\*\* | Tareas con contador de pendientes | UX Philosophy §4.4: sin presión. Si no completa, al día siguiente se resetea | UX Philosophy §4.4 |**

**| H-09 | \*\*Invitado: solo tareas y eventos asignados\*\* | Vista recortada del Home adulto | §04.08: el invitado no ve contexto del hogar. Privacidad por defecto | Final Spec §04.08 |**

**| H-10 | \*\*Adulto: "¿Podés ayudar con algo más?" sin mencionar a otros\*\* | "Mariana tiene más carga. ¿Ayudás?" | UX-06, UX-13: Geni nunca compara miembros. La sugerencia es en primera persona | UX-06, UX-13 |**

**| H-11 | \*\*Finanzas Relevantes condicional\*\* | Siempre visible | Home conserva atención (§18.19). Si no hay alerta financiera, no se muestra | Final Spec §18.19–§18.20 |**

**| H-12 | \*\*Tareas completadas visibles en Home\*\* | Solo tareas pendientes | Reconocimiento sin euforia (§18.16). Ver lo completado refuerza sin comparar | Final Spec §18.16 |**

**| H-13 | \*\*Sin conexión: datos cacheados + indicadores\*\* | Pantalla de error o bloqueo | §20: "Sin conexión. Tus datos están seguros." El hogar no se detiene sin internet | Final Spec §20 |**

**| H-14 | \*\*Bottom Nav congelada para todos los roles\*\* | Bottom Nav diferente por rol | §24.04 y §25: estructura canónica congelada. La adaptación es de contenido, no de navegación | Final Spec §24.04, §25 |**

**| H-15 | \*\*Adulto Mayor: botón SOS en Home como alternativa de tap\*\* | Solo swipe up global | UX Philosophy §4.3 y §7.3: solo tap para Adulto Mayor. Todo gesto requiere alternativa de tap | UX Philosophy §4.3, §7.3 |**

**| H-16 | \*\*Briefing único widget, resumido + ampliado\*\* | Múltiples widgets de briefing | §18.06–§18.10: un solo punto de entrada a Geni. Consistencia visual | Final Spec §18.06–§18.10 |**

**| H-17 | \*\*Proporción Hogar/Persona determina orden de bloques\*\* | Mismo orden para todos | UX Philosophy §4.2: cambiar jerarquía, no solo filtrar. Cada rol tiene su propia arquitectura de información | UX-12 |**

**| H-18 | \*\*Scroll solo si es inevitable (>4 tareas, >3 eventos)\*\* | Scroll siempre disponible | Home debe caber en una pantalla. Scroll = fricción (UX Philosophy §2.3) | UX Philosophy §2.3 |**

**| H-19 | \*\*Checkbox 1-tap para completar tareas\*\* | Abrir detalle para completar | UX Philosophy §1.1: Regla del 1-tap. La acción más frecuente debe ejecutarse con un solo toque | UX Philosophy §1.1 |**

**| H-20 | \*\*Medicación del Adulto Mayor desde Inventory\*\* | Módulo de salud separado | Inventory administra medicamentos (§09.11). Home muestra card desde Inventory, no inventa nuevo dominio | Final Spec §09.11–§09.13 |**

**---**

**# APÉNDICE: TABLA DE COMPONENTES DEL DESIGN SYSTEM USADOS POR BLOQUE**

**| Bloque | Componente DS | Variante | Observaciones |**

**|--------|--------------|----------|---------------|**

**| Briefing Geni | Card | Destacada (borde izq prim-500) | En Adulto Mayor: padding +25% |**

**| Atención Requerida | Card | Alerta (bg alert-100, borde alert-500) | Condicional |**

**| SOS Banner | Custom (no es Card estándar) | Full-width, bg error-100 | Desplaza todo |**

**| Carga Familiar | Card + ProgressBar | Estándar | ProgressBar: prim-500, alert-500 si >60% |**

**| Tareas | ListItem + Checkbox | Estándar | Checkbox táctil, target 44–56px según rol |**

**| Eventos | ListItem + Chip | Chip sm (HOY, MAÑ, LUN...) | Chip fecha con color semántico |**

**| Finanzas | Card | Alerta compacta | Condicional |**

**| Presence | Avatar + Badge | Avatar sm (32px), Badge presencia | 🟢🟡○ |**

**| Actividad | ListItem compacto | Sin leading icon | Ícono contextual (💜📸🎯) |**

**| XP/Nivel | Card + ProgressBar | ProgressBar acent-500 (miel) | Solo Adolescente |**

**| Medicación | Card + Button | Card Alerta, Button primary lg (64px) | Solo Adulto Mayor. Datos desde Inventory |**

**| Contactos | ListItem + Button | Avatar md (56px), Button ghost lg | Solo Adulto Mayor |**

**| SOS Button (Adulto Mayor) | Button | Danger lg (64px), full-width | Alternativa de tap. Coexiste con swipe up global |**

**| Saludo | Typography | Display (Fraunces 700, 32px) o H1 senior (36px) | Varía por rol |**

**---**

**\*Documento canónico de Diseño de Pantallas de Home para HomePlus V1. Auditado y corregido contra Final Spec V1 (documento maestro canónico) y UX Philosophy V2.0. Toda decisión de diseño se traza a un principio o especificación canónica. Bottom Nav congelada: `\[Home] \[People] \[+] \[Planner] \[More]`. Home resume, no administra (§18.02).\***



