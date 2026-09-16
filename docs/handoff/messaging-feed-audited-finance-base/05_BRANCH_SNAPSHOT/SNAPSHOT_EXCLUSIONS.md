# SNAPSHOT EXCLUSIONS

Archivos presentes en el working tree pero **excluidos** del snapshot commit.

| Archivo | Tipo | Razón de exclusión |
|---|---|---|
| `backup-before-presence.sql` | database dump (~1.07 MB) | Database dump con potenciales datos reales. Prohibido subir dumps/backups con datos sensibles. No se inspeccionó su contenido a fondo para no exponer datos; se excluye por su naturaleza de "backup SQL". |
| `01_GENI-A_RX6700XT_GUIA_PASO_A_PASO_V1.1.md` | doc local externo | Guía de configuración de nodo AI (AMD RX 6700 XT). No forma parte del código base HOMePLUS ni de Finance/Mensajes/Feed. Basura/documentación local de hardware. |
| `02_GENI-B_RTX2060SUPER_GUIA_PASO_A_PASO_V1.1.md` | doc local externo | Guía de configuración de nodo AI (RTX 2060 SUPER). Idem. |
| `03_GENI-C_RTX3050_GUIA_PASO_A_PASO_V1.1.md` | doc local externo | Guía de configuración de nodo AI (RTX 3050). Idem. |

## Categorías excluidas por política (no presentes o ya ignoradas)

- `.env`, `.env.*` → ignorados por `.gitignore` (`.env`, `.env.local`, etc.).
- credentials, tokens, private keys → no detectados.
- `node_modules` → ignorado por `.gitignore` (`/node_modules/`).
- build outputs / caches → no detectados en el working tree (compilados ignorados).
- IDE files (`.idea/`) → ignorado por `.gitignore`.
- database dumps / backups SQL con datos reales → `backup-before-presence.sql` excluido (ver arriba).

## Política aplicada

- Los archivos excluidos **no** fueron stageados.
- Ningún archivo dudoso fue incluido ciegamente.
- Los originales en disco no fueron modificados ni eliminados.