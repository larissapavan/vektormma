import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import i18n from '../i18n'
import { encodeRetrospect, type Retrospect } from '../shared/game/career'
import { respond } from './fixtures'

const calls = vi.hoisted(() => ({ matchmaking: [] as unknown[] }))

vi.mock('axios', () => {
  const instance = {
    get: async (url: string) => ({ data: respond(url) }),
    post: async (url: string, body: unknown) => {
      if (url === '/game/matchmaking') calls.matchmaking.push(body)
      return { data: respond(url) }
    },
  }
  return { default: { create: () => instance }, create: () => instance }
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const click = (name: RegExp | string) => userEvent.click(screen.getByRole('button', { name }))
const findButton = (name: RegExp | string) => screen.findByRole('button', { name }, { timeout: 10000 })

/** Picks the first of the three coaches on offer and trains with them. */
async function train() {
  const coaches = screen.getAllByRole('button', { name: /^Coach /, pressed: false })
  await userEvent.click(coaches[0])
  await click(/^train with coach/i)
}

async function startCareer(name = 'Maria Silva') {
  renderAt('/career')
  await userEvent.type(await screen.findByLabelText('Name', undefined, { timeout: 10000 }), name)
  await click(/start the career/i)
}

/** Camp, take the first fight on offer with the balanced plan, skip to the result and go on. */
async function playOneFight() {
  await train()
  await userEvent.click(await findButton(/Easy Eddie/))
  await click(/fight easy eddie/i)
  await click(/skip to the result/i)
  expect(screen.getByTestId('fight-result')).toHaveTextContent(/victory|defeat/i)
}

beforeEach(async () => {
  calls.matchmaking.length = 0
  // jsdom has no canvas: the card then shows its text version, which is what these tests read.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  await i18n.changeLanguage('en-US')
})

describe('creating the fighter', () => {
  it('needs a name, and the three skills cannot spend more than 150 points', async () => {
    renderAt('/career')
    const start = await findButton(/start the career/i)
    expect(start).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Name'), 'Maria')
    expect(start).toBeEnabled()
    expect(screen.getByTestId('points-left')).toHaveTextContent('30 left')

    const striking = screen.getByLabelText(/^Striking/, { selector: 'input' }) as HTMLInputElement
    fireEvent.change(striking, { target: { value: '45' } })
    expect(striking.value).toBe('45')
    expect(screen.getByTestId('points-left')).toHaveTextContent('25 left')

    // Pushing it to the top takes only the points that are still free: 40 + 30 is the most it can have.
    fireEvent.change(striking, { target: { value: '90' } })
    expect(striking.value).toBe('70')
    expect(screen.getByTestId('points-left')).toHaveTextContent('0 left')
  })

  it('starts the career at 6-0 with the camp on screen', async () => {
    await startCareer()
    expect(screen.getByTestId('record')).toHaveTextContent('6-0')
    expect(screen.getByText(/camp for your ufc debut/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^retire$/i })).toBeNull() // not before three fights
  })
})

describe('a career', () => {
  it('offers three coaches, shows what each camp does, and trains only once one is chosen', async () => {
    await startCareer()
    const coaches = screen.getAllByRole('button', { name: /^Coach / })
    expect(coaches).toHaveLength(3)
    for (const coach of coaches) expect(coach).toHaveTextContent(/Striking \+\d+\.\d/)

    expect(screen.getByRole('button', { name: /choose a coach/i })).toBeDisabled()
    await userEvent.click(coaches[1])
    expect(coaches[1]).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^train with coach/i })).toBeEnabled()
  })

  it('asks the API for fights built from the fighter, then plays one and goes on', async () => {
    await startCareer()
    await train()
    await userEvent.click(await findButton(/Easy Eddie/))

    expect(calls.matchmaking).toHaveLength(1)
    expect(calls.matchmaking[0]).toMatchObject({ division: 'Lightweight', fighter: { wins: 6, losses: 0, stance: 'Orthodox' }, exclude: [] })

    expect(screen.getByText('Even Steven')).toBeInTheDocument()
    expect(screen.getByText('Risky Rick')).toBeInTheDocument()
    expect(screen.getByText(/ranked #9/i)).toBeInTheDocument()
    expect(screen.getByText('You are the favorite')).toBeInTheDocument()
    expect(screen.getByText('You are the underdog')).toBeInTheDocument()
    expect(screen.queryByText(/66%/)).toBeNull() // the chance itself stays hidden

    await click(/fight easy eddie/i)
    await click(/the bell rings/i)
    expect(screen.getAllByText(/round 1/i).length).toBeGreaterThan(0)
    // A fight finished in round 1 is already over; any other has rounds left to skip.
    if (screen.queryByRole('button', { name: /skip to the result/i })) await click(/skip to the result/i)
    expect(screen.getByTestId('fight-result')).toHaveTextContent(/victory|defeat/i)

    await click(/continue the career/i)
    expect(screen.getByText(/camp for ufc fight 2/i)).toBeInTheDocument()
    expect(Number(screen.getByTestId('record').textContent?.split('-')[0]) + Number(screen.getByTestId('record').textContent?.split('-')[1])).toBe(7)
  })

  it('leaves out the fighters already faced when it asks for the next fights', async () => {
    await startCareer()
    await playOneFight()
    await click(/continue the career/i)
    await train()
    await findButton(/Even Steven/)
    expect(calls.matchmaking[1]).toMatchObject({ exclude: ['Easy Eddie'] })
  })

  it('ends with the retrospect after three fights, with the ways to save and share it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await startCareer('José Aldo')
    for (let fights = 0; fights < 3; fights += 1) {
      await playOneFight()
      if (fights < 2) await click(/continue the career/i)
    }
    await click(/^retire$/i)

    expect(await screen.findByText(/the career is over/i)).toBeInTheDocument()
    const fallback = await screen.findByTestId('card-fallback')
    expect(fallback).toHaveTextContent('José Aldo')
    expect(fallback).toHaveTextContent(/retired at \d+ after 3 ufc fights/i)
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
    for (const network of ['X', 'WhatsApp', 'Facebook']) {
      const link = screen.getByRole('link', { name: network })
      expect(link).toHaveAttribute('target', '_blank')
      expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('/en/career?c=')
    }

    await click(/start another career/i)
    expect(await findButton(/start the career/i)).toBeInTheDocument()
  })
})

describe('a shared link', () => {
  const card: Retrospect = { n: 'Maria Silva', d: 'Lightweight', w: 19, l: 4, dr: 0, ko: 8, sb: 3, dc: 2, f: 17, a: 33, s: 'top5', c: 1, df: 2, b: 'Beneil Dariush', x: 'Charles Oliveira', e: 'retired' }

  it('shows the card of the link, flags it as unverified and offers to build one', async () => {
    renderAt(`/career?c=${encodeRetrospect(card)}`)
    const fallback = await screen.findByTestId('card-fallback', undefined, { timeout: 10000 })
    expect(fallback).toHaveTextContent('Maria Silva')
    expect(fallback).toHaveTextContent('19-4')
    expect(screen.getByText(/have not been verified/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /build my own career/i })).toHaveAttribute('href', '/career')
    expect(screen.queryByRole('button', { name: /copy link/i })).toBeNull()
  })

  it('ignores a link that is damaged and opens the game instead', async () => {
    renderAt('/career?c=this-is-not-a-card')
    expect(await findButton(/start the career/i)).toBeInTheDocument()
  })

  it('shows markup in a name as plain text', async () => {
    renderAt(`/career?c=${encodeRetrospect({ ...card, n: '<img src=x onerror=alert(1)>' })}`)
    const fallback = await screen.findByTestId('card-fallback', undefined, { timeout: 10000 })
    expect(fallback.querySelector('img')).toBeNull()
  })
})
