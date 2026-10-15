/**
 * Planner Tasks Patch 3 — Batch coordinator (puro, sin React Native).
 *
 * Frontend coordinator sobre mutaciones individuales CURRENT: ejecuta solo el
 * subset elegible con concurrencia limitada (~3), conserva expected_version e
 * identidad de mutación por Task, recoge por-Task success/conflict/forbidden/
 * invalid/other, sin fail-fast y sin rollback global. El backend revalida
 * permiso/estado en cada llamada (autoridad final).
 */

export const BATCH_CONCURRENCY_LIMIT = 3;

export type BatchFailureKind = 'conflict' | 'forbidden' | 'invalid_transition' | 'evidence_required' | 'other';

export type BatchItemResult<T> =
  | { id: string; ok: true; value: T }
  | { id: string; ok: false; kind: BatchFailureKind; error: unknown };

const errorCodeOf = (error: unknown): string => {
  if (!error || typeof error !== 'object') return '';
  const record = error as Record<string, unknown>;
  const code = record.code ?? (record as { data?: { code?: unknown } }).data?.code;
  return typeof code === 'string' ? code : '';
};

const statusOf = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
};

/** Clasifica un fallo por Task a partir del contrato de error CURRENT. */
export const classifyBatchError = (error: unknown): BatchFailureKind => {
  const code = errorCodeOf(error);
  const status = statusOf(error);
  if (
    status === 412
    || code === 'version_conflict'
    || code === 'version_conflict_v2'
    || code === 'assignment_version_conflict'
  ) {
    return 'conflict';
  }
  if (status === 403 || code === 'planner_forbidden' || code === 'rls_violation' || code === 'forbidden') {
    return 'forbidden';
  }
  if (
    code === 'evidence_submission_required'
    || code === 'verification_required'
  ) {
    return 'evidence_required';
  }
  if (
    status === 409
    || status === 422
    || status === 400
    || code === 'task_invalid_transition'
    || code === 'task_not_operational'
    || code === 'invalid_transition'
    || code === 'invalid_assignment'
    || code === 'already_claimed'
  ) {
    return 'invalid_transition';
  }
  return 'other';
};

/**
 * Ejecuta `worker` sobre `ids` con como máximo `limit` operaciones
 * simultáneas. Orden de resultados determinista (= orden de entrada).
 * Nunca fail-fast: un rechazo solo marca ese item.
 */
export const runBatchWithLimit = async <T>(
  ids: readonly string[],
  limit: number,
  worker: (id: string) => Promise<T>,
): Promise<BatchItemResult<T>[]> => {
  const safeLimit = Math.max(1, Math.floor(limit));
  const results: BatchItemResult<T>[] = new Array(ids.length);
  let cursor = 0;
  const runners = new Array(Math.min(safeLimit, ids.length)).fill(null).map(async () => {
    while (cursor < ids.length) {
      const index = cursor;
      cursor += 1;
      const id = ids[index];
      try {
        const value = await worker(id);
        results[index] = { id, ok: true, value };
      } catch (error) {
        results[index] = { id, ok: false, kind: classifyBatchError(error), error };
      }
    }
  });
  await Promise.all(runners);
  return results;
};

export type BatchSummary = {
  total: number;
  succeeded: string[];
  failed: Array<{ id: string; kind: BatchFailureKind }>;
};

export const summarizeBatchResults = <T>(results: readonly BatchItemResult<T>[]): BatchSummary => {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; kind: BatchFailureKind }> = [];
  results.forEach((result) => {
    if (result.ok) succeeded.push(result.id);
    else failed.push({ id: result.id, kind: result.kind });
  });
  return { total: results.length, succeeded, failed };
};

const BATCH_VERB: Record<string, { one: string; many: string; failedSuffix: string }> = {
  complete: { one: 'completada', many: 'completadas', failedSuffix: 'no se pudieron completar' },
  cancel: { one: 'cancelada', many: 'canceladas', failedSuffix: 'no se pudieron cancelar' },
  reactivate: { one: 'reactivada', many: 'reactivadas', failedSuffix: 'no se pudieron reactivar' },
  trash: { one: 'movida a la papelera', many: 'movidas a la papelera', failedSuffix: 'no se pudieron mover a la papelera' },
  date: { one: 'actualizada', many: 'actualizadas', failedSuffix: 'no se pudieron actualizar' },
  time: { one: 'actualizada', many: 'actualizadas', failedSuffix: 'no se pudieron actualizar' },
  assignees: { one: 'actualizada', many: 'actualizadas', failedSuffix: 'no se pudieron actualizar' },
  priority: { one: 'actualizada', many: 'actualizadas', failedSuffix: 'no se pudieron actualizar' },
  plan: { one: 'actualizada', many: 'actualizadas', failedSuffix: 'no se pudieron actualizar' },
};

/** Feedback agregado en español. Nunca un toast por Task. */
export const formatBatchSummaryES = (verb: string, summary: BatchSummary): string => {
  const entry = BATCH_VERB[verb] ?? BATCH_VERB.date;
  const okCount = summary.succeeded.length;
  const failCount = summary.failed.length;
  const okLabel = `${okCount} ${okCount === 1 ? entry.one : entry.many}`;
  if (failCount === 0) return okLabel;
  return `${okLabel} · ${failCount} ${entry.failedSuffix}`;
};
