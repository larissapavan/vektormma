import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const LANGUAGE_KEY = 'ufc-predictor:language'
const SITE = 'https://www.vektormma.com'

const seo = JSON.parse(readFileSync(new URL('../src/seo/athletes.json', import.meta.url), 'utf8')) as { athletes: Array<{ name: string; slug: string }> }
const athlete = seo.athletes[0]

// The ad network is not what is being tested, and its scripts make a run slow and flaky.
async function blockAds(page: Page) {
  await page.route(/googlesyndication|doubleclick|adtrafficquality|googleads/, (route) => route.abort())
}

test.describe('the HTML a crawler gets, before any script runs', () => {
  test('an English page says so, and names itself and its siblings', async ({ request }) => {
    const html = await (await request.get('/en/fighters')).text()
    expect(html).toContain('<html lang="en-US"')
    expect(html).toContain(`<link rel="canonical" href="${SITE}/en/fighters" />`)
    expect(html.match(/<link rel="alternate" hreflang=/g)).toHaveLength(5)
    expect(html).toContain('hreflang="x-default"')
  })

  test('an athlete page carries its structured data and its own text', async ({ request }) => {
    const html = await (await request.get(`/athlete/${athlete.slug}`)).text()
    const blocks = [...html.matchAll(/<script type="application\/ld\+json" data-page-ld="[^"]*">(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]) as { '@type': string; name?: string })
    expect(blocks.map((block) => block['@type']).sort()).toEqual(['BreadcrumbList', 'Person'])
    expect(blocks.find((block) => block['@type'] === 'Person')?.name).toBe(athlete.name)
    expect(html).toContain(`<h1>${athlete.name}</h1>`)
  })

  test('the sitemap lists every language of a page', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).toContain(`<loc>${SITE}/fr/athlete/${athlete.slug}</loc>`)
    expect(xml).toContain('hreflang="es-419"')
  })
})

test.describe('languages', () => {
  test('switching language changes the address, and the back button returns', async ({ page }) => {
    await blockAds(page)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')

    await page.getByRole('button', { name: /idioma|language/i }).first().click()
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/?$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/en`)

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  })

  test('a visitor who chose French is sent to the French address, keeping the query and the hash', async ({ page }) => {
    await blockAds(page)
    await page.addInitScript(`window.localStorage.setItem('${LANGUAGE_KEY}', 'fr-FR')`)
    await page.goto('/fighters?q=pereira#top')
    await expect(page).toHaveURL(/\/fr\/fighters\?q=pereira#top$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR')
  })
})

test('an address that is not a page tells search engines not to index it', async ({ page }) => {
  await blockAds(page)
  await page.goto('/this-page-does-not-exist')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
})

test.describe('accessibility (axe, WCAG 2.0 A and AA)', () => {
  for (const [name, path] of [
    ['the Portuguese home page', '/'],
    ['the English home page', '/en'],
  ] as const) {
    test(name, async ({ page }) => {
      await blockAds(page)
      await page.goto(path)
      await expect(page.locator('h1').first()).toBeVisible()
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      const serious = violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      expect(serious.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`)).toEqual([])
    })
  }
})
