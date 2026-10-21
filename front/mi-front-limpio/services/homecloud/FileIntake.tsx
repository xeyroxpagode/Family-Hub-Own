import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { ActionSheet, FormActionRow } from '../../components/ui/ActionSheet';
import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing, radius, touchTargets } from '../../constants/theme';
import { createFileIntakeService } from './homecloudFileIntakeService';
import type { FileIntakeConfig, FileIntakeState, FileIntakeDestination, FileIntakeItemState } from './homecloudFileIntakeTypes';

export interface FileIntakeProps {
  config: FileIntakeConfig;
  onComplete?: (contentId: string) => void;
  onDismiss?: () => void;
  /** Open the native picker as soon as this controller mounts. */
  autoPick?: boolean;
  /** Hide the legacy in-app launcher when Files already supplied the trigger. */
  renderLauncher?: boolean;
}

export function FileIntake({ config, onComplete, onDismiss, autoPick = false, renderLauncher = true }: FileIntakeProps) {
  const { householdId, capabilities, initialFolderId, initialFolderName, intakeSource } = config;
  const accessTokenRef = React.useRef(config.accessToken);
  accessTokenRef.current = config.accessToken;
  const getAccessToken = React.useCallback(() => accessTokenRef.current || null, []);
  const [state, setState] = useState<FileIntakeState>({ status: 'idle' });
  const [destinationSheetVisible, setDestinationSheetVisible] = useState(false);
  const [destinations, setDestinations] = useState<FileIntakeDestination[]>([]);
  const [showInitialDestination, setShowInitialDestination] = useState(false);
  const autoPickStarted = React.useRef(false);
  const previousStatus = React.useRef<FileIntakeState['status']>('idle');

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

  useEffect(() => {
    if (!autoPick || autoPickStarted.current) return;
    autoPickStarted.current = true;
    void handlePickFile();
  }, [autoPick, handlePickFile]);

  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = state.status;
    if (autoPick && before === 'picking' && state.status === 'idle') onDismiss?.();
  }, [autoPick, onDismiss, state.status]);

  const handleSelectDestination = useCallback((folderId: string | null, folderName: string | null) => {
    service.selectDestination(folderId, folderName);
    setDestinations(service.getAvailableDestinations());
    setDestinationSheetVisible(false);
  }, [service]);

  const handleRetry = useCallback(async (jobId: string) => {
    await service.retry(jobId);
  }, [service]);

  const handleCancel = useCallback((jobId: string) => {
    service.cancel(jobId);
  }, [service]);

  const renderStatus = () => {
    const items = state.items ?? [];
    if (items.length === 0) return state.status === 'failed' ? <AppText variant="bodySmall" tone="danger">{state.error}</AppText> : null;
    const label = (item: FileIntakeItemState) => {
      if (item.status === 'completed') return 'Guardado';
      if (item.status === 'cancelled') return 'Cancelado';
      if (item.status === 'failed') return item.error ?? 'No se pudo subir';
      if (item.status === 'uploading') return `Subiendo${typeof item.progress === 'number' ? ` ${Math.round(item.progress * 100)}%` : '…'}`;
      if (item.status === 'verifying') return 'Verificando…';
      if (item.status === 'finalizing') return 'Guardando…';
      return 'Pendiente';
    };
    return (
      <View style={styles.itemList}>
        {items.map((item) => {
          const canCancel = item.status === 'preparing' || item.status === 'uploading' || item.status === 'verifying';
          return (
            <View key={item.jobId} style={styles.itemRow}>
              <View style={styles.itemCopy}>
                <AppText variant="bodySmall" weight="600" numberOfLines={1}>{item.displayName}</AppText>
                <AppText variant="caption" tone={item.status === 'failed' ? 'danger' : item.status === 'completed' ? 'success' : 'secondary'}>{label(item)}</AppText>
              </View>
              {item.retryable ? <AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => void handleRetry(item.jobId)} accessibilityLabel={`Reintentar la subida de ${item.displayName}`} /> : null}
              {canCancel ? <AppButton title="Cancelar" size="sm" variant="secondary" onPress={() => handleCancel(item.jobId)} accessibilityLabel={`Cancelar la subida de ${item.displayName}`} /> : null}
            </View>
          );
        })}
      </View>
    );
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
    // Stage 2 (Phase 1): a bare folder NAME is ambiguous once folders nest, so the
    // selector states the FULL path when the catalogue knows one and falls back to
    // the name only when it genuinely cannot (the very first render, before any
    // destination read).
    const knownPath = destinations.find((dest) => dest.id === (initial.folderId ?? 'root'))?.path ?? null;
    const currentLabel = knownPath ?? initial.folderName ?? 'Archivos';

    return (
      <FormActionRow
        label="Guardar en"
        value={currentLabel}
        onPress={() => {
          Keyboard.dismiss();
          void openDestinationPicker();
        }}
        accessibilityLabel={`Destino actual: ${currentLabel}. Toca para cambiar.`}
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
                // Stage 2 (Phase 1): the indent is what makes a nested destination
                // readable at a glance. It is capped so a deep hierarchy stays
                // usable on a phone, and the accessibility label below always
                // carries the FULL path, which is the authoritative disambiguator.
                { marginLeft: Math.min(dest.depth, 5) * spacing[2] },
                styles.destinationRow,
                dest.isCurrent && styles.destinationRowSelected,
              ]}
            >
              <AppButton
                variant="icon"
                size="sm"
                onPress={() => handleSelectDestination(dest.id === 'root' ? null : dest.id, dest.id === 'root' ? null : dest.name)}
                disabled={dest.isCurrent}
                accessibilityLabel={dest.path
                  ? `${dest.isCurrent ? `${dest.name}, seleccionado` : `Guardar en ${dest.path}`}`
                  : `${dest.isCurrent ? 'Archivos, seleccionado' : 'Guardar en Archivos'}`}
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
      {renderLauncher ? renderTrigger() : null}
      {renderLauncher && showInitialDestination ? renderDestinationSelector() : null}
      {renderLauncher ? renderStatus() : null}
      {renderLauncher ? renderDestinationSheet() : null}
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
  itemList: {
    gap: spacing[2],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
});
