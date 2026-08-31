'use strict';

const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');

const PAYMENT_ATTENTION_REASONS = Object.freeze({
  OVERDUE: 'payment_overdue',
  DUE_TODAY: 'payment_due_today',
  DUE_SOON: 'payment_due_soon',
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function isDateOnly(value) {
  return typeof value === 'string' && DATE_ONLY_RE.test(value);
}

function dateOnlyToUtcMs(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function addCalendarDays(dateOnly, days) {
  const date = new Date(dateOnlyToUtcMs(dateOnly));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function diffCalendarDays(fromDateOnly, toDateOnly) {
  return Math.round((dateOnlyToUtcMs(toDateOnly) - dateOnlyToUtcMs(fromDateOnly)) / MS_PER_DAY);
}

function currentBackendDateOnly(context, options = {}) {
  if (isDateOnly(options.todayDate)) return options.todayDate;
  const timeZone = context?.household?.timezone || process.env.TZ || 'UTC';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function formatDecimalText(value) {
  const [rawInteger = '0', rawFraction = ''] = String(value ?? '').split('.');
  const integer = (rawInteger.replace(/\D/g, '') || '0').replace(/^0+(?=\d)/, '');
  const fraction = rawFraction.replace(/\D/g, '').replace(/0+$/, '');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction ? `${grouped},${fraction}` : grouped;
}

function formatPaymentAmount(row) {
  if (row.expected_amount_known !== true) return 'A confirmar';
  const amount = formatDecimalText(row.expected_amount);
  const currency = String(row.currency ?? '').trim().toUpperCase();
  if (currency === 'ARS') return `$${amount}`;
  return `${amount} ${currency}`.trim();
}

function dueSummary(diffDays) {
  if (diffDays < 0) {
    if (diffDays === -1) return 'Venció ayer';
    return `Venció hace ${Math.abs(diffDays)} días`;
  }
  if (diffDays === 0) return 'Vence hoy';
  if (diffDays === 1) return 'Vence mañana';
  return `Vence en ${diffDays} días`;
}

function reasonForDiff(diffDays) {
  if (diffDays < 0) return PAYMENT_ATTENTION_REASONS.OVERDUE;
  if (diffDays === 0) return PAYMENT_ATTENTION_REASONS.DUE_TODAY;
  return PAYMENT_ATTENTION_REASONS.DUE_SOON;
}

function severityForReason(reason) {
  if (reason === PAYMENT_ATTENTION_REASONS.OVERDUE) return 'critical';
  if (reason === PAYMENT_ATTENTION_REASONS.DUE_TODAY) return 'high';
  return 'medium';
}

function titleOf(row) {
  const title = typeof row?.title === 'string' ? row.title.trim() : '';
  return title || 'Pago sin titulo';
}

async function queryPendingDues(request) {
  const { data, error } = await request;
  if (error || !data || data.length === 0) return [];
  return data;
}

async function loadPaymentAttention(context, options = {}) {
  const today = currentBackendDateOnly(context, options);
  const windowEnd = addCalendarDays(today, 3);
  const selects = 'id,title,currency,expected_amount_known,expected_amount,due_date,status,payment_series_id,financial_context_type,owner_person_id,household_id,created_at,updated_at';

  let personalRequest = context.client
    .from('finance_payment_dues')
    .select(selects)
    .eq('status', 'PENDING')
    .eq('financial_context_type', FINANCE_CONTEXT_TYPES.PERSONAL)
    .eq('owner_person_id', context.personId)
    .is('household_id', null)
    .lte('due_date', windowEnd)
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(options.limit || 100);

  const requests = [queryPendingDues(personalRequest)];

  if (context.householdId) {
    const householdRequest = context.client
      .from('finance_payment_dues')
      .select(selects)
      .eq('status', 'PENDING')
      .eq('financial_context_type', FINANCE_CONTEXT_TYPES.HOUSEHOLD)
      .eq('household_id', context.householdId)
      .is('owner_person_id', null)
      .lte('due_date', windowEnd)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(options.limit || 100);
    requests.push(queryPendingDues(householdRequest));
  }

  const rows = (await Promise.all(requests)).flat();

  return rows
    .filter((row) => row.status === 'PENDING' && isDateOnly(row.due_date))
    .map((row) => {
      const diffDays = diffCalendarDays(today, row.due_date);
      return { row, diffDays };
    })
    .filter(({ diffDays }) => diffDays <= 3)
    .map(({ row, diffDays }) => {
      const reason = reasonForDiff(diffDays);
      const financialContextType = row.financial_context_type === FINANCE_CONTEXT_TYPES.HOUSEHOLD
        ? FINANCE_CONTEXT_TYPES.HOUSEHOLD
        : FINANCE_CONTEXT_TYPES.PERSONAL;

      return {
        reason,
        entityType: 'payment',
        entityId: row.id,
        title: titleOf(row),
        summary: `${dueSummary(diffDays)}\n${formatPaymentAmount(row)}`,
        severity: severityForReason(reason),
        createdAt: row.due_date,
        updatedAt: row.updated_at || row.created_at,
        personRecipientId: context.personId,
        primaryAction: { label: 'Ver pago', capability: 'payment.view' },
        dedupeKey: `payment:${row.id}:${context.personId}`,
        attentionId: `attn:payment:${row.id}:${context.personId}`,
        destination: {
          entityType: 'payment',
          entityId: row.id,
          surfaceOrigin: 'attention',
          contextType: financialContextType,
          initialTab: 'pagos',
          paymentDueId: row.id,
        },
      };
    });
}

module.exports = {
  PAYMENT_ATTENTION_REASONS,
  addCalendarDays,
  diffCalendarDays,
  formatPaymentAmount,
  loadPaymentAttention,
};
