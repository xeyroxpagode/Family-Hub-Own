export type NormalizedInviteLink = {
  id?: string;
  token?: string;
  url?: string;
  displayValue?: string;
};

type InviteLinkRecord = Record<string, unknown>;

const readString = (record: InviteLinkRecord, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
};

const extractTokenFromUrl = (value?: string) => {
  if (!value) return undefined;
  const tokenMatch = value.match(/[?&]token=([^&#]+)/);
  return tokenMatch?.[1] ? decodeURIComponent(tokenMatch[1]).trim() : undefined;
};

export const buildInviteDeepLink = (token: string) => `homeplus://join?token=${token}`;

export const normalizeInviteLink = (rawInviteLink: unknown): NormalizedInviteLink => {
  if (!rawInviteLink || typeof rawInviteLink !== 'object') return {};

  const record = rawInviteLink as InviteLinkRecord;
  const url = readString(record, ['url', 'link', 'invite_url', 'invite_link_url']);
  const token = readString(record, ['token', 'invite_token']) ?? extractTokenFromUrl(url);
  const id = readString(record, ['id']);
  const resolvedUrl = url ?? (token ? buildInviteDeepLink(token) : undefined);

  return {
    id,
    token,
    url: resolvedUrl,
    displayValue: resolvedUrl ?? token,
  };
};

export const isInviteLinkActive = (rawInviteLink: unknown) => {
  if (!rawInviteLink || typeof rawInviteLink !== 'object') return false;

  const record = rawInviteLink as InviteLinkRecord;
  if (typeof record.revoked_at === 'string' && record.revoked_at.length > 0) return false;

  if (typeof record.expires_at === 'string' && record.expires_at.length > 0) {
    const expiresAt = new Date(record.expires_at).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) return false;
  }

  const normalized = normalizeInviteLink(rawInviteLink);
  return Boolean(normalized.token || normalized.url);
};

export const getInviteLinkDebugInfo = (rawInviteLink: unknown) => {
  const normalized = normalizeInviteLink(rawInviteLink);

  return {
    hasToken: Boolean(normalized.token),
    hasUrl: Boolean(normalized.url),
    qrValue: normalized.url ? 'ready' : null,
  };
};
