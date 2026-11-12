import { Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { getFighterImageUrl, useFighterImages } from '../hooks/useFighterImages'
import { useFighterLookup } from '../hooks/useFighterLookup'
import type { FightResult, UpcomingPick } from '../types/api'
import { getMatchupTitleFight } from '../data/titleFights'
import { getDivisionName } from '../data/divisions'
import { FighterAvatar } from './FighterAvatar'
import { TitleFightBadge } from './FighterBadges'
import { PickChip } from './PickChip'

function matchupPath(fight: FightResult, eventName?: string) {
  const params = new URLSearchParams({ a: fight.fighter_1, b: fight.fighter_2 })
  if (eventName) params.set('event', eventName)
  return `/predictor?${params.toString()}`
}

/** Shared fight row: names and photos on the corners, model reading centered underneath. */
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

  const weightClassDisplay = fight.weight_class ? getDivisionName(fight.weight_class, i18n.language) : null
  const isTbdMatchup = fight.fighter_1?.toUpperCase() === 'TBD' || fight.fighter_2?.toUpperCase() === 'TBD'

  return (
    <article className="relative border-l-4 border-r-4 border-l-[var(--red)] border-r-[var(--blue)] bg-[var(--panel)] px-3 py-3.5 hover:bg-[var(--panel-hover)] sm:px-4">
      {!isTbdMatchup && (
        <Link to={to} aria-label={`${fight.fighter_1} vs ${fight.fighter_2}`} className="absolute inset-0 z-0" />
      )}
      <div className="relative z-10 grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-1.5 xs:gap-x-2 gap-y-1 pointer-events-none">
        <CornerPhoto name={fight.fighter_1} />
        <CornerName name={fight.fighter_1} align="right" won={fighter1Won} onOpenFighter={onOpenFighter} />
        <span className="px-0.5 font-display text-lg font-black text-[var(--muted)]">vs</span>
        <CornerName name={fight.fighter_2} align="left" won={fighter2Won} onOpenFighter={onOpenFighter} />
        <CornerPhoto name={fight.fighter_2} />
      </div>

      <div className="relative z-10 mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 pointer-events-none">
        <TitleFightBadge fight={titleFightInfo} />
        {isTbdMatchup ? (
          <span className="rounded-sm border-[1.5px] border-[var(--ink)] px-2.5 py-1 text-[13px] font-bold">
            {L(i18n.language, 'Adversário a definir', 'Opponent to be named', 'Adversaire à déterminer', 'Rival por definir')}
          </span>
        ) : (
          <span className="pointer-events-auto">
            <PickChip pick={pick} />
          </span>
        )}
        {weightClassDisplay ? <span className="text-sm text-[var(--muted)]">{weightClassDisplay}</span> : null}
      </div>

      {details?.length ? (
        <div className="relative z-10 mt-2 space-y-0.5 text-center text-sm leading-5 text-[var(--muted)] pointer-events-none">
          {details.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function CornerPhoto({ name }: { name: string }) {
  const lookup = useFighterLookup()
  const { imageByName } = useFighterImages()
  const fighter = lookup(name)
  const isTbd = name?.toUpperCase() === 'TBD' || name?.toUpperCase() === 'TBA'

  if (isTbd) {
    return (
      <span className="relative grid h-10 w-9 shrink-0 select-none place-items-center border-[1.5px] border-dashed border-[var(--muted)] font-display text-lg font-bold text-[var(--muted)] sm:h-12 sm:w-10">
        ?
      </span>
    )
  }

  return (
    <FighterAvatar
      name={name}
      imageUrl={getFighterImageUrl(name, imageByName, fighter?.image_url)}
      className="h-10 w-9 sm:h-12 sm:w-10"
    />
  )
}

function CornerName({
  name,
  align,
  won,
  onOpenFighter,
}: {
  name: string
  align: 'left' | 'right'
  won: boolean
  onOpenFighter?: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const profile = useFighterLookup()(name)
  const side = align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
  const isTbd = name?.toUpperCase() === 'TBD' || name?.toUpperCase() === 'TBA'

  if (isTbd) {
    return (
      <span className={`flex min-w-0 items-center gap-1.5 px-1 py-1 ${side}`}>
        <span className="min-w-0 text-sm font-bold text-[var(--muted)]">
          {L(i18n.language, 'A definir', 'To be named', 'À déterminer', 'Por definir')}
        </span>
      </span>
    )
  }

  const label = (
    <>
      {align === 'right' && won ? <Trophy className="h-4 w-4 shrink-0 text-[var(--gold)]" aria-label={L(i18n.language, 'Venceu', 'Won', 'A gagné', 'Ganó')} /> : null}
      <span className={`min-w-0 break-words text-sm leading-tight text-[var(--ink)] [hyphens:auto] sm:text-base ${won ? 'font-bold' : 'font-semibold'}`}>{name}</span>
      {align === 'left' && won ? <Trophy className="h-4 w-4 shrink-0 text-[var(--gold)]" aria-label={L(i18n.language, 'Venceu', 'Won', 'A gagné', 'Ganó')} /> : null}
    </>
  )

  if (profile && onOpenFighter) {
    return (
      <button
        type="button"
        onClick={() => onOpenFighter(profile.name)}
        aria-label={L(i18n.language, `${name}. Ver perfil`, `${name}. View profile`, `${name}. Voir le profil`, `${name}. Ver perfil`)}
        className={`pointer-events-auto flex min-w-0 items-center gap-1.5 px-1 py-1 ${side}`}
      >
        {label}
      </button>
    )
  }

  return <span className={`flex min-w-0 items-center gap-1.5 px-1 py-1 ${side}`}>{label}</span>
}
