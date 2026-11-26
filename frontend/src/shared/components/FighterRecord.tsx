import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import type { FighterProfile } from '../types/api'

/** "24-3" or "24-3-1": the professional record, wins-losses(-draws), in tabular figures. */
export function recordText(fighter: Pick<FighterProfile, 'wins' | 'losses' | 'draws'>) {
  if (fighter.wins == null && fighter.losses == null) return null
  return `${fighter.wins ?? 0}-${fighter.losses ?? 0}${fighter.draws ? `-${fighter.draws}` : ''}`
}

export function FighterRecord({ fighter, className = '' }: { fighter: Pick<FighterProfile, 'wins' | 'losses' | 'draws'>; className?: string }) {
  const { i18n } = useTranslation()
  const text = recordText(fighter)
  if (!text) return null
  const [w, l, d = '0'] = text.split('-')
  return (
    <span
      className={`text-sm tabular-nums text-[var(--muted)] ${className}`}
      aria-label={L(
        i18n.language,
        `Cartel: ${w} vitórias, ${l} derrotas, ${d} empates`,
        `Record: ${w} wins, ${l} losses, ${d} draws`,
        `Palmarès : ${w} victoires, ${l} défaites, ${d} nuls`,
        `Récord: ${w} victorias, ${l} derrotas, ${d} empates`,
      )}
    >
      {text}
    </span>
  )
}
