import { autosavePlannerDraft, type AutosavePlannerDraftPayload } from '../services/plannerDrafts';
import { plannerDraftAutosaveStorage } from '../storage/plannerDraftAutosaveStorage';
import type { PlannerDraft, PlannerDraftAutosaveState, PlannerDraftConflict } from '../types/plannerPresetsDrafts';

type AutosaveTransport = typeof autosavePlannerDraft;

export type PlannerDraftAutosaveCoordinatorOptions = {
  accessToken: string;
  ownerPersonId: string;
  debounceMs?: number;
  transport?: AutosaveTransport;
};

export class PlannerDraftAutosaveCoordinator {
  private accessToken: string;
  private ownerPersonId: string;
  private debounceMs: number;
  private transport: AutosaveTransport;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private cancelled = false;
  private latestLocalRevision = 0;
  private latestServerVersion: number | null = null;
  private pendingPayload: AutosavePlannerDraftPayload | null = null;
  private stateValue: PlannerDraftAutosaveState = 'local_only';
  private conflictValue: PlannerDraftConflict | null = null;

  constructor(options: PlannerDraftAutosaveCoordinatorOptions) {
    this.accessToken = options.accessToken;
    this.ownerPersonId = options.ownerPersonId;
    this.debounceMs = options.debounceMs ?? 700;
    this.transport = options.transport ?? autosavePlannerDraft;
  }

  get state() {
    return this.stateValue;
  }

  get conflict() {
    return this.conflictValue;
  }

  edit(payload: AutosavePlannerDraftPayload) {
    if (this.cancelled) return;
    this.latestLocalRevision += 1;
    this.pendingPayload = payload;
    this.stateValue = 'pending_sync';
    plannerDraftAutosaveStorage.save({
      ownerPersonId: this.ownerPersonId,
      clientDraftKey: payload.client_draft_key,
      payload,
      localRevision: this.latestLocalRevision,
      serverVersion: this.latestServerVersion,
      updatedAt: new Date().toISOString(),
    });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.flush().catch(() => {});
    }, this.debounceMs);
  }

  async flush() {
    if (this.cancelled || this.inFlight || !this.pendingPayload) return;
    const payload = this.pendingPayload;
    const requestRevision = this.latestLocalRevision;
    this.inFlight = true;
    this.stateValue = 'syncing';
    try {
      const response = await this.transport(this.accessToken, payload, {
        expectedVersion: this.latestServerVersion ?? undefined,
      });
      if (requestRevision < this.latestLocalRevision) {
        this.inFlight = false;
        void this.flush();
        return;
      }
      const draft = response.data as PlannerDraft;
      this.latestServerVersion = draft.version;
      this.pendingPayload = null;
      this.stateValue = 'synced';
      plannerDraftAutosaveStorage.remove(this.ownerPersonId, payload.client_draft_key);
    } catch (error: unknown) {
      const maybeError = error as { code?: string; statusCode?: number; response?: { data?: unknown } };
      if (maybeError?.code === 'version_conflict_v2' || maybeError?.statusCode === 412) {
        this.conflictValue = {
          localPayload: payload.payload ?? {},
          serverDraft: null,
          expectedVersion: this.latestServerVersion,
        };
        this.stateValue = 'conflict';
      } else if (!this.cancelled) {
        this.stateValue = 'pending_sync';
      }
    } finally {
      this.inFlight = false;
    }
  }

  recover(clientDraftKey: string) {
    const stored = plannerDraftAutosaveStorage.load(this.ownerPersonId, clientDraftKey);
    if (!stored) return null;
    this.latestLocalRevision = stored.localRevision;
    this.latestServerVersion = stored.serverVersion;
    this.pendingPayload = stored.payload;
    this.stateValue = 'pending_sync';
    return stored.payload;
  }

  cancel() {
    this.cancelled = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  resetForOwner(ownerPersonId: string) {
    this.cancel();
    plannerDraftAutosaveStorage.clearOwner(this.ownerPersonId);
    this.ownerPersonId = ownerPersonId;
    this.cancelled = false;
    this.latestLocalRevision = 0;
    this.latestServerVersion = null;
    this.pendingPayload = null;
    this.conflictValue = null;
    this.stateValue = 'local_only';
  }
}
