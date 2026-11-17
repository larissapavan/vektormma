import { describe, expect, it } from 'vitest'

import { compareFighters, divisionHistory, divisionalRanks, historyOf, rankLabel, ranksOf } from '../shared/data/fighterOrder'
import type { FighterProfile, RankingCategory, TitleReign } from '../shared/types/api'

function fighter(name: string, wins: number, losses: number, extra: Partial<FighterProfile> = {}): FighterProfile {
  return { name, wins, losses, draws: 0, belt: false, ...extra } as FighterProfile
}

const rankings = [
  { category: "Pound-for-Pound (Men's)", is_p4p: true, entries: [{ rank: 1, fighter: 'Veteran Ranked' }] },
  {
    category: 'Lightweight',
    is_p4p: false,
    entries: [
      { rank: 0, fighter: 'The Champion' },
      { rank: 1, fighter: 'Number Óne' },
      { rank: 7, fighter: 'Veteran Ranked' },
    ],
  },
] as unknown as RankingCategory[]

describe('the order of a division', () => {
  const ranks = ranksOf(divisionalRanks(rankings), 'Lightweight')
  const active = (f: FighterProfile) => f.name !== 'Retired Legend'

  it('puts the champion, then the ranking, then the rest by proven record', () => {
    const list = [
      fighter('Unbeaten Newcomer', 3, 0),
      fighter('Veteran Ranked', 20, 6),
      fighter('Retired Legend', 30, 2),
      fighter('Number One', 18, 2),
      fighter('Solid Unranked', 20, 3),
      fighter('The Champion', 25, 4, { belt: true }),
    ]
    expect(list.sort((a, b) => compareFighters(a, b, ranks, active)).map((f) => f.name)).toEqual([
      'The Champion',
      'Number One',
      'Veteran Ranked',
      'Solid Unranked',
      'Unbeaten Newcomer',
      'Retired Legend',
    ])
  })

  it('reads only the ranking of the division on screen', () => {
    expect(ranksOf(divisionalRanks(rankings), 'Featherweight').size).toBe(0)
    expect(ranksOf(divisionalRanks(rankings), 'lightweight').get('number one')).toBe(1)
  })

  it('puts a champion of another division after the ranking, and counts the belt only where there is no ranking', () => {
    const list = [fighter('Other Champion', 29, 1, { belt: true }), fighter('Veteran Ranked', 10, 5), fighter('The Champion', 20, 3)]
    expect(list.sort((a, b) => compareFighters(a, b, ranks, active)).map((f) => f.name)).toEqual([
      'The Champion',
      'Veteran Ranked',
      'Other Champion',
    ])
    const openClass = [fighter('Solid Unranked', 30, 0), fighter('Open Class Champion', 5, 2, { belt: true })]
    expect(openClass.sort((a, b) => compareFighters(a, b, new Map(), active)).map((f) => f.name)[0]).toBe('Open Class Champion')
  })

  it('labels the champion and ranked fighters, and leaves the rest unlabelled', () => {
    expect(rankLabel(fighter('The Champion', 1, 0), ranks)).toBe('C')
    expect(rankLabel(fighter('Other Champion', 1, 0, { belt: true }), ranks)).toBeNull()
    expect(rankLabel(fighter('Open Class Champion', 1, 0, { belt: true }), new Map())).toBe('C')
    expect(rankLabel(fighter('Veteran Ranked', 1, 0), ranks)).toBe('#7')
    expect(rankLabel(fighter('Solid Unranked', 1, 0), ranks)).toBeNull()
  })
})

describe('the history of a division', () => {
  const reigns = [
    { division: 'Lightweight', title_type: 'undisputed', champion: 'Long Reign', opponent_beaten: 'First Challenger', defenses_count: 3, days_held: 1200, defenses_detail: 'def. interim champion Interim Holder at UFC 1 on Jan 1, 2020 ; def. Second Challenger at UFC 2 on Jun 1, 2020' },
    { division: 'Lightweight', title_type: 'undisputed', champion: 'Short Reign', opponent_beaten: 'Long Reign', defenses_count: 0, days_held: 100, defenses_detail: null },
    { division: 'Lightweight', title_type: 'interim', champion: 'Interim Holder', opponent_beaten: null, defenses_count: 0, days_held: null, defenses_detail: null },
  ] as unknown as TitleReign[]
  const people = divisionHistory(reigns).get('lightweight')!

  it('keeps the highest mark each fighter reached', () => {
    expect(people.get('long reign')?.mark).toBe('champion')
    expect(people.get('interim holder')?.mark).toBe('interim')
    expect(people.get('second challenger')?.mark).toBe('challenger')
    expect(people.get('first challenger')?.mark).toBe('challenger')
  })

  it('matches names written with or without dots', () => {
    const penn = divisionHistory([{ division: 'Lightweight', title_type: 'undisputed', champion: 'B.J. Penn', opponent_beaten: null, defenses_count: 3, days_held: 900, defenses_detail: null }] as unknown as TitleReign[])
    expect(historyOf(fighter('BJ Penn', 16, 14), penn.get('lightweight')!, true)?.mark).toBe('champion')
  })

  it('puts history after the ranking and before everyone else, the longest reign first', () => {
    const ranks = new Map([['current champ', 0]])
    const pastOf = (f: FighterProfile) => historyOf(f, people, true)
    const list = [
      fighter('Unbeaten Prospect', 12, 0),
      fighter('Second Challenger', 15, 5),
      fighter('Hall Of Famer', 20, 8, { badges: ['hof'] }),
      fighter('Short Reign', 18, 4),
      fighter('Interim Holder', 22, 3),
      fighter('Long Reign', 25, 3),
      fighter('Current Champ', 20, 1),
    ]
    expect(list.sort((a, b) => compareFighters(a, b, ranks, () => true, pastOf)).map((f) => f.name)).toEqual([
      'Current Champ',
      'Long Reign',
      'Short Reign',
      'Interim Holder',
      'Second Challenger',
      'Hall Of Famer',
      'Unbeaten Prospect',
    ])
  })
})
