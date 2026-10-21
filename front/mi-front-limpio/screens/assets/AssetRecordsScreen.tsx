import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import {
  useAssetRecords,
  useAssetDetail,
  useAssetCare,
  useAssetsCapabilities,
} from '../../hooks/assets/useAssetsData';
import {
  canPerform,
  mutations,
  getAssetRecordById,
  type AssetRecordDto,
  type ManualCareDto,
} from '../../services/assets';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppText } from '../../components/ui/AppText';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { AppButton } from '../../components/ui/AppButton';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import {
  AssetRecordDetailSheet,
  AssetRecordLinkSheet,
  ASSET_RECORD_TYPES,
} from '../../components/assets/AssetRecordSheets';
import { AssetCareEditSheet, AssetCareRemoveSheet } from '../../components/assets/AssetCareSheets';

const recordTypeLabel = (key: string): string =>
  ASSET_RECORD_TYPES.find((t) => t.key === key)?.label ?? key;

export function AssetRecordsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const assetId: string | null = route?.params?.assetId ?? null;

  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const assetState = useAssetDetail(accessToken, householdId, assetId);
  const active = useAssetRecords(accessToken, householdId, assetId, 'active');
  const removed = useAssetRecords(accessToken, householdId, assetId, 'removed');
  const { capabilities } = useAssetsCapabilities(accessToken, householdId);
  const canContribute = canPerform(capabilities, 'assets.records.write');
  const canManage = canPerform(capabilities, 'assets.records.link');

  const [showRemoved, setShowRemoved] = useState(false);
  const [recordDetail, setRecordDetail] = useState<AssetRecordDto | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [linkSheet, setLinkSheet] = useState(false);

  const openRecord = async (record: AssetRecordDto) => {
    if (!accessToken) return;
    try {
      const response = await getAssetRecordById(accessToken, record.id);
      setRecordDetail(response.record);
    } catch {
      setRecordDetail(record);
    }
  };

  const restoreRecord = async (recordId: string) => {
    if (!accessToken || !householdId || restoring) return;
    setRestoring(recordId);
    const outcome = await mutations.restoreRecord(accessToken, householdId, recordId);
    setRestoring(null);
    if (outcome.ok) {
      active.reload();
      removed.reload();
    }
  };

  const list = showRemoved ? removed.records : active.records;
  const listLoading = showRemoved ? removed.loading : active.loading;
  const isTrashedAsset = assetState.asset?.lifecycle_status === 'TRASH';

  return (
    <AppScreen padded={false} scroll={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backBtn}
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="700">
            {assetState.asset?.name ?? 'Información'}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {showRemoved ? 'Registros retirados' : 'Toda la información'}
          </AppText>
        </View>
      </View>

      {removed.records.length > 0 ? (
        <View style={styles.toggleRow}>
          <AppButton
            variant={showRemoved ? 'secondary' : 'ghost'}
            size="sm"
            title={`Retirados (${removed.records.length})`}
            onPress={() => setShowRemoved(!showRemoved)}
            accessibilityLabel={showRemoved ? 'Ver registros activos' : 'Ver registros retirados'}
          />
        </View>
      ) : null}

      {!showRemoved && !isTrashedAsset && canManage ? (
        <View style={styles.toggleRow}>
          <AppButton
            variant="secondary"
            size="sm"
            title="Vincular registro existente"
            onPress={() => setLinkSheet(true)}
            accessibilityLabel="Vincular un registro existente a este activo"
          />
        </View>
      ) : null}

      <View style={{ flex: 1, paddingHorizontal: spacing[5] }}>
        {listLoading && list.length === 0 ? (
          <View style={{ gap: spacing[2], paddingTop: spacing[2] }}>
            <Skeleton style={{ height: 72, borderRadius: radius.lg }} />
            <Skeleton style={{ height: 72, borderRadius: radius.lg }} />
          </View>
        ) : list.length === 0 ? (
          <EmptyState
            title={showRemoved ? 'Sin registros retirados' : 'Sin información guardada'}
            description={
              showRemoved
                ? 'Los registros retirados aparecen acá y se pueden restaurar.'
                : 'Guardá garantías, seguros o cualquier dato importante de este activo.'
            }
          />
        ) : (
          <View style={styles.list}>
            {list.map((record) => (
              <Pressable
                key={record.id}
                onPress={() => (showRemoved ? undefined : void openRecord(record))}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${record.title}`}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodySmall" weight="600" numberOfLines={1}>
                      {record.title}
                    </AppText>
                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                      {recordTypeLabel(record.type)}
                      {record.assets?.length > 1
                        ? ` · compartido con ${record.assets.length} activos`
                        : ''}
                    </AppText>
                  </View>
                  {showRemoved ? (
                    <AppButton
                      size="sm"
                      title={restoring === record.id ? 'Restaurando…' : 'Restaurar'}
                      onPress={() => void restoreRecord(record.id)}
                      disabled={restoring !== null || !canManage}
                      accessibilityLabel={`Restaurar ${record.title}`}
                    />
                  ) : (
                    <HomePlusIcon
                      name="chevron-forward-outline"
                      size={16}
                      color={colors.text.tertiary}
                    />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <AssetRecordLinkSheet
        visible={linkSheet}
        asset={assetState.asset}
        canLink={canManage}
        onRequestClose={() => setLinkSheet(false)}
        onLinked={() => {
          setLinkSheet(false);
          active.reload();
        }}
      />

      <AssetRecordDetailSheet
        visible={recordDetail !== null}
        record={recordDetail}
        assetId={assetId}
        canManage={canManage}
        canLink={canManage}
        canContribute={canContribute}
        onRequestClose={() => setRecordDetail(null)}
        onChanged={(updated) => {
          setRecordDetail(updated);
          active.reload();
        }}
        onRemoved={() => {
          setRecordDetail(null);
          active.reload();
          removed.reload();
        }}
      />
    </AppScreen>
  );
}

export function AssetCareScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const assetId: string | null = route?.params?.assetId ?? null;

  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const assetState = useAssetDetail(accessToken, householdId, assetId);
  const active = useAssetCare(accessToken, householdId, assetId, 'active');
  const removed = useAssetCare(accessToken, householdId, assetId, 'removed');
  const { capabilities } = useAssetsCapabilities(accessToken, householdId);
  const canContribute = canPerform(capabilities, 'assets.care.write');
  const canManage = canPerform(capabilities, 'assets.care.remove_restore');

  const [showRemoved, setShowRemoved] = useState(false);
  const [editCare, setEditCare] = useState<ManualCareDto | null>(null);
  const [removeCare, setRemoveCare] = useState<ManualCareDto | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const restoreCare = async (careId: string) => {
    if (!accessToken || !householdId || restoring) return;
    setRestoring(careId);
    const outcome = await mutations.restoreCare(accessToken, householdId, careId);
    setRestoring(null);
    if (outcome.ok) {
      active.reload();
      removed.reload();
    }
  };

  const list = showRemoved ? removed.care : active.care;
  const listLoading = showRemoved ? removed.loading : active.loading;

  return (
    <AppScreen padded={false} scroll={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backBtn}
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="700">
            {assetState.asset?.name ?? 'Historial'}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {showRemoved ? 'Registros retirados' : 'Historial completo'}
          </AppText>
        </View>
      </View>

      {removed.care.length > 0 ? (
        <View style={styles.toggleRow}>
          <AppButton
            variant={showRemoved ? 'secondary' : 'ghost'}
            size="sm"
            title={`Retirados (${removed.care.length})`}
            onPress={() => setShowRemoved(!showRemoved)}
            accessibilityLabel={showRemoved ? 'Ver historial activo' : 'Ver registros retirados'}
          />
        </View>
      ) : null}

      <View style={{ flex: 1, paddingHorizontal: spacing[5] }}>
        {listLoading && list.length === 0 ? (
          <View style={{ gap: spacing[2], paddingTop: spacing[2] }}>
            <Skeleton style={{ height: 72, borderRadius: radius.lg }} />
            <Skeleton style={{ height: 72, borderRadius: radius.lg }} />
          </View>
        ) : list.length === 0 ? (
          <EmptyState
            title={showRemoved ? 'Sin registros retirados' : 'Historial vacío'}
            description={
              showRemoved
                ? 'Los registros retirados aparecen acá y se pueden restaurar.'
                : 'Registrá reparaciones, revisiones o cuidados de este activo.'
            }
          />
        ) : (
          <View style={styles.list}>
            {list.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => (showRemoved ? undefined : setEditCare(item))}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${item.description.slice(0, 40)}`}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodySmall" weight="600" numberOfLines={2}>
                      {item.description}
                    </AppText>
                    <AppText variant="caption" tone="tertiary">
                      {item.date_precision === 'exact' && item.occurred_on
                        ? item.occurred_on
                        : item.date_precision === 'month_year'
                          ? `${String(item.occurred_month ?? '').padStart(2, '0')}/${item.occurred_year ?? ''}`
                          : item.date_precision === 'year'
                            ? String(item.occurred_year ?? '')
                            : 'Sin fecha'}
                      {item.provider ? ` · ${item.provider}` : ''}
                    </AppText>
                  </View>
                  {showRemoved ? (
                    <AppButton
                      size="sm"
                      title={restoring === item.id ? 'Restaurando…' : 'Restaurar'}
                      onPress={() => void restoreCare(item.id)}
                      disabled={restoring !== null || !canManage}
                      accessibilityLabel={`Restaurar ${item.description.slice(0, 30)}`}
                    />
                  ) : (
                    <HomePlusIcon
                      name="chevron-forward-outline"
                      size={16}
                      color={colors.text.tertiary}
                    />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <AssetCareEditSheet
        visible={editCare !== null}
        care={editCare}
        canContribute={canContribute}
        onRemove={canManage && editCare ? (target: ManualCareDto) => setRemoveCare(target) : undefined}
        onRequestClose={() => setEditCare(null)}
        onSaved={() => {
          setEditCare(null);
          active.reload();
        }}
      />

      <AssetCareRemoveSheet
        visible={removeCare !== null}
        care={removeCare}
        ownerTrashed={assetState.asset?.lifecycle_status === 'TRASH'}
        onRequestClose={() => setRemoveCare(null)}
        onRemoved={() => {
          setRemoveCare(null);
          active.reload();
          removed.reload();
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { paddingHorizontal: spacing[5], paddingBottom: spacing[2] },
  list: { paddingTop: spacing[2], gap: 0 },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
});
