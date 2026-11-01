import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'

import { L, uiLang } from '../i18n/lang'
import { CONTACT_EMAIL, infoPage, updatedLabel, type InfoLink, type InfoPageId } from '../shared/data/legal'

const EMAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || CONTACT_EMAIL

function LinkItem({ link }: { link: InfoLink }) {
  const { i18n } = useTranslation()
  const className =
    'inline-flex items-center gap-1 text-[var(--text-main)] underline decoration-[#C8102E]/70 underline-offset-4 transition hover:decoration-[#C8102E] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]'
  if (link.href.startsWith('/')) {
    return (
      <Link to={link.href} className={className}>
        {link.label}
      </Link>
    )
  }
  const external = link.href.startsWith('http')
  return (
    <a href={link.href} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {link.label}
      {external ? (
        <>
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          <span className="sr-only">{L(i18n.language, '(abre em nova aba)', '(opens in a new tab)', '(s’ouvre dans un nouvel onglet)', '(se abre en una pestaña nueva)')}</span>
        </>
      ) : null}
    </a>
  )
}

/** Privacy policy, terms of use, contact and the reading guide: one layout, the text comes from shared/data/legal.ts. */
export function InfoPage({ id }: { id: InfoPageId }) {
  const { i18n } = useTranslation()
  const lang = uiLang(i18n.language)
  const page = infoPage(id, lang, EMAIL)

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="page-hero rounded-[20px] px-3 py-3 sm:px-4 sm:py-4" aria-labelledby={`${id}-title`}>
        <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{page.eyebrow}</p>
        <h1 id={`${id}-title`} className="mt-1.5 text-3xl font-bold uppercase tracking-[0.03em] text-[var(--text-main)] md:text-4xl">
          {page.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{page.intro}</p>
        {id === 'privacy' || id === 'terms' ? <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{updatedLabel(lang)}</p> : null}
      </section>

      {page.sections.map((section, index) => (
        <section key={section.heading} className="surface-card rounded-[20px] p-3 sm:p-4" aria-labelledby={`${id}-s${index}`}>
          <h2 id={`${id}-s${index}`} className="text-xl font-bold uppercase tracking-[0.03em] text-[var(--text-main)] sm:text-2xl">
            {section.heading}
          </h2>
          <div className="mt-3 max-w-3xl space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets ? (
              <ul className="list-disc space-y-2 pl-5 marker:text-[#C8102E]">
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            ) : null}
            {section.links ? (
              <ul className="space-y-1.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <LinkItem link={link} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  )
}

export const Privacy = () => <InfoPage id="privacy" />
export const Terms = () => <InfoPage id="terms" />
export const Contact = () => <InfoPage id="contact" />
export const Guide = () => <InfoPage id="guide" />
