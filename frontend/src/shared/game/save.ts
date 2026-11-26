import { isAchievementId } from './achievements'
import { CHALLENGE_MAX_FIGHTS, CHALLENGE_MIN_FIGHTS, readResult, SEED_MAX, type Challenge } from './challenge'
import { cleanName, GAME_DIVISIONS, TACTICS, type Career, type CoachId, type FightLog, type GoalState, type Method, type Pact, type Plan, type PlayerStats, type Stance, type Tactic } from './career'
import type { GameOpponent } from '../types/api'
import { isCard, isDealId, type Card } from './events'
import { isGoalId } from './goals'

/**
 * The career in progress, kept in this browser's local storage so a closed tab or a reload does not lose it. It is written at
 * the camp, at the matchmaking and during a fight (the fight as its dice and the tactics chosen so far, so a reload replays the
 * same rounds instead of drawing new ones), and it never leaves the browser.
 * What comes back from storage is checked field by field: anyone can edit it, and a damaged save must be ignored, not trusted.
 */
export const SAVE_KEY = 'vektor:career:v1'

/**
 * A fight under way: who, with what plan, the dice (a seed; a challenge's fights use the challenge's own stream, so null) and the
 * tactic of every round fought so far. Played again from these, the fight comes out exactly as it was.
 */
export interface SavedFight {
  offer: GameOpponent
  plan: Plan
  player: PlayerStats
  seed: number | null
  tactics: Tactic[]
}

export interface SavedGame {
  career: Career
  stage: 'camp' | 'offers' | 'fight'
  coaches: CoachId[]
  seed: number
  note: { injured: boolean; declined: boolean } | null
  /** The challenge being played (see challenge.ts), or null for an ordinary career. */
  challenge: Challenge | null
  /** The card waiting for an answer before the matchmaking (see events.ts), or null. */
  card: Card | null
  /** The fight on screen when the game was saved (stage 'fight'), or null. */
  fight: SavedFight | null
  savedAt: number
}

const STANCES: Stance[] = ['Orthodox', 'Southpaw', 'Switch']
const COACH_IDS: CoachId[] = ['striker', 'wrestler', 'allround', 'conditioning', 'sparring', 'scout']
const METHODS: Method[] = ['ko', 'sub', 'dec']

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

function readGoals(raw: unknown): GoalState[] | null {
  if (raw === undefined) return []
  if (!Array.isArray(raw) || raw.length > 8) return null
  const goals: GoalState[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null
    const { id, done } = item as Record<string, unknown>
    if (!isGoalId(id) || typeof done !== 'boolean' || goals.some((goal) => goal.id === id)) return null
    goals.push({ id, done })
  }
  return goals
}

function readEarned(raw: unknown): string[] | null {
  if (raw === undefined) return []
  if (!Array.isArray(raw) || raw.length > 20) return null
  if (!raw.every((id) => isAchievementId(id)) || new Set(raw).size !== raw.length) return null
  return raw as string[]
}

function readPact(raw: unknown): Pact | null | undefined {
  if (raw === undefined || raw === null) return null // none, or a save from before cards existed
  if (typeof raw !== 'object') return undefined
  const pact = raw as Record<string, unknown>
  if (pact.kind === 'deal' && isDealId(pact.id)) return { kind: 'deal', id: pact.id }
  if (pact.kind === 'fix' && typeof pact.caught === 'boolean') return { kind: 'fix', caught: pact.caught }
  return undefined
}

/** A career read back from storage, or null when anything about it is not what the game itself would have written. */
export function readCareer(raw: unknown): Career | null {
  if (typeof raw !== 'object' || raw === null) return null
  const c = raw as Record<string, unknown>
  const name = typeof c.name === 'string' ? cleanName(c.name) : ''
  const division = typeof c.division === 'string' && GAME_DIVISIONS.includes(c.division) ? c.division : null
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
  // Saves from before goals and achievements existed have neither: they read as a career with no goals and nothing earned.
  const bestStreak = c.bestStreak === undefined ? numbers.winStreak : count(c.bestStreak)
  if (bestStreak === null) return null
  const goals = readGoals(c.goals)
  const earned = readEarned(c.earned)
  const pact = readPact(c.pact)
  if (!goals || !earned || pact === undefined) return null
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
    bestStreak,
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
    goals,
    earned,
    pact,
    ended: null,
  }
}

const PLANS: Plan[] = ['striking', 'grappling', 'balanced']
const LABELS: GameOpponent['label'][] = ['safe', 'even', 'risk', 'champion', 'rematch']
const short = (value: unknown, max: number): string | null => (typeof value === 'string' && value.length <= max ? value : null)
const maybe = <T,>(value: unknown, read: (value: unknown) => T | null): T | null | undefined => (value === null || value === undefined ? null : (read(value) ?? undefined))

function readOffer(raw: unknown): GameOpponent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  const name = typeof o.name === 'string' ? cleanName(o.name, 60) : ''
  const label = LABELS.includes(o.label as GameOpponent['label']) ? (o.label as GameOpponent['label']) : null
  const record = short(o.record, 20)
  const probability = number(o.win_probability, 0, 1)
  // The photo is drawn as an image: only an address of the site or of a secure server.
  const image = maybe(o.image_url, (value) => (typeof value === 'string' && value.length <= 500 && /^(https:\/\/|\/)/.test(value) ? value : null))
  const country = maybe(o.country_code, (value) => short(value, 3))
  const age = maybe(o.age, (value) => number(value, 15, 60))
  const reach = maybe(o.reach_cm, (value) => number(value, 100, 250))
  const stance = maybe(o.stance, (value) => short(value, 20))
  const ranking = maybe(o.ranking, (value) => short(value, 5))
  const strike = maybe(o.sig_str_acc, (value) => number(value, 0, 1))
  const takedown = maybe(o.takedown_acc, (value) => number(value, 0, 1))
  if (!name || label === null || record === null || probability === null || typeof o.champion !== 'boolean') return null
  if ([image, country, age, reach, stance, ranking, strike, takedown].some((value) => value === undefined)) return null
  return {
    label,
    name,
    record,
    win_probability: probability,
    champion: o.champion,
    image_url: image ?? null,
    country_code: country ?? null,
    age: age ?? null,
    reach_cm: reach ?? null,
    stance: stance ?? null,
    ranking: ranking ?? null,
    sig_str_acc: strike ?? null,
    takedown_acc: takedown ?? null,
  }
}

function readFight(raw: unknown, challenge: boolean): SavedFight | null {
  if (typeof raw !== 'object' || raw === null) return null
  const f = raw as Record<string, unknown>
  const offer = readOffer(f.offer)
  const player = f.player as Record<string, unknown> | null
  const strike = player ? number(player.sig_str_acc, 0, 1) : null
  const takedown = player ? number(player.takedown_acc, 0, 1) : null
  const seed = f.seed === null ? null : count(f.seed, 2 ** 31)
  if (!offer || strike === null || takedown === null || !PLANS.includes(f.plan as Plan)) return null
  // A challenge's fight is played with the challenge's dice; any other with its own seed.
  if (challenge !== (seed === null)) return null
  if (!Array.isArray(f.tactics) || f.tactics.length > 5 || !f.tactics.every((tactic) => TACTICS.includes(tactic as Tactic))) return null
  return { offer, plan: f.plan as Plan, player: { sig_str_acc: strike, takedown_acc: takedown }, seed, tactics: f.tactics as Tactic[] }
}

function readChallenge(raw: unknown): Challenge | null | undefined {
  if (raw === undefined || raw === null) return null // an ordinary career, or a save from before challenges existed
  if (typeof raw !== 'object') return undefined
  const c = raw as Record<string, unknown>
  const seed = count(c.seed, SEED_MAX)
  const fights = count(c.fights, CHALLENGE_MAX_FIGHTS)
  if (seed === null || fights === null || fights < CHALLENGE_MIN_FIGHTS) return undefined
  if (c.target === null || c.target === undefined) return { seed, fights, target: null }
  const target = readResult(c.target)
  return target ? { seed, fights, target } : undefined
}

export function readSave(raw: string | null): SavedGame | null {
  if (!raw || raw.length > 60_000) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const career = readCareer(data.career)
    const seed = count(data.seed, 2 ** 31)
    const savedAt = number(data.savedAt, 0, 8.64e15)
    if (!career || seed === null || savedAt === null || (data.stage !== 'camp' && data.stage !== 'offers' && data.stage !== 'fight')) return null
    if (!Array.isArray(data.coaches) || data.coaches.length !== 3 || !data.coaches.every((id) => COACH_IDS.includes(id as CoachId))) return null
    let note: SavedGame['note'] = null
    if (data.note !== null) {
      const found = data.note as Record<string, unknown> | undefined
      if (!found || typeof found.injured !== 'boolean' || typeof found.declined !== 'boolean') return null
      note = { injured: found.injured, declined: found.declined }
    }
    const challenge = readChallenge(data.challenge)
    if (challenge === undefined) return null
    // A card is only waiting at the matchmaking, and only for a career that has not already agreed to something.
    if (data.card !== undefined && data.card !== null && (!isCard(data.card) || data.stage !== 'offers' || career.pact)) return null
    const card = data.card && isCard(data.card) ? data.card : null
    // A fight is saved only while it is on screen, and always then.
    const fight = data.stage === 'fight' ? readFight(data.fight, challenge !== null) : null
    if ((data.stage === 'fight') !== (fight !== null)) return null
    return { career, stage: data.stage, coaches: data.coaches as CoachId[], seed, note, challenge, card, fight, savedAt }
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

