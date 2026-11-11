import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Award, Crown, Flame, History, Layers, Shield, Swords, Trophy } from 'lucide-react'

import { L, localeTag } from '../../i18n/lang'
import { orgEs, orgFr, orgPt } from '../../shared/data/orgs'
import { ChampionBelt } from '../../shared/components/ChampionBelt'
import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { FlagIcon } from '../../shared/components/FlagIcon'
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton'
import { OrgFighterModal } from '../../shared/components/OrgFighterModal'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { divisionLimit, getDivisionName } from '../../shared/data/divisions'
import {
  buildDivisionReigns,
  buildGreatestOrgChampions,
  compactNameKey,
  type GreatestOrgChampion,
  type OrgTitleReign,
} from '../../shared/data/orgChampions'
import { compareDivisions, formatDate, formatMethod, formatRecord } from '../../shared/data/orgFormat'
import { useOrg } from '../../shared/hooks/useOrg'
import { useOrgEvents, useOrgRankings } from '../../shared/hooks/useOrgData'
import { useOrgFighterLookup } from '../../shared/hooks/useOrgFighterLookup'
import type { OrgFighter } from '../../shared/types/api'

type ViewKey = 'current' | 'history' | 'greatest'

export function OrgChampions() {
  const { i18n } = useTranslation()
  const org = useOrg()
  const past = useOrgEvents(org.id)
  const { rankings, loading: rankingsLoading } = useOrgRankings(org.id)
  const lookup = useOrgFighterLookup(org.id)

  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('view')
  const validViews: ViewKey[] = ['current', 'history', 'greatest']
  const view: ViewKey = validViews.includes(requested as ViewKey) ? (requested as ViewKey) : 'current'
  const chooseView = (next: ViewKey) => setSearchParams(next === 'current' ? {} : { view: next }, { replace: true })

  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [profileName, setProfileName] = useState<string | null>(null)

  const isArchived = Boolean(org.archived)

  const champions = useMemo(
    () =>
      rankings
        .filter((category) => !category.is_p4p)
        .map((category) => ({
          division: category.category,
          holders: category.entries.filter((entry) => entry.rank === 0),
        }))
        .sort((a, b) => compareDivisions(a.division, b.division)),
    [rankings],
  )

  const finalChampionByDivision = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const { division, holders } of champions) {
      const champ = holders.find((entry) => entry.status !== 'interim')?.fighter ?? null
      map.set(division, champ)
    }
    return map
  }, [champions])

  const reignsByDivision = useMemo(
    () => buildDivisionReigns(past.events, finalChampionByDivision),
    [past.events, finalChampionByDivision],
  )

  const greatestChampions = useMemo(
    () => buildGreatestOrgChampions(reignsByDivision, finalChampionByDivision),
    [reignsByDivision, finalChampionByDivision],
  )

  const allDivisions = useMemo(() => {
    const set = new Set<string>([
      ...champions.map((c) => c.division),
      ...Array.from(reignsByDivision.keys()),
    ])
    return Array.from(set).sort(compareDivisions)
  }, [champions, reignsByDivision])

  const activeDivision = useMemo(() => {
    if (selectedDivision && selectedDivision !== 'ALL' && allDivisions.includes(selectedDivision)) {
      return selectedDivision
    }
    return allDivisions[0] ?? ''
  }, [selectedDivision, allDivisions])

  const totalReignsCount = useMemo(() => {
    let total = 0
    for (const list of reignsByDivision.values()) total += list.length
    return total
  }, [reignsByDivision])

  const totalDefensesCount = useMemo(() => {
    let total = 0
    for (const list of reignsByDivision.values()) {
      for (const r of list) {
        total += r.defenses.filter((d) => d.outcome === 'win').length
      }
    }
    return total
  }, [reignsByDivision])

  const multiDivisionChampions = useMemo(
    () => greatestChampions.filter((c) => c.divisions.length > 1),
    [greatestChampions],
  )

  const views: { key: ViewKey; label: string; short: string }[] = [
    {
      key: 'current',
      label: isArchived
        ? L(i18n.language, 'Últimos campeões (2023)', 'Final champions (2023)', 'Derniers champions (2023)', 'Últimos campeones (2023)')
        : L(i18n.language, 'Campeões atuais', 'Current champions', 'Champions actuels', 'Campeones actuales'),
      short: isArchived
        ? L(i18n.language, 'Últimos (2023)', 'Final (2023)', 'Derniers', 'Últimos (2023)')
        : L(i18n.language, 'Atuais', 'Current', 'Actuels', 'Actuales'),
    },
    {
      key: 'history',
      label: L(i18n.language, 'Histórico por categoria', 'History by division', 'Historique par catégorie', 'Historial por división'),
      short: L(i18n.language, 'Por categoria', 'By division', 'Par catégorie', 'Por división'),
    },
    {
      key: 'greatest',
      label: L(i18n.language, 'Maiores campeões', 'Greatest champions', 'Plus grands champions', 'Mejores campeones'),
      short: L(i18n.language, 'Maiores', 'Greatest', 'Plus grands', 'Mejores'),
    },
  ]

  const isLoading = rankingsLoading || past.loading

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
              eyebrow={
                isArchived
                  ? L(i18n.language, `${org.shortName} • Galeria de cinturões (2009–2023)`, `${org.shortName} • Title gallery (2009–2023)`, `${org.shortName} • Galerie des titres (2009–2023)`, `${org.shortName} • Galería de cinturones (2009–2023)`)
                  : L(i18n.language, `${org.shortName} • Galeria de cinturões`, `${org.shortName} • Champions & lineage`, `${org.shortName} • Champions et lignée`, `${org.shortName} • Campeones y linaje`)
              }
              title={
                L(i18n.language, `Campeões ${orgPt(org, 'de')}`, `${org.shortName} champions`, `Champions ${orgFr(org, 'de')}`, `Campeones de ${orgEs(org)}`)
              }
              description={
                isArchived
                  ? L(
                      i18n.language,
                      'Últimos detentores de cinturão no encerramento do Bellator em 2023, histórico completo de reinados por categoria e os maiores campeões da história da organização.',
                      'The final belt holders when Bellator closed in 2023, complete title lineage across every weight class, and the greatest champions in Bellator history.',
                      'Les derniers détenteurs de ceinture fin 2023, la lignée complète par catégorie et les plus grands champions de l’histoire du Bellator.',
                      'Los últimos poseedores de cinturón cuando Bellator cerró en 2023, el linaje completo de títulos en todas las divisiones y los mejores campeones de la historia de Bellator.',
                    )
                  : L(
                      i18n.language,
                      'Detentores atuais de cinturão da PFL, linhagem histórica de todas as disputas de título e os atletas mais vitoriosos em lutas de campeonato.',
                      'Current PFL belt holders, complete championship lineage by weight class, and the most decorated title-fight winners in league history.',
                      'Détenteurs actuels de ceinture de la PFL, lignée historique par catégorie et les combattants les plus titrés.',
                      'Los poseedores actuales de cinturón de la PFL, el linaje completo de campeonatos por división y los ganadores de más peleas por el título en la historia de la liga.',
                    )
              }
              stats={[
                {
                  label: L(i18n.language, 'Divisões', 'Divisions', 'Catégories', 'Divisiones'),
                  value: allDivisions.length.toLocaleString(localeTag(i18n.language)),
                  note: isArchived ? '2009–2023' : L(i18n.language, 'categorias', 'weight classes', 'catégories', 'divisiones'),
                },
                {
                  label: L(i18n.language, 'Reinados', 'Title reigns', 'Règnes', 'Reinados'),
                  value: totalReignsCount.toLocaleString(localeTag(i18n.language)),
                  note: L(i18n.language, 'conquistas', 'belts won', 'titres gagnés', 'cinturones ganados'),
                },
                {
                  label: L(i18n.language, 'Campeões', 'Champions', 'Champions', 'Campeones'),
                  value: greatestChampions.length.toLocaleString(localeTag(i18n.language)),
                  note: L(i18n.language, 'atletas distintos', 'unique fighters', 'combattants', 'peleadores distintos'),
                },
                {
                  label: L(i18n.language, 'Defesas', 'Defenses', 'Défenses', 'Defensas'),
                  value: totalDefensesCount.toLocaleString(localeTag(i18n.language)),
                  note: L(i18n.language, 'bem-sucedidas', 'successful', 'réussies', 'exitosas'),
                },
              ]}
      >
            <div
              role="tablist"
              aria-label={L(i18n.language, 'Escolha a visualização de campeões', 'Choose champions view', 'Choisir la vue des champions', 'Elige la vista de campeones')}
              className="chip-scroll inline-flex max-w-full overflow-x-auto rounded-control border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5"
            >
              {views.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  id={`org-champions-tab-${item.key}`}
                  aria-label={item.label}
                  aria-selected={view === item.key}
                  aria-controls="org-champions-panel"
                  onClick={() => chooseView(item.key)}
                  className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-colors ${
                    view === item.key
                      ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
      </PageHeader>

      {isLoading ? (
        <section className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[160px]" />
          ))}
        </section>
      ) : (
        <div
          id="org-champions-panel"
          role="tabpanel"
          aria-labelledby={`org-champions-tab-${view}`}
          className="space-y-6"
        >
          {allDivisions.length > 1 && (view === 'current' || view === 'history') ? (
            <div
              role="group"
              aria-label={L(i18n.language, 'Selecionar categoria', 'Select division', 'Sélectionner une catégorie', 'Seleccionar división')}
              className="chip-scroll flex w-full max-w-full items-center gap-2 overflow-x-auto pb-1"
            >
              {allDivisions.map((div) => {
                const count = reignsByDivision.get(div)?.length ?? 0
                const isSelected = activeDivision === div
                return (
                  <button
                    key={div}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDivision(div)}
                    className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-control border px-3 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-surface)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {getDivisionName(div, i18n.language)} {count > 0 ? `(${count})` : ''}
                  </button>
                )
              })}
            </div>
          ) : null}

          {view === 'current' ? (
            activeDivision ? (
              <div className="w-full">
                <CurrentChampionDivisionCard
                  key={activeDivision}
                  division={activeDivision}
                  holders={champions.find((c) => c.division === activeDivision)?.holders ?? []}
                  reigns={reignsByDivision.get(activeDivision) ?? []}
                  lookup={lookup}
                  isArchived={isArchived}
                  onOpenFighter={setProfileName}
                />
              </div>
            ) : (
              <p className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                {L(i18n.language, 'Nenhum campeão cadastrado.', 'No champions available.', 'Aucun champion disponible.', 'No hay campeones disponibles.')}
              </p>
            )
          ) : null}

          {view === 'history' ? (
            <div className="space-y-4">
              {activeDivision ? (
                <div className="w-full">
                  <DivisionHistoryCard
                    key={activeDivision}
                    division={activeDivision}
                    reigns={reignsByDivision.get(activeDivision) ?? []}
                    finalChampion={finalChampionByDivision.get(activeDivision) ?? null}
                    isArchived={isArchived}
                    lookup={lookup}
                    onOpenFighter={setProfileName}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {view === 'greatest' ? (
            <GreatestChampionsView
              greatest={greatestChampions}
              multiDivision={multiDivisionChampions}
              isArchived={isArchived}
              lookup={lookup}
              onOpenFighter={setProfileName}
            />
          ) : null}
        </div>
      )}

      {profileName ? (
        <OrgFighterModal
          key={profileName}
          org={org}
          name={profileName}
          onClose={() => setProfileName(null)}
          onSelectFighter={setProfileName}
        />
      ) : null}
    </div>
  )
}

function CurrentChampionDivisionCard({
  division,
  holders,
  reigns,
  lookup,
  isArchived,
  onOpenFighter,
}: {
  division: string
  holders: { fighter: string; status: string | null }[]
  reigns: OrgTitleReign[]
  lookup: (name: string) => OrgFighter | undefined
  isArchived: boolean
  onOpenFighter: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const championEntry = holders.find((entry) => entry.status !== 'interim') ?? null
  const interimEntry = holders.find((entry) => entry.status === 'interim') ?? null
  const championName = championEntry?.fighter ?? null
  const profile = championName ? lookup(championName) : undefined
  const record = profile ? formatRecord(profile) : null
  const limit = divisionLimit(division)

  // Find the active/final reign for this champion
  const activeReign = useMemo(() => {
    if (!championName) return null
    return [...reigns].reverse().find((r) => !r.interim && compactNameKey(r.champion) === compactNameKey(championName)) ?? null
  }, [reigns, championName])

  const defensesCount = activeReign ? activeReign.defenses.filter((d) => d.outcome === 'win').length : 0

  return (
    <article className="surface-card w-full overflow-hidden !rounded-card p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {/* Left Side: Champion Identity & Details */}
        <div className="flex flex-col justify-between">
          <div>
            {/* Division Header + Gold Belt */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="broadcast-label text-sm font-black uppercase tracking-[0.12em] text-[var(--text-main)]">
                    {getDivisionName(division, i18n.language)}
                  </span>
                  {limit ? <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">({limit})</span> : null}
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {isArchived
                    ? L(i18n.language, 'Último detentor linear (encerramento 2023)', 'Final title holder (2023 closure)', 'Dernier détenteur (fin 2023)', 'Último poseedor del título (cierre de 2023)')
                    : L(i18n.language, 'Campeão mundial da divisão', 'Divisional world champion', 'Champion du monde de la catégorie', 'Campeón mundial de la división')}
                </p>
              </div>
              <ChampionBelt className="h-8 w-auto shrink-0" />
            </div>

            {/* Champion Identity */}
            {championName ? (
              <div className="mt-4 flex items-start gap-4">
                <FighterAvatar
                  name={championName}
                  imageUrl={profile?.image_url ?? null}
                  highlight
                  className="h-24 w-20 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 border border-transparent bg-[#F2C230] px-2 py-0.5 text-label font-black uppercase tracking-[0.08em] text-[#0E0E0E]">
                      <Crown className="h-3 w-3" aria-hidden="true" />
                      {isArchived
                        ? L(i18n.language, 'Último campeão', 'Final champion', 'Dernier champion', 'Último campeón')
                        : L(i18n.language, 'Campeão atual', 'Current champion', 'Champion actuel', 'Campeón actual')}
                    </span>
                    {record ? (
                      <span className="border border-[var(--line-soft)] bg-[var(--surface-3)] px-2 py-0.5 font-mono text-label font-bold text-[var(--text-main)]">
                        {record}
                      </span>
                    ) : null}
                    {defensesCount > 0 ? (
                      <span className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface-3)] px-2 py-0.5 font-mono text-label font-bold text-[var(--text-main)]">
                        <Shield className="h-3 w-3 text-[var(--accent-red)]" aria-hidden="true" />
                        {defensesCount} {defensesCount === 1 ? L(i18n.language, 'defesa', 'defense', 'défense', 'defensa') : L(i18n.language, 'defesas', 'defenses', 'défenses', 'defensas')}
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenFighter(championName)}
                    className="mt-2 flex max-w-full items-center gap-2 text-left text-2xl font-black uppercase tracking-tight text-[var(--text-main)] hover:underline"
                  >
                    {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
                    <span className="truncate">{championName}</span>
                  </button>

                  {profile?.nickname ? (
                    <p className="text-xs italic text-[var(--text-muted)]">“{profile.nickname}”</p>
                  ) : null}

                  {activeReign ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-main)]">
                        {L(i18n.language, 'Conquistou contra', 'Won belt vs.', 'Conquis contre', 'Ganó el cinturón ante')} {activeReign.opponent}
                      </span>
                      {activeReign.date ? ` · ${formatDate(activeReign.date, true, i18n.language)}` : ''}
                      {activeReign.eventName ? ` (${activeReign.eventName})` : ''}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--line-soft)] bg-[var(--surface-3)] px-4 py-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {isArchived
                    ? L(i18n.language, 'Cinturão desativado / vago', 'Title deactivated / vacant', 'Titre désactivé / vacant', 'Título desactivado / vacante')
                    : L(i18n.language, 'Cinturão vago', 'Vacant title', 'Ceinture vacante', 'Título vacante')}
                </p>
              </div>
            )}

            {/* Interim Champion Banner if present */}
            {interimEntry?.fighter ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-3)] px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {L(i18n.language, 'Campeão interino', 'Interim champion', 'Champion intérimaire', 'Campeón interino')}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenFighter(interimEntry.fighter)}
                  className="text-xs font-extrabold text-[var(--text-main)] underline decoration-2 underline-offset-2 hover:text-[#F2C230]"
                >
                  {interimEntry.fighter}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Side: Quick History Lineage of this category to fill the screen */}
        {reigns.length > 0 ? (
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-main)]">
                <History className="h-3.5 w-3.5 text-[var(--accent-red)]" aria-hidden="true" />
                {L(
                  i18n.language,
                  `Linhagem da categoria (${reigns.length} ${reigns.length === 1 ? 'reinado' : 'reinados'})`,
                  `Division lineage (${reigns.length} ${reigns.length === 1 ? 'reign' : 'reigns'})`,
                  `Lignée (${reigns.length} ${reigns.length === 1 ? 'règne' : 'règnes'})`,
                  `Linaje de la división (${reigns.length} ${reigns.length === 1 ? 'reinado' : 'reinados'})`,
                )}
              </span>
              <span className="font-mono text-label text-[var(--text-muted)]">
                {reigns[0]?.date?.slice(0, 4)}–{reigns[reigns.length - 1]?.date?.slice(0, 4) ?? '2023'}
              </span>
            </div>

            <ol className="mt-2 divide-y divide-[var(--line-soft)] max-h-[220px] overflow-y-auto chip-scroll pr-1">
              {[...reigns].reverse().map((r, index) => {
                const winDefs = r.defenses.filter((d) => d.outcome === 'win').length
                return (
                  <li key={`${r.date}-${r.champion}-${index}`} className="flex items-center justify-between gap-2 py-2 text-xs">
                    <div className="min-w-0">
                      <span className="mr-2 font-mono font-bold text-[var(--text-muted)]">
                        {r.interim ? 'INT' : `#${r.reignOrder}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenFighter(r.champion)}
                        className="font-bold text-[var(--text-main)] hover:underline"
                      >
                        {r.champion}
                      </button>
                      <span className="text-[var(--text-muted)]">
                        {' '}
                        · {L(i18n.language, 'venceu', 'def.', 'bat', 'venció a')} {r.opponent} ({r.date?.slice(0, 4) ?? '—'})
                      </span>
                    </div>
                    {winDefs > 0 ? (
                      <span className="shrink-0 font-mono text-label font-bold text-[var(--text-main)]">
                        {winDefs} {winDefs === 1 ? 'def.' : 'defs.'}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function DivisionHistoryCard({
  division,
  reigns,
  finalChampion,
  isArchived = false,
  lookup,
  onOpenFighter,
}: {
  division: string
  reigns: OrgTitleReign[]
  finalChampion: string | null
  isArchived?: boolean
  lookup: (name: string) => OrgFighter | undefined
  onOpenFighter: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const divisionLabel = getDivisionName(division, i18n.language)
  const limit = divisionLimit(division)
  const uniqueChamps = useMemo(() => new Set(reigns.map((r) => compactNameKey(r.champion))).size, [reigns])
  const firstYear = reigns[0]?.date?.slice(0, 4)
  const lastYear = reigns[reigns.length - 1]?.date?.slice(0, 4)

  return (
    <article className="surface-card flex flex-col overflow-hidden !rounded-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] bg-[var(--surface-3)] px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold uppercase tracking-[0.03em] text-[var(--text-main)]">{divisionLabel}</h3>
            {limit ? <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">({limit})</span> : null}
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {reigns.length} {reigns.length === 1 ? L(i18n.language, 'reinado', 'reign', 'règne', 'reinado') : L(i18n.language, 'reinados', 'reigns', 'règnes', 'reinados')}
            {' · '}
            {uniqueChamps} {uniqueChamps === 1 ? L(i18n.language, 'campeão', 'champion', 'champion', 'campeón') : L(i18n.language, 'campeões', 'champions', 'champions', 'campeones')}
            {firstYear && lastYear ? ` · ${firstYear === lastYear ? firstYear : `${firstYear}–${isArchived ? '2023' : lastYear}`}` : ''}
          </p>
        </div>

        {finalChampion ? (
          <button
            type="button"
            onClick={() => onOpenFighter(finalChampion)}
            className="inline-flex items-center gap-1.5 border-2 border-[var(--rule)] bg-[#F2C230] px-2.5 py-1 text-label font-bold uppercase tracking-[0.08em] text-[#0E0E0E] transition hover:brightness-95"
          >
            <Crown className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>
              {isArchived ? L(i18n.language, 'Último:', 'Final:', 'Dernier :', 'Último:') : L(i18n.language, 'Atual:', 'Current:', 'Actuel :', 'Actual:')}{' '}
              {finalChampion}
            </span>
          </button>
        ) : (
          <span className="border border-[var(--line-soft)] bg-[var(--card-bg)] px-2.5 py-1 text-label font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {isArchived
              ? L(i18n.language, 'Título desativado', 'Title deactivated', 'Titre désactivé', 'Título desactivado')
              : L(i18n.language, 'Cinturão vago', 'Vacant', 'Vacant', 'Vacante')}
          </span>
        )}
      </header>

      {reigns.length ? (
        <ol className="divide-y divide-[var(--line-soft)] px-4 py-2">
          {reigns.map((reign, idx) => {
            const profile = lookup(reign.champion)
            const year = reign.date?.slice(0, 4) ?? '—'
            const defCount = reign.defenses.filter((d) => d.outcome === 'win').length
            const ncCount = reign.defenses.filter((d) => d.outcome === 'draw_nc').length
            const methodText = formatMethod(reign.method, null, i18n.language)

            return (
              <li
                key={`${reign.date}-${reign.champion}-${idx}`}
                className="grid grid-cols-[2.25rem_auto_minmax(0,1fr)] items-start gap-2.5 py-2.5 sm:grid-cols-[2.5rem_auto_minmax(0,1fr)_auto]"
              >
                <div className="pt-0.5 text-center">
                  <span
                    className={`inline-flex min-w-[2rem] items-center justify-center border border-[var(--rule)] px-1 py-0.5 font-mono text-label font-bold uppercase leading-none ${
                      reign.isFinal
                        ? 'bg-[#F2C230] text-[#0E0E0E]'
                        : reign.interim
                          ? 'bg-[#1F4E9C] text-white'
                          : 'bg-[var(--surface-3)] text-[var(--text-main)]'
                    }`}
                  >
                    {reign.interim ? 'INT' : `#${reign.reignOrder}`}
                  </span>
                  <p className="mt-1 font-mono text-label font-bold text-[var(--text-muted)]">{year}</p>
                </div>

                <FighterAvatar
                  name={reign.champion}
                  imageUrl={profile?.image_url ?? null}
                  highlight={reign.isFinal}
                  className="h-11 w-10 shrink-0"
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
                    <button
                      type="button"
                      onClick={() => onOpenFighter(reign.champion)}
                      className="truncate text-left text-sm font-bold text-[var(--text-main)] hover:underline"
                    >
                      {reign.champion}
                    </button>
                    {reign.fighterReignIndex > 1 && !reign.interim ? (
                      <span className="border border-[var(--line-soft)] bg-[var(--surface-3)] px-1.5 py-px font-mono text-label font-bold uppercase text-[var(--text-main)]">
                        {reign.fighterReignIndex}x
                      </span>
                    ) : null}
                    {reign.interim ? (
                      <span className="border border-[var(--rule)] bg-[#1F4E9C] px-1.5 py-px text-label font-bold uppercase text-white">
                        {L(i18n.language, 'Interino', 'Interim', 'Intérimaire', 'Interino')}
                      </span>
                    ) : null}
                    {reign.isFinal ? (
                      <span className="border border-[var(--rule)] bg-[#F2C230] px-1.5 py-px text-label font-bold uppercase text-[#0E0E0E]">
                        {isArchived
                          ? L(i18n.language, 'Último campeão', 'Final champion', 'Dernier champion', 'Último campeón')
                          : L(i18n.language, 'Campeão atual', 'Current champion', 'Champion actuel', 'Campeón actual')}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-main)]">
                      {L(i18n.language, 'Venceu', 'def.', 'bat', 'Venció a')} {reign.opponent}
                    </span>
                    {methodText ? ` · ${methodText}${reign.round ? ` (R${reign.round})` : ''}` : ''}
                    {reign.date ? ` · ${formatDate(reign.date, true, i18n.language)}` : ''}
                    {reign.eventName ? ` · ${reign.eventName}` : ''}
                  </p>

                  {reign.defenses.length > 0 ? (
                    <p className="mt-0.5 text-label leading-4 text-[var(--text-muted)]">
                      <Shield className="mr-1 inline h-3 w-3 text-[var(--accent-red)]" aria-hidden="true" />
                      <span className="font-semibold text-[var(--text-main)]">
                        {defCount} {defCount === 1 ? L(i18n.language, 'defesa', 'defense', 'défense', 'defensa') : L(i18n.language, 'defesas', 'defenses', 'défenses', 'defensas')}
                        {ncCount > 0 ? ` (+${ncCount} NC/Empate)` : ''}:
                      </span>{' '}
                      {reign.defenses.map((d) => `${d.opponent}${d.outcome === 'draw_nc' ? ' (NC/Draw)' : ''}`).join(', ')}
                    </p>
                  ) : null}
                </div>

                <div className="hidden text-right sm:block">
                  <span className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface-3)] px-2 py-0.5 font-mono text-label font-bold text-[var(--text-main)]">
                    <Swords className="h-3 w-3 text-[var(--accent-red)]" aria-hidden="true" />
                    {defCount} {defCount === 1 ? L(i18n.language, 'def.', 'def.', 'déf.', 'venc.') : L(i18n.language, 'defs.', 'defs.', 'défs.', 'def.')}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="px-4 py-4 text-xs text-[var(--text-muted)]">
          <History className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
          {L(i18n.language, 'Sem reinados registrados nesta categoria.', 'No title reigns recorded for this division.', 'Aucun règne enregistré dans cette catégorie.', 'No hay reinados registrados en esta división.')}
        </p>
      )}
    </article>
  )
}

function GreatestChampionsView({
  greatest,
  multiDivision,
  isArchived,
  lookup,
  onOpenFighter,
}: {
  greatest: GreatestOrgChampion[]
  multiDivision: GreatestOrgChampion[]
  isArchived: boolean
  lookup: (name: string) => OrgFighter | undefined
  onOpenFighter: (name: string) => void
}) {
  const { i18n } = useTranslation()

  const mostTitleWins = greatest[0] ?? null
  const mostDefenses = useMemo(
    () => [...greatest].sort((a, b) => b.defensesCount - a.defensesCount || b.titleWinsCount - a.titleWinsCount)[0] ?? null,
    [greatest],
  )

  return (
    <div className="space-y-5">
      {/* Record Highlights Row */}
      <div className="grid gap-3 md:grid-cols-3">
        {mostTitleWins ? (
          <div className="surface-card !rounded-card border-l-4 border-l-[#F2C230] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <Trophy className="h-4 w-4 text-[#F2C230]" aria-hidden="true" />
              {L(i18n.language, 'Mais vitórias em disputas de cinturão', 'Most title-fight wins', 'Plus de victoires en combat de titre', 'Más victorias en peleas por el título')}
            </div>
            <button
              type="button"
              onClick={() => onOpenFighter(mostTitleWins.champion)}
              className="mt-2 block text-left text-xl font-extrabold uppercase text-[var(--text-main)] hover:underline"
            >
              {mostTitleWins.champion}
            </button>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              <span className="font-bold text-[var(--text-main)]">{mostTitleWins.titleWinsCount}</span>{' '}
              {L(i18n.language, 'vitórias em lutas de título', 'title fight wins', 'victoires en combat de titre', 'victorias en peleas por el título')} ({mostTitleWins.reignsCount}{' '}
              {mostTitleWins.reignsCount === 1 ? L(i18n.language, 'reinado', 'reign', 'règne', 'reinado') : L(i18n.language, 'reinados', 'reigns', 'règnes', 'reinados')},{' '}
              {mostTitleWins.defensesCount} {L(i18n.language, 'defesas', 'defenses', 'défenses', 'defensas')})
            </p>
          </div>
        ) : null}

        {mostDefenses ? (
          <div className="surface-card !rounded-card border-l-4 border-l-[var(--accent-red)] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <Flame className="h-4 w-4 text-[var(--accent-red)]" aria-hidden="true" />
              {L(i18n.language, 'Recordista de defesas de cinturão', 'Most title defenses', 'Record de défenses de titre', 'Más defensas del título')}
            </div>
            <button
              type="button"
              onClick={() => onOpenFighter(mostDefenses.champion)}
              className="mt-2 block text-left text-xl font-extrabold uppercase text-[var(--text-main)] hover:underline"
            >
              {mostDefenses.champion}
            </button>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              <span className="font-bold text-[var(--text-main)]">{mostDefenses.defensesCount}</span>{' '}
              {L(i18n.language, 'defesas bem-sucedidas de cinturão', 'successful title defenses', 'défenses de titre réussies', 'defensas del título exitosas')}
            </p>
          </div>
        ) : null}

        <div className="surface-card !rounded-card border-l-4 border-l-[#1F4E9C] p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            <Layers className="h-4 w-4 text-[#1F4E9C]" aria-hidden="true" />
            {L(i18n.language, 'Campeões em múltiplas categorias', 'Multi-division champions', 'Champions multi-catégories', 'Campeones en varias divisiones')}
          </div>
          {multiDivision.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {multiDivision.map((champ) => (
                <button
                  key={champ.champion}
                  type="button"
                  onClick={() => onOpenFighter(champ.champion)}
                  className="border border-[var(--rule)] bg-[var(--surface-3)] px-2.5 py-1 text-xs font-extrabold uppercase text-[var(--text-main)] hover:bg-[#F2C230] hover:text-[#0E0E0E]"
                >
                  {champ.champion} ({champ.divisions.map((d) => getDivisionName(d, i18n.language)).join(' & ')})
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {L(
                i18n.language,
                'Todos os campeões conquistaram seus títulos em uma única divisão.',
                'Every champion won their titles within a single weight class.',
                'Tous les champions ont remporté leurs titres dans une seule catégorie.',
                'Todos los campeones ganaron sus títulos dentro de una sola división.',
              )}
            </p>
          )}
        </div>
      </div>

      {/* Greatest Champions Leaderboard */}
      <section className="surface-card overflow-hidden !rounded-card">
        <header className="border-b border-[var(--line-soft)] bg-[var(--surface-3)] px-4 py-3">
          <h2 className="text-base font-extrabold uppercase tracking-[0.04em] text-[var(--text-main)]">
            {L(
              i18n.language,
              'Ranking histórico dos maiores campeões',
              'All-time greatest champions leaderboard',
              'Classement historique des plus grands champions',
              'Tabla histórica de los mejores campeones',
            )}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {L(
              i18n.language,
              'Classificados pelo total de vitórias em lutas de cinturão, defesas bem-sucedidas e número de reinados.',
              'Ranked by total title-fight victories, successful belt defenses and number of championship reigns.',
              'Classés par victoires en combats de titre, défenses réussies et nombre de règnes.',
              'Clasificados por el total de victorias en peleas por el título, defensas exitosas del cinturón y número de reinados.',
            )}
          </p>
        </header>

        <ol className="divide-y divide-[var(--line-soft)]">
          {greatest.map((entry, index) => {
            const profile = lookup(entry.champion)
            const record = profile ? formatRecord(profile) : null

            return (
              <li
                key={entry.champion}
                className="grid grid-cols-[2.5rem_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:grid-cols-[3rem_auto_minmax(0,1fr)_auto]"
              >
                <div className="text-center">
                  <span
                    className={`inline-flex min-w-[2.25rem] items-center justify-center border border-[var(--rule)] px-1.5 py-0.5 font-mono text-xs font-extrabold ${
                      index === 0
                        ? 'bg-[var(--gold-fill)] text-[#10151d]'
                        : index < 3
                          ? 'bg-[var(--ink)] text-[var(--on-ink)]'
                          : 'bg-[var(--surface-3)] text-[var(--text-main)]'
                    }`}
                  >
                    #{index + 1}
                  </span>
                </div>

                <FighterAvatar
                  name={entry.champion}
                  imageUrl={profile?.image_url ?? null}
                  highlight={entry.isCurrentOrFinal}
                  className="h-12 w-11 shrink-0"
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
                    <button
                      type="button"
                      onClick={() => onOpenFighter(entry.champion)}
                      className="truncate text-left text-base font-bold text-[var(--text-main)] hover:underline"
                    >
                      {entry.champion}
                    </button>
                    {record ? <span className="font-mono text-xs text-[var(--text-muted)]">({record})</span> : null}
                    {entry.divisions.length > 1 ? (
                      <span className="inline-flex items-center gap-1 border border-[var(--rule)] bg-[#1F4E9C] px-1.5 py-px text-label font-bold uppercase text-white">
                        <Award className="h-3 w-3" aria-hidden="true" />
                        {L(i18n.language, 'Duplo campeão', 'Double champ', 'Double champion', 'Doble campeón')}
                      </span>
                    ) : null}
                    {entry.isCurrentOrFinal ? (
                      <span className="border border-[var(--rule)] bg-[#F2C230] px-1.5 py-px text-label font-bold uppercase text-[#0E0E0E]">
                        {isArchived
                          ? L(i18n.language, 'Último campeão', 'Final champ', 'Dernier champion', 'Último campeón')
                          : L(i18n.language, 'Campeão atual', 'Current champ', 'Champion actuel', 'Campeón actual')}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {entry.divisions.map((div) => getDivisionName(div, i18n.language)).join(' · ')}
                    {entry.firstTitleDate
                      ? ` · ${entry.firstTitleDate.slice(0, 4)}–${
                          entry.lastTitleDate?.slice(0, 4) ?? entry.firstTitleDate.slice(0, 4)
                        }`
                      : ''}
                  </p>
                </div>

                <div className="col-span-3 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
                  <span className="border border-[var(--rule)] bg-[#F2C230] px-2.5 py-1 font-mono text-xs font-extrabold uppercase text-[#0E0E0E]">
                    {entry.titleWinsCount} {entry.titleWinsCount === 1 ? L(i18n.language, 'vitória de título', 'title win', 'victoire', 'victoria de título') : L(i18n.language, 'vitórias de título', 'title wins', 'victoires', 'victorias de título')}
                  </span>
                  <span className="border border-[var(--line-soft)] bg-[var(--surface-3)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--text-main)]">
                    {entry.reignsCount}x {L(i18n.language, 'campeão', 'champ', 'champion', 'campeón')}
                  </span>
                  <span className="border border-[var(--line-soft)] bg-[var(--surface-3)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--text-main)]">
                    {entry.defensesCount} {entry.defensesCount === 1 ? 'def.' : 'defs.'}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
