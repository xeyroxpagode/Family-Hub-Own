import { OPERATION_KINDS, requestJson } from '../api';
import type { HomeCloudFile, HomeCloudFolder } from './homecloudTypes';

export type FileSort = 'recent' | 'name';
export type FilesBrowserResponse = { browser: { folders: HomeCloudFolder[]; files: HomeCloudFile[]; nextOffset: number | null } };

export const fetchFilesBrowser = (accessToken: string, options: { folderId?: string | null; query?: string; sort?: FileSort } = {}) => {
  const params = new URLSearchParams();
  if (options.folderId) params.set('folderId', options.folderId);
  if (options.query?.trim()) params.set('query', options.query.trim());
  params.set('sort', options.sort ?? 'recent');
  return requestJson<FilesBrowserResponse>(`/api/homecloud/files?${params.toString()}`, { accessToken });
};

export const createHomeCloudFolder = (accessToken: string, name: string) => requestJson<{ folder: HomeCloudFolder }>('/api/homecloud/folders', { method: 'POST', accessToken, body: { name }, operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT });
export const renameHomeCloudFolder = (accessToken: string, folderId: string, name: string) => requestJson<{ folder: HomeCloudFolder }>(`/api/homecloud/folders/${folderId}`, { method: 'PATCH', accessToken, body: { name } });
export const deleteHomeCloudFolder = (accessToken: string, folderId: string) => requestJson<void>(`/api/homecloud/folders/${folderId}`, { method: 'DELETE', accessToken });
export const updateHomeCloudFile = (accessToken: string, contentId: string, changes: Partial<{ displayName: string; folderId: string | null; documentDate: string | null; note: string | null }>) => requestJson<{ file: HomeCloudFile }>(`/api/homecloud/content/${contentId}/file`, { method: 'PATCH', accessToken, body: changes });
