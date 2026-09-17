# OAuth Feasibility Gate: Google + Apple

**Fecha:** 2026-06-30  
**Estado:** InvestigaciÃ³n tÃ©cnica completada  
**Autor:** AUTH-003 Task

---

## 1. Resumen Ejecutivo

| Componente | DecisiÃ³n |
|------------|----------|
| **Google OAuth** | SÃ­ - Viable con Supabase OAuth + Development Build |
| **Apple Sign In** | CONDICIONADO / PROTOTIPO TÉCNICO - expo-apple-authentication, requiere Apple Developer para producción |
| **Development Build** | Necesario - Expo Go no soporta OAuth nativo completo |

**Veredicto final:** OAuth listo para empezar Google con condicionantes técnicos. Apple queda como CONDICIONADO/PROTOTIPO TÉCNICO: se agregará expo-apple-authentication, pero solo será Auth final si logra Supabase session + /api/auth/me. Si no se logra, queda como prototipo documentado. Integración iOS productiva puede requerir Apple Developer Program y configuración Apple real.

---

## 2. Estado Actual de Auth

### 2.1 Auth ClÃ¡sico Finalizado
- Email/password: Login, Register, Forgot, Update, Restore, Logout â
- `/api/auth/me` es fuente Ãºnica de verdad para navegaciÃ³n
- SesÃ­on Supabase persistente mediante `AsyncStorage`
- `auth.final.controller.js` es fuente final en backend

### 2.2 Flujo Actual de Sesiones
```
Login/Register â Backend auth â AuthSession (access_token + refresh_token)
â supabase.auth.setSession() â Persistencia en AsyncStorage
â AuthContext escucha onAuthStateChange
â loadAuthMe(access_token) â /api/auth/me â authMe navigation decision
```

### 2.3 NavegaciÃ³n Decidida por Backend
- `authMe.navigation.next` determina ruta:
  - `create_person_profile` â Sin persona creada
  - `create_or_join_household` â Sin hogar
  - `home` / `household_onboarding` â Con hogar activo
- Frontend NO decide navegaciÃ³n, solo ejecuta decisiÃ³n backend

### 2.4 Logout Limpia Sesiones
- Backend: `authLogout(access_token)` â invalidate token
- Frontend: `supabase.auth.signOut({ scope: 'local' })`
- Limpia: `authMe`, `session`, `user`, `pendingJoinToken`

---

## 3. DecisiÃ³n Google OAuth

### 3.1 Provider
- **Usar:** `supabase.auth.signInWithOAuth({ provider: 'google' })`
- **RazÃ³n:** Supabase maneja flujo OAuth completo, devuelve sesiÃ³n directamente
- **No usar:** Google Sign-In SDK nativo (requiere Client Secret en frontend â INSEGURO)

### 3.2 Redirect Flow
```typescript
// Flujo esperado
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: getAuthRedirectUrl(), // homeplus://auth/callback
  }
});
// Google â Browser â Deep link â handleIncomingUrl() â exchangeCodeForSession()
// â applySession() â loadAuthMe() â /api/auth/me â navegaciÃ³n normal
```

### 3.3 Scheme Recomendado
- **Scheme actual:** `familyhub://` (definido en app.json)
- **Recomendado:** Cambiar a `homeplus://` para consistencia con marca
- **Path de callback:** `auth/callback` (ya implementado en AuthContext)
- **URL final:** `homeplus://auth/callback?access_token=xxx&refresh_token=xxx&type=sso`

### 3.4 ConfiguraciÃ³n Supabase Necesaria
1. Ir a: Supabase Dashboard â Authentication â Providers â Google
2. Habilitar Google provider
3. Configurar en Supabase (NO en frontend):
   - Client ID de Google Cloud
   - Client Secret de Google Cloud
   - Redirect URIs: `homeplus://auth/callback`

### 3.5 ConfiguraciÃ³n Google Cloud Necesaria
1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar Google+ API
3. Crear credenciales OAuth 2.0:
   - Application type: **Native** (mÃ³vil/desktop)
   - Name: `homeplus-mobile`
4. Obtener:
   - Client ID (termina en `apps.googleusercontent.com`)
   - Client Secret
5. Configurar en Supabase (nunca en frontend)

### 3.6 Expo Go vs Development Build
- **Expo Go:** NO suficiente
  - Soporta OAuth bÃ¡sico pero con limitaciones
  - Deep linking funciona solo en development builds
  - No permite custom schemes en Expo Go
- **Development Build:** NECESARIO
  - Permite custom scheme `homeplus://`
  - Soporta deep linking completo
  - Necesario para OAuth nativo confiable

### 3.7 Entra Esta Semana?
- **SÃ­**, si:
  - Ya hay cuenta Google Cloud
  - Se puede crear development build (1-2 horas)
  - Se configura provider en Supabase (15 min)
- **No**, si:
  - Falta crear proyecto Google Cloud (2-3 horas extra)
  - No hay experiencia con development builds

---

## 4. DecisiÃ³n Apple Sign In

### 4.1 Dependencia Necesaria
```json
// package.json - DEBE AGREGARSE
"expo-apple-authentication": "~7.1.0"
```


### 4.2 Limitaciones CrÃ­ticas y DecisiÃ³n HomePlus

#### Requisito: Apple Developer Program
- **Requisito:** Cuenta Apple Developer ($99/año) para producción
- **Sin cuenta:** No se puede firmar app para iOS App Store
- **Expo Go:** Soporta Sign in with Apple SOLO en apps build con cuenta desarrollador
- **Consecuencia:** INTEGRACIÃ“N PRODUCTIVA requiere cuenta desarrollador

#### HomePlus DecisiÃ³n: CONDICIONADO / PROTOTIPO TÃ‰CNICO
HomePlus SÃ agregarÃ¡ Apple Sign In usando expo-apple-authentication con el siguiente enfoque:

**Flujo de ValidaciÃ³n:**
1. Apple devuelve credential con identityToken
2. Supabase crea session mediante signInWithIdToken({ provider: 'apple', token: identityToken })
3. AuthContext detecta session mediante onAuthStateChange
4. /api/auth/me responde 200 con datos usuario
5. AppNavigator decide navegación basada en `authMe.navigation.next`
6. Logout limpia sesiÃ³n correctamente
7. Cerrar y abrir app mantiene sesiÃ³n (persistencia)

**Solo serÃ¡ Auth final si cumple TODOS los puntos anteriores.**

**Si NO llega a Supabase session:**
- Queda documentado como prototipo/bloqueado por configuraciÃ³n Apple
- UI muestra mensaje claro: "Apple Sign In requiere configuraciÃ³n adicional"
- No bloquea Google OAuth ni auth clÃ¡sico

**IntegraciÃ³n iOS productiva:**
- Puede requerir Apple Developer Program ($99/año)
- Requiere configuraciÃ³n Apple real (Service ID, Private Key, Key ID)
- Requiere prebuild iOS + Xcode + signing certificates

#### Bloqueo 2: iOS Only
- Sign in with Apple NO existe en Android
- Requiere feature detection:
  ```typescript
  import * as AppleAuthentication from 'expo-apple-authentication';
  
  if (AppleAuthentication.isAvailable()) {
    // Mostrar botÃ³n Apple
  }
  ```

#### Bloqueo 3: Credential â Supabase Session
- Apple devuelve `identityToken` (JWT)
- Supabase requiere `signInWithIdToken({ provider: 'apple', token: identityToken })`
- **Verificar:** Si Supabase JS client soporta Apple ID token exchange
- **Riesgo:** Puede requerir backend proxy para validar token Apple

### 4.3 QuÃ© Se Puede Probar
| Entorno | Apple Sign In |
|---------|---------------|
| Expo Go | NO (requiere build firmado) |
| Development Build sin cuenta Dev | NO (no se puede firmar) |
| Development Build con cuenta Dev | SÃ (simulador iOS) |
| Production Build con cuenta Dev | SÃ (App Store) |

### 4.4 Prototipo vs Real
**OpciÃ³n A - Prototipo (sin cuenta Developer):**
- Mostrar botÃ³n Apple en UI
- `console.log('Apple OAuth bloqueado: requiere Apple Developer Program')`
- Documentar bloqueo tÃ©cnico
- **Ventaja:** UI lista para cuando se obtenga cuenta
- **Desventaja:** No funcional

**OpciÃ³n B - Real (con cuenta Developer):**
- Agregar `expo-apple-authentication`
- Implementar `signInWithApple()`
- Validar `identityToken` con Supabase
- **Ventaja:** Funcional completo
- **Desventaja:** Requiere $99/aÃ±o + configuraciÃ³n compleja

### 4.5 ValidaciÃ³n de sesiÃ³n Supabase
```typescript
// Flujo esperado (si Apple Developer estÃ¡ disponible)
const { identityToken } = await AppleAuthentication.signInAsync(
  AppleAuthentication.SignInScope.EMAIL | AppleAuthentication.SignInScope.FULL_NAME
);

const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: identityToken,
});

// Si exitoso:
// â applySession(data.session)
// â loadAuthMe(data.session.access_token)
// â /api/auth/me â navegaciÃ³n normal
```

### 4.6 Entra Esta Semana?
- **Como real:** NO (sin cuenta Apple Developer)
- **Como prototipo:** SÃ (UI + mensaje de bloqueo documentado)
- **RecomendaciÃ³n:** Dejar Apple como "prÃ³xima fase" hasta obtener cuenta

---

## 5. DecisiÃ³n Development Build

### 5.1 Expo Go vs Dev Build

| CaracterÃ­stica | Expo Go | Development Build |
|----------------|---------|-------------------|
| Custom scheme | NO | SÃ |
| Deep linking | Limitado | Completo |
| OAuth nativo | Parcial | Completo |
| Apple Sign In | NO | SÃ (con cuenta Dev) |
| Install | App Store | Build local/EAS |
| Setup time | 0 min | 30-60 min |

### 5.2 Plan para Android
```bash
# 1. Instalar expo-dev-client
cd front/mi-front-limpio
npm install expo-dev-client

# 2. Prebuild con Android
npx expo prebuild --platform android

# 3. Ejecutar en emulador/dispositivo
npx expo run:android

# 4. O build APK
eas build --platform android --profile development
```

### 5.3 Plan para iOS
```bash
# 1. Instalar expo-dev-client
npm install expo-dev-client

# 2. Prebuild con iOS
npx expo prebuild --platform ios

# 3. Abrir en Xcode
cd ios && open HomePlus.xcworkspace

# 4. Run en simulador
npx expo run:ios

# 5. O build IPA (requiere Apple Developer)
eas build --platform ios --profile development
```

### 5.4 Comandos Aproximados
```bash
# InstalaciÃ³n inicial
npm install expo-dev-client expo-linking

# Prebuild (genera directorios nativos)
npx expo prebuild

# Ejecutar Android
npx expo run:android

# Ejecutar iOS
npx expo run:ios

# Build remoto con EAS (opcional)
npx eas build --platform android --profile development
npx eas build --platform ios --profile development
```

### 5.5 Impacto en Proyecto
- **Archivos nuevos:** `android/`, `ios/` (generados por prebuild)
- **Archivos modificados:** `package.json` (agregar expo-dev-client)
- **Git ignore:** Ya incluye `android/`, `ios/` en `.gitignore` tÃ­pico
- **Metro bundler:** Sigue funcionando para hot reload
- **Tiempo estimado:** 2-4 horas para setup inicial + builds

### 5.6 EAS Necesario?
- **No obligatorio:** Se puede build local con `expo run:android/ios`
- **Recomendado:** Para builds consistentes y CI/CD
- **Plan:** Empezar sin EAS, agregar despuÃ©s si se necesita

---

## 6. Plan de ImplementaciÃ³n Recomendado

### Fase 1: Google OAuth (GOOGLE-001 a GOOGLE-003)

**GOOGLE-001: PreparaciÃ³n de entorno**
```bash
cd front/mi-front-limpio
npm install expo-dev-client expo-linking
npx expo prebuild
# Configurar .env:
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

**GOOGLE-002: ConfiguraciÃ³n de Google Cloud**
1. Crear proyecto Google Cloud
2. Habilitar Google+ API
3. Crear OAuth 2.0 credentials (Native)
4. Guardar Client ID y Client Secret
5. **NO agregar a frontend**

**GOOGLE-003: ConfiguraciÃ³n de Supabase + Implementation**
1. Supabase Dashboard â Auth â Providers â Google
2. Pegar Client ID y Client Secret en Supabase
3. Configurar Redirect URIs: `homeplus://auth/callback`
4. Agregar botÃ³n Google en Login.tsx:
   ```typescript
   const handleGoogleSignIn = async () => {
     const { error } = await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: {
         redirectTo: getAuthRedirectUrl(),
       },
     });
     if (error) console.error(error);
   };
   ```
5. Testear con development build

### Fase 2: Apple Sign In (APPLE-001 a APPLE-003)

**APPLE-001: Verificar disponibilidad**
```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

const isAppleAvailable = AppleAuthentication.isAvailable();
// iOS: true (si device soporta), Android: false
```

**APPLE-002: Agregar dependencia**
```bash
npm install expo-apple-authentication
```

**APPLE-003: ImplementaciÃ³n condicional**
```typescript
// Si Apple Developer disponible:
const handleAppleSignIn = async () => {
  const { identityToken, email } = await AppleAuthentication.signInAsync(
    AppleAuthentication.SignInScope.EMAIL
  );
  
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
  });
  
  if (error) console.error(error);
};

// Si NO disponible (prototipo):
const handleAppleSignIn = () => {
  console.warn('Apple Sign In: requiere Apple Developer Program');
  Alert.alert('PrÃ³ximamente', 'Apple Sign In estarÃ¡ disponible pronto');
};
```

### Fase 3: Auth Integration (AUTH-009)

**AUTH-009: IntegraciÃ³n con AuthContext existente**
- Reutilizar `handleIncomingUrl()` para OAuth callbacks
- Reutilizar `applySession()` para sesiones OAuth
- Reutilizar `loadAuthMe()` para obtener perfil
- Reutilizar navegaciÃ³n basada en `authMe.navigation.next`
- **NO duplicar flujo Auth**
- **NO crear rutas OAuth separadas**

```typescript
// AuthContext.tsx - handleIncomingUrl ya soporta OAuth:
if (path === AUTH_CALLBACK_PATH) {
  // OAuth callback (Google/Apple)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (accessToken && refreshToken) {
    await supabase.auth.setSession({ accessToken, refreshToken });
  }
  // Luego: refreshSession() â loadAuthMe() â navegaciÃ³n normal
}
```

---

## 7. ConfiguraciÃ³n Manual Necesaria

### 7.1 Supabase
1. Dashboard â Authentication â Providers
2. Google:
   - Enable: SÃ­
   - Client ID: desde Google Cloud
   - Client Secret: desde Google Cloud
   - Redirect URIs: `homeplus://auth/callback`
3. Apple (si aplica):
   - Enable: SÃ­
   - Service ID: desde Apple Developer
   - Private Key: desde Apple Developer
   - Key ID: desde Apple Developer

### 7.2 Google Cloud
1. console.cloud.google.com â New Project â `homeplus`
2. APIs & Services â Library â Search "Google+ API" â Enable
3. APIs & Services â Credentials â Create Credentials â OAuth 2.0
   - Application type: Native
   - Name: `homeplus-mobile`
4. Guardar:
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`
5. Configurar en Supabase (NO en frontend)

### 7.3 Apple (si aplica)
1. developer.apple.com â Certificates, IDs & Profiles
2. Identifiers â App IDs â Register new
   - Bundle ID: `com.homeplus.app`
   - Capabilities: Sign in with Apple (Enable)
3. Identifiers â Service IDs â Register
   - Description: `homeplus-web`
   - Identifier: `com.homeplus.web`
   - Sign in with Apple: Enable
4. Keys â Register
   - Name: `homeplus-auth`
   - Sign in with Apple: Enable
   - Generate private key
   - Guardar: Key ID, Private Key (.p8)
5. Configurar en Supabase

---

## 8. Cosas Prohibidas

### 8.1 Seguridad
- **NO** Client Secret en frontend (ni en .env)
- **NO** service_role key en frontend
- **NO** tokens en logs (console.log)
- **NO** sesiÃ³n casera (usar siempre Supabase session)
- **NO** almacenar credentials en AsyncStorage sin encryptar

### 8.2 Arquitectura
- **NO** duplicar flujo Auth en OAuth
- **NO** navegar a Home sin validar `/api/auth/me`
- **NO** crear mÃºltiples contextos de auth
- **NO** bypassear AuthContext para OAuth
- **NO** manejar OAuth fuera de AuthProvider

### 8.3 NavegaciÃ³n
- **NO** navegar directamente a Home desde OAuth callback
- **SIEMPRE** aplicar sesiÃ³n â loadAuthMe â decidir navegaciÃ³n
- **SIEMPRE** manejar error de /api/auth/me (logout forzado)

---

## 9. Riesgos y Bloqueos

### 9.1 Riesgos TÃ©cnicos

| Riesgo | Probabilidad | Impacto | MitigaciÃ³n |
|--------|--------------|---------|------------|
| Redirect mal configurado | Media | Alto | Testear con `npx expo device` para obtener URI real |
| Google vuelve al navegador | Media | Alto | Configurar deep linking en app.json + testear en device real |
| Apple devuelve credential sin session | Alta | Medio | Validar `signInWithIdToken` devuelve session antes de continuar |
| OAuth crea sesiÃ³n Supabase pero /me falla | Baja | Alto | Implementar fallback: logout + mostrar error claro |
| Logout no limpia sesiÃ³n OAuth | Baja | Medio | Usar `supabase.auth.signOut({ scope: 'local' })` ya implementado |
| Restore session no persiste OAuth | Baja | Alto | Verificar `persistSession: true` en supabase config (ya estÃ¡) |
| Duplicar flujo Auth | Media | Medio | Reutilizar `handleIncomingUrl()` y `applySession()` |

### 9.2 Bloqueos

**Bloqueo 1: Apple Developer Program**
- **Estado:** BLOQUEADO
- **Requisito:** $99/aÃ±o para cuenta desarrollador
- **Alternativa:** Prototipo con mensaje de "prÃ³ximamente"
- **Timeline:** Sin fecha (depende de decisiÃ³n de negocio)

**Bloqueo 2: Development Build Setup**
- **Estado:** Condicionado a tiempo disponible
- **Requisito:** 2-4 horas para setup inicial
- **Alternativa:** Usar Expo Go con limitaciones
- **Timeline:** Esta semana si se prioriza

**Bloqueo 3: Google Cloud ConfiguraciÃ³n**
- **Estado:** NO bloqueado (solo requiere tiempo)
- **Requisito:** Crear proyecto + credentials (30-60 min)
- **Alternativa:** None (necesario para Google OAuth)
- **Timeline:** Esta semana

---

## 10. Veredicto Final

### OAuth Listo para Empezar: GOOGLE SÃ, APPLE BLOQUEADO

| Componente | Veredicto | Condicionantes |
|------------|-----------|----------------|
| **Google OAuth** | â LISTO | - Development Build necesario<br/>- Google Cloud setup (1-2h)<br/>- Supabase config (15m) |
| **Apple Sign In** | ð« BLOQUEADO | - Apple Developer Program ($99/aÃ±o)<br/>- Sin cuenta = sin testing posible<br/>- UI prototipo sÃ­ es posible |
| **Development Build** | â NECESARIO | - Setup 2-4h inicial<br/>- Luego flujo normal<br/>- EAS opcional |

### PrÃ³ximos Pasos Inmediatos

1. **DecisiÃ³n de negocio:** ¿Se obtiene cuenta Apple Developer?
   - SÃ­: Incluir Apple en sprint actual
   - No: Dejar Apple para fase 2, prototipar UI

2. **Setup Development Build:**
   ```bash
   cd front/mi-front-limpio
   npm install expo-dev-client expo-linking
   npx expo prebuild
   ```

3. **Configurar Google Cloud:**
   - Crear proyecto
   - Obtener OAuth credentials
   - Configurar en Supabase

4. **Implementar Google OAuth:**
   - GOOGLE-001 â GOOGLE-002 â GOOGLE-003

5. **Testear flujo completo:**
   - Google login â deep link â session â /api/auth/me â navegaciÃ³n

### RecomendaciÃ³n Final

**Esta semana:**
- â Development Build setup
- â Google Cloud config
- â Supabase Google provider
- â Implementar Google OAuth
- â Testear flujo completo

**Fase 2 (despuÃ©s de Apple Developer):**
- ð§ expo-apple-authentication dependency
- ð§ Apple Sign In implementation
- ð§ Testear en iOS device
- ð§ Production build con Apple

---

## DocumentaciÃ³n de Referencia

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Expo Development Builds](https://docs.expo.dev/development/introduction/)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Google Cloud OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Developer Guide](https://developer.apple.com/sign-in-with-apple/)

---

**Documento creado:** 2026-06-30  
**Ãltima actualizaciÃ³n:** 2026-06-30  
**PrÃ³xima revisiÃ³n:** Al implementar GOOGLE-001