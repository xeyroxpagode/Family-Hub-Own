import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, AppText, EmptyState } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import {
  buildMinimalPlanCreateWrite,
  buildPlanStructureChangesetWrite,
  hasMeaningfulPlanCreateContent,
  planCreateAdapter,
  planStructureEditAdapter,
  projectPlanDetail,
  projectPlanRootSections,
  shouldPersistPlanDraft,
  type MinimalPlanCreatePayload,
  type PlanDetailProjection,
  type PlanRootSection,
  type PlanStructureDraft,
  type PlanSummaryProjection,
} from '../../services/planner/plannerPlans';
import type { PlannerPlanGraphDto } from '../../types/PlannerPlan';

type PlansRootProps = {
  readonly plans: readonly PlanSummaryProjection[];
  readonly loading?: boolean;
  readonly onOpenPlan: (plan: PlanSummaryProjection) => void;
  readonly onCreatePlan: () => void;
  readonly onEditPlan?: (plan: PlanSummaryProjection) => void;
  readonly onRetry?: () => void;
};

type PlanDetailProps = {
  readonly graph: PlannerPlanGraphDto;
  readonly onBack: () => void;
  readonly onEditStructure: (detail: PlanDetailProjection) => void;
  readonly onAction: (actionKey: string, detail: PlanDetailProjection) => void;
  readonly reduceMotion?: boolean;
};

type MinimalCreateProps = {
  readonly initialScope?: MinimalPlanCreatePayload['scope'];
  readonly householdId?: string | null;
  readonly onSubmit: (request: ReturnType<typeof buildMinimalPlanCreateWrite>, mode: 'create' | 'draft') => void;
  readonly onCancel: () => void;
};

type StructureEditorProps = {
  readonly draft: PlanStructureDraft;
  readonly onSubmit: (request: ReturnType<typeof buildPlanStructureChangesetWrite>) => void;
  readonly onCancel: () => void;
};

export function PlannerPlansRootSurface({
  plans,
  loading = false,
  onOpenPlan,
  onCreatePlan,
  onEditPlan,
  onRetry,
}: PlansRootProps) {
  const sections = useMemo(() => projectPlanRootSections(plans), [plans]);

  if (loading) {
    return (
      <View style={styles.stateShell} accessibilityRole="progressbar" accessibilityLabel="Cargando planes">
        <AppText variant="bodySmall" tone="secondary">Cargando planes...</AppText>
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.stateShell}>
        <EmptyState
          title="Sin planes todavia"
          description="Crea un plan para organizar un objetivo en pasos, mediciones y condiciones."
          illustration={<HomePlusIcon name="flag" size={32} color={colors.terracotta[500]} />}
          actionLabel="Crear plan"
          onAction={onCreatePlan}
        />
        {onRetry ? (
          <AppButton title="Reintentar" variant="ghost" onPress={onRetry} accessibilityLabel="Reintentar cargar planes" />
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="title2">Planes</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Objetivos activos, pausados y cerrados sin archivar.
          </AppText>
        </View>
        <AppButton
          title="Crear plan"
          onPress={onCreatePlan}
          leftSlot={<HomePlusIcon name="add" size={18} color={colors.text.inverse} />}
          accessibilityLabel="Crear plan"
        />
      </View>

      {sections.map((section) => (
        <PlanRootSectionView
          key={section.key}
          section={section}
          onOpenPlan={onOpenPlan}
          onEditPlan={onEditPlan}
        />
      ))}
    </ScrollView>
  );
}

export function PlannerPlanDetailSurface({
  graph,
  onBack,
  onEditStructure,
  onAction,
  reduceMotion = false,
}: PlanDetailProps) {
  const detail = useMemo(() => projectPlanDetail(graph), [graph]);
  const motionDuration = reduceMotion ? 0 : 80;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <AppButton
            variant="icon"
            onPress={onBack}
            accessibilityLabel="Volver"
            leftSlot={<HomePlusIcon name="chevron-back" size={20} color={colors.text.secondary} />}
          />
          <View style={{ flex: 1 }}>
            <AppText variant="title2">{detail.summary.objective}</AppText>
            <AppText variant="bodySmall" tone="secondary">
              {scopeLabel(detail.summary.scope)} · {lifecycleLabel(detail.summary.lifecycle)}
            </AppText>
          </View>
        </View>

        {detail.priority.map((item) => (
          <View key={item.key} style={styles.section}>
            {item.key === 'blocker' ? (
              <PriorityBlock title="Bloqueo actual" tone="warning" body={item.value.label} />
            ) : null}
            {item.key === 'next_commitment' ? (
              <PriorityBlock title="Proximo compromiso" body={item.value.label} />
            ) : null}
            {item.key === 'current_milestone' ? (
              <PriorityBlock title="Hito actual" body={item.value.title} />
            ) : null}
            {item.key === 'actions' ? (
              <View style={styles.actionRow}>
                {item.value.map((action) => (
                  <AppButton
                    key={action.key}
                    title={action.label}
                    variant={action.destructive ? 'danger' : action.primary ? 'primary' : 'secondary'}
                    onPress={() => onAction(action.key, detail)}
                    accessibilityLabel={`${action.label} plan`}
                  />
                ))}
              </View>
            ) : null}
            {item.key === 'primary_measurement' ? (
              <PriorityBlock title="Medicion principal" body={item.value.label} />
            ) : null}
            {item.key === 'structure_access' ? (
              <AppButton
                title={item.value.label}
                variant="secondary"
                onPress={() => onEditStructure(detail)}
                accessibilityLabel="Editar estructura del plan"
                leftSlot={<HomePlusIcon name="git-branch" size={18} color={colors.text.primary} />}
              />
            ) : null}
          </View>
        ))}

        <View style={styles.section}>
          <AppText variant="title3">Indicadores</AppText>
          {detail.summary.indicators.map((indicator) => (
            <AppText
              key={indicator.key}
              variant="bodySmall"
              tone={indicator.emphasis === 'warning' ? 'warning' : 'secondary'}
              accessibilityRole="text"
            >
              {indicator.label}
            </AppText>
          ))}
        </View>

        <View style={styles.section}>
          <AppText variant="title3">Estructura</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {detail.milestones.length} hitos · {detail.measurements.length} mediciones · {detail.manualConditions.length} condiciones.
          </AppText>
          <AppText variant="caption" tone="tertiary">
            Animacion funcional: {motionDuration} ms.
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function PlannerPlanMinimalCreateSurface({
  initialScope = 'personal',
  householdId = null,
  onSubmit,
  onCancel,
}: MinimalCreateProps) {
  const [objective, setObjective] = useState('');
  const [scope, setScope] = useState<MinimalPlanCreatePayload['scope']>(initialScope);
  const [finalizationKind, setFinalizationKind] = useState<MinimalPlanCreatePayload['finalizationKind']>('none');
  const payload: MinimalPlanCreatePayload = {
    objective,
    scope,
    householdId,
    finalizationKind,
    outcome: 'activate_when_valid',
  };
  const createErrors = planCreateAdapter.validate(payload);
  const canCreate = createErrors.length === 0;
  const canDraft = shouldPersistPlanDraft({ ...payload, outcome: 'save_draft' });

  return (
    <View style={styles.content}>
      <AppText variant="title2">Nuevo plan</AppText>
      <View style={styles.section}>
        <AppText variant="bodySmall" weight="700">Objetivo</AppText>
        <TextInput
          value={objective}
          onChangeText={setObjective}
          placeholder="Que queres organizar?"
          placeholderTextColor={colors.text.muted}
          style={styles.input}
          accessibilityLabel="Objetivo del plan"
        />
      </View>
      <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel="Alcance del plan">
        {(['personal', 'household'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.segment, scope === option && styles.segmentActive]}
            onPress={() => setScope(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: scope === option }}
          >
            <AppText variant="bodySmall" tone={scope === option ? 'inverse' : 'secondary'} weight="700">
              {scopeLabel(option)}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel="Resultado de finalizacion">
        {(['none', 'date', 'event'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.segment, finalizationKind === option && styles.segmentActive]}
            onPress={() => setFinalizationKind(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: finalizationKind === option }}
          >
            <AppText variant="bodySmall" tone={finalizationKind === option ? 'inverse' : 'secondary'} weight="700">
              {finalizationLabel(option)}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.actionRow}>
        <AppButton
          title="Crear plan"
          disabled={!canCreate}
          onPress={() => onSubmit(buildMinimalPlanCreateWrite(payload), 'create')}
          accessibilityLabel="Crear plan"
        />
        <AppButton
          title="Guardar como borrador"
          variant="secondary"
          disabled={!canDraft}
          onPress={() => onSubmit(buildMinimalPlanCreateWrite({ ...payload, outcome: 'save_draft' }), 'draft')}
          accessibilityLabel="Guardar como borrador"
        />
        <AppButton title="Cancelar" variant="ghost" onPress={onCancel} accessibilityLabel="Cancelar" />
      </View>
      {!hasMeaningfulPlanCreateContent(payload) ? (
        <AppText variant="caption" tone="tertiary">
          El formulario vacio no crea un borrador persistente.
        </AppText>
      ) : null}
    </View>
  );
}

export function PlannerPlanStructureEditorSurface({
  draft,
  onSubmit,
  onCancel,
}: StructureEditorProps) {
  const errors = planStructureEditAdapter.validate(draft);
  const decision = buildPlanStructureChangesetWrite(draft);
  void onSubmit;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="title2">Editar estructura</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Cambios locales preservados hasta que Integracion conecte el guardado atomico.
            </AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="title3">Cambios</AppText>
          {draft.nodes.map((node) => (
            <View key={node.localId} style={styles.rowLine}>
              <AppText variant="bodySmall" weight="700">{node.entityType}</AppText>
              <AppText variant="caption" tone="secondary">{node.action}</AppText>
              <AppText variant="caption" tone="tertiary">
                {node.classification ?? 'supporting'}
              </AppText>
            </View>
          ))}
        </View>

        {errors.length > 0 ? (
          <View style={styles.warningBox} accessibilityRole="alert">
            {errors.map((error) => (
              <AppText key={error} variant="bodySmall" tone="warning">{error}</AppText>
            ))}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <AppButton
            title="Guardar estructura"
            disabled={errors.length > 0 || !decision.canSubmit}
            onPress={() => {}}
            accessibilityLabel="Guardar estructura del plan"
          />
          <AppButton title="Cancelar" variant="ghost" onPress={onCancel} accessibilityLabel="Cancelar" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanRootSectionView({
  section,
  onOpenPlan,
  onEditPlan,
}: {
  readonly section: PlanRootSection;
  readonly onOpenPlan: (plan: PlanSummaryProjection) => void;
  readonly onEditPlan?: (plan: PlanSummaryProjection) => void;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="title3">{section.title}</AppText>
      {section.plans.map((plan) => (
        <Pressable
          key={plan.id}
          style={styles.planRow}
          onPress={() => onOpenPlan(plan)}
          accessibilityRole="button"
          accessibilityLabel={`${plan.objective}. ${scopeLabel(plan.scope)}. ${lifecycleLabel(plan.lifecycle)}.`}
        >
          <View style={{ flex: 1, gap: spacing[1] }}>
            <AppText variant="body" weight="800">{plan.objective}</AppText>
            <AppText variant="caption" tone="secondary">
              {scopeLabel(plan.scope)} · {lifecycleLabel(plan.lifecycle)}
            </AppText>
            {plan.currentBlocker ? (
              <AppText variant="caption" tone="warning">{plan.currentBlocker.label}</AppText>
            ) : null}
            {plan.nextCommitment ? (
              <AppText variant="caption" tone="secondary">{plan.nextCommitment.label}</AppText>
            ) : null}
            {plan.currentMilestone ? (
              <AppText variant="caption" tone="secondary">Hito: {plan.currentMilestone.title}</AppText>
            ) : null}
            {plan.indicators.slice(0, 2).map((indicator) => (
              <AppText key={indicator.key} variant="caption" tone={indicator.emphasis === 'warning' ? 'warning' : 'tertiary'}>
                {indicator.label}
              </AppText>
            ))}
          </View>
          <View style={styles.rowActions}>
            {onEditPlan ? (
              <AppButton
                variant="icon"
                onPress={() => onEditPlan(plan)}
                accessibilityLabel={`Editar ${plan.objective}`}
                leftSlot={<HomePlusIcon name="create" size={18} color={colors.text.secondary} />}
              />
            ) : null}
            <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function PriorityBlock({
  title,
  body,
  tone = 'secondary',
}: {
  readonly title: string;
  readonly body: string;
  readonly tone?: 'secondary' | 'warning';
}) {
  return (
    <View style={[styles.priorityBlock, tone === 'warning' && styles.priorityWarning]}>
      <AppText variant="caption" tone={tone} weight="800">{title}</AppText>
      <AppText variant="body" tone={tone === 'warning' ? 'warning' : 'primary'} weight="700">{body}</AppText>
    </View>
  );
}

function scopeLabel(scope: MinimalPlanCreatePayload['scope']): string {
  return scope === 'household' ? 'Familiar' : 'Personal';
}

function lifecycleLabel(lifecycle: PlanSummaryProjection['lifecycle']): string {
  const labels: Record<PlanSummaryProjection['lifecycle'], string> = {
    draft: 'Borrador',
    active: 'Activo',
    paused: 'Pausado',
    completed: 'Completado',
    closed: 'Cerrado',
    trash: 'Papelera',
  };
  return labels[lifecycle];
}

function finalizationLabel(value: NonNullable<MinimalPlanCreatePayload['finalizationKind']>): string {
  if (value === 'date') return 'Fecha';
  if (value === 'event') return 'Evento final';
  return 'Sin cierre';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  content: {
    padding: spacing[5],
    paddingBottom: 96,
    gap: spacing[4],
  },
  stateShell: {
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  section: {
    gap: spacing[3],
  },
  planRow: {
    minHeight: 112,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    ...shadows.card,
  },
  rowActions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  priorityBlock: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[4],
    gap: spacing[1],
  },
  priorityWarning: {
    borderColor: colors.warning.base,
    backgroundColor: colors.warning.soft,
  },
  segmented: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    padding: spacing[1],
    flexDirection: 'row',
    gap: spacing[1],
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  segmentActive: {
    backgroundColor: colors.terracotta[500],
  },
  input: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.text.primary,
    fontSize: 16,
  },
  warningBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning.base,
    backgroundColor: colors.warning.soft,
    padding: spacing[4],
    gap: spacing[1],
  },
  rowLine: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    justifyContent: 'center',
  },
});
