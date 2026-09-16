# frontend_premium_design_system_v1.md

## 0. Propósito del documento

Este documento define el **Design System definitivo para el frontend premium MVP de HomePlus**.

Su objetivo es que Antigravity/Codex pueda implementar una capa visual consistente, cálida, mobile-first y reutilizable sin inventar estilos por pantalla.

Este documento **no** define navegación final, Home final, Planner final, contratos API, base de datos, reglas backend ni flujos completos de negocio. Solo define:

- identidad visual;
- tokens;
- reglas de composición;
- componentes base;
- estados globales;
- accesibilidad;
- motion/haptics;
- reglas de calidad visual;
- límites del Design System.

Las pantallas finales de Home, Planner, Navigation Shell, Auth, Onboarding y Household deben consumir este sistema, no redefinirlo.

---

## 1. Principio central de diseño

HomePlus debe sentirse como una app familiar premium que **muestra lo importante, oculta la complejidad y responde con suavidad**.

La UI debe ayudar a coordinar un hogar sin convertirlo en una oficina, sin generar culpa y sin parecer un dashboard SaaS genérico.

Principio rector:

> Una casa no se administra como una empresa. HomePlus debe ordenar sin enfriar, informar sin acusar y acompañar sin invadir.

Traducción visual:

- calma antes que urgencia;
- jerarquía clara antes que densidad;
- calidez antes que neutralidad corporativa;
- datos accionables antes que métricas decorativas;
- feedback inmediato antes que animación ornamental;
- componentes reutilizables antes que estilos por pantalla.

---

## 2. Personalidad visual de HomePlus

### 2.1 Debe sentirse

- Cálida.
- Familiar.
- Serena.
- Premium.
- Humana.
- Clara.
- Confiable.
- Suave al tacto.
- Mobile-first.
- Latinoamericana sin caer en folklore visual obvio.

### 2.2 No debe sentirse

- Corporativa.
- Fría.
- Infantil.
- Gamer.
- Neón.
- SaaS de productividad.
- Dashboard financiero.
- App de vigilancia familiar.
- App de tareas con culpa acumulada.
- App saturada de badges, números y alertas.

### 2.3 Metáfora visual

HomePlus debe parecer una interfaz construida con:

- crema cálido como base;
- arcilla/terracota como acción;
- salvia/musgo como calma y bienestar;
- miel/ámbar como reconocimiento;
- sombras suaves como profundidad;
- glass moderado solo en superficies flotantes;
- texto oscuro cálido, no negro puro.

No debe parecer:

- una tabla de control;
- una app bancaria;
- una app de productividad laboral;
- una red social;
- un panel de alarmas.

---

## 3. Decisiones canónicas del sistema

Estas decisiones son obligatorias para toda implementación visual.

| Tema | Decisión V1 |
|---|---|
| Plataforma base | React Native / Expo mobile-first |
| Tamaño de referencia | 375×812 px |
| Estilo | Tierra-cálido, premium, sereno |
| Modo principal | Light cálido |
| Dark mode | Preparado por tokens, no prioritario para demo si retrasa |
| Senior mode | Debe ser soportado por tokens/tamaños, aunque no tenga flujo propio completo |
| Fondo global | Crema cálido, nunca blanco puro global |
| Acción primaria | Terracota |
| Éxito / calma | Salvia |
| Reconocimiento / warning suave | Miel/ámbar |
| Error | Rojo tierra suave, nunca rojo agresivo |
| Cards | Radio alto, padding generoso, sombra sutil |
| Formularios | Inputs con label arriba; placeholder nunca reemplaza label |
| Form creation/edit | Bottom sheet, no modal centrado |
| Confirmaciones destructivas | Modal centrado permitido |
| Loading | Skeleton si >300ms; spinner solo cuando corresponda |
| Feedback táctil | Visual inmediato + haptics cuando plataforma soporte |
| Animaciones | Suaves, breves, respetan reduced motion |

---

## 4. Paleta de colores

### 4.1 Principio de color

El color en HomePlus no debe competir por atención. Debe construir una atmósfera cálida y ayudar a distinguir acciones, estados y niveles de importancia.

Regla clave:

> Una pantalla normal no debe usar más de tres familias de color a la vez.

Los colores principales son:

1. Fondo crema.
2. Terracota para acción primaria.
3. Salvia o ámbar según estado/contexto.

### 4.2 Tokens principales

```ts
export const colors = {
  background: {
    base: '#FBFAF8',
    soft: '#F7F3EE',
    alt: '#F5F1EB',
    cream: '#F7EFE6',
  },

  surface: {
    card: '#FFFFFF',
    soft: '#FFFDF9',
    elevated: '#FFFFFF',
    muted: '#F5F1EB',
    glass: 'rgba(255, 255, 255, 0.72)',
    overlay: 'rgba(45, 42, 38, 0.50)',
    overlayStrong: 'rgba(45, 42, 38, 0.85)',
  },

  text: {
    primary: '#1A1714',
    secondary: '#4A4540',
    tertiary: '#6B6560',
    muted: '#8A8178',
    inverse: '#FFFFFF',
    disabled: 'rgba(26, 23, 20, 0.42)',
  },

  terracotta: {
    50: '#FAF3ED',
    100: '#F2E0D4',
    300: '#E3BAA0',
    400: '#D49B78',
    500: '#C17F59',
    600: '#A86B45',
    700: '#8F5735',
  },

  sage: {
    50: '#EEF4EF',
    100: '#D8E5DA',
    300: '#B0C8B3',
    400: '#94B097',
    500: '#7A9B7E',
    600: '#5F7F63',
    700: '#49684D',
  },

  sand: {
    50: '#FFF8EC',
    100: '#F2E6CC',
    300: '#E8D09A',
    400: '#DFBC72',
    500: '#D4A853',
    600: '#BD8F38',
  },

  warning: {
    base: '#D4944A',
    soft: '#F7EBDB',
    text: '#B57930',
    strong: '#9D6624',
  },

  danger: {
    base: '#C46B6B',
    soft: '#F5E2E2',
    text: '#A85050',
    strong: '#884040',
  },

  success: {
    base: '#6B9E7A',
    soft: '#E1EFE5',
    text: '#558563',
    strong: '#3F704D',
  },

  info: {
    base: '#7A8B9B',
    soft: '#E4E9ED',
    text: '#5F707F',
  },

  border: {
    subtle: 'rgba(56, 45, 38, 0.10)',
    default: '#E8E3DC',
    strong: '#D5CFC7',
    seniorStrong: '#B5AFA5',
  },

  shadow: {
    soft: 'rgba(36, 31, 28, 0.08)',
    default: 'rgba(36, 31, 28, 0.10)',
    floating: 'rgba(36, 31, 28, 0.14)',
  },
};
```

### 4.3 Dark mode tokens

Dark mode debe existir en tokens, aunque el MVP puede priorizar light mode.

```ts
export const darkColors = {
  background: {
    base: '#1C1A17',
    alt: '#24211E',
  },
  surface: {
    card: '#2C2925',
    elevated: '#332F2B',
    overlay: 'rgba(0, 0, 0, 0.65)',
  },
  text: {
    primary: '#F8F3EC',
    secondary: '#D6CEC4',
    tertiary: '#AFA79E',
    muted: '#8F877F',
    inverse: '#1A1714',
  },
  border: {
    default: '#3D3933',
    strong: '#4F4A43',
  },
};
```

### 4.4 Reglas de uso de color

#### Terracota

Usar para:

- acción primaria;
- botón principal;
- FAB;
- foco visual principal;
- borde izquierdo de card destacada;
- chip seleccionado si no representa un estado semántico.

No usar para:

- todos los links de una pantalla;
- todos los íconos;
- fondos grandes completos salvo pantallas especiales;
- alertas de peligro.

#### Salvia

Usar para:

- éxito;
- completado;
- sensación de calma;
- estados saludables;
- chips de categoría suaves;
- UI de bienestar/presence cuando sea mock.

No usar para:

- acción primaria general;
- estados de error;
- métricas financieras importantes.

#### Sand / Cream / Ámbar

Usar para:

- fondos cálidos;
- reconocimiento;
- warning suave;
- vencimientos no críticos;
- cards de briefing o sugerencias.

No usar para:

- warning agresivo;
- fondos que resten legibilidad;
- texto principal.

#### Danger

Usar solo para:

- error real;
- acción destructiva;
- validación bloqueante;
- cancelación crítica;
- SOS visual si se incluye como demo, con tratamiento especial.

No usar para:

- tarea atrasada común;
- badge de Bottom Nav;
- deuda/pendiente como castigo visual;
- presión social.

#### Warning

Usar para:

- vencimiento próximo;
- datos incompletos;
- estado que requiere atención sin bloqueo.

No usar con animaciones de urgencia.

#### Border

Usar border sutil para separar superficies cuando la sombra no alcance. No convertir todas las cards en cajas con borde fuerte.

#### Overlay

Usar overlay solo para:

- modal centrado;
- bottom sheet;
- bloqueo de interacción;
- focus de confirmación.

No usar overlay para navegación común ni para simular jerarquía.

---

## 5. Tipografía

### 5.1 Fuentes canónicas

| Uso | Fuente preferida | Fallback iOS | Fallback Android |
|---|---|---|---|
| Hero / display | Fraunces | Georgia | Noto Serif |
| UI / body | Inter | SF Pro Text | Roboto |
| Datos / mono | JetBrains Mono | Menlo | monospace |

Regla práctica para MVP:

- Si Fraunces o JetBrains Mono no están instaladas, no bloquear implementación.
- Usar Inter/System como fallback consistente.
- No importar fuentes pesadas si comprometen performance inicial.
- Nunca compartir archivos de fuentes en entregables externos.

### 5.2 Escala tipográfica normal

```ts
export const typography = {
  hero: {
    fontFamily: 'Fraunces',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  title1: {
    fontFamily: 'Fraunces',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  title2: {
    fontFamily: 'Inter',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  title3: {
    fontFamily: 'Inter',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  bodyLarge: {
    fontFamily: 'Inter',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400',
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodySmall: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  micro: {
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  mono: {
    fontFamily: 'JetBrains Mono',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
};
```

### 5.3 Escala tipográfica Senior

Senior mode aumenta legibilidad y reduce dependencia de gestos finos.

```ts
export const seniorTypography = {
  hero: { fontSize: 44, lineHeight: 52 },
  title1: { fontSize: 36, lineHeight: 44 },
  title2: { fontSize: 30, lineHeight: 38 },
  title3: { fontSize: 24, lineHeight: 32 },
  bodyLarge: { fontSize: 22, lineHeight: 30 },
  body: { fontSize: 18, lineHeight: 26 },
  bodySmall: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 14, lineHeight: 20 },
  micro: { fontSize: 13, lineHeight: 18 },
};
```

### 5.4 Reglas de tipografía

- Usar `hero` solo para pantallas de bienvenida, onboarding o una cabecera excepcional.
- Usar `title1` para título principal de pantalla.
- Usar `title2/title3` para secciones importantes.
- Usar `body` como texto normal.
- Usar `bodySmall` para descripciones de cards.
- Usar `caption` para metadata útil.
- Usar `micro` solo para badges, labels pequeñas y pills.
- No meter párrafos largos dentro de cards.
- No usar más de dos pesos fuertes en una misma card.
- No usar mayúsculas sostenidas salvo micro-labels muy cortas.
- No truncar títulos importantes sin alternativa visual.

### 5.5 Ejemplo de jerarquía correcta

Correcto:

```txt
Tareas
3 pendientes para hoy
```

Incorrecto:

```txt
Resumen completo de tareas familiares pendientes, vencidas, asignadas y en proceso de verificación
```

---

## 6. Spacing system

### 6.1 Tokens

El sistema usa base 4px.

```ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
};
```

### 6.2 Aplicación canónica

| Uso | Valor normal | Senior |
|---|---:|---:|
| Padding horizontal pantalla mobile | 20 | 24 |
| Padding tablet | 24 | 28 |
| Padding card default | 16 | 20 |
| Padding card premium/destacada | 20 | 24 |
| Padding card compacta | 12 | 16 |
| Gap interno card | 12 | 16 |
| Gap entre cards | 12–14 | 16 |
| Gap entre secciones | 24–32 | 32 |
| Padding bottom con tab bar | 96 mínimo | 112 mínimo |
| Padding bottom con FAB | 112 mínimo | 128 mínimo |

### 6.3 Reglas de spacing

- El contenido nunca debe tocar los bordes del dispositivo.
- Una pantalla no debe parecer una lista infinita de cards pegadas.
- Usar 24–32px para separar secciones importantes.
- Usar 12–16px para separar elementos relacionados.
- Usar 8px solo para microrelaciones dentro de un componente.
- No usar valores arbitrarios como 17, 19, 23 salvo ajuste visual justificado.
- Si una pantalla se ve saturada, aumentar espacio antes que achicar texto.

---

## 7. Radius system

### 7.1 Tokens

```ts
export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
};
```

### 7.2 Aplicación canónica

| Componente | Radius |
|---|---:|
| Cards compactas | 14–18 |
| Cards principales | 22–28 |
| Cards premium destacadas | 24–32 |
| Inputs | 16–18 |
| Botones rectangulares | 18–22 |
| Botones pill | 999 |
| Action pills | 999 |
| Avatares | 999 |
| Bottom sheet | 28–32 arriba |
| Modal centrado | 24–28 |
| Toast | 18–22 |
| Skeleton | igual al componente real |

### 7.3 Reglas de radius

- HomePlus usa esquinas suaves, no cajas duras.
- No usar radius distinto para cada pantalla.
- Cards y sheets deben sentirse parte de la misma familia.
- Elementos flotantes pueden tener radius más alto.
- Inputs no deben parecer cuadrados.
- Pills deben ser realmente pills.

---

## 8. Shadows / Elevation

### 8.1 Principio

La profundidad debe sentirse sutil y cálida. HomePlus no usa sombras dramáticas ni bordes duros para simular premium.

Regla:

> Pocas sombras, bien usadas. Mejor profundidad suave que interfaces llenas de contornos.

### 8.2 Tokens React Native

```ts
export const shadows = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  card: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  elevated: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.10,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  floating: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
};
```

### 8.3 Reglas por plataforma

#### iOS

- Usar sombra real con `shadowColor`, `shadowOpacity`, `shadowRadius`, `shadowOffset`.
- Evitar sombras múltiples por componente.
- Las sombras deben ser cálidas y suaves.

#### Android

- Usar `elevation` moderada.
- Si la sombra se ve demasiado dura, compensar con borde sutil y surface más cálida.
- Evitar elevations altas salvo sheet/quick actions.

#### Web

- Usar box-shadow equivalente.
- No depender solo de blur para jerarquía.

### 8.4 Cuándo usar sombra

Sí:

- cards importantes;
- bottom sheet;
- quick actions panel;
- toast;
- elementos flotantes;
- FAB.

No:

- cada list item;
- cada input;
- cada badge;
- cards anidadas;
- elementos dentro de una card.

---

## 9. Glass / Blur rules

### 9.1 Principio

El glass en HomePlus es un detalle premium, no el lenguaje visual completo.

Debe usarse para superficies flotantes y de navegación, no para convertir toda la app en vidrio.

### 9.2 Dónde sí usar glass

Usar `GlassSurface` en:

- AppHeader flotante o contextual;
- Bottom navigation surface;
- Quick Actions sheet/header;
- superficies flotantes sobre contenido;
- mini overlays de confirmación no crítica;
- cards premium muy especiales, máximo 1 por pantalla.

### 9.3 Dónde no usar glass

No usar glass en:

- todos los cards;
- listas densas;
- formularios largos;
- inputs;
- estados de error;
- contenido con texto largo;
- pantallas de lectura;
- áreas donde haya imágenes o fondos complejos sin overlay suficiente.

### 9.4 Token de glass

```ts
export const glass = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.55)',
    blurIntensity: 24,
  },
  warm: {
    backgroundColor: 'rgba(251, 250, 248, 0.78)',
    borderColor: 'rgba(56, 45, 38, 0.08)',
    blurIntensity: 20,
  },
  strong: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderColor: 'rgba(56, 45, 38, 0.10)',
    blurIntensity: 30,
  },
};
```

### 9.5 Fallback Android/Web

Si blur nativo no está disponible o se ve inconsistente:

- usar surface opaca/translúcida cálida;
- mantener borde sutil;
- mantener sombra floating;
- no bloquear implementación por blur;
- no usar hacks visuales costosos.

Fallback sugerido:

```ts
backgroundColor: '#FFFDF9';
borderColor: 'rgba(56, 45, 38, 0.10)';
```

### 9.6 Legibilidad

- Texto sobre glass siempre usa `text.primary` o `text.secondary`.
- Nunca poner texto muted sobre glass con fondo complejo.
- Si el contenido debajo compite, subir opacidad del glass.
- Si falla contraste, priorizar legibilidad y desactivar blur.

---

## 10. Motion rules

### 10.1 Principio

La animación debe hacer que HomePlus se sienta suave, no llamativa.

Regla:

> Motion explica cambios de estado; no decora pantallas.

### 10.2 Duraciones

```ts
export const motion = {
  tap: 90,
  fast: 160,
  normal: 240,
  sheet: 320,
  success: 420,
  max: 500,
};
```

### 10.3 Easing

```ts
export const easing = {
  standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
  enter: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
  exit: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
  softSpring: {
    damping: 18,
    stiffness: 180,
    mass: 1,
  },
};
```

### 10.4 Tap feedback

Todo elemento táctil debe responder en menos de 100ms.

Patrón:

- botón/card/action pill baja a `scale: 0.98`;
- opacity baja levemente si corresponde;
- vuelve a 1.0 al soltar;
- haptic light en acción táctil importante.

No usar:

- rebotes exagerados;
- shake salvo SOS;
- vibraciones largas;
- animaciones de presión que muevan layout.

### 10.5 Bottom sheets

- Entrada desde abajo: 280–320ms.
- Overlay fade: 160–220ms.
- Handle visible.
- El contenido no debe saltar al abrir.
- Footer sticky entra con el sheet, no después.
- Al cerrar por gesto, mantener transición suave.

### 10.6 Completar tarea

Para task checkbox:

- tap inmediato;
- checkbox fill 300ms;
- scale 0.9 → 1.0 en 200ms;
- título con tachado suave;
- texto pasa a tertiary;
- toast superior con deshacer si aplica;
- no abrir detalle para completar.

### 10.7 Tab transitions

- Transición entre tabs: 160–240ms.
- No usar slide lateral pesado si perjudica performance.
- El indicador de tab se mueve con ease suave.
- Si reduced motion está activo, transición instantánea.

### 10.8 Skeleton/content transition

- Skeleton aparece si carga >300ms.
- Contenido entra con fade 160–240ms.
- No usar spinner gigante salvo carga inicial global.
- No hacer pulse si reduced motion está activo.

### 10.9 Prohibiciones de motion

Prohibido:

- animaciones de urgencia tipo shake/parpadeo excepto SOS;
- confetti por tareas domésticas;
- animaciones largas >500ms;
- transiciones que bloqueen input;
- loaders decorativos sin progreso real;
- efectos de sonido propios;
- animaciones distintas para el mismo patrón en pantallas diferentes.

### 10.10 Reduced motion

Si el sistema operativo tiene reduced motion activo:

- duraciones pasan a 0ms o mínimo seguro;
- se eliminan pulses;
- se eliminan parallax/scale decorativos;
- se mantiene feedback visual estático;
- haptics se pueden mantener si el usuario no los desactivó.

---

## 11. Haptics rules

### 11.1 Principio

Los haptics refuerzan confianza. No deben sentirse como alarma ni como juego.

### 11.2 Uso por acción

| Acción | Haptic |
|---|---|
| Tap en botón normal | light |
| Selección de chip/segment | selection |
| Completar tarea | light |
| Abrir Quick Actions | light/selection |
| Crear con éxito | success |
| Guardar cambios | success |
| Error de validación | warning |
| Error bloqueante | error/warning |
| Acción destructiva confirmada | warning |
| SOS demo | heavy solo si se implementa y con cuidado |
| Adulto Mayor | medium para botones principales |

### 11.3 Prohibiciones

- No vibrar por cada scroll.
- No vibrar por cada item cargado.
- No vibrar por eventos de otros usuarios.
- No usar heavy fuera de SOS o confirmaciones muy críticas.
- No usar haptics para castigar errores.

### 11.4 Fallback

Si la plataforma no soporta haptics:

- mantener feedback visual;
- no simular con sonidos;
- no bloquear acción.

---

## 12. Componentes base

Todos los componentes base deben vivir bajo una carpeta `design-system` o equivalente. Ninguna pantalla debe crear estilos visuales fundamentales por su cuenta.

Estructura recomendada:

```txt
src/
  design-system/
    tokens/
      colors.ts
      spacing.ts
      typography.ts
      radius.ts
      shadows.ts
      motion.ts
      index.ts
    theme/
      ThemeProvider.tsx
      useTheme.ts
      themes.ts
    components/
      AppScreen/
      AppHeader/
      AppText/
      AppButton/
      AppCard/
      AppInput/
      GlassSurface/
      AppBottomSheet/
      AppModal/
      SegmentedControl/
      ActionPill/
      EmptyState/
      ErrorState/
      Skeleton/
      Toast/
```

---

## 13. AppScreen

### 13.1 Objetivo

Wrapper estándar para pantallas.

Responsabilidades:

- fondo global;
- safe area;
- padding horizontal;
- scroll opcional;
- keyboard avoiding si aplica;
- padding inferior suficiente para tab bar/FAB;
- compatibilidad con senior mode.

### 13.2 Props recomendadas

```ts
type AppScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  background?: 'base' | 'soft' | 'alt';
  bottomInset?: 'none' | 'tab' | 'fab' | 'sheet';
  centered?: boolean;
};
```

### 13.3 Reglas

- Toda pantalla de app debe usar `AppScreen`.
- No repetir `SafeAreaView` + padding manual en cada pantalla.
- No usar blanco puro como fondo global.
- Si hay formulario, habilitar `keyboardAvoiding`.
- Si hay listas, permitir scroll y mantener padding inferior.
- No meter lógica de datos en AppScreen.

---

## 14. AppHeader

### 14.1 Objetivo

Header reusable para título, subtítulo, avatar, back button y acción contextual.

### 14.2 Variantes

- `large`: pantallas principales.
- `compact`: pantallas internas.
- `glass`: header flotante sobre scroll.
- `withBack`: detalle o flujo modal.
- `withAvatar`: entrada a perfil.
- `withAction`: acción contextual simple.

### 14.3 Props recomendadas

```ts
type AppHeaderProps = {
  title: string;
  subtitle?: string;
  variant?: 'large' | 'compact' | 'glass';
  showBack?: boolean;
  avatar?: AvatarProps;
  action?: HeaderAction;
};
```

### 14.4 Reglas

- El título debe ser corto.
- El subtítulo debe aportar contexto real.
- No meter más de una acción primaria en el header.
- Avatar puede abrir perfil.
- Selector multi-hogar no se implementa acá en detalle; solo dejar slot si existe.
- Header no debe duplicar contenido de la primera card.

---

## 15. AppText

### 15.1 Objetivo

Evitar que cada pantalla defina tamaños, pesos y colores manualmente.

### 15.2 Variantes

```ts
type AppTextVariant =
  | 'hero'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'micro'
  | 'mono';
```

### 15.3 Tonos

```ts
type AppTextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'muted'
  | 'inverse'
  | 'danger'
  | 'warning'
  | 'success';
```

### 15.4 Reglas

- Todo texto debe usar `AppText` salvo casos técnicos justificados.
- No usar color hardcodeado en pantalla.
- No usar `micro` para contenido importante.
- No usar `hero` dentro de cards.
- Texto de error debe usar tone danger y ser claro.

---

## 16. AppButton

### 16.1 Objetivo

Botón unificado para acciones primarias, secundarias, ghost, danger, glass e ícono.

### 16.2 Variantes

- `primary`: acción principal.
- `secondary`: acción secundaria visible.
- `ghost`: acción liviana.
- `danger`: acción destructiva.
- `glass`: acción sobre superficie glass.
- `icon`: botón circular/cuadrado de ícono.

### 16.3 Estados

- default;
- pressed;
- loading;
- disabled.

### 16.4 Tamaños normal

| Size | Alto visual | Padding H | Font | Touch target |
|---|---:|---:|---|---:|
| sm | 36 | 12 | caption | 44 |
| md | 44 | 16 | body | 44 |
| lg | 52 | 20 | bodyLarge | 52 |

### 16.5 Tamaños Senior

| Size | Alto visual | Padding H | Font | Touch target |
|---|---:|---:|---|---:|
| sm | 44 | 16 | body | 56 |
| md | 56 | 20 | bodyLarge | 56 |
| lg | 64 | 24 | title3 | 64 |

### 16.6 Reglas

- Loading mantiene ancho.
- Spinner reemplaza texto si la operación supera 300ms.
- Loading mínimo 400ms para evitar flicker.
- Disabled no debe parecer error.
- Danger solo para acción destructiva real.
- Todo botón tiene feedback visual pressed.
- Todo botón importante usa haptic light.
- En Senior, botón principal usa haptic medium.
- No usar dos botones primary en el mismo bloque.

---

## 17. AppCard

### 17.1 Objetivo

Contenedor base para contenido agrupado.

### 17.2 Variantes

- `default`: card estándar.
- `elevated`: contenido importante o clickeable.
- `glass`: card especial, uso limitado.
- `quiet`: card sin sombra, con borde sutil.
- `danger`: estado destructivo o error real.
- `success`: reconocimiento/completado.
- `warning`: atención no crítica.

### 17.3 Reglas

- Cards son para contenido, no para decorar todo.
- No anidar más de 2 niveles de cards.
- No meter 4 cards dentro de una card.
- Cada card debe tener un objetivo claro.
- Máximo una acción primaria por card.
- Acciones secundarias como ghost/link text.
- Cards clickeables deben tener estado pressed.
- Si una card navega, debe mostrar affordance: chevron, copy o patrón táctil consistente.
- Metadata solo si aporta decisión.

### 17.4 Card default

- background: surface.card;
- radius: xl o 22–24;
- padding: 16–20;
- shadow: card;
- border: none o border subtle.

### 17.5 Card destacada

Para briefing, atención requerida o reconocimiento.

- border-left: terracotta 500 o semantic;
- sombra cálida;
- título corto;
- descripción accionable;
- máximo una acción.

---

## 18. AppInput

### 18.1 Objetivo

Input consistente para formularios reales y mock.

### 18.2 Variantes

- `default`;
- `large`;
- `multiline`;
- `search`.

### 18.3 Estados

- default;
- focus;
- filled;
- error;
- disabled.

### 18.4 Reglas

- Todo input tiene label arriba.
- Placeholder no reemplaza label.
- Helper text es opcional.
- Error text va debajo, en caption.
- `accessibilityLabel` obligatorio.
- Focus ring visible.
- En Senior, focus ring 3px siempre visible.
- Disabled usa surface muted y opacity moderada.
- No usar inputs sin contexto.

### 18.5 Estructura recomendada

```txt
Label
[ input ]
Helper o error
```

---

## 19. GlassSurface

### 19.1 Objetivo

Abstraer blur/glass y fallback por plataforma.

### 19.2 Props recomendadas

```ts
type GlassSurfaceProps = {
  children: React.ReactNode;
  intensity?: 'light' | 'warm' | 'strong';
  fallback?: 'solid' | 'translucent';
  radius?: keyof typeof radius;
};
```

### 19.3 Reglas

- Usar para navegación/superficies flotantes.
- No usar como card default.
- Debe funcionar sin blur.
- Debe garantizar contraste.
- Debe aceptar reduced transparency si la plataforma lo requiere.

---

## 20. AppBottomSheet

### 20.1 Objetivo

Patrón base para creación, edición, filtros, Quick Actions y detalles ligeros.

### 20.2 Usos permitidos

- crear tarea;
- editar tarea;
- crear evento;
- filtros;
- Quick Actions;
- detalle rápido;
- seleccionar responsable;
- seleccionar categoría.

### 20.3 Alturas recomendadas

| Uso | Altura |
|---|---:|
| Acción simple | contenido / 40–50% |
| Formulario simple | 50% |
| Formulario medio | 75% |
| Edición detallada | 90% |

### 20.4 Estructura

- overlay;
- handle;
- título;
- subtítulo opcional;
- contenido scrollable si hace falta;
- footer sticky opcional;
- acción secundaria + primaria en footer.

### 20.5 Reglas

- Formularios van en bottom sheet, no en modal centrado.
- Sheet debe poder cerrarse con gesto si plataforma lo soporta.
- Si hay cambios sin guardar, confirmar antes de cerrar.
- No usar sheets anidados salvo excepción extrema.
- No poner navegación profunda dentro de sheet.

---

## 21. AppModal

### 21.1 Objetivo

Confirmaciones importantes y consecuencias destructivas.

### 21.2 Usos permitidos

- eliminar/cancelar;
- rechazar solicitud;
- expulsar miembro;
- cambiar rol con impacto;
- cerrar sesión;
- descartar cambios sin guardar.

### 21.3 No usar para

- crear tarea;
- editar tarea;
- crear evento;
- filtros;
- navegación;
- tutoriales;
- feature tours.

### 21.4 Reglas

- Título claro.
- Descripción corta.
- Botón secundario para cancelar.
- Botón danger solo para acción destructiva real.
- Overlay suficiente.
- Foco accesible.
- Cerrar con back/escape debe actuar como cancelar, no confirmar.

---

## 22. SegmentedControl

### 22.1 Objetivo

Cambiar entre estados o vistas primarias dentro de un contexto.

### 22.2 Usos

- Hoy / Pendientes / Hechas.
- Tareas / Eventos si un módulo lo necesita.
- Mis cosas / Hogar.
- Filtros primarios.

### 22.3 Reglas

- Máximo 3–4 opciones visibles.
- Labels cortas.
- No usar para listas largas.
- Estado seleccionado claro.
- Debe ser accesible con screen reader.
- En Senior, altura mínima 44–56.

---

## 23. ActionPill

### 23.1 Objetivo

Acción compacta, rápida y clara.

### 23.2 Usos

- Crear tarea.
- Crear evento.
- Invitar.
- Más.
- Filtro simple.
- Acción contextual dentro de una card.

### 23.3 Reglas

- Debe ser táctil, lindo y no gigante.
- Label corto.
- Ícono opcional, no obligatorio.
- No usar más de 3–4 ActionPills juntas.
- Si hay muchas acciones, moverlas a bottom sheet.

---

## 24. EmptyState

### 24.1 Objetivo

Primera experiencia útil, no pantalla vacía.

### 24.2 Estructura

- ilustración o ícono sutil;
- título claro;
- descripción corta;
- CTA principal opcional;
- acción secundaria opcional si aporta.

### 24.3 Reglas

- El empty state debe orientar a una acción.
- No usar textos largos.
- No usar culpa.
- No usar “todavía no hiciste nada” con tono acusatorio.
- Puede enseñar el módulo sin tooltip ni carrusel.
- Debe funcionar con un solo usuario activo.

### 24.4 Ejemplos de tono

Correcto:

```txt
Acá van a aparecer tus tareas
Cuando tengas algo para hacer en casa, lo vas a ver acá.
```

Incorrecto:

```txt
No hay tareas porque nadie cargó nada todavía.
```

---

## 25. ErrorState

### 25.1 Objetivo

Mostrar fallos sin romper confianza.

### 25.2 Estructura

- título claro;
- explicación corta;
- acción de reintento;
- acción secundaria si corresponde;
- detalle técnico oculto o mínimo.

### 25.3 Reglas

- Error no debe sonar catastrófico si no lo es.
- No mostrar stack traces.
- No culpar al usuario.
- No usar rojo agresivo para errores recuperables.
- Si el usuario puede reintentar, mostrar botón.
- Si necesita iniciar sesión, guiar a login.

### 25.4 Copy base

```txt
No pudimos cargar esta información
Revisá tu conexión o intentá de nuevo.
```

---

## 26. Skeleton

### 26.1 Objetivo

Carga premium que conserva estructura.

### 26.2 Variantes

- line;
- paragraph;
- card;
- listItem;
- avatar;
- button;
- screenSection.

### 26.3 Reglas

- Skeleton aparece si carga >300ms.
- Debe parecerse al layout final.
- No usar spinner grande para listas.
- No mostrar skeleton infinito sin alternativa.
- Si hay error, reemplazar skeleton por ErrorState.
- Si reduced motion está activo, no usar pulse animado.

---

## 27. Toast

### 27.1 Objetivo

Feedback breve para acciones ya realizadas.

### 27.2 Posición

- Top preferente.
- Debe respetar safe area.
- No tapar header crítico.

### 27.3 Variantes

- success;
- warning;
- error;
- info.

### 27.4 Duración

| Contexto | Duración |
|---|---:|
| Default | 4s |
| Con deshacer | 5s |
| Senior | 8s |
| Error importante | hasta acción/reintento si corresponde |

### 27.5 Reglas

- Máximo 1 visible.
- No encadenar muchos toasts.
- Toast con deshacer para completar tarea si aplica.
- No toast para tareas completadas por otros miembros.
- Error toast usa haptic warning.
- Success toast usa haptic success.

---

## 28. Estados globales

### 28.1 Loading

- Botón loading mantiene ancho.
- Texto se reemplaza por spinner.
- Spinner si operación >300ms.
- Loading mínimo 400ms para evitar flicker.
- Pantallas con datos usan skeleton, no spinner gigante.

### 28.2 Empty

- Usar `EmptyState`.
- Debe tener acción sugerida cuando sea posible.
- Debe ayudar al primer uso.

### 28.3 Error

- Usar `ErrorState` o inline error en formularios.
- Error fuerte solo para bloqueo real.
- Validación de input abajo del campo.

### 28.4 Success

- Usar success suave.
- No sobrecelebrar tareas domésticas.
- Evitar confetti.
- Reconocer sin infantilizar.

### 28.5 Warning / Attention

- Usar warning suave.
- No usar animación de alarma.
- No usar rojo salvo peligro real.

### 28.6 Disabled

- Debe ser claramente no interactivo.
- No debe parecer error.
- Si una acción está deshabilitada por permiso, considerar helper/copy breve.

### 28.7 Pressed

- Feedback visual inmediato.
- No mover layout.
- No cambiar color semántico de forma confusa.

### 28.8 Selected

- Selected debe tener color + forma, no solo color.
- Chips selected usan terracotta o semantic según contexto.

### 28.9 Offline

Para MVP, offline real es post-MVP. Visualmente:

- se puede mostrar banner suave si backend inaccesible;
- no prometer sincronización offline si no existe;
- no bloquear navegación mock por falla de backend si el módulo es demo.

### 28.10 Permission / Forbidden

- No mostrar acciones que no corresponden si el rol no puede ejecutarlas.
- Si se muestra disabled, explicar brevemente.
- No usar lenguaje acusatorio.
- No inventar permisos finos en Design System.

---

## 29. Reglas de composición

### 29.1 Jerarquía

Cada pantalla debe tener:

1. Una intención principal.
2. Una acción primaria clara.
3. Secciones agrupadas.
4. Metadata mínima.
5. Salida hacia detalle si hay complejidad.

### 29.2 No saturar

Prohibido:

- meter todos los módulos en una sola pantalla;
- usar más de 3 colores principales simultáneos;
- usar más de 2 niveles de cards;
- llenar la pantalla de badges;
- mostrar contadores acumulativos de culpa;
- usar iconos decorativos sin propósito;
- repetir la misma acción en header, card y footer.

### 29.3 No anidar cards excesivamente

Correcto:

```txt
AppScreen
  SectionTitle
  AppCard
    Content
  AppCard
    Content
```

Incorrecto:

```txt
AppCard
  AppCard
    AppCard
      Badge + Badge + Badge + Button + Button
```

### 29.4 Badges

Reglas:

- Badge no interactivo.
- Texto corto.
- Nunca solo color.
- No usar frases largas.
- No usar rojo en Bottom Nav.
- No usar números acumulativos de pendientes para generar presión.

Correcto:

```txt
Vence hoy
Pendiente
Completada
```

Incorrecto:

```txt
Llevás 7 tareas atrasadas sin resolver
```

### 29.5 Metadata

Mostrar metadata solo si ayuda a decidir.

Sí mostrar:

- fecha de vencimiento;
- responsable;
- estado;
- prioridad si existe;
- rol si aporta permiso/contexto.

No mostrar:

- IDs técnicos;
- timestamps irrelevantes;
- demasiados campos de auditoría;
- source interno mock;
- estructura backend.

---

## 30. Accesibilidad

### 30.1 Principios

- La app debe poder usarse sin precisión motora alta.
- La información no puede depender solo del color.
- Senior mode debe agrandar tipografía y targets.
- Motion debe respetar preferencias del sistema.
- La UI no debe depender de gestos complejos.

### 30.2 Touch targets

| Modo | Mínimo |
|---|---:|
| Normal | 44×44 |
| Senior | 56×56 |
| FAB normal | 56 |
| FAB senior | 64 |
| Checkbox task normal | visual 24, target 44 |
| Checkbox task senior | visual 32, target 56 |

### 30.3 Contraste

- Texto primary debe cumplir AA sobre fondos normales.
- Texto secondary debe cumplir AA cuando sea información importante.
- Tertiary/muted solo para metadata no crítica.
- Senior debe apuntar a AA+ visual.
- No usar texto claro sobre glass débil.

### 30.4 Screen readers

Obligatorio:

- botones con `accessibilityLabel`;
- inputs con label real;
- avatares con nombre y rol si aplica;
- badges con texto accesible;
- checkbox de tarea con estado;
- modales con foco inicial;
- bottom sheets con título accesible.

### 30.5 Color no único

Todo estado debe usar al menos dos de:

- texto;
- ícono;
- color;
- forma;
- posición;
- estado explícito.

Ejemplo: badge warning debe decir “Vence hoy”, no solo ser amarillo.

### 30.6 Senior mode

Senior mode implica:

- tipografía mayor;
- targets mayores;
- mayor contraste;
- menos gesture reliance;
- no pull-to-refresh como única acción;
- botones más explícitos;
- más tiempo de toast;
- haptic medium para acciones principales;
- foco visible en inputs.

---

## 31. Performance

### 31.1 Principios

El polish visual no debe destruir fluidez.

- Preferir simple y rápido antes que glass pesado.
- Skeleton antes que spinner eterno.
- Animaciones cortas.
- No recalcular tokens por render.
- No meter gradients/blur en listas largas.

### 31.2 Reglas

- Tokens importables y estáticos.
- Componentes memoizables cuando renderizan listas.
- No crear objetos de estilo inline complejos en loops largos.
- No usar blur en cada item de lista.
- No animar 30 cards a la vez.
- No cargar fuentes pesadas si bloquean first render.
- Lazy load de módulos demo si no aparecen inicialmente.
- Imágenes mock optimizadas.
- Evitar shadow/elevation alta en listas extensas.

### 31.3 Loading thresholds

| Caso | Regla |
|---|---|
| <100ms | feedback visual inmediato, no loader |
| 100–300ms | mantener estado pressed/loading mínimo si aplica |
| >300ms | skeleton o spinner contextual |
| botón loading | mínimo 400ms si aparece |
| acciones cotidianas | optimistic visual si el backend lo permite |

### 31.4 Reduced motion / low power

Si se detecta reduced motion o baja performance:

- desactivar pulse;
- usar fade simple o instantáneo;
- reducir blur;
- preferir surfaces sólidas;
- mantener funcionalidad intacta.

---

## 32. Reglas por plataforma

### 32.1 iOS

- Glass/blur permitido si es legible.
- Haptics recomendados.
- Safe areas obligatorias.
- Sombras suaves reales.
- Gestos permitidos, pero nunca como única forma en Senior.

### 32.2 Android

- Blur puede fallar o verse distinto: usar fallback opaco/translúcido.
- Elevation moderada.
- Haptics pueden variar: no depender de ellos.
- Cuidar performance en sombras/listas.
- Usar back behavior correcto en sheets/modals.

### 32.3 Web

- Tratar como soporte secundario si existe.
- Glass con CSS puede usarse si no rompe legibilidad.
- Focus states visibles obligatorios.
- Hover puede existir, pero no debe ser requerido.

### 32.4 Tablet

- Tablet puede usar dos columnas.
- No diseñar desktop/sidebar en este documento.
- El Design System debe permitir layout responsive sin redefinir tokens.

---

## 33. Reglas de calidad visual

### 33.1 Checklist visual por pantalla

Antes de aprobar una pantalla:

- ¿Usa AppScreen?
- ¿Usa fondo crema cálido?
- ¿Tiene una jerarquía clara?
- ¿Hay una sola acción primaria principal?
- ¿No usa más de tres familias de color?
- ¿Los textos son cortos?
- ¿Las cards respiran?
- ¿No hay badges largos?
- ¿Los estados importantes usan texto, no solo color?
- ¿El loading usa skeleton si corresponde?
- ¿Los errores no culpan al usuario?
- ¿Funciona en 375×812?
- ¿Tiene padding inferior para tab bar/FAB?
- ¿Touch targets cumplen mínimo?
- ¿Reduced motion no rompe la experiencia?
- ¿El módulo mock no promete backend real?

### 33.2 Checklist de componentes

Antes de aprobar un componente:

- ¿Consume tokens?
- ¿Tiene variantes controladas?
- ¿Tiene estados default/pressed/disabled/loading/error si aplica?
- ¿Es accesible?
- ¿Respeta senior mode?
- ¿No hardcodea colores?
- ¿No mezcla lógica de negocio?
- ¿Tiene fallback de plataforma si usa blur/haptics?
- ¿Puede reutilizarse sin depender de una pantalla?

### 33.3 Checklist de premium polish

Una pantalla se siente premium si:

- tiene espacio suficiente;
- usa sombras suaves;
- el color principal aparece con intención;
- las cards son consistentes;
- los estados son claros;
- las transiciones son suaves;
- no hay ruido visual;
- los empty states orientan;
- los errores son humanos;
- los módulos demo parecen parte del sistema, no placeholders baratos.

---

## 34. Checklist para implementación Antigravity/Codex

### 34.1 Fase DS-1 — Tokens

Implementar primero:

- `colors.ts`;
- `typography.ts`;
- `spacing.ts`;
- `radius.ts`;
- `shadows.ts`;
- `motion.ts`;
- `index.ts`.

Criterios:

- sin dependencia de pantallas;
- export único;
- light theme completo;
- dark/senior preparados aunque no estén activados globalmente.

### 34.2 Fase DS-2 — Theme

Implementar:

- `ThemeProvider`;
- `useTheme`;
- `themes.ts`;
- modo normal/senior como override de typography/spacing/touch targets.

Criterios:

- una pantalla puede consumir tokens sin hardcodear;
- senior mode no requiere duplicar componentes.

### 34.3 Fase DS-3 — Componentes base mínimos

Implementar en este orden:

1. AppText.
2. AppScreen.
3. AppButton.
4. AppCard.
5. AppInput.
6. ActionPill.
7. SegmentedControl.
8. EmptyState.
9. ErrorState.
10. Skeleton.
11. Toast.
12. GlassSurface.
13. AppBottomSheet.
14. AppModal.
15. AppHeader.

Criterios:

- todos usan tokens;
- todos soportan disabled/pressed cuando aplica;
- todos tienen props simples;
- ninguno contiene lógica de negocio.

### 34.4 Fase DS-4 — Integración visual

Una vez implementados componentes:

- reemplazar estilos duplicados en pantallas existentes;
- evitar rediseñar lógica funcional;
- migrar una pantalla por vez;
- validar 375×812;
- validar Android/iOS si posible;
- validar loading/error/empty.

### 34.5 Fase DS-5 — Guardrails

Agregar reglas de revisión:

- no hardcodear colores fuera del DS;
- no crear buttons custom;
- no crear inputs custom;
- no usar modales para formularios;
- no usar rojo para tareas atrasadas;
- no meter glass en listas;
- no crear sombras arbitrarias;
- no crear nuevos tamaños tipográficos sin agregar token.

---

## 35. Límites: qué NO debe hacer el Design System

Este Design System no debe:

- definir endpoints;
- definir services;
- definir modelos de DB;
- definir RLS;
- resolver navegación final;
- resolver Home final;
- resolver Planner final;
- decidir task verification;
- decidir permisos backend;
- implementar IA real;
- implementar Finance real;
- implementar GPS/Presence real;
- implementar OCR/storage real;
- implementar offline sync;
- implementar realtime multi-dispositivo;
- inventar formularios completos si otra spec no los define;
- meter mock data global sin spec de mock data;
- forzar librerías no instaladas sin validación;
- rediseñar todo el proyecto de una vez.

Debe limitarse a dar una base visual reusable para que el resto de specs y prompts construyan encima.

---

## 36. Prohibiciones visuales definitivas

No usar en HomePlus V1:

- rojo agresivo como indicador de deuda, atraso o culpa;
- badges con números acumulativos de pendientes para presionar;
- rankings entre miembros;
- leaderboards familiares;
- notificaciones tipo “Fulanito ya hizo X, ¿y vos?”;
- animaciones de urgencia salvo SOS;
- shake/parpadeo para tareas normales;
- gráficos de productividad individual comparativa;
- modo “productividad” o “eficiencia”;
- más de 3 colores principales por pantalla;
- badge rojo en Bottom Nav;
- modales para formularios;
- tooltips/carruseles/videos de onboarding como patrón principal;
- sonidos propios de la app;
- glass en todas las cards;
- sombra fuerte en cada lista;
- textos largos en badges;
- inputs sin label;
- placeholders como labels;
- botones sin feedback;
- estilos hardcodeados por pantalla.

---

## 37. Contrato de aceptación del Design System

El Design System V1 se considera aceptado cuando:

1. Existen tokens centralizados.
2. Existe ThemeProvider/useTheme o mecanismo equivalente.
3. Las pantallas pueden usar AppScreen/AppText/AppButton/AppCard/AppInput sin estilos propios básicos.
4. Los componentes soportan estado pressed/disabled/loading/error cuando aplica.
5. Skeleton, EmptyState, ErrorState y Toast existen como patrones reutilizables.
6. GlassSurface tiene fallback Android/Web.
7. Bottom sheets y modals tienen reglas separadas.
8. Touch targets cumplen 44 normal y 56 senior.
9. Reduced motion está contemplado.
10. No hay colores críticos hardcodeados en pantallas nuevas.
11. El resultado visual se siente cálido, premium, sereno y familiar.
12. El sistema no invade specs de navegación, Home o Planner.

---

## 38. Resumen operativo para Codex

Cuando Codex implemente este documento, debe entender:

- crear primero tokens;
- después theme;
- después componentes base;
- después migrar pantallas gradualmente;
- nunca inventar colores por pantalla;
- no usar modales para formularios;
- no usar rojo para presión familiar;
- no prometer funcionalidades mock como reales;
- priorizar legibilidad, spacing y consistencia;
- respetar mobile-first 375×812;
- preparar senior mode mediante tokens;
- usar haptics y motion con fallback;
- mantener el Design System como capa visual, no como capa de negocio.

---

DESIGN SYSTEM V1 READY
