import { useTranslation } from 'react-i18next'

import { L } from '../../../i18n/lang'
import { formatProbability } from '../../data/probability'

/**
 * The model's estimate under a corner split: a band from edge to edge, red then blue, split exactly where the probability
 * falls, with both percentages in the display face. On a phone the numbers sit above a thinner band.
 */
export function ProbabilityBand({
  nameA,
  nameB,
  probabilityA,
}: {
  /** The red corner. */
  nameA: string
  /** The blue corner. */
  nameB: string
  probabilityA: number
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const probabilityB = 1 - probabilityA
  const pctA = Math.round(probabilityA * 100)
  const pctB = Math.round(probabilityB * 100)
  // The band splits at the probability itself, not at the rounded label.
  const split = `${Math.min(100, Math.max(0, probabilityA * 100))}%`
  const labelA = formatProbability(probabilityA)
  const labelB = formatProbability(probabilityB)

  return (
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
      {/* Phone: numbers above, band below. */}
      <div className="sm:hidden" aria-hidden="true">
        <div className="mt-5 flex items-end justify-between font-display text-[64px] font-black leading-[0.9] tabular-nums">
          <span className="text-[var(--red-text)]">{labelA}</span>
          <span className="text-[var(--blue-text)]">{labelB}</span>
        </div>
        <div className="mt-2 flex h-5">
          <div className="bg-[var(--red-deep)]" style={{ flex: `0 0 ${split}` }} />
          <div className="flex-1 bg-[var(--blue-deep)]" />
        </div>
      </div>

      {/* Wider screens: the numbers sit inside the band. */}
      <div className="hidden h-[84px] font-display text-[62px] font-black leading-none tabular-nums text-white sm:flex lg:h-[92px] lg:text-[68px]" aria-hidden="true">
        <div className="flex items-center whitespace-nowrap bg-[var(--red-deep)] pl-7" style={{ flex: `0 0 ${split}` }}>
          {labelA}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end whitespace-nowrap bg-[var(--blue-deep)] pr-7">{labelB}</div>
      </div>
    </div>
  )
}

/** "The model gives X a NN% chance of winning.", the one way the site words a prediction. */
export function predictionSentence(lang: string, winner: string, probability: number) {
  const chance = formatProbability(probability)
  return L(
    lang,
    `O modelo dá ${chance} de chance de vitória a ${winner}.`,
    `The model gives ${winner} a ${chance} chance of winning.`,
    `Le modèle donne à ${winner} ${chance} de chances de gagner.`,
    `El modelo da a ${winner} un ${chance} de probabilidad de ganar.`,
  )
}
