import { ROUTE_NAMES } from '../../../navigation/plannerNavigationContract';
import type {
  PlannerReliabilityConflictContent,
  PlannerReliabilityFrontendDomain,
  PlannerReliabilityIntegrationIntent,
} from './frontendExperience';
import { createPlannerReliabilityConflictContent } from './frontendExperience';
import type { PlannerOperationRecord } from './types';

export type PlannerReliabilityConflictReviewRoute = {
  readonly routeName: typeof ROUTE_NAMES.ConflictReview;
  readonly params: {
    readonly localOperationId: string;
    readonly domain: PlannerReliabilityFrontendDomain;
  };
};

export function buildPlannerReliabilityConflictReviewRoute(
  intent: PlannerReliabilityIntegrationIntent,
): PlannerReliabilityConflictReviewRoute | null {
  if (intent.type !== 'request_conflict_route' && intent.type !== 'review_operation') return null;
  return {
    routeName: ROUTE_NAMES.ConflictReview,
    params: {
      localOperationId: intent.localOperationId,
      domain: intent.domain,
    },
  };
}

export function createPlannerReliabilityConflictReviewContent(input: {
  readonly operation: PlannerOperationRecord;
  readonly domain: PlannerReliabilityFrontendDomain;
  readonly entityLabel: string;
  readonly retryAuthorized?: boolean;
  readonly discardLocalAuthorized?: boolean;
  readonly refetchPending?: boolean;
}): PlannerReliabilityConflictContent {
  return createPlannerReliabilityConflictContent({
    operation: input.operation,
    domain: input.domain,
    entityLabel: input.entityLabel,
    conflict: input.operation.conflict,
    retryAuthorized: input.retryAuthorized,
    discardLocalAuthorized: input.discardLocalAuthorized,
    refetchPending: input.refetchPending,
  });
}
