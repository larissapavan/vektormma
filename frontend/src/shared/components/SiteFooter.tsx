import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { INFO_PATHS } from '../data/legal'
import { SocialLinks } from './SocialLinks'

const linkClass = 'inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline'

/**
 * The foot of every page: what the project is, where the model is explained, the text pages a visitor looks for, the
 * disclaimer and the official channels (social networks and the GitHub repository live here, not in the header).
 */
export function SiteFooter({ dataDate, className = '' }: { dataDate?: string | null; className?: string }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const project = [
    { to: '/model', label: L(lang, 'Como o modelo funciona', 'How the model works', 'Comment marche le modèle', 'Cómo funciona el modelo') },
    { to: '/track-record', label: L(lang, 'Histórico de previsões', 'Prediction record', 'Historique des pronostics', 'Historial de pronósticos') },
    { to: '/data', label: L(lang, 'Dados', 'Data', 'Données', 'Datos') },
  ]
  const site = [
    { to: '/about', label: L(lang, 'Sobre', 'About', 'À propos', 'Acerca de') },
    { to: INFO_PATHS.guide, label: L(lang, 'Guia', 'Guide', 'Guide', 'Guía') },
    { to: INFO_PATHS.contact, label: L(lang, 'Contato', 'Contact', 'Contact', 'Contacto') },
    { to: INFO_PATHS.privacy, label: L(lang, 'Privacidade', 'Privacy', 'Confidentialité', 'Privacidad') },
    { to: INFO_PATHS.terms, label: L(lang, 'Termos', 'Terms', 'Conditions', 'Términos') },
  ]

  return (
    // Four groups (brand, navigation, disclaimer, channels) 12–16 px apart (gap-3). The links and icons are 44 px touch targets, so
    // their rows pull in the air around the text (-my-2.5) and the gap is measured between what can be seen.
    <footer className={`flex flex-col gap-3 border-t border-[var(--rule)] pb-6 pt-4 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-display text-[22px] leading-none text-[var(--ink)]">
            <span className="font-black">Vektor</span> <span className="font-medium">MMA</span>
          </span>
          <span className="text-sm text-[var(--muted)]">{t('footer.tagline', 'Combat sports stats and predictions.')}</span>
          {dataDate ? <span className="text-sm text-[var(--muted)]">{t('footer.dataUpTo', { date: dataDate, defaultValue: `Data up to ${dataDate}` })}</span> : null}
        </p>
      </div>

      <div className="-my-2.5 flex flex-wrap gap-x-10">
        <nav aria-label={L(lang, 'O projeto', 'The project', 'Le projet', 'El proyecto')}>
          <ul className="flex flex-wrap gap-x-6 text-[15px] font-semibold text-[var(--ink)]">
            {project.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={L(lang, 'Informações do site', 'Site information', 'Informations sur le site', 'Información del sitio')}>
          <ul className="flex flex-wrap gap-x-6 text-[15px] text-[var(--ink)]">
            {site.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Disclaimer on the left and channels on the right while both fit; on a phone the channels drop under it. */}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1">
        <p className="max-w-[84ch] text-sm leading-6 text-[var(--muted)]">
          {L(
            lang,
            'Projeto analítico independente. Não afiliado ao UFC, PFL, Bellator, ONE Championship, RIZIN, KSW, LFA, Cage Warriors, OKTAGON, Jungle Fight ou Invicta FC.',
            'Independent analytics project. Not affiliated with UFC, PFL, Bellator, ONE Championship, RIZIN, KSW, LFA, Cage Warriors, OKTAGON, Jungle Fight, or Invicta FC.',
            'Projet analytique indépendant. Non affilié à l’UFC, à la PFL, au Bellator, à ONE Championship, à RIZIN, à KSW, à la LFA, à Cage Warriors, à OKTAGON, au Jungle Fight ou à Invicta FC.',
            'Proyecto analítico independiente. No afiliado a la UFC, la PFL, Bellator, ONE Championship, RIZIN, KSW, la LFA, Cage Warriors, OKTAGON, Jungle Fight ni Invicta FC.',
          )}
        </p>
        <div className="-my-1.5 flex items-center gap-2">
          <span className="text-sm text-[var(--muted)]">{L(lang, 'Canais oficiais:', 'Official channels:', 'Canaux officiels :', 'Canales oficiales:')}</span>
          <SocialLinks withGithub />
        </div>
      </div>
    </footer>
  )
}
