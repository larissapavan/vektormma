import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCareer, fight, seededRng, type Build, type Career } from '../shared/game/career'
import { clearSave, loadSave, readCareer, readSave, SAVE_KEY, storeSave } from '../shared/game/save'

const build: Build = { name: 'Maria Silva', division: 'Lightweight', stance: 'Orthodox', striking: 60, takedowns: 45, reach: 40 }
const offer = { label: 'even', name: 'Rival One', win_probability: 0.5, sig_str_acc: 0.45, takedown_acc: 0.38, champion: false }
const player = { sig_str_acc: 0.5, takedown_acc: 0.4 }

/** A career that has been through a few fights, so every field has something in it. */
function veteran(): Career {
  let career = createCareer(build)
  for (let index = 0; index < 4; index += 1) career = fight(career, { ...offer, name: `Rival ${index}` }, 'balanced', player, seededRng(index + 1)).career
  return career
}

const save = (career: Career, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ career, stage: 'camp', coaches: ['striker', 'wrestler', 'allround'], seed: 123, note: null, savedAt: 1700000000000, ...extra })

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('reading a saved career', () => {
  it('gives back exactly what the game wrote', () => {
    const career = veteran()
    expect(career.history.length).toBe(4)
    expect(readCareer(JSON.parse(JSON.stringify(career)))).toEqual(career)
    expect(readSave(save(career, { stage: 'offers', note: { injured: true, declined: false } }))).toMatchObject({ stage: 'offers', seed: 123, note: { injured: true, declined: false }, career })
  })

  it('keeps a champion’s belt, a rival and a best win', () => {
    const career: Career = { ...veteran(), champion: true, titleWins: 1, defenses: 2, rival: 'Old Foe', bestWin: { name: 'Big Name', chance: 0.2 }, scouted: true }
    expect(readCareer(JSON.parse(JSON.stringify(career)))).toEqual(career)
  })

  it.each([
    ['a name that is empty after cleaning', { name: '<>' }],
    ['a skill above 100', { striking: 101 }],
    ['a skill that is not a number', { takedowns: '50' }],
    ['a negative record', { wins: -1 }],
    ['a fraction of a fight', { losses: 1.5 }],
    ['an age of 300', { age: 300 }],
    ['a division that does not exist', { division: 'Superheavyweight' }],
    ['a stance that does not exist', { stance: 'Upside down' }],
    ['a career that has already ended', { ended: 'retired' }],
    ['a streak no career can have', { lossStreak: 9 }],
    ['a champion flag that is not a flag', { champion: 'yes' }],
    ['a history that is not a list', { history: 'none' }],
    ['a history entry with a made-up method', { history: [{ opponent: 'X', won: true, method: 'magic', round: 1, title: false, chance: 0.5 }] }],
    ['a best win without a chance', { bestWin: { name: 'X' } }],
    ['a rival that is not a name', { rival: 7 }],
    ['a list of fought opponents with a number in it', { fought: ['A', 3] }],
  ])('refuses %s', (_label, change) => {
    expect(readCareer({ ...JSON.parse(JSON.stringify(createCareer(build))), ...change })).toBeNull()
  })

  it('refuses a save that is not the game’s own shape', () => {
    const career = createCareer(build)
    expect(readSave(null)).toBeNull()
    expect(readSave('')).toBeNull()
    expect(readSave('not json')).toBeNull()
    expect(readSave(JSON.stringify([1, 2]))).toBeNull()
    expect(readSave(save(career, { stage: 'fight' }))).toBeNull() // a fight is never saved in the middle
    expect(readSave(save(career, { stage: 'end' }))).toBeNull()
    expect(readSave(save(career, { coaches: ['striker', 'wrestler'] }))).toBeNull()
    expect(readSave(save(career, { coaches: ['striker', 'wrestler', 'ninja'] }))).toBeNull()
    expect(readSave(save(career, { seed: -5 }))).toBeNull()
    expect(readSave(save(career, { note: { injured: 'no', declined: false } }))).toBeNull()
    expect(readSave(save(career, { savedAt: 'yesterday' }))).toBeNull()
    expect(readSave('x'.repeat(70_000))).toBeNull()
  })

  it('cuts texts and strips markup from the names it reads', () => {
    const career = { ...JSON.parse(JSON.stringify(createCareer(build))), name: '  <b>Maria</b>   Silva  '.repeat(5), fought: ['<i>Rival</i>'], rival: '<script>x</script>' }
    const read = readCareer(career)
    expect(read?.name.length).toBeLessThanOrEqual(24)
    expect(read?.name).not.toMatch(/[<>]/)
    expect(read?.fought).toEqual(['iRival/i'])
    expect(read?.rival).not.toMatch(/[<>]/)
  })
})

describe('goals and achievements in a save', () => {
  const plain = () => JSON.parse(JSON.stringify(createCareer(build, ['wins4', 'kos2', 'upset'])))

  it('are read back with the career', () => {
    const career: Career = { ...veteran(), goals: [{ id: 'wins4', done: true }, { id: 'kos2', done: false }], earned: ['debut', 'lightning'], bestStreak: 3 }
    expect(readCareer(JSON.parse(JSON.stringify(career)))).toEqual(career)
  })

  it('read as none for a save from before they existed, with the best streak taken from the current one', () => {
    const old = plain()
    delete old.goals
    delete old.earned
    delete old.bestStreak
    old.winStreak = 2
    expect(readCareer(old)).toMatchObject({ goals: [], earned: [], bestStreak: 2 })
  })

  it.each([
    ['a goal that does not exist', { goals: [{ id: 'win-everything', done: false }] }],
    ['a goal listed twice', { goals: [{ id: 'wins4', done: false }, { id: 'wins4', done: true }] }],
    ['a goal whose state is not a flag', { goals: [{ id: 'wins4', done: 'yes' }] }],
    ['goals that are not a list', { goals: 'wins4' }],
    ['more goals than the game has', { goals: Array.from({ length: 9 }, () => ({ id: 'wins4', done: false })) }],
    ['an achievement that does not exist', { earned: ['god_mode'] }],
    ['an achievement earned twice', { earned: ['debut', 'debut'] }],
    ['earned achievements that are not a list', { earned: 'debut' }],
    ['a best streak that is not a count', { bestStreak: -3 }],
  ])('refuses %s', (_label, change) => {
    expect(readCareer({ ...plain(), ...change })).toBeNull()
  })
})

describe('the save in the browser', () => {
  it('is stored, read back and cleared', () => {
    expect(loadSave()).toBeNull()
    storeSave({ career: veteran(), stage: 'camp', coaches: ['striker', 'wrestler', 'allround'], seed: 5, note: null })
    expect(loadSave()).toMatchObject({ stage: 'camp', seed: 5, career: { name: 'Maria Silva', ufcFights: 4 } })
    expect(window.localStorage.getItem(SAVE_KEY)).toContain('Maria Silva')
    clearSave()
    expect(loadSave()).toBeNull()
  })

  it('does nothing, and does not throw, when the browser will not let the game read or write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadSave()).toBeNull()
    expect(() => storeSave({ career: createCareer(build), stage: 'camp', coaches: ['striker', 'wrestler', 'allround'], seed: 1, note: null })).not.toThrow()
    expect(() => clearSave()).not.toThrow()
  })
})
