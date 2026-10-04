import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { albumAddSelectionLabel } from '../../services/homecloud/homecloudAlbumScope';
import {
  memoryPrimaryText,
  memorySemanticLabel,
} from '../../services/homecloud/homecloudMemoriesTimeline';
import type { HomeCloudAlbum, HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import { listMemories } from '../../services/homecloud/homecloudReadService';
import { ActionSheet, AppButton, AppText, ErrorState, Skeleton } from '../ui';
import { useMemoryPreviewUrl } from './useMemoryPreviewUrl';

/**
 * HomeCloud MO-A2 — "Agregar recuerdos" picker for ONE Album.
 *
 * SCOPE, DELIBERATELY SMALL
 * -------------------------
 * There is NO generic entity multi-select primitive in the app and MO-A2 does
 * not build one. This sheet exists ONLY to add existing Memories to the Album
 * that is open, and its selection is a LOCAL `Set<contentId>` owned by this
 * component: no store, no context, no shared action bar, no cross-surface
 * selection. A selection that survives a remount would be a different feature.
 *
 * ALREADY-MEMBER TRUTH
 * --------------------
 * A Memory that already belongs to this Album is marked and cannot be selected
 * again, using the `albumIds` the read model already projects. The backend
 * mutation is idempotent, but an honest UI does not offer an action that can
 * only be a no-op.
 *
 * THE READ IS THE EXISTING ONE
 * ---------------------------
 * `listMemories(token, { order: 'timeline', limit, offset })` — the same read
 * model and the same canonical order the Timeline uses, paginated with the
 * server's own `nextOffset`. No second Memories fetcher, no client sort.
 */

const PICKER_PAGE_SIZE = 30;

export type AlbumAddFailure = {
  readonly contentId: string;
  readonly label: string;
  readonly message: string;
};

export type AlbumAddOutcome = {
  readonly added: readonly string[];
  readonly failures: readonly AlbumAddFailure[];
};

type PickerRow = {
  readonly memory: HomeCloudMemoryListItem;
  readonly alreadyMember: boolean;
};

/** One preview attempt per thumbnail, with the same stable fallback as a tile. */
function PickerThumb({ memory, accessToken }: { memory: HomeCloudMemoryListItem; accessToken: string }) {
  const preview = useMemoryPreviewUrl(accessToken, memory.id, memory.hasPreview);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [memory.id]);
  if (preview.phase !== 'ready' || failed) {
    return (
      <View style={[styles.thumb, styles.thumbFallback]}>
        <HomePlusIcon name="image-outline" size={18} color={colors.text.tertiary} />
      </View>
    );
  }
  return <Image source={{ uri: preview.url }} resizeMode="cover" onError={() => setFailed(true)} style={styles.thumb} />;
}

function memoryLabel(memory: HomeCloudMemoryListItem): string {
  const primary = memoryPrimaryText(memory);
  return primary.length > 0 ? primary : memorySemanticLabel(memory);
}

export function AlbumMemoryPicker({
  visible,
  album,
  accessToken,
  householdId,
  adding,
  onClose,
  onAdd,
}: {
  visible: boolean;
  album: HomeCloudAlbum | null;
  accessToken: string;
  householdId: string;
  adding: boolean;
  onClose: () => void;
  onAdd: (contentIds: string[]) => Promise<AlbumAddOutcome>;
}) {
  const [rows, setRows] = useState<PickerRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState<AlbumAddFailure[]>([]);

  // One generation for the whole sheet. A household switch, an Album change and
  // a reopen all supersede any page still in flight, so no answer can be
  // attributed to the wrong Album or household.
  const generationRef = useRef(0);
  const albumId = album?.id ?? null;

  const resetSelection = useCallback(() => {
    setRows([]);
    setSelected(new Set());
    setNextOffset(null);
    setError(null);
    setFailures([]);
  }, []);

  const loadFirstPage = useCallback(async () => {
    if (!accessToken) return;
    const mine = ++generationRef.current;
    setLoading(true);
    setError(null);
    try {
      const page = await listMemories(accessToken, { order: 'timeline', limit: PICKER_PAGE_SIZE, offset: 0 });
      if (mine !== generationRef.current) return;
      setRows(page.memories.map((memory) => ({ memory, alreadyMember: albumId !== null && memory.albumIds.includes(albumId) })));
      setNextOffset(page.nextOffset);
    } catch (caught) {
      if (mine !== generationRef.current) return;
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar tus recuerdos.');
    } finally {
      if (mine === generationRef.current) setLoading(false);
    }
  }, [accessToken, albumId]);

  const loadMore = useCallback(async () => {
    if (nextOffset === null || loadingMore || loading) return;
    const mine = generationRef.current;
    setLoadingMore(true);
    try {
      const page = await listMemories(accessToken, { order: 'timeline', limit: PICKER_PAGE_SIZE, offset: nextOffset });
      if (mine !== generationRef.current) return;
      setRows((previous) => {
        const known = new Set(previous.map((row) => row.memory.id));
        const incoming = page.memories
          .filter((memory) => !known.has(memory.id))
          .map((memory) => ({ memory, alreadyMember: albumId !== null && memory.albumIds.includes(albumId) }));
        return [...previous, ...incoming];
      });
      setNextOffset(page.nextOffset);
    } catch {
      // A later page failing is not a list failure: the loaded rows stay and the
      // "load more" affordance remains available.
    } finally {
      if (mine === generationRef.current) setLoadingMore(false);
    }
  }, [accessToken, albumId, loading, loadingMore, nextOffset]);

  // Every open is a fresh, authoritative read of the household library, and a
  // household or Album change discards the previous selection entirely.
  useEffect(() => {
    if (!visible) return;
    generationRef.current += 1;
    resetSelection();
    void loadFirstPage();
    return () => { generationRef.current += 1; };
  }, [albumId, householdId, loadFirstPage, resetSelection, visible]);

  const toggle = useCallback((contentId: string, alreadyMember: boolean) => {
    if (alreadyMember) return;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(contentId)) next.delete(contentId);
      else next.add(contentId);
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (adding || selected.size === 0) return;
    const ids = [...selected];
    const outcome = await onAdd(ids);
    if (outcome.failures.length === 0) {
      // Every requested membership exists. Closing is honest here.
      onClose();
      return;
    }
    // PARTIAL FAILURE, represented honestly: the successful memberships stay
    // successful, the failed Memories are named, and the sheet stays open with
    // ONLY the failures still selected so a retry is exactly the retry.
    setFailures([...outcome.failures]);
    setSelected(new Set(outcome.failures.map((failure) => failure.contentId)));
  }, [adding, onAdd, onClose, selected]);

  if (album === null) return null;

  return (
    <ActionSheet
      visible={visible}
      title="Agregar recuerdos"
      subtitle={album.name}
      onRequestClose={onClose}
      closeDisabled={adding}
      size="near-full"
      footer={
        <AppButton
          title={adding ? 'Agregando…' : albumAddSelectionLabel(selected.size)}
          loading={adding}
          disabled={selected.size === 0 || adding}
          onPress={() => void submit()}
        />
      }
    >
      <View style={styles.body}>
        {failures.length > 0 ? (
          <View style={styles.failures}>
            <AppText variant="bodySmall" tone="danger">
              {`No pudimos agregar ${failures.length === 1 ? 'este recuerdo' : `estos ${failures.length} recuerdos`}. Los que sí se agregaron ya están en el álbum.`}
            </AppText>
            {failures.map((failure) => (
              <AppText key={failure.contentId} variant="caption" tone="secondary">
                {`• ${failure.label}: ${failure.message}`}
              </AppText>
            ))}
          </View>
        ) : null}
        {loading ? (
          <View style={styles.skeletons}>
            <Skeleton variant="listItem" />
            <Skeleton variant="listItem" />
            <Skeleton variant="listItem" />
          </View>
        ) : error !== null ? (
          <ErrorState
            title="No pudimos cargar tus recuerdos"
            description={error}
            retryLabel="Reintentar"
            onRetry={() => void loadFirstPage()}
          />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <AppText variant="bodySmall" weight="700">
              {'Todavía no hay recuerdos'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {'Los recuerdos que creen en Recuerdos pueden aggregarse a este álbum.'}
            </AppText>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {rows.map(({ memory, alreadyMember }) => {
              const isSelected = selected.has(memory.id);
              return (
                <View key={memory.id} style={styles.row}>
                  <AppButton
                    variant={isSelected ? 'primary' : 'icon'}
                    size="sm"
                    disabled={alreadyMember || adding}
                    onPress={() => toggle(memory.id, alreadyMember)}
                    accessibilityLabel={
                      alreadyMember
                        ? `${memoryLabel(memory)} ya está en el álbum`
                        : `${isSelected ? 'Quitar de la selección' : 'Seleccionar'} ${memoryLabel(memory)}`
                    }
                  >
                    <HomePlusIcon
                      name={alreadyMember ? 'checkmark' : isSelected ? 'close' : 'add'}
                      size={18}
                      color={alreadyMember || isSelected ? colors.text.inverse : colors.text.secondary}
                    />
                  </AppButton>
                  <PickerThumb memory={memory} accessToken={accessToken} />
                  <View style={styles.rowText}>
                    <AppText variant="bodySmall" weight="600" numberOfLines={2}>
                      {memoryLabel(memory)}
                    </AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                      {alreadyMember ? 'Ya está en el álbum' : memorySemanticLabel(memory)}
                    </AppText>
                  </View>
                </View>
              );
            })}
            {nextOffset !== null ? (
              <AppButton
                title={loadingMore ? 'Cargando…' : 'Cargar más recuerdos'}
                variant="secondary"
                size="sm"
                disabled={loadingMore}
                onPress={() => void loadMore()}
              />
            ) : null}
          </ScrollView>
        )}
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, minHeight: 0, gap: spacing[3] },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: spacing[2], paddingBottom: spacing[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[1] },
  thumb: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface.card },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.alt,
  },
  rowText: { flex: 1, gap: 2 },
  empty: { gap: spacing[2], alignItems: 'flex-start', paddingVertical: spacing[4] },
  failures: { gap: spacing[1], paddingBottom: spacing[2] },
  skeletons: { gap: spacing[3] },
});