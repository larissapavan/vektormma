import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { headToHeadPath } from '../shared/components/FeaturedMatchup'
import { respond } from './fixtures'

vi.mock('axios', () => {
  const instance = {
    get: async (url: string) => ({ data: respond(url) }),
    post: async () => ({ data: respond('/predict') }),
  }
  return { default: { create: () => instance }, create: () => instance }
})

describe('headToHeadPath', () => {
  it('encodes both names for the head-to-head page', () => {
    expect(headToHeadPath('Alex Pereira', 'Magomed Ankalaev')).toBe('/head-to-head?a=Alex+Pereira&b=Magomed+Ankalaev')
    expect(headToHeadPath('A & B', "C'D")).toBe('/head-to-head?a=A+%26+B&b=C%27D')
  })
})

describe('Landing', () => {
  it('opens with what Vektor MMA is and a way down to the organizations, not with a fight', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Explore MMA. Understand the matchups.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore organizations' })).toHaveAttribute('href', '#organizations-grid')
    expect(screen.queryByTestId('featured-matchup')).toBeNull()
  })

  it('shows the counts the API reports', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    // fights_count 10 and fighters_count 2 in the fake API; the counting text is hidden, the real figure is for readers.
    await waitFor(() => {
      const texts = Array.from(document.querySelectorAll('.sr-only')).map((n) => n.textContent)
      expect(texts).toContain('10')
      expect(texts).toContain('2')
    })
  })

  it('writes the counts with the grouping of the language and no plus on an exact total', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    // The org cards show rounded-down snapshots with a plus, in the same grouping as the exact figures in the strip.
    const ufc = await screen.findByRole('link', { name: /follow ultimate fighting championship/i })
    expect(ufc).toHaveTextContent('8,900+')
    expect(ufc).not.toHaveTextContent('8.9k+')
    // The site's first two figures (fights, fighters) are exact totals from the API: no plus.
    const metrics = Array.from(document.querySelectorAll('main dl > div dd'))
    expect(metrics[0]?.textContent).not.toContain('+')
    expect(metrics[1]?.textContent).not.toContain('+')
  })
})

describe('the organizations section', () => {
  const section = async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    return (await screen.findByRole('heading', { name: /choose an organization/i })).closest('section')!
  }
  const hrefs = (root: Element) => Array.from(root.querySelectorAll('a')).map((link) => link.getAttribute('href'))

  it('links every organization once, as cards of the same kind', async () => {
    const root = await section()

    expect(hrefs(root)).toEqual(['/home', '/pfl', '/one', '/bellator', '/rizin', '/ksw', '/lfa', '/cage-warriors', '/oktagon', '/jungle-fight', '/invicta'])
    // No card is picked or set apart for the visitor: every card has the same classes.
    const classes = new Set(Array.from(root.querySelectorAll('li > a')).map((link) => link.className))
    expect(classes.size).toBe(1)
  })

  it('shows each next event as the API has it, and says so when there is none', async () => {
    const root = await section()
    const ufc = within(root).getByRole('link', { name: /follow ultimate fighting championship/i })
    const pfl = within(root).getByRole('link', { name: /follow professional fighters league/i })
    const bellator = within(root).getByRole('link', { name: /follow bellator mma/i })

    await waitFor(() => expect(ufc).toHaveTextContent('UFC 900: Alpha vs. Beta'))
    expect(ufc).toHaveTextContent('2 fights')
    expect(ufc).toHaveTextContent('Events and predictions')
    await waitFor(() => expect(pfl).toHaveTextContent('PFL Future'))
    expect(pfl).toHaveTextContent('1 fight')
    // Bellator is an archive: no event is made up for it.
    expect(bellator).toHaveTextContent('Historical archive')
    expect(bellator).toHaveTextContent('No future events')
  })

  it('tells an organization without a confirmed card apart from one still loading', async () => {
    const root = await section()
    const invicta = within(root).getByRole('link', { name: /follow invicta fighting championships/i })

    await waitFor(() => expect(invicta).toHaveTextContent('No event confirmed right now.'))
    expect(invicta).toHaveTextContent('Events and results')
  })
})

describe('switching organization', () => {
  it('every organization page links back to the picker', async () => {
    render(
      <MemoryRouter initialEntries={['/pfl']}>
        <App />
      </MemoryRouter>,
    )

    const back = await screen.findByRole('link', { name: 'Switch organization' })
    expect(back).toHaveAttribute('href', '/#organizations-grid')
    expect(back.parentElement).toHaveTextContent('You are following PFL')
  })
})
