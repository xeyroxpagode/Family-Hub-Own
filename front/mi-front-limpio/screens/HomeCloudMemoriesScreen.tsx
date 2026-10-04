import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { AppButton, AppText, ErrorState, Skeleton } from '../components/ui';
import { AlbumDetailView } from '../components/homecloud/AlbumDetailView';
import { AlbumsRail } from '../components/homecloud/AlbumsRail';
import { AlbumActionsSheet, AlbumNameSheet, type AlbumEditorMode } from '../components/homecloud/AlbumSheets';
import { AlbumMemoryPicker, type AlbumAddOutcome } from '../components/homecloud/AlbumMemoryPicker';
import { MemoryCard } from '../components/homecloud/MemoryCards';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';
import {
  addMemoryToAlbum,
  createAlbum,
  deleteAlbum,
  fetchHomeCloudAlbums,
  fetchHomeCloudAlbumsCached,
  listMemories,
  removeMemoryFromAlbum,
  renameAlbum,
  type HomeCloudScope,
} from '../services/homecloud/homecloudReadService';
import {
  ALBUMS_RAIL_INITIAL,
  createAlbumsRailController,
} from '../services/homecloud/homecloudAlbumsPagination';
import {
  ALBUM_DETAIL_INITIAL,
  createAlbumDetailController,
} from '../services/homecloud/homecloudAlbumDetailPagination';
import { subscribeHomeCloudReadReconciliation } from '../services/homecloud/homecloudReadReconciliation';
import { MemoryIntake } from '../services/homecloud/MemoryIntake';
import { useHomeCloudCapabilities } from '../services/homecloud/useHomeCloudCapabilities';
import { homeCloudCapabilitiesNotice } from '../services/homecloud/homecloudCapabilitiesNotice';
import type {
  HomeCloudAlbum,
  HomeCloudMemoryListItem,
} from '../services/homecloud/homecloudTypes';
import {
  flattenTimelineForSectionList,
  groupMemoriesForTimeline,
  memoryPrimaryText,
  memorySemanticLabel,
  type TimelineListSection,
} from '../services/homecloud/homecloudMemoriesTimeline';

const MEMORIES_PAGE_SIZE = 50;
const ALBUM_PAGE_SIZE = 50;
const TIMELINE_COLUMNS = 3;

/**
 * HomeCloud STAGE 4B.2 — Memories Root (productive Timeline surface).
 *
 * Authority: Stage 4B.1 read model (`listMemories`: role=memory,
 * lifecycle=active, canonical Timeline order, stable pagination).
 *
 * - Real backend data only: no fixtures, no mocks, no local arrays.
 * - States: loading (skeletons) / empty / error+retry / success / refresh
 *   (pull-to-refresh, same pattern as the rest of the app). No polling.
 * - Grouping uses the semantic date only (never uploadedAt). Unknown dates
 *   render last as "Sin fecha" per the productive backend contract.
 * - Create is productive: binary memories use the Shared Upload Engine and
 *   written memories register/finalize without manufacturing a binary.
 *
 * MO-A2 — ALBUMS LIVE INSIDE MEMORIES
 * -----------------------------------
 * HomeCloud still has exactly two sections (Files | Memories). Albums are NOT a
 * third tab and NOT a synthetic Timeline section: the rail is the
 * `ListHeaderComponent` of this very SectionList, so the frozen Timeline grouping
 * architecture is untouched and the Albums area can only ever appear above it.
 *
 * ALBUM DETAIL IS NESTED STATE
 * ----------------------------
 * Opening an Album overlays a detail WITHOUT unmounting this SectionList, so the
 * global Timeline keeps its loaded pages, its grouped dataset and its scroll
 * offset and Back simply hides the overlay. No navigation route, no router, no
 * `navigation/types.ts` change. The two datasets are owned by two SEPARATE
 * controllers; the Timeline dataset is never turned into an Album dataset
 * in place.
 *
 * EXACT MUTATION -> REFETCH RECONCILIATION (no event bus)
 * --------------------------------------------------------
 * Every Album mutation receives `{ householdId }`, which is what makes the
 * EXISTING household invalidation actually drop the Album read keys, and then the
 * owner refetches explicitly. No generic event bus, no extension of the shared
 * reconciliation module and no modelling of an Album mutation as an upload.
 */
export function HomeCloudMemoriesView() {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const token = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [memories, setMemories] = useState<HomeCloudMemoryListItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // W1-A: the capabilities projection is read ONCE per scope through the
  // canonical cached fetch and lives outside the Timeline load, so paging,
  // refreshing and remounting the Timeline cannot re-request it, and its
  // failure can never become "tus recuerdos no cargan".
  const capabilities = useHomeCloudCapabilities();
  const capabilitiesNotice = homeCloudCapabilitiesNotice(capabilities);
  // Reads require view; EVERY Album mutation requires organize. There is no
  // third Album capability and `homecloud.delete` is never consulted.
  const canOrganize = capabilities.descriptor.organize;

  const loadFirstPage = useCallback(async () => {
    if (!token || !householdId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await listMemories(token, { limit: MEMORIES_PAGE_SIZE });
      setMemories([...page.memories]);
      setNextOffset(page.nextOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tus recuerdos.');
    } finally {
      setLoading(false);
    }
  }, [token, householdId]);

  /**
   * W1-C: the read itself, with no presentation attached.
   *
   * A completion must re-read the FIRST page (a new memory lands at the top) but
   * must not blank the Timeline or fake a pull-to-refresh, so the three callers
   * — first load, pull-to-refresh and global reconciliation — share this one
   * read and each owns only its own indicator.
   */
  const readFirstPage = useCallback(async () => {
    if (!token || !householdId) return;
    const page = await listMemories(token, { limit: MEMORIES_PAGE_SIZE });
    setMemories([...page.memories]);
    setNextOffset(page.nextOffset);
  }, [token, householdId]);

  const refresh = useCallback(async () => {
    if (!token || !householdId) return;
    setRefreshing(true);
    setError(null);
    try {
      await readFirstPage();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tus recuerdos.');
    } finally {
      setRefreshing(false);
    }
  }, [readFirstPage, token, householdId]);

  const loadMore = useCallback(async () => {
    if (!token || !householdId || nextOffset === null || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await listMemories(token, { limit: MEMORIES_PAGE_SIZE, offset: nextOffset });
      setMemories((previous) => {
        const known = new Set(previous.map((memory) => memory.id));
        return [...previous, ...page.memories.filter((memory) => !known.has(memory.id))];
      });
      setNextOffset(page.nextOffset);
    } catch {
      // Pagination failure is non-fatal: the loaded Timeline stays and the
      // footer button remains available for another attempt.
    } finally {
      setLoadingMore(false);
    }
  }, [token, householdId, nextOffset, loadingMore, loading]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    setMemories([]);
    setNextOffset(null);
    setError(null);
  }, [householdId]);

  /**
   * W1-C: correctness of the timeline does NOT depend on `MemoryIntake`.
   *
   * The intake instance that accepted a memory may unmount, be rebuilt or
   * change service before the job finalizes, so its `onComplete` is a local UX
   * convenience (it closes the flow) and never the authority. This
   * subscription is: global, household scoped, silent, and idempotent per job.
   */
  useEffect(() => {
    if (!householdId || !token) return;
    return subscribeHomeCloudReadReconciliation(householdId, (event) => {
      if (event.role !== 'memory') return;
      void readFirstPage().catch(() => {
        /* A silent reconciliation never replaces the Timeline with an error. */
      });
    });
  }, [householdId, token, readFirstPage]);

  // =========================================================================
  // MO-A2 — Albums rail (own controller, own generation timeline)
  // =========================================================================

  const [rail, setRail] = useState(ALBUMS_RAIL_INITIAL);
  // The controller owner is a ref, so it is created ONCE and never recreated per
  // render. Recreating it would give every render its own generation counter and
  // an in-flight answer would still believe it owns the rail.
  const railReadRef = useRef({ token, householdId });
  railReadRef.current = { token, householdId };
  const railControllerRef = useRef<ReturnType<typeof createAlbumsRailController> | null>(null);
  if (railControllerRef.current === null) {
    railControllerRef.current = createAlbumsRailController({
      onState: setRail,
      read: async ({ authoritative }) => {
        const context = railReadRef.current;
        if (!context.token || !context.householdId) return [];
        // The authoritative path skips the 30s TTL short circuit on purpose:
        // after a mutation or on focus the surface needs the server truth.
        if (authoritative) return fetchHomeCloudAlbums(context.token);
        return fetchHomeCloudAlbumsCached(context.token, { householdId: context.householdId });
      },
    });
  }
  const reloadRail = useCallback(() => railControllerRef.current!.reload(), []);

  const loadRail = useCallback(async () => {
    if (!token || !householdId) return;
    await railControllerRef.current!.load();
  }, [token, householdId]);

  useEffect(() => {
    void loadRail();
  }, [loadRail]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
      // Focus is an authoritative Albums re-read, so an Album created on
      // another device is visible without waiting for the TTL.
      void reloadRail();
    }, [loadFirstPage, reloadRail]),
  );

  // =========================================================================
  // MO-A2 — Album detail (a SECOND, separate controller; the Timeline above is
  // never turned into an Album dataset)
  // =========================================================================

  const [openAlbumId, setOpenAlbumId] = useState<string | null>(null);
  const [detail, setDetail] = useState(ALBUM_DETAIL_INITIAL);
  const [removingContentId, setRemovingContentId] = useState<string | null>(null);
  // Latest-value mirror, so the sequential add can NAME a failed Memory without
  // making its own identity depend on the loaded pages.
  const detailMemoriesRef = useRef<readonly HomeCloudMemoryListItem[]>(detail.memories);
  detailMemoriesRef.current = detail.memories;
  const detailReadRef = useRef({ token });
  detailReadRef.current = { token };
  const detailControllerRef = useRef<ReturnType<typeof createAlbumDetailController> | null>(null);
  if (detailControllerRef.current === null) {
    detailControllerRef.current = createAlbumDetailController({
      limit: ALBUM_PAGE_SIZE,
      onState: setDetail,
      read: async ({ albumId, limit, offset }) => {
        const currentToken = detailReadRef.current.token;
        if (!currentToken) return { memories: [], nextOffset: null };
        // The EXISTING Memories read model in its Album presentation mode.
        // `GET /albums/:albumId/items` is deliberately NOT consumed here.
        const page = await listMemories(currentToken, { albumId, order: 'album', limit, offset });
        return { memories: page.memories, nextOffset: page.nextOffset };
      },
    });
  }

  const openAlbum = useCallback((album: HomeCloudAlbum) => {
    setOpenAlbumId(album.id);
    void detailControllerRef.current!.open(album.id);
  }, []);

  const closeAlbum = useCallback(() => {
    setOpenAlbumId(null);
    setRemovingContentId(null);
    detailControllerRef.current!.reset();
  }, []);

  const refreshDetail = useCallback(() => {
    void detailControllerRef.current!.refresh();
  }, []);

  const loadMoreDetail = useCallback(() => {
    void detailControllerRef.current!.loadMore();
  }, []);

  // The Album currently open is read from the rail itself, so a rename is
  // reflected in the detail header by the ordinary rail refetch.
  const openAlbumRecord = useMemo(
    () => rail.albums.find((album) => album.id === openAlbumId) ?? null,
    [openAlbumId, rail.albums],
  );

  // Android hardware Back closes the Album instead of the whole HomeCloud screen.
  useEffect(() => {
    if (openAlbumId === null) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeAlbum();
      return true;
    });
    return () => subscription.remove();
  }, [closeAlbum, openAlbumId]);

  // =========================================================================
  // MO-A2 — Sheet ownership + mutations
  // =========================================================================

  const [editor, setEditor] = useState<{ mode: AlbumEditorMode; album: HomeCloudAlbum | null } | null>(null);
  const [actionsAlbum, setActionsAlbum] = useState<HomeCloudAlbum | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  /**
   * The intake destination list must follow every Album change. Intake owns NO
   * Album management: it only re-reads its own destinations through the existing
   * service path when this revision changes. No event bus, no second fetcher.
   */
  const [destinationsRevision, setDestinationsRevision] = useState(0);

  const scope = useMemo<HomeCloudScope | null>(
    () => (householdId ? { householdId } : null),
    [householdId],
  );

  const bumpDestinations = useCallback(() => {
    setDestinationsRevision((value) => value + 1);
  }, []);

  const openCreateAlbum = useCallback(() => {
    setSheetError(null);
    setEditor({ mode: 'create', album: null });
  }, []);

  const openRenameAlbum = useCallback((album: HomeCloudAlbum) => {
    setSheetError(null);
    setActionsAlbum(null);
    setEditor({ mode: 'rename', album });
  }, []);

  const openAlbumActions = useCallback((album: HomeCloudAlbum) => {
    setSheetError(null);
    setActionsAlbum(album);
  }, []);

  const submitAlbumName = useCallback(async (name: string) => {
    if (!token || !scope || !editor || saving) return;
    setSaving(true);
    setSheetError(null);
    try {
      if (editor.mode === 'create') {
        // `scope` is MANDATORY: without it the shared invalidation is a no-op and
        // the rail would keep showing the pre-mutation truth.
        await createAlbum(token, name, scope);
        await reloadRail();
        bumpDestinations();
      } else if (editor.album) {
        await renameAlbum(token, editor.album.id, name, scope);
        await reloadRail();
        bumpDestinations();
      }
      setEditor(null);
    } catch (error) {
      setSheetError(error instanceof Error ? error.message : 'No pudimos guardar el álbum.');
    } finally {
      setSaving(false);
    }
  }, [bumpDestinations, editor, reloadRail, saving, scope, token]);

  const confirmDeleteAlbum = useCallback(async () => {
    if (!token || !scope || !actionsAlbum || deleting) return;
    setDeleting(true);
    setSheetError(null);
    try {
      // A HARD delete of the GROUPING: the Album and its memberships go, and
      // every Memory, its bytes, its preview and its membership in any other
      // Album survive untouched.
      await deleteAlbum(token, actionsAlbum.id, scope);
      const wasOpen = openAlbumId === actionsAlbum.id;
      setActionsAlbum(null);
      if (wasOpen) closeAlbum();
      await reloadRail();
      // Timeline page 0 because the projected `albumIds` changed.
      await readFirstPage().catch(() => undefined);
      bumpDestinations();
    } catch (error) {
      setSheetError(error instanceof Error ? error.message : 'No pudimos eliminar el álbum.');
    } finally {
      setDeleting(false);
    }
  }, [actionsAlbum, bumpDestinations, closeAlbum, deleting, openAlbumId, readFirstPage, reloadRail, scope, token]);

  /**
   * Add existing Memories to the open Album.
   *
   * The backend mutation is per contentId, so the selections run sequentially.
   * A partial failure is reported honestly: successful memberships stay
   * successful, the failed Memory is NAMED, and nothing is rolled back.
   */
  const addMemoriesToAlbum = useCallback(async (contentIds: string[]): Promise<AlbumAddOutcome> => {
    if (!token || !scope || !openAlbumId) {
      return {
        added: [],
        failures: contentIds.map((contentId) => ({ contentId, label: contentId, message: 'El álbum ya no está abierto.' })),
      };
    }
    setAdding(true);
    const added: string[] = [];
    const failures: { contentId: string; label: string; message: string }[] = [];
    const labels = new Map<string, string>();
    for (const memory of detailMemoriesRef.current) labels.set(memory.id, pickerLabel(memory));
    try {
      for (const contentId of contentIds) {
        try {
          await addMemoryToAlbum(token, openAlbumId, contentId, scope);
          added.push(contentId);
        } catch (error) {
          failures.push({
            contentId,
            label: labels.get(contentId) ?? 'Un recuerdo',
            message: error instanceof Error ? error.message : 'No pudimos agregarlo.',
          });
        }
      }
      if (added.length > 0) {
        await detailControllerRef.current!.refresh();
        await reloadRail();
        // Timeline page 0 so the projected albumIds are honest immediately.
        await readFirstPage().catch(() => undefined);
      }
      return { added, failures };
    } finally {
      setAdding(false);
    }
  }, [openAlbumId, readFirstPage, reloadRail, scope, token]);

  /** Remove ONE Memory from the CURRENT Album. The Memory itself survives. */
  const removeMemoryFromOpenAlbum = useCallback(async (memory: HomeCloudMemoryListItem) => {
    if (!token || !scope || !openAlbumId || removingContentId !== null) return;
    setRemovingContentId(memory.id);
    try {
      await removeMemoryFromAlbum(token, openAlbumId, memory.id, scope);
      await detailControllerRef.current!.refresh();
      await reloadRail();
      await readFirstPage().catch(() => undefined);
    } catch {
      // The Memory stays rendered: a failed removal never removes the row and
      // never invents a success.
    } finally {
      setRemovingContentId(null);
    }
  }, [openAlbumId, readFirstPage, reloadRail, removingContentId, scope, token]);

  // =========================================================================
  // Household reset — nothing from household A may render in household B
  // =========================================================================
  useEffect(() => {
    setOpenAlbumId(null);
    setRemovingContentId(null);
    setEditor(null);
    setActionsAlbum(null);
    setPickerOpen(false);
    setSheetError(null);
    setSaving(false);
    setDeleting(false);
    setAdding(false);
    setDetail(ALBUM_DETAIL_INITIAL);
    detailControllerRef.current!.reset();
    railControllerRef.current!.reset();
  }, [householdId]);

  const sections = useMemo<TimelineListSection[]>(
    () => flattenTimelineForSectionList(groupMemoriesForTimeline(memories), TIMELINE_COLUMNS),
    [memories],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.titleRow}>
        <AppText variant="title3" weight="800" style={styles.headerTitle}>
          {'Recuerdos'}
        </AppText>
        <AppButton variant="icon" size="sm" onPress={() => void refresh()} accessibilityLabel="Actualizar recuerdos">
          <HomePlusIcon name="refresh" size={21} color={colors.text.secondary} />
        </AppButton>
        {token && currentHousehold ? (
          <MemoryIntake
            config={{
              householdId: currentHousehold.id,
              accessToken: token,
              capabilities: capabilities.descriptor,
              intakeSource: 'homecloud:memories',
            }}
            destinationsRevision={destinationsRevision}
            onComplete={() => void refresh()}
          />
        ) : null}
      </View>
      {capabilitiesNotice ? (
        <View style={styles.notice}>
          <AppText variant="caption" tone="secondary">{capabilitiesNotice}</AppText>
          <AppButton
            title="Reintentar"
            size="sm"
            variant="ghost"
            onPress={capabilities.revalidate}
            accessibilityLabel="Reintentar verificación de permisos de HomeCloud"
          />
        </View>
      ) : null}
      {loading ? (
        <MemoriesLoadingSkeleton />
      ) : error && memories.length === 0 ? (
        <View style={styles.center}>
          <ErrorState
            title="No pudimos cargar tus recuerdos"
            description={error}
            retryLabel="Reintentar"
            onRetry={() => void loadFirstPage()}
          />
        </View>
      ) : memories.length === 0 ? (
        <View style={styles.center}>
          <HomePlusIcon name="image-outline" size={38} color={colors.text.tertiary} />
          <AppText variant="title3" weight="800" align="center">
            {'Aún no hay recuerdos'}
          </AppText>
          <AppText variant="body" tone="secondary" align="center">
            {'Las fotos, videos, audios y escritos que quieran conservar van a aparecer acá.'}
          </AppText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
          // MO-A2: the Albums rail is the HEADER of the Memories list. It is
          // never a Timeline section, so the grouping architecture is untouched.
          ListHeaderComponent={
            <AlbumsRail
              albums={rail.albums}
              loading={rail.loading}
              error={rail.error}
              canOrganize={canOrganize}
              accessToken={token}
              onOpenAlbum={openAlbum}
              onAlbumActions={openAlbumActions}
              onCreateAlbum={openCreateAlbum}
              onRetry={() => void reloadRail()}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.yearTitle && section.yearTitle !== section.title ? (
                <AppText variant="title3" weight="800">
                  {section.yearTitle}
                </AppText>
              ) : null}
              <AppText variant="bodySmall" tone="secondary" weight="600">
                {section.yearTitle && section.yearTitle !== section.title ? section.title : section.yearTitle ?? section.title}
              </AppText>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {/* Timeline MemoryCards receive NO albumScopeAction: the Timeline
                  keeps exactly the pre-MO-A2 card behavior. */}
              {item.items.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} accessToken={token} />
              ))}
              {Array.from({ length: TIMELINE_COLUMNS - item.items.length }).map((_, index) => (
                <View key={`spacer-${index}`} style={styles.rowSpacer} />
              ))}
            </View>
          )}
          ListFooterComponent={
            nextOffset !== null ? (
              <View style={styles.footer}>
                <AppButton
                  title={loadingMore ? 'Cargando…' : 'Mostrar más recuerdos'}
                  variant="secondary"
                  disabled={loadingMore}
                  onPress={() => void loadMore()}
                />
              </View>
            ) : null
          }
        />
      )}

      {/*
       * Album detail as an OVERLAY, not a route and not a swap. The SectionList
       * above stays mounted for the whole time the Album is open, so its loaded
       * pages, its grouped dataset and its scroll offset all survive Back.
       */}
      {openAlbumId !== null ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <AlbumDetailView
            album={openAlbumRecord}
            state={detail}
            accessToken={token}
            canOrganize={canOrganize}
            removingContentId={removingContentId}
            onBack={closeAlbum}
            onOpenActions={() => { if (openAlbumRecord) openAlbumActions(openAlbumRecord); }}
            onRefresh={refreshDetail}
            onLoadMore={loadMoreDetail}
            onAddMemories={() => setPickerOpen(true)}
            onRemoveMemory={(memory) => void removeMemoryFromOpenAlbum(memory)}
          />
        </View>
      ) : null}

      <AlbumNameSheet
        visible={editor !== null}
        mode={editor?.mode ?? 'create'}
        initialName={editor?.album?.name ?? ''}
        saving={saving}
        error={sheetError}
        onClose={() => { if (!saving) { setEditor(null); setSheetError(null); } }}
        onSubmit={(name) => void submitAlbumName(name)}
      />
      <AlbumActionsSheet
        album={actionsAlbum}
        canOrganize={canOrganize}
        deleting={deleting}
        error={sheetError}
        onClose={() => { if (!deleting) { setActionsAlbum(null); setSheetError(null); } }}
        onRename={() => { if (actionsAlbum) openRenameAlbum(actionsAlbum); }}
        onDelete={() => void confirmDeleteAlbum()}
      />
      {openAlbumRecord ? (
        <AlbumMemoryPicker
          visible={pickerOpen}
          album={openAlbumRecord}
          accessToken={token ?? ''}
          householdId={householdId ?? ''}
          adding={adding}
          onClose={() => setPickerOpen(false)}
          onAdd={addMemoriesToAlbum}
        />
      ) : null}
    </View>
  );
}

/** Honest short label for one Memory, used to name a failed add. */
function pickerLabel(memory: HomeCloudMemoryListItem): string {
  const primary = memoryPrimaryText(memory);
  return primary.length > 0 ? primary : memorySemanticLabel(memory);
}

function MemoriesLoadingSkeleton() {
  return (
    <View style={styles.list}>
      <Skeleton variant="line" width="32%" height={22} />
      <View style={styles.skeletonRow}>
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
      </View>
      <Skeleton variant="line" width="44%" height={22} />
      <View style={styles.skeletonRow}>
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.base },
  headerTitle: { flex: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[2],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  sectionHeader: { paddingTop: spacing[3], paddingBottom: spacing[2], gap: 2 },
  row: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  rowSpacer: { flex: 1 },
  footer: { paddingVertical: spacing[4], alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] },
  skeletonRow: { flexDirection: 'row', gap: spacing[2], marginVertical: spacing[2] },
  skeletonTile: { flex: 1, borderRadius: radius.lg },
});