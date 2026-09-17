/**
 * Planner V1 - 11A.2C Global Attention client contract.
 */

import type { FinanceContextType, FinanceTabKey } from '../finance/financeContext';

export type AttentionEntityType = 'task' | 'event' | 'plan' | 'payment';

export type AttentionDestination = {
  readonly entityType: AttentionEntityType;
  readonly entityId: string;
  readonly surfaceOrigin: 'attention';
  readonly contextType?: FinanceContextType;
  readonly initialTab?: FinanceTabKey;
  readonly paymentDueId?: string;
};

export type AttentionPrimaryAction = {
  readonly label: string;
  readonly capability: string;
};

export type AttentionItem = {
  readonly attentionId: string;
  readonly dedupeKey: string;
  readonly entityType: AttentionEntityType;
  readonly entityId: string;
  readonly title: string;
  readonly summary: string;
  readonly reason: string;
  readonly severity: string;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly personRecipientId: string;
  readonly unresolved: boolean;
  readonly priorityScore: number;
  readonly primaryAction: AttentionPrimaryAction | null;
  readonly destination: AttentionDestination;
  readonly sourceVersion: string;
};

export type AttentionResponse = {
  readonly projectionVersion: string;
  readonly context: string;
  readonly generatedAt: string;
  readonly limit: number;
  readonly total: number;
  readonly items: readonly AttentionItem[];
};

export type AttentionStatus =
  | { readonly kind: 'initial' }
  | { readonly kind: 'loading'; readonly stale: boolean }
  | { readonly kind: 'results'; readonly response: AttentionResponse; readonly stale: boolean }
  | { readonly kind: 'empty' }
  | { readonly kind: 'offline'; readonly staleResponse: AttentionResponse | null }
  | { readonly kind: 'error'; readonly message: string; readonly code: string | null }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'session_invalid'; readonly message: string };
