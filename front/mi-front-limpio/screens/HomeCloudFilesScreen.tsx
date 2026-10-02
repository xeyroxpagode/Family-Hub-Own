import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { AppButton, AppInput, AppText, ActionSheet, DatePickerSheet, ErrorState, FormActionRow } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';
import { FileIntake } from '../services/homecloud/FileIntake';
import { useHomeCloudCapabilities } from '../services/homecloud/useHomeCloudCapabilities';
import { homeCloudCapabilitiesNotice } from '../services/homecloud/homecloudCapabilitiesNotice';
import { createHomeCloudFolder, deleteHomeCloudFolder, fetchFilesBrowser, renameHomeCloudFolder, type FileSort, updateHomeCloudFile, FILES_BROWSER_MAX_LIMIT } from '../services/homecloud/homecloudFilesService';
import { createFilesPagination, hasMoreFilesPages, type FilesPaginationState } from '../services/homecloud/homecloudFilesPagination';
import { downloadHomeCloudOriginal, HomeCloudDownloadError, shareHomeCloudDownloadedFile } from '../services/homecloud/homecloudDownloadService';
import { fetchHomeCloudFoldersCached } from '../services/homecloud/homecloudReadService';
import { subscribeHomeCloudReadReconciliation } from '../services/homecloud/homecloudReadReconciliation';
import { classifyHomeCloudReadFailure, homeCloudReadFailureDetail, homeCloudReadFailureDescription, homeCloudReadFailureTitle, type HomeCloudReadFailure } from '../services/homecloud/homecloudReadFailure';
import type { HomeCloudFile, HomeCloudFolder } from '../services/homecloud/homecloudTypes';

type GridItem = { kind: 'folder'; value: HomeCloudFolder } | { kind: 'file'; value: HomeCloudFile };

/**
 * W1-B — the page size of the EXISTING backend contract.
 *
 * The server clamps `limit` to 100 and defaults to it, so asking for the
 * maximum keeps the request count low without ever being silently truncated:
 * a full page means `nextOffset` is non-null, an empty one means it is null.
 */
const FILES_PAGE_SIZE = FILES_BROWSER_MAX_LIMIT;

export function HomeCloudFilesView() {
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
  const [error, setError] = useState<string | null>(null);
  const [readFailure, setReadFailure] = useState<{ kind: HomeCloudReadFailure; message: string; detail?: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false); const [uploadOpen, setUploadOpen] = useState(false); const [folderEditor, setFolderEditor] = useState<{ mode: 'create' | 'rename'; item?: HomeCloudFolder } | null>(null); const [folderName, setFolderName] = useState(''); const [folderActions, setFolderActions] = useState<HomeCloudFolder | null>(null); const [fileInfo, setFileInfo] = useState<HomeCloudFile | null>(null); const [saving, setSaving] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ tone: 'secondary' | 'danger' | 'success'; message: string } | null>(null);
  const [page, setPage] = useState<FilesPaginationState>(() => ({
    folders: [], files: [], nextOffset: null, loading: true, loadingMore: false, pageError: null,
  }));
  const { folders, files, loading, loadingMore, pageError } = page;
  // One definition of "is there another page", shared with the controller.
  const hasMore = hasMoreFilesPages(page);

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
  const queryContextRef = useRef({ token, folderId: folder?.id ?? null, query, sort });
  queryContextRef.current = { token, folderId: folder?.id ?? null, query, sort };

  const controllerRef = useRef<ReturnType<typeof createFilesPagination> | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createFilesPagination({
      limit: FILES_PAGE_SIZE,
      onState: setPage,
      read: async (input) => {
        const context = queryContextRef.current;
        const data = await fetchFilesBrowser(context.token ?? '', {
          folderId: context.folderId,
          query: context.query,
          sort: context.sort,
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
      const kind = classifyHomeCloudReadFailure(e);
      setReadFailure({ kind, message: homeCloudReadFailureDescription(kind), detail: homeCloudReadFailureDetail(kind, e) });
    }
  }, [token, currentHousehold?.id, query, sort, folder?.id]);

  const loadMore = useCallback(async () => {
    if (!token || !currentHousehold) return;
    await controllerRef.current!.loadMore();
  }, [token, currentHousehold?.id]);

  useEffect(() => { const timer = setTimeout(() => void load(), query ? 250 : 0); return () => clearTimeout(timer); }, [load, query]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // W1-B: the destination catalogue is read ONCE per household, through the
  // cached, household-scoped read. It is deliberately NOT part of `load`: a
  // per-keystroke catalogue request was the redundancy W1-B removes.
  useEffect(() => {
    if (!token || !currentHousehold?.id) return;
    let active = true;
    fetchHomeCloudFoldersCached(token, { householdId: currentHousehold.id })
      .then((catalog) => { if (active) setAllFolders(catalog); })
      .catch(() => { /* The list itself is unaffected; the picker degrades to the folders already known. */ });
    return () => { active = false; };
  }, [token, currentHousehold?.id]);

  useEffect(() => {
    setFolder(null); setQuery(''); setAllFolders([]); setError(null); setReadFailure(null);
    // A household switch discards every page of the household being left,
    // including any still in flight.
    controllerRef.current!.reset();
  }, [currentHousehold?.id]);

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
      void load();
    });
  }, [currentHousehold?.id, load]);

  const items = useMemo<GridItem[]>(() => [...folders.map(value => ({ kind: 'folder' as const, value })), ...files.map(value => ({ kind: 'file' as const, value }))], [folders, files]);
  // DENY-SAFE, but never silent: while capabilities are unresolved the mutable
  // affordances stay disabled, and the reason is stated instead of letting the
  // user believe the member simply has no actions in this home.
  const capabilitiesNotice = homeCloudCapabilitiesNotice(capabilities);
  const saveFolder = async () => { if (!token || !folderEditor || saving) return; setSaving(true); try { if (folderEditor.mode === 'create') await createHomeCloudFolder(token, folderName); else await renameHomeCloudFolder(token, folderEditor.item!.id, folderName); setFolderEditor(null); setFolderName(''); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar la carpeta.'); } finally { setSaving(false); } };
  const removeFolder = async () => { if (!token || !folderActions || saving) return; setSaving(true); try { await deleteHomeCloudFolder(token, folderActions.id); setFolderActions(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos eliminar la carpeta.'); } finally { setSaving(false); } };
  const saveFile = async (patch: Parameters<typeof updateHomeCloudFile>[2]) => { if (!token || !fileInfo || saving) return; setSaving(true); try { await updateHomeCloudFile(token, fileInfo.id, patch); setFileInfo(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar el archivo.'); } finally { setSaving(false); } };

  const downloadFile = async () => {
    if (!token || !fileInfo || saving) return;
    setSaving(true); setDownloadFeedback({ tone: 'secondary', message: 'Descargando…' });
    try {
      const local = await downloadHomeCloudOriginal(token, fileInfo);
      setDownloadFeedback({ tone: 'success', message: 'Listo para compartir' });
      await shareHomeCloudDownloadedFile(local);
    } catch (e) {
      const message = e instanceof HomeCloudDownloadError && e.stage === 'share'
        ? 'No pudimos compartir este archivo.'
        : 'No pudimos descargar este archivo.';
      setDownloadFeedback({ tone: 'danger', message });
    } finally { setSaving(false); }
  };
  const canAdd = caps.contribute; const canOrganize = caps.organize;
  return <View style={styles.screen}>
    <View style={styles.search}><AppInput value={query} onChangeText={setQuery} placeholder={folder ? 'Buscar en esta carpeta' : 'Buscar en archivos'} variant="search" label="Buscar" /></View>
    <View style={styles.titleRow}>{folder ? <AppButton variant="icon" size="sm" onPress={() => setFolder(null)} accessibilityLabel="Volver a Archivos"><HomePlusIcon name="arrow-back" size={21} color={colors.text.primary} /></AppButton> : null}<AppText variant="title3" weight="800" style={styles.title}>{folder?.name ?? 'Archivos'}</AppText><View style={styles.titleActions}><AppButton variant="icon" size="sm" onPress={() => void load()} accessibilityLabel="Actualizar archivos"><HomePlusIcon name="refresh" size={20} color={colors.text.secondary} /></AppButton><AppButton variant="secondary" size="sm" title={sort === 'recent' ? 'Recientes' : 'A–Z'} onPress={() => setSort(sort === 'recent' ? 'name' : 'recent')} />{canAdd ? <AppButton variant="icon" size="sm" onPress={() => setAddOpen(true)} accessibilityLabel="Agregar"><HomePlusIcon name="add" size={24} color={colors.brand} /></AppButton> : null}</View></View>
    {capabilitiesNotice ? <View style={styles.notice}><AppText variant="caption" tone="secondary">{capabilitiesNotice}</AppText><AppButton title="Reintentar" size="sm" variant="ghost" onPress={capabilities.revalidate} accessibilityLabel="Reintentar verificación de permisos de HomeCloud" /></View> : null}
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.brand} /></View> : readFailure ? <View style={styles.center}><ErrorState title={homeCloudReadFailureTitle(readFailure.kind, 'tus archivos')} description={readFailure.message} detail={readFailure.detail} retryLabel="Reintentar" onRetry={() => void load()} /></View> : error ? <View style={styles.center}><AppText variant="body" tone="danger" align="center">{error}</AppText><AppButton title="Reintentar" variant="secondary" onPress={() => void load()} style={{ marginTop: spacing[3] }} /></View> : items.length === 0 ? <View style={styles.center}><HomePlusIcon name="folder-open-outline" size={38} color={colors.text.tertiary} /><AppText variant="title3" weight="800">{folder ? 'Esta carpeta está vacía' : query ? 'Sin resultados' : 'Todavía no hay archivos'}</AppText>{canAdd && !query ? <AppButton title="Agregar archivo" onPress={() => setAddOpen(true)} style={{ marginTop: spacing[3] }} /> : null}</View> : <FlatList data={items} numColumns={2} key="files-grid" keyExtractor={(item) => `${item.kind}-${item.value.id}`} contentContainerStyle={styles.grid} columnWrapperStyle={styles.gridRow} renderItem={({ item }) => item.kind === 'folder' ? <FolderTile folder={item.value} onPress={() => setFolder(item.value)} onMore={() => setFolderActions(item.value)} /> : <FileTile file={item.value} onMore={() => setFileInfo(item.value)} />} ListFooterComponent={hasMore || pageError ? <View style={styles.footer}>{pageError ? <View style={styles.pageError}><AppText variant="caption" tone="danger" align="center">{pageError}</AppText><AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => void loadMore()} accessibilityLabel="Reintentar cargar más archivos" /></View> : null}{hasMore ? <AppButton title={loadingMore ? 'Cargando…' : 'Mostrar más archivos'} variant="secondary" disabled={loadingMore} onPress={() => void loadMore()} /> : null}</View> : null} />}
    <ActionSheet visible={addOpen} title="Agregar" onRequestClose={() => setAddOpen(false)} size="content"><View style={styles.sheetList}><AppButton title="Elegir archivo" onPress={() => { setAddOpen(false); setUploadOpen(true); }} /><AppButton title="Escanear documento" variant="secondary" onPress={() => { setAddOpen(false); navigation.navigate('HomeCloudScanner', { folderId: folder?.id ?? null, folderName: folder?.name ?? null, capabilities: caps }); }} /><AppButton title="Nueva carpeta" variant="secondary" disabled={!!folder || !canOrganize} onPress={() => { setAddOpen(false); setFolderName(''); setFolderEditor({ mode: 'create' }); }} /></View></ActionSheet>
    <ActionSheet visible={uploadOpen} title="Elegir archivo" onRequestClose={() => setUploadOpen(false)} size="content"><FileIntake config={{ householdId: currentHousehold?.id ?? '', accessToken: token ?? '', capabilities: caps, initialFolderId: folder?.id ?? null, initialFolderName: folder?.name ?? null, intakeSource: 'homecloud:files' }} onComplete={() => { setUploadOpen(false); void load(); }} onDismiss={() => setUploadOpen(false)} /></ActionSheet>
    <ActionSheet visible={!!folderEditor} title={folderEditor?.mode === 'rename' ? 'Renombrar carpeta' : 'Nueva carpeta'} onRequestClose={() => setFolderEditor(null)} size="content" footer={<AppButton title="Guardar" disabled={!folderName.trim() || saving} onPress={() => void saveFolder()} />}><AppInput value={folderName} onChangeText={setFolderName} label="Nombre" autoFocus /></ActionSheet>
    <ActionSheet visible={!!folderActions} title={folderActions?.name ?? 'Carpeta'} onRequestClose={() => setFolderActions(null)} size="content"><View style={styles.sheetList}><AppButton title="Renombrar" variant="secondary" disabled={!canOrganize} onPress={() => { setFolderName(folderActions!.name); setFolderEditor({ mode: 'rename', item: folderActions! }); setFolderActions(null); }} /><AppButton title="Eliminar carpeta" variant="danger" disabled={!canOrganize || saving} onPress={() => void removeFolder()} /><AppText variant="caption" tone="secondary">Los archivos no se eliminan: volverán a Archivos.</AppText></View></ActionSheet>
    <FileInfoSheet file={fileInfo} folders={allFolders.length > 0 ? allFolders : folders} canOrganize={canOrganize} onClose={() => { setFileInfo(null); setDownloadFeedback(null); }} onSave={saveFile} onDownload={downloadFile} saving={saving} downloadFeedback={downloadFeedback} />
  </View>;
}

function FolderTile({ folder, onPress, onMore }: { folder: HomeCloudFolder; onPress: () => void; onMore: () => void }) { return <View style={styles.tile}><AppButton variant="icon" size="sm" onPress={onMore} style={styles.more}><HomePlusIcon name="ellipsis-horizontal" size={19} color={colors.text.secondary} /></AppButton><AppButton variant="secondary" onPress={onPress} style={styles.visual}><HomePlusIcon name="folder" size={48} color={colors.terracotta[500]} /></AppButton><AppText variant="bodySmall" weight="700" numberOfLines={2}>{folder.name}</AppText></View>; }
function FileTile({ file, onMore }: { file: HomeCloudFile; onMore: () => void }) { const icon = file.mimeType.startsWith('image/') ? 'image-outline' : file.mimeType === 'application/pdf' ? 'document-text-outline' : 'document-outline'; return <View style={styles.tile}><AppButton variant="icon" size="sm" onPress={onMore} style={styles.more}><HomePlusIcon name="ellipsis-horizontal" size={19} color={colors.text.secondary} /></AppButton><View style={styles.visual}><HomePlusIcon name={icon as any} size={44} color={colors.info.base} /></View><AppText variant="bodySmall" weight="700" numberOfLines={2}>{file.displayName}</AppText></View>; }
function FileInfoSheet({ file, folders, canOrganize, onClose, onSave, onDownload, saving, downloadFeedback }: { file: HomeCloudFile | null; folders: HomeCloudFolder[]; canOrganize: boolean; onClose: () => void; onSave: (patch: any) => void; onDownload: () => void; saving: boolean; downloadFeedback: { tone: 'secondary' | 'danger' | 'success'; message: string } | null }) {
  const [name, setName] = useState(''); const [note, setNote] = useState(''); const [folderPicker, setFolderPicker] = useState(false); const [datePicker, setDatePicker] = useState(false);
  useEffect(() => { setName(file?.displayName ?? ''); setNote(file?.note ?? ''); }, [file?.id]);
  if (!file) return null;
  const folderName = folders.find(f => f.id === file.folderId)?.name ?? 'Archivos';
  return <>
    <ActionSheet visible title="Información del archivo" onRequestClose={onClose} size="content" footer={<View style={styles.sheetList}>{downloadFeedback ? <AppText variant="bodySmall" tone={downloadFeedback.tone}>{downloadFeedback.message}</AppText> : null}<AppButton title={saving && downloadFeedback?.message === 'Descargando…' ? 'Descargando…' : 'Descargar y compartir original'} variant="secondary" disabled={saving} onPress={onDownload} /><AppButton title="Guardar cambios" disabled={!canOrganize || saving} onPress={() => onSave({ displayName: name, note })} /></View>}><View style={styles.sheetList}><AppInput label="Nombre" value={name} onChangeText={setName} editable={canOrganize} /><AppInput label="Nota" value={note} onChangeText={setNote} editable={canOrganize} multiline /><FormActionRow label="Carpeta" value={folderName} disabled={!canOrganize} onPress={() => setFolderPicker(true)} /><FormActionRow label="Fecha del documento" value={file.documentDate ?? 'Agregar fecha'} disabled={!canOrganize} onPress={() => setDatePicker(true)} /></View></ActionSheet>
    <ActionSheet visible={folderPicker} title="Mover a" onRequestClose={() => setFolderPicker(false)} size="content"><View style={styles.sheetList}><AppButton title="Archivos" variant={file.folderId === null ? 'primary' : 'secondary'} onPress={() => { setFolderPicker(false); onSave({ folderId: null }); }} />{folders.map(item => <AppButton key={item.id} title={item.name} variant={file.folderId === item.id ? 'primary' : 'secondary'} onPress={() => { setFolderPicker(false); onSave({ folderId: item.id }); }} />)}</View></ActionSheet>
    <DatePickerSheet visible={datePicker} value={file.documentDate ?? new Date().toISOString().slice(0, 10)} onClose={() => setDatePicker(false)} onConfirm={(documentDate) => { setDatePicker(false); onSave({ documentDate }); }} />
  </>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background.base }, search: { paddingHorizontal: spacing[5], paddingTop: spacing[4] }, titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4], gap: spacing[2] }, title: { flex: 1 }, titleActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, grid: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] }, gridRow: { gap: spacing[3], marginBottom: spacing[4] }, tile: { flex: 1, minHeight: 174, gap: spacing[2], position: 'relative' }, visual: { height: 128, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' }, more: { position: 'absolute', right: spacing[1], top: spacing[1], zIndex: 2, backgroundColor: colors.surface.card }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] }, notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], paddingHorizontal: spacing[5], paddingBottom: spacing[2] }, footer: { paddingVertical: spacing[4], alignItems: 'center', gap: spacing[3] }, pageError: { alignItems: 'center', gap: spacing[2] }, sheetList: { gap: spacing[3], paddingBottom: spacing[2] } });
