import {
  counter,
  CREATE_BUDGET,
  END_REASONS,
  fromBase64Url,
  GAME_DIVISIONS,
  seededRng,
  START_RECORD,
  text,
  toBase64Url,
  type Build,
  type Career,
  type EndReason,
  type Rng,
  type Stance,
} from './career'

/**
 * The challenge: everyone plays the same fighter through the same dice, and the results are compared.
 *
 * The fighter (division, stance, three skills) comes from the seed, so nobody builds a better one. Every random event has its
 * own stream, made from the seed, what the event is and which fight it is for: the coaches on offer for a camp, the injury roll,
 * the opponents asked for, the dice of a fight. Two players who make the same choices live the same career, and one who chooses
 * differently only drifts apart through what the choices did, never because an earlier roll took another number off a shared stream.
 */
export const CHALLENGE_FIGHTS = 6
export const CHALLENGE_MIN_FIGHTS = 3
export const CHALLENGE_MAX_FIGHTS = 10
export const SEED_MAX = 2 ** 31 - 1

/** What a finished run is compared on: the numbers a link carries. */
export interface ChallengeResult {
  n: string // name
  p: number // ranking points, the score
  w: number // wins in the UFC
  l: number // losses in the UFC
  ko: number
  sb: number
  dc: number
  t: number // belts won
  f: number // UFC fights fought
  e: EndReason
}

export interface Challenge {
  seed: number
  fights: number
  /** The result of whoever sent the challenge, to beat; null for a challenge nobody has played yet. */
  target: ChallengeResult | null
}

/** A 32-bit number from the seed and a name for the event (FNV-1a, then a final mix so close inputs give distant outputs). */
function mix(seed: number, label: string, index: number): number {
  let h = (0x811c9dc5 ^ seed) >>> 0
  for (const char of `${label}:${index}`) h = Math.imul(h ^ char.charCodeAt(0), 0x01000193) >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

export function challengeRng(seed: number, label: string, index = 0): Rng {
  return seededRng(mix(seed, label, index))
}

/** The streams of one challenge: one per random event of the game, for the fight (or camp) it belongs to. */
export function challengeStreams(seed: number) {
  return {
    goals: () => challengeRng(seed, 'goals'),
    coaches: (fight: number) => challengeRng(seed, 'coaches', fight),
    camp: (fight: number) => challengeRng(seed, 'camp', fight),
    /** The number sent to the matchmaking, which shuffles the opponents with it. */
    offers: (fight: number) => Math.floor(challengeRng(seed, 'offers', fight)() * 2 ** 31),
    fight: (fight: number) => challengeRng(seed, 'fight', fight),
    /** Whether a card turns up after this camp, which one, and (for an arranged fight) whether the player is caught. */
    cards: (fight: number) => challengeRng(seed, 'cards', fight),
  }
}

/** The challenge's fighter. Striking and takedowns are 30 to 65, and the reach takes what is left of the 150 points (20 to 90, so the build is always valid). */
export function challengeBuild(seed: number, name: string): Build {
  const rng = challengeRng(seed, 'fighter')
  const division = GAME_DIVISIONS[Math.floor(rng() * GAME_DIVISIONS.length)]
  const roll = rng()
  const stance: Stance = roll < 0.6 ? 'Orthodox' : roll < 0.9 ? 'Southpaw' : 'Switch'
  const striking = 30 + Math.floor(rng() * 36)
  const takedowns = 30 + Math.floor(rng() * 36)
  return { name, division, stance, striking, takedowns, reach: CREATE_BUDGET - striking - takedowns }
}

/** A seed for a new challenge. */
export function randomSeed(rng: Rng): number {
  return Math.floor(rng() * 2 ** 31)
}

/** The day's challenge is the same for everyone: its seed comes from the date in UTC. */
export function dailySeed(now: Date = new Date()): number {
  return mix(0, `daily-${now.toISOString().slice(0, 10)}`, 0) >>> 1
}

/** What a career is compared on in a challenge. */
export function challengeResult(career: Career): ChallengeResult {
  return {
    n: career.name,
    p: career.points,
    w: career.wins - START_RECORD.wins,
    l: career.losses - START_RECORD.losses,
    ko: career.koWins,
    sb: career.subWins,
    dc: career.decWins,
    t: career.titleWins,
    f: career.ufcFights,
    e: career.ended ?? 'retired',
  }
}

/** Who did better: a career that ended banned for an arranged fight loses to one that did not, then more ranking points, and with the same points more wins. */
export function compareResults(mine: ChallengeResult, theirs: ChallengeResult): 'win' | 'loss' | 'tie' {
  if ((mine.e === 'banned') !== (theirs.e === 'banned')) return mine.e === 'banned' ? 'loss' : 'win'
  if (mine.p !== theirs.p) return mine.p > theirs.p ? 'win' : 'loss'
  if (mine.w !== theirs.w) return mine.w > theirs.w ? 'win' : 'loss'
  return 'tie'
}

/** A challenge is over when its fights have been fought (or the career ended before: released, or too old). */
export function challengeDone(challenge: Challenge, career: Career): boolean {
  return Boolean(career.ended) || career.ufcFights >= challenge.fights
}

// ------------------------------------------------------------------------------------------------------ the link

export function readResult(raw: unknown): ChallengeResult | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const name = text(r.n, 24)
  const numbers = { p: counter(r.p, 500), w: counter(r.w, 60), l: counter(r.l, 60), ko: counter(r.ko, 60), sb: counter(r.sb, 60), dc: counter(r.dc, 60), t: counter(r.t, 20), f: counter(r.f, 60) }
  if (!name || Object.values(numbers).some((value) => value === null) || !END_REASONS.includes(r.e as EndReason)) return null
  return { n: name, e: r.e as EndReason, ...(numbers as Record<keyof typeof numbers, number>) }
}

/** What a challenge link carries: the seed, the number of fights and, when someone has played it, their result. */
export function encodeChallenge(challenge: Challenge): string {
  const raw: Record<string, unknown> = { s: challenge.seed, f: challenge.fights }
  if (challenge.target) raw.r = challenge.target
  return toBase64Url(JSON.stringify(raw))
}

/** Reads a challenge link. Anyone can write one by hand, so every field is checked; the result in it is shown with a note that it is not verified. */
export function decodeChallenge(encoded: string | null | undefined): Challenge | null {
  if (!encoded || encoded.length > 900) return null
  try {
    const raw = JSON.parse(fromBase64Url(encoded)) as Record<string, unknown>
    const seed = counter(raw.s, SEED_MAX)
    const fights = counter(raw.f, CHALLENGE_MAX_FIGHTS)
    if (seed === null || fights === null || fights < CHALLENGE_MIN_FIGHTS) return null
    let target: ChallengeResult | null = null
    if (raw.r !== undefined) {
      target = readResult(raw.r)
      if (!target) return null
    }
    return { seed, fights, target }
  } catch {
    return null
  }
}
