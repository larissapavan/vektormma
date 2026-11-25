import { describe, expect, it } from 'vitest'

import { MIN_POOL, STYLE_METRICS, STYLE_TRAITS, percentile, styleNotes, styleOf, stylePools, traitLabel } from '../shared/data/style'
import type { FighterProfile } from '../shared/types/api'

const LANGUAGES = ['pt-BR', 'en-US', 'fr-FR', 'es-419']
const fighter = (name: string, over: Partial<FighterProfile> = {}) =>
  ({
    name, division: 'Lightweight', ufc_status: 'active', sig_strikes_landed_per_min: 4, sig_strikes_absorbed_per_min: 3, sig_str_acc: 0.5, striking_defense: 0.55,
    takedown_avg_per_15min: 1.5, takedown_acc: 0.4, takedown_defense: 0.6, submission_avg_per_15min: 0.5, ...over,
  }) as FighterProfile

/** Twenty lightweights with 1 to 20 takedowns and 1% to 20% takedown defense. */
const division = Array.from({ length: 20 }, (_, i) => fighter(`F${i}`, { takedown_avg_per_15min: i + 1, takedown_defense: (i + 1) / 100 }))

describe('where a figure stands in the division', () => {
  it('is the share below it, with half of its equals', () => {
    expect(percentile([1, 2, 3, 4], 4)).toBe(88)
    expect(percentile([1, 2, 3, 4], 1)).toBe(13)
    expect(percentile([2, 2, 2, 2], 2)).toBe(50)
  })

  it('compares with the active fighters of the same division only', () => {
    const others = [fighter('Retired', { ufc_status: 'former', takedown_avg_per_15min: 99 }), fighter('Heavy', { division: 'Heavyweight', takedown_avg_per_15min: 99 })]
    const pools = stylePools([...division, ...others])
    expect(pools.get('Lightweight')?.get('takedowns')).toHaveLength(20)
    expect(styleOf(division[19], pools).takedowns).toEqual({ value: 20, percentile: 98 })
  })

  it('leaves out what nobody measured instead of reading it as zero', () => {
    const blank = fighter('Debutant', { sig_strikes_landed_per_min: 0, sig_strikes_absorbed_per_min: 0, striking_defense: 0, takedown_avg_per_15min: 0 })
    const pools = stylePools([...division, blank])
    expect(pools.get('Lightweight')?.get('volume')).toHaveLength(20)
    for (const metric of STYLE_METRICS) expect(styleOf(blank, pools)[metric.key]).toEqual({ value: null, percentile: null })
    // No takedown landed: no accuracy to rank. No takedown at all is a real zero.
    const striker = styleOf(fighter('Striker', { takedown_avg_per_15min: 0, takedown_acc: 0 }), pools)
    expect(striker.takedownAccuracy.value).toBeNull()
    expect(striker.takedowns.value).toBe(0)
  })

  it('ranks nobody in a division with too few fighters to compare with', () => {
    const pools = stylePools(division.slice(0, MIN_POOL - 1))
    expect(styleOf(division[0], pools).takedowns).toEqual({ value: 1, percentile: null })
  })
})

describe('where the styles meet', () => {
  const pools = stylePools(division)
  const wrestler = fighter('Ana One', { takedown_avg_per_15min: 20, takedown_defense: 0.1 })

  it('names an attack that meets a weak defense, and one that meets a strong one', () => {
    expect(styleNotes(wrestler, fighter('Bia Two', { takedown_avg_per_15min: 1, takedown_defense: 0.02 }), pools, 'pt-BR')).toEqual([
      'Ana One derruba mais que 98% da divisão, e a defesa de quedas de Bia Two só supera 8%.',
    ])
    expect(styleNotes(wrestler, fighter('Bia Two', { takedown_avg_per_15min: 1, takedown_defense: 0.2 }), pools, 'en-US')).toEqual([
      'Ana One lands more takedowns than 98% of the division, but Bia Two’s takedown defense beats 98%.',
    ])
  })

  it('says nothing when there is no strong contrast, or when one side was not measured', () => {
    expect(styleNotes(fighter('A', { takedown_avg_per_15min: 10 }), fighter('B', { takedown_defense: 0.02 }), pools, 'en-US')).toEqual([])
    expect(styleNotes(wrestler, fighter('B', { takedown_avg_per_15min: 1, takedown_defense: 0 }), pools, 'en-US')).toEqual([])
  })

  it('has every sentence and label in the four languages', () => {
    const weak = fighter('Bia Two', { takedown_avg_per_15min: 1, takedown_defense: 0.02 })
    expect(new Set(LANGUAGES.map((lang) => styleNotes(wrestler, weak, pools, lang)[0])).size).toBe(4)
    for (const key of STYLE_TRAITS) expect(new Set(LANGUAGES.map((lang) => traitLabel(key, lang))).size, key).toBe(4)
  })
})
