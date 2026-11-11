import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Crown, Sparkles, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { FlagIcon } from '../../shared/components/FlagIcon'
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton'
import { OrgFighterModal } from '../../shared/components/OrgFighterModal'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { L } from '../../i18n/lang'
import { orgEs, orgPt } from '../../shared/data/orgs'
import { getDivisionName, poundForPoundLabel } from '../../shared/data/divisions'
import { formatDate } from '../../shared/data/orgFormat'
import { useOrg } from '../../shared/hooks/useOrg'
import { useOrgFighterLookup } from '../../shared/hooks/useOrgFighterLookup'
import { useOrgRankings } from '../../shared/hooks/useOrgData'
import type { OrgRankingCategory, OrgRankingEntry } from '../../shared/types/api'

type Tab = 'division' | 'p4p'

export function OrgRankings() {
  const { i18n } = useTranslation()
  const org = useOrg()
  const { rankings, loading, error } = useOrgRankings(org.id)
  const [tab, setTab] = useState<Tab>('division')
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)

  const divisions = useMemo(() => rankings.filter((category) => !category.is_p4p), [rankings])
  const p4p = useMemo(() => rankings.filter((category) => category.is_p4p), [rankings])
  const activeDivision = divisions.find((category) => category.category === selectedDivision) ?? divisions[0] ?? null
  const activeP4p = p4p[0] ?? null
  const active = tab === 'division' ? activeDivision : activeP4p

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
          eyebrow={L(i18n.language, `Rankings oficiais ${orgPt(org, 'de')}`, `Official ${org.shortName} rankings`, `Classements officiels ${org.shortName}`, `Ranking oficial de ${orgEs(org)}`)}
          title={L(i18n.language, 'Rankings por categoria e peso por peso', 'Divisional & pound-for-pound rankings', 'Classements par catégorie et livre pour livre', 'Ranking por división y libra por libra')}
          description={L(
            i18n.language,
            `Rankings oficiais do ${org.sourceName}, com aproveitamento e data da última luta extraídos da base de dados.`,
            `The official ${org.sourceName} rankings, with each fighter's win rate and last fight added from our data.`,
            `Classements officiels de ${org.sourceName}, avec le taux de victoire et la date du dernier combat tirés de notre base.`,
            `El ranking oficial de ${org.sourceName}, con el porcentaje de victorias y la fecha de la última pelea de cada peleador, añadidos desde nuestros datos.`,
          )}
      >
        {p4p.length ? (
          <div className="chip-scroll inline-flex max-w-full overflow-x-auto rounded-control border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5">
            <TabButton active={tab === 'division'} onClick={() => setTab('division')}>
              {L(i18n.language, 'Por categoria', 'Category ranking', 'Par catégorie', 'Por división')}
            </TabButton>
            <TabButton active={tab === 'p4p'} onClick={() => setTab('p4p')}>
              {L(i18n.language, 'Peso por peso', 'Pound-for-Pound', 'Livre pour livre', 'Libra por libra')}
            </TabButton>
          </div>
        ) : null}
      </PageHeader>

      {error ? <p className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 px-3 py-2 text-sm font-semibold text-[var(--text-red)]">{error}</p> : null}

      {loading ? (
        <section className="grid gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[64px]" />
          ))}
        </section>
      ) : !active ? (
        <div className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
          {L(i18n.language, 'Rankings ainda não disponíveis.', 'Rankings are not available yet.', 'Les classements ne sont pas encore disponibles.', 'El ranking aún no está disponible.')}
        </div>
      ) : (
        <div className="space-y-6">
          {tab === 'division' ? (
            <div className="max-w-sm">
              <label htmlFor="ranking-division" className="mb-1.5 block font-mono text-label font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {L(i18n.language, 'Categoria', 'Division', 'Catégorie', 'División')}
              </label>
              <select
                id="ranking-division"
                value={active.category}
                onChange={(event) => setSelectedDivision(event.target.value)}
                className="soft-input w-full rounded-control px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
              >
                {divisions.map((division) => (
                  <option key={division.category} value={division.category}>
                    {getDivisionName(division.category, i18n.language)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {p4p.map((category) => {
                const label = poundForPoundLabel(category.category, i18n.language)
                return (
                  <span key={category.category} className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm font-semibold text-[var(--text-primary)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--text-red)]" />
                    {label}
                  </span>
                )
              })}
            </div>
          )}

          <RankingList org={org.id} category={active} vacantLabel={tab === 'division'} onOpenProfile={setProfileName} />
        </div>
      )}

      {profileName ? <OrgFighterModal key={profileName} org={org} name={profileName} onClose={() => setProfileName(null)} onSelectFighter={setProfileName} /> : null}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-colors ${
        active ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}

function RankingList({
  org,
  category,
  vacantLabel,
  onOpenProfile,
}: {
  org: string
  category: OrgRankingCategory
  vacantLabel: boolean
  onOpenProfile: (name: string) => void
}) {
  const { i18n } = useTranslation()
  // Champion and interim champion both sit at rank 0; the champion goes first.
  const titleHolders = category.entries.filter((entry) => entry.rank === 0)
  const contenders = category.entries.filter((entry) => entry.rank > 0)
  const vacant = vacantLabel && !titleHolders.some((entry) => entry.status === 'champion')

  return (
    <section aria-label={L(i18n.language, 'Atletas ranqueados', 'Ranked athletes', 'Combattants classés', 'Peleadores clasificados')} >
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
        <h2 className="section-title">{L(i18n.language, 'Atletas ranqueados', 'Ranked athletes', 'Combattants classés', 'Peleadores clasificados')}</h2>
        <span className="shrink-0 text-sm text-[var(--text-muted)]">
          {contenders.length + titleHolders.length} {L(i18n.language, 'listados', 'listed', 'listés', 'registrados')}
        </span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {vacant ? (
          <article className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-control px-2 py-3 sm:gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-red-solid)] text-white">
              <Crown className="h-4 w-4" />
            </span>
            <p className="text-base font-semibold text-[var(--text-primary)]">{L(i18n.language, 'Cinturão vago', 'Championship vacant', 'Ceinture vacante', 'Campeonato vacante')}</p>
          </article>
        ) : null}
        {titleHolders.map((entry) => (
          <RankingRow key={`${entry.status}-${entry.fighter}`} org={org} entry={entry} onOpenProfile={onOpenProfile} />
        ))}
        {contenders.map((entry) => (
          <RankingRow key={entry.fighter} org={org} entry={entry} onOpenProfile={onOpenProfile} />
        ))}
        {!titleHolders.length && !contenders.length ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
            {L(i18n.language, 'Nenhum atleta ranqueado nesta categoria.', 'No ranked athletes in this category.', 'Aucun combattant classé dans cette catégorie.', 'No hay peleadores clasificados en esta división.')}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function RankingRow({
  org,
  entry,
  onOpenProfile,
}: {
  org: string
  entry: OrgRankingEntry
  onOpenProfile: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const lookup = useOrgFighterLookup(org)
  const profile = lookup(entry.fighter)
  const holder = entry.rank === 0
  const interim = entry.status === 'interim'

  const holderLabel = holder
    ? interim
      ? L(i18n.language, 'Campeão interino', 'Interim champion', 'Champion intérimaire', 'Campeón interino')
      : L(i18n.language, 'Campeão', 'Champion', 'Champion', 'Campeón')
    : null

  const content = (
    <>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center font-display text-lg font-bold tabular-nums ${
          holder ? `rounded-full text-white ${interim ? 'bg-[var(--accent-blue-solid)]' : 'bg-[var(--accent-red-solid)]'}` : 'text-[var(--text-secondary)]'
        }`}
      >
        {holder ? <Crown className="h-4 w-4" /> : entry.rank}
      </span>

      <FighterAvatar name={entry.fighter} imageUrl={profile?.image_url ?? null} highlight={holder} className="h-12 w-12" />

      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
          {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
          <span className="min-w-0 truncate">{entry.fighter}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
          {holder ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F2C230] px-2 py-0.5 text-xs font-bold uppercase tracking-[0.06em] text-[#0E0E0E]">
              <Trophy className="h-3.5 w-3.5" /> {holderLabel}
            </span>
          ) : null}
          {entry.win_rate !== null ? (
            <span>
              {L(i18n.language, 'Aproveitamento: ', 'Win rate: ', 'Taux de victoire : ', 'Porcentaje de victorias: ')}
              {(entry.win_rate * 100).toFixed(1)}%
            </span>
          ) : null}
          {entry.last_fight ? (
            <span>
              {L(i18n.language, 'Última luta: ', 'Last fight: ', 'Dernier combat : ', 'Última pelea: ')}
              {formatDate(entry.last_fight, true, i18n.language)}
            </span>
          ) : null}
        </div>
      </div>

      <RankChange change={entry.rank_change} />
    </>
  )

  const base = '-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-control px-2 py-3 sm:gap-4'
  const accessibleLabel = L(
    i18n.language,
    `${entry.fighter}, ${entry.rank === 0 ? (interim ? 'campeão interino' : 'campeão') : `${entry.rank}º lugar`}. Ver perfil`,
    `${entry.fighter}, rank ${entry.rank || 'champion'}. View profile`,
    `${entry.fighter}, ${entry.rank === 0 ? (interim ? 'champion intérimaire' : 'champion') : `${entry.rank === 1 ? '1re' : `${entry.rank}e`} place`}. Voir le profil`,
    `${entry.fighter}, ${entry.rank === 0 ? (interim ? 'campeón interino' : 'campeón') : `puesto ${entry.rank}`}. Ver perfil`,
  )

  return profile ? (
    <button
      type="button"
      onClick={() => onOpenProfile(profile.name)}
      aria-label={accessibleLabel}
      className={`${base} cursor-pointer text-left transition-colors hover:bg-[var(--bg-surface-hover)]`}
    >
      {content}
    </button>
  ) : (
    <article className={base}>{content}</article>
  )
}

/** "up 2", "down 1" or "new", as written by the scraper. */
function RankChange({ change }: { change: string | null }) {
  const { i18n } = useTranslation()
  if (!change) return null
  const [direction, amount] = change.split(' ')
  if (direction === 'up' || direction === 'down') {
    const Arrow = direction === 'up' ? ArrowUp : ArrowDown
    const titleText = L(
      i18n.language,
      `${direction === 'up' ? 'Subiu' : 'Caiu'} ${amount} ${amount === '1' ? 'posição' : 'posições'}`,
      `${direction === 'up' ? 'Up' : 'Down'} ${amount} place${amount === '1' ? '' : 's'}`,
      `${direction === 'up' ? 'Monté' : 'Descendu'} de ${amount} ${amount === '1' ? 'place' : 'places'}`,
      `${direction === 'up' ? 'Subió' : 'Bajó'} ${amount} ${amount === '1' ? 'puesto' : 'puestos'}`,
    )

    return (
      <span
        title={titleText}
        className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-label font-semibold ${
          direction === 'up'
            ? 'border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10 text-[var(--text-green)]'
            : 'border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 text-[var(--text-red)]'
        }`}
      >
        <Arrow className="h-3 w-3" />
        {amount}
      </span>
    )
  }
  const label = change === 'new' ? L(i18n.language, 'Novo', change, 'Nouveau', 'Nuevo') : change
  return <span className="type-tech rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-label font-semibold uppercase text-[var(--text-muted)]">{label}</span>
}
