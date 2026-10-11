import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, useAudioSampleListener } from 'expo-audio';
import { AppButton, AppText } from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import { getMemoryOriginalUrl } from '../../services/homecloud/homecloudMemoryOriginal';
import {
  MEMORY_MEDIA_KIND_LABEL,
  MemoryMediaAccess,
  AUDIO_PLAYBACK_RATES,
  audioSampleAmplitudes,
  audioSeekRatio,
  audioSeekTarget,
  isAudioPlaybackRate,
  mediaSeekByTarget,
  mediaProgressRatio,
  validMediaDuration,
  type AudioPlaybackRate,
  type MemoryMediaFailure,
} from '../../services/homecloud/homecloudMemoryMediaPlayback';
import { formatDuration } from '../../services/homecloud/MemoryMediaReview';
import { memoryDevTrace } from '../../services/homecloud/homecloudMemoryDiagnostics';
import { memoryPrimaryText } from '../../services/homecloud/homecloudMemoriesTimeline';
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
 * REAL WAVEFORM ONLY, NO BACKGROUND AUDIO
 * The waveform below is drawn exclusively from live `useAudioSampleListener`
 * frames: real audio-derived amplitudes, shown only while the native sampler
 * reports support and samples arrive. When sampling is unsupported (or before
 * the first sample) the page says so honestly instead of drawing anything.
 * A decorative bar that does not represent the audio is forbidden and does
 * not exist here. Nothing here configures the audio session: the recorder
 * already restores playback mode, and reopening capture configuration is out
 * of scope.
 */

const LABEL = MEMORY_MEDIA_KIND_LABEL.audio;

export function MemoryAudioPage({ memory, accessToken, active, authorized, width }: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  /** This page is the pager's active page: the ONLY page allowed a player. */
  active: boolean;
  /** Global lifecycle intent; `false` means pause, and never auto-resume. */
  authorized: boolean;
  /**
   * HC2-C (A1) — THE PAGER'S OWN PAGE WIDTH.
   *
   * Identical contract to Video: the pager's `getItemLayout` asserts
   * `length === width` for every page, so this page must declare exactly that
   * width in EVERY state. Audio previously returned height-only containers,
   * which is the same geometry lie that made a tapped audio hand the Viewer
   * over to a different Memory.
   */
  width: number;
}) {
  if (!active) return <View style={[styles.placeholder, { width }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
  return <ActiveMemoryAudioPage memory={memory} accessToken={accessToken} authorized={authorized} width={width} />;
}

function ActiveMemoryAudioPage({ memory, accessToken, authorized, width }: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  authorized: boolean;
  width: number;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failure, setFailure] = useState<MemoryMediaFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
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
  }, [access, accessToken, memory.id, attempt]);

  // HC2-C (A1): every branch declares the pager's width.
  if (failure !== null) return <MemoryAudioFailure failure={failure} width={width} onRetry={() => setAttempt((value) => value + 1)} />;
  if (uri === null) return <MemoryAudioLoading width={width} />;
  return <MemoryAudioPlayer key={`${memory.id}:${attempt}`} memory={memory} uri={uri} authorized={authorized} width={width} onFailure={setFailure} />;
}

/**
 * The ONLY place an `AudioPlayer` exists. It mounts only for the active page and
 * only once the canonical original is reachable, and it opens PAUSED: nothing
 * here calls `play()` except the explicit user press below.
 */
function MemoryAudioPlayer({ memory, uri, authorized, width, onFailure }: {
  memory: HomeCloudMemoryListItem;
  uri: string;
  authorized: boolean;
  width: number;
  onFailure: (failure: MemoryMediaFailure) => void;
}) {
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);
  const [seekFailed, setSeekFailed] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<AudioPlaybackRate>(1);
  const [samples, setSamples] = useState<number[]>([]);
  const sampleUpdateAt = useRef(0);
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

  useAudioSampleListener(player, (sample) => {
    const now = Date.now();
    if (now - sampleUpdateAt.current < 250) return;
    sampleUpdateAt.current = now;
    setSamples(audioSampleAmplitudes(sample.channels));
  });

  useEffect(() => {
    player.setPlaybackRate(playbackRate);
  }, [playbackRate, player]);

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

  const seekToXRef = useRef(seekToX);
  seekToXRef.current = seekToX;

  const skipBy = (seconds: number) => {
    setSeekFailed(false);
    const target = mediaSeekByTarget(status.currentTime, status.duration, seconds);
    if (target === null) return;
    void player.seekTo(target).catch(() => setSeekFailed(true));
  };

  const setRate = (rate: AudioPlaybackRate) => {
    if (!isAudioPlaybackRate(rate)) return;
    setPlaybackRate(rate);
  };

  const trackResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // The responder is created once, so it must NOT close over the first
    // render's `seekToX` (which would freeze `trackWidth` at its initial 0
    // and make every drag a no-op). It reads the latest handler through a
    // ref, the same latest-ref pattern used for `onFailure` above.
    onPanResponderGrant: (event) => seekToXRef.current(event.nativeEvent.locationX),
    onPanResponderMove: (event) => seekToXRef.current(event.nativeEvent.locationX),
  })).current;

  const ratio = mediaProgressRatio(status.currentTime, status.duration);
  const duration = validMediaDuration(status.duration);
  const playing = status.playing;
  const title = memoryPrimaryText(memory) || memory.displayName || LABEL;
  const buffering = status.isBuffering && !status.error;

  return <View style={[styles.page, { width }]}>
    <View style={styles.identity}>
      <HomePlusIcon name="musical-notes" size={30} color={colors.text.inverse} />
      <View style={styles.identityText}>
        <AppText tone="inverse" weight="700" numberOfLines={2}>{title}</AppText>
        <AppText tone="inverse" variant="caption">{LABEL}</AppText>
      </View>
    </View>
    {!status.isLoaded && !status.error ? <View style={styles.loading}><ActivityIndicator color={colors.text.inverse} /><AppText tone="inverse">Cargando audio…</AppText></View> : null}
    {buffering ? <View style={styles.loading}><ActivityIndicator color={colors.text.inverse} /><AppText tone="inverse">Buffering…</AppText></View> : null}
    {seekFailed ? <AppText tone="inverse" align="center">No pudimos mover la posición del audio.</AppText> : null}
    <RealAudioWaveform samples={samples} supported={player.isAudioSamplingSupported} />
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={`Progreso del ${LABEL.toLowerCase()}`}
      accessibilityValue={ratio === null ? undefined : { min: 0, max: 100, now: Math.round(ratio * 100) }}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={styles.trackHit}
    >
      <Pressable accessibilityLabel={`${LABEL}: mover la posición`} onPress={(event) => seekToX(event.nativeEvent.locationX)} style={styles.track} {...trackResponder.panHandlers}>
        <View style={[styles.trackFill, { width: ratio === null ? '0%' : `${ratio * 100}%` }]} />
      </Pressable>
    </View>
    <AppText tone="inverse" variant="caption">
      {ratio === null || duration === null || duration <= 0
        ? 'Posición no disponible'
        : `${formatDuration(status.currentTime)} / ${formatDuration(duration)}`}
    </AppText>
    <View style={styles.controls}>
      <AppButton title="-10" size="sm" variant="secondary" onPress={() => skipBy(-10)} accessibilityLabel="Retroceder 10 segundos" />
      <AppButton title={playing ? 'Pausar' : 'Reproducir'} size="sm" variant="secondary" onPress={toggle} />
      <AppButton title="+10" size="sm" variant="secondary" onPress={() => skipBy(10)} accessibilityLabel="Avanzar 10 segundos" />
    </View>
    <View style={styles.speedRow}>
      {AUDIO_PLAYBACK_RATES.map((rate) => (
        <AppButton
          key={rate}
          title={`${rate}x`}
          size="sm"
          variant={playbackRate === rate ? 'primary' : 'secondary'}
          onPress={() => setRate(rate)}
          accessibilityLabel={`Velocidad ${rate}x`}
          accessibilityState={{ selected: playbackRate === rate }}
        />
      ))}
    </View>
  </View>;
}

function RealAudioWaveform({ samples, supported }: { samples: readonly number[]; supported: boolean }) {
  if (!supported) {
    return <AppText tone="inverse" variant="caption" align="center">Forma de onda no disponible en este dispositivo.</AppText>;
  }
  if (samples.length === 0) {
    return <AppText tone="inverse" variant="caption" align="center">La forma de onda aparecerá al reproducir.</AppText>;
  }
  return <View style={styles.waveform} accessibilityLabel="Forma de onda real del audio">
    {samples.map((value, index) => (
      <View key={`${index}-${value.toFixed(2)}`} style={[styles.waveformBar, { height: 8 + value * 42 }]} />
    ))}
  </View>;
}

function MemoryAudioLoading({ width }: { width: number }) {
  return <View style={[styles.page, { width }]}><View style={styles.loading}><ActivityIndicator color={colors.text.inverse} /><AppText tone="inverse">Cargando audio…</AppText></View></View>;
}

/**
 * HONEST FAILURE, and no fake future action: no Save, Share or Export exists in
 * HC2-B, and offering one next to an unplayable file would be a promise the
 * product does not keep yet.
 */
function MemoryAudioFailure({ failure, width, onRetry }: { failure: MemoryMediaFailure; width: number; onRetry: () => void }) {
  const copy = failure === 'access'
    ? 'No pudimos abrir este audio.'
    : 'No pudimos reproducir este audio.';
  return <View style={[styles.failure, { width }]}>
    <HomePlusIcon name="alert-circle-outline" size={34} color={colors.text.inverse} />
    <AppText tone="inverse" align="center">{copy}</AppText>
    <AppButton title="Reintentar" variant="secondary" size="sm" onPress={onRetry} accessibilityLabel="Reintentar cargar este audio" />
  </View>;
}

const styles = StyleSheet.create({
  placeholder: { height: '100%', backgroundColor: '#000000' },
  page: { height: '100%', alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[5], backgroundColor: '#000000' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  identityText: { flex: 1, gap: spacing[1] },
  loading: { alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  trackHit: { width: '100%' },
  track: { height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden', justifyContent: 'center' },
  trackFill: { height: 6, borderRadius: 3, backgroundColor: colors.text.inverse },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  speedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: spacing[2] },
  waveform: { height: 56, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  waveformBar: { width: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.82)' },
  failure: { height: '100%', alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[5] },
});
