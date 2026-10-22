/**
 * HOMePLUS Assets — S8: the Files section of an Asset / Record / Care.
 *
 * It is ONE section reused by the three owner kinds: the owner kind only
 * changes the endpoint, the copy of the owner noun and the lifecycle gate.
 *
 * PERMISSIONS (frozen, fail closed):
 *   - no `assets.view`      -> the Assets surface itself is inaccessible.
 *   - no `homecloud.view`   -> the section does NOT render at all. There is no
 *                              fake empty state and no leaked name.
 *   - no `assets.contribute` -> "Agregar archivo" is disabled with
 *                              "Necesitás permiso para guardar información".
 *   - no `homecloud.view`   -> "Elegir de HomeCloud" is disabled with
 *                              "Necesitás permiso para ver los archivos de HomeCloud".
 *   - no `homecloud.contribute` -> "Subir un archivo" is disabled with
 *                              "Necesitás permiso para subir archivos a HomeCloud".
 *
 * The viewer is NOT rendered here: the surface that owns this section mounts
 * the REAL HomeCloud viewer (there is no Assets viewer and no new route).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { UndoToast } from '../ui/UndoToast';
import { AssetActionMenu, type AssetMenuOption } from './AssetSheet';
import { AssetFilePickerSheet } from './AssetFilePickerSheet';
import { AssetFileRow } from './AssetFileRow';
import { AssetFileUnlinkSheet } from './AssetFileUnlinkSheet';
import { AssetFileUploadSheet } from './AssetFileUploadSheet';
import { ErrorBar } from './ErrorBar';
import { useAssetFiles } from '../../hooks/assets/useAssetFiles';
import {
  invalidateAssetFiles,
  unlinkAssetFile,
  type AssetFileIncludeScope,
  type AssetFileOwnerType,
  type AssetFileRelation,
} from '../../services/assets/assetsFiles';
import { assetFileOwnerStatus } from './AssetFileRow';
import {
  createAssetsFileAttachIntent,
  attachExistingHomeCloudFile,
} from '../../services/assets/fileAttach';
import type { HomeCloudCapabilityDescriptor } from '../../services/homecloud/homecloudCapabilitiesAdapter';

/** The owner lifecycle that gates attach/unlink. */
export type AssetFileOwnerLifecycle =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ARCHIVED'
  | 'TRASH'
  | 'REMOVED'
  | null
  | undefined;

/** The frozen toast of a duplicate attach. */
export const ASSET_FILE_DUPLICATE_TOAST = 'Este archivo ya estaba agregado';

export function AssetFilesSection({
  ownerType,
  ownerId,
  ownerTitle,
  accessToken,
  householdId,
  canView,
  canContribute,
  homeCloudCapabilities,
  ownerLifecycle = null,
  attachMenuSignal,
  onOpenFile,
  onFilesChanged,
}: {
  ownerType: AssetFileOwnerType;
  ownerId: string | null;
  ownerTitle?: string | null;
  accessToken: string | null;
  householdId: string | null;
  /** assets.view */
  canView: boolean;
  /** assets.contribute */
  canContribute: boolean;
  homeCloudCapabilities: HomeCloudCapabilityDescriptor;
  ownerLifecycle?: AssetFileOwnerLifecycle;
  /**
   * Increment this counter to open the "Agregar archivo" menu from OUTSIDE
   * this section (the Asset `+` menu). It never opens a second menu.
   */
  attachMenuSignal?: number;
  /** Opens the REAL HomeCloud viewer (owned by the surface). */
  onOpenFile?: (relation: AssetFileRelation) => void;
  onFilesChanged?: () => void;
}) {
  const theme = useAppTheme();
  // S9 — the Asset owner reads the AGGREGATED read model (the direct Files
  // plus the Files owned by its Records and its Care). The Record and the
  // Care owners have no children: they always read the direct list.
  const includeScope: AssetFileIncludeScope = ownerType === 'asset' ? 'all' : 'direct';
  const { files, loading, error, reload } = useAssetFiles(
    accessToken,
    householdId,
    ownerType,
    ownerId,
    includeScope,
  );

  const [menuVisible, setMenuVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<AssetFileRelation | null>(null);
  const [unlinkPending, setUnlinkPending] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // S9 — the aggregated view is a SECONDARY control: the direct Files stay
  // primary and the section is not overwhelmed.
  const [showAllFiles, setShowAllFiles] = useState(false);

  // S9 — the direct Files and the Files owned by the Records/Care of THIS
  // Asset. The ownership never changes: a Record file stays a Record file.
  const directFiles = useMemo(
    () => files.filter((relation) => relation.owner_type === 'asset'),
    [files],
  );
  const relatedFiles = useMemo(
    () => files.filter((relation) => relation.owner_type !== 'asset'),
    [files],
  );
  const visibleFiles = showAllFiles ? files : directFiles;

  // The owner lifecycle gate (frozen):
  //   ACTIVE / INACTIVE -> attach and unlink are allowed.
  //   ARCHIVED           -> attach is blocked, unlink is allowed.
  //   TRASH / REMOVED    -> attach AND unlink are blocked (writes are frozen).
  const attachBlocked = ownerLifecycle === 'ARCHIVED' || ownerLifecycle === 'TRASH' || ownerLifecycle === 'REMOVED';
  const unlinkBlocked = ownerLifecycle === 'TRASH' || ownerLifecycle === 'REMOVED';

  const attachBlockedReason = useMemo(() => {
    if (!attachBlocked) return undefined;
    if (ownerLifecycle === 'ARCHIVED') return 'En un activo archivado no se pueden agregar archivos.';
    return 'Este registro está en la papelera: no se pueden agregar archivos.';
  }, [attachBlocked, ownerLifecycle]);

  const refresh = useCallback(() => {
    reload();
    onFilesChanged?.();
  }, [onFilesChanged, reload]);

  /**
   * The owner identity is STABLE.
   *
   * It travels to the upload sheet, whose callbacks depend on it: an inline
   * object literal would change identity on every render and re-arm the
   * "upload finished -> link" effect forever (a maximum-update-depth loop).
   */
  const owner = useMemo(
    () => ({ ownerType, ownerId: ownerId ?? '' }),
    [ownerId, ownerType],
  );

  const handleAttached = useCallback(() => refresh(), [refresh]);

  const handleOpenFile = useCallback(
    (relation: AssetFileRelation) => onOpenFile?.(relation),
    [onOpenFile],
  );

  /**
   * S9 — the unlink gate of ONE relation.
   *
   * The Asset owner follows the section gate. A Record/Care owner that was
   * REMOVED freezes its writes: its Files can be seen but NOT detached.
   */
  const relationAllowsUnlink = useCallback(
    (relation: AssetFileRelation): boolean => {
      if (relation.owner_type === 'asset') return true;
      return assetFileOwnerStatus(relation) !== 'REMOVED';
    },
    [],
  );

  // The Asset `+` menu can open THIS menu (one menu, never two).
  const lastSignal = useRef(attachMenuSignal ?? 0);
  useEffect(() => {
    if (attachMenuSignal === undefined) return;
    if (attachMenuSignal === lastSignal.current) return;
    lastSignal.current = attachMenuSignal;
    setMenuVisible(true);
  }, [attachMenuSignal]);

  const attachExisting = useCallback(
    async (fileId: string) => {
      if (!accessToken || !householdId || !ownerId) return;
      setPickerVisible(false);
      setAttachError(null);
      const intent = createAssetsFileAttachIntent();
      const outcome = await attachExistingHomeCloudFile({
        accessToken,
        householdId,
        owner: { ownerType, ownerId },
        fileId,
        intent,
      });
      if (outcome.status === 'linked') {
        if (outcome.duplicate) {
          setToast(ASSET_FILE_DUPLICATE_TOAST);
        }
        refresh();
        return;
      }
      setAttachError(outcome.failure.message);
    },
    [accessToken, householdId, ownerId, ownerType, refresh],
  );

  const confirmUnlink = useCallback(async () => {
    if (!accessToken || !householdId || !ownerId || !unlinkTarget) return;
    setUnlinkPending(true);
    setUnlinkError(null);
    const intent = createAssetsFileAttachIntent();
    try {
      // S9 — the unlink acts on the REAL owner relation of the row: a Record
      // file is detached from its Record, a Care file from its Care. It is
      // NEVER detached from the Asset.
      const target = unlinkTarget;
      const response = await unlinkAssetFile(
        accessToken,
        {
          owner_type: target.owner_type,
          owner_id: target.owner_id,
          file_id: target.file_id,
        },
        { intent: { mutationId: intent.mutationId, idempotencyKey: intent.idempotencyKey } },
      );
      setUnlinkPending(false);
      setUnlinkTarget(null);
      if (response.already_removed) {
        // A repeated unlink is idempotent, never an error.
        setToast('El archivo ya estaba quitado.');
      }
      // The detached owner and the Asset aggregated list are both stale.
      invalidateAssetFiles({ householdId }, target.owner_type, target.owner_id);
      if (ownerType === 'asset' && target.owner_type !== 'asset') {
        invalidateAssetFiles({ householdId }, 'asset', ownerId);
      }
      refresh();
    } catch (caught) {
      setUnlinkPending(false);
      const message =
        caught && typeof caught === 'object' && 'message' in caught
          ? String((caught as { message: unknown }).message)
          : 'No pudimos quitar el archivo.';
      setUnlinkError(message);
    }
  }, [accessToken, householdId, ownerId, unlinkTarget, ownerType, refresh]);

  if (!canView || !homeCloudCapabilities.view) return null;

  const menuOptions: AssetMenuOption[] = [
    {
      key: 'pick',
      label: 'Elegir de HomeCloud',
      description: 'Un archivo que ya está en HomeCloud',
      icon: 'folder-open-outline',
      disabled: !homeCloudCapabilities.view,
      disabledReason: 'Necesitás permiso para ver los archivos de HomeCloud',
      onSelect: () => setPickerVisible(true),
    },
    {
      key: 'upload',
      label: 'Subir un archivo',
      description: 'Se guarda en HomeCloud y queda agregado acá',
      icon: 'cloud-upload-outline',
      disabled: !homeCloudCapabilities.contribute,
      disabledReason: 'Necesitás permiso para subir archivos a HomeCloud',
      onSelect: () => setUploadVisible(true),
    },
  ];

  return (
    <View style={{ gap: theme.spacing[3] }}>
      <View style={styles.header}>
        <AppText variant="caption" weight="700" tone="tertiary">
          ARCHIVOS
        </AppText>
        <AppButton
          variant="secondary"
          size="sm"
          title="Agregar archivo"
          disabled={!canContribute || attachBlocked}
          onPress={() => setMenuVisible(true)}
          accessibilityLabel="Agregar archivo"
          accessibilityHint={
            !canContribute
              ? 'Necesitás permiso para guardar información'
              : attachBlocked
                ? attachBlockedReason
                : undefined
          }
        />
      </View>

      {!canContribute ? (
        <AppText variant="caption" tone="secondary">
          Necesitás permiso para guardar información
        </AppText>
      ) : attachBlocked ? (
        <AppText variant="caption" tone="secondary">
          {attachBlockedReason}
        </AppText>
      ) : null}

      <ErrorBar
        visible={error !== null}
        message={error ?? ''}
        action={{ label: 'Reintentar', onPress: () => reload() }}
      />

      <ErrorBar
        visible={attachError !== null}
        message={attachError ?? ''}
        testID="assets-files-attach-error"
      />

      {loading && files.length === 0 ? (
        <AppText variant="bodySmall" tone="tertiary">
          Cargando archivos…
        </AppText>
      ) : files.length === 0 ? (
        <AppText variant="bodySmall" tone="secondary">
          Todavía no hay archivos agregados.
        </AppText>
      ) : (
        <>
          {/* S9 — the secondary control: it appears ONLY when the Records or
              the Care of this Asset own files. The direct Files stay
              primary. */}
          {relatedFiles.length > 0 ? (
            <AppButton
              variant="ghost"
              size="sm"
              title={showAllFiles ? 'Ver sólo los archivos del activo' : `Todos los archivos (${files.length})`}
              onPress={() => setShowAllFiles((current) => !current)}
              accessibilityLabel={
                showAllFiles
                  ? 'Ver sólo los archivos del activo'
                  : `Ver todos los archivos del activo (${files.length})`
              }
            />
          ) : null}
          <View style={styles.list}>
            {visibleFiles.map((relation) => (
              <AssetFileRow
                key={relation.relation_id}
                relation={relation}
                showOwner={showAllFiles}
                canUnlink={!unlinkBlocked && canContribute && relationAllowsUnlink(relation)}
                onPress={
                  relation.state === 'available' && onOpenFile
                    ? () => handleOpenFile(relation)
                    : undefined
                }
                onUnlink={
                  !unlinkBlocked && canContribute && relationAllowsUnlink(relation)
                    ? () => setUnlinkTarget(relation)
                    : undefined
                }
              />
            ))}
          </View>
          {showAllFiles ? (
            <AppText variant="caption" tone="tertiary">
              Los archivos de registros y cuidados siguen siendo de esos: quitarlos acá los saca de
              su dueño real.
            </AppText>
          ) : null}
        </>
      )}

      <AssetActionMenu
        visible={menuVisible}
        title="Agregar archivo"
        subtitle={ownerTitle ?? undefined}
        options={menuOptions}
        onRequestClose={() => setMenuVisible(false)}
      />

      <AssetFilePickerSheet
        visible={pickerVisible}
        accessToken={accessToken}
        onRequestClose={() => setPickerVisible(false)}
        onSelected={(fileId) => void attachExisting(fileId)}
      />

      <AssetFileUploadSheet
        visible={uploadVisible}
        accessToken={accessToken}
        householdId={householdId}
        owner={owner}
        homeCloudCapabilities={homeCloudCapabilities}
        onRequestClose={() => setUploadVisible(false)}
        onAttached={handleAttached}
      />

      <AssetFileUnlinkSheet
        visible={unlinkTarget !== null}
        ownerType={unlinkTarget?.owner_type ?? ownerType}
        pending={unlinkPending}
        onCancel={() => {
          setUnlinkTarget(null);
          setUnlinkError(null);
        }}
        onConfirm={() => void confirmUnlink()}
      />

      {unlinkError ? <ErrorBar visible message={unlinkError} /> : null}

      <UndoToast
        visible={toast !== null}
        message={toast ?? ''}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  list: {
    gap: 8,
  },
});
