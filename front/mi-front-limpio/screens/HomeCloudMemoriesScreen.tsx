import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { AppButton, AppText, ErrorState, Skeleton } from '../components/ui';
import { ActionSheet } from '../components/ui/ActionSheet';
import { AlbumDetailView } from '../components/homecloud/AlbumDetailView';
import { AlbumsRail } from '../components/homecloud/AlbumsRail';
import { AlbumActionsSheet, AlbumNameSheet, type AlbumEditorMode } from '../components/homecloud/AlbumSheets';
import { MemoryTypesSection } from '../components/homecloud/MemoryCollectionTile';
import { MemoryCollectionDetailView } from '../components/homecloud/MemoryCollectionDetailView';
import { MemorySelectionHeader } from '../components/homecloud/MemorySelectionHeader';
import { MemoryViewer } from '../components/homecloud/MemoryViewer';
import { MemoryTimelineRow, type MemoryTimelineCell, type MemoryTimelineRowEntry } from '../components/homecloud/MemoryTimelineRow';
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
  solveAlbumsRailShowsSkeleton,
} from '../services/homecloud/homecloudAlbumsPagination';
import {
  ALBUM_DETAIL_INITIAL,
  createAlbumDetailController,
} from '../services/homecloud/homecloudAlbumDetailPagination';
import {
  MEMORY_COLLECTIONS_INITIAL,
  MEMORY_TYPE_COLLECTIONS,
  buildMemoryCollectionQuery,
  createMemoryCollectionsController,
  memoryCollectionId,
  memoryCollectionTitle,
  parseMemoryCollectionId,
  type MemoryCollectionRef,
  type MemoryCollectionsState,
} from '../services/homecloud/homecloudMemoryCollectionsPagination';
import {
  MEMORY_DRAG_IDLE,
  armMemoryDrag,
  beginMemoryDrag,
  clearMemoryRowRegistry,
  createMemoryEdgeTicker,
  createMemoryRowRegistry,
  endMemoryDrag,
  memoryRowZones,
  moveMemoryDragPointer,
  registerMemoryRow,
  resolveMemoryAtPoint,
  stepMemoryDrag,
  unregisterMemoryRow,
  applyMemoryVisualRange,
  type MemoryDragState,
  type MemoryEdgeTicker,
  type MemoryRowRegistry,
} from '../services/homecloud/homecloudMemoryDrag';
import {
  albumViewerSession,
  collectionViewerSession,
  libraryViewerSession,
  memoryViewerDataset,
  type MemoryViewerSession,
} from '../services/homecloud/homecloudMemoryViewerSource';
import { reuseMemoryViewerDataset } from '../services/homecloud/homecloudMemoryViewerOpening';
import {
  createMemoryExitGestureLock,
  scrollMemoryListToOffset,
  solveMemoryRefreshGate,
  type MemoryExitGestureLock,
} from '../services/homecloud/homecloudMemoryGestureOwnership';
import {
  canConfirmMemorySelection,
  cancelMemorySelection,
  confirmMemorySelection,
  createMemorySelectionSession,
  enterMemorySelection,
  isMemorySelecting,
  memorySelectionRemoveLabel,
  resetMemorySelectionScope,
  setMemorySelectionExclusions,
  toggleMemorySelection,
  type MemorySelectionState,
} from '../services/homecloud/homecloudMemorySelection';
import {
  isTerminalDestinationFailure,
  runMemoryAlbumMutation,
  toMemorySelectionFailure,
  type MemoryMutationDirection,
  type MemorySelectionFailure,
} from '../services/homecloud/homecloudMemoryMutations';
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
  type TimelineGroupingMode,
  type TimelineListSection,
  type TimelineRow,
} from '../services/homecloud/homecloudMemoriesTimeline';
import { lightHaptic } from '../utils/haptics';

const MEMORIES_PAGE_SIZE = 50;
const ALBUM_PAGE_SIZE = 50;
const COLLECTION_PAGE_SIZE = 50;
const TIMELINE_COLUMNS = 3;
/**
 * Scroll events are needed for two things only: the live offset the drag hit test
 * and hit testing reads, and restoring an offset per source. Both tolerate ~60 Hz
 * because the offset is stored in a REF, so an onScroll event never re-renders.
 */
const DRAG_SCROLL_THROTTLE = 16;

const NO_ALBUMS_DESTINATION_TITLE = 'No hay álbumes disponibles';
const NO_ALBUMS_DESTINATION_BODY =
  'Creá un álbum desde la barra de álbumes de Recuerdos para agrupar estos recuerdos.';

const EMPTY_EXCLUSIONS: ReadonlySet<string> = new Set<string>();
/** Stable empty dataset identity, so a closed Viewer never re-renders the list. */
const EMPTY_MEMORIES: readonly HomeCloudMemoryListItem[] = [];

/*
 * MO-A3 DEVICE FIX (D1) — THE GRID HOST REF IS THE PUBLISHED SECTIONLIST TYPE.
 *
 * `listRef` used to be typed `SectionList & { scrollToOffset }`. That was an
 * invented surface. The runtime object behind `ref` on a `SectionList` is the
 * `SectionList` CLASS INSTANCE, which publishes `scrollToLocation`,
 * `recordInteraction`, `flashScrollIndicators`, `getScrollResponder`,
 * `getScrollableNode` and `setNativeProps` — and NOT `scrollToOffset`, which
 * belongs to the `VirtualizedList` the SectionList renders internally and is
 * never forwarded. A local type made `listRef.current?.scrollToOffset(...)`
 * type-check while calling `undefined` on a real iPhone: `?.` guards a null ref,
 * never a missing method. The runtime object is the authority, so scrolling now
 * goes through the guarded adapter in `homecloudMemoryGestureOwnership`.
 */

/**
 * HomeCloud STAGE 4B.2 — Memories Root (productive Timeline surface).
 *
 * Authority: Stage 4B.1 read model (`listMemories`: role=memory,
 * lifecycle=active, canonical Timeline order, stable pagination).
 *
 * - Real backend data only: no fixtures, no mocks, no local arrays.
 * - States: loading (skeletons) / empty / error+retry / success / refresh
 *   (pull-to-refresh, same pattern as the rest of the app). No polling.
 * - Grouping uses the semantic date only (never uploadedAt).
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
 *
 * MO-A3 — MEMORY SELECTION + ALBUM INTEGRATION
 * ---------------------------------------------
 * Memories become a selectable library and the AlbumMemoryPicker modal is
 * retired as the productive "add existing Memories" UX.
 *
 *  - ONE selection session (`homecloudMemorySelection`), owned here, with no
 *    global context and no store. Identity is `contentId` and nothing else, so
 *    Recuerdos, a type collection and an Album collection agree on "is this
 *    selected?" without any synchronization mechanism.
 *  - Recuerdos inside selection is the SAME canonical Timeline: same `memories`,
 *    same grouped sections, same previews, same pagination. Selection overlays
 *    interaction; it never forks the library read.
 *  - Colecciones is LOCAL source state, not a route: Albums plus the four
 *    deterministic type collections (Fotos / Videos / Audios / Notas). Its back
 *    action returns to the Collections root and does NOT cancel the operation.
 *  - ONE BackHandler owner with an explicit priority, ONE AppState listener for
 *    gesture cleanup only, and the ONE household reset effect extended (never
 *    duplicated) to clear the whole session.
 *  - ONE grid host: the selection surface and the normal Timeline are the same
 *    SectionList, so normal scrolling is never disabled by entering selection
 *    and there is never more than one mounted-row registry in play.
 */
export function HomeCloudMemoriesView() {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const token = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [memories, setMemories] = useState<HomeCloudMemoryListItem[]>([]);
  /**
   * Latest Timeline content, readable by the load callbacks WITHOUT becoming one
   * of their dependencies. It exists so a page-0 re-read can ask "is there
   * already content on screen?" without changing the identity of `loadFirstPage`
   * — which would re-fire the very effect that calls it.
   */
  const memoriesRef = useRef(memories);
  memoriesRef.current = memories;
  const [viewer, setViewer] = useState<MemoryViewerSession | null>(null);
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
    /**
     * HC2-C (§9 / §23.8) — A PAGE-0 RE-READ WITH CONTENT NEVER SHOWS A SKELETON.
     *
     * This callback is reached on mount, on every focus and from the
     * reconciliation, so a plain `setLoading(true)` blanked a Timeline the user
     * was already reading. `refresh()` never had that problem; now the read
     * itself owns the distinction, so every caller gets the honest behaviour
     * instead of each one having to remember it.
     *
     * The question is asked of a REF, never of `memories` as a dependency, so
     * this callback keeps a stable identity and the effect below cannot loop.
     */
    const skeleton = solveAlbumsRailShowsSkeleton(memoriesRef.current.length === 0);
    if (skeleton) setLoading(true);
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
    setViewer(null);
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

  /**
   * HC2-C (B2) — the FIRST-PAINT rail read has no effect of its own any more.
   *
   * It used to. Two effects — a `loadRail()` effect and the `useFocusEffect`
   * `reloadRail()` — both fired on mount, and both answers were then discarded by
   * the scope reset that ran after them, with no later read to replace them. The
   * single first-paint read now lives in the ONE scope effect that owns the
   * reset, below, and is emitted AFTER the reset. See that effect for the full
   * ordering argument.
   */

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
  // Latest-value mirror, so a bulk composer can NAME a failed Memory without
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

  // =========================================================================
  // MO-A2 — Sheet ownership + mutations
  // =========================================================================

  const [editor, setEditor] = useState<{ mode: AlbumEditorMode; album: HomeCloudAlbum | null } | null>(null);
  const [actionsAlbum, setActionsAlbum] = useState<HomeCloudAlbum | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
   * THE ONE MEMBERSHIP COMPOSER.
   *
   * `runAlbumMemberships('add' | 'remove', albumId, contentIds)` is the ONLY bulk
   * membership path: the Album surface, the generic Timeline selection and the
   * bulk removal all go through it, so a partial failure can never be reported
   * differently depending on how the operation was started. It runs one MO-A1
   * mutation per contentId, sequentially, with the mandatory `{ householdId }`
   * scope, and reports exactly which ids were committed and which failed.
   *
   * Nothing is ever rolled back: a committed membership stays committed and the
   * failed ids stay selected, so a retry IS the retry.
   */
  const runAlbumMemberships = useCallback(
    async (
      direction: MemoryMutationDirection,
      albumId: string,
      contentIds: readonly string[],
    ): Promise<MemorySelectionFailure> => {
      const labels = new Map<string, string>();
      for (const memory of [...memoriesRef.current, ...detailMemoriesRef.current, ...collectionsMemoriesRef.current]) {
        labels.set(memory.id, memoryFailureLabel(memory));
      }
      const outcome = await runMemoryAlbumMutation({
        direction,
        albumId,
        contentIds,
        labelFor: (contentId) => labels.get(contentId) ?? 'Un recuerdo',
        mutate: async (targetAlbumId, contentId) => {
          if (!token) throw new Error('La sesión venció.');
          if (direction === 'add') {
            await addMemoryToAlbum(token, targetAlbumId, contentId, scope ?? undefined);
          } else {
            await removeMemoryFromAlbum(token, targetAlbumId, contentId, scope ?? undefined);
          }
        },
      });
      if (outcome.committed.length > 0) {
        // The exact refetch table, identical for both directions: the Album
        // detail when that Album is the open one, the Albums rail, and Timeline
        // page 0, whose projected `albumIds` just changed.
        if (openAlbumIdRef.current === albumId) await detailControllerRef.current!.refresh();
        await reloadRail();
        await readFirstPage().catch(() => undefined);
      }
      return toMemorySelectionFailure(direction, outcome);
    },
    [readFirstPage, reloadRail, scope, token],
  );

  /**
 * HC2-C BUG D — CASCADE CLEANUP OF THE PERMANENT `X`.
 *
 * `onRemoveMemory`, `removingContentId` and the inline removal callback are all
 * gone: their only reason to exist was disabling ONE per-card destructive
 * affordance, and with that affordance removed they would be state and wiring
 * for nothing. The in-flight marker in particular had exactly one reader.
 *
 * The OPERATION itself is NOT gone. `removeMemoryFromOpenAlbum` survives as an
 * exported, dependency-free async function in `homecloudMemoryAlbumRemoval`,
 * because the Membership contract outlives any single affordance and Run B
 * reconnects it to the single-Memory action in the Viewer. Bulk removal already
 * has its own authority: `runAlbumMemberships`, the one shared composer.
 */

  // =========================================================================
  // MO-A3 — the SELECTION SESSION
  // =========================================================================

  const [selection, setSelection] = useState<MemorySelectionState>(createMemorySelectionSession);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [selectionFailure, setSelectionFailure] = useState<MemorySelectionFailure | null>(null);
  /**
   * HC2-C: the contextual action sheet is open FROM THE FIRST FRAME of a
   * selection. There is no `✓` in front of it any more, so this is the only
   * thing standing between "something is selected" and "the available actions".
   */
  const [selectionActionsOpen, setSelectionActionsOpen] = useState(false);
  /** The destination content INSIDE the same sheet. Never a second sheet. */
  const [destinationPickerOpen, setDestinationPickerOpen] = useState(false);

  // Latest-value mirrors. Every gesture seam below is a STABLE callback that
  // reads these, which is what makes the memoized rows safe: their interaction
  // props never change identity.
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const openAlbumIdRef = useRef(openAlbumId);
  openAlbumIdRef.current = openAlbumId;
  const railRef = useRef(rail);
  railRef.current = rail;

  // MO-A3 → HC2-C — Collections read owner (ONE active collection).
  //
  // HC2-C C1: `activeCollectionId` is ordinary SCREEN STATE, exactly like
  // `openAlbumId`, and it is declared HERE — next to the controller that owns its
  // data — rather than being derived from the selection session. That promotion
  // is what lets a collection be opened in NORMAL mode at all: before HC2-C the
  // only route to `Fotos` / `Videos` / `Audios` / `Notas` ran through a screen
  // that existed only while a selection was active.
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<MemoryCollectionsState>(MEMORY_COLLECTIONS_INITIAL);
  const collectionsReadRef = useRef({ token });
  collectionsReadRef.current = { token };
  const collectionsControllerRef = useRef<ReturnType<typeof createMemoryCollectionsController> | null>(null);
  if (collectionsControllerRef.current === null) {
    collectionsControllerRef.current = createMemoryCollectionsController({
      limit: COLLECTION_PAGE_SIZE,
      onState: setCollections,
      read: async ({ ref, limit, offset }) => {
        const currentToken = collectionsReadRef.current.token;
        if (!currentToken) return { memories: [], nextOffset: null };
        // THE EXISTING READ MODEL. A type collection filters by `kind` in
        // Timeline order; an Album collection reads `albumId` in Album order.
        const page = await listMemories(currentToken, buildMemoryCollectionQuery(ref, limit, offset));
        return { memories: page.memories, nextOffset: page.nextOffset };
      },
    });
  }
  const collectionsMemoriesRef = useRef<readonly HomeCloudMemoryListItem[]>(collections.memories);
  collectionsMemoriesRef.current = collections.memories;

  const selecting = isMemorySelecting(selection);
  /**
   * HC2-C: a session is SOURCE IDENTITY plus the OPENING AUTHORITY. The dataset
   * is not captured here — it is resolved live by `viewerMemories`, so the
   * Viewer's pages can never come from a stale snapshot that disagrees with its
   * own source.
   */
  const openLibraryViewer = useCallback((memory: HomeCloudMemoryListItem) => {
    if (isMemorySelecting(selectionRef.current)) return;
    setViewer(libraryViewerSession(memory.id));
  }, []);

  // =========================================================================
  // MO-A3 — DRAG: refs only, never React state per pointer event
  // =========================================================================

  const dragRef = useRef<MemoryDragState>(MEMORY_DRAG_IDLE);
  /** Mounted rows only. A row that unmounts removes its own entry. */
  const rowRegistryRef = useRef<MemoryRowRegistry | null>(null);
  if (rowRegistryRef.current === null) rowRegistryRef.current = createMemoryRowRegistry();
  const fingerRef = useRef<{ x: number; y: number } | null>(null);
  const visualMemoryIdsRef = useRef<readonly string[]>([]);
  const listRef = useRef<SectionList<TimelineRow, TimelineListSection> | null>(null);
  const viewportHeightRef = useRef(0);
  /** Scroll offset per source. Refs: an onScroll event must never re-render. */
  const scrollOffsetsRef = useRef(new Map<string, number>());
  const edgeTickerRef = useRef<MemoryEdgeTicker | null>(null);

  /**
   * HC2-C: the scroll offset is tracked per SURFACE, and the surface is decided
   * only by the open collection. Entering a selection can no longer change it,
   * which is one of the things that used to reset the user's position.
   */
  const sourceKey = activeCollectionId ?? 'library';
  const sourceKeyRef = useRef(sourceKey);
  sourceKeyRef.current = sourceKey;

  const stopEdgeScroll = useCallback(() => {
    edgeTickerRef.current?.stop();
  }, []);

  const abortDrag = useCallback(() => {
    dragRef.current = endMemoryDrag(dragRef.current);
    fingerRef.current = null;
    stopEdgeScroll();
  }, [stopEdgeScroll]);

  // =========================================================================
  // MO-A3 DEVICE FIX (D3) — PARENT / NAVIGATION EXIT GESTURE OWNERSHIP
  // =========================================================================

  /**
   * `HomeCloud` is a card inside the `MoreStack` NATIVE stack, so the swipe that
   * leaves HomeCloud is react-native-screens' native interactive-pop recognizer
   * on the stack, not a JS gesture. A `PanResponder` inside the list cannot block
   * a native recognizer, which is why a sweep could navigate away mid-drag. The
   * route's own documented `gestureEnabled` option is the only seam, and it is
   * the CURRENT React Navigation API: no new route, no navigator change and no
   * permanent change to app navigation.
   *
   * `navigation` is read through a ref so the lock — which must exist exactly
   * once — never closes over a stale navigation object.
   */
  const navigation = useNavigation<any>();
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const exitGestureRef = useRef<MemoryExitGestureLock | null>(null);
  if (exitGestureRef.current === null) {
    exitGestureRef.current = createMemoryExitGestureLock({
      apply: (gestureEnabled: boolean) => {
        navigationRef.current?.setOptions({ gestureEnabled });
      },
    });
  }
  const exitGesture = exitGestureRef.current;

  /**
   * MO-A3 DEVICE FIX (D2) — the refresh seam.
   *
   * BOTH halves of the fix are here and they are deliberately different things.
   * The gesture half is the `mountRefreshControl` decision on the list below: on
   * iOS the refresh control is a real `UIRefreshControl` armed by the native pan
   * from touch-down, so `refreshing={false}` still arms the pull gesture and only
   * not mounting the control prevents it. The business half is this callback: it
   * re-checks the LIVE selection and drag state, so an already-armed control, a
   * stale one, or any platform that fires `onRefresh` anyway still cannot
   * replace the dataset underneath a sweep.
   */
  const handleGridRefresh = useCallback(() => {
    const gate = solveMemoryRefreshGate({
      selecting,
      dragArmed: dragRef.current.armed,
      dragActive: dragRef.current.active,
    });
    if (!gate.allowRefresh) return;
    void refresh();
  }, [refresh, selecting]);

  /**
   * ONE POINTER EVENT: hit test, apply the crossed ids, feed the edge ticker.
   *
   * Batched: one `setSelection` per pointer event regardless of how many cells
   * the finger crossed, and NO state write at all when nothing new was crossed.
   */
  const applyDragAt = useCallback((x: number, y: number) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    fingerRef.current = { x, y };
    const hit = resolveMemoryAtPoint(memoryRowZones(rowRegistryRef.current as MemoryRowRegistry), x, y);
    const outcome = stepMemoryDrag(drag, hit?.contentId ?? null, visualMemoryIdsRef.current);
    dragRef.current = moveMemoryDragPointer(outcome.state, x, y);
    if (outcome.step.kind === 'range') {
      const ids = outcome.step.contentIds;
      const mode = outcome.step.mode;
      setSelection((previous) => {
        const selectedIds = applyMemoryVisualRange(drag.baselineSelectedIds, ids, mode, previous.excludedIds);
        return { ...previous, selectedIds };
      });
    }
    edgeTickerRef.current?.update(y);
  }, []);

  /**
   * MO-A3 DEVICE FIX (D1) — the ONE programmatic scroll path.
   *
   * The offset is only recorded when a command REALLY was issued. An unsupported
   * host therefore stops the ticker instead of accumulating a tracked offset the
   * list never reached, so a broken host can never masquerade as a working
   * auto-scroll, and it can never leave a ticker running for nothing.
   */
  const scrollByRef = useCallback((deltaPx: number) => {
    const key = sourceKeyRef.current;
    const current = scrollOffsetsRef.current.get(key) ?? 0;
    const next = Math.max(0, current + deltaPx);
    const result = scrollMemoryListToOffset(listRef.current, next);
    if (result.appliedOffset === null) {
      stopEdgeScroll();
      return;
    }
    scrollOffsetsRef.current.set(key, result.appliedOffset);
  }, [stopEdgeScroll]);

  const onScrolledRef = useCallback(() => {
    // After a programmatic scroll, new rows may now be under a stationary
    // finger, so the hit test is re-run with the LAST finger position.
    const finger = fingerRef.current;
    if (finger === null) return;
    applyDragAt(finger.x, finger.y);
  }, [applyDragAt]);

  if (edgeTickerRef.current === null) {
    edgeTickerRef.current = createMemoryEdgeTicker({
      schedule: (tick, ms) => setInterval(tick, ms),
      cancel: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
      viewportHeight: () => viewportHeightRef.current,
      scrollBy: scrollByRef,
      onScrolled: onScrolledRef,
    });
  }

  const registerRow = useCallback((entry: MemoryTimelineRowEntry) => {
    const registry = rowRegistryRef.current as MemoryRowRegistry;
    const grew = registerMemoryRow(
      registry,
      entry.rowKey,
      entry.bounds === null
        ? null
        : { rowKey: entry.rowKey, bounds: entry.bounds, cells: entry.cells },
      entry,
    );
    if (!grew) return;
    // First measurement of this row: the mounted set just grew, so an in-flight
    // drag re-evaluates immediately instead of waiting for the next move.
    const finger = fingerRef.current;
    if (dragRef.current.active && finger !== null) applyDragAt(finger.x, finger.y);
  }, [applyDragAt]);

  const unregisterRow = useCallback((entry: MemoryTimelineRowEntry) => {
    unregisterMemoryRow(rowRegistryRef.current as MemoryRowRegistry, entry.rowKey, entry);
  }, []);

  // --- stable interaction seams (identity never changes) -------------------

  const handleToggle = useCallback((contentId: string) => {
    setSelection((previous) => toggleMemorySelection(previous, contentId));
  }, []);

  /**
   * Long press in NORMAL mode enters selection; long press while ALREADY
   * selecting only arms the drag.
   *
   * The arming itself is `handleDragArm`; this callback owns the decision to
   * CREATE an operation, and it is a no-op when one already exists — which is why
   * a second long press inside a selection never resets the pending selection.
   */
  const handleLongPress = useCallback((contentId: string) => {
    setSelection((previous) => {
      if (isMemorySelecting(previous)) return previous;
      return enterMemorySelection(previous, {
        purpose: { kind: 'generic' },
        initialContentIds: [contentId],
        excludedIds: [],
      });
    });
    // ONE subtle haptic when entering selection mode, and never per dragged cell.
    void lightHaptic();
  }, []);

  const handleDragArm = useCallback((contentId: string, isSelected: boolean) => {
    const armed = armMemoryDrag(dragRef.current);
    if (!armed.armed) return;
    // The mode comes from the ORIGIN cell only: a drag that starts on an
    // unselected Memory selects everything it crosses, and one that starts on a
    // selected Memory deselects everything it crosses.
    const current = selectionRef.current;
    const baseline = new Set(current.selectedIds);
    // A normal-mode long press enters selection asynchronously; its anchor is
    // still part of the baseline for the range machine.
    if (!isMemorySelecting(current)) baseline.add(contentId);
    dragRef.current = beginMemoryDrag(armed, contentId, () => isSelected, visualMemoryIdsRef.current, baseline);
  }, []);

  const handleDragMove = useCallback((pageX: number, pageY: number) => {
    applyDragAt(pageX, pageY);
  }, [applyDragAt]);

  const handleDragEnd = useCallback(() => {
    abortDrag();
  }, [abortDrag]);

  // --- enter / cancel / confirm -------------------------------------------

  /** Entry A and B: the Album surface, populated or empty. ONE flow. */
  const enterAddToAlbum = useCallback((albumId: string) => {
    if (!canOrganize) return;
    setSelectionFailure(null);
    setSelection((previous) =>
      enterMemorySelection(previous, {
        purpose: { kind: 'addToAlbum', albumId },
        excludedIds: memoriesRef.current
          .filter((memory) => memory.albumIds.includes(albumId))
          .map((memory) => memory.id),
      }),
    );
    void lightHaptic();
  }, [canOrganize]);

  /** Entry D: a long press inside the Album detail removes MEMBERSHIPS. */
  const enterRemoveFromAlbum = useCallback((albumId: string, firstContentId: string) => {
    if (!canOrganize) return;
    setSelectionFailure(null);
    // HC2-C: entering a selection no longer changes which Memories are on
    // screen, so it no longer opens the Album's collection read either. The
    // Album detail is a NESTED OVERLAY that stays mounted underneath, which is
    // exactly what makes cancel return to the same place.
    setSelection((previous) =>
      enterMemorySelection(previous, {
        purpose: { kind: 'removeFromAlbum', albumId },
        initialContentIds: [firstContentId],
      }),
    );
    void lightHaptic();
  }, [canOrganize]);

  /**
   * HC2-C C1 — opening an automatic collection is ordinary screen state.
   *
   * It reuses the ONE `collectionsController` that already existed; there is no
   * second read owner and no new collection state.
   */
  const openCollection = useCallback((ref: MemoryCollectionRef) => {
    if (activeCollectionId === memoryCollectionId(ref)) return;
    setActiveCollectionId(memoryCollectionId(ref));
    void collectionsControllerRef.current!.open(ref);
  }, [activeCollectionId]);

  const closeCollection = useCallback(() => {
    setActiveCollectionId(null);
    collectionsControllerRef.current!.reset();
  }, []);

  const cancelSelection = useCallback(() => {
    abortDrag();
    setSelectionFailure(null);
    setSelectionActionsOpen(false);
    setSelection((previous) => cancelMemorySelection(previous));
  }, [abortDrag]);

  const finishSelection = useCallback(() => {
    abortDrag();
    setSelectionFailure(null);
    setSelectionActionsOpen(false);
    setSelection((previous) => cancelMemorySelection(previous));
  }, [abortDrag]);

  /**
   * THE CONTEXTUAL ACTION SHEET — the single action host.
   *
   * HC2-C §11. The sheet is reachable from the FIRST FRAME of a selection (the
   * header's `⋯`), because the old `✓` existed only to reveal it and that made an
   * obvious organisation capability two taps away.
   *
   * ONE HOST, TWO CONTENTS. Choosing a destination Album REPLACES the content of
   * this same sheet; a second sheet is never stacked on top of it, and no second
   * destination `Modal` exists. The destination list is built from the Albums
   * this owner ALREADY loaded (`rail.albums`): no second read, no invented
   * destination, and no "create an Album from here".
   *
   * In an Album the destination of `Quitar del álbum` IS the open Album, so that
   * action asks for nothing. In the root and in an automatic collection there is
   * no known destination, so the same sheet asks for one.
   */
  const openSelectionActions = useCallback(() => {
    if (!canConfirmMemorySelection(selectionRef.current)) return;
    setSelectionFailure(null);
    setDestinationPickerOpen(false);
    setSelectionActionsOpen(true);
  }, []);

  /** `Quitar del álbum` in an Album: the destination is known, so nothing is asked. */
  const runKnownDestinationSelection = useCallback(async () => {
    const current = selectionRef.current;
    if (selectionBusy || !canConfirmMemorySelection(current)) return;
    const result = confirmMemorySelection(current);
    if (result === null || result.purpose.kind === 'generic') return;
    setSelectionActionsOpen(false);
    setSelectionBusy(true);
    try {
      const direction: MemoryMutationDirection =
        result.purpose.kind === 'addToAlbum' ? 'add' : 'remove';
      const albumId = result.purpose.albumId;

      // DESTINATION VALIDATION against the CANONICAL current scope: an
      // authoritative read, never the cached rail, so a destination deleted
      // remotely cannot receive a single request.
      let destinationAlive = false;
      if (token) {
        try {
          const albums = await fetchHomeCloudAlbums(token);
          destinationAlive = albums.some((album) => album.id === albumId);
        } catch {
          destinationAlive = false;
        }
      }
      if (!destinationAlive) {
        setSelectionFailure(
          toMemorySelectionFailure(direction, {
            committed: [],
            destinationMissing: true,
            failures: result.contentIds.map((contentId) => ({
              contentId,
              label: 'Un recuerdo',
              message: 'El álbum ya no está disponible.',
            })),
          }),
        );
        await reloadRail().catch(() => undefined);
        return;
      }

      const failure = await runAlbumMemberships(direction, albumId, result.contentIds);
      if (failure.failures.length > 0) {
        // PARTIAL FAILURE, represented honestly: the committed memberships stay
        // committed, the failed Memories are NAMED, and ONLY they stay selected
        // so a retry is exactly the retry.
        setSelectionFailure(failure);
        setSelection((previous) => ({
          ...previous,
          selectedIds: new Set(failure.failures.map((item) => item.contentId)),
        }));
        return;
      }
      finishSelection();
    } finally {
      setSelectionBusy(false);
    }
  }, [finishSelection, reloadRail, runAlbumMemberships, selectionBusy, token]);

  /** Retry ONLY the failed ids. The committed ones are never resubmitted. */
  const retryFailed = useCallback(async () => {
    const failure = selectionFailure;
    const current = selectionRef.current;
    if (failure === null || isTerminalDestinationFailure(failure) || selectionBusy) return;
    const result = confirmMemorySelection(current);
    if (result === null || result.purpose.kind === 'generic') return;
    setSelectionBusy(true);
    try {
      const next = await runAlbumMemberships(
        failure.direction,
        result.purpose.albumId,
        failure.failures.map((item) => item.contentId),
      );
      if (next.failures.length > 0) {
        setSelectionFailure(next);
        setSelection((previous) => ({
          ...previous,
          selectedIds: new Set(next.failures.map((item) => item.contentId)),
        }));
        return;
      }
      finishSelection();
    } finally {
      setSelectionBusy(false);
    }
  }, [finishSelection, runAlbumMemberships, selectionBusy, selectionFailure]);

  const chooseDestinationAlbum = useCallback(
    async (albumId: string) => {
      const current = selectionRef.current;
      const contentIds = [...current.selectedIds].filter((id) => !current.excludedIds.has(id));
      setDestinationPickerOpen(false);
      setSelectionActionsOpen(false);
      if (contentIds.length === 0) return;
      setSelectionBusy(true);
      try {
        const failure = await runAlbumMemberships('add', albumId, contentIds);
        if (failure.failures.length > 0) {
          setSelectionFailure(failure);
          setSelection((previous) => ({
            ...previous,
            selectedIds: new Set(failure.failures.map((item) => item.contentId)),
          }));
          return;
        }
        finishSelection();
      } finally {
        setSelectionBusy(false);
      }
    },
    [finishSelection, runAlbumMemberships],
  );

  /**
   * HC2-C §11 — the ONE action host, rendered ONCE.
   *
   * `selectionActionsOpen` is the contextual action sheet and
   * `destinationPickerOpen` is its destination content. They are mutually
   * exclusive contents of ONE `ActionSheet`, so "choose a destination Album" can
   * never appear as a sheet stacked on another sheet.
   */

  // =========================================================================
  // MO-A3 — derived selection data
  // =========================================================================

  const activeCollection = useMemo(
    () => (activeCollectionId === null ? null : parseMemoryCollectionId(activeCollectionId)),
    [activeCollectionId],
  );
  /**
   * The header of the open collection, resolved ONCE from the same facts the
   * Viewer source needs, so the overlay and the Viewer can never disagree about
   * which collection is open or what it is called.
   */
  const activeCollectionTitle = activeCollection === null
    ? ''
    : memoryCollectionTitle(
        activeCollection,
        activeCollection.kind === 'album'
          ? rail.albums.find((album) => album.id === activeCollection.albumId)?.name ?? null
          : null,
      );

  /**
   * THE VISIBLE DATASET OF THE CURRENT SURFACE.
   *
   * Recuerdos inside a selection is the SAME canonical library: `memories`, the
   * same loaded pages and the same previews. Selection overlays interaction; it
   * never forks the library read.
   *
   * HC2-C: the ONLY thing that swaps the dataset is the open collection, and
   * that is screen state now — not a sub-mode of the selection session. So
   * entering or leaving a selection can no longer change which Memories are on
   * screen.
   */
  const gridMemories = activeCollection === null ? memories : collections.memories;

  /**
   * GROUPING MODE FOLLOWS THE READ CONTRACT.
   *
   * An Album collection was read with `order: 'album'`, whose canonical sequence
   * puts an unknown date FIRST and a year-only Memory first within its year, so
   * it is grouped with `album` placement. The Timeline and a kind collection are
   * both read with `order: 'timeline'` and keep the DEFAULT Timeline placement,
   * byte-for-byte. The grouper never re-sorts either way.
   */
  const gridGroupingMode: TimelineGroupingMode = activeCollection?.kind === 'album' ? 'album' : 'timeline';

  /**
   * HC2-C (A4) — THE VIEWER DATASET, MEMOIZED AND IDENTITY-STABLE.
   *
   * This used to be recomputed on EVERY render of this screen, and for a type
   * collection `memoryViewerDataset` calls `.filter(...)`, so `FlatList data`
   * received a brand-new array identity on each render. Dataset identity must
   * never cause an arbitrary active-content change.
   *
   * Two independent protections, both about identity and neither about content:
   *  1. `useMemo` with EXPLICIT dependencies — the six inputs the resolver
   *     actually reads, and nothing else;
   *  2. `reuseMemoryViewerDataset` — re-reading page 0 or appending a page
   *     rebuilds arrays and objects, so when the ids are equal the PREVIOUS
   *     array is returned verbatim. A refresh that did not change what is in
   *     the dataset therefore cannot move the active Memory.
   *
   * The source is never consulted as a fallback: a source dataset that empties
   * yields `Missing`, never "switch to another source".
   */
  /** Previous dataset identity. Declared BEFORE the memo that reads it. */
  const previousViewerMemoriesRef = useRef<readonly HomeCloudMemoryListItem[]>(EMPTY_MEMORIES);
  const viewerMemories = useMemo(() => {
    if (viewer === null) return EMPTY_MEMORIES;
    const resolved = memoryViewerDataset(viewer.source, {
      library: memories,
      album: { sourceId: openAlbumId, memories: detail.memories },
      collection: { sourceId: collections.collectionId, memories: collections.memories },
    });
    return reuseMemoryViewerDataset(previousViewerMemoriesRef.current, resolved, (memory) => memory.id);
  }, [collections.collectionId, collections.memories, detail.memories, memories, openAlbumId, viewer]);
  previousViewerMemoriesRef.current = viewerMemories;

  /**
   * The Timeline grouping, with NO mode argument: the global Timeline keeps the
   * pre-MO-A3 placement exactly, and this memo is what the normal surface renders.
   */
  const sections = useMemo<TimelineListSection[]>(
    () => flattenTimelineForSectionList(groupMemoriesForTimeline(memories), TIMELINE_COLUMNS),
    [memories],
  );

  const gridSections = useMemo<TimelineListSection[]>(() => {
    if (activeCollection === null) return sections;
    return flattenTimelineForSectionList(
      groupMemoriesForTimeline(gridMemories, gridGroupingMode),
      TIMELINE_COLUMNS,
    );
  }, [activeCollection, gridGroupingMode, gridMemories, sections]);

  /**
   * ALREADY-MEMBER EXCLUSIONS, re-derived from the CURRENT read model.
   *
   * They are recomputed whenever the visible dataset or the operation changes,
   * and they PRUNE anything already selected, so the pending selection can only
   * ever hold Memories whose membership does not exist yet.
   */
  const excludedIds = useMemo<ReadonlySet<string>>(() => {
    const current = selection;
    if (!isMemorySelecting(current) || current.purpose === null || current.purpose.kind !== 'addToAlbum') {
      return EMPTY_EXCLUSIONS;
    }
    const albumId = current.purpose.albumId;
    return new Set(
      gridMemories.filter((memory) => memory.albumIds.includes(albumId)).map((memory) => memory.id),
    );
  }, [gridMemories, selection]);

  useEffect(() => {
    if (!selecting) return;
    setSelection((previous) => setMemorySelectionExclusions(previous, excludedIds));
  }, [excludedIds, selecting]);

  /**
   * PER-CARD PRIMITIVES, derived by the owner.
   *
   * The whole `selectedIds` Set is deliberately NOT handed to every row: each row
   * receives one `{ contentId, selected, unselectable }` descriptor per card, so a
   * change to one Memory re-renders exactly one cell.
   */
  const rowCells = useMemo(() => {
    const map = new Map<string, MemoryTimelineCell[]>();
    if (!selecting) return map;
    for (const section of gridSections) {
      for (const row of section.data) {
        map.set(
          row.key,
          row.items.map((memory) => ({
            contentId: memory.id,
            selected: selection.selectedIds.has(memory.id),
            unselectable: selection.excludedIds.has(memory.id),
          })),
        );
      }
    }
    return map;
  }, [gridSections, selecting, selection]);

  // This is the exact rendered Memory order across section boundaries. Headers,
  // wrappers and empty spacers never receive an index. Mounted measurements only
  // resolve pointer hits; the full loaded order keeps virtualized ranges stable.
  const visualMemoryIds = useMemo<readonly string[]>(() => {
    const next: string[] = [];
    for (const section of gridSections) {
      for (const row of section.data) {
        for (const memory of row.items) next.push(memory.id);
      }
    }
    return next;
  }, [gridSections]);
  visualMemoryIdsRef.current = visualMemoryIds;

  // =========================================================================
  // MO-A3 — scroll, list ownership and edge auto-scroll
  // =========================================================================

  const handleGridScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // A REF, never React state: this fires at up to 60 Hz.
    scrollOffsetsRef.current.set(sourceKeyRef.current, event.nativeEvent.contentOffset.y);
  }, []);

  const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
    // The viewport height is what the edge bands are a fraction of.
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  // Restore the offset of the surface being entered, so Recuerdos -> Fotos ->
  // Recuerdos comes back exactly where it was, without ever re-reading data.
  //
  // MO-A3 DEVICE FIX (D1): the restore goes through the SAME adapter as the
  // edge auto-scroll, because that adapter is the only scroll authority in this
  // screen. It was previously routed through a second invented `scrollToOffset`
  // with the identical latent crash.
  useEffect(() => {
    const offset = scrollOffsetsRef.current.get(sourceKey) ?? 0;
    if (offset <= 0) return;
    scrollMemoryListToOffset(listRef.current, offset);
  }, [sourceKey]);

  // =========================================================================
  // MO-A3 — BackHandler (ONE owner, explicit priority) and AppState
  // =========================================================================

  const collectionDetailOpen = activeCollection !== null;
  /** Frozen openTypeCollection seam, declared next to the state it closes over. */
  const openTypeCollection = useCallback((memoryKind: string) => {
    const ref = MEMORY_TYPE_COLLECTIONS.find((candidate) => candidate.kind === 'type' && candidate.memoryKind === memoryKind);
    if (ref !== undefined) openCollection(ref);
  }, [openCollection]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // 1. An ACTIVE DRAG aborts the drag and NOTHING else: a half-finished
      //    sweep must not also close the surface it was sweeping.
      if (dragRef.current.active) {
        abortDrag();
        return true;
      }
      // 2. A selection cancels on the SAME surface, keeping the same offset.
      if (selecting) {
        cancelSelection();
        return true;
      }
      // 3. An open automatic collection closes its own nested overlay.
      if (collectionDetailOpen) {
        closeCollection();
        return true;
      }
      // 4. The Album detail closes instead of the whole HomeCloud screen.
      if (openAlbumIdRef.current !== null) {
        closeAlbum();
        return true;
      }
      // 5. Otherwise the existing navigation behaviour applies.
      return false;
    });
    return () => subscription.remove();
  }, [abortDrag, cancelSelection, closeAlbum, closeCollection, collectionDetailOpen, selecting]);

  /**
   * APPSTATE — GESTURE CLEANUP ONLY.
   *
   * There is no offline, background or sync product behaviour here. What must not
   * survive a backgrounding is an ACTIVE DRAG: the ticker and the visited set are
   * transient by definition. The selection session itself MAY survive, so Back
   * returns to exactly what the user was doing.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') return;
      abortDrag();
    });
    return () => subscription.remove();
  }, [abortDrag]);

  // A ticker's lifetime can never outlive the component.
  useEffect(
    () => () => {
      abortDrag();
      clearMemoryRowRegistry(rowRegistryRef.current as MemoryRowRegistry);
      scrollOffsetsRef.current.clear();
    },
    [abortDrag],
  );

  /**
   * MO-A3 DEVICE FIX (D3) — SUPPRESS FOR THE SESSION, RESTORE ON EXIT.
   *
   * The whole selection session, not only the active drag: an edge swipe must not
   * "accidentally terminate the session", and by the time a drag is active the
   * native recognizer has already been evaluating the pan. The restore is the
   * captured baseline, so normal HomeCloud navigation is bit-for-bit what it was.
   */
  useEffect(() => {
    exitGesture.sync(selecting);
  }, [exitGesture, selecting]);

  /**
   * And on the way out — unmount, which covers the header back button and the
   * programmatic pop that never reach this screen's BackHandler. React Navigation
   * also clears `setOptions` overrides on unmount, so the two mechanisms agree.
   */
  useEffect(() => () => {
    exitGesture.release();
  }, [exitGesture]);

  // =========================================================================
  // MO-A2 — Household reset — nothing from household A may render in household B
  // =========================================================================
  //
  // HC2-C (B1 / B2) — WHY THE RAIL READ IS THE LAST LINE HERE
  // --------------------------------------------------------
  // This is the ONE AND ONLY scope authority, so it is also where the Albums read
  // belongs: the reset and the read are two halves of the same fact, "these are
  // the Albums of THIS household".
  //
  // The defect was an ORDERING one. `loadRail()` used to run from its own effect,
  // declared BEFORE this one, and `useFocusEffect` fires on the same commit as the
  // mount. The sequence was therefore `load -> reload -> reset`. `reset()` bumps
  // the rail generation and clears `hasLoadedOnce`, so BOTH answers were rejected
  // by the controller's own generation check and NOTHING re-read afterwards: the
  // rail stayed at `loading: true, albums: []` forever — the pair of permanent
  // grey blocks that were reported. No focus event could rescue it, because
  // switching `Archivos -> Recuerdos` is local state rather than a focus change
  // and both panes stay mounted.
  //
  // Emitting the read HERE, AFTER `reset()`, fixes it structurally: whatever order
  // React runs the focus effect in relative to this one, there is now always a
  // read whose generation is the newest, so the first paint resolves.
  //
  // HOUSEHOLD ISOLATION IS NOT WEAKENED (HC2-C R3)
  // ------------------------------------------------
  // On a REAL household/token change `reset()` still runs FIRST, so the previous
  // household's albums, its detail, its editor, its selection and its open
  // collection are all dropped before the new scoped read is even issued. The
  // skeleton that follows is honest, because nothing is yet known about the new
  // household. Removing the reset would have "fixed" the skeleton by letting one
  // household's Albums leak into the next, which is not a fix.
  useEffect(() => {
    setOpenAlbumId(null);
    setEditor(null);
    setActionsAlbum(null);
    setSheetError(null);
    setSaving(false);
    setDeleting(false);
    setDetail(ALBUM_DETAIL_INITIAL);
    detailControllerRef.current!.reset();
    railControllerRef.current!.reset();
    // MO-A3 extends THIS effect — the one and only scope authority — with the
    // whole transient selection surface. A sign-out clears `token` and a
    // household switch clears `householdId`, so both land here.
    abortDrag();
    clearMemoryRowRegistry(rowRegistryRef.current as MemoryRowRegistry);
    scrollOffsetsRef.current.clear();
    setSelectionFailure(null);
    setSelectionBusy(false);
    setDestinationPickerOpen(false);
    setSelection(resetMemorySelectionScope());
    setCollections(MEMORY_COLLECTIONS_INITIAL);
    collectionsControllerRef.current!.reset();
    // AND the one scoped Albums read that replaces this scope's contents. Skipped
    // without a scope, because there is nothing to read.
    if (token && householdId) void railControllerRef.current!.load();
  }, [abortDrag, householdId, token]);

  const showAlbumDetail = !selecting && openAlbumId !== null;
  /**
   * HC2-C C1 — the collection overlay, gated exactly like the Album one: while a
   * selection is active the selection grid IS the surface, and `activeCollectionId`
   * is deliberately KEPT so cancel returns to the same collection context.
   */
  const showCollectionDetail = !selecting && activeCollection !== null;

  // =========================================================================
  // Render
  // =========================================================================

  const purposeKind: 'generic' | 'addToAlbum' | 'removeFromAlbum' =
    selecting && selection.purpose !== null ? selection.purpose.kind : 'generic';
  const purposeAlbumId =
    selecting && selection.purpose !== null && selection.purpose.kind !== 'generic'
      ? selection.purpose.albumId
      : null;
  const destinationName =
    purposeAlbumId === null
      ? null
      : rail.albums.find((album) => album.id === purposeAlbumId)?.name ?? null;

  /**
   * HC2-C §11 — the ONE action host, rendered ONCE.
   *
   * `selectionActionsOpen` is the contextual action sheet and
   * `destinationPickerOpen` is its destination content. They are mutually
   * exclusive contents of ONE `ActionSheet`, so "choose a destination Album" can
   * never appear as a sheet stacked on another sheet.
   */
  const selectionSheetOpen = selectionActionsOpen || destinationPickerOpen;
  const selectionSheetTitle = destinationPickerOpen ? 'Agregar a un álbum' : 'Acciones';
  /**
   * In an Album the destination of `Quitar del álbum` IS the open Album, so that
   * action asks for nothing. Everywhere else the destination must be chosen.
   */
  const canRemoveFromOpenAlbum = purposeKind === 'removeFromAlbum' && purposeAlbumId !== null;

  /**
   * HC2-C C1 — THE COMPOSED ROOT HEADER.
   *
   * One header, always mounted, identical in normal and selection mode:
   *
   *     1. ÁLBUMES  (rail, with its own honest state)
   *     2. TIPOS    (Fotos · Videos · Audios · Notas)
   *
   * and the Timeline follows below as the SectionList's own body.
   *
   * It is NOT a function of `selecting` any more. The old header swapped itself
   * for a collection back control as soon as a selection started, which is one of
   * the four conditionals that made selection feel like a navigation destination.
   */
  const rootHeader = (
    <View style={styles.rootHeader}>
      <AlbumsRail
        albums={rail.albums}
        state={rail}
        canOrganize={canOrganize}
        accessToken={token}
        onOpenAlbum={openAlbum}
        onAlbumActions={openAlbumActions}
        onCreateAlbum={openCreateAlbum}
        onRetry={() => void reloadRail()}
      />
      <MemoryTypesSection
        collections={MEMORY_TYPE_COLLECTIONS}
        onOpenCollection={openTypeCollection}
      />
    </View>
  );

  /**
   * HC2-C (B4) — THE TIMELINE'S OWN STATE, INSIDE THE TIMELINE.
   *
   * This used to be a whole-body branch: `loading ? <MemoriesLoadingSkeleton/> :
   * … : gridList`. While the first Timeline page was in flight the ENTIRE body —
   * including the Albums section, which is this very list's `ListHeaderComponent`
   * — was unmounted. That is why the Albums appeared LATE and then appeared as
   * skeletons: the section only started existing after the Timeline had already
   * finished, with its own read still unresolved.
   *
   * The three surfaces are now independent, exactly as §23 requires:
   *
   *  - Albums renders its own LOADING, and stays mounted throughout;
   *  - Types is four fixed tiles, never a skeleton;
   *  - the Timeline declares ITS state through `ListEmptyComponent`, which the
   *    SectionList only reaches when it genuinely has no sections.
   *
   * Nothing about grouping, ordering, pagination, sticky headers or D4 changes:
   * this only decides what the list shows when it is empty, and the honest answer
   * differs by WHY it is empty.
   */
  const timelineEmptyState = loading ? (
    <MemoriesLoadingSkeleton />
  ) : error && memories.length === 0 ? (
    <View style={styles.timelineEmpty}>
      <ErrorState
        title="No pudimos cargar tus recuerdos"
        description={error}
        retryLabel="Reintentar"
        onRetry={() => void loadFirstPage()}
      />
    </View>
  ) : (
    <View style={styles.timelineEmpty}>
      <HomePlusIcon name="image-outline" size={38} color={colors.text.tertiary} />
      <AppText variant="title3" weight="800" align="center">
        {'Aún no hay recuerdos'}
      </AppText>
      <AppText variant="body" tone="secondary" align="center">
        {'Las fotos, videos, audios y escritos que quieran conservar van a aparecer acá.'}
      </AppText>
    </View>
  );

  const gridFooter =
    activeCollection !== null
      ? collections.nextOffset !== null || collections.pageError !== null
        ? (
          <View style={styles.footer}>
            {collections.pageError !== null ? (
              <AppText variant="caption" tone="danger" align="center">
                {collections.pageError}
              </AppText>
            ) : null}
            {collections.nextOffset !== null ? (
              <AppButton
                title={collections.loadingMore ? 'Cargando…' : 'Mostrar más recuerdos'}
                variant="secondary"
                disabled={collections.loadingMore}
                onPress={() => void collectionsControllerRef.current!.loadMore()}
              />
            ) : null}
          </View>
        )
        : null
      : nextOffset !== null
        ? (
          <View style={styles.footer}>
            <AppButton
              title={loadingMore ? 'Cargando…' : 'Mostrar más recuerdos'}
              variant="secondary"
              disabled={loadingMore}
              onPress={() => void loadMore()}
            />
          </View>
        )
        : null;

  const gridList = (
    <SectionList
      key={sourceKey}
      ref={listRef}
      sections={gridSections}
      keyExtractor={(row) => row.key}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      onScroll={handleGridScroll}
      scrollEventThrottle={DRAG_SCROLL_THROTTLE}
      onLayout={handleGridLayout}
      refreshControl={
        /*
         * MO-A3 DEVICE FIX (D2) — GESTURE PREVENTION.
         *
         * While a selection session is live the RefreshControl is NOT MOUNTED, for
         * any source. A mounted `UIRefreshControl` is armed by the native pan from
         * touch-down and `refreshing={false}` does not disarm it, so suppressing it
         * by flag was never going to work on a real iPhone; the previous code kept
         * it mounted with `refreshing={selecting ? false : refreshing}` and the
         * sweep could therefore pull the Timeline. Ordinary vertical scrolling is
         * untouched, because this is the refresh prop, not `scrollEnabled`.
         *
         * Normal mode keeps the ordinary control with its ordinary indicator, and
         * the header refresh button and intake completion still call the same read
         * directly, so no refresh capability is removed from the product.
         *
         * The drag flags are passed as false ON PURPOSE: mounting depends only on
         * the session, because the arming long press happens after the native pan
         * has already started tracking. That is the gate's stated contract, not an
         * omission.
         */
        solveMemoryRefreshGate({ selecting, dragArmed: false, dragActive: false }).mountRefreshControl ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleGridRefresh} />
        ) : undefined
      }
      ListHeaderComponent={rootHeader}
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
        <MemoryTimelineRow
          rowKey={item.key}
          items={item.items}
          cells={rowCells.get(item.key) ?? []}
          accessToken={token}
          columns={TIMELINE_COLUMNS}
          selecting={selecting}
          measureRows={selecting}
          disabled={selectionBusy}
          onToggle={handleToggle}
          onOpen={activeCollection === null
            ? openLibraryViewer
            : (memory) => setViewer(collectionViewerSession(
                activeCollection,
                memoryCollectionId(activeCollection),
                memoryCollectionTitle(
                  activeCollection,
                  activeCollection.kind === 'album'
                    ? rail.albums.find((album) => album.id === activeCollection.albumId)?.name ?? null
                    : null,
                ),
                memory.id,
              ))}
          onLongPress={handleLongPress}
          onDragArm={handleDragArm}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          registerRow={registerRow}
          unregisterRow={unregisterRow}
        />
      )}
      ListFooterComponent={gridFooter}
      ListEmptyComponent={timelineEmptyState}
      onEndReached={() => {
        if (activeCollection !== null) void collectionsControllerRef.current!.loadMore();
        else void loadMore();
      }}
      onEndReachedThreshold={0.6}
    />
  );

  /*
   * HC2-C C1 — THE `Colecciones` SCREEN IS DELETED.
   *
   * It was a parallel `ScrollView` with its own title, its own back control, its
   * own scroll offset and its own Album grid, and it existed ONLY while a
   * selection was active. That made the automatic collections unreachable in
   * NORMAL mode and gave the root a second information architecture.
   *
   * What replaces it is not a move: the `Tipos` row above now opens each
   * collection as a nested overlay over this same root, and `Álbumes` above that
   * already opens an Album the same way. There is no second grid, no second read
   * owner and no second offset to keep in sync.
   */

  return (
    <View style={styles.screen}>
      {selecting ? (
        <MemorySelectionHeader
          selectedCount={selection.selectedIds.size}
          purpose={purposeKind}
          destinationName={destinationName}
          canAddToAlbum={canOrganize}
          onCancel={cancelSelection}
          onOpenActions={openSelectionActions}
          busy={selectionBusy}
          failure={selectionFailure}
          onRetryFailed={() => void retryFailed()}
        />
      ) : (
        <View style={styles.titleRow}>
          <AppText variant="title3" weight="800" style={styles.headerTitle}>
            {'Recuerdos'}
          </AppText>
          {/*
           * HC2-C §9 — THE ROUTINE REFRESH BUTTON IS GONE FROM THIS HEADER.
           *
           * It duplicated pull-to-refresh with the same `refresh()` that the
           * reconciliation and an intake completion already call, so it was a
           * second control for one capability rather than a capability of its own.
           *
           * Removing it removes NO recovery: `refresh()` and `handleGridRefresh`
           * stay, the `RefreshControl` stays mounted outside a selection, and
           * every real error state still carries its own explicit retry.
           *
           * PULL_TO_REFRESH = DEVICE_QA_REQUIRED: no automated test can prove the
           * native pan still arms the control on a real iPhone once the button is
           * gone. That is a device gate, not a claim.
           */}
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
      )}
      {capabilitiesNotice && !selecting ? (
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

      {/*
       * HC2-C C1/B4 — THE BODY IS ALWAYS THE GRID LIST.
       *
       * There is no longer a selection branch and no longer a collection branch
       * here:
       *
       *  - the `loading` / `error` / empty branches moved INTO the SectionList as
       *    its `ListEmptyComponent` (B4), so the composed root header stays
       *    mounted through the first Timeline read;
       *  - a collection is a NESTED OVERLAY rendered below, exactly like an
       *    Album, so opening one no longer replaces the body;
       *  - selection is contextual state that no longer changes the structure,
       *    so it has no branch here at all.
       *
       * The root is ONE vertical scroll: ÁLBUMES, TIPOS, TIMELINE.
       */}
      {gridList}

      {/*
       * HC2-C §9 — THE ROUTINE REFRESH BUTTON IS GONE FROM THE HEADER.
       *
       * It duplicated pull-to-refresh with the same `refresh()` the
       * reconciliation and an intake completion already call, so it was a second
       * control for one capability, not a capability of its own. Removing it
       * removes NO recovery: `refresh()` and `handleGridRefresh` stay, the
       * `RefreshControl` stays mounted outside a selection, and every real error
       * state still carries its own explicit retry.
       *
       * PULL_TO_REFRESH = DEVICE_QA_REQUIRED: no automated test can prove that
       * the native pan still arms the control on a real iPhone once the button
       * is gone. That is a device gate, not a claim.
       */}

      {/*
       * ALBUM DETAIL as a NESTED OVERLAY, not a route and not a swap. The
       * SectionList stays mounted for the whole time the Album is open, so its
       * loaded pages, its grouped dataset and its scroll offset all survive Back.
       *
       * While a selection is active it is NOT rendered: the selection grid IS
       * the surface. `openAlbumId` is deliberately KEPT, which is what makes
       * cancel return to the exact same Album context.
       */}
      {showAlbumDetail ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <AlbumDetailView
            album={openAlbumRecord}
            state={detail}
            accessToken={token}
            canOrganize={canOrganize}
            selecting={selecting}
            onBack={closeAlbum}
            onOpenActions={() => { if (openAlbumRecord) openAlbumActions(openAlbumRecord); }}
            onRefresh={refreshDetail}
            onLoadMore={loadMoreDetail}
            onAddMemories={() => { if (openAlbumId !== null) enterAddToAlbum(openAlbumId); }}
            onLongPressMemory={(contentId) => {
              if (openAlbumId !== null) enterRemoveFromAlbum(openAlbumId, contentId);
            }}
            onOpenMemory={(memory) => setViewer(albumViewerSession(
              openAlbumId,
              openAlbumRecord?.name ?? null,
              memory.id,
            ))}
          />
        </View>
      ) : null}

      {/*
       * AUTOMATIC COLLECTION as the SAME nested overlay an Album is.
       *
       * `activeCollectionId` is ordinary screen state, exactly like
       * `openAlbumId`, so opening `Fotos` cannot change the root's information
       * architecture: the composed header and the Timeline stay mounted
       * underneath and Back simply hides this overlay.
       */}
      {showCollectionDetail ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <MemoryCollectionDetailView
            title={activeCollectionTitle}
            state={collections}
            accessToken={token}
            selecting={selecting}
            onBack={closeCollection}
            onRefresh={() => void collectionsControllerRef.current!.refresh()}
            onLoadMore={() => void collectionsControllerRef.current!.loadMore()}
            onToggle={handleToggle}
            onLongPressMemory={(contentId) => {
              setSelectionFailure(null);
              setSelection((previous) => enterMemorySelection(previous, {
                purpose: { kind: 'generic' },
                initialContentIds: [contentId],
              }));
              void lightHaptic();
            }}
            onOpenMemory={(memory) => {
              if (activeCollection === null) return;
              setViewer(collectionViewerSession(
                activeCollection,
                activeCollectionId as string,
                activeCollectionTitle,
                memory.id,
              ));
            }}
          />
        </View>
      ) : null}

      {viewer ? (
        <MemoryViewer
          memories={viewerMemories}
          activeContentId={viewer.activeContentId}
          accessToken={token}
          source={viewer.source}
          onClose={() => setViewer(null)}
          onActiveChange={(activeContentId) => setViewer((current) => current ? { ...current, activeContentId } : current)}
          onNearEnd={() => {
            if (viewer.source.kind === 'library') void loadMore();
            else if (viewer.source.kind === 'album') loadMoreDetail();
            else void collectionsControllerRef.current!.loadMore();
          }}
        />
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
        onAddMemories={() => {
          if (actionsAlbum === null) return;
          const target = actionsAlbum.id;
          setActionsAlbum(null);
          enterAddToAlbum(target);
        }}
        onDelete={() => void confirmDeleteAlbum()}
      />

      {/*
       * HC2-C §11 — THE ONE ACTION HOST.
       *
       * One `ActionSheet`, two mutually exclusive CONTENTS:
       *
       *  - the contextual ACTIONS of the current selection, reachable from the
       *    first frame (no `✓` gate);
       *  - the DESTINATION Album picker, which REPLACES the actions inside this
       *    same sheet rather than opening a second one.
       *
       * The destination list is built from the Albums this owner ALREADY loaded
       * (`rail.albums`): no second read, no invented destination and no "create
       * an Album from here" — the ordinary Albums rail remains the creation
       * surface.
       *
       * In an Album, `Quitar del álbum` needs no destination at all: the open
       * Album IS the destination, so that action runs immediately.
       */}
      <ActionSheet
        visible={selectionSheetOpen}
        title={selectionSheetTitle ?? undefined}
        onRequestClose={() => {
          setSelectionActionsOpen(false);
          setDestinationPickerOpen(false);
        }}
        closeDisabled={selectionBusy}
        size="content"
      >
        <View style={styles.destination}>
          {destinationPickerOpen ? (
            rail.albums.length === 0 ? (
              <>
                <AppText variant="bodySmall" weight="700">
                  {NO_ALBUMS_DESTINATION_TITLE}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {NO_ALBUMS_DESTINATION_BODY}
                </AppText>
              </>
            ) : (
              rail.albums.map((album) => (
                <AppButton
                  key={album.id}
                  title={album.name}
                  variant="secondary"
                  disabled={selectionBusy}
                  onPress={() => void chooseDestinationAlbum(album.id)}
                  accessibilityLabel={`Agregar la selección al álbum ${album.name}`}
                />
              ))
            )
          ) : (
            <>
              {/*
               * `Agregar a un álbum` is only meaningful with `homecloud.organize`;
               * without it the affordance is not advertised at all, because the
               * action could only fail.
               */}
              {canOrganize ? (
                <AppButton
                  title="Agregar a un álbum"
                  variant="secondary"
                  disabled={selectionBusy}
                  onPress={() => setDestinationPickerOpen(true)}
                  accessibilityLabel={`Agregar ${selection.selectedIds.size} recuerdos a un álbum`}
                />
              ) : null}
              {canRemoveFromOpenAlbum ? (
                <AppButton
                  title={memorySelectionRemoveLabel(selection.selectedIds.size)}
                  variant="secondary"
                  disabled={selectionBusy}
                  onPress={() => void runKnownDestinationSelection()}
                  accessibilityLabel={`${memorySelectionRemoveLabel(selection.selectedIds.size)} de ${destinationName ?? 'este álbum'}`}
                />
              ) : null}
              {/*
               * Multi-select OS Share is DEFER on purpose and deliberately NOT
               * rendered: sharing N binaries would need N downloads, N temporary
               * files and a product decision that has not been frozen. Offering a
               * dead action here would be worse than omitting it.
               */}
            </>
          )}
          <AppButton
            title="Cancelar"
            variant="ghost"
            disabled={selectionBusy}
            onPress={() => {
              setSelectionActionsOpen(false);
              setDestinationPickerOpen(false);
            }}
          />
        </View>
      </ActionSheet>
    </View>
  );
}

/** Honest short label for one Memory, used to name a failed mutation. */
function memoryFailureLabel(memory: HomeCloudMemoryListItem): string {
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
  footer: { paddingVertical: spacing[4], alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] },
  timelineEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[8], gap: spacing[3] },
  skeletonRow: { flexDirection: 'row', gap: spacing[2], marginVertical: spacing[2] },
  skeletonTile: { flex: 1, borderRadius: radius.lg },
  skeletonWrap: { paddingHorizontal: spacing[5], gap: spacing[3] },
  /**
   * HC2-C C1: the composed root header. It is ONE container above the Timeline,
   * not two siblings, so the section order is structurally `Álbumes` then
   * `Tipos` and a future section cannot be inserted between them by accident.
   */
  rootHeader: { gap: spacing[2], paddingBottom: spacing[2] },
  destination: { gap: spacing[2], paddingBottom: spacing[3] },
});
