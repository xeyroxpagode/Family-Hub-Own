import { OPERATION_KINDS, requestJson } from '../api';
import type { HomePlusIconName } from '../../constants/icons';
import type { FinanceContextType } from './financeContext';
import type { FinanceCategoryDto, FinanceTransactionKind } from './financeMovements';

export type CreateFinanceCategoryPayload = {
  contextType: FinanceContextType;
  type: FinanceTransactionKind;
  label: string;
};

export type CreateFinanceCategoryResponse = {
  category: FinanceCategoryDto;
};

export const createFinanceCategory = (
  accessToken: string,
  payload: CreateFinanceCategoryPayload,
) =>
  requestJson<CreateFinanceCategoryResponse>('/api/finance/categories', {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: payload,
  });

type FinanceCategoryTone = 'terracotta' | 'sage' | 'sand' | 'neutral' | 'info';

export type FinanceCategoryPresentation = {
  iconKey: HomePlusIconName;
  tone: FinanceCategoryTone;
};

const DEFAULT_CATEGORY_PRESENTATION: FinanceCategoryPresentation = {
  iconKey: 'pricetag-outline',
  tone: 'neutral',
};

const NATIVE_CATEGORY_PRESENTATION: Record<string, FinanceCategoryPresentation> = {
  food: { iconKey: 'restaurant-outline', tone: 'terracotta' },
  housing: { iconKey: 'home-outline', tone: 'sand' },
  utilities: { iconKey: 'receipt-outline', tone: 'info' },
  transport: { iconKey: 'car-outline', tone: 'info' },
  health: { iconKey: 'medkit-outline', tone: 'sage' },
  education: { iconKey: 'school-outline', tone: 'sand' },
  shopping: { iconKey: 'bag-outline', tone: 'terracotta' },
  leisure: { iconKey: 'ticket-outline', tone: 'terracotta' },
  subscriptions: { iconKey: 'repeat-outline', tone: 'info' },
  pets: { iconKey: 'paw-outline', tone: 'sand' },
  taxes: { iconKey: 'document-text-outline', tone: 'sand' },
  financial_costs: { iconKey: 'card-outline', tone: 'info' },
  salary: { iconKey: 'briefcase-outline', tone: 'sage' },
  independent_work: { iconKey: 'hammer-outline', tone: 'sage' },
  sales: { iconKey: 'storefront-outline', tone: 'sage' },
  returns: { iconKey: 'trending-up-outline', tone: 'sage' },
};

const LABEL_CATEGORY_PRESENTATION: Record<string, FinanceCategoryPresentation> = {
  alimentacion: NATIVE_CATEGORY_PRESENTATION.food,
  vivienda: NATIVE_CATEGORY_PRESENTATION.housing,
  servicios_y_facturas: NATIVE_CATEGORY_PRESENTATION.utilities,
  transporte: NATIVE_CATEGORY_PRESENTATION.transport,
  salud: NATIVE_CATEGORY_PRESENTATION.health,
  educacion: NATIVE_CATEGORY_PRESENTATION.education,
  compras: NATIVE_CATEGORY_PRESENTATION.shopping,
  ocio: NATIVE_CATEGORY_PRESENTATION.leisure,
  suscripciones: NATIVE_CATEGORY_PRESENTATION.subscriptions,
  mascotas: NATIVE_CATEGORY_PRESENTATION.pets,
  impuestos_y_tasas: NATIVE_CATEGORY_PRESENTATION.taxes,
  comisiones_e_intereses: NATIVE_CATEGORY_PRESENTATION.financial_costs,
  sueldo: NATIVE_CATEGORY_PRESENTATION.salary,
  trabajo_independiente: NATIVE_CATEGORY_PRESENTATION.independent_work,
  ventas: NATIVE_CATEGORY_PRESENTATION.sales,
  rendimientos: NATIVE_CATEGORY_PRESENTATION.returns,
};

const QUICK_EXPENSE_NATIVE_PRIORITY = [
  'food',
  'transport',
  'housing',
  'utilities',
  'health',
  'shopping',
  'financial_costs',
  'education',
];

function slugifyCategoryLabel(label: string | null | undefined): string {
  return (label ?? '')
    .trim()
    .toLocaleLowerCase('es-AR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getFinanceCategoryPresentation(
  category: Pick<FinanceCategoryDto, 'kind' | 'nativeKey' | 'label'> | null | undefined,
): FinanceCategoryPresentation {
  if (!category) return DEFAULT_CATEGORY_PRESENTATION;
  if (category.nativeKey && NATIVE_CATEGORY_PRESENTATION[category.nativeKey]) {
    return NATIVE_CATEGORY_PRESENTATION[category.nativeKey];
  }
  if (category.kind === 'native') {
    return LABEL_CATEGORY_PRESENTATION[slugifyCategoryLabel(category.label)] ?? DEFAULT_CATEGORY_PRESENTATION;
  }
  return DEFAULT_CATEGORY_PRESENTATION;
}

export function getFinanceCategoryPresentationByLabel(label: string | null | undefined): FinanceCategoryPresentation {
  return LABEL_CATEGORY_PRESENTATION[slugifyCategoryLabel(label)] ?? DEFAULT_CATEGORY_PRESENTATION;
}

export function getQuickFinanceCategories(categories: FinanceCategoryDto[], maxItems = 8): FinanceCategoryDto[] {
  const selectable = categories.filter((category) => category.selectable);
  const byNativeKey = new Map(selectable.map((category) => [category.nativeKey, category]));
  const prioritized = QUICK_EXPENSE_NATIVE_PRIORITY
    .map((nativeKey) => byNativeKey.get(nativeKey) ?? null)
    .filter((category): category is FinanceCategoryDto => category !== null);
  const seen = new Set(prioritized.map((category) => category.id));
  const remaining = selectable.filter((category) => !seen.has(category.id));
  return [...prioritized, ...remaining].slice(0, maxItems);
}
