# Planner V1 — Runtime Recovery Report

## Estado

- Resultado: `PASSED`
- Rama auditada: `v1`
- HEAD auditado: `ba2392b7c6e271a3046bf8f8c73ff2892f24d9e3`
- Primer commit defectuoso: `190e7a9e70a19dde8046f7a7d3f0edd4b84d8e11` (`feat(planner): implement V1 M7 household transition and search entry`)
- M10: no iniciado durante esta recuperación.
- Commit/push de la recuperación: no realizados.

## Síntoma y reproducción

La aplicación no llegaba a montar en Expo/React Native. Android mostraba Red Screen durante la evaluación del bundle:

```text
Invalid hook call. Hooks can only be called inside of the body of a function component.
[runtime not ready]: TypeError: Cannot read property 'useRef' of null
```

El stack visible contenía offsets de bundle y frames de `loadModuleImplementation`, `guardedLoadModule`, `metroRequire` y `global`. La reproducción se hizo en el dev client Android instalado en `emulator-5554` (API 36), primero contra el bundle vigente y después con Metro iniciado con caché vacía mediante Expo CLI (`expo start -c --offline --port 8083`). Ambos caminos reprodujeron el mismo fallo antes de `Running "main"`.

Se generó un bundle Android no minificado y su source map. La simbolicación del stack produjo esta cadena de evaluación:

```text
index.ts:3
App.tsx:8
navigation/AppNavigator.tsx:15
navigation/HomeTabNavigator.tsx:16
screens/planner/PlannerScreen.tsx:101
```

El frame `anonymous@254139:52` resolvió exactamente a `PlannerScreen.tsx:101:40` en el commit defectuoso.

## Commit, archivo y causa raíz

- Archivo: `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- Línea original: `101`
- Introducción: commit `190e7a9` (M7)

M7 agregó lo siguiente en scope de módulo:

```tsx
const currentContextIdentityRef = useRef<PlannerContextIdentity | null>(null);
```

`HomeTabNavigator` importa `PlannerScreen` durante la carga de `App`, por lo que `useRef` se ejecutaba al evaluar el módulo, fuera del render de un componente o custom hook. En ese momento el dispatcher interno de React era `null`; React emitía `Invalid hook call` y el acceso terminaba como `Cannot read property 'useRef' of null`.

`git blame` asignó la línea a `190e7a9`. El archivo del parent de ese commit no contiene `currentContextIdentityRef`, mientras que el diff de M7 lo agrega en la línea defectuosa. No fue necesario alterar `v1`, crear un worktree ni ejecutar un bisect destructivo.

## Hipótesis auditadas

1. **Hook en module scope:** confirmada. `useRef` en `PlannerScreen.tsx:101` era la causa.
2. **Hook desde función normal, singleton, service, adapter o lifecycle handler:** descartada para el resto del árbol. Rules of Hooks reportó un único error, el top-level de `PlannerScreen`. `registerLifecycleHandlers`, registries, preferences, capabilities, transition coordinator y singletons no ejecutan hooks.
3. **Hook condicional:** descartada por el análisis AST de `react-hooks/rules-of-hooks`; no hubo otras violaciones.
4. **Import circular:** descartada como causa. `import/no-cycle` pasó para `App`, navegación, Home, Planner y servicios Planner. Además, el source map muestra una cadena lineal de imports hasta el hook top-level.
5. **React duplicado:** descartada. `npm ls react react-native` resolvió una sola raíz de React `19.1.0`, deduplicada. El source map Android contiene una única raíz `front/mi-front-limpio/node_modules/react`.
6. **Mismatch Expo/React Native/React:** descartado como causa del crash. La combinación instalada es Expo `54.0.35`, React Native `0.81.5` y React `19.1.0`. Expo Doctor pasó 17/18 checks y sólo recomendó el parche Expo `~54.0.36`; React y React Native coinciden con SDK 54. Ese patch pendiente no explica un frame simbolicado a código HomePlus que viola Rules of Hooks.
7. **Import incorrecto de React:** descartado. No existen imports de `react/*`, casing alternativo ni rutas privadas; los hooks vienen de `react`.
8. **Código compilado antiguo en Metro:** descartado. Metro se inició con caché vacía y reprodujo el mismo stack; el bundle y source map generados contenían la línea actual de `PlannerScreen.tsx` y resolvieron el frame a ella.

No se reinstalaron dependencias, no se agregó otra copia de React y no se usaron overrides.

## Por qué TypeScript y los tests anteriores no lo detectaron

TypeScript valida tipos, no el estado del dispatcher de React durante la evaluación de un módulo. `useRef<PlannerContextIdentity | null>(null)` es una llamada bien tipada aunque esté en un lugar inválido para React.

El lint oficial se ejecutaba sin convertir `react-hooks/rules-of-hooks` en gate efectivo para esta línea, y los tests M1–M9 cargaban contratos o módulos aislados; no evaluaban `index.ts -> App -> navigation -> PlannerScreen` con React real ni renderizaban el árbol de providers. Por eso todos podían pasar aunque la app no montara.

## Corrección mínima

El ref se movió al cuerpo de `PlannerScreen`, quedando aislado por instancia y dentro de una ejecución válida de render. Los helpers top-level que cerraban sobre el ref se eliminaron; las comparaciones de late-response ahora leen el mismo ref local directamente mediante `isPlannerContextCurrent`.

La corrección no cambia contratos, navegación, household isolation, Summary, one-tap, capabilities, preferences, lifecycle registries ni módulos M9. No se ocultó el error y no se creó estado global alternativo.

## Runtime ejecutado

- Plataforma: Android, `emulator-5554`, API 36.
- Runtime: dev client `com.anonymous.homeplus`, React Native new architecture/Fabric.
- Metro: Expo CLI con caché limpia, modo offline, puerto 8083.
- Backend local: `/health` 200 en puerto 3001.
- Supabase local Auth: `/auth/v1/health` 200 en puerto 54321.
- Fixture: usuario/hogar local transitorio creado sólo para navegación autenticada y eliminado al finalizar.

Validación observada:

- Bundle Android: compiló 1551 módulos.
- App: montó y ejecutó `Running "main"`.
- Splash y Login: abrieron correctamente.
- Login: sesión creada; `/api/auth/me` devolvió `navigation.next=home`.
- Restore session: pasó tanto en reload como en cold start.
- Home: abrió.
- Home Summary: `planner_home_summary_loaded`, `result=success`.
- Planner/Tareas: abrió y mostró estado vacío válido.
- Calendario: abrió y mostró estado vacío válido.
- Metas: abrió y mostró estado vacío válido.
- Quick Actions: abrió y mostró Crear tarea, Crear evento y Crear meta.
- Reload: volvió a montar y restauró Home.
- Cierre/reapertura: cold start volvió a montar, restauró sesión y cargó Summary.
- Red Screen: ausente después del fix.
- `Invalid hook call`: ausente después del fix.

## Smoke gate

Se agregó el comando oficial:

```text
npm run test:runtime-smoke
```

El gate es hermético y no depende de red, emulador ni servicios locales. Hace tres comprobaciones materiales:

1. Ejecuta `react-hooks/rules-of-hooks` mediante el AST de ESLint para impedir hooks en module scope, funciones normales o ramas condicionales.
2. Transpila y evalúa el entry point real con React real y adaptadores deterministas de módulos nativos; esto recorre los imports críticos de Home y Planner y habría fallado con el `useRef` original.
3. Renderiza `App` y los providers de navegación con `react-dom/server` hasta el bootstrap de Auth.

Antes de corregir `PlannerScreen`, el gate de Rules of Hooks falló exactamente en la línea 101. Después de la corrección, el comando pasa. Se integró a `quality` porque es reproducible, estable y no realiza I/O externo.

## Regresiones

Todos los comandos solicitados finalizaron con exit 0:

- `test:planner:m1` a `test:planner:m9`
- `test:planner`
- `test:home`
- `test:frontend`
- `test:backend`
- `test:core`
- `test:runtime-smoke`
- `quality` (17 comandos, incluido runtime smoke)
- `git diff --check`

Dentro de `quality`, Frontend TypeScript pasó; Frontend ESLint pasó con 28 warnings preexistentes y 0 errores. No se introdujeron dependencias ni migraciones.

## Archivos

Creado:

- `scripts/runtime_smoke_test.js`
- `docs/implementation/planner/PLANNER_V1_RUNTIME_RECOVERY_REPORT.md`

Modificado:

- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- `package.json`
- `tests/run.js`

## Rollback

El rollback se limita a retirar el comando/gate y el reporte, y devolver `PlannerScreen.tsx` a su versión previa. Esto reintroduciría de forma inmediata el `useRef` top-level y el crash P0, por lo que sólo debe usarse para reproducir la regresión. No hay cambios de base de datos, paquetes ni configuración nativa que revertir.

## Estado final

`RUNTIME RECOVERY STATUS: PASSED`

El gate P0 queda cerrado. M10 no fue implementado ni iniciado en este trabajo.
