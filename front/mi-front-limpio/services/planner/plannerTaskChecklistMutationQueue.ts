export type PlannerChecklistItem = { text: string; checked: boolean };

export type ChecklistTaskSnapshot = {
  id: string;
  version: number;
  checklist?: PlannerChecklistItem[] | null;
};

type QueueState<TTask extends ChecklistTaskSnapshot> = {
  authoritative: TTask;
  desiredChecklist: PlannerChecklistItem[];
  pending: boolean;
};

type ChecklistQueueOptions<TTask extends ChecklistTaskSnapshot> = {
  taskId: string;
  initialTask: TTask;
  mutate: (checklist: PlannerChecklistItem[], expectedVersion: number) => Promise<TTask>;
  refresh: () => Promise<TTask>;
  onState: (state: QueueState<TTask>) => void;
  onRecoverableError: (error: unknown) => void;
};

const cloneChecklist = (items: readonly PlannerChecklistItem[] | null | undefined): PlannerChecklistItem[] =>
  (items ?? []).map((item) => ({ text: item.text, checked: item.checked }));

const sameChecklist = (left: readonly PlannerChecklistItem[], right: readonly PlannerChecklistItem[]) =>
  JSON.stringify(left) === JSON.stringify(right);

const isVersionConflict = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: unknown; code?: unknown };
  return candidate.status === 412 || candidate.code === 'version_conflict' || candidate.code === 'version_conflict_v2';
};

/**
 * Single-flight, latest-intent-wins queue for one Task checklist.
 *
 * At most one PATCH is active. A successful response advances the authoritative
 * version before the latest desired checklist is compared and, if needed, sent.
 * A real 412 gets one refresh/rebase/retry cycle; a second conflict rolls back
 * to the refreshed server state and surfaces a recoverable error.
 */
export class PlannerTaskChecklistMutationQueue<TTask extends ChecklistTaskSnapshot> {
  readonly taskId: string;
  private authoritative: TTask;
  private desiredChecklist: PlannerChecklistItem[];
  private drainPromise: Promise<void> | null = null;
  private lastError: unknown = null;

  constructor(private readonly options: ChecklistQueueOptions<TTask>) {
    this.taskId = options.taskId;
    this.authoritative = options.initialTask;
    this.desiredChecklist = cloneChecklist(options.initialTask.checklist);
  }

  setDesired(checklist: readonly PlannerChecklistItem[]) {
    this.desiredChecklist = cloneChecklist(checklist);
    this.lastError = null;
    this.emit(true);
    this.ensureDrain();
  }

  syncAuthoritative(task: TTask): boolean {
    if (task.id !== this.taskId || this.drainPromise) return false;
    this.authoritative = task;
    this.desiredChecklist = cloneChecklist(task.checklist);
    this.emit(false);
    return true;
  }

  async flush(): Promise<TTask> {
    this.ensureDrain();
    while (this.drainPromise) await this.drainPromise;
    if (this.lastError) throw this.lastError;
    return this.authoritative;
  }

  private ensureDrain() {
    if (this.drainPromise || sameChecklist(cloneChecklist(this.authoritative.checklist), this.desiredChecklist)) return;
    this.drainPromise = this.drain().finally(() => {
      this.drainPromise = null;
      if (!this.lastError && !sameChecklist(cloneChecklist(this.authoritative.checklist), this.desiredChecklist)) {
        this.ensureDrain();
      }
    });
  }

  private async drain() {
    let conflictRetries = 0;
    while (!sameChecklist(cloneChecklist(this.authoritative.checklist), this.desiredChecklist)) {
      const outgoing = cloneChecklist(this.desiredChecklist);
      try {
        this.authoritative = await this.options.mutate(outgoing, this.authoritative.version);
        conflictRetries = 0;
        this.emit(!sameChecklist(cloneChecklist(this.authoritative.checklist), this.desiredChecklist));
      } catch (error) {
        if (isVersionConflict(error) && conflictRetries < 1) {
          conflictRetries += 1;
          try {
            this.authoritative = await this.options.refresh();
            this.emit(true);
            continue;
          } catch (refreshError) {
            await this.fail(refreshError);
            return;
          }
        }
        await this.fail(error);
        return;
      }
    }
    this.emit(false);
  }

  private async fail(error: unknown) {
    try {
      this.authoritative = await this.options.refresh();
    } catch {
      // The latest confirmed response remains the safest rollback if refresh is unavailable.
    }
    this.desiredChecklist = cloneChecklist(this.authoritative.checklist);
    this.lastError = error;
    this.emit(false);
    this.options.onRecoverableError(error);
  }

  private emit(pending: boolean) {
    this.options.onState({
      authoritative: this.authoritative,
      desiredChecklist: cloneChecklist(this.desiredChecklist),
      pending,
    });
  }
}

