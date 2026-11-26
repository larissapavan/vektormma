import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'

/**
 * The two views of the Events area, side by side: the cards to come (with the archive below them) and the latest results
 * with the model's picks. They are separate addresses (/events, /results), so both links keep working.
 */
export function EventsTabs({ upcomingTo, resultsTo }: { upcomingTo: string; resultsTo: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const tab = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center border-b-[3px] px-1 text-[17px] ${isActive ? 'border-[var(--ink)] font-bold text-[var(--ink)]' : 'border-transparent font-semibold text-[var(--muted)] hover:text-[var(--ink)]'}`

  return (
    <nav aria-label={L(lang, 'Eventos', 'Events', 'Événements', 'Eventos')} className="border-b border-[var(--rule)]">
      <ul className="flex gap-6">
        <li>
          <NavLink end to={upcomingTo} className={tab}>
            {L(lang, 'Próximos', 'Upcoming', 'À venir', 'Próximos')}
          </NavLink>
        </li>
        <li>
          <NavLink end to={resultsTo} className={tab}>
            {L(lang, 'Resultados', 'Results', 'Résultats', 'Resultados')}
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
