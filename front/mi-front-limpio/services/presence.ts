import { OPERATION_KINDS, requestJson } from './api';

export type PresenceMemberStatus =
  | 'live'
  | 'stale'
  | 'unavailable'
  | 'sharing_disabled';

export type PresenceMemberLocation = {
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  recorded_at: string;
  updated_at: string;
};

export type PresenceMember = {
  person_id: string;
  membership_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string | null;
  is_self: boolean;
  sharing_enabled: boolean;
  status: PresenceMemberStatus;
  location: PresenceMemberLocation | null;
};

export type PresenceLocationsResponse = {
  household_id: string;
  stale_after_minutes: number;
  members: PresenceMember[];
};

export type UpdatePresenceLocationPayload = {
  sharing_enabled?: boolean;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number | null;
  recorded_at?: string;
};

export const fetchPresenceLocations = (
  accessToken: string,
  options: { signal?: AbortSignal | null } = {},
) =>
  requestJson<PresenceLocationsResponse>('/api/presence/locations', {
    accessToken,
    signal: options.signal,
    timeoutMs: 8000,
    contextScope: 'presence:locations',
  });

export const updateMyPresenceLocation = (
  accessToken: string,
  payload: UpdatePresenceLocationPayload,
) =>
  requestJson<{ location: unknown }>('/api/presence/location', {
    method: 'PUT',
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    accessToken,
    body: payload,
    timeoutMs: 8000,
    contextScope: 'presence:location:update',
  });
