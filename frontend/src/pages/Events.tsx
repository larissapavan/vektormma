import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock, CalendarDays, ChevronDown, Gamepad2, Hash, MapPin, Search, Swords } from 'lucide-react'

import { L, localeTag } from '../i18n/lang'
import { translateHometown } from '../shared/data/fightLabels'
import { formatMethod as formatMethodLabel } from '../shared/data/orgFormat'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { CardSimulatorModal } from '../shared/components/CardSimulatorModal'
import { LatestNewsCard } from '../shared/components/LatestNewsCard'
import { FightMatchupCard } from '../shared/components/FightMatchupCard'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { Section } from '../shared/components/ui/Section'
import { useEvents } from '../shared/hooks/useEvents'
import { useUpcomingEvents } from '../shared/hooks/useUpcomingEvents'
import { useUpcomingPicks } from '../shared/hooks/useUpcomingPicks'
import type { EventSummary, FightResult, UpcomingPick } from '../shared/types/api'

const NUMBERED_EVENT_PATTERN = /^UFC \d+/

const MONTH_KEYS = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12'
]

/** Opens a fighter's profile on top of the page, so closing it leaves the reader on the same card. */
const OpenProfileContext = createContext<(name: string) => void>(() => undefined)

export function Events() {
  const { t, i18n } = useTranslation()
  const { events, loading, error } = useEvents()
  const upcoming = useUpcomingEvents()
  const pickFor = useUpcomingPicks()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [monthFilter, setMonthFilter] = useState('ALL')
  const [openEvents, setOpenEvents] = useState<Set<string>>(new Set())
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [profileName, setProfileName] = useState<string | null>(null)
  const [simulatingEvent, setSimulatingEvent] = useState<EventSummary | null>(null)

  const years = useMemo(() => {
    const found = new Set<string>()
    for (const event of events) {
      if (event.date) found.add(event.date.slice(0, 4))
    }
    return Array.from(found).sort((a, b) => Number(b) - Number(a))
  }, [events])

  const isSearching = query.trim() !== '' || yearFilter !== 'ALL' || monthFilter !== 'ALL'

  const matchesFilters = useCallback(
    (event: EventSummary) => {
      const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const term = fold(query.trim())
      const formattedDate = fold(formatEventDate(event.date, i18n.language))
      const matchesQuery =
        !term ||
        fold(event.name).includes(term) ||
        formattedDate.includes(term) ||
        (event.date ?? '').includes(term) ||
        fold(event.location ?? '').includes(term) ||
        (event.fights ?? []).some((f) => fold(f.fighter_1).includes(term) || fold(f.fighter_2).includes(term))

      const matchesYear = yearFilter === 'ALL' || event.date?.slice(0, 4) === yearFilter
      const matchesMonth =
        monthFilter === 'ALL' || event.date?.slice(5, 7) === monthFilter

      return matchesQuery && matchesYear && matchesMonth
    },
    [query, yearFilter, monthFilter, i18n.language],
  )

  const visibleEvents = useMemo(() => events.filter(matchesFilters), [events, matchesFilters])
  const visibleUpcoming = useMemo(
    () => (isSearching ? upcoming.events.filter(matchesFilters) : upcoming.events),
    [isSearching, upcoming.events, matchesFilters],
  )

  const totalFights = useMemo(() => events.reduce((sum, event) => sum + event.fight_count, 0), [events])

  const numberedEvents = useMemo(
    () => visibleEvents.filter((event) => NUMBERED_EVENT_PATTERN.test(event.name)),
    [visibleEvents],
  )
  const fightNightEvents = useMemo(
    () => visibleEvents.filter((event) => !NUMBERED_EVENT_PATTERN.test(event.name)),
    [visibleEvents],
  )

  const toggleEvent = (key: string) => {
    setOpenEvents((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleGroup = (key: string) => {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const results = (
    <>
      {error ? (
        <p className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 px-3 py-2 text-sm font-semibold text-[var(--text-red)]">{error}</p>
      ) : null}

      {loading ? (
        <section className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[110px]" />
          ))}
        </section>
      ) : visibleEvents.length ? (
        <div className="space-y-8">
          {isSearching && numberedEvents.length === 0 ? null : (
            <EventGroup
              groupKey="numbered"
              title={t('events.numberedEvents')}
              icon={Hash}
              events={numberedEvents}
              isOpen={openGroups.has('numbered') || isSearching}
              onToggleGroup={toggleGroup}
              openEvents={openEvents}
              onToggle={toggleEvent}
            />
          )}
          {isSearching && fightNightEvents.length === 0 ? null : (
            <EventGroup
              groupKey="fight-night"
              title={t('events.fightNight')}
              icon={Swords}
              events={fightNightEvents}
              isOpen={openGroups.has('fight-night') || isSearching}
              onToggleGroup={toggleGroup}
              openEvents={openEvents}
              onToggle={toggleEvent}
            />
          )}
        </div>
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="type-display text-2xl text-[var(--text-primary)]">
            {t('events.noEventsFound')}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{t('events.noEventsSub')}</p>
        </div>
      )}
    </>
  )

  const getMonthLabel = (m: string) => {
    const d = new Date(2024, Number(m) - 1, 15)
    return d.toLocaleString(localeTag(i18n.language), { month: 'long' })
  }

  return (
    <OpenProfileContext.Provider value={setProfileName}>
      <div className="space-y-8 sm:space-y-10">
        <PageHeader
          eyebrow={t('events.eyebrow')}
          title={t('events.title')}
          description={t('events.description')}
          stats={[
            { label: t('events.eventsCount'), value: visibleEvents.length.toLocaleString(localeTag(i18n.language)) },
            { label: t('events.fightsTracked'), value: totalFights.toLocaleString(localeTag(i18n.language)) },
          ]}
        >
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[1fr_180px_180px]">
            <div className="soft-input col-span-2 flex items-center gap-2.5 rounded-control px-3 py-2.5 lg:col-span-1">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-red)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('events.searchPlaceholder')}
                aria-label={t('events.searchPlaceholder')}
                className="w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              aria-label={L(i18n.language, 'Filtrar por ano', 'Filter by year', 'Filtrer par année', 'Filtrar por año')}
              className="soft-input min-w-0 rounded-control px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="ALL">{t('events.allYears')}</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              aria-label={L(i18n.language, 'Filtrar por mês', 'Filter by month', 'Filtrer par mois', 'Filtrar por mes')}
              className="soft-input min-w-0 rounded-control px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="ALL">{t('events.allMonths')}</option>
              {MONTH_KEYS.map((month) => (
                <option key={month} value={month}>
                  {getMonthLabel(month)}
                </option>
              ))}
            </select>
          </div>
        </PageHeader>

        {isSearching ? <div className="space-y-8">{results}</div> : null}

        <UpcomingEventsSection
          events={visibleUpcoming}
          loading={upcoming.loading}
          error={upcoming.error}
          openEvents={openEvents}
          onToggle={toggleEvent}
          onSimulate={setSimulatingEvent}
        />

        {isSearching ? null : results}

        {isSearching ? null : <LatestNewsCard quiet />}

        {profileName ? (
          <FighterProfileModal
            key={profileName}
            name={profileName}
            onClose={() => setProfileName(null)}
            onSelectFighter={setProfileName}
          />
        ) : null}

        {simulatingEvent ? (
          <CardSimulatorModal
            event={simulatingEvent}
            pickFor={pickFor}
            onClose={() => setSimulatingEvent(null)}
            onOpenFighter={setProfileName}
          />
        ) : null}
      </div>
    </OpenProfileContext.Provider>
  )
}

function UpcomingEventsSection({
  events,
  loading,
  error,
  openEvents,
  onToggle,
  onSimulate,
}: {
  events: EventSummary[]
  loading: boolean
  error: string | null
  openEvents: Set<string>
  onToggle: (key: string) => void
  onSimulate?: (event: EventSummary) => void
}) {
  const { t } = useTranslation()
  const pickFor = useUpcomingPicks()

  if (loading) {
    return <LoadingSkeleton className="h-[80px]" />
  }

  if (error || events.length === 0) {
    return null
  }

  return (
    <Section rows icon={CalendarClock} title={`${t('events.upcomingSection')} (${events.length})`}>
      <ul>
        {events.map((event) => {
          const key = event.event_url ?? event.name
          return (
            <EventCard
              key={key}
              event={event}
              isOpen={openEvents.has(key)}
              onToggle={() => onToggle(key)}
              pickFor={pickFor}
              onSimulate={onSimulate}
            />
          )
        })}
      </ul>
    </Section>
  )
}

function EventGroup({
  groupKey,
  title,
  icon: Icon,
  events,
  isOpen,
  onToggleGroup,
  openEvents,
  onToggle,
}: {
  groupKey: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  events: EventSummary[]
  isOpen: boolean
  onToggleGroup: (key: string) => void
  openEvents: Set<string>
  onToggle: (key: string) => void
}) {
  const { i18n } = useTranslation()
  return (
    <section>
      <h2 className="section-title pb-1">
        <button
          type="button"
          onClick={() => onToggleGroup(groupKey)}
          className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2 rounded-control px-2 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
          aria-expanded={isOpen}
        >
          <Icon className="h-4 w-4 shrink-0 text-[var(--text-red)]" />
          <span className="min-w-0">{title}</span>
          <span className="font-sans text-sm font-medium text-[var(--text-muted)]">({events.length})</span>
          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-[var(--text-muted)] transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </h2>

      {isOpen ? (
        <div>
          {events.length ? (
            <ul className="border-t-[3px] border-[var(--ink)]">
              {events.map((event) => {
                const key = event.event_url ?? event.name
                return (
                  <EventCard key={key} event={event} isOpen={openEvents.has(key)} onToggle={() => onToggle(key)} />
                )
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              {L(i18n.language, 'Nenhum resultado nesta seção.', 'No matches in this section.', 'Aucun résultat dans cette section.', 'No hay resultados en esta sección.')}
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}

function EventCard({
  event,
  isOpen,
  onToggle,
  pickFor,
  onSimulate,
}: {
  event: EventSummary
  isOpen: boolean
  onToggle: () => void
  pickFor?: (event: string, fighterA: string, fighterB: string) => UpcomingPick | undefined
  onSimulate?: (event: EventSummary) => void
}) {
  const { t, i18n } = useTranslation()

  return (
    <li className="border-b border-[var(--rule)]">
      <button
        type="button"
        onClick={onToggle}
        className="row-link flex w-full cursor-pointer flex-wrap items-center gap-x-8 gap-y-2 px-3 py-5 text-left hover:bg-[var(--panel)]"
        aria-expanded={isOpen}
      >
        <h3 className="min-w-0 flex-[1.4_1_320px] font-display text-[30px] font-black leading-none sm:text-[40px]">{event.name}</h3>
        <div className="contents">
          <div className="flex flex-[1_1_240px] flex-wrap gap-x-4 gap-y-1 text-base text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatEventDate(event.date, i18n.language)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Swords className="h-3.5 w-3.5" />
              {event.fight_count} {t('events.fights')}
            </span>
          </div>
        </div>
        <ChevronDown className={`h-7 w-7 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="px-3 pb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {event.location ? (
              <p className="flex items-center gap-1.5 text-base text-[var(--muted)]">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {translateHometown(event.location, i18n.language)}
              </p>
            ) : <span />}

            {pickFor && event.fights.length && onSimulate ? (
              <button
                type="button"
                onClick={() => onSimulate(event)}
                className="ghost-action inline-flex cursor-pointer items-center gap-2 px-4"
              >
                <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                {L(i18n.language, 'Dar seus palpites para o card', 'Make your picks for the card', 'Faire vos pronostics sur la carte', 'Haz tus pronósticos de la cartelera')}
              </button>
            ) : null}
          </div>

          {event.fights.length ? (
            <div className="grid gap-3">
              {event.fights.map((fight, index) => (
                <FightRow key={fight.fight_url ?? index} eventName={event.name} fight={fight} pick={pickFor?.(event.name, fight.fighter_1, fight.fighter_2)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">{t('common.noResults')}</p>
          )}
        </div>
      ) : null}
    </li>
  )
}

function FightRow({ eventName, fight, pick }: { eventName: string; fight: FightResult; pick?: UpcomingPick }) {
  const { i18n } = useTranslation()
  const openProfile = useContext(OpenProfileContext)
  const details = [
    [formatMethod(fight, i18n.language), fight.round ? `R${fight.round}` : null, fight.time, fight.num_rounds ? `${fight.num_rounds} rounds` : null]
      .filter(Boolean)
      .join(' · '),
    fight.referee ? L(i18n.language, `Árbitro: ${fight.referee}`, `Referee: ${fight.referee}`, `Arbitre : ${fight.referee}`, `Árbitro: ${fight.referee}`) : null,
    fight.result?.startsWith('Decision') && fight.result_details ? `${fight.result} · ${fight.result_details}` : null,
  ].filter((line): line is string => Boolean(line))

  return <FightMatchupCard fight={fight} pick={pick} eventName={eventName} onOpenFighter={openProfile} details={details} />
}

function formatEventDate(date: string | null, lang: string = 'en-US'): string {
  if (!date) return L(lang, 'Data a confirmar', 'Date unknown', 'Date inconnue', 'Fecha por confirmar')
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(localeTag(lang), { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMethod(fight: FightResult, language: string | boolean = false): string {
  return formatMethodLabel(fight.method, fight.method_detail, language) ?? L(language, 'Resultado a definir', 'Result pending', 'Résultat en attente', 'Resultado pendiente')
}
