import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { ActionSheet, FormActionRow } from '../../components/ui/ActionSheet';
import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing, radius, touchTargets } from '../../constants/theme';
import { createFileIntakeService } from './homecloudFileIntakeService';
import type { FileIntakeConfig, FileIntakeState, FileIntakeDestination } from './homecloudFileIntakeTypes';

export interface FileIntakeProps {
  config: FileIntakeConfig;
  onComplete?: (contentId: string) => void;
  onDismiss?: () => void;
}

export function FileIntake({ config, onComplete, onDismiss }: FileIntakeProps) {
  const { householdId, capabilities, initialFolderId, initialFolderName, intakeSource } = config;
  const accessTokenRef = React.useRef(config.accessToken);
  accessTokenRef.current = config.accessToken;
  const getAccessToken = React.useCallback(() => accessTokenRef.current || null, []);
  const [state, setState] = useState<FileIntakeState>({ status: 'idle' });
  const [destinationSheetVisible, setDestinationSheetVisible] = useState(false);
  const [destinations, setDestinations] = useState<FileIntakeDestination[]>([]);
  const [showInitialDestination, setShowInitialDestination] = useState(false);

  const service = React.useMemo(() => createFileIntakeService({
    householdId,
    // Long-running work reads the live ref through getAccessToken. This field
    // only preserves the config shape for the service's initial construction.
    accessToken: accessTokenRef.current,
    getAccessToken,
    capabilities,
    initialFolderId,
    initialFolderName,
    intakeSource,
  }), [
    householdId,
    getAccessToken,
    capabilities,
    initialFolderId,
    initialFolderName,
    intakeSource,
  ]);

  useEffect(() => {
    const unsubscribe = service.subscribe(setState);
    service.loadFolders().then(() => {
      setDestinations(service.getAvailableDestinations());
      const initial = service.getInitialFolder();
      setShowInitialDestination(initial.folderId !== null);
    });
    // Canonical shared recovery: resume interrupted durable jobs (if any)
    // for this Household instead of stranding them on every remount.
    void service.recover();
    return unsubscribe;
  }, [service]);

  useEffect(() => {
    if (state.status === 'completed' && state.contentId) {
      onComplete?.(state.contentId);
    }
  }, [state.status, state.contentId, onComplete]);

  /**
   * S4-iii D — release the job binding only when the accepted job is really over.
   *
   * `completed` and `cancelled` are terminal, so nothing about them can change
   * any more and the surface must be ready to open again. `failed` is NOT: it is
   * retryable, and Retry and Cancel both target `acceptedJobId`, so the binding
   * has to survive it.
   */
  useEffect(() => {
    if (state.status === 'completed' || state.status === 'cancelled') service.dismiss();
  }, [state.status, service]);

  const handlePickFile = useCallback(async () => {
    await service.pickFile();
    // S4-iii D: durable acceptance transfers EXECUTION to the household
    // coordinator, but PRESENTATION ownership stays with THIS surface until the
    // accepted job is terminal. Dismissing here released `acceptedJobId`, which
    // left the Files surface with nothing to show and nothing legitimate to
    // cancel — the only way back to "an upload is happening" would have been a
    // household-wide guess, which is exactly what Gap D forbids. Closing this UI
    // still never cancels the job nor deletes its durable artifact.
  }, [service]);

  const handleSelectDestination = useCallback((folderId: string | null, folderName: string | null) => {
    service.selectDestination(folderId, folderName);
    setDestinations(service.getAvailableDestinations());
    setDestinationSheetVisible(false);
  }, [service]);

  const handleRetry = useCallback(async () => {
    await service.retry();
  }, [service]);

  const handleCancel = useCallback(() => {
    // S4-iii D: the service resolves this to the job THIS surface accepted.
    // There is no household-wide or "first file job" fallback behind it.
    service.cancel();
  }, [service]);

  const renderStatus = () => {
    const owned = Boolean(state.jobId);
    // S4-iii D: ONE control row for every state in which the accepted job still
    // exists and is not over. The label carries that job's own id, so the action
    // can never be read as "cancel whatever is uploading".
    const cancelControl = owned ? (
      <AppButton
        title="Cancelar"
        size="sm"
        variant="secondary"
        onPress={handleCancel}
        accessibilityLabel={`Cancelar la subida de ${state.jobId}`}
      />
    ) : null;

    switch (state.status) {
      case 'preparing':
        return (
          <View style={styles.progressRow}>
            <AppText variant="bodySmall" tone="secondary">Preparando…</AppText>
            {cancelControl}
          </View>
        );
      case 'uploading':
      case 'verifying':
      case 'finalizing':
        return (
          <View style={styles.progressRow}>
            <AppText variant="bodySmall" tone="secondary">
              {state.status === 'uploading' ? 'Subiendo…' : state.status === 'verifying' ? 'Verificando…' : 'Guardando…'}
              {/* S4-iii D: the percentage is the ACCEPTED job's own live
                  progress. `getOwnedProgress` is identity-bound to
                  `acceptedJobId`, so another surface's upload can never be
                  shown here as this file's. */}
              {typeof state.progress === 'number' ? ` ${Math.round(state.progress * 100)}%` : ''}
            </AppText>
            {cancelControl}
          </View>
        );
      case 'completed':
        return <AppText variant="bodySmall" tone="success">Guardado</AppText>;
      case 'failed':
        return (
          <View style={styles.errorContainer}>
            <AppText variant="body" weight="700" tone="danger">{state.error ?? 'No pudimos guardar el archivo'}</AppText>
            {__DEV__ && state.error ? (
              <AppText variant="caption" tone="secondary" style={styles.errorText}>
                Detalle tecnico: {state.error}
              </AppText>
            ) : null}
            <AppButton
              title="Reintentar"
              size="sm"
              variant="secondary"
              onPress={handleRetry}
              accessibilityLabel="Reintentar guardar archivo"
              style={styles.retryButton}
            />
            {/* S4-iii D: the failure belongs to `state.jobId`, so the retry that
                follows resumes THAT job — and Cancel stops THAT job. */}
            {cancelControl}
          </View>
        );
      case 'cancelled':
        return null;
      default:
        return null;
    }
  };

  /**
   * S4-iii A — the destination list is re-read when it is actually needed.
   *
   * A folder created, renamed or deleted while this sheet stayed open used to
   * leave the picker offering the catalogue captured at mount. `loadFolders`
   * goes through the household-scoped cached read, which a mutation invalidates,
   * so this is one request per change and a fresh list at the moment the member
   * opens the picker.
   */
  const openDestinationPicker = useCallback(async () => {
    await service.loadFolders();
    setDestinations(service.getAvailableDestinations());
    setDestinationSheetVisible(true);
  }, [service]);

  const renderDestinationSelector = () => {
    if (!service.canShowDestinationSelector()) return null;

    const initial = service.getInitialFolder();
    const currentName = initial.folderName ?? 'Archivos';

    return (
      <FormActionRow
        label="Guardar en"
        value={currentName}
        onPress={() => {
          Keyboard.dismiss();
          void openDestinationPicker();
        }}
        accessibilityLabel={`Destino actual: ${currentName}. Toca para cambiar.`}
        disabled={state.status !== 'idle' && state.status !== 'failed' && state.status !== 'completed'}
      />
    );
  };

  const renderDestinationSheet = () => {
    if (!destinationSheetVisible) return null;

    return (
      <ActionSheet
        visible={true}
        title="Guardar en"
        onRequestClose={() => setDestinationSheetVisible(false)}
        size="content"
      >
        <View style={styles.destinationList}>
          {destinations.map((dest) => (
            <View
              key={dest.id}
              style={[
                styles.destinationRow,
                dest.isCurrent && styles.destinationRowSelected,
              ]}
            >
              <AppButton
                variant="icon"
                size="sm"
                onPress={() => handleSelectDestination(dest.id === 'root' ? null : dest.id, dest.id === 'root' ? null : dest.name)}
                disabled={dest.isCurrent}
                accessibilityLabel={dest.isCurrent ? `${dest.name}, seleccionado` : dest.name}
              >
                {dest.isCurrent ? (
                  <HomePlusIcon name="checkmark" size={20} color={colors.brand} />
                ) : (
                  <HomePlusIcon name="ellipse-outline" size={20} color={colors.text.tertiary} />
                )}
              </AppButton>
              <AppText variant="body" weight="500" style={{ flex: 1 }}>{dest.name}</AppText>
            </View>
          ))}
        </View>
      </ActionSheet>
    );
  };

  const renderTrigger = () => {
    const isActive = state.status === 'preparing' || state.status === 'uploading' || state.status === 'verifying' || state.status === 'finalizing';
    const isPicking = state.status === 'picking';
    if (isActive || isPicking) {
      return (
        <View style={styles.activeTrigger}>
          <View style={styles.spinnerContainer}>
            <AppText variant="bodySmall" tone="secondary" style={styles.spinnerText}>⟳</AppText>
          </View>
          <AppText variant="bodyLarge" weight="600">{state.status === 'preparing' ? 'Preparando…' : state.status === 'uploading' ? 'Subiendo…' : state.status === 'verifying' ? 'Verificando…' : state.status === 'finalizing' ? 'Guardando…' : 'Seleccionando…'}</AppText>
        </View>
      );
    }

    return (
      <AppButton
        variant="primary"
        // FileIntake is already rendered inside HomeCloudFilesView's native
        // ActionSheet. Launching a second ActionSheet here and then presenting
        // DocumentPicker created a three-controller stack (host → source sheet
        // → picker). On return, closing both sheets in one turn could leave the
        // native backdrop intercepting all touches. Keep this as the single
        // application-modal host while the picker is presented.
        onPress={() => void handlePickFile()}
        disabled={!config.capabilities.contribute || isActive || isPicking}
        style={styles.triggerButton}
      >
        <HomePlusIcon name="add" size={22} color={colors.text.inverse} />
        <AppText variant="bodyLarge" weight="600" style={{ marginLeft: spacing[3] }}>Agregar archivo</AppText>
      </AppButton>
    );
  };

  return (
    <View style={styles.container}>
      {renderTrigger()}
      {showInitialDestination && renderDestinationSelector()}
      {renderStatus()}
      {renderDestinationSheet()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  triggerButton: {
    minHeight: touchTargets.normal,
    width: '100%',
  },
  activeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface.soft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  spinnerContainer: {
    width: 24,
    height: 24,
  },
  spinnerText: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  destinationList: {
    gap: spacing[2],
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  destinationRowSelected: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  errorContainer: {
    gap: spacing[2],
    alignItems: 'flex-start',
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger.base,
    backgroundColor: colors.danger.soft,
  },
  errorText: {
    width: '100%',
  },
  retryButton: {
    marginTop: spacing[1],
  },
});
