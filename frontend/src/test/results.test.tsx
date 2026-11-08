import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { respond } from './fixtures'

const requested: string[] = []

vi.mock('axios', () => {
  const instance = {
    get: async (url: string, options?: { params?: { days?: number } }) => {
      if (url === '/results/recent') requested.push(`days=${options?.params?.days}`)
      return { data: respond(url) }
    },
    post: async () => ({ data: respond('/predict') }),
  }
  return { default: { create: () => instance }, create: () => instance }
})

function renderResults() {
  return render(
    <MemoryRouter initialEntries={['/results']}>
      <App />
    </MemoryRouter>,
  )
}

describe('the recent results page', () => {
  it('lists each event with its fights, how they ended and how the model did', async () => {
    renderResults()
    expect(await screen.findByText('UFC 900: Alpha vs. Beta', undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText('Knockout (Punches) · R1 · 2:10', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('2 of 3 fights')).toBeInTheDocument() // one bout has no result yet
    expect(screen.getByText(/No result yet/)).toBeInTheDocument()
    const summary = screen.getByLabelText('Summary of the period')
    expect(within(summary).getByText('50%')).toBeInTheDocument()
    expect(within(summary).getByText('1 of 2')).toBeInTheDocument()
  })

  it('marks the model pick as right or wrong once the fight has a winner', async () => {
    renderResults()
    await screen.findByText('UFC 900: Alpha vs. Beta', undefined, { timeout: 10000 })
    expect(screen.getByText(/· right/)).toBeInTheDocument()
    expect(screen.getByText(/· wrong/)).toBeInTheDocument()
  })

  it('asks for a wider window when the visitor picks one', async () => {
    renderResults()
    await screen.findByText('UFC 900: Alpha vs. Beta', undefined, { timeout: 10000 })
    expect(requested).toContain('days=7')
    await userEvent.click(screen.getByRole('button', { name: '14 days' }))
    await screen.findByText('UFC 900: Alpha vs. Beta')
    expect(requested).toContain('days=14')
    expect(screen.getByRole('button', { name: '14 days' })).toHaveAttribute('aria-pressed', 'true')
  })
})
