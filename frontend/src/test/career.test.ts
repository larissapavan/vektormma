import { describe, expect, it } from 'vitest'

import {
  bestTactic,
  budgetLeft,
  canRetire,
  COACHES,
  cornerAdvice,
  createCareer,
  decodeRetrospect,
  encodeRetrospect,
  fight,
  liveChance,
  offerCoaches,
  planNudge,
  playRound,
  playToTheEnd,
  previewCamp,
  retire,
  retrospect,
  seededRng,
  settleFight,
  similarFighter,
  startFight,
  standing,
  streakBonus,
  throwFight,
  CAMP_YEARS,
  CONDITIONING_YEARS,
  TACTICS,
  titleShotAvailable,
  trainCamp,
  validBuild,
  type Build,
  type Career,
  type FightState,
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
    const plain = startFight(rookie, offer(0.5), 'balanced', player, () => 0.5)
    const edge = startFight(scouted, offer(0.5), 'balanced', player, () => 0.5)
    expect(plain.chance).toBeCloseTo(0.5, 5)
    expect(edge.chance).toBeCloseTo(0.52, 5) // two points of chance, as the coach says
    const edgeResult = fight(scouted, offer(0.5), 'balanced', player, () => 0.5)
    expect(edgeResult.career.scouted).toBe(false)
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

describe('playing the rest of a fight at once', () => {
  const rookie = createCareer(build)
  const begin = (seed: number) => startFight(rookie, offer(0.5), 'balanced', player, seededRng(seed))

  it('is the same as playing every round with the steady tactic, one at a time, for any seed', () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const at_once = playToTheEnd(begin(seed), seededRng(seed + 1000))
      let by_hand = begin(seed)
      const dice = seededRng(seed + 1000)
      while (!by_hand.over) by_hand = playRound(by_hand, 'steady', dice)
      expect(at_once).toEqual(by_hand)
    }
  })

  it('plays only the rounds that are left, from wherever the fight is', () => {
    const rng = seededRng(77)
    let state = begin(7)
    state = playRound(state, 'attack', rng)
    if (state.over) return
    const rest = playToTheEnd(state, rng)
    expect(rest.over).not.toBeNull()
    expect(rest.stories[0]).toEqual(state.stories[0]) // the round already fought is kept as it was
    expect(rest.played).toBeGreaterThan(state.played)
  })

  it('leaves a fight that is over as it is, and takes another tactic when told to', () => {
    const over = playToTheEnd(begin(3), seededRng(5))
    expect(playToTheEnd(over, seededRng(9))).toBe(over)
    const tactics = (tactic: 'attack' | 'cover') => {
      let ended = 0
      for (let seed = 1; seed <= 400; seed += 1) ended += playToTheEnd(begin(seed), seededRng(seed + 5000), tactic).stories.length === 3 ? 1 : 0
      return ended // fights that went all three rounds
    }
    expect(tactics('cover')).toBeGreaterThan(tactics('attack')) // covering up ends fewer fights early than attacking
  })

  it('keeps fight() as it was: one call plays and settles', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const result = fight(rookie, offer(0.5), 'balanced', player, seededRng(seed))
      expect(result.career.ufcFights).toBe(1)
      expect(result.rounds.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('a fight, round by round', () => {
  const rookie = createCareer(build)
  const begin = (chance: number, extra: Partial<Offer> = {}) => startFight(rookie, offer(chance, extra), 'balanced', player, seededRng(1), extra.champion)
  const at = (state: FightState, played: number, you: number, opp: number): FightState => ({ ...state, played, youRounds: you, oppRounds: opp })

  it('starts level on the cards, with the chance the model gave (plus the plan and the film study)', () => {
    const state = begin(0.62)
    expect(state).toMatchObject({ played: 0, youRounds: 0, oppRounds: 0, scheduled: 3, over: null })
    expect(state.chance).toBeCloseTo(0.62, 5)
    expect(liveChance(state)).toBeCloseTo(0.62, 3) // the solved odds of the whole fight are the model's chance
    expect(begin(0.4, { champion: true }).scheduled).toBe(5)
  })

  it('keeps the model’s chance for any fight length and any chance: the odds at the bell are the chance', () => {
    for (const chance of [0.05, 0.2, 0.5, 0.8, 0.95]) {
      expect(liveChance(begin(chance))).toBeCloseTo(Math.min(Math.max(chance, 0.03), 0.97), 3)
      expect(liveChance(begin(chance, { champion: true }))).toBeCloseTo(Math.min(Math.max(chance, 0.03), 0.97), 3)
    }
  })

  it('plays a fight with the middle tactic as often as the chance says, wins and finishes alike', () => {
    const rng = seededRng(99)
    let wins = 0
    for (let index = 0; index < 3000; index += 1) {
      let state = begin(0.35)
      while (!state.over) state = playRound(state, 'steady', rng)
      wins += state.over.won ? 1 : 0
    }
    expect(wins / 3000).toBeGreaterThan(0.32)
    expect(wins / 3000).toBeLessThan(0.38)
  })

  it('moves the score one round at a time and ends on the cards after the last round', () => {
    for (let seed = 1; seed < 80; seed += 1) {
      const rng = seededRng(seed)
      let state = begin(0.5)
      let rounds = 0
      while (!state.over) {
        const before = state
        state = playRound(state, 'steady', rng)
        rounds += 1
        expect(state.played).toBe(before.played + 1)
        expect(state.youRounds + state.oppRounds).toBe(state.played)
        expect(state.stories).toHaveLength(state.played)
      }
      expect(rounds).toBeLessThanOrEqual(3)
      if (state.over.method === 'dec') {
        expect(state.played).toBe(3)
        expect(state.over.won).toBe(state.youRounds > state.oppRounds)
      } else {
        expect(state.stories[state.stories.length - 1].finish).toBe(true)
      }
      expect(playRound(state, 'attack', rng)).toBe(state) // nothing happens after the fight is over
    }
  })

  it('remembers what was chosen for each round', () => {
    const rng = seededRng(3)
    let state = begin(0.5)
    state = playRound(state, 'attack', rng)
    if (!state.over) state = playRound(state, 'cover', rng)
    expect(state.stories.map((story) => story.tactic)).toEqual(['attack', 'cover'].slice(0, state.stories.length))
  })

  it('makes a lead that cannot be lost on the cards a reason to cover, and a deficit a reason to attack', () => {
    const state = begin(0.5)
    expect(cornerAdvice(at(state, 2, 2, 0))).toBe('protect')
    expect(bestTactic(at(state, 2, 2, 0))).toBe('cover')
    expect(cornerAdvice(at(state, 2, 0, 2))).toBe('finish')
    expect(bestTactic(at(state, 2, 0, 2))).toBe('attack')
    expect(cornerAdvice(state)).toBe('steady') // level at the bell: nothing to add
    expect(liveChance(at(state, 2, 2, 0))).toBeGreaterThan(0.85)
    expect(liveChance(at(state, 2, 0, 2))).toBeLessThan(0.15)
    expect(liveChance(at(state, 1, 1, 0))).toBeGreaterThan(liveChance(state))
    expect(liveChance(at(state, 1, 0, 1))).toBeLessThan(liveChance(state))
  })

  it('makes each tactic change the odds of a finish: an attack more of them (on both sides), a cover fewer', () => {
    const finishes = (tactic: 'attack' | 'steady' | 'cover') => {
      const rng = seededRng(21)
      let ended = 0
      for (let index = 0; index < 4000; index += 1) ended += playRound(begin(0.5), tactic, rng).over ? 1 : 0
      return ended / 4000
    }
    expect(finishes('attack')).toBeGreaterThan(finishes('steady'))
    expect(finishes('steady')).toBeGreaterThan(finishes('cover'))
  })

  it('makes a tactic worth something only at the right moment: covering a lead pays, covering when level costs', () => {
    const state = begin(0.5)
    const after = (from: FightState, tactic: 'attack' | 'steady' | 'cover') => {
      const rng = seededRng(5)
      let wins = 0
      for (let index = 0; index < 4000; index += 1) {
        let next = playRound(from, tactic, rng)
        while (!next.over) next = playRound(next, 'steady', rng)
        wins += next.over.won ? 1 : 0
      }
      return wins / 4000
    }
    expect(after(at(state, 2, 2, 0), 'cover')).toBeGreaterThan(after(at(state, 2, 2, 0), 'attack') + 0.1)
    expect(after(at(state, 2, 0, 2), 'attack')).toBeGreaterThan(after(at(state, 2, 0, 2), 'cover') + 0.05)
    expect(after(at(state, 2, 1, 1), 'cover')).toBeLessThan(after(at(state, 2, 1, 1), 'steady'))
    expect(TACTICS).toEqual(['attack', 'steady', 'cover'])
  })

  it('settles a finished fight on the career, and refuses one that is still going', () => {
    const rng = seededRng(8)
    const o = offer(0.5)
    let state = begin(0.5)
    expect(() => settleFight(rookie, o, state)).toThrow(/not over/i)
    while (!state.over) state = playRound(state, 'steady', rng)
    const result = settleFight(rookie, o, state)
    expect(result.won).toBe(state.over.won)
    expect(result.rounds).toBe(state.stories)
    expect(result.career.ufcFights).toBe(1)
    expect(result.career.wins + result.career.losses).toBe(7)
  })
})

describe('the pace of a career', () => {
  const rookie = createCareer(build)
  const safe = () => 0.99 // a roll that never hurts anyone

  it('takes 0.3 of a year for a camp and its fight (about three a year), a little over a sixth with the conditioning coach', () => {
    expect(CAMP_YEARS).toBeCloseTo(0.3, 5)
    let career: Career = rookie
    for (let cycle = 0; cycle < 3; cycle += 1) career = trainCamp(career, 'allround', safe).career
    expect(career.age - rookie.age).toBeCloseTo(0.9, 5) // three fights in less than a year
    expect(trainCamp(rookie, 'conditioning', safe).career.age - rookie.age).toBeCloseTo(CONDITIONING_YEARS, 5)
    expect(Object.values(COACHES).every((coach) => coach.age <= CAMP_YEARS)).toBe(true)
  })

  it('lets a career that is never hurt last over 50 fights before 41', () => {
    let career: Career = rookie
    let cycles = 0
    while (!career.ended && cycles < 200) {
      career = trainCamp(career, 'allround', safe).career
      cycles += 1
    }
    expect(career.ended).toBe('age')
    expect(cycles).toBeGreaterThanOrEqual(50)
  })
})

describe('a winning run', () => {
  it('pays nothing extra for the first two wins, +1 from the third in a row and +2 from the fifth', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 12].map(streakBonus)).toEqual([0, 0, 0, 1, 1, 2, 2, 2])
  })

  it('adds the bonus to the points of the win that makes the run, and a loss starts the count again', () => {
    let career = createCareer(build)
    const gains: number[] = []
    const streakGains: number[] = []
    for (let index = 0; index < 6; index += 1) {
      const result = fight(career, offer(0.7, { name: `Rival ${index}` }), 'balanced', player, () => 0)
      expect(result.won).toBe(true)
      gains.push(result.pointsGained)
      streakGains.push(result.streakPoints)
      career = result.career
    }
    expect(streakGains).toEqual([0, 0, 1, 1, 2, 2])
    expect(gains[2] - gains[1]).toBe(1) // the same fight, one point richer from the third win
    expect(gains[4] - gains[1]).toBe(2)
    const lost = fight(career, offer(0.7, { name: 'Upset' }), 'balanced', player, () => 0.999)
    expect(lost.career.winStreak).toBe(0)
    expect(lost.streakPoints).toBe(0)
    expect(fight(lost.career, offer(0.7), 'balanced', player, () => 0).streakPoints).toBe(0)
  })

  it('reaches the title shot in far fewer than 20 fights for someone who keeps winning the easy ones', () => {
    let career = createCareer(build)
    let fights = 0
    while (!titleShotAvailable(career) && fights < 40) {
      career = fight(career, offer(0.7, { name: `Rival ${fights}` }), 'balanced', player, () => 0).career // wins on the cards
      fights += 1
    }
    expect(fights).toBeLessThanOrEqual(10)
  })
})

describe('an arranged fight', () => {
  it('is lost on the cards in every round, with no dice, whatever the chance was', () => {
    for (const chance of [0.1, 0.5, 0.97]) {
      const start = startFight(createCareer(build), offer(chance), 'balanced', player, () => 0.5)
      const thrown = throwFight(start)
      expect(thrown.over).toEqual({ won: false, method: 'dec', round: 3, split: false })
      expect(thrown).toMatchObject({ played: 3, youRounds: 0, oppRounds: 3 })
      expect(thrown.stories).toHaveLength(3)
      expect(thrown.stories.every((story) => story.edge === 'opp' && !story.finish)).toBe(true)
      expect(settleFight(createCareer(build), offer(chance), thrown).career).toMatchObject({ losses: 1, lossStreak: 1 })
    }
  })

  it('goes five rounds in a title fight', () => {
    expect(throwFight(startFight(createCareer(build), offer(0.5, { champion: true }), 'balanced', player, () => 0.5)).stories).toHaveLength(5)
  })
})
