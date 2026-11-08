import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronsRight, Crown, Dumbbell, RotateCcw, Scale, Swords } from 'lucide-react'

import { L, pick } from '../../i18n/lang'
import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { FlagList } from '../../shared/components/FighterBadges'
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton'
import { planNudge, titleShotAvailable, type Career, type Plan, type PlayerStats } from '../../shared/game/career'
import { BAND_LABELS, chanceBand } from '../../shared/game/labels'
import { getMatchmaking } from '../../shared/services/api'
import type { GameOpponent, MatchmakingResponse } from '../../shared/types/api'
import { HeadToHead } from './HeadToHead'
import { Chip, GhostButton, PrimaryButton, useFocusOnMount } from './ui'

interface Offers {
  player: MatchmakingResponse['player']
  opponents: GameOpponent[]
  title: GameOpponent | null
  rival: GameOpponent | null
}

function fighterPayload(career: Career) {
  return { striking: career.striking, takedowns: career.takedowns, reach: career.reach, age: career.age, wins: career.wins, losses: career.losses, draws: career.draws, stance: career.stance }
}

async function loadOffers(career: Career, seed: number): Promise<Offers> {
  const base = { fighter: fighterPayload(career), division: career.division, seed }
  const [regular, title, rival] = await Promise.all([
    getMatchmaking({ ...base, exclude: career.fought }),
    titleShotAvailable(career) ? getMatchmaking({ ...base, title: true }) : null,
    career.rival ? getMatchmaking({ ...base, names: [career.rival] }) : null,
  ])
  let opponents = regular.opponents
  // Everyone in the division has been fought: start the list again rather than leave the player with nothing.
  if (!opponents.length) opponents = (await getMatchmaking(base)).opponents
  const rivalOffer = rival?.opponents[0] ?? null
  return {
    player: regular.player,
    opponents: opponents.filter((offer) => offer.name !== rivalOffer?.name),
    title: title?.opponents[0] ?? null,
    rival: rivalOffer,
  }
}

const BANDS = ['longshot', 'underdog', 'even', 'favorite'] as const

/** Four notches from "long shot" to "favorite", with the fight's notch lit. */
function Gauge({ chance }: { chance: number }) {
  const { i18n } = useTranslation()
  const band = chanceBand(chance)
  const lit = BANDS.indexOf(band)
  const tone = band === 'favorite' ? 'bg-[var(--accent-green)]' : band === 'even' ? 'bg-[var(--accent-gold)]' : 'bg-[var(--accent-red)]'
  return (
    <div>
      <div className="flex gap-1" aria-hidden="true">
        {BANDS.map((name, index) => (
          <span key={name} className={`h-1.5 flex-1 rounded-full ${index <= lit ? tone : 'bg-[var(--border-subtle)]'}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-main)]">{pick(i18n.language, BAND_LABELS[band])}</p>
    </div>
  )
}

function OfferCard({ offer, selected, onChoose, heading }: { offer: GameOpponent; selected: boolean; onChoose: () => void; heading?: ReactNode }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <button type="button" aria-pressed={selected} onClick={onChoose} className="game-pick flex w-full items-center gap-3 p-3 text-left sm:gap-4 sm:p-4">
      <FighterAvatar name={offer.name} imageUrl={offer.image_url} className="h-16 w-16 sm:h-20 sm:w-20" highlight={offer.champion} />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        {heading ? <span className="flex">{heading}</span> : null}
        <span className="min-w-0">
          <span className="line-clamp-2 break-words font-display text-base font-extrabold uppercase leading-tight text-[var(--text-main)] sm:text-lg">{offer.name}</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <FlagList fighter={{ country_code: offer.country_code }} />
            <span className="data-value text-sm font-bold text-[var(--text-main)]">{offer.record}</span>
          </span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {offer.age ? <Chip>{L(lang, `${Math.floor(offer.age)} anos`, `age ${Math.floor(offer.age)}`, `${Math.floor(offer.age)} ans`, `${Math.floor(offer.age)} años`)}</Chip> : null}
          {offer.reach_cm ? <Chip>{L(lang, 'Alcance', 'Reach', 'Allonge', 'Alcance')} {Math.round(offer.reach_cm)} cm</Chip> : null}
          {offer.ranking ? <Chip tone="gold">{L(lang, 'Ranqueado', 'Ranked', 'Classé', 'En el ranking')} #{offer.ranking}</Chip> : null}
          {offer.champion ? <Chip tone="gold">{L(lang, 'Campeão', 'Champion', 'Champion', 'Campeón')}</Chip> : null}
        </span>
        <Gauge chance={offer.win_probability} />
      </span>
    </button>
  )
}

/** The fights on offer, and a game plan for the one the player takes. */
export function OffersStep({ career, seed, onFight, onRetire, canRetire }: { career: Career; seed: number; onFight: (offer: GameOpponent, plan: Plan, player: PlayerStats, quick?: boolean) => void; onRetire: () => void; canRetire: boolean }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [offers, setOffers] = useState<Offers | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [chosen, setChosen] = useState<GameOpponent | null>(null)
  const [plan, setPlan] = useState<Plan>('balanced')
  const heading = useFocusOnMount<HTMLHeadingElement>()

  useEffect(() => {
    let active = true
    setOffers(null)
    setError(false)
    setChosen(null)
    loadOffers(career, seed)
      .then((data) => active && setOffers(data))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
    // The career is the one the camp just produced: the offers are asked for once per camp (seed) and per retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, attempt])

  const plans: { value: Plan; label: string; hint: string; icon: ReactNode }[] = [
    { value: 'striking', icon: <Swords className="h-5 w-5" aria-hidden="true" />, label: L(lang, 'Trocação', 'Striking', 'Striking', 'Striking'), hint: L(lang, 'Favorece nocautes.', 'Favors knockouts.', 'Favorise les KO.', 'Favorece los nocauts.') },
    { value: 'grappling', icon: <Dumbbell className="h-5 w-5" aria-hidden="true" />, label: L(lang, 'Grappling', 'Grappling', 'Grappling', 'Grappling'), hint: L(lang, 'Favorece finalizações.', 'Favors submissions.', 'Favorise les soumissions.', 'Favorece las sumisiones.') },
    { value: 'balanced', icon: <Scale className="h-5 w-5" aria-hidden="true" />, label: L(lang, 'Equilibrado', 'Balanced', 'Équilibré', 'Equilibrado'), hint: L(lang, 'Sem risco extra.', 'No extra risk.', 'Sans risque supplémentaire.', 'Sin riesgo extra.') },
  ]

  return (
    <section className="surface-card rounded-2xl space-y-5 p-4 sm:space-y-6 sm:p-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-red)]">{L(lang, 'Matchmaking', 'Matchmaking', 'Matchmaking', 'Matchmaking')}</p>
        <h2 ref={heading} tabIndex={-1} className="game-title mt-1 text-xl focus:outline-none sm:text-3xl">
          {career.champion
            ? L(lang, 'Defesa de cinturão: escolha o desafiante', 'Title defense: choose the challenger', 'Défense de ceinture : choisissez le challenger', 'Defensa del cinturón: elige al retador')
            : L(lang, 'Escolha seu próximo adversário', 'Choose your next opponent', 'Choisissez votre prochain adversaire', 'Elige a tu próximo rival')}
        </h2>
        {career.scouted ? (
          <div className="mt-2">
            <Chip tone="gold">{L(lang, 'Estudo de vídeo: +2 pontos de chance na luta', 'Film study: +2 points of chance in the fight', 'Étude vidéo : +2 points de chances au combat', 'Estudio de video: +2 puntos de probabilidad en la pelea')}</Chip>
          </div>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-red)]">{L(lang, 'Não foi possível montar as lutas. O servidor pode estar acordando.', 'The fights could not be set up. The server may be waking up.', 'Impossible de préparer les combats. Le serveur est peut-être en train de se réveiller.', 'No se pudieron preparar las peleas. Es posible que el servidor esté despertando.')}</p>
          <GhostButton onClick={() => setAttempt((value) => value + 1)}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {L(lang, 'Tentar de novo', 'Try again', 'Réessayer', 'Intentar de nuevo')}
          </GhostButton>
        </div>
      ) : !offers ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {offers.title ? (
            <OfferCard
              offer={offers.title}
              selected={chosen?.name === offers.title.name}
              onChoose={() => setChosen(offers.title)}
              heading={
                <Chip tone="gold">
                  <Crown className="h-3 w-3" aria-hidden="true" />
                  {L(lang, 'Disputa de cinturão', 'Title shot', 'Combat pour la ceinture', 'Pelea por el cinturón')}
                </Chip>
              }
            />
          ) : null}
          {offers.rival ? <OfferCard offer={offers.rival} selected={chosen?.name === offers.rival.name} onChoose={() => setChosen(offers.rival)} heading={<Chip tone="red">{L(lang, 'Revanche', 'Rematch', 'Revanche', 'Revancha')}</Chip>} /> : null}
          {offers.opponents.map((offer) => (
            <OfferCard key={offer.name} offer={offer} selected={chosen?.name === offer.name} onChoose={() => setChosen(offer)} />
          ))}
        </div>
      )}

      {chosen && offers ? (
        <div className="space-y-4 border-t border-[var(--border-subtle)] pt-5">
          <HeadToHead career={career} player={offers.player} opponent={chosen} />
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{L(lang, 'Plano de luta', 'Game plan', 'Plan de combat', 'Plan de pelea')}</legend>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {plans.map((option) => {
                const edge = planNudge(option.value, offers.player, chosen) > 0.005
                return (
                  <button key={option.value} type="button" aria-pressed={plan === option.value} onClick={() => setPlan(option.value)} className="game-pick flex h-full flex-col gap-2 p-3 text-left sm:p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-red)]/12 text-[var(--text-red)]">{option.icon}</span>
                    <span>
                      <span className="block text-xs font-bold text-[var(--text-main)] sm:text-sm">{option.label}</span>
                      <span className="block text-[11px] leading-4 text-[var(--text-secondary)] sm:text-xs sm:leading-5">
                        {option.hint}
                        {edge ? ` ${L(lang, 'Você tem a vantagem aqui.', 'You have the edge here.', 'Vous avez l’avantage ici.', 'Tienes la ventaja aquí.')}` : ''}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={() => onFight(chosen, plan, offers.player)}>
                {L(lang, `Lutar contra ${chosen.name}`, `Fight ${chosen.name}`, `Combattre ${chosen.name}`, `Pelear contra ${chosen.name}`)}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PrimaryButton>
              {/* The same fight with the plan unchanged in every round, played at once: what "Skip to the result" does on the fight screen. */}
              <GhostButton onClick={() => onFight(chosen, plan, offers.player, true)}>
                <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                {L(lang, 'Lutar e ir direto ao resultado', 'Fight and skip to the result', 'Combattre et passer au résultat', 'Pelear e ir al resultado')}
              </GhostButton>
            </div>
          </fieldset>
        </div>
      ) : null}

      {canRetire ? (
        <button type="button" onClick={onRetire} className="min-h-11 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--accent-red)]">
          {L(lang, 'Aposentar agora', 'Retire now', 'Prendre sa retraite maintenant', 'Retirarme ahora')}
        </button>
      ) : null}
    </section>
  )
}
