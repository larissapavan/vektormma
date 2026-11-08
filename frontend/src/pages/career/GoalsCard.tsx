import { useTranslation } from 'react-i18next'
import { Check, Target } from 'lucide-react'

import { L, pick } from '../../i18n/lang'
import type { Career } from '../../shared/game/career'
import { GOAL_REWARD, goalViews } from '../../shared/game/goals'
import { GOAL_TEXT } from '../../shared/game/rewardsText'

/** The career's goals with how far along each one is. Meeting one pays a bonus in ranking points. A career from an older save has none. */
export function GoalsCard({ career }: { career: Career }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const goals = goalViews(career)
  if (!goals.length) return null
  const met = goals.filter((goal) => goal.done).length
  return (
    <section aria-label={L(lang, 'Metas da carreira', 'Career goals', 'Objectifs de carrière', 'Metas de la carrera')} className="surface-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-red)]">
          <Target className="h-4 w-4" aria-hidden="true" />
          {L(lang, 'Metas da carreira', 'Career goals', 'Objectifs de carrière', 'Metas de la carrera')}
          <span className="data-value text-[var(--text-secondary)]" data-testid="goals-met">{met}/{goals.length}</span>
        </h3>
        <p className="text-[11px] text-[var(--text-muted)]">
          {L(lang, `Cada meta vale +${GOAL_REWARD} pontos de ranking.`, `Each goal pays +${GOAL_REWARD} ranking points.`, `Chaque objectif rapporte +${GOAL_REWARD} points de classement.`, `Cada meta vale +${GOAL_REWARD} puntos de ranking.`)}
        </p>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {goals.map(({ def, value, done }) => (
          <li key={def.id} className="space-y-1.5" data-done={done}>
            <div className="flex items-start justify-between gap-2 text-xs">
              <span className={`font-semibold leading-snug ${done ? 'text-[var(--text-green)]' : 'text-[var(--text-main)]'}`}>{pick(lang, GOAL_TEXT[def.id])}</span>
              {done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-green)]" aria-label={L(lang, 'Cumprida', 'Done', 'Atteint', 'Cumplida')} />
              ) : (
                <span className="data-value shrink-0 text-[var(--text-secondary)]">{value}/{def.target}</span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]" role="img" aria-label={`${value}/${def.target}`}>
              <div className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-[var(--accent-green)]' : 'bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-red)]'}`} style={{ width: `${(value / def.target) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
