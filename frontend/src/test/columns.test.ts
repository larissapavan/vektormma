import { describe, expect, it } from 'vitest'

import { eventsFrom, rowsFrom } from '../shared/services/columns'

describe('lists that travel as columns', () => {
  it('are rebuilt row by row', () => {
    const data = { count: 2, columns: { name: ['Ana', 'Bia'], age: [28.1, null], badges: [['brazil'], []] } }
    expect(rowsFrom(data)).toEqual([{ name: 'Ana', age: 28.1, badges: ['brazil'] }, { name: 'Bia', age: null, badges: [] }])
    expect(rowsFrom({ count: 0, columns: {} })).toEqual([])
  })

  it('put each event’s fights back, with the winner by name', () => {
    const data = {
      events: { count: 3, columns: { name: ['One', 'Two', 'Three'], listed: [2, 0, 1] } },
      fights: { count: 3, columns: { fighter_1: ['A', 'C', 'E'], fighter_2: ['B', 'D', 'F'], winner: [2, null, 'Someone Else'] } },
    }
    expect(eventsFrom(data)).toEqual([
      { name: 'One', fights: [{ fighter_1: 'A', fighter_2: 'B', winner: 'B', fight_url: null }, { fighter_1: 'C', fighter_2: 'D', winner: null, fight_url: null }] },
      { name: 'Two', fights: [] },
      { name: 'Three', fights: [{ fighter_1: 'E', fighter_2: 'F', winner: 'Someone Else', fight_url: null }] },
    ])
  })

  it('are taken as they are from an API that still sends the plain list', () => {
    const list = [{ name: 'Ana' }]
    expect(rowsFrom(list)).toBe(list)
    expect(eventsFrom(list)).toBe(list)
  })
})
