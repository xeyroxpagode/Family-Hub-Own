/** Compatibility queue facade. Execution belongs exclusively to the coordinator. */
import { createUploadJob } from './homecloudUploadJob';
import { ensureUploadCoordinator, __resetUploadCoordinatorsForTests, type UploadCoordinator } from './homecloudUploadCoordinator';
import type { UploadIntakeContext, UploadJob, UploadLocalArtifact } from './homecloudUploadTypes';
import type { UploadJobStore } from '../../storage/homecloudUploadJobStorage';

export interface SharedQueueDeps { store: UploadJobStore; run: (jobId: string) => Promise<UploadJob>; householdId: string; cancelActiveUpload?: (jobId: string) => void; cleanupTerminalArtifact?: (artifact: UploadLocalArtifact) => Promise<unknown>; }
export interface SharedUploadQueue { readonly householdId: string; enqueue(ctx: UploadIntakeContext, artifact: UploadLocalArtifact): Promise<UploadJob>; pump(): Promise<void>; cancelJob(jobId: string): Promise<UploadJob | null>; getCurrentJob(): UploadJob | null; getQueue(): UploadJob[]; subscribe(listener: () => void): () => void; }
function persist(store: UploadJobStore, job: UploadJob): Promise<void> { const asyncStore = store as UploadJobStore & { putAsync?: (value: UploadJob) => Promise<void> }; return typeof asyncStore.putAsync === 'function' ? asyncStore.putAsync(job) : Promise.resolve(store.put(job)); }
function current(coordinator: UploadCoordinator): UploadJob | null { const state = coordinator.getSnapshot(); return (state.activeJobId ? state.jobs.find((job) => job.id === state.activeJobId) : null) ?? state.jobs[0] ?? null; }
export function createSharedUploadQueue(deps: SharedQueueDeps): SharedUploadQueue {
  const coordinator = ensureUploadCoordinator(deps);
  return {
    householdId: deps.householdId,
    async enqueue(ctx, artifact) { const job = createUploadJob(deps.householdId, ctx, artifact); await persist(deps.store, job); coordinator.notifyJob(); void coordinator.requestPump('enqueue'); return deps.store.get(job.id) ?? job; },
    pump: () => coordinator.requestPump('pump'), cancelJob: (id) => coordinator.cancel(id), getCurrentJob: () => current(coordinator), getQueue: () => coordinator.getSnapshot().jobs,
    subscribe(listener) { return coordinator.subscribe(() => listener()); },
  };
}
export function __resetSharedUploadQueueForTests(): void { __resetUploadCoordinatorsForTests(); }
export function listQueueJobs(store: UploadJobStore, householdId: string): UploadJob[] { return store.all().filter((j) => j.householdId === householdId && j.state !== 'completed' && j.state !== 'cancelled').sort((a, b) => a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt)); }
export function nextEligibleJob(store: UploadJobStore, householdId: string): UploadJob | null { return listQueueJobs(store, householdId)[0] ?? null; }
export function isQueueEligibleJob(job: UploadJob, householdId: string): boolean { return job.householdId === householdId && job.state !== 'completed' && job.state !== 'cancelled'; }
