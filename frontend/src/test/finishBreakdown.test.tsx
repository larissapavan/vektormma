import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FinishBreakdown } from '../shared/components/FinishBreakdown'

const dna = { subs: 4, kos: 6, decs: 10, subPct: 20, koPct: 30, decPct: 50 }

describe('FinishBreakdown', () => {
  it('shows each way of winning with its count and share, and the finish rate', () => {
    render(<FinishBreakdown dna={dna} finishRate={50} language="en" />)
    expect(screen.getByText(/how the wins came/i)).toBeInTheDocument()
    expect(screen.getByText(/50% before the judges/)).toBeInTheDocument()
    expect(screen.getByText(/^submissions/).parentElement).toHaveTextContent('4 submissions (20%)')
    expect(screen.getByText(/knockouts/)).toHaveTextContent('6 knockouts (30%)')
    expect(screen.getByText(/decisions/)).toHaveTextContent('10 decisions (50%)')
  })

  it('is written in the language it is given', () => {
    render(<FinishBreakdown dna={dna} finishRate={50} language="pt" />)
    expect(screen.getByText(/antes da decisão dos juízes/)).toBeInTheDocument()
    expect(screen.getByText(/nocautes/)).toHaveTextContent('6 nocautes (30%)')
  })
})
