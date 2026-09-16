# Google OAuth Setup: HomePlus

**Fecha:** 2026-06-30  
**Ejecución:** GOOGLE-001  
**Estado:** Configuración completada  
**GOOGLE-002 Estado:** Implementación frontend completada

---

## 1. Estado Final

| Componente | Estado |
|------------|--------|
| **Google Cloud** | ✓ Configurado |
| **Supabase Google Provider** | ✓ Configurado |
| **Redirect URI** | ✓ Configurado |
| **Client ID** | ✓ Configurado (fuera de repo) |
| **Client Secret** | ✓ Configurado (fuera de repo) |
| **Frontend funcional** | ✓ Implementado (GOOGLE-002) |
| **Backend** | ✗ No tocado |
| **Supabase DB** | ✗ No tocado |

**Veredicto:** GOOGLE-001 **LISTO**, GOOGLE-002 **LISTO** para testing con dev build.

---

## 2. Google Cloud Console

### 2.1 Proyecto
- **Proyecto usado:** HomePlus (seleccionado/creado)
- **OAuth consent screen:** Configurado
- **Nombre visible:** HomePlus
- **Usuario de soporte:** Configurado

### 2.2 Credenciales
- **Tipo de aplicación:** Web application
- **Nombre del cliente:** HomePlus Supabase Auth
- **Client ID:** Configurado ✓
- **Client Secret:** Configurado ✓ (valor no expuesto)

### 2.3 Scopes Configurados
- `openid`
- `email`
- `profile`

### 2.4 Authorized Redirect URI
```
https://pkidoxngqdwoummbdlop.supabase.co/auth/v1/callback
```

### 2.5 Seguridad
- [x] Client Secret NO está en frontend
- [x] Client Secret NO está en repo
- [x] Client Secret NO fue commiteado
- [x] Credenciales guardadas en lugar seguro

---

## 3. Supabase Dashboard

### 3.1 Google Provider
- **Authentication → Providers → Google:** Abierto
- **Sign in with Google:** Activado ✓
- **Client ID cargado:** Sí ✓
- **Client Secret cargado:** Sí ✓ (valor no expuesto)
- **Skip nonce checks:** Apagado
- **Allow users without an email:** Apagado

### 3.2 Callback URL
```
https://pkidoxngqdwoummbdlop.supabase.co/auth/v1/callback
```

### 3.3 URL Configuration
- **Site URL:** Revisado/actualizado
- **Redirect URL agregada:** `homeplus://auth/callback` ✓

### 3.4 Verificaciones
- [x] Provider activo
- [x] Supabase DB no tocada
- [x] Migraciones no tocadas
- [x] service_role no usado
- [x] .env no tocado

---

## 4. Redirect Final

### Flujo OAuth
```
Usuario → Botón Google → Google Cloud → Browser (autenticación)
→ Supabase callback (https://pkidoxngqdwoummbdlop.supabase.co/auth/v1/callback)
→ Deep link (homeplus://auth/callback?access_token=xxx&refresh_token=xxx)
→ AuthContext handleIncomingUrl()
→ supabase.auth.setSession()
→ loadAuthMe(access_token)
→ /api/auth/me
→ Navegación según authMe.navigation.next
```

### Redirect URI Configurado
```
homeplus://auth/callback
```

---

## 5. Seguridad

### Cosas Prohibidas (Cumplidas)
- [x] Client Secret NO en frontend
- [x] Client Secret NO en repo
- [x] service_role NO usado
- [x] tokens NO en logs
- [x] .env NO tocado
- [x] Supabase DB NO tocada
- [x] Migraciones NO tocadas
- [x] Frontend funcional NO tocado (Login.tsx, AuthContext, AppNavigator intactos)
- [x] Backend NO tocado

### Almacenamiento de Credenciales
- Client ID: Guardado fuera del repo (gestor de secretos/.env no versionado)
- Client Secret: Guardado fuera del repo (gestor de secretos/.env no versionado)
- **Nunca** pegados en código fuente
- **Nunca** commiteados a Git

---

## 6. Riesgos Identificados

| Riesgo | Mitigación |
|--------|------------|
| Redirect mal configurado | Verificado: `homeplus://auth/callback` configurado en Supabase |
| Google autentica pero no vuelve a la app | Callback de Supabase configurado en Google Cloud |
| Supabase provider activo pero frontend no implementado | **RESUELTO** GOOGLE-002 implementado |
| Expo Go no representa flujo final | Se requiere development build para testing real (DEVBUILD-001 completado) |

---

## 7. Archivos Modificados (GOOGLE-002)

### Archivos Modificados
- `front/mi-front-limpio/context/AuthContext.tsx`
  - Agregado `signInWithGoogle` a `AuthContextType`
  - Implementada función `signInWithGoogle()` que llama a `supabase.auth.signInWithOAuth()`
  - Redirect URL: `homeplus://auth/callback`
  
- `front/mi-front-limpio/screens/Login.tsx`
  - Agregado botón "Continuar con Google"
  - Implementado `handleGoogleSignIn()` con loading/error states
  - Manejo de cancelación sin mostrar error
  - Estilo visual consistente con diseño premium

### Archivos No Modificados (Reutilizados)
- `front/mi-front-limpio/supabase/index.ts` - Cliente Supabase existente
- `front/mi-front-limpio/navigation/AppNavigator.tsx` - Navegación vía /api/auth/me
- Backend - Sin cambios
- Supabase DB - Sin cambios

---

## 8. Implementación GOOGLE-002

### 8.1 Función signInWithGoogle

```typescript
const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
  const redirectUrl = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) {
    return {
      error: getAuthErrorMessage(
        error,
        'No pudimos iniciar sesion con Google. Intenta nuevamente.',
      ),
    };
  }

  if (!data.url) {
    return {
      error: 'No pudimos iniciar el flujo de Google. Intenta nuevamente.',
    };
  }

  return { error: null };
}, []);
```

### 8.2 Redirect URL

```typescript
const AUTH_CALLBACK_PATH = 'auth/callback';
const getAuthRedirectUrl = () => Linking.createURL(AUTH_CALLBACK_PATH);
// Resultado: homeplus://auth/callback
```

### 8.3 Integración con /api/auth/me

El flujo completo:
1. Usuario toca "Continuar con Google"
2. `signInWithGoogle()` llama a `supabase.auth.signInWithOAuth()`
3. Supabase redirige a Google → autenticación → callback
4. `handleIncomingUrl()` (ya existente) detecta el callback
5. `supabase.auth.setSession()` establece sesión
6. `onAuthStateChange` dispara actualización de estado
7. `loadAuthMe(accessToken)` llama a `/api/auth/me`
8. `AppNavigator` decide navegación según `authMe.navigation.next`

### 8.4 Loading/Error States

- `googleLoading` estado local en Login.tsx
- Botón deshabilitado durante carga
- Texto cambia a "Conectando..."
- Error de cancelación no muestra mensaje
- Error genérico para fallas de red/Google

---

## 9. Próximos Pasos

### GOOGLE-003 — Testing y Validación
**Objetivo:** Probar flujo completo con development build

**Tareas:**
1. Construir dev client: `npx expo run:android` o `npx expo run:ios`
2. Probar login con Google
3. Verificar callback deep link funciona
4. Confirmar sesión Supabase se crea
5. Confirmar /api/auth/me se llama
6. Confirmar navegación correcta
7. Probar logout después de Google login
8. Probar restore session (cerrar y abrir app)
9. Verificar email/password sigue funcionando

---

## 10. Verificación Final

### Comandos Ejecutados
```bash
# Working tree limpio antes de empezar
git status --short
# Resultado: (no output) - limpio

# TypeScript check
cd front/mi-front-limpio
npx.cmd tsc --noEmit
# Resultado: Sin errores

# Expo start validación
npx.cmd expo start -c --help
# Resultado: Expo CLI disponible
```

### Archivos Modificados (GOOGLE-002)
- `front/mi-front-limpio/context/AuthContext.tsx`
- `front/mi-front-limpio/screens/Login.tsx`

### Archivos No Tocados
- `back/` (backend)
- `.env`
- Migraciones DB
- Supabase DB
- Google Cloud Console

---

## 11. Conclusión

**GOOGLE-001: LISTO**
**GOOGLE-002: LISTO**

Google OAuth implementado exitosamente:
- Google Cloud Console ✓
- Supabase Dashboard ✓
- Frontend implementación ✓

Implementación completada sin tocar:
- Backend
- Supabase DB
- Migraciones
- Client Secret en código

**Listo para:** GOOGLE-003 — Testing con development build

---

**Documento creado:** 2026-06-30  
**Última actualización:** 2026-06-30  
**GOOGLE-002 completado:** 2026-06-30  
**Próxima revisión:** Al completar GOOGLE-003