/**
 * HomeCloud — Picker display-name normalization (pure, dependency-free).
 *
 * Intake adapters (file picker, memory picker) hand a user-facing displayName
 * to the shared Upload Engine, which forwards it verbatim to register. This
 * module guarantees the extension appears exactly once, so a selected
 * `... punto 1.pdf` is never registered as `... punto 1.pdf.pdf`.
 *
 * Intentionally free of Expo/native imports so it compiles standalone in
 * Node unit tests (same convention as homecloudScanner.ts).
 */

/**
 * Ensure `displayName` carries `extension` exactly once (case-insensitive).
 * Idempotent: ensureSingleExtension(ensureSingleExtension(x)) === same.
 * Extensionless names are returned untouched (the extension travels in its
 * own register column; display_name stays user-facing).
 */
export function ensureSingleExtension(displayName: string, extension: string | null): string {
  const base = displayName.trim() || 'archivo';
  if (!extension) return base;
  const ext = extension.replace(/^\./, '').trim().toLowerCase();
  if (!ext || !/^[a-z0-9]{1,8}$/.test(ext)) return base;
  let core = base;
  for (;;) {
    const match = core.match(new RegExp(`\\.(${ext})\\s*$`, 'i'));
    if (!match || match.index === undefined) break;
    const stripped = core.slice(0, match.index).trim();
    if (!stripped) break;
    core = stripped;
  }
  if (core.toLowerCase() === base.toLowerCase()) return base;
  return `${core}.${ext}`;
}
