import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  ExternalLink,
  Flame,
  Footprints,
  HandFist,
  Hammer,
  LayoutGrid,
  Medal,
  Radio,
  Search,
  Shield,
  SlidersHorizontal,
  Swords,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { L, localeTag, uiLang, type UiLang } from '../i18n/lang'
import { ChampionBelt } from '../shared/components/ChampionBelt'
import { FlagList } from '../shared/components/FighterBadges'
import { BADGES, getBadgeLabel } from '../shared/data/badges'
import { getDivisionName } from '../shared/data/divisions'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { Eyebrow } from '../shared/components/ui/Eyebrow'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { formatPercent, localizeCountryName } from '../shared/data/fightLabels'
import { isKnownActive, isKnownRetired } from '../shared/data/fighterStatusOverrides'
import {
  compareFighters,
  divisionHistory,
  divisionalRanks,
  foldName,
  historyOf,
  rankLabel,
  ranksOf,
  type HistoryEntry,
} from '../shared/data/fighterOrder'
import { useFighters } from '../shared/hooks/useFighters'
import { useChampions } from '../shared/hooks/useChampions'
import { useRankings } from '../shared/hooks/useRankings'
import { getFighterImageUrl, useFighterImages, type FighterImageRecord } from '../shared/hooks/useFighterImages'
import { photoRightsText, usePhotoCredit } from '../shared/hooks/usePhotoCredit'
import type { FighterProfile } from '../shared/types/api'

type UfcStatus = 'active' | 'former' | 'never'
type ActiveFilter = 'all' | Exclude<UfcStatus, 'never'>

type DivisionGroup = {
  key: string
  label: string
  shortLabel: string
  limit: string
  icon: LucideIcon
  tone: 'red' | 'blue' | 'gold'
  match: (fighter: FighterProfile) => boolean
}

// The UFC runs three women's divisions today. The discontinued Women's Featherweight (a handful of former fighters)
// has no tab of its own: those fighters are listed under Open Class.
/** The division bar's first choice: every division on one page instead of one at a time. */
const ALL_DIVISIONS = 'all'

const divisionGroups: DivisionGroup[] = [
  { key: 'flyweight', label: 'Flyweight', shortLabel: 'FLW', limit: '125 lb', icon: Zap, tone: 'blue', match: byDivision('flyweight') },
  { key: 'bantamweight', label: 'Bantamweight', shortLabel: 'BW', limit: '135 lb', icon: Footprints, tone: 'red', match: byDivision('bantamweight') },
  { key: 'featherweight', label: 'Featherweight', shortLabel: 'FW', limit: '145 lb', icon: Target, tone: 'gold', match: byDivision('featherweight') },
  { key: 'lightweight', label: 'Lightweight', shortLabel: 'LW', limit: '155 lb', icon: Flame, tone: 'red', match: byDivision('lightweight') },
  { key: 'welterweight', label: 'Welterweight', shortLabel: 'WW', limit: '170 lb', icon: Shield, tone: 'blue', match: byDivision('welterweight') },
  { key: 'middleweight', label: 'Middleweight', shortLabel: 'MW', limit: '185 lb', icon: Swords, tone: 'gold', match: byDivision('middleweight') },
  { key: 'light-heavyweight', label: 'Light Heavyweight', shortLabel: 'LHW', limit: '205 lb', icon: HandFist, tone: 'red', match: byDivision('light heavyweight') },
  { key: 'heavyweight', label: 'Heavyweight', shortLabel: 'HW', limit: '265 lb', icon: Hammer, tone: 'blue', match: byDivision('heavyweight') },
  {
    key: 'w-strawweight',
    label: "Women's Strawweight",
    shortLabel: 'WSW',
    limit: '115 lb',
    icon: Timer,
    tone: 'gold',
    match: byDivision("women's strawweight"),
  },
  {
    key: 'w-flyweight',
    label: "Women's Flyweight",
    shortLabel: 'WFLW',
    limit: '125 lb',
    icon: Bell,
    tone: 'blue',
    match: byDivision("women's flyweight"),
  },
  {
    key: 'w-bantamweight',
    label: "Women's Bantamweight",
    shortLabel: 'WBW',
    limit: '135 lb',
    icon: Medal,
    tone: 'red',
    match: byDivision("women's bantamweight"),
  },
  {
    key: 'open-class',
    label: 'Open Class / Unclassified',
    shortLabel: 'OPEN',
    limit: 'Mixed',
    icon: Dumbbell,
    tone: 'blue',
    match: (fighter) => !divisionGroups.slice(0, -1).some((group) => group.match(fighter)),
  },
]

const STANCE_NAMES: Record<UiLang, Record<string, string> | null> = {
  en: null,
  pt: {
    Orthodox: 'Destro (Ortodoxo)',
    Southpaw: 'Canhoto',
    Switch: 'Ambidestro (Troca de base)',
    Open: 'Base aberta',
    'Open Stance': 'Base aberta',
    Sideways: 'Base lateral',
    Unknown: 'Desconhecida',
    'All stances': 'Todas as bases',
  },
  fr: {
    Orthodox: 'Droitier (orthodoxe)',
    Southpaw: 'Gaucher',
    Switch: 'Ambidextre (change de garde)',
    Open: 'Garde ouverte',
    'Open Stance': 'Garde ouverte',
    Sideways: 'Garde de profil',
    Unknown: 'Inconnue',
    'All stances': 'Toutes les gardes',
  },
  es: {
    Orthodox: 'Diestro (ortodoxo)',
    Southpaw: 'Zurdo',
    Switch: 'Ambidiestro (cambia de guardia)',
    Open: 'Guardia abierta',
    'Open Stance': 'Guardia abierta',
    Sideways: 'Guardia lateral',
    Unknown: 'Desconocida',
    'All stances': 'Todas las guardias',
  },
}

function stanceLabel(stance: string, language: string | boolean | null | undefined) {
  return STANCE_NAMES[uiLang(language)]?.[stance] ?? stance
}

/** Cards rendered per page in a division; the biggest divisions hold several hundred fighters. A phone gets fewer: each card is tall. */
const PAGE_SIZE = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches ? 12 : 24

export function Fighters() {
  const { t, i18n } = useTranslation()
  const { fighters, loading, error } = useFighters()
  const { imageByName } = useFighterImages()
  const { rankings } = useRankings()
  const ranks = useMemo(() => divisionalRanks(rankings), [rankings])
  const { data: champions } = useChampions()
  const history = useMemo(() => divisionHistory(champions?.reigns ?? []), [champions])
  // A division's own history: its champions, interim champions and title challengers, plus Hall of Famers filed there.
  const historyFor = useCallback(
    (group: DivisionGroup) => {
      const people = history.get(group.label.toLowerCase()) ?? new Map<string, HistoryEntry>()
      return (fighter: FighterProfile) => historyOf(fighter, people, group.match(fighter))
    },
    [history],
  )
  const [query, setQuery] = useState('')
  const [stanceFilter, setStanceFilter] = useState('All stances')
  const [badgeFilter, setBadgeFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [activeDivision, setActiveDivision] = useState('lightweight')
  const [searchParams, setSearchParams] = useSearchParams()
  // Deep link from other pages (e.g. Champions): /fighters?fighter=<name> opens that profile.
  const [selectedFighter, setSelectedFighter] = useState<string | null>(() => searchParams.get('fighter'))

  const statusOf = useCallback((fighter: FighterProfile): UfcStatus => {
    if (isKnownActive(fighter.name)) return 'active'
    const status = fighter.ufc_status ?? 'never'
    // A fighter on the manual retirement list did fight in the UFC, so they are former, not unknown.
    return isKnownRetired(fighter.name) ? 'former' : status
  }, [])

  const statusCounts = useMemo(() => {
    const counts: Record<UfcStatus, number> = { active: 0, former: 0, never: 0 }
    for (const fighter of fighters) counts[statusOf(fighter)] += 1
    return counts
  }, [fighters, statusOf])

  const stances = useMemo(
    () => ['All stances', ...Array.from(new Set(fighters.map((fighter) => fighter.stance).filter(Boolean))).sort()],
    [fighters],
  )

  // Every country with UFC fighters, by its name on screen, with how many fighters each one has.
  const countries = useMemo(() => {
    const byCode = new Map<string, { name: string; count: number }>()
    for (const fighter of fighters) {
      for (const nation of nationalitiesOf(fighter)) {
        const entry = byCode.get(nation.code) ?? { name: countryLabel(nation, i18n.language), count: 0 }
        entry.count += 1
        byCode.set(nation.code, entry)
      }
    }
    return [...byCode.entries()]
      .map(([code, entry]) => ({ code, ...entry }))
      .sort((a, b) => a.name.localeCompare(b.name, localeTag(i18n.language)))
  }, [fighters, i18n.language])

  const visibleFighters = useMemo(() => {
    const term = foldText(query.trim())
    return fighters.filter((fighter) => {
      const matchesName =
        !term ||
        foldText(fighter.name).includes(term) ||
        (fighter.nickname ? foldText(fighter.nickname).includes(term) : false)
      const matchesStance = stanceFilter === 'All stances' || fighter.stance === stanceFilter
      const matchesBadge = !badgeFilter || (fighter.badges ?? []).includes(badgeFilter)
      const matchesStatus = activeFilter === 'all' || statusOf(fighter) === activeFilter
      const matchesCountry = !countryFilter || nationalitiesOf(fighter).some((nation) => nation.code === countryFilter)
      return matchesName && matchesStance && matchesBadge && matchesStatus && matchesCountry
    })
  }, [fighters, query, stanceFilter, badgeFilter, countryFilter, activeFilter, statusOf])

  const groupedFighters = useMemo(() => {
    const groups = new Map<string, FighterProfile[]>()
    const isActive = (fighter: FighterProfile) => statusOf(fighter) === 'active'
    for (const group of divisionGroups) {
      const groupRanks = ranksOf(ranks, group.label)
      const pastOf = historyFor(group)
      // A fighter ranked in a division, or who held or fought for its belt, shows there too even when the record files
      // them in another one (Holloway, ranked at lightweight, is filed at featherweight), so the list has no gaps.
      const inGroup = (fighter: FighterProfile) => group.match(fighter) || groupRanks.has(foldName(fighter.name)) || pastOf(fighter) !== null
      groups.set(group.key, visibleFighters.filter(inGroup).sort((a, b) => compareFighters(a, b, groupRanks, isActive, pastOf)))
    }
    return groups
  }, [visibleFighters, ranks, statusOf, historyFor])

  const hasAnyResults = visibleFighters.length > 0
  const isSearching = query.trim() !== '' || stanceFilter !== 'All stances' || badgeFilter !== '' || countryFilter !== ''
  // Searching must show what it found: when the chosen division has no match, open the first one that does.
  const showAll = activeDivision === ALL_DIVISIONS
  const shownDivision =
    !showAll && isSearching && (groupedFighters.get(activeDivision)?.length ?? 0) === 0
      ? (divisionGroups.find((group) => (groupedFighters.get(group.key)?.length ?? 0) > 0)?.key ?? activeDivision)
      : activeDivision
  const featuredGroup = divisionGroups.find((group) => group.key === shownDivision) ?? divisionGroups[0]
  const featuredFighters = groupedFighters.get(featuredGroup.key) ?? []

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('fighters.division')}
        description={t('fighters.subtitle')}
        stats={[
          { label: t('fighters.title'), value: visibleFighters.length.toLocaleString(localeTag(i18n.language)) },
          { label: t('fighters.division'), value: `${divisionGroups.length}` },
        ]}
      >
        <div className="grid gap-2.5 md:grid-cols-3 xl:grid-cols-[1fr_200px_220px_220px]">
          <div className="flex gap-2 md:col-span-3 xl:col-span-1">
            <div className="soft-input flex min-w-0 flex-1 items-center gap-2.5 rounded-sm px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-red)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('fighters.search')}
                aria-label={t('fighters.search')}
                className="w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              aria-expanded={filtersOpen}
              aria-controls="fighter-extra-filters"
              className="ghost-action inline-flex shrink-0 items-center gap-1.5 rounded-sm px-3 text-xs md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {L(i18n.language, 'Filtros', 'Filters', 'Filtres', 'Filtros')}
              {stanceFilter !== 'All stances' || badgeFilter !== '' || countryFilter !== '' ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-sm bg-[var(--ink)] px-1 text-label text-[var(--on-ink)]">
                  {(stanceFilter !== 'All stances' ? 1 : 0) + (badgeFilter !== '' ? 1 : 0) + (countryFilter !== '' ? 1 : 0)}
                </span>
              ) : null}
            </button>
          </div>
          <div id="fighter-extra-filters" className={`${filtersOpen ? 'grid' : 'hidden'} gap-2.5 md:contents`}>
          <select
            value={stanceFilter}
            onChange={(event) => setStanceFilter(event.target.value)}
            aria-label={L(i18n.language, 'Filtrar por base', 'Filter by stance', 'Filtrer par garde', 'Filtrar por guardia')}
            className="soft-input rounded-sm px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          >
            {stances.map((stance) => (
              <option key={stance} value={stance}>
                {stanceLabel(stance, i18n.language)}
              </option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value)}
            aria-label={L(i18n.language, 'Filtrar por país', 'Filter by country', 'Filtrer par pays', 'Filtrar por país')}
            className="soft-input rounded-sm px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="">{L(i18n.language, 'Todos os países', 'All countries', 'Tous les pays', 'Todos los países')}</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.count.toLocaleString(localeTag(i18n.language))})
              </option>
            ))}
          </select>
          <select
            value={badgeFilter}
            onChange={(event) => setBadgeFilter(event.target.value)}
            aria-label={L(i18n.language, 'Filtrar por selo ou origem', 'Filter by badge or origin', 'Filtrer par badge ou origine', 'Filtrar por insignia u origen')}
            className="soft-input rounded-sm px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="">{L(i18n.language, 'Todos os selos e origens', 'All badges and origins', 'Tous les badges et origines', 'Todas las insignias y orígenes')}</option>
            {Object.entries(BADGES).map(([key]) => (
              <option key={key} value={key}>
                {getBadgeLabel(key, i18n.language)}
              </option>
            ))}
          </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div role="group" aria-label={L(i18n.language, 'Status do lutador', 'Fighter status', 'Statut du combattant', 'Estado del peleador')} className="chip-scroll inline-flex max-w-full overflow-x-auto rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5">
            <ActiveTabButton active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} count={fighters.length}>
              {t('fighters.all')}
            </ActiveTabButton>
            <ActiveTabButton active={activeFilter === 'active'} onClick={() => setActiveFilter('active')} count={statusCounts.active}>
              <Radio className="h-3 w-3" /> {t('fighters.activeOnly')}
            </ActiveTabButton>
            <ActiveTabButton active={activeFilter === 'former'} onClick={() => setActiveFilter('former')} count={statusCounts.former}>
              {t('fighters.former')}
            </ActiveTabButton>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">{visibleFighters.length.toLocaleString(localeTag(i18n.language))}</span> {L(i18n.language, 'exibidos', 'shown', 'affichés', 'mostrados')}
          </p>
        </div>
      </PageHeader>

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[210px]" />
          ))}
        </section>
      ) : hasAnyResults ? (
        <div className="space-y-6">
          <WeightClassBar
            groups={divisionGroups}
            counts={groupedFighters}
            allCount={visibleFighters.length}
            activeKey={shownDivision}
            onSelect={setActiveDivision}
          />

          <div className="min-w-0">
            {showAll ? (
              // Every division with a match, one after the other, each in its own order and with its own "show more".
              <div className="space-y-12">
                {divisionGroups
                  .filter((group) => (groupedFighters.get(group.key)?.length ?? 0) > 0)
                  .map((group) => (
                    <DivisionPanel
                      key={group.key}
                      group={group}
                      fighters={groupedFighters.get(group.key) ?? []}
                      ranks={ranksOf(ranks, group.label)}
                      pastOf={historyFor(group)}
                      imageByName={imageByName}
                      onSelectFighter={setSelectedFighter}
                      inFullList
                    />
                  ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <DivisionPanel
                  key={featuredGroup.key}
                  group={featuredGroup}
                  fighters={featuredFighters}
                  ranks={ranksOf(ranks, featuredGroup.label)}
                  pastOf={historyFor(featuredGroup)}
                  imageByName={imageByName}
                  onSelectFighter={setSelectedFighter}
                />
              </AnimatePresence>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="type-display text-2xl text-[var(--text-primary)]">
            {L(i18n.language, 'Nenhum lutador encontrado', 'No fighters found', 'Aucun combattant trouvé', 'No se encontraron peleadores')}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {L(
              i18n.language,
              'Tente ajustar os termos de busca ou mudar os filtros para encontrar outros lutadores.',
              'Adjust the search or filter to explore another fighter profile in the database.',
              'Ajustez la recherche ou les filtres pour trouver un autre profil dans la base.',
              'Intenta ajustar la búsqueda o los filtros para explorar otro perfil de la base de datos.',
            )}
          </p>
        </div>
      )}

      {selectedFighter ? (
        <FighterProfileModal
          key={selectedFighter}
          name={selectedFighter}
          onClose={() => {
            setSelectedFighter(null)
            if (searchParams.has('fighter')) setSearchParams({}, { replace: true })
          }}
          onSelectFighter={setSelectedFighter}
        />
      ) : null}
    </div>
  )
}

function ActiveTabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
      <CountPill active={active}>{count}</CountPill>
    </button>
  )
}

function CountPill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex min-w-[1.6em] items-center justify-center rounded-sm px-1.5 py-px text-label font-bold tabular-nums ${
        active ? 'bg-[var(--bg-surface)]/20 text-[var(--bg-surface)]' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]'
      }`}
    >
      {children}
    </span>
  )
}

/** Single-line weight class chips: men | women | other, horizontal scroll with edge fades that appear only when there is more to see. */
function WeightClassBar({
  groups,
  counts,
  allCount,
  activeKey,
  onSelect,
}: {
  groups: DivisionGroup[]
  counts: Map<string, FighterProfile[]>
  allCount: number
  activeKey: string
  onSelect: (key: string) => void
}) {
  const { i18n } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const updateEdges = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [])

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [updateEdges])

  // Keep the selected chip in view (e.g. after the list re-renders on narrow screens).
  useEffect(() => {
    const chip = scrollRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    chip?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeKey])

  const scrollByStep = (direction: 1 | -1) =>
    scrollRef.current?.scrollBy({ left: direction * 250, behavior: 'smooth' })

  const fade = 44
  const mask = `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edges.right ? 'transparent' : '#000'} 100%)`
  const sectionOf = (key: string) => (key === 'open-class' ? 2 : key.startsWith('w-') ? 1 : 0)

  return (
    <nav aria-label={L(i18n.language, 'Filtro por categoria de peso', 'Weight class filter', 'Filtre de catégorie de poids', 'Filtro por división de peso')} className="relative rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] py-1.5">
      <ScrollArrow direction="left" visible={edges.left} onClick={() => scrollByStep(-1)} />
      <ScrollArrow direction="right" visible={edges.right} onClick={() => scrollByStep(1)} />
      <div
        ref={scrollRef}
        onScroll={updateEdges}
        className="chip-scroll flex items-center gap-1.5 overflow-x-auto whitespace-nowrap px-1.5"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <AllDivisionsPill count={allCount} isActive={activeKey === ALL_DIVISIONS} onClick={() => onSelect(ALL_DIVISIONS)} />
        <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-[var(--border-subtle)]" />
        {groups.map((group, index) => (
          <div key={group.key} className="flex shrink-0 items-center gap-1.5">
            {index > 0 && sectionOf(group.key) !== sectionOf(groups[index - 1].key) ? (
              <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-[var(--border-subtle)]" />
            ) : null}
            <DivisionPill
              group={group}
              count={counts.get(group.key)?.length ?? 0}
              isActive={activeKey === group.key}
              onClick={() => onSelect(group.key)}
            />
          </div>
        ))}
      </div>
    </nav>
  )
}

function ScrollArrow({
  direction,
  visible,
  onClick,
}: {
  direction: 'left' | 'right'
  visible: boolean
  onClick: () => void
}) {
  const { i18n } = useTranslation()
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!visible}
      tabIndex={visible ? 0 : -1}
      aria-label={
        direction === 'left'
          ? L(i18n.language, 'Rolar categorias para a esquerda', 'Scroll weight classes left', 'Faire défiler les catégories vers la gauche', 'Desplazar divisiones a la izquierda')
          : L(i18n.language, 'Rolar categorias para a direita', 'Scroll weight classes right', 'Faire défiler les catégories vers la droite', 'Desplazar divisiones a la derecha')
      }
      className={`absolute top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] transition hover:text-[var(--ink)] focus-visible:text-[var(--ink)] focus-visible:outline-none ${
        direction === 'left' ? 'left-1' : 'right-1'
      } ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function DivisionPanel({
  group,
  fighters,
  ranks,
  pastOf,
  imageByName,
  onSelectFighter,
  inFullList = false,
}: {
  group: DivisionGroup
  fighters: FighterProfile[]
  ranks: Map<string, number>
  pastOf: (fighter: FighterProfile) => HistoryEntry | null
  imageByName: Map<string, FighterImageRecord>
  onSelectFighter: (name: string) => void
  /** One of every division on one page: no "selected division" line above the name. */
  inFullList?: boolean
}) {
  const { i18n } = useTranslation()
  // Show a page at a time; the list starts over whenever the filters hand it a different set of fighters.
  const [paging, setPaging] = useState({ source: fighters, limit: PAGE_SIZE })
  if (paging.source !== fighters) setPaging({ source: fighters, limit: PAGE_SIZE })
  const limit = paging.source === fighters ? paging.limit : PAGE_SIZE
  const shown = fighters.slice(0, limit)
  const remaining = fighters.length - shown.length
  const groupLabel = getDivisionName(group.label, i18n.language)

  return (
    <motion.section
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 pb-3">
        <div className="min-w-0">
          {inFullList ? null : <Eyebrow>{L(i18n.language, 'Categoria selecionada', 'Selected division', 'Catégorie affichée', 'División seleccionada')}</Eyebrow>}
          <h2 className={`section-title ${inFullList ? '' : 'mt-1'}`}>{groupLabel}</h2>
        </div>
        <p className="text-base text-[var(--muted)]">
          <span className="font-bold tabular-nums text-[var(--ink)]">{fighters.length.toLocaleString(localeTag(i18n.language))}</span>{' '}
          {L(i18n.language, 'lutadores', 'fighters', 'combattants', 'peleadores')}
          {' · '}
          {group.limit === 'Mixed' ? L(i18n.language, 'misto', 'mixed', 'mixte', 'mixto') : group.limit}
        </p>
      </div>

      <div>
        {fighters.length ? (
          <ul className="grid border-t-[3px] border-[var(--ink)] md:grid-cols-2 md:gap-x-8 xl:grid-cols-3">
            {shown.map((fighter) => (
              <FighterDivisionCard
                key={fighter.name}
                fighter={fighter}
                rank={rankLabel(fighter, ranks)}
                past={pastOf(fighter)}
                womens={group.label.startsWith("Women's")}
                imageUrl={getFighterImageUrl(fighter.name, imageByName, fighter.image_url)}
                onSelect={() => onSelectFighter(fighter.name)}
              />
            ))}
          </ul>
        ) : (
          <div className="px-4 py-12 text-center">
            <p className="type-display text-xl text-[var(--text-primary)]">
              {L(i18n.language, 'Nenhum atleta nesta categoria', 'No athletes in this division', 'Aucun combattant dans cette catégorie', 'No hay atletas en esta división')}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
              {L(
                i18n.language,
                `Nenhum lutador correspondente aos filtros atuais em ${groupLabel}.`,
                `The current search or stance filter has no matching fighters in ${group.label}.`,
                `La recherche ou le filtre de garde actuel ne trouve aucun combattant en ${group.label}.`,
                `La búsqueda o el filtro de guardia actual no encuentra peleadores en ${groupLabel}.`,
              )}
            </p>
          </div>
        )}
        {remaining > 0 ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPaging({ source: fighters, limit: limit + PAGE_SIZE })}
              className="primary-action inline-flex items-center justify-center px-6"
            >
              {L(i18n.language, `Mostrar mais ${Math.min(PAGE_SIZE, remaining)}`, `Show ${Math.min(PAGE_SIZE, remaining)} more`, `Afficher ${Math.min(PAGE_SIZE, remaining)} de plus`, `Mostrar ${Math.min(PAGE_SIZE, remaining)} más`)}
            </button>
            <button
              type="button"
              onClick={() => setPaging({ source: fighters, limit: fighters.length })}
              className="ghost-action inline-flex items-center justify-center px-6"
            >
              {L(i18n.language, `Mostrar todos (${fighters.length.toLocaleString('pt-BR')})`, `Show all ${fighters.length.toLocaleString('en-US')}`, `Tout afficher (${fighters.length.toLocaleString(localeTag(i18n.language))})`, `Mostrar todos (${fighters.length.toLocaleString('es-419')})`)}
            </button>
          </div>
        ) : null}
        {fighters.length > PAGE_SIZE ? (
          <p className="mt-3 text-center text-sm text-[var(--muted)]" aria-live="polite">
            {L(
              i18n.language,
              `Exibindo ${shown.length.toLocaleString('pt-BR')} de ${fighters.length.toLocaleString('pt-BR')}`,
              `Showing ${shown.length.toLocaleString('en-US')} of ${fighters.length.toLocaleString('en-US')}`,
              `Affichage de ${shown.length.toLocaleString(localeTag(i18n.language))} sur ${fighters.length.toLocaleString(localeTag(i18n.language))}`,
              `Mostrando ${shown.length.toLocaleString('es-419')} de ${fighters.length.toLocaleString('es-419')}`,
            )}
          </p>
        ) : null}
      </div>
    </motion.section>
  )
}

/** The first chip: every division on one page. */
function AllDivisionsPill({ count, isActive, onClick }: { count: number; isActive: boolean; onClick: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={[
        'inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors',
        isActive
          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-surface)]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">{L(lang, 'Todas as categorias', 'All divisions', 'Toutes les catégories', 'Todas las divisiones')}</span>
      <span className="sm:hidden">{L(lang, 'Todas', 'All', 'Toutes', 'Todas')}</span>
      <CountPill active={isActive}>{count}</CountPill>
    </button>
  )
}

function DivisionPill({
  group,
  count,
  isActive,
  onClick,
}: {
  group: DivisionGroup
  count: number
  isActive: boolean
  onClick: () => void
}) {
  const { i18n } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={[
        'inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors',
        isActive
          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-surface)]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      <group.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">{getDivisionName(group.label, i18n.language)}</span>
      <span className="sm:hidden">{group.shortLabel}</span>
      <CountPill active={isActive}>{count}</CountPill>
    </button>
  )
}

/** What the fighter did for the division's belt, as a short line under the numbers. */
function HistoryNote({ past, womens }: { past: HistoryEntry; womens: boolean }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const label = {
    champion: womens
      ? L(lang, 'Ex-campeã', 'Former champion', 'Ancienne championne', 'Excampeona')
      : L(lang, 'Ex-campeão', 'Former champion', 'Ancien champion', 'Excampeón'),
    interim: womens
      ? L(lang, 'Ex-campeã interina', 'Former interim champion', 'Ancienne championne intérimaire', 'Excampeona interina')
      : L(lang, 'Ex-campeão interino', 'Former interim champion', 'Ancien champion intérimaire', 'Excampeón interino'),
    challenger: L(lang, 'Disputou o cinturão', 'Fought for the title', 'A disputé le titre', 'Disputó el título'),
    hof: getBadgeLabel('hof', lang),
  }[past.mark]
  const Icon = past.mark === 'champion' || past.mark === 'interim' ? Trophy : Medal
  return (
    <span className="mr-3 mt-1 inline-flex items-center gap-1 text-[13px] font-bold">
      <Icon className={`h-3.5 w-3.5 ${past.mark === 'champion' ? 'text-[var(--gold)]' : ''}`} aria-hidden="true" />
      {label}
    </span>
  )
}

/** One fighter as a compact row: rank, photo, name, record and the key numbers, opening the profile. Two or three sit
 * side by side on wider screens so a division fits in a few screens instead of dozens. */
function FighterDivisionCard({
  fighter,
  rank,
  past,
  womens,
  imageUrl,
  onSelect,
}: {
  fighter: FighterProfile
  rank: string | null
  past: HistoryEntry | null
  womens: boolean
  imageUrl?: string | null
  onSelect: () => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const facts = [
    fighter.age ? `${Math.floor(fighter.age)} ${L(lang, 'anos', 'yrs', 'ans', 'años')}` : null,
    fighter.height_cm ? `${Math.round(fighter.height_cm)} cm` : null,
    fighter.reach_cm ? `${L(lang, 'envergadura', 'reach', 'allonge', 'alcance')} ${fighter.reach_cm.toFixed(0)} cm` : null,
  ].filter(Boolean)
  const record = [
    formatRecord(fighter, lang),
    fighter.win_rate !== null && fighter.win_rate !== undefined ? `${formatPercent(fighter.win_rate)} ${L(lang, 'vitórias', 'wins', 'victoires', 'victorias')}` : null,
    fighter.nickname ? `“${fighter.nickname}”` : null,
  ].filter(Boolean)

  return (
    <li className="border-b border-[var(--rule)]">
      <div className="flex h-full items-stretch">
        <button
          type="button"
          onClick={onSelect}
          aria-label={L(lang, `${fighter.name}. Ver perfil`, `${fighter.name}. View profile`, `${fighter.name}. Voir le profil`, `${fighter.name}. Ver perfil`)}
          className="row-link group flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 py-3 text-left hover:bg-[var(--panel)]"
        >
          <span
            className={`w-6 shrink-0 text-center font-display text-lg sm:w-8 font-black tabular-nums ${rank ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}
            title={rank === 'C' ? L(lang, 'Campeão', 'Champion', 'Champion', 'Campeón') : undefined}
          >
            {rank ?? '–'}
          </span>
          <FighterPortrait fighter={fighter} imageUrl={imageUrl ?? undefined} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
              <FlagList fighter={fighter} />
              <span className="min-w-0 break-words font-display text-xl font-black leading-tight sm:text-[22px]">{fighter.name}</span>
              {fighter.belt ? <ChampionBelt /> : null}
            </span>
            <span className="block truncate text-sm">
              {record.join(' · ')}
            </span>
            {facts.length ? <span className="block truncate text-sm text-[var(--muted)]">{facts.join(' · ')}</span> : null}
            {past && !rank ? <HistoryNote past={past} womens={womens} /> : null}
            {fighter.next_fight ? (
              <span title={`${fighter.next_fight.event_name}: vs ${fighter.next_fight.opponent}`} className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {L(lang, 'Luta marcada', 'Fight booked', 'Combat prévu', 'Pelea confirmada')}
              </span>
            ) : null}
          </span>
        </button>
        {fighter.fighter_url ? (
          <a
            href={fighter.fighter_url}
            target="_blank"
            rel="noreferrer"
            aria-label={L(lang, `${fighter.name} no UFCStats (abre em nova aba)`, `${fighter.name} on UFCStats (opens in a new tab)`, `${fighter.name} sur UFCStats (s’ouvre dans un nouvel onglet)`, `${fighter.name} en UFCStats (se abre en una pestaña nueva)`)}
            title={L(lang, 'Abrir no UFCStats', 'Open on UFCStats', 'Ouvrir sur UFCStats', 'Abrir en UFCStats')}
            className="grid w-10 shrink-0 place-items-center text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </li>
  )
}

function FighterPortrait({ fighter, imageUrl }: { fighter: FighterProfile; imageUrl?: string }) {
  const { i18n } = useTranslation()
  const credit = usePhotoCredit(imageUrl)
  const imageKey = `${fighter.name}:${imageUrl ?? ''}`
  const [imageState, setImageState] = useState({ key: '', failed: false, loaded: false })
  const imageFailed = imageState.key === imageKey && imageState.failed
  const imageLoaded = imageState.key === imageKey && imageState.loaded
  const initials = fighter.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const showImage = Boolean(imageUrl && !imageFailed)

  return (
    <span title={credit ? photoRightsText(credit, i18n.language) : undefined} className="relative block h-[70px] w-14 shrink-0 overflow-hidden bg-[var(--track)]">
      {showImage ? (
        <img
          src={imageUrl}
          alt={`${fighter.name} profile`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setImageState({ key: imageKey, failed: false, loaded: true })}
          onError={() => setImageState({ key: imageKey, failed: true, loaded: false })}
          className={`absolute inset-0 h-full w-full object-cover object-top ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : null}
      {!showImage || !imageLoaded ? (
        <span className="absolute inset-0 grid place-items-center font-display text-xl font-black text-[var(--muted)]">{initials}</span>
      ) : null}
    </span>
  )
}

function byDivision(target: string) {
  return (fighter: FighterProfile) => {
    const division = getDivisionLabel(fighter)
    if (target === 'heavyweight' && division.includes('light heavyweight')) {
      return false
    }
    return division.includes(target) && (target.startsWith("women's") || !division.includes("women's"))
  }
}

function getDivisionLabel(fighter: FighterProfile) {
  return (fighter.division ?? '').toLowerCase()
}

function formatRecord(fighter: FighterProfile, language: string | boolean = false) {
  return `${fighter.wins ?? 0}-${fighter.losses ?? 0}${fighter.draws ? `-${fighter.draws}` : ''} ${L(language, 'cartel', 'record', 'palmarès', 'récord')}`
}

/** The fighter's countries, as the flags show them: every nationality, or the single country of the record. */
function nationalitiesOf(fighter: FighterProfile): { name: string; code: string }[] {
  if (fighter.nationalities?.length) return fighter.nationalities.filter((nation): nation is { name: string; code: string } => Boolean(nation.code))
  return fighter.country_code ? [{ name: fighter.country ?? '', code: fighter.country_code }] : []
}

/** A country's name on screen; a record with only the code ("br") gets the name from the browser. */
function countryLabel(nation: { name: string; code: string }, language: string): string {
  const localized = localizeCountryName(nation.name, language)
  if (localized) return localized
  try {
    return new Intl.DisplayNames([localeTag(language)], { type: 'region' }).of(nation.code.toUpperCase()) ?? nation.code.toUpperCase()
  } catch {
    return nation.code.toUpperCase()
  }
}

function foldText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
