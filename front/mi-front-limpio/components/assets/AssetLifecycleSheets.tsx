import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import {
  createAssetsIntent,
  mutations,
  type AssetArchiveDisposition,
  type AssetDto,
  type AssetsFailure,
  type AssetsMutationIntent,
} from '../../services/assets';
import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
import { AppText } from '../ui/AppText';
import { colors, radius } from '../../constants/theme';
import { AssetFormSheet } from './AssetSheet';
import { InteractivePressable } from '../ui/InteractivePressable';
import { AssetsFailureBar } from './ErrorBar';
import { LIFECYCLE_LABEL } from './assetLabels';

// ── Cambio de estado operativo (O29 → ACTIVE/INACTIVE) ───────────────────────

export function AssetStatusSheet({
  visible,
  asset,
  onRequestClose,
  onSaved,
}: {
  visible: boolean;
  asset: AssetDto | null;
  onRequestClose: () => void;
  onSaved: (asset: AssetDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);
  const lastAttempt = useRef<'ACTIVE' | 'INACTIVE' | null>(null);

  const change = async (status: 'ACTIVE' | 'INACTIVE') => {
    if (!accessToken || !householdId || !asset || pending) return;
    if (asset.lifecycle_status === status) {
      onRequestClose();
      return;
    }
    lastAttempt.current = status;
    setPending(true);
    setFailure(null);
    const outcome = await mutations.setLifecycleStatus(accessToken, householdId, asset.id, {
      lifecycle_status: status,
      expected_lifecycle_status: asset.lifecycle_status,
    });
    setPending(false);
    if (outcome.ok) {
      onSaved(outcome.data.asset);
    } else {
      setFailure(outcome.failure);
    }
  };

  return (
    <AssetFormSheet
      visible={visible}
      title="Cambiar estado"
      subtitle={asset?.name}
      onRequestClose={onRequestClose}
      closeDisabled={pending}
      footer={
        <AssetsFailureBar
          failure={failure}
          onRetry={() => {
            const attempted = lastAttempt.current;
            if (attempted) void change(attempted);
          }}
        />
      }
    >
      <View style={styles.optionList}>
        <StatusOption
          label="Activo"
          description="En uso normal"
          selected={asset?.lifecycle_status === 'ACTIVE'}
          pending={pending}
          onPress={() => void change('ACTIVE')}
        />
        <StatusOption
          label="Inactivo"
          description="Guardado, fuera de uso por ahora"
          selected={asset?.lifecycle_status === 'INACTIVE'}
          pending={pending}
          onPress={() => void change('INACTIVE')}
        />
      </View>
    </AssetFormSheet>
  );
}

// ── O32 Archivar con motivo ──────────────────────────────────────────────────

const DISPOSITIONS: { key: AssetArchiveDisposition; label: string }[] = [
  { key: 'SOLD', label: 'Vendido' },
  { key: 'GIFTED', label: 'Regalado' },
  { key: 'DISPOSED', label: 'Desechado' },
  { key: 'LOST', label: 'Perdido' },
  { key: 'STOLEN', label: 'Robado' },
  { key: 'REPLACED', label: 'Reemplazado' },
  { key: 'DECEASED', label: 'Falleció (mascota)' },
  { key: 'OTHER', label: 'Otro motivo' },
];

export function AssetArchiveSheet({
  visible,
  asset,
  onRequestClose,
  onSaved,
}: {
  visible: boolean;
  asset: AssetDto | null;
  onRequestClose: () => void;
  onSaved: (asset: AssetDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [disposition, setDisposition] = useState<AssetArchiveDisposition | null>(null);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [intent, setIntent] = useState<AssetsMutationIntent | undefined>(undefined);

  React.useEffect(() => {
    if (visible) {
      setDisposition(null);
      setNote('');
      setPending(false);
      setFailure(null);
      setAttempted(false);
      setIntent(undefined);
    }
  }, [visible]);

  const noteRequired = disposition === 'OTHER';
  const canSubmit =
    disposition !== null && (!noteRequired || note.trim().length > 0) && !pending;

  const submit = async () => {
    if (!accessToken || !householdId || !asset || !canSubmit) return;
    setAttempted(true);
    setPending(true);
    setFailure(null);
    const activeIntent = intent ?? createAssetsIntent('asset.archive');
    if (!intent) setIntent(activeIntent);
    const outcome = await mutations.archive(
      accessToken,
      householdId,
      asset.id,
      {
        expected_lifecycle_status: asset.lifecycle_status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        disposition: disposition ?? undefined,
        ...(noteRequired && note.trim() ? { disposition_note: note.trim() } : {}),
      },
      { intent: activeIntent },
    );
    setPending(false);
    if (outcome.ok) {
      onSaved(outcome.data.asset);
    } else {
      setFailure(outcome.failure);
    }
  };

  const noteError =
    attempted && noteRequired && note.trim().length === 0
      ? 'Contanos brevemente por qué lo archivás.'
      : null;

  return (
    <AssetFormSheet
      visible={visible}
      title="Archivar activo"
      subtitle={asset?.name}
      onRequestClose={onRequestClose}
      closeDisabled={pending}
      footer={
        <View style={styles.footer}>
          <AssetsFailureBar failure={failure} onRetry={() => void submit()} />
          <AppButton
            title={pending ? 'Archivando…' : 'Archivar'}
            onPress={() => void submit()}
            loading={pending}
            disabled={!canSubmit}
            accessibilityLabel="Archivar activo"
          />
        </View>
      }
    >
      <AppText variant="bodySmall" tone="secondary" style={styles.explainer}>
        Se guarda fuera del uso diario, con toda su información. Podés desarchivarlo cuando quieras.
      </AppText>
      <View style={styles.optionList}>
        {DISPOSITIONS.map((option) => (
          <InteractivePressable
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: disposition === option.key }}
            onPress={() => setDisposition(option.key)}
            haptic="light"
            pressScale={0.98}
            style={[styles.option, disposition === option.key && styles.optionSelected]}
          >
            <AppText variant="bodySmall" weight={disposition === option.key ? '700' : '500'}>
              {option.label}
            </AppText>
          </InteractivePressable>
        ))}
      </View>
      {noteRequired ? (
        <AppInput
          label="Motivo"
          value={note}
          onChangeText={setNote}
          placeholder="Contanos qué pasó"
          errorText={noteError ?? undefined}
          accessibilityLabel="Motivo del archivado"
        />
      ) : null}
    </AssetFormSheet>
  );
}

// ── O34 Papelera (confirmación destructiva, haptic una vez) ───────────────────

export function AssetTrashSheet({
  visible,
  asset,
  onRequestClose,
  onSaved,
}: {
  visible: boolean;
  asset: AssetDto | null;
  onRequestClose: () => void;
  onSaved: (asset: AssetDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);
  const [intent, setIntent] = useState<AssetsMutationIntent | undefined>(undefined);

  React.useEffect(() => {
    if (visible) {
      setPending(false);
      setFailure(null);
      setIntent(undefined);
    }
  }, [visible]);

  const submit = async () => {
    if (!accessToken || !householdId || !asset || pending) return;
    setPending(true);
    setFailure(null);
    const activeIntent = intent ?? createAssetsIntent('asset.trash');
    if (!intent) setIntent(activeIntent);
    const outcome = await mutations.trash(accessToken, householdId, asset.id, {
      expected_lifecycle_status:
        asset.lifecycle_status === 'ARCHIVED' || asset.lifecycle_status === 'INACTIVE'
          ? asset.lifecycle_status
          : 'ACTIVE',
    }, {
      intent: activeIntent,
    });
    setPending(false);
    if (outcome.ok) {
      onSaved(outcome.data.asset);
    } else {
      setFailure(outcome.failure);
    }
  };

  return (
    <AssetFormSheet
      visible={visible}
      title="Mover a papelera"
      subtitle={asset?.name}
      onRequestClose={onRequestClose}
      closeDisabled={pending}
      footer={
        <View style={styles.footer}>
          <AssetsFailureBar failure={failure} onRetry={() => void submit()} />
          <View style={styles.confirmRow}>
            <AppButton
              variant="secondary"
              title="Cancelar"
              onPress={onRequestClose}
              disabled={pending}
              style={{ flex: 1 }}
            />
            <AppButton
              variant="danger"
              title={pending ? 'Moviendo…' : 'Mover a papelera'}
              onPress={() => void submit()}
              loading={pending}
              style={{ flex: 1 }}
              accessibilityLabel="Confirmar mover a papelera"
            />
          </View>
        </View>
      }
    >
      <AppText variant="bodySmall" tone="secondary">
        Se va a la papelera sin borrarse nada. Va a dejar de aparecer en tus activos hasta que lo
        restaures. Estado actual: {asset ? LIFECYCLE_LABEL[asset.lifecycle_status] : ''}.
      </AppText>
    </AssetFormSheet>
  );
}

// ── Desarchivar / Restaurar (vuelta exacta, nunca fallback) ───────────────────

export function AssetUnarchiveSheet({
  visible,
  asset,
  onRequestClose,
  onSaved,
}: {
  visible: boolean;
  asset: AssetDto | null;
  onRequestClose: () => void;
  onSaved: (asset: AssetDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);

  const target = asset?.archived_from ?? 'ACTIVE';

  const submit = async () => {
    if (!accessToken || !householdId || !asset || pending) return;
    setPending(true);
    setFailure(null);
    const outcome = await mutations.unarchive(accessToken, householdId, asset.id);
    setPending(false);
    if (outcome.ok) {
      onSaved(outcome.data.asset);
    } else {
      setFailure(outcome.failure);
    }
  };

  return (
    <AssetFormSheet
      visible={visible}
      title="Desarchivar activo"
      subtitle={asset?.name}
      onRequestClose={onRequestClose}
      closeDisabled={pending}
      footer={
        <View style={styles.footer}>
          <AssetsFailureBar failure={failure} onRetry={() => void submit()} />
          <AppButton
            title={pending ? 'Desarchivando…' : 'Desarchivar'}
            onPress={() => void submit()}
            loading={pending}
            accessibilityLabel="Desarchivar activo"
          />
        </View>
      }
    >
      <AppText variant="bodySmall" tone="secondary">
        Vuelve exactamente a su estado anterior: {LIFECYCLE_LABEL[target] ?? 'Activo'}.
      </AppText>
    </AssetFormSheet>
  );
}

export function AssetRestoreSheet({
  visible,
  asset,
  onRequestClose,
  onSaved,
}: {
  visible: boolean;
  asset: AssetDto | null;
  onRequestClose: () => void;
  onSaved: (asset: AssetDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);

  const target = asset?.trashed_from ?? 'ACTIVE';

  const submit = async () => {
    if (!accessToken || !householdId || !asset || pending) return;
    setPending(true);
    setFailure(null);
    const outcome = await mutations.restore(accessToken, householdId, asset.id);
    setPending(false);
    if (outcome.ok) {
      onSaved(outcome.data.asset);
    } else {
      setFailure(outcome.failure);
    }
  };

  return (
    <AssetFormSheet
      visible={visible}
      title="Restaurar activo"
      subtitle={asset?.name}
      onRequestClose={onRequestClose}
      closeDisabled={pending}
      footer={
        <View style={styles.footer}>
          <AssetsFailureBar failure={failure} onRetry={() => void submit()} />
          <AppButton
            title={pending ? 'Restaurando…' : 'Restaurar'}
            onPress={() => void submit()}
            loading={pending}
            accessibilityLabel="Restaurar activo"
          />
        </View>
      }
    >
      <AppText variant="bodySmall" tone="secondary">
        Vuelve exactamente a donde estaba antes de la papelera:{' '}
        {LIFECYCLE_LABEL[target] ?? 'Activo'}.
      </AppText>
    </AssetFormSheet>
  );
}

// ── internals ────────────────────────────────────────────────────────────────

function StatusOption({
  label,
  description,
  selected,
  pending,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: pending }}
      disabled={pending}
      onPress={onPress}
      haptic="light"
      pressScale={0.98}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <View>
        <AppText variant="bodySmall" weight={selected ? '700' : '600'}>
          {label}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {description}
        </AppText>
      </View>
    </InteractivePressable>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 8 },
  error: { marginBottom: 4 },
  explainer: { paddingBottom: 12 },
  optionList: { gap: 8, paddingBottom: 16 },
  option: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  optionSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  confirmRow: { flexDirection: 'row', gap: 10 },
});
