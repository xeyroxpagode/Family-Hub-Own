import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { AppButton, AppText } from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import { getMemoryOriginalUrl } from '../../services/homecloud/homecloudMemoryOriginal';
import {
  MEMORY_MEDIA_KIND_LABEL,
  MemoryMediaAccess,
  audioSeekRatio,
  audioSeekTarget,
  mediaProgressRatio,
  validMediaDuration,
  type MemoryMediaFailure,
} from '../../services/homecloud/homecloudMemoryMediaPlayback';
import { formatDuration } from '../../services/homecloud/MemoryMediaReview';
import { memoryDevTrace } from '../../services/homecloud/homecloudMemoryDiagnostics';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';

/**
 * HC2-B — AUDIO page of the SAME Memory Viewer.
 *
 * OWNERSHIP
 * Identical to Video and for the same reason: only the page matching
 * `activeContentId` may instantiate a player. An inactive audio page renders a
 * placeholder and does not even ask for the signed original.
 *
 * PROGRESS LIVES HERE
 * `useAudioPlayerStatus` re-renders on every player tick. Keeping that state
 * inside this component instead of lifting `currentTime` to the Viewer is what
 * stops a 4 Hz position readout from re-rendering the whole pager and all of
 * its pages. The Viewer owns only `activeContentId` and the lifecycle intent.
 *
 * RELEASE
 * `useAudioPlayer` releases the native shared object on unmount, so that hook
 * is the ONLY release authority: `player.remove()` is never called, and nothing
 * touches the player after unmount. `pause()` is allowed while mounted, which
 * is how a revocation is honoured.
 *
 * NO WAVEFORM, NO BACKGROUND AUDIO
 * There is no waveform data to draw, so the progress track is a plain bar.
 * Nothing here configures the audio session: the recorder already restores
 * playback mode, and reopening capture configuration is out of scope.
 */

const LABEL = MEMORY_MEDIA_KIND_LABEL.audio;

export function MemoryAudioPage({ memory, accessToken, active, authorized }: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  /** This page is the pager's active page: the ONLY page allowed a player. */
  active: boolean;
  /** Global lifecycle intent; `false` means pause, and never auto-resume. */
  authorized: boolean;
}) {
  if (!active) return <View style={styles.placeholder} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
  return <ActiveMemoryAudioPage memory={memory} accessToken={accessToken} authorized={authorized} />;
}

function ActiveMemoryAudioPage({ memory, accessToken, authorized }: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  authorized: boolean;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failure, setFailure] = useState<MemoryMediaFailure | null>(null);
  const access = useRef(new MemoryMediaAccess()).current;

  useEffect(() => {
    const current = access.begin();
    setUri(null);
    setFailure(null);
    if (!accessToken) {
      setFailure('access');
      return () => access.invalidate();
    }
    let mounted = true;
    void getMemoryOriginalUrl(accessToken, memory.id).then((url) => {
      if (!mounted || !access.isCurrent(current)) return;
      setUri(url);
    }).catch(() => {
      if (!mounted || !access.isCurrent(current)) return;
      setFailure('access');
    });
    return () => { mounted = false; access.invalidate(); };
  }, [access, accessToken, memory.id]);

  if (failure !== null) return <MemoryAudioFailure failure={failure} />;
  if (uri === null) return <MemoryAudioLoading />;
  return <MemoryAudioPlayer key={memory.id} uri={uri} authorized={authorized} onFailure={setFailure} />;
}

/**
 * The ONLY place an `AudioPlayer` exists. It mounts only for the active page and
 * only once the canonical original is reachable, and it opens PAUSED: nothing
 * here calls `play()` except the explicit user press below.
 */
function MemoryAudioPlayer({ uri, authorized, onFailure }: {
  uri: string;
  authorized: boolean;
  onFailure: (failure: MemoryMediaFailure) => void;
}) {
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);
  const [seekFailed, setSeekFailed] = useState(false);
  const onFailureRef = useRef(onFailure);
  onFailureRef.current = onFailure;

  // HONEST ERROR STATE. `status.error` is a raw native string and is never
  // rendered; only the KIND of failure is surfaced. It is also reported once,
  // through the same classification Video uses.
  useEffect(() => {
    if (!status.error) return;
    const failure: MemoryMediaFailure = 'playback';
    memoryDevTrace('audio_player_failed', { kind: 'audio', failure });
    onFailureRef.current(failure);
  }, [status.error]);

  // LIFECYCLE REVOCATION. Pausing is the only response: returning to the
  // foreground restores nothing, because nothing here resumes on its own.
  useEffect(() => {
    if (authorized) return;
    player.pause();
  }, [authorized, player]);

  const toggle = () => {
    setSeekFailed(false);
    if (status.playing) { player.pause(); return; }
    // Replaying a finished track restarts it instead of doing nothing.
    const duration = validMediaDuration(status.duration);
    if (duration !== null && duration > 0 && status.currentTime >= duration) {
      void player.seekTo(0).then(() => player.play()).catch(() => setSeekFailed(true));
      return;
    }
    player.play();
  };

  const seekToX = (x: number) => {
    setSeekFailed(false);
    const ratio = audioSeekRatio(x, trackWidth);
    const target = audioSeekTarget(ratio, status.duration);
    // A press that cannot produce an honest target never reaches the API.
    if (target === null) return;
    void player.seekTo(target).catch(() => setSeekFailed(true));
  };

  const ratio = mediaProgressRatio(status.currentTime, status.duration);
  const duration = validMediaDuration(status.duration);
  const playing = status.playing;

  return <View style={styles.page}>
    <View style={styles.identity}>
      <HomePlusIcon name="musical-notes" size={30} color={colors.text.inverse} />
      <AppText tone="inverse" weight="700">{LABEL}</AppText>
    </View>
    {!status.isLoaded && !status.error ? <View style={styles.loading}><ActivityIndicator color={colors.text.inverse} /><AppText tone="inverse">Cargando audio…</AppText></View> : null}
    {seekFailed ? <AppText tone="inverse" align="center">No pudimos mover la posición del audio.</AppText> : null}
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={`Progreso del ${LABEL.toLowerCase()}`}
      accessibilityValue={ratio === null ? undefined : { min: 0, max: 100, now: Math.round(ratio * 100) }}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={styles.trackHit}
    >
      <Pressable accessibilityLabel={`${LABEL}: mover la posición`} onPress={(event) => seekToX(event.nativeEvent.locationX)} style={styles.track}>
        <View style={[styles.trackFill, { width: ratio === null ? '0%' : `${ratio * 100}%` }]} />
      </Pressable>
    </View>
    <AppText tone="inverse" variant="caption">
      {ratio === null || duration === null || duration <= 0
        ? 'Posición no disponible'
        : `${formatDuration(status.currentTime)} / ${formatDuration(duration)}`}
    </AppText>
    <AppButton title={playing ? 'Pausar' : 'Reproducir'} size="sm" variant="secondary" onPress={toggle} />
  </View>;
}

function MemoryAudioLoading() {
  return <View style={styles.page}><View style={styles.loading}><ActivityIndicator color={colors.text.inverse} /><AppText tone="inverse">Cargando audio…</AppText></View></View>;
}

/**
 * HONEST FAILURE, and no fake future action: no Save, Share or Export exists in
 * HC2-B, and offering one next to an unplayable file would be a promise the
 * product does not keep yet.
 */
function MemoryAudioFailure({ failure }: { failure: MemoryMediaFailure }) {
  const copy = failure === 'access'
    ? 'No pudimos abrir este audio.'
    : 'No pudimos reproducir este audio.';
  return <View style={styles.failure}>
    <HomePlusIcon name="alert-circle-outline" size={34} color={colors.text.inverse} />
    <AppText tone="inverse" align="center">{copy}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  placeholder: { height: '100%', backgroundColor: '#000000' },
  page: { height: '100%', alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[5], backgroundColor: '#000000' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  loading: { alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  trackHit: { width: '100%' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 3, backgroundColor: colors.text.inverse },
  failure: { height: '100%', alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[5] },
});