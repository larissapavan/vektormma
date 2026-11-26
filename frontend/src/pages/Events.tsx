import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CalendarClock, CalendarDays, ChevronDown, ClipboardPen, Hash, MapPin, Search, Swords } from 'lucide-react'

import { L, localeTag } from '../i18n/lang'
import { eventPreview } from '../shared/data/eventText'
import { translateHometown } from '../shared/data/fightLabels'
import { formatMethod as formatMethodLabel } from '../shared/data/orgFormat'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { LatestNewsCard } from '../shared/components/LatestNewsCard'
import { FightMatchupCard } from '../shared/components/FightMatchupCard'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { EventsTabs } from '../shared/components/EventsTabs'
import { MobileFilters } from '../shared/components/ui/MobileFilters'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { Section } from '../shared/components/ui/Section'
import { useEvents } from '../shared/hooks/useEvents'
import { useUpcomingEvents } from '../shared/hooks/useUpcomingEvents'
import { useUpcomingPicks } from '../shared/hooks/useUpcomingPicks'
import { useClearUrlParams, useUrlParam } from '../shared/hooks/useUrlParam'
import { getDivisionName } from '../shared/data/divisions'
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
  const [query, setQuery] = useUrlParam('q')
  const [yearFilter, setYearFilter] = useUrlParam('year', 'ALL')
  const [monthFilter, setMonthFilter] = useUrlParam('month', 'ALL', ['ALL', ...MONTH_KEYS])
  const [openEvents, setOpenEvents] = useState<Set<string>>(new Set())
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [profileName, setProfileName] = useState<string | null>(null)

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

  // The card named in the address (?q=UFC 324, from "See the full card") opens by itself; a click closes it like any other.
  const isEventOpen = useCallback((event: EventSummary) => openEvents.has(event.event_url ?? event.name) !== (query.trim() === event.name), [openEvents, query])

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
        <p role="alert" className="error-note">{error}</p>
      ) : null}

      {loading ? (
        <section className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[110px]" />
          ))}
        </section>
      ) : visibleEvents.length ? (
        <div className="space-y-6">
          {isSearching && numberedEvents.length === 0 ? null : (
            <EventGroup
              groupKey="numbered"
              title={t('events.numberedEvents')}
              icon={Hash}
              events={numberedEvents}
              isOpen={openGroups.has('numbered') || isSearching}
              onToggleGroup={toggleGroup}
              isEventOpen={isEventOpen}
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
              isEventOpen={isEventOpen}
              onToggle={toggleEvent}
            />
          )}
        </div>
      ) : isSearching && visibleUpcoming.length ? null : (
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
      <div className="space-y-6 sm:space-y-8">
        <EventsTabs upcomingTo="/events" resultsTo="/results" />
        <PageHeader
          title={t('events.title')}
          description={t('events.description')}
          stats={[
            { label: t('events.eventsCount'), value: (visibleEvents.length + visibleUpcoming.length).toLocaleString(localeTag(i18n.language)) },
            { label: t('events.fightsTracked'), value: totalFights.toLocaleString(localeTag(i18n.language)) },
          ]}
        >
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px]">
            <div className="soft-input flex items-center gap-2.5 rounded-sm px-3 py-2.5 sm:col-span-2 lg:col-span-1">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-red)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('events.searchPlaceholder')}
                aria-label={t('events.searchPlaceholder')}
                className="w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <MobileFilters active={[yearFilter, monthFilter].filter((value) => value !== 'ALL').length} className="grid grid-cols-2 gap-2.5 sm:col-span-2 lg:col-span-2 lg:grid-cols-[180px_180px]">
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              aria-label={L(i18n.language, 'Filtrar por ano', 'Filter by year', 'Filtrer par année', 'Filtrar por año')}
              className="soft-input min-w-0 rounded-sm px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
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
              className="soft-input min-w-0 rounded-sm px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="ALL">{t('events.allMonths')}</option>
              {MONTH_KEYS.map((month) => (
                <option key={month} value={month}>
                  {getMonthLabel(month)}
                </option>
              ))}
            </select>
            </MobileFilters>
          </div>
        </PageHeader>

        <UpcomingEventsSection
          events={visibleUpcoming}
          loading={upcoming.loading}
          error={upcoming.error}
          isEventOpen={isEventOpen}
          onToggle={toggleEvent}
        />

        {results}

        {isSearching ? null : <LatestNewsCard quiet />}

        {profileName ? (
          <FighterProfileModal
            key={profileName}
            name={profileName}
            onClose={() => setProfileName(null)}
            onSelectFighter={setProfileName}
          />
        ) : null}
      </div>
    </OpenProfileContext.Provider>
  )
}

/** How big the favourite's chance is, by its value in the address: from (included) and to (not included). */
const CHANCES: Record<string, [number, number]> = { even: [0, 0.55], slight: [0.55, 0.65], clear: [0.65, 1.01] }
const UPCOMING_FILTERS = ['chance', 'class', 'fights'] as const

function UpcomingEventsSection({
  events,
  loading,
  error,
  isEventOpen,
  onToggle,
}: {
  events: EventSummary[]
  loading: boolean
  error: string | null
  isEventOpen: (event: EventSummary) => boolean
  onToggle: (key: string) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const pickFor = useUpcomingPicks()
  const [chance, setChance] = useUrlParam('chance', '', Object.keys(CHANCES))
  const [weightClass, setWeightClass] = useUrlParam('class')
  const [kind, setKind] = useUrlParam('fights', '', ['title', 'known'])
  const clear = useClearUrlParams(UPCOMING_FILTERS)
  const filtering = Boolean(chance || weightClass || kind)

  const classes = useMemo(
    () => [...new Set(events.flatMap((event) => event.fights.map((fight) => fight.weight_class)).filter((name): name is string => Boolean(name)))].sort((x, y) => getDivisionName(x, lang).localeCompare(getDivisionName(y, lang), localeTag(lang))),
    [events, lang],
  )
  // With a filter on, each card keeps only the fights that match, and a card without one leaves the list.
  const shown = useMemo(() => {
    if (!filtering) return events
    const range = CHANCES[chance]
    return events
      .map((event) => {
        const fights = event.fights.filter((fight) => {
          const pick = pickFor(event.name, fight.fighter_1, fight.fighter_2)
          if (range && !(pick && pick.probability >= range[0] && pick.probability < range[1])) return false
          if (weightClass && fight.weight_class !== weightClass) return false
          if (kind === 'title') return Boolean(fight.title_fight ?? pick?.title_fight)
          return kind !== 'known' || Boolean(pick && pick.data_level !== 'thin')
        })
        return { ...event, fights, fight_count: fights.length }
      })
      .filter((event) => event.fights.length > 0)
  }, [events, filtering, chance, weightClass, kind, pickFor])
  const fightCount = shown.reduce((sum, event) => sum + event.fights.length, 0)

  if (loading) {
    return <LoadingSkeleton className="h-[80px]" />
  }

  if (error || events.length === 0) {
    return null
  }

  const select = 'soft-input min-w-0 rounded-sm px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none'
  return (
    <Section rows icon={CalendarClock} title={`${t('events.upcomingSection')} (${shown.length})`}>
      <div role="group" aria-label={L(lang, 'Filtrar os próximos combates', 'Filter the upcoming fights', 'Filtrer les prochains combats', 'Filtrar las próximas peleas')} className="py-4">
      <MobileFilters label={L(lang, 'Filtrar lutas', 'Filter fights', 'Filtrer les combats', 'Filtrar peleas')} active={[chance, weightClass, kind].filter(Boolean).length} className="grid gap-2.5 max-sm:mt-2.5 sm:grid-cols-3">
        <select value={chance} onChange={(event) => setChance(event.target.value)} aria-label={L(lang, 'Filtrar por chance do favorito', 'Filter by the favorite’s chance', 'Filtrer par chance du favori', 'Filtrar por probabilidad del favorito')} className={select}>
          <option value="">{L(lang, 'Qualquer chance do favorito', 'Any chance for the favorite', 'Toutes les chances du favori', 'Cualquier probabilidad del favorito')}</option>
          <option value="even">{L(lang, 'Lutas parelhas (até 55%)', 'Toss-ups (up to 55%)', 'Combats équilibrés (jusqu’à 55 %)', 'Peleas parejas (hasta 55 %)')}</option>
          <option value="slight">{L(lang, 'Leve vantagem (55% a 65%)', 'Slight edge (55% to 65%)', 'Léger avantage (55 % à 65 %)', 'Ligera ventaja (55 % a 65 %)')}</option>
          <option value="clear">{L(lang, 'Vantagem clara (65% ou mais)', 'Clear edge (65% or more)', 'Avantage net (65 % ou plus)', 'Ventaja clara (65 % o más)')}</option>
        </select>
        <select value={weightClass} onChange={(event) => setWeightClass(event.target.value)} aria-label={L(lang, 'Filtrar por categoria', 'Filter by weight class', 'Filtrer par catégorie', 'Filtrar por división')} className={select}>
          <option value="">{L(lang, 'Todas as categorias', 'All weight classes', 'Toutes les catégories', 'Todas las divisiones')}</option>
          {classes.map((name) => (
            <option key={name} value={name}>
              {getDivisionName(name, lang)}
            </option>
          ))}
        </select>
        <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label={L(lang, 'Filtrar por tipo de luta', 'Filter by kind of fight', 'Filtrer par type de combat', 'Filtrar por tipo de pelea')} className={select}>
          <option value="">{L(lang, 'Todas as lutas', 'All fights', 'Tous les combats', 'Todas las peleas')}</option>
          <option value="title">{L(lang, 'Só lutas por cinturão', 'Title fights only', 'Combats pour le titre seulement', 'Solo peleas por el título')}</option>
          <option value="known">{L(lang, 'Sem previsões com poucos dados', 'Without picks on thin data', 'Sans les pronostics aux données limitées', 'Sin pronósticos con pocos datos')}</option>
        </select>
      </MobileFilters>
      </div>
      {filtering ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <p className="text-base" role="status">
            {fightCount === 1 ? L(lang, '1 luta encontrada', '1 fight found', '1 combat trouvé', '1 pelea encontrada') : L(lang, `${fightCount} lutas encontradas`, `${fightCount} fights found`, `${fightCount} combats trouvés`, `${fightCount} peleas encontradas`)}
          </p>
          <button type="button" onClick={clear} className="ghost-action inline-flex min-h-11 cursor-pointer items-center px-4 text-sm">
            {L(lang, 'Limpar filtros', 'Clear filters', 'Effacer les filtres', 'Quitar filtros')}
          </button>
        </div>
      ) : null}
      <ul>
        {shown.map((event) => {
          const key = event.event_url ?? event.name
          return (
            <EventCard
              key={key}
              event={event}
              isOpen={filtering || isEventOpen(event)}
              onToggle={() => onToggle(key)}
              pickFor={pickFor}
              partial={filtering}
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
  isEventOpen,
  onToggle,
}: {
  groupKey: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  events: EventSummary[]
  isOpen: boolean
  onToggleGroup: (key: string) => void
  isEventOpen: (event: EventSummary) => boolean
  onToggle: (key: string) => void
}) {
  const { i18n } = useTranslation()
  return (
    <section>
      <h2 className="section-title pb-1">
        <button
          type="button"
          onClick={() => onToggleGroup(groupKey)}
          className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2 rounded-sm px-2 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
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
                  <EventCard key={key} event={event} isOpen={isEventOpen(event)} onToggle={() => onToggle(key)} />
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
  partial = false,
}: {
  event: EventSummary
  isOpen: boolean
  onToggle: () => void
  pickFor?: (event: string, fighterA: string, fighterB: string) => UpcomingPick | undefined
  /** Only some of the card's fights are listed (a filter is on). */
  partial?: boolean
}) {
  const { t, i18n } = useTranslation()
  // The first bout listed is the main event (a filtered card may not list it, so it is not named then).
  const mainEvent = partial ? null : (event.fights[0] ?? null)
  // A short written read of the card: only for one that has not happened yet, and only once its fights are listed.
  const upcoming = !partial && event.fights.length > 0 && event.fights.every((fight) => !fight.winner)
  const preview = upcoming
    ? eventPreview(
        i18n.language,
        event.name,
        event.fights.map((fight) => {
          const pick = pickFor?.(event.name, fight.fighter_1, fight.fighter_2)
          return {
            a: fight.fighter_1,
            b: fight.fighter_2,
            weightClass: fight.weight_class,
            title: fight.title_fight,
            pick: pick ? { winner: pick.predicted_winner, probability: pick.probability } : null,
          }
        }),
      )
    : []

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
              {event.fight_count === 1 ? L(i18n.language, '1 luta', '1 fight', '1 combat', '1 pelea') : `${event.fight_count} ${t('events.fights')}`}
            </span>
            {mainEvent ? (
              <span className="basis-full text-[var(--ink)]">
                <span className="text-[var(--muted)]">{L(i18n.language, 'Luta principal: ', 'Main event: ', 'Combat principal : ', 'Pelea estelar: ')}</span>
                <span className="font-semibold">{mainEvent.fighter_1} vs {mainEvent.fighter_2}</span>
              </span>
            ) : null}
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

            {pickFor && event.date && event.fights.length ? (
              <Link to={`/my-card?card=${event.date}`} className="ghost-action inline-flex items-center gap-2 px-4">
                <ClipboardPen className="h-4 w-4" aria-hidden="true" />
                {L(i18n.language, 'Dar seus palpites para o card', 'Make your picks for the card', 'Faire vos pronostics sur la carte', 'Haz tus pronósticos de la cartelera')}
              </Link>
            ) : null}
          </div>

          {preview.length ? <p className="mb-4 max-w-[70ch] text-base leading-7">{preview.join(' ')}</p> : null}

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
