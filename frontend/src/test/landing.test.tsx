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
    expect(card).toHaveTextContent('The model gives Gamma Three a 72% chance of winning.')
    expect(card).not.toHaveTextContent(/clear edge/i)
    // Both headliners face to face: a photo each, or their initials when there is none.
    const faceOff = within(card).getByTestId('featured-faceoff')
    expect(faceOff).toHaveTextContent('GT')
    expect(faceOff).toHaveTextContent('DF')
    // Where the fight sits on the card, and the day of the event.
    expect(card).toHaveTextContent('Co-main event')
    expect(card).toHaveTextContent('UFC 900: Alpha vs. Beta · Jan 1, 2030')
    const hrefs = Array.from(card.querySelectorAll('a')).map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/head-to-head?a=Gamma+Three&b=Delta+Four')
    // The factors behind the pick: the fight's own page, which shows the SHAP bars.
    expect(hrefs).toContain('/fight/gamma-three-vs-delta-four')
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
    const ufc = screen.getByRole('link', { name: /open ultimate fighting championship/i })
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

  it('links every organization once, in three levels', async () => {
    const root = await section()

    expect(hrefs(root)).toEqual(['/home', '/pfl', '/one', '/bellator', '/rizin', '/ksw', '/lfa', '/cage-warriors', '/oktagon', '/jungle-fight', '/invicta'])
  })

  it('gives the UFC a row of its own, with the badge, the description and three counts', async () => {
    const root = await section()
    const ufc = within(root).getByRole('link', { name: /open ultimate fighting championship/i })

    expect(ufc).toHaveAttribute('href', '/home')
    expect(ufc).toHaveTextContent('Predictions')
    expect(ufc).toHaveTextContent('The model’s estimated win chance for every fight')
    // 797 events, 2796 fighters and 8985 bouts, rounded down.
    expect(ufc).toHaveTextContent('790+')
    expect(ufc).toHaveTextContent('2,700+')
    expect(ufc).toHaveTextContent('8,900+')
    expect(within(ufc).queryByText(/simulate/i)).toBeNull()
  })

  it('shows PFL, ONE and Bellator as rows with their badge and a single number, the fights', async () => {
    const root = await section()

    // PFL 1380, ONE 4817 and Bellator 3004 bouts, rounded down.
    for (const [name, badge, bouts] of [
      [/open professional fighters league/i, 'Predictions', '1,300+'],
      [/open one championship/i, 'Predictions', '4,800+'],
      [/open bellator mma/i, 'Historical archive', '3,000+'],
    ] as const) {
      const card = within(root).getByRole('link', { name })
      expect(card).toHaveTextContent(badge)
      expect(card).toHaveTextContent(bouts)
      expect(card).toHaveTextContent(/fights/i)
      expect(card).not.toHaveTextContent(/events/i)
    }
  })

  it('lists the other seven as one chip each under "Other leagues", with only the name: no badge, glove or counts', async () => {
    const root = await section()
    const list = within(root).getByRole('heading', { name: /other leagues/i }).parentElement!.querySelector('ul')!

    expect(list.querySelectorAll('li')).toHaveLength(7)
    expect(list).toHaveTextContent('RIZIN')
    expect(list.querySelector('img')).toBeNull()
    expect(list.textContent).not.toMatch(/\d/)
    expect(list).not.toHaveTextContent(/events|fighters|fights/i)
  })
})
