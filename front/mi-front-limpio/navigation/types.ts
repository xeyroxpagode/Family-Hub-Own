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

export type PlannerStackParamList = {
  PlannerHome: {
    refreshKey?: number;
    initialTab?: 'tasks' | 'calendar' | 'goals';
    initialSheet?: 'task' | 'event';
    sheetKey?: number;
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
  GoalDetail: { goalId: string };
  PlannerTrash: undefined;
};

export type RootStackParamList = AuthStackParamList & PrivateStackParamList;
