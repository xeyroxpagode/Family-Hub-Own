import * as Crypto from 'expo-crypto';

function canonicalizeV2Value(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeV2Value(item));
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    Object.keys(value as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = canonicalizeV2Value((value as Record<string, unknown>)[key]);
      });
    return sorted;
  }
  return value;
}

export async function hashIdempotencyRequestV2(params: {
  operation: string;
  scopeType: string;
  scopeId: string | null;
  targetId: string | null;
  payload: unknown;
  expectedVersion: number | null;
  mutationId: string;
}): Promise<string> {
  const canonical = canonicalizeV2Value({
    operation: params.operation ?? '',
    scope_type: params.scopeType ?? '',
    scope_id: params.scopeId ?? null,
    target_id: params.targetId ?? null,
    payload: params.payload ?? null,
    expected_version: params.expectedVersion ?? null,
    mutation_id: params.mutationId ?? '',
  });

  const stripped = JSON.stringify(canonical, (_key, value) =>
    value === null ? undefined : value,
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(stripped);
  const hashBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}