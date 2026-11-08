import '@testing-library/jest-dom/vitest'
import i18n from '../i18n'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

await i18n.changeLanguage('en-US')

// The suite runs a jsdom per file in parallel, so a page that lazy-loads can take well over the default second to show up when
// the machine is busy. This is only the ceiling for waiting: a test that finds its element at once still ends at once.
configure({ asyncUtilTimeout: 10000 })

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en-US')
  // Imported here, not at the top: a static import would load the real axios before a test file can mock it.
  const { resetFightersCache } = await import('../shared/hooks/useFighters')
  resetFightersCache()
  const { resetOrgData } = await import('../shared/hooks/useOrgData')
  resetOrgData()
})

// jsdom has none of these; charts, the fighter picker and the page transitions expect them.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

window.scrollTo = (() => {}) as typeof window.scrollTo
Element.prototype.scrollIntoView = () => {}
