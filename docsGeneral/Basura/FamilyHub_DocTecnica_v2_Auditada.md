# FamilyHub — Documentación Técnica v2.0 (Auditoría Nuclear)
**CTO + Auditor Senior | 160 Stress Tests Integrados | Secciones reescritas donde v1.0 falló**
**Stack:** RN/Expo SDK 52 · Supabase (sa-east-1) · Claude Sonnet 4 · Zustand 4 · NativeWind 4
**Equipo:** 4 Devs full-stack · Sprints 2 semanas · Presupuesto infra: $300-800 USD/mes (mes 9)

---

## 1. El Problema (Fragmentación, Ceguera de Datos) ⚠️ REESCRITA

**1. Pitch:** Las familias LATAM operan con 5+ apps desconectadas sin que ninguna reduzca la carga cognitiva de quien coordina. FamilyHub no agrega otra tarea — opera en modo pasivo: registra, sugiere y alerta sin requerir entrada manual. El sistema trabaja para la familia, no al revés.

**2. Benchmark LATAM:**
- Carga mental del coordinador (generalmente madre): gestiona 8-12 "proyectos mentales" simultáneos sin herramienta — FamilyHub la hace visible y delegable.
- 50% Android / 50% iOS en familias argentinas de NSE C1-C3 (Kantar 2025) — la app debe funcionar idénticamente en ambos ecosistemas desde el Sprint 1, sin features exclusivos de plataforma en MVP.
- Churn preventivo: métrica de "Silencio Activo" — familia que no registra ninguna actividad en 72h recibe push proactivo de IA con sugerencia contextual, no recordatorio genérico.
- **Métrica priorizada:** DAU/WAU >40% + "Multi-Module Adoption" — familias usando 3+ módulos en semana 2.

**3. Especificaciones (Reqs A–Z):**

*Registro pasivo — Anti-tarea:*
- La app no requiere entrada manual para las métricas core. Gastos: foto de ticket → OCR Edge Function → categorización automática. Documentos: fecha de vencimiento extraída por IA. Tareas: sugeridas por IA basadas en patrones (lunes siempre hay lista de compras).
- `passive_events(id, family_group_id, user_id, event_type TEXT, payload JSONB, source ENUM['manual','ocr','ai_suggestion','location'], created_at)` — auditoría completa del origen de cada dato.

*Modo Emergencia (<5 segundos):*
- Widget de pantalla bloqueada (iOS 16+ WidgetKit, Android KWGT API): 3 acciones sin desbloquear — SOS, ver historial médico (QR), llamar a contacto de emergencia. Sin autenticación, sin abrir app.
- Activación SOS: hold 2 segundos en widget → confirmación háptica → alerta a todos los miembros. Sin tap accidental.

*Cuantificación de Carga Mental:*
- `mental_load_index`: calculado semanalmente por Edge Function. Variables: tareas abiertas sin asignar, documentos sin registrar (detectados por IA en conversaciones del feed), gastos sin categorizar, alertas pendientes de respuesta. Score de 0-100 visible solo para el admin del grupo.
- Dashboard CEO: widget "Carga del Hogar" con distribución por miembro — quién está sobrecargado esta semana.

*Coexistencia con WhatsApp (no reemplazo):*
- No peleamos con WhatsApp. Lo complementamos. Deep links bidireccionales: desde WhatsApp, compartir un gasto → abre directamente el módulo de finanzas con monto pre-cargado. Desde la app, "Compartir por WhatsApp" genera un resumen formateado del balance.
- `wa_deep_link`: `familyhub://expenses/new?amount={X}&description={Y}` — URL scheme registrado en `app.json`.
- Integración WhatsApp Business API (Twilio): invitaciones al grupo familiar por WhatsApp en lugar de SMS — más tasa de apertura en AR (>90% vs 40% SMS).

*Muerte del Feed — Anti-deserción:*
- Si ningún miembro publica en 72h → Edge Function genera "Micro-Post Automático": resumen de la semana ("Esta semana completaron 7 tareas, ahorraron $12.400 en la vaquita del viaje"). Feed nunca vacío.
- `auto_posts`: flag `is_automated BOOLEAN DEFAULT false` visible solo en debug — el usuario ve contenido útil, no silencio.

*Mix iOS/Android — Paridad técnica:*
- Feature flags en `app_config` table para activar/desactivar features por plataforma. Si WidgetKit no está disponible (Android <12), fallback a shortcut de icono long-press.
- Testing obligatorio en ambas plataformas antes de cada release: emulador Android + simulador iOS en CI (EAS Build con device matrix).

*Notificaciones — Anti-falsa urgencia:*
- 3 canales explícitos con nombres visibles para el usuario en config de notificaciones:
  - `CRITICAL` (rojo): SOS, medicamento sin confirmar 30min, document vence hoy.
  - `IMPORTANT` (naranja): documento vence en 7 días, tarea vencida hace 24h.
  - `INFO` (neutro): nueva publicación en feed, recordatorio semanal de IA.
- `notification_preferences(user_id, channel TEXT, enabled BOOLEAN, quiet_hours_start TIME, quiet_hours_end TIME)` — cada miembro configura su propio umbral.
- Máximo 3 notificaciones INFO por día por familia. Enforceado en Edge Function de envío.

*Familias Ensambladas / Dos Casas:*
- `family_groups` soporta multi-group membership: un user_id puede pertenecer a 2 family_groups con roles diferentes (ej: Tomás en "Casa Mamá" y "Casa Papá").
- `family_members.primary_group BOOLEAN DEFAULT true` — la app abre el grupo primario por default, con switcher visible en el header.
- Gastos, documentos y calendarios son per-group. Feed opcional: el miembro puede ver ambos feeds o solo el primario.
- Permiso de ubicación: configurable por grupo — puede compartir ubicación en el grupo de mamá pero no en el de papá.

*Churn Preventivo:*
- PostHog custom event `family_risk_score`: calculado diariamente. Variables: días sin login de ningún miembro, días sin actividad en módulo financiero, ausencia de respuesta a 3+ notificaciones consecutivas.
- Score > 70 → trigger automático de email retention con "Lo que pasó esta semana en tu familia" (resumen personalizado, no genérico).
- Score > 90 → oferta de pausa de cuenta (no cancelación): "¿Querés pausar FamilyHub 30 días? Tus datos se conservan."

*Sentimiento de vigilancia — Diseño anti-panóptico:*
- Cada módulo de tracking (ubicación, verificación de tareas, checkin) tiene un indicador visible permanente en el perfil del miembro que indica qué está compartiendo en este momento.
- Ubicación: "Estás compartiendo tu ubicación con Casa Mamá · Hasta las 22:00" — siempre visible en la barra de status de la app.
- El adolescente puede silenciar cualquier tracking con 1 tap, con notificación automática a los padres de que lo hizo (transparencia, no evasión).

**4. Workload 4 Devs:**
- **Dev 1:** Schema passive_events + mental_load_index Edge Function + multi-group membership + notification_preferences. (Sprint 1-2)
- **Dev 2:** Widget pantalla bloqueada (iOS WidgetKit + Android fallback) + deep links WhatsApp + URL scheme. (Sprint 2-3)
- **Dev 3:** UI "Carga del Hogar" en dashboard CEO + auto-posts de feed + switcher de grupos. (Sprint 3)
- **Dev 4:** PostHog family_risk_score + email retention automation + notification channel UX. (Sprint 2, ongoing)

**5. Riesgo Fatal:** Si la app requiere entrada manual para generar valor desde el día 1, los usuarios la perciben como otra tarea y el churn ocurre antes de que el registro pasivo demuestre su utilidad — el onboarding debe mostrar valor con datos ya existentes (foto de ticket → gasto registrado en <10 segundos).

---

## 2. Principios Psicológicos (Dopamina, Regla 1 Tap) ⚠️ REESCRITA

**1. Pitch:** La arquitectura psicológica de FamilyHub combina Variable Reward Schedule (no recompensa fija), Efecto IKEA (el usuario construye algo con valor emocional), y prevención de adicción negativa (la gamificación no genera ansiedad por ausencia). La IA actúa como reforzador positivo automático, no como juez.

**2. Benchmark LATAM:**
- Duolingo: variable reward (lingots inesperados) retiene 2x más que recompensa fija — aplicar al sistema de puntos de FamilyHub.
- Bereal demostró que la fricción diseñada (foto en 2 minutos) puede ser un feature de fidelización si está socialmente acordada — el Snap de Verificación de tareas aplica el mismo principio.
- Fatiga de decisión: dashboards con >7 elementos de acción simultáneos reducen engagement 40% — el dashboard CEO tiene máximo 5 KPIs visibles; el resto accesible con 1 tap en "Ver más".
- **Métrica priorizada:** Retención D30 >25% + Streak promedio >5 días en la semana 3.

**3. Especificaciones (Reqs A–Z):**

*Variable Reward — Anti-aburrimiento semana 2:*
- Puntos no son fijos: `tasks.points_base INT + points_bonus INT` donde `points_bonus` es calculado por Edge Function con variabilidad aleatoria ±20% (seed diario para que sea predecible por familia pero no obvio).
- "Logros sorpresa": `achievement_triggers` — condiciones no anunciadas que disparan un badge inesperado (ej: "3 tareas completadas antes del mediodía" → badge "Madrugador"). La sorpresa es el driver de dopamina.
- `achievements(id, family_group_id, user_id, achievement_type TEXT, unlocked_at TIMESTAMPTZ, is_surprise BOOLEAN)`.

*Fricción de corrección — IA falla:*
- Si Claude API retorna error (timeout, rate limit, respuesta incoherente): el cliente muestra primero la respuesta cacheada más reciente, no un error. Si no hay caché: mensaje específico "El asistente está descansando, volvé en unos minutos" — nunca "Error 500".
- Respuestas IA son pre-validadas por Edge Function: si la respuesta contiene datos numéricos, se verifican contra la BD antes de enviar al cliente. Una respuesta que afirma "gastaste $50.000" cuando la BD dice $30.000 → se reemplaza con la cifra real.
- `ai_response_validation`: Edge Function valida coherencia de datos antes de entregar respuesta al cliente.

*Efecto IKEA — Qué construye el usuario:*
- 3 artefactos con valor emocional acumulativo que el usuario construye activamente:
  1. **Casa 3D**: mejora visible con cada logro familiar — el usuario ve su esfuerzo materializado.
  2. **Mapa de Hitos**: cronología visual de momentos familiares (fotos + gastos + logros) — la "memoria de la familia" que solo ellos tienen.
  3. **Perfil Financiero del Hogar**: el presupuesto que se autoconfigura con los datos reales de los primeros 30 días — el usuario siente que "enseñó" a la app cómo es su familia.

*Regla 1-Tap — Reducción de flujos actuales:*
- Auditoría obligatoria antes de cada Sprint: para las 5 acciones más frecuentes (registrar gasto, marcar tarea, ver balance, ver lista de compras, activar SOS) — si alguna supera 2 taps, el Sprint no puede cerrar sin rediseño.
- Acciones frecuentes → widgets: gasto rápido (cámara directa desde widget), tarea completada (desde notificación accionable sin abrir app), lista de compras (desde widget de pantalla principal).
- `action_tap_count`: PostHog event que mide taps reales por flujo — alerta automática a Slack si algún flujo crítico supera 3 taps en sesión promedio.

*Adicción negativa — Diseño de límites:*
- No existe notificación de "perdiste tu racha" — solo notificación positiva de "Recuperá tu racha antes de las 23:59". La pérdida no se anuncia, la recuperación sí.
- Límite de gamificación: máximo 3 tareas con puntos por día por miembro (niños y teens). Las tareas adicionales se completan sin puntos pero con reconocimiento textual. Evita la minería extractiva de puntos.
- Los puntos no expiran abruptamente — decaen gradualmente 5% por semana sin actividad después de 30 días. El usuario no pierde todo de golpe.

*Refuerzo positivo automático vía IA:*
- Edge Function cron 20:00 ART diario: analiza actividad del día → si al menos 1 miembro completó una tarea → genera micro-mensaje de IA en el feed (no push notification) con reconocimiento específico: "Tomás completó 3 tareas hoy. La racha familiar va por 5 días 🔥".
- El mensaje es generado por Claude con temperatura 0.7 (más variedad tonal, evita repetición mecánica).
- `ai_kudos(family_group_id, generated_text TEXT, triggered_by_event TEXT, created_at)` — visible en feed como post de IA, distinguible visualmente.

*Aversión a la pérdida — Streak:*
- "Racha de recuperación": si se rompe la racha, el sistema ofrece una ventana de 24h para completar 2 tareas y recuperar el bonus de racha sin conteo de días perdidos.
- Mecánica visual: la racha no desaparece al romperse — se muestra en gris con un temporizador de recuperación. No desaparece hasta que expire la ventana de 24h.
- `streak_recovery(user_id, family_group_id, streak_before_break INT, recovery_deadline TIMESTAMPTZ, recovered BOOLEAN)`.

*Jerarquía visual — Calma vs urgencia:*
- Paleta semántica: CRÍTICO = rojo `#DC2626` (solo SOS y medicamento urgente). IMPORTANTE = naranja `#F97316` (vencimientos <7 días). NORMAL = índigo `#7c6af7`. INFO = gris neutro `#6B7280`.
- El dashboard CEO comienza con el color neutro por defecto — solo cambia a alerta cuando hay algo urgente. No hay dashboard "rojo por default" que genera ansiedad crónica.
- Animaciones: solo en eventos de recompensa, nunca en estados de alerta. Las alertas son estáticas y directas.

*Psicología de grupos — Anti-culpa:*
- El "Carga del Hogar" dashboard muestra distribución de tareas sin nombres si hay desequilibrio >40%. Solo muestra nombres cuando el desequilibrio es leve (<20%). Diseño que informa sin señalar con el dedo.
- Sistema de "misiones grupales": tareas que requieren colaboración de 2+ miembros y dan puntos SOLO si todos cumplen. Fomenta solidaridad, no competencia.

*Fatiga de decisión — Dashboard anti-paralisis:*
- Dashboard CEO: máximo 5 acciones visibles simultáneamente. El resto en "Modo Focus" (expandible). El sistema prioriza automáticamente qué mostrar basado en urgencia + frecuencia de uso del usuario específico.
- Primera pantalla post-login: 1 sola acción sugerida por IA ("Hoy sería buen día para revisar el presupuesto — vence el mes en 3 días"). No un menú de opciones.

**4. Workload 4 Devs:**
- **Dev 1:** Variable reward en points_bonus + achievement_triggers + streak_recovery schema. (Sprint 3-4)
- **Dev 2:** ai_response_validation Edge Function + fallback de respuestas IA + ai_kudos cron. (Sprint 4)
- **Dev 3:** UI jerarquía visual por severidad + dashboard anti-paralisis + acción única sugerida post-login. (Sprint 3)
- **Dev 4:** action_tap_count PostHog + alerta automática Slack en flows >3 taps + auditoría de flujos pre-Sprint-close. (Sprint 2, ongoing)

**5. Riesgo Fatal:** Si el sistema de gamificación genera ansiedad por pérdida de racha (notificaciones de "perdiste X") en lugar de motivación por recuperación, convierte la app en una fuente de estrés familiar — exactamente el problema opuesto al que resuelve.

---

## 3. Propuesta de Valor (Capa Funcional y Espejo Familiar) ⚠️ REESCRITA

**1. Pitch:** FamilyHub tiene valor "Single-Player" desde el minuto 1 (gestor de documentos personales, asistente IA, lista de compras) que escala exponencialmente con cada miembro que se suma. El "Espejo Familiar" se muestra gradualmente y de forma privada — el admin lo ve primero y decide qué compartir con el grupo.

**2. Benchmark LATAM:**
- Valor sin presupuesto financiero: el módulo de documentos con alertas (DNI, seguro, revisión técnica) tiene valor para familias que no registran ningún gasto — segmento C2-C3 sin hábito financiero.
- Tablet de cocina: 12-15% de hogares argentinos NSE C1-C2 tienen tablet de 7-10" en cocina como "pantalla familiar central". La app debe tener layout responsive para tablet (mínimo 768px de ancho).
- Exportación de Legado: formato JSON + PDF descargable, disponible en cualquier momento desde Settings. Si la empresa cierra, 90 días de período de exportación con herramienta documentada.
- **Métrica priorizada:** NPS >50 al mes 3 + % de familias single-player que se convierten en multi-player en los primeros 14 días.

**3. Especificaciones (Reqs A–Z):**

*Valor Single-Player (Onboarding sin grupo):*
- El onboarding no bloquea el acceso a la app si el usuario no invita a nadie. Después del paso 1 (nombre del hogar), puede usar la app en modo "Solo por ahora". Los módulos disponibles: Documentos, Lista de Compras, Asistente IA.
- `family_groups.member_count INT` — si es 1, el dashboard muestra banner persistente "Invitá a tu familia para desbloquear Finanzas Compartidas y Gamificación" sin bloquear el acceso.
- El valor single-player es suficiente para justificar instalación y uso inicial. El valor grupal es el argumento de conversión.

*El Espejo sin romper la armonía:*
- El "Espejo" (datos de carga mental, distribución de tareas, gastos) es primero privado para el admin. El admin decide cuándo y qué compartir con el grupo.
- Modo "Privado del Admin": el admin puede ver todos los datos sin que aparezcan en el feed grupal. Activar "Compartir con el grupo" es una acción explícita, no el default.
- Los insights de IA que implican desequilibrio usan lenguaje neutro: "Esta semana las tareas del hogar estuvieron concentradas en 1 persona" — sin nombres hasta que el admin expande el detalle.

*Valor para miembros en otra ciudad:*
- Funciones que funcionan sin convivencia: Feed de hitos y fotos privadas, Historial Médico de Emergencia compartido (el hijo en Buenos Aires puede actualizar los medicamentos del padre en Córdoba), vaquitas para regalo grupal, SOS.
- `member_location_type ENUM['home','remote']` — los miembros remotos ven un subconjunto de features relevantes para su caso de uso (Feed + Documentos + Médico + Finanzas compartidas).

*Mudanzas y divorcios:*
- Módulo "Transición": cuando un admin inicia una separación de grupo, el sistema ofrece exportación parcial (cada miembro se lleva sus documentos personales y su historial de puntos). Los gastos compartidos se exportan como resumen de deuda.
- `group_dissolution_request(id, requested_by UUID, family_group_id UUID, status ENUM['pending','approved','completed'], created_at)` — requiere confirmación del 50%+ de adultos del grupo.

*Vista tablet (cocina):*
- Layout responsive: `breakpoints: { tablet: 768, desktop: 1024 }` en NativeWind config.
- En tablet: layout de 2 columnas (feed + dashboard simultáneos). Bottom Tab Bar se convierte en sidebar izquierdo.
- "Modo Tablero de Cocina": pantalla completa con Lista de Compras + tareas del día + clima — sin necesidad de interacción, actualización automática cada 5 minutos.

*Exportación de Legado Familiar:*
- `GET /api/family/:id/export` → genera ZIP con: todos los posts del feed (fotos incluidas), documentos descifrados (requiere passphrase del usuario), historial financiero en CSV, hitos en JSON.
- Formato: JSON estructurado + PDF legible por humanos (generado con `react-pdf` en Edge Function).
- Disponible siempre desde Settings > Privacidad > Exportar mis datos. Sin restricción de plan.

**4. Workload 4 Devs:**
- **Dev 1:** Single-player onboarding flow + member_location_type + group_dissolution_request schema. (Sprint 2)
- **Dev 2:** Layout tablet responsive — 2 columnas + sidebar + "Modo Tablero de Cocina". (Sprint 4)
- **Dev 3:** Exportación de legado — ZIP con fotos + CSV + PDF vía Edge Function. (Sprint 5)
- **Dev 4:** "Espejo privado del admin" — lógica de visibilidad de insights + UI de "compartir con el grupo". (Sprint 3)

**5. Riesgo Fatal:** Si el onboarding requiere obligatoriamente invitar a otros miembros para acceder a la app, el 40% de los usuarios que llegan solos (sin convencer aún a su familia) abandonan antes de ver cualquier valor — el Single-Player mode no es opcional, es la puerta de entrada.

---

## 4. Tipos de Usuario (CEO Hogar, Adolescente, Adulto Mayor) ⚠️ REESCRITA

**1. Pitch:** La arquitectura de usuarios resuelve 6 casos críticos ignorados en v1.0: olvido de contraseñas del adulto mayor, bloqueo de ex-pareja, delegación de auth, perfil de invitado (niñera), Súper-Admin hereditario y modo vacaciones. Sin estas rutas de borde, la app falla en el primer mes de uso real.

**2. Benchmark LATAM:**
- Adultos mayores en Argentina: 60% no recuerda contraseñas al mes — sin mecanismo de recuperación no-técnico, el módulo elder es inútil.
- Familias ensambladas: 28% de hogares argentinos son no-nucleares (INDEC 2022) — el perfil de "ex-pareja con acceso" es un riesgo de seguridad real, no un edge case.
- Invitados con acceso limitado (niñera, empleada): 15% de NSE ABC1 en AMBA — sin perfil invitado, comparten credenciales del admin (riesgo de seguridad crítico).
- **Métrica priorizada:** % de familias con 3+ roles activos a los 30 días + tiempo hasta primera acción del perfil elder post-setup.

**3. Especificaciones (Reqs A–Z):**

*Adolescente — Incentivo para no desinstalar:*
- El teen tiene acceso a una "Economía Propia": vaquitas personales (no familiares), historial de puntos personal, catálogo de canjes. Si desinstala la app, pierde su saldo de puntos y el historial de permisos ganados — sunk cost positivo diseñado.
- "Modo Social": el teen puede compartir su racha y logros con amigos fuera de la app vía deep link compartible. El logro es suyo, no de la familia — autonomía de identidad.
- Push notification teen: tono diferente, contenido diferente. "Tomás, ganaste 50 puntos hoy. Te faltan 150 para el permiso del sábado." — nunca "Recordatorio de tarea".

*Adulto Mayor — Olvido de contraseñas:*
- Auth sin contraseña para el perfil elder: Magic Link por WhatsApp/SMS (el familiar configura el número de celular, el elder solo recibe un link y toca). Sin email, sin contraseña.
- Recuperación delegada: el admin del grupo puede "re-enviar acceso" al elder desde su propio dispositivo — genera un nuevo Magic Link sin que el elder tenga que hacer nada técnico.
- Biometría configurada remotamente: el admin configura Face ID en el dispositivo del elder durante setup físico inicial. Después, el elder solo mira la cámara para entrar.
- `elder_auth_config(user_id, phone_number TEXT, magic_link_channel ENUM['whatsapp','sms'], biometric_enrolled BOOLEAN, last_access TIMESTAMPTZ)`.

*Privacidad — Hijo puede ocultar gastos al padre:*
- El sistema de "gastos privados" existe y es legítimo: `expenses.visibility ENUM['group','personal']`. Los gastos `personal` solo los ve el creador.
- Sin embargo: los gastos personales NO se incluyen en el balance de deudas compartidas. Si Tomás tiene un gasto privado que debería ser compartido, es su responsabilidad marcarlo como grupal.
- Los padres no pueden ver gastos privados del teen — es parte del "Contrato Emocional" que hace que el adolescente confíe en la app.

*Perfil Invitado — Niñera/Personal:*
- `role: 'guest'` — acceso limitado configurado por el admin: solo ve las tareas asignadas a ella/él, sin acceso a Finanzas, Documentos, Feed, ni ubicación de miembros.
- El perfil guest tiene `expiry_date TIMESTAMPTZ` — se desactiva automáticamente. El admin puede renovarlo.
- `guest_profiles(id, family_group_id UUID, name TEXT, email TEXT, assigned_tasks_only BOOLEAN, expiry_date TIMESTAMPTZ, created_by UUID)`.
- La niñera recibe solo notificaciones de tareas asignadas. Sin acceso al chat familiar.

*Perfil Infiltrado — Bloqueo de ex-pareja:*
- El admin puede revocar el acceso de cualquier miembro con 1 tap: `PATCH /api/members/:id/revoke`. Efectos inmediatos:
  1. JWT invalidado (Supabase Auth: `signOut()` forzado en todos los dispositivos del usuario).
  2. RLS actualizado: `family_members.active = false` → el miembro no puede leer ningún dato.
  3. Sus datos (fotos, posts del feed) pasan a estado `hidden` — visibles para el grupo, no para el miembro revocado.
  4. Recibe notificación: "Tu acceso a [Familia Martínez] fue revocado por el administrador."
- `PATCH /api/members/:id/revoke` requiere rol admin + confirmación con biometría del admin (segundo factor anti-accidental).

*Niños <10 años — UI iconos:*
- Perfil `child` (bajo 10): UI de iconos grandes, sin texto en botones principales. Iconos: 🧹 (limpiar cuarto), 🍽️ (poner la mesa), 🐕 (sacar al perro). El admin configura qué iconos aparecen.
- Puntos mostrados como estrellas con animación, no número. La casa 3D es el único KPI visible para el niño.
- Sin acceso a ningún otro módulo. Sin notificaciones de texto.

*Súper-Admin — Herencia:*
- `family_groups.super_admin_id UUID` — el creador del grupo. Puede transferirlo: `PATCH /api/groups/:id/super-admin` disponible solo para el super_admin actual.
- Si el super_admin está inactivo por >90 días, el sistema notifica a los demás adultos del grupo y permite votación de nuevo super_admin (mayoría simple).
- El super_admin es el único que puede disolver el grupo, cambiar el plan de suscripción, y revocar el acceso a otros admins.

*Modo Vacaciones — Silencio temporal:*
- `family_members.vacation_mode_until TIMESTAMPTZ` — el miembro silencia todas las notificaciones y no aparece como activo en el feed. Su ubicación se desactiva automáticamente.
- Los demás miembros ven "🌴 Roberto está de vacaciones hasta el 20 de enero" en su perfil.
- Las tareas asignadas al miembro en vacation_mode se reasignan automáticamente (si está configurado) o se marcan como "En pausa".

*Auth Delegada — Hijo autentica al abuelo:*
- "Setup Remoto": el admin envía un link de configuración inicial por WhatsApp al teléfono del elder. El elder toca el link → abre la app en modo "Configuración guiada" con 3 pasos visuales (foto, nombre, biometría). Sin formulario.
- El admin puede monitorear el progreso del setup remoto desde su dashboard: "Roberto completó 2/3 pasos del setup."
- Una vez configurado, el elder nunca vuelve a ver una pantalla de login.

**4. Workload 4 Devs:**
- **Dev 1:** Schema guest_profiles + elder_auth_config + super_admin_id + vacation_mode + revoke endpoint. (Sprint 2)
- **Dev 2:** Magic Link por WhatsApp/SMS para elder + setup remoto delegado + biometría remota. (Sprint 3)
- **Dev 3:** UI perfil child (iconos grandes, sin texto) + UI teen (economía propia + modo social). (Sprint 3)
- **Dev 4:** Revoke flow (JWT invalidation + RLS + hidden data) + votación de nuevo super_admin. (Sprint 3)

**5. Riesgo Fatal:** Si el bloqueo de un ex-pareja con acceso al grupo familiar no es inmediato e irreversible (JWT revocado en <1 segundo), la app se convierte en un instrumento de control o acoso — es el escenario legal y reputacional más peligroso del producto.

---

## 5. Monetización (Freemium, Suscripciones LATAM) ⚠️ REESCRITA

**1. Pitch:** El modelo de monetización resuelve 3 problemas LATAM que v1.0 ignoró: inflación ARS vs costos en USD (Claude API, Supabase), impuesto PAIS sobre tarjeta, y política de reembolso en caso de disolución familiar. El plan Free "secuestra" los datos históricos (no la funcionalidad) como palanca de conversión.

**2. Benchmark LATAM:**
- Inflación ARS 2025: +130% anual promedio. El precio en ARS debe ajustarse trimestralmente; el contrato dice "el precio puede variar según inflación" — el usuario lo acepta en ToU.
- Impuesto PAIS + percepción AFIP: cobro con tarjeta AR a servicio extranjero = 30% impuesto PAIS + 35% percepción AFIP = 65% de recargo. Alternativa: cobrar vía entidad AR (MercadoPago como razón social local) para evitar el recargo.
- Churn por cancelación: la familia no puede exportar el historial de gastos de los últimos 12 meses sin plan Familia. El historial completo es el "dato secuestrado" — suficientemente valioso para no cancelar.
- **Métrica priorizada:** LTV/CAC >3x al año 1 + conversión free→pago >5% al mes 6.

**3. Especificaciones (Reqs A–Z):**

*Inflación ARS — Ajuste sin perder margen:*
- Precios en la app almacenados en USD internamente: `plans.price_usd NUMERIC`. El precio en ARS se calcula en tiempo real: `price_usd * fx_rate_ars` donde `fx_rate_ars` se actualiza diariamente desde API de BCRA o Bluelytics (tipo oficial para compliance).
- Comunicación al usuario: el precio en ARS se muestra con nota "Precio actualizado al tipo de cambio del día". Sin shock de precio inesperado.
- Plan anual: el usuario paga en ARS el equivalente en USD al día de pago. Si el peso se devalúa 50% durante el año, el usuario "ganó" en términos reales — argumento de venta del plan anual.

*Impuesto PAIS — Estructura de cobro:*
- MercadoPago como procesador local: la razón social de FamilyHub factura desde Argentina. El usuario paga en pesos sin recargo PAIS. MercadoPago liquida a FamilyHub en USD o ARS según configuración.
- Apple IAP y Google Play: el usuario paga en USD (o ARS si su cuenta de store es AR). Las plataformas aplican sus propias conversiones — comunicar al usuario que el precio puede diferir según su configuración regional en las stores.
- Instrucción en ToU: "Los precios en ARS pueden ajustarse trimestralmente para mantener el valor en USD equivalente."

*"Amigos" en plan familiar — Anti-abuso:*
- El plan Familia está vinculado a un `family_group_id`, no a un usuario. Para agregar miembros adicionales al plan, el admin del grupo debe confirmar el parentesco (no verificado — honor system + política de ToU que permite terminación por abuso).
- Límite técnico: plan Familia permite máximo 10 miembros. Plan Premium: 20 miembros. No hay plan sin límite.
- Si se detectan más de 2 grupos familiares con el mismo email de admin → alerta de abuso → email automático de revisión.

*Feature "pegajosa" anti-cancelación:*
- Los datos que NO se pueden exportar en plan Free (pero sí se acceden): historial de gastos >3 meses, historial de documentos con vencimientos pasados, puntos de gamificación acumulados, y la Casa 3D en su estado actual.
- El plan Free da acceso de solo lectura al historial de los últimos 30 días. El resto está "en pausa" — visible pero bloqueado. El usuario sabe que sus datos están ahí.
- Al cancelar el plan Familia, el usuario recibe: "Tus datos de los últimos 12 meses quedarán en pausa. Podés volver a acceder a ellos en cualquier momento reactivando tu plan."

*Ads — Sin ads en ningún plan:*
- Política de no ads en todos los planes incluyendo Free. Razón: ads destruirían el diferenciador de privacidad. Monetización lateral sin ads: Fase 3 — insights anónimos agregados con opt-in explícito pagado por marcas (jamás datos individuales).
- Si en Fase 3 se considera algún patrocinio (ej: descuento en supermercado), debe ser: opt-in explícito, sin tracking de comportamiento individual, y comunicado como "partners de la comunidad FamilyHub" — no publicidad.

*Impuesto País — Compliance AFIP:*
- FamilyHub Argentina SAS (o sociedad a constituir): emisión de facturas electrónicas AFIP via API de Facturación Electrónica (AFIP SDK). Para suscripciones mensuales: factura B a consumidor final. Para B2B: factura A.
- Responsable inscripto en IVA — FamilyHub cobra 21% IVA incluido en el precio. El precio que ve el usuario es final (IVA incluido).
- MercadoPago liquida con retención de impuestos correspondiente. Reconciliación mensual automática.

*Micro-pagos — Boosts de puntos:*
- Decisión deliberada: NO vendemos boosts de puntos por dinero real. Razón: convierte la economía de gamificación en pay-to-win, destruyendo el mérito del sistema y la confianza entre miembros del grupo (el teen que "compra" puntos vs el que los gana).
- Alternativa: los padres pueden "donar" puntos al teen desde su cuenta — dentro del sistema cerrado, sin dinero real.

*Partnerships — Afiliados:*
- No en MVP ni Fase 2. Riesgo de privacidad demasiado alto para el posicionamiento del producto.
- Fase 3: partnerships solo con partners que NO reciben datos de usuario (ej: código de descuento fijo en supermercado por ser usuario Premium — sin tracking de compra).

*Volatilidad — Planes anuales:*
- El plan anual se cobra 100% al inicio en ARS al tipo de cambio del día. Sin ajustes durante el año.
- Riesgo para FamilyHub: si el peso se devalúa fuerte, el plan anual pierde valor en USD. Mitigación: los costos de infraestructura (Claude API, Supabase) se pagan en USD → necesitamos tener en caja equivalente a 6 meses de costos en USD al momento de cobrar cualquier plan anual.
- Fondo de reserva en USD: mínimo $5.000 USD antes de activar planes anuales.

*Reembolsos — Disolución familiar:*
- Política de reembolso prorrateo: si un admin cancela el plan antes del fin del período, reembolso automático de los días no usados via MercadoPago (prorrateado).
- En caso de disolución del grupo: cada miembro puede solicitar sus datos personales. El admin recibe reembolso de los días restantes + exportación completa.
- Sin reembolso si la cancelación es por violación de ToU (abuso del plan familiar con personas externas).

**4. Workload 4 Devs:**
- **Dev 1:** fx_rate_ars actualización diaria (BCRA API) + price_usd interno + facturación AFIP via API. (Sprint 5-6)
- **Dev 2:** MercadoPago checkout + webhooks + reconciliación + reembolso automático prorrateado. (Sprint 5)
- **Dev 3:** Apple IAP + Google Play Billing con validación server-side + UI de paywalls contextuales. (Sprint 5)
- **Dev 4:** Lógica de "datos en pausa" para usuarios Free + anti-abuso plan familiar + fondo de reserva USD tracking. (Sprint 6)

**5. Riesgo Fatal:** Si los costos de Claude API en USD crecen (Anthropic puede cambiar precios) mientras los ingresos en ARS se devalúan, el margen puede colapsar — calcular break-even en USD mensualmente y tener un modelo de throttling de IA (reducir tokens, usar Haiku para clasificaciones simples) como palanca de emergencia de costos.

---

## 6. Mercado y Competencia ⚠️ REESCRITA (parcial)

**1. Pitch:** El moat de FamilyHub no es tecnológico (cualquier equipo puede copiar el stack) — es la combinación de datos propietarios de la familia + el costo emocional de abandono (Casa 3D, historial, memoria) + localización LATAM nativa que los grandes players no harán por el tamaño de mercado.

**2. Benchmark LATAM:**
- Google Calendar: gratuito pero 0 contexto familiar, 0 gamificación, 0 finanzas, 0 documentos. El argumento no es "somos mejores que Google Calendar" — es "Google Calendar no resuelve el problema que nosotros resolvemos".
- Splitwise: 50M usuarios con red establecida. Rompemos su red con importación de datos: `POST /api/import/splitwise` → CSV export de Splitwise → mapeo automático a `expenses` table. El usuario trae su historial.
- WhatsApp Channels: Meta puede lanzar un "Familia Hub" mañana. Ventaja defensiva: datos cifrados E2E que nosotros no vemos (Meta sí ve todos sus datos). Privacidad real vs privacidad de marketing.
- **Métrica priorizada:** % de familias activas a los 6 meses (retención real vs adquisición inflada).

**3. Especificaciones (Reqs A–Z):**

*Importación de datos — Costo de cambio desde competidores:*
- `POST /api/import/splitwise`: parsea CSV de Splitwise → crea expenses con `source: 'splitwise_import'`. El usuario trae su historial de deudas.
- `POST /api/import/google_calendar`: OAuth con Google → importa eventos → crea tareas familiares con fecha.
- Importación de Google Contacts: sugerencias de miembros a invitar basadas en el historial de mensajes (solo con permiso explícito).

*Localización obligatoria — Jerga LATAM:*
- Términos hardcoded en español argentino: "vaquita" (no "colecta"), "cuotas" (no "installments"), "mercado" (no "supermercado"), "prepaga" (no "seguro médico"). El glosario de términos LATAM es parte del design system.
- Strings de UI almacenados en `i18n/es-AR.json` — no traducir automáticamente con Google Translate. Redacción humana por persona nativa.

*Bancos y billeteras digitales — Riesgo MercadoPago:*
- MercadoPago/Ualá pueden lanzar "vaquitas" en su app. Ventaja: nosotros tenemos el contexto familiar completo (tareas, fotos, hitos). Una vaquita en MercadoPago es solo una cuenta compartida — en FamilyHub es un proyecto familiar con historial emocional.
- Estrategia de integración, no competencia: ofrecer integración con MercadoPago para depositar directamente en la vaquita desde la billetera. Convertir al competidor potencial en partner de distribución.

*Brasil — Escalabilidad:*
- El modelo es portable a Brasil con cambios: `pt-BR` locale, PIX como método de pago (MercadoPago BR tiene PIX), `BRL` como currency, regulación LGPD en lugar de Ley 25.326.
- Barrera real: la jerga LATAM varía — "vaquita" en AR es "vaquinha" en BR, "asado" no existe. El diseño debe ser localizable por país, no hardcoded en `es-AR` para escalar.
- Decisión de arquitectura: `i18n/es-AR.json` + `i18n/pt-BR.json` desde Sprint 1, aunque pt-BR esté vacío. Evitar refactoring de strings hardcoded al escalar.

*Defensibilidad si Google copia:*
- Los datos históricos de la familia (3+ años de gastos, fotos, hitos, medicamentos) tienen un costo de migración emocional enorme.
- La Casa 3D con el historial de logros de la familia es el activo más difícil de replicar — no es el modelo 3D, es la historia de la familia codificada en el modelo.
- Open data policy: ofrecemos exportación completa siempre. "Si Google te ofrece algo mejor, te ayudamos a migrar." Esto convierte la retención en una decisión activa del usuario, no una trampa — y genera confianza que Google no puede comprar.

*Efecto red — Familias que invitan familias:*
- `referral_groups`: cuando una familia invita a otra (ej: "Los Martínez te invitan a FamilyHub"), ambas familias reciben 30 días de Plan Familia gratis.
- "Vaquita comunitaria": funcionalidad futura — dos familias pueden crear una vaquita compartida para un regalo grupal (ej: regalo de cumpleaños de la maestra entre 5 familias del grado). Efecto red entre familias.

**4. Workload 4 Devs:**
- **Dev 1:** `POST /api/import/splitwise` + Google Calendar OAuth import + i18n architecture desde Sprint 1. (Sprint 3)
- **Dev 2:** referral_groups schema + 30 días gratis automático por referido + tracking de conversión. (Sprint 6)
- **Dev 3:** Integración MercadoPago para depósito directo en vaquitas (partnership). (Fase 2)
- **Dev 4:** Análisis mensual de costo de infraestructura en USD vs ingresos en USD equivalente — dashboard interno para el equipo. (Sprint 2, ongoing)

**5. Riesgo Fatal:** Si Mercado Libre lanza "FamilyHub" con la base de datos de hábitos de compra de 100M de usuarios LATAM, el producto nativo gana. La única defensa es la privacidad real (E2E, zero-knowledge) vs la promesa de privacidad de un player con modelo de negocio publicitario.

---

## 7. Seguridad y Privacidad ⚠️ REESCRITA

**1. Pitch:** La seguridad de v1.0 tenía 4 vacíos críticos: (1) el OCR necesita ver el documento para procesarlo, contradiciendo el E2E, (2) un dev con acceso a Supabase puede leer chats no cifrados, (3) las fotos del feed tienen GPS embebido, (4) las API keys de Claude viven en texto plano en variables de entorno. Todos resueltos aquí.

**2. Benchmark LATAM:**
- Un dev de Supabase con acceso a la `service_role` key puede ejecutar `SELECT * FROM feed_posts` y leer todos los chats/fotos del feed. Sin cifrado de contenido del feed, la privacidad es marketing.
- EXIF GPS en fotos: cada foto subida al feed contiene coordenadas GPS en los metadatos EXIF — eliminar antes de upload es no-negociable para la privacidad de ubicación.
- MFA con TOTP en apps familiares destruye adopción (roberto no instala Google Authenticator). Solución: biometría local como segundo factor, disponible sin fricción.
- **Métrica priorizada:** 0 incidentes de datos. 0 logs que contengan PII innecesario.

**3. Especificaciones (Reqs A–Z):**

*E2E vs OCR — La contradicción resuelta:*
- El OCR (foto de ticket → datos del gasto) opera en dos modelos:
  1. **OCR en cliente (default)**: `expo-camera` captura → librería OCR local (`@react-native-ml-kit/text-recognition`) extrae texto en el dispositivo → solo los datos estructurados (monto, comercio, fecha) se envían al servidor. La foto nunca sale del dispositivo.
  2. **OCR en servidor (opt-in)**: si el OCR local falla (<60% de confianza en la extracción), se ofrece al usuario enviar la foto al servidor para procesamiento con Google Vision API. El usuario consiente explícitamente en ese momento. La foto se elimina del servidor en <60 segundos post-procesamiento.
- Documentos (DNI, seguros): cifrado AES-256-GCM en cliente antes de upload. El servidor nunca ve el contenido. La búsqueda por contenido se hace con un índice cifrado en cliente (`client-side search index` con `minisearch` sobre el contenido descifrado localmente).

*Fuga por dev con acceso a Supabase:*
- **Feed posts (fotos + texto):** cifrado simétrico con clave familiar compartida. La clave familiar se deriva del `family_group_id` + una passphrase configurada por el admin en el setup del grupo. La passphrase nunca sale del dispositivo de los miembros.
- Esto significa: ningún dev de FamilyHub puede leer el feed. Ni con acceso a la BD. El contenido es ilegible sin la passphrase del grupo.
- Trade-off documentado: si el admin pierde la passphrase, el contenido del feed no es recuperable. Backup de passphrase es responsabilidad del usuario (instruido en onboarding con alert explícito).
- **Chat familiar:** mismo cifrado. `feed_posts.content_encrypted BYTEA` — cifrado en cliente, almacenado como bytes, descifrado en cliente al mostrar.

*MFA — Biometría sin fricción:*
- MFA no es TOTP (destruye adopción). MFA = biometría local obligatoria para acciones sensibles:
  - Abrir módulo Finanzas: Face ID / Touch ID.
  - Abrir módulo Documentos: Face ID / Touch ID.
  - Revocar acceso de un miembro: Face ID / Touch ID + confirmación adicional.
  - Transferir super_admin: Face ID / Touch ID.
- La biometría está disponible en todos los dispositivos target (iOS 16+, Android 10+). No requiere configuración adicional del usuario si ya la tiene en el dispositivo.

*Zero-Knowledge — Prueba verificable:*
- Publicar en el sitio web de FamilyHub: política de Zero-Knowledge con descripción técnica del modelo de cifrado. "Nuestros servidores almacenan datos cifrados. La clave de descifrado vive solo en tus dispositivos. Esto es verificable revisando nuestro código."
- Open source parcial: el módulo de cifrado de cliente publicado en GitHub como biblioteca independiente. Cualquier auditor puede verificar que el cifrado ocurre en el cliente y que las claves no se transmiten.
- Auditoría de seguridad externa: antes del lanzamiento público, contratar auditoría con empresa especializada (ej: Cure53, Trail of Bits). Publicar el informe resumido (con hallazgos críticos resueltos antes de publicar).

*SQL Injection — Validación de inputs:*
- Supabase JS SDK usa queries parametrizadas por defecto — SQL injection imposible via el cliente oficial.
- Validación adicional en Edge Functions: `zod` para validación de schema de todos los inputs de APIs públicas. Si el input no pasa el schema → 400 con mensaje específico, sin stack trace expuesto.
- `input_sanitization`: todos los campos TEXT pasan por `DOMPurify` (versión node) antes de persistir en BD.

*API Key Management — Claude + Supabase:*
- Claude API key: almacenada en Supabase Vault (secrets management integrado en Supabase). Accesible solo desde Edge Functions — nunca en variables de entorno del cliente ni en el repositorio.
- `supabase.vault.secret('CLAUDE_API_KEY')` en Edge Function. Rotación trimestral de keys.
- Supabase anon key (la única que va al cliente): permisos mínimos — solo los necesarios para las queries autenticadas con RLS. La `service_role` key existe solo en el CI/CD de GitHub Actions (GitHub Secrets) y en las Edge Functions via Vault.
- `.env` nunca commiteado. `.gitignore` incluye `*.env` explícitamente. Verificado en CI con `git-secrets`.

*Logs — PII en Supabase:*
- Política de logs: Supabase logs se configuran para NO loguear el contenido de las queries (solo el hash de la query + latencia). `pg_audit` deshabilitado en producción para queries de contenido.
- `access_logs`: solo loguea `{user_id, action_type, resource_type, resource_id, timestamp}` — sin el contenido de la acción.
- Sentry: configurado con `beforeSend` hook para eliminar PII de los crash reports antes de enviar. Campos filtrados: `email`, `phone`, `family_name`, `location`, cualquier campo de `medical_profiles`.
- Retención de logs: 30 días en Supabase (por costo), 90 días en access_logs.

*Sesiones — Robo del móvil:*
- JWT expiry: 1h. Refresh token: 7 días.
- Si el dispositivo se marca como perdido (desde otro dispositivo del mismo usuario): `POST /api/auth/revoke-all-sessions` → invalida todos los JWT activos del usuario. Implementado con `Supabase Auth: signOut(scope: 'global')`.
- Biometría obligatoria al abrir la app después de 30 minutos de inactividad en background.
- No existe "Recordarme por 30 días" para módulos sensibles (Finanzas, Documentos, Historial Médico).

*Metadatos — GPS en fotos:*
- Toda foto procesada por `expo-image-manipulator` antes de upload: `ImageManipulator.manipulateAsync(uri, [], { compress: 0.8, format: 'webp' })` — este proceso elimina los metadatos EXIF incluyendo GPS por defecto en WebP.
- Verificación: test automático en CI — subir foto con GPS embebido → verificar que el archivo en Storage no contiene coordenadas GPS en EXIF.

*Biometría — Finanzas y Salud:*
- `expo-local-authentication.authenticateAsync()` requerido antes de renderizar: `<FinancesScreen>`, `<DocumentsScreen>`, `<MedicalProfileScreen>`. Si falla 3 veces → sesión cerrada, requiere re-login.
- En dispositivos sin biometría (algunos Android viejos): PIN de 6 dígitos configurado en el onboarding como fallback.

**4. Workload 4 Devs:**
- **Dev 1:** OCR local con ML Kit + cifrado de feed posts (AES-256 con clave familiar) + Supabase Vault para keys. (Sprint 2-3)
- **Dev 2:** Zero-Knowledge: módulo de cifrado open source + política pública + auditoría externa pre-launch. (Sprint 5-6)
- **Dev 3:** EXIF stripping en ImageManipulator + Sentry PII filter + logs policy (no PII en Supabase logs). (Sprint 2)
- **Dev 4:** Biometría en módulos sensibles + revoke-all-sessions + PIN fallback para dispositivos sin biometría. (Sprint 2-3)

**5. Riesgo Fatal:** El cifrado del feed (passphrase familiar) significa que si el admin pierde la passphrase, el contenido del feed es irrecuperable. Este trade-off debe ser comunicado con claridad extrema en el onboarding — sin consentimiento informado, es una trampa para el usuario.

---

## 8. Legal/Compliance ⚠️ REESCRITA

**1. Pitch:** v1.0 ignoró 5 riesgos legales críticos: jurisdicción cuando el server está en USA (Supabase sa-east-1 = Brasil, no USA — pero aplica el derecho brasileño a los datos), propiedad del UGC (fotos subidas al feed), modo testamento (datos de fallecidos), proceso automatizado de supresión AAIP, y explicación de los términos en 5 puntos humanos.

**2. Benchmark LATAM:**
- Supabase sa-east-1 está en São Paulo, Brasil — los datos físicamente residen en Brasil → aplica LGPD además de Ley 25.326 AR. Doble compliance necesario.
- ToU que nadie lee = ToU que no protege. El resumen de 5 puntos humanos en el onboarding tiene más valor legal real (consentimiento informado) que 50 páginas de texto legal que el usuario skipea.
- Fallecidos digitales: sin política de testamento digital, los datos de un fallecido quedan en un limbo legal — herencia no reconocida por las tiendas de apps, acceso bloqueado, pero datos no eliminados.
- **Métrica priorizada:** 0 intimaciones de AAIP en el primer año + 0 rechazos de stores por compliance.

**3. Especificaciones (Reqs A–Z):**

*Supresión automatizada (AAIP / Derecho al Olvido):*
- `DELETE /api/user/account`: endpoint público, disponible sin soporte humano. Efectos en cascada inmediatos:
  1. Soft delete en `profiles`: `deleted_at = NOW()`, `email = 'deleted_{id}@familyhub.deleted'`.
  2. Todos los posts del feed del usuario: `author_id` reemplazado por `[Usuario eliminado]`.
  3. Gastos: `paid_by` reemplazado por `[Miembro eliminado]` — los balances se conservan para los demás miembros.
  4. Documentos: eliminados del Storage (el cifrado E2E hace que sean ilegibles de todos modos).
  5. Fotos subidas: eliminadas del Storage. Referencias en feed reemplazadas por placeholder.
  6. Período de gracia: 30 días antes de eliminación definitiva. Durante ese período, el usuario puede cancelar.
- Confirmación por email antes de ejecutar. El proceso completa en <5 minutos. Confirmación final por email al usuario.
- Logs de supresión: `gdpr_deletion_log(user_id_hash TEXT, requested_at, completed_at, tables_affected TEXT[])` — sin PII, solo para auditoría.

*Tracking pasivo — Justificación ante Apple:*
- Apple ATT (App Tracking Transparency) aplica solo al tracking de usuarios ENTRE apps o sitios. FamilyHub trackea datos DENTRO de la app para el propio usuario — esto es "first-party data collection", excluido de ATT.
- Declaración en App Store Connect: en "Datos recolectados", declarar cada categoría honestamente. No declarar como "No recolectamos datos" — esto causa rechazo automático post-review.
- Categorías a declarar: Datos de uso (cómo usas la app), Diagnósticos (Sentry crash reports), Datos financieros (gastos del hogar), Datos de salud (medicamentos, historial médico), Datos de contacto (email/teléfono para auth).

*Disclaimer médico/legal — Responsabilidad por fallos en alertas:*
- Disclaimer en cada pantalla del módulo médico: "FamilyHub es una herramienta de organización. No reemplaza el consejo médico profesional. Los recordatorios de medicamentos son informativos. FamilyHub no es responsable por dosis omitidas o incorrectas."
- Para alertas de documentos: "Las alertas de vencimiento son estimativas basadas en las fechas que vos ingresaste. FamilyHub no verifica la validez de los documentos."
- Limitación de responsabilidad en ToU: responsabilidad máxima de FamilyHub = el monto pagado por el plan en los últimos 3 meses.

*Menores — COPPA + GDPR:*
- Menores de 13: cuentas de perfil gestionadas (no cuentas independientes). Sin email del menor, sin datos recolectados del menor directamente — todos los datos son ingresados por el adulto admin.
- Entre 13 y 17: cuenta propia, pero con consentimiento del tutor requerido en el onboarding (checkbox "Soy mayor de 18 o tengo autorización de un tutor" — honor system, documentado en ToU).
- Sin procesamiento de datos de menores para fines comerciales. Sin análisis de comportamiento individual de perfiles menores.

*5 Puntos Humanos — ToU simplificado:*
Mostrados en onboarding ANTES del checkbox de aceptación:
1. **Tus datos son tuyos**: nunca los vendemos ni los compartimos con terceros.
2. **Podés irte cuando quieras**: llevate todos tus datos en cualquier momento. Si cerramos, te avisamos 90 días antes.
3. **No te espiamos**: nuestros servidores almacenan datos cifrados que no podemos leer.
4. **Sos responsable de tus datos**: si perdés la contraseña del grupo, no podemos recuperar el contenido cifrado.
5. **Los precios pueden ajustarse**: te avisamos 30 días antes de cualquier cambio de precio con opción de cancelar sin costo.

*Jurisdicción — Server en Brasil (Supabase sa-east-1):*
- Datos físicamente en Brasil → aplica LGPD (Lei Geral de Proteção de Dados) para todos los usuarios, incluyendo argentinos.
- LGPD + Ley 25.326 tienen requisitos similares. Compliance con LGPD implica compliance con 25.326 en la mayoría de los puntos.
- Diferencia clave: LGPD tiene "Autoridade Nacional de Proteção de Dados" (ANPD) como organismo. Para AR: AAIP. Registrar en ambos.
- Para usuarios de Brasil (Fase 2): ToU específico con mención de LGPD y ANPD.

*Propiedad del UGC:*
- ToU: "Las fotos, textos y contenido que subís a FamilyHub son de tu propiedad. Nos otorgás una licencia no exclusiva para almacenar y mostrar ese contenido a los miembros de tu grupo familiar, y únicamente a ellos. No usamos tu contenido para ningún otro fin."
- Si el usuario elimina su cuenta: su contenido es eliminado del Storage. Las referencias en el feed de otros quedan como "[Contenido eliminado]".

*Portabilidad de datos — Formato:*
- `GET /api/family/:id/export`: JSON estructurado (datos en crudo) + PDF legible (resumen visual de gastos, hitos, documentos).
- El JSON sigue el schema interno de la BD — documentado en `docs/data-schema.md` (público).
- El PDF generado incluye: portada con nombre del hogar + fecha de exportación, secciones por módulo, totales financieros del período, lista de documentos registrados, historial de hitos del feed.

*Auditoría de compliance:*
- `compliance_audit_log`: registro de cada acción de supresión, exportación de datos, y cambio de consentimiento. Solo accesible para el admin y para auditorías formales.
- Reporte anual interno: revisar en Q1 que los disclaimers, ToU y políticas están actualizados con cambios legales del año anterior.

*Modo Testamento — Datos de fallecidos:*
- Cualquier miembro del grupo puede iniciar un "Proceso de Heredero Digital" si el admin original fallece:
  - Requiere: certificado de defunción (foto del documento) + identificación del heredero.
  - Proceso manual (no automatizado): el equipo de FamilyHub verifica y transfiere el super_admin a un nuevo miembro en <5 días hábiles.
  - Los datos del fallecido se conservan por 3 años adicionales post-transferencia, luego se eliminan automáticamente salvo instrucción contraria del heredero.
- `digital_heir_request(id, deceased_user_id UUID, requester_id UUID, death_certificate_url TEXT, status ENUM['pending','verified','rejected'], processed_at TIMESTAMPTZ)`.

**4. Workload 4 Devs:**
- **Dev 1:** DELETE /api/user/account con cascada completa + gdpr_deletion_log + digital_heir_request schema. (Sprint 3)
- **Dev 2:** GET /api/family/:id/export (JSON + PDF via react-pdf) + compliance_audit_log. (Sprint 4)
- **Dev 3:** App Store Connect metadata (declaración honesta de datos) + Privacy Nutrition Label + justificación Critical Alerts. (Sprint 14)
- **Dev 4:** 5 puntos humanos en onboarding UI + disclaimer médico en cada pantalla del módulo médico. (Sprint 3)

**5. Riesgo Fatal:** Si el "Proceso de Heredero Digital" no existe y un adulto mayor fallece con el super_admin del grupo, la familia pierde acceso al historial médico de emergencia de otros miembros, las fotos del feed, y los documentos — escenario con consecuencias legales y emocionales devastadoras.

---

## 9. UX/UI (Onboarding, Accesibilidad Extrema) ⚠️ REESCRITA

**1. Pitch:** v1.0 ignoró 6 problemas de UX críticos: design tokens compartidos entre perfiles sin duplicar código, estados vacíos en el segundo 1 de instalación, skeleton screens para latencia, diferenciación visual de alertas críticas vs info, modo offline con feedback de sincronización pendiente, y error states amigables sin internet.

**2. Benchmark LATAM:**
- 3G es el standard de conectividad en transporte público LATAM — el módulo de lista de compras en el supermercado DEBE funcionar offline con sincronización posterior. Sin feedback de "guardando localmente", el usuario cree que perdió datos.
- Empty state en segundo 1: si la pantalla de Feed está vacía, el usuario asume que la app está rota. El empty state debe ser una invitación activa, no un void.
- Skeleton screens: si el feed tarda >300ms en cargar → mostrar skeleton. Si tarda >3s → mostrar mensaje + retry. Nunca spinner infinito.
- **Métrica priorizada:** % de usuarios que completan el onboarding en <5 minutos (la única métrica que predice retención D7 con >80% de correlación).

**3. Especificaciones (Reqs A–Z):**

*Design Tokens — Un sistema, múltiples perfiles:*
```javascript
// tokens/index.ts — Sistema único, no duplicado
const tokens = {
  colors: {
    primary: { ceo: '#7c6af7', teen: '#f472b6', elder: '#3ecf8e', child: '#fbbf24' },
    background: { light: '#ffffff', dark: '#0f0f0f' },
    surface: { light: '#f9fafb', dark: '#1a1a1a' },
    text: { primary: { light: '#111827', dark: '#f9fafb' } },
    semantic: { critical: '#DC2626', important: '#F97316', info: '#6B7280', success: '#10b981' }
  },
  typography: {
    sizes: { elder: 24, ceo: 16, teen: 15, child: 20 },
    weights: { regular: '400', medium: '500', bold: '700' }
  },
  spacing: { base: 4, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 },
  touchTarget: { elder: 80, standard: 44 } // pt mínimos
}
```
- El perfil UI cambia `tokens.colors.primary` y `tokens.typography.sizes` — el mismo componente renderiza diferente para cada perfil sin código duplicado.
- `useTheme()` hook retorna los tokens según `ui_profile` del usuario activo. Un solo componente `<Button>` renderiza diferente para Roberto (80x80pt, texto grande) y Tomás (44x44pt, texto normal).

*Modo Offline — Feedback de sincronización:*
- `@react-native-community/netinfo` detecta estado de red en tiempo real.
- Cuando offline: banner persistente en la parte superior "Sin conexión · Los cambios se guardarán al reconectar" (color amarillo neutro, no rojo alarmante).
- Acciones offline permitidas: lista de compras (queue local), gastos (queue local), mood log. Acciones bloqueadas offline: subir fotos, consultar IA, SOS (con mensaje explicativo).
- `offline_queue(id, action_type TEXT, payload JSONB, created_at TIMESTAMPTZ, synced_at TIMESTAMPTZ)` — tabla local (AsyncStorage) que se vacía al reconectar.
- Al reconectar: banner verde "Conexión restaurada · Sincronizando 3 cambios..." → "Todo sincronizado ✓".

*Empty States — Segundo 1 de instalación:*
- Feed vacío: "Tu espacio familiar privado te espera. Publicá la primera foto o invitá a un familiar para empezar." + CTA: "Invitar ahora" + "Publicar foto".
- Finanzas vacía: "Registrá tu primer gasto — foto del ticket es suficiente" + demo interactiva (GIF de 3 segundos mostrando el flujo).
- Lista de compras vacía: "¿Qué compramos esta semana? Escribí el primero." + campo de texto con focus automático.
- Documentos vacíos: "Tu cajón digital seguro. Empezá con el DNI de cada miembro." + CTA.
- Ningún empty state muestra solo texto — todos tienen una ilustración simple SVG + 1 CTA directo.

*Alertas — Críticas vs Info (Jerarquía Visual):*
- Sistema de 4 niveles con diferenciación cromática + icónica + háptica:
  - `CRITICAL`: fondo rojo `#DC2626`, icono 🚨, haptic `Heavy`, sonido crítico. Ejemplo: SOS, medicamento sin confirmar 30min.
  - `URGENT`: fondo naranja `#F97316`, icono ⚠️, haptic `Medium`, sin sonido. Ejemplo: documento vence en 24h.
  - `IMPORTANT`: borde izquierdo naranja, sin fondo de color, sin haptic. Ejemplo: documento vence en 7 días.
  - `INFO`: gris neutro, sin icono de alerta, sin haptic. Ejemplo: nueva publicación en feed.
- El Notification Center de la app agrupa por nivel — las CRITICAL siempre arriba, sin mezclarse con INFO.

*Haptic Feedback — Sistema completo:*
```javascript
const HapticPatterns = {
  taskComplete: () => Haptics.impactAsync(ImpactFeedbackStyle.Light),
  streakAchieved: () => Haptics.impactAsync(ImpactFeedbackStyle.Heavy),
  medicationAlert: () => Haptics.notificationAsync(NotificationFeedbackType.Warning),
  sosActivated: () => Haptics.notificationAsync(NotificationFeedbackType.Error), // vibración de emergencia
  paymentSuccess: () => Haptics.notificationAsync(NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(NotificationFeedbackType.Error),
  tabSwitch: () => Haptics.selectionAsync(), // suave, no intrusivo
}
```

*Skeleton Screens — Latencia:*
- Regla: >300ms de carga → mostrar skeleton. >3s → mensaje + retry button.
- Skeleton del Feed: 3 cards de altura variable con animación de shimmer (`react-native-skeleton-placeholder` o implementación custom con Reanimated).
- Skeleton de Finanzas: 2 barras de resumen + 5 items de lista.
- Nunca `ActivityIndicator` (spinner) solo — siempre skeleton que muestra la forma del contenido que está cargando.

*Dark Mode — Design tokens, no inversión de color:*
- Dark mode implementado con tokens semánticos, NO con `filter: invert(1)`. La inversión de color rompe fotos e ilustraciones.
- Cada color tiene su versión light y dark explícita en los tokens. Los componentes usan siempre el token semántico, nunca el valor hex directamente.
- `useColorScheme()` de React Native determina el tema. El teen tiene dark mode forzado independientemente del sistema.

*Micro-interacciones — La tarea "se siente" como premio:*
- Al marcar tarea como completada: (1) Animación de tachado con `Reanimated.withTiming` (200ms), (2) Puntos flotando hacia arriba con `withSpring` + `withDelay`, (3) Haptic `Light`, (4) Sound corto (toggle activable por el usuario), (5) La card se reduce a la mitad con `withSpring` y desaparece.
- Todo el flujo en <500ms. Si algún step tarda más (por red lenta), los steps visuales/hápticos ocurren inmediatamente con confirmación optimista — la red actualiza en background.

*Error States — Sin internet en el supermercado:*
- Lista de compras offline: funciona completamente sin internet (AsyncStorage local). El banner "Sin conexión" aparece pero la lista es completamente funcional.
- Error de carga del Feed: "No pudimos cargar el feed. ¿Tenés conexión?" + botón "Reintentar" + botón "Ver en caché" (muestra la última versión guardada localmente).
- Error de consulta IA: "El asistente no está disponible ahora. Podés escribirme cuando vuelvas a tener conexión." — no bloquea ninguna otra funcionalidad.

**4. Workload 4 Devs:**
- **Dev 1:** Design token system (tokens/index.ts) + useTheme() hook + offline_queue schema (AsyncStorage). (Sprint 1-2)
- **Dev 2:** Skeleton screens para Feed + Finanzas + offline banner + sync feedback. (Sprint 2-3)
- **Dev 3:** Empty states (SVG + CTA) para todos los módulos + error states friendly. (Sprint 2)
- **Dev 4:** Haptic system completo + micro-interacción de tarea completada + dark mode tokens. (Sprint 3)

**5. Riesgo Fatal:** Si la lista de compras no funciona offline en el supermercado (el caso de uso más frecuente de toda la app), el producto falla en su momento de máxima necesidad y el usuario lo desinstala en el acto — el modo offline en shopping_items no es opcional, es el test de fuego del MVP.

---

## 10. Arquitectura BD (Supabase, Edge Functions, Schema Base) ⚠️ REESCRITA

**1. Pitch:** v1.0 tenía vacíos críticos de arquitectura: sin lógica de conflictos para edición concurrente, sin soft deletes para recuperación, sin indexes explícitos, sin caching strategy, y sin plan de escalabilidad para 10.000 familias en el plan free de Supabase. Todo resuelto aquí con especificaciones concretas.

**2. Benchmark LATAM:**
- Supabase Free: 500MB BD, 1GB Storage, 50.000 Edge Function invocations/mes. Con 100 familias activas en free → $0 de infra. Con 1.000 familias → necesita Supabase Pro ($25/mes). El modelo de crecimiento es predecible.
- Conflictos de edición concurrente: 4 personas editando la lista de compras simultáneamente → sin control de conflictos → última escritura gana → ítems se pierden. Solución: `updated_at + version counter`.
- Migrations en equipo de 4: sin convención de nombres + revisión obligatoria → una migración rota baja producción para todos los usuarios. Proceso no negociable.
- **Métrica priorizada:** p95 latency de queries críticas <200ms desde Buenos Aires.

**3. Especificaciones (Reqs A–Z):**

*Conflictos de edición concurrente:*
```sql
-- shopping_items con control de versión
ALTER TABLE shopping_items ADD COLUMN version INT DEFAULT 1;
ALTER TABLE shopping_items ADD COLUMN client_timestamp TIMESTAMPTZ;

-- Update con optimistic locking
UPDATE shopping_items 
SET completed = true, 
    completed_by = auth.uid(),
    version = version + 1,
    updated_at = NOW(),
    client_timestamp = $1
WHERE id = $2 AND version = $3; -- si version no coincide → conflict
-- Si 0 rows affected → conflict → cliente reintenta con la versión actual
```
- El cliente maneja el conflicto: al recibir 0 rows affected → fetch del estado actual → muestra diferencia al usuario → el usuario decide.
- Para lista de compras: conflicto de "ambos marcaron el mismo ítem" → idempotente (ambas escrituras generan el mismo resultado: completed = true). Sin conflicto real.

*Escalabilidad — Plan Free con 1.000 familias:*
- Supabase Free aguanta ~100 familias activas con uso normal. A partir de 200 familias activas → migrar a Pro ($25/mes).
- Projection: 1.000 familias en staging → Supabase Pro ($25) + pgBouncer (connection pooling incluido en Pro). 10.000 familias → Supabase Team ($599/mes) o self-hosted.
- `family_groups` table: `last_active_at TIMESTAMPTZ` — índice para queries de churn. Familias inactivas >60 días → archivadas (datos conservados, no incluidas en métricas de active families).

*Migrations — Proceso de 4 devs:*
```bash
# Convención de nombres obligatoria:
# YYYYMMDD_HHMMSS_descripcion_del_cambio.sql
# Ejemplo: 20260115_143000_add_vacation_mode_to_family_members.sql

# Proceso:
# 1. Dev crea migration en /supabase/migrations/
# 2. PR con migration + código que la usa (nunca separados)
# 3. Review obligatorio de otro dev (foco en RLS y rollback)
# 4. CI ejecuta migration en supabase staging antes de merge
# 5. Deploy a prod solo en horario bajo (23:00-03:00 ART)

# Rollback plan obligatorio en el PR:
# -- ROLLBACK:
# ALTER TABLE family_members DROP COLUMN vacation_mode_until;
```
- Regla: ninguna migration se mergea sin su ROLLBACK documentado en el mismo archivo.
- Feature flags: features que dependen de una nueva columna usan `feature_flags` table para activarse solo cuando la migration está en prod.

*Caching — Zustand vs Server:*
```javascript
// Zustand persistido (AsyncStorage): datos que cambian poco
const authStore = create(persist({
  user: null,
  family_group: null, // nombre, foto, plan
  ui_profile: 'ceo',
  // TTL: 24h - refrescar en cada app open
}))

// Zustand en memoria (no persistido): datos que cambian frecuentemente
const expensesStore = create({
  current_month_expenses: [],
  balance_cache: {}, // invalidar en cada nueva expense
  // TTL: 5 minutos - refrescar si last_fetch > 5min
})

// Server (Supabase Realtime): datos en tiempo real
// shopping_items, feed_posts (nuevos), notifications
// No cachear en Zustand — suscripción directa al canal Realtime
```

*Denormalización — Integridad vs velocidad:*
- `family_members.total_points INT`: columna denormalizada del total de puntos. Se actualiza en trigger post-insert en `points_log`. Evita `SUM(delta)` en cada render del dashboard.
- `family_groups.monthly_expenses_total NUMERIC`: denormalizado, actualizado en trigger post-insert en `expenses`. Evita `SUM(amount)` en tiempo real.
- Trade-off documentado: si un trigger falla, la columna denormalizada queda desincronizada. Job de reconciliación: Edge Function cron diaria que verifica consistency entre `points_log` y `family_members.total_points`.

*Soft Deletes:*
```sql
-- Todas las tablas con contenido de usuario
ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE feed_posts ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- View que oculta soft-deleted por defecto
CREATE VIEW active_expenses AS SELECT * FROM expenses WHERE deleted_at IS NULL;

-- RLS sobre la view, no sobre la tabla base
-- Recuperación: PATCH /api/expenses/:id/restore — solo para admin, solo en los últimos 30 días
```
- Purge automático: job semanal elimina definitivamente registros con `deleted_at > 30 días`.

*Webhooks — IA terminó el OCR:*
- Edge Function de OCR: procesa la foto → al terminar → `INSERT INTO ocr_results(expense_id, extracted_data, confidence, processed_at)` → Supabase Realtime trigger al cliente.
- El cliente escucha: `supabase.channel('ocr:${userId}').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ocr_results' }, callback)`.
- Sin polling. El cliente recibe el resultado cuando está listo. Timeout de 30s: si no llega resultado → el cliente muestra campos vacíos editables.

*Rate Limiting — Auth brute force:*
- Supabase Auth tiene rate limiting nativo: 5 intentos de login fallidos → bloqueo temporal de 5 minutos (configurable en Supabase dashboard).
- Para Edge Functions públicas: `upstash/ratelimit` — 10 requests/minuto por IP para endpoints de invitación y auth.
- Magic Link: 1 link por email cada 5 minutos (evita flooding de emails de recovery del elder).

*Indexes — Columnas críticas:*
```sql
-- B-Tree indexes para búsquedas frecuentes
CREATE INDEX idx_expenses_family_group ON expenses(family_group_id, created_at DESC);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by, family_group_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to, status, due_date);
CREATE INDEX idx_documents_expires ON documents(family_group_id, expires_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_family_members_user ON family_members(user_id) WHERE active = true;
CREATE INDEX idx_feed_posts_family ON feed_posts(family_group_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_medications_user ON medications(user_id, family_group_id);

-- GIN index para búsqueda full-text en documents
CREATE INDEX idx_documents_search ON documents USING gin(to_tsvector('spanish', document_name));
```

*Edge Functions — Lógica sacada del cliente:*
- Nunca en el cliente: validación de permisos de plan (puede ser manipulada), cálculo de balance de deudas (puede ser manipulado), distribución de puntos (puede ser manipulada), llamadas a Claude API (expone API key), procesamiento de pagos.
- En el cliente: UI state, optimistic updates, validación de formato de inputs, caching local.

**4. Workload 4 Devs:**
- **Dev 1:** Migrations convention + soft deletes en todas las tablas + B-Tree indexes + reconciliation job. (Sprint 1-2)
- **Dev 2:** Optimistic locking en shopping_items + Zustand caching strategy + offline_queue. (Sprint 2)
- **Dev 3:** Denormalized columns con triggers + Realtime webhook para OCR results. (Sprint 3)
- **Dev 4:** Rate limiting en Edge Functions (upstash) + Supabase Auth rate limiting config + scalability projection dashboard. (Sprint 2)

**5. Riesgo Fatal:** Sin el índice `idx_expenses_family_group`, la query de balance mensual hace full table scan sobre expenses — con 10.000 familias y 50 gastos/mes cada una = 500.000 rows sin índice → query de 3-5 segundos → UX destruida. Los índices son obligatorios desde el Sprint 1, no una optimización posterior.

---

## 11. Testing y QA ⚠️ REESCRITA

**1. Pitch:** v1.0 no cubría edge cases críticos: familias de 20 miembros, familias de 0 hijos, simulación de IA sin gastar créditos, stress test de 4 personas editando la lista simultáneamente, ni el proceso de feedback con el usuario senior de 72 años. Todos cubiertos aquí con especificaciones ejecutables.

**2. Benchmark LATAM:**
- iPhone SE (2020) con iOS 16: el dispositivo más bajo de nuestro target iOS. 3GB RAM, pantalla 4.7". Los tests de performance deben ejecutarse en este device, no en el iPhone 14 del dev.
- Samsung Galaxy A54: el dispositivo Android de referencia LATAM NSE C1-C2. Snapdragon 778G, 6GB RAM. Si funciona bien aquí, funciona bien en el 80% de los Android del mercado objetivo.
- Feedback con Roberto (72 años): no puede hacer una entrevista de Zoom por sí solo. El método es "Pensando en voz alta" en su casa, con familiar presente.
- **Métrica priorizada:** Smoke test pass rate 100% antes de cada release. Zero regresiones en flujos críticos.

**3. Especificaciones (Reqs A–Z):**

*Edge Cases — Familias extremas:*
```javascript
// Test: familia de 20 miembros
describe('FamilyGroup edge cases', () => {
  it('handles 20 members in same group', async () => {
    const family = await createTestFamily({ memberCount: 20 });
    const expenses = await generateExpenses(family.id, { count: 100 });
    const balance = await calculateBalance(family.id);
    expect(balance).toBeDefined();
    expect(balance.debts).toHaveLength(20 * 19 / 2); // max pairs
  });
  
  it('handles family with 0 children (adults only)', async () => {
    const family = await createTestFamily({ roles: ['admin', 'adult', 'adult'] });
    // Gamificación no debe romperse sin perfil 'child'
    expect(() => renderGamificationDashboard(family)).not.toThrow();
  });
  
  it('handles single-member family', async () => {
    const family = await createTestFamily({ memberCount: 1 });
    // Balance siempre 0 con 1 solo miembro
    const balance = await calculateBalance(family.id);
    expect(balance.totalDebt).toBe(0);
  });
});
```

*Simulación de IA — Sin gastar créditos:*
```javascript
// Mock de Claude API para tests
jest.mock('../services/claude', () => ({
  generateFamilyInsight: jest.fn().mockResolvedValue({
    type: 'weekly_summary',
    content: 'Esta semana completaron 7 tareas. Gasto total: $45.000 ARS.',
    tokens_used: 0 // mock - no gasta créditos reales
  }),
  extractOCRData: jest.fn().mockResolvedValue({
    amount: 1500,
    merchant: 'Carrefour',
    date: '2026-01-15',
    confidence: 0.92
  })
}));

// En CI: CLAUDE_API_KEY='mock' → el mock se activa automáticamente
// En staging con familias reales: CLAUDE_API_KEY=real → API real con budget cap de $10/mes en staging
```

*Beta con Roberto — Método de feedback senior:*
- Sesión de "Pensando en Voz Alta" en su domicilio. Duración máxima: 30 minutos (fatiga cognitiva).
- El dev observa, no interviene (solo habla si Roberto se bloquea >2 minutos).
- Tarea específica: "Roberto, el médico te cambió la pastilla. ¿Podés actualizar tu lista de medicamentos en la app?"
- Métricas: tiempo hasta completar la tarea, número de errores, número de veces que preguntó ayuda.
- Criterio de éxito: Roberto completa la tarea en <3 minutos sin ayuda externa.
- Reclutamiento: 3 personas de 65-75 años de Zona Oeste GBA (conocidos del equipo inicialmente — no extraños).

*Performance — Tiempo máximo de carga del Feed:*
- Target: Feed con 50 posts carga en <1.5s en iPhone SE con 3G simulado (throttling en Chrome DevTools / network simulation).
- Test automatizado con Maestro:
```yaml
# .maestro/performance/feed_load.yaml
- launchApp
- assertVisible: "Feed"
- startTimer
- tapOn: "Feed"
- waitForAnimationToEnd
- stopTimer: feedLoadTime
- assertTrue: ${feedLoadTime < 1500} # ms
```
- Si el test falla → no se puede hacer release hasta optimizar.

*Stress Test — 4 personas editando la lista simultáneamente:*
```javascript
// Integration test con 4 clientes Supabase simultáneos
it('handles 4 concurrent shopping list updates', async () => {
  const family = await createTestFamily({ memberCount: 4 });
  const item = await addShoppingItem(family.id, 'Leche');
  
  // 4 clientes intentan marcar el mismo ítem simultáneamente
  const results = await Promise.all([
    markItemComplete(item.id, family.members[0].id),
    markItemComplete(item.id, family.members[1].id),
    markItemComplete(item.id, family.members[2].id),
    markItemComplete(item.id, family.members[3].id),
  ]);
  
  // Solo 1 debe ganar, los demás deben recibir el estado actualizado
  const finalItem = await getShoppingItem(item.id);
  expect(finalItem.completed).toBe(true);
  expect(finalItem.version).toBe(2); // incrementado exactamente 1 vez
});
```

*Auditoría — Seguridad de librerías de terceros:*
- `npm audit` ejecutado en CI en cada PR — cualquier vulnerabilidad `high` o `critical` bloquea el merge.
- `dependabot` habilitado en GitHub para actualizaciones automáticas de dependencias.
- Revisión manual trimestral de librerías con acceso a datos sensibles: `@supabase/supabase-js`, `expo-local-authentication`, `expo-camera`.

*Regresión — iPhone SE vs S24 Ultra:*
- Matrix de dispositivos en EAS Build: `{ ios: ['iPhone SE 3ra gen (iOS 16)', 'iPhone 15 Pro (iOS 17)'], android: ['Samsung A54 (Android 13)', 'Samsung S24 (Android 14)'] }`.
- Test de regresión visual: screenshots automáticos de todas las pantallas en todos los dispositivos después de cada build. Diff visual si algún elemento cambia de posición.

*CI/CD — Bug no tira la app:*
```yaml
# .github/workflows/ci.yml
- name: Unit Tests
  run: jest --coverage --ci
- name: Coverage Gate
  run: jest --coverage --coverageThreshold='{"global":{"lines":80}}'
- name: Integration Tests (Supabase local)
  run: supabase start && jest --config jest.integration.config.js
- name: Build Check
  run: eas build --platform all --profile preview --non-interactive
- name: E2E Tests
  run: maestro test .maestro/smoke/
```
- Si cualquier step falla → PR bloqueado. Merge a `main` requiere todos los checks verdes.

*Shadow DOM — Performance en listas largas:*
- `FlashList` (Shopify) en lugar de `FlatList` para listas de gastos y feed. FlashList recicla cells nativas — 10x mejor performance en listas largas.
- Virtualización: solo renderizar 20 items visibles + 10 pre-renderizados arriba y abajo.
- Test de performance: lista de 500 gastos en iPhone SE → scroll debe mantener 60fps. Medido con `react-native-performance` + Flipper.

*5 Smoke Tests — No pueden fallar antes de subir:*
1. El usuario puede registrarse, crear un grupo y llegar al Feed en <2 minutos.
2. El usuario puede registrar un gasto con foto de ticket y ver el balance actualizado.
3. El usuario puede marcar un ítem de la lista de compras como completado y el cambio aparece en el dispositivo de otro miembro en <2 segundos.
4. El botón SOS envía notificación a todos los miembros del grupo en <5 segundos.
5. El usuario puede subir un documento y ver la alerta de vencimiento configurada correctamente.

**4. Workload 4 Devs:**
- **Dev 1:** Concurrent stress test + edge cases (20 miembros, 0 hijos, 1 solo miembro) + smoke tests automatizados. (Sprint 4, ongoing)
- **Dev 2:** Claude API mock para CI + staging budget cap + npm audit en CI + dependabot setup. (Sprint 1)
- **Dev 3:** Performance test Feed en iPhone SE + FlashList migration + FPS monitoring. (Sprint 4)
- **Dev 4:** Beta feedback protocol para Roberto + device matrix en EAS Build + visual regression. (Sprint 9)

**5. Riesgo Fatal:** Si los smoke tests no están automatizados en CI, un dev puede mergear un cambio que rompe el flujo de registro o el botón SOS sin que nadie lo detecte hasta que un usuario lo reporta en producción — los 5 smoke tests son el mínimo de seguridad no negociable.

---

## 12. MVP Core (Auth, Finanzas, Alertas Docs) ⚠️ REESCRITA

**1. Pitch:** v1.0 ignoró 6 problemas operativos del MVP: Magic Links para no-técnicos, conversión blue/oficial en gastos, manejo de notificaciones rechazadas por el usuario, compresión progresiva de imágenes, deep linking desde WhatsApp a gastos específicos, y shortcuts de icono (long press).

**2. Benchmark LATAM:**
- Tipo de cambio blue: 40-60% de diferencia vs oficial en AR (2025). Sin soporte dual de cambio, el módulo financiero es inútil para las transacciones reales de las familias argentinas.
- Rechazo de notificaciones: iOS requiere permiso explícito; 30-40% de usuarios lo rechaza en el primer prompt. Sin estrategia de contexto-first, perdemos el canal de alertas de documentos — el killer feature del MVP.
- Magic Links: el 60% de los adultos mayores y el 30% de adultos no-técnicos no recuerdan contraseñas. Sin passwordless, la adopción del perfil elder es imposible.
- **Métrica priorizada:** % de usuarios que reciben y aceptan permisos de notificación en contexto (target >70% vs 30-40% en prompt frío).

**3. Especificaciones (Reqs A–Z):**

*Auth — Magic Links:*
- `POST /api/auth/magic-link?channel=whatsapp|sms|email`: genera OTP de 6 dígitos + link de un solo uso (expiración 15 minutos). Envía por el canal seleccionado.
- Para el elder: el familiar configura el número de WhatsApp del elder → el elder solo toca el link que llega → ingresa a la app sin contraseña. Renovación automática cada sesión expirada.
- Para usuarios estándar: email magic link disponible como alternativa a contraseña. Sin TOTP, sin Google Authenticator.
- `magic_link_requests(id, user_id UUID, channel TEXT, otp_hash TEXT, expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ)`.

*Finanzas — Conversión ARS Blue/Oficial:*
```javascript
// Currency selector en el registro de gasto
const CurrencyField = () => {
  const [currency, setCurrency] = useState('ARS');
  const [exchangeType, setExchangeType] = useState('oficial'); // 'oficial' | 'blue'
  
  // fx_rates actualizadas diariamente desde Bluelytics API
  // fx_rates(date DATE, ars_oficial NUMERIC, ars_blue NUMERIC, usd_ccl NUMERIC)
  
  return (
    <>
      <CurrencyPicker value={currency} options={['ARS', 'USD', 'USDT']} />
      {currency === 'USD' && (
        <ExchangeTypePicker 
          value={exchangeType}
          options={[
            { value: 'oficial', label: `Oficial ($${fx.ars_oficial}/USD)` },
            { value: 'blue', label: `Blue ($${fx.ars_blue}/USD)` },
          ]}
        />
      )}
    </>
  );
};

// Todos los gastos se normalizan a ARS en la BD para el cálculo de balance
// expenses.amount_ars = amount * fx_rate_at_time
// expenses.original_amount + expenses.original_currency conservados para referencia
```

*Alertas — Modo "No Molestar":*
- iOS: `expo-notifications` con `critical: true` bypasa No Molestar. Solo para SOS y medicamentos urgentes. Requiere Critical Alerts entitlement.
- Para alertas de documentos (no críticas): si el dispositivo está en No Molestar → la notificación se entrega silenciosamente (aparece en el centro de notificaciones pero sin sonido ni banner). El usuario la ve al desbloquear.
- Sin Critical Alerts para documentos — una alerta de "DNI vence en 30 días" que bypasa No Molestar a las 23:00 destruye la UX.

*Permisos de notificaciones — Contexto-first:*
- Estrategia: NO pedir permiso de notificaciones en el onboarding (tasa de rechazo 40-60% en prompt frío).
- Pedir en el momento de máxima motivación: cuando el usuario configura el módulo de Medicamentos → "Para que Roberto no se pierda ninguna dosis, necesitamos permiso para enviar alertas. ¿Activamos?" — tasa de aceptación estimada >75%.
- Si el usuario rechaza en contexto → fallback: notificaciones in-app (banner dentro de la app) + email de resumen diario.
- `notification_consent(user_id, push_granted BOOLEAN, push_requested_at TIMESTAMPTZ, context TEXT)` — para analizar en qué contexto la aceptación es mayor.

*Compresión de imágenes — Anti-llenado de storage:*
```javascript
const compressImage = async (uri: string): Promise<string> => {
  // Paso 1: Resize si es mayor a 1920px en cualquier dimensión
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1920 } }],
    { compress: 1, format: 'jpeg' }
  );
  
  // Paso 2: Comprimir a WebP con calidad 80%
  const compressed = await ImageManipulator.manipulateAsync(
    resized.uri,
    [],
    { compress: 0.8, format: 'webp' }
  );
  
  // Paso 3: Si aún >2MB → comprimir más agresivo (0.6)
  const fileSize = await getFileSize(compressed.uri);
  if (fileSize > 2 * 1024 * 1024) {
    return (await ImageManipulator.manipulateAsync(
      compressed.uri, [], { compress: 0.6, format: 'webp' }
    )).uri;
  }
  
  return compressed.uri;
  // Resultado típico: foto de 8MB → 300-600KB
};
```
- Quotas por plan enforceadas en la Edge Function de upload, no en el cliente.
- Videos: `expo-video-thumbnails` para miniatura + `expo-av` para reproducción. Videos >50MB rechazados con mensaje claro.

*Calculadora — Flotante:*
- Calculadora básica como componente flotante (`react-native-draggable`) accesible desde el módulo de Finanzas con 1 tap. No abre modal — se superpone a la pantalla actual.
- Resultado de la calculadora pre-carga el campo de monto del gasto con 1 tap en el resultado.

*Shortcuts — Long Press del ícono:*
```javascript
// app.json / app.config.js
{
  "ios": {
    "infoPlist": {
      "UIApplicationShortcutItems": [
        { "UIApplicationShortcutItemType": "add_expense", "UIApplicationShortcutItemTitle": "Registrar Gasto", "UIApplicationShortcutItemIconType": "UIApplicationShortcutIconTypeCapturePhoto" },
        { "UIApplicationShortcutItemType": "shopping_list", "UIApplicationShortcutItemTitle": "Lista de Compras", "UIApplicationShortcutItemIconType": "UIApplicationShortcutIconTypeCompose" },
        { "UIApplicationShortcutItemType": "sos", "UIApplicationShortcutItemTitle": "SOS", "UIApplicationShortcutItemIconType": "UIApplicationShortcutIconTypeProhibit" }
      ]
    }
  },
  "android": {
    "shortcuts": [/* mismo contenido para Android */]
  }
}
```

*Deep Links — WhatsApp a gasto específico:*
- URL scheme: `familyhub://expenses/{id}` — abre directamente el detalle del gasto.
- Universal Links (iOS) / App Links (Android): `https://familyhub.app/share/expense/{id}` — funciona desde WhatsApp incluso si la app no está instalada (redirige a la store).
- Sharing desde la app: botón "Compartir por WhatsApp" genera mensaje pre-formateado: "Te comparto el gasto de $1.500 en Carrefour del 15/01. Abrí el detalle: https://familyhub.app/share/expense/abc123"

*QR — Invitaciones:*
- `expo-barcode-scanner` para escanear QR de invitación.
- El QR de invitación contiene un deep link: `familyhub://join/{invite_code}`. Escanear = join automático al grupo.
- QR de Historial Médico: contiene `familyhub://medical/{user_id}?token={signed_token}` — signed token de 24h de validez, acceso de solo lectura al perfil médico sin autenticación (para uso en emergencias por médicos).

**4. Workload 4 Devs:**
- **Dev 1:** Magic Links (WhatsApp/SMS/email) + fx_rates diarias (Bluelytics) + currency field con selector blue/oficial. (Sprint 2-3)
- **Dev 2:** Compresión progresiva de imágenes + storage quota enforcement + shortcuts de ícono (long press). (Sprint 3)
- **Dev 3:** Deep links desde WhatsApp + Universal Links + QR scanner de invitación + QR médico firmado. (Sprint 3)
- **Dev 4:** Notification consent strategy (contexto-first) + fallback in-app notifications + analytics de aceptación por contexto. (Sprint 3)

**5. Riesgo Fatal:** Si el módulo de finanzas no muestra el tipo de cambio blue como opción, el 40% de las transacciones reales de las familias argentinas (en dólares informales) quedan sin registrar — el módulo financiero pierde su utilidad core en el mercado objetivo.

---

## 13. Funciones Avanzadas (Modo Focus, Emergencias/Historial) ⚠️ REESCRITA

**1. Pitch:** v1.0 no resolvió: la integración con Screen Time API de iOS para el Modo Focus, el drenaje de batería del GPS, geofencing sin mapa activo (alertas de llegada/salida automáticas), y la estructura de datos para guardias médicas. Todos resueltos con especificaciones técnicas ejecutables.

**2. Benchmark LATAM:**
- GPS en background: la app sin optimización puede drenar 15-20% de batería por hora. En Argentina donde muchos usuarios tienen dispositivos con baterías degradadas, esto es causa directa de desinstalación.
- Screen Time API (iOS): permite integración real con el sistema de "No molestar" del SO — el Modo Focus de FamilyHub puede sincronizarse con el Focus Mode de iOS sin duplicar la configuración.
- Geofencing sin mapa activo: es el use case de "avisame cuando el chico llegó al colegio" — no requiere que nadie abra el mapa. Es la función con mayor valor percibido por los padres de menores de 12 años.
- **Métrica priorizada:** % de familias que usan el módulo de geofencing en los primeros 30 días post-lanzamiento (indicador de adopción de features avanzadas).

**3. Especificaciones (Reqs A–Z):**

*Modo Focus — Screen Time API iOS:*
- `expo-focus-mode` (custom native module) o integración con `react-native-screen-time-api`:
  - Cuando el usuario activa Modo Focus en FamilyHub → opción de "Sincronizar con Focus de iOS" → la app activa el Focus Mode del sistema operativo via `INStartFocusIntent` (SiriKit).
  - Cuando el usuario activa un Focus Mode en iOS (ej: "No Molestar", "Trabajo") → FamilyHub detecta vía `UNUserNotificationCenter.notificationCenter.getNotificationSettings` y refleja el estado en el perfil del miembro.
- Android: `UsageStatsManager` API para detectar si el dispositivo está en modo DND — refleja en el perfil del miembro.
- En ambos casos: el estado de Focus es visible para todos los miembros del grupo con nombre del modo activo ("Tomás está en Modo Estudio hasta las 20:00").

*GPS — Anti-drenaje de batería:*
```javascript
// Estrategia de GPS por capas
const LocationStrategy = {
  // Nivel 1: Sin mapa abierto → sin GPS activo
  background: {
    accuracy: 'balanced', // ~100m precisión, mínimo consumo
    timeInterval: 300000, // actualizar cada 5 minutos
    distanceInterval: 500, // o si se movió >500m
    foregroundService: false // no mantener proceso en background (iOS: no background location)
  },
  
  // Nivel 2: Mapa abierto por el usuario → GPS de alta precisión
  foreground: {
    accuracy: 'high', // ~5m precisión
    timeInterval: 10000, // cada 10 segundos
    distanceInterval: 50
  },
  
  // Nivel 3: Geofencing → solo eventos de entrada/salida
  geofence: {
    // expo-location GeofencingTaskName
    // Solo dispara cuando cruza el radio, no mantiene GPS activo
    // Consumo: <1% de batería por hora
  }
};

// Al cerrar el mapa → switch a background o apagar GPS completamente
// Al abrir el mapa → switch a foreground
```
- Indicador de batería: si la estrategia background está activa → mostrar en la UI del usuario "GPS activo (bajo consumo)" con opción de desactivar con 1 tap.

*Geofencing — Alertas sin mapa activo:*
```javascript
// expo-location TaskManager para geofencing en background
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const GEOFENCING_TASK = 'GEOFENCING_MONITOR';

TaskManager.defineTask(GEOFENCING_TASK, ({ data: { eventType, region }, error }) => {
  if (error) return;
  if (eventType === Location.GeofencingEventType.Enter) {
    // "Tomás llegó al colegio"
    sendFamilyNotification({ type: 'geofence_enter', zone: region.identifier, user: currentUser });
  }
  if (eventType === Location.GeofencingEventType.Exit) {
    // "Tomás salió del colegio"
    sendFamilyNotification({ type: 'geofence_exit', zone: region.identifier, user: currentUser });
  }
});

// Registrar zonas (admin configura)
await Location.startGeofencingAsync(GEOFENCING_TASK, [
  { identifier: 'colegio', latitude: -34.6037, longitude: -58.3816, radius: 200 },
  { identifier: 'casa', latitude: -34.6118, longitude: -58.4173, radius: 100 }
]);
```
- `geofence_zones(id, family_group_id, name TEXT, latitude NUMERIC, longitude NUMERIC, radius_meters INT, monitored_members UUID[], notify_members UUID[], active BOOLEAN)`.
- El miembro monitoreado debe dar consentimiento explícito (opt-in). Para menores <12: el admin lo configura sin opt-in del menor.
- Límite: 20 geofence zones activas simultáneamente por familia (limitación de iOS).

*Historial Médico — Estructura para guardias:*
```typescript
interface MedicalEmergencyProfile {
  // Datos mostrados en el QR / widget sin autenticación
  basic: {
    full_name: string;
    birth_date: string;
    blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    allergies_critical: string[]; // máximo 5
    conditions_critical: string[]; // diabetes, epilepsia, marcapasos, etc.
  };
  // Datos adicionales para el médico (requieren QR específico con token de 24h)
  extended: {
    chronic_medications: { name: string; dose: string; frequency: string }[];
    recent_surgeries: { procedure: string; date: string }[];
    emergency_contacts: { name: string; relation: string; phone: string }[];
    primary_care_physician: { name: string; phone: string; prepaga: string };
    dnr_order: boolean; // orden de no resucitación
  };
}
```
- `dnr_order` field: políticamente sensible. Incluir con disclaimer legal explícito: "FamilyHub no verifica la validez legal de esta directiva. Es responsabilidad del usuario consultar con un profesional médico y legal."
- El QR básico (datos de emergencia) está disponible sin autenticación. El QR extendido requiere el token firmado de 24h generado por el familiar.

*SOS — Botón físico vs widget:*
- Widget de pantalla bloqueada (principal): 1 tap + hold de 2s para evitar accidentales → Critical Alert a todos.
- Botón físico (Fase 2): integración con el botón de power de Android (5 taps rápidos) via Accessibility Service API. En iOS: acceso via AssistiveTouch (configurable por el usuario en Configuración del sistema).
- Para Roberto: el botón SOS en la pantalla principal de la app (uno de los 3 botones grandes) también funciona como SOS con el mismo hold de 2s.

*Scanner — Organización post-OCR:*
- Post-OCR de documento: el sistema sugiere categoría basada en el contenido extraído: "Parece un DNI. ¿Lo guardamos en Identidad?" — el usuario confirma con 1 tap o cambia la categoría.
- Nombres de documentos auto-generados: "DNI - Juan Martínez - vence 15/03/2031" — el usuario puede editar.
- `document_suggestions(document_id UUID, suggested_category TEXT, suggested_name TEXT, confidence NUMERIC, accepted BOOLEAN)`.

*Smart Home — Webhooks mínimos:*
- Integración vía IFTTT Webhooks o Make (Integromat): cuando se completa una tarea en FamilyHub → trigger a un webhook externo. El usuario configura el destino (ej: encender una lámpara con Alexa).
- No construimos la integración Smart Home — la exponemos como webhook saliente. La integración es responsabilidad del usuario via IFTTT.
- `outbound_webhooks(id, family_group_id UUID, trigger_event TEXT, webhook_url TEXT, secret TEXT, active BOOLEAN)`.

*Contactos — Llamada directa desde la app:*
- `emergency_contacts` en el historial médico tienen campo `phone`. Botón de llamada directa: `Linking.openURL('tel:${contact.phone}')` — abre la app de teléfono nativa.
- "Llamar a la prepaga": base de datos de prepagas AR (OSDE, Swiss Medical, Galeno, etc.) con número de emergencias. Hardcodeado en la app, actualizable via Edge Function.
- 911 y SAME: botones de acceso directo en el módulo SOS activado, sin requerir tener el número guardado.

*Widgets — Info crítica en Home:*
```javascript
// Prioridad de información en el widget de inicio
const homeWidgetPriority = [
  // 1. CRÍTICO: medicamento pendiente (si hay alguno en las próximas 2h)
  // 2. URGENTE: documento vence en <7 días
  // 3. NORMAL: tarea asignada para hoy
  // 4. INFO: balance de la semana / racha actual
  // Máximo 2 items en el widget — no más
];

// Widget size: small (2x2) → solo 1 item crítico + acción
// Widget size: medium (2x4) → 2 items + 2 acciones rápidas
// Widget size: large (4x4) → resumen del día + 3 acciones
```

**4. Workload 4 Devs:**
- **Dev 1:** Geofencing TaskManager (expo-location) + geofence_zones schema + GPS battery strategy. (Sprint 8-9)
- **Dev 2:** Screen Time API integration (iOS Focus sync) + MedicalEmergencyProfile schema con DNR field. (Sprint 7-8)
- **Dev 3:** Widget home (small/medium/large) + shortcut de llamada directa a prepaga/SAME/911. (Sprint 8)
- **Dev 4:** outbound_webhooks (IFTTT) + document scanner categorization + QR extended con token 24h. (Sprint 9)

**5. Riesgo Fatal:** Si el geofencing no funciona en iOS sin la app en foreground (iOS mata los procesos background agresivamente), la función "avisame cuando el chico llegó al colegio" — el caso de uso más valioso para padres — falla exactamente cuando más importa. Testear en dispositivos reales con la app en background, no en simulador.

---

## 14. Gamificación (Economía y Casa 3D) ⚠️ REESCRITA

**1. Pitch:** v1.0 ignoró 5 problemas de la economía de gamificación: inflación interna de puntos, rendimiento de Three.js en móviles de gama media LATAM, mecanismo de consenso/veto para evitar injusticias, leaderboards entre familias (con los riesgos asociados), y el reseteo mensual de puntos. Todos resueltos aquí.

**2. Benchmark LATAM:**
- Three.js en Snapdragon 778G (Samsung A54): el modelo 3D interactivo puede bajar el framerate a <30fps con assets no optimizados. SVG isométrico animado es la solución para MVP con el mismo impacto emocional.
- Inflación interna: si los puntos no tienen mecanismo de quema, la economía se infla (todos tienen puntos infinitos en 6 meses) y los canjes pierden valor percibido.
- Leaderboards entre familias: incentiva comparación externa sana si es opt-in. Pero puede generar presión social negativa entre familias conocidas (la familia del vecino que tiene más puntos). Opt-in con opción de anonimato.
- **Métrica priorizada:** % de teens que realizan al menos 1 canje de puntos en los primeros 14 días.

**3. Especificaciones (Reqs A–Z):**

*Inflación de puntos — Mecanismo de quema:*
- Los puntos no se acumulan infinitamente. Modelo de "economía familiar cerrada":
  - Puntos ganados: +10 a +50 por tarea (variable reward ±20%).
  - Puntos quemados: -X al canjear recompensas del catálogo.
  - Decaimiento: puntos inactivos decaen 5%/semana después de 30 días de inactividad del miembro.
  - Reseteo mensual parcial: el 1er del mes, los puntos se "cierran" como saldo del mes anterior. El historial mensual queda visible pero no es acumulable directamente. Se abre un nuevo "período de puntos".
  - Sin reseteo a 0 — el saldo acumulado se convierte en "Puntos Legacy" que mantienen el nivel de la casa 3D pero no se pueden canjear por permisos nuevos. Preserva el sunk cost positivo.

*Casa 3D — Three.js vs SVG:*
```javascript
// MVP (Sprints 9-10): SVG isométrico animado
// Razón: Three.js requiere assets 3D profesionales ($2.000-5.000 USD en modelos) 
// y tiene performance variable en Android gama media
// SVG isométrico: mismo impacto visual, <100KB de assets, 60fps garantizado

// Implementación SVG isométrica:
import Svg, { G, Path, Rect, Use, Defs } from 'react-native-svg';
import Animated from 'react-native-reanimated';

const AnimatedHouse = ({ unlocks }: { unlocks: HouseUnlock[] }) => {
  // Cada unlock añade un elemento SVG a la composición
  const hasGarden = unlocks.some(u => u.type === 'garden');
  const hasPaintedWalls = unlocks.some(u => u.type === 'painted_walls');
  
  return (
    <Svg viewBox="0 0 400 400">
      <BaseHouse /> {/* Siempre visible */}
      {hasGarden && <Garden />} {/* Desbloqueado al alcanzar primera meta */}
      {hasPaintedWalls && <PaintedWalls color={familyColor} />}
      {/* Animación de entrada de cada nuevo unlock */}
    </Svg>
  );
};

// Three.js en Fase 3 (si el presupuesto lo permite y el MVP lo valida)
// Decisión post-validación beta, no antes
```

*Consenso — Veto de tareas y reversión de puntos:*
- `task_disputes(id, task_id UUID, raised_by UUID, reason TEXT, status ENUM['open','resolved_accept','resolved_reject'], resolved_by UUID, resolved_at TIMESTAMPTZ)`.
- Si un miembro marca una tarea como "injusta" o "mal calificada" → se abre una disputa. El admin revisa y puede: aceptar (puntos revertidos), rechazar (puntos se mantienen), o escalar (todos los adultos votan).
- Los puntos disputados se "congelan" hasta que se resuelve la disputa — no pueden canjearse.
- Límite: cada miembro puede abrir máximo 2 disputas por semana para evitar abuso del sistema.

*Leaderboards entre familias:*
- Opt-in explícito a nivel de grupo: el admin activa "Participar en el ranking comunitario".
- El ranking es anónimo por default: "Familia #1.234 - 850 puntos esta semana". Opción de revelar el nombre de la familia (otro opt-in).
- No hay ranking de miembros individuales entre familias — solo el score grupal.
- `community_rankings(family_group_id UUID, weekly_score INT, opt_in BOOLEAN, display_name TEXT, week_start DATE)`.
- El ranking se resetea cada semana — evita ventajas acumuladas de familias más antiguas.

*Peleas — Competencia que rompe el hogar:*
- La gamificación compite DENTRO del grupo (colaboración grupal > competencia individual).
- "Misiones grupales" son el motor principal: "Esta semana: que TODOS los miembros completen 3 tareas → bonus de 100 puntos para TODOS". El incentivo es que todos participen, no que uno gane.
- Competencia individual (puntos personales) existe pero es secundaria y privada: solo el miembro ve su propio ranking dentro del grupo. No hay leaderboard interno de "quién hace más" visible para todos — evita señalar al que hace menos.

*Avatares — Costo de diseño vs personalización:*
- MVP: 8 avatares pre-diseñados (ilustraciones estilo flat, 4 opciones masculinas/4 femeninas, diversidad de tono de piel). Costo: $800-1.200 USD en Fiverr/99designs con estilo definido.
- No usar fotos reales como avatar en el mapa — avatares ilustrados protegen la privacidad y tienen un aspecto más "familiar" y menos "vigilancia".
- Fase 2: colores de avatar personalizables + accesorios desbloqueables por logros (no por dinero).
- `user_avatars(user_id UUID, avatar_base TEXT, color_skin TEXT, accessories TEXT[])`.

*Badges — Sistema de logros:*
```javascript
const BadgeDefinitions = {
  'first_expense': { name: 'Primer Gasto', icon: '💸', trigger: 'expenses_count >= 1' },
  'streak_7': { name: 'Semana Perfecta', icon: '🔥', trigger: 'streak_days >= 7' },
  'saver_1000': { name: 'Ahorrista', icon: '🏦', trigger: 'savings_goal_completed >= 1' },
  'early_bird': { name: 'Madrugador', icon: '🌅', trigger: '3_tasks_before_noon' },
  'doc_guardian': { name: 'Guardián', icon: '📋', trigger: 'documents_count >= 5' },
  'family_anchor': { name: 'Ancla Familiar', icon: '⚓', trigger: 'invited_all_family_members' },
  'med_master': { name: 'Medicamentos al día', icon: '💊', trigger: 'medications_confirmed_7_days' },
};
// Badges son permanentes — no expiran aunque se rompa el streak posterior
```

*Sound Design — Éxito/fracaso:*
- Sistema de sonidos opt-in (default: OFF — respetar la preferencia cultural de silencio en las apps).
- Si el usuario activa sonidos en Settings:
  - Tarea completada: sonido de "ding" corto y satisfactorio (0.3s).
  - Racha lograda: sonido ascendente de 0.5s.
  - Medicamento sin confirmar: sonido de alerta médica diferenciado (no es el mismo que las otras alertas).
  - SOS activado: sonido de alarma urgente (bypasa el volumen del sistema si es crítico).
- Los sonidos son archivos `.mp3` de 8-16kHz incluidos en el bundle (no descargados en runtime). Tamaño total: <500KB.

*Expiración de puntos — Reseteo mensual:*
- Ver "Inflación de puntos" arriba. No hay reseteo a 0 — hay congelación + "Puntos Legacy".
- El catálogo de canjes tiene ítems de corto plazo (canjeables con puntos del mes actual) y de largo plazo (requieren puntos acumulados de múltiples meses). Incentiva tanto el esfuerzo mensual como la constancia a largo plazo.

*Rewards — Canje por cupones externos:*
- Fase 3 (no MVP): cupones de descuento en partners (ej: librería, cine, supermercado). Requiere acuerdo comercial + sistema de validación de cupones.
- MVP y Fase 2: solo recompensas internas definidas por los padres (permisos, actividades, experiencias). Sin integración externa de cupones — demasiado complejo para el equipo de 4 devs.
- La promesa de "canjeá puntos por descuentos reales" es un roadmap item de Fase 3, no una promesa del MVP. No comunicar como feature actual.

**4. Workload 4 Devs:**
- **Dev 1:** Economía de puntos (decaimiento, reseteo parcial mensual, Puntos Legacy) + task_disputes + community_rankings schema. (Sprint 7-8)
- **Dev 2:** SVG isométrico de Casa 3D + sistema de unlocks + animaciones de entrada de nuevos elementos. (Sprint 9-10)
- **Dev 3:** Badge system completo (20 badges iniciales) + sound design (8 archivos .mp3 en bundle). (Sprint 8)
- **Dev 4:** Misiones grupales + leaderboard comunitario opt-in + avatares base (integración con diseñador externo). (Sprint 9)

**5. Riesgo Fatal:** Si Three.js se implementa sin assets optimizados y sin testing en dispositivos Android de gama media, el módulo de Casa 3D drena RAM y produce stuttering — el elemento que debería ser el diferenciador emocional más poderoso se convierte en el motivo de desinstalación.

---

## 15. Stack Técnico Final ⚠️ REESCRITA

**1. Pitch:** v1.0 ignoró 5 problemas técnicos críticos: el uso de Expo prebuild para módulos nativos no soportados, la prevención de re-renders en stores de Zustand grandes, el modelo de costos reales de Claude API en producción, el tamaño del bundle (<50MB es un requisito LATAM), y la estrategia de mocking para trabajar sin servidor caído.

**2. Benchmark LATAM:**
- Bundle size: Play Store y App Store no tienen límite estricto, pero bundles >100MB tienen tasa de descarga 40% menor en LATAM donde el almacenamiento del dispositivo es premium. Target: <50MB.
- Hermes engine: activado por default en Expo SDK 50+. Reduce memoria JS un 30%, tiempo de startup un 25% en Android gama media — no es opcional.
- Costo Claude API: `claude-sonnet-4-20250514` — $3/M input tokens, $15/M output tokens. Con 1.000 familias × 10 queries/mes × 1.000 tokens promedio = $30/mes en input + $150/mes en output = $180/mes. Con 10.000 familias = $1.800/mes. El costo escala linealmente — necesitamos throttling.
- **Métrica priorizada:** Bundle size <50MB + App startup time <2s en Samsung A54.

**3. Especificaciones (Reqs A–Z):**

*Expo Prebuild — Módulos nativos:*
- FamilyHub usa `expo-modules-core` para acceso a APIs nativas. Para módulos con código nativo que Expo Go no soporta (ej: `@react-native-ml-kit/text-recognition` para OCR local) → usar `expo prebuild` para generar el proyecto nativo (iOS + Android) y compilar con EAS Build.
- `app.json` define `"expo": { "plugins": ["@react-native-ml-kit/text-recognition", "expo-local-authentication", "expo-location"] }` — Expo Config Plugins inyectan la configuración nativa automáticamente.
- El equipo NUNCA edita los directorios `ios/` y `android/` manualmente — todo via Config Plugins. Si se necesita customización nativa → crear un Config Plugin propio.
- Workflow: `npx expo prebuild --clean` genera el proyecto nativo. EAS Build lo compila. El dev nunca abre Xcode o Android Studio para builds de producción.

*Zustand — Prevención de re-renders:*
```javascript
// Anti-patrón: suscripción al store completo
const { expenses, balance, tasks, profile } = useFamilyStore(); // re-render en CUALQUIER cambio

// Patrón correcto: selectores granulares
const expenses = useFamilyStore(state => state.expenses); // re-render solo si expenses cambia
const balance = useFamilyStore(state => state.balance); // re-render solo si balance cambia

// Para múltiples valores relacionados: shallow comparison
import { shallow } from 'zustand/shallow';
const { expenses, balance } = useFamilyStore(
  state => ({ expenses: state.expenses, balance: state.balance }),
  shallow // evita re-render si los valores son shallowly iguales
);

// Stores separados por dominio (no un store gigante):
// authStore, familyStore, expensesStore, tasksStore, notificationsStore
// Cada componente se suscribe solo al store que necesita
```

*Costo IA — Throttling y modelos baratos:*
```javascript
// Jerarquía de modelos por costo/tarea
const AIModelSelector = {
  // Clasificación de categoría de gasto → claude-haiku-4-5
  // Costo: $0.25/M input, $1.25/M output — 12x más barato que Sonnet
  classifyExpense: 'claude-haiku-4-5-20251001',
  
  // Análisis semanal profundo, insights personalizados → claude-sonnet-4
  weeklyInsight: 'claude-sonnet-4-20250514',
  
  // Respuesta a consulta conversacional del usuario → claude-sonnet-4
  conversationalQuery: 'claude-sonnet-4-20250514',
  
  // OCR de ticket (si el local ML Kit falla) → claude-haiku-4-5
  ocrFallback: 'claude-haiku-4-5-20251001',
};

// Rate limiting por plan
const AIRateLimits = {
  free: { daily: 3, monthly: 10 },
  familia: { daily: 20, monthly: -1 }, // -1 = ilimitado
  premium: { daily: -1, monthly: -1 }
};

// Context caching: el contexto familiar (8.000 tokens) se cachea 5 minutos
// En 5 minutos: 10 queries comparten el mismo contexto cacheado → 1 solo costo de input context
// Anthropic API cache: usar `cache_control: { type: "ephemeral" }` en el bloque de contexto
```

*NativeWind — Tablets y móviles viejos:*
```javascript
// Responsive con NativeWind breakpoints
// sm: 640px | md: 768px | lg: 1024px
<View className="flex-col md:flex-row">
  <FeedColumn className="w-full md:w-1/2" />
  <DashboardColumn className="w-full md:w-1/2" />
</View>

// Móviles viejos con NativeWind: Tailwind genera clases CSS nativas (StyleSheet)
// No hay runtime CSS parsing — performance igual en móviles viejos y nuevos
// Dispositivos con Android 10 (API 29): NativeWind funciona correctamente
// Dispositivos con Android 9 o menor: no en el target oficial (cubre <6% LATAM 2025)
```

*Error Tracking — Sentry sin PII:*
```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event) {
    // Filtrar PII antes de enviar a Sentry
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      event.user.id = hashUserId(event.user.id); // hash del ID, no el ID real
    }
    // Filtrar datos sensibles de breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs.values = event.breadcrumbs.values?.map(b => ({
        ...b,
        data: sanitizeSentryBreadcrumb(b.data) // eliminar amounts, names, locations
      }));
    }
    return event;
  }
});
```

*Bundle Size — <50MB:*
```bash
# Análisis de bundle
npx expo export --dump-sourcemap | npx react-native-bundle-visualizer

# Estrategias de reducción:
# 1. Tree shaking: asegurarse que lodash se importa selectivamente
import debounce from 'lodash/debounce'; # ✅ (solo importa debounce)
# NO: import _ from 'lodash'; # ❌ (importa todo lodash = +70KB)

# 2. Lazy loading de pantallas pesadas (Casa 3D, Mapa)
const HouseScreen = React.lazy(() => import('./screens/HouseScreen'));

# 3. Assets: SVGs inline, no archivos PNG pesados
# 4. Fuentes: solo los weights necesarios de Inter (regular, medium, bold)
# 5. Meta: bundle JS <15MB, assets <20MB, nativos <15MB = total <50MB

# Test de bundle size en CI
- name: Bundle Size Check
  run: |
    size=$(du -sh dist/ | cut -f1)
    echo "Bundle size: $size"
    # Fail si supera 50MB
```

*Hermes — Optimización Android:*
```json
// app.json
{
  "expo": {
    "android": {
      "jsEngine": "hermes" // activado por default en SDK 50+
    },
    "ios": {
      "jsEngine": "hermes" // activado en iOS desde SDK 51
    }
  }
}
```
- ProGuard en Android release builds: minifica el código Java/Kotlin nativo — reduce tamaño del APK ~15%.
- R8 compiler habilitado en release builds de Android.

*TypeScript — Strict en 100%:*
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```
- CI: `tsc --noEmit` en cada PR — si hay errores de tipos → PR bloqueado.
- Regla de equipo: no usar `as any` sin comentario explicativo. Revisado en code review.

*Mocking — Sin internet o servidor caído:*
```javascript
// msw (Mock Service Worker) para desarrollo offline
// /mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/expenses', (req, res, ctx) => {
    return res(ctx.json(mockExpenses)); // datos de prueba hardcodeados
  }),
  rest.post('/api/ai/query', (req, res, ctx) => {
    return res(ctx.delay(500), ctx.json({ content: mockAIResponse }));
  }),
];

// Activar en desarrollo: EXPO_PUBLIC_MOCK_API=true
// En staging y prod: EXPO_PUBLIC_MOCK_API=false (requests reales)
// En CI con tests: jest.mock() sobreescribe las llamadas de red
```

*EAS Updates — Hotfixes sin revisión de Store:*
- OTA updates (Over-The-Air) via `expo-updates`: permiten actualizar el bundle JS sin pasar por App Store review.
- Limitación: cambios en código nativo (nuevos permisos, nuevas librerías nativas) requieren review de Store. Cambios solo en JS/TS pueden deployarse via OTA en <5 minutos.
- Estrategia: mantener la capa nativa estable. Toda la lógica de negocio en JS. Los hotfixes de bugs que no tocan código nativo van via OTA.
- Rollback de OTA: `eas update --rollback-to-embedded` revierte al bundle del último build nativo si hay problemas con la OTA.

**4. Workload 4 Devs:**
- **Dev 1:** Expo prebuild setup + Config Plugins para todos los módulos nativos + tsconfig strict. (Sprint 1)
- **Dev 2:** Zustand stores separados por dominio + selectores granulares + anti-re-render patterns. (Sprint 1)
- **Dev 3:** AI cost model (Haiku para clasificación, Sonnet para análisis) + rate limiting por plan + context caching. (Sprint 4)
- **Dev 4:** Bundle size análisis + lazy loading de pantallas pesadas + Hermes config + msw para mocking. (Sprint 2)

**5. Riesgo Fatal:** Si el contexto familiar de 8.000 tokens se reconstruye en cada query de IA sin caching, con 10.000 familias y 10 queries/mes = 800M tokens de input = $2.400/mes solo en contexto de input — el product se vuelve inviable financieramente antes de llegar al break-even. El caching de contexto no es una optimización, es una condición de viabilidad del modelo de negocio.

---

## 16. Roadmap Go-To-Market ⚠️ REESCRITA

**1. Pitch:** v1.0 ignoró 6 problemas operativos críticos: quién tiene las llaves (factor bus), cómo captar 100 betas sin plata, qué explota con 10.000 familias, dónde vive la documentación interna, el buffer real para imprevistos, y el proceso de devolución de datos si el proyecto cierra. Todos resueltos aquí con números concretos.

**2. Benchmark LATAM:**
- Factor Bus: en un equipo de 4 devs, si la persona que sabe cómo está configurado Supabase en producción se va o enferma, el proyecto se paraliza. La documentación operativa no es opcional.
- 100 betas en AR sin plata: WhatsApp de madres de colegios de Zona Oeste GBA tiene >500 personas — 1 mensaje personalizado de una persona conocida convierte al 15-20%. Costo: 0 ARS.
- 10.000 familias: Supabase Pro aguanta hasta ~3.000 familias con uso intensivo antes de necesitar upgrade a Team ($599/mes). Planificar la migración 3 meses antes de llegar al límite.
- **Métrica priorizada:** 1.000 familias activas al mes 9 post-lanzamiento. 10.000 al mes 18.

**3. Especificaciones (Reqs A–Z):**

*Priorización — Qué se corta primero:*
```
Si falta tiempo en Sprint N → orden de corte:
1. NUNCA cortar: Auth, RLS, SOS, Medicamentos (seguridad y compliance)
2. NUNCA cortar: Lista de Compras Realtime (caso de uso diario = retención)
3. NUNCA cortar: Gestor de Documentos con alertas (killer feature diferencial)
4. SE PUEDE DIFERIR a Sprint N+1: Gamificación avanzada (Casa 3D, leaderboards)
5. SE PUEDE DIFERIR a Sprint N+2: Mapa familiar (útil pero no crítico en MVP)
6. SE PUEDE DIFERIR a Fase 2: Videollamadas, Smart Home, Modo Multi-Hogar
7. SE PUEDE ELIMINAR del MVP: Widget de pantalla bloqueada en Android <12 (fallback al shortcut de ícono)
```

*Marketing — 100 betas sin plata:*
- **Semana 1**: Cada dev hace una lista de 20 familias conocidas con hijos → 80 candidatos directos. Mensaje personalizado de WhatsApp (no broadcast). Target: 30 confirmados.
- **Semana 2**: Un dev visita el colegio al que van sus hijos + habla con 5 madres del grupo → pide que compartan con el grupo de WhatsApp del grado. 1 mensaje en un grupo de 150 personas = 15-20 candidatos adicionales.
- **Semana 3**: Instagram orgánico — video de 60s del founder explicando el problema (carga mental de las madres). Sin producción. Un iPhone y buena iluminación. Target: 2.000 views orgánicos, 50 clicks al form de espera.
- Total: 100 betas en 3 semanas. Costo: $0 ARS + tiempo de 2 devs.
- Criterio de selección de betas: al menos 3 miembros en la familia, al menos 1 teen o elder, al menos 1 usuario Android y 1 iOS. Diversidad de casos de uso.

*DevOps — Factor Bus y gestión de llaves:*
- **Todas las llaves viven en 2 lugares**: 1Password Teams (bóveda compartida del equipo, acceso de 4 devs) + Backup encriptado en Google Drive del equipo (acceso de 2 fundadores).
- Llaves que existen: Supabase service_role key, Supabase JWT secret, Claude API key, Apple Developer account credentials, Google Play Console credentials, MercadoPago API keys, Sentry DSN, PostHog API key.
- Rotación trimestral obligatoria de todas las llaves. Registrada en `ops/key-rotation-log.md`.
- Documentación operativa en Notion (acceso de 4 devs): "Cómo deployar a producción", "Cómo hacer rollback de una OTA", "Cómo responder a una alerta de Sentry en producción", "Cómo procesar una solicitud de supresión de datos AAIP".
- **Factor Bus test**: cada trimestre, un dev diferente hace el deploy de producción solo, sin ayuda. Si no puede, hay un gap en la documentación.

*Launch — Invite-only vs apertura total:*
- **Meses 7-8**: Invite-only (link de invitación necesario para registrarse). Razón: controlar el crecimiento, priorizar la calidad de la experiencia sobre el volumen, detectar bugs con base de usuarios conocida.
- **Mes 9**: Apertura total en App Store y Google Play. Lanzamiento en 2 etapas: primero Argentina (ar store), luego resto de LATAM (90 días después si los KPIs son positivos).
- El invite-only genera escasez percibida y FOMO — las 1.000 personas en lista de espera son más valiosas que 1.000 usuarios forzados.

*Ambientes — Dev/Staging/Prod:*
```bash
# Variables de entorno por ambiente
# .env.development
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
EXPO_PUBLIC_API_URL=http://localhost:54321/functions/v1
EXPO_PUBLIC_MOCK_API=false
EXPO_PUBLIC_ENV=development

# .env.staging  
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co  # proyecto separado de prod
EXPO_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
EXPO_PUBLIC_ENV=staging

# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://yyyyy.supabase.co  # proyecto de producción
EXPO_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
EXPO_PUBLIC_ENV=production

# EAS Build profiles
# eas.json
{
  "build": {
    "development": { "env": ".env.development", "developmentClient": true },
    "preview": { "env": ".env.staging", "distribution": "internal" },
    "production": { "env": ".env.production", "distribution": "store" }
  }
}
```

*Factor 10x — Qué explota con 10.000 familias:*
- **Supabase**: Pro plan aguanta ~3.000 familias activas. Con 10.000 → necesita Team ($599/mes) o self-hosted. Planificar upgrade en mes 15 (3 meses antes de llegar al límite).
- **Claude API**: $1.800/mes con 10.000 familias × 10 queries/mes × Sonnet. Mitigación: Haiku para clasificaciones (12x más barato), context caching agresivo, límite de queries en plan Free.
- **Storage**: 100GB × 1.000 familias Premium = 100TB → precio prohibitivo. Límite de storage por familia enforceado desde Sprint 1. Fotos en WebP (80% reducción vs JPEG). Videos: máx 3 por mes en plan Familia.
- **Edge Functions**: Supabase Pro incluye 2M invocations/mes. Con 10.000 familias y 10 eventos/día = 3M/mes → necesita upgrade. Solución: agrupar notificaciones de documentos en 1 edge function diaria (no 1 por documento).
- **Realtime connections**: Supabase Pro: 200 conexiones simultáneas. Con 10.000 familias activas en el mismo horario → overflow. Solución: pool de conexiones, reconectar cada 30 minutos para liberar slots.

*Documentación — Manual para nuevos devs:*
- `/docs` en el repositorio (Markdown, versioned con el código):
  - `docs/architecture.md`: diagrama de sistema, decisiones de arquitectura (ADRs — Architecture Decision Records).
  - `docs/onboarding-dev.md`: setup del entorno local en <30 minutos (supabase start, npm install, .env.development).
  - `docs/data-schema.md`: schema completo de BD con descripción de cada tabla y columna.
  - `docs/operations.md`: deploy, rollback, gestión de llaves, respuesta a incidentes.
  - `docs/legal-compliance.md`: proceso de supresión de datos, contacto AAIP, contacto abogado.
- Regla: ningún conocimiento crítico vive solo en la cabeza de un dev. Si lo sabés solo vos → escribilo en `/docs` antes del viernes.

*Buffer — Margen real para imprevistos:*
- Estimación conservadora: cada Sprint de 2 semanas tiene 20% de tiempo reservado para bugs no planificados y deuda técnica. Los Sprints se planifican al 80% de capacidad.
- Buffer de calendario: Fase 1 (4 meses) tiene 2 semanas de buffer incluidas. Si se usan → Fase 1.5 se recorre pero no se cancela.
- Contingencias esperadas que consumen buffer: rejection de App Store por módulo médico (2 semanas), bug crítico de RLS post-beta (1 semana), Expo SDK breaking change (1 semana), enfermedad de un dev (1 semana).
- Total buffer incluido en el roadmap: 6 semanas distribuidas en el año. Si se usan todas → el lanzamiento público pasa del mes 9 al mes 10.5. Aceptable.

*Demo Day — Usuarios reales:*
- **Mes 5, Semana 1**: Primera sesión de "Pensando en Voz Alta" con 3 familias beta reales. No presentación — el dev observa sin intervenir.
- **Mes 6, Semana 2**: Demo Day interno con las 20 familias beta. Presentación de 15 minutos + 45 minutos de uso libre. KPI: ¿cuántas familias usan la app solos sin ayuda?
- **Mes 8**: Demo Day público (50 personas, invite-only). Grabado para contenido de marketing.

*Exit — Devolución de datos si el proyecto cierra:*
- Protocolo de cierre documentado en ToU y en `docs/exit-protocol.md`:
  1. Anuncio con 90 días de anticipación por email a todos los usuarios activos.
  2. Habilitación de exportación masiva: botón "Exportar todos mis datos" activo en Settings sin restricción de plan.
  3. Formato de exportación: ZIP con JSON (esquema documentado en `docs/data-schema.md`) + PDF legible + fotos originales (descifradas con passphrase del usuario).
  4. Período de exportación: 90 días post-anuncio. Después: eliminación definitiva de todos los datos.
  5. Reembolso prorrateado de planes anuales activos vía MercadoPago automáticamente.
- La infraestructura (Supabase) se mantiene activa durante los 90 días post-anuncio. Costo estimado de cierre ordenado: ~$500-1.000 USD en infra + tiempo de 1 dev.

**4. Workload 4 Devs:**
- **Dev 1:** Documentación operativa completa (`/docs`) + exit protocol técnico + key rotation log. (Sprint 1, ongoing)
- **Dev 2:** Staging ambiente configurado como espejo de prod + EAS profiles + ambientes `.env.*`. (Sprint 1)
- **Dev 3:** Proceso de beta recruitment (contactos personales + colegios Zona Oeste GBA) + feedback protocol. (Mes 4-5)
- **Dev 4:** Scalability monitoring — alertas automáticas cuando Supabase alcanza 70% del límite del plan → trigger de upgrade proactivo. (Sprint 2, ongoing)

**5. Riesgo Fatal:** Si la Claude API key vive solo en la cabeza de 1 dev y ese dev se va o enferma, la feature más diferencial del producto (el asistente IA) deja de funcionar en producción sin que nadie sepa cómo repararlo — la documentación operativa de llaves no es overhead burocrático, es el seguro de vida del proyecto.

---

*FamilyHub — Documentación Técnica v2.0 (Auditoría Nuclear: 160 Stress Tests)*
*CTO + Auditor Senior | Todas las secciones auditadas | 16/16 reescritas con especificaciones ejecutables*
*Versión anterior v1.0: optimismo sin fricción. Esta versión: realidad brutal con soluciones concretas.*
