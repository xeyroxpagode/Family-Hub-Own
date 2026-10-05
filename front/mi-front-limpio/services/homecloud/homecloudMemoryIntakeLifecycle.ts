export type MemoryPickerEntryPath = 'gallery' | 'audio-import';

export type MemoryPickerTicket = {
  readonly attempt: number;
  readonly requestId: string;
  readonly entryPath: MemoryPickerEntryPath;
  readonly startedAt: number;
};

export type MemoryPickerSettle =
  | { readonly kind: 'current'; readonly durationMs: number }
  | { readonly kind: 'stale'; readonly durationMs: number };

/** Framework-free ownership for one native picker presentation at a time. */
export class MemoryPickerLifecycle {
  private sequence = 0;
  private current: MemoryPickerTicket | null = null;

  begin(entryPath: MemoryPickerEntryPath, now = Date.now()): MemoryPickerTicket | null {
    if (this.current !== null) return null;
    const attempt = ++this.sequence;
    const ticket = { attempt, requestId: `picker-${attempt}`, entryPath, startedAt: now };
    this.current = ticket;
    return ticket;
  }

  settle(ticket: MemoryPickerTicket, now = Date.now()): MemoryPickerSettle {
    const durationMs = Math.max(0, now - ticket.startedAt);
    if (this.current?.attempt !== ticket.attempt) return { kind: 'stale', durationMs };
    this.current = null;
    return { kind: 'current', durationMs };
  }

  invalidate(): MemoryPickerTicket | null {
    const invalidated = this.current;
    this.current = null;
    return invalidated;
  }

  active(): MemoryPickerTicket | null { return this.current; }
  isBusy(): boolean { return this.current !== null; }
}

/** Framework-free mirror of the submit guards used by the Review surface. */
export class MemoryAcceptanceLifecycle {
  private activeKey: string | null = null;
  private acceptedKey: string | null = null;

  begin(key: string): boolean {
    if (this.activeKey !== null || this.acceptedKey === key) return false;
    this.activeKey = key;
    return true;
  }

  settle(key: string, accepted: boolean): void {
    if (this.activeKey !== key) return;
    this.activeKey = null;
    this.acceptedKey = accepted ? key : null;
  }

  reset(): void { this.activeKey = null; this.acceptedKey = null; }
  isAccepting(): boolean { return this.activeKey !== null; }
  isAccepted(key: string): boolean { return this.acceptedKey === key; }
}
