import { useTranslation } from 'react-i18next'
import { L } from '../../i18n/lang'
import { formatProbability } from '../data/probability'

interface WinProbabilityBarProps {
  /** The red corner. */
  nameA: string
  /** The blue corner. */
  nameB: string
  probabilityA: number
  probabilityB: number
  predictedWinner?: string | null
  compact?: boolean
  showNames?: boolean
}

/**
 * The model's estimate for a fight: both percentages in the display face over a band that runs edge to edge, red then
 * blue, split exactly where the probability falls.
 */
export function WinProbabilityBar({
  nameA,
  nameB,
  probabilityA,
  probabilityB,
  predictedWinner,
  compact = false,
  showNames = true,
}: WinProbabilityBarProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  const pctA = Math.round(probabilityA * 100)
  const pctB = Math.round(probabilityB * 100)
  // The band splits at the probability itself, not at the rounded label.
  const split = Math.min(100, Math.max(0, probabilityA * 100))
  const winnerChance = formatProbability(Math.max(probabilityA, probabilityB))
  const number = `font-display font-black leading-[0.9] tabular-nums ${compact ? 'text-[32px]' : 'text-[44px] sm:text-[64px]'}`

  return (
    <div>
      <div
        role="img"
        aria-label={L(
          lang,
          `Chance de vitória estimada pelo modelo: ${nameA} ${pctA} por cento, ${nameB} ${pctB} por cento`,
          `Win chance estimated by the model: ${nameA} ${pctA} percent, ${nameB} ${pctB} percent`,
          `Chance de victoire estimée par le modèle : ${nameA} ${pctA} pour cent, ${nameB} ${pctB} pour cent`,
          `Probabilidad de victoria estimada por el modelo: ${nameA} ${pctA} por ciento, ${nameB} ${pctB} por ciento`,
        )}
      >
        <div className="flex items-end justify-between gap-3" aria-hidden="true">
          <div className="min-w-0">
            {showNames ? <p className={`truncate font-bold text-[var(--ink)] ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>{nameA}</p> : null}
            <p className={`${number} text-[var(--red-text)]`}>{formatProbability(probabilityA)}</p>
          </div>
          <div className="min-w-0 text-right">
            {showNames ? <p className={`truncate font-bold text-[var(--ink)] ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>{nameB}</p> : null}
            <p className={`${number} text-[var(--blue-text)]`}>{formatProbability(probabilityB)}</p>
          </div>
        </div>
        <div className={`mt-2 flex ${compact ? 'h-3' : 'h-5'}`} aria-hidden="true">
          <div className="bg-[var(--red-deep)]" style={{ flex: `0 0 ${split}%` }} />
          <div className="flex-1 bg-[var(--blue-deep)]" />
        </div>
      </div>

      {predictedWinner ? (
        <p className={`mt-3 text-[var(--ink)] ${compact ? 'text-sm' : 'text-base'}`}>
          {L(
            lang,
            `O modelo dá ${winnerChance} de chance de vitória a ${predictedWinner}.`,
            `The model gives ${predictedWinner} a ${winnerChance} chance of winning.`,
            `Le modèle donne à ${predictedWinner} ${winnerChance} de chances de gagner.`,
            `El modelo da a ${predictedWinner} un ${winnerChance} de probabilidad de ganar.`,
          )}
        </p>
      ) : null}
    </div>
  )
}
