import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { mostlyUnmeasured } from '../shared/data/orgFormat'
import { isEvenProbability, localizePredictionMessage, noFavoriteText } from '../shared/data/probability'
import { orgRoutes, pflChampion, pflContender, respond, routes } from './fixtures'

// ONE's profiles: most of them have a name, a division and the bouts in ONE, and no record, age or measurements.
const blank = { wins: null, losses: null, draws: null, win_rate: null, age: null, height_cm: null, reach_cm: null, country: null, country_code: null, hometown: null, camp: null }
const ana = { ...(pflChampion as Record<string, unknown>), ...blank, belt: false, name: 'Ana Lima' }
const bia = { ...(pflContender as Record<string, unknown>), ...blank, name: 'Bia Costa' }
const measured = routes['/predict'] as Record<string, unknown>
const profile = (source: Record<string, unknown>) => ({ ...source, wins: 0, losses: 0, draws: 0, total_fights: 0, data_origin: 'one' })

vi.mock('axios', () => {
  const instance = { get: async (url: string) => ({ data: respond(url) }), post: async () => ({ data: respond('/predict') }) }
  return { default: { create: () => instance }, create: () => instance }
})

beforeEach(() => {
  orgRoutes['/orgs/one/fighters'] = [ana, bia]
  routes['/predict'] = {
    ...measured,
    predicted_winner: 'Ana Lima',
    probability: 0.5,
    fighter_a_probability: 0.5,
    fighter_b_probability: 0.5,
    message: 'The model has no data that sets these two fighters apart.',
    fighter_a_profile: profile(ana),
    fighter_b_profile: profile(bia),
    comparison_stats: { fighter_a_win_rate: null, fighter_b_win_rate: null, reach_difference: null, age_difference: null },
    data_confidence: { level: 'thin', label: 'Thin data', reasons: ['Ana Lima has no career record on file.'] },
    main_factors: [{ feature: 'Age difference', impact: 'Ana Lima', explanation: '', magnitude: 0 }],
  }
})

describe('the ONE predictor with two profiles the file says nothing about', () => {
  it('names no favorite, lists no factors and shows no 0-0 record', async () => {
    render(
      <MemoryRouter initialEntries={['/one/predictor?a=Ana+Lima&b=Bia+Costa']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('No favorite', undefined, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText(noFavoriteText('en-US'))).toBeInTheDocument()
    expect(screen.queryByText('Projected winner')).not.toBeInTheDocument()
    expect(screen.queryByText('Why the model leans')).not.toBeInTheDocument()
    expect(screen.queryByText(/0-0/)).not.toBeInTheDocument()
    expect(screen.getByText('Ana Lima has no career record on file.')).toBeInTheDocument()
    const notice = await screen.findByRole('complementary', { name: 'About these predictions' })
    expect(await within(notice).findByText(/For most ONE fighters we have no record, age or measurements/)).toBeInTheDocument()
  })
})

describe('an even probability', () => {
  it('is exactly 50%, not a close fight', () => {
    expect(isEvenProbability(0.5)).toBe(true)
    expect(isEvenProbability(0.501)).toBe(false)
  })

  it('has its own sentence in every language', () => {
    const said = ['pt-BR', 'en-US', 'fr-FR', 'es-419'].map((lang) => localizePredictionMessage('The model has no data that sets these two fighters apart.', 'Ana Lima', lang))
    expect(new Set(said).size).toBe(4)
    for (const text of said) expect(text).not.toContain('Ana Lima')
  })
})

describe('mostlyUnmeasured', () => {
  it('asks whether most of the file lacks an age or a height', () => {
    const full = { age: 30, height_cm: 180 }
    const empty = { age: null, height_cm: null }
    expect(mostlyUnmeasured([])).toBe(false)
    expect(mostlyUnmeasured([full, full, empty])).toBe(false)
    expect(mostlyUnmeasured([full, empty, empty])).toBe(true)
  })
})
