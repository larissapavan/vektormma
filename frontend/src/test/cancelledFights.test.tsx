import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import i18n from '../i18n'
import { CANCELLED_PICKS_KEY } from '../shared/hooks/useCancelledPicks'
import { respond } from './fixtures'

vi.mock('axios', () => {
  const instance = {
    get: async (url: string) => ({ data: respond(url) }),
    post: async () => ({ data: respond('/predict') }),
  }
  return { default: { create: () => instance }, create: () => instance }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/cancelled-fights']}>
      <App />
    </MemoryRouter>,
  )
}

const card = async (name: RegExp) => within(await screen.findByRole('article', { name }, { timeout: 10000 }))

beforeEach(async () => {
  window.localStorage.clear()
  await i18n.changeLanguage('en-US')
})

describe('cancelled fights', () => {
  it('lists each fight with what happened to it, and the model stays hidden until the visitor picks', async () => {
    renderPage()
    const fight = await card(/Alpha One vs\. Beta Two/)

    expect(fight.getByText('UFC 311', { exact: false })).toBeInTheDocument()
    expect(fight.getByText('Injury')).toBeInTheDocument()
    expect(fight.getByText(/Pick a fighter to see what the model would say/i)).toBeInTheDocument()
    expect(fight.queryByText(/if they fought today/i)).toBeNull()

    const older = await card(/Old Timer vs\. Older Timer/)
    expect(older.getByText(/Booked 5 times/i)).toBeInTheDocument()
    expect(older.getByText('Event cancelled')).toBeInTheDocument()
  })

  it('links each fight to a search of it on r/MMA, opened in a new tab', async () => {
    renderPage()
    const fight = await card(/Alpha One vs\. Beta Two/)
    const link = fight.getByRole('link', { name: /Discuss on r\/MMA/i })
    expect(link).toHaveAttribute('href', 'https://www.reddit.com/r/MMA/search/?q=Alpha%20One%20Beta%20Two&restrict_sr=1&sort=top')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('records the pick, then shows the model and whether the two agree', async () => {
    renderPage()
    const fight = await card(/Alpha One vs\. Beta Two/)

    await userEvent.click(fight.getByRole('button', { name: /Beta Two/ }))
    expect(fight.getByTestId('your-pick-alpha-vs-beta')).toHaveTextContent('Your pick: Beta Two')
    expect(fight.getByText(/if they fought today/i)).toBeInTheDocument()
    expect(fight.getByTestId('agreement-alpha-vs-beta')).toHaveTextContent('You disagree with the model.')

    await userEvent.click(fight.getByRole('button', { name: 'Submission' }))
    expect(fight.getByTestId('your-pick-alpha-vs-beta')).toHaveTextContent('Your pick: Beta Two by Submission')

    await userEvent.click(fight.getByRole('button', { name: /Alpha One/ }))
    expect(fight.getByTestId('agreement-alpha-vs-beta')).toHaveTextContent('You and the model picked the same fighter.')
    // Changing the winner drops the method: it was a method for the other fighter.
    expect(fight.getByTestId('your-pick-alpha-vs-beta')).toHaveTextContent(/^Your pick: Alpha One$/)

    expect(screen.getByTestId('pick-count')).toHaveTextContent('You have picked 1 of 2')
  })

  it('explains why the model sits out when a fighter no longer competes', async () => {
    renderPage()
    const older = await card(/Old Timer vs\. Older Timer/)

    await userEvent.click(older.getByRole('button', { name: /Old Timer/ }))
    expect(older.getByText(/The model sits this one out/i)).toBeInTheDocument()
    expect(older.getByText(/Old Timer and Older Timer no longer compete in the UFC/i)).toBeInTheDocument()
  })

  it('keeps the picks in the browser across a reload and clears them on request', async () => {
    const first = renderPage()
    await userEvent.click((await card(/Alpha One vs\. Beta Two/)).getByRole('button', { name: /Alpha One/ }))
    expect(JSON.parse(window.localStorage.getItem(CANCELLED_PICKS_KEY) ?? '{}')).toEqual({ 'alpha-vs-beta': { winner: 'Alpha One', method: null } })
    first.unmount()

    renderPage()
    const fight = await card(/Alpha One vs\. Beta Two/)
    expect(fight.getByTestId('your-pick-alpha-vs-beta')).toHaveTextContent('Your pick: Alpha One')

    await userEvent.click(screen.getByRole('button', { name: /clear picks/i }))
    expect(screen.getByTestId('pick-count')).toHaveTextContent('You have picked 0 of 2')
    expect(JSON.parse(window.localStorage.getItem(CANCELLED_PICKS_KEY) ?? '{}')).toEqual({})
  })

  it('ignores stored picks that are damaged or name someone who is not in the fight', async () => {
    window.localStorage.setItem(CANCELLED_PICKS_KEY, JSON.stringify({ 'alpha-vs-beta': { winner: 'Somebody Else', method: null }, 'old-vs-older': { winner: 3 } }))
    renderPage()
    await card(/Alpha One vs\. Beta Two/)
    expect(screen.getByTestId('pick-count')).toHaveTextContent('You have picked 0 of 2')
  })

  it('still works when the browser refuses to store anything', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    renderPage()
    const fight = await card(/Alpha One vs\. Beta Two/)
    await userEvent.click(fight.getByRole('button', { name: /Alpha One/ }))
    expect(fight.getByTestId('your-pick-alpha-vs-beta')).toHaveTextContent('Your pick: Alpha One')
    setItem.mockRestore()
  })
})
