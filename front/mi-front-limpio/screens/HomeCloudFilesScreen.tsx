import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Easing, FlatList, PanResponder, RefreshControl, StyleSheet, View, useWindowDimensions, type GestureResponderEvent, type GestureResponderHandlers } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { ActionSheet, AdaptiveActionMenu, AppButton, AppInput, AppText, ErrorState, InteractivePressable, menuAnchorFromEvent, type MenuAnchor } from '../components/ui';
import { FileActionHost, type FilePatch } from '../services/homecloud/FileActionHost';
import { FileMoveDestinationPicker } from '../services/homecloud/FileMoveDestinationPicker';
import { FilesFilterMenu } from '../services/homecloud/FilesFilterMenu';
import { FileSelectionBar } from '../services/homecloud/FileSelectionBar';
import { HomePlusIcon } from '../constants/icons';
import { colors, MOTION, radius, spacing } from '../constants/theme';
import { FileIntake } from '../services/homecloud/FileIntake';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { FileUndoSnackbar } from '../services/homecloud/FileUndoSnackbar';
import { FilesFavoritesChip } from '../services/homecloud/FilesFavoritesChip';
import { FileAutoScrollEdgeHint } from '../services/homecloud/FileAutoScrollEdgeHint';
import { HomeCloudFileViewer } from './HomeCloudFileViewerScreen';
import { restoreHomeCloudFile } from '../services/homecloud/homecloudTrashService';
import {
  VIEWER_OPEN_MIN_SCALE,
  viewerOpenDurationMs,
  viewerOpenKindForFile,
  type ViewerOpenKind,
} from '../services/homecloud/homecloudViewerTransition';
import { useHomeCloudCapabilities } from '../services/homecloud/useHomeCloudCapabilities';
import { homeCloudCapabilitiesNotice } from '../services/homecloud/homecloudCapabilitiesNotice';
import {
  DEFAULT_FILES_FILTER_STATE,
  filesFavoritesOnly,
  filesFilterAccessibilityLabel,
  hasNonDefaultFilesFilter,
  type FilesFilterState,
  type FilesShowMode,
} from '../services/homecloud/homecloudFilesFilters';
import { createHomeCloudFolder, deleteHomeCloudFolder, fetchFilesBrowser, moveHomeCloudFolder, renameHomeCloudFolder, setHomeCloudFileFavorite, updateHomeCloudFile, FILES_BROWSER_MAX_LIMIT } from '../services/homecloud/homecloudFilesService';
import { trashHomeCloudFile } from '../services/homecloud/homecloudTrashService';
import { folderDisplayPath, folderTrail, folderWithDescendantIds, parentFolderIdOf, resolveNearestExistingFolderId } from '../services/homecloud/homecloudFolderTree';
import { createFilesPagination, type FilesPaginationState } from '../services/homecloud/homecloudFilesPagination';
import {
  applyDragSelectionStep,
  beginDragSelection,
  dragAutoScrollNextOffset,
  dragSelectionTargetSelected,
  hitTestFileTile,
  listMaxOffset,
  pointerToListContent,
  recordFileTileFrame,
  DRAG_AUTO_SCROLL,
  type DragSelectionGesture,
  type FileTileFrames,
  type ListViewportGeometry,
  type TileFrame,
} from '../services/homecloud/homecloudDragSelection';
import {
  emptyFileSelection,
  enterFileSelection,
  fileSelectionCount,
  fileSelectionSummary,
  isFileSelected,
  leaveFileSelection,
  pruneFileSelection,
  selectedFileIds,
  setFileSelectionSelected,
  toggleFileSelection,
  type FileSelection,
} from '../services/homecloud/homecloudFileSelection';
import { bulkMoveFeedback, bulkMoveFiles, bulkMoveInFlight, type BulkMoveFeedback } from '../services/homecloud/homecloudBulkMove';
import { exportHomeCloudStagedCopy, HomeCloudDownloadError, shareHomeCloudDownloadedFile, stageHomeCloudOriginal } from '../services/homecloud/homecloudDownloadService';
import { fetchHomeCloudFoldersCached, invalidateHomeCloudHousehold } from '../services/homecloud/homecloudReadService';
import { subscribeHomeCloudReadReconciliation } from '../services/homecloud/homecloudReadReconciliation';
import { classifyHomeCloudReadFailure, homeCloudReadFailureDetail, homeCloudReadFailureDescription, homeCloudReadFailureTitle, type HomeCloudReadFailure } from '../services/homecloud/homecloudReadFailure';
import type { HomeCloudFile, HomeCloudFolder } from '../services/homecloud/homecloudTypes';

type GridItem = { kind: 'folder'; value: HomeCloudFolder } | { kind: 'file'; value: HomeCloudFile };

/**
 * WHICH MOVE INTENT the ONE destination picker is currently serving.
 *
 * Stage 2 (Phase 1) adds a third one. There is deliberately still exactly ONE
 * picker INSTANCE and ONE destination grammar: the flat-folder version already
 * guaranteed that a File's Move and a bulk Move could never offer different
 * destinations, and a Folder's Move has to obey the same rule or the hierarchy
 * would gain a second way to be navigated.
 */
type MoveIntent =
  | { readonly kind: 'file' }
  | { readonly kind: 'bulk' }
  | { readonly kind: 'folder'; readonly folderId: string };

/**
 * W1-B — the page size of the EXISTING backend contract.
 *
 * The server clamps `limit` to 100 and defaults to it, so asking for the
 * maximum keeps the request count low without ever being silently truncated.
 * The S4-iii has-more probe lives in the READ, not here: the server answers this
 * page size plus one proof row and reports `nextOffset` from that evidence, so a
 * household with exactly 100 files is never told there is another page.
 */
const FILES_PAGE_SIZE = FILES_BROWSER_MAX_LIMIT;

/**
 * STAGE 2 REOPEN — how early the next page starts loading.
 *
 * The Files grid shows only a few rows per viewport, so a threshold below 1 would
 * make the member reach the hard bottom before the request had even left. `2` keeps
 * the next page in flight while there is still a screenful of rows left to scroll,
 * which is what makes normal scrolling never stop on a button.
 */
const FILES_END_REACHED_THRESHOLD = 2;

/** The household folder catalogue this screen owns and refreshes on mutation. */
type FolderCatalogueScope = { householdId: string };

/**
 * HC-POL-014 / HC-POL-021 — ONE tile's OWNED motion values.
 *
 * The SURFACE creates them at the moment of an isolated toggle, because a tile
 * is also rendered outside a React cycle: the drag sweep hit-tests tiles by
 * their measured frames and the surface's `renderItem` output is inspected
 * directly, so a tile must stay a pure render with no hook state of its own.
 * A tile that is not animating receives `IDLE_TILE_FEEDBACK`, whose values are
 * permanently 1 and therefore render as the plain, direct state.
 */
type TileFeedback = {
  readonly checkScale: Animated.Value;
  readonly badgeOpacity: Animated.Value;
};

const IDLE_TILE_FEEDBACK: TileFeedback = {
  checkScale: new Animated.Value(1),
  badgeOpacity: new Animated.Value(1),
};

export function HomeCloudFilesView({ visible = true }: { visible?: boolean } = {}) {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const token = session?.access_token ?? null;
  const reducedMotion = useReducedMotion();
  const [folder, setFolder] = useState<HomeCloudFolder | null>(null);
  // W1-B: the folder catalogue has ONE owner — the cached, household-scoped
  // folder read below. It is read once per household (30s TTL) instead of on
  // every load, keystroke, sort and focus, and it is the ONLY source that can
  // answer the move picker: `browser.folders` is the browser's own display
  // payload and is empty inside a folder, so it is never used as a catalogue.
  const [allFolders, setAllFolders] = useState<HomeCloudFolder[]>([]);
  const [query, setQuery] = useState('');
  /**
   * STAGE 2 (Phase 2) — DISPLAY FILTER / ORDER.
   *
   * `sort` and `favoritesOnly` were two permanent buttons in the title row; they
   * are now ONE filter state behind a single compact icon. The SEMANTICS are
   * unchanged and server-side: `sort` is still the canonical server order and
   * `favoritesOnly` is still a predicate applied before the page is taken.
   */
  const [filterState, setFilterState] = useState<FilesFilterState>(DEFAULT_FILES_FILTER_STATE);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const sort = filterState.sort;
  const favoritesOnly = filesFavoritesOnly(filterState);
  // Files Core — the personal-Favorites FILTER MODE.
  //
  // It is a mode, not a search term: it composes with folder, search, sort and
  // pagination instead of replacing them, and the server narrows the set BEFORE
  // the page is taken. That is why it travels with the read context instead of
  // filtering the rows already loaded — filtering a page in the client is what
  // corrupts pagination and has-more evidence.

  const [error, setError] = useState<string | null>(null);
  const [readFailure, setReadFailure] = useState<{ kind: HomeCloudReadFailure; message: string; detail?: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false); const [uploadOpen, setUploadOpen] = useState(false); const [folderEditor, setFolderEditor] = useState<{ mode: 'create' | 'rename'; item?: HomeCloudFolder } | null>(null); const [folderName, setFolderName] = useState(''); const [folderActions, setFolderActions] = useState<HomeCloudFolder | null>(null); const [folderActionAnchor, setFolderActionAnchor] = useState<MenuAnchor | null>(null); const [actionTargetId, setActionTargetId] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ tone: 'secondary' | 'danger'; message: string } | null>(null);
  // STAGE 2 REOPEN — THE FAVORITE'S OWN BUSY STATE AND ITS OWN FAILURE CHANNEL.
  //
  // Neither rides on `saving`/`error` any more, and the reason is behavioural, not
  // cosmetic: `saving` disables the ENTIRE File action surface for as long as the
  // Favorite PATCH plus its window-preserving reconciliation take, and `error`
  // REPLACES the whole Files list while its `Reintentar` re-reads page one. Between
  // them, one refused or slow Favorite froze the action menu, hid the list, and
  // collapsed a loaded 300-row window back to 100 — while throwing the member out
  // of the folder, query and sort they were in. See `toggleFileFavorite`.
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // LIFECYCLE V1 — the Papelera mutation's OWN busy state, same rule as the
  // Favorite: one refused or slow Trash must not freeze the whole action
  // surface, and its refusal is stated in the sheet, never as a list error.
  const [trashBusy, setTrashBusy] = useState(false);
  // HC-POL-018 — the ONE reversible action in the browser has a real second
  // chance. A trashed File can be restored while it is still in the Papelera,
  // so the snackbar lives until the member acts on it or dismisses it, and
  // never on a timer that would hide an action which is still valid.
  const [undoTrash, setUndoTrash] = useState<{ id: string; displayName: string } | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  // HC-POL-011 — the direction the browser was travelled, so the CONTENT can
  // slide the way the member went instead of being swapped in place.
  const [folderDirection, setFolderDirection] = useState<'enter' | 'back' | null>(null);
  const folderSlide = useRef(new Animated.Value(0)).current;
  const breadcrumbFade = useRef(new Animated.Value(1)).current;
  // HC-POL-013 — the header morph. One driven value, so entering and leaving
  // selection mode are the SAME transition read in two directions.
  const headerMorph = useRef(new Animated.Value(0)).current;
  // HC-POL-015 — the edge the auto-scroll is ACTUALLY scrolling from. It is
  // null the rest of the time, so a plain scroll never draws anything.
  const [autoScrollEdge, setAutoScrollEdge] = useState<'top' | 'bottom' | null>(null);
  // HC-POL-012/057 — the ONE viewer transition, owned here next to the tile
  // measurement it needs. `viewerOpenKind` records whether this particular open
  // was origin-aware or an honest fade, and `viewerOpenOrigin` carries the
  // tapped tile's geometry relative to the window-sized layer.
  const viewerOpenProgress = useRef(new Animated.Value(0)).current;
  const [viewerOpenKind, setViewerOpenKind] = useState<ViewerOpenKind>('fade');
  const [viewerOpenOrigin, setViewerOpenOrigin] = useState({ translateX: 0, translateY: 0, scale: 1 });
  const windowDimensions = useWindowDimensions();
  // Selection belongs to the CURRENT browser context and is never persisted.
  const [selection, setSelection] = useState<FileSelection>(emptyFileSelection());
  // The ONE destination picker, serving a single File, the selection, or a Folder.
  const [moveIntent, setMoveIntent] = useState<MoveIntent | null>(null);
  // The batch outcome is stated OUTSIDE the selection bar on purpose: when every
  // moved File left the folder the selection itself ends, and the member must
  // still be told what happened.
  const [bulkFeedback, setBulkFeedback] = useState<BulkMoveFeedback | null>(null);
  const [page, setPage] = useState<FilesPaginationState>(() => ({
    folders: [], files: [], nextOffset: null, loading: true, loadingMore: false, pageError: null, autoPageBlocked: false, contextKey: null,
  }));
  const { folders, files, loading, loadingMore, pageError } = page;

  // ── the canonical File action/info target ─────────────────────────────────
  //
  // FRESHNESS: the host is fed an ID and RESOLVED against the CURRENT rows, never
  // handed the object that happened to be captured when it was opened. Without
  // this, another member's rename / note / move / date would land in the server
  // and the open Info sheet would keep showing the copy it opened with — a
  // knowingly obsolete representation of a File the member is editing. Option A
  // of the freshness model: the rows the surface already re-reads ARE the single
  // source, so no second read, no new endpoint and no realtime is involved.
  const actionTarget = useMemo<HomeCloudFile | null>(
    () => (actionTargetId === null ? null : files.find((file) => file.id === actionTargetId) ?? null),
    [actionTargetId, files],
  );
  // A File that is no longer among the loaded rows — it left this folder, this
  // query, this window or this household — is not something this context can
  // describe, so the host closes instead of offering to edit an object that is
  // gone. Re-entering the same context re-opens nothing: the ID is dropped too.
  useEffect(() => {
    if (actionTargetId === null || actionTarget !== null) return;
    setActionTargetId(null);
    setDownloadFeedback(null);
    setActionError(null);
  }, [actionTargetId, actionTarget]);

  // S4-iii B1/B5 — the identity of the QUESTION this screen is asking. It
  // travels with every read and it is what the loaded rows are labelled with, so
  // the surface can never paint one context's rows under another's title.
  // Folder context and query can mean opposite things (a root query searches
  // EVERY file; a folder query searches only inside), which is why a folder
  // change clears the query (see `openFolder`/`leaveFolder`).
  //
  // Files Core: `favoritesOnly` is part of that identity too. Toggling it asks a
  // DIFFERENT question, so it must produce a different context — otherwise the
  // Favoritos toggle would relabel the previous, unfiltered rows as filtered ones.
  const contextKey = `${folder?.id ?? 'root'}\u0000${query}\u0000${sort}\u0000${favoritesOnly ? 'favorites' : 'all'}`;

  /**
   * Selection is scoped to ONE browser context, and so is the drag-selection
   * gesture. A folder, query, sort or household change means the selected ids no
   * longer describe what the member is looking at, so they are discarded — there
   * is no cross-folder and no cross-household selection. A `loadMore` does NOT
   * change this key, so paging through the same context keeps every selection.
   */
  const selectionScope = `${currentHousehold?.id ?? ''}\u0000${contextKey}`;

  // W1-A: capabilities are read ONCE per scope through the canonical cached
  // fetch, independently of this list's data. A failed capabilities read can no
  // longer take the whole Files surface down, and typing in search can no longer
  // re-request the projection.
  const capabilities = useHomeCloudCapabilities();
  const caps = capabilities.descriptor;

  // W1-B: the pagination transitions live in a framework-free controller
  // (`homecloudFilesPagination`), which owns generations, dedupe and the
  // page-error boundary.
  //
  // There is EXACTLY ONE controller per surface, and it reads the current query
  // through a ref. Recreating it per query would give each query its own
  // generation counter, and an in-flight page of the previous query would then
  // still believe it owns the list. One controller means one generation
  // timeline, so a stale answer can never be applied — across queries, across
  // sorts, across folder changes and across a household switch.
  const queryContextRef = useRef({ token, folderId: folder?.id ?? null, query, sort, favoritesOnly, contextKey });
  queryContextRef.current = { token, folderId: folder?.id ?? null, query, sort, favoritesOnly, contextKey };

  const controllerRef = useRef<ReturnType<typeof createFilesPagination> | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createFilesPagination({
      limit: FILES_PAGE_SIZE,
      onState: setPage,
      // B1: the controller labels the loaded rows with the query they were read
      // for, so a context change is visible to the render immediately.
      contextKey: () => queryContextRef.current.contextKey,
      read: async (input) => {
        const context = queryContextRef.current;
        const data = await fetchFilesBrowser(context.token ?? '', {
          folderId: context.folderId,
          query: context.query,
          sort: context.sort,
          favoritesOnly: context.favoritesOnly,
          limit: input.limit,
          offset: input.offset,
        });
        return {
          folders: data.browser.folders,
          files: data.browser.files,
          nextOffset: data.browser.nextOffset,
        };
      },
    });
  }

  /** Turn a read failure into the surface's own ACCESS/RECOVERABLE verdict. */
  const presentReadFailure = useCallback((e: unknown) => {
    const kind = classifyHomeCloudReadFailure(e);
    setReadFailure({ kind, message: homeCloudReadFailureDescription(kind), detail: homeCloudReadFailureDetail(kind, e) });
  }, []);

  const load = useCallback(async () => {
    if (!token || !currentHousehold) { setPage((previous) => ({ ...previous, loading: false })); return; }
    setError(null); setReadFailure(null);
    try {
      // Every first page starts at offset 0: search, sort and folder changes
      // replace the list instead of appending to the previous query's pages.
      await controllerRef.current!.load();
    } catch (e) {
      // A refusal is an ACCESS problem and a transport failure is a RECOVERABLE
      // one: they are classified here so a 403 can never render as an empty
      // folder and so a dropped connection is never shown as a lost permission.
      presentReadFailure(e);
    }
  }, [token, currentHousehold?.id, presentReadFailure]);

  /**
   * S4-iii C1 — a refresh answers the SAME question, so the loaded window
   * survives it. Upload completion, intake completion, folder mutations, moves,
   * metadata edits and the manual refresh control all come through here; a
   * 300-row window stays a 300-row window instead of collapsing to 100.
   */
  const refresh = useCallback(async () => {
    if (!token || !currentHousehold) { setPage((previous) => ({ ...previous, loading: false })); return; }
    setError(null); setReadFailure(null);
    try {
      await controllerRef.current!.refreshPreservingWindow();
    } catch (e) {
      presentReadFailure(e);
    }
  }, [token, currentHousehold?.id, presentReadFailure]);

  const loadMore = useCallback(async () => {
    if (!token || !currentHousehold) return;
    await controllerRef.current!.loadMore();
  }, [token, currentHousehold?.id]);

  /**
   * THE MEMBER'S `Reintentar`.
   *
   * It is deliberately NOT `loadMore`: automatic paging is latched after a failure
   * so a flaky connection cannot become a retry storm, and only an explicit request
   * re-arms it. If it fails again the latch returns, so this can never become a
   * loop either.
   */
  const retryNextPage = useCallback(async () => {
    if (!token || !currentHousehold) return;
    await controllerRef.current!.retryNextPage();
  }, [token, currentHousehold?.id]);

  /**
   * THE AUTOMATIC PAGINATION TRIGGER.
   *
   * It is the canonical `loadMore` and nothing else: the controller's synchronous
   * `loadingMore` flag is what collapses a burst of `onEndReached` callbacks into a
   * single request, and its latch is what stops a failed page from becoming a retry
   * storm. No IntersectionObserver, no poller, no timer, no second controller.
   */
  const onEndReached = useCallback(() => { void loadMore(); }, [loadMore]);

  // B2 — the debounce owns the QUERY/SORT/FOLDER state change, and only that.
  // It depends on the context itself, so it runs exactly once per intentional
  // change and the 250 ms search debounce is what actually gates the read.
  // Keeping `load` out of the dependency array is the point: a callback that
  // changes identity on every keystroke used to fire this effect AND the focus
  // effect at once, so one intended search cost two reads.
  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, query, sort, folder?.id, favoritesOnly]);

  /**
   * ONE RETURN = ONE EFFECTIVE READ.
   *
   * Navigation focus, the app coming back to the foreground and the Files tab
   * becoming visible again are three physical signals of a SINGLE user return, and
   * the platform can easily deliver two of them together (returning from the
   * background re-focuses the route; switching back from Memories arrives in the
   * same turn as the foreground event). They therefore share ONE funnel: a signal
   * that arrives while the previous return read is still in flight joins it
   * instead of issuing a second one.
   *
   * It is NOT a cache and NOT a refresh framework: nothing is remembered after the
   * read settles, no state is stored, and the only primitive it ever calls is the
   * EXISTING window-preserving `refresh`.
   */
  const returnRead = useRef<Promise<void> | null>(null);
  const refreshOnReturn = useCallback((): Promise<void> => {
    const inFlight = returnRead.current;
    if (inFlight) return inFlight;
    const pending = refresh();
    returnRead.current = pending;
    const settle = () => { if (returnRead.current === pending) returnRead.current = null; };
    pending.then(settle, settle);
    return pending;
  }, [refresh]);

  // B2 — focus freshness is a SEPARATE concern and is deliberately not tied to
  // the query state: re-entering the surface refreshes, a keystroke does not.
  // The first mount is skipped because the context effect above already issued
  // the initial read.
  //
  // FRESHNESS: it now goes through the return funnel, so focus and foreground
  // arriving together cost ONE read. It keeps the window-preserving primitive:
  // re-entering asks the SAME question, so the pages already loaded are re-read
  // instead of being thrown away, and with nothing loaded it IS the first page.
  const focusRefresh = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!focusRefresh.current) { focusRefresh.current = true; return; }
    void refreshOnReturn();
  }, [refreshOnReturn]));

  /**
   * FRESHNESS GAP 1 — the app coming back to the foreground.
   *
   * A Files list that was already focused never re-fires `useFocusEffect`, so
   * without this a member who left the app kept looking at whatever the list said
   * when they left, no matter what the rest of the household did meanwhile. There
   * is no realtime in Files V1 and none is added here: this is ONE read on ONE
   * natural boundary, through the EXISTING window-preserving refresh.
   *
   *   background | inactive | extension -> active   -> ONE return read
   *   active -> active                              -> not a return
   *   the first mount                              -> not a return
   *
   * The state the screen was mounted in is recorded BEFORE subscribing, so a
   * platform that replays the current state on subscription cannot manufacture a
   * refresh for a surface that has just mounted. When the platform could not state
   * the status at mount time there is nothing known to be stale, so the first
   * reported status is likewise not treated as a return. Unmounting removes the
   * subscription, so a torn-down surface can never read.
   */
  const appStatus = useRef<string | null>(null);
  useEffect(() => {
    appStatus.current = AppState.currentState ?? null;
    const subscription = AppState.addEventListener('change', (next) => {
      const previous = appStatus.current;
      appStatus.current = next;
      if (next !== 'active') return;
      if (previous === null || previous === 'active') return;
      void refreshOnReturn();
    });
    return () => { subscription.remove(); appStatus.current = null; };
  }, [refreshOnReturn]);

  /**
   * FRESHNESS — the Files tab becoming VISIBLE again.
   *
   * HomeCloud keeps both panes mounted and toggles `display: none`, so returning
   * from Memories creates no navigation focus at all: without this signal the
   * member would visibly come back to a list nobody had re-read. It is the SAME
   * funnel, so a tab return and a foreground event that arrive together are one
   * read.
   *
   * Only a HIDDEN -> VISIBLE transition is a boundary. The first mount is not one
   * (the context effect already issued the initial read) and neither is a
   * household switch, where the surface is still visible and the controller has
   * just discarded the previous household's pages on its own.
   */
  const wasVisible = useRef(visible);
  useEffect(() => {
    const previous = wasVisible.current;
    wasVisible.current = visible;
    if (!visible || previous) return;
    void refreshOnReturn();
  }, [visible, refreshOnReturn]);

  // W1-B: the destination catalogue is read ONCE per household, through the
  // cached, household-scoped read. It is deliberately NOT part of `load`: a
  // per-keystroke catalogue request was the redundancy W1-B removes.
  //
  // S4-iii A — and it is re-read after every folder mutation, through the EXISTING
  // `invalidateHomeCloudHousehold`, so a create/rename/delete is observed here
  // and by every other consumer of the same cache key (the File Intake
  // destination picker included) instead of lingering for the 30 s TTL.
  const catalogueScope: FolderCatalogueScope | null = currentHousehold ? { householdId: currentHousehold.id } : null;
  const refreshCatalogue = useCallback(async () => {
    if (!token || !catalogueScope) return;
    invalidateHomeCloudHousehold(catalogueScope);
    try {
      setAllFolders(await fetchHomeCloudFoldersCached(token, catalogueScope));
    } catch {
      /* The list itself is unaffected; the picker degrades to the folders already known. */
    }
  }, [token, catalogueScope?.householdId]);

  useEffect(() => {
    let active = true;
    if (!token || !catalogueScope) { setAllFolders([]); return undefined; }
    fetchHomeCloudFoldersCached(token, catalogueScope)
      .then((catalog) => { if (active) setAllFolders(catalog); })
      .catch(() => { /* The list itself is unaffected; the picker degrades to the folders already known. */ });
    return () => { active = false; };
  }, [token, catalogueScope?.householdId]);

  useEffect(() => {
    setFolder(null); setQuery(''); setFilterState(DEFAULT_FILES_FILTER_STATE); setAllFolders([]); setError(null); setReadFailure(null);
    // The return guard belongs to the household being LEFT: it is released here so
    // the new household's first return is never mistaken for a duplicate of the
    // old one's in-flight read.
    returnRead.current = null;
    // A household switch discards every page of the household being left,
    // including any still in flight. The generation bump is what makes an answer
    // for the previous household unpublishable, so a late read can never land in
    // the new household's list.
    controllerRef.current!.reset();
  }, [currentHousehold?.id]);

  // STAGE 2 (Phase 3) — the Viewer is a LAYER over this screen, not a route.
  // Keeping it in place is what makes "back" restore the EXACT browser context for
  // free: the folder trail, the query, the sort, the Favoritos mode, the loaded
  // window and the scroll position are all still here, untouched, underneath.
  const [viewerTargetId, setViewerTargetId] = useState<string | null>(null);
  const viewerTarget = useMemo<HomeCloudFile | null>(
    () => (viewerTargetId === null ? null : files.find((file) => file.id === viewerTargetId) ?? null),
    [viewerTargetId, files],
  );
  //
  // The open folder is kept as an ID STACK, not as one "current folder" object.
  // That is the whole difference between a hierarchy and the old flat list: "back"
  // means ONE LEVEL UP instead of jumping to the root, which is what a member
  // expects the moment folders nest to any depth.
  //
  // The stack is DERIVED from the household catalogue rather than accumulated, so it
  // can never disagree with the tree: a folder renamed remotely shows the new name,
  // a folder moved remotely re-resolves to the new ancestor chain, and a folder
  // deleted remotely drops out of the trail entirely.
  const trail = useMemo<readonly HomeCloudFolder[]>(
    () => folderTrail(allFolders, folder?.id ?? null),
    [allFolders, folder?.id],
  );
  const currentPath = useMemo<string | null>(
    () => folderDisplayPath(allFolders, folder?.id ?? null),
    [allFolders, folder?.id],
  );

  // S4-iii B1/B5 — a folder context change CLEARS the query and keeps the sort.
  //
  //   any folder change:   query = ''
  //   any folder change:   sort PRESERVED
  //   any folder change:   favoritesOnly PRESERVED
  //
  // The same text must not silently change meaning because the member
  // navigated: a root query searches every file, a folder query searches only
  // inside. The state change above performs exactly ONE debounced read for the
  // new context.
  //
  // Files Core: `favoritesOnly` behaves like `sort`, not like the query. It is a
  // MODE ("show me my favorites"), so a member who turned it on keeps it on when
  // they step into Garantías and look for their favorite files in there. The
  // query is cleared because its MEANING changes with the folder; the mode does
  // not change meaning, so it survives.
  /**
   * HC-POL-011 — the ONE folder navigation motion.
   *
   * Entering a folder and coming back are the same slide read in opposite
   * directions, which is what makes the hierarchy feel like a place instead of
   * a list that changes. The motion is interruptible by construction: a second
   * travel replaces the running animation instead of queueing behind it, so
   * backing out of a folder that is still entering reverses mid-flight rather
   * than waiting.
   *
   * It moves the CONTENT only. The search field, the breadcrumb trail, the title
   * row and the tab selector never shift, so a navigation never looks like the
   * whole shell was rebuilt. Reduced motion collapses to a 40 ms linear settle
   * with no displacement, per the V2 contract.
   */
  const playFolderMotion = useCallback((direction: 'enter' | 'back') => {
    setFolderDirection(direction);
    const distance = direction === 'enter' ? 28 : -28;
    folderSlide.setValue(distance);
    Animated.timing(folderSlide, {
      toValue: 0,
      duration: reducedMotion ? 40 : MOTION.folderSlide,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    breadcrumbFade.setValue(0);
    Animated.timing(breadcrumbFade, {
      toValue: 1,
      duration: reducedMotion ? 40 : MOTION.folderBreadcrumb,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [folderSlide, breadcrumbFade, reducedMotion]);

  const openFolder = useCallback((next: HomeCloudFolder) => {
    playFolderMotion('enter');
    setFolder(next); setQuery(''); setError(null); setReadFailure(null);
  }, [playFolderMotion]);
  /**
   * Back means ONE LEVEL UP. `trail` is the derived root-to-current chain, so
   * popping it lands on the immediate parent and is a no-op at the root. The
   * return is typed as `HomeCloudFolder | undefined` and the `?? null` makes the
   * root the explicit, always-valid answer rather than a special case.
   */
  const leaveFolder = useCallback(() => {
    playFolderMotion('back');
    const parent = trail.length >= 2 ? trail[trail.length - 2] : undefined;
    setFolder(parent ?? null); setQuery(''); setError(null); setReadFailure(null);
  }, [playFolderMotion, trail]);

  /**
   * A folder that no longer exists is not something this surface can keep showing.
   *
   * `resolveNearestExistingFolderId` answers the closest folder that still exists,
   * and the ROOT is the always-valid fallback, so a folder deleted on another device
   * lands somewhere coherent instead of leaving the browser in a ghost folder or
   * re-reading a deleted id forever. This runs only while a folder IS open, so it
   * never costs a write at the root.
   */
  useEffect(() => {
    if (folder === null || allFolders.length === 0) return;
    if (allFolders.some((candidate) => candidate.id === folder.id)) return;
    const nearest = resolveNearestExistingFolderId(allFolders, folder);
    setFolder(nearest === null ? null : allFolders.find((candidate) => candidate.id === nearest) ?? null);
    setQuery(''); setError(null); setReadFailure(null);
  }, [allFolders, folder]);

  // ── selection ────────────────────────────────────────────────────────────
  //
  // Product decision: a plain tap on a File is RESERVED for the Viewer and is
  // therefore never a selection gesture. Selection is ENTERED by a long press or
  // by the explicit "Seleccionar" control, and only while the mode is active does
  // a tap toggle.

  /** The discoverable entry, so nobody has to know the hidden long-press gesture. */
  const enterSelectionMode = useCallback(() => {
    setBulkFeedback(null);
    setSelection(enterFileSelection);
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // STAGE 2 REOPEN — DRAG SELECTION
  // ═════════════════════════════════════════════════════════════════════════
  //
  // WHY THE RESPONDER LIVES ON THE TILE AND IS ARMED, NEVER AUTO-ARMED
  // -------------------------------------------------------------------
  // Normal scrolling inside selection mode MUST keep working, so this gesture can
  // never be won by a movement threshold: sweeping straight down a column of Files
  // and flicking the list are the same physical motion. The only event that tells
  // them apart is the LONG PRESS, which is a decision the member already made.
  //
  //   before the threshold  the LIST owns the gesture. `onStartShouldSetPanResponder`
  //                         returns false unconditionally and
  //                         `onShouldBlockNativeResponder` is false, so an ordinary
  //                         swipe is still an ordinary scroll.
  //   at the threshold     `onLongPress` arms the sweep. The mode is read ONCE, from
  //                         the anchor's CURRENT selection state.
  //   after arming         the tile's pan responder claims the movement stream and
  //                         BLOCKS THE NATIVE SCROLL RECOGNIZER. On the New
  //                         Architecture the FlatList's pan is native, so blocking it
  //                         is the only way to keep a stationary finger on the tile
  //                         that is scrolling underneath it.
  //   on release/terminate the gesture, its visited set and the auto-scroll timer all
  //                         end together.
  //
  // NO new dependency: this is React Native's own `PanResponder`, the same primitive
  // `AccountSheet` and `HouseholdSwitcherSheet` already use in this app. The rules
  // themselves (mode, visited set, hit test, auto-scroll bounds) live in the pure
  // `homecloudDragSelection` module, so nothing here re-implements them.
  const listRef = useRef<FlatList<GridItem> | null>(null);
  const selectionRef = useRef<FileSelection>(selection);
  selectionRef.current = selection;
  const dragGestureRef = useRef<DragSelectionGesture | null>(null);
  const dragFramesRef = useRef<FileTileFrames>(new Map());
  const listGeometryRef = useRef<ListViewportGeometry>({ listPageY: 0, viewportHeightDp: 0, contentHeightDp: 0 });
  const contentOffsetRef = useRef(0);
  const autoScrollHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  /** Record one MEASURED File tile frame. Folders never call this, so a sweep can
   *  never select a Folder even if a finger passes over one. */
  const registerFileTileFrame = useCallback((fileId: string, frame: TileFrame) => {
    dragFramesRef.current = recordFileTileFrame(dragFramesRef.current, fileId, frame);
  }, []);

  /** Fold one crossed File into the armed gesture, applying the decided state once. */
  const applyCrossedFile = useCallback((fileId: string) => {
    const gesture = dragGestureRef.current;
    if (!gesture) return;
    const next = applyDragSelectionStep(gesture, fileId);
    // The SAME object means this File was already processed by THIS gesture, so it is
    // structurally a no-op: no second toggle, no new selection identity.
    if (next === gesture) return;
    dragGestureRef.current = next;
    const selected = dragSelectionTargetSelected(next);
    setSelection((previous) => setFileSelectionSelected(previous, fileId, selected));
  }, []);

  /** Hit-test a pointer position against the MEASURED frames and fold what it found. */
  const hitTestPointer = useCallback((pageX: number, pageY: number) => {
    const geometry = listGeometryRef.current;
    const point = pointerToListContent({
      pageX,
      pageY,
      listPageY: geometry.listPageY,
      contentOffsetY: contentOffsetRef.current,
    });
    const hit = hitTestFileTile(dragFramesRef.current, point.x, point.y);
    if (hit === null) return;
    applyCrossedFile(hit);
  }, [applyCrossedFile]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollHandleRef.current !== null) {
      clearInterval(autoScrollHandleRef.current);
      autoScrollHandleRef.current = null;
    }
    // HC-POL-015: the hint leaves with the scroll, so a release never leaves an
    // edge accent behind over an idle list.
    setAutoScrollEdge(null);
  }, []);

  /**
   * One bounded auto-scroll step.
   *
   * The list moves a fixed distance under a finger that is NOT moving, and the hit
   * test is re-run against the NEW offset -- otherwise a sweep near the bottom edge
   * would keep selecting the same row forever. A tick that cannot move the list
   * (already at that end) does nothing, which is what stops the timer at a boundary
   * instead of firing forever against it.
   */
  const autoScrollStep = useCallback(() => {
    const geometry = listGeometryRef.current;
    const before = contentOffsetRef.current;
    const next = dragAutoScrollNextOffset({
      pointerViewportY: pointerRef.current.y - geometry.listPageY,
      viewportHeightDp: geometry.viewportHeightDp,
      currentOffsetDp: before,
      maxOffsetDp: listMaxOffset(geometry),
    });
    if (next === null) return;
    contentOffsetRef.current = next;
    listRef.current?.scrollToOffset?.({ offset: next, animated: false });
    // HC-POL-015: the edge accent is drawn only for a step that REALLY moved the
    // list. A finger parked at the bottom while the list is already there draws
    // nothing, which is what keeps the hint from becoming permanent chrome. The
    // functional form matters: an unchanged edge is the SAME value, so the tick
    // does not re-render the grid 60 times a second.
    setAutoScrollEdge((previous) => {
      const nextEdge = next > before ? 'bottom' : 'top';
      return previous === nextEdge ? previous : nextEdge;
    });
    hitTestPointer(pointerRef.current.x, pointerRef.current.y);
  }, [hitTestPointer]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollHandleRef.current !== null) return;
    autoScrollHandleRef.current = setInterval(autoScrollStep, DRAG_AUTO_SCROLL.tickMs);
  }, [autoScrollStep]);

  // ── HC-POL-014 / HC-POL-021 — the tile motion the SURFACE owns ──────────────
  //
  // A tile is a pure render, so the values it animates with live here, created
  // at the moment of an isolated toggle and handed down by `renderItem`. They
  // are per-File and per-REASON (check, badge), and they are cleared with the
  // browser context they belong to.
  const tileFeedbackRef = useRef(new Map<string, TileFeedback>());
  const tileFeedback = useCallback((fileId: string): TileFeedback => {
    const existing = tileFeedbackRef.current.get(fileId);
    if (existing) return existing;
    const created: TileFeedback = { checkScale: new Animated.Value(1), badgeOpacity: new Animated.Value(1) };
    tileFeedbackRef.current.set(fileId, created);
    return created;
  }, []);
  /**
   * The check SETTLES onto its ring (0.85 -> 1, 120 ms) for an ISOLATED toggle
   * only. A drag sweep crosses many tiles in quick succession and states them
   * directly through `IDLE_TILE_FEEDBACK`; this runs for the deliberate taps and
   * the accessibility actions, which is where motion reads as care instead of as
   * twenty mechanical pops.
   */
  const animateTileCheck = useCallback((fileId: string) => {
    const entry = tileFeedback(fileId);
    entry.checkScale.setValue(0.85);
    Animated.timing(entry.checkScale, {
      toValue: 1,
      duration: MOTION.selectionCheck,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tileFeedback]);
  /**
   * The favorite badge fades in when a File the member is LOOKING at becomes a
   * favorite. A tile that merely mounts already-favorite never animates, so a
   * recycled cell does not flicker its badge at the member.
   */
  const animateTileBadge = useCallback((fileId: string) => {
    const entry = tileFeedback(fileId);
    entry.badgeOpacity.setValue(0);
    Animated.timing(entry.badgeOpacity, {
      toValue: 1,
      duration: MOTION.favoriteBadge,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tileFeedback]);
  const clearTileFeedback = useCallback(() => { tileFeedbackRef.current.clear(); }, []);

  /** Every end of a gesture clears the same three things, together. */
  const disarmDragSelection = useCallback(() => {
    dragGestureRef.current = null;
    stopAutoScroll();
  }, [stopAutoScroll]);

  /**
   * Arm the sweep. The anchor's CURRENT selection state decides the mode, once, and
   * the anchor itself is applied immediately so the held File visibly changes state
   * the moment the gesture begins.
   */
  const armDragSelection = useCallback((fileId: string) => {
    const gesture = beginDragSelection({
      anchorId: fileId,
      anchorSelected: isFileSelected(selectionRef.current, fileId),
    });
    dragGestureRef.current = gesture;
    // The sweep states its anchor DIRECTLY (HC-POL-014): a sweep is the one
    // place where immediate state is the right feedback, so no tile motion is
    // created for it.
    setSelection((previous) => setFileSelectionSelected(previous, fileId, dragSelectionTargetSelected(gesture)));
  }, []);

  /**
   * THE ONE PAN RESPONDER for every File tile.
   *
   * It is created once and reads everything through refs, so it never closes over a
   * stale selection and never needs to be rebuilt per row. Every File tile gets the
   * same `panHandlers`, because there is only ever ONE gesture: a gesture belongs to
   * the armed state in `dragGestureRef`, not to a row.
   */
  const dragPanResponder = useMemo(() => PanResponder.create({
    // NEVER claim on touch start. That single `false` is what keeps an ordinary
    // swipe an ordinary scroll.
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    // Claim the movement stream only once the long press has armed the sweep.
    onMoveShouldSetPanResponder: () => dragGestureRef.current !== null,
    onMoveShouldSetPanResponderCapture: () => dragGestureRef.current !== null,
    // Once the sweep owns the movement, the list must not take it back mid-gesture.
    onPanResponderTerminationRequest: () => false,
    // And the NATIVE scroll recognizer must yield, which is the actual mechanism on
    // the New Architecture.
    onShouldBlockNativeResponder: () => dragGestureRef.current !== null,
    onPanResponderMove: (_event, gesture) => {
      if (dragGestureRef.current === null) return;
      pointerRef.current = { x: gesture.moveX, y: gesture.moveY };
      hitTestPointer(gesture.moveX, gesture.moveY);
      startAutoScroll();
    },
    onPanResponderRelease: () => disarmDragSelection(),
    onPanResponderTerminate: () => disarmDragSelection(),
  }), [disarmDragSelection, hitTestPointer, startAutoScroll]);

  /**
   * NOTHING SURVIVES A CONTEXT CHANGE.
   *
   * An armed gesture belongs to one browser context and one finger. A household
   * switch, a folder change, a query, a sort, the Favoritos mode or leaving
   * selection mode all invalidate it, and so does unmounting the surface -- so the
   * armed state, the visited set and the auto-scroll timer are cleared together,
   * here and through `leaveSelectionMode`. A timer left running would keep scrolling
   * a list nobody is touching.
   */
  const dragScope = `${currentHousehold?.id ?? ''}\u0000${selectionScope}`;
  useEffect(() => { disarmDragSelection(); }, [dragScope, disarmDragSelection, selection.mode]);
  useEffect(() => () => disarmDragSelection(), [disarmDragSelection]);

  /**
   * STAGE 2 (Phase 2) — THE FILE INTERACTION GRAMMAR.
   *
   *   OUTSIDE selection:   tap  -> Viewer (the reserved seam, now WIRED)
   *                        long press -> contextual File actions
   *   INSIDE selection:    tap  -> toggle
   *                        long press -> NOTHING (no menu, no navigation)
   *
   * Only ONE gesture may be live at a time, so the long press inside selection is a
   * deliberate no-op rather than a "tap" or a "menu". A contextual menu during a
   * multi-select would let a member destroy or move a File they had only meant to
   * include in a batch.
   *
   * Selection is entered ONLY from the header overflow, so the gesture is never
   * hidden and never ambiguous.
   *
   * STAGE 2 (Phase 3): the tap now opens the Viewer. It resolves the File against
   * the CURRENT rows by id, so a File that left the window simply does not open
   * rather than opening a stale copy.
   */
const handleFileTap = useCallback((fileId: string) => {
    if (selection.mode) {
      // HC-POL-014 — the check settles onto its ring for the deliberate tap,
      // which is exactly the isolated toggle the motion is for. The mode is read
      // from the CURRENT selection, so the animation fires when the tap SELECTS.
      if (!isFileSelected(selection, fileId)) animateTileCheck(fileId);
      setSelection((previous) => (previous.mode ? toggleFileSelection(previous, fileId) : previous));
      return;
    }
    const target = files.find((candidate) => candidate.id === fileId);
    if (!target) return;
    // HC-POL-012/057 — decide WHICH transition this open is, before the layer
    // exists. A File with a real preview whose tile is measured and still on
    // screen expands out of that tile; everything else (a PDF without a cover,
    // audio, text, Office, or a tile that scrolled away) gets the honest short
    // fade instead of pretending a continuity the navigator cannot show.
    const frame = dragFramesRef.current.get(fileId) ?? null;
    const topInViewport = frame === null ? -1 : frame.y - contentOffsetRef.current;
    const visibleInViewport = frame !== null
      && topInViewport + frame.height > 0
      && topInViewport < listGeometryRef.current.viewportHeightDp;
    const kind = viewerOpenKindForFile({
      hasPreview: target.hasPreview === true,
      tileVisible: visibleInViewport,
    });
    setViewerOpenKind(kind);
    if (kind === 'origin' && frame !== null) {
      // The layer is an absolute fill of THIS screen, and this screen is the
      // window-sized pane, so the layer's box is the window's. That is what makes
      // the origin geometry computable at TAP time, deterministically, instead of
      // depending on a layout callback racing the first paint.
      const tileCenterX = frame.x + frame.width / 2;
      const tileCenterY = listGeometryRef.current.listPageY + topInViewport + frame.height / 2;
      setViewerOpenOrigin({
        translateX: tileCenterX - windowDimensions.width / 2,
        translateY: tileCenterY - windowDimensions.height / 2,
        scale: Math.max(VIEWER_OPEN_MIN_SCALE, Math.min(frame.width / windowDimensions.width, frame.height / windowDimensions.height)),
      });
    } else {
      setViewerOpenOrigin({ translateX: 0, translateY: 0, scale: 1 });
    }
    viewerOpenProgress.setValue(0);
    setViewerTargetId(fileId);
  }, [selection.mode, selection, files, animateTileCheck, windowDimensions.width, windowDimensions.height]);

  /**
   * HC-POL-012/057 — play the opening transition of the viewer layer.
   *
   * The layer's geometry was already decided at tap time, so all that is left is
   * the timing: the origin expansion runs 260 ms spring-out, the honest fade runs
   * 200 ms, and a reduced-motion device gets a 50 ms linear settle with no
   * transform at all. It runs as an EFFECT so re-opening while a previous open is
   * still animating replaces it instead of queueing behind it.
   */
  useEffect(() => {
    if (viewerTargetId === null) return undefined;
    Animated.timing(viewerOpenProgress, {
      toValue: 1,
      duration: viewerOpenDurationMs(viewerOpenKind, reducedMotion),
      easing: viewerOpenKind === 'origin' ? Easing.out(Easing.cubic) : Easing.linear,
      useNativeDriver: true,
    }).start();
    return undefined;
  }, [viewerTargetId, viewerOpenKind, viewerOpenProgress, reducedMotion]);
  const handleFileLongPress = useCallback((fileId: string, _event?: GestureResponderEvent) => {
    if (selection.mode) {
      // INSIDE selection mode a long press ARMS THE SWEEP and does nothing else: the
      // mode is read ONCE, from the anchor's current selection state, and is fixed
      // for the rest of the gesture.
      armDragSelection(fileId);
      return;
    }
    setBulkFeedback(null);
    setActionTargetId(fileId);
  }, [selection.mode, armDragSelection]);

  const leaveSelectionMode = useCallback(() => {
    disarmDragSelection();
    setBulkFeedback(null);
    clearTileFeedback();
    setSelection(leaveFileSelection());
  }, [disarmDragSelection, clearTileFeedback]);

  /**
   * HC-POL-013 — THE SELECTION HEADER MORPH.
   *
   * The header is not swapped, it is morphed: the SAME row cross-fades and shifts
   * by at most 4 pt while its height, the search field, the grid and the scroll
   * offset stay exactly where they were. Entering and leaving selection mode play
   * the same driven value in two directions, so neither direction is a different
   * transition. Reduced motion collapses it to a 30 ms linear presence change.
   */
  useEffect(() => {
    Animated.timing(headerMorph, {
      toValue: selection.mode ? 1 : 0,
      duration: reducedMotion ? 30 : MOTION.selectionMorph,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [selection.mode, headerMorph, reducedMotion]);

  /**
   * HC-POL-018 — restore the File the member just sent to the Papelera.
   *
   * It is a REAL restore against the lifecycle endpoint, not an optimistic local
   * patch: the server keeps the authority on whether the File is still
   * restorable, so a refusal is stated and the snackbar stays put instead of
   * pretending the File came back. On success the same window-preserving
   * `refresh` a trash uses reconciles the row back into place.
   */
  const undoTrashFile = useCallback(async () => {
    if (!token || !undoTrash || undoBusy) return;
    const targetId = undoTrash.id;
    setUndoBusy(true);
    try {
      await restoreHomeCloudFile(token, targetId);
      setUndoTrash(null);
      void refresh();
    } catch (e) {
      setBulkFeedback({
        tone: 'danger',
        message: e instanceof Error ? e.message : 'No pudimos restaurar el archivo.',
      });
    } finally {
      setUndoBusy(false);
    }
  }, [token, undoTrash, undoBusy, refresh]);

  /**
   * Selection is scoped to ONE browser context. A folder, query, sort or
   * household change means the selected ids no longer describe what the member is
   * looking at, so they are discarded — there is no cross-folder and no
   * cross-household selection. A `loadMore` does NOT change this key, so paging
   * through the same context keeps every selection.
   */
  useEffect(() => {
    setSelection((previous) => (
      previous.mode === false && previous.ids.size === 0 ? previous : leaveFileSelection()
    ));
    setBulkFeedback((previous) => (previous === null ? previous : null));
    // The tile motion belongs to the browser context it was created in: a new
    // context means new tiles, and no old value may leak into them.
    clearTileFeedback();
  }, [selectionScope, clearTileFeedback]);

  // W1-C: READ reconciliation is global, not a property of this screen. The
  // FileIntake that accepted the job is already unmounted by the time the job
  // finalizes, so correctness must not depend on its `onComplete`. This
  // subscription is only the mounted half of the mechanism: it is silent (no
  // refocus, no navigation, no modal) and the unmounted half needs nothing,
  // because a later entry re-reads with no stale cache to begin with.
  useEffect(() => {
    if (!currentHousehold?.id) return;
    return subscribeHomeCloudReadReconciliation(currentHousehold.id, (event) => {
      if (event.role !== 'file') return;
      void refresh();
    });
  }, [currentHousehold?.id, refresh]);

  const items = useMemo<GridItem[]>(() => [...folders.map(value => ({ kind: 'folder' as const, value })), ...files.map(value => ({ kind: 'file' as const, value }))], [folders, files]);
  // B1 — the rows on screen belong to the query they were READ for. While that
  // disagrees with the current context nothing loaded is current, so the list,
  // its empty state and its affordances are withheld and the transition shows
  // instead. A folder's rows can therefore never appear under another folder's
  // title, and root's rows can never appear under a folder's title.
  const rowsAreCurrent = page.contextKey === contextKey;
  // DENY-SAFE, but never silent: while capabilities are unresolved the mutable
  // affordances stay disabled, and the reason is stated instead of letting the
  // user believe the member simply has no actions in this home.
  const capabilitiesNotice = homeCloudCapabilitiesNotice(capabilities);
  // S4-iii A — every folder mutation goes through the SAME two steps: drop the
  // household's HomeCloud read caches (so every consumer of the folder
  // catalogue — this screen, the move picker and the File Intake destination
  // picker — stops serving the old one) and re-read it here. The list itself is
  // refreshed through `refresh`, which keeps the loaded window.
  const saveFolder = async () => {
    if (!token || !folderEditor || saving) return;
    setSaving(true);
    try {
      // Stage 2 Phase 1: creating inside the OPEN folder inherits it, and creating
      // at the root sends null. The browser stops being disabled inside a folder,
      // because that restriction existed only while every folder was root-level.
      if (folderEditor.mode === 'create') await createHomeCloudFolder(token, folderName, folder?.id ?? null);
      else await renameHomeCloudFolder(token, folderEditor.item!.id, folderName);
      setFolderEditor(null); setFolderName('');
      await refreshCatalogue();
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar la carpeta.'); } finally { setSaving(false); }
  };
  /**
   * DELETE a folder - its DIRECT contents are PROMOTED to its parent, nothing is
   * deleted. If the open folder is a DESCENDANT of the one being removed, the
   * browser follows the promotion instead of being dropped to the root.
   */
  const removeFolder = async () => {
    if (!token || !folderActions || saving) return;
    setSaving(true);
    const removedId = folderActions.id;
    try {
      await deleteHomeCloudFolder(token, removedId);
      setFolderActions(null);
      // A removed folder can never remain the open context. When the open folder
      // was the one removed, land on its parent; when the open folder was a
      // DESCENDANT of it, it survived the promotion, so it stays open and the
      // re-read shows it at its new depth.
      if (folder?.id === removedId) { setFolder(null); setQuery(''); }
      await refreshCatalogue();
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos eliminar la carpeta.'); } finally { setSaving(false); }
  };
  /**
   * Stage 2 Phase 1 - MOVE a folder. Server-authoritative: a cycle, a
   * cross-household destination or a taken name is refused there and surfaces here
   * as a typed message rather than as a silent no-op.
   */
  const saveFolderMove = async (destinationFolderId: string | null) => {
    if (!token || !folderActions || saving) return;
    setSaving(true);
    try {
      await moveHomeCloudFolder(token, folderActions.id, destinationFolderId);
      setFolderActions(null); setMoveIntent(null);
      await refreshCatalogue();
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos mover la carpeta.'); } finally { setSaving(false); }
  };
  // The ONE single-file mutation path. A single File's Move comes through here
  // too, so renaming, dating, noting and moving one File stay one mutation each.
  const saveFile = async (patch: FilePatch) => {
    if (!token || !actionTarget || saving) return;
    setSaving(true);
    try {
      await updateHomeCloudFile(token, actionTarget.id, patch);
      setActionTargetId(null);
      // A move can take the file out of the folder being viewed, so the SAME
      // context is re-read (window preserved) rather than reset to page one.
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar el archivo.'); } finally { setSaving(false); }
  };

  /**
   * BULK MOVE — N of the EXISTING single-file mutations and nothing else.
   *
   * No bulk endpoint, no transaction endpoint, no schema change, no migration and
   * no byte movement: `updateHomeCloudFile` with only `folderId` is the whole
   * contract. The batch is deliberately NOT atomic, so `bulkMoveFiles` aggregates
   * per-item outcomes and the ones that already moved are never rolled back.
   */
  const moveSelectedFiles = async (destinationFolderId: string | null) => {
    if (!token || saving) return;
    const contentIds = selectedFileIds(selection);
    if (contentIds.length === 0) return;
    setSaving(true);
    setBulkFeedback(bulkMoveInFlight(contentIds.length));
    try {
      const result = await bulkMoveFiles({
        contentIds,
        destinationFolderId,
        moveFile: (contentId, changes) => updateHomeCloudFile(token, contentId, changes),
      });
      setBulkFeedback(bulkMoveFeedback(result));
      // EXACTLY ONE reconciliation for the whole batch, through the
      // window-preserving path: not one re-read per PATCH, and no page-1
      // collapse. The selection is then pruned against these new rows, so a File
      // that left this folder can never stay selected.
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos mover los archivos.');
    } finally { setSaving(false); }
  };

  /**
   * THE ONE destination handler: all three Move intents resolve a destination here
   * and nowhere else, so no intent can ever offer a destination another would not.
   */
  const handleMoveDestination = (folderId: string | null) => {
    const intent = moveIntent;
    setMoveIntent(null);
    if (intent === null) return;
    if (intent.kind === 'bulk') { void moveSelectedFiles(folderId); return; }
    if (intent.kind === 'file') { void saveFile({ folderId }); return; }
    void saveFolderMove(folderId);
  };

  /**
   * FILES CORE — the ONE personal-Favorite mutation.
   *
   * The member is not asked to organize anything and the household is not
   * touched: this is one person's preference over one shared File, so the server
   * is the only authority on WHO is favoriting and it resolves that itself.
   *
   * STAGE 2 REOPEN — what this flow is FORBIDDEN to do, because device QA showed
   * all three happening on a real phone:
   *
   *   1. Take the Files list down. `setError` replaces the whole browser, so a
   *      refused Favorite used to blank a 300-row list to an error card.
   *   2. Collapse the loaded window. The only recovery offered by that card was
   *      `load()`, which reads page one, so 300 loaded rows became 100.
   *   3. Freeze everything else. The whole action surface was disabled through the
   *      shared `saving` flag for the duration of the PATCH AND the re-read.
   *
   * So: the outcome is stated INSIDE the File action host, the window-preserving
   * reconciliation is the only read, and nothing but the Favorite row is busy.
   *
   * SUCCESS. The server answer is authoritative for exactly one row, so the loaded
   * rows are corrected in place through the controller's `patchFile` and the sheet
   * closes: the tile and the heart marker are truthful immediately, and the window
   * keeps whatever it had. With Favoritos ON, unfavoriting the last visible favorite
   * legitimately removes that row from the filtered set, so the local patch is NOT
   * applied in that mode and the re-read is what reconciles the list — one read, the
   * same single read a rename already costs.
   *
   * FAILURE. Nothing is patched, so the row keeps the server's truth, and the
   * refusal is stated in the sheet the member opened. No list replacement, no
   * pagination reset, no navigation: the member stays in the exact context they
   * were in.
   */
  const toggleFileFavorite = async (isFavorite: boolean) => {
    if (!token || !actionTarget || favoriteBusy) return;
    const targetId = actionTarget.id;
    setFavoriteBusy(true);
    setActionError(null);
    try {
      await setHomeCloudFileFavorite(token, targetId, isFavorite);
      // HC-POL-021 — the badge of the File the member just favorited fades in
      // once the server confirmed it, never before.
      if (isFavorite) animateTileBadge(targetId);
      // Reconcile BEFORE closing, so the row the tile paints is the server's.
      if (!favoritesOnly) controllerRef.current!.patchFile(targetId, { isFavorite });
      setActionTargetId(null);
      // NOT awaited into the busy state: the sheet is already gone and the rest of
      // the surface must not be held hostage to a re-read the member cannot see.
      void refresh();
    } catch (e) {
      // Inline, in the host. Never the screen-level list error.
      setActionError(e instanceof Error ? e.message : 'No pudimos actualizar tus favoritos.');
    } finally { setFavoriteBusy(false); }
  };

  /**
   * LIFECYCLE V1 — send ONE File to the household Papelera.
   *
   * Reversible by contract (Restore), so the danger row asks for NO dialog:
   * the Papelera is the recovery path and the product's own answer to
   * "accidental trash". The same three protections as the Favorite hold here:
   * the outcome is stated INSIDE the File action host, the window-preserving
   * reconciliation is the only read, and only the Papelera row is busy.
   *
   * SUCCESS. A trashed File leaves the active set, so no local patch can
   * express it: `refresh()` — the SAME window-preserving authority pull-to-
   * refresh uses — reconciles the row away in one read. Favorites, selection,
   * the folder trail, the query and the loaded window all survive exactly as
   * they are; the selection effect prunes the row if it was selected.
   *
   * FAILURE. Nothing changes: the refusal (staging, purging, cross-household,
   * missing capability) is typed by the server, stated in the sheet, and the
   * member stays exactly where they were.
   */
  const trashFile = async () => {
    if (!token || !actionTarget || trashBusy) return;
    const targetId = actionTarget.id;
    const targetName = actionTarget.displayName;
    setTrashBusy(true);
    setActionError(null);
    try {
      await trashHomeCloudFile(token, targetId);
      setActionTargetId(null);
      // HC-POL-018: the reversible action gets its second chance HERE, with the
      // row's own name, so the snackbar names exactly what can be restored.
      setUndoTrash({ id: targetId, displayName: targetName });
      // NOT awaited into the busy state: the sheet is already gone and the
      // re-read is the same one a rename costs.
      void refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No pudimos enviar el archivo a la papelera.');
    } finally { setTrashBusy(false); }
  };

  /**
   * GUARDAR UNA COPIA — hand the original to the NATIVE system export UI.
   *
   * The defect this replaces: HomePlus said the file was saved while the only
   * copy sat in the app's own documents directory, where the member cannot find
   * it from the Files app. A copy the member cannot locate is not a save, so the
   * wording and the behaviour both changed: the system export UI is opened — the
   * one installed path that reaches "Guardar en Archivos" on iOS — and the
   * destination is the member's to choose.
   *
   * Nothing here claims an outcome. `shareAsync` resolves when the sheet is
   * dismissed and cannot report whether "Guardar en Archivos" was chosen, so the
   * message states the hand-off and the choice, never a completed save. That also
   * makes cancellation honest: dismissing the sheet is indistinguishable from
   * completing it, and neither produces a success claim or a scary error.
   */
  const saveCopyOfFile = async () => {
    if (!token || !actionTarget || saving) return;
    setSaving(true); setDownloadFeedback({ tone: 'secondary', message: 'Preparando una copia…' });
    try {
      const staged = await stageHomeCloudOriginal(token, actionTarget);
      setDownloadFeedback({ tone: 'secondary', message: 'Elegí "Guardar en Archivos" en el menú del sistema.' });
      await exportHomeCloudStagedCopy(staged);
    } catch (e) {
      const message = e instanceof HomeCloudDownloadError && e.stage === 'export'
        ? 'No pudimos abrir el menú para guardar el archivo.'
        : 'No pudimos preparar este archivo.';
      setDownloadFeedback({ tone: 'danger', message });
    } finally { setSaving(false); }
  };

  /**
   * COMPARTIR — the same staged original, handed to the platform share sheet.
   * Two distinct intents, one existing transfer: "send this to another app" is
   * not "keep this outside HomePlus", and the member is told which one they are
   * doing. Like the save intent, the sheet gives no verifiable result, so the
   * wording states the hand-off instead of claiming a delivery.
   */
  const shareFile = async () => {
    if (!token || !actionTarget || saving) return;
    setSaving(true); setDownloadFeedback({ tone: 'secondary', message: 'Preparando para compartir…' });
    try {
      const staged = await stageHomeCloudOriginal(token, actionTarget);
      setDownloadFeedback({ tone: 'secondary', message: 'Elegí una app para enviar el archivo.' });
      await shareHomeCloudDownloadedFile(staged);
    } catch (e) {
      const message = e instanceof HomeCloudDownloadError && e.stage === 'share'
        ? 'No pudimos compartir este archivo.'
        : 'No pudimos preparar este archivo.';
      setDownloadFeedback({ tone: 'danger', message });
    } finally { setSaving(false); }
  };

  /**
   * Reconciliation applied to selection. After a re-read, a selected id that is
   * no longer in the visible context is stale and is pruned, so the stated count
   * and the bulk target can never name a File that is not on screen. While the
   * loaded rows do not belong to the current context nothing is pruned: the
   * previous context's rows are not evidence about the current one.
   */
  useEffect(() => {
    if (!rowsAreCurrent) return;
    setSelection((previous) => {
      const pruned = pruneFileSelection(previous, files.map((file) => file.id));
      // An empty selection is not a selection: the mode ends with its last File.
      return pruned.ids.size === 0 && pruned.mode ? leaveFileSelection() : pruned;
    });
  }, [rowsAreCurrent, files]);

  const selectionCount = fileSelectionCount(selection);
  /** The destination the picker marks as current; `undefined` marks none. */
  const bulkCurrentFolderId = useMemo(() => {
    const ids = selectedFileIds(selection);
    if (ids.length === 0) return undefined;
    const chosen = new Set(ids);
    const rows = files.filter((file) => chosen.has(file.id));
    if (rows.length !== ids.length) return undefined;
    const first = rows[0].folderId;
    return rows.every((row) => row.folderId === first) ? first : undefined;
  }, [files, selection]);
  const canAdd = caps.contribute; const canOrganize = caps.organize;
  /** STAGE 2 (Phase 2): one boolean drives the filter icon's accent + dot. */
  const filterIsNonDefault = hasNonDefaultFilesFilter(filterState);
  /**
   * STAGE 2 REOPEN — PULL TO REFRESH IS THE ONLY VISIBLE MANUAL REFRESH.
   *
   * The header overflow used to keep a secondary `Actualizar`, so a member who
   * cannot pull-to-refresh had a button. That button is gone: the product truth is
   * ZERO visible Refresh controls. The accessibility path below replaces it without
   * putting a second visible item in the overflow, and it calls the SAME
   * `refresh()`, which is the window-preserving authority. There is no second
   * refresh implementation, no `refreshV2`, no first-page-only reload and no second
   * cache.
   *
   * The indicator is driven by a LOCAL flag rather than the list's own loading
   * state on purpose: the list also loads while paging and while the context
   * changes, and tying the pull spinner to those would make the indicator lie
   * about what the user's gesture did.
   */
  const pullToRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      // Settled on BOTH success and failure. A rejected request must not leave a
      // spinner running forever, and it is reported through the surface's own
      // read-failure surface rather than through this gesture.
      setRefreshing(false);
    }
  }, [refreshing, refresh]);

  /**
   * THE REFRESH AUTHORITY every manual path shares.
   *
   * Pull-to-refresh and the accessibility action below are two doors into ONE
   * function, so the spinner settles the same way and the window is preserved the
   * same way whichever door a member comes through.
   */
  const refreshFromAnyPath = useCallback(() => { void pullToRefresh(); }, [pullToRefresh]);

  /**
   * THE LIST VIEWPORT — measured, not assumed.
   *
   * The drag sweep needs three numbers that only a real layout can supply: where
   * the list's top edge is in PAGE coordinates, how tall the viewport is, and how
   * tall the content is. `measureInWindow` gives the first two on every layout pass,
   * which is cheap because it only runs when the layout actually changed.
   */
  const listViewportRef = useRef<View>(null);
  const measureListViewport = useCallback(() => {
    const node = listViewportRef.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((_x, y, _width, height) => {
      listGeometryRef.current = {
        ...listGeometryRef.current,
        listPageY: y,
        viewportHeightDp: height,
      };
    });
  }, []);
  const rememberContentOffset = useCallback((event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number } } }) => {
    contentOffsetRef.current = event.nativeEvent.contentOffset.y;
    listGeometryRef.current = { ...listGeometryRef.current, contentHeightDp: event.nativeEvent.contentSize.height };
  }, []);

  /**
   * Stage 2 Phase 1: the folder being moved cannot be a destination for itself, and
   * neither can any of its descendants. Hiding them is a convenience only - the
   * server's trigger refuses the identical set regardless of a stale catalogue, so
   * a race here produces a typed refusal, never a cycle.
   */
  const folderMoveExclusions = useMemo(
    () => (moveIntent?.kind === 'folder' ? folderWithDescendantIds(allFolders, moveIntent.folderId) : new Set<string>()),
    [allFolders, moveIntent],
  );
  const moveIntentTitle = moveIntent === null
    ? 'Mover a'
    : moveIntent.kind === 'bulk'
      ? `Mover ${selectionCount} ${selectionCount === 1 ? 'archivo' : 'archivos'}`
      : moveIntent.kind === 'folder'
        ? `Mover ${allFolders.find((candidate) => candidate.id === moveIntent.folderId)?.name ?? 'carpeta'}`
        : 'Mover a';
  const moveIntentCurrentFolderId = moveIntent === null
    ? undefined
    : moveIntent.kind === 'bulk'
      ? bulkCurrentFolderId
      : moveIntent.kind === 'folder'
        ? parentFolderIdOf(allFolders, moveIntent.folderId)
        : actionTarget
          ? actionTarget.folderId
          : undefined;
  return <View style={styles.screen}>
    <View style={styles.search}><AppInput value={query} onChangeText={setQuery} placeholder={folder ? 'Buscar en esta carpeta' : 'Buscar en archivos'} variant="search" label="Buscar" /></View>
    {currentPath ? <Animated.View style={[styles.breadcrumb, { opacity: breadcrumbFade }]}><AppText variant="caption" tone="secondary" numberOfLines={1} accessibilityLabel={`Ruta: ${currentPath}`}>{currentPath}</AppText></Animated.View> : null}
    {/* HC-POL-016 — the Favoritos mode is stated where the member is looking, not
        only inside the filter sheet. It owns its own row, so turning the mode on
        or off never moves the search field, the grid or the tab selector. */}
    <FilesFavoritesChip
      visible={favoritesOnly}
      count={favoritesOnly ? files.length : null}
      onClear={() => setFilterState((previous) => ({ ...previous, show: 'all' }))}
    />
    {/* HC-POL-013 — the header MORPHS instead of being replaced: the same row
        cross-fades and shifts by at most 4 pt, and its height, the search field,
        the grid and the scroll offset are untouched. */}
    <Animated.View
      style={[
        styles.titleRow,
        {
          opacity: headerMorph.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.55, 1] }),
          transform: [{ translateY: headerMorph.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 4, 0] }) }],
        },
      ]}
    >{folder ? <AppButton variant="icon" size="sm" onPress={leaveFolder} accessibilityLabel={trail.length >= 2 ? `Volver a ${trail[trail.length - 2].name}` : 'Volver a Archivos'}><HomePlusIcon name="arrow-back" size={21} color={colors.text.primary} /></AppButton> : null}<AppText variant="title3" weight="800" style={styles.title}>{folder?.name ?? 'Archivos'}</AppText><View style={styles.titleActions}>
      {/* STAGE 2 (Phase 2) — ONE compact filter/order icon replaces the permanent
          `Recientes / A-Z` button and the permanent `Favoritos` toggle. The active
          indication is the DONOR screen's own convention: the icon tint flips to the
          accent and a small dot appears. A number is deliberately NOT used, because
          `2` would be ambiguous here (Favoritos + A-Z) and a badge would fight the
          content-first promise of this screen. */}
      <InteractivePressable style={styles.headerIconButton} onPress={() => setFilterMenuOpen(true)} accessibilityRole="button" accessibilityLabel={filesFilterAccessibilityLabel(filterState)} haptic="light">
        <HomePlusIcon name="options-outline" size={20} color={filterIsNonDefault ? colors.terracotta[600] : colors.text.secondary} />
        {filterIsNonDefault ? <View style={styles.headerFilterDot} accessible={false} /> : null}
      </InteractivePressable>
      {canAdd ? <InteractivePressable style={styles.headerIconButton} onPress={() => setAddOpen(true)} accessibilityRole="button" accessibilityLabel="Agregar" accessibilityHint="Subir archivos, escanear un documento o crear una carpeta" haptic="light"><HomePlusIcon name="add" size={22} color={colors.terracotta[600]} /></InteractivePressable> : null}
<InteractivePressable style={styles.headerIconButton} onPress={() => setOverflowOpen(true)} accessibilityRole="button" accessibilityLabel="Más opciones de Archivos" accessibilityHint="Seleccionar archivos o abrir la papelera" haptic="light"><HomePlusIcon name="ellipsis-horizontal" size={22} color={colors.text.secondary} /></InteractivePressable>
    </View></Animated.View>
    {capabilitiesNotice ? <View style={styles.notice}><AppText variant="caption" tone="secondary">{capabilitiesNotice}</AppText><AppButton title="Reintentar" size="sm" variant="ghost" onPress={capabilities.revalidate} accessibilityLabel="Reintentar verificación de permisos de HomeCloud" /></View> : null}
    {bulkFeedback ? <View style={styles.banner}><AppText variant="caption" tone={bulkFeedback.tone} align="center">{bulkFeedback.message}</AppText></View> : null}
    {loading || !rowsAreCurrent ? <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
    : readFailure ? <View style={styles.center}><ErrorState title={homeCloudReadFailureTitle(readFailure.kind, 'tus archivos')} description={readFailure.message} detail={readFailure.detail} retryLabel="Reintentar" onRetry={() => void load()} /></View>
    : error ? <View style={styles.center}><ErrorState title="No pudimos cargar tus archivos" description={error} retryLabel="Reintentar" onRetry={() => void load()} /></View>
    : <Animated.View style={[styles.listMotion, { transform: [{ translateX: folderSlide }] }]}>
      {/* STAGE 2 REOPEN — THE EMPTY STATE IS NOT A DEAD SURFACE.

          The empty state used to REPLACE the list, which unmounted the FlatList and
          with it the `RefreshControl`: an empty folder, an empty Favoritos result and
          an empty search could not be pulled to refresh at all. `ListEmptyComponent`
          keeps the scroll surface mounted so the gesture exists on every result, and
          the empty state can scroll like any other content. */}
    <View
      ref={listViewportRef}
      style={styles.listViewport}
      onLayout={measureListViewport}
      accessible={false}
      // THE ACCESSIBILITY-ONLY REFRESH PATH. The visible `Actualizar` button is gone,
      // and this is what replaces it: a custom action on the list container,
      // reachable by assistive technology, calling the SAME window-preserving
      // authority as pull-to-refresh. No duplicated refresh implementation and no
      // second visible item in the overflow.
      accessibilityActions={[{ name: 'refresh-files', label: 'Actualizar archivos' }]}
      onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'refresh-files') refreshFromAnyPath(); }}
    >
    {/* STAGE 2 REOPEN — THE EMPTY STATE IS NOT A DEAD SURFACE.

        The empty state used to REPLACE the list, which unmounted the FlatList and
        with it the `RefreshControl`: an empty folder, an empty Favoritos result and
        an empty search could not be pulled to refresh at all. `ListEmptyComponent`
        keeps the scroll surface mounted so the gesture exists on every result, and
        the empty state can scroll like any other content. */}
    <FlatList ref={listRef} data={items} numColumns={2} key="files-grid" keyExtractor={(item) => `${item.kind}-${item.value.id}`} contentContainerStyle={styles.grid} columnWrapperStyle={styles.gridRow}
      // STAGE 2 (Phase 2): pull-to-refresh is the canonical manual refresh. It is
      // attached to the LIST rather than to a wrapper, so it works identically
      // whether the level has rows, is an empty folder, or is an empty Favoritos
      // result - an empty state that cannot be refreshed is a dead surface.
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshFromAnyPath} tintColor={colors.terracotta[600]} />}
      // The MEASURED inputs the drag sweep needs. `scrollEventThrottle` is small
      // enough that the recorded offset is never more than a frame behind the
      // content, so a hit test at a non-zero offset uses the real position.
      onScroll={rememberContentOffset}
      scrollEventThrottle={16}
      // The selected visual state is part of the row's own data, and `data` does
      // not change when only the selection does — without this a selected row
      // would keep painting itself as unselected.
      extraData={selection}
      renderItem={({ item }) => item.kind === 'folder' ? <FolderTile folder={item.value} onPress={() => openFolder(item.value)} onLongPress={(event) => { setFolderActionAnchor(event ? menuAnchorFromEvent(event) : null); setFolderActions(item.value); }} /> : <FileTile file={item.value} selectionMode={selection.mode} selected={isFileSelected(selection, item.value.id)} feedback={tileFeedbackRef.current.get(item.value.id)} onPress={() => handleFileTap(item.value.id)} onLongPress={(event) => handleFileLongPress(item.value.id, event)} onSetSelected={(next) => { if (next) animateTileCheck(item.value.id); setSelection((previous) => setFileSelectionSelected(previous, item.value.id, next)); }} onMeasure={(frame) => registerFileTileFrame(item.value.id, frame)} panHandlers={dragPanResponder.panHandlers} />}
      // STAGE 2 REOPEN — AUTOMATIC PAGINATION.
      //
      // `Mostrar más archivos` is GONE: a normal scroll must never stop on a button.
      // `onEndReached` reaches the canonical `loadMore()`, and the threshold is 2
      // screenfuls of a grid that only shows a few rows, so the next page is
      // normally already in flight before the member reaches the bottom. The
      // controller's synchronous `loadingMore` guard means five `onEndReached`
      // callbacks in a row still cost exactly one request.
      onEndReached={onEndReached}
      onEndReachedThreshold={FILES_END_REACHED_THRESHOLD}
      // THE EMPTY STATE. It lives INSIDE the list so the scroll surface — and with
      // it the `RefreshControl` — exists on an empty folder, an empty Favoritos
      // result and an empty search.
      // HC-POL-019 — one empty state per REASON, not one for all of them. The
      // root, an empty folder, a Favoritos result and a no-match search are four
      // different situations and they read as four different states. The CTA is
      // offered only when the member can actually add files: an empty folder a
      // member cannot write to is a fact, not a call to action.
      ListEmptyComponent={<View style={styles.center}><HomePlusIcon name={favoritesOnly ? 'heart-outline' : folder ? 'folder-open-outline' : query ? 'search-outline' : 'file-tray-full-outline'} size={48} color={colors.text.tertiary} /><AppText variant="title3" weight="800" align="center">{favoritesOnly ? 'No tenés archivos favoritos acá' : folder ? 'Esta carpeta está vacía' : query ? 'Sin resultados' : 'Todavía no hay archivos'}</AppText><AppText variant="bodySmall" tone="secondary" align="center">{favoritesOnly ? 'Marcá un archivo como favorito para verlo acá.' : folder ? 'Los archivos que subas o escanees adentro de esta carpeta aparecen acá.' : query ? 'Probá con otro nombre o revisá el filtro de Favoritos.' : 'Subí un archivo o escaneá un documento para empezar.'}</AppText>{favoritesOnly ? <AppButton title="Ver todos los archivos" variant="secondary" onPress={() => setFilterState((previous) => ({ ...previous, show: 'all' }))} accessibilityLabel="Quitar el filtro de favoritos" /> : canAdd && !query ? <AppButton title="Agregar archivo" onPress={() => setAddOpen(true)} accessibilityLabel="Agregar un archivo" /> : null}</View>}
      // THE PAGINATION FOOTER. No button while idle, a small spinner while a page is
      // in flight, and on a failure the error plus a COMPACT `Reintentar` — the one
      // place a page request is ever asked for explicitly, which is what re-arms the
      // automatic latch.
      ListFooterComponent={<View style={styles.footer}>{pageError ? <View style={styles.pageError}><AppText variant="caption" tone="danger" align="center">{pageError}</AppText><AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => void retryNextPage()} accessibilityLabel="Reintentar cargar más archivos" /></View> : loadingMore ? <ActivityIndicator color={colors.brand} accessibilityLabel="Cargando más archivos" /> : <View style={styles.footerSpacer} />}</View>}
    />
    <FileAutoScrollEdgeHint edge={autoScrollEdge} />
    </View></Animated.View>}
    {selection.mode ? <FileSelectionBar count={selectionCount} summary={fileSelectionSummary(selection)} canOrganize={canOrganize} busy={saving} onMove={() => setMoveIntent({ kind: 'bulk' })} onCancel={leaveSelectionMode} /> : null}
    {/* STAGE 2 REOPEN — THE SCREEN-LEVEL OVERFLOW.
         It carries TWO screen-level actions:
           Seleccionar  the ONLY discoverable entry into selection mode. It is
                        WITHDRAWN while the mode is active, so there is never a
                        second way in and the selection bar is the only surface.
           Papelera     the household Files Papelera, offered ONLY to members
                        with homecloud.delete: the listing itself is gated by
                        that capability server-side, so offering it to anyone
                        else would be a dead door. Restore is reversible;
                        Purge is the destructive confirmation INSIDE the
                        Papelera, never a long-press away from the grid.
         `Actualizar` is GONE. The product truth is ZERO visible Refresh controls:
         pull-to-refresh is the primary manual path and the list container carries an
         ACCESSIBILITY-ONLY `refresh-files` action for anyone who cannot pull. Both
         doors reach the SAME window-preserving `refresh()`. */}
    <ActionSheet visible={overflowOpen} title="Archivos" onRequestClose={() => setOverflowOpen(false)} size="content"><View style={styles.sheetList}>{!selection.mode ? <AppButton title="Seleccionar" variant="secondary" disabled={files.length === 0} onPress={() => { setOverflowOpen(false); enterSelectionMode(); }} accessibilityLabel="Seleccionar archivos" /> : null}{caps.delete ? <AppButton title="Papelera" variant="secondary" onPress={() => { setOverflowOpen(false); navigation.navigate('HomeCloudFilesTrash'); }} accessibilityLabel="Abrir la papelera de archivos" accessibilityHint="Archivos enviados a la papelera. Se pueden restaurar o eliminar definitivamente." /> : null}</View></ActionSheet>
    <FilesFilterMenu visible={filterMenuOpen} state={filterState} onChangeShow={(show: FilesShowMode) => setFilterState((previous) => ({ ...previous, show }))} onChangeSort={(nextSort) => setFilterState((previous) => ({ ...previous, sort: nextSort }))} onClose={() => setFilterMenuOpen(false)} />
    <ActionSheet visible={addOpen} title="Agregar" onRequestClose={() => setAddOpen(false)} size="content"><View style={styles.sheetList}><AppButton title="Elegir archivo" onPress={() => { setAddOpen(false); setUploadOpen(true); }} /><AppButton title="Escanear documento" variant="secondary" onPress={() => { setAddOpen(false); navigation.navigate('HomeCloudScanner', { folderId: folder?.id ?? null, folderName: folder?.name ?? null, capabilities: caps }); }} /><AppButton title="Nueva carpeta" variant="secondary" disabled={!canOrganize} onPress={() => { setAddOpen(false); setFolderName(''); setFolderEditor({ mode: 'create' }); }} />{folder ? <AppText variant="caption" tone="secondary">Se creará dentro de {folder.name}.</AppText> : null}</View></ActionSheet>
    <ActionSheet visible={uploadOpen} title="Elegir archivo" onRequestClose={() => setUploadOpen(false)} size="content"><FileIntake config={{ householdId: currentHousehold?.id ?? '', accessToken: token ?? '', capabilities: caps, initialFolderId: folder?.id ?? null, initialFolderName: folder?.name ?? null, intakeSource: 'homecloud:files' }} onComplete={() => { setUploadOpen(false); void refresh(); }} onDismiss={() => setUploadOpen(false)} /></ActionSheet>
    <ActionSheet visible={!!folderEditor} title={folderEditor?.mode === 'rename' ? 'Renombrar carpeta' : 'Nueva carpeta'} onRequestClose={() => setFolderEditor(null)} size="content" footer={<AppButton title="Guardar" disabled={!folderName.trim() || saving} onPress={() => void saveFolder()} />}><AppInput value={folderName} onChangeText={setFolderName} label="Nombre" autoFocus /></ActionSheet>
    <AdaptiveActionMenu visible={!!folderActions} title={folderActions?.name ?? 'Carpeta'} anchor={folderActionAnchor} itemCount={3} onRequestClose={() => setFolderActions(null)}><View style={styles.sheetList}><AppButton title="Renombrar" variant="secondary" disabled={!canOrganize} onPress={() => { setFolderName(folderActions!.name); setFolderEditor({ mode: 'rename', item: folderActions! }); setFolderActions(null); }} /><AppButton title="Mover" variant="secondary" disabled={!canOrganize} onPress={() => { setMoveIntent({ kind: 'folder', folderId: folderActions!.id }); setFolderActions(null); }} /><AppButton title="Eliminar carpeta" variant="danger" disabled={!canOrganize || saving} onPress={() => void removeFolder()} />{/* HONEST delete copy (Stage 2 Phase 1). A nested delete does NOT recursively
        delete content, so wording that implied it would be a lie: the folder is
        removed and its DIRECT contents move up to its parent. Files are never
        deleted by removing a folder. */}<AppText variant="caption" tone="secondary">Al eliminar la carpeta no se borra ningún archivo: su contenido directo pasa a {folderActions ? (folderDisplayPath(allFolders, folderActions.parentFolderId) ?? 'Archivos') : 'Archivos'}.</AppText></View></AdaptiveActionMenu>
    {/* The canonical per-File action host. It is always mounted and decides its own
        visibility, so there is never a second place that can open a File menu. */}
    <FileActionHost file={actionTarget} folders={allFolders.length > 0 ? allFolders : folders} permissions={{ view: caps.view, organize: canOrganize, delete: caps.delete }} saving={saving} favoriteBusy={favoriteBusy} trashBusy={trashBusy} actionError={actionError} downloadFeedback={downloadFeedback} onClose={() => { setActionTargetId(null); setDownloadFeedback(null); setActionError(null); }} onSave={(patch) => void saveFile(patch)} onMoveRequest={() => setMoveIntent({ kind: 'file' })} onFavorite={(isFavorite) => void toggleFileFavorite(isFavorite)} onTrash={() => void trashFile()} onDownload={() => void saveCopyOfFile()} onShare={() => void shareFile()} />
    {/* THE ONE destination picker. A single File's Move, the selection's Move and a
        Folder's Move all resolve their destination here, so a move can never offer
        a destination the other move would not. It reads the same household catalogue
        the host does, never the browser payload, which holds only the current level. */}
    {/* STAGE 2 (Phase 3): the Viewer is a layer over this screen, so returning from it
        restores the EXACT browser context underneath - no reload, no lost scroll.
        HC-POL-012/057 — the layer arrives through the ONE transition engine: an
        origin-aware open expands out of the tapped tile, and everything else fades
        in honestly. The SAME engine answers the close inside the viewer. */}
    {viewerTargetId !== null ? <Animated.View
      style={[styles.viewerLayer, viewerOpenKind === 'origin' ? {
        transform: [
          { translateX: viewerOpenProgress.interpolate({ inputRange: [0, 1], outputRange: [viewerOpenOrigin.translateX, 0] }) },
          { translateY: viewerOpenProgress.interpolate({ inputRange: [0, 1], outputRange: [viewerOpenOrigin.translateY, 0] }) },
          { scale: viewerOpenProgress.interpolate({ inputRange: [0, 1], outputRange: [viewerOpenOrigin.scale, 1] }) },
        ],
      } : { opacity: viewerOpenProgress }]}
    ><HomeCloudFileViewer file={viewerTarget} accessToken={token ?? ''} onClose={() => setViewerTargetId(null)} onExternalAction={() => void refresh()} /></Animated.View> : null}
    {/* HC-POL-018 — the second chance of a reversible trash. It is dismissed by
        the member, never by a clock, because `Deshacer` stays a real, working
        action for as long as the File is still in the Papelera. */}
    <FileUndoSnackbar
      visible={undoTrash !== null}
      message={undoTrash ? `${undoTrash.displayName} se movió a la papelera.` : ''}
      onUndo={() => void undoTrashFile()}
      onDismiss={() => setUndoTrash(null)}
      busy={undoBusy}
      bottomOffset={selection.mode ? 132 : spacing[4]}
    />
    <FileMoveDestinationPicker visible={moveIntent !== null} title={moveIntentTitle} folders={allFolders.length > 0 ? allFolders : folders} currentFolderId={moveIntentCurrentFolderId} excludeFolderIds={folderMoveExclusions} busy={saving} onSelect={handleMoveDestination} onClose={() => { setMoveIntent(null); setFolderActions(null); }} />
  </View>;
}

/**
 * A FOLDER tile. Two gestures, one owner (STAGE 2 Phase 2):
 *
 *   tap        -> navigate into the folder
 *   long press -> folder actions (Renombrar / Mover / Eliminar carpeta)
 *
 * The permanent per-folder ellipsis is GONE. Long press must not be the only way
 * to reach those actions, so the same intents are also exposed as accessibility
 * actions on the tile.
 */
function FolderTile({ folder, onPress, onLongPress }: { folder: HomeCloudFolder; onPress: () => void; onLongPress: (event?: GestureResponderEvent) => void }) { return <View style={styles.tile}><AppButton variant="secondary" onPress={onPress} onLongPress={onLongPress} delayLongPress={350} style={styles.visual} accessibilityLabel={`Abrir carpeta ${folder.name}`} accessibilityHint="Toca para abrir. Mantené presionado para ver sus acciones." accessibilityActions={[{ name: 'activate', label: 'Abrir carpeta' }, { name: 'longpress', label: 'Acciones de la carpeta' }]} onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'longpress') onLongPress(); }}><HomePlusIcon name="folder" size={48} color={colors.terracotta[500]} /></AppButton><AppText variant="bodySmall" weight="700" numberOfLines={2}>{folder.name}</AppText></View>; }

/**
 * A File tile. Two gestures, one owner:
 *
 *   long press             -> contextual File actions   (outside selection)
 *   tap, mode active       -> toggle this File
 *   tap, mode inactive     -> RESERVED for the Viewer: deliberately unassigned
 *   long press, mode active-> NOTHING: no menu, no navigation
 *
 * The permanent per-File ellipsis is GONE, so long press would otherwise be the
 * only route to the File actions. The same intents are therefore exposed as
 * accessibility actions, which keeps the tile clean visually without making the
 * gesture exclusive.
 *
 * FILES CORE — the personal-Favorite signal is a single small marker in the
 * existing visual grammar. It is decorative for assistive technology: the tile's
 * own label already states whether the File is one of this member's favorites,
 * so the marker is not announced twice.
 */
export function FileTile({
  file,
  selectionMode,
  selected,
  feedback,
  onPress,
  onLongPress,
  onSetSelected,
  onMeasure,
  panHandlers,
}: {
  file: HomeCloudFile;
  selectionMode: boolean;
  selected: boolean;
  /**
   * HC-POL-014/021 — this tile's OWNED motion values, created by the surface at
   * the moment of an isolated toggle. Absent means "not animating": the tile
   * then renders with the shared identity values, which is the direct state
   * feedback a fast drag sweep is supposed to produce.
   */
  feedback?: TileFeedback;
  onPress: () => void;
  onLongPress: (event?: GestureResponderEvent) => void;
  /**
   * Put this File into a DECIDED selection state. Drag is an enhancement, so the
   * tile also offers explicit `select` / `deselect` accessibility actions through
   * this one seam rather than through a second selection code path.
   */
  onSetSelected?: (selected: boolean) => void;
  /**
   * Publish this tile's MEASURED frame in list-content coordinates.
   *
   * `View.onLayout` reports relative to a VirtualizedList cell's parent, which IS
   * the content container, so this is content space for free — no `measureInWindow`
   * per row and no asynchronous measure during a drag. Folders never call it, which
   * is what makes them invisible to the sweep.
   */
  onMeasure?: (frame: TileFrame) => void;
  /**
   * The ONE shared pan responder's handlers. Every File tile gets the same object:
   * a gesture belongs to the armed state on the surface, not to a row.
   */
  panHandlers?: GestureResponderHandlers;
}) {
  const icon = file.mimeType.startsWith('image/') ? 'image-outline' : file.mimeType === 'application/pdf' ? 'document-text-outline' : 'document-outline';
  const showCheck = selectionMode && selected;
  const favoriteHint = file.isFavorite ? ', favorito' : '';
  // HC-POL-014/021 — the motion VALUES are owned by the surface and handed down
  // here, because a tile must stay a pure render: the shared drag machinery
  // renders tiles outside a React cycle (the sweep's hit testing), and a tile
  // that owned animated state of its own could not survive that. A tile that is
  // not animating anything receives the shared identity values, which render as
  // plain 1s.
  const checkScale = feedback?.checkScale ?? IDLE_TILE_FEEDBACK.checkScale;
  const badgeOpacity = feedback?.badgeOpacity ?? IDLE_TILE_FEEDBACK.badgeOpacity;
  return <View
    style={[styles.tile, showCheck ? styles.tileSelected : null]}
    onLayout={onMeasure ? (event) => onMeasure(event.nativeEvent.layout) : undefined}
    {...panHandlers}
  >
    {file.isFavorite ? <View style={styles.favorite} accessible={false}><Animated.View style={{ opacity: badgeOpacity }}><HomePlusIcon name="heart" size={15} color={colors.danger.base} /></Animated.View></View> : null}
    <AppButton
      variant="secondary"
      onPress={onPress}
      onLongPress={onLongPress}
      // The framework's standard long-press threshold. There is no custom timer
      // anywhere in Files, so a long press behaves like every other long press in
      // the app, and releasing it never fires the normal press action — which is
      // what lets a sweep end without also toggling the anchor a second time.
      delayLongPress={350}
      style={[styles.visual, showCheck ? styles.visualSelected : null]}
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityState={{ selected: selectionMode ? selected : undefined }}
      accessibilityLabel={`${selectionMode ? `${file.displayName}${selected ? ', seleccionado' : ', no seleccionado'}` : file.displayName}${favoriteHint}`}
      accessibilityHint={selectionMode ? 'Toca para seleccionar. Mantené presionado y deslizate para seleccionar varios.' : 'Toca para abrir. Mantené presionado para ver sus acciones.'}
      // Long press must not be the ONLY route to the File actions now that the
      // permanent ellipsis is gone, so the same intent is offered to assistive
      // technology. While selecting, that action is removed entirely — there is no
      // File menu during a multi-select — and replaced by explicit select/deselect
      // actions, so the sweep is an ENHANCEMENT and never the only way to select.
      accessibilityActions={selectionMode
        ? [{ name: 'select', label: `Seleccionar ${file.displayName}` }, { name: 'deselect', label: `Deseleccionar ${file.displayName}` }]
        : [{ name: 'longpress', label: `Acciones de ${file.displayName}` }]}
      onAccessibilityAction={(event) => {
        if (selectionMode) {
          if (event.nativeEvent.actionName === 'select') onSetSelected?.(true);
          if (event.nativeEvent.actionName === 'deselect') onSetSelected?.(false);
          return;
        }
        if (event.nativeEvent.actionName === 'longpress') onLongPress();
      }}
    >
      {/* HC-POL-014 — a 24 pt check that settles onto the ring, over the 8% brand
          overlay. The overlay replaces the old full brand fill: a selection is a
          STATE, not a repaint, and the member's own icon underneath stays visible. */}
      {showCheck ? <Animated.View style={{ transform: [{ scale: checkScale }] }}><HomePlusIcon name="checkmark" size={24} color={colors.brand} /></Animated.View> : <HomePlusIcon name={icon as any} size={44} color={colors.info.base} />}
    </AppButton>
    <AppText variant="bodySmall" weight="700" numberOfLines={2}>{file.displayName}</AppText>
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background.base }, search: { paddingHorizontal: spacing[5], paddingTop: spacing[4] }, breadcrumb: { paddingHorizontal: spacing[5], paddingBottom: spacing[1] }, viewerLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background.base }, titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4], gap: spacing[2] }, title: { flex: 1 }, titleActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, headerIconButton: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }, headerFilterDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.terracotta[600] }, grid: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] }, gridRow: { gap: spacing[3], marginBottom: spacing[4] }, tile: { flex: 1, minHeight: 174, gap: spacing[2], position: 'relative', borderRadius: radius.lg, borderWidth: 2, borderColor: 'transparent' }, tileSelected: { borderColor: colors.brand }, visual: { height: 128, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' }, visualSelected: { backgroundColor: `${colors.brand}14`, borderColor: colors.brand }, favorite: { position: 'absolute', left: spacing[1], top: spacing[1], zIndex: 2, backgroundColor: colors.surface.card, borderRadius: radius.sm, padding: 2 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] }, notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], paddingHorizontal: spacing[5], paddingBottom: spacing[2] }, banner: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] }, footer: { paddingVertical: spacing[4], alignItems: 'center', gap: spacing[3] }, footerSpacer: { height: 24, width: '100%' },   listViewport: { flex: 1, minHeight: 0 },
  /** HC-POL-011 — the motion wrapper of the list. Same flex contract as the
      viewport it carries, so the slide never changes what the list measures. */
  listMotion: { flex: 1, minHeight: 0 }, pageError: { alignItems: 'center', gap: spacing[2] }, sheetList: { gap: spacing[3], paddingBottom: spacing[2] } });
