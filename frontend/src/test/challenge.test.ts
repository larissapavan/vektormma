import { describe, expect, it } from 'vitest'

import {
  CREATE_BUDGET,
  createCareer,
  GAME_DIVISIONS,
  offerCoaches,
  playRound,
  SKILL_MAX,
  SKILL_MIN,
  startFight,
  trainCamp,
  validBuild,
  type Career,
  type Offer,
  type Tactic,
} from '../shared/game/career'
import {
  challengeBuild,
  challengeDone,
  challengeResult,
  challengeRng,
  challengeStreams,
  compareResults,
  dailySeed,
  decodeChallenge,
  encodeChallenge,
  randomSeed,
  SEED_MAX,
  type Challenge,
  type ChallengeResult,
} from '../shared/game/challenge'
import { drawGoals } from '../shared/game/goals'
import { finishFight } from '../shared/game/progress'

const result = (extra: Partial<ChallengeResult> = {}): ChallengeResult => ({ n: 'Rival', p: 14, w: 4, l: 1, ko: 2, sb: 1, dc: 1, t: 0, f: 5, e: 'retired', ...extra })

describe('the challenge fighter', () => {
  it('is always a valid build that spends all 150 points, from the seed alone', () => {
    for (let seed = 0; seed < 400; seed += 1) {
      const build = challengeBuild(seed * 5_000_011, 'Ana')
      expect(validBuild(build)).toBe(true)
      expect(build.striking + build.takedowns + build.reach).toBe(CREATE_BUDGET)
      for (const skill of [build.striking, build.takedowns, build.reach]) {
        expect(skill).toBeGreaterThanOrEqual(SKILL_MIN)
        expect(skill).toBeLessThanOrEqual(SKILL_MAX)
      }
      expect(GAME_DIVISIONS).toContain(build.division)
      expect(['Orthodox', 'Southpaw', 'Switch']).toContain(build.stance)
      expect(challengeBuild(seed * 5_000_011, 'Zed')).toEqual({ ...build, name: 'Zed' }) // only the name is the player's
    }
  })

  it('varies from one seed to the next', () => {
    const builds = Array.from({ length: 300 }, (_, seed) => challengeBuild(seed, 'x'))
    expect(new Set(builds.map((build) => build.division)).size).toBeGreaterThanOrEqual(8)
    expect(new Set(builds.map((build) => build.stance)).size).toBe(3)
    expect(new Set(builds.map((build) => `${build.striking}-${build.takedowns}`)).size).toBeGreaterThan(100)
    const orthodox = builds.filter((build) => build.stance === 'Orthodox').length
    expect(orthodox).toBeGreaterThan(130) // most fighters are orthodox, as in the sport
    expect(orthodox).toBeLessThan(230)
  })
})

describe('the dice of a challenge', () => {
  it('give the same numbers for the same seed, event and fight', () => {
    const draw = (rng: () => number) => [rng(), rng(), rng(), rng()]
    expect(draw(challengeRng(123, 'fight', 2))).toEqual(draw(challengeRng(123, 'fight', 2)))
    const streams = challengeStreams(123)
    expect(draw(streams.fight(2))).toEqual(draw(challengeStreams(123).fight(2)))
    expect(streams.offers(1)).toBe(challengeStreams(123).offers(1))
  })

  it('differ with the seed, the kind of event and the fight, so one event never reuses the numbers of another', () => {
    const first = (rng: () => number) => rng()
    const draws = [
      first(challengeRng(123, 'fight', 0)),
      first(challengeRng(123, 'fight', 1)),
      first(challengeRng(123, 'camp', 0)),
      first(challengeRng(123, 'coaches', 0)),
      first(challengeRng(124, 'fight', 0)),
      first(challengeRng(999, 'fight', 0)),
    ]
    expect(new Set(draws).size).toBe(draws.length)
    for (const value of draws) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('give a number the matchmaking can take as its seed', () => {
    for (let fight = 0; fight < 12; fight += 1) {
      const seed = challengeStreams(777).offers(fight)
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThan(2 ** 31)
    }
  })

  it('draw a random seed in range', () => {
    expect(randomSeed(() => 0)).toBe(0)
    expect(randomSeed(() => 0.999999999)).toBeLessThanOrEqual(SEED_MAX)
  })
})

describe('a whole challenge, played the way the page plays it', () => {
  const player = { sig_str_acc: 0.5, takedown_acc: 0.4 }
  const offerFor = (fight: number): Offer => ({ label: 'even', name: `Rival ${fight}`, win_probability: 0.45 + (fight % 3) * 0.1, sig_str_acc: 0.45, takedown_acc: 0.38, champion: false })

  /** Plays `fights` fights on a seed. `coach` picks which of the three coaches on offer, `tactic` what to tell the corner. */
  function play(seed: number, fights: number, coach: (fight: number) => number, tactic: (fight: number, round: number) => Tactic) {
    const streams = challengeStreams(seed)
    let career: Career = createCareer(challengeBuild(seed, 'Ana'), drawGoals(streams.goals()))
    const offered: string[][] = []
    const injuries: boolean[] = []
    for (let fight = 0; fight < fights && !career.ended; fight += 1) {
      const coaches = offerCoaches(streams.coaches(fight))
      offered.push(coaches)
      const camp = trainCamp(career, coaches[coach(fight)], streams.camp(fight))
      injuries.push(camp.injured)
      career = camp.career
      if (career.ended) break
      const dice = streams.fight(fight)
      let state = startFight(career, offerFor(fight), 'balanced', player, dice)
      while (!state.over) state = playRound(state, tactic(fight, state.played), dice)
      career = finishFight(career, offerFor(fight), state).career
    }
    return { career, offered, injuries }
  }

  const steady = () => 'steady' as const

  it('is the same career for two players who make the same choices', () => {
    for (const seed of [1, 42, 20261108, 987654321]) {
      const one = play(seed, 6, () => 0, steady)
      const two = play(seed, 6, () => 0, steady)
      expect(two.career).toEqual(one.career)
      expect(two.offered).toEqual(one.offered)
      expect(challengeResult(two.career)).toEqual(challengeResult(one.career))
    }
  })

  it('offers the same coaches at every camp, whatever was chosen before', () => {
    const striker = play(31415, 6, () => 0, steady)
    const other = play(31415, 6, (fight) => (fight + 1) % 3, () => 'attack')
    const common = Math.min(striker.offered.length, other.offered.length)
    expect(common).toBeGreaterThanOrEqual(3)
    expect(other.offered.slice(0, common)).toEqual(striker.offered.slice(0, common))
  })

  it('drifts apart only through the choices: a different coach changes the fighter, the same seed does not', () => {
    const a = play(5555, 4, () => 0, steady)
    const b = play(5555, 4, () => 2, steady)
    expect(b.career.striking + b.career.takedowns).not.toBe(a.career.striking + a.career.takedowns)
    expect(play(5555, 4, () => 0, steady).career).toEqual(a.career)
  })

  it('is a different career on another seed', () => {
    const careers = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(play(seed, 6, () => 0, steady).career))
    expect(new Set(careers).size).toBe(5)
  })
})

describe('the score', () => {
  it('reads a career as points, the record in the UFC and how the wins came', () => {
    const career: Career = { ...createCareer(challengeBuild(9, 'Ana')), wins: 10, losses: 1, koWins: 2, subWins: 1, decWins: 1, titleWins: 0, ufcFights: 5, points: 17, ended: 'retired' }
    expect(challengeResult(career)).toEqual({ n: 'Ana', p: 17, w: 4, l: 1, ko: 2, sb: 1, dc: 1, t: 0, f: 5, e: 'retired' })
    expect(challengeResult({ ...career, ended: null }).e).toBe('retired')
  })

  it('goes to whoever has more ranking points, then more wins, else it is a tie', () => {
    expect(compareResults(result({ p: 15 }), result({ p: 14 }))).toBe('win')
    expect(compareResults(result({ p: 13, w: 9 }), result({ p: 14 }))).toBe('loss')
    expect(compareResults(result({ p: 14, w: 5 }), result({ p: 14, w: 4 }))).toBe('win')
    expect(compareResults(result({ p: 14, w: 3 }), result({ p: 14, w: 4 }))).toBe('loss')
    expect(compareResults(result(), result({ n: 'Someone Else', ko: 0, sb: 0, dc: 3 }))).toBe('tie') // how the wins came does not count
  })

  it('is over after its fights, or when the career ended before', () => {
    const challenge: Challenge = { seed: 1, fights: 6, target: null }
    const career = createCareer(challengeBuild(1, 'Ana'))
    expect(challengeDone(challenge, { ...career, ufcFights: 5 })).toBe(false)
    expect(challengeDone(challenge, { ...career, ufcFights: 6 })).toBe(true)
    expect(challengeDone(challenge, { ...career, ufcFights: 2, ended: 'released' })).toBe(true)
  })
})

describe('the challenge of the day', () => {
  it('is the same for the whole UTC day and another on the next', () => {
    const morning = dailySeed(new Date('2026-11-08T00:00:01Z'))
    expect(dailySeed(new Date('2026-11-08T23:59:59Z'))).toBe(morning)
    expect(dailySeed(new Date('2026-11-09T00:00:01Z'))).not.toBe(morning)
    expect(Number.isInteger(morning)).toBe(true)
    expect(morning).toBeGreaterThanOrEqual(0)
    expect(morning).toBeLessThanOrEqual(SEED_MAX)
  })

  it('differs from one day to the next for a month', () => {
    const seeds = Array.from({ length: 31 }, (_, day) => dailySeed(new Date(Date.UTC(2026, 10, 1 + day))))
    expect(new Set(seeds).size).toBe(31)
  })
})

describe('the challenge link', () => {
  it('carries the seed and the fights, and the result to beat when there is one', () => {
    const open: Challenge = { seed: 123456, fights: 6, target: null }
    expect(decodeChallenge(encodeChallenge(open))).toEqual(open)
    const played: Challenge = { seed: 2 ** 31 - 1, fights: 3, target: result({ n: 'José Aldo', p: 22, e: 'released' }) }
    expect(decodeChallenge(encodeChallenge(played))).toEqual(played)
  })

  it('survives accents and emoji in a name', () => {
    const challenge: Challenge = { seed: 5, fights: 6, target: result({ n: 'João 🥊 Çelik' }) }
    expect(decodeChallenge(encodeChallenge(challenge))?.target?.n).toBe('João 🥊 Çelik')
  })

  it('stays short enough to share', () => {
    expect(encodeChallenge({ seed: SEED_MAX, fights: 10, target: result({ n: 'x'.repeat(24), p: 500 }) }).length).toBeLessThan(400)
  })

  it('refuses a link that is missing, damaged, too long or made up', () => {
    const base = { s: 10, f: 6 }
    const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(decodeChallenge(null)).toBeNull()
    expect(decodeChallenge(undefined)).toBeNull()
    expect(decodeChallenge('')).toBeNull()
    expect(decodeChallenge('not-a-challenge')).toBeNull()
    expect(decodeChallenge('x'.repeat(1000))).toBeNull()
    expect(decodeChallenge(encode({ ...base, s: -1 }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, s: 2 ** 31 }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, s: 1.5 }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, s: '10' }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, f: 2 }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, f: 11 }))).toBeNull()
    expect(decodeChallenge(encode({ s: 10 }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, r: { ...result(), e: 'cheated' } }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, r: { ...result(), p: -4 } }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, r: { ...result(), p: 9000 } }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, r: { ...result(), n: '<>' } }))).toBeNull()
    expect(decodeChallenge(encode({ ...base, r: 'a lot of points' }))).toBeNull()
  })

  it('cuts long texts and strips markup characters from the name to beat', () => {
    const raw = btoa(JSON.stringify({ s: 10, f: 6, r: { ...result(), n: `<b>${'Maria '.repeat(10)}</b>` } })).replace(/=+$/, '')
    const read = decodeChallenge(raw)
    expect(read?.target?.n.length).toBeLessThanOrEqual(24)
    expect(read?.target?.n).not.toMatch(/[<>]/)
  })
})
