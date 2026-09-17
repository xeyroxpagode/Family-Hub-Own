import {
  ApiError,
  requestJson,
  type AuthMeMembership,
  type InviteLink,
} from './api';

export type Role = 'coordinator' | 'adult' | 'adolescent' | 'child' | 'senior' | 'guest';

export type PendingRole = 'adult' | 'adolescent' | 'child' | 'senior' | 'guest';

export type RoleLabel = 'Coordinador' | 'Adulto' | 'Adolescente' | 'Niño' | 'Adulto mayor' | 'Invitado';

export const ROLE_LABELS: Record<Role, RoleLabel> = {
  coordinator: 'Coordinador',
  adult: 'Adulto',
  adolescent: 'Adolescente',
  child: 'Niño',
  senior: 'Adulto mayor',
  guest: 'Invitado',
};

export type FamilyMember = {
  membership_id: string;
  person_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  role: Role;
  status: 'active' | 'pending' | 'suspended' | 'finalized';
  joined_at: string | null;
  created_at: string;
};

export type JoinRequestData = {
  membership_id: string;
  person_id: string;
  display_name: string;
  avatar_url: string | null;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type RoleRequest = {
  id: string;
  membership_id: string;
  person_id: string;
  display_name: string;
  current_role: Role;
  requested_role: Role;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
};

export type FamilyData = {
  household: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  current_member: {
    membership_id: string;
    person_id: string;
    role: Role;
    status: string;
    can_manage_members: boolean;
    can_invite: boolean;
    can_review_join_requests: boolean;
    can_change_roles: boolean;
  };
  members: FamilyMember[];
  join_requests: JoinRequestData[];
  invite_links: InviteLink[];
  role_requests: RoleRequest[];
  limits: {
    max_members: number;
    max_pending_requests: number;
  };
};

export type FamilyResponse = {
  family: FamilyData;
};

export type RoleRequestPayload = {
  requested_role: Role;
  reason?: string;
};

export type RoleRequestResponse = {
  role_request: RoleRequest;
};

export type RoleUpdatePayload = {
  role: Role;
};

export function getHouseholdFamilyRequest(accessToken: string, householdId: string) {
  return requestJson<FamilyResponse>(`/api/households/${householdId}/family`, { accessToken });
}

export function getHouseholdMembers(accessToken: string, householdId: string) {
  return requestJson<{ members: FamilyMember[] }>(`/api/households/${householdId}/members`, {
    accessToken,
  });
}

export function finalizeHouseholdMemberRequest(
  accessToken: string,
  householdId: string,
  membershipId: string,
) {
  return requestJson<{ membership: AuthMeMembership }>(
    `/api/households/${householdId}/members/${membershipId}/finalize`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export function updateHouseholdMemberRole(
  accessToken: string,
  householdId: string,
  membershipId: string,
  role: Role,
) {
  return requestJson<{ membership: AuthMeMembership }>(
    `/api/households/${householdId}/members/${membershipId}/role`,
    {
      method: 'PATCH',
      accessToken,
      body: { role },
    },
  );
}

export function createRoleRequest(
  accessToken: string,
  householdId: string,
  payload: RoleRequestPayload,
) {
  return requestJson<RoleRequestResponse>(
    `/api/households/${householdId}/role-requests`,
    {
      method: 'POST',
      accessToken,
      body: payload,
    },
  );
}

export function getRoleRequests(
  accessToken: string,
  householdId: string,
  status?: 'pending' | 'all',
) {
  const queryString = status ? `?status=${status}` : '';
  return requestJson<{ role_requests: RoleRequest[] }>(
    `/api/households/${householdId}/role-requests${queryString}`,
    { accessToken },
  );
}

export function approveRoleRequest(
  accessToken: string,
  householdId: string,
  requestId: string,
) {
  return requestJson<{ role_request: RoleRequest }>(
    `/api/households/${householdId}/role-requests/${requestId}/approve`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export function rejectRoleRequest(
  accessToken: string,
  householdId: string,
  requestId: string,
  resolutionNote?: string,
) {
  return requestJson<{ role_request: RoleRequest }>(
    `/api/households/${householdId}/role-requests/${requestId}/reject`,
    {
      method: 'POST',
      accessToken,
      body: resolutionNote ? { resolution_note: resolutionNote } : undefined,
    },
  );
}

export function cancelRoleRequest(
  accessToken: string,
  householdId: string,
  requestId: string,
) {
  return requestJson<{ role_request: RoleRequest }>(
    `/api/households/${householdId}/role-requests/${requestId}/cancel`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

const formatError = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

export async function getHouseholdFamily(
  accessToken: string | null | undefined,
  householdId: string,
): Promise<ServiceResult<FamilyData>> {
  if (!accessToken) {
    return { data: null, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }

  try {
    const response = await getHouseholdFamilyRequest(accessToken, householdId);
    return { data: response.family, error: null };
  } catch (error) {
    return {
      data: null,
      error: formatError(error, 'No pudimos cargar los datos del hogar.'),
    };
  }
}

export async function finalizeMember(
  accessToken: string | null | undefined,
  householdId: string,
  membershipId: string,
): Promise<ServiceResult<AuthMeMembership>> {
  if (!accessToken) {
    return { data: null, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }

  try {
    const response = await finalizeHouseholdMemberRequest(accessToken, householdId, membershipId);
    return { data: response.membership, error: null };
  } catch (error) {
    return {
      data: null,
      error: formatError(error, 'No pudimos completar la acción.'),
    };
  }
}

export async function updateMemberRole(
  accessToken: string | null | undefined,
  householdId: string,
  membershipId: string,
  role: Role,
): Promise<ServiceResult<AuthMeMembership>> {
  if (!accessToken) {
    return { data: null, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }

  try {
    const response = await updateHouseholdMemberRole(accessToken, householdId, membershipId, role);
    return { data: response.membership, error: null };
  } catch (error) {
    return {
      data: null,
      error: formatError(error, 'No pudimos actualizar el rol.'),
    };
  }
}

export async function requestRoleChange(
  accessToken: string | null | undefined,
  householdId: string,
  requestedRole: Role,
  reason?: string,
): Promise<ServiceResult<RoleRequest>> {
  if (!accessToken) {
    return { data: null, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }

  try {
    const response = await createRoleRequest(accessToken, householdId, { requested_role: requestedRole, reason });
    return { data: response.role_request, error: null };
  } catch (error) {
    return {
      data: null,
      error: formatError(error, 'No pudimos enviar la solicitud de cambio de rol.'),
    };
  }
}

export async function getPendingRoleRequests(
  accessToken: string | null | undefined,
  householdId: string,
): Promise<ServiceResult<RoleRequest[]>> {
  if (!accessToken) {
    return { data: null, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }

  try {
    const response = await getRoleRequests(accessToken, householdId, 'pending');
    return { data: response.role_requests, error: null };
  } catch (error) {
    return {
      data: null,
      error: formatError(error, 'No pudimos cargar las solicitudes de rol.'),
    };
  }
}

export async function approveRoleChange(
  accessToken: string | null | undefined,
  householdId: string,
  requestId: string,
): Promise<ServiceResult<RoleRequest>> {
  if (!accessToken) {
    return { data: null, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }

  try {
    const response = await approveRoleRequest(accessToken, householdId, requestId);
    return { data: response.role_request, error: null };
  } catch (error) {
    return {
      data: null,
      error: formatError(error, 'No pudimos aprobar la solicitud.'),
    };
  }
}

export async function rejectRoleChange(
  accessToken: string | null | undefined,
  householdId: string,
  requestId: string,
  resolutionNote?: string,
): Promise<ServiceResult<RoleRequest>> {
  if (!accessToken) {
    return { data: null, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }

  try {
    const response = await rejectRoleRequest(accessToken, householdId, requestId, resolutionNote);
    return { data: response.role_request, error: null };
  } catch (error) {
    return {
      data: null,
      error: formatError(error, 'No pudimos rechazar la solicitud.'),
    };
  }
}

export async function cancelMyRoleRequest(
  accessToken: string | null | undefined,
  householdId: string,
  requestId: string,
): Promise<ServiceResult<RoleRequest>> {
  if (!accessToken) {
    return { data: null, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }

  try {
    const response = await cancelRoleRequest(accessToken, householdId, requestId);
    return { data: response.role_request, error: null };
  } catch (error) {
    return {
      data: null,
      error: formatError(error, 'No pudimos cancelar la solicitud.'),
    };
  }
}
