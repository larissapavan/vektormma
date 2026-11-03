import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import App from '../App'
import { CONTACT_EMAIL, INFO_PATHS, infoPage, type InfoPageId } from '../shared/data/legal'
import { isInfoOnlyPath, isStaticPath } from '../shared/data/staticPages'
import pageMeta from '../shared/data/pageMeta.json'

const IDS = Object.keys(INFO_PATHS) as InfoPageId[]
const LANGS = ['pt', 'en', 'fr', 'es'] as const

describe('privacy, terms, contact and guide', () => {
  it.each(IDS)('%s has the same shape in the four languages', (id) => {
    const shape = (lang: (typeof LANGS)[number]) =>
      infoPage(id, lang).sections.map((section) => [section.paragraphs?.length ?? 0, section.bullets?.length ?? 0, section.links?.length ?? 0])
    for (const lang of LANGS) expect(shape(lang), `${id} ${lang}`).toEqual(shape('pt'))
  })

  it.each(IDS)('%s is written out in every language, not copied from another', (id) => {
    const texts = LANGS.map((lang) => JSON.stringify(infoPage(id, lang).sections.map((s) => [s.heading, s.paragraphs, s.bullets])))
    expect(new Set(texts).size).toBe(4)
    for (const lang of LANGS) {
      const page = infoPage(id, lang)
      expect(page.title.length).toBeGreaterThan(3)
      expect(page.intro.length).toBeGreaterThan(40)
      expect(page.sections.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('names Google AdSense, cookies and the opt-out links in the privacy policy, in every language', () => {
    for (const lang of LANGS) {
      const page = infoPage('privacy', lang)
      const text = JSON.stringify(page)
      expect(text).toMatch(/AdSense/)
      expect(text).toMatch(/cookies/i)
      expect(text).toMatch(/Vercel Web Analytics/)
      expect(page.sections.flatMap((s) => s.links ?? []).some((link) => link.href.includes('adssettings.google.com'))).toBe(true)
    }
  })

  it('lists the email first on the contact page only when one is set', () => {
    const channels = (email?: string) => infoPage('contact', 'pt', email).sections.flatMap((section) => section.links ?? [])
    expect(channels().some((link) => link.href.startsWith('mailto:'))).toBe(false)
    expect(channels('oi@example.com')[0]).toEqual({ label: 'E-mail: oi@example.com', href: 'mailto:oi@example.com' })
    expect(channels('oi@example.com').length).toBe(channels().length + 1)
  })

  it('publishes the site address on the contact page in every language', () => {
    expect(CONTACT_EMAIL).toBe('vektormma@gmail.com')
    for (const lang of LANGS) {
      expect(infoPage('contact', lang, CONTACT_EMAIL).sections.flatMap((s) => s.links ?? [])[0].href).toBe('mailto:vektormma@gmail.com')
    }
  })

  it('has a title and a description in every language for the search results', () => {
    for (const lang of LANGS) {
      for (const id of IDS) {
        const entry = (pageMeta.pages as Record<string, Record<string, { title: string; description: string }>>)[lang][INFO_PATHS[id]]
        expect(entry?.title, `${lang} ${id}`).toBeTruthy()
        expect(entry.description.length).toBeGreaterThan(40)
        expect(entry.description.length).toBeLessThanOrEqual(200)
      }
    }
  })

  it('opens without waiting for the API', () => {
    for (const path of ['/about', '/privacy', '/terms', '/contact', '/guide', '/privacy/']) expect(isStaticPath(path)).toBe(true)
    expect(isStaticPath('/fighters')).toBe(false)
    expect(isInfoOnlyPath('/guide')).toBe(true)
    expect(isInfoOnlyPath('/about')).toBe(false)
  })
})

describe('the pages on screen', () => {
  it.each(IDS)('%s shows one h1 and its sections at once', async (id) => {
    render(
      <MemoryRouter initialEntries={[INFO_PATHS[id]]}>
        <App />
      </MemoryRouter>,
    )
    // no wait for the API: the heading is there as soon as the page's own code has loaded
    expect(await screen.findByRole('heading', { level: 1, name: infoPage(id, 'en').title })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(3)
  })

  it('has the links to them at the foot of a page', async () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { level: 1 })
    const footer = screen.getByRole('navigation', { name: /site information/i })
    for (const href of ['/about', '/guide', '/contact', '/privacy', '/terms']) {
      expect(footer.querySelector(`a[href="${href}"]`), href).not.toBeNull()
    }
  })
})

describe('the About page', () => {
  it('explains where the name Vektor comes from', async () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { level: 2, name: 'Why Vektor?' })).toBeInTheDocument()
    expect(screen.getByText(/The name comes from vector, the mathematics and data science term for a list of numbers/)).toBeInTheDocument()
    expect(screen.getByText(/The arrow in the logo, inside the octagon, is a vector too/)).toBeInTheDocument()
  })
})
