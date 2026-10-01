import type { PlannerCalendarProjection } from './plannerCalendarProjection';
import type { PlannerEntityDetailParams, PlannerRouteName } from '../../navigation/plannerNavigationContract';
import type { PlannerMutationIdentity } from './plannerTransportContracts';

export type PlannerRootScreenAdapter = {
  readonly key: 'tasks' | 'events' | 'plans';
  readonly developmentState: 'available' | 'integration_pending';
};

export type PlannerDetailRouteComponentContract = {
  readonly routeName: PlannerRouteName;
  readonly parseParams: (input: unknown) => PlannerEntityDetailParams;
};

export type PlannerFormAdapterContract<TPayload = unknown> = {
  readonly mode: 'create' | 'edit';
  readonly createIdentity: () => PlannerMutationIdentity;
  readonly validate: (payload: TPayload) => readonly string[];
};

export type PlannerMutationReducerContract<TState = unknown, TResult = unknown> = {
  readonly applyOptimistic: (state: TState) => TState;
  readonly reconcile: (state: TState, result: TResult) => TState;
  readonly rollback: (state: TState) => TState;
};

export type PlannerLinkedEntityNavigationIntent = {
  readonly entityType: 'task' | 'event';
  readonly externalEntityId: string;
  readonly route: PlannerRouteName;
  readonly params: PlannerEntityDetailParams;
  readonly availability: 'available' | 'missing' | 'trashed' | 'forbidden' | 'stale';
  readonly message: string | null;
};

export type TasksLaneContract = {
  readonly root: PlannerRootScreenAdapter;
  readonly taskProjection: unknown;
  readonly calendarProjection: (task: unknown) => PlannerCalendarProjection | null;
  readonly detailRoute: PlannerDetailRouteComponentContract;
  readonly formAdapter: PlannerFormAdapterContract;
  readonly mutationReducers: PlannerMutationReducerContract;
  readonly availableActionsMapping: Readonly<Record<string, string>>;
};

export type EventsLaneContract = {
  readonly root: PlannerRootScreenAdapter;
  readonly agendaAdapter: unknown;
  readonly eventProjection: unknown;
  readonly calendarProjection: (event: unknown) => PlannerCalendarProjection | null;
  readonly detailRoute: PlannerDetailRouteComponentContract;
  readonly formAdapter: PlannerFormAdapterContract;
  readonly recurrencePresentationAdapter: unknown;
  readonly mutationReducers: PlannerMutationReducerContract;
};

export type PlansLaneContract = {
  readonly root: PlannerRootScreenAdapter;
  readonly planSummaryProjection: unknown;
  readonly detailRoute: PlannerDetailRouteComponentContract;
  readonly createAdapter: PlannerFormAdapterContract;
  readonly structureEditAdapter: PlannerFormAdapterContract;
  readonly lifecycleMutationReducers: PlannerMutationReducerContract;
  readonly linkedEntityNavigationIntents: readonly PlannerLinkedEntityNavigationIntent[];
};

export type PlannerFoundationExports = {
  readonly transport: 'plannerTransportContracts';
  readonly errors: 'plannerErrorAdapter';
  readonly queryKeys: 'plannerKeys';
  readonly mutationState: 'plannerOptimisticState';
  readonly formState: 'plannerFormState';
  readonly primitives: 'plannerVisualStates';
  readonly navigation: 'plannerNavigationContract';
  readonly calendarProjection: 'plannerCalendarProjection';
  readonly shellSlots: readonly ['tasks', 'events', 'plans'];
};
