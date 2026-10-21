import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import {
  createAssetsIntent,
  mutations,
  type AssetDto,
  type CareDatePrecision,
  type ManualCareDto,
  type AssetsFailure,
  type AssetsMutationIntent,
} from '../../services/assets';
import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';
import { colors, radius } from '../../constants/theme';
import { AssetFormSheet, AssetConfirmSheet } from './AssetSheet';
import { AssetsFailureBar } from './ErrorBar';
import { AssetFilesSection } from './AssetFilesSection';
import { useHomeCloudCapabilities } from '../../services/homecloud/useHomeCloudCapabilities';
import { HomeCloudFileViewer } from '../../screens/HomeCloudFileViewerScreen';
import {
  toHomeCloudFileProjection,
  type AssetFileRelation,
} from '../../services/assets/assetsFiles';
import { DatePickerSheet } from '../ui/ActionSheet';

const PRECISIONS: { key: CareDatePrecision; label: string }[] = [
  { key: 'exact', label: 'Fecha exacta' },
  { key: 'month_year', label: 'Mes y año' },
  { key: 'year', label: 'Sólo el año' },
  { key: 'unknown', label: 'No sé cuándo' },
];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const YEARS = (() => {
  const current = new Date().getFullYear();
  const list: number[] = [];
  for (let year = current; year >= current - 60; year -= 1) list.push(year);
  return list;
})();

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

type CareDraft = {
  description: string;
  date_precision: CareDatePrecision;
  occurred_on: string;
  occurred_year: number | null;
  occurred_month: number | null;
  provider: string;
  notes: string;
};

const draftFromCare = (care: ManualCareDto): CareDraft => ({
  description: care.description,
  date_precision: care.date_precision,
  occurred_on: care.occurred_on ?? '',
  occurred_year: care.occurred_year ?? new Date().getFullYear(),
  occurred_month: care.occurred_month ?? new Date().getMonth() + 1,
  provider: care.provider ?? '',
  notes: care.notes ?? '',
});

const emptyDraft = (): CareDraft => ({
  description: '',
  date_precision: 'exact',
  occurred_on: toISODate(new Date()),
  occurred_year: new Date().getFullYear(),
  occurred_month: new Date().getMonth() + 1,
  provider: '',
  notes: '',
});

function CareFormFields({
  draft,
  setDraft,
  descriptionError,
}: {
  draft: CareDraft;
  setDraft: React.Dispatch<React.SetStateAction<CareDraft>>;
  descriptionError: string | null;
}) {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <>
      <AppInput
        label="Qué pasó"
        value={draft.description}
        onChangeText={(text) => setDraft((c) => ({ ...c, description: text }))}
        placeholder="Ej: Vacuna anual en la veterinaria"
        variant="multiline"
        errorText={descriptionError ?? undefined}
        accessibilityLabel="Descripción del care"
      />

      <View style={styles.group}>
        <AppText variant="caption" weight="700" tone="secondary">
          Cuándo pasó
        </AppText>
        <View style={styles.precisionRow}>
          {PRECISIONS.map((precision) => (
            <InteractivePressable
              key={precision.key}
              accessibilityRole="button"
              accessibilityLabel={precision.label}
              accessibilityState={{ selected: draft.date_precision === precision.key }}
              onPress={() => setDraft((c) => ({ ...c, date_precision: precision.key }))}
              haptic="light"
              pressScale={0.98}
              style={[
                styles.precisionChip,
                draft.date_precision === precision.key && styles.precisionChipSelected,
              ]}
            >
              <AppText variant="caption" weight="600">
                {precision.label}
              </AppText>
            </InteractivePressable>
          ))}
        </View>

        {draft.date_precision === 'exact' ? (
          <>
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={`Fecha: ${draft.occurred_on}`}
              onPress={() => setShowCalendar(true)}
              haptic="light"
              pressScale={0.98}
              style={styles.pickerRow}
            >
              <AppText variant="bodySmall" weight="600" style={{ flex: 1 }}>
                {draft.occurred_on
                  ? (() => {
                      const [y, m, d] = draft.occurred_on.split('-').map(Number);
                      return `${String(d).padStart(2, '0')} ${MONTHS[(m ?? 1) - 1]} ${y}`;
                    })()
                  : 'Elegir fecha'}
              </AppText>
              <AppText variant="caption" tone="tertiary">Cambiar</AppText>
            </InteractivePressable>
            <DatePickerSheet
              visible={showCalendar}
              value={draft.occurred_on || toISODate(new Date())}
              onClose={() => setShowCalendar(false)}
              onConfirm={(value) => {
                setDraft((c) => ({ ...c, occurred_on: value }));
                setShowCalendar(false);
              }}
            />
          </>
        ) : null}

        {draft.date_precision === 'month_year' || draft.date_precision === 'year' ? (
          <View style={styles.wheelRow}>
            {draft.date_precision === 'month_year' ? (
              <Wheel
                values={MONTHS.map((_, index) => index + 1)}
                label={(value) => MONTHS[value - 1]}
                selected={draft.occurred_month ?? 1}
                onSelect={(month) => setDraft((c) => ({ ...c, occurred_month: month }))}
                accessibilityLabel="Mes"
              />
            ) : null}
            <Wheel
              values={YEARS}
              label={(value) => String(value)}
              selected={draft.occurred_year ?? new Date().getFullYear()}
              onSelect={(year) => setDraft((c) => ({ ...c, occurred_year: year }))}
              accessibilityLabel="Año"
            />
          </View>
        ) : (
          <AppText variant="caption" tone="tertiary">
            El care queda registrado sin fecha. Podés corregirlo después.
          </AppText>
        )}
      </View>

      <AppInput
        label="Quién lo hizo (opcional)"
        value={draft.provider}
        onChangeText={(text) => setDraft((c) => ({ ...c, provider: text }))}
        placeholder="Ej: Veterinaria del centro"
        accessibilityLabel="Proveedor"
      />
      <AppInput
        label="Notas (opcional)"
        value={draft.notes}
        onChangeText={(text) => setDraft((c) => ({ ...c, notes: text }))}
        variant="multiline"
        accessibilityLabel="Notas"
      />
    </>
  );
}

function Wheel({
  values,
  label,
  selected,
  onSelect,
  accessibilityLabel,
}: {
  values: number[];
  label: (value: number) => string;
  selected: number;
  onSelect: (value: number) => void;
  accessibilityLabel: string;
}) {
  return (
    <ScrollView
      style={styles.wheel}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
    >
      {values.map((value) => (
        <InteractivePressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={label(value)}
          accessibilityState={{ selected: selected === value }}
          onPress={() => onSelect(value)}
          haptic="light"
          pressScale={0.98}
          style={[styles.wheelItem, selected === value && styles.wheelItemSelected]}
        >
          <AppText
            variant="bodySmall"
            weight={selected === value ? '700' : '500'}
            tone={selected === value ? 'brand' : 'primary'}
          >
            {label(value)}
          </AppText>
        </InteractivePressable>
      ))}
    </ScrollView>
  );
}

// ── O16 Crear Care ───────────────────────────────────────────────────────────

export function AssetCareCreateSheet({
  visible,
  asset,
  onRequestClose,
  onCreated,
}: {
  visible: boolean;
  asset: AssetDto | null;
  onRequestClose: () => void;
  onCreated: (care: ManualCareDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [draft, setDraft] = useState<CareDraft>(emptyDraft);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [intent, setIntent] = useState<AssetsMutationIntent | undefined>(undefined);

  React.useEffect(() => {
    if (visible) {
      setDraft(emptyDraft());
      setPending(false);
      setFailure(null);
      setAttempted(false);
      setDirty(false);
      setConfirmDiscard(false);
      setIntent(undefined);
    }
  }, [visible]);

  const requestClose = () => {
    if (pending) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onRequestClose();
  };

  const descriptionError =
    attempted && draft.description.trim().length === 0 ? 'Contanos qué pasó.' : null;

  const submit = async () => {
    if (!accessToken || !householdId || !asset || pending) return;
    setAttempted(true);
    if (draft.description.trim().length === 0) return;
    setPending(true);
    setFailure(null);
    const activeIntent = intent ?? createAssetsIntent('care.create');
    if (!intent) setIntent(activeIntent);
    const outcome = await mutations.createCare(
      accessToken,
      householdId,
      {
        asset_id: asset.id,
        description: draft.description.trim(),
        date_precision: draft.date_precision,
        ...(draft.date_precision === 'exact' && draft.occurred_on
          ? { occurred_on: draft.occurred_on }
          : {}),
        ...(draft.date_precision === 'month_year'
          ? { occurred_year: draft.occurred_year, occurred_month: draft.occurred_month }
          : {}),
        ...(draft.date_precision === 'year' ? { occurred_year: draft.occurred_year } : {}),
        ...(draft.provider.trim() ? { provider: draft.provider.trim() } : {}),
        ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
      },
      { intent: activeIntent },
    );
    setPending(false);
    if (outcome.ok) {
      setDirty(false);
      onCreated(outcome.data.care);
      return;
    }
    setFailure(outcome.failure);
  };

  return (
    <AssetFormSheet
      visible={visible}
      title="Registrar algo que pasó"
      subtitle={asset?.name}
      onRequestClose={requestClose}
      closeDisabled={pending}
      footer={
        <View style={styles.footer}>
          <AssetsFailureBar failure={failure} onRetry={() => void submit()} />
          <AppButton
            title={pending ? 'Guardando…' : 'Guardar'}
            onPress={() => void submit()}
            loading={pending}
            accessibilityLabel="Registrar care"
          />
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.form}>
        <CareFormFields draft={draft} setDraft={(updater) => {
          setDirty(true);
          setDraft(updater);
        }} descriptionError={descriptionError} />
      </ScrollView>

      {confirmDiscard ? (
        <View style={styles.discard}>
          <AppText variant="bodySmall" tone="secondary">
            Tenés cambios sin guardar. Si salís ahora, se pierden.
          </AppText>
          <View style={styles.discardActions}>
            <AppButton variant="secondary" size="sm" title="Seguir editando" onPress={() => setConfirmDiscard(false)} />
            <AppButton
              variant="danger"
              size="sm"
              title="Descartar cambios"
              onPress={() => {
                setConfirmDiscard(false);
                onRequestClose();
              }}
            />
          </View>
        </View>
      ) : null}
    </AssetFormSheet>
  );
}

// ── O18 Corregir Care manual ─────────────────────────────────────────────────

export function AssetCareEditSheet({
  visible,
  care,
  canContribute = true,
  onRemove,
  onRequestClose,
  onSaved,
}: {
  visible: boolean;
  care: ManualCareDto | null;
  /** assets.contribute: corregir el registro. */
  canContribute?: boolean;
  /** assets.manage: ofrece el retiro del registro (confirmación aparte). */
  onRemove?: (care: ManualCareDto) => void;
  onRequestClose: () => void;
  onSaved: (care: ManualCareDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [draft, setDraft] = useState<CareDraft>(emptyDraft);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [intent, setIntent] = useState<AssetsMutationIntent | undefined>(undefined);
  // S8 — visor real de HomeCloud + capabilities de HomeCloud.
  const [viewerRelation, setViewerRelation] = useState<AssetFileRelation | null>(null);
  const homeCloud = useHomeCloudCapabilities();
  const homeCloudCapabilities = homeCloud.descriptor;
  const viewerFile = React.useMemo(
    () => toHomeCloudFileProjection(viewerRelation),
    [viewerRelation],
  );

  React.useEffect(() => {
    if (visible && care) {
      setDraft(draftFromCare(care));
      setPending(false);
      setFailure(null);
      setAttempted(false);
      setIntent(undefined);
    }
  }, [visible, care]);

  if (!care) return null;

  if (care.origin === 'DERIVED_PLANNER') {
    return (
      <AssetFormSheet
        visible={visible}
        title="Este care viene de Planner"
        subtitle={care.description}
        onRequestClose={onRequestClose}
      >
        <AppText variant="bodySmall" tone="secondary">
          Este registro se genera automáticamente desde Planner y no se corrige manualmente desde
          Activos.
        </AppText>
      </AssetFormSheet>
    );
  }

  const descriptionError =
    attempted && draft.description.trim().length === 0 ? 'Contanos qué pasó.' : null;

  const submit = async () => {
    if (!accessToken || !householdId || pending) return;
    setAttempted(true);
    if (draft.description.trim().length === 0) return;
    setPending(true);
    setFailure(null);
    const activeIntent = intent ?? createAssetsIntent('care.correct');
    if (!intent) setIntent(activeIntent);
    const outcome = await mutations.correctCare(
      accessToken,
      householdId,
      care.id,
      {
        description: draft.description.trim(),
        date_precision: draft.date_precision,
        ...(draft.date_precision === 'exact' && draft.occurred_on
          ? { occurred_on: draft.occurred_on }
          : { occurred_on: null }),
        ...(draft.date_precision === 'month_year'
          ? { occurred_year: draft.occurred_year, occurred_month: draft.occurred_month }
          : draft.date_precision === 'year'
            ? { occurred_year: draft.occurred_year }
            : {}),
        ...(draft.provider.trim() ? { provider: draft.provider.trim() } : { provider: null }),
        ...(draft.notes.trim() ? { notes: draft.notes.trim() } : { notes: null }),
        expected_updated_at: care.updated_at,
      },
      { intent: activeIntent },
    );
    setPending(false);
    if (outcome.ok) {
      onSaved(outcome.data.care);
    } else {
      setFailure(outcome.failure);
    }
  };

  return (
    <AssetFormSheet
      visible={visible}
      title="Corregir registro"
      subtitle={care.description.slice(0, 60)}
      onRequestClose={onRequestClose}
      closeDisabled={pending}
      footer={
        <View style={styles.footer}>
          <AssetsFailureBar failure={failure} onRetry={() => void submit()} />
          <AppButton
            title={pending ? 'Guardando…' : 'Guardar corrección'}
            onPress={() => void submit()}
            loading={pending}
            disabled={!canContribute}
            accessibilityLabel="Guardar corrección del care"
          />
          {onRemove ? (
            <AppButton
              variant="danger"
              title="Retirar registro"
              onPress={() => onRemove(care)}
              disabled={pending}
              accessibilityLabel="Retirar este registro del historial"
            />
          ) : null}
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.form}>
        <CareFormFields draft={draft} setDraft={setDraft} descriptionError={descriptionError} />
        {canContribute ? null : (
          <AppText variant="caption" tone="tertiary">
            Necesitás permiso para corregir este registro.
          </AppText>
        )}
        {/* S8-19 — "Agregar archivo" también existe en el Care. */}
        <AssetFilesSection
          ownerType="care"
          ownerId={care.id}
          ownerTitle={care.description.slice(0, 60)}
          accessToken={accessToken}
          householdId={householdId}
          canView={canContribute}
          canContribute={canContribute}
          homeCloudCapabilities={homeCloudCapabilities}
          ownerLifecycle={care.status === 'REMOVED' ? 'REMOVED' : 'ACTIVE'}
          onOpenFile={(relation) => setViewerRelation(relation)}
        />
        {/* S8-06 — el visor real de HomeCloud, montado como capa local. */}
        {viewerFile ? (
          <View style={styles.viewerHost}>
            <HomeCloudFileViewer
              file={viewerFile}
              accessToken={accessToken ?? ''}
              onClose={() => setViewerRelation(null)}
            />
          </View>
        ) : null}
      </ScrollView>
    </AssetFormSheet>
  );
}

// ── O19 Retirar Care ─────────────────────────────────────────────────────────

export function AssetCareRemoveSheet({
  visible,
  care,
  ownerTrashed,
  onRequestClose,
  onRemoved,
}: {
  visible: boolean;
  care: ManualCareDto | null;
  ownerTrashed: boolean;
  onRequestClose: () => void;
  onRemoved: (care: ManualCareDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);

  if (!care) return null;

  const submit = async () => {
    if (!accessToken || !householdId || pending) return;
    setPending(true);
    setFailure(null);
    const outcome = await mutations.removeCare(accessToken, householdId, care.id);
    setPending(false);
    if (outcome.ok) {
      onRemoved(outcome.data.care);
    } else {
      setFailure(outcome.failure);
    }
  };

  return (
    <AssetConfirmSheet
      visible={visible}
      title="Retirar este registro"
      consequences={
        failure?.message ??
        (ownerTrashed
          ? 'El activo está en la papelera: restauralo primero para poder retirar este registro.'
          : `“${care.description.slice(0, 80)}” se recupera desde “Registros retirados”.`)
      }
      confirmLabel="Retirar"
      destructive
      pending={pending}
      onCancel={onRequestClose}
      onConfirm={() => void submit()}
    />
  );
}

const styles = StyleSheet.create({
  footer: { gap: 8 },
  error: { marginBottom: 4 },
  form: { gap: 14, paddingBottom: 24 },
  group: { gap: 7, paddingBottom: 4 },
  // S8-06 — el visor real de HomeCloud necesita alto propio dentro del
  // contenido scrolleable del sheet.
  viewerHost: { height: 520, marginTop: 12 },
  precisionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  precisionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  precisionChipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  pickerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  wheelRow: { flexDirection: 'row', gap: 10, maxHeight: 180 },
  wheel: { flex: 1, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.md },
  wheelItem: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
  },
  wheelItemSelected: { backgroundColor: colors.brandSoft },
  discard: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  discardActions: { flexDirection: 'row', gap: 10 },
});
