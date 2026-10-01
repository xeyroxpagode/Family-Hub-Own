# S2.5 — GPS / Presence gap para Sprint 3

## Estado actual

Existe un flujo de Presence separado de Familia:

- Frontend: `screens/presence/PresenceScreen.tsx` y `services/presence.ts`.
- Lectura: `GET /api/presence/locations`.
- Escritura propia: `PUT /api/presence/location`.
- Backend: `backend/src/routes/presence.js`, `controllers/presence.locations.controller.js` y `services/presence.locations.service.js`.

La pestaña `Familia > Mapa` creada para Sprint 2 no consume ese flujo; por eso muestra un estado vacío fijo aun cuando Presence pueda tener integrantes. No debe simular ubicaciones.

## Datos esperados

`GET /api/presence/locations` resuelve el Household activo mediante `getPlannerContext` y devuelve:

- `household_id`;
- `stale_after_minutes` (actualmente 10);
- `members[]`: `person_id`, `membership_id`, `display_name`, rol, `sharing_enabled`, `status` y, si aplica, `location` con latitud, longitud, precisión y fecha.

El servicio lee integrantes activos de `household_people_public` y ubicaciones de `presence_member_locations`, ambas filtradas por `context.householdId`.

## Posibles causas a validar en Sprint 3

1. Household: `PresenceScreen` sólo consulta si existen token y `currentHousehold.id`; validar que el cambio de Household descarte el canal y vuelva a cargar el nuevo hogar.
2. Permisos: sólo se solicita permiso foreground. Servicios de ubicación apagados o permiso denegado impiden el envío.
3. Datos: `sharing_enabled` debe ser verdadero y coordenadas válidas; un registro de más de 10 minutos se informa como `stale`.
4. Backend/RLS: confirmar que `presence_member_locations` exista, que el upsert por `membership_id` esté permitido y que la lectura devuelva filas del Household activo.
5. UI: Familia no integra `PresenceScreen` ni el servicio de Presence. Mapa y Lugares no tienen aún una entidad ni CRUD de lugares.

## Alcance recomendado para Sprint 3

- Instrumentar la respuesta de Presence por Household sin registrar coordenadas en logs.
- Integrar la pestaña Mapa con el estado real de Presence (loading, permission, empty, error y miembros).
- Definir y migrar una entidad de lugares sólo si se aprueba explícitamente; no reutilizar ubicaciones de miembros como lugares.
- Mantener la ubicación como opt-in y no inventar datos de ejemplo.
