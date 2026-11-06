/**
 * The career game's rules, with no screen and no network in them: a fighter is built, trains, is offered fights, fights and
 * ends. The chance of winning each fight comes from the API (the model); everything else here is game rule, and the page
 * says which is which. Randomness is passed in (`rng`) so a test can play a whole career.
 */

export type Stance = 'Orthodox' | 'Southpaw' | 'Switch'
export type CoachId = 'striker' | 'wrestler' | 'allround' | 'conditioning' | 'sparring' | 'scout'
export type Plan = 'striking' | 'grappling' | 'balanced'
export type Method = 'ko' | 'sub' | 'dec'
export type EndReason = 'retired' | 'released' | 'age'
export type Standing = 'prospect' | 'rising' | 'top15' | 'top5' | 'contender' | 'champion'
export type Edge = 'you' | 'opp' | 'even'

export type Rng = () => number

/** A small seeded generator (mulberry32): the same seed plays the same career. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const START_RECORD = { wins: 6, losses: 0 }
export const START_AGE = 24
export const SKILL_MIN = 20
export const SKILL_MAX = 90
export const CREATE_BUDGET = 150
export const MIN_FIGHTS_TO_RETIRE = 3
export const RELEASE_AFTER_LOSSES = 3
export const MAX_AGE = 41
export const TITLE_SHOT_POINTS = 20
export const STANDING_STEPS: [number, Standing][] = [
  [20, 'contender'],
  [15, 'top5'],
  [9, 'top15'],
  [4, 'rising'],
  [0, 'prospect'],
]

/** One of the career's goals: which one, and whether it has been met (and its bonus paid). */
export interface GoalState {
  id: string
  done: boolean
}

export interface FightLog {
  opponent: string
  won: boolean
  method: Method
  round: number
  title: boolean
  chance: number
}

export interface Career {
  name: string
  division: string
  stance: Stance
  striking: number
  takedowns: number
  reach: number
  age: number
  wins: number
  losses: number
  draws: number
  ufcFights: number
  points: number
  winStreak: number
  /** The longest run of wins this career has had. */
  bestStreak: number
  lossStreak: number
  koWins: number
  subWins: number
  decWins: number
  finishedBy: number
  titleWins: number
  defenses: number
  champion: boolean
  /** The win that was least likely when the fight began. */
  bestWin: { name: string; chance: number } | null
  fought: string[]
  /** The scout coach studied the next opponent: the next fight starts with a small head start. */
  scouted: boolean
  /** Who beat the player and has not been beaten since: the rematch on offer. */
  rival: string | null
  history: FightLog[]
  /** The goals this career was given at the start (see goals.ts), and which are met. */
  goals: GoalState[]
  /** The achievements earned in this career (see achievements.ts). */
  earned: string[]
  ended: EndReason | null
}

export interface Build {
  name: string
  division: string
  stance: Stance
  striking: number
  takedowns: number
  reach: number
}

export function clamp(value: number, low: number, high: number) {
  return Math.min(Math.max(value, low), high)
}

/** Points still free in the creation screen (negative when the build is over budget). */
export function budgetLeft(build: Pick<Build, 'striking' | 'takedowns' | 'reach'>) {
  return CREATE_BUDGET - build.striking - build.takedowns - build.reach
}

export function validBuild(build: Build) {
  const skills = [build.striking, build.takedowns, build.reach]
  return build.name.trim().length > 0 && skills.every((value) => value >= SKILL_MIN && value <= SKILL_MAX) && budgetLeft(build) >= 0
}

export function createCareer(build: Build, goals: string[] = []): Career {
  if (!validBuild(build)) throw new Error('The build is over budget or out of range.')
  return {
    name: cleanName(build.name),
    division: build.division,
    stance: build.stance,
    striking: build.striking,
    takedowns: build.takedowns,
    reach: build.reach,
    age: START_AGE,
    wins: START_RECORD.wins,
    losses: START_RECORD.losses,
    draws: 0,
    ufcFights: 0,
    points: 0,
    winStreak: 0,
    bestStreak: 0,
    lossStreak: 0,
    koWins: 0,
    subWins: 0,
    decWins: 0,
    finishedBy: 0,
    titleWins: 0,
    defenses: 0,
    champion: false,
    bestWin: null,
    fought: [],
    scouted: false,
    rival: null,
    history: [],
    goals: goals.map((id) => ({ id, done: false })),
    earned: [],
    ended: null,
  }
}

export function cleanName(value: string, max = 24) {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function standing(career: Pick<Career, 'points' | 'champion'>): Standing {
  if (career.champion) return 'champion'
  return STANDING_STEPS.find(([points]) => career.points >= points)?.[1] ?? 'prospect'
}

export function titleShotAvailable(career: Career) {
  return !career.champion && career.points >= TITLE_SHOT_POINTS && !career.ended
}

export function canRetire(career: Career) {
  return career.ufcFights >= MIN_FIGHTS_TO_RETIRE && !career.ended
}

// ------------------------------------------------------------------------------------------------------ the camp

export interface CampResult {
  career: Career
  injured: boolean
  declined: boolean
}

/**
 * A coach, and what a camp with them does. `strike` and `takedown` multiply the skill gain, `injury` is added to the chance of
 * getting hurt, `age` is the time the camp takes, and `scout` is a head start (in chance points) for the next fight.
 */
export interface Coach {
  id: CoachId
  strike: number
  takedown: number
  injury: number
  age: number
  scout: number
}

export const COACHES: Record<CoachId, Coach> = {
  striker: { id: 'striker', strike: 1.7, takedown: 0.3, injury: 0.03, age: 0.4, scout: 0 },
  wrestler: { id: 'wrestler', strike: 0.3, takedown: 1.7, injury: 0.03, age: 0.4, scout: 0 },
  allround: { id: 'allround', strike: 1, takedown: 1, injury: 0, age: 0.4, scout: 0 },
  conditioning: { id: 'conditioning', strike: 0.5, takedown: 0.5, injury: -0.06, age: 0.25, scout: 0 },
  sparring: { id: 'sparring', strike: 1.4, takedown: 1.4, injury: 0.08, age: 0.4, scout: 0 },
  scout: { id: 'scout', strike: 0.7, takedown: 0.7, injury: 0, age: 0.4, scout: 0.02 },
}

const BASE_GAIN = 3.4
const BASE_INJURY = 0.09
const MIN_INJURY = 0.02

/** How much a skill rises in a camp with this coach (it grows slower the closer it is to the top). */
export function skillGain(skill: number, factor: number) {
  return BASE_GAIN * factor * (1 - skill / 130)
}

/** The chance of getting hurt in a camp: the coach's, and more after being knocked out in the last fight. */
export function injuryChance(career: Career, coach: Coach) {
  const lastFight = career.history[career.history.length - 1]
  const knockedOut = Boolean(lastFight && !lastFight.won && lastFight.method === 'ko')
  return Math.max(MIN_INJURY, BASE_INJURY + coach.injury) + (knockedOut ? 0.1 : 0)
}

/** What a camp with this coach would do, for the screen to show before the player chooses. */
export function previewCamp(career: Career, coach: Coach) {
  return {
    striking: skillGain(career.striking, coach.strike),
    takedowns: skillGain(career.takedowns, coach.takedown),
    injury: injuryChance(career, coach),
    age: coach.age,
    scout: coach.scout,
  }
}

/**
 * The coaches on offer for a camp: three of the six, and always at least one safe choice (the all-round coach or the
 * conditioning coach), so a camp is never three risks in a row.
 */
export function offerCoaches(rng: Rng): CoachId[] {
  const ids = Object.keys(COACHES) as CoachId[]
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    ;[ids[index], ids[swap]] = [ids[swap], ids[index]]
  }
  const picked = ids.slice(0, 3)
  if (!picked.includes('allround') && !picked.includes('conditioning')) picked[2] = 'allround'
  return picked
}

/** A training camp with a coach: skills go up as the coach teaches, time passes, a veteran slips, and the camp may end in an injury. */
export function trainCamp(career: Career, coachId: CoachId, rng: Rng): CampResult {
  const coach = COACHES[coachId]
  const next = { ...career }
  next.striking = clamp(Math.round((next.striking + skillGain(next.striking, coach.strike)) * 10) / 10, 0, 100)
  next.takedowns = clamp(Math.round((next.takedowns + skillGain(next.takedowns, coach.takedown)) * 10) / 10, 0, 100)
  next.age = Math.round((next.age + coach.age) * 100) / 100
  next.scouted = coach.scout > 0

  let declined = false
  if (next.age >= 33) {
    const loss = next.age >= 37 ? 2 : 1
    next.striking = clamp(next.striking - loss, 0, 100)
    next.takedowns = clamp(next.takedowns - loss, 0, 100)
    declined = true
  }

  const injured = rng() < injuryChance(career, coach)
  if (injured) {
    next.age = Math.round((next.age + 0.5) * 100) / 100
    next.striking = clamp(next.striking - 2, 0, 100)
    next.takedowns = clamp(next.takedowns - 2, 0, 100)
  }

  if (next.age >= MAX_AGE) next.ended = 'age'
  return { career: next, injured, declined }
}

// ------------------------------------------------------------------------------------------------------ the fight

export interface Offer {
  label: string
  name: string
  win_probability: number
  sig_str_acc: number | null
  takedown_acc: number | null
  champion: boolean
}

export interface PlayerStats {
  sig_str_acc: number
  takedown_acc: number
}

/** The game plan nudges the model's chance by at most 4 points, toward the side where the player has the edge. */
export function planNudge(plan: Plan, player: PlayerStats, opponent: Pick<Offer, 'sig_str_acc' | 'takedown_acc'>) {
  if (plan === 'striking') return clamp((player.sig_str_acc - (opponent.sig_str_acc ?? 0.45)) * 0.5, -0.04, 0.04)
  if (plan === 'grappling') return clamp((player.takedown_acc - (opponent.takedown_acc ?? 0.38)) * 0.25, -0.04, 0.04)
  return 0
}

export interface RoundStory {
  round: number
  edge: Edge
  /** Which line of the narration table to use (stored, so the text does not change when the language does). */
  variant: number
  finish: boolean
  /** What the player chose for this round. */
  tactic?: Tactic
}

export interface FightResult {
  career: Career
  won: boolean
  method: Method
  round: number
  split: boolean
  chance: number
  pointsGained: number
  rounds: RoundStory[]
  lostBelt: boolean
  wonBelt: boolean
  /** The player's standing before and after, for the "you moved up" line. */
  standingBefore: Standing
  standingAfter: Standing
}

function pickWeighted<T>(entries: [T, number][], rng: Rng): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) return value
  }
  return entries[entries.length - 1][0]
}

/** How a finish happens. The winner's style and the player's plan shape it: a striking plan makes knockouts likelier, a grappling one submissions. */
export function chooseFinish(won: boolean, plan: Plan, player: PlayerStats, opponent: Pick<Offer, 'sig_str_acc' | 'takedown_acc'>, rng: Rng): 'ko' | 'sub' {
  const winnerStrike = won ? player.sig_str_acc : (opponent.sig_str_acc ?? 0.45)
  const winnerGrapple = won ? player.takedown_acc : (opponent.takedown_acc ?? 0.38)
  let ko = 0.36 * (winnerStrike / 0.45)
  let sub = 0.17 * (0.5 + winnerGrapple / 0.76)
  if (won) {
    if (plan === 'striking') ko *= 1.4
    if (plan === 'grappling') {
      sub *= 1.6
      ko *= 0.7
    }
  } else {
    if (plan === 'grappling') ko *= 0.8
    if (plan === 'striking') sub *= 0.8
  }
  return pickWeighted<'ko' | 'sub'>([['ko', ko], ['sub', sub]], rng)
}

// ------------------------------------------------------------------------------------------- the fight, a round at a time

/**
 * What the player tells the corner to do in a round. The model's chance of winning the fight does not change with it: the
 * tactic is how the player spends risk. An attack makes a finish likelier for both fighters, a cover makes it unlikelier for
 * both (and costs a little in the judges' eyes), a steady round changes nothing. Which one is right depends on the score.
 */
export type Tactic = 'attack' | 'steady' | 'cover'
export const TACTICS: Tactic[] = ['attack', 'steady', 'cover']

interface TacticEffect {
  /** Added to the chance of winning the round on the cards. */
  round: number
  /** Multiplies the chance that the player finishes, and the chance that the player is finished. */
  finishFor: number
  finishAgainst: number
}

export const TACTIC_EFFECTS: Record<Tactic, TacticEffect> = {
  attack: { round: 0, finishFor: 2, finishAgainst: 2 },
  steady: { round: 0, finishFor: 1, finishAgainst: 1 },
  cover: { round: -0.08, finishFor: 0.3, finishAgainst: 0.2 },
}

/** The chance that a round ends the fight (whoever finishes), by round, for a 3-round and a 5-round fight. */
const FINISH_HAZARD: Record<number, number[]> = { 3: [0.22, 0.2, 0.2], 5: [0.16, 0.15, 0.14, 0.1, 0.1] }
/** Every round a fighter has won makes their next finish likelier by this much: the other one is hurt and tired. */
const WEAR = 0.3

interface Solver {
  /** The chance of winning from this point (rounds played, rounds won by each side), the player's `first` tactic now and steady after. */
  value: (played: number, you: number, opp: number, first?: Tactic) => number
}

/** Exact odds of the rest of a fight, for a given chance of winning a round (`base`). Small enough to solve on every screen. */
function solver(base: number, scheduled: number): Solver {
  const hazard = FINISH_HAZARD[scheduled] ?? FINISH_HAZARD[3]
  const memo = new Map<number, number>()
  const roundOdds = (played: number, you: number, opp: number, tactic: Tactic) => {
    const effect = TACTIC_EFFECTS[tactic]
    const rate = hazard[Math.min(played, hazard.length - 1)]
    const finishYou = rate * base * effect.finishFor * (1 + WEAR * you)
    const finishOpp = rate * (1 - base) * effect.finishAgainst * (1 + WEAR * opp)
    return { finishYou, finishOpp, wins: clamp(base + effect.round, 0.03, 0.97) }
  }
  const value = (played: number, you: number, opp: number, first: Tactic = 'steady'): number => {
    if (played >= scheduled) return you > opp ? 1 : 0
    const key = (played * 10 + you) * 10 + opp + (first === 'steady' ? 0 : first === 'attack' ? 1000 : 2000)
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    const { finishYou, finishOpp, wins } = roundOdds(played, you, opp, first)
    const rest = 1 - finishYou - finishOpp
    const next = (youTake: boolean) => value(played + 1, you + (youTake ? 1 : 0), opp + (youTake ? 0 : 1))
    const result = finishYou + rest * (wins * next(true) + (1 - wins) * next(false))
    memo.set(key, result)
    return result
  }
  return { value }
}

/** The chance of winning a single round that makes the whole fight come out at `chance`, with every round fought steady. */
function solveBase(chance: number, scheduled: number): number {
  let low = 0.001
  let high = 0.999
  for (let step = 0; step < 40; step += 1) {
    const mid = (low + high) / 2
    if (solver(mid, scheduled).value(0, 0, 0) < chance) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export interface FightOver {
  won: boolean
  method: Method
  round: number
  split: boolean
}

/** A fight in progress: the score on the cards, what has been told so far, and (once it is over) how it ended. */
export interface FightState {
  scheduled: number
  /** Rounds fought so far. */
  played: number
  youRounds: number
  oppRounds: number
  /** The fight's chance for the player at the first bell (the model's, plus the plan and the film study). */
  chance: number
  /** The chance of winning one round that matches it. */
  base: number
  plan: Plan
  player: PlayerStats
  foe: Pick<Offer, 'sig_str_acc' | 'takedown_acc'>
  /** Where in the narration table the first round starts. */
  variantStart: number
  stories: RoundStory[]
  over: FightOver | null
}

export function startFight(career: Career, offer: Offer, plan: Plan, player: PlayerStats, rng: Rng, title = offer.champion): FightState {
  const headStart = career.scouted ? COACHES.scout.scout : 0
  const chance = clamp(offer.win_probability + planNudge(plan, player, offer) + headStart, 0.03, 0.97)
  const scheduled = title || career.champion ? 5 : 3
  return {
    scheduled,
    played: 0,
    youRounds: 0,
    oppRounds: 0,
    chance,
    base: solveBase(chance, scheduled),
    plan,
    player,
    foe: { sig_str_acc: offer.sig_str_acc, takedown_acc: offer.takedown_acc },
    variantStart: Math.floor(rng() * 3),
    stories: [],
    over: null,
  }
}

/** The player's chance of winning from here, taking every round that is left steady: the number behind the "favorite / underdog" read. */
export function liveChance(state: FightState): number {
  if (state.over) return state.over.won ? 1 : 0
  return solver(state.base, state.scheduled).value(state.played, state.youRounds, state.oppRounds)
}

/** The tactic with the best chance of winning for this round, when it is clearly better than the others (a point or more), else null. */
export function bestTactic(state: FightState): Tactic | null {
  if (state.over) return null
  const odds = solver(state.base, state.scheduled)
  const ranked = TACTICS.map((tactic) => ({ tactic, value: odds.value(state.played, state.youRounds, state.oppRounds, tactic) })).sort((x, y) => y.value - x.value)
  return ranked[0].value - ranked[1].value >= 0.01 ? ranked[0].tactic : null
}

/** What the corner can say about this round, from the score: a lead that cannot be lost on the cards, a deficit only a finish can fix, or nothing special. */
export type Advice = 'protect' | 'finish' | 'attack' | 'cover' | 'steady'

export function cornerAdvice(state: FightState): Advice {
  const left = state.scheduled - state.played
  const lead = state.youRounds - state.oppRounds
  if (lead > left) return 'protect'
  if (-lead >= left) return 'finish'
  const best = bestTactic(state)
  return best ?? 'steady'
}

/** Plays one round with the player's tactic. A finish ends the fight; the last round ends it on the cards. */
export function playRound(state: FightState, tactic: Tactic, rng: Rng): FightState {
  if (state.over) return state
  const effect = TACTIC_EFFECTS[tactic]
  const rate = (FINISH_HAZARD[state.scheduled] ?? FINISH_HAZARD[3])[Math.min(state.played, 4)]
  const finishYou = rate * state.base * effect.finishFor * (1 + WEAR * state.youRounds)
  const finishOpp = rate * (1 - state.base) * effect.finishAgainst * (1 + WEAR * state.oppRounds)
  const wins = clamp(state.base + effect.round, 0.03, 0.97)
  const round = state.played + 1
  const variant = (state.variantStart + round) % 3

  const roll = rng()
  const finishedBy: 'you' | 'opp' | null = roll < finishYou ? 'you' : roll < finishYou + finishOpp ? 'opp' : null
  const youTookIt = finishedBy ? finishedBy === 'you' : (roll - finishYou - finishOpp) / (1 - finishYou - finishOpp) < wins
  const story: RoundStory = { round, edge: youTookIt ? 'you' : 'opp', variant, finish: finishedBy !== null, tactic }
  const next: FightState = {
    ...state,
    played: round,
    youRounds: state.youRounds + (youTookIt ? 1 : 0),
    oppRounds: state.oppRounds + (youTookIt ? 0 : 1),
    stories: [...state.stories, story],
  }

  if (finishedBy) {
    const won = finishedBy === 'you'
    next.over = { won, method: chooseFinish(won, state.plan, state.player, state.foe, rng), round, split: false }
  } else if (round >= state.scheduled) {
    const won = next.youRounds > next.oppRounds
    const closest = Math.abs(next.youRounds - next.oppRounds) === 1
    next.over = { won, method: 'dec', round, split: rng() < (closest ? 0.4 : 0.05) }
  }
  return next
}

/** What a finished fight does to the career: the record, the streaks, the points, the belt and the rival. */
export function settleFight(career: Career, offer: Offer, state: FightState, title = offer.champion): FightResult {
  if (!state.over) throw new Error('The fight is not over.')
  const { won, method, round: finishRound, split } = state.over
  const chance = state.chance
  const titleFight = title || career.champion

  const before = standing(career)
  const next: Career = { ...career, scouted: false, history: [...career.history], fought: career.fought.includes(offer.name) ? career.fought : [...career.fought, offer.name] }
  next.ufcFights += 1
  let pointsGained: number
  let wonBelt = false
  let lostBelt = false
  if (won) {
    next.wins += 1
    next.winStreak += 1
    next.bestStreak = Math.max(next.bestStreak, next.winStreak)
    next.lossStreak = 0
    if (method === 'ko') next.koWins += 1
    else if (method === 'sub') next.subWins += 1
    else next.decWins += 1
    pointsGained = (chance >= 0.6 ? 1 : chance >= 0.45 ? 2 : 3) + (method === 'dec' ? 0 : 1)
    if (career.champion) {
      next.defenses += 1
      pointsGained += 4
    } else if (title) {
      next.champion = true
      next.titleWins += 1
      wonBelt = true
      pointsGained += 8
    }
    if (!next.bestWin || chance <= next.bestWin.chance) next.bestWin = { name: offer.name, chance }
    if (next.rival === offer.name) next.rival = null
  } else {
    next.losses += 1
    next.lossStreak += 1
    next.winStreak = 0
    if (method !== 'dec') next.finishedBy += 1
    pointsGained = career.champion ? -3 : -1
    if (career.champion) {
      next.champion = false
      lostBelt = true
    }
    next.rival = offer.name
  }
  next.points = Math.max(0, next.points + pointsGained)
  next.history.push({ opponent: offer.name, won, method, round: finishRound, title: titleFight, chance })
  if (next.lossStreak >= RELEASE_AFTER_LOSSES) next.ended = 'released'

  return { career: next, won, method, round: finishRound, split, chance, pointsGained, rounds: state.stories, lostBelt, wonBelt, standingBefore: before, standingAfter: standing(next) }
}

/** Fights a whole fight with the steady tactic in every round (the corner's default, and what "skip to the result" plays). */
export function fight(career: Career, offer: Offer, plan: Plan, player: PlayerStats, rng: Rng, title = offer.champion): FightResult {
  let state = startFight(career, offer, plan, player, rng, title)
  while (!state.over) state = playRound(state, 'steady', rng)
  return settleFight(career, offer, state, title)
}

export function retire(career: Career): Career {
  return { ...career, ended: career.ended ?? 'retired' }
}

export function recordText(career: Pick<Career, 'wins' | 'losses' | 'draws'>) {
  return career.draws ? `${career.wins}-${career.losses}-${career.draws}` : `${career.wins}-${career.losses}`
}

// ------------------------------------------------------------------------------------------------------ the end

export interface SimilarCandidate {
  name: string
  division: string | null
  wins: number | null
  losses: number | null
  total_fights: number | null
  win_rate: number | null
  ufc_status?: string
}

/** The real fighter in the same division whose record looks most like the player's (a stand-in for "who were you like?"). */
export function similarFighter(career: Career, catalog: SimilarCandidate[]): string | null {
  const fights = career.wins + career.losses + career.draws
  const rate = fights ? career.wins / fights : 0
  let best: { name: string; distance: number } | null = null
  for (const fighter of catalog) {
    if (fighter.division !== career.division || (fighter.total_fights ?? 0) < 5 || fighter.win_rate == null) continue
    const distance = Math.abs(fighter.win_rate - rate) * 4 + Math.abs((fighter.total_fights ?? 0) - fights) / 8
    if (!best || distance < best.distance) best = { name: fighter.name, distance }
  }
  return best?.name ?? null
}

// ------------------------------------------------------------------------------------------------------ sharing

/** What a shared link carries: only numbers and short texts, so the card can be drawn from the address alone. */
export interface Retrospect {
  n: string // name
  d: string // division
  w: number
  l: number
  dr: number
  ko: number
  sb: number
  dc: number
  f: number // fights in the UFC
  a: number // age at the end
  s: Standing // where the career ended in the standings
  c: number // belts won
  df: number // title defenses
  b: string // best win
  x: string // the real fighter it resembles
  e: EndReason
}

export function retrospect(career: Career, similar: string | null): Retrospect {
  return {
    n: career.name,
    d: career.division,
    w: career.wins,
    l: career.losses,
    dr: career.draws,
    ko: career.koWins,
    sb: career.subWins,
    dc: career.decWins,
    f: career.ufcFights,
    a: Math.floor(career.age),
    s: standing(career),
    c: career.titleWins,
    df: career.defenses,
    b: career.bestWin?.name ?? '',
    x: similar ?? '',
    e: career.ended ?? 'retired',
  }
}

const STANDINGS: Standing[] = ['prospect', 'rising', 'top15', 'top5', 'contender', 'champion']
const END_REASONS: EndReason[] = ['retired', 'released', 'age']

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  const binary = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

export function encodeRetrospect(value: Retrospect): string {
  return toBase64Url(JSON.stringify(value))
}

const counter = (value: unknown, max = 200) => (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null)
const text = (value: unknown, max: number) => (typeof value === 'string' ? cleanName(value, max) : null)

/**
 * Reads a shared link. Anyone can write one by hand, so every field is checked and the texts are cut and stripped; what comes
 * back is only ever shown as plain text, with a note that the card is not verified.
 */
export function decodeRetrospect(encoded: string | null | undefined): Retrospect | null {
  if (!encoded || encoded.length > 1200) return null
  try {
    const raw = JSON.parse(fromBase64Url(encoded)) as Record<string, unknown>
    const name = text(raw.n, 24)
    const division = text(raw.d, 30)
    const best = text(raw.b, 40)
    const similar = text(raw.x, 40)
    const numbers = { w: counter(raw.w), l: counter(raw.l), dr: counter(raw.dr), ko: counter(raw.ko), sb: counter(raw.sb), dc: counter(raw.dc), f: counter(raw.f), a: counter(raw.a, 60), c: counter(raw.c, 20), df: counter(raw.df, 50) }
    if (!name || !division || best == null || similar == null || Object.values(numbers).some((value) => value == null)) return null
    if (!STANDINGS.includes(raw.s as Standing) || !END_REASONS.includes(raw.e as EndReason)) return null
    return { n: name, d: division, b: best, x: similar, s: raw.s as Standing, e: raw.e as EndReason, ...(numbers as Record<keyof typeof numbers, number>) }
  } catch {
    return null
  }
}
