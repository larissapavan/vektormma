import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { formatProbability } from '../../shared/data/probability'
import { ORGS, orgPath, type OrgConfig } from '../../shared/data/orgs'
import { getOrgUpcomingPicks, getUpcomingPicks } from '../../shared/services/api'
import { featuredPick } from '../../shared/data/featuredPick'
import type { UpcomingPick } from '../../shared/types/api'

/** The organizations with published predictions, in the directory's order. */
const PREDICTION_ORGS: OrgConfig[] = [ORGS.ufc, ORGS.pfl, ORGS.one]

type Preview = { org: OrgConfig; pick: UpcomingPick }
type State = { status: 'loading' } | { status: 'ready'; items: Preview[] }

/** Asks the three organizations at once; one that fails or has nothing published simply leaves the list. */
function usePredictionPreview(): State {
  const [state, setState] = useState<State>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    Promise.all(
      PREDICTION_ORGS.map((org) =>
        (org.id === 'ufc' ? getUpcomingPicks() : getOrgUpcomingPicks(org.id))
          .then((picks) => featuredPick(picks))
          .catch(() => null)
          .then((pick) => (pick ? { org, pick } : null)),
      ),
    ).then((found) => {
      if (!cancelled) setState({ status: 'ready', items: found.filter((item): item is Preview => item !== null) })
    })
    return () => {
      cancelled = true
    }
  }, [])
  return state
}

/** The predictor page of an organization, opened on the fight (and, for the UFC, its card). */
function pickPath({ org, pick }: Preview): string {
  const params = new URLSearchParams({ a: pick.fighter_1, b: pick.fighter_2 })
  if (org.id === 'ufc') params.set('event', pick.event_name)
  return `${orgPath(org, 'predictor')}?${params.toString()}`
}

function formatDay(date: string | null, lang: string): string | null {
  if (!date) return null
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : new Intl.DateTimeFormat(localeTag(lang), { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

function Corner({ color, name, value }: { color: 'red' | 'blue'; name: string; value: number }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 self-center ${color === 'red' ? 'bg-[var(--red)]' : 'bg-[var(--blue)]'}`} aria-hidden="true" />
        <span className="min-w-0 break-words text-base font-semibold leading-snug">{name}</span>
      </span>
      <span className="shrink-0 font-display text-2xl font-extrabold leading-none tabular-nums">{formatProbability(value)}</span>
    </span>
  )
}

function PreviewItem({ item }: { item: Preview }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { org, pick } = item
  const a = pick.fighter_1_probability
  const day = formatDay(pick.event_date, lang)
  const label = L(
    lang,
    `${org.shortName}: ${pick.fighter_1} contra ${pick.fighter_2}${day ? `, ${day}` : ''}. Chance estimada: ${formatProbability(a)} contra ${formatProbability(1 - a)}.`,
    `${org.shortName}: ${pick.fighter_1} against ${pick.fighter_2}${day ? `, ${day}` : ''}. Estimated chance: ${formatProbability(a)} to ${formatProbability(1 - a)}.`,
    `${org.shortName} : ${pick.fighter_1} contre ${pick.fighter_2}${day ? `, ${day}` : ''}. Chance estimée : ${formatProbability(a)} contre ${formatProbability(1 - a)}.`,
    `${org.shortName}: ${pick.fighter_1} contra ${pick.fighter_2}${day ? `, ${day}` : ''}. Probabilidad estimada: ${formatProbability(a)} contra ${formatProbability(1 - a)}.`,
  )

  return (
    <li className="border-b border-[var(--rule)]">
      <Link to={pickPath(item)} aria-label={label} className="group flex h-full flex-col gap-3 px-1 py-4 text-[var(--ink)] hover:bg-[var(--panel)] sm:px-2">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm text-[var(--muted)]">
          <span className="font-bold text-[var(--ink)]">{org.shortName}</span>
          {day ? <span className="tabular-nums">{day}</span> : null}
        </span>
        <span className="flex flex-col gap-1.5">
          <Corner color="red" name={pick.fighter_1} value={a} />
          {/* The split sits exactly at the estimate. */}
          <span className="flex h-1.5 w-full overflow-hidden bg-[var(--track)]" aria-hidden="true">
            <span className="bg-[var(--red)]" style={{ width: `${a * 100}%` }} />
            <span className="flex-1 bg-[var(--blue)]" />
          </span>
          <Corner color="blue" name={pick.fighter_2} value={1 - a} />
        </span>
        <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-bold underline decoration-2 underline-offset-[5px]">
          {L(lang, 'Ver previsão', 'See the prediction', 'Voir le pronostic', 'Ver el pronóstico')}
          <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}

/** Each organization's predictor, for when nothing is published (or the API does not answer). */
function DirectLinks() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <ul className="grid border-t-[3px] border-[var(--ink)] sm:grid-cols-3 sm:gap-x-8">
      {PREDICTION_ORGS.map((org) => (
        <li key={org.id} className="border-b border-[var(--rule)]">
          <Link to={orgPath(org, 'predictor')} className="group flex min-h-[64px] items-center justify-between gap-4 px-1 py-3 text-[var(--ink)] hover:bg-[var(--panel)] sm:px-2">
            <span>
              <span className="block font-display text-[24px] font-black leading-none">{org.shortName}</span>
              <span className="mt-1 block text-[15px] text-[var(--muted)]">{L(lang, 'Previsões', 'Predictions', 'Pronostics', 'Pronósticos')}</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * A look at the predictions: the next fight each organization with predictions puts forward (at most one each), with the
 * estimated chances. The full card and the analysis stay on the inner pages.
 */
export function PredictionsPreview() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const state = usePredictionPreview()

  return (
    <section id="predictions" aria-labelledby="predictions-title" className="scroll-mt-24">
      <h2 id="predictions-title" className="font-display text-[34px] font-extrabold leading-none sm:text-[44px]">
        {L(lang, 'Previsões', 'Predictions', 'Pronostics', 'Pronósticos')}
      </h2>
      <p className="mt-2 max-w-[62ch] text-base text-[var(--muted)]">
        {L(
          lang,
          'Próximas lutas do UFC, da PFL e da ONE com a chance de vitória estimada pelo modelo.',
          'Upcoming UFC, PFL and ONE fights with the win chance estimated by the model.',
          'Prochains combats de l’UFC, de la PFL et de ONE avec la chance de victoire estimée par le modèle.',
          'Próximas peleas de la UFC, la PFL y ONE con la probabilidad de victoria estimada por el modelo.',
        )}
      </p>
      <div className="mt-6">
        {state.status === 'loading' ? (
          // The same height as the list it stands for, so nothing below jumps when it arrives.
          <ul className="grid border-t-[3px] border-[var(--ink)] sm:grid-cols-3 sm:gap-x-8" role="status" aria-label={L(lang, 'Carregando previsões', 'Loading predictions', 'Chargement des pronostics', 'Cargando pronósticos')}>
            {PREDICTION_ORGS.map((org) => (
              <li key={org.id} className="border-b border-[var(--rule)] px-1 py-4 sm:px-2">
                <span className="block h-[148px] animate-pulse bg-[var(--panel)]" />
              </li>
            ))}
          </ul>
        ) : state.items.length ? (
          <ul className="grid border-t-[3px] border-[var(--ink)] sm:grid-cols-3 sm:gap-x-8">
            {state.items.map((item) => (
              <PreviewItem key={item.org.id} item={item} />
            ))}
          </ul>
        ) : (
          <DirectLinks />
        )}
      </div>
    </section>
  )
}
