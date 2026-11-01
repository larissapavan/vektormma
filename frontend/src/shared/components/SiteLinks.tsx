import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { INFO_PATHS } from '../data/legal'

/** About, guide, contact, privacy and terms: the pages a visitor (and an ad reviewer) looks for at the foot of a site. */
export function SiteLinks({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation()
  const items = [
    { to: '/about', label: L(i18n.language, 'Sobre', 'About', 'À propos', 'Acerca de') },
    { to: INFO_PATHS.guide, label: L(i18n.language, 'Guia', 'Guide', 'Guide', 'Guía') },
    { to: INFO_PATHS.contact, label: L(i18n.language, 'Contato', 'Contact', 'Contact', 'Contacto') },
    { to: INFO_PATHS.privacy, label: L(i18n.language, 'Privacidade', 'Privacy', 'Confidentialité', 'Privacidad') },
    { to: INFO_PATHS.terms, label: L(i18n.language, 'Termos', 'Terms', 'Conditions', 'Términos') },
  ]
  return (
    <nav aria-label={L(i18n.language, 'Informações do site', 'Site information', 'Informations sur le site', 'Información del sitio')} className={className}>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="underline decoration-[var(--rule)] decoration-1 underline-offset-4 transition hover:text-[#C8102E] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
