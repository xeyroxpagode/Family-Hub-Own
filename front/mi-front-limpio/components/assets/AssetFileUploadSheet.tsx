/**
 * HOMePLUS Assets — S8-05: upload a NEW File and attach it to an owner.
 *
 * The upload engine is NOT duplicated: this surface drives the EXISTING
 * HomeCloud intake (`createFileIntakeService` -> `homecloudUploadEngine` ->
 * the durable HomeCloud job store). The order is the frozen one:
 *
 *   1. create the intent            (ONE identity per user intent)
 *   2. POST /api/homecloud/register
 *   3. upload the original          (canonical HomeCloud engine)
 *   4. POST /api/homecloud/content/:id/verify
 *   5. POST /api/homecloud/content/:id/finalize
 *   6. POST /api/assets/files/link
 *
 * HomeCloud FIRST. The Assets relation is created AFTER the File is ACTIVE.
 * It is NEVER relation-first.
 *
 * IDENTITY (frozen): `intakeRequestId = 'intake_assets_attach_' + <Assets
 * Idempotency-Key>`. The same user intent therefore resolves to the SAME
 * contentId, and a retry NEVER registers a second File.
 *
 * CANCELLATION: cancelling the upload never creates an Assets relation. The
 * HomeCloud staging cleanup stays HomeCloud's responsibility.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { AssetFormSheet } from './AssetSheet';
import { ErrorBar } from './ErrorBar';
import { createFileIntakeService } from '../../services/homecloud/homecloudFileIntakeService';
import type { FileIntakeState } from '../../services/homecloud/homecloudFileIntakeTypes';
import { FileMoveDestinationPicker } from '../../services/homecloud/FileMoveDestinationPicker';
import { fetchHomeCloudFoldersCached } from '../../services/homecloud/homecloudReadService';
import type { HomeCloudFolder } from '../../services/homecloud/homecloudTypes';
import type { HomeCloudCapabilityDescriptor } from '../../services/homecloud/homecloudCapabilitiesAdapter';
import {
  assetsFileAttachErrorCopy,
  attachExistingHomeCloudFile,
  classifyAssetsFileAttachFailure,
  createAssetsFileAttachIntent,
  isHomeCloudFileTooLarge,
  reconcileAssetsFileAttach,
  type AssetsFileAttachIntent,
  type AssetsFileAttachOwner,
} from '../../services/assets/fileAttach';

export function AssetFileUploadSheet({
  visible,
  accessToken,
  householdId,
  owner,
  homeCloudCapabilities,
  onRequestClose,
  onAttached,
}: {
  visible: boolean;
  accessToken: string | null;
  householdId: string | null;
  owner: AssetsFileAttachOwner;
  homeCloudCapabilities: HomeCloudCapabilityDescriptor;
  onRequestClose: () => void;
  /** Called with the HomeCloud content id once the relation is created. */
  onAttached: (fileId: string) => void;
}) {
  const theme = useAppTheme();

  const [intakeState, setIntakeState] = useState<FileIntakeState>({ status: 'idle' });
  const [folders, setFolders] = useState<HomeCloudFolder[]>([]);
  const [destinationVisible, setDestinationVisible] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<{ message: string; action: 'retry' | 'reconcile' | 'none'; dismissLabel: string } | null>(null);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);

  // The ONE identity of this attach intent. It survives every retry.
  const [intent, setIntent] = useState<AssetsFileAttachIntent | null>(null);
  const contentIdRef = useRef<string | null>(null);
  const linkedRef = useRef(false);
  const linkedFileIdRef = useRef<string | null>(null);

  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const getAccessToken = useCallback(() => accessTokenRef.current ?? null, []);

  const service = useMemo(() => {
    if (!householdId || !intent) return null;
    return createFileIntakeService(
      {
        householdId,
        accessToken: accessTokenRef.current ?? '',
        getAccessToken,
        capabilities: homeCloudCapabilities,
        intakeSource: 'assets:attach',
        // The pinned intake identity is what makes the retry resolve to the SAME
        // contentId instead of registering a second File.
        intakeRequestId: intent.intakeRequestId,
      },
      {
        // The size pre-check avoids starting a transfer the server is going to
        // refuse. The BACKEND stays the authority (413 file_too_large).
        pickFile: async () => {
          const { pickFile } = await import('../../services/homecloud/homecloudFilePicker');
          const outcome = await pickFile();
          if (outcome.success) {
            const oversized = outcome.artifacts.find((artifact) =>
              isHomeCloudFileTooLarge(artifact.sizeBytes),
            );
            if (oversized) {
              return {
                success: false,
                cancelled: false,
                error: assetsFileAttachErrorCopy('too_large').message,
              };
            }
          }
          return outcome;
        },
      },
    );
  }, [getAccessToken, homeCloudCapabilities, householdId, intent]);

  // Reset the intent when the sheet opens for a NEW user intent.
  useEffect(() => {
    if (!visible) return;
    setIntent(createAssetsFileAttachIntent());
    contentIdRef.current = null;
    linkedRef.current = false;
    linkedFileIdRef.current = null;
    setIntakeState({ status: 'idle' });
    setFileError(null);
    setLinking(false);
    setLinked(false);
    setCurrentFolderId(null);
    setCurrentFolderName(null);
  }, [visible]);

  useEffect(() => {
    if (!service) return;
    const unsubscribe = service.subscribe(setIntakeState);
    void service.loadFolders();
    void service.recover();
    return unsubscribe;
  }, [service]);

  const attach = useCallback(
    async (contentId: string) => {
      if (!accessToken || !householdId || !service || !intent) return;
      setLinking(true);
      setFileError(null);
      const outcome = await attachExistingHomeCloudFile({
        accessToken,
        householdId,
        owner,
        fileId: contentId,
        intent,
      });
      setLinking(false);
      if (outcome.status === 'linked') {
        linkedRef.current = true;
        linkedFileIdRef.current = contentId;
        setLinked(true);
        onAttached(contentId);
        return;
      }
      const copy = assetsFileAttachErrorCopy(classifyAssetsFileAttachFailure(outcome.failure));
      setFileError(copy);
    },
    [accessToken, householdId, intent, onAttached, owner, service],
  );

  // The upload finished: link the File (HomeCloud FIRST is already respected).
  useEffect(() => {
    const contentId = intakeState.contentId;
    if (!contentId || linkedRef.current || linking) return;
    if (intakeState.status !== 'completed') return;
    contentIdRef.current = contentId;
    void attach(contentId);
  }, [attach, intakeState.contentId, intakeState.status, linking]);

  const retryFileOnly = useCallback(async () => {
    if (!accessToken || !householdId || !service || !intent) return;
    setFileError(null);
    setLinking(true);
    const outcome = await reconcileAssetsFileAttach({
      accessToken,
      householdId,
      owner,
      intent,
      contentId: contentIdRef.current ?? intakeState.contentId ?? null,
    });
    setLinking(false);
    if (outcome.status === 'linked') {
      linkedRef.current = true;
      setLinked(true);
      onAttached(outcome.relation.file_id);
      return;
    }
    const copy = assetsFileAttachErrorCopy(classifyAssetsFileAttachFailure(outcome.failure));
    setFileError(copy);
    if (outcome.phase === 'FILE_UPLOADING') {
      // The File is not linkable yet: RESUME the SAME durable job.
      await service.retry();
    }
  }, [accessToken, householdId, intent, intakeState.contentId, onAttached, owner, service]);

  const handlePick = useCallback(async () => {
    if (!service) return;
    setFileError(null);
    await service.pickFile();
  }, [service]);

  const handleCancelUpload = useCallback(() => {
    if (!service) return;
    const jobId = intakeState.jobId ?? undefined;
    service.cancel(jobId);
    // A cancelled upload NEVER creates an Assets relation.
    setFileError(null);
  }, [intakeState.jobId, service]);

  const handleSelectDestination = useCallback(
    (folderId: string | null) => {
      if (!service) return;
      const normalized = folderId === 'root' ? null : folderId;
      const name = normalized
        ? folders.find((folder) => folder.id === normalized)?.name ?? null
        : null;
      service.selectDestination(normalized, name);
      setCurrentFolderId(normalized);
      setCurrentFolderName(name);
      setDestinationVisible(false);
    },
    [folders, service],
  );

  const openDestinations = useCallback(async () => {
    if (!service || !accessToken || !householdId) return;
    try {
      const catalogue = await fetchHomeCloudFoldersCached(accessToken, { householdId });
      setFolders(catalogue);
    } catch {
      setFolders([]);
    }
    setDestinationVisible(true);
  }, [accessToken, householdId, service]);

  const items = intakeState.items ?? [];
  const busy =
    intakeState.status === 'picking' ||
    intakeState.status === 'preparing' ||
    intakeState.status === 'uploading' ||
    intakeState.status === 'verifying' ||
    intakeState.status === 'finalizing';

  return (
    <AssetFormSheet
      visible={visible}
      title="Subir un archivo"
      subtitle="Se guarda en HomeCloud y queda agregado acá"
      onRequestClose={onRequestClose}
      closeDisabled={busy || linking}
      footer={
        fileError ? (
          <View style={{ gap: theme.spacing[2] }}>
            <ErrorBar
              visible
              message={fileError.message}
              action={
                fileError.action === 'none'
                  ? undefined
                  : { label: 'Reintentar', onPress: () => void retryFileOnly() }
              }
              dismissible
              onDismiss={() => {
                // FILE_ABANDONED: the File is NEVER deleted by discarding it.
                setFileError(null);
              }}
              testID="assets-file-upload-error"
            />
            <AppButton
              variant="ghost"
              size="sm"
              title={fileError.dismissLabel}
              onPress={() => {
                setFileError(null);
                onRequestClose();
              }}
              accessibilityLabel={fileError.dismissLabel}
            />
          </View>
        ) : (
          <AppButton
            variant="primary"
            title={linked ? 'Listo' : busy ? 'Subiendo…' : 'Elegir archivo'}
            loading={busy || linking}
            disabled={busy || linking || linked || !homeCloudCapabilities.contribute}
            onPress={() => void handlePick()}
            accessibilityLabel="Elegir archivo para subir"
          />
        )
      }
    >
      <View style={{ gap: theme.spacing[3] }}>
        {!homeCloudCapabilities.contribute ? (
          <AppText variant="bodySmall" tone="secondary">
            No tenés permiso para subir archivos a HomeCloud.
          </AppText>
        ) : null}

        {items.length > 0 ? (
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.jobId} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="600" numberOfLines={1}>
                    {item.displayName}
                  </AppText>
                  <AppText
                    variant="caption"
                    tone={item.status === 'failed' ? 'danger' : item.status === 'completed' ? 'success' : 'secondary'}
                  >
                    {item.status === 'completed'
                      ? 'Guardado en HomeCloud'
                      : item.status === 'failed'
                        ? item.error ?? 'No se pudo subir'
                        : item.status === 'uploading'
                          ? `Subiendo${typeof item.progress === 'number' ? ` ${Math.round(item.progress * 100)}%` : '…'}`
                          : item.status === 'verifying'
                            ? 'Verificando…'
                            : item.status === 'finalizing'
                              ? 'Guardando…'
                              : 'Preparando…'}
                  </AppText>
                </View>
                {busy ? (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    title="Cancelar"
                    onPress={handleCancelUpload}
                    accessibilityLabel={`Cancelar la subida de ${item.displayName}`}
                  />
                ) : null}
                {item.retryable ? (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    title="Reintentar"
                    onPress={() => void retryFileOnly()}
                    accessibilityLabel={`Reintentar la subida de ${item.displayName}`}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {folders.length > 0 ? (
          <AppButton
            variant="ghost"
            size="sm"
            title={currentFolderName ? `Guardar en ${currentFolderName}` : 'Guardar en Archivos'}
            onPress={() => void openDestinations()}
            disabled={busy || linking}
            accessibilityLabel="Elegir carpeta de destino"
          />
        ) : null}

        {linked ? (
          <AppText variant="bodySmall" tone="success">
            El archivo quedó agregado.
          </AppText>
        ) : null}
      </View>

      <FileMoveDestinationPicker
        visible={destinationVisible}
        title="Guardar en"
        folders={folders}
        currentFolderId={currentFolderId}
        onSelect={handleSelectDestination}
        onClose={() => setDestinationVisible(false)}
      />
    </AssetFormSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
