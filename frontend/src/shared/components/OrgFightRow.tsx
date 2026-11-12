import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { getDivisionName } from '../data/divisions'
import { fightSummary, nonMmaDiscipline, nonMmaHint } from '../data/orgFormat'
import { useOrgFighterLookup } from '../hooks/useOrgFighterLookup'
import type { OrgFightResult, UpcomingPick } from '../types/api'
import { FighterAvatar } from './FighterAvatar'

/** One bout of an organization's card: both corners, the weight class, the stage and, once fought, how it ended. */
export function OrgFightRow({
  org,
  fight,
  scheduled = false,
  pick,
  onOpenFighter,
}: {
  org: string
  fight: OrgFightResult
  /** The bout is still to come: without a result that means "scheduled", not "the site has no result". */
  scheduled?: boolean
  pick?: UpcomingPick
  onOpenFighter?: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const lookup = useOrgFighterLookup(org)
  const summary = fightSummary(fight, i18n.language)
  const stage = fight.stage && !fight.title_fight ? fight.stage : null

  return (
    <article className="metric-tile rounded-2xl px-3 py-3 sm:px-4 sm:py-3.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-1.5 xs:gap-x-2 gap-y-1">
        <FighterAvatar name={fight.fighter_1} imageUrl={lookup(fight.fighter_1)?.image_url ?? null} className="h-10 w-9 sm:h-12 sm:w-10" />
        <Corner name={fight.fighter_1} align="right" won={fight.winner === fight.fighter_1} onOpen={onOpenFighter} known={lookup(fight.fighter_1) !== undefined} />
        <span className="broadcast-label px-0.5 text-[11px] text-[var(--text-muted)]">vs</span>
        <Corner name={fight.fighter_2} align="left" won={fight.winner === fight.fighter_2} onOpen={onOpenFighter} known={lookup(fight.fighter_2) !== undefined} />
        <FighterAvatar name={fight.fighter_2} imageUrl={lookup(fight.fighter_2)?.image_url ?? null} className="h-10 w-9 sm:h-12 sm:w-10" />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
        {fight.title_fight ? <OrgTitleBadge weightClass={fight.weight_class} /> : null}
        {fight.weight_class && !fight.title_fight ? (
          <span className="selector-chip text-[11px] text-[var(--text-main)]">{getDivisionName(fight.weight_class, i18n.language)}</span>
        ) : null}
        {stage ? <span className="selector-chip text-[11px] text-[var(--text-main)]">{stage}</span> : null}
        <OrgSportTag discipline={fight.discipline} />
      </div>

      {scheduled && pick ? (
        <div className="mt-2.5 flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3 text-[var(--text-gold)]" />
            <span className="font-bold uppercase tracking-wider text-[var(--text-gold)]">
              {L(i18n.language, 'Palpite do modelo:', 'Model’s pick:', 'Pronostic :', 'Pronóstico:')}
            </span>
            <span className="font-extrabold text-[var(--text-main)]">
              {pick.predicted_winner}
            </span>
            <span className="rounded bg-[var(--gold-fill)] px-1.5 py-0.5 font-mono text-label font-extrabold text-[#10151d]">
              {Math.round(pick.probability * 100)}%
            </span>
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-center text-[11px] leading-4 text-[var(--text-muted)] sm:text-xs">
        {summary ?? (fight.winner ? L(i18n.language, 'Resultado oficial registrado', 'Result recorded', 'Résultat officiel enregistré', 'Resultado registrado') : scheduled ? (pick ? null : L(i18n.language, 'Luta programada', 'Scheduled', 'Combat programmé', 'Programada')) : L(i18n.language, 'Sem resultado registrado', 'No result recorded', 'Aucun résultat enregistré', 'Sin resultado registrado'))}
      </p>
    </article>
  )
}

/** The sport of a bout that is not MMA ("Muay Thai", "Kickboxing"...). Nothing for an MMA bout and for one whose source does not say. */
export function OrgSportTag({ discipline }: { discipline: string | null | undefined }) {
  const { i18n } = useTranslation()
  const sport = nonMmaDiscipline(discipline)
  if (!sport) return null
  return (
    <span title={nonMmaHint(i18n.language)} className="selector-chip text-[11px] font-bold uppercase tracking-wide text-[var(--text-red)]">
      {sport}
    </span>
  )
}

/** The gold "title fight" tag of a bout, with the division when the card names one. */
export function OrgTitleBadge({ weightClass }: { weightClass: string | null | undefined }) {
  const { i18n } = useTranslation()
  return (
    <span className="border-2 border-[var(--rule)] bg-[var(--gold-fill)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#10151d]">
      {L(
        i18n.language,
        `Disputa de Cinturão ${weightClass ? `(${getDivisionName(weightClass, 'pt')})` : ''}`,
        `${weightClass ? `${weightClass} ` : ''}title fight`,
        `Combat de titre ${weightClass ? `(${getDivisionName(weightClass, 'fr')})` : ''}`,
        `Pelea por el título ${weightClass ? `(${getDivisionName(weightClass, 'es')})` : ''}`,
      )}
    </span>
  )
}

function Corner({
  name,
  align,
  won,
  known,
  onOpen,
}: {
  name: string
  align: 'left' | 'right'
  won: boolean
  known: boolean
  onOpen?: (name: string) => void
}) {
  const content = (
    <span
      className={`block truncate text-sm sm:text-base font-extrabold uppercase tracking-tight transition ${
        won ? 'text-[var(--text-gold)]' : 'text-[var(--text-main)]'
      } ${known ? 'group-hover:text-[var(--text-gold)]' : ''}`}
    >
      {name}
    </span>
  )

  if (!known) {
    return <div className={`min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>{content}</div>
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(name)}
      className={`group min-w-0 cursor-pointer ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {content}
    </button>
  )
}
