export type PlannerTemplateEntityType = 'task' | 'event' | 'plan';
export type PlannerPresetSource = 'homeplus' | 'personal' | 'household';
export type PlannerDraftIntendedScope = 'personal' | 'household';
export type PlannerRevisionState = 'draft' | 'published' | 'superseded';

export type PlannerPlaceholderType =
  | 'person'
  | 'date'
  | 'place'
  | 'quantity_unit'
  | 'duration'
  | 'budget'
  | 'participants'
  | 'area'
  | 'resource';

export type PlannerTemplatePlaceholder = {
  id: string;
  type: PlannerPlaceholderType;
  path: string;
  required: boolean;
  label?: string;
  constraints?: Record<string, unknown>;
};

export type PlannerPayloadEnvelope<TPayload = Record<string, unknown>> = {
  entity_type: PlannerTemplateEntityType;
  adapter_key: string;
  payload_schema: 'planner.template_payload';
  payload_version: number;
  payload: TPayload;
};

export type PlannerPresetRevision<TPayload = Record<string, unknown>> = {
  id: string;
  preset_id: string;
  revision_number: number;
  revision_state: PlannerRevisionState;
  adapter_key: string;
  payload_schema: string;
  payload_version: number;
  payload: TPayload;
  structural_fingerprint: string;
  version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type PlannerPreset<TPayload = Record<string, unknown>> = {
  id: string;
  entity_type: PlannerTemplateEntityType;
  source: PlannerPresetSource;
  owner_person_id: string | null;
  household_id: string | null;
  name: string;
  active_revision_id: string | null;
  version: number;
  trashed_at: string | null;
  retention_expires_at: string | null;
  planner_preset_revisions?: PlannerPresetRevision<TPayload>[];
  created_at: string;
  updated_at: string;
};

export type PlannerDraft<TPayload = Record<string, unknown>> = {
  id: string;
  client_draft_key: string;
  entity_type: PlannerTemplateEntityType;
  owner_person_id: string;
  intended_scope: PlannerDraftIntendedScope;
  intended_household_id: string | null;
  source_preset_id: string | null;
  source_preset_revision_id: string | null;
  adapter_key: string;
  payload_schema: string;
  payload_version: number;
  payload: TPayload;
  content_fingerprint: string;
  version: number;
  last_autosaved_at: string;
  trashed_at: string | null;
  retention_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannerDraftAutosaveState =
  | 'local_only'
  | 'pending_sync'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'trashed_pending_sync';

export type PlannerDraftConflict<TPayload = Record<string, unknown>> = {
  localPayload: TPayload;
  serverDraft: PlannerDraft<TPayload> | null;
  expectedVersion: number | null;
};
