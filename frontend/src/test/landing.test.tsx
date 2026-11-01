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
    const link = card.querySelector('a')
    expect(link).toHaveAttribute('href', '/head-to-head?a=Gamma+Three&b=Delta+Four')
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
})
