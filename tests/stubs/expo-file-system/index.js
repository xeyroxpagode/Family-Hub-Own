'use strict';

/**
 * Node stub for the `expo-file-system` SDK 57 API (`File` / `Directory` / `Paths`).
 *
 * Only the surface the HomeCloud Files Viewer and download modules touch, so the
 * REAL modules can be imported and driven in plain Node without a device.
 *
 * It is an in-memory filesystem: it creates, reads, writes and deletes nodes so the
 * caller's control flow is genuinely exercised, and it refuses to escape its root,
 * which is exactly the containment property a real sandbox gives for free. It does
 * NOT emulate downloads from a network - `downloadFileAsync` resolves to an EMPTY
 * file, so a caller that forgets to verify a transfer is exposed rather than
 * flattered.
 */

const path = require('node:path');

/** In-memory nodes keyed by absolute POSIX path. */
const nodes = new Map();
const directories = new Set();

let counter = 0;
function nextId() {
  counter += 1;
  return `stub-${counter}`;
}

function normalize(candidate) {
  return path.posix.normalize(String(candidate).replace(/\\/g, '/'));
}

/** Resolve a path and refuse anything that climbs out of the sandbox root. */
function resolveInside(root, relative) {
  const base = normalize(root);
  const joined = normalize(path.posix.join(base, String(relative).replace(/\\/g, '/')));
  if (joined !== base && !joined.startsWith(`${base}/`)) {
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
    return new Uint8Array(nodes.get(this.uri) ?? Buffer.alloc(0));
  }

  bytesSync() {
    return this.bytes();
  }

  text() {
    return (nodes.get(this.uri) ?? Buffer.alloc(0)).toString('utf8');
  }

  textSync() {
    return this.text();
  }

  /**
   * A network transfer is NOT emulated. It writes an EMPTY file so a caller that
   * forgets to verify the result fails loudly instead of appearing to work.
   */
  static async downloadFileAsync(_url, _destination) {
    throw new Error('STUB_NO_NETWORK: downloadFileAsync is not emulated; stage bytes explicitly in a test');
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
    reset() {
      nodes.clear();
      directories.clear();
    },
    nextId,
  },
};