# DEVELOPER HANDOFF SUMMARY

## HOMePLUS Mensajes

```
MENSAJES
├── FEED
└── CONVERSACIONES
    ├── TOPIC GROUPS
    └── DIRECTS
```

One canonical messaging engine.

## Arquitectura

```
MessagingService
FeedService
MediaService
```

Cross-cutting:

```
Household/Permissions
Notifications
Search
Reliability
Realtime
```

## Freeze esencial

- Direct canónico 1:1 por pair+Household;
- Groups subset explícito;
- Group ACTIVE/CLOSED/REOPEN;
- Group full history;
- nuevo Group member recibe todo el historial como UNREAD;
- removed member pierde acceso;
- si Group manager abandona Household, responsabilidad pasa automáticamente al miembro activo del Group con mayor rango Household;
- rename sólo responsable actual;
- add/remove members = responsable + Global Permission aplicable;
- Direct Pin = cualquiera de ambos;
- Group Pin = responsable + Global Permission;
- reactions no reordenan inbox;
- mark-read según contenido efectivamente visible;
- Direct rejoin recupera mismo Direct;
- Feed reverse chronological;
- Human + System Social Posts;
- Feed comments usan Messaging engine;
- comment thread EAGER con Post;
- Feed comments V1: text/emoji/reply/reactions/edit/delete own;
- Feed comment media NO V1;
- borrar Human Post borra/invalida también sus comments;
- System Social se corrige/retracta manteniendo representación canónica;
- Message photo/video/file/voice REQUIRED V1;
- Feed multiple photos OR one video REQUIRED V1;
- RNChat primary UI candidate PENDING R1/R2;
- Planner Reliability primitives are primary reliability foundation;
- Supabase Realtime = transport, not authority.

## Nota de autoridad

La Master Cross Matrix (`01_PRODUCT_AND_MASTER/MASTER_MESSAGING_FEED_CROSS_MATRIX.md`) es la evidencia de auditoría de Mensajes/Feed y registra como abiertas varias decisiones Product (`Product Decision Register`, sección 16).

El "Freeze esencial" listado aquí representa las decisiones de producto más recientes registradas en el momento del handoff. Donde exista divergencia entre un item del Freeze esencial y el `Product Decision Register` de la Master, el Freeze esencial de este documento es posterior y prevalece como autoridad de producto.

## Estado de implementación

- Finance: estado más avanzado disponible del owner (ver `06_INTEGRATION_NOTES/FINANCE_CONTEXT.md`).
- Messaging / Feed: **no implementados**. Sólo existe el congelamiento de producto/arquitectura del handoff.
- Presencia/App Shell: ver `06_INTEGRATION_NOTES/APP_SHELL_PRESENCE_MESSAGES_NOTES.md`.

Este paquete no es una feature branch de Feed, y no implementa Feed ni Mensajes.