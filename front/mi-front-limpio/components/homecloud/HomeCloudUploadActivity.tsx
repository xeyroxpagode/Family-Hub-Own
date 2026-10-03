import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton, AppText } from '../ui';
import { spacing } from '../../constants/theme';
import { getUploadCoordinator, type UploadCoordinatorSnapshot } from '../../services/homecloud/homecloudUploadCoordinator';

export function HomeCloudUploadActivity({ householdId }: { householdId: string | null }) {
  const coordinator = householdId ? getUploadCoordinator(householdId) : null;
  const [snapshot, setSnapshot] = useState<UploadCoordinatorSnapshot | null>(() => coordinator?.getSnapshot() ?? null);
  useEffect(() => {
    const owner = householdId ? getUploadCoordinator(householdId) : null;
    if (!owner) { setSnapshot(null); return undefined; }
    return owner.subscribe(setSnapshot);
  }, [householdId]);

  const activity = useMemo(() => {
    if (!snapshot) return null;
    const failed = snapshot.jobs.find((job) => job.state === 'failed');
    if (failed) return { label: `No se pudo subir ${failed.artifact.displayName}`, failedId: failed.id };
    const active = snapshot.activeJobId ? snapshot.jobs.find((job) => job.id === snapshot.activeJobId) : null;
    if (active?.state === 'verifying' || active?.state === 'finalizing') return { label: 'Terminando…', failedId: null };
    if (active && snapshot.activeUpload?.jobId === active.id) {
      const percentage = Math.round(snapshot.activeUpload.progress * 100);
      return { label: `Subiendo ${snapshot.activeUpload.displayName} · ${percentage}%`, failedId: null, cancelId: active.id };
    }
    if (active) return { label: `Subiendo ${snapshot.jobs.length} elemento${snapshot.jobs.length === 1 ? '' : 's'}…`, failedId: null, cancelId: active.id };
    if (snapshot.jobs.length > 0) return { label: snapshot.jobs.length === 1 ? 'Pendiente de subir' : `${snapshot.jobs.length} elementos pendientes`, failedId: null };
    return null;
  }, [snapshot]);
  if (!activity) return null;
  return (
    <View style={styles.row}>
      <AppText variant="caption" tone={activity.failedId ? 'danger' : 'secondary'}>{activity.label}</AppText>
      {activity.failedId ? <AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => void coordinator?.retry(activity.failedId!)} /> : null}
      {'cancelId' in activity && activity.cancelId ? <AppButton title="Cancelar" size="sm" variant="secondary" onPress={() => void coordinator?.cancel(activity.cancelId)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { paddingHorizontal: spacing[5], paddingVertical: spacing[2], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] } });
