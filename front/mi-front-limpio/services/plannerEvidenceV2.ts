import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { requestJson, OPERATION_KINDS } from './api';
import { createIdempotencyKey } from './idempotency';
import { copyArtifactToDurableWorkspace } from './homecloud/homecloudDurableArtifact';
import type { UploadLocalArtifact } from './homecloud/homecloudUploadTypes';
import { uploadSignedLocalArtifact } from './uploads/nativeSignedUploadTransport';
import type { UploadExecutionControls, UploadQueueJob } from './uploads/uploadCoordinator';

export type EvidenceLocalArtifact = UploadLocalArtifact & {
  durationMs: number | null;
  width: number | null;
  height: number | null;
  mediaKind: 'image' | 'video';
};

export type EvidenceDraftItem = UploadQueueJob & {
  localId: string;
  artifact: EvidenceLocalArtifact;
  remoteArtifactId: string | null;
  state: 'local' | 'registering' | 'uploading' | 'confirming' | 'confirmed' | 'error' | 'cancelled';
  error: string | null;
  intakeIdempotencyKey: string;
};

export type EvidenceSubmission = {
  id: string; version: number; fulfillment_id: string; status: 'awaiting_verification' | 'approved' | 'correction_requested' | 'replaced' | 'cancelled';
  submitted_at: string; reviewed_at: string | null; correction_reason: string | null; is_current: boolean;
  retain_until: string | null; media_purged_at: string | null;
  submitter?: { id: string; people?: { display_name?: string | null; avatar_url?: string | null } | null } | null;
  reviewer?: { id: string; people?: { display_name?: string | null; avatar_url?: string | null } | null } | null;
  media: Array<{ id: string; position: number; artifact: { id: string; display_name: string; mime_type: string; state: string; purged_at: string | null } }>;
};

const draftKey = (householdId: string, taskId: string) => `planner:evidence:draft:${householdId}:${taskId}`;
const randomId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

function extensionFor(asset: ImagePicker.ImagePickerAsset): string | null {
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  if (asset.mimeType === 'image/jpeg') return 'jpg';
  if (asset.mimeType?.startsWith('image/')) return asset.mimeType.slice(6);
  if (asset.mimeType === 'video/quicktime') return 'mov';
  if (asset.mimeType?.startsWith('video/')) return asset.mimeType.slice(6);
  return null;
}

async function mapPickedAssets(assets: ImagePicker.ImagePickerAsset[]): Promise<EvidenceLocalArtifact[]> {
  return Promise.all(assets.map(async (asset, index) => {
    const mediaKind = asset.type === 'video' ? 'video' : 'image';
    const extension = extensionFor(asset);
    const base: EvidenceLocalArtifact = {
      localUri: asset.uri,
      displayName: asset.fileName || `evidencia-${Date.now()}-${index + 1}.${extension || (mediaKind === 'image' ? 'jpg' : 'mp4')}`,
      mimeType: asset.mimeType || (mediaKind === 'image' ? 'image/jpeg' : 'video/mp4'),
      sizeBytes: asset.fileSize || 0,
      extension,
      durationMs: typeof asset.duration === 'number' ? asset.duration : null,
      width: asset.width || null,
      height: asset.height || null,
      mediaKind,
    };
    const durable = await copyArtifactToDurableWorkspace(base);
    return { ...base, ...durable };
  }));
}

export async function chooseEvidenceMedia(): Promise<EvidenceLocalArtifact[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Necesitamos acceso a tus fotos y videos.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, orderedSelection: true, quality: 1 });
  return result.canceled ? [] : mapPickedAssets(result.assets);
}

export async function captureEvidencePhoto(): Promise<EvidenceLocalArtifact[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Necesitamos acceso a la cámara.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  return result.canceled ? [] : mapPickedAssets(result.assets);
}

export async function captureEvidenceVideo(): Promise<EvidenceLocalArtifact[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Necesitamos acceso a la cámara y el micrófono.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], quality: 1, videoQuality: ImagePicker.UIImagePickerControllerQualityType.High });
  return result.canceled ? [] : mapPickedAssets(result.assets);
}

export function createEvidenceDraftItems(artifacts: EvidenceLocalArtifact[]): EvidenceDraftItem[] {
  return artifacts.map((artifact) => {
    const jobId = randomId('evidence');
    return { jobId, localId: jobId, artifact, remoteArtifactId: null, state: 'local', queueState: 'queued', progress: 0, bytesSent: 0, totalBytes: artifact.sizeBytes, error: null, intakeIdempotencyKey: createIdempotencyKey('planner.evidence.artifact') };
  });
}

export async function saveEvidenceDraft(householdId: string, taskId: string, items: EvidenceDraftItem[]): Promise<void> {
  await AsyncStorage.setItem(draftKey(householdId, taskId), JSON.stringify(items));
}

export async function loadEvidenceDraft(householdId: string, taskId: string): Promise<EvidenceDraftItem[]> {
  const raw = await AsyncStorage.getItem(draftKey(householdId, taskId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      jobId: item.jobId || item.localId,
      queueState: item.state === 'confirmed' ? 'completed' : item.queueState || 'queued',
      progress: Number(item.progress) || 0,
      bytesSent: Number(item.bytesSent) || 0,
      totalBytes: Number(item.totalBytes) || Number(item.artifact?.sizeBytes) || 0,
    }));
  } catch { return []; }
}

export async function clearEvidenceDraft(householdId: string, taskId: string): Promise<void> {
  await AsyncStorage.removeItem(draftKey(householdId, taskId));
}

export async function uploadEvidenceArtifact(accessToken: string, taskId: string, item: EvidenceDraftItem, controls: UploadExecutionControls<EvidenceDraftItem>): Promise<EvidenceDraftItem> {
  try {
    controls.patch({ state: 'registering', error: null });
    // Registration is deliberately replayed with the stable intake key. The
    // backend returns the same artifact, and reactivates that same row/path
    // after cancellation, so retry cannot allocate duplicate storage objects.
    const registered = await requestJson<{ artifact: { id: string } }>(`/api/planner/tasks/${taskId}/evidence/artifacts`, {
      method: 'POST', accessToken, operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT, idempotencyKey: item.intakeIdempotencyKey,
      body: { displayName: item.artifact.displayName, mimeType: item.artifact.mimeType, sizeBytes: item.artifact.sizeBytes, durationMs: item.artifact.durationMs, width: item.artifact.width, height: item.artifact.height, intakeIdempotencyKey: item.intakeIdempotencyKey },
    });
    const remoteArtifactId = registered.artifact.id;
    controls.patch({ remoteArtifactId });
    const cleanupIfCancelled = async () => {
      if (!controls.isCancelled()) return false;
      await cancelEvidenceArtifact(accessToken, taskId, { ...item, remoteArtifactId });
      return true;
    };
    if (await cleanupIfCancelled()) throw new Error('upload_cancelled');
    const authorization = await requestJson<{ signedUploadUrl?: string; alreadyConfirmed?: boolean }>(`/api/planner/tasks/${taskId}/evidence/artifacts/${remoteArtifactId}/authorize`, { method: 'POST', accessToken });
    if (!authorization.alreadyConfirmed) {
      controls.patch({ state: 'uploading' });
      const controller = new AbortController();
      controls.registerCancel(() => controller.abort());
      const upload = await uploadSignedLocalArtifact({
        signedUploadUrl: authorization.signedUploadUrl!, localUri: item.artifact.localUri,
        mimeType: item.artifact.mimeType, signal: controller.signal,
        onProgress: ({ bytesSent, totalBytes }) => controls.progress(bytesSent, totalBytes),
      });
      if (!upload.ok) throw new Error(`La carga respondió ${upload.status}.`);
      if (await cleanupIfCancelled()) throw new Error('upload_cancelled');
      controls.patch({ state: 'confirming' });
      await requestJson(`/api/planner/tasks/${taskId}/evidence/artifacts/${remoteArtifactId}/confirm`, { method: 'POST', accessToken });
      if (await cleanupIfCancelled()) throw new Error('upload_cancelled');
    }
    controls.patch({ state: 'confirmed', remoteArtifactId, error: null });
    return { ...item, remoteArtifactId, state: 'confirmed', error: null, progress: 1, bytesSent: item.artifact.sizeBytes, totalBytes: item.artifact.sizeBytes };
  } catch (error) {
    if (controls.isCancelled()) throw error;
    const message = error instanceof Error ? error.message : 'No se pudo subir el archivo.';
    controls.patch({ state: 'error', error: message });
    throw error;
  }
}

export async function cancelEvidenceArtifact(accessToken: string, taskId: string, item: EvidenceDraftItem): Promise<void> {
  if (!item.remoteArtifactId) return;
  await requestJson(`/api/planner/tasks/${taskId}/evidence/artifacts/${item.remoteArtifactId}/cancel`, { method: 'POST', accessToken });
}

export async function submitEvidenceVersion(accessToken: string, taskId: string, fulfillmentId: string, expectedVersion: number, artifactIds: string[], idempotencyKey: string) {
  return requestJson(`/api/planner/tasks/${taskId}/evidence/submissions/${fulfillmentId}`, {
    method: 'POST', accessToken, operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT, idempotencyKey,
    body: { expectedVersion, artifactIds },
  });
}

export async function getEvidenceSubmissions(accessToken: string, taskId: string) {
  return requestJson<{ submissions: EvidenceSubmission[] }>(`/api/planner/tasks/${taskId}/evidence/submissions`, { accessToken });
}

export async function reviewEvidenceVersion(accessToken: string, taskId: string, fulfillmentId: string, submissionId: string, expectedVersion: number, action: 'approve' | 'request_correction', reason?: string) {
  return requestJson(`/api/planner/tasks/${taskId}/evidence/submissions/${fulfillmentId}/${submissionId}/review`, {
    method: 'POST', accessToken, body: { expectedVersion, action, reason },
  });
}

export async function getEvidenceMediaAccess(accessToken: string, taskId: string, artifactId: string) {
  return requestJson<{ signedUrl: string; mimeType: string; expiresIn: number }>(`/api/planner/tasks/${taskId}/evidence/media/${artifactId}/access`, { accessToken });
}
