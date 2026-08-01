import type { PlannerClock } from './types';
import type { PlannerOperationQueue } from './operationQueue';

export class PlannerOperationScheduler {
  private handle: unknown = null;
  private running = false;
  private draining = false;

  constructor(
    private readonly queue: PlannerOperationQueue,
    private readonly clock: PlannerClock = { now: () => new Date(), setTimeout, clearTimeout },
    private readonly intervalMs = 1_000,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.schedule(0);
  }

  stop(): void {
    this.running = false;
    if (this.handle && this.clock.clearTimeout) this.clock.clearTimeout(this.handle);
    this.handle = null;
  }

  triggerReconnect(): void {
    if (!this.running) return;
    if (this.handle && this.clock.clearTimeout) this.clock.clearTimeout(this.handle);
    this.schedule(0);
  }

  private schedule(delayMs: number): void {
    if (!this.clock.setTimeout) return;
    this.handle = this.clock.setTimeout(async () => {
      try {
        if (!this.draining) {
          this.draining = true;
          try {
            await this.queue.drain();
            await this.queue.cleanupConfirmed();
          } finally {
            this.draining = false;
          }
        }
      } finally {
        if (this.running) this.schedule(this.intervalMs);
      }
    }, delayMs);
  }
}
