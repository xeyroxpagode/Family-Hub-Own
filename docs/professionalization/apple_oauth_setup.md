# Sign in with Apple - Setup Documentation

## Objetivo

Agregar Sign in with Apple como método de autenticación para HomePlus en iOS, manteniendo la compatibilidad con:
- Email/contraseña
- Google OAuth
- Sin mostrar Apple en Android

## Dependencia instalada

```bash
npx expo install expo-apple-authentication
```

**Package:** `expo-apple-authentication`  
**Versión:** Compatible con Expo SDK 54

## Archivos modificados

### 1. `app.json`
- Agregado `ios.usesAppleSignIn: true`
- Agregado `expo-apple-authentication` al array de plugins

### 2. `context/AuthContext.tsx`
- Importado `expo-apple-authentication`
- Creada función `signInWithApple()`
- Agregado `signInWithApple` al tipo `AuthContextType`
- Expuesto en el contexto via `useMemo`

### 3. `screens/Login.tsx`
- Importado `expo-apple-authentication` y `Platform`
- Agregado estado `appleLoading` y `appleAvailable`
- Creada función `handleAppleSignIn()`
- Agregado botón `AppleAuthenticationButton` (solo iOS)
- Verificación de disponibilidad con `AppleAuthentication.isAvailableAsync()`

## Cómo se muestra solo en iOS

El botón Apple se renderiza con la condición:

```tsx
{Platform.OS === 'ios' && appleAvailable ? (
  <TouchableOpacity>
    <AppleAuthentication.AppleAuthenticationButton ... />
  </TouchableOpacity>
) : null}
```

Adicionalmente, se verifica disponibilidad en runtime con `AppleAuthentication.isAvailableAsync()`.

## Conexión con Supabase

La función `signInWithApple()` usa el método nativo de Supabase:

```tsx
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: credential.identityToken,
});
```

Después del éxito, se sincroniza la sesiÃ³n con `refreshSession()`.

## Manejo de errores

| Error | Comportamiento |
|-------|----------------|
| CancelaciÃ³n del usuario | Silencioso (retorna `{ error: null }`) |
| `identityToken` ausente | Error controlado: "No se recibiÃ³ el token de identidad" |
| Error de Supabase | Error controlado via `getAuthErrorMessage()` |
| Dispositivo no compatible | Error: "Solo estÃ¡ disponible en iOS" |
| Dispositivo no disponible | Estado `appleAvailable` se setea a `false` |

**No hay pantallas rojas.**

## LimitaciÃ³n importante

**No probado en iOS desde Windows.**

La implementaciÃ³n es correcta segÃºn la documentaciÃ³n de:
- Expo Apple Authentication
- Supabase OAuth con Apple
- React Native platform detection

## PrÃ³ximos pasos

Para probar y validar:

1. **OpciÃ³n A - EAS Build:**
   ```bash
   eas build --platform ios
   ```
   Instalar en iPhone real y probar el flujo completo.

2. **OpciÃ³n B - Mac + Xcode:**
   - Abrir proyecto en Mac
   - Configurar signing/entitlements
   - Ejecutar en simulator o dispositivo real

3. **ConfiguraciÃ³n de Apple Developer:**
   - Habilitar "Sign in with Apple" en App ID
   - Configurar en Apple Developer Portal
   - Asegurar que Supabase tenga Apple configurado como provider

## Flujo final

```
Apple Sign In → identityToken → Supabase signInWithIdToken { provider: 'apple', token } 
→ sesión Supabase → onAuthStateChange → loadAuthMe() → /api/auth/me
```

## Limitación importante

**No se puede validar login Apple real desde Windows.**

Requisitos para prueba real:
- Dispositivo iOS real o simulator en Mac
- EAS Build para iOS o Xcode con Mac
- Configurar provider Apple en Supabase Dashboard (si no está activo)

## Estado

**APPLE-002: DONE**

- [x] Dependencia instalada
- [x] Config en `app.json`
- [x] `signInWithApple()` implementada completa
- [x] Usa `signInWithIdToken` provider `apple`
- [x] Botón solo en iOS (oculto en Android)
- [x] Manejo de cancelación silencioso
- [x] Manejo de errores sin pantalla roja
- [x] Comentario TODO para fullName/email futuro
- [x] try/finally en Login.tsx para appleLoading
- [x] refreshSession() tras éxito
- [x] Google OAuth intacto
- [x] Email/password intacto
- [x] Scheme `homeplus://` sin cambios
- [x] Backend/Supabase dashboard sin tocar
- [x] TypeScript sin errores

## Comandos ejecutados

```bash
npx expo install expo-apple-authentication
npx tsc --noEmit
```

## Próximos pasos para validación

1. **EAS Build iOS:**
   ```bash
   eas build --platform ios
   ```
   Instalar en iPhone y probar flujo completo.

2. **Mac + Xcode:**
   - Abrir proyecto en Mac
   - Configurar signing/entitlements
   - Ejecutar en simulator o dispositivo real

3. **Supabase Dashboard:**
   - Verificar que Apple provider esté activo
   - Configurar Bundle ID correcto

## Referencias

- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Apple OAuth](https://supabase.com/docs/guides/auth/auth/apple)
- [React Native Platform](https://reactnative.dev/docs/platform)