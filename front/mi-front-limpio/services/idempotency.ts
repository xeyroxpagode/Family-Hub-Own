export const createIdempotencyKey = (prefix = 'planner') => {
  let uuid: string

  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).crypto?.randomUUID === 'function') {
    uuid = (globalThis as any).crypto.randomUUID()
  } else if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID()
  } else {
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 10)
    uuid = `${ts}-${rand}`
  }

  return `${prefix}-${uuid}`
}