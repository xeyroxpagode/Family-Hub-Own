import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { ActionSheet, AppButton, AppText } from '../../components/ui';
import { PlannerEvidenceViewer, type PlannerEvidenceViewerItem } from '../../components/planner/PlannerEvidenceViewer';
import { getPlannerTaskFulfillmentV1 } from '../../services/plannerTasks';
import {
  cancelEvidenceArtifact, captureEvidencePhoto, captureEvidenceVideo, chooseEvidenceMedia, clearEvidenceDraft, createEvidenceDraftItems,
  loadEvidenceDraft, saveEvidenceDraft, submitEvidenceVersion, uploadEvidenceArtifact,
  type EvidenceDraftItem, type EvidenceLocalArtifact,
} from '../../services/plannerEvidenceV2';
import { createIdempotencyKey } from '../../services/idempotency';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { UploadCoordinator } from '../../services/uploads/uploadCoordinator';

export function EvidenceComposerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const { markPlannerChanged } = useAppRefresh();
  const taskId = route.params?.taskId as string;
  const taskTitle = route.params?.taskTitle || 'Tarea';
  const [fulfillmentId, setFulfillmentId] = useState<string | null>(route.params?.fulfillmentId || null);
  const [fulfillmentVersion, setFulfillmentVersion] = useState<number | null>(route.params?.fulfillmentVersion || null);
  const [items, setItems] = useState<EvidenceDraftItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewer, setViewer] = useState<{ items: PlannerEvidenceViewerItem[]; index: number } | null>(null);
  const submitKey = useRef(createIdempotencyKey('planner.evidence.submit'));
  const coordinatorRef = useRef<UploadCoordinator<EvidenceDraftItem> | null>(null);
  const accessToken = session?.access_token || null;
  const householdId = currentHousehold?.id || null;

  useEffect(() => {
    if (!accessToken || !householdId) return;
    let active = true;
    void Promise.all([
      loadEvidenceDraft(householdId, taskId),
      getPlannerTaskFulfillmentV1(accessToken, taskId),
    ]).then(([draft, fulfillment]) => {
      if (!active) return;
      const coordinator = new UploadCoordinator<EvidenceDraftItem>({
        concurrency: 2,
        execute: (job, controls) => uploadEvidenceArtifact(accessToken, taskId, job, controls),
        cleanupCancelled: (job) => cancelEvidenceArtifact(accessToken, taskId, job),
        onChange: (jobs) => { if (active) setItems(jobs); },
      });
      coordinatorRef.current = coordinator;
      coordinator.restore(draft.map((item) => ({
        ...item,
        state: ['registering', 'uploading', 'confirming'].includes(item.state) ? 'local' : item.state,
      })));
      if (fulfillment) {
        const current = fulfillment.task.fulfillments.find((candidate: any) => ['pending', 'correction_requested'].includes(candidate.status));
        if (current) { setFulfillmentId(current.id); setFulfillmentVersion(current.version); }
      }
    }).catch((error) => Alert.alert('Planner', error instanceof Error ? error.message : 'No se pudo preparar la evidencia.')).finally(() => active && setLoading(false));
    return () => { active = false; coordinatorRef.current = null; };
  }, [accessToken, householdId, taskId]);

  useEffect(() => { if (householdId && !loading) void saveEvidenceDraft(householdId, taskId, items); }, [householdId, items, loading, taskId]);

  const addArtifacts = useCallback((artifacts: EvidenceLocalArtifact[]) => {
    const created = createEvidenceDraftItems(artifacts);
    coordinatorRef.current?.enqueue(created);
  }, []);

  const cancelOne = useCallback((item: EvidenceDraftItem) => {
    void coordinatorRef.current?.cancel(item.jobId);
  }, []);

  const retryOne = useCallback((item: EvidenceDraftItem) => {
    void coordinatorRef.current?.retry(item.jobId);
  }, []);

  const runPicker = async (kind: 'photo' | 'video' | 'gallery') => {
    setAddOpen(false);
    try {
      const artifacts = kind === 'photo' ? await captureEvidencePhoto() : kind === 'video' ? await captureEvidenceVideo() : await chooseEvidenceMedia();
      addArtifacts(artifacts);
    } catch (error) { Alert.alert('Permisos', error instanceof Error ? error.message : 'No se pudo abrir el selector.'); }
  };

  const confirmed = items.filter((item) => item.state === 'confirmed' && item.remoteArtifactId);
  const incompatible = items.some((item) => item.queueState !== 'completed' || item.state !== 'confirmed');
  const canSubmit = Boolean(fulfillmentId && fulfillmentVersion && items.length > 0 && !incompatible && !submitting);

  const submit = async () => {
    if (!canSubmit || !accessToken || !householdId || !fulfillmentId || !fulfillmentVersion) return;
    setSubmitting(true);
    try {
      await submitEvidenceVersion(accessToken, taskId, fulfillmentId, fulfillmentVersion, confirmed.map((item) => item.remoteArtifactId!), submitKey.current);
      await clearEvidenceDraft(householdId, taskId);
      markPlannerChanged();
      navigation.goBack();
    } catch (error) { Alert.alert('No se pudo enviar', error instanceof Error ? error.message : 'Revisá los archivos e intentá otra vez.'); }
    finally { setSubmitting(false); }
  };

  const viewerItems = useMemo(() => items.map((item) => ({ id: item.localId, uri: item.artifact.localUri, mimeType: item.artifact.mimeType, label: item.artifact.displayName })), [items]);

  if (loading) return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.terracotta[500]} /></SafeAreaView>;
  return <SafeAreaView style={styles.root}>
    <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}><HomePlusIcon name="close" size={24} color={colors.text.primary} /></TouchableOpacity><AppText variant="title3" weight="800">Enviar a revisión</AppText><View style={styles.iconButton} /></View>
    <View style={styles.context}><AppText variant="caption" tone="secondary">Tarea</AppText><AppText variant="title2" weight="800">{taskTitle}</AppText></View>
    <FlatList contentContainerStyle={styles.grid} data={items} numColumns={3} keyExtractor={(item) => item.localId} ListEmptyComponent={<TouchableOpacity style={styles.empty} onPress={() => setAddOpen(true)}><HomePlusIcon name="images-outline" size={30} color={colors.terracotta[500]} /><AppText weight="700">Añadí fotos o videos</AppText></TouchableOpacity>} renderItem={({ item, index }) => <View style={styles.tile}>
      <TouchableOpacity style={styles.preview} onPress={() => setViewer({ items: viewerItems, index })}>{item.artifact.mediaKind === 'image' ? <Image source={{ uri: item.artifact.localUri }} style={styles.image} /> : <View style={styles.video}><HomePlusIcon name="play-circle" size={34} color={colors.text.inverse} /><AppText variant="micro" tone="inverse">Video</AppText></View>}</TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Cancelar carga" style={styles.remove} onPress={() => cancelOne(item)}><HomePlusIcon name="close" size={15} color={colors.text.inverse} /></TouchableOpacity>
      {item.state !== 'confirmed' ? <View style={styles.state}>{item.queueState === 'failed' || item.queueState === 'cancelled' ? <TouchableOpacity onPress={() => retryOne(item)}><AppText variant="micro" tone="danger" weight="800">Reintentar</AppText></TouchableOpacity> : <><ActivityIndicator size="small" color={colors.terracotta[500]} /><AppText variant="micro">{item.state === 'uploading' ? `Subiendo ${Math.round(item.progress * 100)}%` : item.queueState === 'queued' ? 'En cola' : 'Preparando'}</AppText></>}</View> : null}
    </View>} />
    <View style={styles.footer}><TouchableOpacity style={styles.add} onPress={() => setAddOpen(true)}><HomePlusIcon name="add" size={20} color={colors.terracotta[600]} /><AppText tone="brand" weight="700">Añadir</AppText></TouchableOpacity><AppText variant="caption" tone="secondary">{items.length} archivo{items.length === 1 ? '' : 's'} seleccionado{items.length === 1 ? '' : 's'}</AppText><AppButton title="Enviar a revisión" onPress={() => void submit()} disabled={!canSubmit} loading={submitting} /></View>
    <ActionSheet visible={addOpen} title="Añadir evidencia" size="content" onRequestClose={() => setAddOpen(false)}><View style={styles.options}>{[['camera','Sacar foto','photo'],['videocam','Grabar video','video'],['images','Elegir fotos o videos','gallery']].map(([icon,label,kind]) => <TouchableOpacity key={kind} style={styles.option} onPress={() => void runPicker(kind as any)}><HomePlusIcon name={icon as any} size={22} color={colors.terracotta[600]} /><AppText weight="700">{label}</AppText></TouchableOpacity>)}</View></ActionSheet>
    {viewer ? <PlannerEvidenceViewer visible items={viewer.items} initialIndex={viewer.index} onClose={() => setViewer(null)} /> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.default }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, context: { padding: spacing[4], gap: spacing[1] }, grid: { paddingHorizontal: spacing[3], paddingBottom: 160 }, tile: { width: '31.5%', aspectRatio: 1, margin: '0.9%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface.soft }, preview: { flex: 1 }, image: { width: '100%', height: '100%' }, video: { flex: 1, backgroundColor: '#252525', alignItems: 'center', justifyContent: 'center' }, remove: { position: 'absolute', right: 5, top: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,.68)', alignItems: 'center', justifyContent: 'center' }, state: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 30, backgroundColor: 'rgba(255,255,255,.92)', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' }, empty: { margin: spacing[4], minHeight: 180, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border.default, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing[2] }, footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing[4], gap: spacing[2], backgroundColor: colors.background.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.default }, add: { flexDirection: 'row', gap: spacing[2], alignItems: 'center', alignSelf: 'flex-start', minHeight: 44 }, options: { gap: spacing[1] }, option: { minHeight: 52, flexDirection: 'row', gap: spacing[3], alignItems: 'center', paddingHorizontal: spacing[2] },
});
