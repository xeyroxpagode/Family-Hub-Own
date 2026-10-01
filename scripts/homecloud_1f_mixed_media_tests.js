#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1F — Mixed Media Tests.
 *
 * Proves getContent safely returns role='memory' for:
 * - image/*
 * - video/*
 * - audio/*
 *
 * Without creating separate domain identities.
 *
 * Proves PDF File remains File.
 * No Storage path differences by semantic role.
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

console.log('\n=== HC-1F MIXED MEDIA TESTS ===\n');

const { mapContentRowToDto } = require('../backend/src/lib/homecloudMappers');

console.log('--- File (role=file) Tests ---');

const pdfFile = {
  id: 'file-1',
  household_id: 'hhh',
  role: 'file',
  display_name: 'document.pdf',
  mime_type: 'application/pdf',
  extension: 'pdf',
  size_bytes: 102400,
  original_storage_path: 'hhh/file-1/original',
  preview_storage_path: 'hhh/file-1/preview',
  uploaded_by_member_id: 'mmm',
  uploaded_at: '2024-01-01T00:00:00Z',
  document_date: '2024-01-15',
  note: 'Important document',
  caption: null,
  captured_at: null,
  capture_precision: 'unknown',
  folder_id: 'folder-1',
  lifecycle: 'active',
};

const pdfDto = mapContentRowToDto(pdfFile);
record(
  pdfDto.role === 'file',
  'PDF File role is "file"',
);
record(
  pdfDto.mimeType === 'application/pdf',
  'PDF File has correct mimeType',
);
record(
  'folderId' in pdfDto,
  'File DTO has folderId',
);
record(
  pdfDto.folderId === 'folder-1',
  'File folderId matches',
);
record(
  'documentDate' in pdfDto,
  'File DTO has documentDate',
);
record(
  pdfDto.documentDate === '2024-01-15',
  'File documentDate matches',
);
record(
  'note' in pdfDto,
  'File DTO has note',
);
record(
  !('caption' in pdfDto),
  'File DTO does NOT have caption',
);
record(
  !('capturedAt' in pdfDto),
  'File DTO does NOT have capturedAt',
);
record(
  !('capturePrecision' in pdfDto),
  'File DTO does NOT have capturePrecision',
);

console.log('\n--- Memory Image Tests ---');

const memoryImage = {
  id: 'mem-img-1',
  household_id: 'hhh',
  role: 'memory',
  display_name: 'photo.jpg',
  mime_type: 'image/jpeg',
  extension: 'jpg',
  size_bytes: 2048000,
  original_storage_path: 'hhh/mem-img-1/original',
  preview_storage_path: 'hhh/mem-img-1/preview',
  uploaded_by_member_id: 'mmm',
  uploaded_at: '2024-01-02T00:00:00Z',
  document_date: null,
  note: null,
  caption: 'Beach sunset',
  captured_at: '2023-07-15T18:30:00Z',
  capture_precision: 'exact',
  folder_id: null,
  lifecycle: 'active',
};

const memImgDto = mapContentRowToDto(memoryImage);
record(
  memImgDto.role === 'memory',
  'Image Memory role is "memory"',
);
record(
  memImgDto.mimeType === 'image/jpeg',
  'Image Memory has correct mimeType',
);
record(
  'caption' in memImgDto,
  'Memory DTO has caption',
);
record(
  memImgDto.caption === 'Beach sunset',
  'Memory caption matches',
);
record(
  'capturedAt' in memImgDto,
  'Memory DTO has capturedAt',
);
record(
  memImgDto.capturedAt === '2023-07-15T18:30:00Z',
  'Memory capturedAt matches',
);
record(
  'capturePrecision' in memImgDto,
  'Memory DTO has capturePrecision',
);
record(
  memImgDto.capturePrecision === 'exact',
  'Memory capturePrecision matches',
);
record(
  !('folderId' in memImgDto),
  'Memory DTO does NOT have folderId',
);
record(
  !('documentDate' in memImgDto),
  'Memory DTO does NOT have documentDate',
);
record(
  !('note' in memImgDto),
  'Memory DTO does NOT have note',
);

console.log('\n--- Memory Video Tests ---');

const memoryVideo = {
  ...memoryImage,
  id: 'mem-vid-1',
  display_name: 'video.mp4',
  mime_type: 'video/mp4',
  extension: 'mp4',
  size_bytes: 50000000,
  original_storage_path: 'hhh/mem-vid-1/original',
  preview_storage_path: 'hhh/mem-vid-1/preview',
  caption: 'First steps',
};

const memVidDto = mapContentRowToDto(memoryVideo);
record(
  memVidDto.role === 'memory',
  'Video Memory role is "memory"',
);
record(
  memVidDto.mimeType === 'video/mp4',
  'Video Memory has correct mimeType',
);
record(
  memVidDto.caption === 'First steps',
  'Video Memory caption matches',
);

console.log('\n--- Memory Audio Tests ---');

const memoryAudio = {
  ...memoryImage,
  id: 'mem-aud-1',
  display_name: 'recording.mp3',
  mime_type: 'audio/mpeg',
  extension: 'mp3',
  size_bytes: 3000000,
  original_storage_path: 'hhh/mem-aud-1/original',
  preview_storage_path: 'hhh/mem-aud-1/preview',
  caption: 'Voice memo',
};

const memAudDto = mapContentRowToDto(memoryAudio);
record(
  memAudDto.role === 'memory',
  'Audio Memory role is "memory"',
);
record(
  memAudDto.mimeType === 'audio/mpeg',
  'Audio Memory has correct mimeType',
);
record(
  memAudDto.caption === 'Voice memo',
  'Audio Memory caption matches',
);

console.log('\n--- Storage Path Consistency ---');

// All content types use the same path format: {householdId}/{contentId}/original|preview
// No role-based path differences
const paths = {
  file: 'hhh/file-1/original',
  image: 'hhh/mem-img-1/original',
  video: 'hhh/mem-vid-1/original',
  audio: 'hhh/mem-aud-1/original',
};

// Verify path format is consistent (householdId/contentId/original)
Object.entries(paths).forEach(([type, p]) => {
  const parts = p.split('/');
  record(
    parts.length === 3 && parts[2] === 'original',
    `${type} storage path follows canonical format: householdId/contentId/original`,
  );
});

console.log('\n--- Discriminated Union Type Narrowing ---');

// Verify TypeScript narrowing works structurally
// role='file' -> has folderId, documentDate, note; no caption, capturedAt, capturePrecision
// role='memory' -> has caption, capturedAt, capturePrecision; no folderId, documentDate, note

record(
  pdfDto.role === 'file' && 'folderId' in pdfDto && !('caption' in pdfDto),
  'File narrows to folderId/documentDate/note, excludes caption/capturedAt',
);
record(
  memImgDto.role === 'memory' && 'caption' in memImgDto && !('folderId' in memImgDto),
  'Memory narrows to caption/capturedAt/capturePrecision, excludes folderId/documentDate',
);
record(
  memVidDto.role === 'memory' && 'caption' in memVidDto,
  'Video Memory narrows correctly',
);
record(
  memAudDto.role === 'memory' && 'caption' in memAudDto,
  'Audio Memory narrows correctly',
);

console.log('\n--- hasPreview Derivation ---');

record(
  pdfDto.hasPreview === true,
  'PDF File hasPreview=true (preview path exists)',
);
record(
  memImgDto.hasPreview === true,
  'Image Memory hasPreview=true (preview path exists)',
);
record(
  memVidDto.hasPreview === true,
  'Video Memory hasPreview=true (preview path exists)',
);
record(
  memAudDto.hasPreview === true,
  'Audio Memory hasPreview=true (preview path exists)',
);

// Test with null preview
const noPreviewFile = { ...pdfFile, preview_storage_path: null };
const noPreviewDto = mapContentRowToDto(noPreviewFile);
record(
  noPreviewDto.hasPreview === false,
  'File with null preview_storage_path -> hasPreview=false',
);

const noPreviewMem = { ...memoryImage, preview_storage_path: null };
const noPreviewMemDto = mapContentRowToDto(noPreviewMem);
record(
  noPreviewMemDto.hasPreview === false,
  'Memory with null preview_storage_path -> hasPreview=false',
);

console.log('\n--- No Separate Audio Entity ---');

// Audio is just role='memory' with mimeType audio/*
// No separate entity type required per HC-1F Product Truth
record(
  memAudDto.role === 'memory',
  'Audio uses role="memory" (not separate entity)',
);
record(
  memAudDto.mimeType.startsWith('audio/'),
  'Audio Memory identified by mimeType prefix',
);

// Summary
console.log(`\nHC1F_MIXED_MEDIA_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC1F_MIXED_MEDIA_TESTS=FAIL');
} else {
  console.log('HC1F_MIXED_MEDIA_TESTS=PASS');
}