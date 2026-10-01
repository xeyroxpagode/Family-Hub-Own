# DEPLOY-003: Backend Deploy en Render + Conectar Expo

**Fecha:** 2026-06-29  
**Rama:** `rediseno-auth-post-entrega-profesional`  
**Estado:** Pendiente

---

## 1. Plataforma Recomendada para MVP

### Opción Principal: Render
- ✅ Gratis para servicios web (con limitaciones)
- ✅ Deploy automático desde GitHub
- ✅ Soporta Node.js nativo
- ✅ Variables de entorno integradas
- ✅ HTTPS automático
- ✅ Sin configuración compleja

### Alternativa: Railway
- ✅ Muy simple de configurar
- ✅ $5 crédito mensual gratis
- ⚠️ Requiere tarjeta de crédito (no tiene plan gratis permanente)

**Recomendación:** Usar **Render** para MVP/demo rápida.

---

## 2. Configuración en Render

### Paso 1: Crear nuevo Web Service
1. Ir a https://render.com
2. Click en **"New +"** → **"Web Service"**
3. Conectar GitHub repository (HomePlus)
4. Seleccionar branch: `rediseno-auth-post-entrega-profesional`

### Paso 2: Configuración del Servicio

| Campo | Valor |
|-------|-------|
| **Name** | `homeplus-backend` (o el que prefieras) |
| **Region** | Elige el más cercano (ej: Oregón, Frankfurt) |
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### Paso 3: Plan
- **Free** para MVP (servidor se duerme tras 5 min inactividad)
- **Starter** ($7/mes) para producción sin sleeps

### Paso 4: Health Check
- **Health Check Path:** `/health`
- Render usará este endpoint para verificar que el servicio está sano

---

## 3. Variables de Entorno

### Variables a Configurar en Render Dashboard

| Variable | Valor | Observaciones |
|----------|-------|---------------|
| `NODE_ENV` | `production` | Obligatorio para modo producción |
| `SUPABASE_URL` | `https://tu-proyecto.supabase.co` | Tu URL de Supabase |
| `SUPABASE_ANON_KEY` | `tu-anon-key` | Key pública (segura) |
| `SUPABASE_SERVICE_ROLE_KEY` | `tu-service-role-key` | **PRIVADA** - solo en backend |
| `CORS_ORIGIN` | *(opcional)* | Ver sección 4 |

### ⚠️ Importante
- **NO subir `.env` a GitHub**
- **NO pegar `SUPABASE_SERVICE_ROLE_KEY` en frontend**
- Service role key **solo** en backend (backend/.env o Render env vars)

---

## 4. Configuración CORS para Demo

### Comportamiento Actual
```javascript
// Desarrollo (NODE_ENV !== 'production')
app.use(cors()); // Permite todo

// Producción (NODE_ENV === 'production')
if (CORS_ORIGIN) {
  // Usa CORS_ORIGIN configurado
} else {
  // Permite solo requests sin origin (mobile/Expo)
  // Rechaza requests con origin no configurado
}
```

### Para App Móvil Expo
- Las requests desde app móvil **no traen Origin header**
- Sin `CORS_ORIGIN` en producción: ✅ Permite requests mobile/Expo
- Con `CORS_ORIGIN` configurado: ⚠️ Solo permite origins específicos

### Recomendación para Demo
**Opción A - Sin CORS_ORIGIN (más simple para demo móvil):**
- No configurar `CORS_ORIGIN` en Render
- Backend permite requests sin origin (mobile/Expo)
- ⚠️ Riesgo: No protege contra CSRF desde navegadores

**Opción B - Con CORS_ORIGIN (más seguro):**
- Configurar `CORS_ORIGIN=https://tu-app.vercel.app` (cuando tengas frontend web)
- Para testing temporal: `CORS_ORIGIN=*` (no recomendado para producción real)

### Para MVP Móvil
Dejar `CORS_ORIGIN` **vacío** inicialmente. El backend permitirá requests desde la app móvil.

---

## 5. Pruebas Después del Deploy

### URLs Esperadas (reemplazar BACKEND_URL)

#### Health Check
```
GET https://BACKEND_URL/health
```
Respuesta esperada:
```json
{
  "ok": true,
  "service": "homeplus-backend",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "env": "production"
}
```

#### Login Endpoint
```
POST https://BACKEND_URL/api/auth/login
Content-Type: application/json

{
  "email": "test@familia1.test",
  "password": "Test1234!"
}
```

#### Auth Me
```
GET https://BACKEND_URL/api/auth/me
Authorization: Bearer <access_token>
```

### Verificación
1. ✅ `/health` retorna 200 con JSON
2. ✅ `/api/auth/login` acepta credentials válidos
3. ✅ `/api/auth/me` retorna usuario con token válido
4. ✅ `/api/auth/login` con credenciales inválidas retorna 401
5. ✅ Rutas inexistentes retornan 404 JSON

---

## 6. Conectar Expo al Backend Deployado

### Paso 1: Actualizar Frontend .env

Archivar el `.env` actual (para backup):
```bash
cd front/mi-front-limpio
copy .env .env.backup
```

Actualizar `front/mi-front-limpio\.env`:
```env
EXPO_PUBLIC_API_URL=https://BACKEND_URL/api
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

**Nota:** `EXPO_PUBLIC_API_URL` debe incluir `/api` al final porque el backend usa `/api/*` routes.

### Paso 2: Reiniciar Expo con Cache Limpia
```bash
cd front/mi-front-limpio
npx expo start -c
```

### Paso 3: Probar Conexión
1. Abrir app en emulator o dispositivo real
2. Intentar login con credenciales de prueba
3. Verificar que se conecta al backend público

---

## 7. QA desde Celular

### Preparación
- Tener cuenta de prueba creada: `test@familia1.test` / `Test1234!`
- Backend deployado y funcionando
- Frontend actualizado con nueva URL

### Checklist de Pruebas

#### Conexión de Red
- [ ] **WiFi:** App funciona con WiFi conectado
- [ ] **Datos Móviles:** App funciona con datos (4G/5G)
- [ ] **Sin WiFi local:** Probar desde red externa (no WiFi del desarrollo)

#### Autenticación
- [ ] **Login:** Iniciar sesión con credenciales válidas
- [ ] **Login inválido:** Intentar con credenciales incorrectas (debe fallar)
- [ ] **Registro:** Crear nueva cuenta (si está habilitado)
- [ ] **Logout:** Cerrar sesión correctamente

#### Navegación Principal
- [ ] **Home:** Ver pantalla principal después de login
- [ ] **/me endpoint:** Verificar que se carga info de usuario

#### Planner
- [ ] **Ver tareas:** Cargar lista de tareas del planner
- [ ] **Ver eventos:** Cargar lista de eventos del calendar
- [ ] **Crear tarea:** Agregar nueva tarea
- [ ] **Crear evento:** Agregar nuevo evento al calendar

#### Funciones Familiares
- [ ] **Ver miembros:** Ver lista de miembros de la familia
- [ ] **Invitar:** Generar invite link (si está implementado)

---

## 8. Rollback / Troubleshooting

### Si el Frontend Deja de Funcionar

1. **Volver a backend local temporalmente:**
   ```env
   EXPO_PUBLIC_API_URL=https://tu-ngrok-url.trycloudflare.com
   # o usar IP local si estás en misma red
   ```

2. **Reiniciar Expo:**
   ```bash
   npx expo start -c
   ```

### Si el Backend Falla en Render

1. **Revisar logs en Render Dashboard:**
   - Ir al servicio → Logs
   - Buscar errores en startup

2. **Verificar Variables de Entorno:**
   - Settings → Environment
   - Confirmar que todas las variables están presentes
   - Verificar que no hay espacios extra ni comillas mal puestas

3. **Probar /health:**
   ```bash
   curl https://BACKEND_URL/health
   ```

4. **Revisar Build Logs:**
   - Events → Build logs
   - Verificar que `npm install` completó sin errores

5. **Verificar que el servicio esté "Running":**
   - Si está "Stopped", click "Redeploy" o "Restart"

### Errores Comunes

| Error | Solución |
|-------|----------|
| `SUPABASE_URL not found` | Agregar variable en Render → Settings → Environment |
| `CORS error` en navegador | Configurar `CORS_ORIGIN` o usar app móvil (sin origin) |
| `503 Service Unavailable` | Revisar logs, verificar conexión a Supabase |
| `404 Not Found` en /api/* | Verificar que routes están bien montadas en index.js |
| App no conecta desde celular | Verificar que URL sea HTTPS y accesible desde internet |

---

## 9. Checklist de Deploy

### Pre-Deploy
- [ ] Backend tiene `GET /health` funcionando
- [ ] Backend tiene CORS configurable
- [ ] Backend tiene global error handler
- [ ] `backend/.env.example` existe
- [ ] `npm start` funciona localmente
- [ ] Supabase credentials listos (URL, anon key, service role key)

### Deploy en Render
- [ ] Crear nuevo Web Service en Render
- [ ] Conectar repository GitHub
- [ ] Configurar Root Directory: `backend`
- [ ] Configurar Build Command: `npm install`
- [ ] Configurar Start Command: `npm start`
- [ ] Configurar Environment Variables:
  - [ ] `NODE_ENV=production`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `CORS_ORIGIN` (opcional)
- [ ] Deployar servicio
- [ ] Esperar a que estado sea "Live"

### Post-Deploy - Backend
- [ ] Probar `https://BACKEND_URL/health` desde navegador
- [ ] Probar `https://BACKEND_URL/api/auth/login` con Postman/Thunder Client
- [ ] Verificar logs en Render no muestran errores
- [ ] Confirmar servicio está "Running"

### Post-Deploy - Frontend
- [ ] Actualizar `front/mi-front-limpio/.env` con nueva URL
- [ ] Reiniciar Expo: `npx expo start -c`
- [ ] Probar login desde emulator
- [ ] Probar desde dispositivo real (WiFi)
- [ ] Probar desde dispositivo real (datos móviles)

### QA Final
- [ ] Login funciona
- [ ] Home carga
- [ ] Planner tasks cargan
- [ ] Planner events cargan
- [ ] Crear tarea funciona
- [ ] Crear evento funciona

---

## 10. Comandos Útiles

### Frontend Typecheck
```bash
cd front/mi-front-limpio
npx.cmd tsc --noEmit
```

### Verificar Estado Git
```bash
git status --short
```

### Testear Backend Localmente
```bash
cd backend
npm start
```

### Testear Health Endpoint
```bash
curl http://localhost:3000/health
```

### Reiniciar Expo con Cache Limpia
```bash
cd front/mi-front-limpio
npx expo start -c
```

---

## 11. Notas Adicionales

### Sobre el Plan Gratis de Render
- El servicio se "duerme" tras 5 minutos de inactividad
- El primer request después del sleep toma ~30 segundos en responder
- Para MVP/demo está bien
- Para producción real, considerar plan Starter ($7/mes)

### Sobre Supabase
- El plan gratis incluye 500MB de base de datos
- 50,000 usuarios activos
- 2GB de ancho de banda
- Suficiente para MVP

### Seguridad
- **Nunca** subir `.env` a GitHub
- **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` en frontend
- Usar RLS (Row Level Security) en Supabase para proteger datos
- Considerar agregar rate limiting en futuro (DEPLOY-004)

---

**Documento creado:** 2026-06-29  
**Autor:** Equipo HomePlus  
**Versión:** 1.0