import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { headToHeadPath } from '../shared/components/FeaturedMatchup'
import { featuredPick } from '../shared/data/featuredPick'
import type { UpcomingPick } from '../shared/types/api'
import { respond } from './fixtures'

const get = vi.fn(async (url: string) => ({ data: respond(url) }))

vi.mock('axios', () => {
  const instance = {
    get: (url: string) => get(url),
    post: async () => ({ data: respond('/predict') }),
  }
  return { default: { create: () => instance }, create: () => instance }
})

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('headToHeadPath', () => {
  it('encodes both names for the head-to-head page', () => {
    expect(headToHeadPath('Alex Pereira', 'Magomed Ankalaev')).toBe('/head-to-head?a=Alex+Pereira&b=Magomed+Ankalaev')
    expect(headToHeadPath('A & B', "C'D")).toBe('/head-to-head?a=A+%26+B&b=C%27D')
  })
})

describe('Landing', () => {
  it('opens with its own heading, the directory as the main action and the predictions as the second one', async () => {
    renderAt('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'Explore MMA through the data' })).toBeInTheDocument()
    expect(screen.getByText(/Follow events and results from 11 organizations\. See the model’s win estimates for UFC, PFL and ONE fights\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore organizations' })).toHaveAttribute('href', '/#organizations-grid')
    expect(screen.getByRole('link', { name: 'See predictions' })).toHaveAttribute('href', '/#predictions')
    expect(document.getElementById('predictions')).not.toBeNull()
    // No organization is chosen for the visitor: there is no switcher on the home page.
    expect(screen.queryByRole('group', { name: 'Organization' })).toBeNull()
  })

  it('closes with the project and the links to the model and its record, without the detailed figures', async () => {
    renderAt('/')
    const project = (await screen.findByRole('heading', { name: 'About the project' })).closest('section')!

    expect(within(project).getByRole('link', { name: 'How the model works' })).toHaveAttribute('href', '/model')
    expect(within(project).getByRole('link', { name: 'Prediction record' })).toHaveAttribute('href', '/track-record')
    expect(project.textContent).not.toMatch(/\d+%/)
  })
})

describe('the organization directory', () => {
  const directory = async () => (await screen.findByRole('heading', { name: 'Organizations', level: 2 })).closest('section')!
  const hrefs = (root: Element) => Array.from(root.querySelectorAll('li > a')).map((link) => link.getAttribute('href'))

  it('lists the eleven organizations once, the three with predictions first, all of the same kind', async () => {
    renderAt('/')
    const root = await directory()

    expect(hrefs(root)).toEqual(['/home', '/pfl', '/one', '/bellator', '/rizin', '/ksw', '/lfa', '/cage-warriors', '/oktagon', '/jungle-fight', '/invicta'])
    const classes = new Set(Array.from(root.querySelectorAll('li > a')).map((link) => link.className))
    expect(classes.size).toBe(1)
  })

  it('names the real coverage of each one', async () => {
    renderAt('/')
    const root = await directory()
    const item = (href: string) => root.querySelector(`li > a[href="${href}"]`)!

    expect(item('/home')).toHaveTextContent('Events and predictions')
    expect(item('/one')).toHaveTextContent('Events and predictions')
    expect(item('/invicta')).toHaveTextContent('Events and results')
    expect(item('/bellator')).toHaveTextContent(/Historical archive\s·\s2009–2023/)
  })

  it('is on screen at once, before the API answers, and asks it for nothing', async () => {
    get.mockClear()
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Organizations', level: 2 })).toBeInTheDocument()
    await directory()

    const asked = get.mock.calls.map(([url]) => url)
    expect(asked.some((url) => /events|data-info/.test(url))).toBe(false)
  })
})

describe('the predictions preview', () => {
  const preview = async () => (await screen.findByRole('heading', { name: 'Predictions', level: 2 })).closest('section')!

  it('shows the next published pick of each organization that has one, leading to its prediction page', async () => {
    renderAt('/')
    const root = await preview()
    const link = await within(root).findByRole('link', { name: /^UFC: Gamma Three against Delta Four/ })

    expect(link.getAttribute('href')).toBe('/predictor?a=Gamma+Three&b=Delta+Four&event=UFC+900%3A+Alpha+vs.+Beta')
    expect(link).toHaveTextContent('72%')
    expect(link).toHaveTextContent('28%')
    // The fake PFL and ONE have no picks: they are left out, never made up.
    expect(within(root).getAllByRole('link')).toHaveLength(1)
  })

  it('falls back to each organization’s predictor when nothing is published', async () => {
    get.mockImplementation(async (url: string) => {
      if (url.includes('/predict/upcoming')) throw new Error('down')
      return { data: respond(url) }
    })
    renderAt('/')
    const root = await preview()

    const links = await within(root).findAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/predictor', '/pfl/predictor', '/one/predictor'])
    get.mockImplementation(async (url: string) => ({ data: respond(url) }))
  })
})

describe('featuredPick', () => {
  const pick = (event_date: string, card_position: number | null, fighter_1: string) =>
    ({ event_name: 'E', event_date, fighter_1, fighter_2: 'X', predicted_winner: fighter_1, probability: 0.6, fighter_1_probability: 0.6, card_position }) as UpcomingPick

  it('takes the main event of the earliest card still to come', () => {
    expect(featuredPick([pick('2030-02-01', 1, 'Later'), pick('2030-01-01', 2, 'Co-main'), pick('2030-01-01', 1, 'Main')], '2026-01-01')?.fighter_1).toBe('Main')
  })

  it('keeps the listed order when the card order is unknown, and skips past cards', () => {
    expect(featuredPick([pick('2020-01-01', null, 'Past'), pick('2030-01-01', null, 'First'), pick('2030-01-01', null, 'Second')], '2026-01-01')?.fighter_1).toBe('First')
    expect(featuredPick([pick('2020-01-01', 1, 'Past')], '2026-01-01')).toBeNull()
  })
})

describe('switching organization', () => {
  it('every organization page names the organization in the header and leads back to the directory', async () => {
    renderAt('/pfl')

    const switcher = await screen.findByRole('group', { name: 'Organization' })
    expect(within(switcher).getByRole('button')).toHaveTextContent('PFL')
    expect(within(switcher).getByRole('link', { name: 'See all in the directory' })).toHaveAttribute('href', '/#organizations-grid')
  })
})
