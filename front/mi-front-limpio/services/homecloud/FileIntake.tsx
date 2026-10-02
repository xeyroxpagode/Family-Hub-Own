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

  const handlePickFile = useCallback(async () => {
    await service.pickFile();
    if (service.getAcceptedJobId()) {
      // Durable acceptance transfers ownership to the coordinator. Closing this
      // UI must not cancel the job or delete its durable artifact.
      service.dismiss();
      onDismiss?.();
    }
  }, [onDismiss, service]);

  const handleSelectDestination = useCallback((folderId: string | null, folderName: string | null) => {
    service.selectDestination(folderId, folderName);
    setDestinations(service.getAvailableDestinations());
    setDestinationSheetVisible(false);
  }, [service]);

  const handleRetry = useCallback(async () => {
    await service.retry();
  }, [service]);

  const renderStatus = () => {
    switch (state.status) {
      case 'preparing':
        return <AppText variant="bodySmall" tone="secondary">Preparando…</AppText>;
      case 'uploading':
        return <AppText variant="bodySmall" tone="secondary">Subiendo…</AppText>;
      case 'verifying':
        return <AppText variant="bodySmall" tone="secondary">Verificando…</AppText>;
      case 'finalizing':
        return <AppText variant="bodySmall" tone="secondary">Guardando…</AppText>;
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
          </View>
        );
      case 'cancelled':
        return null;
      default:
        return null;
    }
  };

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
          setDestinationSheetVisible(true);
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
