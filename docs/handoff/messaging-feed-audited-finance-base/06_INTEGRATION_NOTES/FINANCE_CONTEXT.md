# FINANCE CONTEXT

Finance en esta snapshot es el estado más avanzado disponible del owner principal al momento de preparar el handoff.

Sin embargo:

- Finance todavía tiene trabajo de auditoría/pulido pendiente;
- esta entrega **NO** declara Finance FINAL PASS;
- el objetivo del merge inicial es evitar perder el trabajo Finance más avanzado;
- Mensajes/Feed **no** debe modificar Finance internals.

## Regla de integración Feed ↔ Finance

Las futuras integraciones Feed↔Finance sólo pueden ocurrir:

```
Finance canonical fact
→ Social Relevance Rule
→ System Social Feed Post
```

Feed **nunca** crea ni modifica Finance facts.