import { ArrowRight, CalendarDays, ListOrdered, TrendingUp, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { FlagIcon } from '../../shared/components/FlagIcon'
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton'
import { OrgFightRow, OrgSportTag, OrgTitleBadge } from '../../shared/components/OrgFightRow'
import { WinProbabilityBar } from '../../shared/components/WinProbabilityBar'
import { Eyebrow } from '../../shared/components/ui/Eyebrow'
import { Section, sectionActionClass } from '../../shared/components/ui/Section'
import { Stat } from '../../shared/components/ui/Stat'
import { L, localeTag } from '../../i18n/lang'
import { getDivisionName } from '../../shared/data/divisions'
import { formatDate } from '../../shared/data/orgFormat'
import { orgEs, orgFr, orgPath, orgPt, type OrgConfig } from '../../shared/data/orgs'
import { useOrgFighterLookup } from '../../shared/hooks/useOrgFighterLookup'
import type { OrgEvent, OrgFighter, OrgRankingCategory, UpcomingPick } from '../../shared/types/api'

/**
 * The home page of an organization that has predictions, laid out like the UFC home page: a hero with the next event and
 * the model's pick for its main event, an open row with the catalog's size, who is trending, the pound-for-pound top and
 * the rest of the card.
 */

type PickFor = (event: string, fighterA: string, fighterB: string) => UpcomingPick | undefined

/** A row of a list that sits on the page background; the hover fill bleeds a little past the text column. */
const ROW = '-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-sm px-2 py-2.5 text-left'
const CLICKABLE_ROW = 'cursor-pointer transition-colors hover:bg-[var(--bg-surface-hover)]'

function shortDate(date: string | null, lang: string) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString(localeTag(lang), { month: 'short', day: 'numeric' })
}

/** The top of the page: the next event on the left, its main event and the model's pick on the right. */
export function FeaturedHero({
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
  const main = !loading && event ? (event.fights[0] ?? null) : null
  const pick = event && main ? pickFor(event.name, main.fighter_1, main.fighter_2) : undefined
  const probabilityA = pick ? pick.fighter_1_probability : null

  return (
    <section className="overflow-hidden rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex flex-col justify-center p-5 sm:p-8">
          <Eyebrow tone="accent">
            {main
              ? L(lang, `Próximo evento ${orgPt(org, 'de')}`, `Upcoming ${org.shortName} event`, `Prochain événement ${org.shortName}`, `Próximo evento de ${orgEs(org)}`)
              : L(lang, `Estatísticas e previsões ${orgPt(org, 'de')}`, `${org.shortName} stats and predictions`, `Statistiques et pronostics ${org.shortName}`, `Estadísticas y pronósticos de ${orgEs(org)}`)}
          </Eyebrow>
          <h1 className="mt-2 text-3xl text-[var(--text-primary)] [text-wrap:balance] sm:text-4xl xl:text-5xl">{main && event ? event.name : 'Vektor MMA'}</h1>
          {main && event ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {formatDate(event.date, true, lang)} • {event.fight_count} {L(lang, 'lutas', 'fights', 'combats', 'peleas')}
            </p>
          ) : null}
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            {L(
              lang,
              `O que vem a seguir ${orgPt(org, 'em')}: a próxima luta principal, o palpite do modelo, o momento dos lutadores e os líderes do ranking peso por peso.`,
              `What's next in ${org.shortName}: the upcoming main event, the model's pick for it, how the fighters are trending and the top of the pound-for-pound ranking.`,
              `La suite ${orgFr(org, 'à')} : le prochain combat principal, le choix du modèle, la forme des combattants et le haut du classement livre pour livre.`,
              `Lo que viene en ${orgEs(org)}: la próxima pelea estelar, el pronóstico del modelo, cómo vienen los peleadores y la cima del ranking libra por libra.`,
            )}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {main ? (
              <Link
                to={`${orgPath(org, 'predictor')}?a=${encodeURIComponent(main.fighter_1)}&b=${encodeURIComponent(main.fighter_2)}`}
                className="primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 text-xs max-xs:w-full"
              >
                {L(lang, 'Analisar combate completo', 'Analyze matchup', 'Analyser le combat', 'Analizar la pelea completa')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            <Link
              to={orgPath(org, 'predictor')}
              className={`${main ? 'ghost-action' : 'primary-action'} inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 text-xs max-xs:w-full`}
            >
              {L(lang, 'Simular uma luta', 'Predict a fight', 'Pronostiquer un combat', 'Pronosticar una pelea')}
              {main ? null : <ArrowRight className="h-4 w-4" />}
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-center border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-5 sm:p-8 lg:border-l lg:border-t-0">
          {loading ? (
            <LoadingSkeleton className="h-[260px]" />
          ) : !main ? (
            <p className="py-8 text-center text-sm leading-6 text-[var(--text-muted)]">
              {L(
                lang,
                `Nenhum evento ${orgPt(org, 'de')} agendado no momento.`,
                `No upcoming ${org.shortName} events are scheduled right now.`,
                `Aucun événement ${org.shortName} n’est programmé pour le moment.`,
                `No hay eventos de ${orgEs(org)} programados por ahora.`,
              )}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Eyebrow>{L(lang, 'Luta principal', 'Main event', 'Combat principal', 'Pelea estelar')}</Eyebrow>
                {/* The title badge already names the division. */}
                {main.weight_class && !main.title_fight ? <Eyebrow as="span">• {getDivisionName(main.weight_class, lang)}</Eyebrow> : null}
                {main.title_fight ? <OrgTitleBadge weightClass={main.weight_class} /> : null}
                <OrgSportTag discipline={main.discipline} />
              </div>

              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-4">
                <MainEventName org={org} name={main.fighter_1} onOpen={onOpenFighter} />
                <span className="mt-10 text-label font-semibold text-[var(--text-muted)] sm:mt-12">VS</span>
                <MainEventName org={org} name={main.fighter_2} onOpen={onOpenFighter} />
              </div>

              {pick && probabilityA != null ? (
                <div className="mt-6">
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
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function MainEventName({ org, name, onOpen }: { org: OrgConfig; name: string; onOpen: (name: string) => void }) {
  const profile = useOrgFighterLookup(org.id)(name)

  const body = (
    <>
      <FighterAvatar name={name} imageUrl={profile?.image_url ?? null} highlight className="h-24 w-20 sm:h-28 sm:w-24" />
      <span className="type-display block w-full break-words text-base leading-tight text-[var(--text-primary)] sm:text-xl">{name}</span>
      {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
    </>
  )
  const layout = 'flex min-w-0 flex-col items-center gap-2.5 text-center'

  return profile ? (
    <button type="button" onClick={() => onOpen(name)} aria-label={name} className={`${layout} cursor-pointer text-inherit hover:opacity-90`}>
      {body}
    </button>
  ) : (
    <div className={layout}>{body}</div>
  )
}

/**
 * How much the organization's catalog holds, in one open row. The UFC row leads with the model's accuracy, which only
 * exists for the UFC.
 */
export function CatalogStrip({
  org,
  fights,
  events,
  fighters,
  active,
  lastUpdated,
}: {
  org: OrgConfig
  fights: number
  events: number
  fighters: number
  active: number
  lastUpdated: string | null
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const figure = (value: number) => (value ? value.toLocaleString(localeTag(lang)) : '—')
  const column = 'lg:border-l lg:border-[var(--border-subtle)] lg:pl-6'

  return (
    <section
      aria-label={L(lang, `Números ${orgPt(org, 'de')}`, `${org.shortName} in numbers`, `${org.shortName} en chiffres`, `${orgEs(org)} en números`)}
      className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-center"
    >
      <Stat
        label={L(lang, 'Lutas analisadas', 'Fights analyzed', 'Combats analysés', 'Peleas analizadas')}
        value={figure(fights)}
        note={L(lang, `histórico oficial ${orgPt(org, 'de')}`, 'career bouts on file', 'combats de carrière au dossier', 'peleas de carrera registradas')}
      />
      <div className={column}>
        <Stat label={L(lang, 'Eventos', 'Events', 'Événements', 'Eventos')} value={figure(events)} />
      </div>
      <div className={column}>
        <Stat
          label={L(lang, 'Lutadores na base', 'Fighters tracked', 'Combattants suivis', 'Peleadores registrados')}
          value={figure(fighters)}
          note={`${figure(active)} ${L(lang, 'lutadores ativos', 'active fighters', 'combattants actifs', 'peleadores activos')}`}
        />
      </div>
      <div className={column}>
        <Stat label={L(lang, 'Dados até', 'Data through', 'Données jusqu’au', 'Datos hasta')} value={shortDate(lastUpdated, lang)} />
      </div>
      <Link to="/model" className={`${sectionActionClass} col-span-2 lg:col-span-1`}>
        {L(lang, 'Como o modelo funciona', 'How the model works', 'Comment fonctionne le modèle', 'Cómo funciona el modelo')}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}

export function TrendingCard({ org, event, onOpenFighter }: { org: OrgConfig; event: OrgEvent | null; onOpenFighter: (name: string) => void }) {
  const { i18n } = useTranslation()
  const main = event?.fights[0] ?? null
  if (!main) return null

  return (
    <Section rows icon={TrendingUp} title={L(i18n.language, 'Destaques do momento', 'Trending', 'Forme du moment', 'En racha')}>
      <ul className="divide-y divide-[var(--border-subtle)]">
        <li>
          <TrendRow org={org} name={main.fighter_1} onOpen={onOpenFighter} />
        </li>
        <li>
          <TrendRow org={org} name={main.fighter_2} onOpen={onOpenFighter} />
        </li>
      </ul>
    </Section>
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
        <span className="block truncate text-sm font-bold text-[var(--text-primary)]">{name}</span>
        <span className="mt-0.5 block text-xs leading-4 text-[var(--text-muted)]">
          {streak > 0 ? (
            <span className="text-[var(--text-red)]">↑ {streak} {L(lang, 'vitórias seguidas', 'fight win streak', 'victoires de suite', 'victorias seguidas')}</span>
          ) : profile?.win_streak != null ? (
            <span>{L(lang, 'Vindo de derrota', 'Coming off a loss', 'Sort d’une défaite', 'Viene de una derrota')}</span>
          ) : (
            <span>{profile?.org_record ?? '—'}</span>
          )}
          {finishRate != null ? ` • ${Math.round(finishRate * 100)}% ${L(lang, 'taxa de nocaute/finalização', 'finish rate', 'taux de finition', 'tasa de finalización')}` : ''}
        </span>
      </span>
    </>
  )

  // Only fighters we have a profile for open one; anyone else stays a plain row.
  return profile ? (
    <button type="button" onClick={() => onOpen(profile.name)} aria-label={L(lang, `${name}. Ver perfil`, `${name}. View profile`, `${name}. Voir le profil`, `${name}. Ver perfil`)} className={`${ROW} ${CLICKABLE_ROW}`}>
      {content}
    </button>
  ) : (
    <div className={ROW}>{content}</div>
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
    <Section
      rows
      icon={Trophy}
      title={L(lang, 'Ranking peso por peso (P4P)', 'Pound-for-pound', 'Classement livre pour livre', 'Ranking libra por libra')}
      action={
        <Link to={orgPath(org, 'rankings')} className={sectionActionClass}>
          {L(lang, 'Ver todos', 'View all', 'Tout voir', 'Ver todos')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[52px]" />
          ))}
        </div>
      ) : entries.length ? (
        <ol className="divide-y divide-[var(--border-subtle)]">
          {entries.map((entry) => {
            const profile: OrgFighter | undefined = lookup(entry.fighter)
            const content = (
              <>
                <span className="w-5 shrink-0 text-center font-display text-base font-bold tabular-nums text-[var(--text-red)]">{entry.rank}</span>
                <FighterAvatar name={entry.fighter} imageUrl={profile?.image_url ?? null} className="h-10 w-9" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--text-primary)]">{entry.fighter}</span>
                {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
              </>
            )
            return (
              <li key={entry.rank}>
                {profile ? (
                  <button
                    type="button"
                    onClick={() => onOpenFighter(profile.name)}
                    aria-label={L(lang, `${entry.fighter}, posição ${entry.rank}. Ver perfil`, `${entry.fighter}, rank ${entry.rank}. View profile`, `${entry.fighter}, rang ${entry.rank}. Voir le profil`, `${entry.fighter}, puesto ${entry.rank}. Ver perfil`)}
                    className={`${ROW} ${CLICKABLE_ROW}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={ROW}>{content}</div>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{L(lang, 'Rankings indisponíveis no momento.', 'Rankings unavailable right now.', 'Classements indisponibles pour le moment.', 'El ranking no está disponible por ahora.')}</p>
      )}
    </Section>
  )
}

export function RestOfCardSection({ org, event, pickFor, onOpenFighter }: { org: OrgConfig; event: OrgEvent | null; pickFor: PickFor; onOpenFighter: (name: string) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  if (!event || event.fights.length <= 1) return null

  const rest = event.fights.slice(1)
  return (
    <Section
      icon={ListOrdered}
      title={
        rest.length === 1
          ? L(lang, 'Card completo • 1 Luta', 'Rest of the card • 1 fight', 'Reste de la carte • 1 combat', 'Resto de la cartelera • 1 pelea')
          : L(lang, `Card completo • ${rest.length} lutas`, `Rest of the card • ${rest.length} fights`, `Reste de la carte • ${rest.length} combats`, `Resto de la cartelera • ${rest.length} peleas`)
      }
      action={
        <Link to={orgPath(org, 'events')} className={sectionActionClass}>
          {L(lang, 'Ver card completo', 'See the full card', 'Voir la carte complète', 'Ver la cartelera completa')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rest.map((fight, index) => (
          <OrgFightRow key={fight.fight_url ?? index} org={org.id} fight={fight} scheduled pick={pickFor(event.name, fight.fighter_1, fight.fighter_2)} onOpenFighter={onOpenFighter} />
        ))}
      </div>
    </Section>
  )
}
