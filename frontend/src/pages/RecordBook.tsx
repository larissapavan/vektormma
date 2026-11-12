import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Trophy } from 'lucide-react'

import { L } from '../i18n/lang'
import { CATEGORY_BLURBS, CATEGORY_TABLES, STAT_NOTE_TABLES, STAT_TITLE_TABLES, localizedLabel } from '../shared/data/recordBookLabels'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { SectionHeading } from '../shared/components/SectionHeading'
import { useRecordBook } from '../shared/hooks/useRecordBook'
import type { RecordBookCategory, RecordBookStat } from '../shared/types/api'

export function RecordBook() {
  const { t, i18n } = useTranslation()
  const { data, loading, error } = useRecordBook()
  const [categoryName, setCategoryName] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)

  const categories = data?.categories ?? []
  const active: RecordBookCategory | undefined = categories.find((category) => category.name === categoryName) ?? categories[0]

  const getBlurb = (name?: string) => {
    if (!name) return ''
    const key = `recordBook.blurbs.${name}`
    const translated = t(key)
    return translated !== key ? translated : (CATEGORY_BLURBS[name] ?? '')
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section>
        <SectionHeading
          level={1}
          title={t('recordBook.title')}
          description={t('recordBook.description')}
        />

        {categories.length ? (
          <div role="group" aria-label={L(i18n.language, 'Categorias de recordes', 'Record categories', 'Catégories de records', 'Categorías de récords')} className="mt-4 inline-flex max-w-full overflow-x-auto border-2 border-[var(--rule)] bg-[var(--card-bg)] chip-scroll">
            {categories.map((category) => (
              <button
                key={category.name}
                type="button"
                aria-pressed={category.name === active?.name}
                onClick={() => setCategoryName(category.name)}
                className={`min-h-11 shrink-0 px-4 text-sm font-semibold transition-colors sm:px-5 ${
                  category.name === active?.name
                    ? 'bg-[var(--ink)] text-[var(--on-ink)]'
                    : 'text-[var(--ink)] hover:bg-[var(--panel)]'
                }`}
              >
                {localizedLabel(i18n.language, category.name, CATEGORY_TABLES, category.name)}
                <span className="ml-1.5 opacity-70">{category.stats.length}</span>
              </button>
            ))}
          </div>
        ) : null}
        {active ? <p className="mt-2 text-sm text-[var(--text-muted)]">{getBlurb(active.name)}</p> : null}
      </section>

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading ? (
        <section className="grid gap-2.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[48px]" />
          ))}
        </section>
      ) : active ? (
        <section className="grid gap-2.5">
          {active.stats.map((stat) => (
            <StatCard key={stat.key} stat={stat} onOpenProfile={setProfileName} />
          ))}
        </section>
      ) : null}

      {profileName ? (
        <FighterProfileModal
          key={profileName}
          name={profileName}
          onClose={() => setProfileName(null)}
          onSelectFighter={setProfileName}
        />
      ) : null}
    </div>
  )
}

function StatCard({ stat, onOpenProfile }: { stat: RecordBookStat; onOpenProfile: (name: string) => void }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelId = `stat-${stat.key}`
  const title = localizedLabel(i18n.language, stat.title, STAT_TITLE_TABLES, stat.key)
  const note = stat.note ? localizedLabel(i18n.language, stat.note, STAT_NOTE_TABLES, stat.note) : stat.note

  return (
    <section className="surface-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition duration-150 hover:bg-[var(--bg-surface-subtle)] sm:px-4"
      >
        <Trophy className="h-4 w-4 shrink-0 text-[var(--ink)]" />
        <h3 className="broadcast-label text-xs text-[var(--text-main)]">{title}</h3>
        <span className="theme-muted text-xs">({stat.leaders.length})</span>
        <ChevronDown className={`theme-muted ml-auto h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div id={panelId} className="border-t border-[var(--line-soft)] px-3 py-3 sm:px-4">
          {note ? <p className="theme-muted mb-2 text-label leading-4">{note}</p> : null}
          <ol className="lg:columns-2 lg:gap-x-8">
            {stat.leaders.map((leader, index) => (
              <li key={`${leader.rank}-${leader.fighter}-${index}`} className="break-inside-avoid">
                <LeaderRow leader={leader} onOpenProfile={onOpenProfile} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}

function LeaderRow({
  leader,
  onOpenProfile,
}: {
  leader: RecordBookStat['leaders'][number]
  onOpenProfile: (name: string) => void
}) {
  const { i18n } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onOpenProfile(leader.fighter)}
      aria-label={L(i18n.language, `${leader.fighter}, #${leader.rank}. Ver perfil`, `${leader.fighter}, rank ${leader.rank}. View profile`, `${leader.fighter}, rang ${leader.rank}. Voir le profil`, `${leader.fighter}, puesto ${leader.rank}. Ver perfil`)}
      className="flex w-full cursor-pointer items-center text-left gap-2.5 px-2 py-1.5 transition-colors hover:bg-[var(--gold-fill)] focus-visible:bg-[var(--gold-fill)] focus-visible:outline-none"
    >
      <span className="type-num w-4 shrink-0 text-right text-label text-[var(--text-muted)]">{leader.rank}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-[var(--text-main)]">{leader.fighter}</p>
      </div>
      <span className="data-value shrink-0 text-sm font-bold text-[var(--text-main)]">{leader.value}</span>
    </button>
  )
}
