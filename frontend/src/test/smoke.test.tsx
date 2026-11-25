import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { respond } from './fixtures'

// Every request goes to a tiny fake API, so the real hooks and the real api.ts run, and no network is needed.
vi.mock('axios', () => {
  const instance = {
    get: async (url: string) => ({ data: respond(url) }),
    post: async () => ({ data: respond('/predict') }),
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

/** Page, a route that exercises it, and text only that page shows once its data has loaded. */
const pages: [string, string, string | RegExp][] = [
  ['Landing', '/', /choose an organization/i],
  ['UFC home', '/home', 'Alpha One'],
  ['Fighters', '/fighters', /weight classes/i],
  ['Events', '/events', 'UFC fight cards'],
  ['Results', '/results', 'UFC 900: Alpha vs. Beta'],
  ['Rankings', '/rankings', /divisional & pound-for-pound/i],
  ['Champions', '/champions', 'Current champions'],
  ['Record book', '/record-book', 'Total Fights'],
  ['Never happened', '/cancelled-fights', /the fights that never happened/i],
  ['My card', '/my-card', /0 of 2 picks made/i],
  ['Career game', '/career', /simulate your ufc career/i],
  ['Track record', '/track-record', /waiting for the first results/i],
  ['Head-to-head', '/head-to-head', /^head-to-head$/i],
  ['Predict', '/predictor', /fighter/i],
  ['Matchup (now the predictor)', '/matchup-intelligence', /tale of the tape/i],
  ['About', '/about', /sources and credits/i],
  ['Data', '/data', /from the official site to the prediction/i],
  ['System', '/model', /how the model works/i],
]

describe('every page opens and shows its data', () => {
  it.each(pages)('%s', async (_name, path, expected) => {
    renderAt(path)
    expect(await screen.findAllByText(expected, undefined, { timeout: 10000 })).not.toHaveLength(0)
  })
})

describe('the pages that depend on the API', () => {
  it('the home page shows the model pick next to the upcoming fights', async () => {
    renderAt('/home')
    expect(await screen.findByText(/Model: Gamma Three 72%/i, undefined, { timeout: 10000 })).toBeInTheDocument()
  })

  it('latest news links out to the original story', async () => {
    renderAt('/events')
    const link = await screen.findByRole('link', { name: /Alpha One retains the title/i }, { timeout: 10000 })
    expect(link).toHaveAttribute('href', 'https://www.espn.com/ufc/story/1')
  })

  it('clicking a ranked fighter opens their profile in place', async () => {
    renderAt('/rankings')
    await userEvent.click(await screen.findByRole('button', { name: /Beta Two, rank 1/i }, { timeout: 10000 }))
    await waitFor(() => expect(screen.getByRole('button', { name: /close performance profile/i })).toBeInTheDocument())
  })

  it('the multi-division tab opens a champion and lists every title fight', async () => {
    renderAt('/champions?view=records')
    await userEvent.click(await screen.findByRole('button', { name: /^multi-division champions$/i }, { timeout: 10000 }))
    await userEvent.click(await screen.findByRole('button', { name: /view title fights/i }, { timeout: 10000 }))
    expect(await screen.findByText('Won title')).toBeInTheDocument()
  })

  it('a division keeps its past champions in a collapsed timeline until it is opened', async () => {
    renderAt('/champions')
    const toggle = await screen.findByRole('button', { name: /lightweight title history/i }, { timeout: 10000 })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Omega Nine')).not.toBeInTheDocument()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Omega Nine')).toBeInTheDocument()
    expect(screen.getByText(/1 defense · Lost the belt/)).toBeInTheDocument()
  })

  it('the track record says which picks came from the earlier version of the model', async () => {
    renderAt('/track-record')
    expect(await screen.findByText(/saved before 2026-10-20, by an earlier version of the model/i, undefined, { timeout: 10000 })).toBeInTheDocument()
  })

  it('the track record counts each model apart once a newer one has made picks', async () => {
    renderAt('/track-record')
    expect(await screen.findByText('Live picks by model', undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText('First model')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 right (50%), 1 still to be settled.')).toBeInTheDocument()
    expect(screen.getByText('Pre-fight model')).toBeInTheDocument()
    expect(screen.getByText('1 picks saved, none settled yet.')).toBeInTheDocument()
    expect(screen.getByText(/saved by the pre-fight model, in use since 2026-11-10/)).toBeInTheDocument()
  })

  it('the track record says how many saved picks do not count, and offers no way to change it', async () => {
    renderAt('/track-record')
    expect(await screen.findByText(/^2 saved picks do not count/, undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument()
  })

  it('the data page dates each source and says which one is failing', async () => {
    renderAt('/data')
    expect(await screen.findByText('Gyms (FightHub)', undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText('Updates failing since October 3, 2026')).toBeInTheDocument()
    expect(screen.getByText(/newest UFC fight with a result is from October 4, 2026/)).toBeInTheDocument()
  })

  it('the track record compares the model with simple rules and shows its back-tested calibration', async () => {
    renderAt('/track-record')
    expect(await screen.findByText('The model and simpler methods', undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText('Pick at random')).toBeInTheDocument()
    expect(screen.getByText(/Back-test: when the model says X%/)).toBeInTheDocument()
  })

  it('a matchup built on thin data says so next to the percentage', async () => {
    renderAt('/matchup-intelligence?a=Alpha%20One&b=Beta%20Two')
    const note = await screen.findByLabelText('Data behind this prediction', undefined, { timeout: 10000 })
    expect(note).toHaveTextContent(/thin data/i)
    expect(note).toHaveTextContent(/Beta Two has only 2 recorded fights/)
  })

  it('the upcoming fights can be filtered by the favorite’s chance, from the address or from the page', async () => {
    renderAt('/events?chance=clear')
    expect(await screen.findByText('1 fight found', undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText('Gamma Three')).toBeInTheDocument() // 72%
    expect(screen.queryByText('Beta Two')).not.toBeInTheDocument() // the other fight of the card has no pick

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /favorite.s chance/i }), 'even')
    expect(await screen.findByText('0 fights found')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.queryByText(/fights? found/)).not.toBeInTheDocument()
  })

  it('a shared matchup shows the result before the corners, and says in words what weighed', async () => {
    renderAt('/matchup-intelligence?a=Alpha%20One&b=Beta%20Two')
    const words = await screen.findByRole('heading', { name: 'In words' }, { timeout: 10000 })
    expect(screen.getByText(/What weighs most for Alpha One: age difference\. Alpha One is 28; Beta Two is 36\./)).toBeInTheDocument()
    expect(screen.getAllByText('Alpha One is 28; Beta Two is 36.')).toHaveLength(1)
    const corner = screen.getAllByText('Red corner')[0]
    expect(words.compareDocumentPosition(corner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('with no fight chosen the corners come first', async () => {
    renderAt('/predictor')
    const corner = (await screen.findAllByText('Red corner', undefined, { timeout: 10000 }))[0]
    const result = screen.getByRole('heading', { name: 'Chance of winning' })
    expect(corner.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a division can be run as a round robin, with the full grid under the standings', async () => {
    renderAt('/rankings')
    await userEvent.click(await screen.findByRole('button', { name: /run the round robin/i }, { timeout: 10000 }))
    const section = await screen.findByLabelText('Division round robin')
    expect(await screen.findByText('1. Alpha One')).toBeInTheDocument()
    expect(section).toHaveTextContent('65%')
    expect(screen.getByRole('table')).toHaveTextContent(/Chance that the fighter in the row beats/)
  })

  it('the model page says its metrics could not be reproduced', async () => {
    renderAt('/model')
    expect(await screen.findByLabelText('About these metrics', undefined, { timeout: 10000 })).toHaveTextContent(/could not be reproduced/i)
  })

  it('the model page shows the accuracy measured on recent fights, not the one in the model file', async () => {
    renderAt('/model')
    expect(await screen.findByText('62.2%', undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText(/Accuracy \(1,752 recent fights\)/)).toBeInTheDocument()
    expect(screen.queryByText('75.0%')).not.toBeInTheDocument()  // the reported figure (fixture: 0.75) is not shown as a result
  })

  it('an unknown address shows the not-found page', async () => {
    renderAt('/nothing-here')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })
})
