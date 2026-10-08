import type { BinaryMemoryDraft, BinaryMemoryMetadata } from './homecloudMemoryIntakeTypes';
import type { MediaCaptureMetadata } from './homecloudMediaCaptureMetadata';
import { emptySemanticDateDraft, semanticDateDraftFromCapture, semanticDateDraftError, semanticDateValueFromDraft, type SemanticDateDraft } from './homecloudSemanticDate';

/**
 * HomeCloud Memories ST-10.D/E — BATCH INTAKE CONTRACT (pure).
 *
 * Product Truth §6.7 and §7.4 are the authority. Three prohibitions are encoded
 * structurally here rather than left to a caller:
 *
 *  1. THERE IS NO BATCH DEFAULT DATE. Every item keeps its own `SemanticDateDraft`
 *     derived from its OWN capture metadata, and `setItemDate` is the only
 *     mutation that can change one. There is no API that writes a single date
 *     across items, so "never overwrite N distinct dates with one shared date"
 *     is unreachable rather than merely tested.
 *
 *  2. A COMMON ALBUM IS A DEFAULT, NOT AN OVERWRITE. `setBatchAlbum` changes the
 *     batch-level value and never touches an item's explicit override, so
 *     changing the common Album cannot silently erase a per-item exception.
 *     The same holds for the common description.
 *
 *  3. AN OVERRIDE IS EXPLICIT OR IT DOES NOT EXIST. `albumOverride` and
 *     `captionOverride` are OPTIONAL WRAPPERS, not nullable fields: `undefined`
 *     means "follow the batch", while a present wrapper carrying `null` means
 *     "explicitly no Album" / "explicitly no text". A bare `null` could never
 *     express that distinction, and collapsing it would make an explicit
 *     "Sin album" indistinguishable from "no opinion".
 *
 * IDENTITY: `draftId` is a STABLE LOCAL identity for review navigation, edits,
 * upload-result mapping, retry and error naming. It is NOT a server contentId
 * and must never be presented as one.
 */

export interface BatchItemDraft {
  /** Stable local identity. Local only — never a content id. */
  readonly draftId: string;
  /** Displayable name used when this item must be named to the user. */
  readonly label: string;
  readonly draft: BinaryMemoryDraft;
  readonly capture: MediaCaptureMetadata;
  /** THIS item's own semantic date. Independent from every other item. */
  readonly date: SemanticDateDraft;
  /** Present only when this item EXPLICITLY overrides the batch Album. */
  readonly albumOverride?: { readonly albumId: string | null };
  /** Present only when this item EXPLICITLY overrides the batch description. */
  readonly captionOverride?: { readonly caption: string | null };
}

export interface BatchSession {
  readonly sessionId: string;
  readonly items: readonly BatchItemDraft[];
  /** The common Album destination. Optional; never mandatory. */
  readonly albumId: string | null;
  /** The common optional description. */
  readonly caption: string;
  readonly activeIndex: number;
}

export interface BatchResolvedItem {
  readonly draftId: string;
  readonly label: string;
  readonly draft: BinaryMemoryDraft;
  /** The exact register metadata for THIS item, with no shared component. */
  readonly metadata: BinaryMemoryMetadata;
  /** Set when this item's own date is invalid, never for another item's. */
  readonly dateError: string | null;
}

/** The media kind, derived from the artifact's own MIME and nothing else. */
export function batchItemKind(draft: BinaryMemoryDraft): 'image' | 'video' {
  return draft.artifact.mimeType.startsWith('video/') ? 'video' : 'image';
}

/**
 * A stable local identity that does not depend on array position alone, so a
 * re-render or a result arriving out of order can never map an upload result to
 * the wrong item.
 */
export function batchDraftId(index: number, draft: BinaryMemoryDraft): string {
  return `draft-${index}-${draft.artifact.displayName}`;
}

/** The name shown when this item has to be named in an honest summary. */
export function batchItemLabel(draft: BinaryMemoryDraft, index: number): string {
  const name = draft.artifact.displayName.trim();
  return name.length > 0 ? name : `${batchItemKind(draft) === 'video' ? 'Video' : 'Foto'} ${index + 1}`;
}

export interface BatchSeed {
  readonly draft: BinaryMemoryDraft;
  readonly capture: MediaCaptureMetadata;
}

/**
 * The SHAPE THE PICKER ACTUALLY PRODUCES: an artifact plus its own capture,
 * before any draft is assembled. It exists so this module can accept the
 * picker's result directly and assemble each item through the one canonical
 * `BinaryMemoryDraft` shape, instead of asking every caller to rebuild it.
 */
export interface BatchArtifactSeed {
  readonly artifact: BinaryMemoryDraft['artifact'];
  readonly capture: MediaCaptureMetadata;
  readonly source: BinaryMemoryDraft['source'];
}

/** Assemble the one canonical draft shape from a picker artifact. */
export function batchSeedFromArtifact(seed: BatchArtifactSeed): BatchSeed {
  return { draft: { artifact: seed.artifact, capture: seed.capture, source: seed.source }, capture: seed.capture };
}

/**
 * DEDUPLICATION BY SOURCE ASSET.
 *
 * A picker can legitimately return the same asset twice (a re-selection race, or
 * a provider that echoes an item). Submitting it twice would create two server
 * contents for one file, so duplicates are dropped at the only seam where the
 * source identity is still known.
 */
export function dedupeBatchArtifacts(seeds: readonly BatchArtifactSeed[]): BatchArtifactSeed[] {
  const seen = new Set<string>();
  const unique: BatchArtifactSeed[] = [];
  for (const seed of seeds) {
    const key = `${seed.source}:${seed.artifact.localUri}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(seed);
  }
  return unique;
}

/**
 * Build ONE batch session from N picked assets.
 *
 * Each item derives its date from ITS OWN capture metadata through the single
 * existing semantic-date primitive. There is deliberately no batch-level date
 * field: the only way a date enters this structure is per item.
 */
export function createBatchSession(seeds: readonly BatchSeed[], albumId: string | null, sessionId: string): BatchSession {
  return {
    sessionId,
    albumId,
    caption: '',
    activeIndex: 0,
    items: seeds.map((seed, index) => ({
      draftId: batchDraftId(index, seed.draft),
      label: batchItemLabel(seed.draft, index),
      draft: seed.draft,
      capture: seed.capture,
      date: semanticDateDraftFromCapture(
        seed.capture.capturedAt,
        seed.capture.capturePrecision,
        seed.capture.capturedYear,
        seed.capture.capturedMonth,
      ),
    })),
  };
}

export function dedupeBatchSeeds(seeds: readonly BatchArtifactSeed[]): BatchArtifactSeed[] {
  return dedupeBatchArtifacts(seeds);
}

/** Build ONE batch session from N picker artifacts, deduplicated. */
export function createBatchFromArtifacts(
  artifacts: readonly BatchArtifactSeed[],
  albumId: string | null,
  sessionId: string,
): BatchSession {
  return createBatchSession(dedupeBatchArtifacts(artifacts).map(batchSeedFromArtifact), albumId, sessionId);
}

// ---------------------------------------------------------------------------
// NAVIGATION — one coherent review over the whole selection
// ---------------------------------------------------------------------------

export function batchItemAt(session: BatchSession, index: number): BatchItemDraft | null {
  if (index < 0 || index >= session.items.length) return null;
  return session.items[index];
}

/** The item the review is currently showing. Never a different item's preview. */
export function batchActiveItem(session: BatchSession): BatchItemDraft | null {
  return batchItemAt(session, session.activeIndex);
}

export function batchHasPrevious(session: BatchSession): boolean {
  return session.activeIndex > 0;
}

export function batchHasNext(session: BatchSession): boolean {
  return session.activeIndex < session.items.length - 1;
}

export function batchPreviousIndex(session: BatchSession): number {
  return Math.max(0, session.activeIndex - 1);
}

export function batchNextIndex(session: BatchSession): number {
  return Math.min(Math.max(session.items.length - 1, 0), session.activeIndex + 1);
}

/**
 * Move to another item WITHOUT touching any item's data.
 *
 * Navigation is a pure index change: it cannot reset a date, cannot reset an
 * override and cannot rebuild a draft. That is what makes "edits survive moving
 * from item 2 to item 3" a structural property instead of a hope.
 */
export function setBatchActiveIndex(session: BatchSession, index: number): BatchSession {
  const bounded = Math.min(Math.max(index, 0), Math.max(session.items.length - 1, 0));
  if (bounded === session.activeIndex) return session;
  return { ...session, activeIndex: bounded };
}

// ---------------------------------------------------------------------------
// PER-ITEM DATE — the hard product gate
// ---------------------------------------------------------------------------

/**
 * Correct ONE item's date. Every other item is returned by identity, so it is
 * impossible for this function to modify another item's semantic date.
 */
export function setItemDate(session: BatchSession, index: number, date: SemanticDateDraft): BatchSession {
  const items = session.items.map((item, position) => (position === index ? { ...item, date } : item));
  return { ...session, items };
}

/** Reset one item back to the date derived from its OWN capture metadata. */
export function resetItemDate(session: BatchSession, index: number): BatchSession {
  const item = batchItemAt(session, index);
  if (!item) return session;
  return setItemDate(session, index, semanticDateDraftFromCapture(
    item.capture.capturedAt,
    item.capture.capturePrecision,
    item.capture.capturedYear,
    item.capture.capturedMonth,
  ));
}

// ---------------------------------------------------------------------------
// BATCH ORGANIZATION — common values plus EXPLICIT per-item overrides
// ---------------------------------------------------------------------------

export function batchHasAlbumOverride(item: BatchItemDraft): boolean {
  return item.albumOverride !== undefined;
}

export function batchHasCaptionOverride(item: BatchItemDraft): boolean {
  return item.captionOverride !== undefined;
}

/** The Album this item is actually saved into, common value or override. */
export function batchEffectiveAlbumId(session: BatchSession, item: BatchItemDraft): string | null {
  return item.albumOverride !== undefined ? item.albumOverride.albumId : session.albumId;
}

/** The description this item is actually saved with, common value or override. */
export function batchEffectiveCaption(session: BatchSession, item: BatchItemDraft): string | null {
  return item.captionOverride !== undefined ? item.captionOverride.caption : (session.caption.trim() || null);
}

/**
 * Change the COMMON Album. Item overrides are returned by identity and are
 * therefore untouched: editing the common Album can never silently erase an
 * explicit per-item exception.
 */
export function setBatchAlbum(session: BatchSession, albumId: string | null): BatchSession {
  return { ...session, albumId };
}

/** Give ONE item an explicit Album, including an explicit "Sin album". */
export function setItemAlbumOverride(session: BatchSession, index: number, albumId: string | null): BatchSession {
  const items = session.items.map((item, position) => (position === index ? { ...item, albumOverride: { albumId } } : item));
  return { ...session, items };
}

/** Return ONE item to following the common Album again. */
export function clearItemAlbumOverride(session: BatchSession, index: number): BatchSession {
  const items = session.items.map((item, position) => {
    if (position !== index || item.albumOverride === undefined) return item;
    const next = { ...item };
    delete next.albumOverride;
    return next;
  });
  return { ...session, items };
}

/** Change the COMMON description, never touching an item's override. */
export function setBatchCaption(session: BatchSession, caption: string): BatchSession {
  return { ...session, caption };
}

/** Give ONE item an explicit description, including an explicit "no text". */
export function setItemCaptionOverride(session: BatchSession, index: number, caption: string | null): BatchSession {
  const items = session.items.map((item, position) => (position === index ? { ...item, captionOverride: { caption } } : item));
  return { ...session, items };
}

/** Return ONE item to following the common description again. */
export function clearItemCaptionOverride(session: BatchSession, index: number): BatchSession {
  const items = session.items.map((item, position) => {
    if (position !== index || item.captionOverride === undefined) return item;
    const next = { ...item };
    delete next.captionOverride;
    return next;
  });
  return { ...session, items };
}

// ---------------------------------------------------------------------------
// RESOLUTION — the exact per-item submission payload
// ---------------------------------------------------------------------------

/**
 * Project the session into the per-item payloads the existing submit path
 * already accepts. There is no batch-level `capturedAt` to read here by
 * construction: every value is read from `item.date`, which only that item can
 * write.
 */
export function batchResolvedItems(session: BatchSession): BatchResolvedItem[] {
  return session.items.map((item) => {
    const albumId = batchEffectiveAlbumId(session, item);
    const caption = batchEffectiveCaption(session, item);
    try {
      const value = semanticDateValueFromDraft(item.date);
      return {
        draftId: item.draftId,
        label: item.label,
        draft: item.draft,
        dateError: null,
        metadata: {
          caption,
          initialAlbumId: albumId,
          capturePrecision: value.precision,
          capturedAt: value.capturedAt,
          capturedYear: value.capturedYear,
          capturedMonth: value.capturedMonth,
        },
      };
    } catch (error) {
      return {
        draftId: item.draftId,
        label: item.label,
        draft: item.draft,
        dateError: error instanceof Error ? error.message : 'Elegí una fecha válida.',
        metadata: {
          caption,
          initialAlbumId: albumId,
          capturePrecision: 'unknown' as const,
          capturedAt: null,
          capturedYear: null,
          capturedMonth: null,
        },
      };
    }
  });
}

/** The first invalid date in the batch, so Save can refuse with a reason. */
export function batchDateError(session: BatchSession): string | null {
  for (const item of session.items) {
    const error = semanticDateDraftError(item.date);
    if (error) return error;
  }
  return null;
}

export function batchCount(session: BatchSession): number {
  return session.items.length;
}

export function batchLabel(session: BatchSession): string {
  return `${session.activeIndex + 1} de ${session.items.length}`;
}

/** An empty draft list is not a batch; the caller must handle it explicitly. */
export function batchIsEmpty(session: BatchSession): boolean {
  return session.items.length === 0;
}

/** A fresh, empty date draft, exported so callers never hand-roll one. */
export function emptyBatchItemDate(): SemanticDateDraft {
  return emptySemanticDateDraft();
}