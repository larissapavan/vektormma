import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import type { Career } from '../../shared/game/career'
import type { GameOpponent, MatchmakingResponse } from '../../shared/types/api'

type Row = { label: string; you: number | null; opp: number | null; show: (value: number) => string; edge: boolean }

/** One measure, the player's number against the opponent's, with a bar split between them and the larger one lit. */
function Measure({ row }: { row: Row }) {
  const { you, opp } = row
  const known = you !== null && opp !== null && you + opp > 0
  const share = known ? (you / (you + opp)) * 100 : 50
  const lead = !row.edge || !known || you === opp ? 'none' : you > opp ? 'you' : 'opp'
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className={`data-value text-sm font-bold ${lead === 'you' ? 'text-[var(--text-green)]' : 'text-[var(--text-main)]'}`}>{you === null ? '—' : row.show(you)}</span>
        <span className="text-label font-bold text-[var(--text-muted)]">{row.label}</span>
        <span className={`data-value text-sm font-bold ${lead === 'opp' ? 'text-[var(--text-red)]' : 'text-[var(--text-main)]'}`}>{opp === null ? '—' : row.show(opp)}</span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-sm" aria-hidden="true">
        <span className={`rounded-l-sm transition-all duration-500 ${lead === 'you' ? 'bg-[var(--accent-green)]' : 'bg-[var(--border-default)]'}`} style={{ width: `${share}%` }} />
        <span className={`flex-1 rounded-r-sm ${lead === 'opp' ? 'bg-[var(--ink)]' : 'bg-[var(--border-default)]'}`} />
      </div>
    </li>
  )
}

/**
 * The player against the chosen opponent on the numbers the model reads: striking and takedown accuracy, reach, and age.
 * It shows where the edge is, which is also what the game plan below is for. The chance itself stays hidden.
 */
export function HeadToHead({ career, player, opponent }: { career: Career; player: MatchmakingResponse['player']; opponent: GameOpponent }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const percent = (value: number) => `${Math.round(value * 100)}%`
  const rows: Row[] = [
    { label: L(lang, 'Precisão nos golpes', 'Striking accuracy', 'Précision de frappe', 'Precisión de golpeo'), you: player.sig_str_acc, opp: opponent.sig_str_acc, show: percent, edge: true },
    { label: L(lang, 'Precisão nas quedas', 'Takedown accuracy', 'Précision des amenées', 'Precisión en derribos'), you: player.takedown_acc, opp: opponent.takedown_acc, show: percent, edge: true },
    { label: L(lang, 'Alcance', 'Reach', 'Allonge', 'Alcance'), you: player.reach_cm, opp: opponent.reach_cm, show: (value) => `${Math.round(value)} cm`, edge: true },
    { label: L(lang, 'Idade', 'Age', 'Âge', 'Edad'), you: Math.floor(career.age), opp: opponent.age === null ? null : Math.floor(opponent.age), show: (value) => String(value), edge: false },
  ]
  return (
    <section aria-label={L(lang, 'Frente a frente', 'Head to head', 'Face à face', 'Cara a cara')} className="space-y-3 rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/60 p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-label font-bold">
        <span className="break-words text-[var(--text-green)]">{career.name}</span>
        <span className="text-[var(--text-secondary)]">{L(lang, 'Frente a frente', 'Head to head', 'Face à face', 'Cara a cara')}</span>
        <span className="break-words text-right text-[var(--text-red)]">{opponent.name}</span>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => (
          <Measure key={row.label} row={row} />
        ))}
      </ul>
    </section>
  )
}
