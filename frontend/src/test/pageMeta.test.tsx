import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import i18n from '../i18n'
import { PageMeta } from '../shared/components/PageMeta'
import { ORG_LIST } from '../shared/data/orgs'
import pageMeta from '../shared/data/pageMeta.json'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PageMeta />
    </MemoryRouter>,
  )
}

const meta = (selector: string) => document.head.querySelector(selector)?.getAttribute('content')
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')

beforeEach(() => {
  document.head.innerHTML = ''
  document.title = ''
})

describe('PageMeta', () => {
  it('drops the structured data of the page the visitor left, and keeps the one of the page they are on', () => {
    const block = (url: string) => `<script type="application/ld+json" data-page-ld="${url}">{}</script>`
    document.head.innerHTML = block('https://www.vektormma.com/en/athlete/aaron-pico') + block('https://www.vektormma.com/en/predictor')
    renderAt('/predictor')

    const left = Array.from(document.head.querySelectorAll('script[data-page-ld]')).map((script) => script.getAttribute('data-page-ld'))
    expect(left).toEqual(['https://www.vektormma.com/en/predictor'])
  })

  it('sets the title, description, canonical address and share tags of a page', () => {
    renderAt('/predictor')

    expect(document.title).toBe('Predict a fight · Vektor MMA')
    expect(meta('meta[name="description"]')).toMatch(/win probability/)
    // The tests run in English: the address of an English page has the /en prefix.
    expect(canonical()).toBe('https://www.vektormma.com/en/predictor')
    expect(meta('meta[property="og:url"]')).toBe('https://www.vektormma.com/en/predictor')
    expect(meta('meta[name="twitter:url"]')).toBe('https://www.vektormma.com/en/predictor')
    expect(meta('meta[property="og:image"]')).toBe('https://www.vektormma.com/og-image.jpg?v=6')
    expect(meta('meta[property="og:title"]')).toBe('Predict a fight · Vektor MMA')
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('follows the language on screen', async () => {
    await i18n.changeLanguage('pt-BR')
    renderAt('/head-to-head')

    expect(document.title).toBe('Confronto direto · Vektor MMA')
    expect(meta('meta[property="og:locale"]')).toBe('pt_BR')
    // Portuguese is the language of the bare address.
    expect(canonical()).toBe('https://www.vektormma.com/head-to-head')
  })

  it('gives the site root its own title and the root address', () => {
    renderAt('/')

    expect(document.title).toBe('Vektor MMA — MMA stats and predictions')
    expect(canonical()).toBe('https://www.vektormma.com/en')
  })

  it('points a page with a query string or a trailing slash to the clean address', () => {
    renderAt('/head-to-head/?a=Jon%20Jones&b=Tom%20Aspinall')

    expect(canonical()).toBe('https://www.vektormma.com/en/head-to-head')
  })

  it('names every language of a page for search engines, with the Portuguese one as the default', () => {
    renderAt('/rankings')

    const alternates = Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')])
    expect(alternates).toEqual([
      ['pt-BR', 'https://www.vektormma.com/rankings'],
      ['en', 'https://www.vektormma.com/en/rankings'],
      ['fr', 'https://www.vektormma.com/fr/rankings'],
      ['es-419', 'https://www.vektormma.com/es/rankings'],
      ['x-default', 'https://www.vektormma.com/rankings'],
    ])
  })

  it('titles an athlete page with the athlete, not "Page not found"', async () => {
    renderAt('/athlete/Jon%20Jones')

    // The athlete data is a separate chunk: the tags are written once it has loaded.
    await waitFor(() => expect(document.title).toBe('Jon Jones · Vektor MMA'))
    expect(meta('meta[name="description"]')).toMatch(/Jon Jones/)
    // One address per athlete: the slug, whatever form the visitor typed.
    expect(canonical()).toBe('https://www.vektormma.com/en/athlete/jon-jones')
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('gives an athlete of the static data a share image of their own', async () => {
    renderAt('/athlete/aaron-pico')

    await waitFor(() => expect(meta('meta[property="og:image"]')).toBe('https://www.vektormma.com/og/athletes/aaron-pico.jpg'))
    expect(meta('meta[name="twitter:image"]')).toBe('https://www.vektormma.com/og/athletes/aaron-pico.jpg')
  })

  it('survives an address that is not valid percent-encoding', async () => {
    renderAt('/athlete/100%25%')

    await waitFor(() => expect(document.title).toMatch(/Vektor MMA$/))
    expect(document.title).not.toMatch(/not found/i)
  })

  it('asks search engines to skip a page the app does not have', () => {
    renderAt('/not-a-page')

    expect(document.title).toBe('Page not found · Vektor MMA')
    expect(meta('meta[name="robots"]')).toBe('noindex')
    expect(canonical()).toBeUndefined()
  })

  it('drops the noindex and sets the canonical address again on the next real page', () => {
    document.head.innerHTML = '<meta name="robots" content="noindex">'
    renderAt('/rankings')

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
    expect(canonical()).toBe('https://www.vektormma.com/en/rankings')
  })
})

describe('page metadata table', () => {
  const languages = Object.keys(pageMeta.pages) as (keyof typeof pageMeta.pages)[]

  it('has the same pages in every language', () => {
    const reference = Object.keys(pageMeta.pages.pt).sort()
    for (const language of languages) {
      expect(Object.keys(pageMeta.pages[language]).sort(), language).toEqual(reference)
    }
  })

  it('has an entry for every page an organization has', () => {
    // The UFC keeps the site root: its home is /home, the others are /<org>.
    const expected: string[] = []
    for (const org of ORG_LIST) {
      const base = org.basePath
      expected.push(base || '/home', `${base}/fighters`, `${base}/events`, `${base}/gyms`)
      if (org.hasRankings) expected.push(`${base}/rankings`)
      if (org.hasChampions) expected.push(`${base}/champions`)
      if (org.hasPredictions) expected.push(`${base}/predictor`)
    }
    const missing = expected.filter((path) => !(path in pageMeta.pages.pt))
    expect(missing).toEqual([])
  })

  it('keeps every title short enough for a result page and every description non-empty', () => {
    for (const language of languages) {
      for (const [path, page] of Object.entries(pageMeta.pages[language])) {
        expect(page.title.length, `${language} ${path} title`).toBeGreaterThan(0)
        expect(page.title.length, `${language} ${path} title`).toBeLessThanOrEqual(60)
        expect(page.description.length, `${language} ${path} description`).toBeGreaterThan(20)
      }
    }
  })
})
