import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { respond } from './fixtures'

vi.mock('axios', () => {
  const instance = {
    get: async (url: string) => ({ data: respond(url) }),
    post: async () => ({ data: respond('/predict') }),
  }
  return { default: { create: () => instance }, create: () => instance }
})

// The dossier and the matchup page are lazy chunks that wait for the fighters: under a full run one second is not always enough.
const WAIT = { timeout: 10000 }

function Where() {
  const { pathname } = useLocation()
  return <output data-testid="where">{pathname}</output>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>,
  )
}

describe('the address of an athlete', () => {
  it('opens the dossier from the slug', async () => {
    renderAt('/athlete/alpha-one')

    expect((await screen.findAllByText('Alpha One', undefined, WAIT)).length).toBeGreaterThan(0)
    expect(screen.getByTestId('where')).toHaveTextContent('/athlete/alpha-one')
  })

  it('rewrites an address with the name in it to the slug, so an athlete has one address', async () => {
    renderAt('/athlete/Alpha%20One')

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/athlete/alpha-one'), WAIT)
    expect((await screen.findAllByText('Alpha One', undefined, WAIT)).length).toBeGreaterThan(0)
  })
})

describe('the address of a fight', () => {
  it('opens the matchup analysis with both corners chosen from the slugs', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    renderAt('/fight/alpha-one-vs-beta-two')
    // The page copies the link of the pair it shows: the two corners came from the address.
    await userEvent.click(await screen.findByRole('button', { name: /copy matchup link/i }, { timeout: 10000 }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const link = new URL(writeText.mock.calls[0][0])
    expect(link.searchParams.get('a')).toBe('Alpha One')
    expect(link.searchParams.get('b')).toBe('Beta Two')
  })

  it('says the page does not exist when one of the slugs is not a fighter', async () => {
    renderAt('/fight/alpha-one-vs-nobody-at-all')

    expect(await screen.findByRole('heading', { name: /page not found/i }, WAIT)).toBeInTheDocument()
  })
})
