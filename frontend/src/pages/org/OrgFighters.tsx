import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  ExternalLink,
  Flame,
  Footprints,
  Hammer,
  HandFist,
  Radio,
  Search,
  Shield,
  Swords,
  Target,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { FlagIcon } from '../../shared/components/FlagIcon'
import { ChampionBelt } from '../../shared/components/ChampionBelt'
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton'
import { OrgFighterModal } from '../../shared/components/OrgFighterModal'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { L, localeTag } from '../../i18n/lang'
import { orgEs, orgFr, orgPt } from '../../shared/data/orgs'
import { getDivisionName } from '../../shared/data/divisions'
import { compareDivisions, formatHeight, formatReach, formatRecord } from '../../shared/data/orgFormat'
import { normalizeFighterName } from '../../shared/hooks/useFighterImages'
import { useOrg } from '../../shared/hooks/useOrg'
import { useOrgFighters } from '../../shared/hooks/useOrgData'
import type { OrgFighter } from '../../shared/types/api'

const PAGE_SIZE = 24

type Status = 'active' | 'all'

function getDivisionIcon(division: string): LucideIcon {
  const d = division.toLowerCase()
  if (d.includes('straw') || d.includes('atom')) return Zap
  if (d.includes('fly')) return Footprints
  if (d.includes('bantam')) return Target
  if (d.includes('feather')) return Flame
  if (d.includes('lightweight')) return Shield
  if (d.includes('welter')) return Swords
  if (d.includes('middle')) return HandFist
  if (d.includes('light heavy')) return Hammer
  if (d.includes('heavy')) return Dumbbell
  return Swords
}

/** Champions first, then the ranked, then by name. */
function compareFighters(a: OrgFighter, b: OrgFighter) {
  return (
    Number(b.belt) - Number(a.belt) ||
    Number(Boolean(b.ranking)) - Number(Boolean(a.ranking)) ||
    Number(b.is_active) - Number(a.is_active) ||
    a.name.localeCompare(b.name)
  )
}

export function OrgFighters() {
  const { i18n } = useTranslation()
  const org = useOrg()
  const { fighters, loading, error } = useOrgFighters(org.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [division, setDivision] = useState('ALL')
  const isArchived = Boolean(org.archived)
  const [status, setStatus] = useState<Status>(isArchived ? 'all' : 'active')
  const [shown, setShown] = useState(PAGE_SIZE)
  const profileName = searchParams.get('fighter')

  const divisions = useMemo(
    () =>
      Array.from(
        new Set(
          fighters
            .map((fighter) => fighter.division)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(compareDivisions),
    [fighters],
  )

  const activeCount = useMemo(() => fighters.filter((fighter) => fighter.is_active).length, [fighters])
  const championsCount = useMemo(() => fighters.filter((fighter) => fighter.belt).length, [fighters])

  // Map fighters to divisions
  const matches = useMemo(() => {
    const term = normalizeFighterName(query)
    return fighters
      .filter((fighter) => isArchived || status === 'all' || fighter.is_active || term !== '')
      .filter((fighter) => division === 'ALL' || fighter.division === division)
      .filter(
        (fighter) =>
          !term ||
          normalizeFighterName(fighter.name).includes(term) ||
          normalizeFighterName(fighter.nickname ?? '').includes(term) ||
          normalizeFighterName(fighter.camp ?? '').includes(term) ||
          normalizeFighterName(fighter.division ?? '').includes(term),
      )
      .sort(compareFighters)
  }, [fighters, query, division, status, isArchived])

  // Counts by division under current filters
  const divisionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    const term = normalizeFighterName(query)
    const baseFighters = fighters.filter(
      (f) => isArchived || status === 'all' || f.is_active || term !== '',
    )
    for (const d of divisions) {
      counts.set(d, baseFighters.filter((f) => f.division === d).length)
    }
    return counts
  }, [fighters, divisions, query, status, isArchived])

  const openProfile = (name: string) => setSearchParams({ fighter: name })
  const closeProfile = () => setSearchParams({})
  const reset = () => setShown(PAGE_SIZE)

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
            eyebrow={L(i18n.language, `Atletas ${orgPt(org, 'de')}`, `${org.shortName} roster`, `Combattants ${org.shortName}`, `Peleadores de ${orgEs(org)}`)}
            title={L(i18n.language, `Lutadores ${orgPt(org, 'de')}`, `${org.shortName} fighters`, `Combattants ${org.shortName}`, `Peleadores de ${orgEs(org)}`)}
            description={
              isArchived
                ? L(
                    i18n.language,
                    `Arquivo histórico completo de atletas que lutaram ${orgPt(org, 'em')} (2009–2023), com cartel, envergadura, academia e histórico detalhado.`,
                    `Historical archive of every fighter who stepped into the ${org.shortName} cage (2009–2023), with record, camp and bout history.`,
                    `Archives complètes de tous les combattants ayant combattu ${orgFr(org, 'à')} (2009–2023), avec palmarès, salle et combats.`,
                    `Archivo histórico completo de los peleadores que pelearon en ${orgEs(org)} (2009–2023), con récord, alcance, gimnasio e historial detallado.`,
                  )
                : L(
                    i18n.language,
                    `Todos os atletas cadastrados ${orgPt(org, 'de')}, com cartel completo, dados físicos, volume de golpes e academia. Lutadores ativos em destaque.`,
                    `Every fighter on the ${org.shortName} roster, with record, physical stats, striking telemetry and camps. Active fighters first.`,
                    `Tous les combattants répertoriés ${orgFr(org, 'à')}, avec palmarès, mensurations, frappes et salles. Combattants actifs en tête.`,
                    `Todos los peleadores registrados de ${orgEs(org)}, con récord completo, datos físicos, volumen de golpes y gimnasio. Primero los peleadores activos.`,
                  )
            }
            stats={[
              { label: L(i18n.language, 'Lutadores', 'Fighters', 'Combattants', 'Peleadores'), value: fighters.length.toLocaleString(localeTag(i18n.language)) },
              isArchived
                ? { label: L(i18n.language, 'Últimos campeões', 'Final champions', 'Derniers champions', 'Últimos campeones'), value: championsCount.toLocaleString(localeTag(i18n.language)) }
                : { label: L(i18n.language, 'Em atividade', 'Active', 'En activité', 'En actividad'), value: activeCount.toLocaleString(localeTag(i18n.language)) },
              { label: L(i18n.language, 'Categorias', 'Divisions', 'Catégories', 'Divisiones'), value: `${divisions.length}` },
            ]}
      >
        {/* Search & Status Bar */}
        <div className="grid gap-2.5 md:grid-cols-[1fr_auto]">
          <div className="soft-input flex min-w-0 flex-1 items-center gap-2.5 rounded-control px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-red)]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                reset()
              }}
              placeholder={L(
                i18n.language,
                'Buscar por nome, apelido, categoria ou academia...',
                'Search by name, nickname or camp',
                'Chercher par nom, surnom ou salle...',
                'Buscar por nombre, apodo, división o gimnasio...',
              )}
              aria-label={L(i18n.language, 'Buscar lutadores', 'Search fighters', 'Chercher des combattants', 'Buscar peleadores')}
              className="w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          {!isArchived ? (
            <div
              role="group"
              aria-label={L(i18n.language, 'Status', 'Status', 'Statut', 'Estado')}
              className="chip-scroll inline-flex max-w-full overflow-x-auto rounded-control border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5"
            >
              <button
                type="button"
                aria-label={L(i18n.language, 'Ativos', 'Active', 'Actifs', 'Activos')}
                aria-pressed={status === 'active'}
                onClick={() => {
                  setStatus('active')
                  reset()
                }}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors ${
                  status === 'active' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Radio className="h-3 w-3" />
                <span>{L(i18n.language, 'Ativos', 'Active', 'Actifs', 'Activos')}</span>
                <span
                  aria-hidden="true"
                  className={`ml-1 rounded-full px-1.5 py-px text-label font-bold tabular-nums ${
                    status === 'active' ? 'bg-[var(--bg-surface)]/20 text-[var(--bg-surface)]' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                aria-label={L(i18n.language, 'Todos', 'All time', 'Tous', 'Todos')}
                aria-pressed={status === 'all'}
                onClick={() => {
                  setStatus('all')
                  reset()
                }}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors ${
                  status === 'all' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{L(i18n.language, 'Todos', 'All time', 'Tous', 'Todos')}</span>
                <span
                  aria-hidden="true"
                  className={`ml-1 rounded-full px-1.5 py-px text-label font-bold tabular-nums ${
                    status === 'all' ? 'bg-[var(--bg-surface)]/20 text-[var(--bg-surface)]' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  {fighters.length}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </PageHeader>

      {error ? (
        <p role="alert" className="error-note">
          {error}
        </p>
      ) : null}

      {/* UFC-Style Horizontal Weight Class Bar */}
      {divisions.length > 0 && !loading ? (
        <OrgWeightClassBar
          divisions={divisions}
          counts={divisionCounts}
          activeDivision={division}
          totalCount={fighters.length}
          onSelect={(d) => {
            setDivision(d)
            reset()
          }}
        />
      ) : null}

      {/* Division Spotlight Header */}
      {division !== 'ALL' && !loading ? (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-control border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
              {(() => {
                const Icon = getDivisionIcon(division)
                return <Icon className="h-5 w-5" />
              })()}
            </div>
            <div>
              <p className="font-mono text-label font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {L(i18n.language, 'Categoria ativa', 'Active division', 'Catégorie active', 'División activa')}
              </p>
              <h2 className="mt-1 text-xl text-[var(--text-primary)] sm:text-2xl">
                {getDivisionName(division, i18n.language)}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDivision('ALL')}
            className="text-xs font-bold uppercase tracking-wider text-[var(--accent-red)] hover:underline"
          >
            {L(i18n.language, 'Ver todas as categorias', 'View all divisions', 'Voir toutes', 'Ver todas las divisiones')}
          </button>
        </div>
      ) : null}

      {/* Fighters Grid */}
      {loading ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[240px] rounded-[18px]" />
          ))}
        </section>
      ) : matches.length ? (
        <section aria-label={L(i18n.language, 'Lutadores', 'Fighters', 'Combattants', 'Peleadores')} className="space-y-4">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            {L(
              i18n.language,
              `Exibindo ${Math.min(shown, matches.length).toLocaleString('pt-BR')} de ${matches.length.toLocaleString('pt-BR')} atletas`,
              `Showing ${Math.min(shown, matches.length).toLocaleString('en-US')} of ${matches.length.toLocaleString('en-US')} fighters`,
              `Affichage de ${Math.min(shown, matches.length).toLocaleString(localeTag(i18n.language))} sur ${matches.length.toLocaleString(localeTag(i18n.language))} combattants`,
              `Mostrando ${Math.min(shown, matches.length).toLocaleString('es-419')} de ${matches.length.toLocaleString('es-419')} peleadores`,
            )}
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {matches.slice(0, shown).map((fighter) => (
              <FighterCard
                key={fighter.name}
                fighter={fighter}
                archived={isArchived}
                onOpen={openProfile}
              />
            ))}
          </div>

          {shown < matches.length ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShown((count) => count + PAGE_SIZE)}
                className="primary-action inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white"
              >
                {L(
                  i18n.language,
                  `Mostrar mais ${Math.min(PAGE_SIZE, matches.length - shown)}`,
                  `Show ${Math.min(PAGE_SIZE, matches.length - shown)} more`,
                  `Afficher plus`,
                  `Mostrar ${Math.min(PAGE_SIZE, matches.length - shown)} más`,
                )}
              </button>
              <button
                type="button"
                onClick={() => setShown(matches.length)}
                className="ghost-action theme-text inline-flex items-center justify-center rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em]"
              >
                {L(
                  i18n.language,
                  `Mostrar todos (${matches.length.toLocaleString('pt-BR')})`,
                  `Show all (${matches.length.toLocaleString('en-US')})`,
                  `Tout afficher`,
                  `Mostrar todos (${matches.length.toLocaleString('es-419')})`,
                )}
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="type-display text-2xl text-[var(--text-primary)]">
            {L(i18n.language, 'Nenhum lutador encontrado', 'No fighters found', 'Aucun combattant trouvé', 'No se encontraron peleadores')}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {L(
              i18n.language,
              'Tente ajustar os termos de busca ou mudar os filtros de categoria.',
              'Adjust the search or filter to explore other fighter profiles.',
              'Ajustez la recherche ou les filtres pour trouver un autre profil.',
              'Intenta ajustar la búsqueda o el filtro de división.',
            )}
          </p>
        </div>
      )}

      {profileName ? (
        <OrgFighterModal
          key={profileName}
          org={org}
          name={profileName}
          onClose={closeProfile}
          onSelectFighter={openProfile}
        />
      ) : null}
    </div>
  )
}

/** One fact on a fighter card: a quiet label over its value, with no box of its own. */
function CardFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-label text-[var(--text-muted)]">{label}</dt>
      <dd title={value} className="mt-0.5 truncate text-sm font-semibold tabular-nums text-[var(--text-primary)]">{value}</dd>
    </div>
  )
}

function OrgWeightClassBar({
  divisions,
  counts,
  activeDivision,
  totalCount,
  onSelect,
}: {
  divisions: string[]
  counts: Map<string, number>
  activeDivision: string
  totalCount: number
  onSelect: (d: string) => void
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
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateEdges, { passive: true })
    window.addEventListener('resize', updateEdges)
    return () => {
      el.removeEventListener('scroll', updateEdges)
      window.removeEventListener('resize', updateEdges)
    }
  }, [updateEdges])

  const scrollBy = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <EdgeFade side="left" visible={edges.left} />
      <EdgeFade side="right" visible={edges.right} />
      <ScrollButton direction="left" visible={edges.left} onClick={() => scrollBy(-240)} />
      <ScrollButton direction="right" visible={edges.right} onClick={() => scrollBy(240)} />

      <div
        ref={scrollRef}
        className="chip-scroll flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar"
      >
        <button
          type="button"
          onClick={() => onSelect('ALL')}
          aria-pressed={activeDivision === 'ALL'}
          className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition duration-200 ${
            activeDivision === 'ALL'
              ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--on-ink)]'
              : 'border-[var(--line-soft)] bg-[var(--card-bg)] text-[var(--text-main)] hover:bg-[var(--tape)] hover:text-[var(--on-tape)]'
          }`}
        >
          <Swords className="h-3.5 w-3.5 shrink-0" />
          <span>{L(i18n.language, 'Todas as categorias', 'All divisions', 'Toutes', 'Todas las divisiones')}</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              activeDivision === 'ALL'
                ? 'bg-[var(--tape)] text-[var(--on-tape)]'
                : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {divisions.map((d) => {
          const count = counts.get(d) ?? 0
          const isActive = activeDivision === d
          const Icon = getDivisionIcon(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={isActive}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition duration-200 ${
                isActive
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--on-ink)]'
                  : 'border-[var(--line-soft)] bg-[var(--card-bg)] text-[var(--text-main)] hover:bg-[var(--tape)] hover:text-[var(--on-tape)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{getDivisionName(d, i18n.language)}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive
                    ? 'bg-[var(--tape)] text-[var(--on-tape)]'
                    : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EdgeFade({ side, visible }: { side: 'left' | 'right'; visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 z-10 w-8 transition-opacity duration-200 ${
        side === 'left' ? 'left-0 bg-gradient-to-r from-[var(--canvas-bg)] to-transparent' : 'right-0 bg-gradient-to-l from-[var(--canvas-bg)] to-transparent'
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}

function ScrollButton({
  direction,
  visible,
  onClick,
}: {
  direction: 'left' | 'right'
  visible: boolean
  onClick: () => void
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!visible}
      tabIndex={visible ? 0 : -1}
      className={`absolute top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] backdrop-blur-sm transition hover:text-[#F2C230] ${
        direction === 'left' ? 'left-0.5' : 'right-0.5'
      } ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function FighterCard({
  fighter,
  archived = false,
  onOpen,
}: {
  fighter: OrgFighter
  archived?: boolean
  onOpen: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const record = formatRecord(fighter)
  const interim = fighter.title_status === 'interim'
  const winRate = fighter.win_rate != null ? `${Math.round(fighter.win_rate * 100)}%` : null
  const heightStr = formatHeight(fighter.height_cm, i18n.language)
  const reachStr = formatReach(fighter.reach_cm, i18n.language)
  const strAcc = fighter.sig_str_acc != null ? `${Math.round(fighter.sig_str_acc * 100)}%` : null
  const finishRate = fighter.finish_rate != null ? `${Math.round(fighter.finish_rate * 100)}%` : null

  return (
    <motion.article
      className="surface-card group flex h-full flex-col overflow-hidden !rounded-card hover:border-[var(--border-default)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`h-1 w-full ${fighter.belt ? 'bg-[#F2C230]' : 'bg-[var(--accent-red)]'}`} />
      <div className="flex flex-1 flex-col p-4">
        <div className="grid grid-cols-1 content-start justify-items-center gap-3 text-center sm:min-h-[160px] sm:grid-cols-[72px_1fr] sm:justify-items-stretch sm:text-left">
          <FighterAvatar
            name={fighter.name}
            imageUrl={fighter.image_url}
            highlight={fighter.belt}
            className="h-20 w-18 sm:h-24 sm:w-20 rounded-xl"
          />

          <div className="min-w-0 max-sm:w-full">
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 max-sm:w-full">
                {fighter.division ? (
                  <p className="font-mono text-label font-semibold uppercase tracking-[0.08em] text-[var(--text-red)]">
                    {getDivisionName(fighter.division, i18n.language)}
                  </p>
                ) : null}
                <h3 className="mt-0.5 flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-lg font-bold uppercase leading-tight tracking-[0.02em] text-[var(--text-main)] sm:justify-start">
                  {fighter.country_code ? <FlagIcon code={fighter.country_code} country={fighter.country} /> : null}
                  <span className="min-w-0 break-words">{fighter.name}</span>
                  {fighter.belt ? <ChampionBelt /> : null}
                </h3>
              </div>
            </div>

            <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">
              {record ? <span className="font-semibold text-[var(--text-main)]">{record}</span> : null}
              {fighter.nickname ? <span> • “{fighter.nickname}”</span> : null}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-label max-sm:justify-center">
              {fighter.belt ? (
                <span className="rounded bg-[#F2C230] px-1.5 py-0.5 font-bold uppercase text-[#0E0E0E]">
                  {interim ? L(i18n.language, 'Interino', 'Interim', 'Intérimaire', 'Interino') : L(i18n.language, 'Campeão', 'Champion', 'Champion', 'Campeón')}
                </span>
              ) : fighter.ranking ? (
                <span className="rounded border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-1.5 py-0.5 font-bold text-[var(--text-main)]">
                  {fighter.ranking}
                </span>
              ) : null}

              {!archived && fighter.is_active ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-green)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                  {L(i18n.language, 'Ativo', 'Active', 'Actif', 'Activo')}
                </span>
              ) : !archived ? (
                <span className="text-[var(--text-muted)]">
                  {L(i18n.language, 'Inativo', 'Former', 'Inactif', 'Inactivo')}
                </span>
              ) : null}

              {fighter.camp ? (
                <span className="truncate max-w-[150px] text-[var(--text-muted)]">
                  • {fighter.camp}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* 4 Performance & Build Mini Stats (UFC style) */}
        <div className="mt-auto pt-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-[var(--border-subtle)] pt-3">
          <CardFact
            label={L(i18n.language, 'Aproveitamento', 'Win rate', 'Taux de victoire', 'Porcentaje de victorias')}
            value={winRate ?? '—'}
          />
          <CardFact
            label={L(i18n.language, 'Envergadura', 'Reach', 'Allonge', 'Alcance')}
            value={reachStr ?? heightStr ?? '—'}
          />
          <CardFact
            label={L(i18n.language, 'Precisão de golpes', 'Str. Acc', 'Préc. coups', 'Prec. golpes')}
            value={strAcc ?? '—'}
          />
          <CardFact
            label={L(i18n.language, 'Taxa de finalização', 'Finish rate', 'Avant la limite', 'Tasa de finalización')}
            value={finishRate ?? (fighter.org_record ? fighter.org_record : '—')}
          />
        </dl>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onOpen(fighter.name)}
            aria-label={L(i18n.language, `${fighter.name}. Ver perfil`, `${fighter.name}. View profile`, `${fighter.name}. Voir le profil`, `${fighter.name}. Ver perfil`)}
            className="primary-action inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs uppercase"
          >
            <Award className="h-3.5 w-3.5" />
            {L(i18n.language, 'Ver perfil', 'View profile', 'Voir le profil', 'Ver perfil')}
          </button>
          {fighter.profile_url ? (
            <a
              href={fighter.profile_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={L(i18n.language, 'Perfil oficial no ONE', 'Official profile on ONE', 'Profil officiel', 'Perfil oficial en ONE')}
              className="ghost-action inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3 text-[var(--text-red)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  )
}
