import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { usePresenceDiagnostics } from '../../services/presenceDiagnostics';
import { ActionSheet, AppCard, AppText } from '../ui';

const IS_DEVELOPMENT = typeof __DEV__ !== 'undefined' && __DEV__;

type PresenceDiagnosticsPanelProps = {
  visible: boolean;
  onClose: () => void;
};

const formatAge = (timestamp: number | null, now: number) => {
  if (!timestamp) return '—';
  return `${Math.max(0, Math.round((now - timestamp) / 1000))} s`;
};

const formatClock = (timestamp: number | null) => (
  timestamp ? new Date(timestamp).toLocaleTimeString('es-AR') : '—'
);

const formatCoordinate = (value: number | null) => (
  typeof value === 'number' ? value.toFixed(6) : '—'
);

const formatDuration = (value: number | null) => (
  value === null ? '—' : `${(value / 1000).toFixed(1)} s`
);

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" tone="secondary" style={styles.label}>{label}</AppText>
      <AppText variant="caption" weight="700" style={styles.value}>{value}</AppText>
    </View>
  );
}

function DiagnosticSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" weight="800" style={styles.sectionTitle}>{title}</AppText>
      <AppCard variant="quiet" padding="compact" contentStyle={styles.cardContent}>{children}</AppCard>
    </View>
  );
}

export function PresenceDiagnosticsPanel({ visible, onClose }: PresenceDiagnosticsPanelProps) {
  const diagnostics = usePresenceDiagnostics();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!visible || !IS_DEVELOPMENT) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!IS_DEVELOPMENT) return null;

  const { lifecycle, gps, decision, publish, realtime, marker } = diagnostics;
  const sample = gps.latest;

  return (
    <ActionSheet
      visible={visible}
      title="Foreground Presence Debug"
      subtitle="Solo disponible en desarrollo"
      onRequestClose={onClose}
      size="near-full"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <DiagnosticSection title="LIFECYCLE">
          <DiagnosticRow label="Sharing" value={lifecycle.sharingEnabled ? 'ON' : 'OFF'} />
          <DiagnosticRow label="AppState" value={lifecycle.appState} />
        </DiagnosticSection>

        <DiagnosticSection title="WATCHER">
          <DiagnosticRow label="State" value={lifecycle.watcherState} />
          <DiagnosticRow label="Generation" value={lifecycle.watcherGeneration?.toString() ?? '—'} />
          <DiagnosticRow label="Starts / stops" value={`${lifecycle.watcherStartCount} / ${lifecycle.watcherStopCount}`} />
          <DiagnosticRow label="Started" value={formatClock(lifecycle.watcherStartedAt)} />
          <DiagnosticRow label="Stopped" value={formatClock(lifecycle.watcherStoppedAt)} />
        </DiagnosticSection>

        <DiagnosticSection title="GPS">
          <DiagnosticRow label="Lat / lng" value={`${formatCoordinate(sample?.latitude ?? null)}, ${formatCoordinate(sample?.longitude ?? null)}`} />
          <DiagnosticRow label="Accuracy" value={sample?.accuracy === null || sample?.accuracy === undefined ? '—' : `${Math.round(sample.accuracy)} m`} />
          <DiagnosticRow label="Sample age" value={formatAge(sample?.timestamp ?? null, now)} />
          <DiagnosticRow label="Heading / speed" value={`${sample?.heading ?? '—'} / ${sample?.speed ?? '—'}`} />
          <DiagnosticRow label="Δ distance" value={gps.distanceFromPreviousAcceptedMeters === null ? '—' : `${gps.distanceFromPreviousAcceptedMeters.toFixed(1)} m`} />
          <DiagnosticRow label="Δ time" value={formatDuration(gps.timeSincePreviousAcceptedMs)} />
        </DiagnosticSection>

        <DiagnosticSection title="DECISION">
          <DiagnosticRow label="Latest" value={decision.value} />
          <DiagnosticRow label="Reason" value={decision.reason ?? '—'} />
          <DiagnosticRow label="At" value={formatClock(decision.at)} />
        </DiagnosticSection>

        <DiagnosticSection title="PUBLISH">
          <DiagnosticRow label="State" value={publish.state} />
          <DiagnosticRow label="Last result" value={publish.lastResult ?? '—'} />
          <DiagnosticRow label="Attempt / success" value={`${formatClock(publish.lastAttemptAt)} / ${formatClock(publish.lastSuccessfulAt)}`} />
          <DiagnosticRow label="Latency" value={publish.lastLatencyMs === null ? '—' : `${publish.lastLatencyMs} ms`} />
          <DiagnosticRow label="Queued newer sample" value={publish.queuedNewerSample ? 'YES' : 'NO'} />
        </DiagnosticSection>

        <DiagnosticSection title="REALTIME">
          <DiagnosticRow label="Subscription" value={realtime.subscriptionState} />
          <DiagnosticRow label="Last event" value={formatClock(realtime.lastEventAt)} />
          <DiagnosticRow label="Member" value={realtime.memberId ?? '—'} />
          <DiagnosticRow label="Location timestamp" value={realtime.eventLocationTimestamp ?? '—'} />
          <DiagnosticRow label="State changed" value={realtime.changedNormalizedState === null ? '—' : realtime.changedNormalizedState ? 'YES' : 'NO'} />
        </DiagnosticSection>

        <DiagnosticSection title="MARKER">
          <DiagnosticRow label="Debug member" value={marker.debugMemberId ?? '—'} />
          <DiagnosticRow label="Rendered member" value={marker.memberId ?? '—'} />
          <DiagnosticRow label="Location timestamp" value={marker.normalizedLocationTimestamp ?? '—'} />
          <DiagnosticRow label="Lat / lng" value={`${formatCoordinate(marker.latitude)}, ${formatCoordinate(marker.longitude)}`} />
          <DiagnosticRow label="Last render" value={formatClock(marker.lastRenderedAt)} />
        </DiagnosticSection>
      </ScrollView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  section: { gap: spacing[2] },
  sectionTitle: { color: colors.text.secondary, letterSpacing: 0.6 },
  cardContent: { gap: spacing[2] },
  row: { flexDirection: 'row', gap: spacing[3], justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { flex: 1 },
  value: { flex: 1.35, textAlign: 'right', color: colors.text.primary },
});

