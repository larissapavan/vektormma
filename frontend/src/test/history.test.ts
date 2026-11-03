import { describe, expect, it } from 'vitest'

import { historyDecades, historyRange } from '../shared/data/history'

describe('the span of history on the site', () => {
  it('runs from the first UFC event to the year it is read in', () => {
    expect(historyRange(new Date('2026-11-02T12:00:00Z'))).toBe('1993–2026')
    expect(historyRange(new Date('2027-01-05T12:00:00Z'))).toBe('1993–2027')
  })

  it('rounds the years down to whole decades, so "30+" stays true until 2033', () => {
    expect(historyDecades(new Date('2026-11-02T12:00:00Z'))).toBe(30)
    expect(historyDecades(new Date('2032-12-31T12:00:00Z'))).toBe(30)
    expect(historyDecades(new Date('2033-01-01T12:00:00Z'))).toBe(40)
  })
})
