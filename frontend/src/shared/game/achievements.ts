import type { Career, FightResult } from './career'
import { standing } from './career'

/**
 * The achievements: things worth remembering, from a single fight (a finish in round 1, an upset, a win while trailing) or
 * from the whole career (the belt, a career without a loss). Each is earned once per career, and the collection of what the
 * browser has ever earned lives in trophies.ts.
 */
export type AchievementId =
  | 'debut'
  | 'knockout_artist'
  | 'submission_hunter'
  | 'lightning'
  | 'hot_streak'
  | 'giant_killer'
  | 'revenge'
  | 'all_in'
  | 'lock_down'
  | 'champion'
  | 'defender'
  | 'top5'
  | 'unbeaten'
  | 'veteran'
  | 'survivor'

/** A win counts as a heavy upset when the model gave the player less than this chance. */
export const GIANT_KILLER_CHANCE = 0.35
export const UNBEATEN_MIN_FIGHTS = 5

export interface AchievementContext {
  /** The career before the fight (or, at the end of a career, the career itself). */
  before: Career
  after: Career
  /** The fight that has just happened, or null when the career is closing. */
  result: FightResult | null
  opponent: string
  ended: boolean
}

export interface AchievementDef {
  id: AchievementId
  check: (context: AchievementContext) => boolean
}

const won = (context: AchievementContext) => context.result?.won === true
const finished = (context: AchievementContext) => won(context) && context.result?.method !== 'dec'

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'debut', check: (c) => won(c) && c.after.ufcFights === 1 },
  { id: 'knockout_artist', check: (c) => c.after.koWins >= 3 },
  { id: 'submission_hunter', check: (c) => c.after.subWins >= 3 },
  { id: 'lightning', check: (c) => finished(c) && c.result?.round === 1 },
  { id: 'hot_streak', check: (c) => c.after.bestStreak >= 5 },
  { id: 'giant_killer', check: (c) => won(c) && (c.result?.chance ?? 1) < GIANT_KILLER_CHANCE },
  { id: 'revenge', check: (c) => won(c) && c.before.rival !== null && c.before.rival === c.opponent },
  {
    // A finish with an attack in the round it ended, after losing more rounds than winning.
    id: 'all_in',
    check: (c) => {
      const rounds = c.result?.rounds ?? []
      const last = rounds[rounds.length - 1]
      if (!finished(c) || !last || last.tactic !== 'attack') return false
      const earlier = rounds.slice(0, -1)
      return earlier.filter((round) => round.edge === 'opp').length > earlier.filter((round) => round.edge === 'you').length
    },
  },
  {
    // A decision won by covering up in the last round.
    id: 'lock_down',
    check: (c) => {
      const rounds = c.result?.rounds ?? []
      return won(c) && c.result?.method === 'dec' && rounds[rounds.length - 1]?.tactic === 'cover'
    },
  },
  { id: 'champion', check: (c) => c.after.titleWins >= 1 },
  { id: 'defender', check: (c) => c.after.defenses >= 3 },
  { id: 'top5', check: (c) => ['top5', 'contender', 'champion'].includes(standing(c.after)) },
  { id: 'unbeaten', check: (c) => c.ended && c.after.losses === 0 && c.after.ufcFights >= UNBEATEN_MIN_FIGHTS },
  { id: 'veteran', check: (c) => c.after.ufcFights >= 15 },
  { id: 'survivor', check: (c) => won(c) && c.before.lossStreak >= 2 },
]

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((achievement) => achievement.id)

export function isAchievementId(value: unknown): value is AchievementId {
  return typeof value === 'string' && (ACHIEVEMENT_IDS as string[]).includes(value)
}

/** The achievements this moment earns that the career has not earned already. */
export function newAchievements(context: AchievementContext): AchievementId[] {
  const have = new Set(context.after.earned)
  return ACHIEVEMENTS.filter((achievement) => !have.has(achievement.id) && achievement.check(context)).map((achievement) => achievement.id)
}
