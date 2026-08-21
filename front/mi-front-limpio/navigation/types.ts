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
  FeedFamiliar: undefined;
};

export type HomeTabParamList = {
  HomeTab: undefined;
  InventoryTab: undefined;
  QuickActionTab: undefined;
  PlannerTab: undefined;
  MoreTab: undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Family: undefined;
  Finance: undefined;
  FinanceAccounts: {
    contextType: import('../services/finance/financeContext').FinanceContextType;
  };
  FinancePapelera: {
    contextType: import('../services/finance/financeContext').FinanceContextType;
  };
  Presence: undefined;
};

// Re-export the canonical Planner V1 navigation authority (M1).
// `PlannerTabKey` is the single tab authority; legacy `calendar`/`goals`
// params are accepted at compatibility boundaries and normalized.
export type {
  PlannerTabKey,
  LegacyPlannerTabKey,
  PlannerTabInputKey,
  PlannerNavigationSource,
  PlannerReturnTarget,
  PlannerRootParams,
  PlannerEntityDetailParams,
  PlannerSearchParams,
  PlannerAttentionActivityParams,
  PlannerRouteName,
  PlannerEntityKind,
  LegacyPlannerEntityKind,
} from './plannerNavigationContract';
export {
  ROUTE_NAMES,
  LEGACY_ROUTE_NAMES,
  PLANNER_TAB_KEYS,
  ENTITY_DETAIL_ROUTES,
  isPlannerTabKey,
  normalizePlannerTabKey,
  isPlannerNavigationSource,
  isPlannerReturnTarget,
  isValidPlannerEntityId,
  normalizePlannerNavigationSource,
  normalizePlannerReturnTarget,
  resolveDetailRouteName,
  buildPlannerRootParams,
  buildPlannerEntityDetailParams,
  buildPlannerSearchParams,
  buildPlannerAttentionActivityParams,
  parsePlannerRootParams,
  parsePlannerEntityDetailParams,
  parsePlannerSearchParams,
  parsePlannerAttentionActivityParams,
  stripEphemeralParams,
  normalizePlannerEntityKind,
} from './plannerNavigationContract';

export type PlannerStackParamList = {
  PlannerHome: {
    refreshKey?: number;
    initialTab?: import('./plannerNavigationContract').PlannerTabInputKey;
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
  EditGoal: { goalId?: string } | import('./plannerNavigationContract').PlannerEntityDetailParams;
  GoalDetail: { goalId: string; source?: 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown'; } | import('./plannerNavigationContract').PlannerEntityDetailParams;
  PlannerTrash: undefined;
  PlannerPresetLibrary: undefined;
  PlannerPresetDetail: { presetId: string };
  PlannerPresetCreate: { duplicateFromPresetId?: string } | undefined;
  PlannerPresetEdit: { presetId: string };
  PlannerDraftRecovery: undefined;
  PlannerDraftResume: { draftId: string };
  PlannerPresetDraftsTrash: undefined;
  // New canonical V1 detail routes. Their params are the canonical typed
  // contract from `plannerNavigationContract.ts`. Visual surfaces land in
  // M10 (TaskDetail/EventDetail) and M7 (PlannerSearch); M1 only defines the
  // contract.
  TaskDetail: import('./plannerNavigationContract').PlannerEntityDetailParams;
  EventDetail: import('./plannerNavigationContract').PlannerEntityDetailParams;
  PlannerSearch: import('./plannerNavigationContract').PlannerSearchParams;
  PlannerAttentionActivity: import('./plannerNavigationContract').PlannerAttentionActivityParams;
};

export type RootStackParamList = AuthStackParamList & PrivateStackParamList;
