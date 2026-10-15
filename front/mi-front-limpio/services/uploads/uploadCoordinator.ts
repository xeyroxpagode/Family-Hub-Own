/**
 * Product-neutral durable upload queue.
 *
 * Adapted from HomeCloud's single-owner coordinator: one queue owns execution,
 * active native cancellation is attempt-scoped, terminal jobs never auto-run,
 * and restoration keeps the caller's stable job identity.
 */
export type UploadQueueState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type UploadQueueJob = {
  jobId: string;
  queueState: UploadQueueState;
  progress: number;
  bytesSent: number;
  totalBytes: number;
};

export type UploadExecutionControls<Job extends UploadQueueJob> = {
  patch: (patch: Partial<Job>) => void;
  progress: (bytesSent: number, totalBytes: number) => void;
  registerCancel: (cancel: () => void) => void;
  isCancelled: () => boolean;
};

export type UploadCoordinatorOptions<Job extends UploadQueueJob> = {
  concurrency?: number;
  execute: (job: Job, controls: UploadExecutionControls<Job>) => Promise<Job>;
  cleanupCancelled?: (job: Job) => Promise<void>;
  onChange: (jobs: Job[]) => void;
};

export class UploadCoordinator<Job extends UploadQueueJob> {
  private jobs = new Map<string, Job>();
  private active = new Map<string, { cancelled: boolean; cancel?: () => void }>();
  private pumping = false;
  private readonly concurrency: number;

  constructor(private readonly options: UploadCoordinatorOptions<Job>) {
    this.concurrency = Math.max(1, Math.floor(options.concurrency ?? 2));
  }

  snapshot(): Job[] { return [...this.jobs.values()]; }

  restore(jobs: Job[]): void {
    this.jobs.clear();
    jobs.forEach((job) => {
      const restored = job.queueState === 'running'
        ? { ...job, queueState: 'queued' as const, progress: 0, bytesSent: 0, totalBytes: job.totalBytes || 0 }
        : job;
      this.jobs.set(restored.jobId, restored);
    });
    this.emit();
    void this.pump();
  }

  enqueue(jobs: Job[]): void {
    jobs.forEach((job) => {
      if (!this.jobs.has(job.jobId)) this.jobs.set(job.jobId, job);
    });
    this.emit();
    void this.pump();
  }

  async retry(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || (job.queueState !== 'failed' && job.queueState !== 'cancelled')) return;
    if (job.queueState === 'cancelled') {
      try { await this.options.cleanupCancelled?.(job); } catch { return; }
    }
    this.jobs.set(jobId, { ...job, queueState: 'queued', progress: 0, bytesSent: 0 } as Job);
    this.emit();
    await this.pump();
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.queueState === 'cancelled') return;
    const attempt = this.active.get(jobId);
    if (attempt) { attempt.cancelled = true; attempt.cancel?.(); }
    const cancelled = { ...job, queueState: 'cancelled', progress: 0, bytesSent: 0 } as Job;
    this.jobs.set(jobId, cancelled);
    this.emit();
    try { await this.options.cleanupCancelled?.(cancelled); } catch { /* retry repeats cleanup before requeue */ }
    finally { void this.pump(); }
  }

  remove(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || !['cancelled', 'failed'].includes(job.queueState)) return;
    this.jobs.delete(jobId);
    this.emit();
  }

  private emit(): void { this.options.onChange(this.snapshot()); }

  private patch(jobId: string, patch: Partial<Job>): void {
    const current = this.jobs.get(jobId);
    if (!current) return;
    this.jobs.set(jobId, { ...current, ...patch, ...(current.queueState === 'cancelled' ? { queueState: 'cancelled' } : {}) } as Job);
    this.emit();
  }

  private async run(jobId: string): Promise<void> {
    const initial = this.jobs.get(jobId);
    if (!initial || initial.queueState !== 'queued') return;
    const attempt = { cancelled: false, cancel: undefined as (() => void) | undefined };
    this.active.set(jobId, attempt);
    this.patch(jobId, { queueState: 'running' } as Partial<Job>);
    try {
      const current = this.jobs.get(jobId)!;
      const finished = await this.options.execute(current, {
        patch: (value) => this.patch(jobId, value),
        progress: (bytesSent, totalBytes) => {
          if (attempt.cancelled || !Number.isFinite(bytesSent) || !Number.isFinite(totalBytes) || totalBytes <= 0) return;
          const previous = this.jobs.get(jobId);
          if (!previous || bytesSent < previous.bytesSent || bytesSent > totalBytes) return;
          this.patch(jobId, { bytesSent, totalBytes, progress: Math.max(0, Math.min(1, bytesSent / totalBytes)) } as Partial<Job>);
        },
        registerCancel: (cancel) => { attempt.cancel = cancel; if (attempt.cancelled) cancel(); },
        isCancelled: () => attempt.cancelled,
      });
      if (!attempt.cancelled) this.jobs.set(jobId, { ...finished, queueState: 'completed', progress: 1 } as Job);
    } catch {
      const latest = this.jobs.get(jobId);
      if (latest && !attempt.cancelled && latest.queueState !== 'cancelled') {
        this.jobs.set(jobId, { ...latest, queueState: 'failed' } as Job);
      }
    } finally {
      this.active.delete(jobId);
      this.emit();
      void this.pump();
    }
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.active.size < this.concurrency) {
        const next = this.snapshot().find((job) => job.queueState === 'queued');
        if (!next) break;
        void this.run(next.jobId);
      }
    } finally { this.pumping = false; }
  }
}
