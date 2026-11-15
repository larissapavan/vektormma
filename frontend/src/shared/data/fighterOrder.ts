import type { FighterProfile, RankingCategory } from '../types/api'

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

/** Win rate pulled toward 50% by two imaginary fights each way, so a 3-0 newcomer does not outrank a 20-3 veteran. */
function provenWinRate(fighter: FighterProfile): number {
  const wins = fighter.wins ?? 0
  const fights = (fighter.wins ?? 0) + (fighter.losses ?? 0) + (fighter.draws ?? 0)
  return (wins + 2) / (fights + 4)
}

/**
 * The best fighters of a division first: the champion, then the official ranking (1 to 15), then everyone else, active
 * fighters before former ones and each group by their proven win rate (more wins break a tie, then the name).
 */
export function compareFighters(
  a: FighterProfile,
  b: FighterProfile,
  ranks: Map<string, number>,
  isActive: (fighter: FighterProfile) => boolean,
): number {
  // The division's ranking decides first (0 is its champion); the belt flag only counts where there is no ranking.
  const rankA = ranks.get(foldName(a.name)) ?? (a.belt ? 0 : Number.POSITIVE_INFINITY)
  const rankB = ranks.get(foldName(b.name)) ?? (b.belt ? 0 : Number.POSITIVE_INFINITY)
  if (rankA !== rankB) return rankA - rankB
  return (
    Number(isActive(b)) - Number(isActive(a)) ||
    provenWinRate(b) - provenWinRate(a) ||
    (b.wins ?? 0) - (a.wins ?? 0) ||
    a.name.localeCompare(b.name)
  )
}

function foldName(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** The rank to print next to a fighter, or null when unranked: "C" for the champion, "#3" for third. The belt flag only
 * stands in for a ranking in a division that has none. */
export function rankLabel(fighter: FighterProfile, ranks: Map<string, number>): string | null {
  const rank = ranks.get(foldName(fighter.name)) ?? (fighter.belt && ranks.size === 0 ? 0 : undefined)
  if (rank === undefined) return null
  return rank === 0 ? 'C' : `#${rank}`
}
