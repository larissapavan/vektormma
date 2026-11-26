import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { normalizeFighterName } from '../../shared/hooks/useFighterImages'
import type { MainFactor } from '../../shared/types/api'
import { localizeFeature } from '../../shared/utils/localizeFeature'

/**
 * The three numbers that move the main event's estimate most, each with the corner it favours and a bar scaled to the
 * strongest one. The full list, with sentences, stays on the predictor page.
 */
export function HeroFactors({ factors, red, blue }: { factors: MainFactor[]; red: string; blue: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const rows = factors.slice(0, 3)
  if (!rows.length) return null
  const max = Math.max(...rows.map((factor) => factor.magnitude), 0.01)
  const isRed = (name: string) => normalizeFighterName(name) === normalizeFighterName(red)
  const isBlue = (name: string) => normalizeFighterName(name) === normalizeFighterName(blue)

  return (
    <div className="mt-6">
      <p className="text-[17px] font-bold">{L(lang, 'O que mais pesa para o modelo', 'What weighs most for the model', 'Ce qui pèse le plus pour le modèle', 'Lo que más pesa para el modelo')}</p>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {rows.map((factor, index) => {
          const side = isRed(factor.impact) ? 'red' : isBlue(factor.impact) ? 'blue' : null
          const bar = side === 'red' ? 'bg-[var(--red-deep)]' : side === 'blue' ? 'bg-[var(--blue-deep)]' : 'bg-[var(--muted)]'
          const text = side === 'red' ? 'text-[var(--red-text)]' : side === 'blue' ? 'text-[var(--blue-text)]' : 'text-[var(--muted)]'
          return (
            <li key={factor.feature} className="bg-[var(--panel)] p-4">
              <span className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-black leading-none text-[var(--muted)]">{index + 1}</span>
                <span className="min-w-0 text-base font-bold leading-snug">{localizeFeature(factor.feature, lang)}</span>
              </span>
              <span className="mt-3 block h-2 bg-[var(--track)]" aria-hidden="true">
                <span className={`block h-full ${bar}`} style={{ width: `${Math.min(100, (factor.magnitude / max) * 100)}%` }} />
              </span>
              {side ? (
                <span className={`mt-2 block text-sm font-bold ${text}`}>
                  {L(lang, `A favor de ${factor.impact}`, `Favours ${factor.impact}`, `En faveur de ${factor.impact}`, `A favor de ${factor.impact}`)}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
