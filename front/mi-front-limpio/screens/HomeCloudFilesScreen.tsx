import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { AppButton, AppInput, AppText, ActionSheet, DatePickerSheet, FormActionRow } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';
import { FileIntake } from '../services/homecloud/FileIntake';
import { evaluateHomeCloudCapabilities } from '../services/homecloud/homecloudCapabilitiesAdapter';
import { fetchHomeCloudCapabilities } from '../services/homecloudCapabilities';
import { createHomeCloudFolder, deleteHomeCloudFolder, fetchFilesBrowser, renameHomeCloudFolder, type FileSort, updateHomeCloudFile } from '../services/homecloud/homecloudFilesService';
import { downloadHomeCloudOriginal, HomeCloudDownloadError, shareHomeCloudDownloadedFile } from '../services/homecloud/homecloudDownloadService';
import { fetchHomeCloudFolders } from '../services/homecloud/homecloudReadService';
import type { HomeCloudFile, HomeCloudFolder } from '../services/homecloud/homecloudTypes';
import { removeById, upsertById } from '../services/core/collectionState';
import { beginPerformanceTrace } from '../services/core/performanceTrace';

type GridItem = { kind: 'folder'; value: HomeCloudFolder } | { kind: 'file'; value: HomeCloudFile };

const reactiveLog = (event: string, details: Record<string, unknown>) => {
  if (__DEV__) console.log(`[ReactiveQA] ${event}`, details);
};

export function HomeCloudFilesView() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const token = session?.access_token ?? null;
  const [folder, setFolder] = useState<HomeCloudFolder | null>(null);
  const [folders, setFolders] = useState<HomeCloudFolder[]>([]); const [files, setFiles] = useState<HomeCloudFile[]>([]);
  // Household-wide folder list for the File Info move picker. `folders` is the
  // scoped browser display (empty inside a folder); the picker must still offer
  // every same-household destination.
  const [allFolders, setAllFolders] = useState<HomeCloudFolder[]>([]);
  const [query, setQuery] = useState(''); const [sort, setSort] = useState<FileSort>('recent'); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [caps, setCaps] = useState({ view: false, contribute: false, organize: false, delete: false, anyWrite: false });
  const [addOpen, setAddOpen] = useState(false); const [uploadOpen, setUploadOpen] = useState(false); const [folderEditor, setFolderEditor] = useState<{ mode: 'create' | 'rename'; item?: HomeCloudFolder } | null>(null); const [folderName, setFolderName] = useState(''); const [folderActions, setFolderActions] = useState<HomeCloudFolder | null>(null); const [fileInfo, setFileInfo] = useState<HomeCloudFile | null>(null); const [saving, setSaving] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ tone: 'secondary' | 'danger' | 'success'; message: string } | null>(null);

  const load = useCallback(async () => { if (!token || !currentHousehold) { setLoading(false); return; } const trace = beginPerformanceTrace('homecloud.browser.load', { householdId: currentHousehold.id, hasQuery: Boolean(query) }); setLoading(true); setError(null); try { const [data, projection] = await Promise.all([fetchFilesBrowser(token, { folderId: folder?.id ?? null, query, sort }), fetchHomeCloudCapabilities(token)]); setFolders(data.browser.folders); setFiles(data.browser.files); setCaps(evaluateHomeCloudCapabilities(projection)); trace('state.merged', { folderCount: data.browser.folders.length, fileCount: data.browser.files.length }); fetchHomeCloudFolders(token).then(setAllFolders).catch(() => {}); } catch (e) { trace('api.error'); setError(e instanceof Error ? e.message : 'No pudimos cargar tus archivos.'); } finally { trace('complete'); setLoading(false); } }, [token, currentHousehold?.id, folder?.id, query, sort]);
  const loadRef = useRef(load);
  const hasFocusedOnceRef = useRef(false);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { const timer = setTimeout(() => void load(), query ? 250 : 0); return () => clearTimeout(timer); }, [load]);
  useFocusEffect(useCallback(() => {
    // Initial loading is owned by the query/folder effect above. Subsequent
    // navigation focus reconciles once, without duplicating that first GET.
    if (hasFocusedOnceRef.current) void loadRef.current();
    hasFocusedOnceRef.current = true;
  }, []));
  useEffect(() => { setFolder(null); setQuery(''); setFolders([]); setFiles([]); setAllFolders([]); }, [currentHousehold?.id]);
  const items = useMemo<GridItem[]>(() => [...folders.map(value => ({ kind: 'folder' as const, value })), ...files.map(value => ({ kind: 'file' as const, value }))], [folders, files]);
  const applyFolder = useCallback((nextFolder: HomeCloudFolder) => {
    setAllFolders((current) => upsertById(current, nextFolder));
    if (!folder) setFolders((current) => upsertById(current, nextFolder));
    if (folder?.id === nextFolder.id) setFolder(nextFolder);
    reactiveLog('store.updated', { module: 'homecloud', entity: 'folder', id: nextFolder.id });
  }, [folder]);
  const saveFolder = async () => { if (!token || !folderEditor || saving) return; setSaving(true); try { const response = folderEditor.mode === 'create' ? await createHomeCloudFolder(token, folderName) : await renameHomeCloudFolder(token, folderEditor.item!.id, folderName); reactiveLog('api.success', { module: 'homecloud', action: folderEditor.mode === 'create' ? 'create-folder' : 'rename-folder', id: response.folder.id }); applyFolder(response.folder); setFolderEditor(null); setFolderName(''); } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar la carpeta.'); } finally { setSaving(false); } };
  const removeFolder = async () => { if (!token || !folderActions || saving) return; const folderId = folderActions.id; setSaving(true); try { await deleteHomeCloudFolder(token, folderId); reactiveLog('api.success', { module: 'homecloud', action: 'delete-folder', id: folderId }); setFolders((current) => removeById(current, folderId)); setAllFolders((current) => removeById(current, folderId)); if (folder?.id === folderId) setFolder(null); setFolderActions(null); } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos eliminar la carpeta.'); } finally { setSaving(false); } };
  const saveFile = async (patch: Parameters<typeof updateHomeCloudFile>[2]) => { if (!token || !fileInfo || saving) return; setSaving(true); try { const response = await updateHomeCloudFile(token, fileInfo.id, patch); const nextFile = response.file; reactiveLog('api.success', { module: 'homecloud', action: 'update-file', id: nextFile.id }); setFiles((current) => {
      const isInCurrentFolder = (nextFile.folderId ?? null) === (folder?.id ?? null);
      if (!isInCurrentFolder) return removeById(current, nextFile.id);
      return upsertById(current, nextFile);
    }); setFileInfo(null); } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar el archivo.'); } finally { setSaving(false); } };
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
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.brand} /></View> : error ? <View style={styles.center}><AppText variant="body" tone="danger" align="center">{error}</AppText><AppButton title="Reintentar" variant="secondary" onPress={() => void load()} style={{ marginTop: spacing[3] }} /></View> : items.length === 0 ? <View style={styles.center}><HomePlusIcon name="folder-open-outline" size={38} color={colors.text.tertiary} /><AppText variant="title3" weight="800">{folder ? 'Esta carpeta está vacía' : query ? 'Sin resultados' : 'Todavía no hay archivos'}</AppText>{canAdd && !query ? <AppButton title="Agregar archivo" onPress={() => setAddOpen(true)} style={{ marginTop: spacing[3] }} /> : null}</View> : <FlatList data={items} numColumns={2} key="files-grid" keyExtractor={(item) => `${item.kind}-${item.value.id}`} contentContainerStyle={styles.grid} columnWrapperStyle={styles.gridRow} renderItem={({ item }) => item.kind === 'folder' ? <FolderTile folder={item.value} onPress={() => setFolder(item.value)} onMore={() => setFolderActions(item.value)} /> : <FileTile file={item.value} onMore={() => setFileInfo(item.value)} />} />}
    <ActionSheet visible={addOpen} title="Agregar" onRequestClose={() => setAddOpen(false)} size="content"><View style={styles.sheetList}><AppButton title="Elegir archivo" onPress={() => { setAddOpen(false); setUploadOpen(true); }} /><AppButton title="Escanear documento" variant="secondary" onPress={() => { setAddOpen(false); navigation.navigate('HomeCloudScanner', { folderId: folder?.id ?? null, folderName: folder?.name ?? null, capabilities: caps }); }} /><AppButton title="Nueva carpeta" variant="secondary" disabled={!!folder || !canOrganize} onPress={() => { setAddOpen(false); setFolderName(''); setFolderEditor({ mode: 'create' }); }} /></View></ActionSheet>
    <ActionSheet visible={uploadOpen} title="Elegir archivo" onRequestClose={() => setUploadOpen(false)} size="content"><FileIntake config={{ householdId: currentHousehold?.id ?? '', accessToken: token ?? '', capabilities: caps, initialFolderId: folder?.id ?? null, initialFolderName: folder?.name ?? null, intakeSource: 'homecloud:files' }} onComplete={() => { setUploadOpen(false); void load(); }} onDismiss={() => setUploadOpen(false)} /></ActionSheet>
    <ActionSheet visible={!!folderEditor} title={folderEditor?.mode === 'rename' ? 'Renombrar carpeta' : 'Nueva carpeta'} onRequestClose={() => setFolderEditor(null)} size="content" footer={<AppButton title="Guardar" disabled={!folderName.trim() || saving} onPress={() => void saveFolder()} />}><AppInput value={folderName} onChangeText={setFolderName} label="Nombre" autoFocus /></ActionSheet>
    <ActionSheet visible={!!folderActions} title={folderActions?.name ?? 'Carpeta'} onRequestClose={() => setFolderActions(null)} size="content"><View style={styles.sheetList}><AppButton title="Renombrar" variant="secondary" disabled={!canOrganize} onPress={() => { setFolderName(folderActions!.name); setFolderEditor({ mode: 'rename', item: folderActions! }); setFolderActions(null); }} /><AppButton title="Eliminar carpeta" variant="danger" disabled={!canOrganize || saving} onPress={() => void removeFolder()} /><AppText variant="caption" tone="secondary">Los archivos no se eliminan: volverán a Archivos.</AppText></View></ActionSheet>
    <FileInfoSheet file={fileInfo} folders={allFolders} canOrganize={canOrganize} onClose={() => { setFileInfo(null); setDownloadFeedback(null); }} onSave={saveFile} onDownload={downloadFile} saving={saving} downloadFeedback={downloadFeedback} />
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

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background.base }, search: { paddingHorizontal: spacing[5], paddingTop: spacing[4] }, titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4], gap: spacing[2] }, title: { flex: 1 }, titleActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, grid: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] }, gridRow: { gap: spacing[3], marginBottom: spacing[4] }, tile: { flex: 1, minHeight: 174, gap: spacing[2], position: 'relative' }, visual: { height: 128, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' }, more: { position: 'absolute', right: spacing[1], top: spacing[1], zIndex: 2, backgroundColor: colors.surface.card }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] }, sheetList: { gap: spacing[3], paddingBottom: spacing[2] } });
