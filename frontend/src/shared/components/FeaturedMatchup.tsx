import { ArrowRight, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { useFeaturedPick } from '../hooks/useFeaturedPick'
import { WinProbabilityBar } from './WinProbabilityBar'

/** Address of the head-to-head page for two fighters (the page reads ?a= and ?b=). */
export function headToHeadPath(fighterA: string, fighterB: string) {
  const params = new URLSearchParams({ a: fighterA, b: fighterB })
  return `/head-to-head?${params.toString()}`
}

/** The next card's headline fight with the model's odds, and a link to compare the two fighters. Renders nothing without one. */
export function FeaturedMatchup() {
  const { i18n } = useTranslation()
  const pick = useFeaturedPick()
  if (!pick) return null

  const probabilityA = pick.fighter_1_probability
  const href = headToHeadPath(pick.fighter_1, pick.fighter_2)

  return (
    <div
      data-testid="featured-matchup"
      className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 p-4 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"
    >
      <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#FF2E54]">
        <Swords className="h-3.5 w-3.5" aria-hidden="true" />
        {L(i18n.language, 'Próxima luta em destaque', 'Next featured fight', 'Prochain combat à l’affiche', 'Próxima pelea destacada')}
      </p>
      <p className="mt-1 truncate text-xs text-[var(--text-secondary)] dark:text-neutral-400">
        {pick.event_name}
        {pick.title_fight ? ` · ${L(i18n.language, 'Luta pelo cinturão', 'Title fight', 'Combat de titre', 'Pelea por el título')}` : ''}
      </p>
      <div className="mt-3">
        <WinProbabilityBar
          nameA={pick.fighter_1}
          nameB={pick.fighter_2}
          probabilityA={probabilityA}
          probabilityB={1 - probabilityA}
          predictedWinner={pick.predicted_winner}
          compact
        />
      </div>
      <Link
        to={href}
        className="group mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] hover:text-[#FF2E54] dark:text-white"
      >
        {L(i18n.language, 'Comparar lutadores', 'Compare fighters', 'Comparer les combattants', 'Comparar peleadores')}
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </div>
  )
}
