import {
  FINANCE_CONTEXT_TYPES,
  FINANCE_TABS,
  isFinanceContextType,
  type FinanceContextType,
  type FinanceTabKey,
} from '../services/finance/financeContext';

const UUID_PATTERN = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\}?$/;

export type FinanceNavigationSource = 'finance' | 'attention' | 'home' | 'unknown';

export type FinanceEntryParams = {
  readonly initialTab?: FinanceTabKey;
  readonly contextType?: FinanceContextType;
  readonly paymentDueId?: string;
  readonly source?: FinanceNavigationSource;
};

function isFinanceTabKey(value: unknown): value is FinanceTabKey {
  return typeof value === 'string' && (FINANCE_TABS as readonly string[]).includes(value);
}

export function isFinancePaymentDueId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function normalizeFinanceSource(value: unknown): FinanceNavigationSource | undefined {
  if (value === 'finance' || value === 'attention' || value === 'home' || value === 'unknown') return value;
  return undefined;
}

function dropUndefined<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

export function parseFinanceEntryParams(input: unknown): FinanceEntryParams {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) return {};
  const record = input as Record<string, unknown>;
  return dropUndefined({
    initialTab: isFinanceTabKey(record.initialTab) ? record.initialTab : undefined,
    contextType: isFinanceContextType(record.contextType) ? record.contextType : undefined,
    paymentDueId: isFinancePaymentDueId(record.paymentDueId) ? record.paymentDueId : undefined,
    source: normalizeFinanceSource(record.source),
  });
}

export function buildFinanceEntryParams(input: FinanceEntryParams = {}): FinanceEntryParams {
  return dropUndefined({
    initialTab: isFinanceTabKey(input.initialTab) ? input.initialTab : undefined,
    contextType: isFinanceContextType(input.contextType) ? input.contextType : undefined,
    paymentDueId: isFinancePaymentDueId(input.paymentDueId) ? input.paymentDueId : undefined,
    source: normalizeFinanceSource(input.source),
  });
}

export function buildFinancePaymentAttentionParams(input: {
  readonly paymentDueId: string;
  readonly contextType?: FinanceContextType;
}): FinanceEntryParams {
  return buildFinanceEntryParams({
    initialTab: 'pagos',
    contextType: input.contextType ?? FINANCE_CONTEXT_TYPES.PERSONAL,
    paymentDueId: input.paymentDueId,
    source: 'attention',
  });
}

export function openFinancePaymentFromAttention(
  navigation: { navigate: (routeName: string, params?: unknown) => void },
  input: { readonly paymentDueId: string; readonly contextType?: FinanceContextType },
): void {
  navigation.navigate('HomeTabs', {
    screen: 'MoreTab',
    params: {
      screen: 'Finance',
      params: buildFinancePaymentAttentionParams(input),
    },
  });
}
