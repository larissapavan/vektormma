import { describe, expect, it } from 'vitest'

import { absoluteUrl, pageTitle, routeHtml, sitemapXml } from '../seo/htmlMeta'

const site = { name: 'Vektor MMA', url: 'https://www.vektormma.com' }

const template = `<!doctype html>
<html lang="pt-BR">
  <head>
    <link rel="canonical" href="https://www.vektormma.com/" />
    <title>Vektor MMA</title>
    <meta name="description" content="Home description." />
    <meta property="og:url" content="https://www.vektormma.com/" />
    <meta property="og:title" content="Home title" />
    <meta property="og:description" content="Home description." />
    <meta name="twitter:url" content="https://www.vektormma.com/" />
    <meta name="twitter:title" content="Home title" />
    <meta name="twitter:description" content="Home description." />
  </head>
  <body><div id="root"></div></body>
</html>`

describe('absoluteUrl', () => {
  it('has no trailing slash except at the root', () => {
    expect(absoluteUrl('https://www.vektormma.com/', '/')).toBe('https://www.vektormma.com/')
    expect(absoluteUrl('https://www.vektormma.com', '/pfl/events/')).toBe('https://www.vektormma.com/pfl/events')
    expect(absoluteUrl('https://www.vektormma.com', 'model')).toBe('https://www.vektormma.com/model')
  })
})

describe('routeHtml', () => {
  it('swaps the title, description, share tags and address of a route', () => {
    const html = routeHtml(template, site, '/predictor', { title: 'Simulador', description: 'Escolha dois "lutadores" & compare.' })

    expect(html).toContain('<title>Simulador · Vektor MMA</title>')
    expect(html).toContain('<meta name="description" content="Escolha dois &quot;lutadores&quot; &amp; compare." />')
    expect(html).toContain('<meta property="og:title" content="Simulador · Vektor MMA" />')
    expect(html).toContain('<meta name="twitter:title" content="Simulador · Vektor MMA" />')
    expect(html).toContain('<link rel="canonical" href="https://www.vektormma.com/predictor" />')
    expect(html).toContain('<meta property="og:url" content="https://www.vektormma.com/predictor" />')
    expect(html).toContain('<meta name="twitter:url" content="https://www.vektormma.com/predictor" />')
    expect(html).not.toContain('Home title')
    expect(html).not.toContain('Home description')
  })

  it('keeps the template text when no meta is given and only sets the address', () => {
    const html = routeHtml(template, site, '/', null)

    expect(html).toBe(template)
  })

  it('does not read $ in a description as a replacement pattern', () => {
    const html = routeHtml(template, site, '/model', { title: 'Model', description: 'Costs $1 and $& more.' })

    expect(html).toContain('content="Costs $1 and $&amp; more."')
  })

  it('stops the build when a tag it has to set is missing', () => {
    const broken = template.replace('<meta property="og:url" content="https://www.vektormma.com/" />', '')

    expect(() => routeHtml(broken, site, '/model', { title: 'Model', description: 'Text.' })).toThrow(/og:url/)
  })
})

describe('pageTitle and sitemapXml', () => {
  it('joins page and site', () => {
    expect(pageTitle('Vektor MMA', 'Rankings')).toBe('Rankings · Vektor MMA')
  })

  it('lists every path once, on the real domain', () => {
    const xml = sitemapXml('https://www.vektormma.com', ['/', '/rankings', '/pfl/events'])

    expect(xml).toContain('<loc>https://www.vektormma.com/</loc>')
    expect(xml).toContain('<loc>https://www.vektormma.com/rankings</loc>')
    expect(xml).toContain('<loc>https://www.vektormma.com/pfl/events</loc>')
    expect(xml.match(/<url>/g)).toHaveLength(3)
    expect(xml).not.toContain('fight-intelligence')
  })
})
