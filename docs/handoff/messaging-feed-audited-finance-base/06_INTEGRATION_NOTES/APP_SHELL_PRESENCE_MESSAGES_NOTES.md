# APP SHELL / PRESENCE / MESSAGES — INTEGRATION NOTES

> Este documento **no** inventa un rediseño completo. Registra el estado/dirección conocida para coordinar con el developer que está trabajando Presence.

## CURRENT FRIEND WORK (según contexto de integración)

Actualmente existe una surface "Familia" con tabs:

- Personas
- Mapa
- Lugares

También existe otra screen separada:

- "Ubicación familiar"

con el mapa y el CTA "Compartir".

Esto representa duplicación conceptual.

## DIRECCIÓN ACTUAL DE INTEGRACIÓN

1. La funcionalidad real de "Ubicación familiar" debe terminar integrada en:

```
Familia
→ Mapa
```

No mantener dos superficies distintas para el mismo mapa/presence.

2. "Mapa" debe ser la surface principal de Presence dentro de Family.

Debe soportar:

- mapa;
- miembros;
- sharing state;
- CTA compartir/dejar de compartir;
- member markers/cards;
- acceso contextual al perfil.

3. "Lugares" permanece naturalmente dentro de:

```
Familia
→ Lugares
```

4. "Personas" puede seguir mostrando miembros/gestión/perfiles.

Los perfiles también deben poder abrirse contextualmente desde el mapa.

5. Household como dominio transversal NO necesita necesariamente una mega pantalla principal independiente.

Membership, invites, permissions y profiles pueden aparecer donde corresponda.

6. Actualmente Presence/Family está entrando desde More o rutas secundarias.

## DIRECCIÓN DE APP SHELL ACTUAL A EVALUAR/INTEGRAR

BOTTOM NAV actual tiene un slot utilizado por Inventario.

La dirección de integración actual es:

- sacar Family/Presence de More;
- darle un acceso principal en el segundo slot de bottom navigation, donde actualmente aparece Inventario;
- devolver Inventario a More.

Conceptualmente:

```
BOTTOM NAV

Home
Family / Presence
[central action, según shell actual]
Planner / Calendar
More

More:
Inventory
Finance
otros dominios secundarios
```

## IMPORTANTE

Esto **NO** significa que toda la navegación Family/Presence/Feed/Messages esté definitivamente congelada.

Feed + Messages crecieron mucho y todavía debe cerrarse el cluster global:

```
Family
Presence
People
Feed
Messages
Household
```

El merge NO debe improvisar esa arquitectura final.

Pero sí debe evitar mantener la duplicación:

```
Family > Mapa
+
Ubicación familiar separada
```