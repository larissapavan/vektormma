import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import i18n from '../i18n'
import { MY_CARD_KEY, OLD_PICKS_PREFIX, type MyPick } from '../shared/data/myCard'
import { respond } from './fixtures'

const api = vi.hoisted(() => ({ asked: [] as string[], failResults: false }))

vi.mock('axios', () => {
  const instance = {
    get: async (url: string) => {
      api.asked.push(url)
      if (api.failResults && url.includes('/results/recent')) throw new Error('down')
      return { data: respond(url) }
    },
    post: async () => ({ data: respond('/predict') }),
  }
  return { default: { create: () => instance }, create: () => instance }
})

const renderPage = (path = '/my-card') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const kept = () => JSON.parse(window.localStorage.getItem(MY_CARD_KEY) ?? '[]') as MyPick[]
const keep = (picks: MyPick[]) => window.localStorage.setItem(MY_CARD_KEY, JSON.stringify(picks))
const past = (over: Partial<MyPick> = {}): MyPick => ({ event: 'UFC 900: Alpha vs. Beta', date: '2026-11-07', a: 'Alpha One', b: 'Beta Two', winner: 'Alpha One', model: null, result: null, ...over })
const find = (name: RegExp) => screen.findByRole('button', { name }, { timeout: 10000 })

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 25, 12) })
  window.localStorage.clear()
  api.asked = []
  api.failResults = false
  await i18n.changeLanguage('en-US')
})
afterEach(() => vi.useRealTimers())

describe('picking', () => {
  it('shows the model only after the visitor has chosen, and keeps the pick in this browser', async () => {
    const user = userEvent.setup()
    renderPage()
    const gamma = await find(/^Gamma Three$/)
    expect(screen.queryByText(/The model (agrees|disagrees)/)).toBeNull()

    await user.click(gamma)
    expect(await screen.findByText(/The model agrees: Gamma Three \(72%\)/)).toBeInTheDocument()
    expect(gamma).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/1 of 2 picks made/)).toBeInTheDocument()
    expect(kept()).toMatchObject([{ date: '2030-01-01', winner: 'Gamma Three', model: { winner: 'Gamma Three', probability: 0.72 }, result: null }])

    await user.click(screen.getByRole('button', { name: /^Delta Four$/ }))
    expect(screen.getByText(/The model disagrees: Gamma Three/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Alpha One$/ }))
    expect(screen.getByText(/The model has no pick for this fight/)).toBeInTheDocument()
    expect(screen.getByText(/You agree with the model on 0 of 1/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Alpha One$/ }))
    expect(screen.getByText(/1 of 2 picks made/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /clear this card/i }))
    expect(kept()).toEqual([])
  })

  it('asks for no results while nothing has been fought', async () => {
    renderPage()
    await find(/^Gamma Three$/)
    expect(api.asked.some((url) => url.includes('/results/recent'))).toBe(false)
  })

  it('opens from the events page', async () => {
    const user = userEvent.setup()
    renderPage('/events')
    await user.click(await find(/UFC 900: Alpha vs\. Beta/))
    await user.click(await screen.findByRole('link', { name: /make your picks for the card/i }))
    expect(await screen.findByText(/0 of 2 picks made/, undefined, { timeout: 10000 })).toBeInTheDocument()
  })

  it('takes over the picks of the earlier window', async () => {
    const old = `${OLD_PICKS_PREFIX}UFC 900: Alpha vs. Beta`
    window.localStorage.setItem(old, JSON.stringify({ 'Gamma Three_Delta Four_1': 'Delta Four' }))
    renderPage()
    await waitFor(async () => expect(await find(/^Delta Four$/)).toHaveAttribute('aria-pressed', 'true'))
    expect(window.localStorage.getItem(old)).toBeNull()
    expect(kept()).toHaveLength(1)
  })

  it('copies the picks where the device has no share sheet', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()
    await user.click(await find(/^Delta Four$/))
    await user.click(await find(/^Share$/))
    expect(await screen.findByText('Text copied')).toBeInTheDocument()
    expect(writeText.mock.calls[0][0]).toMatch(/My picks for UFC 900[^]*Gamma Three vs\. Delta Four: Delta Four \(the model: Gamma Three\)[^]*\/en\/my-card$/)
  })
})

describe('the record', () => {
  it('checks past picks against the official results and the model’s saved picks', async () => {
    keep([past(), past({ a: 'Gamma Three', b: 'Delta Four', winner: 'Delta Four' }), past({ a: 'Eps Five', b: 'Zeta Six', winner: 'Eps Five' })])
    renderPage()
    const record = within((await screen.findByRole('heading', { name: 'Your record' }, { timeout: 10000 })).closest('section')!)
    expect(await record.findByText(/You and the model disagreed on one fight, and you got it right/)).toBeInTheDocument()
    expect(record.getAllByText('right')).toHaveLength(3)
    expect(record.getAllByText('wrong')).toHaveLength(1)
    expect(record.getByText('did not happen')).toBeInTheDocument() // still without a result 18 days on
    expect(kept().map((pick) => pick.result?.outcome)).toEqual(['win', 'win', 'void'])
    expect(api.asked.filter((url) => url === '/events')).toEqual([])
  })

  it('reads the archive for a pick older than the recent results', async () => {
    keep([past({ event: 'UFC 899: Past Card', date: '2026-09-01', winner: 'Beta Two', model: { winner: 'Alpha One', probability: 0.6 } })])
    renderPage()
    expect(await screen.findByText(/disagreed on one fight, and the model got it right/, undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(kept()[0].result).toEqual({ outcome: 'win', winner: 'Alpha One' })
  })

  it('keeps the picks and says so when the results cannot be read', async () => {
    api.failResults = true
    keep([past()])
    renderPage()
    expect(await screen.findByText(/Your picks are still saved/, undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(kept()).toHaveLength(1)
  })

  it('erases everything only after asking', async () => {
    const user = userEvent.setup()
    keep([past({ result: { outcome: 'win', winner: 'Alpha One' } })])
    renderPage()
    await user.click(await find(/erase all my picks/i))
    expect(kept()).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /erase everything/i }))
    await waitFor(() => expect(kept()).toEqual([]))
    expect(screen.queryByRole('heading', { name: 'Your record' })).toBeNull()
  })
})
