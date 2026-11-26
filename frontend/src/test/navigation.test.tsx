import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { isItemActive, orgNav } from '../shared/data/navItems'
import { ORGS, orgCoverageLabel } from '../shared/data/orgs'
import { scheduledEventFor } from '../shared/hooks/useScheduledBout'
import { respond } from './fixtures'

vi.mock('axios', () => {
  const instance = {
    get: async (url: string) => ({ data: respond(url) }),
    post: async () => ({ data: respond('/predict') }),
  }
  return { default: { create: () => instance }, create: () => instance }
})

const WAIT = { timeout: 10000 }
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('the main destinations', () => {
  it('are Events, Fighters and Predictions everywhere there are predictions, the rest under More', () => {
    for (const org of [ORGS.ufc, ORGS.pfl, ORGS.one]) expect(orgNav(org).primary.map((item) => item.label)).toEqual(['Events', 'Fighters', 'Predict'])
    expect(orgNav(ORGS.rizin).primary.map((item) => item.label)).toEqual(['Events', 'Fighters'])
    expect(orgNav(ORGS.ufc).more.map((item) => item.label)).toEqual(['Rankings', 'Champions', 'Gyms', 'RecordBook', 'Compare', 'MyCard', 'Cancelled', 'Game'])
    expect(orgNav(ORGS.bellator).more.map((item) => item.label)).toEqual(['Champions', 'Gyms'])
  })

  it('keep the old addresses under their entry: results under Events, a fight page under Predictions', () => {
    const [events, fighters, predict] = orgNav(ORGS.ufc).primary
    expect(isItemActive(events, '/results')).toBe(true)
    expect(isItemActive(fighters, '/athlete/alpha-one')).toBe(true)
    expect(isItemActive(predict, '/fight/alpha-one-vs-beta-two')).toBe(true)
  })

  it('come in the same order in the header and in the bottom bar', async () => {
    renderAt('/pfl/events')
    await screen.findByRole('heading', { name: 'PFL fight cards' }, WAIT)
    const [header, bottom] = screen.getAllByRole('navigation', { name: 'Main navigation' })
    const names = (nav: HTMLElement) => [...within(nav).getAllByRole('link').map((link) => link.textContent), ...within(nav).getAllByRole('button').map((button) => button.textContent)]
    expect(names(header)).toEqual(['Events', 'Fighters', 'Predictions', 'More'])
    expect(names(bottom)).toEqual(['Events', 'Fighters', 'Predictions', 'More'])
  })

  it('put the social networks and GitHub in the footer, not in the header', async () => {
    renderAt('/pfl/events')
    await screen.findByRole('heading', { name: 'PFL fight cards' }, WAIT)
    expect(within(screen.getAllByRole('banner')[0]).queryByRole('link', { name: /github/i })).toBeNull()
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: /github/i })).toBeInTheDocument()
  })

  it('group upcoming cards and results in one Events area', async () => {
    renderAt('/results')
    const tabs = await screen.findByRole('navigation', { name: 'Events' }, WAIT)
    expect(within(tabs).getByRole('link', { name: 'Upcoming' })).toHaveAttribute('href', '/events')
    expect(within(tabs).getByRole('link', { name: 'Results' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('the archive label', () => {
  it('names the years the Bellator archive covers, in every language', () => {
    expect(orgCoverageLabel(ORGS.bellator, 'pt-BR')).toBe('Arquivo do Bellator · 2009–2023')
    expect(orgCoverageLabel(ORGS.bellator, 'fr-FR')).toBe('Archives du Bellator · 2009–2023')
    expect(orgCoverageLabel(ORGS.one, 'es-419')).toBe('Eventos y pronósticos')
  })
})

describe('a scheduled fight or a simulation', () => {
  const events = [
    { name: 'UFC 900', date: '2999-01-01', fights: [{ fighter_1: 'Alpha One', fighter_2: 'Beta Two' }] },
    { name: 'UFC 1', date: '1993-11-12', fights: [{ fighter_1: 'Gamma Three', fighter_2: 'Delta Four' }] },
  ] as Parameters<typeof scheduledEventFor>[0]

  it('finds the card of a booked pair in either corner order', () => {
    expect(scheduledEventFor(events, 'Beta Two', 'Alpha One')?.name).toBe('UFC 900')
  })

  it('treats a past or never-booked pair as a simulation', () => {
    expect(scheduledEventFor(events, 'Gamma Three', 'Delta Four')).toBeNull()
    expect(scheduledEventFor(events, 'Alpha One', 'Delta Four')).toBeNull()
  })

  it('labels the predictor result with it', async () => {
    renderAt('/predictor?a=Alpha%20One&b=Beta%20Two')
    expect(await screen.findByText('Scheduled fight', undefined, WAIT)).toBeInTheDocument()
    expect(screen.getByText('UFC 900: Alpha vs. Beta')).toBeInTheDocument()
  })
})

describe('the ONE predictor', () => {
  it('suggests MMA matchups only', async () => {
    renderAt('/one/predictor')
    await screen.findByText('MMA suggestions', undefined, WAIT)
    expect(screen.queryByRole('button', { name: /Rodtang/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Christian Lee vs Saygid Izagakhmaev' })).toBeInTheDocument()
  })
})

describe('the phone filters', () => {
  it('wait behind one button that says how many are on', async () => {
    renderAt('/events?year=2026')
    const button = (await screen.findAllByRole('button', { name: /^Filters/ }, WAIT))[0]
    expect(button).toHaveTextContent('Filters (1)')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })
})
