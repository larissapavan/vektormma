import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Sparkles, X } from 'lucide-react'

import { L, localeTag } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { SectionHeading } from '../shared/components/SectionHeading'
import { getDivisionName } from '../shared/data/divisions'
import { fightSummary } from '../shared/data/orgFormat'
import { useRecentResults } from '../shared/hooks/useRecentResults'
import type { ResultEvent, ResultFight } from '../shared/types/api'

const WINDOWS = [3, 7, 14] as const

function dayLabel(date: string, lang: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(localeTag(lang), { weekday: 'long', day: 'numeric', month: 'long' })
}

/** The events grouped by day, in the order they came (newest first). */
function byDay(events: ResultEvent[]) {
  const days: { date: string; events: ResultEvent[] }[] = []
  for (const event of events) {
    const last = days[days.length - 1]
    if (last && last.date === event.date) last.events.push(event)
    else days.push({ date: event.date, events: [event] })
  }
  return days
}

export function Results() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [days, setDays] = useState<number>(7)
  const { data, loading, error } = useRecentResults(days)

  const decided = data ? data.events.reduce((total, event) => total + event.decided, 0) : 0
  const accuracy = data && data.picks_resolved ? Math.round((data.picks_correct / data.picks_resolved) * 100) : null

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="page-hero flex flex-col gap-4 rounded-[20px] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4">
        <SectionHeading
          level={1}
          eyebrow={L(lang, 'Resultados', 'Results', 'Résultats', 'Resultados')}
          title={L(lang, 'Resultados recentes', 'Recent results', 'Résultats récents', 'Resultados recientes')}
          description={L(
            lang,
            'Os eventos mais recentes de todas as organizações, com o palpite que o modelo deu antes de cada luta.',
            'The latest events from every organization, with the pick the model made before each fight.',
            'Les derniers événements de toutes les organisations, avec le pronostic du modèle avant chaque combat.',
            'Los eventos más recientes de todas las organizaciones, con el pronóstico del modelo antes de cada pelea.',
          )}
        />
        <div role="group" aria-label={L(lang, 'Período', 'Period', 'Période', 'Período')} className="flex shrink-0 gap-1.5">
          {WINDOWS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              aria-pressed={days === value}
              className={`selector-chip cursor-pointer px-3 py-1.5 text-xs font-semibold transition ${days === value ? 'border-[#C8102E] text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}
            >
              {L(lang, `${value} dias`, `${value} days`, `${value} jours`, `${value} días`)}
            </button>
          ))}
        </div>
      </section>

      {error ? <p className="rounded-xl border border-[#C8102E]/25 bg-[#C8102E]/8 px-3 py-2 text-sm font-semibold text-[var(--text-red)]">{error}</p> : null}

      {loading && !data ? (
        <LoadingSkeleton className="h-[220px]" />
      ) : data ? (
        <>
          <section className="grid grid-cols-3 gap-2.5" aria-label={L(lang, 'Resumo do período', 'Summary of the period', 'Résumé de la période', 'Resumen del período')}>
            <Tile label={L(lang, 'Eventos', 'Events', 'Événements', 'Eventos')} value={`${data.events.length}`} />
            <Tile label={L(lang, 'Lutas com resultado', 'Fights with a result', 'Combats avec résultat', 'Peleas con resultado')} value={`${decided}`} />
            <Tile
              label={L(lang, 'Acertos do modelo', 'Model picks right', 'Pronostics justes', 'Aciertos del modelo')}
              value={accuracy == null ? '—' : `${accuracy}%`}
              hint={data.picks_resolved ? L(lang, `${data.picks_correct} de ${data.picks_resolved}`, `${data.picks_correct} of ${data.picks_resolved}`, `${data.picks_correct} sur ${data.picks_resolved}`, `${data.picks_correct} de ${data.picks_resolved}`) : undefined}
            />
          </section>

          {data.events.length === 0 ? (
            <p className="metric-tile rounded-2xl px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              {L(lang, 'Nenhum evento com resultado nesse período.', 'No event with results in this period.', 'Aucun événement avec résultats sur cette période.', 'Ningún evento con resultados en este período.')}
            </p>
          ) : (
            byDay(data.events).map((day) => (
              <section key={day.date} className="space-y-2.5">
                <h2 className="broadcast-label text-xs capitalize text-[var(--text-muted)]">{dayLabel(day.date, lang)}</h2>
                {day.events.map((event) => (
                  <EventCard key={`${event.org_id}-${event.name}-${event.date}`} event={event} />
                ))}
              </section>
            ))
          )}
          <p className="px-1 text-[11px] leading-4 text-[var(--text-muted)]">
            {L(lang, 'Os palpites são registrados antes de cada card e nunca refeitos depois. ', 'Picks are saved before each card and never redone afterwards. ', 'Les pronostics sont enregistrés avant chaque carte et jamais refaits après. ', 'Los pronósticos se guardan antes de cada cartelera y nunca se rehacen después. ')}
            <Link to="/track-record" className="underline hover:text-[var(--text-main)]">
              {L(lang, 'Ver o histórico completo de acertos', 'See the full track record', 'Voir le bilan complet', 'Ver el historial completo de aciertos')}
            </Link>
          </p>
        </>
      ) : null}
    </div>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="metric-tile rounded-2xl px-3 py-3">
      <p className="broadcast-label text-[10px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[var(--text-main)]">{value}</p>
      {hint ? <p className="text-[11px] text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  )
}

function EventCard({ event }: { event: ResultEvent }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <article className="metric-tile rounded-2xl px-3 py-3 sm:px-4">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="selector-chip text-[11px] font-bold text-[var(--text-main)]">{event.org_name}</span>
        <h3 className="min-w-0 flex-1 text-sm font-extrabold text-[var(--text-main)]">{event.name}</h3>
        <span className="text-[11px] text-[var(--text-muted)]">
          {event.decided === event.total
            ? L(lang, `${event.total} lutas`, `${event.total} fights`, `${event.total} combats`, `${event.total} peleas`)
            : L(lang, `${event.decided} de ${event.total} lutas`, `${event.decided} of ${event.total} fights`, `${event.decided} combats sur ${event.total}`, `${event.decided} de ${event.total} peleas`)}
        </span>
      </header>
      {event.location ? <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{event.location}</p> : null}
      <ul className="mt-2 divide-y divide-white/5">
        {event.fights.map((fight) => (
          <FightLine key={`${fight.fighter_1}-${fight.fighter_2}`} fight={fight} />
        ))}
      </ul>
    </article>
  )
}

function FightLine({ fight }: { fight: ResultFight }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const summary = fightSummary(fight, lang)
  const name = (value: string) =>
    fight.winner === value ? <strong className="font-extrabold text-[var(--text-main)]">{value}</strong> : <span className="text-[var(--text-muted)]">{value}</span>
  return (
    <li className="py-2">
      <p className="flex flex-wrap items-baseline justify-center gap-x-2 text-center text-sm">
        {name(fight.fighter_1)}
        <span className="broadcast-label text-[10px] text-[var(--text-muted)]">vs</span>
        {name(fight.fighter_2)}
      </p>
      <p className="mt-0.5 text-center text-[11px] leading-4 text-[var(--text-muted)]">
        {[
          fight.title_fight ? L(lang, 'Disputa de cinturão', 'Title fight', 'Combat pour le titre', 'Pelea por el título') : null,
          fight.weight_class ? getDivisionName(fight.weight_class, lang) : null,
          fight.outcome === 'pending' ? L(lang, 'Sem resultado ainda', 'No result yet', 'Pas encore de résultat', 'Sin resultado todavía') : summary,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {fight.pick ? <PickLine pick={fight.pick} /> : null}
    </li>
  )
}

function PickLine({ pick }: { pick: NonNullable<ResultFight['pick']> }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const tone = pick.correct == null ? 'border-[#F2C230]/40 bg-[#F2C230]/10 text-[var(--text-main)]' : pick.correct ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-[#C8102E]/40 bg-[#C8102E]/10 text-[var(--text-red)]'
  const verdict = pick.correct == null ? null : pick.correct ? L(lang, 'acertou', 'right', 'juste', 'acertó') : L(lang, 'errou', 'wrong', 'raté', 'falló')
  return (
    <p className="mt-1.5 flex justify-center">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${tone}`}>
        {pick.correct == null ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : pick.correct ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
        <span className="font-bold uppercase tracking-wider">{L(lang, 'Palpite da IA:', 'AI Pick:', 'Pronostic :', 'Pronóstico:')}</span>
        <span className="font-extrabold">{pick.predicted_winner}</span>
        <span className="font-mono text-[10px] font-extrabold">{Math.round(pick.confidence * 100)}%</span>
        {verdict ? <span>· {verdict}</span> : null}
      </span>
    </p>
  )
}
