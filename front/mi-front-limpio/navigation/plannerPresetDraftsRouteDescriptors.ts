/**
 * Planner V1 — M11 Presets/Drafts Frontend — Route descriptors & integration adapters.
 *
 * Lane-owned. This module is the SINGLE public surface Integration consumes:
 *
 *   · Route descriptors for the Presets/Drafts lane screens.
 *   · Adapter contract from a Preset/Draft user gesture into the EXISTING
 *     integrated form open intents (Task/Event/Plan create forms), prefixed
 *     with `preset_drafts_lane` so the form host can attribute the source.
 *
 * Compliance:
 *   · Does NOT register any route in the global navigator directly. The
 *     navigator is Integration-owned; the lane publishes descriptors only.
 *   · Does NOT modify the shared `plannerSheetState` kinds enum nor the shared
 *     navigation source enum. We reuse the existing `OPEN_TASK/OPEN_EVENT/
 *     OPEN_PLAN` events with `'unknown'` source — the canonical enum's safe
 *     fallback.
 *   · The lane emits the Integration Requests listed in the report so the
 *     global wiring can plug these surfaces in when Integration authorizes
 *     them.
 */
import type {
  PlannerPreset,
  PlannerPresetSource,
  PlannerTemplateEntityType,
} from '../types/plannerPresetsDrafts';
import type {
  PresetApplicationResult,
} from '../services/planner/plannerPresetAdapters';
import type { DraftApplicationResult } from '../services/planner/plannerDraftAdapters';
import { ROUTE_NAMES, type PlannerNavigationSource } from './plannerNavigationContract';

/** Public route descriptor for a Presets/Drafts lane screen. */
export type PlannerPresetDraftsRouteDescriptor = {
  readonly routeName: typeof ROUTE_NAMES.PresetLibrary;
  readonly label: string;
  /**
   * The lane declares where the route MAY be wired. Integration decides the
   * final location; the lane does not.
   */
  readonly suggestedEntry: 'planner_overflow' | 'planner_route' | 'quick_action_extension';
  /** Source attribution the integrated form receives when a Preset/Draft gesture opens it. */
  readonly attributionSource: PlannerNavigationSource;
};

const PRESET_LIBRARY_DESCRIPTOR: PlannerPresetDraftsRouteDescriptor = {
  routeName: ROUTE_NAMES.PresetLibrary,
  label: 'Biblioteca de presets',
  suggestedEntry: 'planner_overflow',
  attributionSource: 'unknown',
};

/**
 * An integrated form open request emitted by the lane. The form host (which is
 * Integration-owned) consumes this and turns it into the canonical
 * `OPEN_TASK`/`OPEN_EVENT`/`OPEN_PLAN` sheet event with:
 *   source: 'unknown'  (preserves the closed enum — lane never invents a source)
 *   initialDueDate / initialDate mapped from the preset's compatible prefill.
 */
export type PresetDraftsFormOpenRequest =
  | {
      kind: 'task';
      source: PlannerNavigationSource;
      initialDueDate?: string;
      /** Stable correlation ID linking the open request back to the lane intent. */
      laneCorrelationId: string;
      /** Carries source preset id/revision ONLY when the contract demands it. */
      sourcePresetId?: string;
      sourcePresetRevisionId?: string;
    }
  | {
      kind: 'event';
      source: PlannerNavigationSource;
      initialDate?: string;
      laneCorrelationId: string;
      sourcePresetId?: string;
      sourcePresetRevisionId?: string;
    }
  | {
      kind: 'plan';
      source: PlannerNavigationSource;
      laneCorrelationId: string;
      sourcePresetId?: string;
      sourcePresetRevisionId?: string;
    };

/** Produce the integrated form open request from a Preset application result. */
export function presetApplicationToFormOpenRequest(
  application: PresetApplicationResult,
  preset: PlannerPreset,
  options: { laneCorrelationId: string; preserveSourceReference?: boolean },
): PresetDraftsFormOpenRequest {
  const base = {
    source: PRESET_LIBRARY_DESCRIPTOR.attributionSource,
    laneCorrelationId: options.laneCorrelationId,
    ...(options.preserveSourceReference
      ? { sourcePresetId: preset.id, sourcePresetRevisionId: preset.active_revision_id ?? undefined }
      : {}),
  };
  if (application.entityKind === 'task') {
    const prefill = application.compatiblePrefill as { kind: 'task'; initialDueDate?: string };
    return { ...base, kind: 'task', initialDueDate: prefill.initialDueDate };
  }
  if (application.entityKind === 'event') {
    const prefill = application.compatiblePrefill as { kind: 'event'; initialDate?: string };
    return { ...base, kind: 'event', initialDate: prefill.initialDate };
  }
  return { ...base, kind: 'plan' };
}

/** Produce the integrated form open request from a Draft activation result. */
export function draftApplicationToFormOpenRequest(
  application: DraftApplicationResult,
  sourcePresetId: string | null,
  sourcePresetRevisionId: string | null,
  options: { laneCorrelationId: string; preserveSourceReference?: boolean },
): PresetDraftsFormOpenRequest {
  const base = {
    source: PRESET_LIBRARY_DESCRIPTOR.attributionSource,
    laneCorrelationId: options.laneCorrelationId,
    ...(options.preserveSourceReference
      ? { sourcePresetId: sourcePresetId ?? undefined, sourcePresetRevisionId: sourcePresetRevisionId ?? undefined }
      : {}),
  };
  if (application.entityKind === 'task') {
    const prefill = application.compatiblePrefill as { kind: 'task'; title?: string; instructions?: string; category?: string };
    void prefill; // task form accepts only initialDueDate as prefill today
    return { ...base, kind: 'task' };
  }
  if (application.entityKind === 'event') {
    const prefill = application.compatiblePrefill as { kind: 'event'; title?: string; category?: string };
    void prefill;
    return { ...base, kind: 'event' };
  }
  return { ...base, kind: 'plan' };
}

/** List of route lane-owned descriptors consumed by Integration. */
export const PLANNER_PRESET_DRAFTS_ROUTES: readonly PlannerPresetDraftsRouteDescriptor[] = [
  PRESET_LIBRARY_DESCRIPTOR,
];

/**
 * Stable correlation id generator for lane gestures (so a preset apply /
 * draft resume gesture is attributable without leaking internal data).
 */
export function createLaneCorrelationId(kind: 'preset_apply' | 'draft_resume'): string {
  const salt = Math.random().toString(36).slice(2, 10);
  return `planner.${kind}.${Date.now()}.${salt}`;
}

/** Highest-level public adapter used by Integration to verify the lane's surface. */
export const presetDraftsLaneExtension = {
  routes: PLANNER_PRESET_DRAFTS_ROUTES,
  /** Capability gate name the backend exposes. */
  requiredCapabilities: ['planner.templates.use', 'planner.templates.manage'] as const,
  /**
   * Audit: tells Integration whether the preset source should expose edit.
   * HomePlus originals are read-only.
   */
  canEditSource(source: PlannerPresetSource): boolean {
    return source !== 'homeplus';
  },
  /** Audit: tells Integration whether a kind is supported by the lane. */
  supportsKind(kind: PlannerTemplateEntityType): boolean {
    return kind === 'task' || kind === 'event' || kind === 'plan';
  },
};
