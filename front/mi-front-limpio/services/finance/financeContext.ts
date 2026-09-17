export const FINANCE_CONTEXT_TYPES = {
  PERSONAL: 'personal',
  HOUSEHOLD: 'household',
} as const;

export type FinanceContextType = typeof FINANCE_CONTEXT_TYPES[keyof typeof FINANCE_CONTEXT_TYPES];

export const FINANCE_TABS = ['resumen', 'movimientos', 'pagos'] as const;

export type FinanceTabKey = typeof FINANCE_TABS[number];

export const FINANCE_TAB_LABELS: Record<FinanceTabKey, string> = {
  resumen: 'Resumen',
  movimientos: 'Movimientos',
  pagos: 'Pagos',
};

export type FinanceActiveHousehold = {
  id: string;
  name: string;
} | null;

export type FinanceSelectorOption = {
  contextType: FinanceContextType;
  label: string;
};

export type FinanceContextViewState =
  | 'loading'
  | 'personal_ready'
  | 'household_ready'
  | 'household_unavailable';

export function isFinanceContextType(value: unknown): value is FinanceContextType {
  return value === FINANCE_CONTEXT_TYPES.PERSONAL || value === FINANCE_CONTEXT_TYPES.HOUSEHOLD;
}

export function financeSelectorOptions(activeHousehold: FinanceActiveHousehold): FinanceSelectorOption[] {
  const options: FinanceSelectorOption[] = [
    { contextType: FINANCE_CONTEXT_TYPES.PERSONAL, label: 'Personal' },
  ];

  if (activeHousehold) {
    options.push({
      contextType: FINANCE_CONTEXT_TYPES.HOUSEHOLD,
      label: activeHousehold.name,
    });
  }

  return options;
}

export function financeContextLabel(
  selectedContext: FinanceContextType,
  activeHousehold: FinanceActiveHousehold,
  loading: boolean,
): string {
  if (selectedContext === FINANCE_CONTEXT_TYPES.PERSONAL) return 'Personal';
  if (loading) return 'Actualizando contexto';
  return activeHousehold?.name ?? 'Contexto no disponible';
}

export function financeContextViewState(
  selectedContext: FinanceContextType,
  activeHousehold: FinanceActiveHousehold,
  loading: boolean,
): FinanceContextViewState {
  if (loading) return 'loading';
  if (selectedContext === FINANCE_CONTEXT_TYPES.PERSONAL) return 'personal_ready';
  return activeHousehold ? 'household_ready' : 'household_unavailable';
}

export function selectFinanceContext(
  currentContext: FinanceContextType,
  nextContext: FinanceContextType,
): FinanceContextType {
  return isFinanceContextType(nextContext) ? nextContext : currentContext;
}

export function selectFinanceTab(currentTab: FinanceTabKey, nextTab: FinanceTabKey): FinanceTabKey {
  return FINANCE_TABS.includes(nextTab) ? nextTab : currentTab;
}
