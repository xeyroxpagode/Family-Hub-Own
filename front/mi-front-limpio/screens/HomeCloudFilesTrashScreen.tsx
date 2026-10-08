/**
 * HomeCloud Files — LIFECYCLE V1 — THE PAPELERA.
 *
 * The household's trashed Files: what was sent to the Papelera, when, and the
 * TWO per-File decisions the product allows:
 *
 *   Restaurar             reversible — the File returns to its folder (or to
 *                         root when the folder is gone) with its Favorites
 *                         intact.
 *   Eliminar definitivamente   IRREVERSIBLE — a typed destructive
 *                         confirmation inside this screen, never a gesture
 *                         away from the grid. The copy says exactly what
 *                         happens: the file se elimina para siempre.
 *
 * The listing is gated by `homecloud.delete` server-side, so the entry in
 * Files is capability-gated; if the surface is reached anyway (stale
 * navigation, a role change while mounted) it states the boundary instead of
 * painting a list the server would refuse.
 *
 * READS follow the canonical Papelera pattern (the Finance Papelera is the
 * donor of the shape): one request key, one AbortController, skeleton first
 * load, an honest error card with Reintentar, an empty state that explains
 * itself, and the has-more probe pagination of the Files browser.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { ActionSheet, AppButton, AppText, EmptyState, ErrorState, InteractivePressable, Skeleton } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useHomeCloudCapabilities } from '../services/homecloud/useHomeCloudCapabilities';
import {
  FILES_TRASH_MAX_LIMIT,
  fetchHomeCloudFilesTrash,
  purgeHomeCloudFile,
  restoreHomeCloudFile,
} from '../services/homecloud/homecloudTrashService';
import type { HomeCloudTrashedFile } from '../services/homecloud/homecloudTypes';

type TrashReadState = {
  loading: boolean;
  error: string | null;
  files: HomeCloudTrashedFile[];
  nextOffset: number | null;
};

const EMPTY_READ: TrashReadState = { loading: false, error: null, files: [], nextOffset: null };

function safeTrashReadError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'No pudimos cargar la papelera. Intenta de nuevo.';
}

function fileIconName(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType === 'application/pdf') return 'document-text-outline';
  return 'document-outline';
}

/** "En papelera desde 3 de octubre de 2026" — honest, never a fake clock. */
function trashedSinceLabel(trashedAt: string): string {
  try {
    return new Date(trashedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return trashedAt.split('T')[0];
  }
}

export function HomeCloudFilesTrashScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const capabilities = useHomeCloudCapabilities();
  const canManageTrash = capabilities.descriptor.delete === true;

  const [read, setRead] = useState<TrashReadState>(EMPTY_READ);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  // The ONE detail sheet subject + its two views (detail | confirm).
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const readKeyRef = useRef<string | null>(null);

  const detailTarget = read.files.find((file) => file.id === detailTargetId) ?? null;

  /**
   * FOCUS FRESHNESS. Returning from Files (or any sibling surface) re-reads
   * the Papelera, because another surface may have trashed something while
   * this one was covered. It is a nonce bump, not a forced fetch: the read
   * below is the single owner of the request.
   */
  useFocusEffect(
    useCallback(() => {
      setRefreshNonce((value) => value + 1);
      return;
    }, []),
  );

  /**
   * THE ONE READ. One request key, one AbortController, the canonical
   * first-load skeleton and an honest error card — the same shape as the
   * Finance Papelera, because the member already learned it there.
   */
  useEffect(() => {
    if (!token || !canManageTrash) {
      readKeyRef.current = null;
      setRead(EMPTY_READ);
      return;
    }
    const requestKey = `trash:${refreshNonce}`;
    const controller = new AbortController();
    readKeyRef.current = requestKey;
    setRead((current) => ({ ...current, loading: true, error: null }));
    fetchHomeCloudFilesTrash(token, { limit: FILES_TRASH_MAX_LIMIT, offset: 0 })
      .then((response) => {
        if (readKeyRef.current !== requestKey) return;
        setRead({
          loading: false,
          error: null,
          files: response.trash.files,
          nextOffset: response.trash.nextOffset,
        });
      })
      .catch((error: unknown) => {
        if (readKeyRef.current !== requestKey) return;
        setRead({ loading: false, error: safeTrashReadError(error), files: [], nextOffset: null });
      });
    return () => {
      controller.abort();
    };
  }, [token, canManageTrash, refreshNonce]);

  /**
   * Pagination continues the has-more probe contract: `nextOffset` is real
   * server evidence, so there is no phantom page and no truncation.
   */
  const loadMore = useCallback(async () => {
    if (!token || loadingMore || read.nextOffset === null) return;
    setLoadingMore(true);
    setPageError(null);
    try {
      const response = await fetchHomeCloudFilesTrash(token, { limit: FILES_TRASH_MAX_LIMIT, offset: read.nextOffset });
      setRead((current) => ({
        ...current,
        files: [...current.files, ...response.trash.files],
        nextOffset: response.trash.nextOffset,
      }));
    } catch (error) {
      setPageError(safeTrashReadError(error));
    } finally {
      setLoadingMore(false);
    }
  }, [token, loadingMore, read.nextOffset]);

  const pullToRefresh = useCallback(async () => {
    if (pullRefreshing) return;
    setPullRefreshing(true);
    try {
      setRefreshNonce((value) => value + 1);
      // The read effect settles the indicator on both outcomes; one beat is
      // enough because the nonce bump is what drives the request.
      await new Promise((resolve) => setTimeout(resolve, 250));
    } finally {
      setPullRefreshing(false);
    }
  }, [pullRefreshing]);

  /**
   * RESTORE — reversible, idempotent, no confirmation dialog: the product's
   * answer to an accidental action is the Papelera itself, and Restore IS the
   * recovery. The File returns to its folder with its Favorites intact; the
   * re-read removes the row because the server no longer lists it.
   */
  const restoreTarget = async () => {
    if (!token || !detailTarget || restoreBusy) return;
    setRestoreBusy(true);
    setActionError(null);
    try {
      await restoreHomeCloudFile(token, detailTarget.id);
      closeDetail();
      setRefreshNonce((value) => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No pudimos restaurar el archivo.');
    } finally {
      setRestoreBusy(false);
    }
  };

  /**
   * PURGE — the ONLY irreversible action in Files V1.
   *
   * The two-view sheet IS the destructive confirmation: the second view names
   * the File, states that the deletion is para siempre, and the confirming
   * button is the danger one. Cancelling — including closing the sheet — keeps
   * the File exactly where it is. On success the re-read removes the row
   * (the server only lists lifecycle='trashed'; a purging File is already
   * gone from the list), and Files refreshes on focus when the member goes
   * back.
   */
  const purgeTarget = async () => {
    if (!token || !detailTarget || purgeBusy) return;
    setPurgeBusy(true);
    setActionError(null);
    try {
      await purgeHomeCloudFile(token, detailTarget.id);
      closeDetail();
      setRefreshNonce((value) => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No pudimos eliminar el archivo.');
    } finally {
      setPurgeBusy(false);
    }
  };

  const closeDetail = () => {
    setDetailTargetId(null);
    setConfirmingPurge(false);
    setActionError(null);
  };

  const retryRead = () => setRefreshNonce((value) => value + 1);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <InteractivePressable style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Volver" haptic="light">
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </InteractivePressable>
        <AppText variant="title1" weight="800" accessibilityRole="header">Papelera</AppText>
      </View>
      <AppText variant="caption" tone="secondary" style={styles.subtitle}>
        Archivos enviados a la papelera. Se pueden restaurar o eliminar definitivamente.
      </AppText>

      {/* THE CAPABILITY BOUNDARY, stated instead of a dead list. */}
      {!canManageTrash ? (
        <View style={styles.stateCard}>
          <EmptyState
            title="No tenés permiso para gestionar la papelera"
            description={capabilities.message ?? 'Pedi a un coordinador o adulto del hogar que gestione los archivos eliminados.'}
            illustration={<HomePlusIcon name="lock-closed-outline" size={30} color={colors.text.tertiary} />}
          />
        </View>
      ) : (
        <>
          {read.loading && read.files.length === 0 ? (
            <View style={styles.stateCard}>
              <Skeleton width="42%" height={16} />
              <Skeleton width="76%" height={18} />
              <Skeleton width="58%" height={14} />
            </View>
          ) : null}

          {read.error && read.files.length === 0 ? (
            <View style={styles.stateCard}>
              <ErrorState
                title="No pudimos cargar la papelera"
                description={read.error}
                retryLabel="Reintentar"
                onRetry={retryRead}
              />
            </View>
          ) : null}

          {!read.loading && !read.error && read.files.length === 0 ? (
            <View style={styles.stateCard}>
              <EmptyState
                title="Papelera vacía"
                description="Los archivos que envíes a la papelera aparecerán acá."
                illustration={<HomePlusIcon name="trash-outline" size={30} color={colors.text.tertiary} />}
              />
            </View>
          ) : null}

          {read.files.length > 0 ? (
            <FlatList
              data={read.files}
              keyExtractor={(file) => file.id}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={() => void pullToRefresh()} tintColor={colors.terracotta[600]} />}
              onEndReached={() => void loadMore()}
              onEndReachedThreshold={2}
              renderItem={({ item }) => (
                <InteractivePressable
                  style={styles.row}
                  onPress={() => { setDetailTargetId(item.id); setConfirmingPurge(false); setActionError(null); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Archivo en papelera: ${item.displayName}. Enviado el ${trashedSinceLabel(item.trashedAt)}. Toca para restaurarlo o eliminarlo definitivamente.`}
                  haptic="light"
                >
                  <HomePlusIcon name={fileIconName(item.mimeType) as never} size={22} color={colors.info.base} />
                  <View style={styles.rowText}>
                    <AppText variant="body" weight="700" numberOfLines={1}>{item.displayName}</AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>En papelera desde {trashedSinceLabel(item.trashedAt)}</AppText>
                  </View>
                  <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
                </InteractivePressable>
              )}
              ListFooterComponent={(
                <View style={styles.footer}>
                  {pageError ? (
                    <>
                      <AppText variant="caption" tone="danger" align="center">{pageError}</AppText>
                      <AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => void loadMore()} accessibilityLabel="Reintentar cargar más archivos de la papelera" />
                    </>
                  ) : loadingMore ? (
                    <ActivityIndicator color={colors.brand} accessibilityLabel="Cargando más archivos" />
                  ) : null}
                </View>
              )}
            />
          ) : null}
        </>
      )}

      {/* THE ONE detail sheet, with the destructive confirmation as its
          second view. Restoring never asks to confirm: it is the recovery
          action itself. */}
      {detailTarget ? (
        <ActionSheet
          visible
          title={confirmingPurge ? '¿Eliminar definitivamente?' : detailTarget.displayName}
          onRequestClose={closeDetail}
          size="content"
        >
          <View style={styles.sheet}>
            {confirmingPurge ? (
              <>
                <AppText variant="bodySmall" tone="secondary">
                  {`"${detailTarget.displayName}" se va a eliminar para siempre. No se puede deshacer, y sus bytes dejan de contar en el almacenamiento del hogar.`}
                </AppText>
                <AppButton
                  title="Eliminar definitivamente"
                  variant="danger"
                  loading={purgeBusy}
                  disabled={purgeBusy}
                  onPress={() => void purgeTarget()}
                  accessibilityLabel={`Confirmar eliminación definitiva de ${detailTarget.displayName}`}
                />
                <AppButton
                  title="Cancelar"
                  variant="secondary"
                  disabled={purgeBusy}
                  onPress={() => { setConfirmingPurge(false); setActionError(null); }}
                  accessibilityLabel={`Conservar ${detailTarget.displayName} en la papelera`}
                />
              </>
            ) : (
              <>
                <AppText variant="caption" tone="secondary">En papelera desde {trashedSinceLabel(detailTarget.trashedAt)}</AppText>
                <AppButton
                  title="Restaurar"
                  loading={restoreBusy}
                  disabled={restoreBusy || purgeBusy}
                  onPress={() => void restoreTarget()}
                  accessibilityLabel={`Restaurar ${detailTarget.displayName}`}
                />
                <AppButton
                  title="Eliminar definitivamente"
                  variant="danger"
                  disabled={restoreBusy || purgeBusy}
                  onPress={() => { setConfirmingPurge(true); setActionError(null); }}
                  accessibilityLabel={`Eliminar definitivamente ${detailTarget.displayName}. Se abrirá una confirmación.`}
                />
              </>
            )}
            {actionError ? (
              <AppText variant="bodySmall" tone="danger" accessibilityRole="alert" testID="trash-action-error">{actionError}</AppText>
            ) : null}
          </View>
        </ActionSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.base },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[1] },
  backButton: { width: 44, height: 44, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  subtitle: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
  stateCard: { paddingHorizontal: spacing[5], paddingVertical: spacing[6], gap: spacing[3] },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  rowText: { flex: 1, gap: 2 },
  footer: { paddingVertical: spacing[4], alignItems: 'center', gap: spacing[2] },
  sheet: { gap: spacing[3], paddingBottom: spacing[2] },
});
