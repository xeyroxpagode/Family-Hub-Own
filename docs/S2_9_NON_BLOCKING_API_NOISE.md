# S2.9 — Ruido de API no bloqueante

## `GET /api/feature-flags` → 503

El frontend captura el fallo en `fetchFeatureFlagProjection`, instala una proyección vacía y continúa en modo deny-safe. No convierte el 503 en un error visible de Home ni invalida Planner/horarios.

La causa operativa del 503 es que el backend requiere el store `feature_flag_overrides` y credenciales administrativas para evaluar overrides. Si el store o `SUPABASE_SERVICE_ROLE_KEY` no está disponible, responde `feature_flag_projection_failed`.

Deuda: provisionar el store y la credencial en el entorno o definir explícitamente una proyección local para desarrollo. No se cambia en S2.9 porque el fallback ya es seguro y no bloquea Home.

## `POST /api/telemetry/event` → 404

Los emisores de Planner/Home envían eventos de forma best-effort y capturan el rechazo; la app no espera esa respuesta para crear tareas, cargar Home ni completar acciones. El backend actual no registra esa ruta, por eso el 404 sólo produce ruido de red/consola.

Deuda: registrar un colector compatible o desactivar el transporte HTTP mediante configuración cuando no exista colector. No se agrega un endpoint ficticio ni se mezcla telemetría con la lógica funcional en este sprint.
