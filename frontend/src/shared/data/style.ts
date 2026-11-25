/**
 * How a fighter fights, next to the active fighters of the same division. Every number is a career figure the site already
 * shows; what is added is where it stands: "above 82% of the division". No React here.
 *
 * A figure nobody measured is null, never 0: a fighter without statistics would otherwise look like the worst of the division.
 */

import { L, formatDecimal, formatShare } from '../../i18n/lang'
import type { FighterProfile } from '../types/api'

export type StyleKey = 'volume' | 'accuracy' | 'defense' | 'takedowns' | 'takedownAccuracy' | 'takedownDefense' | 'submissions'

type Metric = {
  key: StyleKey
  label: (lang: string) => string
  value: (fighter: FighterProfile) => number | null
  format: (value: number, lang: string) => string
}

/** The figures are there at all: with no strike landed or absorbed, nothing was measured. */
function measured(fighter: FighterProfile): boolean {
  return Boolean(fighter.sig_strikes_landed_per_min || fighter.sig_strikes_absorbed_per_min)
}

const decimal = (value: number, lang: string) => formatDecimal(value, 1, lang)
const share = (value: number, lang: string) => formatShare(value, lang, 0)

export const STYLE_METRICS: Metric[] = [
  { key: 'volume', label: (l) => L(l, 'Golpes por minuto', 'Strikes per minute', 'Coups par minute', 'Golpes por minuto'), value: (f) => f.sig_strikes_landed_per_min, format: decimal },
  { key: 'accuracy', label: (l) => L(l, 'Precisão de golpes', 'Striking accuracy', 'Précision des coups', 'Precisión de golpes'), value: (f) => f.sig_str_acc || null, format: share },
  { key: 'defense', label: (l) => L(l, 'Defesa de golpes', 'Striking defense', 'Défense des coups', 'Defensa de golpes'), value: (f) => f.striking_defense || null, format: share },
  { key: 'takedowns', label: (l) => L(l, 'Quedas a cada 15 min', 'Takedowns per 15 min', 'Amenées au sol par 15 min', 'Derribos cada 15 min'), value: (f) => f.takedown_avg_per_15min, format: decimal },
  // With no takedown landed there is no accuracy to speak of, and a defense of 0% is nearly always one nobody tested.
  { key: 'takedownAccuracy', label: (l) => L(l, 'Precisão de quedas', 'Takedown accuracy', 'Précision des amenées', 'Precisión de derribos'), value: (f) => f.takedown_acc || null, format: share },
  { key: 'takedownDefense', label: (l) => L(l, 'Defesa de quedas', 'Takedown defense', 'Défense des amenées', 'Defensa de derribos'), value: (f) => f.takedown_defense || null, format: share },
  { key: 'submissions', label: (l) => L(l, 'Tentativas de finalização a cada 15 min', 'Submission attempts per 15 min', 'Tentatives de soumission par 15 min', 'Intentos de sumisión cada 15 min'), value: (f) => f.submission_avg_per_15min, format: decimal },
]

/** Fewer fighters than this and "above 82%" would mean a handful of people. */
export const MIN_POOL = 15

export type StylePools = Map<string, Map<StyleKey, number[]>>

/** division -> figure -> the sorted values of its active fighters. */
export function stylePools(fighters: FighterProfile[]): StylePools {
  const pools: StylePools = new Map()
  for (const fighter of fighters) {
    if (!fighter.division || fighter.ufc_status !== 'active' || !measured(fighter)) continue
    let pool = pools.get(fighter.division)
    if (!pool) {
      pool = new Map<StyleKey, number[]>(STYLE_METRICS.map((metric) => [metric.key, []]))
      pools.set(fighter.division, pool)
    }
    for (const metric of STYLE_METRICS) {
      const value = metric.value(fighter)
      if (value != null) pool.get(metric.key)?.push(value)
    }
  }
  for (const pool of pools.values()) for (const values of pool.values()) values.sort((a, b) => a - b)
  return pools
}

/** Where a value stands among sorted ones, 0 to 100: the share below it, with half of its equals. */
export function percentile(sorted: number[], value: number): number {
  let below = 0
  let equal = 0
  for (const other of sorted) {
    if (other < value) below += 1
    else if (other === value) equal += 1
    else break
  }
  return Math.round(((below + equal / 2) / sorted.length) * 100)
}

export type StyleRow = { value: number | null; percentile: number | null }

/** Each figure of a fighter and where it stands in the fighter's own division. */
export function styleOf(fighter: FighterProfile, pools: StylePools): Record<StyleKey, StyleRow> {
  const pool = fighter.division ? pools.get(fighter.division) : undefined
  const known = measured(fighter)
  return Object.fromEntries(
    STYLE_METRICS.map((metric) => {
      const value = known ? metric.value(fighter) : null
      const sorted = pool?.get(metric.key) ?? []
      return [metric.key, { value, percentile: value != null && sorted.length >= MIN_POOL ? percentile(sorted, value) : null }]
    }),
  ) as Record<StyleKey, StyleRow>
}

/** The figures a fighter can be filtered by: the top quarter of the division in one of them. */
export const STYLE_TRAITS: StyleKey[] = ['volume', 'defense', 'takedowns', 'takedownDefense', 'submissions']
export const TRAIT_MIN = 75

export function traitLabel(key: StyleKey, lang: string): string {
  switch (key) {
    case 'volume':
      return L(lang, 'Muito volume de golpes', 'High striking volume', 'Gros volume de coups', 'Mucho volumen de golpes')
    case 'defense':
      return L(lang, 'Boa defesa de golpes', 'Strong striking defense', 'Bonne défense des coups', 'Buena defensa de golpes')
    case 'takedowns':
      return L(lang, 'Muitas quedas', 'Many takedowns', 'Beaucoup d’amenées au sol', 'Muchos derribos')
    case 'takedownDefense':
      return L(lang, 'Boa defesa de quedas', 'Strong takedown defense', 'Bonne défense des amenées', 'Buena defensa de derribos')
    case 'submissions':
      return L(lang, 'Muitas tentativas de finalização', 'Many submission attempts', 'Beaucoup de tentatives de soumission', 'Muchos intentos de sumisión')
    default:
      return STYLE_METRICS.find((metric) => metric.key === key)?.label(lang) ?? key
  }
}

const HIGH = 70
const LOW = 35

/**
 * What stands out when one fighter's attack meets the other's defense. Only strong contrasts, and only where both were
 * measured. It reads the numbers; it is not the model's opinion.
 */
export function styleNotes(a: FighterProfile, b: FighterProfile, pools: StylePools, lang: string): string[] {
  const styleA = styleOf(a, pools)
  const styleB = styleOf(b, pools)
  const sides = [
    { attacker: a.name, defender: b.name, attack: styleA, guard: styleB },
    { attacker: b.name, defender: a.name, attack: styleB, guard: styleA },
  ]
  const notes: string[] = []
  for (const { attacker, defender, attack, guard } of sides) {
    const up = attack.takedowns.percentile
    const down = guard.takedownDefense.percentile
    if (up == null || down == null || up < HIGH) continue
    if (down <= LOW) {
      notes.push(L(lang, `${attacker} derruba mais que ${up}% da divisão, e a defesa de quedas de ${defender} só supera ${down}%.`, `${attacker} lands more takedowns than ${up}% of the division, and ${defender}’s takedown defense only beats ${down}%.`, `${attacker} réussit plus d’amenées au sol que ${up} % de la catégorie, et la défense de ${defender} n’en dépasse que ${down} %.`, `${attacker} derriba más que el ${up} % de la división, y la defensa de derribos de ${defender} solo supera al ${down} %.`))
    } else if (down >= HIGH) {
      notes.push(L(lang, `${attacker} derruba mais que ${up}% da divisão, mas a defesa de quedas de ${defender} supera ${down}%.`, `${attacker} lands more takedowns than ${up}% of the division, but ${defender}’s takedown defense beats ${down}%.`, `${attacker} réussit plus d’amenées au sol que ${up} % de la catégorie, mais la défense de ${defender} en dépasse ${down} %.`, `${attacker} derriba más que el ${up} % de la división, pero la defensa de derribos de ${defender} supera al ${down} %.`))
    }
  }
  for (const { attacker, defender, attack, guard } of sides) {
    const up = attack.volume.percentile
    const down = guard.defense.percentile
    if (up == null || down == null || up < HIGH) continue
    if (down <= LOW) {
      notes.push(L(lang, `${attacker} acerta mais golpes por minuto que ${up}% da divisão, e a defesa de golpes de ${defender} só supera ${down}%.`, `${attacker} lands more strikes per minute than ${up}% of the division, and ${defender}’s striking defense only beats ${down}%.`, `${attacker} porte plus de coups par minute que ${up} % de la catégorie, et la défense de ${defender} n’en dépasse que ${down} %.`, `${attacker} conecta más golpes por minuto que el ${up} % de la división, y la defensa de golpes de ${defender} solo supera al ${down} %.`))
    } else if (down >= HIGH) {
      notes.push(L(lang, `${attacker} acerta mais golpes por minuto que ${up}% da divisão, mas a defesa de golpes de ${defender} supera ${down}%.`, `${attacker} lands more strikes per minute than ${up}% of the division, but ${defender}’s striking defense beats ${down}%.`, `${attacker} porte plus de coups par minute que ${up} % de la catégorie, mais la défense de ${defender} en dépasse ${down} %.`, `${attacker} conecta más golpes por minuto que el ${up} % de la división, pero la defensa de golpes de ${defender} supera al ${down} %.`))
    }
  }
  return notes
}
