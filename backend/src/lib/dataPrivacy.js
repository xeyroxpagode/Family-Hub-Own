'use strict';

const MAX_SAFE_PAYLOAD_BYTES = 4096;

const FORBIDDEN_KEY_RE = /(?:^|_)(?:email|e_mail|phone|telephone|mobile|first_name|last_name|full_name|display_name|name|address|title|description|notes?|query|search_query|token|secret|password|authorization|cookie|headers?|stack|body|payload)(?:$|_)/i;
const EMAIL_VALUE_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const BEARER_VALUE_RE = /\bbearer\s+[A-Za-z0-9._~+/-]+=*/i;
const JWT_VALUE_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const SECRET_URL_RE = /[?&](?:token|access_token|refresh_token|key|secret|password|signature)=/i;
const PHONE_VALUE_RE = /(?:^|\s)\+?[0-9][0-9 ().-]{7,}[0-9](?:$|\s)/;
const SAFE_STRUCTURAL_KEYS = new Set(['event_name']);

class SensitiveDataError extends Error {
  constructor(code, path) {
    super(`Sensitive data rejected at ${path || '$'}.`);
    this.name = 'SensitiveDataError';
    this.code = code;
    this.path = path || '$';
  }
}

function inspectValue(value, path = '$', seen = new Set()) {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    if (EMAIL_VALUE_RE.test(value)) throw new SensitiveDataError('pii_email_value', path);
    if (BEARER_VALUE_RE.test(value) || JWT_VALUE_RE.test(value)) {
      throw new SensitiveDataError('secret_token_value', path);
    }
    if (SECRET_URL_RE.test(value)) throw new SensitiveDataError('secret_url_value', path);
    if (PHONE_VALUE_RE.test(value)) throw new SensitiveDataError('pii_phone_value', path);
    return;
  }

  if (typeof value !== 'object') return;
  if (seen.has(value)) throw new SensitiveDataError('cyclic_payload', path);
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectValue(entry, `${path}[${index}]`, seen));
  } else {
    for (const [key, entry] of Object.entries(value)) {
      const entryPath = `${path}.${key}`;
      if (FORBIDDEN_KEY_RE.test(key) && !SAFE_STRUCTURAL_KEYS.has(key)) {
        throw new SensitiveDataError('forbidden_property', entryPath);
      }
      inspectValue(entry, entryPath, seen);
    }
  }

  seen.delete(value);
}

function assertSafeStructuredData(value, options = {}) {
  const maxBytes = options.maxBytes ?? MAX_SAFE_PAYLOAD_BYTES;
  inspectValue(value);
  const serialized = JSON.stringify(value ?? null);
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
    const error = new Error(`Payload exceeds ${maxBytes} bytes.`);
    error.name = 'PayloadTooLargeError';
    error.code = 'payload_too_large';
    throw error;
  }
  return value;
}

module.exports = {
  MAX_SAFE_PAYLOAD_BYTES,
  FORBIDDEN_KEY_RE,
  SensitiveDataError,
  assertSafeStructuredData,
  inspectValue,
};
