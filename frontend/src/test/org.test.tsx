import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { ORGS, orgEs, orgFr, orgFromPathname, orgPath, orgPt, switchOrgPath } from '../shared/data/orgs'
import { compareDivisions, fightSummary, formatHeight, formatMethod, formatReach, formatRecord, profileSource } from '../shared/data/orgFormat'
import { respond } from './fixtures'

// Every URL the fake API was asked for, so a test can tell which catalogs a page downloaded.
const api = vi.hoisted(() => ({ requested: [] as string[] }))

vi.mock('axios', () => {
  const instance = {
    get: async (url: string) => {
      api.requested.push(url)
      return { data: respond(url) }
    },
    post: async () => ({ data: respond('/predict') }),
  }
  return { default: { create: () => instance }, create: () => instance }
})

function renderAt(path: string) {
  api.requested.length = 0
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const WAIT = { timeout: 10000 }

describe('organization paths', () => {
  it('the UFC keeps the site root and every other organization gets its own prefix', () => {
    expect(orgFromPathname('/')).toBe(ORGS.ufc)
    expect(orgFromPathname('/events')).toBe(ORGS.ufc)
    expect(orgFromPathname('/pfl')).toBe(ORGS.pfl)
    expect(orgFromPathname('/pfl/fighters')).toBe(ORGS.pfl)
    expect(orgFromPathname('/pflx/fighters')).toBe(ORGS.ufc)

    expect(orgPath(ORGS.ufc)).toBe('/home')  // the site root is the page that chooses an organization
    expect(orgPath(ORGS.ufc, 'events')).toBe('/events')
    expect(orgPath(ORGS.pfl)).toBe('/pfl')
    expect(orgPath('pfl', 'rankings')).toBe('/pfl/rankings')
  })

  it('switching organization keeps the section when the other organization has it', () => {
    expect(switchOrgPath(ORGS.pfl, '/events')).toBe('/pfl/events')
    expect(switchOrgPath(ORGS.pfl, '/rankings')).toBe('/pfl/rankings')
    expect(switchOrgPath(ORGS.ufc, '/pfl/fighters')).toBe('/fighters')
    expect(switchOrgPath(ORGS.pfl, '/predictor')).toBe('/pfl/predictor')
    expect(switchOrgPath(ORGS.bellator, '/predictor')).toBe('/bellator')  // an archive: no predictor
    expect(switchOrgPath(ORGS.rizin, '/predictor')).toBe('/rizin')  // no predictor there: its home page
    expect(switchOrgPath(ORGS.ufc, '/pfl')).toBe('/home')
    expect(switchOrgPath(ORGS.pfl, '/')).toBe('/pfl')  // from the chooser there is no section to keep
  })
})

describe('the article an organization takes in each language', () => {
  it('Portuguese: "a PFL" and "a LFA", "o Bellator" and "o UFC", with the preposition fused', () => {
    expect(orgPt(ORGS.pfl, 'em')).toBe('na PFL')
    expect(orgPt(ORGS.pfl, 'de')).toBe('da PFL')
    expect(orgPt(ORGS.lfa, 'O')).toBe('A LFA')
    expect(orgPt(ORGS.bellator, 'de')).toBe('do Bellator')
    expect(orgPt(ORGS.bellator, 'em')).toBe('no Bellator')
    expect(orgPt(ORGS.ufc, 'o')).toBe('o UFC')
  })

  it('French: "l’UFC", "la PFL", "le Bellator" and none at all for ONE, RIZIN or OKTAGON', () => {
    expect(orgFr(ORGS.ufc, 'à')).toBe('à l’UFC')
    expect(orgFr(ORGS.ufc, 'de')).toBe('de l’UFC')
    expect(orgFr(ORGS.pfl, 'à')).toBe('à la PFL')
    expect(orgFr(ORGS.pfl, 'de')).toBe('de la PFL')
    expect(orgFr(ORGS.pfl, 'Le')).toBe('La PFL')
    expect(orgFr(ORGS.bellator, 'à')).toBe('au Bellator')
    expect(orgFr(ORGS.bellator, 'de')).toBe('du Bellator')
    expect(orgFr(ORGS['jungle-fight'], 'le')).toBe('le Jungle Fight')
    expect(orgFr(ORGS.one, 'de')).toBe('d’ONE')
    expect(orgFr(ORGS.oktagon, 'de')).toBe('d’OKTAGON')
    expect(orgFr(ORGS.rizin, 'de')).toBe('de RIZIN')
    expect(orgFr(ORGS.rizin, 'à')).toBe('à RIZIN')
    expect(orgFr(ORGS.ufc, 'Le')).toBe('L’UFC')
  })

  it('Spanish: "la UFC", "la PFL" and "la LFA", but "Bellator" and "ONE Championship" without one', () => {
    expect(orgEs(ORGS.lfa)).toBe('la LFA')
    expect(orgEs(ORGS.pfl)).toBe('la PFL')
    expect(orgEs(ORGS.one)).toBe('ONE Championship')
    expect(orgEs(ORGS.bellator)).toBe('Bellator')
  })
})

describe('one history for a fighter who fought in several organizations', () => {
  it('the UFC profile lists the fights elsewhere, newest first, and says they are not counted in the UFC numbers', async () => {
    renderAt('/fighters?fighter=Alpha%20One')
    const panel = await screen.findByRole('region', { name: 'Fights in other organizations' }, WAIT)
    expect(within(panel).getByText(/Also fought in the Bellator · 12-4-0 there/)).toBeInTheDocument()
    expect(within(panel).getAllByRole('listitem')).toHaveLength(4)  // the newest four first
    expect(within(panel).getByText(/UFC record, trends and the model's picks above count UFC fights only/)).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('button', { name: 'Show all 6 Bellator fights' }))
    expect(within(panel).getAllByRole('listitem')).toHaveLength(6)
  })
})

describe('the page that chooses an organization', () => {
  const chooser = () => screen.getByRole('heading', { name: /pick an organization/i }).closest('section')!

  it('lists every organization with a way in, and says which one has predictions', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /pick an organization/i }, WAIT)
    const section = chooser()
    const links = within(section).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/home', '/pfl', '/one', '/bellator', '/rizin', '/ksw', '/lfa', '/cage-warriors', '/oktagon', '/jungle-fight', '/invicta'])
    expect(within(section).getAllByText('AI Predictions')).toHaveLength(3)  // the UFC, the PFL and ONE
    expect(within(section).getByText('Historical Archive')).toBeInTheDocument()  // Bellator
    // The other seven (fighters and events only) are one line each under a single caption, not a badge apiece.
    expect(within(section).getByText('Events, results and fighters of each league.')).toBeInTheDocument()
    expect(within(section).queryByText('Events & Results')).not.toBeInTheDocument()
  })

  it('has no switcher, section menu or fighter search until an organization is chosen', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /pick an organization/i }, WAIT)
    expect(screen.queryByRole('group', { name: 'Organization' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Fighters' })).not.toBeInTheDocument()
  })

  it('opens at once, without waiting for the API', async () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /pick an organization/i })).toBeInTheDocument()  // synchronously: no loading screen first
    expect(within(chooser()).getAllByRole('link')).toHaveLength(11)
  })

  it('choosing one opens its home page, where the switcher and the logo lead back', async () => {
    renderAt('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Open Professional Fighters League' }, WAIT))
    // The PFL has predictions now, so its home is the same page as the UFC's and ONE's: the next card first.
    expect(await screen.findByRole('heading', { name: 'PFL Future' }, WAIT)).toBeInTheDocument()
    expect(document.documentElement.dataset.org).toBe('pfl')
    expect(screen.getByRole('group', { name: 'Organization' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vektor MMA home' })).toHaveAttribute('href', '/')
  })

  it('the UFC home page is still reachable and its other pages keep their addresses', async () => {
    renderAt('/home')
    expect(await screen.findAllByText('Alpha One', undefined, WAIT)).not.toHaveLength(0)
    const nav = screen.getByRole('group', { name: 'Organization' })
    expect(within(nav).getByRole('link', { name: 'UFC' })).toHaveAttribute('href', '/home')
    expect(screen.getAllByRole('link', { name: 'Events' })[0]).toHaveAttribute('href', '/events')
  })
})

describe('where a profile link goes', () => {
  it('is named after the site of the address, so a RIZIN fighter can link to ESPN or to Sherdog', () => {
    expect(profileSource('https://www.espn.com/mma/fighter/_/id/123', 'ESPN, Sherdog')).toBe('ESPN')
    expect(profileSource('https://www.sherdog.com/fighter/Kyoji-Horiguchi-1', 'ESPN, Sherdog')).toBe('Sherdog')
    expect(profileSource('https://www.onefc.com/athletes/x/', 'ONE')).toBe('onefc.com')
    expect(profileSource('https://oktagonmma.com/en/fighters/x/', 'OKTAGON')).toBe('oktagonmma.com')
  })

  it('falls back to the organization source when the address is missing or not an address', () => {
    expect(profileSource(null, 'ESPN, Sherdog')).toBe('ESPN, Sherdog')
    expect(profileSource('not a url', 'ESPN, Sherdog')).toBe('ESPN, Sherdog')
  })
})

describe('how an organization’s numbers are written', () => {
  it('method, round and time read like the UFC pages', () => {
    expect(formatMethod('U-DEC')).toBe('Unanimous Decision')
    expect(formatMethod('SUB', 'Armbar')).toBe('Submission (Armbar)')
    expect(formatMethod('DEC')).toBe('Decision')
    expect(formatMethod(null)).toBeNull()
    expect(fightSummary({ method: 'KO/TKO', method_detail: null, round: 1, time: '0:46' })).toBe('Knockout · R1 · 0:46')
    expect(fightSummary({ method: null, method_detail: null, round: null, time: null })).toBeNull()
  })

  it('height, reach and record', () => {
    expect(formatHeight(167.6)).toBe('5\'6" (168 cm)')
    expect(formatReach(175.3)).toBe('69" (175 cm)')
    expect(formatHeight(null)).toBeNull()
    expect(formatRecord({ wins: 25, losses: 8, draws: 0, no_contests: 0 })).toBe('25-8-0')
    expect(formatRecord({ wins: 25, losses: 7, draws: 1, no_contests: 1 })).toBe('25-7-1 (1 NC)')
    expect(formatRecord({ wins: null, losses: null, draws: null, no_contests: null })).toBeNull()
  })

  it('divisions sort from light to heavy, men first', () => {
    const divisions = ["Women's Flyweight", 'Heavyweight', 'Catchweight', 'Bantamweight', 'Light Heavyweight']
    expect([...divisions].sort(compareDivisions)).toEqual(['Bantamweight', 'Light Heavyweight', 'Heavyweight', "Women's Flyweight", 'Catchweight'])
  })
})

describe('the PFL pages', () => {
  it('the home page shows the next card, the champions and the latest results', async () => {
    renderAt('/pfl')
    expect(await screen.findByRole('heading', { name: 'PFL Future' }, WAIT)).toBeInTheDocument()
    expect(await screen.findByText('Lightweight title fight', undefined, WAIT)).toBeInTheDocument()
    const champions = await screen.findByRole('region', { name: 'Champions' }, WAIT)
    expect(await within(champions).findByRole('button', { name: /Riko Stone/ }, WAIT)).toBeInTheDocument()
    const latest = screen.getByRole('region', { name: 'Latest results' })
    expect(await within(latest).findByText('Submission (Armbar) · R2 · 3:10', undefined, WAIT)).toBeInTheDocument()
  })

  it('the PFL pages never download the UFC catalog', async () => {
    renderAt('/pfl/fighters')
    await screen.findByText('Dax Moore', undefined, WAIT)
    expect(api.requested.filter((url) => url === '/fighters')).toHaveLength(0)
    expect(api.requested).toContain('/orgs/pfl/fighters')
  })

  it('the fighter list shows active fighters first and the veterans only on request', async () => {
    renderAt('/pfl/fighters')
    expect(await screen.findByText('Riko Stone', undefined, WAIT)).toBeInTheDocument()
    expect(screen.getByText('Dax Moore')).toBeInTheDocument()
    expect(screen.queryByText('Lena Ortiz')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'All time' }))
    expect(await screen.findByText('Lena Ortiz')).toBeInTheDocument()
  })

  it('a fighter can be found by name, nickname or division', async () => {
    renderAt('/pfl/fighters')
    await screen.findByText('Riko Stone', undefined, WAIT)
    await userEvent.type(screen.getByRole('textbox', { name: 'Search fighters' }), 'wall')
    expect(screen.getByText('Riko Stone')).toBeInTheDocument()
    expect(screen.queryByText('Dax Moore')).not.toBeInTheDocument()
  })

  it('opening a fighter shows the record, the build and every fight', async () => {
    renderAt('/pfl/fighters')
    await userEvent.click(await screen.findByRole('button', { name: /Dax Moore\. View profile/ }, WAIT))
    const dialog = await screen.findByRole('dialog', { name: /Dax Moore/ }, WAIT)
    expect(within(dialog).getByText(/15V - 3D/)).toBeInTheDocument()  // the whole career record
    expect(within(dialog).getByText('175 cm')).toBeInTheDocument()
    expect(within(dialog).getByText('5\'9"')).toBeInTheDocument()
    expect(within(dialog).getByText(/CONTENDER #1/)).toBeInTheDocument()
    expect(within(dialog).getByText(/NEXT BOUT/)).toBeInTheDocument()
    // The PFL prints season tallies on its pages: they are shown as printed, newest season first, with what they are.
    const seasonRows = within(within(dialog).getByRole('table')).getAllByRole('row')
    expect(seasonRows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('SeasonStrikes'),
      '202576 / 14427 / 5338 / 8011 / 111 / 117.55 mph',
      '20249 / 28———0 / 0—',
    ])
    expect(within(dialog).getByText(/PFL's own count, not comparable to UFC statistics/)).toBeInTheDocument()

    // The season timeline opens the bouts of a year, with how each one ended.
    // jsdom has no scrolling or pointer capture, which the timeline uses to centre a year and to drag.
    Element.prototype.scrollTo = () => undefined
    Element.prototype.hasPointerCapture = () => false
    const seasons = await within(dialog).findAllByRole('listitem', undefined, WAIT)
    expect(seasons[0]).toHaveTextContent('2026')
    await userEvent.click(seasons[0])
    expect(await within(dialog).findByText('Submission', undefined, WAIT)).toBeInTheDocument()
    expect(within(dialog).getByText('Round 2 (3:10)')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close fighter profile' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('a fighter who also fought in the UFC opens one profile, the UFC one, instead of the organization own', async () => {
    renderAt('/pfl/fighters')
    await userEvent.click(await screen.findByRole('button', { name: /Riko Stone\. View profile/ }, WAIT))
    expect(await screen.findByRole('heading', { level: 1, name: 'Riko Stone' }, WAIT)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close performance profile' })).toBeInTheDocument()  // the UFC profile's own window
    expect(screen.queryByRole('dialog', { name: /PFL fighter profile/ })).not.toBeInTheDocument()
  })

  it('a fighter who never fought in the UFC keeps the organization own profile', async () => {
    renderAt('/pfl/fighters')
    await userEvent.click(await screen.findByRole('button', { name: /Dax Moore\. View profile/ }, WAIT))
    expect(await screen.findByRole('dialog', { name: /Dax Moore, PFL fighter profile/ }, WAIT)).toBeInTheDocument()
  })

  it('a profile can be opened from a link (?fighter=)', async () => {
    renderAt('/pfl/fighters?fighter=Dax%20Moore')
    expect(await screen.findByRole('dialog', { name: /Dax Moore/ }, WAIT)).toBeInTheDocument()
  })

  it('events lists the upcoming card and the archive by year', async () => {
    renderAt('/pfl/events')
    expect(await screen.findByRole('heading', { name: 'PFL fight cards' }, WAIT)).toBeInTheDocument()
    expect(await screen.findByText('PFL Future', undefined, WAIT)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^2026/ }, WAIT)).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /^2024/ })).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(screen.getByRole('button', { name: /PFL Chicago/ }))
    expect(await screen.findByText('Submission (Armbar) · R2 · 3:10')).toBeInTheDocument()
  })

  it('searching events also looks at the fighters on the card', async () => {
    renderAt('/pfl/events')
    await screen.findByText('PFL Future', undefined, WAIT)
    await userEvent.type(screen.getByRole('textbox', { name: 'Search events' }), 'lena')
    expect(await screen.findByText('PFL Old Night')).toBeInTheDocument()
    expect(screen.queryByText('PFL Chicago')).not.toBeInTheDocument()
  })

  it('rankings show the champion first and open a profile', async () => {
    renderAt('/pfl/rankings')
    const champion = await screen.findByRole('button', { name: /Riko Stone, rank champion/ }, WAIT)
    expect(within(champion).getByText('Champion')).toBeInTheDocument()
    const contender = screen.getByRole('button', { name: /Dax Moore, rank 1/ })
    expect(within(contender).getByTitle('Up 2 places')).toBeInTheDocument()

    await userEvent.click(contender)
    expect(await screen.findByRole('dialog', { name: /Dax Moore/ }, WAIT)).toBeInTheDocument()
  })

  it('the pound-for-pound tab lists its own table', async () => {
    renderAt('/pfl/rankings')
    await userEvent.click(await screen.findByRole('button', { name: 'Pound-for-Pound' }, WAIT))
    expect(await screen.findByText('1 listed')).toBeInTheDocument()
  })
})

describe('the Bellator archive', () => {
  it('says it is an archive instead of announcing a next card and shows archive sections and title history', async () => {
    renderAt('/bellator')
    expect(await screen.findByRole('note', undefined, WAIT)).toHaveTextContent(/last event in 2023/i)
    expect(screen.queryByRole('region', { name: 'Next event' })).not.toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Archive sections' }, WAIT)).toBeInTheDocument()
    const history = await screen.findByRole('region', { name: 'Title history' }, WAIT)
    expect(await within(history).findByText(/def\. Dax Moore/i, undefined, WAIT)).toBeInTheDocument()
    expect(screen.getByText(/Archive built from ESPN and Wikipedia/)).toBeInTheDocument()
  })

  it('lists everyone who ever fought there without an active-only filter', async () => {
    renderAt('/bellator/fighters')
    expect(await screen.findByText('Lena Ortiz', undefined, WAIT)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Status' })).not.toBeInTheDocument()
  })

  it('has no rankings page: no menu entry, no route, and the final champions sit on the home page', async () => {
    renderAt('/bellator')
    const champions = await screen.findByRole('region', { name: 'Champions' }, WAIT)
    expect(await within(champions).findByRole('button', { name: /Riko Stone/ }, WAIT)).toBeInTheDocument()
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).not.toContain('/bellator/rankings')
  })

  it('an address that does not exist for it is the not-found page', async () => {
    renderAt('/bellator/rankings')
    expect(await screen.findByRole('heading', { name: /page not found/i }, WAIT)).toBeInTheDocument()
  })

  it('switching from the UFC rankings to Bellator lands on its home page', () => {
    expect(switchOrgPath(ORGS.bellator, '/rankings')).toBe('/bellator')
    expect(switchOrgPath(ORGS.pfl, '/rankings')).toBe('/pfl/rankings')
  })

  it('is one more choice in the switcher, keeping the section', async () => {
    renderAt('/events')
    await screen.findByRole('heading', { name: 'UFC fight cards' }, WAIT)
    const switcher = screen.getAllByRole('group', { name: 'Organization' })[0]
    expect(within(switcher).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/events', '/pfl/events', '/one/events', '/bellator/events', '/rizin/events', '/ksw/events', '/lfa/events', '/cage-warriors/events',
      '/oktagon/events', '/jungle-fight/events', '/invicta/events',
    ])
  })
})

// Organizations whose source (ESPN, their own site or Sherdog) gives fighters and events but no belts or rankings.
const FIGHTERS_AND_EVENTS_ORGS = [
  { id: 'rizin', name: 'RIZIN Fighting Federation', short: 'RIZIN' },
  { id: 'ksw', name: 'Konfrontacja Sztuk Walki', short: 'KSW' },
  { id: 'lfa', name: 'Legacy Fighting Alliance', short: 'LFA' },
  { id: 'cage-warriors', name: 'Cage Warriors', short: 'Cage Warriors' },
  { id: 'oktagon', name: 'OKTAGON MMA', short: 'OKTAGON' },
  { id: 'jungle-fight', name: 'Jungle Fight', short: 'Jungle Fight' },
  { id: 'invicta', name: 'Invicta Fighting Championships', short: 'Invicta FC' },
] as const

describe.each(FIGHTERS_AND_EVENTS_ORGS)('$short (fighters and events only)', ({ id, name }) => {
  const base = `/${id}`

  it('knows its own addresses, name and colors', () => {
    expect(orgFromPathname(`${base}/fighters`)).toBe(ORGS[id])
    expect(orgPath(id, 'events')).toBe(`${base}/events`)
    expect(ORGS[id].name).toBe(name)
    expect(ORGS[id]).toMatchObject({ hasPredictions: false, hasRankings: false, hasChampions: false })
    expect(ORGS[id].archived).toBeUndefined()
  })

  it('a UFC page that it has no equivalent of sends the visitor to its home page', () => {
    expect(switchOrgPath(ORGS[id], '/rankings')).toBe(base)
    expect(switchOrgPath(ORGS[id], '/champions')).toBe(base)
    expect(switchOrgPath(ORGS[id], '/predictor')).toBe(base)
    expect(switchOrgPath(ORGS[id], '/fighters')).toBe(`${base}/fighters`)
  })

  it('lists its fighters and its events, with its own color theme', async () => {
    renderAt(`${base}/fighters`)
    expect(await screen.findByText('Riko Stone', undefined, WAIT)).toBeInTheDocument()  // active
    expect(screen.queryByText('Lena Ortiz')).not.toBeInTheDocument()  // a veteran: only on request
    expect(document.documentElement.dataset.org).toBe(id)
    expect(api.requested.some((url) => url.includes(`/orgs/${id}/fighters`))).toBe(true)
    expect(api.requested.some((url) => url.startsWith('/fighters') || url.includes('/catalog'))).toBe(false)  // never downloads the UFC catalog
  })

  it('has fighters, events and gyms in its menu, and no rankings, champions or predictor', async () => {
    renderAt(`${base}/events`)
    await screen.findByRole('heading', { name: `${ORGS[id].shortName} fight cards` }, WAIT)
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(links).toEqual(expect.arrayContaining([`${base}/fighters`, `${base}/events`, `${base}/gyms`]))
    for (const missing of ['rankings', 'champions', 'predictor']) expect(links).not.toContain(`${base}/${missing}`)
  })

  it('has no champions section and does not promise daily, official data: it says what its source gives', async () => {
    renderAt(base)
    expect(await screen.findByText(/No belts or rankings\./, undefined, WAIT)).toBeInTheDocument()
    expect(screen.getByText(/events and fights may be missing, and it is not refreshed daily/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Champions' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Champions are not available yet/)).not.toBeInTheDocument()
    expect(screen.queryByText(/refreshed daily\.$/)).not.toBeInTheDocument()
  })

  it('an address for a page it does not have is the not-found page', async () => {
    renderAt(`${base}/rankings`)
    expect(await screen.findByRole('heading', { name: /page not found/i }, WAIT)).toBeInTheDocument()
  })
})

describe('ONE Championship', () => {
  it('renders upcoming cards, champions, rankings and past events on /one', async () => {
    renderAt('/one')
    expect(await screen.findByRole('heading', { name: 'ONE Fight Night 49: Gabriel vs. Magomedov' }, WAIT)).toBeInTheDocument()
    const champions = await screen.findByRole('region', { name: 'Champions' }, WAIT)
    expect(await within(champions).findByRole('button', { name: /Riko Stone/ }, WAIT)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Rankings' })[0]).toHaveAttribute('href', '/one/rankings')
    expect(screen.getAllByRole('link', { name: 'Champions' })[0]).toHaveAttribute('href', '/one/champions')
  })

  it('flags a bout that is not MMA with its sport, and does not flag an MMA bout', async () => {
    renderAt('/one')
    const latest = await screen.findByRole('region', { name: 'Latest results' }, WAIT)
    expect(await within(latest).findByText('Muay Thai', undefined, WAIT)).toHaveAttribute('title', expect.stringMatching(/not an MMA bout/i))
    expect(within(latest).getAllByText('Muay Thai')).toHaveLength(1)
    expect(within(latest).getByText('Lena Ortiz')).toBeInTheDocument()  // the MMA bout is on the card too...
    expect(within(latest).queryByText('MMA')).not.toBeInTheDocument()  // ...and carries no sport tag
  })

  it('flags the main event of the next card too when it is not MMA', async () => {
    renderAt('/one')
    expect(await screen.findByRole('heading', { name: 'ONE Fight Night 49: Gabriel vs. Magomedov' }, WAIT)).toBeInTheDocument()
    expect(await screen.findByText('Kickboxing', undefined, WAIT)).toHaveAttribute('title', expect.stringMatching(/counts in the record/i))
  })
})

describe('the organization switcher', () => {
  it('moves to the same section of the other organization', async () => {
    renderAt('/events')
    await screen.findByRole('heading', { name: 'UFC fight cards' }, WAIT)
    const switcher = screen.getAllByRole('group', { name: 'Organization' })[0]
    await userEvent.click(within(switcher).getByRole('link', { name: 'PFL' }))
    expect(await screen.findByRole('heading', { name: 'PFL fight cards' }, WAIT)).toBeInTheDocument()
    expect(document.documentElement.dataset.org).toBe('pfl')

    await userEvent.click(within(screen.getAllByRole('group', { name: 'Organization' })[0]).getByRole('link', { name: 'UFC' }))
    expect(await screen.findByRole('heading', { name: 'UFC fight cards' }, WAIT)).toBeInTheDocument()
    expect(document.documentElement.dataset.org).toBe('ufc')
  })

  it('the PFL menu has only the sections the PFL has', async () => {
    renderAt('/pfl/events')
    await screen.findByRole('heading', { name: 'PFL fight cards' }, WAIT)
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(links).toContain('/pfl/fighters')
    expect(links).toContain('/pfl/rankings')
    expect(links).toContain('/pfl/champions')
    expect(links).toContain('/pfl/predictor')
    expect(links).not.toContain('/predictor')
    expect(links).not.toContain('/champions')
  })

  it.each([
    { path: '/pfl/predictor', short: 'PFL', eased: true, archive: false },
    { path: '/one/predictor', short: 'ONE', eased: true, archive: false },
  ])('the $short predictor says the model comes from UFC fights, and what is different here', async ({ path, short, eased, archive }) => {
    renderAt(path)
    const notice = await screen.findByRole('complementary', { name: 'About these predictions' }, WAIT)
    expect(within(notice).getByText(/trained on UFC fights and has only been validated on them/)).toBeInTheDocument()
    expect(within(notice).getByText(new RegExp(`The ${short} data has record, age and measurements, but no striking or takedown accuracy`))).toBeInTheDocument()
    expect(/halfway between the model's output and 50%/.test(notice.textContent ?? '')).toBe(eased)
    expect(/every matchup here is hypothetical/.test(notice.textContent ?? '')).toBe(archive)
  })

  it('the Bellator archive has no predictor page and no predictor in its menu', async () => {
    renderAt('/bellator/predictor')
    expect(await screen.findByRole('heading', { name: /page not found/i }, WAIT)).toBeInTheDocument()
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).not.toContain('/bellator/predictor')
  })

  it('a PFL fighter with no season stats says so, and ONE says it does not publish any', async () => {
    renderAt('/pfl/fighters?fighter=Lena%20Ortiz')
    const pfl = await screen.findByRole('dialog', { name: /Lena Ortiz/ }, WAIT)
    expect(await within(pfl).findByText('PFL has not published striking or takedown statistics for this fighter.', undefined, WAIT)).toBeInTheDocument()
    expect(within(pfl).queryByRole('table')).not.toBeInTheDocument()
  })

  it('ONE shows no season table, even for a fighter the fixture gives season stats', async () => {
    renderAt('/one/fighters?fighter=Dax%20Moore')
    const one = await screen.findByRole('dialog', { name: /Dax Moore/ }, WAIT)
    expect(await within(one).findByText('ONE does not publish striking or takedown statistics.', undefined, WAIT)).toBeInTheDocument()
    expect(within(one).queryByRole('table')).not.toBeInTheDocument()
  })

  it('a league without a predictor has no predictor page', async () => {
    renderAt('/rizin/predictor')
    expect(await screen.findByRole('heading', { name: /page not found/i }, WAIT)).toBeInTheDocument()
  })

  it('the PFL and Bellator champions pages show current/final champions, division history and greatest champions', async () => {
    renderAt('/pfl/champions')
    expect(await screen.findByRole('heading', { name: 'PFL champions' }, WAIT)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Riko Stone/ }, WAIT)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Greatest Champions' }))
    expect(await screen.findByText(/All-Time Greatest Champions Leaderboard/i, undefined, WAIT)).toBeInTheDocument()
  })

  it('the header search finds PFL fighters on PFL pages', async () => {
    renderAt('/pfl')
    await screen.findByRole('heading', { name: 'PFL Future' }, WAIT)
    await userEvent.click(screen.getByRole('button', { name: 'Search fighters' }))
    await userEvent.type(screen.getByRole('combobox', { name: 'Find a fighter by name' }), 'dax')
    await userEvent.click(within(await screen.findByRole('option', { name: /Dax Moore/ })).getByRole('button'))
    expect(await screen.findByRole('dialog', { name: /Dax Moore/ }, WAIT)).toBeInTheDocument()
  })

  it('the footer says the data belongs to the organization on screen', async () => {
    renderAt('/pfl/events')
    expect(await screen.findByText(/not affiliated with the PFL/, undefined, WAIT)).toBeInTheDocument()
    expect(await screen.findByText(/Data up to Oct 17, 2026/, undefined, WAIT)).toBeInTheDocument()
  })
})
