import type { HomeCloudMemoryListItem } from './homecloudTypes';
import type { MemoryCollectionRef } from './homecloudMemoryCollectionsPagination';

export type MemoryViewerSource =
  | { readonly kind: 'library'; readonly label: 'Recuerdos' }
  | { readonly kind: 'album'; readonly sourceId: string; readonly label: string }
  | { readonly kind: 'collection'; readonly sourceId: string; readonly collection: MemoryCollectionRef; readonly label: string };

export type MemoryViewerSession = {
  readonly source: MemoryViewerSource;
  readonly memories: readonly HomeCloudMemoryListItem[];
  readonly activeContentId: string;
};

export function libraryViewerSession(
  memories: readonly HomeCloudMemoryListItem[],
  activeContentId: string,
): MemoryViewerSession {
  return { source: { kind: 'library', label: 'Recuerdos' }, memories, activeContentId };
}

export function albumViewerSession(
  albumId: string,
  albumName: string | null,
  memories: readonly HomeCloudMemoryListItem[],
  activeContentId: string,
): MemoryViewerSession {
  return { source: { kind: 'album', sourceId: albumId, label: albumName ?? 'Álbum' }, memories, activeContentId };
}

export function collectionViewerSession(
  ref: MemoryCollectionRef,
  collectionId: string,
  label: string,
  memories: readonly HomeCloudMemoryListItem[],
  activeContentId: string,
): MemoryViewerSession {
  const scoped = ref.kind === 'type'
    ? memories.filter((memory) => memory.kind === ref.memoryKind)
    : memories;
  return {
    source: { kind: 'collection', sourceId: collectionId, collection: ref, label },
    memories: scoped,
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
