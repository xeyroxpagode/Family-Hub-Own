import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppText } from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, MOTION, radius, spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getUploadCoordinator, type UploadCoordinatorSnapshot } from '../../services/homecloud/homecloudUploadCoordinator';
import type { UploadJob } from '../../services/homecloud/homecloudUploadTypes';

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
 *
 * HC-POL-017 — it is a FLOATING PILL, never a band in the layout. The band it
 * replaces sat in the screen's column, so every job that started squeezed the
 * Files grid and every job that ended let it jump back. Being absolute, the pill
 * overlays the content instead of displacing it: the search field, the header,
 * the grid, the tab selector and the navbar never move because an upload
 * exists. It sits above the floating navigation bar's tap targets, inside the
 * safe area, and its entry/exit is opacity plus a <=6 pt rise — never a layout
 * change. It never claims a save: a completed job simply stops being shown,
 * because `completed` is the server's word to say, not the pill's.
 */
export function HomeCloudUploadActivity({ householdId }: { householdId: string | null }) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const coordinator = householdId ? getUploadCoordinator(householdId) : null;
  const [snapshot, setSnapshot] = useState<UploadCoordinatorSnapshot | null>(() => coordinator?.getSnapshot() ?? null);
  useEffect(() => {
    const owner = householdId ? getUploadCoordinator(householdId) : null;
    if (!owner) { setSnapshot(null); return undefined; }
    return owner.subscribe(setSnapshot);
  }, [householdId]);

  const activity = useMemo(() => summarizeActivity(snapshot), [snapshot]);

  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activity !== null) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: reducedMotion ? 40 : MOTION.fade,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return undefined;
    }
    setExpanded(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: reducedMotion ? 40 : MOTION.feedbackExit,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setMounted(false));
    return undefined;
  }, [activity, progress, reducedMotion]);

  if (!mounted || activity === null) return null;

  const bottomOffset = insets.bottom + FLOATING_NAV_CLEARANCE;

  return (
    <Animated.View
      style={[
        styles.host,
        {
          bottom: bottomOffset,
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        },
      ]}
    >
      {expanded ? (
        <View style={styles.panel} accessibilityLabel={`Detalles de ${activity.jobs.length} subidas`}>
          {activity.jobs.map((job) => (
            <View key={job.id} style={styles.jobRow}>
              <View style={styles.jobCopy}>
                <AppText variant="bodySmall" weight="600" numberOfLines={1}>{job.artifact.displayName}</AppText>
                <AppText variant="caption" tone={job.state === 'failed' ? 'danger' : 'secondary'} numberOfLines={2}>
                  {jobStateLabel(job, snapshot)}
                </AppText>
              </View>
              {job.state === 'failed' && job.error?.retryable === true ? (
                <AppButton
                  title="Reintentar"
                  size="sm"
                  variant="secondary"
                  accessibilityLabel={`Reintentar la subida de ${job.artifact.displayName}`}
                  onPress={() => void coordinator?.retry(job.id)}
                />
              ) : null}
              {JOB_CANCELLABLE_STATES.has(job.state) ? (
                <AppButton
                  title="Cancelar"
                  size="sm"
                  variant="ghost"
                  accessibilityLabel={`Cancelar la subida de ${job.artifact.displayName}`}
                  onPress={() => void coordinator?.cancel(job.id)}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      <Pressable
        onPress={() => setExpanded((previous) => !previous)}
        accessibilityRole="button"
        accessibilityLabel={`${activity.label}. ${expanded ? 'Ocultar' : 'Ver'} los detalles de las subidas`}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      >
        {activity.inFlight ? (
          <ActivityIndicator size="small" color={activity.failedCount > 0 ? colors.danger.base : colors.brand} />
        ) : (
          <HomePlusIcon
            name={activity.failedCount > 0 ? 'alert-circle' : 'cloud-upload-outline'}
            size={18}
            color={activity.failedCount > 0 ? colors.danger.base : colors.brand}
          />
        )}
        <View style={styles.pillCopy}>
          <AppText variant="caption" weight="700" numberOfLines={1} style={activity.failedCount > 0 ? styles.pillLabelDanger : styles.pillLabel}>
            {activity.label}
          </AppText>
          {typeof activity.percent === 'number' ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, activity.percent))}%` }]} />
            </View>
          ) : null}
        </View>
        <HomePlusIcon name={expanded ? 'chevron-down' : 'chevron-up'} size={16} color={colors.text.secondary} />
      </Pressable>
    </Animated.View>
  );
}

/** What the collapsed pill says, plus what its detail panel needs. */
type UploadActivitySummary = {
  readonly label: string;
  /** The REAL native transfer percentage, when there is one to show. */
  readonly percent: number | null;
  readonly failedCount: number;
  readonly inFlight: boolean;
  readonly jobs: readonly UploadJob[];
};

/** The engine states a member may still stop. Anything past `verifying` is already being finalized server-side. */
const JOB_CANCELLABLE_STATES: ReadonlySet<UploadJob['state']> = new Set(['pending', 'registering', 'registered', 'uploading', 'verifying']);

function summarizeActivity(snapshot: UploadCoordinatorSnapshot | null): UploadActivitySummary | null {
  if (!snapshot) return null;
  const jobs = snapshot.jobs;
  if (jobs.length === 0) return null;
  const failed = jobs.filter((job) => job.state === 'failed');
  const active = snapshot.activeJobId ? jobs.find((job) => job.id === snapshot.activeJobId) ?? null : null;
  const inFlight = active !== null && active.state !== 'failed';
  // FAILED work outranks everything on the pill: it is the only state that
  // needs the member to do something.
  if (failed.length > 0) {
    return {
      label: failed.length === 1
        ? `No se pudo subir ${failed[0].artifact.displayName}`
        : `${failed.length} archivos no se pudieron subir`,
      percent: null,
      failedCount: failed.length,
      inFlight,
      jobs,
    };
  }
  if (active?.state === 'verifying' || active?.state === 'finalizing') {
    return { label: 'Terminando…', percent: null, failedCount: 0, inFlight, jobs };
  }
  if (active && snapshot.activeUpload?.jobId === active.id) {
    const percent = Math.round(snapshot.activeUpload.progress * 100);
    const more = jobs.length > 1 ? ` · ${jobs.length} en cola` : '';
    return { label: `Subiendo · ${percent}%${more}`, percent, failedCount: 0, inFlight, jobs };
  }
  return {
    label: jobs.length === 1 ? `Subiendo ${jobs[0].artifact.displayName}…` : `Subiendo ${jobs.length} elementos…`,
    percent: null,
    failedCount: 0,
    inFlight,
    jobs,
  };
}

/** One job's honest state line for the detail panel, in the engine's own words. */
function jobStateLabel(job: UploadJob, snapshot: UploadCoordinatorSnapshot | null): string {
  switch (job.state) {
    case 'pending':
    case 'registering':
    case 'registered':
      return 'Pendiente';
    case 'uploading': {
      if (snapshot?.activeUpload?.jobId === job.id) {
        return `Subiendo ${Math.round(snapshot.activeUpload.progress * 100)}%`;
      }
      return 'Subiendo…';
    }
    case 'verifying':
      return 'Verificando…';
    case 'finalizing':
      return 'Guardando…';
    case 'failed':
      return job.error?.message ?? 'No se pudo subir';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Pendiente';
  }
}

/** The floating navigation bar's own height, so the pill never covers its targets. */
const FLOATING_NAV_CLEARANCE = 68 + spacing[3];

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    zIndex: 30,
    gap: spacing[2],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 50,
    maxWidth: 320,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
    alignSelf: 'center',
  },
  pillPressed: { opacity: 0.72 },
  pillCopy: { flex: 1, gap: spacing[1] },
  pillLabel: { color: colors.text.primary },
  pillLabelDanger: { color: colors.danger.base },
  /** The 3.5 pt real-percentage track the contract names. */
  progressTrack: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.surface.soft,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  panel: {
    maxWidth: 360,
    maxHeight: 300,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    padding: spacing[2],
    gap: spacing[2],
    alignSelf: 'center',
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  jobCopy: { flex: 1, gap: spacing[1] },
});
