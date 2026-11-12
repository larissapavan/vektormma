import { createContext, useContext, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Flame, Layers, Shield, ThumbsDown, Trophy } from 'lucide-react'

import { L, localeTag, pick, uiLang, type ByLang, type UiLang } from '../i18n/lang'
import { FighterAvatar } from '../shared/components/FighterAvatar'
import { FighterBadges, FlagList } from '../shared/components/FighterBadges'
import { badgesForRankings } from '../shared/data/badges'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { ChampionBelt } from '../shared/components/ChampionBelt'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { divisionLimit, divisionOrder, getDivisionName } from '../shared/data/divisions'
import { METHOD_WORDS, translateTechnique } from '../shared/data/fightLabels'
import { useChampions } from '../shared/hooks/useChampions'
import { useFighterImages, getFighterImageUrl, normalizeFighterName } from '../shared/hooks/useFighterImages'
import { useFighters } from '../shared/hooks/useFighters'
import type { ChampionSummary, RecordCategory, RecordEntry, TitleFight, TitleReign } from '../shared/types/api'

type Tab = 'positive' | 'negative' | 'multi'

const MULTI_DIVISION_KEY = 'multi_division_champions'

/** Opens a fighter's profile on top of this page, so closing it leaves the reader exactly where they were. */
const OpenProfileContext = createContext<(name: string) => void>(() => undefined)

type ViewKey = 'current' | 'greatest' | 'records'

export function Champions() {
  const { t, i18n } = useTranslation()
  const { data, loading, error } = useChampions()
  const [tab, setTab] = useState<Tab>('positive')
  const multiDivision = data?.records.find((category) => category.key === MULTI_DIVISION_KEY)
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('view')
  const validViews: ViewKey[] = ['current', 'greatest', 'records']
  const view: ViewKey = validViews.includes(requested as ViewKey) ? (requested as ViewKey) : 'current'
  const chooseView = (next: ViewKey) => setSearchParams(next === 'current' ? {} : { view: next }, { replace: true })
  const [profileName, setProfileName] = useState<string | null>(null)

  const views = [
    { key: 'current' as const, label: t('champions.current'), short: t('champions.current') },
    { key: 'greatest' as const, label: t('champions.greatest'), short: t('champions.greatest') },
    { key: 'records' as const, label: t('champions.records'), short: t('champions.records') },
  ]

  return (
    <OpenProfileContext.Provider value={setProfileName}>
      <div className="space-y-8">
        <PageHeader eyebrow={t('champions.eyebrow')} title={t('champions.title')} description={t('champions.description')}>

          <div
            role="tablist"
            aria-label={L(i18n.language, 'Escolha a visualização', 'Choose what to see', 'Choisir la vue', 'Elige qué ver')}
            className="chip-scroll inline-flex max-w-full overflow-x-auto rounded-sm border-[1.5px] border-[var(--ink)]"
          >
            {views.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`champions-tab-${item.key}`}
                aria-selected={view === item.key}
                aria-controls="champions-panel"
                onClick={() => chooseView(item.key)}
                className={`min-h-11 shrink-0 cursor-pointer whitespace-nowrap px-5 text-[15px] font-bold ${view === item.key ? 'bg-[var(--ink)] text-[var(--on-ink)]' : 'hover:bg-[var(--panel-hover)]'}`}
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </PageHeader>

        {error ? (
          <p role="alert" className="error-note">{error}</p>
        ) : null}

        {loading || !data ? (
          <section className="grid gap-2.5 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-[90px]" />
            ))}
          </section>
        ) : (
          <div id="champions-panel" role="tabpanel" aria-labelledby={`champions-tab-${view}`} className="space-y-8">
            {view === 'current' ? <CurrentChampionsSection reigns={data.current_champions} history={data.reigns ?? []} /> : null}
            {view === 'greatest' ? <GreatestChampionsSection champions={data.greatest_champions} /> : null}
            {view === 'records' ? (
              <section>
                <div className="chip-scroll mb-6 inline-flex max-w-full overflow-x-auto rounded-sm border-[1.5px] border-[var(--ink)]">
                  <TabButton active={tab === 'positive'} onClick={() => setTab('positive')}>
                    {t('champions.positive')}
                  </TabButton>
                  <TabButton active={tab === 'negative'} onClick={() => setTab('negative')}>
                    {t('champions.negative')}
                  </TabButton>
                  <TabButton active={tab === 'multi'} onClick={() => setTab('multi')}>
                    {t('champions.multi')}
                  </TabButton>
                </div>

                {tab === 'multi' ? (
                  multiDivision ? <MultiDivisionSection category={multiDivision} current={data.current_champions} /> : null
                ) : (
                  <div className="grid gap-2.5">
                    {data.records
                      .filter((category) => category.kind === tab && category.key !== MULTI_DIVISION_KEY)
                      .map((category) => (
                        <RecordCard key={category.key} category={category} />
                      ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}

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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 shrink-0 cursor-pointer whitespace-nowrap px-5 text-[15px] font-bold ${active ? 'bg-[var(--ink)] text-[var(--on-ink)]' : 'hover:bg-[var(--panel-hover)]'}`}
    >
      {children}
    </button>
  )
}

function formatFightDate(date: string | null | undefined, lang: string = 'en-US') {
  if (!date) return null
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(localeTag(lang), { year: 'numeric', month: 'short', day: 'numeric' })
}

const RESULT_METHODS: Record<string, ByLang> = {
  'KO/TKO': { en: 'KO/TKO', pt: 'nocaute (KO/TKO)', fr: 'KO/TKO', es: 'nocaut (KO/TKO)' },
  SUB: { en: 'submission', pt: 'finalização', fr: 'soumission', es: 'sumisión' },
  'U-DEC': { en: 'unanimous decision', pt: 'decisão unânime', fr: 'décision unanime', es: 'decisión unánime' },
  'S-DEC': { en: 'split decision', pt: 'decisão dividida', fr: 'décision partagée', es: 'decisión dividida' },
  'M-DEC': { en: 'majority decision', pt: 'decisão majoritária', fr: 'décision majoritaire', es: 'decisión mayoritaria' },
  DQ: { en: 'disqualification', pt: 'desqualificação', fr: 'disqualification', es: 'descalificación' },
}

function describeLastFight(fight: NonNullable<TitleReign['last_fight']>, lang: string = 'en-US') {
  const outcome = fight.result === 'win' ? L(lang, 'Vitória', 'Win', 'Victoire', 'Victoria') : fight.result === 'loss' ? L(lang, 'Derrota', 'Loss', 'Défaite', 'Derrota') : L(lang, 'Sem resultado', 'No result', 'Sans résultat', 'Sin resultado')
  const methodObj = fight.method ? RESULT_METHODS[fight.method] : null
  const methodStr = methodObj ? pick(lang, methodObj) : fight.method
  const method = methodStr ? L(lang, ` por ${methodStr}`, ` by ${methodStr}`, ` par ${methodStr}`, ` por ${methodStr}`) : ''
  const round = fight.round ? ` (R${fight.round})` : ''
  const date = formatFightDate(fight.date, lang)
  return `${outcome}${method}${round}${date ? ` · ${date}` : ''}`
}

type CompactStat = { label: string; value: string }

function CompactChampionCard({
  name,
  imageUrl,
  badge,
  subtitle,
  current = false,
  stats,
  onClick,
  ariaLabel,
  expanded,
  controls,
}: {
  name: string
  imageUrl: string | null
  badge?: React.ReactNode
  subtitle: string
  current?: boolean
  stats: CompactStat[]
  onClick: () => void
  ariaLabel: string
  expanded?: boolean
  controls?: string
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      aria-controls={controls}
      className="flex w-full min-w-0 cursor-pointer items-center gap-4 border-b border-[var(--rule)] px-3 py-3.5 text-left hover:bg-[var(--panel)]"
    >
      <div className="relative shrink-0">
        <FighterAvatar name={name} className="h-12 w-12" imageUrl={imageUrl} />
        {badge}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="min-w-0 break-words font-display text-2xl font-extrabold leading-none" title={name}>
            {name}
          </p>
          {current ? (
            <span className="shrink-0 rounded-sm border-[1.5px] border-[var(--ink)] px-2 py-0.5 text-[13px] font-bold">
              {t('rankings.champion')}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[15px] text-[var(--muted)]">{subtitle}</p>
        <p className="mt-0.5 text-sm text-[var(--muted)] sm:hidden">{stats.map((stat) => `${stat.value} ${stat.label.toLowerCase()}`).join(' · ')}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-6 text-right sm:flex">
        {stats.map((stat) => (
          <Stat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
      {expanded !== undefined ? (
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-[var(--text-main)] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      ) : null}
    </button>
  )
}

function RankBadge({ rank, goat = false }: { rank: number; goat?: boolean }) {
  if (goat) {
    return (
      <span className="type-num absolute -bottom-1 -left-1 grid h-5 place-items-center rounded-sm border border-[var(--rule)] bg-[var(--gold-fill)] px-1 text-label font-bold leading-none text-[#10151d]">
        GOAT
      </span>
    )
  }
  return (
    <span
      className={`type-num absolute -bottom-1 -left-1 grid h-5 min-w-5 place-items-center rounded-sm border px-1 text-label leading-none ${
        rank === 1 ? 'border-[var(--gold-fill)] bg-[var(--gold-fill)] text-[#10151d]' : 'border-[var(--ink)] bg-[var(--ink)] text-[var(--on-ink)]'
      }`}
    >
      {rank === 1 ? <Trophy className="h-3 w-3" /> : rank}
    </span>
  )
}

function CurrentChampionsSection({ reigns, history }: { reigns: TitleReign[]; history: TitleReign[] }) {
  const { t, i18n } = useTranslation()
  const openProfile = useContext(OpenProfileContext)
  const { fighters } = useFighters()
  const { imageByName } = useFighterImages()
  const profileByName = useMemo(() => new Map(fighters.map((fighter) => [normalizeFighterName(fighter.name), fighter])), [fighters])
  const ordered = useMemo(() => [...reigns].sort((a, b) => divisionOrder(a.division) - divisionOrder(b.division)), [reigns])

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-x-6 pb-3">
        <h2 className="section-title">{t('champions.current')}</h2>
        <p className="text-base text-[var(--muted)]">
          {reigns.length} {L(i18n.language, 'categorias', 'divisions', 'catégories', 'divisiones')}
        </p>
      </div>

      <ul className="grid border-l border-t-[3px] border-[var(--ink)] border-l-[var(--rule)] sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((reign) => {
          const profile = profileByName.get(normalizeFighterName(reign.champion))
          const record = profile ? `${profile.wins ?? 0}-${profile.losses ?? 0}-${profile.draws ?? 0}` : null
          const limit = divisionLimit(reign.division)
          const last = reign.last_fight
          const divisionLabel = getDivisionName(reign.division, i18n.language)

          return (
            <li key={reign.division} className="flex flex-col border-b border-r border-[var(--rule)]">
              <button
                type="button"
                onClick={() => openProfile(reign.champion)}
                aria-label={L(i18n.language, `${reign.champion}, campeão peso ${divisionLabel}. Ver perfil`, `${reign.champion}, ${reign.division} champion. View profile`, `${reign.champion}, champion ${reign.division}. Voir le profil`, `${reign.champion}, campeón de ${divisionLabel}. Ver perfil`)}
                className="row-link flex flex-1 cursor-pointer flex-col gap-4 p-5 text-left hover:bg-[var(--panel)]"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[17px] font-bold">{divisionLabel}</span>
                  {limit ? <span className="text-[15px] text-[var(--muted)]">{limit}</span> : null}
                </span>
                <span className="flex items-end gap-4">
                  <FighterAvatar
                    name={reign.champion}
                    imageUrl={getFighterImageUrl(reign.champion, imageByName, profile?.image_url)}
                    className="h-28 w-24 shrink-0 !rounded-none"
                  />
                  <span className="min-w-0">
                    {profile?.nickname ? <span className="block text-[15px] text-[var(--muted)]">“{profile.nickname}”</span> : null}
                    <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-display text-[32px] font-black leading-[0.95]">
                      {profile ? <FlagList fighter={profile} className="h-4 w-6" /> : null}
                      <span className="min-w-0 break-words">{reign.champion}</span>
                    </span>
                    {record ? <span className="mt-1 block text-base">{L(i18n.language, `Cartel ${record}`, `Record ${record}`, `Palmarès ${record}`, `Récord ${record}`)}</span> : null}
                  </span>
                </span>
                <FighterBadges badges={badgesForRankings(profile?.badges)} />
                <span className="flex gap-7">
                  <span>
                    <span className="block font-display text-[28px] font-extrabold leading-none tabular-nums">{reign.days_held ?? '—'}</span>
                    <span className="text-[15px] text-[var(--muted)]">{t('champions.daysHeld')}</span>
                  </span>
                  <span>
                    <span className="block font-display text-[28px] font-extrabold leading-none tabular-nums">{reign.defenses_count}</span>
                    <span className="text-[15px] text-[var(--muted)]">{t('champions.defenses')}</span>
                  </span>
                </span>
                {last ? (
                  <span className="block text-[15px] leading-6">
                    <span className="font-bold">{L(i18n.language, 'Última luta', 'Last fight', 'Dernier combat', 'Última pelea')}:</span> vs. {last.opponent}
                    <span className="block text-[var(--muted)]">{describeLastFight(last, i18n.language)}</span>
                  </span>
                ) : null}
              </button>
              <div className="px-5 pb-4">
                <DivisionHistory division={reign.division} reigns={history} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const END_LABELS: Record<string, string> = {
  lost_title_fight: 'Lost the belt',
  vacated: 'Vacated',
  stripped: 'Stripped',
  unified: 'Unified with the undisputed belt',
}

const END_LABELS_PT: Record<string, string> = {
  lost_title_fight: 'Perdeu o cinturão',
  vacated: 'Vagou o cinturão',
  stripped: 'Destituído do cinturão',
  unified: 'Unificado ao cinturão linear',
}

const END_LABELS_FR: Record<string, string> = {
  lost_title_fight: 'A perdu la ceinture',
  vacated: 'Titre laissé vacant',
  stripped: 'Titre retiré',
  unified: 'Unifié avec la ceinture incontestée',
}

const END_LABELS_ES: Record<string, string> = {
  lost_title_fight: 'Perdió el cinturón',
  vacated: 'Dejó vacante el cinturón',
  stripped: 'Despojado del cinturón',
  unified: 'Unificado con el cinturón indiscutido',
}

function ordinal(value: number, language: string | boolean = false) {
  const lang = uiLang(language)
  if (lang === 'pt') return `${value}º`
  if (lang === 'es') return `${value}.º`
  if (lang === 'fr') return value === 1 ? '1er' : `${value}e`
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'
  return `${value}${suffix}`
}

function endReasonLabel(reason: string, language: string | boolean) {
  const lang = uiLang(language)
  if (lang === 'pt') return END_LABELS_PT[reason] ?? reason
  if (lang === 'fr') return END_LABELS_FR[reason] ?? reason
  if (lang === 'es') return END_LABELS_ES[reason] ?? reason
  return END_LABELS[reason] ?? null
}

/** How a reign was won, as the data words it ("def. Name", "promoted to champion"), in each language. */
const WON_HOW: Record<Exclude<UiLang, 'en'>, {
  undisputed: string
  champion: string
  awarded: string
  defeated: string
  interimChampion: string
  forInterim: string
  forUndisputed: string
}> = {
  pt: {
    undisputed: 'Promovido a campeão linear',
    champion: 'Promovido a campeão',
    awarded: 'Cinturão concedido',
    defeated: 'Venceu ',
    interimChampion: 'o campeão interino',
    forInterim: 'pelo cinturão interino',
    forUndisputed: 'pelo cinturão linear',
  },
  fr: {
    undisputed: 'Promu champion incontesté',
    champion: 'Promu champion',
    awarded: 'Titre attribué',
    defeated: 'Victoire contre ',
    interimChampion: 'le champion intérimaire',
    forInterim: 'pour le titre intérimaire',
    forUndisputed: 'pour le titre incontesté',
  },
  es: {
    undisputed: 'Ascendido a campeón indiscutido',
    champion: 'Ascendido a campeón',
    awarded: 'Título otorgado',
    defeated: 'Venció a ',
    interimChampion: 'el campeón interino',
    forInterim: 'por el título interino',
    forUndisputed: 'por el título indiscutido',
  },
}

function translateWonHow(wonHow: string | null | undefined, language: string | boolean): string | null {
  if (!wonHow) return null
  const lang = uiLang(language)
  if (lang === 'en') return wonHow
  const words = WON_HOW[lang]
  let text = wonHow.trim()
  if (/^promoted to undisputed champion$/i.test(text)) return words.undisputed
  if (/^promoted to champion$/i.test(text)) return words.champion
  if (/^awarded title$/i.test(text)) return words.awarded
  text = text.replace(/^def\.\s*/i, words.defeated)
  text = text.replace(/\binterim champion\b/i, words.interimChampion)
  text = text.replace(/\bfor interim title\b/i, words.forInterim)
  text = text.replace(/\bfor undisputed title\b/i, words.forUndisputed)
  return text
}

function DivisionHistory({ division, reigns }: { division: string; reigns: TitleReign[] }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const openProfile = useContext(OpenProfileContext)
  const history = useMemo(
    () => reigns.filter((reign) => reign.division === division).sort((a, b) => (b.date_won ?? '').localeCompare(a.date_won ?? '')),
    [reigns, division],
  )
  if (!history.length) return null

  const panelId = `history-${division.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const holders = new Set(history.map((reign) => reign.champion)).size
  const divisionLabel = getDivisionName(division, i18n.language)

  return (
    <div className="mt-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${divisionLabel} ${L(i18n.language, 'histórico de campeões', 'title history', 'historique des titres', 'historial de campeones')}`}
        onClick={() => setOpen((value) => !value)}
        className="ghost-action inline-flex w-full cursor-pointer items-center justify-between gap-2 px-3 text-left !text-[15px]"
      >
        <span>
          {L(i18n.language, 'Histórico de campeões', 'Title history', 'Historique des titres', 'Historial de campeones')}
          <span className="block text-sm font-semibold opacity-80">
            {history.length} {history.length === 1 ? L(i18n.language, 'reinado', 'reign', 'règne', 'reinado') : L(i18n.language, 'reinados', 'reigns', 'règnes', 'reinados')} · {holders} {holders === 1 ? L(i18n.language, 'campeão', 'champion', 'champion', 'campeón') : L(i18n.language, 'campeões', 'champions', 'champions', 'campeones')}
          </span>
        </span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <section id={panelId} aria-label={L(i18n.language, `${divisionLabel}: todos os campeões`, `${divisionLabel}: every champion`, `${divisionLabel} : tous les champions`, `${divisionLabel}: todos los campeones`)} className="fade-up mt-2 min-w-0 border-t-[3px] border-[var(--ink)]">
          <ol>
            {history.map((reign) => (
              <ReignRow key={`${reign.date_won}-${reign.champion}-${reign.title_type}`} reign={reign} onOpen={openProfile} />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}

function ReignRow({ reign, onOpen }: { reign: TitleReign; onOpen: (name: string) => void }) {
  const { i18n } = useTranslation()
  const date = formatFightDate(reign.date_won, i18n.language)
  const interim = reign.title_type === 'interim'
  const held = reign.days_held != null ? `${reign.days_held.toLocaleString(localeTag(i18n.language))} ${L(i18n.language, 'dias', 'days', 'jours', 'días')}` : null
  const defenses = `${reign.defenses_count} ${reign.defenses_count === 1 ? L(i18n.language, 'defesa', 'defense', 'défense', 'defensa') : L(i18n.language, 'defesas', 'defenses', 'défenses', 'defensas')}`
  const ended = reign.is_current ? L(i18n.language, 'Campeão atual', 'Current champion', 'Champion actuel', 'Campeón actual') : endReasonLabel(reign.end_reason, i18n.language)

  return (
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2.5 border-l-2 border-[var(--rule)] py-1.5 pl-2.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-3.5">
      <div className="pt-0.5">
        <p className="type-display text-lg leading-none text-[var(--text-main)] sm:text-xl">{reign.date_won?.slice(0, 4) ?? '—'}</p>
        <p className="theme-muted mt-0.5 text-label font-semibold leading-tight">{date?.replace(/,\s*\d{4}$/, '')}</p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={() => onOpen(reign.champion)}
            className="min-w-0 break-words text-left text-sm font-bold text-[var(--text-main)] underline-offset-2 hover:underline"
          >
            {reign.champion}
          </button>
          {reign.is_current ? (
            <span className="bg-[var(--gold-fill)] px-1.5 py-0.5 text-label font-bold text-[#10151d]">
              {L(i18n.language, 'Atual', 'Current', 'Actuel', 'Actual')}
            </span>
          ) : null}
          {interim ? (
            <span className="border border-[var(--rule)] px-1.5 py-0.5 text-label font-bold text-[var(--text-main)]">
              {L(i18n.language, 'Interino', 'Interim', 'Intérimaire', 'Interino')}
            </span>
          ) : null}
          {reign.fighter_reign_index > 1 ? (
            <span className="theme-muted text-label font-bold">
              {ordinal(reign.fighter_reign_index, i18n.language)} {L(i18n.language, 'reinado', 'reign', 'règne', 'reinado')}
            </span>
          ) : null}
        </div>
        <p className="theme-muted mt-0.5 text-label leading-4">
          {[translateWonHow(reign.won_how, i18n.language), reign.event].filter(Boolean).join(' · ') || L(i18n.language, 'Conquista do cinturão', 'Title win', 'Conquête du titre', 'Conquista del título')}
        </p>
        <p className="theme-muted text-label leading-4">
          {[held, defenses, ended].filter(Boolean).join(' · ')}
        </p>
      </div>
    </li>
  )
}

function GreatestChampionsSection({ champions }: { champions: ChampionSummary[] }) {
  const { t, i18n } = useTranslation()
  const openProfile = useContext(OpenProfileContext)
  const { fighters } = useFighters()
  const { imageByName } = useFighterImages()
  const profileByName = useMemo(() => new Map(fighters.map((fighter) => [normalizeFighterName(fighter.name), fighter])), [fighters])

  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <Shield className="h-4 w-4 text-[var(--ink)]" />
        <h2 className="broadcast-label text-xs text-[var(--text-main)]">{t('champions.greatest')}</h2>
        <span className="theme-muted text-xs">
          {L(i18n.language, 'por tempo total como campeão', 'by total time as champion', 'par temps total en tant que champion', 'por tiempo total como campeón')}
        </span>
      </div>

      <div className="grid gap-1.5 lg:grid-cols-2 lg:gap-2.5">
        {champions.map((champion, index) => (
          <CompactChampionCard
            key={champion.champion}
            name={champion.champion}
            imageUrl={getFighterImageUrl(champion.champion, imageByName, profileByName.get(normalizeFighterName(champion.champion))?.image_url)}
            badge={<RankBadge rank={index + 1} goat={index === 0} />}
            subtitle={champion.divisions.map((div) => getDivisionName(div, i18n.language)).join(' · ')}
            current={champion.is_current_champion}
            stats={[
              { label: L(i18n.language, 'Dias', 'Days', 'Jours', 'Días'), value: champion.total_days_as_champion.toLocaleString(localeTag(i18n.language)) },
              { label: L(i18n.language, 'Defesas', 'Defenses', 'Défenses', 'Defensas'), value: String(champion.total_defenses) },
              { label: L(i18n.language, 'Reinados', 'Reigns', 'Règnes', 'Reinados'), value: String(champion.total_reigns) },
            ]}
            onClick={() => openProfile(champion.champion)}
            ariaLabel={L(i18n.language, `${champion.champion}, ver perfil`, `${champion.champion}, view profile`, `${champion.champion}, voir le profil`, `${champion.champion}, ver perfil`)}
          />
        ))}
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[48px] text-right">
      <p className="data-value text-sm sm:text-base font-bold text-[var(--text-main)] leading-none">{value}</p>
      <p className="broadcast-label text-label text-[var(--text-muted)] mt-0.5 whitespace-nowrap">{label}</p>
    </div>
  )
}

const RECORD_LABELS_PT: Record<string, string> = {
  most_defenses_single_reign: 'Mais defesas em um único reinado',
  longest_reign: 'Reinado mais longo',
  most_cumulative_defenses: 'Mais defesas de cinturão na carreira',
  most_title_reigns: 'Mais vezes campeão',
  multi_division_champions: 'Campeões em mais de uma categoria',
  shortest_reign: 'Reinado mais curto',
  most_times_stripped: 'Mais títulos perdidos fora do octógono (destituído)',
  most_title_losses: 'Mais derrotas em disputas de cinturão',
}

const RECORD_UNITS_PT: Record<string, string> = {
  defenses: 'defesas',
  days: 'dias',
  reigns: 'reinados',
  divisions: 'categorias',
  times: 'vezes',
}

const RECORD_LABELS_FR: Record<string, string> = {
  most_defenses_single_reign: 'Plus de défenses sur un seul règne',
  longest_reign: 'Règne le plus long',
  most_cumulative_defenses: 'Plus de défenses de titre en carrière',
  most_title_reigns: 'Plus de règnes',
  multi_division_champions: 'Champions dans plusieurs catégories',
  shortest_reign: 'Règne le plus court',
  most_times_stripped: 'Plus de titres retirés hors de l’octogone',
  most_title_losses: 'Plus de défaites en combat de titre',
}

const RECORD_UNITS_FR: Record<string, string> = {
  defenses: 'défenses',
  days: 'jours',
  reigns: 'règnes',
  divisions: 'catégories',
  times: 'fois',
}

const RECORD_LABELS_ES: Record<string, string> = {
  most_defenses_single_reign: 'Más defensas en un solo reinado',
  longest_reign: 'Reinado más largo',
  most_cumulative_defenses: 'Más defensas del título en la carrera',
  most_title_reigns: 'Más reinados como campeón',
  multi_division_champions: 'Campeones en más de una división',
  shortest_reign: 'Reinado más corto',
  most_times_stripped: 'Más títulos retirados fuera del octágono',
  most_title_losses: 'Más derrotas en peleas por el título',
}

const RECORD_UNITS_ES: Record<string, string> = {
  defenses: 'defensas',
  days: 'días',
  reigns: 'reinados',
  divisions: 'divisiones',
  times: 'veces',
}

function getRecordCategoryLabel(category: RecordCategory, language: string | boolean): string {
  const lang = uiLang(language)
  if (lang === 'pt') return RECORD_LABELS_PT[category.key] ?? category.label
  if (lang === 'fr') return RECORD_LABELS_FR[category.key] ?? category.label
  if (lang === 'es') return RECORD_LABELS_ES[category.key] ?? category.label
  return category.label
}

function getRecordUnit(unit: string, language: string | boolean): string {
  const lang = uiLang(language)
  if (lang === 'pt') return RECORD_UNITS_PT[unit] ?? unit
  if (lang === 'fr') return RECORD_UNITS_FR[unit] ?? unit
  if (lang === 'es') return RECORD_UNITS_ES[unit] ?? unit
  return unit
}

function RecordCard({ category }: { category: RecordCategory }) {
  const { i18n } = useTranslation()
  const Icon = category.kind === 'positive' ? Flame : ThumbsDown
  const [open, setOpen] = useState(false)
  const panelId = `record-${category.key}`
  const label = getRecordCategoryLabel(category, i18n.language)

  return (
    <section className="surface-card overflow-hidden rounded-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition duration-150 hover:bg-[var(--bg-surface-subtle)] sm:px-4"
      >
        <Icon className={`h-4 w-4 shrink-0 ${category.kind === 'positive' ? 'text-[var(--ink)]' : 'text-[var(--text-muted)]'}`} />
        <h3 className="broadcast-label text-xs text-[var(--text-main)]">{label}</h3>
        <span className="theme-muted text-xs">({category.entries.length})</span>
        <ChevronDown className={`theme-muted ml-auto h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div id={panelId} className="border-t border-[var(--line-soft)] px-3 py-3 sm:px-4">
          {category.entries.length ? (
            <div className="lg:columns-2 lg:gap-x-8">
              {category.entries.map((entry) => (
                <div key={`${entry.rank}-${entry.champion}`} className="break-inside-avoid">
                  <RecordRow entry={entry} unit={getRecordUnit(category.unit, i18n.language)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">{L(i18n.language, 'Nenhum registro nesta categoria.', 'No entries in this category.', 'Aucune entrée dans cette catégorie.', 'No hay registros en esta categoría.')}</p>
          )}
        </div>
      ) : null}
    </section>
  )
}

function RecordRow({ entry, unit }: { entry: RecordCategory['entries'][number]; unit: string }) {
  const { i18n } = useTranslation()
  const openProfile = useContext(OpenProfileContext)
  const divisionLabel = entry.division ? getDivisionName(entry.division, i18n.language) : null
  const formattedValue = typeof entry.value === 'number' ? entry.value.toLocaleString(localeTag(i18n.language)) : entry.value

  return (
    <button
      type="button"
      onClick={() => openProfile(entry.champion)}
      aria-label={L(i18n.language, `${entry.champion}, ${entry.rank}º lugar. Ver perfil`, `${entry.champion}, rank ${entry.rank}. View profile`, `${entry.champion}, rang ${entry.rank}. Voir le profil`, `${entry.champion}, puesto ${entry.rank}. Ver perfil`)}
      className="flex w-full cursor-pointer items-center text-left gap-2.5 rounded-sm px-2 py-1.5 transition-colors hover:bg-[var(--gold-fill)]/40 focus-visible:bg-[var(--gold-fill)]/40 focus-visible:outline-none"
    >
      <span className="type-num w-4 shrink-0 text-right text-label text-[var(--text-muted)]">{entry.rank}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-[var(--text-main)]">{entry.champion}</p>
        {divisionLabel ? <p className="theme-muted truncate text-label leading-tight">{divisionLabel}</p> : null}
      </div>
      <span className="data-value shrink-0 text-sm font-bold text-[var(--text-main)]">
        {formattedValue} <span className="theme-muted text-label font-normal">{unit}</span>
      </span>
    </button>
  )
}

function MultiDivisionSection({ category, current }: { category: RecordCategory; current: TitleReign[] }) {
  const { i18n } = useTranslation()
  const { fighters } = useFighters()
  const { imageByName } = useFighterImages()
  const profileByName = useMemo(() => new Map(fighters.map((fighter) => [normalizeFighterName(fighter.name), fighter])), [fighters])
  const [openName, setOpenName] = useState<string | null>(null)
  const label = getRecordCategoryLabel(category, i18n.language)

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1">
        <Layers className="h-4 w-4 text-[var(--ink)]" />
        <h2 className="broadcast-label text-xs text-[var(--text-main)]">{label}</h2>
        <span className="theme-muted text-xs">({category.entries.length})</span>
      </div>

      <div className="grid items-start gap-1.5 lg:grid-cols-2 lg:gap-2.5">
        {category.entries.map((entry) => {
          const profile = profileByName.get(normalizeFighterName(entry.champion))
          const divisions = (entry.division ?? '')
            .split(', ')
            .filter(Boolean)
            .map((div) => getDivisionName(div, i18n.language))
          const fights = entry.title_fights ?? []
          const isOpen = openName === entry.champion
          const holdsBelt = current.some((reign) => normalizeFighterName(reign.champion) === normalizeFighterName(entry.champion))
          const panelId = `title-fights-${entry.rank}`

          return (
            <div key={entry.champion} className="min-w-0">
              <CompactChampionCard
                name={entry.champion}
                imageUrl={getFighterImageUrl(entry.champion, imageByName, profile?.image_url)}
                badge={<RankBadge rank={entry.rank} />}
                subtitle={divisions.join(' · ')}
                current={holdsBelt}
                stats={[
                  { label: L(i18n.language, 'Disputas', 'Fights', 'Combats', 'Peleas'), value: String(fights.length) },
                  { label: L(i18n.language, 'Cinturões', 'Belts', 'Ceintures', 'Cinturones'), value: String(fights.filter((fight) => fight.role === 'won_title').length) },
                  { label: L(i18n.language, 'Defesas', 'Defenses', 'Défenses', 'Defensas'), value: String(fights.filter((fight) => fight.role === 'defense').length) },
                ]}
                onClick={() => setOpenName(isOpen ? null : entry.champion)}
                ariaLabel={L(
                  i18n.language,
                  `${entry.champion}, ${isOpen ? 'ocultar' : 'ver'} disputas de cinturão`,
                  `${entry.champion}, ${isOpen ? 'hide' : 'view'} title fights`,
                  `${entry.champion}, ${isOpen ? 'masquer' : 'voir'} les combats de titre`,
                  `${entry.champion}, ${isOpen ? 'ocultar' : 'ver'} peleas por el título`,
                )}
                expanded={isOpen}
                controls={panelId}
              />
              <div id={panelId}>{isOpen ? <ChampionTimeline entry={entry} /> : null}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const ROLE_STYLES: Record<TitleFight['role'], string> = {
  won_title: 'bg-[var(--gold-fill)] text-[#10151d]',
  defense: 'bg-[var(--ink)] text-[var(--on-ink)]',
  lost_title: 'border-[1.5px] border-[var(--ink)] text-[var(--ink)]',
  challenge: 'border border-[var(--rule)] text-[var(--text-main)]',
  other: 'border border-dashed border-[var(--rule)] text-[var(--text-main)]',
}

const RESULT_STYLES: Record<TitleFight['result'], { letter: string; className: string; name: string }> = {
  win: { letter: 'W', className: 'bg-[var(--ink)] text-[var(--on-ink)]', name: 'Win' },
  loss: { letter: 'L', className: 'border-[1.5px] border-[var(--ink)] text-[var(--ink)]', name: 'Loss' },
  draw: { letter: 'D', className: 'border-2 border-[var(--rule)] text-[var(--text-main)]', name: 'Draw' },
  no_contest: { letter: 'NC', className: 'border-2 border-[var(--rule)] text-[var(--text-main)]', name: 'No contest' },
}

const RESULT_STYLES_PT: Record<TitleFight['result'], { letter: string; className: string; name: string }> = {
  win: { letter: 'V', className: 'bg-[var(--ink)] text-[var(--on-ink)]', name: 'Vitória' },
  loss: { letter: 'D', className: 'border-[1.5px] border-[var(--ink)] text-[var(--ink)]', name: 'Derrota' },
  draw: { letter: 'E', className: 'border-2 border-[var(--rule)] text-[var(--text-main)]', name: 'Empate' },
  no_contest: { letter: 'SR', className: 'border-2 border-[var(--rule)] text-[var(--text-main)]', name: 'Sem resultado' },
}

const RESULT_STYLES_FR: Record<TitleFight['result'], { letter: string; className: string; name: string }> = {
  win: { letter: 'V', className: 'bg-[var(--ink)] text-[var(--on-ink)]', name: 'Victoire' },
  loss: { letter: 'D', className: 'border-[1.5px] border-[var(--ink)] text-[var(--ink)]', name: 'Défaite' },
  draw: { letter: 'N', className: 'border-2 border-[var(--rule)] text-[var(--text-main)]', name: 'Nul' },
  no_contest: { letter: 'NC', className: 'border-2 border-[var(--rule)] text-[var(--text-main)]', name: 'Sans décision' },
}

const RESULT_STYLES_ES: Record<TitleFight['result'], { letter: string; className: string; name: string }> = {
  win: { letter: 'V', className: 'bg-[var(--ink)] text-[var(--on-ink)]', name: 'Victoria' },
  loss: { letter: 'D', className: 'border-[1.5px] border-[var(--ink)] text-[var(--ink)]', name: 'Derrota' },
  draw: { letter: 'E', className: 'border-2 border-[var(--rule)] text-[var(--text-main)]', name: 'Empate' },
  no_contest: { letter: 'SR', className: 'border-2 border-[var(--rule)] text-[var(--text-main)]', name: 'Sin resultado' },
}

function resultStyle(result: TitleFight['result'], language: string | boolean) {
  const lang = uiLang(language)
  if (lang === 'pt') return RESULT_STYLES_PT[result]
  if (lang === 'fr') return RESULT_STYLES_FR[result]
  if (lang === 'es') return RESULT_STYLES_ES[result]
  return RESULT_STYLES[result]
}

/** The wording of a title fight's role ("Won title", "Title defense #3", ...) in each language. */
const FIGHT_ROLES: Record<Exclude<UiLang, 'en'>, {
  wonInterim: string
  won: string
  defense: (number: string) => string
  defended: string
  lost: string
  challengeLost: string
  titleFightWin: string
  draw: string
  noContest: string
}> = {
  pt: {
    wonInterim: 'Conquistou o Cinturão Interino',
    won: 'Conquistou o Cinturão',
    defense: (num) => `Defesa de Cinturão #${num}`,
    defended: 'Defesa de Cinturão',
    lost: 'Perdeu o Cinturão',
    challengeLost: 'Derrota em Disputa de Cinturão',
    titleFightWin: 'Vitória em Disputa de Cinturão',
    draw: 'Empate em Disputa de Cinturão',
    noContest: 'Sem Resultado em Disputa de Cinturão',
  },
  fr: {
    wonInterim: 'A remporté la ceinture intérimaire',
    won: 'A remporté la ceinture',
    defense: (num) => `Défense de titre n°${num}`,
    defended: 'Défense de titre',
    lost: 'A perdu la ceinture',
    challengeLost: 'Défaite en combat de titre',
    titleFightWin: 'Victoire en combat de titre',
    draw: 'Nul en combat de titre',
    noContest: 'Sans décision en combat de titre',
  },
  es: {
    wonInterim: 'Ganó el cinturón interino',
    won: 'Ganó el cinturón',
    defense: (num) => `Defensa del título n.º ${num}`,
    defended: 'Defensa del título',
    lost: 'Perdió el cinturón',
    challengeLost: 'Derrota en pelea por el título',
    titleFightWin: 'Victoria en pelea por el título',
    draw: 'Empate en pelea por el título',
    noContest: 'Sin resultado en pelea por el título',
  },
}

function translateFightRole(label: string, language: string | boolean): string {
  const lang = uiLang(language)
  if (lang === 'en') return label
  const words = FIGHT_ROLES[lang]
  const lower = label.toLowerCase().trim()
  if (lower === 'won interim title' || (lower.includes('interim') && lower.includes('won'))) return words.wonInterim
  if (lower === 'won title' || lower.includes('won undisputed') || (lower.includes('won') && !lower.includes('interim'))) return words.won
  if (lower.startsWith('title defense #')) return words.defense(label.replace(/^[^\d]+/, ''))
  if (lower.includes('defended') || lower.includes('title defense')) return words.defended
  if (lower === 'lost title' || lower.includes('lost title') || lower.includes('lost undisputed')) return words.lost
  if (lower.includes('title shot, lost') || lower.includes('challenged')) return words.challengeLost
  if (lower === 'title fight win') return words.titleFightWin
  if (lower.includes('draw')) return words.draw
  if (lower.includes('no contest')) return words.noContest
  return label
}

function translateMethod(method: string | null | undefined, language: string | boolean): string | null {
  if (!method) return null
  const lang = uiLang(language)
  if (lang === 'en') return method
  const words = METHOD_WORDS[lang]
  const m = method.trim()
  const lower = m.toLowerCase()
  if (lower.startsWith('ko') || lower.startsWith('tko') || lower.includes('ko/tko')) return lang === 'pt' ? 'Nocaute / TKO' : lang === 'es' ? 'Nocaut / TKO' : 'KO/TKO'
  if (lower.startsWith('sub')) {
    const detail = m.replace(/^submission\s*/i, '').trim().replace(/^\(/, '').replace(/\)$/, '').trim()
    return detail ? `${words.submission} (${translateTechnique(detail, language)})` : words.submission
  }
  if (lower.includes('unanimous') || /^u-dec$/i.test(m)) return words.unanimous
  if (lower.includes('split') || /^s-dec$/i.test(m)) return words.split
  if (lower.includes('majority') || /^m-dec$/i.test(m)) return words.majority
  if (lower.includes('decision') || /^dec$/i.test(m)) return words.decision
  if (lower.includes('disqualification') || /^dq$/i.test(m)) return words.disqualification
  if (lower.includes('no contest') || /^nc$/i.test(m)) return words.noContest
  return method
}

function ChampionTimeline({ entry }: { entry: RecordEntry }) {
  const { i18n } = useTranslation()
  const openProfile = useContext(OpenProfileContext)
  const fights = entry.title_fights ?? []
  const stats = [
    { label: L(i18n.language, 'Disputas de cinturão', 'Title fights', 'Combats de titre', 'Peleas por el título'), value: fights.length },
    { label: L(i18n.language, 'Cinturões conquistados', 'Belts won', 'Ceintures gagnées', 'Cinturones ganados'), value: fights.filter((fight) => fight.role === 'won_title').length },
    { label: L(i18n.language, 'Defesas', 'Defenses', 'Défenses', 'Defensas'), value: fights.filter((fight) => fight.role === 'defense').length },
    { label: L(i18n.language, 'Derrotas', 'Losses', 'Défaites', 'Derrotas'), value: fights.filter((fight) => fight.result === 'loss').length },
  ]

  return (
    <section aria-label={L(i18n.language, `${entry.champion}: todas as disputas de cinturão`, `${entry.champion}: every title fight`, `${entry.champion} : chaque combat de titre`, `${entry.champion}: todas las peleas por el título`)} className="fade-up mt-2 min-w-0 border-2 border-[var(--rule)] bg-[var(--surface-3)] p-3 sm:p-4">
      <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="metric-tile px-3 py-2">
            <dd className="type-display text-2xl leading-none text-[var(--text-main)]">{stat.value}</dd>
            <dt className="theme-muted mt-1 text-label font-bold">{stat.label}</dt>
          </div>
        ))}
      </dl>

      {fights.length ? (
        <ol className="mt-4">
          {fights.map((fight, index) => (
            <TitleFightRow key={`${fight.date}-${fight.opponent}`} fight={fight} previous={fights[index - 1]} />
          ))}
        </ol>
      ) : (
        <p className="theme-muted mt-4 text-sm">{L(i18n.language, 'Nenhuma disputa de cinturão encontrada no histórico.', 'No title fights found in the fight history.', 'Aucun combat de titre dans l’historique.', 'No se encontraron peleas por el título en el historial.')}</p>
      )}

      <button
        type="button"
        onClick={() => openProfile(entry.champion)}
        className="ghost-action mt-4 inline-flex w-full items-center justify-center px-4 py-2 text-xs font-bold text-[var(--text-main)] transition hover:!bg-[var(--gold-fill)] hover:text-[#10151d]"
      >
        {L(i18n.language, 'Ver perfil completo', 'View full profile', 'Voir le profil complet', 'Ver perfil completo')}
      </button>
    </section>
  )
}

function TitleFightRow({ fight, previous }: { fight: TitleFight; previous: TitleFight | undefined }) {
  const { i18n } = useTranslation()
  const date = formatFightDate(fight.date, i18n.language)
  const translatedMethod = translateMethod(fight.method, i18n.language)
  const outcome = [translatedMethod, fight.round ? `R${fight.round}` : null].filter(Boolean).join(' · ')
  const result = resultStyle(fight.result, i18n.language)
  const newDivision = fight.division && fight.division !== previous?.division
  const divisionLabel = fight.division ? getDivisionName(fight.division, i18n.language) : null

  return (
    <>
      {newDivision && divisionLabel ? (
        <li aria-hidden className="mb-1.5 mt-3 flex items-center gap-2 first:mt-0">
          <span className="broadcast-label shrink-0 text-label text-[var(--text-main)]">{divisionLabel}</span>
          <span className="h-0.5 flex-1 bg-[var(--rule)]" />
        </li>
      ) : null}
      <li className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2.5 border-l-2 border-[var(--rule)] py-1.5 pl-2.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-3.5">
        <div className="pt-0.5">
          <p className="type-display text-lg leading-none text-[var(--text-main)] sm:text-xl">{fight.date?.slice(0, 4) ?? '—'}</p>
          <p className="theme-muted mt-0.5 text-label font-semibold leading-tight">{date?.replace(/,\s*\d{4}$/, '')}</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-label font-bold ${ROLE_STYLES[fight.role]}`}>
              {fight.role === 'won_title' ? <ChampionBelt className="h-3 w-6" /> : null}
              {fight.role === 'defense' ? <Shield className="h-3 w-3" /> : null}
              {translateFightRole(fight.label, i18n.language)}
            </span>
            {fight.title_type === 'interim' && !/interim/i.test(fight.label) ? (
              <span className="border border-[var(--rule)] px-1.5 py-0.5 text-label font-bold text-[var(--text-main)]">
                {L(i18n.language, 'Interino', 'Interim', 'Intérimaire', 'Interino')}
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--text-main)]">
            <span className={`type-num grid h-5 min-w-5 shrink-0 place-items-center px-1 text-label leading-none ${result.className}`} title={result.name}>
              <span className="sr-only">{result.name}</span>
              <span aria-hidden>{result.letter}</span>
            </span>
            <span className="min-w-0 break-words">vs. {fight.opponent}</span>
          </p>
          <p className="theme-muted mt-0.5 text-label leading-4">{[outcome, fight.event].filter(Boolean).join(' · ')}</p>
        </div>
      </li>
    </>
  )
}
