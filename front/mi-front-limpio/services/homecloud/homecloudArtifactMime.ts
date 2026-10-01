import * as FileSystem from 'expo-file-system/legacy';

export type CapturedArtifactKind = 'image' | 'video';
export type CapturedArtifactFormat = { mimeType: string; extension: string };

const EXTENSION_FORMATS: Record<string, CapturedArtifactFormat> = {
  jpg: { mimeType: 'image/jpeg', extension: 'jpg' },
  jpeg: { mimeType: 'image/jpeg', extension: 'jpg' },
  png: { mimeType: 'image/png', extension: 'png' },
  heic: { mimeType: 'image/heic', extension: 'heic' },
  heif: { mimeType: 'image/heif', extension: 'heif' },
  mp4: { mimeType: 'video/mp4', extension: 'mp4' },
  mov: { mimeType: 'video/quicktime', extension: 'mov' },
  m4v: { mimeType: 'video/x-m4v', extension: 'm4v' },
  '3gp': { mimeType: 'video/3gpp', extension: '3gp' },
  '3g2': { mimeType: 'video/3gpp2', extension: '3g2' },
};

function formatFromUri(uri: string): CapturedArtifactFormat | null {
  const path = uri.split('?')[0] ?? uri;
  const extension = /\.([a-z0-9]{1,8})$/i.exec(path)?.[1]?.toLowerCase();
  return extension ? EXTENSION_FORMATS[extension] ?? null : null;
}

function bytesFromBase64(value: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const character of value.replace(/=+$/, '')) {
    const index = alphabet.indexOf(character);
    if (index < 0) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

function formatFromMagicBytes(bytes: number[]): CapturedArtifactFormat | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return EXTENSION_FORMATS.jpg;
  if (bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') return EXTENSION_FORMATS.png;
  if (String.fromCharCode(...bytes.slice(0, 6)) === 'GIF87a' || String.fromCharCode(...bytes.slice(0, 6)) === 'GIF89a') {
    return { mimeType: 'image/gif', extension: 'gif' };
  }
  const brand = String.fromCharCode(...bytes.slice(4, 12));
  if (brand === 'ftypheic' || brand === 'ftypheix') return EXTENSION_FORMATS.heic;
  if (brand === 'ftypheif' || brand === 'ftypmif1') return EXTENSION_FORMATS.heif;
  // The previous `ftyp -> mp4` collapsed every ISO BMFF brand into MP4. A
  // gallery MOV (`ftypqt`) or 3GP (`ftyp3gp*`/`ftyp3g2*`) staged as MP4 keeps
  // working byte-wise, but the stored MIME/extension lie. Distinguish the
  // brands we can name honestly; anything else stays MP4 (same as before).
  if (brand.startsWith('ftypqt')) return EXTENSION_FORMATS.mov;
  if (brand.startsWith('ftyp3gp')) return EXTENSION_FORMATS['3gp'];
  if (brand.startsWith('ftyp3g2')) return EXTENSION_FORMATS['3g2'];
  if (brand.startsWith('ftypM4V')) return EXTENSION_FORMATS.m4v;
  if (brand.startsWith('ftyp')) return EXTENSION_FORMATS.mp4;
  return null;
}

/**
 * Determine the capture artifact format from evidence without re-encoding it.
 * A URI extension is preferred; only an extension-less URI reads a bounded
 * 32-byte header. Unknown artifacts fail rather than being mislabeled JPEG.
 */
export async function resolveCapturedArtifactFormat(uri: string, kind: CapturedArtifactKind): Promise<CapturedArtifactFormat> {
  const fromUri = formatFromUri(uri);
  if (fromUri) return fromUri;

  const header = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
    position: 0,
    length: 32,
  });
  const fromHeader = formatFromMagicBytes(bytesFromBase64(header));
  if (fromHeader && fromHeader.mimeType.startsWith(`${kind}/`)) return fromHeader;
  throw new Error('No pudimos determinar de forma segura el formato de la captura.');
}

/**
 * Gallery video honest-format probe (byte-preserving, bounded header).
 *
 * The native gallery cache filename LIES on both platforms (Android always
 * stages video as `.mp4`, iOS legacy stages as `.mov`), and `fileName`/`mime`
 * can be null on Android when the ContentResolver query misses. Trusting the
 * picker claims alone stores a dishonest MIME/extension while the bytes stay
 * correct — and a dishonest extension is the first real image-vs-video
 * divergence before register.
 *
 * This probe reads ONLY a bounded 32-byte header (never the full video into
 * JS RAM), maps it through the same magic-byte table, and returns the honest
 * video format when the bytes name one. Otherwise it returns null so the
 * caller keeps the picker-derived values and never blocks a valid video.
 * No transcoding, no re-encode, no second uploader: bytes are untouched.
 */
export async function probeGalleryVideoFormat(localUri: string): Promise<CapturedArtifactFormat | null> {
  try {
    const header = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 32,
    });
    const fromHeader = formatFromMagicBytes(bytesFromBase64(header));
    if (fromHeader && fromHeader.mimeType.startsWith('video/')) return fromHeader;
    return null;
  } catch {
    return null;
  }
}
