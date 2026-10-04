import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton, AppText } from '../ui';
import { spacing } from '../../constants/theme';
import { getUploadCoordinator, type UploadCoordinatorSnapshot } from '../../services/homecloud/homecloudUploadCoordinator';

/**
 * GLOBAL HOUSEHOLD UPLOAD ACTIVITY — NOT a Files-owned job action.
 *
 * S4-iii D. This indicator answers "is anything in this household uploading?",
 * so it reads the household coordinator's snapshot: the ACTIVE job, the ACTIVE
 * native transfer, and any failed job. Its Cancel/Retry therefore act on
 * whichever job that global snapshot names, and the copy says so.
 *
 * What it must never become is the Files surface's own upload control. A Files
 * intake owns exactly one job (`acceptedJobId`), and its Cancel, Retry and
 * progress are bound to that id in `FileIntake`/`homecloudFileIntakeService`.
 * Conflating the two is how a "Cancel" on a Files upload ends up destroying an
 * unrelated Memory upload that happened to be running. Keeping both views —
 * household-wide visibility here, job-owned control there — is the point: shared
 * visibility is useful, shared TARGETS are not.
 */
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
      {activity.failedId ? <AppButton title="Reintentar" size="sm" variant="secondary" accessibilityLabel={`Reintentar la subida de ${activity.failedId}`} onPress={() => void coordinator?.retry(activity.failedId!)} /> : null}
      {'cancelId' in activity && activity.cancelId ? <AppButton title="Cancelar" size="sm" variant="secondary" accessibilityLabel={`Cancelar la subida activa ${activity.cancelId}`} onPress={() => void coordinator?.cancel(activity.cancelId)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { paddingHorizontal: spacing[5], paddingVertical: spacing[2], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] } });
