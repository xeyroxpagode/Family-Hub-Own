import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, Linking, ScrollView, StyleSheet, View, type AppStateStatus } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { ActionSheet, AppButton, AppInput, AppText, FilterChip } from '../../components/ui';
import { InteractivePressable } from '../../components/ui/InteractivePressable';
import { MemorySemanticDateFields } from '../../components/homecloud/MemorySemanticDateFields';
import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, spacing, touchTargets } from '../../constants/theme';
import { generateMutationId } from '../api';
import { createMemoryIntakeService } from './homecloudMemoryIntakeService';
import { createWrittenMemory } from './homecloudWrittenMemoryService';
import {
  emptySemanticDateDraft,
  semanticDateDraftFromCapture,
  semanticDateDraftError,
  semanticDateValueFromDraft,
  type SemanticDateDraft,
} from './homecloudSemanticDate';
import {
  batchActiveItem,
  batchCount,
  batchDateError,
  batchEffectiveAlbumId,
  batchEffectiveCaption,
  batchHasAlbumOverride,
  batchHasCaptionOverride,
  batchHasNext,
  batchHasPrevious,
  batchIsEmpty,
  batchLabel,
  batchNextIndex,
  batchPreviousIndex,
  batchResolvedItems,
  batchSeedFromArtifact,
  clearItemAlbumOverride,
  clearItemCaptionOverride,
  createBatchFromArtifacts,
  resetItemDate,
  setBatchActiveIndex,
  setBatchAlbum,
  setBatchCaption,
  setItemAlbumOverride,
  setItemCaptionOverride,
  setItemDate,
  type BatchSession,
} from './homecloudMemoryBatch';
import type { BinaryMemoryDraft, MemoryBatchAcceptedItem, MemoryBatchJobState, MemoryIntakeConfig, MemoryIntakeDestination, MemoryIntakeState } from './homecloudMemoryIntakeTypes';
import type { MemoryBatchSeed } from './homecloudMemoryIntakeService';
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

type Sheet = 'create' | 'camera' | 'binary' | 'batch' | 'recorder' | 'audio-handoff' | 'written' | null;

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
  /**
   * CAM-08: the recording waiting to enter the Review. It is a REF, not state:
   * the handoff commit must be idempotent across renders, and it is read by
   * callbacks that can run before the next commit. The render that shows the
   * handoff is produced by `setSheet('audio-handoff')`, never by this value.
   */
  const pendingAudioDraftRef = useRef<{ draft: BinaryMemoryDraft; attempt: MemoryAttempt } | null>(null);
  const [albums, setAlbums] = useState<MemoryIntakeDestination[]>([]);
  const [binaryDraft, setBinaryDraft] = useState<BinaryMemoryDraft | null>(null);
  // ST-10.D — ONE batch session holds N INDEPENDENT drafts. It is a single value
  // so that navigating between items cannot rebuild or reset the others.
  const [batch, setBatch] = useState<BatchSession | null>(null);
  const [batchSummary, setBatchSummary] = useState<MemoryBatchJobState[] | null>(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchFailure, setBatchFailure] = useState<string | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<MemoryAttempt | null>(null);
const [binaryCaption, setBinaryCaption] = useState('');
  const [binaryAlbumId, setBinaryAlbumId] = useState<string | null>(initialAlbumId ?? null);
  const [binaryDate, setBinaryDate] = useState<SemanticDateDraft>(emptySemanticDateDraft);
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
  const batchRef = useRef<BatchSession | null>(batch);
  const batchSummaryRef = useRef<MemoryBatchJobState[] | null>(batchSummary);
  /** Maps every batch job id back to the draft identity that produced it. */
  const batchAcceptedRef = useRef<MemoryBatchAcceptedItem[]>([]);
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
    batchRef.current = batch;
    batchSummaryRef.current = batchSummary;
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

  /**
   * ST-10.D — CANCEL THE WHOLE UNSUBMITTED BATCH.
   *
   * Before submission every artifact still belongs to this sheet, so cancelling
   * releases all of them. Once a durable job exists for any item, the durable job
   * owns that artifact and closing must NOT delete it: recovery still needs those
   * bytes, and deleting them would destroy a recoverable upload.
   */
  const clearBatch = useCallback((reason: string) => {
    const current = batchRef.current;
    if (!current) return;
    const hasDurableJobs = batchAcceptedRef.current.length > 0;
    memoryDevTrace('draft_clear', { reason, batchSize: current.items.length, hasDurableJobs });
    if (!hasDurableJobs) current.items.forEach((item) => discardDraftArtifact(item.draft));
    batchAcceptedRef.current = [];
    setBatch(null);
    setBatchSummary(null);
    setBatchFailure(null);
    setBatchSubmitting(false);
    service.dismissBatch();
  }, [discardDraftArtifact, service]);

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
    setBinaryDate(emptySemanticDateDraft());
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
   * A cancelled job is TERMINAL: `coordinator.cancel` persists `cancelled` and
   * `coordinator.retry` refuses it, so re-submitting the same draft would only
   * create a SECOND job for the same intent. The honest consequence is that the
   * review stops offering Save and says plainly that nothing was saved, leaving
   * the user the explicit choice of picking the media again.
   */
  const cancelled = state.status === 'cancelled';
  /**
   * REVIEW_READY — the ONE save-enable contract for every binary source
   * (gallery image, gallery video, camera, recorder): a durable draft exists and
   * no submit is in flight. Source, kind and MIME are deliberately NOT part of
   * it, so no source can end up with a Save button the others do not have.
   */
  const saveDisabled = !binaryDraft || active || accepting || cancelled || Boolean(semanticDateDraftError(binaryDate));
  /**
   * PERF-08 — the durable job this Review owns, not "any household job". A
   * cancelled or completed one is deliberately NOT reported as cancellable, so
   * the affordance can never offer to undo a finalized upload.
   */
  const cancellable = service.hasActiveJob() && !cancelled;
  // INTAKE-09 — the JSX obeys the service's ONE destination authority instead
  // of keeping a parallel local one: visibility comes from
  // service.canShowDestinationSelector() (true only when a real choice
  // exists and no inherited Album context already resolved it), and every
  // selection flows through service.selectDestination so the service
  // remains the only owner of destination state (invalid-album surfacing,
  // albumName projection, "root" normalisation).
  const showDestinationSelector = service.canShowDestinationSelector() || state.invalidAlbum === true;
  // One authoritative destination selector: it only renders when the service
  // says there is a real choice, and every change goes through the service
  // authority while the local state mirrors what the submit already consumed.
  const handleSelectBinaryAlbum = (albumId: string | null) => {
    setBinaryAlbumId(albumId);
    service.selectDestination(albumId, albumId ? albums.find((album) => album.id === albumId)?.name ?? null : 'Recuerdos');
  };
  const handleSelectWrittenAlbum = (albumId: string | null) => {
    setWrittenAlbumId(albumId);
    service.selectDestination(albumId, albumId ? albums.find((album) => album.id === albumId)?.name ?? null : 'Recuerdos');
  };

  // The trigger depends on the LOCAL guard only. A remote status that could be
  // orphaned must never be able to disable the only entry point.
  const triggerDisabled = !capabilities.contribute || picking || accepting;
  // Owned by the service, not by local state: `pickMemory` clears the previous
  // error on every new attempt, so a failure is shown exactly where it happened
  // (the create sheet) and can never leak into the next Review.
  const pickingError = pickerFailure ?? (state.status === 'failed' ? state.error ?? 'No pudimos seleccionar la foto o el video.' : null);

/**
   * THE ONE NATIVE PICKER FLOW, shared by the single-item and the batch paths.
   *
   * Only the COMMIT differs: gallery multi-selection hands N seeds to a batch
   * session, while audio keeps a single draft (the audio pickers are
   * single-selection by product). Every lifecycle guarantee — the synchronous
   * guard, the generation counter, attempt ownership, and the `finally` release
   * on every exit path — is therefore identical for both, which is what stops a
   * batch from being a second, weaker picker.
   */
  const runPicker = useCallback(async <T,>(
    source: 'gallery' | 'audio-import',
    pick: (attempt: MemoryAttempt) => Promise<T | null>,
    commit: (value: T) => void,
  ) => {
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
      const picked = await pick(mediaAttempt);
      if (picked === null) return;
      if (!mountedRef.current || pickerAttemptRef.current !== attempt || !attemptAuthorityRef.current.owns(mediaAttempt)) return;
      acceptedDraftRef.current = null;
      setReviewAttempt(mediaAttempt);
      commit(picked);
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
  }, [picking]);

  /** Commit a single draft into the shared single-item review. */
  const commitSingleDraft = useCallback((draft: BinaryMemoryDraft) => {
    setBinaryDraft(draft);
    setBinaryCaption('');
    setBinaryAlbumId(initialAlbumId ?? null);
    setBinaryDate(semanticDateDraftFromCapture(
      draft.capture.capturedAt,
      draft.capture.capturePrecision,
      draft.capture.capturedYear,
      draft.capture.capturedMonth,
    ));
    setSheet('binary');
  }, [initialAlbumId]);

  /**
   * ST-10.D — commit N picked assets into ONE batch session.
   *
   * `dedupeBatchSeeds` is applied HERE, while the source asset identity is still
   * known, so the same file can never be submitted twice. An empty or fully
   * duplicate selection is refused instead of opening an empty review.
   */
const commitBatch = useCallback((picked: readonly MemoryBatchSeed[]) => {
    const session = createBatchFromArtifacts(picked, initialAlbumId ?? null, `batch-${Date.now()}`);
    if (batchIsEmpty(session)) {
      picked.forEach((seed) => discardDraftArtifact(batchSeedFromArtifact(seed).draft));
      setPickerFailure('No pudimos preparar lo que seleccionaste. Probá de nuevo.');
      return;
    }
    batchAcceptedRef.current = [];
    service.selectDestination(initialAlbumId ?? null, initialAlbumName ?? null);
    setBatchSummary(null);
    setBatchFailure(null);
    setBatch(session);
    setSheet('batch');
  }, [discardDraftArtifact, initialAlbumId, initialAlbumName, service]);

  const chooseMedia = useCallback(() => runPicker(
    'gallery',
    (attempt) => service.pickMemoryBatch(attempt, (candidate) => attemptAuthorityRef.current.owns(candidate)),
    commitBatch,
  ), [commitBatch, runPicker, service]);

  const chooseAudio = useCallback(() => runPicker(
    'audio-import',
    (attempt) => service.pickAudio(attempt, (candidate) => attemptAuthorityRef.current.owns(candidate)),
    commitSingleDraft,
  ), [commitSingleDraft, runPicker, service]);

const acceptRecordedAudio = useCallback((draft: BinaryMemoryDraft, attempt: MemoryAttempt) => {
    if (!attemptAuthorityRef.current.owns(attempt)) return;
    // Deliberate, VISIBLE handoff (CAM-08): the recorder's ownership ends
    // BEFORE the playback hook is mounted, so the Review never coexists with a
    // recorder. This used to be a sheet state with NO JSX at all, advanced by a
    // `useEffect` that set two states in the same tick: invisible to the user
    // and fragile. It is now a rendered, honest intermediate panel whose own
    // mount commits the draft exactly once.
    memoryAttemptTrace(attempt, 'recorder_ownership_released', { uri: draft.artifact.localUri.split(':', 1)[0] });
    pendingAudioDraftRef.current = { draft, attempt }; setSheet('audio-handoff');
  }, []);

  /**
   * CAM-08 — the ONE commit point out of the audio handoff.
   *
   * It is idempotent by construction: it consumes the pending draft from a ref,
   * so a re-run (a changed callback identity, a second mount) is a no-op rather
   * than a second commit.
   */
  const commitPendingAudio = useCallback(() => {
    const pending = pendingAudioDraftRef.current;
    if (!pending) return;
    if (!attemptAuthorityRef.current.owns(pending.attempt)) {
      memoryDevTrace('review_close_requested', { reason: 'audio_handoff_attempt_lost', source: pending.draft.source });
      discardDraftArtifact(pending.draft);
      pendingAudioDraftRef.current = null; setSheet('create');
      return;
    }
    pendingAudioDraftRef.current = null;
    setBinaryDraft(pending.draft); setReviewAttempt(pending.attempt); setBinaryCaption(''); setBinaryAlbumId(initialAlbumId ?? null);
    setBinaryDate(semanticDateDraftFromCapture(pending.draft.capture.capturedAt, pending.draft.capture.capturePrecision, pending.draft.capture.capturedYear, pending.draft.capture.capturedMonth));
    setSheet('binary');
  }, [discardDraftArtifact, initialAlbumId]);

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
    // CAM-08: closing during the handoff must release the recorded artifact it
    // was carrying. It has no durable job yet, so this sheet still owns it.
    const pending = pendingAudioDraftRef.current;
    if (pending) { pendingAudioDraftRef.current = null; discardDraftArtifact(pending.draft); }
    service.dismiss();
    setSheet(null);
  }, [discardDraftArtifact, service]);

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

  /**
   * ST-10.E — ONE USER ACTION, N AUTHORIZED SUBMISSIONS.
   *
   * `createBinaryMemories` enqueues one durable job per item through the SAME
   * shared queue the single-item path uses, so each item keeps its own register
   * idempotency key, its own recovery and its own real state. The guard refuses a
   * second press of the same batch outright, so a double tap cannot enqueue the
   * batch twice.
   */
  const submitBatch = useCallback(async () => {
    const current = batchRef.current;
    if (!current || batchSubmitting) return;
    const dateError = batchDateError(current);
    if (dateError) { setBatchFailure(dateError); return; }
    setBatchSubmitting(true);
    setBatchFailure(null);
    try {
      Keyboard.dismiss();
      const accepted = await service.createBinaryMemories(batchResolvedItems(current), current.sessionId);
      batchAcceptedRef.current = accepted;
      // The summary is read from the DURABLE store, so it reflects real job
      // states rather than the optimism of the moment the user pressed Save.
      setBatchSummary(service.batchJobStates(accepted.flatMap((item) => item.jobId ? [item.jobId] : [])));
    } catch (error) {
      setBatchFailure(error instanceof Error ? error.message : 'No pudimos guardar estos recuerdos.');
    } finally {
      if (mountedRef.current) setBatchSubmitting(false);
    }
  }, [batchSubmitting, service]);

  /** FAILED-ONLY RETRY: only the ids that actually failed are retried. */
  const retryFailedBatchItems = useCallback(async () => {
    const summary = batchSummaryRef.current;
    if (!summary) return;
    const failedIds = summary.filter((job) => job.state === 'failed').map((job) => job.jobId);
    if (failedIds.length === 0) return;
    setBatchSubmitting(true);
    try {
      await service.retryBatchJobs(failedIds);
      setBatchSummary(service.batchJobStates(service.getBatchJobIds()));
    } finally {
      if (mountedRef.current) setBatchSubmitting(false);
    }
  }, [service]);

  /**
   * ST-10.E — HONEST CANCELLATION.
   *
   * Only jobs that are not yet `completed` are asked to cancel; the coordinator
   * refuses the rest. Already-finalized items therefore stay ACTIVE and are
   * counted as such, never reported as undone.
   */
  const cancelUnfinishedBatchItems = useCallback(async () => {
    const ids = service.getBatchJobIds();
    if (ids.length === 0) return;
    setBatchSubmitting(true);
    try {
      await service.cancelBatchJobs(ids);
      setBatchSummary(service.batchJobStates(ids));
    } finally {
      if (mountedRef.current) setBatchSubmitting(false);
    }
  }, [service]);

  const closeBatch = useCallback(() => {
    memoryDevTrace('review_close_requested', { reason: 'user_close', sheet: 'batch', hasDurableJobs: batchAcceptedRef.current.length > 0 });
    clearBatch('review_close');
    attemptAuthorityRef.current.invalidate(reviewAttempt ?? undefined);
    setSheet(null);
  }, [clearBatch, reviewAttempt]);

  const openRecorder = useCallback(() => {
    const attempt = attemptAuthorityRef.current.begin('audio-record', 'audio');
    recorderAttemptRef.current = attempt;
    setSheet('recorder');
  }, []);

  // CAM-09: the camera is an INTAKE entry point exactly like `Fotos y videos`,
  // so its review must offer the same FRESH Album list. It reloaded nothing,
  // which let the camera review offer an Album that had been renamed or
  // deleted elsewhere while `Importar audio` would not.
  const openCamera = useCallback(() => { reloadDestinations(); setSheet('camera'); }, [reloadDestinations]);

  const acceptCamera = useCallback((draft: BinaryMemoryDraft, attempt: MemoryAttempt) => {
    if (!attemptAuthorityRef.current.owns(attempt)) return;
    setBinaryDraft(draft); setReviewAttempt(attempt); setBinaryCaption(''); setBinaryAlbumId(initialAlbumId ?? null); setBinaryDate(semanticDateDraftFromCapture(draft.capture.capturedAt, draft.capture.capturePrecision, draft.capture.capturedYear, draft.capture.capturedMonth)); setSheet('binary');
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
    setPicking(false);
    // CAM-08 + T-05: a household switch or a navigation away must not leave a
    // recorded artifact owned by nobody, and must never carry it into the next
    // household's context.
    const pending = pendingAudioDraftRef.current;
    if (pending) { pendingAudioDraftRef.current = null; discardDraftArtifact(pending.draft); }
if (!service.hasActiveJob() && !acceptingRef.current) discardDraftArtifact(binaryDraft);
    clearBinaryDraft('focus_lost'); clearBatch('focus_lost'); service.dismiss(); setSheet(null);
  }, [binaryDraft, clearBatch, clearBinaryDraft, discardDraftArtifact, isFocused, service]);

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
    const capture = semanticDateValueFromDraft(binaryDate);
    if (reviewAttempt) memoryAttemptTrace(reviewAttempt, 'submit', { mimeType: binaryDraft.artifact.mimeType });
    else memoryDevTrace('submit_press', { source: binaryDraft.source, mimeType: binaryDraft.artifact.mimeType });
    let accepted = false;
    try {
      const acceptedJobId = await service.createBinaryMemory(binaryDraft, {
        caption: binaryCaption.trim() || null,
        initialAlbumId: binaryAlbumId,
        capturePrecision: capture.precision,
        capturedAt: capture.capturedAt,
        capturedYear: capture.capturedYear,
        capturedMonth: capture.capturedMonth,
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
  }, [active, binaryAlbumId, binaryCaption, binaryDate, binaryDraft, clearBinaryDraft, picking, reviewAttempt, service]);

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

/**
   * HC2-C §7 — THE CREATE-MEMORY `+`: CLEAN ACTION, NO VISIBLE CIRCLE.
   *
   * This used to be `AppButton variant="icon"`, and that variant ALWAYS paints
   * `borderRadius: radius.full` + `backgroundColor: surface.soft` + a border. So
   * the most important action in the surface was wearing a filled circular
   * container that competed with the page chrome.
   *
   * `AppButton` is deliberately NOT modified: `variant="icon"` is used across the
   * whole app, and changing it would restyle unrelated buttons. Instead this is
   * the local transparent pressable the product decision calls for:
   *
   *  - no background, no border, no radius, therefore no visible container;
   *  - an INVISIBLE hit area of `touchTargets.normal` (44) on both axes, which
   *    is the accessibility floor the product requires;
   *  - the existing brand colour on the glyph;
   *  - the SAME `accessibilityLabel="Crear recuerdo"`;
   *  - the SAME `disabled` semantics when `capabilities.contribute` is false;
   *  - the SAME light haptic, via the shared `InteractivePressable` (which also
   *    brings the app's existing press-scale, so this does not invent a new
   *    interaction feel).
   */
  return (
    <>
      <InteractivePressable
        onPress={openCreate}
        disabled={triggerDisabled}
        style={styles.createTrigger}
        pressScale={motion.scale.icon}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Crear recuerdo"
        accessibilityState={{ disabled: triggerDisabled }}
      >
        <HomePlusIcon name="add" size={24} color={colors.brand} />
      </InteractivePressable>

      <ActionSheet visible={sheet === 'create'} title="Guardar un recuerdo" onRequestClose={closeCreate} size="content">
        <View style={styles.actions}>
          <AppButton title={picking ? 'Abriendo…' : 'Fotos y videos'} loading={picking} disabled={picking} onPress={() => void chooseMedia()} />
          <AppButton title="Capturar momento" variant="secondary" disabled={picking} onPress={openCamera} />
          <AppButton title={picking ? 'Abriendo…' : 'Importar audio'} loading={picking} variant="secondary" disabled={picking} onPress={() => void chooseAudio()} />
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
       * SINGLE NATIVE MODAL HOST for the binary Review.
       *
       * One Modal instance stays presented across
       * create action → native picker → binary. The P2 create menu routes
       * gallery and audio pickers STRAIGHT to the Review (5 flat actions, no
       * chooser sheet). Only the Review content and its close policy live
       * here. That is what makes the picker presentation legal
       * on iOS (presenting from an already-presented host) and it is why there
       * is no dismiss/present race and no `onDismiss` authority anywhere in
       * this flow: the host's visibility is `visible`, nothing else.
       */}
      <ActionSheet
        visible={sheet === 'binary'}
        title="Revisar recuerdo"
        onRequestClose={handleSourceBinaryRequestClose}
closeDisabled={active || accepting}
        size="scrollable-content"
        keyboardAware
        footer={(
          <View style={styles.footerActions}>
            <AppButton
              title={accepting || cancelled ? 'Cerrar' : binarySubmitLabel(state.status)}
              loading={active || accepting}
              disabled={cancelled ? false : saveDisabled}
              onPress={() => { if (cancelled) { closeReview(); return; } Keyboard.dismiss(); void submitBinary(); }}
            />
            {/*
             * PERF-08 — cancellation from the intake surface itself. The close
             * `X` is disabled while a job is live precisely so an accidental
             * dismissal cannot orphan a durable upload, which left the upload
             * with no reachable stop from here. `service.cancel()` targets THIS
             * Review's job only, aborts the transfer, persists `cancelled` and
             * cleans that job's artifact: it never claims an upload was undone.
             */}
            {cancellable ? <AppButton title={binaryCancelLabel(state.status)} size="sm" variant="secondary" onPress={() => service.cancel()} accessibilityLabel="Cancelar la subida de este recuerdo" /> : null}
          </View>
        )}
      >
        {(
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.form}
          >
            {binaryDraft ? <MemoryMediaReview draft={binaryDraft} attempt={reviewAttempt ?? undefined} /> : null}
            <MemorySemanticDateFields value={binaryDate} onChange={setBinaryDate} disabled={active || accepting} />
            {cancelled ? (
              <View style={styles.error}>
                <AppText variant="bodySmall" tone="danger">No se guardó este recuerdo. Podés elegirlo de nuevo para intentarlo otra vez.</AppText>
              </View>
            ) : null}
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
            {showDestinationSelector ? <MemoryAlbumSelector albums={albums} value={binaryAlbumId} onChange={handleSelectBinaryAlbum} disabled={active} invalidAlbum={state.invalidAlbum === true} /> : null}
            {state.status === 'failed' || submitFailure ? (
              <View style={styles.error}>
                <AppText variant="bodySmall" tone="danger">{submitFailure ?? state.error ?? 'No pudimos guardar este recuerdo.'}</AppText>
              </View>
            ) : null}
          </ScrollView>
        )}
      </ActionSheet>

      <ActionSheet visible={sheet === 'recorder'} title="Grabar audio" onRequestClose={() => abandonRecorder('recorder_sheet_dismissed')} size="content">
        {sheet === 'recorder' && recorderAttemptRef.current ? <MemoryAudioRecorder attempt={recorderAttemptRef.current} ownsAttempt={(attempt) => attemptAuthorityRef.current.owns(attempt)} abandonRef={setRecorderHandle} onReady={acceptRecordedAudio} onCancel={() => { attemptAuthorityRef.current.invalidate(recorderAttemptRef.current ?? undefined); setSheet('create'); }} /> : <View />}
      </ActionSheet>

      {/*
       * CAM-08 — the audio handoff is a REAL, rendered, understandable
       * intermediate surface. It used to be a sheet state with no JSX at all,
       * so the recorder finished a recording and the app showed nothing at all
       * while ownership moved to the Review.
       */}
      {/*
       * ST-10.D — ONE batch review for the whole selection.
       *
       * It reuses the SAME review primitive and the SAME date editor as the
       * single-item review: there is no second metadata engine and no second
       * form. What is batch-specific is only the navigation between items and
       * the explicit per-item override affordances, both of which write into the
       * ONE session so an edit can never leak into a different item.
       */}
      <ActionSheet
        visible={sheet === 'batch' && batch !== null}
        title="Revisar recuerdos"
        onRequestClose={closeBatch}
        closeDisabled={batchSubmitting}
        size="scrollable-content"
        keyboardAware
        footer={(
          <View style={styles.footerActions}>
            <AppButton
              title={batchSubmitting ? 'Guardando…' : `Guardar ${batch === null ? 0 : batchCount(batch)} recuerdos`}
              loading={batchSubmitting}
              disabled={batchSubmitting || batch === null || Boolean(batch !== null && batchDateError(batch))}
              onPress={() => void submitBatch()}
            />
            {batchSummary && batchUnfinishedCount(batchSummary) > 0 ? (
              <AppButton title="Cancelar los que siguen pendientes" size="sm" variant="secondary" onPress={() => void cancelUnfinishedBatchItems()} accessibilityLabel="Cancelar los recuerdos que todavía no se guardaron" />
            ) : null}
          </View>
        )}
      >
        {batch ? (
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.form}>
            <View style={styles.batchNav}>
              <AppButton title="Anterior" size="sm" variant="secondary" disabled={!batchHasPrevious(batch)} onPress={() => setBatch((value) => value ? setBatchActiveIndex(value, batchPreviousIndex(value)) : value)} accessibilityLabel="Ver el recuerdo anterior" />
              <AppText variant="caption" tone="secondary" weight="700">{batchLabel(batch)}</AppText>
              <AppButton title="Siguiente" size="sm" variant="secondary" disabled={!batchHasNext(batch)} onPress={() => setBatch((value) => value ? setBatchActiveIndex(value, batchNextIndex(value)) : value)} accessibilityLabel="Ver el recuerdo siguiente" />
            </View>
            <MemoryMediaReview draft={batchActiveItem(batch)?.draft ?? batch.items[0].draft} attempt={reviewAttempt ?? undefined} />
            <AppText variant="caption" tone="secondary">{`Este elemento: ${batchItemKindLabel(batchActiveItem(batch))}`}</AppText>
            <MemorySemanticDateFields
              value={batchActiveItem(batch)?.date ?? emptySemanticDateDraft()}
              onChange={(date) => setBatch((value) => value ? setItemDate(value, value.activeIndex, date) : value)}
              disabled={batchSubmitting}
            />
            <AppButton
              title="Usar la fecha del archivo otra vez"
              size="sm"
              variant="secondary"
              disabled={batchSubmitting}
              onPress={() => setBatch((value) => value ? resetItemDate(value, value.activeIndex) : value)}
              accessibilityLabel="Descartar la corrección de fecha de este recuerdo"
            />

            <AppInput
              label="Texto para todos (opcional)"
              value={batch.caption}
              onChangeText={(text) => setBatch((value) => value ? setBatchCaption(value, text) : value)}
              editable={!batchSubmitting}
              placeholder="Contá algo sobre este momento…"
              variant="multiline"
              returnKeyType="done"
              blurOnSubmit
            />
            {batchActiveItem(batch) ? (
              <MemoryBatchOverrideRow
                label="Texto de este recuerdo"
                overridden={batchHasCaptionOverride(batchActiveItem(batch)!)}
                effective={batchEffectiveCaption(batch, batchActiveItem(batch)!)}
                onFollow={() => setBatch((value) => value ? clearItemCaptionOverride(value, value.activeIndex) : value)}
                onOverride={(text) => setBatch((value) => value ? setItemCaptionOverride(value, value.activeIndex, text || null) : value)}
                disabled={batchSubmitting}
              />
            ) : null}

            {showDestinationSelector ? <MemoryAlbumSelector albums={albums} value={batch.albumId} onChange={(albumId) => { setBatch((value) => value ? setBatchAlbum(value, albumId) : value); service.selectDestination(albumId, albumId ? albums.find((album) => album.id === albumId)?.name ?? null : 'Recuerdos'); }} disabled={batchSubmitting} invalidAlbum={state.invalidAlbum === true} /> : null}
            {batchActiveItem(batch) && showDestinationSelector ? (
              <MemoryBatchOverrideRow
                label="Álbum de este recuerdo"
                overridden={batchHasAlbumOverride(batchActiveItem(batch)!)}
                effective={batchAlbumLabel(batch, batchActiveItem(batch)!)}
                onFollow={() => setBatch((value) => value ? clearItemAlbumOverride(value, value.activeIndex) : value)}
                onOverride={(albumId) => setBatch((value) => value ? setItemAlbumOverride(value, value.activeIndex, albumId) : value)}
                disabled={batchSubmitting}
              />
            ) : null}

            {batchSummary ? <MemoryBatchSummary summary={batchSummary} accepted={batchAcceptedRef.current} onRetryFailed={() => void retryFailedBatchItems()} onClose={closeBatch} /> : null}
            {batchFailure ? <AppText variant="bodySmall" tone="danger">{batchFailure}</AppText> : null}
          </ScrollView>
        ) : null}
      </ActionSheet>

      <ActionSheet visible={sheet === 'audio-handoff'} title="Abrir la grabación" onRequestClose={closeCreate} size="content">
        <MemoryAudioHandoff onReady={commitPendingAudio} />
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
          {showDestinationSelector ? <MemoryAlbumSelector albums={albums} value={writtenAlbumId} onChange={handleSelectWrittenAlbum} disabled={writtenSubmitting} invalidAlbum={state.invalidAlbum === true} /> : null}
          {writtenError ? <AppText variant="bodySmall" tone="danger">{writtenError}</AppText> : null}
        </ScrollView>
      </ActionSheet>
    </>
  );
}

/**
 * ST-10.D — AN EXPLICIT PER-ITEM OVERRIDE, VISIBLE AS ONE.
 *
 * The row always states what the item will actually use, so "common value" and
 * "explicit exception" are never indistinguishable. Following the common value
 * is an explicit action, which is what makes "editing the common Album must not
 * silently erase this exception" observable rather than merely intended.
 */
function MemoryBatchOverrideRow({ label, overridden, effective, onFollow, onOverride, disabled }: {
  label: string;
  overridden: boolean;
  effective: string | null;
  onFollow: () => void;
  onOverride: (value: string) => void;
  disabled: boolean;
}) {
  const [own, setOwn] = useState('');
  return (
    <View style={styles.overrideSection}>
      <View style={styles.overrideHeader}>
        <AppText variant="caption" tone="secondary" weight="700">{label}</AppText>
        <FilterChip label={overridden ? 'Distinto' : 'Igual para todos'} selected={overridden} disabled={disabled} onPress={overridden ? onFollow : () => onOverride(own)} />
      </View>
      <AppText variant="caption" tone="secondary">{overridden ? `Este: ${effective ?? 'Sin valor'}` : `Usa el valor común: ${effective ?? 'Sin valor'}`}</AppText>
      {overridden ? (
        <AppInput
          label="Valor de este recuerdo"
          value={own}
          onChangeText={(text) => { setOwn(text); onOverride(text); }}
          editable={!disabled}
          placeholder="Vacío para dejar este recuerdo sin valor"
          returnKeyType="done"
          blurOnSubmit
        />
      ) : null}
    </View>
  );
}

/**
 * ST-10.E — ONE HONEST SUMMARY, NEVER N SUCCESS ALERTS.
 *
 * The counts are the engine's real job states. A completed item is ACTIVE; a
 * failed item stays NAMED and retryable; a cancelled item is reported as
 * cancelled, not as saved. There is no path here that can report "N recuerdos
 * guardados" while some are still failing.
 */
function MemoryBatchSummary({ summary, accepted, onRetryFailed, onClose }: {
  summary: readonly MemoryBatchJobState[];
  accepted: readonly MemoryBatchAcceptedItem[];
  onRetryFailed: () => void;
  onClose: () => void;
}) {
  const saved = summary.filter((job) => job.state === 'completed').length;
  const failed = summary.filter((job) => job.state === 'failed');
  const cancelled = summary.filter((job) => job.state === 'cancelled').length;
  const refused = accepted.filter((item) => item.jobId === null);
  const pending = summary.length - saved - failed.length - cancelled;
  const failedNames = failed.map((job) => job.displayName);
  return (
    <View style={styles.summarySection}>
      <AppText variant="bodySmall" weight="700">{`${saved} de ${summary.length + refused.length} guardados`}</AppText>
      {pending > 0 ? <AppText variant="caption" tone="secondary">{`${pending} todavía en proceso`}</AppText> : null}
      {cancelled > 0 ? <AppText variant="caption" tone="secondary">{`${cancelled} cancelados: no se guardaron`}</AppText> : null}
      {failed.length > 0 ? (
        <>
          <AppText variant="caption" tone="danger">{`No se pudieron guardar ${failed.length}: ${failedNames.join(', ')}`}</AppText>
          <AppButton title="Reintentar los que fallaron" size="sm" variant="secondary" onPress={onRetryFailed} accessibilityLabel="Reintentar solo los recuerdos que fallaron" />
        </>
      ) : null}
      {refused.length > 0 ? <AppText variant="caption" tone="danger">{`No pudimos preparar ${refused.length}. Volvé a elegirlos para intentarlo otra vez.`}</AppText> : null}
      {saved > 0 && failed.length === 0 && refused.length === 0 && pending === 0 ? <AppButton title="Listo" onPress={onClose} /> : null}
      {failed.length > 0 || refused.length > 0 ? <AppButton title="Cerrar y volver" variant="secondary" onPress={onClose} /> : null}
    </View>
  );
}

/** How many jobs have not reached a terminal state yet. */
function batchUnfinishedCount(summary: readonly MemoryBatchJobState[]): number {
  return summary.filter((job) => job.state !== 'completed' && job.state !== 'cancelled').length;
}

/** The media kind of the item currently being edited, in honest words. */
function batchItemKindLabel(item: { draft: BinaryMemoryDraft } | null): string {
  return item !== null && item.draft.artifact.mimeType.startsWith('video/') ? 'Video' : 'Foto';
}

/** The Album an item will actually be saved into, by name. */
function batchAlbumLabel(session: BatchSession, item: BatchSession['items'][number]): string {
  const albumId = batchEffectiveAlbumId(session, item);
  if (albumId === null) return 'Sin álbum';
  return albumId;
}

/**
 * CAM-08 — the audio handoff surface. It renders honest, understandable copy and
 * commits the pending draft from its OWN mount, exactly once. It exists because
 * `useAudioRecorder` must release its native object before the audio Review
 * mounts `useAudioPlayer`, and the handoff is that ordering made visible rather
 * than implicit.
 */
function MemoryAudioHandoff({ onReady }: { onReady: () => void }) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => { onReadyRef.current(); }, []);
  return <View style={styles.handoff}>
    <ActivityIndicator color={colors.brand} />
    <AppText variant="bodySmall" tone="secondary" align="center">Abriendo la grabación para revisarla…</AppText>
  </View>;
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
  if (status === 'cancelled') return 'Cerrar';
  return 'Guardar recuerdo';
}

/**
 * PERF-08 — the cancel affordance names the state it would actually stop. It
 * never offers to cancel something already finalized or already cancelled,
 * because neither can be undone by the queue.
 */
function binaryCancelLabel(status: MemoryIntakeState['status']): string {
  if (status === 'verifying' || status === 'finalizing') return 'Cancelar el envío';
  return 'Cancelar la subida';
}

const styles = StyleSheet.create({
  /**
   * HC2-C §7 — the invisible 44x44 hit area of the create `+`.
   *
   * `backgroundColor: 'transparent'` and no border/radius are stated explicitly
   * rather than merely omitted, so the "no visible circle" contract is a property
   * of this style and not of what someone happens not to add later. The size is
   * `touchTargets.normal`, the accessibility floor the product freezes.
   */
  createTrigger: {
    minWidth: touchTargets.normal,
    minHeight: touchTargets.normal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  actions: { gap: spacing[3], paddingBottom: spacing[2] },
  form: { gap: spacing[4], paddingBottom: spacing[4] },
  albumSection: { gap: spacing[2] },
  albumList: { gap: spacing[2], paddingRight: spacing[4] },
error: { gap: spacing[2], alignItems: 'flex-start' },
  handoff: { gap: spacing[3], alignItems: 'center', paddingVertical: spacing[4] },
  footerActions: { gap: spacing[2] },
  batchNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  overrideSection: { gap: spacing[2] },
  overrideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  summarySection: { gap: spacing[2], alignItems: 'flex-start' },
});
