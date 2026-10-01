import {
  OPERATION_KINDS,
  requestJson,
  type ParsedJsonResponse,
} from './api';

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
  presence_updated_at: string | null;
  location: PresenceMemberLocation | null;
};

export type PresenceLocationsResponse = {
  household_id: string;
  stale_after_minutes: number;
  members: PresenceMember[];
};

export type UpdatePresenceLocationPayload = {
  sharing_enabled?: boolean;
  sharing_mode?: 'off' | 'foreground' | 'background';
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number | null;
  recorded_at?: string;
};

export type PresenceLocationRecord = {
  household_id: string;
  membership_id: string;
  person_id: string;
  sharing_enabled: boolean;
  sharing_mode: 'off' | 'foreground' | 'background';
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  recorded_at: string | null;
  updated_at: string;
};

const memberVersionMs = (member: PresenceMember) => {
  const value = Date.parse(member.presence_updated_at ?? member.location?.updated_at ?? member.location?.recorded_at ?? '');
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

/**
 * Presence is keyed by household membership, not person or auth user. This
 * keeps the location selected by the map, the API response and Realtime on
 * the same identity when a household has multiple people.
 */
export const mergePresenceMembers = (
  currentMembers: PresenceMember[],
  incomingMembers: PresenceMember[],
) => {
  const currentByMembershipId = new Map(
    currentMembers.map((member) => [member.membership_id, member]),
  );

  return incomingMembers.map((incoming) => {
    const current = currentByMembershipId.get(incoming.membership_id);
    if (!current || memberVersionMs(incoming) >= memberVersionMs(current)) {
      return incoming;
    }

    // The member profile still comes from the newest household response, but
    // an in-flight GET must never roll a newer live location backwards.
    return {
      ...incoming,
      sharing_enabled: current.sharing_enabled,
      status: current.status,
      location: current.location,
    };
  });
};

export const shouldApplyPresenceMember = (
  currentMember: PresenceMember,
  incomingMember: PresenceMember,
) => memberVersionMs(incomingMember) >= memberVersionMs(currentMember);

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const redactedLocationSummary = (value: unknown) => {
  if (!isRecord(value)) return value;
  const location = isRecord(value.location) ? value.location : null;
  return {
    keys: Object.keys(value),
    location: location ? {
      keys: Object.keys(location),
      membership_id: typeof location.membership_id === 'string' ? '<present>' : location.membership_id,
      household_id: typeof location.household_id === 'string' ? '<present>' : location.household_id,
      sharing_enabled: location.sharing_enabled,
      sharing_mode: location.sharing_mode,
      latitude: typeof location.latitude === 'number' ? '<present>' : location.latitude,
      longitude: typeof location.longitude === 'number' ? '<present>' : location.longitude,
      accuracy_meters: typeof location.accuracy_meters === 'number' ? '<present>' : location.accuracy_meters,
      recorded_at: location.recorded_at,
      updated_at: location.updated_at,
    } : null,
  };
};

const debugPresenceLocationResponse = ({ status, rawBody, parsedBody }: ParsedJsonResponse) => {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  let rawResponseBody: unknown = rawBody;
  try {
    rawResponseBody = redactedLocationSummary(JSON.parse(rawBody) as unknown);
  } catch {
    rawResponseBody = '<non-json response>';
  }

  console.log('[Presence] location.put.response', {
    status,
    rawResponseBody,
    parsedJson: redactedLocationSummary(parsedBody),
    expectedResponseShape: {
      location: [
        'household_id',
        'membership_id',
        'person_id',
        'sharing_enabled',
        'sharing_mode',
        'latitude',
        'longitude',
        'accuracy_meters',
        'recorded_at',
        'updated_at',
      ],
    },
  });
};

const parsePresenceLocationResponse = (response: unknown): { location: PresenceLocationRecord } => {
  const location = isRecord(response) && isRecord(response.location) ? response.location : null;
  const validSharingMode = location?.sharing_mode === 'off'
    || location?.sharing_mode === 'foreground'
    || location?.sharing_mode === 'background';
  const hasValidCoordinates = Number.isFinite(location?.latitude)
    && Number.isFinite(location?.longitude)
    && typeof location?.recorded_at === 'string';
  const hasIdentity = typeof location?.household_id === 'string'
    && typeof location?.membership_id === 'string'
    && typeof location?.person_id === 'string';
  const isSharing = location?.sharing_enabled === true;

  if (!location
    || !hasIdentity
    || typeof location.sharing_enabled !== 'boolean'
    || !validSharingMode
    || typeof location.updated_at !== 'string'
    || (isSharing && (!hasValidCoordinates || location.sharing_mode === 'off'))
    || (!isSharing && location.sharing_mode !== 'off')) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Presence] location.put.response.invalid', redactedLocationSummary(response));
    }
    throw new Error('presence_location_response_invalid');
  }

  return { location: location as PresenceLocationRecord };
};

export const updateMyPresenceLocation = async (
  accessToken: string,
  payload: UpdatePresenceLocationPayload,
) => {
  const response = await requestJson<unknown>('/api/presence/location', {
    method: 'PUT',
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    accessToken,
    body: payload,
    timeoutMs: 8000,
    contextScope: 'presence:location:update',
    onParsedResponse: debugPresenceLocationResponse,
  });

  return parsePresenceLocationResponse(response);
};
