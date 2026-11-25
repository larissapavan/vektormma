import { describe, expect, it } from 'vitest'

import {
  chanceOfLuck,
  findPick,
  fromArchive,
  fromOldPicks,
  fromResults,
  isOpenCard,
  parsePicks,
  pastCards,
  score,
  settle,
  togglePick,
  waiting,
  type MyPick,
  type SettlingEvent,
} from '../shared/data/myCard'
import { picksMessage, resultMessage, scoreReading } from '../shared/data/myCardText'
import type { EventSummary, ResultEvent } from '../shared/types/api'

const pick = (over: Partial<MyPick> = {}): MyPick => ({ event: 'UFC 1', date: '2026-11-07', a: 'Alpha One', b: 'Beta Two', winner: 'Alpha One', model: { winner: 'Beta Two', probability: 0.6 }, result: null, ...over })
const card = (fights: SettlingEvent['fights'], over: Partial<SettlingEvent> = {}): SettlingEvent => ({ date: '2026-11-07', complete: true, fights, ...over })
const bout = (over: Partial<SettlingEvent['fights'][number]> = {}): SettlingEvent['fights'][number] => ({ a: 'Alpha One', b: 'Beta Two', outcome: 'win', winner: 'Alpha One', model: null, ...over })
const won = (winner: string) => ({ outcome: 'win' as const, winner })

describe('finding and changing a pick', () => {
  it('finds it with the corners swapped, accents dropped and the card moved by a day', () => {
    const picks = [pick({ a: 'Benoît Saint Denis', winner: 'Beta Two' })]
    expect(findPick(picks, '2026-11-08', 'Beta Two', 'Benoit Saint Denis')).toBe(picks[0])
    expect(findPick(picks, '2026-12-08', 'Beta Two', 'Benoit Saint Denis')).toBeUndefined()
  })

  it('replaces the choice, and takes it back when it is chosen again', () => {
    const { result: _result, ...choice } = pick()
    void _result
    const once = togglePick([], choice)
    const other = togglePick(once, { ...choice, winner: 'Beta Two' })
    expect(other.map((item) => item.winner)).toEqual(['Beta Two'])
    expect(togglePick(other, { ...choice, winner: 'Beta Two' })).toEqual([])
  })

  it('takes picks until the end of the day of the card', () => {
    expect([isOpenCard('2026-11-07', '2026-11-06'), isOpenCard('2026-11-07', '2026-11-07'), isOpenCard('2026-11-07', '2026-11-08')]).toEqual([true, true, false])
  })
})

describe('settling', () => {
  it('takes the official winner and the pick the model saved before the card', () => {
    const [settled] = settle([pick()], [card([bout({ a: 'Beta Two', b: 'Alpha One', model: { winner: 'Alpha One', probability: 0.55 } })])], '2026-11-08')
    expect(settled.result).toEqual(won('Alpha One'))
    expect(settled.model).toEqual({ winner: 'Alpha One', probability: 0.55 })
  })

  it('keeps the model pick that was on show when the results carry none', () => {
    expect(settle([pick()], [card([bout()])], '2026-11-08')[0].model).toEqual({ winner: 'Beta Two', probability: 0.6 })
  })

  it('counts a draw or a no contest for neither', () => {
    const settled = settle([pick()], [card([bout({ outcome: 'none', winner: null })])], '2026-11-08')
    expect(settled[0].result).toEqual({ outcome: 'none', winner: null })
    expect(score(settled).fights).toBe(0)
  })

  it('voids a fight that is not on the finished card, but not on the night itself', () => {
    const others = [card([bout({ a: 'Gamma Three', b: 'Delta Four' })])]
    expect(settle([pick()], others, '2026-11-08')[0].result).toBeNull()
    expect(settle([pick()], others, '2026-11-09')[0].result).toEqual({ outcome: 'void', winner: null })
    expect(settle([pick()], [card([bout({ a: 'Gamma Three', b: 'Delta Four' })], { complete: false })], '2026-11-09')[0].result).toBeNull()
    expect(settle([pick()], [card([])], '2026-11-30')[0].result).toBeNull()
  })

  it('waits for a pending fight, and gives up on it after a week', () => {
    const pending = [card([bout({ outcome: 'pending', winner: null })], { complete: false })]
    const picks = [pick()]
    expect(settle(picks, pending, '2026-11-10')).toBe(picks)
    expect(settle(picks, pending, '2026-11-15')[0].result?.outcome).toBe('void')
  })

  it('does not touch a pick already settled', () => {
    const picks = [pick({ result: won('Beta Two') })]
    expect(settle(picks, [card([bout()])], '2026-11-08')).toBe(picks)
  })

  it('asks for results only once a card has come, and for the archive only when it is old', () => {
    expect(waiting([pick()], '2026-11-06')).toEqual({ due: false, old: false })
    expect(waiting([pick()], '2026-11-08')).toEqual({ due: true, old: false })
    expect(waiting([pick()], '2026-12-20')).toEqual({ due: true, old: true })
    expect(waiting([pick({ result: won('Alpha One') })], '2026-12-20')).toEqual({ due: false, old: false })
  })

  it('reads the UFC results and the archive', () => {
    const result = {
      org_id: 'ufc',
      date: '2026-11-07',
      fights: [
        { fighter_1: 'A', fighter_2: 'B', winner: 'A', outcome: 'win', pick: { predicted_winner: 'B', confidence: 0.7, correct: false } },
        { fighter_1: 'C', fighter_2: 'D', winner: null, outcome: 'draw', pick: null },
      ],
    }
    const [event, ...more] = fromResults([result, { ...result, org_id: 'rizin' }] as unknown as ResultEvent[])
    expect(more).toEqual([])
    expect(event.complete).toBe(true)
    expect(event.fights.map((fight) => [fight.outcome, fight.model?.winner])).toEqual([
      ['win', 'B'],
      ['none', undefined],
    ])
    const archive = fromArchive([
      { name: 'X', date: '2026-01-01', fights: [{ fighter_1: 'A', fighter_2: 'B', winner: null }] },
      { name: 'Y', date: null, fights: [] },
    ] as unknown as EventSummary[])
    expect(archive).toEqual([{ date: '2026-01-01', complete: true, fights: [{ a: 'A', b: 'B', outcome: 'none', winner: null, model: null }] }])
  })
})

describe('the score', () => {
  const settled = [
    pick({ result: won('Alpha One') }), // you, against the model
    pick({ a: 'C', b: 'D', winner: 'C', model: { winner: 'C', probability: 0.7 }, result: won('C') }), // both
    pick({ a: 'E', b: 'F', winner: 'E', model: { winner: 'F', probability: 0.7 }, result: won('F') }), // the model
    pick({ a: 'G', b: 'H', winner: 'G', model: null, result: won('G') }), // the model had none
    pick({ a: 'I', b: 'J', winner: 'I', result: { outcome: 'void', winner: null } }),
    pick({ a: 'K', b: 'L', winner: 'K' }),
  ]

  it('compares the two only on the fights both picked', () => {
    expect(score(settled)).toEqual({ fights: 3, you: 2, model: 2, differed: 2, youOnly: 1, modelOnly: 1, alone: 1, aloneRight: 1 })
  })

  it('says how likely luck alone is, from the fights where they differed', () => {
    expect(chanceOfLuck(0, 0)).toBe(1)
    expect(chanceOfLuck(1, 1)).toBe(1)
    expect(chanceOfLuck(5, 0)).toBeCloseTo(0.0625)
    expect(chanceOfLuck(0, 6)).toBeCloseTo(0.03125)
    expect(chanceOfLuck(15, 5)).toBeCloseTo(0.0414, 3)
  })

  it('does not call a small gap skill, in any language', () => {
    const total = (youOnly: number, modelOnly: number) => ({ fights: 30, you: 20, model: 20, differed: youOnly + modelOnly, youOnly, modelOnly, alone: 0, aloneRight: 0 })
    expect(scoreReading(total(3, 2), 'en')).toMatch(/too few to say/)
    expect(scoreReading(total(10, 0), 'en')).toMatch(/unlikely to be luck/)
    expect(scoreReading(total(2, 2), 'pt-BR')).toMatch(/empate/)
    expect(scoreReading(total(1, 0), 'es')).toMatch(/quien acertó fuiste tú/)
    expect(scoreReading(total(0, 1), 'fr')).toMatch(/le modèle qui avait raison/)
    expect(scoreReading(total(0, 0), 'en')).toMatch(/no difference to compare/)
  })

  it('groups the cards that have come, newest first, and leaves out the ones still open', () => {
    const picks = [pick(), pick({ date: '2026-11-08', a: 'C', b: 'D', winner: 'C' }), pick({ date: '2026-11-14', event: 'UFC 2' }), pick({ date: '2026-12-01', event: 'UFC 3' })]
    expect(pastCards(picks, '2026-11-20').map((entry) => [entry.event, entry.picks.length])).toEqual([
      ['UFC 2', 1],
      ['UFC 1', 2],
    ])
  })

  it('writes the messages to share', () => {
    expect(picksMessage('UFC 1', [pick(), pick({ a: 'C', b: 'D', winner: 'C', model: null })], 'en')).toBe('My picks for UFC 1\nAlpha One vs. Beta Two: Alpha One (the model: Beta Two)\nC vs. D: C')
    expect(resultMessage('UFC 1', settled, 'pt-BR')).toBe('UFC 1: acertei 3 de 4; o modelo, 2 de 3.')
    expect(resultMessage('UFC 1', [settled[3]], 'en')).toBe('UFC 1: I got 1 of 1 right.')
  })
})

describe('what the browser kept', () => {
  it('reads its own picks back and drops anything else', () => {
    const picks = [pick(), pick({ a: 'C', b: 'D', winner: 'D', model: null, result: won('D') })]
    expect(parsePicks(JSON.stringify(picks))).toEqual(picks)
    const bad = [null, 3, {}, pick({ winner: 'Someone Else' }), pick({ date: 'soon' })]
    expect(parsePicks(JSON.stringify(bad))).toEqual([])
    for (const text of [null, '', '{', '{"a":1}']) expect(parsePicks(text)).toEqual([])
    expect(parsePicks(JSON.stringify([{ ...pick(), model: 'x', result: { outcome: 'win' } }]))).toEqual([pick({ model: null })])
  })

  it('takes the picks of the earlier window, even when the card was renamed or reordered', () => {
    const events = [
      {
        name: 'UFC Fight Night: Alpha vs Beta',
        date: '2026-12-05',
        fights: [
          { fighter_1: 'C', fighter_2: 'D' },
          { fighter_1: 'Alpha One', fighter_2: 'Beta Two' },
        ],
      },
    ] as unknown as EventSummary[]
    const taken = fromOldPicks('UFC Fight Night: Alpha vs. Beta', JSON.stringify({ 'Alpha One_Beta Two_0': 'Beta Two', C_D_1: 'Nobody' }), events)
    expect(taken).toEqual([{ event: 'UFC Fight Night: Alpha vs Beta', date: '2026-12-05', a: 'Alpha One', b: 'Beta Two', winner: 'Beta Two', model: null, result: null }])
    expect(fromOldPicks('Another card', '{}', events)).toEqual([])
    expect(fromOldPicks('UFC Fight Night: Alpha vs Beta', '{', events)).toEqual([])
  })
})
