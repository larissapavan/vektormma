import { describe, expect, it } from 'vitest'

import {
  budgetLeft,
  canRetire,
  COACHES,
  createCareer,
  decodeRetrospect,
  encodeRetrospect,
  fight,
  offerCoaches,
  planNudge,
  previewCamp,
  retire,
  retrospect,
  seededRng,
  similarFighter,
  standing,
  titleShotAvailable,
  trainCamp,
  validBuild,
  type Build,
  type Career,
  type Offer,
} from '../shared/game/career'

const build: Build = { name: '  Maria  <b>Silva</b> ', division: 'Lightweight', stance: 'Orthodox', striking: 60, takedowns: 45, reach: 40 }
const player = { sig_str_acc: 0.5, takedown_acc: 0.4 }
const offer = (chance: number, extra: Partial<Offer> = {}): Offer => ({ label: 'even', name: 'Rival One', win_probability: chance, sig_str_acc: 0.45, takedown_acc: 0.38, champion: false, ...extra })

describe('creating a fighter', () => {
  it('spends a budget of 150 points on three skills between 20 and 90', () => {
    expect(budgetLeft(build)).toBe(5)
    expect(validBuild(build)).toBe(true)
    expect(validBuild({ ...build, striking: 90, takedowns: 60 })).toBe(false) // over budget
    expect(validBuild({ ...build, reach: 10 })).toBe(false) // under the minimum
    expect(validBuild({ ...build, name: '   ' })).toBe(false)
    expect(() => createCareer({ ...build, striking: 90, takedowns: 60 })).toThrow()
  })

  it('starts at 6-0 on the regional circuit, at 24, with a clean name', () => {
    const career = createCareer(build)
    expect(career).toMatchObject({ wins: 6, losses: 0, ufcFights: 0, age: 24, points: 0, ended: null })
    expect(career.name).toBe('Maria bSilva/b')
  })
})

describe('the training camp', () => {
  const rookie = createCareer(build)

  const safe = () => 0.99 // a roll that never hurts anyone

  it('teaches each coach’s own skill: the striker raises striking, the wrestler takedowns, the all-round both', () => {
    const striker = trainCamp(rookie, 'striker', safe).career
    const wrestler = trainCamp(rookie, 'wrestler', safe).career
    const allround = trainCamp(rookie, 'allround', safe).career
    expect(striker.striking - rookie.striking).toBeGreaterThan(striker.takedowns - rookie.takedowns)
    expect(wrestler.takedowns - rookie.takedowns).toBeGreaterThan(wrestler.striking - rookie.striking)
    expect(allround.striking).toBeGreaterThan(rookie.striking)
    expect(allround.takedowns).toBeGreaterThan(rookie.takedowns)
    expect(striker.striking).toBeGreaterThan(allround.striking)
  })

  it('makes the sparring coach teach the most, and the conditioning coach the least', () => {
    const gain = (coach: 'sparring' | 'conditioning' | 'allround') => {
      const after = trainCamp(rookie, coach, safe).career
      return after.striking - rookie.striking + (after.takedowns - rookie.takedowns)
    }
    expect(gain('sparring')).toBeGreaterThan(gain('allround'))
    expect(gain('allround')).toBeGreaterThan(gain('conditioning'))
  })

  it('shows the same numbers before the camp as the camp then delivers', () => {
    for (const coach of Object.values(COACHES)) {
      const shown = previewCamp(rookie, coach)
      const after = trainCamp(rookie, coach.id, safe).career
      expect(after.striking).toBeCloseTo(rookie.striking + shown.striking, 1)
      expect(after.takedowns).toBeCloseTo(rookie.takedowns + shown.takedowns, 1)
      expect(after.age).toBeCloseTo(rookie.age + shown.age, 2)
    }
  })

  it('risks an injury: the sparring coach most, the conditioning coach least, and an injury costs skill and time', () => {
    const chance = (coach: keyof typeof COACHES) => previewCamp(rookie, COACHES[coach]).injury
    expect(chance('sparring')).toBeGreaterThan(chance('striker'))
    expect(chance('striker')).toBeGreaterThan(chance('allround'))
    expect(chance('conditioning')).toBeLessThan(chance('allround'))
    expect(chance('conditioning')).toBeGreaterThanOrEqual(0.02)

    expect(trainCamp(rookie, 'conditioning', () => 0.1).injured).toBe(false)
    const hurt = trainCamp(rookie, 'sparring', () => 0.1)
    expect(hurt.injured).toBe(true)
    expect(hurt.career.age).toBeGreaterThan(rookie.age + 0.4)
  })

  it('adds to the injury risk after a knockout loss', () => {
    const knockedOut: Career = { ...rookie, history: [{ opponent: 'X', won: false, method: 'ko', round: 1, title: false, chance: 0.5 }] }
    expect(previewCamp(knockedOut, COACHES.allround).injury).toBeCloseTo(previewCamp(rookie, COACHES.allround).injury + 0.1, 5)
  })

  it('gives the scout coach’s head start to the next fight only', () => {
    const scouted = trainCamp(rookie, 'scout', safe).career
    expect(scouted.scouted).toBe(true)
    const plain = fight(rookie, offer(0.5), 'balanced', player, () => 0.51)
    const edge = fight(scouted, offer(0.5), 'balanced', player, () => 0.51)
    expect(plain.won).toBe(false) // 0.51 is above a 50% chance
    expect(edge.won).toBe(true) // and below 52%
    expect(edge.career.scouted).toBe(false)
  })

  it('offers three different coaches, always with one safe choice', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const coaches = offerCoaches(seededRng(seed))
      expect(coaches).toHaveLength(3)
      expect(new Set(coaches).size).toBe(3)
      expect(coaches.some((coach) => coach === 'allround' || coach === 'conditioning')).toBe(true)
    }
    const seen = new Set<string>()
    for (let seed = 1; seed <= 50; seed += 1) offerCoaches(seededRng(seed)).forEach((coach) => seen.add(coach))
    expect(seen.size).toBe(6)
  })

  it('makes a veteran slip with age', () => {
    const veteran: Career = { ...rookie, age: 35 }
    const result = trainCamp(veteran, 'wrestler', safe)
    expect(result.declined).toBe(true)
    expect(result.career.striking).toBeLessThan(veteran.striking)
  })

  it('ends the career at 41', () => {
    expect(trainCamp({ ...rookie, age: 40.9 }, 'striker', safe).career.ended).toBe('age')
  })
})

describe('a fight', () => {
  const rookie = createCareer(build)

  it('moves the record, the streak and the points when the player wins', () => {
    const result = fight(rookie, offer(0.5), 'balanced', player, () => 0)
    expect(result.won).toBe(true)
    expect(result.career).toMatchObject({ wins: 7, losses: 0, ufcFights: 1, winStreak: 1, lossStreak: 0 })
    expect(result.career.points).toBe(result.pointsGained)
    expect(result.career.bestWin?.name).toBe('Rival One')
    expect(result.career.fought).toEqual(['Rival One'])
    expect(rookie.wins).toBe(6) // the career it was given is not changed
  })

  it('makes the beaten opponent a rival, and beating him again clears it', () => {
    const lost = fight(rookie, offer(0.5), 'balanced', player, () => 0.999)
    expect(lost.won).toBe(false)
    expect(lost.career).toMatchObject({ losses: 1, lossStreak: 1, winStreak: 0, rival: 'Rival One' })
    const avenged = fight(lost.career, offer(0.5), 'balanced', player, () => 0)
    expect(avenged.career.rival).toBeNull()
  })

  it('pays more for the harder fights and for a finish', () => {
    const points = (chance: number) => fight(rookie, offer(chance), 'balanced', player, () => 0).pointsGained
    expect(points(0.3)).toBeGreaterThanOrEqual(points(0.7))
  })

  it('releases the fighter after three losses in a row', () => {
    let career = rookie
    for (let index = 0; index < 3; index += 1) career = fight(career, offer(0.5), 'balanced', player, () => 0.999).career
    expect(career.ended).toBe('released')
  })

  it('never lets the points go below zero', () => {
    expect(fight(rookie, offer(0.5), 'balanced', player, () => 0.999).career.points).toBe(0)
  })

  it('winning a title shot makes the player champion, and defending counts', () => {
    const contender: Career = { ...rookie, points: 22 }
    expect(titleShotAvailable(contender)).toBe(true)
    const won = fight(contender, offer(0.4, { champion: true, name: 'The Champ' }), 'balanced', player, () => 0)
    expect(won.wonBelt).toBe(true)
    expect(won.career).toMatchObject({ champion: true, titleWins: 1 })
    expect(standing(won.career)).toBe('champion')
    expect(titleShotAvailable(won.career)).toBe(false)

    const defended = fight(won.career, offer(0.5), 'balanced', player, () => 0)
    expect(defended.career).toMatchObject({ champion: true, defenses: 1 })
    expect(defended.rounds.length).toBe(defended.method === 'dec' ? 5 : defended.round)

    const lost = fight(won.career, offer(0.5), 'balanced', player, () => 0.999)
    expect(lost.lostBelt).toBe(true)
    expect(lost.career.champion).toBe(false)
  })

  it('tells the story round by round, and a finish ends on the round it happened', () => {
    for (let seed = 1; seed < 60; seed += 1) {
      const result = fight(rookie, offer(0.5), 'balanced', player, seededRng(seed))
      expect(result.rounds.length).toBe(result.round)
      expect(result.rounds[result.rounds.length - 1].finish).toBe(result.method !== 'dec')
      expect(result.round).toBeLessThanOrEqual(3)
      const winnerEdge = result.won ? 'you' : 'opp'
      if (result.method !== 'dec') expect(result.rounds[result.rounds.length - 1].edge).toBe(winnerEdge)
      else expect(result.rounds.filter((round) => round.edge === winnerEdge).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('wins about as often as the chance says', () => {
    const rng = seededRng(42)
    let wins = 0
    for (let index = 0; index < 2000; index += 1) wins += fight(rookie, offer(0.7), 'balanced', player, rng).won ? 1 : 0
    expect(wins / 2000).toBeGreaterThan(0.66)
    expect(wins / 2000).toBeLessThan(0.74)
  })
})

describe('the game plan', () => {
  it('moves the chance by at most 4 points, toward where the player has the edge', () => {
    expect(planNudge('balanced', player, offer(0.5))).toBe(0)
    expect(planNudge('striking', { sig_str_acc: 0.6, takedown_acc: 0.4 }, offer(0.5))).toBeCloseTo(0.04, 5)
    expect(planNudge('striking', { sig_str_acc: 0.3, takedown_acc: 0.4 }, offer(0.5))).toBeCloseTo(-0.04, 5)
    expect(Math.abs(planNudge('grappling', { sig_str_acc: 0.5, takedown_acc: 0.9 }, offer(0.5)))).toBeLessThanOrEqual(0.04)
  })

  it('makes knockouts likelier with a striking plan and submissions with a grappling one', () => {
    const rookie = createCareer(build)
    const rate = (plan: 'striking' | 'grappling', method: string) => {
      const rng = seededRng(7)
      let hits = 0
      for (let index = 0; index < 1500; index += 1) hits += fight(rookie, offer(0.99), plan, player, rng).method === method ? 1 : 0
      return hits / 1500
    }
    expect(rate('striking', 'ko')).toBeGreaterThan(rate('grappling', 'ko'))
    expect(rate('grappling', 'sub')).toBeGreaterThan(rate('striking', 'sub'))
  })
})

describe('the standings and the end', () => {
  it('climbs with points and has a title shot at 20', () => {
    const at = (points: number) => standing({ points, champion: false })
    expect([0, 4, 9, 15, 20].map(at)).toEqual(['prospect', 'rising', 'top15', 'top5', 'contender'])
  })

  it('lets the player retire only after three UFC fights', () => {
    const rookie = createCareer(build)
    expect(canRetire(rookie)).toBe(false)
    expect(canRetire({ ...rookie, ufcFights: 3 })).toBe(true)
    expect(retire({ ...rookie, ufcFights: 3 }).ended).toBe('retired')
  })

  it('finds the real fighter with the closest record in the same division', () => {
    const career = { ...createCareer(build), wins: 20, losses: 5 }
    const catalog = [
      { name: 'Far Away', division: 'Lightweight', wins: 5, losses: 10, total_fights: 15, win_rate: 0.33 },
      { name: 'Close One', division: 'Lightweight', wins: 21, losses: 5, total_fights: 26, win_rate: 0.81 },
      { name: 'Other Division', division: 'Heavyweight', wins: 20, losses: 5, total_fights: 25, win_rate: 0.8 },
    ]
    expect(similarFighter(career, catalog)).toBe('Close One')
    expect(similarFighter(career, [])).toBeNull()
  })

  it('plays a whole career to its end', () => {
    const rng = seededRng(2026)
    let career = createCareer(build)
    for (let step = 0; step < 200 && !career.ended; step += 1) {
      career = trainCamp(career, step % 2 ? 'striker' : 'allround', rng).career
      if (career.ended) break
      career = fight(career, offer(0.6), step % 3 === 0 ? 'striking' : 'balanced', player, rng).career
    }
    expect(career.ended).not.toBeNull()
    expect(career.wins + career.losses + career.draws).toBe(6 + career.ufcFights)
    expect(career.koWins + career.subWins + career.decWins).toBe(career.wins - 6)
  })
})

describe('the shared link', () => {
  const career: Career = { ...createCareer(build), wins: 19, losses: 4, koWins: 8, subWins: 3, decWins: 2, ufcFights: 17, age: 33.4, champion: false, titleWins: 1, defenses: 2, ended: 'retired', bestWin: { name: 'Beneil Dariush', chance: 0.31 } }
  const card = retrospect(career, 'Charles Oliveira')

  it('carries the career and reads back the same', () => {
    expect(card).toMatchObject({ n: 'Maria bSilva/b', w: 19, l: 4, ko: 8, sb: 3, dc: 2, f: 17, a: 33, c: 1, df: 2, b: 'Beneil Dariush', x: 'Charles Oliveira', e: 'retired' })
    expect(decodeRetrospect(encodeRetrospect(card))).toEqual(card)
  })

  it('survives accents and emoji in a name', () => {
    const odd = { ...card, n: 'José Aldo 🥊' }
    expect(decodeRetrospect(encodeRetrospect(odd))?.n).toBe('José Aldo 🥊')
  })

  it('refuses a link that is missing, damaged, too long or made up', () => {
    expect(decodeRetrospect(null)).toBeNull()
    expect(decodeRetrospect('not-base64!!')).toBeNull()
    expect(decodeRetrospect('a'.repeat(1300))).toBeNull()
    const forged = (patch: object) => decodeRetrospect(encodeRetrospect({ ...card, ...patch } as never))
    expect(forged({ w: -1 })).toBeNull()
    expect(forged({ w: 1e9 })).toBeNull()
    expect(forged({ s: 'god' })).toBeNull()
    expect(forged({ e: 'died' })).toBeNull()
    expect(forged({ n: '' })).toBeNull()
  })

  it('cuts long texts and strips markup characters from them', () => {
    const decoded = decodeRetrospect(encodeRetrospect({ ...card, n: '<script>alert(1)</script>'.repeat(5), b: 'x'.repeat(200) }))
    expect(decoded?.n.length).toBeLessThanOrEqual(24)
    expect(decoded?.n).not.toMatch(/[<>]/)
    expect(decoded?.b.length).toBeLessThanOrEqual(40)
  })
})
