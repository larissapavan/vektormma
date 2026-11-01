import { motion } from 'framer-motion'
import { ArrowRight, Award, CalendarDays, ListOrdered, Swords, TrendingUp, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { FlagIcon } from '../../shared/components/FlagIcon'
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton'
import { OrgFightRow, OrgTitleBadge } from '../../shared/components/OrgFightRow'
import { WinProbabilityBar } from '../../shared/components/WinProbabilityBar'
import { L, localeTag } from '../../i18n/lang'
import { getDivisionName } from '../../shared/data/divisions'
import { formatDate } from '../../shared/data/orgFormat'
import { orgEs, orgPath, type OrgConfig } from '../../shared/data/orgs'
import { useOrgFighterLookup } from '../../shared/hooks/useOrgFighterLookup'
import type { OrgEvent, OrgFighter, OrgRankingCategory, UpcomingPick } from '../../shared/types/api'

/**
 * The home page of an organization that has predictions, laid out like the UFC home page: a hero with three small
 * figures, a strip of the catalog's size, the main event with the model's pick, who is trending, the pound-for-pound
 * top and the rest of the card.
 */

type PickFor = (event: string, fighterA: string, fighterB: string) => UpcomingPick | undefined

const CLICKABLE_ROW =
  'w-full cursor-pointer text-left transition hover:!bg-[#F2C230]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2C230]'

function shortDate(date: string | null, lang: string) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString(localeTag(lang), { month: 'short', day: 'numeric' })
}

export function FeaturedHero({
  org,
  fightersCount,
  nextEvent,
  nextEventLoading,
  lastUpdated,
}: {
  org: OrgConfig
  fightersCount: number
  nextEvent: OrgEvent | null
  nextEventLoading: boolean
  lastUpdated: string | null
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <motion.section
      className="surface-card relative overflow-hidden rounded-[24px] border border-[var(--border-subtle)] p-5 sm:p-7 shadow-xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--text-muted)] backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-[var(--accent-red)] animate-pulse" />
        <span>
          {L(
            lang,
            `Inteligência ${org.shortName} • Aprendizado de máquina e análises`,
            `${org.shortName} Intelligence • Machine Learning & Analytics`,
            `Intelligence ${org.shortName} • Apprentissage automatique et analyses`,
            `Inteligencia ${org.shortName} • Aprendizaje automático y análisis`,
          )}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-tight text-[var(--text-main)] sm:text-5xl">Vektor MMA</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base font-normal">
        {L(
          lang,
          `O que vem a seguir no ${org.shortName}: a próxima luta principal, o palpite da IA, o momento dos lutadores e os líderes do ranking peso por peso.`,
          `What's next in ${org.shortName}: the upcoming main event, the model's pick for it, how the fighters are trending and the top of the pound-for-pound ranking.`,
          `La suite au ${org.shortName} : le prochain combat principal, le choix du modèle, la forme des combattants et le haut du classement livre pour livre.`,
          `Lo que viene en ${orgEs(org)}: la próxima pelea estelar, el pronóstico del modelo, cómo vienen los peleadores y la cima del ranking libra por libra.`,
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Link
          to={orgPath(org, 'predictor')}
          className="primary-action inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md hover:shadow-lg transition-all max-xs:w-full"
        >
          {L(lang, 'Simular uma Luta', 'Predict a fight', 'Pronostiquer un combat', 'Pronosticar una pelea')}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to={orgPath(org, 'events')}
          className="ghost-action theme-text inline-flex items-center justify-center rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition-all hover:bg-[var(--bg-surface-hover)] max-xs:w-full"
        >
          {L(lang, 'Ver Card Completo', 'See the full card', 'Voir la carte complète', 'Ver la cartelera completa')}
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <MiniStat
          label={L(lang, 'Lutadores no banco', 'Fighters tracked', 'Combattants suivis', 'Peleadores registrados')}
          value={fightersCount ? fightersCount.toLocaleString(localeTag(lang)) : '—'}
          icon={Swords}
        />
        <MiniStat
          label={L(lang, 'Próximo evento', 'Next event', 'Prochain événement', 'Próximo evento')}
          value={nextEventLoading ? L(lang, 'Carregando...', 'Loading...', 'Chargement...', 'Cargando...') : shortDate(nextEvent?.date ?? null, lang)}
          icon={CalendarDays}
        />
        <MiniStat
          label={L(lang, 'Dados até', 'Data through', 'Données jusqu’au', 'Datos hasta')}
          value={shortDate(lastUpdated, lang)}
          icon={Award}
        />
      </div>
    </motion.section>
  )
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2 py-1.5 sm:px-3 sm:py-2">
      <div className="flex items-center gap-1.5 text-[var(--accent-red)] sm:gap-2">
        <Icon className="hidden h-3.5 w-3.5 shrink-0 sm:block" />
        <p className="broadcast-label truncate text-[11px] text-[var(--text-muted)]">{label}</p>
      </div>
      <p className="data-value mt-0.5 truncate text-base font-bold text-[var(--text-main)] sm:mt-1 sm:text-xl">{value}</p>
    </div>
  )
}

/** How much the organization's catalog holds. The UFC strip shows the model's accuracy here, which only exists for the UFC. */
export function CatalogStrip({ org, fights, events, active }: { org: OrgConfig; fights: number; events: number; active: number }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const figure = (value: number) => (value ? value.toLocaleString(localeTag(lang)) : '—')
  return (
    <section className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-[20px] px-3 py-3 sm:px-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{L(lang, 'Lutas Analisadas', 'Fights analyzed', 'Combats analysés', 'Peleas analizadas')}</p>
          <p className="data-value text-xl font-bold text-[var(--text-main)]">{figure(fights)}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{L(lang, `histórico oficial do ${org.shortName}`, 'career bouts on file', 'combats de carrière au dossier', 'peleas de carrera registradas')}</p>
        </div>
        <div>
          <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{L(lang, 'Eventos', 'Events', 'Événements', 'Eventos')}</p>
          <p className="data-value text-xl font-bold text-[var(--text-main)]">{figure(events)}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{`${figure(active)} ${L(lang, 'lutadores ativos', 'active fighters', 'combattants actifs', 'peleadores activos')}`}</p>
        </div>
      </div>
      <Link
        to="/model"
        className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#C8102E] transition hover:text-white"
      >
        {L(lang, 'Como o Modelo Funciona', 'How the model works', 'Comment fonctionne le modèle', 'Cómo funciona el modelo')}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}

export function MainEventCard({
  org,
  loading,
  event,
  pickFor,
  onOpenFighter,
}: {
  org: OrgConfig
  loading: boolean
  event: OrgEvent | null
  pickFor: PickFor
  onOpenFighter: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const main = event?.fights[0] ?? null
  if (loading) return <LoadingSkeleton className="h-[340px] rounded-[20px]" />

  if (!event || !main) {
    return (
      <div className="surface-card rounded-[20px] p-4 text-center">
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          {L(
            lang,
            `Nenhum evento do ${org.shortName} agendado no momento.`,
            `No upcoming ${org.shortName} events are scheduled right now.`,
            `Aucun événement ${org.shortName} n’est programmé pour le moment.`,
            `No hay eventos de ${orgEs(org)} programados por ahora.`,
          )}
        </p>
      </div>
    )
  }

  const pick = pickFor(event.name, main.fighter_1, main.fighter_2)
  const probabilityA = pick ? pick.fighter_1_probability : null

  return (
    <article className="surface-card rounded-[20px] p-4 sm:p-6">
      <div className="min-w-0">
        <p className="broadcast-label text-[11px] text-[var(--accent-red)]">
          {L(lang, `Próximo Evento do ${org.shortName}`, `Upcoming ${org.shortName} event`, `Prochain événement ${org.shortName}`, `Próximo evento de ${orgEs(org)}`)}
        </p>
        <h2 className="mt-1 text-2xl font-black uppercase leading-tight tracking-[0.03em] text-[var(--text-main)] sm:text-4xl">{event.name}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(event.date, true, lang)} • {event.fight_count} {L(lang, 'lutas', 'fights', 'combats', 'peleas')}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-3)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="broadcast-label text-[11px] text-[var(--accent-red)]">{L(lang, 'Luta Principal', 'Main event', 'Combat principal', 'Pelea estelar')}</p>
          {main.title_fight ? <OrgTitleBadge weightClass={main.weight_class} /> : null}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <MainEventName org={org} name={main.fighter_1} align="right" onOpen={onOpenFighter} />
          <span className="broadcast-label border border-[var(--rule)] px-2 py-1 text-[11px] text-[var(--text-muted)]">VS</span>
          <MainEventName org={org} name={main.fighter_2} align="left" onOpen={onOpenFighter} />
        </div>
        {main.weight_class ? (
          <p className="type-tech mt-2 text-center text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{getDivisionName(main.weight_class, lang)}</p>
        ) : null}

        {pick && probabilityA != null ? (
          <div className="mt-5">
            <WinProbabilityBar
              showNames={false}
              nameA={main.fighter_1}
              nameB={main.fighter_2}
              probabilityA={probabilityA}
              probabilityB={1 - probabilityA}
              predictedWinner={pick.predicted_winner}
            />
          </div>
        ) : null}
      </div>

      <Link
        to={`${orgPath(org, 'predictor')}?a=${encodeURIComponent(main.fighter_1)}&b=${encodeURIComponent(main.fighter_2)}`}
        className="primary-action mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white"
      >
        {L(lang, 'Analisar Combate Completo', 'Analyze matchup', 'Analyser le combat', 'Analizar la pelea completa')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  )
}

function MainEventName({ org, name, align, onOpen }: { org: OrgConfig; name: string; align: 'left' | 'right'; onOpen: (name: string) => void }) {
  const profile = useOrgFighterLookup(org.id)(name)
  const right = align === 'right'

  const body = (
    <>
      <FighterAvatar name={name} imageUrl={profile?.image_url ?? null} highlight className="h-20 w-[4.25rem] shrink-0 sm:h-24 sm:w-20" />
      <div className={`flex min-w-0 flex-1 flex-col gap-1 ${right ? 'items-end text-right' : 'items-start text-left'} max-sm:w-full max-sm:items-center max-sm:text-center`}>
        <p className="type-display w-full text-base font-bold uppercase leading-tight text-[var(--text-main)] sm:text-2xl">{name}</p>
        {profile?.country_code ? (
          <span className={`flex flex-wrap items-center gap-1 ${right ? 'sm:justify-end' : 'sm:justify-start'} max-sm:justify-center`}>
            <FlagIcon code={profile.country_code} country={profile.country} />
          </span>
        ) : null}
      </div>
    </>
  )
  // Narrow screens stack the photo above the name; from `sm` up it sits beside it, facing the middle of the card.
  const layout = `flex min-w-0 flex-col items-center gap-2 sm:items-center sm:gap-3 ${right ? 'sm:flex-row-reverse sm:justify-start' : 'sm:flex-row'}`

  return profile ? (
    <button type="button" onClick={() => onOpen(name)} aria-label={`${name}`} className={`${layout} cursor-pointer text-inherit hover:opacity-90`}>
      {body}
    </button>
  ) : (
    <div className={layout}>{body}</div>
  )
}

export function TrendingCard({ org, event, onOpenFighter }: { org: OrgConfig; event: OrgEvent | null; onOpenFighter: (name: string) => void }) {
  const { i18n } = useTranslation()
  const main = event?.fights[0] ?? null
  if (!main) return null

  return (
    <article className="surface-card rounded-[20px] p-3 sm:p-4">
      <div className="flex items-center gap-2 text-[#C8102E]">
        <TrendingUp className="h-4 w-4" />
        <p className="broadcast-label text-[11px]">{L(i18n.language, 'Destaques do Momento', 'Trending', 'Forme du moment', 'En racha')}</p>
      </div>
      <div className="mt-2.5 space-y-1.5">
        <TrendRow org={org} name={main.fighter_1} onOpen={onOpenFighter} />
        <TrendRow org={org} name={main.fighter_2} onOpen={onOpenFighter} />
      </div>
    </article>
  )
}

function TrendRow({ org, name, onOpen }: { org: OrgConfig; name: string; onOpen: (name: string) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const profile = useOrgFighterLookup(org.id)(name)
  const streak = profile?.win_streak ?? 0
  const finishRate = profile?.finish_rate ?? null

  const content = (
    <>
      <FighterAvatar name={name} imageUrl={profile?.image_url ?? null} className="h-10 w-9" />
      <span className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--text-main)]">{name}</p>
        <p className="mt-0.5 text-xs leading-4 text-[var(--text-muted)]">
          {streak > 0 ? (
            <span className="text-[var(--accent-red)]">↑ {streak} {L(lang, 'vitórias seguidas', 'fight win streak', 'victoires de suite', 'victorias seguidas')}</span>
          ) : profile?.win_streak != null ? (
            <span>{L(lang, 'Vindo de derrota', 'Coming off a loss', 'Sort d’une défaite', 'Viene de una derrota')}</span>
          ) : (
            <span>{profile?.org_record ?? '—'}</span>
          )}
          {finishRate != null ? ` • ${Math.round(finishRate * 100)}% ${L(lang, 'taxa de nocaute/finalização', 'finish rate', 'taux de finition', 'tasa de finalización')}` : ''}
        </p>
      </span>
    </>
  )
  const box = 'flex items-center gap-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-3)] px-3 py-2.5'

  // Only fighters we have a profile for open one; anyone else stays a plain row.
  return profile ? (
    <button type="button" onClick={() => onOpen(profile.name)} aria-label={L(lang, `${name}. Ver perfil`, `${name}. View profile`, `${name}. Voir le profil`, `${name}. Ver perfil`)} className={`${box} ${CLICKABLE_ROW}`}>
      {content}
    </button>
  ) : (
    <div className={box}>{content}</div>
  )
}

export function PoundForPoundCard({
  org,
  category,
  loading,
  onOpenFighter,
}: {
  org: OrgConfig
  category: OrgRankingCategory | null
  loading: boolean
  onOpenFighter: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const lookup = useOrgFighterLookup(org.id)
  const entries = category?.entries.filter((entry) => entry.rank > 0).slice(0, 3) ?? []

  return (
    <article className="surface-card rounded-[20px] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[#C8102E]">
          <Trophy className="h-4 w-4" />
          <p className="broadcast-label text-[11px]">{L(lang, 'Ranking Peso por Peso (P4P)', 'Pound-for-pound', 'Classement livre pour livre', 'Ranking libra por libra')}</p>
        </div>
        <Link to={orgPath(org, 'rankings')} className="type-tech inline-flex min-h-10 items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-red)]">
          {L(lang, 'Ver todos', 'View all', 'Tout voir', 'Ver todos')}
        </Link>
      </div>

      {loading ? (
        <div className="mt-2.5 space-y-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[40px]" />
          ))}
        </div>
      ) : entries.length ? (
        <div className="mt-2.5 space-y-1.5">
          {entries.map((entry) => {
            const profile: OrgFighter | undefined = lookup(entry.fighter)
            const content = (
              <>
                <FighterAvatar name={entry.fighter} imageUrl={profile?.image_url ?? null} className="h-10 w-9" />
                <span className="data-value w-5 shrink-0 text-sm font-bold text-[var(--accent-red)]">{entry.rank}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--text-main)]">{entry.fighter}</span>
                {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
              </>
            )
            const box = 'flex items-center gap-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-3)] px-3 py-2.5'
            return profile ? (
              <button
                key={entry.rank}
                type="button"
                onClick={() => onOpenFighter(profile.name)}
                aria-label={L(lang, `${entry.fighter}, posição ${entry.rank}. Ver perfil`, `${entry.fighter}, rank ${entry.rank}. View profile`, `${entry.fighter}, rang ${entry.rank}. Voir le profil`, `${entry.fighter}, puesto ${entry.rank}. Ver perfil`)}
                className={`${box} ${CLICKABLE_ROW}`}
              >
                {content}
              </button>
            ) : (
              <div key={entry.rank} className={box}>
                {content}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-2.5 text-xs text-[var(--text-muted)]">{L(lang, 'Rankings indisponíveis no momento.', 'Rankings unavailable right now.', 'Classements indisponibles pour le moment.', 'El ranking no está disponible por ahora.')}</p>
      )}
    </article>
  )
}

export function RestOfCardSection({ org, event, pickFor, onOpenFighter }: { org: OrgConfig; event: OrgEvent | null; pickFor: PickFor; onOpenFighter: (name: string) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  if (!event || event.fights.length <= 1) return null

  const rest = event.fights.slice(1)
  return (
    <section aria-label={L(lang, 'Card completo', 'Rest of the card', 'Reste de la carte', 'Resto de la cartelera')} className="surface-card rounded-[20px] p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[var(--accent-red)]">
        <ListOrdered className="h-4 w-4" />
        <p className="broadcast-label text-[11px]">
          {rest.length === 1
            ? L(lang, 'Card Completo • 1 luta', 'Rest of the card • 1 fight', 'Reste de la carte • 1 combat', 'Resto de la cartelera • 1 pelea')
            : L(lang, `Card Completo • ${rest.length} lutas`, `Rest of the card • ${rest.length} fights`, `Reste de la carte • ${rest.length} combats`, `Resto de la cartelera • ${rest.length} peleas`)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {rest.map((fight, index) => (
          <OrgFightRow key={fight.fight_url ?? index} org={org.id} fight={fight} scheduled pick={pickFor(event.name, fight.fighter_1, fight.fighter_2)} onOpenFighter={onOpenFighter} />
        ))}
      </div>
    </section>
  )
}
