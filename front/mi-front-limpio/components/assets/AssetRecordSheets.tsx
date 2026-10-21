import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import {
  createAssetsIntent,
  listHouseholdRecords,
  mutations,
  toAssetsFailure,
  type AssetDto,
  type AssetRecordDto,
  type AssetsFailure,
  type AssetsMutationIntent,
} from '../../services/assets';
import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';
import { colors, radius } from '../../constants/theme';
import { AssetActionMenu, AssetFormSheet, AssetConfirmSheet } from './AssetSheet';
import { AssetsFailureBar } from './ErrorBar';
import { DatePickerSheet } from '../ui/ActionSheet';

export const ASSET_RECORD_TYPES = [
  { key: 'WARRANTY', label: 'Garantía' },
  { key: 'INSURANCE', label: 'Seguro' },
  { key: 'REGISTRATION', label: 'Registro / documentación' },
  { key: 'INSPECTION', label: 'Inspección / revisión técnica' },
  { key: 'SERVICE_CONTRACT', label: 'Contrato de servicio' },
  { key: 'OTHER', label: 'Otra información' },
] as const;

const recordTypeLabel = (key: string): string =>
  ASSET_RECORD_TYPES.find((t) => t.key === key)?.label ?? key;

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

// ── O03/O05 Crear Record ─────────────────────────────────────────────────────

export function AssetRecordCreateSheet({
  visible,
  asset,
  onRequestClose,
  onCreated,
}: {
  visible: boolean;
  asset: AssetDto | null;
  onRequestClose: () => void;
  onCreated: (record: AssetRecordDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [type, setType] = useState<string>('WARRANTY');
  const [typePicker, setTypePicker] = useState(false);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [notes, setNotes] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [dateField, setDateField] = useState<'from' | 'until' | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [intent, setIntent] = useState<AssetsMutationIntent | undefined>(undefined);

  React.useEffect(() => {
    if (visible) {
      setType('WARRANTY');
      setTypePicker(false);
      setTitle('');
      setIssuer('');
      setIdentifier('');
      setNotes('');
      setValidFrom('');
      setValidUntil('');
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

  const titleError = attempted && title.trim().length === 0 ? 'Ponele un título a la información.' : null;

  const submit = async () => {
    if (!accessToken || !householdId || !asset || pending) return;
    setAttempted(true);
    if (title.trim().length === 0) return;
    setPending(true);
    setFailure(null);
    const activeIntent = intent ?? createAssetsIntent('record.create');
    if (!intent) setIntent(activeIntent);
    const outcome = await mutations.createRecord(
      accessToken,
      householdId,
      {
        asset_ids: [asset.id],
        type,
        title: title.trim(),
        ...(issuer.trim() ? { issuer: issuer.trim() } : {}),
        ...(identifier.trim() ? { identifier: identifier.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(validFrom ? { valid_from: validFrom } : {}),
        ...(validUntil ? { valid_until: validUntil } : {}),
      },
      { intent: activeIntent },
    );
    setPending(false);
    if (outcome.ok) {
      setDirty(false);
      onCreated(outcome.data.record);
      return;
    }
    setFailure(outcome.failure);
  };

  return (
    <>
      <AssetFormSheet
        visible={visible && !typePicker}
        title="Guardar información"
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
              accessibilityLabel="Guardar información"
            />
          </View>
        }
      >
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.group}>
            <AppText variant="caption" weight="700" tone="secondary">
              Tipo de información
            </AppText>
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={`Tipo: ${recordTypeLabel(type)}`}
              onPress={() => setTypePicker(true)}
              haptic="light"
              pressScale={0.98}
              style={styles.pickerRow}
            >
              <AppText variant="body" weight="600" style={{ flex: 1 }}>
                {recordTypeLabel(type)}
              </AppText>
              <AppText variant="caption" tone="tertiary">
                Cambiar
              </AppText>
            </InteractivePressable>
          </View>

          <AppInput
            label="Título"
            value={title}
            onChangeText={(text) => {
              setDirty(true);
              setTitle(text);
            }}
            placeholder="Ej: Garantía extendida"
            errorText={titleError ?? undefined}
            accessibilityLabel="Título de la información"
          />
          <AppInput
            label="Quién la emitió (opcional)"
            value={issuer}
            onChangeText={(text) => {
              setDirty(true);
              setIssuer(text);
            }}
            placeholder="Ej: Sony Argentina"
            accessibilityLabel="Emisor"
          />
          <AppInput
            label="Identificador (opcional)"
            value={identifier}
            onChangeText={(text) => {
              setDirty(true);
              setIdentifier(text);
            }}
            placeholder="Ej: Nº de póliza"
            accessibilityLabel="Identificador"
          />
          <AppInput
            label="Notas (opcional)"
            value={notes}
            onChangeText={(text) => {
              setDirty(true);
              setNotes(text);
            }}
            variant="multiline"
            accessibilityLabel="Notas"
          />
          <View style={styles.group}>
            <AppText variant="caption" weight="700" tone="secondary">
              Vigencia (opcional)
            </AppText>
            <View style={styles.dateRow}>
              <InteractivePressable
                accessibilityRole="button"
                accessibilityLabel={`Válida desde: ${formatDate(validFrom || null)}`}
                onPress={() => setDateField('from')}
                haptic="light"
                pressScale={0.98}
                style={styles.dateField}
              >
                <AppText variant="caption" tone="tertiary">
                  Desde
                </AppText>
                <AppText variant="bodySmall" weight="600">
                  {validFrom ? formatDate(validFrom) : 'Elegir'}
                </AppText>
              </InteractivePressable>
              <InteractivePressable
                accessibilityRole="button"
                accessibilityLabel={`Válida hasta: ${formatDate(validUntil || null)}`}
                onPress={() => setDateField('until')}
                haptic="light"
                pressScale={0.98}
                style={styles.dateField}
              >
                <AppText variant="caption" tone="tertiary">
                  Hasta
                </AppText>
                <AppText variant="bodySmall" weight="600">
                  {validUntil ? formatDate(validUntil) : 'Elegir'}
                </AppText>
              </InteractivePressable>
            </View>
            <View style={styles.dateClearRow}>
              {validFrom ? (
                <AppButton variant="ghost" size="sm" title="Borrar desde" onPress={() => setValidFrom('')} />
              ) : null}
              {validUntil ? (
                <AppButton variant="ghost" size="sm" title="Borrar hasta" onPress={() => setValidUntil('')} />
              ) : null}
            </View>
          </View>
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

      {typePicker ? (
        <AssetFormSheet
          visible
          title="Tipo de información"
          onRequestClose={() => setTypePicker(false)}
        >
          <View style={styles.optionList}>
            {ASSET_RECORD_TYPES.map((option) => (
              <InteractivePressable
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: type === option.key }}
                onPress={() => {
                  setType(option.key);
                  setDirty(true);
                  setTypePicker(false);
                }}
                haptic="light"
                pressScale={0.98}
                style={[styles.option, type === option.key && styles.optionSelected]}
              >
                <AppText variant="bodySmall" weight={type === option.key ? '700' : '500'}>
                  {option.label}
                </AppText>
              </InteractivePressable>
            ))}
          </View>
        </AssetFormSheet>
      ) : null}

      <DatePickerSheet
        visible={dateField !== null}
        value={dateField === 'from' ? (validFrom || new Date().toISOString().slice(0, 10)) : (validUntil || new Date().toISOString().slice(0, 10))}
        onClose={() => setDateField(null)}
        onConfirm={(value) => {
          setDirty(true);
          if (dateField === 'from') setValidFrom(value);
          else setValidUntil(value);
          setDateField(null);
        }}
      />
    </>
  );
}

// ── O10/O11 Vincular registro existente (BG-02 discovery) ──────────────────

export function AssetRecordLinkSheet({
  visible,
  asset,
  canLink = true,
  onRequestClose,
  onLinked,
}: {
  visible: boolean;
  asset: AssetDto | null;
  /** assets.manage: vincular un Record existente a este Asset. */
  canLink?: boolean;
  onRequestClose: () => void;
  onLinked: (record: AssetRecordDto) => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [records, setRecords] = useState<AssetRecordDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const retryLast = useRef<(() => void) | null>(null);

  const load = useCallback(
    async (refresh: boolean) => {
      if (!accessToken || !asset) return;
      if (!refresh && loading) return;
      retryLast.current = () => void load(true);
      setLoading(true);
      setFailure(null);
      try {
        const response = await listHouseholdRecords(
          accessToken,
          { exclude_asset_id: asset.id, limit: 50 },
          { contextScope: `assets-records-discovery:${householdId}` },
        );
        setRecords(response.records ?? []);
      } catch (caught) {
        setFailure(toAssetsFailure(caught));
      } finally {
        setLoading(false);
      }
    },
    [accessToken, asset, householdId, loading],
  );

  useEffect(() => {
    if (visible) {
      setRecords([]);
      setLinkingId(null);
      setFailure(null);
      void load(true);
    }
    // load cambia por closure; visible es el disparador real.
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!asset) return null;

  const link = async (record: AssetRecordDto) => {
    if (!accessToken || !householdId || linkingId || !canLink) return;
    retryLast.current = () => void link(record);
    setLinkingId(record.id);
    setFailure(null);
    const outcome = await mutations.linkRecord(accessToken, householdId, record.id, {
      asset_id: asset.id,
    });
    setLinkingId(null);
    if (outcome.ok) {
      onLinked(outcome.data.record);
    } else {
      setFailure(outcome.failure);
    }
  };

  return (
    <AssetFormSheet
      visible={visible}
      title="Vincular registro existente"
      subtitle={asset.name}
      onRequestClose={onRequestClose}
      closeDisabled={linkingId !== null}
      footer={
        <AssetsFailureBar failure={failure} onRetry={() => retryLast.current?.()} />
      }
    >
      {loading && records.length === 0 ? (
        <AppText variant="bodySmall" tone="tertiary">
          Buscando registros del hogar…
        </AppText>
      ) : !canLink ? (
        <AppText variant="bodySmall" tone="secondary" style={styles.helper}>
          Necesitás permisos de administración para vincular registros.
        </AppText>
      ) : records.length === 0 ? (
        <AppText variant="bodySmall" tone="secondary" style={styles.helper}>
          No hay otros registros para vincular. Podés crear uno nuevo con “Guardar información”.
        </AppText>
      ) : (
        <View style={styles.optionList}>
          {records.map((record) => (
            <InteractivePressable
              key={record.id}
              accessibilityRole="button"
              accessibilityLabel={`Vincular ${record.title}`}
              accessibilityState={{ disabled: linkingId !== null }}
              disabled={linkingId !== null}
              onPress={() => void link(record)}
              haptic="light"
              pressScale={0.98}
              style={[styles.option, linkingId === record.id && styles.optionSelected]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodySmall" weight="600" numberOfLines={1}>
                  {record.title}
                </AppText>
                <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                  {recordTypeLabel(record.type)}
                  {record.assets?.length ? ` · ya está en ${record.assets.length} activo(s)` : ''}
                </AppText>
              </View>
              <AppText variant="caption" weight="600" tone="brand">
                {linkingId === record.id ? 'Vinculando…' : 'Vincular'}
              </AppText>
            </InteractivePressable>
          ))}
        </View>
      )}
    </AssetFormSheet>
  );
}

// ── O06 Record Detail + acciones (O07/O08/O09/O10/O12) ────────────────────────

export function AssetRecordDetailSheet({
  visible,
  record,
  assetId,
  canManage,
  canLink = canManage,
  canContribute = true,
  onRequestClose,
  onChanged,
  onRemoved,
}: {
  visible: boolean;
  record: AssetRecordDto | null;
  /** Asset desde el cual se abre la ficha: “Quitar de este activo” opera sobre él. */
  assetId: string | null;
  /** assets.manage: retirar/restaurar el Record. */
  canManage: boolean;
  /** assets.manage: vincular/desvincular el Record de un Asset. */
  canLink?: boolean;
  /** assets.contribute: corregir datos, vigencia y renovar. */
  canContribute?: boolean;
  onRequestClose: () => void;
  onChanged: (record: AssetRecordDto) => void;
  onRemoved: () => void;
}) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [menu, setMenu] = useState<'main' | 'correct' | 'period' | 'renew' | 'confirmRemove' | null>('main');
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AssetsFailure | null>(null);
  const lastAction = useRef<(() => void) | null>(null);

  // correct draft
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [notes, setNotes] = useState('');

  // period draft
  const [periodIndex, setPeriodIndex] = useState(0);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [dateField, setDateField] = useState<'from' | 'until' | null>(null);

  // renew draft
  const [renewFrom, setRenewFrom] = useState('');
  const [renewUntil, setRenewUntil] = useState('');
  const [renewAssets, setRenewAssets] = useState<string[]>([]);

  React.useEffect(() => {
    if (visible && record) {
      setMenu('main');
      setPending(false);
      setFailure(null);
      setTitle(record.title);
      setIssuer(record.issuer ?? '');
      setIdentifier(record.identifier ?? '');
      setNotes(record.notes ?? '');
      setPeriodIndex(0);
      setValidFrom(record.periods[0]?.valid_from ?? '');
      setValidUntil(record.periods[0]?.valid_until ?? '');
      setRenewAssets(record.assets?.map((a) => a.asset_id) ?? []);
    }
  }, [visible, record]);

  if (!record) return null;

  const period = record.periods[periodIndex] ?? record.periods[0] ?? null;

  const runAction = async (
    execute: () => Promise<
      { ok: true; data: { record: AssetRecordDto } } | { ok: false; failure: AssetsFailure }
    >,
    onSuccess: (data: AssetRecordDto) => void,
  ) => {
    if (!accessToken || !householdId || pending) return;
    lastAction.current = () => void runAction(execute, onSuccess);
    setPending(true);
    setFailure(null);
    const outcome = await execute();
    setPending(false);
    if (outcome.ok) {
      setMenu('main');
      onSuccess(outcome.data.record);
    } else {
      setFailure(outcome.failure);
    }
  };

  const isLinkedToMultipleAssets = (record.assets?.length ?? 0) > 1;

  return (
    <>
      <AssetActionMenu
        visible={visible && menu === 'main'}
        title={record.title}
        subtitle={recordTypeLabel(record.type)}
        onRequestClose={onRequestClose}
        closeDisabled={pending}
        options={[
          {
            key: 'correct',
            label: 'Corregir datos',
            description: 'Título, emisor, identificador o notas',
            icon: 'create-outline',
            disabled: pending || !canContribute,
            disabledReason: canContribute ? undefined : 'Necesitás permiso para corregir el registro',
            onSelect: () => setMenu('correct'),
          },
          {
            key: 'period',
            label: 'Corregir vigencia',
            description: period
              ? `${formatDate(period.valid_from)} → ${formatDate(period.valid_until)}`
              : undefined,
            icon: 'calendar-outline',
            disabled: pending || !canContribute || record.periods.length === 0,
            disabledReason:
              record.periods.length === 0
                ? 'Este registro no tiene período de vigencia'
                : canContribute
                  ? undefined
                  : 'Necesitás permiso para corregir el registro',
            onSelect: () => setMenu('period'),
          },
          {
            key: 'renew',
            label: 'Renovar',
            description: 'Nuevo período; el anterior queda como historial',
            icon: 'refresh-outline',
            disabled: pending || !canContribute,
            disabledReason: canContribute ? undefined : 'Necesitás permiso para renovar el registro',
            onSelect: () => setMenu('renew'),
          },
          {
            key: 'unlink',
            label: 'Quitar de este activo',
            description: isLinkedToMultipleAssets
              ? 'El registro sigue existiendo para los otros activos'
              : 'Es el único activo vinculado: conviene vincular otro antes o retirar el registro',
            icon: 'remove-circle-outline',
            destructive: true,
            disabled: pending || !canLink,
            disabledReason: canLink
              ? undefined
              : 'Necesitás permisos de administración para desvincular',
            onSelect: () =>
              void runAction(
                () =>
                  mutations.unlinkRecord(
                    accessToken!,
                    householdId!,
                    record.id,
                    { asset_id: assetId ?? record.assets?.[0]?.asset_id ?? '' },
                  ),
                () => onRemoved(),
              ),
          },
          {
            key: 'remove',
            label: 'Retirar registro',
            description: 'Se recupera desde “Registros retirados”',
            icon: 'trash-outline',
            destructive: true,
            disabled: pending || !canManage,
            disabledReason: !canManage ? 'Necesitás permisos de administración' : undefined,
            onSelect: () => setMenu('confirmRemove'),
          },
        ]}
      />

      {/* Vista lectura (O06) mientras menu === main se muestra el menú arriba;
          el detalle completo vive en la sección Datos y documentos del Asset. */}

      {menu === 'correct' ? (
        <AssetFormSheet
          visible
          title="Corregir datos"
          subtitle={record.title}
          onRequestClose={() => setMenu('main')}
          closeDisabled={pending}
          footer={
            <View style={styles.footer}>
              <AssetsFailureBar
                failure={failure}
                onRetry={() => lastAction.current?.()}
              />
              <AppButton
                title={pending ? 'Guardando…' : 'Guardar corrección'}
                loading={pending}
                onPress={() =>
                  void runAction(
                    () =>
                      mutations.correctRecord(accessToken!, householdId!, record.id, {
                        title: title.trim(),
                        issuer: issuer.trim() || null,
                        identifier: identifier.trim() || null,
                        notes: notes.trim() || null,
                      }),
                    (updated) => onChanged(updated),
                  )
                }
                accessibilityLabel="Guardar corrección del registro"
              />
            </View>
          }
        >
          <AppInput label="Título" value={title} onChangeText={setTitle} accessibilityLabel="Título" />
          <AppInput label="Emisor" value={issuer} onChangeText={setIssuer} accessibilityLabel="Emisor" />
          <AppInput label="Identificador" value={identifier} onChangeText={setIdentifier} accessibilityLabel="Identificador" />
          <AppInput label="Notas" value={notes} onChangeText={setNotes} variant="multiline" accessibilityLabel="Notas" />
        </AssetFormSheet>
      ) : null}

      {menu === 'period' ? (
        <AssetFormSheet
          visible
          title="Corregir vigencia"
          subtitle={record.title}
          onRequestClose={() => setMenu('main')}
          closeDisabled={pending}
          footer={
            <View style={styles.footer}>
              <AssetsFailureBar
                failure={failure}
                onRetry={() => lastAction.current?.()}
              />
              <AppButton
                title={pending ? 'Guardando…' : 'Guardar vigencia'}
                loading={pending}
                disabled={!period}
                onPress={() => {
                  if (!period) return;
                  void runAction(
                    () =>
                      mutations.correctRecordPeriod(
                        accessToken!,
                        householdId!,
                        record.id,
                        period.id,
                        {
                          valid_from: validFrom || null,
                          valid_until: validUntil || null,
                          expected_updated_at: period.updated_at,
                        },
                      ),
                    (updated) => onChanged(updated),
                  );
                }}
                accessibilityLabel="Guardar corrección de vigencia"
              />
            </View>
          }
        >
          <View style={styles.dateRow}>
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={`Desde: ${formatDate(validFrom || null)}`}
              onPress={() => setDateField('from')}
              haptic="light"
              pressScale={0.98}
              style={styles.dateField}
            >
              <AppText variant="caption" tone="tertiary">Desde</AppText>
              <AppText variant="bodySmall" weight="600">
                {validFrom ? formatDate(validFrom) : 'Elegir'}
              </AppText>
            </InteractivePressable>
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={`Hasta: ${formatDate(validUntil || null)}`}
              onPress={() => setDateField('until')}
              haptic="light"
              pressScale={0.98}
              style={styles.dateField}
            >
              <AppText variant="caption" tone="tertiary">Hasta</AppText>
              <AppText variant="bodySmall" weight="600">
                {validUntil ? formatDate(validUntil) : 'Elegir'}
              </AppText>
            </InteractivePressable>
          </View>
          <AppText variant="caption" tone="tertiary" style={styles.helper}>
            El período anterior queda guardado en el historial del registro.
          </AppText>
        </AssetFormSheet>
      ) : null}

      {menu === 'renew' ? (
        <AssetFormSheet
          visible
          title="Renovar registro"
          subtitle={record.title}
          onRequestClose={() => setMenu('main')}
          closeDisabled={pending}
          footer={
            <View style={styles.footer}>
              <AssetsFailureBar
                failure={failure}
                onRetry={() => lastAction.current?.()}
              />
              <AppButton
                title={pending ? 'Renovando…' : 'Renovar'}
                loading={pending}
                disabled={renewAssets.length === 0}
                onPress={() =>
                  void runAction(
                    () =>
                      mutations.renewRecord(accessToken!, householdId!, record.id, {
                        valid_from: renewFrom || null,
                        valid_until: renewUntil || null,
                        asset_ids: renewAssets,
                      }),
                    (updated) => onChanged(updated),
                  )
                }
                accessibilityLabel="Renovar registro"
              />
            </View>
          }
        >
          <AppText variant="bodySmall" tone="secondary" style={styles.helper}>
            Se crea un nuevo período de vigencia. El anterior queda como historial.
          </AppText>
          <View style={styles.dateRow}>
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel="Nueva vigencia desde"
              onPress={() => setDateField('from')}
              haptic="light"
              pressScale={0.98}
              style={styles.dateField}
            >
              <AppText variant="caption" tone="tertiary">Nueva, desde</AppText>
              <AppText variant="bodySmall" weight="600">
                {renewFrom ? formatDate(renewFrom) : 'Elegir'}
              </AppText>
            </InteractivePressable>
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel="Nueva vigencia hasta"
              onPress={() => setDateField('until')}
              haptic="light"
              pressScale={0.98}
              style={styles.dateField}
            >
              <AppText variant="caption" tone="tertiary">Nueva, hasta</AppText>
              <AppText variant="bodySmall" weight="600">
                {renewUntil ? formatDate(renewUntil) : 'Elegir'}
              </AppText>
            </InteractivePressable>
          </View>
          <View style={styles.group}>
            <AppText variant="caption" weight="700" tone="secondary">
              Activos que pasan al nuevo período
            </AppText>
            {(record.assets ?? []).map((link) => (
              <InteractivePressable
                key={link.id}
                accessibilityRole="button"
                accessibilityLabel={link.asset_name ?? 'Activo'}
                accessibilityState={{ selected: renewAssets.includes(link.asset_id) }}
                onPress={() =>
                  setRenewAssets((current) =>
                    current.includes(link.asset_id)
                      ? current.filter((id) => id !== link.asset_id)
                      : [...current, link.asset_id],
                  )
                }
                haptic="light"
                pressScale={0.98}
                style={[
                  styles.option,
                  renewAssets.includes(link.asset_id) && styles.optionSelected,
                ]}
              >
                <AppText variant="bodySmall" weight={renewAssets.includes(link.asset_id) ? '700' : '500'}>
                  {link.asset_name ?? 'Activo'}
                </AppText>
              </InteractivePressable>
            ))}
          </View>
        </AssetFormSheet>
      ) : null}

      {menu === 'confirmRemove' ? (
        <AssetConfirmSheet
          visible
          title="Retirar registro"
          consequences={`“${record.title}” deja de verse en los activos, pero se recupera desde “Registros retirados”.`}
          confirmLabel="Retirar registro"
          destructive
          pending={pending}
          onCancel={() => setMenu('main')}
          onConfirm={() =>
            void runAction(
              () => mutations.removeRecord(accessToken!, householdId!, record.id),
              () => onRemoved(),
            )
          }
        />
      ) : null}

      <DatePickerSheet
        visible={dateField !== null}
        value={
          dateField === 'from'
            ? (menu === 'renew' ? renewFrom : validFrom) || new Date().toISOString().slice(0, 10)
            : (menu === 'renew' ? renewUntil : validUntil) || new Date().toISOString().slice(0, 10)
        }
        onClose={() => setDateField(null)}
        onConfirm={(value) => {
          if (menu === 'renew') {
            if (dateField === 'from') setRenewFrom(value);
            else setRenewUntil(value);
          } else {
            if (dateField === 'from') setValidFrom(value);
            else setValidUntil(value);
          }
          setDateField(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 8 },
  error: { marginBottom: 4 },
  form: { gap: 14, paddingBottom: 24 },
  group: { gap: 7, paddingBottom: 4 },
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
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: {
    flex: 1,
    gap: 4,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  dateClearRow: { flexDirection: 'row', gap: 8, paddingTop: 6 },
  helper: { paddingBottom: 8 },
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
  discard: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  discardActions: { flexDirection: 'row', gap: 10 },
});
