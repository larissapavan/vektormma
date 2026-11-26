import { formatProbability, isEvenProbability } from '../../data/probability'

/**
 * The compact form of {@link ProbabilityBand} for fight cards: the favourite's percentage large in its corner colour, the
 * other one small and muted, and a thin red/blue bar split exactly at the probability. Decorative: the caller gives the
 * accessible sentence.
 */
export function ProbabilitySplit({ probabilityA, faded = false }: { probabilityA: number; faded?: boolean }) {
  const split = `${Math.min(100, Math.max(0, probabilityA * 100))}%`
  const even = isEvenProbability(probabilityA)
  const aFavourite = !even && probabilityA > 0.5
  const bFavourite = !even && probabilityA < 0.5
  const big = 'text-[34px] sm:text-[40px]'
  const small = 'text-xl text-[var(--muted)]'

  return (
    <div aria-hidden="true" className={faded ? 'opacity-60' : undefined}>
      <div className="flex items-end justify-between font-display font-black leading-[0.9] tabular-nums">
        <span className={aFavourite ? `${big} text-[var(--red-text)]` : even ? `${big} text-[var(--ink)]` : small}>
          {formatProbability(probabilityA)}
        </span>
        <span className={bFavourite ? `${big} text-[var(--blue-text)]` : even ? `${big} text-[var(--ink)]` : small}>
          {formatProbability(1 - probabilityA)}
        </span>
      </div>
      <div className="mt-2 flex h-2">
        <div className="bg-[var(--red-deep)]" style={{ flex: `0 0 ${split}` }} />
        <div className="flex-1 bg-[var(--blue-deep)]" />
      </div>
    </div>
  )
}
