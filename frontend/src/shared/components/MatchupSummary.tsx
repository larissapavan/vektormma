import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { matchupSummary } from '../data/explainMatchup'
import type { PredictionResponse, RecentEvaluation } from '../types/api'

/** The prediction in words: what weighs most on each side, and how often picks like this one were right. */
export function MatchupSummary({ prediction, evaluation }: { prediction: PredictionResponse; evaluation: RecentEvaluation | null }) {
  const { i18n } = useTranslation()
  const lines = matchupSummary(prediction, evaluation, i18n.language)
  if (!lines.length) return null
  return (
    <div className="border-t border-[var(--rule)] pt-4">
      <h3 className="text-base font-bold">{L(i18n.language, 'Em palavras', 'In words', 'En clair', 'En palabras')}</h3>
      <ul className="mt-2 grid max-w-[70ch] gap-2 text-base leading-7">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
