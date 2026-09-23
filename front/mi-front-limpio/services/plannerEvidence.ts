import { supabase } from '../supabase';

const EVIDENCE_BUCKET = 'planner-evidence';

export async function uploadPlannerEvidencePhoto(
  accessToken: string,
  householdId: string,
  taskId: string,
  uri: string
): Promise<string> {
  // Convert file URI to blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // Generate unique path: householdId/taskId/timestamp_random.jpg
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${householdId}/${taskId}/${timestamp}_${random}.${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function deletePlannerEvidencePhoto(photoUrl: string): Promise<void> {
  // Extract path from public URL
  const url = new URL(photoUrl);
  const pathParts = url.pathname.split('/');
  const bucketIndex = pathParts.indexOf(EVIDENCE_BUCKET);
  if (bucketIndex === -1 || bucketIndex + 1 >= pathParts.length) {
    return; // Not a valid evidence URL
  }
  const path = pathParts.slice(bucketIndex + 1).join('/');

  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
  if (error) {
    console.warn('Failed to delete evidence photo:', error.message);
  }
}

export function getEvidencePhotoUrl(path: string): string {
  const { data } = supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}