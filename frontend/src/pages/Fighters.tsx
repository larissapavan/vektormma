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
  Medal,
  Radio,
  Search,
  Shield,
  SlidersHorizontal,
  Swords,
  Target,
  Timer,
  Zap,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { L, localeTag, uiLang, type UiLang } from '../i18n/lang'
import { ChampionBelt } from '../shared/components/ChampionBelt'
import { FighterOrigin } from '../shared/components/FighterOrigin'
import { FighterBadges, FlagList } from '../shared/components/FighterBadges'
import { BADGES, badgesForRankings, getBadgeLabel } from '../shared/data/badges'
import { getDivisionName } from '../shared/data/divisions'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { Eyebrow } from '../shared/components/ui/Eyebrow'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { formatPercent } from '../shared/data/fightLabels'
import { isKnownActive, isKnownRetired } from '../shared/data/fighterStatusOverrides'
import { useFighters } from '../shared/hooks/useFighters'
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
  const [query, setQuery] = useState('')
  const [stanceFilter, setStanceFilter] = useState('All stances')
  const [badgeFilter, setBadgeFilter] = useState('')
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
      return matchesName && matchesStance && matchesBadge && matchesStatus
    })
  }, [fighters, query, stanceFilter, badgeFilter, activeFilter, statusOf])

  const groupedFighters = useMemo(() => {
    const groups = new Map<string, FighterProfile[]>()
    for (const group of divisionGroups) {
      groups.set(
        group.key,
        visibleFighters
          .filter((fighter) => group.match(fighter))
          .sort(
            (a, b) =>
              Number(Boolean(b.belt)) - Number(Boolean(a.belt)) ||
                            (b.win_rate ?? 0) - (a.win_rate ?? 0) ||
              a.name.localeCompare(b.name),
          ),
      )
    }
    return groups
  }, [visibleFighters])

  const hasAnyResults = visibleFighters.length > 0
  const isSearching = query.trim() !== '' || stanceFilter !== 'All stances' || badgeFilter !== ''
  // Searching must show what it found: when the chosen division has no match, open the first one that does.
  const shownDivision =
    isSearching && (groupedFighters.get(activeDivision)?.length ?? 0) === 0
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
        <div className="grid gap-2.5 md:grid-cols-[1fr_220px_240px]">
          <div className="flex gap-2">
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
              {stanceFilter !== 'All stances' || badgeFilter !== '' ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-sm bg-[var(--ink)] px-1 text-label text-[var(--on-ink)]">
                  {(stanceFilter !== 'All stances' ? 1 : 0) + (badgeFilter !== '' ? 1 : 0)}
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
            activeKey={shownDivision}
            onSelect={setActiveDivision}
          />

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <DivisionPanel
                key={featuredGroup.key}
                group={featuredGroup}
                fighters={featuredFighters}
                imageByName={imageByName}
                onSelectFighter={setSelectedFighter}
              />
            </AnimatePresence>
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
  activeKey,
  onSelect,
}: {
  groups: DivisionGroup[]
  counts: Map<string, FighterProfile[]>
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
  imageByName,
  onSelectFighter,
}: {
  group: DivisionGroup
  fighters: FighterProfile[]
  imageByName: Map<string, FighterImageRecord>
  onSelectFighter: (name: string) => void
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
          <Eyebrow>{L(i18n.language, 'Categoria selecionada', 'Selected division', 'Catégorie affichée', 'División seleccionada')}</Eyebrow>
          <h2 className="section-title mt-1">{groupLabel}</h2>
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
          <ul className="border-t-[3px] border-[var(--ink)]">
            {shown.map((fighter) => (
              <FighterDivisionCard
                key={fighter.name}
                fighter={fighter}
                group={group}
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

/** One fighter as a row: photo, name large, what the record says, the body numbers, and the way into the profile. */
function FighterDivisionCard({
  fighter,
  group,
  imageUrl,
  onSelect,
}: {
  fighter: FighterProfile
  group: DivisionGroup
  imageUrl?: string | null
  onSelect: () => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const division = getDivisionName(fighter.division ?? group.label, lang)

  return (
    <li className="border-b border-[var(--rule)]">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onSelect}
          aria-label={L(lang, `${fighter.name}. Ver perfil`, `${fighter.name}. View profile`, `${fighter.name}. Voir le profil`, `${fighter.name}. Ver perfil`)}
          className="row-link group flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-6 gap-y-3 px-3 py-5 text-left hover:bg-[var(--panel)] sm:flex-nowrap"
        >
          <FighterPortrait fighter={fighter} imageUrl={imageUrl ?? undefined} />
          <span className="min-w-0 flex-[1_1_240px]">
            <span className="block text-[15px] text-[var(--muted)]">{division}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <FlagList fighter={fighter} />
              <span className="min-w-0 break-words font-display text-[32px] font-black leading-[0.95] sm:text-[40px]">{fighter.name}</span>
              {fighter.belt ? <ChampionBelt /> : null}
            </span>
            <span className="mt-1 block text-base">
              {formatRecord(fighter, lang)}
              {fighter.nickname ? ` · “${fighter.nickname}”` : ''}
            </span>
            {fighter.belt || fighter.next_fight ? (
              <span className="mt-2 flex flex-wrap gap-2">
                {fighter.belt ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm border-[1.5px] border-[var(--ink)] px-2.5 py-1 text-[13px] font-bold">
                    <Trophy className="h-3.5 w-3.5 text-[var(--gold)]" aria-hidden="true" />
                    {L(lang, `Campeão ${division}`, `${division} champion`, `Champion ${division}`, `Campeón de ${division}`)}
                  </span>
                ) : null}
                {fighter.next_fight ? (
                  <span title={`${fighter.next_fight.event_name}: vs ${fighter.next_fight.opponent}`} className="inline-flex items-center gap-1.5 rounded-sm border-[1.5px] border-[var(--ink)] px-2.5 py-1 text-[13px] font-bold">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {L(lang, 'Luta marcada', 'Fight booked', 'Combat prévu', 'Pelea confirmada')}
                  </span>
                ) : null}
              </span>
            ) : null}
            <FighterOrigin fighter={fighter} className="mt-2" />
            <FighterBadges badges={badgesForRankings(fighter.badges)} className="mt-2" />
          </span>
          <dl className="grid w-full grid-cols-3 gap-x-5 gap-y-3 sm:w-auto sm:flex-[0_1_360px]">
            <CardFact label={L(lang, 'Altura', 'Height', 'Taille', 'Estatura')} value={fighter.height_cm ? `${Math.round(fighter.height_cm)} cm` : '—'} />
            <CardFact label={L(lang, 'Peso', 'Weight', 'Poids', 'Peso')} value={fighter.weight_lbs ? `${fighter.weight_lbs.toFixed(0)} lb` : '—'} />
            <CardFact label={L(lang, 'Envergadura', 'Reach', 'Allonge', 'Alcance')} value={fighter.reach_cm ? `${fighter.reach_cm.toFixed(0)} cm` : '—'} />
            <CardFact label={L(lang, 'Idade', 'Age', 'Âge', 'Edad')} value={fighter.age ? `${Math.floor(fighter.age)} ${L(lang, 'anos', 'yrs', 'ans', 'años')}` : '—'} />
            <CardFact label={L(lang, 'Base', 'Stance', 'Garde', 'Guardia')} value={fighter.stance ? stanceLabel(fighter.stance, lang) : '—'} />
            <CardFact label={L(lang, 'Vitórias', 'Win rate', 'Victoires', 'Victorias')} value={formatPercent(fighter.win_rate)} />
          </dl>
          <svg className="row-arrow h-8 w-8 shrink-0 max-sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M4 12h16M14 6l6 6-6 6" />
          </svg>
        </button>
        {fighter.fighter_url ? (
          <a
            href={fighter.fighter_url}
            target="_blank"
            rel="noreferrer"
            aria-label={L(lang, `${fighter.name} no UFCStats (abre em nova aba)`, `${fighter.name} on UFCStats (opens in a new tab)`, `${fighter.name} sur UFCStats (s’ouvre dans un nouvel onglet)`, `${fighter.name} en UFCStats (se abre en una pestaña nueva)`)}
            title={L(lang, 'Abrir no UFCStats', 'Open on UFCStats', 'Ouvrir sur UFCStats', 'Abrir en UFCStats')}
            className="grid w-12 shrink-0 place-items-center text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
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
    <span title={credit ? photoRightsText(credit, i18n.language) : undefined} className="relative block h-[92px] w-[74px] shrink-0 overflow-hidden bg-[var(--track)]">
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
        <span className="absolute inset-0 grid place-items-center font-display text-2xl font-black text-[var(--muted)]">{initials}</span>
      ) : null}
    </span>
  )
}

/** One fact on a fighter card: a quiet label over its value, with no box of its own. */
function CardFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-sm text-[var(--muted)]">{label}</dt>
      <dd className="break-words font-display text-xl font-extrabold leading-tight tabular-nums">{value}</dd>
    </div>
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

function foldText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
