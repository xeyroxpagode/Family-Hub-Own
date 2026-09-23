# Finance UI System — Stage 7A (fundación)

Autoridad compartida de UI/interacciones para Finanzas. La usan 7B / 7C / 7D
en sus barridos rama por rama. **7A no migra pantallas**: los consumers
actuales siguen con implementaciones locales hasta su fase.

Importar desde `components/finance/ui` (scope Finance; no toca primitivas
app-globales: `ActionSheet`, `AppButton`, `AppInput`, `MoneyInput`,
`AppCard`, `InteractivePressable`, `theme` quedan intactos).

## 1. Sección (`FinanceSection`)

`Título → contenido → acción > → boundary sutil → siguiente sección`.
Ritmo: título→contenido 12, contenido→acción 8, sección→sección 28
(`financeSpacing`). El padre apila secciones con gap 28. `divided={false}`
en la última sección.

## 2. Superficies (`FinanceSurface` + flat por defecto)

- **FLAT**: `View` plano. Default (este mes, tu dinero, breakdown,
  metadata, listas recientes).
- **SOFT_SEMANTIC** (`FinanceSemanticSurface`, tonos brand/success/
  warning/danger/info/neutral): una sola verdad importante (balance,
  deuda, límite general, aviso).
- **GROUPED** (`FinanceGroupedSurface`): colección real (cuentas,
  tarjetas, grupo de acciones del pozo). Filas planas adentro, divisores
  inset, nunca card-dentro-de-card salvo jerarquía anidada real.

## 3. Segmentado (`FinanceSegmented`, large / compact)

Una sola autoridad, misma pista (`surface.soft` + borde sutil), mismo
relleno seleccionado (`brand`), misma familia tipográfica, semántica
radio, Light/Dark dinámico. `large` (track 52, opción 44, bodySmall) para
elecciones modo principales; `compact` (track 40, opción 32, caption)
para contexto/tipo.

## 4. Utility / período (`FinanceUtilityRow`, `FinancePeriodLabel`)

`LEFT | CENTER | RIGHT`. Laterales reservan 44 aunque estén vacíos para
que el período quede ópticamente centrado. Controles icon-only con hit
~44 e icono visualmente liviano (`AppButton variant="icon" size="sm"`).
Etiqueta de período: mayúsculas, `bodySmall 800`, una línea
(`SEPTIEMBRE 2026`, `2026`). Sin semántica de fechas nueva.

## 5. Filas (`FinanceRows`)

- `FinanceListRow`: icono opcional (`FinanceIconBox` 40/32) | título |
  subtítulo | valor/monto/acción derecha | chevron | divisor inset (52
  con icono, 0 sin icono). Mínimo 52, `pressed` sutil, títulos largos con
  elipsis sin desplazar la verdad derecha.
- `FinanceSelectionRow`: identidad del campo + valor + chevron, plano con
  divisor. Estados: normal / seleccionado / placeholder / disabled / error.
- `FinanceDisclosureRow`: `Más detalles v`, chevron cambia, contenido
  directo. Nunca abre sheet.

## 6. Campos (`FinanceDetail` + existentes)

- `MONEY_INPUT`: `MoneyInput` existente (input fuerte acotado, se mantiene).
- `TEXT_INPUT`: `AppInput` (borde funcional porque se escribe adentro).
- `SELECTION_ROW` / `DATE_ROW`: `FinanceSelectionRow`.
- `DISCLOSURE_ROW`: `FinanceDisclosureRow`.
- `INLINE_CHOICE`: `FinanceInlineChoice` (compacto, ≤4 opciones).
- `READ_ONLY`: `FinanceDetailMetaRow` (metadata, sin chevron ni press).
- `DISABLED_DEPENDENCY`: tokens disabled (`FINANCE_DISABLED_POLICY`),
  nunca tarjetas pálidas aleatorias.

## 7. Inline vs child sheet

- **INLINE**: set finito, sin búsqueda, sin catálogo, solo afecta al form
  actual (`FinanceInlineChoice`).
- **CHILD SHEET**: búsqueda/catálogo, muchas opciones, grilla visual,
  calendario (tamaños en `FINANCE_SHEET_SIZE_POLICY`).
- **CONFIRMATION**: destructivo, consecuencias de ciclo de vida, alcance
  de serie futura, restauración/cancelación.

## 8. Footer (`FinanceFormFooter`)

`[Cancelar ghost 1fr] [Primario 2fr]`, o solo primario. Destructivo usa
variante `danger`. Altura 52 (`AppButton md`), divisor superior opcional,
`loading`/`disabled` incluidos. Safe-area y teclado según contrato §11.

## 9. Detalle (`FinanceDetail`)

Orden semántico fijo, alturas libres: `FinanceDetailHeader`
(IDENTIDAD → MONTO PRIMARIO → SOPORTE) → `FinanceDetailSection`
(DESGlOSE / METADATA con `FinanceDetailMetaRow`) → ACCIÓN PRIMARIA →
CONTENIDO RELACIONADO → SECUNDARIO/CICLO DE VIDA. Sin migrar detalles
en 7A.

## 10. Vacíos / errores / disabled (`FinanceStates`, `financePolicies`)

- Vacíos: `inline` (una línea) / `section` (icono 40 + título + copy +
  acción texto) / `domain` (global `EmptyState`, solo si el dominio está
  genuinamente vacío). Sin tarjetas vacías gigantes.
- Errores: `inline` (caption danger) / `form` / `refresh` (no debe
  implicar falta de datos: "mostramos los últimos datos") / `full`.
- Disabled: `FINANCE_DISABLED_POLICY`.

## 11. Sheets / teclado / a11y / destructivo / tema

- Sheets: `FINANCE_SHEET_SIZE_POLICY` (preserva sizing Stage 5, sin altos
  mágicos fijos).
- Teclado: `FINANCE_KEYBOARD_CONTRACT` (input visible, CTA alcanzable,
  el sheet crece hasta el máximo seguro y vuelve a su tamaño natural).
- A11y: `FINANCE_A11Y_BASELINE` (labels en icon-only, hit 44, selección
  semántica, elipsis segura).
- Destructivo: `FINANCE_BUTTON_RANK_POLICY` (un solo tratamiento danger).
- Tema: todo vía `useAppTheme`, cero hex crudos. Tipografía/espaciado/
  iconos: `financeTokens` (`financeSpacing`, `financeTypographyRoles`,
  40/32/20/18/16).

## 12. Mapa de migración 7B — familia Resumen

- `screens/finance/FinanceScreen.tsx`: tabs Resumen|Movimientos|Pagos
  (`styles.tab`) → `FinanceSegmented large`; scope Personal|Hogar
  (`scopeSegmented`) → `compact`; filtros Gastos|Ingresos|Transferencias
  → `compact` o `large` según 7B; superficies resumen → `FinanceSection`
  + `FinanceSemanticSurface`; `FinanceSummarySurface` interna (mismo
  archivo) → utility row + superficies.
- `screens/finance/FinanceAnalysisDetailScreen.tsx`: `tabBar`
  Gastos|Ingresos|Evolución → `large`; `periodControl` → utility row;
  `categoryRow*` → `FinanceListRow`; headers → `FinanceSection`.
- `screens/finance/FinanceAccountsScreen.tsx` + `AccountDetailSheet` +
  `AccountFormSheet` + `AccountEditSheet`: grupos → `FinanceGroupedSurface`;
  `FormActionRow` → `FinanceSelectionRow`; footers → `FinanceFormFooter`;
  detalle → gramática §9.
- Pozos: `FinancePoolSummary`, `FinancePoolManagementScreen`,
  `PoolDetailSheet`, `CreatePoolSheet`, `AllocatePoolSheet`,
  `ReleasePoolSheet`, `RenamePoolSheet`, `ArchivePoolSheet`,
  `TransferBetweenPoolsSheet`, `PoolSelectorSheet`,
  `CategoryPoolDefaultSheet`: idem filas/selección/footer/superficies.
- Límites: `FinanceSpendingLimitSummary`,
  `FinanceSpendingLimitsManagementScreen`, `SpendingLimitSheet`,
  `SpendingLimitDetailSheet`: vacíos `section` (§10), resto idem.
- Categorías: `FinanceCategoryManagementScreen`,
  `CreateFinanceCategorySheet`, `CategorySelectorSheet`:
  Gastos|Ingresos → `compact`; icon picker es CHILD SHEET (catálogo).
- `FinanceAnalysisHighlights`: superficies semánticas.

## 13. Mapa de migración 7C — familia Movimientos

- `NewMovementSheet.tsx` (incl. tipo Gasto|Ingreso|Transferir → `large`;
  ~12 `FormActionRow` → `FinanceSelectionRow`/`FinanceInlineChoice`;
  footer → `FinanceFormFooter`; size → `FINANCE_SHEET_SIZE_POLICY`).
- `MovementDetailSheet`, `TransferDetailSheet`,
  `TrashMovementDetailSheet`, `TransactionCorrectionSheet`,
  `BalanceAnchorSheet`: detalle §9 + confirmaciones destructivas.
- `screens/finance/FinancePapeleraScreen.tsx`: `inline`/`section`
  vacíos, filas trash (`FinanceListRow` + rank destructivo).
- `MoneyInput`: se mantiene; alinear `currencyOptions` al lenguaje
  selected track si 7C lo decide (sin cambiar dominio).
- `AccountSelector`, `CategorySelectorSheet`, pool pickers: CHILD SHEET
  catálogo (`near-full`).

## 14. Mapa de migración 7D — familia Pagos

- `NewPaymentSheet` (recurrencia simple → `FinanceInlineChoice`; la
  fricción de recurrencia se resuelve aquí, no en 7A), `PaymentDetailSheet`
  (Ver movimiento queda para 7D), `RegisterPaymentSheet`,
  `EditPaymentDueSheet`, `PayCreditCardSheet`,
  `DirectCreditCardPaymentSheet`, `PaymentRecurrenceEditor`
  (calendario = CHILD SHEET), `PaymentsList`, `PaymentRow`
  (→ `FinanceListRow`), pickers asociados (cuenta/pozo/categoría =
  catálogos `near-full`).

## 15. Legado NO removido en 7A

`SegmentedControl` global, `FormActionRow` (ActionSheet), `Row` global,
`EmptyState`/`ErrorState` globales, segmentados/tab-bars locales en
`FinanceScreen` y `FinanceAnalysisDetailScreen`, tarjetas/superficies
locales en todos los consumers listados arriba. Se retiran o migran en
7B/7C/7D/7H según el mapa.
