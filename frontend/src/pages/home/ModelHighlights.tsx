import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { L } from '../../i18n/lang'
import { redCornerProbability } from '../../shared/components/FightMatchupCard'
import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { predictionSentence } from '../../shared/components/ui/ProbabilityBand'
import { ProbabilitySplit } from '../../shared/components/ui/ProbabilitySplit'
import { getFighterImageUrl, useFighterImages } from '../../shared/hooks/useFighterImages'
import { useFighterLookup } from '../../shared/hooks/useFighterLookup'
import type { EventSummary, FightResult, UpcomingPick } from '../../shared/types/api'

type PickFor = (event: string, fighterA: string, fighterB: string) => UpcomingPick | undefined
type Scored = { fight: FightResult; pick: UpcomingPick }

const isTbd = (name: string) => ['TBD', 'TBA'].includes(name.toUpperCase())

/**
 * The card's surest pick and its closest fight, from the picks the model has with enough data behind them. The main event
 * is left out: the hero right above already shows it.
 */
export function cardHighlights(event: EventSummary, pickFor: PickFor): { surest: Scored; closest: Scored } | null {
  const scored = event.fights
    .slice(1)
    .filter((fight) => !isTbd(fight.fighter_1) && !isTbd(fight.fighter_2))
    .map((fight) => ({ fight, pick: pickFor(event.name, fight.fighter_1, fight.fighter_2) }))
    .filter((entry): entry is Scored => Boolean(entry.pick && entry.pick.data_level !== 'thin'))
  if (scored.length < 2) return null
  const surest = scored.reduce((best, entry) => (entry.pick.probability > best.pick.probability ? entry : best))
  const closest = scored.reduce((best, entry) => (entry.pick.probability < best.pick.probability ? entry : best))
  return surest === closest ? null : { surest, closest }
}

/** Two mini-cards under the hero: where the model is surest and where it can barely separate the fighters. */
export function ModelHighlights({ event, pickFor }: { event: EventSummary | null; pickFor: PickFor }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const highlights = event ? cardHighlights(event, pickFor) : null
  if (!event || !highlights) return null

  return (
    <section aria-label={L(lang, 'Destaques do modelo neste card', 'Model highlights on this card', 'Points forts du modèle sur cette carte', 'Lo destacado del modelo en esta cartelera')}>
      <div className="grid gap-4 md:grid-cols-2">
        <HighlightCard
          eventName={event.name}
          entry={highlights.surest}
          label={L(lang, 'Previsão mais segura', 'Surest pick', 'Pronostic le plus sûr', 'Pronóstico más seguro')}
          note={L(lang, 'A maior chance de vitória estimada pelo modelo no card', 'The highest win chance the model gives on the card', 'La plus forte chance de victoire donnée par le modèle sur la carte', 'La mayor probabilidad de victoria que da el modelo en la cartelera')}
        />
        <HighlightCard
          eventName={event.name}
          entry={highlights.closest}
          label={L(lang, 'Luta mais equilibrada', 'Closest fight', 'Combat le plus serré', 'Pelea más pareja')}
          note={L(lang, 'Onde o modelo menos separa os dois lutadores', 'Where the model can least tell the two apart', 'Là où le modèle départage le moins les deux combattants', 'Donde el modelo menos separa a los dos peleadores')}
        />
      </div>
    </section>
  )
}

function HighlightCard({ eventName, entry, label, note }: { eventName: string; entry: Scored; label: string; note: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { fight, pick } = entry
  const lookup = useFighterLookup()
  const { imageByName } = useFighterImages()
  const params = new URLSearchParams({ a: fight.fighter_1, b: fight.fighter_2, event: eventName })
  const photo = (name: string, rule: string) => (
    <FighterAvatar name={name} imageUrl={getFighterImageUrl(name, imageByName, lookup(name)?.image_url)} className={`h-12 w-11 border-b-4 ${rule}`} />
  )

  return (
    <Link
      to={`/predictor?${params.toString()}`}
      className="flex flex-col gap-3 border-t-4 border-[var(--ink)] bg-[var(--panel)] p-4 hover:bg-[var(--panel-hover)] sm:p-5"
    >
      <span>
        <span className="block font-display text-2xl font-black leading-none">{label}</span>
        <span className="mt-1 block text-sm text-[var(--muted)]">{note}</span>
      </span>
      <span className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
        {photo(fight.fighter_1, 'border-b-[var(--red)]')}
        <span className="min-w-0 truncate font-display text-lg font-extrabold">{fight.fighter_1}</span>
        <span className="font-display font-black text-[var(--muted)]">vs</span>
        <span className="min-w-0 truncate text-right font-display text-lg font-extrabold">{fight.fighter_2}</span>
        {photo(fight.fighter_2, 'border-b-[var(--blue)]')}
      </span>
      <span role="img" aria-label={predictionSentence(lang, pick.predicted_winner, pick.probability)}>
        <ProbabilitySplit probabilityA={redCornerProbability(fight, pick)} />
      </span>
    </Link>
  )
}
