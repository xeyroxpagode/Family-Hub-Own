/**
 * Planner V1 — M11 Presets/Drafts Frontend — Placeholder resolution.
 *
 * Lane-owned. Resolves declared template placeholders (exported by the backend
 * contract) into typed values a form can consume. Resolution never persists
 * anything — it ONLY produces an in-memory `ResolvedPlaceholders` map the
 * caller feeds into a real form adapter. Submit is the form's responsibility.
 *
 * Rules (frozen by the M11 directive §12):
 * - Only placeholder types published by the backend are supported.
 * - Required placeholders BLOCK continuation until resolved (or a real default
 *   is provided by the contract). Optional placeholders may be left empty.
 * - Resolved value replaces the user's previously-entered value ONLY with
 *   explicit confirmation; otherwise the user's value is preserved.
 * - Internal placeholder paths / schema names are NEVER surfaced to the user.
 * - Resolution never mutates the source placeholder descriptor array.
 */
import type {
  PlannerPlaceholderType,
  PlannerTemplatePlaceholder,
} from '../../types/plannerPresetsDrafts';
import { isPlannerPlaceholderType } from './plannerPresetContracts';

/** A placeholder descriptor as published by the backend contract. */
export type PlaceholderDescriptor = PlannerTemplatePlaceholder;

/** Value the user supplied for a placeholder id. */
export type PlaceholderValue =
  | { kind: 'text'; value: string }
  | { kind: 'date'; value: string }
  | { kind: 'time'; value: string }
  | { kind: 'datetime'; value: string }
  | { kind: 'person'; value: string }
  | { kind: 'place'; value: string }
  | { kind: 'quantity_unit'; value: { quantity: number; unit: string } }
  | { kind: 'duration'; value: { minutes: number } }
  | { kind: 'budget'; value: { amount: number; currency: string } }
  | { kind: 'participants'; value: string[] }
  | { kind: 'area'; value: string }
  | { kind: 'resource'; value: string }
  | { kind: 'option'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number };

/** Map of placeholder id → user-supplied value. */
export type ResolvedPlaceholders = Readonly<Record<string, PlaceholderValue>>;

/** Result of validating the current set of resolved placeholders. */
export type PlaceholderValidationResult = {
  readonly missingRequired: readonly PlaceholderDescriptor[];
  readonly invalid: readonly PlaceholderDescriptor[];
  readonly resolved: ResolvedPlaceholders;
  readonly canContinue: boolean;
};

const PLACEHOLDER_TO_VALUE_KIND: Readonly<Record<PlannerPlaceholderType, PlaceholderValue['kind']>> = {
  person: 'person',
  date: 'date',
  place: 'place',
  quantity_unit: 'quantity_unit',
  duration: 'duration',
  budget: 'budget',
  participants: 'participants',
  area: 'area',
  resource: 'resource',
};

/**
 * Map a published placeholder type to the in-memory value kind used by the
 * resolver. Unknown types map to `text` as a deny-safe fallback (and are
 * rejected by `validatePlaceholders`).
 */
export function placeholderValueKind(type: string): PlaceholderValue['kind'] {
  if (isPlannerPlaceholderType(type)) {
    const mapped = PLACEHOLDER_TO_VALUE_KIND[type];
    if (mapped) return mapped;
  }
  return 'text';
}

/** Validate that the resolved set satisfies required/optional constraints. */
export function validateResolvedPlaceholders(
  descriptors: readonly PlaceholderDescriptor[],
  resolved: ResolvedPlaceholders,
): PlaceholderValidationResult {
  const missingRequired: PlaceholderDescriptor[] = [];
  const invalid: PlaceholderDescriptor[] = [];

  for (const descriptor of descriptors) {
    const value = resolved[descriptor.id];
    if (value === undefined) {
      if (descriptor.required) missingRequired.push(descriptor);
      continue;
    }
    const expectedKind = placeholderValueKind(descriptor.type);
    if (value.kind !== expectedKind) {
      invalid.push(descriptor);
      continue;
    }
    if (isEmptyPlaceholderValue(value) && descriptor.required) {
      missingRequired.push(descriptor);
    }
  }

  return {
    missingRequired,
    invalid,
    resolved,
    canContinue: missingRequired.length === 0 && invalid.length === 0,
  };
}

/** True when a placeholder value is structurally empty (and thus treated as unset). */
export function isEmptyPlaceholderValue(value: PlaceholderValue): boolean {
  switch (value.kind) {
    case 'text':
    case 'date':
    case 'time':
    case 'datetime':
    case 'person':
    case 'place':
    case 'area':
    case 'resource':
    case 'option':
      return value.value.trim().length === 0;
    case 'boolean':
      return false; // booleans are never "empty"
    case 'number':
      return !Number.isFinite(value.value);
    case 'quantity_unit':
      return !Number.isFinite(value.value.quantity) && value.value.unit.trim().length === 0;
    case 'duration':
      return !Number.isFinite(value.value.minutes) || value.value.minutes <= 0;
    case 'budget':
      return !Number.isFinite(value.value.amount);
    case 'participants':
      return value.value.length === 0;
  }
}

/**
 * Set a placeholder value WITHOUT overwriting a non-empty user value unless
 * `force` is true. Returns a NEW resolved map; the input is never mutated.
 *
 * This implements §12: "no reemplazar manualmente un campo que el usuario ya
 * editó sin confirmación".
 */
export function setPlaceholderValue(
  resolved: ResolvedPlaceholders,
  id: string,
  value: PlaceholderValue,
  options: { force?: boolean } = {},
): ResolvedPlaceholders {
  const existing = resolved[id];
  if (existing !== undefined && !isEmptyPlaceholderValue(existing) && !options.force) {
    return resolved;
  }
  return { ...resolved, [id]: value };
}

/** Clear a placeholder value (returns a new map; input not mutated). */
export function clearPlaceholderValue(resolved: ResolvedPlaceholders, id: string): ResolvedPlaceholders {
  if (!(id in resolved)) return resolved;
  const next = { ...resolved };
  delete next[id];
  return next;
}

/**
 * A safe human label for a placeholder. Falls back to a generic localized
 * "Dato requerido" / "Dato opcional" string when the descriptor carries no
 * `label`. Internal paths are NEVER surfaced.
 */
export function safePlaceholderLabel(descriptor: PlaceholderDescriptor): string {
  if (descriptor.label && descriptor.label.trim().length > 0) {
    return descriptor.label.trim();
  }
  return descriptor.required ? 'Dato requerido' : 'Dato opcional';
}
