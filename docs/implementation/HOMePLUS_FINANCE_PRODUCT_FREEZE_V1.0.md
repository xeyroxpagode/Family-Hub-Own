# HOMePLUS — FINANCE PRODUCT FREEZE V1.0

**Documento:** `HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md`  
**Módulo:** Finance  
**Versión:** 1.0  
**Fecha de cierre:** 2026-08-10  
**Estado:** `MODULE_PRODUCT_DEFINITION_CLOSED`

```text
LOGICALLY CLOSED
PRODUCT BEHAVIOR COMPLETE
DONOR CAPABILITIES SELECTED
FRONTEND DETAIL PENDING
IMPLEMENTATION NOT YET AUDITED
```

---

# 00. DOCUMENT STATUS & AUTHORITY

Este documento congela la **Product Truth V1.0 de Finance** para HOMePLUS.

Finance es el dominio económico del producto. Su propósito es permitir que los adultos administren de manera comprensible sus finanzas personales y las finanzas compartidas del Household, registren movimientos relevantes, entiendan en qué se utiliza el dinero, controlen presupuestos, anticipen obligaciones y relacionen hechos económicos con otros dominios canónicos de HOMePLUS.

Finance NO es:

- una cuenta bancaria;
- una fintech;
- un sistema contable empresarial;
- un portfolio de inversiones;
- un sistema impositivo;
- un software de facturación;
- un sistema de payroll;
- un motor de crédito;
- una aplicación de trading;
- un reemplazo de la banca privada del usuario.

Fuentes de autoridad:

1. `HOMePLUS_PRODUCT_DEFINITION_MASTER.md`;
2. `HOMePLUS_PRODUCT_DEFINITION_HANDOFF.md`;
3. `HOMePLUS_PLANNER_PRODUCT_FREEZE_V1.0.md`, únicamente para contratos cross-module ya congelados;
4. `HOMePLUS_INVENTORY_PRODUCT_FREEZE_V1.0.md`, para preservar ownership Inventory ↔ Finance;
5. `HOMePLUS_ASSETS_PRODUCT_FREEZE_V1.0.md`, para preservar ownership Assets ↔ Finance;
6. decisiones explícitas tomadas durante el cierre lógico de Finance.

Si una descripción global anterior contradice este documento respecto de Finance, manda este Product Freeze.

Este documento NO define:

- tablas;
- migrations;
- endpoints;
- RPCs;
- schema técnico;
- arquitectura frontend;
- arquitectura backend;
- jobs;
- triggers DB;
- implementation status;
- Current Capability;
- qué código donor será finalmente portado;
- qué porcentaje del módulo ya existe.

La secuencia obligatoria posterior es:

```text
FINANCE PRODUCT FREEZE
        ↓
CURRENT HOMePLUS AUDIT
        ↓
CURRENT HOMePLUS
+
DONOR CAPABILITIES
        ↓
CURRENT + DONOR vs TARGET
        ↓
REAL GAP
        ↓
IMPLEMENTATION PLAN
        ↓
MINIMAL INTEGRATION
```

No se autoriza implementar desde este documento sin demostrar primero el Real Gap.

---

# 01. MODULE DEFINITION

## 01.1 Mission

Finance permite:

- registrar ingresos y gastos relevantes;
- comprender cuánto entra y cuánto sale;
- saber en qué se gasta más o menos;
- administrar presupuestos mensuales;
- anticipar pagos y vencimientos;
- conservar una historia financiera doméstica entendible;
- mantener separadas finanzas personales y finanzas del Household;
- representar cuentas y saldos cuando el usuario quiera hacerlo;
- complementar Inventory, Assets y Planner con contexto económico;
- ofrecer estadísticas simples y útiles para controlar el gasto.

## 01.2 User Problem

Las personas adultas suelen administrar dinero mediante una combinación de:

- cuentas personales;
- efectivo;
- billeteras virtuales;
- fondos compartidos;
- gastos domésticos;
- impuestos;
- servicios;
- alquiler/expensas;
- compras;
- reparaciones;
- presupuestos;
- pagos periódicos;
- ahorros.

La información termina dispersa entre memoria, banco, mensajes, notas y aplicaciones separadas.

Finance debe aportar claridad sin obligar al usuario a mantener una contabilidad profesional.

## 01.3 Core Questions

Finance debe poder responder, según scope y permisos:

```text
¿Cuánto dinero tengo registrado?
¿Cuánto dinero tiene registrado el Household?
¿Cuánto entró este mes?
¿Cuánto gasté?
¿Cuánto gastamos como Household?
¿En qué categoría gastamos más?
¿Cuánto queda del presupuesto?
¿Superamos el presupuesto?
¿Qué pagos vienen?
¿Qué pagos están vencidos?
¿Ya pagamos esta obligación?
¿Cuánto costó una compra o reparación relacionada?
¿Cómo cambió el gasto respecto del mes anterior?
```

## 01.4 Success Condition

Finance cumple su misión cuando:

- registrar un gasto cotidiano es rápido;
- Accounts son útiles pero no obligatorias para registrar Income/Expense;
- Personal Finance permanece privada por defecto;
- Household Finance representa dinero compartido sin absorber finanzas privadas;
- Expense y Transfer nunca se confunden;
- Reports no cuentan dinero dos veces;
- Budgets ayudan a controlar, nunca bloquean hechos reales;
- pagos futuros no se confunden con pagos realizados;
- recurring obligations se configuran una vez;
- Planner puede ejecutar Household payment actions sin apropiarse del hecho financiero;
- refunds/correcciones preservan estadísticas correctas;
- multicurrency no inventa conversiones;
- Finance funciona completamente sin IA.

---

# 02. PRODUCT PRINCIPLES

## 02.1 Control over accounting complexity

Finance prioriza:

```text
understand money
over
maintain accounting system
```

## 02.2 Progressive complexity

```text
simple expense
→ simple entry

advanced case
→ advanced capability only when needed
```

## 02.3 Financial truth is factual

```text
expected payment
≠
actual payment
```

```text
Planner Task Completed
≠
money moved
```

## 02.4 Personal privacy is structural

Personal Finance no es una vista filtrada del Household.

Es un scope distinto con ownership privado.

## 02.5 Household money stays accountable

Dinero financiado por una Household Account nunca puede desaparecer de Household Finance mediante una edición de privacy/context.

## 02.6 Budget ≠ money

Budget representa intención/límite de gasto.

Account representa dinero.

## 02.7 Transfer ≠ Expense

Mover dinero no es gastarlo.

## 02.8 Historical integrity

Correcciones legítimas son posibles, pero la historia no se reescribe silenciosamente.

## 02.9 No double counting

Cada Expense se contabiliza una sola vez según su Financial Context.

## 02.10 AI optional

Geni puede reducir fricción, pero ninguna operación Core depende de IA.

---

# 03. PRODUCT MAP

```text
FINANCE
│
├── FINANCIAL CONTEXT
│   ├── Personal
│   └── Household
│
├── ACCOUNT
│   ├── Name
│   ├── Currency
│   ├── Scope
│   ├── Known / Unknown Balance
│   ├── Balance Anchor
│   └── Active / Archived
│
├── TRANSACTION
│   ├── Income
│   ├── Expense
│   └── Transfer
│
├── CORRECTIONS
│   ├── Balance Adjustment
│   └── Refund
│
├── CATEGORY
│
├── BUDGET
│   ├── Monthly Total
│   ├── Category Budget
│   ├── Budget vs Actual
│   └── No Carry-over
│
├── SAVINGS
│   └── represented through normal Accounts
│
├── OBLIGATION
│   ├── One-time
│   ├── Recurring Rule
│   └── Occurrence
│
├── PAYMENT
│   ├── Pending
│   ├── Paid
│   ├── Skipped
│   ├── Cancelled
│   └── Overdue derived
│
├── REPORTS
│   ├── Income
│   ├── Expense
│   ├── Net
│   ├── Spending by Category
│   ├── Month Comparison
│   └── Budget vs Actual
│
├── DOCUMENT RELATIONS?
│   └── HomeCloud
│
└── HISTORY
```

---

# 04. FINANCIAL CONTEXT

## 04.1 Context types

V1 congela dos Financial Contexts:

```text
PERSONAL
HOUSEHOLD
```

## 04.2 Personal Finance

Personal Finance:

- pertenece al User;
- no pertenece al Household;
- es owner-only por defecto;
- sobrevive al cambio de Household activo;
- puede coexistir con múltiples Household memberships;
- no es visible automáticamente para pareja, adultos, coordinadores u otros miembros.

Ejemplo:

```text
User Gabriel

Personal Finance
├── Galicia
├── Mercado Pago
├── Efectivo
├── Ahorros personales
└── gastos/ingresos privados
```

## 04.3 Household Finance

Household Finance pertenece al Household activo y puede representar:

- fondos comunes;
- cuentas compartidas;
- gastos domésticos;
- ingresos Household;
- presupuestos;
- obligaciones;
- servicios;
- impuestos;
- reparaciones;
- compras;
- ahorros del Household.

## 04.4 Multi-household

```text
User Personal Finance
→ remains the same

Household A Finance
→ Household A

Household B Finance
→ Household B
```

Cambiar Household cambia el contexto Household, no el Personal.

---

# 05. PRIVACY

## 05.1 Default privacy

```text
PERSONAL
→ owner only

HOUSEHOLD
→ authorized Household members
```

## 05.2 Household authority does not imply Personal access

Ser:

- Coordinador;
- Adulto;
- pareja;
- owner del Household;

no concede acceso automático a Personal Finance de otra persona.

## 05.3 Cross-scope disclosure

Si una persona usa una Personal Account para pagar un Household Expense, el Household puede conocer:

- Amount;
- Currency;
- Date;
- Description;
- Category;
- actor/payer;
- que fue financiado personalmente.

No recibe automáticamente:

- nombre de Personal Account;
- saldo;
- ingresos privados;
- ahorros;
- otros movimientos personales.

## 05.4 Search/Geni/Home/Feed privacy

Las superficies cross-module deben aplicar exactamente la misma autoridad.

Personal Finance nunca se vuelve discoverable sólo porque el usuario comparte Household con otra persona.

---

# 06. ACCOUNT

## 06.1 Definition

Account representa un contenedor/fuente financiera que el usuario decide representar en HOMePLUS.

Puede ser:

- cuenta bancaria;
- billetera virtual;
- efectivo;
- fondo común;
- caja;
- ahorro;
- tarjeta/crédito simple;
- otro contenedor financiero útil.

No requiere integración bancaria.

## 06.2 Core properties

```text
Name
Currency
Scope
```

Opcional:

```text
Opening Balance
```

## 06.3 Scope

```text
PERSONAL
or
HOUSEHOLD
```

## 06.4 Account is optional for Income/Expense

Income y Expense pueden existir sin Account.

Esto permite:

```text
Expense $12.000
Account: none
```

Consecuencias:

```text
Reports/Budget → YES
Account Balance → no effect
```

Transfer sí requiere Source y Destination Accounts.

---

# 07. BALANCE

## 07.1 Unknown Balance

No informar Opening Balance significa:

```text
BALANCE UNKNOWN
```

No significa:

```text
BALANCE = 0
```

## 07.2 Known Balance

Known Balance necesita un punto confiable:

```text
BALANCE ANCHOR
```

Conceptualmente:

```text
Known Balance Anchor
+ movements after anchor
= Current Known Balance
```

## 07.3 Historical entry before anchor

Una Transaction histórica anterior al Balance Anchor puede afectar Reports históricos sin descontarse nuevamente de un saldo que ya la incorporaba.

## 07.4 Negative balance

Balance negativo es válido.

Esto permite representar tarjetas/crédito simple sin un subsystem separado.

---

# 08. BALANCE CORRECTION

## 08.1 Correct Balance

El usuario puede declarar el saldo real actual.

Esto establece un nuevo Balance Anchor y conserva una corrección/audit event conceptual.

## 08.2 Balance Adjustment semantics

```text
Balance Adjustment

Account Balance   → YES
Account History   → YES
Income            → NO
Expense           → NO
Budget            → NO
Spending Report   → NO
```

No se inventa una causa económica para una diferencia desconocida.

---

# 09. ACCOUNT LIFECYCLE

```text
ACTIVE
↕
ARCHIVED
```

## 09.1 Active

Puede utilizarse en nuevas Transactions.

## 09.2 Archived

- no se ofrece normalmente para nuevos movimientos;
- conserva Balance;
- conserva Transactions;
- conserva Reports históricos;
- conserva relationships.

## 09.3 Unarchive

```text
ARCHIVED
→ ACTIVE
```

## 09.4 Currency immutability

Una Account con historia financiera no puede cambiar Currency.

Si se necesita otra moneda:

```text
create another Account
```

---

# 10. TRANSACTION

Core primitives:

```text
INCOME
EXPENSE
TRANSFER
```

---

# 11. INCOME

Income representa dinero externo que realmente ingresó al Financial Context.

Puede ser Personal o Household.

Ejemplos:

- sueldo;
- ingreso extraordinario;
- devolución de dinero prestado sólo si realmente constituye nuevo ingreso según contexto;
- ingreso del Household.

Aportes Personal → Household no son Income Household: son Transfer.

---

# 12. EXPENSE

Expense representa dinero realmente consumido/pagado.

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

## 12.1 Quick Expense

El caso habitual debe poder resolverse con mínima interacción.

No se obliga a:

- Account;
- Category;
- Notes;
- Document.

---

# 13. TRANSFER

Transfer representa movimiento de dinero entre Accounts sin gasto ni ingreso externo.

```text
Source Account
Destination Account
Source Amount
Destination Amount
```

En same-currency normalmente los Amounts coinciden.

## 13.1 Effects

```text
Income  → NO
Expense → NO
Budget  → NO
```

Sólo cambia la ubicación del dinero.

## 13.2 Atomic product semantics

Un Transfer es una única operación lógica.

No existe como estado válido:

```text
Source debited
Destination not credited
```

La estrategia técnica se define después.

## 13.3 Source ≠ Destination

Transfer a la misma Account es inválido.

---

# 14. CROSS-CURRENCY TRANSFER

V1 soporta:

```text
ARS 150.000
→
USD 100
```

con:

```text
Source Amount + Currency
Destination Amount + Currency
```

HomePlus no necesita:

- FX engine;
- market rate;
- realized gain/loss;
- automatic conversion.

Si existe comisión real:

```text
Commission
→ separate Expense
```

---

# 15. SOURCE vs FINANCIAL CONTEXT

## 15.1 Definition

```text
SOURCE
→ dónde estaba el dinero

FINANCIAL CONTEXT
→ a qué economía pertenece el Expense
```

## 15.2 Personal Account paying Household Expense

Ejemplo:

```text
Source:
Gabriel Personal Account

Context:
Household

Expense:
Supermercado $80.000
```

Consecuencias:

```text
Personal Account Balance
→ -$80.000

Personal Spending Report
→ does NOT count $80.000

Household Spending Report
→ counts $80.000 exactly once
```

## 15.3 Analytics rule

Expense Analytics y Budgets siguen el Financial Context, no el Scope de la Account.

---

# 16. HOUSEHOLD-FUNDED MONEY

Si una Household Account financia un movimiento, ese hecho debe permanecer visible dentro de Household Finance.

No se permite editar el movimiento para esconder dinero compartido dentro de Personal Finance.

Camino seguro para pasar dinero Household → Personal:

```text
Household Account
→ Transfer
→ Personal Account
```

Luego el gasto privado ocurre dentro de Personal Finance.

---

# 17. CONTRIBUTIONS

Aporte al fondo común:

```text
Personal Account
→ Household Account
```

es Transfer.

No es Income Household.

Reports pueden exponer una estadística separada de Contributions.

---

# 18. REIMBURSEMENT

Si una persona paga un Household Expense personalmente y luego el Household la reembolsa:

```text
Household Account
→ Personal Account
```

es Transfer.

No se crea un segundo Expense.

---

# 19. CREDIT CARD SEMANTICS

Una tarjeta puede representarse como Account con Balance negativo.

Compra:

```text
Visa
→ Expense $100.000
→ Visa Balance -$100.000
```

Pago de tarjeta:

```text
Bank Account
→ Transfer
→ Visa
```

No se registra un segundo Expense.

---

# 20. TRANSACTION EDITING

## 20.1 Correctable fields

El usuario puede corregir, cuando sea semánticamente válido:

- Amount;
- Date;
- Category;
- Description;
- Account;
- Context;
- Notes.

## 20.2 Revision history

La verdad actual utiliza la versión corregida.

History conserva que hubo una corrección relevante.

## 20.3 Privacy safety

Una edición no puede convertir silenciosamente un movimiento financiado con Household money en invisible para Household.

---

# 21. TRANSACTION LIFECYCLE

```text
ACTIVE
→ TRASH
→ RESTORE
```

## 21.1 Trash

Mientras está en Trash:

```text
Account Balance → no effect
Budget          → no effect
Reports         → no effect
```

## 21.2 Restore

Restaura el efecto financiero si no existe conflicto.

## 21.3 Permanent delete

Pertenece al Global Data Lifecycle Pass.

---

# 22. REAL REVERSAL vs DELETE

Si el movimiento nunca ocurrió:

```text
Trash
```

Si ocurrió y después fue revertido:

```text
preserve original fact
+
register real reversal
```

No se elimina historia verdadera.

---

# 23. REFUND

Refund representa una devolución real vinculada a un Expense previo.

No es Income.

## 23.1 Full Refund

```text
Expense $80.000
Refund  $80.000
Net Expense $0
```

## 23.2 Partial Refund

```text
Expense $80.000
Refund  $20.000
Net Expense $60.000
```

## 23.3 Effects

```text
Account Balance   → increases by refunded amount when Account known
Expense Net       → decreases
Budget Spent      → decreases
Income            → unchanged
```

## 23.4 Refund limits

Refunds vinculados no deben superar el Expense original en V1.

## 23.5 Parent protection

Un Expense con Refund activo no puede ser enviado a Trash dejando Refund huérfano.

Debe resolverse la relación explícitamente.

---

# 24. CATEGORY

Category ayuda a comprender el gasto.

Es opcional en quick entry.

Puede existir una base inicial útil, por ejemplo:

- Comida;
- Servicios;
- Casa;
- Transporte;
- Salud;
- Educación;
- Ocio;
- Compras;
- Otros.

El set exacto de labels es frontend/product-content detail, no invariant.

## 24.1 Lifecycle

```text
ACTIVE
↕
ARCHIVED
```

Archived Category:

- no se ofrece normalmente para nuevas Transactions;
- permanece en Transactions históricas;
- no recategoriza el pasado.

---

# 25. BUDGET

## 25.1 Core focus

V1 prioriza:

```text
MONTHLY BUDGET
```

## 25.2 Core properties

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

---

# 26. TOTAL + CATEGORY BUDGETS

Pueden coexistir.

Ejemplo:

```text
Total       ARS 1.000.000
Comida      ARS   400.000
Servicios   ARS   200.000
```

No se exige:

```text
sum(category budgets)
=
total budget
```

Son límites complementarios.

---

# 27. BUDGET SPENDING

Se deriva de financial truth:

```text
Expense
→ increases spent

Refund
→ decreases spent

Transfer
→ no effect

Balance Adjustment
→ no effect
```

Expense sin Category afecta Total Budget, pero no un Category Budget.

---

# 28. BUDGET EXCEEDED

Budget nunca bloquea registrar un gasto real.

```text
Budget 400.000
Spent  450.000
→ OVER BUDGET
```

El gasto sigue siendo válido.

---

# 29. NO CARRY-OVER

V1 congela:

```text
NO AUTOMATIC CARRY-OVER
```

El sobrante de un mes no aumenta automáticamente el Budget del siguiente.

---

# 30. BUDGET LEFTOVER

```text
Budget Remaining
```

es un resultado estadístico.

No es:

- Account Balance;
- Savings;
- Transfer;
- Income.

Invariant:

> Budget representa intención de gasto; Account representa dinero.

---

# 31. SAVINGS

No existe un objeto Finance Savings Goal independiente.

Ahorro se representa mediante Accounts normales:

```text
Ahorros personales
Ahorros USD
Fondo de emergencia
Ahorros Household
```

Mover dinero a ahorro:

```text
Operational Account
→ Transfer
→ Savings Account
```

## 31.1 Month-end suggestion

Finance puede sugerir:

```text
Terminaste por debajo del presupuesto.
¿Transferir dinero a ahorros?
```

Pero:

- nunca es automático;
- el usuario elige el Amount;
- la Account real debe tener fondos;
- Budget leftover no crea dinero.

---

# 32. BUDGET LIFECYCLE

La configuración repetible puede estar:

```text
ACTIVE
↕
ARCHIVED
```

Cada mes conserva su período histórico.

## 32.1 Edit scope

Al editar un Budget repetible:

```text
Sólo este mes
Este mes y próximos
```

El pasado no cambia silenciosamente.

## 32.2 Historical correction

Corregir una Transaction histórica puede recalcular el `spent` histórico porque cambia financial truth.

No reescribe cuál era el Budget target definido para ese período.

---

# 33. MULTICURRENCY BUDGET / REPORTS

Todo Budget posee Currency.

No se suman monedas incompatibles sin conversión.

Hasta que exista FX:

```text
ARS Reports
USD Reports
...
```

se mantienen separados.

---

# 34. OBLIGATION

Obligation representa un pago esperado que todavía no necesariamente ocurrió.

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
- otros pagos domésticos.

## 34.1 Obligation ≠ Expense

```text
Obligation
→ expected payment

Expense
→ actual money movement
```

Crear una Obligation no crea Expense.

---

# 35. ONE-TIME OBLIGATION

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

Expected Amount puede ser desconocido.

---

# 36. OBLIGATION OCCURRENCE LIFECYCLE

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

OVERDUE es condición derivada.

---

# 37. PAID

Sólo un pago financiero real confirmado lleva una occurrence a PAID.

```text
Register Payment
→ Expense
→ PAID
```

Planner Task Completed no alcanza.

---

# 38. SKIPPED

SKIPPED significa:

> esta occurrence deliberadamente no se paga.

No genera Expense.

En recurrence futura, la serie continúa.

---

# 39. CANCELLED

CANCELLED significa:

> esta occurrence concreta dejó de ser válida.

No termina necesariamente la serie recurrente.

---

# 40. RECURRING OBLIGATION

Una Recurring Obligation representa una regla que genera occurrences.

Ejemplo:

```text
Internet
→ monthly due
```

genera:

```text
July occurrence
August occurrence
September occurrence
```

Cada una preserva su historia.

---

# 41. RECURRING OBLIGATION LIFECYCLE

```text
ACTIVE
↕
PAUSED

ACTIVE / PAUSED
→ ENDED
```

## 41.1 Pause

- no genera nuevas occurrences durante el período pausado;
- occurrences ya existentes permanecen;
- no inventa deuda correspondiente a un período deliberadamente pausado.

## 41.2 Resume

Reanuda futuro.

## 41.3 End

No genera nuevas occurrences.

History permanece.

---

# 42. FINANCIAL DEBT CAN ACCUMULATE

A diferencia de maintenance:

```text
July bill OVERDUE
August bill PENDING
```

pueden coexistir.

No se colapsan.

Obligaciones económicas distintas pueden acumularse.

---

# 43. EDIT RECURRING OBLIGATION

Editar la Rule afecta futuro.

Occurrence existente no cambia silenciosamente.

Para cambiar la occurrence actual:

```text
explicit edit current occurrence
```

---

# 44. PAYMENT

Registrar Payment requiere:

```text
Actual Amount
Currency
```

Account es opcional.

Con Account:

```text
Account Balance affected
```

Sin Account:

```text
Payment/Expense valid
Account Balance unaffected
```

---

# 45. PARTIAL PAYMENTS

V1 NO soporta lifecycle de pagos parciales.

Por lo tanto:

```text
one Obligation Occurrence
→ maximum one active canonical Payment
```

Partial payments quedan Future.

---

# 46. EXPECTED vs ACTUAL AMOUNT

Una Obligation puede tener:

```text
Expected Amount
```

opcional.

El Payment conserva:

```text
Actual Amount
```

Ejemplo:

```text
Expected Internet: 35.000
Actual Payment:    38.450
```

Financial truth usa Actual Amount.

---

# 47. PERSONAL ACCOUNT PAYING HOUSEHOLD OBLIGATION

Permitido.

Resultado:

```text
Household Expense
→ counted in Household

Personal Account
→ balance decreases

Household
→ sees payer/shared fact
→ does not gain Personal Account access
```

---

# 48. HOUSEHOLD ACCOUNT FOR PERSONAL OBLIGATION

No se permite ocultar Household money dentro de Personal Finance.

Camino V1:

```text
Household Account
→ explicit Transfer
→ Personal Account
→ Personal Payment
```

---

# 49. PLANNER INTEGRATION — HOUSEHOLD

Household Obligation puede materializar una acción canónica de Planner.

```text
Household Obligation
↓
Occurrence
↓
Planner Task
↓
Task Completed
↓
Finance Register Payment
↓
Expense
↓
PAID
```

Planner posee Task.

Finance posee Obligation/Payment/Expense.

---

# 50. PLANNER COMPLETION ≠ PAYMENT

Invariant:

```text
Planner Task Completed
≠
Money moved
```

Para una Task Finance-originated:

```text
Complete
→ open Register Payment
```

Si el usuario abandona:

```text
Obligation remains PENDING
or OVERDUE
```

---

# 51. PAYMENT BEFORE PLANNER COMPLETION

Si Payment se registra desde Finance y existe Task:

```text
Offer:
[Complete linked Task]
[Leave it]
```

Planner no cambia silenciosamente.

---

# 52. PLANNER TASK CANCELLED

Cancelar Planner Task no cancela Obligation.

```text
Task CANCELLED
→ Obligation remains PENDING/OVERDUE
```

Finance puede ofrecer:

- Recreate Task;
- Skip occurrence;
- Cancel occurrence.

No existe recreation loop automático.

---

# 53. PERSONAL FINANCE × PLANNER BOUNDARY

Planner V1 congela relaciones Household-scoped.

Finance no inventa una clase paralela de private Personal Planner Task.

Por lo tanto:

```text
HOUSEHOLD OBLIGATION
→ Planner composition allowed

PERSONAL OBLIGATION
→ Finance-owned due state
→ owner-only Finance/Attention behavior
→ no automatic Planner projection V1
```

Una futura private Planner capability requiere decisión cross-module explícita.

---

# 54. PAYMENT TRANSACTION TRASH

Si el Expense/Payment que justificaba `PAID` pasa a Trash:

```text
Obligation
→ PENDING
```

o:

```text
→ OVERDUE
```

si venció.

Nunca:

```text
PAID
without payment truth
```

---

# 55. PAYMENT RESTORE

Restaurar Payment puede restaurar `PAID` si no existe conflicto.

Si ya existe otro Payment activo:

```text
Restore
→ conflict
→ explicit resolution required
```

---

# 56. REPORTS

Core Reports:

```text
Income
Expense
Net
Spending by Category
Month vs Previous Month
Budget vs Actual
Upcoming Obligations
```

La experiencia debe ser visual y entendible, no contable.

---

# 57. REPORT COUNTING RULES

## 57.1 Expense

```text
counted exactly once
according to Financial Context
```

## 57.2 Transfer

```text
Income  NO
Expense NO
Budget  NO
```

## 57.3 Balance Adjustment

```text
Income  NO
Expense NO
Budget  NO
```

## 57.4 Refund

```text
reduces Expense
reduces Budget Spent
Income NO
```

## 57.5 Contributions

Personal → Household contributions:

```text
Transfer
```

No inflan Household Income.

Pueden mostrarse como Contributions en estadística separada.

---

# 58. NET

Conceptualmente:

```text
Net
=
External Income
-
Net Expenses
```

Transfers, Contributions y Balance Adjustments no alteran Net como ingreso/gasto real.

---

# 59. FINANCE MAIN EXPERIENCE

Finance sí puede tener una superficie estadística fuerte propia.

Ejemplo conceptual:

```text
THIS MONTH

Income
Expenses
Net

Budget Progress

Top Spending Categories

Upcoming Payments
```

No define layout final.

---

# 60. HOME

Home sólo proyecta Finance cuando hay relevancia.

Ejemplos:

- pago próximo relevante;
- pago vencido;
- budget excedido.

No existe derecho permanente a un Finance dashboard en Home.

---

# 61. ATTENTION

Core Finance Attention candidates:

```text
PAYMENT DUE
PAYMENT OVERDUE
BUDGET EXCEEDED
```

## 61.1 Budget thresholds below exceeded

80%, 90%, etc. pueden ser visuales dentro de Finance.

No son Attention Core.

## 61.2 Planner deduplication

Si una Household Obligation ya tiene Planner Task activa:

```text
Planner
→ execution reminder authority

Finance
→ financial state
```

No duplicar reminders equivalentes.

## 61.3 Personal Attention

Personal Finance signals:

```text
owner only
```

Nunca Household-visible.

---

# 62. INVENTORY INTEGRATION

Inventory posee:

- items;
- quantities;
- stock;
- replenishment semantics.

Finance posee dinero.

Una compra Inventory puede relacionarse con:

```text
Finance Expense
```

sin copiar line items financieros obligatorios.

---

# 63. ASSETS INTEGRATION

Assets posee:

- Asset;
- maintenance/service/repair truth.

Finance posee:

- Expense/payment/cost truth.

Puede existir:

```text
Asset Repair Record
↔ Finance Expense
```

Trash de Finance Expense no borra Repair real.

---

# 64. HOMECLOUD

Finance puede relacionar:

- factura;
- ticket;
- receipt;
- comprobante;
- documento de obligación.

HomeCloud posee el archivo.

Finance posee sólo la relación contextual.

Documents son opcionales.

---

# 65. SEARCH

Search descubre Finance únicamente según autoridad.

```text
Personal
→ owner

Household
→ authorized Household members
```

Search nunca amplía permisos.

---

# 66. GENI

Geni puede eventualmente interpretar:

```text
"Anotá 20 mil de supermercado."
"¿En qué gasté más este mes?"
"¿Cuánto gastamos en comida?"
"Registrá que pagué Internet."
"¿Qué pagos están vencidos?"
```

pero siempre ejecuta capacidades canónicas Finance.

Geni no crea una contabilidad paralela ni atraviesa privacy.

---

# 67. AUTOMATIONS

Automations puede consumir operaciones canónicas deterministas.

No puede:

- inventar Payment;
- saltar permisos;
- cruzar Personal/Household silenciosamente;
- crear financial truth paralela;
- registrar Expense sin causa/regla válida.

---

# 68. HOUSEHOLD CONTEXT

Household Finance está aislado por Household.

```text
Household A Finance
≠
Household B Finance
```

Personal Finance permanece User-owned.

---

# 69. PERMISSION CAPABILITIES

Finance define capabilities, no paquetes de roles definitivos.

## Personal

```text
PERSONAL FINANCE
→ owner authority
```

Sharing de Personal Accounts/Finance queda fuera del Core V1.

## Household

Capabilities conceptuales:

```text
VIEW HOUSEHOLD FINANCE

MANAGE HOUSEHOLD MONEY
→ Accounts
→ Transactions
→ corrections/refunds

MANAGE HOUSEHOLD BUDGETS

MANAGE HOUSEHOLD OBLIGATIONS
```

HomeCloud/Planner actions respetan además permisos de esos módulos.

Los paquetes por:

- Coordinador;
- Adulto;
- Adolescente;
- Niño;

se congelan en Global Permissions Pass.

---

# 70. ERROR / CONFLICT PATHS

## 70.1 Planner creation failure

```text
Obligation remains PENDING
no fake Planner link
```

## 70.2 Duplicate Payment

Blocked for same occurrence V1.

## 70.3 Duplicate Transfer execution

No puede aplicarse silenciosamente dos veces.

## 70.4 Half Transfer

No es un estado válido del producto.

## 70.5 Cross-currency Transfer missing destination/source amount

Invalid.

## 70.6 Expense with Refund → Trash

Blocked until dependent Refund relation is resolved.

## 70.7 Payment Expense Trash

Recalculates Obligation state.

## 70.8 Account Currency change with History

Blocked.

## 70.9 Household-funded movement made private

Blocked or requires explicit restructuring through Transfer.

## 70.10 Unauthorized Personal Finance read

Invisible/denied.

## 70.11 Account archived while historical obligations/transactions exist

Allowed; history preserved.

## 70.12 HomeCloud document unavailable

Finance object survives.

## 70.13 Finance unavailable relation to Asset/Inventory

Other domain object survives; relationship can become unavailable without deleting canonical object.

---

# 71. FUNCTIONAL COMPOSITIONS

## 71.1 Quick Expense

```text
Amount
→ Expense
→ Reports/Budget
```

## 71.2 Account-aware Expense

```text
Account
→ Expense
→ Balance + Reports + Budget
```

## 71.3 Transfer

```text
Source
→ Destination
→ balances change
→ spending unchanged
```

## 71.4 Personal-funded Household Expense

```text
Personal Account
→ Household Expense
→ Personal Balance
→ Household Analytics
```

## 71.5 Contribution

```text
Personal Account
→ Transfer
→ Household Fund
```

## 71.6 Budget

```text
Monthly Target
→ Transactions
→ Budget vs Actual
```

## 71.7 Savings

```text
Operational Account
→ Transfer
→ Savings Account
```

## 71.8 Household Obligation

```text
Obligation
→ Planner
→ Payment confirmation
→ Expense
→ Paid
```

## 71.9 Inventory Purchase

```text
Inventory purchase truth
↔ Finance Expense
```

## 71.10 Asset Repair

```text
Asset Repair truth
↔ Finance Expense
```

---

# 72. CANONICAL USE CASES & FLOWS

## UC-FIN-001 — Create Personal Account
```text
Name + Currency
→ Personal Account ACTIVE
```

## UC-FIN-002 — Create Household Account
```text
Name + Currency
→ Household Account ACTIVE
```

## UC-FIN-003 — Create Account without Opening Balance
```text
→ BALANCE UNKNOWN
```

## UC-FIN-004 — Establish Balance Anchor
```text
Declare real balance
→ KNOWN Balance
```

## UC-FIN-005 — Correct Balance
```text
Known calculated balance differs
→ Correct Balance
→ Adjustment + new Anchor
```

## UC-FIN-006 — Archive / Unarchive Account
```text
ACTIVE ↔ ARCHIVED
```

## UC-FIN-007 — Record Personal Income
```text
Income
→ Personal context
```

## UC-FIN-008 — Record Household Income
```text
Income
→ Household context
```

## UC-FIN-009 — Record Personal Expense
```text
Expense
→ Personal reports
```

## UC-FIN-010 — Record Household Expense
```text
Expense
→ Household reports
```

## UC-FIN-011 — Record Expense without Account
```text
Expense
→ reports/budget
→ no Account balance
```

## UC-FIN-012 — Personal Account pays Household Expense
```text
Personal source
+ Household context
→ one Household Expense
```

## UC-FIN-013 — Transfer between Accounts
```text
Source → Destination
→ no Income/Expense
```

## UC-FIN-014 — Personal contribution to Household
```text
Personal → Household Transfer
```

## UC-FIN-015 — Household to Personal transfer
```text
Household → Personal
→ visible shared money movement
```

## UC-FIN-016 — Cross-currency Transfer
```text
Source Amount/Currency
→ Destination Amount/Currency
```

## UC-FIN-017 — Credit-card-style Expense
```text
Expense on negative-capable Account
```

## UC-FIN-018 — Pay credit card via Transfer
```text
Bank → Card Account
→ no second Expense
```

## UC-FIN-019 — Edit Transaction
```text
correct fields
→ current truth recalculated
→ revision retained
```

## UC-FIN-020 — Trash Transaction
```text
ACTIVE → TRASH
→ remove financial effects
```

## UC-FIN-021 — Restore Transaction
```text
TRASH → ACTIVE
→ restore effects if conflict-free
```

## UC-FIN-022 — Full Refund
```text
Expense → Refund total
→ Net Expense 0
```

## UC-FIN-023 — Partial Refund
```text
Expense → Refund partial
→ Net Expense reduced
```

## UC-FIN-024 — Archive Category
```text
ACTIVE → ARCHIVED
→ historical classification preserved
```

## UC-FIN-025 — Create Total Monthly Budget
```text
Context + Currency + Month + Amount
```

## UC-FIN-026 — Create Category Budget
```text
Context + Currency + Month + Category + Amount
```

## UC-FIN-027 — Expense updates Budget
```text
Expense → Spent increases
```

## UC-FIN-028 — Refund reduces Budget consumption
```text
Refund → Spent decreases
```

## UC-FIN-029 — Exceed Budget
```text
Spent > Target
→ OVER BUDGET
→ Expense still allowed
```

## UC-FIN-030 — Close month without carry-over
```text
historical result preserved
→ next month fresh target
```

## UC-FIN-031 — Explicit Transfer to Savings
```text
Account → Savings Account
```

## UC-FIN-032 — Edit Budget only current month
```text
current period changes
→ future unchanged
```

## UC-FIN-033 — Edit Budget current and future
```text
current + future configuration changes
→ past unchanged
```

## UC-FIN-034 — Create one-time Obligation
```text
Name + Currency + Due Date
→ PENDING
```

## UC-FIN-035 — Create recurring Obligation
```text
Rule ACTIVE
→ future occurrences
```

## UC-FIN-036 — Generate recurrence occurrence
```text
Rule
→ individual occurrence PENDING
```

## UC-FIN-037 — Household Obligation creates Planner Task
```text
Occurrence
→ canonical Planner Task
```

## UC-FIN-038 — Planner completion opens Payment registration
```text
Task Completed
→ Register Payment
```

## UC-FIN-039 — Exit payment handoff without paying
```text
Task completed
→ Obligation stays PENDING/OVERDUE
```

## UC-FIN-040 — Register Payment before Planner completion
```text
Finance payment
→ PAID
→ offer complete Planner Task
```

## UC-FIN-041 — Cancel Planner Task
```text
Task cancelled
→ Obligation remains unresolved
```

## UC-FIN-042 — Skip occurrence
```text
PENDING → SKIPPED
```

## UC-FIN-043 — Cancel occurrence
```text
PENDING → CANCELLED
```

## UC-FIN-044 — Pause recurring Obligation
```text
ACTIVE → PAUSED
```

## UC-FIN-045 — Resume recurring Obligation
```text
PAUSED → ACTIVE
```

## UC-FIN-046 — End recurrence
```text
ACTIVE/PAUSED → ENDED
```

## UC-FIN-047 — Multiple unpaid occurrences coexist
```text
July OVERDUE
August PENDING
```

## UC-FIN-048 — Trash Payment transaction
```text
Payment removed
→ PAID recalculated to PENDING/OVERDUE
```

## UC-FIN-049 — Restore Payment transaction
```text
restore
→ PAID if conflict-free
```

## UC-FIN-050 — Household reports personal-funded Expense once
```text
Household Context
→ counted once in Household
```

## UC-FIN-051 — Personal reports exclude Household Expense
```text
Personal Account funded
but Context Household
→ not Personal spending
```

## UC-FIN-052 — Reports separate currencies
```text
ARS / USD
→ no unsupported aggregation
```

## UC-FIN-053 — Personal Finance remains private cross-Household
```text
unauthorized member
→ no discovery
```

## UC-FIN-054 — Personal Obligation does not invent private Planner Task
```text
Personal Obligation
→ Finance-owned due behavior
```

## UC-FIN-055 — Inventory purchase relation
```text
Inventory purchase
↔ Finance Expense
```

## UC-FIN-056 — Asset repair relation
```text
Asset Repair
↔ Finance Expense
```

## UC-FIN-057 — Optional receipt/document
```text
Finance object
↔ HomeCloud file
```

## UC-FIN-058 — Budget Exceeded Attention
```text
OVER BUDGET
→ Attention candidate
```

## UC-FIN-059 — Payment Due Attention
```text
PENDING approaching due
→ candidate when not duplicated by Planner
```

## UC-FIN-060 — Payment Overdue Attention
```text
PENDING + due passed
→ OVERDUE candidate
```

---

# 73. SCOPE

## 73.1 CORE TARGET V1

Incluye:

- Personal Finance;
- Household Finance;
- strict privacy separation;
- manual Accounts;
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
- quick Expense without Account;
- Transaction editing + History;
- Trash/Restore;
- Refund;
- Categories;
- Monthly Total Budget;
- Category Budgets;
- no automatic carry-over;
- Budget vs Actual;
- Savings through normal Accounts;
- one-time Obligations;
- recurring Obligations;
- occurrence history;
- Pending/Paid/Skipped/Cancelled;
- derived Overdue;
- Household Planner payment composition;
- Reports;
- multicurrency without FX engine;
- optional HomeCloud receipts/documents;
- Inventory relation;
- Assets relation;
- Home;
- Attention;
- Search;
- Automations compatibility;
- Geni compatibility;
- permission capabilities.

## 73.2 FUTURE / ENHANCEMENT

Sólo si aparece necesidad real:

- Bank Sync / Open Banking;
- automatic FX conversion;
- exchange-rate accounting;
- globally-approved private Planner capability;
- optional Personal Account sharing;
- recurring expected Income templates;
- partial payments;
- advanced anomaly insights;
- advanced savings insights;
- richer financial analytics.

## 73.3 EXPLICITLY NOT TARGET

No forman parte del Target V1:

- investment portfolios;
- stock tracking;
- crypto trading;
- tax accounting;
- payroll;
- business invoices;
- customers;
- suppliers;
- visible double-entry bookkeeping;
- journal/accounting UI;
- credit scoring;
- loan amortization engine;
- mortgage engine;
- complex debt planner;
- Splitwise-style settlements;
- Finance-specific Savings Goal system;
- enterprise accounting;
- AI-dependent financial advice.

---

# 74. PRODUCT INVARIANTS

## Scope & Privacy

### FIN-INV-001
Finance no es banco ni contabilidad empresarial.

### FIN-INV-002
Personal Finance pertenece al User.

### FIN-INV-003
Household Finance pertenece al Household.

### FIN-INV-004
Personal Finance es privada por defecto.

### FIN-INV-005
Household authority no otorga acceso automático a Personal Finance.

### FIN-INV-006
Personal Finance no filtra datos a Household Search, Home, Feed, Activity, Attention o Geni.

### FIN-INV-007
Household-funded money no puede ocultarse como Personal mediante una edición.

---

## Accounts & Balance

### FIN-INV-008
No Opening Balance no equivale a zero.

### FIN-INV-009
Known Balance necesita un Balance Anchor confiable.

### FIN-INV-010
Balance Adjustment modifica Balance pero no Income/Expense/Budget.

### FIN-INV-011
Negative Account Balance es válido.

### FIN-INV-012
Account Currency no cambia después de existir History financiera.

### FIN-INV-013
Archived Account conserva Balance e History.

---

## Transactions

### FIN-INV-014
Income significa dinero externo entrante.

### FIN-INV-015
Expense significa dinero realmente gastado.

### FIN-INV-016
Transfer no es Income ni Expense.

### FIN-INV-017
Transfer afecta ambos extremos como una operación lógica.

### FIN-INV-018
Source Account y Destination Account de Transfer no pueden ser la misma.

### FIN-INV-019
Cross-currency Transfer requiere Source Amount y Destination Amount.

### FIN-INV-020
Account es opcional para Income/Expense pero obligatorio semánticamente para Transfer.

### FIN-INV-021
Expense Analytics siguen Financial Context.

### FIN-INV-022
Funding Source no duplica Expense.

### FIN-INV-023
Personal-funded Household Expense no expone Personal Account.

### FIN-INV-024
Contribution Personal→Household es Transfer, no Income.

### FIN-INV-025
Reimbursement es Transfer, no segundo Expense.

### FIN-INV-026
Transaction correction preserva History.

### FIN-INV-027
Real reversal no equivale a Delete.

### FIN-INV-028
Trash elimina efectos financieros actuales pero preserva Restore.

---

## Refund

### FIN-INV-029
Refund no es Income.

### FIN-INV-030
Refund referencia un Expense real.

### FIN-INV-031
Refund reduce Net Expense y Budget Spent.

### FIN-INV-032
Refunds V1 no exceden el Expense original.

### FIN-INV-033
Expense con Refund activo no puede dejar Refund huérfano.

---

## Budget & Savings

### FIN-INV-034
Budget nunca bloquea registrar un Expense real.

### FIN-INV-035
Budget Spent deriva de Transactions.

### FIN-INV-036
Transfer no consume Budget.

### FIN-INV-037
Balance Adjustment no consume Budget.

### FIN-INV-038
Refund reduce Budget Spent.

### FIN-INV-039
Budget leftover no representa dinero.

### FIN-INV-040
No existe carry-over automático V1.

### FIN-INV-041
Savings se representa mediante Accounts normales.

### FIN-INV-042
Mover dinero a Savings requiere Transfer real.

### FIN-INV-043
Budget Currency no mezcla monedas sin FX.

### FIN-INV-044
Editar Budget futuro no reescribe targets pasados.

---

## Obligations & Payments

### FIN-INV-045
Obligation no equivale a Expense.

### FIN-INV-046
Planner Task Completed no equivale a Payment.

### FIN-INV-047
Obligation PAID requiere Payment real.

### FIN-INV-048
OVERDUE es derivado.

### FIN-INV-049
Recurring occurrences preservan historia individual.

### FIN-INV-050
Obligaciones financieras impagas pueden acumular occurrences.

### FIN-INV-051
Pause no genera occurrences durante el período pausado.

### FIN-INV-052
Editar recurrence no reescribe occurrences existentes.

### FIN-INV-053
V1 no soporta partial-payment lifecycle.

### FIN-INV-054
Una Obligation occurrence posee máximo un Payment activo canónico V1.

### FIN-INV-055
Trash del Payment recalcula Obligation state.

### FIN-INV-056
Planner Task cancelada no cancela Obligation.

### FIN-INV-057
Household Obligation puede componerse con Planner.

### FIN-INV-058
Personal Finance no inventa un private Planner model paralelo.

---

## Reports

### FIN-INV-059
Cada Expense se cuenta una sola vez.

### FIN-INV-060
Transfer queda fuera de Income/Expense/Budget.

### FIN-INV-061
Balance Adjustment queda fuera de Income/Expense/Budget.

### FIN-INV-062
Refund reduce Expense, no crea Income.

### FIN-INV-063
Contributions no inflan Income externo.

### FIN-INV-064
Reports no suman currencies incompatibles sin FX.

---

## Cross-module ownership

### FIN-INV-065
Finance posee financial truth.

### FIN-INV-066
Planner posee acciones temporales.

### FIN-INV-067
Inventory posee quantities/stock.

### FIN-INV-068
Assets posee Asset/service/repair truth.

### FIN-INV-069
HomeCloud posee archivos.

### FIN-INV-070
Attention decide relevancia final.

### FIN-INV-071
Notifications posee delivery.

### FIN-INV-072
Search no amplía permisos.

### FIN-INV-073
Automations/Geni consumen operaciones canónicas y no crean modelos paralelos.

### FIN-INV-074
Finance Core funciona completamente sin IA.

---

# 75. LOGICAL CONSISTENCY AUDIT

## 75.1 Mission
**PASS**

Finance doméstico útil sin banca/contabilidad empresarial.

## 75.2 Personal / Household scope
**PASS**

Ownership y visibilidad separados.

## 75.3 Multi-household
**PASS**

Personal permanece User-owned; Household cambia por contexto.

## 75.4 Account model
**PASS**

Manual, multicurrency y opcional para Income/Expense.

## 75.5 Unknown Balance
**PASS**

No se inventa zero.

## 75.6 Balance reconciliation
**PASS**

Balance Anchor y Adjustment definidos.

## 75.7 Negative Balance
**PASS**

Permite credit-card semantics sin subsystem.

## 75.8 Income / Expense / Transfer
**PASS**

Semántica mutuamente clara.

## 75.9 Cross-scope Expense
**PASS**

Source y Financial Context separados sin double-count.

## 75.10 Household money privacy safety
**PASS**

Movimiento compartido no puede ocultarse.

## 75.11 Transaction correction/history
**PASS**

Corrección permitida con historical integrity.

## 75.12 Trash / Restore
**PASS**

Efectos financieros y restore definidos.

## 75.13 Refund
**PASS**

No se falsifica Income y se preserva Budget/Expense net.

## 75.14 Category lifecycle
**PASS**

Archive preserva history.

## 75.15 Budget
**PASS**

Total/category, derived spending, over-budget behavior.

## 75.16 No carry-over
**PASS**

Sobrante estadístico no se convierte en dinero.

## 75.17 Savings
**PASS**

Resuelto con Account + Transfer, sin subsystem.

## 75.18 Multicurrency
**PASS**

Native currencies sin conversiones inventadas.

## 75.19 One-time Obligation
**PASS**

Lifecycle completo.

## 75.20 Recurring Obligation
**PASS**

Rule + occurrences + pause/end/history.

## 75.21 Debt accumulation
**PASS**

Occurrences impagas pueden coexistir.

## 75.22 Payment
**PASS**

Actual money movement separado de intent.

## 75.23 Planner integration Household
**PASS**

Ownership preservado.

## 75.24 Planner integration Personal
**PASS — safely bounded**

No se inventa private Planner capability.

## 75.25 Attention
**PASS**

Payment Due / Overdue / Budget Exceeded + dedup.

## 75.26 Reports
**PASS**

No double-count, multicurrency safe.

## 75.27 Inventory boundary
**PASS**

Inventory quantities, Finance money.

## 75.28 Assets boundary
**PASS**

Assets physical history, Finance money.

## 75.29 HomeCloud boundary
**PASS**

Files remain HomeCloud-owned.

## 75.30 Search / Geni privacy
**PASS**

No privilege widening.

## 75.31 Permissions
**PASS**

Capabilities defined; packages deferred to Global Permissions Pass.

## 75.32 Destructive paths
**PASS**

Transaction Trash, Account Archive, Refund dependency and permanent delete boundary defined.

## 75.33 Error/conflict paths
**PASS**

No major Core path lacks a safe outcome.

## 75.34 Technical architecture leakage
**PASS**

No tables/APIs/jobs/RPCs frozen.

## 75.35 Internal contradictions
**PASS**

No unresolved contradiction between Scope, Money, Budget, Obligations, Planner and Privacy.

---

# 76. FINAL ACCEPTANCE DEFINITION

Finance V1.0 está alineado cuando puede demostrarse que:

1. Personal Finance y Household Finance son scopes distintos;
2. Personal Finance es privada por defecto;
3. un adulto no obtiene automáticamente acceso al Finance personal de otro;
4. una Account puede crearse sin Opening Balance;
5. ausencia de Opening Balance no se interpreta como zero;
6. Balance puede anclarse y corregirse explícitamente;
7. Balance Adjustment no contamina gastos/ingresos;
8. una Account puede tener Balance negativo;
9. Currency histórica de Account no se reinterpreta;
10. Income, Expense y Transfer tienen semánticas distintas;
11. Expense puede registrarse sin Account;
12. Transfer requiere origen/destino;
13. Transfer no cuenta como Expense ni Income;
14. cross-currency Transfer conserva ambos Amounts;
15. Personal Account puede financiar Household Expense;
16. ese gasto se cuenta una sola vez en Household;
17. ese gasto no aparece como Personal spending;
18. Household no obtiene acceso al Personal Account;
19. Household-funded money no puede ocultarse como Personal;
20. Contributions son Transfers;
21. Reimbursements son Transfers;
22. tarjeta puede representarse con Account negativa;
23. pagar tarjeta es Transfer, no segundo Expense;
24. Transaction puede corregirse preservando History;
25. Transaction Trash quita efectos financieros;
26. Restore recupera efectos cuando no hay conflicto;
27. Refund no es Income;
28. Refund reduce Net Expense y Budget;
29. Category es opcional;
30. Category Archive preserva clasificación histórica;
31. Monthly Total Budget existe;
32. Category Budget existe;
33. Expense sin Category afecta Total Budget;
34. Budget nunca bloquea un gasto real;
35. no existe carry-over automático;
36. Budget leftover nunca crea dinero;
37. Savings usa Account + Transfer;
38. Budget/Reports no mezclan currencies sin FX;
39. Obligation no crea Expense por existir;
40. Expected Amount puede ser desconocido;
41. PENDING/PAID/SKIPPED/CANCELLED están definidos;
42. OVERDUE es derivado;
43. recurring Obligation crea occurrences históricas;
44. debt occurrences pueden acumularse;
45. pause/end no reescriben pasado;
46. Planner Task completion no marca Payment automáticamente;
47. Payment real marca Obligation PAID;
48. Payment manual puede reconciliar Planner Task;
49. Task cancelada no cancela Obligation;
50. Personal Obligation no inventa private Planner Task;
51. Household Obligation sí puede componerse con Planner;
52. Trash de Payment recalcula Obligation;
53. Reports cuentan cada Expense una sola vez;
54. Transfers/Adjustments quedan fuera de Income/Expense;
55. Refunds reducen gastos sin inflar Income;
56. Home sólo muestra Finance cuando es relevante;
57. Attention Core se limita a Payment Due, Payment Overdue y Budget Exceeded;
58. Inventory/Assets/HomeCloud conservan ownership;
59. Search/Geni respetan privacy;
60. Finance funciona sin IA;
61. Bank Sync/Open Banking no es requisito V1;
62. investimentos/trading/enterprise accounting/Splitwise-like settlements no forman parte del Target V1.

---

# 77. DONOR RELATIONSHIP

La Product Truth de este documento NO depende de un donor.

El donor es una fuente de capacidad de implementación, no autoridad de producto.

La selección operativa vigente al cierre se registra en el handoff separado:

```text
HOMePLUS_FINANCE_IMPLEMENTATION_HANDOFF.md
```

La incorporación efectiva de cualquier donor está condicionada a:

```text
CURRENT HOMePLUS AUDIT
→ DONOR + CURRENT vs TARGET
→ REAL GAP
```

No se permite portar un donor entero ni reemplazar Auth, Household, Planner, Navigation, Permissions o UI system canónicos de HOMePLUS.

---

# 78. FINAL STATUS

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0

MODULE_PRODUCT_DEFINITION_CLOSED
LOGICALLY CLOSED
PRODUCT BEHAVIOR COMPLETE
DONOR CAPABILITIES SELECTED
FRONTEND DETAIL PENDING
IMPLEMENTATION NOT YET AUDITED
```

## Pipeline status

```text
PRODUCT CONTRACT                  ✅
DONOR DISCOVERY                   ✅
DONOR CAPABILITY AUDIT            ✅
USER SELECTS CAPABILITIES         ✅
STRESS TESTS / LOGICAL AUDIT      ✅
MODULE PRODUCT FREEZE             ✅

CURRENT HOMePLUS AUDIT            ⏸ NOT STARTED
DONOR + CURRENT vs TARGET         ⏸ NOT STARTED
REAL GAP                          ⏸ NOT STARTED
IMPLEMENTATION PLAN               ⏸ NOT STARTED
MINIMAL INTEGRATION               ⏸ NOT STARTED
```

# END OF DOCUMENT
