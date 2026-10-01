# OAuth Development Build Plan: HomePlus

**Fecha:** 2026-06-30  
**Ejecución:** DEVBUILD-001  
**Estado:** Planificación inicial  

---

## 1. Estado Previo

### Scheme Anterior
- **Nombre app:** familyhub
- **Slug:** familyhub
- **Scheme:** familyhub://

### Scheme Nuevo
- **Nombre app:** homeplus
- **Slug:** homeplus
- **Scheme:** homeplus://

### Archivos Modificados
- `front/mi-front-limpio/app.json` - Cambiado de familyhub a homeplus

---

## 2. Estado de Dependencias

| Dependencia | Instalada | Notas |
|-------------|-----------|-------|
| expo-dev-client | NO | Requiere aprobación para instalar |
| expo-apple-authentication | NO | Se agregará cuando se implemente Apple |
| expo-linking | SÍ | Ya existe en package.json |

---

## 3. Redirect OAuth Final Esperado

```
homeplus://auth/callback
```

### Configuración Requerida
- **Google OAuth:** Supabase debe configurar redirect URI como `homeplus://auth/callback`
- **Apple Sign In:** Mismo flujo, volverá a AuthContext via deep link
- **AuthContext:** Ya implementa manejo de `auth/callback` path

---

## 4. Google OAuth

### Estado
- **Implementación:** Real (no prototipo)
- **Provider:** Supabase OAuth
- **Redirect:** homeplus://auth/callback

### Flujo Esperado
1. Usuario presiona "Sign in with Google"
2. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'homeplus://auth/callback' } })`
3. Google abre en browser → usuario autentica
4. Google vuelve a `homeplus://auth/callback?access_token=xxx&refresh_token=xxx&type=sso`
5. AuthContext `handleIncomingUrl()` detecta callback
6. `supabase.auth.setSession()` crea sesión
7. `loadAuthMe(access_token)` llama a `/api/auth/me`
8. `/api/auth/me` devuelve navegación decision
9. AppNavigator navega según `authMe.navigation.next`

### Próximos Pasos (GOOGLE-001)
- Configurar Google Cloud project
- Obtener OAuth 2.0 credentials
- Configurar Supabase Google provider
- Agregar botón Google en Login.tsx

---

## 5. Apple Sign In

### Estado
- **Implementación:** CONDICIONADO / PROTOTIPO TÉCNICO
- **Provider:** expo-apple-authentication
- **Decisión:** HomePlus SÍ agregará Apple Sign In

### Flujo de Validación (para ser Auth final)
1. Apple devuelve credential con `identityToken`
2. Supabase crea session mediante `signInWithIdToken({ provider: 'apple', token: identityToken })`
3. AuthContext detecta session mediante `onAuthStateChange`
4. `/api/auth/me` responde 200 con datos usuario
5. AppNavigator decide navegación basada en `authMe.navigation.next`
6. Logout limpia sesión correctamente
7. Cerrar y abrir app mantiene sesión (persistencia)

**Solo será Auth final si cumple TODOS los puntos anteriores.**

### Si NO llega a Supabase session
- Queda documentado como prototipo/bloqueado por configuración Apple
- UI muestra mensaje claro: "Apple Sign In requiere configuración adicional"
- No bloquea Google OAuth ni auth clásico

### Integración iOS productiva
- Puede requerir Apple Developer Program ($99/año)
- Requiere configuración Apple real (Service ID, Private Key, Key ID)
- Requiere prebuild iOS + Xcode + signing certificates

### Próximos Pasos (APPLE-001)
- Agregar `expo-apple-authentication` cuando se decida implementar
- Implementar botón Apple con feature detection
- Validar si funciona en development build sin cuenta Developer

---

## 6. Development Build

### Estado Actual
- **expo-dev-client instalado:** NO
- **eas.json existe:** NO

### Comando para Instalar (requiere aprobación)
```bash
cd front/mi-front-limpio
npx expo install expo-dev-client
```

### Comando para Iniciar Dev Build
```bash
npx expo start --dev-client
```

### Plan Android Development Build
```bash
# 1. Instalar expo-dev-client
npm install expo-dev-client

# 2. Prebuild con Android
npx expo prebuild --platform android

# 3. Ejecutar en emulador/dispositivo
npx expo run:android

# 4. O build APK (opcional)
eas build --platform android --profile development
```

### Plan iOS Development Build
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

### EAS Necesario?
- **No obligatorio:** Se puede build local con `expo run:android/ios`
- **Recomendado:** Para builds consistentes y CI/CD
- **Plan:** Empezar sin EAS, agregar después si se necesita

---

## 7. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Google no vuelve a app si scheme/redirect no coinciden | Media | Alto | Configurar exactamente `homeplus://auth/callback` en Google Cloud + Supabase |
| Expo Go no representa flujo final | Alta | Medio | Usar development build para testing real |
| Cambiar scheme requiere revisar Supabase/Google config | Alta | Medio | Documentar scheme nuevo en Supabase/Google Cloud |
| Apple devuelve credential pero no Supabase session | Media | Alto | Validar `signInWithIdToken` devuelve session antes de continuar |
| No crear sesión manual ni navegar directo a Home | Baja | Alto | Siempre usar flujo completo: session → /api/auth/me → navegación |

---

## 8. Verificación

### Comandos de Validación
```bash
cd front/mi-front-limpio

# TypeScript check
npx.cmd tsc --noEmit

# Expo start (limpiar cache)
npx expo start -c

# Si se instaló expo-dev-client:
npx expo start --dev-client
```

### Verificación Final
```bash
git status --short
```

---

## 9. Veredicto

| Componente | Estado |
|------------|--------|
| Scheme cambiado | ✓ Completado |
| Documentación actualizada | ✓ Completado |
| expo-dev-client instalado | ⏳ Pendiente (requiere aprobación) |
| expo-apple-authentication instalado | ⏳ Pendiente (fase futura) |
| eas.json creado | ⏳ Pendiente (opcional) |
| Validación tsc | ⏳ Por ejecutar |
| Validación expo start | ⏳ Por ejecutar |

**DEVBUILD listo para:** Continuar con instalación de expo-dev-client si se aprueba.

---

**Documento creado:** 2026-06-30  
**Última actualización:** 2026-06-30  
**Próxima revisión:** Al instalar expo-dev-client