import { afterEach, describe, expect, it, vi } from 'vitest'

import { ACHIEVEMENT_IDS, ACHIEVEMENTS, newAchievements, type AchievementContext, type AchievementId } from '../shared/game/achievements'
import { createCareer, playRound, seededRng, startFight, type Build, type Career, type Edge, type FightResult, type Offer, type RoundStory, type Tactic } from '../shared/game/career'
import { completeGoals, drawGoals, GOAL_IDS, GOAL_REWARD, GOALS, GOALS_PER_CAREER, goalViews, isGoalId, UPSET_CHANCE } from '../shared/game/goals'
import { closeCareer, finishFight } from '../shared/game/progress'
import { ACHIEVEMENT_TEXT, GOAL_TEXT } from '../shared/game/rewardsText'
import { loadTrophies, readTrophies, recordTrophies, TROPHY_KEY, TROPHY_TOTAL } from '../shared/game/trophies'

const build: Build = { name: 'Maria', division: 'Lightweight', stance: 'Orthodox', striking: 60, takedowns: 45, reach: 40 }
const player = { sig_str_acc: 0.5, takedown_acc: 0.4 }
const offer = (extra: Partial<Offer> = {}): Offer => ({ label: 'even', name: 'Rival One', win_probability: 0.5, sig_str_acc: 0.45, takedown_acc: 0.38, champion: false, ...extra })

const rookie = (goals: string[] = ['wins4', 'kos2', 'streak3']): Career => createCareer(build, goals)
const story = (round: number, edge: Edge, tactic: Tactic = 'steady', finish = false): RoundStory => ({ round, edge, variant: 0, finish, tactic })
const fightResult = (extra: Partial<FightResult> = {}): FightResult => ({
  career: rookie(), won: true, method: 'dec', round: 3, split: false, chance: 0.5, pointsGained: 2, streakPoints: 0, rounds: [], lostBelt: false, wonBelt: false, standingBefore: 'prospect', standingAfter: 'prospect', ...extra,
})
const context = (extra: Partial<AchievementContext> = {}): AchievementContext => ({ before: rookie(), after: rookie(), result: fightResult(), opponent: 'Rival One', ended: false, ...extra })
const earns = (id: AchievementId, ctx: AchievementContext) => ACHIEVEMENTS.find((achievement) => achievement.id === id)!.check(ctx)

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('career goals', () => {
  it('draws three different goals, the same ones for the same seed', () => {
    for (let seed = 1; seed < 60; seed += 1) {
      const goals = drawGoals(seededRng(seed))
      expect(goals).toHaveLength(GOALS_PER_CAREER)
      expect(new Set(goals).size).toBe(GOALS_PER_CAREER)
      expect(goals.every(isGoalId)).toBe(true)
      expect(drawGoals(seededRng(seed))).toEqual(goals)
    }
    expect(new Set(Array.from({ length: 60 }, (_, seed) => drawGoals(seededRng(seed + 1)).join())).size).toBeGreaterThan(10) // it is not always the same three
  })

  it('starts a career with its goals open, and a career without goals has none', () => {
    expect(rookie().goals).toEqual([{ id: 'wins4', done: false }, { id: 'kos2', done: false }, { id: 'streak3', done: false }])
    expect(createCareer(build).goals).toEqual([])
    expect(rookie().earned).toEqual([])
  })

  it('has a text in every language for every goal and every achievement', () => {
    for (const id of GOAL_IDS) for (const lang of ['pt', 'en', 'fr', 'es'] as const) expect(GOAL_TEXT[id][lang].length).toBeGreaterThan(5)
    for (const id of ACHIEVEMENT_IDS) for (const lang of ['pt', 'en', 'fr', 'es'] as const) {
      expect(ACHIEVEMENT_TEXT[id].name[lang].length).toBeGreaterThan(2)
      expect(ACHIEVEMENT_TEXT[id].hint[lang].length).toBeGreaterThan(8)
    }
    expect(Object.keys(ACHIEVEMENT_TEXT).sort()).toEqual([...ACHIEVEMENT_IDS].sort())
    expect(Object.keys(GOAL_TEXT).sort()).toEqual([...GOAL_IDS].sort())
  })

  it('measures each goal from the career', () => {
    const logged = (won: boolean, method: 'ko' | 'sub' | 'dec', round: number, chance: number) => ({ opponent: 'X', won, method, round, title: false, chance })
    const career: Career = {
      ...rookie(),
      wins: 9, koWins: 2, subWins: 1, bestStreak: 3, points: 6,
      history: [logged(true, 'ko', 1, 0.3), logged(true, 'sub', 2, 0.6), logged(true, 'ko', 3, 0.5), logged(false, 'ko', 1, 0.2), logged(true, 'dec', 3, 0.1)],
    }
    expect(GOALS.wins4.progress(career)).toBe(3) // 9 wins, 6 of them before the UFC
    expect(GOALS.finishes3.progress(career)).toBe(3)
    expect(GOALS.streak3.progress(career)).toBe(3)
    expect(GOALS.upset.progress(career)).toBe(2) // two wins with a chance below the line; the loss at 20% does not count
    expect(GOALS.round1.progress(career)).toBe(1) // a first-round finish that was a win
    expect(GOALS.top15.progress(career)).toBe(6)
    expect(GOALS.top15.target).toBe(9) // the points of the "top 15" standing
    expect(GOALS.kos2.progress(career)).toBe(2)
    expect(GOALS.subs2.progress(career)).toBe(1)
    expect(UPSET_CHANCE).toBeLessThan(0.5)
  })

  it('shows each goal with its progress capped at the target, and a met goal as full', () => {
    const career: Career = { ...rookie(), wins: 20, koWins: 1, goals: [{ id: 'wins4', done: false }, { id: 'kos2', done: false }, { id: 'subs2', done: true }] }
    expect(goalViews(career).map((view) => [view.def.id, view.value, view.done])).toEqual([['wins4', 4, false], ['kos2', 1, false], ['subs2', 2, true]])
  })

  it('pays a goal once, when it is met, and never again', () => {
    const early: Career = { ...rookie(), wins: 8, points: 3 } // 2 UFC wins: nothing met
    expect(completeGoals(early).completed).toEqual([])
    expect(completeGoals(early).career).toBe(early)

    const met: Career = { ...rookie(), wins: 10, koWins: 2, points: 3 } // wins4 and kos2 met together
    const first = completeGoals(met)
    expect(first.completed.map((goal) => goal.id)).toEqual(['wins4', 'kos2'])
    expect(first.career.points).toBe(3 + 2 * GOAL_REWARD)
    expect(first.career.goals).toEqual([{ id: 'wins4', done: true }, { id: 'kos2', done: true }, { id: 'streak3', done: false }])
    const again = completeGoals(first.career)
    expect(again.completed).toEqual([])
    expect(again.career.points).toBe(first.career.points)
  })

  it('ignores a goal it does not know', () => {
    const career: Career = { ...rookie(), goals: [{ id: 'made-up', done: false }] }
    expect(goalViews(career)).toEqual([])
    expect(completeGoals(career).completed).toEqual([])
  })
})

describe('achievements', () => {
  it('knows fifteen of them, each with a check', () => {
    expect(ACHIEVEMENTS).toHaveLength(15)
    expect(TROPHY_TOTAL).toBe(15)
    expect(new Set(ACHIEVEMENT_IDS).size).toBe(15)
  })

  it('gives a winning debut only for a won first fight', () => {
    expect(earns('debut', context({ after: { ...rookie(), ufcFights: 1 } }))).toBe(true)
    expect(earns('debut', context({ after: { ...rookie(), ufcFights: 2 } }))).toBe(false)
    expect(earns('debut', context({ after: { ...rookie(), ufcFights: 1 }, result: fightResult({ won: false }) }))).toBe(false)
  })

  it('counts knockouts, submissions, streaks, veterans and the belt from the career', () => {
    expect(earns('knockout_artist', context({ after: { ...rookie(), koWins: 3 } }))).toBe(true)
    expect(earns('knockout_artist', context({ after: { ...rookie(), koWins: 2 } }))).toBe(false)
    expect(earns('submission_hunter', context({ after: { ...rookie(), subWins: 3 } }))).toBe(true)
    expect(earns('hot_streak', context({ after: { ...rookie(), bestStreak: 5 } }))).toBe(true)
    expect(earns('hot_streak', context({ after: { ...rookie(), bestStreak: 4 } }))).toBe(false)
    expect(earns('veteran', context({ after: { ...rookie(), ufcFights: 15 } }))).toBe(true)
    expect(earns('champion', context({ after: { ...rookie(), titleWins: 1 } }))).toBe(true)
    expect(earns('defender', context({ after: { ...rookie(), defenses: 3 } }))).toBe(true)
    expect(earns('defender', context({ after: { ...rookie(), defenses: 2 } }))).toBe(false)
  })

  it('gives the lightning only for a first-round finish that was won', () => {
    expect(earns('lightning', context({ result: fightResult({ method: 'ko', round: 1 }) }))).toBe(true)
    expect(earns('lightning', context({ result: fightResult({ method: 'ko', round: 2 }) }))).toBe(false)
    expect(earns('lightning', context({ result: fightResult({ method: 'sub', round: 1, won: false }) }))).toBe(false)
    expect(earns('lightning', context({ result: fightResult({ method: 'dec', round: 1 }) }))).toBe(false)
  })

  it('gives the giant killer only for a win as a heavy underdog', () => {
    expect(earns('giant_killer', context({ result: fightResult({ chance: 0.2 }) }))).toBe(true)
    expect(earns('giant_killer', context({ result: fightResult({ chance: 0.5 }) }))).toBe(false)
    expect(earns('giant_killer', context({ result: fightResult({ chance: 0.2, won: false }) }))).toBe(false)
  })

  it('gives the revenge only for beating the rival', () => {
    const before: Career = { ...rookie(), rival: 'Rival One' }
    expect(earns('revenge', context({ before }))).toBe(true)
    expect(earns('revenge', context({ before, opponent: 'Someone Else' }))).toBe(false)
    expect(earns('revenge', context())).toBe(false)
    expect(earns('revenge', context({ before, result: fightResult({ won: false }) }))).toBe(false)
  })

  it('gives all in for a finish by attacking while behind on the cards, and not for a finish while ahead', () => {
    const behind = [story(1, 'opp'), story(2, 'opp'), story(3, 'you', 'attack', true)]
    expect(earns('all_in', context({ result: fightResult({ method: 'sub', round: 3, rounds: behind }) }))).toBe(true)
    const ahead = [story(1, 'you'), story(2, 'opp'), story(3, 'you', 'attack', true)]
    expect(earns('all_in', context({ result: fightResult({ method: 'ko', round: 3, rounds: ahead }) }))).toBe(false)
    const steady = [story(1, 'opp'), story(2, 'opp'), story(3, 'you', 'steady', true)]
    expect(earns('all_in', context({ result: fightResult({ method: 'ko', round: 3, rounds: steady }) }))).toBe(false)
    expect(earns('all_in', context({ result: fightResult({ method: 'dec', rounds: behind }) }))).toBe(false)
    expect(earns('all_in', context({ result: null }))).toBe(false)
  })

  it('gives the lockdown for a decision won while covering up in the last round', () => {
    const covered = [story(1, 'you'), story(2, 'you'), story(3, 'opp', 'cover')]
    expect(earns('lock_down', context({ result: fightResult({ rounds: covered }) }))).toBe(true)
    expect(earns('lock_down', context({ result: fightResult({ rounds: [story(1, 'you'), story(2, 'you'), story(3, 'opp', 'attack')] }) }))).toBe(false)
    expect(earns('lock_down', context({ result: fightResult({ rounds: covered, won: false }) }))).toBe(false)
    expect(earns('lock_down', context({ result: fightResult({ rounds: covered, method: 'ko', round: 3 }) }))).toBe(false)
  })

  it('gives the top five from the standings, and the survivor for a win after two losses', () => {
    expect(earns('top5', context({ after: { ...rookie(), points: 15 } }))).toBe(true)
    expect(earns('top5', context({ after: { ...rookie(), points: 14 } }))).toBe(false)
    expect(earns('top5', context({ after: { ...rookie(), champion: true } }))).toBe(true)
    expect(earns('survivor', context({ before: { ...rookie(), lossStreak: 2 } }))).toBe(true)
    expect(earns('survivor', context({ before: { ...rookie(), lossStreak: 1 } }))).toBe(false)
    expect(earns('survivor', context({ before: { ...rookie(), lossStreak: 2 }, result: fightResult({ won: false }) }))).toBe(false)
  })

  it('gives the unbeaten only to a career that has ended without a loss after five fights', () => {
    const done = { ...rookie(), ufcFights: 5, losses: 0 }
    expect(earns('unbeaten', context({ after: done, result: null, ended: true }))).toBe(true)
    expect(earns('unbeaten', context({ after: done, result: null, ended: false }))).toBe(false) // still going
    expect(earns('unbeaten', context({ after: { ...done, ufcFights: 4 }, result: null, ended: true }))).toBe(false)
    expect(earns('unbeaten', context({ after: { ...done, losses: 1 }, result: null, ended: true }))).toBe(false)
  })

  it('never gives one the career already has', () => {
    const after: Career = { ...rookie(), koWins: 3, earned: ['knockout_artist'] }
    expect(newAchievements(context({ after }))).not.toContain('knockout_artist')
    expect(newAchievements(context({ after: { ...after, earned: [] } }))).toContain('knockout_artist')
  })
})

describe('what a fight does to goals and achievements', () => {
  // A random source that always rolls zero: the player finishes the first round.
  const finishRoundOne = (career: Career) => {
    let state = startFight(career, offer(), 'balanced', player, () => 0)
    while (!state.over) state = playRound(state, 'steady', () => 0)
    return state
  }

  it('pays the goals the fight met, earns the achievements, and moves the standing with the bonus', () => {
    const career = rookie(['round1', 'kos2', 'wins4'])
    const result = finishFight(career, offer(), finishRoundOne(career))
    expect(result).toMatchObject({ won: true, method: 'ko', round: 1 })
    expect(result.goalsDone).toEqual(['round1'])
    expect(result.goalPoints).toBe(GOAL_REWARD)
    expect(result.career.points).toBe(result.pointsGained + GOAL_REWARD)
    expect(result.career.goals).toEqual([{ id: 'round1', done: true }, { id: 'kos2', done: false }, { id: 'wins4', done: false }])
    expect(result.unlocked).toEqual(expect.arrayContaining(['debut', 'lightning']))
    expect(result.career.earned).toEqual(result.unlocked)
  })

  it('does not pay or earn the same thing twice in one career', () => {
    const career = rookie(['round1', 'kos2', 'wins4'])
    const first = finishFight(career, offer(), finishRoundOne(career))
    const second = finishFight(first.career, offer({ name: 'Rival Two' }), finishRoundOne(first.career))
    expect(second.goalsDone).not.toContain('round1')
    expect(second.unlocked).not.toContain('debut')
    expect(second.unlocked).not.toContain('lightning')
    expect(new Set(second.career.earned).size).toBe(second.career.earned.length)
  })

  it('counts a career with no goals like before', () => {
    const career = createCareer(build)
    const result = finishFight(career, offer(), finishRoundOne(career))
    expect(result.goalsDone).toEqual([])
    expect(result.goalPoints).toBe(0)
    expect(result.career.points).toBe(result.pointsGained)
  })

  it('keeps the longest win streak', () => {
    let career = rookie()
    for (let index = 0; index < 3; index += 1) career = finishFight(career, offer({ name: `R${index}` }), finishRoundOne(career)).career
    expect(career.bestStreak).toBe(3)
    let state = startFight(career, offer({ name: 'Last' }), 'balanced', player, () => 0.999)
    while (!state.over) state = playRound(state, 'steady', () => 0.999)
    const lost = finishFight(career, offer({ name: 'Last' }), state).career
    expect(lost.winStreak).toBe(0)
    expect(lost.bestStreak).toBe(3)
  })

  it('earns the endings once, when the career closes', () => {
    const done: Career = { ...rookie(), ufcFights: 6, losses: 0, ended: 'retired' }
    const closed = closeCareer(done)
    expect(closed.unlocked).toEqual(['unbeaten'])
    expect(closed.career.earned).toEqual(['unbeaten'])
    expect(closeCareer(closed.career).unlocked).toEqual([]) // asking again changes nothing
    expect(closeCareer({ ...done, ended: null }).unlocked).toEqual([])
    expect(closeCareer({ ...done, losses: 1 }).career).toEqual({ ...done, losses: 1 })
  })
})

describe('the collection in the browser', () => {
  it('keeps what is earned, with the day of the first time', () => {
    expect(loadTrophies()).toEqual({})
    recordTrophies(['debut', 'lightning'], 1000)
    recordTrophies(['lightning', 'champion'], 2000)
    expect(loadTrophies()).toEqual({ debut: 1000, lightning: 1000, champion: 2000 })
  })

  it('ignores what is not an achievement, and writes nothing when there is nothing new', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem')
    recordTrophies(['made-up', 'debut'], 5)
    expect(loadTrophies()).toEqual({ debut: 5 })
    write.mockClear()
    recordTrophies(['debut'], 9)
    recordTrophies([], 9)
    expect(write).not.toHaveBeenCalled()
  })

  it('reads back only what is valid', () => {
    expect(readTrophies(null)).toEqual({})
    expect(readTrophies('not json')).toEqual({})
    expect(readTrophies('[1,2]')).toEqual({})
    expect(readTrophies('"debut"')).toEqual({})
    expect(readTrophies('x'.repeat(6000))).toEqual({})
    expect(readTrophies(JSON.stringify({ debut: 10, cheat: 5, champion: 'yesterday', lightning: -1, top5: 1e30 }))).toEqual({ debut: 10 })
  })

  it('does not throw when the browser will not store anything', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadTrophies()).toEqual({})
    expect(() => recordTrophies(['debut'])).not.toThrow()
    expect(TROPHY_KEY).toContain('trophies')
  })
})
