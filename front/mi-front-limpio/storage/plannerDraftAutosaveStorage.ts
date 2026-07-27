import type { AutosavePlannerDraftPayload } from '../services/plannerDrafts';

export type StoredPlannerDraftAutosave = {
  ownerPersonId: string;
  clientDraftKey: string;
  payload: AutosavePlannerDraftPayload;
  localRevision: number;
  serverVersion: number | null;
  updatedAt: string;
};

const memoryStore = new Map<string, StoredPlannerDraftAutosave>();

const keyFor = (ownerPersonId: string, clientDraftKey: string) => `${ownerPersonId}:${clientDraftKey}`;

export const plannerDraftAutosaveStorage = {
  load(ownerPersonId: string, clientDraftKey: string) {
    return memoryStore.get(keyFor(ownerPersonId, clientDraftKey)) ?? null;
  },

  save(record: StoredPlannerDraftAutosave) {
    memoryStore.set(keyFor(record.ownerPersonId, record.clientDraftKey), record);
  },

  remove(ownerPersonId: string, clientDraftKey: string) {
    memoryStore.delete(keyFor(ownerPersonId, clientDraftKey));
  },

  clearOwner(ownerPersonId: string) {
    [...memoryStore.keys()]
      .filter((key) => key.startsWith(`${ownerPersonId}:`))
      .forEach((key) => memoryStore.delete(key));
  },
};
