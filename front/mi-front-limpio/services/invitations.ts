import { supabase } from '../supabase';
import {
  ApiError,
  approveJoinRequest as approveJoinRequestRequest,
  createInviteLink as createInviteLinkRequest,
  joinByToken as joinByTokenRequest,
  listJoinRequests as listJoinRequestsRequest,
  rejectJoinRequest as rejectJoinRequestRequest,
  revokeInviteLink as revokeInviteLinkRequest,
  type AuthMeMembership,
  type InviteLink,
  type JoinRequest,
} from './api';

export type Invitation = InviteLink;
export type PendingRole = 'adult' | 'adolescent' | 'child' | 'senior' | 'guest';

const getAccessToken = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

export async function createInvitation(
  householdId: string,
): Promise<{ invitation: Invitation | null; error: string | null }> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { invitation: null, error: 'Tu sesion expiro. Inicia sesion nuevamente.' };
  }

  try {
    const response = await createInviteLinkRequest(accessToken, householdId);
    return { invitation: response.invite_link, error: null };
  } catch (error) {
    return {
      invitation: null,
      error: getErrorMessage(error, 'No pudimos generar el enlace. Intenta nuevamente.'),
    };
  }
}

export async function revokeInvitation(
  householdId: string,
  invitationId: string,
): Promise<{ invitation: Invitation | null; error: string | null }> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { invitation: null, error: 'Tu sesion expiro. Inicia sesion nuevamente.' };
  }

  try {
    const response = await revokeInviteLinkRequest(accessToken, householdId, invitationId);
    return { invitation: response.invite_link, error: null };
  } catch (error) {
    return {
      invitation: null,
      error: getErrorMessage(error, 'No pudimos revocar el enlace. Intenta nuevamente.'),
    };
  }
}

export async function joinHouseholdByToken(
  token: string,
): Promise<{ membership: AuthMeMembership | null; error: string | null }> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { membership: null, error: 'Tu sesion expiro. Inicia sesion nuevamente.' };
  }

  try {
    const response = await joinByTokenRequest(accessToken, token);
    return { membership: response.join_request.membership, error: null };
  } catch (error) {
    return {
      membership: null,
      error: getErrorMessage(error, 'No pudimos enviar tu solicitud. Intenta nuevamente.'),
    };
  }
}

export async function listPendingJoinRequests(
  householdId: string,
): Promise<{ requests: JoinRequest[]; error: string | null }> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { requests: [], error: 'Tu sesion expiro. Inicia sesion nuevamente.' };
  }

  try {
    const response = await listJoinRequestsRequest(accessToken, householdId);
    return { requests: response.join_requests, error: null };
  } catch (error) {
    return {
      requests: [],
      error: getErrorMessage(error, 'No pudimos cargar las solicitudes. Intenta nuevamente.'),
    };
  }
}

export async function approvePendingJoinRequest(
  householdId: string,
  membershipId: string,
  role: PendingRole,
): Promise<{ membership: AuthMeMembership | null; error: string | null }> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { membership: null, error: 'Tu sesion expiro. Inicia sesion nuevamente.' };
  }

  try {
    const response = await approveJoinRequestRequest(accessToken, householdId, membershipId, role);
    return { membership: response.membership, error: null };
  } catch (error) {
    return {
      membership: null,
      error: getErrorMessage(error, 'No pudimos aprobar la solicitud. Intenta nuevamente.'),
    };
  }
}

export async function rejectPendingJoinRequest(
  householdId: string,
  membershipId: string,
): Promise<{ membership: AuthMeMembership | null; error: string | null }> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { membership: null, error: 'Tu sesion expiro. Inicia sesion nuevamente.' };
  }

  try {
    const response = await rejectJoinRequestRequest(accessToken, householdId, membershipId);
    return { membership: response.membership, error: null };
  } catch (error) {
    return {
      membership: null,
      error: getErrorMessage(error, 'No pudimos rechazar la solicitud. Intenta nuevamente.'),
    };
  }
}
