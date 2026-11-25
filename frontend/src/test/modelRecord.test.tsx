import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '../i18n'
import { ModelRecordPanel } from '../shared/components/ModelRecordPanel'
import { SurprisesCard } from '../shared/components/SurprisesCard'
import { respond } from './fixtures'

vi.mock('axios', () => {
  const instance = { get: async (url: string) => ({ data: respond(url) }), post: async () => ({ data: respond('/predict') }) }
  return { default: { create: () => instance }, create: () => instance }
})

beforeEach(async () => {
  await i18n.changeLanguage('en-US')
})

describe('the model on one fighter', () => {
  it('tells the back-test and the live picks apart, with the wins the model expected', async () => {
    render(<ModelRecordPanel name="Alpha One" />)
    const panel = await screen.findByRole('region', { name: 'The model and Alpha One' })
    expect(within(panel).getByText(/Right on 3 of 5 fights\. The model expected 2\.6 wins; there were 4\./)).toHaveTextContent('between 23% and 88%')
    expect(within(panel).getByText(/Right on the only fight/)).toHaveTextContent('Too few fights to judge the model on this athlete.')
    expect(within(panel).getByText(/only seen earlier fights/)).toBeInTheDocument()
    expect(within(panel).getByText('vs. Zeta Six')).toBeInTheDocument()
  })

  it('shows the newest fights first and the rest on request', async () => {
    render(<ModelRecordPanel name="Alpha One" />)
    const more = await screen.findByRole('button', { name: 'Show all 5 fights' })
    expect(screen.queryByText('vs. Epsilon Five')).not.toBeInTheDocument()
    await userEvent.click(more)
    expect(screen.getByText('vs. Epsilon Five')).toBeInTheDocument()
  })

  it('draws nothing for a fighter with no record', async () => {
    const { container } = render(<ModelRecordPanel name="Beta Two" />)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container).toBeEmptyDOMElement()
  })

  it.each([['pt-BR', /Acertou 3 de 5 lutas\. O modelo esperava 2,6 vitórias; foram 4\./], ['fr-FR', /Juste sur 3 combats sur 5/], ['es-419', /Acertó 3 de 5 peleas/]])('speaks %s', async (language, expected) => {
    await i18n.changeLanguage(language)
    render(<ModelRecordPanel name="Alpha One" />)
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })
})

it('lists who surprised the model, and says that part of it is chance', async () => {
  render(
    <MemoryRouter>
      <SurprisesCard />
    </MemoryRouter>,
  )
  expect(await screen.findByText('7 wins (3.3 expected)')).toBeInTheDocument()
  expect(screen.getByText('1 win (2.4 expected)')).toBeInTheDocument()
  expect(screen.getByText(/part of this is chance/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Alpha One' })).toHaveAttribute('href', '/athlete/alpha-one')
})
