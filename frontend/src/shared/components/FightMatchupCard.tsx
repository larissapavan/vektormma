import { Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { getFighterImageUrl, normalizeFighterName, useFighterImages } from '../hooks/useFighterImages'
import { useFighterLookup } from '../hooks/useFighterLookup'
import type { FightResult, UpcomingPick } from '../types/api'
import { getMatchupTitleFight } from '../data/titleFights'
import { getDivisionName } from '../data/divisions'
import { edgeLabel, isEvenProbability, noFavoriteText } from '../data/probability'
import { FighterAvatar } from './FighterAvatar'
import { TitleFightBadge } from './FighterBadges'
import { FighterRecord } from './FighterRecord'
import { predictionSentence } from './ui/ProbabilityBand'
import { ProbabilitySplit } from './ui/ProbabilitySplit'

function matchupPath(fight: FightResult, eventName?: string) {
  const params = new URLSearchParams({ a: fight.fighter_1, b: fight.fighter_2 })
  if (eventName) params.set('event', eventName)
  return `/predictor?${params.toString()}`
}

function isTbdName(name: string | null | undefined) {
  const upper = name?.toUpperCase()
  return upper === 'TBD' || upper === 'TBA'
}

/** The red corner's chance, whichever order the pick lists the two fighters in. */
function redCornerProbability(fight: FightResult, pick: UpcomingPick) {
  const sameOrder = normalizeFighterName(pick.fighter_1) === normalizeFighterName(fight.fighter_1)
  return sameOrder ? pick.fighter_1_probability : 1 - pick.fighter_1_probability
}

/** Shared fight card: photo, name and record on each corner, the model's estimate large underneath. */
export function FightMatchupCard({
  fight,
  pick,
  eventName,
  onOpenFighter,
  details,
}: {
  fight: FightResult
  pick?: UpcomingPick
  eventName?: string
  onOpenFighter?: (name: string) => void
  details?: string[]
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const to = matchupPath(fight, eventName)
  const fighter1Won = fight.winner != null && fight.winner === fight.fighter_1
  const fighter2Won = fight.winner != null && fight.winner === fight.fighter_2
  const fallback = getMatchupTitleFight(
    { name: fight.fighter_1, division: fight.weight_class ?? undefined },
    { name: fight.fighter_2, division: fight.weight_class ?? undefined },
  )
  const titleFightInfo = {
    ...fight,
    title_fight: fight.title_fight ?? pick?.title_fight ?? fallback?.title_fight,
    interim_title: fight.interim_title ?? pick?.interim_title ?? fallback?.interim_title,
    bmf_title: fight.bmf_title ?? pick?.bmf_title,
    weight_class: fight.weight_class ?? fallback?.weight_class ?? null,
  }

  const weightClassDisplay = fight.weight_class ? getDivisionName(fight.weight_class, lang) : null
  const isTbdMatchup = isTbdName(fight.fighter_1) || isTbdName(fight.fighter_2)
  const probabilityA = pick && !isTbdMatchup ? redCornerProbability(fight, pick) : null
  const thin = pick?.data_level === 'thin'

  return (
    <article className="relative flex flex-col gap-4 border-t-4 border-[var(--ink)] bg-[var(--panel)] p-4 hover:bg-[var(--panel-hover)] sm:p-5">
      {!isTbdMatchup && <Link to={to} aria-label={`${fight.fighter_1} vs ${fight.fighter_2}`} className="absolute inset-0 z-0" />}

      {weightClassDisplay || titleFightInfo.title_fight || titleFightInfo.bmf_title ? (
        <div className="pointer-events-none relative z-10 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
          <span>{weightClassDisplay}</span>
          <TitleFightBadge fight={titleFightInfo} />
        </div>
      ) : null}

      <div className="pointer-events-none relative z-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3">
        <Corner name={fight.fighter_1} side="red" won={fighter1Won} onOpenFighter={onOpenFighter} />
        <span className="self-center pt-2 font-display text-lg font-black text-[var(--muted)]">vs</span>
        <Corner name={fight.fighter_2} side="blue" won={fighter2Won} onOpenFighter={onOpenFighter} />
      </div>

      {probabilityA != null && pick ? (
        <div
          role="img"
          className="pointer-events-none relative z-10"
          aria-label={
            isEvenProbability(pick.probability)
              ? noFavoriteText(lang)
              : `${predictionSentence(lang, pick.predicted_winner, pick.probability)} ${edgeLabel(pick.probability, lang)}.`
          }
          title={L(
            lang,
            'Chance de vitória estimada pelo modelo a partir dos números de cada lutador. Não é recomendação de aposta.',
            "Win chance estimated by the model from each fighter's numbers. Not betting advice.",
            'Chance de victoire estimée par le modèle à partir des chiffres de chaque combattant. Ce n’est pas un conseil de pari.',
            'Probabilidad de victoria estimada por el modelo a partir de los números de cada peleador. No es un consejo de apuestas.',
          )}
        >
          <ProbabilitySplit probabilityA={probabilityA} faded={thin} />
          <p className="mt-2 text-center text-sm text-[var(--muted)]" aria-hidden="true">
            {isEvenProbability(pick.probability) ? noFavoriteText(lang) : edgeLabel(pick.probability, lang)}
            {thin
              ? ` · ${L(lang, 'poucos dados', 'little data', 'peu de données', 'pocos datos')}`
              : null}
          </p>
        </div>
      ) : isTbdMatchup ? (
        <p className="relative z-10 text-center">
          <span className="inline-block border-[1.5px] border-[var(--ink)] px-2.5 py-1 text-[13px] font-bold">
            {L(lang, 'Adversário a definir', 'Opponent to be named', 'Adversaire à déterminer', 'Rival por definir')}
          </span>
        </p>
      ) : null}

      {details?.length ? (
        <div className="pointer-events-none relative z-10 space-y-0.5 text-center text-sm leading-5 text-[var(--muted)]">
          {details.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function Corner({
  name,
  side,
  won,
  onOpenFighter,
}: {
  name: string
  side: 'red' | 'blue'
  won: boolean
  onOpenFighter?: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const lookup = useFighterLookup()
  const { imageByName } = useFighterImages()
  const profile = lookup(name)
  const right = side === 'blue'
  const align = right ? 'items-end text-right' : 'items-start text-left'
  const rule = right ? 'border-b-[var(--blue)]' : 'border-b-[var(--red)]'

  if (isTbdName(name)) {
    return (
      <div className={`flex min-w-0 flex-col gap-2 ${align}`}>
        <span className={`grid h-16 w-14 select-none place-items-center border-[1.5px] border-dashed border-[var(--muted)] font-display text-xl font-bold text-[var(--muted)] sm:h-20 sm:w-16`}>
          ?
        </span>
        <span className="text-sm font-bold text-[var(--muted)]">{L(lang, 'A definir', 'To be named', 'À déterminer', 'Por definir')}</span>
      </div>
    )
  }

  const trophy = won ? <Trophy className="h-4 w-4 shrink-0 text-[var(--gold)]" aria-label={L(lang, 'Venceu', 'Won', 'A gagné', 'Ganó')} /> : null
  const nameLabel = (
    <span className={`flex min-w-0 items-center gap-1.5 ${right ? 'justify-end' : 'justify-start'}`}>
      {!right && trophy}
      <span className={`min-w-0 break-words font-display text-lg leading-[1.05] text-[var(--ink)] [hyphens:auto] sm:text-xl ${won ? 'font-black' : 'font-extrabold'}`}>
        {name}
      </span>
      {right && trophy}
    </span>
  )

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${align}`}>
      <FighterAvatar
        name={name}
        imageUrl={getFighterImageUrl(name, imageByName, profile?.image_url)}
        className={`h-16 w-14 border-b-4 ${rule} sm:h-20 sm:w-16`}
      />
      {profile && onOpenFighter ? (
        <button
          type="button"
          onClick={() => onOpenFighter(profile.name)}
          aria-label={L(lang, `${name}. Ver perfil`, `${name}. View profile`, `${name}. Voir le profil`, `${name}. Ver perfil`)}
          className={`pointer-events-auto -mx-1 min-h-[44px] max-w-full px-1 ${right ? 'text-right' : 'text-left'}`}
        >
          {nameLabel}
        </button>
      ) : (
        nameLabel
      )}
      {profile ? <FighterRecord fighter={profile} /> : null}
    </div>
  )
}
