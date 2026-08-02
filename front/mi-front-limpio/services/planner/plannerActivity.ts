/**
 * Planner V1 - 11A.2C Global Activity client contract.
 *
 * Pure types for the global Activity timeline projection.
 */

export type ActivityEntityType = 'task' | 'event' | 'plan' | 'goal' | 'milestone';

export type ActivityDestination = {
  readonly entityType: ActivityEntityType;
  readonly entityId: string;
  readonly surfaceOrigin: 'activity';
};

export type ActivityItem = {
  readonly activityId: string;
  readonly entityType: ActivityEntityType;
  readonly entityId: string;
  readonly actorPersonId: string | null;
  readonly timestamp: string;
  readonly eventType: string;
  readonly summary: string;
  readonly sourceModule: string;
  readonly householdId: string;
  readonly destination: ActivityDestination;
  readonly resultStatus: string | null;
  readonly correlationKey: string | null;
  readonly grouping: {
    readonly entityKey: string;
    readonly processKey: string | null;
  };
};

export type ActivityDayGroup = {
  readonly dateKey: string;
  readonly label: string;
  readonly items: readonly ActivityItem[];
};

export type ActivityResponse = {
  readonly projectionVersion: string;
  readonly generatedAt: string;
  readonly limit: number;
  readonly groups: readonly ActivityDayGroup[];
};

export type ActivityStatus =
  | { readonly kind: 'initial' }
  | { readonly kind: 'loading'; readonly stale: boolean }
  | { readonly kind: 'results'; readonly response: ActivityResponse; readonly stale: boolean }
  | { readonly kind: 'empty' }
  | { readonly kind: 'offline'; readonly staleResponse: ActivityResponse | null }
  | { readonly kind: 'error'; readonly message: string; readonly code: string | null }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'session_invalid'; readonly message: string };
