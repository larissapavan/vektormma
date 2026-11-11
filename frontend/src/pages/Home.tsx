import { ArrowRight, ListOrdered, ShieldAlert, TrendingUp, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { FighterAvatar } from '../shared/components/FighterAvatar'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { FighterBadges, TitleFightBadge } from '../shared/components/FighterBadges'
import { L, localeTag } from '../i18n/lang'
import { badgesForRankings } from '../shared/data/badges'
import { getDivisionName } from '../shared/data/divisions'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { LatestNewsCard } from '../shared/components/LatestNewsCard'
import { FightMatchupCard } from '../shared/components/FightMatchupCard'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { DataConfidenceNote } from '../shared/components/DataConfidenceNote'
import { CornerSplit, cornerPhotoClass } from '../shared/components/ui/CornerSplit'
import { predictionSentence, ProbabilityBand } from '../shared/components/ui/ProbabilityBand'
import { Eyebrow } from '../shared/components/ui/Eyebrow'
import { Section, sectionActionClass } from '../shared/components/ui/Section'
import { Stat } from '../shared/components/ui/Stat'
import { useDataInfo } from '../shared/hooks/useDataInfo'
import { useModelInfo } from '../shared/hooks/useModelInfo'
import { usePrediction } from '../shared/hooks/usePrediction'
import { useTrackRecord } from '../shared/hooks/useTrackRecord'
import { getFighterImageUrl, useFighterImages } from '../shared/hooks/useFighterImages'
import { useFighterLookup } from '../shared/hooks/useFighterLookup'
import { useRankings } from '../shared/hooks/useRankings'
import { useUpcomingPicks } from '../shared/hooks/useUpcomingPicks'
import { useUpcomingEvents } from '../shared/hooks/useUpcomingEvents'
import { getFighterPerformance } from '../shared/services/api'
import type { DataConfidence, EventSummary, FighterPerformance, FightResult } from '../shared/types/api'

type Trend = { streak: number; finishRate: number | null }

export function Home() {
  const { i18n } = useTranslation()
  const { health, modelInfo, error: modelError } = useModelInfo()
  const { data: trackRecord } = useTrackRecord()
  const { dataInfo } = useDataInfo()
  const { events, loading: eventsLoading, error: eventsError } = useUpcomingEvents()
  const { rankings, loading: rankingsLoading, error: rankingsError } = useRankings()
  const { prediction, loading: predicting, runPrediction } = usePrediction()
  const [trends, setTrends] = useState<Record<string, Trend>>({})
  // A fighter chosen in the Trending or Pound-for-pound cards opens in place, so closing it leaves you where you were.
  const [profileName, setProfileName] = useState<string | null>(null)

  const nextEvent = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return events.find((event) => event.date && event.date >= today) ?? events[0] ?? null
  }, [events])

  const mainEvent: FightResult | null = nextEvent?.fights[0] ?? null
  const fighterA = mainEvent?.fighter_1 ?? null
  const fighterB = mainEvent?.fighter_2 ?? null

  useEffect(() => {
    if (!fighterA || !fighterB) return

    void runPrediction(fighterA, fighterB)

    Promise.all([getFighterPerformance(fighterA), getFighterPerformance(fighterB)])
      .then(([performanceA, performanceB]) => {
        setTrends({
          [fighterA]: computeTrend(performanceA),
          [fighterB]: computeTrend(performanceB),
        })
      })
      .catch((requestError) => {
        console.error(requestError)
      })
  }, [fighterA, fighterB, runPrediction])

  const p4pRankings = rankings.find((category) => category.is_p4p) ?? null
  const systemError = modelError ?? eventsError

  const metrics = shownMetrics(modelInfo, i18n.language)

  return (
    <div className="space-y-8 sm:space-y-10">
      {systemError ? (
        <p className="flex items-center gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 px-3 py-2 text-sm text-[var(--text-primary)]">
          <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--text-red)]" />
          {systemError}
        </p>
      ) : null}

      <NextFightHero
        loading={eventsLoading}
        error={eventsError}
        nextEvent={nextEvent}
        mainEvent={mainEvent}
        predictedWinner={prediction?.predicted_winner ?? null}
        probabilityA={prediction?.fighter_a_probability ?? null}
        probability={prediction?.probability ?? null}
        confidence={prediction?.data_confidence}
        predicting={predicting}
      />

      <StatsStrip
        fightsAnalyzed={health?.fights_tracked ?? null}
        fightersTracked={health?.fighters_loaded ?? null}
        dataThrough={dataInfo?.last_updated ?? null}
        testAccuracy={metrics.accuracy}
        testNote={metrics.caption}
        liveAccuracy={trackRecord?.accuracy ?? null}
        resolved={trackRecord?.resolved ?? null}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <TrendingCard mainEvent={mainEvent} trends={trends} onOpenProfile={setProfileName} />
        <RankingsCard category={p4pRankings} loading={rankingsLoading} error={rankingsError} onOpenProfile={setProfileName} />
      </div>

      <FullCardSection nextEvent={nextEvent} />

      <LatestNewsCard quiet />

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

function computeTrend(performance: FighterPerformance): Trend {
  let streak = 0
  for (let index = performance.career_timeline.length - 1; index >= 0; index -= 1) {
    if (performance.career_timeline[index].result === 'win') {
      streak += 1
    } else {
      break
    }
  }

  const finishes = (performance.method_breakdown['KO/TKO'] ?? 0) + (performance.method_breakdown['Submission'] ?? 0)
  const finishRate = performance.wins > 0 ? finishes / performance.wins : null

  return { streak, finishRate }
}

function formatShortDate(date: string | null, lang: string = 'pt-BR') {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString(localeTag(lang), { month: 'short', day: 'numeric' })
}

function formatFullDate(date: string | null, lang: string = 'pt-BR') {
  if (!date) return L(lang, 'Data a confirmar', 'Date TBA', 'Date à confirmer', 'Fecha por confirmar')
  return new Date(`${date}T00:00:00`).toLocaleDateString(localeTag(lang), { month: 'long', day: 'numeric', year: 'numeric' })
}

/** The top of the page: the next event, then its main event as two corners with the model's estimate under them. */
function NextFightHero({
  loading,
  error,
  nextEvent,
  mainEvent,
  predictedWinner,
  probabilityA,
  probability,
  confidence,
  predicting,
}: {
  loading: boolean
  error: string | null
  nextEvent: { name: string; date: string | null; fight_count: number } | null
  mainEvent: FightResult | null
  predictedWinner: string | null
  probabilityA: number | null
  probability: number | null
  confidence: DataConfidence | null | undefined
  predicting: boolean
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const lookup = useFighterLookup()
  const { imageByName } = useFighterImages()
  const fight = !loading && !error && nextEvent ? mainEvent : null
  const photo = (name: string) => (
    <FighterAvatar name={name} imageUrl={getFighterImageUrl(name, imageByName, lookup(name)?.image_url)} className={cornerPhotoClass} />
  )

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="min-w-0 max-w-[760px]">
          <Eyebrow>
            {fight
              ? t('home.nextCard', 'Upcoming event')
              : L(lang, 'Estatísticas e previsões do UFC', 'UFC stats and predictions', 'Statistiques et pronostics UFC', 'Estadísticas y pronósticos de la UFC')}
          </Eyebrow>
          <h1 className="mt-1 text-[40px] leading-none sm:text-[52px]">{fight && nextEvent ? nextEvent.name : 'Vektor MMA'}</h1>
          {fight && nextEvent ? (
            <p className="mt-2 text-base text-[var(--muted)]">
              {formatFullDate(nextEvent.date, lang)} · {nextEvent.fight_count} {L(lang, 'lutas', 'fights', 'combats', 'peleas')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 max-xs:w-full">
          {fight && nextEvent ? (
            <Link
              to={`/matchup-intelligence?a=${encodeURIComponent(fight.fighter_1)}&b=${encodeURIComponent(fight.fighter_2)}&event=${encodeURIComponent(nextEvent.name)}`}
              className="primary-action inline-flex min-h-[52px] items-center justify-center px-7 !text-[17px] max-xs:w-full"
            >
              {L(lang, 'Ver a análise da luta', 'See the fight analysis', 'Voir l’analyse du combat', 'Ver el análisis de la pelea')}
            </Link>
          ) : null}
          <Link to="/predictor" className={`${fight ? 'ghost-action' : 'primary-action'} inline-flex min-h-[52px] items-center justify-center px-7 !text-[17px] max-xs:w-full`}>
            {L(lang, 'Simular uma luta', 'Predict a fight', 'Pronostiquer un combat', 'Pronosticar una pelea')}
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton className="mt-8 h-[460px]" />
      ) : !fight ? (
        <p className="mt-8 bg-[var(--panel)] px-6 py-10 text-base text-[var(--muted)]">
          {error ?? L(lang, 'Nenhum evento do UFC marcado no momento. Veja os eventos anteriores em Eventos.', 'No UFC event is booked right now. Past cards are under Events.', 'Aucun événement UFC n’est programmé pour le moment. Les cartes passées sont dans Événements.', 'No hay eventos de la UFC programados por ahora. Las carteleras anteriores están en Eventos.')}
        </p>
      ) : (
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-[17px] font-bold">{t('home.mainEvent', 'Main event')}</p>
            {/* The title badge already names the division. */}
            {fight.weight_class && !fight.title_fight && !fight.interim_title ? <p className="text-base text-[var(--muted)]">{getDivisionName(fight.weight_class, lang)}</p> : null}
            <TitleFightBadge fight={fight} />
          </div>
          <CornerSplit
            headingLevel="h2"
            red={{ name: fight.fighter_1, label: L(lang, 'Canto vermelho', 'Red corner', 'Coin rouge', 'Esquina roja'), photo: photo(fight.fighter_1) }}
            blue={{ name: fight.fighter_2, label: L(lang, 'Canto azul', 'Blue corner', 'Coin bleu', 'Esquina azul'), photo: photo(fight.fighter_2) }}
          />
          {predicting ? (
            <p className="flex h-[84px] items-center bg-[var(--panel)] px-7 text-base text-[var(--muted)]" role="status">
              {L(lang, 'Calculando a chance de vitória…', 'Working out the win chance…', 'Calcul de la chance de victoire…', 'Calculando la probabilidad de victoria…')}
            </p>
          ) : probabilityA != null ? (
            <>
              <ProbabilityBand nameA={fight.fighter_1} nameB={fight.fighter_2} probabilityA={probabilityA} />
              {predictedWinner && probability != null ? <p className="mt-4 max-w-[70ch] text-base sm:text-lg">{predictionSentence(lang, predictedWinner, probability)}</p> : null}
              {confidence ? (
                <div className="mt-3 max-w-[70ch]">
                  <DataConfidenceNote confidence={confidence} />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </section>
  )
}

function FullCardSection({ nextEvent }: { nextEvent: EventSummary | null }) {
  const { t, i18n } = useTranslation()
  const pickFor = useUpcomingPicks()
  if (!nextEvent || nextEvent.fights.length <= 1) return null

  const restOfCard = nextEvent.fights.slice(1)

  return (
    <Section
      icon={ListOrdered}
      title={t('home.restOfCard', { count: restOfCard.length, defaultValue: `Rest of the card • ${restOfCard.length} fights` })}
      action={
        <Link to="/events" className={sectionActionClass}>
          {L(i18n.language, 'Ver card completo', 'See the full card', 'Voir la carte complète', 'Ver la cartelera completa')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {restOfCard.map((fight, index) => (
          <FightMatchupCard
            key={index}
            fight={fight}
            eventName={nextEvent.name}
            pick={pickFor(nextEvent.name, fight.fighter_1, fight.fighter_2)}
          />
        ))}
      </div>
    </Section>
  )
}

function TrendingCard({
  mainEvent,
  trends,
  onOpenProfile,
}: {
  mainEvent: FightResult | null
  trends: Record<string, Trend>
  onOpenProfile: (name: string) => void
}) {
  const { t } = useTranslation()
  if (!mainEvent) return null

  return (
    <Section rows icon={TrendingUp} title={t('home.trending', 'Trending')}>
      <ul className="divide-y divide-[var(--border-subtle)]">
        <li>
          <TrendRow name={mainEvent.fighter_1} trend={trends[mainEvent.fighter_1]} onOpenProfile={onOpenProfile} />
        </li>
        <li>
          <TrendRow name={mainEvent.fighter_2} trend={trends[mainEvent.fighter_2]} onOpenProfile={onOpenProfile} />
        </li>
      </ul>
    </Section>
  )
}

/** A row of a list that sits on the page background; the hover fill bleeds a little past the text column. */
const ROW = '-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-control px-2 py-2.5 text-left'
const CLICKABLE_ROW = 'cursor-pointer transition-colors hover:bg-[var(--bg-surface-hover)]'

function TrendRow({
  name,
  trend,
  onOpenProfile,
}: {
  name: string
  trend: Trend | undefined
  onOpenProfile: (name: string) => void
}) {
  const { t, i18n } = useTranslation()
  const profile = useFighterLookup()(name)
  const { imageByName } = useFighterImages()
  if (!trend) return <LoadingSkeleton className="my-1.5 h-[52px]" />

  const content = (
    <>
      <FighterAvatar
        name={name}
        imageUrl={getFighterImageUrl(name, imageByName, profile?.image_url)}
        className="h-10 w-9"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[var(--text-primary)]">{name}</span>
        <span className="mt-0.5 block text-xs leading-4 text-[var(--text-muted)]">
          {trend.streak > 0 ? (
            <span className="text-[var(--text-red)]">↑ {trend.streak} {t('home.winStreak', 'fight win streak')}</span>
          ) : (
            <span>{L(i18n.language, 'Vindo de derrota', 'Coming off a loss', 'Sort d’une défaite', 'Viene de una derrota')}</span>
          )}
          {trend.finishRate != null ? ` • ${Math.round(trend.finishRate * 100)}% ${t('home.finishRate', 'finish rate')}` : ''}
        </span>
      </span>
    </>
  )
  const box = ROW

  // Only fighters we have a profile for open one; anyone else stays a plain row.
  return profile ? (
    <button type="button" onClick={() => onOpenProfile(profile.name)} aria-label={L(i18n.language, `${name}. Ver perfil`, `${name}. View profile`, `${name}. Voir le profil`, `${name}. Ver perfil`)} className={`${box} ${CLICKABLE_ROW}`}>
      {content}
    </button>
  ) : (
    <div className={box}>{content}</div>
  )
}

function RankingsCard({
  category,
  loading,
  error,
  onOpenProfile,
}: {
  category: { entries: { rank: number; fighter: string }[] } | null
  loading: boolean
  error: string | null
  onOpenProfile: (name: string) => void
}) {
  const { t, i18n } = useTranslation()
  const lookup = useFighterLookup()
  const { imageByName } = useFighterImages()
  return (
    <Section
      rows
      icon={Trophy}
      title={t('home.poundForPound', 'Pound-for-pound')}
      action={
        <Link to="/rankings" className={sectionActionClass}>
          {L(i18n.language, 'Ver todos', 'View all', 'Tout voir', 'Ver todos')}
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
      ) : error ? (
        <p role="alert" className="error-note">{error}</p>
      ) : category ? (
        <ol className="divide-y divide-[var(--border-subtle)]">
          {category.entries.slice(0, 3).map((entry) => {
            const profile = lookup(entry.fighter)
            const content = (
              <>
                <span className="w-5 shrink-0 text-center font-display text-base font-bold tabular-nums text-[var(--text-red)]">{entry.rank}</span>
                <FighterAvatar
                  name={entry.fighter}
                  imageUrl={getFighterImageUrl(entry.fighter, imageByName, profile?.image_url)}
                  className="h-10 w-9"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--text-primary)]">{entry.fighter}</span>
                {profile ? <FighterBadges badges={badgesForRankings(profile.badges)} /> : null}
              </>
            )
            return (
              <li key={entry.rank}>
                {profile ? (
                  <button
                    type="button"
                    onClick={() => onOpenProfile(profile.name)}
                    aria-label={L(i18n.language, `${entry.fighter}, posição ${entry.rank}. Ver perfil`, `${entry.fighter}, rank ${entry.rank}. View profile`, `${entry.fighter}, rang ${entry.rank}. Voir le profil`, `${entry.fighter}, puesto ${entry.rank}. Ver perfil`)}
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
        <p className="text-sm text-[var(--text-muted)]">{L(i18n.language, 'Rankings indisponíveis no momento.', 'Rankings unavailable right now.', 'Classements indisponibles pour le moment.', 'El ranking no está disponible por ahora.')}</p>
      )}
    </Section>
  )
}

function percentLabel(value: number | null | undefined) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

/** The numbers behind the site, in one open row: no boxes, a rule between columns on wide screens. */
function StatsStrip({
  fightsAnalyzed,
  fightersTracked,
  dataThrough,
  testAccuracy,
  testNote,
  liveAccuracy,
  resolved,
}: {
  fightsAnalyzed: number | null
  fightersTracked: number | null
  dataThrough: string | null
  testAccuracy: number | null
  testNote: string
  liveAccuracy: number | null
  resolved: number | null
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const live = Boolean(resolved && resolved > 0 && liveAccuracy != null)
  const count = (value: number | null) => (value ? value.toLocaleString(localeTag(lang)) : '—')
  const column = 'lg:border-l lg:border-[var(--border-subtle)] lg:pl-6'

  return (
    <section
      aria-label={L(lang, 'Números do modelo', 'The model in numbers', 'Le modèle en chiffres', 'El modelo en números')}
      className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-center"
    >
      <Stat
        label={L(lang, 'Acerto do modelo', 'Model hit rate', 'Réussite du modèle', 'Acierto del modelo')}
        value={percentLabel(live ? liveAccuracy : testAccuracy)}
        note={live ? L(lang, 'palpites ao vivo', 'live picks', 'pronostics en direct', 'pronósticos en vivo') : testNote}
      />
      <div className={column}>
        <Stat
          label={L(lang, 'Lutas analisadas', 'Fights analyzed', 'Combats analysés', 'Peleas analizadas')}
          value={count(fightsAnalyzed)}
          note={L(lang, 'histórico oficial do UFC', 'career bouts on file', 'combats de carrière au dossier', 'peleas de carrera registradas')}
        />
      </div>
      <div className={column}>
        <Stat label={L(lang, 'Lutadores na base', 'Fighters tracked', 'Combattants suivis', 'Peleadores registrados')} value={count(fightersTracked)} />
      </div>
      <div className={column}>
        <Stat label={L(lang, 'Dados até', 'Data through', 'Données jusqu’au', 'Datos hasta')} value={dataThrough ? formatShortDate(dataThrough, lang) : '—'} />
      </div>
      <Link to="/track-record" className={`${sectionActionClass} col-span-2 lg:col-span-1`}>
        {L(lang, 'Histórico completo', 'Track record', 'Bilan du modèle', 'Historial de aciertos')}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}
