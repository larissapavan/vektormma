import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FinishBreakdown } from '../shared/components/FinishBreakdown'

const dna = { subs: 4, kos: 6, decs: 10, subPct: 20, koPct: 30, decPct: 50 }

describe('FinishBreakdown', () => {
  it('shows each way of winning with its count and share, and the finish rate', () => {
    render(<FinishBreakdown dna={dna} finishRate={50} language="en" />)
    expect(screen.getByText(/FINISH BREAKDOWN/)).toBeInTheDocument()
    expect(screen.getByText(/50% FINISHER/)).toBeInTheDocument()
    expect(screen.getByText(/SUBMISSIONS/)).toHaveTextContent('4 SUBMISSIONS (20%)')
    expect(screen.getByText(/KNOCKOUTS/)).toHaveTextContent('6 KNOCKOUTS (30%)')
    expect(screen.getByText(/DECISIONS/)).toHaveTextContent('10 DECISIONS (50%)')
  })

  it('is written in the language it is given', () => {
    render(<FinishBreakdown dna={dna} finishRate={50} language="pt" />)
    expect(screen.getByText(/FINALIZADOR/)).toBeInTheDocument()
    expect(screen.getByText(/NOCAUTES/)).toHaveTextContent('6 NOCAUTES (30%)')
  })
})
