import { normalizeFighterName } from '../hooks/useFighterImages'
import type { EventSummary, ResultEvent } from '../types/api'

/**
 * The visitor's picks against the model's. Everything here is worked out in the browser from what the API already publishes
 * (announced cards, results and the model's saved picks); the picks themselves never leave the browser.
 */

/** What the model said: the pick saved before the card once the result is in, the one on show when the visitor chose until then. */
export interface ModelSide {
  winner: string
  probability: number
}

/** `none` is a fight with no winner (a draw or a no contest) and `void` one that did not happen: neither counts for anyone. */
export interface MyResult {
  outcome: 'win' | 'none' | 'void'
  winner: string | null
}

export interface MyPick {
  event: string
  /** The day of the card, as announced (YYYY-MM-DD). */
  date: string
  a: string
  b: string
  winner: string
  model: ModelSide | null
  result: MyResult | null
}

/** Newest card first is a matter of display: the picks are kept in the order they were made. */
export type MyPicks = MyPick[]

const DAY_MS = 86_400_000
/** A card can move by a day between its announcement and its result (the two sources count the day in different time zones). */
const DAYS_APART = 2
/** A fight still without a result this long after its card did not happen, or never got one. */
const DAYS_TO_WAIT = 7
/** How far back the recent results go; older picks need the whole archive of events. */
export const RECENT_DAYS = 31

export const sameName = (a: string, b: string) => normalizeFighterName(a) === normalizeFighterName(b)

const samePair = (a1: string, b1: string, a2: string, b2: string) => (sameName(a1, a2) && sameName(b1, b2)) || (sameName(a1, b2) && sameName(b1, a2))

function daysBetween(a: string, b: string): number {
  return (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS
}

const near = (a: string, b: string) => Math.abs(daysBetween(a, b)) <= DAYS_APART

/** The visitor's day, not UTC's: a card on Saturday night in Las Vegas is still open on Saturday in Brazil. */
export function localDay(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Picks are taken until the end of the card's day: after that the results are out, and a pick would only be a memory. */
export const isOpenCard = (date: string, today: string) => date >= today

/** The pick on a fight, found by its two names and its day: cards are renamed and reordered, and fighters swap sides. */
export function findPick(picks: MyPicks, date: string, a: string, b: string): MyPick | undefined {
  return picks.find((pick) => near(pick.date, date) && samePair(pick.a, pick.b, a, b))
}

/** Choosing the fighter already chosen takes the pick back. */
export function togglePick(picks: MyPicks, next: Omit<MyPick, 'result'>): MyPicks {
  const current = findPick(picks, next.date, next.a, next.b)
  const rest = picks.filter((pick) => pick !== current)
  return current && sameName(current.winner, next.winner) ? rest : [...rest, { ...next, result: null }]
}

/** Whether the pick was right, or null while there is nothing to check it against. */
export function wasRight(pick: MyPick, choice: string): boolean | null {
  return pick.result?.outcome === 'win' && pick.result.winner ? sameName(choice, pick.result.winner) : null
}

/** The results as the settling reads them, from either source. */
export interface SettlingEvent {
  date: string
  /** Every fight listed has its final outcome. */
  complete: boolean
  fights: { a: string; b: string; outcome: 'win' | 'none' | 'pending'; winner: string | null; model: ModelSide | null }[]
}

export function fromResults(events: ResultEvent[]): SettlingEvent[] {
  return events
    .filter((event) => event.org_id === 'ufc')
    .map((event) => ({
      date: event.date,
      complete: event.fights.every((fight) => fight.outcome !== 'pending'),
      fights: event.fights.map((fight) => ({
        a: fight.fighter_1,
        b: fight.fighter_2,
        outcome: fight.outcome === 'win' || fight.outcome === 'pending' ? fight.outcome : 'none',
        winner: fight.outcome === 'win' ? fight.winner : null,
        model: fight.pick ? { winner: fight.pick.predicted_winner, probability: fight.pick.confidence } : null,
      })),
    }))
}

/** The archive of past events: official results, without the model's picks. */
export function fromArchive(events: EventSummary[]): SettlingEvent[] {
  return events.flatMap((event) =>
    event.date
      ? [
          {
            date: event.date,
            complete: true,
            fights: event.fights.map((fight) => ({
              a: fight.fighter_1,
              b: fight.fighter_2,
              outcome: fight.winner ? ('win' as const) : ('none' as const),
              winner: fight.winner,
              model: null,
            })),
          },
        ]
      : [],
  )
}

function settlePick(pick: MyPick, events: SettlingEvent[], today: string): MyPick {
  const late = daysBetween(pick.date, today) > DAYS_TO_WAIT
  const cards = events.filter((event) => near(event.date, pick.date))
  for (const card of cards) {
    const fight = card.fights.find((candidate) => samePair(candidate.a, candidate.b, pick.a, pick.b))
    if (!fight) continue
    const model = fight.model ?? pick.model
    if (fight.outcome === 'pending') return late ? { ...pick, model, result: { outcome: 'void', winner: null } } : pick
    return { ...pick, model, result: { outcome: fight.outcome, winner: fight.winner } }
  }
  // The card has its results and the fight is not on it: it fell through. Not on the night itself, when only part may be in.
  const past = daysBetween(pick.date, today) >= DAYS_APART
  const over = cards.some((card) => card.fights.length > 0 && past && (card.complete || late))
  return over ? { ...pick, result: { outcome: 'void', winner: null } } : pick
}

/** The picks with the results that are in. The same array comes back when nothing changed. */
export function settle(picks: MyPicks, events: SettlingEvent[], today: string): MyPicks {
  let changed = false
  const next = picks.map((pick) => {
    if (pick.result) return pick
    const settled = settlePick(pick, events, today)
    if (settled !== pick) changed = true
    return settled
  })
  return changed ? next : picks
}

/** The picks whose card has come (the results may be in), and whether some are too old for the recent results. */
export function waiting(picks: MyPicks, today: string): { due: boolean; old: boolean } {
  const due = picks.filter((pick) => !pick.result && pick.date <= today)
  return { due: due.length > 0, old: due.some((pick) => daysBetween(pick.date, today) >= RECENT_DAYS) }
}

export interface Score {
  /** The fights both picked and that had a winner: the only ones where the two can be compared. */
  fights: number
  you: number
  model: number
  /** Among them, those where the two chose different fighters, and how many of those each got right. */
  differed: number
  youOnly: number
  modelOnly: number
  /** Fights with a winner where the model had no pick. */
  alone: number
  aloneRight: number
}

export function score(picks: MyPicks): Score {
  const total: Score = { fights: 0, you: 0, model: 0, differed: 0, youOnly: 0, modelOnly: 0, alone: 0, aloneRight: 0 }
  for (const pick of picks) {
    const right = wasRight(pick, pick.winner)
    if (right == null) continue
    if (!pick.model) {
      total.alone += 1
      if (right) total.aloneRight += 1
      continue
    }
    const modelRight = wasRight(pick, pick.model.winner) === true
    total.fights += 1
    if (right) total.you += 1
    if (modelRight) total.model += 1
    if (right !== modelRight) {
      total.differed += 1
      if (right) total.youOnly += 1
      else total.modelOnly += 1
    }
  }
  return total
}

/**
 * Where the two chose different fighters, the chance that a fair coin would give a split at least this uneven (the two-sided
 * sign test). Where they agreed there is nothing to compare: both were right or both were wrong.
 */
export function chanceOfLuck(youOnly: number, modelOnly: number): number {
  const n = youOnly + modelOnly
  if (n === 0) return 1
  const most = Math.max(youOnly, modelOnly)
  let tail = 0
  let term = 1 // the binomial coefficient C(n, 0), then C(n, 1)…
  for (let k = 0; k <= n; k += 1) {
    if (k >= most) tail += term
    term = (term * (n - k)) / (k + 1)
  }
  return Math.min(1, (2 * tail) / 2 ** n)
}

export interface PastCard {
  event: string
  date: string
  picks: MyPick[]
}

/** The cards that have come, newest first, with the picks in the order they were made. */
export function pastCards(picks: MyPicks, today: string): PastCard[] {
  const cards: PastCard[] = []
  for (const pick of picks) {
    if (!pick.result && pick.date >= today) continue
    const card = cards.find((candidate) => near(candidate.date, pick.date))
    if (card) card.picks.push(pick)
    else cards.push({ event: pick.event, date: pick.date, picks: [pick] })
  }
  return cards.sort((first, second) => second.date.localeCompare(first.date))
}

// ------------------------------------------------------------------------------------------------ what the browser keeps

export const MY_CARD_KEY = 'vektor:my-card:v1'
/** The earlier picks window kept a card under its name, with its fights by position. */
export const OLD_PICKS_PREFIX = 'ufc_simulator_picks_'

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0

function readModel(value: unknown): ModelSide | null {
  const model = value as Partial<ModelSide> | null
  return model && typeof model === 'object' && isText(model.winner) && typeof model.probability === 'number' ? { winner: model.winner, probability: model.probability } : null
}

function readResult(value: unknown): MyResult | null {
  const result = value as Partial<MyResult> | null
  if (!result || typeof result !== 'object') return null
  if (result.outcome === 'win') return isText(result.winner) ? { outcome: 'win', winner: result.winner } : null
  return result.outcome === 'none' || result.outcome === 'void' ? { outcome: result.outcome, winner: null } : null
}

/** Whatever the browser kept, read as picks: anything that is not one is left out. */
export function parsePicks(text: string | null): MyPicks {
  try {
    const parsed: unknown = JSON.parse(text ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((value: unknown) => {
      const pick = value as Partial<MyPick> | null
      if (!pick || typeof pick !== 'object') return []
      const { event, date, a, b, winner } = pick
      if (!isText(event) || !isText(date) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isText(a) || !isText(b) || !isText(winner)) return []
      if (!sameName(winner, a) && !sameName(winner, b)) return []
      return [{ event, date, a, b, winner, model: readModel(pick.model), result: readResult(pick.result) }]
    })
  } catch {
    return []
  }
}

const sameCardName = (a: string, b: string) => normalizeFighterName(a) === normalizeFighterName(b)

/** The picks of one card as the earlier window kept them ({ "Alpha One_Beta Two_0": "Alpha One" }), as picks of today. */
export function fromOldPicks(name: string, text: string | null, events: EventSummary[]): MyPicks {
  const event = events.find((candidate) => candidate.date && sameCardName(candidate.name, name))
  if (!event?.date) return []
  try {
    const kept = JSON.parse(text ?? '{}') as Record<string, unknown>
    if (!kept || typeof kept !== 'object') return []
    const date = event.date
    return event.fights.flatMap((fight) => {
      const entry = Object.entries(kept).find(([key]) => key.startsWith(`${fight.fighter_1}_${fight.fighter_2}_`))
      const winner = [fight.fighter_1, fight.fighter_2].find((fighter) => fighter === entry?.[1])
      return winner ? [{ event: event.name, date, a: fight.fighter_1, b: fight.fighter_2, winner, model: null, result: null }] : []
    })
  } catch {
    return []
  }
}
