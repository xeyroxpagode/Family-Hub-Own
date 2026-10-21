/**
 * HC-3E B1 — editor session state machine (pure).
 *
 * Owns everything that can go wrong around image generation: temp-file
 * ownership, async confirmation, cancellation mid-processing and error states.
 * The editor screen is a thin adapter: it translates UI/native events into
 * `EditorSessionEvent`s, executes the returned `EditorSessionEffect`s and
 * renders the returned state. Every rule below is therefore unit-testable.
 *
 * Ownership contract (G):
 * - The editor owns every temp file it generates until it hands it over.
 * - `hand-off` transfers ownership to the Scanner via a serializable outcome;
 *   from that moment the editor must NOT delete the file, and the Scanner must.
 * - Cancel, unmount, stale results and preview replacement always delete the
 *   file still owned here. Nothing is deleted twice.
 *
 * Async confirmation contract (F):
 * - A confirm can only succeed after `process-succeeded` produced a validated
 *   file for THIS ticket. A result for an older ticket is discarded (deleted),
 *   which closes the stale-`processedUri` closure failure class for good: the
 *   reducer reacts to the explicit result, never to a React state snapshot.
 */

import { FULL_CROP_QUAD, rectToQuad, type Quad, type Rect, type Size } from './homecloudScannerGeometry';
import type { ScannerPageEdit } from './homecloudScanner';

export type EditorSessionPhase = 'editing' | 'processing';

export interface EditorSessionState {
  readonly phase: EditorSessionPhase;
  /** Controlled error message; null while healthy. */
  readonly errorMessage: string | null;
  /**
   * Temp file currently owned by the editor and displayed as a preview.
   * INVARIANT: while non-null it is the exact render of the CURRENT edit —
   * any edit change deletes it and clears the preview.
   */
  readonly previewUri: string | null;
  /** Pixel dimensions of the preview file, for display. */
  readonly previewSize: Size | null;
  /** True once the preview file has been handed to the parent. */
  readonly adopted: boolean;
  /** In-flight processing request, null when idle. */
  readonly pending: { readonly purpose: 'preview' | 'confirm'; readonly ticket: number } | null;
  /** Monotonic ticket source; results must match the live ticket. */
  readonly lastTicket: number;
}

export const INITIAL_EDITOR_SESSION: EditorSessionState = {
  phase: 'editing',
  errorMessage: null,
  previewUri: null,
  previewSize: null,
  adopted: false,
  pending: null,
  lastTicket: 0,
};

export type EditorSessionEvent =
  /** Any change to crop/rotation while previewing: the preview is obsolete. */
  | { readonly type: 'user-edits' }
  /** Request image generation. Ignored while another request is in flight. */
  | { readonly type: 'process-requested'; readonly purpose: 'preview' | 'confirm' }
  /** Native generation finished. Stale tickets are deleted, never adopted. */
  | {
      readonly type: 'process-succeeded';
      readonly ticket: number;
      readonly uri: string;
      readonly size: Size;
      readonly sessionAlive: boolean;
      /** Edit the generated file renders; carried by the confirm hand-off. */
      readonly edit: ScannerPageEdit;
    }
  /** Native generation failed, or the plan was invalid. */
  | {
      readonly type: 'process-failed';
      readonly ticket: number;
      readonly message: string;
      readonly sessionAlive: boolean;
    }
  /** Confirm with the preview that matches the current edit. */
  | { readonly type: 'confirmed'; readonly edit: ScannerPageEdit }
  /** Close button / back gesture / unmount: discard what is still owned. */
  | { readonly type: 'cancelled' };

export type EditorSessionEffect =
  | { readonly kind: 'delete-file'; readonly uri: string }
  | { readonly kind: 'hand-off'; readonly uri: string; readonly edit: ScannerPageEdit };

export interface EditorSessionResolution {
  readonly state: EditorSessionState;
  readonly effects: readonly EditorSessionEffect[];
}

const NO_EFFECTS: readonly EditorSessionEffect[] = [];

function resolve(
  state: EditorSessionState,
  next: Partial<EditorSessionState>,
  effects: readonly EditorSessionEffect[] = NO_EFFECTS,
): EditorSessionResolution {
  return { state: { ...state, ...next }, effects };
}

/** Effects to execute when the screen goes away: delete everything still owned. */
export function editorSessionAbandonEffects(state: EditorSessionState): readonly EditorSessionEffect[] {
  if (state.adopted || !state.previewUri) return [];
  return [{ kind: 'delete-file', uri: state.previewUri }];
}

export function reduceEditorSession(
  state: EditorSessionState,
  event: EditorSessionEvent,
): EditorSessionResolution {
  switch (event.type) {
    case 'user-edits': {
      if (state.adopted) return resolve(state, {});
      if (state.phase === 'processing') return resolve(state, {});
      if (!state.previewUri) return resolve(state, { errorMessage: null });
      return resolve(
        state,
        { previewUri: null, previewSize: null, errorMessage: null },
        [{ kind: 'delete-file', uri: state.previewUri }],
      );
    }

    case 'process-requested': {
      if (state.adopted) return resolve(state, {});
      if (state.phase === 'processing') return resolve(state, {});
      const ticket = state.lastTicket + 1;
      const effects: EditorSessionEffect[] = state.previewUri
        ? [{ kind: 'delete-file', uri: state.previewUri }]
        : [];
      return resolve(
        state,
        {
          phase: 'processing',
          errorMessage: null,
          previewUri: null,
          previewSize: null,
          pending: { purpose: event.purpose, ticket },
          lastTicket: ticket,
        },
        effects,
      );
    }

    case 'process-succeeded': {
      const pending = state.pending;
      if (!pending || pending.ticket !== event.ticket) {
        // Stale result (superseded or session gone): the file nobody owns dies.
        return resolve(state, {}, [{ kind: 'delete-file', uri: event.uri }]);
      }
      if (!event.sessionAlive) {
        // Cancelled/unmounted while generating: nothing adopts this file.
        return resolve(
          state,
          { phase: 'editing', pending: null },
          [{ kind: 'delete-file', uri: event.uri }],
        );
      }
      if (pending.purpose === 'confirm') {
        return resolve(
          state,
          {
            phase: 'editing',
            pending: null,
            previewUri: event.uri,
            previewSize: event.size,
            adopted: true,
          },
          [{ kind: 'hand-off', uri: event.uri, edit: event.edit }],
        );
      }
      return resolve(
        state,
        {
          phase: 'editing',
          pending: null,
          previewUri: event.uri,
          previewSize: event.size,
        },
      );
    }

    case 'process-failed': {
      const pending = state.pending;
      if (!pending || pending.ticket !== event.ticket) return resolve(state, {});
      if (!event.sessionAlive) {
        return resolve(state, { phase: 'editing', pending: null });
      }
      return resolve(state, { phase: 'editing', pending: null, errorMessage: event.message });
    }

    case 'confirmed': {
      if (state.adopted || state.phase === 'processing' || !state.previewUri) {
        return resolve(state, {});
      }
      return resolve(
        state,
        { adopted: true },
        [{ kind: 'hand-off', uri: state.previewUri, edit: event.edit }],
      );
    }

    case 'cancelled': {
      if (state.adopted) return resolve(state, {});
      const effects: EditorSessionEffect[] = state.previewUri
        ? [{ kind: 'delete-file', uri: state.previewUri }]
        : [];
      return resolve(
        state,
        { phase: 'editing', previewUri: null, previewSize: null, pending: null, errorMessage: null },
        effects,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// display sources
// ---------------------------------------------------------------------------

export interface EditorDisplaySource {
  readonly uri: string;
  /** Dims the image element must be sized to (see geometry `rotatedImageSize`). */
  readonly size: Size;
  /** Rotation to apply visually; 0 while previewing the processed result. */
  readonly rotationSteps: 0 | 1 | 2 | 3;
  /** Selection the overlay must show; full frame while previewing. */
  readonly cropRect: Rect;
  readonly cropQuad: Quad;
}

export interface EditorDisplayInputs {
  readonly originalUri: string;
  readonly source: Size;
  readonly edit: ScannerPageEdit;
  readonly session: EditorSessionState;
}

/**
 * What to render and where the overlay lives, derived — never stored. While a
 * preview exists it IS the applied edit, so the surface shows it with a full
 * frame and no rotation; otherwise it shows the original with the live edit.
 */
export function editorDisplaySource(inputs: EditorDisplayInputs): EditorDisplaySource {
  const { session, edit } = inputs;
  if (session.previewUri && session.previewSize) {
    return {
      uri: session.previewUri,
      size: session.previewSize,
      rotationSteps: 0,
      cropRect: { x: 0, y: 0, width: 1, height: 1 },
      cropQuad: FULL_CROP_QUAD,
    };
  }
  return {
    uri: inputs.originalUri,
    size: inputs.source,
    rotationSteps: edit.rotationSteps,
    cropRect: edit.cropRect,
    cropQuad: edit.cropQuad ?? rectToQuad(edit.cropRect),
  };
}
