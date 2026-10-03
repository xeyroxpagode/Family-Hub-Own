#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1F — DTO Leak Regression Tests.
 *
 * Validates that serialized normal responses DO NOT contain:
 * - original_storage_path
 * - preview_storage_path
 * - originalStoragePath
 * - previewStoragePath
 * - bucket
 * - serviceRole
 *
 * And DO expose:
 * - hasPreview correctly (false when preview_storage_path NULL, true when non-null)
 *
 * MO-A1 (intentional contract change): the Album DTO now exposes `itemCount`
 * (EXACT active-Memory count) and `coverContentId` (a content id or null). The
 * former `itemCount === undefined` expectation froze an earlier slice and is
 * replaced. All leak guards are preserved, and the cover is proven to be a
 * content id only: no URL, no signed URL, no bucket, no storage path.
 */

const path = require('node:path');
const fs = require('node:fs');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

function read(rel) {
  return fs.readFileSync(path.join(path.resolve(__dirname, '..'), rel), 'utf8');
}

console.log('\n=== HC-1F DTO LEAK REGRESSION TESTS ===\n');

// Load the mapper
const { mapContentRowToDto, mapFolderRowToDto, mapAlbumRowToDto } = require('../backend/src/lib/homecloudMappers');

console.log('--- Content Mapper: Storage Path Leak Tests ---');

// Test 1: File with preview path = null -> hasPreview = false
const fileRowNoPreview = {
  id: 'aaa-aaa',
  household_id: 'hhh-hhh',
  role: 'file',
  display_name: 'doc.pdf',
  mime_type: 'application/pdf',
  extension: 'pdf',
  size_bytes: 1024,
  original_storage_path: 'hhh-hhh/aaa-aaa/original',
  preview_storage_path: null,
  uploaded_by_member_id: 'mmm-mmm',
  uploaded_at: '2024-01-01T00:00:00Z',
  document_date: '2024-01-01',
  note: 'Important doc',
  caption: null,
  captured_at: null,
  capture_precision: 'unknown',
  folder_id: 'fff-fff',
  lifecycle: 'active',
};

const fileDtoNoPreview = mapContentRowToDto(fileRowNoPreview);
record(
  fileDtoNoPreview.hasPreview === false,
  'File with NULL preview_storage_path -> hasPreview=false',
);
record(
  fileDtoNoPreview.original_storage_path === undefined,
  'File DTO does NOT contain original_storage_path',
);
record(
  fileDtoNoPreview.preview_storage_path === undefined,
  'File DTO does NOT contain preview_storage_path',
);
record(
  fileDtoNoPreview.bucket === undefined,
  'File DTO does NOT contain bucket',
);
record(
  fileDtoNoPreview.serviceRole === undefined,
  'File DTO does NOT contain serviceRole',
);
record(
  fileDtoNoPreview.originalStoragePath === undefined,
  'File DTO does NOT contain originalStoragePath (camelCase)',
);
record(
  fileDtoNoPreview.previewStoragePath === undefined,
  'File DTO does NOT contain previewStoragePath (camelCase)',
);

// Test 2: File with preview path non-null -> hasPreview = true
const fileRowWithPreview = {
  ...fileRowNoPreview,
  preview_storage_path: 'hhh-hhh/aaa-aaa/preview',
};

const fileDtoWithPreview = mapContentRowToDto(fileRowWithPreview);
record(
  fileDtoWithPreview.hasPreview === true,
  'File with non-NULL preview_storage_path -> hasPreview=true',
);
record(
  fileDtoWithPreview.original_storage_path === undefined,
  'File DTO (with preview) does NOT contain original_storage_path',
);
record(
  fileDtoWithPreview.preview_storage_path === undefined,
  'File DTO (with preview) does NOT contain preview_storage_path',
);

// Test 3: Memory (image) with preview path = null
const memoryImageNoPreview = {
  id: 'bbb-bbb',
  household_id: 'hhh-hhh',
  role: 'memory',
  display_name: 'vacation.jpg',
  mime_type: 'image/jpeg',
  extension: 'jpg',
  size_bytes: 2048,
  original_storage_path: 'hhh-hhh/bbb-bbb/original',
  preview_storage_path: null,
  uploaded_by_member_id: 'mmm-mmm',
  uploaded_at: '2024-01-02T00:00:00Z',
  document_date: null,
  note: null,
  caption: 'Beach day',
  captured_at: '2023-07-15T14:30:00Z',
  capture_precision: 'exact',
  folder_id: null,
  lifecycle: 'active',
};

const memoryDtoNoPreview = mapContentRowToDto(memoryImageNoPreview);
record(
  memoryDtoNoPreview.hasPreview === false,
  'Memory (image) with NULL preview_storage_path -> hasPreview=false',
);
record(
  memoryDtoNoPreview.original_storage_path === undefined,
  'Memory DTO does NOT contain original_storage_path',
);
record(
  memoryDtoNoPreview.preview_storage_path === undefined,
  'Memory DTO does NOT contain preview_storage_path',
);
record(
  'caption' in memoryDtoNoPreview,
  'Memory DTO has caption field',
);
record(
  'capturedAt' in memoryDtoNoPreview,
  'Memory DTO has capturedAt field',
);
record(
  'capturePrecision' in memoryDtoNoPreview,
  'Memory DTO has capturePrecision field',
);
record(
  !('folderId' in memoryDtoNoPreview),
  'Memory DTO does NOT have folderId',
);
record(
  !('documentDate' in memoryDtoNoPreview),
  'Memory DTO does NOT have documentDate',
);
record(
  !('note' in memoryDtoNoPreview),
  'Memory DTO does NOT have note',
);

// Test 4: Memory (image) with preview path non-null
const memoryImageWithPreview = {
  ...memoryImageNoPreview,
  preview_storage_path: 'hhh-hhh/bbb-bbb/preview',
};

const memoryDtoWithPreview = mapContentRowToDto(memoryImageWithPreview);
record(
  memoryDtoWithPreview.hasPreview === true,
  'Memory (image) with non-NULL preview_storage_path -> hasPreview=true',
);

// Test 5: Memory (video)
const memoryVideo = {
  ...memoryImageNoPreview,
  mime_type: 'video/mp4',
  extension: 'mp4',
  display_name: 'video.mp4',
};

const memoryVideoDto = mapContentRowToDto(memoryVideo);
record(
  memoryVideoDto.role === 'memory',
  'Video memory role is "memory"',
);
record(
  memoryVideoDto.mimeType === 'video/mp4',
  'Video memory has correct mimeType',
);

// Test 6: Memory (audio)
const memoryAudio = {
  ...memoryImageNoPreview,
  mime_type: 'audio/mpeg',
  extension: 'mp3',
  display_name: 'song.mp3',
};

const memoryAudioDto = mapContentRowToDto(memoryAudio);
record(
  memoryAudioDto.role === 'memory',
  'Audio memory role is "memory"',
);
record(
  memoryAudioDto.mimeType === 'audio/mpeg',
  'Audio memory has correct mimeType',
);

// Test 7: Folder DTO - minimal, no storage fields
const folderRow = {
  id: 'fff-fff',
  household_id: 'hhh-hhh',
  name: 'Documents',
  created_by_member_id: 'mmm-mmm',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const folderDto = mapFolderRowToDto(folderRow);
record(
  folderDto.id === 'fff-fff',
  'Folder DTO has id',
);
record(
  folderDto.name === 'Documents',
  'Folder DTO has name',
);
record(
  folderDto.createdByMemberId === 'mmm-mmm',
  'Folder DTO has createdByMemberId',
);
record(
  folderDto.original_storage_path === undefined,
  'Folder DTO does NOT contain original_storage_path',
);
record(
  folderDto.preview_storage_path === undefined,
  'Folder DTO does NOT contain preview_storage_path',
);
record(
  folderDto.bucket === undefined,
  'Folder DTO does NOT contain bucket',
);
record(
  folderDto.fileCount === undefined,
  'Folder DTO does NOT contain fileCount (no product aggregates)',
);
record(
  folderDto.totalBytes === undefined,
  'Folder DTO does NOT contain totalBytes (no product aggregates)',
);

// Test 8: Album DTO - exact aggregates, no storage fields
//
// MO-A1 (intentional contract change): the Album DTO NOW exposes
//   itemCount      EXACT number of active Memories in the Album
//   coverContentId OLDEST suitable active visual Memory in Album order, or null
// The previous `itemCount === undefined` expectation froze an earlier slice's
// lack of aggregates and is stale: it is replaced by the approved contract.
// Every unrelated leak guard below is preserved unchanged.
const albumRow = {
  id: 'aaa-aaa',
  household_id: 'hhh-hhh',
  name: 'Vacation 2024',
  created_by_member_id: 'mmm-mmm',
  lifecycle: 'active',
  trashed_at: null,
  trashed_by_member_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const albumDto = mapAlbumRowToDto(albumRow, { itemCount: 3, coverContentId: 'bbb-bbb' });
record(
  albumDto.id === 'aaa-aaa',
  'Album DTO has id',
);
record(
  albumDto.name === 'Vacation 2024',
  'Album DTO has name',
);
record(
  albumDto.createdByMemberId === 'mmm-mmm',
  'Album DTO has createdByMemberId',
);
record(
  albumDto.original_storage_path === undefined,
  'Album DTO does NOT contain original_storage_path',
);
record(
  albumDto.preview_storage_path === undefined,
  'Album DTO does NOT contain preview_storage_path',
);
record(
  albumDto.bucket === undefined,
  'Album DTO does NOT contain bucket',
);
record(
  albumDto.itemCount === 3 && Number.isInteger(albumDto.itemCount) && albumDto.itemCount >= 0,
  'Album DTO exposes the EXACT active-Memory itemCount as an integer >= 0 (MO-A1)',
);
record(
  albumDto.coverContentId === 'bbb-bbb',
  'Album DTO exposes coverContentId as a content id (MO-A1)',
);

// An Album with no suitable active visual Memory has a NULL cover.
const albumWithoutCover = mapAlbumRowToDto(albumRow, { itemCount: 2, coverContentId: null });
record(
  albumWithoutCover.coverContentId === null,
  'Album DTO reports coverContentId = null when there is no suitable visual Memory (MO-A1)',
);
const emptyAlbumDto = mapAlbumRowToDto(albumRow, { itemCount: 0, coverContentId: null });
record(
  emptyAlbumDto.itemCount === 0 && emptyAlbumDto.coverContentId === null,
  'An empty Album reports itemCount 0 and a null cover (MO-A1)',
);

// The DTO can never be projected with a fabricated / truncated count.
for (const badAggregate of [undefined, {}, { itemCount: null }, { itemCount: 1.5 }, { itemCount: -1 }]) {
  let threw = false;
  try {
    mapAlbumRowToDto(albumRow, badAggregate);
  } catch {
    threw = true;
  }
  record(threw, `Album DTO refuses a non-exact itemCount (${JSON.stringify(badAggregate ?? null)})`);
}

// The cover is a CONTENT ID only: no URL, no signed URL, no bucket, no path.
for (const forbiddenCoverKey of [
  'coverUrl', 'cover_url', 'coverSignedUrl', 'signedUrl', 'signed_url',
  'previewUrl', 'preview_url', 'previewStoragePath', 'preview_storage_path',
  'originalStoragePath', 'original_storage_path', 'bucket', 'derivedCover',
  'household_id', 'householdId', 'lifecycle', 'trashed_at', 'trashedAt',
]) {
  record(
    albumDto[forbiddenCoverKey] === undefined,
    `Album DTO does NOT contain ${forbiddenCoverKey}`,
  );
}
record(
  !JSON.stringify(albumDto).includes('storage_path') && !JSON.stringify(albumDto).includes('signed'),
  'Serialized Album DTO carries no storage path and no signed URL',
);

// Test 9: JSON serialization check - ensure no hidden fields leak
const serializedFile = JSON.stringify(fileDtoNoPreview);
record(
  !serializedFile.includes('original_storage_path'),
  'Serialized File DTO does not contain "original_storage_path"',
);
record(
  !serializedFile.includes('preview_storage_path'),
  'Serialized File DTO does not contain "preview_storage_path"',
);
record(
  !serializedFile.includes('originalStoragePath'),
  'Serialized File DTO does not contain "originalStoragePath"',
);
record(
  !serializedFile.includes('previewStoragePath'),
  'Serialized File DTO does not contain "previewStoragePath"',
);

const serializedMemory = JSON.stringify(memoryDtoNoPreview);
record(
  !serializedMemory.includes('original_storage_path'),
  'Serialized Memory DTO does not contain "original_storage_path"',
);
record(
  !serializedMemory.includes('preview_storage_path'),
  'Serialized Memory DTO does not contain "preview_storage_path"',
);

const serializedFolder = JSON.stringify(folderDto);
record(
  !serializedFolder.includes('original_storage_path'),
  'Serialized Folder DTO does not contain "original_storage_path"',
);

const serializedAlbum = JSON.stringify(albumDto);
record(
  !serializedAlbum.includes('original_storage_path'),
  'Serialized Album DTO does not contain "original_storage_path"',
);
record(
  !serializedAlbum.includes('preview_storage_path') && !serializedAlbum.includes('bucket'),
  'Serialized Album DTO does not contain "preview_storage_path" or "bucket"',
);

// Test 10: Discriminated union TypeScript narrowing works at runtime (structure check)
record(
  fileDtoNoPreview.role === 'file' && 'folderId' in fileDtoNoPreview,
  'File DTO has role="file" and folderId (discriminated)',
);
record(
  memoryDtoNoPreview.role === 'memory' && 'caption' in memoryDtoNoPreview,
  'Memory DTO has role="memory" and caption (discriminated)',
);
record(
  !('caption' in fileDtoNoPreview),
  'File DTO does NOT have caption',
);
record(
  !('folderId' in memoryDtoNoPreview),
  'Memory DTO does NOT have folderId',
);

// Summary
console.log(`\nHC1F_DTO_LEAK_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC1F_DTO_LEAK_TESTS=FAIL');
} else {
  console.log('HC1F_DTO_LEAK_TESTS=PASS');
}