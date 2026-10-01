# Planner V1 — M11 Accessibility, Motion & Telemetry Proposal

Accesibilidad y motion son constraints de diseño, no una fase posterior. Esta propuesta no implementa APIs ni registra eventos nuevos.

## 1. Baseline accesible

| Área | Especificación de diseño / aceptación posterior |
|---|---|
| Target táctil | Android 48×48 dp mínimo recomendado; iOS 44×44 pt. Iconos pueden medir 20–24, hitSlop/celda no. |
| Spacing | 8–12 dp entre targets adyacentes; destructive no pegado a primary. |
| Contraste texto | 4.5:1 normal; 3:1 texto grande. Placeholder/helper también validado. |
| Contraste UI | 3:1 para icono/borde/focus/selected relevantes contra fondo. |
| Font scaling | 200% sin pérdida de contenido/función; no fixed heights en rows/tiles/forms. |
| Reflow | layout útil a ancho equivalente 320; evitar scroll horizontal salvo Calendar bidimensional justificado y con agenda alternativa. |
| Color | selected/status/progress siempre suman shape, icono, texto o value. |
| Iconos | labels visibles en Quick Actions; icon-only overflow/back/complete tienen accessibilityLabel. |
| Focus | orden visual=lógico; heading→filtros→contenido→acciones. Al abrir sheet, focus al título/primer campo; al cerrar, vuelve al trigger. |
| Selected | `accessibilityState.selected`; label no incorpora símbolos decorativos. |
| Disabled | `disabled`; no se ofrece onPress; razón visible solo si útil. |
| Busy | lock local + `busy`; anuncio una vez, sin repetición por render. |
| Error | mensaje humano próximo al campo/section, role alert/live region; focus al primer error tras submit. |
| Success | anuncio polite; foco vuelve a row creada/actualizada o trigger coherente. |
| Progress | `accessibilityValue` min/max/now o text “60 por ciento, 3 de 5 hitos”. |
| Long text | title 2+ líneas, metadata reflow; no ellipsis como única vía. Nombre completo en label. |
| Language | labels y anuncios en español consistente; evitar enum/código inglés. |
| RTL | proyecto no declara soporte; no hacerlo gate M11. Si se incorpora después, usar start/end, orden lógico y mirror icons direccionales. |

## 2. TalkBack por superficie

| Superficie | Lectura esperada |
|---|---|
| Quick Action tile | “Crear tarea, botón”; grid se lee Tarea, Evento, Meta; capabilities ocultas no dejan huecos de focus. |
| Root tab | “Tareas, pestaña, seleccionada”; cambio anuncia heading de contenido, no toda la pantalla. |
| Task row | un grupo descriptivo: título, vencimiento, responsable, excepción; complete/verify es un foco separado antes de la fila; overflow después. |
| Event row | hora, título, duración/lugar, recurrence/cancelled; overflow separado. |
| Goal row | título, porcentaje/hitos, siguiente milestone/target; no leer category/status normales. |
| Month cell | “Sábado 18 de julio, seleccionado, hoy/no, 2 elementos”; activar mueve a agenda/selecciona sin perder contexto. |
| Week strip | weekday/date/count/selected en secuencia cronológica. |
| Form field | label persistente, required si corresponde, value, hint breve; error reemplaza helper y se anuncia. |
| Overflow | nombre contextual “Más acciones para Comprar medicación”; menu focus trap y Back cierra. |
| Confirmation | título-consecuencia; cancel primero/seguro; destructive claramente nombrado. |
| Inline error | sección afectada + acción retry; nunca código técnico. |

No agrupar una row completa como un único accessible element si eso vuelve inaccesible complete/overflow. Tampoco hacer focusables iconos decorativos.

## 3. Dynamic Type / font scaling

| Componente | ≤1.3 | 1.3–1.6 | 1.6–2.0 |
|---|---|---|---|
| Quick Actions | 3 columnas | 2+1 si wrap | 1 columna de tiles limitadas, excepción accesible |
| Task/Event/Goal row | 2 líneas + exception | metadata reflow, trailing stays 48 | trailing pasa a segunda zona si necesario; targets intactos |
| Filters | una fila si cabe | wrap máximo 2 filas | filter button + sheet |
| Calendar Month | número + dots | reduce dots, conserva número | month mínimo + agenda; no metadata en cell |
| Forms | label/input natural | auto-height | una columna, CTA fuera del teclado |

La captura `44-quick-actions-large-text.png` confirma 1.3, pero no sustituye la aceptación a 2.0.

## 4. Motion principles

- Solo explica apertura/cierre, selección, creación, completion, cambio de estado/hogar, optimistic update, error o recuperación.
- Una interacción siempre responde inmediatamente; animación nunca bloquea red ni CTA.
- Transforms no cambian layout/target durante el gesto.
- Toda animación es interrumpible: nueva selección toma el estado actual, Back revierte/cierra, unmount cancela.
- No bounce constante, particles, glow, celebraciones, loops decorativos ni shake de error.

## 5. Motion spec

| Trigger | Propiedad | Duración | Easing | Interrupción | Reduced motion | Fallback sin animación |
|---|---|---:|---|---|---|---|
| press tile/row/button | opacity/fill; scale .985 opcional | 80 ms | ease-out | release/cancel inmediato | sin scale | fill/opacity instantáneo |
| select tab/filter/day | indicator/fill/outline | 140 ms | standard ease-out | nuevo target desde estado actual | sin slide | selected instantáneo |
| open Quick Actions sheet | opacity + translateY corto | 180 ms | decelerate | Back revierte | fade ≤100 o none | sheet aparece con focus correcto |
| close sheet | opacity + translateY | 160 ms | accelerate | reopen desde actual | fade ≤100 o none | desaparece y focus retorna |
| advanced disclosure | height/opacity medida | 180 ms | ease-in-out | toggle revierte | none | contenido aparece, expanded cambia |
| create success | sheet close + row emphasis | 180–240 ms total | ease-out | nav/unmount cancela | sin translate/scale | close + focus/anuncio |
| Task complete optimistic | check/fill + row collapse **solo tras estabilidad** | 180 ms; removal 240 | ease-out | rollback restaura desde actual | check instantáneo; no collapse animado | estado/posición actualiza |
| Goal progress update | determinate width/value | 180 ms | ease-out | nueva value continúa | value instantánea | texto/barra actualizados |
| household change | content crossfade tras gate | 180 ms | ease-in-out | nueva generation cancela vieja | none | contenido reemplaza tras ready |
| refresh | progress indicator | system | system | cancel request | reduce motion system | label/status |
| optimistic rollback | restore row + inline error | 180 ms | ease-out | retry cancela error anterior | none | restore + announce |
| validation error | color/icon/text | 0–140 ms | ease-out | corregir remueve | instantáneo | mensaje y focus |
| fatal/partial error | banner/state appear | 140 ms opacity | ease-out | retry | none | aparece + announcement |
| offline recovery | banner remove + stale refresh | 140 ms | ease-out | reconnection generation | none | banner cambia |

Spinners de sistema pueden seguir activos con Reduce Motion si el sistema los mantiene; si no, texto `Cargando…` y busy state son suficientes.

## 6. Haptics

| Evento | Haptic | Regla |
|---|---|---|
| press común | none | el feedback visual es suficiente; no haptic por tap o scroll repetitivo |
| long press abre menú | selection opcional | una vez cuando el menú aparece, no al mantener presionado |
| full-swipe threshold elegible | selection opcional | una vez al cruzar 70%; reset solo después de retirarse por debajo del umbral |
| completion/verify success | success/light | solo tras resultado/optimistic commitment seguro |
| destructive confirmation | none antes; success/error tras resultado | no advertencia háptica anticipada; la confirmación visual nombra consecuencia |
| error | error | una vez por submit, no por cada re-render |
| selection/tab | selection opcional | respetar setting/plataforma |

Haptics complementan; nunca son la única señal. La dependencia `expo-haptics` ya existe, pero M11-A/B/C no la modifica.

### Gesture parity, Undo and learning — M11-C2

- Visible Task controls remain canonical. Partial right swipe reveals the state-valid frequent action; partial left reveals `Más`; both are duplicated as tap and accessibility actions.
- Full swipe may commit only reversible Task completion, at a 70% threshold on release. Retreat before release cancels. Verification and destructive/administrative actions never full-swipe commit.
- Event and Goal have no commit swipe. Long press, where present, mirrors the exact visible overflow menu and adds no action.
- Undo is exposed as a one-tap action for a six-second base interval adjusted by the platform accessibility timeout. It announces the changed state without stealing focus; household switch invalidates stale Undo presentation.
- One optional inline hint can teach Task swipe after the user already succeeds through the visible control. It is dismissed once, never modal, and is suppressed while TalkBack/VoiceOver, offline/error or transition state is active.

## 7. Feedback de mutations

El hallazgo P0 de submits atascados exige este modelo futuro:

```text
idle → submitting(lock+busy)
  ├─ confirmed_success → announce → close/focus result
  ├─ safe_error → unlock + inline error + draft
  ├─ uncertain_timeout → unlock guarded + “revisar antes de reintentar”
  └─ conflict → preserve draft + resolve/reload
```

No generar un nuevo idempotency intent por doble tap mientras la UI sigue busy. El diseño no decide la implementación de servicio, pero sí prohíbe un estado visual indefinido.

## 8. Telemetry implications

Contrato vinculante: `HOMEPLUS_TELEMETRY_PRIVACY_CONTRACT.md`.

### Permitido conceptualmente después de autorización

- screen/surface allowlisted (`tasks`, `calendar_month`, `goal_detail`);
- action category allowlisted (`complete`, `verify`, `open_filter`, `open_quick_create`);
- outcome (`success`, `safe_error`, `conflict`, `cancelled`);
- duration bucket, retry count bucket, capability count 0–3, font-scale bucket, reduce-motion boolean;
- incident ID opaco ya permitido por error boundary.

### Prohibido

- Task/Event/Goal title o description;
- nombres de personas/hogares, ubicación/address;
- search query, notes, recurrence raw detail si identifica conducta;
- tokens, UUID de entidad/usuario/hogar, raw error/stack/SQL;
- texto accesible construido con contenido del usuario;
- screenshot automático.

### Eventos nuevos

No se propone registrarlos ahora. Si Gabriel autoriza telemetry en implementación, cualquier evento debe entrar primero al catálogo/allowlist y a tests de privacy. Usar telemetry para evaluar: tiempo hasta primera acción, submit stuck/timeout, filter usage, completion outcome y reduced-motion path; nunca contenido.

## 9. Acceptance checklist posterior

- TalkBack recorrido completo por Quick Actions, una row de cada objeto, Month, form/error/detail.
- Font scale 1.0/1.3/1.6/2.0; ancho narrow y resolución auditada.
- Reduce Motion on/off.
- Contrast tokens y estados disabled/selected/focus.
- Hardware Back con sheet/menu/keyboard.
- Busy no duplica mutation y siempre termina.
- Error/success se anuncia una vez y el foco queda útil.
- Gesture matrix verified: tap, partial reveal, cancellation, eligible full-swipe, long-press/overflow parity, accessibility actions, Undo timeout and screen-reader suppression of teaching hint.
