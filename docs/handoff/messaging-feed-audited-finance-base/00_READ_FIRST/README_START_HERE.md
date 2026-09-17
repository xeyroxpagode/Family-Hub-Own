# HOMePLUS MESSAGING + FEED HANDOFF

Este paquete reúne:

- Product Truth;
- Master Cross Matrix;
- CM1/CM2;
- D1/D2/D3;
- donor/license evidence;
- branch snapshot;
- integration notes.

## IMPORTANTE

La auditoría **NO** describe automáticamente la versión del developer receptor.

La evidencia fue construida principalmente sobre:

```
finance-v1-unified
```

Master audit reference HEAD:

```
ad4f966
```

El receptor debe hacer:

```
SU CURRENT
→ TARGET CONGELADO
→ REAL DELTA
```

NO:

```
SU CURRENT
→ REINVESTIGAR PRODUCTO DESDE CERO
```

## Orden de lectura

1. `README_START_HERE` (este archivo)
2. `MASTER_MESSAGING_FEED_CROSS_MATRIX` (`01_PRODUCT_AND_MASTER/`)
3. `CM2` si trabaja frontend (`02_CROSS_MATRIX/`)
4. `CM1` si trabaja backend (`02_CROSS_MATRIX/`)
5. `D2` para Messaging/RNChat (`03_DEEP_RECON/`)
6. `D1` para Feed (`03_DEEP_RECON/`)
7. `D3` para Reliability/backend (`03_DEEP_RECON/`)
8. donor reports sólo como referencia (`04_DONOR_META/`)

## Regla de autoridad

```
PRODUCT TRUTH
>
MASTER
>
CM1/CM2
>
D1/D2/D3
>
donor code
```

Si hay contradicción, el documento de mayor autoridad gana.

## Estado del paquete

- Branch snapshot: `finance-v1-unified` @ `ad4f966` (`05_BRANCH_SNAPSHOT/BRANCH_STATE.md`).
- Delta de auditoría: `ad4f966..HEAD` sin commits (`05_BRANCH_SNAPSHOT/AUDIT_TO_CURRENT_DELTA.md`).
- Working tree: trabajo Finance no committeado clasificado (`05_BRANCH_SNAPSHOT/WORKTREE_STATE.md`).
- Exclusions: `05_BRANCH_SNAPSHOT/SNAPSHOT_EXCLUSIONS.md`.
- Manifest: `MANIFEST.md` (raíz del paquete).