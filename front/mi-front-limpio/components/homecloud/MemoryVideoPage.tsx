import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { AppText } from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import { getMemoryOriginalUrl } from '../../services/homecloud/homecloudMemoryOriginal';
import {
  MEMORY_MEDIA_KIND_LABEL,
  MemoryMediaAccess,
  resolveMemoryMediaFailure,
  type MemoryMediaFailure,
} from '../../services/homecloud/homecloudMemoryMediaPlayback';
import { memoryDevTrace } from '../../services/homecloud/homecloudMemoryDiagnostics';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';

/**
 * HC2-B — VIDEO page of the EXISTING Memory Viewer.
 *
 * OWNERSHIP
 * The parent renders `<MemoryVideoPage active={...}>` with the pager's own
 * active flag. When it is false this module renders a LIGHTWEIGHT PLACEHOLDER:
 * no `useVideoPlayer`, no `VideoView`, and — critically — no signed-original
 * request. A pager that mounts several neighbours must not fan out one native
 * player and one signed URL per neighbour.
 *
 * RELEASE
 * `useVideoPlayer` builds the player through `useReleasingSharedObject` and
 * releases it on unmount, so that hook is the ONLY release authority. This
 * component never calls a release method and never touches the player after
 * unmount (a released shared object raises `NotFoundException`). `pause()` is
 * different: it is allowed while the owner is still mounted, and that is
 * exactly how a lifecycle revocation is honoured.
 *
 * NO POSTER, NO TRANSCODING
 * The canonical bytes are consumed through the existing signed-original seam.
 * There is no poster pipeline to fake and no derivative is ever produced, so an
 * unplayable video is a playback limitation, never a reason to rewrite the
 * original.
 */

const LABEL = MEMORY_MEDIA_KIND_LABEL.video;

export function MemoryVideoPage({ memory, accessToken, active, authorized, width }: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  /** This page is the pager's active page: the ONLY page allowed a player. */
  active: boolean;
  /** Global lifecycle intent; `false` means pause, and never auto-resume. */
  authorized: boolean;
  /**
   * HC2-C (A1) — THE PAGER'S OWN PAGE WIDTH.
   *
   * The pager's `getItemLayout` asserts `length === width` for every page, so
   * this page MUST declare exactly that width. Video used to return a plain
   * `height: '100%'` container, which made the physical page narrower than the
   * pager's own arithmetic: `initialScrollIndex`/`scrollToIndex` landed outside
   * the page bounds and the snap no longer satisfied `offset ≈ index * width`.
   * That is why a tapped video was observed handing the Viewer over to a
   * different Memory.
   *
   * No other geometry changes: the video surface still fills its page.
   */
  width: number;
}) {
  if (!active) return <View style={[styles.placeholder, { width }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
  return <ActiveMemoryVideoPage memory={memory} accessToken={accessToken} authorized={authorized} width={width} />;
}

/**
 * Owns the signed-original request for the ACTIVE page, then hands the resolved
 * URL to the component that owns the player. Splitting it this way means the
 * player is constructed exactly once, always with a real source, and never for
 * a page that lost ownership mid-flight.
 */
function ActiveMemoryVideoPage({ memory, accessToken, authorized, width }: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  authorized: boolean;
  width: number;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failure, setFailure] = useState<MemoryMediaFailure | null>(null);
  const access = useRef(new MemoryMediaAccess()).current;

  useEffect(() => {
    const current = access.begin();
    setUri(null);
    setFailure(null);
    if (!accessToken) {
      // Honest: without a token there is no original access at all.
      setFailure('access');
      return () => access.invalidate();
    }
    let mounted = true;
    void getMemoryOriginalUrl(accessToken, memory.id).then((url) => {
      // A result from a superseded generation must not resurrect this page.
      if (!mounted || !access.isCurrent(current)) return;
      setUri(url);
    }).catch(() => {
      if (!mounted || !access.isCurrent(current)) return;
      setFailure('access');
    });
    return () => { mounted = false; access.invalidate(); };
  }, [access, accessToken, memory.id]);

  // HC2-C (A1): EVERY branch declares the pager's width, including the two
  // states the user actually saw at the moment of the reported jump.
  if (failure !== null) return <MemoryVideoFailure failure={failure} width={width} />;
  if (uri === null) return <MemoryVideoLoading width={width} />;
  return <MemoryVideoPlayer key={memory.id} uri={uri} authorized={authorized} width={width} onFailure={setFailure} />;
}

/**
 * The ONLY place a `VideoPlayer` exists. It is mounted only for the active page
 * and only once the canonical original is reachable.
 */
function MemoryVideoPlayer({ uri, authorized, width, onFailure }: {
  uri: string;
  authorized: boolean;
  width: number;
  onFailure: (failure: MemoryMediaFailure) => void;
}) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer({ uri }, (instance) => { instance.pause(); });
  const onFailureRef = useRef(onFailure);
  onFailureRef.current = onFailure;

  useEffect(() => {
    let mounted = true;
    const applyStatus = ({ status }: { status: typeof player.status }) => {
      if (!mounted) return;
      if (status === 'readyToPlay') { setReady(true); return; }
      if (status === 'error') {
        // `unsupported` needs EVIDENCE. The installed `VideoTrack.isSupported`
        // is documented Android-only, so off Android this is deliberately a
        // generic playback failure rather than a guess about the codec.
        const failure = resolveMemoryMediaFailure({
          access: 'ok',
          platform: Platform.OS,
          videoTracks: player.availableVideoTracks.map((track) => ({ isSupported: track.isSupported })),
        });
        // Dev-only and privacy-safe: the KIND of failure, never the raw native
        // message, the URL or any content identity.
        memoryDevTrace('video_player_failed', { kind: 'video', failure });
        onFailureRef.current(failure);
        return;
      }
      setReady(false);
    };
    applyStatus({ status: player.status });
    const subscription = player.addListener('statusChange', applyStatus);
    return () => { mounted = false; subscription.remove(); };
  }, [player]);

  // LIFECYCLE REVOCATION. Pausing happens here because this is the only scope
  // that owns the player. Nothing in this file ever calls `play()`: playback
  // begins only from the native controls, so backgrounding and returning
  // foreground can never resume a video by themselves.
  useEffect(() => {
    if (authorized) return;
    player.pause();
  }, [authorized, player]);

  return <View style={[styles.wrap, { width }]}>
    <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: false }} style={styles.video} accessibilityLabel={`${LABEL} del recuerdo`} />
    {ready ? null : <View pointerEvents="none" style={styles.loadingOverlay}><ActivityIndicator color={colors.text.inverse} /><AppText tone="inverse">Cargando video…</AppText></View>}
  </View>;
}

function MemoryVideoLoading({ width }: { width: number }) {
  return <View style={[styles.wrap, { width }]}><View style={styles.loadingOverlay}><ActivityIndicator color={colors.text.inverse} /><AppText tone="inverse">Cargando video…</AppText></View></View>;
}

/**
 * HONEST FAILURE, and no fake future action: there is deliberately no Save,
 * Share, Export or "open externally" here. Those belong to a later scope, and
 * offering one next to an unplayable file would be a promise the product does
 * not keep yet.
 */
function MemoryVideoFailure({ failure, width }: { failure: MemoryMediaFailure; width: number }) {
  const copy = failure === 'access'
    ? 'No pudimos abrir este video.'
    : failure === 'unsupported'
      ? 'Este video no se puede reproducir en este dispositivo.'
      : 'No pudimos reproducir este video.';
  return <View style={[styles.failure, { width }]}>
    <HomePlusIcon name="alert-circle-outline" size={34} color={colors.text.inverse} />
    <AppText tone="inverse" align="center">{copy}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  placeholder: { height: '100%', backgroundColor: '#000000' },
  wrap: { height: '100%', backgroundColor: '#000000' },
  video: { width: '100%', height: '100%' },
  loadingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: spacing[3], backgroundColor: 'rgba(0,0,0,0.45)' },
  failure: { height: '100%', alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[5] },
});