import { describe, expect, it } from 'vitest'

import { compareFighters, divisionalRanks, rankLabel, ranksOf } from '../shared/data/fighterOrder'
import type { FighterProfile, RankingCategory } from '../shared/types/api'

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

  it('labels the champion and ranked fighters, and leaves the rest unlabelled', () => {
    expect(rankLabel(fighter('The Champion', 1, 0), ranks)).toBe('C')
    expect(rankLabel(fighter('Other Champion', 1, 0, { belt: true }), ranks)).toBeNull()
    expect(rankLabel(fighter('Open Class Champion', 1, 0, { belt: true }), new Map())).toBe('C')
    expect(rankLabel(fighter('Veteran Ranked', 1, 0), ranks)).toBe('#7')
    expect(rankLabel(fighter('Solid Unranked', 1, 0), ranks)).toBeNull()
  })
})
