/**
 * Node stub for `expo-file-system/legacy`.
 *
 * Only what the HomeCloud intake modules touch at import time plus the durable
 * workspace helpers, so the REAL adapters (memory/file intake services) can be
 * exercised in plain Node without a device. Every mutating call is a no-op that
 * reports success; nothing here emulates upload semantics.
 */

const documentDirectory = 'file:///stub-documents/';

module.exports = {
  documentDirectory,
  FileSystemUploadType: { BINARY_CONTENT: 1, UPLOAD_AS_FILES: 0 },
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  getInfoAsync: async () => ({ exists: false, size: 0, modificationTime: 0, isDirectory: false }),
  makeDirectoryAsync: async () => undefined,
  copyAsync: async () => undefined,
  moveAsync: async () => undefined,
  deleteAsync: async () => undefined,
  readDirectoryAsync: async () => [],
  readAsStringAsync: async () => '',
  writeAsStringAsync: async () => undefined,
  createDownloadResumable: async () => ({ downloadAsync: async () => ({ status: 200 }) }),
  uploadAsync: async () => ({ status: 200, body: '' }),
};
