**# HomePlus — Design System V2**

**\*\*Producto:\*\* HomePlus — Sistema Operativo del Hogar**

**\*\*Versión:\*\* 2.0 (reescritura completa tras auditoría contra Final Spec V1)**

**\*\*Fecha:\*\* Junio 2026**

**\*\*Dependencias:\*\* Final Spec V1 (documento canónico), UX Philosophy V2**

**\*\*Alcance:\*\* Mobile-first (375×812px), React Native / Expo**

**\*\*Modos:\*\* `normal` | `senior` (PUX-03)**

**> \*\*Principios cromáticos:\*\* Calma · Claridad · Reconocimiento · Pertenencia · Control saludable**

**> \*\*No transmite:\*\* Vigilancia · Culpa acumulada · Presión social · Ansiedad por notificaciones (§02.03)**

**---**

**## 1. PALETA DE COLORES**

**### 1.1 Filosofía cromática**

**HomePlus usa una paleta \*\*tierra-cálida\*\* inspirada en hogares latinoamericanos: arcilla, madera, verdes vegetales, miel. Los colores deben sentirse como entrar a una casa donde hay café recién hecho, no como abrir una app de productividad (§UX-16).**

**\*\*Reglas de uso:\*\***

**- Máximo 3 colores principales en pantalla simultáneamente**

**- El color primario aparece en 1 o 2 elementos máximo por pantalla**

**- Los colores semánticos solo aparecen cuando su estado está activo**

**- Fondos siempre neutros-cálidos, nunca blancos puros**

**### 1.2 Primarios**

**PRIMARIO — Arcilla / Terracota**

**Transmite: tierra, hogar, calidez, arraigo**



**500 #C17F59 (base)**

**400 #D49B78 (hover)**

**600 #A86B45 (active/pressed)**

**300 #E3BAA0 (disabled)**

**100 #F2E0D4 (surface tint)**

**50 #FAF3ED (bg subtle)**



**SECUNDARIO — Salvia / Musgo**

**Transmite: calma, naturaleza, crecimiento**



**500 #7A9B7E (base)**

**400 #94B097 (hover)**

**600 #5F7F63 (active/pressed)**

**300 #B0C8B3 (disabled)**

**100 #D8E5DA (surface tint)**

**50 #EEF4EF (bg subtle)**



**ACENTO — Miel / Ámbar**

**Transmite: reconocimiento, celebración, calor**



**500 #D4A853 (base)**

**400 #DFBC72 (hover)**

**600 #BD8F38 (active/pressed)**

**300 #E8D09A (disabled)**

**100 #F2E6CC (surface tint)**



**\*.txt**

**Plaintext**

**### 1.3 Colores Semánticos**

**ÉXITO — Verde olivo suave**

**No usa verde neón. Transmite "está bien" sin ser estridente.**



**500 #6B9E7A (base)**

**100 #E1EFE5 (bg)**

**600 #558563 (text on light)**



**ALERTA — Ámbar cálido**

**Atención sin alarma. No es amarillo chillón.**



**500 #D4944A (base)**

**100 #F7EBDB (bg)**

**600 #B57930 (text on light)**



**ERROR — Terracota rojizo**

**Señala problemas sin pánico. No usa rojo agresivo.**



**500 #C46B6B (base)**

**100 #F5E2E2 (bg)**

**600 #A85050 (text on light)**



**INFO — Azul pizarra cálido**

**Informativo sin frialdad corporativa.**



**500 #7A8B9B (base)**

**100 #E4E9ED (bg)**

**600 #5F707F (text on light)**



**\*.txt**

**Plaintext**

**### 1.4 Superficies**

**CLARO (default)**

**bg-primary #FBFAF8 Crema muy suave**

**bg-secondary #F5F1EB Crema ligeramente más cálido**

**surface-card #FFFFFF Blanco roto**

**surface-elevated #FFFFFF con sombra**

**surface-overlay rgba(45,42,38,0.50)**

**divider #E8E3DC Línea sutil**

**divider-strong #D5CFC7**



**OSCURO**

**bg-primary #1C1A17 Marrón muy oscuro**

**bg-secondary #24211E Levemente más claro**

**surface-card #2C2925 Card**

**surface-elevated #332F2B Card elevada**

**surface-overlay rgba(0,0,0,0.65)**

**divider #3D3933**

**divider-strong #4F4A43**



**\*.txt**

**Plaintext**

**### 1.5 Texto**

**CLARO**

**text-primary #2D2A26 Casi negro, cálido**

**text-secondary #6B6560 Gris medio-cálido**

**text-tertiary #9B9590 Gris claro-cálido**

**text-disabled #C5BFB8 Deshabilitado**

**text-inverse #FBFAF8 Sobre fondo oscuro**

**text-link #C17F59 Igual que primario-500**



**OSCURO**

**text-primary #EDE8E2 Blanco cálido**

**text-secondary #B5AFA8 Gris medio**

**text-tertiary #7D7770 Gris oscuro**

**text-disabled #55504A Deshabilitado**

**text-inverse #2D2A26 Sobre fondo claro**

**text-link #D49B78 Primario-400**



**\*.txt**

**Plaintext**

**### 1.6 Modo Adulto Mayor — Alto Contraste (§7.4)**

**Cuando `mode='senior'` o el SO tiene "Increase Contrast" activado:**

**Textos forzados:**

**text-primary #1A1714 Contraste 15.2:1 sobre #FBFAF8**

**text-secondary #4A4540 Contraste 7.5:1**

**divider-strong #B5AFA5 Más visible**



**Superficies:**

**surface-overlay rgba(45,42,38,0.85) Sin transparencias sutiles**



**Íconos: weight bold, no outline**

**Focus ring: 3px, siempre visible en inputs**



**\*.txt**

**Plaintext**

**---**

**## 2. TIPOGRAFÍA**

**### 2.1 Fuentes**

**| Rol | Fuente | Categoría | Por qué |**

**|-----|--------|-----------|---------|**

**| \*\*Display / H1-H2\*\* | \*\*Fraunces\*\* (Google Fonts) | Serif cálida | Hogar, tradición, calidez editorial. Pesos variables. |**

**| \*\*Body / UI / H3-H6\*\* | \*\*Inter\*\* (Google Fonts) | Sans-serif humanista | Máxima legibilidad mobile, excelente en tamaños pequeños, neutral pero amigable. |**

**| \*\*Mono / Datos\*\* | \*\*JetBrains Mono\*\* | Monoespaciada | Montos de gastos, fechas en contexto de lista. `tabular-nums`. |**

**\*\*Fallback nativo:\*\***

**- iOS: Georgia (serif) + SF Pro Text (sans)**

**- Android: Noto Serif + Roboto**

**### 2.2 Escala tipográfica**

**Base: \*\*16px\*\* (1rem). Alineada con mínimos por rol (§7.2).**

**ESTÁNDAR (mode='normal')**

**Display Fraunces 700 32px / 40px Hero pages**

**H1 Fraunces 600 28px / 36px Pantalla principal**

**H2 Fraunces 600 24px / 32px Sección**

**H3 Inter 600 20px / 28px Subsección**

**H4 Inter 600 18px / 26px Card title**

**Body L Inter 400 18px / 26px Texto destacado**

**Body Inter 400 16px / 24px Texto base**

**Body S Inter 400 14px / 20px Texto secundario**

**Caption Inter 500 12px / 16px Meta, etiquetas**

**Label Inter 600 11px / 14px Chips, badges (ls: 0.5px)**

**Mono JetBrains 400 15px / 22px Montos, $ (tabular-nums)**



**ADULTO MAYOR (mode='senior') — §7.2, §7.4**

**Display Fraunces 700 44px / 52px**

**H1 Fraunces 600 36px / 44px**

**H2 Fraunces 600 30px / 38px**

**H3 Inter 600 24px / 32px**

**H4 Inter 600 20px / 28px**

**Body L Inter 400 22px / 30px**

**Body Inter 400 18px / 26px ← Mínimo absoluto para body (§7.2)**

**Body S Inter 400 16px / 24px**

**Caption Inter 500 14px / 20px**

**Label Inter 600 13px / 18px (ls: 1px)**



**\*.txt**

**Plaintext**

**### 2.3 Pesos utilizados**

**| Peso | Inter | Fraunces |**

**|------|-------|----------|**

**| Regular (400) | ✅ | ✅ |**

**| Medium (500) | ✅ | — |**

**| Semibold (600) | ✅ | ✅ |**

**| Bold (700) | — | ✅ |**

**---**

**## 3. ESPACIADO Y GRID**

**### 3.1 Sistema de espaciado**

**\*\*Base: 4px\*\***

**| Token | px | Uso |**

**|-------|----|-----|**

**| space-0 | 0 | Sin espacio |**

**| space-1 | 4 | Entre ícono y texto, inside chip |**

**| space-2 | 8 | Entre elementos compactos |**

**| space-3 | 12 | Padding interno de cards small |**

**| space-4 | 16 | Padding estándar de cards, entre secciones |**

**| space-5 | 20 | Padding de pantalla horizontal |**

**| space-6 | 24 | Entre cards, padding de modal |**

**| space-8 | 32 | Entre secciones grandes |**

**| space-10 | 40 | Separación de áreas mayores |**

**| space-12 | 48 | Hero spacing |**

**| space-16 | 64 | Separación máxima |**

**\*\*Adulto Mayor:\*\* Todos los valores se multiplican ×1.25 automáticamente vía tokens.**

**### 3.2 Grid de pantalla**

**Mobile (375–428px) — 4 columnas**

**│← 20 →│← col →│← 12 →│← col →│← col →│← 12 →│← col →│← 20 →│**

**│margin │ 1 │gutter │ 2 │ 3 │gutter │ 4 │margin │**



**Margen lateral: 20px**

**Gutter: 12px**

**Columna: ((ancho - 40 - 36) / 4)**



**Tablet (≥768px) — 8 columnas**

**Margen lateral: 24px**

**Gutter: 16px**



**\*.txt**

**Plaintext**

**### 3.3 Padding y márgenes estándar**

**Pantalla**

**├─ px: 20px (horizontal padding screen)**

**├─ py-section: 24px (entre secciones)**

**└─ py-stack: 16px (entre elementos)**



**Card**

**├─ p: 16px (padding interno estándar)**

**├─ p-compact: 12px**

**└─ gap interno: 12px**



**Adulto Mayor**

**├─ px-screen: 24px (+20%)**

**├─ card-p: 20px (+25%)**

**└─ gap: 16px (+33%)**



**\*.txt**

**Plaintext**

**### 3.4 Radio de bordes**

**| Token | px | Uso |**

**|-------|----|-----|**

**| radius-none | 0 | Divider, tabla |**

**| radius-sm | 6 | Chips, badges, inputs |**

**| radius-md | 12 | Cards, botones, avatares |**

**| radius-lg | 16 | Modales, bottom sheets |**

**| radius-full | 9999 | Píldoras, avatar circular |**

**---**

**## 4. COMPONENTES BASE**

**### 4.1 Botones**

**VARIANTES Y ESTADOS**

**Variante Default Hover Active/Pressed Disabled**

**──────── ─────── ───── ────────────── ────────**

**Primary bg: prim-500 prim-400 prim-600 prim-300**

**text: white**



**Secondary bg: prim-50 prim-100 prim-100 prim-300(text)**

**text: prim-600 prim-600**

**border: prim-300**



**Tertiary bg: transparent prim-50 prim-100 prim-300(text)**

**text: prim-600**



**Danger bg: error-500 error-400 error-600 error-300**

**text: white**



**Ghost bg: transparent bg-secondary bg-secondary-200 text-disabled**

**text: text-sec text-primary**



**TAMAÑOS (altura × padding horizontal)**

**Size Altura Padding H Font Radius Ícono Touch target**

**──── ────── ───────── ──── ────── ───── ────────────**

**sm 36px 12px caption radius-sm 16px 44px (≥44 WCAG)**

**md 44px 16px body radius-md 20px 44px**

**lg 52px 20px body L radius-md 24px 52px**



**Adulto Mayor:**

**sm 44px 16px body radius-md 20px 56px**

**md 56px 20px body L radius-md 24px 56px**

**lg 64px 24px h4 radius-md 28px 64px**



**LOADING**

**El botón mantiene su ancho. El texto se reemplaza por un spinner**

**del color correspondiente. El botón permanece en estado "active" visualmente.**

**Mínimo 400ms de loading para evitar flicker (UX Philosophy §1.2: el feedback**

**inmediato ocurre al press; el spinner aparece solo si la operación >300ms).**



**FEEDBACK TÁCTIL (§5.1)**

**Todo tap en botón recibe háptico 'light' (iOS) / 'clockTick' (Android).**

**Adulto Mayor: háptico 'medium' en lugar de 'light' para mayor perceptibilidad.**



**\*.txt**

**Plaintext**

**### 4.2 Botón Flotante (FAB)**

**FAB — Acción principal de creación (§1.1)**

**Posición: esquina inferior derecha (zona de pulgar)**

**Diámetro: 56px (md)**

**bg: prim-500, text: white, shadow: elevated**

**Ícono: + (plus)**



**Visible en pantallas de creación frecuente:**



**Tasks (Planner) → Crear tarea**

**Calendar (Planner) → Crear evento**

**Finance (More) → Registrar gasto (§1.1)**

**Inventory (More) → Agregar ítem**

**NO visible en: Home, People > Feed, People > Presence, Settings, HomeCloud**



**Adulto Mayor: diámetro 64px**



**\*.txt**

**Plaintext**

**### 4.3 Cards**

**CARD ESTÁNDAR**

**┌──────────────────────────────────────┐**

**│ bg: surface-card │**

**│ radius: radius-md (12px) │**

**│ padding: 16px │**

**│ shadow: 0px 2px 8px rgba(0,0,0,0.06)│**

**│ border: none (default) │**

**│ o 1px divider-strong (opcional) │**

**└──────────────────────────────────────┘**



**CARD DESTACADA (para Briefing, Atención Requerida, Reconocimiento)**

**┌──────────────────────────────────────┐**

**│ bg: surface-card │**

**│ border-left: 4px prim-500 │**

**│ shadow: 0px 4px 16px │**

**│ rgba(193,127,89,0.12) │**

**└──────────────────────────────────────┘**



**CARD ALERTA (contexto de atención — presupuesto, vencimiento)**

**┌──────────────────────────────────────┐**

**│ bg: alert-100 │**

**│ border-left: 4px alert-500 │**

**│ Acción principal en prim-600 │**

**└──────────────────────────────────────┘**



**CARD DE MÓDULO (More — acceso a dominios, §24.12)**

**┌──────────────────────────────────────┐**

**│ \[Ícono 28px] Nombre del módulo │ ← H4, text-primary**

**│ Indicador de estado │ ← caption, text-secondary**

**│ (opcional) │**

**│ \[chevron] │**

**└──────────────────────────────────────┘**

**Padding: 16px, gap: 12px entre ícono y texto**



**\*.txt**

**Plaintext**

**\*\*Reglas:\*\***

**- Las cards NO deben tener más de 1 acción primaria (UX Philosophy §2.2)**

**- Acciones secundarias como ghost button o link text**

**- Home: máximo 3 cards para Coordinador, 2 para Adulto, 1 para Niño/Adulto Mayor (§2.4)**

**### 4.4 Input Fields**

**ESTADOS**

**Default border: divider-strong (1.5px), bg: surface-card**

**Focus border: prim-500 (2px), bg: surface-card, ring: 3px prim-100**

**Filled border: divider-strong, bg: prim-50 (sutil)**

**Error border: error-500 (2px), ring: 3px error-100**

**+ texto de error debajo en caption, color error-600**

**Disabled border: divider, bg: bg-secondary, text: text-disabled, opacity: 0.6**



**TAMAÑOS**

**Size Altura Font Padding H Radius Label**

**──── ────── ──── ──────── ────── ─────**

**sm 36px body S 12px radius-sm caption**

**md 44px body 14px radius-md caption**

**lg 52px body L 16px radius-md body S**



**\*.txt**

**Plaintext**

**\*\*Reglas:\*\***

**- Todos los inputs tienen label arriba (nunca placeholder como reemplazo)**

**- Placeholder: text-tertiary, complementa al label, no lo reemplaza**

**- `accessibilityLabel` obligatorio en todo input**

**### 4.5 Chips / Badges**

**CHIPS (seleccionables, accionables — filtros de dominio)**

**Variante Default Selected**

**──────── ─────── ────────**

**Default bg: prim-50 bg: prim-500**

**text: prim-600 text: white**

**border: prim-200 border: prim-500**



**Outline bg: transparent bg: prim-500**

**text: text-sec text: white**

**border: divider**



**Tamaño Altura Padding H Font Radius**

**────── ────── ──────── ──── ──────**

**sm 28px 10px caption radius-sm**

**md 32px 12px body S radius-sm**



**BADGES (indicadores de estado, no interactivos)**

**Variante bg text dot**

**──────── ── ──── ───**

**Success success-100 success-600 success-500**

**Warning alert-100 alert-600 alert-500**

**Error error-100 error-600 error-500**

**Info info-100 info-600 info-500**

**Neutral prim-50 prim-600 prim-500**



**Tamaño Altura Padding H Font Dot size**

**────── ────── ──────── ──── ────────**

**sm 20px 8px label 6px**

**md 24px 10px caption 8px**



**\*.txt**

**Plaintext**

**\*\*Reglas de badges (§UX-07, §7.5):\*\***

**- Badge en Bottom Nav solo usa success (verde) o alert (ámbar). \*\*Nunca error (rojo)\*\* en la barra de navegación.**

**- El badge NUNCA lleva solo color como significado. Siempre texto + color.**

**- `accessibilityLabel`: "\[N] tareas pendientes" o similar.**

**### 4.6 Checkbox de Tarea (1-tap)**

**CHECKBOX — Acción principal de Tasks (§1.1)**

**La tarea se completa con 1 solo toque en el checkbox, sin abrir detalle.**



**Tamaño: 24×24px**

**Touch target: 44×44px (el área táctil excede el ícono visible)**

**Border: divider-strong (1.5px), radius-sm (6px)**



**Estados:**

**Unchecked border: divider-strong, bg: transparent**

**Pressed bg: prim-50, border: prim-300 (feedback inmediato <100ms)**

**Checked bg: success-500, border: success-500**

**Ícono: check blanco 14px**

**+ háptico 'light'**

**+ tachado en el título de la tarea (text-decoration: line-through,**

**color: text-tertiary)**

**Animación: fill 300ms ease-out + scale 0.9→1.0 200ms ease-out**



**Adulto Mayor: checkbox 32×32px, touch target 56×56px**



**\*.txt**

**Plaintext**

**### 4.7 Avatar**

**AVATAR**

**┌────────────┬──────────────┬──────────────┐**

**│ Con foto │ Sin foto │ Con presencia │**

**│ ┌────┐ │ ┌────┐ │ ┌────┐ │**

**│ │ 😊 │ │ │ MA │ │ │ 😊 │ ● │**

**│ └────┘ │ └────┘ │ └────┘ │**

**│ │ iniciales │ indicador │**

**└────────────┴──────────────┴──────────────┘**



**Tamaño Diámetro Iniciales(font) Indicador Grupo gap Touch target**

**────── ──────── ─────────────── ───────── ───────── ────────────**

**xs 24px caption 5px -4px 44px**

**sm 32px caption 6px -6px 44px**

**md 40px body 8px -8px 44px**

**lg 56px h4 10px -10px 56px**

**xl 72px h3 12px -12px 72px**



**Colores de iniciales (asignados por nombre):**

**┌──────────┬─────────┬──────────┬─────────┐**

**│ Arcilla │ Salvia │ Miel │ Lavanda │**

**│ #F2E0D4 │ #D8E5DA │ #F2E6CC │ #E4DFF0 │**

**│ text │ text │ text │ text │**

**│ prim-600 │ sec-600 │ acent-600│ #6B5B8A │**

**└──────────┴─────────┴──────────┴─────────┘**



**Indicador de presencia:**

**● online (success-500) — en casa, disponible**

**◉ ausente hace <30min (alert-500) — salió recientemente**

**○ offline (divider) — sin datos de presencia**



**\*.txt**

**Plaintext**

**\*\*Reglas:\*\***

**- Tap en avatar → Perfil de la persona (o propio) — patrón universal (§1.3)**

**- `accessibilityLabel`: "\[Nombre], \[rol]" (§7.5)**

**- `accessibilityHint`: "Toca para ver perfil"**

**### 4.8 Bottom Navigation Bar**

**BOTTOM NAVIGATION — CONGELADA V1 (§24.04)**

**Estructura oficial inmutable:**

**\[ Home ] \[ People ] \[ + ] \[ Planner ] \[ More ]**



**Altura: 56px (+ safe-area-inset-bottom)**

**bg: surface-card**

**border-top: 1px divider**

**shadow: 0px -2px 12px rgba(0,0,0,0.06)**



**Tab activo: ícono filled, text prim-600, weight 600**

**Tab inactivo: ícono outline, text text-tertiary, weight 400**



**Badge sobre tab: badge sm, anclado top-right del ícono.**

**Usa success-500 o alert-500 según contexto.**

**NUNCA usa error-500 en el nav bar (§UX-07).**



**Tap en tab activo: scroll to top + refresh de la pantalla actual (§3.5).**



**Distribución oficial (§24.04):**



**Tab Ícono Destino Contenido principal Visible para**

**─── ───── ─────── ────────────────── ────────────**

**Home 🏠 Home (§18) Briefing, Atención, widgets Todos**

**People 👥 People (§24.07) Feed, Presence, Personas Todos**



**\*.txt**

**Plaintext**

**➕     Quick Actions     Panel flotante: Geni (fijo)  Todos**

&#x20;                            **+ acciones dinámicas**

**Planner 📋 Planner (§24.08) Tasks, Calendar, Goals Todos**

**More ⋯ More (§24.12) Finance, Inventory, Todos**

**HomeCloud, Settings**



**\*.txt**

**Plaintext**

**\*\*Reglas canónicas (§3.5):\*\***

**- Bottom Nav \*\*congelada en V1\*\*. No se modifica sin enmienda a la Final Spec (§25).**

**- SOS no está en Bottom Nav. No está en Quick Actions. Acceso vía swipe ↑ global (§24.11).**

**- Geni no tiene tab dedicado. Es transversal (§14, §24.14).**

**- People agrupa Feed, Presence y Personas (§24.07).**

**- Planner agrupa Tasks, Calendar y Goals (§24.08).**

**- More contiene herramientas especializadas Tier 3 (§24.12).**

**### 4.9 Quick Actions Panel**

**QUICK ACTIONS — Panel flotante (§24.09)**

**Se abre al tocar el botón \[+] central en Bottom Nav.**



**┌──────────────────────────────────────┐**

**│ Fondo: blur(4px) + surface-overlay │**

**│ │**

**│ ┌──────────────────┐ │**

**│ │ 🤖 Geni │ ← Fijo, siempre primero**

**│ ├──────────────────┤ │**

**│ │ Acción dinámica 1│ ← Más usada**

**│ │ Acción dinámica 2│**

**│ │ Acción dinámica 3│**

**│ │ → scroll H │**

**│ └──────────────────┘ │**

**│ │**

**└──────────────────────────────────────┘**



**bg: surface-card**

**radius: radius-lg (16px)**

**padding: 8px**



**Animación: fade in + slide up, 200ms ease-out (§3.2)**

**Backdrop: blur(4px) + surface-overlay**



**Acciones posibles (por rol y contexto):**



**Crear tarea**

**Crear evento**

**Registrar gasto**

**Check-in**

**Escanear documento**

**Subir archivo**

**Ver pendientes**

**Orden:**



**Fijadas por el usuario (📌)**

**Más usadas (frecuencia + recencia)**

**Menos usadas**

**Geni es el único slot fijo. Al tocar → abre pantalla completa de Geni (§24.09, §24.14).**



**\*.txt**

**Plaintext**

**### 4.10 SOS Panel**

**SOS PANEL — Acceso global vía swipe ↑ (§24.11)**

**Disponible desde cualquier pantalla. Siempre abre un panel, nunca dispara**

**una alerta sin interacción (§1.4, §24.11).**



**┌──────────────────────────────────────┐**

**│ ─── drag handle (32×4px, divider) │**

**│ │**

**│ 🔴 Emergencia grave │ ← Coordinador, Adulto, Adol., A.M.**

**│ Riesgo físico o situación crítica │**

**│ │**

**│ 🟠 Necesito ayuda │ ← Todos los roles**

**│ Problema importante sin riesgo │**

**│ │**

**│ 🟡 Coordinación urgente │ ← Todos los roles**

**│ No es emergencia, requiere coord. │**

**│ │**

**│ \[Cancelar] │**

**└──────────────────────────────────────┘**



**bg: surface-elevated (NUNCA rojo — no generar pánico visual)**

**radius-top: radius-lg (16px)**

**Animación: slide up, 200ms ease-out (§3.2)**



**Permisos por rol (§24.11):**

**Rol 🔴 🟠 🟡**

**Coordinador ✔ ✔ ✔**

**Adulto ✔ ✔ ✔**

**Adolescente ✔ ✔ ✔**

**Niño ✗ ✔ ✔**

**Adulto Mayor ✔ ✔ ✔**

**Empleado Familiar ✗ ✔ ✔**



**Háptico al activar: 'heavy' (iOS) / 'effectHeavyClick' (Android)**

**— exclusivo para SOS (§5.1).**



**\*.txt**

**Plaintext**

**### 4.11 Modal y Bottom Sheet**

**BOTTOM SHEET — Opción principal mobile para crear/editar (§3.2, UX-03)**

**┌──────────────────────────────────────┐**

**│ ─── drag handle (32×4px, divider) │**

**│ │**

**│ Título (H3, text-primary) │**

**│ │**

**│ Contenido │**

**│ ... │**

**│ │**

**│ \[Acción secundaria] \[Acción primaria]│ ← Fijos abajo (sticky footer)**

**└──────────────────────────────────────┘**



**bg: surface-card**

**radius-top: radius-lg (16px)**

**padding: 24px**

**overlay: surface-overlay**

**backdrop: blur(4px) si el SO lo soporta**



**Alturas:**



**25% (quick actions, confirmaciones simples)**

**50% (formularios simples, filtros)**

**75% (formularios complejos, listas)**

**90% (casi full screen, edición detallada)**

**Animación:**



**Entrada: slide-up + fade-in, 300ms ease-out**

**Salida: slide-down + fade-out, 200ms ease-in**

**Overlay: fade-in 300ms / fade-out 200ms**

**MODAL CENTRADO — Solo para confirmaciones con consecuencia (§3.2, UX-08)**

**┌──────────────────────────┐**

**│ 🛎️ o ícono │ ← Ícono contextual, 48px**

**│ │**

**│ Título (H3, center) │**

**│ Descripción opcional │ ← body, text-sec**

**│ │**

**│ \[Cancelar] \[Confirmar] │**

**└──────────────────────────┘**



**bg: surface-card**

**radius: radius-lg (16px)**

**padding: 24px**

**max-width: 320px**

**gap entre elementos: 16px**

**overlay: surface-overlay**



**Animación: scale(0.95→1) + fade-in, 250ms ease-out (§3.2)**



**Uso exclusivo: confirmaciones de eliminación, expulsión, cambios de rol,**

**cierre de formulario con cambios sin guardar (§1.4).**



**NUNCA para formularios. NUNCA para navegación entre niveles.**



**\*.txt**

**Plaintext**

**### 4.12 List Item**

**LIST ITEM**

**Estructura base:**

**┌────────────────────────────────────────┐**

**│ \[leading] Título \[trailing] │**

**│ Subtítulo │**

**└────────────────────────────────────────┘**



**Altura: 56px (estándar), 48px (compacto)**

**Padding H: 20px**

**Gap leading↔content: 12px**

**Min touch target: 44px**



**Variantes de leading:**

**┌─────┐ ┌─────┐ ┌─────────┐ ┌──────┐**

**│Icon │ │Avatar│ │Checkbox │ │Switch│**

**│24px │ │ md │ │ 24px │ │ │**

**└─────┘ └─────┘ └─────────┘ └──────┘**



**Variantes de trailing:**

**┌──────┐ ┌──────┐ ┌───────┐ ┌─────┐**

**│Badge │ │Chip │ │chevron│ │Monto│**

**│ sm │ │ sm │ │ 20px │ │Mono │**

**└──────┘ └──────┘ └───────┘ └─────┘**



**Estados:**



**Default: bg transparent**

**Pressed: bg prim-50 (touch feedback inmediato, <100ms)**

**Selected: bg prim-50 + borde izquierdo 3px prim-500**

**Disabled: opacity 0.5**

**Separador entre items: 1px divider, indentado al contenido (no al leading).**

**O sin separador entre grupos lógicos.**



**Adulto Mayor: altura 64px, touch target 56px**



**\*.txt**

**Plaintext**

**### 4.13 Toast / Snackbar**

**TOAST — Notificación no intrusiva (§1.2)**

**┌──────────────────────────────────────┐**

**│ \[ícono] Mensaje breve \[acción] │**

**└──────────────────────────────────────┘**



**Posición: Top (nunca bottom — compite con nav y acciones) (§UX-17)**

**bg: surface-elevated**

**shadow: 0px 4px 16px rgba(0,0,0,0.10)**

**radius: radius-md (12px)**

**Altura: 44px**

**Padding H: 16px**

**Duración default: 4s. Adulto Mayor: 8s (§4.3).**



**Variantes:**



**Success: borde izquierdo success-500, 3px**

**Alert: borde izquierdo alert-500, 3px**

**Error: borde izquierdo error-500, 3px + háptico 'warning'**

**Info: borde izquierdo info-500, 3px**

**Animación: slide-down + fade-in (300ms), sale con fade-out (200ms)**



**REGLAS:**



**Máximo 1 toast visible a la vez. Si llega otro, el actual se descarta.**

**NUNCA toast para tareas completadas por otros miembros (§5 — Toast UX Rule).**

**El toast con "Deshacer" dura 5s (ventana de reversión de completado, §1.4).**

**\*.txt**

**Plaintext**

**### 4.14 Indicador de Progreso**

**PROGRESS BAR**

**┌──────────────────────────────────────┐**

**│ ████████████░░░░░░░░ 72% │**

**└──────────────────────────────────────┘**



**Track: bg-secondary, height 6px, radius-full**

**Fill: prim-500, height 6px, radius-full**

**Transición: width 600ms ease-out**



**Variantes de color según contexto:**



**Tareas / Goals: prim-500 (arcilla)**

**Inventory / Medicación: sec-500 (salvia)**

**Finanzas / Presupuesto: acent-500 (miel)**

**REGLA EMOCIONAL: La barra de progreso nunca muestra "atraso" o "deuda"**

**visual. Si alguien está atrasado en una tarea, se muestra como "pendiente"**

**sin color de error. El color de error solo se usa en bloqueos reales.**



**\*.txt**

**Plaintext**

**### 4.15 Empty State**

**EMPTY STATE — Primera experiencia por dominio (§6.2)**

**┌──────────────────────────────────────┐**

**│ │**

**│ \[Ilustración sutil] │ ← 120px, tint prim-100**

**│ │**

**│ Título (H3, text-primary) │ ← "Acá van a aparecer tus tareas"**

**│ │**

**│ Descripción (body, text-sec) │ ← "Cuando alguien te asigne una**

**│ │ tarea, la vas a ver acá."**

**│ │**

**│ \[Acción sugerida] │ ← Botón secondary o ghost**

**│ │**

**└──────────────────────────────────────┘**



**El empty state es el tutorial de la app (§6.2, UX-10).**

**No se usan tooltips ni carruseles de features.**



**\*.txt**

**Plaintext**

**### 4.16 Skeleton / Loading**

**SKELETON — Carga inicial o refresh (§5.2, §5.3)**

**Aparece cuando los datos tardan >300ms en cargar.**



**┌──────────────────────────────────────┐**

**│ ┌────────────────────────────┐ │ ← Card skeleton**

**│ │ ░░░░░░░░░░░░░░░░ │ │ bg: prim-50, animación pulse**

**│ │ ░░░░░░░░░░ │ │**

**│ └────────────────────────────┘ │**

**│ ┌────────────────────────────┐ │**

**│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ │**

**│ └────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**Animación: pulse (opacidad 0.3 → 0.6 → 0.3, ciclo 1.5s ease-in-out)**

**Transición a contenido: fade-in 300ms (los skeletons se disuelven)**



**\*.txt**

**Plaintext**

**### 4.17 Tab Bar (Navegación interna de dominio)**

**TAB BAR — Para sub-secciones dentro de un dominio (§24.16)**

**┌──────────────────────────────────────┐**

**│ \[Feed] \[Presence] \[Personas] │ ← People (§24.07)**

**│ ─────── │ ← Indicador animado**

**└──────────────────────────────────────┘**



**Altura: 44px**

**bg: transparent o bg-primary**

**Indicador: 3px prim-500, radius-full, animado con slide**

**Tab activo: text prim-600, weight 600**

**Tab inactivo: text text-tertiary, weight 400**

**Máximo 5 tabs por dominio (§24.16)**



**Uso:**



**People: Feed | Presence | Personas**

**Planner: Tasks | Calendar | Goals**

**\*.txt**

**Plaintext**

**### 4.18 Selector Multi-Hogar**

**MULTI-HOGAR SELECTOR — Header global (§24.13)**

**Visible SOLO si el usuario pertenece a 2+ hogares.**



**┌──────────────────────────────────────────┐**

**│ \[Avatar] Familia Bazán \[▼] │**

**└──────────────────────────────────────────┘**



**Avatar → Perfil personal (Cuenta, §05.11)**

**Nombre de hogar + ▼ → Dropdown de cambio de hogar (§16.06)**



**Si solo 1 hogar: header limpio, solo Avatar. No se muestra selector.**



**\*.txt**

**Plaintext**

**---**

**## 5. TOKENS DE DISEÑO**

**### 5.1 Estructura de tokens**

**Los tokens se organizan en 3 niveles:**

**- \*\*Nivel 1 — Globales\*\* (valores crudos: colores hex, px, fonts)**

**- \*\*Nivel 2 — Semánticos\*\* (significado: bg-primary, text-secondary, success-500)**

**- \*\*Nivel 3 — Componentes\*\* (aplicación: button-primary-bg, card-padding)**

**### 5.2 CSS Custom Properties**

**```css**

**/\* ============================================================**

&#x20;  **HomePlus DESIGN TOKENS V2**

&#x20;  **Formato: CSS Custom Properties**

&#x20;  **Compatible con: React Native (StyleSheet), styled-components**

&#x20;  **============================================================ \*/**

**/\* ─── NIVEL 1: GLOBALES ─── \*/**

**:root {**

&#x20; **/\* ── Colores base ── \*/**

&#x20; **--fh-prim-50: #FAF3ED;**

&#x20; **--fh-prim-100: #F2E0D4;**

&#x20; **--fh-prim-300: #E3BAA0;**

&#x20; **--fh-prim-400: #D49B78;**

&#x20; **--fh-prim-500: #C17F59;**

&#x20; **--fh-prim-600: #A86B45;**

&#x20; **--fh-sec-50: #EEF4EF;**

&#x20; **--fh-sec-100: #D8E5DA;**

&#x20; **--fh-sec-300: #B0C8B3;**

&#x20; **--fh-sec-400: #94B097;**

&#x20; **--fh-sec-500: #7A9B7E;**

&#x20; **--fh-sec-600: #5F7F63;**

&#x20; **--fh-acent-100: #F2E6CC;**

&#x20; **--fh-acent-300: #E8D09A;**

&#x20; **--fh-acent-400: #DFBC72;**

&#x20; **--fh-acent-500: #D4A853;**

&#x20; **--fh-acent-600: #BD8F38;**

&#x20; **/\* ── Espaciado ── \*/**

&#x20; **--fh-space-0: 0;**

&#x20; **--fh-space-1: 4;**

&#x20; **--fh-space-2: 8;**

&#x20; **--fh-space-3: 12;**

&#x20; **--fh-space-4: 16;**

&#x20; **--fh-space-5: 20;**

&#x20; **--fh-space-6: 24;**

&#x20; **--fh-space-8: 32;**

&#x20; **--fh-space-10: 40;**

&#x20; **--fh-space-12: 48;**

&#x20; **--fh-space-16: 64;**

&#x20; **/\* ── Radio ── \*/**

&#x20; **--fh-radius-none: 0;**

&#x20; **--fh-radius-sm: 6;**

&#x20; **--fh-radius-md: 12;**

&#x20; **--fh-radius-lg: 16;**

&#x20; **--fh-radius-full: 9999;**

&#x20; **/\* ── Tipografía ── \*/**

&#x20; **--fh-font-display: 'Fraunces', Georgia, serif;**

&#x20; **--fh-font-body: 'Inter', -apple-system, sans-serif;**

&#x20; **--fh-font-mono: 'JetBrains Mono', monospace;**

&#x20; **--fh-font-weight-regular: 400;**

&#x20; **--fh-font-weight-medium: 500;**

&#x20; **--fh-font-weight-semibold: 600;**

&#x20; **--fh-font-weight-bold: 700;**

&#x20; **/\* ── Sombras ── \*/**

&#x20; **--fh-shadow-card: 0px 2px 8px rgba(45, 42, 38, 0.06);**

&#x20; **--fh-shadow-elevated: 0px 4px 16px rgba(45, 42, 38, 0.10);**

&#x20; **--fh-shadow-nav: 0px -2px 12px rgba(45, 42, 38, 0.06);**

&#x20; **/\* ── Transiciones ── \*/**

&#x20; **--fh-ease-out: cubic-bezier(0.16, 1, 0.3, 1);**

&#x20; **--fh-ease-in: cubic-bezier(0.4, 0, 1, 1);**

&#x20; **--fh-duration-fast: 150ms;**

&#x20; **--fh-duration-normal: 250ms;**

&#x20; **--fh-duration-slow: 350ms;**

&#x20; **/\* ── Touch targets ── \*/**

&#x20; **--fh-touch-min: 44px;**

**}**

**/\* ─── NIVEL 2: SEMÁNTICOS (modo claro) ─── \*/**

**:root,**

**\[data-theme="light"] {**

&#x20; **/\* ── Superficies ── \*/**

&#x20; **--fh-bg-primary: #FBFAF8;**

&#x20; **--fh-bg-secondary: #F5F1EB;**

&#x20; **--fh-surface-card: #FFFFFF;**

&#x20; **--fh-surface-elevated: #FFFFFF;**

&#x20; **--fh-surface-overlay: rgba(45, 42, 38, 0.50);**

&#x20; **--fh-divider: #E8E3DC;**

&#x20; **--fh-divider-strong: #D5CFC7;**

&#x20; **/\* ── Texto ── \*/**

&#x20; **--fh-text-primary: #2D2A26;**

&#x20; **--fh-text-secondary: #6B6560;**

&#x20; **--fh-text-tertiary: #9B9590;**

&#x20; **--fh-text-disabled: #C5BFB8;**

&#x20; **--fh-text-inverse: #FBFAF8;**

&#x20; **--fh-text-link: #C17F59;**

&#x20; **/\* ── Semánticos ── \*/**

&#x20; **--fh-success-500: #6B9E7A;**

&#x20; **--fh-success-600: #558563;**

&#x20; **--fh-success-100: #E1EFE5;**

&#x20; **--fh-alert-500: #D4944A;**

&#x20; **--fh-alert-600: #B57930;**

&#x20; **--fh-alert-100: #F7EBDB;**

&#x20; **--fh-error-500: #C46B6B;**

&#x20; **--fh-error-600: #A85050;**

&#x20; **--fh-error-100: #F5E2E2;**

&#x20; **--fh-info-500: #7A8B9B;**

&#x20; **--fh-info-600: #5F707F;**

&#x20; **--fh-info-100: #E4E9ED;**

&#x20; **/\* ── Avatar backgrounds ── \*/**

&#x20; **--fh-avatar-arcilla: #F2E0D4;**

&#x20; **--fh-avatar-salvia: #D8E5DA;**

&#x20; **--fh-avatar-miel: #F2E6CC;**

&#x20; **--fh-avatar-lavanda: #E4DFF0;**

**}**

**/\* ─── NIVEL 2: MODO OSCURO ─── \*/**

**\[data-theme="dark"] {**

&#x20; **--fh-bg-primary: #1C1A17;**

&#x20; **--fh-bg-secondary: #24211E;**

&#x20; **--fh-surface-card: #2C2925;**

&#x20; **--fh-surface-elevated: #332F2B;**

&#x20; **--fh-surface-overlay: rgba(0, 0, 0, 0.65);**

&#x20; **--fh-divider: #3D3933;**

&#x20; **--fh-divider-strong: #4F4A43;**

&#x20; **--fh-text-primary: #EDE8E2;**

&#x20; **--fh-text-secondary: #B5AFA8;**

&#x20; **--fh-text-tertiary: #7D7770;**

&#x20; **--fh-text-disabled: #55504A;**

&#x20; **--fh-text-inverse: #2D2A26;**

&#x20; **--fh-text-link: #D49B78;**

&#x20; **--fh-success-500: #7BB58D;**

&#x20; **--fh-success-600: #6B9E7A;**

&#x20; **--fh-success-100: #2A3A2E;**

&#x20; **--fh-alert-500: #DDA65C;**

&#x20; **--fh-alert-600: #D4944A;**

&#x20; **--fh-alert-100: #3A2E20;**

&#x20; **--fh-error-500: #D48080;**

&#x20; **--fh-error-600: #C46B6B;**

&#x20; **--fh-error-100: #3A2525;**

&#x20; **--fh-info-500: #8E9DAB;**

&#x20; **--fh-info-600: #7A8B9B;**

&#x20; **--fh-info-100: #252A30;**

&#x20; **--fh-avatar-arcilla: #4A3328;**

&#x20; **--fh-avatar-salvia: #2A3A2E;**

&#x20; **--fh-avatar-miel: #3A3020;**

&#x20; **--fh-avatar-lavanda: #2E2838;**

**}**

**/\* ─── NIVEL 2: MODO ADULTO MAYOR ─── \*/**

**\[data-mode="senior"] {**

&#x20; **/\* Escala tipográfica aumentada (§7.2) \*/**

&#x20; **--fh-font-scale-display: 44px / 52px;**

&#x20; **--fh-font-scale-h1: 36px / 44px;**

&#x20; **--fh-font-scale-h2: 30px / 38px;**

&#x20; **--fh-font-scale-h3: 24px / 32px;**

&#x20; **--fh-font-scale-h4: 20px / 28px;**

&#x20; **--fh-font-scale-bodyL: 22px / 30px;**

&#x20; **--fh-font-scale-body: 18px / 26px;**

&#x20; **--fh-font-scale-bodyS: 16px / 24px;**

&#x20; **--fh-font-scale-caption: 14px / 20px;**

&#x20; **--fh-font-scale-label: 13px / 18px;**

&#x20; **--fh-letter-spacing-label: 1px;**

&#x20; **/\* Espaciado aumentado ×1.25 (§3.1) \*/**

&#x20; **--fh-space-1: 5;**

&#x20; **--fh-space-2: 10;**

&#x20; **--fh-space-3: 15;**

&#x20; **--fh-space-4: 20;**

&#x20; **--fh-space-5: 24;**

&#x20; **--fh-space-6: 30;**

&#x20; **--fh-space-8: 40;**

&#x20; **--fh-space-10: 50;**

&#x20; **/\* Alto contraste AA+ (§7.4) \*/**

&#x20; **--fh-text-primary: #1A1714;**

&#x20; **--fh-text-secondary: #4A4540;**

&#x20; **--fh-text-tertiary: #6B6560;**

&#x20; **--fh-divider-strong: #B5AFA5;**

&#x20; **--fh-surface-overlay: rgba(45, 42, 38, 0.85);**

&#x20; **/\* Targets táctiles más grandes (§4.1) \*/**

&#x20; **--fh-touch-min: 56px;**

&#x20; **/\* Reducción de movimiento (§5.2, §7.1) \*/**

&#x20; **--fh-duration-fast: 0ms;**

&#x20; **--fh-duration-normal: 0ms;**

&#x20; **--fh-duration-slow: 0ms;**

**}**

**/\* Respetar prefers-reduced-motion del SO (§7.1) \*/**

**@media (prefers-reduced-motion: reduce) {**

&#x20; **:root {**

&#x20;   **--fh-duration-fast: 0ms;**

&#x20;   **--fh-duration-normal: 0ms;**

&#x20;   **--fh-duration-slow: 0ms;**

&#x20; **}**

**}**

**5.3 Tokens para React Native**

**\*.ts**

**TypeScript**

**// designTokens.ts**

**// Uso: import { tokens } from '@/design-system/tokens';**

**export const tokens = {**

&#x20; **colors: {**

&#x20;   **prim: {**

&#x20;     **50: '#FAF3ED', 100: '#F2E0D4', 300: '#E3BAA0',**

&#x20;     **400: '#D49B78', 500: '#C17F59', 600: '#A86B45',**

&#x20;   **},**

&#x20;   **sec: {**

&#x20;     **50: '#EEF4EF', 100: '#D8E5DA', 300: '#B0C8B3',**

&#x20;     **400: '#94B097', 500: '#7A9B7E', 600: '#5F7F63',**

&#x20;   **},**

&#x20;   **acent: {**

&#x20;     **100: '#F2E6CC', 300: '#E8D09A', 400: '#DFBC72',**

&#x20;     **500: '#D4A853', 600: '#BD8F38',**

&#x20;   **},**

&#x20;   **surface: {**

&#x20;     **bg: '#FBFAF8', bgAlt: '#F5F1EB', card: '#FFFFFF',**

&#x20;     **elevated: '#FFFFFF', overlay: 'rgba(45, 42, 38, 0.50)',**

&#x20;     **divider: '#E8E3DC', dividerStrong: '#D5CFC7',**

&#x20;   **},**

&#x20;   **text: {**

&#x20;     **primary: '#2D2A26', secondary: '#6B6560', tertiary: '#9B9590',**

&#x20;     **disabled: '#C5BFB8', inverse: '#FBFAF8', link: '#C17F59',**

&#x20;   **},**

&#x20;   **success: { 100: '#E1EFE5', 500: '#6B9E7A', 600: '#558563' },**

&#x20;   **alert:   { 100: '#F7EBDB', 500: '#D4944A', 600: '#B57930' },**

&#x20;   **error:   { 100: '#F5E2E2', 500: '#C46B6B', 600: '#A85050' },**

&#x20;   **info:    { 100: '#E4E9ED', 500: '#7A8B9B', 600: '#5F707F' },**

&#x20;   **avatar: {**

&#x20;     **arcilla: { bg: '#F2E0D4', text: '#A86B45' },**

&#x20;     **salvia:  { bg: '#D8E5DA', text: '#5F7F63' },**

&#x20;     **miel:    { bg: '#F2E6CC', text: '#BD8F38' },**

&#x20;     **lavanda: { bg: '#E4DFF0', text: '#6B5B8A' },**

&#x20;   **},**

&#x20; **},**

&#x20; **spacing: {**

&#x20;   **0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20,**

&#x20;   **6: 24, 8: 32, 10: 40, 12: 48, 16: 64,**

&#x20; **},**

&#x20; **radius: { none: 0, sm: 6, md: 12, lg: 16, full: 9999 },**

&#x20; **typography: {**

&#x20;   **fontDisplay: 'Fraunces',**

&#x20;   **fontBody: 'Inter',**

&#x20;   **fontMono: 'JetBrainsMono',**

&#x20;   **scale: {**

&#x20;     **display: { size: 32, lineHeight: 40, family: 'Fraunces', weight: '700' as const },**

&#x20;     **h1:      { size: 28, lineHeight: 36, family: 'Fraunces', weight: '600' as const },**

&#x20;     **h2:      { size: 24, lineHeight: 32, family: 'Fraunces', weight: '600' as const },**

&#x20;     **h3:      { size: 20, lineHeight: 28, family: 'Inter',    weight: '600' as const },**

&#x20;     **h4:      { size: 18, lineHeight: 26, family: 'Inter',    weight: '600' as const },**

&#x20;     **bodyL:   { size: 18, lineHeight: 26, family: 'Inter',    weight: '400' as const },**

&#x20;     **body:    { size: 16, lineHeight: 24, family: 'Inter',    weight: '400' as const },**

&#x20;     **bodyS:   { size: 14, lineHeight: 20, family: 'Inter',    weight: '400' as const },**

&#x20;     **caption: { size: 12, lineHeight: 16, family: 'Inter',    weight: '500' as const },**

&#x20;     **label:   { size: 11, lineHeight: 14, family: 'Inter',    weight: '600' as const, letterSpacing: 0.5 },**

&#x20;     **mono:    { size: 15, lineHeight: 22, family: 'JetBrainsMono', weight: '400' as const },**

&#x20;   **},**

&#x20; **},**

&#x20; **shadow: {**

&#x20;   **card:     { shadowColor: '#2D2A26', shadowOffset: { width: 0, height: 2 },  shadowOpacity: 0.06, shadowRadius: 8,  elevation: 2 },**

&#x20;   **elevated: { shadowColor: '#2D2A26', shadowOffset: { width: 0, height: 4 },  shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },**

&#x20;   **nav:      { shadowColor: '#2D2A26', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8 },**

&#x20; **},**

&#x20; **duration: { fast: 150, normal: 250, slow: 350 },**

&#x20; **touchMin: 44,**

&#x20; **touchMinSenior: 56,**

**};**

**6. EJEMPLOS VISUALES EN CONTEXTO**

**6.1 Pantalla Home — Coordinador (Happy Path) (§18.05, §18.23)**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────────┐**

**│ 20px                                     │ ← margen horizontal**

**│ ┌──────────────────────────────────────┐ │**

**│ │ Hola, Mariana                        │ │ ← Display (Fraunces)**

**│ │ Martes 12 de junio · 08:42           │ │ ← bodyS, text-secondary**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 1: Briefing (§18.06)**

**│ │ 🧠 Briefing diario                   │ │   Card destacada**

**│ │ Hoy tenés 3 tareas, 1 evento y       │ │   (borde izq prim-500)**

**│ │ el presupuesto está al 88%           │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 1: Atención Requerida**

**│ │ ⚠️ Atención requerida                │ │   Card alerta (condicional)**

**│ │ Presupuesto de Compras al 92%        │ │   bg: alert-100**

**│ │ \[Ver Finanzas →]                     │ │   borde izq alert-500**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 2: Carga Familiar**

**│ │ ⚖️ Carga Familiar: 70/30            │ │   Solo Coordinador (§2.4)**

**│ │ Mateo 3 días seguidos al día 💜      │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 2: Tareas (agrupadas)**

**│ │ 📋 Mis pendientes (2)                │ │   Por Responsabilidad (§18.14)**

**│ │                                      │ │**

**│ │ ┌──────────────────────────────────┐ │ │**

**│ │ │ Compras                          │ │ │**

**│ │ │ ☐ Comprar leche y pan   \[✓]     │ │ │ ← Checkbox 1-tap**

**│ │ │ ☐ Pagar servicios       \[ ]     │ │ │**

**│ │ └──────────────────────────────────┘ │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 3: Próximos Eventos**

**│ │ 📅 Sábado: Asado familiar           │ │**

**│ │    14:00 · Participan 5 personas    │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 3: Presence Resumido**

**│ │ 🏠 En casa: Mateo, Lucía            │ │**

**│ │ 🚗 En tránsito: José                │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ─────────────────────────────────────── │ ← Bottom Nav (§24.04)**

**│ 🏠Home  👥People  ➕  📋Planner  ⋯More │**

**│ ─────────────────────────────────────── │**

**└──────────────────────────────────────────┘**

**6.2 Pantalla Home — Adulto Mayor (§4.3, §18.23)**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────────┐**

**│ 24px                                     │ ← margen aumentado**

**│ ┌──────────────────────────────────────┐ │**

**│ │ Buen día, Don José                   │ │ ← Display 44px**

**│ │ Martes 12 de junio                   │ │ ← bodyS 16px**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 1: Lo urgente hoy**

**│ │ 💊 Medicación: 09:00                 │ │   Card destacada senior**

**│ │ Enalapril 10mg                       │ │   border-left: 4px prim-500**

**│ │ \[Ya la tomé]  → botón 56px altura    │ │   Touch target 56px**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 2: Contacto emergencia**

**│ │ 📞 Contacto de emergencia            │ │**

**│ │ Mariana (hija)                  \[📞] │ │ ← 1-tap para llamar**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← CAPA 3: Eventos**

**│ │ 📅 Miércoles: Control médico         │ │**

**│ │    10:30 · Clínica Familiar         │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ─────────────────────────────────────── │ ← Bottom Nav**

**│ 🏠Home  👥People  ➕  📋Planner  ⋯More │   Íconos + texto**

**│ ─────────────────────────────────────── │   siempre visible (§4.3)**

**└──────────────────────────────────────────┘**

**Escala tipográfica: +25-35% (§4.3)**

**Touch targets: ≥56px**

**Contraste: AA+ forzado (§7.4)**

**Sin gestos: solo tap (§4.3)**

**6.3 Jerarquía visual aplicada (§2.1)**

**\*.txt**

**Plaintext**

**Elemento que más destaca → Briefing (card destacada, prim-500)**

&#x20;                          **Solo 1 por pantalla.**

**Segundo nivel → Atención Requerida + Carga Familiar**

&#x20;               **Funcional, condicional, sin competir con Briefing.**

**Tercer nivel → Listas de tareas, eventos, presence**

&#x20;              **Scroll vertical si excede pantalla.**

**Cuarto nivel → Bottom Nav**

&#x20;              **Siempre presente, discreto, funcional.**

**COLORES EN PANTALLA SIMULTÁNEOS: máximo 3**

**1. Arcilla (primario) — botones, chips activos, borde de cards destacadas**

**2. Salvia (secundario) — indicadores de éxito, checkboxes completados**

**3. Miel (acento) — UN solo elemento de reconocimiento/celebración**

**6.4 People — Pantalla Feed (§24.07)**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────────┐**

**│ 👥 People                               │ ← H1**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← Tab Bar**

**│ │ \[Feed]    Presence    Personas       │ │**

**│ │ ──────                               │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← Post (Feed)**

**│ │ \[Avatar] Mariana                     │ │**

**│ │ Hace 2 horas                        │ │ ← caption, text-tertiary**

**│ │                                      │ │**

**│ │ ¡Meta completada! 🎯                 │ │**

**│ │ Ahorro para vacaciones: \\$45.000     │ │**

**│ │                                      │ │**

**│ │ ❤️ 3    💬 2                         │ │ ← Reacciones**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ─────────────────────────────────────── │**

**│ 🏠Home  👥People  ➕  📋Planner  ⋯More │**

**│ ─────────────────────────────────────── │**

**└──────────────────────────────────────────┘**

**6.5 More — Pantalla principal (§24.12)**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────────┐**

**│ ⋯ Herramientas                          │ ← H1**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │ ← Card de módulo**

**│ │ 💰  Finance                         │ │**

**│ │     Presupuesto al 88% · 2 gastos   │ │ ← Línea de contexto (caption)**

**│ │     pendientes                       │ │**

**│ │                              \[→]    │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │**

**│ │ 📦  Inventory                       │ │**

**│ │     3 productos bajo stock mínimo   │ │**

**│ │                              \[→]    │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │**

**│ │ ☁️  HomeCloud                     │ │**

**│ │     Último álbum: Vacaciones 2027   │ │**

**│ │                              \[→]    │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ┌──────────────────────────────────────┐ │**

**│ │ ⚙️  Settings                        │ │**

**│ │     Hogar · Cuenta · Notificaciones │ │**

**│ │                              \[→]    │ │**

**│ └──────────────────────────────────────┘ │**

**│                                          │**

**│ ─────────────────────────────────────── │**

**│ 🏠Home  👥People  ➕  📋Planner  ⋯More │**

**│ ─────────────────────────────────────── │**

**└──────────────────────────────────────────┘**

**More no contiene dashboards. Solo accesos a dominios + indicadores**

**rápidos opcionales (§3.6, §24.12).**

**6.6 Lo que NUNCA aparece en HomePlus**

**\*.txt**

**Plaintext**

**❌ Rojo agresivo como indicador de "deuda" o "atraso"**

**❌ Badges con números acumulativos de pendientes (culpa)**

**❌ Rankings o leaderboards entre miembros de la familia (§02.03)**

**❌ Notificaciones tipo "Fulanito ya hizo X, ¿y vos?" (§UX-13)**

**❌ Animaciones de "urgencia" (shake, parpadeo) — excepto SOS**

**❌ Gráficos de productividad individual comparativa**

**❌ Modo "productividad" o "eficiencia"**

**❌ Más de 3 colores principales en una misma pantalla**

**❌ Badge rojo (error) en Bottom Nav (§UX-07)**

**❌ Modales para formularios o navegación (§3.2)**

**❌ Tooltips, carruseles de features, videos de onboarding (§6.2)**

**❌ Sonidos propios de la app (§5.4)**

**7. IMPLEMENTACIÓN RECOMENDADA**

**7.1 Estructura de archivos**

**\*.txt**

**Plaintext**

**src/**

**├── design-system/**

**│   ├── tokens/**

**│   │   ├── colors.ts**

**│   │   ├── spacing.ts**

**│   │   ├── typography.ts**

**│   │   ├── shadows.ts**

**│   │   └── index.ts          // exporta todos los tokens**

**│   │**

**│   ├── theme/**

**│   │   ├── ThemeProvider.tsx  // contexto de tema (light/dark × normal/senior)**

**│   │   ├── useTheme.ts       // hook para acceder al tema**

**│   │   └── themes.ts         // combinaciones light/dark × normal/senior**

**│   │**

**│   └── components/**

**│       ├── Button/**

**│       │   ├── Button.tsx**

**│       │   ├── Button.styles.ts**

**│       │   └── index.ts**

**│       ├── FAB/**

**│       ├── Card/**

**│       ├── Input/**

**│       ├── Chip/**

**│       ├── Badge/**

**│       ├── Checkbox/**

**│       ├── Avatar/**

**│       ├── BottomNav/**

**│       ├── QuickActions/**

**│       ├── SOSPanel/**

**│       ├── BottomSheet/**

**│       ├── Modal/**

**│       ├── ListItem/**

**│       ├── Toast/**

**│       ├── ProgressBar/**

**│       ├── EmptyState/**

**│       ├── Skeleton/**

**│       ├── TabBar/**

**│       └── MultiHomeSelector/**

**│**

**└── app/**

&#x20;   **└── (tabs)/**

&#x20;       **├── \_layout.tsx        // Bottom Nav: Home | People | + | Planner | More**

&#x20;       **├── home.tsx           // §18**

&#x20;       **├── people/**

&#x20;       **│   ├── \_layout.tsx    // Tab Bar: Feed | Presence | Personas**

&#x20;       **│   ├── feed.tsx       // §12**

&#x20;       **│   ├── presence.tsx   // §08**

&#x20;       **│   └── personas.tsx   // §05**

&#x20;       **├── planner/**

&#x20;       **│   ├── \_layout.tsx    // Tab Bar: Tasks | Calendar | Goals**

&#x20;       **│   ├── tasks.tsx      // §06.02-§06.16**

&#x20;       **│   ├── calendar.tsx   // §06.21-§06.24**

&#x20;       **│   └── goals.tsx      // §06.25-§06.33**

&#x20;       **└── more/**

&#x20;           **├── index.tsx      // Cards de acceso a dominios (§24.12)**

&#x20;           **├── finance.tsx    // §07**

&#x20;           **├── inventory.tsx  // §09**

&#x20;           **├── Homecloud.tsx// §11**

&#x20;           **└── settings.tsx   // §24.15**

**7.2 Ejemplo de componente: Button**

**\*.ts**

**TypeScript**

**// Button.tsx**

**import { tokens } from '@/design-system/tokens';**

**import { useTheme } from '@/design-system/theme/useTheme';**

**type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';**

**type ButtonSize = 'sm' | 'md' | 'lg';**

**interface ButtonProps {**

&#x20; **variant?: ButtonVariant;**

&#x20; **size?: ButtonSize;**

&#x20; **loading?: boolean;**

&#x20; **disabled?: boolean;**

&#x20; **onPress: () => void;**

&#x20; **accessibilityLabel: string;  // Obligatorio (§7.5)**

&#x20; **children: React.ReactNode;**

**}**

**// Button.styles.ts**

**export const getButtonStyles = (**

&#x20; **variant: ButtonVariant,**

&#x20; **size: ButtonSize,**

&#x20; **mode: 'normal' | 'senior'  // PUX-03: todo componente acepta mode**

**) => {**

&#x20; **const heightMap = {**

&#x20;   **sm: mode === 'senior' ? 44 : 36,**

&#x20;   **md: mode === 'senior' ? 56 : 44,**

&#x20;   **lg: mode === 'senior' ? 64 : 52,**

&#x20; **};**

&#x20; **const touchTargetMap = {**

&#x20;   **sm: mode === 'senior' ? 56 : 44,**

&#x20;   **md: mode === 'senior' ? 56 : 44,**

&#x20;   **lg: mode === 'senior' ? 64 : 52,**

&#x20; **};**

&#x20; **// ... color maps, font maps, etc.**

&#x20; **return { height: heightMap\[size], minTouchTarget: touchTargetMap\[size] };**

**};**

**7.3 Dependencias**

**\*.json**

**JSON**

**{**

&#x20; **"dependencies": {**

&#x20;   **"expo-font": "\~latest",**

&#x20;   **"@expo-google-fonts/inter": "\~latest",**

&#x20;   **"@expo-google-fonts/fraunces": "\~latest",**

&#x20;   **"@expo-google-fonts/jetbrains-mono": "\~latest",**

&#x20;   **"react-native-reanimated": "\~latest"**

&#x20; **}**

**}**

**7.4 ThemeProvider — Modos**

**\*.ts**

**TypeScript**

**// themes.ts**

**// 4 combinaciones: light/dark × normal/senior (§7.2, §7.4)**

**export type ThemeMode = 'normal' | 'senior';  // PUX-03**

**export type ColorScheme = 'light' | 'dark';**

**export const getTheme = (colorScheme: ColorScheme, mode: ThemeMode) => {**

&#x20; **const base = colorScheme === 'dark' ? darkTokens : lightTokens;**

&#x20; **const overrides = mode === 'senior' ? seniorOverrides : {};**

&#x20; **return { ...base, ...overrides };**

**};**

**8. LISTA DE VERIFICACIÓN DE IMPLEMENTACIÓN**

**8.1 Setup inicial**

&#x20;**Cargar fuentes Fraunces, Inter, JetBrains Mono en Expo**

&#x20;**Crear archivo de tokens centralizado (design-system/tokens/)**

&#x20;**Implementar ThemeProvider con 4 combinaciones (light/dark × normal/senior)**

&#x20;**Verificar que prefers-reduced-motion se respeta a nivel de SO (§5.2, §7.1)**

**8.2 Componentes core**

&#x20;**Button (5 variantes × 3 tamaños × 4 estados + loading + háptico)**

&#x20;**FAB (posición fija esquina inferior derecha, visible según dominio)**

&#x20;**Checkbox (24px, touch target 44px, animación de completado, háptico 'light')**

&#x20;**Card (estándar, destacada, alerta, módulo)**

&#x20;**Input (3 tamaños × 4 estados, label arriba, accessibilityLabel)**

&#x20;**Chip (default + outline × selected/unselected)**

&#x20;**Badge (success/alert/error/info/neutral, siempre texto + color)**

&#x20;**Avatar (con/sin foto, presencia, grupo, 5 tamaños)**

&#x20;**BottomNav (5 tabs: Home | People | + | Planner | More — CONGELADA)**

&#x20;**QuickActions (panel flotante, Geni fijo + acciones dinámicas)**

&#x20;**SOSPanel (🔴🟠🟡 niveles, swipe ↑ global, háptico 'heavy' exclusivo)**

&#x20;**BottomSheet (4 alturas, drag handle, sticky footer)**

&#x20;**Modal (solo confirmaciones, scale + fade, max-width 320px)**

&#x20;**ListItem (leading + title + subtitle + trailing, con/sin checkbox)**

&#x20;**Toast (top, 4 variantes, máximo 1 simultáneo, "Deshacer" 5s)**

&#x20;**ProgressBar (3 colores contextuales, nunca "deuda visual")**

&#x20;**EmptyState (ilustración + título + descripción + acción sugerida)**

&#x20;**Skeleton (pulse animation, fade-out al cargar datos)**

&#x20;**TabBar (para sub-secciones internas de dominio)**

&#x20;**MultiHomeSelector (header, visible solo si 2+ hogares)**

**8.3 Validaciones de accesibilidad**

&#x20;**Test de contraste AA+ en todas las combinaciones light/dark (WCAG 2.2)**

&#x20;**Modo Adulto Mayor: contraste AA+ forzado (§7.4)**

&#x20;**Touch targets ≥44px (default), ≥56px (senior) (§7.1)**

&#x20;**accessibilityLabel en todos los componentes interactivos (§7.5)**

&#x20;**accessibilityRole en cards, botones, list items**

&#x20;**Íconos decorativos con aria-hidden**

&#x20;**prefers-reduced-motion: transiciones instantáneas (§5.2, §7.1)**

&#x20;**Test con tamaño de fuente del sistema aumentado (200% zoom)**

&#x20;**Test con VoiceOver / TalkBack activado**

**8.4 Validaciones de UX**

&#x20;**Bottom Nav congelada: \[Home] \[People] \[+] \[Planner] \[More] (§24.04)**

&#x20;**Badge en nav solo success/alert, nunca error (§UX-07)**

&#x20;**Toast en zona superior, no inferior (§UX-17)**

&#x20;**Acción principal de Tasks: checkbox 1-tap, sin abrir detalle (§1.1)**

&#x20;**Pull-to-refresh funciona en listas, no en modo Adulto Mayor (§4.3, UX-20)**

&#x20;**Sin animaciones de urgencia ni badges de culpa acumulada**

&#x20;**Sin sonidos propios (§5.4)**

&#x20;**Home sigue orden oficial de bloques (§18.05)**

&#x20;**Test específico del modo Adulto Mayor con usuarios 60+**

**8.5 No implementar**

&#x20;**❌ Tab "Care"/"Cuidados" (dominio inexistente en Final Spec V1)**

&#x20;**❌ Tab "Gastos" o "Perfil" en Bottom Nav**

&#x20;**❌ Rankings, leaderboards, gamificación corporativa comparativa**

&#x20;**❌ Modales para formularios o navegación entre niveles**

&#x20;**❌ Gráficos de productividad individual**

&#x20;**❌ Notificaciones tipo "Fulanito ya hizo X"**

&#x20;**❌ Sonidos custom de la app**

**\*.txt**

**Plaintext**

**---**

**## Rationale**

**- \*\*Bottom Nav congelada restaurada\*\*: La estructura `\[Home] \[People] \[+] \[Planner] \[More]` es canónica según §24.04 y §25. Cualquier desviación del borrador original (que inventaba "Care", "Gastos" y "Perfil") contradice el documento maestro y debe eliminarse.**

**- \*\*Dominios inventados eliminados\*\*: "Care/Cuidados" no existe en la Final Spec V1 (§03.02). Los dominios oficiales son People, Planner, Finance, Presence, Inventory, Assets, HomeCloud, SOS, Geni, y Automatizaciones. El Design System no debe crear nuevos.**

**- \*\*Componentes faltantes agregados\*\*: QuickActions (§24.09), SOSPanel (§24.11), FAB (§1.1), Checkbox de tarea (§1.1), EmptyState (§6.2), Skeleton (§5.2) y TabBar (§24.16) son componentes obligatorios para cumplir la UX Philosophy y la Final Spec.**

**- \*\*Modo Adulto Mayor reforzado\*\*: Se alinearon los valores de contraste AA+ con §7.4 (`text-primary: #1A1714`), se agregó `prefers-reduced-motion` explícito, y se subió el touch target mínimo a 56px en todos los componentes.**

**- \*\*Ejemplos visuales corregidos\*\*: La pantalla Home ahora sigue el orden oficial de bloques (§18.05), la pantalla People muestra su TabBar interna real (§24.07), y More muestra cards de módulo (no dashboard) según §24.12.**



