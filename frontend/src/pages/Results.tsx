import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'

import { L, localeTag } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { sectionActionClass } from '../shared/components/ui/Section'
import { getDivisionName } from '../shared/data/divisions'
import { eventRecap } from '../shared/data/eventText'
import { formatProbability } from '../shared/data/probability'
import { fightSummary } from '../shared/data/orgFormat'
import { useRecentResults } from '../shared/hooks/useRecentResults'
import type { ResultEvent, ResultFight } from '../shared/types/api'

// The UFC holds about one event a week, so the shortest window is a week. The API takes up to 31 days.
const WINDOWS = [7, 14, 30] as const

function dayLabel(date: string, lang: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  const label = parsed.toLocaleDateString(localeTag(lang), { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toLocaleUpperCase(localeTag(lang)) + label.slice(1)
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

  // The API returns every organization's events; this page is the UFC's, and its numbers count UFC fights only.
  const events = data ? data.events.filter((event) => event.org_id === 'ufc') : []
  const decided = events.reduce((total, event) => total + event.decided, 0)
  const resolved = events.flatMap((event) => event.fights).filter((fight) => fight.pick && fight.pick.correct != null)
  const correct = resolved.filter((fight) => fight.pick?.correct).length
  const accuracy = resolved.length ? correct / resolved.length : null
  const number = (value: number) => value.toLocaleString(localeTag(lang))

  return (
    <div className="space-y-6">
      <PageHeader
        title={L(lang, 'Resultados recentes', 'Recent results', 'Résultats récents', 'Resultados recientes')}
        description={L(
          lang,
          'Os eventos mais recentes do UFC, com o resultado oficial ao lado do palpite que o modelo deu antes de cada luta.',
          'The latest UFC events, with the official result next to the pick the model made before each fight.',
          'Les derniers événements de l’UFC, avec le résultat officiel à côté du pronostic fait par le modèle avant chaque combat.',
          'Los eventos más recientes de la UFC, con el resultado oficial junto al pronóstico que dio el modelo antes de cada pelea.',
        )}
        stats={
          data
            ? [
                { label: L(lang, 'eventos', 'events', 'événements', 'eventos'), value: number(events.length) },
                { label: L(lang, 'lutas com resultado', 'fights with a result', 'combats avec résultat', 'peleas con resultado'), value: number(decided) },
                {
                  label: L(lang, 'acertos do modelo', 'model picks right', 'pronostics justes', 'aciertos del modelo'),
                  value: accuracy == null ? '—' : new Intl.NumberFormat(localeTag(lang), { style: 'percent' }).format(accuracy),
                  note: resolved.length
                    ? L(lang, `${correct} de ${resolved.length}`, `${correct} of ${resolved.length}`, `${correct} sur ${resolved.length}`, `${correct} de ${resolved.length}`)
                    : undefined,
                },
              ]
            : undefined
        }
      >
        <div role="group" aria-label={L(lang, 'Período', 'Period', 'Période', 'Período')} className="inline-flex overflow-hidden rounded-sm border-[1.5px] border-[var(--ink)]">
          {WINDOWS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              aria-pressed={days === value}
              className={`min-h-11 cursor-pointer px-5 text-[15px] font-bold ${days === value ? 'bg-[var(--ink)] text-[var(--on-ink)]' : 'hover:bg-[var(--panel-hover)]'}`}
            >
              {L(lang, `Últimos ${value} dias`, `Last ${value} days`, `${value} derniers jours`, `Últimos ${value} días`)}
            </button>
          ))}
        </div>
      </PageHeader>

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading && !data ? (
        <LoadingSkeleton className="h-[220px]" />
      ) : data ? (
        <>
          {events.length === 0 ? (
            <p className="bg-[var(--panel)] px-6 py-10 text-base text-[var(--muted)]">
              {L(
                lang,
                'Nenhum evento do UFC com resultado nesse período. Escolha um período maior acima.',
                'No UFC event with results in this period. Choose a longer period above.',
                'Aucun événement de l’UFC avec résultats sur cette période. Choisissez une période plus longue ci-dessus.',
                'Ningún evento de la UFC con resultados en este período. Elige un período más largo arriba.',
              )}
            </p>
          ) : (
            byDay(events).map((day) => (
              <section key={day.date} className="space-y-6">
                <h2 className="section-title">{dayLabel(day.date, lang)}</h2>
                {day.events.map((event) => (
                  <EventBlock key={`${event.org_id}-${event.name}-${event.date}`} event={event} />
                ))}
              </section>
            ))
          )}
          <p className="text-[15px] text-[var(--muted)]">
            {L(lang, 'Os palpites são registrados antes de cada card e nunca refeitos depois. ', 'Picks are saved before each card and never redone afterwards. ', 'Les pronostics sont enregistrés avant chaque carte et jamais refaits après. ', 'Los pronósticos se guardan antes de cada cartelera y nunca se rehacen después. ')}
            <Link to="/track-record" className={sectionActionClass}>
              {L(lang, 'Ver o desempenho do modelo', 'See the model’s track record', 'Voir le bilan du modèle', 'Ver el desempeño del modelo')}
            </Link>
          </p>
        </>
      ) : null}
    </div>
  )
}

/** One event: its name, a short written recap, and the fights as rows, official result beside the model's pick. */
function EventBlock({ event }: { event: ResultEvent }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const recap = eventRecap(
    lang,
    event.name,
    event.fights.map((fight) => ({
      a: fight.fighter_1,
      b: fight.fighter_2,
      winner: fight.outcome === 'win' ? fight.winner : null,
      method: fight.method,
      round: fight.round,
      weightClass: fight.weight_class,
      title: fight.title_fight,
      pick: fight.pick ? { winner: fight.pick.predicted_winner, probability: fight.pick.confidence } : null,
    })),
  )
  return (
    <article>
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-3">
        <div className="min-w-0">
          <h3 className="font-display text-[28px] font-extrabold leading-none sm:text-[32px]">{event.name}</h3>
          {event.location ? <p className="mt-1 text-[15px] text-[var(--muted)]">{event.location}</p> : null}
        </div>
        <p className="text-[15px] text-[var(--muted)]">
          {event.decided === event.total
            ? L(lang, `${event.total} lutas`, `${event.total} fights`, `${event.total} combats`, `${event.total} peleas`)
            : L(lang, `${event.decided} de ${event.total} lutas com resultado`, `${event.decided} of ${event.total} fights decided`, `${event.decided} combats sur ${event.total} terminés`, `${event.decided} de ${event.total} peleas con resultado`)}
        </p>
      </header>
      {recap.length ? <p className="max-w-[70ch] pb-4 text-base leading-7">{recap.join(' ')}</p> : null}
      <table className="w-full border-t-[3px] border-[var(--ink)] text-left">
        <thead className="max-md:sr-only">
          <tr className="border-b border-[var(--rule)] text-[15px]">
            <th className="py-3 pr-4 font-bold">{L(lang, 'Luta', 'Fight', 'Combat', 'Pelea')}</th>
            <th className="py-3 pr-4 font-bold">{L(lang, 'Resultado oficial', 'Official result', 'Résultat officiel', 'Resultado oficial')}</th>
            <th className="py-3 font-bold">{L(lang, 'Palpite do modelo', 'Model’s pick', 'Pronostic du modèle', 'Pronóstico del modelo')}</th>
          </tr>
        </thead>
        <tbody>
          {event.fights.map((fight) => (
            <FightRow key={`${fight.fighter_1}-${fight.fighter_2}`} fight={fight} />
          ))}
        </tbody>
      </table>
    </article>
  )
}

function FightRow({ fight }: { fight: ResultFight }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const name = (value: string) => (fight.winner === value ? <strong className="font-bold">{value}</strong> : <span className="text-[var(--muted)]">{value}</span>)
  const facts = [fight.title_fight ? L(lang, 'Luta pelo cinturão', 'Title fight', 'Combat pour le titre', 'Pelea por el título') : null, fight.weight_class ? getDivisionName(fight.weight_class, lang) : null].filter(Boolean).join(' · ')

  return (
    <tr className="border-b border-[var(--rule)] align-top max-md:grid max-md:gap-1 max-md:py-3.5">
      <td className="py-3.5 pr-4 max-md:py-0">
        <p className="text-base">
          {name(fight.fighter_1)} <span className="text-[var(--muted)]">vs</span> {name(fight.fighter_2)}
        </p>
        {facts ? <p className="text-[15px] text-[var(--muted)]">{facts}</p> : null}
      </td>
      <td className="py-3.5 pr-4 text-base max-md:py-0">
        {fight.outcome === 'pending' ? <span className="text-[var(--muted)]">{L(lang, 'Sem resultado ainda', 'No result yet', 'Pas encore de résultat', 'Sin resultado todavía')}</span> : fightSummary(fight, lang)}
      </td>
      <td className="py-3.5 text-base max-md:py-0">{fight.pick ? <Pick pick={fight.pick} /> : <span className="text-[var(--muted)]">{L(lang, 'Sem palpite', 'No pick', 'Pas de pronostic', 'Sin pronóstico')}</span>}</td>
    </tr>
  )
}

/** The model's pick, its estimated chance and whether it was right: an icon and a word, never a colour alone. */
function Pick({ pick }: { pick: NonNullable<ResultFight['pick']> }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span className="max-md:font-semibold">
        <span className="md:sr-only">{L(lang, 'Palpite: ', 'Pick: ', 'Pronostic : ', 'Pronóstico: ')}</span>
        {pick.predicted_winner} ({formatProbability(pick.confidence)})
      </span>
      {pick.correct == null ? null : pick.correct ? (
        <span className="inline-flex items-center gap-1 font-bold text-[var(--positive)]">
          <Check className="h-4 w-4" aria-hidden="true" />
          {L(lang, 'acertou', 'right', 'juste', 'acertó')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 font-bold">
          <X className="h-4 w-4" aria-hidden="true" />
          {L(lang, 'errou', 'wrong', 'raté', 'falló')}
        </span>
      )}
    </span>
  )
}
