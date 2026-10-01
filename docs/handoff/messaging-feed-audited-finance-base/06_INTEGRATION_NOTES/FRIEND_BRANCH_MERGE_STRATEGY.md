# FRIEND BRANCH — MERGE STRATEGY

## Objetivo

El developer receptor tiene SU propia versión/branch.

**NO** debe reemplazarla por esta branch.

Proceso esperado:

```
FRIEND BRANCH
+
handoff/messaging-feed-audited-finance-base
↓
MANUAL INTEGRATION
↓
INTEGRATED BASE
```

## Orden recomendado

1. crear backup branch de la branch del amigo;
2. registrar su HEAD/status;
3. mergear esta handoff branch;
4. resolver conflictos POR OWNERSHIP DE DOMINIO;
5. smoke test;
6. recién después crear feature branch Mensajes/Feed.

## Conflict ownership

### FINANCE

Priorizar esta snapshot branch, porque contiene el estado Finance más avanzado disponible del owner principal.

> Aclaración: Finance todavía está por entrar en otra auditoría/pulido. No afirmar FINANCE FINAL PASS.

### PRESENCE / MAPS / PLACES

Priorizar la versión del developer receptor, porque él es quien está desarrollando esas superficies.

### MESSAGING / FEED

Todavía usar este Product/Architecture freeze como autoridad.

### SHARED APP SHELL / NAVIGATION

MANUAL MERGE.

## Prohibido

NO resolver con:

```
git checkout --ours
git checkout --theirs
```

a nivel de archivos completos sin revisar.

## Especial cuidado

- navigation
- bottom bar
- More
- Family
- Feed routes
- Presence routes
- profiles
- Household switcher
- Search
- Notifications