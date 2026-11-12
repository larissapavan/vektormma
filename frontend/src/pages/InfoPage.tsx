import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'

import { L, uiLang } from '../i18n/lang'
import { CONTACT_EMAIL, infoPage, updatedLabel, type InfoLink, type InfoPageId } from '../shared/data/legal'

const EMAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || CONTACT_EMAIL

function LinkItem({ link }: { link: InfoLink }) {
  const { i18n } = useTranslation()
  const className =
    'inline-flex items-center gap-1 text-[var(--text-main)] underline decoration-[var(--rule)] underline-offset-4 transition hover:decoration-[var(--ink)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]'
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
    <div className="max-w-[70ch] space-y-8">
      <header aria-labelledby={`${id}-title`}>
        <p className="text-[15px] font-bold text-[var(--muted)]">{page.eyebrow}</p>
        <h1 id={`${id}-title`} className="mt-1 text-[40px] leading-none sm:text-[52px]">
          {page.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed">{page.intro}</p>
        {id === 'privacy' || id === 'terms' ? <p className="mt-2 text-[15px] text-[var(--muted)]">{updatedLabel(lang)}</p> : null}
      </header>

      {page.sections.map((section, index) => (
        <section key={section.heading} className="border-t-[3px] border-[var(--ink)] pt-5" aria-labelledby={`${id}-s${index}`}>
          <h2 id={`${id}-s${index}`} className="section-title">
            {section.heading}
          </h2>
          <div className="mt-3 space-y-4 text-base leading-7 sm:text-[17px]">
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets ? (
              <ul className="list-disc space-y-2 pl-5">
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            ) : null}
            {section.links ? (
              <ul className="space-y-1">
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
