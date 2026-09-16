'use strict';

class PlannerDraftAutosaveCoordinator {
  constructor({ ownerPersonId, transport, debounceMs = 25, retryDelayMs = 25 }) {
    this.ownerPersonId = ownerPersonId;
    this.transport = transport;
    this.debounceMs = debounceMs;
    this.retryDelayMs = retryDelayMs;
    this.timer = null;
    this.inFlight = false;
    this.cancelled = false;
    this.state = 'local_only';
    this.localRevision = 0;
    this.serverVersion = null;
    this.pendingPayload = null;
    this.localStore = new Map();
    this.conflict = null;
    this.activityCount = 0;
  }

  edit(payload) {
    if (this.cancelled) return;
    this.localRevision += 1;
    this.pendingPayload = payload;
    this.state = 'pending_sync';
    this.localStore.set(`${this.ownerPersonId}:${payload.client_draft_key}`, {
      payload,
      localRevision: this.localRevision,
      serverVersion: this.serverVersion,
    });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush().catch(() => {}), this.debounceMs);
  }

  async flush() {
    if (this.cancelled || this.inFlight || !this.pendingPayload) return;
    const payload = this.pendingPayload;
    const requestRevision = this.localRevision;
    this.inFlight = true;
    this.state = 'syncing';
    try {
      const response = await this.transport(payload, { expectedVersion: this.serverVersion });
      if (requestRevision < this.localRevision) {
        this.inFlight = false;
        return this.flush();
      }
      this.serverVersion = response.version ?? response.draft?.version ?? response.data?.version ?? this.serverVersion;
      this.pendingPayload = null;
      this.state = 'synced';
      this.localStore.delete(`${this.ownerPersonId}:${payload.client_draft_key}`);
    } catch (error) {
      if (error?.code === 'version_conflict_v2' || error?.statusCode === 412) {
        this.conflict = {
          localPayload: payload.payload,
          serverDraft: error.serverDraft ?? null,
          expectedVersion: this.serverVersion,
        };
        this.state = 'conflict';
      } else if (!this.cancelled) {
        this.state = 'pending_sync';
        this.timer = setTimeout(() => this.flush().catch(() => {}), this.retryDelayMs);
      }
    } finally {
      this.inFlight = false;
    }
  }

  recover(clientDraftKey) {
    const record = this.localStore.get(`${this.ownerPersonId}:${clientDraftKey}`);
    if (!record) return null;
    this.pendingPayload = record.payload;
    this.localRevision = record.localRevision;
    this.serverVersion = record.serverVersion;
    this.state = 'pending_sync';
    return record.payload;
  }

  markTrashedPendingSync() {
    this.state = 'trashed_pending_sync';
  }

  cancel() {
    this.cancelled = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  switchOwner(ownerPersonId) {
    this.cancel();
    for (const key of [...this.localStore.keys()]) {
      if (key.startsWith(`${this.ownerPersonId}:`)) this.localStore.delete(key);
    }
    this.ownerPersonId = ownerPersonId;
    this.cancelled = false;
    this.state = 'local_only';
    this.localRevision = 0;
    this.serverVersion = null;
    this.pendingPayload = null;
    this.conflict = null;
  }
}

module.exports = {
  PlannerDraftAutosaveCoordinator,
};
