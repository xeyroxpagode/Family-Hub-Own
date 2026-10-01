/**
 * Planner V1 — M11 Presets/Drafts Frontend — Placeholder input view state (pure).
 *
 * Lane-owned PURE module used by the placeholder resolution UI and by the
 * lane test suite. Encapsulates:
 *  - Filtering descriptors that still need a value.
 *  - Generating the safe label list (no internal paths).
 *  - Whether the user may continue.
 */
import type { PlaceholderDescriptor, PlaceholderValue, ResolvedPlaceholders } from '../../../services/planner/plannerPlaceholderResolver';
import { isEmptyPlaceholderValue, placeholderValueKind, safePlaceholderLabel, validateResolvedPlaceholders } from '../../../services/planner/plannerPlaceholderResolver';

/** A single step the UI should surface (one placeholder at a time). */
export type PlaceholderResolutionStep = {
  readonly descriptor: PlaceholderDescriptor;
  readonly safeLabel: string;
  readonly expectedValueKind: PlaceholderValue['kind'];
};

/** All steps required to resolve, in source order. */
export function buildPlaceholderResolutionSteps(
  descriptors: readonly PlaceholderDescriptor[],
): readonly PlaceholderResolutionStep[] {
  return descriptors.map((descriptor) => ({
    descriptor,
    safeLabel: safePlaceholderLabel(descriptor),
    expectedValueKind: placeholderValueKind(descriptor.type),
  }));
}

/** True when every required placeholder has a non-empty resolved value. */
export function canAdvanceThroughPlaceholders(
  descriptors: readonly PlaceholderDescriptor[],
  resolved: ResolvedPlaceholders,
): boolean {
  return validateResolvedPlaceholders(descriptors, resolved).canContinue;
}

/** List the placeholder ids whose value was provided but is structurally empty (still required). */
export function listUnresolvedRequired(
  descriptors: readonly PlaceholderDescriptor[],
  resolved: ResolvedPlaceholders,
): readonly PlaceholderDescriptor[] {
  return descriptors.filter((descriptor) => {
    if (!descriptor.required) return false;
    const value = resolved[descriptor.id];
    return value === undefined || isEmptyPlaceholderValue(value);
  });
}

/** Static representation the test suite uses to assert no internal path leaks. */
export function auditPlaceholderLabelsForInternals(
  descriptors: readonly PlaceholderDescriptor[],
): { labelHasInternalPath: boolean } {
  const suspicious = descriptors.some((d) => {
    const label = safePlaceholderLabel(d);
    return label.includes(d.path) || /^[a-z_]+\.[a-z_]+/.test(label);
  });
  return { labelHasInternalPath: suspicious };
}

/** Value factories used by the UI to produce the typed value per kind. */
export const placeholderValueFactories = {
  text: (value: string): PlaceholderValue => ({ kind: 'text', value }),
  date: (value: string): PlaceholderValue => ({ kind: 'date', value }),
  time: (value: string): PlaceholderValue => ({ kind: 'time', value }),
  datetime: (value: string): PlaceholderValue => ({ kind: 'datetime', value }),
  person: (value: string): PlaceholderValue => ({ kind: 'person', value }),
  place: (value: string): PlaceholderValue => ({ kind: 'place', value }),
  quantity_unit: (quantity: number, unit: string): PlaceholderValue => ({
    kind: 'quantity_unit',
    value: { quantity, unit },
  }),
  duration: (minutes: number): PlaceholderValue => ({ kind: 'duration', value: { minutes } }),
  budget: (amount: number, currency: string): PlaceholderValue => ({
    kind: 'budget',
    value: { amount, currency },
  }),
  participants: (ids: string[]): PlaceholderValue => ({ kind: 'participants', value: ids }),
  area: (value: string): PlaceholderValue => ({ kind: 'area', value }),
  resource: (value: string): PlaceholderValue => ({ kind: 'resource', value }),
  option: (value: string): PlaceholderValue => ({ kind: 'option', value }),
  boolean: (value: boolean): PlaceholderValue => ({ kind: 'boolean', value }),
  number: (value: number): PlaceholderValue => ({ kind: 'number', value }),
};
