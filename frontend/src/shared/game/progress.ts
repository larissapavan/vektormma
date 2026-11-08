import { completeGoals, GOAL_REWARD, type GoalId } from './goals'
import { newAchievements, type AchievementId } from './achievements'
import { settlePact, type DealId } from './events'
import { settleFight, standing, type Career, type FightResult, type FightState, type Offer } from './career'

/** A fight's result with what it did to the goals and the achievements, on top of what it did to the record. */
export interface ProgressResult extends FightResult {
  /** The goals met by this fight. */
  goalsDone: GoalId[]
  /** The bonus in ranking points they paid (already in `career`). */
  goalPoints: number
  /** The achievements this fight earned (already in `career.earned`). */
  unlocked: AchievementId[]
  /** The sponsor's deal that was on for this fight and whether it was met, or null. */
  deal: { id: DealId; met: boolean } | null
  /** The arranged fight, when this was one, and whether the player was caught. */
  fix: { caught: boolean } | null
  /** The ranking points the deal or the arranged fight paid (negative: it cost). Already in `career.points`. */
  pactPoints: number
}

/** Settles a finished fight, then pays the goals it met and records the achievements it earned. */
export function finishFight(career: Career, offer: Offer, state: FightState, title = offer.champion): ProgressResult {
  const settled = settleFight(career, offer, state, title)
  const pact = settlePact(career, settled.career, { won: settled.won, method: settled.method, chance: settled.chance })
  const { career: paid, completed } = completeGoals(pact.career)
  const unlocked = newAchievements({ before: career, after: paid, result: settled, opponent: offer.name, ended: Boolean(paid.ended) })
  const after: Career = { ...paid, earned: [...paid.earned, ...unlocked] }
  return { ...settled, career: after, standingAfter: standing(after), goalsDone: completed.map((goal) => goal.id), goalPoints: completed.length * GOAL_REWARD, unlocked, deal: pact.deal, fix: pact.fix, pactPoints: pact.points }
}

/** The achievements a career earns only by ending (a career without a loss), added to it. */
export function closeCareer(career: Career): { career: Career; unlocked: AchievementId[] } {
  const unlocked = newAchievements({ before: career, after: career, result: null, opponent: '', ended: Boolean(career.ended) })
  return { career: unlocked.length ? { ...career, earned: [...career.earned, ...unlocked] } : career, unlocked }
}
