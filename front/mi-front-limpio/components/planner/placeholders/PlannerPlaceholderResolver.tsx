/**
 * Planner V1 — M11 Presets/Drafts Frontend — Placeholder resolution UI.
 *
 * Lane-owned. A step-by-step resolver that surfaces ONE placeholder at a
 * time with its safe label, supports back navigation preserving values, and
 * enables Continue only when all required placeholders resolve.
 *
 * Accessibility:
 *  - Reduce Motion: animation off, plain toggle (no transition). Reduced
 *    motion handling lives in the consumer; here we render plain state.
 *  - Keyboard / focus: text input has explicit accessibilityLabel.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

import { plannerStyles as S } from '../../../screens/planner/plannerShared';
import { AppText } from '../../ui/AppText';
import {
  auditPlaceholderLabelsForInternals,
  buildPlaceholderResolutionSteps,
  canAdvanceThroughPlaceholders,
  placeholderValueFactories,
} from './plannerPlaceholderResolutionViewState';
import {
  clearPlaceholderValue,
  setPlaceholderValue,
  validateResolvedPlaceholders,
  type PlaceholderDescriptor,
  type ResolvedPlaceholders,
} from '../../../services/planner/plannerPlaceholderResolver';

type Props = {
  descriptors: readonly PlaceholderDescriptor[];
  initialResolved?: ResolvedPlaceholders;
  onComplete: (resolved: ResolvedPlaceholders) => void;
  onCancel?: () => void;
};

export function PlannerPlaceholderResolver({
  descriptors,
  initialResolved,
  onComplete,
  onCancel,
}: Props) {
  const [resolved, setResolved] = useState<ResolvedPlaceholders>(initialResolved ?? {});
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => buildPlaceholderResolutionSteps(descriptors), [descriptors]);

  const audit = useMemo(() => auditPlaceholderLabelsForInternals(descriptors), [descriptors]);
  if (audit.labelHasInternalPath) {
    // Don't render with an internal path leaked — fall back to a safe cancel.
    onCancel?.();
  }

  if (steps.length === 0) {
    onComplete(resolved);
    return null;
  }

  const step = steps[stepIndex];
  const descriptor = step.descriptor;
  const value = resolved[descriptor.id];
  const currentValue =
    value !== undefined && value.kind === 'text'
      ? value.value
      : value !== undefined && (value.kind === 'date' || value.kind === 'time' || value.kind === 'datetime' || value.kind === 'person' || value.kind === 'place' || value.kind === 'area' || value.kind === 'resource' || value.kind === 'option')
      ? (value as unknown as { value: string }).value
      : '';

  const handleAdvance = () => {
    if (!value && descriptor.required) {
      const validator = validateResolvedPlaceholders(descriptors, resolved);
      const missing = validator.missingRequired.find((m) => m.id === descriptor.id);
      if (missing) return;
    }
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      if (canAdvanceThroughPlaceholders(descriptors, resolved)) {
        onComplete(resolved);
      }
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const handlePrevStepValueRemoval = () => {
    // Back navigation must preserve values (§12). Only clear the CURRENT step
    // value, not any previous one.
    setResolved((prev) => clearPlaceholderValue(prev, descriptor.id));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <AppText variant="title3" weight="700">
        {step.safeLabel}
      </AppText>
      <AppText variant="micro" tone="tertiary">
        {descriptor.required ? 'Obligatorio' : 'Opcional'} · Paso {stepIndex + 1} de {steps.length}
      </AppText>

      <TextInput
        value={currentValue === '<' ? '' : currentValue}
        onChangeText={(text) => {
          // Text-mediated entry for the supported text-like kinds.
          setResolved((prev) =>
            setPlaceholderValue(prev, descriptor.id, placeholderValueFactories.text(text) as never, {
              force: true,
            }),
          );
        }}
        accessibilityLabel={step.safeLabel}
        style={inputStyle}
      />

      <View style={{ flexDirection: 'row', marginTop: 24 }}>
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          disabled={stepIndex === 0}
        >
          <AppText variant="body" tone={stepIndex === 0 ? 'muted' : 'tertiary'}>
            Volver
          </AppText>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handlePrevStepValueRemoval}
          accessibilityRole="button"
          accessibilityLabel="Limpiar este campo"
        >
          <AppText variant="body" tone="tertiary">
            Limpiar
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAdvance}
          accessibilityRole="button"
          accessibilityLabel="Continuar"
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: '#2B6CB0',
            borderRadius: 16,
            marginLeft: 12,
          }}
        >
          <AppText variant="bodySmall" tone="inverse" weight="700">
            {stepIndex === steps.length - 1 ? 'Confirmar' : 'Continuar'}
          </AppText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const inputStyle = {
  marginTop: 12,
  borderColor: '#D0D7DE',
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 10,
};
