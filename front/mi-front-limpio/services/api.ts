import { Platform } from 'react-native';
import axios from 'axios';

const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const resolveApiBaseUrl = () => {
  if (!RAW_API_BASE_URL) return RAW_API_BASE_URL;

  if (Platform.OS !== 'web') {
    return RAW_API_BASE_URL.replace(/\/+$/, '');
  }

  try {
    const url = new URL(RAW_API_BASE_URL);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.hostname = 'localhost';
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return RAW_API_BASE_URL.replace(/\/+$/, '');
  }
};

const API_BASE_URL = resolveApiBaseUrl();

const redactRequestBody = (body: unknown) => {
  if (!body || typeof body !== 'object') {
    return body === undefined ? undefined : '<non-object-body>';
  }

  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([key, value]) => [
      key,
      key.toLowerCase().includes('password') || key.toLowerCase().includes('token')
        ? '<redacted>'
        : value,
    ]),
  );
};

const logApiDebug = (event: string, data: Record<string, unknown>) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      console.log(`[HomePlus API] ${event} ${JSON.stringify(data)}`);
    } catch {
      console.log(`[HomePlus API] ${event}`);
    }
  }
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RequestJsonOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  accessToken?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

export type AuthMeNavigation = {
  auth: 'authenticated';
  has_person: boolean;
  has_household: boolean;
  has_active_household: boolean;
  membership_state: 'none' | 'pending' | 'active' | 'suspended' | string;
  next:
    | 'create_person_profile'
    | 'create_or_join_household'
    | 'pending_approval'
    | 'access_suspended'
    | 'select_household'
    | 'set_active_household'
    | 'repair_active_household'
    | 'household_onboarding'
    | 'home'
    | string;
};

export type AuthMeMembership = {
  id: string;
  household_id: string;
  person_id: string;
  role: 'coordinator' | 'adult' | 'adolescent' | 'child' | 'senior' | 'guest' | string | null;
  status: 'pending' | 'active' | 'suspended' | 'finalized' | string;
  joined_at: string | null;
  left_at: string | null;
  household_onboarding_status: 'not_started' | 'in_progress' | 'completed' | string;
  household_onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthMeHousehold = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  default_language: string;
  config: Record<string, unknown>;
  created_by_person_id: string;
  created_at: string;
  updated_at: string;
};

export type AuthMePerson = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  default_language: string;
  personal_settings: Record<string, unknown>;
  active_household_id: string | null;
  app_onboarding_status: 'not_started' | 'in_progress' | 'completed' | string;
  app_onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthMe = {
  user: unknown;
  person: AuthMePerson | null;
  memberships: AuthMeMembership[];
  active_household: AuthMeHousehold | null;
  navigation: AuthMeNavigation;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: unknown;
};

export type AuthRegisterPayload = {
  email: string;
  password: string;
  display_name: string;
};

export type AuthRegisterResponse = {
  user: unknown;
  person: AuthMePerson;
  session: AuthSession | null;
  requires_email_confirmation: boolean;
};

export type AuthLoginPayload = {
  email: string;
  password: string;
};

export type AuthLoginResponse = {
  user: unknown;
  person: AuthMePerson | null;
  session: AuthSession;
  me: AuthMe;
};

export type AuthLogoutResponse = {
  success: boolean;
};

export type CreateHouseholdPayload = {
  name: string;
};

export type CreateHouseholdResponse = {
  household: AuthMeHousehold;
  membership: AuthMeMembership;
  person: AuthMePerson;
  me: AuthMe;
};

export type InviteLink = {
  id: string;
  household_id: string;
  token: string;
  created_by_person_id?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateInviteLinkResponse = {
  invite_link: InviteLink;
};

export type JoinByTokenResponse = {
  join_request: {
    result: 'pending_created' | 'pending_existing' | string;
    membership: AuthMeMembership;
  };
};

export type JoinRequest = AuthMeMembership;

export type ListJoinRequestsResponse = {
  join_requests: JoinRequest[];
};

export type MembershipResponse = {
  membership: AuthMeMembership;
};

export class ApiError extends Error {
  status: number;
  code: string | null;
  debugMessage: string | null;

  constructor(message: string, status: number, code: string | null = null, debugMessage?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.debugMessage = debugMessage ?? null;

    if (__DEV__ && this.debugMessage) {
      console.error('[ApiError]', this.debugMessage);
    }
  }
}

export const getBearerHeaders = (accessToken?: string | null): Record<string, string> => {
  if (!accessToken) {
    return {};
  }

  return { Authorization: `Bearer ${accessToken}` };
};

const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) {
    throw new ApiError('Falta EXPO_PUBLIC_API_URL para conectar con el backend.', 0, 'api_url_missing');
  }

  const base = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const getResponseMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.error === 'string') return record.error;
  }

  return fallback;
};

const getResponseCode = (payload: unknown) => {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.code === 'string') return record.code;
  }

  return null;
};

export async function requestJson<T>(path: string, options: RequestJsonOptions = {}): Promise<T> {
  const { method = 'GET', accessToken, body, headers } = options;

  const fullUrl = buildApiUrl(path);

  logApiDebug('request', {
    baseURL: API_BASE_URL,
    endpoint: path,
    method,
    body: redactRequestBody(body),
  });

  let response: Response;

  try {
    response = await fetch(fullUrl, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...getBearerHeaders(accessToken),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    logApiDebug('network-error', {
      baseURL: API_BASE_URL,
      endpoint: path,
      method,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const text = await response.text();

  if (!text) {
    if (!response.ok) {
      const debugMsg = `Empty response from ${method} ${path} (status ${response.status})`;
      logApiDebug('error', {
        baseURL: API_BASE_URL,
        endpoint: path,
        method,
        status: response.status,
        body: null,
      });
      throw new ApiError(
        'No pudimos conectar correctamente con el servidor. Intentá de nuevo.',
        response.status,
        'empty_response',
        debugMsg,
      );
    }
    return {} as T;
  }

  let payload: unknown = null;

  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    const contentType = response.headers.get('content-type') || 'unknown';
    const bodyPreview = text.slice(0, 200).replace(/\s+/g, ' ');
    const debugMsg = `Invalid JSON from ${method} ${path} (status ${response.status}, content-type: ${contentType}, body: ${bodyPreview})`;
    logApiDebug('invalid-json', {
      baseURL: API_BASE_URL,
      endpoint: path,
      method,
      status: response.status,
      body: bodyPreview,
    });
    
    let userMessage = 'No pudimos conectar correctamente con el servidor. Intentá de nuevo.';
    if (response.status === 401) {
      userMessage = 'Tu sesión expiró o no está disponible. Volvé a iniciar sesión.';
    } else if (response.status === 403) {
      userMessage = 'No tenes permiso para acceder a este recurso.';
    } else if (response.status === 0 || response.status === undefined) {
      userMessage = 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
    }

    throw new ApiError(userMessage, response.status, 'invalid_json', debugMsg);
  }

  if (!response.ok) {
    logApiDebug('error', {
      baseURL: API_BASE_URL,
      endpoint: path,
      method,
      status: response.status,
      body: payload,
    });
    throw new ApiError(
      getResponseMessage(payload, 'No pudimos completar la solicitud.'),
      response.status,
      getResponseCode(payload),
    );
  }

  return payload as T;
}

export const getAuthMe = (accessToken: string) =>
  requestJson<AuthMe>('/api/auth/me', { accessToken });

export const authRegister = (payload: AuthRegisterPayload) =>
  requestJson<AuthRegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });

export const authLogin = (payload: AuthLoginPayload) =>
  requestJson<AuthLoginResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });

export const authLogout = (accessToken?: string | null) =>
  requestJson<AuthLogoutResponse>('/api/auth/logout', {
    method: 'POST',
    accessToken,
  });

export const createHousehold = (accessToken: string, payload: CreateHouseholdPayload) =>
  requestJson<CreateHouseholdResponse>('/api/households', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export const createInviteLink = (accessToken: string, householdId: string) =>
  requestJson<CreateInviteLinkResponse>(`/api/households/${householdId}/invite-links`, {
    method: 'POST',
    accessToken,
  });

export const revokeInviteLink = (
  accessToken: string,
  householdId: string,
  inviteLinkId: string,
) =>
  requestJson<CreateInviteLinkResponse>(
    `/api/households/${householdId}/invite-links/${inviteLinkId}/revoke`,
    {
      method: 'POST',
      accessToken,
    },
  );

export const joinByToken = (accessToken: string, token: string) =>
  requestJson<JoinByTokenResponse>('/api/invite-links/join', {
    method: 'POST',
    accessToken,
    body: { token },
  });

export const listJoinRequests = (accessToken: string, householdId: string) =>
  requestJson<ListJoinRequestsResponse>(`/api/households/${householdId}/join-requests`, {
    accessToken,
  });

export const approveJoinRequest = (
  accessToken: string,
  householdId: string,
  membershipId: string,
  role: string,
) =>
  requestJson<MembershipResponse>(
    `/api/households/${householdId}/join-requests/${membershipId}/approve`,
    {
      method: 'POST',
      accessToken,
      body: { role },
    },
  );

export const rejectJoinRequest = (
  accessToken: string,
  householdId: string,
  membershipId: string,
) =>
  requestJson<MembershipResponse>(
    `/api/households/${householdId}/join-requests/${membershipId}/reject`,
    {
      method: 'POST',
      accessToken,
    },
  );

export const finalizeHouseholdMember = (
  accessToken: string,
  householdId: string,
  membershipId: string,
) =>
  requestJson<MembershipResponse>(
    `/api/households/${householdId}/members/${membershipId}/finalize`,
    {
      method: 'POST',
      accessToken,
    },
  );

export const getPeopleMe = (accessToken: string) =>
  requestJson<{ person: AuthMePerson }>('/api/people/me', { accessToken });

export type UpdatePeoplePayload = {
  display_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
};

export const updatePeopleMe = (accessToken: string, payload: UpdatePeoplePayload) =>
  requestJson<{ person: AuthMePerson }>('/api/people/me', {
    method: 'PATCH',
    accessToken,
    body: payload,
  });

export type UpdatePeopleAvatarResponse = {
  person: AuthMePerson;
  avatar_url: string;
};

export const updatePeopleAvatar = (accessToken: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const fullUrl = buildApiUrl('/api/people/me/avatar');

  return fetch(fullUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  }).then(async (response) => {
    const text = await response.text();

    if (!text) {
      throw new ApiError('No se recibio respuesta del servidor.', response.status);
    }

    const payload = JSON.parse(text) as UpdatePeopleAvatarResponse;

    if (!response.ok) {
      throw new ApiError(
        getResponseMessage(payload, 'No pudimos actualizar el avatar.'),
        response.status,
        getResponseCode(payload),
      );
    }

    return payload;
  });
};

export const setActiveHousehold = (accessToken: string, householdId: string) =>
  requestJson<{
    person: AuthMePerson;
    active_household: AuthMeHousehold;
    active_membership: AuthMeMembership;
    me: AuthMe;
  }>(`/api/households/${householdId}/set-active`, {
    method: 'POST',
    accessToken,
  });

export type UserHousehold = {
  household_id: string;
  household_name: string;
  role: string;
  status: string;
};

export const getUserHouseholds = (accessToken: string) =>
  requestJson<{ households: UserHousehold[] }>(`/api/people/me/households`, {
    accessToken,
  });
