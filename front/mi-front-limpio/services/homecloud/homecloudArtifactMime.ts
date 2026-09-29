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
