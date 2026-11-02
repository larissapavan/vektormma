import { render, screen, waitFor } from '@testing-library/react'
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
  it('features the next fight with the model odds and a link to compare the two fighters', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const card = await screen.findByTestId('featured-matchup')
    expect(card).toHaveTextContent('Gamma Three')
    expect(card).toHaveTextContent('Delta Four')
    expect(card).toHaveTextContent('72%')
    expect(card).toHaveTextContent('Model favors Gamma Three (72%)')
    expect(card).not.toHaveTextContent(/clear edge/i)
    // Where the fight sits on the card, and the day of the event.
    expect(card).toHaveTextContent('Co-main event')
    expect(card).toHaveTextContent('UFC 900: Alpha vs. Beta · Jan 1, 2030')
    const hrefs = Array.from(card.querySelectorAll('a')).map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/head-to-head?a=Gamma+Three&b=Delta+Four')
    // The factors behind the pick: the matchup page, which shows the SHAP bars.
    expect(hrefs).toContain('/matchup-intelligence?a=Gamma+Three&b=Delta+Four&event=UFC+900%3A+Alpha+vs.+Beta')
  })

  it('has a primary call to compare fighters', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    const links = await screen.findAllByRole('link', { name: /compare fighters/i })
    expect(links.some((l) => l.getAttribute('href') === '/head-to-head')).toBe(true)
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
    await screen.findByTestId('featured-matchup')
    const grouped = Array.from(document.querySelectorAll('dd')).map((n) => n.textContent)
    expect(grouped).toContain('8,900+')
    expect(grouped).not.toContain('8.9k+')
    // The strip's first two figures (bouts, athletes) are exact totals from the API: no plus.
    const metrics = Array.from(document.querySelector('section.border-y > div')?.children ?? [])
    expect(metrics[0]?.textContent).not.toContain('+')
    expect(metrics[1]?.textContent).not.toContain('+')
  })
})
