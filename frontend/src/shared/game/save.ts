import { cleanName, type Career, type CoachId, type FightLog, type Method, type Stance } from './career'

/**
 * The career in progress, kept in this browser's local storage so a closed tab or a reload does not lose it. It is written
 * between fights (at the camp and at the matchmaking), never in the middle of one, and it never leaves the browser.
 * What comes back from storage is checked field by field: anyone can edit it, and a damaged save must be ignored, not trusted.
 */
export const SAVE_KEY = 'vektor:career:v1'

export interface SavedGame {
  career: Career
  stage: 'camp' | 'offers'
  coaches: CoachId[]
  seed: number
  note: { injured: boolean; declined: boolean } | null
  savedAt: number
}

const STANCES: Stance[] = ['Orthodox', 'Southpaw', 'Switch']
const COACH_IDS: CoachId[] = ['striker', 'wrestler', 'allround', 'conditioning', 'sparring', 'scout']
const METHODS: Method[] = ['ko', 'sub', 'dec']
const DIVISIONS = ['Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight', "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight"]

const number = (value: unknown, low: number, high: number): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high ? value : null)
const count = (value: unknown, high = 200): number | null => {
  const found = number(value, 0, high)
  return found !== null && Number.isInteger(found) ? found : null
}

function fightLog(raw: unknown): FightLog | null {
  if (typeof raw !== 'object' || raw === null) return null
  const item = raw as Record<string, unknown>
  const opponent = typeof item.opponent === 'string' ? cleanName(item.opponent, 60) : null
  const round = count(item.round, 5)
  const chance = number(item.chance, 0, 1)
  if (!opponent || round === null || chance === null || typeof item.won !== 'boolean' || typeof item.title !== 'boolean' || !METHODS.includes(item.method as Method)) return null
  return { opponent, won: item.won, method: item.method as Method, round, title: item.title, chance }
}

/** A career read back from storage, or null when anything about it is not what the game itself would have written. */
export function readCareer(raw: unknown): Career | null {
  if (typeof raw !== 'object' || raw === null) return null
  const c = raw as Record<string, unknown>
  const name = typeof c.name === 'string' ? cleanName(c.name) : ''
  const division = typeof c.division === 'string' && DIVISIONS.includes(c.division) ? c.division : null
  const numbers = {
    striking: number(c.striking, 0, 100),
    takedowns: number(c.takedowns, 0, 100),
    reach: number(c.reach, 0, 100),
    age: number(c.age, 18, 45),
    wins: count(c.wins),
    losses: count(c.losses),
    draws: count(c.draws),
    ufcFights: count(c.ufcFights),
    points: count(c.points, 1000),
    winStreak: count(c.winStreak),
    lossStreak: count(c.lossStreak, 2), // a third loss ends the career, and an ended career is not saved
    koWins: count(c.koWins),
    subWins: count(c.subWins),
    decWins: count(c.decWins),
    finishedBy: count(c.finishedBy),
    titleWins: count(c.titleWins, 50),
    defenses: count(c.defenses, 100),
  }
  if (!name || !division || !STANCES.includes(c.stance as Stance) || Object.values(numbers).some((value) => value === null)) return null
  if (typeof c.champion !== 'boolean' || typeof c.scouted !== 'boolean' || c.ended !== null) return null
  if (!Array.isArray(c.fought) || c.fought.length > 200 || !c.fought.every((item) => typeof item === 'string')) return null
  if (!Array.isArray(c.history) || c.history.length > 200) return null
  const history = c.history.map(fightLog)
  if (history.some((item) => item === null)) return null
  let bestWin: Career['bestWin'] = null
  if (c.bestWin !== null) {
    const best = c.bestWin as Record<string, unknown> | undefined
    const bestName = best && typeof best.name === 'string' ? cleanName(best.name, 60) : ''
    const bestChance = best ? number(best.chance, 0, 1) : null
    if (!bestName || bestChance === null) return null
    bestWin = { name: bestName, chance: bestChance }
  }
  let rival: string | null = null
  if (c.rival !== null) {
    if (typeof c.rival !== 'string') return null
    rival = cleanName(c.rival, 60) || null
  }
  const n = numbers as Record<keyof typeof numbers, number>
  return {
    name,
    division,
    stance: c.stance as Stance,
    striking: n.striking,
    takedowns: n.takedowns,
    reach: n.reach,
    age: n.age,
    wins: n.wins,
    losses: n.losses,
    draws: n.draws,
    ufcFights: n.ufcFights,
    points: n.points,
    winStreak: n.winStreak,
    lossStreak: n.lossStreak,
    koWins: n.koWins,
    subWins: n.subWins,
    decWins: n.decWins,
    finishedBy: n.finishedBy,
    titleWins: n.titleWins,
    defenses: n.defenses,
    champion: c.champion,
    bestWin,
    fought: (c.fought as string[]).map((item) => cleanName(item, 60)),
    scouted: c.scouted,
    rival,
    history: history as FightLog[],
    ended: null,
  }
}

export function readSave(raw: string | null): SavedGame | null {
  if (!raw || raw.length > 60_000) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const career = readCareer(data.career)
    const seed = count(data.seed, 2 ** 31)
    const savedAt = number(data.savedAt, 0, 8.64e15)
    if (!career || seed === null || savedAt === null || (data.stage !== 'camp' && data.stage !== 'offers')) return null
    if (!Array.isArray(data.coaches) || data.coaches.length !== 3 || !data.coaches.every((id) => COACH_IDS.includes(id as CoachId))) return null
    let note: SavedGame['note'] = null
    if (data.note !== null) {
      const found = data.note as Record<string, unknown> | undefined
      if (!found || typeof found.injured !== 'boolean' || typeof found.declined !== 'boolean') return null
      note = { injured: found.injured, declined: found.declined }
    }
    return { career, stage: data.stage, coaches: data.coaches as CoachId[], seed, note, savedAt }
  } catch {
    return null
  }
}

/** The save in this browser, or null when there is none, when it is damaged, or when storage cannot be read (a private window, blocked site data). */
export function loadSave(): SavedGame | null {
  try {
    return readSave(window.localStorage.getItem(SAVE_KEY))
  } catch {
    return null
  }
}

export function storeSave(game: Omit<SavedGame, 'savedAt'>): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...game, savedAt: Date.now() }))
  } catch {
    // Storage full or blocked: the game goes on without a save.
  }
}

export function clearSave(): void {
  try {
    window.localStorage.removeItem(SAVE_KEY)
  } catch {
    // Nothing to clear.
  }
}

