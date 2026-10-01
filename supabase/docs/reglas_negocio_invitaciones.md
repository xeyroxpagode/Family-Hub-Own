# Reglas de Negocio — Sistema de Invitaciones FamilyHub

---

**1. ¿Cuánto dura un token de invitación? ¿Desde cuándo se cuenta?**

El token tiene una vigencia de **24 horas** contadas desde el momento exacto en que el coordinador lo genera. El campo `expires_at` se calcula en la base de datos como `NOW() + INTERVAL '24 hours'` en el INSERT. El punto de partida es el servidor (UTC), no el momento en que el coordinador comparte el link ni el momento en que el invitado lo abre.

---

**2. ¿Qué pasa si el coordinador envía dos invitaciones al mismo email? ¿Se invalida la primera? ¿Coexisten?**

Coexisten. La tabla `invitations` no tiene restricción UNIQUE sobre el destinatario (ni siquiera almacena el email; solo el token y el rol asignado). Generar una nueva invitación **no invalida ni revoca las anteriores**. Ambos tokens pueden ser usados de forma independiente, sujeto a su propio `expires_at` y a que ninguno haya sido ya utilizado. Si el coordinador quiere anular la primera, debe revocarla explícitamente (ver regla 3).

---

**3. ¿Puede el coordinador revocar una invitación activa? Si sí, ¿qué ve el usuario que intenta usarla después?**

Sí. El coordinador puede hacer DELETE sobre cualquier invitación donde `used_at IS NULL` (la política RLS lo permite exclusivamente para él). Si un usuario intenta usar un token revocado, el backend no encontrará el registro y responderá:

> **"Este enlace de invitación ya no es válido. Solicitá un nuevo enlace al coordinador del hogar."**

---

**4. ¿Se puede reenviar el mismo link o se genera uno nuevo cada vez?**

El coordinador puede **reenviar el mismo link** mientras el token exista y no haya expirado (`expires_at > NOW()`) ni sido usado (`used_at IS NULL`). El frontend puede leer el token activo existente y compartirlo de nuevo sin crear uno nuevo. Si el token ya expiró o fue revocado, el coordinador debe generar uno nuevo desde la app; esto crea un INSERT con un nuevo token y un nuevo `expires_at`.

---

**5. ¿Qué pasa si alguien usa el link dos veces?**

Al usarse por primera vez, el backend (service_role) setea `used_at = NOW()` y `used_by = <user_id>`. En un segundo intento — ya sea el mismo usuario u otro distinto — el backend detecta `used_at IS NOT NULL` y rechaza la operación con el mensaje:

> **"Este enlace ya fue utilizado. Cada enlace es de uso único."**

Si dos usuarios distintos tienen el mismo link y lo intentan usar simultáneamente, la restricción UNIQUE sobre `token` junto con el UPDATE atómico del backend garantiza que solo uno tenga éxito; el otro recibe el mismo mensaje de error.

---

**6. ¿Tiene límite la cantidad de invitaciones activas simultáneas por hogar?**

No hay límite en esta versión. La decisión de producto es no restringir hogares grandes ni coordinadores que necesitan invitar a muchas personas a la vez. Si en el futuro se quiere limitar (por ej., máximo 20 invitaciones activas por hogar), se puede agregar un trigger o check en la capa de aplicación antes del INSERT. El schema lo soporta sin cambios estructurales.

---

**7. ¿Qué pasa si el usuario invitado ya tiene cuenta en FamilyHub pero en otro hogar diferente? ¿Puede estar en dos hogares?**

Sí, puede estar en dos hogares (o en N). Esta es una restricción de diseño fundamental: la tabla `household_members` tiene `UNIQUE(user_id, household_id)`, lo que impide que el mismo usuario aparezca dos veces en el mismo hogar, pero no impone ningún límite sobre cuántos hogares distintos puede integrar. Al usar el token, el backend simplemente inserta un nuevo registro en `household_members` con el `household_id` correspondiente. La identidad del usuario en `public.users` no se duplica ni se modifica; solo cambia el contexto de membresía.

---

**8. ¿Qué mensaje exacto ve el usuario ante cada tipo de error?**

| Situación | Mensaje en pantalla |
|---|---|
| Token vencido (`expires_at < NOW()`) | "El enlace de invitación expiró. Solicitá uno nuevo al coordinador del hogar." |
| Token ya usado (`used_at IS NOT NULL`) | "Este enlace ya fue utilizado. Cada enlace es de uso único." |
| Token revocado (registro eliminado) | "Este enlace de invitación ya no es válido. Solicitá un nuevo enlace al coordinador del hogar." |
| Sin conexión / timeout de red | "No pudimos verificar tu invitación. Revisá tu conexión a internet e intentá nuevamente." |
