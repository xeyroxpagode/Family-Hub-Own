let owners = 0;
const listeners = new Set<() => void>();

export const isHomeCloudImmersiveChromeHidden = (): boolean => owners > 0;

export function beginHomeCloudImmersiveChrome(): () => void {
  owners += 1;
  listeners.forEach((listener) => listener());
  let released = false;
  return () => {
    if (released) return;
    released = true;
    owners = Math.max(0, owners - 1);
    listeners.forEach((listener) => listener());
  };
}

export function subscribeHomeCloudImmersiveChrome(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
