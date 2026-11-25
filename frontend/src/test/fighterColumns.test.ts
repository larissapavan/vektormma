import { describe, expect, it } from 'vitest'

import { fightersFrom } from '../shared/services/api'
import { alpha, beta } from './fixtures'
import type { FighterProfile } from '../shared/types/api'

describe('the fighter list', () => {
  it('is rebuilt from its columns', () => {
    const data = { count: 2, columns: { name: ['Ana', 'Bia'], age: [28.1, null], badges: [['brazil'], []] } }
    expect(fightersFrom(data)).toEqual([{ name: 'Ana', age: 28.1, badges: ['brazil'] }, { name: 'Bia', age: null, badges: [] }])
  })

  it('is taken as it is from an API that still sends the list', () => {
    const list = [alpha, beta] as unknown as FighterProfile[]
    expect(fightersFrom(list)).toBe(list)
  })
})
