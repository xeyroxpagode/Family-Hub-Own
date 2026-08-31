import { OPERATION_KINDS, createIdempotencyKey, generateMutationId, requestJson } from '../api';
import { formatFinanceAmount } from './financeDisplay';
import { hashIdempotencyRequestV2 } from './idempotency';
import type { FinanceContextType } from './financeContext';
import type { FinanceCategoryDto } from './financeMovements';
import type { FinanceAccountDto } from './financeAccounts';

export const PAYMENT_KINDS = {
  NORMAL: 'NORMAL',
  CREDIT_CARD: 'CREDIT_CARD',
} as const;
export type PaymentKind = typeof PAYMENT_KINDS[keyof typeof PAYMENT_KINDS];

export const PAYMENT_DUE_STATUSES = {
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  PAID: 'PAID',
} as const;
export type PaymentDueStatus = typeof PAYMENT_DUE_STATUSES[keyof typeof PAYMENT_DUE_STATUSES];

export const PAYMENT_SERIES_STATUSES = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentSeriesStatus = typeof PAYMENT_SERIES_STATUSES[keyof typeof PAYMENT_SERIES_STATUSES];

export const RECURRENCE_UNITS = {
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  YEAR: 'YEAR',
} as const;
export type RecurrenceUnit = typeof RECURRENCE_UNITS[keyof typeof RECURRENCE_UNITS];

export type PaymentDueDto = {
  id: string;
  title: string;
  kind: PaymentKind;
  currency: string;
  expectedAmountKnown: boolean;
  expectedAmount: string | null;
  dueDate: string;
  categoryId: string | null;
  targetCreditCardAccountId: string | null;
  status: PaymentDueStatus;
  overdue: boolean;
  paymentSeriesId: string | null;
  financialContextType: FinanceContextType;
  createdAt: string;
  updatedAt: string;
  createdByPersonId: string;
  category?: {
    id: string;
    label: string;
    type: string;
  } | null;
  paymentSeries?: PaymentSeriesDto | null;
  targetCreditCard?: {
    id: string;
    name: string;
    currency: string;
    accountType: string;
  } | null;
  actualAmount?: string | null;
  actualDate?: string | null;
  paidAt?: string | null;
  actualCategoryId?: string | null;
  actualAccountId?: string | null;
  actualCategory?: {
    id: string;
    label: string;
  } | null;
  actualAccount?: {
    id: string;
    name: string;
    currency: string;
    accountType: string;
  } | null;
  expenseRootTransactionId?: string | null;
  transferId?: string | null;
  consequenceType?: 'EXPENSE' | 'TRANSFER';
};

export type PaymentSeriesDto = {
  id: string;
  title: string;
  kind: PaymentKind;
  currency: string;
  defaultExpectedAmountKnown: boolean;
  defaultExpectedAmount: string | null;
  defaultCategoryId: string | null;
  targetCreditCardAccountId: string | null;
  recurrenceIntervalUnit: RecurrenceUnit;
  recurrenceIntervalCount: number;
  recurrenceAnchorDate: string;
  status: PaymentSeriesStatus;
  financialContextType: FinanceContextType;
  createdAt: string;
  updatedAt: string;
  createdByPersonId: string;
  defaultCategory?: {
    id: string;
    label: string;
    type: string;
  } | null;
  targetCreditCard?: {
    id: string;
    name: string;
    currency: string;
    accountType: string;
  } | null;
  currentDue?: PaymentDueDto | null;
};

export type ListPaymentDuesResponse = {
  paymentDues: PaymentDueDto[];
};

export type ListPaymentSeriesResponse = {
  paymentSeries: PaymentSeriesDto[];
};

export type GetPaymentDueDetailResponse = {
  paymentDue: PaymentDueDto;
};

export type GetPaymentSeriesDetailResponse = {
  paymentSeries: PaymentSeriesDto;
};

export type CreateOneOffPaymentDuePayload = {
  kind: PaymentKind;
  title: string;
  currency: string;
  expectedAmountKnown: boolean;
  expectedAmount: string | null;
  dueDate: string;
  categoryId?: string | null;
  targetCreditCardAccountId?: string | null;
};

export type CreateOneOffPaymentDueResponse = {
  paymentDue: PaymentDueDto;
};

export type CreatePaymentSeriesPayload = {
  kind: PaymentKind;
  title: string;
  currency: string;
  defaultExpectedAmountKnown: boolean;
  defaultExpectedAmount: string | null;
  defaultCategoryId?: string | null;
  targetCreditCardAccountId?: string | null;
  recurrenceIntervalUnit: RecurrenceUnit;
  recurrenceIntervalCount: number;
  recurrenceAnchorDate: string;
};

export type CreatePaymentSeriesResponse = {
  paymentSeries: PaymentSeriesDto;
  firstDue: PaymentDueDto;
};

export type CancelPaymentDueResponse = {
  paymentDue: PaymentDueDto;
};

export type CancelPaymentSeriesResponse = {
  paymentSeries: PaymentSeriesDto;
};

export type EditPaymentDuePayload = {
  title?: string;
  expectedAmountKnown?: boolean;
  expectedAmount?: string | null;
  dueDate?: string;
  categoryId?: string | null;
  clearCategory?: boolean;
};

export type EditPaymentDueResponse = {
  paymentDue: PaymentDueDto;
};

export type EditPaymentSeriesPayload = {
  title?: string;
  defaultExpectedAmountKnown?: boolean;
  defaultExpectedAmount?: string | null;
  defaultCategoryId?: string | null;
  clearDefaultCategory?: boolean;
  recurrenceIntervalUnit?: RecurrenceUnit;
  recurrenceIntervalCount?: number;
  recurrenceAnchorDate?: string;
  targetCreditCardAccountId?: string | null;
  clearTargetCreditCardAccount?: boolean;
};

export type EditPaymentSeriesResponse = {
  paymentSeries: PaymentSeriesDto;
  currentDue: PaymentDueDto | null;
};

export type RegisterNormalPaymentPayload = {
  actualAmount: string;
  actualDate: string;
  actualCategoryId?: string | null;
  actualAccountId?: string | null;
};

export type RegisterCreditCardPaymentPayload = {
  actualAmount: string;
  actualDate: string;
  sourceAccountId: string;
  destinationAmount?: string | null;
};

export type RegisterPaymentResponse = {
  paymentDue: PaymentDueDto;
};

const encodeQuery = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  }
  return search.toString();
};

type PaymentReadOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const listPaymentDues = ({
  accessToken,
  contextType,
  signal,
  contextScope,
  status,
  kind,
  paymentSeriesId,
  dueDateFrom,
  dueDateTo,
}: PaymentReadOptions & {
  status?: PaymentDueStatus;
  kind?: PaymentKind;
  paymentSeriesId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}) =>
  requestJson<ListPaymentDuesResponse>(
    `/api/finance/payments/dues?${encodeQuery({ contextType, status, kind, payment_series_id: paymentSeriesId, due_date_from: dueDateFrom, due_date_to: dueDateTo })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const getPaymentDueDetail = ({
  accessToken,
  contextType,
  dueId,
  signal,
  contextScope,
}: PaymentReadOptions & { dueId: string }) =>
  requestJson<GetPaymentDueDetailResponse>(
    `/api/finance/payments/dues/${dueId}?${encodeQuery({ contextType })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const listPaymentSeries = ({
  accessToken,
  contextType,
  signal,
  contextScope,
  status,
  kind,
}: PaymentReadOptions & { status?: PaymentSeriesStatus; kind?: PaymentKind }) =>
  requestJson<ListPaymentSeriesResponse>(
    `/api/finance/payments/series?${encodeQuery({ contextType, status, kind })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const getPaymentSeriesDetail = ({
  accessToken,
  contextType,
  seriesId,
  signal,
  contextScope,
}: PaymentReadOptions & { seriesId: string }) =>
  requestJson<GetPaymentSeriesDetailResponse>(
    `/api/finance/payments/series/${seriesId}?${encodeQuery({ contextType })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

type PaymentMutationOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

async function buildIdempotencyPayload(
  operation: string,
  scopeType: string,
  scopeId: string | null,
  targetId: string | null,
  payload: unknown,
  mutationId: string,
): Promise<{ idempotencyKey: string; payloadHash: string }> {
  const idempotencyKey = createIdempotencyKey(`finance.payment.${operation}`);
  const payloadHash = await hashIdempotencyRequestV2({
    operation: `finance.payment.${operation}`,
    scopeType,
    scopeId,
    targetId,
    payload,
    expectedVersion: null,
    mutationId,
  });
  return { idempotencyKey, payloadHash };
}

export const createOneOffPaymentDue = async (
  accessToken: string,
  contextType: FinanceContextType,
  payload: CreateOneOffPaymentDuePayload,
): Promise<CreateOneOffPaymentDueResponse> => {
  const mutationId = generateMutationId();
  const scopeId = contextType === 'personal' ? 'personal' : 'household';
  const { idempotencyKey, payloadHash } = await buildIdempotencyPayload(
    'create_oneoff',
    scopeId,
    scopeId,
    null,
    payload,
    mutationId,
  );

  return requestJson<CreateOneOffPaymentDueResponse>('/api/finance/payments/dues', {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      ...payload,
      contextType,
      mutationId,
      idempotencyKey,
      payloadHash,
    },
    contextScope: `finance:payment-create-oneoff:${contextType}:${mutationId}`,
  });
};

export const createPaymentSeries = async (
  accessToken: string,
  contextType: FinanceContextType,
  payload: CreatePaymentSeriesPayload,
): Promise<CreatePaymentSeriesResponse> => {
  const mutationId = generateMutationId();
  const scopeId = contextType === 'personal' ? 'personal' : 'household';
  const { idempotencyKey, payloadHash } = await buildIdempotencyPayload(
    'create_series',
    scopeId,
    scopeId,
    null,
    payload,
    mutationId,
  );

  return requestJson<CreatePaymentSeriesResponse>('/api/finance/payments/series', {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      ...payload,
      contextType,
      mutationId,
      idempotencyKey,
      payloadHash,
    },
    contextScope: `finance:payment-create-series:${contextType}:${mutationId}`,
  });
};

export const cancelPaymentDue = async (
  accessToken: string,
  contextType: FinanceContextType,
  dueId: string,
): Promise<CancelPaymentDueResponse> => {
  const mutationId = generateMutationId();
  const scopeId = contextType === 'personal' ? 'personal' : 'household';
  const payload = { dueId };
  const { idempotencyKey, payloadHash } = await buildIdempotencyPayload(
    'cancel_due',
    scopeId,
    scopeId,
    dueId,
    payload,
    mutationId,
  );

  return requestJson<CancelPaymentDueResponse>(`/api/finance/payments/dues/${dueId}/cancel`, {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      contextType,
      mutationId,
      idempotencyKey,
      payloadHash,
    },
    contextScope: `finance:payment-cancel-due:${contextType}:${dueId}:${mutationId}`,
  });
};

export const cancelPaymentSeries = async (
  accessToken: string,
  contextType: FinanceContextType,
  seriesId: string,
): Promise<CancelPaymentSeriesResponse> => {
  const mutationId = generateMutationId();
  const scopeId = contextType === 'personal' ? 'personal' : 'household';
  const payload = { seriesId };
  const { idempotencyKey, payloadHash } = await buildIdempotencyPayload(
    'cancel_series',
    scopeId,
    scopeId,
    seriesId,
    payload,
    mutationId,
  );

  return requestJson<CancelPaymentSeriesResponse>(`/api/finance/payments/series/${seriesId}/cancel`, {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      contextType,
      mutationId,
      idempotencyKey,
      payloadHash,
    },
    contextScope: `finance:payment-cancel-series:${contextType}:${seriesId}:${mutationId}`,
  });
};

export const editPaymentDue = async (
  accessToken: string,
  contextType: FinanceContextType,
  dueId: string,
  payload: EditPaymentDuePayload,
): Promise<EditPaymentDueResponse> => {
  const mutationId = generateMutationId();
  const scopeId = contextType === 'personal' ? 'personal' : 'household';
  const { idempotencyKey, payloadHash } = await buildIdempotencyPayload(
    'edit_due',
    scopeId,
    scopeId,
    dueId,
    payload,
    mutationId,
  );

  return requestJson<EditPaymentDueResponse>(`/api/finance/payments/dues/${dueId}`, {
    method: 'PATCH',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      ...payload,
      contextType,
      mutationId,
      idempotencyKey,
      payloadHash,
    },
    contextScope: `finance:payment-edit-due:${contextType}:${dueId}:${mutationId}`,
  });
};

export const editPaymentSeries = async (
  accessToken: string,
  contextType: FinanceContextType,
  seriesId: string,
  payload: EditPaymentSeriesPayload,
): Promise<EditPaymentSeriesResponse> => {
  const mutationId = generateMutationId();
  const scopeId = contextType === 'personal' ? 'personal' : 'household';
  const { idempotencyKey, payloadHash } = await buildIdempotencyPayload(
    'edit_series',
    scopeId,
    scopeId,
    seriesId,
    payload,
    mutationId,
  );

  return requestJson<EditPaymentSeriesResponse>(`/api/finance/payments/series/${seriesId}`, {
    method: 'PATCH',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      ...payload,
      contextType,
      mutationId,
      idempotencyKey,
      payloadHash,
    },
    contextScope: `finance:payment-edit-series:${contextType}:${seriesId}:${mutationId}`,
  });
};

export const registerNormalPayment = async (
  accessToken: string,
  contextType: FinanceContextType,
  dueId: string,
  payload: RegisterNormalPaymentPayload,
): Promise<RegisterPaymentResponse> => {
  const mutationId = generateMutationId();
  const scopeId = contextType === 'personal' ? 'personal' : 'household';
  const { idempotencyKey, payloadHash } = await buildIdempotencyPayload(
    'register_normal',
    scopeId,
    scopeId,
    dueId,
    payload,
    mutationId,
  );

  return requestJson<RegisterPaymentResponse>(`/api/finance/payments/dues/${dueId}/register`, {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      ...payload,
      contextType,
      mutationId,
      idempotencyKey,
      payloadHash,
    },
    contextScope: `finance:payment-register-normal:${contextType}:${dueId}:${mutationId}`,
  });
};

export const registerCreditCardPayment = async (
  accessToken: string,
  contextType: FinanceContextType,
  dueId: string,
  payload: RegisterCreditCardPaymentPayload,
): Promise<RegisterPaymentResponse> => {
  const mutationId = generateMutationId();
  const scopeId = contextType === 'personal' ? 'personal' : 'household';
  const { idempotencyKey, payloadHash } = await buildIdempotencyPayload(
    'register_credit_card',
    scopeId,
    scopeId,
    dueId,
    payload,
    mutationId,
  );

  return requestJson<RegisterPaymentResponse>(`/api/finance/payments/dues/${dueId}/register`, {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      ...payload,
      contextType,
      mutationId,
      idempotencyKey,
      payloadHash,
    },
    contextScope: `finance:payment-register-cc:${contextType}:${dueId}:${mutationId}`,
  });
};

export const registerPayment = async (
  accessToken: string,
  contextType: FinanceContextType,
  dueId: string,
  kind: PaymentKind,
  payload: RegisterNormalPaymentPayload | RegisterCreditCardPaymentPayload,
): Promise<RegisterPaymentResponse> => {
  if (kind === PAYMENT_KINDS.NORMAL) {
    return registerNormalPayment(accessToken, contextType, dueId, payload as RegisterNormalPaymentPayload);
  } else {
    return registerCreditCardPayment(accessToken, contextType, dueId, payload as RegisterCreditCardPaymentPayload);
  }
};

export function formatRecurrenceSummary(series: PaymentSeriesDto): string {
  const { recurrenceIntervalUnit, recurrenceIntervalCount } = series;
  const unitLabels: Record<RecurrenceUnit, { singular: string; plural: string }> = {
    DAY: { singular: 'día', plural: 'días' },
    WEEK: { singular: 'semana', plural: 'semanas' },
    MONTH: { singular: 'mes', plural: 'meses' },
    YEAR: { singular: 'año', plural: 'años' },
  };
  const { singular, plural } = unitLabels[recurrenceIntervalUnit];
  if (recurrenceIntervalCount === 1) return `Se repite cada ${singular}`;
  const unitLabel = recurrenceIntervalCount === 1 ? singular : plural;
  return `Se repite cada ${recurrenceIntervalCount} ${unitLabel}`;
}

export function formatDueDateHuman(dueDate: string, overdue: boolean): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = year && month && day ? new Date(year, month - 1, day) : new Date(`${dueDate}T00:00:00.000Z`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (overdue) {
    if (diffDays === -1) return 'Venció ayer';
    return `Venció hace ${-diffDays} días`;
  }

  if (diffDays === 0) return 'Vence hoy';
  if (diffDays === 1) return 'Vence mañana';
  if (diffDays <= 7) return `Vence en ${diffDays} días`;
  return `Vence ${due.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`;
}

export function formatExpectedAmount(known: boolean, amount: string | null, currency?: string | null): string {
  if (!known) return 'A confirmar';
  if (!amount) return 'A confirmar';
  return currency ? formatFinanceAmount(amount, currency, { sign: 'none' }) : amount;
}

export function isPaymentOverdue(due: PaymentDueDto): boolean {
  return due.status === PAYMENT_DUE_STATUSES.PENDING && due.overdue;
}

export function isPaymentPending(due: PaymentDueDto): boolean {
  return due.status === PAYMENT_DUE_STATUSES.PENDING;
}

export function isPaymentPaid(due: PaymentDueDto): boolean {
  return due.status === PAYMENT_DUE_STATUSES.PAID;
}

export function isPaymentCancelled(due: PaymentDueDto): boolean {
  return due.status === PAYMENT_DUE_STATUSES.CANCELLED;
}

export function sortPaymentDuesForDisplay(dues: PaymentDueDto[]): PaymentDueDto[] {
  return [...dues].sort((a, b) => {
    const aOverdue = isPaymentOverdue(a);
    const bOverdue = isPaymentOverdue(b);
    const aPending = isPaymentPending(a);
    const bPending = isPaymentPending(b);
    const aPaid = isPaymentPaid(a);
    const bPaid = isPaymentPaid(b);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    if (aPaid && !bPaid) return 1;
    if (!aPaid && bPaid) return -1;

    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export function groupPaymentDuesByStatus(dues: PaymentDueDto[]): {
  overdue: PaymentDueDto[];
  upcoming: PaymentDueDto[];
  paid: PaymentDueDto[];
} {
  const overdue: PaymentDueDto[] = [];
  const upcoming: PaymentDueDto[] = [];
  const paid: PaymentDueDto[] = [];

  for (const due of dues) {
    if (isPaymentOverdue(due)) {
      overdue.push(due);
    } else if (isPaymentPending(due)) {
      upcoming.push(due);
    } else if (isPaymentPaid(due)) {
      paid.push(due);
    }
  }

  return { overdue, upcoming, paid };
}
