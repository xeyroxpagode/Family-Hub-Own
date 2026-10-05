import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { AppButton, AppInput, AppText, ActionSheet, ErrorState } from '../components/ui';
import { FileActionHost, type FilePatch } from '../services/homecloud/FileActionHost';
import { FileMoveDestinationPicker } from '../services/homecloud/FileMoveDestinationPicker';
import { FileSelectionBar } from '../services/homecloud/FileSelectionBar';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';
import { FileIntake } from '../services/homecloud/FileIntake';
import { useHomeCloudCapabilities } from '../services/homecloud/useHomeCloudCapabilities';
import { homeCloudCapabilitiesNotice } from '../services/homecloud/homecloudCapabilitiesNotice';
import { createHomeCloudFolder, deleteHomeCloudFolder, fetchFilesBrowser, renameHomeCloudFolder, type FileSort, setHomeCloudFileFavorite, updateHomeCloudFile, FILES_BROWSER_MAX_LIMIT } from '../services/homecloud/homecloudFilesService';
import { createFilesPagination, hasMoreFilesPages, type FilesPaginationState } from '../services/homecloud/homecloudFilesPagination';
import {
  beginFileSelectionAt,
  emptyFileSelection,
  enterFileSelection,
  fileSelectionCount,
  fileSelectionSummary,
  isFileSelected,
  leaveFileSelection,
  pruneFileSelection,
  selectedFileIds,
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

/** Which Move intent the ONE destination picker is currently serving. */
type MoveTarget = 'file' | 'bulk';

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

/** The household folder catalogue this screen owns and refreshes on mutation. */
type FolderCatalogueScope = { householdId: string };

export function HomeCloudFilesView({ visible = true }: { visible?: boolean } = {}) {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const token = session?.access_token ?? null;
  const [folder, setFolder] = useState<HomeCloudFolder | null>(null);
  // W1-B: the folder catalogue has ONE owner — the cached, household-scoped
  // folder read below. It is read once per household (30s TTL) instead of on
  // every load, keystroke, sort and focus, and it is the ONLY source that can
  // answer the move picker: `browser.folders` is the browser's own display
  // payload and is empty inside a folder, so it is never used as a catalogue.
  const [allFolders, setAllFolders] = useState<HomeCloudFolder[]>([]);
  const [query, setQuery] = useState(''); const [sort, setSort] = useState<FileSort>('recent');
  // Files Core — the personal-Favorites FILTER MODE.
  //
  // It is a mode, not a search term: it composes with folder, search, sort and
  // pagination instead of replacing them, and the server narrows the set BEFORE
  // the page is taken. That is why it travels with the read context instead of
  // filtering the rows already loaded — filtering a page in the client is what
  // corrupts pagination and has-more evidence.
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readFailure, setReadFailure] = useState<{ kind: HomeCloudReadFailure; message: string; detail?: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false); const [uploadOpen, setUploadOpen] = useState(false); const [folderEditor, setFolderEditor] = useState<{ mode: 'create' | 'rename'; item?: HomeCloudFolder } | null>(null); const [folderName, setFolderName] = useState(''); const [folderActions, setFolderActions] = useState<HomeCloudFolder | null>(null); const [actionTargetId, setActionTargetId] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ tone: 'secondary' | 'danger'; message: string } | null>(null);
  // Selection belongs to the CURRENT browser context and is never persisted.
  const [selection, setSelection] = useState<FileSelection>(emptyFileSelection());
  // The one destination picker, serving either a single File or the selection.
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  // The batch outcome is stated OUTSIDE the selection bar on purpose: when every
  // moved File left the folder the selection itself ends, and the member must
  // still be told what happened.
  const [bulkFeedback, setBulkFeedback] = useState<BulkMoveFeedback | null>(null);
  const [page, setPage] = useState<FilesPaginationState>(() => ({
    folders: [], files: [], nextOffset: null, loading: true, loadingMore: false, pageError: null, contextKey: null,
  }));
  const { folders, files, loading, loadingMore, pageError } = page;
  // One definition of "is there another page", shared with the controller.
  const hasMore = hasMoreFilesPages(page);

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
    setFolder(null); setQuery(''); setFavoritesOnly(false); setAllFolders([]); setError(null); setReadFailure(null);
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

  // S4-iii B1/B5 — a folder context change CLEARS the query and keeps the sort.
  //
  //   root -> folder, folder -> root, folder A -> folder B:  query = ''
  //   any folder change:                                    sort preserved
  //   any folder change:                                    favoritesOnly PRESERVED
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
  const openFolder = useCallback((next: HomeCloudFolder) => {
    setFolder(next); setQuery(''); setError(null); setReadFailure(null);
  }, []);
  const leaveFolder = useCallback(() => {
    setFolder(null); setQuery(''); setError(null); setReadFailure(null);
  }, []);

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
  /** A long press enters the mode and selects the pressed File in one intent. */
  const beginSelectionAt = useCallback((fileId: string) => {
    setBulkFeedback(null);
    setSelection((previous) => beginFileSelectionAt(previous, fileId));
  }, []);
  /**
   * A tap is a toggle ONLY while selection mode is active. Outside it the tap is
   * unassigned — reserved for the Viewer, which is not implemented in this slice —
   * so it changes nothing at all. The guard lives in the production model, not in
   * a render closure, so it cannot go stale while rows are memoised.
   */
  const toggleSelectionAt = useCallback((fileId: string) => {
    setSelection((previous) => (previous.mode ? toggleFileSelection(previous, fileId) : previous));
  }, []);
  const leaveSelectionMode = useCallback(() => {
    setBulkFeedback(null);
    setSelection(leaveFileSelection());
  }, []);

  /**
   * Selection is scoped to ONE browser context. A folder, query, sort or
   * household change means the selected ids no longer describe what the member is
   * looking at, so they are discarded — there is no cross-folder and no
   * cross-household selection. A `loadMore` does NOT change this key, so paging
   * through the same context keeps every selection.
   */
  const selectionScope = `${currentHousehold?.id ?? ''}\u0000${contextKey}`;
  useEffect(() => {
    setSelection((previous) => (
      previous.mode === false && previous.ids.size === 0 ? previous : leaveFileSelection()
    ));
    setBulkFeedback((previous) => (previous === null ? previous : null));
  }, [selectionScope]);

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
      if (folderEditor.mode === 'create') await createHomeCloudFolder(token, folderName);
      else await renameHomeCloudFolder(token, folderEditor.item!.id, folderName);
      setFolderEditor(null); setFolderName('');
      await refreshCatalogue();
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar la carpeta.'); } finally { setSaving(false); }
  };
  const removeFolder = async () => {
    if (!token || !folderActions || saving) return;
    setSaving(true);
    try {
      await deleteHomeCloudFolder(token, folderActions.id);
      setFolderActions(null);
      // A deleted folder can never remain the open context. Its files are not
      // deleted by the server (the FK detaches them to root), and leaving them
      // to root is exactly what this context change re-reads.
      if (folder?.id === folderActions.id) { setFolder(null); setQuery(''); }
      await refreshCatalogue();
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos eliminar la carpeta.'); } finally { setSaving(false); }
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

  /** The ONE destination picker: both Move intents resolve a destination here. */
  const handleMoveDestination = (folderId: string | null) => {
    const target = moveTarget;
    setMoveTarget(null);
    if (target === 'bulk') { void moveSelectedFiles(folderId); return; }
    if (target === 'file') void saveFile({ folderId });
  };

  /**
   * FILES CORE — the ONE personal-Favorite mutation.
   *
   * The member is not asked to organize anything and the household is not
   * touched: this is one person's preference over one shared File, so the server
   * is the only authority on WHO is favoriting and it resolves that itself.
   *
   * The presentation is corrected the moment the server answers, through the
   * controller's `patchFile`, so the tile and the open action host reflect the
   * new state immediately instead of on the next refresh or after a restart. A
   * refusal is NOT patched: the row keeps the server's truth and the failure is
   * stated, so the screen can never show a favorite the backend did not accept.
   *
   * With Favoritos ON, unfavoriting the last visible favorite legitimately
   * removes that row from the filtered set. The local patch is therefore NOT
   * applied in that mode; the window-preserving re-read is what reconciles the
   * list, and it costs the same single read a rename already costs.
   */
  const toggleFileFavorite = async (isFavorite: boolean) => {
    if (!token || !actionTarget || saving) return;
    const targetId = actionTarget.id;
    setSaving(true);
    try {
      await setHomeCloudFileFavorite(token, targetId, isFavorite);
      if (!favoritesOnly) controllerRef.current!.patchFile(targetId, { isFavorite });
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos actualizar tus favoritos.'); } finally { setSaving(false); }
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
  return <View style={styles.screen}>
    <View style={styles.search}><AppInput value={query} onChangeText={setQuery} placeholder={folder ? 'Buscar en esta carpeta' : 'Buscar en archivos'} variant="search" label="Buscar" /></View>
    <View style={styles.titleRow}>{folder ? <AppButton variant="icon" size="sm" onPress={leaveFolder} accessibilityLabel="Volver a Archivos"><HomePlusIcon name="arrow-back" size={21} color={colors.text.primary} /></AppButton> : null}<AppText variant="title3" weight="800" style={styles.title}>{folder?.name ?? 'Archivos'}</AppText><View style={styles.titleActions}><AppButton variant="icon" size="sm" onPress={() => void refresh()} accessibilityLabel="Actualizar archivos"><HomePlusIcon name="refresh" size={20} color={colors.text.secondary} /></AppButton><AppButton variant="secondary" size="sm" title={sort === 'recent' ? 'Recientes' : 'A–Z'} onPress={() => setSort(sort === 'recent' ? 'name' : 'recent')} /><AppButton variant={favoritesOnly ? 'primary' : 'secondary'} size="sm" title="Favoritos" onPress={() => setFavoritesOnly((previous) => !previous)} accessibilityLabel={favoritesOnly ? 'Mostrando solo tus favoritos. Desactivar filtro de favoritos' : 'Mostrar solo tus favoritos'} />{!selection.mode ? <AppButton variant="ghost" size="sm" title="Seleccionar" disabled={files.length === 0} onPress={enterSelectionMode} accessibilityLabel="Seleccionar archivos" /> : null}{canAdd ? <AppButton variant="icon" size="sm" onPress={() => setAddOpen(true)} accessibilityLabel="Agregar"><HomePlusIcon name="add" size={24} color={colors.brand} /></AppButton> : null}</View></View>
    {capabilitiesNotice ? <View style={styles.notice}><AppText variant="caption" tone="secondary">{capabilitiesNotice}</AppText><AppButton title="Reintentar" size="sm" variant="ghost" onPress={capabilities.revalidate} accessibilityLabel="Reintentar verificación de permisos de HomeCloud" /></View> : null}
    {bulkFeedback ? <View style={styles.banner}><AppText variant="caption" tone={bulkFeedback.tone} align="center">{bulkFeedback.message}</AppText></View> : null}
    {loading || !rowsAreCurrent ? <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
    : readFailure ? <View style={styles.center}><ErrorState title={homeCloudReadFailureTitle(readFailure.kind, 'tus archivos')} description={readFailure.message} detail={readFailure.detail} retryLabel="Reintentar" onRetry={() => void load()} /></View>
    : error ? <View style={styles.center}><AppText variant="body" tone="danger" align="center">{error}</AppText><AppButton title="Reintentar" variant="secondary" onPress={() => void load()} style={{ marginTop: spacing[3] }} /></View>
    : items.length === 0 ? <View style={styles.center}><HomePlusIcon name={favoritesOnly ? 'heart-outline' : 'folder-open-outline'} size={38} color={colors.text.tertiary} /><AppText variant="title3" weight="800">{favoritesOnly ? 'No tenés archivos favoritos acá' : folder ? 'Esta carpeta está vacía' : query ? 'Sin resultados' : 'Todavía no hay archivos'}</AppText>{favoritesOnly ? <AppButton title="Ver todos los archivos" variant="secondary" onPress={() => setFavoritesOnly(false)} /> : canAdd && !query ? <AppButton title="Agregar archivo" onPress={() => setAddOpen(true)} style={{ marginTop: spacing[3] }} /> : null}</View>
    : <FlatList data={items} numColumns={2} key="files-grid" keyExtractor={(item) => `${item.kind}-${item.value.id}`} contentContainerStyle={styles.grid} columnWrapperStyle={styles.gridRow}
      // The selected visual state is part of the row's own data, and `data` does
      // not change when only the selection does — without this a selected row
      // would keep painting itself as unselected.
      extraData={selection}
      renderItem={({ item }) => item.kind === 'folder' ? <FolderTile folder={item.value} onPress={() => openFolder(item.value)} onMore={() => setFolderActions(item.value)} /> : <FileTile file={item.value} selectionMode={selection.mode} selected={isFileSelected(selection, item.value.id)} onPress={() => toggleSelectionAt(item.value.id)} onLongPress={() => beginSelectionAt(item.value.id)} onMore={() => setActionTargetId(item.value.id)} />}
      ListFooterComponent={hasMore || pageError ? <View style={styles.footer}>{pageError ? <View style={styles.pageError}><AppText variant="caption" tone="danger" align="center">{pageError}</AppText><AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => void loadMore()} accessibilityLabel="Reintentar cargar más archivos" /></View> : null}{hasMore ? <AppButton title={loadingMore ? 'Cargando…' : 'Mostrar más archivos'} variant="secondary" disabled={loadingMore} onPress={() => void loadMore()} /> : null}</View> : null} />}
    {selection.mode ? <FileSelectionBar count={selectionCount} summary={fileSelectionSummary(selection)} canOrganize={canOrganize} busy={saving} onMove={() => setMoveTarget('bulk')} onCancel={leaveSelectionMode} /> : null}
    <ActionSheet visible={addOpen} title="Agregar" onRequestClose={() => setAddOpen(false)} size="content"><View style={styles.sheetList}><AppButton title="Elegir archivo" onPress={() => { setAddOpen(false); setUploadOpen(true); }} /><AppButton title="Escanear documento" variant="secondary" onPress={() => { setAddOpen(false); navigation.navigate('HomeCloudScanner', { folderId: folder?.id ?? null, folderName: folder?.name ?? null, capabilities: caps }); }} /><AppButton title="Nueva carpeta" variant="secondary" disabled={!!folder || !canOrganize} onPress={() => { setAddOpen(false); setFolderName(''); setFolderEditor({ mode: 'create' }); }} /></View></ActionSheet>
    <ActionSheet visible={uploadOpen} title="Elegir archivo" onRequestClose={() => setUploadOpen(false)} size="content"><FileIntake config={{ householdId: currentHousehold?.id ?? '', accessToken: token ?? '', capabilities: caps, initialFolderId: folder?.id ?? null, initialFolderName: folder?.name ?? null, intakeSource: 'homecloud:files' }} onComplete={() => { setUploadOpen(false); void refresh(); }} onDismiss={() => setUploadOpen(false)} /></ActionSheet>
    <ActionSheet visible={!!folderEditor} title={folderEditor?.mode === 'rename' ? 'Renombrar carpeta' : 'Nueva carpeta'} onRequestClose={() => setFolderEditor(null)} size="content" footer={<AppButton title="Guardar" disabled={!folderName.trim() || saving} onPress={() => void saveFolder()} />}><AppInput value={folderName} onChangeText={setFolderName} label="Nombre" autoFocus /></ActionSheet>
    <ActionSheet visible={!!folderActions} title={folderActions?.name ?? 'Carpeta'} onRequestClose={() => setFolderActions(null)} size="content"><View style={styles.sheetList}><AppButton title="Renombrar" variant="secondary" disabled={!canOrganize} onPress={() => { setFolderName(folderActions!.name); setFolderEditor({ mode: 'rename', item: folderActions! }); setFolderActions(null); }} /><AppButton title="Eliminar carpeta" variant="danger" disabled={!canOrganize || saving} onPress={() => void removeFolder()} /><AppText variant="caption" tone="secondary">Los archivos no se eliminan: volverán a Archivos.</AppText></View></ActionSheet>
    {/* The canonical per-File action host. It is always mounted and decides its own
        visibility, so there is never a second place that can open a File menu. */}
    <FileActionHost file={actionTarget} folders={allFolders.length > 0 ? allFolders : folders} permissions={{ view: caps.view, organize: canOrganize, delete: caps.delete }} saving={saving} downloadFeedback={downloadFeedback} onClose={() => { setActionTargetId(null); setDownloadFeedback(null); }} onSave={(patch) => void saveFile(patch)} onMoveRequest={() => setMoveTarget('file')} onFavorite={(isFavorite) => void toggleFileFavorite(isFavorite)} onDownload={() => void saveCopyOfFile()} onShare={() => void shareFile()} />
    {/* The ONE destination picker, for a single File's Move and for the selection's
        Move alike. It reads the same household catalogue the host does, never the
        browser payload, which is empty inside a folder. */}
    <FileMoveDestinationPicker visible={moveTarget !== null} title={moveTarget === 'bulk' ? `Mover ${selectionCount} ${selectionCount === 1 ? 'archivo' : 'archivos'}` : 'Mover a'} folders={allFolders.length > 0 ? allFolders : folders} currentFolderId={moveTarget === 'bulk' ? bulkCurrentFolderId : actionTarget ? actionTarget.folderId : undefined} busy={saving} onSelect={handleMoveDestination} onClose={() => setMoveTarget(null)} />
  </View>;
}

function FolderTile({ folder, onPress, onMore }: { folder: HomeCloudFolder; onPress: () => void; onMore: () => void }) { return <View style={styles.tile}><AppButton variant="icon" size="sm" onPress={onMore} style={styles.more} accessibilityLabel={`Acciones de la carpeta ${folder.name}`}><HomePlusIcon name="ellipsis-horizontal" size={19} color={colors.text.secondary} /></AppButton><AppButton variant="secondary" onPress={onPress} style={styles.visual} accessibilityLabel={`Abrir carpeta ${folder.name}`}><HomePlusIcon name="folder" size={48} color={colors.terracotta[500]} /></AppButton><AppText variant="bodySmall" weight="700" numberOfLines={2}>{folder.name}</AppText></View>; }

/**
 * A File tile. Three gestures, one owner:
 *
 *   long press             -> enter selection mode and select this File
 *   tap, mode active       -> toggle this File
 *   tap, mode inactive     -> RESERVED for the Viewer: deliberately unassigned
 *
 * The overflow stays exactly where it was: it opens the canonical action host.
 *
 * FILES CORE — the personal-Favorite signal is a single small marker in the
 * existing visual grammar, mirrored from the overflow so it can never be
 * mistaken for a control. It is decorative for assistive technology: the tile's
 * own label already states whether the File is one of this member's favorites,
 * so the marker is not announced twice.
 */
export function FileTile({
  file,
  selectionMode,
  selected,
  onPress,
  onLongPress,
  onMore,
}: {
  file: HomeCloudFile;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMore: () => void;
}) {
  const icon = file.mimeType.startsWith('image/') ? 'image-outline' : file.mimeType === 'application/pdf' ? 'document-text-outline' : 'document-outline';
  const showCheck = selectionMode && selected;
  const favoriteHint = file.isFavorite ? ', favorito' : '';
  return <View style={[styles.tile, showCheck ? styles.tileSelected : null]}>
    <AppButton variant="icon" size="sm" onPress={onMore} style={styles.more} accessibilityLabel={`Acciones de ${file.displayName}`}><HomePlusIcon name="ellipsis-horizontal" size={19} color={colors.text.secondary} /></AppButton>
    {file.isFavorite ? <View style={styles.favorite} accessible={false}><HomePlusIcon name="heart" size={15} color={colors.danger.base} /></View> : null}
    <AppButton
      variant="secondary"
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.visual, showCheck ? styles.visualSelected : null]}
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityState={{ selected: selectionMode ? selected : undefined }}
      accessibilityLabel={`${selectionMode ? `${file.displayName}${selected ? ', seleccionado' : ', no seleccionado'}` : file.displayName}${favoriteHint}`}
    >
      {showCheck ? <HomePlusIcon name="checkmark" size={26} color={colors.text.inverse} /> : <HomePlusIcon name={icon as any} size={44} color={colors.info.base} />}
    </AppButton>
    <AppText variant="bodySmall" weight="700" numberOfLines={2}>{file.displayName}</AppText>
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background.base }, search: { paddingHorizontal: spacing[5], paddingTop: spacing[4] }, titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4], gap: spacing[2] }, title: { flex: 1 }, titleActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, grid: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] }, gridRow: { gap: spacing[3], marginBottom: spacing[4] }, tile: { flex: 1, minHeight: 174, gap: spacing[2], position: 'relative', borderRadius: radius.lg, borderWidth: 2, borderColor: 'transparent' }, tileSelected: { borderColor: colors.brand }, visual: { height: 128, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' }, visualSelected: { backgroundColor: colors.brand, borderColor: colors.brand }, more: { position: 'absolute', right: spacing[1], top: spacing[1], zIndex: 2, backgroundColor: colors.surface.card }, favorite: { position: 'absolute', left: spacing[1], top: spacing[1], zIndex: 2, backgroundColor: colors.surface.card, borderRadius: radius.sm, padding: 2 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] }, notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], paddingHorizontal: spacing[5], paddingBottom: spacing[2] }, banner: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] }, footer: { paddingVertical: spacing[4], alignItems: 'center', gap: spacing[3] }, pageError: { alignItems: 'center', gap: spacing[2] }, sheetList: { gap: spacing[3], paddingBottom: spacing[2] } });
