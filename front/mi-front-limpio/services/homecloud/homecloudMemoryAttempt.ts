export type MemoryAttemptSource = 'gallery' | 'camera' | 'audio-import' | 'audio-record';
export type MemoryAttemptKind = 'image' | 'video' | 'audio';

export type MemoryAttempt = {
  id: string;
  source: MemoryAttemptSource;
  kind: MemoryAttemptKind;
  label: 'gallery_image' | 'gallery_video' | 'camera_photo' | 'camera_video' | 'audio_import' | 'audio_record';
};

let nextAttemptId = 1;

function labelFor(source: MemoryAttemptSource, kind: MemoryAttemptKind): MemoryAttempt['label'] {
  if (source === 'camera') return kind === 'video' ? 'camera_video' : 'camera_photo';
  if (source === 'gallery') return kind === 'video' ? 'gallery_video' : 'gallery_image';
  return source === 'audio-record' ? 'audio_record' : 'audio_import';
}

export function reclassifyMemoryAttempt(attempt: MemoryAttempt, kind: MemoryAttemptKind): void {
  attempt.kind = kind;
  attempt.label = labelFor(attempt.source, kind);
}

/** Single authority for every async Memory Create source owned by one intake mount. */
export class MemoryAttemptAuthority {
  private current: MemoryAttempt | null = null;
  private disposed = false;

  begin(source: MemoryAttemptSource, kind: MemoryAttemptKind): MemoryAttempt {
    const attempt: MemoryAttempt = { id: `a${nextAttemptId++}`, source, kind, label: labelFor(source, kind) };
    this.current = attempt;
    return attempt;
  }

  owns(attempt: MemoryAttempt): boolean {
    return !this.disposed && this.current?.id === attempt.id;
  }

  invalidate(attempt?: MemoryAttempt): void {
    if (!attempt || this.current?.id === attempt.id) this.current = null;
  }

  dispose(): void {
    this.disposed = true;
    this.current = null;
  }
}
