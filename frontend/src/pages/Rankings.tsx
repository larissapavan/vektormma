import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Crown, Sparkles, Trophy } from 'lucide-react'

import { L, localeTag } from '../i18n/lang'
import { DivisionMatrixCard } from '../shared/components/DivisionMatrixCard'
import { FighterAvatar } from '../shared/components/FighterAvatar'
import { FighterBadges, FlagList } from '../shared/components/FighterBadges'
import { badgesForRankings } from '../shared/data/badges'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { getDivisionName, poundForPoundLabel } from '../shared/data/divisions'
import { getFighterImageUrl, normalizeFighterName, useFighterImages } from '../shared/hooks/useFighterImages'
import { useFighters } from '../shared/hooks/useFighters'
import { useRankings } from '../shared/hooks/useRankings'
import type { FighterProfile, RankingCategory, RankingEntry } from '../shared/types/api'

type Tab = 'division' | 'p4p'

export function Rankings() {
  const { t } = useTranslation()
  const { rankings, loading, error } = useRankings()
  const [tab, setTab] = useState<Tab>('division')

  const divisions = useMemo(() => rankings.filter((category) => !category.is_p4p), [rankings])
  const p4pCategories = useMemo(() => rankings.filter((category) => category.is_p4p), [rankings])

  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)
  const activeDivision = divisions.find((category) => category.category === selectedDivision) ?? divisions[0] ?? null

  const [selectedP4p, setSelectedP4p] = useState<string | null>(null)
  const activeP4p = p4pCategories.find((category) => category.category === selectedP4p) ?? p4pCategories[0] ?? null

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader eyebrow={t('rankings.eyebrow')} title={t('rankings.title')} description={t('rankings.description')}>
        <div className="chip-scroll inline-flex max-w-full overflow-x-auto rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5">
          <TabButton active={tab === 'division'} onClick={() => setTab('division')}>
            {t('rankings.categoryRanking')}
          </TabButton>
          <TabButton active={tab === 'p4p'} onClick={() => setTab('p4p')}>
            {t('rankings.p4p')}
          </TabButton>
        </div>
      </PageHeader>

      {error ? (
        <p role="alert" className="error-note">{error}</p>
      ) : null}

      {loading ? (
        <section className="grid gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[64px]" />
          ))}
        </section>
      ) : tab === 'division' ? (
        <DivisionView divisions={divisions} active={activeDivision} onSelect={setSelectedDivision} />
      ) : (
        <P4pView categories={p4pCategories} active={activeP4p} onSelect={setSelectedP4p} />
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-sm px-4 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}

function DivisionView({
  divisions,
  active,
  onSelect,
}: {
  divisions: RankingCategory[]
  active: RankingCategory | null
  onSelect: (category: string) => void
}) {
  const { t, i18n } = useTranslation()

  if (!active) {
    return (
      <p className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">{t('rankings.rankingsUnavailable')}</p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <label htmlFor="ranking-division" className="mb-1.5 block text-label font-semibold text-[var(--text-muted)]">
          {t('rankings.division')}
        </label>
        <select
          id="ranking-division"
          value={active.category}
          onChange={(event) => onSelect(event.target.value)}
          className="soft-input w-full rounded-sm px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
        >
          {divisions.map((division) => (
            <option key={division.category} value={division.category}>
              {getDivisionName(division.category, i18n.language)}
            </option>
          ))}
        </select>
      </div>

      <RankingList entries={active.entries} />

      <DivisionMatrixCard key={active.category} category={active.category} />
    </div>
  )
}

function P4pView({
  categories,
  active,
  onSelect,
}: {
  categories: RankingCategory[]
  active: RankingCategory | null
  onSelect: (category: string) => void
}) {
  const { t, i18n } = useTranslation()

  if (!active) {
    return (
      <p className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">{t('rankings.rankingsUnavailable')}</p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const label = poundForPoundLabel(category.category, i18n.language)
          return (
            <button
              key={category.category}
              type="button"
              onClick={() => onSelect(category.category)}
              aria-pressed={category.category === active.category}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-sm border px-3 text-sm font-semibold transition-colors ${
                category.category === active.category
                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-surface)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      <RankingList entries={active.entries} />
    </div>
  )
}



function RankingList({ entries }: { entries: RankingEntry[] }) {
  const { i18n } = useTranslation()
  const { fighters } = useFighters()
  const [profileName, setProfileName] = useState<string | null>(null)
  const { imageByName } = useFighterImages()
  const profileFor = useMemo(() => {
    const index = new Map(fighters.map((fighter) => [normalizeFighterName(fighter.name), fighter]))
    return (name: string) => index.get(normalizeFighterName(name))
  }, [fighters])
  const imageUrlFor = useMemo(() => {
    const profileByName = new Map(fighters.map((fighter) => [normalizeFighterName(fighter.name), fighter]))
    return (name: string) => getFighterImageUrl(name, imageByName, profileByName.get(normalizeFighterName(name))?.image_url)
  }, [fighters, imageByName])

  const champion = entries.find((entry) => entry.rank === 0)
  const contenders = entries.filter((entry) => entry.rank > 0)

  return (
    <section aria-label={L(i18n.language, 'Atletas ranqueados', 'Ranked athletes', 'Combattants classés', 'Peleadores clasificados')} >
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
        <h2 className="section-title">
          {L(i18n.language, 'Lutadores ranqueados', 'Ranked athletes', 'Combattants classés', 'Peleadores clasificados')}
        </h2>
        <span className="shrink-0 text-sm text-[var(--text-muted)]">
          {contenders.length + (champion ? 1 : 0)} {L(i18n.language, 'atletas', 'listed', 'listés', 'registrados')}
        </span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
      {champion ? (
        <RankingRow
          entry={champion}
          imageUrl={imageUrlFor(champion.fighter)}
          profile={profileFor(champion.fighter)}
          onOpenProfile={setProfileName}
          isChampion
        />
      ) : null}
      {contenders.map((entry) => (
        <RankingRow
          key={entry.fighter}
          entry={entry}
          imageUrl={imageUrlFor(entry.fighter)}
          profile={profileFor(entry.fighter)}
          onOpenProfile={setProfileName}
        />
      ))}
      {!champion && contenders.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
          {L(i18n.language, 'Nenhum atleta ranqueado nesta categoria.', 'No ranked athletes in this category.', 'Aucun combattant classé dans cette catégorie.', 'No hay peleadores clasificados en esta división.')}
        </div>
      ) : null}
      </div>

      {profileName ? (
        <FighterProfileModal
          key={profileName}
          name={profileName}
          onClose={() => setProfileName(null)}
          onSelectFighter={setProfileName}
        />
      ) : null}
    </section>
  )
}

function RankingRow({
  entry,
  imageUrl,
  profile,
  onOpenProfile,
  isChampion = false,
}: {
  entry: RankingEntry
  imageUrl: string | null
  profile?: FighterProfile
  onOpenProfile: (name: string) => void
  isChampion?: boolean
}) {
  const { t, i18n } = useTranslation()

  const content = (
    <>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center font-display text-lg font-bold tabular-nums ${
          isChampion ? 'rounded-sm bg-[var(--ink)] text-[var(--on-ink)]' : 'text-[var(--text-secondary)]'
        }`}
      >
        {isChampion ? <Crown className="h-4 w-4" /> : entry.rank}
      </span>

      <FighterAvatar name={entry.fighter} imageUrl={imageUrl} highlight={isChampion} className="h-12 w-12" />

      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
          {profile ? <FlagList fighter={profile} /> : null}
          <span className="min-w-0 truncate">{entry.fighter}</span>
        </p>
        {profile ? <FighterBadges badges={badgesForRankings(profile.badges)} className="mt-1" /> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
          {isChampion ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-[var(--gold-fill)] px-2 py-0.5 text-xs font-bold text-[#10151d]">
              <Trophy className="h-3.5 w-3.5" /> {t('rankings.champion')}
            </span>
          ) : null}
          {entry.win_rate !== null ? <span>{L(i18n.language, 'Taxa de vitória', 'Win rate', 'Taux de victoire', 'Porcentaje de victorias')}: {(entry.win_rate * 100).toFixed(1)}%</span> : null}
          {entry.last_fight ? <span>{L(i18n.language, 'Última luta', 'Last fight', 'Dernier combat', 'Última pelea')}: {formatDate(entry.last_fight, i18n.language)}</span> : null}
        </div>
      </div>

      <RankChangeBadge change={entry.rank_change} />
    </>
  )

  const base = '-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-sm px-2 py-3 sm:gap-4'

  return profile ? (
    <button
      type="button"
      onClick={() => onOpenProfile(profile.name)}
      aria-label={
        L(
          i18n.language,
          `${entry.fighter}, ${entry.rank === 0 ? 'campeão' : `${entry.rank}º lugar`}. Ver perfil`,
          `${entry.fighter}, rank ${entry.rank || 'champion'}. View profile`,
          `${entry.fighter}, ${entry.rank === 0 ? 'champion' : `rang ${entry.rank}`}. Voir le profil`,
          `${entry.fighter}, ${entry.rank === 0 ? 'campeón' : `puesto ${entry.rank}`}. Ver perfil`,
        )
      }
      className={`${base} cursor-pointer text-left transition-colors hover:bg-[var(--bg-surface-hover)]`}
    >
      {content}
    </button>
  ) : (
    <article className={base}>{content}</article>
  )
}

function RankChangeBadge({ change }: { change: string | null }) {
  if (!change) return null

  if (change === 'up') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10 px-2 py-0.5 text-label font-semibold text-[var(--text-green)]">
        <ArrowUp className="h-3 w-3" />
      </span>
    )
  }

  if (change === 'down') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-[var(--rule)] bg-[var(--panel)] px-2 py-0.5 text-label font-semibold text-[var(--text-red)]">
        <ArrowDown className="h-3 w-3" />
      </span>
    )
  }

  return (
    <span className="type-tech rounded-sm border border-[var(--border-subtle)] px-2 py-0.5 text-label font-semibold text-[var(--text-muted)]">
      {change}
    </span>
  )
}

function formatDate(date: string, lang: string = 'en-US'): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(localeTag(lang), { year: 'numeric', month: 'short', day: 'numeric' })
}
