'use strict';

/**
 * Node stub for the `expo-file-system` SDK 57 API (`File` / `Directory` / `Paths`).
 *
 * Only the surface the HomeCloud Files Viewer and download modules touch, so the
 * REAL modules can be imported and driven in plain Node without a device.
 *
 * It is an in-memory filesystem: it creates, reads, writes and deletes nodes so the
 * caller's control flow is genuinely exercised, and it refuses to escape its root,
 * which is exactly the containment property a real sandbox gives for free.
 *
 * NETWORK. `downloadFileAsync` needs a transport, so a test REGISTERS the bytes for
 * a URL through `__testOnly.setDownloads(...)`. With nothing registered it still
 * throws `STUB_NO_NETWORK`, so a caller that forgets to verify a transfer is
 * exposed rather than flattered. Unlike the real API, a `File` destination is
 * honoured exactly, and `options.idempotent` decides whether an existing
 * destination is overwritten or rejected. That difference matters: it is what lets a
 * test prove that a staged copy lands on its DETERMINISTIC path instead of on a
 * random name, which a directory-only stub could never catch.
 *
 * HEAP GUARD. `__testOnly.guardHeapReads(true)` makes the whole-file readers
 * (`bytes`, `bytesSync`, `arrayBuffer`, `text`, `textSync`) throw. A viewer that
 * promises a bounded read must therefore go through `readableStream()`. This is the
 * structural guard: the "cap" was previously theatre, because the code sliced AFTER
 * the whole file was already in the heap, and a text assertion could not see it.
 */

const path = require('node:path');

/** In-memory nodes keyed by absolute POSIX path. */
const nodes = new Map();
const directories = new Set();

/**
 * Registered transfer bodies, keyed by URL. A value is a Buffer, and an optional
 * `filename` sibling entry supplies the name a DIRECTORY destination would derive
 * from response headers.
 */
let downloads = new Map();
let downloadLog = [];
let guardHeapReads = false;

function assertHeapAllowed(method) {
  if (guardHeapReads) {
    throw new Error(
      `STUB_HEAP_GUARD: ${method}() reads the WHOLE file into JS memory, which defeats a bounded read. Use readableStream() instead.`,
    );
  }
}

let counter = 0;
function nextId() {
  counter += 1;
  return `stub-${counter}`;
}

/**
 * `file://` is treated as an OPAQUE prefix.
 *
 * `path.posix.join` and `path.posix.normalize` collapse `file:///x` into `file:/x`,
 * which made every lookup under `Paths.cache` look like a sandbox escape and made
 * the containment check below compare `file:/x` against `file:///x`. The scheme is
 * therefore split off before any path math and re-attached afterwards. This stayed
 * hidden for a long time because nothing EXECUTED against this stub until the
 * behavioural Viewer suite started importing the real access module.
 */
const FILE_SCHEME = 'file://';

function splitScheme(candidate) {
  const raw = String(candidate).replace(/\\/g, '/');
  return raw.startsWith(FILE_SCHEME)
    ? { isFile: true, rest: raw.slice(FILE_SCHEME.length) }
    : { isFile: false, rest: raw };
}

function normalize(candidate) {
  const { isFile, rest } = splitScheme(candidate);
  const normalized = path.posix.normalize(rest);
  return isFile ? `${FILE_SCHEME}${normalized}` : normalized;
}

/** Resolve a path and refuse anything that climbs out of the sandbox root. */
function resolveInside(root, relative) {
  const { isFile, rest } = splitScheme(root);
  const prefix = isFile ? FILE_SCHEME : '';
  const base = path.posix.normalize(rest);
  // A trailing separator on the root would otherwise make the containment test
  // compare against `.../cache//` and reject every legitimate child.
  const rootPath = `${prefix}${base.length > 1 ? base.replace(/\/+$/, '') : base}`;
  const joined = `${prefix}${path.posix.normalize(path.posix.join(base, String(relative).replace(/\\/g, '/')))}`;
  if (joined !== rootPath && !joined.startsWith(`${rootPath}/`)) {
    throw new Error(`STUB_PATH_ESCAPE: ${relative} resolved outside the sandbox`);
  }
  return joined;
}

class Directory {
  constructor(parent, ...segments) {
    const base = parent instanceof Directory
      ? parent.uri
      : parent instanceof PathsClass
        ? parent.uri
        : normalize(parent);
    this.uri = resolveInside(base, path.posix.join(...segments.map((segment) => String(segment))));
    this.name = segments.length > 0 ? String(segments[segments.length - 1]) : base;
    directories.add(this.uri);
  }

  get exists() {
    return directories.has(this.uri) || Array.from(nodes.keys()).some((key) => key.startsWith(`${this.uri}/`));
  }

  create() {
    directories.add(this.uri);
    return this;
  }

  delete() {
    directories.delete(this.uri);
    for (const key of Array.from(nodes.keys())) {
      if (key.startsWith(`${this.uri}/`)) nodes.delete(key);
    }
    for (const key of Array.from(directories)) {
      if (key !== this.uri && key.startsWith(`${this.uri}/`)) directories.delete(key);
    }
  }

  list() {
    return Array.from(nodes.entries())
      .filter(([key]) => path.posix.dirname(key) === this.uri)
      .map(([key, value]) => new File({ uri: key }, value.name));
  }
}

class File {
  constructor(parent, nameOrOptions, maybeName) {
    let root;
    let name;
    if (parent instanceof File || parent instanceof Directory) {
      root = parent.uri;
      name = String(nameOrOptions);
    } else if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
      root = normalize(parent);
      name = String(nameOrOptions.name ?? path.posix.basename(String(nameOrOptions.uri ?? '')));
    } else {
      root = normalize(parent);
      name = String(nameOrOptions);
    }
    if (maybeName !== undefined) {
      root = normalize(path.posix.join(root, String(nameOrOptions)));
      name = String(maybeName);
    }
    this.uri = resolveInside(root, name);
    this.name = name;
    if (nameOrOptions && typeof nameOrOptions === 'object' && nameOrOptions.uri && nameOrOptions.data !== undefined) {
      nodes.set(this.uri, Buffer.from(nameOrOptions.data));
    }
  }

  get exists() {
    return nodes.has(this.uri);
  }

  get size() {
    const value = nodes.get(this.uri);
    return value ? value.byteLength : 0;
  }

  create(options) {
    if (options && options.intermediates) directories.add(path.posix.dirname(this.uri));
    if (!nodes.has(this.uri)) nodes.set(this.uri, Buffer.alloc(0));
    return this;
  }

  delete() {
    nodes.delete(this.uri);
  }

  write(content) {
    nodes.set(this.uri, Buffer.isBuffer(content) ? content : Buffer.from(String(content)));
    return this;
  }

  bytes() {
    assertHeapAllowed('bytes');
    return new Uint8Array(nodes.get(this.uri) ?? Buffer.alloc(0));
  }

  bytesSync() {
    assertHeapAllowed('bytesSync');
    return this.bytes();
  }

  text() {
    assertHeapAllowed('text');
    return (nodes.get(this.uri) ?? Buffer.alloc(0)).toString('utf8');
  }

  textSync() {
    assertHeapAllowed('textSync');
    return this.text();
  }

  arrayBuffer() {
    assertHeapAllowed('arrayBuffer');
    const value = nodes.get(this.uri) ?? Buffer.alloc(0);
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }

  /**
   * A real chunked ReadableStream over the stored bytes.
   *
   * This is the only whole-file reader that stays OFF the heap, so it is the one a
   * bounded reader must use. Chunks are deliberately small so a consumer that stops
   * early has provably touched only the prefix.
   */
  readableStream(chunkSize = 64 * 1024) {
    const buffer = nodes.get(this.uri) ?? Buffer.alloc(0);
    let offset = 0;
    return new ReadableStream({
      pull(controller) {
        if (offset >= buffer.byteLength) {
          controller.close();
          return;
        }
        const end = Math.min(offset + chunkSize, buffer.byteLength);
        controller.enqueue(new Uint8Array(buffer.subarray(offset, end)));
        offset = end;
      },
      cancel() {
        offset = buffer.byteLength;
      },
    });
  }

  /**
   * A transfer, not a fabrication.
   *
   * The bytes come from a test-registered body. A `File` destination is written
   * exactly; a `Directory` destination derives the name from the registered
   * `filename` or the URL, which is what the real API does from response headers.
   */
  static async downloadFileAsync(url, destination, options = {}) {
    const entry = downloads.get(String(url));
    if (!entry) {
      throw new Error(`STUB_NO_NETWORK: no transfer body registered for ${url}`);
    }
    downloadLog.push({ url: String(url), destination: destination && destination.uri });
    const body = Buffer.isBuffer(entry) ? entry : Buffer.from(entry.data ?? []);
    const target = destination instanceof File
      ? destination
      : new File(destination, String((entry && entry.filename) || path.posix.basename(String(url).split('?')[0])));
    if (target.exists && options.idempotent !== true) {
      throw new Error(`STUB_DESTINATION_EXISTS: ${target.uri} exists and idempotent was not set`);
    }
    nodes.set(target.uri, body);
    return target;
  }
}

class PathsClass {
  constructor(uri) {
    this.uri = normalize(uri);
  }
}

const Paths = {
  document: new PathsClass('file:///stub/documents/'),
  cache: new PathsClass('file:///stub/cache/'),
};

module.exports = {
  Directory,
  File,
  Paths,
  /** Test-only escape hatch so a suite can assert on cleanup. */
  __testOnly: {
    nodes,
    directories,
    /**
     * Register the transfer body for a URL.
     * `map` values are either a Buffer, or `{ data, filename }` so a DIRECTORY
     * destination can be tested against the name the network would report.
     */
    setDownloads(map) {
      downloads = new Map(Object.entries(map));
      downloadLog = [];
    },
    clearDownloads() {
      downloads = new Map();
      downloadLog = [];
    },
    /** Every transfer the code under test attempted, in order. */
    downloadAttempts() {
      return downloadLog.slice();
    },
    /**
     * Make the whole-file readers throw. A bounded reader must use
     * `readableStream()`; this is what makes that requirement enforceable.
     */
    guardHeapReads(enabled = true) {
      guardHeapReads = enabled;
    },
    reset() {
      nodes.clear();
      directories.clear();
      downloads = new Map();
      downloadLog = [];
      guardHeapReads = false;
    },
    nextId,
  },
};

/**
 * TEST HANDSHAKE.
 *
 * The harness resolves `expo-file-system` at RUNTIME through `NODE_PATH`, which a
 * type-checker cannot see. A suite that needs to drive this stub therefore cannot
 * import it by name, so it is published here instead: the code under test imports
 * the stub naturally, and the suite picks the controls up off `globalThis`.
 */
globalThis.__HC_FILE_SYSTEM_STUB__ = module.exports.__testOnly;