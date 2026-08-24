export type ConnectivityRecoveryInput = {
  sessionReady: boolean;
  recoveryInFlight: boolean;
  previousOnline: boolean | null;
  nextOnline: boolean;
};

export function shouldRefreshAfterConnectivityChange(input: ConnectivityRecoveryInput) {
  return input.sessionReady
    && !input.recoveryInFlight
    && input.previousOnline === false
    && input.nextOnline === true;
}

export function shouldRefreshOnAppActive(input: { sessionReady: boolean; recoveryInFlight: boolean }) {
  return input.sessionReady && !input.recoveryInFlight;
}
