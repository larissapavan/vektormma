import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { ARCHIVE_YEARS, DIRECTORY_ORDER, orgCoverage, orgCoverageLabel, orgPath, type OrgConfig } from '../../shared/data/orgs'

/** The directory names the kind of content plainly: "Historical archive · 2009–2023" for Bellator, not the archive's title. */
function directoryLabel(org: OrgConfig, lang: string): string {
  if (orgCoverage(org) !== 'archive') return orgCoverageLabel(org, lang)
  const years = ARCHIVE_YEARS[org.id]
  const label = L(lang, 'Arquivo histórico', 'Historical archive', 'Archives historiques', 'Archivo histórico')
  return years ? `${label}\u00a0·\u00a0${years}` : label
}

/**
 * The directory of every organization the project covers. It is built from the configuration alone, so it works while the
 * API is down: next events, fight counts and rankings belong to each organization's own page. The ones with predictions
 * come first, with the same weight as the others.
 */
export function OrganizationsSection() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const withPredictions = DIRECTORY_ORDER.filter((org) => orgCoverage(org) === 'predictions').map((org) => org.shortName)
  const list = new Intl.ListFormat(localeTag(lang), { style: 'long', type: 'conjunction' }).format(withPredictions)

  return (
    <section id="organizations-grid" className="scroll-mt-24" aria-labelledby="organizations-title">
      <h2 id="organizations-title" className="font-display text-[34px] font-extrabold leading-none sm:text-[44px]">
        {L(lang, 'Organizações', 'Organizations', 'Organisations', 'Organizaciones')}
      </h2>
      <p className="mt-2 max-w-[62ch] text-base text-[var(--muted)]">
        {L(
          lang,
          `${DIRECTORY_ORDER.length} organizações. ${list} têm previsões do modelo; as demais trazem eventos e resultados.`,
          `${DIRECTORY_ORDER.length} organizations. ${list} have the model’s predictions; the others have events and results.`,
          `${DIRECTORY_ORDER.length} organisations. ${list} ont les pronostics du modèle ; les autres ont événements et résultats.`,
          `${DIRECTORY_ORDER.length} organizaciones. ${list} tienen pronósticos del modelo; las demás traen eventos y resultados.`,
        )}
      </p>

      <ul className="mt-6 grid border-t-[3px] border-[var(--ink)] sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
        {DIRECTORY_ORDER.map((org) => {
          const coverage = directoryLabel(org, lang)
          return (
            <li key={org.id} className="border-b border-[var(--rule)]">
              <Link
                to={orgPath(org)}
                className="group flex min-h-[76px] items-center gap-4 px-1 py-3 text-[var(--ink)] hover:bg-[var(--panel)] sm:px-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-[26px] font-black leading-none">{org.shortName}</span>
                    {org.name !== org.shortName ? <span className="text-sm text-[var(--muted)]">{org.name}</span> : null}
                  </span>
                  <span className="mt-1 block text-[15px] text-[var(--muted)]">{coverage}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
