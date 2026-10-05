import { useEffect, useState } from 'react';

const IS_DEVELOPMENT = typeof __DEV__ !== 'undefined' && __DEV__;

export type PresenceDiagnosticDecision =
  | 'NONE'
  | 'ACCEPTED'
  | 'REJECTED_STALE'
  | 'REJECTED_INVALID'
  | 'REJECTED_INSIGNIFICANT'
  | 'QUEUED_REPLACING_PREVIOUS';

type DiagnosticCoordinate = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

export type PresenceDiagnosticsSnapshot = {
  enabled: boolean;
  lifecycle: {
    sharingEnabled: boolean;
    appState: string;
    watcherState: 'STOPPED' | 'STARTING' | 'ACTIVE' | 'STOPPING';
    watcherGeneration: number | null;
    watcherStartedAt: number | null;
    watcherStoppedAt: number | null;
    watcherStartCount: number;
    watcherStopCount: number;
  };
  gps: {
    latest: DiagnosticCoordinate | null;
    lastAcceptedAt: number | null;
    distanceFromPreviousAcceptedMeters: number | null;
    timeSincePreviousAcceptedMs: number | null;
  };
  decision: {
    value: PresenceDiagnosticDecision;
    reason: string | null;
    at: number | null;
  };
  publish: {
    state: 'IDLE' | 'IN_FLIGHT' | 'SUCCESS' | 'FAILED';
    lastAttemptAt: number | null;
    sampleTimestamp: number | null;
    lastResult: string | null;
    lastSuccessfulAt: number | null;
    lastLatencyMs: number | null;
    queuedNewerSample: boolean;
  };
  realtime: {
    subscriptionState: string;
    lastEventAt: number | null;
    memberId: string | null;
    eventLocationTimestamp: string | null;
    changedNormalizedState: boolean | null;
  };
  marker: {
    debugMemberId: string | null;
    memberId: string | null;
    normalizedLocationTimestamp: string | null;
    latitude: number | null;
    longitude: number | null;
    lastRenderedAt: number | null;
  };
};

const INITIAL_SNAPSHOT: PresenceDiagnosticsSnapshot = {
  enabled: IS_DEVELOPMENT,
  lifecycle: {
    sharingEnabled: false,
    appState: 'unknown',
    watcherState: 'STOPPED',
    watcherGeneration: null,
    watcherStartedAt: null,
    watcherStoppedAt: null,
    watcherStartCount: 0,
    watcherStopCount: 0,
  },
  gps: {
    latest: null,
    lastAcceptedAt: null,
    distanceFromPreviousAcceptedMeters: null,
    timeSincePreviousAcceptedMs: null,
  },
  decision: { value: 'NONE', reason: null, at: null },
  publish: {
    state: 'IDLE',
    lastAttemptAt: null,
    sampleTimestamp: null,
    lastResult: null,
    lastSuccessfulAt: null,
    lastLatencyMs: null,
    queuedNewerSample: false,
  },
  realtime: {
    subscriptionState: 'NOT_SUBSCRIBED',
    lastEventAt: null,
    memberId: null,
    eventLocationTimestamp: null,
    changedNormalizedState: null,
  },
  marker: {
    debugMemberId: null,
    memberId: null,
    normalizedLocationTimestamp: null,
    latitude: null,
    longitude: null,
    lastRenderedAt: null,
  },
};

let snapshot = INITIAL_SNAPSHOT;
let previousAccepted: DiagnosticCoordinate | null = null;
const listeners = new Set<(next: PresenceDiagnosticsSnapshot) => void>();

const update = (next: PresenceDiagnosticsSnapshot) => {
  if (!IS_DEVELOPMENT) return;
  snapshot = next;
  listeners.forEach((listener) => listener(snapshot));
};

const abbreviateId = (value: string | null | undefined) => (
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : null
);

const distanceBetweenMeters = (a: DiagnosticCoordinate, b: DiagnosticCoordinate) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const decisionForSkipReason = (reason: string): PresenceDiagnosticDecision => {
  if (reason === 'stale-timestamp') return 'REJECTED_STALE';
  if (reason === 'below-meaningful-movement' || reason === 'below-publish-distance') return 'REJECTED_INSIGNIFICANT';
  return 'REJECTED_INVALID';
};

export const presenceDiagnostics = {
  getSnapshot: () => snapshot,
  subscribe: (listener: (next: PresenceDiagnosticsSnapshot) => void) => {
    if (!IS_DEVELOPMENT) return () => undefined;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setSharingEnabled: (sharingEnabled: boolean) => update({
    ...snapshot,
    lifecycle: { ...snapshot.lifecycle, sharingEnabled },
  }),
  setAppState: (appState: string) => update({
    ...snapshot,
    lifecycle: { ...snapshot.lifecycle, appState },
  }),
  watcherStarting: (generation: number) => update({
    ...snapshot,
    lifecycle: {
      ...snapshot.lifecycle,
      watcherState: 'STARTING',
      watcherGeneration: generation,
    },
  }),
  watcherStarted: (generation: number) => update({
    ...snapshot,
    lifecycle: {
      ...snapshot.lifecycle,
      watcherState: 'ACTIVE',
      watcherGeneration: generation,
      watcherStartedAt: Date.now(),
      watcherStartCount: snapshot.lifecycle.watcherStartCount + 1,
    },
  }),
  watcherStopping: () => update({
    ...snapshot,
    lifecycle: { ...snapshot.lifecycle, watcherState: 'STOPPING' },
  }),
  watcherStopped: (generation: number | null) => update({
    ...snapshot,
    lifecycle: {
      ...snapshot.lifecycle,
      watcherState: 'STOPPED',
      watcherGeneration: generation ?? snapshot.lifecycle.watcherGeneration,
      watcherStoppedAt: Date.now(),
      watcherStopCount: snapshot.lifecycle.watcherStopCount + 1,
    },
  }),
  recordGps: (coordinate: DiagnosticCoordinate) => update({
    ...snapshot,
    gps: { ...snapshot.gps, latest: coordinate },
  }),
  recordDecision: (value: PresenceDiagnosticDecision, reason: string | null = null) => {
    const accepted = value === 'ACCEPTED' ? snapshot.gps.latest : null;
    const previous = previousAccepted;
    if (accepted) previousAccepted = accepted;
    update({
      ...snapshot,
      gps: accepted ? {
        ...snapshot.gps,
        lastAcceptedAt: accepted.timestamp,
        distanceFromPreviousAcceptedMeters: previous ? distanceBetweenMeters(previous, accepted) : null,
        timeSincePreviousAcceptedMs: previous ? Math.max(0, accepted.timestamp - previous.timestamp) : null,
      } : snapshot.gps,
      decision: { value, reason, at: Date.now() },
    });
  },
  recordSkippedPublish: (reason: string) => {
    presenceDiagnostics.recordDecision(decisionForSkipReason(reason), reason);
  },
  recordQueuedLatestSample: () => update({
    ...snapshot,
    decision: { value: 'QUEUED_REPLACING_PREVIOUS', reason: 'publish-in-flight', at: Date.now() },
    publish: { ...snapshot.publish, queuedNewerSample: true },
  }),
  publishStarted: (sampleTimestamp: number) => update({
    ...snapshot,
    publish: {
      ...snapshot.publish,
      state: 'IN_FLIGHT',
      lastAttemptAt: Date.now(),
      sampleTimestamp,
      lastResult: null,
      queuedNewerSample: false,
    },
  }),
  publishSucceeded: () => update({
    ...snapshot,
    publish: {
      ...snapshot.publish,
      state: 'SUCCESS',
      lastSuccessfulAt: Date.now(),
      lastResult: 'HTTP_SUCCESS',
      lastLatencyMs: snapshot.publish.lastAttemptAt ? Date.now() - snapshot.publish.lastAttemptAt : null,
    },
  }),
  publishFailed: (reason: string) => update({
    ...snapshot,
    publish: {
      ...snapshot.publish,
      state: 'FAILED',
      lastResult: reason,
      lastLatencyMs: snapshot.publish.lastAttemptAt ? Date.now() - snapshot.publish.lastAttemptAt : null,
    },
  }),
  realtimeSubscription: (state: string) => update({
    ...snapshot,
    realtime: { ...snapshot.realtime, subscriptionState: state },
  }),
  realtimeEvent: ({ memberId, locationTimestamp, changedNormalizedState }: {
    memberId: string;
    locationTimestamp: string | null;
    changedNormalizedState: boolean | null;
  }) => update({
    ...snapshot,
    realtime: {
      ...snapshot.realtime,
      lastEventAt: Date.now(),
      memberId: abbreviateId(memberId),
      eventLocationTimestamp: locationTimestamp,
      changedNormalizedState,
    },
  }),
  setDebugMember: (memberId: string | null) => update({
    ...snapshot,
    marker: { ...snapshot.marker, debugMemberId: memberId ? abbreviateId(memberId) : null },
  }),
  markerRendered: ({ memberId, locationTimestamp, latitude, longitude }: {
    memberId: string;
    locationTimestamp: string | null;
    latitude: number;
    longitude: number;
  }) => {
    const debugMember = snapshot.marker.debugMemberId;
    if (debugMember && debugMember !== abbreviateId(memberId)) return;
    update({
      ...snapshot,
      marker: {
        ...snapshot.marker,
        memberId: abbreviateId(memberId),
        normalizedLocationTimestamp: locationTimestamp,
        latitude,
        longitude,
        lastRenderedAt: Date.now(),
      },
    });
  },
};

export const usePresenceDiagnostics = () => {
  const [current, setCurrent] = useState<PresenceDiagnosticsSnapshot>(presenceDiagnostics.getSnapshot);

  useEffect(() => presenceDiagnostics.subscribe(setCurrent), []);

  return current;
};
