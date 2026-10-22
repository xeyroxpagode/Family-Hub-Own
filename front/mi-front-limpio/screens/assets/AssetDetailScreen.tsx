import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import {
  useAssetDetail,
  useAssetRecords,
  useAssetCare,
  useAssetsCapabilities,
} from '../../hooks/assets/useAssetsData';
import {
  canPerform,
  canView as canViewAssets,
  getAssetRecordById,
  type AssetRecordDto,
  type AssetDto,
  type ManualCareDto,
} from '../../services/assets';
import { useHomeCloudCapabilities } from '../../services/homecloud/useHomeCloudCapabilities';
import { HomeCloudFileViewer } from '../HomeCloudFileViewerScreen';
import {
  toHomeCloudFileProjection,
  type AssetFileRelation,
} from '../../services/assets/assetsFiles';
import {
  resolvePlannerCapabilityScope,
  usePlannerCapabilities,
} from '../../services/planner/usePlannerCapabilities';
import { AssetPlannerItemsSection } from '../../components/assets/AssetPlannerItemsSection';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppText } from '../../components/ui/AppText';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { AssetAvatar, ASSET_PROFILE_ICON } from '../../components/assets/AssetAvatar';
import { AssetActionMenu, type AssetMenuOption } from '../../components/assets/AssetSheet';
import { AssetCreateSheet } from '../../components/assets/AssetCreateSheet';
import { AssetEditIdentitySheet } from '../../components/assets/AssetEditIdentitySheet';
import { AssetContextSheet } from '../../components/assets/AssetContextSheet';
import {
  AssetStatusSheet,
  AssetArchiveSheet,
  AssetTrashSheet,
  AssetUnarchiveSheet,
  AssetRestoreSheet,
} from '../../components/assets/AssetLifecycleSheets';
import {
  AssetRecordCreateSheet,
  AssetRecordDetailSheet,
} from '../../components/assets/AssetRecordSheets';
import {
  AssetCareCreateSheet,
  AssetCareEditSheet,
  AssetCareRemoveSheet,
} from '../../components/assets/AssetCareSheets';
import {
  describeHolder,
  describePlacement,
  describeResponsible,
  lifecyclePill,
  LIFECYCLE_LABEL,
  describeIdentity,
} from '../../components/assets/assetLabels';
import { AssetGoneState } from '../../components/assets/AssetGoneState';
import { AssetFilesSection } from '../../components/assets/AssetFilesSection';
import { ErrorBar } from '../../components/assets/ErrorBar';
import {
  AssetLifecycleHistorySection,
  AssetLifecycleHistorySheet,
} from '../../components/assets/AssetLifecycleHistory';
import { useAssetLifecycleHistory } from '../../hooks/assets/useAssetLifecycleHistory';

const PROFILE_LABEL: Record<AssetDto['profile'], string> = {
  STANDARD: 'Objeto o equipo',
  VEHICLE: 'Vehículo',
  PET: 'Mascota',
  PROPERTY: 'Propiedad',
};

const DETAIL_MAX_RECORDS = 3;
const DETAIL_MAX_CARE = 2;

const formatCareDate = (care: ManualCareDto): string => {
  switch (care.date_precision) {
    case 'exact':
      return care.occurred_on
        ? (() => {
            const [y, m, d] = care.occurred_on.split('-').map(Number);
            return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
          })()
        : 'Fecha desconocida';
    case 'month_year':
      return `${String(care.occurred_month ?? '').padStart(2, '0')}/${care.occurred_year ?? ''}`;
    case 'year':
      return String(care.occurred_year ?? '');
    default:
      return 'Sin fecha';
  }
};

export function AssetDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const assetId: string | null = route?.params?.assetId ?? null;

  const { session, authMe } = useAuth();
  const { currentHousehold } = useHousehold();
  const plannerSheet = usePlannerSheet();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const { asset, loading, error, errorStatus, reload } = useAssetDetail(accessToken, householdId, assetId);
  const records = useAssetRecords(accessToken, householdId, assetId, 'active');
  const care = useAssetCare(accessToken, householdId, assetId, 'active');
  const lifecycleHistory = useAssetLifecycleHistory(accessToken, householdId, assetId);

  // El backend es la autoridad; la proyección sólo decide qué se muestra.
  const { capabilities } = useAssetsCapabilities(accessToken, householdId);
  const canContribute = canPerform(capabilities, 'assets.context');
  const canManageAssets = canPerform(capabilities, 'assets.manage');
  const canViewAsset = canViewAssets(capabilities);

  // S8-10 — capabilities de HomeCloud (fail-closed: sin proyección no se
  // habilita ninguna acción de archivos). La proyección es la MISMA de
  // HomeCloud; no existe un segundo sistema de capabilities.
  const homeCloud = useHomeCloudCapabilities();
  const homeCloudCapabilities = homeCloud.descriptor;

  // S7-08: capabilities de Planner (fail-closed: sin proyección no se
  // habilita ningún control de escritura).
  const plannerScope = useMemo(
    () => resolvePlannerCapabilityScope({
      accountId: session?.user?.id ?? null,
      householdId: currentHousehold?.id ?? null,
      memberships: authMe?.memberships ?? null,
    }),
    [session?.user?.id, currentHousehold?.id, authMe?.memberships],
  );
  const planner = usePlannerCapabilities(accessToken, plannerScope);
  const canViewPlanner = planner.can('planner.view');
  const canCreatePlannerTask = canContribute && planner.can('task.create_household');
  const canCreatePlannerEvent = canContribute && planner.can('event.create_household');


  const [plusMenu, setPlusMenu] = useState(false);
  const [plannerMenu, setPlannerMenu] = useState(false);
  const [adminMenu, setAdminMenu] = useState(false);
  const [createSheet, setCreateSheet] = useState(false);
  const [editIdentity, setEditIdentity] = useState(false);
  const [contextSheet, setContextSheet] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);
  const [archiveSheet, setArchiveSheet] = useState(false);
  const [unarchiveSheet, setUnarchiveSheet] = useState(false);
  const [trashSheet, setTrashSheet] = useState(false);
  const [restoreSheet, setRestoreSheet] = useState(false);
  const [recordCreate, setRecordCreate] = useState(false);
  const [recordDetail, setRecordDetail] = useState<AssetRecordDto | null>(null);
  const [careCreate, setCareCreate] = useState(false);
  const [careEdit, setCareEdit] = useState<ManualCareDto | null>(null);
  const [careRemove, setCareRemove] = useState<ManualCareDto | null>(null);
  const [historySheet, setHistorySheet] = useState(false);
  // S8 — visor real de HomeCloud + señal del menú "Agregar archivo".
  const [viewerRelation, setViewerRelation] = useState<AssetFileRelation | null>(null);
  const [attachMenuSignal, setAttachMenuSignal] = useState(0);
  // S8-06 — el visor real de HomeCloud se abre sólo con un File disponible.
  const viewerFile = useMemo(
    () => toHomeCloudFileProjection(viewerRelation),
    [viewerRelation],
  );

  React.useEffect(() => {
    navigation.setOptions?.({});
  }, [navigation]);

  // O39: "Volver a Activos" — back normal cuando hay historial; la lista
  // raíz cuando el enlace llegó sin stack (deep-link stale).
  const goBackToAssets = useCallback(() => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('Assets');
  }, [navigation]);

  const handleAssetSaved = useCallback(
    (updated: AssetDto) => {
      reload();
      records.reload();
      care.reload();
    },
    [reload, records, care],
  );

  const isTrashed = asset?.lifecycle_status === 'TRASH';
  const isArchived = asset?.lifecycle_status === 'ARCHIVED';
  const pill = asset ? lifecyclePill(asset.lifecycle_status) : null;
  const isProperty = asset?.profile === 'PROPERTY';

  // S7 — lifecycle: sólo ACTIVE/INACTIVE admiten nuevas programaciones.
  const lifecycleAllowsCreate = !isTrashed && !isArchived;

  /**
   * Motivo de bloqueo congelado (S7). El orden importa: primero el
   * lifecycle, después el permiso de Assets, después el permiso de Planner.
   */
  const plannerBlockedReason = useMemo((): string | undefined => {
    if (isTrashed) return 'Este activo está en la papelera';
    if (isArchived) return 'Los activos archivados no admiten nuevas programaciones';
    if (!canContribute) return 'Necesitás permiso para guardar información';
    if (!canCreatePlannerTask && !canCreatePlannerEvent) {
      return 'Necesitás permiso en Planner para programar tareas';
    }
    return undefined;
  }, [isArchived, isTrashed, canContribute, canCreatePlannerTask, canCreatePlannerEvent]);

  const taskBlockedReason = useMemo((): string | undefined => {
    if (isTrashed) return 'Este activo está en la papelera';
    if (isArchived) return 'Los activos archivados no admiten nuevas programaciones';
    if (!canContribute) return 'Necesitás permiso para guardar información';
    if (!canCreatePlannerTask) return 'Necesitás permiso en Planner para programar tareas';
    return undefined;
  }, [isArchived, isTrashed, canContribute, canCreatePlannerTask]);

  const eventBlockedReason = useMemo((): string | undefined => {
    if (isTrashed) return 'Este activo está en la papelera';
    if (isArchived) return 'Los activos archivados no admiten nuevas programaciones';
    if (!canContribute) return 'Necesitás permiso para guardar información';
    if (!canCreatePlannerEvent) return 'Necesitás permiso en Planner para programar eventos';
    return undefined;
  }, [isArchived, isTrashed, canContribute, canCreatePlannerEvent]);

  // S7 — el composer real de Planner: se abre con la referencia al activo.
  const openPlannerTask = useCallback(() => {
    if (!asset) return;
    plannerSheet.openTaskForm({
      mode: 'create',
      source: 'assets',
      assetRef: { assetId: asset.id, assetName: asset.name },
    });
  }, [asset, plannerSheet]);

  const openPlannerEvent = useCallback(() => {
    if (!asset) return;
    plannerSheet.openEventForm({
      mode: 'create',
      source: 'assets',
      assetRef: { assetId: asset.id, assetName: asset.name },
    });
  }, [asset, plannerSheet]);

  const plusOptions = useMemo<AssetMenuOption[]>(
    () => [
      {
        key: 'record',
        label: 'Guardar información',
        description: 'Garantías, seguros, registros y más',
        icon: 'document-text-outline' as const,
        disabled: isTrashed || !canContribute,
        disabledReason: isTrashed
          ? 'Este activo está en la papelera'
          : !canContribute
            ? 'Necesitás permiso para guardar información'
            : undefined,
        onSelect: () => setRecordCreate(true),
      },
      {
        key: 'care',
        label: 'Registrar algo que pasó',
        description: 'Un hecho real: revisión, reparación, vacuna…',
        icon: 'pulse-outline' as const,
        disabled: isTrashed || !canContribute,
        disabledReason: isTrashed
          ? 'Este activo está en la papelera'
          : !canContribute
            ? 'Necesitás permiso para registrar hechos'
            : undefined,
        onSelect: () => setCareCreate(true),
      },
      {
        key: 'planner',
        label: 'Programar algo',
        description: 'Tareas y eventos en Planner',
        icon: 'calendar-outline' as const,
        disabled: !lifecycleAllowsCreate || !canCreatePlannerTask || !canCreatePlannerEvent,
        disabledReason: plannerBlockedReason,
        onSelect: () => setPlannerMenu(true),
      },
      {
        // S8-19 — "Agregar archivo" vive también en el menú + del activo.
        key: 'file',
        label: 'Agregar archivo',
        description: 'Un archivo de HomeCloud, guardado acá',
        icon: 'attach-outline' as const,
        disabled: isTrashed || isArchived || !canContribute || !homeCloudCapabilities.view,
        disabledReason: isTrashed
          ? 'Este activo está en la papelera'
          : isArchived
            ? 'Los activos archivados no admiten nuevos archivos'
            : !canContribute
              ? 'Necesitás permiso para guardar información'
              : !homeCloudCapabilities.view
                ? 'Necesitás permiso para ver los archivos de HomeCloud'
                : undefined,
        onSelect: () => setAttachMenuSignal((value) => value + 1),
      },
    ],
    [
      isTrashed,
      isArchived,
      canContribute,
      lifecycleAllowsCreate,
      canCreatePlannerTask,
      canCreatePlannerEvent,
      plannerBlockedReason,
      homeCloudCapabilities.view,
    ],
  );

  // S7 — el menú "Programar algo" ofrece exactamente dos destinos. Tarea
  // primero.
  const plannerOptions = useMemo<AssetMenuOption[]>(
    () => [
      {
        key: 'planner-task',
        label: 'Tarea',
        description: 'Una cosa para hacer, con fecha',
        icon: 'checkbox-outline' as const,
        disabled: !lifecycleAllowsCreate || !canCreatePlannerTask,
        disabledReason: taskBlockedReason,
        onSelect: () => openPlannerTask(),
      },
      {
        key: 'planner-event',
        label: 'Evento',
        description: 'Un momento en el calendario',
        icon: 'calendar-outline' as const,
        disabled: !lifecycleAllowsCreate || !canCreatePlannerEvent,
        disabledReason: eventBlockedReason,
        onSelect: () => openPlannerEvent(),
      },
    ],
    [
      lifecycleAllowsCreate,
      canCreatePlannerTask,
      canCreatePlannerEvent,
      taskBlockedReason,
      eventBlockedReason,
      openPlannerTask,
      openPlannerEvent,
    ],
  );

  const adminOptions = useMemo<AssetMenuOption[]>(() => {
    if (!asset) return [];
    const options: AssetMenuOption[] = [];
    if (canContribute) {
      options.push({
        key: 'identity',
        label: 'Editar identidad',
        icon: 'create-outline' as const,
        disabled: isTrashed,
        disabledReason: isTrashed ? 'Los activos en papelera no se editan' : undefined,
        onSelect: () => setEditIdentity(true),
      });
      options.push({
        key: 'status',
        label: 'Cambiar estado',
        description: LIFECYCLE_LABEL[asset.lifecycle_status],
        icon: 'swap-horizontal-outline' as const,
        disabled: isTrashed || isArchived,
        disabledReason: isArchived
          ? 'Primero desarchivalo para cambiar su estado operativo'
          : isTrashed
            ? 'Restauralo primero'
            : undefined,
        onSelect: () => setStatusSheet(true),
      });
    }
    if (canManageAssets) {
      if (isArchived) {
        options.push({
          key: 'unarchive',
          label: 'Desarchivar',
          description: `Vuelve a ${LIFECYCLE_LABEL[asset.archived_from ?? 'ACTIVE']}`,
          icon: 'arrow-undo-outline' as const,
          disabled: false,
          disabledReason: undefined,
          onSelect: () => setUnarchiveSheet(true),
        });
      } else if (!isTrashed) {
        options.push({
          key: 'archive',
          label: 'Archivar',
          description: asset.profile === 'PROPERTY' ? 'Las propiedades con activos dentro requieren resolución' : 'Fuera de uso, recuperable',
          icon: 'archive-outline' as const,
          disabled: false,
          disabledReason: undefined,
          onSelect: () => setArchiveSheet(true),
        });
      }
      if (isTrashed) {
        options.push({
          key: 'restore',
          label: 'Restaurar',
          description: `Vuelve a ${LIFECYCLE_LABEL[asset.trashed_from ?? 'ACTIVE']}`,
          icon: 'arrow-undo-outline' as const,
          disabled: false,
          disabledReason: undefined,
          onSelect: () => setRestoreSheet(true),
        });
      } else {
        options.push({
          key: 'trash',
          label: 'Mover a papelera',
          icon: 'trash-outline' as const,
          destructive: true,
          disabled: false,
          disabledReason: undefined,
          onSelect: () => setTrashSheet(true),
        });
      }
    }
    return options;
  }, [asset, isArchived, isTrashed, canContribute, canManageAssets]);

  // Sin ninguna acción disponible, el menú de administración no se ofrece.
  const canOpenAdminMenu = canContribute || canManageAssets;

  if (!assetId) {
    return (
      <AppScreen scroll>
        <AssetGoneState onBack={goBackToAssets} context="detail" />
      </AppScreen>
    );
  }

  if (loading && !asset) {
    return (
      <AppScreen padded={false} scroll={false}>
        <View style={{ padding: spacing[5], gap: spacing[3], flex: 1 }}>
          <Skeleton style={{ height: 72, borderRadius: radius.lg }} />
          <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
          <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
        </View>
      </AppScreen>
    );
  }

  if (error && !asset) {
    if (errorStatus === 404) {
      return (
        <AppScreen scroll>
          <AssetGoneState onBack={goBackToAssets} context="detail" />
        </AppScreen>
      );
    }
    return (
      <AppScreen scroll>
        <ErrorState
          title="No pudimos cargar este activo"
          description={error}
          onRetry={reload}
        />
      </AppScreen>
    );
  }

  if (!asset) return null;

  const hasRecords = records.records.length > 0;
  const hasCare = care.care.length > 0;
  const isNewAsset = !hasRecords && !hasCare && !asset.holder && !asset.responsible && !asset.placement;

  const contextRows: { key: string; label: string; value: string }[] = [
    {
      key: 'responsible',
      label: 'Responsable',
      value: describeResponsible(asset.responsible) ?? 'Sin definir',
    },
  ];
  if (!isProperty) {
    contextRows.push({
      key: 'holder',
      label: 'Quién lo tiene',
      value: describeHolder(asset.holder) ?? 'Sin definir',
    });
    contextRows.push({
      key: 'placement',
      label: 'Dónde está',
      value: describePlacement(asset.placement) ?? 'Sin definir',
    });
  }

  return (
    <AppScreen padded={false} scroll={false} bottomInset="none">
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back */}
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backBtn}
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          <AppText variant="bodySmall" weight="600">
            Activos
          </AppText>
        </Pressable>

        {/* 1. Identidad */}
        <View style={styles.identityCard}>
          <View style={styles.identityRow}>
            <AssetAvatar profile={asset.profile} size="detail" />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <AppText variant="title2" weight="700" style={styles.assetName}>
                {asset.name}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {PROFILE_LABEL[asset.profile]}
                {describeIdentity(asset) ? ` · ${describeIdentity(asset)}` : ''}
              </AppText>
              {pill ? <StatusBadge label={pill.label} tone={pill.tone} style={{ alignSelf: 'flex-start', marginTop: 4 }} /> : null}
            </View>
          </View>
          <View style={styles.identityActions}>
            <Pressable
              onPress={() => setPlusMenu(true)}
              accessibilityRole="button"
              accessibilityLabel="Agregar a este activo"
              style={styles.identityActionBtn}
            >
              <HomePlusIcon name="add" size={22} color={colors.brand} />
            </Pressable>
            {canOpenAdminMenu ? (
              <Pressable
                onPress={() => setAdminMenu(true)}
                accessibilityRole="button"
                accessibilityLabel="Administración del activo"
                style={styles.identityActionBtn}
              >
                <HomePlusIcon name="ellipsis-horizontal" size={22} color={colors.text.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {isNewAsset ? (
          <View style={styles.invitation}>
            <AppText variant="body" weight="600">
              Empezá a completar su ficha
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              Guardá información importante con +, o definí quién lo tiene y dónde está.
            </AppText>
          </View>
        ) : null}

        {/* 2. Personas y ubicación */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="caption" weight="700" tone="secondary">
              PERSONAS Y UBICACIÓN
            </AppText>
          </View>
          <Pressable
            onPress={() => setContextSheet(true)}
            accessibilityRole="button"
            accessibilityLabel="Editar personas y ubicación"
            disabled={isTrashed || !canContribute}
          >
            <View style={styles.contextCard}>
              {contextRows.map((row, index) => (
                <View key={row.key} style={styles.contextRow}>
                  {index > 0 ? <View style={styles.contextDivider} /> : null}
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" tone="tertiary">
                      {row.label}
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      weight={row.value === 'Sin definir' ? '400' : '600'}
                      tone={row.value === 'Sin definir' ? 'tertiary' : 'primary'}
                    >
                      {row.value}
                    </AppText>
                  </View>
                </View>
              ))}
              {isTrashed || !canContribute ? null : (
                <View style={styles.contextEditHint}>
                  <AppText variant="caption" tone="tertiary">
                    Tocá para editar
                  </AppText>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/*
          S7 — 3. Próximo (read model de Planner para este activo).
          Fail-closed: sin planner.view la sección NO se renderiza (no se
          muestra un vacío falso). El read model es de Assets; las entidades
          son de Planner.
        */}
        {canViewPlanner ? (
          <AssetPlannerItemsSection
            accessToken={accessToken}
            householdId={householdId}
            assetId={asset.id}
            canCreateAny={lifecycleAllowsCreate && (canCreatePlannerTask || canCreatePlannerEvent)}
            onCreateTask={openPlannerTask}
            onCreateEvent={openPlannerEvent}
          />
        ) : null}

        {/* 4. Datos y documentos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="caption" weight="700" tone="secondary">
              DATOS Y DOCUMENTOS
            </AppText>
            {hasRecords ? (
              <Pressable
                onPress={() => navigation.navigate('AssetRecords', { assetId })}
                accessibilityRole="button"
                accessibilityLabel="Ver toda la información"
              >
                <AppText variant="caption" weight="600" tone="brand">
                  Ver todo
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {records.loading && !hasRecords ? (
            <Skeleton style={{ height: 72, borderRadius: radius.lg }} />
          ) : hasRecords ? (
            <View style={styles.recordsCard}>
              {records.records.slice(0, DETAIL_MAX_RECORDS).map((record, index) => (
                <Pressable
                  key={record.id}
                  onPress={async () => {
                    if (!accessToken) return;
                    try {
                      const response = await getAssetRecordById(accessToken, record.id);
                      setRecordDetail(response.record);
                    } catch {
                      setRecordDetail(record);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${record.title}`}
                >
                  <View style={styles.recordRow}>
                    {index > 0 ? <View style={styles.contextDivider} /> : null}
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodySmall" weight="600" numberOfLines={1}>
                        {record.title}
                      </AppText>
                      {record.assets?.length ? (
                        <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                          {record.assets.length > 1
                            ? `Compartido con ${record.assets.length} activos`
                            : record.assets[0].asset_name ?? ''}
                        </AppText>
                      ) : null}
                    </View>
                    <HomePlusIcon
                      name="chevron-forward-outline"
                      size={16}
                      color={colors.text.tertiary}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              onPress={() => setRecordCreate(true)}
              accessibilityRole="button"
              accessibilityLabel="Guardar información de este activo"
              disabled={isTrashed || !canContribute}
            >
              <View style={styles.emptySection}>
                <HomePlusIcon
                  name={ASSET_PROFILE_ICON[asset.profile]}
                  size={20}
                  color={colors.text.tertiary}
                />
                <AppText variant="bodySmall" tone="secondary">
                  Guardá garantías, seguros o cualquier dato importante
                </AppText>
              </View>
            </Pressable>
          )}
        </View>

        {/* 5. Historial */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="caption" weight="700" tone="secondary">
              HISTORIAL
            </AppText>
            {hasCare ? (
              <Pressable
                onPress={() => navigation.navigate('AssetCare', { assetId })}
                accessibilityRole="button"
                accessibilityLabel="Ver historial completo"
              >
                <AppText variant="caption" weight="600" tone="brand">
                  Ver todo
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {care.loading && !hasCare ? (
            <Skeleton style={{ height: 72, borderRadius: radius.lg }} />
          ) : hasCare ? (
            <View style={styles.recordsCard}>
              {care.care.slice(0, DETAIL_MAX_CARE).map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => setCareEdit(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${item.description.slice(0, 40)}`}
                >
                  <View style={styles.recordRow}>
                    {index > 0 ? <View style={styles.contextDivider} /> : null}
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodySmall" weight="600" numberOfLines={2}>
                        {item.description}
                      </AppText>
                      <AppText variant="caption" tone="tertiary">
                        {formatCareDate(item)}
                        {item.provider ? ` · ${item.provider}` : ''}
                      </AppText>
                    </View>
                    <HomePlusIcon
                      name="chevron-forward-outline"
                      size={16}
                      color={colors.text.tertiary}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              onPress={() => setCareCreate(true)}
              accessibilityRole="button"
              accessibilityLabel="Registrar algo que le pasó a este activo"
              disabled={isTrashed || !canContribute}
            >
              <View style={styles.emptySection}>
                <AppText variant="bodySmall" tone="secondary">
                  Registrá reparaciones, revisiones o cuidados
                </AppText>
              </View>
            </Pressable>
          )}
        </View>

        {/* 6. Archivos (S8 — Assets <-> HomeCloud) */}
        <AssetFilesSection
          ownerType="asset"
          ownerId={asset.id}
          ownerTitle={asset.name}
          accessToken={accessToken}
          householdId={householdId}
          canView={canViewAsset}
          canContribute={canContribute}
          homeCloudCapabilities={homeCloudCapabilities}
          ownerLifecycle={asset.lifecycle_status}
          attachMenuSignal={attachMenuSignal}
          onOpenFile={(relation) => setViewerRelation(relation)}
        />

        {/* 7. Lifecycle History (O35) */}
        {lifecycleHistory.error ? (
          <ErrorBar
            visible
            message={lifecycleHistory.error}
            action={{ label: 'Reintentar', onPress: lifecycleHistory.reload }}
          />
        ) : lifecycleHistory.episodes.length > 0 ? (
          <AssetLifecycleHistorySection
            episode={lifecycleHistory.episodes[0]}
            onViewFullHistory={() => setHistorySheet(true)}
          />
        ) : null}
      </ScrollView>

      {/* S8-06 — visor REAL de HomeCloud, montado como capa local sobre la
          misma pantalla. No hay ruta nueva ni protocolo de retorno: al cerrar
          se vuelve a esta misma ficha. */}
      {viewerFile ? (
        <HomeCloudFileViewer
          file={viewerFile}
          accessToken={accessToken ?? ''}
          onClose={() => setViewerRelation(null)}
        />
      ) : null}

      {/* Sheets */}
      <AssetActionMenu
        visible={plusMenu}
        title={asset.name}
        subtitle="¿Qué querés hacer?"
        options={plusOptions}
        onRequestClose={() => setPlusMenu(false)}
      />
      {/* S7 — menú "Programar algo": Tarea o Evento. */}
      <AssetActionMenu
        visible={plannerMenu}
        title="Programar algo"
        subtitle={asset.name}
        options={plannerOptions}
        onRequestClose={() => setPlannerMenu(false)}
      />
      <AssetActionMenu
        visible={adminMenu}
        title="Administración"
        subtitle={asset.name}
        options={adminOptions}
        onRequestClose={() => setAdminMenu(false)}
      />
      <AssetCreateSheet
        visible={createSheet}
        onRequestClose={() => setCreateSheet(false)}
        onCreated={(newId) => {
          setCreateSheet(false);
          navigation.replace?.('AssetsDetail', { assetId: newId });
        }}
      />
      <AssetEditIdentitySheet
        visible={editIdentity}
        asset={asset}
        onRequestClose={() => setEditIdentity(false)}
        onSaved={(updated) => {
          setEditIdentity(false);
          handleAssetSaved(updated);
        }}
        onReconcile={() => {
          setEditIdentity(false);
          reload();
        }}
      />
      <AssetContextSheet
        visible={contextSheet}
        asset={asset}
        canContribute={canContribute}
        onRequestClose={() => setContextSheet(false)}
        onSaved={(updated) => handleAssetSaved(updated)}
      />
      <AssetStatusSheet
        visible={statusSheet}
        asset={asset}
        onRequestClose={() => setStatusSheet(false)}
        onSaved={(updated) => {
          setStatusSheet(false);
          handleAssetSaved(updated);
        }}
      />
      <AssetArchiveSheet
        visible={archiveSheet}
        asset={asset}
        onRequestClose={() => setArchiveSheet(false)}
        onOpenDependent={(dependentId) => {
          setArchiveSheet(false);
          navigation.navigate('AssetsDetail', { assetId: dependentId });
        }}
        onSaved={(updated) => {
          setArchiveSheet(false);
          handleAssetSaved(updated);
        }}
      />
      <AssetUnarchiveSheet
        visible={unarchiveSheet}
        asset={asset}
        onRequestClose={() => setUnarchiveSheet(false)}
        onSaved={(updated) => {
          setUnarchiveSheet(false);
          handleAssetSaved(updated);
        }}
      />
      <AssetTrashSheet
        visible={trashSheet}
        asset={asset}
        onRequestClose={() => setTrashSheet(false)}
        onOpenDependent={(dependentId) => {
          setTrashSheet(false);
          navigation.navigate('AssetsDetail', { assetId: dependentId });
        }}
        onSaved={(updated) => {
          setTrashSheet(false);
          handleAssetSaved(updated);
        }}
      />
      <AssetRestoreSheet
        visible={restoreSheet}
        asset={asset}
        onRequestClose={() => setRestoreSheet(false)}
        onSaved={(updated) => {
          setRestoreSheet(false);
          handleAssetSaved(updated);
        }}
      />
      <AssetRecordCreateSheet
        visible={recordCreate}
        asset={asset}
        onRequestClose={() => setRecordCreate(false)}
        onCreated={() => {
          setRecordCreate(false);
          records.reload();
          reload();
        }}
      />
      <AssetRecordDetailSheet
        visible={recordDetail !== null}
        record={recordDetail}
        assetId={asset.id}
        canManage={canManageAssets}
        canLink={canManageAssets}
        canContribute={canContribute}
        onRequestClose={() => setRecordDetail(null)}
        onChanged={(updated) => {
          setRecordDetail(updated);
          records.reload();
        }}
        onRemoved={() => {
          setRecordDetail(null);
          records.reload();
        }}
      />
      <AssetCareCreateSheet
        visible={careCreate}
        asset={asset}
        onRequestClose={() => setCareCreate(false)}
        onCreated={() => {
          setCareCreate(false);
          care.reload();
        }}
      />
      <AssetCareEditSheet
        visible={careEdit !== null}
        care={careEdit}
        canContribute={canContribute}
        onRemove={
          canManageAssets && careEdit ? (target: ManualCareDto) => setCareRemove(target) : undefined
        }
        onRequestClose={() => setCareEdit(null)}
        onSaved={() => {
          setCareEdit(null);
          care.reload();
        }}
      />
       <AssetCareRemoveSheet
         visible={careRemove !== null}
         care={careRemove}
         ownerTrashed={isTrashed}
         onRequestClose={() => setCareRemove(null)}
         onRemoved={() => {
           setCareRemove(null);
           care.reload();
         }}
       />
       <AssetLifecycleHistorySheet
         visible={historySheet}
         episodes={lifecycleHistory.episodes}
         loading={lifecycleHistory.loading}
         onClose={() => setHistorySheet(false)}
         onRetry={lifecycleHistory.reload}
       />
     </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[5], gap: 22, paddingBottom: 48 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  identityRow: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  assetName: { fontSize: 20, lineHeight: 26 },
  identityActions: { flexDirection: 'row', gap: 4 },
  identityActionBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  invitation: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
    gap: 6,
  },
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 16,
  },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contextDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: 10,
  },
  contextEditHint: { paddingTop: 10, alignItems: 'flex-end' },
  recordsCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 16,
  },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptySection: {
    backgroundColor: colors.surface.soft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
