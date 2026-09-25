import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { ActionSheet, FormActionRow } from '../../components/ui/ActionSheet';
import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing, radius, touchTargets } from '../../constants/theme';
import { createMemoryIntakeService } from './homecloudMemoryIntakeService';
import type { MemoryIntakeConfig, MemoryIntakeState, MemoryIntakeDestination } from './homecloudMemoryIntakeTypes';

export interface MemoryIntakeProps {
  config: MemoryIntakeConfig;
  onComplete?: (contentId: string) => void;
  onDismiss?: () => void;
}

export function MemoryIntake({ config, onComplete, onDismiss }: MemoryIntakeProps) {
  const [state, setState] = useState<MemoryIntakeState>({ status: 'idle' });
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  const [destinationSheetVisible, setDestinationSheetVisible] = useState(false);
  const [destinations, setDestinations] = useState<MemoryIntakeDestination[]>([]);
  const [showDestination, setShowDestination] = useState(false);

  const service = React.useMemo(() => createMemoryIntakeService(config), [
    config.householdId,
    config.accessToken,
    config.capabilities.contribute,
    config.initialAlbumId,
    config.initialAlbumName,
    config.intakeSource,
  ]);

  useEffect(() => {
    const unsubscribe = service.subscribe(setState);
    service.loadAlbums().then(() => {
      setDestinations(service.getAvailableDestinations());
      setShowDestination(service.canShowDestinationSelector());
    });
    return unsubscribe;
  }, [service]);

  useEffect(() => {
    if (state.status === 'completed' && state.contentId) {
      onComplete?.(state.contentId);
    }
  }, [state.status, state.contentId, onComplete]);

  const handlePickMemory = useCallback(async () => {
    await service.pickMemory();
    setSourceSheetVisible(false);
  }, [service]);

  const handleSelectDestination = useCallback((albumId: string | null, albumName: string | null) => {
    service.selectDestination(albumId, albumName);
    setDestinations(service.getAvailableDestinations());
    setDestinationSheetVisible(false);
  }, [service]);

  const handleRetry = useCallback(async () => {
    await service.retry();
  }, [service]);

  const handleDismiss = useCallback(() => {
    service.dismiss();
    onDismiss?.();
  }, [service, onDismiss]);

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
            <AppText variant="body" weight="700" tone="danger">No pudimos guardar este recuerdo</AppText>
            {state.error ? (
              <AppText variant="caption" tone="secondary" style={styles.errorText}>
                Detalle tecnico: {state.error}
              </AppText>
            ) : null}
            <AppButton
              title="Reintentar"
              size="sm"
              variant="secondary"
              onPress={handleRetry}
              accessibilityLabel="Reintentar guardar recuerdo"
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

    const currentName = state.albumName ?? 'Recuerdos';

    return (
      <FormActionRow
        label="Agregar a"
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
        title="Agregar a"
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

  const renderSourceSheet = () => {
    if (!sourceSheetVisible) return null;

    return (
      <ActionSheet
        visible={true}
        title="Agregar recuerdos"
        onRequestClose={() => setSourceSheetVisible(false)}
        size="content"
      >
        <View style={styles.sourceSheetContent}>
          <AppButton
            variant="primary"
            onPress={handlePickMemory}
            accessibilityLabel="Fotos y videos del dispositivo"
            style={styles.sourceAction}
          >
            <View style={styles.sourceActionContent}>
              <HomePlusIcon name="images-outline" size={24} color={colors.text.inverse} />
              <AppText variant="bodyLarge" weight="600" style={{ marginLeft: spacing[3] }}>Fotos y videos</AppText>
            </View>
          </AppButton>
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
          <AppText variant="bodySmall" tone="secondary">⟳</AppText>
          <AppText variant="bodyLarge" weight="600">
            {state.status === 'preparing' ? 'Preparando…' : state.status === 'uploading' ? 'Subiendo…' : state.status === 'verifying' ? 'Verificando…' : state.status === 'finalizing' ? 'Guardando…' : 'Seleccionando…'}
          </AppText>
        </View>
      );
    }

    const triggerLabel = service.hasAlbumContext() && config.initialAlbumName
      ? `Agregar a ${config.initialAlbumName}`
      : 'Agregar recuerdos';

    return (
      <AppButton
        variant="primary"
        onPress={() => setSourceSheetVisible(true)}
        disabled={!config.capabilities.contribute || isActive || isPicking || state.invalidAlbum === true}
        style={styles.triggerButton}
      >
        <HomePlusIcon name="add" size={22} color={colors.text.inverse} />
        <AppText variant="bodyLarge" weight="600" style={{ marginLeft: spacing[3] }}>{triggerLabel}</AppText>
      </AppButton>
    );
  };

  const renderInvalidAlbum = () => {
    if (!state.invalidAlbum) return null;
    return (
      <View style={styles.invalidAlbum}>
        <AppText variant="bodySmall" tone="danger">El álbum seleccionado ya no está disponible.</AppText>
        <AppButton size="sm" variant="secondary" title="Elegir otro destino" onPress={handleDismiss} style={{ marginTop: spacing[2] }} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderTrigger()}
      {showDestination && renderDestinationSelector()}
      {renderInvalidAlbum()}
      {renderStatus()}
      {renderSourceSheet()}
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
  sourceSheetContent: {
    paddingVertical: spacing[2],
  },
  sourceAction: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    width: '100%',
  },
  sourceActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  invalidAlbum: {
    padding: spacing[3],
    backgroundColor: colors.danger.soft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger.base,
  },
});
