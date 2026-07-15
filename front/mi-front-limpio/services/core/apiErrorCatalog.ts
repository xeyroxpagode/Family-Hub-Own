const messages = new Map<string, string>();

export function registerApiErrorMessages(catalog: Readonly<Record<string, string>>) {
  for (const [code, message] of Object.entries(catalog)) messages.set(code, message);
}

export function resolveApiErrorMessage(code: string | null, fallback: string) {
  return code ? messages.get(code) ?? fallback : fallback;
}
