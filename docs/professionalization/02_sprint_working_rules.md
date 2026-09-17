# HomePlus — Sprint Working Rules

**Fecha:** 27 de junio de 2026  
**Aplica a:** Phase 0 (Corrección) y Phase 1 (UI/UX Premium)  
**Objetivo:** Reglas simples para trabajar con OpenCode/Codex sin volver al modo urgencia.

---

## 1. Main Rule

```txt
Primero auditar.
Después planificar.
Después implementar en bloques chicos.
Después verificar.
Después commitear separado.
Después documentar.
```

**Nunca:**
- Implementar sin issue de Linear.
- Tocar backend/frontend/DB juntos salvo que el issue lo permita.
- Saltarse verificación.
- Commitear cambios grandes juntos.
- Implementar sin documentar decisiones.

---

## 2. Rules for OpenCode/Codex

### Reglas obligatorias

```txt
✅ No implementar sin issue.
   → Cada cambio debe tener un issue de Linear asociado.
   → Si no existe, crearlo antes de empezar.

✅ No tocar backend/frontend/DB juntos salvo que el issue lo permita.
   → Un issue = un área (backend O frontend O DB).
   → Si toca múltiples áreas, dividir en issues separados.

✅ No instalar dependencias sin autorización.
   → Verificar si la librería ya existe en el proyecto.
   → Si no existe, preguntar antes de instalar.

✅ No tocar .env.
   → .env es sagrado.
   → Si hay que agregar variables, preguntar primero.

✅ No tocar migraciones sin indicación explícita.
   → Migraciones de DB requieren autorización.
   → Si hay que crear/Modificar migración, confirmar primero.

✅ No borrar legacy sin confirmación.
   → Legacy puede estar usándose en código no descubierto.
   → Marcar con comentarios, no borrar.

✅ No activar realtime global.
   → Supabase Realtime/WebSockets requieren RLS sólido.
   → No activar sin issue explícito.

✅ No cambiar endpoints sin revisar frontend services.
   → Si cambias backend, verifica qué services de frontend lo usan.
   → Tests de integración obligatorios.

✅ No cambiar UI sin probar navegación.
   → Si modificas una pantalla, prueba navegar hacia/desde ella.
   → Verificar que no se rompa el flow.

✅ No cambiar Auth sin probar restore session.
   → Si tocas Auth, prueba: login → cerrar app → abrir → debe mantener sesión.
   → Verificar refresh de tokens.

✅ No cambiar Planner sin probar Home.
   → Si modificas Planner, verifica que HomeAdulto muestre los cambios.
   → Verificar que HomePlannerSections funcione.
```

### Reglas adicionales por área

**Backend:**
```txt
- No cambiar controllers sin verificar routes.
- No cambiar services sin verificar controllers.
- No modificar RPCs sin tests de RLS.
- Loguear errores 500 en consola (debug mode).
```

**Frontend:**
```txt
- No cambiar contexts sin verificar qué pantallas los usan.
- No modificar navigation types sin actualizar AppNavigator.
- No cambiar services API sin verificar endpoints backend.
- Mantener TypeScript strict — no usar `any` sin justificación.
```

**Database:**
```txt
- No crear tablas sin migración.
- No modificar RLS sin tests de aislamiento.
- No borrar columnas sin verificar queries.
- Documentar cada migración con comentario header.
```

---

## 3. Rules for Commits

### Formato de commit

Cada bloque debe tener commit separado.

**Formato sugerido:**

```txt
<tipo>: <descripción corta>

<detalle opcional si es necesario>
```

**Tipos válidos:**

| Tipo | Cuándo usar | Ejemplo |
|------|-------------|---------|
| `docs` | Documentación | `docs: agregar audit de HomeAdulto` |
| `ui` | UI/UX (frontend visual) | `ui: mejorar animación de sheets` |
| `feat` | Feature nueva | `feat: conectar HomeAdulto con planner` |
| `fix` | Bug fix | `fix: corregir scroll en PlannerCalendar` |
| `security` | Cambios de seguridad | `security: agregar log de operaciones críticas` |
| `refactor` | Refactor sin cambiar comportamiento | `refactor: limpiar código duplicado en auth` |
| `test` | Tests | `test: agregar tests de RLS para planner_tasks` |
| `chore` | Tareas de mantenimiento | `chore: actualizar dependencias` |

### Ejemplos de commits buenos

```txt
docs: crear 01_weekly_correction_decisions.md
- Agregar documento de decisiones semanales
- Definir prioridades P0/P1/P2/P3
- Listar issues iniciales para Linear

ui: descomentar schedule section en HomeAdulto
- Conectar con eventos reales de planner
- Agregar skeleton para loading state
- Mantener well

being section sin cambios

fix: corregir refresh duplicado en PlannerScreen
- Remover llamada redundante en useFocusEffect
- Mantener solo refresh() y changed()

security: verificar is_active_household_member en DB
- Confirmar que la función existe
- Agregar tests de aislamiento entre hogares
```

### Ejemplos de commits MALOS (no hacer)

```txt
❌ update code
❌ changes
❌ fix stuff
❌ wip
❌ agregar muchas cosas juntas
❌ backend y frontend juntos
❌ "arreglé varias cosas"
```

### Reglas de commit

```txt
✅ Un commit = un cambio conceptual.
✅ Commits chicos son mejores que commits grandes.
✅ Mensaje claro y descriptivo.
✅ No mezclar tipos (ej: docs + feat en el mismo commit).
✅ No mezclar áreas (ej: backend + frontend en el mismo commit).
✅ Verificar git status antes de commitear.
```

---

## 4. Rules for Verification

### Comandos base Windows/PowerShell

**Importante:** No usar `&&`. PowerShell no lo soporta.

**Frontend:**

```powershell
cd front\mi-front-limpio
npx.cmd tsc --noEmit
```

Si hay errores de TypeScript:
- Corregir antes de commitear.
- No usar `any` para silenciar errores.

**Backend:**

```powershell
cd backend
npm run lint
```

Si no existe lint:

```powershell
cd backend
npm test
```

Si no hay tests:
- Verificar que el código al menos compile.
- Probar endpoints manualmente con Postman/curl.

**Supabase (solo si se tocaron migraciones):**

```powershell
cd supabase
supabase db reset
```

```powershell
supabase db lint
```

Si no existe `db lint`:
- Verificar migraciones manualmente en Supabase Studio.
- Probar queries de verificación.

**Git:**

```powershell
git status
```

Verificar:
- Solo archivos esperados están modificados.
- No hay archivos temporales o `.env`.
- Documentación nueva aparece correctamente.

### Checklist de verificación por área

**Frontend UI:**
```txt
□ tsc --noEmit pasa sin errores
□ Navegación hacia/desde pantalla funciona
□ Loading states se muestran correctamente
□ Error states se muestran con errores simulados
□ Empty states se muestran con datos vacíos
□ Animaciones son suaves (sin lag)
□ Haptics no son excesivos
```

**Backend API:**
```txt
□ Endpoints responden correctamente (200/201/400/401/403/404/500)
□ Errores 500 se loguean en consola
□ Validaciones de input funcionan
□ RLS policies se aplican (tests manuales)
□ Service role no se expone en respuestas
```

**Database:**
```txt
□ Migraciones aplican sin errores
□ RLS policies se crean correctamente
□ Funciones RPC se ejecutan
□ FKs no se rompen
□ Índices se crean
```

---

## 5. Definition of Done

Un issue está **Done** solo si:

```txt
✅ Se hizo lo pedido en el issue.
✅ No se tocó nada fuera de alcance.
✅ Pasó verificación (tsc, lint, tests, etc.).
✅ Tiene commit separado si tocó código.
✅ Tiene documentación si tomó decisiones.
✅ Gabriel revisó si afecta UX/producto.
✅ Compañero 1 revisó si afecta backend/DB/security.
```

### Checklist de Done

**Para issues de código:**
```txt
□ Código implementado según issue.
□ Tests pasan (si existen).
□ Verificación pasa (tsc, lint, etc.).
□ Commit separado creado.
□ Git status limpio (solo archivos del issue).
□ Documentación actualizada si aplica.
□ Revisión de Gabriel (UX/producto).
□ Revisión de compañero 1 (backend/DB/security).
```

**Para issues de documentación:**
```txt
□ Documento creado/modificado.
□ Estructura según template.
□ Decisiones claras y justificadas.
□ Revisión de Gabriel.
□ Commit separado (docs:).
```

**Para issues de auditoría:**
```txt
□ Auditoría completada.
□ Hallazgos documentados.
□ Recomendaciones claras.
□ Riesgos identificados.
□ Revisión de Gabriel.
□ Commit separado (docs:).
```

---

## 6. Rules for Phase 1 UI/UX

### Reglas especiales para Phase 1

Phase 1 busca **diseño final premium**, no solo consistencia.

```txt
✅ Las animaciones deben ser suaves y útiles.
   → No animar por animar.
   → Cada animación debe tener propósito (feedback, guía, delight).

✅ Haptics sí, pero con criterio.
   → Vibración sutil en acciones importantes (guardar, eliminar).
   → No vibrar en cada tap.
   → Usar `Haptics.selectionAsync()` para selects, `Haptics.notificationAsync()` para completaciones.

✅ Sonidos solo si se decide y se pueden desactivar.
   → Si se agregan sonidos, deben tener toggle de mute.
   → Sonidos deben ser sutiles, no intrusivos.

✅ Gestos solo donde no rompan scroll ni generen acciones accidentales.
   → Swipe-to-delete solo en listas cortas.
   → Pull-to-refresh ya existe, mantener.
   → Tap-to-edit es seguro.

✅ Sheets deben sentirse fluidos.
   → Slide up con spring (damping, stiffness ajustados).
   → Backdrop fade in/out.
   → Close button visible.
   → Keyboard dismiss on backdrop tap.

✅ No tocar backend.
   → Phase 1 es solo UI/UX.
   → No cambiar endpoints, controllers, services.

✅ No tocar DB.
   → No crear/migrar tablas.
   → No modificar RLS.

✅ No cambiar endpoints.
   → Frontend services pueden adaptarse, pero endpoints son fijos.

✅ No crear features nuevas reales.
   → Solo mejorar UX de features existentes.
   → No agregar Inventory, Finance, Geni, etc.

✅ Separar mock/demo de datos reales.
   → Planner Goals: marcar como "Próximamente" o implementar mínimo.
   → HomeAdulto: descomentar y conectar con datos reales.
   → Wellbeing/Presence: decidir persistencia o remoción.
```

### Animaciones permitidas

| Elemento | Animación | Haptic | Notas |
|----------|-----------|--------|-------|
| Sheet open | Slide up con spring | `selectionAsync()` | Suave, sin overshoot |
| Sheet close | Fade out + slide down | — | Rápido, sin delay |
| Button press | Scale down 0.95 | `selectionAsync()` | Feedback inmediato |
| Complete task | Checkmark animate | `successAsync()` | Celebración sutil |
| Delete item | Fade out + slide | `selectionAsync()` | Confirmar antes |
| Pull-to-refresh | Spinner rotate | — | Ya existe, mantener |
| Tab switch | Fade/slide | — | Sutil, rápido |
| Toast appear | Fade in + slide up | `successAsync()` o `warningAsync()` | 2.2s visible |

### Haptics — Cuándo usar

| Acción | Haptic | Cuándo |
|--------|--------|--------|
| Tap botón | `selectionAsync()` | Siempre |
| Toggle switch | `selectionAsync()` | Siempre |
| Sheet open | `selectionAsync()` | Opcional |
| Task complete | `successAsync()` | Siempre |
| Task verify | `successAsync()` | Siempre |
| Delete confirm | `warningAsync()` | Antes de borrar |
| Error | `notificationAsync('error')` | Siempre |
| Success toast | `successAsync()` | Opcional |

---

## 7. Things Forbidden During Sprint

### Lista clara de cosas prohibidas

```txt
❌ Reescribir toda la app.
   → Solo cambios puntuales, no refactor masivo.

❌ Mezclar OAuth con realtime/RLS/Planner.
   → OAuth es Phase 2+. No tocar hasta terminar Phase 1.

❌ Integrar Inventory sin auditoría.
   → Inventory requiere diseño completo primero.

❌ Borrar legacy sin pruebas.
   → Verificar con git history y DB queries antes de borrar.

❌ Usar service role como comodín.
   → Service role solo para RPCs específicos.
   → No usar para queries generales.

❌ Crear pantallas demo sin marcarlas.
   → Si es demo/mock, debe tener badge visible o estar en ruta separada.

❌ Dejar mocks mezclados con real.
   → MOCK_ACTIVITY, Planner Goals: remover o marcar claramente.

❌ Saltar verificación.
   → tsc, lint, tests son obligatorios.
   → No commitear sin verificar.

❌ Cambiar Auth sin probar restore session.
   → Siempre probar: login → cerrar app → abrir → sesión mantenida.

❌ Cambiar Planner sin probar Home.
   → HomeAdulto debe mostrar cambios de Planner.

❌ Activar realtime global.
   → Supabase Realtime requiere RLS sólido primero.

❌ Instalar 10 dependencias nuevas.
   → Evaluar si ya existen en el proyecto.
   → Preguntar antes de instalar.

❌ Modificar .env.
   → .env es sagrado.
   → Si hay que agregar variables, preguntar.

❌ Crear migraciones sin autorización.
   → DB schema changes requieren aprobación.

❌ Cambiar endpoints sin avisar.
   → Frontend services dependen de endpoints.
   → Coordinar cambios.
```

---

## 8. Closing Rule

### Cada bloque cierra con

Al finalizar cada issue/bloque de trabajo, se debe entregar:

```txt
📝 Resumen de cambios:
   → Qué se hizo, qué archivos se modificaron.

🖥️ Comandos ejecutados:
   → tsc, lint, tests, git commands.

✅ Resultado de verificación:
   → Pasó/No pasó.
   → Errores encontrados (si los hay).

🐛 Bugs encontrados:
   → Lista de bugs descubiertos durante el trabajo.

🐛 Bugs corregidos:
   → Lista de bugs fixeados (si los hay).

⚠️ Limitaciones:
   → Qué no se pudo hacer, por qué.

➡️ Siguiente paso recomendado:
   → Qué issue viene después, o qué se recomienda hacer.
```

### Template de cierre de bloque

```markdown
## Cierre de bloque: <ISSUE-ID> — <Título>

### Resumen de cambios
- Archivo 1: cambio X
- Archivo 2: cambio Y
- Documento Z: creado/modificado

### Comandos ejecutados
```powershell
cd front\mi-front-limpio
npx.cmd tsc --noEmit

cd backend
npm run lint

git status
```

### Resultado de verificación
- TypeScript: ✅ Pasó / ❌ Errores (listar)
- Lint: ✅ Pasó / ❌ Errores (listar)
- Tests: ✅ Pasó / ❌ Errores (listar)
- Git status: ✅ Limpio / ❌ Archivos inesperados

### Bugs encontrados
1. Bug A en pantalla X — descripción
2. Bug B en service Y — descripción

### Bugs corregidos
1. Fix A para bug X — descripción
2. Fix B para bug Y — descripción

### Limitaciones
- No se pudo hacer Z porque...
- Queda pendiente W porque...

### Siguiente paso recomendado
- Issue siguiente: <ISSUE-ID> — <Título>
- O: Verificar con Gabriel antes de continuar
- O: Esperar decisión sobre X
```

---

## 9. Quick Reference

### Comandos útiles

```powershell
# Verificar frontend
cd front\mi-front-limpio
npx.cmd tsc --noEmit

# Verificar backend
cd backend
npm run lint

# Verificar git
git status
git diff

# Listar archivos modificados
git status --short
```

### Estructura de carpetas

```txt
HomePlus/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── lib/
│   │   └── config/
│   └── sql/
├── front/mi-front-limpio/
│   ├── screens/
│   ├── components/
│   ├── context/
│   ├── services/
│   ├── navigation/
│   └── utils/
├── supabase/
│   └── migrations/
└── docs/
    └── professionalization/
        ├── 00_current_state_deep_audit.md
        ├── 01_weekly_correction_decisions.md
        └── 02_sprint_working_rules.md
```

### Contactos para revisiones

| Tipo de revisión | Responsable | Cuándo |
|------------------|-------------|--------|
| UX/Producto | Gabriel | Antes de commitear cambios de UI |
| Backend/DB/Security | Compañero 1 | Antes de commitear cambios de backend/DB |
| Documentación | Gabriel | Antes de commitear docs importantes |

---

## 10. Summary

### Reglas de oro

```txt
1. Primero auditar, después implementar.
2. Un issue = un cambio conceptual.
3. Verificar siempre (tsc, lint, tests).
4. Commits chicos y descriptivos.
5. Documentar decisiones.
6. No tocar backend/frontend/DB juntos.
7. No borrar legacy sin confirmación.
8. No activar realtime sin RLS sólido.
9. Phase 1 es UI/UX — no tocar backend/DB.
10. Cerrar cada bloque con resumen completo.
```

### Violaciones = Bloqueo

Si se viola una regla:

1. **Revertir cambios** si es crítico.
2. **Documentar violación** en el cierre de bloque.
3. **Corregir antes de continuar**.
4. **No repetir**.

---

**Fin del documento de reglas de sprint.**

---

## Verificación final

Ejecutar:

```powershell
git status
```

Debe mostrar:

```txt
docs/professionalization/00_current_state_deep_audit.md (nuevo)
docs/professionalization/01_weekly_correction_decisions.md (nuevo)
docs/professionalization/02_sprint_working_rules.md (nuevo)
```

Solo documentación nueva o modificada. Nada de código.

---

## Resultado esperado de PRO-002

Al finalizar deben existir:

```txt
✅ docs/professionalization/00_current_state_deep_audit.md
✅ docs/professionalization/01_weekly_correction_decisions.md
✅ docs/professionalization/02_sprint_working_rules.md
```

Y deben responder:

- ✅ Qué se corrige esta semana: Core UI/UX, RLS, Planner conectado, HomeAdulto desbloqueado.
- ✅ Qué queda fuera: OAuth, Inventory, Finance, Geni, SOS, Realtime, borrar legacy.
- ✅ Qué orden seguimos: RLS → Planner → UI/UX → Auth hardening → Audit log → Decisiones.
- ✅ Qué entra en Phase 1: Auth, Home, Planner, Household/Members, Profile básico.
- ✅ Qué tareas iniciales van a Linear: UIX-001 a UIX-007, SEC-001, PLAN-001, AUTH-001, etc.
- ✅ Qué reglas debe seguir Codex/OpenCode: Ver `02_sprint_working_rules.md`.
- ✅ Cómo se verifica cada bloque: Ver `02_sprint_working_rules.md` — Section 4.