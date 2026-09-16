# 04_LICENSE_CLASSIFICATION.md

## Clasificación de licencias por donor

### 01_Ahlan
- **License**: Apache-2.0
- **License file/path**: `LICENSE` (root)
- **Classification**: **CODE-ELIGIBLE**
- **Reason**: Licencia permisiva (Apache-2.0) compatible con uso comercial, modificación y distribución. Incluye cláusula de patentes. Requiere atribución y notificación de cambios.

### 02_Sharebook
- **License**: MIT
- **License file/path**: `LICENSE` (root)
- **Classification**: **CODE-ELIGIBLE**
- **Reason**: Licencia permisiva (MIT) — uso, copia, modificación, fusión, publicación, distribución, sublicencia y venta sin restricciones salvo inclusión de copyright y notice.

### 03_SocialSphere
- **License**: MIT (Expo copyright 2015-present)
- **License file/path**: `LICENSE` (root)
- **Classification**: **CODE-ELIGIBLE**
- **Reason**: Licencia permisiva (MIT) bajo copyright de Expo (650 Industries). Compatible con uso en producto comercial.

### 04_Framez
- **License**: NO LICENSE FOUND
- **License file/path**: (ninguno)
- **Classification**: **REFERENCE-ONLY**
- **Reason**: No se encontró archivo LICENSE ni cabecera de licencia en package.json. Sin licencia explícita, no se puede incorporar código sin riesgo legal. Solo referencia.

### 05_AgoraServer
- **License**: AGPL-3.0-only (server), Apache-2.0 (@agora-server/contract)
- **License file/path**: `LICENSE` (root, AGPL-3.0), `packages/contract/LICENSE` (Apache-2.0)
- **Classification**: **REFERENCE-ONLY** (server), **CODE-ELIGIBLE** (contract package)
- **Reason**: 
  - Server (`@agora/api`, `@agora/admin`, `services/scorer`): AGPL-3.0 requiere que cualquier obra derivada servida sobre red ofrezca código fuente completo. Incompatible con producto propietario cerrado.
  - Contract (`@agora-server/contract`): Apache-2.0 permisivo, superficie de tipos/zod compartida con SDK — elegible para adopción.

### 06_ReactNativeChat
- **License**: MIT
- **License file/path**: `LICENSE` (root)
- **Classification**: **CODE-ELIGIBLE**
- **Reason**: Licencia permisiva (MIT). Publicado en npm como `@kesha-antonov/react-native-chat`. Biblioteca UI — se usa como dependencia, no se copia código.

### 07_CircleRN
- **License**: MIT (Expo copyright 2015-present)
- **License file/path**: `LICENSE` (root)
- **Classification**: **CODE-ELIGIBLE**
- **Reason**: Licencia permisiva (MIT) bajo copyright de Expo. Compatible con uso comercial.

### 08_RealtimeChatMarketplace
- **License**: NO LICENSE FOUND
- **License file/path**: (ninguno)
- **Classification**: **REFERENCE-ONLY**
- **Reason**: No se encontró archivo LICENSE ni mención en package.json. Solo referencia.

### 09_ExpoOfflineFirstPOC
- **License**: NO LICENSE FOUND
- **License file/path**: (ninguno)
- **Classification**: **REFERENCE-ONLY**
- **Reason**: No se encontró archivo LICENSE ni mención en package.json. POC sin licencia explícita — solo referencia.

---

## Resumen

| Clasificación | Donors |
|---------------|--------|
| **CODE-ELIGIBLE** | Ahlan (Apache-2.0), Sharebook (MIT), SocialSphere (MIT), ReactNativeChat (MIT), CircleRN (MIT) |
| **CODE-ELIGIBLE (parcial)** | AgoraServer (@agora-server/contract — Apache-2.0) |
| **REFERENCE-ONLY** | Framez (sin licencia), RealtimeChatMarketplace (sin licencia), ExpoOfflineFirstPOC (sin licencia), AgoraServer server (AGPL-3.0) |

---

> **Nota**: Esta es una clasificación preventiva basada en evidencia de archivos en el repo. No constituye asesoría legal definitiva. Para uso en producto, validar con asesoría legal la compatibilidad de cada licencia con la estrategia de distribución de HOMePLUS.