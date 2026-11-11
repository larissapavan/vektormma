import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Crown, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { L, localeTag, uiLang } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { orgEs, orgPath } from '../shared/data/orgs'
import { useGyms } from '../shared/hooks/useGyms'
import { useOrg } from '../shared/hooks/useOrg'
import { normalizeFighterName } from '../shared/hooks/useFighterImages'
import type { GymSummary } from '../shared/types/api'

const PAGE_SIZE = 40

type Scope = 'org' | 'all'
type Sort = 'org' | 'size' | 'champions' | 'name'

export function Gyms() {
  const { t, i18n } = useTranslation()
  const org = useOrg()
  const { gyms, loading, error } = useGyms()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('org')
  const [sort, setSort] = useState<Sort>('org')
  const [shown, setShown] = useState(PAGE_SIZE)

  const inOrg = (gym: GymSummary) => gym.orgs[org.id] ?? 0
  const orgGyms = useMemo(() => gyms.filter((gym) => (gym.orgs[org.id] ?? 0) > 0), [gyms, org.id])
  const orgFighters = useMemo(() => orgGyms.reduce((sum, gym) => sum + (gym.orgs[org.id] ?? 0), 0), [orgGyms, org.id])

  const matches = useMemo(() => {
    const term = normalizeFighterName(query)
    const count = (gym: GymSummary) => gym.orgs[org.id] ?? 0
    const order: Record<Sort, (a: GymSummary, b: GymSummary) => number> = {
      org: (a, b) => count(b) - count(a) || b.fighters_count - a.fighters_count,
      size: (a, b) => b.fighters_count - a.fighters_count,
      champions: (a, b) => b.champions - a.champions || count(b) - count(a),
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return (scope === 'org' ? orgGyms : gyms)
      .filter((gym) => !term || normalizeFighterName(gym.name).includes(term))
      .sort((a, b) => order[sort](a, b) || a.name.localeCompare(b.name))
  }, [gyms, orgGyms, query, scope, sort, org.id])

  const reset = () => setShown(PAGE_SIZE)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('gyms.eyebrow')}
        title={uiLang(i18n.language) === 'es' ? `${t('gyms.title')} de ${orgEs(org)}` : `${org.shortName} ${t('gyms.title')}`}
        description={t('gyms.description')}
        stats={[
          { label: t('gyms.totalGyms'), value: gyms.length.toLocaleString(localeTag(i18n.language)) },
          { label: t('gyms.withOrgFighters'), value: orgGyms.length.toLocaleString(localeTag(i18n.language)) },
          { label: t('gyms.fightersPlaced'), value: orgFighters.toLocaleString(localeTag(i18n.language)) },
        ]}
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto] lg:items-end">
          <div>
          <label htmlFor="gym-search" className="mb-1.5 block text-[15px] text-[var(--muted)]">{L(i18n.language, 'Buscar academia', 'Search gyms', 'Rechercher une salle', 'Buscar gimnasio')}</label>
          <div className="soft-input flex min-h-14 items-center gap-3 px-4">
            <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
            <input
              id="gym-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                reset()
              }}
              placeholder={t('gyms.searchPlaceholder')}
              aria-label={L(i18n.language, 'Buscar academias', 'Search gyms', 'Rechercher des salles', 'Buscar gimnasios')}
              className="w-full bg-transparent text-base outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          </div>
          <div>
          <label htmlFor="gym-sort" className="mb-1.5 block text-[15px] text-[var(--muted)]">{L(i18n.language, 'Ordenar por', 'Sort by', 'Trier par', 'Ordenar por')}</label>
          <select
            id="gym-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            aria-label={L(i18n.language, 'Ordenar academias', 'Sort gyms', 'Trier les salles', 'Ordenar gimnasios')}
            className="soft-input min-h-14 w-full px-4 text-base outline-none"
          >
            <option value="org">{t('gyms.mostFighters')}</option>
            <option value="size">{t('gyms.biggestRoster')}</option>
            <option value="champions">{t('gyms.mostChampions')}</option>
            <option value="name">{t('gyms.name')}</option>
          </select>
          </div>
          <div role="group" aria-label={L(i18n.language, 'Filtrar academias', 'Which gyms', 'Quelles salles', 'Qué gimnasios')} className="inline-flex self-end overflow-hidden rounded-sm border-[1.5px] border-[var(--ink)]">
            {(['org', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                onClick={() => {
                  setScope(value)
                  reset()
                }}
                className={`min-h-14 cursor-pointer px-5 text-[15px] font-bold ${scope === value ? 'bg-[var(--ink)] text-[var(--on-ink)]' : 'hover:bg-[var(--panel-hover)]'}`}
              >
                {value === 'org' ? org.shortName : t('gyms.allGyms')}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading ? (
        <section className="grid gap-2.5 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[64px]" />
          ))}
        </section>
      ) : matches.length ? (
        <section className="space-y-3">
          <p className="text-[15px] text-[var(--muted)]">
            {L(
              i18n.language,
              `Exibindo ${Math.min(shown, matches.length).toLocaleString('pt-BR')} de ${matches.length.toLocaleString('pt-BR')}`,
              `Showing ${Math.min(shown, matches.length).toLocaleString('en-US')} of ${matches.length.toLocaleString('en-US')}`,
              `Affichage de ${Math.min(shown, matches.length).toLocaleString(localeTag(i18n.language))} sur ${matches.length.toLocaleString(localeTag(i18n.language))}`,
              `Mostrando ${Math.min(shown, matches.length).toLocaleString('es-419')} de ${matches.length.toLocaleString('es-419')}`,
            )}
          </p>
          <ul aria-label={L(i18n.language, 'Academias', 'Gyms', 'Salles', 'Gimnasios')} className="border-t-[3px] border-[var(--ink)]">
            {matches.slice(0, shown).map((gym) => (
              <li key={gym.slug} className="border-b border-[var(--rule)]">
                <GymRow gym={gym} orgName={org.shortName} to={`${orgPath(org, 'gyms')}/${gym.slug}`} inOrg={inOrg(gym)} />
              </li>
            ))}
          </ul>
          {shown < matches.length ? (
            <button
              type="button"
              onClick={() => setShown((count) => count + PAGE_SIZE)}
              className="ghost-action mx-auto block px-6"
            >
              {L(i18n.language, 'Mostrar mais academias', 'Show more gyms', 'Afficher plus de salles', 'Mostrar más gimnasios')}
            </button>
          ) : null}
        </section>
      ) : (
        <div className="bg-[var(--panel)] px-6 py-10">
          <p className="font-display text-2xl font-extrabold">{t('gyms.noGymsFound')}</p>
        </div>
      )}
    </div>
  )
}

function GymRow({ gym, orgName, to, inOrg }: { gym: GymSummary; orgName: string; to: string; inOrg: number }) {
  const { i18n } = useTranslation()

  return (
    <Link to={to} className="row-link flex w-full flex-wrap items-center gap-x-8 gap-y-2 px-3 py-5 hover:bg-[var(--panel)]">
      <span className="min-w-0 flex-[1.4_1_300px] font-display text-[28px] font-black leading-none sm:text-[36px]">{gym.name}</span>
      <span className="flex flex-[1_1_320px] flex-wrap items-center gap-x-7 gap-y-2">
        <span>
          <span className="block font-display text-[28px] font-extrabold leading-none tabular-nums">{inOrg}</span>
          <span className="text-[15px] text-[var(--muted)]">
            {orgName} {inOrg === 1 ? L(i18n.language, 'lutador', 'fighter', 'combattant', 'peleador') : L(i18n.language, 'lutadores', 'fighters', 'combattants', 'peleadores')}
          </span>
        </span>
        <span>
          <span className="block font-display text-[28px] font-extrabold leading-none tabular-nums">{gym.fighters_count}</span>
          <span className="text-[15px] text-[var(--muted)]">{L(i18n.language, 'atletas no total', 'fighters in all', 'combattants au total', 'peleadores en total')}</span>
        </span>
        {gym.champions > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-sm border-[1.5px] border-[var(--ink)] px-2.5 py-1 text-[13px] font-bold">
            <Crown className="h-3.5 w-3.5 text-[var(--gold)]" aria-hidden="true" />
            {gym.champions} {gym.champions === 1 ? L(i18n.language, 'campeão', 'champion', 'champion', 'campeón') : L(i18n.language, 'campeões', 'champions', 'champions', 'campeones')}
          </span>
        ) : null}
      </span>
      <svg className="row-arrow h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <path d="M4 12h16M14 6l6 6-6 6" />
      </svg>
    </Link>
  )
}
