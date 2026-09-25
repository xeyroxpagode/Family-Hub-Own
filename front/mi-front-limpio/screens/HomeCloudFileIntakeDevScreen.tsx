import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { fetchHomeCloudCapabilitiesCached } from '../services/homecloudCapabilities';
import { evaluateHomeCloudCapabilities } from '../services/homecloud/homecloudCapabilitiesAdapter';
import { fetchHomeCloudFoldersCached, fetchHomeCloudAlbumsCached } from '../services/homecloud/homecloudReadService';
import { FileIntake } from '../services/homecloud/FileIntake';
import { MemoryIntake } from '../services/homecloud/MemoryIntake';
import { AppButton } from '../components/ui/AppButton';
import { AppText } from '../components/ui/AppText';
import { HomePlusIcon } from '../constants/icons';
import { colors, spacing, radius, touchTargets } from '../constants/theme';

export function HomeCloudFileIntakeDevScreen() {
  const { session, authMe, refetchMe } = useAuth();
  const { currentHousehold, currentRole, reload: reloadHousehold } = useHousehold();
  const [capabilities, setCapabilities] = useState<ReturnType<typeof evaluateHomeCloudCapabilities> | null>(null);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [albums, setAlbums] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [lastContentId, setLastContentId] = useState<string | null>(null);
  const [lastMemoryId, setLastMemoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!session?.access_token || !currentHousehold) {
        setLoading(false);
        return;
      }
      try {
        const caps = await fetchHomeCloudCapabilitiesCached(session.access_token, {
          accountId: authMe?.person?.id ?? '',
          householdId: currentHousehold.id,
          membershipId: authMe?.memberships.find((m) => m.household_id === currentHousehold.id)?.id ?? '',
        });
        setCapabilities(evaluateHomeCloudCapabilities(caps));

        const folderList = await fetchHomeCloudFoldersCached(session.access_token, { householdId: currentHousehold.id });
        setFolders(folderList.map((f) => ({ id: f.id, name: f.name })));

        const albumList = await fetchHomeCloudAlbumsCached(session.access_token, { householdId: currentHousehold.id });
        setAlbums(albumList.map((a) => ({ id: a.id, name: a.name })));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session?.access_token, currentHousehold, authMe?.person?.id, authMe?.memberships]);

  const handleComplete = (contentId: string) => {
    setLastContentId(contentId);
  };

  const handleMemoryComplete = (contentId: string) => {
    setLastMemoryId(contentId);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <AppText variant="body">Cargando…</AppText>
      </View>
    );
  }

  if (!currentHousehold) {
    return (
      <View style={styles.centered}>
        <AppText variant="body" tone="secondary">No hay hogar activo</AppText>
        <AppButton title="Reintentar" onPress={() => refetchMe()} style={{ marginTop: spacing[4] }} />
      </View>
    );
  }

  const canContribute = capabilities?.contribute ?? false;
  const canOrganize = capabilities?.organize ?? false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <AppText variant="title3" weight="800">HomeCloud Intake — Dev Harness</AppText>
        <AppText variant="caption" tone="secondary" style={styles.meta}>
          Hogar: {currentHousehold.nombre} ({currentHousehold.id})
        </AppText>
        <AppText variant="caption" tone="secondary" style={styles.meta}>
          Rol: {currentRole ?? '—'}
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="title3" weight="800">Capacidades</AppText>
        <View style={styles.capsGrid}>
          {capabilities ? (
            <>
              <CapabilityBadge label="view" granted={capabilities.view} />
              <CapabilityBadge label="contribute" granted={capabilities.contribute} />
              <CapabilityBadge label="organize" granted={capabilities.organize} />
              <CapabilityBadge label="delete" granted={capabilities.delete} />
            </>
          ) : (
            <AppText variant="caption" tone="secondary">No disponible</AppText>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="title3" weight="800">Carpetas disponibles ({folders.length})</AppText>
        {folders.length === 0 ? (
          <AppText variant="caption" tone="secondary">Sin carpetas — se usará "Archivos" (raíz)</AppText>
        ) : (
          <View style={styles.folderList}>
            {folders.map((f) => (
              <View key={f.id} style={styles.folderRow}>
                <AppText variant="body" weight={selectedFolderId === f.id ? '700' : '500'}>{f.name}</AppText>
                <AppButton
                  variant="icon"
                  size="sm"
                  onPress={() => {
                    setSelectedFolderId(selectedFolderId === f.id ? null : f.id);
                    setShowFolderPicker(false);
                  }}
                  accessibilityLabel={selectedFolderId === f.id ? 'Deseleccionar' : 'Seleccionar'}
                >
                  <HomePlusIcon name={selectedFolderId === f.id ? 'checkmark' : 'ellipse-outline'} size={20} color={selectedFolderId === f.id ? colors.brand : colors.text.tertiary} />
                </AppButton>
              </View>
            ))}
          </View>
        )}
        {folders.length > 0 && (
          <AppButton
            variant="secondary"
            size="sm"
            title={showFolderPicker ? 'Ocultar selector' : 'Seleccionar carpeta inicial'}
            onPress={() => setShowFolderPicker(!showFolderPicker)}
            style={{ marginTop: spacing[3] }}
          />
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="title3" weight="800">File Intake</AppText>
        {canContribute ? (
          <FileIntake
            config={{
              householdId: currentHousehold.id,
              accessToken: session!.access_token!,
              capabilities: capabilities ?? { view: false, contribute: false, organize: false, delete: false, anyWrite: false },
              initialFolderId: selectedFolderId,
              initialFolderName: folders.find(f => f.id === selectedFolderId)?.name ?? null,
              intakeSource: 'dev:harness',
            }}
            onComplete={handleComplete}
          />
        ) : (
          <View style={styles.disabledNotice}>
            <HomePlusIcon name="lock-closed-outline" size={24} color={colors.text.tertiary} />
            <AppText variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
              No tienes permiso {canContribute ? '' : 'homecloud.contribute'} para agregar archivos.
            </AppText>
          </View>
        )}
      </View>

      {lastContentId && (
        <View style={styles.section}>
          <AppText variant="title3" weight="800">Último archivo creado</AppText>
          <View style={styles.resultRow}>
            <AppText variant="mono" style={{ flex: 1 }}>{lastContentId}</AppText>
            <AppButton variant="icon" size="sm" onPress={() => setLastContentId(null)}>
              <HomePlusIcon name="close" size={18} color={colors.text.tertiary} />
            </AppButton>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <AppText variant="title3" weight="800">Álbumes disponibles ({albums.length})</AppText>
        {albums.length === 0 ? (
          <AppText variant="caption" tone="secondary">Sin álbumes — Recuerdos (raíz)</AppText>
        ) : (
          <View style={styles.folderList}>
            {albums.map((a) => (
              <View key={a.id} style={styles.folderRow}>
                <AppText variant="body" weight={selectedAlbumId === a.id ? '700' : '500'}>{a.name}</AppText>
                <AppButton
                  variant="icon"
                  size="sm"
                  onPress={() => {
                    setSelectedAlbumId(selectedAlbumId === a.id ? null : a.id);
                    setShowAlbumPicker(false);
                  }}
                  accessibilityLabel={selectedAlbumId === a.id ? 'Deseleccionar' : 'Seleccionar'}
                >
                  <HomePlusIcon name={selectedAlbumId === a.id ? 'checkmark' : 'ellipse-outline'} size={20} color={selectedAlbumId === a.id ? colors.brand : colors.text.tertiary} />
                </AppButton>
              </View>
            ))}
          </View>
        )}
        {albums.length > 0 && (
          <AppButton
            variant="secondary"
            size="sm"
            title={showAlbumPicker ? 'Ocultar selector' : 'Seleccionar álbum inicial'}
            onPress={() => setShowAlbumPicker(!showAlbumPicker)}
            style={{ marginTop: spacing[3] }}
          />
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="title3" weight="800">Memory Intake</AppText>
        {canContribute ? (
          <MemoryIntake
            config={{
              householdId: currentHousehold.id,
              accessToken: session!.access_token!,
              capabilities: capabilities ?? { view: false, contribute: false, organize: false, delete: false, anyWrite: false },
              initialAlbumId: selectedAlbumId,
              initialAlbumName: albums.find(a => a.id === selectedAlbumId)?.name ?? null,
              intakeSource: 'dev:harness',
            }}
            onComplete={handleMemoryComplete}
          />
        ) : (
          <View style={styles.disabledNotice}>
            <HomePlusIcon name="lock-closed-outline" size={24} color={colors.text.tertiary} />
            <AppText variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
              No tienes permiso {canContribute ? '' : 'homecloud.contribute'} para agregar recuerdos.
            </AppText>
          </View>
        )}
      </View>

      {lastMemoryId && (
        <View style={styles.section}>
          <AppText variant="title3" weight="800">Último recuerdo creado</AppText>
          <View style={styles.resultRow}>
            <AppText variant="mono" style={{ flex: 1 }}>{lastMemoryId}</AppText>
            <AppButton variant="icon" size="sm" onPress={() => setLastMemoryId(null)}>
              <HomePlusIcon name="close" size={18} color={colors.text.tertiary} />
            </AppButton>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorSection}>
          <AppText variant="caption" tone="danger">{error}</AppText>
        </View>
      )}
    </ScrollView>
  );
}

function CapabilityBadge({ label, granted }: { label: string; granted: boolean }) {
  return (
    <View style={[styles.capBadge, granted ? styles.capGranted : styles.capDenied]}>
      <AppText variant="micro" weight="700">{label}</AppText>
      <AppText variant="micro" weight={granted ? '700' : '400'}>{granted ? '✓' : '✗'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  content: {
    padding: spacing[5],
    gap: spacing[5],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  meta: {
    fontFamily: 'monospace',
  },
  capsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  capBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  capGranted: {
    backgroundColor: colors.success.soft,
    borderColor: colors.success.base,
  },
  capDenied: {
    backgroundColor: colors.danger.soft,
    borderColor: colors.danger.base,
  },
  folderList: {
    gap: spacing[2],
    maxHeight: 200,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    backgroundColor: colors.surface.soft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  disabledNotice: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.success.soft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success.base,
  },
  errorSection: {
    padding: spacing[3],
    backgroundColor: colors.danger.soft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger.base,
  },
});