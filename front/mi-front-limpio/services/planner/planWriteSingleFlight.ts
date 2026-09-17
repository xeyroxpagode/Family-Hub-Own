export type PlanWriteSingleFlightGate = {
  readonly current: () => string | null;
  readonly acquire: (operationKey: string) => boolean;
  readonly release: (operationKey: string) => boolean;
  readonly clear: () => void;
};

export function createPlanWriteSingleFlightGate(): PlanWriteSingleFlightGate {
  let activeOperationKey: string | null = null;
  return {
    current: () => activeOperationKey,
    acquire: (operationKey) => {
      if (activeOperationKey !== null) return false;
      activeOperationKey = operationKey;
      return true;
    },
    release: (operationKey) => {
      if (activeOperationKey !== operationKey) return false;
      activeOperationKey = null;
      return true;
    },
    clear: () => {
      activeOperationKey = null;
    },
  };
}
