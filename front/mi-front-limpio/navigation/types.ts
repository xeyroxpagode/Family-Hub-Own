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
  ExperienceShell: undefined;
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
  FamilyTab: undefined;
  InventoryTab: undefined;
  QuickActionTab: undefined;
  PlannerTab: undefined;
  MoreTab: undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Inventory: undefined;
  Family: undefined;
  Finance: import('./financeNavigation').FinanceEntryParams | undefined;
  FinanceAccounts: {
    contextType: import('../services/finance/financeContext').FinanceContextType;
  };
  FinancePapelera: {
    contextType: import('../services/finance/financeContext').FinanceContextType;
  };
  FinancePoolManagement: {
    contextType: import('../services/finance/financeContext').FinanceContextType;
    currency: string;
  };
  FinanceSpendingLimitsManagement: {
    contextType: import('../services/finance/financeContext').FinanceContextType;
    currency: string;
    period: string;
  };
  FinanceCategoryManagement: {
    contextType: import('../services/finance/financeContext').FinanceContextType;
    currency: string;
  };
  FinanceAnalysisDetail: {
    contextType: import('../services/finance/financeContext').FinanceContextType;
    currency: string;
    periodType: import('../services/finance/financeAnalysis').FinanceAnalysisPeriodType;
    period: string;
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
    planId?: string;
    planTitle?: string;
    fromPlan?: boolean;
    /** P2.2A: canonical task preset payload to apply on open ("Usar" preset). */
    presetPayload?: import('../services/planner/plannerPresetTaskDomain').PlannerPresetTaskPayload;
  } | undefined;
  EditTask: { taskId: string };
  CreateEvent: undefined;
  EditEvent: { eventId: string };
  CreateGoal: undefined;
  EditGoal: { goalId?: string } | import('./plannerNavigationContract').PlannerEntityDetailParams;
  GoalDetail: { goalId: string; source?: 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown'; } | import('./plannerNavigationContract').PlannerEntityDetailParams;
  EditPlan: { goalId?: string; planId?: string } | import('./plannerNavigationContract').PlannerEntityDetailParams;
  PlannerTrash: undefined;
  PlannerPresetLibrary: undefined;
  PlannerPresetDetail: { presetId: string };
  PlannerPresetCreate: {
    duplicateFromPresetId?: string;
    /** P2.2A: prefill for "Guardar como preset" from an existing Task (contextual fields already stripped). */
    presetPrefill?: import('../services/planner/plannerPresetTaskDomain').PlannerPresetTaskPayload;
  } | undefined;
  PlannerPresetEdit: { presetId: string };
  PlannerDraftRecovery: undefined;
  PlannerDraftResume: { draftId: string };
  PlannerPresetDraftsTrash: undefined;
  // New canonical V1 Plan routes
  PlanList: { refreshKey?: number } | undefined;
  CreatePlan: undefined;
  PlanDetail: import('./plannerNavigationContract').PlannerEntityDetailParams | { planId: string; justCreated?: boolean };
  // New canonical V1 detail routes. Their params are the canonical typed
  // contract from `plannerNavigationContract.ts`. Visual surfaces land in
  // M10 (TaskDetail/EventDetail) and M7 (PlannerSearch); M1 only defines the
  // contract.
  TaskDetail: import('./plannerNavigationContract').PlannerEntityDetailParams;
  EventDetail: import('./plannerNavigationContract').PlannerEntityDetailParams;
  PlannerSearch: import('./plannerNavigationContract').PlannerSearchParams;
  PlannerAttentionActivity: import('./plannerNavigationContract').PlannerAttentionActivityParams;
  Responsibilities: undefined;
  ResponsibilityCreate: undefined;
  ResponsibilityEdit: { responsibilityId: string };
  ResponsibilityDetail: { responsibilityId: string };
};

export type RootStackParamList = AuthStackParamList & PrivateStackParamList;
