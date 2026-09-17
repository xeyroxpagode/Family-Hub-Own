import { useRef } from 'react';

import { createIdempotencyKey, generateMutationId, OPERATION_KINDS, requestJson } from '../api';
import type { FinanceContextType } from './financeContext';

export type FinanceTransferCommissionDto = {
  expenseId: string;
  amount: string;
  currency: string;
  categoryId: string;
  categoryLabelSnapshot: string | null;
  accountId: string;
  financialContextType: FinanceContextType;
};

export type FinanceTransferDto = {
  id: string;
  type: 'transfer';
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  sourceAmount: string;
  destinationAmount: string;
  currency: string;
  sourceCurrency: string;
  destinationCurrency: string;
  date: string;
  description: string | null;
  notes: string | null;
  createdAt: string;
};

export type CreateFinanceTransferPayload = {
  sourceAccount: string;
  destinationAccount: string;
  sourceAmount: string;
  destinationAmount: string | null;
  date: string;
  description?: string | null;
  notes?: string | null;
  commissionAmount?: string | null;
  contextType: FinanceContextType;
};

export type CreateFinanceTransferResponse = {
  transfer: FinanceTransferDto & { commission: FinanceTransferCommissionDto | null; sourceTotalDebit: string };
  outcome: 'created' | 'replay';
};

export type TransferMutationIdentity = {
  mutationId: string;
  idempotencyKey: string;
};

/**
 * Stable Transfer mutation identity for one Transfer draft intent.
 *
 * Why this exists: the backend Transfer 3E–3G replay authority protects user
 * retries by keying off `X-Mutation-Id` + `Idempotency-Key` + payload hash. If
 * the frontend generated a fresh identity per `requestJson` call (the default
 * in api.ts), transport retries of the SAME unchanged draft would either
 * produce duplicate Transfers or surface as 412 replay mismatch. So the
 * Transfer form must remember the identity it used for the current draft and
 * reuse it across retries; only when the draft content materially changes must
 * a new identity be created.
 *
 * Boundary (H61–H66):
 *
 *   - Reuses shared `generateMutationId` and `createIdempotencyKey` from
 *     `services/api.ts`. NO Finance-specific Reliability/idempotency store,
 *     NO new mutation ledger, NO new backend endpoint, NO FinanceQuery system.
 *   - Signature is derived from the canonical payload only (source, dest,
 *     native amounts, commission, date). Comments/description are NOT part of
 *     the backend payload hash; they are deliberately excluded here too so
 *     the identity stays aligned with backend replay semantics.
 *   - Identity is regenerated synchronously when the signature changes. There
 *     is no async effect and no shared global state: each Transfer form
 *     instance owns its own identity ref. Confirmed success is reflected by
 *     the form clearing its draft (which produces a new signature next time).
 */
export function buildTransferPayloadSignature(input: {
  sourceAccount: string;
  destinationAccount: string;
  sourceAmount: string;
  destinationAmount: string | null;
  commissionAmount: string | null;
  date: string;
}): string {
  return [
    input.sourceAccount ?? '',
    input.destinationAccount ?? '',
    input.sourceAmount ?? '',
    input.destinationAmount ?? '',
    input.commissionAmount ?? '',
    input.date ?? '',
  ].join('|');
}

export function useStableTransferMutationIdentity(signature: string): TransferMutationIdentity {
  const ref = useRef<TransferMutationIdentity & { signature: string }>({
    signature,
    mutationId: generateMutationId(),
    idempotencyKey: createIdempotencyKey('finance.transfer.create'),
  });

  if (ref.current.signature !== signature) {
    ref.current = {
      signature,
      mutationId: generateMutationId(),
      idempotencyKey: createIdempotencyKey('finance.transfer.create'),
    };
  }

  return {
    mutationId: ref.current.mutationId,
    idempotencyKey: ref.current.idempotencyKey,
  };
}

export const createFinanceTransfer = (
  accessToken: string,
  payload: CreateFinanceTransferPayload,
  identity: TransferMutationIdentity,
) =>
  requestJson<CreateFinanceTransferResponse>('/api/finance/transfers', {
    method: 'POST',
    accessToken,
    body: payload,
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    mutationId: identity.mutationId,
    idempotencyKey: identity.idempotencyKey,
  });
