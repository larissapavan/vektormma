import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { levelLabel, translateReason } from '../data/confidenceText'
import type { DataConfidence } from '../types/api'

/**
 * Says how much the prediction had to go on, so a percentage built on a few fights is not read like one built on a full
 * career. Silent when the data is solid, so it only appears when it matters.
 */
export function DataConfidenceNote({ confidence }: { confidence: DataConfidence | null | undefined }) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  if (!confidence || confidence.level === 'solid') return null

  return (
    <aside
      aria-label={L(lang, 'Dados por trás desta previsão', 'Data behind this prediction', 'Données derrière ce pronostic', 'Datos detrás de este pronóstico')}
      className="flex items-start gap-3 border-l-4 border-[var(--error)] bg-[var(--panel)] px-4 py-3"
    >
      <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[var(--error)]" />
      <div>
        <p className="text-base font-bold text-[var(--error)]">{levelLabel(confidence.level, confidence.label, lang)}</p>
        <ul className="mt-1 space-y-1 text-[15px] leading-6">
          {confidence.reasons.map((reason) => (
            <li key={reason}>{translateReason(reason, lang)}</li>
          ))}
        </ul>
        <p className="mt-1 text-[15px] leading-6 text-[var(--muted)]">
          {L(lang, 'Leia a porcentagem com mais cautela.', 'Read the percentage with extra caution.', 'Lisez le pourcentage avec plus de prudence.', 'Lee el porcentaje con más cautela.')}
        </p>
      </div>
    </aside>
  )
}
