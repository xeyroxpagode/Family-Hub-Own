import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Keyboard, Linking, ScrollView, StyleSheet, View, type AppStateStatus } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { ActionSheet, AppButton, AppInput, AppText, FilterChip } from '../../components/ui';
import { MemorySemanticDateFields } from '../../components/homecloud/MemorySemanticDateFields';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import { generateMutationId } from '../api';
import { createMemoryIntakeService } from './homecloudMemoryIntakeService';
import { createWrittenMemory } from './homecloudWrittenMemoryService';
import {
  formatMediaCaptureDate,
  memoryRegisterCaptureFields,
  type MediaCaptureMetadata,
} from './homecloudMediaCaptureMetadata';
import {
  emptySemanticDateDraft,
  semanticDateDraftError,
  semanticDateValueFromDraft,
  type SemanticDateDraft,
} from './homecloudSemanticDate';
import type { BinaryMemoryDraft, MemoryIntakeConfig, MemoryIntakeDestination, MemoryIntakeState } from './homecloudMemoryIntakeTypes';
import { MemoryMediaReview } from './MemoryMediaReview';
import { MemoryAudioRecorder, type MemoryAudioRecorderHandle } from './MemoryAudioRecorder';
import { memoryAttemptTrace, memoryDevTrace } from './homecloudMemoryDiagnostics';
import { runtimeTrace } from '../runtimeTrace';
import { MemoryCameraSurface } from './MemoryCameraSurface';
import { MemoryAttemptAuthority, type MemoryAttempt } from './homecloudMemoryAttempt';
import { MemoryAcceptanceLifecycle, MemoryPickerLifecycle } from './homecloudMemoryIntakeLifecycle';

export interface MemoryIntakeProps {
  config: MemoryIntakeConfig;
  onComplete?: (contentId: string) => void;
  /**
   * MO-A2 — a NEUTRAL change signal for the Album destination list.
   *
   * The surface that owns Albums (create / rename / delete) bumps this counter,
   * and intake re-reads its own destinations through the existing service path.
   * Intake owns NO Album management: this is a re-read trigger, not an
   * operation, and it is deliberately not an event bus or a shared store.
   */
  destinationsRevision?: number;
}

type Sheet = 'create' | 'source' | 'camera' | 'binary' | 'recorder' | 'audio-handoff' | 'written' | null;

/**
 * HOMECLOUD_STAGE_A_GALLERY_AUTH_TRIGGER_INSTRUMENTATION
 *
 * The only config fields whose IDENTITY can recreate the service through the
 * `useMemo` below. Reported as NAMES ONLY (never as values) so the diagnostic
 * can explain a `service_created` without ever exposing a token.
 */
const SERVICE_CONFIG_IDENTITY_FIELDS = [
  'householdId',
  'accessToken',
  'capabilities',
  'initialAlbumId',
  'initialAlbumName',
  'intakeSource',
] as const satisfies readonly (keyof MemoryIntakeConfig)[];

let nextMemoryIntakeInstanceId = 1;

/**
 * Every reason the binary draft can disappear. There is NO path that clears it
 * without naming one, so a lost draft is always traceable to a cause.
 */
type BinaryDraftClearReason = 'accepted' | 'completed' | 'review_close' | 'focus_lost' | 'rerecord';

/**
 * HomeCloud STAGE 4C.1.1 — Memory create runtime recovery.
 *
 * PICKER REUSE (the confirmed runtime bug)
 * -----------------------------------------
 * ROOT CAUSE was an illegal presentation order: `chooseMedia` dismissed this
 * component's `ActionSheet` Modal and then presented the native gallery picker
 * in the same JS turn. iOS only allows presenting from the top-most presented
 * controller, so the native presentation was dropped and
 * `launchImageLibraryAsync` never settled. Because the only "picker is busy"
 * guard was the derived `state.status === 'picking'` (set by the service and
 * cleared only on settle), a dropped presentation left that status stuck and the
 * `+` trigger permanently `disabled` — the picker could never be reopened.
 *
 * The fix is behavioural, not a timer: the create sheet now STAYS PRESENTED
 * while the native picker is up (the pattern already proven by
 * `FileIntake.handlePickFile`), so the presentation is always legal, and the
 * pending guard is owned locally by `pickingRef` and released in a `finally` on
 * every exit path. On top of that, CLOSING the create sheet is an explicit,
 * user-driven reset that also releases the guard — so no state can ever brick
 * Create. `pickerAttemptRef` gives each attempt ownership so a late resolve
 * can never overwrite a newer draft, and a double tap cannot open two pickers.
 *
 * RESET CONTRACT
 * - SUCCESS: draft, picker guard and transient state are cleared; Create is
 *   immediately reusable.
 * - CANCEL: the create sheet stays open with the guard released, so the very
 *   same button opens the picker again; an abandoned artifact copy is deleted.
 * - ERROR: the Review keeps the draft and the error so Retry works, and the
 *   picker guard is released regardless.
 * - CLOSE: every transient flag is dropped and the guard released; Create is
 *   ready to open again without remounting anything.
 *
 * ONE NATIVE MODAL HOST for source + binary
 * ------------------------------------------
 * ROOT CAUSE of "the picked video never reaches the Review" was a dismiss/present
 * race, proven on device: a `source` Modal and a separate `binary` Modal plus the
 * native gallery picker meant the flow had to dismiss one and present the next
 * inside the same turn, and iOS silently dropped it. The draft existed, but no
 * Review was ever rendered.
 *
 * The fix is structural, not a timer or a callback: `source` and `binary` are
 * CONTENT of a single Modal host that stays presented across
 * source → native gallery picker → binary, so there is no second native
 * presentation to race and no `onDismiss` is ever an authority. Sheet visibility
 * is `visible` and nothing else; `handleSourceBinaryRequestClose` is the single
 * close authority, and its policy varies per content (see below).
 */
export function MemoryIntake({ config, onComplete, destinationsRevision }: MemoryIntakeProps) {
  const isFocused = useIsFocused();
  const { householdId, accessToken, capabilities, initialAlbumId, initialAlbumName, intakeSource } = config;
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const getAccessToken = useCallback(() => accessTokenRef.current || null, []);
  const [state, setState] = useState<MemoryIntakeState>({ status: 'idle' });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [albums, setAlbums] = useState<MemoryIntakeDestination[]>([]);
  const [binaryDraft, setBinaryDraft] = useState<BinaryMemoryDraft | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<MemoryAttempt | null>(null);
  const [pendingAudioDraft, setPendingAudioDraft] = useState<{ draft: BinaryMemoryDraft; attempt: MemoryAttempt } | null>(null);
  const [binaryCaption, setBinaryCaption] = useState('');
  const [binaryAlbumId, setBinaryAlbumId] = useState<string | null>(initialAlbumId ?? null);
  const [picking, setPicking] = useState(false);
  const [pickerFailure, setPickerFailure] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [submitFailure, setSubmitFailure] = useState<string | null>(null);
  const [writtenText, setWrittenText] = useState('');
  const [writtenDate, setWrittenDate] = useState<SemanticDateDraft>(emptySemanticDateDraft);
  const [writtenAlbumId, setWrittenAlbumId] = useState<string | null>(initialAlbumId ?? null);
  const [writtenSubmitting, setWrittenSubmitting] = useState(false);
  const [writtenError, setWrittenError] = useState<string | null>(null);
  const writtenRequestId = useRef<string | null>(null);
  const notifiedContentId = useRef<string | null>(null);
  // Local owner of the pending picker guard. A ref (not derived state) so a
  // double tap in the same tick is refused synchronously.
  const pickingRef = useRef(false);
  // Synchronous per-review acceptance guard. React state cannot protect two
  // presses that arrive before the first render commits.
  const acceptedDraftRef = useRef<string | null>(null);
  const acceptingRef = useRef(false);
  // Attempt ownership: only the newest attempt may commit its draft.
  const pickerAttemptRef = useRef(0);
  const pickerLifecycleRef = useRef(new MemoryPickerLifecycle());
  const acceptanceLifecycleRef = useRef(new MemoryAcceptanceLifecycle());
  const activePickerMediaAttemptRef = useRef<MemoryAttempt | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const mountedRef = useRef(true);
  const attemptAuthorityRef = useRef(new MemoryAttemptAuthority());
  const recorderAttemptRef = useRef<MemoryAttempt | null>(null);
  const recorderHandleRef = useRef<MemoryAudioRecorderHandle | null>(null);
  const setRecorderHandle = useCallback((handle: MemoryAudioRecorderHandle | null) => { recorderHandleRef.current = handle; }, []);

  const service = useMemo(() => createMemoryIntakeService({
    householdId,
    accessToken: getAccessToken() ?? '',
    capabilities,
    initialAlbumId,
    initialAlbumName,
    intakeSource,
    getAccessToken,
  }), [
    householdId,
    getAccessToken,
    capabilities,
    initialAlbumId,
    initialAlbumName,
    intakeSource,
  ]);

  // Latest-value mirrors: they let UNMOUNT-only diagnostics report the real
  // current service/state/draft without re-creating the mount effect.
  const serviceRef = useRef(service);
  const stateRef = useRef(state);
  const binaryDraftRef = useRef<BinaryMemoryDraft | null>(binaryDraft);
  const reviewAttemptRef = useRef<MemoryAttempt | null>(reviewAttempt);
  const configRef = useRef<MemoryIntakeConfig>(config);
  // HOMECLOUD_STAGE_A_GALLERY_AUTH_TRIGGER_INSTRUMENTATION — identity of this
  // mount, and the config that produced each service instance, so a
  // `service_created` can name the fields that actually changed instead of
  // asserting a hardcoded cause.
  const instanceIdRef = useRef<string | null>(null);
  if (instanceIdRef.current === null) instanceIdRef.current = `memory-intake-${nextMemoryIntakeInstanceId++}`;
  const instanceId = instanceIdRef.current;
  const serviceConfigRef = useRef<MemoryIntakeConfig | null>(null);
  const serviceCreateCountRef = useRef(0);

  useEffect(() => {
    serviceRef.current = service;
    stateRef.current = state;
    binaryDraftRef.current = binaryDraft;
    reviewAttemptRef.current = reviewAttempt;
    // Declared BEFORE the `[service]` effect on purpose: the diagnostic there
    // must read the config that PRODUCED this service instance, and it must
    // never add `config` to its own dependencies (the parent builds that
    // object inline, so it changes identity on every render and would
    // re-subscribe the service continuously).
    configRef.current = config;
  });

  useEffect(() => {
    const attemptAuthority = attemptAuthorityRef.current;
    const pickerLifecycle = pickerLifecycleRef.current;
    const acceptanceLifecycle = acceptanceLifecycleRef.current;
    mountedRef.current = true;
    runtimeTrace('memory_intake_mount', { instanceId });
    return () => {
      mountedRef.current = false;
      attemptAuthority.dispose();
      // Unmount must never leave a pending guard behind.
      pickerLifecycle.invalidate();
      acceptanceLifecycle.reset();
      pickingRef.current = false;
      // `hasCurrentJobReference` (not `hasActiveJob`) is the honest field: it
      // asks whether this service still holds a reference to a memory job at
      // all — the lost draft is lost regardless of that job's state.
      runtimeTrace('memory_intake_unmount', {
        instanceId,
        source: binaryDraftRef.current?.source ?? null,
        status: stateRef.current.status,
        hasDraft: binaryDraftRef.current !== null,
        attemptLabel: reviewAttemptRef.current?.label ?? null,
        hasCurrentJobReference: serviceRef.current.hasActiveJob(),
      });
    };
  }, [instanceId]);

  useEffect(() => {
    let activeSubscription = true;
    const unsubscribe = service.subscribe(setState);
    // HOMECLOUD_STAGE_A_GALLERY_AUTH_TRIGGER_INSTRUMENTATION: report WHAT
    // changed, not a hardcoded cause. The previous `reason:
    // 'config_identity_changed'` was printed on EVERY mount and identified
    // nothing, so it could never be the explanation of an unmount.
    const previousConfig = serviceConfigRef.current;
    const activeConfig = configRef.current;
    const changedFields = previousConfig === null
      ? []
      : SERVICE_CONFIG_IDENTITY_FIELDS.filter((field) => previousConfig[field] !== activeConfig[field]);
    const isFirstMount = serviceCreateCountRef.current === 0;
    serviceCreateCountRef.current += 1;
    serviceConfigRef.current = activeConfig;

    runtimeTrace('service_created', {
      isFirstMount,
      changedFields: [...changedFields],
    });

    void service.reloadDestinations().then(() => { if (activeSubscription) setAlbums(service.getAvailableDestinations()); });
    void service.recover();
    return () => { activeSubscription = false; unsubscribe(); };
  }, [service]);

  /**
   * MO-A2 — the Album destination list must never go stale while this surface
   * stays mounted. The destinations are re-read through the SAME service path on
   * three honest triggers:
   *   1. this sheet is about to open (see `openCreate` / `openWritten`);
   *   2. the service instance is (re)created;
   *   3. the Albums owner reports that a destination changed.
   *
   * It is a re-read of existing destinations, never a second Albums fetcher and
   * never an Album mutation from here.
   */
  const reloadDestinations = useCallback(() => {
    void service.reloadDestinations().then(() => {
      if (mountedRef.current) setAlbums(service.getAvailableDestinations());
    });
  }, [service]);

  useEffect(() => {
    if (!destinationsRevision) return;
    reloadDestinations();
  }, [destinationsRevision, reloadDestinations]);

  /** Drop the picked-but-never-uploaded copy so CANCEL/CLOSE do not leak it. */
  const discardDraftArtifact = useCallback((draft: BinaryMemoryDraft | null) => {
    if (!draft) return;
    void import('./homecloudMemoryPicker')
      .then(({ discardMemoryMedia }) => discardMemoryMedia(draft.artifact))
      .catch(() => {
        // Best effort: a leftover copy is a storage concern, never a failure.
      });
  }, []);

  /** SUCCESS contract: draft + picker transient state cleared, Create reusable. */
  const clearBinaryDraft = useCallback((reason: BinaryDraftClearReason) => {
    const draft = binaryDraftRef.current;
    memoryDevTrace('draft_clear', { reason, source: draft?.source ?? null, mimeType: draft?.artifact.mimeType ?? null });
    setBinaryDraft(null);
    acceptedDraftRef.current = null;
    acceptanceLifecycleRef.current.reset();
    setReviewAttempt(null);
    setSubmitFailure(null);
    setBinaryCaption('');
    setBinaryAlbumId(initialAlbumId ?? null);
  }, [initialAlbumId]);

  useEffect(() => {
    if (state.status !== 'completed' || !state.contentId || notifiedContentId.current === state.contentId) return;
    notifiedContentId.current = state.contentId;
    // PERSISTENCE RESULT (register → upload → verify → finalize produced an
    // active content) is FINAL and is reported FIRST, before anything local is
    // torn down. LOCAL MEDIA CLEANUP follows and can never be surfaced as
    // "No pudimos guardar": this path never calls the service, so it can never
    // emit a `failed` state over a successful save.
    memoryDevTrace('completed_cleanup', { contentId: state.contentId, reason: 'finalize_success' });
    onComplete?.(state.contentId);
    setSheet(null);
    clearBinaryDraft('completed');
  }, [clearBinaryDraft, onComplete, state.contentId, state.status]);

  const active = ['preparing', 'uploading', 'verifying', 'finalizing'].includes(state.status);
  /**
   * REVIEW_READY — the ONE save-enable contract for every binary source
   * (gallery image, gallery video, camera, recorder): a durable draft exists and
   * no submit is in flight. Source, kind and MIME are deliberately NOT part of
   * it, so no source can end up with a Save button the others do not have.
   */
  const saveDisabled = !binaryDraft || active || accepting;

  // The trigger depends on the LOCAL guard only. A remote status that could be
  // orphaned must never be able to disable the only entry point.
  const triggerDisabled = !capabilities.contribute || picking || accepting;
  // Owned by the service, not by local state: `pickMemory` clears the previous
  // error on every new attempt, so a failure is shown exactly where it happened
  // (the create sheet) and can never leak into the next Review.
  const pickingError = pickerFailure ?? (state.status === 'failed' ? state.error ?? 'No pudimos seleccionar la foto o el video.' : null);

  const runPicker = useCallback(async (source: 'gallery' | 'audio-import', pick: (attempt: MemoryAttempt) => Promise<BinaryMemoryDraft | null>) => {
    // TEMPORARY D6: a ref without lifecycle ownership is stale by definition.
    if (pickingRef.current && !pickerLifecycleRef.current.isBusy()) pickingRef.current = false;
    const ticket = pickerLifecycleRef.current.begin(source);
    if (ticket === null) {
      runtimeTrace('picker_guard_reject', { entryPath: source, phase: 'begin', pickingRef: pickingRef.current, picking, attemptStillCurrent: true });
      return;
    }
    pickingRef.current = true;
    const attempt = ticket.attempt;
    pickerAttemptRef.current = ticket.attempt;
    const mediaAttempt = attemptAuthorityRef.current.begin(source, source === 'gallery' ? 'image' : 'audio');
    activePickerMediaAttemptRef.current = mediaAttempt;
    setPickerFailure(null);
    setPicking(true);
    runtimeTrace('picker_request', { requestId: ticket.requestId, attempt, entryPath: source, phase: 'launch', pickingRef: true, picking: true, appState: AppState.currentState ?? null });
    Keyboard.dismiss();
    // The create sheet deliberately STAYS presented while the native picker is
    // up: dismissing it first is what made the presentation illegal on iOS.
    try {
      const draft = await pick(mediaAttempt);
      if (!draft) return;
      if (!mountedRef.current || pickerAttemptRef.current !== attempt || !attemptAuthorityRef.current.owns(mediaAttempt)) return;
      setBinaryDraft(draft);
      acceptedDraftRef.current = null;
      setReviewAttempt(mediaAttempt);
      setBinaryCaption('');
      setBinaryAlbumId(initialAlbumId ?? null);
      setSheet('binary');
    } catch (error) {
      if (pickerAttemptRef.current === attempt && attemptAuthorityRef.current.owns(mediaAttempt)) {
        setPickerFailure('No pudimos abrir el selector. Podés volver a intentarlo o cerrar esta ventana.');
      }
      runtimeTrace('picker_settled', {
        requestId: ticket.requestId, attempt, entryPath: source, phase: 'error', pickingRef: pickingRef.current,
        picking, attemptStillCurrent: pickerAttemptRef.current === attempt, outcomeKind: 'error',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 160),
      });
    } finally {
      const settled = pickerLifecycleRef.current.settle(ticket);
      const attemptStillCurrent = settled.kind === 'current' && pickerAttemptRef.current === attempt;
      runtimeTrace(settled.kind === 'current' ? 'picker_settled' : 'picker_stale_settle', {
        requestId: ticket.requestId, attempt, entryPath: source, phase: 'finally', pickingRef: pickingRef.current,
        picking, attemptStillCurrent, appState: AppState.currentState ?? null, durationMs: settled.durationMs,
        outcomeKind: settled.kind,
      });
      if (attemptStillCurrent) {
        pickingRef.current = false;
        if (activePickerMediaAttemptRef.current?.id === mediaAttempt.id) activePickerMediaAttemptRef.current = null;
        if (mountedRef.current) setPicking(false);
      }
    }
  }, [initialAlbumId, picking]);

  const chooseMedia = useCallback(() => runPicker('gallery', (attempt) => service.pickMemory(attempt, (candidate) => attemptAuthorityRef.current.owns(candidate))), [runPicker, service]);
  const chooseAudio = useCallback(() => runPicker('audio-import', (attempt) => service.pickAudio(attempt, (candidate) => attemptAuthorityRef.current.owns(candidate))), [runPicker, service]);

  const acceptRecordedAudio = useCallback((draft: BinaryMemoryDraft, attempt: MemoryAttempt) => {
    if (!attemptAuthorityRef.current.owns(attempt)) return;
    // Deliberate empty handoff render: the recorder's ownership ends BEFORE the
    // playback hook is mounted, so the Review never coexists with a recorder.
    memoryAttemptTrace(attempt, 'recorder_ownership_released', { uri: draft.artifact.localUri.split(':', 1)[0] });
    setPendingAudioDraft({ draft, attempt }); setSheet('audio-handoff');
  }, []);

  useEffect(() => {
    if (sheet !== 'audio-handoff' || !pendingAudioDraft) return;
    if (!attemptAuthorityRef.current.owns(pendingAudioDraft.attempt)) {
      memoryDevTrace('review_close_requested', { reason: 'audio_handoff_attempt_lost', source: pendingAudioDraft.draft.source });
      setPendingAudioDraft(null); setSheet('create'); return;
    }
    setBinaryDraft(pendingAudioDraft.draft); setReviewAttempt(pendingAudioDraft.attempt); setBinaryCaption(''); setBinaryAlbumId(initialAlbumId ?? null); setPendingAudioDraft(null); setSheet('binary');
  }, [initialAlbumId, pendingAudioDraft, sheet]);

  /** CLOSE contract: nothing transient survives, Create is ready to reopen. */
  const closeCreate = useCallback(() => {
    memoryDevTrace('review_close_requested', { reason: 'create_sheet_close', sheet: 'create' });
    pickerAttemptRef.current += 1;
    pickerLifecycleRef.current.invalidate();
    attemptAuthorityRef.current.invalidate();
    activePickerMediaAttemptRef.current = null;
    pickingRef.current = false;
    setPicking(false);
    setPickerFailure(null);
    service.dismiss();
setSheet(null);
  }, [service]);

  // TEMPORARY D6 MONITORING. An AppState transition ALONE is not evidence that
  // a native picker is stale: presenting an iOS/native picker legitimately moves
  // the app out of `active`. Invalidating ownership here would close LEGITIMATE
  // presentations, so this listener observes and traces ONLY. Ownership ends
  // exclusively on an established boundary: the Create flow closed, the
  // component unmounted, household/scope invalidation, a newer generation
  // superseded it, or the picker Promise settled.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      const ticket = pickerLifecycleRef.current.active();
      if (!ticket) return;
      runtimeTrace('picker_appstate_observed', {
        requestId: ticket.requestId, attempt: ticket.attempt, entryPath: ticket.entryPath,
        phase: `${previousState}->${nextState}`, pickingRef: pickingRef.current,
        attemptStillCurrent: pickerAttemptRef.current === ticket.attempt, appState: nextState,
      });
    });
    return () => subscription.remove();
  }, []);

  const closeReview = useCallback(() => {
    const hasActiveJob = service.hasActiveJob();
    memoryDevTrace('review_close_requested', { reason: 'user_close', hasActiveJob, source: binaryDraft?.source ?? null, status: stateRef.current.status });
    // Before createJob the draft belongs to this sheet. Once a durable job
    // exists, recovery owns the original and closing UI must not delete it.
    if (!hasActiveJob) discardDraftArtifact(binaryDraft);
    clearBinaryDraft('review_close');
    // CLOSE means the Memory was abandoned, so its error must not survive into
    // the next flow. The durable job stays in the shared store untouched, and
    // failed jobs are never auto-resumed by recovery (retry stays explicit).
    service.dismiss();
    attemptAuthorityRef.current.invalidate(reviewAttempt ?? undefined);
    setSheet(null);
  }, [binaryDraft, clearBinaryDraft, discardDraftArtifact, reviewAttempt, service]);

  const openRecorder = useCallback(() => {
    const attempt = attemptAuthorityRef.current.begin('audio-record', 'audio');
    recorderAttemptRef.current = attempt;
    setSheet('recorder');
  }, []);

  const openCamera = useCallback(() => { setSheet('camera'); }, []);

  const acceptCamera = useCallback((draft: BinaryMemoryDraft, attempt: MemoryAttempt) => {
    if (!attemptAuthorityRef.current.owns(attempt)) return;
    setBinaryDraft(draft); setReviewAttempt(attempt); setBinaryCaption(''); setBinaryAlbumId(initialAlbumId ?? null); setSheet('binary');
  }, [initialAlbumId]);

  const closeCamera = useCallback(() => { attemptAuthorityRef.current.invalidate(); setSheet('create'); }, []);

  /**
   * SINGLE NATIVE MODAL HOST — the close policy for the source+binary host.
   *
   * `source` and `binary` are CONTENT of one Modal instance, so moving between
   * them is a content transition and never a dismissal of the flow: this
   * handler is reached only from the real close affordances (X, backdrop and
   * the Android hardware back), which ActionSheet funnels through
   * `onRequestClose`.
   * - SOURCE: back to create.
   * - BINARY, idle: abandon the review.
   * - BINARY, submitting: `closeDisabled` already blocks this, and the guard
   *   below is the second line of defence against discarding a live draft.
   */
  const handleSourceBinaryRequestClose = useCallback(() => {
    if (sheet === 'source') {
      setSheet('create');
      return;
    }
    if (sheet === 'binary' && !active && !accepting) {
      closeReview();
    }
  }, [accepting, active, closeReview, sheet]);

  /**
   * Closing the recorder sheet from outside the recorder (close button,
   * backdrop). The recorder finishes its OWN teardown — including stopping an
   * in-flight native recording while `useAudioRecorder` still owns a valid
   * object — and leaves the sheet through `onCancel`. The host must never
   * unmount the recorder directly, or the native object would be released with
   * a recording still running and no way left to read its URI.
   */
  const abandonRecorder = useCallback((reason: string) => {
    memoryDevTrace('review_close_requested', { reason, sheet: 'recorder' });
    const handle = recorderHandleRef.current;
    if (!handle) { attemptAuthorityRef.current.invalidate(recorderAttemptRef.current ?? undefined); setSheet('create'); return; }
    handle.abandon();
  }, []);

  useEffect(() => {
    if (isFocused) return;
    memoryDevTrace('focus_lost', {
      reason: 'navigation_blur',
      hasActiveJob: service.hasActiveJob(),
      hasDraft: binaryDraft !== null,
      source: binaryDraft?.source ?? null,
      status: stateRef.current.status,
    });
    pickerAttemptRef.current += 1; pickerLifecycleRef.current.invalidate(); pickingRef.current = false; attemptAuthorityRef.current.invalidate();
    activePickerMediaAttemptRef.current = null;
    setPicking(false); setPendingAudioDraft(null);
    if (!service.hasActiveJob() && !acceptingRef.current) discardDraftArtifact(binaryDraft);
    clearBinaryDraft('focus_lost'); service.dismiss(); setSheet(null);
  }, [binaryDraft, clearBinaryDraft, discardDraftArtifact, isFocused, service]);

  const reRecordAudio = useCallback(() => {
    if (!binaryDraft || binaryDraft.source !== 'audio-recorder' || service.hasActiveJob()) return;
    memoryDevTrace('draft_clear', { reason: 'rerecord', source: binaryDraft.source });
    discardDraftArtifact(binaryDraft);
    clearBinaryDraft('rerecord');
    service.dismiss();
    const attempt = attemptAuthorityRef.current.begin('audio-record', 'audio'); recorderAttemptRef.current = attempt; setSheet('recorder');
  }, [binaryDraft, clearBinaryDraft, discardDraftArtifact, service]);

  const submitBinary = useCallback(async () => {
    const draftKey = reviewAttempt?.id ?? binaryDraft?.artifact.localUri;
    if (!binaryDraft || active || !draftKey || acceptedDraftRef.current === draftKey || !acceptanceLifecycleRef.current.begin(draftKey)) {
      runtimeTrace('intake_submit_rejected', { phase: 'guard', outcomeKind: 'busy_or_invalid', pickingRef: pickingRef.current, picking });
      return;
    }
    acceptedDraftRef.current = draftKey;
    acceptingRef.current = true;
    setAccepting(true);
    setSubmitFailure(null);
    const capture = binaryDraft.capture;
    if (reviewAttempt) memoryAttemptTrace(reviewAttempt, 'submit', { mimeType: binaryDraft.artifact.mimeType });
    else memoryDevTrace('submit_press', { source: binaryDraft.source, mimeType: binaryDraft.artifact.mimeType });
    let accepted = false;
    try {
      const acceptedJobId = await service.createBinaryMemory(binaryDraft, {
        caption: binaryCaption.trim() || null,
        initialAlbumId: binaryAlbumId,
        ...memoryRegisterCaptureFields(capture),
      }, reviewAttempt ?? undefined);
      if (!acceptedJobId) {
        runtimeTrace('intake_submit_rejected', { phase: 'service', outcomeKind: 'not_accepted', pickingRef: pickingRef.current, picking });
        return;
      }
      accepted = true;
      memoryDevTrace('review_close_requested', { reason: 'durable_acceptance', jobId: acceptedJobId, source: binaryDraft.source });
      // Ownership transferred to the durable job. Clear UI-only references only:
      // never discard the artifact and never cancel/dismiss the accepted job.
      clearBinaryDraft('accepted');
      attemptAuthorityRef.current.invalidate(reviewAttempt ?? undefined);
      if (mountedRef.current) setSheet(null);
    } catch (error) {
      setSubmitFailure('No pudimos guardar este recuerdo. Podés volver a intentarlo o cerrar esta ventana.');
      runtimeTrace('intake_submit_rejected', {
        phase: 'exception', outcomeKind: 'error', pickingRef: pickingRef.current, picking,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 160),
      });
    } finally {
      acceptanceLifecycleRef.current.settle(draftKey, accepted);
      acceptingRef.current = false;
      if (!accepted) acceptedDraftRef.current = null;
      if (mountedRef.current) setAccepting(false);
    }
  }, [active, binaryAlbumId, binaryCaption, binaryDraft, clearBinaryDraft, picking, reviewAttempt, service]);

  const submitWritten = useCallback(async () => {
    if (writtenSubmitting || !writtenText.trim() || semanticDateDraftError(writtenDate)) return;
    setWrittenSubmitting(true);
    setWrittenError(null);
    if (!writtenRequestId.current) writtenRequestId.current = generateMutationId();
    try {
      Keyboard.dismiss();
      const date = semanticDateValueFromDraft(writtenDate);
      const content = await createWrittenMemory(config.accessToken, {
        text: writtenText,
        initialAlbumId: writtenAlbumId,
        intakeRequestId: writtenRequestId.current,
        ...date,
      });
      writtenRequestId.current = null;
      setSheet(null);
      setWrittenText('');
      setWrittenDate(emptySemanticDateDraft());
      onComplete?.(content.id);
    } catch (error) {
      setWrittenError(error instanceof Error ? error.message : 'No pudimos guardar este recuerdo.');
    } finally {
      setWrittenSubmitting(false);
    }
  }, [config.accessToken, onComplete, writtenAlbumId, writtenDate, writtenSubmitting, writtenText]);

const openWritten = () => {
    Keyboard.dismiss();
    setWrittenText('');
    setWrittenDate(emptySemanticDateDraft());
    setWrittenAlbumId(initialAlbumId ?? null);
    setWrittenError(null);
    writtenRequestId.current = null;
    reloadDestinations();
    setSheet('written');
  };

  const openCreate = useCallback(() => {
    // Starting a new draft detaches presentation from any previous accepted
    // job. Execution remains owned by the household coordinator.
    service.dismiss();
    setPickerFailure(null);
    reloadDestinations();
    setSheet('create');
  }, [reloadDestinations, service]);

  return (
    <>
      <AppButton
        variant="icon"
        size="sm"
        onPress={openCreate}
        disabled={triggerDisabled}
        accessibilityLabel="Crear recuerdo"
      >
        <HomePlusIcon name="add" size={24} color={colors.brand} />
      </AppButton>

      <ActionSheet visible={sheet === 'create'} title="Guardar un recuerdo" onRequestClose={closeCreate} size="content">
        <View style={styles.actions}>
          <AppButton title="Capturar momento" disabled={picking} onPress={openCamera} />
          <AppButton title="Elegir foto/video/audio" variant="secondary" disabled={picking} onPress={() => setSheet('source')} />
          <AppButton title="Grabar audio" variant="secondary" disabled={picking} onPress={openRecorder} />
          <AppButton title="Escribir un recuerdo" variant="secondary" onPress={openWritten} disabled={picking} />
          {pickingError ? (
            <View style={styles.error}>
              <AppText variant="bodySmall" tone="danger">{pickingError}</AppText>
              {state.permissionDenied && state.canAskAgain === false ? <AppButton title="Abrir configuración" size="sm" variant="secondary" onPress={() => void Linking.openSettings()} /> : null}
            </View>
          ) : null}
        </View>
      </ActionSheet>

      {/*
       * SINGLE NATIVE MODAL HOST for source + binary.
       *
       * One Modal instance stays presented across
       * source → native gallery picker → binary. Only title, body, footer and
       * close policy change. That is what makes the picker presentation legal
       * on iOS (presenting from an already-presented host) and it is why there
       * is no dismiss/present race and no `onDismiss` authority anywhere in
       * this flow: the host's visibility is `visible`, nothing else.
       */}
      <ActionSheet
        visible={sheet === 'source' || sheet === 'binary'}
        title={sheet === 'binary' ? 'Revisar recuerdo' : 'Elegir contenido'}
        subtitle={sheet === 'binary' && binaryDraft ? formatMediaCaptureDate(binaryDraft.capture) : undefined}
        onRequestClose={handleSourceBinaryRequestClose}
        closeDisabled={sheet === 'binary' && (active || accepting)}
        size={sheet === 'binary' ? 'scrollable-content' : 'content'}
        keyboardAware={sheet === 'binary'}
        footer={sheet === 'binary' ? (
          <AppButton
            title={accepting ? 'Guardando…' : binarySubmitLabel(state.status)}
            loading={active || accepting}
            disabled={saveDisabled}
            onPress={() => { Keyboard.dismiss(); void submitBinary(); }}
          />
        ) : undefined}
      >
        {sheet === 'binary' ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.form}
          >
            {binaryDraft ? <MemoryMediaReview draft={binaryDraft} attempt={reviewAttempt ?? undefined} /> : null}
            <MemoryCaptureSummary capture={binaryDraft?.capture} />
            {binaryDraft?.source === 'audio-recorder' && state.status !== 'failed' ? <AppButton title="Volver a grabar" size="sm" variant="secondary" disabled={active} onPress={reRecordAudio} /> : null}
            <AppInput
              label="Texto (opcional)"
              value={binaryCaption}
              onChangeText={setBinaryCaption}
              editable={!active}
              placeholder="Contá algo sobre este momento…"
              variant="multiline"
              returnKeyType="done"
              blurOnSubmit
            />
            <MemoryAlbumSelector albums={albums} value={binaryAlbumId} onChange={setBinaryAlbumId} disabled={active} invalidAlbum={state.invalidAlbum === true} />
            {state.status === 'failed' || submitFailure ? (
              <View style={styles.error}>
                <AppText variant="bodySmall" tone="danger">{submitFailure ?? state.error ?? 'No pudimos guardar este recuerdo.'}</AppText>
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <View style={styles.actions}>
            <AppButton title={picking ? 'Abriendo…' : 'Fotos y videos'} loading={picking} disabled={picking} onPress={() => void chooseMedia()} />
            <AppButton title="Audio" variant="secondary" disabled={picking} onPress={() => void chooseAudio()} />
            <AppButton title="Volver" variant="ghost" disabled={picking} onPress={() => setSheet('create')} />
            {pickingError ? <View style={styles.error}><AppText variant="bodySmall" tone="danger">{pickingError}</AppText>{state.permissionDenied && state.canAskAgain === false ? <AppButton title="Abrir configuración" size="sm" variant="secondary" onPress={() => void Linking.openSettings()} /> : null}</View> : null}
          </View>
        )}
      </ActionSheet>

      <ActionSheet visible={sheet === 'recorder'} title="Grabar audio" onRequestClose={() => abandonRecorder('recorder_sheet_dismissed')} size="content">
        {sheet === 'recorder' && recorderAttemptRef.current ? <MemoryAudioRecorder attempt={recorderAttemptRef.current} ownsAttempt={(attempt) => attemptAuthorityRef.current.owns(attempt)} abandonRef={setRecorderHandle} onReady={acceptRecordedAudio} onCancel={() => { attemptAuthorityRef.current.invalidate(recorderAttemptRef.current ?? undefined); setSheet('create'); }} /> : <View />}
      </ActionSheet>

      {sheet === 'camera' ? <MemoryCameraSurface onClose={closeCamera} beginAttempt={(kind) => attemptAuthorityRef.current.begin('camera', kind)} ownsAttempt={(attempt) => attemptAuthorityRef.current.owns(attempt)} onUse={acceptCamera} /> : null}

      <ActionSheet
        visible={sheet === 'written'}
        title="Escribir un recuerdo"
        onRequestClose={() => { if (!writtenSubmitting) setSheet(null); }}
        closeDisabled={writtenSubmitting}
        size="scrollable-content"
        keyboardAware
        footer={(
          <AppButton
            title={writtenSubmitting ? 'Guardando…' : 'Guardar recuerdo'}
            loading={writtenSubmitting}
            disabled={!writtenText.trim() || writtenSubmitting || Boolean(semanticDateDraftError(writtenDate))}
            onPress={() => void submitWritten()}
          />
        )}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.form}
        >
          <AppInput
            label="Recuerdo"
            value={writtenText}
            onChangeText={(text) => { setWrittenText(text); setWrittenError(null); }}
            editable={!writtenSubmitting}
            autoFocus
            placeholder="Escribí el momento que quieren conservar…"
            variant="multiline"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => void submitWritten()}
          />
          <MemorySemanticDateFields value={writtenDate} onChange={setWrittenDate} disabled={writtenSubmitting} />
          <MemoryAlbumSelector albums={albums} value={writtenAlbumId} onChange={setWrittenAlbumId} disabled={writtenSubmitting} invalidAlbum={state.invalidAlbum === true} />
          {writtenError ? <AppText variant="bodySmall" tone="danger">{writtenError}</AppText> : null}
        </ScrollView>
      </ActionSheet>
    </>
  );
}

/**
 * Informational, non-interactive summary of the semantic date the gallery
 * already knows. A photo/video does NOT get asked to grade its own precision:
 * there is no "exact / month-year / year / no date" choice here, only the
 * honest result ("12 ene 2024" or "Sin fecha").
 */
function MemoryCaptureSummary({ capture }: { capture: MediaCaptureMetadata | undefined }) {
  return (
    <View style={styles.captureSummary} accessibilityLabel={`Fecha del recuerdo: ${formatMediaCaptureDate(capture ?? { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' })}`}>
      <AppText variant="caption" tone="secondary" weight="700">{'Fecha'}</AppText>
      <AppText variant="bodySmall" tone={capture?.capturePrecision === 'exact' ? 'primary' : 'secondary'}>
        {formatMediaCaptureDate(capture ?? { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' })}
      </AppText>
      <AppText variant="caption" tone="tertiary">
        {capture?.capturePrecision === 'exact'
          ? 'Fecha obtenida de la captura o de la metadata del archivo.'
          : 'Este archivo no trae fecha, así que queda como Sin fecha.'}
      </AppText>
    </View>
  );
}

function MemoryAlbumSelector({ albums, value, onChange, disabled, invalidAlbum }: {
  albums: MemoryIntakeDestination[];
  value: string | null;
  onChange: (albumId: string | null) => void;
  disabled: boolean;
  /**
   * MO-A2 — an inherited / selected Album that no longer exists.
   *
   * It is SURFACED, never silently retargeted to "Sin álbum" and never silently
   * saved into root: the user decides, and the transition to "Sin álbum" is an
   * explicit action on the chip below.
   */
  invalidAlbum?: boolean;
}) {
  return (
    <View style={styles.albumSection}>
      <AppText variant="caption" tone="secondary" weight="700">{'Álbum (opcional)'}</AppText>
      {invalidAlbum ? (
        <AppText variant="caption" tone="danger">
          {'El álbum que elegiste ya no está disponible. Podés guardarlo sin álbum.'}
        </AppText>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albumList}>
        {albums.length === 0 ? <FilterChip label="Sin álbum" selected disabled={disabled} /> : albums.map((album) => {
          const albumId = album.id === 'root' ? null : album.id;
          return <FilterChip key={album.id} label={album.id === 'root' ? 'Sin álbum' : album.name} selected={value === albumId} disabled={disabled} onPress={() => onChange(albumId)} />;
        })}
      </ScrollView>
    </View>
  );
}

function binarySubmitLabel(status: MemoryIntakeState['status']): string {
  if (status === 'preparing') return 'Guardando…';
  if (status === 'uploading') return 'Subiendo…';
  if (status === 'verifying') return 'Procesando…';
  if (status === 'finalizing') return 'Guardando…';
  if (status === 'failed') return 'Reintentar';
  return 'Guardar recuerdo';
}

const styles = StyleSheet.create({
  actions: { gap: spacing[3], paddingBottom: spacing[2] },
  form: { gap: spacing[4], paddingBottom: spacing[4] },
  captureSummary: { gap: spacing[1] },
  albumSection: { gap: spacing[2] },
  albumList: { gap: spacing[2], paddingRight: spacing[4] },
  error: { gap: spacing[2], alignItems: 'flex-start' },
});
