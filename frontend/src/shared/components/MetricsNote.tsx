import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { localizeApiText } from '../data/apiText'

/** A short note under the model's headline metrics: where they come from and how far to trust them. */
export function MetricsNote({ note }: { note: string | null | undefined }) {
  const { i18n } = useTranslation()
  if (!note) return null
  return (
    <aside aria-label={L(i18n.language, 'Sobre estas métricas', 'About these metrics', 'À propos de ces métriques', 'Acerca de estas métricas')} className="surface-card flex items-start gap-2.5 rounded-[20px] px-3 py-2.5 sm:px-4">
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink)]" />
      <p className="text-xs leading-5 text-[var(--text-main)]">{localizeApiText(note, i18n.language)}</p>
    </aside>
  )
}
