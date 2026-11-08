import { describe, expect, it } from 'vitest'

import { createCareer, fight, playRound, seededRng, settleFight, startFight, throwFight, type Build, type Career, type Offer } from '../shared/game/career'
import { compareResults, challengeResult } from '../shared/game/challenge'
import { acceptCard, CARD_CHANCE, DEAL_IDS, DEALS, drawCard, FIX_CAUGHT_CHANCE, FIX_MIN_FIGHTS, FIX_REWARD, fixOnOffer, isCard, isDealId, settlePact, UNDERDOG_CHANCE } from '../shared/game/events'
import { DEAL_TEXT } from '../shared/game/eventsText'
import { endingText } from '../shared/game/labels'
import { finishFight } from '../shared/game/progress'

const build: Build = { name: 'Maria', division: 'Lightweight', stance: 'Orthodox', striking: 60, takedowns: 45, reach: 40 }
const player = { sig_str_acc: 0.5, takedown_acc: 0.4 }
const offer = (chance: number, extra: Partial<Offer> = {}): Offer => ({ label: 'even', name: 'Rival One', win_probability: chance, sig_str_acc: 0.45, takedown_acc: 0.38, champion: false, ...extra })
const veteran = (extra: Partial<Career> = {}): Career => ({ ...createCareer(build), ufcFights: 4, points: 6, ...extra })

/** A fight the player wins by decision (every roll low) or loses on the cards (every roll high). */
const play = (career: Career, chance: number, win: boolean, extra: Partial<Offer> = {}) => {
  const rng = () => (win ? 0 : 0.999)
  return finishFight(career, offer(chance, extra), settleState(career, chance, rng, extra), extra.champion ?? false)
}
function settleState(career: Career, chance: number, rng: () => number, extra: Partial<Offer>) {
  let state = startFight(career, offer(chance, extra), 'balanced', player, rng, extra.champion ?? false)
  while (!state.over) state = playRound(state, 'steady', rng)
  return state
}

describe('drawing a card', () => {
  it('turns up after about two camps in five, and is the same card for the same dice', () => {
    const career = veteran()
    const cards = Array.from({ length: 2000 }, (_, seed) => drawCard(career, seededRng(seed + 1)))
    const share = cards.filter(Boolean).length / cards.length
    expect(share).toBeGreaterThan(CARD_CHANCE - 0.04)
    expect(share).toBeLessThan(CARD_CHANCE + 0.04)
    expect(Array.from({ length: 200 }, (_, seed) => drawCard(career, seededRng(seed + 1)))).toEqual(cards.slice(0, 200))
  })

  it('always rolls three numbers, card or not, so a challenge’s stream stays in step', () => {
    for (const career of [veteran(), veteran({ pact: { kind: 'fix', caught: false } }), veteran({ ended: 'retired' })]) {
      for (let seed = 1; seed < 20; seed += 1) {
        const rng = seededRng(seed)
        const twin = seededRng(seed)
        drawCard(career, rng)
        twin()
        twin()
        twin()
        expect(rng()).toBe(twin())
      }
    }
  })

  it('offers no card to a career that has already agreed to something or has ended', () => {
    for (let seed = 1; seed < 100; seed += 1) {
      expect(drawCard(veteran({ pact: { kind: 'deal', id: 'winner' } }), seededRng(seed))).toBeNull()
      expect(drawCard(veteran({ ended: 'retired' }), seededRng(seed))).toBeNull()
    }
  })

  it('offers an arranged fight only to someone with some fights, not champion and not on the way to a title shot', () => {
    expect(fixOnOffer(veteran())).toBe(true)
    expect(fixOnOffer(veteran({ ufcFights: FIX_MIN_FIGHTS - 1 }))).toBe(false)
    expect(fixOnOffer(veteran({ champion: true }))).toBe(false)
    expect(fixOnOffer(veteran({ points: 20 }))).toBe(false)
    const kinds = (career: Career) => new Set(Array.from({ length: 600 }, (_, seed) => drawCard(career, seededRng(seed + 1))?.kind))
    expect(kinds(veteran())).toEqual(new Set(['sponsor', 'fix', undefined]))
    for (const career of [veteran({ ufcFights: 1 }), veteran({ champion: true }), veteran({ points: 25 })]) expect(kinds(career).has('fix')).toBe(false)
  })

  it('draws every sponsor deal', () => {
    const deals = new Set(Array.from({ length: 600 }, (_, seed) => drawCard(veteran({ ufcFights: 0 }), seededRng(seed + 1))).flatMap((card) => (card?.kind === 'sponsor' ? [card.deal] : [])))
    expect(deals).toEqual(new Set(DEAL_IDS))
  })

  it('checks what comes back from a save', () => {
    expect(isCard({ kind: 'fix' })).toBe(true)
    expect(isCard({ kind: 'sponsor', deal: 'winner' })).toBe(true)
    for (const bad of [null, 'fix', {}, { kind: 'sponsor' }, { kind: 'sponsor', deal: 'free-money' }, { kind: 'loan' }]) expect(isCard(bad)).toBe(false)
    expect(isDealId('winner')).toBe(true)
    expect(isDealId('constructor')).toBe(false)
  })

  it('has words for every deal', () => {
    for (const id of DEAL_IDS) expect(DEAL_TEXT[id].sponsor.length).toBeGreaterThan(0)
  })
})

describe('accepting a card', () => {
  it('writes the sponsor’s deal on the career without touching the dice', () => {
    const rng = () => {
      throw new Error('a sponsor’s deal rolls nothing')
    }
    expect(acceptCard(veteran(), { kind: 'sponsor', deal: 'finisher' }, rng).pact).toEqual({ kind: 'deal', id: 'finisher' })
  })

  it('rolls once, when the player agrees to an arranged fight, whether the player will be caught', () => {
    const caught = (roll: number) => acceptCard(veteran(), { kind: 'fix' }, () => roll).pact
    expect(caught(FIX_CAUGHT_CHANCE - 0.01)).toEqual({ kind: 'fix', caught: true })
    expect(caught(FIX_CAUGHT_CHANCE + 0.01)).toEqual({ kind: 'fix', caught: false })
    const rate = Array.from({ length: 2000 }, (_, seed) => acceptCard(veteran(), { kind: 'fix' }, seededRng(seed + 1)).pact).filter((pact) => pact?.kind === 'fix' && pact.caught).length / 2000
    expect(rate).toBeGreaterThan(FIX_CAUGHT_CHANCE - 0.04)
    expect(rate).toBeLessThan(FIX_CAUGHT_CHANCE + 0.04)
  })
})

describe('a sponsor’s deal', () => {
  const deal = (id: (typeof DEAL_IDS)[number]) => veteran({ pact: { kind: 'deal', id } })

  it('pays when the fight goes as the contract says and costs a little when it does not', () => {
    const won = play(deal('winner'), 0.7, true)
    expect(won.deal).toEqual({ id: 'winner', met: true })
    expect(won.pactPoints).toBe(DEALS.winner.reward)
    expect(won.career.points).toBe(6 + won.pointsGained + DEALS.winner.reward)
    const lost = play(deal('winner'), 0.7, false)
    expect(lost.deal).toEqual({ id: 'winner', met: false })
    expect(lost.pactPoints).toBe(-DEALS.winner.penalty)
    expect(lost.career.points).toBe(Math.max(0, 6 + lost.pointsGained - DEALS.winner.penalty))
  })

  it('asks for a finish, or for a win as the underdog, and not for a win that is neither', () => {
    expect(DEALS.finisher.met({ won: true, method: 'dec', chance: 0.7 })).toBe(false) // a win on the cards
    expect(DEALS.finisher.met({ won: true, method: 'ko', chance: 0.7 })).toBe(true)
    expect(DEALS.finisher.met({ won: true, method: 'sub', chance: 0.7 })).toBe(true)
    expect(DEALS.finisher.met({ won: false, method: 'ko', chance: 0.7 })).toBe(false)
    expect(DEALS.underdog.met({ won: true, method: 'dec', chance: 0.7 })).toBe(false) // a favorite
    expect(DEALS.underdog.met({ won: true, method: 'dec', chance: UNDERDOG_CHANCE - 0.01 })).toBe(true)
    expect(DEALS.underdog.met({ won: false, method: 'dec', chance: 0.2 })).toBe(false)
    const finished = play(deal('finisher'), 0.7, true) // every roll low: the player finishes in round one
    expect(finished.method).not.toBe('dec')
    expect(finished.deal).toEqual({ id: 'finisher', met: true })
    expect(play(deal('underdog'), UNDERDOG_CHANCE - 0.1, true).deal?.met).toBe(true)
    expect(play(deal('underdog'), 0.7, true).deal?.met).toBe(false)
  })

  it('is only for the next fight, and never takes the points below zero', () => {
    const settled = play(deal('winner'), 0.7, true)
    expect(settled.career.pact).toBeNull()
    const broke = play(veteran({ points: 0, pact: { kind: 'deal', id: 'winner' } }), 0.7, false)
    expect(broke.career.points).toBe(0)
    expect(broke.pactPoints).toBe(0)
  })

  it('does nothing when the save names a deal that does not exist', () => {
    const result = play(veteran({ pact: { kind: 'deal', id: 'free-money' } }), 0.7, true)
    expect(result.deal).toBeNull()
    expect(result.pactPoints).toBe(0)
    expect(result.career.pact).toBeNull()
  })

  it('leaves a fight with no pact as it was', () => {
    const plain = play(veteran(), 0.7, true)
    expect(plain.deal).toBeNull()
    expect(plain.fix).toBeNull()
    expect(plain.pactPoints).toBe(0)
    expect(plain.career.points).toBe(6 + plain.pointsGained)
  })
})

describe('an arranged fight, played out', () => {
  const arranged = (caught: boolean, extra: Partial<Career> = {}) => veteran({ pact: { kind: 'fix', caught }, ...extra })
  const throwIt = (career: Career) => finishFight(career, offer(0.6), throwFight(startFight(career, offer(0.6), 'balanced', player, () => 0.5)))

  it('pays its bonus on top of the loss, and the loss stays on the record', () => {
    const result = throwIt(arranged(false))
    expect(result.won).toBe(false)
    expect(result.fix).toEqual({ caught: false })
    expect(result.pactPoints).toBe(FIX_REWARD)
    expect(result.career).toMatchObject({ losses: 1, lossStreak: 1, ended: null, pact: null })
    expect(result.career.points).toBe(6 + result.pointsGained + FIX_REWARD)
  })

  it('ends the career, banned for life, when the player is caught', () => {
    const result = throwIt(arranged(true))
    expect(result.career.ended).toBe('banned')
    expect(result.fix).toEqual({ caught: true })
  })

  it('bans even a player who was about to be released for three losses', () => {
    const result = throwIt(arranged(true, { lossStreak: 2 }))
    expect(result.career.ended).toBe('banned')
  })

  it('clears the pact once the fight is settled', () => {
    expect(throwIt(arranged(false)).career.pact).toBeNull()
  })

  it('does not change what settleFight alone does', () => {
    const career = arranged(false)
    const state = throwFight(startFight(career, offer(0.6), 'balanced', player, () => 0.5))
    expect(settleFight(career, offer(0.6), state).career.pact).toEqual(career.pact) // the pact is settled in finishFight/settlePact
    expect(settlePact(career, settleFight(career, offer(0.6), state).career, { won: false, method: 'dec', chance: 0.6 }).career.pact).toBeNull()
  })
})

describe('a banned career in a challenge', () => {
  it('loses to one that was not, however many points it has, and is told in its own words', () => {
    const banned = challengeResult({ ...veteran({ points: 40 }), ended: 'banned' })
    const clean = challengeResult({ ...veteran({ points: 3 }), ended: 'retired' })
    expect(compareResults(banned, clean)).toBe('loss')
    expect(compareResults(clean, banned)).toBe('win')
    expect(compareResults(banned, challengeResult({ ...veteran({ points: 5 }), ended: 'banned' }))).toBe('win') // two bans: points decide
    expect(endingText('en', { e: 'banned', a: 31, f: 9 })).toMatch(/banned from the UFC at 31/i)
    expect(endingText('pt', { e: 'banned', a: 31, f: 9 })).toMatch(/banido/i)
  })

  it('still lets a clean career be played to the end of a fight', () => {
    expect(fight(veteran(), offer(0.5), 'balanced', player, () => 0).won).toBe(true)
  })
})
