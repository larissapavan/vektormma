import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'

import { L, localeTag } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { SectionHeading } from '../shared/components/SectionHeading'
import { DATA_ECOSYSTEM_SOURCES, dataSteps, sourceOrg, sourceScope } from '../shared/data/dataPipeline'
import { useDataInfo } from '../shared/hooks/useDataInfo'
import { useModelInfo } from '../shared/hooks/useModelInfo'


export function DataIntelligence() {
  const { t, i18n } = useTranslation()
  const { dataInfo, loading, error } = useDataInfo()

  const formattedDate = dataInfo?.last_updated
    ? new Date(`${dataInfo.last_updated}T00:00:00`).toLocaleDateString(localeTag(i18n.language), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <div className="space-y-4 sm:space-y-6">
      <section>
        <SectionHeading
          level={1}
          title={t('dataIntelligence.title')}
          description={t('dataIntelligence.description')}
        />
      </section>

      {error ? (
        <p role="alert" className="error-note">
          {error}
        </p>
      ) : null}

      {loading || !dataInfo ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[96px]" />
          ))}
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            <StatCard label={t('dataIntelligence.lastUpdate')} value={formattedDate} />
            <StatCard
              label={t('dataIntelligence.fighters')}
              value={dataInfo.fighters_count.toLocaleString(localeTag(i18n.language))}
            />
            <StatCard
              label={t('dataIntelligence.events')}
              value={dataInfo.events_count.toLocaleString(localeTag(i18n.language))}
            />
            <StatCard
              label={t('dataIntelligence.fights')}
              value={dataInfo.fights_count.toLocaleString(localeTag(i18n.language))}
            />
          </section>

          <section className="border-t-[3px] border-[var(--ink)] pt-5">
            <h2 className="section-title">{t('dataIntelligence.pipelineTitle')}</h2>
            <p className="mt-2 max-w-[70ch] text-base text-[var(--muted)]">{t('dataIntelligence.pipelineDesc')}</p>
            <DataSteps fights={dataInfo.fights_count} fighters={dataInfo.fighters_count} />
          </section>

          <section className="border-t-[3px] border-[var(--ink)] pt-5">
            <h2 className="section-title">
              {L(i18n.language, 'Fontes e o que cada uma cobre', 'Sources and what each covers', 'Les sources et ce que chacune couvre', 'Las fuentes y lo que cubre cada una')}
            </h2>
            <ul className="mt-4 border-t border-[var(--rule)]">
              {DATA_ECOSYSTEM_SOURCES.map((src) => (
                <li key={src.name} className="grid gap-1 border-b border-[var(--rule)] py-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:gap-6">
                  <div>
                    <p className="font-semibold text-[var(--ink)]">
                      {sourceOrg(src, i18n.language)}
                    </p>
                    <a
                      href={src.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--muted)] underline decoration-[var(--rule)] underline-offset-4 hover:text-[var(--ink)] hover:decoration-[var(--ink)]"
                    >
                      {src.name}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">{L(i18n.language, '(abre em nova aba)', '(opens in a new tab)', '(s’ouvre dans un nouvel onglet)', '(se abre en una pestaña nueva)')}</span>
                    </a>
                  </div>
                  <p className="max-w-[70ch] text-base text-[var(--ink)]">{sourceScope(src, i18n.language)}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

/** The way from the official sites to a prediction, step by step. Counts come from the API, never typed in. */
function DataSteps({ fights, fighters }: { fights: number; fighters: number }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { modelInfo } = useModelInfo()
  const featureCount = modelInfo?.feature_count ?? null
  // The breakdown below describes the pre-fight model; the API can still serve the earlier one (PREDICTION_MODEL=current).
  const prefight = /pre-fight/i.test(modelInfo?.model_name ?? '')

  const steps = dataSteps(lang, { fights, fighters, featureCount, prefight })

  return (
    <ol className="mt-5 border-t border-[var(--rule)]">
      {steps.map((step, index) => (
        <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-[var(--rule)] py-4">
          <span className="font-display text-3xl font-black leading-none tabular-nums text-[var(--ink)]" aria-hidden="true">{index + 1}</span>
          <div>
            <h3 className="text-lg font-bold text-[var(--ink)]">{step.title}</h3>
            <p className="mt-1 max-w-[70ch] text-base text-[var(--ink)]">{step.text}</p>
            {step.groups ? (
              <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {step.groups.map(([label, detail]) => (
                  <div key={label} className="border-l-[3px] border-[var(--rule)] pl-3">
                    <dt className="font-semibold text-[var(--ink)]">{label}</dt>
                    <dd className="text-sm text-[var(--muted)]">{detail}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  // A date such as "4 de novembro de 2026" has a word wider than the cell on a 320px phone.
  const size = value.length > 10 ? 'text-xl min-[380px]:text-2xl' : 'text-2xl sm:text-3xl'
  return (
    <div className="border-t-[3px] border-[var(--ink)] pt-2">
      <p className="text-label font-semibold text-[var(--muted)]">{label}</p>
      <p className={`mt-1 font-display font-black tabular-nums text-[var(--ink)] ${size}`}>{value}</p>
    </div>
  )
}
