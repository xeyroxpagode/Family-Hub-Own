# Checklist: GOOGLE-001 — Google OAuth Provider Setup

**Fecha:** 2026-06-30  
**Estado:** Pendiente  
**Pre-requisito:** DEVBUILD-001 commiteado ✓

---

## Antes de Empezar

- [ ] Ejecutar `git status --short` → working tree limpio
- [ ] Confirmar DEVBUILD-001 commiteado
- [ ] No tocar código funcional (Login.tsx, AuthContext, AppNavigator)
- [ ] No tocar backend
- [ ] No tocar Supabase DB ni migraciones
- [ ] No tocar Apple
- [ ] No tocar Planner, Household, Home, Inventory ni Realtime

---

## 1. Google Cloud Console

### 1.1 Crear/Seleccionar Proyecto
- [ ] Entrar a [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Crear proyecto nuevo o seleccionar existente
- [ ] Anotar nombre del proyecto: _______________

### 1.2 OAuth Consent Screen
- [ ] Ir a "APIs & Services" → "OAuth consent screen"
- [ ] Configurar OAuth consent screen:
  - [ ] User Type: External (o Internal según corresponda)
  - [ ] App name: `HomePlus`
  - [ ] User support email: _______________
  - [ ] Developer contact email: _______________
  - [ ] Save

### 1.3 Scopes
- [ ] Ir a "Scopes"
- [ ] Agregar scopes mínimos:
  - [ ] `openid`
  - [ ] `email`
  - [ ] `profile`
- [ ] Save

### 1.4 Crear Credenciales OAuth 2.0
- [ ] Ir a "Credentials"
- [ ] Click "Create Credentials" → "OAuth client ID"
- [ ] Application type: **Native** (o "Desktop app")
- [ ] Name: `homeplus-mobile`
- [ ] Create

### 1.5 Obtener Credenciales
- [ ] Copiar Client ID (termina en `apps.googleusercontent.com`)
- [ ] Copiar Client Secret (si se genera)
- [ ] Guardar credenciales en lugar SEGURO (no repo, no frontend)
- [ ] NO pegar en código
- [ ] NO subir a Git

---

## 2. Supabase Dashboard

### 2.1 Ir a Authentication Providers
- [ ] Entrar a [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Seleccionar proyecto HomePlus
- [ ] Ir a "Authentication" → "Providers"
- [ ] Abrir "Google"

### 2.2 Configurar Google Provider
- [ ] Enable Google provider: **Sí**
- [ ] Pegar Client ID: _______________ (sí/no)
- [ ] Pegar Client Secret: _______________ (sí/no)
- [ ] Site URL: revisar que sea correcta
- [ ] Save

### 2.3 Configurar Redirect URLs
- [ ] Ir a "URL Configuration" (o "Redirect URLs")
- [ ] Agregar redirect URI:
  - [ ] `homeplus://auth/callback`
- [ ] Save

### 2.4 Verificaciones
- [ ] Google provider queda activo: sí/no
- [ ] NO se usó service_role
- [ ] NO se tocó Supabase DB
- [ ] NO se tocaron migraciones

---

## 3. Documentación

### 3.1 Crear Documento
- [ ] Crear: `docs/professionalization/oauth_google_setup.md`
- [ ] Incluir:
  - [ ] Estado: configurado/parcial/bloqueado
  - [ ] Google Cloud: proyecto usado
  - [ ] OAuth consent screen: sí/no
  - [ ] Tipo de credencial creada
  - [ ] Scopes usados
  - [ ] Client ID obtenido: sí/no
  - [ ] Client Secret obtenido: sí/no (sin mostrarlo)
  - [ ] Supabase Google provider activo: sí/no
  - [ ] Client ID cargado: sí/no
  - [ ] Client Secret cargado: sí/no (sin mostrarlo)
  - [ ] Redirect configurado
  - [ ] Site URL revisada
  - [ ] Supabase DB no tocada
  - [ ] Redirect final: `homeplus://auth/callback`
  - [ ] Seguridad: Client Secret no en frontend/repo, service_role no usado, .env no tocado
  - [ ] Riesgos documentados
  - [ ] Próximo paso: GOOGLE-002

---

## 4. Verificación Final

### 4.1 Git Status
- [ ] Ejecutar `git status --short`
- [ ] Esperado: solo `?? docs/professionalization/oauth_google_setup.md`

### 4.2 Reporte Final
- [ ] Google Cloud configurado: sí/parcial/bloqueado
- [ ] Supabase Google provider configurado: sí/parcial/bloqueado
- [ ] Redirect configurado
- [ ] Client ID guardado fuera del repo
- [ ] Client Secret guardado fuera del repo
- [ ] Archivos modificados: _______________
- [ ] Confirmación: no se tocó .env
- [ ] Confirmación: no se tocó frontend funcional
- [ ] Confirmación: no se tocó backend
- [ ] Resultado git status: _______________

### 4.3 Veredicto
- [ ] GOOGLE-001: **listo / parcial / bloqueado**

---

## 5. Seguridad Recordatorio

**PROHIBIDO:**
- [ ] NO Client Secret en frontend
- [ ] NO Client Secret en repo
- [ ] NO service_role key
- [ ] NO tokens en logs
- [ ] NO .env con secretos
- [ ] NO capturas con secretos visibles

---

**Checklist completada:** ___/___  
**Fecha final:** _______________  
**Próximo paso:** GOOGLE-002 — Google OAuth frontend implementation