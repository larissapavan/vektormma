import { expect, test, type Page } from '@playwright/test'

/** Errors in a visitor's browser, on the built site: they only leave the browser in a production build. */

async function quiet(page: Page) {
  await page.route(/googlesyndication|doubleclick|adtrafficquality|googleads/, (route) => route.abort())
}

test('an error in a page reaches the API, without the query of the address', async ({ page }) => {
  await quiet(page)
  const reports: Array<Record<string, string>> = []
  await page.route('**/api/client-errors', async (route) => {
    reports.push(route.request().postDataJSON() as Record<string, string>)
    await route.fulfill({ status: 204 })
  })
  await page.goto('/en/about?who=ana')
  await expect(page.locator('h1').first()).toBeVisible()
  // An error thrown by the site's own code, in a handler: nothing in React sees it.
  await page.addScriptTag({ content: `setTimeout(() => { const error = new Error('a test error'); error.stack = 'Error: a test error\\n at f (' + location.origin + '/assets/x.js?v=secret:1:1)'; throw error }, 0)` })
  await expect.poll(() => reports.length).toBe(1)
  expect(reports[0]).toMatchObject({ kind: 'error', message: 'a test error', path: '/en/about' })
  expect(reports[0].build).not.toBe('dev')
  expect(JSON.stringify(reports[0])).not.toMatch(/ana|secret/)
})

test('a page left open while a new version was published reloads once, and then says what happened', async ({ page }) => {
  await quiet(page)
  await page.route('**/api/client-errors', (route) => route.fulfill({ status: 204 }))
  await page.goto('/en/about')
  await expect(page.locator('h1').first()).toBeVisible()
  // The new version no longer has this page's part.
  await page.route(/\/assets\/InfoPage-.*\.js|\/assets\/.*Privacy.*\.js/, (route) => route.fulfill({ status: 404, body: '' }))
  let loads = 0
  page.on('load', () => (loads += 1))
  await page.locator('a[href="/en/privacy"]').first().click()
  await expect(page.getByRole('button', { name: /reload page/i })).toBeVisible({ timeout: 15_000 })
  expect(loads).toBe(1)
})
