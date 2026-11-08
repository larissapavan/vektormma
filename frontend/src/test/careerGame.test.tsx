import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import i18n from '../i18n'
import { createCareer, encodeRetrospect, type Retrospect } from '../shared/game/career'
import { challengeBuild, challengeResult, decodeChallenge, encodeChallenge, type Challenge } from '../shared/game/challenge'
import { SAVE_KEY } from '../shared/game/save'
import { loadTrophies, TROPHY_KEY } from '../shared/game/trophies'
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
  const view = renderAt('/career')
  await userEvent.type(await screen.findByLabelText('Name', undefined, { timeout: 10000 }), name)
  await click(/start the career/i)
  return view
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
  window.localStorage.clear()
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
    await click(/^stick to the plan/i)
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

describe('a fight, round by round', () => {
  async function toTheBell() {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await startCareer()
    await train()
    await userEvent.click(await findButton(/Easy Eddie/))
    await click(/fight easy eddie/i)
  }

  it('asks the corner what to do before every round, with the three tactics and what each one risks', async () => {
    await toTheBell()
    expect(screen.getByText(/what does the corner say for round 1/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^attack/i })).toHaveTextContent(/finish/i)
    expect(screen.getByRole('button', { name: /^stick to the plan/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^cover up/i })).toHaveTextContent(/safe/i)
    expect(screen.getByTestId('scorecard')).toHaveTextContent('0–0')
    expect(screen.getByTestId('live-band')).toBeInTheDocument()
    expect(screen.queryByTestId('fight-result')).toBeNull()
  })

  it('plays the round the player chose, moves the cards and asks again until the fight is over', async () => {
    await toTheBell()
    let rounds = 0
    while (!screen.queryByTestId('fight-result')) {
      const button = screen.getByRole('button', { name: /^attack/i })
      await userEvent.click(button)
      rounds += 1
      expect(rounds).toBeLessThanOrEqual(3)
    }
    expect(screen.getAllByText(/^round 1$/i).length).toBeGreaterThan(0)
    expect(screen.getByTestId('scorecard')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^attack/i })).toBeNull() // no more choices once it is over
    expect(screen.getByTestId('fight-result')).toHaveTextContent(/victory|defeat/i)
    // The round log says what was told to the corner when it was not the plan.
    const log = screen.getAllByRole('list').find((list) => list.getAttribute('aria-live') === 'polite')
    expect(log && within(log).getAllByText('Attack').length).toBeGreaterThan(0)
  })

  it('lets the player ask the corner, which says something about the score, and hide it again', async () => {
    await toTheBell()
    expect(screen.queryByTestId('corner-advice')).toBeNull()
    await click(/ask the corner/i)
    expect(screen.getByTestId('corner-advice')).not.toBeEmptyDOMElement()
    await click(/hide the advice/i)
    expect(screen.queryByTestId('corner-advice')).toBeNull()
  })

  it('shows the player against the chosen opponent before the fight, with the edge lit and no chance number', async () => {
    await startCareer()
    await train()
    await userEvent.click(await findButton(/Easy Eddie/))
    const duel = screen.getByRole('region', { name: /head to head/i })
    expect(duel).toHaveTextContent('Striking accuracy')
    expect(duel).toHaveTextContent('50%') // the player, from the matchmaking answer
    expect(duel).toHaveTextContent('45%') // Easy Eddie
    expect(duel).toHaveTextContent('Reach')
    expect(duel).toHaveTextContent('183 cm')
    expect(duel).toHaveTextContent('180 cm')
    expect(duel).not.toHaveTextContent(/66%/)
  })

  it('lists the last results on the fighter card once there are any', async () => {
    await startCareer()
    expect(screen.queryByRole('list', { name: /recent fights/i })).toBeNull()
    await playOneFight()
    await click(/continue the career/i)
    const strip = screen.getByRole('list', { name: /recent fights/i })
    expect(within(strip).getAllByRole('listitem')).toHaveLength(1)
    expect(strip).toHaveTextContent(/^[WL]/)
  })
})

describe('the keyboard focus', () => {
  // When a screen is replaced by the next one the focus must land on the new screen: left on a button that is gone it falls to
  // the page body, and a keyboard or screen reader user has to find their place again at every step of a career.
  it('follows the player from one screen to the next, all the way to the end', async () => {
    await startCareer('Maria Silva')
    expect(screen.getByRole('heading', { name: /camp for your ufc debut/i })).toHaveFocus()

    await train()
    await findButton(/Easy Eddie/)
    expect(screen.getByRole('heading', { name: /choose your next opponent/i })).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: /Easy Eddie/ }))
    await click(/fight easy eddie/i)
    expect(screen.getByRole('heading', { name: /vs\. Easy Eddie/ })).toHaveFocus()

    await click(/skip to the result/i)
    expect(screen.getByTestId('fight-result')).toHaveFocus()

    await click(/continue the career/i)
    expect(screen.getByRole('heading', { name: /camp for ufc fight 2/i })).toHaveFocus()
  })

  it('moves to the result when the last round is played by hand, not only when it is skipped', async () => {
    await startCareer('Maria Silva')
    await train()
    await userEvent.click(await findButton(/Easy Eddie/))
    await click(/fight easy eddie/i)
    while (!screen.queryByTestId('fight-result')) await click(/^stick to the plan/i)
    expect(screen.getByTestId('fight-result')).toHaveFocus()
  })

  it('lands on the end of the career', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await startCareer('José Aldo')
    for (let fights = 0; fights < 3; fights += 1) {
      await playOneFight()
      if (fights < 2) await click(/continue the career/i)
    }
    await click(/^retire$/i)
    expect(await screen.findByRole('heading', { name: /the career is over/i })).toHaveFocus()
  })

  it('does not take the focus when a saved career is only offered on the first screen', async () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ career: createCareer({ name: 'Old Save', division: 'Lightweight', stance: 'Orthodox', striking: 50, takedowns: 50, reach: 50 }), stage: 'camp', coaches: ['striker', 'wrestler', 'allround'], seed: 1, note: null, challenge: null, savedAt: 1 }))
    renderAt('/career')
    await screen.findByRole('button', { name: /resume the career/i }, { timeout: 10000 })
    expect(document.body).toHaveFocus()
  })
})

describe('goals and achievements', () => {
  it('gives the new career three goals to go after, each with its progress', async () => {
    await startCareer()
    const goals = screen.getByRole('region', { name: /career goals/i })
    expect(within(goals).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByTestId('goals-met')).toHaveTextContent('0/3')
    expect(goals).toHaveTextContent(/each goal pays \+2 ranking points/i)
    for (const item of within(goals).getAllByRole('listitem')) expect(item).toHaveTextContent(/\d+\/\d+/)
  })

  it('lists the achievements on the first screen, lit for the ones this browser has earned', async () => {
    window.localStorage.setItem(TROPHY_KEY, JSON.stringify({ debut: 1700000000000, champion: 1700000000001 }))
    renderAt('/career')
    expect(await screen.findByTestId('trophy-count', undefined, { timeout: 10000 })).toHaveTextContent('2/15')
    const panel = screen.getByTestId('trophy-count').closest('details') as HTMLElement
    expect(panel.querySelectorAll('[data-earned="true"]')).toHaveLength(2)
    expect(panel.querySelectorAll('[data-earned="false"]')).toHaveLength(13)
    expect(panel).toHaveTextContent('Winning debut')
    expect(panel).toHaveTextContent('Win your first UFC fight.')
  })

  it('starts the collection empty, and ignores a collection that has been tampered with', async () => {
    window.localStorage.setItem(TROPHY_KEY, JSON.stringify({ god_mode: 1, debut: 'never' }))
    renderAt('/career')
    expect(await screen.findByTestId('trophy-count', undefined, { timeout: 10000 })).toHaveTextContent('0/15')
  })

  it('shows what a fight earns and keeps it in the collection', async () => {
    // With this seed the first fight is won (the screen tests are deterministic; the engine tests cover a lost debut).
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await startCareer()
    await playOneFight()
    expect(screen.getByTestId('fight-result')).toHaveTextContent(/victory/i)
    const unlocked = screen.getByTestId('unlocked')
    expect(unlocked).toHaveTextContent(/achievement unlocked/i)
    expect(unlocked).toHaveTextContent('Winning debut')
    expect(loadTrophies().debut).toBeDefined()
  })

  it('shows the goals and the achievements of the career at the end', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await startCareer('José Aldo')
    for (let fights = 0; fights < 3; fights += 1) {
      await playOneFight()
      if (fights < 2) await click(/continue the career/i)
    }
    await click(/^retire$/i)
    expect(await screen.findByTestId('goals-summary')).toHaveTextContent(/goals met: \d of 3/i)
    expect(screen.getByText(/the achievements stay in this browser/i)).toBeInTheDocument()
    const earned = loadTrophies()
    if (Object.keys(earned).length) expect(screen.getByTestId('career-achievements')).toBeInTheDocument()
    else expect(screen.queryByTestId('career-achievements')).toBeNull()
  })

  it('pays a goal in points when a fight meets it, and says so', async () => {
    // A career that is one win from its first goal, resumed from a save. With this seed the first fight is won.
    const career = { ...createCareer({ name: 'Almost There', division: 'Lightweight', stance: 'Orthodox', striking: 50, takedowns: 50, reach: 50 }, ['wins4', 'kos2', 'upset']), wins: 9, ufcFights: 3 }
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ career, stage: 'camp', coaches: ['striker', 'wrestler', 'allround'], seed: 1, note: null, savedAt: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.11)
    renderAt('/career')
    await userEvent.click(await screen.findByRole('button', { name: /resume the career/i }, { timeout: 10000 }))
    expect(screen.getByTestId('goals-met')).toHaveTextContent('0/3')
    await train()
    await userEvent.click(await findButton(/Easy Eddie/))
    await click(/fight easy eddie/i)
    await click(/skip to the result/i)
    expect(screen.getByTestId('fight-result')).toHaveTextContent(/victory/i)
    expect(screen.getByText(/goal met: win 4 ufc fights/i)).toHaveTextContent('(+2)')
    await click(/continue the career/i)
    expect(screen.getByTestId('goals-met')).toHaveTextContent('1/3')
  })

  it('reads a career saved before goals existed as a career without goals', async () => {
    const old = JSON.parse(JSON.stringify(createCareer({ name: 'Old Save', division: 'Lightweight', stance: 'Orthodox', striking: 50, takedowns: 50, reach: 50 })))
    delete old.goals
    delete old.earned
    delete old.bestStreak
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ career: old, stage: 'camp', coaches: ['striker', 'wrestler', 'allround'], seed: 1, note: null, savedAt: 1 }))
    renderAt('/career')
    await userEvent.click(await screen.findByRole('button', { name: /resume the career/i }, { timeout: 10000 }))
    expect(screen.getByText(/camp for your ufc debut/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /career goals/i })).toBeNull()
  })
})

describe('a challenge', () => {
  const challenge = (extra: Partial<Challenge> = {}): Challenge => ({ seed: 20261108, fights: 3, target: null, ...extra })
  const linkTo = (value: Challenge) => `/career?d=${encodeChallenge(value)}`
  const target = { n: 'José Aldo', p: 22, w: 5, l: 1, ko: 3, sb: 1, dc: 1, t: 0, f: 6, e: 'retired' as const }

  async function startChallenge(value: Challenge, name = 'Ana Lima') {
    const view = renderAt(linkTo(value))
    await userEvent.type(await screen.findByLabelText('Your name', undefined, { timeout: 10000 }), name)
    await click(/start the challenge/i)
    return view
  }

  it('is offered on the first screen: the challenge of the day, and a new one', async () => {
    renderAt('/career')
    const entry = await screen.findByRole('region', { name: /^challenge$/i }, { timeout: 10000 })
    expect(within(entry).getByRole('button', { name: /today.s challenge/i })).toBeInTheDocument()
    expect(within(entry).getByRole('button', { name: /new challenge/i })).toBeInTheDocument()
    await userEvent.click(within(entry).getByRole('button', { name: /today.s challenge/i }))
    expect(await screen.findByText(/take the challenge/i)).toBeInTheDocument()
    expect(screen.getByTestId('challenge-code')).toBeInTheDocument()
    await click(/^back$/i)
    expect(await findButton(/start the career/i)).toBeInTheDocument() // back at the ordinary first screen
  })

  it('opens from a link with the fighter of the seed, the rules and what there is to beat', async () => {
    renderAt(linkTo(challenge({ target })))
    expect(await screen.findByText(/josé aldo challenged you/i, undefined, { timeout: 10000 })).toBeInTheDocument()
    const note = screen.getByTestId('challenge-target')
    expect(note).toHaveTextContent('José Aldo')
    expect(note).toHaveTextContent('22')
    expect(note).toHaveTextContent(/not been verified/i)
    expect(screen.getByTestId('challenge-code')).toHaveTextContent(`#${(20261108).toString(36).toUpperCase()}`)
    const fighter = screen.getByTestId('challenge-fighter')
    const build = challengeBuild(20261108, '')
    expect(fighter).toHaveTextContent(`${build.striking}`)
    expect(fighter).toHaveTextContent(`${build.takedowns}`)
    expect(fighter).toHaveTextContent(`${build.reach}`)
    expect(fighter).toHaveTextContent('3 fights')
    expect(screen.getByText(/no retiring early/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start the challenge/i })).toBeDisabled() // a name first
    expect(screen.getByRole('link', { name: /build my own career/i })).toHaveAttribute('href', '/career')
  })

  it('starts with the fighter of the seed, shows where the player is in it, and does not allow retiring', async () => {
    await startChallenge(challenge({ target }))
    const bar = await screen.findByTestId('challenge-bar')
    expect(bar).toHaveTextContent('Fight 1 of 3')
    expect(bar).toHaveTextContent('To beat: José Aldo, 22 pts')
    const build = challengeBuild(20261108, 'Ana Lima')
    const status = screen.getByRole('region', { name: /your fighter/i })
    expect(status).toHaveTextContent('Ana Lima')
    for (const skill of [build.striking, build.takedowns, build.reach]) expect(status).toHaveTextContent(String(skill))
    expect(screen.queryByRole('button', { name: /^retire$/i })).toBeNull()
    expect(screen.getByRole('region', { name: /career goals/i })).toBeInTheDocument()
  })

  it('offers the same coaches and the same goals to everyone who plays the same challenge', async () => {
    const coaches = () => screen.getAllByRole('button', { name: /^Coach / }).map((button) => button.textContent)
    const goals = () => within(screen.getByRole('region', { name: /career goals/i })).getAllByRole('listitem').map((item) => item.textContent)
    const first = await startChallenge(challenge(), 'Ana')
    const firstCoaches = coaches()
    const firstGoals = goals()
    expect(firstCoaches).toHaveLength(3)
    first.unmount()
    window.localStorage.clear()
    await startChallenge(challenge(), 'Bruno')
    expect(coaches()).toEqual(firstCoaches)
    expect(goals()).toEqual(firstGoals)
  })

  it('plays every fight and ends by itself, with the score, how it compares and a link that challenges someone else', async () => {
    await startChallenge(challenge({ target: { ...target, p: 500 } }))
    for (let fights = 0; fights < 3; fights += 1) {
      await playOneFight()
      expect(screen.queryByRole('button', { name: /^retire$/i })).toBeNull() // not even after the third fight, when it would be allowed
      // The last fight of the challenge does not offer to continue: the next screen is the end.
      await click(fights < 2 ? /continue the career/i : /see the retrospect/i)
    }
    const end = await screen.findByTestId('challenge-end', undefined, { timeout: 10000 })
    const score = Number(screen.getByTestId('challenge-score').textContent?.match(/\d+/)?.[0])
    expect(end).toHaveTextContent(/points/i)
    expect(screen.getByTestId('challenge-outcome')).toHaveTextContent(new RegExp(`José Aldo came out on top: 500 to ${score}`))

    const whatsapp = within(end).getByRole('link', { name: 'WhatsApp' })
    const href = decodeURIComponent(whatsapp.getAttribute('href') ?? '')
    expect(href).toContain('/en/career?d=')
    const sent = decodeChallenge(href.match(/\?d=([\w-]+)/)?.[1])
    expect(sent).toMatchObject({ seed: 20261108, fights: 3, target: { n: 'Ana Lima', p: score } })
    expect(within(end).getByRole('button', { name: /copy challenge link/i })).toBeInTheDocument()
    expect(screen.getByText(/the career is over/i)).toBeInTheDocument() // the retrospect picture comes below

    // Starting another career goes to the ordinary first screen, not back to this challenge.
    await click(/start another career/i)
    expect(await findButton(/start the career/i)).toBeInTheDocument()
    expect(screen.queryByTestId('challenge-fighter')).toBeNull()
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull()
  })

  it('keeps the challenge in the save, and offers the saved career above a challenge link', async () => {
    const first = await startChallenge(challenge(), 'Ana')
    await train()
    await findButton(/Easy Eddie/)
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? 'null')).toMatchObject({ stage: 'offers', challenge: { seed: 20261108, fights: 3, target: null } })
    first.unmount()

    renderAt(linkTo(challenge()))
    const card = await screen.findByRole('region', { name: /saved career/i }, { timeout: 10000 })
    expect(card).toHaveTextContent(`Challenge #${(20261108).toString(36).toUpperCase()}`)
    expect(screen.getByTestId('challenge-fighter')).toBeInTheDocument() // the challenge link is still there to start a new run
    await click(/resume the career/i)
    expect(await findButton(/Easy Eddie/)).toBeInTheDocument()
    expect(screen.getByTestId('challenge-bar')).toHaveTextContent('Fight 1 of 3')
    expect(screen.queryByTestId('challenge-fighter')).toBeNull()
  })

  it('ignores a damaged link and opens the ordinary game', async () => {
    renderAt('/career?d=this-is-not-a-challenge')
    expect(await findButton(/start the career/i)).toBeInTheDocument()
    expect(screen.queryByTestId('challenge-fighter')).toBeNull()
    expect(challengeResult(createCareer({ name: 'x', division: 'Lightweight', stance: 'Orthodox', striking: 50, takedowns: 50, reach: 50 })).p).toBe(0)
  })
})

describe('the saved career', () => {
  it('is written at the camp and again at the matchmaking, and can be taken up in a new visit', async () => {
    const first = await startCareer('Maria Silva')
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? 'null')).toMatchObject({ stage: 'camp', career: { name: 'Maria Silva', wins: 6 } })
    await train()
    await findButton(/Easy Eddie/)
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? 'null')).toMatchObject({ stage: 'offers' })
    first.unmount()

    renderAt('/career')
    const card = await screen.findByRole('region', { name: /saved career/i }, { timeout: 10000 })
    expect(card).toHaveTextContent('Maria Silva')
    expect(card).toHaveTextContent('6-0')
    await click(/resume the career/i)
    expect(await findButton(/Easy Eddie/)).toBeInTheDocument() // back at the matchmaking it was saved at
    expect(screen.getByTestId('record')).toHaveTextContent('6-0')
    expect(screen.queryByRole('region', { name: /saved career/i })).toBeNull()
  })

  it('can be set aside, and the creation screen stays', async () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ career: createCareer({ name: 'Old Save', division: 'Lightweight', stance: 'Orthodox', striking: 50, takedowns: 50, reach: 50 }), stage: 'camp', coaches: ['striker', 'wrestler', 'allround'], seed: 1, note: null, savedAt: 1 }))
    renderAt('/career')
    await screen.findByRole('region', { name: /saved career/i }, { timeout: 10000 })
    expect(screen.getByRole('button', { name: /start the career/i })).toBeInTheDocument()
    await click(/discard/i)
    expect(screen.queryByRole('region', { name: /saved career/i })).toBeNull()
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull()
  })

  it('ignores a save that has been tampered with', async () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ career: { ...createCareer({ name: 'Cheat', division: 'Lightweight', stance: 'Orthodox', striking: 50, takedowns: 50, reach: 50 }), striking: 9999 }, stage: 'camp', coaches: ['striker', 'wrestler', 'allround'], seed: 1, note: null, savedAt: 1 }))
    renderAt('/career')
    expect(await findButton(/start the career/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /saved career/i })).toBeNull()
  })

  it('is forgotten when the career ends', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await startCareer('José Aldo')
    for (let fights = 0; fights < 3; fights += 1) {
      await playOneFight()
      if (fights < 2) await click(/continue the career/i)
    }
    await click(/^retire$/i)
    await screen.findByText(/the career is over/i)
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull()
  })

  it('does not stop the game when the browser refuses to store anything', async () => {
    const refuse = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    try {
      await startCareer()
      expect(screen.getByText(/camp for your ufc debut/i)).toBeInTheDocument()
    } finally {
      refuse.mockRestore()
    }
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
