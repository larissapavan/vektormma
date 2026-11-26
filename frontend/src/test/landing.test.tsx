import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { headToHeadPath } from '../shared/components/FeaturedMatchup'
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
  it('opens with what Vektor MMA does and one way to the organization directory, not with a fight', async () => {
    renderAt('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'Explore MMA through the data' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose an organization' })).toHaveAttribute('href', '/#organizations-grid')
    expect(screen.queryByTestId('featured-matchup')).toBeNull()
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
    expect(item('/bellator')).toHaveTextContent(/Bellator archive\s·\s2009–2023/)
  })

  it('is built without asking the API for schedules or counts', async () => {
    get.mockClear()
    renderAt('/')
    await directory()

    const asked = get.mock.calls.map(([url]) => url)
    expect(asked.some((url) => /upcoming|events|data-info/.test(url))).toBe(false)
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
