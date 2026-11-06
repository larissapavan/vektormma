import { START_RECORD, STANDING_STEPS, type Career, type Rng } from './career'

/**
 * A career's goals: three things to go after, drawn when the fighter is created. Each has a progress bar, and meeting it pays
 * a bonus in ranking points (which is also how a goal helps: the title shot comes at 20 points). A goal is met once; it stays met.
 */
export type GoalId = 'wins4' | 'finishes3' | 'streak3' | 'upset' | 'round1' | 'top15' | 'kos2' | 'subs2'

export const GOALS_PER_CAREER = 3
export const GOAL_REWARD = 2
/** A win counts as an upset when the model gave the player less than this chance. */
export const UPSET_CHANCE = 0.4

export interface GoalDef {
  id: GoalId
  target: number
  progress: (career: Career) => number
}

const wonFights = (career: Career) => career.history.filter((entry) => entry.won)
const top15Points = STANDING_STEPS.find(([, name]) => name === 'top15')?.[0] ?? 9

export const GOALS: Record<GoalId, GoalDef> = {
  wins4: { id: 'wins4', target: 4, progress: (career) => career.wins - START_RECORD.wins },
  finishes3: { id: 'finishes3', target: 3, progress: (career) => career.koWins + career.subWins },
  streak3: { id: 'streak3', target: 3, progress: (career) => career.bestStreak },
  upset: { id: 'upset', target: 1, progress: (career) => wonFights(career).filter((entry) => entry.chance < UPSET_CHANCE).length },
  round1: { id: 'round1', target: 1, progress: (career) => wonFights(career).filter((entry) => entry.method !== 'dec' && entry.round === 1).length },
  top15: { id: 'top15', target: top15Points, progress: (career) => career.points },
  kos2: { id: 'kos2', target: 2, progress: (career) => career.koWins },
  subs2: { id: 'subs2', target: 2, progress: (career) => career.subWins },
}

export const GOAL_IDS = Object.keys(GOALS) as GoalId[]

export function isGoalId(value: unknown): value is GoalId {
  return typeof value === 'string' && (GOAL_IDS as string[]).includes(value)
}

/** Three different goals, drawn with the game's own generator (so a seed plays the same career). */
export function drawGoals(rng: Rng): GoalId[] {
  const ids = [...GOAL_IDS]
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    ;[ids[index], ids[swap]] = [ids[swap], ids[index]]
  }
  return ids.slice(0, GOALS_PER_CAREER)
}

export interface GoalView {
  def: GoalDef
  value: number
  done: boolean
}

/** Each of the career's goals with how far along it is, for the screen. A goal already met shows full. */
export function goalViews(career: Career): GoalView[] {
  return career.goals.flatMap((goal) => {
    if (!isGoalId(goal.id)) return []
    const def = GOALS[goal.id]
    const value = goal.done ? def.target : Math.min(def.progress(career), def.target)
    return [{ def, value, done: goal.done }]
  })
}

/** Marks the goals the career has now met and pays their bonus in points. `completed` is only the ones met just now. */
export function completeGoals(career: Career): { career: Career; completed: GoalDef[] } {
  const completed: GoalDef[] = []
  const goals = career.goals.map((goal) => {
    if (goal.done || !isGoalId(goal.id) || GOALS[goal.id].progress(career) < GOALS[goal.id].target) return goal
    completed.push(GOALS[goal.id])
    return { ...goal, done: true }
  })
  if (!completed.length) return { career, completed }
  return { career: { ...career, goals, points: career.points + completed.length * GOAL_REWARD }, completed }
}
