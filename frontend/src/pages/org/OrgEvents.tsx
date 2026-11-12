import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, CalendarDays, ChevronDown, MapPin, Search, Swords } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton'
import { OrgFightRow } from '../../shared/components/OrgFightRow'
import { OrgFighterModal } from '../../shared/components/OrgFighterModal'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { Section } from '../../shared/components/ui/Section'
import { L, localeTag } from '../../i18n/lang'
import { orgEs, orgPt } from '../../shared/data/orgs'
import { translateHometown } from '../../shared/data/fightLabels'
import { formatDate } from '../../shared/data/orgFormat'
import { useOrg } from '../../shared/hooks/useOrg'
import { useOrgEvents, useOrgUpcomingEvents } from '../../shared/hooks/useOrgData'
import { useUpcomingPicks } from '../../shared/hooks/useUpcomingPicks'
import type { UpcomingPick } from '../../shared/types/api'
import type { OrgEvent } from '../../shared/types/api'

/** Today's card still counts as to come until its results are in. */
function isUpcoming(date: string | null) {
  return date !== null && date >= new Date().toISOString().slice(0, 10)
}

function eventKey(event: OrgEvent) {
  return event.slug ?? event.event_url ?? event.name
}

export function OrgEvents() {
  const { i18n } = useTranslation()
  const allYearsLabel = L(i18n.language, 'Todos os anos', 'All years', 'Toutes les années', 'Todos los años')

  const org = useOrg()
  const { events, loading, error } = useOrgEvents(org.id)
  const upcoming = useOrgUpcomingEvents(org.id)
  const pickFor = useUpcomingPicks(org.id, org.hasPredictions)
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [openEvents, setOpenEvents] = useState<Set<string>>(new Set())
  const [openYears, setOpenYears] = useState<Set<string>>(new Set())
  const [profileName, setProfileName] = useState<string | null>(null)

  const years = useMemo(() => {
    const found = new Set<string>()
    for (const event of events) if (event.date) found.add(event.date.slice(0, 4))
    return Array.from(found).sort((a, b) => Number(b) - Number(a))
  }, [events])

  const isSearching = query.trim() !== '' || yearFilter !== 'ALL'

  const matchesFilters = useCallback(
    (event: OrgEvent) => {
      const term = query.trim().toLowerCase()
      const matchesQuery =
        !term ||
        event.name.toLowerCase().includes(term) ||
        (event.circuit ?? '').toLowerCase().includes(term) ||
        formatDate(event.date, true, i18n.language).toLowerCase().includes(term) ||
        (event.date ?? '').includes(term) ||
        (event.location ?? '').toLowerCase().includes(term) ||
        event.fights.some((fight) => fight.fighter_1.toLowerCase().includes(term) || fight.fighter_2.toLowerCase().includes(term))
      return matchesQuery && (yearFilter === 'ALL' || event.date?.slice(0, 4) === yearFilter)
    },
    [query, yearFilter, i18n.language],
  )

  const visibleEvents = useMemo(() => events.filter(matchesFilters), [events, matchesFilters])
  const visibleUpcoming = useMemo(() => (isSearching ? upcoming.events.filter(matchesFilters) : upcoming.events), [isSearching, upcoming.events, matchesFilters])
  const totalFights = useMemo(() => events.reduce((sum, event) => sum + event.fight_count, 0), [events])

  const byYear = useMemo(() => {
    const groups = new Map<string, OrgEvent[]>()
    for (const event of visibleEvents) {
      const year = event.date?.slice(0, 4) ?? L(i18n.language, 'Sem data', 'Unknown', 'Date inconnue', 'Sin fecha')
      groups.set(year, [...(groups.get(year) ?? []), event])
    }
    return Array.from(groups.entries()).sort(([a], [b]) => Number(b) - Number(a))
  }, [visibleEvents, i18n.language])

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  }

  const latestYear = byYear[0]?.[0]

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
            eyebrow={L(i18n.language, 'Histórico de eventos', 'Event archive', 'Historique des événements', 'Archivo de eventos')}
            title={L(i18n.language, `Cards e lutas ${orgPt(org, 'de')}`, `${org.shortName} fight cards`, `Cartes et combats ${org.shortName}`, `Carteleras y peleas de ${orgEs(org)}`)}
            description={L(
              i18n.language,
              'Histórico completo de eventos. Abra o card para ver todos os confrontos, vencedores, método e round.',
              'Search the full event history and open a card to see every fight, the winner, method and round.',
              'Historique complet des événements. Ouvrez une carte pour voir chaque combat, le vainqueur, la méthode et le round.',
              'Busca en el historial completo de eventos y abre una cartelera para ver cada pelea, el ganador, el método y el asalto.',
            )}
            stats={[
              { label: L(i18n.language, 'Eventos', 'Events', 'Événements', 'Eventos'), value: visibleEvents.length.toLocaleString(localeTag(i18n.language)) },
              { label: L(i18n.language, 'Lutas catalogadas', 'Fights tracked', 'Combats suivis', 'Peleas registradas'), value: totalFights.toLocaleString(localeTag(i18n.language)) },
            ]}
      >
        <div className="grid gap-2.5 sm:grid-cols-[1fr_180px]">
          <div className="soft-input flex items-center gap-2.5 rounded-sm px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-red)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={L(i18n.language, 'Buscar por evento, lutador, data ou local...', 'Search event, fighter, date or location', 'Chercher un événement, un combattant, une date ou un lieu...', 'Buscar evento, peleador, fecha o sede...')}
              aria-label={L(i18n.language, 'Buscar eventos', 'Search events', 'Chercher des événements', 'Buscar eventos')}
              className="w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            aria-label={L(i18n.language, 'Filtrar por ano', 'Filter by year', 'Filtrer par année', 'Filtrar por año')}
            className="soft-input min-w-0 rounded-sm px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="ALL">{allYearsLabel}</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      {upcoming.loading ? (
        <LoadingSkeleton className="h-[80px]" />
      ) : visibleUpcoming.length ? (
        <Section
          icon={CalendarClock}
          title={`${L(i18n.language, 'Próximos cards & eventos', 'Upcoming events', 'Prochaines cartes et événements', 'Próximas carteleras y eventos')} (${visibleUpcoming.length})`}
        >
          <div className="grid gap-3">
            {visibleUpcoming.map((event, index) => {
              const key = eventKey(event)
              return (
                <EventCard
                  key={key}
                  org={org.id}
                  event={event}
                  isOpen={openEvents.has(key) !== (index === 0 && !isSearching)}
                  onToggle={() => setOpenEvents((current) => toggle(current, key))}
                  onOpenFighter={setProfileName}
                  pickFor={pickFor}
                />
              )
            })}
          </div>
        </Section>
      ) : null}

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading ? (
        <section className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[110px]" />
          ))}
        </section>
      ) : byYear.length ? (
        <div className="space-y-8">
          {byYear.map(([year, yearEvents]) => {
            const isOpen = openYears.has(year) !== (isSearching || year === latestYear)
            return (
              <section key={year}>
                <h2 className="section-title border-b border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setOpenYears((current) => toggle(current, year))}
                    className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2 rounded-sm px-2 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                    aria-expanded={isOpen}
                  >
                    <Swords className="h-4 w-4 shrink-0 text-[var(--text-red)]" />
                    <span>{year}</span>
                    <span className="font-sans text-sm font-medium text-[var(--text-muted)]">({yearEvents.length})</span>
                    <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-[var(--text-muted)] transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </h2>
                {isOpen ? (
                  <div className="mt-3 grid gap-3">
                    {yearEvents.map((event) => {
                      const key = eventKey(event)
                      return (
                        <EventCard
                          key={key}
                          org={org.id}
                          event={event}
                          isOpen={openEvents.has(key)}
                          onToggle={() => setOpenEvents((current) => toggle(current, key))}
                          onOpenFighter={setProfileName}
                        />
                      )
                    })}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="type-display text-2xl text-[var(--text-primary)]">
            {L(i18n.language, 'Nenhum evento encontrado', 'No events found', 'Aucun événement trouvé', 'No se encontraron eventos')}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {L(i18n.language, 'Ajuste os filtros para encontrar outro card.', 'Adjust the search to find another card.', 'Ajustez les filtres pour trouver une autre carte.', 'Ajusta los filtros para encontrar otra cartelera.')}
          </p>
        </div>
      )}

      {profileName ? <OrgFighterModal key={profileName} org={org} name={profileName} onClose={() => setProfileName(null)} onSelectFighter={setProfileName} /> : null}
    </div>
  )
}

function EventCard({
  org,
  event,
  isOpen,
  onToggle,
  onOpenFighter,
  pickFor,
}: {
  org: string
  event: OrgEvent
  isOpen: boolean
  onToggle: () => void
  onOpenFighter: (name: string) => void
  pickFor?: (event: string, fighterA: string, fighterB: string) => UpcomingPick | undefined
}) {
  const { i18n } = useTranslation()
  return (
    <article className="surface-card overflow-hidden rounded-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
        aria-expanded={isOpen}
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base leading-tight text-[var(--text-primary)]">{event.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(event.date, true, i18n.language)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Swords className="h-3.5 w-3.5" />
              {event.fight_count} {event.fight_count === 1 ? L(i18n.language, 'luta', 'fight', 'combat', 'pelea') : L(i18n.language, 'lutas', 'fights', 'combats', 'peleas')}
            </span>
            {event.circuit && event.circuit !== 'PFL' ? <span className="selector-chip !px-1.5 !py-0 text-label text-[var(--text-primary)]">{event.circuit}</span> : null}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <div className="border-t border-[var(--border-subtle)] px-4 py-4">
          {event.location ? (
            <p className="mb-2.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <MapPin className="h-3.5 w-3.5" />
              {translateHometown(event.location, i18n.language)}
            </p>
          ) : null}
          {event.fights.length ? (
            <div className="grid gap-3">
              {event.fights.map((fight, index) => (
                <OrgFightRow key={fight.fight_url ?? index} org={org} fight={fight} scheduled={isUpcoming(event.date)} pick={pickFor?.(event.name, fight.fighter_1, fight.fighter_2)} onOpenFighter={onOpenFighter} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              {L(i18n.language, 'Nenhuma luta detalhada disponível para este card ainda.', 'No fight data available for this card yet.', 'Aucun combat détaillé n’est encore disponible pour cette carte.', 'Todavía no hay datos detallados de peleas para esta cartelera.')}
            </p>
          )}
        </div>
      ) : null}
    </article>
  )
}
