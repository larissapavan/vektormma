import { useTranslation } from 'react-i18next'

import { L } from '../../../i18n/lang'

/**
 * Says what the percentage on screen is about: a fight booked on an upcoming card, or a simulation of two fighters picked
 * freely (who may never meet). A tag, because it changes how the number reads.
 */
export function BoutMode({ event }: { event: { name: string } | null }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px]">
      <span className={`border-[1.5px] px-2 py-0.5 text-sm font-bold ${event ? 'border-[var(--ink)] text-[var(--ink)]' : 'border-[var(--muted)] text-[var(--muted)]'}`}>
        {event ? L(lang, 'Luta agendada', 'Scheduled fight', 'Combat programmé', 'Pelea programada') : L(lang, 'Simulação', 'Simulation', 'Simulation', 'Simulación')}
      </span>
      <span className="text-[var(--muted)]">
        {event
          ? event.name
          : L(lang, 'Dois atletas escolhidos livremente; a luta não está marcada.', 'Two fighters picked freely; the fight is not booked.', 'Deux combattants choisis librement ; le combat n’est pas programmé.', 'Dos peleadores elegidos libremente; la pelea no está programada.')}
      </span>
    </p>
  )
}
