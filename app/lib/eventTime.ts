/** Wall-clock ms for telemetry and interaction events (not for render-time values). */
export function eventTimestamp(): number {
  return Date.now();
}

/** One-shot mount clock for session timing; call outside render when possible. */
export function mountTimestamp(): number {
  return Date.now();
}
