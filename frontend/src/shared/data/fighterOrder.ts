import type { FighterProfile, RankingCategory, TitleReign } from '../types/api'

/** Each division's ranking ("Lightweight" -> folded name -> rank): 0 for the champion, then 1 to 15. Pound-for-pound
 * lists are left out, since they mix divisions. */
export function divisionalRanks(rankings: RankingCategory[]): Map<string, Map<string, number>> {
  const divisions = new Map<string, Map<string, number>>()
  for (const category of rankings) {
    if (category.is_p4p) continue
    divisions.set(category.category.toLowerCase(), new Map(category.entries.map((entry) => [foldName(entry.fighter), entry.rank])))
  }
  return divisions
}

/** The ranking of one division, by its English name ("Lightweight"), or an empty one when it has none. */
export function ranksOf(divisions: Map<string, Map<string, number>>, division: string): Map<string, number> {
  return divisions.get(division.toLowerCase()) ?? new Map()
}

/** What a fighter did for a division's belt, from most to least: held it, held the interim belt, fought for it. */
export type HistoryMark = 'champion' | 'interim' | 'challenger' | 'hof'

export interface HistoryEntry {
  mark: HistoryMark
  /** Title defenses over every reign in the division, then days with the belt: the longer reign comes first. */
  defenses: number
  days: number
}

const MARK_ORDER: Record<HistoryMark, number> = { champion: 0, interim: 1, challenger: 2, hof: 3 }

/** "def. interim champion Petr Yan at UFC 273 on Apr 9, 2022 ; def. T.J. Dillashaw at ..." -> the beaten challengers. */
function beatenOpponents(detail: string | null): string[] {
  if (!detail) return []
  return detail
    .split(';')
    .map((part) => /def\.\s+(?:interim champion\s+)?(.+?)\s+at\s+/i.exec(part.trim())?.[1])
    .filter((name): name is string => Boolean(name))
}

/**
 * Who made history in each division ("lightweight" -> folded name -> entry), from every title reign: the champions,
 * the interim champions and everyone who fought for the belt and lost. A fighter keeps the highest mark they reached.
 */
export function divisionHistory(reigns: TitleReign[]): Map<string, Map<string, HistoryEntry>> {
  const divisions = new Map<string, Map<string, HistoryEntry>>()
  const mark = (division: string, name: string | null, kind: HistoryMark, defenses = 0, days = 0) => {
    if (!name) return
    const key = division.toLowerCase()
    const people = divisions.get(key) ?? new Map<string, HistoryEntry>()
    divisions.set(key, people)
    const folded = foldName(name)
    const current = people.get(folded)
    if (!current || MARK_ORDER[kind] < MARK_ORDER[current.mark]) {
      people.set(folded, { mark: kind, defenses: (current?.defenses ?? 0) + defenses, days: (current?.days ?? 0) + days })
    } else if (current.mark === kind) {
      current.defenses += defenses
      current.days += days
    }
  }
  for (const reign of reigns) {
    mark(reign.division, reign.champion, reign.title_type === 'interim' ? 'interim' : 'champion', reign.defenses_count, reign.days_held ?? 0)
    mark(reign.division, reign.opponent_beaten, 'challenger')
    for (const opponent of beatenOpponents(reign.defenses_detail)) mark(reign.division, opponent, 'challenger')
  }
  return divisions
}

/** A fighter's place in one division's history, adding the Hall of Fame for fighters filed in that division. */
export function historyOf(
  fighter: FighterProfile,
  history: Map<string, HistoryEntry>,
  filedHere: boolean,
): HistoryEntry | null {
  const entry = history.get(foldName(fighter.name))
  if (entry) return entry
  const badges = fighter.badges ?? []
  return filedHere && (badges.includes('hof') || badges.includes('goat')) ? { mark: 'hof', defenses: 0, days: 0 } : null
}

/** Win rate pulled toward 50% by two imaginary fights each way, so a 3-0 newcomer does not outrank a 20-3 veteran. */
function provenWinRate(fighter: FighterProfile): number {
  const wins = fighter.wins ?? 0
  const fights = (fighter.wins ?? 0) + (fighter.losses ?? 0) + (fighter.draws ?? 0)
  return (wins + 2) / (fights + 4)
}

/**
 * The best fighters of a division first: the champion and the official ranking (1 to 15), then those who made history
 * in the division (former champions by defenses and time with the belt, interim champions, title challengers, Hall of
 * Fame), then everyone else, active fighters before former ones and each group by their proven win rate.
 */
export function compareFighters(
  a: FighterProfile,
  b: FighterProfile,
  ranks: Map<string, number>,
  isActive: (fighter: FighterProfile) => boolean,
  historyOfFighter: (fighter: FighterProfile) => HistoryEntry | null = () => null,
): number {
  // The division's ranking decides first (0 is its champion); the belt flag only counts where there is no ranking.
  // A belt from another division (Makhachev at lightweight, holding the welterweight one) must not pass the ranked fighters.
  const beltRank = (fighter: FighterProfile) => (fighter.belt && ranks.size === 0 ? 0 : Number.POSITIVE_INFINITY)
  const rankA = ranks.get(foldName(a.name)) ?? beltRank(a)
  const rankB = ranks.get(foldName(b.name)) ?? beltRank(b)
  if (rankA !== rankB) return rankA - rankB
  const pastA = rankA === Number.POSITIVE_INFINITY ? historyOfFighter(a) : null
  const pastB = rankB === Number.POSITIVE_INFINITY ? historyOfFighter(b) : null
  const tierA = pastA ? MARK_ORDER[pastA.mark] : Number.POSITIVE_INFINITY
  const tierB = pastB ? MARK_ORDER[pastB.mark] : Number.POSITIVE_INFINITY
  if (tierA !== tierB) return tierA - tierB
  return (
    (pastB?.defenses ?? 0) - (pastA?.defenses ?? 0) ||
    (pastB?.days ?? 0) - (pastA?.days ?? 0) ||
    Number(isActive(b)) - Number(isActive(a)) ||
    provenWinRate(b) - provenWinRate(a) ||
    (b.wins ?? 0) - (a.wins ?? 0) ||
    a.name.localeCompare(b.name)
  )
}

/** A name for matching across sources: no accents, case or punctuation ("B.J. Penn" and "BJ Penn" are the same). */
export function foldName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The rank to print next to a fighter, or null when unranked: "C" for the champion, "#3" for third. The belt flag only
 * stands in for a ranking in a division that has none. */
export function rankLabel(fighter: FighterProfile, ranks: Map<string, number>): string | null {
  const rank = ranks.get(foldName(fighter.name)) ?? (fighter.belt && ranks.size === 0 ? 0 : undefined)
  if (rank === undefined) return null
  return rank === 0 ? 'C' : `#${rank}`
}
