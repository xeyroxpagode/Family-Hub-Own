# HOMePLUS — FINANCE PRODUCT FREEZE V1.1

**Documento:** `HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.1.md`  
**Módulo:** Finance  
**Versión:** 1.1  
**Fecha de cierre:** 2026-08-12  
**Estado:** `MODULE_PRODUCT_AND_FRONTEND_DEFINITION_CLOSED`

```text
PRODUCT TRUTH                 FROZEN
FUNCTIONAL BEHAVIOR           FROZEN
EXPERIENCE MODEL              FROZEN
INFORMATION ARCHITECTURE      FROZEN
FRONTEND SURFACE MODEL        FROZEN
PERMISSION ROLE PACKAGES      DEFERRED TO GLOBAL PERMISSIONS PASS
CROSS-MODULE COMPOSITION      DEFERRED TO CROSS-MODULE INTEGRATION PASS
IMPLEMENTATION                NOT AUTHORIZED BY THIS DOCUMENT ALONE
```

---

# 00. DOCUMENT STATUS & AUTHORITY

Este documento **reemplaza y supersede** `HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md` como Product Truth vigente de Finance.

V1.1 conserva las invariantes económicas válidas de V1.0 y consolida la revisión posterior basada en:

- situaciones reales de uso;
- user intents;
- progressive complexity;
- error prevention;
- experiencia Personal / Household;
- Information Architecture;
- Surface Architecture;
- stress test de escenarios;
- Current Frontend UX Audit;
- Finance Frontend Current Baseline.

Si un documento anterior contradice V1.1 respecto de Finance, manda V1.1.

Este documento congela **qué debe hacer Finance y cómo debe presentarse conceptualmente al usuario**.

No congela:

- tablas;
- migrations;
- endpoints;
- RPCs;
- jobs;
- triggers;
- nombres técnicos de schemas;
- implementación concreta de sheets;
- librerías;
- componentes técnicos exactos;
- paquetes finales de permisos por rol;
- framework genérico de integración cross-module.

La implementación sigue obligada a:

```text
PRODUCT TRUTH V1.1
→ CURRENT CAPABILITY
→ TARGET CAPABILITY
→ REAL GAP
→ MINIMAL INTEGRATION
```

Los gaps y planes calculados contra V1.0 deben revisarse únicamente donde V1.1 cambió Target.

---

# 01. MODULE DEFINITION

## 01.1 Mission

Finance es la **perspectiva económica de la vida personal y del hogar dentro de HOMePLUS**.

Permite:

- registrar de forma simple lo que ocurre con el dinero;
- comprender cómo está el usuario o el Household durante un período;
- anticipar y resolver pagos;
- controlar presupuestos;
- seguir saldos cuando el usuario decida utilizar Accounts;
- corregir errores sin destruir historia real;
- representar Personal Finance y Household Finance como scopes distintos;
- relacionar en el futuro consecuencias económicas con situaciones canónicas de otros módulos;
- hacerlo sin obligar al usuario a administrar un sistema financiero complejo.

Finance NO es:

- un banco;
- una fintech;
- una app de trading;
- contabilidad empresarial;
- software impositivo;
- payroll;
- sistema de facturación empresarial;
- portfolio de inversiones;
- credit scoring;
- Splitwise;
- reemplazo de la banca privada del usuario.

## 01.2 Product statement

```text
El usuario piensa en situaciones.
HOMePLUS traduce esas situaciones
a operaciones financieras correctas.
```

Finance no exige que el usuario piense en:

```text
Transaction objects
Occurrences
Balance Adjustments
Refund models
Report models
Financial Context internals
```

La experiencia habla en términos como:

```text
Gasté
Recibí dinero
Moví dinero
Tengo que pagar
Ya pagué
Me devolvieron dinero
Lo anoté mal
Mi saldo no coincide
¿Cómo vengo?
¿En qué estoy gastando?
```

## 01.3 Core questions

Finance debe responder, según scope, período, currency y permisos:

```text
¿Cuánto gasté / gastamos?
¿Cuánto ingresó?
¿Cuál es el neto del período?
¿Cómo voy respecto del presupuesto?
¿Cuánto queda del presupuesto?
¿En qué se está yendo la plata?
¿Qué pagos vienen?
¿Qué pagos están vencidos?
¿Ya se pagó esta obligación?
¿Qué pasó con mi dinero?
¿Dónde está mi dinero registrado, si uso Accounts?
¿Cómo cambió el gasto respecto del período anterior?
¿Cuánto costó una situación relacionada, cuando exista integración cross-module?
```

## 01.4 Success condition

Finance cumple su misión cuando:

- un gasto cotidiano se registra con muy poca fricción;
- Account y Category son opcionales en Expense/Income;
- Personal Finance permanece privada por defecto;
- Household Finance no absorbe finanzas personales;
- Source y Financial Context pueden diferir;
- Transfer nunca se cuenta como Income/Expense;
- Budget informa y acompaña, nunca bloquea un gasto real;
- un pago esperado nunca se confunde con un pago realizado;
- Attention/Notifications puede llevar al usuario directamente a resolver un pago;
- correcciones/refunds preservan estadísticas correctas;
- errores de carga son recuperables;
- multicurrency nunca inventa conversiones;
- Finance funciona sin IA;
- el usuario no necesita recorrer múltiples subsistemas para resolver una intención simple.

---

# 02. EXPERIENCE PRINCIPLES

## FIN-EXP-001 — Situation-first

```text
REAL-WORLD SITUATION
→ USER INTENT
→ HOMePLUS RESOLUTION
→ CANONICAL FINANCE EFFECT
```

## FIN-EXP-002 — User language first

La UI usa lenguaje humano; las operaciones financieras internas no gobiernan la navegación.

## FIN-EXP-003 — Progressive complexity

```text
simple case
→ simple interaction

advanced case
→ advanced controls only when needed
```

## FIN-EXP-004 — Minimum necessary interaction

La complejidad del dominio pertenece al sistema.

La interfaz pide únicamente la información que el usuario debe aportar para expresar truth correctamente.

## FIN-EXP-005 — Current intention over entity taxonomy

La importancia técnica de una capability no determina su prominencia visual.

## FIN-EXP-006 — Error prevention is Core UX

Finance debe proteger especialmente contra:

- monto mal ingresado;
- Account incorrecta;
- Context incorrecto;
- doble submit;
- interpretación incorrecta de Refund/Correction;
- zero usado como unknown;
- suma silenciosa de currencies incompatibles.

## FIN-EXP-007 — Recovery without fear

Equivocarse no debe destruir historia ni obligar a recrear todo.

## FIN-EXP-008 — No configuration prerequisite

Finance debe producir valor antes de que el usuario configure Accounts, Budget o Categories propias.

## FIN-EXP-009 — Configure once, benefit repeatedly

Budget, Accounts y recurring Payments son configuración ocasional que debe producir valor continuo.

## FIN-EXP-010 — Scroll is for more of the same

```text
GOOD SCROLL
→ more movements
→ more payments

BAD SCROLL
→ buscar otra intención escondida debajo de otras secciones
```

## FIN-EXP-011 — Cross-module patience

Las relaciones cross-module pueden definirse semánticamente ahora, pero su composición se implementa después de estabilizar los module cores involucrados.

No crear anticipadamente un universal workflow engine.

---

# 03. FINANCE EXPERIENCE LOOPS

Finance reconoce seis loops humanos.

## A. Registrar

```text
Pasó algo con mi dinero.
```

Incluye:

- Expense;
- Income;
- Transfer.

Frecuencia: muy alta.  
Fricción objetivo: mínima.

## B. Resolver

```text
Tengo algo económico pendiente.
```

Incluye:

- one-time payments;
- recurring payments;
- due;
- overdue;
- payment confirmation.

## C. Entender

```text
Quiero saber cómo estoy.
```

Incluye:

- current-period spending;
- income;
- net;
- budget;
- category composition;
- period comparison.

## D. Corregir

```text
Lo registrado no refleja correctamente lo que ocurrió.
```

HomePlus traduce:

```text
Lo anoté mal        → Correction
Me devolvieron      → Refund
Nunca ocurrió       → Trash
Mi saldo real es otro → Balance Correction
```

## E. Configurar

Incluye:

- Accounts;
- Budget;
- Categories;
- recurring Payments.

Es un loop de menor frecuencia.

## F. Connected Resolution — deferred

```text
Una situación del hogar
→ una resolución
→ múltiples efectos canónicos
```

Su implementación queda diferida al Cross-Module Integration Pass.

---

# 04. FINANCIAL CONTEXT

V1.1 congela:

```text
PERSONAL
HOUSEHOLD
```

## 04.1 Personal

Personal Finance:

- pertenece al User;
- es owner-only por defecto;
- no pertenece al Household;
- sobrevive al cambio de Household activo;
- puede coexistir con múltiples memberships;
- no se vuelve visible por ser Coordinador, Adulto, pareja o miembro del mismo Household.

Puede contener:

- Personal Accounts;
- Personal Expenses;
- Personal Income;
- Personal Budget;
- Personal Payments.

## 04.2 Household

Household Finance pertenece al Household activo.

Puede contener:

- Household Accounts;
- Household Expenses;
- Household Income;
- Household Budget;
- Household Payments;
- shared funds;
- household services;
- taxes;
- purchases;
- repairs;
- household savings Accounts.

## 04.3 Context selector UX

En Finance:

```text
Personal ▾
```

o:

```text
Familia García ▾
```

Tap:

```text
╭─────────────────────────────╮
│ Finanzas de                 │
│                             │
│ ● Personal                  │
│                             │
│ ○ Familia García            │
╰─────────────────────────────╯
```

Cambiar Financial Context:

- cambia el scope de Finance;
- no cambia el Household global de la App Shell;
- no requiere Save/Confirm;
- se mantiene al cambiar entre las tabs de Finance.

## 04.4 Entity scope

Cuando se abre una entidad existente, su Context ya está fijado.

No se muestra un selector global editable dentro de su Detail.

## 04.5 Creation inheritance

Las entidades creadas desde una surface scoped heredan el Financial Context activo cuando semánticamente corresponde.

Ejemplo:

```text
Personal
→ Cuentas
→ +
→ Personal Account
```

```text
Familia García
→ Cuentas
→ +
→ Household Account
```

No volver a preguntar Context sin necesidad.

---

# 05. PRIVACY

## 05.1 Defaults

```text
PERSONAL
→ owner only

HOUSEHOLD
→ authorized Household members
```

## 05.2 Source does not expose Personal Account

Si una Personal Account financia un Household Expense, Household puede conocer:

- Amount;
- Currency;
- Date;
- Description;
- Category;
- actor/payer;
- que fue financiado personalmente.

No obtiene automáticamente:

- nombre de Personal Account;
- balance;
- otros movimientos;
- ingresos;
- ahorros.

## 05.3 Cross-module privacy

Home, Attention, Search, Notifications, Geni y futuras relaciones cross-module respetan exactamente la misma autoridad.

## 05.4 Permission packages

Finance define capabilities.

El mapping final de Coordinador / Adulto / Adolescente / Niño pertenece al Global Permissions Pass.

No se congela en este documento.

---

# 06. ACCOUNT

## 06.1 Definition

Account representa un contenedor financiero que el usuario decide seguir en HomePlus.

Puede representar:

- banco;
- billetera virtual;
- efectivo;
- caja;
- fondo común;
- ahorro;
- tarjeta de crédito simple;
- otro contenedor útil.

No requiere bank sync.

## 06.2 Account types V1

Frontend/product reconoce:

```text
ACCOUNT
CREDIT_CARD
```

`CREDIT_CARD` es un **tipo/presentación de Account**, no un subsystem independiente.

Otros usos como efectivo, ahorro o billetera continúan siendo Accounts normales con Name elegido por el usuario.

## 06.3 Core properties

```text
Type
Name
Currency
Scope
```

Opcional:

```text
Opening / Current Balance declaration
```

## 06.4 Account optionality

Income y Expense pueden existir sin Account.

```text
Expense
Account: none
→ Reports/Budget YES
→ Account Balance no effect
```

Transfer requiere Source y Destination Accounts.

## 06.5 Unknown balance

```text
UNKNOWN
≠
0
```

No informar balance jamás se interpreta como zero.

## 06.6 Balance anchor

Known Balance requiere un punto confiable.

```text
Balance Anchor
+ movements after anchor
= Current Known Balance
```

## 06.7 Negative balance

Es válido.

Permite semántica interna de crédito simple.

## 06.8 Account lifecycle

```text
ACTIVE
↕
ARCHIVED
```

Archived:

- deja de ofrecerse normalmente para nuevos movimientos;
- conserva balances;
- conserva Transactions;
- conserva relaciones;
- puede reactivarse.

**Account es la entidad Finance principal que usa Archive en V1.1.**

## 06.9 Currency integrity

Una Account con historia financiera no cambia Currency.

Para otra Currency se crea otra Account.

---

# 07. CREDIT CARD V1

Credit Card es solamente un tipo de Account en V1.

## 07.1 UX presentation

Una Account normal presenta:

```text
Saldo actual
```

Una Credit Card presenta:

```text
Deuda actual
```

El frontend no necesita enseñar un balance negativo para explicar deuda.

## 07.2 Purchase

```text
Credit Card
→ Expense
→ card debt increases
```

El Expense consume Budget y aparece una sola vez.

## 07.3 Card payment

```text
Bank Account
→ Transfer
→ Credit Card
```

No crea un segundo Expense.

## 07.4 Future

Seguimiento específico de:

- cierre;
- vencimiento;
- resumen;
- decisión de modalidad de pago;
- pago mínimo/total;
- richer card semantics;

queda Future.

---

# 08. BALANCE CORRECTION

El usuario puede declarar cuánto tiene realmente.

La experiencia muestra:

```text
HomePlus muestra     $125.000
Realmente tengo      $119.400
Diferencia            -$5.600
```

La corrección:

```text
Account Balance   YES
Account History   YES
Income            NO
Expense           NO
Budget            NO
```

No se inventa una causa económica.

---

# 09. TRANSACTION

Primitives canónicas:

```text
INCOME
EXPENSE
TRANSFER
```

Frontend:

```text
Ingreso
Gasto
Transferencia / Mover dinero
```

---

# 10. INCOME

Income significa dinero externo que realmente ingresó al Financial Context.

Puede ser Personal o Household.

Aportes Personal → Household no son Income Household.

---

# 11. EXPENSE

Expense significa dinero realmente consumido/pagado.

Core:

```text
Amount
Currency
Context
Date
```

Opcional:

```text
Description
Category
Account
Notes
Document
Related Domain Object
```

## 11.1 Quick Expense

No se obliga a:

- Account;
- Category;
- Notes;
- Document.

Monto + significado de la compra son centrales.

---

# 12. SOURCE vs FINANCIAL CONTEXT

```text
SOURCE
→ dónde estaba el dinero

FINANCIAL CONTEXT
→ a qué economía pertenece el Expense
```

Ejemplo:

```text
Source:
Gabriel Personal Account

Context:
Household

Expense:
Supermercado $80.000
```

Consecuencia:

```text
Personal Account Balance   -80.000
Personal Spending          no
Household Spending         +80.000 exactly once
```

Analytics/Budgets siguen Financial Context.

---

# 13. TRANSFER

Transfer mueve dinero entre Accounts sin crear ingreso/gasto externo.

```text
Source Account
Destination Account
Source Amount
Destination Amount
```

Effects:

```text
Income   NO
Expense  NO
Budget   NO
```

Source y Destination no pueden ser la misma Account.

Transfer es una única operación lógica.

No existe estado válido half-transfer.

---

# 14. CROSS-CURRENCY TRANSFER

V1 soporta:

```text
ARS 150.000
→
USD 100
```

Guardando ambos Amounts.

No necesita:

- FX engine;
- market rate;
- gain/loss accounting;
- automatic conversion.

Commission real:

```text
Transfer
+
separate Expense
```

pero puede resolverse mediante una misma experiencia de usuario.

---

# 15. CONTRIBUTIONS / REIMBURSEMENTS

## 15.1 Personal contribution to Household

```text
Personal Account
→ Household Account
```

Es Transfer.

No Household Income.

## 15.2 Household reimbursement to person

```text
Household Account
→ Personal Account
```

Es Transfer.

No nuevo Expense ni nuevo Income externo.

---

# 16. HOUSEHOLD-FUNDED PERSONAL MONEY

Dinero Household no puede ocultarse mediante cambio de Context.

Camino seguro:

```text
Household Account
→ explicit Transfer
→ Personal Account
→ Personal Expense/Payment
```

---

# 17. TRANSACTION EDITING

Campos corregibles cuando sea semánticamente válido:

- Amount;
- Date;
- Category;
- Description;
- Account;
- Context;
- Notes.

La current truth usa el valor corregido.

History conserva la corrección relevante.

Una edición no puede ocultar Household-funded money.

---

# 18. TRANSACTION LIFECYCLE

```text
ACTIVE
→ TRASH
→ RESTORE
```

Trash:

```text
Account Balance  no effect
Budget           no effect
Reports          no effect
```

Restore reaplica efectos cuando no hay conflicto.

Permanent delete pertenece al Global Data Lifecycle Pass.

---

# 19. REFUND

Refund representa devolución real de un Expense previo.

No es Income.

Full:

```text
Expense 80.000
Refund  80.000
Net Expense 0
```

Partial:

```text
Expense 80.000
Refund  20.000
Net Expense 60.000
```

Effects:

```text
Account Balance  + refund when Account known
Expense Net      decreases
Budget Spent     decreases
Income           unchanged
```

Refunds V1 no superan el Expense original.

Expense con Refund activo no puede dejar Refund huérfano.

---

# 20. CATEGORY

Category ayuda a comprender gasto y Budget.

Es opcional en quick entry.

## 20.1 Native categories

HomePlus incluye una **base nativa útil de categorías comunes** para que el usuario no tenga que construir una taxonomía básica antes de usar Finance.

El catálogo exacto de labels es Product Content y puede ajustarse sin reabrir la arquitectura, manteniendo categorías domésticas simples y obvias.

Ejemplos de referencia:

- Comida;
- Servicios;
- Hogar;
- Transporte;
- Salud;
- Educación;
- Ocio;
- Compras;
- Otros.

## 20.2 Custom categories

El usuario puede:

```text
CREATE
EDIT
DELETE
```

No existe `Archive Category` como lifecycle visible de producto en V1.1.

## 20.3 Delete historical integrity

Eliminar una Category:

- la quita de futuros selectores;
- no recategoriza el pasado;
- no borra el significado histórico de Transactions que la usaron.

La estrategia técnica para preservar esa identidad histórica no se congela aquí.

---

# 21. BUDGET

V1 prioriza:

```text
MONTHLY BUDGET
```

Core:

```text
Financial Context
Currency
Month/Period
Amount
Category?
```

Sin Category:

```text
Total Monthly Budget
```

Con Category:

```text
Category Monthly Budget
```

Total y Category Budgets pueden coexistir.

No se exige que la suma de Category Budgets sea igual al Total.

---

# 22. BUDGET EFFECTS

```text
Expense
→ spent increases

Refund
→ spent decreases

Transfer
→ no effect

Balance Adjustment
→ no effect
```

Expense sin Category afecta Total Budget pero no Category Budget.

---

# 23. BUDGET EXCEEDED

Budget nunca bloquea un gasto real.

```text
Budget 400.000
Spent  450.000
→ OVER BUDGET
```

La realidad financiera manda.

---

# 24. NO CARRY-OVER

V1:

```text
NO AUTOMATIC CARRY-OVER
```

Budget Remaining es resultado estadístico.

No es:

- Balance;
- Savings;
- Transfer;
- Income.

---

# 25. SAVINGS

No existe Savings Goal Finance independiente.

Savings se representa con Accounts normales.

```text
Operational Account
→ Transfer
→ Savings Account
```

Budget leftover nunca crea dinero ni Savings automáticamente.

---

# 26. BUDGET LIFECYCLE V1.1

Budget es period-scoped.

Cada período histórico conserva su target original.

No existe una surface genérica `Budget Archived`.

Si existe una configuración repetible:

- puede editarse sólo este período;
- puede editarse este período y futuros;
- puede dejar de aplicarse hacia adelante;
- nunca reescribe períodos pasados silenciosamente.

Corregir una Transaction histórica puede recalcular spent histórico, pero no cambia cuál era el target definido para ese período.

---

# 27. MULTICURRENCY BUDGET / ANALYTICS

Todo Budget tiene Currency.

No se mezclan currencies incompatibles sin FX.

```text
ARS
USD
EUR
```

se analizan separadamente hasta que exista una capability explícita de conversión.

---

# 28. OBLIGATION / EXPECTED PAYMENT

Obligation representa un pago esperado que todavía no necesariamente ocurrió.

Frontend habla de:

```text
PAGOS
```

no de `Obligations`.

Ejemplos:

- alquiler;
- expensas;
- luz;
- gas;
- internet;
- seguro;
- patente;
- impuestos;
- colegio;
- tarjeta;
- otros pagos.

Crear un pago esperado NO crea Expense.

---

# 29. ONE-TIME PAYMENT

Core:

```text
Name
Currency
Due Date
```

Opcional:

```text
Expected Amount
Notes
Document
```

Expected Amount puede ser UNKNOWN.

Nunca se reemplaza por zero.

---

# 30. RECURRING PAYMENT

Una regla recurrente genera occurrences independientes.

```text
Internet
→ July
→ August
→ September
```

Cada una conserva su historia.

---

# 31. PAYMENT OCCURRENCE LIFECYCLE

```text
PENDING
├── PAID
├── SKIPPED
└── CANCELLED
```

Y:

```text
PENDING
+ due date passed
→ OVERDUE
```

OVERDUE es derivado.

---

# 32. PAID

Sólo un Payment financiero real confirmado produce:

```text
Register Payment
→ Expense
→ occurrence PAID
```

Un reminder, Attention item o futura Task nunca equivalen a dinero movido.

---

# 33. RECURRING PAYMENT LIFECYCLE

```text
ACTIVE
↕
PAUSED

ACTIVE / PAUSED
→ ENDED
```

Pause:

- no genera nuevas occurrences durante la pausa;
- no borra occurrences existentes.

Resume:

- reanuda futuro.

End:

- no genera nuevas occurrences;
- conserva historia.

No se usa `Archive` para Payments.

---

# 34. DEBT ACCUMULATION

Puede coexistir:

```text
July OVERDUE
August PENDING
```

Las occurrences no se colapsan.

---

# 35. PAYMENT

Registrar Payment requiere:

```text
Actual Amount
Currency
```

Account es opcional.

Con Account:

```text
Balance affected
```

Sin Account:

```text
Payment valid
Expense valid
Account Balance unaffected
```

Expected Amount y Actual Amount pueden diferir.

Financial truth usa Actual Amount.

---

# 36. PARTIAL PAYMENTS

V1 no soporta partial-payment lifecycle.

```text
one occurrence
→ maximum one active canonical Payment
```

Queda Future.

---

# 37. PERSONAL ACCOUNT PAYING HOUSEHOLD PAYMENT

Permitido.

```text
Household Expense
→ counted in Household

Personal Account
→ balance decreases

Household
→ payer/shared fact
→ no Personal Account access
```

---

# 38. PAYMENT TRASH / RESTORE

Si el Payment/Expense que justificaba PAID pasa a Trash:

```text
→ PENDING
```

o:

```text
→ OVERDUE
```

si corresponde.

Nunca:

```text
PAID without Payment truth
```

Restore puede restaurar PAID si no existe conflicto.

---

# 39. PAYMENT REMINDER AUTHORITY — V1.1 CHANGE

El camino normal de un pago esperado es:

```text
Finance Payment Due State
→ Attention
→ Notifications delivery when applicable
→ Payment Detail / Register Payment
```

No requiere crear una Planner Task.

Payment Due y Payment Overdue son señales canónicas candidatas de Attention.

El usuario puede recibir:

```text
Attention +1
```

y/o una notificación según la authority de Notifications.

La acción debe conducir directamente a la resolución del pago.

## 39.1 No duplicate task by default

Finance NO crea una Task de Planner por defecto para representar el mismo pago.

Esto evita duplicar:

```text
Payment pending
+
Task "Pagar X"
```

cuando Attention/Notifications ya cumple el reminder/action-entry purpose.

---

# 40. PLANNER INTEGRATION — DEFERRED

Finance ↔ Planner queda fuera del Core/default de Finance V1.1.

Se decidirá en el Cross-Module Integration Pass junto con:

- Inventory;
- Assets;
- Planner;
- Finance;
- presets;
- user-defined connected tasks.

Si en el futuro una Task se conecta explícitamente a un Payment:

- Planner seguirá poseyendo Task;
- Finance seguirá poseyendo Payment/Expense;
- Task completion nunca podrá inventar Payment;
- la resolución conectada deberá respetar truth de ambos dominios.

No construir este bridge como requisito de la primera implementación de Finance.

---

# 41. REPORT / ANALYTICS CAPABILITIES

Finance conserva read models capaces de responder:

```text
Income
Expense
Net
Spending by Category
Period vs Previous Period
Budget vs Actual
```

Upcoming Payments pertenece primariamente a `Pagos` / Attention, no necesita presentarse como Report independiente.

## 41.1 Counting rules

Expense:

```text
count exactly once by Financial Context
```

Transfer:

```text
Income  NO
Expense NO
Budget  NO
```

Balance Adjustment:

```text
Income  NO
Expense NO
Budget  NO
```

Refund:

```text
reduces Expense
reduces Budget Spent
Income NO
```

Contribution:

```text
Transfer
```

No infla Income externo.

## 41.2 Net

```text
Net
=
External Income
-
Net Expenses
```

Transfers, Contributions y Balance Adjustments no alteran Net.

---

# 42. FRONTEND PRIMARY MODEL

Finance vive dentro del App Shell global.

Entry:

```text
More
→ Finanzas
```

No crear:

- FinanceNavbar;
- FinanceAppShell;
- FinanceDesignSystem;
- FinanceSearch;
- FinanceAttention;
- FinanceReliability;
- FinancePermissions.

## 42.1 Finance shell

```text
Finanzas                                  •••
Personal ▾

[ Resumen | Movimientos | Pagos ]
```

Las tres tabs cambian la intención principal y reemplazan el contenido central.

No existe giant vertical root.

No existe `Planificar`.

No existe `Reports` como tab.

No existe `Accounts` como tab.

---

# 43. PRIMARY TAB — RESUMEN

Pregunta:

```text
¿Cómo estoy?
```

Contrato:

- período;
- gasto;
- ingreso;
- neto;
- Budget state;
- spending composition;
- relevant financial Attention only when needed;
- acceso a Análisis.

No incluye permanentemente:

- movement list;
- payment list;
- Account list;
- Category management.

## 43.1 Candidate anatomy

```text
Finanzas                                  •••
Familia García ▾

[ RESUMEN | Movimientos | Pagos ]

        ‹ AGOSTO 2026 ›

ESTE MES

Gastamos        Ingresó        Neto
$420.000        $800.000       +$380.000

PRESUPUESTO
$420.000 de $550.000
███████████████░░
$130.000 disponibles

EN QUÉ ESTAMOS GASTANDO

Comida                         $160.000 >
Transporte                      $95.000 >
Servicios                       $80.000 >

Ver análisis
```

## 43.2 Relevant attention

Sólo si realmente requiere atención:

```text
REQUIERE ATENCIÓN

Internet venció ayer · $38.450 >
```

Tap directo a Payment Detail.

No obliga a pasar primero por la tab Pagos.

## 43.3 Period navigation

```text
‹ AGOSTO 2026 ›
```

Mes actual:

```text
¿Cómo vengo?
```

Mes histórico:

```text
¿Cómo me fue?
```

No existe Month Close obligatorio.

## 43.4 Currency control

Si sólo hay una Currency relevante, no mostrar selector innecesario.

Si hay varias:

```text
ARS ▾
```

o equivalente compacto.

---

# 44. PRIMARY TAB — MOVIMIENTOS

Pregunta:

```text
¿Qué pasó con mi dinero?
```

## 44.1 Anatomy

```text
Finanzas                                  •••
Personal ▾

[ Resumen | MOVIMIENTOS | Pagos ]

Movimientos                                +

        ‹ AGOSTO 2026 ›

[Todos] [Gastos] [Ingresos] [Transferencias]
                                  Filtros

HOY

Supermercado
Comida · Mercado Pago
-$42.000                               >

Sueldo
Brubank
+$800.000                              >

Transferencia
Brubank → Ahorros
$100.000                               >
```

## 44.2 Local +

```text
Movimientos +
```

significa exclusivamente:

```text
Nuevo movimiento
```

El `+` global del bottom navigation sigue significando Global Quick Actions.

---

# 45. MOVEMENT CREATION FLOW

Tap local `+` abre el mismo canonical Money Flow que pueden reutilizar futuras entradas globales.

```text
[ Gasto | Ingreso | Transferir ]
```

Default candidato por frecuencia:

```text
Gasto
```

No necesita una screen intermedia separada.

---

# 46. EXPENSE FORM

Core visual:

```text
Nuevo movimiento

[ GASTO | Ingreso | Transferir ]

$ 42.000

¿En qué?
Supermercado

Familia García

Pagado desde
Mercado Pago >

Categoría
Comida >

Fecha
Hoy >

Más detalles >

[Registrar gasto]
```

Account y Category son opcionales.

Context debe ser visible pero tranquilo.

---

# 47. INCOME FORM

```text
Nuevo movimiento

[ Gasto | INGRESO | Transferir ]

$800.000

¿De dónde vino?
Sueldo

Personal

Ingresó en
Brubank >

Fecha
Hoy >

[Registrar ingreso]
```

Account opcional.

---

# 48. TRANSFER FORM

```text
Nuevo movimiento

[ Gasto | Ingreso | TRANSFERIR ]

Desde
Brubank
$480.000

↓

Hacia
Ahorros
$900.000

Monto
$100.000

Comisión
Ninguna

Fecha
Hoy

Brubank
$480.000 → $380.000

Ahorros
$900.000 → $1.000.000

[Transferir $100.000]
```

Preview de efecto ayuda a detectar errores.

---

# 49. MONEY INPUT

Finance necesita una primitive money-aware.

Requisitos:

- numeric keyboard;
- locale-aware formatting;
- Currency visible;
- sign derivado del tipo de operación;
- easy correction;
- no raw `-42000` para Expense;
- zero inválido cuando no representa una operación real;
- unknown nunca se representa como 0.

Ejemplo ARS:

```text
42000
→ $42.000
```

---

# 50. MOVEMENT FILTERING

## 50.1 Quick recurrent filters

```text
Todos
Gastos
Ingresos
Transferencias
```

## 50.2 Detailed filter

`Filtros` abre un filtro específico de mayor profundidad:

```text
Filtrar movimientos

Categoría
Todas

Cuenta
Todas

Moneda
ARS

[Limpiar] [Aplicar]
```

El objetivo es permitir consultas precisas sin llenar permanentemente la screen de chips.

---

# 51. MOVEMENT DETAIL

Pregunta:

```text
¿Qué ocurrió exactamente?
```

Candidate:

```text
‹ Movimiento                          •••

-$42.000
Supermercado

12 de agosto

Familia García

Pagado desde
Mercado Pago

Categoría
Comida

Relacionado con
<future related object> >
```

## 51.1 Overflow

Por defecto:

```text
Algo está mal
```

No mostrar `Ver historial` universalmente.

Si existe una corrección real, el Detail puede mostrar de forma contextual que hubo cambios y permitir inspeccionarlos.

## 51.2 Something is wrong

```text
¿Qué pasó?

Lo anoté mal
Me devolvieron dinero
Esto nunca ocurrió
```

Traducción:

```text
Lo anoté mal       → Correction
Me devolvieron     → Refund
Nunca ocurrió      → Trash
```

---

# 52. PRIMARY TAB — PAGOS

Pregunta:

```text
¿Qué tengo que resolver?
```

Orden:

```text
VENCIDOS
PRÓXIMOS
MÁS ADELANTE
PAGADOS / RESUELTOS RECIENTEMENTE
```

Lo que necesita atención aparece primero.

## 52.1 Anatomy

```text
Finanzas                                  •••
Familia García ▾

[ Resumen | Movimientos | PAGOS ]

Pagos                                      +

VENCIDOS

Internet
Venció ayer
$38.450
[Registrar pago]

PRÓXIMOS

Expensas
18 AGO · $85.000                         >

Seguro
22 AGO · monto pendiente                 >

MÁS ADELANTE
...
```

## 52.2 Local +

```text
Pagos +
```

significa:

```text
Agregar pago esperado
```

No `Create Obligation`.

---

# 53. CREATE EXPECTED PAYMENT

```text
Nuevo pago

¿Qué tenés que pagar?
Internet

Monto esperado
$38.450
Opcional

Vence
15 de agosto

¿Se repite?
Mensualmente

Familia García

[Agregar pago]
```

---

# 54. PAYMENT DETAIL

```text
‹ Internet                             •••

$38.450
Vence 15 AGO

Pendiente

[Registrar pago]

Se repite
Mensualmente

HISTORIAL

Julio       Pagado
Junio       Pagado
Mayo        Pagado
```

No mostrar `Occurrence` como lenguaje del usuario.

## 54.1 Payment overflow

`•••` significa overflow contextual.

Según el tipo:

```text
Editar
Omitir este pago
Pausar repetición
Finalizar repetición
```

No mostrar acciones que no aplican.

---

# 55. REGISTER PAYMENT

```text
Registrar pago

Internet

Esperado
$38.450

Pagaste
$38.450

Desde
Mercado Pago

Fecha
Hoy

[Registrar pago]
```

Confirmación produce:

```text
Payment
+
Expense
+
Occurrence PAID
```

No Planner Task por defecto.

---

# 56. ANÁLISIS — MERGED ANALYTICS + BUDGET DETAIL

V1.1 elimina la duplicación de:

```text
Budget Detail
+
Analysis
```

Existe una única surface `Análisis`.

Pregunta:

```text
¿Por qué estoy así?
```

## 56.1 Anatomy

```text
‹ Análisis

        ‹ AGOSTO 2026 ›

GASTO DEL MES
$420.000

vs julio
+8%

PRESUPUESTO

$420.000 de $550.000
███████████████░░
$130.000 disponibles

Administrar presupuesto

EN QUÉ GASTAMOS

Comida
$160.000 · 38%                         >
██████████████

Transporte
$95.000 · 23%                          >
████████

Servicios
$80.000 · 19%                          >
██████

Otros
$85.000 · 20%                          >
```

Si una Category tiene Category Budget, puede mostrarse su relación spent/target.

## 56.2 Category drill-down

Tap:

```text
Comida
```

abre:

```text
Movimientos
Period: Agosto 2026
Category: Comida
```

No existe `CategoryReportDetail`.

---

# 57. MANAGE BUDGET

Acción contextual desde Análisis.

Candidate:

```text
Presupuesto de agosto

Total
$550.000

POR CATEGORÍA

Comida          $150.000
Transporte       $60.000
Servicios       $100.000

+ Categoría

[Guardar]
```

La exacta UX de repeat/future scope puede aparecer sólo cuando esa capability sea relevante.

---

# 58. FINANCE ROOT OVERFLOW

```text
Finance •••
```

contiene solamente:

```text
Cuentas
Categorías
Papelera
```

No crear `Administrar finanzas` como screen intermedia.

No convertir overflow en un cajón genérico.

---

# 59. ACCOUNTS SURFACE

Acceso:

```text
Finance •••
→ Cuentas
```

y desde Account selectors relevantes.

Candidate:

```text
‹ Cuentas                                +

ARS

Mercado Pago
$125.000                               >

Brubank
$480.000                               >

Efectivo
Saldo no establecido                   >

USD

Ahorros USD
USD 850                                >

Ver cuentas archivadas
```

Las Accounts mostradas pertenecen al Financial Context activo.

---

# 60. ACCOUNTS EMPTY STATE

```text
Todavía no agregaste cuentas

Podés usar Finanzas sin cuentas.

Si querés seguir tus saldos y
cómo se mueve tu dinero,
agregá una cuenta.

[Agregar cuenta]
```

Evitar copy que sugiera vigilancia o que “HomePlus quiere saber” la información.

---

# 61. CREATE ACCOUNT FLOW

Account es una entidad persistente de baja frecuencia.

La creación puede usar **review explícito antes del commit**.

## 61.1 Edit step

```text
Nueva cuenta

Tipo
Cuenta / Tarjeta de crédito

Nombre
Mercado Pago

Moneda
ARS

Saldo actual
No lo sé
```

Context se hereda de Finance.

## 61.2 Review step

Antes de crear:

```text
Vas a crear

Cuenta
Mercado Pago

Moneda
ARS

Saldo
No establecido

Finanzas de
Personal

[Crear cuenta]
```

Para Credit Card, usar lenguaje de deuda correspondiente.

No se requiere este patrón de confirmación para cada Expense cotidiano.

---

# 62. ACCOUNT DETAIL

Standard Account:

```text
‹ Mercado Pago                         •••

Saldo actual
$125.000

ÚLTIMOS MOVIMIENTOS

Supermercado       -$42.000
Internet           -$38.450
Transferencia      -$20.000

Ver todos
```

Credit Card:

```text
‹ Visa Galicia                         •••

Deuda actual
$180.000

ÚLTIMOS MOVIMIENTOS
...
```

Overflow:

```text
Editar
Corregir saldo
Archivar
```

Archived Accounts se administran dentro de Accounts, no desde un global Archived screen.

---

# 63. CATEGORIES SURFACE

Acceso:

```text
Finance •••
→ Categorías
```

La surface combina:

- categorías nativas;
- categorías custom.

Custom:

```text
create
edit
delete
```

Native categories deben minimizar first-use friction.

El detalle exacto de qué categorías nativas permiten rename/delete puede resolverse durante implementación/content pass sin cambiar la arquitectura, siempre que el usuario tenga una base útil y no deba crear manualmente las categorías domésticas obvias.

---

# 64. TRASH SURFACE

Acceso:

```text
Finance •••
→ Papelera
```

Contiene Transactions enviados a Trash.

Permite Restore.

No es Archive.

Permanent delete se resuelve en Global Data Lifecycle Pass.

---

# 65. NO GLOBAL ARCHIVED SURFACE

V1.1 elimina una screen genérica `Archivados`.

Archive corresponde principalmente a Account.

```text
Cuentas
→ Cuentas archivadas
```

Categories:

```text
Delete
```

Payments:

```text
Paid / Skipped / Cancelled
Recurring Active / Paused / Ended
```

Budgets:

```text
period history + future applicability
```

Transactions:

```text
Trash / Restore
```

No usar Archive cuando ya existe una semántica más precisa.

---

# 66. ATTENTION / NOTIFICATIONS

Finance puede producir señales:

```text
PAYMENT DUE
PAYMENT OVERDUE
BUDGET EXCEEDED
```

Attention decide relevancia final.

Notifications posee delivery.

Para Payment:

```text
Attention +1 / notification
→ Payment Detail
→ Register Payment
```

No crear automáticamente una Task equivalente.

Personal Finance signals:

```text
owner only
```

Household signals respetan Household authority.

---

# 67. HOME

Home sólo proyecta Finance cuando existe relevancia.

Ejemplos:

- pago próximo relevante;
- pago vencido;
- Budget excedido.

No existe derecho permanente a un Finance dashboard dentro de Home.

---

# 68. SEARCH

Search puede descubrir Finance según autoridad.

Nunca amplía permisos.

Personal:

```text
owner
```

Household:

```text
authorized members
```

---

# 69. HOMECLOUD — DEFERRED RELATION

Finance puede relacionarse con:

- invoice;
- ticket;
- receipt;
- proof of payment;
- obligation document.

HomeCloud posee el archivo.

Finance posee únicamente la relación.

Implementación cross-module se realiza cuando ambos módulos estén listos.

---

# 70. INVENTORY — DEFERRED RELATION

Inventory posee:

- item;
- quantity;
- stock;
- replenishment truth.

Finance posee dinero.

Futura relación:

```text
Inventory purchase truth
↔ Finance Expense
```

No obliga a Finance a copiar line items.

Connected Completion se diseña en el integration pass.

---

# 71. ASSETS — DEFERRED RELATION

Assets posee:

- Asset;
- service;
- maintenance;
- repair truth.

Finance posee:

- cost;
- Expense;
- payment source.

Futura relación:

```text
Asset Service / Repair
↔ Finance Expense
```

La resolución conectada se implementa después de que ambos cores estén estables.

---

# 72. CONNECTED RESOLUTION DIRECTION

Dirección global futura:

```text
ONE REAL-WORLD SITUATION
→ ONE USER RESOLUTION
→ MULTIPLE CANONICAL EFFECTS
```

Ejemplos futuros:

```text
Inventory Purchase
→ Inventory truth
→ Finance Expense
→ optional Planner truth if explicitly designed
```

```text
Asset Service
→ Assets truth
→ Finance Expense
→ optional Planner truth if explicitly designed
```

No implementar estas composiciones dentro de Finance Core por anticipado.

User-defined connected Tasks y HomePlus presets deben eventualmente compartir capabilities canónicas; no crear dos sistemas.

---

# 73. GENI

Geni puede interpretar:

```text
"Anotá 20 mil de supermercado."
"¿En qué gasté más este mes?"
"¿Cuánto gastamos en comida?"
"Registrá que pagué Internet."
"¿Qué pagos están vencidos?"
```

pero consume operaciones canónicas.

No:

- atraviesa privacy;
- inventa Payment;
- crea contabilidad paralela;
- reemplaza Core Finance.

---

# 74. AUTOMATIONS

Automations puede consumir operaciones canónicas deterministas.

No puede:

- inventar financial truth;
- saltar permisos;
- cruzar Personal/Household silenciosamente;
- registrar Expense sin una regla/causa válida.

---

# 75. RELIABILITY UX

Finance no crea `FinanceReliability`.

Debe consumir/reutilizar la authority global que corresponda.

La UX debe poder distinguir:

```text
pending
offline
retrying
uncertain
conflicted
confirmed
```

Nunca indicar al usuario que vuelva a cargar una operación incierta si eso puede duplicar dinero.

Double submit no puede producir operaciones duplicadas.

---

# 76. ERROR PREVENTION

Finance adopta:

## 76.1 Money-aware inputs

- formatting local;
- Currency visible;
- clear amount;
- numeric keyboard;
- predictable editing.

## 76.2 Context visibility

Antes de crear financial truth debe quedar claro si se registra en:

```text
Personal
```

o:

```text
Household
```

## 76.3 Source visibility

Cuando Account participa, la fuente/destino debe ser clara.

## 76.4 Impact preview

Especialmente útil para Transfer.

## 76.5 Proportional confirmation

No agregar confirmaciones molestas a cada gasto.

Operaciones persistentes o de mayor impacto pueden tener Review.

Create Account usa Review explícito.

## 76.6 History-safe correction

Correcciones no reescriben historia silenciosamente.

---

# 77. FRONTEND NAVIGATION DEPTH

Uso cotidiano busca:

```text
Finance
→ destination
→ detail
```

Evitar niveles innecesarios.

Si Resumen ya muestra una entidad concreta:

```text
Internet overdue
→ Payment Detail
```

No obliga:

```text
Resumen
→ Pagos
→ Internet
```

Si Análisis muestra Comida:

```text
Comida
→ scoped Movimientos
```

No agrega `Category Report`.

---

# 78. FRONTEND EMPTY STATES

Una capability no configurada no bloquea Finance.

No Budget:

```text
Finance still works.
```

No Accounts:

```text
Finance still works.
```

No Payments:

```text
Pagos
→ useful empty state
→ +
```

No Transactions:

```text
Resumen
→ first movement CTA
```

No llenar el Root con cards vacías de features que el usuario no usa.

---

# 79. SURFACE MAP — FINAL

```text
APP SHELL
│
└── MORE
    │
    └── FINANZAS
        │
        │  Personal ▾ / Household ▾
        │
        │  [ Resumen | Movimientos | Pagos ]
        │
        ├── RESUMEN
        │    └── ANÁLISIS
        │         ├── Budget state
        │         ├── Spending analysis
        │         ├── Category → scoped Movimientos
        │         └── Manage Budget
        │
        ├── MOVIMIENTOS
        │    ├── +
        │    │    └── Gasto / Ingreso / Transferencia
        │    ├── Quick filters
        │    ├── Detailed filters
        │    └── Movement Detail
        │         └── Algo está mal
        │              ├── Correction
        │              ├── Refund
        │              └── Trash
        │
        ├── PAGOS
        │    ├── +
        │    │    └── New Expected Payment
        │    └── Payment Detail
        │         ├── Register Payment
        │         └── •••
        │              ├── Edit
        │              ├── Skip
        │              ├── Pause recurrence
        │              └── End recurrence
        │
        └── •••
             ├── Cuentas
             │    ├── +
             │    │    ├── Account
             │    │    └── Credit Card
             │    ├── Account Detail
             │    │    ├── Edit
             │    │    ├── Correct Balance
             │    │    └── Archive
             │    └── Archived Accounts
             │
             ├── Categorías
             │    └── Native + custom create/edit/delete
             │
             └── Papelera
                  └── Transactions + Restore
```

External / shared authorities:

```text
GLOBAL QUICK ACTIONS
→ may reuse canonical Money Flow

ATTENTION
→ Payment Due / Overdue / Budget Exceeded

NOTIFICATIONS
→ delivery

HOME
→ relevance projection

SEARCH
→ authorized discovery

CROSS-MODULE CONNECTED RESOLUTION
→ deferred
```

---

# 80. FUNCTIONAL CHANGES FROM V1.0

V1.1 intentionally changes the following V1.0 decisions.

## CHANGE-01 — Planner payment composition

V1.0:

```text
Household Obligation
→ Planner Task composition as Core
```

V1.1:

```text
Finance due state
→ Attention / Notifications
→ Payment resolution
```

Planner composition is deferred and optional, not default Core behavior.

## CHANGE-02 — Category lifecycle

V1.0:

```text
ACTIVE ↔ ARCHIVED
```

V1.1:

```text
Native baseline
+
Custom CREATE / EDIT / DELETE
```

Historical classification remains preserved.

## CHANGE-03 — Native categories

V1.0:

```text
native base may exist
```

V1.1:

```text
native useful baseline required
```

Exact labels remain Product Content.

## CHANGE-04 — Budget archive semantics

V1.0 allowed repeatable Budget `ACTIVE ↔ ARCHIVED`.

V1.1 removes generic Archive UX/lifecycle as a user concept.

Period history remains, and future applicability can be stopped/changed explicitly.

## CHANGE-05 — Credit Card classification

V1.0 permitted simple credit-card semantics through negative-capable Account.

V1.1 formalizes Credit Card as an Account type/presentation while explicitly keeping advanced card tracking Future.

## CHANGE-06 — Frontend Product Truth

V1.0 left frontend detail pending.

V1.1 freezes:

```text
Resumen
Movimientos
Pagos
```

plus the surface hierarchy defined above.

## CHANGE-07 — Analysis / Budget surface merge

Budget math remains unchanged.

Frontend now merges Budget detail and spending analytics into `Análisis`, with `Administrar presupuesto` as a contextual action.

## CHANGE-08 — Generic Archived surface removed

Only Account retains a real Archive/Unarchive need in Finance V1.1.

---

# 81. UNCHANGED FINANCIAL INVARIANTS FROM V1.0

The following remain authoritative:

1. Personal Finance belongs to User.
2. Household Finance belongs to Household.
3. Personal Finance is private by default.
4. Household authority does not grant Personal Finance access.
5. Unknown Balance is not zero.
6. Known Balance needs a reliable anchor.
7. Balance Adjustment changes Balance but not Income/Expense/Budget.
8. Negative balance is valid.
9. Account Currency is historically stable.
10. Account is optional for Income/Expense.
11. Transfer requires real Source/Destination.
12. Transfer is not Income or Expense.
13. Cross-currency Transfer stores both amounts.
14. Source and Financial Context are distinct.
15. Personal source may fund Household Expense without exposing private Account.
16. Household-funded money cannot be hidden as Personal.
17. Contributions are Transfers.
18. Reimbursements are Transfers.
19. Credit-card purchase is Expense.
20. Credit-card payment is Transfer.
21. Correction preserves History.
22. Trash removes current effects.
23. Restore reapplies effects if valid.
24. Refund is not Income.
25. Refund reduces Net Expense and Budget Spent.
26. Budget never blocks real Expense.
27. Transfer does not consume Budget.
28. Balance Adjustment does not consume Budget.
29. No automatic Budget carry-over.
30. Budget leftover is not money.
31. Savings uses Accounts + Transfer.
32. Obligation/expected Payment is not Expense.
33. PAID requires real Payment.
34. OVERDUE is derived.
35. recurring occurrences preserve individual history.
36. unpaid occurrences may accumulate.
37. pause/end do not rewrite past occurrences.
38. partial-payment lifecycle is Future.
39. Payment Trash recalculates due state.
40. Reports count each Expense once.
41. incompatible currencies are never silently summed.
42. Home only projects Finance when relevant.
43. Attention owns relevance.
44. Notifications owns delivery.
45. Search does not widen permissions.
46. Inventory owns stock/quantity.
47. Assets owns Asset/service/repair truth.
48. HomeCloud owns files.
49. Finance owns financial truth.
50. Geni/Automations consume canonical capabilities.
51. Finance Core works without IA.

---

# 82. V1 CORE TARGET — FINAL

Core Finance V1.1 includes:

- Personal Finance;
- Household Finance;
- Personal/Household selector experience;
- strict privacy separation;
- Accounts optional for Income/Expense;
- Account / Credit Card type;
- Unknown/Known Balance;
- Balance Anchor;
- Balance Correction;
- negative balances;
- Account Archive/Unarchive;
- Income;
- Expense;
- Transfer;
- Source vs Context;
- Personal-funded Household Expense;
- Contributions;
- Reimbursements;
- cross-currency Transfer;
- Transfer commission composition;
- quick Expense;
- Transaction correction/history;
- Trash/Restore;
- Refund;
- native Categories;
- custom Category create/edit/delete;
- Monthly Total Budget;
- Category Budgets;
- no automatic carry-over;
- Budget vs Actual;
- Savings through normal Accounts;
- one-time expected Payments;
- recurring expected Payments;
- occurrence history;
- Pending/Paid/Skipped/Cancelled;
- derived Overdue;
- Attention projection for Payment Due/Overdue and Budget Exceeded;
- Reports/read models;
- multicurrency without FX engine;
- `Resumen | Movimientos | Pagos`;
- `Análisis`;
- Account management;
- error prevention UX;
- progressive complexity;
- compatibility with future HomeCloud/Inventory/Assets/Search/Geni/Automations integrations.

---

# 83. DEFERRED CROSS-MODULE TARGET

Defined semantically, but not required for Finance Core implementation:

- Finance ↔ Planner composition;
- Inventory connected purchase resolution;
- Assets connected service/repair resolution;
- HomeCloud document relation implementation;
- generic Connected Task framework;
- user-defined cross-domain Task composition;
- HomePlus connected presets;
- generalized orchestration.

These require their own:

```text
CURRENT
→ TARGET
→ REAL GAP
```

after the involved module cores are stable.

---

# 84. FUTURE / ENHANCEMENT

Only with demonstrated need:

- Bank Sync / Open Banking;
- automatic FX conversion;
- exchange-rate accounting;
- advanced Credit Card tracking;
- card closing/due statement subsystem;
- partial payments;
- Personal Finance sharing;
- recurring expected Income templates;
- richer anomaly detection;
- richer analytics;
- advanced savings insights;
- generic cross-module workflow composition.

---

# 85. EXPLICITLY NOT TARGET

V1.1 does not include:

- investment portfolios;
- stock tracking;
- crypto trading;
- tax accounting;
- payroll;
- business invoicing;
- customers/suppliers;
- visible double-entry bookkeeping;
- credit scoring;
- mortgage/loan amortization engine;
- complex debt planner;
- Splitwise-style settlement system;
- Finance-specific Savings Goal;
- enterprise accounting;
- AI-dependent financial advice;
- mandatory Account setup;
- mandatory Category setup;
- automatic Planner Task for every Payment;
- generic Archived screen;
- Finance-specific App Shell;
- Finance-specific Reliability system;
- Finance-specific Permission system;
- Finance-specific Search/Attention.

---

# 86. FRONTEND STRESS TEST STATUS

The surface model was stress-tested against the Finance situation inventory.

```text
PRIMARY TABS REQUIRED:
3

Resumen
Movimientos
Pagos

GIANT SINGLE ROOT:
REJECTED

ADDITIONAL PRIMARY TAB:
NOT REQUIRED

PLANIFICAR:
REJECTED

REPORTS TAB:
REJECTED

ACCOUNTS TAB:
REJECTED

BUDGET TAB:
NOT REQUIRED

CROSS-MODULE PRIMARY SURFACE:
NOT REQUIRED
```

Key corrections incorporated:

```text
Resumen supports period navigation.
Accounts has direct secondary access.
Budget + Analysis merged.
Payment reminders use Attention/Notifications by default.
Generic Archive destination removed.
```

---

# 87. IMPLEMENTATION BOUNDARY

This freeze does NOT authorize blindly implementing V1.0's previous gap plan.

Before implementation:

```text
1. Compare V1.1 vs existing Current Capability.
2. Reuse all canonical Current authorities.
3. Recalculate only deltas introduced by V1.1.
4. Do not build parallel navigation, sheets, permissions or reliability systems.
5. Implement Finance Core vertically.
6. Leave deferred cross-module composition for the later integration pass.
```

Current frontend evidence already indicates:

- `More` is the module-entry hub;
- App Shell remains global;
- shared UI primitives exist;
- sheet/form systems are fragmented and must not be multiplied;
- money-specific primitives are missing;
- Personal vs Household module scope requires Finance-specific UX definition;
- Planner reliability is the strongest current semantic precedent but is not yet a generic Finance runtime.

The implementation phase must resolve those via Existing-first, not by creating Finance-only authorities.

---

# 88. FINAL ACCEPTANCE DEFINITION

Finance V1.1 Product Truth is satisfied when:

1. Finance behaves as the economic perspective of personal/household life, not as a separate financial app.
2. `Personal` and active `Household` are clear distinct scopes.
3. The same three primary modes exist in both scopes:
   - Resumen;
   - Movimientos;
   - Pagos.
4. Resumen answers how the period is going without becoming a giant mixed-information page.
5. Movimientos answers what happened and owns quick financial capture.
6. Pagos answers what requires financial resolution and orders urgency first.
7. Analysis provides depth without duplicating Budget as another parallel screen.
8. Accounts remain optional infrastructure.
9. Credit Card remains an Account type in V1.
10. Categories provide a useful native baseline and custom management without Archive UX.
11. Account is the primary Finance entity with Archive/Unarchive lifecycle.
12. Payment Due/Overdue can reach Attention/Notifications directly.
13. Finance does not create a Planner Task by default for the same payment.
14. Payment truth requires actual payment confirmation.
15. user mistakes are correctable without destroying real history.
16. Refund remains distinct from Correction.
17. unknown remains distinct from zero.
18. multicurrency never creates fake totals.
19. low-frequency configuration does not dominate daily Finance UX.
20. cross-module connected resolutions remain compatible but deferred.
21. no Finance-specific parallel App Shell, Reliability, Permission, Search or Attention authority is introduced.
22. all financial invariants in this document remain true under every entry point.

---

# 89. FINAL STATUS

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.1

PRODUCT:
FROZEN

FUNCTIONAL TRUTH:
FROZEN

EXPERIENCE MODEL:
FROZEN

INFORMATION ARCHITECTURE:
FROZEN

FRONTEND SURFACE MODEL:
FROZEN

PERMISSION ROLE PACKAGES:
DEFERRED TO GLOBAL PERMISSIONS PASS

CROSS-MODULE COMPOSITION:
DEFERRED TO CROSS-MODULE INTEGRATION PASS

IMPLEMENTATION:
NOT AUTHORIZED WITHOUT V1.1 REAL-GAP REBASE
```

# END OF DOCUMENT
