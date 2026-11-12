import { describe, expect, it } from 'vitest'

import { UI_LANGS } from '../i18n/lang'
import { athleteBody, fightBody, homeBody, type AthleteDetails, type SeoData } from '../seo/athletes'
import type { PagesData } from '../seo/pages'
import pagesJson from '../seo/pages.json'
import details from '../seo/athleteDetails.json'
import seo from '../seo/athletes.json'
import { bodyHtml } from '../seo/htmlMeta'

const data = seo as SeoData
const byslug = details as AthleteDetails
const slugs = new Set(data.athletes.map((athlete) => athlete.slug))

describe('static athlete page with stats and fight history', () => {
  it('has the details of every athlete that has a page', () => {
    for (const athlete of data.athletes) expect(byslug[athlete.slug], athlete.slug).toBeDefined()
  })

  it('writes the career averages and one line per UFC fight, in each language', () => {
    const athlete = data.athletes.find((entry) => (byslug[entry.slug]?.history.length ?? 0) >= 5 && byslug[entry.slug].stats.strikesLanded != null)!
    const detail = byslug[athlete.slug]
    const headings = { pt: 'Histórico de lutas no UFC', en: 'UFC fight history', fr: 'Historique des combats à l’UFC', es: 'Historial de peleas en la UFC' }
    for (const lang of UI_LANGS) {
      const page = athleteBody(lang, athlete, data.fights, detail, slugs)
      const history = page.sections!.find((section) => section.heading === headings[lang])!
      expect(history.bullets).toHaveLength(detail.history.length)
      expect(history.bullets![0]).toContain(detail.history[0].opponent)
      expect(history.paragraphs![0]).toContain(athlete.name)
      const html = bodyHtml(page, [])
      expect(html).not.toMatch(/undefined|null|NaN/)
    }
    expect(bodyHtml(athleteBody('pt', athlete, data.fights, detail, slugs), [])).toContain('Golpes significativos acertados por minuto: ')
  })

  it('links only the opponents that have a page, inside the language', () => {
    const athlete = data.athletes.find((entry) => byslug[entry.slug]?.history.some((fight) => slugs.has(fight.opponent.toLowerCase().replace(/ /g, '-'))))!
    const page = athleteBody('en', athlete, data.fights, byslug[athlete.slug], slugs)
    const links = page.sections!.find((section) => section.heading === 'UFC fight history')!.links!
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(slugs.has(link.href.replace('/en/athlete/', '')), link.href).toBe(true)
  })

  it('stays as before when the build passes no details', () => {
    const page = athleteBody('pt', data.athletes[0], data.fights)
    expect(page.sections!.some((section) => section.heading === 'Histórico de lutas no UFC')).toBe(false)
  })
})

describe('static fight page with the analysis', () => {
  const pages = pagesJson as PagesData
  const fight = data.fights.find((entry) => byslug[entry.a.slug]?.history.length && byslug[entry.b.slug]?.history.length && pages.fights?.[entry.slug]?.factors.length)

  it('has the factors of every announced fight', () => {
    for (const entry of data.fights) expect(pages.fights?.[entry.slug], entry.slug).toBeDefined()
  })

  it('sets the fighters side by side, names what weighs on the pick and lists recent fights, in each language', () => {
    if (!fight) return
    const extra = { a: byslug[fight.a.slug], b: byslug[fight.b.slug], ...pages.fights![fight.slug] }
    for (const lang of UI_LANGS) {
      const page = fightBody(lang, fight, extra)
      const html = bodyHtml(page, [])
      expect(page.sections!.length, lang).toBeGreaterThanOrEqual(5)
      expect(html).toContain(` · ${fight.b.name} `)
      expect(html).not.toMatch(/undefined|\bnull\b|NaN/)
      expect(html.replace(/<[^>]+>/g, ' ').split(/\s+/).length, lang).toBeGreaterThan(250)
    }
    const pt = bodyHtml(fightBody('pt', fight, extra), [])
    expect(pt).toContain('O que mais pesa nesta previsão')
    expect(pt).toMatch(/a favor de /)
    // A feature name the tables do not know would be left in English on a Portuguese page.
    expect(pt).not.toMatch(/ (difference|gap|Diff)[:<]/)
  })

  it('stays as before when the build passes no details', () => {
    expect(fightBody('pt', data.fights[0]).sections).toHaveLength(2)
  })
})

describe('static home page', () => {
  it('lists the next announced fights with a link to each', () => {
    const page = homeBody('pt', 'Vektor MMA', 'D.', data.fights)
    if (!data.fights.length) return expect(page.sections).toBeUndefined()
    const section = page.sections![0]
    expect(section.links![0].href).toBe(`/fight/${data.fights[0].slug}`)
    expect(section.bullets![0]).toContain(data.fights[0].a.name)
    expect(section.links!.length).toBeLessThanOrEqual(15)
  })
})
