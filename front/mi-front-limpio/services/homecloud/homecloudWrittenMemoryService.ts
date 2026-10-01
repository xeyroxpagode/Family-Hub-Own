import { createIdempotencyKey, generateMutationId, OPERATION_KINDS, requestJson } from '../api';
import type { SemanticDateValue } from './homecloudSemanticDate';

export interface CreateWrittenMemoryInput extends SemanticDateValue {
  text: string;
  initialAlbumId?: string | null;
  intakeRequestId?: string;
}

export interface CreatedWrittenMemory {
  id: string;
  role: 'memory';
}

/** Productive Written Memory intake: register without binary fields, then finalize. */
export async function createWrittenMemory(
  accessToken: string,
  input: CreateWrittenMemoryInput,
): Promise<CreatedWrittenMemory> {
  const writtenText = input.text.trim();
  if (!writtenText) throw new Error('Escribí el recuerdo antes de guardarlo.');

  const intakeRequestId = input.intakeRequestId ?? generateMutationId();
  const register = await requestJson<{ content: CreatedWrittenMemory }>(
    '/api/homecloud/register',
    {
      method: 'POST',
      accessToken,
      body: {
        role: 'memory',
        writtenText,
        intakeRequestId,
        initialAlbumId: input.initialAlbumId ?? null,
        hiddenFromResurfacing: false,
        capturePrecision: input.precision,
        ...(input.capturedAt ? { capturedAt: input.capturedAt } : {}),
        ...(input.capturedYear !== null ? { capturedYear: input.capturedYear } : {}),
        ...(input.capturedMonth !== null ? { capturedMonth: input.capturedMonth } : {}),
      },
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      idempotencyKey: createIdempotencyKey('homecloud.written.register'),
      mutationId: intakeRequestId,
    },
  );

  await requestJson<{ content: CreatedWrittenMemory }>(
    `/api/homecloud/content/${register.content.id}/finalize`,
    { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
  );
  return register.content;
}
