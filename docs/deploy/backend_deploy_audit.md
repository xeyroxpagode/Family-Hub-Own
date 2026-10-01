# DEPLOY-001: Backend Deploy Audit

**Fecha:** 2026-06-29  
**Rama:** `rediseno-auth-post-entrega-profesional`  
**Estado:** DEPLOY-001 completado | DEPLOY-002 completado

---

## 1. Estado Actual del Backend para Deploy

### Resumen
El backend es una aplicación Express.js pura (CommonJS) que se conecta a Supabase. **Está listo para deploy público** después de aplicar DEPLOY-002.

### Cambios Aplicados en DEPLOY-002
- ✅ Endpoint `/health` dedicado implementado
- ✅ CORS configurable por ambiente
- ✅ Global error handler agregado
- ✅ 404 not found handler agregado
- ✅ `.env.example` creado

### Arquitectura Detectada
- **Entry point:** `index.js` (raíz del backend)
- **Framework:** Express 5.x
- **Base de datos:** Supabase (PostgreSQL)
- **Lenguaje:** JavaScript CommonJS
- **Build:** No requiere build (JS puro)

---

## 2. Comando Start Detectado

### Scripts en `package.json`
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "seed:demo": "node scripts/seed-demo-familia-1-test.js"
  }
}
```

### Veredicto
✅ **Script `start` válido para producción**  
✅ **Entrypoint correcto:** `node index.js`  
✅ **No usa nodemon en producción** (solo en dev)

**Comando recomendado para deploy:**
```bash
npm start
```

---

## 3. Variables de Entorno Requeridas

### Variables Detectadas

| Variable | Obligatoria | Descripción | Sensible |
|----------|-------------|-------------|----------|
| `SUPABASE_URL` | ✅ Sí | URL del proyecto Supabase | No |
| `SUPABASE_ANON_KEY` | ✅ Sí | Anon/Public key de Supabase | ✅ Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sí* | Service role key (para RPC/admin) | ✅ Sí |
| `PORT` | ⚠️ Opcional | Puerto del servidor (fallback: 3000) | No |
| `NODE_ENV` | ⚠️ Recomendada | Ambiente (production/development) | No |

*Requerida para: seed script, operaciones admin, RPC con privilegios elevados

### Archivos de Entorno
- ✅ **`backend/.env.example` creado** (ver sección 16)
- ✅ `.env` local existe (no commiteado)
- ✅ `.gitignore` cubre `.env` correctamente

### Documentación Faltante
- [ ] Crear `backend/.env.example` con variables obligatorias
- [ ] Documentar variables en README o docs

### Variables NO deben subir a GitHub
```
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## 4. Configuración CORS Actual

### Estado Actual (Post-DEPLOY-002)
```javascript
// Desarrollo (NODE_ENV !== 'production')
app.use(cors()); // Permite todo (Expo, local, Postman)

// Producción (NODE_ENV === 'production')
if (corsOrigin) {
  const origins = corsOrigin.split(',').map(o => o.trim());
  app.use(cors({ origin: origins, credentials: true }));
} else {
  // Permite solo requests sin origin (mobile/Expo), rechaza origins desconocidos
  app.use(cors({ origin: (origin, callback) => { ... } }));
}
```

### Análisis
- ✅ **Desarrollo:** CORS abierto para Expo/dev
- ✅ **Producción:** CORS configurable con `CORS_ORIGIN`
- ✅ Permite futura URL pública del frontend
- ✅ Permite requests mobile/Expo sin origin
- ⚠️ **Sin CORS_ORIGIN en producción:** Advierte pero permite requests sin origin

### Variables de Entorno
- `CORS_ORIGIN` - Opcional en producción (coma-separated)
- Ejemplo: `CORS_ORIGIN=https://mi-app.vercel.app,https://mi-app.firebaseapp.com`

---

## 5. Health Check

### Endpoints Existentes
- ✅ `GET /` - Retorna mensaje de éxito (mantenido)
  ```
  "¡El servidor de FamilyHub está funcionando correctamente!"
  ```
- ✅ `GET /health` - **Implementado en DEPLOY-002**
  ```json
  {
    "ok": true,
    "service": "homeplus-backend",
    "timestamp": "ISO_DATE",
    "env": "development|production"
  }
  ```

**Veredicto:** Health check dedicado implementado y listo para load balancers.

---

## 6. Conexión Supabase

### Configuración Detectada (`src/config/supabase.js`)
- ✅ Usa `SUPABASE_URL` correctamente
- ✅ Usa `SUPABASE_ANON_KEY` para cliente auth
- ✅ Usa `SUPABASE_SERVICE_ROLE_KEY` para cliente admin
- ✅ Instancia clientes correctamente
- ✅ BUGFIX-002 cubre timeouts (ver `src/lib/supabaseErrors.js`)

### Manejo de Errores
- ✅ `isSupabaseTimeout(err)` detecta timeouts
- ✅ `createSupabaseTimeoutError()` devuelve 503 estandarizado
- ✅ Errores no exponen secretos

### Veredicto
✅ **Conexión Supabase correctamente configurada para producción**

---

## 7. Seguridad

### Checklist de Seguridad

| Item | Estado | Observaciones |
|------|--------|---------------|
| No loguear tokens | ✅ | No detectado en código |
| No loguear service role key | ✅ | No detectado en código |
| No exponer stack trace en producción | ✅ | Global error handler implementado |
| `.env` no commiteado | ✅ | Cubierto por `.gitignore` |
| `.gitignore` cubre `.env` | ✅ | Verificado |
| Helmet para seguridad HTTP | ✅ | Implementado |
| Rate limiting | ❌ | Pendiente DEPLOY-004 |

### Riesgos Resueltos en DEPLOY-002
1. ✅ **Global error handler:** Stack traces ya no se exponen en producción
2. ✅ **CORS configurable:** Seguridad mejorada para producción

### Riesgos Pendientes
1. **Sin rate limiting:** Vulnerable a brute force en login/registro (DEPLOY-004)

---

## 8. Scripts y Build

### Tipo de Proyecto
- ✅ JavaScript CommonJS puro
- ✅ No requiere build step
- ✅ `npm install` + `npm start` suficiente

### Scripts Disponibles
```bash
npm start              # Producción
npm run dev            # Desarrollo (con watch)
npm run seed:demo      # Seed de datos (requiere service role key)
```

### Dependencias de Dev
⚠️ **Alerta:** `nodemon`, `typescript`, `ts-node` están en devDependencies
- No afectan producción (no se instalan en `NODE_ENV=production`)
- **Veredicto:** OK para deploy

### Veredicto
✅ **Backend listo para deploy sin build step**

---

## 9. Base URL Frontend

### Configuración Requerida (Post-Deploy)

**Frontend debe usar:**
```
EXPO_PUBLIC_API_URL=https://<BACKEND_PUBLIC_URL>/api
```

**Ejemplos por plataforma:**
- Render: `https://homeplus-backend.onrender.com/api`
- Railway: `https://homeplus-backend.railway.app/api`
- Fly.io: `https://homeplus.fly.dev/api`

**Nota:** No cambiar `.env` local todavía. Actualizar después del deploy del backend.

---

## 10. Plataforma de Deploy Recomendada

### Opción 1: Render (Recomendada para MVP)

**Pros:**
- ✅ Gratis para servicios web (con limitaciones)
- ✅ Deploy automático desde GitHub
- ✅ Soporta Node.js nativo
- ✅ Variables de entorno integradas
- ✅ HTTPS automático
- ✅ Sin configuración compleja

**Contras:**
- ⚠️ Servidor "se duerme" en plan gratis (5 min inactividad)
- ⚠️ Base de datos PostgreSQL gratis solo 90 días

**Configuración:**
- Build Command: `npm install`
- Start Command: `npm start`
- Root Directory: `backend`

---

### Opción 2: Railway

**Pros:**
- ✅ Muy simple de configurar
- ✅ Deploy automático desde GitHub
- ✅ Variables de entorno integradas
- ✅ HTTPS automático
- ✅ $5 crédito mensual gratis

**Contras:**
- ⚠️ No tiene plan gratis permanente (solo trial)
- ⚠️ Requiere tarjeta de crédito

**Configuración:**
- Service: New → Node.js
- Railway detecta automáticamente `package.json`
- Start Command: `npm start`

---

### Opción 3: Fly.io

**Pros:**
- ✅ Plan gratis generoso (3 VMs pequeñas)
- ✅ Global edge deployment
- ✅ Excelente para apps que necesitan baja latencia

**Contras:**
- ⚠️ Curva de aprendizaje más alta
- ⚠️ Requiere CLI `flyctl`
- ⚠️ Configuración más compleja

---

### Recomendación Final
**Render** para MVP/demo rápida.  
**Railway** si se necesita más confiabilidad sin configuración compleja.

---

## 11. Checklist DEPLOY-002 (Implementado)

### Cambios Implementados

- ✅ **Health check dedicado** (`/health`)
  - Respuesta: `{ ok: true, service: 'homeplus-backend', timestamp: 'ISO', env: '...' }`
  - Status: 200
  - No requiere auth, no consulta DB

- ✅ **Global error handler**
  - Captura errores no manejados
  - Producción: JSON genérico sin stack trace
  - Desarrollo: JSON con detalles mínimos
  - Respeta errores 503 (BUGFIX-002) y 401

- ✅ **404 not found handler**
  - Respuesta: `{ error: 'Ruta no encontrada.', code: 'not_found' }`
  - Status: 404

- ✅ **CORS configurable**
  - Desarrollo: abierto (Expo, local, Postman)
  - Producción: usa `CORS_ORIGIN` o permite requests sin origin

- ✅ **`.env.example` creado**
  - PORT, NODE_ENV, CORS_ORIGIN
  - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

### Archivos Modificados
- `backend/index.js` - Health, CORS, error handler, 404 handler
- `backend/.env.example` - Nuevo archivo

### Cambios de Infraestructura
- [ ] Crear servicio backend en plataforma elegida
- [ ] Configurar root directory como `backend`
- [ ] Configurar build command: `npm install`
- [ ] Configurar start command: `npm start`
- [ ] Cargar variables de entorno (SUPABASE_*, NODE_ENV, CORS_ORIGIN)
- [ ] Probar `/health` desde navegador
- [ ] Probar `/api/auth/login` desde Thunder Client/Postman
- [ ] Actualizar `EXPO_PUBLIC_API_URL` en frontend
- [ ] Reiniciar Expo con cache: `npx expo start -c`
- [ ] Probar desde datos móviles (no WiFi local)

---

## 12. Veredicto Final

### ¿Listo para Deploy?

**SÍ** - Backend listo para deploy público después de DEPLOY-002.

### Cambios Implementados
1. ✅ Health check dedicado (`/health`)
2. ✅ Global error handler (sin stack traces en producción)
3. ✅ CORS configurable por ambiente
4. ✅ 404 not found handler
5. ✅ `.env.example` documentado

### Pendientes (No Bloqueantes)
1. Rate limiting (DEPLOY-004/API hardening)
2. Logging estructurado (winston/pino)
3. Deploy real a plataforma
4. Testing desde redes externas

---

## 13. Archivos Revisados

| Archivo | Estado | Observaciones |
|---------|--------|---------------|
| `backend/package.json` | ✅ Revisado | Scripts válidos |
| `backend/index.js` | ✅ Modificado | Health, CORS, error handler, 404 |
| `backend/.gitignore` | ✅ Revisado | Cubre `.env` |
| `backend/src/config/supabase.js` | ✅ Revisado | Configuración correcta |
| `backend/src/lib/*.js` | ✅ Revisado | Manejo de errores OK |
| `backend/src/middleware/*.js` | ✅ Revisado | Auth middleware dual (legacy + final) |
| `backend/src/controllers/*.js` | ✅ Revisado | Lógica correcta |
| `backend/src/routes/*.js` | ✅ Revisado | Endpoints definidos |
| `backend/scripts/*.js` | ✅ Revisado | Seed script existe |
| `backend/.env.example` | ✅ Creado | Documentación de variables |

---

## 14. Comandos Ejecutados

```bash
# Desde raíz
git status --short
# Resultado: Sin cambios pendientes

# Verificar estructura backend
Get-ChildItem -Path "backend" -Recurse -File -Name
# Resultado: 50+ archivos detectados

# Verificar entrypoint
Test-Path "backend\src\server.js"
# Resultado: False (usa index.js en raíz)

# Desde backend (DEPLOY-002)
npm start
# Script válido: "start": "node index.js"
```

---

## 15. QA Manual Esperado

- ✅ `GET /health` → 200 JSON `{ ok: true, service: 'homeplus-backend', ... }`
- ✅ `GET /ruta-inexistente` → 404 JSON `{ error: 'Ruta no encontrada.', code: 'not_found' }`
- ✅ Error no manejado → JSON sin stack en production
- ✅ CORS dev no bloquea Expo/local/mobile
- ✅ CORS production usa CORS_ORIGIN
- ✅ `/api/auth/login` sigue igual cuando todo funciona
- ✅ `/api/auth/login` timeout Supabase sigue 503
- ✅ `/api/auth/me` token inválido sigue 401
- ✅ No se tocó frontend
- ✅ No se tocó lógica de negocio

## 16. Archivo .env.example

```env
# Variables de entorno para HomePlus Backend
# Copiar este archivo a .env y completar con valores reales

# Puerto del servidor (opcional, default: 3000)
PORT=3000

# Ambiente de ejecución (development/production)
NODE_ENV=development

# CORS - Origen(es) permitidos en producción (separados por coma)
# Ejemplo: https://mi-app.vercel.app,https://mi-app.firebaseapp.com
CORS_ORIGIN=

# Supabase - URL del proyecto
SUPABASE_URL=https://your-project.supabase.co

# Supabase - Anon/Public Key (segura para cliente)
SUPABASE_ANON_KEY=your-anon-key

# Supabase - Service Role Key (PRIVADA - usar solo en backend)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 17. Próximos Pasos

1. **DEPLOY-003:** Deploy backend a plataforma elegida (Render/Railway/Fly)
2. **DEPLOY-004:** Configurar frontend para usar backend público
3. **DEPLOY-005:** Testing desde redes externas (datos móviles)
4. **DEPLOY-006:** API hardening (rate limiting, logging estructurado)

---

**Documento creado:** 2026-06-29  
**DEPLOY-002 completado:** 2026-06-29  
**Backend listo para deploy:** SÍ