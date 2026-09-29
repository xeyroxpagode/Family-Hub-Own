import { Directory, File, Paths } from 'expo-file-system';
import { Linking } from 'react-native';
import { requestJson } from '../api';
import type { HomeCloudFile } from './homecloudTypes';

type ContentAccessResponse = { signedUrl: string; contentId: string; variant: 'original' };

function safeFileName(value: string): string {
  const name = value.replace(/[\\/:*?"<>|]/g, '_').trim();
  return name || 'homecloud-download';
}

/**
 * Foreground download baseline. `DownloadTask` keeps bytes in native file I/O;
 * resume-state persistence and queue orchestration intentionally remain later
 * slice work.
 */
export async function downloadHomeCloudOriginal(accessToken: string, content: HomeCloudFile): Promise<{ uri: string; name: string }> {
  const access = await requestJson<ContentAccessResponse>(
    `/api/homecloud/content/${content.id}/access?variant=original`,
    { accessToken },
  );
  const directory = new Directory(Paths.document, 'HomeCloud');
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, safeFileName(content.displayName));
  const task = File.createDownloadTask(access.signedUrl, destination, { sessionType: 'foreground' });
  try {
    const localFile = await task.downloadAsync();
    if (!localFile) throw new Error('La descarga fue pausada antes de finalizar.');
    return { uri: localFile.uri, name: localFile.name };
  } finally {
    task.release();
  }
}

export async function openHomeCloudDownloadedFile(uri: string): Promise<void> {
  if (!await Linking.canOpenURL(uri)) {
    throw new Error('Este dispositivo no puede abrir el archivo descargado.');
  }
  await Linking.openURL(uri);
}
