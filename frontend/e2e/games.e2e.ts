import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { respond } from '../src/test/fixtures'

/**
 * The two games in a real browser, in both themes: accessibility (axe) on every screen of a career challenge and on the
 * cancelled fights, and where the keyboard focus goes when a screen is replaced by the next one. The site has no API behind
 * the test server, so the API (at /api in a build) is answered with the same fake data the unit tests use.
 */
const THEME_KEY = 'ufc-predictor:theme-v2'
const challengeLink = (fights: number) => `/en/career?d=${Buffer.from(JSON.stringify({ s: 20261108, f: fights })).toString('base64url')}`

async function prepare(page: Page, theme: 'dark' | 'light') {
  // Without motion, nothing is half-drawn when axe reads the colors (a card that is still fading in is measured with its
  // transparency mixed into the colors, and a button that passes then fails). The screens read the same.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // The ad network is not what is being tested, and its scripts make a run slow and flaky.
  await page.route(/googlesyndication|doubleclick|adtrafficquality|googleads/, (route) => route.abort())
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [THEME_KEY, theme])
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    try {
      return route.fulfill({ json: respond(path) })
    } catch {
      return route.fulfill({ status: 404, json: { detail: 'not in the fake API' } })
    }
  })
}

/** What axe finds that matters (serious or critical), as readable lines; an empty list is a pass. */
async function violations(page: Page) {
  const { violations: found } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  return found.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical').map((violation) => `${violation.id}: ${violation.nodes.map((node) => `${node.target.join(' ')} (${node.any[0]?.message ?? violation.help})`).join(' | ')}`)
}

/** The element that has the keyboard focus. After a screen is replaced it must be something on the new screen, never the page body. */
const focused = (page: Page) => page.locator(':focus').evaluate((element) => ({ tag: element.tagName, text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 70) }))

for (const theme of ['dark', 'light'] as const) {
  test.describe(`accessibility in the ${theme} theme`, () => {
    test('the home page', async ({ page }) => {
      await prepare(page, theme)
      await page.goto('/en')
      await expect(page.locator('h1').first()).toBeVisible()
      expect(await violations(page)).toEqual([])
    })

    test('the first screen of the career game', async ({ page }) => {
      await prepare(page, theme)
      await page.goto('/en/career')
      await expect(page.getByRole('button', { name: /start the career/i })).toBeVisible()
      expect(await violations(page)).toEqual([])
    })

    test('the fights that never happened', async ({ page }) => {
      await prepare(page, theme)
      await page.goto('/en/cancelled-fights')
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
      expect(await violations(page)).toEqual([])
    })

    test('every screen of a challenge, with the focus on the new screen each time', async ({ page }) => {
      await prepare(page, theme)
      await page.goto(challengeLink(3))
      await page.getByLabel('Your name').fill('Ana Lima')
      expect(await violations(page), 'the challenge intro').toEqual([])
      await page.getByRole('button', { name: /start the challenge/i }).click()

      for (let fight = 1; fight <= 3; fight += 1) {
        await expect(page.getByRole('heading', { name: fight === 1 ? /camp for your ufc debut/i : new RegExp(`camp for ufc fight ${fight}`, 'i') })).toBeFocused()
        if (fight === 1) expect(await violations(page), 'the camp').toEqual([])

        await page.getByRole('button', { name: /^Coach /i }).first().click()
        await page.getByRole('button', { name: /^train with coach/i }).click()
        await expect(page.getByRole('heading', { name: /choose your next opponent/i })).toBeFocused()
        await page.getByRole('button', { name: /Easy Eddie/ }).click()
        if (fight === 1) expect(await violations(page), 'the matchmaking with an opponent chosen').toEqual([])

        await page.getByRole('button', { name: /fight easy eddie/i }).click()
        await expect(page.getByRole('heading', { name: /vs\. Easy Eddie/ })).toBeFocused()
        if (fight === 1) expect(await violations(page), 'the corner, before the first round').toEqual([])

        await page.getByRole('button', { name: /skip to the result/i }).click()
        await expect(page.getByTestId('fight-result')).toBeFocused()
        if (fight === 1) expect(await violations(page), 'the result of a fight').toEqual([])
        await page.getByRole('button', { name: fight === 3 ? /see the retrospect/i : /continue the career/i }).click()
      }

      await expect(page.getByRole('heading', { name: /the career is over/i })).toBeFocused()
      await expect(page.getByRole('button', { name: /save image/i })).toBeVisible()
      expect(await violations(page), 'the end of the challenge, with the retrospect card').toEqual([])
      expect(await focused(page)).toMatchObject({ tag: 'H2' })
    })
  })
}
