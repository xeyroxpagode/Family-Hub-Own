function runtimeStorageOrigin(): string | null {
  const raw = process.env.EXPO_PUBLIC_HOMECLOUD_STORAGE_URL
    ?? process.env.EXPO_PUBLIC_SUPABASE_URL
    ?? null;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function isLocalOnlyHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '0.0.0.0'
    || normalized === '::1';
}

/**
 * Replace only a device-unreachable local origin. The signed remainder is
 * copied from the original string, so path encoding and query signatures are
 * never reconstructed by URLSearchParams.
 */
export function normalizeSignedStorageUrlForRuntime(
  signedUrl: string,
  configuredRuntimeOrigin: string | null = runtimeStorageOrigin(),
): string {
  if (!configuredRuntimeOrigin) return signedUrl;
  try {
    const signed = new URL(signedUrl);
    if (!isLocalOnlyHostname(signed.hostname)) return signedUrl;
    const targetOrigin = new URL(configuredRuntimeOrigin).origin;
    const authorityStart = signedUrl.indexOf('://') + 3;
    const relativeBoundary = signedUrl.slice(authorityStart).search(/[/?#]/);
    const signedRemainder = relativeBoundary < 0
      ? ''
      : signedUrl.slice(authorityStart + relativeBoundary);
    return `${targetOrigin}${signedRemainder}`;
  } catch {
    return signedUrl;
  }
}
