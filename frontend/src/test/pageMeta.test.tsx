import { render } from '@testing-library/react'
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
  it('sets the title, description, canonical address and share tags of a page', () => {
    renderAt('/predictor')

    expect(document.title).toBe('Predict a fight · Vektor MMA')
    expect(meta('meta[name="description"]')).toMatch(/win probability/)
    expect(canonical()).toBe('https://www.vektormma.com/predictor')
    expect(meta('meta[property="og:url"]')).toBe('https://www.vektormma.com/predictor')
    expect(meta('meta[name="twitter:url"]')).toBe('https://www.vektormma.com/predictor')
    expect(meta('meta[property="og:title"]')).toBe('Predict a fight · Vektor MMA')
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('follows the language on screen', async () => {
    await i18n.changeLanguage('pt-BR')
    renderAt('/head-to-head')

    expect(document.title).toBe('Confronto Direto · Vektor MMA')
    expect(meta('meta[property="og:locale"]')).toBe('pt_BR')
  })

  it('gives the site root its own title and the root address', () => {
    renderAt('/')

    expect(document.title).toBe('Vektor MMA — UFC fight stats and predictions')
    expect(canonical()).toBe('https://www.vektormma.com/')
  })

  it('points a page with a query string or a trailing slash to the clean address', () => {
    renderAt('/head-to-head/?a=Jon%20Jones&b=Tom%20Aspinall')

    expect(canonical()).toBe('https://www.vektormma.com/head-to-head')
  })

  it('titles an athlete page with the athlete, not "Page not found"', () => {
    renderAt('/athlete/Jon%20Jones')

    expect(document.title).toBe('Jon Jones · Vektor MMA')
    expect(meta('meta[name="description"]')).toMatch(/Jon Jones/)
    expect(canonical()).toBe('https://www.vektormma.com/athlete/Jon%20Jones')
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('survives an address that is not valid percent-encoding', () => {
    renderAt('/athlete/100%25%')

    expect(document.title).toMatch(/Vektor MMA$/)
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
    expect(canonical()).toBe('https://www.vektormma.com/rankings')
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
