export type AuthStackParamList = {
  P00Splash: undefined;
  Login: undefined;
  P01Registro: undefined;
  ForgotPassword: undefined;
  UpdatePassword: undefined;
};

export type PrivateStackParamList = {
  P02CrearGrupo: undefined;
  P03InvitarPersonas: { householdId: string };
  HomeTabs: undefined;
  JoinHousehold: { token: string };
  PendingApprovalFallback: undefined;
  HouseholdSelectionFallback: undefined;
  AccessSuspendedFallback: undefined;
  ProfileScreen: undefined;
  Inventory: undefined;
  FeedFamiliar: undefined;
};

export type HomeTabParamList = {
  HomeTab: undefined;
  PeopleTab: undefined;
  AddTab: undefined;
  PlannerTab: undefined;
  MoreTab: undefined;
};

// Re-export the canonical Planner V1 navigation authority (M1).
// `PlannerTabKey` is the single tab authority; legacy consumers reading
// `initialTab` from `PlannerStackParamList['PlannerHome']` keep working
// because the canonical union is the same `'tasks' | 'calendar' | 'goals'`.
export type {
  PlannerTabKey,
  PlannerNavigationSource,
  PlannerReturnTarget,
  PlannerRootParams,
  PlannerEntityDetailParams,
  PlannerSearchParams,
  PlannerRouteName,
  PlannerEntityKind,
} from './plannerNavigationContract';
export {
  ROUTE_NAMES,
  LEGACY_ROUTE_NAMES,
  PLANNER_TAB_KEYS,
  ENTITY_DETAIL_ROUTES,
  isPlannerTabKey,
  isPlannerNavigationSource,
  isPlannerReturnTarget,
  isValidPlannerEntityId,
  normalizePlannerNavigationSource,
  normalizePlannerReturnTarget,
  resolveDetailRouteName,
  buildPlannerRootParams,
  buildPlannerEntityDetailParams,
  buildPlannerSearchParams,
  parsePlannerRootParams,
  parsePlannerEntityDetailParams,
  parsePlannerSearchParams,
  stripEphemeralParams,
} from './plannerNavigationContract';

export type PlannerStackParamList = {
  PlannerHome: {
    refreshKey?: number;
    initialTab?: 'tasks' | 'calendar' | 'goals';
    initialSheet?: 'task' | 'event';
    sheetKey?: number;
    source?: 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown';
  } | undefined;
  CreateTask: {
    taskId?: string;
    goalId?: string;
    goalTitle?: string;
    fromGoal?: boolean;
    returnToGoalId?: string;
    returnTo?: 'PlannerHome';
  } | undefined;
  EditTask: { taskId: string };
  CreateEvent: undefined;
  EditEvent: { eventId: string };
  CreateGoal: undefined;
  EditGoal: { goalId: string };
  GoalDetail: { goalId: string; source?: 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown'; } | import('./plannerNavigationContract').PlannerEntityDetailParams;
  PlannerTrash: undefined;
  // New canonical V1 detail routes. Their params are the canonical typed
  // contract from `plannerNavigationContract.ts`. Visual surfaces land in
  // M10 (TaskDetail/EventDetail) and M7 (PlannerSearch); M1 only defines the
  // contract.
  TaskDetail: import('./plannerNavigationContract').PlannerEntityDetailParams;
  EventDetail: import('./plannerNavigationContract').PlannerEntityDetailParams;
  PlannerSearch: import('./plannerNavigationContract').PlannerSearchParams;
};

export type RootStackParamList = AuthStackParamList & PrivateStackParamList;
