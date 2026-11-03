/**
 * The span of history the site covers. It starts with the first UFC event (1993) and runs to the current year, so the
 * text on the home page and on the data page does not go stale every January.
 */

export const HISTORY_START = 1993

/** "1993–2026": the first year, then the current one. */
export function historyRange(now: Date = new Date()): string {
  return `${HISTORY_START}–${now.getFullYear()}`
}

/** Whole decades of history, for a "30+" style figure: 33 years is 30, and it becomes 40 in 2033. */
export function historyDecades(now: Date = new Date()): number {
  return Math.floor((now.getFullYear() - HISTORY_START) / 10) * 10
}
