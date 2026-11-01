import { describe, expect, it } from 'vitest'

import { localeTag, uiLang } from '../i18n/lang'
import { resources } from '../i18n'
import { getDivisionName } from '../shared/data/divisions'
import { localizeCountryName, translateFightMethod, translateHometown } from '../shared/data/fightLabels'

type Tree = { [key: string]: string | Tree }

function keysOf(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : keysOf(value, `${prefix}${key}.`)))
}

describe('locale files', () => {
  const english = keysOf(resources['en-US'].translation as Tree).sort()

  it.each(['pt-BR', 'fr-FR', 'es-419'] as const)('%s has exactly the keys English has', (locale) => {
    expect(keysOf(resources[locale].translation as Tree).sort()).toEqual(english)
  })

  it('keeps the same {{placeholders}} in every language', () => {
    const placeholders = (text: string) => (text.match(/\{\{\w+\}\}/g) ?? []).sort().join(',')
    const flat = (tree: Tree, prefix = ''): Record<string, string> =>
      Object.fromEntries(Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [[prefix + key, value]] : Object.entries(flat(value, `${prefix}${key}.`)))))
    const en = flat(resources['en-US'].translation as Tree)
    for (const locale of ['pt-BR', 'fr-FR', 'es-419'] as const) {
      const other = flat(resources[locale].translation as Tree)
      for (const key of Object.keys(en)) expect(placeholders(other[key]), `${locale} ${key}`).toBe(placeholders(en[key]))
    }
  })
})

describe('language helpers', () => {
  it('maps every supported language to its tag', () => {
    expect(localeTag('pt-BR')).toBe('pt-BR')
    expect(localeTag('en-US')).toBe('en-US')
    expect(localeTag('fr-FR')).toBe('fr-FR')
    expect(localeTag('es-419')).toBe('es-419')
    expect(uiLang('es-MX')).toBe('es')
    expect(uiLang('de-DE')).toBe('en')
  })

  it('names divisions, methods and countries in each language', () => {
    expect(getDivisionName('Welterweight', 'es-419')).toBe('Peso Wélter')
    expect(getDivisionName('Welterweight', 'fr-FR')).toBe('Poids mi-moyen')
    expect(getDivisionName('Welterweight', 'pt-BR')).toBe('Peso Meio-Médio')
    expect(translateFightMethod('Submission (rear-naked choke)', 'es-419')).toBe('Sumisión (mataleón)')
    expect(localizeCountryName('Brazil', 'es-419')).toBe('Brasil')
    expect(localizeCountryName('United States', 'fr-FR')).toBe('États-Unis')
    expect(localizeCountryName('England', 'pt-BR')).toBe('Inglaterra')
    expect(translateHometown('Las Vegas, Nevada, United States', 'es-419')).toBe('Las Vegas, Nevada, Estados Unidos')
    expect(translateHometown('Rio de Janeiro, Brazil', 'en-US')).toBe('Rio de Janeiro, Brazil')
  })
})
