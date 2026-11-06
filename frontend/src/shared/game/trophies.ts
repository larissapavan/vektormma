import { ACHIEVEMENT_IDS, isAchievementId, type AchievementId } from './achievements'

/**
 * Every achievement this browser has ever earned, with the day, kept in local storage so the collection grows across careers.
 * It never leaves the browser, and what is read back is checked: only known achievements with a real date are kept.
 */
export const TROPHY_KEY = 'vektor:trophies:v1'

export type Trophies = Partial<Record<AchievementId, number>>

export function readTrophies(raw: string | null): Trophies {
  if (!raw || raw.length > 5000) return {}
  try {
    const data = JSON.parse(raw) as unknown
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
    const trophies: Trophies = {}
    for (const [id, when] of Object.entries(data)) {
      if (isAchievementId(id) && typeof when === 'number' && Number.isFinite(when) && when >= 0 && when <= 8.64e15) trophies[id] = when
    }
    return trophies
  } catch {
    return {}
  }
}

export function loadTrophies(): Trophies {
  try {
    return readTrophies(window.localStorage.getItem(TROPHY_KEY))
  } catch {
    return {}
  }
}

/** Adds the achievements to the collection (the ones already there keep their first date). */
export function recordTrophies(ids: readonly string[], now = Date.now()): void {
  const fresh = ids.filter(isAchievementId)
  if (!fresh.length) return
  try {
    const trophies = loadTrophies()
    let changed = false
    for (const id of fresh) {
      if (trophies[id] === undefined) {
        trophies[id] = now
        changed = true
      }
    }
    if (changed) window.localStorage.setItem(TROPHY_KEY, JSON.stringify(trophies))
  } catch {
    // Storage full or blocked: the career still shows what it earned, the collection just does not grow.
  }
}

export const TROPHY_TOTAL = ACHIEVEMENT_IDS.length
