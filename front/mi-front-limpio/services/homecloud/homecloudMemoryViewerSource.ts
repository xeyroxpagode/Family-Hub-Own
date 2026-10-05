import type { HomeCloudMemoryListItem } from './homecloudTypes';
import type { MemoryCollectionRef } from './homecloudMemoryCollectionsPagination';

export type MemoryViewerSource =
  | { readonly kind: 'library'; readonly label: 'Recuerdos' }
  | { readonly kind: 'album'; readonly sourceId: string; readonly label: string }
  | { readonly kind: 'collection'; readonly sourceId: string; readonly collection: MemoryCollectionRef; readonly label: string };

/**
 * A Viewer session is SOURCE IDENTITY plus the OPENING AUTHORITY, nothing else.
 *
 * HC2-C removed the old `memories` snapshot field. It was DEAD: the Viewer always
 * consumed the LIVE dataset resolved by `memoryViewerDataset`, so the snapshot
 * taken at open was never read by anyone. Carrying it was not merely useless, it
 * was a lie about what the Viewer pages over: a snapshot invites exactly the
 * "the dataset emptied, switch to another source" behaviour HC2-C forbids.
 *
 * The dataset therefore comes from ONE place — `memoryViewerDataset` over the
 * live owner state — and can never disagree with the source it was opened with.
 */
export type MemoryViewerSession = {
  readonly source: MemoryViewerSource;
  readonly activeContentId: string;
};

export function libraryViewerSession(activeContentId: string): MemoryViewerSession {
  return { source: { kind: 'library', label: 'Recuerdos' }, activeContentId };
}

export function albumViewerSession(
  albumId: string,
  albumName: string | null,
  activeContentId: string,
): MemoryViewerSession {
  return {
    source: { kind: 'album', sourceId: albumId, label: albumName ?? 'Álbum' },
    activeContentId,
  };
}

export function collectionViewerSession(
  ref: MemoryCollectionRef,
  collectionId: string,
  label: string,
  activeContentId: string,
): MemoryViewerSession {
  return {
    source: { kind: 'collection', sourceId: collectionId, collection: ref, label },
    activeContentId,
  };
}

export function memoryViewerDataset(
  source: MemoryViewerSource,
  datasets: {
    readonly library: readonly HomeCloudMemoryListItem[];
    readonly album: { readonly sourceId: string | null; readonly memories: readonly HomeCloudMemoryListItem[] };
    readonly collection: { readonly sourceId: string | null; readonly memories: readonly HomeCloudMemoryListItem[] };
  },
): readonly HomeCloudMemoryListItem[] {
  if (source.kind === 'library') return datasets.library;
  if (source.kind === 'album') return source.sourceId === datasets.album.sourceId ? datasets.album.memories : [];
  if (source.sourceId !== datasets.collection.sourceId) return [];
  const ref = source.collection;
  return ref.kind === 'type'
    ? datasets.collection.memories.filter((memory) => memory.kind === ref.memoryKind)
    : datasets.collection.memories;
}
