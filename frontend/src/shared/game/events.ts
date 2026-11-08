import { titleShotAvailable, type Career, type Method, type Rng } from './career'

/**
 * The cards that turn up between a camp and the matchmaking: a sponsor's deal, or an arranged fight. The game has no money, so
 * everything is paid in ranking points, and both cards ask something of the player in return.
 *
 * A sponsor's deal is about the next fight: it pays when the fight goes as the contract says and costs a little when it does
 * not, so taking it changes which fight is worth picking. An arranged fight is a temptation: the player loses the next fight on
 * purpose, for a big bonus, and may be caught (and banned for life). It is shown as what it is, against the rules and a
 * betrayal of the sport; the game exists to make that choice cost something.
 */

export type DealId = 'winner' | 'finisher' | 'underdog'

export interface DealDef {
  id: DealId
  /** Ranking points when the fight goes as the contract says. */
  reward: number
  /** Ranking points lost when it does not. */
  penalty: number
  /** Does this fight meet the contract? */
  met: (fight: { won: boolean; method: Method; chance: number }) => boolean
}

/** A win counts for the underdog contract when the model gave the player less than this chance. */
export const UNDERDOG_CHANCE = 0.45

export const DEALS: Record<DealId, DealDef> = {
  winner: { id: 'winner', reward: 3, penalty: 2, met: (fight) => fight.won },
  finisher: { id: 'finisher', reward: 4, penalty: 1, met: (fight) => fight.won && fight.method !== 'dec' },
  underdog: { id: 'underdog', reward: 5, penalty: 1, met: (fight) => fight.won && fight.chance < UNDERDOG_CHANCE },
}

export const DEAL_IDS = Object.keys(DEALS) as DealId[]

export function isDealId(value: unknown): value is DealId {
  return typeof value === 'string' && (DEAL_IDS as string[]).includes(value)
}

/** What an arranged fight pays, and the chance the player is caught for it. */
export const FIX_REWARD = 6
export const FIX_CAUGHT_CHANCE = 0.35
/** An arranged fight is only offered to someone who has been in the UFC a while and is not on the way to a title shot or holding the belt. */
export const FIX_MIN_FIGHTS = 3

/** The chance that a camp is followed by a card, and how much of it is the arranged fight when that is on offer. */
export const CARD_CHANCE = 0.4
export const FIX_SHARE = 0.3

export type Card = { kind: 'sponsor'; deal: DealId } | { kind: 'fix' }

export function isCard(value: unknown): value is Card {
  if (typeof value !== 'object' || value === null) return false
  const card = value as Record<string, unknown>
  return card.kind === 'fix' || (card.kind === 'sponsor' && isDealId(card.deal))
}

/** Can this career be offered an arranged fight right now? */
export function fixOnOffer(career: Career) {
  return !career.champion && !career.ended && career.ufcFights >= FIX_MIN_FIGHTS && !titleShotAvailable(career)
}

/** The card for this camp, or null for none. The draw always rolls the same three numbers, so a challenge's stream stays in step. */
export function drawCard(career: Career, rng: Rng): Card | null {
  const chance = rng()
  const kind = rng()
  const pick = rng()
  if (career.pact || career.ended || chance >= CARD_CHANCE) return null
  if (kind < FIX_SHARE && fixOnOffer(career)) return { kind: 'fix' }
  return { kind: 'sponsor', deal: DEAL_IDS[Math.floor(pick * DEAL_IDS.length)] }
}

/** The career after the player takes the card. An arranged fight rolls here, once, whether the player will be caught. */
export function acceptCard(career: Career, card: Card, rng: Rng): Career {
  if (card.kind === 'sponsor') return { ...career, pact: { kind: 'deal', id: card.deal } }
  return { ...career, pact: { kind: 'fix', caught: rng() < FIX_CAUGHT_CHANCE } }
}

export interface PactOutcome {
  career: Career
  /** The deal that was on, and whether the fight met it. */
  deal: { id: DealId; met: boolean } | null
  /** An arranged fight was played, and whether it came out. */
  fix: { caught: boolean } | null
  /** Ranking points the pact paid (negative: it cost). Already in `career.points`. */
  points: number
}

/** What the pact (if any) did once the fight was settled: the deal pays or costs, the arranged fight pays and may end the career. */
export function settlePact(before: Career, settled: Career, fight: { won: boolean; method: Method; chance: number }): PactOutcome {
  const pact = before.pact
  const next: Career = { ...settled, pact: null }
  if (!pact) return { career: next, deal: null, fix: null, points: 0 }
  if (pact.kind === 'deal') {
    if (!isDealId(pact.id)) return { career: next, deal: null, fix: null, points: 0 }
    const def = DEALS[pact.id]
    const met = def.met(fight)
    next.points = Math.max(0, settled.points + (met ? def.reward : -def.penalty))
    return { career: next, deal: { id: def.id, met }, fix: null, points: next.points - settled.points }
  }
  next.points = settled.points + FIX_REWARD
  if (pact.caught) next.ended = 'banned'
  return { career: next, deal: null, fix: { caught: pact.caught }, points: FIX_REWARD }
}
