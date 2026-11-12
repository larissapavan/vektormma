import { describe, expect, it } from 'vitest'

import { UI_LANGS, localeTag } from '../i18n/lang'
import en from '../i18n/locales/en-US.json'
import es from '../i18n/locales/es-419.json'
import fr from '../i18n/locales/fr-FR.json'
import pt from '../i18n/locales/pt-BR.json'
import type { SeoData } from '../seo/athletes'
import seo from '../seo/athletes.json'
import { bodyHtml } from '../seo/htmlMeta'
import { aboutBody, dataBody, listPageBody, modelBody, type PagesData } from '../seo/pages'
import pagesJson from '../seo/pages.json'
import { GENERIC_ORGS } from '../shared/data/orgs'
import pageMeta from '../shared/data/pageMeta.json'

const data = pagesJson as PagesData
const context = { athleteSlugs: new Set((seo as SeoData).athletes.map((athlete) => athlete.slug)), fights: (seo as SeoData).fights }
const text = { title: 'T', description: 'D.' }
const locales = { 'pt-BR': pt, 'en-US': en, 'fr-FR': fr, 'es-419': es }

function words(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
}

describe('static text of the list pages', () => {
  it('has the data of every organization that has pages', () => {
    for (const org of GENERIC_ORGS) expect(data.orgs[org.id], org.id).toBeDefined()
  })

  it('writes real content, in each language, for the pages that list data', () => {
    const paths = ['/home', '/events', '/results', '/rankings', '/champions', '/track-record', '/gyms', '/record-book', '/pfl', '/pfl/fighters', '/one/events', '/one/rankings']
    for (const lang of UI_LANGS) {
      for (const path of paths) {
        const page = listPageBody(lang, path, text, data, context)
        expect(page, `${lang} ${path}`).not.toBeNull()
        const html = bodyHtml(page!, [])
        expect(words(html), `${lang} ${path}`).toBeGreaterThan(80)
        expect(html, `${lang} ${path}`).not.toMatch(/undefined|\bnull\b|NaN/)
      }
    }
  })

  it('gives every page of the site either its own text or nothing, never an empty section', () => {
    for (const path of Object.keys(pageMeta.pages.pt)) {
      const page = listPageBody('pt', path, text, data, context)
      for (const section of page?.sections ?? []) expect((section.bullets?.length ?? 0) + (section.paragraphs?.length ?? 0), `${path} ${section.heading}`).toBeGreaterThan(0)
    }
    expect(listPageBody('pt', '/career', text, data, context)!.sections![0].bullets!.length).toBeGreaterThan(5)
  })

  it('names the divisions and the result of a fight in the language of the page', () => {
    const rankings = bodyHtml(listPageBody('pt', '/rankings', text, data, context)!, [])
    expect(rankings).toContain('<h2>Peso por Peso Masculino</h2>')
    expect(rankings).toContain('href="/athlete/')
    expect(bodyHtml(listPageBody('en', '/results', text, data, context)!, [])).toContain(' def. ')
    expect(bodyHtml(listPageBody('fr', '/results', text, data, context)!, [])).toContain(' bat ')
    expect(bodyHtml(listPageBody('es', '/rankings', text, data, context)!, [])).toContain('href="/es/athlete/')
  })

  it('writes the Data and Model pages with their steps, sources and numbers, in each language', () => {
    for (const lang of UI_LANGS) {
      const locale = locales[localeTag(lang)] as unknown as Record<string, Record<string, string>>
      const dataHtml = bodyHtml(dataBody(lang, locale.dataIntelligence, data), [])
      expect(dataHtml).toContain(`<h1>${locale.dataIntelligence.title}</h1>`)
      expect(dataHtml).toContain('UFCStats.com')
      expect(words(dataHtml), `${lang} data`).toBeGreaterThan(300)
      const modelHtml = bodyHtml(modelBody(lang, locale.model, data.model), [])
      expect(modelHtml).toContain(data.model!.model_name)
      expect(words(modelHtml), `${lang} model`).toBeGreaterThan(150)
      for (const html of [dataHtml, modelHtml]) expect(html).not.toMatch(/undefined|\bnull\b|NaN/)
    }
    // The sentences the API sends in English are translated, never left as they came.
    expect(bodyHtml(modelBody('pt', (pt as unknown as Record<string, Record<string, string>>).model, data.model), [])).not.toContain('Measured once')
    expect(modelBody('pt', { title: 'T', description: 'D.' }, null).sections).toBeUndefined()
  })

  it('writes the About page from the translation file and the sources table', () => {
    for (const lang of UI_LANGS) {
      const about = locales[localeTag(lang)].about as Record<string, string>
      const html = bodyHtml(aboutBody(lang, about), [])
      expect(html).toContain(`<h1>${about.title}</h1>`)
      expect(html).toContain('UFCStats.com')
      expect(words(html), lang).toBeGreaterThan(300)
      expect(html).not.toMatch(/undefined/)
    }
  })
})
