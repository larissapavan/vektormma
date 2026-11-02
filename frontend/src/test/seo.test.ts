import { describe, expect, it } from 'vitest'

import { langPath, splitLangPath } from '../i18n/lang'
import { athleteBody, athleteSlug, athleteText, fightBody, fightText, fightersListBody, splitFightSlug, type SeoData } from '../seo/athletes'
import seo from '../seo/athletes.json'
import { bodyHtml, hreflangLinks, routeHtml, sitemapXml } from '../seo/htmlMeta'
import pageMeta from '../shared/data/pageMeta.json'
import indexHtml from '../../index.html?raw'

// The share images drawn by scripts/build_og_images.py: only the file names matter here.
const images = new Set(Object.keys(import.meta.glob('../../public/og/**/*.jpg', { query: '?url', import: 'default' })))

const data = seo as SeoData
const site = { name: 'Vektor MMA', url: 'https://www.vektormma.com' }

const template = `<!doctype html>
<html lang="pt-BR">
  <head>
    <link rel="canonical" href="https://www.vektormma.com/" />
    <title>Vektor MMA</title>
    <meta name="description" content="Home." />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:url" content="https://www.vektormma.com/" />
    <meta property="og:title" content="Home" />
    <meta property="og:description" content="Home." />
    <meta property="og:image" content="https://www.vektormma.com/og-image.jpg?v=5" />
    <meta name="twitter:url" content="https://www.vektormma.com/" />
    <meta name="twitter:title" content="Home" />
    <meta name="twitter:description" content="Home." />
    <meta name="twitter:image" content="https://www.vektormma.com/og-image.jpg?v=5" />
    <script type="application/ld+json">{ "inLanguage": "pt-BR", "description": "Home." }</script>
  </head>
  <body><div id="root"></div></body>
</html>`

describe('the address of an athlete', () => {
  it('is the name written as a slug, accents and dots included', () => {
    expect(athleteSlug('Jon Jones')).toBe('jon-jones')
    expect(athleteSlug('Jan Błachowicz')).toBe('jan-blachowicz')
    expect(athleteSlug('B.J. Penn')).toBe('bj-penn')
    expect(athleteSlug('Jean Silva')).toBe(athleteSlug('jean-silva'))
  })

  it('is the one scripts/build_seo_athletes.py wrote for every athlete and fight', () => {
    for (const athlete of data.athletes) expect(athleteSlug(athlete.name), athlete.name).toBe(athlete.slug)
    for (const fight of data.fights) expect(fight.slug).toBe(`${athleteSlug(fight.a.name)}-vs-${athleteSlug(fight.b.name)}`)
  })

  it('has a share image for every athlete and every fight', () => {
    const exists = (path: string) => images.has(`../../public/${path}`)
    for (const athlete of data.athletes) expect(exists(`og/athletes/${athlete.slug}.jpg`), athlete.slug).toBe(true)
    for (const fight of data.fights) expect(exists(`og/fights/${fight.slug}.jpg`), fight.slug).toBe(true)
  })

  it('splits a fight address into its two slugs', () => {
    expect(splitFightSlug('jon-jones-vs-tom-aspinall')).toEqual(['jon-jones', 'tom-aspinall'])
    expect(splitFightSlug('jon-jones')).toBeNull()
  })
})

describe('the text of the athlete and fight pages', () => {
  const athlete = data.athletes.find((entry) => entry.slug === 'aaron-pico')!
  const fight = data.fights[0]

  it('is written in every language with the terms of the community', () => {
    expect(athleteText('pt-BR', athlete).description).toMatch(/cartel 15-5-0, Peso Pena do UFC/)
    expect(athleteText('en-US', athlete).description).toMatch(/15-5-0 record, UFC Featherweight/)
    expect(athleteText('fr-FR', athlete).description).toMatch(/palmarès 15-5-0, Poids plume de l’UFC/)
    expect(athleteText('es-419', athlete).description).toMatch(/récord 15-5-0, Peso Pluma de la UFC/)
    expect(athleteText('en-US', athlete).title).toBe('Aaron Pico')
  })

  it('names the place on the card, the event, the day and the model pick of a fight', () => {
    const text = fightText('pt-BR', fight)
    expect(text.title).toBe(`${fight.a.name} vs. ${fight.b.name}`)
    expect(text.description).toContain('Main event')
    expect(text.description).toContain(fight.event)
    expect(text.description).toMatch(/O modelo favorece .+ \(\d+%\)/)
    expect(fightText('es-419', fight).description).toContain('Pelea estelar')
    expect(fightText('fr-FR', fight).description).toMatch(/Le modèle favorise/)
  })

  it('keeps every link inside the language of the page', () => {
    const html = bodyHtml(fightBody('fr', fight), [])
    expect(html).toContain(`href="/fr/athlete/${fight.a.slug}"`)
    expect(html).toContain('href="/fr/matchup-intelligence?')
    expect(bodyHtml(athleteBody('en', athlete, data.fights), [])).toContain('href="/en/fighters"')
    expect(bodyHtml(athleteBody('pt', athlete, data.fights), [])).toContain('href="/fighters"')
  })

  it('lists a link to every active athlete on the fighters page, by division', () => {
    const html = bodyHtml(fightersListBody('pt', { title: 'Lutadores', description: 'D.' }, data.athletes), [])
    for (const entry of data.athletes.filter((a) => a.division)) expect(html, entry.slug).toContain(`href="/athlete/${entry.slug}"`)
    expect(html).toContain('<h2>Peso Pena</h2>')
  })
})

describe('the address prefix of each language', () => {
  it('has none for Portuguese and one for each of the others', () => {
    expect(langPath('pt', '/guide')).toBe('/guide')
    expect(langPath('en', '/guide')).toBe('/en/guide')
    expect(langPath('fr', '/')).toBe('/fr')
    expect(langPath('es', '/pfl/events')).toBe('/es/pfl/events')
  })

  it('is read back from an address, and only at a path boundary', () => {
    expect(splitLangPath('/fr/guide')).toEqual({ lang: 'fr', path: '/guide' })
    expect(splitLangPath('/es')).toEqual({ lang: 'es', path: '/' })
    expect(splitLangPath('/guide')).toEqual({ lang: null, path: '/guide' })
    expect(splitLangPath('/endpoint')).toEqual({ lang: null, path: '/endpoint' })
  })
})

describe('a page written in a language', () => {
  const html = routeHtml(template, site, '/athlete/aaron-pico', { title: 'Aaron Pico', description: 'D.' }, undefined, {
    lang: 'fr',
    image: '/og/athletes/aaron-pico.jpg',
    siteDescription: 'Site "FR".',
  })

  it('sets the language, the locale, the address with its prefix and the share image', () => {
    expect(html).toContain('<html lang="fr-FR">')
    expect(html).toContain('<meta property="og:locale" content="fr_FR" />')
    expect(html).toContain('<link rel="canonical" href="https://www.vektormma.com/fr/athlete/aaron-pico" />')
    expect(html).toContain('<meta property="og:url" content="https://www.vektormma.com/fr/athlete/aaron-pico" />')
    expect(html).toContain('<meta property="og:image" content="https://www.vektormma.com/og/athletes/aaron-pico.jpg" />')
    expect(html).toContain('<meta name="twitter:image" content="https://www.vektormma.com/og/athletes/aaron-pico.jpg" />')
    expect(html).toContain('"inLanguage": "fr-FR"')
    expect(html).toContain('"description": "Site \\"FR\\"."')
  })

  it('names the same page in every language, with the Portuguese address as the default', () => {
    expect(html).toContain('<link rel="alternate" hreflang="pt-BR" href="https://www.vektormma.com/athlete/aaron-pico" />')
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://www.vektormma.com/en/athlete/aaron-pico" />')
    expect(html).toContain('<link rel="alternate" hreflang="es-419" href="https://www.vektormma.com/es/athlete/aaron-pico" />')
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://www.vektormma.com/athlete/aaron-pico" />')
    expect(hreflangLinks(site.url, '/')).toContain('hreflang="fr" href="https://www.vektormma.com/fr"')
  })

  it('keeps the share image of the site when the page has none, and uses a title as it is for the home page', () => {
    const home = routeHtml(template, site, '/', { title: 'Vektor MMA — UFC stats', description: 'D.' }, undefined, { lang: 'en', rawTitle: true })
    expect(home).toContain('<title>Vektor MMA — UFC stats</title>')
    expect(home).toContain('<link rel="canonical" href="https://www.vektormma.com/en" />')
    expect(home).toContain('og-image.jpg?v=5')
  })
})

describe('the sitemap with languages', () => {
  it('lists each page once per language and names its siblings', () => {
    const xml = sitemapXml(site.url, ['/', '/fighters'], ['pt', 'en', 'fr', 'es'])
    expect(xml.match(/<url>/g)).toHaveLength(8)
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    expect(xml).toContain('<loc>https://www.vektormma.com/es/fighters</loc>')
    expect(xml.match(/hreflang="x-default" href="https:\/\/www.vektormma.com\/fighters"/g)).toHaveLength(4)
  })
})

describe('index.html and the page table', () => {
  const index = indexHtml

  it('agree on the home title and the share image', () => {
    expect(index).toContain(`<title>${pageMeta.homeTitle.pt}</title>`)
    expect(index).toContain(`content="${pageMeta.site.url}${pageMeta.site.image}"`)
  })

  it('has a title and a description for every page in every language', () => {
    const paths = Object.keys(pageMeta.pages.pt)
    for (const lang of ['en', 'fr', 'es'] as const) expect(Object.keys(pageMeta.pages[lang]).sort()).toEqual(paths.slice().sort())
  })
})
