# HomeCloud U0 — reconciliacion de cobertura del atlas

Status: **ATLAS-COV-01 RESUELTO DOCUMENTALMENTE**

Fecha: 2026-10-12

Autoridades: `01_UNIFIED_CURRENT_SCREEN_ATLAS.md` y
`08_HOMECLOUD_PREMIUM_POLISH_MASTER_LIST_REVISADA_V2.md`.

## Resultado aritmetico

- **65 superficies canonicas unicas**: 23 Files + 31 Memories + 7 Shared + 4 Office,
  segun la clasificacion fuente-verificada del atlas U0.
- **101 apariciones de cobertura**: suma de filas/referencias repetidas en la tabla de
  cobertura V2. No son 101 pantallas distintas.
- **62 targets HC-POL**: objetivos de cambio; tampoco son superficies. Un target puede
  afectar varias superficies y una superficie puede recibir varios targets.

Por lo tanto, el denominador autoritativo de superficies sigue siendo **65**, mientras
`101` se conserva como conteo de apariciones y `62` como conteo de targets. No se usa
`101/101` ni `62/65` como porcentaje de pantallas.

## Claves canonicas

Las claves evitan volver a contar el mismo owner cuando aparece como screen, estado,
control y caller:

| Rango | Modulo | Cantidad | Regla de identidad |
| --- | --- | ---: | --- |
| `U0-SH-01..07` | Shared | 7 | owner compartido/host, no cada caller |
| `U0-FI-01..23` | Files | 23 | superficie con owner/IA propia; estados y acciones del mismo host se agrupan |
| `U0-ME-01..31` | Memories | 31 | root/overlay/viewer/intake/lifecycle por owner; caller repetido no duplica |
| `U0-OF-01..04` | Office | 4 | sesion, surface, bridge y diagnostico |
| **Total** |  | **65** |  |

Duplicados legitimos de la tabla V2 incluyen Viewer referido desde Timeline/Album/Tipo,
Favorites referido como tile/dataset/caller, estados shared repetidos por modulo y el
mismo File Viewer trazado por `HC-POL-012` y `HC-POL-057`. Esas apariciones conservan
trazabilidad pero no crean otra superficie canonica.

## Trazabilidad de los 62 HC-POL

| Targets | Claves/superficies canonicas principales | Nota |
| --- | --- | --- |
| `001-003` | `U0-SH-01..07` | tabs, motion y accesibilidad transversal |
| `004` | `U0-FI-06..14`, `U0-SH-01` | acciones File/Folder en el host unico |
| `005-007` | `U0-ME-06..27`, `U0-SH-01` | menus Viewer/Create/Album/Tipo/Resurfacing/Trash/Favorites/Seleccion |
| `008-009` | `U0-ME-06..09` | portadas y controles sobre imagen |
| `010` | `U0-SH-01..02` | collision/safe-area/keyboard/fallback compartido |
| `011-024` | `U0-FI-01..23` | Files; `012` comparte identidad de Viewer con `057` |
| `025-030` | `U0-ME-01..16` | root, resurfacing, albums, tipos y timeline |
| `031-042` | `U0-ME-17..24` | Viewer y pages image/video/audio |
| `043-048` | `U0-ME-25..28` | camara e Intake/Review; fecha se lee con enmienda §6.3 del Product Truth |
| `049-051` | `U0-ME-12..16` | seleccion contextual y drag |
| `052-056` | `U0-ME-06..16`, `U0-ME-29..31` | trash, favorites, albums y fecha posguardado |
| `057-060` | `U0-FI-15..23` | File Viewer; `057` es la misma surface que `012`, no una pantalla extra |
| `061-062` | `U0-OF-01..04` | Office integrado, sin ampliar su carril funcional |

La union de los rangos de targets es exactamente `HC-POL-001..062`, sin huecos ni IDs
nuevos. Las referencias cruzadas se mantienen intencionalmente para no perder origen,
pero el conteo unico se realiza por clave `U0-*`.

## Regla de mantenimiento

Una fila nueva en cobertura debe apuntar a una clave `U0-*` existente o justificar una
nueva superficie con owner/IA propios y actualizar el total del atlas. Repetir un caller,
estado, accion o componente compartido no incrementa el total de superficies.
